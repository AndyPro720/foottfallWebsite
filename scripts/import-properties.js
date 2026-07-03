import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { resolveTradeArea } from '../src/data/tradeAreaMap.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_FILE = path.join(ROOT_DIR, 'src', 'data', 'properties.json');
const MOCK_PROPERTIES_FILE = path.join(ROOT_DIR, 'data-sources', 'mock-properties.json');

// The backend Cloud Function (foottfallBackend) exports a field-sanitized
// artifact to public Firebase Storage. This build step fetches it and bakes it
// into the bundle — no credentials (the file is public), and cost is decoupled
// from website traffic. See .planning/phases/08-data-sync-architecture.
//
// The exact bucket suffix (.appspot.com vs .firebasestorage.app) can differ per
// project, so the URL is overridable via env. Set PUBLIC_LISTINGS_URL in the
// Cloudflare Pages build environment to the confirmed URL.
const PUBLIC_LISTINGS_URL =
  process.env.PUBLIC_LISTINGS_URL ||
  'https://firebasestorage.googleapis.com/v0/b/footfall-inventory.firebasestorage.app/o/exports%2Fpublic-listings.json?alt=media&token=f6b3f87d-d27c-423f-b9f3-eec071475528';

// Defense-in-depth allowlist: even if the upstream artifact regresses or the
// mock fallback carries extra fields, only these PUBLIC-tier keys are ever
// written into the shipped bundle. This mirrors toPublicListing() in the
// backend export function — keep the two in sync.
const PUBLIC_FIELDS = [
  'id',
  'name',
  'buildingType',
  'size',
  'sizeLabel',
  'floor',
  'suitableFor',
  'tradeArea',
  'tradeAreaName',
  'city',
  'status',
  'price',
  'priceLabel',
  'parking',
  'outsideSpace',
  'serviceEntry',
  'liftAccess',
  'bohSpace',
  'fireExit',
  'vicinityBrands',
  'mainImage',
  'approxLocation'
];

function pickPublic(property) {
  const clean = {};
  for (const key of PUBLIC_FIELDS) {
    if (property[key] !== undefined) clean[key] = property[key];
  }
  return clean;
}

// Reconcile the backend's free-text trade area onto a canonical geoData area
// the map can render. Keeps the raw label in tradeAreaName when unresolved so
// diagnostics/counts still work; tradeArea stays null so the site hides it.
function applyTradeArea(property) {
  const rawName = property.tradeAreaName || property.tradeArea;
  const resolved = resolveTradeArea(property.city, rawName);
  return {
    ...property,
    tradeArea: resolved.id,
    tradeAreaName: resolved.name,
    city: resolved.city
  };
}

function normalizeProperties(payload) {
  // Accept either the export wrapper { properties: [...] } or a bare array.
  const list = Array.isArray(payload) ? payload : payload?.properties;
  if (!Array.isArray(list)) {
    throw new Error('Fetched payload did not contain a properties array.');
  }
  return list.map(pickPublic).map(applyTradeArea);
}

function loadMockProperties() {
  if (!fs.existsSync(MOCK_PROPERTIES_FILE)) return [];
  const parsed = JSON.parse(fs.readFileSync(MOCK_PROPERTIES_FILE, 'utf8'));
  if (!Array.isArray(parsed)) {
    throw new Error(`Mock property file must contain an array: ${MOCK_PROPERTIES_FILE}`);
  }
  return parsed;
}

async function fetchPublicListings() {
  const response = await fetch(PUBLIC_LISTINGS_URL, { redirect: 'follow' });
  if (!response.ok) {
    throw new Error(`Fetch failed with HTTP ${response.status}`);
  }
  return response.json();
}

async function importProperties() {
  let properties = [];
  let source = '';

  try {
    console.log(`Fetching public listings from ${PUBLIC_LISTINGS_URL} ...`);
    const payload = await fetchPublicListings();
    properties = normalizeProperties(payload);
    source = 'remote export';
  } catch (error) {
    console.warn(`⚠️  Could not fetch public listings: ${error.message}`);
    console.warn('   Falling back to mock properties for this build.');
    properties = normalizeProperties(loadMockProperties());
    source = 'mock fallback';
  }

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, `${JSON.stringify(properties, null, 2)}\n`);

  const mappedCount = properties.filter((property) => property.tradeArea).length;
  console.log(`Imported ${properties.length} properties (${source}).`);
  console.log(`Mapped ${mappedCount}/${properties.length} properties to trade areas.`);
  console.log(`Wrote ${OUTPUT_FILE}`);
}

importProperties().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
