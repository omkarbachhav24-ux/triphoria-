# TRIPHORIA Responsive System

## Breakpoints

| Breakpoint | Width | Device | Composition |
| :--- | :--- | :--- | :--- |
| Mobile | 375px–430px | iPhone, Android | Single-column narrative flow |
| Tablet | 768px | iPad, tablets | Balanced two-column |
| Laptop | 1024px–1280px | Laptops | Full layout, side-by-side |
| Desktop | 1440px+ | Large screens | Asymmetric editorial, maximum impact |

## Mobile (375px–430px)

- Single-column narrative flow
- 44×44px minimum touch targets
- Mobile navigation sheet (not desktop menu)
- Simplified media (single video, no side-by-side)
- Hero: strong headline → CTA → media (vertical stack)
- Remove mouse-dependent effects (spotlight, custom cursor)
- Reduce motion complexity
- Simplified grid (1-column portfolio)

## Tablet (768px)

- Balanced two-column layouts where appropriate
- Touch-friendly controls
- Side-by-side metadata possible
- Portfolio: 2-column grid
- Hero: headline + media side-by-side or stacked

## Laptop (1024px–1280px)

- Full editorial layout
- Side-by-side comparison areas
- Multi-column portfolio grids
- Full navigation bar
- All motion effects active

## Desktop (1440px+)

- Maximum typographic impact
- Asymmetric editorial layouts
- Expansive media framing
- Prevent awkward horizontal stretching (max-width containers)
- Full density of metadata and visual elements

## Key Rules

1. **Responsive = recomposition**, not shrinking
2. Mobile can have a completely different composition
3. Touch targets: minimum 44×44px on mobile
4. No hover-only functionality — touch and keyboard equivalents required
5. No horizontal overflow at any breakpoint
6. No text truncation or overlap
7. Heading sizes use `clamp()` for fluid scaling
8. Section order may change on mobile (prioritize message → CTA → media)
