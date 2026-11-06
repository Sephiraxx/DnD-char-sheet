/* Build the app's original tables from authored Spanish scenes and exact existing creature references. */
const fs = require('node:fs'),
  path = require('node:path'),
  vm = require('node:vm'),
  crypto = require('node:crypto');
const { load } = require('../test/load');
const authored = require('./curated-encounters');
const g = load();
vm.runInContext(fs.readFileSync(path.join(__dirname, '../monsters-data.js'), 'utf8'), g);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../encounter-generator.js'), 'utf8'), g);
const available = g.ContentIndex.unique('creature', [...g.MonsterData, ...g.BookContentData.monsters]);
const key = value => value.toLowerCase().replace(/[^a-z0-9]/g, '');
const references = new Map();
for (const m of available) {
  const source = m.reference?.split(':')[0] || 'MM';
  for (const name of [m.reference?.split(':').slice(1).join(':'), m.english].filter(Boolean))
    references.set(source + ':' + key(name), m);
}
const used = new Map();
function parts(text, undead) {
  const out = [];
  let at = 0;
  for (const match of text.matchAll(/\{@(dice|creature) ([^{}]+)\}/g)) {
    if (match.index > at) out.push({ type: 'text', text: text.slice(at, match.index) });
    if (match[1] === 'dice') {
      g.EncounterGenerator.bounds(match[2]);
      out.push({ type: 'dice', expression: match[2] });
    } else {
      const [english, source = 'MM', display] = match[2].split('|');
      const uid = source + ':' + key(english),
        monster = references.get(uid);
      if (!['MM', 'MPMM'].includes(source) || !monster || monster.unrated || monster.summon || !(monster.hp > 0))
        throw Error('Missing exact playable official reference: ' + uid);
      if (undead && monster.type !== 'muerto viviente') throw Error('Non-undead creature in undead table: ' + uid);
      used.set(uid, {
        reference: monster.reference || source + ':' + english,
        monsterId: monster.id,
        cr: monster.cr,
        type: monster.type,
      });
      out.push({
        type: 'creature',
        key: uid,
        english,
        source,
        display: display || monster.name,
        monsterId: monster.id,
        name: monster.name,
      });
    }
    at = match.index + match[0].length;
  }
  if (at < text.length) out.push({ type: 'text', text: text.slice(at) });
  if (out.some(p => p.type === 'text' && /\{@/.test(p.text))) throw Error('Unsupported scene markup');
  return out;
}
if (authored.weights.reduce((a, b) => a + b, 0) !== 100) throw Error('Percentile weights must total 100.');
const groups = [],
  tables = [];
for (const group of authored.groups) {
  groups.push({
    id: group.id,
    name: group.name,
    english: group.english,
    source: 'CUADERNO',
    curated: true,
    book: 'Tabla propia de Cuaderno de aventura · criaturas oficiales de 2014',
  });
  for (const tier of group.tables) {
    if (tier.rows.length !== authored.weights.length) throw Error('Wrong row count for ' + group.id);
    let next = 1;
    const rows = tier.rows.map((value, index) => {
      const text = typeof value === 'string' ? value : value.text;
      const row = {
        min: next,
        max: next + authored.weights[index] - 1,
        kind: typeof value === 'string' ? 'encounter' : value.kind,
        parts: parts(text, group.id === 'CUADERNO-undead'),
      };
      next = row.max + 1;
      return row;
    });
    tables.push({
      id: group.id + '-' + tier.minLevel,
      group: group.id,
      source: 'CUADERNO',
      curated: true,
      language: 'es',
      name: `Niveles ${tier.minLevel}–${tier.maxLevel}`,
      minLevel: tier.minLevel,
      maxLevel: tier.maxLevel,
      dice: 'd100',
      rows,
      footnotes: [
        'Tabla creada para esta herramienta, inspirada en el formato de encuentros aleatorios de los libros de 2014. Las criaturas usan sus bloques oficiales; esta tabla no procede de un libro publicado.',
        'El rango de nivel no garantiza un combate equilibrado. Algunos resultados finales presentan amenazas excepcionales: anticipá el peligro y permití negociación, preparación o retirada cuando corresponda.',
        'Las pistas, escenas sociales y peligros del entorno se resuelven en mesa. No aplican daño, estados ni recompensas automáticamente.',
      ],
    });
  }
}
const data = { version: 1, groups, tables };
const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
fs.writeFileSync(
  path.join(__dirname, '../curated-encounter-data.js'),
  '/* Original Spanish encounter tables using official 2014 creature blocks. */\n(function(r){const d=r.CuratedEncounterData=' +
    JSON.stringify(data) +
    ';const target=r.EncounterTablesData;for(const k of ["groups","tables"])for(const row of d[k])if(!target[k].some(x=>x.id===row.id))target[k].push(row);})(typeof window!=="undefined"?window:globalThis);\n',
);
fs.writeFileSync(
  path.join(__dirname, 'curated-encounter-review.json'),
  JSON.stringify(
    {
      version: 1,
      provenance: 'Original tables for Cuaderno de aventura; official 2014 creature blocks',
      groups: groups.length,
      tables: tables.length,
      rows: tables.reduce((n, t) => n + t.rows.length, 0),
      unresolvedCreatures: [],
      creatures: [...used.values()],
      hashes: tables.map(t => ({ id: t.id, sha256: hash(t) })),
    },
    null,
    2,
  ) + '\n',
);
console.log(
  JSON.stringify({
    groups: groups.length,
    tables: tables.length,
    rows: tables.reduce((n, t) => n + t.rows.length, 0),
    creatures: used.size,
  }),
);
