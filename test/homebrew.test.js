// Homebrew: validación, registro en el catálogo y archivos de exportación.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { load } = require('./load');

function world() {
  const g = load();
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../homebrew.js'), 'utf8'), g);
  return g;
}
const json = x => JSON.parse(JSON.stringify(x));
const klass = {
  name: 'Hojarasca',
  die: 10,
  saves: ['str', 'wis'],
  skills: { count: 2, from: ['nature', 'survival', 'ignorada'] },
  armor: ['light', 'medium', 'shield', 'mithril'],
  weapons: ['simple'],
  caster: '1/2',
  ability: 'wis',
  spellList: 'druid',
  subclassLevel: 3,
  features: [
    { level: 2, name: 'Raíces', text: 'Echás raíces.' },
    { level: 1, name: 'Savia', text: 'Recuperás vida.' },
    { level: 5, name: '', text: '' },
  ],
};

test('una clase se limpia: listas conocidas, rasgos ordenados y vacíos fuera', () => {
  const H = world().Homebrew;
  const c = json(H.clean('class', klass));
  assert.match(c.id, /^hb-cl-[a-z0-9]{12}$/);
  assert.deepEqual(c.skills.from, ['nature', 'survival']);
  assert.deepEqual(c.armor, ['light', 'medium', 'shield']);
  assert.deepEqual(
    c.features.map(f => f.name),
    ['Savia', 'Raíces'],
  );
  assert.equal(c.homebrew, true);
  // Un id válido se conserva (editar no duplica); uno ajeno se reemplaza.
  assert.equal(H.clean('class', { ...klass, id: c.id }).id, c.id);
  assert.notEqual(H.clean('class', { ...klass, id: 'wizard' }).id, 'wizard');
});

test('los errores dicen qué revisar', () => {
  const H = world().Homebrew;
  assert.throws(() => H.clean('class', { ...klass, saves: ['str'] }), /dos tiradas de salvación/);
  assert.throws(() => H.clean('class', { ...klass, name: ' ' }), /nombre de la clase/);
  assert.throws(() => H.clean('class', { ...klass, ability: '' }), /característica para lanzar/);
  assert.throws(
    () =>
      H.clean('spell', {
        name: 'X',
        level: 1,
        school: 'Evocación',
        time: 'Acción',
        range: '30 pies',
        duration: 'Instantáneo',
        text: 'x',
        damage: '3 dados',
      }),
    /2d6 o 1d8\+3/,
  );
  assert.throws(
    () => H.clean('creature', { name: 'X', size: 'Mediano', type: 'bestia', ac: 12, hp: 5, cr: 7.5 }),
    /desafío/,
  );
  assert.throws(() => H.clean('race', {}), /desconocido/);
});

test('registrar suma clase, subclase, conjuro y criatura al catálogo, y se puede volver a registrar', () => {
  const g = world();
  const H = g.Homebrew;
  g.MonsterData = [];
  const book = { id: 'b1', title: 'Mi homebrew', mine: true };
  const c = H.clean('class', klass);
  const sub = H.clean('subclass', {
    classId: c.id,
    name: 'Círculo del musgo',
    features: [{ level: 3, name: 'Musgo', text: 'Crece.' }],
    prepared: [{ level: 3, spell: 'cure' }],
  });
  const officialSub = H.clean('subclass', { classId: 'fighter', name: 'Guardián', features: [] });
  const sp = H.clean('spell', {
    name: 'Espina',
    level: 0,
    school: 'Transmutación',
    time: 'Acción',
    range: '60 pies',
    components: ['V', 'S'],
    duration: 'Instantáneo',
    classes: [c.id, 'druid'],
    text: 'Una espina.',
    roll: 'ranged',
    damage: '1d8',
    damageType: 'perforante',
    scale: '1d8',
  });
  const cr = H.clean('creature', {
    name: 'Lobo de musgo',
    size: 'Mediano',
    type: 'Bestia',
    ac: 13,
    hp: 11,
    cr: 0.25,
    ab: [12, 15, 12, 3, 12, 6],
    actions: [{ n: 'Mordisco', d: 'Muerde.', atk: 4, dmg: '2d4+2', type: 'perforante' }],
  });
  const entries = [
    { kind: 'class', data: c, book },
    { kind: 'subclass', data: sub, book },
    { kind: 'subclass', data: officialSub, book },
    { kind: 'subclass', data: H.clean('subclass', { classId: 'hb-cl-noexiste0000', name: 'Huérfana' }), book },
    { kind: 'spell', data: sp, book },
    { kind: 'creature', data: cr, book },
  ];
  const before = { subs: g.ClassData.subclasses.length, spells: g.Catalog.spells.length };
  for (let round = 0; round < 2; round++) {
    H.register(entries);
    assert.equal(g.ClassData.classes[c.id].name, 'Hojarasca');
    assert.equal(g.ClassData.classes[c.id].weapons, 'simple');
    assert.equal(g.ClassData.subclasses.length, before.subs + 2, 'la subclase sin clase queda fuera');
    assert.equal(g.Catalog.spells.length, before.spells + 1);
    const spell = g.Catalog.spells.find(s => s.id === sp.id);
    assert.equal(spell.components, 'V, S');
    assert.equal(
      JSON.stringify(spell.dice),
      JSON.stringify({ dmg: [['1d8', 'perforante']], tiers: ['1d8', '2d8', '3d8', '4d8'] }),
    );
    assert.deepEqual([...spell.attackKind], ['R']);
    assert.deepEqual([...g.ClassData.spellClasses[sp.id]], [c.id, 'druid']);
    assert.equal(g.MonsterData.length, 1);
    assert.equal(g.MonsterData[0].xp, 50);
    assert.equal(g.MonsterData[0].type, 'bestia');
    assert.equal(JSON.stringify(g.MonsterData[0].actions[0].dmg), JSON.stringify([['2d4+2', 'perforante']]));
  }
  H.register([]);
  assert.equal(g.ClassData.classes[c.id], undefined);
  assert.equal(g.ClassData.subclasses.length, before.subs);
  assert.equal(g.Catalog.spells.length, before.spells);
  assert.equal(g.MonsterData.length, 0);
});

test('limpiar lo ya guardado no cambia nada (editar y volver a guardar)', () => {
  const H = world().Homebrew;
  const samples = {
    class: klass,
    subclass: {
      classId: 'fighter',
      name: 'S',
      features: [{ level: 3, name: 'A', text: 'b' }],
      prepared: [{ level: 3, spell: 'cure' }],
    },
    spell: {
      name: 'P',
      level: 2,
      school: 'Ilusión',
      time: 'Reacción',
      range: '30 pies',
      components: ['V', 'M'],
      material: 'un pelo',
      duration: '1 minuto',
      text: 't',
      roll: 'save',
      save: 'wis',
      damage: '2d8',
      damageType: 'psíquico',
      scale: '1d8',
    },
    creature: {
      name: 'C',
      size: 'Grande',
      type: 'Dragón',
      ac: 17,
      hp: 90,
      hd: '12d10+24',
      cr: 6,
      ab: [19, 10, 15, 12, 13, 14],
      traits: [{ n: 'Anfibio', d: 'Respira.' }],
      actions: [{ n: 'Garra', d: 'x', atk: 7, dmg: '2d6+4', type: 'cortante' }],
      legendary: [{ n: 'Ala', d: 'y' }],
    },
  };
  for (const [kind, data] of Object.entries(samples)) {
    const once = H.clean(kind, data);
    assert.equal(JSON.stringify(H.clean(kind, once)), JSON.stringify(once), kind);
  }
});

test('un dato roto de otra persona no rompe el registro', () => {
  const g = world();
  const out = g.Homebrew.register([
    { kind: 'class', data: { name: '<script>', die: 3 }, book: { id: 'x' } },
    { kind: 'spell', data: null, book: { id: 'x' } },
  ]);
  assert.equal(out.class.length + out.spell.length, 0);
});

test('exportar e importar conserva las entradas y descarta las inválidas', () => {
  const H = world().Homebrew;
  const c = H.clean('class', klass);
  H.state.books = [{ id: 'b1', title: 'Mi homebrew', mine: true }];
  H.state.entries = [{ kind: 'class', bookId: 'b1', data: c }];
  const file = JSON.parse(H.exportBook('b1'));
  assert.equal(file.format, 'dnd-homebrew');
  file.entries.push({ kind: 'spell', data: { name: 'Roto' } });
  const parsed = H.parseFile(JSON.stringify(file));
  assert.equal(parsed.title, 'Mi homebrew');
  assert.equal(parsed.entries.length, 1);
  assert.equal(parsed.entries[0].data.id, c.id);
  assert.equal(parsed.skipped.length, 1);
  assert.throws(() => H.parseFile('{"format":"otro","entries":[]}'), /no es una colección/);
  assert.throws(() => H.parseFile('no'), /JSON válido/);
});

test('el catálogo carga el homebrew y la migración agrega los tipos nuevos', () => {
  const html = fs.readFileSync(path.join(__dirname, '../compendium.html'), 'utf8');
  for (const f of ['cloud.js', 'homebrew.js', 'homebrew-ui.js'])
    assert.ok(html.indexOf(f) > 0 && html.indexOf(f) < html.indexOf('compendium.js'), f);
  assert.match(html, /<option value="homebrew">Homebrew<\/option>/);
  const sql = fs.readFileSync(path.join(__dirname, '../supabase/migrations/015_homebrew.sql'), 'utf8');
  assert.match(sql, /homebrew boolean/);
  assert.match(sql, /'class', 'subclass'/);
  const sw = fs.readFileSync(path.join(__dirname, '../sw.js'), 'utf8');
  for (const f of ['homebrew.js', 'homebrew-ui.js']) assert.match(sw, new RegExp(`'\\./${f}'`));
});

test('las criaturas llegan cuando carga el bestiario, sin duplicarse ni cambiar el arreglo', () => {
  const g = world();
  const H = g.Homebrew;
  delete g.MonsterData;
  const cr = H.clean('creature', { name: 'Lobo de musgo', size: 'Mediano', type: 'bestia', ac: 13, hp: 11, cr: 0.25 });
  H.state.books = [{ id: 'b1', title: 'Mi homebrew', mine: true }];
  H.state.entries = [{ kind: 'creature', bookId: 'b1', data: cr }];
  H.refresh(); // todavía sin bestiario: no pasa nada
  const list = [{ id: 'goblin' }];
  g.MonsterData = list;
  H.refresh();
  H.refresh();
  assert.equal(g.MonsterData, list, 'mismo arreglo: la pantalla del DM guarda la referencia');
  assert.deepEqual(
    list.map(m => m.id),
    ['goblin', cr.id],
  );
  assert.equal(list[1].book, 'Mi homebrew');
  const lib = fs.readFileSync(path.join(__dirname, '../library-ui.js'), 'utf8');
  assert.match(lib, /\/\^hb-cr-\/\.test\(m\.id\)/);
});
