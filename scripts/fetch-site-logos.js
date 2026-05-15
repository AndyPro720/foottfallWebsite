import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { BRAND_DOMAINS, BRAND_LOGOS, sanitizeBrandName } from './brand-manifest.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const outputDir = path.join(projectRoot, 'public', 'assets', 'brands');
const SITE_SCRAPE_BRANDS = new Set([
  'Salt',
  'Tandooriya',
  'Antonia',
  'Al Safadi',
  'Bloom Room',
  'Marassi',
  'Dana',
  'blvd 1890',
  'al Ganda mall',
  'silicon sentral',
  'City Centre Doha',
  '14 entrar',
  'HCL Surat',
  'Korum',
  'BIPL',
  'express avenue',
  'forum kochi',
  'db mall',
]);

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36';

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

  if (contentType.includes('image/png')) {
    return '.png';
  }

  return '';
}

function scoreCandidate(url, context = '') {
  const text = `${url} ${context}`.toLowerCase();
  let score = 0;

  if (text.includes('logo')) score += 50;
  if (text.includes('brand')) score += 18;
  if (text.includes('header')) score += 8;
  if (text.includes('navbar')) score += 8;
  if (text.includes('site-logo')) score += 14;
  if (text.endsWith('.svg')) score += 25;
  if (text.endsWith('.png')) score += 16;
  if (text.includes('icon') || text.includes('favicon') || text.includes('apple-touch')) score -= 35;
  if (text.includes('banner') || text.includes('hero') || text.includes('slide') || text.includes('cover')) score -= 25;
  if (text.includes('loader') || text.includes('spinner')) score -= 25;

  return score;
}

function extractCandidates(html, baseUrl) {
  const candidates = new Map();

  const imgRegex = /<(img|source)[^>]+(?:src|data-src|data-lazy-src|srcset)=["']([^"'#?]+[^"']*)["'][^>]*>/gi;
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    const tagHtml = match[0];
    const rawSource = match[2].split(/\s+/)[0];

    try {
      const absoluteUrl = new URL(rawSource, baseUrl).href;
      if (!/\.(svg|png|webp|jpe?g)(?:$|\?)/i.test(absoluteUrl)) {
        continue;
      }

      const score = scoreCandidate(absoluteUrl, tagHtml);
      const existing = candidates.get(absoluteUrl);
      if (!existing || score > existing.score) {
        candidates.set(absoluteUrl, { url: absoluteUrl, score });
      }
    } catch {
      // Ignore invalid URLs.
    }
  }

  return [...candidates.values()].sort((left, right) => right.score - left.score);
}

async function fetchHtml(url) {
  const response = await axios.get(url, {
    timeout: 20000,
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    validateStatus: () => true,
  });

  if (response.status >= 400 || typeof response.data !== 'string') {
    return null;
  }

  return response.data;
}

async function downloadImage(url) {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 20000,
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      Referer: url,
    },
    validateStatus: () => true,
  });

  const contentType = String(response.headers['content-type'] ?? '');
  if (response.status >= 400 || !contentType.startsWith('image/')) {
    return null;
  }

  return {
    buffer: Buffer.from(response.data),
    extension: extensionFromContentType(contentType) || path.extname(new URL(url).pathname) || '.png',
  };
}

async function scrapeLogoForBrand(brand) {
  const domainUrl = BRAND_DOMAINS[brand.name];
  if (!domainUrl) {
    return { brand: brand.name, status: 'skipped', reason: 'missing-domain' };
  }

  try {
    const html = await fetchHtml(domainUrl);
    if (!html) {
      return { brand: brand.name, status: 'failed', reason: 'html-unavailable' };
    }

    const candidates = extractCandidates(html, domainUrl).slice(0, 8);
    for (const candidate of candidates) {
      const image = await downloadImage(candidate.url);
      if (!image) {
        continue;
      }

      const assetKey = brand.assetKey ?? sanitizeBrandName(brand.name);
      const outputFile = path.join(outputDir, `${assetKey}${image.extension}`);
      fs.writeFileSync(outputFile, image.buffer);

      return {
        brand: brand.name,
        status: 'downloaded',
        file: path.basename(outputFile),
        source: candidate.url,
      };
    }

    return { brand: brand.name, status: 'failed', reason: 'no-logo-candidate' };
  } catch (error) {
    return { brand: brand.name, status: 'failed', reason: error.message };
  }
}

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });

  const results = [];
  for (const brand of BRAND_LOGOS) {
    if (!SITE_SCRAPE_BRANDS.has(brand.name)) {
      continue;
    }

    console.log(`Scraping official site logo for ${brand.name}...`);
    results.push(await scrapeLogoForBrand(brand));
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  const downloaded = results.filter((result) => result.status === 'downloaded');
  const failed = results.filter((result) => result.status === 'failed');

  console.log(`Downloaded ${downloaded.length} logos from official sites.`);
  if (failed.length > 0) {
    console.warn(
      `Still failed for ${failed.length} brands: ${failed
        .map((result) => `${result.brand} (${result.reason})`)
        .join(', ')}`,
    );
  }
}

main();
