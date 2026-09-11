# TRIPHORIA — Phase B: Vercel API Deployment Verification

- **Branch:** `fix/express-api-supabase-postgres`
- **Commit inspected:** `1b81d6ac6e86bd28e452f8404063371dfaacae62` (Phase A committed & pushed)
- **This phase changed no source code.** It is a verification pass. One new file: this report.
- **Not done:** merge to `main`, any change to `main`, any change to Vercel **production** settings, any write/delete against **live Supabase data** (beyond the unavoidable auth round-trip — one session row created then deleted, plus the standard append-only `*_LOGIN_SUCCESS` / `USER_LOGOUT` audit rows every login/logout produces).

## Executive result

The **backend half of the chain is proven** against the live Supabase Postgres, running the *exact* Vercel entrypoint module (`api/index.js` → `server/app.js`) with `VERCEL=1` and `NODE_ENV=production`:

```
Browser  →  built dist/ SPA  →  same-origin /api/*  →  api/index.js (Express)  →  pg Pool  →  live Supabase Postgres  →  real 200s
```

**Assertion tallies:** **26 / 26** API + DB + auth + cookie + CORS + Phase-A-regression assertions passed; **10 / 10** browser (Chromium) assertions passed. Zero failed, zero skipped.

**The Vercel PREVIEW deployment itself could not be created or tested** — there is no Vercel access in this environment (no token, no CLI, project not linked) and no preview deployment exists for this branch (`X-Vercel-Error: DEPLOYMENT_NOT_FOUND` on every candidate hostname). That is the sole remaining blocker; everything it depends on is green.

---

## 1. Current deployment architecture (how this branch expects Vercel to deploy)

| Concern | Mechanism (this branch) | File |
|---|---|---|
| Frontend | Vite SPA; `framework: "vite"`, `buildCommand: "npm run build"`, `outputDirectory: "dist"` | `vercel.json`, `vite.config.js` |
| API | **One serverless function** = the whole Express app. `api/index.js` does `import app from '../server/app.js'; export default app;` (`@vercel/node` runs an exported Express app / `(req,res)` handler). | `api/index.js`, `server/app.js` |
| `/api/*` routing | `vercel.json` rewrite `"/api/:path*" → "/api"` (original path preserved for Express) | `vercel.json` |
| `/uploads/*` routing | rewrite `"/uploads/:path*" → "/api"` (served by `express.static` inside the function — ephemeral, see §11) | `vercel.json`, `server/app.js` |
| SPA deep links | rewrite `"/((?!api/|uploads/|assets/|.*\.\w+$).*)" → "/index.html"` | `vercel.json` |
| DB connection | `pg` `Pool` on `process.env.DATABASE_URL`; `max: 1` when `process.env.VERCEL` is set; `ssl:{rejectUnauthorized:false}` for non-local hosts | `server/db.js` |
| Schema/seed | `ensureSchema()` — memoised; runs `server/schema.sql` (bundled via `functions."api/index.js".includeFiles: "server/schema.sql"`) then seeds **only if `users` is empty**; in production seeds **admin only** (demo fixtures gated) | `server/db.js`, `vercel.json` |
| Storage | HMAC-signed presigned tokens (`STORAGE_SECRET`, **no fallback**); binary blobs to local FS (ephemeral) — not used by the SPA | `server/storage.js`, `server/routes/upload.routes.js` |
| Node runtime | `engines.node: ">=22"` → Vercel Node 22.x | `package.json` |
| Function limits | `functions."api/index.js".maxDuration: 30` | `vercel.json` |
| Frontend → API base | **relative `/api/...`** everywhere (`fetch('/api/auth/...', {credentials:'include'})`); **no `VITE_*` / `import.meta.env` API base**, so the SPA automatically targets whatever origin it is served from | `src/context/*.jsx` |

**Static validation:** this configuration is internally consistent and matches the documented `@vercel/node` + Vite pattern. `pg` is in `dependencies` (installed on Vercel); `server/schema.sql` is force-included; the app sets `trust proxy` for correct `Secure` cookies behind Vercel's proxy. Nothing in the config requires SQLite or a writable filesystem for the auth/data path.

## 2. Previous production failure (recap, re-confirmed this phase)

`https://triphoria-azure.vercel.app` is built from **`main`**, which contains **no `api/` directory and no `vercel.json`**. Re-checked now: `GET https://triphoria-azure.vercel.app/api/health` → **HTTP 404**, `content-type: text/plain`, Vercel edge `NOT_FOUND` — the request never reaches a function. Root cause is unchanged: the API-carrying branch (`fix/express-api-supabase-postgres`) has never been deployed. Login on that site shows *"Server communication failure."* because `fetch('/api/auth/login')` receives the edge 404.

## 3. Current branch architecture (Supabase/Postgres implementation)

| Question | Finding |
|---|---|
| Does `server/db.js` use PostgreSQL? | **Yes.** `import pg from 'pg'; export const pool = new Pool({ connectionString: process.env.DATABASE_URL, … })`. All access goes through `query()` / `queryOne()` / `withTransaction()` wrappers over `pool`. |
| Is `DATABASE_URL` required? | **Yes.** No fallback DB. If unset, the pool has an empty connection string and the first query fails; `server/app.js`'s schema-gate middleware then returns `503 {code:'DB_UNAVAILABLE'}` for every request. `server/index.js` (local) `process.exit(1)`s if `ensureSchema()` fails. |
| Is `pg` / a pool used? | **Yes** — `pg@8.x`, a single `Pool`. `pg.types.setTypeParser(20, parseInt)` so BIGINT returns JS numbers. |
| Is Supabase JS used? | **No.** `grep` for `@supabase`, `supabase-js`, `@supabase/ssr`, `createClient`, `createServerClient`, `createBrowserClient` across `server/`, `src/`, `api/`, `package.json` → **zero matches**. Postgres is reached directly over the wire protocol. |
| Which tables are queried? | `users, sessions, orders, order_files, output_versions, storage_lifecycle, audit_events, cms_projects, cms_social, idempotency_records` — exactly the 10 tables defined in `server/schema.sql`. |
| Schema compatible with the live Supabase DB? | **Yes — verified this phase.** The live DB already has all 10 tables populated (see §7); `ensureSchema()` re-runs the idempotent `IF NOT EXISTS` DDL on boot with no error; every route query executed successfully against it (§5, §7, §13). |
| Can the backend start without SQLite? | **Yes.** No `node:sqlite`, `DatabaseSync`, or `better-sqlite3` anywhere in `server/` or `api/`. `node:sqlite` appears only in `scripts/migrate-sqlite-to-postgres.mjs` (an optional one-off, never imported by the app). The Vercel-sim booted with no SQLite present. |

No new database implementation was created; no existing layer was duplicated.

## 3. SQLite non-use (Phase B rule §3) — confirmed

- `data/triphoria.db*` is **git-ignored** and is **not** referenced by `server/`, `api/`, or `vercel.json`.
- The Vercel function does **not** create or open a SQLite file, does **not** depend on local-FS persistence for auth/data, and does **not** store production uploads durably (see §11).
- SQLite is **not** claimed production-ready anywhere.

## 4. Vercel Preview architecture (intended)

```
git push fix/express-api-supabase-postgres
        │  (Vercel Git integration, auto Preview deploy)
        ▼
Preview build:  npm run build  →  dist/            (static)
                api/index.js    →  Node 22 λ        (Express, maxDuration 30s)
        │
        ▼
https://<project>-git-fix-express-api-supabase-postgres-<scope>.vercel.app
   /                → dist/index.html
   /assets/*        → static
   /api/*  /uploads/* → api λ  →  pg Pool  →  Supabase Postgres (Transaction pooler :6543)
   /<anything else> → dist/index.html  (SPA)
```
Preview env vars must be set (§6). Vercel sets `NODE_ENV=production` and `VERCEL=1` for Preview deployments by default — so the Preview runs the exact mode verified below.

## 5. API route results

**Vercel Preview URL:** **not available** — see §14 blocker. Results below are from the **identical entrypoint module** (`api/index.js`, `VERCEL=1`, `NODE_ENV=production`) run locally against the **live Supabase Postgres**, plus the re-confirmed production (`main`) behaviour. The full non-browser battery (this table + §7 DB reads + §8 auth + §9 cookie + §10 CORS + §12 regression) is **26 / 26 assertions passed, 0 failed**.

| Endpoint | Production (`main`, live) | Branch entrypoint `api/index.js` (prod mode) → live Supabase |
|---|---|---|
| `GET /api/health` | **404** (edge `NOT_FOUND`, no function) | **200** — `{"database":"Supabase Postgres","runtime":"vercel-serverless"}` |
| `POST /api/auth/login` (wrong pw) | **404** | **401** — `{"error":"Invalid credentials…"}` |
| `POST /api/auth/login` (valid admin) | **404** | **200** — `{"success":true,"user":{…,"role":"admin"}}` + `Set-Cookie: session_token` |
| `GET /api/auth/me` (with cookie) | **404** | **200** — `{"authenticated":true,"user":{"email":"admin@triphoria.io",…}}` |
| `GET /api/auth/me` (no cookie) | **404** | **200** — `{"user":null,"authenticated":false}` |
| `POST /api/auth/logout` | **404** | **200** — `{"success":true}`; session row deleted; subsequent `/me` → `authenticated:false` |

`GET /api/health` **reaches the real backend and Postgres** in the branch entrypoint. On `main` it does not.

## 6. Environment variable matrix

Never printed: any secret value. `.env` is git-ignored and was not committed.

| Variable | Side | Required | Secret | Local (`.env`) | Vercel Preview | Notes |
|---|---|---|---|---|---|---|
| `DATABASE_URL` | Backend | **Yes** | **Yes** | set (Supabase Transaction pooler `:6543`) | **must set** | Only DB connection. `server/db.js:27`. No fallback. |
| `NODE_ENV` | Backend | Recommended | No | `development` | Vercel forces `production` | Enables `Secure` cookie (`server/auth.js:43`), gates demo seed & `STORAGE_SECRET` hard-fail. |
| `VERCEL` | Backend | auto | No | unset | auto `1` | `server/db.js:43` (`pool.max=1`), `server/app.js:64` (health `runtime`). Do not set manually. |
| `STORAGE_SECRET` | Backend | **Yes** | **Yes** | set | **must set** | HMAC key for presigned tokens. `server/storage.js:20` — **no fallback**; with `NODE_ENV=production` the function **throws at load** if missing. |
| `FRONTEND_URL` | Backend | **Recommended for prod** | No | unset | **should set** to the Preview origin | `server/app.js:28` — when set, CORS is locked to it; when unset, CORS reflects any Origin (see §10). |
| `ADMIN_EMAIL` | Backend | Seed-only | No | `admin@triphoria.io` | optional | `server/db.js:135` — used only when `users` is empty. |
| `ADMIN_PASSWORD` | Backend | Seed-only (prod) | **Yes** | set | optional* | `server/db.js:137` — used only when `users` is empty; a missing value only aborts when seeding a fresh prod DB. *The live DB is already seeded, so this is not consulted by the Preview.* |
| `EDITOR_SEED_PASSWORD` / `CUSTOMER_SEED_PASSWORD` | Backend | Optional | Yes | unset | optional | `server/db.js:189/211` — seed-only overrides. |
| `SEED_DEMO_DATA` | Backend | Optional | No | unset | leave unset | `server/db.js:169` — `"true"` forces demo fixtures even in production. |
| `PORT` | Backend | No | No | `3001` | ignored | `server/index.js:7` — local launcher only; Vercel ignores it. |
| `import.meta.env.DEV` | Frontend | build-time | No | `true` under `vite` dev | `false` in build | `Navbar.jsx:57`, `AuthPage.jsx:180` — gates the dev role-switch ribbon / quick-login buttons; off in any Vercel build. |

### Obsolete / not referenced by code (present only in `.env.example` as future placeholders)
| Variable | Status |
|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | **Unused.** No `src/` file reads them. Reserved for a future browser→Supabase-Storage client. Harmless to set; not required. |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | **Not referenced anywhere in code.** The API talks to Postgres via `DATABASE_URL` only. `SUPABASE_SERVICE_ROLE_KEY` must **not** be added (no consumer; server-secret risk). |

### Required-but-not-yet-set for a Preview
`DATABASE_URL`, `STORAGE_SECRET` — mandatory. `FRONTEND_URL` — strongly recommended (CORS). `NODE_ENV` / `VERCEL` — set by Vercel automatically.

## 7. Database connectivity

Read-only checks against the live Supabase Postgres via the branch `pg` layer (no writes):

| Table | Rows read |
|---|---|
| `users` | 10 |
| `orders` | 8 |
| `audit_events` | 45 |
| `cms_projects` | 5 |
| `cms_social` | 3 |
| `sessions` | 19 |

- Connection succeeds; every route query used by `/api/*` executed successfully (§5, §13).
- The schema in the live DB matches `server/schema.sql` (idempotent DDL re-run on boot with no error).
- `admin@triphoria.io` **exists**: `id=admin-01`, `role=admin`, `status=active`, `password_hash` present (a real scrypt hash — value not read).
- The live DB also still contains the demo editors/customers/orders/CMS rows seeded in earlier phases (dev-mode seed). A *fresh* production DB would instead seed **admin only** (Phase A §P0-5 gate) — verified by code inspection; not re-triggered because the DB is non-empty.

## 8. Authentication result

Against the branch entrypoint (prod mode) → live Supabase:

- `admin@triphoria.io` account **exists** in the database the Preview backend would use (same `DATABASE_URL`).
- Wrong password → **401**. Correct password → **200**, `user.role === "admin"`.
- **No fake admin was created. No development fallback was used as a solution.** The account's *current* password is a value seeded during earlier phases (see §14 blocker #2 — rotation is a Phase C task); it was supplied to the test via an env var and is **not printed** in this report.

## 9. Cookie / session result

From the `Set-Cookie` header on a successful login under `NODE_ENV=production` (token value not printed):

| Property | Result |
|---|---|
| Cookie name | `session_token` — returned ✅ |
| `HttpOnly` | present ✅ |
| `SameSite` | `Lax` ✅ (appropriate for a same-origin SPA + API) |
| `Secure` | present ✅ (because `NODE_ENV=production`) |
| `Path` | `/` ✅ |
| `Max-Age` | `2592000` (30 days) ✅ |
| Sent on later calls | `GET /api/auth/me` with the cookie → **200 authenticated**; without → `authenticated:false` ✅ |
| Session recognised | `/api/auth/me` resolves `req.user` from the token via `sessions ⋈ users` with `expires_at::timestamptz > now()` ✅ |
| Logout invalidates | `POST /api/auth/logout` → **200**; the `sessions` row is **deleted** from Postgres (verified by direct read); subsequent `/me` with the same cookie → `authenticated:false` ✅ |

Browser (Chromium, same-origin against the local prod-equivalent): login → **200**, redirect to `/admin/dashboard`, cookie round-trips, all `/api/*` calls 200.

## 10. CORS result

- **Audit finding is still present:** with `FRONTEND_URL` unset, `server/app.js` uses `cors({ origin: true, credentials: true })`, which **reflects any request Origin**. Verified: `GET /api/health` with `Origin: https://unrelated.example` → `Access-Control-Allow-Origin: https://unrelated.example`, `Access-Control-Allow-Credentials: true`.
- It is **not** `*` (that would be invalid with credentials).
- **No code change made** (not required for Preview testing, which is same-origin). **Production/Preview requirement:** set `FRONTEND_URL` to the exact deployment origin (e.g. `https://<preview-host>.vercel.app`); the code already locks CORS to it when set. A future hardening (Phase C) could additionally warn/refuse when `NODE_ENV=production` and `FRONTEND_URL` is unset.

## 11. Storage result

| Aspect | Current implementation |
|---|---|
| Raw customer footage | **External URL only** — validated `drive.google.com` link stored in `orders.google_drive_url`. No upload, no Google API. |
| Editor deliverables | **Metadata + a hosted URL** the editor pastes (Phase A made this a required, non-prefilled "Hosted Deliverable URL" and blocks sample hosts). Stored as `output_versions.storage_key`. |
| Signed-token system | HMAC-SHA256 presigned upload/download tokens, 15-min TTL (`server/storage.js`). `STORAGE_SECRET` required, **no fallback**. |
| Binary upload path (`PUT /api/storage/upload`) | Writes to local FS `uploads/…` — **ephemeral on Vercel**, and **not called by the SPA** (only `test/verify_backend.js`). |
| Download (`GET /api/storage/download`) | Streams a local blob if present, else **302-redirects to the `https://` URL** (Phase A: https-only) after the signing step verified the key belongs to an authorized order. |

**No attempt was made to persist `/uploads` on Vercel.** Durable production media storage (S3 / Supabase Storage) is **not implemented** → **Phase C/D blocker** (documented, not solved here — no minimal implementation exists to extend).

## 12. Security regression results (Phase A intact)

| Check | Result |
|---|---|
| `GET /api/auth/editors` — unauthenticated | **401** ✅ |
| `GET /api/auth/editors` — customer session | **403** ✅ |
| `GET /api/auth/editors` — editor session | **403** ✅ |
| `GET /api/auth/editors` — admin session | **200** ✅ (browser-confirmed) |
| Download authorization enforced | `GET /api/storage/authorize-download` no session → **401** ✅; `orderId` now required + order-ownership + asset-membership checks present in code ✅ |
| Upload ownership enforced | `authorize-upload` rejects a concrete `orderId` the caller doesn't own (code present) ✅ |
| HTTPS-only redirect | `GET /api/storage/download` follows only `https://` targets (code present) ✅ |
| `STORAGE_SECRET` no fallback | Prod-sim booted **only because `.env` provides it**; `server/storage.js` throws at load under `NODE_ENV=production` when missing; no hardcoded key remains ✅ |
| Demo data not seeded in production | `server/db.js:168` gate: `NODE_ENV !== 'production' || SEED_DEMO_DATA==='true'` → prod seeds admin only ✅ (code) |
| Fake media not used | Built bundle contains no `BigBuckBunny` / `commondatastorage` / seed passwords (grep) ✅ |

## 13. Browser results

Chromium against the local prod-equivalent (built `dist/` + `api/index.js` in prod mode), **not the Vercel Preview** — **10 / 10 assertions passed**:

- `/login` renders; on load the SPA calls **`GET /api/auth/me` → 200** on the same origin (it does **not** hit a missing `/api` route — it can't, there is no hardcoded base).
- Admin login in the browser → **`POST /api/auth/login` → 200**, redirect to `/admin/dashboard`.
- `/admin/audit-logs` → renders (H1 "…Audit Trail"), **`GET /api/audit-logs` → 200**, **54 audit rows** shown, **no runtime error** (Phase A P0-2 holds in a real browser).
- `/admin` dashboard → renders ("Production Pipeline Control").
- **Every `/api/*` request during the whole session returned 200** (44 calls: `auth/me`, `cms/*`, `audit-logs`, `auth/editors`, `orders`). No `0` / `404` / `5xx`. No significant console/page errors.

## 14. Remaining blockers

1. **No Vercel access in this environment (BLOCKER — external).** No `VERCEL_TOKEN`, no `vercel` CLI (npx refuses to auto-install), project not linked (`.vercel/` absent). No Preview deployment exists for the branch — every candidate hostname returns `X-Vercel-Error: DEPLOYMENT_NOT_FOUND`. **I cannot create the Preview or test the Preview URL.** Requires the account owner to either (a) provide a scoped `VERCEL_TOKEN` + project/org identifiers, or (b) connect the GitHub repo in the Vercel dashboard and enable branch/preview deployments, then share the Preview URL.
2. **Live admin/editor/customer passwords are dev-seeded values.** `admin@triphoria.io` exists and works, but its password (and `marcus@…`, `alex@…`) are the values seeded in earlier phases. Not printed here. **Phase C:** rotate via a one-off `UPDATE` with a fresh scrypt hash, or wipe the seeded `users` so a `NODE_ENV=production` boot re-seeds admin-only from `ADMIN_PASSWORD`.
3. **`FRONTEND_URL` unset ⇒ CORS reflects any Origin.** Not a code bug (the code honours `FRONTEND_URL`); it must be set as a Preview/production env var. Optional Phase C hardening: fail/warn when prod + unset.
4. **No durable production media storage.** `/uploads` is ephemeral on Vercel; deliverables are URLs. Fine for the current metadata-only model, but true file hosting (S3 / Supabase Storage) is a **Phase C/D** item.
5. **Live Supabase DB still carries demo fixtures** (demo editors/customers/orders/CMS) from earlier dev-mode seeding. The Phase A prod-seed gate only affects a *fresh* DB. Decide in Phase C whether to keep, prune, or reset.
6. **`vite.config.js` dev proxy** still points `/api` → `127.0.0.1:3001` — correct for local dev, irrelevant to Vercel (dev-server only), no action needed.

## 15. Exact recommendation for Phase C

**Do the Vercel Preview deploy + acceptance test (this is the only thing Phase B could not finish).**

1. **Connect / deploy** (owner action): in the Vercel dashboard, add the GitHub repo (or `vercel link` locally with a token). Keep **Production Branch = `main`** (do not change). Ensure branch/Preview deployments are enabled. Trigger a Preview from `fix/express-api-supabase-postgres` (already pushed at `1b81d6a`).
2. **Preview env vars** (Preview scope; never commit): `DATABASE_URL` (Supabase Transaction pooler, password URL-encoded), `STORAGE_SECRET` (fresh 48-byte random), `FRONTEND_URL` = the Preview origin. `NODE_ENV`/`VERCEL` are automatic. `ADMIN_PASSWORD` optional (DB already seeded).
3. **Acceptance test against the Preview URL** (must pass — build success is not acceptance):
   - `GET /api/health` → 200 `{"database":"Supabase Postgres","runtime":"vercel-serverless"}`
   - `POST /api/auth/login` (existing admin) → 200 + `Set-Cookie: session_token; HttpOnly; Secure; SameSite=Lax`
   - `GET /api/auth/me` (cookie) → authenticated; `POST /api/auth/logout` → 200; `/me` after → `authenticated:false`
   - `GET /api/auth/editors`: no-cookie 401 / customer 403 / editor 403 / admin 200
   - Browser: `/login` → sign in → `/admin/dashboard`, `/admin/audit-logs` renders with rows; Network shows all `/api/*` = 200 on the Preview origin.
4. **Then** rotate the seeded passwords (blocker #2), set `FRONTEND_URL` correctly, and decide on the demo-data cleanup (blocker #5).
5. **Defer** durable media storage to Phase D unless required sooner.

All backend prerequisites for the above are verified green in this phase; only the Vercel platform step remains.

---

## Gates

```
BUILD:                 PASS   (npm run build → exit 0; dist/assets/index-CcMub85t.js 911.92 kB / 230.02 kB gz)
LINT:                  PASS   (oxlint → exit 0; 0 errors, 109 pre-existing style warnings)
VERCEL PREVIEW:        BLOCKED (no Vercel access; no preview deployment exists — DEPLOYMENT_NOT_FOUND)
/api/health:           PASS + 200   (branch api/index.js, prod mode → live Supabase)   |  main/prod: FAIL + 404
/api/auth/login:       PASS + 401 (bad) / 200 (valid)                                  |  main/prod: FAIL + 404
/api/auth/me:          PASS + 200 (authenticated w/ cookie; authenticated:false without)|  main/prod: FAIL + 404
/api/auth/logout:      PASS + 200   (session row deleted; /me after → false)           |  main/prod: FAIL + 404
DATABASE:              PASS   (pg → live Supabase; users/orders/audit/cms/sessions all readable; schema matches)
AUTH:                  PASS   (admin@triphoria.io exists; wrong pw 401; valid 200 role=admin; no fake admin)
COOKIE:                PASS   (HttpOnly, SameSite=Lax, Secure in prod, Path=/, Max-Age; round-trips; logout invalidates)
CORS:                  CONDITIONAL — reflects any Origin while FRONTEND_URL is unset; must set FRONTEND_URL for Preview/prod (not "*")
PHASE A REGRESSION:    PASS   (editors 401/403/403/200; download-auth 401; STORAGE_SECRET no-fallback; demo-seed gated; no fake media in bundle)
PRODUCTION CHANGED:    NO
MAIN CHANGED:          NO
LIVE SUPABASE DATA CHANGED:  NO (schema-only re-check; auth round-trip created+deleted one session row and the standard login/logout audit rows — no orders/users/CMS writes)
FINAL STATUS:          BLOCKED — pending a Vercel Preview deployment (external: needs account access). Every backend prerequisite for that deploy is verified PASS.
```
