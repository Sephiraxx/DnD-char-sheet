const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { load, fixture } = require('./load.js');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('identidad visual: cada clase tiene color y emblema, y el tema se carga último y queda sin conexión', () => {
  const css = read('theme.css'),
    c = load();
  for (const id of Object.keys(c.ClassData.classes)) {
    assert.match(css, new RegExp(`\\[data-cls='${id}'\\]`), id);
    assert.match(css, new RegExp(`--i-${id}:`), id);
  }
  assert.match(css, /\[data-cls='dm'\]/);
  for (const f of ['index.html', 'dm.html', 'board.html', 'compendium.html']) {
    const sheets = [...read(f).matchAll(/rel="stylesheet" href="\.\/([a-z-]+\.css)"/g)].map(m => m[1]);
    assert.equal(sheets.at(-1), 'theme.css', f);
  }
  assert.match(read('dm.html'), /<html lang="es" data-cls="dm">/);
  const sw = read('sw.js');
  for (const f of ['theme.css', 'fonts/alegreya-latin-wght-normal.woff2', 'fonts/alegreya-latin-wght-italic.woff2']) {
    assert.ok(sw.includes(`'./${f}'`), f);
    assert.ok(fs.existsSync(path.join(__dirname, '..', f)), f);
  }
});

test('el resumen de una ficha lleva su clase principal, para pintar su tarjeta', () => {
  const c = load();
  vm.runInContext(read('party-view.js'), c);
  assert.equal(c.PartyView.summarize(fixture('wizard-3.json')).cls, 'wizard');
});
