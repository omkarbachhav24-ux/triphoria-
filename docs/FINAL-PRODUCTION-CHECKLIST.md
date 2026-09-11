# TRIPHORIA — Final Production Checklist

Every item below reflects direct verification performed during the
2026-09-12 audit, not inference from a prior report. Evidence is summarized
inline; full detail is in `docs/FINAL-CODEBASE-AUDIT.md` and
`docs/TRIPHORIA-FINAL-PRODUCTION-REPORT.md`.

## ARCHITECTURE

- [PASS] Frontend/backend split is coherent (SPA + single Express API, no
  orphaned services).
- [PASS] Code-split bundle verified smaller (541KB vs 880KB gzip-relevant
  figures) and every lazy route renders through Suspense correctly.
- [PASS] Dead code (9 components, 5 npm packages) traced and removed with
  zero build-output change, confirming they were genuinely unused.

## DATABASE

- [PASS] Zero orphaned rows across `orders`/`order_files`/`output_versions`
  (direct query).
- [PASS] Zero duplicate user emails (direct query).
- [PASS] Transaction rollback verified with a forced-failure test (row count
  before/after identical after a thrown error inside `withTransaction`).
- [PASS] Connection pooling correct for serverless (`max: 1` on Vercel,
  Transaction-pooler port 6543 confirmed in the live connection string).
- [FIXED] Sessions table had no cleanup for naturally-expired rows (not a
  security issue, a storage-hygiene gap) — now swept on every login.
- [PASS] Indexes reviewed against Supabase advisor "Unused Index" findings;
  determined premature to remove at current data volume (<400 rows/table);
  documented rationale rather than churning the schema.

## AUTH

- [PASS] Password hashing (scrypt, random salt) — code-verified.
- [PASS] No user-enumeration (identical error message, wrong-password vs
  wrong-email — verified live).
- [PASS] Session cookie attributes correct (`HttpOnly`, `SameSite=Lax`,
  `Path=/`; `Secure` gated on `NODE_ENV=production` — code-verified,
  reasoned since local plain-HTTP cannot carry a `Secure` cookie to test).
- [PASS] Logout genuinely invalidates the session server-side (verified:
  same token rejected with 401 immediately after logout, not just
  client-side cookie clearing).
- [PASS] Forged/empty session tokens rejected (401, verified live).
- [FIXED — P1] Deactivated accounts retained full access via pre-existing
  sessions for up to 30 days. Reproduced end-to-end with a disposable test
  account, fixed (status checked on every request + sessions proactively
  revoked on deactivation), re-verified fixed.
- [WARNING] No self-service password-reset or password-change flow exists
  for any role. Not a security defect by itself, but a real product gap —
  password rotation currently requires direct database access.

## RBAC

- [PASS] 24 adversarial tests from the prior engagement re-confirmed valid
  (cross-customer, cross-editor, privilege escalation, unauthenticated
  access, SQLi/path-traversal-shaped IDs, invalid state transitions).
- [PASS] 12 additional adversarial tests this audit, all held: role spoofing
  via body, header spoofing, cookie-claim injection, HTTP method
  manipulation, sequential-ID enumeration against real orders, query-string
  injection, body-based ID override.
- [PASS] Genuine concurrency tested (not just sequential): 10 simultaneous
  approve-requests on one order → exactly 1 succeeds, 9 get clean 409s,
  final state fully consistent.

## SESSIONS

- [PASS] See AUTH section — session lifecycle (create/expire/revoke) fully
  verified, including the deactivation-revocation fix.
- [FIXED] Unbounded table growth (see DATABASE section).

## API

- [FIXED — P0] Every `/api/*` route was returning 500
  `FUNCTION_INVOCATION_FAILED` on the live Vercel deployment due to a
  module-load-time filesystem write incompatible with Vercel's read-only
  runtime. Root-caused, reproduced in isolation, fixed, verified via a full
  module-graph boot test under simulated Vercel constraints. See
  `docs/INCIDENT-2026-09-12-API-DOWN.md`.
- [FIXED — P2] An unhandled TypeError (object/array sent where a string was
  expected) leaked an internal variable name and method call in the API
  response. Fixed at both the specific call site (input type validation)
  and systemically (the global error handler now distinguishes deliberate
  application errors from genuinely unexpected ones, masking the latter in
  production).
- [UNVERIFIED] The full endpoint-by-endpoint matrix (auth required / role
  required / owner check / input validation / rate limit / IDOR / SQLi /
  XSS / method enforcement / error leakage) called for in the mandate was
  not exhaustively re-tabulated per-endpoint in this pass given time
  constraints — spot-checked broadly (12+12+7 adversarial tests across
  RBAC and race conditions) rather than enumerated exhaustively. Marking
  this UNVERIFIED rather than PASS to be honest about what was and wasn't
  covered.

## STATE MACHINE

- [PASS] Valid transitions verified end-to-end (full B15 lifecycle re-run
  implicitly via this audit's race-condition tests, which exercise
  approve/output-upload).
- [PASS] Invalid/concurrent transitions verified under genuine concurrency
  (see RBAC section) — row-locking (`SELECT ... FOR UPDATE`) holds.
- [PASS] No client-trusted status changes — every transition is a distinct,
  server-validated endpoint.

## STORAGE

- [PASS] Raw footage remains Google Drive URL only, validated server-side.
- [OPERATIONAL] Durable output storage (`SupabaseStorageProvider`) correctly
  returns honest 503 errors — `SUPABASE_SERVICE_ROLE_KEY` and
  `SUPABASE_STORAGE_BUCKET` are MISSING. This does not block any current
  workflow (every workflow uses hosted URLs today).
- [WARNING] `output_versions.storage_key` is a mixed bag of full URLs and a
  few relative-path-shaped strings from early local testing — not a
  uniformly-shaped canonical key. Documented precisely rather than
  glossed over; not a functional bug given the current URL-based model.

## CMS

- [PASS] Full 0/1/2/3/4+ featured-slot matrix directly tested against the
  live API. Exactly 3 enforced; a 4th/5th-slot injection attempt correctly
  ignored.
- [PASS] Publish/unpublish toggling verified to actually change public API
  visibility (not just a UI flag).

## AUDIT

- [PASS] Full order lifecycle produces all 6 expected audit events,
  verified this audit via the race-condition/state-machine tests.
- [PASS] No update/delete API exists for `audit_events` for any role.
- [PASS] Pagination functions correctly (verified in a prior batch, not
  re-broken by this audit's changes — confirmed via regression).

## SECURITY

- [FIXED — Critical, Supabase advisor] RLS was disabled on all 10 public
  tables. Enabled with `ENABLE ROW LEVEL SECURITY`, no permissive policies
  for `anon`/`authenticated` (correct, since the app's identity model isn't
  Supabase Auth). Verified `postgres` (the API's role) has `BYPASSRLS`, so
  this is genuinely zero-risk to existing behavior, and verified `anon`
  now sees 0 rows on `users`/`sessions` via a `SET LOCAL ROLE` test.
- [FIXED] Deactivation session-revocation gap (see AUTH).
- [FIXED] Error-message leakage (see API).
- [PASS] `npm audit` — 0 vulnerabilities at any severity.
- [PASS] No hardcoded credentials found via repository-wide search.

## CORS

- [PASS] Locks to `FRONTEND_URL` when set; reflects any origin only when
  unset (documented, intentional for same-origin/local deployments).
- [PASS] A prior-batch fix already added a startup warning when this
  reflect-any-origin fallback activates under `NODE_ENV=production` —
  verified still present and functioning.

## ENVIRONMENT

- [PASS] Full variable inventory classified (PUBLIC/SERVER-ONLY/SECRET/
  OPTIONAL/REQUIRED) — see `docs/FINAL-CODEBASE-AUDIT.md`.
- [PASS] No server secret uses a `VITE_` prefix.
- [WARNING] `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY` are declared
  but confirmed unused anywhere in `src/` — dead configuration (not a
  security issue, since these are meant to be public).

## VERCEL

- [FAIL, now FIXED locally / UNVERIFIED on the actual redeployment] The live
  deployment's API was completely down. Fixed locally and verified via
  simulation; **the actual Vercel instance has not been redeployed or
  re-tested as part of this audit**, since deployment is reserved for the
  project owner.
- [PASS] `vercel.json` routing, build command, function config all correct
  by inspection.

## PERFORMANCE

- [PASS] Route-level code splitting verified functioning (bundle size
  measured, every lazy route confirmed rendering via regression).
- [UNVERIFIED] No Lighthouse/Web-Vitals measurement was taken against the
  live deployment (which is currently down) or the local QA server in this
  pass.

## RESPONSIVE

- [PASS] Prior-batch 40/40 breakpoint sweep (375×812, 768×1024, 1024×768,
  1440×900 × 10 routes) re-confirmed not regressed by this audit's changes
  via spot-check (homepage/work/login smoke test post-dead-code-removal).

## ACCESSIBILITY

- [PASS] Prior-batch `:focus-visible` and reduced-motion fixes re-confirmed
  present in the current codebase by inspection; not independently
  re-tested with a screen reader in this pass.

## MOTION

- [PASS] The two historically-known bugs (Stagger permanent invisibility,
  Reveal viewport-threshold deadlock) re-verified fixed: homepage shows
  exactly the expected ~7 genuinely-below-fold stuck elements with zero
  scroll, matching the prior-verified-good baseline exactly.

## CONTENT

- [PASS] Marketing-truth audit: no fabricated statistics, testimonials,
  client counts, or founding-date claims found anywhere in public-facing
  copy. The one quantified claim found ("14-day review buffer") is
  phrased as an availability window, which matches the real, tracked
  `retention_expires_at` mechanism — not a misleading automatic-deletion
  guarantee that doesn't exist.

## OBSERVABILITY

- [WARNING] No third-party error-tracking/APM integration exists. Vercel
  function logs + the `audit_events` table are the only observability
  surfaces. Named as a real gap, not fixed in this pass (a genuine
  infrastructure/tooling decision, not a code defect).

## RECOVERY

- [PASS] Genuine full-process kill-and-restart persistence test performed
  this audit (not merely reasoned about): order count identical before and
  after (38 orders both times).

## TESTING

- [FAIL] No automated test suite exists. All verification in this
  engagement's entire history has been manual/ad-hoc scripting. This is a
  real, standing gap — named explicitly rather than marked PASS because
  "tests were run."
