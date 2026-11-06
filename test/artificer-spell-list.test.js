const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const { load } = require('./load');

function artificer(g) {
  return g.Rules.validate({
    ...g.Rules.initial(),
    classId: 'artificer',
    classSubclass: 'artificer-artillerist',
    level: 3,
    raceId: 'warforged-base-ERLW',
    backgroundId: 'guild-artisan-PHB',
    abilities: { str: 10, dex: 14, con: 14, int: 16, wis: 10, cha: 10 },
    campaignSources: ['PHB', 'TCE', 'ERLW'],
  });
}

test('saved Faerie Fire ID belongs to artificer, druid and bard without granting it to other classes', () => {
  const g = load();
  const spell = g.Catalog.spells.find(sp => sp.id === 'faeriefire');
  const s = artificer(g);
  assert.equal(spell.english, 'Faerie Fire');
  assert.equal(g.Campaign.enabled(s, spell), true);
  for (const classId of ['artificer', 'druid', 'bard', 'wizard', 'cleric', 'sorcerer', 'warlock']) {
    const view = g.Rules.validate({ ...s, classId, classSubclass: '', subclass: 'manual' });
    assert.equal(g.Classes.member(spell, view), ['artificer', 'druid', 'bard'].includes(classId), classId);
  }
  assert.equal(g.Classes.member({ ...spell, classes: ['wizard'] }, s), false);
  assert.equal(g.Campaign.enabled({ ...s, campaignSources: ['TCE'] }, spell), false);
});

test('level-three Artillerist prepares Faerie Fire normally while keeping its automatic subclass spells', () => {
  const g = load();
  g.R = g.Rules;
  g.state = artificer(g);
  g.spellById = id => g.R.allSpells(g.state).find(sp => sp.id === id);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'party-ui.js'), 'utf8'), g);
  const grants = g.Classes.granted(g.state);
  assert.deepEqual([...grants.prepared].sort(), ['shield', 'thunderwave']);
  assert.ok(!grants.prepared.includes('faeriefire'));
  g.draft = structuredClone(g.state);
  g.draft.known = ['faeriefire'];
  g.draft.prepared = ['faeriefire'];
  assert.doesNotThrow(() => vm.runInContext('PartyUI.validateRepertoire(draft)', g));
  assert.equal(g.Classes.spellCounts(g.draft).prepared, 1);
  assert.equal(g.R.stats(g.draft).prepared, 4);
  assert.ok(g.Classes.usable(g.draft).includes('faeriefire'));
  const saved = g.R.validate(JSON.parse(JSON.stringify(g.draft)));
  assert.ok(saved.prepared.includes('faeriefire'));
  assert.ok(g.Classes.usable(saved).includes('faeriefire'));
});

test('spell-class slug normalization is unambiguous and preserves every existing exact class mapping', () => {
  const g = load();
  const tokens = new Map();
  for (const [id, lists] of Object.entries(g.ClassData.spellClasses)) {
    const token = id.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (tokens.has(token)) assert.deepEqual([...lists].sort(), tokens.get(token));
    tokens.set(token, [...lists].sort());
  }
  for (const spell of g.Catalog.spells) {
    const lists = spell.classes || g.ClassData.spellClasses[spell.id];
    if (!lists) continue;
    for (const classId of ['artificer', 'druid', 'wizard', 'cleric', 'sorcerer', 'warlock', 'paladin', 'ranger']) {
      const s = g.Rules.validate({ ...g.Rules.initial(), classId, classSubclass: '', subclass: 'manual', level: 3 });
      assert.equal(g.Classes.member(spell, s), lists.includes(classId), spell.id + ' / ' + classId);
    }
  }
});
