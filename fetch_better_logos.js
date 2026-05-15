import google from 'googlethis';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { BRAND_LOGOS, sanitizeBrandName } from './scripts/brand-manifest.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const brandQueries = BRAND_LOGOS.filter((brand) => brand.query).map((brand) => ({
  name: brand.name,
  query: brand.query,
  assetKey: brand.assetKey ?? sanitizeBrandName(brand.name),
}));

const outputDir = path.join(__dirname, 'public', 'assets', 'brands');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function downloadLogo(brand, query, assetKey) {
  const options = {
    page: 0, 
    safe: false, 
    additional_params: { hl: 'en' }
  };
  
  try {
    const images = await google.image(query, options);
    // Find the first good image (png or webp preferred for transparency)
    const goodImage = images.find(img => img.url.endsWith('.png') || img.url.endsWith('.svg') || img.url.endsWith('.webp')) || images[0];
    
    if (!goodImage) {
      console.log(`No image found for ${brand}`);
      return false;
    }
    
    let ext = '.jpg';
    if (goodImage.url.includes('.png')) ext = '.png';
    else if (goodImage.url.includes('.svg')) ext = '.svg';
    else if (goodImage.url.includes('.webp')) ext = '.webp';
    
    const filename = assetKey + ext;
    const filepath = path.join(outputDir, filename);
    
    const response = await axios({
      method: 'GET',
      url: goodImage.url,
      responseType: 'stream',
      timeout: 10000
    });
    
    const writer = fs.createWriteStream(filepath);
    response.data.pipe(writer);
    
    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve(true));
      writer.on('error', reject);
    });
  } catch (error) {
    console.error(`Failed for ${brand}: ${error.message}`);
    return false;
  }
}

async function main() {
  for (const brand of brandQueries) {
    console.log(`Downloading ${brand.name}...`);
    await downloadLogo(brand.name, brand.query, brand.assetKey);
    // Wait 1.5 seconds between requests to avoid rate limits
    await new Promise(r => setTimeout(r, 1500));
  }
  console.log("Done updating logos.");
}

main();
