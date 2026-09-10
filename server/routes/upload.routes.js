import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { db } from '../db.js';
import { requireAuth } from '../auth.js';
import { 
  generatePresignedUpload, verifyStorageToken, 
  generatePresignedDownload, getLocalFilePath, saveUploadedStream 
} from '../storage.js';
import { logAuditEvent } from './auth.routes.js';

export const uploadRouter = express.Router();

// 1. Authorize Upload (Presigned Upload Token)
uploadRouter.post('/authorize-upload', requireAuth, (req, res) => {
  const { orderId = 'PENDING', filename, sizeBytes, mimeType } = req.body;

  if (!filename) {
    return res.status(400).json({ error: 'Filename is required' });
  }

  // Quota check: 5GB max limit
  const maxBytes = 5 * 1024 * 1024 * 1024; // 5GB
  if (sizeBytes && sizeBytes > maxBytes) {
    return res.status(400).json({ error: 'File exceeds 5.00 GB maximum ingest quota' });
  }

  const presigned = generatePresignedUpload({
    orderId,
    filename,
    sizeBytes: sizeBytes || 0,
    mimeType: mimeType || 'application/octet-stream',
    expiresInSeconds: 900 // 15 mins
  });

  res.json({ success: true, ...presigned });
});

// 2. Binary Upload Ingest Endpoint (Validates HMAC Token)
uploadRouter.put('/upload', async (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.status(401).json({ error: 'Missing presigned upload authorization token' });
  }

  const verification = verifyStorageToken(token);
  if (!verification.valid) {
    return res.status(403).json({ error: verification.error });
  }

  const { storageKey, filename } = verification.data;

  try {
    const result = await saveUploadedStream(req, storageKey);
    res.json({
      success: true,
      message: 'File ingested and verified',
      filename,
      storageKey: result.storageKey,
      bytesWritten: result.bytesWritten,
      checksum: result.checksum
    });
  } catch (err) {
    console.error('[UPLOAD ERROR]', err);
    res.status(500).json({ error: 'Failed to write file stream to object storage' });
  }
});

// 3. Authorize Download (Presigned Download Token with Order RBAC)
uploadRouter.get('/authorize-download', requireAuth, (req, res) => {
  const { orderId, storageKey, filename } = req.query;
  const user = req.user;

  if (!storageKey) {
    return res.status(400).json({ error: 'Storage key is required' });
  }

  // If orderId is given, verify authorization
  if (orderId) {
    const order = db.prepare('SELECT client_id, assigned_editor_id FROM orders WHERE id = ?').get(orderId);
    if (order && user.role !== 'admin' && order.client_id !== user.id && order.assigned_editor_id !== user.id) {
      return res.status(403).json({ error: 'Unauthorized to download assets for this project.' });
    }
  }

  const presigned = generatePresignedDownload({
    storageKey,
    orderId: orderId || 'GENERAL',
    filename,
    expiresInSeconds: 900 // 15 mins
  });

  logAuditEvent({
    actorId: user.id,
    actorRole: user.role,
    action: 'DOWNLOAD_TOKEN_GENERATED',
    entityType: 'Storage',
    entityId: storageKey,
    details: `${user.role.toUpperCase()} ${user.name} generated signed download link for ${filename || storageKey}.`
  });

  res.json({ success: true, ...presigned });
});

// 4. Secure Time-Limited Download Stream (Validates HMAC Token)
uploadRouter.get('/download', (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.status(401).json({ error: 'Missing signed download token' });
  }

  const verification = verifyStorageToken(token);
  if (!verification.valid) {
    return res.status(403).json({ error: verification.error });
  }

  const { storageKey, filename } = verification.data;
  const filePath = getLocalFilePath(storageKey);

  if (!fs.existsSync(filePath)) {
    // If local file does not exist (e.g., initial sample external links), redirect to source URL if HTTP
    if (storageKey.startsWith('http://') || storageKey.startsWith('https://')) {
      return res.redirect(storageKey);
    }
    return res.status(404).json({ error: 'Requested file asset not found in storage vault' });
  }

  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename || path.basename(filePath))}"`);
  res.setHeader('Content-Type', 'application/octet-stream');

  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
});
