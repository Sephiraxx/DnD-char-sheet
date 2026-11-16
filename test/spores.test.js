const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./load');

const g = load();
const P = g.Spores;
const wolf = { id: 'wolf', name: 'Wolf', type: 'bestia', ac: 13, hp: 11, cr: 0.25, speed: '40 ft.', actions: [] };
const item = (equipmentId, name) => ({
  id: 'i-' + equipmentId,
  equipmentId,
  name,
  qty: 1,
  category: 'Armas',
  weight: 1,
  location: 'Con el personaje',
  notes: '',
});
const druid = (level = 2, subclass = P.SUBCLASS) => {
  const s = g.Rules.validate({ ...g.Rules.initial(), classId: 'druid', level, classSubclass: subclass });
  s.hp = g.Rules.stats(s).maxHP;
  s.classSpent = { 'wild-shape': 0 };
  return s;
};

test('esporas: solo para el Círculo de las Esporas desde el nivel 2; el dado del Halo crece', () => {
  assert.ok(P.is(druid(2)));
  assert.ok(!P.is(druid(1)));
  assert.ok(!P.is(druid(5, 'druid-circle-of-the-moon')));
  assert.equal([2, 5, 6, 9, 10, 13, 14, 20].map(P.haloDie).join(), '4,4,6,6,8,8,10,10');
  assert.throws(() => P.start(druid(5, 'druid-circle-of-the-moon')), /Esporas/);
});

test('Entidad simbiótica: gasta Forma salvaje y la acción, da 4 PG temporales por nivel', () => {
  const s = druid(5);
  P.start(s);
  assert.equal(s.temp, 20);
  assert.equal(s.classSpent['wild-shape'], 1);
  assert.ok(P.active(s));
  // Sobrevive a guardar y volver a cargar la ficha.
  assert.ok(P.active(g.Rules.validate(JSON.parse(JSON.stringify(s)))));
  // No se suman a los que ya tenía: queda el número más alto.
  const t = druid(3);
  t.temp = 30;
  P.start(t);
  assert.equal(t.temp, 30);
  // Sin usos no se puede.
  const u = druid(4);
  u.classSpent['wild-shape'] = 2;
  assert.throws(() => P.start(u), /No alcanza/);
});

test('Entidad simbiótica: el Halo tira dos dados y los ataques cuerpo a cuerpo suman 1d6 necrótico', () => {
  const s = druid(6);
  assert.equal(P.halo(s, () => 0.99).rolls.join(), '6');
  assert.equal(P.meleeBonus(s), null);
  P.start(s);
  const h = P.halo(s, () => 0.99);
  assert.equal(h.rolls.join(), '6,6');
  assert.equal(h.total, 12);
  assert.equal(h.dc, g.Rules.stats(s).dc);
  assert.equal(P.meleeBonus(s).dice, '1d6');
  const club = g.Attacks.profile(s, item('club', 'Garrote')),
    bow = g.Attacks.profile(s, item('shortbow', 'Arco corto'));
  assert.equal(club.bonus?.dice, '1d6');
  assert.equal(bow.bonus, null);
  const dmg = g.Attacks.rollDamage(club, false, sides => sides);
  assert.equal(dmg.parts.length, 2);
  assert.equal(dmg.parts[1].sum, 6);
  assert.equal(g.Attacks.rollDamage(club, true, sides => sides).parts[1].rolls.length, 2, 'en un crítico se duplica');
});

test('Entidad simbiótica: termina al perder los PG temporales, al usar Forma salvaje o al descansar', () => {
  let s = druid(4);
  P.start(s);
  g.Companions.absorb(s, 15);
  assert.ok(P.active(s), 'queda 1 PG temporal');
  g.Companions.absorb(s, 3);
  assert.ok(!P.active(s));
  assert.equal(g.Attacks.profile(s, item('club', 'Garrote')).bonus, null);

  s = druid(4);
  P.start(s);
  g.Companions.startWildShape(s, wolf);
  assert.ok(!P.active(s));

  s = druid(4);
  P.start(s);
  g.Classes.reset(s, 'short');
  assert.ok(!P.active(s));

  s = druid(4);
  P.start(s);
  P.end(s);
  assert.ok(!P.active(s));
  assert.equal(s.temp, 16, 'darla por terminada no quita los PG temporales');
});

test('Esporas propagadas (nivel 10): acción adicional con la entidad activa; sin Halo mientras existan', () => {
  const low = druid(9);
  P.start(low);
  assert.throws(() => P.startSpread(low), /nivel 10/);
  const s = druid(10);
  assert.throws(() => P.startSpread(s), /activa/);
  P.start(s);
  P.startSpread(s);
  assert.ok(P.spread(s));
  assert.throws(() => P.useHalo(s), /propagadas/);
  P.endSpread(s);
  assert.equal(P.useHalo(s, () => 0).total, 2);
});

test('Infestación fúngica (nivel 6) y Cuerpo fúngico (nivel 14)', () => {
  const ids = l => g.Classes.resources(druid(l)).map(r => r.id);
  assert.ok(!ids(5).includes('fungal-infestation'));
  assert.ok(ids(6).includes('fungal-infestation'));
  assert.ok(!g.Classes.resources(druid(6, 'druid-circle-of-the-moon')).some(r => r.id === 'fungal-infestation'));
  assert.equal(P.conditionImmune(druid(13)).length, 0);
  const d = g.Defenses.of(druid(14));
  for (const c of ['Cegado', 'Ensordecido', 'Asustado', 'Envenenado']) assert.ok(d.conditions.includes(c), c);
});
