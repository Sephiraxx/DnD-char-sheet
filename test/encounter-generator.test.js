const test = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path'),
  vm = require('node:vm');
const { createHash } = require('node:crypto');
const { load } = require('./load');
const review = require('../tools/encounter-tables-review.json');
function context() {
  const g = load();
  g.window = g;
  for (const file of ['monsters-data.js', 'encounter-generator.js', 'encounter-tables-data.js'])
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), g);
  g.MonsterData.push(...g.BookContentData.monsters);
  return g;
}
const g = context(),
  D = g.EncounterTablesData,
  G = g.EncounterGenerator;

test('official 2014 encounter tables have complete nonoverlapping dice ranges and reproducible hashes', () => {
  assert.equal(D.groups.length, 39);
  assert.equal(D.tables.length, 82);
  assert.equal(
    D.tables.reduce((n, t) => n + t.rows.length, 0),
    2139,
  );
  assert.equal(D.snapshot, review.snapshot);
  assert.deepEqual([...new Set(D.tables.map(t => t.source))].sort(), review.sources.slice().sort());
  assert.ok(!D.tables.some(t => ['EFA', 'FRAiF', 'AATM'].includes(t.source)));
  for (const [i, t] of D.tables.entries()) {
    assert.equal(createHash('sha256').update(JSON.stringify(t)).digest('hex'), review.hashes[i].sha256, t.id);
    const b = G.bounds(t.dice);
    for (let n = b.min; n <= b.max; n++)
      assert.equal(t.rows.filter(r => r.min <= n && n <= r.max).length, 1, t.id + ':' + n);
    assert.ok(D.groups.some(group => group.id === t.group));
  }
});

test('table rolls preserve summed-dice probabilities and percentile 00 means 100', () => {
  const sea = D.tables.find(t => t.group === 'DMG-atsea'),
    arctic = D.tables.find(t => t.id === 'XGE-arctic-0');
  const high = G.generate(sea, { random: sides => sides }),
    low = G.generate(sea, { random: () => 1 });
  assert.equal(high.total, 20);
  assert.equal(high.tableRoll.rolls.join(','), '12,8');
  assert.equal(low.total, 2);
  assert.match(low.text, /Ghost ship/);
  assert.equal(G.lookup(arctic, 0).total, 100);
  assert.equal(G.lookup(arctic, '00').index, G.lookup(arctic, 100).index);
  assert.throws(() => G.lookup(sea, 0), /entre 2 y 20/);
  for (const value of ['', ' ', null, -1, 1.5, 101, 'alert(1)']) assert.throws(() => G.lookup(arctic, value));
  for (const expr of ['Math.random()', '1d6*10000000', '1d6++2', '1000000d6', '1d1', '1d1000000'])
    assert.throws(() => G.rollDice(expr));
  assert.throws(() => G.rollDice('d6', () => 7), /fuera de rango/);
});

test('quantities roll once, chosen rows stay chosen, and all outcome text renders safely as plain text', () => {
  const t = D.tables.find(t => t.id === 'XGE-arctic-0'),
    r = G.generate(t, { roll: 2, random: () => 1 });
  assert.equal(r.total, 2);
  assert.equal(r.text, '4 kobolds');
  assert.equal(r.candidates[0].suggested, 4);
  assert.equal(r.dice.length, 1);
  assert.equal(r.tableRoll, null);
  const chosen = G.generate(t, { index: 0, random: () => 1 });
  assert.equal(chosen.total, null);
  assert.equal(chosen.index, 0);
  assert.match(chosen.text, /1 giant owl/);
  const unresolved = new Map();
  for (const table of D.tables)
    for (let index = 0; index < table.rows.length; index++) {
      for (const random of [() => 1, sides => sides]) {
        const result = G.generate(table, { index, random });
        assert.ok(result.text.trim().length > 0, table.id + ':' + index);
        assert.ok(!/\{@|\[object Object\]|undefined/.test(result.text), table.id + ':' + index);
        for (const c of result.candidates) {
          if (c.monsterId)
            assert.ok(
              g.MonsterData.some(m => m.id === c.monsterId),
              c.key,
            );
          else unresolved.set(c.key, c);
        }
      }
    }
  assert.equal(unresolved.size, review.unresolvedCreatures.length);
});

test('creatures are explicit DM choices; narrative and missing blocks remain notes', () => {
  const t = D.tables.find(t => t.id === 'XGE-arctic-0'),
    r = G.generate(t, { roll: 2, random: () => 1 });
  const byId = id => g.MonsterData.find(m => m.id === id);
  assert.equal(G.selection(r.candidates, [], byId).length, 0);
  const groups = G.selection(r.candidates, [{ index: 0, count: 4 }], byId);
  assert.equal(groups[0].count, 4);
  assert.equal(groups[0].monster.id, r.candidates[0].monsterId);
  for (const count of [0, -1, 21, 1.5, 'no'])
    assert.throws(() => G.selection(r.candidates, [{ index: 0, count }], byId));
  assert.throws(() => G.selection([{ monsterId: null }], [{ index: 0, count: 1 }], byId));
  assert.throws(
    () =>
      G.selection(
        r.candidates,
        Array.from({ length: 6 }, () => ({ index: 0, count: 20 })),
        byId,
      ),
    /100/,
  );
  const narrative = G.generate(t, { roll: 36, random: () => 1 });
  assert.equal(narrative.candidates.length, 0);
  assert.match(narrative.text, /tracks in the snow/);
  const attitudeTable = D.tables.find(t => t.rows.some(r => r.attitude));
  const attitude = G.generate(attitudeTable, { index: 0, random: () => 1 });
  assert.ok(attitude.attitude.total >= 1);
});

function dmContext() {
  const g = context(),
    sent = [];
  Object.assign(g, {
    actions: {},
    current: 'qa-table',
    party: { characters: [] },
    esc: value => String(value).replace(/[<>]/g, c => (c === '<' ? '&lt;' : '&gt;')),
    button: label => label,
    field: () => '',
    select: () => '',
    toast() {},
    draw() {},
    sign: n => String(n),
    document: { addEventListener() {}, getElementById: () => ({ close() {} }) },
    addEventListener() {},
    send: (...args) => sent.push(args),
    Cloud: {
      addCombatant: () => {
        throw Error('Unexpected live write');
      },
    },
  });
  for (const file of ['monsters-ui.js', 'encounters.js'])
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), g);
  g.MonsterUI = vm.runInContext('MonsterUI', g);
  g.Encounters = vm.runInContext('Encounters', g);
  return { g, sent };
}

test('the shared generator loads without waiting for account or private-library access', async () => {
  const { g } = dmContext();
  g.LibraryUI = {
    attach: () => {
      throw Error('Private library must not be requested');
    },
  };
  await g.MonsterUI.load({ sharedOnly: true });
  assert.ok(g.MonsterUI.byId(g.BookContentData.monsters[0].id));
});

test('generated drafts use catalogue statistics and save privately without initiative, announcements or live writes', () => {
  const { g, sent } = dmContext(),
    m = g.MonsterData.find(m => m.english === 'Goblin' || m.id === 'goblin');
  const rows = g.MonsterUI.preparedRows([[m.id, 3]]);
  assert.equal(rows.length, 3);
  assert.equal(rows[0].ac, m.ac);
  assert.equal(rows[0].hp, m.hp);
  assert.equal(rows[0].initMod, Math.floor((m.ab[1] - 10) / 2));
  assert.equal(Object.keys(rows[0].saves).length, 6);
  const id = g.Encounters.addGenerated('qa-table', null, {
    name: 'Bosque',
    notes: 'Un encuentro amistoso <sin combate>.',
    monsters: rows,
  });
  const saved = g.Encounters.get(id);
  assert.equal(saved.monsters.length, 3);
  assert.equal(new Set(saved.monsters.map(m => m.uid)).size, 3);
  assert.equal(saved.launched, false);
  assert.equal(saved.notes, 'Un encuentro amistoso <sin combate>.');
  assert.ok(!('init' in saved.monsters[0]));
  assert.equal(sent.length, 0);
  assert.match(g.Encounters.card(), /&lt;sin combate&gt;/);
  const originalIds = saved.monsters.map(m => m.uid).join(',');
  g.Encounters.addGenerated('qa-table', id, { name: 'Bosque', notes: 'Segunda escena.', monsters: [] });
  assert.equal(
    g.Encounters.get(id)
      .monsters.map(m => m.uid)
      .join(','),
    originalIds,
  );
  assert.match(g.Encounters.get(id).notes, /Segunda escena/);
  assert.equal(sent.length, 0);
});

test('narrative drafts, old encounters and campaign boundaries survive preparation and editing', () => {
  const { g } = dmContext();
  g.localStorage.setItem(
    'dnd-dm-prepared-qa-table',
    JSON.stringify([{ id: 'old', name: 'Anterior', style: 'battle', monsters: [], launched: false }]),
  );
  assert.match(g.Encounters.card(), /Anterior/);
  const id = g.Encounters.addGenerated('qa-table', null, { name: 'Huellas', notes: 'Solo rastros.', monsters: [] });
  assert.equal(g.Encounters.get(id).monsters.length, 0);
  let edit;
  g.modal = (title, body, submit) => (edit = submit);
  g.actions['prep-edit']({ dataset: { id } });
  edit(
    new Map([
      ['name', 'Huellas editadas'],
      ['style', 'ambush'],
      ['notes', 'Notas nuevas'],
    ]),
  );
  assert.equal(g.Encounters.get(id).notes, 'Notas nuevas');
  assert.throws(
    () => g.Encounters.addGenerated('other', id, { name: 'Wrong', notes: '', monsters: [] }),
    /Abrí la mesa/,
  );
  g.current = null;
  assert.throws(
    () => g.Encounters.addGenerated(null, null, { name: 'Wrong', notes: '', monsters: [] }),
    /Abrí la mesa/,
  );
  assert.equal(g.Encounters.get(id), undefined);
});

test('generator is a DM tool and all required assets are cached for offline use', () => {
  const dm = fs.readFileSync(path.join(__dirname, '../dm.html'), 'utf8'),
    sw = fs.readFileSync(path.join(__dirname, '../sw.js'), 'utf8');
  for (const file of ['encounter-generator.js', 'encounter-generator-ui.js', 'encounter-tables-data.js']) {
    assert.ok(dm.includes('./' + file));
    assert.ok(sw.includes('./' + file));
    assert.ok(!fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8').includes('./' + file));
  }
});
