# TRIPHORIA — Storage Architecture (B8)

## Summary

TRIPHORIA's durable-storage layer is built behind a `StorageProvider`
interface (`server/providers/`). Nothing in this document or the code it
describes fakes a successful upload — every gap below is a genuine
infrastructure blocker, not a bug, and is surfaced honestly (HTTP 503,
`code: STORAGE_NOT_CONFIGURED`) rather than silently degraded.

## Scope: what this interface is (and isn't) for

- **Raw customer footage** is explicitly *out of scope*. It stays a Google
  Drive shareable URL, validated server-side (`server/routes/orders.routes.js`
  requires a `drive.google.com` host). TRIPHORIA stores the URL and never
  pretends to have downloaded/mirrored the source footage.
- **Final deliverables** (editor output versions) and any other asset
  TRIPHORIA itself is responsible for storing durably are the actual target
  of this interface.

## The interface

`server/providers/StorageProvider.js` defines the contract every backend
implements: `upload(stream, storageKey)`, `delete(storageKey)`,
`getSignedUrl(storageKey, expiresInSeconds)`, `exists(storageKey)`,
`metadata(storageKey)`. Every route (`upload.routes.js`, `orders.routes.js`)
is written against this interface, never against a concrete provider — so
swapping the backend requires no route changes.

## Providers

### LocalStorageProvider — non-durable, dev/QA only

Writes to the local filesystem (`uploads/`). Explicitly **not** selected in
any environment where `process.env.VERCEL` is set, because Vercel's
serverless filesystem is ephemeral and not shared across invocations —
returning this provider there would let the app believe it has durable
storage when every write is silently lost on the next cold start.

### SupabaseStorageProvider — the intended production backend, currently BLOCKED

**Status: not usable.** Every method throws a `503 STORAGE_NOT_CONFIGURED`
error rather than attempting an operation that would fail unpredictably or
succeed against the wrong thing.

**What is missing, concretely:**

1. `SUPABASE_SERVICE_ROLE_KEY` (or an equivalent server-side key with
   Storage write access) — **not present in this environment.** The only
   Supabase credentials configured are `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_PUBLISHABLE_KEY` — both client-side/publishable, used for
   nothing storage-related today, and incapable of authorizing server-side
   uploads.
2. `SUPABASE_STORAGE_BUCKET` — the bucket name to write deliverables into.
   Not yet created or decided.
3. The `@supabase/supabase-js` package — deliberately not yet installed.
   There is no value in adding an SDK dependency that cannot function
   without the credentials above, and the codebase's standing rule is no
   unnecessary dependencies.

**How to unblock**, once credentials exist:

1. Set `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_STORAGE_BUCKET` as
   **server-only** environment variables (never `VITE_`-prefixed, never
   shipped to the client).
2. `npm install @supabase/supabase-js`.
3. Implement each method in `SupabaseStorageProvider.js` using
   `supabase.storage.from(bucket).upload/remove/createSignedUrl/list`.
4. No other change is required — `selectStorageProvider()` in
   `server/providers/index.js` already prefers `SupabaseStorageProvider`
   the moment `isConfigured` becomes true, and every call site already
   goes through the interface.

## Provider selection logic

`selectStorageProvider()` (`server/providers/index.js`):

1. If Supabase Storage is configured (both env vars present) → use it.
2. Else if running on Vercel → return `null` (no unsafe local fallback).
3. Else (local dev / this session's QA server) → use `LocalStorageProvider`.

Callers must treat a `null` provider as "durable storage is not configured
here" and respond with `503 STORAGE_NOT_CONFIGURED` — see
`uploadRouter.put('/upload', ...)` in `server/routes/upload.routes.js`.

## Canonical reference rule

The database row — not a signed URL — is always the canonical reference to
an asset: `order_files.storage_key` and `output_versions.storage_key` store
the bucket-relative path/key. A signed URL is generated on demand from that
key and expires; it is never the thing persisted. This holds regardless of
which provider is active.

## What already works without any of this

Editor output-version uploads and CMS video entries have never depended on
raw binary upload — they record a hosted deliverable URL (Drive, Frame.io,
a CDN link, etc.) directly, which `formatOrderResponse()` /
`formatProject()` return as-is. The `GET /api/storage/download` endpoint
already redirects to a recorded `https://` URL when no local blob exists
for a key, so the whole product functions today with zero durable object
storage configured. The gap this document describes only affects the raw
binary `PUT /api/storage/upload` ingest path, which is not on the critical
path for any current user-facing workflow.

## Verified behavior (QA, `_rd-b8.mjs`)

- Local/QA environment: `selectStorageProvider()` returns
  `LocalStorageProvider`; a full authorize → PUT → ingest round-trip
  succeeds and returns a real checksum + byte count.
- `SupabaseStorageProvider.isConfigured` correctly reports `false` in this
  environment; every method throws the documented 503 with
  `code: STORAGE_NOT_CONFIGURED` instead of a fabricated success.
- Simulated Vercel environment (`VERCEL=1`) with no Supabase credentials:
  `selectStorageProvider()` returns `null` — confirmed no unsafe fallback
  to local disk.
