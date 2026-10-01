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
