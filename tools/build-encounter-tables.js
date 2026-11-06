/* node tools/build-encounter-tables.js <private pinned encounters.json> */
const fs = require('node:fs'),
  path = require('node:path'),
  vm = require('node:vm'),
  crypto = require('node:crypto');
const { load } = require('../test/load');
const { plain } = require('./official-rules-text');
const g = load();
for (const file of ['monsters-data.js', 'encounter-generator.js'])
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), g);
const allowed = new Set(['XGE', 'DMG', 'BGG', 'BAM', 'MPP', 'SatO', 'GoS']);
const names = {
  Arctic: 'Ártico',
  'Astral Sea Encounters': 'Mar Astral',
  'At Sea': 'Alta mar',
  'Cloud Giant': 'Gigantes de las nubes',
  Coastal: 'Costa',
  'Death Giant': 'Gigantes de la muerte',
  Desert: 'Desierto',
  'Dinosaur World': 'Mundo de dinosaurios',
  'Elemental Air': 'Aire elemental',
  'Elemental Earth': 'Tierra elemental',
  'Elemental Fire': 'Fuego elemental',
  'Elemental Water': 'Agua elemental',
  'Fiendish Incursion': 'Incursión infernal',
  'Fire Giant': 'Gigantes de fuego',
  Fomorian: 'Fomorianos',
  Forest: 'Bosque',
  'Frost Giant': 'Gigantes de escarcha',
  'Giant Construct': 'Constructos gigantes',
  'Giant Kin': 'Parientes de gigantes',
  'Giant Necropolis': 'Necrópolis de gigantes',
  Grassland: 'Pradera',
  Hill: 'Colinas',
  'Hill Giant': 'Gigantes de las colinas',
  'Megafauna World': 'Mundo de megafauna',
  Mountain: 'Montaña',
  'Open Water': 'Aguas abiertas',
  'Planar Encounters': 'Encuentros planares',
  Ship: 'Naves de Spelljammer',
  Sigil: 'Sigil',
  'Stone Giant': 'Gigantes de piedra',
  'Storm Giant': 'Gigantes de las tormentas',
  Swamp: 'Pantano',
  'Sylvan Forest': 'Bosque feérico',
  Underdark: 'Infraoscuridad',
  Undersea: 'Bajo el mar',
  Underwater: 'Subacuático',
  Urban: 'Urbano',
  'Wildspace Encounters': 'Espacio salvaje',
};
const key = s =>
  String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
const creatures = g.ContentIndex.unique('creature', [...g.MonsterData, ...g.BookContentData.monsters]);
const refs = new Map();
for (const m of creatures) {
  const source = m.reference?.split(':')[0] || 'MM';
  for (const n of [m.reference?.split(':').slice(1).join(':'), m.english, ...(!m.book ? [m.name] : [])].filter(
    Boolean,
  )) {
    const uid = source + ':' + key(n);
    if (!refs.has(uid)) refs.set(uid, m);
  }
}
const missing = new Map();
function parts(text) {
  const out = [];
  let at = 0;
  const prose = value => (value.trim() ? value.match(/^\s*/)[0] + plain(value) + value.match(/\s*$/)[0] : value);
  for (const m of text.matchAll(/\{@(dice|creature) ([^{}]+)\}/g)) {
    if (m.index > at) out.push({ type: 'text', text: prose(text.slice(at, m.index)) });
    const bits = m[2].split('|');
    if (m[1] === 'dice') {
      g.EncounterGenerator.bounds(bits[0]);
      out.push({ type: 'dice', expression: bits[0] });
    } else {
      const source = bits[1] || 'MM',
        uid = source + ':' + key(bits[0]),
        monster = refs.get(uid);
      if (!monster) missing.set(uid, { name: bits[0], source });
      out.push({
        type: 'creature',
        key: uid,
        english: bits[0],
        source,
        display: bits[2] || bits[0],
        monsterId: monster?.id || null,
        name: monster?.name || bits[0],
      });
    }
    at = m.index + m[0].length;
  }
  if (at < text.length) out.push({ type: 'text', text: prose(text.slice(at)) });
  return out;
}
const source = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const groups = [],
  tables = [];
for (const group of source.encounter.filter(g => allowed.has(g.source))) {
  if (!names[group.name]) throw Error('Missing translated group: ' + group.name);
  const id = group.source + '-' + key(group.name);
  groups.push({
    id,
    name: names[group.name],
    english: group.name,
    source: group.source,
    book: g.CampaignData.sources[group.source] || (group.source === 'GoS' ? 'Ghosts of Saltmarsh' : group.source),
  });
  group.tables.forEach((table, index) => {
    const dice = table.diceExpression,
      b = g.EncounterGenerator.bounds(dice);
    const rows = table.table.map(row => ({
      min: row.min === 0 && dice === 'd100' ? 100 : row.min,
      max: row.max === 0 && dice === 'd100' ? 100 : row.max,
      parts: parts(row.result),
      ...(row.resultAttitude ? { attitude: /^\{@dice ([^}]+)\}$/.exec(row.resultAttitude)?.[1] } : {}),
    }));
    for (let n = b.min; n <= b.max; n++)
      if (rows.filter(r => r.min <= n && n <= r.max).length !== 1)
        throw Error('Missing or overlapping table range: ' + id + ' / ' + index + ' / ' + n);
    tables.push({
      id: id + '-' + index,
      group: id,
      source: group.source,
      page: table.page || group.page,
      name: table.minlvl
        ? `Niveles ${table.minlvl}–${table.maxlvl}`
        : plain(table.caption || table.captionPrefix || table.captionSuffix || 'General'),
      minLevel: table.minlvl || null,
      maxLevel: table.maxlvl || null,
      dice,
      rows,
      footnotes: (table.footnotes || []).map(plain),
    });
  });
}
const snapshot = '3a16c3ae035b286e693c19e2dd98e5264289c9cc';
const data = { snapshot, groups, tables };
fs.writeFileSync(
  path.join(__dirname, '../encounter-tables-data.js'),
  '/* Official 2014 random encounter tables. */\n(function(r){r.EncounterTablesData=' +
    JSON.stringify(data) +
    ';})(typeof window!=="undefined"?window:globalThis);\n',
);
fs.writeFileSync(
  path.join(__dirname, 'encounter-tables-review.json'),
  JSON.stringify(
    {
      snapshot,
      source: 'https://5e.tools/encountergen.html',
      groups: groups.length,
      tables: tables.length,
      rows: tables.reduce((n, t) => n + t.rows.length, 0),
      sources: [...allowed],
      excludedSources: [...new Set(source.encounter.map(g => g.source).filter(s => !allowed.has(s)))],
      unresolvedCreatures: [...missing.values()],
      hashes: tables.map(t => ({
        id: t.id,
        sha256: crypto.createHash('sha256').update(JSON.stringify(t)).digest('hex'),
      })),
    },
    null,
    2,
  ) + '\n',
);
console.log(
  JSON.stringify(
    {
      groups: groups.length,
      tables: tables.length,
      rows: tables.reduce((n, t) => n + t.rows.length, 0),
      unresolved: [...missing.values()],
    },
    null,
    2,
  ),
);
