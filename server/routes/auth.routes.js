import express from 'express';
import crypto from 'node:crypto';
import { query, queryOne, hashPassword, verifyPassword } from '../db.js';
import {
  createSession, deleteSession, deleteAllSessionsForUser, setSessionCookie, clearSessionCookie,
  requireAuth, requireRole
} from '../auth.js';
import { loginLimiter, registerLimiter, onboardingLimiter } from '../rateLimit.js';

export const authRouter = express.Router();

// Helper to log audit events into the database
export async function logAuditEvent({ actorId, actorRole, action, entityType, entityId, details, metadata = null }) {
  try {
    const id = `audit-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const now = new Date().toISOString();
    await query(
      `INSERT INTO audit_events (id, actor_id, actor_role, action, entity_type, entity_id, details, metadata_json, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [id, actorId || 'anonymous', actorRole || 'guest', action, entityType, entityId, details || '', metadata ? JSON.stringify(metadata) : null, now]
    );
  } catch (err) {
    console.error('[AUDIT ERROR]', err);
  }
}

// 1. Current Session Identity
authRouter.get('/me', (req, res) => {
  if (!req.user) {
    return res.json({ user: null, authenticated: false });
  }
  res.json({ user: req.user, authenticated: true });
});

// 2. Login (Admin, Editor, Client)
authRouter.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await queryOne(
    `SELECT id, name, email, password_hash, role, specialty, max_capacity, avatar_url, organization, status
       FROM users
      WHERE lower(email) = $1`,
    [normalizedEmail]
  );

  if (!user || !verifyPassword(password, user.password_hash)) {
    await logAuditEvent({
      actorId: normalizedEmail,
      actorRole: 'guest',
      action: 'LOGIN_FAILED',
      entityType: 'Authentication',
      entityId: normalizedEmail,
      details: `Failed authentication attempt for ${normalizedEmail}.`
    });
    return res.status(401).json({ error: 'Invalid credentials. Please verify email and password.' });
  }

  if (user.status === 'deactivated') {
    return res.status(403).json({ error: 'Account has been deactivated by administration.' });
  }

  const { token } = await createSession(user.id);
  setSessionCookie(res, token);

  const sanitizedUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    specialty: user.specialty,
    maxCapacity: user.max_capacity,
    avatar: user.avatar_url,
    organization: user.organization
  };

  await logAuditEvent({
    actorId: user.id,
    actorRole: user.role,
    action: `${user.role.toUpperCase()}_LOGIN_SUCCESS`,
    entityType: 'Authentication',
    entityId: user.email,
    details: `${user.role.toUpperCase()} ${user.name} logged into production workspace.`
  });

  res.json({ success: true, user: sanitizedUser });
});

// 3. Logout
authRouter.post('/logout', async (req, res) => {
  if (req.sessionToken) {
    await deleteSession(req.sessionToken);
  }
  clearSessionCookie(res);

  if (req.user) {
    await logAuditEvent({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'USER_LOGOUT',
      entityType: 'Authentication',
      entityId: req.user.email,
      details: `${req.user.role.toUpperCase()} session ended.`
    });
  }

  res.json({ success: true, message: 'Logged out successfully' });
});

// 4. Client Registration
authRouter.post('/register', registerLimiter, async (req, res) => {
  const { name, email, password, organization } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await queryOne('SELECT id FROM users WHERE lower(email) = $1', [normalizedEmail]);
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const userId = `user-${Date.now()}`;
  const now = new Date().toISOString();
  const passHash = hashPassword(password);
  const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(normalizedEmail)}`;

  await query(
    `INSERT INTO users (id, name, email, password_hash, role, organization, avatar_url, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [userId, name || normalizedEmail.split('@')[0], normalizedEmail, passHash, 'customer', organization || 'Independent Creator', avatar, now]
  );

  const { token } = await createSession(userId);
  setSessionCookie(res, token);

  const newUser = {
    id: userId,
    name: name || normalizedEmail.split('@')[0],
    email: normalizedEmail,
    role: 'customer',
    organization: organization || 'Independent Creator',
    avatar
  };

  await logAuditEvent({
    actorId: userId,
    actorRole: 'customer',
    action: 'CLIENT_REGISTRATION_SUCCESS',
    entityType: 'Authentication',
    entityId: normalizedEmail,
    details: `New client account created for ${normalizedEmail}.`
  });

  res.status(201).json({ success: true, user: newUser });
});

// 5. Editors Roster Listing (Admin Only — exposes staff names, emails, workload)
authRouter.get('/editors', requireRole('admin'), async (req, res) => {
  const { rows: editors } = await query(`
    SELECT
      u.id, u.name, u.email, u.role, u.specialty, u.max_capacity AS "maxCapacity",
      u.avatar_url AS "avatar", u.created_at AS "joinedDate", u.status,
      COUNT(CASE WHEN o.status IN ('In Progress', 'Review') THEN 1 END)::int AS "activeProjects"
    FROM users u
    LEFT JOIN orders o ON o.assigned_editor_id = u.id
    WHERE u.role = 'editor' AND u.status != 'deactivated'
    GROUP BY u.id
  `);
  res.json({ editors });
});

// 6. Onboard New Editor (Admin Only)
authRouter.post('/editors', requireRole('admin'), onboardingLimiter, async (req, res) => {
  const { name, email, password, specialty, maxCapacity, avatar } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  if (password && String(password).length < 10) {
    return res.status(400).json({ error: 'Editor password must be at least 10 characters.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await queryOne('SELECT id FROM users WHERE lower(email) = $1', [normalizedEmail]);
  if (existing) {
    return res.status(409).json({ error: 'A staff member with this email already exists' });
  }

  const editorId = `editor-${Date.now().toString().slice(-4)}`;
  const now = new Date().toISOString();
  // Auto-generated key when the admin doesn't supply one: ~72 bits of entropy.
  const defaultPassword = password || `TP-${crypto.randomBytes(9).toString('base64url')}`;
  const passHash = hashPassword(defaultPassword);
  const avatarUrl = avatar || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200`;

  await query(
    `INSERT INTO users (id, name, email, password_hash, role, specialty, max_capacity, avatar_url, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [editorId, name, normalizedEmail, passHash, 'editor', specialty || 'Commercial & Color Grading', Number(maxCapacity) || 3, avatarUrl, now]
  );

  await logAuditEvent({
    actorId: req.user.id,
    actorRole: 'admin',
    action: 'EDITOR_ONBOARDED',
    entityType: 'Editors',
    entityId: editorId,
    details: `Super Admin ${req.user.name} onboarded staff editor ${name} (${normalizedEmail}).`
  });

  res.status(201).json({
    success: true,
    editor: {
      id: editorId,
      name,
      email: normalizedEmail,
      password: defaultPassword, // returned once for copy-to-clipboard
      role: 'editor',
      specialty: specialty || 'Commercial & Color Grading',
      maxCapacity: Number(maxCapacity) || 3,
      avatar: avatarUrl,
      activeProjects: 0
    }
  });
});

// 7. Deactivate Editor (Admin Only)
authRouter.delete('/editors/:id', requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const activeRow = await queryOne(
    `SELECT COUNT(*)::int AS count FROM orders
      WHERE assigned_editor_id = $1 AND status IN ('In Progress', 'Review')`,
    [id]
  );
  const activeCount = activeRow.count;

  if (activeCount > 0) {
    return res.status(400).json({
      error: `Cannot deactivate editor while they have ${activeCount} active projects. Please reassign them first.`
    });
  }

  await query("UPDATE users SET status = 'deactivated' WHERE id = $1 AND role = 'editor'", [id]);
  // Cut off any session already live for this account immediately, rather
  // than only blocking future logins - see getUserFromToken() for the
  // companion per-request check (defense-in-depth: either alone suffices).
  await deleteAllSessionsForUser(id);

  await logAuditEvent({
    actorId: req.user.id,
    actorRole: 'admin',
    action: 'EDITOR_DEACTIVATED',
    entityType: 'Editors',
    entityId: id,
    details: `Super Admin deactivated editor account ID ${id}.`
  });

  res.json({ success: true, message: 'Editor account deactivated' });
});
