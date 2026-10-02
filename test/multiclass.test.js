const test = require('node:test');
const assert = require('node:assert/strict');
const { load, fixture } = require('./load');

const g = load();
const C = g.Classes;
const wizard = () => g.Rules.validate(fixture('wizard-3.json'));
const up = (s, classId, n = 1, extra = {}) => {
  for (let i = 0; i < n; i++) s = C.levelUpSecondary(s, { classId, hpMethod: 'fixed', ...extra });
  return s;
};
const arr = x => [...x];

test('mago 3 / guerrero 2: nivel total, competencia, PG y dados de golpe', () => {
  const s = up(wizard(), 'fighter', 2);
  const st = g.Rules.stats(s);
  assert.equal(C.totalLevel(s), 5);
  assert.equal(st.prof, 3);
  assert.equal(st.maxHP, 17 + 2 * (6 + 1));
  assert.deepEqual(
    arr(st.hitDiceSet).map(x => [x.die, x.count]),
    [
      [10, 2],
      [6, 3],
    ],
  );
  // Solo el mago lanza conjuros: conserva su tabla propia.
  assert.deepEqual(arr(st.slots), [4, 2]);
  // La competencia total afecta habilidades y salvaciones.
  assert.equal(g.Rules.skillBonus(s, 'arcana'), 3 + 3);
  assert.equal(g.Rules.saveBonus(s, 'int'), 3 + 3);
  assert.equal(g.Rules.saveBonus(s, 'str'), -1);
});

test('recursos de la clase secundaria y Ataque adicional', () => {
  const s = up(wizard(), 'fighter', 5, { subclass: 'fighter-champion' });
  const names = arr(C.resources(s)).map(r => r.name);
  assert.ok(names.some(n => /Recuperación arcana/.test(n)));
  assert.ok(names.some(n => /· Guerrero/.test(n)));
  assert.equal(g.Attacks.attacksPerAction(s), 2);
  // El guerrero multiclase sabe usar armas marciales.
  assert.equal(g.Attacks.proficient(s, g.Attacks.weaponOf({ equipmentId: 'greatsword', notes: '' })), true);
});

test('dos lanzadores usan la tabla multiclase', () => {
  const s = up(wizard(), 'cleric', 2, { subclass: 'cleric-life-domain' });
  assert.deepEqual(arr(g.Rules.stats(s).slots), [4, 3, 2]);
});

test('el pacto mágico del brujo va aparte', () => {
  const s = up(wizard(), 'warlock', 2, { subclass: 'warlock-the-fiend' });
  const st = g.Rules.stats(s);
  assert.deepEqual(arr(st.slots), [4, 2]);
  assert.equal(st.pact.level, 1);
  assert.equal(st.pact.max, 2);
  assert.equal(s.pactSpent, 0);
  const t = structuredClone(s);
  t.pactSpent = 2;
  t.slotsSpent[0] = 3;
  C.reset(t, 'short');
  assert.equal(t.pactSpent, 0);
  assert.equal(t.slotsSpent[0], 3);
});

test('requisitos de multiclase y tope de nivel 20', () => {
  const s = wizard();
  assert.equal(C.meetsPrereq(s, 'fighter'), true); // DES 14
  assert.equal(C.meetsPrereq(s, 'barbarian'), false); // FUE 8
  const max = up(s, 'fighter', 17, { subclass: 'fighter-champion' });
  assert.equal(C.totalLevel(max), 20);
  assert.throws(() => up(max, 'fighter', 1, { subclass: 'fighter-champion' }), /nivel 20/);
  assert.throws(() => C.levelUp(max, { hpMethod: 'fixed' }), /nivel 20/);
  assert.throws(() => up(s, 'wizard'), /otra clase/);
});

test('subclase obligatoria al llegar a su nivel', () => {
  assert.throws(() => up(wizard(), 'cleric', 1), /subclase/);
});

test('los requisitos se pueden mostrar para cada clase', () => {
  for (const id of Object.keys(g.ClassData.classes)) assert.ok(C.PREREQ[id]?.length, id);
});

test('los conjuros de una clase secundaria se lanzan con su propia característica', () => {
  const s = g.Rules.validate(fixture('wizard-3.json')),
    id = e => g.Catalog.spells.find(x => x.english === e).id;
  s.abilities.wis = 16;
  s.multiclass = [
    {
      classId: 'cleric',
      level: 1,
      subclass: 'cleric-life-domain',
      notes: '',
      spells: [id('Guidance'), id('Bless'), id('Healing Word')],
      prepared: [id('Bless')],
    },
  ];
  g.Rules.validate(s);
  const usable = g.Classes.usable(s);
  assert.ok(usable.includes(id('Guidance')), 'trucos siempre');
  assert.ok(usable.includes(id('Bless')), 'preparado');
  assert.ok(!usable.includes(id('Healing Word')), 'no preparado');
  const caster = g.Classes.spellCaster(s, id('Bless'));
  assert.equal(caster.classId, 'cleric');
  assert.equal(g.Rules.stats(caster).dc, 8 + g.Rules.stats(s).prof + 3);
  assert.equal(g.Classes.spellCaster(s, s.known[0]).classId, 'wizard');
  s.multiclass[0].spells = 'Bless';
  assert.throws(() => g.Rules.validate(s));
});

test('los Dados de Golpe se gastan y recuperan por tipo de dado (mago 3 / guerrero 1)', () => {
  const s = up(wizard(), 'fighter');
  s.hdSpent = 0;
  const left = () => JSON.stringify(C.hitDiceLeft(s).map(x => x.left + 'd' + x.die));
  assert.equal(left(), JSON.stringify(['1d10', '3d6']));
  assert.throws(() => C.spendHitDice(s, 10, 3), /Te quedan 1d10/);
  C.spendHitDice(s, 10, 1);
  C.spendHitDice(s, 6, 2);
  assert.equal(left(), JSON.stringify(['0d10', '1d6']));
  assert.equal(s.hdSpent, 3);
  g.Rules.validate(s);
  C.recoverHitDice(s, 2);
  assert.equal(left(), JSON.stringify(['1d10', '2d6']), 'recupera primero el dado más grande');
  assert.equal(s.hdSpent, 1);
  // Gastados sin tipo (ajuste a mano): se descuentan de los dados más chicos.
  delete s.hdSpentByDie;
  s.hdSpent = 2;
  assert.equal(left(), JSON.stringify(['1d10', '1d6']));
});
