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

test('una ficha de la primera versión (sin clase) pasa a ser de bardo y sigue funcionando', () => {
  const old = fixture('legacy-darien.json');
  assert.equal(old.classId, undefined);
  const s = g.Rules.validate(old);
  assert.equal(s.classId, 'bard');
  assert.equal(s.classSubclass, 'bard-college-of-eloquence');
  assert.equal(g.Classes.sub(s).english, 'College of Eloquence');
  assert.equal(s.name, 'Darien Voss');
  assert.equal(s.level, 2);
  assert.equal(s.known.length, 6);
  assert.ok(s.legacyPortrait);
  assert.equal(g.Rules.stats(s).maxHP, 13 + 2 * 2);
  const up = g.Classes.levelUp(s, { hpMethod: 'fixed' });
  assert.equal(up.level, 3);
});

test('la ficha nueva en blanco ya no es la de Darien', () => {
  const s = g.Rules.validate(g.Rules.initial());
  assert.equal(s.classId, 'bard');
  assert.ok(!/Darien/.test(JSON.stringify(s)));
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

test('cobrar monedas da cambio y rechaza si no alcanza', () => {
  g.vm = g.vm || require('vm');
  require('vm').runInContext(
    require('fs').readFileSync(require('path').join(__dirname, '..', 'party-view.js'), 'utf8'),
    g,
  );
  const pay = g.PartyView.pay;
  const wallet = { cp: 0, sp: 3, ep: 0, gp: 2, pp: 1 };
  assert.deepEqual({ ...pay(wallet, { gp: 2 }) }, { cp: 0, sp: 3, ep: 0, gp: 0, pp: 1 });
  // 5 po con 2 po y 1 platino: rompe el platino y devuelve cambio.
  assert.deepEqual({ ...pay(wallet, { gp: 5 }) }, { cp: 0, sp: 3, ep: 0, gp: 7, pp: 0 });
  // 25 pc con 3 piezas de plata: paga 3 pp y recibe 5 pc.
  assert.deepEqual({ ...pay({ cp: 0, sp: 3 }, { cp: 25 }) }, { cp: 5, sp: 0, ep: 0, gp: 0, pp: 0 });
  assert.equal(pay(wallet, { pp: 2 }), null);
});
