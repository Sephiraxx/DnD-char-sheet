const test = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  vm = require('node:vm'),
  path = require('node:path');
const { load } = require('./load');
const sheet = g =>
  g.Rules.validate({
    ...g.Rules.initial(),
    classId: 'bard',
    classSubclass: 'bard-college-of-lore',
    subclass: 'manual',
    level: 5,
    known: ['heat-metal'],
    prepared: [],
    extras: [],
    slotsSpent: Array(9).fill(0),
    classResourcesConfirmed: true,
    conditions: [],
    hpBase: 30,
    hp: 30,
  });
function cast(g, s, level = 3) {
  const sp = g.Catalog.spells.find(sp => sp.id === 'heat-metal');
  g.Combat.start(s);
  g.Combat.cast(s, sp, level);
  g.Effects.fromSpell(s, { ...sp, castAbility: 'cha' }, { slot: level, object: 'La coraza del guardia' });
  return sp;
}
test('Heat Metal repeats at the original level using only a later-turn bonus action', () => {
  const g = load(),
    s = sheet(g);
  cast(g, s);
  assert.match(g.Effects.repeatBlock(s), /siguiente turno/);
  assert.throws(() => g.Effects.repeat(s));
  g.Combat.start(s);
  g.Effects.tick(s);
  g.Combat.use(s, 'action', 'Atacar');
  const before = JSON.stringify(s.slotsSpent),
    rounds = s.timedEffects[0].rounds,
    spells = s.combatState.spells.length,
    result = g.Effects.repeat(s);
  assert.equal(result.slot, 3);
  assert.equal(result.sp.castAbility, 'cha');
  assert.equal(result.object, 'La coraza del guardia');
  assert.equal(s.combatState.action, 'Atacar');
  assert.match(s.combatState.bonus, /repetir daño/);
  assert.equal(JSON.stringify(s.slotsSpent), before);
  assert.equal(s.timedEffects[0].rounds, rounds);
  assert.equal(s.combatState.spells.length, spells);
  assert.equal(s.concentration, 'heat-metal');
  assert.throws(() => g.Effects.repeat(s), /adicional/);
  assert.ok(g.Rules.validate(s));
});
test('repeating an effect does not impose the bonus-action spellcasting restriction', () => {
  const g = load(),
    s = sheet(g);
  cast(g, s, 2);
  g.Combat.start(s);
  g.Effects.repeat(s);
  const sp = g.Catalog.spells.find(sp => sp.id === 'thunderwave');
  s.known.push(sp.id);
  assert.equal(g.Combat.spellBlock(s, sp), '');
  g.Combat.cast(s, sp, 1);
  assert.equal(s.combatState.spells.length, 1);
});
test('Heat Metal cannot repeat after concentration, expiry, incapacity or outside its caster turn', () => {
  const g = load(),
    s = sheet(g);
  cast(g, s);
  g.Combat.start(s);
  g.Combat.end(s);
  assert.match(g.Effects.repeatBlock(s), /Esperá/);
  g.Combat.start(s);
  s.conditions.push('Incapacitado');
  assert.match(g.Effects.repeatBlock(s), /incapacitado/);
  s.conditions = [];
  for (let i = 0; i < 10; i++) g.Effects.tick(s);
  assert.equal(s.concentration, null);
  assert.equal(g.Effects.repeatInfo(s), null);
  assert.throws(() => g.Effects.repeat(s), /no está activo/);
  cast(g, s);
  s.concentration = null;
  g.Effects.sync(s);
  assert.equal(g.Effects.repeatInfo(s), null);
});
test('older ongoing effects ask for original spell level once without spending another slot', () => {
  const g = load(),
    s = sheet(g);
  s.concentration = 'heat-metal';
  g.Effects.add(s, { name: 'Calentar metal', rounds: 8, concentration: 'heat-metal' });
  g.Combat.start(s);
  assert.equal(g.Effects.repeatInfo(s).slot, null);
  assert.throws(() => g.Effects.repeat(s), /nivel original/);
  const result = g.Effects.repeat(s, 4);
  assert.equal(result.slot, 4);
  assert.equal(s.timedEffects[0].rounds, 8);
  assert.deepEqual([...s.slotsSpent], Array(9).fill(0));
  assert.equal(g.Effects.repeatInfo(g.Rules.validate(JSON.parse(JSON.stringify(s)))).slot, 4);
});
test('Heat Metal damage is automatic and its Constitution save is only for dropping the object', () => {
  const g = load();
  g.R = g.Rules;
  g.state = sheet(g);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../rolls-ui.js'), 'utf8'), g);
  g.sp = g.Catalog.spells.find(sp => sp.id === 'heat-metal');
  const info = vm.runInContext('RollUI.spellInfo(sp,4)', g);
  assert.equal(info.dice, '4d8');
  assert.equal(info.save, '');
  assert.equal(info.saveName, '');
  assert.match(info.notes.join(' '), /soltarlo/);
});
