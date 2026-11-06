const test = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  vm = require('node:vm');
const { load } = require('./load');
test('reported damaged entries have the correct identities and factual stat blocks', () => {
  const g = load(),
    all = g.BookContentData.monsters;
  const expected = [
    ['book-15739a452ebd9a5b-giant-space-hamster-6-2', 'Giant Space Hamster', 11, 22, 0.25],
    ['book-187aa9c8e2a9ab6a-crad-evil', 'Cradle of the Hill Scion', 19, 402, 22],
    ['book-15739a452ebd9a5b-gaj', 'Gaj', 16, 75, 4],
    ['book-17182bc795d5ced5-nburon-cazador', 'Tiburón cazador', 12, 45, 2],
    ['book-0baa04104f38babe-ziraj-el-cazador', 'Ziraj el cazador', 17, 153, 8],
    ['book-070b4cff1b7b2fae-the-demogorgon', 'The Demogorgon', 15, 123, 8],
    ['book-187aa9c8e2a9ab6a-troll-mutate', 'Troll Mutate', 16, 95, 7],
  ];
  for (const [id, name, ac, hp, cr] of expected) {
    const m = all.find(r => r.id === id);
    assert.ok(m, id);
    assert.deepEqual([m.name, m.ac, m.hp, m.cr], [name, ac, hp, cr], id);
    assert.ok(m.actions.length, id + ' has usable actions');
  }
  const libram = g.OfficialContentData.items.find(r => r.reference === 'TCE:Libram of Souls and Flesh');
  assert.equal(libram.name, 'Tratado de almas y carne');
  assert.equal(libram.rarity, 'raro');
  assert.equal(libram.attunement, true);
  const troll = all.find(r => r.english === 'Troll Mutate');
  assert.ok(troll.traits.some(([, d]) => /regains 10 hit points|recupera 10/i.test(d)));
  assert.ok(troll.actions.some(a => a.atk === 7 && a.dmg.some(([d]) => d === '2d10+4')));
});
test('source versions, index exceptions and variable companions do not overwrite each other', () => {
  const g = load(),
    by = id => g.BookContentData.monsters.find(m => m.id === id);
  assert.equal(by('book-e9682e11f112ff2f-mary-greymalkin').ac, 14);
  assert.equal(by('book-e21538c8ec892876-bruma-vampirica').hp, 45);
  assert.equal(by('book-67feb3483ef571d8-arbol-marchito').hp, 138);
  assert.equal(by('book-415b8e2bcdff9cbc-espinoso').cr, 1);
  assert.equal(by('book-415b8e2bcdff9cbc-mole-de-piedra').ab.join(','), '22,1,21,2,11,3');
  const homunculus = by('book-f4a36a6e25e208fc-sirviente-homunculo');
  assert.equal(homunculus.reference, 'TCE:Homunculus Servant');
  assert.equal(homunculus.unrated, true);
  assert.match(homunculus.hpNote, /Intelligence/);
  assert.equal(homunculus.ab[2], 12);
  const survivor = by('book-644d5e63cd8fd7de-aprendiz');
  assert.equal(survivor.unrated, true);
  assert.equal(survivor.ab.join(','), '8,10,9,13,11,12');
  const books = new Set(g.OfficialContentData.books.map(b => b.id));
  for (const m of g.BookContentData.monsters) {
    assert.ok(m.reviewed && m.reference, m.id);
    assert.ok(books.has(m.bookId));
    assert.ok(!/^['":]|\d\([-+]\d\)/.test(m.name), m.name);
  }
  assert.equal(g.OfficialContentData.audit.catalogueReview.unresolved, 0);
  assert.equal(g.BookContentData.monsters.length, g.OfficialContentData.monsters.length);
});
test('adventures disappear from every source selector while their game entries stay available', () => {
  const g = load();
  const available = new Set(g.Campaign.availableSources().map(([id]) => id));
  for (const book of g.OfficialContentData.books) {
    assert.ok(['rules', 'adventure'].includes(book.kind));
    if (book.kind === 'adventure') {
      assert.ok(!available.has(book.sourceKey), book.title);
      assert.equal(g.OfficialContent.selectableBook(book.title), false);
      for (const source of book.referenceSources) assert.ok(!available.has(source), source);
    }
  }
  for (const id of ['PHB', 'TCE', 'XGE', 'GGR', 'EGW']) assert.ok(available.has(id), id);
  for (const id of ['GoS', 'ToA', 'BGDIA', 'IDRotF', 'LLK', 'DSotDQ', 'WBtW', 'LR']) assert.ok(!available.has(id), id);
  assert.ok(g.BookContentData.monsters.some(m => m.bookId === '0baa04104f38babe'));
  g.esc = String;
  const html = g.Campaign.sourceFields({ campaignSources: [] });
  assert.ok(!html.includes('Waterdeep - El Golpe de los Dragones'));
  assert.ok(!html.includes('Llaves de la Bóveda Dorada'));
});
test('item cards are separated, false entries recovered and saved item IDs remain usable', () => {
  const g = load(),
    d = g.OfficialContentData;
  const cards = d.items.filter(r => r.bookId === '17182bc795d5ced5');
  assert.ok(cards.length >= 29);
  assert.equal(cards.filter(r => r.name === 'Poción de curación').length, 1);
  for (const r of cards)
    assert.ok(!/OBJETO MÁGICO|CAPA ONDULANTE COTA DE MALLA|Mientras calces estas botas.*bastón/.test(r.text), r.name);
  const specific = [
    ['Gema elemental', 'infrecuente'],
    ['Matadragones', 'raro'],
    ['Morral práctico de Heward', 'raro'],
    ['Tomo de entendimiento', 'muy raro'],
  ];
  for (const [name, rarity] of specific)
    assert.ok(
      d.items.some(r => r.name === name && r.rarity === rarity),
      name,
    );
  assert.ok(d.items.every(r => r.reviewed && !/cap[ií]tulo|^\d+$|Objeto Rareza Precio/i.test(r.name)));
  const old = 'official-f4a36a6e25e208fc-tratado-de-almas-y-carne';
  const item = g.MagicItems.byId(old);
  assert.ok(item);
  assert.equal(item.attune, true);
  assert.ok(g.OfficialContent.itemTexts.get(item.id));
  for (const row of d.items) for (const alias of row.aliasCatalogIds || []) assert.ok(g.MagicItems.byId(alias), alias);
});
