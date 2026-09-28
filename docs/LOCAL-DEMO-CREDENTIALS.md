# TRIPHORIA — Local Client Demo Credentials

> [!IMPORTANT]
> This document lists demo credentials intended strictly for local client demonstrations on `localhost`.
> Never expose production passwords, secret keys, or environment secrets in committed repository files.

---

## 1. Demo User Accounts

The database contains seeded demo accounts representing each role in the TRIPHORIA production ecosystem:

| Role | Name | Email | Local Demo Password | Access Rights |
| :--- | :--- | :--- | :--- | :--- |
| **Super Admin** | Super Admin | `admin@triphoria.io` | `adminpgt` | Full system administration, project approval, editor onboarding & assignment, storage lifecycle governance, CMS management, append-only audit trail inspection. |
| **Lead Editor (A)** | Marcus Vance | `marcus@triphoria.io` | `editorpgt` | Assigned project queue, Google Drive footage access, master cut deliverable upload (V1/V2), timeline notes. |
| **Lead Editor (B)** | Elena Rostova | `elena@triphoria.io` | `editorpgt` | Assigned project queue, Google Drive footage access, master cut deliverable upload (V1/V2), timeline notes. |
| **Client Creator (A)**| Alex Morgan | `alex@creator.com` | `clientpgt` | Customer project creation, Google Drive footage link submission, deliverable review, revision requests, final delivery approval. |
| **Client Creator (B)**| Sarah Jenkins | `sarah@creator.com` | `clientpgt` | Customer project creation, Google Drive footage link submission, deliverable review, revision requests, final delivery approval. |

---

## 2. Authentication Rules

1. **Single Login Portal**: All users (Customers, Editors, Admins) authenticate via the single login portal at `http://localhost:5173/login`.
2. **Server-Determined Roles**: Role authorization is managed strictly on the server (`users.role` column) and returned in the HTTP session cookie (`session_token`).
3. **Tenant & Data Isolation**:
   * Customers can ONLY view and manage their own projects.
   * Editors can ONLY view and manage projects assigned to them by an Admin.
   * Admins have full oversight across all client projects and studio operations.
