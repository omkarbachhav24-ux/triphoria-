import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { 
  DEFAULT_ADMIN, INITIAL_EDITORS, INITIAL_CUSTOMERS, 
  INITIAL_PORTFOLIO, INITIAL_SOCIAL, INITIAL_ORDERS 
} from '../src/data/initialData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure data directory exists
const dataDir = path.resolve(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'triphoria.db');
export const db = new DatabaseSync(dbPath);

// Enable WAL mode & foreign keys for ACID compliance
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  PRAGMA busy_timeout = 5000;
`);

// Password hashing utility using native scrypt
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
  return crypto.timingSafeEqual(derivedKey, keyBuffer);
}

// Initialize Relational Schema
export function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'editor', 'customer', 'client')),
      specialty TEXT,
      max_capacity INTEGER DEFAULT 3,
      avatar_url TEXT,
      organization TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES users(id),
      status TEXT NOT NULL CHECK(status IN ('Pending Approval', 'In Progress', 'Review', 'Completed', 'Rejected')),
      package_name TEXT NOT NULL,
      editing_style TEXT NOT NULL,
      platform TEXT NOT NULL,
      target_length TEXT NOT NULL,
      project_name TEXT NOT NULL,
      instructions TEXT,
      google_drive_url TEXT,
      deadline TEXT NOT NULL,
      assigned_editor_id TEXT REFERENCES users(id),
      admin_notes TEXT,
      rejection_reason TEXT,
      idempotency_key TEXT UNIQUE,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS order_files (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      storage_key TEXT NOT NULL,
      upload_status TEXT NOT NULL CHECK(upload_status IN ('pending', 'uploading', 'completed', 'failed')),
      checksum TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS output_versions (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      version_tag TEXT NOT NULL,
      editor_id TEXT NOT NULL REFERENCES users(id),
      storage_key TEXT NOT NULL,
      format TEXT NOT NULL,
      resolution TEXT NOT NULL,
      runtime TEXT NOT NULL,
      size_bytes INTEGER,
      notes TEXT,
      is_authoritative INTEGER DEFAULT 0,
      uploaded_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS storage_lifecycle (
      order_id TEXT PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
      status TEXT NOT NULL CHECK(status IN ('Active', 'Retention', 'Retention Period', 'Pending Deletion', 'Soft-Deleted', 'Purged')),
      bytes_total INTEGER DEFAULT 0,
      retention_expires_at TEXT,
      soft_deleted_at TEXT,
      purged_at TEXT
    );

    CREATE TABLE IF NOT EXISTS audit_events (
      id TEXT PRIMARY KEY,
      actor_id TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      details TEXT,
      metadata_json TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cms_projects (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      client TEXT NOT NULL,
      format TEXT NOT NULL,
      runtime TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      thumbnail_url TEXT NOT NULL,
      video_url TEXT NOT NULL,
      social_provider TEXT DEFAULT 'none',
      social_url TEXT,
      playback_url TEXT,
      aspect_ratio TEXT DEFAULT '16:9',
      camera TEXT,
      color_grade TEXT,
      audio_mix TEXT,
      pacing TEXT,
      is_featured INTEGER DEFAULT 0,
      featured_slot INTEGER,
      is_published INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cms_social (
      id TEXT PRIMARY KEY,
      platform TEXT NOT NULL,
      url TEXT NOT NULL,
      title TEXT NOT NULL,
      caption TEXT NOT NULL,
      thumbnail_url TEXT NOT NULL,
      likes TEXT NOT NULL,
      is_published INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS idempotency_records (
      key TEXT PRIMARY KEY,
      response_status INTEGER NOT NULL,
      response_body TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    CREATE INDEX IF NOT EXISTS idx_orders_client ON orders(client_id);
    CREATE INDEX IF NOT EXISTS idx_orders_editor ON orders(assigned_editor_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_audit_events_created ON audit_events(created_at);
  `);

  // Migration: Add google_drive_url to existing orders tables
  try {
    db.exec(`ALTER TABLE orders ADD COLUMN google_drive_url TEXT`);
  } catch (e) {
    // Column already exists — safe to ignore
  }

  // Migration: Add media model columns to cms_projects
  try { db.exec(`ALTER TABLE cms_projects ADD COLUMN social_provider TEXT DEFAULT 'none'`); } catch (e) {}
  try { db.exec(`ALTER TABLE cms_projects ADD COLUMN social_url TEXT`); } catch (e) {}
  try { db.exec(`ALTER TABLE cms_projects ADD COLUMN playback_url TEXT`); } catch (e) {}
  try { db.exec(`ALTER TABLE cms_projects ADD COLUMN aspect_ratio TEXT DEFAULT '16:9'`); } catch (e) {}

  // Seed default data if database is fresh
  seedInitialData();
}

function seedInitialData() {
  const userCountStmt = db.prepare('SELECT COUNT(*) as count FROM users');
  const userCount = userCountStmt.get().count;

  if (userCount === 0) {
    console.log('[DB] Seeding initial database records...');
    const now = new Date().toISOString();    // 1. Seed Admin
    const adminEmail = process.env.ADMIN_EMAIL || DEFAULT_ADMIN.email;
    const adminPassword = process.env.ADMIN_PASSWORD || (process.env.NODE_ENV !== 'production' ? 'adminpgt' : null);

    if (!adminPassword) {
      if (process.env.NODE_ENV === 'production') {
        console.error('[CRITICAL DB ERROR] ADMIN_PASSWORD environment variable is required in production mode!');
        process.exit(1);
      } else {
        console.warn('[DB WARNING] ADMIN_PASSWORD missing. Admin creation skipped.');
      }
    } else {
      const insertUser = db.prepare(`
        INSERT INTO users (id, name, email, password_hash, role, avatar_url, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      insertUser.run(
        DEFAULT_ADMIN.id,
        DEFAULT_ADMIN.name,
        adminEmail.toLowerCase(),
        hashPassword(adminPassword),
        DEFAULT_ADMIN.role,
        DEFAULT_ADMIN.avatar,
        now
      );
    }

    // 2. Seed Editors
    const insertEditor = db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, specialty, max_capacity, avatar_url, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const ed of INITIAL_EDITORS) {
      const editorPass = process.env.EDITOR_SEED_PASSWORD || (process.env.NODE_ENV !== 'production' ? 'editorpgt' : crypto.randomBytes(16).toString('hex'));
      insertEditor.run(
        ed.id,
        ed.name,
        ed.email.toLowerCase(),
        hashPassword(editorPass),
        'editor',
        ed.specialty,
        ed.maxCapacity || 3,
        ed.avatar,
        now
      );
    }

    // 3. Seed Initial Customers
    const insertCustomer = db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, organization, avatar_url, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const cust of INITIAL_CUSTOMERS) {
      const clientPass = process.env.CUSTOMER_SEED_PASSWORD || (process.env.NODE_ENV !== 'production' ? 'clientpgt' : crypto.randomBytes(16).toString('hex'));
      insertCustomer.run(
        cust.id,
        cust.name,
        cust.email.toLowerCase(),
        hashPassword(clientPass),
        'customer',
        cust.organization || 'Independent Creator',
        cust.avatar,
        now
      );
    }

    // 4. Seed Orders & Lifecycles
    const insertOrder = db.prepare(`
      INSERT INTO orders (
        id, client_id, status, package_name, editing_style, platform,
        target_length, project_name, instructions, google_drive_url, deadline, assigned_editor_id,
        admin_notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertLifecycle = db.prepare(`
      INSERT INTO storage_lifecycle (order_id, status, bytes_total, retention_expires_at, soft_deleted_at, purged_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insertOrderFile = db.prepare(`
      INSERT INTO order_files (id, order_id, filename, size_bytes, mime_type, storage_key, upload_status, checksum, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertOutput = db.prepare(`
      INSERT INTO output_versions (
        id, order_id, version_tag, editor_id, storage_key, format,
        resolution, runtime, size_bytes, notes, is_authoritative, uploaded_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const ord of INITIAL_ORDERS) {
      const clientId = ord.userId || 'user-101';
      const assignedEd = ord.assignedEditorId || null;
      insertOrder.run(
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
      );

      // Raw files
      if (ord.rawFootage && ord.rawFootage.length > 0) {
        for (let i = 0; i < ord.rawFootage.length; i++) {
          const file = ord.rawFootage[i];
          insertOrderFile.run(
            `file-${ord.id}-${i}`,
            ord.id,
            file.filename,
            file.sizeBytes || 500000000,
            file.mimeType || 'video/mp4',
            file.storageKey || `raw/${ord.id}/${file.filename}`,
            'completed',
            'd41d8cd98f00b204e9800998ecf8427e',
            ord.createdAt
          );
        }
      }

      // Storage lifecycle
      if (ord.storageLifecycle) {
        insertLifecycle.run(
          ord.id,
          ord.storageLifecycle.status || 'Active',
          ord.storageLifecycle.bytesTotal || 0,
          ord.storageLifecycle.retentionExpiresAt || null,
          ord.storageLifecycle.softDeletedAt || null,
          ord.storageLifecycle.purgedAt || null
        );
      } else {
        insertLifecycle.run(ord.id, 'Active', 0, null, null, null);
      }

      // Outputs
      if (ord.outputVersions && ord.outputVersions.length > 0) {
        for (let idx = 0; idx < ord.outputVersions.length; idx++) {
          const out = ord.outputVersions[idx];
          const outputId = out.versionId || out.id || `ver-${ord.id}-${idx + 1}`;
          const storageKey = out.downloadUrl || out.storageKey || out.url || `outputs/${ord.id}/master.mp4`;
          insertOutput.run(
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
          );
        }
      }
    }

    // 5. Seed CMS Portfolio
    const insertCMS = db.prepare(`
      INSERT INTO cms_projects (
        id, title, client, format, runtime, category, description,
        thumbnail_url, video_url, social_provider, social_url, playback_url, aspect_ratio,
        camera, color_grade, audio_mix, pacing,
        is_featured, featured_slot, is_published, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const p of INITIAL_PORTFOLIO) {
      insertCMS.run(
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
      );
    }

    // 6. Seed CMS Social
    const insertSocial = db.prepare(`
      INSERT INTO cms_social (
        id, platform, url, title, caption, thumbnail_url, likes, is_published, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const s of INITIAL_SOCIAL) {
      insertSocial.run(
        s.id,
        s.platform,
        s.url,
        s.title,
        s.caption,
        s.thumbnail,
        s.likes,
        s.isPublished ? 1 : 0,
        now
      );
    }

    // 7. Initial Audit Event
    const insertAudit = db.prepare(`
      INSERT INTO audit_events (
        id, actor_id, actor_role, action, entity_type, entity_id, details, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertAudit.run(
      `audit-${Date.now()}`,
      'system',
      'system',
      'DATABASE_INITIALIZED',
      'System',
      'triphoria.db',
      'Relational database initialized with WAL mode, foreign keys, and seed records.',
      now
    );

    console.log('[DB] Seeding completed successfully.');
  }
}

// Execute schema init on module load
initSchema();
