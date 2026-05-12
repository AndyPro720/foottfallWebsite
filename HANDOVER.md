# HANDOVER.md — AI Agent Onboarding for foottfall.com Website

> **Purpose**: This document gives a new AI agent complete context to build the foottfall.com website and, in Phase 2, port and integrate the existing map intelligence application into it.
>
> **Date**: 2026-05-10
> **Legacy Repo**: `footfall` (Vite + Vanilla JS map intelligence app)
> **New Repo**: This one (`footfall-web`) — the public-facing website at `foottfall.com`

---

## Table of Contents

1. [Business Context](#1-business-context)
2. [What We're Building](#2-what-were-building)
3. [Timeline & Phases](#3-timeline--phases)
4. [New Website Design (from Wireframe)](#4-new-website-design)
5. [Legacy Map Application — Full Architecture](#5-legacy-map-application--full-architecture)
6. [Data Structures & Pipeline](#6-data-structures--pipeline)
7. [Map Application Internals (For Future Port)](#7-map-application-internals)
8. [Lead Capture System](#8-lead-capture-system)
9. [Integration Plan](#9-integration-plan)
10. [Technical Decisions](#10-technical-decisions)
11. [Assets & Resources](#11-assets--resources)
12. [What NOT To Do](#12-what-not-to-do)

---

## 1. Business Context

**Foottfall** (note: double 't') is a commercial real estate leasing and advisory firm. They help retail and F&B brands find optimal locations by analyzing:
- **Footfall** (pedestrian traffic)
- **Demographics** (population, age, income segments)
- **Commercial metrics** (rent bands, anchor tenants, spend per visit)
- **Brandscape** (existing brand saturation, whitespace opportunities)

**Geographic coverage**: India (Mumbai, Pune) and UAE (Dubai).

**Founder**: Rahul Ahuja — 15+ years in high-volume real estate acquisitions.

**Brand clients** (referenced in marketing): Nando's, Tim Hortons, Absolute Barbeque, Starbucks, ZARA, H&M, Chipotle, PVR, and others.

**Existing products**:
- **Intelligence Map App** (legacy repo) — Interactive MapLibre GL dashboard for trade area exploration
- **Inventory PWA** (separate repo, hosted at `inventory.foottfall.com`) — Internal property management tool with Firebase backend. **Completely separate** — do NOT integrate or reference its backend.

---

## 2. What We're Building

### Phase 1 (Now — ~5 days): Marketing Website
A premium, modern marketing website at `foottfall.com`. Content-first, narrative-driven, with dynamic visual flair. The website tells Foottfall's story and funnels users toward the intelligence platform.

### Phase 2 (~20-25 days later): Map Intelligence Integration
Port a **toned-down, controlled version** of the existing map intelligence app into the website at the `/intelligence` route. Users reach it by clicking "Explore Intelligence" CTAs on the website.

**Critical**: The website and map app live under ONE domain (`foottfall.com`). Same-origin, same build pipeline. The map app at `/intelligence` should feel like a natural extension of the website, not a separate product.

---

## 3. Timeline & Phases

| Phase | Deliverable | Timeline | Status |
|-------|------------|----------|--------|
| **Phase 1** | Marketing website (all sections from wireframe) | ~5 days | 🎯 Current |
| **Phase 2** | Map intelligence app (toned-down port) | +20-25 days | ⬜ Future |

---

## 4. New Website Design

The wireframe PDF (`Footfall Website_Design 2.pdf`) defines the following sections. The design language is **premium real estate editorial** — forest greens, clean whites, warm photography, serif + sans-serif typography pairing.

### Design Language
- **Primary Color**: Deep forest green (`~#1a3a2a` to `~#2d5a3d`)
- **Secondary**: Clean white, warm cream
- **Accent**: Gold/warm tones for CTAs
- **Typography**: Serif font for philosophical/hero copy (e.g., Playfair Display), modern sans-serif for nav/body (e.g., Outfit or Inter)
- **Photography**: High-quality restaurant interiors, urban retail spaces, premium commercial real estate imagery
- **Feel**: Premium, confident, editorial — NOT tech-startup, NOT dashboard-first

### Section-by-Section Breakdown

#### 1. Hero / Landing
- Full-width restaurant/retail interior photo as background
- "FOOTFALL LEASING" prominent heading
- Tagline: "Where Your Brand Belongs"
- Minimal nav bar with logo

#### 2. Cities & Regional Bases
- Display of geographic presence
- Categories: World • Metro • Emerging • Opportunity
- City names with clean layout

#### 3. Trade Area Intelligence
- "We've mapped 140+ trade areas across India and UAE"
- Brief explanation of the intelligence methodology
- **CTA: "Find Where You Belong"** — this is the gateway to the map app (Phase 2)

#### 4. Categories We Serve
- Visual grid/cards showing sectors:
  - Restaurants & Cafés
  - Entertainment & Leisure
  - Wellness & Fitness
  - Pet Services
  - Fashion & Lifestyle
  - (potentially others)

#### 5. How We Work (Process Section)
- Three-stage process:
  - **Stage 1: City Plotting** — Macro analysis of cities and corridors
  - **Stage 2: DCB Framework** — Demographics, Commercial, Brandscape deep dive
  - **Stage 3: Stock Matching** — Matching brands to available retail units
- **🔑 "Explore Intelligence" CTA** — Primary gateway to map app (Phase 2)

#### 6. About & Founder
- Rahul Ahuja bio and photo (photo available at `public/founder-portrait.png` in legacy repo)
- Philosophy/vision statement
- Team overview if applicable

#### 7. Brands Showcase
- Logo wall or carousel of client brands
- Social proof section

#### 8. Footer
- Contact information: info@foottfall.com
- Office locations (if applicable)
- Social media links
- Navigation links

---

## 5. Legacy Map Application — Full Architecture

> **This section is critical for Phase 2 porting. Read carefully.**

### Overview
The existing map app is a **171KB monolithic JavaScript file** (`intelligence.js`) inside a Vanilla JS + Vite SPA. It uses **MapLibre GL** (open-source Mapbox fork) with **OpenFreeMap** tiles to create an interactive trade area explorer.

### Technology Stack
| Tech | Version | Purpose |
|------|---------|---------|
| **Vite** | ^5.4.21 | Build tool and dev server |
| **MapLibre GL** | ^5.14.0 | Map rendering engine (WebGL) |
| **Chart.js** | ^4.5.1 | Scatter plots and bar charts in sidebar |
| **PapaParse** | ^5.5.3 | CSV parsing (build-time data generation) |
| **GSAP** | CDN-loaded | Tour animations, logo animations |
| **Outfit font** | @fontsource | Primary font (400-900 weights) |
| **Cinzel font** | @fontsource | Accent serif font |
| **vite-plugin-pwa** | ^1.2.0 | PWA service worker registration |

### Application Structure
```
src/
├── main.js                    # Entry point, route definitions, loader, scroll observer
├── router.js                  # Custom SPA router (pushState + popstate)
├── pages/
│   ├── intelligence.js        # 🔥 THE MONOLITH — 4143 lines, 171KB
│   └── home.js                # Marketing page (BEING REPLACED by this new repo)
├── components/
│   ├── navbar.js              # Global navigation bar
│   ├── loader.js              # Animated loading screen with FOOTFALL scanner animation
│   └── slideModal.js          # Multi-step modal component for lead capture
├── data/
│   ├── geoData.js             # AUTO-GENERATED — trade area features + metadata
│   ├── dataManager.js         # DEPRECATED — legacy recommendation scoring
│   ├── cityBorders.js         # AUTO-GENERATED — city polygon boundaries
│   ├── dubai.geojson          # City boundary polygon
│   ├── mumbai.geojson         # City boundary polygon
│   └── pune.geojson           # City boundary polygon
├── backend/                   # ⚠️ NOT NEEDED — this is for the Inventory PWA
│   ├── firebaseConfig.js
│   ├── inventoryService.js
│   └── storageService.js
├── utils/
│   ├── emailService.js        # Lead email sending via FormSubmit.co
│   └── userProfileService.js  # localStorage-based user tracking
├── styles/
│   ├── intelligence.css       # 47KB — all map dashboard styles
│   ├── components.css         # 32KB — reusable component styles
│   ├── slideModal.css         # 14KB — modal styles
│   ├── loader.css             # 8KB — loading animation
│   ├── contact.css            # 9KB — contact section
│   ├── services.css           # 5KB — services section
│   ├── global.css             # 1.5KB — base resets
│   └── variables.css          # 1.5KB — CSS custom properties
└── style.css                  # 20KB — main stylesheet
```

### SPA Router Pattern
The app uses a custom router that:
1. Intercepts `[data-link]` clicks
2. Uses `history.pushState` for navigation
3. Each page exports `{ render(), afterRender() }`
4. `render()` returns an HTML string
5. `afterRender()` is an async function that initializes JavaScript (map, events, etc.)
6. Router injects HTML into `#app` div and calls `afterRender()`

```javascript
// Route definitions
const routes = {
  '/': Intelligence,          // Map dashboard (was the landing)
  '/intelligence': Intelligence, // Alias
  '/info': Home               // Marketing (being replaced)
};
```

**In the new website, this will flip**: `'/'` = Website, `'/intelligence'` = Map App.

### Map View Hierarchy
The map has 4 levels of zoom, each with distinct UI and data:

```
Global View (hidden from users, accessible via secret 🌍 button)
   ├── Shows country polygons (India, UAE)
   ├── Click country → Country View
   │
Country View
   ├── Shows city polygons (Mumbai, Pune, Dubai) with borders and labels
   ├── Hover highlights city, click → City View
   │
City View
   ├── Shows trade area pins and heatmap blobs
   ├── Legend lists all TAT categories
   ├── Pins are colored by TAT tier
   ├── Click pin → Trade Area View
   │
Trade Area View
   ├── Zooms to 16 with pitch 60° and bearing -30°
   ├── Shows 3D buildings layer
   ├── Opens sidebar with DCB tabs
   └── Sidebar has "Find My Location" CTA
```

### Map Layers (MapLibre GL)
| Layer ID | Type | Source | Purpose |
|----------|------|--------|---------|
| `country-fill` | fill | `countries` | UAE country polygon |
| `india-fill` | fill | `india-osm` | India polygon (from OSM GeoJSON) |
| `cities-fill` | fill | `cities` | City polygons (clickable) |
| `cities-border` | line | `cities` | City border outlines |
| `cities-border-casing` | line | `cities` | Border casing effect |
| `cities-glow` | line | `cities` | Animated glow on hover |
| `cities-label` | symbol | `cities` | City name labels |
| `trade-blobs` | circle | `trade-areas` | Heatmap-style circles at city level |
| `trade-points` | circle | `trade-areas` | Clickable trade area pins |
| `3d-buildings` | fill-extrusion | mapbox tiles | 3D building layer at trade area zoom |

### Key Internal Controllers

#### `MapTourController`
Automated camera tour that loops between India and UAE views on the landing page.
- Tour stops: India (Pune/Mumbai region) → UAE (Dubai)
- Each stop has: center, zoom, pitch, bearing, duration, stayDuration
- Integrates with `StatsCardController` to show rotating trade area stats
- Pauses on user interaction, resumes after timeout
- Stops permanently when user clicks a city button

#### `StatsCardController`
Rotates through trade area data cards during the tour.
- Updates: area name, city, footfall bar, category pills
- Synced to tour stops (rotates areas within current region)
- Shows data from `tradeData` enriched metadata

#### `LandingLogoAnimator`
GSAP-driven animation of the FOOTFALL letters (F=scanner, OO=people colliding, TT=map pins, FA=bar charts, LL=pin drop + forklift). Currently disabled in favor of static logo.

#### View Functions (Lines in intelligence.js)
| Function | Line | Purpose |
|----------|------|---------|
| `loadGlobalView()` | 2564 | Reset to world view |
| `loadCountryView(feature)` | 2677 | Show cities for a country |
| `loadCityView(feature)` | 2777 | Show trade area pins/blobs for a city |
| `loadTradeAreaView(feature)` | 2845 | Zoom in, show sidebar DCB data |
| `renderMatchedResults(areas, city)` | 3345 | Show filtered trade area results panel |
| `openSidebar(data)` | 2923 | Populate sidebar with DCB tabs |
| `applyFiltersAndShowResultsWithCount(city)` | 3864 | Run filter logic and display matches |
| `returnToLanding()` | 855 | Transition back to landing mode |
| `transitionToDashboard()` | 923 | Transition from landing to dashboard |

### Sidebar — DCB Tabbed Interface
When a trade area is clicked, the sidebar opens with three tabs:

**Demographics Tab**:
- Population & Density (population count, gender ratio)
- Target Profile (primary age group, income segment)
- Footfall (estimated daily visitors)

**Commercial Tab**:
- Rental Metrics (avg rent, rent band, avg spend/visit)
- Commercial Units (total count)
- Anchor Tenants (chips listing major retailers)

**Brandscape Tab**:
- Existing Brands (chip list)
- Category Saturation (F&B, Fashion, Electronics, Wellness — bar charts)
- Whitespace Opportunities (Pet Care, Coworking, EV Charging)

### Map Tile Configuration
```javascript
// Base map style (OpenFreeMap)
style: 'https://tiles.openfreemap.org/styles/positron'

// India polygon from OSM (loaded from public/india-osm.geojson)
// City boundary polygons auto-generated from src/data/*.geojson files
```

### Map Style Cleanup
The `applyCleanMapStyle()` function hides hundreds of base map labels (highways, POIs, waterways, etc.) using regex pattern matching against layer IDs. This gives a clean, minimal map backdrop.

---

## 6. Data Structures & Pipeline

### Build-Time Data Generation
All geographic data is compiled at build time from CSVs — there is NO runtime API. Data changes require re-running the build scripts.

```
📁 data-sources/countries/*.csv    (Raw trade area data — india.csv, uae.csv)
         ↓
   scripts/generate-geo-data.js    (Node script: reads CSV, applies TAT color logic)
         ↓
   src/data/geoData.js             (AUTO-GENERATED — DO NOT EDIT)

📁 src/data/*.geojson              (City boundary polygons)
         ↓
   scripts/prepare_data.cjs        (Combines into single module)
         ↓
   src/data/cityBorders.js         (AUTO-GENERATED — DO NOT EDIT)
```

### CSV Data Points (Source of Truth)

| Field | Type | Example |
|-------|------|---------|
| `id` | string | `pune-kp` |
| `name` | string | `Koregaon Park` |
| `city` | string | `Pune` |
| `lat` / `lng` | number | `18.5362` / `73.8939` |
| `tat_tier` | string | `TAT-1 (CBD)` |
| `corridor_type` | string | `High Street`, `Nightlife`, `Family Dining` |
| `rent_band` | string | `Premium+`, `Mid-High` |
| `avg_rent_month` | string | `₹28,000-45,000` |
| `est_spend_visit` | string | `₹2,800-4,800` |
| `total_footfall` | string | `30,000+` |
| `daypart_peak` | string | `Late Night`, `Evening` |
| `live_units` | number | `65` |
| `anchors` | string | `Phoenix Marketcity` |
| `brand_presence` | string | `Social, Starbucks, Zara` |
| `population` | number | `45000` |
| `age_profiling` | string | `Young Professionals` |
| `gender_mix` | string | `48:52` |

### TAT Classification System (Trade Area Tiers)

**Primary Tiers** (by business potential):
| Tier | Label | Color | Hex |
|------|-------|-------|-----|
| TAT-1 | Central Business District | Red | `#E53935` |
| TAT-2 | Peripheral Business District | Orange | `#FF9800` |
| TAT-3 | Tertiary Business District | Blue | `#2196F3` |

**Sub-Trade Areas** (by character):
| Type | Label | Color | Hex |
|------|-------|-------|-----|
| Nightlife | High Energy | Purple | `#9C27B0` |
| Mall | Mall Catchment | Dark | `#424242` |

### GeoJSON Feature Structure
```json
{
  "type": "Feature",
  "properties": {
    "id": "pune-kp",
    "name": "Koregaon Park",
    "city": "Pune",
    "type": "TAT-1",
    "color": "#E53935",
    "corridor": "High Street / F&B",
    "subCategory": "highstreet",
    "suitableFor": ["fb", "fashion"],
    "propertySizes": ["500-2000", "2000-5000"],
    "ticketRange": "500-1000"
  },
  "geometry": { "type": "Point", "coordinates": [73.90, 18.53] }
}
```

### Rich Metadata (`tradeData` map)
```json
{
  "pune-kp": {
    "name": "Koregaon Park",
    "city": "Pune",
    "corridor": "High Street / F&B",
    "stats": { "rent": "Premium", "spend": 2500, "footfall": "35,000+" },
    "demographics": { "population": 45000, "age": "20-40 yrs", "gender": "55:45", "segment": "A/A+" },
    "commercial": { "anchors": ["Starbucks", "Nature's Basket"], "units": 12, "rentBand": "High" },
    "brands": ["Starbucks", "Nature's Basket"]
  }
}
```

---

## 7. Map Application Internals (For Future Port)

### What to PORT (Phase 2)
These are the core elements that make the map app valuable:

1. **MapLibre GL map initialization** — tile loading, source/layer setup
2. **View hierarchy** (Country → City → Trade Area) with smooth flyTo transitions
3. **Trade area pins and heatmap blobs** with TAT color coding
4. **DCB Sidebar** (Demographics, Commercial, Brandscape tabs)
5. **Data pipeline** (CSV → GeoJSON build-time generation)
6. **Legend system** — dynamic legend content per view level
7. **Breadcrumb navigation** (Global > India > Pune > Koregaon Park)
8. **Back button** to navigate up the hierarchy
9. **Map style cleanup** — hide noisy base map labels
10. **3D buildings** at trade area zoom level

### What to SIMPLIFY or REMOVE for "toned down" version
The legacy app has power-user features that should be simplified:

1. **Tour system** — Automated camera loop between India/UAE. Consider replacing with a simple initial view or removing entirely.
2. **Stats card rotation** — Auto-cycling trade area cards during tour. Likely remove.
3. **FOOTFALL scanner animation** — Complex GSAP letter-by-letter animation. Remove or simplify to a simple logo fade.
4. **Wizard overlay** — Multi-step onboarding. Replace with simpler UX.
5. **Soft lead capture popup** — 23-second timed popup. Evaluate if needed on the new website.
6. **Customisation panel** — Full filter panel with category/size/ticket chips. Simplify to cleaner filter UI.
7. **Landing page split-view** — Left panel + map panel layout. The new website IS the landing page, so this entire pattern changes.
8. **Country prompt overlay** — "Select Experience" modal. Remove.
9. **Matched results panel** — Shows filtered trade areas. Keep but simplify styling.

### What to RESTYLE
The current map app uses dark glassmorphism aesthetics:
- Background: `#050505` black
- Glass cards with `backdrop-filter: blur()`
- Gold accents (`#D4AF37`)
- Neon-esque glows

**The new website uses** forest green + white editorial design. The map app at `/intelligence` should inherit the new website's design system:
- Lighter, cleaner overlay cards
- Green/white color scheme for UI chrome
- Map itself remains dark (satellite/positron) — only the UI overlays change
- Sidebar, legend, breadcrumbs, filters should match website aesthetics

---

## 8. Lead Capture System

### Services (from legacy app)

**`UserProfileService`** (`src/utils/userProfileService.js`):
- Stores user data in `localStorage`
- Assigns persistent UUID per browser
- Tracks lead status: `null` → `cold` (dismissed) → `warm` (submitted form)
- 24-hour cooldown for dismissed soft leads
- `Ctrl+Shift+D` hard reset shortcut

**`EmailService`** (`src/utils/emailService.js`):
- Sends structured HTML emails via **FormSubmit.co** (free email forwarding)
- Enriched metadata: User ID, device info, browser, lead status, timestamp
- Email types: `soft_lead`, `trade_area_filter`, `find_location`

### CTA Flows

**Find My Trade Area** (lighter engagement):
1. City selection (if not already in a city)
2. Filter preferences (category, property size, ticket size)
3. → Shows matched trade areas on map
4. → Sends cold lead email

**Find My Location** (full engagement):
1. Contact info (name, brand, phone, email)
2. Filter preferences
3. Demographics targeting
4. Business details
5. Existing footprint
6. Growth aspirations
7. → Sends warm lead email, marks as warm

### For the New Website
The website will need its own contact/CTA forms (designed per wireframe). The legacy `EmailService` via FormSubmit.co can be reused or upgraded. The `UserProfileService` pattern (localStorage tracking) is worth porting.

---

## 9. Integration Plan

### Domain Structure
Everything lives under `foottfall.com`:

| Route | Content |
|-------|---------|
| `/` | Website hero/landing |
| `/#cities` | Cities section |
| `/#intelligence-intro` | Trade area intelligence section |
| `/#categories` | Categories we serve |
| `/#how-we-work` | Process section |
| `/#about` | Founder & team |
| `/#brands` | Brand showcase |
| `/intelligence` | **Map application** (Phase 2) |

### Phase 2 Integration Approach
When porting the map app:

1. **Create `/intelligence` as a separate page/route** within this repo
2. **Copy and refactor `intelligence.js`** — break the 4143-line monolith into modules:
   - `mapController.js` — MapLibre init, layers, view transitions
   - `sidebarController.js` — DCB tabs, data display
   - `filterController.js` — Filter panel, matched results
   - `tourController.js` — (if keeping tour, otherwise remove)
   - `legendController.js` — Dynamic legend per view
3. **Copy the data pipeline** — `generate-geo-data.js`, `prepare_data.cjs`, CSVs
4. **Restyle** — Use the website's design system (green/white) for all map UI chrome
5. **Navigation** — Website nav should include "Explore Intelligence" linking to `/intelligence`, and the map app should have a "Back to Website" link to `/`

---

## 10. Technical Decisions

### For This Repo
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Build tool | **Vite** (Vanilla JS) | Same as legacy. Fast, simple, no framework overhead. Shared knowledge. |
| CSS approach | **Vanilla CSS** with custom properties | Legacy uses this pattern. Maximum control for premium design. |
| Fonts | **Outfit** (sans) + **Playfair Display** (serif) | Wireframe shows serif/sans pairing. Outfit is already in legacy. |
| SEO | Static HTML with proper meta tags | Content-heavy marketing site needs good SEO. |
| Map engine | **MapLibre GL** (Phase 2) | Same as legacy. Open-source, performant, free tiles via OpenFreeMap. |
| JavaScript | ES Modules, no framework | Map app is vanilla JS. No React/Vue overhead needed. Keep it lean. |

### What's NOT shared with legacy
| System | Legacy | This Repo |
|--------|--------|-----------|
| Firebase | Used for Inventory PWA | **NOT NEEDED** — Inventory is a separate app |
| Firestore | inventory/users/transactions | **NOT NEEDED** |
| Auth | Firebase Auth | **NOT NEEDED** for website |
| Service Worker / PWA | vite-plugin-pwa | Optional — website doesn't need offline mode |

---

## 11. Assets & Resources

### Key Documentation to Copy from Legacy Repo

> [!TIP]
> The single best reference for the map application internals is **`docs/PROJECT_ARCHITECTURE.md`** (402 lines) in the legacy repo. It covers routing, data flow, map layers, user flows, CTA button logic, lead tracking, loader sequencing, and build scripts in well-organized detail. **Copy this file into the new repo's `docs/` folder** — it will be invaluable during Phase 2 map porting. Much of Sections 5-8 of this handover are distilled from it.

### Assets to Copy from Legacy Repo
These files exist in the legacy `footfall` repo and should be copied to this repo:

| Asset | Legacy Path | Purpose |
|-------|-------------|---------|
| Foottfall logo | `public/logo.png` | Primary logo |
| Alternate logo | `public/logo1.png` | Secondary logo variant |
| Founder portrait | `public/founder-portrait.png` | Rahul Ahuja photo for About section |
| Fingerprint graphic | `public/fingerprint.png` | Brand element |
| Hero background | `public/hero-bg.png` | May be useful for sections |
| India OSM polygon | `public/india-osm.geojson` | India boundary (Phase 2) |
| PWA icons | `public/pwa-*.png` | If PWA is desired |
| Data sources | `data-sources/` | CSVs for data generation (Phase 2) |
| GeoJSON boundaries | `src/data/*.geojson` | City polygons (Phase 2) |
| Build scripts | `scripts/generate-geo-data.js`, `scripts/prepare_data.cjs` | Data pipeline (Phase 2) |

### Wireframe
The full design wireframe is at `public/Footfall Website_Design 2.pdf` in the legacy repo. This is the source of truth for the website design.

---

## 12. What NOT To Do

> [!CAUTION]
> Read this section carefully.

1. **Do NOT use Firebase, Firestore, or any backend services.** The Inventory PWA (`inventory.foottfall.com`) is a completely separate application with its own repo and backend. This website is a static/frontend-only marketing site.

2. **Do NOT try to import or bundle the 171KB `intelligence.js` monolith as-is.** It must be refactored and modularized before integration in Phase 2.

3. **Do NOT use dark glassmorphism design.** The old aesthetic was tech-dashboard dark mode. The new website is forest green + white editorial. The map app UI (Phase 2) will also adopt the new design system.

4. **Do NOT add user authentication.** The website is public-facing. No login required.

5. **Do NOT over-engineer Phase 1.** The website is a content site with dynamic flair. Don't add unnecessary complexity. Save the heavy JavaScript for Phase 2 (map integration).

6. **Do NOT break the map app in the legacy repo.** If you need to reference or copy from it, the legacy repo should remain untouched and functional.

7. **Do NOT use TailwindCSS** unless explicitly requested. Use vanilla CSS with custom properties.

---

## Appendix: Legacy Repo Reference

If you need to reference the original codebase:
- **Repo name**: `footfall`
- **Branch**: `intelligence` (all production work is here)
- **Last commit**: `18e4da6 docs(phase-3): create execution plans and research`
- **Key files to reference**:
  - `src/pages/intelligence.js` — The map app monolith (4143 lines)
  - `docs/PROJECT_ARCHITECTURE.md` — Full architecture documentation (402 lines)
  - `docs/data_points.md` — All data fields reference
  - `.gsd/phases/1/SCHEMA.md` — Firestore schema (for Inventory PWA, NOT for this project)
  - `scripts/generate-geo-data.js` — Data generation pipeline
  - `src/styles/intelligence.css` — Map dashboard CSS (47KB)

---

*End of handover document. This should provide complete context for building the website (Phase 1) and porting the map app (Phase 2).*
