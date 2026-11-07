const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./load');

function character(g, extra = {}) {
  return g.Rules.validate({
    ...g.Rules.initial(),
    classId: 'cleric',
    level: 3,
    classSubclass: '',
    backgroundId: 'prismari-student-SCC',
    campaignSources: ['PHB', 'SCC'],
    abilities: { str: 10, dex: 10, con: 14, int: 12, wis: 16, cha: 10 },
    slotsSpent: Array(9).fill(0),
    classResourcesConfirmed: true,
    prepared: [],
    ...extra,
  });
}
const prismari = {
  college: 'prismari',
  cantrips: ['fire-bolt', 'prestidigitation'],
  spell: 'cure',
  castingAbility: 'int',
};
const choose = (g, s, picks = prismari) => g.FeatFX.configureStrixhaven(s, picks);
const spell = (g, id) => g.Catalog.spells.find(sp => sp.id === id);

test('Prismari background grants Fire Bolt and Prestidigitation independently of class and normal spell limits', () => {
  const g = load(),
    s = character(g);
  assert.equal(g.FeatFX.strixhaven(s).complete, false);
  choose(g, s);
  const grants = g.Classes.granted(s);
  assert.deepEqual([...grants.known].sort(), ['cure', 'fire-bolt', 'prestidigitation']);
  assert.equal(grants.details['fire-bolt'].grantType, 'feat');
  assert.match(grants.details['fire-bolt'].origin, /Prismari/);
  assert.equal(g.Classes.member(spell(g, 'fire-bolt'), s), false);
  assert.ok(g.Classes.usable(s).includes('fire-bolt'));
  assert.equal(g.Classes.spellCounts(s).cantrips, 0);
  assert.equal(g.Classes.spellCounts(s).known, 0);
  assert.equal(g.Classes.spellCounts(s).prepared, 0);
  assert.deepEqual([...s.extras], []);
  assert.equal(g.Rules.stats(g.Classes.spellCaster(s, 'fire-bolt')).attack, 3);
  assert.equal(g.Rules.stats(g.Classes.spellCaster(s, 'fire-bolt')).dc, 11);
  assert.equal(g.Rules.stats(s).dc, 13);
  const saved = g.Rules.validate(JSON.parse(JSON.stringify(s)));
  assert.ok(g.Classes.usable(saved).includes('prestidigitation'));
});

test('all five backgrounds enforce their own college, cantrips and first-level class lists', () => {
  const g = load();
  for (const [college, data] of Object.entries(g.FeatFX.STRIXHAVEN)) {
    const s = character(g, { backgroundId: college + '-student-SCC' });
    const info = g.FeatFX.strixhaven(s);
    choose(g, s, {
      college,
      cantrips: [...data.cantrips].slice(0, 2),
      spell: info.firstSpells[0].id,
      castingAbility: 'wis',
    });
    assert.equal(g.FeatFX.spellGrants(s).length, 3, college);
    assert.throws(
      () => choose(g, s, { ...prismari, college: college === 'prismari' ? 'lorehold' : 'prismari' }),
      /facultad/,
    );
  }
  const s = character(g, { raceId: 'dwarf-mark-of-warding-ERLW' });
  assert.ok(g.Campaign.expanded(s).includes('armor-of-agathys'));
  assert.ok(!g.FeatFX.strixhaven(s).firstSpells.some(sp => sp.id === 'armor-of-agathys'));
  assert.throws(() => choose(g, s, { ...prismari, spell: 'armor-of-agathys' }), /Elegí dos trucos/);
  assert.throws(() => choose(g, s, { ...prismari, cantrips: ['fire-bolt', 'fire-bolt'] }), /distintos/);
  assert.throws(() => choose(g, s, { ...prismari, cantrips: ['fire-bolt', 'guidance'] }), /Elegí dos trucos/);
});

test('chosen first-level spell has one free cast per long rest and also accepts normal and higher-level slots', () => {
  const g = load(),
    s = choose(g, character(g)),
    sp = spell(g, 'cure');
  const resource = g.Classes.resources(s).find(r => r.id === 'feat-strixhaven-initiate');
  assert.equal(resource.max, 1);
  assert.equal(g.Combat.specialCast(s, sp), resource.id);
  g.Combat.cast(s, sp, 2);
  assert.equal(s.slotsSpent[1], 1);
  assert.equal(g.Classes.spent(s, resource), 0, 'using a slot preserves the free cast');
  g.Combat.cast(s, sp, 0);
  assert.equal(g.Classes.spent(s, resource), 1);
  assert.equal(s.slotsSpent[0], 0);
  assert.equal(g.Combat.specialCast(s, sp), null);
  assert.throws(() => g.Combat.cast(s, sp, 0), /espacio válido/);
  g.Combat.cast(s, sp, 1);
  assert.equal(s.slotsSpent[0], 1);
  g.Classes.reset(s, 'short');
  assert.equal(g.Classes.spent(s, resource), 1);
  g.Classes.reset(s, 'long');
  assert.equal(g.Classes.spent(s, resource), 0);
});

test('standalone feat works on a noncaster, grants once, respects unknown resources and does not grant ritual casting', () => {
  const g = load(),
    s = character(g, { classId: 'fighter', backgroundId: 'acolyte-PHB' });
  assert.equal(g.FeatFX.strixhaven(s), null);
  assert.throws(() => choose(g, s), /deben conceder/);
  s.progression.learnedFeats.push('strixhaven-initiate');
  choose(g, s);
  g.Combat.cast(s, spell(g, 'cure'), 0);
  assert.match(g.Combat.spellBlock(s, spell(g, 'cure')), /No quedan espacios/);
  assert.equal(g.Combat.spellBlock(s, spell(g, 'fire-bolt')), '');
  s.backgroundId = 'prismari-student-SCC';
  assert.equal(g.Classes.resources(s).filter(r => r.id === 'feat-strixhaven-initiate').length, 1);
  assert.equal(g.Classes.granted(s).known.filter(id => id === 'fire-bolt').length, 1);
  s.classSpent = {};
  s.classResourcesConfirmed = false;
  assert.equal(g.Combat.specialCast(s, spell(g, 'cure')), null);
  const t = character(g, { backgroundId: 'lorehold-student-SCC' });
  choose(g, t, { college: 'lorehold', cantrips: ['light', 'sacred-flame'], spell: 'identify', castingAbility: 'wis' });
  assert.equal(g.Classes.ritualAllowed(t, spell(g, 'identify')), false);
  t.classSubclass = 'cleric-forge-domain';
  assert.equal(g.Classes.ritualAllowed(t, spell(g, 'identify')), true);
});

test('identity changes suppress old background grants without destroying choices or resetting spent uses', () => {
  const g = load(),
    s = choose(g, character(g));
  g.Combat.cast(s, spell(g, 'cure'), 0);
  const saved = JSON.stringify(s.progression.featChoices);
  s.backgroundId = 'lorehold-student-SCC';
  assert.deepEqual([...g.FeatFX.spellGrants(s)], []);
  assert.equal(g.FeatFX.strixhaven(s).complete, false);
  s.backgroundId = 'acolyte-PHB';
  assert.equal(g.FeatFX.strixhaven(s), null);
  s.backgroundId = 'prismari-student-SCC';
  assert.equal(JSON.stringify(s.progression.featChoices), saved);
  choose(g, s, { ...prismari, castingAbility: 'cha' });
  assert.equal(
    g.Classes.spent(
      s,
      g.Classes.resources(s).find(r => r.id === 'feat-strixhaven-initiate'),
    ),
    1,
  );
});

test('invalid feat spell choices fail save validation, and new spell choices respect enabled books', () => {
  const g = load(),
    s = character(g);
  for (const broken of [
    { ...prismari, castingAbility: 'str' },
    { ...prismari, cantrips: ['fire-bolt', 'guidance'] },
    { ...prismari, spell: 'fireball' },
  ]) {
    s.progression.featChoices = { 'strixhaven-initiate': broken };
    assert.throws(() => g.Rules.validate(s));
  }
  s.progression.featChoices = {};
  s.campaignSources = ['SCC'];
  assert.throws(() => choose(g, s), /libro/);
  s.campaignSources = ['PHB', 'SCC'];
  choose(g, s);
  s.campaignSources = ['SCC'];
  assert.doesNotThrow(() => g.Rules.validate(s));
  assert.ok(g.Classes.usable(s).includes('fire-bolt'));
});
