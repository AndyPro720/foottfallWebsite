import axios from 'axios';
import google from 'googlethis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { BRAND_LOGOS, sanitizeBrandName } from './brand-manifest.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const outputDir = path.join(projectRoot, 'public', 'assets', 'brands');

const TARGET_BRANDS = new Set([
  'Toscano',
  'Salt',
  'Tandooriya',
  'Bread Pocket Co',
  'Bikanerwala',
  'Wow Momos',
  'Antonia',
  'Pizza Di Rocco',
  'Al Safadi',
  'Social Distrikt',
  'Bloom Room',
  'Filli cafe',
  'D11',
  'Marassi',
  'Dana',
  'Red Sea',
  'Cenomi',
  'Sharjah Sentral',
  'sharooq',
  'al Ganda mall',
  'silicon sentral',
  'City Centre Doha',
  'Nayati',
  '14 entrar',
  'phoenix',
  'HCL Surat',
  'High street Apollo',
  'Inorbit',
  'Korum',
  'BIPL',
  'express avenue',
  'forum kochi',
  'db mall',
  'Vegas mall',
]);

function scoreImage(url) {
  const normalized = url.toLowerCase();
  let score = 0;

  if (normalized.includes('.svg')) score += 35;
  if (normalized.includes('.png')) score += 28;
  if (normalized.includes('.webp')) score += 18;
  if (normalized.includes('.jpg') || normalized.includes('.jpeg')) score += 8;
  if (normalized.includes('logo')) score += 18;
  if (normalized.includes('brand')) score += 8;
  if (normalized.includes('transparent')) score += 8;
  if (normalized.includes('icon') || normalized.includes('favicon')) score -= 30;
  if (normalized.includes('thumb') || normalized.includes('thumbnail')) score -= 10;
  if (normalized.includes('small')) score -= 5;

  return score;
}

function extensionFromResponse(url, contentType = '') {
  if (contentType.includes('image/svg+xml') || url.includes('.svg')) return '.svg';
  if (contentType.includes('image/png') || url.includes('.png')) return '.png';
  if (contentType.includes('image/webp') || url.includes('.webp')) return '.webp';
  if (contentType.includes('image/jpeg') || url.includes('.jpg') || url.includes('.jpeg')) return '.jpg';
  return '.png';
}

async function tryDownloadCandidate(url) {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 15000,
    validateStatus: () => true,
  });

  const contentType = String(response.headers['content-type'] ?? '');
  if (response.status >= 400 || !contentType.startsWith('image/')) {
    return null;
  }

  const buffer = Buffer.from(response.data);
  const ext = extensionFromResponse(url.toLowerCase(), contentType.toLowerCase());
  const isTinyRaster = ext !== '.svg' && buffer.length < 2500;
  if (isTinyRaster) {
    return null;
  }

  return { buffer, ext, size: buffer.length };
}

async function refetchBrand(brand) {
  const assetKey = brand.assetKey ?? sanitizeBrandName(brand.name);
  const results = await google.image(brand.query, {
    page: 0,
    safe: false,
    additional_params: { hl: 'en' },
  });

  const candidates = results
    .map((image) => image.url)
    .filter(Boolean)
    .sort((left, right) => scoreImage(right) - scoreImage(left))
    .slice(0, 8);

  for (const url of candidates) {
    try {
      const image = await tryDownloadCandidate(url);
      if (!image) {
        continue;
      }

      const fileName = `${assetKey}_refetch${image.ext}`;
      const outputFile = path.join(outputDir, fileName);
      fs.writeFileSync(outputFile, image.buffer);
      return { brand: brand.name, fileName, size: image.size, url };
    } catch {
      // Try the next candidate.
    }
  }

  return null;
}

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });

  for (const brand of BRAND_LOGOS) {
    if (!brand.query || !TARGET_BRANDS.has(brand.name)) {
      continue;
    }

    console.log(`Re-fetching ${brand.name}...`);
    const result = await refetchBrand(brand);
    if (result) {
      console.log(`Saved ${result.fileName} (${result.size} bytes)`);
    } else {
      console.log(`No replacement saved for ${brand.name}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 1250));
  }

  console.log('Done saving refetch candidates.');
}

main();
