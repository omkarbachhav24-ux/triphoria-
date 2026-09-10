import express from 'express';
import { db } from '../db.js';
import { requireRole } from '../auth.js';

export const auditRouter = express.Router();

// Get Append-Only Audit Trail (Admin Only)
auditRouter.get('/', requireRole('admin'), (req, res) => {
  const { limit = 200 } = req.query;
  const rows = db.prepare(`
    SELECT 
      id, actor_id as actor, actor_role as actorRole, action,
      entity_type as entity, entity_id as entityId, details, created_at as timestamp
    FROM audit_events
    ORDER BY created_at DESC
    LIMIT ?
  `).all(Number(limit) || 200);

  res.json({ logs: rows });
});
