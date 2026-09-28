# TRIPHORIA — Local Client Demo Runbook

> [!NOTE]
> Operational guide for launching, running, demonstrating, and resetting the TRIPHORIA post-production platform locally.

---

## 1. Prerequisites

* **Node.js**: `>= 22.0.0`
* **Package Manager**: `npm`
* **Database**: Active Supabase PostgreSQL database configured in `.env`
* **Browser**: Chrome / Edge / Firefox / Safari (modern evergreen browser)

---

## 2. Environment Setup

Verify or create `.env` in the project root:

```env
NODE_ENV=development
PORT=3001

# Supabase PostgreSQL Connection String
DATABASE_URL=postgresql://postgres.<project-ref>:<DB_PASSWORD>@<host>:6543/postgres

# Seed Admin Credentials
ADMIN_EMAIL=admin@triphoria.io
ADMIN_PASSWORD=adminpgt

# Storage Token Signing Secret
STORAGE_SECRET=dev-local-storage-hmac-secret-change-in-prod
```

---

## 3. Starting the Application

Run the backend Express server and Vite frontend server in separate terminal windows:

### Terminal 1 — Backend Express API (Port 3001)
```bash
npm run server
```
*Expected Output:*
```text
[TRIPHORIA SERVER] Backend listening on http://localhost:3001
```

### Terminal 2 — Frontend Vite Application (Port 5173)
```bash
npm run dev
```
*Expected Output:*
```text
  VITE v8.2.2  ready in 2400 ms
  ➜  Local:   http://localhost:5173/
```

---

## 4. Local URLs & Key Entry Points

* **Public Homepage**: `http://localhost:5173/`
* **Portfolio Showcase**: `http://localhost:5173/work`
* **Authentication Portal**: `http://localhost:5173/login`
* **Customer Dashboard**: `http://localhost:5173/dashboard`
* **Editor Dashboard**: `http://localhost:5173/editor/dashboard`
* **Admin Dashboard**: `http://localhost:5173/admin/dashboard`
* **API Health Check**: `http://localhost:3001/api/health`

---

## 5. Live Client Demonstration Walkthrough

Follow this 6-phase sequence for a seamless live demonstration:

### Phase 1: Customer Intake & Brief Submission
1. Open `http://localhost:5173/login`.
2. Click **Client Creator** (or sign in as `alex@creator.com` / `clientpgt`).
3. Click **Start New Project**.
4. Enter project details (Project Name, Package, Editing Style, Platform, Target Length, Description).
5. Paste Google Drive footage link (e.g., `https://drive.google.com/drive/folders/demo-footage`).
6. Click **Submit Project to Studio**. Project enters `Pending Approval` status.
7. Sign out.

### Phase 2: Admin Approval & Editor Assignment
1. Sign in as **Super Admin** (`admin@triphoria.io` / `adminpgt`).
2. Navigate to **Production Pipeline Control** (`/admin/dashboard`).
3. Locate the new project in **Pending Approval** status.
4. Click **Approve & Assign**. Select **Marcus Vance** (`marcus@triphoria.io`) and add timeline instructions.
5. Project status advances to `In Progress`.
6. Sign out.

### Phase 3: Editor Cut Delivery (V1)
1. Sign in as **Lead Editor** (`marcus@triphoria.io` / `editorpgt`).
2. Navigate to **Assigned Queue** (`/editor/dashboard`).
3. Open the assigned project, view Google Drive source footage link, and click **Submit Cut for Review**.
4. Enter version details (`v1.0`, format, runtime) and click **Submit Cut for Review**.
5. Project status advances to `Review`.
6. Sign out.

### Phase 4: Customer Review & Revision Request
1. Sign in as **Client Creator** (`alex@creator.com` / `clientpgt`).
2. Open project in **Review** status.
3. Click **Request Revision**.
4. Enter feedback notes (e.g., "Adjust color grade contrast on intro scene").
5. Project routes back to `In Progress` status.
6. Sign out.

### Phase 5: Editor Revision (V2) & Final Customer Approval
1. Sign in as **Lead Editor** (`marcus@triphoria.io` / `editorpgt`).
2. Upload revised master cut (`v2.0`). Project returns to `Review`.
3. Sign in as **Client Creator** (`alex@creator.com` / `clientpgt`).
4. Click **Approve Final Cut**.
5. Project status transitions to `Completed` with 14-day storage retention activated.

### Phase 6: Admin Audit Trail Verification
1. Sign in as **Super Admin** (`admin@triphoria.io` / `adminpgt`).
2. Navigate to **Audit Logs** (`/admin/audit-logs`).
3. Verify full chronological trail (`ORDER_CREATED`, `ORDER_APPROVED`, `EDITOR_ASSIGNED`, `OUTPUT_UPLOADED`, `OUTPUT_REVISION_REQUESTED`, `FINAL_DELIVERY_APPROVED`).

---

## 6. How to Run Verification Tests

### Automated Backend Verification Test
```bash
node test/verify_backend.js
```

### Full Playwright E2E Browser Test
```bash
npx playwright test test/workflow.spec.js
```

---

## 7. How to Stop the Application

In each terminal window, press `Ctrl + C` to stop the backend and frontend dev servers.
