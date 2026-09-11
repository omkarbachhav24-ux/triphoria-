# TRIPHORIA — Design System

The system that both faces of the product share: a premium creative-studio website on the outside, a production operating system on the inside. Same language, different information density.

- **Source of truth for tokens:** `src/index.css` (`:root` + `[data-scene='…']` blocks).
- **Motion constants:** `src/design-system/motionPresets.js`.
- **Primitives:** `src/components/ui/`, `src/components/video/`, `src/components/motion/`.
- Stack (fixed): React 19 · Vite 8 · Tailwind 4 (CSS `@theme`/tokens, no config file) · `motion` 13 · `lucide-react` · `lenis`. **No new UI or animation framework.**

---

## 1. Colour

### 1.1 Base palette (dark shell — the default)

| Token | Value | Use |
|---|---|---|
| `--background` | `#0B0C0E` | Level 1 — environment |
| `--background-dark` | `#07080A` | deepest field |
| `--background-elevated` | `#17181B` | raised environment |
| `--surface` / `--surface-alt` / `--surface-hover` | `#17181B` / `#1F2024` / `#26272C` | Level 2 — panels |
| `--foreground` | `#FAFAF5` (cream) | body text |
| `--foreground-strong` | `#FFFFFF` | display / headings |
| `--foreground-muted` | `#A1A1A6` | secondary copy |
| `--foreground-subtle` | `#6F7075` | metadata / mono labels |
| `--ink-muted` | `#52605E` | muted technical grey (brief) |
| `--border` / `--border-subtle` / `--border-strong` | `rgba(255,255,255,.10 / .06 / .18)` | Level 2/3 separation |
| `--primary` | `#00CDB8` teal | primary action, active state |
| `--on-primary` | `#0B0C0E` | text/marks on a filled primary control |
| `--accent` | `#D8FF00` lime (`--lime` = brief-spec `#D4FF00`) | high-energy accent, one per view |
| `--on-accent` | `#0B0C0E` | text on filled accent |
| `--secondary` | `#B7A8FF` lavender | Review state, tertiary highlight |
| `--teal-deep` | `#004C47` | surface accent |
| `--success` `--warning` `--error` | `#34D399` `#FBBF24` `#EF4444` (+ `-muted`) | status only |

### 1.2 Light-scene palette

| Token | Value |
|---|---|
| `--paper` | `#FAFAF5` cream field |
| `--paper-2` | `#FFFFFF` white surface on cream |
| `--paper-3` | `#F4F3EA` recessed panel on cream |
| `--pale-lime` | `#F1FFC9` soft lime field |
| `--ink` | `#0B0C0E` marks on light |

**Rules**
- Never use raw purple/black "AI" gradients, neon sweeps, or glassmorphism.
- `--accent` (lime) appears **once** per viewport maximum — a single point of energy.
- Status colours are for status. Do not decorate with `--success`/`--warning`.
- Contrast: body text ≥ 4.5:1, large display ≥ 3:1, on every scene.

### 1.3 Scenes

A `<Scene variant>` (`src/components/ui/Scene.jsx`) rebinds the semantic tokens for its subtree via `[data-scene='…']`. A section flips fields without any per-component colour code.

| variant | field | role in the page rhythm |
|---|---|---|
| `black` *(default, no attr)* | `#0B0C0E` | the app shell; hero; most product surfaces |
| `paper` | `#FAFAF5` cream | editorial breathing room — About, How It Works |
| `pale-lime` | `#F1FFC9` | light energy — a single mid-page lift |
| `green` | `#04322F` deep green | trust / credentials |
| `teal` | `#00CDB8` field | a bold decision moment (CTA), used sparingly |
| `lime` | `#D4FF00` field | maximum energy — one CTA or one stat band, never a whole page |
| `dark-editorial` | `#07080A` | proof / problem→solution, higher contrast than the shell |

Reference rhythm (public site): `black` hero → `paper` positioning → `black` selected work → `dark-editorial` problem/solution → `paper` how-it-works → `teal` or `lime` CTA → `black` footer. Transitions are a plain background change with a `Reveal` on the incoming content — no parallax, no pinned scroll-jacking.

---

## 2. Typography

Two families only: **Inter** (400–800) for everything, **JetBrains Mono** (400–500) for technical/metadata/file text. Loaded via one Google Fonts `@import` in `src/index.css`.

### 2.1 Scale (utility classes in `src/index.css`)

| Class | Size | LH / tracking | Use |
|---|---|---|---|
| `.type-display` | `clamp(48px, 8vw, 88px)` | 0.95 / −0.055em / 700 | hero, section openers |
| `.type-h1` | `clamp(36px, 5vw, 56px)` | 1.05 / −0.04em / 700 | page titles |
| `.type-h2` | `clamp(28px, 3.5vw, 40px)` | 1.15 / −0.035em / 600 | section headings |
| `.type-h3` | `clamp(22px, 2.5vw, 28px)` | 1.25 / −0.025em / 600 | sub-sections, card titles |
| `.type-body-lg` | 18px / 1.6 | intro paragraphs |
| `.type-body` | 16px / 1.6 | body |
| `.type-body-sm` | 14px / 1.5 | dense UI copy |
| `.type-label` | 12px / uppercase / 0.06em / 500 | field labels, table headers |
| `.type-eyebrow` | 12px mono / uppercase / 0.1em / teal | section kicker above a heading |
| `.type-mono` | JetBrains Mono / 0.04em | timecodes, ids, file names, versions |

**Rules**
- Break oversized display headlines onto deliberate lines for rhythm (reference technique). Use `<br/>` or `<TextReveal>` per line.
- Numbers, IDs (`ORD-1234`), version tags (`V2`), formats (`ProRes 422`), timecodes, filenames → **mono**.
- Uppercase only for `.type-label` / `.type-eyebrow` / tags — never for body or headings.
- Max heading weight 700. No 800/900 display.
- Product screens step the scale down one notch (dashboards open at `.type-h1`, not `.type-display`).

---

## 3. Spacing, grid, breakpoints

- **Spacing tokens:** `--space-1…32` (4→128px), 4px base. Use multiples of 4.
- **Page:** `--page-max-width: 1280px`, `--page-padding: 24px` (16px < 640). Content column ~`720–840px` for prose.
- **Section rhythm:** `--section-gap: 120px` desktop, `72px` ≤ 768, `56px` ≤ 480.
- **Grid:** 12-col conceptually; in practice CSS grid/flex. **Editorial asymmetry is required** — do not build every row as N equal cards. Public "Selected Work" = one large 9:16 + one 4:5 + one 16:9, unequal spans.
- **Breakpoints** (Tailwind defaults): `sm 640` · `md 768` · `lg 1024` · `xl 1280`. QA targets: `375×812`, `768×1024`, `1024×768`, `1440×900`, large desktop.

---

## 4. Radius, borders, depth

### 4.1 Radius discipline (brief §34 — **not** 24px everywhere)

| Token | Value | Use |
|---|---|---|
| `--radius-editorial` | `2px` | panels, cards, tables, most containers |
| `--radius-media` | `6px` | video/image frames (`AspectFrame` default) |
| `--radius-panel` | `10px` | modals, large elevated surfaces, the video modal frame |
| `--radius-md` | `8px` | inputs, buttons |
| `--radius-full` | `999px` | pills, avatars, status dots, icon buttons **only** |

Legacy `--radius-cards (16px)` / `--radius-images (24px)` remain defined for un-migrated pages; **do not use them on new work.**

### 4.2 Borders & depth — three levels, border-driven

1. **ENVIRONMENT** — scene background, optional `.film-grid-env` texture. No shadow.
2. **SURFACE** — `.u-frame` (`1px var(--border)` + `--radius-editorial`). Separation is the border, not a drop shadow.
3. **INTERACTION** — buttons, controls, video states. Hover = `border-strong` or a 1px lift (`y:-1`). The only glow permitted is `--shadow-glow-primary` on the single primary CTA, dark scenes only.

No large shadows. No frosted glass except a modal backdrop blur. Not every element is a floating rounded rectangle.

---

## 5. Components

### 5.1 Buttons (`.btn-*` in `src/index.css`)

| Class | Look | Use |
|---|---|---|
| `.btn-primary` / `.btn-primary-lg` | filled `--primary`, text `--on-primary` | one per view — the main action |
| `.btn-ghost` | transparent, `1px --border`, text `--foreground` | secondary |
| `.btn-accent` | filled `--accent` (lime), text `--on-accent` | rare — a single conversion moment |
| `.btn-danger` | outline `--error` | destructive, always behind a confirm |

Scene-aware: `--primary`/`--on-primary`/`--accent`/`--on-accent` are rebound per scene, so a primary button stays legible on cream / teal / lime fields automatically. Focus ring: `2px var(--primary)`, `outline-offset: 2px` (`.u-focus`).

### 5.2 Inputs — `.triphoria-input` + `<Field>` (`src/components/ui/Field.jsx`)

`<Field label as hint error required />` wraps input/select/textarea: mono uppercase label, `aria-describedby`, inline error, `aria-invalid`. All form UI uses `<Field>`.

### 5.3 Status badges

- `<StatusBadge status>` (existing) — restyle onto `.badge-*` tokens: `badge-pending` (amber), `badge-progress` (teal), `badge-review` (lavender), `badge-completed` (green), `badge-rejected` (red). Add a **Revision Requested** treatment (lavender + dot) — maps to the `Review→In Progress` transition.
- Inline mono dot form for dense lists: `● In Progress` with the tone colour.

### 5.4 Video system (`src/components/video/`)

| Component | Contract |
|---|---|
| `AspectFrame` | `ratio` (`9:16` default · `4:5` · `1:1` · `16:9` · CSS string) · `radius` (`media`/`sharp`/`panel`/`none`) · `frame`. Locks + clips. |
| `VideoCard` | `title` `creator` `category` `platform` `poster` `previewSrc` `ratio` `duration` `version` `status` `featured` `badge` `href`/`onOpen` `size`. Poster still; muted hover-loop **only** for direct MP4 (`previewSrc`); click → caller mounts `VideoModal`. **Renders a field only if passed** — no fabricated duration/views. |
| `VideoModal` | `open` `onClose` `src` `socialUrl` `socialProvider` `poster` `title` `eyebrow` `ratio` `meta`. Portal, ESC + backdrop close, body-scroll lock, ratio-locked frame, wraps existing `VideoPlayer` engine (YT/Vimeo/IG/Drive/MP4). Vertical ratios cap at `max-w-[420px]`. |
| `VideoPlayer` (existing, `common/`) | kept as the playback engine; restyle its baked-in `rounded-xl`/Unsplash fallbacks in B6. |
| *(B5)* `VideoLibrary` `FeaturedVideoGrid` `OutputVersionCard` `VideoMeta` `VideoStatus` | grid/list library, homepage 3-slot grid, editor version gallery. |

**Media rules:** never ship a sample/stock video URL. `previewSrc` autoplay is per-card and pauses on leave — never autoplay multiple large videos at once (§44). Vertical 9:16 is first-class; never crop faces/important content to fit a 16:9 slot.

### 5.5 Empty & error states

- `<EmptyState icon title body action />` — small icon in a `--radius-editorial` square, firm line, short body, optional action. No giant illustration.
  - Customer: "No active projects — Your next edit starts here."
  - Editor: "No assigned edits — You're clear for now."
  - Admin: "No unassigned projects — All active projects currently have an editor."
- `<ErrorState title body onRetry tone />` — concise, actionable: video unavailable, invalid Drive link, upload failed, session expired, permission denied, project not found, network error.

### 5.6 Navigation

- **Public:** lightweight. Left: `TRIPHORIA` wordmark. Centre: Work · Services · How It Works · About · Contact. Right: `Sign In` (ghost) · `Start a Project` (primary). Sticky, `--background/85` + blur on scroll, `1px` bottom border. Mobile: wordmark · menu · `Start Project`.
- **Product:** role-aware. Admin secondary grouping — **Production** (Dashboard, Projects, Video Library) · **Content** (CMS, Featured Work) · **People** (Editors, Customers) · **System** (Audit, Settings). Never show 20 items at once.
- DEV-only workspace/role ribbon stays behind `import.meta.env.DEV`.

### 5.7 Tables

Dense, mono headers (`.type-label`), `1px --border-subtle` row rules, no zebra, no card-per-row. Hover = `--surface-hover`. Numeric/id/date columns right-aligned, mono. Used for Audit (secondary view), customer list, order queue "compact" mode.

### 5.8 Modals

`--radius-panel`, `1px --border`, `--background-elevated`, backdrop `black/85` + blur. Enter/exit from `motionPresets.modalTransition`. ESC + backdrop close, focus trap, body-scroll lock, `role="dialog"` + `aria-modal` + label.

---

## 6. Icons

One family: **lucide-react** (outline, geometric). Sizes: `14 · 16 · 18 · 20 · 24` (32 for feature marks). Consistent stroke. Canonical set: Play, Pause, Upload, Download, Pencil (edit), Trash2, Search, Filter, Calendar, Clock, Video/Film, Clapperboard (project), Scissors (editor), User/Users (customer), MessageSquare (review), Check/CheckCircle2 (approval), Settings, ScrollText (audit), LayoutGrid (CMS), Star (featured), ExternalLink. **No emoji, no 3D icons, no mixed stroke widths.**

---

## 7. Motion (`src/components/motion/Reveal.jsx` + `motionPresets`)

### 7.1 Three levels

| Level | Where | Primitive |
|---|---|---|
| **Micro** (120–200ms) | buttons, icons, hover, cards, status change | `motionPresets.buttonGestures` / `cardGestures`; CSS transitions |
| **Component** (250–400ms) | video cards, project lists, timelines, nav, tabs, modals | `<Reveal>`, `<Stagger>`/`<StaggerItem>`, `modalTransition`, `dropdownTransition` |
| **Scene** (600–800ms) | hero, showreel, major section transitions, featured work, CTA | `<TextReveal>` (word mask+rise), `<ImageReveal>` (clip-path wipe + scale settle) |

### 7.2 Primitives

- `<Reveal direction delay distance>` — fade + small rise, triggers once in view.
- `<Stagger speed>` + `<StaggerItem>` — sequential child reveal (`speed`: `micro` .03 / `standard` .04 / `editorial` .06).
- `<TextReveal text delay speed>` — headline word-by-word.
- `<ImageReveal from delay>` — media wipe-in.

All: **trigger once**, `viewport={{ once:true, amount:.25 }}`, and **render static with no transform when `prefers-reduced-motion`**.

### 7.3 Bans

No constant floating, infinite decorative loops, spinning icons, meaningless parallax, excessive blur, scroll-jacking. Animation communicates hierarchy and quality, never decoration.

---

## 8. Responsive

Recompose, don't shrink. Per breakpoint:
- **375** — single-column narrative; video → title → status → primary action; 44×44 touch targets; nav collapses to a sheet; 9:16 media keeps native shape.
- **768** — two-column metadata; tactile controls.
- **1024–1280** — full timeline / side-by-side compare views.
- **1440+** — asymmetric editorial layout, max typographic impact, generous media framing without horizontal stretch.

---

## 9. Accessibility

- Contrast per §1.2. Visible focus everywhere (`.u-focus`, `2px --primary`).
- Semantic HTML: `<nav>` `<main>` `<section>` with headings, `<button>` for actions, `<a>` for navigation, `<table>` for tabular data.
- Modals: focus trap, ESC, restore focus, `aria-modal`.
- All media controls labelled; captions/`aria-label` on icon-only buttons.
- Respect `prefers-reduced-motion` (global reset in `index.css` + every motion primitive).
- Forms: `<label htmlFor>`, `aria-describedby`, `aria-invalid`, error text in the tab order.

---

## 10. Performance

- Route-level `React.lazy` split: public / customer / editor / admin (B6).
- `loading="lazy"` on all posters; `preload="none"` on `previewSrc`; viewport-gated playback.
- Animate `transform` / `opacity` / `clip-path` only.
- Never autoplay > 1 large video simultaneously.
- Keep the public-site initial payload lean; heavy admin components load on their route.

---

## 11. Do / Don't

**Do:** editorial asymmetry · one accent point per view · border-driven depth · mono for technical text · scene changes for rhythm · real data only · vertical-first video.

**Don't:** rounded-card grids · purple/AI gradients · glassmorphism everywhere · fake stats/testimonials/views/SLAs · sample video URLs · emoji or mixed icons · giant empty hero · infinite/decorative animation · 20-item navigation · dot-grid backgrounds everywhere.
