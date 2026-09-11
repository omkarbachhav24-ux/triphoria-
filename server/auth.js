import crypto from 'node:crypto';
import { query, queryOne, hashPassword, verifyPassword } from './db.js';

export { hashPassword, verifyPassword };

export async function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const sessionId = `sess-${crypto.randomBytes(8).toString('hex')}`;
  const now = new Date().toISOString();

  await query(
    `INSERT INTO sessions (id, user_id, token, expires_at, created_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [sessionId, userId, token, expiresAt, now]
  );

  // Sessions are only ever deleted explicitly on logout; a session that
  // simply expires (browser closed, cookie cleared, 30-day TTL reached
  // without an explicit sign-out) was never cleaned up, so the table grows
  // unboundedly forever. getUserFromToken() already excludes expired rows
  // from auth (not a security issue), but this is a real storage/DB-hygiene
  // gap. Piggyback a best-effort sweep on login rather than adding cron
  // infrastructure the app doesn't otherwise need — cheap, and login is
  // exactly the moment a new row is being added anyway. Fire-and-forget:
  // never let a cleanup failure block the login it's riding along with.
  query('DELETE FROM sessions WHERE expires_at::timestamptz < now()').catch((err) => {
    console.warn('[AUTH] Expired-session cleanup sweep failed (non-fatal):', err.message);
  });

  return { token, expiresAt };
}

export async function deleteSession(token) {
  if (!token) return;
  await query('DELETE FROM sessions WHERE token = $1', [token]);
}

export async function getUserFromToken(token) {
  if (!token) return null;
  return queryOne(
    `SELECT u.id, u.name, u.email, u.role, u.specialty, u.max_capacity, u.avatar_url, u.organization, u.status
       FROM sessions s
       JOIN users u ON s.user_id = u.id
      WHERE s.token = $1 AND s.expires_at::timestamptz > now()`,
    [token]
  );
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

export async function authMiddleware(req, res, next) {
  let token = req.cookies?.session_token;
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.substring(7);
  }

  try {
    if (token) {
      const user = await getUserFromToken(token);
      req.user = user || null;
      req.sessionToken = token;
    } else {
      req.user = null;
      req.sessionToken = null;
    }
    next();
  } catch (err) {
    next(err);
  }
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
