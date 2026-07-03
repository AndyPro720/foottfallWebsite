# Phase 08 — Intelligence Data Sync & Exposure Architecture

**Status:** In progress — code landed (Steps 1, 2, 4, 5); Step 3 (deploy hook + env) is manual infra
**Date:** 2026-07-01
**Owner:** Angaj Sharma
**Depends on:** Phase 07 (Map Intelligence Portal), `eager-stirring-breeze.md` Phase 5 (Backend Data Architecture)

> **Implementation status (2026-07-01)**
> - ✅ **Step 1** — `foottfallBackend/functions/index.js`: `runExport()` now projects
>   each `status==='active'` doc through `toPublicListing()` (PUBLIC allowlist +
>   derived `sizeLabel`/`tradeAreaName`/`mainImage`/`approxLocation`), writes
>   `exports/public-listings.json`, and best-effort POSTs the deploy hook. Live leak closed.
> - ✅ **Step 2** — `scripts/import-properties.js`: fetches `PUBLIC_LISTINGS_URL`
>   (env-overridable), re-applies a website-side PUBLIC allowlist (defense-in-depth),
>   falls back to mock on failure. Verified: bundle carries only the 13 public keys.
> - ✅ **Step 4** — `src/pages/intelligence/data-service.js`: `StaticDataService`
>   (getProperties / getPropertyById / getPropertiesForTradeArea +
>   `getPublicPropertiesForTradeArea` cosmetic 3-cap) + `ApiDataService` stub; wired
>   through `filters.js` and `sidebar.js`. Tests + prod build green.
> - ✅ **Step 5** — verified `properties.json` and `dist` bundle contain no
>   GATED/NEVER fields (lat/long hits in the bundle are Mapbox lib code, not data).
> - ⏳ **Step 3 (manual)** — deploy the updated function, create the Cloudflare deploy
>   hook, and set the two env values below. Until then the site builds off the mock
>   fallback. See §9 Step 3 for the exact values.

---

## 1. Problem Statement

The `/intelligence` portal needs live-ish property data from the mobile brokerage
backend (`foottfallBackend`, Firestore `inventory` collection). Two **orthogonal**
concerns were conflated and must be separated:

- **Sync** — get data from Firestore (source of truth) into the website's serving
  layer, periodically, no realtime need, near-zero cost.
- **Exposure** — the browser must only ever *receive* what a public visitor is
  allowed to see, both at the field level (never ship contact/price/notes) and at
  the row level (max 3 properties per trade area), while still letting search work.

These are independent. Sync has an easy answer; exposure is the real design driver.

### The exposure truth

Anything the browser receives is inspectable (devtools, network tab, view-source).
There is **no way** to send data to JavaScript and hide it from a determined user.
"Hide from inspection" therefore means exactly one thing: **do not send it.** The
security boundary is *what leaves the backend*, not what the UI chooses to render.

---

## 2. Constraints

| # | Constraint | Implication |
|---|-----------|-------------|
| 1 | Some fields must never be public (contact, negotiability, notes) | Field allowlist at export time |
| 2 | Search must work across **all** properties | Public-tier fields of all rows must ship; sensitive fields need not |
| 3 | Keep billing near zero (Blaze **is** enabled for photos) | Decouple cost from traffic — serve a static artifact, not per-visitor reads |
| 4 | Public view limited to 3 properties per trade area | Cosmetic cap now (client-side); server-enforced later |
| 5 | No realtime requirement | Daily batch sync is sufficient |
| 6 | Future admin panel unlocks all data + advanced search | Authenticated Firebase app — already supported by existing rules |

---

## 3. Key Facts That Shaped the Decision

- **Blaze is already enabled** (for Storage/photos). The earlier "the export
  function costs money / never runs" friction was the Cloud-Functions-needs-Blaze
  requirement — now moot. Cloud Functions are back on the table.
- **Firestore reads are effectively free** — 50k reads/day even on the free tier;
  the whole inventory is ~40–51 docs. Reading the collection once/day is ~$0.
- **Firestore security rules are document-level.** They allow or deny an entire
  document read; they **cannot strip individual fields**. So opening `inventory`
  to public reads would leak every field. This disqualifies "browser reads
  Firestore directly" for the public site.
- **An export function already exists** — `foottfallBackend/functions/index.js`
  (`exportInventoryToJSON` HTTP + `scheduledExportInventory` daily 02:00 IST). It
  already writes JSON to public Storage with a 1-hour cache header. **Bug:** it
  currently does `{ id, ...data }` — dumping *every* field to a public file.
- **The website already leaks too** — `src/data/properties.json` currently ships
  `locationLink`, `address`, `price`, `priceLabel`, `note` to the browser (51 rows).
- **The admin panel needs no new database** — admins authenticate, and the existing
  Firestore rules (`inventory` read: `isAdmin() || createdBy == uid || ...`) already
  grant them full access. The admin panel is just an authenticated Firebase client
  (which `foottfallBackend` essentially already is).

---

## 4. Decision Log — Options Considered

| Option | Hides fields? | Needs Blaze? | Cost vs traffic | Verdict |
|--------|:---:|:---:|---|---|
| **A. Browser reads `inventory` directly (client SDK)** | ❌ No — rules are document-level | No | Scales w/ traffic | **Rejected** — cannot hide fields; would require public read = full leak |
| **B. Cloud Function API per request** | ✅ + server caps | Yes (have it) | Scales w/ traffic & abuse | **Deferred** — correct for *hard* caps + gated unlock, but per-visitor billing; not needed until admin/gating |
| **C. Cloudflare D1 + Worker** | ✅ + server caps | No | Flat | **Rejected** — new platform; its only edge (no-Blaze server caps) is irrelevant now Blaze is on and admin = authed Firebase |
| **D. `publicListings` mirror collection + client read** | ✅ (hidden fields not mirrored) | No | Scales w/ traffic | **Rejected for now** — per-visitor reads couple cost to traffic; extra collection + rules to maintain |
| **E. Scheduled export → sanitized static artifact** | ✅ at export time | No (runs off Firebase reads, ~free) | **Flat / traffic-proof** | ✅ **Chosen** — lowest & most predictable bill, reuses existing function, no new platform |

**Why E wins on constraint #3:** the only way a near-zero bill becomes a surprise
bill is when cost scales with *visitors* (options A, B, D). A static sanitized
artifact costs the same at 10 or 100,000 visitors — the safest shape for
"keep billing close to zero," independent of Blaze.

**Why not D1 (correcting an earlier lean):** D1's sole advantage was
server-enforced caps *without* Blaze. Blaze is on, and the admin panel is an
authenticated Firebase app — so D1 duplicates Firebase for no benefit. Dropped
entirely. The stack stays 100% Firebase + static hosting.

---

## 5. Chosen Architecture

```
┌──────────────────────┐   admin writes (authenticated, existing app)
│  Firestore inventory │◄──────────────── foottfallBackend (mobile/admin)
│  (SOURCE OF TRUTH +  │
│   admin data store)  │
└──────────┬───────────┘
           │  read all docs (once/day, ~40 reads = ~$0)
           ▼
┌──────────────────────────────────────────────┐
│  Cloud Function (Firebase)                    │
│  • scheduledExportInventory — daily 02:00 IST │
│  • exportInventoryToJSON — HTTP (backend       │
│    "Export" button, ad-hoc refresh)           │
│  APPLY FIELD ALLOWLIST + status=active filter │
│  → write exports/public-listings.json (public,│
│    cached) → POST Cloudflare deploy hook       │
└──────────┬────────────────────────────────────┘
           │  deploy hook triggers rebuild
           ▼
┌──────────────────────────────────────────────┐
│  Cloudflare Pages build                       │
│  scripts/import-properties.js FETCHES the      │
│  sanitized public JSON (no creds — public)     │
│  → writes src/data/properties.json             │
└──────────┬────────────────────────────────────┘
           │  bundled at build
           ▼
┌──────────────────────────────────────────────┐
│  Static /intelligence site (Cloudflare CDN)    │
│  • client-side search over public-tier fields  │
│  • 3-per-trade-area cap (COSMETIC for now)     │
│  • "Connect" lead form gates fuller detail     │
└───────────────────────────────────────────────┘
```

**Freshness/consumption choices (locked):**
- **Scheduled daily** regeneration, **plus** the backend's ad-hoc Export button
  hitting the HTTP endpoint for on-demand refresh.
- **Bake-at-build** (rebuild) rather than runtime fetch. The export function POSTs
  a Cloudflare deploy hook so export → rebuild is automatic. Accepted trade-off:
  new data is visible only after the rebuild (minutes); one failure mode is
  "export ok, deploy hook missed" → one cycle stale until next run. ~30 builds/mo
  vs Cloudflare's free 500.

---

## 6. Data Exposure Model — Field Allowlist

Derived from `foottfallBackend/firestore.rules → inventoryAllowedKeys()`.
**Only the PUBLIC tier is written to the sanitized artifact.** Everything else stays
in Firestore, reachable only by the authenticated admin app and (later) the gated
Cloud Function API.

### PUBLIC — ships in `public-listings.json` (search + cards + map)
- `id` (doc id — stable key)
- `name`
- `buildingType`
- `size` (+ derived `sizeLabel`)
- `floor`
- `suitableFor` (category — F&B/Retail/Fashion/Wellness/Lifestyle)
- `tradeArea` (id) + derived `tradeAreaName`
- `city`
- `status` (export filters to `active`)
- `price` / `priceLabel` — presented as **"Indicative rent"** (currency by city,
  e.g. AED 290/sqft). Note: exact rate is public; `priceNegotiability` is NOT (see NEVER).
- **Facility booleans** (the six shown on the card): `parking` (yes/no),
  `outsideSpace`, `serviceEntry`, `liftAccess`, `bohSpace`, `fireExit`
- `vicinityBrands` — area context text
- *(derived)* **`mainImage`** — a single hero image URL, chosen by priority across
  image categories. For the map icon + property section. Full gallery stays GATED.
- *(derived)* **`approxLocation`** — obfuscated `[lat, lng]` for scattering shop
  markers *within* the (already-disclosed) trade area. Derived from the real pin by
  deterministic jitter/rounding (~200m, seeded by `id` so markers are stable across
  rebuilds). **Raw `latitude`/`longitude` are never emitted** — see NEVER.

### GATED — unlocked after lead capture / future API; NOT in the public artifact
- `parkingCount` and detailed specs: `frontage`, `mezzanine`, `mezzanineSize`,
  `clearHeight*`, `cam`, `connectedLoad`, `buildingAge`, `mergable`
- Full image gallery: every `images.*` entry beyond `mainImage`, all `*Photo`
  facility photos, `presentationAvailable` / `presentationLink` / `presentationFile`

### NEVER PUBLIC — admin/internal only, never in any public or lead-unlocked artifact
- `contactName`, `contactDesignation`, `contactInfo` — the broker's core asset
  (the blurred "Owner contact" row). Revealed only by human broker follow-up.
- `location` (exact address), `googleMapsLink`, `latitude`, `longitude` — exact
  location (the blurred "Exact address" row). `approxLocation` is derived from these
  server-side but the raw values never leave Firestore. Bypasses the broker.
- `priceNegotiability` — negotiation intel
- `miscNotes` — internal notes
- `createdBy`, `creatorEmail`, `creatorName` — operator identity
- `unitName`, `projectId` — internal structure
- `completionTime`, `partOC`, `completeOC`, `ocFile` — legal docs
- `mediaUploadPending`, `syncPending` — internal flags

> **Derived-field notes.**
> - `mainImage`: pick order should avoid the most identifying shot when broker-bypass
>   is a concern — a main photo *plus* `approxLocation` together are more identifying
>   than either alone. Prefer interior/generic over exact-signage storefront.
> - `mainImage` is the one PUBLIC field whose egress **scales with traffic** (served
>   from Storage per card view). Keep it to one image/card, rely on Storage cache
>   headers, and let Cloudflare cache it. Negligible at current scale.

> **The allowlist is the security boundary.** The 3-per-trade-area cap is applied
> client-side in this phase and is therefore *cosmetic* — all PUBLIC-tier rows are
> technically inspectable. That is an accepted limitation (constraint #2 needs all
> rows for search); it is closed by the future API (Section 8). No GATED/NEVER field
> is ever inspectable at any point.

---

## 7. Cost Analysis (at current scale, ~50 properties)

| Item | Volume | Cost |
|------|--------|------|
| Firestore reads (export) | ~50 reads × 1/day (+ ad-hoc) | ~$0 (free tier 50k/day) |
| Cloud Function invocations | ~30/mo scheduled + a few ad-hoc | ~$0 (free tier 2M/mo) |
| Storage (sanitized JSON) | a few KB, cached 1h | ~$0 |
| Storage egress | build fetch + cached | negligible |
| Cloudflare Pages builds | ~30/mo | $0 (free 500/mo) |
| **Per-visitor Firebase cost** | **none — static serving** | **$0, traffic-proof** |

The bill does **not** scale with website traffic. A traffic spike or scraper hits
the Cloudflare CDN, not Firebase.

---

## 8. The Future — Cloud Function API (why "the API is the future")

The static artifact intentionally cannot enforce hard row caps or per-user gating.
When those are needed, add a **Firebase Cloud Function gateway** — no new platform,
Blaze already on, stack stays 100% Firebase. This realizes Phase 5
(`ApiDataService`) of `eager-stirring-breeze.md`.

**What the API adds that static cannot:**
- **Hard 3-per-trade-area cap** — enforced in the query (`LIMIT 3`), so the browser
  physically never receives the 4th row. Turns the cosmetic cap into a real one.
- **Gated unlock** — after lead capture, return GATED-tier fields for the specific
  properties the warm lead is entitled to.
- **Advanced/admin search** — authenticated callers (admin) bypass caps and the
  allowlist, getting full documents and richer filters.

**Migration path (no UI rewrite):** Phase 5's `DataService` seam is the enabler.
- Build `StaticDataService` now (reads bundled `properties.json`).
- Later add `ApiDataService` (calls the Cloud Function). Swap the injected
  implementation in `main.js`; **UI code is untouched.**

```
class DataService {
  getProperties(filters)        // Static: local filter | API: server query + LIMIT 3
  getPropertyById(id)           // Static: n/a          | API: gated fields post-lead
  getPropertiesForTradeArea(id) // Static: cosmetic cap | API: hard cap
  getCities() / getCountries()  // both: from geo data
  submitLead(formData)          // existing Worker / web3forms
}
```

**Admin panel** = an authenticated Firebase app (like `foottfallBackend`). Existing
`inventory` rules already grant admins full read/write. No extra database; it reads
Firestore directly with auth, unlocking all fields and unrestricted search.

---

## 9. Implementation Plan

### Step 1 — Fix the export function (backend) *(highest priority — closes the live leak)*
`foottfallBackend/functions/index.js`
- Replace `{ id, ...data }` with an explicit **PUBLIC-tier allowlist** projection.
- Filter to `status === 'active'`.
- Add derived fields: `sizeLabel`, `tradeAreaName` (reuse the website's
  `TRADE_AREA_RULES` mapping), `mainImage` (priority pick from `images.*`),
  and `approxLocation` (deterministic ~200m jitter/round of the raw pin, seeded
  by `id`). Raw `latitude`/`longitude` are consumed here but **not emitted**.
- Keep writing to `exports/public-listings.json` (public, `max-age=3600`).
- After a successful write, `POST` the Cloudflare Pages deploy hook (store the hook
  URL as a function config/secret).
- Keep both triggers: `scheduledExportInventory` (daily 02:00 IST) and
  `exportInventoryToJSON` (HTTP, for the backend "Export" button).

### Step 2 — Rework website ingestion (this repo)
`scripts/import-properties.js`
- Replace the hardcoded local `.xlsx` read with a **fetch** of the public
  `public-listings.json` Storage URL (no credentials — it's public).
- Write the result to `src/data/properties.json` — now containing **only PUBLIC-tier
  fields** (drops `locationLink`, `address`, `price`, `priceLabel`, `note`).
- Keep the mock fallback for local dev when the URL is unreachable.

### Step 3 — Wire the deploy hook *(remaining manual infra)*
Code is ready (`triggerDeployHook()` in the function, env-overridable fetch in the
importer). To activate end-to-end:
1. **Deploy the function:** `cd foottfallBackend && firebase deploy --only functions:exportInventoryToJSON,functions:scheduledExportInventory`.
2. **Create a Cloudflare Pages deploy hook** for the intelligence project (Settings →
   Builds & deployments → Deploy hooks). Copy the generated POST URL.
3. **Set the hook on the function** (so export → rebuild is automatic):
   `firebase functions:secrets:set CLOUDFLARE_DEPLOY_HOOK_URL` (or a `.env`), then redeploy.
4. **Set the source URL on the website build** — in Cloudflare Pages env vars, set
   `PUBLIC_LISTINGS_URL` to the confirmed public object URL. The importer defaults to
   `https://storage.googleapis.com/footfall-inventory.firebasestorage.app/exports/public-listings.json`;
   **verify the bucket suffix** (`.firebasestorage.app` vs `.appspot.com`) — a local
   fetch of the default returned HTTP 403 (object not published yet, bucket reachable).
5. **Trigger once** via the backend "Export" button (or `fire` the schedule) and confirm
   the object is public + the site rebuilds.

> **Cleanup:** the old code wrote the *full-field* `exports/inventory.json`. If any run
> ever produced it, delete that Storage object — it is a stale full-data leak. The new
> code writes only `exports/public-listings.json`.

### Step 4 — DataService seam (Phase 5 groundwork, static impl only)
`src/pages/intelligence/data-service.js` (new)
- `StaticDataService` reads bundled `properties.json`; enforce the (cosmetic)
  3-per-trade-area cap here so the future swap is centralized.
- Inject via `main.js`; refactor `filters.js` to consume it.
- Stub `ApiDataService` with TODO markers (built in the future phase).

### Step 5 — Verify exposure
- Confirm `src/data/properties.json` (and the deployed bundle) contain **no**
  GATED/NEVER fields.
- Confirm search still works across all rows and the map highlights correctly.

---

## 10. Verification

- [ ] `public-listings.json` contains only PUBLIC-tier fields: grep for
      `contactInfo`, `location`, `googleMapsLink`, `latitude`, `longitude`,
      `priceNegotiability`, `miscNotes`, `creatorEmail` → **none**.
- [ ] `mainImage` is a single URL (not the full gallery); `approxLocation` is present
      and stable across two consecutive exports; raw coords absent.
- [ ] Facility booleans + `price` (indicative rent) present and correct.
- [ ] Only `status: active` properties are exported.
- [ ] Backend "Export" button forces a fresh export + rebuild.
- [ ] Daily schedule runs and triggers a rebuild via the deploy hook.
- [ ] `src/data/properties.json` no longer contains `locationLink/address/price/note`.
- [ ] `/intelligence` search + map behave identically with the sanitized data.
- [ ] Sidebar shows ≤3 property cards per trade area (cosmetic cap active).
- [ ] Cloudflare build succeeds fetching the public JSON with no credentials.

---

## 11. Open Items / Deferred

- **Hard 3-cap + gated unlock** → future Cloud Function API phase (Section 8).
- **Admin panel** → authenticated Firebase app, separate effort.
- **Coarse `priceBand`** → decide band thresholds if we expose it (optional).
- **Trade-area mapping duplication** → `TRADE_AREA_RULES` currently lives in
  `scripts/import-properties.js`; if the export function computes `tradeAreaName`,
  keep a single source of truth (share or move the mapping backend-side).
