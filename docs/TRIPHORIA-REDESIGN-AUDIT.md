# TRIPHORIA — Redesign Audit (Phase 1)

- **Branch:** `fix/express-api-supabase-postgres` @ `d77da17`
- **Scope of this document:** a complete read-only audit of the existing application before any redesign work, plus a reverse-engineering of the reference site's design intelligence, plus a map of what changes vs. what stays functionally frozen.
- **Nothing was modified to produce this document.** It supersedes/extends `CODEBASE-MAP.md` for redesign purposes.

---

## 0. Executive summary

TRIPHORIA is a **real, working video-production operating system**: React 19 + Vite 8 SPA, Express 5 API, Supabase PostgreSQL (via `pg`), custom session auth, RBAC, a server-enforced order state machine, append-only audit logging, and a DB-backed CMS. Phases A–C hardened the API and verified it end-to-end against the live database.

The frontend already carries **a substantial dark-first design token system** (`src/index.css`, 625 lines) with an editorial type scale, a teal/lime/lavender palette, a 3-tier button system, and status badges — its comments even reference a "CreatorFlow Editorial Standard," so this direction was already started. The redesign is therefore **"evolve, fill the gaps, apply consistently, and recompose the pages"**, not "start from zero."

The biggest gaps vs. the brief:
1. **Single flat dark background everywhere** — the brief wants a multi-scene background system (cream / black / green / teal / lime / dark-editorial).
2. **Uniform large radii** (`--radius-cards: 16px`, `--radius-images: 24px`) — the brief explicitly forbids "24px everywhere" and wants sharp editorial containers with varied shape.
3. **No dedicated video component layer** (`VideoCard`, `VideoLibrary`, `FeaturedVideoGrid`, `OutputVersionCard`, `ProjectTimeline`, `EditorWorkload`) — video handling is ad-hoc inside pages.
4. **No unified motion primitives** (`Reveal` / `Stagger` / `TextReveal` / `ImageReveal`) — motion is scattered.
5. **CMS media is 100% demo** (Big Buck Bunny sample URLs) — per Phase C. The public "Selected Work" section will render placeholder videos until real media is supplied.
6. **Dead Vite-starter CSS** in `src/App.css` (`.counter`, `.hero .base/.framework/.vite`, `#next-steps`).
7. `/admin/audit-logs` fixed in Phase A; `/admin/storage` nav link still routes nowhere (falls back to dashboard).

---

## 1. Frontend architecture

| Concern | Reality |
|---|---|
| Framework | React **19.2**, Vite **8.2**, `@vitejs/plugin-react`. No TypeScript. |
| Styling | Tailwind **4.3** via `@tailwindcss/vite` (no `tailwind.config.js`; tokens live in `src/index.css` under `@layer base :root`). `clsx` + `tailwind-merge` → `cn()` in `src/lib/utils.js`. `components.json` present (shadcn "new-york", `tsx:false`, `rsc:false`) but only `@radix-ui/react-slot` is installed — shadcn primitives are **not** actually wired. |
| Motion | `motion` **13.2** (`motion/react`). `src/design-system/motionTokens.js` + `motionPresets.js` define easing/spring/stagger constants. No `framer-motion`. |
| Icons | `lucide-react` **1.34** (single family, outline). Consistent. |
| Router | **Hand-rolled** in `src/App.jsx` — `window.history.pushState` + `popstate`, a `renderPage()` switch, inline route guards. No `react-router`. |
| Smooth scroll | `lenis` **1.3** via `src/components/ui/smooth-scroll.jsx` (`<SmoothScroll>` wraps the whole app). |
| Entry | `src/main.jsx` → provider stack: `AuthProvider → AuditLogProvider → OrderProvider → CMSProvider → CursorProvider → <App/>`. |
| Data fetching | Every context uses `fetch('/api/...', { credentials: 'include' })` with **relative URLs** (no API base) — the SPA targets whatever origin serves it. |
| Client storage | Only `localStorage['triphoria_cookie_consent']` (CookieBanner). **No auth/session/state in localStorage** — must stay that way. |
| Build | `vite build` → `dist/` (single JS chunk ≈ 912 kB / 230 kB gzip, single CSS ≈ 110 kB). |
| Lint | `oxlint` (`.oxlintrc.json`: `react/rules-of-hooks: error`, `react/only-export-components: warn`). ~109 pre-existing style warnings, 0 errors. |

### 1a. Routes (from `src/App.jsx` `renderPage()`)

| Path(s) | Component | Guard | Public/Role |
|---|---|---|---|
| `/` | `pages/customer/HomePage.jsx` | — | Public |
| `/work` | `pages/customer/WorkPage.jsx` | — | Public |
| `/login`, `/auth`, `/admin/login` | `pages/customer/AuthPage.jsx` | — | Public |
| `/order` | `pages/customer/OrderFlowPage.jsx` | redirects to `/login` on submit if no user | Public → Customer |
| `/order/success/:id` | `pages/customer/OrderSuccessPage.jsx` | — | Public |
| `/dashboard` | `pages/customer/CustomerDashboard.jsx` | `user` truthy else `<AuthPage>` | Customer |
| `/admin/dashboard` (+ `/admin/*` default, `/admin/storage`†) | `pages/admin/BusinessDashboard.jsx` | `isAdmin` else `<AuthPage>` | Admin |
| `/admin/orders`, `/admin/production` | `pages/admin/AdminOrdersPage.jsx` | `isAdmin` | Admin |
| `/admin/editors` | `pages/admin/EditorsManagementPage.jsx` | `isAdmin` | Admin |
| `/admin/cms` | `pages/admin/CMSManagerPage.jsx` | `isAdmin` | Admin |
| `/admin/audit-logs` | `pages/admin/AuditLogsPage.jsx` | `isAdmin` | Admin |
| `/editor/dashboard` (any `/editor/*`) | `pages/editor/EditorDashboard.jsx` | `isEditor \|\| isAdmin` | Editor |
| `/docs` | `pages/docs/MotionDocsPage.jsx` | — (early return, no shell) | Internal |
| default | `HomePage` | — | Public |

† `/admin/storage` is a `Navbar` link with **no route** → falls through to `BusinessDashboard`.

### 1b. React contexts and owned state

| Context (`src/context/`) | State | Key actions | Endpoints |
|---|---|---|---|
| `AuthContext.jsx` | `user`, `editors[]`, `loading` | `login`, `register`, `logout`, `switchRole` (DEV only), `addEditor`, `deleteEditor`, `generateEditorPassword`, `refreshEditors` (admin-gated since Phase A), `canAccessOrder`, `canPerformAction` | `/api/auth/*` |
| `OrderContext.jsx` | `orders[]` (server-scoped to caller), `loading` | `createOrder` (+ idempotency key), `approveOrder`, `rejectOrder`, `reassignEditor`, `uploadEditorOutput`, `approveFinalDelivery`, `requestRevision`, `softDeleteStorage`/`restoreStorage`/`purgeStorage`, `trackDownload`, `getOrderById`, `refreshOrders`. Exports `STATE_EXPLANATIONS`. | `/api/orders/*`, `/api/storage/authorize-download` |
| `CMSContext.jsx` | `portfolio[]`, `featured[]`, `social[]`, `loading` | `setFeaturedSlots`, `addPortfolioProject`, `updatePortfolioProject`, `deletePortfolioProject`, `toggleProjectPublish`, `addSocialPost`, `deleteSocialPost`, `toggleSocialPublish`, `refreshCMS`. Uses admin vs public endpoints based on `user.role`. | `/api/cms/*` |
| `AuditLogContext.jsx` | `auditLogs[]`, `loading` | `refreshLogs` (admin only), `logAction` (optimistic local only — never persisted) | `/api/audit-logs` |
| `CursorContext.jsx` | `cursorType`, `cursorText`, `isTouchDevice` | `setCursor`, `resetCursor` | none (pure UI) |

---

## 2. Existing features / workflows (must remain functionally intact)

### Authentication & RBAC
- One login form (`AuthPage`), server determines role, redirect by `user.role`. `httpOnly` + `SameSite=Lax` + `Secure`(prod) session cookie, 30-day, DB-backed opaque token. `switchRole` + quick-login buttons are **DEV-only** (`import.meta.env.DEV`). Server enforces `requireAuth` / `requireRole`; every scoped route re-checks ownership. **No frontend role switching in production.**

### Customer workflow
`OrderFlowPage` 3-step wizard (details → Google Drive link, host-validated → review) → `createOrder` (`POST /api/orders` + `idempotency-key`) → status **Pending Approval** → `/order/success/:id`.
`CustomerDashboard`: own orders only, status tallies, list + detail panel, **Watch Preview**, **Approve Final Cut** (`/complete`, `Review→Completed`), **Request Revision** (`/revision`, `Review→In Progress`), **Download Master** (`Completed`, signed link).

### Editor workflow
`EditorDashboard`: `orders.filter(o => o.assignedEditorId === user.id)` (also server-scoped). Brief, Google Drive link, editing directives, **Upload Output Cut** modal → `uploadEditorOutput` (`/outputs`, `In Progress→Review`). Phase A: the deliverable URL field is now empty + required + rejects sample hosts.

### Admin workflow
- `BusinessDashboard`: pending / in-progress / review counts, `<48h` deadline alerts, pending queue, editor-capacity snapshot, nav tiles.
- `AdminOrdersPage`: filter + search; **Approve & Assign** (pick editor), **Reject** (reason), **Reassign** (while In Progress), **Approve Delivery** / **Request Revision** (while Review), output previews.
- `EditorsManagementPage`: onboard editor (auto password, returned once — Phase A made this async), per-editor live workload, deactivate (blocked while holding In Progress/Review orders), reassign.
- `CMSManagerPage`: 3 tabs — **Featured Work** (exactly 3 slots, atomic `POST /api/cms/featured-slots`), **Portfolio Archive** (CRUD + publish toggle), **Instagram & Social** (add/delete/publish). Phase A cleared the Big Buck Bunny form defaults.
- `AuditLogsPage`: searchable/filterable table (Phase A fixed the `logs`/`auditLogs` crash).

### Order state machine (server-authoritative — never bypass from UI)
```
Pending Approval ──approve(admin,+editor)──▶ In Progress ──outputs(assigned editor/admin)──▶ Review
      │                                            ▲                                          │
      └──reject(admin,+reason)──▶ Rejected         └───────── revision(owner/admin,+notes) ───┘
                                                   Review ──complete(owner/admin)──▶ Completed (+14-day retention)
```
Every transition: `withTransaction`, `409 CONFLICTING_STATE` on wrong current status, one `audit_events` row.

---

## 3. Existing APIs

Base: `/api`. Auth: **none** = no guard; **requireAuth** = any session; **requireRole('admin')**.

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/health` | none | `{status, database:"Supabase Postgres", runtime}` |
| GET | `/api/auth/me` | none | `{user, authenticated}` |
| POST | `/api/auth/login` | none | 400/401/403 or 200 + `Set-Cookie` |
| POST | `/api/auth/logout` | none | deletes session row |
| POST | `/api/auth/register` | none | role hard-set `customer` |
| GET | `/api/auth/editors` | **requireRole('admin')** | roster (Phase A locked this) |
| POST | `/api/auth/editors` | requireRole('admin') | 201 `{editor:{…,password}}` (one-time), min-10-char, ~72-bit auto-gen |
| DELETE | `/api/auth/editors/:id` | requireRole('admin') | 400 if holds active orders |
| GET | `/api/orders` | requireAuth | scoped: admin=all / editor=assigned / customer=own |
| GET | `/api/orders/:id` | requireAuth | 403 unless admin\|owner\|assigned editor |
| POST | `/api/orders` | requireAuth | `idempotency-key` header; Drive URL host-validated |
| POST | `/api/orders/:id/approve` | requireRole('admin') | `{editorId*, adminNotes}` → In Progress |
| POST | `/api/orders/:id/reject` | requireRole('admin') | `{rejectionReason*}` → Rejected |
| POST | `/api/orders/:id/reassign` | requireRole('admin') | `{newEditorId}` |
| POST | `/api/orders/:id/outputs` | requireAuth | admin\|assigned editor; status In Progress\|Review → Review |
| POST | `/api/orders/:id/complete` | requireAuth | admin\|owner; Review → Completed |
| POST | `/api/orders/:id/revision` | requireAuth | admin\|owner; Review → In Progress |
| POST | `/api/orders/:id/storage/{soft-delete,restore,purge}` | requireRole('admin') | lifecycle bookkeeping |
| GET | `/api/cms/portfolio` \| `/featured` \| `/social` | none | published rows only |
| GET | `/api/cms/admin/portfolio` \| `/admin/social` | requireRole('admin') | all rows |
| POST | `/api/cms/portfolio` · PUT `/portfolio/:id` · DELETE `/portfolio/:id` | requireRole('admin') | |
| POST | `/api/cms/featured-slots` | requireRole('admin') | `{slot1Id, slot2Id, slot3Id}` atomic |
| POST | `/api/cms/social` · DELETE `/social/:id` | requireRole('admin') | |
| GET | `/api/audit-logs` | requireRole('admin') | `?limit=200` |
| POST | `/api/storage/authorize-upload` | requireAuth | HMAC token, order-ownership checked (Phase A) |
| PUT | `/api/storage/upload?token=` | HMAC token | local FS, ephemeral on Vercel — **not used by UI** |
| GET | `/api/storage/authorize-download` | requireAuth | `orderId` required, order-ownership + asset-membership (Phase A) |
| GET | `/api/storage/download?token=` | HMAC token | streams local file or `302`→https URL |

**The redesign consumes these as-is.** No API contract changes are required for the visual/UX work. Any new capability (e.g. richer video metadata) would need a deliberate schema + endpoint change — see §9.

---

## 4. Database entities (live Supabase — Phase C)

10 tables. Ids are `TEXT`. Timestamps stored as ISO-8601 **text**. Boolean-ish flags are `integer` (0/1).

| Table | Key columns relevant to redesign |
|---|---|
| `users` | `id, name, email, password_hash, role('admin'\|'editor'\|'customer'\|'client'), specialty, max_capacity, avatar_url, organization, status, created_at` |
| `sessions` | `id, user_id→users, token, expires_at, created_at` |
| `orders` | `id, client_id→users, status, package_name, editing_style, platform, target_length, project_name, instructions, google_drive_url, deadline, assigned_editor_id→users, admin_notes, rejection_reason, idempotency_key, created_at, updated_at` |
| `order_files` | `id, order_id→orders(CASCADE), filename, size_bytes, mime_type, storage_key, upload_status, checksum, created_at` |
| `output_versions` | `id, order_id→orders(CASCADE), version_tag, editor_id→users, storage_key, format, resolution, runtime, size_bytes, notes, is_authoritative, uploaded_at` |
| `storage_lifecycle` | `order_id(PK)→orders(CASCADE), status, bytes_total, retention_expires_at, soft_deleted_at, purged_at` |
| `audit_events` | `id, actor_id, actor_role, action, entity_type, entity_id, details, metadata_json, created_at` |
| `cms_projects` | `id, title, client, format, runtime, category, description, thumbnail_url, video_url, social_provider, social_url, playback_url, aspect_ratio, camera, color_grade, audio_mix, pacing, is_featured, featured_slot, is_published, created_at` |
| `cms_social` | `id, platform, url, title, caption, thumbnail_url, likes, is_published, created_at` |
| `idempotency_records` | `key(PK), response_status, response_body, created_at` |

**`cms_projects` already supports the redesign's Video Library needs** — `aspect_ratio`, `category`, `format`, `runtime`, `thumbnail_url`, `playback_url`, `social_provider`, `social_url`, `is_featured`, `featured_slot`, `is_published` are all present. What's missing for the brief's Video Library filters: a **tags** field and an explicit **format-type enum** (`Reel` / `Short` / `Long Form`) distinct from the free-text `format`. These are optional schema additions (§9), not blockers.

**Live data is 100% demo/test (Phase C):** 6 demo users + 4 test editors, 5 demo + 3 test orders, 5 `cms_projects` and 3 `cms_social` all pointing at `commondatastorage.googleapis.com` sample videos / placeholder Instagram URLs. The redesign must not invent data, and the public site will show placeholder media until real content is added via the CMS.

---

## 5. Existing reusable components

| File | What it is | Redesign disposition |
|---|---|---|
| `components/layout/Navbar.jsx` | Role-aware nav, DEV role ribbon, mobile drawer, logout | **Rebuild** — lightweight premium nav per brief §6; keep role logic + DEV ribbon behind `import.meta.env.DEV` |
| `components/layout/Footer.jsx` | Public footer | **Rebuild** (editorial, CMS-driven links §24) |
| `components/common/StatusBadge.jsx` | Order-status pill; reads `STATE_EXPLANATIONS` | **Keep + restyle** to the badge token system; add `Revision Requested` visual |
| `components/common/VideoPlayer.jsx` | `<video>` wrapper + `getAutoThumbnail()`, `extractVideoEmbed()` | **Keep as the low-level player**, wrap in new `VideoPlayer`/`VideoModal` |
| `components/common/VideoThumbnailScrubber.jsx` | Hover-scrub thumbnail | **Fold into** `VideoCard` preview behavior |
| `components/common/InstagramEmbed.jsx` | IG embed (used only inside VideoPlayer) | Keep |
| `components/common/InvoiceModal.jsx` | **Dead — never imported** | Delete or leave; not referenced |
| `components/ui/smooth-scroll.jsx` | lenis wrapper | Keep |
| `components/ui/CookieBanner.jsx` | consent banner (`localStorage`) | Keep + restyle |
| `components/ui/film-primitives.jsx` | `CropMarks`, `TimelineTickTrack` (HomePage) | Keep — good editorial texture |
| `components/ui/motion-primitives.jsx` | reveal/stagger helpers used by timeline/carousel | **Consolidate** into a documented `Reveal/Stagger/TextReveal/ImageReveal` set (§53) |
| `components/ui/{button,magnetic-button,rainbow-button,container-scroll-animation,continuous-timeline,phone-carousel,custom-cursor}.jsx` | marketing/landing primitives | Audit individually; keep `magnetic-button`, `continuous-timeline`; `rainbow-button` likely drop (not on-brand) |
| `components/motion-ui/*` (CodeBlock, CommandMenu, CopyButton, LiveExample, MotionButton, RuntimeSwitcher) | Used only by `MotionDocsPage` | Leave as-is (internal docs page) |
| `design-system/motionTokens.js`, `motionPresets.js` | easing/spring constants | Keep; reference from the new motion primitives |

**Missing components the redesign must build (brief §36, §53):**
`VideoCard`, `VideoGrid`, `VideoLibrary`, `FeaturedVideoGrid`, `VideoMeta`, `VideoStatus`, `AspectFrame`; `ProjectCard`, `ProjectHeader`, `ProjectTimeline`, `ProjectVersions`, `OutputVersionCard`; `EditorCard`, `EditorWorkload`, `EditorAssignmentDialog`; `Reveal`, `Stagger`, `TextReveal`, `ImageReveal`, `Scene` (background-scene wrapper); plus `EmptyState`, `ErrorState` primitives (§40–41).

---

## 6. Existing visual system (`src/index.css`, 625 lines)

**Strong foundation already present:**
- **Palette tokens:** `--background #0B0C0E`, `--surface #17181B`, `--primary #00CDB8` (teal), `--accent #D8FF00` (lime — brief specifies `#D4FF00`, near-identical), `--secondary #B7A8FF` (lavender), `--teal-deep #004C47`, `--foreground #FAFAF5` (cream), plus `--success/--warning/--error` + `-muted` variants and border tokens.
- **Type scale:** `--text-xs … --text-display (72px)`; utility classes `.type-display` (clamp 48–88px, line-height 0.95, tracking −0.055em), `.type-h1/h2/h3`, `.type-body*`, `.type-label` (uppercase mono), `.type-eyebrow` (mono, teal). Plus legacy `.font-*` aliases.
- **Fonts:** `Inter` (400–800) + `JetBrains Mono` (400–500), loaded via Google Fonts `@import`.
- **Buttons:** `.btn-primary`, `.btn-primary-lg`, `.btn-ghost`, `.btn-accent`, `.btn-danger`, `.announcement-pill`.
- **Surfaces/inputs:** `.triphoria-surface`, `.triphoria-surface-elevated`, `.triphoria-input`.
- **Status badges:** `.badge-pending/progress/review/completed/rejected`.
- **Textures:** `.film-grid-env`, `.film-scanlines`, `.customer-logo-strip` (grayscale).
- **Spacing / radius / shadow / layout tokens**, `--section-gap: 120px`, `--page-max-width: 1280px`.
- **`prefers-reduced-motion`** global reset already in place.
- A large block of **legacy compatibility mappings** (`--color-aubergine-ink`, `--color-espresso`, Motion-era tokens) — cruft to prune.

**Gaps vs. brief:**
| Brief requirement | Current state | Action |
|---|---|---|
| Multi-scene backgrounds (§32): cream / black / green / teal / lime / dark-editorial | One flat `--background` | Add `--scene-*` token sets + a `<Scene variant>` wrapper that sets `background`/`color`/border tokens for its subtree |
| Palette additions: `#FAFAF5` cream **as a surface**, `#F1FFC9` pale lime, `#FFFFFF` white, `#52605E` muted-technical-grey | cream is only `--foreground`; pale lime / white-surface / that grey missing | Add `--paper`, `--paper-2`, `--pale-lime`, `--ink` (for light scenes), `--muted-tech #52605E` |
| Radius discipline (§34): NOT 24px everywhere; sharp editorial + varied | `--radius-cards: 16px`, `--radius-images: 24px`, `--radius-buttons: full` | Introduce `--radius-editorial: 2px`, `--radius-media: 6px`, reserve `--radius-full` for pills/avatars only; retire blanket `--radius-cards` |
| Two font families max, editorial grotesk (§2) | Inter + JetBrains Mono (already 2) | Keep Inter (safe, no new dep) **or** swap Inter → a grotesk (e.g. *Geist*, *General Sans*, *Space Grotesk*) via Google Fonts — **decision needed** |
| Depth = 3 levels only, restrained shadow (§33) | Has `--shadow-sm/md/lg` + two glow shadows | Prefer border-driven separation; keep glow for primary CTA only |
| Dead CSS | `src/App.css` full of Vite-starter rules | Delete `src/App.css` (verify no import) |

**`src/App.css`** currently holds only Vite template CSS (`.counter`, `.hero .base/.framework/.vite`, `#center`, `#next-steps`). It is imported by `src/App.jsx`? — must verify; if unused, delete.

---

## 7. Reference site — reverse-engineered design intelligence

Source: `https://small-desert-324593.framer.app/` — a Framer template for a YouTube-creator video-editing agency ("CreatorFlow"). **We take structure, rhythm, and psychology; we take none of its content, colors, copy, testimonials, stats, pricing, or brand.**

### Section structure & conversion flow
```
HERO            headline split across lines ("Video Edits / That / Stand Out!"),
                benefit subhead, single CTA, immediate trust signals
ABOUT           one-line positioning + metric row
SERVICES        4 offering cards, each with an uppercase tag ("Viral-Ready", "Retention-Driven")
PROCESS         numbered 4-step flow (Upload → Magic → Feedback → Publish), monospace file mockups
HALL OF FAME    3 project cards with creator + title + view metric
PROBLEM/SOLUTION  two-column comparison (pain ↔ fix)
PRICING         3 tiers, "Popular" badge on the middle one
REVIEWS         short handle-attributed testimonials
CTA BLOCK       "Book a 15-min intro call", email alternative
FAQ             4 expandable Q&A
BLOG            4 article links
FOOTER          final push + nav + socials
```
Psychology: **Hook → Credibility → Demonstration → Decision → Action → Retention.**

### Design language (what to reuse)
- **Editorial hierarchy:** oversized display headline broken onto multiple lines for rhythm; generous vertical section padding (~60–100px+); left-aligned body under centered headlines.
- **Alternating section backgrounds** create the page's rhythm (light → off-white → a dark/accent section for contrast at decision points).
- **Card-based service menu**, **numbered process with file-name texture** (monospace `Final_Cut_v2.mp4` etc. — maps perfectly to TRIPHORIA's real `output_versions.version_tag` + `format`).
- **"Hall of Fame" = selected work** with per-item metadata (creator, format, metric).
- **Problem/Solution two-column** is a strong, bold, low-effort trust device.
- **Repeated single primary CTA** — one verb, everywhere.
- **Uppercase micro-labels / tags**, **monospace for technical/file text**.
- Implied motion: fade/slide-in on scroll, staggered reveals, hover lift on cards, expandable FAQ, smooth section transitions.

### What TRIPHORIA must do differently (brief §5, §25, §28, §56, §57)
| Reference does | TRIPHORIA does instead |
|---|---|
| "500+ videos", "4.9★", "2M+ views" | **No invented metrics.** Proof = the product: real version history, the audit trail, the state machine, CMS-managed real work. Show a metric only if it comes from the DB. |
| Pricing tiers with `$899 / $1599` + SLAs | Show packages only if they are real offerings; **no "48-hour" claim** unless a real SLA exists. `initialData.js` has 3 package names (`Starter Cut`, `Pro Creator`, `Cinematic Master`) used at order time — surface those as *scope tiers*, not fake pricing, unless prices are confirmed. |
| Testimonials (`@mark_locus`) | **None** until real ones exist. Replace the "Reviews" slot with a **"How the workflow protects you"** proof section (versions tracked, revisions logged, delivery controlled). |
| "Hall of Fame" view counts | "Selected Work" — creator, format (9:16 / 4:5 / 16:9), platform, category. **No views** unless real. |
| Blog | Drop (no content). Optionally a future "Field Notes" — out of scope now. |
| Generic agency vibe | Studio + operating-system duality: cinematic public face, real production console inside, same design language, different density. |

---

## 8. What gets redesigned vs. what stays functionally frozen

### REDESIGNED (visual / UX / composition — behavior preserved)
- **Design tokens** — add multi-scene backgrounds, light-scene palette, radius discipline, prune legacy cruft, (optional) font swap.
- **`Navbar`, `Footer`** — rebuilt.
- **Public site (`HomePage`, `WorkPage`)** — recomposed into the section rhythm above (Hero, Selected Work, Services, How It Works = the real state machine, Problem/Solution, CTA). CMS-driven.
- **`OrderFlowPage`** — same fields + same `createOrder` call; add explicit **format** (Reel/Short/TikTok/YouTube/Long-form/Podcast/Other) and **aspect ratio** (default 9:16 for short-form) as first-class inputs mapped onto existing `platform` / `target_length` / `editing_style` (or a small additive schema change — §9).
- **`CustomerDashboard`** — "personal production workspace": active-project hero with 9:16 preview, status, editor, latest version, one primary action; project timeline.
- **New customer project page** — production-workspace layout (header, large player, version gallery, review actions, activity timeline). *(New route; wraps existing `getOrderById` + `/complete` + `/revision`.)*
- **`EditorDashboard`** — production board: TODAY / UPCOMING / IN REVIEW / COMPLETED lanes, 9:16 previews, one primary action per card. Editor project workspace with brief + raw link + versioned upload.
- **`BusinessDashboard`** — operational control center (active / awaiting approval / in editing / awaiting review / completed; overloaded editors; overdue; unassigned; featured; recent activity).
- **`AdminOrdersPage`** — project management + a proper **assignment dialog** (workload-aware editor picker).
- **`EditorsManagementPage`** — roster with workload bars, enable/disable, assignment.
- **`CMSManagerPage`** → **Video Library** — media-first grid/list, filters (All / Reels / Shorts / Long Form / Featured / Published / Draft), search, sort, per-item preview + Edit/Feature/Publish/Delete, the **exactly-3-featured** constraint enforced in UI (server already enforces the slot model).
- **`AuditLogsPage`** — production activity timeline (keep the table as a dense secondary view).
- **`AuthPage`, `OrderSuccessPage`, `CookieBanner`, empty/error/loading states** — restyled.
- **Motion** — consolidated `Reveal/Stagger/TextReveal/ImageReveal`, 3 motion levels, `prefers-reduced-motion` respected.

### FROZEN (must NOT change)
- **Every API contract in §3** and the request/response shapes the contexts expect.
- **Auth model:** custom Express session cookie, server role resolution, no localStorage auth, no frontend role switching, RBAC + ownership re-checks.
- **Order state machine** and its transitions/guards — UI may only call the existing endpoints; never write status client-side.
- **Idempotency** on order creation.
- **Audit logging** — server writes it; UI only reads.
- **DB schema** — no destructive changes; any addition is additive + `IF NOT EXISTS` (§9).
- **Storage model:** raw footage = Google Drive URL (validated, not stored); outputs = hosted URL string; no fake/sample media; `STORAGE_SECRET` has no fallback (Phase A).
- **Seed gate:** production seeds admin-only (Phase A).
- **`server/*`, `api/*`, `vercel.json`** — untouched by the redesign unless a specific additive change is agreed.
- **`CODEBASE-MAP.md`** — stays untracked, not committed (standing instruction).
- **`main` branch** — not merged, not modified.

### NEEDS ARCHITECTURAL IMPROVEMENT (propose, don't force)
1. **Router** — the hand-rolled `pushState` switch in `App.jsx` is brittle for the new nested customer/editor/admin sections and a project detail route. Options: (a) keep and extend carefully, (b) introduce `react-router-dom` (one dependency; brief §54 says "do NOT add another *UI* framework / *animation* framework" — a router is arguably neither, but it IS a new dep). **Recommend (a) keep** for this pass to honor "no unnecessary dependencies", and factor the switch into a small route table.
2. **Video metadata** — `cms_projects` lacks `tags` and a discrete `media_type` enum (`reel`/`short`/`long`). Additive migration (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`) + widen `POST/PUT /api/cms/portfolio` — small, safe, needed for the Video Library filters to be real rather than derived from `aspect_ratio`.
3. **Order → format/aspect** — `orders` has no explicit `aspect_ratio` / `media_type`; today it's implied by free-text `platform`. Additive columns would make the customer wizard and editor workspace honest. Alternative: derive from `platform` string (no schema change) for this pass.
4. **`AuditLogContext.logAction`** is a dead optimistic no-op — either wire nothing (fine) or remove it.
5. **`/admin/storage`** nav link → route it or remove it.
6. **`InvoiceModal.jsx`** — dead; remove.
7. **CMS demo media** — the public site will show Big Buck Bunny until real media is entered. Not a code problem; a content prerequisite (Phase C cleanup).
8. **Bundle size** — 912 kB single chunk. The redesign should introduce route-level `React.lazy` splitting (public vs. customer vs. editor vs. admin) to protect the public-site LCP.

---

## 9. Proposed additive schema changes (for discussion — none applied)

All would be `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` in `server/schema.sql`, backward-compatible, no data loss:

| Table | Column | Purpose |
|---|---|---|
| `cms_projects` | `media_type text` (`reel`\|`short`\|`long`\|`other`) | Video Library filter tabs (brief §10, §37) |
| `cms_projects` | `tags text` (comma-sep or JSON) | Library search/filter by tag (§9) |
| `orders` | `aspect_ratio text` | First-class 9:16 / 4:5 / 1:1 / 16:9 on the wizard + editor workspace (§8, §12) |
| `orders` | `media_type text` | Reel/Short/Long-form as a real field, not parsed from `platform` |

If we prefer **zero schema change** this pass, the redesign derives `media_type`/`aspect_ratio` from the existing `aspect_ratio` (cms) and `platform` (orders) strings — acceptable but lossy.

---

## 10. Risks & constraints for the redesign

1. **Not deployed.** Production is still `main` with no API (Phase B blocker). The redesign can be verified locally against the live Supabase DB (as Phases A–C were) but **cannot** be verified on a real Vercel URL until the Preview deploy happens. QA claims will be scoped accordingly.
2. **Demo data.** Public "Selected Work" renders placeholder videos until real CMS content exists. Not fixable in code.
3. **Bundle / performance.** A media-heavy redesign must add lazy video + route splitting or the public LCP regresses.
4. **Scope.** 23 implementation phases. This must land in **reviewable batches** (tokens+components → public site → customer → editor → admin → polish/QA), each building + lint-clean, not one irreversible dump.
5. **`main`/production/live-data** remain off-limits per the standing constraints.
6. **No new deps** — Inter/Motion/lucide/Tailwind/lenis only. A router or a new font (Google Fonts, no package) are the only debatable additions.

---

## 11. Recommended implementation batches (maps to brief §58)

| Batch | Brief phases | Deliverable | Verify |
|---|---|---|---|
| **B0 (this doc)** | 1 | `TRIPHORIA-REDESIGN-AUDIT.md` | — |
| **B1** | 2, 3, 29–34, 52, 53 | `index.css` token overhaul (scenes, palette, radius, prune) + `Scene`, `Reveal/Stagger/TextReveal/ImageReveal`, `VideoCard/VideoPlayer/VideoModal/AspectFrame`, `EmptyState/ErrorState`, restyled `Button/Input/Badge` + `docs/TRIPHORIA-DESIGN-SYSTEM.md` | `lint` + `build`; visual smoke of primitives |
| **B2** | 4–10, 25–28, 30, 45 | Public: `Navbar`, `Footer`, `HomePage` (hero, selected work, services, how-it-works = state machine, problem/solution, CTA), `WorkPage`/Video library public view — all CMS-driven | `lint`+`build`; browser pass at 375/768/1440; verify `/api/cms/*` calls |
| **B3** | 12–14, 51 | Customer: `OrderFlowPage`, `CustomerDashboard`, new project workspace + review/version experience | browser: create order, review, request revision, approve — against live API |
| **B4** | 15–16, 50 | Editor: `EditorDashboard` production board + project workspace + versioned upload | browser: assigned-only isolation, upload V1/V2 |
| **B5** | 17–21, 23, 48–49 | Admin: `BusinessDashboard` control center, `AdminOrdersPage` + assignment dialog, `EditorsManagementPage` workload, `CMSManagerPage` → Video Library, `AuditLogsPage` timeline | browser: approve/assign/reassign, exactly-3-featured, audit |
| **B6** | 19–22, 43, 44, 55, 59, 60 | Motion polish, responsive recomposition, a11y, perf (lazy routes/video), full E2E QA + `docs/TRIPHORIA-REDESIGN-IMPLEMENTATION.md` | full matrix |

---

## 12. Decisions required before B1

1. **Font:** keep **Inter** (zero risk, brief-compliant) or swap the sans to an editorial grotesk via Google Fonts (*Geist* / *General Sans* / *Space Grotesk*)? Mono stays JetBrains Mono either way.
2. **Scope of this engagement:** all of B1–B6, or start with **B1 + B2 (design system + public site)** and treat the dashboards as a follow-on? (The public site is the highest-visibility, lowest-risk win; dashboards are larger and touch live workflows.)
3. **Schema:** allow the 4 additive columns in §9, or derive everything from existing strings (no schema change) this pass?
4. **Branch:** continue on `fix/express-api-supabase-postgres`, or start `redesign/triphoria-studio-ui` off it? (Redesign is a distinct workstream; a dedicated branch keeps the API-hardening history clean.)
5. **Deploy blocker:** leave the Phase B Vercel Preview blocker as-is (redesign verified locally only), or is Vercel access now available so the redesign can be verified on a real Preview URL?
