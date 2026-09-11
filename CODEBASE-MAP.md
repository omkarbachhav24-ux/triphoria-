# TRIPHORIA — CODEBASE MAP

> Authority: **current source code** on branch `fix/express-api-supabase-postgres` @ `5ebbccc4a165d45acd47c7b7fd026bd2f802e0ca`.
> Where older `docs/*.md` conflict with the code, the code wins and the conflict is called out.
> Read-only study. No files were modified to produce this document (this file is a new addition).

---

## 0. TL;DR stack

| Concern | Reality (from code) |
|---|---|
| Frontend | React **19.2** + Vite **8.2** SPA, Tailwind **4.3** (`@tailwindcss/vite`), `motion` **13.2**, `lucide-react`. No TypeScript. No react-router — custom history router in [src/App.jsx](src/App.jsx). |
| Backend | **Express 5.2** ([server/app.js](server/app.js)); one app, mounted both as a local listener ([server/index.js](server/index.js)) and a Vercel function ([api/index.js](api/index.js)). |
| DB | **Supabase PostgreSQL 17.6**, project `dficeyovhghbgiikwwmb`, region `ap-northeast-1`. Accessed **only server-side** via `pg` **8.23** `Pool` on `DATABASE_URL`. No Supabase Auth, no RLS, no PostgREST, no `@supabase/*` package. |
| Auth | Custom Express **session cookie** auth ([server/auth.js](server/auth.js)): `scrypt` hashing, opaque 32-byte DB-backed tokens, 30-day `httpOnly` cookie. |
| Deploy target | Vercel ([vercel.json](vercel.json)) — SPA static + `/api/*` → serverless function. |

---

## 1. Directory / file tree (source + infra only; `node_modules`, `dist`, `.agents`, `docs/visual-qa` omitted)

```
triphoria/
├── api/
│   └── index.js                      # Vercel serverless entrypoint → exports server/app.js
├── server/
│   ├── app.js                        # Express app (no listen): middleware, ensureSchema gate, routes, error handler
│   ├── index.js                      # Local launcher: ensureSchema() → app.listen(PORT||3001)
│   ├── db.js                         # pg Pool, query/queryOne/withTransaction, scrypt hash, ensureSchema+seed
│   ├── auth.js                       # sessions, cookie, authMiddleware, requireAuth, requireRole
│   ├── schema.sql                    # PostgreSQL DDL (10 tables, idempotent)
│   ├── storage.js                    # HMAC presigned upload/download tokens, local-FS stream writer
│   └── routes/
│       ├── auth.routes.js            # /api/auth/*   + logAuditEvent() helper (exported)
│       ├── orders.routes.js          # /api/orders/* + order state machine
│       ├── cms.routes.js             # /api/cms/*    (public + admin)
│       ├── audit.routes.js           # /api/audit-logs (admin)
│       └── upload.routes.js          # /api/storage/* (presigned tokens, binary ingest, download)
├── scripts/
│   └── migrate-sqlite-to-postgres.mjs # optional one-off: old data/triphoria.db → Postgres
├── src/
│   ├── main.jsx                      # ReactDOM root + provider nesting
│   ├── App.jsx                       # custom router + layout shell
│   ├── App.css / index.css           # Tailwind entry + component classes (.triphoria-input, .btn-*)
│   ├── lib/utils.js                  # cn() = twMerge(clsx())
│   ├── data/initialData.js           # seed constants (DEFAULT_ADMIN, INITIAL_EDITORS/CUSTOMERS/ORDERS/PORTFOLIO/SOCIAL, + unused INITIAL_AUDIT_LOGS/INITIAL_CMS)
│   ├── design-system/
│   │   ├── motionTokens.js           # color/space/type token spec (Motion.dev design language)
│   │   └── motionPresets.js          # easing/spring presets
│   ├── context/
│   │   ├── AuthContext.jsx           # session + editor roster + permission helpers
│   │   ├── OrderContext.jsx          # orders CRUD + state-machine actions + STATE_EXPLANATIONS
│   │   ├── CMSContext.jsx            # portfolio / featured / social
│   │   ├── AuditLogContext.jsx       # audit log fetch (admin) + optimistic local append
│   │   └── CursorContext.jsx         # custom-cursor UI state (no network)
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.jsx            # role-aware nav, DEV role-switch ribbon, mobile drawer, logout
│   │   │   └── Footer.jsx
│   │   ├── common/
│   │   │   ├── StatusBadge.jsx       # order-status pill (uses STATE_EXPLANATIONS)
│   │   │   ├── VideoPlayer.jsx       # + getAutoThumbnail(), extractVideoEmbed()
│   │   │   ├── InstagramEmbed.jsx    # used only inside VideoPlayer
│   │   │   ├── VideoThumbnailScrubber.jsx  # used only in WorkPage
│   │   │   └── InvoiceModal.jsx      # ⚠ DEAD CODE — never imported
│   │   ├── ui/                       # CookieBanner, smooth-scroll(lenis), film-primitives,
│   │   │                            #   button, magnetic-button, rainbow-button, motion-primitives,
│   │   │                            #   continuous-timeline, container-scroll-animation,
│   │   │                            #   phone-carousel, custom-cursor
│   │   └── motion-ui/               # CodeBlock, CommandMenu, CopyButton, LiveExample,
│   │                               #   MotionButton, RuntimeSwitcher  (MotionDocsPage + WorkPage)
│   └── pages/
│       ├── customer/  HomePage, WorkPage, AuthPage, OrderFlowPage, OrderSuccessPage, CustomerDashboard
│       ├── editor/    EditorDashboard
│       ├── admin/     BusinessDashboard, AdminOrdersPage, EditorsManagementPage, CMSManagerPage, AuditLogsPage
│       └── docs/      MotionDocsPage
├── test/
│   ├── verify_backend.js             # 24-assertion Node E2E against http://127.0.0.1:3001
│   ├── workflow.spec.js / login_debug.spec.js / portfolio_playback.spec.js / instagram.spec.js  (Playwright)
├── index.html                        # Vite HTML shell (Google Fonts: Inter, JetBrains Mono)
├── vite.config.js                    # React + Tailwind plugins, @ alias, dev proxy /api + /uploads → :3001
├── vercel.json                       # framework vite, build/output, /api & /uploads rewrites, SPA fallback
├── package.json                      # scripts, deps (adds pg), engines.node >=22
├── .env.example                      # placeholders only (no secrets)
├── .gitignore                        # ignores .env, .env.*, data/, uploads/, *.db, *.sqlite, dist, node_modules
├── playwright.config.js              # boots `npm run server` + `npm run dev`
├── components.json / .oxlintrc.json / skills-lock.json / AGENTS.md / README.md
└── docs/*.md                         # 25 prior design/architecture notes (SOME NOW STALE — see §22/§30)
```

---

## 2. Frontend architecture

- **Entry** [src/main.jsx](src/main.jsx): `ReactDOM.createRoot(#root)` renders inside `React.StrictMode` and a **fixed provider stack** (outer→inner):
  `AuthProvider → AuditLogProvider → OrderProvider → CMSProvider → CursorProvider → <App/>`.
  Order matters: Order/CMS/AuditLog contexts all call `useAuth()`.
- **Routing** [src/App.jsx](src/App.jsx) — hand-rolled, no library:
  - State: `currentPath` from `window.location.pathname`; navigation via `navigateTo()` which calls `window.history.pushState` + `window.scrollTo`; `popstate` listener syncs back/forward.
  - Hash / section links (`/#services`, `/services`, `/how-it-works`, `/about`, `/contact`) scroll to an element id on `/`.
  - `renderPage()` is a big switch; route **guards are inline** (see §10).
  - `/docs` short-circuits before the layout shell (renders `MotionDocsPage` bare).
- **Layout shell**: `<SmoothScroll>` (lenis) › `<Navbar>` › `<main>{renderPage()}</main>` › `<Footer>` › `<CookieBanner>`.
- **Data fetching**: every context uses `fetch('/api/...', { credentials: 'include' })` with **relative URLs** (no `import.meta.env` base). Works in dev via the Vite proxy; in prod requires same-origin `/api` (the Vercel function).
- **No client-side state persistence** beyond `localStorage['triphoria_cookie_consent']` (CookieBanner). Auth/session/orders are never mirrored to localStorage.
- **Build**: `vite build` → `dist/` (single JS chunk ~0.9 MB / ~0.23 MB gzip, single CSS ~0.11 MB). `import.meta.env.DEV` gates the Navbar "Studio Workspace" ribbon and the AuthPage quick-login buttons.

---

## 3. React contexts and the state each owns

| Context (file) | Owned state | Actions exposed | Server calls | Notes |
|---|---|---|---|---|
| **AuthContext** [src/context/AuthContext.jsx](src/context/AuthContext.jsx) | `user` (server session identity or `null`), `editors[]` (roster), `loading` (initial session check) | `login`, `register`, `logout`, `switchRole`, `addEditor`, `deleteEditor`, `generateEditorPassword`, `refreshEditors`, `canAccessOrder(user,order)`, `canPerformAction(user,action,order)` | `GET /api/auth/me` (mount), `GET /api/auth/editors` (on every `user` change), `POST /api/auth/login`, `POST /api/auth/register`, `POST /api/auth/logout`, `POST /api/auth/editors`, `DELETE /api/auth/editors/:id` | `switchRole` calls `login()` with hardcoded seed creds; DEV-only usage. `canAccess*` helpers are **advisory UI-only** (mirror server RBAC). |
| **OrderContext** [src/context/OrderContext.jsx](src/context/OrderContext.jsx) | `orders[]` (already server-scoped to the caller), `loading` | `createOrder`, `approveOrder`, `rejectOrder`, `reassignEditor`, `uploadEditorOutput`, `approveFinalDelivery`, `requestRevision`, `softDeleteStorage`, `restoreStorage`, `purgeStorage`, `trackDownload`, `getOrderById`, `refreshOrders` | `GET /api/orders`; `POST /api/orders` (+`idempotency-key` header); `POST /api/orders/:id/{approve,reject,reassign,outputs,complete,revision}`; `POST /api/orders/:id/storage/{soft-delete,restore,purge}`; `GET /api/storage/authorize-download` | Also exports `STATE_EXPLANATIONS` (5 status strings). `refreshOrders` no-ops when `!user`. |
| **CMSContext** [src/context/CMSContext.jsx](src/context/CMSContext.jsx) | `portfolio[]`, `featured[]`, `social[]`, `loading` | `setFeaturedSlots`, `addPortfolioProject`, `updatePortfolioProject`, `deletePortfolioProject`, `toggleProjectPublish`, `addSocialPost`, `deleteSocialPost`, `toggleSocialPublish`, `refreshCMS` | `GET /api/cms/portfolio` **or** `/api/cms/admin/portfolio` (if `user.role==='admin'`); `GET /api/cms/featured`; `GET /api/cms/social` **or** `/api/cms/admin/social`; `POST /api/cms/featured-slots`; `POST/PUT/DELETE /api/cms/portfolio[/:id]`; `POST/DELETE /api/cms/social[/:id]` | `toggleProjectPublish` = `updatePortfolioProject({isPublished:!x})`. `toggleSocialPublish` = **delete + re-add** (loses id/created_at). |
| **AuditLogContext** [src/context/AuditLogContext.jsx](src/context/AuditLogContext.jsx) | `auditLogs[]`, `loading` | `refreshLogs` (returns nothing unless `user.role==='admin'`), `logAction(entry)` (optimistic local prepend only — **never persisted**) | `GET /api/audit-logs` | ⚠ Key is **`auditLogs`**. `AuditLogsPage` reads `logs` → see §30. |
| **CursorContext** [src/context/CursorContext.jsx](src/context/CursorContext.jsx) | `cursorType`, `cursorText`, `isTouchDevice` | `setCursor(type,text)`, `resetCursor()` | none | Pure UI; disabled on touch devices. |

---

## 4. Pages and purpose

| Route(s) | Component (file) | Guard | Purpose |
|---|---|---|---|
| `/` | HomePage [src/pages/customer/HomePage.jsx](src/pages/customer/HomePage.jsx) | public | Marketing landing: hero w/ timecode, services, "how it works", featured work (from `useCMS().portfolio`/`social`), pricing tiers (hardcoded in-page), CTA → `/order`. |
| `/work` | WorkPage [src/pages/customer/WorkPage.jsx](src/pages/customer/WorkPage.jsx) | public | Portfolio gallery with category filter, `VideoThumbnailScrubber`, modal `VideoPlayer`. Reads `useCMS().portfolio`. |
| `/login`, `/auth`, `/admin/login` | AuthPage [src/pages/customer/AuthPage.jsx](src/pages/customer/AuthPage.jsx) | public | Single login/register form → `useAuth().login`/`register`; redirects by returned `user.role` (`/admin/dashboard` \| `/editor/dashboard` \| `/dashboard`). DEV-only quick-login buttons for the 3 seed roles. |
| `/order` | OrderFlowPage [src/pages/customer/OrderFlowPage.jsx](src/pages/customer/OrderFlowPage.jsx) | public until submit | 3-step brief wizard (details → Google Drive link (host-validated client-side) → review). `handleSubmit` → `useOrders().createOrder`; if `!user` redirects to `/login` (no draft persistence). |
| `/order/success/:id` | OrderSuccessPage [src/pages/customer/OrderSuccessPage.jsx](src/pages/customer/OrderSuccessPage.jsx) | public | Confirmation; looks up the order in `useOrders().orders` (falls back to placeholder text if not found). |
| `/dashboard` | CustomerDashboard [src/pages/customer/CustomerDashboard.jsx](src/pages/customer/CustomerDashboard.jsx) | `user` truthy | Customer's projects: status tallies, list + detail panel, watch preview, **Approve Final Cut** / **Request Revision** (status `Review`), **Download Master** (status `Completed`). Client-side re-filters `orders` by `customerEmail`/`userId`. |
| `/editor/dashboard` (any `/editor/*`) | EditorDashboard [src/pages/editor/EditorDashboard.jsx](src/pages/editor/EditorDashboard.jsx) | `isEditor \|\| isAdmin` | Assigned queue only (`orders.filter(o => o.assignedEditorId === user.id)`): brief, Google Drive link, editing directives, **Upload Output Cut** modal (metadata + a URL) → `uploadEditorOutput` (In Progress → Review). |
| `/admin/dashboard` (+ `/admin/*` default, `/admin/storage`†) | BusinessDashboard [src/pages/admin/BusinessDashboard.jsx](src/pages/admin/BusinessDashboard.jsx) | `isAdmin` | Ops overview: pending / in-progress / review counts, <48h deadline alerts, pending-approval queue, editor capacity snapshot, nav tiles. |
| `/admin/orders`, `/admin/production` | AdminOrdersPage [src/pages/admin/AdminOrdersPage.jsx](src/pages/admin/AdminOrdersPage.jsx) | `isAdmin` | Full order queue w/ filter + search; **Approve & Assign** (pick editor), **Reject** (reason), **Reassign** (while In Progress), **Approve Delivery** / **Request Revision** (while Review), output previews. |
| `/admin/editors` | EditorsManagementPage [src/pages/admin/EditorsManagementPage.jsx](src/pages/admin/EditorsManagementPage.jsx) | `isAdmin` | Roster grid w/ per-editor live workload (computed from `orders`); **Onboard editor** modal (auto password) → `addEditor`; **Deactivate** (blocked if active projects); reassign. ⚠ onboard banner shows blank values — see §30. |
| `/admin/cms` | CMSManagerPage [src/pages/admin/CMSManagerPage.jsx](src/pages/admin/CMSManagerPage.jsx) | `isAdmin` | 3 tabs: **Featured Work** (3 slots, atomic save), **Portfolio Archive** (CRUD + publish toggle), **Instagram & Social** (add/delete/publish). Uses `getAutoThumbnail`. |
| `/admin/audit-logs` | AuditLogsPage [src/pages/admin/AuditLogsPage.jsx](src/pages/admin/AuditLogsPage.jsx) | `isAdmin` | Searchable/filterable audit table. ⚠ **Crashes on render** — see §30. |
| `/docs` | MotionDocsPage [src/pages/docs/MotionDocsPage.jsx](src/pages/docs/MotionDocsPage.jsx) | none | Internal Motion design-system documentation (CodeBlock/CommandMenu/LiveExample/RuntimeSwitcher). |

† `/admin/storage` is a Navbar link with **no matching route** → `renderPage()` default returns `BusinessDashboard`.

---

## 5. Reusable components and where used

| Component (file) | Used by |
|---|---|
| `Navbar` [components/layout/Navbar.jsx](src/components/layout/Navbar.jsx) | App shell. Role-aware links; **DEV** "Switch Workspace" ribbon → `useAuth().switchRole`; mobile drawer; `logout`. |
| `Footer` [components/layout/Footer.jsx](src/components/layout/Footer.jsx) | App shell. |
| `StatusBadge` [components/common/StatusBadge.jsx](src/components/common/StatusBadge.jsx) | AdminOrdersPage, BusinessDashboard, EditorsManagementPage, CustomerDashboard, OrderSuccessPage, EditorDashboard. Reads `STATE_EXPLANATIONS` from OrderContext. |
| `VideoPlayer` (+ `getAutoThumbnail`, `extractVideoEmbed`) [components/common/VideoPlayer.jsx](src/components/common/VideoPlayer.jsx) | HomePage, WorkPage, CustomerDashboard, EditorDashboard, AdminOrdersPage, CMSManagerPage. |
| `InstagramEmbed` [components/common/InstagramEmbed.jsx](src/components/common/InstagramEmbed.jsx) | `VideoPlayer` only. |
| `VideoThumbnailScrubber` [components/common/VideoThumbnailScrubber.jsx](src/components/common/VideoThumbnailScrubber.jsx) | WorkPage only. |
| `InvoiceModal` [components/common/InvoiceModal.jsx](src/components/common/InvoiceModal.jsx) | **Nothing — dead code.** |
| `CookieBanner` [components/ui/CookieBanner.jsx](src/components/ui/CookieBanner.jsx) | App shell. `localStorage['triphoria_cookie_consent']`. |
| `SmoothScroll` [components/ui/smooth-scroll.jsx](src/components/ui/smooth-scroll.jsx) | App shell (lenis wrapper). |
| `CropMarks`, `TimelineTickTrack` [components/ui/film-primitives.jsx](src/components/ui/film-primitives.jsx) | HomePage. |
| `motion-primitives.jsx` | `continuous-timeline.jsx`, `phone-carousel.jsx`. |
| `magnetic-button.jsx` | `rainbow-button.jsx`. |
| `button.jsx`, `container-scroll-animation.jsx`, `custom-cursor.jsx`, `phone-carousel.jsx`, `continuous-timeline.jsx`, `rainbow-button.jsx` | Marketing/landing + docs surfaces (HomePage / MotionDocsPage). |
| `motion-ui/*` (CodeBlock, CommandMenu, CopyButton, LiveExample, RuntimeSwitcher) | MotionDocsPage. `MotionButton` also in WorkPage. |
| `design-system/motionTokens.js`, `motionPresets.js` | Token/preset specs consumed by `motion-ui` / docs. |

---

## 6. Frontend → API call map (complete)

All calls are relative and send `credentials: 'include'`.

| Caller (file:line) | Method | Path | Body / params |
|---|---|---|---|
| AuthContext:14 | GET | `/api/auth/me` | — |
| AuthContext:34,126 | GET / POST | `/api/auth/editors` | POST: `{name,email,password,specialty,maxCapacity,avatar}` |
| AuthContext:51 | POST | `/api/auth/login` | `{email,password}` |
| AuthContext:74 | POST | `/api/auth/register` | `{name,email,password,organization}` |
| AuthContext:97 | POST | `/api/auth/logout` | — |
| AuthContext:149 | DELETE | `/api/auth/editors/:id` | — |
| OrderContext:28 | GET | `/api/orders` | — |
| OrderContext:49 | POST | `/api/orders` | header `idempotency-key`; `{projectName,packageName,platform,editingStyle,targetLength,instructions,googleDriveUrl,deadline,idempotencyToken}` |
| OrderContext:75 | POST | `/api/orders/:id/approve` | `{editorId,adminNotes}` |
| OrderContext:104 | POST | `/api/orders/:id/reject` | `{rejectionReason}` |
| OrderContext:128 | POST | `/api/orders/:id/reassign` | `{newEditorId}` |
| OrderContext:152 | POST | `/api/orders/:id/outputs` | `{version,filename,format,resolution,runtime,sizeDisplay,downloadUrl,notes}` |
| OrderContext:176 | POST | `/api/orders/:id/complete` | — |
| OrderContext:203 | POST | `/api/orders/:id/revision` | `{revisionNotes}` |
| OrderContext:227/240/253 | POST | `/api/orders/:id/storage/{soft-delete,restore,purge}` | — |
| OrderContext:267 | GET | `/api/storage/authorize-download?orderId=&storageKey=&filename=` | query |
| CMSContext:21 | GET | `/api/cms/portfolio` \| `/api/cms/admin/portfolio` | — |
| CMSContext:28 | GET | `/api/cms/featured` | — |
| CMSContext:36 | GET | `/api/cms/social` \| `/api/cms/admin/social` | — |
| CMSContext:55 | POST | `/api/cms/featured-slots` | `{slot1Id,slot2Id,slot3Id}` |
| CMSContext:75 | POST | `/api/cms/portfolio` | project payload |
| CMSContext:94 | PUT | `/api/cms/portfolio/:id` | partial project payload |
| CMSContext:113 | DELETE | `/api/cms/portfolio/:id` | — |
| CMSContext:137 | POST | `/api/cms/social` | `{platform,url,title,caption,thumbnail,likes,isPublished}` |
| CMSContext:156 | DELETE | `/api/cms/social/:id` | — |
| AuditLogContext:19 | GET | `/api/audit-logs` | — |

`POST /api/storage/authorize-upload` and `PUT /api/storage/upload` exist server-side but are **not called by any frontend code** (only by `test/verify_backend.js`).

---

## 7. Express application architecture

[server/app.js](server/app.js) builds the app; [api/index.js](api/index.js) `export default app` (Vercel); [server/index.js](server/index.js) `ensureSchema().then(() => app.listen(PORT))` (local).

Middleware order:
1. `app.set('trust proxy', 1)` — so `Secure` cookies work behind Vercel's proxy.
2. `cors({ origin: process.env.FRONTEND_URL || true, credentials: true })` — reflects request origin unless `FRONTEND_URL` set.
3. `cookieParser()`
4. `express.json({ limit: '50mb' })`, `express.urlencoded({ extended: true, limit: '50mb' })`
5. **schema gate** — `await ensureSchema()` (memoised); on failure responds `503 {code:'DB_UNAVAILABLE'}` and does not continue.
6. `authMiddleware` — resolves `req.user` / `req.sessionToken` from the `session_token` cookie or `Authorization: Bearer <token>`.
7. `express.static('/uploads', ../uploads)` — local dev only; ephemeral on Vercel.
8. `GET /api/health` — `{status,service,database:'Supabase Postgres',runtime,timestamp}`.
9. Routers: `/api/auth`, `/api/orders`, `/api/cms`, `/api/audit-logs`, `/api/storage`.
10. Global error handler — `{error, code}` with `err.status || 500`.

DB access layer [server/db.js](server/db.js):
- `pool` = `new pg.Pool({ connectionString: DATABASE_URL, ssl: <false for localhost else {rejectUnauthorized:false}>, max: process.env.VERCEL ? 1 : 10 })`.
- `pg.types.setTypeParser(20, parseInt)` — BIGINT (`int8`) returned as JS number.
- `query(text,params)`, `queryOne(text,params)` → first row or `null`, `withTransaction(fn)` → `BEGIN` / `fn(client)` / `COMMIT` / auto-`ROLLBACK`.
- `hashPassword` / `verifyPassword` — `node:crypto` `scryptSync(pw, salt, 64)` → stored `"<saltHex>:<keyHex>"`; verify uses `timingSafeEqual`.
- `ensureSchema()` — memoised promise; runs `schema.sql` (multi-statement simple query) then `seedInitialData()` **only if `SELECT COUNT(*) FROM users` is 0**.

---

## 8. API endpoint reference

Auth column: **none** = no middleware guard; **requireAuth** = any valid session; **requireRole('admin')** = admin only.
Every mutating route also writes one `audit_events` row via `logAuditEvent()` unless noted.

### /api/auth  ([server/routes/auth.routes.js](src/../server/routes/auth.routes.js))

| Method | Path | Auth | Roles | Request | Response | Tables |
|---|---|---|---|---|---|---|
| GET | `/api/auth/me` | none | any | — | `{user, authenticated}` (`user` is the raw session-join row incl. `max_capacity`,`avatar_url`,`status`, or `null`) | (reads `sessions`+`users` via middleware) |
| POST | `/api/auth/login` | none | any | `{email,password}` | `400` missing / `401` bad creds / `403` deactivated / `200 {success,user}` + `Set-Cookie session_token` | read `users`; write `sessions`; write `audit_events` (`LOGIN_FAILED` or `<ROLE>_LOGIN_SUCCESS`) |
| POST | `/api/auth/logout` | none | any | — | `200 {success}` + clears cookie | delete `sessions` (by token); write `audit_events` (`USER_LOGOUT`) if `req.user` |
| POST | `/api/auth/register` | none | any | `{name,email,password,organization}` | `400` / `409` exists / `201 {success,user}` + cookie | read+write `users` (role hard-set `'customer'`, id `user-<ts>`, dicebear avatar); write `sessions`; write `audit_events` |
| GET | `/api/auth/editors` | **none** | **any (public)** | — | `{editors:[{id,name,email,role,specialty,maxCapacity,avatar,joinedDate,status,activeProjects}]}` | read `users` LEFT JOIN `orders` GROUP BY (`activeProjects` = count of In Progress/Review) |
| POST | `/api/auth/editors` | requireRole('admin') | admin | `{name*,email*,password?,specialty?,maxCapacity?,avatar?}` | `400` / `409` / `201 {success,editor:{…,password}}` (plaintext pw returned once) | read+write `users` (id `editor-<ts4>`); write `audit_events` (`EDITOR_ONBOARDED`) |
| DELETE | `/api/auth/editors/:id` | requireRole('admin') | admin | — | `400` if editor has In Progress/Review orders / `200 {success}` | read `orders`; update `users.status='deactivated'`; write `audit_events` |

### /api/orders  ([server/routes/orders.routes.js](server/routes/orders.routes.js))

`formatOrderResponse(row)` hydrates each order with `rawFootage` (from `order_files`), `outputVersions` (from `output_versions`+editor name), `storageLifecycle` (from `storage_lifecycle`).

| Method | Path | Auth | Roles | Request | Response | Tables |
|---|---|---|---|---|---|---|
| GET | `/api/orders` | requireAuth | any | — | `{orders:[…]}` **scoped**: admin → all; editor → `assigned_editor_id = me`; customer → `client_id = me` | read `orders`+`users`, `order_files`, `output_versions`, `storage_lifecycle` |
| GET | `/api/orders/:id` | requireAuth | any | — | `404` / `403` unless admin \| `client_id==me` \| `assigned_editor_id==me` / `200 {order}` | same reads |
| POST | `/api/orders` | requireAuth | any (creator = caller) | header `idempotency-key` (or `body.idempotencyToken`); `{packageName,editingStyle,platform,targetLength,projectName*,instructions,googleDriveUrl*,deadline,rawFootage[]}` | `400` (missing name / non-`drive.google.com` URL) / replay of cached `{response_status,response_body}` / `201 {success,order}` | read+write `idempotency_records`; **txn**: write `orders` (status `Pending Approval`, id `ORD-<ts4>`), `order_files`, `storage_lifecycle` (`Active`); write `audit_events` (`ORDER_CREATED`) |
| POST | `/api/orders/:id/approve` | requireRole('admin') | admin | `{editorId*,adminNotes}` | `400` no editor / `400` editor not found/deactivated / `404` / `409 CONFLICTING_STATE` if not `Pending Approval` / `200` | read `users`,`orders`; **txn** update `orders.status='In Progress'`,`assigned_editor_id`,`admin_notes`; write `audit_events` (`ORDER_APPROVED`) |
| POST | `/api/orders/:id/reject` | requireRole('admin') | admin | `{rejectionReason*}` | `400` / `404` / `409` if not `Pending Approval` / `200` | **txn** update `orders.status='Rejected'`,`rejection_reason`; write `audit_events` (`ORDER_REJECTED`) |
| POST | `/api/orders/:id/reassign` | requireRole('admin') | admin | `{newEditorId}` | `400` editor invalid / `200` | read `users`; update `orders.assigned_editor_id`; write `audit_events` (`EDITOR_REASSIGNED`) |
| POST | `/api/orders/:id/outputs` | requireAuth | admin **or** `assigned_editor_id==me` (else `403`) | `{version,format,resolution,runtime,sizeBytes,notes, storageKey\|downloadUrl\|url *}` | `404` / `403` / `409` unless status ∈ {In Progress, Review} / `400` no key / `201 {success,outputId}` | read `orders`; **txn** insert `output_versions` (`is_authoritative=1`, id `ver-<id>-<ts4>`, `editor_id=me`), update `orders.status='Review'`; write `audit_events` (`OUTPUT_UPLOADED`) |
| POST | `/api/orders/:id/complete` | requireAuth | admin **or** `client_id==me` (else `403`) | — | `404` / `403` / `409` unless status `Review` / `200` | **txn** update `orders.status='Completed'`; upsert `storage_lifecycle` → `Retention Period`, `retention_expires_at = now+14d`; write `audit_events` (`FINAL_DELIVERY_APPROVED`) |
| POST | `/api/orders/:id/revision` | requireAuth | admin **or** `client_id==me` (else `403`) | `{revisionNotes*}` | `400` / `404` / `403` / `409` unless status `Review` / `200` | **txn** update `orders.status='In Progress'`, append `"[REVISION DIRECTIVE - <date> by <name>]: …"` to `instructions`; write `audit_events` (`OUTPUT_REVISION_REQUESTED`) |
| POST | `/api/orders/:id/storage/soft-delete` | requireRole('admin') | admin | — | `200` | update `storage_lifecycle.status='Soft-Deleted'`,`soft_deleted_at`; write `audit_events` |
| POST | `/api/orders/:id/storage/restore` | requireRole('admin') | admin | — | `200` | update `storage_lifecycle` → `Retention Period`, `retention_expires_at=now+14d`, clear `soft_deleted_at`; write `audit_events` |
| POST | `/api/orders/:id/storage/purge` | requireRole('admin') | admin | — | `200` | update `storage_lifecycle.status='Purged'`,`bytes_total=0`,`purged_at`; write `audit_events` |

### /api/cms  ([server/routes/cms.routes.js](server/routes/cms.routes.js))

| Method | Path | Auth | Roles | Request | Response | Tables |
|---|---|---|---|---|---|---|
| GET | `/api/cms/portfolio` | none | public | — | `{portfolio:[…]}` where `is_published=1` | read `cms_projects` |
| GET | `/api/cms/featured` | none | public | — | `{featured:[…]}` where `is_published=1 AND is_featured=1` order `featured_slot` | read `cms_projects` |
| GET | `/api/cms/social` | none | public | — | `{social:[…]}` where `is_published=1` | read `cms_social` |
| GET | `/api/cms/admin/portfolio` | requireRole('admin') | admin | — | `{portfolio:[…]}` all | read `cms_projects` |
| POST | `/api/cms/portfolio` | requireRole('admin') | admin | `{title*,client,format,runtime,category,description,thumbnail,videoUrl,socialProvider,socialUrl,playbackUrl,aspectRatio,camera,colorGrade,audioMix,pacing,isFeatured,featuredSlot,isPublished}` | `400` / `201 {success,project}` | write `cms_projects` (id `WORK-<ts4>`); write `audit_events` |
| PUT | `/api/cms/portfolio/:id` | requireRole('admin') | admin | partial of above (`coalesce`; `featured_slot` always overwritten) | `200 {success,project}` | update `cms_projects`; write `audit_events` |
| DELETE | `/api/cms/portfolio/:id` | requireRole('admin') | admin | — | `200` | delete `cms_projects`; write `audit_events` |
| POST | `/api/cms/featured-slots` | requireRole('admin') | admin | `{slot1Id,slot2Id,slot3Id}` | `200` | **txn**: reset all `is_featured=0,featured_slot=NULL` then set the 3; write `audit_events` |
| GET | `/api/cms/admin/social` | requireRole('admin') | admin | — | `{social:[…]}` all | read `cms_social` |
| POST | `/api/cms/social` | requireRole('admin') | admin | `{platform,url*,title*,caption,thumbnail,likes,isPublished}` | `400` / `201 {success,id}` | write `cms_social` (id `SOC-<ts4>`); write `audit_events` |
| DELETE | `/api/cms/social/:id` | requireRole('admin') | admin | — | `200` | delete `cms_social`; write `audit_events` |

### /api/audit-logs  ([server/routes/audit.routes.js](server/routes/audit.routes.js))

| Method | Path | Auth | Roles | Request | Response | Tables |
|---|---|---|---|---|---|---|
| GET | `/api/audit-logs` | requireRole('admin') | admin | `?limit=200` | `{logs:[{id,actor,actorRole,action,entity,entityId,details,timestamp}]}` desc | read `audit_events` |

### /api/storage  ([server/routes/upload.routes.js](server/routes/upload.routes.js), [server/storage.js](server/storage.js))

| Method | Path | Auth | Roles | Request | Response | Tables / FS |
|---|---|---|---|---|---|---|
| POST | `/api/storage/authorize-upload` | requireAuth | any | `{orderId,filename*,sizeBytes,mimeType}` | `400` if `sizeBytes>5GB` / `200 {success,uploadUrl,storageKey,expiresAt}` | none (HMAC token, 15-min TTL) |
| PUT | `/api/storage/upload?token=` | **none** (HMAC token is the auth) | — | raw request body stream | `401` no token / `403` bad/expired / `200 {success,checksum,bytesWritten,storageKey}` | **writes local FS** `uploads/<storageKey>` — **ephemeral on Vercel**; not called by UI |
| GET | `/api/storage/authorize-download?orderId=&storageKey=*&filename=` | requireAuth | any; if `orderId` given → `403` unless admin \| owner \| assigned editor | query | `400` no key / `200 {success,downloadUrl,expiresAt}` | read `orders`; write `audit_events` (`DOWNLOAD_TOKEN_GENERATED`) |
| GET | `/api/storage/download?token=` | **none** (HMAC) | — | query | `401`/`403`/`404`; if local file missing **and** `storageKey` is `http(s)` → `302` redirect to it; else stream file | reads local FS |

---

## 9. Authentication flow (login → session → /me → logout)

1. **Login** — `AuthPage` → `AuthContext.login(email,pw)` → `POST /api/auth/login`.
   Server ([auth.routes.js](server/routes/auth.routes.js)): `queryOne('SELECT … FROM users WHERE lower(email)=$1')` → `verifyPassword(pw, user.password_hash)` (`scrypt` + `timingSafeEqual`). On fail → `audit_events` `LOGIN_FAILED`, `401`. On `status='deactivated'` → `403`.
2. **Session issue** — `createSession(user.id)` ([auth.js](server/auth.js)): random 32-byte hex `token`, id `sess-<8hex>`, `expires_at = now+30d` (ISO string) → `INSERT INTO sessions`. `setSessionCookie(res, token)`:
   `Set-Cookie: session_token=<token>; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000; Secure` (`Secure` only when `NODE_ENV==='production'`).
   Response body: **sanitized** `{success:true, user:{id,name,email,role,specialty,maxCapacity,avatar,organization}}`. Frontend `setUser(data.user)` and routes by `role`.
3. **Session bootstrap / refresh** — on `AuthProvider` mount → `GET /api/auth/me`.
   `authMiddleware` reads `req.cookies.session_token` (or `Authorization: Bearer`) → `getUserFromToken(token)`:
   `SELECT u.* FROM sessions s JOIN users u ON s.user_id=u.id WHERE s.token=$1 AND s.expires_at::timestamptz > now()`.
   `/me` returns `{user: req.user, authenticated:true}` or `{user:null,authenticated:false}`. Cookie survives reload → **user stays logged in across refresh** (verified).
4. **Logout** — `AuthContext.logout()` → `POST /api/auth/logout` → `deleteSession(token)` (`DELETE FROM sessions WHERE token=$1`) + `clearSessionCookie` + `audit_events` `USER_LOGOUT`. Frontend `setUser(null)`. Subsequent `/me` → `{user:null}` (session row is gone → **logout truly invalidates**).

There is **no refresh-token / sliding expiry** — a session is valid for 30 days from creation, then `getUserFromToken` stops returning it (the row is not deleted, just ignored; no sweeper).

---

## 10. RBAC model

- **Roles**: `admin`, `editor`, `customer`. The DB `CHECK` and some frontend branches also accept the legacy value `client` (treated like `customer`).
- **Server is authoritative**:
  - `requireAuth` → `401 {code:'UNAUTHORIZED'}` if no `req.user`.
  - `requireRole(roles)` → `401` if unauth, `403 {code:'FORBIDDEN'}` if `req.user.role` not in list.
  - **Row scoping** inside handlers: `GET /api/orders` filters by `client_id` / `assigned_editor_id`; `GET /api/orders/:id`, `/:id/outputs`, `/:id/complete`, `/:id/revision`, `/api/storage/authorize-download` each re-check ownership and return `403` otherwise.
  - Role is set server-side only: `register` hard-codes `customer`; `POST /api/auth/editors` hard-codes `editor`; `admin` exists only via the seed.
- **Frontend guards** ([src/App.jsx](src/App.jsx)): `isAdmin`/`isEditor` from `useAuth().user.role`; unauthorized `/admin/*` or `/editor/*` render `<AuthPage>` (URL unchanged). These are **UX only** — the API enforces the real boundary.
- **`AuthContext.canAccessOrder` / `canPerformAction`**: pure client-side helpers mirroring the rules; advisory.
- **Known RBAC gap**: `GET /api/auth/editors` has **no guard** — any visitor can enumerate the editor roster (id, name, email, specialty, status, active-project counts). It is fetched by `AuthContext.refreshEditors` for every user.

---

## 11. Customer permissions (`role = 'customer'` / `'client'`)

Server-enforced:
- `POST /api/orders` — create a brief (becomes `client_id = self`, status `Pending Approval`).
- `GET /api/orders` — see **only own** orders; `GET /api/orders/:id` only if `client_id == self`.
- `POST /api/orders/:id/complete` — approve final delivery **only for own order in `Review`** → `Completed`.
- `POST /api/orders/:id/revision` — request revision **only for own order in `Review`** → back to `In Progress`.
- `GET /api/storage/authorize-download` — only for own order.
- `GET /api/cms/portfolio|featured|social` — public content.
- `POST /api/auth/register`, `POST /api/auth/logout`, `GET /api/auth/me`.
Cannot: approve/reject/reassign, upload outputs, touch storage lifecycle, read `/api/cms/admin/*`, read `/api/audit-logs`, create editors.
Frontend: `/dashboard` (CustomerDashboard), `/order`, `/work`, `/`.

## 12. Editor permissions (`role = 'editor'`)

Server-enforced:
- `GET /api/orders` — see **only** orders where `assigned_editor_id == self`; `GET /api/orders/:id` same.
- `POST /api/orders/:id/outputs` — upload an output version **only for an order assigned to self** and status ∈ {`In Progress`, `Review`} → sets status `Review`, `is_authoritative=1`, `editor_id=self`.
- `GET /api/storage/authorize-download` — only for an order they're assigned to.
- `GET /api/auth/me`, `logout`.
Cannot: see other editors' orders, approve/reject/reassign, complete/request-revision, storage lifecycle, CMS admin, audit logs, editor management.
Frontend: `/editor/dashboard` only.

## 13. Admin permissions (`role = 'admin'`)

Server-enforced — full authority:
- Orders: `GET` all; `approve` (+assign editor), `reject` (+reason), `reassign`, `complete`, `revision`, and all `storage/{soft-delete,restore,purge}`.
- Editors: `POST /api/auth/editors` (onboard, returns one-time plaintext password), `DELETE /api/auth/editors/:id` (deactivate, blocked while they hold In Progress/Review orders).
- CMS: `GET /api/cms/admin/*`, `POST/PUT/DELETE /api/cms/portfolio`, `POST /api/cms/featured-slots`, `POST/DELETE /api/cms/social`.
- Audit: `GET /api/audit-logs`.
- Can also act as owner on `outputs` (admin bypass), `complete`, `revision`.
Frontend: all `/admin/*` pages + can view `/editor/dashboard`.

---

## 14. Order state machine

States (DB `orders.status CHECK`): `Pending Approval`, `In Progress`, `Review`, `Completed`, `Rejected`.
`STATE_EXPLANATIONS` copy lives in [src/context/OrderContext.jsx](src/context/OrderContext.jsx).

```
              POST /api/orders (customer)
                        │
                        ▼
                ┌─────────────────┐
                │ Pending Approval │
                └───────┬─────────┘
        approve (admin, +editorId)      reject (admin, +reason)
                        │                        │
                        ▼                        ▼
                ┌──────────────┐          ┌────────────┐
        ┌──────►│ In Progress  │          │  Rejected  │  (terminal)
        │       └──────┬───────┘          └────────────┘
        │       outputs (assigned editor/admin)
        │              │
        │              ▼
        │       ┌──────────────┐
        │       │   Review     │
        │       └──────┬───────┘
        │   revision (owner/admin, +notes)   complete (owner/admin)
        │              │                            │
        └──────────────┘                            ▼
        (instructions appended,             ┌──────────────┐
         status → In Progress)              │  Completed   │  + storage_lifecycle
                                            └──────────────┘    → 'Retention Period', +14d
```

- Every transition endpoint verifies the **current** status and returns `409 {code:'CONFLICTING_STATE'}` on mismatch (`approve`/`reject` require `Pending Approval`; `outputs` requires `In Progress`|`Review`; `complete`/`revision` require `Review`).
- All transitions run inside `withTransaction` and write an `audit_events` row.
- `reassign` does **not** change status (only `assigned_editor_id`); UI only offers it while `In Progress`.
- `Completed` and `Rejected` have no outbound transition in code (effectively terminal). `storage/*` endpoints mutate only `storage_lifecycle`, never `orders.status`.

## 15. Revision workflow

1. Order is in `Review` with ≥1 `output_versions` row.
2. Customer (own order) or admin clicks **Request Revision** → modal (`revisionNotes` required) in `CustomerDashboard` / `AdminOrdersPage` → `OrderContext.requestRevision(id, notes)` → `POST /api/orders/:id/revision`.
3. Server: verify status `Review` + (admin | `client_id==me`); `orders.instructions` gets `"\n\n[REVISION DIRECTIVE - <YYYY-MM-DD> by <name>]:\n<notes>"` appended; `status → In Progress`; `audit_events` `OUTPUT_REVISION_REQUESTED`.
4. Assigned editor sees the updated directive text in `EditorDashboard` ("Editing Directives" = `details.editingInstructions`) and can upload a new `v1.N` output → `Review` again. Loop is unbounded.
- No separate `revisions` table — revision history is just concatenated text in `orders.instructions` plus the audit trail.

## 16. Editor assignment workflow

1. New order → `assigned_editor_id = NULL`, status `Pending Approval`.
2. Admin opens **Approve & Assign** modal (`AdminOrdersPage`); editor list comes from `AuthContext.editors` ← `GET /api/auth/editors` (roster with live `activeProjects` counts).
3. `OrderContext.approveOrder(id, editorId, adminNotes)` → `POST /api/orders/:id/approve`. Server validates the editor exists and `status != 'deactivated'`, sets `assigned_editor_id`, `admin_notes`, `status='In Progress'`; audit `ORDER_APPROVED`.
4. **Reassignment**: `POST /api/orders/:id/reassign {newEditorId}` (`EDITOR_REASSIGNED`). UI exposes it only while `In Progress`.
5. **Isolation** (three layers):
   - `GET /api/orders` server-filters by `assigned_editor_id` for `editor` role.
   - `POST /api/orders/:id/outputs` returns `403` if `assigned_editor_id != me` (and not admin).
   - `EditorDashboard` also client-filters `orders.filter(o => o.assignedEditorId === user.id)`.
6. **Deactivation guard**: `DELETE /api/auth/editors/:id` returns `400` if the editor still has any `In Progress`/`Review` order (must reassign first). Capacity (`max_capacity`, default 3) is displayed/enforced only in the UI, not the API.

## 17. CMS workflow

- **Public read** (no auth): homepage & `/work` pull `featured` / `portfolio` / `social` via `CMSContext` → `/api/cms/{featured,portfolio,social}` (published rows only).
- **Admin** (`/admin/cms`, `CMSManagerPage`), 3 tabs:
  - **Featured Work** — pick project ids for slots 1/2/3 → `POST /api/cms/featured-slots` → transaction: clear all `is_featured/featured_slot`, then set the chosen three. Homepage "featured" reflects it immediately.
  - **Portfolio Archive** — `POST` (add), `PUT` (edit, `coalesce` partial), `DELETE`; **publish toggle** = `PUT {isPublished:!current}`. `getAutoThumbnail()` derives a thumbnail from the video URL when none is given.
  - **Instagram & Social** — `POST` (add), `DELETE`. **Publish toggle** is implemented as `deleteSocialPost` + `addSocialPost({…, isPublished:!x})` → the row gets a **new `SOC-<ts>` id and new `created_at`** (lossy) and fires two requests.
- Every admin CMS mutation writes an `audit_events` row (`CMS_PROJECT_*`, `CMS_SOCIAL_*`, `FEATURED_SLOTS_UPDATED`).
- Pricing tiers shown on the marketing site are **hardcoded in the page components** (and `INITIAL_CMS.pricing` in `initialData.js`) — not stored in or served from the DB.

## 18. Audit logging workflow

- **Authoritative writer**: `logAuditEvent({actorId,actorRole,action,entityType,entityId,details,metadata})` exported from [server/routes/auth.routes.js](server/routes/auth.routes.js) → `INSERT INTO audit_events` (id `audit-<ts>-<3hex>`, `metadata_json` = `JSON.stringify(metadata)` or `NULL`, `created_at` = ISO string). Errors are swallowed (logged to console).
- **Called by**: auth (`LOGIN_FAILED`, `<ROLE>_LOGIN_SUCCESS`, `USER_LOGOUT`, `CLIENT_REGISTRATION_SUCCESS`, `EDITOR_ONBOARDED`, `EDITOR_DEACTIVATED`), orders (`ORDER_CREATED/APPROVED/REJECTED`, `EDITOR_REASSIGNED`, `OUTPUT_UPLOADED`, `FINAL_DELIVERY_APPROVED`, `OUTPUT_REVISION_REQUESTED`, `STORAGE_SOFT_DELETED/RESTORED/PURGED`), cms (`CMS_PROJECT_*`, `CMS_SOCIAL_*`, `FEATURED_SLOTS_UPDATED`), storage (`DOWNLOAD_TOKEN_GENERATED`).
- **Read**: `GET /api/audit-logs?limit=200` (admin) → `ORDER BY created_at DESC`.
- **Append-only** is a **convention**: no code path issues `UPDATE`/`DELETE` on `audit_events`, but the DB does **not** enforce it (no trigger/policy).
- **Frontend `AuditLogContext.logAction`** only prepends an optimistic object to local state (`id: "local-…"`) — it never calls the API. Real entries come from `refreshLogs`.
- The seed writes exactly **one** audit row (`DATABASE_INITIALIZED`). `INITIAL_AUDIT_LOGS` in `initialData.js` is **not** loaded by the server.

## 19. Idempotency mechanism

- Applies to **`POST /api/orders`** only.
- Key source: `req.headers['idempotency-key']` or `req.body.idempotencyToken`. `OrderContext.createOrder` always generates one (`idem-<ts>-<rand>`), sends it both as the header and in the body.
- Pre-insert: `SELECT response_status, response_body FROM idempotency_records WHERE key = $1`; on hit → `res.status(stored).json(JSON.parse(stored))` (exact replay, no new row).
- Post-commit (only on the `201` path): `INSERT INTO idempotency_records (key, 201, JSON.stringify(payload), now)`.
- Secondary guard: `orders.idempotency_key` column is `UNIQUE`.
- No TTL / cleanup — `idempotency_records` grows unbounded.

## 20. Storage / upload workflow

| Asset | Where it lives | How it's referenced |
|---|---|---|
| **Customer raw footage** | The customer's own **Google Drive** (external) | `orders.google_drive_url` (TEXT). Validated server-side: URL must parse, be `http(s)`, host `drive.google.com` or `*.drive.google.com`. `OrderFlowPage` enforces the same client-side. **No Google API integration** — it's just a link surfaced to admin/editor. |
| **Editor output cut** | A URL the editor types into the modal (defaults to a Big Buck Bunny sample) | `output_versions.storage_key` (TEXT, a URL). `EditorDashboard` sends `downloadUrl`; server accepts `storageKey` \| `downloadUrl` \| `url`. **No file transfer occurs.** |
| **Presigned upload path** (`POST /api/storage/authorize-upload` + `PUT /api/storage/upload`) | Local FS `uploads/<storageKey>` via `saveUploadedStream` (sha256, path-traversal strip) | HMAC-SHA256 token (`STORAGE_SECRET`, **hardcoded fallback if unset**), base64url, 15-min TTL. **Not invoked by the app UI** — only `test/verify_backend.js`. Ephemeral on Vercel. |
| **Download** | `OrderContext.trackDownload` → `GET /api/storage/authorize-download` (RBAC-checked) → returns `/api/storage/download?token=…` → `window.open` | `/api/storage/download`: verify HMAC; if the local file is absent **and** `storageKey` starts with `http` → **302 redirect** to that URL (so external URLs "just work"); otherwise stream the local file or `404`. |

There is **no** object-storage service (S3/Supabase Storage/GCS) wired in. `express.static('/uploads')` serves the local dir in dev only.

---

## 21. Database schema  ([server/schema.sql](server/schema.sql))

All statements `IF NOT EXISTS` (idempotent, run on every cold start). Timestamps are stored as **TEXT ISO-8601 strings** supplied by the app (`new Date().toISOString()`), except the session check which casts `expires_at::timestamptz`. Boolean-ish flags are `INTEGER` (`0`/`1`).

### `users`
| Column | Type | Constraints |
|---|---|---|
| `id` | TEXT | **PK** (e.g. `admin-01`, `editor-01`, `user-101`, `user-<ts>`, `editor-<ts4>`) |
| `name` | TEXT | NOT NULL |
| `email` | TEXT | **UNIQUE**, NOT NULL (compared via `lower(email)`) |
| `password_hash` | TEXT | NOT NULL — `"<saltHex>:<scryptKeyHex>"` |
| `role` | TEXT | NOT NULL, `CHECK (role IN ('admin','editor','customer','client'))` |
| `specialty` | TEXT | (editors) |
| `max_capacity` | INTEGER | DEFAULT 3 |
| `avatar_url` | TEXT | |
| `organization` | TEXT | (customers) |
| `status` | TEXT | DEFAULT `'active'` (code also uses `'deactivated'`) |
| `created_at` | TEXT | NOT NULL |

### `sessions`
| Column | Type | Constraints |
|---|---|---|
| `id` | TEXT | **PK** (`sess-<8hex>`) |
| `user_id` | TEXT | NOT NULL, **FK → users(id) ON DELETE CASCADE** |
| `token` | TEXT | **UNIQUE**, NOT NULL (32-byte hex) |
| `expires_at` | TEXT | NOT NULL (ISO; now+30d) |
| `created_at` | TEXT | NOT NULL |

Index: `idx_sessions_token (token)`.

### `orders`
| Column | Type | Constraints |
|---|---|---|
| `id` | TEXT | **PK** (`ORD-<ts4>`; seed uses `TRIP-90xx`) |
| `client_id` | TEXT | NOT NULL, **FK → users(id)** |
| `status` | TEXT | NOT NULL, `CHECK IN ('Pending Approval','In Progress','Review','Completed','Rejected')` |
| `package_name` | TEXT | NOT NULL |
| `editing_style` | TEXT | NOT NULL |
| `platform` | TEXT | NOT NULL |
| `target_length` | TEXT | NOT NULL |
| `project_name` | TEXT | NOT NULL |
| `instructions` | TEXT | (revision directives appended here) |
| `google_drive_url` | TEXT | (customer raw footage link) |
| `deadline` | TEXT | NOT NULL |
| `assigned_editor_id` | TEXT | **FK → users(id)**, nullable |
| `admin_notes` | TEXT | |
| `rejection_reason` | TEXT | |
| `idempotency_key` | TEXT | **UNIQUE**, nullable |
| `created_at` / `updated_at` | TEXT | NOT NULL |

Indexes: `idx_orders_client (client_id)`, `idx_orders_editor (assigned_editor_id)`, `idx_orders_status (status)`.

### `order_files`
| Column | Type | Constraints |
|---|---|---|
| `id` | TEXT | **PK** |
| `order_id` | TEXT | NOT NULL, **FK → orders(id) ON DELETE CASCADE** |
| `filename` | TEXT | NOT NULL |
| `size_bytes` | BIGINT | NOT NULL (parsed to JS number) |
| `mime_type` | TEXT | NOT NULL |
| `storage_key` | TEXT | NOT NULL |
| `upload_status` | TEXT | NOT NULL, `CHECK IN ('pending','uploading','completed','failed')` |
| `checksum` | TEXT | |
| `created_at` | TEXT | NOT NULL |

### `output_versions`
| Column | Type | Constraints |
|---|---|---|
| `id` | TEXT | **PK** (`ver-<orderId>-<ts4>`) |
| `order_id` | TEXT | NOT NULL, **FK → orders(id) ON DELETE CASCADE** |
| `version_tag` | TEXT | NOT NULL (`v1.0`, `v1.N`) |
| `editor_id` | TEXT | NOT NULL, **FK → users(id)** |
| `storage_key` | TEXT | NOT NULL (URL) |
| `format`, `resolution`, `runtime` | TEXT | NOT NULL |
| `size_bytes` | BIGINT | nullable |
| `notes` | TEXT | |
| `is_authoritative` | INTEGER | DEFAULT 0 (set to 1 on insert) |
| `uploaded_at` | TEXT | NOT NULL |

### `storage_lifecycle`
| Column | Type | Constraints |
|---|---|---|
| `order_id` | TEXT | **PK**, **FK → orders(id) ON DELETE CASCADE** (1:1 with order) |
| `status` | TEXT | NOT NULL, `CHECK IN ('Active','Retention','Retention Period','Pending Deletion','Soft-Deleted','Purged')` |
| `bytes_total` | BIGINT | DEFAULT 0 |
| `retention_expires_at` | TEXT | nullable (now+14d on complete/restore) |
| `soft_deleted_at` | TEXT | nullable |
| `purged_at` | TEXT | nullable |

### `audit_events`
| Column | Type | Constraints |
|---|---|---|
| `id` | TEXT | **PK** (`audit-<ts>-<3hex>`) |
| `actor_id`, `actor_role`, `action`, `entity_type`, `entity_id` | TEXT | NOT NULL |
| `details` | TEXT | |
| `metadata_json` | TEXT | (JSON string or NULL) |
| `created_at` | TEXT | NOT NULL |

Index: `idx_audit_events_created (created_at)`. No FKs (actor may be an email or `'system'`).

### `cms_projects`
`id` **PK** (`WORK-*`); `title, client, format, runtime, category, description, thumbnail_url, video_url` NOT NULL; `social_provider` DEFAULT `'none'`, `social_url`, `playback_url`, `aspect_ratio` DEFAULT `'16:9'`, `camera, color_grade, audio_mix, pacing`; `is_featured` INT DEFAULT 0, `featured_slot` INT, `is_published` INT DEFAULT 1; `created_at` NOT NULL.

### `cms_social`
`id` **PK** (`SOC-*`); `platform, url, title, caption, thumbnail_url, likes` NOT NULL; `is_published` INT DEFAULT 1; `created_at` NOT NULL.

### `idempotency_records`
`key` **PK**; `response_status` INT NOT NULL; `response_body` TEXT NOT NULL (JSON string); `created_at` NOT NULL.

### Relationship summary
```
users 1───∞ sessions            (ON DELETE CASCADE)
users 1───∞ orders (client_id)
users 1───∞ orders (assigned_editor_id, nullable)
users 1───∞ output_versions (editor_id)
orders 1───∞ order_files         (CASCADE)
orders 1───∞ output_versions     (CASCADE)
orders 1───1 storage_lifecycle   (CASCADE, order_id is PK)
audit_events, cms_projects, cms_social, idempotency_records — standalone (no FKs)
```

---

## 22. Supabase / PostgreSQL architecture

- **One database**: Supabase project `dficeyovhghbgiikwwmb` (`https://dficeyovhghbgiikwwmb.supabase.co`), **PostgreSQL 17.6**, region **ap-northeast-1**.
- **Access model**: server-only, via `pg` `Pool` on `DATABASE_URL`. No `@supabase/supabase-js`, no `@supabase/ssr`, no PostgREST/`/rest/v1`, no Supabase Auth (`auth.users`), **no RLS policies**, no Supabase Storage. The frontend never contacts Supabase.
- **Connection**: use the **Transaction pooler** (`aws-0-ap-northeast-1.pooler.supabase.com:6543`, user `postgres.dficeyovhghbgiikwwmb`) for the serverless function. Session pooler (`:5432`) also works. The legacy direct host `db.<ref>.supabase.co:5432` **does not resolve** for this project (newer Supabase projects don't provision it). `ssl: { rejectUnauthorized: false }` for non-local hosts.
- **Schema management**: no migration tool. `ensureSchema()` runs `server/schema.sql` (all `IF NOT EXISTS`) once per process; `seedInitialData()` runs only when `users` is empty.
- **Seed** (from `src/data/initialData.js`): 1 admin (`admin-01` / `admin@triphoria.io`), 3 editors (`editor-01..03`), 2 customers (`user-101/102`), 5 orders (`TRIP-9011..9015` covering every status), 7 `order_files`, 2 `output_versions`, 5 `storage_lifecycle`, 5 `cms_projects` (3 featured), 3 `cms_social`, 1 `audit_events`. Seed passwords: admin `ADMIN_PASSWORD` (or dev fallback `adminpgt`); editors `EDITOR_SEED_PASSWORD` (or dev fallback `editorpgt`, else random in prod); customers `CUSTOMER_SEED_PASSWORD` (or dev fallback `clientpgt`, else random).
- **Conflict with `docs/`**: `docs/PRODUCTION-ARCHITECTURE.md`, `SUPABASE-MIGRATION-PLAN.md`, `AUTH-DATABASE-ARCHITECTURE.md`, `VERCEL-AUTH-DIAGNOSTIC.md` describe a SQLite→Supabase-**Auth** migration with `profiles`, UUID ids, RLS, and a different project ref. **None of that is in the code.** The implemented design is Option A: keep Express sessions, move persistence to Postgres via `pg`, string ids retained.

---

## 23. Vercel architecture  ([vercel.json](vercel.json), [api/index.js](api/index.js))

```json
framework: "vite"
buildCommand: "npm run build"      outputDirectory: "dist"
functions: { "api/index.js": { maxDuration: 30, includeFiles: "server/schema.sql" } }
rewrites:
  /api/:path*      → /api          (Express function; original URL preserved)
  /uploads/:path*  → /api
  /((?!api/|uploads/|assets/|.*\.\w+$).*) → /index.html   (SPA fallback)
```
- `api/index.js` → `import app from '../server/app.js'; export default app;` — the whole Express app runs as one Node serverless function. `@vercel/nft` traces the static imports; `schema.sql` is force-bundled via `includeFiles`.
- `package.json` `engines.node: ">=22"`.
- Same-origin design → the browser's `session_token` cookie (`SameSite=Lax; Secure`) works with no CORS involvement. `FRONTEND_URL` is intentionally left unset.
- First request after a cold start pays the `ensureSchema()` cost (~0.3–1 s warm; longer if it also seeds).

**Current live state (`https://triphoria-azure.vercel.app`)** — see §30: the production deployment was built from **`main`**, which has **no `api/` and no `vercel.json`**, so `/api/*` returns Vercel's edge `404 NOT_FOUND` and login shows *"Server communication failure."* The fix is this branch (`5ebbccc`), pushed to GitHub, **not yet deployed or merged**.

---

## 24. Local development architecture

- Two processes:
  - `npm run dev` → Vite dev server on **:5173**.
  - `npm run server` → `node --env-file-if-exists=.env server/index.js` on **:3001** (needs `DATABASE_URL`; the server exits if `ensureSchema()` fails).
- [vite.config.js](vite.config.js): `server.proxy` sends `/api` and `/uploads` → `http://127.0.0.1:3001`; `@` → `src`; port 5173, `host: true`. (`server.watch.ignored` still lists old `*.sqlite` paths — harmless leftover.)
- `.env` (git-ignored) supplies `DATABASE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `STORAGE_SECRET`, and the (unused) `VITE_SUPABASE_*`.
- SQLite is **fully removed** from the runtime — `node:sqlite` appears only in the optional `scripts/migrate-sqlite-to-postgres.mjs`.
- [playwright.config.js](playwright.config.js) boots both `npm run server` (health-checks `:3001/api/auth/me`) and `npm run dev`, `baseURL http://localhost:5173`, chromium only, `workers: 1`.

---

## 25. Production architecture (target)

```
Browser ── https://<app>.vercel.app
   │  GET /            → dist/index.html + assets  (Vercel static)
   │  GET /dashboard…  → dist/index.html           (SPA rewrite)
   │  /api/*  /uploads/* ─────────────► api/index.js  (Vercel Node function, maxDuration 30s)
   │                                        │  Express app (server/app.js)
   │                                        │   ├─ ensureSchema() once per cold start
   │                                        │   ├─ authMiddleware → sessions/users
   │                                        │   └─ routers: auth / orders / cms / audit / storage
   │                                        ▼
   │                             pg Pool (max 1) ──► Supabase Postgres 17.6
   │                                                  (transaction pooler :6543, ap-northeast-1)
   └─ cookie: session_token (HttpOnly; Secure; SameSite=Lax; 30d)  — same origin, no CORS
External: Google Drive (raw-footage links only), Google Fonts, Unsplash/Dicebear (images), sample video CDNs
```
Not in the picture: object storage, payments, email, background jobs, CDN for user media.

---

## 26. Environment variable map

**Server-only** (Vercel Project → Environment Variables, **no `VITE_` prefix**; local `.env`):

| Var | Required? | Used by | Meaning |
|---|---|---|---|
| `DATABASE_URL` | **yes** | [server/db.js](server/db.js) | Postgres connection string (Supabase transaction pooler `:6543`). Only real secret. |
| `NODE_ENV` | prod: yes | db.js (seed guard), auth.js (`Secure` cookie) | `production` enables `Secure` on the session cookie and makes a missing `ADMIN_PASSWORD` fatal at seed time. |
| `PORT` | no (default `3001`) | [server/index.js](server/index.js) | Local listener port. |
| `FRONTEND_URL` | no | [server/app.js](server/app.js) | If set, CORS is locked to it. Leave unset for same-origin Vercel. |
| `ADMIN_EMAIL` | no (default `admin@triphoria.io`) | db.js seed | Seed admin email. |
| `ADMIN_PASSWORD` | prod: **yes** (seed only) | db.js seed | Seed admin password; `process.exit(1)` if missing while `NODE_ENV=production` and `users` empty. Ignored once `users` is populated. |
| `EDITOR_SEED_PASSWORD` / `CUSTOMER_SEED_PASSWORD` | no | db.js seed | Override seeded editor/customer passwords (else dev fallback / random in prod). |
| `STORAGE_SECRET` | recommended | [server/storage.js](server/storage.js) | HMAC key for presigned tokens. **Has an insecure hardcoded fallback** if unset. |
| `VERCEL` | auto | db.js | Presence → `pool.max = 1`. |

**Frontend** (`VITE_`-prefixed, embedded in the bundle, public):

| Var | Status |
|---|---|
| `VITE_SUPABASE_URL` | Declared in `.env`/`.env.example`. **Not read by any source file.** |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Declared. **Not read by any source file.** Reserved for a future direct-to-Supabase client. |
| `import.meta.env.DEV` (built-in) | Gates the Navbar dev ribbon + AuthPage quick-login buttons. |

`SUPABASE_SERVICE_ROLE_KEY` — **not used** by the implementation and intentionally not configured.

---

## 27. External services / dependencies

**Runtime services**
- **Supabase PostgreSQL** — the datastore (see §22).
- **Google Drive** — customer raw-footage storage; integration is *link validation only* (`drive.google.com` host check), no OAuth/API.
- **Google Fonts** (`fonts.googleapis.com` / `fonts.gstatic.com`) — Inter, JetBrains Mono ([index.html](index.html)).
- **images.unsplash.com** — seed avatars & CMS thumbnails, plus hardcoded defaults in admin/editor forms.
- **api.dicebear.com** — generated avatar for self-registered customers ([auth.routes.js](server/routes/auth.routes.js)).
- **commondatastorage.googleapis.com** (Big Buck Bunny / Elephants Dream / Tears of Steel …) — sample video URLs hardcoded in the seed and as default values in `EditorDashboard` / `CMSManagerPage` forms.

**NPM — production** ([package.json](package.json)): `express`, `cors`, `cookie-parser`, `pg`, `react`, `react-dom`, `motion`, `lucide-react`, `canvas-confetti`, `clsx`, `tailwind-merge`, `class-variance-authority`, `@radix-ui/react-slot`, `lenis`.
**NPM — dev**: `vite`, `@vitejs/plugin-react`, `@tailwindcss/vite`, `tailwindcss`, `oxlint`, `@playwright/test`, `@types/react`, `@types/react-dom`.

**Not integrated**: any payment provider (Stripe/etc.), any email/SMTP service, any object-storage SDK (S3/GCS/Supabase Storage), any queue/cron/background-job system, any analytics/error-tracking.

---

## 28. Still simulated / mock / local-only

| Thing | Where | Reality |
|---|---|---|
| Editor "upload output cut" | `EditorDashboard` → `POST /api/orders/:id/outputs` | Sends **metadata + a URL string** (default = Big Buck Bunny). No file is transferred; `output_versions.storage_key` is just that URL. |
| Binary upload path | `POST /api/storage/authorize-upload`, `PUT /api/storage/upload`, `express.static('/uploads')` | Real code, writes to local FS, **not called by the app** (only `test/verify_backend.js`). Ephemeral on Vercel. |
| Payments / invoicing | `amount`, `paymentStatus`, `invoiceNumber` on seed orders; `InvoiceModal.jsx` | Cosmetic seed fields. `InvoiceModal` is **never imported** (dead). No billing anywhere. |
| Pricing tiers | HomePage / OrderFlowPage / `INITIAL_CMS.pricing` | Hardcoded in components; not in DB, not served by any endpoint. |
| `AuditLogContext.logAction` | [src/context/AuditLogContext.jsx](src/context/AuditLogContext.jsx) | Optimistic local `setAuditLogs` prepend only; never persisted. |
| DEV role switching | Navbar "Switch Workspace" ribbon, AuthPage quick-login buttons | `import.meta.env.DEV` only; call `login()` with seed passwords `adminpgt` / `editorpgt` / `clientpgt`. |
| `INITIAL_AUDIT_LOGS`, `INITIAL_CMS` | `src/data/initialData.js` | Exported but **not consumed** by the server seed. |
| Storage lifecycle "retention / purge / soft-delete" | `orders.routes.js` storage endpoints | Flip `storage_lifecycle.status` / timestamps only. No media is actually retained or deleted (there is no media). |
| `client` role | DB `CHECK`, some frontend branches | Legacy alias for `customer`; nothing creates a `client` row. |
| `localStorage` | `CookieBanner` only | `triphoria_cookie_consent`. No auth/session/state in browser storage. |
| Editor capacity (`max_capacity`) | roster UI | Displayed/checked client-side; the API does not enforce a cap on assignment. |
| Prod editor logins | seed | With no `EDITOR_SEED_PASSWORD` in prod, seeded editor passwords are **random** (unknown) unless the DB was seeded from a dev-fallback run. |

---

## 29. Production-ready (verified against the live Supabase DB)

- **Express session auth** — `scrypt` + `timingSafeEqual`, DB-backed opaque 30-day tokens, `HttpOnly` + `Secure`(prod) + `SameSite=Lax` cookie, `trust proxy`. Server-side `requireAuth` / `requireRole` on every protected route.
  Verified: `test/verify_backend.js` **24/24** against Supabase; targeted `GET /api/health` (200), `POST /api/auth/login` (401 bad / 200 + cookie), `GET /api/auth/me` (authenticated ↔ null), `POST /api/auth/logout` (session row deleted), unauth `GET /api/orders` → 401.
- **Postgres persistence layer** — `pg` pool + `query`/`queryOne`/`withTransaction`; BIGINT→number; parameterised (`$n`) everywhere; camelCase aliases quoted; `expires_at::timestamptz` comparison. Schema DDL + all route SQL validated on a real Postgres engine (PGlite) and on live Supabase 17.6.
- **Order state machine** — every transition guarded (`409 CONFLICTING_STATE`), wrapped in `withTransaction`, audited.
- **RBAC row scoping** — `/api/orders`, `/api/orders/:id`, `/:id/outputs`, `/:id/complete`, `/:id/revision`, `/api/storage/authorize-download` all re-check ownership.
- **Idempotent order creation** — replay cache + `UNIQUE` column.
- **Audit trail** — written server-side for all mutations; admin-only read.
- **Secrets hygiene** — `.gitignore` covers `.env`, `.env.*`, `data/`, `uploads/`, `*.db`, `*.sqlite`, `dist`, `node_modules`; the pushed commit contains no secrets (only placeholder strings in `.env.example`).
- **Vercel wiring** — `vercel.json` + `api/index.js` are correct in structure (function + rewrites + SPA fallback + `includeFiles`); logic validated, **deployment not yet done**.
- **Build** — `npm run build` succeeds, 0 errors.

---

## 30. Currently broken or unverified

| # | Severity | Item | Evidence / effect |
|---|---|---|---|
| 1 | **Blocker** | **Production deployment serves `main`, not the API branch** | `https://triphoria-azure.vercel.app/api/health` → `404` `X-Vercel-Error: NOT_FOUND` (edge). `origin/main` has no `api/` and no `vercel.json`. `/deep/route` also 404s (no SPA fallback either). Login → *"Server communication failure."* Fix = deploy/merge branch `fix/express-api-supabase-postgres` (`5ebbccc`). **All 4 target endpoints are non-functional in production right now.** |
| 2 | **High (page crash)** | `AuditLogsPage` reads the wrong context key | [src/pages/admin/AuditLogsPage.jsx:6](src/pages/admin/AuditLogsPage.jsx#L6) `const { logs } = useAuditLog()` but [AuditLogContext](src/context/AuditLogContext.jsx#L47) exposes **`auditLogs`**. `logs` is `undefined` → `logs.filter(...)` (line 10) / `logs.length` (line 72) throw → **`/admin/audit-logs` white-screens**. The API (`GET /api/audit-logs`) is fine. |
| 3 | **Medium** | Editor-onboarding banner shows blank credentials | [EditorsManagementPage.jsx:70](src/pages/admin/EditorsManagementPage.jsx#L70) `const created = addEditor(...)` — `addEditor` is **async** ([AuthContext.jsx:124](src/context/AuthContext.jsx#L124)) but the code reads `created.name/.email/.password/.id` synchronously → all `undefined`; `setSelectedEditor(created)` stores a Promise. The `POST /api/auth/editors` call itself succeeds (password is in its JSON response, just not surfaced). |
| 4 | **Low** | Dead args passed to context actions | `addEditor(form, user?.email)`, `deleteEditor(id, user?.email)`, `reassignEditor(id, editorId, user)` — the context functions take fewer params; extra args ignored. |
| 5 | **Low/Design** | `GET /api/auth/editors` is unauthenticated | [auth.routes.js:161](server/routes/auth.routes.js#L161) no `requireRole`/`requireAuth`. Anyone can enumerate the editor roster (id/name/email/specialty/status/active counts). Consumed by `AuthContext.refreshEditors` for all users. |
| 6 | **Low** | `toggleSocialPublish` is destructive | [CMSContext.jsx:171](src/context/CMSContext.jsx#L171) deletes then re-adds → new `SOC-<ts>` id + new `created_at`, 2 requests, brief empty window. |
| 7 | **Low** | `/admin/storage` link with no route | [Navbar.jsx:180](src/components/layout/Navbar.jsx#L180) links to `/admin/storage`; [App.jsx](src/App.jsx#L135) has no case → silently renders `BusinessDashboard`. (Storage governance lives inside `AdminOrdersPage` order detail instead.) |
| 8 | **Low** | Unbounded growth | `sessions` (no sweeper for past-`expires_at` rows) and `idempotency_records` (no TTL) accumulate forever. |
| 9 | **Low** | `STORAGE_SECRET` insecure fallback | [server/storage.js:16](server/storage.js#L16) `process.env.STORAGE_SECRET || 'triphoria-storage-hmac-secret-vault-2026'` — presigned tokens are forgeable if the env var isn't set. |
| 10 | **Info / unverified** | Prod admin/editor passwords | The live Supabase `users` table was seeded during local testing with dev fallbacks (`adminpgt`, `editorpgt`). Because seed runs only when `users` is empty, setting a different `ADMIN_PASSWORD` on Vercel will **not** change them. Deliberate credential provisioning is still pending. |
| 11 | **Info** | Stale docs | `docs/VERCEL-AUTH-DIAGNOSTIC.md`, `SUPABASE-MIGRATION-PLAN.md`, `PRODUCTION-ARCHITECTURE.md`, `AUTH-DATABASE-ARCHITECTURE.md`, `LOGIN-DEBUG-REPORT.md` describe SQLite and/or a Supabase-Auth+RLS+`profiles`+UUID design and an older project ref. The code implements none of that. |
| 12 | **Info** | `/api/auth/me` shape | Returns the raw session-join row (`max_capacity`, `avatar_url`, `status`) while `login` returns a camelCase sanitized object. Both carry `id`/`name`/`email`/`role`, which is all the frontend reads. Pre-existing; not a regression. |
| 13 | **Info** | `vite.config.js` `server.watch.ignored` still references `*.sqlite` | Harmless leftover from the SQLite era. |

---

## A. What TRIPHORIA actually is

A **role-based video-editing production-control platform** for a post-production studio. It is a single React/Vite SPA plus an Express API on Supabase Postgres, with three roles — **customer, editor, admin** — sharing one login. Customers submit editing briefs (with a Google Drive link to their raw footage — no video is uploaded through TRIPHORIA); admins verify and assign a brief to an editor; the editor delivers a cut (recorded as a URL + metadata); the customer approves or asks for revisions; approved projects enter a 14-day "retention" bookkeeping state. Every state change is written to an append-only audit trail. A public marketing site (home + portfolio) is driven by an admin CMS (featured slots, portfolio archive, Instagram clips). Payments, email, and real media storage are **not** implemented — those fields are cosmetic.

## B. What happens when a customer uses it

1. Browses `/` and `/work` (public CMS content), clicks **Start a Project**.
2. `/order` wizard: project details → paste a `drive.google.com` share link (validated) → review. On submit, if not logged in they're bounced to `/login` (the draft is not saved).
3. After login (or register → auto-logged-in as `customer`), `createOrder` `POST`s with an idempotency key → order created as **Pending Approval**, redirect to `/order/success/:id`.
4. `/dashboard` shows their orders only (server-scoped). They watch status move Pending → In Progress → **Review**.
5. At **Review** they **Watch Preview**, then either **Approve Final Cut** (`/complete` → **Completed**, download becomes available) or **Request Revision** (notes required → back to **In Progress**; the note is appended to the brief).
6. At **Completed** they **Download Master File** → a short-lived signed link that redirects to the stored URL.
7. Logout deletes the session row; refresh keeps them logged in until then.

## C. What happens when an editor uses it

1. Logs in → `/editor/dashboard`. Sees **only** orders where `assigned_editor_id` is them (enforced by the API and re-filtered in the UI); everyone else's work is invisible.
2. Opens an **In Progress** brief: reads the editing directives (including any appended `[REVISION DIRECTIVE …]` lines) and the customer's Google Drive link (opens externally).
3. Clicks **Upload Output Cut** → fills version tag, runtime, a delivery URL, notes → `POST /:id/outputs`. The order flips to **Review**, the row is marked authoritative, `editor_id` = them, audit `OUTPUT_UPLOADED`.
4. If the customer/admin requests a revision, the order returns to **In Progress** with the extra directive text; the editor uploads `v1.N` and it goes to **Review** again.
5. Cannot approve/reject/reassign, cannot see the audit log, CMS, or other editors. Deactivation by an admin is blocked while they still hold an active order.

## D. What happens when an admin uses it

1. Logs in → `/admin/dashboard`: pending-approval queue, in-progress / review counts, <48h deadline alerts, editor-capacity snapshot.
2. `/admin/orders`: for each **Pending Approval** order, verifies the Drive link and either **Approve & Assign** (pick an editor → **In Progress**, audit `ORDER_APPROVED`) or **Reject** (reason required → **Rejected**, audit `ORDER_REJECTED`). Can **Reassign** an editor while In Progress. At **Review** can **Approve Delivery** (→ **Completed** + `storage_lifecycle` "Retention Period" +14d) or **Request Revision**. Can soft-delete / restore / purge an order's storage-lifecycle record.
3. `/admin/editors`: onboard an editor (auto password, returned once by the API), monitor per-editor workload computed from live orders, deactivate (blocked if they hold active orders). *(The "credentials created" banner currently renders blank — see §30 #3.)*
4. `/admin/cms`: set the 3 homepage featured slots (atomic), CRUD the portfolio archive, toggle publish, manage Instagram/social clips.
5. `/admin/audit-logs`: intended to browse the immutable trail — *currently crashes on render (§30 #2); the underlying API works.*
6. Everything an admin mutates writes an `audit_events` row. Admin can also act on any order (bypasses the owner/assigned-editor checks).

## E. Current production risks

1. **The deployed site has no working API** — production is built from `main` (no `api/`, no `vercel.json`); `/api/*` → edge 404; login fails for everyone. (§23, §30 #1)
2. **Admin/editor credentials are dev fallbacks** baked in during local seeding; the seed won't re-run, so a new `ADMIN_PASSWORD` on Vercel is ignored. Anyone who read the repo history/docs knows `adminpgt` / `editorpgt`. (§30 #10)
3. **`STORAGE_SECRET` has a public hardcoded fallback** — if not set in the environment, presigned upload/download tokens are forgeable. (§30 #9)
4. **Editor roster is exposed unauthenticated** via `GET /api/auth/editors` (names, emails, specialties, workload). (§10, §30 #5)
5. **`/admin/audit-logs` white-screens** for admins — the compliance surface is unusable until the one-line context key is fixed. (§30 #2)
6. **No enforced media storage** — "delivered" cuts are arbitrary URLs; `/api/storage/download` will 302-redirect to whatever string is stored. Retention/purge only flips a status column.
7. **Ephemeral serverless FS** — any binary that does reach `PUT /api/storage/upload` (not used by the UI, but reachable) is lost on the next cold start; `express.static('/uploads')` serves nothing in prod.
8. **Unbounded tables** — `sessions` and `idempotency_records` have no cleanup. (§30 #8)
9. **CORS reflects any origin** unless `FRONTEND_URL` is set (`origin: true` + `credentials: true`). Fine for same-origin Vercel; risky if the API is ever exposed cross-origin.
10. **Cookie is `SameSite=Lax`, 30-day, no rotation, no server-side "log out everywhere"** beyond deleting the single token row.
11. **`toggleSocialPublish`** momentarily deletes a social row and recreates it with a new id — a publish toggle can drop content on failure. (§30 #6)

## F. Current known blockers

1. **Deploy the API.** Point the Vercel project at branch `fix/express-api-supabase-postgres` (`5ebbccc`) or merge it to `main`, with Root Directory = repo root, and redeploy without build cache. Requires Vercel access (token or dashboard) — not available to the automated workflow so far.
2. **Set Production env vars on Vercel**: `NODE_ENV=production`, `DATABASE_URL` = the Supabase **transaction-pooler** string (`…pooler.supabase.com:6543`, password URL-encoded), `ADMIN_PASSWORD`, `STORAGE_SECRET`. (`FRONTEND_URL` stays unset.)
3. **Decide the real admin/editor passwords.** Either rotate them in Supabase now (one-off `UPDATE` with a fresh `scrypt` hash) or wipe the seeded `users` so Vercel re-seeds from the configured `ADMIN_PASSWORD` on first boot.
4. **Verify on the live URL**: `GET /api/health` → 200 `{"database":"Supabase Postgres"}`, then `POST /api/auth/login` → 200 + `Set-Cookie`, `GET /api/auth/me` → authenticated, `POST /api/auth/logout` → session invalidated. Not yet possible because of blocker #1.
5. **(Non-deploy, code) fix `AuditLogsPage`** (`logs` → `auditLogs`) and the async `addEditor` banner — both are one-liners but out of scope for a config-only deploy.
