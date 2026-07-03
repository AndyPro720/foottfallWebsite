import properties from '../../data/properties.json';

// ─── DataService seam (Phase 08 / eager-stirring-breeze Phase 5) ───
//
// A single access point for property data so the storage strategy can change
// without touching the UI. Today the data is a static, field-sanitized bundle
// baked at build time (StaticDataService). Later, an ApiDataService can call a
// Firebase Cloud Function for hard row caps, post-lead gated fields, and admin
// search — swapping the exported `dataService` singleton is the only change;
// callers (filters/sidebar/wizard) stay identical.
//
// See .planning/phases/08-data-sync-architecture/08-DATA-SYNC-PLAN.md §8.

// End-user public view is limited to this many properties per trade area.
// COSMETIC in the static tier — all rows still ship in the bundle, so the cap
// is a display convention, not a security boundary. The API tier turns this
// into a real server-enforced LIMIT.
export const PUBLIC_CARD_CAP = 3;

class StaticDataService {
  constructor(source = properties) {
    this.properties = Array.isArray(source) ? source : [];
  }

  // All rows (used for search/matching and true per-area counts).
  getProperties() {
    return this.properties;
  }

  getPropertyById(id) {
    return this.properties.find((property) => property.id === id) || null;
  }

  // Uncapped — for counts and internal aggregation.
  getPropertiesForTradeArea(tradeAreaId) {
    if (!tradeAreaId) return [];
    return this.properties.filter((property) => property.tradeArea === tradeAreaId);
  }

  // Capped to PUBLIC_CARD_CAP — for the public-facing card list.
  getPublicPropertiesForTradeArea(tradeAreaId) {
    return this.getPropertiesForTradeArea(tradeAreaId).slice(0, PUBLIC_CARD_CAP);
  }

  // eslint-disable-next-line class-methods-use-this
  submitLead() {
    // Lead submission stays on the existing Worker / web3forms path (sidebar).
    throw new Error('submitLead is handled by the lead form, not the data service.');
  }
}

// Future implementation — calls the Firebase Cloud Function gateway.
// Built in the API phase; swap it in below when ready.
// eslint-disable-next-line no-unused-vars
class ApiDataService {
  getProperties() {
    throw new Error('ApiDataService not implemented yet — see plan §8.');
  }

  getPropertyById() {
    // TODO: return GATED-tier fields for warm leads.
    throw new Error('ApiDataService not implemented yet — see plan §8.');
  }

  getPropertiesForTradeArea() {
    // TODO: server-enforced LIMIT 3 (hard cap).
    throw new Error('ApiDataService not implemented yet — see plan §8.');
  }

  getPublicPropertiesForTradeArea() {
    throw new Error('ApiDataService not implemented yet — see plan §8.');
  }
}

// The single wiring point. Swap to `new ApiDataService(...)` in the API phase.
export const dataService = new StaticDataService();
