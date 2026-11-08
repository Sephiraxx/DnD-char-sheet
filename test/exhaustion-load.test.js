const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./load');

const make = (g, extra = {}) =>
  g.Rules.validate({
    ...g.Rules.initial(),
    name: 'Prueba',
    classId: 'fighter',
    level: 4,
    raceId: 'human-base-PHB',
    abilities: { str: 10, dex: 14, con: 14, int: 10, wis: 10, cha: 10 },
    hpBase: 10,
    hp: 10,
    speed: 30,
    ...extra,
  });

test('agotamiento: velocidad, PG máximos, descanso largo y límites', () => {
  const g = load(),
    R = g.Rules;
  const s = make(g);
  const full = R.stats(s).maxHP;
  assert.equal(R.speedInfo({ ...s, exhaustion: 1 }).speed, 30);
  assert.equal(R.speedInfo({ ...s, exhaustion: 2 }).speed, 15);
  assert.equal(R.speedInfo({ ...s, exhaustion: 5 }).speed, 0);
  assert.equal(R.stats({ ...s, exhaustion: 3 }).maxHP, full);
  assert.equal(R.stats({ ...s, exhaustion: 4 }).maxHP, Math.floor(full / 2));
  assert.deepEqual(
    [...R.exhaustionEffects({ ...s, exhaustion: 2 })],
    ['1: desventaja en las pruebas de característica', '2: velocidad a la mitad'],
  );
  const t = { ...s, exhaustion: 2 };
  g.Classes.reset(t, 'long');
  assert.equal(t.exhaustion, 1);
  g.Classes.reset(t, 'short');
  assert.equal(t.exhaustion, 1);
  assert.throws(() => R.validate({ ...s, exhaustion: 7 }), /agotamiento/);
});

test('carga: FUE × 15, monedas, lo que está en la mula no cuenta y la regla variante', () => {
  const g = load(),
    R = g.Rules;
  const item = (name, weight, qty = 1, location = 'Con el personaje') => ({
    id: name,
    name,
    qty,
    category: 'Equipo',
    weight,
    location,
    notes: '',
  });
  // FUE 10 → capacidad 150 lb. 100 lb de equipo + 500 monedas (10 lb) = 110 lb.
  let s = make(g, {
    inventory: [item('Cofre', 100), item('Yunque', 200, 1, 'En la mula'), item('Libro', null)],
    gold: { cp: 0, sp: 0, ep: 0, gp: 500, pp: 0 },
  });
  let c = R.carrying(s);
  assert.deepEqual([c.weight, c.capacity, c.level, c.unknown], [110, 150, 'ok', 1]);
  // Regla variante: más de 50 lb (FUE × 5) cargado, más de 100 (FUE × 10) muy cargado.
  s = { ...s, encumbranceVariant: true };
  assert.equal(R.carrying(s).level, 'heavy');
  assert.equal(R.speedInfo(s).speed, 10);
  // Con agotamiento 2 además: (30 − 20) / 2.
  assert.equal(R.speedInfo({ ...s, exhaustion: 2 }).speed, 5);
  // Sin la variante: más de la capacidad → 5 pies; más del doble → no se mueve.
  s = make(g, { inventory: [item('Piedras', 200)] });
  assert.equal(R.carrying(s).level, 'over');
  assert.equal(R.speedInfo(s).speed, 5);
  s = make(g, { inventory: [item('Piedras', 301)] });
  assert.equal(R.speedInfo(s).speed, 0);
});

test('munición: cada disparo gasta una flecha y después del combate se recupera la mitad', () => {
  const g = load(),
    A = g.Attacks;
  const bow = {
    id: 'bow',
    equipmentId: 'longbow',
    name: 'Arco largo',
    qty: 1,
    category: 'Armas',
    weight: 2,
    location: 'Con el personaje',
    notes: '',
  };
  const arrows = {
    id: 'ar',
    equipmentId: 'arrow',
    name: 'Flecha',
    qty: 3,
    category: 'Equipo',
    weight: 0.05,
    location: 'Con el personaje',
    notes: '',
  };
  const magic = { ...arrows, id: 'ar1', equipmentId: '', name: 'Flecha +1', qty: 1, magic: { id: 'x' } };
  const sword = {
    id: 'sw',
    equipmentId: 'longsword',
    name: 'Espada larga',
    qty: 1,
    category: 'Armas',
    weight: 3,
    location: 'Con el personaje',
    notes: '',
  };
  const s = { inventory: [bow, arrows, magic, sword] };
  assert.equal(A.ammoFor(s, sword), null, 'un arma cuerpo a cuerpo no gasta munición');
  let a = A.ammoFor(s, bow);
  assert.deepEqual([a.label, a.total, a.next.id], ['flechas', 4, 'ar']);
  for (let i = 0; i < 3; i++) A.spendAmmo(s, bow);
  assert.equal(s.inventory[1].qty, 0);
  // Sin flechas comunes, sale la mágica.
  assert.equal(A.spendAmmo(s, bow), 'Flecha +1');
  assert.equal(A.spendAmmo(s, bow), '', 'sin munición no gasta nada');
  assert.deepEqual(JSON.parse(JSON.stringify(A.ammoRecovery(s).map(x => [x.name, x.used, x.back]))), [
    ['Flecha', 3, 1],
    ['Flecha +1', 1, 0],
  ]);
  A.recoverAmmo(s);
  assert.equal(s.inventory[1].qty, 1);
  assert.equal(s.ammoUsed, undefined);
});
