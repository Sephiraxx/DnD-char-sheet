const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./load');

test('Garrote: con garrote o bastón usa SAB, d8 y arma mágica mientras dura', () => {
  const g = load();
  const s = g.Rules.validate({
    ...g.Rules.initial(),
    classId: 'druid',
    level: 3,
    abilities: { str: 10, dex: 12, con: 12, int: 10, wis: 16, cha: 10 },
  });
  s.known = ['shillelagh'];
  const add = id => {
    const it = {
      id: 'w-' + id,
      equipmentId: id,
      name: id,
      qty: 1,
      category: 'Armas',
      weight: 2,
      location: '',
      notes: '',
    };
    s.inventory.push(it);
    return it;
  };
  const club = add('club'),
    staff = add('quarterstaff'),
    sickle = add('sickle');
  const before = g.Attacks.profile(s, club);
  assert.equal(before.ability, 'str');
  assert.equal(before.dice, '1d4');
  const sp = g.Rules.allSpells(s).find(x => x.id === 'shillelagh');
  g.Effects.fromSpell(s, sp);
  assert.ok(g.Rules.validate(s));
  const on = g.Attacks.profile(s, club);
  assert.equal(on.ability, 'wis');
  assert.equal(on.dice, '1d8');
  assert.equal(on.toHit, 3 + 2);
  assert.equal(on.dmgMod, 3);
  assert.equal(on.magical, true);
  assert.match(on.notes.join(), /Garrote/);
  assert.equal(g.Attacks.profile(s, staff, { twoHands: true }).dice, '1d8');
  assert.equal(g.Attacks.profile(s, sickle).ability, 'str', 'solo garrote y bastón');
  // Dura un minuto: diez turnos.
  for (let i = 0; i < 10; i++) g.Effects.tick(s);
  assert.equal(g.Attacks.profile(s, club).dice, '1d4');
});
