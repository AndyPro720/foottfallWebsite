import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { BRAND_DOMAINS, BRAND_LOGOS, sanitizeBrandName } from './brand-manifest.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const outputDir = path.join(projectRoot, 'public', 'assets', 'brands');
const OVERRIDE_BRANDS = new Set([
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
  'Marassi',
  'Dana',
  'blvd 1890',
  'Red Sea',
  'Cenomi',
  'Sharjah Sentral',
  'sharooq',
  'al Ganda mall',
  'silicon sentral',
  'Abu Dhabi mall',
  'City Centre Doha',
  'Nayati',
  '14 entrar',
  'Amanora',
  'phoenix',
  'HCL Surat',
  'High street Apollo',
  'Vegas mall',
  'DLF',
  'Inorbit',
  'Korum',
  'BIPL',
  'express avenue',
  'forum kochi',
  'db mall',
]);

function extensionFromContentType(contentType = '') {
  if (contentType.includes('image/svg+xml')) {
    return '.svg';
  }

  if (contentType.includes('image/webp')) {
    return '.webp';
  }

  if (contentType.includes('image/jpeg')) {
    return '.jpg';
  }

  return '.png';
}

async function requestImage(url) {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 15000,
    validateStatus: () => true,
  });

  const contentType = String(response.headers['content-type'] ?? '');
  if (response.status !== 200 || !contentType.startsWith('image/')) {
    return null;
  }

  return {
    data: Buffer.from(response.data),
    extension: extensionFromContentType(contentType),
  };
}

async function downloadDomainLogo(brand) {
  const domainUrl = BRAND_DOMAINS[brand.name];

  if (!domainUrl) {
    return { brand: brand.name, status: 'skipped', reason: 'missing-domain' };
  }

  const hostname = new URL(domainUrl).hostname.replace(/^www\./, '');
  const assetKey = brand.assetKey ?? sanitizeBrandName(brand.name);
  const candidates = [
    {
      label: 'clearbit',
      url: `https://logo.clearbit.com/${hostname}?size=512`,
    },
    {
      label: 'google-favicon',
      url: `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(domainUrl)}&sz=256`,
    },
  ];

  try {
    for (const candidate of candidates) {
      try {
        const image = await requestImage(candidate.url);
        if (!image) {
          continue;
        }

        const outputFile = path.join(outputDir, `${assetKey}${image.extension}`);
        fs.writeFileSync(outputFile, image.data);

        return {
          brand: brand.name,
          status: 'downloaded',
          file: path.basename(outputFile),
          source: candidate.label,
        };
      } catch (error) {
        if (candidate === candidates[candidates.length - 1]) {
          throw error;
        }
      }
    }

    return {
      brand: brand.name,
      status: 'failed',
      reason: 'no-image-response',
    };
  } catch (error) {
    return {
      brand: brand.name,
      status: 'failed',
      reason: error.message,
    };
  }
}

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });

  const results = [];
  for (const brand of BRAND_LOGOS) {
    if (brand.assetSrc) {
      results.push({ brand: brand.name, status: 'skipped', reason: 'manual-asset' });
      continue;
    }

    if (!OVERRIDE_BRANDS.has(brand.name)) {
      results.push({ brand: brand.name, status: 'skipped', reason: 'kept-existing' });
      continue;
    }

    console.log(`Fetching domain logo for ${brand.name}...`);
    results.push(await downloadDomainLogo(brand));
    await new Promise((resolve) => setTimeout(resolve, 350));
  }

  const downloaded = results.filter((result) => result.status === 'downloaded');
  const failed = results.filter((result) => result.status === 'failed');

  console.log(`Downloaded ${downloaded.length} domain logos.`);
  if (failed.length > 0) {
    console.warn(
      `Failed for ${failed.length} brands: ${failed
        .map((result) => `${result.brand} (${result.reason})`)
        .join(', ')}`,
    );
  }
}

main();
