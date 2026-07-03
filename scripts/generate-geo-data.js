
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { fileURLToPath } from 'url';

// --- Configuration ---
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_SOURCES_DIR = path.join(ROOT_DIR, 'data-sources');
const OUTPUT_FILE = path.join(ROOT_DIR, 'src', 'data', 'geoData.js');

// Helper: Read JSON
const readJSON = (filePath) => {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
};

// Helper: Read CSV
const readCSV = (filePath) => {
  const content = fs.readFileSync(filePath, 'utf-8');
  const { data } = Papa.parse(content, { header: true, skipEmptyLines: true });
  return data;
};

// --- Main Generation Logic ---
async function generate() {
  console.log('🏗️  Starting Data Generation...');

  // 1. Load Config
  const configPath = path.join(DATA_SOURCES_DIR, 'config.json');
  if (!fs.existsSync(configPath)) {
    console.error('❌ Config file not found:', configPath);
    process.exit(1);
  }
  const config = readJSON(configPath);
  console.log(`   Loaded config for ${config.countries.length} countries.`);

  // 2. Prepare Data Structures
  const tradeAreasFeatures = [];
  const tradeDataMap = {};
  const countryCenterFeatures = [];

  // 3. Process Each Country
  for (const country of config.countries) {
    const csvPath = path.join(DATA_SOURCES_DIR, 'countries', `${country.id}.csv`);
    
    // Add Country Center Pin
    countryCenterFeatures.push({
      "type": "Feature",
      "properties": { "name": country.name, "color": country.color },
      "geometry": { "type": "Point", "coordinates": country.center }
    });

    if (fs.existsSync(csvPath)) {
      console.log(`   Processing ${country.name} data from ${country.id}.csv...`);
      const rows = readCSV(csvPath);

      rows.forEach(row => {
        // Validate Lat/Lng
        const lat = parseFloat(row.lat);
        const lng = parseFloat(row.lng);
        
        if (isNaN(lat) || isNaN(lng)) {
          console.warn(`   ⚠️  Skipping ${row.name || row.id}: Invalid coordinates.`);
          return;
        }

        // Determine Pin Color based on Tier/Corridor - UPDATED TAT COLOR SCHEME
        // 🔴 Central Business District = Red #E53935
        // 🟠 Peripheral Business District = Orange #FF9800
        // 🔵 Tertiary Business District = Blue #2196F3
        // 🟣 Nightlife = Purple #9C27B0
        // ⚫ Mall = Dark #424242
        let pinColor = "#FF9800"; // Default: Orange (Peripheral Business District)
        let subCategory = "family"; // Default subCategory
        
        const corridor = (row.corridor_type || '').toLowerCase();
        const tier = row.tat_tier || '';
        
        // Priority: Nightlife/Mall subcategory first, then tier
        if (corridor.includes('nightlife') || corridor.includes('high-energy')) {
          pinColor = "#9C27B0"; // Purple for Nightlife
          subCategory = "nightlife";
        } else if (corridor.includes('mall') || corridor.includes('premium') && corridor.includes('mall')) {
          pinColor = "#424242"; // Dark for Mall
          subCategory = "mall";
        } else if (tier.includes("TAT-1")) {
          pinColor = "#E53935"; // Red for CBD
          subCategory = "highstreet";
        } else if (tier.includes("TAT-3") || tier.includes("Growth")) {
          pinColor = "#2196F3"; // Blue for TBD/Strategic
          subCategory = "strategic";
        } else if (tier.includes("TAT-2")) {
          pinColor = "#FF9800"; // Orange for PBD
          subCategory = "family";
        }
        
        // Determine suitability based on corridor
        const suitableFor = ["fb"]; // F&B is always suitable
        if (corridor.includes('fashion') || corridor.includes('high street') || subCategory === 'highstreet') {
          suitableFor.push("fashion");
        }
        if (corridor.includes('lifestyle') || subCategory === 'nightlife') {
          suitableFor.push("lifestyle");
        }
        if (corridor.includes('family') || corridor.includes('retail')) {
          suitableFor.push("electronics");
        }
        if (corridor.includes('premium') || corridor.includes('luxury')) {
          suitableFor.push("wellness");
        }
        
        // Property sizes based on tier
        const propertySizes = tier.includes("TAT-1") ? ["500-2000", "2000-5000"] : 
                             tier.includes("TAT-3") ? ["<500", "500-2000"] : 
                             ["500-2000", "2000-5000"];
        
        // Ticket range based on rent band
        const rentBand = (row.rent_band || '').toLowerCase();
        const ticketRange = rentBand.includes('premium') || rentBand.includes('high') ? "500-1000" :
                           rentBand.includes('low') ? "<200" : "200-500";
        
        // Build GeoJSON Feature with new fields
        tradeAreasFeatures.push({
          "type": "Feature",
          "properties": {
            "id": row.id,
            "name": row.name,
            "city": row.city,
            "type": row.tat_tier || row.type,
            "color": pinColor,
            "corridor": row.corridor_type,
            "subCategory": subCategory,
            "suitableFor": suitableFor,
            "propertySizes": propertySizes,
            "ticketRange": ticketRange
          },
          "geometry": {
            "type": "Point",
            "coordinates": [lng, lat]
          }
        });

        // Build Rich Data Object
        tradeDataMap[row.id] = {
          name: row.name,
          city: row.city,
          tier: row.tat_tier,
          corridor: row.corridor_type,
          type: row.tat_tier, // Legacy support
          stats: {
            rent: row.avg_rent_month || row.rent_band,
            spend: row.est_spend_visit,
            footfall: row.total_footfall || "N/A"
          },
          demographics: {
            population: row.population,
            age: row.age_profiling,
            gender: row.gender_mix,
            segment: row.rental_band_proxy
          },
          commercial: {
            anchors: row.anchors ? row.anchors.split(',').map(s => s.trim()) : [],
            units: row.live_units,
            rentBand: row.rent_band
          },
          brands: row.brand_presence ? row.brand_presence.split(',').map(s => s.trim()) : []
        };
      });
    } else {
      console.warn(`   ⚠️  No CSV found for ${country.name} (checked ${csvPath})`);
    }
  }

  // --- HARDCODED POLYGONS FOR NOW (Preserving existing data) ---
  // In a real V2, these should move to /data-sources/borders/*.geojson
  const countryPolygons = {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "properties": { "name": "India", "color": "#00732F" },
        "geometry": {
          "type": "Polygon",
          "coordinates": [[
            [68.176645, 23.694836], [68.842599, 24.266390], [71.043732, 27.995372], [73.749992, 34.322010],
            [77.837451, 35.494009], [78.912269, 34.321936], [79.208892, 33.946193], [79.530449, 32.749943],
            [79.918659, 32.480934], [80.088425, 32.919908], [80.476721, 32.617968], [80.741858, 32.303899],
            [81.028528, 30.904115], [81.111256, 30.183481], [81.525804, 30.422717], [82.061203, 30.327405],
            [82.192792, 29.913179], [82.735083, 29.654116], [83.304249, 29.362595], [83.935115, 29.320226],
            [84.228463, 28.919896], [84.675018, 28.734901], [85.118767, 28.604384], [85.251779, 28.326198],
            [85.649585, 28.244844], [86.139237, 28.020946], [86.610366, 28.088802], [87.023364, 27.938374],
            [87.227472, 27.897898], [87.669548, 27.844812], [88.060238, 27.914615], [88.174804, 27.810405],
            [88.043133, 27.445819], [88.120441, 27.876542], [88.730326, 28.086865], [88.814248, 27.299316],
            [88.835643, 27.098966], [89.744528, 26.719403], [90.373275, 26.875724], [91.217513, 26.808648],
            [92.033484, 26.838310], [92.103712, 27.452614], [91.696657, 27.771742], [92.503119, 27.896876],
            [93.413348, 28.640629], [94.566462, 29.277438], [95.404802, 29.031717], [96.248833, 29.452802],
            [96.586591, 28.830980], [96.248833, 28.411030], [97.327114, 28.261583], [97.402561, 27.882536],
            [97.051989, 27.699059], [97.133999, 27.083774], [96.419366, 27.264589], [95.124768, 26.573572],
            [95.155153, 26.001307], [94.603249, 25.162495], [94.552658, 24.675238], [94.106742, 23.850741],
            [93.325188, 24.078556], [93.286327, 23.043658], [93.060294, 22.703111], [93.166128, 22.278459],
            [92.672721, 22.041239], [92.146035, 23.627499], [91.869928, 23.624346], [91.706475, 22.985264],
            [91.158963, 23.503527], [91.46773, 24.072639], [91.915093, 24.130414], [92.376202, 24.976693],
            [86.499351, 20.151638], [85.060266, 19.478579], [83.941006, 18.30201], [83.189217, 17.671221],
            [82.192792, 17.016636], [77.539898, 7.965535], [76.592979, 8.899276], [72.820909, 19.208234],
            [72.824475, 20.419503], [68.176645, 23.694836]
          ]]
        }
      },
      {
        "type": "Feature",
        "properties": { "name": "UAE", "color": "#E40D0D" },
        "geometry": {
          "type": "Polygon",
          "coordinates": [[
            [51.579519, 24.245497], [52.577081, 24.177439], [54.008001, 24.121758], [55.439025, 25.439145],
            [56.070821, 26.055464], [56.261042, 25.714606], [56.396847, 24.924732], [55.804119, 24.269604],
            [55.525841, 23.524869], [55.234489, 23.110993], [52.000733, 23.001154], [51.579519, 24.245497]
          ]]
        }
      }
    ]
  };

  // 4. Construct File Content
  const fileContent = `// ⚡ AUTO-GENERATED BY scripts/generate-geo-data.js
// ⚠️ DO NOT EDIT MANUALLY - Update /data-sources/countries/*.csv instead

import { cityBorders } from './cityBorders.js';

export const geoData = {
  countryPolygons: ${JSON.stringify(countryPolygons, null, 2)},
  
  countries: {
    "type": "FeatureCollection",
    "features": ${JSON.stringify(countryCenterFeatures, null, 2)}
  },

  cities: cityBorders,

  tradeAreas: {
    "type": "FeatureCollection", 
    "features": ${JSON.stringify(tradeAreasFeatures, null, 2)}
  }
};

export const tradeData = ${JSON.stringify(tradeDataMap, null, 2)};
`;

  // 5. Write File
  fs.writeFileSync(OUTPUT_FILE, fileContent);
  console.log(`✅ Generated ${OUTPUT_FILE} with ${tradeAreasFeatures.length} trade areas.`);
}

generate();
