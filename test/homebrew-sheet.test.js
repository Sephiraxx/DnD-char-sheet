// Homebrew en las fichas: una clase propia lanza conjuros con su progresión, su subclase da conjuros
// preparados, y la ficha lleva una copia para abrirse igual en otro dispositivo o en la pantalla del DM.
const test = require('node:test');
const assert = require('node:assert/strict');
const { load, fixture } = require('./load');

function setup() {
  const g = load();
  const H = g.Homebrew;
  const book = { id: 'b1', title: 'Mi homebrew', mine: true };
  const c = H.clean('class', {
    name: 'Hojarasca',
    die: 10,
    saves: ['str', 'wis'],
    skills: { count: 2, from: ['nature', 'survival'] },
    armor: ['light', 'medium', 'shield'],
    weapons: ['simple', 'martial'],
    caster: '1/2',
    ability: 'wis',
    spellList: 'druid',
    progression: 'prepared',
    subclassLevel: 3,
    features: [{ level: 1, name: 'Savia', text: 'Recuperás vida.' }],
  });
  const sp = H.clean('spell', {
    name: 'Espina de savia',
    level: 1,
    school: 'Transmutación',
    time: 'Acción',
    range: '60 pies',
    components: ['V', 'S'],
    duration: 'Instantáneo',
    classes: [c.id],
    text: 'Una espina.',
    roll: 'ranged',
    damage: '2d8',
    damageType: 'perforante',
    scale: '1d8',
  });
  const sub = H.clean('subclass', {
    classId: c.id,
    name: 'Círculo del musgo',
    features: [{ level: 3, name: 'Musgo', text: 'Crece.' }],
    prepared: [
      { level: 3, spell: sp.id },
      { level: 3, spell: 'cure' },
    ],
  });
  H.state.books = [book];
  H.state.entries = [
    { kind: 'class', bookId: 'b1', data: c },
    { kind: 'subclass', bookId: 'b1', data: sub },
    { kind: 'spell', bookId: 'b1', data: sp },
  ];
  H.register(H.state.entries.map(e => ({ ...e, book })));
  let s = fixture('wizard-3.json');
  Object.assign(s, {
    classId: c.id,
    classSubclass: sub.id,
    known: [],
    prepared: [],
    extras: [],
    classChoices: {},
    arcanum: {},
    spellModes: {},
    customSpells: [],
  });
  s = g.Rules.validate(s);
  return { g, c, sp, sub, s };
}

test('una clase homebrew medio lanzadora tiene espacios, prepara la mitad y aprende de su lista', () => {
  const { g, sp, s } = setup();
  const st = g.Rules.stats(s);
  assert.equal(st.hitDie, 10);
  assert.deepEqual([...st.slots], [3]);
  assert.equal(st.prepared, 2); // SAB 16 (+3) + mitad del nivel 3 (1)… mínimo según la ficha
  const all = g.Rules.allSpells(s);
  assert.equal(g.Classes.member(sp, s), true);
  assert.equal(
    g.Classes.member(
      all.find(x => x.english === 'Goodberry'),
      s,
    ),
    true,
    'lista de druida',
  );
  assert.equal(
    g.Classes.member(
      all.find(x => x.english === 'Magic Missile'),
      s,
    ),
    false,
  );
});

test('la subclase homebrew da sus conjuros siempre preparados', () => {
  const { g, sp, s } = setup();
  const got = g.Grants.spells(s).map(x => [x.id, x.mode]);
  assert.deepEqual(JSON.parse(JSON.stringify(got)), [
    [sp.id, 'prepared'],
    ['cure', 'prepared'],
  ]);
  assert.equal(g.Classes.spellCounts(s).automaticPrepared, 2);
});

test('la ficha lleva una copia de su homebrew y se abre sin la cuenta', () => {
  const { c, sp, sub, s } = setup();
  assert.deepEqual(
    JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(s.homebrew).map(([k, v]) => [k, v.map(x => x.id)])))),
    {
      class: [c.id],
      subclass: [sub.id],
      spell: [sp.id],
    },
  );
  const fresh = load();
  const again = fresh.Rules.validate(JSON.parse(JSON.stringify(s)));
  assert.equal(fresh.ClassData.classes[c.id].name, 'Hojarasca');
  assert.ok(fresh.Rules.allSpells(again).some(x => x.id === sp.id));
  assert.deepEqual([...fresh.Rules.stats(again).slots], [3]);
});

test('una ficha sin homebrew no gana el campo, y uno inválido se rechaza', () => {
  const g = load();
  const plain = g.Rules.validate(fixture('wizard-3.json'));
  assert.equal(plain.homebrew, undefined);
  assert.throws(
    () => g.Rules.validate({ ...fixture('wizard-3.json'), homebrew: { race: [] } }),
    /no es una ficha válida/,
  );
  assert.throws(() => g.Rules.validate({ ...fixture('wizard-3.json'), homebrew: 'x' }), /no es una ficha válida/);
});

test('una clase homebrew se puede elegir al multiclasear', () => {
  const { g, c } = setup();
  assert.deepEqual(JSON.parse(JSON.stringify(g.Classes.prereqOf(c.id))), [['wis']]);
  assert.equal(g.Classes.meetsPrereq({ abilities: { wis: 13 } }, c.id), true);
  assert.equal(
    g.Campaign.enabled(
      { campaignSources: ['PHB'] },
      g.ClassData.subclasses.find(x => x.classId === c.id),
    ),
    true,
  );
});

test('las mecánicas por nivel siguen a la clase: golpe sin armas, espacios extra y conjuro preparado', () => {
  const g = load();
  const H = g.Homebrew;
  const book = { id: 'b1', title: 'Mi homebrew', mine: true };
  const c = H.clean('class', {
    name: 'Puño de savia',
    die: 10,
    saves: ['str', 'wis'],
    caster: '1/2',
    ability: 'wis',
    spellList: 'druid',
    subclassLevel: 3,
    unarmed: [
      { level: 5, dice: '1d6' },
      { level: 10, dice: '1d8' },
      { level: 15, dice: '2d8' },
    ],
    unarmedFinesse: true,
    prepared: [{ level: 3, spell: 'cure' }],
    slots: [
      { level: 5, slot: 1, count: 1 },
      { level: 9, slot: 3, count: 1 },
    ],
  });
  H.state.books = [book];
  H.state.entries = [{ kind: 'class', bookId: 'b1', data: c }];
  H.register(H.state.entries.map(e => ({ ...e, book })));
  const at = level => {
    let s = fixture('wizard-3.json');
    Object.assign(s, {
      level,
      classId: c.id,
      classSubclass: '',
      known: [],
      prepared: [],
      extras: [],
      classChoices: {},
      arcanum: {},
      spellModes: {},
      customSpells: [],
      hpBase: 10 * level,
    });
    s = g.Rules.validate(s);
    const p = g.Attacks.profile(
      s,
      g.Attacks.options(s).find(x => x.unarmed),
    );
    return {
      slots: JSON.stringify(g.Rules.stats(s).slots),
      dice: p.dice,
      ability: p.ability,
      cure: g.Grants.spells(s).some(x => x.id === 'cure' && x.mode === 'prepared'),
    };
  };
  assert.deepEqual(at(2), { slots: '[2]', dice: '1', ability: 'str', cure: false });
  assert.deepEqual(at(3), { slots: '[3]', dice: '1', ability: 'str', cure: true });
  assert.deepEqual(at(5), { slots: '[5,2]', dice: '1d6', ability: 'dex', cure: true });
  assert.deepEqual(at(9), { slots: '[5,3,3]', dice: '1d6', ability: 'dex', cure: true });
  assert.equal(at(10).dice, '1d8');
  assert.deepEqual(at(15), { slots: '[5,3,4,2]', dice: '2d8', ability: 'dex', cure: true });
  assert.throws(() => H.clean('class', { ...c, unarmed: [{ level: 5, dice: '1d6+2' }] }), /1d6 o 2d8/);
});

test('una dote homebrew aplica sus efectos, da conjuros y viaja con la ficha', () => {
  const g = load();
  const H = g.Homebrew;
  const book = { id: 'b1', title: 'Mi homebrew', mine: true };
  const f = H.clean('feat', {
    name: 'Savia viva',
    text: 'Tu sangre es savia.',
    prerequisite: 'Sabiduría 13',
    abilityChoice: ['con', 'wis'],
    saveProf: true,
    hp: 1,
    init: 2,
    speed: 5,
    resist: ['poison'],
    skillsChoose: 1,
    skillsFrom: ['nature', 'survival'],
    resource: { name: 'Brote', uses: 'prof', reset: 'long', text: 'Curás 1d8.' },
    spells: [
      { spell: 'cure', mode: 'daily' },
      { spell: 'druidcraft', mode: 'known' },
    ],
    spellAbility: 'wis',
  });
  H.state.books = [book];
  H.state.entries = [{ kind: 'feat', bookId: 'b1', data: f }];
  H.register(H.state.entries.map(e => ({ ...e, book })));
  assert.ok(g.Catalog.feats.some(x => x.id === f.id && x.homebrew));
  assert.equal(
    g.Campaign.enabled(
      { campaignSources: ['PHB'] },
      g.Catalog.feats.find(x => x.id === f.id),
    ),
    true,
  );
  let s = g.Rules.validate(fixture('wizard-3.json'));
  const before = g.Rules.stats(s);
  assert.throws(() => g.FeatFX.checkPicks(f.id, s, {}), /característica/);
  s.progression.learnedFeats.push(f.id);
  s.progression.bonusFeats = [f.id];
  g.FeatFX.onGain(s, f.id, { ability: 'wis', skills: ['nature'] });
  s = g.Rules.validate(s);
  const st = g.Rules.stats(s);
  assert.equal(st.maxHP - before.maxHP, 3, '+1 PG por nivel a nivel 3');
  assert.equal(st.initiative - before.initiative, 2);
  assert.equal(st.speed - before.speed, 5);
  assert.ok(s.proficiencies.includes('nature'));
  assert.deepEqual([...g.FeatFX.saves(s)], ['wis']);
  assert.equal(g.FeatFX.resources(s)[0].max, 2);
  assert.equal(
    g.Grants.spells(s)
      .map(x => x.id + ':' + Boolean(x.freeResource))
      .sort()
      .join(),
    'cure:true,druidcraft:false',
  );
  assert.equal(Object.keys(s.homebrew).join(), 'feat');
  const fresh = load();
  const again = fresh.Rules.validate(JSON.parse(JSON.stringify(s)));
  assert.equal(fresh.Rules.stats(again).maxHP, st.maxHP);
  // Las dotes adicionales tienen que estar entre las aprendidas.
  assert.throws(
    () => g.Rules.validate({ ...s, progression: { ...s.progression, bonusFeats: ['alert'] } }),
    /no es una ficha válida/,
  );
});

test('cada dote se describe como una elección: qué hace, qué aplica la ficha y su requisito', () => {
  const g = load();
  const alert = g.FeatFX.describe('alert', g.Rules.validate(fixture('wizard-3.json')));
  assert.equal(alert.name, 'Alerta');
  assert.match(alert.brief, /iniciativa/);
  assert.equal(alert.auto.join(), '+5 a la iniciativa');
  const H = g.Homebrew;
  const f = H.clean('feat', { name: 'Savia', text: 'Brotás.', prerequisite: 'Nivel 4', hp: 1 });
  H.register([{ kind: 'feat', data: f, book: { id: 'b', title: 'HB', mine: true } }]);
  const d = g.FeatFX.describe(f.id, g.Rules.validate(fixture('wizard-3.json')));
  assert.equal(d.brief, 'Brotás.');
  assert.equal(d.prereq, 'Nivel 4');
  assert.equal(d.manual.length, 0, 'la descripción no se repite como «en la mesa»');
  assert.equal(d.auto.join(), '+1 PG máximos por nivel');
});
