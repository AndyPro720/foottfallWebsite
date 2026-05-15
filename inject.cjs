const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');
let newTrack = fs.readFileSync('brands_html_stacked.txt', 'utf8');
let trackRegex = /<div class="brands__track">[\s\S]*?<\/div>\s*<button class="brands__arrow" type="button" aria-label="Next brands">/;
html = html.replace(trackRegex, '<div class="brands__track">\n' + newTrack + '\n              </div>\n\n              <button class="brands__arrow" type="button" aria-label="Next brands">');
fs.writeFileSync('index.html', html);
