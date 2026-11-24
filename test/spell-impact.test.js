const test = require('node:test');
const assert = require('node:assert/strict');
const { load, fixture } = require('./load');
const { Rules: R } = load();
const pc = fixture('wizard-3.json');
const spell = id => R.spells.find(s => s.id === id);
const types = (id, choice, mm) => Array.from(R.castDamageTypes(R.spellImpact(spell(id)), choice, mm));

test('Hacer añicos: el radio no cambia al subir el espacio, pero aumenta el daño', () => {
  const sp = spell('shatter');
  assert.equal(R.spellHeadline(pc, sp), '3d8 de daño de trueno · Radio de 10 pies');
  assert.match(R.spellHeadline(pc, sp, 3), /4d8 de daño de trueno · Radio de 10 pies/);
  assert.deepEqual(types('shatter', '', { from: ['trueno'], types: null }), ['trueno']);
  assert.deepEqual(types('shatter', '', { from: ['trueno'], types: 'frío' }), ['frío']);
});

test('los tipos a elegir, combinados y determinados por dados conservan sus diferencias', () => {
  assert.deepEqual(types('chromatic-orb', 'ácido'), ['ácido']);
  assert.deepEqual(types('destructive-wave', 'radiante').sort(), ['radiante', 'trueno']);
  assert.deepEqual(types('flame-strike').sort(), ['fuego', 'radiante']);
  assert.deepEqual(types('chaos-bolt'), []);
  assert.match(R.spellHeadline(pc, spell('chaos-bolt'), 2), /2d8 \+ 2d6/);
});

test('cada conjuro tiene una línea legible y una animación válida para cada tipo', () => {
  const { BoardSceneFX: fx } = load(['board-art.js', 'board-scene-fx.js']);
  for (const sp of R.spells) {
    const summary = R.spellHeadline(pc, sp);
    assert.ok(summary.trim() && !/undefined|NaN/.test(summary), sp.id);
    for (const type of R.spellImpact(sp).types) assert.ok(fx.colors[fx.typeKey(type)], sp.id);
  }
  assert.deepEqual(types('bless'), []);
  assert.equal(R.spellImpact(spell('bless')).healing, false);
  assert.equal(R.spellImpact(spell('cure')).healing, true);
  assert.match(R.spellHeadline(pc, spell('heal'), 8), /90 PG/);
  assert.match(R.spellHeadline(pc, spell('life-transference')), /necrótico.*doble/);
  assert.equal(R.spellImpact(spell('wither-and-bloom')).healing, true);
  assert.equal(R.spellImpact(spell('fog-cloud'), 2).area.feet, 40);
});
