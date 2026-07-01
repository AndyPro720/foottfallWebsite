import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const INVENTORY_FILE = 'C:/Users/angaj/repos/foottfallBackend/Inventory for app (1).xlsx';
const OUTPUT_FILE = path.join(ROOT_DIR, 'src', 'data', 'properties.json');
const MOCK_PROPERTIES_FILE = path.join(ROOT_DIR, 'data-sources', 'mock-properties.json');

const TRADE_AREA_RULES = [
  { match: ['baner road, kapil malhar', 'baner road, fab india', 'ganraj chowk', 'baner road', 'balewadi'], id: 'pune-ban', name: 'Baner', city: 'Pune' },
  { match: ['opposite westend mall', 'aundh', 'ganeshkhind road'], id: 'pune-au', name: 'Aundh', city: 'Pune' },
  { match: ['kothrud', 'paud rd'], id: 'pune-kt', name: 'Kothrud', city: 'Pune' },
  { match: ['hadapsar', 'amanora'], id: 'pune-hd', name: 'Hadapsar', city: 'Pune' },
  { match: ['viman nagar', 'airport rd'], id: 'pune-vn', name: 'Viman Nagar', city: 'Pune' },
  { match: ['kharadi', 'wagholi', 'nagar road'], id: 'pune-kh', name: 'Kharadi', city: 'Pune' },
  { match: ['pimpri-chinchwad', 'old mumbai pune highway', 'nigdi', 'moshi'], id: 'pune-mos', name: 'Moshi', city: 'Pune' },
  { match: ['satara road', 'katraj', 'fc road', 'yana'], id: 'pune-cp', name: 'Camp', city: 'Pune' },
  { match: ['bavdhan'], id: 'pune-kt', name: 'Kothrud', city: 'Pune' },
  { match: ['wakad'], id: 'pune-wak', name: 'Wakad', city: 'Pune' },
  { match: ['manjari'], id: 'pune-mn', name: 'Manjari', city: 'Pune' },
  { match: ['koregaon'], id: 'pune-kp', name: 'Koregaon Park', city: 'Pune' },
  { match: ['kalyani'], id: 'pune-kn', name: 'Kalyani Nagar', city: 'Pune' }
];

function cleanText(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\s+/g, ' ').trim();
}

function normalizeKey(value) {
  return cleanText(value).toLowerCase();
}

function parseFirstNumber(value) {
  const cleaned = cleanText(value).replace(/,/g, '');
  const match = cleaned.match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function parseSuitableFor(value) {
  const raw = normalizeKey(value);
  if (!raw || raw === 'na') return [];
  if (raw === 'all') return ['fb', 'retail', 'fashion', 'wellness', 'lifestyle'];

  const categories = new Set();
  if (raw.includes('fnb') || raw.includes('f&b')) categories.add('fb');
  if (!raw.includes('not fnb') && !raw.includes('not for fnb') && raw.includes('food')) categories.add('fb');
  if (raw.includes('bank')) categories.add('retail');
  if (raw.includes('showroom')) categories.add('retail');
  if (raw.includes('retail')) categories.add('retail');
  if (raw.includes('fashion')) categories.add('fashion');
  if (raw.includes('wellness')) categories.add('wellness');
  if (raw.includes('lifestyle')) categories.add('lifestyle');
  if (raw.includes('not fnb') || raw.includes('not for fnb')) categories.add('retail');

  return Array.from(categories);
}

function mapTradeArea(value) {
  const key = normalizeKey(value);
  const rule = TRADE_AREA_RULES.find((entry) => entry.match.some((needle) => key.includes(needle)));

  return rule || {
    id: null,
    name: cleanText(value),
    city: null
  };
}

function getHyperlink(sheet, rowIndex, colIndex, fallback) {
  const address = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
  const cell = sheet[address];
  return cleanText(cell?.l?.Target || fallback);
}

function loadMockProperties() {
  if (!fs.existsSync(MOCK_PROPERTIES_FILE)) return [];
  const parsed = JSON.parse(fs.readFileSync(MOCK_PROPERTIES_FILE, 'utf8'));
  if (!Array.isArray(parsed)) {
    throw new Error(`Mock property file must contain an array: ${MOCK_PROPERTIES_FILE}`);
  }
  return parsed;
}

function loadRows(workbook, sheet) {
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: false,
    blankrows: false,
    defval: null
  });

  const headerIndex = rows.findIndex((row) => cleanText(row[0]) === 'Property Name' && cleanText(row[1]) === 'Property Status');
  if (headerIndex === -1) {
    throw new Error('Could not find the property inventory header row.');
  }

  return { rows, headerIndex };
}

function importProperties() {
  let properties = [];
  let excelCount = 0;
  let hasExcel = false;
  let sheetName = '';

  if (!fs.existsSync(INVENTORY_FILE)) {
    console.warn(`⚠️  Inventory spreadsheet not found at: ${INVENTORY_FILE}`);
    console.warn(`   Falling back to mock properties only.`);
  } else {
    hasExcel = true;
    const workbook = XLSX.readFile(INVENTORY_FILE, { cellDates: false });
    sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const { rows, headerIndex } = loadRows(workbook, sheet);

    properties = rows
      .map((row, rowIndex) => ({ row, rowIndex }))
      .slice(headerIndex + 1)
      .filter(({ row }) => normalizeKey(row[1]) === 'available')
      .map(({ row, rowIndex }) => {
        const tradeArea = mapTradeArea(row[11]);
        const size = parseFirstNumber(row[6]);
        const price = parseFirstNumber(row[17]);

        return {
          name: cleanText(row[0]),
          status: cleanText(row[1]),
          buildingType: cleanText(row[5]),
          size,
          sizeLabel: cleanText(row[6]),
          floor: cleanText(row[7]),
          locationLink: getHyperlink(sheet, rowIndex, 9, row[9]),
          address: cleanText(row[10]),
          sourceTradeArea: cleanText(row[11]),
          tradeArea: tradeArea.id,
          tradeAreaName: tradeArea.name,
          city: tradeArea.city,
          suitableFor: parseSuitableFor(row[12]),
          price,
          priceLabel: cleanText(row[17]),
          note: cleanText(row[34])
        };
      })
      .filter((property) => property.name && property.name.toLowerCase() !== 'na');
    excelCount = properties.length;
  }

  const mockProperties = loadMockProperties();
  properties = [...properties, ...mockProperties];

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, `${JSON.stringify(properties, null, 2)}\n`);

  const mappedCount = properties.filter((property) => property.tradeArea).length;
  if (hasExcel) {
    console.log(`Imported ${excelCount} available properties from ${sheetName}.`);
  }
  if (mockProperties.length) console.log(`Appended ${mockProperties.length} mock properties from ${path.relative(ROOT_DIR, MOCK_PROPERTIES_FILE)}.`);
  console.log(`Mapped ${mappedCount}/${properties.length} properties to trade areas.`);
  console.log(`Wrote ${OUTPUT_FILE}`);
}

try {
  importProperties();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
