# Phase 7: Map Intelligence Portal - Research

**Researched:** 2026-05-28
**Domain:** Geospatial visualization, multi-page compilation, modular Vanilla JS architecture
**Confidence:** HIGH

## Summary

This phase integrates the legacy map dashboard application from `footfall` into the new `FoottfallWebsite` repository, refactoring it for higher performance and alignment with the new design language. Key architectural shifts include using a native Vite multi-page configuration to host the portal at `/intelligence/index.html`, eliminating heavy GSAP camera animations in favor of a clean, interactive landing view, and splitting the monolithic 4,143-line `intelligence.js` file into modular ES6 modules.

Additionally, we introduce a static properties matching engine. Property data will be exported from the `foottfallBackend` inventory spreadsheet via a local Node script, compiled into a minimized JSON payload, and read by the filters module.

**Primary recommendation:** Compile the map portal via a clean Vite multi-page configuration, and modularize the MapLibre/Chart.js scripts to prevent main thread bundle bloat on the marketing site.

## User Constraints (from CONTEXT.md)

### Locked Decisions
*   **D-01: Multi-Page Route**: Serve `/intelligence` as a native separate page using a Vite multi-page configuration (creating `/intelligence/index.html`). This separates the main website bundle from map assets and dependencies, optimizing landing page performance.
*   **D-02: Dependencies Integration**: Add `maplibre-gl`, `chart.js`, and `papaparse` directly to this project's `package.json` dependencies.
*   **D-03: ES Modularization**: Break down the legacy 4,143-line monolithic `intelligence.js` file into modular ES components:
    *   `map.js`: Handles MapLibre GL initialization, style cleanups, layer rendering, and view transitions.
    *   `sidebar.js`: Manages the minimized trade area details sidebar panel, property listings, and stats rendering.
    *   `filters.js`: Manages query forms, customisation panel chips, and result lists.
    *   `ui.js`: Manages legends, breadcrumbs, back button, and modal transitions.
    *   `data.js`: Loads geoData and property matches.
*   **D-04: Removal of Automated Tour**: Delete the camera looping tour (`MapTourController` and GSAP tour-pause animations) and auto-cycling stats cards. The map opens directly in a clean default state (e.g. Mumbai/India region).
*   **D-05: Light Editorial UI Chrome**: Replace the legacy dark glassmorphism theme on all UI overlays (sidebar, filter panels, legend, breadcrumbs, buttons, and dialogs) with the forest green (`#004337`), warm cream (`#FAFAF5`), and white (`#FFFFFF`) editorial design tokens. Use `Playfair Display` for headings and `Outfit` for controls.
*   **D-06: Minimal Map Styles**: Simplify the map layers to be extremely clean with fewer landmarks, highway shields, and POIs, drawing inspiration from the clean aesthetic of `mapbackground.png`. Keep the base satellite/positron map minimal to highlight trade area pins.
*   **D-07: Two CTA Flows**:
    *   **CTA 1: Match Flow**: User enters requirements (category, property size, budget) and presses "Find Matches". This queries and matches the query against static property data exported from the `inventorybackend` repo, presenting matching trade areas on the map and listing properties in the sidebar.
    *   **CTA 2: Explore Flow**: Free navigation allowing the user to select a city (Mumbai, Pune, Dubai) and browse trade areas directly, clicking pins to see stats.
*   **D-08: Minimized DCB Panel**: Rework the sidebar to focus primarily on **Available Properties** and **Core Stats** (daily footfall, rent band, average spend). Keep demographics and brandscape data minimal, collapsing or combining them into small, secondary readouts.

### the agent's Discretion
*   Exact layout of the light-themed customisation filter panel and results checklist.
*   The styling details of the property matching list card components.
*   Layer style JSON modifications to hide MapLibre base map elements.

### Deferred Ideas (OUT OF SCOPE)
*   Live database query performance matching — out of scope (using static property export instead).
*   User authentication and landlord administration panels — out of scope.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MAP-01 | Interactive MapLibre GL map at `/intelligence` | MapLibre GL library added, multi-page setup directs build to `/intelligence/index.html` |
| MAP-02 | Country -> City -> Trade Area zoom hierarchy | Configured in `map.js` using coordinates from `geoData.js` |
| MAP-03 | DCB Sidebar with Demographics, Commercial, and Brandscape tabs | Redesigned light-themed layout in `sidebar.js` and `ui.js` |
| MAP-04 | Lead capture system (soft and warm leads) | Reuses/extends `lead-capture.js` logic and hooks to custom forms |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Vite Multi-page Bundle | CDN / Static | — | Vite generates a separate HTML entrypoint to isolate dependencies. |
| Map Layer Styling | Browser / Client | — | MapLibre style JSON rules run completely inside the user's browser. |
| Property Matching | Browser / Client | — | Local JSON filtering matches parameters without API latencies. |
| Data Compilation | Build / Scripts | — | Node scripts preprocess CSV/Excel inputs into optimized JSON payloads. |
| Lead Capture Submit | API / Backend | Browser / Client | Client posts soft leads to remote submission API (Web3Forms). |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| maplibre-gl | ^5.14.0 | Map rendering and vector layer styling | High-performance open-source fork of Mapbox GL, native canvas rendering |
| chart.js | ^4.5.1 | Demographics and spend distribution charts | Light, customizable, responsive charts |
| papaparse | ^5.5.3 | Parsing CSV data sources at build time | Robust CSV parser handling quotes and delimiters |
| xlsx | ^0.18.5 | Excel spreadsheet intake at build time | Standard parser for excel inventory sheets |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | ^1.6.0 | Testing logic modules | Unit testing matching and data transformations (to be added) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Multi-Page Route | Client SPA Router | SPA router pollutes global CSS variables and bundles map dependencies into the main landing page. |

**Installation:**
```bash
npm install maplibre-gl chart.js papaparse
npm install --save-dev xlsx vitest
```

**Version verification:**
- `maplibre-gl` version `^5.14.0` verified via npm registry.
- `xlsx` version `^0.18.5` verified via npm registry.

## Architecture Patterns

### System Architecture Diagram

```
[ XLS/CSV Data Sources ] ---> [ Build Scripts (prepare-data, import-properties) ]
                                             |
                                             v
                                  [ src/data/geoData.js ]
                                  [ src/data/properties.json ]
                                             |
                                             v
[ Vite Compiler ] <======================================================
       |                                                                |
       +---> [ dist/index.html (Main Site) ]                            |
       |                                                                |
       +---> [ dist/intelligence/index.html (Map Portal) ] <------------+
                     |
                     +---> [ src/pages/intelligence/main.js ]
                                 |
                                 +---> [ map.js ] (MapLibre GL)
                                 +---> [ filters.js ] (Match engine)
                                 +---> [ sidebar.js ] (DCB Sidebar rendering)
                                 +---> [ ui.js ] (Legends, panels transitions)
```

### Recommended Project Structure
```
intelligence/
├── index.html                  # Map portal entry HTML
src/
├── pages/
│   └── intelligence/
│       ├── main.js             # Entry script for /intelligence
│       ├── map.js              # MapLibre layer and viewport controller
│       ├── sidebar.js          # Sidebar panels and charts renderer
│       ├── filters.js          # Query forms and match filters
│       ├── ui.js               # Dialogs, overlays, control bindings
│       └── style.css           # Portal specific styles (editorial tokens)
└── data/
    ├── geoData.js              # Precompiled geo features
    └── properties.json         # Static property export
```

### Pattern 1: Multi-Page Vite Config
Configure rollup to emit both pages.
```javascript
// vite.config.js
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        intelligence: resolve(__dirname, 'intelligence/index.html'),
      }
    }
  }
});
```

### Anti-Patterns to Avoid
*   **Loading Map Assets on Main Site:** Do not import MapLibre GL styles or JS modules directly in `src/main.js`. This is solved by using the `/intelligence/index.html` entry points.
*   **Inline Styling in Map Overlays:** Avoid hardcoded absolute sizes or dark colors. Use CSS custom properties defined in `variables.css`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Map interaction | Raw Canvas | maplibre-gl | Handling zoom, tilt, layers, and markers on a sphere is extremely complex. |
| CSV Parsing | String splits | papaparse | Commas inside quotes, newlines, and escaping make custom splitters fragile. |
| Excel parsing | Unzipping XML | xlsx | Excel formats (.xlsx) are complex zipped XML structures. |

## Runtime State Inventory

None — verified by checking index.html. The map application operates entirely on compile-time static assets and client-side processing, with no persistent backend state or active cache keys.

## Common Pitfalls

### Pitfall 1: Map Canvas Size Collapse
*   **What goes wrong:** The map renders with 0px width or height.
*   **Why it happens:** The container div is hidden (`display: none`) or has unstyled dimensions during initialization.
*   **How to avoid:** Initialize the map only when the container is in the DOM and visible, or trigger `map.resize()` when transitioning the viewport.

### Pitfall 2: Broken Asset URLs
*   **What goes wrong:** Marker icons or geojson files return 404.
*   **Why it happens:** Asset URLs resolve relative to `/intelligence` instead of `/`.
*   **How to avoid:** Use absolute root-relative paths like `/assets/...` or import assets directly in JS so Vite can hash and resolve them.

## Code Examples

### Excel Property Intake Script
```javascript
// scripts/import-properties.js
// Source: https://sheetjs.com/
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const excelPath = 'c:/Users/angaj/repos/foottfallBackend/Inventory for app (1).xlsx';
const workbook = XLSX.read(fs.readFileSync(excelPath));
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }).slice(2);

const properties = rows.map(r => ({
  name: r[0],
  status: r[1],
  size: r[6],
  floor: r[7],
  locationLink: r[9],
  tradeArea: r[11],
  suitableFor: r[12],
  price: r[17],
  note: r[34]
})).filter(p => p.name && p.status === 'Available');

fs.writeFileSync('src/data/properties.json', JSON.stringify(properties, null, 2));
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Client SPA Router | Vite Multi-page | Vite v2+ | Separates CSS and script assets, drastically lowering landing page bundle size. |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Properties are mapped by Trade Area string | Code Examples | Some properties won't show if the spelling doesn't match `geoData.js` names. |

## Open Questions

1. **Trade Area Name Normalization**
   - What we know: Excel sheet has trade area names like `"Baner road, Kapil malhar"`. `geoData.js` has names like `"Baner"`.
   - What's unclear: The exact string matches.
   - Recommendation: The intake script should use a fuzzy matcher or a mapping dictionary to align strings (e.g. mapping `"Baner road, Kapil malhar"` to `"Baner"` / `pune-ban`).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| node | Build scripts | ✓ | v20+ | — |
| npm | Dependency install | ✓ | v10+ | — |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest |
| Config file | `vite.config.js` |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MAP-01 | /intelligence renders correctly | e2e / build | `npm run build` | ❌ Wave 0 |
| MAP-03 | Match filter output | unit | `npx vitest run tests/matching.test.js` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run build`
- **Per wave merge:** `npm run build`

### Wave 0 Gaps
- [ ] `tests/matching.test.js` — validates filter logic against test properties
- [ ] Add `vitest` dependency: `npm install -D vitest`

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input Validation | yes | Client-side sanitization of query parameters |

### Known Threat Patterns for frontend map

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS in Property Details | Tampering | Escape user text when appending to DOM elements |

## Sources

### Primary (HIGH confidence)
- [Vite Docs: Multi-page App](https://vite.dev/guide/build.html#multi-page-app) - verified input configurations.
- [MapLibre GL Docs](https://maplibre.org/maplibre-gl-js/docs/) - layer styling and controls.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - MapLibre and Chart.js are stable ecosystem standards.
- Architecture: HIGH - Vite multi-page config is natively supported and clean.
- Pitfalls: HIGH - Map sizing and asset resolution pitfalls are well documented.

**Research date:** 2026-05-28
**Valid until:** 2026-06-28
