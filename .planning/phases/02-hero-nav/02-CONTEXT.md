# Phase 2: Hero & Navigation — Context

**Gathered:** 2026-05-13
**Status:** Ready for planning
**Source:** Design assets comparison, Phase 1 output audit.

<domain>
## Phase Boundary

This phase refines the hero section and navigation bar to achieve pixel-perfect fidelity against Design 2 and Design 4 wireframes. Phase 1 built the structural skeleton; Phase 2 polishes it.

Key areas:
1. Hero background image composition (dual-image layout from design)
2. Hero text treatment — "FOOTFALL LEASING" on green band
3. Tagline card positioning and styling refinements
4. Navigation micro-interactions and polish
5. Entry animations for hero elements
6. Asset export/optimization
</domain>

<decisions>
## Implementation Decisions

### D-01: Hero Background Composition
The design shows a **split background** — a modern glass building/skybridge in the upper 65% and a darker commercial street scene in the lower 35%. The two images create a visual break.
- `kevin-schmid-8m2Sjvf7LRs-unsplash.psd` is the hero image (glass architecture) but is a 142MB PSD — cannot be used directly.
- `ATMOSFIRE 01.jpeg` is a restaurant interior — used as fallback from Phase 1 but **does not match the design**.
- **Decision**: Use the ATMOSFIRE 01 JPEG as the hero image for now (best available non-PSD asset), but structure CSS to support a dual-image or full-width background swap when proper exports become available. Add a note for the user to export PSD → WebP/JPEG.

### D-02: Hero Green Band
In both designs, "FOOTFALL LEASING" sits on a **solid dark green rectangular band** (`#004337`) that spans ~60% of the viewport width. This band is positioned at the bottom-left of the hero, overlapping the background images.
- Not a transparent overlay — a solid, opaque green block.
- The tagline card ("Where Your Brand Belongs") sits **on top of the green band**, at its right edge.

### D-03: Hero Text Positioning
- "FOOTFALL LEASING" is displayed in large serif uppercase with wide letter spacing, positioned bottom-left.
- "FOOTFALL" is bolder/larger, "LEASING" is lighter/smaller with extra letter-spacing.
- The green band creates a containing block for this text.

### D-04: Tagline Card
The glassmorphism card in the design is positioned at the **top-right** of the green band, overlapping the photo above.
- Content: "Where Your" (italic eyebrow), "Brand Belongs." (bold heading), followed by description paragraphs.
- Has a subtle shadow and white/cream background.
- No explicit CTA button visible in the hero card in Design 4 — the "Explore Intelligence" text is more of a link.

### D-05: Entry Animations
- Hero text and card should fade/slide in on page load.
- Subtle parallax on the background image during scroll (optional, performance-dependent).

### D-06: Navigation Polish
- Nav bar in design is clean and minimal — current implementation matches well.
- Hamburger needs animation refinement (X transition).
- Add subtle backdrop-filter on nav when scrolled (glassmorphism effect).
</decisions>

<canonical_refs>
## Canonical References

- `assets/Footfall Website_Design 2_page-0001.jpg` — Primary full-page design (hero section at top)
- `assets/design4_page_0.png` — Design 4 overview (hero section)
- `assets/ATMOSFIRE 01.jpeg` — Available hero background image
- `assets/kevin-schmid-8m2Sjvf7LRs-unsplash.psd` — Ideal hero image (PSD, needs export)
- `src/styles/layout.css` — Current hero CSS (lines 47-131)
- `src/styles/nav.css` — Current nav CSS
- `index.html` — Hero HTML (lines 43-74)
</canonical_refs>

<specifics>
## Specific Ideas

### Green Band Layout
```
┌──────────────────────────────────────────────────────┐
│                  Hero Background Image               │
│                  (glass architecture)                │
│                                                      │
│  ┌────────────────────────────────┐                  │
│  │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│┌─────────────┐   │
│  │ ▓ FOOTFALL    LEASING  ▓▓▓▓▓▓││Where Your   │   │
│  │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓││Brand Belongs│   │
│  │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓││ [card]      │   │
│  └────────────────────────────────┘└─────────────┘   │
└──────────────────────────────────────────────────────┘
```

### CSS Approach for Green Band
```css
.hero__green-band {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 45%;
  background: var(--color-primary);
  z-index: 1;
}
```
</specifics>

<deferred>
## Deferred Ideas
- PSD-to-WebP asset export pipeline — user must manually export.
- Parallax scroll effect — defer to Phase 6 polish.
- Video background option — out of scope.
</deferred>

---

*Phase: 02-hero-nav*
*Context gathered: 2026-05-13 via design comparison analysis*
