# TRIPHORIA — CREATORFLOW INTERACTION MATRIX

This matrix documents the interaction audit between the **CreatorFlow reference design** and the **TRIPHORIA production environment**.

---

## 1. COMPONENT INTERACTION MATRIX

| ELEMENT | TRIGGER | CREATORFLOW BEHAVIOR | TRIPHORIA BEHAVIOR | MATCH / MISMATCH | CHANGE REQUIRED |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Navbar Links** | Hover | Text color transitions from muted gray (`#A6A6A6`) to bright white (`#FFFFFF`) with `150ms ease`. | Text color transitions from `#A1A1A6` to `#FFFFFF` with smooth `200ms` transition. | **MATCH** | None |
| **Navbar CTA Button** | Hover / Click | Pill button scales up (`scale: 1.05`) with shadow highlight; press scales down (`scale: 0.98`). | Pill button in `#00CDB8` scales up (`scale: 1.05`) with teal glow shadow; press scales down (`scale: 0.98`). | **MATCH** | None |
| **Hero Primary CTA** | Hover / Press | Background brightens, scales slightly (`scale: 1.02`), right arrow slides `+3px` right. | `#00CDB8` button scales (`1.02`), arrow translates right, active scale `0.98`. | **MATCH** | None |
| **Hero Secondary CTA** | Hover | Dark pill surface brightens from `rgba(255,255,255,0.05)` to `0.1` with border transition. | Surface brightens with white/20 border transition and subtle scale. | **MATCH** | None |
| **Hero Video Monitor** | Hover / Click | Media frame zooms slightly (`scale: 1.02`), play icon scales up (`scale: 1.1`), opens full video view on click. | Frame zooms (`scale: 1.05`), overlay play button spring scales (`1.1`), opens interactive `VideoPlayer` modal. | **MATCH** | None |
| **Ticker Marquee** | Scroll / Continuous | Infinite horizontal loop text marquee presenting agency credentials. | Infinite horizontal marquee using CSS animation with TRIPHORIA studio specs. | **MATCH** | None |
| **Discipline Service Tabs** | Click | Active pill switches background to primary color, smoothly fading in corresponding discipline content. | Active pill switches to `#00CDB8` background; AnimatePresence fades/slides content (`y: 15 -> 0`). | **MATCH** | None |
| **Portfolio Cards** | Hover / Click | Thumbnail zooms `1.05`, title/tags overlay slides up, click opens preview modal or external social link. | Thumbnail zooms `1.05`, play/external badge spring scales, click triggers native `VideoPlayer` or external link. | **MATCH** | None |
| **Comparison Matrix Rows**| Hover | Table row background darkens/highlights slightly to guide visual line reading. | Table row highlights with `bg-white/[0.02]` on hover. | **MATCH** | None |
| **Footer Links** | Hover | Text transitions to white with subtle underline or color shift. | Text transitions to white with `150ms` ease. | **MATCH** | None |
| **Mobile Drawer Menu** | Tap Hamburger | Glass sheet slides down smoothly from top with backdrop blur overlay and staggered link animation. | Glass menu slides down with backdrop blur, staggered link fade-in, and clear close button. | **MATCH** | None |

---

## 2. DURATION & EASING CALIBRATION

- **Micro-Interactions (Buttons, Badges, Links)**: `120ms – 180ms`, ease-out curve (`cubic-bezier(0.22, 1, 0.36, 1)`).
- **Surface Transitions (Tabs, Cards)**: `250ms – 350ms`, spring physics (`stiffness: 300`, `damping: 25`).
- **Section Reveals (Scroll Entrances)**: `500ms – 700ms`, `whileInView` opacity fade and vertical translate (`y: 20px -> 0px`).
