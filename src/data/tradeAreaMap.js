import { geoData } from './geoData.js';

// ─── Trade-area reconciliation ───
// Maps the backend's free-text (city, tradeArea) onto the canonical geoData
// trade areas the map can actually render. The base index is DERIVED from
// geoData, so every existing area's exact name matches automatically and adding
// a new geoData area extends the mapping for free — you only hand-maintain the
// synonym table below for names that differ from the geoData label.
//
// Anything that doesn't resolve keeps tradeArea = null (the site hides it) until
// either a synonym is added (covered city, different name) or a new geoData area
// is created (covered city, no polygon yet) or the city is onboarded (new city).

function norm(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

const areas = geoData.tradeAreas.features.map((f) => f.properties);

const byCityName = new Map(); // `${city}|${name}` -> area
const byId = new Map(); // id -> area
const globalName = new Map(); // name -> Set(ids) — for city-less unambiguous matches
for (const a of areas) {
  byCityName.set(`${norm(a.city)}|${norm(a.name)}`, a);
  byId.set(a.id, a);
  const set = globalName.get(norm(a.name)) || new Set();
  set.add(a.id);
  globalName.set(norm(a.name), set);
}

// Raw backend name (normalized) → canonical geoData name (normalized), per city.
// Only needed when the agent's label differs from the geoData label.
const SYNONYMS = {
  // Pune areas are each their own trade area — no synonym folding (Balewadi,
  // Bavdhan, Amanora, Wagholi, Nigdi, Pimpri Chinchwad, Ganeshkhind Road are
  // distinct areas, created individually in the CSV, not aliased to others).
  mumbai: {
    bandra: 'bandrawest',
    andheri: 'andheriwest',
    malad: 'maladwest',
    thane: 'thanewest'
  },
  dubai: {
    downtown: 'downtowndubai',
    marina: 'dubaimarina',
    palm: 'palmjumeirah',
    barsha: 'albarsha',
    jumeirahlaketowers: 'jlt'
  }
};

/**
 * Resolve raw (city, name) to a canonical trade area.
 * @returns {{ id: string|null, name: string, city: string|null }}
 */
export function resolveTradeArea(rawCity, rawName) {
  const nc = norm(rawCity);
  const nn = norm(rawName);
  const fallback = { id: null, name: String(rawName || '').trim(), city: rawCity || null };

  if (!nn) return fallback;

  // City-scoped: exact geoData name, then a known synonym.
  if (nc) {
    const candidates = [nn, SYNONYMS[nc] && SYNONYMS[nc][nn]].filter(Boolean);
    for (const cand of candidates) {
      const area = byCityName.get(`${nc}|${cand}`);
      if (area) return { id: area.id, name: area.name, city: area.city };
    }
    return fallback; // covered-city-miss or uncovered city → stays unmapped
  }

  // No city given: only map when the name is globally unambiguous.
  const ids = globalName.get(nn);
  if (ids && ids.size === 1) {
    const area = byId.get([...ids][0]);
    return { id: area.id, name: area.name, city: area.city };
  }

  return fallback;
}
