-- TRIPHORIA — PostgreSQL schema (Supabase)
-- Ported 1:1 from the original SQLite schema in the previous server/db.js.
-- Table names, column names, and semantics are preserved so that the existing
-- Express route/business logic ports with only placeholder ($1..$n) and
-- async/await changes. IDs remain TEXT (e.g. 'admin-01', 'ORD-1234') because
-- authentication stays on the custom Express session model (no Supabase Auth).
--
-- All statements are idempotent (IF NOT EXISTS) so this file can be run on
-- every cold start without harm.

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'customer', 'client')),
  specialty     TEXT,
  max_capacity  INTEGER DEFAULT 3,
  avatar_url    TEXT,
  organization  TEXT,
  status        TEXT DEFAULT 'active',
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id                 TEXT PRIMARY KEY,
  client_id          TEXT NOT NULL REFERENCES users(id),
  status             TEXT NOT NULL CHECK (status IN ('Pending Approval', 'In Progress', 'Review', 'Completed', 'Rejected')),
  package_name       TEXT NOT NULL,
  editing_style      TEXT NOT NULL,
  platform           TEXT NOT NULL,
  target_length      TEXT NOT NULL,
  project_name       TEXT NOT NULL,
  instructions       TEXT,
  google_drive_url   TEXT,
  deadline           TEXT NOT NULL,
  assigned_editor_id TEXT REFERENCES users(id),
  admin_notes        TEXT,
  rejection_reason   TEXT,
  idempotency_key    TEXT UNIQUE,
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS order_files (
  id            TEXT PRIMARY KEY,
  order_id      TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  filename      TEXT NOT NULL,
  size_bytes    BIGINT NOT NULL,
  mime_type     TEXT NOT NULL,
  storage_key   TEXT NOT NULL,
  upload_status TEXT NOT NULL CHECK (upload_status IN ('pending', 'uploading', 'completed', 'failed')),
  checksum      TEXT,
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS output_versions (
  id               TEXT PRIMARY KEY,
  order_id         TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  version_tag      TEXT NOT NULL,
  editor_id        TEXT NOT NULL REFERENCES users(id),
  storage_key      TEXT NOT NULL,
  format           TEXT NOT NULL,
  resolution       TEXT NOT NULL,
  runtime          TEXT NOT NULL,
  size_bytes       BIGINT,
  notes            TEXT,
  is_authoritative INTEGER DEFAULT 0,
  uploaded_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS storage_lifecycle (
  order_id             TEXT PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
  status               TEXT NOT NULL CHECK (status IN ('Active', 'Retention', 'Retention Period', 'Pending Deletion', 'Soft-Deleted', 'Purged')),
  bytes_total          BIGINT DEFAULT 0,
  retention_expires_at TEXT,
  soft_deleted_at      TEXT,
  purged_at            TEXT
);

CREATE TABLE IF NOT EXISTS audit_events (
  id            TEXT PRIMARY KEY,
  actor_id      TEXT NOT NULL,
  actor_role    TEXT NOT NULL,
  action        TEXT NOT NULL,
  entity_type   TEXT NOT NULL,
  entity_id     TEXT NOT NULL,
  details       TEXT,
  metadata_json TEXT,
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cms_projects (
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL,
  client          TEXT NOT NULL,
  format          TEXT NOT NULL,
  runtime         TEXT NOT NULL,
  category        TEXT NOT NULL,
  description     TEXT NOT NULL,
  thumbnail_url   TEXT NOT NULL,
  video_url       TEXT NOT NULL,
  social_provider TEXT DEFAULT 'none',
  social_url      TEXT,
  playback_url    TEXT,
  aspect_ratio    TEXT DEFAULT '16:9',
  camera          TEXT,
  color_grade     TEXT,
  audio_mix       TEXT,
  pacing          TEXT,
  is_featured     INTEGER DEFAULT 0,
  featured_slot   INTEGER,
  is_published    INTEGER DEFAULT 1,
  created_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cms_social (
  id            TEXT PRIMARY KEY,
  platform      TEXT NOT NULL,
  url           TEXT NOT NULL,
  title         TEXT NOT NULL,
  caption       TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  likes         TEXT NOT NULL,
  is_published  INTEGER DEFAULT 1,
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS idempotency_records (
  key             TEXT PRIMARY KEY,
  response_status INTEGER NOT NULL,
  response_body   TEXT NOT NULL,
  created_at      TEXT NOT NULL
);

-- Columns added by the old in-code migrations; folded in here as IF NOT EXISTS.
ALTER TABLE orders        ADD COLUMN IF NOT EXISTS google_drive_url TEXT;
ALTER TABLE cms_projects  ADD COLUMN IF NOT EXISTS social_provider  TEXT DEFAULT 'none';
ALTER TABLE cms_projects  ADD COLUMN IF NOT EXISTS social_url       TEXT;
ALTER TABLE cms_projects  ADD COLUMN IF NOT EXISTS playback_url     TEXT;
ALTER TABLE cms_projects  ADD COLUMN IF NOT EXISTS aspect_ratio     TEXT DEFAULT '16:9';

-- B7 redesign-support columns (additive only — approved 4-column set).
-- media_type/tags let the CMS and video library classify content beyond the
-- free-text `category` field without redefining it; aspect_ratio/media_type
-- on orders let the order flow persist the customer's chosen format instead
-- of inferring it from `platform` text. All existing rows get NULL/[] and
-- continue to work unchanged; no data is migrated or destroyed.
ALTER TABLE cms_projects  ADD COLUMN IF NOT EXISTS media_type       TEXT;
ALTER TABLE cms_projects  ADD COLUMN IF NOT EXISTS tags             TEXT[] DEFAULT '{}';
ALTER TABLE orders        ADD COLUMN IF NOT EXISTS aspect_ratio     TEXT;
ALTER TABLE orders        ADD COLUMN IF NOT EXISTS media_type       TEXT;

CREATE INDEX IF NOT EXISTS idx_sessions_token       ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_orders_client        ON orders(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_editor        ON orders(assigned_editor_id);
CREATE INDEX IF NOT EXISTS idx_orders_status        ON orders(status);
CREATE INDEX IF NOT EXISTS idx_audit_events_created ON audit_events(created_at);

-- B7 hardening: indexes for the remaining foreign-key lookups and hot query
-- paths (order detail hydration, CMS public listing) that were missing.
CREATE INDEX IF NOT EXISTS idx_sessions_user        ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_order_files_order    ON order_files(order_id);
CREATE INDEX IF NOT EXISTS idx_output_versions_order ON output_versions(order_id);
CREATE INDEX IF NOT EXISTS idx_output_versions_editor ON output_versions(editor_id);
CREATE INDEX IF NOT EXISTS idx_cms_projects_published ON cms_projects(is_published);
CREATE INDEX IF NOT EXISTS idx_cms_projects_featured  ON cms_projects(is_featured, featured_slot) WHERE is_featured = 1;
CREATE INDEX IF NOT EXISTS idx_cms_social_published  ON cms_social(is_published);
