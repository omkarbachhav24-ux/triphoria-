import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ensureSchema } from './db.js';
import { authMiddleware } from './auth.js';
import { authRouter } from './routes/auth.routes.js';
import { ordersRouter } from './routes/orders.routes.js';
import { cmsRouter } from './routes/cms.routes.js';
import { auditRouter } from './routes/audit.routes.js';
import { uploadRouter } from './routes/upload.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();

// Behind Vercel / any proxy: trust X-Forwarded-* so `secure` cookies work.
app.set('trust proxy', 1);

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
// When FRONTEND_URL is set (cross-origin API host) CORS is locked to it;
// otherwise the request origin is reflected (same-origin deploys, local dev).
// B14 red-team hardening: a production deployment that forgets to set
// FRONTEND_URL would silently fall into the reflect-any-origin branch with
// credentials:true — loud startup warning so that misconfiguration is
// never silent, without changing runtime behavior (still no code change to
// same-origin/local-dev, which legitimately relies on reflection).
const allowedOrigin = process.env.FRONTEND_URL;
if (!allowedOrigin && process.env.NODE_ENV === 'production') {
  console.warn(
    '[SECURITY WARNING] FRONTEND_URL is not set in production. ' +
    'CORS is reflecting any request Origin with credentials enabled. ' +
    'Set FRONTEND_URL to your exact deployment origin unless this is ' +
    'intentionally a single-origin deployment (frontend and API on the same host).'
  );
}
app.use(cors({
  origin: allowedOrigin || true,
  credentials: true
}));
app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure Postgres schema exists & is seeded before handling any request.
// `ensureSchema()` is memoised, so this is a no-op after the first call.
app.use(async (req, res, next) => {
  try {
    await ensureSchema();
    next();
  } catch (err) {
    console.error('[SCHEMA INIT ERROR]', err);
    res.status(503).json({
      error: 'Database is not reachable. Check DATABASE_URL configuration.',
      code: 'DB_UNAVAILABLE'
    });
  }
});

// Attach user session to req.user if a session token is present
app.use(authMiddleware);

// Serve static uploaded media (local dev only — ephemeral on serverless)
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// API Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'TRIPHORIA Production Control Server',
    database: 'Supabase Postgres',
    runtime: process.env.VERCEL ? 'vercel-serverless' : 'node-standalone',
    timestamp: new Date().toISOString()
  });
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.use('/api/auth', authRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/cms', cmsRouter);
app.use('/api/audit-logs', auditRouter);
app.use('/api/storage', uploadRouter);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[UNHANDLED SERVER ERROR]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Production Server Error',
    code: err.code || 'SERVER_ERROR'
  });
});

export default app;
