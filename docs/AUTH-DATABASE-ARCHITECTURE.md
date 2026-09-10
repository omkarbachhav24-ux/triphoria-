# TRIPHORIA: Production Auth & Database Architecture

## Architecture Overview
TRIPHORIA currently uses a monolithic frontend-backend architecture locally, but relies on a decoupled setup in its design.

**Local Stack:**
*   **Frontend:** React (Vite)
*   **Backend:** Express.js (`server/index.js`)
*   **Database:** SQLite (`data/triphoria.db`) in WAL mode

---

## Database Architecture

### Storage Location
*   **Path:** `data/triphoria.db` (relative to project root)
*   **Initialization:** Handled by `server/db.js`. If the database does not exist, SQLite creates it automatically on startup.
*   **Seeding:** If the `users` table is empty (count === 0), `server/db.js` automatically runs `seedInitialData()` to populate default admin, editors, customers, orders, and portfolio items.

### Schema Map

**1. users**
*   `id` (TEXT, PK)
*   `name` (TEXT)
*   `email` (TEXT, UNIQUE)
*   `password_hash` (TEXT) - Stored as `salt:derivedKey`
*   `role` (TEXT) - CHECK (admin, editor, customer, client)
*   `specialty`, `max_capacity`, `avatar_url`, `organization`, `status`, `created_at`

**2. sessions**
*   `id` (TEXT, PK)
*   `user_id` (TEXT, FK to users)
*   `token` (TEXT, UNIQUE)
*   `expires_at` (TEXT)
*   `created_at` (TEXT)

**3. orders**
*   `id` (TEXT, PK)
*   `client_id` (TEXT, FK to users)
*   `status` (TEXT) - CHECK constraint applies
*   `package_name`, `editing_style`, `platform`, `target_length`, `project_name`, `instructions`
*   `google_drive_url` (TEXT) - Stores the external URL provided by the customer
*   `deadline`, `assigned_editor_id` (FK), `admin_notes`, `rejection_reason`, `idempotency_key`, `created_at`, `updated_at`

**4. order_files**
*   Stores metadata for raw footage files.

**5. output_versions**
*   Stores metadata for deliverables uploaded by editors.

**6. storage_lifecycle**
*   Tracks retention policies for orders.

**7. audit_events**
*   Immutable log of critical system actions.

**8. cms_projects & cms_social**
*   Stores public portfolio content for the marketing site.

---

## Authentication Forensics

### Login Flow
1.  **Frontend:** `AuthPage.jsx` calls `login(email, password)` from `AuthContext.jsx`.
2.  **API Call:** `AuthContext` makes a `POST` request to `/api/auth/login` with credentials.
3.  **Backend Route:** `server/routes/auth.routes.js` handles the request.
4.  **Verification:** Looks up the user by email in the SQLite database. Uses `crypto.scryptSync` (via `verifyPassword` in `server/db.js`) to compare the provided password against the stored `password_hash`.
5.  **Session Creation:** If valid, generates a random 32-byte hex token and stores it in the `sessions` table (`server/auth.js`).
6.  **Cookie:** Sets an `HttpOnly`, `SameSite=Lax` cookie named `session_token` containing the token.
7.  **Response:** Returns `{ success: true, user: {...} }` (password is NOT returned).
8.  **Frontend State:** `AuthContext` updates user state and router redirects based on role.

### Password Security
*   **Algorithm:** `scrypt` (Node.js native `crypto.scryptSync`).
*   **Storage:** Only hashes are stored in the database (`salt:derivedKey`). Passwords are never stored in plain text.
*   **Transport:** Sent via JSON payload over HTTP/HTTPS.

---

## Admin User Forensics

### Admin Creation
*   **Source:** The admin account `admin@triphoria.io` is strictly created during the **database seeding process** in `server/db.js`.
*   **Credentials:** It uses `process.env.ADMIN_EMAIL` and `process.env.ADMIN_PASSWORD`.
*   **Fallback:** If `ADMIN_PASSWORD` is not set and `NODE_ENV` is not 'production', it falls back to the hardcoded `adminpgt`.
*   **Production Guard:** If `NODE_ENV` is 'production' and `ADMIN_PASSWORD` is missing, the server explicitly crashes (`process.exit(1)`).
*   **Persistence:** Changing `ADMIN_PASSWORD` in `.env` *after* the database is seeded will **not** change the existing admin's password, because seeding only runs if the `users` table is entirely empty.

---

## New Editor Creation Flow
1.  **Trigger:** Super Admin fills out the onboarding form and calls `POST /api/auth/editors`.
2.  **Action:** `server/routes/auth.routes.js` validates the `requireRole('admin')` middleware.
3.  **Password:** If no password is provided in the request, a random one is generated (e.g., `TP-A1B2-C3D4`).
4.  **Storage:** The new editor is inserted into the SQLite `users` table. Only the `password_hash` is saved.
5.  **Response:** The plain text password is returned *once* in the API response payload so the admin can copy it and send it to the editor. It is never stored in plain text or `localStorage`.

---

## Data & Media Storage Map

| Item | Storage Location | Notes |
| :--- | :--- | :--- |
| **User Passwords** | SQLite `users.password_hash` | Hashes only (`scrypt`). |
| **Session Tokens** | SQLite `sessions.token` | Mapped to `user_id`. |
| **Order Metadata** | SQLite `orders` table | Form fields (package, instructions, etc). |
| **Google Drive URLs** | SQLite `orders.google_drive_url` | Text column. Survives restarts. |
| **Raw Footage** | Customer's Google Drive | Managed externally by the customer. |
| **Editor Outputs** | Local filesystem (`/uploads`) | Metadata in `output_versions` table. Does **not** survive Vercel deployments. |
| **CMS Thumbnails** | Public URLs or local `/public` | Referenced in SQLite. |

*Note: Any media stored in the local filesystem (like editor outputs) will be lost upon server restart or redeployment in a serverless environment.*
