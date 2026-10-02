const test = require('node:test');
const assert = require('node:assert/strict');
const { load, fixture } = require('./load');
const g = load();
const spell = name => g.Catalog.spells.find(x => x.english === name);
function pactCaster() {
  const s = g.Rules.validate(fixture('wizard-3.json'));
  s.known = [spell('Magic Missile').id];
  s.prepared = s.known.slice();
  s.multiclass = [
    {
      classId: 'warlock',
      level: 3,
      subclass: 'warlock-the-fiend',
      choices: {},
      spells: [spell('Hellish Rebuke').id],
      prepared: [],
    },
  ];
  s.pactSpent = 0;
  s.slotsSpent = [4, 2, 0, 0, 0, 0, 0, 0, 0];
  return s;
}
test('QA regression: exhausted normal slots still allow compatible pact casting', () => {
  const s = pactCaster();
  const sp = spell('Magic Missile');
  assert.equal(g.Combat.spellBlock(s, sp), '');
  assert.equal(g.Combat.availableSlots(s, sp)[0].value, 'pact');
  assert.equal(g.Combat.availableSlots(s, sp)[0].level, 2);
  g.Combat.cast(s, sp, 'pact');
  assert.equal(s.pactSpent, 1);
  assert.equal(s.slotsSpent[0], 4);
  g.Combat.cast(s, sp, 'pact');
  assert.match(g.Combat.spellBlock(s, sp), /No quedan espacios/);
  assert.throws(() => g.Combat.cast(s, sp, 'pact'));
  g.Classes.reset(s, 'short');
  assert.equal(s.pactSpent, 0);
  assert.equal(s.slotsSpent[0], 4);
});
test('QA regression: unconfirmed pact slots and insufficient pact levels are unavailable', () => {
  const s = pactCaster();
  s.pactSpent = null;
  assert.equal(g.Combat.availableSlots(s, spell('Magic Missile')).length, 0);
  s.pactSpent = 0;
  assert.equal(g.Combat.availableSlots(s, spell('Fireball')).length, 0);
});
test('QA regression: warlock spells can use normal slots while pact slots are spent', () => {
  const s = pactCaster();
  s.pactSpent = 2;
  s.slotsSpent[0] = 0;
  g.Combat.cast(s, spell('Hellish Rebuke'), 1);
  assert.equal(s.slotsSpent[0], 1);
  assert.equal(s.pactSpent, 2);
});
const wolf = { id: 'wolf', name: 'Lobo', type: 'bestia', cr: 0.25, ac: 13, hp: 11, speed: '40 pies', actions: [] };
function druid() {
  const s = g.Rules.validate(fixture('wizard-3.json'));
  s.classId = 'druid';
  s.classSubclass = 'druid-circle-of-the-moon';
  s.classResourcesConfirmed = true;
  return s;
}
test('QA regression: healing restores beast HP without changing the druid HP', () => {
  const s = druid();
  const original = s.hp;
  g.Companions.startWildShape(s, wolf);
  g.Companions.absorb(s, 6);
  assert.equal(g.Companions.heal(s, 3), 3);
  assert.equal(s.wildShape.hp, 8);
  assert.equal(s.hp, original);
  assert.equal(g.Companions.heal(s, 99), 3);
  assert.equal(s.wildShape.hp, 11);
});
test('QA regression: Wild Shape consumes the selected action and a use; blocked turns cannot transform', () => {
  const s = druid();
  g.Combat.start(s);
  g.Companions.transform(s, wolf, 'bonus');
  assert.equal(s.combatState.bonus, 'Forma salvaje');
  assert.equal(s.classSpent['wild-shape'], 1);
  assert.throws(() => g.Companions.transform(s, wolf, 'bonus'), /Ya usaste/);
  assert.equal(s.classSpent['wild-shape'], 1);
  g.Combat.end(s);
  assert.throws(() => g.Companions.transform(s, wolf, 'action'), /Esperá tu turno/);
});
test('QA regression: normal healing revives a character and clears death counters', () => {
  const s = druid();
  s.hp = 0;
  s.conditions = ['Inconsciente', 'Derribado'];
  s.death = { success: 1, failure: 2 };
  g.Companions.heal(s, 4);
  assert.equal(s.hp, 4);
  assert.equal(s.death.failure, 0);
  assert.equal(s.conditions.includes('Inconsciente'), false);
  assert.equal(s.conditions.includes('Derribado'), true);
});

test('QA regression: an unattuned magic weapon has no magic bonus or extra damage', () => {
  const s = druid();
  const item = {
    id: 'sun',
    name: 'Sun Blade',
    qty: 1,
    equipmentId: 'longsword',
    magic: g.MagicItems.fromCatalog('sun-blade'),
    attack: { ability: 'auto', proficient: true, magic: 2, extra: '1d8 radiante' },
  };
  s.inventory.push(item);
  const plain = g.Attacks.profile(s, item);
  assert.equal(plain.extra, '');
  item.magic.attuned = true;
  const on = g.Attacks.profile(s, item);
  assert.equal(on.toHit, plain.toHit + 2);
  assert.equal(on.dmgMod, plain.dmgMod + 2);
  assert.equal(on.extra, '1d8 radiante');
});

test('QA regression: active beast vitals appear in the player and shared party summary', () => {
  const fs = require('fs'),
    vm = require('vm'),
    path = require('path');
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../party-view.js'), 'utf8'), g);
  const s = druid();
  g.Companions.startWildShape(s, wolf);
  const v = g.Companions.vitals(s),
    p = g.PartyView.summarize(s);
  assert.equal(v.hp, 11);
  assert.equal(v.maxHP, 11);
  assert.equal(v.ac, 13);
  assert.equal(v.speed, 40);
  assert.equal(p.hp, 11);
  assert.equal(p.maxHP, 11);
  assert.equal(p.ac, 13);
  assert.match(p.effects[0], /Lobo/);
  g.Companions.endWildShape(s);
  assert.equal(g.Companions.vitals(s).hp, s.hp);
});

test('QA regression: encounter difficulty uses the total multiclass level', () => {
  const fs = require('fs'),
    vm = require('vm'),
    path = require('path');
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../party-view.js'), 'utf8'), g);
  const s = pactCaster();
  assert.equal(s.level, 3);
  assert.equal(g.PartyView.summarize(s).level, 6);
});
