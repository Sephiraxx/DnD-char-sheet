const test = require('node:test');
const assert = require('node:assert/strict');
const { load, fixture } = require('./load');

const g = load();
const K = g.Companions;
const wolf = {
  id: 'wolf',
  name: 'Wolf',
  type: 'bestia',
  ac: 13,
  hp: 11,
  cr: 0.25,
  speed: '40 ft.',
  ab: [12, 15, 12, 3, 12, 6],
  actions: [{ n: 'Bite', atk: 4, dmg: [['2d4+2', 'perforante']] }],
};
const druid = (level = 2, subclass = '') => {
  const s = g.Rules.validate({ ...g.Rules.initial(), classId: 'druid', level, classSubclass: subclass });
  s.hp = g.Rules.stats(s).maxHP;
  return s;
};

test('un compañero del bestiario guarda PG, CA, velocidad y ataques', () => {
  const c = K.fromMonster(wolf, 'pet');
  assert.equal(c.speed, '40 pies');
  assert.equal(JSON.stringify(c.attacks), JSON.stringify([{ name: 'Bite', bonus: 4, damage: '2d4+2 perforante' }]));
  const s = druid();
  s.companions = [c];
  g.Rules.validate(s);
  s.companions[0].hp = 99;
  assert.throws(() => g.Rules.validate(s));
});

test('límites de forma salvaje por nivel y Círculo de la Luna', () => {
  const owl = { ...wolf, id: 'owl', cr: 0, speed: '5 ft., fly 60 ft.' },
    bear = { ...wolf, id: 'brown-bear', cr: 1 };
  assert.equal(K.canBecome(druid(2), wolf), '');
  assert.match(K.canBecome(druid(2), owl), /vuelo/);
  assert.match(K.canBecome(druid(2), bear), /VD/);
  assert.equal(K.canBecome(druid(2, 'druid-circle-of-the-moon'), bear), '');
  assert.match(K.canBecome(druid(2), { ...wolf, type: 'monstruosidad' }), /bestias/);
});

test('el daño baja primero la bestia y el exceso pasa al druida', () => {
  const s = druid(4);
  K.startWildShape(s, wolf);
  let r = K.absorb(s, 5);
  assert.equal(s.wildShape.hp, 6);
  assert.equal(r.toCharacter, 0);
  r = K.absorb(s, 10);
  assert.ok(r.reverted);
  assert.equal(r.toCharacter, 4);
  assert.equal(s.wildShape, undefined);
  const t = druid(4);
  t.temp = 3;
  K.startWildShape(t, wolf);
  assert.equal(K.absorb(t, 5).beast, 2, 'los PG temporales van primero');
});

test('en forma salvaje no se lanzan conjuros', () => {
  const s = druid(4),
    sp = g.Catalog.spells.find(x => x.english === 'Produce Flame');
  s.known = [sp.id];
  K.startWildShape(s, wolf);
  assert.match(g.Combat.spellBlock(s, sp), /forma salvaje/);
});

test('en forma salvaje FUE, DES y CON de pruebas, salvaciones e iniciativa son de la bestia', () => {
  const s = druid(4);
  s.abilities.str = 8;
  s.abilities.dex = 10;
  const hp = g.Rules.stats(s).maxHP,
    save = g.Rules.saveBonus(s, 'dex');
  K.startWildShape(s, wolf);
  assert.equal(g.Rules.saveBonus(s, 'dex'), save + 2, 'DES 15 del lobo');
  assert.equal(g.Rules.skillBonus(s, 'athletics') - g.Rules.skillBonus({ ...s, wildShape: undefined }, 'athletics'), 2);
  assert.equal(g.Rules.stats(s).initiative, 2);
  assert.equal(g.Rules.stats(s).maxHP, hp, 'los PG máximos del druida no cambian');
  assert.equal(g.Rules.saveBonus(s, 'wis'), g.Rules.saveBonus({ ...s, wildShape: undefined }, 'wis'));
});
test('QA N-05: swimming unlocks at four, flight and CR one unlock at eight', () => {
  const swimmer = { ...wolf, speed: '30 pies, nado 30 pies' };
  const flyer = { ...wolf, speed: '10 pies, vuelo 60 pies' };
  const crOne = { ...wolf, cr: 1 };
  assert.match(K.canBecome(druid(2), swimmer), /nado/);
  assert.equal(K.canBecome(druid(4), swimmer), '');
  assert.match(K.canBecome(druid(4), flyer), /vuelo/);
  assert.equal(K.canBecome(druid(8), flyer), '');
  assert.match(K.canBecome(druid(4), crOne), /VD/);
  assert.equal(K.canBecome(druid(8), crOne), '');
});

test('en forma salvaje se usa el bono de habilidad o salvación de la bestia si es mayor', () => {
  const s = druid(4);
  s.abilities.dex = 10;
  s.proficiencies = s.proficiencies.filter(x => x !== 'stealth');
  K.startWildShape(s, { ...wolf, skills: 'Percepción +3, Sigilo +4', saves: 'DES +5' });
  assert.equal(g.Rules.skillBonus(s, 'stealth'), 4, 'Sigilo +4 del lobo');
  assert.equal(g.Rules.saveBonus(s, 'dex'), 5);
  assert.ok(
    g.Rules.skillBonus(s, 'nature') >= g.Rules.skillBonus({ ...s, wildShape: undefined }, 'nature') - 0,
    'las propias se conservan',
  );
  g.Rules.validate(s);
});
