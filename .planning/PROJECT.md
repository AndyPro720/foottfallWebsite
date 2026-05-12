# Foottfall Marketing Website

## What This Is

A premium, professional marketing website for Foottfall, a commercial real estate leasing and advisory firm. The website serves as a narrative-driven platform to showcase Foottfall's expertise in footfall analysis, demographics, and commercial metrics for retail and F&B brands.

## Core Value

Premium, pixel-perfect presentation of the Foottfall brand that converts visitors into intelligence platform users.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] **Marketing Website (Phase 1)**: Implement all sections from the design wireframe (Design 2/Design 4) with 100% visual fidelity.
- [ ] **Premium Aesthetics**: Use forest green palette, serif/sans-serif typography pairing (Playfair Display/Outfit), and high-quality imagery.
- [ ] **Responsive Design**: Ensure the website is fully responsive across desktop, tablet, and mobile.
- [ ] **SEO Optimization**: Implement best practices for search engine visibility.
- [ ] **Map Intelligence Integration (Phase 2)**: Port a toned-down version of the legacy map intelligence application to `/intelligence`.

### Out of Scope

- **Inventory Backend**: Do NOT integrate or reference the Inventory PWA (`inventory.foottfall.com`) backend or Firebase services.
- **User Authentication**: The marketing website and map portal are public-facing; no login is required.
- **Legacy Tour System**: The complex automated camera tour from the legacy app is to be simplified or removed.

## Context

- **Legacy Repo**: `footfall` contains the original map application logic and assets.
- **Target Audience**: Retail brands, F&B operators, and commercial real estate investors.
- **Geographic Focus**: Mumbai, Pune (India) and Dubai (UAE).

## Constraints

- **Tech Stack**: Vite (Vanilla JS), Vanilla CSS (no Tailwind), Vanilla JS (no frameworks like React/Vue).
- **Design Fidelity**: Must match the provided PDF/Image designs "to the dot".
- **Timeline**: Phase 1 is expected to take approximately 5 days.
- **Dependencies**: Uses MapLibre GL and OpenFreeMap for the intelligence portal in Phase 2.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Vanilla CSS | Legacy repo uses it; provides maximum control for premium design. | — Pending |
| Standard Granularity | User requested Phase 1 be broken down as needed for precision. | — Pending |
| Vite + Vanilla JS | Minimalist, fast build tool; avoids framework overhead. | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-13 after initialization*
