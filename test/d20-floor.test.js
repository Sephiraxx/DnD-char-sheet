const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./load');

test('mínimo en el d20: solo para esta ficha, en ataques, sin pifia y validado', () => {
  const g = load();
  const s = g.Rules.validate({ ...g.Rules.initial(), classId: 'fighter', level: 3 });
  s.inventory.push({
    id: 'ls',
    equipmentId: 'longsword',
    name: 'Espada larga',
    qty: 1,
    category: 'Armas',
    weight: 3,
    location: '',
    notes: '',
  });
  const plain = g.Attacks.profile(s, s.inventory[0]);
  assert.equal(g.Attacks.rollAttack(plain, '', () => 1).kept, 1);
  s.d20Floor = 14;
  assert.ok(g.Rules.validate(s));
  const p = g.Attacks.profile(s, s.inventory[0]);
  const low = g.Attacks.rollAttack(p, '', () => 1);
  assert.equal(low.kept, 14);
  assert.equal(low.raised, 1);
  assert.equal(low.fumble, false);
  assert.equal(low.total, 14 + p.toHit);
  const hi = g.Attacks.rollAttack(p, 'dis', () => 20);
  assert.equal(hi.kept, 20);
  assert.equal(hi.crit, true);
  assert.equal(hi.raised, undefined);
  assert.equal(g.Rules.d20Floor(g.Rules.validate({ ...g.Rules.initial() })), 0, 'otras fichas no lo tienen');
  for (const bad of [1, 21, 14.5, '14']) assert.throws(() => g.Rules.validate({ ...s, d20Floor: bad }));
});
