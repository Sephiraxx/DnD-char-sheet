const test = require('node:test');
const assert = require('node:assert/strict');
const { load, fixture } = require('./load');

const g = load();
const D = g.Defenses;
const wizard = () => g.Rules.validate(fixture('wizard-3.json'));

test('tipos de daño en inglés o castellano', () => {
  assert.equal(D.normalize('Fuego'), 'fire');
  assert.equal(D.normalize('psíquico'), 'psychic');
  assert.equal(D.normalize('slashing'), 'slashing');
  assert.equal(D.normalize('nada'), '');
});

test('la resistencia de la raza reduce a la mitad (tiefling y fuego)', () => {
  const s = wizard();
  s.raceId = 'tiefling-base-PHB';
  const r = D.apply(s, D.partsOf({ amount: 13, type: 'fuego' }));
  assert.equal(r.total, 6);
  assert.match(r.notes[0], /resistencia a fuego/);
  assert.equal(D.apply(s, D.partsOf({ amount: 13, type: 'frío' })).total, 13);
});

test('la Furia resiste contundente, perforante y cortante; partes con tipos distintos', () => {
  const s = wizard();
  s.raging = true;
  const r = D.apply(s, [
    { amount: 9, type: 'cortante' },
    { amount: 7, type: 'fuego' },
  ]);
  assert.equal(r.total, 4 + 7);
});

test('inmunidad y vulnerabilidad anotadas', () => {
  const s = wizard();
  s.defenses = { resist: [], immune: ['poison'], vulnerable: ['thunder'] };
  assert.equal(g.Rules.validate(s).defenses.immune[0], 'poison');
  assert.equal(D.apply(s, D.partsOf({ amount: 10, type: 'veneno' })).total, 0);
  assert.equal(D.apply(s, D.partsOf({ amount: 5, type: 'thunder' })).total, 10);
  s.defenses = { resist: ['plasma'] };
  assert.throws(() => g.Rules.validate(s));
});

test('sin tipo, el daño queda igual', () => {
  const s = wizard();
  s.raging = true;
  assert.equal(D.apply(s, D.partsOf({ amount: 8 })).total, 8);
});
