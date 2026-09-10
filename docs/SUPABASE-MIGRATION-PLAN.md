# TRIPHORIA — SUPABASE MIGRATION & HARDENING PLAN

This document provides an implementation-ready blueprint for migrating TRIPHORIA from local SQLite storage to Supabase Auth and Supabase Postgres.

> [!IMPORTANT]
> **PRE-MIGRATION NOTICE**: This document is an architectural blueprint. Do NOT execute data migration, delete SQLite, or deploy to production until explicit cutover authorization is granted.

---

## 1. Authentication Migration Deep-Dive

### A. Password Hash Compatibility (PBKDF2 $\rightarrow$ Supabase Auth)
- **Current System**: TRIPHORIA uses native Node `crypto.scryptSync` / `crypto.pbkdf2Sync` to generate `salt:derivedKey` strings in SQLite `users.password_hash`.
- **Compatibility**: Supabase Auth uses PostgreSQL `pgcrypto` / `GoTrue` engine with Bcrypt or Argon2 password hashing. Local scrypt/PBKDF2 hashes **cannot** be imported directly into Supabase Auth without custom GoTrue auth plugin extensions.
- **Migration Impact & Resolution**:
  1. **Super Admin Account**: Re-created in Supabase Auth via Supabase Admin API (`supabase.auth.admin.createUser()`) using `ADMIN_EMAIL` and `ADMIN_PASSWORD` from production environment variables.
  2. **Staff Editors**: Onboarded via Supabase Auth Invitations (`supabase.auth.admin.inviteUserByEmail()`). Editors receive an email invite to set a secure password upon first production access.
  3. **Existing Customers**: Imported into Supabase Auth with temporary random credentials and issued a standard password-reset trigger upon first sign-in, or re-registered through `/login`.

---

## 2. Express Backend & Authorization Boundary

- **Service-Role Key Security**: `SUPABASE_SERVICE_ROLE_KEY` is loaded strictly server-side in Node.js/Express API handlers and NEVER exposed to Vite/React client bundles.
- **Primary Authorization Boundary**: Node/Express server remains the **primary authorization gate**:
  - `req.user.id` and `req.user.role` are resolved by verifying the Supabase JWT token in Express `authMiddleware`.
  - Express API handlers enforce role checks (`requireRole('admin')`, `requireAuth`) and filter database queries by `client_id` or `assigned_editor_id`.
  - Supabase RLS acts as a secondary defense layer for direct database client access.

---

## 3. Row Level Security (RLS) Matrix

| Table | RLS Requirement | Policy Strategy | Access Rule |
| :--- | :--- | :--- | :--- |
| `public.profiles` | **REQUIRED** | User Scoped | Users can `SELECT` & `UPDATE` only their own profile. |
| `public.orders` | **REQUIRED** | Role & Owner Scoped | Customers see `client_id = auth.uid()`. Editors see `assigned_editor_id = auth.uid()`. Admin has full access. |
| `public.order_files` | **REQUIRED** | Order Scoped | Accessible if parent `orders` record is authorized. |
| `public.output_versions` | **REQUIRED** | Order Scoped | Accessible if parent `orders` record is authorized. |
| `public.storage_lifecycle` | **SERVER-ONLY** | Service Role Only | Restricted to server-side background processes and Admin handlers. |
| `public.audit_events` | **SERVER-ONLY** | Append-Only | Inserts allowed by API server. `UPDATE` and `DELETE` strictly disabled for all roles. |
| `public.cms_projects` | **PUBLIC READ** | Public / Admin Write | `SELECT` allowed for all users where `is_published = true`. Writes restricted to `admin`. |
| `public.cms_social` | **PUBLIC READ** | Public / Admin Write | `SELECT` allowed for all users where `is_published = true`. Writes restricted to `admin`. |
| `public.idempotency_records` | **SERVER-ONLY** | Service Role Only | Idempotency records read/written strictly by Express server. |

---

## 4. Complete Media Storage Matrix

| Asset Type | Source Provider | Production Storage Location | Database Reference Format |
| :--- | :--- | :--- | :--- |
| **Customer Raw Footage** | Customer Google Drive | **Google Drive** (Customer-owned) | Validated HTTPS URL (`google_drive_url`) in `orders` |
| **Editor Master Outputs** | Studio Upload | **Supabase Storage** (`outputs` bucket) / External CDN | Durable Storage Path (`orders/ORD-1001/v1.mp4`) in `output_versions` |
| **Final Delivery Assets** | Studio Deliverable | **Supabase Storage** (`deliverables` bucket) | Durable Storage Path (`deliverables/ORD-1001/master.mp4`) |
| **Portfolio Videos** | Native MP4 / Social | **External CDN** / Supabase Storage | Direct URL (`playback_url`) & Social Link (`social_url`) |
| **Cover Posters / Images** | Studio Asset | **Supabase Storage** (`public-assets` bucket) | Image CDN URL (`thumbnail_url`) in `cms_projects` |
| **User Avatars** | Dicebear / Upload | **External CDN** / Supabase Storage | Avatar URL (`avatar_url`) in `profiles` |

> [!NOTE]
> **Durable Reference Model**: Databases store durable relative storage paths (e.g. `orders/ORD-1234/master.mp4`) rather than temporary presigned URLs with short-lived HMAC signatures. Presigned download URLs are generated dynamically by Express server handlers upon authorized request.

---

## 5. Step-by-Step Migration Sequence

```
1. Audit & Hardening  ──>  2. Provision Supabase  ──>  3. Apply SQL DDL
                                                               │
                                                               ▼
6. E2E Verification  <──  5. Import Postgres  <──  4. Export & Transform
```

1. **Step 1: Code & Security Audit** (COMPLETE): Remove default passwords, restrict CORS, and update `.gitignore`.
2. **Step 2: Provision Supabase Instance**: Create target Supabase project and record `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
3. **Step 3: Deploy Schema DDL**: Execute SQL migration scripts in Supabase SQL Editor to construct tables and indexes.
4. **Step 4: Export & Transform Local Data**: Extract records from `data/triphoria.db`, map integer/string user IDs to Supabase Auth UUIDs, and prepare JSON payloads.
5. **Step 5: Execute Data Seed Pipeline**: Insert profiles, projects, output versions, audit logs, and CMS records into Supabase Postgres.
6. **Step 6: Execute Playwright Verification**: Run `workflow.spec.js`, `portfolio_playback.spec.js`, and `instagram.spec.js` against staging environment.
7. **Step 7: Cut Over Production Traffic**: Update environment variables and deploy Node/Express control backend to production.
