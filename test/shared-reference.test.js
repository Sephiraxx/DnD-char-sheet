const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createHash } = require('node:crypto');
const { load } = require('./load');
const review = require('../tools/shared-reference-review.json');
const g = load();
vm.runInContext(fs.readFileSync(path.join(__dirname, '../monsters-data.js'), 'utf8'), g);
const monsters = [...g.MonsterData, ...g.BookContentData.monsters];

test('every supported official character option has an exact-source complete shared reference', () => {
  const groups = {
    background: g.CampaignData.backgrounds,
    race: g.CampaignData.races,
    feat: g.Catalog.feats,
    option: g.ClassData.options,
    class: Object.values(g.ClassData.classes),
    subclass: g.ClassData.subclasses.filter(r => r.source !== 'TDCSR'),
  };
  assert.equal(g.OfficialContent.entryTexts.size, 674);
  assert.equal(g.OfficialContent.spellTexts.size, 524);
  assert.equal(g.OfficialContent.itemTexts.size, 732);
  assert.equal(review.unmatched.length, 0);
  for (const [kind, rows] of Object.entries(groups)) {
    for (const row of rows) {
      const ref = g.OfficialContent.entryTexts.get(kind + ':' + row.id);
      assert.ok(ref?.bundled && ref.text.length > 15, kind + ':' + row.id);
      assert.equal(ref.sourceKey, row.sourceKey || row.source, row.id);
      assert.equal(ref.rulesLanguage, 'en');
      assert.ok(!/\{@|\{=|\[object Object\]|undefined/.test(ref.text), row.id);
      assert.ok(!['XPHB', 'XDMG', 'XMM', 'EFA', 'TDCSR'].includes(ref.sourceKey));
      assert.match(g.OfficialContent.entryHtml(kind, row.id), /texto en inglés/);
    }
  }
  for (const [kind, rows] of Object.entries({ ...groups, spell: g.Catalog.spells, item: g.MagicItems.ITEMS })) {
    assert.equal(new Set(rows.map(r => r.id)).size, rows.length, kind + ' IDs');
    if (kind !== 'race')
      assert.equal(new Set(rows.map(r => (r.english || r.name).toLowerCase())).size, rows.length, kind + ' names');
  }
  for (const field of ['entries', 'features']) {
    const data = g.SharedReferenceData[field];
    assert.equal(data.length, review[field].length);
    data.forEach((r, i) => {
      assert.equal(r.key, review[field][i].key);
      assert.equal(createHash('sha256').update(r.text).digest('hex'), review[field][i].sha256, r.key);
    });
  }
});

test('copied backgrounds, inherited races and nested subclass rules retain their actual rules', () => {
  const text = key => g.OfficialContent.entryTexts.get(key).text;
  assert.match(text('background:acolyte-PHB'), /Shelter of the Faithful/);
  const gladiator = text('background:variant-entertainer-gladiator-PHB');
  assert.match(gladiator, /trident or net/);
  assert.match(gladiator, /combat for entertainment/);
  assert.match(text('background:variant-guild-artisan-guild-merchant-PHB'), /mule and cart/);
  const dwarf = text('race:dwarf-hill-PHB');
  assert.match(dwarf, /Dwarven Toughness/);
  assert.match(dwarf, /Dwarven Resilience/);
  assert.match(dwarf, /Dwarven Combat Training/);
  assert.match(text('subclass:artificer-alchemist'), /Experimental Elixir/);
  assert.match(text('subclass:artificer-alchemist'), /Chemical Mastery/);
  g.esc = value =>
    String(value ?? '').replace(
      /[&<>"']/g,
      c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  assert.match(
    g.Campaign.originInfo(
      g.CampaignData.races.find(r => r.id === 'dwarf-hill-PHB'),
      'race',
    ),
    /Velocidad de referencia/,
  );
});

test('identical creature reprints display once without deleting records or merging distinct versions', () => {
  const visible = g.ContentIndex.list('creature', monsters);
  assert.equal(monsters.length, 2525);
  assert.equal(visible.length, 1922);
  assert.equal(new Set(visible.map(r => r.name)).size, visible.length);
  for (const group of g.SharedReferenceData.duplicateGroups.filter(r => r.kind === 'creature')) {
    assert.ok(group.ids.every(id => monsters.some(r => r.id === id)));
    assert.equal(visible.filter(r => group.ids.includes(r.id)).length, 1);
    const legacy = group.ids.find(id => id !== group.preferred);
    assert.ok(g.ContentIndex.unique('creature', monsters, [legacy]).some(r => r.id === legacy));
  }
  const variants = visible.filter(r => r.english === 'Bard');
  assert.ok(variants.length > 1);
  assert.ok(variants.every(r => /versión/.test(r.name)));
  assert.equal(
    g.ContentIndex.unique('creature', [
      { id: 'custom-a', name: 'Wolf' },
      { id: 'custom-b', name: 'Wolf' },
    ]).length,
    2,
  );
  assert.equal(g.BookContentData.monsters.length, 2191);
  assert.equal(g.MonsterData.length, 334);
});

test('book-only filters and previous race selections survive duplicate consolidation', () => {
  const races = g.CampaignData.races;
  assert.equal(races.length, 155);
  assert.equal(g.ContentIndex.unique('race', races).length, 154);
  const legacy = 'harengon-base-WBtW';
  const selected = g.Campaign.options('races', { campaignSources: ['MPMM'] }, legacy);
  assert.equal(selected.filter(([id]) => /^harengon/.test(id)).length, 1);
  assert.ok(selected.some(([id]) => id === legacy));
  const bookOnly = g.Campaign.options('races', { campaignSources: ['WBtW'] });
  assert.ok(bookOnly.some(([id]) => id === legacy));
  const byBook = monsters.filter(r => r.bookId === '17182bc795d5ced5');
  assert.equal(
    g.ContentIndex.unique('creature', byBook).length,
    new Set(byBook.map(r => r.reference + ':' + r.hp)).size,
  );
});

test('ambiguous magic-item IDs migrate by the saved item name and keep inventory effects', () => {
  for (const fix of g.SharedReferenceData.itemIds) {
    const correct = g.MagicItems.byId(fix.id);
    assert.ok(correct, fix.name);
    const magic = g.MagicItems.fromCatalog(correct.id);
    const row = { name: fix.name, qty: 1, magic: { ...structuredClone(magic), id: fix.oldId } };
    g.MagicItems.validate({ inventory: [row] });
    assert.equal(row.magic.id, correct.id, fix.name);
    assert.deepEqual({ ...row.magic, id: correct.id }, structuredClone(magic), fix.name);
    assert.ok(g.OfficialContent.itemTexts.get(correct.id)?.text.length > 70, fix.name);
  }
  const claws = g.MagicItems.ITEMS.find(r => r.english === 'Claws of the Umber Hulk');
  const machine = g.MagicItems.ITEMS.find(r => r.english === 'The Infernal Machine of Lum the Mad');
  assert.notEqual(claws.id, machine.id);
  assert.match(g.OfficialContent.itemTexts.get(claws.id).text, /burrowing speed/);
  assert.match(g.OfficialContent.itemTexts.get(machine.id).text, /Lum/);
  assert.equal(g.ContentIndex.inventoryId(claws.id, claws.name), claws.id);
});

test('equivalent source IDs share filters while adventures stay out of selectors', () => {
  const available = new Set(g.Campaign.availableSources().map(([id]) => id));
  for (const [alias, canonical] of Object.entries(g.SharedReferenceData.sourceAliases)) {
    assert.ok(!available.has(alias));
    assert.ok(g.Campaign.enabled({ campaignSources: [alias] }, { sourceKey: canonical }));
    assert.ok(g.Campaign.enabled({ campaignSources: [canonical] }, { sourceKey: alias }));
  }
  for (const id of g.OfficialContent.adventureSources) assert.ok(!available.has(id));
  for (const file of ['index.html', 'dm.html', 'board.html', 'compendium.html']) {
    const html = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    assert.ok(html.indexOf('shared-reference-data.js') < html.indexOf('official-content.js'), file);
    assert.ok(html.indexOf('content-index.js') > html.indexOf('official-content.js'), file);
  }
  const sw = fs.readFileSync(path.join(__dirname, '../sw.js'), 'utf8');
  assert.match(sw, /'\.\/shared-reference-data\.js'/);
  assert.match(sw, /'\.\/content-index\.js'/);
});
