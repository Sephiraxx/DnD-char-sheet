const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./load');

const g = load();
const K = g.Cannon;
function artillerist(level = 3, extra = {}) {
  return g.Rules.validate({
    ...g.Rules.initial(),
    name: 'Remache',
    classId: 'artificer',
    classSubclass: 'artificer-artillerist',
    level,
    abilities: { str: 10, dex: 14, con: 14, int: 16, wis: 12, cha: 8 },
    proficiencies: ['arcana', 'investigation'],
    hpBase: 20,
    slotsSpent: Array(9).fill(0),
    classSpent: {},
    ...extra,
  });
}
const tools = id => ({
  id: 't-' + id,
  equipmentId: id,
  name: id,
  qty: 1,
  category: 'Equipo',
  weight: 5,
  location: '',
  notes: '',
});

test('Cañón sobrenatural: gratis una vez por descanso largo, después con espacio; uno a la vez', () => {
  const s = artillerist(3);
  assert.deepEqual(
    { ...K.info(s), dc: 0, attack: 0 },
    { level: 3, max: 1, hp: 15, explosive: false, fortified: false, dc: 0, attack: 0, int: 3, dice: 2 },
  );
  assert.throws(() => K.create(s, { type: 'flamethrower' }), /herramientas de tallista o de herrero/);
  s.inventory.push(tools('woodcarvers-tools'));
  K.create(s, { type: 'flamethrower' });
  assert.equal(s.cannons[0].hp, 15);
  assert.equal(s.classSpent.cannon, 1);
  g.Rules.validate(s);
  assert.throws(() => K.create(s, { type: 'ballista' }), /Ya tenés un cañón/);
  K.remove(s, s.cannons[0].id);
  assert.throws(() => K.create(s, { type: 'ballista' }), /gastá un espacio/);
  K.create(s, { type: 'ballista', pay: 1 });
  assert.equal(s.slotsSpent[0], 1);
  // Daño hasta 0: desaparece. Un descanso lo termina y el largo devuelve el gratis.
  assert.equal(K.hurt(s, s.cannons[0].id, 5), 10);
  K.hurt(s, s.cannons[0].id, 99);
  assert.equal(s.cannons, undefined);
  K.create(s, { type: 'protector', pay: 1 });
  g.Classes.reset(s, 'long');
  assert.equal(s.cannons, undefined);
  assert.equal(K.freeLeft(s), 1);
});

test('el cañón usa la CD y el ataque del artífice y la acción adicional', () => {
  const s = artillerist(9);
  s.inventory.push(tools('smiths-tools'));
  K.create(s, { type: 'flamethrower', tools: false });
  const sp = K.shot(s, s.cannons[0]);
  assert.equal(sp.saveAbility[0], 'Destreza');
  assert.match(sp.brief, /3d8 de daño de fuego/, 'Cañón explosivo: +1d8');
  assert.equal(K.info(s).dc, 8 + 4 + 3);
  g.Combat.start(s);
  K.activate(s, s.cannons[0].id);
  assert.equal(g.Combat.data(s).bonus, 'Cañón: Lanzallamas');
  assert.throws(() => K.activate(s, s.cannons[0].id), /adicional/i);
  assert.match(K.shot(s, s.cannons[0], true).brief, /3d8 de daño de fuerza/);
});

test('nivel 15: dos cañones con la misma acción y la misma adicional', () => {
  const s = artillerist(15);
  s.inventory.push(tools('woodcarvers-tools'));
  K.create(s, { type: 'ballista', count: 2 });
  assert.equal(s.cannons.length, 2);
  g.Combat.start(s);
  K.activate(s, s.cannons[0].id);
  K.activate(s, s.cannons[1].id);
  assert.equal(K.artillerist(artillerist(2, { classSubclass: '' })), null);
});
