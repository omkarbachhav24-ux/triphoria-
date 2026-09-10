# TRIPHORIA QA Checklist

## Visual QA (§63)

For every major page, answer:

1. Does it feel flat? → Add media, typography contrast, or color fields
2. Is there a strong visual anchor? → Every section needs a dominant element
3. Is the hierarchy obvious? → Primary action must be unmistakable
4. Is there enough visual variation? → Adjacent sections must differ in composition
5. Are too many elements cards? → Use editorial layout, not card grids
6. Is typography doing real design work? → Headlines as composition, not just labels
7. Does media dominate appropriately? → Video/photography should be prominent
8. Is motion choreographed? → Coordinated entrances, not random fades
9. Is the page too busy? → Remove decoration without purpose
10. Is the page too empty? → Add density through content, not filler
11. Does mobile feel intentionally designed? → Not just a shrunk desktop
12. Does the page feel like TRIPHORIA? → Cinematic, editorial, premium, technical
13. What will the user remember? → "the cards" = fail; "the video composition" = pass

## Accessibility Checklist (WCAG 2.1 AA)

- [ ] Semantic HTML5 elements (button, a, nav, main, dialog)
- [ ] Complete keyboard navigation
- [ ] Visible focus indicators (:focus-visible)
- [ ] Accessible names (aria-label) for all icon-only buttons
- [ ] Color is not sole indicator of meaning
- [ ] prefers-reduced-motion respected
- [ ] Heading hierarchy (single h1, sequential)
- [ ] Form labels associated with inputs
- [ ] Error messages announced to screen readers
- [ ] Touch targets minimum 44×44px on mobile
- [ ] Alt text on meaningful images
- [ ] Skip navigation link

## Responsive Checklist

- [ ] 375px — no overflow, readable, touch targets, CTAs visible
- [ ] 768px — balanced layout, no broken grids
- [ ] 1024px — full layout, side-by-side works
- [ ] 1440px — no awkward stretching, max-width respected
- [ ] No horizontal scrollbar at any breakpoint
- [ ] No text truncation or overlap
- [ ] Mobile navigation functional
- [ ] Forms usable on mobile

## Performance Checklist

- [ ] Videos lazy-loaded (no autoplay of multiple)
- [ ] Images optimized (appropriate format, size)
- [ ] SVGs optimized (minimal path nodes)
- [ ] No animation on non-composited properties
- [ ] Code splitting for large pages
- [ ] API requests minimized (batch, cache)
- [ ] No layout thrashing in scroll handlers
- [ ] Build produces clean output (no errors)

## Functional Checklist

- [ ] Single /login works for all roles
- [ ] Customer can create project with Google Drive link
- [ ] Project status tracking visible to customer
- [ ] Admin can approve/reject/assign projects
- [ ] Editor sees only assigned projects
- [ ] Output versioning works (v1, v2, v3)
- [ ] Audit events logged for all important actions
- [ ] CMS changes reflect on public pages
- [ ] Error states graceful (broken links, failed API)
- [ ] Session expiration handled
