import fs from 'fs';

let html = fs.readFileSync('brands_html.txt', 'utf8');

const originalLogos = {
  'Barbeque Nation': '/assets/brand-barbeque-nation.png',
  'ABs': '/assets/Absolute_Barbecues_India_id_qpml3fI_0.png',
  'Nando’s': '/assets/brand-nandos.png'
};

const classNames = {
  'Barbeque Nation': 'brands__logo brands__logo--barbeque',
  'ABs': 'brands__logo brands__logo--absolute',
  'Nando’s': 'brands__logo brands__logo--nandos'
};

const articleRegex = /<article class="brands__item brands__item--(logo|text)">[\s\S]*?<\/article>/g;

let newHtml = html.replace(articleRegex, (match) => {
  let altMatch = match.match(/alt="([^"]+)"/);
  let spanMatch = match.match(/<span class="brands__label">([^<]+)<\/span>/);
  
  let name = altMatch ? altMatch[1] : (spanMatch ? spanMatch[1] : 'Unknown');
  
  if (originalLogos[name]) {
    return `                <article class="brands__item brands__item--logo">
                  <img
                    src="${originalLogos[name]}"
                    alt="${name}"
                    class="${classNames[name] || 'brands__logo'}"
                    loading="lazy"
                  />
                  <div class="brands__hover-label">${name}</div>
                </article>`;
  }
  
  if (match.includes('brands__item--logo')) {
    return match.replace('</article>', `  <div class="brands__hover-label">${name}</div>\n                </article>`);
  } else {
    return match;
  }
});

fs.writeFileSync('brands_html_hover.txt', newHtml);
