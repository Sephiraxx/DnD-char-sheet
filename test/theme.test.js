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

test('color de la ficha: se valida, se aclara si es muy oscuro y viaja en el resumen', () => {
  const c = load(),
    s = fixture('wizard-3.json');
  vm.runInContext(read('party-view.js'), c);
  assert.equal(c.PartyView.summarize(s).color, '');
  s.sheetColor = '#e8834a';
  assert.doesNotThrow(() => c.Rules.validate(s));
  assert.equal(c.PartyView.summarize(s).color, '#e8834a');
  s.sheetColor = 'red; background:url(x)';
  assert.throws(() => c.Rules.validate(s), /Color/);
  // Una ficha con un color inválido no llega a pintar nada.
  assert.ok(!c.PartyView.summarize(s).color);
  assert.equal(c.Persona.readable('#e8834a'), '#e8834a');
  const lifted = c.Persona.readable('#101010');
  assert.match(lifted, /^#[0-9a-f]{6}$/);
  assert.ok(parseInt(lifted.slice(1, 3), 16) > 120);
  assert.equal(c.Persona.readable('nope'), '');
});

test('en la ficha, enlaces y botones de texto siguen al color elegido; la pantalla del DM no', () => {
  assert.match(read('theme.css'), /html\[data-cls\]:not\(\[data-cls='dm'\]\) \{\s*--teal: var\(--accent\);/);
});
