const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const stamp = require('../tools/stamp-sw.js');

const root = path.join(__dirname, '..');

// La app abre desde la caché del service worker: lo que no esté en FILES no funciona sin red.
test('el service worker guarda todos los scripts y estilos de las páginas', () => {
  const cached = new Set(stamp.files());
  for (const page of ['index.html', 'dm.html']) {
    assert.ok(cached.has('./' + page), page);
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    for (const [, ref] of html.matchAll(/(?:src|href)="(\.\/[^"#?]+)"/g))
      assert.ok(cached.has(ref), `${page}: falta ${ref} en FILES`);
  }
  for (const f of cached) if (f !== './') assert.ok(fs.existsSync(path.join(root, f)), `no existe ${f}`);
});

// Sin una versión nueva, los celulares seguirían abriendo la caché vieja para siempre.
test('la versión del service worker coincide con el contenido (npm run stamp)', () => {
  assert.equal(stamp.current(), stamp.digest(), 'Cambiaron archivos de la app: corré `npm run stamp`.');
});

test('el catálogo no carga el texto SRD en inglés y conserva las pistas de tiradas', () => {
  const ctx = {};
  new Function('window', fs.readFileSync(path.join(root, 'catalog.js'), 'utf8'))(ctx);
  const spells = ctx.Catalog.spells,
    by = id => spells.find(s => s.id === id);
  assert.ok(spells.every(s => !('srdOriginal' in s)));
  assert.deepEqual(by('magic-missile').srd, { darts: 1 });
  assert.deepEqual(by('fireball').srd, { up: [1, 6] });
});
