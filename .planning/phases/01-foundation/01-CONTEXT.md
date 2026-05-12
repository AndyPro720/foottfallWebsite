# Phase 1: Foundation & Design System — Context

**Gathered:** 2026-05-13
**Status:** Ready for planning
**Source:** HANDOVER.md, design assets (Design 2 JPG, Design 4 PDF, Cities/Categories PDFs), user instructions.

<domain>
## Phase Boundary

This phase establishes the technical foundation for the Foottfall marketing website. It includes:
1. Vite project initialization (Vanilla JS/CSS, no frameworks)
2. Design system (color tokens, typography, spacing)
3. Global layout with **full-page scroll-snap sections**
4. Responsive base shell (nav, footer skeleton, section scaffolding)
</domain>

<decisions>
## Implementation Decisions

### D-01: Full-Page Scroll Snapping
Each main section of the website occupies exactly `100vh` and snaps into place on scroll/swipe. This is the primary UX paradigm — "when you scroll or swipe you get to the next section page."
- Use `scroll-snap-type: y mandatory` on the main scroll container.
- Each `<section>` gets `scroll-snap-align: start` and `min-height: 100vh`.
- Navigation links smooth-scroll to their respective sections.

### D-02: Color Palette (from Design Assets)
- **Primary (Forest Green)**: `#004337` — nav bar, headings, card accents, buttons.
- **Secondary (Dark Green tint)**: `#1a3a2a` — deep overlays, footer.
- **Background (Warm Cream/White)**: `#FAFAF5` for off-white sections, `#FFFFFF` for pure-white areas.
- **Accent (Gold/Warm)**: `#C9A96E` — CTA highlights.
- **Text**: `#1A1A1A` for body, `#FFFFFF` for text on green backgrounds.
- **Spot Color from design report**: `R=0, G=67, B=55` → `#004337` (confirms primary).

### D-03: Typography
- **Serif (Hero/Philosophical)**: Playfair Display — used for "FOOTFALL LEASING", "Where Your Brand Belongs", section headings.
- **Sans-Serif (Nav/Body/UI)**: Outfit — used for navigation, body copy, CTAs, cards.
- **Font Loading**: Google Fonts CDN (`<link>` in `index.html`). Weights: 400, 500, 600, 700 for Outfit; 400, 700 for Playfair Display.
- **Note**: The original design used "Termina" (Adobe Fonts, protected). Outfit is the approved open-source proxy.

### D-04: Section Layout (from Design 2 & 4)
The website has 7 scroll-snap sections in order:
1. **Hero** — Full-width restaurant interior background, "FOOTFALL LEASING" + tagline overlay.
2. **Cities & Regional Bases** — Map-background, tabbed city grid (World/Metro/Emerging/Opportunity India/Middle East).
3. **Trade Area Intelligence** — "140+ trade areas" stat, "Find Where You Belong" CTA.
4. **Categories We Serve** — 8 icon cards in 2×4 grid (Restaurants, Entertainment, Wellness, Fitness, Gaming, Healthcare, Workspaces, Hotels).
5. **How We Work** — 3-stage process (City Plotting → DCB Framework → Stock Matching), "Planning your next location?" banner.
6. **About & Founder** — Split layout: About Foottfall (left) + Rahul Ahuja portrait (center) + Team member (right).
7. **Brands Showcase & Footer** — Client logo wall + full footer with contact/locations.

### D-05: Responsiveness Strategy
- Mobile-first CSS.
- Breakpoints: 480px (mobile), 768px (tablet), 1024px (laptop), 1440px (desktop).
- On mobile, scroll-snap may be relaxed to `scroll-snap-type: y proximity` for usability.

### D-06: Asset Strategy
- Hero background: `kevin-schmid-8m2Sjvf7LRs-unsplash.psd` — must be exported as optimized JPEG/WebP.
- Founder portrait: `2.psd` — must be exported.
- Brand logos: `f8b135b9-cb68-4267-942d-9dd05391e48e.psd` — repeated instances for different brands.
- `ATMOSFIRE 01.jpeg` — available directly as JPEG.
- Category icons: SVG inline or icon font — 8 icons (restaurant, entertainment, wellness, fitness, gaming, healthcare, workspaces, hotels).
- **PSD files cannot be used directly** — they need manual export. The plan will use placeholder images initially and swap with real exports later.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design & Requirements
- `assets/Footfall Website_Design 2_page-0001.jpg` — Primary full-page visual reference (high-res).
- `assets/design4_page_0.png` — Design 4 overview (alternative layout).
- `assets/cities_page_0.png` — Cities section with tabbed layout and categories.
- `assets/cities_page_1.png` — Bangalore city drill-down with trade area pins.
- `assets/categories_page_0.png` — Categories with "Restaurants & Food Brands" expanded dropdown.
- `assets/categories_page_1.png` — Categories with "Entertainment-Led Hospitality" expanded dropdown.
- `.planning/REQUIREMENTS.md` — Requirement IDs checklist.
- `HANDOVER.md` — Detailed project context and Phase 2 roadmap.
- `assets/Footfall Website_Design_Final Report.txt` — Design report with linked images, color profiles, and font info.

</canonical_refs>

<specifics>
## Specific Ideas

### Scroll Snap Implementation
```css
html {
  scroll-snap-type: y mandatory;
  scroll-behavior: smooth;
}
section.snap-section {
  scroll-snap-align: start;
  min-height: 100vh;
  overflow: hidden;
}
```

### Navigation
- Sticky nav bar at top.
- Items: "INTELLIGENCE" | "CITIES & CATEGORIES" | "ABOUT & CONNECT" | "POSITION YOUR ASSET"
- Logo: "F" monogram (left).
- Hamburger menu (right, mobile).

### CSS Custom Properties
```css
:root {
  --color-primary: #004337;
  --color-primary-dark: #1a3a2a;
  --color-bg-cream: #FAFAF5;
  --color-bg-white: #FFFFFF;
  --color-accent-gold: #C9A96E;
  --color-text-dark: #1A1A1A;
  --color-text-light: #FFFFFF;
  --font-serif: 'Playfair Display', Georgia, serif;
  --font-sans: 'Outfit', system-ui, sans-serif;
}
```

</specifics>

<deferred>
## Deferred Ideas
- **Map Intelligence Portal**: All MapLibre GL logic deferred to Phase 7.
- **Lead Capture Backend**: FormSubmit.co integration deferred — CTAs will be styled but not functional yet.
- **City Drill-Down**: The Bangalore trade area map (cities_page_1.png) is a Phase 3/7 feature.
- **Category Dropdowns**: The expandable sub-category lists (categories_page_0/1.png) are Phase 4 features.

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-05-13 via design asset analysis and user discussion*
