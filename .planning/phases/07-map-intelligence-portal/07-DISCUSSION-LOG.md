# Phase 7: Map Intelligence Portal - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-28
**Phase:** 07-map-intelligence-portal
**Areas discussed:** Routing Strategy, Refactoring & Modularization, UI Restyling, Data Pipeline & Build Scripts, Map Simplicity, Properties Integration, and Panel Minimization.

---

## Routing Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Multi-Page Vite Configuration | Create separate /intelligence/index.html that compiles as a standalone route. | ✓ |
| Client-Side SPA Routing | Use history.pushState or hash routing in a single index.html bundle. | |

**User's choice:** Multi-Page Vite Configuration
**Notes:** Helps keep the main landing page lightweight, avoids CSS namespace pollution, and separates the map assets.

---

## Refactoring & Modularization

| Option | Description | Selected |
|--------|-------------|----------|
| Fully Modularize & Remove Tour | Break the monolith into clean ES modules (map, sidebar, filters, ui). Remove automated camera tour and stats rotation. | ✓ |
| Fully Modularize but KEEP Tour | Break monolith into modules, keeping automated camera tour in a tour.js controller. | |
| Keep Monolithic structure | Port the 171KB file as a single module with minor edits. | |

**User's choice:** Fully Modularize & Remove Tour
**Notes:** The automated camera tour and stats auto-rotation are to be removed to make the map portal faster and cleaner.

---

## UI Restyling

| Option | Description | Selected |
|--------|-------------|----------|
| Light Editorial UI | Style map overlays, sidebar, legend, and customisation panels in forest green/cream. Map itself remains dark. | ✓ |
| Dark Glassmorphism UI | Keep legacy dark dashboard aesthetics. | |

**User's choice:** Light Editorial UI
**Notes:** Ensures the map portal UI controls match the marketing site's visual theme.

---

## Data Pipeline & Build Scripts

| Option | Description | Selected |
|--------|-------------|----------|
| Port Pipeline Exactly as Is | Copy data-sources/, scripts/, and data/ boundaries from legacy. Add preparation scripts to package.json. | ✓ |
| Consolidate into a Single Script | Refactor legacy data scripts into a single clean Node script. | |

**User's choice:** Port Pipeline Exactly as Is
**Notes:** Keeps compile-time data generation self-contained.

---

## Map Simplicity

**User's choice:** Extreme simplicity. Hide detailed landmark overlays, POIs, highway badges, and clutter.
**Notes:** Take inspiration from `mapbackground.png` but avoid being excessively bare. The map background should stay dark, but show significantly fewer features until queried.

---

## CTA Flows

**User's choice:** Two main CTAs.
1. **Match CTA**: User inputs category, size, and budget parameters, which is matched against a static properties database exported from the `inventorybackend` project. Matching trade areas and properties are shown.
2. **Explore CTA**: Free exploration of trade areas by city.
**Notes:** Users' requirements must match with properties exported from the `inventorybackend` repo.

---

## Sidebar Minimization

**User's choice:** Minimize the DCB panel. Focus mostly on showing matching properties and key stats (rent, footfall, average spend).
**Notes:** Demographics and brandscape data should be minimal.

---

## the agent's Discretion

- Visual representation of light-themed overlays (form margins, chip borders).
- Precise styling of the list card layout for matching properties in the sidebar.

## Deferred Ideas

- Real-time property database query integration (kept static).
- Landlord admin property listing editor.

---

*Phase: 07-map-intelligence-portal*
*Discussion log generated: 2026-05-28*
