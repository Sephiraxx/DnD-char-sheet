const test = require('node:test');
const assert = require('node:assert/strict');
const { load, fixture } = require('./load');

test('a stable character stops rolling and a critical hit at 0 HP resumes saves', () => {
  const g = load();
  const s = g.Rules.validate({ ...fixture('wizard-3.json'), hp: 0 });
  g.Combat.deathSave(s, 12);
  g.Combat.deathSave(s, 4);
  g.Combat.deathSave(s, 12);
  g.Combat.deathSave(s, 12);
  assert.ok(g.Combat.stable(s));
  assert.equal(s.death.failure, 0);
  assert.throws(() => g.Combat.deathSave(s, 20));
  g.Combat.takeDamage(s, 1, true);
  assert.equal(g.Combat.stable(s), false);
  assert.equal(s.death.failure, 2);
  g.Combat.takeDamage(s, 1);
  assert.ok(g.Combat.dead(s));
  assert.throws(() => g.Combat.deathSave(s, 20));
  assert.throws(() => g.Companions.heal(s, 5), /resucitar/);
});

test('massive damage from above 0 HP kills and immediately stops concentration', () => {
  const g = load();
  const s = g.Rules.validate({ ...fixture('wizard-3.json'), hp: 3 });
  s.concentration = 'bless';
  g.Combat.takeDamage(s, s.hp + g.Rules.stats(s).maxHP);
  assert.ok(g.Combat.dead(s));
  assert.equal(s.concentration, null);
});

test('a finished ritual consumes no slot and starts only its actual duration', () => {
  const g = load();
  const s = g.Rules.validate({ ...fixture('wizard-3.json'), known: ['comprehend-languages'] });
  const sp = g.Rules.allSpells(s).find(x => x.id === 'comprehend-languages');
  const slots = [...s.slotsSpent];
  g.Combat.cast(s, sp, 0, true);
  assert.equal(s.ritualCasting, sp.id);
  assert.equal(s.concentration, sp.id);
  assert.equal(g.Effects.list(s).length, 0);
  g.Combat.completeRitual(s);
  assert.equal(s.ritualCasting, undefined);
  assert.equal(s.concentration, null);
  assert.ok(g.Effects.list(s).some(x => x.rounds === 600));
  assert.deepEqual([...s.slotsSpent], slots);
});

test('restarting the same concentration spell as a ritual removes its previous effect', () => {
  const g = load();
  const s = g.Rules.validate({ ...fixture('wizard-3.json'), known: ['detectmagic'] });
  const spell = g.Rules.allSpells(s).find(sp => sp.id === 'detectmagic');
  s.concentration = spell.id;
  g.Effects.fromSpell(s, spell);
  assert.equal(g.Effects.list(s).length, 1);
  g.Combat.cast(s, spell, 0, true);
  assert.equal(g.Effects.list(s).length, 0);
  assert.equal(s.ritualCasting, spell.id);
  g.Combat.completeRitual(s);
  assert.equal(s.concentration, spell.id);
  assert.equal(g.Effects.list(s).length, 1);
});
