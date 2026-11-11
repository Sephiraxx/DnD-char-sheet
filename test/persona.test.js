const test = require('node:test');
const assert = require('node:assert/strict');
const { load, fixture } = require('./load.js');

test('personalidad: se valida, se limpia y viaja con la ficha', () => {
  const c = load(),
    s = fixture('wizard-3.json');
  s.persona = c.Persona.clean({ alignment: 'Caótico bueno', traits: '  Curiosa  ', age: '27', nope: 'x' });
  assert.deepEqual({ ...s.persona }, { alignment: 'Caótico bueno', age: '27', traits: 'Curiosa' });
  assert.doesNotThrow(() => c.Rules.validate(s));
  s.persona.alignment = 'Bueno malo';
  assert.throws(() => c.Rules.validate(s), /Alineamiento/);
});

test('idiomas y herramientas anotados aparte se suman a los concedidos sin repetir', () => {
  const c = load(),
    s = fixture('wizard-3.json'),
    before = c.Grants.proficiencies(s, 'language');
  c.Persona.setExtra(s, 'language', ['Draconic', before[0], 'draconic']);
  c.Persona.setExtra(s, 'tool', ['lute']);
  assert.deepEqual([...s.extraProfs.language], ['draconic']);
  assert.ok(c.Grants.proficiencies(s, 'language').includes('draconic'));
  assert.ok(c.Grants.proficiencies(s, 'tool').includes('lute'));
  assert.doesNotThrow(() => c.Rules.validate(s));
  c.Persona.setExtra(s, 'language', []);
  c.Persona.setExtra(s, 'tool', []);
  assert.equal(s.extraProfs, undefined);
});

test('saltos según la Fuerza', () => {
  const c = load(),
    s = fixture('wizard-3.json');
  s.abilities.str = 16;
  const j = c.Persona.jumps(s);
  assert.equal(j.long, c.Rules.formScores ? j.long : 16);
  assert.equal(j.high, 3 + Math.floor((j.long - 10) / 2));
  assert.equal(j.longStanding, Math.floor(j.long / 2));
});

test('magia salvaje: las tablas del libro cubren todo el dado', () => {
  const c = load();
  for (const [id, t] of Object.entries(c.Surge.TABLES)) {
    const rows = c.Surge.rows(id);
    for (let n = 1; n <= t.sides; n++) assert.ok(c.Surge.pick(rows, n), `${id} ${n}`);
  }
});

test('secuaces: clase, nivel y bono de competencia', () => {
  const c = load(),
    s = fixture('wizard-3.json');
  s.companions = [
    {
      id: 'a',
      kind: 'sidekick',
      name: 'Tam',
      ac: 12,
      maxHp: 11,
      hp: 11,
      attacks: [],
      notes: '',
      side: { cls: 'expert', level: 9 },
    },
  ];
  assert.doesNotThrow(() => c.Rules.validate(s));
  const k = c.Companions.sidekick(s.companions[0]);
  assert.equal(k.prof, 4);
  assert.equal(k.nextAsi, 10);
  s.companions[0].side.cls = 'bard';
  assert.throws(() => c.Rules.validate(s));
});
