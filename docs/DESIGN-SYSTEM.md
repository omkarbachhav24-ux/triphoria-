# TRIPHORIA Design System

## Color Tokens

| Token | Value | Usage |
| :--- | :--- | :--- |
| `--background` | `#111111` | Page background, ink |
| `--background-dark` | `#0A0A0A` | Deep sections |
| `--background-elevated` | `#1A1A1A` | Elevated backgrounds |
| `--surface` | `#1A1A1A` | Cards, panels, inputs |
| `--surface-alt` | `#222222` | Alternate surfaces |
| `--surface-hover` | `#2A2A2A` | Hover states |
| `--primary` | `#00CDB8` | Electric Teal — CTAs, links, active states |
| `--primary-hover` | `#00E6CE` | Primary hover |
| `--accent` | `#D8FF00` | Electric Lime — highlight, emphasis |
| `--secondary` | `#B7A8FF` | Soft Lavender — secondary accents |
| `--teal-deep` | `#004C47` | Deep teal surfaces |
| `--foreground` | `#FAFAF5` | Body text |
| `--foreground-strong` | `#FFFFFF` | Headlines, emphasis |
| `--foreground-muted` | `#A1A1A6` | Secondary text |
| `--foreground-subtle` | `#6F7075` | Tertiary text, labels |
| `--foreground-dim` | `#52605E` | Muted slate — least emphasis |
| `--border` | `rgba(255,255,255,0.10)` | Default borders |
| `--border-subtle` | `rgba(255,255,255,0.06)` | Subtle borders |
| `--success` | `#34D399` | Success states |
| `--warning` | `#FBBF24` | Warning states |
| `--error` | `#EF4444` | Error states |

## Typography

- **Primary family**: Inter (sans-serif)
- **Mono family**: JetBrains Mono (monospace)
- **Max families**: 2 (one display/interface, one mono)

| Class | Size | Weight | Use |
| :--- | :--- | :--- | :--- |
| `.type-display` | clamp(48px, 8vw, 88px) | 700 | Hero statements |
| `.type-h1` | clamp(36px, 5vw, 56px) | 700 | Page headings |
| `.type-h2` | clamp(28px, 3.5vw, 40px) | 600 | Section headings |
| `.type-h3` | clamp(22px, 2.5vw, 28px) | 600 | Subsections |
| `.type-body-lg` | 18px | 400 | Lead paragraphs |
| `.type-body` | 16px | 400 | Body copy |
| `.type-body-sm` | 14px | 400 | Small body |
| `.type-label` | 12px uppercase | 500 | Labels, metadata |
| `.type-mono` | (inherits) | — | Technical data |
| `.type-eyebrow` | 12px uppercase mono | 500 | Eyebrow text (teal) |

## Spacing

4px base unit. Scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128.

## Radius

| Token | Value | Use |
| :--- | :--- | :--- |
| `--radius-sm` | 4px | Small controls, badges |
| `--radius-md` | 8px | Buttons, inputs, cards |
| `--radius-lg` | 12px | Panels, surfaces |
| `--radius-xl` | 16px | Large cards |
| `--radius-2xl` | 24px | Media, hero treatments |
| `--radius-full` | 999px | Pills, avatars |

Use radius intentionally. Avoid nesting rounded containers.

## Borders

- Default: `1px solid var(--border)` — `rgba(255,255,255,0.10)`
- Subtle: `1px solid var(--border-subtle)` — `rgba(255,255,255,0.06)`
- Strong (hover): `1px solid var(--border-strong)` — `rgba(255,255,255,0.18)`

## Surfaces

Three depth levels:
1. **Environment** (`--background`): Deep dark, texture, ambient media
2. **Surface** (`--surface`): Functional containers, nav, panels
3. **Interaction** (`--primary`, buttons, hover, focus): Active elements

## Buttons

| Class | Visual | Use |
| :--- | :--- | :--- |
| `.btn-primary` | Teal solid | Primary actions |
| `.btn-primary-lg` | Teal solid large | Hero CTAs |
| `.btn-ghost` | Transparent + border | Secondary actions |
| `.btn-accent` | Lime solid | Highlight actions |
| `.btn-danger` | Red outlined | Destructive actions |

## Icons

Single system: `lucide-react`. Use icons only where they improve recognition, navigation, interaction, or status communication.

## Media Treatment

- Lazy-load all video embeds
- Support YouTube, Vimeo, direct URLs
- Graceful fallback for broken embeds
- No autoplay of multiple videos
- Authentic aspect ratios (16:9, 9:16, 4:3)

## Motion

See `docs/MOTION-LANGUAGE.md` for complete motion specification.
