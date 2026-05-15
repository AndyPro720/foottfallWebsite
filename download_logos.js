import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import google from 'googlethis';

const brands = [
  "Barbeque Nation", "Toscano", "Salt", "ABs", "Nando’s", "Tandooriya", 
  "Bread Pocket Co", "Bikanerwala", "Wow Momos", "Anna", "Antonia", 
  "Pizza Di Rocco", "Al Safadi", "Social Distrikt", "Jardin Hotels", 
  "Bloom Room", "Filli cafe", "D11", "Marassi", "Dana", "oasis", 
  "blvd 1890", "Red Sea", "Cenomi", "Jeddah vibes", "Sharjah Sentral", 
  "sharooq", "al Ganda mall", "lulu malls", "MAF", "silicon sentral", 
  "Dalma", "reem", "Abu Dhabi mall", "City Centre Doha", "Nayati", 
  "14 entrar", "LVL 5", "Amanora", "phoenix", "HCL Surat", 
  "High street Apollo", "jivana", "Vegas mall", "DLF", "Inorbit", 
  "Korum", "BIPL", "express avenue", "forum kochi", "db mall"
];

const outDir = path.join(process.cwd(), 'public', 'assets', 'brands');

async function downloadImage(url, filepath) {
  try {
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'arraybuffer',
      timeout: 10000
    });
    const buffer = Buffer.from(response.data, 'binary');
    await fs.writeFile(filepath, buffer);
    return true;
  } catch (error) {
    console.error(`Failed to download ${url}: ${error.message}`);
    return false;
  }
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  
  const htmlParts = [];
  
  for (const brand of brands) {
    console.log(`Searching logo for: ${brand}`);
    try {
      const images = await google.image(`${brand} logo transparent`, { safe: false });
      
      let downloaded = false;
      let ext = '.png';
      
      for (const img of images.slice(0, 3)) {
        if (img.url.toLowerCase().endsWith('.jpg') || img.url.toLowerCase().endsWith('.jpeg')) ext = '.jpg';
        else if (img.url.toLowerCase().endsWith('.svg')) ext = '.svg';
        else if (img.url.toLowerCase().endsWith('.webp')) ext = '.webp';
        else ext = '.png';
        
        const filename = brand.replace(/[^a-z0-9]/gi, '_').toLowerCase() + ext;
        const filepath = path.join(outDir, filename);
        
        if (await downloadImage(img.url, filepath)) {
          console.log(`Downloaded ${filename}`);
          htmlParts.push(`                <article class="brands__item brands__item--logo">\n                  <img\n                    src="/assets/brands/${filename}"\n                    alt="${brand}"\n                    class="brands__logo"\n                    loading="lazy"\n                  />\n                </article>`);
          downloaded = true;
          break;
        }
      }
      
      if (!downloaded) {
        console.log(`Could not download image for ${brand}, fallback to text.`);
        htmlParts.push(`                <article class="brands__item brands__item--text"><span class="brands__label">${brand}</span></article>`);
      }
      
      // Sleep a bit to avoid rate limiting
      await new Promise(r => setTimeout(r, 1000));
      
    } catch (e) {
      console.error(`Error processing ${brand}: ${e.message}`);
      htmlParts.push(`                <article class="brands__item brands__item--text"><span class="brands__label">${brand}</span></article>`);
    }
  }
  
  await fs.writeFile('brands_html.txt', htmlParts.join('\n'));
  console.log('Done! Generated brands_html.txt');
}

main();
