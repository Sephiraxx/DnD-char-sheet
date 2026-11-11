// La ficha abre sin los bloques de criaturas (5 MB); llegan al abrir el bestiario y quedan igual que antes.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { load, LOGIC } = require('./load');

const ROOT = path.join(__dirname, '..');
const html = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

test('la ficha, el DM y el tablero no descargan las criaturas al abrir; el catálogo sí', () => {
  for (const f of ['index.html', 'dm.html', 'board.html'])
    assert.doesNotMatch(html(f), /official-monsters-data\.js/, f);
  const c = html('compendium.html');
  assert.ok(c.indexOf('official-monsters-data.js') > c.indexOf('official-content-data.js'));
  assert.ok(c.indexOf('official-monsters-data.js') < c.indexOf('official-content.js'));
  assert.match(html('sw.js'), /'\.\/official-monsters-data\.js'/);
  assert.ok(fs.statSync(path.join(ROOT, 'official-content-data.js')).size < 3.5e6);
});

test('cargadas después, las criaturas quedan igual que si se cargaran al inicio', () => {
  const eager = load();
  const lazy = load(LOGIC.filter(f => f !== 'official-monsters-data.js'));
  assert.equal(lazy.OfficialContentData.monsters, undefined);
  assert.equal(lazy.BookContentData.official.creatureEntries, 0);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'official-monsters-data.js'), 'utf8'), lazy);
  assert.equal(lazy.BookContentData.monsters.length, eager.BookContentData.monsters.length);
  assert.equal(
    JSON.stringify(lazy.BookContentData.monsters.map(m => m.id)),
    JSON.stringify(eager.BookContentData.monsters.map(m => m.id)),
  );
  assert.equal(lazy.BookContentData.official.creatureEntries, eager.BookContentData.official.creatureEntries);
  // Una segunda carga no duplica nada.
  lazy.OfficialContent.applyMonsters();
  assert.equal(lazy.BookContentData.monsters.length, eager.BookContentData.monsters.length);
  // Lo demás (objetos, conjuros, reglas) no depende de las criaturas.
  assert.equal(lazy.OfficialContent.itemTexts.size, eager.OfficialContent.itemTexts.size);
  assert.equal(lazy.OfficialContent.spellTexts.size, eager.OfficialContent.spellTexts.size);
  assert.equal(lazy.OfficialContent.ruleTexts.size, eager.OfficialContent.ruleTexts.size);
});

test('los textos de los libros llegan después y quedan igual que cargados al inicio', () => {
  const eager = load();
  const lazy = load(LOGIC.filter(f => f !== 'shared-reference-text.js'));
  assert.equal(lazy.OfficialContent.textsReady(), false);
  assert.ok(lazy.OfficialContent.entryTexts.size === 0);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'shared-reference-text.js'), 'utf8'), lazy);
  assert.equal(lazy.OfficialContent.textsReady(), true);
  for (const k of ['ruleTexts', 'entryTexts', 'itemTexts', 'spellTexts'])
    assert.equal(lazy.OfficialContent[k].size, eager.OfficialContent[k].size, k);
  const key = [...eager.OfficialContent.entryTexts.keys()][0];
  assert.equal(
    JSON.stringify(lazy.OfficialContent.entryTexts.get(key)),
    JSON.stringify(eager.OfficialContent.entryTexts.get(key)),
  );
  assert.equal(lazy.BookContentData.official.rules, eager.BookContentData.official.rules);
  assert.equal(lazy.BookContentData.official.itemDescriptions, eager.BookContentData.official.itemDescriptions);
  for (const f of ['index.html', 'dm.html', 'board.html']) assert.doesNotMatch(html(f), /shared-reference-text\.js/, f);
  assert.match(html('compendium.html'), /shared-reference-text\.js/);
  assert.match(html('sw.js'), /'\.\/shared-reference-text\.js'/);
});

test('la ficha, el DM y el tablero abren sin los textos de reglas y conjuros; el catálogo los trae', () => {
  for (const f of ['index.html', 'dm.html', 'board.html']) assert.doesNotMatch(html(f), /official-text-data\.js/, f);
  const c = html('compendium.html');
  assert.ok(c.indexOf('official-text-data.js') > c.indexOf('official-content-data.js'));
  assert.ok(c.indexOf('official-text-data.js') < c.indexOf('official-content.js'));
  assert.match(html('sw.js'), /'\.\/official-text-data\.js'/);
  assert.ok(fs.statSync(path.join(ROOT, 'official-content-data.js')).size < 1.5e6);
  assert.doesNotMatch(html('dm.html'), /encounter-tables-data\.js/);
});

test('los textos de reglas y conjuros, cargados después y en cualquier orden, quedan igual', () => {
  const late = ['official-text-data.js', 'shared-reference-text.js'],
    eager = load(),
    snap = c =>
      JSON.stringify([
        [...c.OfficialContent.ruleTexts].sort((a, b) => (a[0] < b[0] ? -1 : 1)),
        [...c.OfficialContent.spellTexts].sort((a, b) => (a[0] < b[0] ? -1 : 1)),
        c.Catalog.spells.map(s => [s.id, s.ritual]),
        c.BookContentData.official.rules,
      ]),
    want = snap(eager);
  for (const order of [late, late.slice().reverse()]) {
    const lazy = load(LOGIC.filter(f => !late.includes(f)));
    // Antes de llegar: los conjuros ya están elegidos, sin texto; las reglas, vacías.
    assert.equal(lazy.OfficialContent.spellTexts.size, eager.OfficialContent.spellTexts.size);
    assert.equal(lazy.OfficialContent.ruleTexts.size, 0);
    for (const f of order) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), lazy);
    assert.equal(snap(lazy), want);
    lazy.OfficialContent.applyLongTexts();
    assert.equal(snap(lazy), want);
  }
});
