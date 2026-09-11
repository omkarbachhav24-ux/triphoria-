// TEMP (redesign QA) — serve built dist/ + the real Express API on one origin.
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import app from './server/app.js';
import { ensureSchema } from './server/db.js';

const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist');
app.use(express.static(dist));
app.get(/^\/(?!api\/|uploads\/).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
const PORT = Number(process.env.RD_PORT) || 3010;
ensureSchema()
  .then(() => app.listen(PORT, () => console.log(`[rd] http://127.0.0.1:${PORT}`)))
  .catch((e) => { console.error('[rd] boot failed', e); process.exit(1); });
