# TRIPHORIA — Phase A Production-Blocker Hardening Report

- **Branch:** `fix/express-api-supabase-postgres` (not merged to `main`)
- **Base commit:** `5ebbccc4a165d45acd47c7b7fd026bd2f802e0ca`
- **Scope:** P0-1 … P0-5 from the codebase audit + related security issues in the same areas.
- **Out of scope (unchanged):** Supabase migration, UI redesign, new frontend libraries, RBAC model, feature set.
- **Verification stack:** built SPA + real Express API served same-origin on a local port against the **live Phase-1 Supabase Postgres** (via the `DATABASE_URL` in the local, git-ignored `.env`), driven by Chromium via Playwright, plus `test/verify_backend.js` and targeted `curl`. No Supabase data was mutated beyond the normal test-account/audit rows those checks create.

## Result summary

| ID | Issue | Status |
|----|-------|--------|
| P0-1 | `GET /api/auth/editors` unauthenticated roster exposure | **Fixed & verified** |
| P0-2 | `AuditLogsPage` runtime crash (`logs` vs `auditLogs`) | **Fixed & verified** |
| P0-3 | Editor onboarding reads async `addEditor()` synchronously | **Fixed & verified** |
| P0-4 | Hardcoded `STORAGE_SECRET` fallback | **Fixed & verified** |
| P0-5 | Fake/default media (Big Buck Bunny) in the real workflow | **Fixed & verified** |
| R-1 | `authorize-download` IDOR (skipped RBAC when `orderId` omitted) | **Fixed & verified** |
| R-2 | `authorize-upload` issued tokens for orders the caller doesn't own | **Fixed & verified** |
| R-3 | `/api/storage/download` open redirect (`http:` + `https:`) | **Hardened (https-only)** |
| R-4 | Weak auto-generated editor password (`TP-` + 24 bits) | **Fixed & verified** |
| R-5 | Demo fixtures (fake people/orders/deliveries) seeded into any DB | **Fixed (prod now admin-only)** |

`npm run lint` → **exit 0** (warnings only, all pre-existing style noise; 0 error-severity).
`npm run build` → **exit 0** (`dist/assets/index-*.js` 911.92 kB / 230.02 kB gzip).
`test/verify_backend.js` against the patched API + live Supabase → **24 / 24 passed** (no regression).

> **Not claimed:** production readiness of the deployed site. Phase A verifies the fixes on a local same-origin stack against the real database. The live Vercel deployment is still built from `main` and remains a separate blocker (see `CODEBASE-MAP.md` §30 #1 / `docs/VERCEL-AUTH-DIAGNOSTIC` follow-ups). No merge, no deploy performed.

---

## P0-1 — Protect `GET /api/auth/editors`

**Root cause.** The route was registered with no middleware: `authRouter.get('/editors', async (req, res) => …)` ([server/routes/auth.routes.js](../server/routes/auth.routes.js)). Any visitor could `GET /api/auth/editors` and receive the full staff roster — `id`, `name`, `email`, `specialty`, `status`, and live `activeProjects` workload counts. The frontend `AuthContext.refreshEditors()` also called it for **every** authenticated role on mount, even though only the three admin pages consume `editors`.

**Fix.**
- Server: added `requireRole('admin')` to the route. Unauthenticated → `401 {code:'UNAUTHORIZED'}`; non-admin session → `403 {code:'FORBIDDEN'}`.
- Client: `AuthContext.refreshEditors()` now returns early (`setEditors([])`) unless `user.role === 'admin'`, so non-admin sessions never issue the request.

**Files changed.**
- `server/routes/auth.routes.js` — `authRouter.get('/editors', requireRole('admin'), …)`.
- `src/context/AuthContext.jsx` — role guard at the top of `refreshEditors`.

**Security impact.** Closes an unauthenticated PII/enumeration disclosure (staff names, work emails, workload). No RBAC weakening — every legitimate consumer of the roster is an admin surface. No behavioural change for admins.

**Verification.**
- `curl` (no cookie) → `HTTP 401`. Customer session cookie → `HTTP 403`. Editor session cookie → `HTTP 403`. Admin session cookie → `HTTP 200` with the roster JSON.
- Browser (Playwright): logged in as `alex@creator.com`, `page.request.get('/api/auth/editors')` → **403**, response body contains **no** `marcus@triphoria.io` / `Marcus Vance`. Fresh context, no session → **401**.
- Regression: `verify_backend.js` still 24/24 (it authenticates as admin before any editor-roster use).

---

## P0-2 — Fix `AuditLogsPage` runtime crash

**Root cause.** [src/pages/admin/AuditLogsPage.jsx](../src/pages/admin/AuditLogsPage.jsx) did `const { logs } = useAuditLog()`, but [src/context/AuditLogContext.jsx](../src/context/AuditLogContext.jsx) exposes the array as **`auditLogs`**. `logs` was therefore `undefined`, and `logs.filter(...)` (line 10) / `logs.length` (option label) threw `TypeError: Cannot read properties of undefined (reading 'filter')` → `/admin/audit-logs` white-screened for every admin. The API (`GET /api/audit-logs`) was fine.
A second, non-crashing mismatch: the row cell read `log.entityType`, but the endpoint aliases the column as `entity`, so the "Entity / id" cell silently dropped the entity type.

**Fix.**
- `const { auditLogs: logs = [] } = useAuditLog();` — alias to the real key, default to `[]` so a not-yet-loaded context can never throw.
- Entity cell now reads `log.entity || log.entityType` (works with the API's `entity` alias; keeps back-compat with the optimistic local shape).

No UI/markup/behaviour change beyond removing the crash and restoring the entity label.

**Files changed.** `src/pages/admin/AuditLogsPage.jsx` (2 lines).

**Security impact.** Restores the admin's only audit/compliance surface. Indirect security value: audit review was previously impossible in-app.

**Verification (browser).**
- Logged in as `admin@triphoria.io`, navigated to `/admin/audit-logs`:
  - H1 renders: *"Operations & State Mutation Audit Trail"*.
  - Table header (`Timestamp (UTC)` …) visible.
  - **39 rows** rendered from `GET /api/audit-logs`.
  - Playwright `pageerror` / `console.error` listeners captured **no** `Cannot read propert…` / `is not a function` errors.
  - Typing `LOGIN` in the search box filters to 20 matching rows (filter path exercised).

---

## P0-3 — Fix editor onboarding credentials flow

**Root cause.** [src/pages/admin/EditorsManagementPage.jsx](../src/pages/admin/EditorsManagementPage.jsx) `handleOnboardSubmit` did `const created = addEditor(newEditorForm, user?.email)` and then read `created.name / .email / .password / .id` **synchronously**. `addEditor` in `AuthContext` is `async` (it `POST`s `/api/auth/editors` and resolves to the created editor), so `created` was a `Promise`: the "credentials created" banner rendered blank values and `setSelectedEditor(created)` stored a Promise. The onboarding **API call succeeded** — the generated password was in its response — but the admin never saw it. (Two sibling handlers, `reassignEditor(…, user)` and `deleteEditor(id, user?.email)`, also passed dead extra arguments.)

**Fix.**
- `handleOnboardSubmit` is now `async` and `await`s `addEditor(newEditorForm)`; wrapped in `try/catch/finally` with an `isOnboarding` flag that disables the submit button while the request is in flight. `addEditor` already surfaces its own error to the admin, so the `catch` is intentionally silent.
- Dropped the ignored trailing args from `addEditor`/`reassignEditor`/`deleteEditor` call sites; removed the now-unused `user` from the `useAuth()` destructure.

**Intended secure credential flow (unchanged, confirmed correct).**
- The one-time plaintext password is generated client-side (`generateEditorPassword()` → `TP-XXXX-XXXX`, 31-char alphabet) or server-side as a fallback (see R-4), hashed with `scrypt` in `server/db.js` `hashPassword()`, and **only the `salt:hex` hash is written to `users.password_hash`**.
- It is returned **once**, in the `201` body of `POST /api/auth/editors`, which is `requireRole('admin')` and served over TLS in production, so the admin can hand it to the editor out-of-band (there is no email service).
- It is **never logged**: the `EDITOR_ONBOARDED` audit `details` contains only the editor's name and email; there is no `console.*` of the password anywhere on client or server.

**Files changed.** `src/pages/admin/EditorsManagementPage.jsx`.

**Security impact.** No new exposure. Removes a broken flow that could push admins toward insecure workarounds (re-issuing passwords, sharing over chat). Password is still hash-only at rest; response disclosure is the deliberate, authenticated, one-time delivery channel.

**Verification.**
- API (`curl`): non-admin `POST /api/auth/editors` → `403`. Admin, valid → `201` with `editor.password` (`TP-4VgiCxWFw3BK`) present in the response body only.
- DB: queried `users.password_hash` for the newly created editor → `^[0-9a-f]{32}:[0-9a-f]{128}$` (scrypt `salt:hex`, 161 chars); `hash === plaintext` → **no**; `hash.includes(plaintext)` → **no**.
- Login with the generated password → `HTTP 200`, `role: editor` (proves the hash round-trips through `verifyPassword`).
- Browser (Playwright): onboarded `ui-onboard-<ts>@triphoria.io` through the admin modal. The credentials banner appeared and **showed the real email and the exact password from the API response**; the page contained **no** `[object Promise]` and threw **no** `pageerror`. Generated password length 12 (`TP-XXXX-XXXX`).

---

## P0-4 — Remove the hardcoded `STORAGE_SECRET` fallback

**Root cause.** [server/storage.js](../server/storage.js) had `const STORAGE_SECRET = process.env.STORAGE_SECRET || 'triphoria-storage-hmac-secret-vault-2026';`. If the env var was unset, presigned upload/download tokens were signed with a **committed, guessable HMAC key**, so anyone could forge valid `/api/storage/upload` and `/api/storage/download` tokens.

**Fix (no replacement secret).**
- `const STORAGE_SECRET = process.env.STORAGE_SECRET;` — no `||`.
- At module load: if unset **and** `NODE_ENV === 'production'` → `throw new Error('[storage] STORAGE_SECRET is required and has no fallback.')`. Because `storage.js` is in the import graph of `server/app.js` → `api/index.js`, this makes the whole API refuse to boot in production without the secret (fail-closed).
- Outside production, the module loads with a warning, and a `requireSecret()` guard at the top of `generatePresignedUpload`, `verifyStorageToken`, and `generatePresignedDownload` throws `{status:503, code:'STORAGE_NOT_CONFIGURED'}` on any storage-token operation until the secret is set. `verifyStorageToken` calls the guard **before** its `try/catch` so a missing secret surfaces as 503, not as a generic "Malformed token".
- `.env.example` updated: `STORAGE_SECRET` marked REQUIRED / no fallback, with a `crypto.randomBytes(48).toString('base64url')` generator hint.

**Files changed.** `server/storage.js`, `.env.example`.

**Security impact.** Eliminates token forgery via a shipped key. A misconfigured production deploy now fails visibly instead of silently accepting forged storage tokens.

**Verification.**
- `NODE_ENV=production`, `STORAGE_SECRET` unset → `import('./server/storage.js')` **throws at load** (`STORAGE_SECRET is required and has no fallback`).
- `NODE_ENV=production`, `STORAGE_SECRET` unset → `import('./server/app.js')` **load blocked** (same error) → API does not come up.
- `NODE_ENV=development`, `STORAGE_SECRET` unset → module loads (warns); `generatePresignedDownload(...)` throws `STORAGE_NOT_CONFIGURED` / HTTP 503.
- `STORAGE_SECRET` set (verification `.env`) → `POST /api/storage/authorize-upload` (admin) → `HTTP 200`, token issued; `verify_backend.js` presigned-upload + binary-stream assertions still pass.

---

## P0-5 — Remove fake/default media from the real workflow

**Root cause.** "Deliver a cut" and "add portfolio work" forms were pre-filled with a sample video so a submission looked real without anyone entering a real asset:
- [src/pages/editor/EditorDashboard.jsx](../src/pages/editor/EditorDashboard.jsx) — `outputForm.downloadUrl` defaulted to `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4` (in both the initial state and `openUploadModal`), and `outputForm.notes` defaulted to a fabricated *"Initial master cut exported with full audio mix and primary color grade."* Submitting the modal unchanged stored that URL as `output_versions.storage_key` and flipped the order to `Review` — i.e. "a video was delivered" when nothing was.
- [src/pages/admin/CMSManagerPage.jsx](../src/pages/admin/CMSManagerPage.jsx) — new-portfolio and new-social forms defaulted `videoUrl`/`playbackUrl`/`thumbnail` (and `url`) to the same sample clip / stock image, so unedited "studio work" published as Big Buck Bunny.
- [src/data/initialData.js](../src/data/initialData.js) via [server/db.js](../server/db.js) `seedInitialData()` — the seed inserted 5 fake orders, 2 fake "authoritative" `output_versions` and 5 portfolio items pointing at sample CDN clips into **every** database, production included.

**Fix.**
- **Editor deliverable form:** `downloadUrl` and `notes` now default to `''`. The field is relabelled **"Hosted Deliverable URL"** with helper text *"Paste the actual link to the exported master. TRIPHORIA stores this reference, not the video file."* Added `isRealDeliverableUrl()` — `handleUploadSubmit` blocks submission (inline error, no state change) when the URL is empty, non-`http(s)`, or on a known throwaway host (`commondatastorage.googleapis.com`, `sample-videos.com`, `test-videos.co.uk`). `<input type="url" required>` still enforces a syntactically valid URL.
- **CMS forms:** `videoUrl`/`playbackUrl`/`thumbnail`/`url`/`likes` defaults cleared to `''` in both `projectForm` and `socialForm` (initial state and the `openNew…Modal` resets). Fields are already `required`.
- **Seed:** `seedInitialData()` now seeds the **admin only** when `NODE_ENV === 'production'` (unless `SEED_DEMO_DATA=true`). Editors, customers, orders, portfolio, and social demo fixtures — and therefore every sample-video "delivery" — are only created outside production. Non-prod behaviour (local dev, CI, Playwright) is unchanged, so the demo dataset and existing tests are intact.

**Files changed.** `src/pages/editor/EditorDashboard.jsx`, `src/pages/admin/CMSManagerPage.jsx`, `server/db.js`.

**Security / integrity impact.** The order/portfolio record can no longer assert a deliverable that doesn't exist by default; an editor must paste the real hosted master link. A fresh production database contains no placeholder people, fake orders, or fake "authoritative" cuts. (The already-seeded live Supabase DB is unaffected because the seed only runs when `users` is empty — documented under "Residual"/Follow-ups.)

**Verification.**
- Built bundle: `grep -o 'BigBuckBunny|commondatastorage|ElephantsDream|adminpgt|editorpgt|clientpgt' dist/assets/*.js` → **no matches**.
- Browser (Playwright): editor `marcus@triphoria.io` → `/editor/dashboard` → open "Upload Output Cut" on an In-Progress order:
  - deliverable URL input value `=== ''` (no prefill), notes textarea value `=== ''`, label reads **"Hosted Deliverable URL"**.
  - Typed the Big Buck Bunny URL and clicked Submit → inline error *"Sample or placeholder links are not accepted"* shown, modal stayed open, order status unchanged.
  - No `pageerror` on the dashboard.
- `NODE_ENV=production` seed path: `seedInitialData` logs *"Production seed: admin only. Demo fixtures skipped."* and inserts only the admin + one `DATABASE_INITIALIZED` audit row (confirmed by reading the function; live prod DB not re-seeded because it is already populated).
- Regression: `verify_backend.js` 24/24 (runs under `NODE_ENV=development`, demo data present).

---

## Related security issues found & addressed (same areas)

### R-1 — `GET /api/storage/authorize-download` IDOR
**Root cause.** RBAC ran only `if (orderId)`, and even then `if (order && …)` skipped the check when the order wasn't found. Omitting `orderId` let **any authenticated user** mint a 15-minute signed download link for an **arbitrary `storageKey`** (another customer's deliverable URL, a guessable `outputs/<id>/master.mp4` path, etc.).
**Fix** ([server/routes/upload.routes.js](../server/routes/upload.routes.js)): `orderId` is now required (`400` if missing); the order must exist (`404`); the caller must be admin / its client / its assigned editor (`403`); and the requested `storageKey` must actually be an asset of that order (`SELECT … FROM output_versions … UNION ALL … FROM order_files …`, else `404`).
**Impact.** Removes cross-order deliverable access. The frontend always passes `orderId` (`OrderContext.trackDownload`), so no legitimate flow breaks. Not covered by `verify_backend.js`; regression suite still 24/24.

### R-2 — `POST /api/storage/authorize-upload` missing ownership check
**Root cause.** Any authenticated user could request an upload token for any `orderId`, writing into `orders/<orderId>/raw/…` on the (ephemeral) local FS.
**Fix.** When `orderId` is a concrete id (not the pre-order sentinel `'PENDING'`), the order must exist and belong to the caller (admin / client / assigned editor), else `404` / `403`. `'PENDING'` (order-creation intake) still allowed.
**Impact.** Low real-world exposure (endpoint unused by the UI, FS ephemeral, 5 GB cap) but the boundary now matches the download side. `verify_backend.js` uses an order the client owns → still passes.

### R-3 — `/api/storage/download` open redirect
**Root cause.** `res.redirect(storageKey)` followed any `http://` **or** `https://` value embedded in a (previously forgeable, see P0-4) token.
**Fix.** Redirect only for `https://` targets, and the comment records that R-1 now guarantees the key belongs to an order the requester is authorized for before any token is signed.
**Impact.** Narrows the redirect surface; combined with P0-4 + R-1 the target is constrained to an admin/editor-entered deliverable link on an authorized order.

### R-4 — Weak auto-generated editor password
**Root cause.** Server fallback was `TP-${crypto.randomBytes(3).toString('hex')}` ≈ 24 bits of entropy (used when an admin calls the API without supplying a password).
**Fix** ([server/routes/auth.routes.js](../server/routes/auth.routes.js)): fallback is now `TP-${crypto.randomBytes(9).toString('base64url')}` (~72 bits). A supplied password shorter than 10 characters is rejected with `400`. The UI's `generateEditorPassword()` (`TP-XXXX-XXXX`, 12 chars) satisfies the check.
**Verification.** `curl` admin `POST /api/auth/editors` with `"password":"short"` → `400 {"error":"Editor password must be at least 10 characters."}`. Without a password → `201` with a 14-char `TP-…` value.

### R-5 — Demo fixtures seeded into production
Covered under **P0-5** (seed gated to non-production). Also removes the previously-flagged risk of production editor/customer accounts existing with dev-fallback passwords (`editorpgt` / `clientpgt`).

---

## Observations logged (no change made this phase)

| Area | Note | Recommendation |
|---|---|---|
| `authMiddleware` accepts `Authorization: Bearer <token>` | No frontend uses it; broadens replay surface (no origin binding). | Consider removing header auth, or scoping it to a documented API-client use case, once consumers are known. Not changed here to avoid removing an auth path without a consumer analysis. |
| `POST /api/auth/register` | No rate limiting, no password-strength check, no email verification; anyone can create `customer` accounts. | Add a minimum-length check + basic rate limiting in a follow-up. Left untouched to avoid altering the public signup flow under a hardening pass. |
| CORS | `origin: true` (reflects any origin) with `credentials: true` when `FRONTEND_URL` is unset. | Moot for same-origin Vercel, but **set `FRONTEND_URL`** in any split-origin deployment. |
| `sessions` / `idempotency_records` | No TTL sweeper; grow unbounded. | Add a periodic cleanup (cron or on-boot) in a later phase. |
| One-time editor password in the `201` body | Deliberate (no email service). Over TLS, admin-only, never logged, hash-only at rest. | Replace with an email invite / reset-link flow when an email provider is added (that is Supabase-migration territory — explicitly deferred). |

---

## Commands run

```
npm run lint    # exit 0 — warnings only (pre-existing unused-import / unused-catch style), 0 errors
npm run build   # exit 0 — dist/assets/index-BIy0ceSy.js 911.92 kB (gzip 230.02 kB)
node --check server/{app,db,storage}.js server/routes/{auth,upload}.routes.js   # all OK

# same-origin verification server (built SPA + real API) on :3005, DATABASE_URL = live Supabase
node --env-file=.env _e2e-server.mjs

node _verify.js            # test/verify_backend.js retargeted to :3005 → 24 PASSED, 0 FAILED
curl … (P0-1 / P0-3 / P0-4 API assertions — all as expected)
node _phaseA_browser.mjs   # Chromium: P0-2, P0-1(browser), P0-5 → 14 passed, 0 failed
node _phaseA_p03.mjs       # Chromium: P0-3 onboarding banner → 6 passed, 0 failed
```
All temporary files (`_e2e-server.mjs`, `_phaseA_browser.mjs`, `_phaseA_p03.mjs`) were removed after the run; no test scaffolding is committed.

## Files changed (10)

| File | Issues |
|---|---|
| `server/routes/auth.routes.js` | P0-1 (route guard), R-4 (password entropy + min-length) |
| `src/context/AuthContext.jsx` | P0-1 (client-side roster guard) |
| `src/pages/admin/AuditLogsPage.jsx` | P0-2 |
| `src/pages/admin/EditorsManagementPage.jsx` | P0-3 |
| `server/storage.js` | P0-4 |
| `.env.example` | P0-4 (doc) |
| `src/pages/editor/EditorDashboard.jsx` | P0-5 |
| `src/pages/admin/CMSManagerPage.jsx` | P0-5 |
| `server/db.js` | P0-5 / R-5 (demo-seed gate) |
| `server/routes/upload.routes.js` | R-1, R-2, R-3 |

Not modified: RBAC middleware, session/cookie model, order state machine, `src/data/initialData.js`, any unrelated feature. No `.env` committed; no secret committed (verified: `.env` is git-ignored; the diff contains only placeholder strings in `.env.example`).

## Residual / follow-ups (not Phase A)

1. **Deploy blocker unchanged** — production `triphoria-azure.vercel.app` is still built from `main` (no `api/`, no `vercel.json`); `/api/*` → edge 404. Phase A does not merge or deploy.
2. **Live Supabase DB already seeded** with the demo dataset (from earlier phases). The P0-5 seed gate only affects a *fresh* database. If a clean production dataset is wanted, the seeded `users` must be cleared (then a `NODE_ENV=production` boot re-seeds admin-only), or the demo rows deleted manually.
3. **Admin/editor passwords in the live DB** are still the dev fallbacks from the earlier seed run — rotate them (one-off `UPDATE` with a fresh `scrypt` hash) or wipe + re-seed.
4. Observations table items (Bearer auth, register hardening, session TTL, CORS `FRONTEND_URL`).
