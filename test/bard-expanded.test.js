// Conjuros adicionales del bardo (Tasha): Ayuda, Orden imperiosa, Lentitud… aparecen si Tasha está habilitado.
const test = require('node:test');
const assert = require('node:assert/strict');
const { load, fixture } = require('./load');

test('un bardo de nivel 3 puede aprender Ayuda con Tasha habilitado, y no sin Tasha', () => {
  const g = load();
  let s = fixture('wizard-3.json');
  Object.assign(s, {
    classId: 'bard',
    classSubclass: '',
    known: [],
    prepared: [],
    extras: [],
    classChoices: {},
    arcanum: {},
    spellModes: {},
    customSpells: [],
  });
  s = g.Rules.validate(s);
  const aid = g.Catalog.spells.find(x => x.english === 'Aid');
  assert.equal(g.Classes.member(aid, s), true);
  assert.equal(g.Classes.member(aid, { ...s, campaignSources: ['PHB', 'XGE'] }), false);
  assert.equal(
    g.Classes.member(aid, { ...s, campaignSources: ['PHB'], progression: { ...s.progression, expanded: true } }),
    true,
  );
});
