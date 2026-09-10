# TRIPHORIA: Vercel Authentication Diagnostic

## The Core Issue
The "Server communication failure" during login on the deployed Vercel site is **not a code bug**, but an **architectural mismatch** between the local monolithic development setup and Vercel's static hosting environment.

### Local vs. Production Comparison

| Component | Local Development | Vercel Production |
| :--- | :--- | :--- |
| **Frontend** | Runs on `localhost:5173` via `npm run dev`. | Built via `npm run build` into `/dist` and served statically by Vercel. |
| **API Backend** | Runs on `localhost:3001` via `npm run server` (`server/index.js`). | **Does Not Exist.** Vercel is only hosting the `/dist` static files. The `server/index.js` file is completely ignored during the Vite build process. |
| **Database** | SQLite (`data/triphoria.db`) persistent on local disk. | **Does Not Exist.** Serverless environments do not support persistent SQLite databases. |
| **Login API** | `/api/auth/login` proxied by Vite to Express. | `/api/auth/login` returns **404 Not Found**. |
| **Users / Admin** | Seeded into local SQLite database on first run. | Never seeded. No database exists to hold them. |
| **Error Result** | Successful login (`200 OK`). | `fetch()` fails (404/Network Error), triggering the "Server communication failure" fallback message in `AuthPage.jsx`. |

## Root Cause Analysis
WHY does `admin@triphoria.io` work locally but fail on Vercel?

1.  **Missing Backend:** The Vercel deployment of a standard Vite app (`vite build`) only deploys static HTML/JS/CSS. It does not run the `package.json` `"server"` script.
2.  **Missing Database:** The `server/db.js` relies on a persistent SQLite file (`data/triphoria.db`). Vercel Serverless Functions (even if we deployed the Express app to them) use an ephemeral, read-only filesystem. SQLite databases cannot be written to or persisted across invocations on Vercel.
3.  **Proxy Failure:** Locally, `vite.config.js` proxies `/api` to the Express backend on port `3001`. On Vercel, this proxy configuration is ignored in production builds. The frontend tries to fetch `/api/auth/login` relative to the current domain, hitting Vercel's static router, which returns a 404.

## The "Safe Fix"
Because SQLite cannot safely provide persistent production authentication on Vercel's serverless architecture, **there is no safe, immediate code fix that preserves the current SQLite architecture on Vercel.**

Attempting to force SQLite onto Vercel Serverless Functions would result in catastrophic data loss (users, sessions, and orders would be wiped every time the function spins down or is redeployed).

### Recommended Next Step: Supabase Migration
To achieve a fully functional, scalable production deployment, TRIPHORIA must transition its backend state from the local SQLite/Express monolith to a managed provider.

1.  **Database Migration:** Move from local SQLite to **Supabase PostgreSQL**.
2.  **Authentication:** Replace the custom Express `scrypt` session logic with **Supabase Auth**, which handles JWTs, sessions, and secure cookies natively.
3.  **Storage:** Replace the local `/uploads` directory with **Supabase Storage** for editor outputs.
4.  **Frontend Integration:** Replace `fetch('/api/...')` calls in `AuthContext.jsx` with the Supabase JS Client (`supabase.auth.signInWithPassword(...)`).

This architectural shift is already documented in `docs/SUPABASE-MIGRATION-PLAN.md` and is the only correct path to a production-ready Vercel deployment.
