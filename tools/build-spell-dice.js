// Escribe en catalog.js (campo «dice» de cada conjuro) los números de cada conjuro (dados de daño y curación, tipo de daño,
// mejora por espacio superior y escalado de trucos por nivel de personaje).
// Solo toma metadatos numéricos de 5etools, nunca el texto de los libros.
// Uso: node tools/build-spell-dice.js <carpeta data/spells de 5etools-src> [--check]
//   --check informa qué conjuros del catálogo no tienen números y no escribe nada.
'use strict';
const fs = require('fs');
const path = require('path');

const dir = process.argv[2];
if (!dir) throw Error('Indicá la carpeta data/spells de 5etools-src.');
const CHECK = process.argv.includes('--check');
const OUT = path.join(__dirname, '..', 'catalog.js');

global.window = global;
require(path.join(__dirname, '..', 'catalog.js'));

const TYPE_ES = {
  acid: 'ácido',
  bludgeoning: 'contundente',
  cold: 'frío',
  fire: 'fuego',
  force: 'fuerza',
  lightning: 'relámpago',
  necrotic: 'necrótico',
  piercing: 'perforante',
  poison: 'veneno',
  psychic: 'psíquico',
  radiant: 'radiante',
  slashing: 'cortante',
  thunder: 'trueno',
};

// Varios ataques o proyectiles con los mismos dados: la mejora suma proyectiles, no dados.
const MULTI = {
  'Magic Missile': { n: 3, unit: 'dardo', up: 1 },
  'Scorching Ray': { n: 3, unit: 'rayo', up: 1 },
  'Eldritch Blast': { n: 1, unit: 'rayo', cantrip: true },
};

const ROWS = {
  'Ice Storm': 'sum',
  'Flame Strike': 'sum',
  'Meteor Swarm': 'sum',
  'Destructive Wave': 'sum',
  'Spirit Guardians': 'or',
  'Fire Shield': 'or',
  'Ice Knife': 'then',
};

// Frases que el patrón general no reconoce (tipo antes de los dados, tipo a elección).
const FIX = {
  'Magic Stone': { dmg: [['1d6', 'contundente', 1]] },
  'Spiritual Weapon': { dmg: [['1d8', 'fuerza', 1]] },
  'Chaos Bolt': { dmg: [['2d8+1d6', 'según el d8']] },
  'Glyph of Warding': { dmg: [['5d8', 'ácido, frío, fuego, relámpago o trueno']] },
  // Hojas: el daño extra al impactar y el secundario se describen en el texto; aquí solo los escalones.
  'Booming Blade': { dmg: [['1d8', 'trueno']], blade: ['0', '1d8', '2d8', '3d8'], tiers: ['1d8', '2d8', '3d8', '4d8'] },
  'Green-Flame Blade': {
    dmg: [['1d8', 'fuego']],
    blade: ['0', '1d8', '2d8', '3d8'],
    tiers: ['0', '1d8', '2d8', '3d8'],
  },
  'Prismatic Spray': { dmg: [['10d6', 'según el color']] },
  'Prismatic Wall': { dmg: [['10d6', 'según el color']] },
  'Reality Break': { dmg: undefined },
  'Animate Objects': { dmg: undefined },
  'Delayed Blast Fireball': { dmg: [['12d6', 'fuego']] },
};

const ref = {};
for (const f of fs.readdirSync(dir)) {
  if (!/^spells-.*\.json$/.test(f) || /xphb/i.test(f)) continue; // Sin los libros de 2024.
  for (const s of JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).spell || [])
    (ref[s.name.toLowerCase()] ||= []).push(s);
}

const flat = x => JSON.stringify(x || []);
const dieOf = t => {
  const m = /^\s*(\d+)d(\d+)\s*(?:\+\s*(\d+))?\s*$/.exec(t);
  return m ? { d: m[1] + 'd' + m[2], flat: m[3] ? Number(m[3]) : 0 } : null;
};

function convert(s) {
  const out = {};
  const text = flat(s.entries);
  // Daño principal: «{@damage 3d6} fire damage», con o sin modificador de lanzamiento.
  const dmg = [];
  const DMG =
    /\{@damage ([^}]+)\}((?:\s*\+\s*(?:your spellcasting ability modifier|\{\{spellcasting_mod\}\}))?)\s+(?:(\w+)(?:,\s*(\w+))?(?:,? or (\w+))?\s+)?damage/g;
  for (const m of text.matchAll(DMG)) {
    const base = m[1].replace(/\s*\+\s*\{\{spellcasting_mod\}\}/, '');
    const die = dieOf(base);
    if (!die) continue;
    const types = [m[3], m[4], m[5]].filter(t => TYPE_ES[t]).map(t => TYPE_ES[t]);
    const typeText = types.length > 1 ? types.slice(0, -1).join(', ') + ' o ' + types.at(-1) : types[0] || '';
    const mod = Boolean(m[2]) || /spellcasting_mod/.test(m[1]);
    const row = [
      die.d + (die.flat ? '+' + die.flat : ''),
      typeText || (s.damageInflict?.length > 1 ? 'a elección' : ''),
    ];
    if (mod) row.push(1);
    if (!dmg.some(r => r[0] === row[0] && r[1] === row[1])) dmg.push(row);
  }
  // Trucos con el dado en otro formato ({@dice}), p. ej. «Tañido por los muertos».
  if (!dmg.length && s.level === 0 && s.scalingLevelDice) {
    for (const sc of [].concat(s.scalingLevelDice)) {
      const d = dieOf(String(sc.scaling[1] || ''));
      if (d) dmg.push([d.d, TYPE_ES[(s.damageInflict || [])[0]] || '']);
    }
  }
  if (dmg.length) out.dmg = dmg.slice(0, 4);
  // Curación: «regains … {@dice 1d8} + your spellcasting ability modifier» o «{@dice 1d8}…hit points».
  if ((s.miscTags || []).includes('HL')) {
    const h =
      /regains?[^.]*?\{@dice ([^}|]+)[^}]*\}((?:\s*\+\s*your spellcasting ability modifier)?)/.exec(text) ||
      /\{@dice ([^}|]+)[^}]*\}((?:\s*\+\s*your spellcasting ability modifier)?)[^.]{0,40}hit points/.exec(text);
    const d = h && dieOf(h[1]);
    if (d) out.heal = [d.d + (d.flat ? '+' + d.flat : '')].concat(h[2] ? [1] : []);
    else {
      const n = /regains? (\d+) hit points/.exec(text);
      if (n) out.heal = [n[1]];
    }
  }
  // PG temporales con dados («{@dice 1d4 + 4} temporary hit points»).
  const tmp = /\{@dice ([^}|]+)[^}]*\}[^.]{0,20}temporary hit points/.exec(text);
  if (tmp && dieOf(tmp[1])) {
    const d = dieOf(tmp[1]);
    out.temp = d.d + (d.flat ? '+' + d.flat : '');
  }
  // Mejora por espacio: «{@scaledamage 3d6|1-9|1d6}» o «{@scaledice 1d8|1-9|1d8}».
  // Solo mejoras lineales («por cada nivel» o «cada dos niveles»); las escalonadas quedan en el texto.
  const hl = flat(s.entriesHigherLevel);
  const ups = [...hl.matchAll(/\{@scale(?:damage|dice) ([^|}]+)\|([^|}]+)\|([^|}]+)/g)];
  if (ups.length === 1 && /for each slot level|for every two|each two slot levels/i.test(hl)) {
    const [, , levels, step] = ups[0];
    const d = dieOf(step);
    const every = /,/.test(levels) || /every two|each two/i.test(hl) ? 2 : 1;
    const top = /^\d+-(\d+)$/.exec(levels);
    if (d) {
      out.up = [d.d, every];
      if (top && Number(top[1]) < 9) out.up.push(Number(top[1])); // Tope de nivel de espacio.
      if (out.up[1] === 1 && out.up.length === 2) out.up.pop();
    }
  }
  // Trucos: dados a nivel 1, 5, 11 y 17.
  if (s.level === 0 && s.scalingLevelDice) {
    const sc = [].concat(s.scalingLevelDice)[0].scaling;
    const steps = [1, 5, 11, 17].map(l => sc[l]).filter(Boolean);
    if (steps.length === 4 && steps.every(x => /^\d*d\d+$/.test(x))) out.tiers = steps.map(x => x.replace(/^d/, '1d'));
  }
  // Varias filas de daño: se suman, son alternativas o pasan en momentos distintos (solo la primera).
  if (out.dmg?.length > 1) {
    if (ROWS[s.name]) out[ROWS[s.name]] = 1;
    else if (s.name !== 'Toll the Dead') out.dmg = out.dmg.slice(0, 1);
  }
  if (MULTI[s.name]) out.multi = MULTI[s.name];
  if (FIX[s.name]) Object.assign(out, FIX[s.name]);
  for (const k of Object.keys(out)) if (out[k] === undefined) delete out[k];
  return Object.keys(out).length ? out : null;
}

const result = {},
  missing = [];
for (const sp of global.Catalog.spells) {
  const all = ref[(sp.english || '').toLowerCase()] || [];
  // Si el nombre aparece en varios libros, se usa el del catálogo (o el PHB).
  const r = all.find(x => x.source === sp.sourceKey) || all.find(x => x.source === 'PHB') || all[0];
  if (!r) {
    missing.push(sp.id + ' (' + sp.english + ')');
    continue;
  }
  const c = convert(r);
  if (c) result[sp.id] = c;
}
if (missing.length) console.error('Sin referencia:', missing.join(', '));
console.error(Object.keys(result).length + ' conjuros con números de ' + global.Catalog.spells.length + '.');
if (CHECK) process.exit(0);
// catalog.js es una sola expresión: se reemplaza el objeto Catalog completo conservando el envoltorio.
const src = fs.readFileSync(OUT, 'utf8');
const pre = 'root.Catalog=';
const start = src.indexOf(pre) + pre.length,
  end = src.lastIndexOf(';})(');
const cat = JSON.parse(src.slice(start, end));
for (const sp of cat.spells) {
  if (result[sp.id]) sp.dice = result[sp.id];
  else delete sp.dice;
}
fs.writeFileSync(OUT, src.slice(0, start) + JSON.stringify(cat) + src.slice(end));
