import express from 'express';
import { query, queryOne } from '../db.js';
import { requireRole } from '../auth.js';

export const auditRouter = express.Router();

// Get Append-Only Audit Trail (Admin Only) — paginated.
// Backward compatible: `limit` still works exactly as before (default 200,
// capped at 500 to bound a single response) when `page` is omitted; passing
// `page` (1-based) additionally computes an offset and returns pagination
// metadata so the admin UI can page through the full history instead of
// only ever seeing the most recent slice.
auditRouter.get('/', requireRole('admin'), async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 200, 500);
  const page = Math.max(Number(req.query.page) || 1, 1);
  const offset = (page - 1) * limit;

  const { rows } = await query(
    `SELECT
       id, actor_id AS "actor", actor_role AS "actorRole", action,
       entity_type AS "entity", entity_id AS "entityId", details, created_at AS "timestamp"
     FROM audit_events
     ORDER BY created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  const totalRow = await queryOne('SELECT COUNT(*)::int AS count FROM audit_events');
  const total = totalRow?.count || 0;

  res.json({
    logs: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  });
});
