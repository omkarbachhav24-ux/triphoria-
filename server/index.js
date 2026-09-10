import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import './db.js'; // initialize schema & seed
import { authMiddleware } from './auth.js';
import { authRouter } from './routes/auth.routes.js';
import { ordersRouter } from './routes/orders.routes.js';
import { cmsRouter } from './routes/cms.routes.js';
import { auditRouter } from './routes/audit.routes.js';
import { uploadRouter } from './routes/upload.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Attach user session to req.user if session cookie is present
app.use(authMiddleware);

// Serve static uploaded media
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// API Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'TRIPHORIA Production Control Server',
    database: 'triphoria.db (SQLite WAL)',
    timestamp: new Date().toISOString()
  });
});

// Mount Routes
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

app.listen(PORT, () => {
  console.log(`[TRIPHORIA SERVER] Backend listening on http://localhost:${PORT}`);
});
