const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./load');

const make = (g, extra) =>
  g.Rules.validate({
    ...g.Rules.initial(),
    name: 'Prueba',
    abilities: { str: 8, dex: 14, con: 12, int: 10, wis: 10, cha: 16 },
    hpBase: 30,
    hp: 30,
    ...extra,
  });

test('Polivalente: suma la mitad de la competencia (hacia abajo) y se ve en el desglose', () => {
  const g = load(),
    R = g.Rules,
    s = make(g, { classId: 'bard', level: 5, proficiencies: ['performance'] });
  // Competencia +3 → +1. Atletismo con FUE 8: −1 + 1 = 0.
  assert.equal(R.skillBonus(s, 'athletics'), 0);
  assert.equal(R.partsText(R.checkParts(s, 'str', 'athletics')), '−1 FUE +1 Polivalente');
  assert.equal(R.partsText(R.checkParts(s, 'cha', 'performance')), '+3 CAR +3 Competencia');
  assert.equal(R.partsText(R.checkParts(s, 'int')), '+0 INT +1 Polivalente');
  assert.equal(R.stats(s).initiative, 3);
  const row = g.Campaign.characterTraits(s).find(r => r.key === 'class:bard:Jack of All Trades');
  assert.match(row.note, /Ya incluido en la ficha: \+1/);
});

test('Polivalente no aplica a un bardo de nivel 1; Atleta excepcional redondea hacia arriba y no se acumula', () => {
  const g = load(),
    R = g.Rules;
  assert.equal(R.halfProf(make(g, { classId: 'bard', level: 1 }), 'int'), null);
  const f = make(g, {
    classId: 'fighter',
    classSubclass: 'fighter-champion',
    level: 7,
    multiclass: [{ classId: 'bard', level: 2, subclass: '', notes: '' }],
  });
  // Nivel total 9 → competencia +4: Atleta excepcional +2, Polivalente +2; en FUE/DES/CON vale una sola.
  assert.deepEqual({ ...R.halfProf(f, 'dex') }, { label: 'Atleta excepcional', value: 2 });
  assert.deepEqual({ ...R.halfProf(f, 'wis') }, { label: 'Polivalente', value: 2 });
  assert.equal(R.partsText(R.checkParts(f, 'dex', 'stealth')), '+2 DES +2 Atleta excepcional');
});
