---
name: haikei
description: "Guidance for generating and integrating restrained abstract SVG compositions, geometric section backdrops, subtle organic surfaces, and ambient environmental textures from Haikei (haikei.app) into TRIPHORIA interfaces."
---

# Haikei Visual Generation & Environmental Layer Guide

Official resource: https://haikei.app/

Haikei is an external visual asset and SVG generation application, not an npm dependency. It is used to generate low-overhead, resolution-independent vector graphics for environmental UI layers.

---

## 1. Approved TRIPHORIA Use Cases

- **Level 1 Environmental Layers**: Deep-background low-contrast ambient textures (opacity ≤ 8%).
- **Section Dividers & Transitions**: Soft non-linear section delimiters.
- **Hero Backdrops**: Controlled geometric or subtle wave contours framing cinema footage without competing with typography.
- **Glass / Surface Shimmers**: Subdued vector contours layered behind dark studio cards (`#111214`).

---

## 2. Strict Anti-Patterns (Do NOT create)

- ❌ Generic, colorful floating blobs.
- ❌ Purple-to-blue AI gradient sweeps.
- ❌ Decorative noise or clutter created solely to consume negative space.
- ❌ High-contrast SVG vectors that clash with text legibility (violating WCAG 4.5:1).
- ❌ Unoptimized SVGs with thousands of unnecessary path nodes.

---

## 3. Implementation Guidelines

1. **Asset Export**: Export clean, minified SVGs from Haikei.
2. **Placement**: Save assets under `src/assets/environment/` or inline small SVGs directly with Tailwind utility classes (`pointer-events-none absolute inset-0 -z-10`).
3. **Color Matching**: Tint all SVG paths using TRIPHORIA CSS variables or studio neutral tones:
   - Primary dark ink: `rgba(255, 255, 255, 0.03)` to `rgba(255, 255, 255, 0.08)`
   - Dark background: `#0B0C0F` / `#111214`
4. **Performance**: Always verify that the generated SVG does not trigger expensive GPU repaints on scroll.
