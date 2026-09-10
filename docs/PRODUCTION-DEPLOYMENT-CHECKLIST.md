# TRIPHORIA — PRODUCTION DEPLOYMENT CHECKLIST

This checklist must be verified and signed off before deploying TRIPHORIA to production.

---

## 1. Authentication & Identity Architecture
- [ ] **Supabase Auth Configured**: Email & Password authentication provider enabled in Supabase Console.
- [ ] **Unified Public Login**: Verified that `/login` (`AuthPage.jsx`) serves as the single entry portal without "Choose Your Role" buttons or role selectors.
- [ ] **Server-Side Role Resolution**: Confirmed that roles (`admin`, `editor`, `customer`) are resolved server-side from `public.profiles.role` upon login.
- [ ] **Routing Sanity**: Verified that successful login routes Admin $\rightarrow$ `/admin/dashboard`, Lead Editor $\rightarrow$ `/editor/dashboard`, Customer $\rightarrow$ `/dashboard`.
- [ ] **Dev Credentials Strip**: Confirmed that Quick Login demo buttons are restricted behind `import.meta.env.DEV` in `AuthPage.jsx`.
- [ ] **Disabled Accounts Check**: Verified that deactivated accounts (`status = 'deactivated'`) return HTTP 403 Forbidden on login attempts.
- [ ] **Password Security**: Removed all default fallback passwords (`adminpgt`, `editorpgt`, `clientpgt`) from backend source code.

---

## 2. Database & Schema Verification
- [ ] **Supabase DDL Deployed**: Executed DDL scripts for `profiles`, `orders`, `order_files`, `output_versions`, `storage_lifecycle`, `audit_events`, `cms_projects`, `cms_social`, and `idempotency_records`.
- [ ] **Foreign Key Constraints**: Verified foreign keys connecting `orders.client_id` $\rightarrow$ `profiles.id`, `orders.assigned_editor_id` $\rightarrow$ `profiles.id`, `order_files.order_id` $\rightarrow$ `orders.id`, `output_versions.order_id` $\rightarrow$ `orders.id`.
- [ ] **Row Level Security (RLS)**: Enforced RLS policies ensuring customers see only their own projects, editors see only assigned projects, and public visitors see only published CMS content.
- [ ] **Idempotency Protection**: Verified that server-side idempotency cache (`idempotency_records` table) prevents duplicate order creation on network retries.

---

## 3. Secrets & Git Repository Hygiene
- [ ] **GitIgnore Updated**: Added `.env`, `.env.local`, `.env.production`, `data/`, `uploads/`, `*.sqlite`, `*.db` to `.gitignore`.
- [ ] **No Committed Secrets**: Scanned repository to confirm no API keys, database passwords, or JWT secrets are committed in source code.
- [ ] **Environment Variable Mapping**: Configured production environment variables (`NODE_ENV`, `PORT`, `FRONTEND_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STORAGE_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`).
- [ ] **Service Role Isolation**: Verified that `SUPABASE_SERVICE_ROLE_KEY` is loaded strictly server-side and NEVER bundled into client JavaScript.

---

## 4. Decoupled Media & File Storage
- [ ] **Google Drive Raw Ingest**: Verified that raw customer video footage is submitted via validated Google Drive URLs (`drive.google.com`).
- [ ] **No Heavy Video Binaries in Postgres**: Confirmed that video binary files are NOT stored as BLOBs in Postgres tables.
- [ ] **Deliverable Output Storage**: Verified that output master cuts use presigned HTTPS URL pointers in `output_versions.storage_key`.
- [ ] **Presigned Token Security**: Verified HMAC-SHA256 signature verification for presigned upload and download tokens in `upload.routes.js`.

---

## 5. Security & Network Boundary Controls
- [ ] **Restricted CORS**: Replaced `cors({ origin: true })` with explicit origin whitelist (`FRONTEND_URL`) in `server/index.js`.
- [ ] **Secure HTTP-Only Cookies**: Set `cookie.secure = true` and `cookie.sameSite = 'lax'` in production mode for session cookie delivery over HTTPS.
- [ ] **API Authorization Middleware**: Verified that all sensitive endpoints enforce `requireAuth` and `requireRole(['admin'])` server-side.
- [ ] **Audit Trail Integrity**: Confirmed append-only behavior for `audit_events` logging all administrative actions, editor assignments, and delivery approvals.

---

## 6. Pre-Flight Testing & QA
- [ ] **Vite Production Build**: Verified clean execution of `npm run build` with zero compiler or bundle errors.
- [ ] **E2E Workflow Test**: Verified complete customer $\rightarrow$ admin $\rightarrow$ editor $\rightarrow$ delivery workflow via Playwright (`test/workflow.spec.js`).
- [ ] **Portfolio & Video Player Verification**: Verified native HTML5 video playback, aspect ratio frame scaling (`9:16`, `16:9`), and `View on Instagram ↗` overlay buttons (`test/portfolio_playback.spec.js`).
- [ ] **Instagram Embed Verification**: Verified official Meta SDK embed initialization and clean fallback rendering (`test/instagram.spec.js`).
