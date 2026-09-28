import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Local uploads directory — NEVER created at module load. Vercel's runtime
// filesystem is read-only outside /tmp; a top-level mkdirSync here throws
// EROFS on cold start and crashes the entire serverless function (every API
// route, not just upload routes, since app.js transitively imports this
// module) before any request handler even runs. This was a real production
// outage, not a theoretical one — see docs/INCIDENT-2026-09-12-API-DOWN.md.
// The directory is created lazily, only by the actual local-write path
// (saveUploadedStream, below), which itself is only reachable in
// environments where LocalStorageProvider is selected (never on Vercel —
// see server/providers/index.js selectStorageProvider()).
const uploadsDir = path.resolve(__dirname, '../uploads');

// Secret key for HMAC signing of presigned upload/download tokens.
// There is NO fallback: a missing STORAGE_SECRET must fail, never silently
// sign tokens with a shipped, guessable key.
//  - production: refuse to boot.
//  - other envs: boot, but every storage-token operation throws until it is set.
const STORAGE_SECRET = process.env.STORAGE_SECRET;
if (!STORAGE_SECRET) {
  const msg = '[storage] STORAGE_SECRET is required and has no fallback.';
  if (process.env.NODE_ENV === 'production') {
    throw new Error(msg);
  }
  console.warn(`${msg} Storage token endpoints are disabled until it is set.`);
}

function requireSecret() {
  if (!STORAGE_SECRET) {
    const err = new Error('Storage subsystem is not configured (STORAGE_SECRET missing).');
    err.status = 503;
    err.code = 'STORAGE_NOT_CONFIGURED';
    throw err;
  }
  return STORAGE_SECRET;
}

/**
 * Generates an HMAC-SHA256 signed token for presigned uploads
 * TTL: 15 minutes by default
 */
export function generatePresignedUpload({ orderId, filename, sizeBytes, mimeType, expiresInSeconds = 900 }) {
  const expiresAt = Date.now() + expiresInSeconds * 1000;
  const storageKey = `orders/${orderId}/raw/${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  
  const payload = JSON.stringify({
    orderId,
    filename,
    sizeBytes,
    mimeType,
    storageKey,
    expiresAt,
    action: 'upload'
  });

  const hmac = crypto.createHmac('sha256', requireSecret());
  hmac.update(payload);
  const signature = hmac.digest('hex');

  const token = Buffer.from(JSON.stringify({ payload, signature })).toString('base64url');

  return {
    uploadUrl: `/api/storage/upload?token=${token}`,
    storageKey,
    expiresAt: new Date(expiresAt).toISOString()
  };
}

/**
 * Validates presigned token
 */
export function verifyStorageToken(tokenString) {
  const secret = requireSecret(); // throws 503 before any token is trusted
  try {
    const raw = Buffer.from(tokenString, 'base64url').toString('utf8');
    const { payload, signature } = JSON.parse(raw);

    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const expectedSig = hmac.digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSig, 'hex'))) {
      return { valid: false, error: 'Invalid HMAC signature' };
    }

    const data = JSON.parse(payload);
    if (Date.now() > data.expiresAt) {
      return { valid: false, error: 'Presigned token expired' };
    }

    return { valid: true, data };
  } catch (err) {
    return { valid: false, error: 'Malformed token' };
  }
}

/**
 * Generates a short-lived download token
 */
export function generatePresignedDownload({ storageKey, orderId, filename, expiresInSeconds = 900 }) {
  const expiresAt = Date.now() + expiresInSeconds * 1000;

  const payload = JSON.stringify({
    orderId,
    storageKey,
    filename: filename || path.basename(storageKey),
    expiresAt,
    action: 'download'
  });

  const hmac = crypto.createHmac('sha256', requireSecret());
  hmac.update(payload);
  const signature = hmac.digest('hex');

  const token = Buffer.from(JSON.stringify({ payload, signature })).toString('base64url');

  return {
    downloadUrl: `/api/storage/download?token=${token}`,
    expiresAt: new Date(expiresAt).toISOString()
  };
}

/**
 * Get filesystem path from storageKey.
 *
 * SECURITY (H1): resolve against uploadsDir and hard-fail if the result escapes
 * it. A regex that only strips a *leading* `../` is insufficient — embedded
 * traversal (`x/../../../../.env`) survives and path.join happily walks out of
 * the uploads dir. path.resolve + a prefix containment check is the only safe
 * form. Callers must be prepared for a thrown 400.
 */
export function getLocalFilePath(storageKey) {
  if (typeof storageKey !== 'string' || !storageKey) {
    const err = new Error('Invalid storage key'); err.status = 400; throw err;
  }
  const resolved = path.resolve(uploadsDir, storageKey);
  if (resolved !== uploadsDir && !resolved.startsWith(uploadsDir + path.sep)) {
    const err = new Error('Invalid storage key'); err.status = 400; throw err;
  }
  return resolved;
}

/**
 * Validate the *shape* of a storageKey before it is persisted, so traversal or
 * absolute-path keys never enter the database in the first place (defense in
 * depth for H1 on the write side). Accepts app-generated keys and rejects any
 * `..` segment, backslashes, absolute paths, or protocol-ish strings.
 * External deliverable URLs (http/https) are handled separately and are NOT
 * routed through here.
 */
export function isSafeStorageKey(key) {
  return typeof key === 'string'
    && key.length > 0
    && key.length <= 512
    && !key.includes('\\')
    && !key.startsWith('/')
    && !/(^|\/)\.\.(\/|$)/.test(key)
    && !/^[a-z]+:/i.test(key);
}

/**
 * Store file stream with checksum verification
 */
export function saveUploadedStream(readableStream, storageKey) {
  return new Promise((resolve, reject) => {
    const targetPath = getLocalFilePath(storageKey);
    const targetDir = path.dirname(targetPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const writeStream = fs.createWriteStream(targetPath);
    const hash = crypto.createHash('sha256');
    let bytesReceived = 0;

    readableStream.on('data', chunk => {
      bytesReceived += chunk.length;
      hash.update(chunk);
    });

    readableStream.pipe(writeStream);

    writeStream.on('finish', () => {
      const checksum = hash.digest('hex');
      resolve({
        storageKey,
        targetPath,
        bytesWritten: bytesReceived,
        checksum
      });
    });

    writeStream.on('error', err => reject(err));
    readableStream.on('error', err => reject(err));
  });
}
