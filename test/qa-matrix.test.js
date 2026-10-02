const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { load, fixture } = require('./load');

const g = load();
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'monsters-data.js'), 'utf8'), g);
g.R = g.Rules;
g.state = g.Rules.validate(fixture('wizard-3.json'));
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'rolls-ui.js'), 'utf8'), g);
const rolls = vm.runInContext('RollUI', g);

function sheet(classId, level = 3, subclass) {
  const s = g.Rules.validate(fixture('wizard-3.json'));
  const c = g.ClassData.classes[classId];
  Object.assign(s, {
    classId,
    level,
    classSubclass: subclass || g.ClassData.subclasses.find(x => x.classId === classId)?.id || '',
    abilities: { str: 16, dex: 14, con: 14, int: 16, wis: 16, cha: 16 },
    hpBase: c.die + (level - 1) * (c.die / 2 + 1),
    known: [],
    prepared: [],
    classChoices: {},
    classSpent: {},
    inventory: [],
  });
  s.hp = g.Rules.stats(s).maxHP;
  return s;
}

test('QA: all 13 classes at levels 1–20 retain valid stats, resources and save data', () => {
  for (const classId of Object.keys(g.ClassData.classes)) {
    for (let level = 1; level <= 20; level++) {
      const s = sheet(classId, level);
      const d = g.Rules.stats(s);
      assert.equal(d.prof, 2 + Math.floor((level - 1) / 4), `${classId} ${level}`);
      assert.equal(d.totalLevel, level);
      assert.equal(
        d.hitDiceSet.reduce((n, x) => n + x.count, 0),
        level,
      );
      for (const k of ['maxHP', 'ac', 'dc', 'attack', 'initiative', 'speed'])
        assert.ok(Number.isFinite(d[k]), `${classId} ${level}: ${k}`);
      for (const r of g.Classes.resources(s))
        assert.ok(Number.isInteger(r.max) && r.max >= 0, `${classId} ${level}: ${r.id}`);
      assert.equal(g.Rules.validate(JSON.parse(JSON.stringify(s))).classId, classId);
      assert.ok(Array.isArray(g.Classes.taskDetails(s)));
    }
  }
});

test('QA: every subclass can calculate level-20 features and spell grants', () => {
  for (const sc of g.ClassData.subclasses) {
    const s = sheet(sc.classId, 20, sc.id);
    assert.ok(g.Classes.features(s).length, sc.id);
    const grants = g.Classes.granted(s);
    for (const id of [...grants.known, ...grants.prepared])
      assert.ok(
        g.Catalog.spells.some(x => x.id === id),
        `${sc.id}: ${id}`,
      );
    assert.ok(Number.isFinite(g.Rules.stats(s).maxHP), sc.id);
    g.Rules.validate(s);
  }
});

test('QA: all 156 ordered class pairs have valid combined level, proficiency and hit dice', () => {
  for (const primary of Object.keys(g.ClassData.classes)) {
    for (const secondary of Object.keys(g.ClassData.classes)) {
      if (primary === secondary) continue;
      const s = sheet(primary, 3);
      s.multiclass = [
        {
          classId: secondary,
          level: 2,
          subclass: g.ClassData.subclasses.find(x => x.classId === secondary)?.id || '',
          choices: {},
          spells: [],
          prepared: [],
        },
      ];
      s.hpBase += 2 * (g.ClassData.classes[secondary].die / 2 + 1);
      s.hp = g.Rules.stats(s).maxHP;
      const d = g.Rules.stats(s);
      assert.equal(d.totalLevel, 5, `${primary}/${secondary}`);
      assert.equal(d.prof, 3);
      assert.equal(
        d.hitDiceSet.reduce((n, x) => n + x.count, 0),
        5,
      );
      g.Rules.validate(s);
    }
  }
});

test('QA: every magic item can be added, attuned and removed without corrupting a sheet', () => {
  for (const it of g.MagicItems.ITEMS) {
    const s = sheet('wizard');
    const m = g.MagicItems.fromCatalog(it.id, { resist: 'fire' });
    const row = {
      id: it.id,
      name: it.name,
      qty: 1,
      category: 'Tesoro',
      weight: null,
      location: '',
      notes: '',
      magic: m,
    };
    s.inventory.push(row);
    g.Rules.validate(s);
    m.attuned = true;
    g.Rules.validate(s);
    assert.ok(Number.isFinite(g.Rules.stats(s).ac), it.id);
    row.qty = 0;
    assert.equal(g.MagicItems.active(s).length, 0, it.id);
  }
});

test('QA: all 334 monster stat blocks can be imported as companions', () => {
  assert.equal(g.MonsterData.length, 334);
  for (const m of g.MonsterData) {
    const s = sheet('druid');
    s.companions = [g.Companions.fromMonster(m)];
    assert.equal(s.companions[0].hp, m.hp, m.id);
    g.Rules.validate(s);
  }
});

test('QA: all race and background entries produce usable defense and spell references', () => {
  for (const race of g.CampaignData.races) {
    const s = sheet('wizard', 20);
    s.raceId = race.id;
    assert.ok(Number.isFinite(g.Equipment.defense(s).total), race.id);
    const rs = g.Campaign.raceSpells(s);
    for (const sp of rs.spells)
      assert.ok(
        g.Catalog.spells.some(x => x.id === sp.id),
        `${race.id}: ${sp.id}`,
      );
    g.Defenses.of(s);
  }
  for (const bg of g.CampaignData.backgrounds) {
    const s = sheet('wizard');
    s.backgroundId = bg.id;
    assert.ok(g.Campaign.background(s), bg.id);
    g.Campaign.expanded(s);
  }
});

test('QA: all 524 spell roll summaries parse at their native level and at level 9', () => {
  assert.equal(g.Catalog.spells.length, 524);
  g.state = sheet('wizard', 20);
  for (const sp of g.Catalog.spells) {
    for (const level of [sp.level, 9]) {
      const info = rolls.spellInfo(sp, level);
      assert.ok(info && typeof info === 'object', sp.id);
      assert.ok(!JSON.stringify(info).includes('NaN'), sp.id);
    }
  }
});

module.exports = { sheet, g };
