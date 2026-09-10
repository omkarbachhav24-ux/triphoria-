# TRIPHORIA — PRODUCTION ARCHITECTURE & SUPABASE MIGRATION PLAN

This document defines the production target architecture, authentication system, database schema mapping, file storage boundaries, security policies, and migration strategy for transitioning TRIPHORIA from a local SQLite development environment to a production-grade Supabase + Node/Express deployment.

---

## 1. Executive Summary & Production Topology

TRIPHORIA is a high-end post-production management platform built on React/Vite (Frontend) and Express/Node.js (Backend).

In production, TRIPHORIA decouples concerns across five architectural tiers:
1. **Frontend Application**: React SPA hosted on Vercel / Netlify / Cloudflare Pages.
2. **Backend Control API**: Node.js / Express API server hosted on Render / Railway / AWS ECS.
3. **Identity & Authentication**: Supabase Auth (`auth.users`) for session management, JWT issuance, email verification, and password resets.
4. **Application Database**: Supabase Postgres for structured data (Orders, Outputs, Profiles, Audit Logs, CMS).
5. **Decoupled Media Storage**:
   - **Customer Raw Footage**: Customer-owned Google Drive folders (No binary video ingest into application database).
   - **Studio Outputs & Master Assets**: Presigned HTTPS URLs pointing to Supabase Storage / AWS S3 or external production storage.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             PUBLIC & WORKSPACE CLIENT                       │
│                         TRIPHORIA Web Application (React)                   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            PRODUCTION CONTROL API                           │
│                          Node.js / Express Server                           │
└──────────┬───────────────────────────┬───────────────────────────┬──────────┘
           │                           │                           │
           ▼                           ▼                           ▼
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│    SUPABASE AUTH    │     │  SUPABASE POSTGRES  │     │    GOOGLE DRIVE     │
│   (Identity & JWT)  │     │ (Application Data)  │     │ (Client Raw Media)  │
└─────────────────────┘     └─────────────────────┘     └─────────────────────┘
```

---

## 2. Complete Current Storage Inventory

| Data Type | Current Storage Location | SQLite Table / Local File | Target Production Location | Migration Required |
| :--- | :--- | :--- | :--- | :--- |
| **Admin Identity** | SQLite DB | `users` | Supabase Auth (`auth.users`) + `profiles` | **YES** |
| **Editor Roster** | SQLite DB | `users` | Supabase Auth (`auth.users`) + `profiles` | **YES** |
| **Customer Users** | SQLite DB | `users` | Supabase Auth (`auth.users`) + `profiles` | **YES** |
| **User Sessions** | SQLite DB | `sessions` | Managed natively by Supabase Auth | **REPLACE** |
| **Projects & Orders** | SQLite DB | `orders` | Supabase Postgres (`orders` table) | **YES** |
| **Order Raw Metadata** | SQLite DB | `order_files` | Supabase Postgres (`order_files` table) | **YES** |
| **Output Cut Versions** | SQLite DB | `output_versions` | Supabase Postgres (`output_versions` table) | **YES** |
| **Storage Lifecycle** | SQLite DB | `storage_lifecycle` | Supabase Postgres (`storage_lifecycle` table) | **YES** |
| **Audit Log Trail** | SQLite DB | `audit_events` | Supabase Postgres (`audit_events` table) | **YES** |
| **CMS Portfolio Work** | SQLite DB | `cms_projects` | Supabase Postgres (`cms_projects` table) | **YES** |
| **CMS Social Proof** | SQLite DB | `cms_social` | Supabase Postgres (`cms_social` table) | **YES** |
| **Idempotency Keys** | SQLite DB | `idempotency_records` | Supabase Postgres (`idempotency_records` table) | **YES** |
| **Raw Media Files** | Google Drive / Local `uploads/` | Filesystem | Google Drive (Client Raw) / Supabase Storage (Outputs) | **KEEP DRIVE** |

---

## 3. Local-Only Data Classification

| Identifier / File | Classification | Production Disposition |
| :--- | :--- | :--- |
| `data/triphoria.db` | **DEV-ONLY** | Replace with Supabase Postgres connection pooling. |
| `uploads/` | **DEV-ONLY** | Local fallback uploads directory. Replace with Supabase Storage / S3. |
| `sessions` table | **REPLACE** | Replace custom SQLite session tokens with Supabase JWT / Session tokens. |
| Quick Login Demo Buttons | **DEV-ONLY** | Scoped strictly behind `import.meta.env.DEV` in `AuthPage.jsx`. |
| Hardcoded fallback passwords | **DELETE** | Remove default fallback credentials (`adminpgt`, `editorpgt`, `clientpgt`). |

---

## 4. Target Authentication Architecture

### Current Auth Architecture
- Custom PBKDF2 password hashing (`crypto.pbkdf2Sync`, 1000 iterations, 64-byte salt) in `server/db.js`.
- Custom session tokens (`sess-<randomBytes>`) stored in SQLite `sessions` table with 30-day expiration.
- HTTP-only cookie `session_token` parsed by Express middleware `authMiddleware`.
- Role resolution evaluated server-side (`req.user.role`).

### Proposed Production Auth Architecture (Supabase Auth)
- **Identity Provider**: Supabase Auth handles email/password registration, password resets, email verification, and secure password hashing (Bcrypt / Argon2).
- **User Identity Mapping**:
  ```
  Supabase Auth (`auth.users.id`) ──1:1──> Application Database (`public.profiles.id`)
  ```
- **Role Control**: Role is stored immutably in `public.profiles.role` (`'admin'`, `'editor'`, `'customer'`).
- **Single Login Portal**: Unified `/login` route (`AuthPage.jsx`). Users authenticate with Email & Password; backend/Supabase resolves identity and returns user role for seamless client routing (`/admin/dashboard`, `/editor/dashboard`, `/dashboard`).

---

## 5. Relational Database Mapping (SQLite $\rightarrow$ Supabase Postgres)

### Schema Translation

```sql
-- 1. Profiles Table (Extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'customer')),
  specialty TEXT,
  max_capacity INT DEFAULT 3,
  organization TEXT,
  avatar_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'deactivated')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Orders & Projects Table
CREATE TABLE public.orders (
  id TEXT PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.profiles(id),
  assigned_editor_id UUID REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'Pending Approval',
  package_name TEXT NOT NULL,
  editing_style TEXT,
  platform TEXT,
  target_length TEXT,
  project_name TEXT NOT NULL,
  instructions TEXT,
  google_drive_url TEXT NOT NULL,
  deadline TIMESTAMPTZ,
  admin_notes TEXT,
  rejection_reason TEXT,
  idempotency_key TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Order Files Metadata Table
CREATE TABLE public.order_files (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  upload_status TEXT DEFAULT 'completed',
  checksum TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Output Versions Table
CREATE TABLE public.output_versions (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  version_tag TEXT NOT NULL,
  editor_id UUID REFERENCES public.profiles(id),
  storage_key TEXT NOT NULL,
  format TEXT NOT NULL,
  resolution TEXT NOT NULL,
  runtime TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  notes TEXT,
  is_authoritative BOOLEAN DEFAULT TRUE,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Storage Lifecycle Table
CREATE TABLE public.storage_lifecycle (
  order_id TEXT PRIMARY KEY REFERENCES public.orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'Active',
  bytes_total BIGINT DEFAULT 0,
  retention_expires_at TIMESTAMPTZ,
  soft_deleted_at TIMESTAMPTZ,
  purged_at TIMESTAMPTZ
);

-- 6. Append-Only Audit Events Table
CREATE TABLE public.audit_events (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  details TEXT,
  metadata_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. CMS Portfolio Projects Table
CREATE TABLE public.cms_projects (
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
  is_featured BOOLEAN DEFAULT FALSE,
  featured_slot INT,
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. CMS Social Proof Table
CREATE TABLE public.cms_social (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  caption TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  likes TEXT NOT NULL,
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Idempotency Records Table
CREATE TABLE public.idempotency_records (
  key TEXT PRIMARY KEY,
  response_status INT NOT NULL,
  response_body JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 6. Row Level Security (RLS) Policy Specifications

TRIPHORIA backend accesses Postgres via a server-side privileged database role or service role key in Express API handlers. However, if client apps access Supabase directly, RLS policies must be enforced:

1. **Customers (`customer` role)**:
   - `SELECT`, `UPDATE` on `orders` WHERE `client_id = auth.uid()`.
   - `SELECT` on `output_versions` WHERE `order_id` belongs to `auth.uid()`.
2. **Editors (`editor` role)**:
   - `SELECT` on `orders` WHERE `assigned_editor_id = auth.uid()`.
   - `INSERT`, `SELECT` on `output_versions` WHERE `editor_id = auth.uid()`.
3. **Studio Admins (`admin` role)**:
   - `ALL` operations across `orders`, `profiles`, `output_versions`, `storage_lifecycle`, `audit_events`, `cms_projects`, `cms_social`.
4. **Public Visitors**:
   - `SELECT` on `cms_projects` WHERE `is_published = true`.
   - `SELECT` on `cms_social` WHERE `is_published = true`.

---

## 7. Decoupled Media & File Storage Boundaries

TRIPHORIA enforces strict separation between application metadata and heavy binary storage:

1. **Client Raw Footage**:
   - Hosted in client's **Google Drive**.
   - Validated via strict domain URL parser in `orders.routes.js` (`drive.google.com`).
   - No raw video binaries stored in TRIPHORIA Postgres or local disk.
2. **Output Cuts & Master Deliverables**:
   - Presigned HTTPS URL pointers stored in `output_versions.storage_key`.
   - Hosted on Supabase Storage bucket (`outputs`) or client Google Drive folder.
3. **Public CMS Covers & Posters**:
   - Image assets hosted on CDN / Supabase Storage bucket (`public-assets`).

---

## 8. Environment Variables Inventory

### Required Production Environment Variables

| Variable Name | Description | Environment | Sensitive |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Environment identifier (`development` / `production`) | Dev, Staging, Prod | No |
| `PORT` | Node API Server port (Default: `3001` or assigned cloud port) | Dev, Staging, Prod | No |
| `FRONTEND_URL` | Allowed frontend origin for CORS (e.g. `https://triphoria.io`) | Staging, Prod | No |
| `SUPABASE_URL` | Supabase Project API URL | Dev, Staging, Prod | No |
| `SUPABASE_ANON_KEY` | Supabase Public Anonymous API Key | Dev, Staging, Prod | No |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Privileged Key | Staging, Prod | **YES (SERVER-ONLY)** |
| `STORAGE_SECRET` | HMAC-SHA256 Secret for presigned upload/download tokens | Dev, Staging, Prod | **YES (SERVER-ONLY)** |
| `ADMIN_EMAIL` | Production Super Admin Seed Email | Staging, Prod | No |
| `ADMIN_PASSWORD` | Production Super Admin Initial Boot Password | Staging, Prod | **YES (SERVER-ONLY)** |

---

## 9. Migration Execution Strategy (SQLite $\rightarrow$ Supabase)

To migrate TRIPHORIA seamlessly without data loss or downtime:

```
[1. Provision Supabase] ──> [2. Apply SQL DDL] ──> [3. Export SQLite JSON]
                                                           │
                                                           ▼
[6. E2E Validation]  <── [5. Import Data]   <── [4. Transform UUIDs]
```

1. **Provision Supabase Infrastructure**: Create production Supabase project and enable Postgres + Auth.
2. **Execute DDL Migration Scripts**: Run schema DDL creation scripts in Supabase SQL Editor.
3. **Export Current SQLite Data**: Execute export script to extract JSON records from `triphoria.db`.
4. **Transform Data & Map User UUIDs**: Convert integer/text IDs to Supabase `auth.users` UUID references.
5. **Execute Seed/Import Pipeline**: Import transformed user, order, output, and CMS records into Supabase Postgres.
6. **Execute Playwright E2E Verification**: Run full test suites (`test/workflow.spec.js`, `test/portfolio_playback.spec.js`, `test/instagram.spec.js`) against the staging environment.
7. **Cut Over Environment Configuration**: Update backend `SUPABASE_URL` and database client to finalize production migration.
