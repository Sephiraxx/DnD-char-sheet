const test = require('node:test');
const assert = require('node:assert/strict');
const { load, fixture } = require('./load');

const g = load();
const A = g.Attacks;
const seq = values => () => values.shift();
const wizard = () => g.Rules.validate(fixture('wizard-3.json'));
const item = (equipmentId, name, extra = {}) => ({
  id: 'i-' + equipmentId,
  equipmentId,
  name,
  qty: 1,
  category: 'Armas',
  weight: 1,
  location: 'Con el personaje',
  notes: '',
  ...extra,
});

test('el bastón del mago usa FUE y tiene competencia', () => {
  const s = wizard();
  const p = A.profile(s, s.inventory[0]);
  assert.equal(p.ability, 'str');
  assert.equal(p.proficient, true);
  assert.equal(p.toHit, -1 + 2);
  assert.equal(p.dice, '1d6');
  assert.equal(A.profile(s, s.inventory[0], { twoHands: true }).dice, '1d8');
});

test('sutileza elige la mejor característica; arma marcial sin competencia', () => {
  const s = wizard();
  const rapier = A.profile(s, item('rapier', 'Estoque'));
  assert.equal(rapier.ability, 'dex');
  assert.equal(rapier.proficient, false);
  assert.equal(rapier.toHit, 2);
  // El elfo alto sabe usar espada larga por su raza.
  assert.equal(A.profile(s, item('longsword', 'Espada larga')).proficient, true);
});

test('guerrero con Arquería y Duelo', () => {
  const s = { ...wizard(), classId: 'fighter', classSubclass: '', classChoices: { styles: ['archery-PHB'] } };
  const bow = A.profile(s, item('longbow', 'Arco largo'));
  assert.equal(bow.ability, 'dex');
  assert.equal(bow.toHit, 2 + 2 + 2);
  s.classChoices = { styles: ['dueling-PHB'] };
  assert.equal(A.profile(s, item('longsword', 'Espada larga')).dmgMod, -1 + 2);
  assert.equal(A.profile(s, item('longsword', 'Espada larga'), { twoHands: true }).dmgMod, -1);
  assert.equal(A.attacksPerAction({ ...s, level: 5 }), 2);
});

test('mano torpe no suma modificador positivo salvo con el estilo', () => {
  const s = { ...wizard(), abilities: { ...wizard().abilities, dex: 16 } };
  assert.equal(A.profile(s, item('dagger', 'Daga'), { mode: 'bonus' }).dmgMod, 0);
  s.classChoices = { styles: ['two-weapon-fighting-PHB'] };
  assert.equal(A.profile(s, item('dagger', 'Daga'), { mode: 'bonus' }).dmgMod, 3);
});

test('ajustes del arma: característica, competencia y bono mágico', () => {
  const s = wizard();
  const p = A.profile(
    s,
    item('rapier', 'Estoque +1', { attack: { ability: 'int', proficient: true, magic: 1, extra: '1d6 fuego' } }),
  );
  assert.equal(p.toHit, 3 + 2 + 1);
  assert.equal(p.dmgMod, 3 + 1);
  const dmg = A.rollDamage(p, false, seq([5, 4]));
  assert.equal(dmg.total, 5 + 4 + 4);
});

test('ventaja, crítico y daño duplicado', () => {
  const s = wizard();
  const p = A.profile(s, item('dagger', 'Daga'));
  const atk = A.rollAttack(p, 'adv', seq([7, 20]));
  assert.equal(atk.kept, 20);
  assert.equal(atk.crit, true);
  const dis = A.rollAttack(p, 'dis', seq([7, 20]));
  assert.equal(dis.kept, 7);
  const dmg = A.rollDamage(p, true, seq([3, 4]));
  assert.deepEqual([...dmg.parts[0].rolls], [3, 4]);
  assert.equal(dmg.total, 3 + 4 + 2);
});

test('monje: artes marciales para armas de monje y golpes sin armas', () => {
  const s = { ...wizard(), classId: 'monk', level: 5 };
  const fist = A.options(s).find(x => x.unarmed);
  assert.equal(A.profile(s, fist).dice, '1d6');
  assert.equal(A.profile(s, item('dagger', 'Daga')).dice, '1d6');
  assert.equal(A.profile(s, item('dagger', 'Daga')).ability, 'dex');
});

test('las opciones listan armas del inventario y el golpe sin armas', () => {
  const names = A.options(wizard()).map(x => x.name);
  assert.deepEqual([...names], ['Bastón', 'Golpe sin armas']);
});
