import express from 'express';
import { query } from '../db.js';
import { requireRole } from '../auth.js';

export const auditRouter = express.Router();

// Get Append-Only Audit Trail (Admin Only)
auditRouter.get('/', requireRole('admin'), async (req, res) => {
  const { limit = 200 } = req.query;
  const { rows } = await query(
    `SELECT
       id, actor_id AS "actor", actor_role AS "actorRole", action,
       entity_type AS "entity", entity_id AS "entityId", details, created_at AS "timestamp"
     FROM audit_events
     ORDER BY created_at DESC
     LIMIT $1`,
    [Number(limit) || 200]
  );

  res.json({ logs: rows });
});
