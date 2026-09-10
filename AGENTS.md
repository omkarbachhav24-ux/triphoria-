# TRIPHORIA — CORE DESIGN & FRONTEND ENGINEERING CONTRACT

This document governs all frontend development, architectural decisions, and agent execution in the TRIPHORIA project.

---

## 1. The Design & Toolchain Hierarchy

TRIPHORIA remains the final visual and product authority. External tools provide capabilities; TRIPHORIA provides identity. Never reverse this hierarchy:

```
TRIPHORIA PRODUCT REQUIREMENTS
        ↓
TRIPHORIA DESIGN SYSTEM
        ↓
UX / PRODUCT REASONING (UI/UX Pro Max)
        ↓
SHADCN PRIMITIVES (Functional Foundation)
        ↓
21ST.DEV / MOTION PRIMITIVES (Component Discovery & Reference)
        ↓
MOTION IMPLEMENTATION (Kinetic Physics & Choreography)
        ↓
HAIKEI / REALTIME COLORS / EXTERNAL AGENTS (Environmental & Validation Tools)
```

---

## 2. Visual Direction & Aesthetic Standards

TRIPHORIA represents a **Premium Post-Production Studio** and **Creative Technology Platform**.

### Mandatory Characteristics
- **Editorial Composition**: Intentional asymmetric layouts, typography as structure, and controlled negative space.
- **Media-First**: Cinematic video scrubbers, authentic aspect ratios, letterboxing, timecode counters, and crop marks.
- **Tangible Depth**: Rich surface separation without artificial or muddy drop shadows.
- **Purposeful Motion**: Spring-based physics calibrated for high-end compositor interaction.

### Strict Anti-Patterns (Eliminate Completely)
- ❌ Generic SaaS or AI landing page templates.
- ❌ Purple-to-blue AI gradient sweeps and unneeded frosted glassmorphism.
- ❌ Grids of cards nested inside larger cards.
- ❌ Fabricated social proof, fake reviews, or meaningless metrics.
- ❌ Bouncing, infinite decorative animation loops.
- ❌ Unpurposed floating 3D shapes, background dot grids, or filler badges.

---

## 3. The Three-Level Depth System

Every major page must consciously separate into three visual depth levels:

1. **LEVEL 1 — ENVIRONMENT**:
   - Deep background (`#0B0C0F` / `#111214`), subtle texture, restrained environmental SVG, ambient video layers.
2. **LEVEL 2 — SURFACE**:
   - Functional containers, navigation bars, media viewports, control panels, editorial frames (`#17181B` with `rgba(255, 255, 255, 0.08)` borders).
3. **LEVEL 3 — INTERACTION**:
   - Buttons, scrubbers, modals, dropdown menus, cursor cues, hover sheens, focus rings.

---

## 4. Motion Architecture (`motion/react`)

- **Primary Animation Engine**: `motion` via `import { motion } from "motion/react"`.
- **Never reintroduce `framer-motion`**: Keep dependencies clean and single-sourced.
- **Hierarchy of Motion**:
  - *Level 1 (Environmental)*: Passive, low-frequency transitions.
  - *Level 2 (Section Choreography)*: Coordinated reveals, scroll-linked progress, mask clips.
  - *Level 3 (Micro-Interactions)*: Instant feedback (120–200ms springs) on taps, clicks, and state changes.
- **Accessibility**: Always respect `prefers-reduced-motion` with static fallbacks.

---

## 5. Responsive Composition (Not Simple Downscaling)

Every breakpoint is a deliberate composition decision:
- **375px / 390px (Mobile)**: Single-column narrative flow, minimum 44×44px touch targets, mobile-optimized navigation sheets, simplified timecode tracks.
- **768px (Tablet)**: Balanced two-column metadata, accessible tactile controls.
- **1024px / 1280px (Laptop)**: Full studio timeline view, side-by-side comparison scrubbers.
- **1440px+ (Large Desktop)**: Asymmetric editorial layouts, maximum typographic impact, expansive media framing without awkward horizontal stretching.

---

## 6. Execution Workflow (15 Steps)

When asked to "Build this TRIPHORIA page" or implement a feature:

1. **Understand user goal**: Core intent and product outcome.
2. **Define hierarchy**: Primary call-to-action and reading path.
3. **Define visual anchor**: Dominant editorial or media centerpiece.
4. **Define media**: Video, preview, or interactive asset.
5. **Define section composition**: Asymmetric layout and rhythm.
6. **Search 21st.dev**: Check `@21st-dev/cli` for established component inspiration.
7. **Check Motion Primitives**: Reuse verified patterns in `@/components/ui/motion-primitives.jsx`.
8. **Use shadcn/ui**: Functional primitives (`Button`, `Dialog`, `Input`, `DropdownMenu`).
9. **Use Motion**: Custom transitions, scroll links, and spring physics.
10. **Use Haikei**: Subtle environmental SVG backdrops where justified.
11. **Use Realtime Colors**: Validate color contrast (WCAG 2.1 AA) and token harmony.
12. **Implement**: Clean, modular code with semantic tokens.
13. **Test desktop**: Fluidity, alignment, and compositor framerates.
14. **Test mobile**: Touch ergonomics and layout integrity.
15. **Visual QA**: Execute `ui-qa` audit before concluding.

---

## 7. Tool Selection Gate

Before adding or using any external component or effect:
> **"WHY THIS TOOL?"**
> If the answer is only "because it looks cool", reject it.
> Deliver maximum perceived quality per unit of complexity.
