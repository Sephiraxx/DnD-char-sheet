// Escribe en sw.js el resumen del contenido de la app: cualquier cambio en FILES crea una versión nueva de la caché.
// Uso: npm run stamp (los tests fallan si te lo olvidás).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.join(__dirname, '..');
const SW = path.join(root, 'sw.js');

function files(src = fs.readFileSync(SW, 'utf8')) {
  const list = /const FILES = \[([\s\S]*?)\];/.exec(src)[1];
  return [...list.matchAll(/'([^']+)'/g)].map(m => m[1]);
}
function digest(src = fs.readFileSync(SW, 'utf8')) {
  const hash = crypto.createHash('sha256');
  for (const f of files(src)) {
    if (f === './') continue;
    hash.update(f + '\0');
    // Sin \r: un checkout de Windows tiene que dar el mismo resumen que GitHub Pages.
    hash.update(fs.readFileSync(path.join(root, f), 'utf8').replace(/\r\n/g, '\n'));
  }
  return hash.digest('hex').slice(0, 12);
}
const current = (src = fs.readFileSync(SW, 'utf8')) => /const BUILD = '([^']*)';/.exec(src)[1];

if (require.main === module) {
  const src = fs.readFileSync(SW, 'utf8'),
    build = digest(src);
  fs.writeFileSync(SW, src.replace(/const BUILD = '[^']*';/, `const BUILD = '${build}';`));
  console.log('sw.js BUILD =', build);
}
module.exports = { files, digest, current };
