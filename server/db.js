import pg from 'pg';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_ADMIN, INITIAL_EDITORS, INITIAL_CUSTOMERS,
  INITIAL_PORTFOLIO, INITIAL_SOCIAL, INITIAL_ORDERS
} from '../src/data/initialData.js';

const { Pool } = pg;

// Return BIGINT (int8, OID 20) as a JS number rather than a string, matching the
// behaviour of the previous node:sqlite layer. All byte-size / count values in
// this schema are well within Number.MAX_SAFE_INTEGER.
pg.types.setTypeParser(20, (val) => (val === null ? null : parseInt(val, 10)));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// Connection pool (Supabase Postgres)
// ---------------------------------------------------------------------------
// DATABASE_URL must point at the Supabase connection pooler (port 6543,
// "Transaction" mode) in serverless environments. A direct connection also
// works for local development.
const connectionString = process.env.DATABASE_URL || '';

if (!connectionString) {
  console.warn(
    '[DB] DATABASE_URL is not set. The API cannot reach Postgres until it is configured.'
  );
}

const isLocalPg = /(^|@|\/\/)(localhost|127\.0\.0\.1)(:|\/)/.test(connectionString);

export const pool = new Pool({
  connectionString,
  // Supabase requires TLS; its pooler presents a cert that node-postgres cannot
  // chain-verify by default, so disable strict verification for non-local hosts.
  ssl: isLocalPg || !connectionString ? false : { rejectUnauthorized: false },
  // One connection per serverless instance; a small pool for a long-lived local process.
  max: process.env.VERCEL ? 1 : 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000
});

pool.on('error', (err) => {
  console.error('[DB] Idle client error', err);
});

/** Run a parameterised query. Returns the full pg result. */
export function query(text, params) {
  return pool.query(text, params);
}

/** Run a parameterised query and return the first row (or null). */
export async function queryOne(text, params) {
  const { rows } = await pool.query(text, params);
  return rows[0] || null;
}

/**
 * Run `fn` inside a single BEGIN/COMMIT transaction on a dedicated client.
 * Rolls back automatically if `fn` throws. `fn` receives the checked-out client
 * and must use `client.query(...)` for every statement in the transaction.
 */
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* ignore rollback failure */ }
    throw err;
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// Password hashing (unchanged — native scrypt, `salt:derivedKeyHex`)
// ---------------------------------------------------------------------------
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

export function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, key] = storedHash.split(':');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  const keyBuffer = Buffer.from(key, 'hex');
  if (keyBuffer.length !== derivedKey.length) return false;
  return crypto.timingSafeEqual(derivedKey, keyBuffer);
}

// ---------------------------------------------------------------------------
// Schema initialisation & first-run seeding
// ---------------------------------------------------------------------------
let schemaPromise = null;

/**
 * Ensure the schema exists and the database is seeded. Memoised so it runs at
 * most once per process (serverless cold start or local boot). Safe to call
 * before every request.
 */
export function ensureSchema() {
  if (!schemaPromise) {
    schemaPromise = initSchema().catch((err) => {
      schemaPromise = null; // allow a later retry
      throw err;
    });
  }
  return schemaPromise;
}

async function initSchema() {
  const ddl = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(ddl); // multi-statement simple query (no params)
  await seedInitialData();
}

async function seedInitialData() {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM users');
  if (rows[0].count > 0) return;

  console.log('[DB] Seeding initial database records...');
  const now = new Date().toISOString();

  // 1. Seed Admin
  const adminEmail = process.env.ADMIN_EMAIL || DEFAULT_ADMIN.email;
  const adminPassword =
    process.env.ADMIN_PASSWORD ||
    (process.env.NODE_ENV !== 'production' ? 'adminpgt' : null);

  if (!adminPassword) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[CRITICAL DB ERROR] ADMIN_PASSWORD environment variable is required in production mode!');
      process.exit(1);
    } else {
      console.warn('[DB WARNING] ADMIN_PASSWORD missing. Admin creation skipped.');
    }
  } else {
    await pool.query(
      `INSERT INTO users (id, name, email, password_hash, role, avatar_url, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        DEFAULT_ADMIN.id,
        DEFAULT_ADMIN.name,
        adminEmail.toLowerCase(),
        hashPassword(adminPassword),
        DEFAULT_ADMIN.role,
        DEFAULT_ADMIN.avatar,
        now
      ]
    );
  }

  // Demo fixtures (editors, customers, orders, portfolio, social) are seeded
  // only outside production. Production starts with just the admin account;
  // real editors/customers are onboarded through the app, so the database
  // never contains placeholder people, fake orders, or sample-video "deliveries".
  // Set SEED_DEMO_DATA=true to opt in on a non-prod-like environment.
  const seedDemo =
    process.env.NODE_ENV !== 'production' || process.env.SEED_DEMO_DATA === 'true';

  if (!seedDemo) {
    await pool.query(
      `INSERT INTO audit_events (id, actor_id, actor_role, action, entity_type, entity_id, details, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        `audit-${Date.now()}`,
        'system', 'system', 'DATABASE_INITIALIZED', 'System', 'triphoria-postgres',
        'Production database initialized (admin only; demo fixtures skipped).',
        now
      ]
    );
    console.log('[DB] Production seed: admin only. Demo fixtures skipped.');
    return;
  }

  // 2. Seed Editors
  for (const ed of INITIAL_EDITORS) {
    const editorPass =
      process.env.EDITOR_SEED_PASSWORD ||
      (process.env.NODE_ENV !== 'production' ? 'editorpgt' : crypto.randomBytes(16).toString('hex'));
    await pool.query(
      `INSERT INTO users (id, name, email, password_hash, role, specialty, max_capacity, avatar_url, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        ed.id,
        ed.name,
        ed.email.toLowerCase(),
        hashPassword(editorPass),
        'editor',
        ed.specialty,
        ed.maxCapacity || 3,
        ed.avatar,
        now
      ]
    );
  }

  // 3. Seed Initial Customers
  for (const cust of INITIAL_CUSTOMERS) {
    const clientPass =
      process.env.CUSTOMER_SEED_PASSWORD ||
      (process.env.NODE_ENV !== 'production' ? 'clientpgt' : crypto.randomBytes(16).toString('hex'));
    await pool.query(
      `INSERT INTO users (id, name, email, password_hash, role, organization, avatar_url, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        cust.id,
        cust.name,
        cust.email.toLowerCase(),
        hashPassword(clientPass),
        'customer',
        cust.organization || 'Independent Creator',
        cust.avatar,
        now
      ]
    );
  }

  // 4. Seed Orders, files, lifecycles & outputs
  for (const ord of INITIAL_ORDERS) {
    const clientId = ord.userId || 'user-101';
    const assignedEd = ord.assignedEditorId || null;

    await pool.query(
      `INSERT INTO orders (
        id, client_id, status, package_name, editing_style, platform,
        target_length, project_name, instructions, google_drive_url, deadline, assigned_editor_id,
        admin_notes, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [
        ord.id,
        clientId,
        ord.status,
        ord.details.packageName || 'Pro Creator',
        ord.details.editingStyle || 'Dynamic Pacing',
        ord.details.platform || 'YouTube (16:9)',
        ord.details.targetLength || '10-12 mins',
        ord.details.projectName || 'Video Project',
        ord.details.instructions || '',
        ord.googleDriveUrl || null,
        ord.deadline,
        assignedEd,
        ord.adminNotes || '',
        ord.createdAt,
        ord.createdAt
      ]
    );

    // Raw files
    if (ord.rawFootage && ord.rawFootage.length > 0) {
      for (let i = 0; i < ord.rawFootage.length; i++) {
        const file = ord.rawFootage[i];
        await pool.query(
          `INSERT INTO order_files (id, order_id, filename, size_bytes, mime_type, storage_key, upload_status, checksum, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [
            `file-${ord.id}-${i}`,
            ord.id,
            file.filename,
            file.sizeBytes || 500000000,
            file.mimeType || 'video/mp4',
            file.storageKey || `raw/${ord.id}/${file.filename}`,
            'completed',
            'd41d8cd98f00b204e9800998ecf8427e',
            ord.createdAt
          ]
        );
      }
    }

    // Storage lifecycle
    if (ord.storageLifecycle) {
      await pool.query(
        `INSERT INTO storage_lifecycle (order_id, status, bytes_total, retention_expires_at, soft_deleted_at, purged_at)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          ord.id,
          ord.storageLifecycle.status || 'Active',
          ord.storageLifecycle.bytesTotal || 0,
          ord.storageLifecycle.retentionExpiresAt || null,
          ord.storageLifecycle.softDeletedAt || null,
          ord.storageLifecycle.purgedAt || null
        ]
      );
    } else {
      await pool.query(
        `INSERT INTO storage_lifecycle (order_id, status, bytes_total, retention_expires_at, soft_deleted_at, purged_at)
         VALUES ($1, 'Active', 0, NULL, NULL, NULL)`,
        [ord.id]
      );
    }

    // Outputs
    if (ord.outputVersions && ord.outputVersions.length > 0) {
      for (let idx = 0; idx < ord.outputVersions.length; idx++) {
        const out = ord.outputVersions[idx];
        const outputId = out.versionId || out.id || `ver-${ord.id}-${idx + 1}`;
        const storageKey = out.downloadUrl || out.storageKey || out.url || `outputs/${ord.id}/master.mp4`;
        await pool.query(
          `INSERT INTO output_versions (
            id, order_id, version_tag, editor_id, storage_key, format,
            resolution, runtime, size_bytes, notes, is_authoritative, uploaded_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [
            outputId,
            ord.id,
            out.version || 'v1.0',
            out.uploadedBy?.includes('Marcus') ? 'editor-01' : 'editor-02',
            storageKey,
            out.format || 'ProRes 422 HQ',
            out.resolution || '4K UHD (3840x2160)',
            out.runtime || '11:45',
            out.sizeBytes || 1200000000,
            out.notes || '',
            out.isAuthoritative ? 1 : 0,
            out.uploadedAt || ord.createdAt
          ]
        );
      }
    }
  }

  // 5. Seed CMS Portfolio
  for (const p of INITIAL_PORTFOLIO) {
    await pool.query(
      `INSERT INTO cms_projects (
        id, title, client, format, runtime, category, description,
        thumbnail_url, video_url, social_provider, social_url, playback_url, aspect_ratio,
        camera, color_grade, audio_mix, pacing,
        is_featured, featured_slot, is_published, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)`,
      [
        p.id,
        p.title,
        p.client,
        p.format,
        p.runtime,
        p.category,
        p.description,
        p.thumbnail,
        p.playbackUrl || p.videoUrl,
        p.socialProvider || 'none',
        p.socialUrl || null,
        p.playbackUrl || p.videoUrl,
        p.aspectRatio || '16:9',
        p.technicalBreakdown?.camera || 'RED KOMODO-X 6K',
        p.technicalBreakdown?.colorGrade || 'Rec.709 Master Grade',
        p.technicalBreakdown?.audioMix || 'Stereo Broadcast Mix',
        p.technicalBreakdown?.pacing || 'Editorial Cut',
        p.isFeatured ? 1 : 0,
        p.featuredSlot || null,
        p.isPublished ? 1 : 0,
        now
      ]
    );
  }

  // 6. Seed CMS Social
  for (const s of INITIAL_SOCIAL) {
    await pool.query(
      `INSERT INTO cms_social (
        id, platform, url, title, caption, thumbnail_url, likes, is_published, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        s.id,
        s.platform,
        s.url,
        s.title,
        s.caption,
        s.thumbnail,
        s.likes,
        s.isPublished ? 1 : 0,
        now
      ]
    );
  }

  // 7. Initial Audit Event
  await pool.query(
    `INSERT INTO audit_events (
      id, actor_id, actor_role, action, entity_type, entity_id, details, created_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      `audit-${Date.now()}`,
      'system',
      'system',
      'DATABASE_INITIALIZED',
      'System',
      'triphoria-postgres',
      'Relational database initialized on Supabase Postgres with seed records.',
      now
    ]
  );

  console.log('[DB] Seeding completed successfully.');
}
