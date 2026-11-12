const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./load.js');

// Un personaje de D&D Beyond reducido a los campos que lee la importación.
const ddb = {
  id: 1,
  success: true,
  data: {
    name: 'Mira  Piedraverde',
    classes: [
      { level: 2, definition: { name: 'Rogue' }, subclassDefinition: null },
      { level: 5, definition: { name: 'Wizard' }, subclassDefinition: { name: 'School of Evocation' } },
    ],
    race: { fullName: 'High Elf', baseName: 'Elf', subRaceShortName: 'High' },
    background: { definition: { name: 'Sage' } },
    stats: [15, 14, 13, 12, 10, 8].map((value, i) => ({ id: i + 1, value })),
    overrideStats: [{ id: 6, value: 9 }],
    alignmentId: 3,
    traits: { personalityTraits: '<p>Curiosa&nbsp;y distraída</p>', ideals: 'Saber', bonds: '', flaws: null },
    notes: { backstory: 'Creció en una biblioteca.' },
    age: 120,
    faith: 'Oghma',
    currencies: { cp: 50, sp: 5, gp: 12, ep: 0, pp: 1 },
    baseHitPoints: 30,
    modifiers: {
      class: [
        { type: 'proficiency', subType: 'arcana' },
        { type: 'proficiency', subType: 'sleight-of-hand' },
        { type: 'expertise', subType: 'arcana' },
        { type: 'proficiency', subType: 'light-armor' },
      ],
      race: [{ type: 'language', subType: 'elvish', friendlySubtypeName: 'Elvish' }],
    },
    classSpells: [{ spells: [{ definition: { name: 'Fireball' } }, { definition: { name: 'Shield' } }] }],
    inventory: [{ definition: { name: 'Dagger' }, quantity: 2 }],
  },
};

test('D&D Beyond: arma un borrador con lo que reconoce y anota lo que falta', () => {
  const c = load(),
    data = { classes: c.ClassData.classes, races: c.CampaignData.races, backgrounds: c.CampaignData.backgrounds },
    r = c.Interop.fromDDB(ddb, data);
  assert.equal(r.draft.name, 'Mira Piedraverde');
  assert.equal(r.draft.classId, 'wizard'); // la clase de más nivel
  assert.equal(r.draft.level, 7);
  assert.equal(r.draft.raceId, 'elf-high-PHB');
  assert.equal(r.draft.backgroundId, 'sage-PHB');
  assert.deepEqual({ ...r.draft.base }, { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 9 });
  assert.equal(r.draft.method, 'manual');
  assert.equal(r.draft.persona.alignment, 'Caótico bueno');
  assert.equal(r.draft.persona.traits, 'Curiosa y distraída');
  assert.equal(r.draft.persona.age, '120');
  assert.equal(r.draft.persona.deity, 'Oghma');
  assert.equal(r.draft.languages, 'Elvish');
  // La personalidad importada pasa la validación de la ficha.
  assert.deepEqual({ ...c.Persona.clean(r.draft.persona) }, { ...r.draft.persona });
  assert.deepEqual([...r.skills].sort(), ['arcana', 'sleight']);
  assert.deepEqual([...r.expertise], ['arcana']);
  const missing = r.missing.join('\n');
  assert.match(missing, /Multiclase \(Wizard 5 \/ Rogue 2\)/);
  assert.match(missing, /School of Evocation/);
  assert.match(missing, /Fireball, Shield/);
  assert.match(missing, /Dagger ×2/);
  assert.match(missing, /23 po/);
  // Con la raza deshabilitada en la mesa, igual se propone (el creador avisa si no se puede).
  assert.equal(c.Interop.fromDDB(ddb.data, { ...data, sources: ['XGE'] }).draft.raceId, 'elf-high-PHB');
  assert.throws(() => c.Interop.fromDDB({ foo: 1 }, data), /no parece/);
  // Lo que no existe en la app queda para elegir a mano, sin romper.
  const odd = c.Interop.fromDDB(
    {
      ...ddb.data,
      classes: [{ level: 1, definition: { name: 'Blood Hunter' } }],
      race: { fullName: 'Moon Gnome Variant' },
      background: null,
    },
    data,
  );
  assert.equal(odd.draft.classId, undefined);
  assert.equal(odd.draft.raceId, undefined);
  assert.match(odd.missing.join('\n'), /Blood Hunter/);
});

const view = {
  name: 'Lyra',
  classes: [{ id: 'wizard', english: 'Wizard', level: 3, sub: 'School of Evocation' }],
  race: 'Elfo (alto)',
  background: 'Sabio',
  scores: { str: 8, dex: 14, con: 13, int: 17, wis: 12, cha: 10 },
  saves: ['int', 'wis'],
  skills: { arcana: 2, perception: 1, sleight: 0 },
  hp: 15,
  maxHp: 17,
  temp: 0,
  ac: 12,
  speed: 30,
  prof: 2,
  gold: { gp: 10, sp: 3 },
  languages: ['Común', 'Élfico'],
  persona: { alignment: 'Neutral', traits: 'Curiosa', backstory: 'Una <vida> larga.\n\nCon libros.' },
  spells: [
    { name: 'Fire Bolt', level: 0, prepared: true },
    { name: 'Shield', level: 1, prepared: true },
  ],
  items: [{ name: 'Bastón', qty: 1, weight: 4, notes: '1d6' }],
};

test('Foundry: actor dnd5e con características, competencias, clase, conjuros y equipo', () => {
  const a = load().Interop.toFoundry(view);
  assert.equal(a.type, 'character');
  assert.deepEqual({ ...a.system.abilities.int }, { value: 17, proficient: 1 });
  assert.equal(a.system.abilities.str.proficient, 0);
  assert.deepEqual({ ...a.system.attributes.hp }, { value: 15, max: 17, temp: 0 });
  assert.equal(a.system.skills.arc.value, 2);
  assert.equal(a.system.skills.prc.value, 1);
  assert.equal(a.system.skills.slt.value, 0);
  assert.equal(Object.keys(a.system.skills).length, 18);
  assert.equal(a.system.currency.gp, 10);
  assert.equal(a.system.traits.languages.custom, 'Común; Élfico');
  // El texto libre viaja escapado.
  assert.equal(a.system.details.biography.value, '<p>Una &lt;vida&gt; larga.</p><p>Con libros.</p>');
  const byType = t => a.items.filter(i => i.type === t);
  assert.deepEqual(
    { ...byType('class')[0].system, description: undefined },
    { identifier: 'wizard', levels: 3, description: undefined },
  );
  assert.equal(byType('spell').length, 2);
  assert.equal(byType('spell')[1].system.level, 1);
  assert.equal(byType('loot')[0].system.quantity, 1);
  assert.doesNotThrow(() => JSON.stringify(a));
});

test('Roll20: atributos de la hoja «D&D 5E by Roll20» en el formato de VTT Enhancement Suite', () => {
  const r = load().Interop.toRoll20(view),
    get = n => r.attribs.find(a => a.name === n);
  assert.equal(r.schema_version, 2);
  assert.equal(r.name, 'Lyra');
  assert.deepEqual({ ...get('hp') }, { name: 'hp', current: '15', max: '17', id: '' });
  assert.equal(get('intelligence').current, '17');
  assert.equal(get('intelligence_mod').current, '3');
  assert.equal(get('strength_mod').current, '-1');
  assert.ok(get('intelligence_save_prof'));
  assert.equal(get('strength_save_prof'), undefined);
  assert.equal(get('arcana_prof').current, '(@{pb}*@{arcana_type})');
  assert.equal(get('arcana_type').current, '2');
  assert.equal(get('sleight_of_hand_prof'), undefined);
  assert.equal(get('class_display').current, 'Wizard 3');
  assert.equal(get('gp').current, '10');
  assert.match(get('treasure').current, /Bastón/);
  assert.ok(r.attribs.every(a => typeof a.current === 'string' && typeof a.max === 'string'));
});
