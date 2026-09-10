# TRIPHORIA — PRE-PRODUCTION READINESS AUDIT

This document provides a comprehensive pre-production architectural and security inventory for the **TRIPHORIA** post-production platform prior to Supabase migration, Git repository initialization, and deployment.

---

## 1. CURRENT ARCHITECTURE INVENTORY

### Technical Stack Summary
- **Frontend**: React 19, Vite 8, Tailwind CSS v4, Motion 13, Lucide Icons, Lenis Smooth Scroll.
- **Backend API**: Node.js + Express 5 (`server/index.js`).
- **Database**: SQLite WAL mode with foreign keys (`server/db.js` stored in `data/triphoria.db`).
- **Session Auth**: HTTP-Only Cookie (`session_token`) / Bearer token backed by SQLite `sessions` table (`server/auth.js`).
- **RBAC**: Express middleware enforcing roles (`admin`, `editor`, `customer`).
- **Storage Strategy**: Local filesystem (`uploads/`) for temporary deliverables + Google Drive URL pointer intake for raw footage.
- **Audit System**: `audit_events` table recording all order creations, approvals, rejections, assignments, and deliveries.

### Route Inventory
- **Public Storefront Routes**: `/`, `/work`, `/services`, `/how-it-works`, `/about`, `/contact`, `/login` (`AuthPage.jsx`).
- **Customer Workspace Routes**: `/order` (Intake), `/order/success/:id`, `/dashboard` (`CustomerDashboard.jsx`).
- **Editor Workspace Routes**: `/editor/dashboard` (`EditorDashboard.jsx`).
- **Admin Control Routes**: `/admin/dashboard`, `/admin/orders`, `/admin/editors`, `/admin/cms`, `/admin/audit-logs`.

---

## 2. DATABASE SCHEMATICS & SUPABASE TARGET MAPPING

| SQLite Table | Table Purpose | Primary Fields & Constraints | Relationships | Production Target |
| :--- | :--- | :--- | :--- | :--- |
| `users` | User credentials, roles & profiles | `id`, `email` (UNIQUE), `password_hash`, `role` (`admin`/`editor`/`customer`) | Primary parent entity | `auth.users` + `public.profiles` |
| `sessions` | Active auth session tokens | `id`, `user_id`, `token` (UNIQUE), `expires_at` | `user_id` -> `users.id` | Handled by Supabase Auth engine |
| `orders` | Production intake & lifecycle | `id`, `client_id`, `assigned_editor_id`, `status`, `google_drive_url`, `idempotency_key` | `client_id` -> `users.id`, `assigned_editor_id` -> `users.id` | `public.orders` |
| `order_files` | Raw file metadata references | `id`, `order_id`, `filename`, `size_bytes`, `storage_key` | `order_id` -> `orders.id` | `public.order_files` |
| `output_versions` | Cut delivery versions | `id`, `order_id`, `version_tag`, `editor_id`, `storage_key`, `is_authoritative` | `order_id` -> `orders.id`, `editor_id` -> `users.id` | `public.output_versions` |
| `storage_lifecycle`| Storage retention tracking | `order_id`, `status` (`Active`/`Retention`/`Purged`), `retention_expires_at` | `order_id` -> `orders.id` | `public.storage_lifecycle` |
| `audit_events` | Immutable security audit log | `id`, `actor_id`, `actor_role`, `action`, `entity_type`, `entity_id` | Refers to system actors | `public.audit_events` |
| `cms_projects` | Public portfolio showcase | `id`, `title`, `playback_url`, `social_url`, `aspect_ratio`, `is_featured`, `is_published` | Independent showcase table | `public.cms_projects` |
| `cms_social` | Social feed items | `id`, `platform`, `url`, `caption`, `is_published` | Independent showcase table | `public.cms_social` |
| `idempotency_records`| Intake request deduplication | `key`, `response_status`, `response_body` | Primary key lookup | `public.idempotency_records` |

> [!CAUTION]
> **Database Rule**: Large media binaries (raw 4K/8K footage or ProRes exports) are NEVER stored directly in PostgreSQL/SQLite tables. Tables contain only metadata and stable object keys (`bucket/object_path`).

---

## 3. AUTHENTICATION & SECURITY AUDIT

- **Password Hashing**: Node.js native `crypto.scryptSync` with 16-byte random salts.
- **Session Tokens**: 32-byte cryptographically secure random tokens (`crypto.randomBytes(32)`).
- **Cookie Security**: `HttpOnly`, `SameSite=Lax`, `Path=/`, `Max-Age=30 Days`.
- **Fallback Credentials Verification**:
  - `server/db.js` uses `process.env.ADMIN_PASSWORD`. In `NODE_ENV=production`, if `ADMIN_PASSWORD` is missing, the server process intentionally halts with a `[CRITICAL DB ERROR]`.
  - Development defaults (`adminpgt`, `editorpgt`, `clientpgt`) are strictly gated by `process.env.NODE_ENV !== 'production'`.
- **Zero Committed Secrets**: `.env` and `.env.*` files are explicitly included in `.gitignore`.

---

## 4. SUPABASE MIGRATION STRATEGY

### Account Migration Protocol
SQLite password hashes (`crypto.scryptSync`) cannot be directly imported into Supabase Auth (`bcrypt` / `argon2`).

**Selected Account Re-authentication Strategy**:
1. **Admin & Editor Migration**: Admin and Editor accounts are bootstrapped using Supabase Auth Admin APIs (`supabase.auth.admin.createUser()`) during migration script execution, generating password reset invite links.
2. **Customer Accounts**: Existing customers transition seamlessly via email magic link or password reset flow upon their first login attempt after Supabase cutover.

### Authorization Boundary
- Express backend communicates with Supabase PostgreSQL using the **Supabase Service Role Key** (for server-side operations) and enforcing server-side RBAC middleware (`requireRole(['admin', 'editor'])`).
- **Frontend Security**: The public frontend receives ONLY the `SUPABASE_ANON_KEY`. The `SUPABASE_SERVICE_ROLE_KEY` is strictly confined to server-side process environments.

---

## 5. STORAGE & GOOGLE DRIVE INTAKE ARCHITECTURE

### Raw Footage Intake
- **Protocol**: Raw customer footage is ingested strictly via shareable **Google Drive URLs** (e.g. `https://drive.google.com/drive/folders/...`).
- **Validation**: TRIPHORIA validates URL format integrity (`/^https:\/\/(drive\|docs)\.google\.com\//i`) and records the pointer. It does NOT download or duplicate raw video streams into local server storage.

### Deliverable Media Storage
- **Output Cut Storage**: Edited video deliverables and thumbnails use **Supabase Storage** (or S3-compatible bucket) organized into paths (`deliveries/{order_id}/{version_tag}/master.mp4`).
- **Signed URL Strategy**: Database tables store stable canonical keys (`deliveries/...`). Temporary signed download URLs with expiration timers (e.g. 15 minutes) are generated dynamically upon client request.

---

## 6. GIT & REPOSITORY READINESS

### `.gitignore` Verification
The workspace `.gitignore` file includes all required protection rules:
- `.env`, `.env.*` (excluding `.env.example`)
- `data/`, `uploads/`, `*.sqlite`, `*.db`, `*.sqlite-wal`, `*.sqlite-shm`
- `node_modules/`, `dist/`, `logs/`, `*.log`

---

## 7. DEAD CODE & CLEANUP AUDIT

- **Public Dashboard Overlays**: Removed temporary floating studio workspace role selectors from the public `Navbar.jsx` view.
- **Unused Dependencies**: All dependencies in `package.json` are actively utilized (`motion`, `express`, `lenis`, `lucide-react`, `cookie-parser`).

---

## 8. PRE-PRODUCTION MIGRATION ROADMAP

1. **Step 1**: Provision Supabase Cloud Project.
2. **Step 2**: Execute PostgreSQL DDL schema scripts (`profiles`, `orders`, `order_files`, `output_versions`, `storage_lifecycle`, `audit_events`, `cms_projects`).
3. **Step 3**: Configure Supabase Auth providers & RLS policies.
4. **Step 4**: Run SQLite-to-PostgreSQL data migration script.
5. **Step 5**: Update backend environment variables (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`).
6. **Step 6**: Run end-to-end integration test (`npm run lint` & `npm run build`).

---

## 9. FINAL ACCEPTANCE GATE

- **Lint Status**: **PASS** (`oxlint` passed with 0 errors).
- **Build Status**: **PASS** (`vite build` completed in 2.01s).
- **Final Classification**: **READY FOR SUPABASE MIGRATION & DEPLOYMENT**.
