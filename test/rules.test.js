const test = require('node:test');
const assert = require('node:assert/strict');
const { load, fixture } = require('./load');

const g = load();
const wizard = () => g.Rules.validate(fixture('wizard-3.json'));

test('una ficha de clase válida pasa la validación', () => {
  const s = wizard();
  assert.equal(s.classId, 'wizard');
  assert.equal(s.name, 'Lyra Test');
});

test('la validación rechaza datos corruptos', () => {
  const s = wizard();
  s.hp = -5;
  assert.throws(() => g.Rules.validate(s));
  assert.throws(() => g.Rules.validate({ ...wizard(), abilities: null }));
});

test('la ficha heredada (Darien) sigue siendo válida', () => {
  const s = g.Rules.validate(g.Rules.initial());
  assert.equal(s.classId, undefined);
  assert.ok(s.name);
});

test('estadísticas de un mago de nivel 3', () => {
  const st = g.Rules.stats(wizard());
  assert.equal(st.prof, 2);
  assert.equal(st.mods.int, 3);
  assert.equal(st.dc, 13);
  assert.equal(st.attack, 5);
  assert.deepEqual([...st.slots], [4, 2]);
  assert.equal(st.ac, 12);
  assert.equal(st.maxHP, 17);
});

test('turno de combate: acción, adicional y reacción', () => {
  const s = wizard();
  g.Combat.start(s);
  g.Combat.use(s, 'action', 'Esquivar');
  assert.throws(() => g.Combat.use(s, 'action', 'Correr'), /Ya usaste tu acción/);
  g.Combat.use(s, 'reaction', 'Escudo');
  assert.throws(() => g.Combat.use(s, 'reaction', 'Escudo'), /reacción/);
  g.Combat.end(s);
  assert.throws(() => g.Combat.use(s, 'bonus', 'Algo'), /Esperá tu turno/);
  g.Combat.start(s);
  assert.equal(s.reactionUsed, false);
});

test('a 0 PG no se puede actuar', () => {
  const s = wizard();
  s.hp = 0;
  assert.match(g.Combat.blocked(s, 'action'), /incapacitado/);
});

test('almacenamiento local: agregar, listar y eliminar fichas', () => {
  const store = g.CharacterStorage;
  g.localStorage.clear();
  const a = store.add(wizard());
  const b = store.add({ ...wizard(), name: 'Otra' });
  assert.deepEqual(
    [...store.list()].map(x => x.name),
    ['Lyra Test', 'Otra'],
  );
  g.localStorage.setItem('dnd-party-active-v1', a);
  store.remove(b);
  assert.equal(store.list().length, 1);
  assert.throws(() => store.remove(a), /Cambiá de personaje/);
});
