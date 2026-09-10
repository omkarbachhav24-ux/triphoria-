---
name: motion-primitives
description: "Reusable, accessible animated UI components and interaction patterns from ibelick/motion-primitives (motion-primitives.com). Use when implementing text reveals, text scrambles, spotlight effects, interactive cards, smooth morphing overlays, magnetic interactions, and micro-animations in React with motion/react and Tailwind CSS."
---

# Motion Primitives Integration & Usage Guide

Motion Primitives provides open-source, beautifully crafted motion components built on top of `motion/react` and Tailwind CSS.

Reference repository: https://github.com/ibelick/motion-primitives
Official documentation: https://motion-primitives.com/docs

---

## 1. Six-Gate Evaluation Checklist

Before importing or implementing any motion primitive, it MUST pass all six gates:

1. **Hierarchy**: Does this movement establish visual priority and guide the user's eye to the primary action?
2. **Comprehension**: Does it help the user understand state changes, cause-and-effect, or system progress?
3. **Brand Integrity**: Does it reinforce TRIPHORIA's premium post-production studio identity, avoiding generic SaaS or bouncy tropes?
4. **Performance**: Does it utilize GPU-accelerated transforms (`transform`, `opacity`) without triggering layout recalculations (`reflow`)?
5. **Mobile Readiness**: Does it gracefully adapt or disable mouse-dependent effects (e.g., hover spotlights, custom cursors) on touch screens?
6. **Reduced Motion**: Does it cleanly respect `prefers-reduced-motion` with static or instant fallback states?

---

## 2. Standard Available Primitives in TRIPHORIA

Available in `@/components/ui/motion-primitives.jsx`:

- `<TextReveal text="Headline" delay={0.2} tag="h1" />`: Word-by-word staggered mask reveal.
- `<TextScramble text="TIMELINE TC-01" speed={30} />`: Authentic production timecode / monospace scramble effect.
- `<Spotlight size={350} color="rgba(255, 255, 255, 0.08)">`: Subtle mouse-following radial sheen on dark studio surfaces.
- `<ScrollReveal direction="up" delay={0.1}>`: Smooth viewport entrance with distance damping.
- `<Parallax offset={40}>`: Continuous scroll velocity depth layer.
- `<AnimatedCounter target={24} suffix=" FPS" />`: Monospace numeric counter on entry.

---

## 3. Workflow

1. Check `@/components/ui/motion-primitives.jsx` before building custom motion.
2. For advanced primitives (e.g., expandable cards, accordion, morphing dialogs, toolbar), consult `motion-primitives.com/docs`.
3. Adapt all styling to TRIPHORIA's dark studio palette (`#0B0C0F`, `#17181B`, `#F5F5F5`, subtle borders `rgba(255,255,255,0.08)`).
4. Always import from `"motion/react"`, never `"framer-motion"`.
