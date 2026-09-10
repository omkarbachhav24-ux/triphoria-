# TRIPHORIA — CREATORFLOW MAPPING SPECIFICATION

This document maps every structural section of the **CreatorFlow reference website** directly into the **TRIPHORIA production architecture**.

---

## 1. COMPONENT & SECTION MAPPING

| CreatorFlow Section | TRIPHORIA Target Component | Content Source / Functionality |
| :--- | :--- | :--- |
| **CreatorFlow Navigation** | `Navbar.jsx` | Sticky glass pill header with studio brand mark, smooth anchor links (`#services`, `#how-it-works`, `#work`, `#about`), client portal button, and primary "Start a Project" CTA. |
| **CreatorFlow Hero** | `HomePage.jsx` (Hero Section) | High-converting editorial hero with live active capacity badge, high-impact headline (*"VIDEO WITHOUT THE CHAOS"*), subheadline, dual action buttons, live timecode scrubber monitor, and intake metadata. |
| **CreatorFlow Logo Marquee & Showreel** | `HomePage.jsx` (Showreel / Work Ticker) | Seamless loop marquee of studio capabilities (4K ProRes, Color Conformed, Stem Audio, LUFS Mastered) + lead CMS showreel player card. |
| **CreatorFlow Recent Edits** | `HomePage.jsx` & `WorkPage.jsx` (Selected Work) | CMS-driven portfolio grid supporting multi-aspect ratio video containers (16:9 widescreen, 9:16 vertical shorts, 1:1 square, 4:5 social). Direct native video playback + Instagram fallback cards. |
| **CreatorFlow Services** | `HomePage.jsx` (What We Do / Disciplines) | Interactive 3-part service disciplines (Short-Form & Vertical, Narrative & Longform, Commercial & Brand Films) with live technical specs, feature lists, and direct package intake links. |
| **CreatorFlow How It Works** | `HomePage.jsx` (Customer Workflow) | Step-by-step production protocol: **01 Intake** (Google Drive link & brief), **02 Dispatch** (Senior Editor match & timeline cut), **03 Delivery** (Structured review & broadcast masters). |
| **CreatorFlow Testimonials / Proof** | `HomePage.jsx` (Real Proof Only) | Real verified studio statistics & client project metrics (Zero storage overhead, 48h initial cut delivery, 100% ProRes 422 delivery). *Zero fake testimonials.* |
| **CreatorFlow Why Choose Us** | `HomePage.jsx` (Why TRIPHORIA / Comparison) | High-contrast comparison matrix: TRIPHORIA Studio vs Solo Freelancers vs Traditional Agencies across speed, consistency, file management, and quality control. |
| **CreatorFlow About** | `HomePage.jsx` (About / Studio Vision) | Senior editing staff profile, DaVinci & Premiere Pro toolchain badges, and commitment to broadcast-grade post-production standards. |
| **CreatorFlow Book a Call / CTA** | `HomePage.jsx` (Start a Project CTA) | High-conversion bottom CTA banner routing directly to TRIPHORIA's interactive intake flow (`/order`). |
| **CreatorFlow Footer** | `Footer.jsx` | Clean editorial footer with operational studio status indicator, platform navigation, legal links, and system timecode. |

---

## 2. STRICT CONTENT & BUSINESS LOGIC RULES

1. **NO FAKE CONTENT**: We will NOT generate fake customer quotes, fake creator avatars, fake YouTube view counters, or fake brand logos. All metrics in TRIPHORIA represent real product metrics (e.g. Turnaround Hours, Resolution Masters, Intake Protocols).
2. **NO DUMMY PRICING OVERWRITE**: TRIPHORIA uses an interactive project intake engine (`OrderFlowPage.jsx` with package tiers: Starter Cut, Pro Creator, Cinematic Master). Packages on the homepage map directly to this functional intake engine.
3. **MEDIA ASPECT RATIOS**: Every portfolio card dynamically accommodates `16:9`, `9:16`, `1:1`, and `4:5` aspect ratios with native video playback where `playbackUrl` is present, and Instagram poster fallbacks with direct links where only `socialUrl` exists.
4. **PROTECTED ROUTES**: Modifying the public homepage will NOT affect `/login`, `/auth`, `/order`, `/order/success`, `/dashboard`, `/editor`, or `/admin/*`.

---

## 3. DESIGN SYSTEM & MOTION GUIDELINES

- **Primary Motion Engine**: `motion/react` with spring physics (`stiffness: 300, damping: 25`).
- **Scroll Reveals**: Intersection observer animated entrance (`initial={{ opacity: 0, y: 20 }}` -> `whileInView={{ opacity: 1, y: 0 }}`).
- **Accessibility**: Standard static fallbacks for `prefers-reduced-motion`.
