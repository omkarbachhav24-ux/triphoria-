# TRIPHORIA — Production Runbook

## 1. Architecture

React 19 + Vite 8 SPA, Express 5 API, Supabase PostgreSQL. Single Vercel
deployment: `dist/` (static) + `api/index.js` (serverless function wrapping
`server/app.js`). No separate frontend/backend hosts. See
`docs/FINAL-CODEBASE-AUDIT.md` for full detail.

## 2. Environment Variables

See `docs/PRODUCTION-CREDENTIAL-ROTATION.md` for the full inventory and
`.env.example` for the documented shape of each. Required for the app to
boot at all: `DATABASE_URL`, `STORAGE_SECRET`. Required only on first boot
(empty database): `ADMIN_PASSWORD`. Optional: `FRONTEND_URL` (recommended
for split-origin deployments; same-origin needs no change),
`SUPABASE_SERVICE_ROLE_KEY` + `SUPABASE_STORAGE_BUCKET` (durable deliverable
storage — currently unconfigured).

## 3. Vercel Deployment

- Build command: `npm run build` (Vite → `dist/`).
- Function: `api/index.js`, `maxDuration: 30`, includes `server/schema.sql`.
- Routing (`vercel.json`): `/api/*` and `/uploads/*` → the function;
  everything else → `dist/index.html` (SPA fallback).
- Deploying is **explicitly reserved for the project owner** in this
  engagement — nothing here pushes or triggers a deploy.
- After any deploy: run the smoke test in §14 immediately.

## 4. Supabase Configuration

Project already provisioned. `DATABASE_URL` must use the Transaction-mode
pooler connection string (port 6543) — verified this is how the currently
configured value is shaped. RLS is enabled on all 10 public tables (added
this audit) with no `anon`/`authenticated` policies — the API's `postgres`
role bypasses RLS and is unaffected; this is defense-in-depth for any other
connection path, not the app's authorization boundary.

## 5. Database Migrations

`server/schema.sql` is the single source of truth, applied idempotently on
every cold start via `ensureSchema()` in `server/db.js`. To add a column or
table: append an `ADD COLUMN IF NOT EXISTS` / `CREATE TABLE IF NOT EXISTS`
statement to that file — never a separate migration runner, never a
destructive `ALTER`/`DROP` without explicit authorization from whoever owns
the data.

## 6. Credential Rotation

See `docs/PRODUCTION-CREDENTIAL-ROTATION.md`.

## 7. Storage Configuration

See `docs/STORAGE-ARCHITECTURE.md`. Currently: raw footage is a Google Drive
URL (works today, no configuration needed). Final deliverables use hosted
URLs an editor pastes in (works today). Durable binary storage via Supabase
Storage is built but blocked on missing `SUPABASE_SERVICE_ROLE_KEY` /
`SUPABASE_STORAGE_BUCKET` — configuring those two variables and implementing
the 5 methods in `SupabaseStorageProvider.js` activates it with no other
code change required.

## 8. Backup / Recovery

Supabase manages automated backups at the infrastructure level (point-in-time
recovery availability depends on the Supabase plan tier — verify this in the
Supabase dashboard under Database → Backups; not independently verifiable
from this codebase). Application-level backup/export tooling does not exist
in this codebase — if a manual export is needed, use Supabase's dashboard
export or `pg_dump` directly against `DATABASE_URL`.

## 9. Monitoring

No third-party APM/error-tracking service is integrated. Observability today
consists of: `console.error`/`console.warn` (visible in Vercel's function
logs) and the `audit_events` table (business-level actions, admin-visible at
`/admin/audit-logs`). Recommended addition, not currently implemented:
forward Vercel function logs to a persistent log sink, since Vercel's own
log retention is limited.

## 10. Incident Response

1. Check `https://<domain>/api/health` first — a non-200 means the whole API
   is down (as happened in the incident documented in
   `docs/INCIDENT-2026-09-12-API-DOWN.md`).
2. Check Vercel's function logs for the specific error.
3. If the error is a module-load-time crash (every route fails identically),
   suspect a top-level side effect in a newly-changed file — module-scope
   filesystem writes are the known failure class (see the incident doc).
4. If only specific routes fail, check that route's handler and the
   database connection.
5. Audit trail (`/admin/audit-logs`) shows what mutations succeeded before
   an incident, useful for understanding blast radius.

## 11. Rollback

Vercel's dashboard supports instant rollback to any previous deployment.
Database changes are additive-only by design (see §5) so a code rollback
does not require a corresponding database rollback in the normal case.

## 12. Local Development

```
npm install
cp .env.example .env   # fill in DATABASE_URL, STORAGE_SECRET, ADMIN_PASSWORD
npm run dev             # Vite dev server
npm run server           # Express API (separate terminal, or use the combined QA server below)
```

For a production-build + real-API local test environment identical to what
this audit used: a small local-only script serves `dist/` statically
alongside the real Express app on one origin — never commit this script; it
exists only as a gitignored QA convenience.

## 13. Testing

No automated test suite exists (`package.json` has no `test` script). This
is a real, named gap — see `docs/FINAL-CODEBASE-AUDIT.md` §Known Technical
Debt. Until one exists, verification is manual: `npm run build`,
`npm run lint`, and direct API/browser testing against a local instance
running the real production build against the live database.

## 14. Production Smoke Test

Run immediately after any deployment:

1. `GET /api/health` → expect `200 {"status":"healthy", ...}`.
2. Load `/` in a browser → featured work section should show real content or
   an honest empty state, never a blank crash.
3. Attempt login with a known-good account → expect a successful redirect to
   the correct role's dashboard.
4. `GET /api/auth/me` after login → expect `{"authenticated": true, ...}`.
5. Log out → `GET /api/auth/me` again → expect `{"authenticated": false}`.

If step 1 fails, every subsequent step will also fail — stop and diagnose
the API before testing anything else.

## 15. New Editor Creation

Admin logs in → Editors page → "Onboard New Editor" → fill name/email/
specialty → the server generates a one-time password shown once in the UI
for the admin to relay to the editor out-of-band. Never re-derivable after
that screen closes — if lost, deactivate and re-onboard, or use the direct-
database rotation procedure in `docs/PRODUCTION-CREDENTIAL-ROTATION.md`.

## 16. Account Disabling

Admin → Editors page → deactivate action on an editor card. This now
(fixed this audit) immediately revokes all of that editor's active sessions,
not just future logins. No equivalent UI exists for disabling a customer or
another admin account — requires a direct database update if ever needed.

## 17. Password Reset

**No self-service password-reset flow exists for any role**, confirmed by
full-source search during this audit. Until one is built, resetting a
password requires the direct-database procedure in
`docs/PRODUCTION-CREDENTIAL-ROTATION.md`.

## 18. CMS Publishing

Admin → CMS → Video Library → Add Video → fill title/client/category/media
type/aspect ratio/hosted playback URL → Save. Toggle "Live"/"Draft" from the
grid or list view to publish/unpublish. Featured Work tab sets exactly 3
homepage slots — the API enforces the maximum regardless of what the UI
sends (verified this audit with a direct 4th/5th-slot injection attempt).

## 19. Audit Review

Admin → Audit Logs. Searchable by actor/action/entity/keyword, filterable by
category, paginated. Every order-lifecycle transition, editor-account
mutation, and CMS change is logged with actor, role, entity, and a
human-readable detail line — never editable by any application role.
