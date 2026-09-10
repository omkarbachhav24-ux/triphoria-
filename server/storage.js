import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure local uploads directory exists
const uploadsDir = path.resolve(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Secret key for HMAC token signing (defaults to environment or stable internal key)
const STORAGE_SECRET = process.env.STORAGE_SECRET || 'triphoria-storage-hmac-secret-vault-2026';

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

  const hmac = crypto.createHmac('sha256', STORAGE_SECRET);
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
  try {
    const raw = Buffer.from(tokenString, 'base64url').toString('utf8');
    const { payload, signature } = JSON.parse(raw);

    const hmac = crypto.createHmac('sha256', STORAGE_SECRET);
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

  const hmac = crypto.createHmac('sha256', STORAGE_SECRET);
  hmac.update(payload);
  const signature = hmac.digest('hex');

  const token = Buffer.from(JSON.stringify({ payload, signature })).toString('base64url');

  return {
    downloadUrl: `/api/storage/download?token=${token}`,
    expiresAt: new Date(expiresAt).toISOString()
  };
}

/**
 * Get filesystem path from storageKey
 */
export function getLocalFilePath(storageKey) {
  const safeKey = storageKey.replace(/^(\.\.[\/\\])+/, '').replace(/^[\\\/]+/, '');
  return path.join(uploadsDir, safeKey);
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
