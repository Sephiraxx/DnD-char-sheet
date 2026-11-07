const test = require('node:test'),
  assert = require('node:assert/strict');
const { load } = require('./load');
const { audit } = require('../tools/audit-character-grants');
const character = (g, extra = {}) =>
  g.Rules.validate({
    ...g.Rules.initial(),
    classId: 'fighter',
    classSubclass: '',
    subclass: 'manual',
    level: 3,
    raceId: '',
    backgroundId: '',
    known: [],
    prepared: [],
    extras: [],
    proficiencies: [],
    expertise: [],
    classChoices: {},
    classSpent: {},
    classResourcesConfirmed: true,
    slotsSpent: Array(9).fill(0),
    ...extra,
  });
const spell = (g, name) => g.Grants.lookup(name);
function choose(g, s, key, extra = {}) {
  const d = { variant: 0, ability: 'wis', spells: {}, proficiencies: {}, profVariants: {}, ...extra };
  let next = { ...s, grantChoices: { ...s.grantChoices, [key]: d } },
    p = g.Grants.plans(next).find(p => p.source.key === key);
  for (const v of p.proficiencies.variants) d.profVariants[v.field] = 0;
  next = { ...s, grantChoices: { ...s.grantChoices, [key]: d } };
  p = g.Grants.plans(next).find(p => p.source.key === key);
  for (const n of p.nodes.filter(n => n.chosen)) {
    const ids = n.candidates.slice(0, n.count).map(sp => sp.id);
    if (n.runeSelector) d.runes = ids;
    else d.spells[n.id] = ids;
  }
  for (const gr of p.proficiencies.groups) d.proficiencies[gr.id] = gr.from.slice(0, gr.count);
  if (p.featPlan?.needed) d.feats = p.featPlan.allowed.slice(0, p.featPlan.count);
  return g.Grants.configure(s, key, d);
}
test('all official spell-grant profiles resolve; empty attack-cantrip lists are identified explicitly', () => {
  const report = audit();
  assert.equal(report.backgrounds, 78);
  assert.equal(report.races, 155);
  assert.equal(report.feats, 105);
  assert.equal(report.classOptions, 151);
  assert.deepEqual(report.missing, []);
  assert.ok(report.spellProfiles > 140);
  assert.ok(report.spellNodes > 400);
  assert.deepEqual(
    report.emptyChoices.map(x => [x.source, x.profile]),
    [
      ['feat:spell-sniper', 0],
      ['feat:spell-sniper', 1],
    ],
  );
});
test('background feats are granted once, alternatives grant one feat, and changing origin removes its benefits', () => {
  const g = load(),
    s = character(g, { backgroundId: 'wildspacer-AAG', originAuto: true });
  assert.ok(g.Grants.feats(s).includes('tough'));
  assert.equal(g.FeatFX.hpPerLevel(s), 2);
  s.progression.learnedFeats.push('tough');
  assert.equal(g.FeatFX.hpPerLevel(s), 2);
  s.progression.learnedFeats = [];
  s.backgroundId = 'ruined-BMT';
  assert.deepEqual([...g.Grants.feats(s)], []);
  choose(g, s, 'background:ruined-BMT');
  assert.equal(g.Grants.originFeats(s).length, 1);
  assert.equal(g.Grants.originFeats(s)[0], 'alert');
  assert.equal(g.FeatFX.initiative(s), 5);
  s.backgroundId = 'acolyte-PHB';
  assert.equal(g.FeatFX.initiative(s), 0);
});
test('background and racial skills, tools and languages affect the sheet without consuming class selections', () => {
  const g = load(),
    s = character(g, {
      backgroundId: 'mercenary-veteran-SCAG',
      raceId: 'warforged-base-ERLW',
      abilities: { str: 12, dex: 10, con: 14, int: 12, wis: 16, cha: 10 },
    });
  assert.equal(g.Rules.skillBonus(s, 'athletics'), 3);
  assert.equal(g.Rules.skillBonus(s, 'persuasion'), 2);
  choose(g, s, 'background:mercenary-veteran-SCAG');
  choose(g, s, 'race:warforged-base-ERLW');
  assert.ok(g.Grants.proficiencies(s, 'tool').includes('vehicles (land)'));
  assert.ok(g.Grants.proficiencies(s, 'language').includes('common'));
  assert.equal(s.proficiencies.length, 0);
  assert.ok(g.Grants.proficiencies(s, 'skill').length >= 3);
});
test('House Agent and Clan Crafter choose one proficiency package rather than receiving every alternative', () => {
  const g = load(),
    s = character(g, { backgroundId: 'house-agent-ERLW' });
  assert.deepEqual([...g.Grants.proficiencies(s, 'tool')], []);
  choose(g, s, 'background:house-agent-ERLW');
  assert.deepEqual([...g.Grants.proficiencies(s, 'tool')].sort(), ["alchemist's supplies", "tinker's tools"]);
  s.backgroundId = 'clan-crafter-SCAG';
  choose(g, s, 'background:clan-crafter-SCAG');
  assert.equal(g.Grants.proficiencies(s, 'language').length, 1);
});
test('Astral Elf chooses one cantrip and casting ability; save and origin changes retain choices safely', () => {
  const g = load(),
    s = character(g, { raceId: 'astral-elf-base-AAG' });
  assert.equal(g.Grants.spells(s).length, 0);
  choose(g, s, 'race:astral-elf-base-AAG', { variant: 2, ability: 'wis' });
  const ids = g.Grants.spells(s).map(x => x.id);
  assert.equal(ids.length, 1);
  assert.equal(ids[0], spell(g, 'sacred flame').id);
  assert.equal(g.Classes.spellCaster(s, ids[0]).castingAbility, 'wis');
  assert.equal(g.Classes.spellCounts(s).cantrips, 0);
  const saved = g.Rules.validate(JSON.parse(JSON.stringify(s)));
  assert.deepEqual([...g.Classes.usable(saved)], [...ids]);
  saved.raceId = 'human-base-PHB';
  assert.equal(g.Grants.spells(saved).length, 0);
});
test('Tiefling magic respects character levels, fixed casting level, free limits and long rests', () => {
  const g = load(),
    s = character(g, { raceId: 'tiefling-base-PHB', level: 1 });
  assert.equal(g.Grants.spells(s).length, 1);
  s.level = 3;
  const sp = spell(g, 'hellish rebuke'),
    grant = g.Grants.grantFor(s, sp.id);
  assert.equal(grant.castLevel, 2);
  assert.equal(grant.ability, 'cha');
  assert.equal(grant.allowSlots, false);
  g.Combat.cast(s, sp, 0);
  assert.equal(
    g.Classes.spent(
      s,
      g.Classes.resources(s).find(r => r.id === grant.freeResource),
    ),
    1,
  );
  s.reactionUsed = false;
  assert.match(g.Combat.spellBlock(s, sp), /No quedan espacios/);
  g.Classes.reset(s, 'short');
  assert.match(g.Combat.spellBlock(s, sp), /No quedan espacios/);
  g.Classes.reset(s, 'long');
  s.reactionUsed = false;
  assert.equal(g.Combat.spellBlock(s, sp), '');
  s.level = 5;
  assert.ok(g.Classes.usable(s).includes(spell(g, 'darkness').id));
});
test('Fey Touched grants separate free uses, normal slots, chosen casting ability and no ritual permission', () => {
  const g = load(),
    s = character(g, {
      classId: 'cleric',
      level: 3,
      progression: {
        ...g.Rules.initial().progression,
        learnedFeats: ['fey-touched'],
        featChoices: { 'fey-touched': { ability: 'int' } },
      },
    });
  choose(g, s, 'feat:fey-touched');
  const list = g.Grants.spells(s);
  assert.equal(list.length, 2);
  assert.ok(list.every(g => g.ability === 'int' && g.allowSlots));
  assert.notEqual(list[0].freeResource, list[1].freeResource);
  const sp = spell(g, 'misty step');
  g.Combat.cast(s, sp, 2);
  assert.equal(s.slotsSpent[1], 1);
  assert.equal(g.Combat.specialCast(s, sp), g.Grants.grantFor(s, sp.id).freeResource);
  g.Combat.cast(s, sp, 0);
  assert.equal(g.Combat.specialCast(s, sp), null);
});
test('Rune Shaper grants only selected runes plus Comprehend Languages, with independent uses', () => {
  const g = load(),
    s = character(g, { backgroundId: 'rune-carver-BGG' });
  choose(g, s, 'feat:rune-shaper');
  assert.equal(g.Grants.spells(s).length, 2);
  assert.equal(g.Grants.resources(s).length, 2);
  assert.ok(g.Grants.spells(s).every(g => g.ability === 'wis'));
  s.level = 9;
  assert.equal(
    g.Grants.plans(s)
      .find(p => p.source.key === 'feat:rune-shaper')
      .nodes.find(n => n.runeSelector).need,
    true,
  );
  choose(g, s, 'feat:rune-shaper');
  assert.equal(g.Grants.spells(s).length, 3);
});
test('subclass choices grant their spells, Knowledge and Scout grant proficiency plus expertise', () => {
  const g = load(),
    s = character(g, { classId: 'cleric', classSubclass: 'cleric-arcana-domain' });
  choose(g, s, 'sub:cleric-arcana-domain');
  const grants = g.Grants.spells(s).filter(g => g.sourceKey === 'sub:cleric-arcana-domain');
  assert.equal(grants.filter(g => g.mode === 'known').length, 2);
  assert.ok(grants.every(g => g.ability === 'wis'));
  assert.ok(g.Grants.proficiencies(s, 'skill').includes('arcana'));
  s.classSubclass = 'cleric-knowledge-domain';
  choose(g, s, 'training:cleric-knowledge-domain');
  assert.equal(g.Grants.proficiencies(s, 'expertise').length, 2);
  s.classId = 'rogue';
  s.classSubclass = 'rogue-scout';
  assert.ok(g.Grants.proficiencies(s, 'expertise').includes('survival'));
  assert.ok(g.Grants.proficiencies(s, 'skill').includes('nature'));
});
test('monk disciplines spend ki, invocations require both a warlock slot and their rest limit', () => {
  const g = load(),
    s = character(g, {
      classId: 'monk',
      level: 5,
      classSubclass: 'monk-way-of-the-four-elements',
      classChoices: { 'Elemental Disciplines': ['fist-of-four-thunders-PHB'] },
    }),
    sp = spell(g, 'thunderwave');
  assert.ok(g.Classes.usable(s).includes(sp.id));
  g.Combat.cast(s, sp, 0);
  assert.equal(s.classSpent.ki, 2);
  g.Combat.cast(s, sp, 0);
  assert.equal(s.classSpent.ki, 4);
  assert.match(g.Combat.spellBlock(s, sp), /No quedan espacios/);
  const w = character(g, {
      classId: 'warlock',
      level: 7,
      classChoices: { 'Eldritch Invocations': ['bewitching-whispers-PHB'] },
    }),
    compulsion = spell(g, 'compulsion');
  assert.ok(g.Combat.specialCast(w, compulsion));
  assert.throws(() => g.Combat.cast(w, compulsion, 0), /espacio de brujo/);
  g.Combat.cast(w, compulsion, 4);
  assert.equal(w.slotsSpent[3], 1);
  assert.equal(g.Combat.specialCast(w, compulsion), null);
  assert.match(g.Combat.spellBlock(w, compulsion), /No quedan espacios/);
});
test('ritual books require starting rituals and permit copied rituals only at the allowed level', () => {
  const g = load(),
    s = character(g, { progression: { ...g.Rules.initial().progression, learnedFeats: ['ritual-caster'] } });
  choose(g, s, 'feat:ritual-caster');
  const list = g.Grants.spells(s);
  assert.equal(list.length, 2);
  assert.ok(list.every(g => g.ritualOnly));
  const sp = spell(g, 'detect magic');
  assert.ok(g.Classes.ritualAllowed(s, sp));
  assert.throws(() => g.Combat.cast(s, sp, 1));
  g.Combat.cast(s, sp, 0, true);
});
test('legacy racial extras migrate away from unlimited casting; explicit DM overrides are preserved', () => {
  const g = load(),
    s = character(g, { raceId: 'tiefling-base-PHB', extras: [spell(g, 'hellish rebuke').id], spellModes: {} });
  assert.equal(s.extras.length, 0);
  const sp = spell(g, 'hellish rebuke');
  g.Combat.cast(s, sp, 0);
  s.reactionUsed = false;
  assert.match(g.Combat.spellBlock(s, sp), /No quedan espacios/);
  const t = character(g, { raceId: 'tiefling-base-PHB', extras: [sp.id], spellModes: { [sp.id]: 'free' } });
  assert.equal(g.Combat.specialCast(t, sp), 'free');
});

test('subclass alternatives grant only one terrain, affinity, genie type or cantrip', () => {
  const g = load();
  for (const [classId, id] of [
    ['druid', 'druid-circle-of-the-land'],
    ['sorcerer', 'sorcerer-divine-soul'],
    ['warlock', 'warlock-the-genie'],
    ['fighter', 'fighter-arcane-archer'],
    ['barbarian', 'barbarian-path-of-the-giant'],
  ]) {
    const s = character(g, { classId, classSubclass: id, level: 5 });
    assert.equal(g.Grants.spells(s).length, 0, id + ' awaits a single profile');
    choose(g, s, 'sub:' + id);
    const grants = g.Grants.spells(s);
    assert.ok(grants.length > 0, id);
    assert.ok(grants.every(gr => gr.sourceKey === 'sub:' + id));
    if (id === 'druid-circle-of-the-land') {
      assert.equal(grants.filter(g => g.mode === 'prepared').length, 4);
      assert.ok(grants.some(gr => gr.id === spell(g, 'spike growth').id));
      assert.ok(!grants.some(gr => gr.id === spell(g, 'mirror image').id));
    }
    if (id === 'sorcerer-divine-soul') assert.equal(grants.filter(g => g.mode === 'known').length, 1);
    if (id === 'fighter-arcane-archer' || id === 'barbarian-path-of-the-giant') assert.equal(grants.length, 1);
  }
});

test('Shadow Arts uses Wisdom and ki, and secondary subclass spell choices retain their own class', () => {
  const g = load(),
    s = character(g, { classId: 'monk', classSubclass: 'monk-way-of-shadow', level: 3 }),
    sp = spell(g, 'darkness');
  assert.equal(g.Grants.grantFor(s, sp.id).ability, 'wis');
  assert.equal(g.Grants.grantFor(s, sp.id).costResource, 'ki');
  g.Combat.cast(s, sp, 0);
  assert.equal(s.classSpent.ki, 2);
  const w = character(g, {
    classId: 'wizard',
    level: 3,
    multiclass: [
      { classId: 'cleric', level: 1, subclass: 'cleric-arcana-domain', choices: {}, spells: [], prepared: [] },
    ],
  });
  choose(g, w, 'sub:cleric-arcana-domain');
  const cantrip = g.Grants.spells(w).find(g => g.sourceKey === 'sub:cleric-arcana-domain' && g.mode === 'known');
  assert.equal(g.Classes.spellCaster(w, cantrip.id).classId, 'cleric');
  assert.equal(g.Classes.spellCaster(w, cantrip.id).castingAbility, 'wis');
});

test('feat-granted options grant invocations and fighting styles, and background limited-use feats scale with proficiency', () => {
  const g = load(),
    s = character(g, {
      classId: 'fighter',
      progression: { ...g.Rules.initial().progression, learnedFeats: ['eldritch-adept', 'fighting-initiate'] },
    });
  const p = g.Grants.plans(s).find(p => p.source.id === 'eldritch-adept');
  assert.ok(!p.optionPlan.allowed.includes('agonizing-blast-PHB'));
  g.Grants.configure(s, 'feat:eldritch-adept', { options: ['armor-of-shadows-PHB'] });
  const sp = spell(g, 'mage armor');
  assert.ok(g.Classes.usable(s).includes(sp.id));
  g.Combat.cast(s, sp, 0);
  g.Combat.cast(s, sp, 0);
  assert.deepEqual([...s.slotsSpent], Array(9).fill(0));
  const bow = { equipmentId: 'longbow', notes: '', name: 'Arco largo', category: 'Armas', qty: 1 },
    before = g.Attacks.profile(s, bow).toHit;
  g.Grants.configure(s, 'feat:fighting-initiate', { options: ['archery-PHB'] });
  assert.equal(g.Attacks.profile(s, bow).toHit, before + 2);
  s.backgroundId = 'knight-of-solamnia-DSotDQ';
  assert.equal(g.Classes.resources(s).find(r => r.id === 'feat-squire-of-solamnia').max, 2);
  s.level = 9;
  assert.equal(g.Classes.resources(s).find(r => r.id === 'feat-squire-of-solamnia').max, 4);
});

test('weapon choices, dragonborn ancestry resistance, racial languages and starting class tools are usable grants', () => {
  const g = load(),
    s = character(g, { raceId: 'hobgoblin-base-VGM' });
  choose(g, s, 'race:hobgoblin-base-VGM');
  assert.equal(g.Grants.proficiencies(s, 'weapon').length, 2);
  const wid = g.Grants.proficiencies(s, 'weapon')[0];
  assert.ok(g.Attacks.proficient(s, g.Attacks.weaponOf({ equipmentId: wid, notes: '' })));
  s.raceId = 'dragonborn-base-PHB';
  choose(g, s, 'race:dragonborn-base-PHB');
  const type = g.Grants.proficiencies(s, 'resist')[0];
  assert.ok(g.Defenses.of(s).resist.has(type));
  assert.equal(g.Defenses.apply(s, [{ amount: 10, type }]).total, 5);
  s.raceId = 'simic-hybrid-base-GGR';
  choose(g, s, 'race:simic-hybrid-base-GGR');
  const plan = g.Grants.plans(s).find(p => p.source.kind === 'race');
  assert.ok(plan.proficiencies.groups.some(gr => gr.from.includes('language:vedalken')));
  s.classId = 'artificer';
  assert.ok(g.Grants.proficiencies(s, 'tool').includes("thieves' tools"));
  assert.ok(g.Grants.proficiencies(s, 'tool').includes("tinker's tools"));
});

test('new choices respect enabled books while retaining a previous valid selection', () => {
  const g = load(),
    s = character(g, {
      campaignSources: ['PHB'],
      progression: { ...g.Rules.initial().progression, learnedFeats: ['fey-touched'] },
    });
  let p = g.Grants.plans(s).find(p => p.source.id === 'fey-touched'),
    n = p.nodes.find(n => n.chosen);
  assert.ok(n.candidates.every(sp => sp.sourceKey === 'PHB'));
  assert.throws(() => g.Grants.configure(s, 'feat:fey-touched', { ability: 'wis', spells: { [n.id]: ['silvery'] } }));
});

test('tool checks apply proficiency and artificer Tool Expertise exactly once', () => {
  const g = load(),
    s = character(g, {
      classId: 'artificer',
      level: 3,
      abilities: { str: 10, dex: 14, con: 14, int: 16, wis: 12, cha: 10 },
    });
  assert.equal(g.Grants.toolBonus(s, "thieves' tools", 'dex'), 4);
  s.level = 6;
  assert.equal(g.Grants.toolBonus(s, "thieves' tools", 'dex'), 8);
  assert.throws(() => g.Grants.toolBonus(s, 'flute', 'dex'));
});

test('racial rest resources respect edition, level and proficiency; crafting during a rest is not a spent use', () => {
  const g = load(),
    s = character(g, { raceId: 'astral-elf-base-AAG' }),
    id = 'racial:astral-elf-base-AAG:starlightstep';
  let r = g.Classes.resources(s).find(r => r.id === id);
  assert.equal(r.max, 2);
  g.Classes.spend(s, id, 1);
  g.Classes.reset(s, 'short');
  assert.equal(g.Classes.spent(s, r), 1);
  g.Classes.reset(s, 'long');
  assert.equal(g.Classes.spent(s, r), 0);
  s.level = 9;
  assert.equal(g.Classes.resources(s).find(r => r.id === id).max, 4);
  s.raceId = 'firbolg-base-VGM';
  assert.equal(g.Classes.resources(s).find(r => r.id.endsWith(':hiddenstep')).reset, 'short');
  s.raceId = 'firbolg-base-MPMM';
  assert.equal(g.Classes.resources(s).find(r => r.id.endsWith(':hiddenstep')).reset, 'long');
  s.raceId = 'lizardfolk-base-VGM';
  assert.ok(!g.Classes.resources(s).some(r => r.id.endsWith(':cunningartisan')));
  s.raceId = 'aasimar-base-MPMM';
  s.level = 1;
  assert.ok(!g.Classes.resources(s).some(r => r.id.endsWith(':celestialrevelation')));
  s.level = 3;
  assert.ok(g.Classes.resources(s).some(r => r.id.endsWith(':celestialrevelation')));
});

test('Astral Trance selections grant one skill and one weapon or tool, without removing Keen Senses', () => {
  const g = load(),
    s = character(g, { raceId: 'astral-elf-base-AAG' });
  choose(g, s, 'training:astral-elf-base-AAG:trance');
  assert.ok(g.Grants.proficiencies(s, 'skill').includes('perception'));
  assert.equal(g.Grants.proficiencies(s, 'skill').length, 2);
  assert.equal(g.Grants.proficiencies(s, 'weapon').length + g.Grants.proficiencies(s, 'tool').length, 1);
});

test('Pact of the Tome grants exactly three extra cantrips without increasing ordinary class choices', () => {
  const g = load(),
    s = character(g, { classId: 'warlock', level: 3, classChoices: { 'Pact Boon': ['pact-of-the-tome-PHB'] } }),
    normal = g.Classes.casting(s).cantrips;
  choose(g, s, 'option:warlock:pact-of-the-tome-PHB');
  assert.equal(g.Grants.spells(s).filter(g => g.sourceKey === 'option:warlock:pact-of-the-tome-PHB').length, 3);
  assert.equal(normal, 2);
  assert.equal(g.Classes.spellCounts(s).cantrips, 0);
  assert.equal(g.Classes.member(spell(g, 'sacred flame'), s), false);
});

test('a spell granted by two sources uses the ability of the available free casting source', () => {
  const g = load(),
    s = character(g, {
      classId: 'cleric',
      backgroundId: 'prismari-student-SCC',
      campaignSources: ['PHB', 'SCC', 'TCE'],
      progression: { ...g.Rules.initial().progression, learnedFeats: ['artificer-initiate'] },
    });
  g.FeatFX.configureStrixhaven(s, {
    college: 'prismari',
    cantrips: ['fire-bolt', 'prestidigitation'],
    spell: 'cure',
    castingAbility: 'wis',
  });
  const p = g.Grants.plans(s).find(p => p.source.id === 'artificer-initiate'),
    d = { spells: {}, proficiencies: {} };
  for (const n of p.nodes.filter(n => n.chosen))
    d.spells[n.id] = [n.candidates.some(sp => sp.id === 'cure') ? 'cure' : n.candidates[0].id];
  for (const group of p.proficiencies.groups) d.proficiencies[group.id] = group.from.slice(0, group.count);
  g.Grants.configure(s, 'feat:artificer-initiate', d);
  const sp = spell(g, 'cure wounds');
  assert.equal(g.Classes.spellCaster(s, sp.id).castingAbility, 'int');
  g.Combat.cast(s, sp, 0);
  assert.equal(g.Classes.spellCaster(s, sp.id).castingAbility, 'wis');
});

test('paying a class slot uses the class ability when the racial casting does not permit slots', () => {
  const g = load(),
    sp = spell(g, 'levitate'),
    s = character(g, {
      classId: 'wizard',
      raceId: 'genasi-air-EEPC',
      level: 3,
      known: [sp.id],
      prepared: [sp.id],
      abilities: { str: 10, dex: 12, con: 14, int: 16, wis: 10, cha: 8 },
    });
  assert.equal(g.Classes.spellCaster(s, sp.id).castingAbility, 'con');
  assert.equal(g.Classes.spellCaster(s, sp.id, 2).classId, 'wizard');
  assert.equal(g.Classes.casting(g.Classes.spellCaster(s, sp.id, 2)).ability, 'int');
  assert.equal(g.Rules.spellOpts(s, { ...sp, castAbility: 'int' }, 2).mod, 3);
});

test('expertise cannot continue using a proficiency from an inactive origin', () => {
  const g = load(),
    s = character(g, {
      raceId: 'astral-elf-base-AAG',
      progression: {
        ...g.Rules.initial().progression,
        learnedFeats: ['skill-expert'],
        featChoices: { 'skill-expert': { ability: 'int' } },
      },
    });
  choose(g, s, 'feat:skill-expert');
  assert.ok(g.Grants.proficiencies(s, 'expertise').includes('perception'));
  s.raceId = 'human-base-PHB';
  assert.ok(!g.Grants.proficiencies(s, 'expertise').includes('perception'));
  assert.ok(
    g.Grants.plans(s)
      .find(p => p.source.id === 'skill-expert')
      .proficiencies.groups.some(g => g.kind === 'expertise' && g.need),
  );
});
