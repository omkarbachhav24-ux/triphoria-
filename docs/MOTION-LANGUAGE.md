# TRIPHORIA Motion Language

## Motion Engine

`motion` v13+ via `import { motion } from 'motion/react'`

Never import from `framer-motion`. Single dependency.

## Motion Hierarchy

### Level 1 — Environmental
- Passive, low-frequency
- Background parallax, ambient video loops, subtle texture drift
- Duration: 600ms–2000ms
- Easing: `ease-out` or very gentle spring

### Level 2 — Section Choreography
- Coordinated reveals, scroll-linked progress
- Staggered entrances (0.05–0.1s stagger per child)
- Clip-path transitions, mask reveals
- Duration: 300ms–600ms
- Easing: `[0.22, 1, 0.36, 1]` (STUDIO_EASE)

### Level 3 — Micro-Interactions
- Instant feedback on taps, clicks, state changes
- Button hover, focus rings, toggle switches
- Duration: 120ms–200ms
- Easing: spring `{ stiffness: 400, damping: 30 }`

## Hero Entrance Choreography

Suggested timeline (adjust per composition):
```
0.00s  Navigation settles
0.10s  Eyebrow text enters
0.25s  Headline begins (word-by-word or line-by-line)
0.40s  Headline completes
0.55s  Supporting copy fades in
0.65s  CTA buttons appear
0.75s  Hero media reveal (scale + opacity)
0.90s  Environmental movement begins
```

## Standard Patterns

| Pattern | Primitive | Use |
| :--- | :--- | :--- |
| Text reveal | `<TextReveal>` | Headline entrances |
| Text scramble | `<TextScramble>` | Timecodes, IDs |
| Scroll reveal | `<ScrollReveal>` | Section entrances |
| Spotlight | `<Spotlight>` | Card hover sheens |
| Parallax | `<Parallax>` | Depth layers |
| Counter | `<AnimatedCounter>` | Statistics |

## Reduced Motion

All motion must respect `prefers-reduced-motion`:
- Set `initial` and `animate` to identical values
- Disable parallax and scroll-linked effects
- Maintain state transitions (opacity 0→1) but at 0ms duration
- CSS handled via `@media (prefers-reduced-motion: reduce)` in index.css

## Anti-Patterns

- ❌ Infinite decorative loops (bouncing, rotating)
- ❌ Motion that delays user actions
- ❌ Every element independently fading/bouncing
- ❌ Motion added because a library is available
- ❌ Animation on non-composited properties (width, height, margin)

## Spring Presets

```js
STUDIO_EASE = [0.22, 1, 0.36, 1]
STUDIO_EASE_SLOW = [0.16, 1, 0.3, 1]
SPRING_SNAPPY = { stiffness: 400, damping: 30 }
SPRING_SMOOTH = { stiffness: 260, damping: 20 }
```
