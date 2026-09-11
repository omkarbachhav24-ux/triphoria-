import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { queryOne } from '../db.js';
import { requireAuth } from '../auth.js';
import {
  generatePresignedUpload, verifyStorageToken,
  generatePresignedDownload, getLocalFilePath
} from '../storage.js';
import { selectStorageProvider } from '../providers/index.js';
import { logAuditEvent } from './auth.routes.js';
import { uploadLimiter } from '../rateLimit.js';

export const uploadRouter = express.Router();

// 1. Authorize Upload (Presigned Upload Token)
uploadRouter.post('/authorize-upload', requireAuth, uploadLimiter, async (req, res) => {
  const { orderId = 'PENDING', filename, sizeBytes, mimeType } = req.body;
  const user = req.user;

  if (!filename) {
    return res.status(400).json({ error: 'Filename is required' });
  }

  // Quota check: 5GB max limit
  const maxBytes = 5 * 1024 * 1024 * 1024; // 5GB
  if (sizeBytes && sizeBytes > maxBytes) {
    return res.status(400).json({ error: 'File exceeds 5.00 GB maximum ingest quota' });
  }

  // A concrete order id must belong to the caller (admin, its client, or its
  // assigned editor). 'PENDING' is the pre-order intake case and is allowed.
  if (orderId && orderId !== 'PENDING') {
    const order = await queryOne('SELECT client_id, assigned_editor_id FROM orders WHERE id = $1', [orderId]);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (user.role !== 'admin' && order.client_id !== user.id && order.assigned_editor_id !== user.id) {
      return res.status(403).json({ error: 'Unauthorized to upload assets for this project.' });
    }
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

  const provider = selectStorageProvider();
  if (!provider) {
    // Genuinely no durable storage is configured for this deployment (e.g.
    // running on Vercel with no SUPABASE_SERVICE_ROLE_KEY / bucket set yet).
    // Refuse honestly rather than accepting bytes we cannot actually keep —
    // see server/providers/SupabaseStorageProvider.js for what unblocks this.
    return res.status(503).json({
      error: 'Durable storage is not configured for this deployment. Raw binary upload is unavailable; record a hosted deliverable URL instead.',
      code: 'STORAGE_NOT_CONFIGURED'
    });
  }

  try {
    const result = await provider.upload(req, storageKey);
    res.json({
      success: true,
      message: `File ingested and verified via ${provider.name}`,
      filename,
      storageKey: result.storageKey,
      bytesWritten: result.sizeBytes,
      checksum: result.checksum
    });
  } catch (err) {
    console.error('[UPLOAD ERROR]', err);
    res.status(err.status || 500).json({ error: err.message || 'Failed to write file stream to object storage', code: err.code });
  }
});

// 3. Authorize Download (Presigned Download Token with Order RBAC)
uploadRouter.get('/authorize-download', requireAuth, async (req, res) => {
  const { orderId, storageKey, filename } = req.query;
  const user = req.user;

  if (!storageKey) {
    return res.status(400).json({ error: 'Storage key is required' });
  }
  if (!orderId) {
    return res.status(400).json({ error: 'orderId is required' });
  }

  // The order must exist AND the caller must be authorized for it. (Previously
  // the check was skipped when the order was not found, and skipped entirely
  // when orderId was omitted — letting any authenticated user mint a signed
  // link for an arbitrary storage key.)
  const order = await queryOne('SELECT client_id, assigned_editor_id FROM orders WHERE id = $1', [orderId]);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  if (user.role !== 'admin' && order.client_id !== user.id && order.assigned_editor_id !== user.id) {
    return res.status(403).json({ error: 'Unauthorized to download assets for this project.' });
  }

  // The storage key must actually be an asset of that order.
  const owns = await queryOne(
    `SELECT 1 FROM output_versions WHERE order_id = $1 AND storage_key = $2
     UNION ALL
     SELECT 1 FROM order_files    WHERE order_id = $1 AND storage_key = $2
     LIMIT 1`,
    [orderId, storageKey]
  );
  if (!owns) {
    return res.status(404).json({ error: 'Asset not found for this order.' });
  }

  const presigned = generatePresignedDownload({
    storageKey,
    orderId: orderId || 'GENERAL',
    filename,
    expiresInSeconds: 900 // 15 mins
  });

  await logAuditEvent({
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
    // No local blob: the deliverable is an external hosted URL that an admin or
    // editor recorded against the order. Only follow https targets, and only
    // because the signing step already verified this key belongs to an order
    // the requester is authorized for.
    if (storageKey.startsWith('https://')) {
      return res.redirect(storageKey);
    }
    return res.status(404).json({ error: 'Requested file asset not found in storage vault' });
  }

  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename || path.basename(filePath))}"`);
  res.setHeader('Content-Type', 'application/octet-stream');

  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
});
