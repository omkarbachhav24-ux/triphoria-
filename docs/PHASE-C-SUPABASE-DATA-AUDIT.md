# TRIPHORIA — Phase C: Live Supabase Data Audit + Production Cleanup Plan

- **Branch:** `fix/express-api-supabase-postgres` @ `d77da17` (Phase A + B committed & pushed)
- **This phase is READ-ONLY.** Every query was `SELECT` / `information_schema` / `pg_catalog`. No `INSERT` / `UPDATE` / `DELETE` / DDL. No password rotation. No cleanup. `main`, production, and application source are untouched.
- Connected via the existing configured `DATABASE_URL` (value never printed). Never printed: `password_hash`, passwords, session tokens, `DATABASE_URL`, `STORAGE_SECRET`, service-role keys, full private Google Drive URLs.
- Snapshot time: **2026-09-11 ~00:16 UTC** (server `now()`), PostgreSQL **17.6**, database `postgres`.

> Row counts have grown since the Phase B report (sessions 19→21, audit 45→54, output_versions 4→5, storage_lifecycle 5→8) — the growth is entirely from this project's own Phase A/B verification runs (logins, onboarding tests, `test/verify_backend.js`). No third-party/user traffic.

---

## 1. Current database inventory

| Table | Rows | PK | Foreign keys | Indexes | `created_at` range | `updated_at` range |
|---|---:|---|---|---|---|---|
| `users` | **10** | `id` | *(none defined)* | `users_pkey`, `users_email_key` (unique email) | 2026-09-10T21:34:49.878Z → 22:33:19.437Z | — (no column) |
| `sessions` | **21** | `id` | `user_id → users(id) ON DELETE CASCADE` | `sessions_pkey`, `sessions_token_key` (unique), `idx_sessions_token` | 2026-09-10T21:35:41.783Z → 2026-09-11T00:00:04.879Z | — |
| `orders` | **8** | `id` | `client_id → users(id)`, `assigned_editor_id → users(id)` *(no cascade)* | `orders_pkey`, `orders_idempotency_key_key` (unique), `idx_orders_client`, `idx_orders_editor`, `idx_orders_status` | 2026-08-15T08:00:00Z → 2026-09-10T22:30:07.369Z | 2026-08-15T08:00:00Z → 2026-09-10T22:30:12.283Z |
| `order_files` | **7** | `id` | `order_id → orders(id) ON DELETE CASCADE` | `order_files_pkey` | 2026-08-15T08:00:00Z → 2026-08-28T09:30:00Z | — |
| `output_versions` | **5** | `id` | `order_id → orders(id) ON DELETE CASCADE`, `editor_id → users(id)` *(no cascade, NOT NULL)* | `output_versions_pkey` | — (uses `uploaded_at`) | — |
| `storage_lifecycle` | **8** | `order_id` | `order_id → orders(id) ON DELETE CASCADE` | `storage_lifecycle_pkey` | — | — |
| `audit_events` | **54** | `id` | *(none)* | `audit_events_pkey`, `idx_audit_events_created` | 2026-09-10T21:34:49.878Z → 2026-09-11T00:00:05.072Z | — |
| `cms_projects` | **5** | `id` | *(none)* | `cms_projects_pkey` | 2026-09-10T21:34:49.878Z (all identical) | — |
| `cms_social` | **3** | `id` | *(none)* | `cms_social_pkey` | 2026-09-10T21:34:49.878Z (all identical) | — |
| `idempotency_records` | **3** | `key` | *(none)* | `idempotency_records_pkey` | 2026-09-10T21:35:46.346Z → 22:30:07.369Z | — |

**Total rows across the 10 tables: 124.** Schema matches `server/schema.sql` exactly (all 10 tables, expected columns, PKs, the 3 order indexes + session-token index + audit-created index, the two unique constraints). All timestamps are stored as ISO-8601 **text**. Boolean-ish flags (`is_featured`, `is_published`, `is_authoritative`) are `integer`.

**Relationships (observed):**
```
users ─1:∞→ sessions            (CASCADE on user delete)
users ─1:∞→ orders.client_id
users ─1:∞→ orders.assigned_editor_id   (nullable, no cascade — blocks user delete while referenced)
users ─1:∞→ output_versions.editor_id   (NOT NULL, no cascade — blocks user delete while referenced)
orders ─1:∞→ order_files         (CASCADE)
orders ─1:∞→ output_versions     (CASCADE)
orders ─1:1→ storage_lifecycle   (CASCADE; order_id is the PK)
audit_events / cms_projects / cms_social / idempotency_records — standalone, no FKs
```

---

## 2. User inventory (no hashes / no tokens)

10 users. `has scrypt hash` = `password_hash` matches `^[0-9a-f]{32}:[0-9a-f]{128}$` (the `salt:key` format from `server/db.js` `hashPassword`).

| id | email | name | role | status | created_at (UTC) | scrypt hash | orders (client) | orders (editor) | output_versions | audit rows | sessions | **Class** |
|---|---|---|---|---|---|:--:|--:|--:|--:|--:|--:|:--:|
| `admin-01` | admin@triphoria.io | Super Admin | admin | active | 2026-09-10T21:34:49.878Z | yes | 0 | 0 | 0 | 32 | 10 | **DEMO / seed** |
| `editor-01` | marcus@triphoria.io | Marcus Vance | editor | active | 2026-09-10T21:34:49.878Z | yes | 0 | 4 | 3 | 10 | 5 | **DEMO** |
| `editor-02` | elena@triphoria.io | Elena Rostova | editor | active | 2026-09-10T21:34:49.878Z | yes | 0 | 1 | 2 | 0 | 0 | **DEMO** |
| `editor-03` | leo@triphoria.io | Leo Chen | editor | active | 2026-09-10T21:34:49.878Z | yes | 0 | 1 | 0 | 0 | 0 | **DEMO** |
| `user-101` | alex@creator.com | Alex Morgan | customer | active | 2026-09-10T21:34:49.878Z | yes | 6 | 0 | 0 | 10 | 5 | **DEMO** |
| `user-102` | sam@vlogstudio.io | Samantha Lee | customer | active | 2026-09-10T21:34:49.878Z | yes | 2 | 0 | 0 | 0 | 0 | **DEMO** |
| `editor-4851` | phasea-17202@triphoria.io | Phase A Editor | editor | active | 2026-09-10T22:30:34.851Z | yes | 0 | 0 | 0 | 0 | 0 | **TEST** |
| `editor-3431` | phasea-hash-27325@triphoria.io | Hash Check | editor | active | 2026-09-10T22:31:03.431Z | yes | 0 | 0 | 0 | 1 | 1 | **TEST** |
| `editor-9890` | ui-onboard-1789079569486@triphoria.io | UI Onboard Editor | editor | active | 2026-09-10T22:32:49.890Z | yes | 0 | 0 | 0 | 0 | 0 | **TEST** |
| `editor-9437` | ui-onboard-1789079598963@triphoria.io | UI Onboard Editor | editor | active | 2026-09-10T22:33:19.437Z | yes | 0 | 0 | 0 | 0 | 0 | **TEST** |

**Classification tally:** REAL **0** · DEMO **6** · TEST **4** · UNKNOWN **0**.

**Evidence:**
- **DEMO (6):** ids (`admin-01`, `editor-01/02/03`, `user-101/102`), emails, and names match `DEFAULT_ADMIN` / `INITIAL_EDITORS` / `INITIAL_CUSTOMERS` in `src/data/initialData.js` exactly. All share `created_at = 2026-09-10T21:34:49.878Z`, which is the instant `seedInitialData()` wrote the single `DATABASE_INITIALIZED` audit row (§9, §11). Passwords came from dev fallbacks (§13).
- **TEST (4):** `editor-<4-digit>` runtime ids (the `editor-${Date.now().toString().slice(-4)}` pattern in `POST /api/auth/editors`), emails `phasea-*` / `phasea-hash-*` / `ui-onboard-<ms>@triphoria.io`, and `created_at` values at 22:30–22:33 — created by this project's Phase A API + browser onboarding verification. No orders, ~no audit, ~no sessions. Passwords are random `TP-<base64url>` (not dev fallbacks).
- **REAL / UNKNOWN: none.** Every user is provably seed-origin or created by our own verification runs.

---

## 3. Admin status — `admin@triphoria.io`

| Property | Value |
|---|---|
| Exists? | **Yes** |
| Internal id | `admin-01` |
| Role | `admin` |
| Active? | **Yes** (`status = active`) |
| Has password hash? | **Yes** — valid scrypt `salt:key` (value not read/printed) |
| Created | **2026-09-10T21:34:49.878Z** |
| Earliest audit row for this actor | 2026-09-10T21:35:41.442Z (first login test) |
| **Source** | **`server/db.js` `seedInitialData()`** — created in the same millisecond as the `DATABASE_INITIALIZED` audit row (`audit-1789076094760`, "Relational database initialized on Supabase Postgres with seed records."); `id = "admin-01"` and email match `DEFAULT_ADMIN`. **Not** a migration, **not** a manual Supabase console insert, **not** any other mechanism. |
| Password origin | `process.env.ADMIN_PASSWORD` at seed time, which resolved to a development fallback value (see §13). **Requires rotation before production.** |

No change was made to this account.

---

## 4. Editor inventory

| id | email | class | credential origin | dev-fallback password? |
|---|---|---|---|---|
| `editor-01` marcus | marcus@triphoria.io | **DEMO** | `seedInitialData()` → `INITIAL_EDITORS[0]` | **Yes** — `EDITOR_SEED_PASSWORD` unset ⇒ `NODE_ENV!=='production'` ⇒ the dev-only editor fallback |
| `editor-02` elena | elena@triphoria.io | **DEMO** | seed → `INITIAL_EDITORS[1]` | **Yes** — dev-only editor fallback |
| `editor-03` leo | leo@triphoria.io | **DEMO** | seed → `INITIAL_EDITORS[2]` | **Yes** — dev-only editor fallback |
| `editor-4851` | phasea-17202@triphoria.io | **TEST** | `POST /api/auth/editors` (Phase A API test) | No — random `TP-<base64url>` (~72 bits) |
| `editor-3431` | phasea-hash-27325@triphoria.io | **TEST** | `POST /api/auth/editors` (Phase A hash-verify test) | No — random |
| `editor-9890` | ui-onboard-1789079569486@triphoria.io | **TEST** | admin-UI onboarding (Phase A browser test) | No — `generateEditorPassword()` `TP-XXXX-XXXX` |
| `editor-9437` | ui-onboard-1789079598963@triphoria.io | **TEST** | admin-UI onboarding (Phase A P0-3 browser re-run) | No — `TP-XXXX-XXXX` |

- **Potentially real editors: none.** All 7 are either seed fixtures or artifacts of our own verification.
- 3 demo editors use the **development fallback editor password** → rotation-or-deletion required (§13).
- 4 test editors have unknown random passwords and zero linked work → safe to delete outright.
- Passwords not printed. No password was reset.

---

## 5. Customer inventory

| id | email | class | orders (as client) | audit activity | output_versions | credential origin |
|---|---|---|---:|---:|---:|---|
| `user-101` | alex@creator.com | **DEMO** | 6 (3 demo `TRIP-901x` + 3 test `ORD-xxxx`) | 10 rows (login tests) | 0 | seed → `INITIAL_CUSTOMERS[0]`; dev-fallback customer password |
| `user-102` | sam@vlogstudio.io | **DEMO** | 2 (demo `TRIP-9012`, `TRIP-9014`) | 0 | 0 | seed → `INITIAL_CUSTOMERS[1]`; dev-fallback customer password |

- **Real customers: none.** Both are seed fixtures. `user-101`'s extra 3 orders are `test/verify_backend.js` output, not customer activity.
- Both use the **development fallback customer password**.
- Nothing deleted.

---

## 6. Order inventory (safe metadata only; full Drive URLs not printed)

| id | client | assigned editor | status | package | platform | created_at | updated_at | Drive URL host | idempotency key | **Class** |
|---|---|---|---|---|---|---|---|---|:--:|:--:|
| `TRIP-9015` | user-101 | — | Rejected | Pro Creator | Broadcast TV | 2026-08-15T08:00:00Z | 2026-08-15T08:00:00Z | none | no | **DEMO** |
| `TRIP-9014` | user-102 | editor-03 | Completed | Pro Creator | Instagram Reel / TikTok (9:16) | 2026-08-18T10:00:00Z | 2026-08-18T10:00:00Z | drive.google.com | no | **DEMO** |
| `TRIP-9013` | user-101 | editor-02 | Review | Pro Creator | YouTube (16:9) | 2026-08-24T11:00:00Z | 2026-08-24T11:00:00Z | drive.google.com | no | **DEMO** |
| `TRIP-9012` | user-102 | editor-01 | In Progress | Pro Creator | Commercial (16:9 + 9:16) | 2026-08-26T14:15:00Z | 2026-08-26T14:15:00Z | drive.google.com | no | **DEMO** |
| `TRIP-9011` | user-101 | — | Pending Approval | Pro Creator | YouTube (16:9) | 2026-08-28T09:30:00Z | 2026-08-28T09:30:00Z | drive.google.com | no | **DEMO** |
| `ORD-6346` | user-101 | editor-01 | Completed | Pro Creator | YouTube (16:9) | 2026-09-10T21:35:46.346Z | 2026-09-10T21:35:51.050Z | drive.google.com | yes (`idem-test-*`) | **TEST** |
| `ORD-9094` | user-101 | editor-01 | Completed | Pro Creator | YouTube (16:9) | 2026-09-10T21:41:49.094Z | 2026-09-10T21:41:53.696Z | drive.google.com | yes (`idem-test-*`) | **TEST** |
| `ORD-7369` | user-101 | editor-01 | Completed | Pro Creator | YouTube (16:9) | 2026-09-10T22:30:07.369Z | 2026-09-10T22:30:12.283Z | drive.google.com | yes (`idem-test-*`) | **TEST** |

**Tally:** REAL **0** · DEMO **5** · TEST **3** · UNKNOWN **0**.

- **DEMO:** `TRIP-901x` ids + fixture dates (2026-08-15…08-28) + project names exactly match `INITIAL_ORDERS` in `src/data/initialData.js`; `order_files` for these use fake `s3://triphoria-vault/...` keys (§7c); their `output_versions` point at Big Buck Bunny / Elephants Dream (§7). The `drive.google.com` links are the fixture strings (e.g. `.../folders/1abc-...-Demo`) — not real shares.
- **TEST:** `ORD-<4-digit>` runtime ids, all `project_name = "Live Automated Test Project"` (the literal in `test/verify_backend.js`), all created during Phase A/B runs, all carry `idem-test-*` idempotency keys.

---

## 7. Output / storage inventory

### `output_versions` (5)
| id | order | editor | ver | `is_authoritative` | storage_key kind | sample/demo media? | uploaded_at | **Class** |
|---|---|---|---|:--:|---|:--:|---|:--:|
| `ver-201` | TRIP-9014 | editor-02 | v1.0 | 1 | **external URL** `commondatastorage.googleapis.com` | **YES** (Elephants Dream) | 2026-08-20T17:15:00Z | **DEMO — fake delivery URL** |
| `ver-101` | TRIP-9013 | editor-02 | v1.0 | 1 | **external URL** `commondatastorage.googleapis.com` | **YES** (Big Buck Bunny) | 2026-08-27T16:45:00Z | **DEMO — fake delivery URL** |
| `ver-ORD-6346-0232` | ORD-6346 | editor-01 | v1.0 | 1 | **relative path** (`orders/…` string) | no | 2026-09-10T21:35:50.232Z | **TEST** |
| `ver-ORD-9094-2888` | ORD-9094 | editor-01 | v1.0 | 1 | **relative path** | no | 2026-09-10T21:41:52.888Z | **TEST** |
| `ver-ORD-7369-1452` | ORD-7369 | editor-01 | v1.0 | 1 | **relative path** | no | 2026-09-10T22:30:11.452Z | **TEST** |

- **2 of 5 point at `commondatastorage.googleapis.com` sample videos (Big Buck Bunny / Elephants Dream)** — the remaining fake-media contamination. Both are on demo orders. They are seeded from `INITIAL_ORDERS[*].outputVersions[*].downloadUrl` in `initialData.js`.
- 3 point at **relative-path strings** written by `test/verify_backend.js` — no persistent object exists behind them (no S3/Supabase-Storage, and any local `/uploads` blob is ephemeral and not on Supabase). Effectively "unknown/nonexistent target".
- **No `output_versions` row points at actual persistent production storage.**

### `storage_lifecycle` (8)
| order | status | bytes_total | retention_expires_at | soft_deleted_at | purged_at | **Class** |
|---|---|--:|---|---|---|:--:|
| TRIP-9011 | Active | 3,300,000,000 | — | — | — | DEMO |
| TRIP-9012 | Active | 4,120,000,000 | — | — | — | DEMO |
| TRIP-9013 | Active | 4,040,000,000 | — | — | — | DEMO |
| TRIP-9014 | Retention Period | 1,100,000,000 | 2026-09-03T17:30:00Z | — | — | DEMO |
| TRIP-9015 | Pending Deletion | 450,000,000 | 2026-08-18T09:15:00Z | — | — | DEMO |
| ORD-6346 | Retention Period | 0 | 2026-09-24T21:35:51.050Z | — | — | TEST |
| ORD-9094 | Retention Period | 0 | 2026-09-24T21:41:53.696Z | — | — | TEST |
| ORD-7369 | Retention Period | 0 | 2026-09-24T22:30:12.283Z | — | — | TEST |

`bytes_total` for demo rows are the fixture numbers; the actual bytes do not exist anywhere. All rows are DEMO (5) or TEST (3); status is bookkeeping only.

### `order_files` (7)
All 7 rows belong to demo orders `TRIP-9011…9015`, all `upload_status = completed`, all `storage_key` values are fake `s3://triphoria-vault/orders/…` strings from `INITIAL_ORDERS[*].rawFootage[*].storageKey`. **No S3 bucket `triphoria-vault` is provisioned or referenced by the code.** All **DEMO**.

### Remaining fake / demo / sample media references
| Where | Count | Value pattern |
|---|---:|---|
| `output_versions.storage_key` | 2 | `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/*` |
| `order_files.storage_key` | 7 | `s3://triphoria-vault/orders/*` (non-existent bucket) |
| `cms_projects` playback/video url | 5 | `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/*` (Big Buck Bunny, Elephants Dream, Tears of Steel, …) |
| `cms_social.url` | 3 | `https://www.instagram.com/reel/sample-0x` / `/p/sample-03` |

---

## 8. CMS inventory

### `cms_projects` (5)
| id | title | client | category | published | featured | slot | media host | sample media? | **Class** |
|---|---|---|---|:--:|:--:|:--:|---|:--:|:--:|
| `WORK-02` | AI Hardware Breakdown: 2026 Edition | Silicon Valley Tech Review | YouTube & Longform | 1 | 1 | **1** | commondatastorage.googleapis.com | **YES** | **DEMO** |
| `WORK-01` | Tokyo Cyberpunk // Street Run | @maboroshi.media | Commercial & Brand | 1 | 1 | **2** | commondatastorage.googleapis.com | **YES** | **DEMO** |
| `WORK-03` | Aura // High Fashion Spring 2026 | Vogue Creative Lab | Reels & Shorts | 1 | 1 | **3** | commondatastorage.googleapis.com | **YES** | **DEMO** |
| `WORK-04` | Deep Focus // The Creator's Dilemma | Independent Docu-Series | YouTube & Longform | 1 | 0 | — | commondatastorage.googleapis.com | **YES** | **DEMO** |
| `WORK-05` | Hyper-Shift // Hypercar Launch Reel | Apex Automotive | Commercial & Brand | 1 | 0 | — | commondatastorage.googleapis.com | **YES** | **DEMO** |

### `cms_social` (3)
| id | platform | title | published | url host | sample? | **Class** |
|---|---|---|:--:|---|:--:|:--:|
| `SOC-01` | Instagram Reel | 4K Color Grade Breakdown: S-Log3 to Rec.709 Custom LUT | 1 | www.instagram.com | **YES** (`/reel/sample-01`) | **DEMO** |
| `SOC-02` | Instagram Reel | How to pace a 60-second retention hook | 1 | www.instagram.com | **YES** (`/reel/sample-02`) | **DEMO** |
| `SOC-03` | Instagram Post | Studio Master Rig: Dual FX3 & RED Komodo Post-Sync | 1 | www.instagram.com | **YES** (`/p/sample-03`) | **DEMO** |

**Tally:** REAL **0** · DEMO **8** · TEST **0** · UNKNOWN **0**.

- All 5 `cms_projects` ids/titles/clients match `INITIAL_PORTFOLIO` in `initialData.js`; all created at the seed timestamp; **all 5 media URLs are `commondatastorage.googleapis.com` sample clips**.
- All 3 `cms_social` rows match `INITIAL_SOCIAL`; all URLs are placeholder `instagram.com/.../sample-0x`.
- **Featured question:** there are exactly **3** featured rows in slots **1, 2, 3** (WORK-02, WORK-01, WORK-03) — so the *count* is what production expects, **but the 3 records are development fixtures pointing at Big Buck Bunny / Elephants Dream / Tears of Steel, not intended production videos.** Slots 4/5 (`WORK-04/05`) are published-but-unfeatured fixtures. There is **no real featured content** in the database.

---

## 9. Audit inventory

`audit_events`: **54 rows**, range **2026-09-10T21:34:49.878Z → 2026-09-11T00:00:05.072Z** (≈2.5 hours — the window of our Phase 3 seed + Phase A + Phase B verification).

**By `action`:**
| count | action | origin |
|--:|---|---|
| 12 | `ADMIN_LOGIN_SUCCESS` | our test logins |
| 7 | `EDITOR_LOGIN_SUCCESS` | our test logins |
| 6 | `CUSTOMER_LOGIN_SUCCESS` | our test logins |
| 5 | `LOGIN_FAILED` | our wrong-password tests |
| 4 | `USER_LOGOUT` | our logout tests |
| 4 | `EDITOR_ONBOARDED` | our onboarding tests (→ the 4 TEST editors) |
| 3 | `FEATURED_SLOTS_UPDATED` | `test/verify_backend.js` |
| 3 | `FINAL_DELIVERY_APPROVED` | `test/verify_backend.js` |
| 3 | `ORDER_APPROVED` | `test/verify_backend.js` |
| 3 | `OUTPUT_UPLOADED` | `test/verify_backend.js` |
| 3 | `ORDER_CREATED` | `test/verify_backend.js` (→ the 3 TEST orders) |
| 1 | `DATABASE_INITIALIZED` | **seed** (`seedInitialData()`) |

**By `actor_role`:** admin 27 · editor 11 · customer 10 · guest 5 · system 1.
**By `entity_type`:** Authentication 34 · Orders 12 · Editors 4 · CMS 3 · System 1.
**Distinct actors:** `admin-01`, `admin@triphoria.io`, `editor-01`, `editor-3431`, `user-101`, `system` (6 distinct; the email-form actor is `LOGIN_FAILED` which logs the attempted email).

**Correspondence:** 1 row = demo **seed** marker; the other **53 rows are entirely development/verification activity from this project** (Phases 3, A, B). **Zero rows correspond to real end-user actions.** No logs deleted.

---

## 10. Session inventory (no tokens)

| Metric | Value |
|---|---|
| Total | **21** |
| Expired (`expires_at ≤ now`) | **0** |
| Active (`expires_at > now`) | **21** |
| Distinct users with a session | **4** — `admin-01` (10), `user-101` (5), `editor-01` (5), `editor-3431` (1) |
| `created_at` range | 2026-09-10T21:35:41Z → 2026-09-11T00:00:04Z |

All 21 sessions were created by our own login tests within the last ~2.5 hours; the 30-day `Max-Age` means none has expired yet. No real user sessions. No sessions deleted.

---

## 11. Seed analysis

**Source:** `server/db.js` → `seedInitialData()` (called by `ensureSchema()` → `initSchema()`). It is the *only* seed/DDL mechanism. `scripts/migrate-sqlite-to-postgres.mjs` exists but is never imported by the app and was never run against this DB (no rows have SQLite-origin shapes; there was no prior SQLite prod data).

**What gets seeded:** `admin` (from `DEFAULT_ADMIN` + `ADMIN_EMAIL`/`ADMIN_PASSWORD`), then — **only outside production** — `INITIAL_EDITORS` (3), `INITIAL_CUSTOMERS` (2), `INITIAL_ORDERS` (5 + their `order_files`, `storage_lifecycle`, `output_versions`), `INITIAL_PORTFOLIO` (5 `cms_projects`), `INITIAL_SOCIAL` (3 `cms_social`), and one `DATABASE_INITIALIZED` `audit_events` row.

**When it runs:** on the first request per process (`ensureSchema()` is memoised) — i.e. every cold start / boot until the guard trips.

**Empty-table guard:** `SELECT COUNT(*)::int AS count FROM users; if (rows[0].count > 0) return;` — **seed runs only when `users` is completely empty.**

**Production gate (added in Phase A, commit `1b81d6a`):**
```
const seedDemo = process.env.NODE_ENV !== 'production' || process.env.SEED_DEMO_DATA === 'true';
if (!seedDemo) { /* write DATABASE_INITIALIZED marker */ return; }   // admin-only
```
So a *fresh* production DB seeds **admin only**; demo fixtures need `NODE_ENV !== 'production'` **or** `SEED_DEMO_DATA=true`.

**Passwords (fallback / dev-only):**
| Account set | Env var | Fallback when unset |
|---|---|---|
| admin | `ADMIN_PASSWORD` | `NODE_ENV!=='production'` → dev-only admin fallback; production → `null` ⇒ `process.exit(1)` |
| editors | `EDITOR_SEED_PASSWORD` | `NODE_ENV!=='production'` → dev-only editor fallback; production → random 16-byte hex |
| customers | `CUSTOMER_SEED_PASSWORD` | `NODE_ENV!=='production'` → dev-only customer fallback; production → random 16-byte hex |

**Does changing `ADMIN_PASSWORD` change existing users?** **No.** The seed short-circuits when `users` is non-empty; it never `UPDATE`s. A new `ADMIN_PASSWORD` only matters on an empty-`users` boot.

**Can the seed accidentally recreate demo users?** Only if `users` is emptied (count → 0) **and** the app boots again. Then: in `NODE_ENV=production` (no `SEED_DEMO_DATA`) → **admin only** returns; otherwise → **all demo fixtures** return. This is a real foot-gun for any future "wipe and reset" that runs against a dev-mode process.

**Was the live DB seeded before Phase A?** **Yes.** The `DATABASE_INITIALIZED` row and all seed users/CMS carry `created_at = 2026-09-10T21:34:49.878Z`. That seed ran during the **`5ebbccc` "deploy express api with supabase postgres"** work (the "connect + create schema + seed" step), with the local `.env` set to `NODE_ENV=development` and `ADMIN_PASSWORD` set to the dev fallback. Phase A (`1b81d6a`, the demo-gate + hardening) was committed **after** that. Because the seed pre-dates the gate *and* ran in dev mode, the demo fixtures and dev-fallback passwords are present.

**Timeline:**
```
2026-09-10 ~21:34:49Z  seedInitialData() runs once (dev mode) → admin-01 + 3 editors + 2 customers
                        + 5 orders(+files/lifecycle/outputs) + 5 cms_projects + 3 cms_social + 1 audit
2026-09-10 21:35–22:33  Phase A verification: 4 test editors onboarded; logins/logouts; wrong-pw tests
2026-09-10 21:35–22:30  test/verify_backend.js x3 → 3 ORD-* test orders (+outputs/lifecycle/idempotency),
                        featured-slots updates, order approvals/deliveries
2026-09-11 ~00:00Z      Phase B verification: more admin/editor/customer logins + logout (last audit row)
2026-09-11 ~00:16Z      Phase C read-only audit (this document) — no writes
```

---

## 12. Demo / test contamination findings

| Table | Rows | DEMO | TEST | REAL | UNKNOWN |
|---|--:|--:|--:|--:|--:|
| `users` | 10 | 6 | 4 | 0 | 0 |
| `sessions` | 21 | 0 | 21 | 0 | 0 |
| `orders` | 8 | 5 | 3 | 0 | 0 |
| `order_files` | 7 | 7 | 0 | 0 | 0 |
| `output_versions` | 5 | 2 | 3 | 0 | 0 |
| `storage_lifecycle` | 8 | 5 | 3 | 0 | 0 |
| `audit_events` | 54 | 1 | 53 | 0 | 0 |
| `cms_projects` | 5 | 5 | 0 | 0 | 0 |
| `cms_social` | 3 | 3 | 0 | 0 | 0 |
| `idempotency_records` | 3 | 0 | 3 | 0 | 0 |
| **Total** | **124** | **34** | **90** | **0** | **0** |

**Headline:** the live database is **100% development content** — 34 DEMO (seed fixtures) + 90 TEST (this project's own Phase A/B/verification activity). **Zero real production records.** Contamination is fully explained; nothing is UNKNOWN.

Specific fake-media contamination still present: **2** `output_versions` + **5** `cms_projects` referencing `commondatastorage.googleapis.com` sample videos; **7** `order_files` referencing a non-existent `s3://triphoria-vault` bucket; **3** `cms_social` rows with placeholder `instagram.com/.../sample` URLs.

---

## 13. Password rotation requirements

Passwords are **not printed** and **were not reset** in this phase.

**Accounts whose credentials originated from a development fallback → MUST be rotated (or the account deleted) before production:**

| Account | Fallback value it was seeded with | Recommended |
|---|---|---|
| `admin-01` (admin@triphoria.io) | dev-only admin fallback | **KEEP + ROTATE** — this is the intended production admin identity |
| `editor-01` (marcus@triphoria.io) | dev-only editor fallback | ROTATE **if** kept as real staff; otherwise DELETE (demo) |
| `editor-02` (elena@triphoria.io) | dev-only editor fallback | ROTATE if kept; else DELETE |
| `editor-03` (leo@triphoria.io) | dev-only editor fallback | ROTATE if kept; else DELETE |
| `user-101` (alex@creator.com) | dev-only customer fallback | ROTATE if kept as a real client; otherwise DELETE (demo) |
| `user-102` (sam@vlogstudio.io) | dev-only customer fallback | ROTATE if kept; else DELETE |

`editor-4851 / 3431 / 9890 / 9437` were **not** seeded from fallbacks (random `TP-*`) but are TEST artifacts → **DELETE**, no rotation needed.

**Safe rotation plan (design only — not executed):**

1. **Prereq:** back up the DB (§15). Decide out-of-band the new secrets (min 16 random chars for admin; per-editor unique for any kept editor).
2. **Admin (`admin-01`)** — targeted, non-destructive, one of:
   - **(preferred)** a small server-side one-off using the existing `server/db.js` `hashPassword()`:
     `UPDATE users SET password_hash = $1 WHERE id = 'admin-01'` where `$1 = hashPassword(<new-secret>)`. Runs inside a transaction; verify `SELECT (password_hash ~ '^[0-9a-f]{32}:[0-9a-f]{128}$') FROM users WHERE id='admin-01'` then `COMMIT`. Then invalidate that user's sessions: `DELETE FROM sessions WHERE user_id='admin-01'`.
   - **(alternative)** delete all rows in `users` and let a `NODE_ENV=production` boot re-seed **admin-only** from a fresh `ADMIN_PASSWORD`. Heavier; only sensible if editors/customers are also being purged.
3. **Kept editors / customers (if any)** — same targeted `UPDATE users SET password_hash = hashPassword(<new>) WHERE id = ?`, one row per account, in a transaction, then `DELETE FROM sessions WHERE user_id = ?`. Deliver each new password out-of-band (there is no email service).
4. **Test editors** — not rotated; deleted in cleanup (§14).
5. **New real editors going forward** — onboard via `POST /api/auth/editors` (Phase A: min 10 chars, ~72-bit auto-generated key shown once, scrypt hash only at rest). **New real customers** — self-register via `/register` (recommend adding a strength check in a later phase).
6. **Outcome:** production must not authenticate any account whose password is any of the three development fallback passwords. After rotation, re-verify: login with each old fallback value → **401**.

---

## 14. Proposed cleanup plan (PLAN ONLY — NOT EXECUTED)

> Nothing below has been run. This is a proposal for review. Deletion order matters because of the plain (non-cascade) FKs `orders.assigned_editor_id → users` and `output_versions.editor_id → users`.

| # | Record(s) | Class | Proposed action | Reason |
|---:|---|:--:|---|---|
| 1 | `sessions` — all 21 | TEST | **DELETE ALL** | All are test logins; deleting forces re-login only; zero real-user impact; also clears the way for user deletes (cascades). |
| 2 | `idempotency_records` — `idem-test-*` (3) | TEST | **DELETE** | `test/verify_backend.js` artifacts; no TTL sweeper exists so they'd persist forever. |
| 3 | `orders` `ORD-6346 / ORD-9094 / ORD-7369` (3) | TEST | **DELETE** (cascades `order_files`, `output_versions`, `storage_lifecycle` for these) | "Live Automated Test Project" rows from `verify_backend.js`. |
| 4 | `orders` `TRIP-9011 … TRIP-9015` (5) | DEMO | **DELETE** (cascades their files/outputs/lifecycle) | `INITIAL_ORDERS` fixtures; fake `s3://` raw files; Big Buck Bunny deliverables. |
| 5 | `output_versions` — all remaining (0 after #3+#4) | — | (removed by cascade) | — |
| 6 | `order_files` — all 7 | DEMO | (removed by cascade with #4) | Fake `s3://triphoria-vault` keys. |
| 7 | `storage_lifecycle` — all 8 | DEMO/TEST | (removed by cascade with #3+#4) | Bookkeeping for deleted orders. |
| 8 | `users` `editor-4851 / editor-3431 / editor-9890 / editor-9437` (4) | TEST | **DELETE** (after #1 clears their sessions) | Phase A onboarding-test artifacts; no work attached. |
| 9 | `users` `editor-01 / 02 / 03` (marcus/elena/leo) | DEMO | **DELETE** *(default)* — or **KEEP + ROTATE** if the studio wants them as real staff | Seed fixtures on the dev-only editor fallback. Business decision (Phase D prereq #1). |
| 10 | `users` `user-101 / user-102` (alex/sam) | DEMO | **DELETE** *(default)* — or **KEEP + ROTATE** if real clients | Seed fixtures on the dev-only customer fallback. Business decision. |
| 11 | `users` `admin-01` | DEMO/seed | **KEEP + ROTATE password** (§13) | Intended production admin identity. |
| 12 | `cms_projects` `WORK-01 … WORK-05` (5) | DEMO | **DELETE** | All Big Buck Bunny / sample-video fixtures; not real portfolio. Studio adds real work via `/admin/cms`. |
| 13 | `cms_social` `SOC-01 … SOC-03` (3) | DEMO | **DELETE** | Placeholder `instagram.com/.../sample` URLs. |
| 14 | `audit_events` — 53 non-seed rows | TEST | **RETAIN** (default) — or **ARCHIVE-then-purge** in a marked maintenance window | Append-only trust ledger; deleting history is a bad precedent. If purged, first `COPY`/export to file, then delete `WHERE action <> 'DATABASE_INITIALIZED' AND created_at < <cutover>`, then insert a marker row. |
| 15 | `audit_events` — `DATABASE_INITIALIZED` (1) | seed | **KEEP** | Harmless origin marker. |

**Expected row counts after the default plan (all DEMO+TEST removed, `admin-01` kept, editors/customers deleted, audit retained):**

| Table | Now | After (default) | After (if editors+customers kept) |
|---|--:|--:|--:|
| `users` | 10 | **1** | 6 |
| `sessions` | 21 | **0** | 0 |
| `orders` | 8 | **0** | 0 |
| `order_files` | 7 | **0** | 0 |
| `output_versions` | 5 | **0** | 0 |
| `storage_lifecycle` | 8 | **0** | 0 |
| `audit_events` | 54 | **54** (retain) or 1 (purge) | same |
| `cms_projects` | 5 | **0** | 0 |
| `cms_social` | 3 | **0** | 0 |
| `idempotency_records` | 3 | **0** | 0 |

---

## 15. Backup / rollback plan (for a future Phase D — not this phase)

**Backup (before any write):**
1. Full logical dump: `pg_dump "$DATABASE_URL" -Fc -f triphoria-preD-$(date +%Y%m%dT%H%M%SZ).dump` (custom format, restorable with `pg_restore`). Store **off Supabase** (local + one other location).
2. Confirm the Supabase project's **automatic backup / PITR** availability (plan-dependent — verify in the dashboard; free tier has limited retention).
3. Per-table CSV snapshots for the 10 tables (`\copy (SELECT * FROM <t> ORDER BY 1) TO '<t>.csv' CSV HEADER`) — the exact "before" baseline for diffing.
4. Record the "now" counts (§1) as the pre-change baseline.

**Transaction strategy:** every cleanup step runs inside a single `BEGIN … COMMIT`; within the transaction, run the `DELETE` then the verification `SELECT`s; only `COMMIT` if counts match the plan, else `ROLLBACK`. Never mix unrelated deletes in one transaction. Do destructive steps in the §14 order (sessions/idempotency → orders → editors/customers → CMS).

**Verification queries (run after each step, before `COMMIT`):**
- `SELECT count(*) FROM <table>` = the expected value from §14.
- FK integrity: `SELECT count(*) FROM orders o LEFT JOIN users u ON u.id=o.client_id WHERE u.id IS NULL` → **0**; same for `assigned_editor_id`, `output_versions.editor_id`, all `order_id` FKs.
- KEEP-list intact: `SELECT id,email,role FROM users` returns exactly the intended KEEP set (e.g. just `admin-01`).
- `admin-01` still valid scrypt hash: `SELECT (password_hash ~ '^[0-9a-f]{32}:[0-9a-f]{128}$') FROM users WHERE id='admin-01'` → `true`.
- Sentinel check before running anything: `SELECT current_database()` = `postgres` **and** `SELECT 1 FROM audit_events WHERE action='DATABASE_INITIALIZED'` → 1 row (proves you're on the right DB).

**Rollback:**
- If a step's verification fails → `ROLLBACK` (nothing changed).
- If a bad `COMMIT` already happened → `pg_restore --clean --if-exists -d "$DATABASE_URL" triphoria-preD-*.dump` (or table-level restore from the CSVs), or Supabase PITR to a timestamp just before the change.

**How to confirm no real records were deleted:** there are **zero REAL records** in this database (§12), so the only failure mode is deleting a row later re-classified as "keep". Mitigation: cleanup only proceeds after (a) the backup, (b) a signed-off KEEP list, and (c) a dry-run `SELECT` printing exactly the rows each `DELETE` will remove, reviewed against the KEEP list.

---

## 16. Risks

1. **Deletion-order FK traps.** `orders.assigned_editor_id → users` and `output_versions.editor_id → users` have **no `ON DELETE`** action → deleting `editor-01` fails while `TRIP-9012/9013` or any `ORD-*` reference it. Must delete orders first (they cascade files/outputs/lifecycle), then editors, then customers; sessions cascade on user delete.
2. **Seed foot-gun.** If `users` is emptied and the app boots in a non-production process (or with `SEED_DEMO_DATA=true`), **all demo fixtures return**. Any "reset" must run with `NODE_ENV=production` and `SEED_DEMO_DATA` unset, or with the app stopped.
3. **`ADMIN_PASSWORD` misconception.** Setting a new `ADMIN_PASSWORD` on Vercel does **nothing** to the existing `admin-01` row (seed only runs on empty `users`). Rotation must be an explicit `UPDATE` (§13).
4. **Wrong-database risk.** A cleanup script pointed at the wrong `DATABASE_URL` is catastrophic. Mitigation: sentinel checks (§15) + run only from a reviewed runbook.
5. **Audit-log integrity.** The ledger is append-only by design; purging the 53 test rows (even though they are test activity) weakens that property. Prefer RETAIN, or ARCHIVE-then-purge with a marker row.
6. **No verified PITR.** If the Supabase project is on the free plan, point-in-time recovery may be unavailable — the `pg_dump` becomes the only rollback.
7. **Fake media still live.** Until CMS cleanup, the public storefront (once deployed) would show Big Buck Bunny / Elephants Dream as "studio work" and placeholder Instagram links — reputational risk on a production URL.
8. **Shared DB across environments.** Preview and (future) production would use the **same** `DATABASE_URL`. Any Preview test writes land in the same database being cleaned. Phase D should either use a separate Preview DB/branch or freeze Preview testing during cutover.
9. **`idempotency_records` / `sessions` unbounded.** No TTL sweeper exists; these grow forever. Cleanup is a one-off; a periodic job is a separate follow-up.

---

## 17. Phase D prerequisites

1. **Business decision (blocking):** are `marcus / elena / leo` real editors and `alex / sam` real clients, or purely demo? Determines KEEP+ROTATE vs DELETE for rows 9–10 of §14.
2. **Backup taken and stored off-Supabase** (`pg_dump -Fc`) + per-table CSV baseline + recorded counts.
3. **Supabase plan / PITR availability confirmed** in the dashboard.
4. **New secrets decided out-of-band:** production `ADMIN_PASSWORD` / admin password, plus per-account passwords for any kept editor/customer, plus a fresh `STORAGE_SECRET`, plus the `FRONTEND_URL` origin.
5. **Vercel Preview deployed and green** (the Phase B blocker) — cleanup + rotation must be verified against the deployed backend, not only a local script.
6. **Audit-log handling agreed:** RETAIN (default) vs ARCHIVE-then-purge.
7. **Written cleanup runbook** (the transactioned SQL from §14 in deletion order, with the §15 verification queries inline) — reviewed and approved by the owner before any execution.
8. **Environment isolation decision:** separate database/branch for Preview, or a freeze window, so Preview traffic doesn't re-contaminate during cutover.
9. **Optional code follow-ups** (not blockers): `/register` password-strength check; prod warn/refuse when `FRONTEND_URL` unset; `sessions` / `idempotency_records` TTL sweeper.

---

## Verification / final status

```
DATABASE READ:            PASS   (PostgreSQL 17.6; all 10 tables + information_schema + pg_catalog read successfully; read-only)
npm run lint:             PASS   (oxlint exit 0; 0 errors; 109 pre-existing style warnings)
npm run build:            PASS   (vite exit 0; dist/assets/index-CcMub85t.js 911.92 kB / 230.02 kB gz)

USERS INVENTORIED:        10
ORDERS INVENTORIED:       8
CMS RECORDS:              8   (5 cms_projects + 3 cms_social)

DEMO RECORDS IDENTIFIED:  34   (6 users, 5 orders, 7 order_files, 2 output_versions, 5 storage_lifecycle, 5 cms_projects, 3 cms_social, 1 audit seed marker)
TEST RECORDS IDENTIFIED:  90   (4 users, 3 orders, 3 output_versions, 3 storage_lifecycle, 21 sessions, 53 audit rows, 3 idempotency)
REAL RECORDS IDENTIFIED:  0
UNKNOWN RECORDS:          0

DESTRUCTIVE OPERATIONS:   NONE
PASSWORD ROTATION:        NOT PERFORMED
DATA CLEANUP:             NOT PERFORMED
PRODUCTION:               UNCHANGED
MAIN:                     UNCHANGED
LIVE SUPABASE DATA:       UNCHANGED (read-only session; no INSERT/UPDATE/DELETE/DDL issued)

FINAL STATUS:             READY FOR PHASE D — with the §17 prerequisites (business decision on demo editors/customers, backup, secrets, and the Phase B Vercel Preview) resolved first. The database is NOT clean and is NOT production-ready: it is 100% development content (34 demo + 90 test rows, 0 real). Cleanup and rotation are planned only.
```
