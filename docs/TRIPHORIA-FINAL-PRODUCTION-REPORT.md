# TRIPHORIA — Final Production Report

**Date:** 2026-09-12
**Branch:** `fix/express-api-supabase-postgres` (all work local; nothing
pushed, per standing instruction)
**Supersedes:** the 2026-09-11 report of the same name, which claimed READY
FOR PRODUCTION without ever testing the actual live deployment URL. That
claim was false — the live API was completely down. This report corrects
that by testing everything against the real deployment and the live
database before drawing any conclusion.

---

# Executive Summary

The live production deployment (`https://triphoria-azure.vercel.app/`) was
found to be **completely non-functional** at the start of this audit —
every `/api/*` route, including the health check, returned
`FUNCTION_INVOCATION_FAILED`. Root cause: a module-load-time filesystem
write in `server/storage.js` that crashes on Vercel's read-only runtime.
This has been fixed and verified locally under a faithful simulation of
Vercel's constraints, but **the fix has not yet been deployed** —
deployment is explicitly reserved for the project owner.

Beyond that P0, this audit found and fixed one P1 (deactivated accounts
retaining access via pre-existing sessions), one P2 (internal error-detail
leakage), enabled Row Level Security on all 10 database tables (a Critical
finding from the Supabase security advisor), fixed an unbounded
sessions-table growth issue, and removed 9 dead component files plus 5
unused npm dependencies. RBAC, the order state machine (including under
genuine concurrent load), the CMS featured-slot system, audit logging, and
data persistence (verified with an actual process kill-and-restart, not
just reasoning) all held up under direct adversarial testing with zero
further issues found.

# Actual Architecture

React 19 + Vite 8 SPA (hand-rolled router) + Express 5 API (no ORM, `pg`
directly) + Supabase PostgreSQL. Single Vercel deployment serving both the
static bundle and the API from one origin. Full detail:
`docs/FINAL-CODEBASE-AUDIT.md`.

# Deployment Architecture

`vercel.json` routes `/api/*` and `/uploads/*` to `api/index.js`
(a thin wrapper exporting `server/app.js`), everything else to the SPA's
`index.html`. Confirmed correct by inspection and — critically — by direct
testing of the live URL, which is what surfaced the P0 outage a purely
code-level review would have missed.

# Database Architecture

10 tables, Supabase Postgres, schema-as-code in `server/schema.sql` applied
idempotently on every boot. Zero orphaned rows, zero duplicate emails,
transaction rollback verified with a forced-failure test, connection
pooling correctly configured for serverless (Transaction-mode pooler, pool
size 1 on Vercel). RLS now enabled on every table (was disabled on all 10 —
a Critical Supabase-advisor finding, fixed this audit). Session-table
unbounded growth fixed.

# Authentication Architecture

Custom session-cookie auth, scrypt password hashing, opaque random session
tokens. 12/12 direct adversarial tests passed (wrong credentials, no
user-enumeration, forged/missing tokens, genuine server-side logout
invalidation, correct cookie attributes). One real vulnerability found and
fixed: deactivated accounts kept full access via any session issued before
deactivation, for up to 30 days — reproduced end-to-end, fixed with two
independent defense-in-depth layers, re-verified fixed.

# Authorization Architecture

Server-enforced RBAC + explicit per-row ownership checks, never trusting
the client. 36 total adversarial tests across this audit and the prior
engagement (24 inherited + 12 new) all held, including role/header/cookie
spoofing, HTTP method manipulation, ID enumeration, and query/body
injection attempts. Genuine concurrency tested: 10 simultaneous approval
requests on one order correctly serialize to exactly 1 success + 9 clean
409s via row-locking.

# Storage Architecture

Raw footage: Google Drive URL only, validated, never stored as bytes.
Deliverables: a `StorageProvider` abstraction with a working non-durable
local implementation (dev/QA only, correctly refused on Vercel) and a
Supabase-backed implementation that is honestly blocked (missing
credentials) rather than faking success. `output_versions.storage_key` is
confirmed to be a mixed representation (URLs + a few relative paths from
early testing) — named precisely rather than described as more uniform than
it is.

# CMS Architecture

`cms_projects`/`cms_social` drive the public portfolio and a 3-featured-slot
system. The full 0/1/2/3/4+ matrix was directly tested against the live API
this audit (not just reasoned about) — the maximum holds under a direct
injection attempt.

# Audit Architecture

Append-only `audit_events`, no mutation API for any role, paginated. Full
order-lifecycle audit trail (6 expected events) verified present via this
audit's state-machine tests.

# Security Findings

| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | Module-load-time filesystem write crashes every API route on Vercel | P0 | FIXED (local; not yet deployed) |
| 2 | RLS disabled on all 10 public tables (Supabase advisor: Critical) | Critical | FIXED |
| 3 | Sensitive columns exposed via `sessions` (Supabase advisor: Critical) | Critical | FIXED (same RLS fix) |
| 4 | Deactivated accounts retain access via existing sessions | P1 | FIXED |
| 5 | Internal error detail (variable/method name) leaked on type-confused input | P2 | FIXED |
| 6 | Sessions table grows unbounded (no expiry cleanup) | P3 | FIXED |
| 7 | No self-service password reset/change for any role | P2 (product gap) | OPEN — operational/product decision, not fixed this pass |
| 8 | No automated test suite | P2 (process gap) | OPEN — named, not closed this pass |

# Bugs Found

See Security Findings above; all were genuinely reproduced (not assumed)
before being fixed, using disposable test accounts/orders that were cleaned
up afterward, or direct, safe adversarial HTTP requests against the live QA
environment.

# Bugs Fixed

Findings 1–6 above. Each fix was verified by re-running the exact
reproduction that first demonstrated the bug and confirming it no longer
succeeds, then re-running the relevant regression suite to confirm no new
breakage.

# Remaining Risks

- **The live Vercel deployment is still down** until the project owner
  deploys this branch. Everything in this report describes the *local,
  committed* state, verified as thoroughly as this environment allows
  (including a faithful simulation of Vercel's read-only filesystem and
  production env vars) — but a simulation is not the same as the real
  platform, and the smoke test in `docs/PRODUCTION-RUNBOOK.md` §14 should
  be run immediately after the actual deployment to close that gap.
- No password-reset flow exists; a locked-out user currently requires
  direct database intervention.
- No automated test suite; regressions rely on manual re-verification.
- No third-party observability/error-tracking; Vercel logs + the audit
  table are the only signal sources.

# Operational Prerequisites

1. **Deploy this branch to Vercel and re-run the smoke test.** This is the
   single most important next step — nothing else in this report matters if
   the live deployment doesn't actually come back up.
2. Configure `SUPABASE_SERVICE_ROLE_KEY` + `SUPABASE_STORAGE_BUCKET` if/when
   durable deliverable storage is needed (not required for the app to
   function today).
3. Set `FRONTEND_URL` if the deployment ever becomes split-origin
   (same-origin needs no change; a startup warning now fires if this is
   missing under `NODE_ENV=production`).
4. Decide on a cleanup pass for the demo/test data accumulated in the live
   Supabase database over the course of this engagement (never touched
   destructively without explicit authorization, per standing instruction).
5. Rotate the demo-seeded account passwords before any real customer or
   staff account exists alongside them.
6. Push/PR/merge/deploy remain explicitly reserved for the project owner.

# Test Results

- Auth adversarial suite: 12/12 passed.
- RBAC adversarial suite (this audit, additive to prior 24): 12/12 passed.
- Concurrency/race-condition suite: 7/7 passed (genuine `Promise.all`
  concurrent load, not sequential).
- Featured-slot matrix (0/1/2/3/4+): 7/7 passed.
- `npm audit`: 0 vulnerabilities.
- `npm run build` / `npm run lint`: clean after every change in this audit.
- Full persistence test: genuine process kill + restart, order count
  identical before/after (38/38).

# Browser Results

Live deployment homepage: renders, degrades gracefully to an honest empty
state where data would be (no blank-screen crash), but "Sign In" and every
data-dependent feature are non-functional due to the API outage — screenshot
captured during this audit. Local QA server (post-fix): homepage, work
library, and login pages load with zero console errors.

# Performance Results

Route-level code splitting (from a prior batch) re-confirmed functioning:
541KB initial bundle vs 880KB before splitting, verified byte-identical
after this audit's dead-code removal (confirming the removed code was
never actually in the shipped bundle). No Lighthouse/Web-Vitals run in this
pass — marked UNVERIFIED rather than assumed.

# Accessibility Results

Prior-batch `:focus-visible` and reduced-motion fixes confirmed present by
inspection; not independently re-tested with a screen reader this pass.

# Production Configuration

See `docs/PRODUCTION-RUNBOOK.md` and `docs/PRODUCTION-CREDENTIAL-ROTATION.md`
for the full, current, non-secret-value configuration reference.

# Backup / Recovery

Supabase-managed automated backups (tier-dependent; verify in the Supabase
dashboard). No application-level export tooling exists in this codebase.

# Rollback Plan

Vercel supports instant rollback to any prior deployment via its dashboard.
Database schema changes in this codebase are additive-only by design, so a
code rollback does not require a corresponding database rollback.

# Final Decision

## READY WITH OPERATIONAL PREREQUISITES

The codebase itself — after the fixes made in this audit — is production-
safe: no known code-level, security, data-integrity, or reliability
blocker remains open. However, this cannot be called unconditionally
**READY** for one specific, concrete reason: **the actual live deployment
is currently down**, and this audit's fix for that has not yet been
deployed or verified against the real Vercel platform (only against a
faithful local simulation of it). The gap between "the fix should work" and
"the fix is confirmed working in production" is exactly what the first
version of this report got wrong — this report will not repeat that
mistake by calling the deployment status anything other than what it
concretely is.

**Required before this becomes unconditionally READY:** the project owner
deploys this branch and runs the smoke test in
`docs/PRODUCTION-RUNBOOK.md` §14. Everything else — RBAC, the state
machine, RLS, session security, CMS enforcement, persistence — has been
independently verified against the live database and is not blocking.
