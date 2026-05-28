# Phase 7: Map Intelligence Portal - Context

**Gathered:** 2026-05-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Port a simplified and refactored version of the legacy map intelligence application from `footfall` into this repository under the `/intelligence` route. 

The scope includes establishing a Vite multi-page routing configuration, modularizing the monolithic legacy JavaScript code, restyling the UI overlays to match the forest green + cream editorial branding of the marketing site, simplifying the map layer styles to reduce clutter (less landmarks), and introducing two distinct user flows: a query-based property matching flow (using data exported from the `inventorybackend` repo) and a free-exploration mode.

</domain>

<decisions>
## Implementation Decisions

### Routing & Compilation
- **D-01: Multi-Page Route**: Serve `/intelligence` as a native separate page using a Vite multi-page configuration (creating `/intelligence/index.html`). This separates the main website bundle from map assets and dependencies, optimizing landing page performance.
- **D-02: Dependencies Integration**: Add `maplibre-gl`, `chart.js`, and `papaparse` directly to this project's `package.json` dependencies.

### Refactoring & Code Quality
- **D-03: ES Modularization**: Break down the legacy 4,143-line monolithic `intelligence.js` file into modular ES components:
  - `map.js`: Handles MapLibre GL initialization, style cleanups, layer rendering, and view transitions.
  - `sidebar.js`: Manages the minimized trade area details sidebar panel, property listings, and stats rendering.
  - `filters.js`: Manages query forms, customisation panel chips, and result lists.
  - `ui.js`: Manages legends, breadcrumbs, back button, and modal transitions.
  - `data.js`: Loads geoData and property matches.
- **D-04: Removal of Automated Tour**: Delete the camera looping tour (`MapTourController` and GSAP tour-pause animations) and auto-cycling stats cards. The map opens directly in a clean default state (e.g. Mumbai/India region).

### Visual Styling & Aesthetics
- **D-05: Light Editorial UI Chrome**: Replace the legacy dark glassmorphism theme on all UI overlays (sidebar, filter panels, legend, breadcrumbs, buttons, and dialogs) with the forest green (`#004337`), warm cream (`#FAFAF5`), and white (`#FFFFFF`) editorial design tokens. Use `Playfair Display` for headings and `Outfit` for controls.
- **D-06: Minimal Map Styles**: Simplify the map layers to be extremely clean with fewer landmarks, highway shields, and POIs, drawing inspiration from the clean aesthetic of `mapbackground.png`. Keep the base satellite/positron map minimal to highlight trade area pins.

### Map Navigation & Flows
- **D-07: Two CTA Flows**:
  - **CTA 1: Match Flow**: User enters requirements (category, property size, budget) and presses "Find Matches". This queries and matches the query against static property data exported from the `inventorybackend` repo, presenting matching trade areas on the map and listing properties in the sidebar.
  - **CTA 2: Explore Flow**: Free navigation allowing the user to select a city (Mumbai, Pune, Dubai) and browse trade areas directly, clicking pins to see stats.
- **D-08: Minimized DCB Panel**: Rework the sidebar to focus primarily on **Available Properties** and **Core Stats** (daily footfall, rent band, average spend). Keep demographics and brandscape data minimal, collapsing or combining them into small, secondary readouts.

### the agent's Discretion
- Exact layout of the light-themed customisation filter panel and results checklist.
- The styling details of the property matching list card components.
- Layer style JSON modifications to hide MapLibre base map elements.

</decisions>

<specifics>
## Specific Ideas

- **Map background simplicity**: Use styling filters to hide highway numbers, airport symbols, and dense POI text descriptions, making the visual representation clean.
- **Static Property Integration**: Read a property export file (e.g. `properties.json` exported from the `inventorybackend` project) at build time or load it as a static asset to perform matching locally in `filters.js` without any live database dependency.
- **DCB Sidebar**: The sidebar should look like a clean real-estate brochure card: a main header with the trade area name, a prominent block of core statistics, and a list of matching retail properties.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Legacy Map Implementation
- [intelligence.js](file:///c:/Users/angaj/repos/footfall/src/pages/intelligence.js) — Legacy map dashboard monolith code.
- [PROJECT_ARCHITECTURE.md](file:///c:/Users/angaj/repos/footfall/docs/PROJECT_ARCHITECTURE.md) — Legacy routing, view hierarchy, and details of map layers.

### Project Boundaries
- [HANDOVER.md](file:///c:/Users/angaj/repos/FoottfallWebsite/HANDOVER.md) — General onboarding details, visual assets copy references, and PWA options.
- [REQUIREMENTS.md](file:///c:/Users/angaj/repos/FoottfallWebsite/.planning/REQUIREMENTS.md) §v2 — Active v2 map requirements list (MAP-01 to MAP-04).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lead-capture.js`: The lead capture overlay logic can be reused or linked to the map portal's CTA forms.
- `nav.js`: The desktop sticky navigation can link to `/intelligence` and return back to marketing.

### established Patterns
- Vanilla JS and Vanilla CSS: The map portal must be built entirely with Vanilla JS and CSS, using the global custom properties defined in `src/styles/variables.css`.

</code_context>

<deferred>
## Deferred Ideas

- Live database query performance matching — out of scope (using static property export instead).
- User authentication and landlord administration panels — out of scope.

</deferred>

---

*Phase: 07-map-intelligence-portal*
*Context gathered: 2026-05-28*
