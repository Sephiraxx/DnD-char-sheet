const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./load');
const plan = require('../tools/official-creature-recovery.json');
const review = require('../tools/official-creature-recovery-review.json');
const { plain, prose } = require('../tools/repair-official-catalogue');
const ES = require('../tools/monsters-es');

test('all reviewed missing bestiary blocks have one source-specific shared entry', () => {
  const g = load(),
    d = g.OfficialContentData;
  assert.equal(plan.entries.length, 240);
  assert.equal(review.entries.length, 240);
  assert.equal(d.monsters.length, 2191);
  assert.equal(g.BookContentData.monsters.length, 2191);
  assert.equal(new Set(d.monsters.map(m => m.id)).size, d.monsters.length);
  const A = require('../tools/audit-official-catalogue');
  for (const e of plan.entries) {
    const rows = d.monsters.filter(m => m.reference === e.reference);
    assert.equal(rows.length, 1, e.reference);
    const m = rows[0],
      f = A.facts.monsters.find(r => A.id(r) === e.reference);
    assert.ok(m.reviewed && m.recovered && !m.referenceOnlyActions, e.reference);
    assert.equal(m.bookId, e.bookId);
    assert.equal(m.page, e.page);
    assert.equal(m.ab.join(','), [f.str, f.dex, f.con, f.int, f.wis, f.cha].join(','), e.reference);
    if (f.hp.average) assert.equal(m.hp, f.hp.average, e.reference);
    assert.ok(!/\{@|\[object Object\]|undefined/.test(JSON.stringify(m)), e.reference);
    assert.ok(!/^(XMM|XPHB|XDMG):/.test(m.reference));
  }
  assert.equal(g.OfficialContent.spellTexts.size, 524, 'the supplied spells remain present');
});

test('sidekick advancement, conditional variants, reaction limits and lair rules survive recovery', () => {
  const d = load().OfficialContentData,
    by = ref => d.monsters.find(m => m.reference === ref);
  for (const name of ['Andir Valmakos', 'Ayik Ur', 'Hrigg Roundrook', 'Iriad', 'Levna Drakehorn', 'Tem Temble']) {
    const m = by('DSotDQ:' + name),
      table = m.traits.find(([n]) => n === 'Variantes y progresión')?.[1];
    assert.ok(table && table.length > 400, name);
    assert.match(table, /2nd[\s\S]*11th/, name);
    assert.equal(m.unrated, true, 'a sidekick level is not a CR');
  }
  const time = by('MPP:Ancient Time Dragon');
  assert.equal(time.hp, 536);
  assert.equal(time.ac, 22);
  assert.equal(time.cr, 26);
  assert.equal(time.reactions.length, 3);
  assert.match(time.traits.find(([n]) => n === 'Reglas de reacción')[1], /three reactions per round.*one per turn/);
  assert.ok(time.traits.some(([n, t]) => n === 'Acciones de guarida' && t.length > 100));
  assert.ok(time.traits.some(([n, t]) => n === 'Efectos regionales' && t.length > 100));
  const plant = by('QftIS:Horrid Plant');
  assert.ok(plant.bonus.some(a => /Dew Drinker/.test(a.n)));
  assert.ok(plant.bonus.some(a => /Purple Blossom/.test(a.n)));
  assert.ok(plant.bonus.some(a => /Snapper Saw/.test(a.n)));
  const rig = by('GGR:Loading Rig');
  assert.deepEqual([rig.ac, rig.hp, rig.cr], [18, 39, 1]);
  assert.ok(rig.traits.some(([, t]) => /DC 15 Intelligence.*1d6 hit points/.test(t)));
  assert.equal(rig.actions.find(a => a.english === 'Slam').atk, 6);
  assert.equal(by('DMG:Giant Fly').actions.length, 0, 'no attacks invented for a noncombat stat block');
  assert.match(by('DMG:Avatar of Death').hpNote, /half the hit point maximum/);
  assert.equal(by('DMG:Avatar of Death').unrated, true);
});

test('source versions and both Witchlight Hand sizes remain separate', () => {
  const d = load().OfficialContentData,
    by = ref => d.monsters.find(m => m.reference === ref);
  assert.equal(by('WBtW:Witchlight Hand (Medium)').hp, 9);
  assert.equal(by('WBtW:Witchlight Hand (Small)').hp, 7);
  assert.notEqual(by('WBtW:Witchlight Hand (Medium)').id, by('WBtW:Witchlight Hand (Small)').id);
  assert.ok(by('WBtW:Witchlight Hand (Small)').traits.some(([, t]) => /Acrobatics \+6/.test(t)));
  assert.notEqual(by('LMoP:Redbrand Ruffian').id, by('PaBTSO:Redbrand Ruffian').id);
  assert.notEqual(by('LMoP:Redbrand Ruffian').ac, by('PaBTSO:Redbrand Ruffian').ac);
  for (const e of plan.entries.filter(e => e.category === 'Book-specific version')) assert.ok(by(e.reference));
});

test('historical rejections distinguish recovered rows, playtest content and vehicles', () => {
  const g = load(),
    d = g.OfficialContentData,
    a = d.audit.creatureRecovery;
  assert.equal(d.audit.originalRejectedBlocks.length, 436);
  assert.equal(a.resolvedRejectedRows, 328);
  assert.equal(a.excludedPlaytestRows, 106);
  assert.equal(d.audit.rejectedBlocks.length, 2);
  assert.ok(
    d.audit.rejectedBlocks.every(r => plan.unsupportedPages.some(p => p.bookId === r.bookId && p.page === r.page)),
  );
  for (const book of d.books) {
    assert.equal(book.counts.monsters, d.monsters.filter(m => m.bookId === book.id).length);
    assert.equal(book.counts.rejected, d.audit.rejectedBlocks.filter(r => r.bookId === book.id).length);
    if (book.kind === 'adventure') assert.equal(g.OfficialContent.selectableBook(book.title), false);
  }
  assert.ok(!d.monsters.some(m => m.bookId === '662db056823dd69d'));
});

test('dragon translation fixes names without replacing saved IDs, and markup retains mechanics', () => {
  const d = load().OfficialContentData;
  assert.equal(review.correctedNames.length, 17);
  for (const r of review.correctedNames) {
    const m = d.monsters.find(m => m.id === r.id);
    assert.equal(m.reference, r.reference);
    assert.equal(m.name, r.name);
    assert.ok(!m.name.includes('undefined'));
  }
  assert.equal(ES.name('Adult Amethyst Dragon'), 'Dragón de amatista adulto');
  assert.equal(ES.name('Strange Dragon Wyrmling'), 'Strange Dragon Wyrmling');
  assert.equal(plain('{@note Take {@damage 2d6} damage.}'), 'Take 2d6 damage.');
  assert.equal(plain('{@atk ms,rs} {@hit 4} to hit'), 'Melee or Ranged Spell Attack: +4 to hit');
  assert.equal(plain('{@skillCheck acrobatics 6}'), '+6');
  assert.equal(
    prose({ type: 'table', colLabels: ['Level', 'HP'], rows: [['2nd', '16 ({@dice 3d8 + 3})']] }),
    'Level · HP\n2nd · 16 (3d8 + 3)',
  );
});
