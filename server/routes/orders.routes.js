import express from 'express';
import crypto from 'node:crypto';
import { db } from '../db.js';
import { requireAuth, requireRole } from '../auth.js';
import { logAuditEvent } from './auth.routes.js';

export const ordersRouter = express.Router();

// Helper to hydrate order with files, output versions, editor details, and lifecycle
function formatOrderResponse(row) {
  if (!row) return null;

  const files = db.prepare(`
    SELECT id, filename, size_bytes as sizeBytes, mime_type as mimeType, storage_key as storageKey, upload_status as status
    FROM order_files WHERE order_id = ?
  `).all(row.id);

  const outputs = db.prepare(`
    SELECT 
      ov.id, ov.version_tag as version, ov.storage_key as url, ov.format, ov.resolution,
      ov.runtime, ov.size_bytes as sizeBytes, ov.notes, ov.is_authoritative as isAuthoritative,
      ov.uploaded_at as uploadedAt, u.name as uploadedBy
    FROM output_versions ov
    LEFT JOIN users u ON ov.editor_id = u.id
    WHERE ov.order_id = ?
    ORDER BY ov.uploaded_at ASC
  `).all(row.id);

  const lifecycle = db.prepare(`
    SELECT status, bytes_total as bytesTotal, retention_expires_at as retentionExpiresAt, soft_deleted_at as softDeletedAt, purged_at as purgedAt
    FROM storage_lifecycle WHERE order_id = ?
  `).get(row.id) || { status: 'Active', bytesTotal: 0 };

  return {
    id: row.id,
    userId: row.client_id,
    customerName: row.client_name,
    customerEmail: row.client_email,
    packageName: row.package_name,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deadline: row.deadline,
    assignedEditorId: row.assigned_editor_id,
    assignedEditorName: row.editor_name,
    assignedEditorEmail: row.editor_email,
    adminNotes: row.admin_notes,
    rejectionReason: row.rejection_reason,
    googleDriveUrl: row.google_drive_url,
    details: {
      projectName: row.project_name,
      platform: row.platform,
      editingStyle: row.editing_style,
      targetLength: row.target_length,
      projectDescription: row.instructions,
      editingInstructions: row.instructions
    },
    rawFootage: files.map(f => ({
      ...f,
      sizeDisplay: `${((f.sizeBytes || 0) / (1024 * 1024 * 1024)).toFixed(2)} GB`
    })),
    outputVersions: outputs.map(o => ({
      ...o,
      isAuthoritative: Boolean(o.isAuthoritative)
    })),
    storageLifecycle: {
      ...lifecycle,
      retentionDays: 14,
      softDeleted: lifecycle.status === 'Soft-Deleted'
    }
  };
}

// 1. Scoped Orders Listing
ordersRouter.get('/', requireAuth, (req, res) => {
  const user = req.user;
  let query = `
    SELECT 
      o.*, 
      c.name as client_name, c.email as client_email,
      e.name as editor_name, e.email as editor_email
    FROM orders o
    JOIN users c ON o.client_id = c.id
    LEFT JOIN users e ON o.assigned_editor_id = e.id
  `;
  const params = [];

  if (user.role === 'admin') {
    query += ' ORDER BY o.created_at DESC';
  } else if (user.role === 'editor') {
    query += ' WHERE o.assigned_editor_id = ? ORDER BY o.created_at DESC';
    params.push(user.id);
  } else {
    query += ' WHERE o.client_id = ? ORDER BY o.created_at DESC';
    params.push(user.id);
  }

  const rows = db.prepare(query).all(...params);
  const orders = rows.map(formatOrderResponse);
  res.json({ orders });
});

// 2. Single Order Inspection
ordersRouter.get('/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const user = req.user;

  const row = db.prepare(`
    SELECT 
      o.*, 
      c.name as client_name, c.email as client_email,
      e.name as editor_name, e.email as editor_email
    FROM orders o
    JOIN users c ON o.client_id = c.id
    LEFT JOIN users e ON o.assigned_editor_id = e.id
    WHERE o.id = ?
  `).get(id);

  if (!row) {
    return res.status(404).json({ error: `Order ${id} not found` });
  }

  // Security authorization boundary
  if (user.role !== 'admin' && row.client_id !== user.id && row.assigned_editor_id !== user.id) {
    return res.status(403).json({ error: 'Access denied: You do not have authorization to view this order.' });
  }

  res.json({ order: formatOrderResponse(row) });
});

// 3. Create Order with Server-Side Idempotency
ordersRouter.post('/', requireAuth, (req, res) => {
  const user = req.user;
  const idempotencyKey = req.headers['idempotency-key'] || req.body.idempotencyToken;

  // Idempotency cache check
  if (idempotencyKey) {
    const existing = db.prepare('SELECT response_status, response_body FROM idempotency_records WHERE key = ?').get(idempotencyKey);
    if (existing) {
      return res.status(existing.response_status).json(JSON.parse(existing.response_body));
    }
  }

  const {
    packageName = 'Pro Creator',
    editingStyle = 'Dynamic Pacing with Minimalist Graphics',
    platform = 'YouTube (16:9)',
    targetLength = '10-12 mins',
    projectName,
    instructions = '',
    googleDriveUrl = '',
    deadline,
    rawFootage = []
  } = req.body;

  if (!projectName) {
    return res.status(400).json({ error: 'Project name is required' });
  }

  if (!googleDriveUrl || !googleDriveUrl.trim()) {
    return res.status(400).json({ error: 'Google Drive source footage link is strictly required' });
  }

  // Validate Google Drive URL strictly
  let parsedDriveUrl;
  try {
    parsedDriveUrl = new URL(googleDriveUrl.trim());
  } catch {
    return res.status(400).json({ error: 'Invalid URL format. Please provide a valid https://drive.google.com URL.' });
  }

  if (parsedDriveUrl.protocol !== 'http:' && parsedDriveUrl.protocol !== 'https:') {
    return res.status(400).json({ error: 'Invalid URL protocol. Must use http:// or https://.' });
  }

  const host = parsedDriveUrl.hostname.toLowerCase();
  if (host !== 'drive.google.com' && !host.endsWith('.drive.google.com')) {
    return res.status(400).json({ error: 'Invalid Google Drive link. Domain must be drive.google.com.' });
  }

  const orderId = `ORD-${Date.now().toString().slice(-4)}`;
  const now = new Date().toISOString();
  const targetDeadline = deadline || new Date(Date.now() + 4 * 24 * 3600 * 1000).toISOString().split('T')[0];

  try {
    // Begin atomic transaction
    db.exec('BEGIN TRANSACTION;');

    db.prepare(`
      INSERT INTO orders (
        id, client_id, status, package_name, editing_style, platform,
        target_length, project_name, instructions, google_drive_url, deadline, created_at, updated_at, idempotency_key
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      orderId, user.id, 'Pending Approval', packageName, editingStyle, platform,
      targetLength, projectName, instructions, googleDriveUrl || null, targetDeadline, now, now, idempotencyKey || null
    );

    let totalBytes = 0;
    const insertFile = db.prepare(`
      INSERT INTO order_files (id, order_id, filename, size_bytes, mime_type, storage_key, upload_status, checksum, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (let i = 0; i < rawFootage.length; i++) {
      const f = rawFootage[i];
      const fileBytes = Number(f.sizeBytes) || 500000000;
      totalBytes += fileBytes;
      insertFile.run(
        `file-${orderId}-${i + 1}`,
        orderId,
        f.filename || `clip_${i + 1}.mp4`,
        fileBytes,
        f.mimeType || 'video/mp4',
        f.storageKey || `orders/${orderId}/raw/${f.filename || `clip_${i + 1}.mp4`}`,
        'completed',
        f.checksum || crypto.createHash('md5').update(f.filename || '').digest('hex'),
        now
      );
    }

    // Initial storage lifecycle record
    db.prepare(`
      INSERT INTO storage_lifecycle (order_id, status, bytes_total)
      VALUES (?, 'Active', ?)
    `).run(orderId, totalBytes);

    db.exec('COMMIT;');

    logAuditEvent({
      actorId: user.id,
      actorRole: user.role,
      action: 'ORDER_CREATED',
      entityType: 'Orders',
      entityId: orderId,
      details: `Client ${user.name} created order ${orderId} (${projectName}) in 'Pending Approval' status.`
    });

    const createdOrder = formatOrderResponse(
      db.prepare(`
        SELECT o.*, c.name as client_name, c.email as client_email, null as editor_name, null as editor_email
        FROM orders o JOIN users c ON o.client_id = c.id WHERE o.id = ?
      `).get(orderId)
    );

    const responsePayload = { success: true, order: createdOrder };

    // Record idempotency token
    if (idempotencyKey) {
      db.prepare(`
        INSERT INTO idempotency_records (key, response_status, response_body, created_at)
        VALUES (?, 201, ?, ?)
      `).run(idempotencyKey, JSON.stringify(responsePayload), now);
    }

    res.status(201).json(responsePayload);
  } catch (err) {
    db.exec('ROLLBACK;');
    console.error('[ORDER CREATE ERROR]', err);
    res.status(500).json({ error: 'Failed to create order due to database constraint' });
  }
});

// 4. State Transition: Pending Approval -> In Progress (Admin Only)
ordersRouter.post('/:id/approve', requireRole('admin'), (req, res) => {
  const { id } = req.params;
  const { editorId, adminNotes } = req.body;

  if (!editorId) {
    return res.status(400).json({ error: 'Assigned editor ID is required' });
  }

  const editor = db.prepare("SELECT id, name, email FROM users WHERE id = ? AND role = 'editor' AND status != 'deactivated'").get(editorId);
  if (!editor) {
    return res.status(400).json({ error: 'Selected editor not found or deactivated' });
  }

  try {
    db.exec('BEGIN TRANSACTION;');

    const order = db.prepare('SELECT status FROM orders WHERE id = ?').get(id);
    if (!order) {
      db.exec('ROLLBACK;');
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.status !== 'Pending Approval') {
      db.exec('ROLLBACK;');
      return res.status(409).json({ 
        error: `Invalid transition: Order is in status '${order.status}', cannot approve.`,
        code: 'CONFLICTING_STATE' 
      });
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE orders 
      SET status = 'In Progress', assigned_editor_id = ?, admin_notes = ?, updated_at = ?
      WHERE id = ?
    `).run(editor.id, adminNotes || '', now, id);

    db.exec('COMMIT;');

    logAuditEvent({
      actorId: req.user.id,
      actorRole: 'admin',
      action: 'ORDER_APPROVED',
      entityType: 'Orders',
      entityId: id,
      details: `Super Admin ${req.user.name} approved order ${id} and assigned to ${editor.name}. Advanced to 'In Progress'.`
    });

    res.json({ success: true, message: `Order approved and assigned to ${editor.name}` });
  } catch (err) {
    db.exec('ROLLBACK;');
    res.status(500).json({ error: 'Failed to approve order' });
  }
});

// 5. State Transition: Pending Approval -> Rejected (Admin Only)
ordersRouter.post('/:id/reject', requireRole('admin'), (req, res) => {
  const { id } = req.params;
  const { rejectionReason } = req.body;

  if (!rejectionReason || !rejectionReason.trim()) {
    return res.status(400).json({ error: 'A valid rejection reason is strictly required' });
  }

  try {
    db.exec('BEGIN TRANSACTION;');

    const order = db.prepare('SELECT status FROM orders WHERE id = ?').get(id);
    if (!order) {
      db.exec('ROLLBACK;');
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.status !== 'Pending Approval') {
      db.exec('ROLLBACK;');
      return res.status(409).json({ 
        error: `Invalid transition: Order is in status '${order.status}', cannot reject.`,
        code: 'CONFLICTING_STATE' 
      });
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE orders 
      SET status = 'Rejected', rejection_reason = ?, updated_at = ?
      WHERE id = ?
    `).run(rejectionReason.trim(), now, id);

    db.exec('COMMIT;');

    logAuditEvent({
      actorId: req.user.id,
      actorRole: 'admin',
      action: 'ORDER_REJECTED',
      entityType: 'Orders',
      entityId: id,
      details: `Order ${id} was rejected by Super Admin. Reason: "${rejectionReason.trim()}"`
    });

    res.json({ success: true, message: 'Order has been rejected.' });
  } catch (err) {
    db.exec('ROLLBACK;');
    res.status(500).json({ error: 'Failed to reject order' });
  }
});

// 6. Reassign Editor (Admin Only)
ordersRouter.post('/:id/reassign', requireRole('admin'), (req, res) => {
  const { id } = req.params;
  const { newEditorId } = req.body;

  const editor = db.prepare("SELECT id, name, email FROM users WHERE id = ? AND role = 'editor' AND status != 'deactivated'").get(newEditorId);
  if (!editor) {
    return res.status(400).json({ error: 'Target editor not found or deactivated' });
  }

  const now = new Date().toISOString();
  db.prepare('UPDATE orders SET assigned_editor_id = ?, updated_at = ? WHERE id = ?').run(editor.id, now, id);

  logAuditEvent({
    actorId: req.user.id,
    actorRole: 'admin',
    action: 'EDITOR_REASSIGNED',
    entityType: 'Orders',
    entityId: id,
    details: `Order ${id} workload reassigned to editor ${editor.name} (${editor.email}).`
  });

  res.json({ success: true, message: `Order reassigned to ${editor.name}` });
});

// 7. State Transition: In Progress -> Review (Editor Uploads Cut)
ordersRouter.post('/:id/outputs', requireAuth, (req, res) => {
  const { id } = req.params;
  const user = req.user;

  const order = db.prepare('SELECT status, assigned_editor_id FROM orders WHERE id = ?').get(id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  // Authorization check: Must be assigned editor or admin
  if (user.role !== 'admin' && order.assigned_editor_id !== user.id) {
    return res.status(403).json({ error: 'Unauthorized: Only the assigned editor can upload deliverables for this order.' });
  }

  if (order.status !== 'In Progress' && order.status !== 'Review') {
    return res.status(409).json({ error: `Cannot upload deliverable when order is in '${order.status}' status.` });
  }

  const {
    version = 'v1.0',
    format = 'ProRes 422 HQ',
    resolution = '4K UHD (3840x2160)',
    runtime = '11:45',
    sizeBytes = 1200000000,
    notes = 'Versioned master output cut ready for review.'
  } = req.body;

  const storageKey = req.body.storageKey || req.body.downloadUrl || req.body.url;

  if (!storageKey) {
    return res.status(400).json({ error: 'Storage key / download URL is required' });
  }

  const outputId = `ver-${id}-${Date.now().toString().slice(-4)}`;
  const now = new Date().toISOString();

  try {
    db.exec('BEGIN TRANSACTION;');

    db.prepare(`
      INSERT INTO output_versions (
        id, order_id, version_tag, editor_id, storage_key, format,
        resolution, runtime, size_bytes, notes, is_authoritative, uploaded_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(outputId, id, version, user.id, storageKey, format, resolution, runtime, Number(sizeBytes), notes, 1, now);

    db.prepare("UPDATE orders SET status = 'Review', updated_at = ? WHERE id = ?").run(now, id);

    db.exec('COMMIT;');

    logAuditEvent({
      actorId: user.id,
      actorRole: user.role,
      action: 'OUTPUT_UPLOADED',
      entityType: 'Orders',
      entityId: id,
      details: `Editor ${user.name} uploaded master cut ${version} for order ${id}. Status advanced to 'Review'.`
    });

    res.status(201).json({ success: true, message: `Output ${version} uploaded successfully`, outputId });
  } catch (err) {
    db.exec('ROLLBACK;');
    res.status(500).json({ error: 'Failed to record output version' });
  }
});

// 8. State Transition: Review -> Completed (Client or Admin Final Delivery Approval)
ordersRouter.post('/:id/complete', requireAuth, (req, res) => {
  const { id } = req.params;

  try {
    db.exec('BEGIN TRANSACTION;');

    const order = db.prepare('SELECT status, client_id FROM orders WHERE id = ?').get(id);
    if (!order) {
      db.exec('ROLLBACK;');
      return res.status(404).json({ error: 'Order not found' });
    }

    if (req.user.role !== 'admin' && order.client_id !== req.user.id) {
      db.exec('ROLLBACK;');
      return res.status(403).json({ error: 'Unauthorized: Only the project owner or studio admin can approve final delivery.' });
    }

    if (order.status !== 'Review') {
      db.exec('ROLLBACK;');
      return res.status(409).json({ 
        error: `Cannot complete order: Current status is '${order.status}'. Must be in 'Review'.` 
      });
    }

    const now = new Date().toISOString();
    const retentionExpiry = new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString();

    db.prepare("UPDATE orders SET status = 'Completed', updated_at = ? WHERE id = ?").run(now, id);

    db.prepare(`
      INSERT INTO storage_lifecycle (order_id, status, retention_expires_at)
      VALUES (?, 'Retention Period', ?)
      ON CONFLICT(order_id) DO UPDATE SET
        status = 'Retention Period',
        retention_expires_at = excluded.retention_expires_at
    `).run(id, retentionExpiry);

    db.exec('COMMIT;');

    const approverRole = req.user.role === 'admin' ? 'Super Admin' : 'Customer';
    logAuditEvent({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'FINAL_DELIVERY_APPROVED',
      entityType: 'Orders',
      entityId: id,
      details: `${approverRole} ${req.user.name} approved final delivery for order ${id}. 14-day storage retention activated until ${retentionExpiry}.`
    });

    res.json({ success: true, message: 'Final delivery approved. Order marked Completed with 14-day retention buffer.' });
  } catch (err) {
    db.exec('ROLLBACK;');
    res.status(500).json({ error: 'Failed to approve final delivery' });
  }
});

// 8b. State Transition: Review -> In Progress (Customer or Admin Requests Revision)
ordersRouter.post('/:id/revision', requireAuth, (req, res) => {
  const { id } = req.params;
  const { revisionNotes } = req.body;

  if (!revisionNotes || !revisionNotes.trim()) {
    return res.status(400).json({ error: 'Revision feedback notes are strictly required' });
  }

  try {
    db.exec('BEGIN TRANSACTION;');

    const order = db.prepare('SELECT status, client_id, instructions FROM orders WHERE id = ?').get(id);
    if (!order) {
      db.exec('ROLLBACK;');
      return res.status(404).json({ error: 'Order not found' });
    }

    if (req.user.role !== 'admin' && order.client_id !== req.user.id) {
      db.exec('ROLLBACK;');
      return res.status(403).json({ error: 'Unauthorized: Only the project owner or studio admin can request revisions.' });
    }

    if (order.status !== 'Review') {
      db.exec('ROLLBACK;');
      return res.status(409).json({ 
        error: `Cannot request revision: Current status is '${order.status}'. Must be in 'Review'.` 
      });
    }

    const now = new Date().toISOString();
    const updatedDirectives = `${order.instructions || ''}\n\n[REVISION DIRECTIVE - ${now.substring(0, 10)} by ${req.user.name}]:\n${revisionNotes.trim()}`;

    db.prepare("UPDATE orders SET status = 'In Progress', instructions = ?, updated_at = ? WHERE id = ?").run(updatedDirectives, now, id);

    db.exec('COMMIT;');

    const requesterRole = req.user.role === 'admin' ? 'Super Admin' : 'Customer';
    logAuditEvent({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'OUTPUT_REVISION_REQUESTED',
      entityType: 'Orders',
      entityId: id,
      details: `${requesterRole} ${req.user.name} requested revisions on order ${id}: "${revisionNotes.trim().substring(0, 80)}..."`
    });

    res.json({ success: true, message: 'Revision feedback recorded. Order routed back to assigned editor.' });
  } catch (err) {
    db.exec('ROLLBACK;');
    res.status(500).json({ error: 'Failed to request revision' });
  }
});

// 9. Storage Governance: Soft-Delete (Admin Only)
ordersRouter.post('/:id/storage/soft-delete', requireRole('admin'), (req, res) => {
  const { id } = req.params;
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE storage_lifecycle
    SET status = 'Soft-Deleted', soft_deleted_at = ?
    WHERE order_id = ?
  `).run(now, id);

  logAuditEvent({
    actorId: req.user.id,
    actorRole: 'admin',
    action: 'STORAGE_SOFT_DELETED',
    entityType: 'Storage',
    entityId: id,
    details: `Super Admin ${req.user.name} soft-deleted raw assets for order ${id}.`
  });

  res.json({ success: true, message: 'Order media flagged as soft-deleted' });
});

// 10. Storage Governance: Restore (Admin Only)
ordersRouter.post('/:id/storage/restore', requireRole('admin'), (req, res) => {
  const { id } = req.params;
  const retentionExpiry = new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString();

  db.prepare(`
    UPDATE storage_lifecycle
    SET status = 'Retention Period', retention_expires_at = ?, soft_deleted_at = NULL
    WHERE order_id = ?
  `).run(retentionExpiry, id);

  logAuditEvent({
    actorId: req.user.id,
    actorRole: 'admin',
    action: 'STORAGE_RESTORED',
    entityType: 'Storage',
    entityId: id,
    details: `Super Admin ${req.user.name} restored raw assets for order ${id}. 14-day retention reset.`
  });

  res.json({ success: true, message: 'Order media restored to active retention' });
});

// 11. Storage Governance: Permanent Purge (Admin Only)
ordersRouter.post('/:id/storage/purge', requireRole('admin'), (req, res) => {
  const { id } = req.params;
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE storage_lifecycle
    SET status = 'Purged', bytes_total = 0, purged_at = ?
    WHERE order_id = ?
  `).run(now, id);

  logAuditEvent({
    actorId: req.user.id,
    actorRole: 'admin',
    action: 'STORAGE_PURGED',
    entityType: 'Storage',
    entityId: id,
    details: `Super Admin ${req.user.name} permanently purged binary media for order ${id}. Metadata & audit logs preserved.`
  });

  res.json({ success: true, message: 'Order media permanently purged' });
});
