const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { load } = require('./load');
const manifest = require('../tools/official-books.json');

test('the official expansion is complete against its reviewed 2014 allowlist and adds no homebrew books', () => {
  const g = load(),
    d = g.OfficialContentData;
  assert.equal(d.audit.processedBooks, manifest.length);
  assert.equal(d.audit.expectedBooks, manifest.length);
  assert.equal(d.audit.excludedHomebrew, true);
  assert.deepEqual(
    d.books
      .map(b => b.id)
      .sort()
      .join(','),
    manifest
      .map(b => b.id)
      .sort()
      .join(','),
  );
  const ids = new Set(manifest.map(b => b.id));
  for (const rows of [d.monsters, d.spells, d.items, d.rules.map(r => r.data)])
    assert.ok(rows.every(row => ids.has(row.bookId)));
  assert.ok(manifest.every(b => b.edition === '2014'));
  assert.ok(!ids.has('eb3e374f79f75889'), 'fan conversion is excluded');
  assert.ok(!ids.has('d00e7d3c6e0506e3'), 'illustrated dragon guide is not a 2014 rulebook');
  assert.ok(!g.BookContentData.monsters.some(m => m.bookId === 'eb3e374f79f75889'));
});

test('fresh character sheets receive book rules and spell references without an account', () => {
  const g = load();
  g.window = g;
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../library-text.js'), 'utf8'), g);
  const row = g.OfficialContent.ruleTexts.get('class:wizard:Spellcasting');
  assert.ok(row?.text.length > 100);
  assert.ok(g.LibraryText.feature('class', 'wizard', 'Spellcasting')?.bundled);
  assert.ok(g.OfficialContent.spellTexts.get('bless')?.text.length > 100);
  assert.ok(g.OfficialContent.spellTexts.get('greaterinvis')?.text.length > 100);
  assert.match(g.OfficialContent.spellHtml('bless'), /Manual del Jugador/);
  const before = [g.MagicItems.ITEMS.length, g.BookContentData.monsters.length];
  g.OfficialContent.apply();
  assert.deepEqual([g.MagicItems.ITEMS.length, g.BookContentData.monsters.length], before);
});

test('an empty account library preserves shared rules and stale shared cache cannot hide the update', async () => {
  const g = load();
  g.window = g;
  g.localStorage.setItem(
    'dnd-library-text-v1',
    JSON.stringify({ rows: [['class:wizard:Spellcasting', { text: 'Old cached version', bundled: true }]] }),
  );
  g.Cloud = { currentUser: async () => ({ id: 'test' }), libraryEntries: async () => [] };
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../library-text.js'), 'utf8'), g);
  await g.LibraryText.refresh();
  assert.equal(
    g.LibraryText.feature('class', 'wizard', 'Spellcasting').text,
    g.OfficialContent.ruleTexts.get('class:wizard:Spellcasting').text,
  );
});

test('official creatures retain complete traits, saves and attack mechanics for the DM', () => {
  const g = load(),
    m = g.BookContentData.monsters.find(m => m.name === 'Azotamentes');
  assert.equal(m.hp, 71);
  assert.equal(m.ac, 15);
  assert.equal(m.cr, 7);
  assert.equal(m.ab.join(','), '11,12,12,19,17,17');
  assert.ok(m.traits.some(([name]) => /Resistencia Mágica/.test(name)));
  assert.ok(m.actions.some(a => a.atk === 7 && a.dmg?.some(([dice]) => dice === '2d10+4')));
  assert.ok(
    !m.actions.some(a => a.n === 'Lanzamiento de Conjuros'),
    'optional arcanist variant cannot alter the base creature',
  );
  assert.equal(new Set(g.BookContentData.monsters.map(m => m.id)).size, g.BookContentData.monsters.length);
  assert.ok(
    g.OfficialContentData.monsters.every(
      m => m.ab.length === 6 && m.ab.every(n => n >= 1 && n <= 30) && m.hp > 0 && m.ac > 0,
    ),
  );
});

test('new magic items can be added and saved through the existing inventory rules', () => {
  const g = load();
  const added = g.MagicItems.ITEMS.filter(x => x.id.startsWith('official-'));
  assert.ok(added.length > 200);
  for (const item of added) {
    const s = { inventory: [{ name: item.name, qty: 1, magic: g.MagicItems.fromCatalog(item.id) }] };
    assert.doesNotThrow(() => g.MagicItems.validate(s), item.name);
    assert.ok(g.OfficialContent.itemTexts.has(item.id));
  }
  const automated = g.MagicItems.ITEMS.find(x => x.ac && !x.id.startsWith('official-'));
  assert.ok(automated, 'existing automated item effects remain available');
});

test('all public play screens load shared rules, and the requested heading is gone', () => {
  for (const file of ['index.html', 'dm.html', 'board.html', 'compendium.html']) {
    const html = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    assert.ok(html.includes('./official-content-data.js'), file);
    assert.ok(html.includes('./official-content.js'), file);
    assert.ok(!/el mismo catálogo para (toda|todas)/i.test(html));
  }
});
