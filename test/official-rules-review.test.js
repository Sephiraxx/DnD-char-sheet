const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { load } = require('./load');
const review = require('../tools/official-rules-reviews.json');
const { plain, renderer } = require('../tools/official-rules-text');
const hash = text => crypto.createHash('sha256').update(text).digest('hex');

test('every published spell and feature block has an exact reviewed identity and intact text', () => {
  const g = load(),
    d = g.OfficialContentData;
  const books = new Set(d.books.map(b => b.id));
  const rules = new Map(review.rules.map(r => [r.key, r]));
  const spells = new Map(review.spells.map(r => [r.id, r]));
  assert.equal(review.unsupported.length, 0);
  assert.equal(rules.size, d.rules.length);
  assert.equal(spells.size, d.spells.length);
  for (const row of d.rules) {
    const r = rules.get(row.key),
      text = row.data.text;
    assert.ok(r && row.data.reviewed, row.key);
    assert.equal(row.data.reference, r.reference);
    assert.equal(hash(text), r.sha256, row.key);
    assert.ok(books.has(row.data.bookId));
    assert.ok(!/\{@|\[object Object\]|undefined|\|XPHB\||\|EFA\|/.test(text + row.data.reference), row.key);
  }
  for (const row of d.spells) {
    const r = spells.get(row.id);
    assert.ok(r && row.reviewed, row.id);
    assert.equal(row.reference, r.reference);
    assert.equal(hash(row.text + '\n' + row.higher), r.sha256, row.id);
    assert.ok(books.has(row.bookId));
    assert.ok(g.Catalog.spells.some(s => s.id === row.canonicalId));
    assert.ok(!/\{@|\[object Object\]|undefined/.test(row.text + row.higher), row.id);
  }
});

test('spell rules retain base damage, upcasting, consumed materials, and newly recovered descriptions', () => {
  const g = load(),
    spell = id => g.OfficialContent.spellTexts.get(id);
  assert.match(spell('fireball').text, /8d6 fire damage/);
  assert.match(spell('fireball').higher, /1d6 for each slot level above 3rd/);
  assert.match(spell('chromatic-orb').text, /3d8/);
  assert.match(spell('chromatic-orb').spellDetails.components, /diamond worth at least 50 gp/);
  assert.match(spell('ceremony').spellDetails.components, /25 gp.*consumes/);
  assert.match(spell('ceremony').text, /Wedding/);
  assert.match(spell('summon-draconic-spirit').spellDetails.components, /500 gp/);
  assert.match(spell('summon-draconic-spirit').higher, /6th level or higher/);
  assert.equal(g.Catalog.spells.find(s => s.id === 'wristpocket').ritual, true);
  for (const id of review.addedSpells) assert.ok(spell(id)?.text.length > 40, id);
  const html = g.OfficialContent.spellHtml('ceremony');
  assert.match(html, /Tiempo de lanzamiento: 1 hour \(ritual\)/);
  assert.match(html, /texto en inglés/);
  assert.doesNotMatch(html, /PDF p\. null/);
});

test('feature boundaries, subfeatures, tables and feat ability bonuses survive the repair', () => {
  const g = load(),
    rule = key => g.OfficialContent.ruleTexts.get(key)?.text;
  const chromatic = rule('feat:gift-of-the-chromatic-dragon');
  assert.match(chromatic, /Chromatic Infusion/);
  assert.match(chromatic, /Reactive Resistance/);
  assert.doesNotMatch(chromatic, /Telekinetic Reprisal|Protective Wings/);
  assert.match(
    rule('feat:gift-of-the-gem-dragon'),
    /Intelligence or Wisdom or Charisma score by 1, to a maximum of 20/,
  );
  assert.match(rule('sub:sorcerer-lunar-sorcery:Lunar Boons'), /by 1 \(minimum (?:of )?0\)/);
  assert.match(rule('sub:sorcerer-lunar-sorcery:Lunar Boons'), /New Moon\nEnchantment and necromancy/);
  assert.match(rule('sub:sorcerer-lunar-sorcery:Lunar Boons'), /Crescent Moon\nIllusion and transmutation/);
  assert.match(rule('sub:sorcerer-lunar-sorcery:Lunar Phenomenon'), /3d10 necrotic damage/);
  assert.doesNotMatch(rule('sub:sorcerer-lunar-sorcery:Lunar Phenomenon'), /HUMAN SORCERER|KRVNN/);
  assert.match(
    rule('sub:sorcerer-lunar-sorcery:Lunar Sorcery'),
    /Lunar Embodiment[\s\S]*Lunar Spells[\s\S]*Full Moon[\s\S]*Moon Fire/,
  );
  assert.match(rule('class:wizard:Spellcasting/Libro de conjuros'), /six 1st-level wizard spells/);
  assert.doesNotMatch(rule('class:wizard:Spellcasting/Libro de conjuros'), /Ritual Casting|Arcane Recovery/);
  assert.match(rule('opt:water-whip-PHB'), /3d10 bludgeoning/);
  for (const key of review.addedRules) assert.ok(rule(key)?.length > 0, key);
});

test('Blessed Strikes uses the optional 8th-level Tasha rule on older domains', () => {
  const g = load();
  const feature = g.ClassData.subclasses
    .find(s => s.id === 'cleric-life-domain')
    .features.find(f => f.english === 'Blessed Strikes');
  assert.equal(feature.source, 'TCE');
  assert.equal(feature.optional, true);
  const s = {
    classId: 'cleric',
    classSubclass: 'cleric-life-domain',
    level: 8,
    optionalClassFeatures: false,
    campaignSources: ['PHB', 'TCE'],
  };
  assert.ok(!g.Classes.features(s).some(f => f.english === 'Blessed Strikes'));
  s.optionalClassFeatures = true;
  assert.ok(g.Classes.features(s).some(f => f.english === 'Blessed Strikes'));
  s.campaignSources = ['PHB'];
  assert.ok(!g.Classes.features(s).some(f => f.english === 'Blessed Strikes'));
  const text = g.OfficialContent.ruleTexts.get('sub:cleric-life-domain:Blessed Strikes').text;
  assert.match(text, /8th-level[\s\S]*replaces the Divine Strike[\s\S]*1d8 radiant/);
});

test('structured rule rendering preserves dice and table cells and rejects unresolved references', () => {
  assert.equal(plain('{@damage 8d6}'), '8d6');
  assert.equal(plain('{@scaledamage 8d6|3-9|1d6}'), '1d6');
  assert.equal(plain('{@b {@spell shield|PHB}}'), 'shield');
  assert.equal(plain('{@book chapter 10|PHB|10}'), 'chapter 10');
  const r = renderer({ classes: {}, options: [] });
  assert.equal(
    r.prose({
      type: 'table',
      colLabels: ['Roll', 'Result'],
      rows: [
        [{ type: 'cell', roll: { exact: 0 } }, 'None'],
        [{ type: 'cell', roll: { min: 1, max: 3 } }, 'Some'],
      ],
    }),
    'Roll | Result\n0 | None\n1–3 | Some',
  );
  assert.throws(
    () => r.prose({ type: 'refSubclassFeature', subclassFeature: 'Unknown|Wizard||Evocation||2' }),
    /Unresolved feature reference/,
  );
});
