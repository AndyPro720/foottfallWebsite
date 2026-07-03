const fs = require('fs');
const path = require('path');

// Configuration: List of cities and their colors
const cityConfig = [
    { name: 'pune', color: '#00E5FF', country: 'India' },
    { name: 'mumbai', color: '#FF007F', country: 'India' },
    { name: 'dubai', color: '#00D26A', country: 'UAE' }
];

async function main() {
  try {
    console.log("Starting Data Preparation...");
    
    // Resolve paths relative to this script (scripts/prepare_data.cjs)
    const dataDir = path.join(__dirname, '../src/data');
    console.log(`Reading GeoJSON files from: ${dataDir}`);
    
    const features = [];

    for (const city of cityConfig) {
        const filePath = path.join(dataDir, `${city.name}.geojson`);
        
        if (fs.existsSync(filePath)) {
            console.log(`Processing ${city.name}.geojson...`);
            const raw = fs.readFileSync(filePath, 'utf8');
            let json = JSON.parse(raw);
            
            // Normalize: Feature vs FeatureCollection
            let feature = json.type === 'FeatureCollection' ? json.features[0] : json;
            
            // Enhance properties
            feature.properties = {
                ...feature.properties,
                name: city.name.charAt(0).toUpperCase() + city.name.slice(1), // Capitalize
                country: city.country,
                color: city.color
            };
            
            features.push(feature);
        } else {
            console.warn(`Warning: File not found for ${city.name} at ${filePath}`);
        }
    }

    const cityCollection = {
      type: "FeatureCollection",
      features: features
    };

    const outputFile = path.join(dataDir, 'cityBorders.js');
    const fileContent = `export const cityBorders = ${JSON.stringify(cityCollection, null, 2)};\n`;
    
    fs.writeFileSync(outputFile, fileContent);
    console.log(`Success! Generated src/data/cityBorders.js with ${features.length} cities.`);
    
  } catch (error) {
    console.error("Error creating cityBorders:", error);
    process.exit(1);
  }
}

main();
