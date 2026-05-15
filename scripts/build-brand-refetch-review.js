import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { BRAND_LOGOS, sanitizeBrandName } from './brand-manifest.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const brandAssetDir = path.join(projectRoot, 'public', 'assets', 'brands');
const outputFile = path.join(projectRoot, 'public', 'brand-refetch-review.html');

const REVIEW_BRANDS = new Set([
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

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => {
    const replacements = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };

    return replacements[char];
  });
}

function getCurrentAsset(assetKey) {
  const candidates = fs
    .readdirSync(brandAssetDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.startsWith(`${assetKey}.`))
    .sort((left, right) => left.name.localeCompare(right.name));

  return candidates[0]?.name ?? '';
}

function getRefetchAsset(assetKey) {
  const candidates = fs
    .readdirSync(brandAssetDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.startsWith(`${assetKey}_refetch.`))
    .sort((left, right) => left.name.localeCompare(right.name));

  return candidates[0]?.name ?? '';
}

function renderImage(fileName, altText) {
  if (!fileName) {
    return '<div class="review-slot__missing">No image</div>';
  }

  return `<img src="./assets/brands/${escapeHtml(fileName)}" alt="${escapeHtml(altText)}" class="review-slot__image" loading="lazy" />`;
}

const cards = BRAND_LOGOS.filter((brand) => REVIEW_BRANDS.has(brand.name)).map((brand) => {
  const assetKey = brand.assetKey ?? sanitizeBrandName(brand.name);
  const currentFile = getCurrentAsset(assetKey);
  const refetchFile = getRefetchAsset(assetKey);

  return `      <article class="review-card">
        <h2>${escapeHtml(brand.name)}</h2>
        <div class="review-card__grid">
          <section class="review-slot">
            <p class="review-slot__label">Current</p>
            <div class="review-slot__frame">
              ${renderImage(currentFile, `${brand.name} current`)}
            </div>
            <p class="review-slot__file">${escapeHtml(currentFile || 'No current file')}</p>
          </section>
          <section class="review-slot">
            <p class="review-slot__label">Re-fetch</p>
            <div class="review-slot__frame">
              ${renderImage(refetchFile, `${brand.name} refetch`)}
            </div>
            <p class="review-slot__file">${escapeHtml(refetchFile || 'No refetch file')}</p>
          </section>
        </div>
      </article>`;
}).join('\n');

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Brand Re-fetch Review</title>
    <style>
      :root {
        --bg: #f5f1ea;
        --card: rgba(255,255,255,0.92);
        --stroke: rgba(28, 40, 36, 0.12);
        --text: #20302b;
        --muted: #66756f;
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        font-family: Georgia, 'Times New Roman', serif;
        background: linear-gradient(180deg, #faf6ef 0%, var(--bg) 100%);
        color: var(--text);
      }

      main {
        width: min(1600px, calc(100% - 40px));
        margin: 0 auto;
        padding: 28px 0 36px;
      }

      h1 {
        margin: 0 0 6px;
        font-size: 2.2rem;
      }

      p.lead {
        margin: 0 0 24px;
        color: var(--muted);
      }

      .review-list {
        display: grid;
        gap: 16px;
      }

      .review-card {
        padding: 18px;
        border: 1px solid var(--stroke);
        border-radius: 18px;
        background: var(--card);
      }

      .review-card h2 {
        margin: 0 0 14px;
        font-size: 1.1rem;
      }

      .review-card__grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
      }

      .review-slot {
        display: grid;
        gap: 8px;
      }

      .review-slot__label {
        margin: 0;
        font-size: 0.82rem;
        font-weight: 700;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }

      .review-slot__frame {
        display: grid;
        place-items: center;
        min-height: 140px;
        padding: 18px;
        border-radius: 14px;
        background:
          linear-gradient(45deg, rgba(15, 106, 84, 0.06) 25%, transparent 25%) -12px 0/24px 24px,
          linear-gradient(-45deg, rgba(15, 106, 84, 0.06) 25%, transparent 25%) -12px 0/24px 24px,
          linear-gradient(45deg, transparent 75%, rgba(15, 106, 84, 0.06) 75%) -12px 0/24px 24px,
          linear-gradient(-45deg, transparent 75%, rgba(15, 106, 84, 0.06) 75%) -12px 0/24px 24px,
          #fff;
      }

      .review-slot__image {
        display: block;
        max-width: 100%;
        max-height: 96px;
        object-fit: contain;
      }

      .review-slot__missing {
        color: #8d3e3e;
        font-weight: 700;
      }

      .review-slot__file {
        margin: 0;
        font-family: Consolas, 'Courier New', monospace;
        color: var(--muted);
        font-size: 0.72rem;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Brand Re-fetch Review</h1>
      <p class="lead">Current homepage asset on the left, newly re-fetched candidate on the right.</p>
      <section class="review-list">
${cards}
      </section>
    </main>
  </body>
</html>`;

fs.writeFileSync(outputFile, html);
console.log('Wrote public/brand-refetch-review.html');
