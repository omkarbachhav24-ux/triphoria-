import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { StorageProvider } from './StorageProvider.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.resolve(__dirname, '../../uploads');

/**
 * LocalStorageProvider — writes to the local filesystem (server/../uploads).
 *
 * NON-DURABLE. This is a local-dev / single-process fallback only:
 *  - On Vercel's serverless runtime, the filesystem is ephemeral and NOT
 *    shared across invocations or regions. A file written by one request
 *    is not guaranteed to exist for the next one, and is wiped on every
 *    cold start / redeploy.
 *  - This provider must never be selected in production (see
 *    server/providers/index.js — selectStorageProvider() refuses to return
 *    this provider when VERCEL is set, and the callers already have a
 *    "no local blob -> redirect to the recorded https:// URL" fallback so
 *    the app keeps working even with zero durable storage configured).
 *  - It exists so local development and this session's QA server (neither
 *    of which run on Vercel) have a provider to exercise the interface
 *    against without needing real object-storage credentials.
 */
export class LocalStorageProvider extends StorageProvider {
  get name() {
    return 'local-fs (NON-DURABLE — dev/QA only)';
  }

  get isConfigured() {
    return true; // filesystem is always "available" locally; durability is the caveat, not availability
  }

  #resolvePath(storageKey) {
    const safeKey = String(storageKey).replace(/^(\.\.[/\\])+/, '').replace(/^[/\\]+/, '');
    return path.join(uploadsDir, safeKey);
  }

  async upload(stream, storageKey) {
    const targetPath = this.#resolvePath(storageKey);
    const targetDir = path.dirname(targetPath);
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

    return new Promise((resolve, reject) => {
      const writeStream = fs.createWriteStream(targetPath);
      const hash = crypto.createHash('sha256');
      let bytesReceived = 0;

      stream.on('data', (chunk) => { bytesReceived += chunk.length; hash.update(chunk); });
      stream.pipe(writeStream);

      writeStream.on('finish', () => {
        resolve({
          storageKey,
          sizeBytes: bytesReceived,
          mimeType: 'application/octet-stream',
          checksum: hash.digest('hex'),
          uploadedAt: new Date().toISOString(),
        });
      });
      writeStream.on('error', reject);
      stream.on('error', reject);
    });
  }

  async delete(storageKey) {
    const targetPath = this.#resolvePath(storageKey);
    await fs.promises.unlink(targetPath).catch((err) => {
      if (err.code !== 'ENOENT') throw err; // idempotent: missing file is not an error
    });
  }

  async getSignedUrl(storageKey) {
    // Local dev has no real signing step; the existing HMAC-token endpoints
    // in server/storage.js handle that. This returns the raw key so callers
    // that want a durable-provider-shaped result can still inspect it.
    return `/api/storage/download?key=${encodeURIComponent(storageKey)}`;
  }

  async exists(storageKey) {
    return fs.existsSync(this.#resolvePath(storageKey));
  }

  async metadata(storageKey) {
    const targetPath = this.#resolvePath(storageKey);
    if (!fs.existsSync(targetPath)) return null;
    const stat = await fs.promises.stat(targetPath);
    return {
      storageKey,
      sizeBytes: stat.size,
      mimeType: 'application/octet-stream',
      checksum: null,
      uploadedAt: stat.mtime.toISOString(),
    };
  }
}

export default LocalStorageProvider;
