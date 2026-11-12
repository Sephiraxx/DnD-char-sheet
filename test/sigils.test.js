const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { load } = require('./load.js');
const S = require('../sigils.js');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('emblemas: hay uno por clase y por tipo de criatura, con trazos válidos', () => {
  const c = load();
  for (const id of Object.keys(c.ClassData.classes)) assert.ok(S.has(id), id);
  for (const type of [
    'aberration',
    'beast',
    'celestial',
    'construct',
    'dragon',
    'elemental',
    'fey',
    'fiend',
    'giant',
    'humanoid',
    'monstrosity',
    'ooze',
    'plant',
    'undead',
  ])
    assert.ok(S.has(type), type);
  // Solo comandos y números de un trazo SVG.
  for (const [id, d] of Object.entries(S.PATHS)) assert.match(d, /^[MmLlHhVvCcSsQqTtAaZz0-9 .,-]+$/, id);
});

test('emblemas: el tipo de criatura se reconoce por el nombre, en castellano o inglés', () => {
  const cases = {
    'Dragón rojo joven': 'dragon',
    Esqueleto: 'undead',
    'Lobo terrible': 'beast',
    'Oso pardo': 'beast',
    'Cubo gelatinoso': 'ooze',
    'Goblin 2': 'humanoid',
    Ogro: 'giant',
    Diablillo: 'fiend',
    'Gólem de piedra': 'construct',
    Contemplador: 'aberration',
    Mímico: 'monstrosity',
    '': 'monstrosity',
  };
  for (const [name, type] of Object.entries(cases)) assert.equal(S.forName(name), type, name);
});

test('los emblemas se cargan antes del tablero y quedan disponibles sin conexión', () => {
  for (const f of ['index.html', 'dm.html', 'board.html']) {
    const h = read(f);
    assert.ok(h.indexOf('./sigils.js') > 0 && h.indexOf('./sigils.js') < h.indexOf('./board.js'), f);
  }
  assert.match(read('sw.js'), /'\.\/sigils\.js'/);
});
