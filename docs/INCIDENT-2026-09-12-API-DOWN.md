# Incident: Production API Fully Down (FUNCTION_INVOCATION_FAILED)

**Discovered:** 2026-09-12, during the final production-readiness audit, by
directly testing the live deployment (`https://triphoria-azure.vercel.app/`)
— the first time in this engagement's history that the actual Vercel URL was
tested rather than only the local `_rd-server.mjs` proxy.

**Severity:** P0 — complete outage. Every `/api/*` route, including
`/api/health`, returned HTTP 500 with `FUNCTION_INVOCATION_FAILED`.

## Root cause

`server/storage.js` had a top-level (module-load-time) filesystem write:

```js
const uploadsDir = path.resolve(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
```

Vercel's serverless runtime filesystem is **read-only everywhere except
`/tmp`**. This line runs the instant the module is imported — before any
request handler executes — and throws `EROFS` on the very first cold start.
Because `server/app.js` imports `upload.routes.js`, which imports
`storage.js`, this one line took down the entire module graph and therefore
every single API route, not just upload-related ones.

## Why this was not caught earlier

Every QA pass in this engagement's history (Phase A through B15) ran against
`_rd-server.mjs`, a local Node-standalone Express server, or against the
production build served the same way. That environment has a normal
writable filesystem, so the bug was silent there. The actual Vercel
serverless entrypoint (`api/index.js`) and the live deployed URl were never
directly tested end-to-end until this audit — the "Vercel API compatibility"
verification referenced in `docs/PHASE-B-VERCEL-API-REPORT.md` explicitly
documented that it could only run the entrypoint locally with `VERCEL=1` set
as an environment variable, which does **not** reproduce a read-only
filesystem (only `process.env.VERCEL` being truthy) — so this class of bug
was structurally invisible to that verification method.

## Fix

Removed the top-level `mkdirSync`/`existsSync` pair entirely. The uploads
directory is now created lazily, only inside the two functions that actually
perform a local write (`saveUploadedStream` in `server/storage.js`, and
`LocalStorageProvider.upload()` in `server/providers/LocalStorageProvider.js`)
— both of which are already unreachable on Vercel by design
(`selectStorageProvider()` refuses `LocalStorageProvider` when
`process.env.VERCEL` is set, and `saveUploadedStream` itself is now dead code
with no remaining callers since B8 replaced its call site with the
`StorageProvider` abstraction — see the dead-code audit in this same report).

## Verification

Reproduced the exact failure mode in isolation (mocked `fs.mkdirSync` to
throw `EROFS` for any non-`/tmp` path, confirmed `storage.js` crashed on
import) and confirmed the fix resolves it (same mock, `storage.js` now loads
cleanly). Then ran a full module-graph boot test — `api/index.js` →
`server/app.js` → every route file — under simulated Vercel conditions
(`VERCEL=1`, `NODE_ENV=production`, mocked read-only `fs.mkdirSync` and
`fs.writeFileSync` for any path outside `/tmp`) and confirmed the entire
application now boots without error.

**Not yet verified:** that the actual live Vercel deployment recovers after
this fix is deployed, since deployment/push is explicitly reserved for the
project owner, not this engagement. The fix is committed locally only. Once
deployed, `curl https://triphoria-azure.vercel.app/api/health` should return
`200 {"status":"healthy", ...}` — if it still fails, the next most likely
cause (given this fix resolves the reproduced failure) is a genuinely missing
required environment variable in the Vercel project settings (`DATABASE_URL`
or `STORAGE_SECRET`), not a code defect.
