# TRIPHORIA Architecture

## Stack

- **Frontend**: React 19 + Vite 8 + Tailwind CSS v4 + Motion v13
- **Backend**: Express 5 + Node.js
- **Database**: SQLite (WAL mode, foreign keys)
- **Auth**: scrypt password hashing, HttpOnly session cookies
- **Media**: Customer Google Drive (link storage only)
- **CMS**: SQLite-backed admin CMS (Phase 2: Google Sheets)

## Database Schema

### users
| Column | Type | Notes |
| :--- | :--- | :--- |
| id | TEXT PK | `admin-01`, `editor-01`, `user-101` |
| name | TEXT | |
| email | TEXT UNIQUE | |
| password_hash | TEXT | scrypt |
| role | TEXT | `admin`, `editor`, `customer` |
| specialty | TEXT | Editor specialty |
| max_capacity | INTEGER | Editor capacity |
| status | TEXT | `active`, `disabled` |
| created_at | TEXT | ISO 8601 |

### orders
| Column | Type | Notes |
| :--- | :--- | :--- |
| id | TEXT PK | `TRIP-XXXX` |
| client_id | TEXT FK → users | |
| status | TEXT | Pending Approval, In Progress, Review, Completed, Rejected |
| google_drive_url | TEXT | Customer footage link |
| project_name | TEXT | |
| package_name | TEXT | |
| editing_style | TEXT | |
| platform | TEXT | YouTube, TikTok, etc. |
| target_length | TEXT | |
| instructions | TEXT | |
| deadline | TEXT | |
| assigned_editor_id | TEXT FK → users | |
| rejection_reason | TEXT | |
| created_at | TEXT | |
| updated_at | TEXT | |

### output_versions
| Column | Type | Notes |
| :--- | :--- | :--- |
| id | TEXT PK | |
| order_id | TEXT FK → orders | |
| version_tag | TEXT | v1.0, v2.0 |
| editor_id | TEXT FK → users | |
| storage_key | TEXT | Delivery reference |
| format | TEXT | |
| resolution | TEXT | |
| runtime | TEXT | |
| notes | TEXT | |
| uploaded_at | TEXT | |

### audit_events
| Column | Type | Notes |
| :--- | :--- | :--- |
| id | TEXT PK | |
| actor_id | TEXT | User who performed action |
| actor_role | TEXT | |
| action | TEXT | LOGIN, PROJECT_CREATED, etc. |
| entity_type | TEXT | |
| entity_id | TEXT | |
| details | TEXT | |
| metadata_json | TEXT | |
| created_at | TEXT | |

### cms_projects
Portfolio items managed by Super Admin.

### cms_social
Social media content managed by Super Admin.

## API Routes

| Method | Path | Auth | Role |
| :--- | :--- | :--- | :--- |
| POST | /api/auth/login | Public | — |
| POST | /api/auth/logout | Auth | Any |
| GET | /api/auth/me | Auth | Any |
| GET | /api/orders | Auth | Scoped by role |
| POST | /api/orders | Auth | Customer |
| POST | /api/orders/:id/approve | Auth | Admin |
| POST | /api/orders/:id/reject | Auth | Admin |
| POST | /api/orders/:id/reassign | Auth | Admin |
| POST | /api/orders/:id/outputs | Auth | Editor |
| POST | /api/orders/:id/complete | Auth | Admin |
| GET | /api/cms/portfolio | Public | — |
| GET | /api/cms/featured | Public | — |
| POST | /api/cms/portfolio | Auth | Admin |
| GET | /api/audit-logs | Auth | Admin |

## Security Model

- Passwords: scrypt with random salt
- Sessions: 32-byte random tokens in SQLite
- Cookies: HttpOnly, SameSite=Lax, Secure in production
- Authorization: Server-side role checks on every endpoint
- Role: Never trusted from client
