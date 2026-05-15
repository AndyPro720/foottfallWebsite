import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { BRAND_LOGOS, sanitizeBrandName } from './brand-manifest.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const brandAssetDir = path.join(projectRoot, 'public', 'assets', 'brands');
const previewFile = path.join(projectRoot, 'public', 'preview.html');
const plainHtmlFile = path.join(projectRoot, 'brands_html.txt');
const hoverHtmlFile = path.join(projectRoot, 'brands_html_hover.txt');
const stackedHtmlFile = path.join(projectRoot, 'brands_html_stacked.txt');
const auditJsonFile = path.join(projectRoot, 'public', 'brand-audit.json');
const indexHtmlFile = path.join(projectRoot, 'index.html');
const MIN_FULL_LOGO_BYTES = 8000;

const extensionPriority = {
  '.svg': 4,
  '.png': 3,
  '.webp': 2,
  '.jpg': 1,
  '.jpeg': 1,
};

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

function resolveGeneratedAsset(assetKey) {
  const candidates = fs
    .readdirSync(brandAssetDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.startsWith(`${assetKey}.`))
    .map((entry) => {
      const absolutePath = path.join(brandAssetDir, entry.name);
      const stats = fs.statSync(absolutePath);
      return {
        name: entry.name,
        absolutePath,
        modifiedTime: stats.mtimeMs,
        size: stats.size,
        extension: path.extname(entry.name).toLowerCase(),
      };
    })
    .sort((left, right) => {
      const rightIsFullLogo = right.size >= MIN_FULL_LOGO_BYTES;
      const leftIsFullLogo = left.size >= MIN_FULL_LOGO_BYTES;
      if (rightIsFullLogo !== leftIsFullLogo) {
        return Number(rightIsFullLogo) - Number(leftIsFullLogo);
      }

      if (right.modifiedTime !== left.modifiedTime) {
        return right.modifiedTime - left.modifiedTime;
      }

      const rightPriority = extensionPriority[right.extension] ?? 0;
      const leftPriority = extensionPriority[left.extension] ?? 0;
      return rightPriority - leftPriority;
    });

  if (candidates.length === 0) {
    return null;
  }

  return {
    src: `/assets/brands/${candidates[0].name}`,
    fileName: candidates[0].name,
  };
}

function resolveBrandAsset(brand) {
  if (brand.assetSrc) {
    return {
      src: brand.assetSrc,
      fileName: path.basename(brand.assetSrc),
      source: 'manual',
    };
  }

  if (brand.assetFile) {
    return {
      src: `/assets/brands/${brand.assetFile}`,
      fileName: brand.assetFile,
      source: 'pinned',
    };
  }

  const assetKey = brand.assetKey ?? sanitizeBrandName(brand.name);
  const generatedAsset = resolveGeneratedAsset(assetKey);

  if (!generatedAsset) {
    return {
      src: '',
      fileName: '',
      source: 'missing',
    };
  }

  return {
    ...generatedAsset,
    source: 'generated',
  };
}

function renderLogoArticle(brand, resolvedBrand, { stacked = false, hover = false } = {}) {
  const articleClasses = ['brands__item'];
  const brandLabel = escapeHtml(brand.name);

  if (!resolvedBrand.src) {
    articleClasses.push('brands__item--text');
    return `                <article class="${articleClasses.join(' ')}"><span class="brands__label">${brandLabel}</span></article>`;
  }

  articleClasses.push('brands__item--logo');
  if (stacked) {
    articleClasses.push('brands__item--stacked');
  }

  const imgClass = escapeHtml(brand.className ?? 'brands__logo');
  const src = escapeHtml(resolvedBrand.src);

  const lines = [
    `                <article class="${articleClasses.join(' ')}">`,
    '                  <img',
    `                    src="${src}"`,
    `                    alt="${brandLabel}"`,
    `                    class="${imgClass}"`,
    '                    loading="lazy"',
    '                  />',
  ];

  if (stacked) {
    lines.push(`                  <span class="brands__label">${brandLabel}</span>`);
  } else if (hover) {
    lines.push(`                  <div class="brands__hover-label">${brandLabel}</div>`);
  }

  lines.push('                </article>');
  return lines.join('\n');
}

function renderPreviewCard(brand, resolvedBrand) {
  const brandLabel = escapeHtml(brand.name);
  let previewSrc = '';

  if (resolvedBrand.src) {
    previewSrc = resolvedBrand.source === 'manual'
      ? `../assets/${resolvedBrand.fileName}`
      : `.${resolvedBrand.src}`;
  }

  const previewImage = previewSrc
    ? `<img src="${escapeHtml(previewSrc)}" alt="${brandLabel}" class="audit-card__logo" loading="lazy" />`
    : '<div class="audit-card__missing">Missing logo</div>';

  return `      <article class="audit-card ${resolvedBrand.src ? '' : 'audit-card--missing'}">
        <div class="audit-card__logo-wrap">
          ${previewImage}
        </div>
        <div class="audit-card__meta">
          <h2 class="audit-card__title">${brandLabel}</h2>
          <p class="audit-card__file">${escapeHtml(resolvedBrand.fileName || 'No asset resolved')}</p>
        </div>
      </article>`;
}

function buildPreviewPage(resolvedBrands) {
  const cards = resolvedBrands.map(({ brand, resolvedBrand }) => renderPreviewCard(brand, resolvedBrand)).join('\n');
  const resolvedCount = resolvedBrands.filter(({ resolvedBrand }) => resolvedBrand.src).length;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Foottfall Brand Logo Audit</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f3efe8;
        --card: rgba(255, 255, 255, 0.88);
        --stroke: rgba(33, 44, 40, 0.14);
        --text: #1f2c28;
        --muted: #61716b;
        --accent: #0f6a54;
        --danger: #8d3e3e;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        font-family: Georgia, 'Times New Roman', serif;
        color: var(--text);
        background:
          radial-gradient(circle at top left, rgba(202, 179, 132, 0.18), transparent 22rem),
          radial-gradient(circle at top right, rgba(15, 106, 84, 0.1), transparent 26rem),
          linear-gradient(180deg, #f7f2ea 0%, var(--bg) 100%);
      }

      main {
        width: min(1500px, calc(100% - 48px));
        margin: 0 auto;
        padding: 32px 0 40px;
      }

      h1 {
        margin: 0;
        font-size: 2.3rem;
        font-weight: 500;
        letter-spacing: -0.03em;
      }

      .audit-summary {
        display: flex;
        align-items: end;
        justify-content: space-between;
        gap: 24px;
        margin-bottom: 24px;
      }

      .audit-summary p {
        margin: 6px 0 0;
        color: var(--muted);
        font-size: 0.98rem;
      }

      .audit-pill {
        padding: 10px 14px;
        border: 1px solid var(--stroke);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.75);
        color: var(--accent);
        font-size: 0.88rem;
        font-weight: 700;
      }

      .audit-grid {
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 18px;
      }

      .audit-card {
        display: grid;
        gap: 12px;
        padding: 18px;
        border: 1px solid var(--stroke);
        border-radius: 20px;
        background: var(--card);
        box-shadow: 0 18px 40px rgba(36, 44, 40, 0.06);
      }

      .audit-card--missing {
        border-color: rgba(141, 62, 62, 0.28);
        background: rgba(255, 248, 248, 0.92);
      }

      .audit-card__logo-wrap {
        display: grid;
        place-items: center;
        min-height: 132px;
        padding: 18px;
        border-radius: 16px;
        background:
          linear-gradient(45deg, rgba(15, 106, 84, 0.06) 25%, transparent 25%) -12px 0/24px 24px,
          linear-gradient(-45deg, rgba(15, 106, 84, 0.06) 25%, transparent 25%) -12px 0/24px 24px,
          linear-gradient(45deg, transparent 75%, rgba(15, 106, 84, 0.06) 75%) -12px 0/24px 24px,
          linear-gradient(-45deg, transparent 75%, rgba(15, 106, 84, 0.06) 75%) -12px 0/24px 24px,
          #ffffff;
      }

      .audit-card__logo {
        display: block;
        max-width: 100%;
        max-height: 88px;
        object-fit: contain;
      }

      .audit-card__missing {
        color: var(--danger);
        font-weight: 700;
      }

      .audit-card__meta {
        display: grid;
        gap: 5px;
      }

      .audit-card__title {
        margin: 0;
        font-size: 1rem;
        font-weight: 700;
      }

      .audit-card__file {
        margin: 0;
        color: var(--muted);
        font-family: Consolas, 'Courier New', monospace;
        font-size: 0.72rem;
        line-height: 1.45;
      }
    </style>
  </head>
  <body>
    <main>
      <section class="audit-summary">
        <div>
          <h1>Foottfall Brand Logo Audit</h1>
          <p>${resolvedCount} of ${resolvedBrands.length} brands resolved to logo assets. Cards show the exact file selected for the homepage.</p>
        </div>
        <div class="audit-pill">Generated from local assets</div>
      </section>
      <section class="audit-grid">
${cards}
      </section>
    </main>
  </body>
</html>`;
}

const resolvedBrands = BRAND_LOGOS.map((brand) => {
  const resolvedBrand = resolveBrandAsset(brand);
  return { brand, resolvedBrand };
});

const plainHtml = resolvedBrands
  .map(({ brand, resolvedBrand }) => renderLogoArticle(brand, resolvedBrand))
  .join('\n');
const hoverHtml = resolvedBrands
  .map(({ brand, resolvedBrand }) => renderLogoArticle(brand, resolvedBrand, { hover: true }))
  .join('\n');
const stackedHtml = resolvedBrands
  .map(({ brand, resolvedBrand }) => renderLogoArticle(brand, resolvedBrand, { stacked: true }))
  .join('\n');

fs.writeFileSync(plainHtmlFile, plainHtml);
fs.writeFileSync(hoverHtmlFile, hoverHtml);
fs.writeFileSync(stackedHtmlFile, stackedHtml);
fs.writeFileSync(previewFile, buildPreviewPage(resolvedBrands));
fs.writeFileSync(
  auditJsonFile,
  JSON.stringify(
    resolvedBrands.map(({ brand, resolvedBrand }) => ({
      brand: brand.name,
      src: resolvedBrand.src,
      fileName: resolvedBrand.fileName,
      source: resolvedBrand.source,
    })),
    null,
    2,
  ),
);

const indexHtml = fs.readFileSync(indexHtmlFile, 'utf8');
const trackRegex = /<div class="brands__track">[\s\S]*?<\/div>\s*<button class="brands__arrow" type="button" aria-label="Next brands">/;
const nextButtonMarkup = `<div class="brands__track">\n${stackedHtml}\n              </div>\n\n              <button class="brands__arrow" type="button" aria-label="Next brands">`;

if (!trackRegex.test(indexHtml)) {
  throw new Error('Could not find the brand track block in index.html.');
}

fs.writeFileSync(indexHtmlFile, indexHtml.replace(trackRegex, nextButtonMarkup));

const missingBrands = resolvedBrands.filter(({ resolvedBrand }) => !resolvedBrand.src);
if (missingBrands.length > 0) {
  console.warn('Missing brand assets:', missingBrands.map(({ brand }) => brand.name).join(', '));
} else {
  console.log(`Resolved all ${resolvedBrands.length} brand assets.`);
}
