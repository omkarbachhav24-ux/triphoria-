# TRIPHORIA — Deployment Guide

How to run TRIPHORIA locally and deploy it to Vercel with a Supabase Postgres
database. This matches the actual architecture: a **React + Vite** SPA plus one
**Express** serverless function talking to **Supabase Postgres** via `pg`, with
**custom scrypt cookie-session auth** (not Supabase Auth, no `@supabase/*`
packages, no RLS-based access — the Express API is the sole authorization
boundary).

---

## 1. Architecture at a glance

```
Browser ── https://<app>.vercel.app
  │  GET /            → dist/index.html + assets   (Vercel static)
  │  GET /dashboard…  → dist/index.html            (SPA fallback rewrite)
  │  /api/* /uploads/* ─────────► api/index.js     (Vercel Node function)
  │                                  Express app (server/app.js)
  │                                   ├─ ensureSchema() once per cold start
  │                                   ├─ authMiddleware → sessions/users cookie
  │                                   └─ routers: auth / orders / cms / audit / storage
  │                                  ▼
  │                        pg Pool (max 1) ──► Supabase Postgres
  │                                            (transaction pooler :6543)
  └─ cookie: session_token (HttpOnly; Secure; SameSite=Lax; 30d) — same origin, no CORS
```

Locally the same Express app runs as a standalone listener on `:3001`; the Vite
dev server proxies `/api` and `/uploads` to it.

---

## 2. Prerequisites

- **Node ≥ 22** (`package.json` `engines`).
- A **Supabase** project (free tier is fine). The app only needs its Postgres
  connection string — nothing else from Supabase.
- A **Vercel** account for production.

---

## 3. Get the database connection string

1. Supabase dashboard → your project → **Connect**.
2. Choose **Direct → Connection string**, then the **Transaction pooler** tab
   (port **6543**). Copy it. It looks like:
   ```
   postgresql://postgres.<project-ref>:[YOUR-PASSWORD]@aws-0-<region>.pooler.supabase.com:6543/postgres
   ```
3. Replace `[YOUR-PASSWORD]` with your database password.
   **Percent-encode special characters** (`@`→`%40`, `#`→`%23`, `/`→`%2F`,
   space→`%20`, etc.). Plain letters/numbers need no encoding.

> Always use the **transaction pooler (:6543)** for serverless. The legacy
> direct host `db.<ref>.supabase.co:5432` does not resolve on newer projects.

---

## 4. Run locally

1. Copy `.env.example` → `.env` and fill in:
   ```
   DATABASE_URL=postgresql://postgres.<ref>:<pwd>@aws-0-<region>.pooler.supabase.com:6543/postgres
   NODE_ENV=development
   PORT=3001
   ADMIN_EMAIL=admin@triphoria.io
   ADMIN_PASSWORD=<any dev password>
   STORAGE_SECRET=<any long random string>
   ```
   `.env` is gitignored — never commit real secrets.

2. Install and start both processes (two terminals):
   ```bash
   npm install
   npm run server   # Express API on :3001 — creates schema + seeds on first boot
   npm run dev      # Vite dev server on :5173
   ```

3. Open http://localhost:5173. On first server boot you'll see
   `[DB] Seeding completed successfully` — all 10 tables are created and demo
   data is loaded (idempotent; re-runs are safe and skip seeding once `users`
   is non-empty).

4. Verify:
   ```bash
   curl http://127.0.0.1:3001/api/health      # {"status":"healthy","database":"Supabase Postgres"}
   ```

### Demo seed accounts (dev only)

| Role     | Email                 | Password (dev fallback) |
|----------|-----------------------|-------------------------|
| Admin    | `admin@triphoria.io`  | `adminpgt`              |
| Editor   | seeded `editor-0x`    | `editorpgt`             |
| Customer | seeded `user-10x`     | `clientpgt`             |

These fallbacks only apply when `NODE_ENV !== production`. **Do not rely on
them in production** (see §7).

---

## 5. Deploy to Vercel

The repo already contains `vercel.json` (framework `vite`, the `api/index.js`
function, and the SPA-fallback rewrites) and `api/index.js` (exports the Express
app). No extra config is needed.

1. **Import the repo** into Vercel (or `vercel` CLI). Root Directory = repo root.
2. Vercel auto-detects: build `npm run build`, output `dist/`.
3. Add **Environment Variables** (Project → Settings → Environment Variables),
   scope **Production**:

   | Variable         | Value                                                        | Notes |
   |------------------|--------------------------------------------------------------|-------|
   | `DATABASE_URL`   | the transaction-pooler string (password URL-encoded)         | required |
   | `NODE_ENV`       | `production`                                                  | enables `Secure` cookie; makes missing `ADMIN_PASSWORD` fatal on first seed |
   | `ADMIN_PASSWORD` | your real admin password                                     | used only when seeding an empty `users` table |
   | `STORAGE_SECRET` | a long random string                                         | app refuses to boot in prod without it |

   Leave **`FRONTEND_URL` unset** — same-origin deploy needs no CORS.

4. **Deploy.** The first `/api/*` request pays a one-time `ensureSchema()` cost
   (creates tables, seeds if `users` is empty).

5. **Verify on the live URL:**
   ```
   GET  /api/health                → 200 {"database":"Supabase Postgres"}
   POST /api/auth/login {creds}     → 200 + Set-Cookie session_token
   GET  /api/auth/me                → authenticated:true
   POST /api/auth/logout            → session invalidated
   ```

---

## 6. Environment variables reference

**Server-only (no `VITE_` prefix):**

| Var                     | Required        | Meaning |
|-------------------------|-----------------|---------|
| `DATABASE_URL`          | **yes**         | Supabase transaction-pooler connection string. |
| `NODE_ENV`              | prod: **yes**   | `production` → `Secure` cookie + strict seed guard. |
| `ADMIN_PASSWORD`        | prod: first boot| Seed admin password; ignored once `users` is populated. |
| `STORAGE_SECRET`        | **yes** (prod)  | HMAC key for presigned storage tokens; no fallback. |
| `PORT`                  | no (3001)       | Local listener only. |
| `FRONTEND_URL`          | no              | If set, locks CORS to it. Leave unset for same-origin. |
| `EDITOR_SEED_PASSWORD` / `CUSTOMER_SEED_PASSWORD` | no | Override seeded demo passwords. |

**Frontend (`VITE_`-prefixed, public, currently unused by code):**
`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` — declared but not read by
any source file; the browser never talks to Supabase directly.

---

## 7. Production checklist

- [ ] `DATABASE_URL` points at the transaction pooler (`:6543`), password encoded.
- [ ] `NODE_ENV=production`, `STORAGE_SECRET` set, `ADMIN_PASSWORD` set.
- [ ] **Rotate demo credentials.** Seeding runs only when `users` is empty, so a
      new `ADMIN_PASSWORD` on Vercel will *not* overwrite already-seeded users.
      Either wipe the `users` table before first real deploy, or `UPDATE` the
      password hashes directly in Supabase.
- [ ] `GET /api/health` returns 200 on the live URL.
- [ ] Login → cookie → `/me` → logout verified live.

---

## 8. Notes & current gaps

- **Media storage is not durable yet.** Delivered cuts are stored as URL strings;
  a `SupabaseStorageProvider` exists but is off until `SUPABASE_SERVICE_ROLE_KEY`
  and `SUPABASE_STORAGE_BUCKET` are configured. `PUT /api/storage/upload` writes
  to the local FS and is **ephemeral on Vercel**.
- **No payments / email** — those order fields are cosmetic.
- **No automated test suite** — verification is via ad-hoc scripts. This is the
  main long-term maintainability gap.
