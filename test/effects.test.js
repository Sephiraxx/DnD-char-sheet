const test = require('node:test');
const assert = require('node:assert/strict');
const { load, fixture } = require('./load');

const g = load();
const E = g.Effects;
const sheet = () => g.Rules.validate(fixture('wizard-3.json'));

test('duraciones de conjuros en rondas', () => {
  assert.equal(E.roundsFrom('Concentración, hasta 1 minuto'), 10);
  assert.equal(E.roundsFrom('Hasta 8 horas'), 4800);
  assert.equal(E.roundsFrom('1 asalto'), 1);
  assert.equal(E.roundsFrom('Instantáneo'), 0);
  assert.equal(E.roundsFrom('Hasta que termine o sea disipado'), null);
});

test('descuentan una ronda por turno y terminan solos', () => {
  const s = sheet();
  E.add(s, { name: 'Bendición', rounds: 2 });
  E.add(s, { name: 'Marca', rounds: null });
  assert.deepEqual([...E.tick(s)], []);
  assert.deepEqual([...E.tick(s)], ['Bendición']);
  assert.deepEqual(
    [...E.list(s)].map(x => x.name),
    ['Marca'],
  );
  assert.ok(g.Rules.validate(s));
});

test('los efectos de concentración terminan con la concentración', () => {
  const s = sheet();
  s.concentration = 'bless';
  E.add(s, { name: 'Bendición', rounds: 10, concentration: 'bless' });
  E.sync(s);
  assert.equal(E.list(s).length, 1);
  s.concentration = null;
  E.sync(s);
  assert.equal(E.list(s).length, 0);
});

test('lanzar un conjuro con duración anota el efecto', () => {
  const s = sheet();
  const bless = g.Catalog.spells.find(x => x.english === 'Bless');
  E.fromSpell(s, bless);
  assert.equal(E.list(s)[0].rounds, 10);
  assert.equal(E.list(s)[0].concentration, bless.id);
  E.fromSpell(
    s,
    g.Catalog.spells.find(x => x.english === 'Fire Bolt'),
  );
  assert.equal(E.list(s).length, 1);
});

test('el efecto de un aliado se reemplaza al relanzarlo y se quita por su vínculo', () => {
  const s = sheet();
  E.add(s, { name: 'Bendecir (de Tobías)', rounds: 6, from: 'dm', link: 'tobias:bless' });
  E.add(s, { name: 'Bendecir (de Tobías)', rounds: 10, from: 'dm', link: 'tobias:bless' });
  E.add(s, { name: 'Bendecir (de Ana)', rounds: 10, from: 'dm', link: 'ana:bless' });
  assert.deepEqual(JSON.parse(JSON.stringify(E.list(s).map(x => [x.name, x.rounds]))), [
    ['Bendecir (de Tobías)', 10],
    ['Bendecir (de Ana)', 10],
  ]);
  assert.ok(E.valid(s));
  s.timedEffects[0].link = 'x'.repeat(121);
  assert.equal(E.valid(s), false);
});
