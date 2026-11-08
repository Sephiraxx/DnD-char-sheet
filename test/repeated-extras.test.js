const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./load');

// Alto elfo druida del Círculo de las esporas armado antes de que los rasgos dieran sus conjuros solos.
const old = (g, extra = {}) =>
  g.Rules.validate({
    ...g.Rules.initial(),
    name: 'Tornasol',
    classId: 'druid',
    classSubclass: 'druid-circle-of-spores',
    level: 3,
    raceId: 'elf-high-PHB',
    abilities: { str: 8, dex: 16, con: 10, int: 12, wis: 16, cha: 13 },
    hpBase: 20,
    hp: 20,
    known: ['shillelagh', 'infestation', 'entangle', 'healingword'],
    prepared: ['entangle', 'healingword'],
    ...extra,
  });

test('extras viejos: el que ya da el círculo se va solo y el truco de raza repetido se avisa', () => {
  const g = load(),
    s = old(g, {
      extras: ['chill-touch', 'poison-spray', 'detectmagic'],
      grantChoices: { 'race:elf-high-PHB': { spells: { 'known.1._.0': ['acid-splash'] } } },
    });
  assert.deepEqual([...s.extras], ['poison-spray', 'detectmagic']);
  const rep = g.Grants.repeatedExtras(s);
  assert.equal(rep.length, 1);
  assert.equal(rep[0].id, 'poison-spray');
  assert.deepEqual([...rep[0].picked], ['acid-splash']);
  // «Usar Rociada venenosa»: pasa a ser el truco de la raza y deja de ser extra.
  g.Grants.adoptExtra(s, rep[0].key, rep[0].node, 'poison-spray');
  const v = g.Rules.validate(s);
  assert.deepEqual([...v.extras], ['detectmagic']);
  assert.ok(g.Grants.spells(v).some(x => x.id === 'poison-spray' && x.grantType === 'race'));
  assert.ok(!g.Grants.spells(v).some(x => x.id === 'acid-splash'));
  assert.equal(g.Grants.repeatedExtras(v).length, 0);
  // Total: 4 trucos y 4 conjuros de nivel 1+ (2 elegidos + 2 del círculo), más el extra del DM.
  const d = g.Classes.spellCounts(v);
  assert.deepEqual([d.cantrips, d.prepared, d.automaticKnown, d.automaticPrepared], [2, 2, 2, 2]);
});

test('extras viejos: si la elección de raza estaba vacía, el truco agregado a mano la ocupa', () => {
  const g = load(),
    s = old(g, { extras: ['fire-bolt'] });
  assert.deepEqual([...s.extras], []);
  assert.deepEqual([...s.grantChoices['race:elf-high-PHB'].spells['known.1._.0']], ['fire-bolt']);
});

test('«Son dos distintos» deja de avisar', () => {
  const g = load(),
    s = old(g, {
      extras: ['poison-spray'],
      extrasConfirmed: ['poison-spray'],
      grantChoices: { 'race:elf-high-PHB': { spells: { 'known.1._.0': ['acid-splash'] } } },
    });
  assert.equal(g.Grants.repeatedExtras(s).length, 0);
});
