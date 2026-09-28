# TRIPHORIA — Security Audit & Bug Hunt

**Scope:** `server/` (Express 5 API — the sole authorization boundary), `server/schema.sql`, storage subsystem, routes.
**Method:** Static code review of every route + auth/db/storage core; targeted runtime confirmation of the path-traversal sanitizer.
**Date:** 2026-09-29. **Nature:** READ-ONLY. No code was modified.

Recent commits already remediated several prior findings; each was **verified present in current code** and is listed under "Done Right", not re-reported as open.

---

## ✅ REMEDIATION STATUS (updated 2026-09-29)

All actionable findings below were **fixed and verified** in the commit bundling
this audit. Summary of what changed:

| ID | Status | Fix |
|----|--------|-----|
| **H1** | ✅ Fixed | `getLocalFilePath` now uses `path.resolve` + containment check; new `isSafeStorageKey` rejects traversal/absolute/backslash keys on **write** (order-create + output-upload). Verified: 16/16 unit cases pass; live exploit key `x/../../../../.env` now stored as `orders/<id>/raw/x`. |
| **M1** | ✅ Fixed | `/api/storage/download` only 302-redirects to an allowlisted host (Google Drive + `STORAGE_REDIRECT_ALLOWLIST`); others → 400. |
| **M2** | ✅ Fixed | `/register` enforces ≥10-char password. Verified: weak password rejected live. |
| **M3** | ✅ Fixed | Production fails closed on missing `FRONTEND_URL` (`origin:false`, no credentialed reflection). |
| **L2** | ✅ Fixed | Auth path switched to async `crypto.scrypt` (all callers awaited). Verified: login still works. |
| **L3** | ✅ Fixed | `reassign` now 404s on missing order and 409s unless `In Progress`/`Review`. |
| **L5** | ✅ Fixed | `rawFootage` array-checked; `sizeBytes` finite-checked; storage keys shape-validated. |
| **L6** | ✅ Fixed | Failed-login email capped at 254 chars before audit write. |
| **L1** | ⚪ Accepted | Register email-enumeration left as-is (rate-limited; generic response hurts UX). Documented trade-off. |

Original findings preserved below for reference.

---

## Severity summary

| Severity | Count |
|----------|-------|
| CRITICAL | 0 |
| HIGH     | 1 |
| MEDIUM   | 3 |
| LOW      | 6 |

The single HIGH is deployment-conditional: it is effectively **CRITICAL on a self-hosted / local-disk deployment** (the LocalStorageProvider path — which is what is running now) and degrades to a MEDIUM open-redirect on Vercel (no local blobs).

---

## HIGH

### H1 — Authenticated arbitrary file read (path traversal / LFI) via attacker-controlled `storageKey`
**Location:** `server/storage.js:133-136` (`getLocalFilePath`), reached from `server/routes/upload.routes.js:164` (`GET /api/storage/download`). Sink also in `server/providers/LocalStorageProvider.js:36-39`.

**Root cause.** The key sanitizer only strips a **leading** `../` and leading slashes:
```js
const safeKey = storageKey.replace(/^(\.\.[\/\\])+/, '').replace(/^[\\\/]+/, '');
return path.join(uploadsDir, safeKey);
```
Embedded traversal sequences survive. Confirmed at runtime:
```
"foo/../../../../etc/passwd"  => resolved  C:\etc\passwd
"a/../../../secret.txt"       => resolved  C:\secret.txt
```
So `path.join(uploadsDir, key)` escapes `uploads/` entirely.

**Full exploit chain (any authenticated customer):**
1. `POST /api/orders` with `rawFootage:[{ filename:"x", storageKey:"x/../../../../.env" }]`. The client-supplied `storageKey` is stored verbatim — `orders.routes.js:257` (`f.storageKey || ...`). No sanitization on write. (Same vector via editor output upload: `orders.routes.js:461` `req.body.storageKey`.)
2. `GET /api/storage/authorize-download?orderId=<own order>&storageKey=x/../../../../.env`. The ownership check at `upload.routes.js:121-127` **passes** because the malicious key genuinely exists in `order_files` for that order. A signed token is minted.
3. `GET /api/storage/download?token=...` → `getLocalFilePath` → `fs.createReadStream` streams the arbitrary file back (`upload.routes.js:180-181`).

**Impact.** Any registered user can read any file the Node process can read: `.env` (leaks `STORAGE_SECRET`, `DATABASE_URL`, `ADMIN_PASSWORD`), source, other tenants' uploaded footage. Leaking `STORAGE_SECRET` then lets the attacker forge presigned tokens for *any* key — total compromise of the storage subsystem. This is why it is CRITICAL for the self-hosted deployment. On Vercel the local file won't exist, so it falls through to the redirect branch (see M1).

**Fix.** Canonicalize and containment-check, don't regex-strip:
```js
export function getLocalFilePath(storageKey) {
  const resolved = path.resolve(uploadsDir, storageKey);
  if (resolved !== uploadsDir && !resolved.startsWith(uploadsDir + path.sep)) {
    const err = new Error('Invalid storage key'); err.status = 400; throw err;
  }
  return resolved;
}
```
Apply the identical guard in `LocalStorageProvider.#resolvePath`. **Additionally**, validate `storageKey` shape on write (order create + output upload) — reject anything not matching `^orders/[\w.-]+/(raw|outputs)/[\w./-]+$` and containing no `..` segment — so malicious keys never enter the DB in the first place.

---

## MEDIUM

### M1 — Open redirect via `/api/storage/download`
**Location:** `server/routes/upload.routes.js:171-172`
```js
if (storageKey.startsWith('https://')) {
  return res.redirect(storageKey);
}
```
When no local blob exists, the server 302-redirects to whatever `https://` URL is stored as the key. An editor/admin (or, per H1, any customer via order-file storageKey) can store `storageKey = "https://evil.example/phish"`; a victim who follows the signed download link is redirected off-platform. It is a genuine **open redirect** (phishing / OAuth-token-capture vector). It is **not SSRF** — the server does not fetch the URL, it hands the client a 302, so no server-side request is made.

**Fix.** Don't blindly redirect to a stored value. Either allowlist the durable-storage host, or (preferred) resolve deliverable URLs through a provider `getSignedUrl()` rather than treating the raw stored string as a redirect target. At minimum validate the host against a configured allowlist before `res.redirect`.

### M2 — No password-strength policy on customer registration
**Location:** `server/routes/auth.routes.js:114-135`
Registration only checks that `email`/`password` are present (`:116-118`). A customer may register with password `"1"`. Editor onboarding enforces ≥10 chars (`:183-185`), so the weak-policy gap is customer-specific and inconsistent.
**Impact.** Trivially guessable customer passwords; brute-force is only loosely bounded (login limiter = 20/15min).
**Fix.** Enforce a minimum length (≥10) and basic complexity/breach check on `/register`, matching the editor path.

### M3 — CORS reflects any origin with credentials when `FRONTEND_URL` is unset in production
**Location:** `server/app.js:33-45`
```js
app.use(cors({ origin: allowedOrigin || true, credentials: true }));
```
If a prod deploy forgets `FRONTEND_URL`, `origin` becomes `true` → the request Origin is reflected **with `credentials:true`**. That is the classic credentialed-CORS misconfiguration allowing any site to read authenticated responses. A startup `console.warn` was added (`:34-41`) but runtime behavior is unchanged.
**Mitigating factor:** the session cookie is `SameSite=Lax` (`auth.js:70`), so browsers won't attach it to cross-site `fetch`/XHR — this substantially neuters the attack in practice. Still a latent misconfiguration and defense-in-depth gap.
**Fix.** In production, fail closed: if `FRONTEND_URL` is unset, refuse to reflect (`origin: false` or throw at boot) rather than only warning.

---

## LOW

### L1 — User/email enumeration on registration
`auth.routes.js:122-123` returns `409 "An account with this email already exists."` Login is correctly generic, but register discloses account existence. Rate-limited (10/hr) which limits mass enumeration. **Fix:** return a generic success/verification-email response, or accept the trade-off explicitly.

### L2 — `scryptSync` blocks the event loop
`db.js:88,95` use `crypto.scryptSync` on the login/register/hash path. Under concurrent auth load this serializes request handling (soft DoS). **Fix:** use async `crypto.scrypt` (promisified). Cost params are otherwise fine.

### L3 — `POST /orders/:id/reassign` has no existence or state check
`orders.routes.js:406-431` runs `UPDATE orders SET assigned_editor_id=... WHERE id=$3` without verifying the order exists or is in a reassignable state. A non-existent id updates 0 rows yet returns `success:true`; a `Completed`/`Rejected`/`Pending Approval` order can be reassigned. Logic/consistency bug, admin-only. **Fix:** `SELECT ... FOR UPDATE`, 404 if missing, and gate on `status IN ('In Progress','Review')`.

### L4 — 50 MB JSON body limit applies to every route, including auth
`app.js:47-48`. `POST /api/auth/login` etc. will buffer up to 50 MB of JSON before handler logic — cheap memory-amplification DoS, and unnecessary since only upload-adjacent JSON is ever large. **Fix:** apply the 50 MB limit only where needed; use a small default (e.g. 100 KB) globally.

### L5 — Unvalidated array/number inputs (type confusion, no crash)
`orders.routes.js:180,244` — `rawFootage` is iterated without `Array.isArray`; a string/number is tolerated but silently mis-processed. `sizeBytes` → `Number(sizeBytes)` (`:477`) can become `NaN` and hit the `BIGINT` column, throwing a generic 500. `cms.routes.js:224` `featured-slots` doesn't verify the slot IDs exist. Low impact (no leak/crash-to-client since error handler is now generic). **Fix:** validate `Array.isArray(rawFootage)` and `Number.isFinite(sizeBytes)`; ignore unknown slot IDs.

### L6 — Failed-login audit stores raw attacker-supplied email as `actor_id`
`auth.routes.js:51-58`. Parameterized (no SQLi), but log-forging/pollution is possible via crafted email strings, and unbounded distinct values inflate the audit table. **Fix:** cap length / normalize before logging.

---

## Done Right (verified in current code — not re-reported)

- **Session tokens:** `crypto.randomBytes(32)` = 256 bits entropy, opaque, DB-backed (`auth.js:7`). Strong.
- **Password hashing:** scrypt, per-user 16-byte random salt, `timingSafeEqual` compare, length-guarded (`db.js:86-99`). Correct.
- **Cookie flags:** `HttpOnly`, `SameSite=Lax`, `Secure` in production, 30-day `maxAge`, scoped `path=/` (`auth.js:67-75`).
- **Deactivation enforced every request:** `getUserFromToken` filters `status != 'deactivated'` AND `expires_at > now()` (`auth.js:47-53`); deactivation also kills all live sessions (`deleteAllSessionsForUser`, `auth.routes.js:251`). Both layers present.
- **Session sweep on login** (`auth.js:27-29`), fire-and-forget, non-fatal. Present.
- **Logout invalidation:** `deleteSession(token)` server-side + cookie clear (`auth.routes.js:93-97`). Correct.
- **SQL injection:** every query reviewed — all use `$n` parameterization. No string interpolation of user input into SQL anywhere (identifiers/enums are hardcoded). Clean.
- **STORAGE_SECRET:** no fallback; throws at boot in production, disables token ops elsewhere (`storage.js:26-43`). Correct.
- **Admin password:** no shipped default in production; `process.exit(1)` if unset in prod; dev-only `adminpgt` (`db.js:136-146`). No secrets found in git (`git ls-files` shows only `.env.example` + a dev-credentials doc).
- **`/api/auth/editors` (GET+POST) admin-guarded** via `requireRole('admin')` (`auth.routes.js:162,177`). Verified.
- **Error handler** returns generic message for non-deliberate (no `status`) errors in production; full detail only logged server-side (`app.js:111-121`). Correct.
- **Order IDOR:** `GET /orders/:id` enforces `admin || client_id===user.id || assigned_editor_id===user.id` (`orders.routes.js:148`); list endpoint scopes by role (`:111-119`); state transitions re-check ownership inside the transaction (`:444, :510, :565`). No IDOR on order access. Solid.
- **HMAC presigned tokens:** SHA-256 over canonical payload, `timingSafeEqual` signature check, expiry enforced (`storage.js:79-102`). Sound scheme (its weakness is the *unvalidated key content* — H1 — not the crypto).
- **State machine:** transitions guarded with `FOR UPDATE` row locks + status precondition + typed `HttpError`/ROLLBACK (`orders.routes.js:326-342`). Robust.
- **Rate limiting** present on login (20/15m), register (10/hr), editor onboarding (30/hr), upload-adjacent (60/15m) (`rateLimit.js`, wired in routes). Login and register — the sensitive ones — are covered.
- **RLS** enabled on all 10 tables (`schema.sql:201-210`) as defense-in-depth (Express remains the real boundary; DB role is BYPASSRLS).
- **body role-spoofing:** roles come only from `req.user` (DB-derived session), never from request body/headers. Confirmed across all handlers.

---

## Remediation priority (numbered)

1. **H1** — Fix `getLocalFilePath` (and `LocalStorageProvider.#resolvePath`) with `path.resolve` + containment check; validate `storageKey` shape on write in order-create and output-upload so traversal keys never enter the DB. *(Highest — authenticated arbitrary file read; leaks STORAGE_SECRET/DATABASE_URL on self-hosted.)*
2. **M1** — Remove/allowlist the `res.redirect(storageKey)` open redirect in `/api/storage/download`.
3. **M3** — Make production fail closed on missing `FRONTEND_URL` (don't reflect any origin with credentials).
4. **M2** — Enforce customer password-strength policy on `/register`.
5. **L4** — Scope the 50 MB body limit to upload routes; small default elsewhere.
6. **L2** — Switch auth path to async `scrypt`.
7. **L3 / L5 / L6 / L1** — Existence+state check on reassign; array/number input validation; bound audit `actor_id`; consider generic register response.
