// One-time (re-runnable) generator: for every property whose (city, trade area)
// is not yet a known trade area, create a MOCK trade area so the property becomes
// searchable/listable. Trade areas are appended as rows to india.csv; brand-new
// cities get a mock square border in cityBorders.js (country = India).
//
// Pins are placed at the centroid of the member properties' approxLocation, so
// mock areas land roughly where the listings actually are. Re-running only adds
// what's still missing. After running: npm run generate-data && npm run import-properties.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Papa from 'papaparse';
import { cityBorders } from '../src/data/cityBorders.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PROPS = path.join(ROOT, 'src', 'data', 'properties.json');
const INDIA_CSV = path.join(ROOT, 'data-sources', 'countries', 'india.csv');
const CITY_BORDERS = path.join(ROOT, 'src', 'data', 'cityBorders.js');

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const centroid = (list) => {
  if (!list.length) return null;
  const lat = list.reduce((s, c) => s + c[0], 0) / list.length;
  const lng = list.reduce((s, c) => s + c[1], 0) / list.length;
  return [lat, lng];
};
const csvField = (v) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const props = JSON.parse(fs.readFileSync(PROPS, 'utf8'));

// Existing trade areas (from both country CSVs) and cities (from cityBorders).
const indiaRows = Papa.parse(fs.readFileSync(INDIA_CSV, 'utf8'), { header: true, skipEmptyLines: true }).data;
const uaeRows = Papa.parse(fs.readFileSync(path.join(ROOT, 'data-sources', 'countries', 'uae.csv'), 'utf8'), { header: true, skipEmptyLines: true }).data;
const existingKey = new Set([...indiaRows, ...uaeRows].map((r) => `${norm(r.city)}|${norm(r.name)}`));
const existingIds = new Set([...indiaRows, ...uaeRows].map((r) => r.id));
const existingCities = new Set(cityBorders.features.map((f) => norm(f.properties?.name)));

// City-level coord pools (fallback placement when an area has no member coords).
const cityCoords = new Map();
for (const p of props) {
  if (p.city && Array.isArray(p.approxLocation)) {
    const k = norm(p.city);
    if (!cityCoords.has(k)) cityCoords.set(k, []);
    cityCoords.get(k).push(p.approxLocation);
  }
}

// Group unmapped properties by (city, area).
const groups = new Map();
for (const p of props) {
  if (p.tradeArea) continue;              // already maps to a real area
  const city = String(p.city || '').trim();
  const area = String(p.tradeAreaName || '').trim();
  if (!city || !area) continue;           // need both to make a trade area
  const key = `${norm(city)}|${norm(area)}`;
  if (existingKey.has(key)) continue;
  if (!groups.has(key)) groups.set(key, { city, area, coords: [] });
  if (Array.isArray(p.approxLocation)) groups.get(key).coords.push(p.approxLocation);
}

// Build CSV rows.
const newRows = [];
for (const { city, area, coords } of groups.values()) {
  const c = centroid(coords) || centroid(cityCoords.get(norm(city)) || []);
  if (!c) continue;                        // nowhere to place it
  let id = `${slug(city)}-${slug(area)}`;
  while (existingIds.has(id)) id += '-x';
  existingIds.add(id);
  newRows.push({ id, name: area, city, lat: c[0].toFixed(5), lng: c[1].toFixed(5), units: coords.length });
}

if (!newRows.length) {
  console.log('No missing trade areas to create. Nothing to do.');
  process.exit(0);
}

const HEADER = 'id,name,city,tat_tier,corridor_type,lat,lng,rent_band,avg_rent_month,est_spend_visit,anchors,live_units,brand_presence,population,age_profiling,gender_mix,rental_band_proxy,total_footfall,daypart_peak';
const rowToCsv = (r) => [
  r.id, r.name, r.city, 'TAT-2 (PBD)', 'High Street', r.lat, r.lng,
  'Mid', 'Mock — pending', 'Mock — pending', '', String(r.units), '',
  'N/A', 'Mixed', '50:50', 'Mid', 'N/A', 'Evening'
].map(csvField).join(',');

// Normalize to LF: the source CSV is CRLF; mixing LF rows in confuses the CSV
// parser (it detects CRLF and treats LF as non-breaks, merging rows).
const existingCsv = fs.readFileSync(INDIA_CSV, 'utf8').replace(/\r\n/g, '\n').replace(/\s*$/, '');
const appended = `${existingCsv}\n${newRows.map(rowToCsv).join('\n')}\n`;
fs.writeFileSync(INDIA_CSV, appended);

// Brand-new cities → mock square border (~13km box) around their centroid.
const fc = JSON.parse(JSON.stringify(cityBorders));
const newCities = [...new Set(newRows.map((r) => r.city))].filter((n) => !existingCities.has(norm(n)));
let addedCities = 0;
for (const name of newCities) {
  const c = centroid(cityCoords.get(norm(name)) || []);
  if (!c) continue;
  const [lat, lng] = c;
  const d = 0.06;
  fc.features.push({
    type: 'Feature',
    properties: { name, country: 'India', mock: true },
    geometry: { type: 'Polygon', coordinates: [[[lng - d, lat - d], [lng + d, lat - d], [lng + d, lat + d], [lng - d, lat + d], [lng - d, lat - d]]] }
  });
  addedCities++;
}
fs.writeFileSync(CITY_BORDERS, `export const cityBorders = ${JSON.stringify(fc, null, 2)};\n`);

console.log(`Created ${newRows.length} mock trade areas across ${new Set(newRows.map((r) => r.city)).size} cities.`);
console.log(`Added ${addedCities} new mock city borders.`);
console.log('Next: npm run generate-data && npm run import-properties');
if (!HEADER) { /* header kept for reference */ }
