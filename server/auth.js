import crypto from 'node:crypto';
import { db, hashPassword, verifyPassword } from './db.js';

export { hashPassword, verifyPassword };

export function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const sessionId = `sess-${crypto.randomBytes(8).toString('hex')}`;
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO sessions (id, user_id, token, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(sessionId, userId, token, expiresAt, now);

  return { token, expiresAt };
}

export function deleteSession(token) {
  if (!token) return;
  const stmt = db.prepare('DELETE FROM sessions WHERE token = ?');
  stmt.run(token);
}

export function getUserFromToken(token) {
  if (!token) return null;
  const stmt = db.prepare(`
    SELECT u.id, u.name, u.email, u.role, u.specialty, u.max_capacity, u.avatar_url, u.organization, u.status
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ? AND s.expires_at > datetime('now')
  `);
  return stmt.get(token) || null;
}

export function setSessionCookie(res, token) {
  res.cookie('session_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    secure: process.env.NODE_ENV === 'production'
  });
}

export function clearSessionCookie(res) {
  res.clearCookie('session_token', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/'
  });
}

export function authMiddleware(req, res, next) {
  let token = req.cookies?.session_token;
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.substring(7);
  }

  if (token) {
    const user = getUserFromToken(token);
    req.user = user || null;
    req.sessionToken = token;
  } else {
    req.user = null;
    req.sessionToken = null;
  }

  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      code: 'UNAUTHORIZED' 
    });
  }
  next();
}

export function requireRole(allowedRoles) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'UNAUTHORIZED' 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Forbidden: Requires one of roles: [${roles.join(', ')}]`,
        code: 'FORBIDDEN' 
      });
    }

    next();
  };
}
