# TRIPHORIA — 3D Cinematic Design System
Version 4.0 | Chief Design Officer Specification

> A digital post-production studio turned into an interactive digital space.

---

## 1. Design Philosophy

TRIPHORIA is a **premium video production workflow platform**. Every visual decision answers one question: *does this feel like a professional post-production studio?*

**Three rules:**
1. Dark when it needs authority. Light when it needs clarity.
2. Every accent must earn its place — teal for interaction, lime for energy, champagne for craftsmanship.
3. Depth from contrast and surface hierarchy, not gratuitous effects.

**Anti-patterns eliminated:**
- Generic SaaS gradients
- Cyberpunk neon
- Random glassmorphism
- Rainbow palettes
- AI-generated blob backgrounds

---

## 2. Color System

### Raw Palette
| Name | Hex | Role |
|---|---|---|
| Obsidian | `#0B0D0D` | Primary dark environment — the void |
| Graphite | `#171B1B` | Dimensional surface layer |
| Deep Petrol | `#083B38` | Premium structural teal |
| Forest Teal | `#0F5A54` | Mid-depth structural |
| Cinematic Teal | `#00C8B5` | Technology / active / interaction |
| Champagne Gold | `#C6A15B` | Craftsmanship / logo / premium detail |
| Soft Gold | `#D8BE86` | Champagne highlight |
| Warm Ivory | `#F4F0E7` | Editorial/light surface |
| Paper | `#FAF8F2` | Cleanest light surface |
| Mist | `#A9B1AE` | Secondary information |
| Acid Lime | `#D7FF3F` | Energy / CTA / active moment |
| Pure White | `#FFFFFF` | Maximum contrast |

### Color Hierarchy
```
OBSIDIAN          → background void
GRAPHITE          → surface layer
DEEP PETROL       → structural depth
CINEMATIC TEAL    → interaction, active states
CHAMPAGNE GOLD    → logo, premium accents
ACID LIME         → CTA energy moments ONLY
WARM IVORY        → editorial light scenes
MIST              → secondary text
```

---

## 3. Color Wheel Relationships

```
Primary analogous family:
  Deep Petrol (#083B38) + Forest Teal (#0F5A54) + Cinematic Teal (#00C8B5)
  → All shift along the same blue-green hue axis

Energetic contrast:
  Teal (#00C8B5) + Acid Lime (#D7FF3F)
  → Complementary tension, used sparingly for maximum impact

Premium neutral:
  Champagne Gold (#C6A15B) + Warm Ivory (#F4F0E7)
  → Warm secondary family for logos and editorial moments

Dark foundation:
  Obsidian + Graphite + Deep Petrol
  → Three-level depth system
```

---

## 4. Typography System

**Two families maximum. Strict roles.**

| Family | Weight | Role |
|---|---|---|
| Inter | 800 | Display, H1, H2 — cinematic statements |
| Inter | 700 | H3, H4 — section titles |
| Inter | 600 | H5, H6, button labels |
| Inter | 400 | Body copy — calm, readable |
| JetBrains Mono | 500 | Metadata ONLY: format, timecode, version, status |
| JetBrains Mono | 400 | Technical labels |

**Type scale:**
- Display: `clamp(52px, 8vw, 80px)` · `line-height: 0.95` · `letter-spacing: -0.045em`
- H1: `clamp(36px, 5.5vw, 64px)` · `letter-spacing: -0.04em`
- H2: `clamp(28px, 3.5vw, 44px)` · `letter-spacing: -0.035em`
- Body: `15px` · `line-height: 1.65`
- Mono: `11-13px` · production metadata only

**Mono is reserved for:** `9:16` `4K` `PRORES` `V1` `FRAME` `TIMECODE` `EDITOR` `STATUS` `DATE` `FORMAT`

---

## 5. Surface System

```
Level 0 — Background void:      #0B0D0D (Obsidian)
Level 1 — Content surface:      #171B1B (Graphite) / #1A1F1F
Level 2 — Raised panel:         #1F2626 / #212827
Level 3 — Floating element:     #263030 / glass-teal
```

Light scenes (paper):
```
Level 0 — Page canvas:          #F4F0E7 (Warm Ivory)
Level 1 — Card surface:         #FAF8F2 (Paper)
Level 2 — Inset panel:          #EBE7DE
```

---

## 6. 3D Material System

**Dark glass:** `rgba(8,59,56,0.40)` + `backdrop-blur(12px)` + teal hairline border
**Light glass:** `rgba(255,255,255,0.04)` + `backdrop-blur(8px)` + subtle border
**Dimensional surface:** `#1F2626` + `border: 1px solid rgba(255,255,255,0.09)`
**Media frame:** `#0B0D0D` background + `rgba(0,200,181,0.12)` border glow

Materials philosophy: physical studio objects — dark glass, smoked glass, brushed graphite, translucent teal panels. No plastic, no toy-like materials.

---

## 7. Lighting System

```
Primary light:    soft teal glow (--glow-teal)
Secondary:        champagne rim light (--glow-gold)
Energy:           acid lime burst (--glow-lime) — CTA only
```

Shadow values:
- `sm:  0 1px 3px rgba(0,0,0,0.40)`
- `md:  0 4px 12px rgba(0,0,0,0.50)`
- `lg:  0 12px 32px rgba(0,0,0,0.60)`

---

## 8. Glow System

**Purpose-only glows:**

| Glow | Token | When |
|---|---|---|
| Teal | `--glow-teal` | Active buttons, hover states, interactive elements |
| Lime | `--glow-lime` | CTA moments only — Start a Project, accent buttons |
| Gold | `--glow-gold` | Logo, premium accents, craftsmanship moments |

**Rule:** If everything glows, nothing feels premium.

---

## 9. Depth System (3D)

```
LEVEL 0 — Background environment:  Obsidian #0B0D0D
LEVEL 1 — Content surface:         Graphite #171B1B panel
LEVEL 2 — Interactive card:        Raised panel + teal border
LEVEL 3 — Floating element:        CSS perspective transform + glow rim
```

CSS 3D class `.depth-card` applies `perspective(800px)` with hover lift. No WebGL required for standard cards.

---

## 10. Motion System

| Token | Value | Use |
|---|---|---|
| `--motion-fast` | 120ms | Micro-interactions, hover states |
| `--motion-normal` | 220ms | Cards, panels, reveals |
| `--motion-slow` | 380ms | Section transitions, page reveals |
| `--ease-out` | `cubic-bezier(0.22,1,0.36,1)` | Standard smooth |
| `--ease-spring` | `cubic-bezier(0.34,1.56,0.64,1)` | CTA buttons |
| `--ease-in-out` | `cubic-bezier(0.65,0,0.35,1)` | State transitions |

**Motion rules:**
- hover: `scale(1.02)` or `translateY(-2px)`
- active: slight depth compression
- 3D object: subtle parallax
- CTA: spring lift with glow
- Section: controlled reveal via Motion

---

## 11. Component System

### Tokens reference
```css
--primary:         #00C8B5   /* teal — interaction */
--accent:          #D7FF3F   /* lime — energy/CTA */
--premium:         #C6A15B   /* champagne — craftsmanship */
--background:      #0B0D0D   /* obsidian — void */
--surface:         #1A1F1F   /* graphite — surface */
--foreground:      #F4F0E7   /* warm ivory — readable */
--foreground-muted:#A9B1AE   /* mist — secondary */
--border:          rgba(255,255,255,0.09)
--border-teal:     rgba(0,200,181,0.20)
--glow-teal:       0 0 16px rgba(0,200,181,0.25)
--glow-lime:       0 0 20px rgba(215,255,63,0.30)
--glow-gold:       0 0 12px rgba(198,161,91,0.20)
```

### Buttons
- `.btn-primary` → teal pill (interaction)
- `.btn-accent` → lime pill (CTA energy)
- `.btn-ghost` → outline pill (secondary)
- `.btn-danger` → error outline

### Cards
- `.triphoria-surface` → dimensional card with teal hover glow
- `.u-frame` → near-sharp editorial frame
- `.glass-panel` → dark teal glass with backdrop blur

---

## 12. Hero System

Composition: cinematic dark environment (Obsidian) with editorial typography on left, floating 3D media object on right.

Typography: Display weight 800 at `clamp(52px, 8vw, 80px)`, `letter-spacing: -0.045em`, `line-height: 0.95`. No line-heights above 1.0 for hero display text.

Media frame: obsidian background, teal border glow, subtle inner gradient overlay.

CTA: "Start a Project" — `btn-primary-lg` (teal) primary action. "View Work" — `btn-ghost` secondary.

---

## 13. Scene System

| Variant | Background | Primary | Use |
|---|---|---|---|
| `black` (default) | Obsidian #0B0D0D | Cinematic Teal | Hero, showreel, why section, footer |
| `dark-editorial` | Graphite #171B1B | Cinematic Teal | Workflow, features, why |
| `paper` | Warm Ivory #F4F0E7 | Deep Petrol | Services, editorial clarity |
| `teal` | Deep Petrol #083B38 | Cinematic Teal | Featured work, structural |
| `pale-lime` | Obsidian + lime accents | Acid Lime | CTA section |
| `green` | Forest #061F1D | Cinematic Teal | Alternative dark |
| `lime` | Obsidian + lime | Acid Lime | Energy moments |

---

## 14. Media System

Every media container is a physical studio object:
- Dark obsidian background
- Teal hairline border `rgba(0,200,181,0.12)`
- Subtle inner gradient overlay `rgba(0,200,181,0.05)`
- Rounded corner `4px` (sharp, editorial)
- Metadata strip: monospace `font-mono` — format, version, timecode

---

## 15. Responsive Rules

| Breakpoint | Behavior |
|---|---|
| 1440px+ | Full 3D experience, asymmetric editorial layouts |
| 1024–1440px | Reduced 3D complexity, full content |
| 768–1024px | Two-column to single-column, simplified 3D |
| 375–768px | Single-column, touch targets ≥44px, no parallax |

---

## 16. Accessibility

- `prefers-reduced-motion`: removes parallax, rotation, floating. Keeps color, hierarchy, content.
- All interactive elements keyboard accessible
- Focus rings: 2px teal outline `var(--primary)` with 3px offset
- Color contrast: foreground `#F4F0E7` on `#0B0D0D` = 15.2:1 (AAA)
- Mist `#A9B1AE` on Obsidian = 7.8:1 (AA large)
- Paper `#FAF8F2` on Deep Petrol `#083B38` = 11.4:1 (AAA)

---

## 17. Performance Rules

- CSS 3D transforms over WebGL for standard depth effects
- `will-change: transform` only on elements that genuinely animate
- Backdrop blur limited to: Navbar (on scroll), glass panels (small count)
- No Three.js/WebGL unless scene requires genuine 3D (lazy-loaded, bundle-controlled)
- Motion library via `motion/react` — no framer-motion
- `prefers-reduced-motion` removes all transitions at OS level

---

## 18. Do's

- Use teal (`#00C8B5`) for ALL interactive states
- Use lime (`#D7FF3F`) ONLY for primary CTA moments
- Use champagne (`#C6A15B`) for logo and craftsmanship detail
- Keep buttons full-pill (9999px radius)
- Use monospace ONLY for production metadata
- Let video/media dominate — media is the product
- Use scene transitions to create studio room-to-room feel
- Dark sections for authority, light sections for clarity

## 19. Don'ts

- Do NOT use purple, pink, orange, red as accent colors
- Do NOT make the whole site glow — glow signals interaction
- Do NOT use gradients as backgrounds (subtle ambient only)
- Do NOT use glassmorphism on every element — glass is for floating objects
- Do NOT center-align long body paragraphs
- Do NOT use lime for anything except CTAs
- Do NOT use radius above 20px except on pills
- Do NOT use heavy shadows on light paper scenes
