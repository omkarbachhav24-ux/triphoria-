# TRIPHORIA — Credential Rotation Procedure

No actual secret values appear in this document. Every credential below is
described by name, purpose, and rotation steps only.

## Inventory

| Credential | Where it lives | Classification |
|---|---|---|
| `DATABASE_URL` | Vercel env vars (production/preview), local `.env` | SECRET, REQUIRED |
| `ADMIN_PASSWORD` | Vercel env vars, local `.env` | SECRET, consumed once on first boot (empty `users` table) |
| `EDITOR_SEED_PASSWORD` / `CUSTOMER_SEED_PASSWORD` | local `.env` only (dev seeding) | SECRET, DEVELOPMENT ONLY — never set these in production |
| `STORAGE_SECRET` | Vercel env vars, local `.env` | SECRET, REQUIRED (server refuses to boot in production without it) |
| Individual user password hashes | `users.password_hash` column, Supabase | SECRET (scrypt hash, not reversible) |
| Session tokens | `sessions.token` column, Supabase | SECRET (opaque random, 32 bytes) |
| `SUPABASE_SERVICE_ROLE_KEY` | Not yet configured anywhere | SECRET, REQUIRED to activate durable storage |

## Rotating `DATABASE_URL` (Supabase database password)

1. Supabase dashboard → Project Settings → Database → Reset database
   password.
2. Update the connection string with the new password in Vercel's env vars
   for every environment that needs it (Production, Preview).
3. Redeploy (env var changes require a new deployment to take effect on
   Vercel).
4. Verify: `curl https://<your-domain>/api/health` returns
   `{"status":"healthy", ...}`.
5. Old sessions and data are unaffected — this only changes how the server
   connects to Postgres, not anything stored in it.

## Rotating `ADMIN_PASSWORD`

This variable is only read once, when the `users` table is empty. Changing
it after the admin account already exists does nothing by itself. To
actually change the admin's login password:

1. Have the admin log in and use a password-change flow if one exists in the
   product (verify — as of this audit, **no self-service password-change UI
   exists** for any role; this is a real gap, not a rotation-procedure
   detail).
2. Until that exists, rotate via a one-off script: connect to the database
   with `DATABASE_URL`, call `hashPassword(newPassword)` from `server/db.js`,
   and `UPDATE users SET password_hash = $1 WHERE email = $2`. Never run this
   by pasting a plaintext password into a chat, log, or commit — type it
   directly into a local script you run yourself and discard immediately.
3. This immediately invalidates nothing else — existing sessions for that
   account remain valid until they expire or the account is logged out
   everywhere (there is currently no "log out everywhere" admin action for
   a still-active account — only for deactivation, per the fix in this
   audit. Consider adding one if this is a requirement.).

## Rotating `STORAGE_SECRET`

This is the HMAC key signing presigned upload/download tokens (15-minute
TTL). Rotating it immediately invalidates every currently-outstanding
presigned URL (which is a short window anyway, so low blast radius).

1. Generate a new value: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`.
2. Set it in Vercel env vars.
3. Redeploy.
4. No data migration needed — this key only signs short-lived tokens, never
   persisted anywhere.

## Deactivating a compromised editor/admin account immediately

As of this audit, deactivating an editor via
`DELETE /api/auth/editors/:id` (admin-only) now **immediately** revokes
every existing session for that account (fixed this audit — previously,
existing sessions survived deactivation for up to 30 days). For an admin
account, there is currently no equivalent UI action — deactivating an admin
requires a direct database update
(`UPDATE users SET status = 'deactivated' WHERE id = $1`) followed by
`DELETE FROM sessions WHERE user_id = $1`, run manually against the database.

## Rotating `SUPABASE_SERVICE_ROLE_KEY` (once configured)

Not yet applicable — this credential does not exist in the current
deployment. Once configured (see `docs/STORAGE-ARCHITECTURE.md`):

1. Supabase dashboard → Project Settings → API → reveal/regenerate the
   service role key.
2. Update Vercel env vars.
3. Redeploy.
4. This key is never exposed to the browser under any circumstance — it must
   never be prefixed `VITE_`.

## General Rule

Never commit `.env`. Never paste a secret value into a commit message, PR
description, log line, screenshot, or chat transcript. When documenting
credential state anywhere, use exactly one of: `CONFIGURED`, `MISSING`,
`REQUIRED`, `ROTATION REQUIRED` — never the value itself.
