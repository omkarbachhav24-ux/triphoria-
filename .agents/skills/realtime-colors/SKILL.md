---
name: realtime-colors
description: "Design validation, contrast auditing, and systematic color token calibration using Realtime Colors (realtimecolors.com). Use when testing typographic hierarchy, light/dark mode palettes, text contrast compliance (WCAG AA), and synchronizing token definitions with TRIPHORIA design tokens."
---

# Realtime Colors Palette Validation & Token Calibration

Official resource: https://www.realtimecolors.com/

Realtime Colors is an interactive design validation tool for testing entire UI color palettes in realistic layout contexts before committing them to code.

---

## 1. Role in TRIPHORIA Architecture

Realtime Colors is used during color exploration and accessibility verification to ensure:

- **Contextual Legibility**: High contrast between text and background surfaces (minimum 4.5:1 for body copy, 3:1 for large display titles).
- **Surface Separation**: Clear visual distinction between Depth Level 1 (Environment `#0B0C0F`), Level 2 (Surface `#17181B`), and Level 3 (Interaction `#FFFFFF` or Accent).
- **Token Harmonization**: Eliminating ad-hoc hex values by ensuring every color role maps directly into TRIPHORIA's CSS custom properties.

---

## 2. TRIPHORIA Core Color Mapping

When exporting or validating palettes in Realtime Colors, map results into the established token taxonomy in `src/index.css` and `.21st/design.json`:

| Realtime Colors Role | TRIPHORIA CSS Token | Default Studio Value |
| :--- | :--- | :--- |
| Background | `--color-motion-bg` | `#0B0C0F` |
| Surface / Card | `--color-motion-surface` | `#17181B` |
| Elevated Surface | `--color-motion-bg-elevated` | `#111214` |
| Text (Primary) | `--color-motion-text-strong` | `#FFFFFF` |
| Text (Body) | `--color-motion-text` | `#F5F5F5` |
| Text (Muted) | `--color-motion-text-muted` | `#A1A1A6` |
| Text (Subtle) | `--color-motion-text-subtle` | `#6F7075` |
| Border | `--color-motion-border` | `rgba(255, 255, 255, 0.10)` |
| Subtle Border | `--color-motion-border-subtle` | `rgba(255, 255, 255, 0.06)` |

---

## 3. Validation Workflow

1. Test palette in real-time context on realtimecolors.com.
2. Verify light/dark contrast compliance (WCAG 2.1 AA).
3. Export chosen tokens directly into `src/index.css` and update `.21st/design.json`.
4. Never embed arbitrary raw hex codes inside component markup without a semantic token backing.
