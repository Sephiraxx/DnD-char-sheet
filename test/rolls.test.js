const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { load, fixture } = require('./load');

// rolls-ui.js usa globales de la app (state, R…): se cargan con lo mínimo para las funciones puras.
const g = load();
g.R = g.Rules;
g.state = g.Rules.validate(fixture('wizard-3.json'));
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'rolls-ui.js'), 'utf8'), g);
const RollUI = vm.runInContext('RollUI', g);
const spell = english => g.Catalog.spells.find(x => x.english === english);
const withConditions = (...c) => ({ ...g.state, conditions: c });

test('condiciones: desventaja, ventaja y anulación', () => {
  assert.equal(RollUI.conditionMods(withConditions('Envenenado'), 'attack').mode, 'dis');
  assert.equal(RollUI.conditionMods(withConditions('Invisible'), 'attack').mode, 'adv');
  assert.equal(RollUI.conditionMods(withConditions('Invisible', 'Derribado'), 'attack').mode, '');
  assert.equal(RollUI.conditionMods(withConditions('Asustado'), 'check').mode, 'dis');
  assert.equal(RollUI.conditionMods(withConditions('Derribado'), 'check').mode, '');
  assert.equal(RollUI.conditionMods(withConditions('Restringido'), 'save', 'dex').mode, 'dis');
  assert.equal(RollUI.conditionMods(withConditions('Paralizado'), 'save', 'str').autoFail, 'Paralizado');
  assert.equal(RollUI.conditionMods(withConditions('Paralizado'), 'save', 'wis').autoFail, '');
});

test('conjuros: ataque, salvación y dados', () => {
  const fb = RollUI.spellInfo(spell('Fire Bolt'), 0);
  assert.equal(fb.attack, true);
  assert.equal(fb.dice, '1d10');
  const sf = RollUI.spellInfo(spell('Sacred Flame'), 0);
  assert.equal(sf.save, 'dex');
});

test('trucos escalan con el nivel de personaje', () => {
  const prev = g.state;
  g.state = { ...prev, level: 5 };
  assert.equal(RollUI.spellInfo(spell('Fire Bolt'), 0).dice, '2d10');
  g.state = { ...prev, level: 11 };
  assert.equal(RollUI.spellInfo(spell('Fire Bolt'), 0).dice, '3d10');
  g.state = prev;
});

test('lanzar en espacio superior suma dados; curación suma el modificador', () => {
  const fireball = RollUI.spellInfo(spell('Fireball'), 5);
  assert.equal(fireball.dice, '10d6');
  const cure = RollUI.spellInfo(spell('Cure Wounds'), 2);
  assert.equal(cure.heal, true);
  assert.equal(cure.addMod, true);
  assert.equal(cure.dice, '2d8');
});
