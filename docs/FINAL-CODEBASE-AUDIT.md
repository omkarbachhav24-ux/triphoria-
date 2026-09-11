# TRIPHORIA — Final Codebase Audit

**Date:** 2026-09-12
**Method:** Direct inspection of every architectural layer, plus live testing
against `https://triphoria-azure.vercel.app/` and the live Supabase database.
Nothing in this document is inferred from a prior report without independent
verification.

## Frontend Architecture

React 19 + Vite 8 single-page app. Routing is hand-rolled in `src/App.jsx`
(`window.history.pushState`/`popstate`, a `renderPage()` switch) — no
react-router. Public/customer pages (`HomePage`, `WorkPage`, `AuthPage`,
`OrderFlowPage`, `OrderSuccessPage`, `CustomerDashboard`,
`CustomerProjectPage`) are statically bundled; the 8 editor/admin/docs pages
are `React.lazy()`-loaded behind a single `Suspense` boundary, verified to
produce a 541KB (150KB gzip) initial bundle vs 880KB (230KB gzip) before
splitting.

Design system: Tailwind v4 (token-driven CSS custom properties in
`src/index.css`, no `tailwind.config.js`) + a scene-based background system
(`<Scene variant="paper|black|green|teal|lime|dark-editorial">`) + the
`motion` library for animation, with custom primitives (`Reveal`, `Stagger`,
`TextReveal`, `ImageReveal` in `src/components/motion/Reveal.jsx`).

**Dead code removed during this audit:** 9 unused component files
(`button.jsx`, `container-scroll-animation.jsx`, `continuous-timeline.jsx`,
`custom-cursor.jsx`, `film-primitives.jsx`, `magnetic-button.jsx`,
`motion-primitives.jsx`, `phone-carousel.jsx`, `rainbow-button.jsx`) and
`src/lib/utils.js`, confirmed via precise import-path search to have zero
consumers anywhere in the app. 5 npm dependencies uninstalled as a result
(`canvas-confetti`, `@radix-ui/react-slot`, `class-variance-authority`,
`clsx`, `tailwind-merge`). Build output is byte-identical before/after,
confirming these were never in the tree-shaken bundle to begin with — pure
dead weight, zero behavior change.

## Backend Architecture

Express 5, `server/app.js` exported and consumed by both `server/index.js`
(local standalone) and `api/index.js` (Vercel serverless entrypoint,
identical code path both ways). No ORM — `pg` (`node-postgres`) directly via
`server/db.js`. Route files: `auth.routes.js`, `orders.routes.js`,
`cms.routes.js`, `audit.routes.js`, `upload.routes.js`.

**Critical bug found and fixed this audit:** `server/storage.js` ran
`fs.mkdirSync()` at module-load time (not inside a request handler). Vercel's
serverless filesystem is read-only outside `/tmp`; this threw on every cold
start and crashed the entire module graph, taking down every `/api/*` route
including `/api/health`. Confirmed by directly testing the live deployment
(`FUNCTION_INVOCATION_FAILED` on every route) before the fix, and by a full
module-graph boot test under simulated Vercel constraints after. Full
writeup: `docs/INCIDENT-2026-09-12-API-DOWN.md`.

## Database Architecture

Supabase PostgreSQL, schema in `server/schema.sql`, applied idempotently
(`CREATE TABLE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` /
`ENABLE ROW LEVEL SECURITY`, all safe to rerun) via `ensureSchema()` on every
cold start. 10 tables: `users`, `sessions`, `orders`, `order_files`,
`output_versions`, `storage_lifecycle`, `audit_events`, `cms_projects`,
`cms_social`, `idempotency_records`. Row counts as of this audit: see
`TRIPHORIA-FINAL-PRODUCTION-REPORT.md` §"Actual Data Storage".

Connection: `DATABASE_URL` verified pointed at Supabase's Transaction-mode
pooler (port 6543), pool `max: 1` on Vercel (`process.env.VERCEL` check) /
`max: 10` locally — the correct pattern for serverless-per-invocation
connection safety.

Integrity checked directly (not assumed): zero orphaned `orders`/
`order_files`/`output_versions` rows, zero duplicate user emails, zero
expired-but-undeleted sessions found (though the underlying cleanup gap
existed until fixed this audit — see below). Transaction rollback verified
with a forced-failure test: an INSERT inside a `withTransaction()` block that
then throws leaves zero trace, confirmed by row-count-before/after
comparison.

**Fixed this audit:** sessions had no cleanup path for rows that simply
expire (vs. explicit logout) — unbounded growth. Added a best-effort sweep
piggybacked on every `createSession()` call (i.e. every login), avoiding new
cron infrastructure.

## Authentication Architecture

Custom cookie-session auth, not Supabase Auth. `crypto.randomBytes(32)`
opaque tokens (not JWTs — nothing client-decodable), scrypt password hashing
(`salt:derivedKeyHex`), 30-day session TTL. Cookie attributes verified live:
`HttpOnly; SameSite=Lax; Path=/`, `Secure` correctly gated on
`NODE_ENV==='production'` (verified by code inspection — cannot be tested
over local plain-HTTP since browsers refuse `Secure` cookies there).

**Fixed this audit:** an account deactivated by an admin kept full API access
via any session token issued before the deactivation, for up to the
remaining session TTL (up to 30 days). Reproduced end-to-end with a
disposable test account before fixing. Fix: `getUserFromToken()` now checks
`status != 'deactivated'` on every request (not just at login), and the
deactivation route proactively deletes all of that user's sessions.

12/12 direct adversarial auth tests passed: wrong password, wrong email
(identical error message — no user-enumeration), missing cookie, forged
token, logout-then-reuse (genuinely rejected, not just client-side),
role-crossing order-list scoping.

## Authorization Architecture

Server-enforced RBAC (`requireAuth`/`requireRole` middleware) plus explicit
per-row ownership checks in every route handler (e.g.
`row.client_id !== user.id && row.assigned_editor_id !== user.id` → 403).
The frontend never determines its own authorization.

12 additional adversarial RBAC tests passed this audit beyond the prior
engagement's 24: role spoofing via request body, header spoofing
(`X-User-Role`/`X-Admin`), cookie-claim injection, HTTP method manipulation,
sequential/predictable ID enumeration against real orders, query-string
parameter injection, body-based ID override on a path-scoped resource. All
held.

**Genuine concurrency verified** (not just sequential 409 checks): 10
simultaneous `Promise.all` approve-requests against the same order —
exactly 1 succeeded, 9 got clean 409s, final state fully consistent
(`SELECT ... FOR UPDATE` row-locking holds under real concurrent load).
Concurrent output-uploads from the same editor correctly recorded as
independent version rows with no corruption.

## Deployment Architecture

`vercel.json`: Vite build → `dist/`, `api/index.js` handles `/api/*` and
`/uploads/*`, everything else falls through to `index.html` (SPA routing).
`server/schema.sql` explicitly included via `includeFiles` so the serverless
function can read it. `maxDuration: 30`.

**Live deployment tested directly** (not assumed from local behavior): the
static frontend shell returns 200 on every route (`/`, `/work`, `/login`).
Every `/api/*` route returned `500 FUNCTION_INVOCATION_FAILED` before this
audit's fix — confirmed via Playwright against the real URL: the homepage
renders (degrades gracefully to an honest empty state, no blank-screen
crash) but "Sign In" and all data-dependent features were completely
non-functional. This is now fixed in the local branch; **not yet verified on
the actual redeployed Vercel instance**, since deployment/push is reserved
for the project owner.

## Storage Architecture

Raw customer footage: Google Drive URL only, validated server-side
(`drive.google.com` host required), never downloaded/mirrored.

Final deliverables: `StorageProvider` interface
(`server/providers/StorageProvider.js`) with two implementations —
`LocalStorageProvider` (non-durable, dev/QA only, refused on Vercel by
`selectStorageProvider()`'s `process.env.VERCEL` check) and
`SupabaseStorageProvider` (production target, **currently blocked**:
`SUPABASE_SERVICE_ROLE_KEY`/`SUPABASE_STORAGE_BUCKET` both MISSING,
confirmed live — `isConfigured` returns `false`; every method throws a
documented 503 `STORAGE_NOT_CONFIGURED` rather than faking success).

`output_versions.storage_key` is **not a uniformly-shaped canonical object
key** — direct inspection shows a mix of full external URLs (Drive links,
legacy sample-video URLs from early testing) and a few genuine relative
path-shaped strings (`orders/ORD-XXXX/raw/...`) from local-upload testing.
This is consistent with the documented architecture (deliverables are
recorded as hosted URLs, not object keys, until durable storage is
configured) but is worth naming precisely rather than glossing over.

## CMS Architecture

`cms_projects`/`cms_social` tables drive the public portfolio and the
3-featured-slot system. **Directly tested the full 0/1/2/3/4+ matrix**
against the live API: 0, 1, 2, and 3 slots all set and reflected correctly
via `GET /api/cms/featured`; an attempt to smuggle `slot4Id`/`slot5Id` fields
was silently ignored (the endpoint only reads `slot1Id`/`slot2Id`/`slot3Id`
by construction) — confirmed the public featured count stayed at exactly 3
and `featured_slot` values are exactly `[1,2,3]`, never a 4th.

## Audit Architecture

`audit_events`, append-only, no update/delete API exposed to any role.
Pagination added in a prior batch (`page`/`limit` query params, backward
compatible). This audit's full E2E workflow test confirmed all 6 expected
audit actions fire for a complete order lifecycle
(`ORDER_CREATED`/`ORDER_APPROVED`/`OUTPUT_UPLOADED` ×2/
`OUTPUT_REVISION_REQUESTED`/`FINAL_DELIVERY_APPROVED`).

## Environment Configuration

| Variable | Classification | Status |
|---|---|---|
| `DATABASE_URL` | SERVER ONLY, SECRET, REQUIRED | CONFIGURED (verified: Transaction pooler, port 6543) |
| `FRONTEND_URL` | SERVER ONLY, PUBLIC-VALUE, RECOMMENDED | Not required for same-origin deployment; production now warns on boot if missing |
| `ADMIN_PASSWORD` | SERVER ONLY, SECRET, REQUIRED (first boot only) | CONFIGURED locally — value never inspected or printed |
| `EDITOR_SEED_PASSWORD` / `CUSTOMER_SEED_PASSWORD` | SERVER ONLY, SECRET, OPTIONAL | Dev-only fallback; production skips demo seeding entirely |
| `STORAGE_SECRET` | SERVER ONLY, SECRET, REQUIRED | CONFIGURED locally; production refuses to boot without it (verified: throws at import time under `NODE_ENV=production`) |
| `SUPABASE_SERVICE_ROLE_KEY` | SERVER ONLY, SECRET, OPTIONAL (gates durable storage) | MISSING |
| `SUPABASE_STORAGE_BUCKET` | SERVER ONLY, PUBLIC-VALUE, OPTIONAL | MISSING |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` | PUBLIC (VITE_ prefix, correctly) | Declared in `.env.example` but confirmed via full-source grep to have **zero references anywhere in `src/`** — dead configuration, not a security issue since these are meant to be public, but genuinely unused |
| `NODE_ENV` / `VERCEL` / `PORT` | SERVER ONLY, set automatically by the runtime | N/A |

No server secret uses a `VITE_` prefix. No hardcoded credentials found via
repository-wide search.

## Security Boundaries

The Express API is the sole authorization boundary. `DATABASE_URL` connects
as Postgres role `postgres`, confirmed live to have `rolbypassrls: true` —
RLS enablement (added this audit) changes nothing about how the API itself
behaves; it exists purely to protect any other connection path to the same
database. Verified with a `SET LOCAL ROLE anon` test inside a rolled-back
transaction: `anon` now sees 0 rows on `users` and `sessions` (previously
would have seen everything, since RLS was disabled on all 10 tables prior to
this audit).

## Known Technical Debt

- `GET /api/orders` has no server-side pagination (documented, deliberately
  deferred in a prior batch — 4 frontend pages rely on the full list).
- ~54 error responses across the API carry only an `error` message, no
  machine-readable `code` field (the newer auth/rate-limit/storage error
  paths do have one).
- Generic marketing CMS sections (Hero/Services/How-It-Works/About/CTA) have
  no backend — remain code-defined. Correctly out of scope for the 4
  approved additive schema columns.
- No automated test suite exists (`package.json` has no `test` script) —
  all verification in this engagement's history has been ad-hoc Playwright/
  fetch scripts, gitignored, never committed. This is a real gap for
  long-term maintainability, out of scope to fully close in this pass given
  time, but named explicitly rather than glossed over.
