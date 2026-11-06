const test = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  vm = require('node:vm'),
  path = require('node:path');
const { createHash } = require('node:crypto');
const { load } = require('./load');
const review = require('../tools/curated-encounter-review.json');
function setup() {
  const g = load();
  g.window = g;
  for (const file of ['monsters-data.js', 'encounter-generator.js', 'encounter-tables-data.js'])
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), g);
  const original = JSON.stringify(g.EncounterTablesData);
  const script = fs.readFileSync(path.join(__dirname, '../curated-encounter-data.js'), 'utf8');
  vm.runInContext(script, g);
  return { g, original, script };
}
const { g, original, script } = setup(),
  D = g.CuratedEncounterData,
  G = g.EncounterGenerator;
const byId = id => [...g.MonsterData, ...g.BookContentData.monsters].find(m => m.id === id);

test('curated dungeon and undead tables extend the published catalogue without changing its original tables', () => {
  assert.equal(D.groups.length, 2);
  assert.equal(D.tables.length, 8);
  assert.equal(g.EncounterTablesData.groups.length, 41);
  assert.equal(g.EncounterTablesData.tables.length, 90);
  assert.equal(
    g.EncounterTablesData.tables.reduce((n, t) => n + t.rows.length, 0),
    2339,
  );
  const published = JSON.parse(JSON.stringify(g.EncounterTablesData));
  published.groups = published.groups.filter(r => !r.curated);
  published.tables = published.tables.filter(r => !r.curated);
  assert.equal(JSON.stringify(published), original);
  vm.runInContext(script, g);
  assert.equal(g.EncounterTablesData.tables.length, 90, 'loading twice cannot duplicate rows');
  assert.equal(new Set(g.EncounterTablesData.tables.map(t => t.id)).size, 90);
});

test('both themes have four full weighted percentile tables with encounters and exploration scenes', () => {
  for (const group of D.groups) {
    assert.ok(group.curated && group.source === 'CUADERNO');
    assert.match(group.book, /Tabla propia/);
    const tables = D.tables.filter(t => t.group === group.id);
    assert.deepEqual(
      Array.from(tables, t => [t.minLevel, t.maxLevel]),
      [
        [1, 4],
        [5, 10],
        [11, 16],
        [17, 20],
      ],
    );
    for (const t of tables) {
      assert.equal(t.language, 'es');
      assert.equal(t.dice, 'd100');
      assert.equal(t.rows.length, 25);
      assert.equal(t.page, undefined, 'custom tables do not invent a book page');
      assert.equal(
        t.rows.reduce((n, r) => n + r.max - r.min + 1, 0),
        100,
      );
      assert.equal(t.rows.filter(r => r.kind !== 'encounter').length, 7);
      assert.ok(t.rows[0].max - t.rows[0].min > t.rows.at(-1).max - t.rows.at(-1).min);
      for (let n = 1; n <= 100; n++)
        assert.equal(t.rows.filter(r => r.min <= n && n <= r.max).length, 1, t.id + ':' + n);
      assert.equal(G.lookup(t, '00').index, 24);
      assert.ok(t.footnotes.some(n => /no procede de un libro publicado/.test(n)));
    }
  }
});

test('every new creature has an exact playable official block and undead tables contain only undead', () => {
  assert.equal(review.unresolvedCreatures.length, 0);
  for (const t of D.tables)
    for (const row of t.rows) {
      for (const p of row.parts.filter(p => p.type === 'creature')) {
        assert.ok(['MM', 'MPMM'].includes(p.source));
        const m = byId(p.monsterId);
        assert.ok(m && m.hp > 0 && !m.unrated && !m.summon, p.key);
        assert.equal(m.reference || 'MM:' + m.english, p.source + ':' + p.english);
        if (t.group === 'CUADERNO-undead') assert.equal(m.type, 'muerto viviente', p.key);
      }
    }
  const devourers = D.tables.flatMap(t => t.rows.flatMap(r => r.parts.filter(p => p.english === 'Devourer')));
  assert.ok(devourers.length > 0);
  assert.ok(
    devourers.every(p => p.source === 'MPMM'),
    'the older Volo fiend version must not enter undead-only tables',
  );
});

test('all 200 new outcomes roll correctly, retain creature quantities, and pass through explicit selection', () => {
  for (const [i, t] of D.tables.entries()) {
    assert.equal(createHash('sha256').update(JSON.stringify(t)).digest('hex'), review.hashes[i].sha256, t.id);
    for (let index = 0; index < t.rows.length; index++)
      for (const random of [() => 1, s => s]) {
        const r = G.generate(t, { index, random });
        assert.ok(r.text.length > 35 && !/\{@|undefined|\[object Object\]/.test(r.text), t.id + ':' + index);
        assert.equal(G.selection(r.candidates, [], byId).length, 0, 'generation never selects combatants');
        for (const c of r.candidates)
          assert.ok(Number.isInteger(c.suggested) && c.suggested > 0 && c.suggested <= 20, c.key);
        assert.doesNotThrow(() =>
          G.selection(
            r.candidates,
            r.candidates.map((c, i) => ({ index: i, count: c.suggested })),
            byId,
          ),
        );
      }
  }
  const first = G.generate(
    D.tables.find(t => t.id === 'CUADERNO-undead-1'),
    { roll: 1, random: () => 1 },
  );
  assert.match(first.text, /esqueletos.*cementerio/);
  assert.equal(first.candidates[0].suggested, 1);
  const last = G.generate(
    D.tables.find(t => t.id === 'CUADERNO-undead-17'),
    { roll: 0, random: () => 1 },
  );
  assert.equal(last.candidates.length, 2);
  assert.match(last.text, /peligro extremo/);
});

test('the new tables are included with the DM UI and its offline assets', () => {
  const dm = fs.readFileSync(path.join(__dirname, '../dm.html'), 'utf8');
  assert.ok(dm.indexOf('curated-encounter-data.js') > dm.indexOf('encounter-tables-data.js'));
  assert.ok(dm.indexOf('curated-encounter-data.js') < dm.indexOf('encounter-generator-ui.js'));
  assert.match(fs.readFileSync(path.join(__dirname, '../sw.js'), 'utf8'), /\.\/curated-encounter-data\.js/);
});
