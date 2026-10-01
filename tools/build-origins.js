// Agrega a campaign-data.js las razas y trasfondos de los libros 2014 que faltan, hasta The Book of Many Things.
// Solo toma metadatos de 5etools (nombres, números, competencias y listas de conjuros), nunca el texto de los libros.
// Uso: node tools/build-origins.js <carpeta con races.json y backgrounds.json de 5etools-src/data> [--check]
//   --check compara la conversión con las entradas que ya existen y no escribe nada.
'use strict';
const fs = require('fs');
const path = require('path');

const dir = process.argv[2];
if (!dir) throw Error('Indicá la carpeta con races.json y backgrounds.json.');
const CHECK = process.argv.includes('--check');
const OUT = path.join(__dirname, '..', 'campaign-data.js');

// Libros oficiales de reglas 2014 con opciones de personaje, hasta noviembre de 2023.
// Fuera: UA, Plane Shift, libros 2024 (XPHB…) y los listados de monstruos jugables de la DMG.
const BOOKS = {
  PHB: 'Manual del Jugador 2014',
  XGE: 'Guía de Xanathar para todo',
  TCE: 'El caldero de Tasha para todo',
  SCAG: 'Guía del aventurero de la Costa de la Espada',
  SCC: 'Strixhaven: A Curriculum of Chaos',
  GGR: 'Guía de los gremios de Ravnica',
  ERLW: 'Eberron: Rising from the Last War',
  MTF: 'Mordenkainen: Tome of Foes',
  VGM: 'Guía de Volo de los monstruos',
  EEPC: 'Elemental Evil Player’s Companion',
  MPMM: 'Mordenkainen Presents: Monsters of the Multiverse',
  EGW: 'Explorer’s Guide to Wildemount',
  MOT: 'Mythic Odysseys of Theros',
  VRGR: 'Van Richten’s Guide to Ravenloft',
  FTD: 'Fizban’s Treasury of Dragons',
  WBtW: 'The Wild Beyond the Witchlight',
  AAG: 'Spelljammer: Astral Adventurer’s Guide',
  DSotDQ: 'Dragonlance: Shadow of the Dragon Queen',
  BGG: 'Bigby Presents: Glory of the Giants',
  SatO: 'Planescape: Sigil and the Outlands',
  BMT: 'The Book of Many Things',
  AI: 'Acquisitions Incorporated',
  GoS: 'Ghosts of Saltmarsh',
  ToA: 'Tomb of Annihilation',
  BGDIA: 'Baldur’s Gate: Descent into Avernus',
  OGA: 'One Grung Above',
  LR: 'Locathah Rising',
  TTP: 'The Tortle Package',
  // Solo conjuros.
  IDRotF: 'Icewind Dale: Rime of the Frostmaiden',
  LLK: 'Lost Laboratory of Kwalish',
};

// Nombres en castellano. Las razas y subrazas que no figuran conservan el nombre en inglés.
const RACE_ES = {
  Aarakocra: 'Aarakocra',
  Aasimar: 'Aasimar',
  Bugbear: 'Osgo',
  Centaur: 'Centauro',
  Changeling: 'Cambiante',
  'Deep Gnome': 'Gnomo de las profundidades',
  Dhampir: 'Dhampir',
  Dragonborn: 'Dracónido',
  'Dragonborn (Chromatic)': 'Dracónido · cromático',
  'Dragonborn (Gem)': 'Dracónido · de gema',
  'Dragonborn (Metallic)': 'Dracónido · metálico',
  Duergar: 'Duergar',
  Dwarf: 'Enano',
  Eladrin: 'Eladrin',
  Elf: 'Elfo',
  Fairy: 'Hada',
  Firbolg: 'Firbolg',
  Genasi: 'Genasi',
  Gith: 'Gith',
  Githyanki: 'Githyanki',
  Githzerai: 'Githzerai',
  Gnome: 'Gnomo',
  Goblin: 'Goblin',
  Goliath: 'Goliat',
  Grung: 'Grung',
  'Half-Elf': 'Semielfo',
  'Half-Orc': 'Semiorco',
  Halfling: 'Mediano',
  Harengon: 'Harengon',
  Hexblood: 'Sangre bruja',
  Hobgoblin: 'Hobgoblin',
  Human: 'Humano',
  Kalashtar: 'Kalashtar',
  Kender: 'Kender',
  Kenku: 'Kenku',
  Kobold: 'Kobold',
  Leonin: 'Leonino',
  Lizardfolk: 'Hombre lagarto',
  Locathah: 'Locathah',
  Loxodon: 'Loxodonte',
  Minotaur: 'Minotauro',
  Orc: 'Orco',
  Owlin: 'Búhoide',
  Reborn: 'Renacido',
  Satyr: 'Sátiro',
  'Sea Elf': 'Elfo marino',
  'Shadar-kai': 'Shadar-kai',
  'Shadar-Kai': 'Shadar-kai',
  Shifter: 'Cambiaformas',
  'Simic Hybrid': 'Híbrido simic',
  Tabaxi: 'Tabaxi',
  Tiefling: 'Tiefling',
  Tortle: 'Tortuguino',
  Triton: 'Tritón',
  Vedalken: 'Vedalken',
  Verdan: 'Verdan',
  Warforged: 'Forjado',
  'Yuan-ti': 'Yuan-ti',
  'Yuan-Ti': 'Yuan-ti',
  'Yuan-ti Pureblood': 'Yuan-ti sangre pura',
  'Astral Elf': 'Elfo astral',
  Autognome: 'Autognomo',
  Giff: 'Giff',
  Hadozee: 'Hadozee',
  Plasmoid: 'Plasmoide',
  'Thri-kreen': 'Thri-kreen',
};
const SUB_ES = {
  Protector: 'protector',
  Scourge: 'azote',
  Fallen: 'caído',
  Air: 'aire',
  Earth: 'tierra',
  Fire: 'fuego',
  Water: 'agua',
  Chromatic: 'cromático',
  Metallic: 'metálico',
  Gem: 'gema',
  Draconblood: 'sangre dracónica',
  Ravenite: 'ravenita',
  Pallid: 'pálido',
  Lotusden: 'de Lotusden',
  'Mark of Detection': 'marca de detección',
};
const BG_ES = {
  Anthropologist: 'Antropólogo',
  Archaeologist: 'Arqueólogo',
  Athlete: 'Atleta',
  'Astral Drifter': 'Vagabundo astral',
  Wildspacer: 'Viajero del espacio salvaje',
  Grinner: 'Sonriente',
  'Volstrucker Agent': 'Agente volstrucker',
  'Celebrity Adventurer’s Scion': 'Vástago de aventurero famoso',
  "Celebrity Adventurer's Scion": 'Vástago de aventurero famoso',
  'Failed Merchant': 'Comerciante fracasado',
  Gambler: 'Apostador',
  Plaintiff: 'Demandante',
  'Rival Intern': 'Pasante rival',
  Feylost: 'Perdido en el Feywild',
  'Witchlight Hand': 'Empleado de Witchlight',
  Fisher: 'Pescador',
  Marine: 'Infante de marina',
  Shipwright: 'Carpintero naval',
  Smuggler: 'Contrabandista',
  'Gate Warden': 'Guardián del portal',
  'Planar Philosopher': 'Filósofo planar',
  'Giant Foundling': 'Expósito de gigantes',
  'Rune Carver': 'Tallador de runas',
  'Haunted One': 'Atormentado',
  Investigator: 'Investigador',
  'Knight of Solamnia': 'Caballero de Solamnia',
  'Mage of High Sorcery': 'Mago de la Alta Hechicería',
  Rewarded: 'Recompensado',
  Ruined: 'Arruinado',
  Faceless: 'Sin rostro',
};

const slug = s =>
  String(s)
    .split('|')[0]
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
const SKIP_TRAITS = new Set(['Age', 'Size', 'Speed', 'Languages', 'Alignment', 'Ability Score Increase']);
const traitNames = entries =>
  (entries || []).filter(e => e && typeof e === 'object' && e.name && !SKIP_TRAITS.has(e.name)).map(e => e.name);
const LINEAGE = [
  { choose: { weighted: { from: ['str', 'dex', 'con', 'int', 'wis', 'cha'], weights: [2, 1] } } },
  { choose: { weighted: { from: ['str', 'dex', 'con', 'int', 'wis', 'cha'], weights: [1, 1, 1] } } },
];
// Las listas ampliadas usan los ids del catálogo (Counterspell es «counter», por ejemplo).
global.window = global;
require(path.join(__dirname, '..', 'catalog.js'));
const spellId = name => {
  const key = slug(String(name).split('#')[0]);
  return window.Catalog.spells.find(sp => slug(sp.english || sp.name) === key)?.id;
};
function expandedIds(additionalSpells) {
  const ids = [];
  for (const g of additionalSpells || [])
    for (const list of Object.values(g.expanded || {})) for (const sp of [].concat(list)) ids.push(spellId(sp));
  return [...new Set(ids.filter(Boolean))];
}

function load(name) {
  return JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
}
// Resuelve las entradas «_copy» de 5etools (solo los campos que usamos; los «_mod» de texto no importan).
function resolveCopies(list) {
  return list.map(x => {
    if (!x._copy) return x;
    const base = list.find(b => b.name === x._copy.name && b.source === x._copy.source && !b._copy);
    return base ? { ...base, ...x, _copy: undefined } : x;
  });
}

const FIELDS = [
  'ability',
  'size',
  'speed',
  'darkvision',
  'skillProficiencies',
  'languageProficiencies',
  'toolProficiencies',
  'additionalSpells',
  'resist',
  'immune',
  'conditionImmune',
  'feats',
];
function raceRow(race, sub) {
  const src = sub?.source || race.source,
    english = sub?.name ? `${race.name} (${sub.name})` : race.name;
  const row = {
    id: `${slug(race.name)}-${sub?.name ? slug(sub.name) : 'base'}-${src}`,
    name: RACE_ES[race.name] ? RACE_ES[race.name] + (sub?.name ? ' · ' + (SUB_ES[sub.name] || sub.name) : '') : english,
    english,
    source: src,
    sources: [...new Set([src, ...((sub || race).otherSources?.map(o => o.source).filter(s => BOOKS[s]) || [])])],
    page: (sub || race).page,
    traits: [],
  };
  // Un rasgo de la subraza puede reemplazar uno de la raza (Legado de Avernus en lugar de Legado infernal).
  const replaced = new Set((sub?.entries || []).map(e => e?.data?.overwrite).filter(Boolean));
  row.traits = [...traitNames(race.entries).filter(n => !replaced.has(n)), ...traitNames(sub?.entries)];
  for (const f of FIELDS) {
    const a = race[f],
      b = sub?.[f];
    let v;
    if (b === undefined) v = a;
    // Las listas de 5etools son alternativas: la subraza reemplaza la de la raza; null la quita.
    // Solo los aumentos de característica se suman (raza +2 y subraza +1).
    else if (f !== 'ability' || sub.overwrite?.ability || !Array.isArray(a) || !Array.isArray(b)) v = b;
    else v = [...a, ...b];
    if (v !== undefined && v !== null) row[f] = v;
  }
  // Linajes flexibles (Monsters of the Multiverse, Van Richten…): +2/+1 o +1/+1/+1 y un idioma a elección.
  if (!row.ability && race.lineage) row.ability = LINEAGE;
  if (!row.languageProficiencies && race.lineage) row.languageProficiencies = [{ common: true, anyStandard: 1 }];
  row.expanded = expandedIds(row.additionalSpells);
  return row;
}
function bgRow(b) {
  const row = {
    id: `${slug(b.name)}-${b.source}`,
    name: BG_ES[b.name] || b.name,
    english: b.name,
    source: b.source,
    sources: [b.source],
    page: b.page,
  };
  for (const f of ['skillProficiencies', 'languageProficiencies', 'toolProficiencies', 'additionalSpells', 'feats'])
    if (b[f] !== undefined) row[f] = b[f];
  row.expanded = expandedIds(row.additionalSpells);
  return row;
}

const racesJson = load('races.json');
const races = resolveCopies(racesJson.race).filter(r => BOOKS[r.source] && !r.traitTags?.includes('NPC Race'));
const subs = (racesJson.subrace || []).filter(s => BOOKS[s.source]);
const raceRows = [];
for (const r of races) {
  const mine = subs.filter(s => s.raceName === r.name && s.raceSource === r.source);
  // Las subrazas de otra fuente (Mark of Shadow de ERLW sobre el elfo PHB) cuelgan de la raza base.
  if (!mine.length) raceRows.push(raceRow(r));
  for (const s of mine) raceRows.push(raceRow(r, s.name ? s : { ...s, name: undefined }));
}
// Fuera también las variantes de ambientación con la misma mecánica que su trasfondo del PHB
// («Baldur's Gate Acolyte», «Augen Trust (Spy)»…).
const bgs = resolveCopies(load('backgrounds.json').background).filter(
  b => BOOKS[b.source] && !/^Baldur's Gate /.test(b.name) && !(b.source === 'EGW' && / \(.+\)$/.test(b.name)),
);
const bgRows = bgs.map(bgRow);

const text = fs.readFileSync(OUT, 'utf8');
const prefix = '(function(r){r.CampaignData=',
  end = text.lastIndexOf(';})('),
  suffix = text.slice(end);
const data = JSON.parse(text.slice(prefix.length, end));

if (CHECK) {
  const sorted = o =>
    JSON.stringify(o, (k, v) =>
      v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort()) : v,
    );
  for (const [kind, rows] of [
    ['races', raceRows],
    ['backgrounds', bgRows],
  ]) {
    let same = 0;
    for (const old of data[kind]) {
      const mine = rows.find(r => r.id === old.id);
      if (!mine) console.log('falta en la conversión:', kind, old.id);
      else {
        const { name: _a, ...x } = old,
          { name: _b, ...y } = mine;
        if (sorted(x) === sorted(y)) same++;
        else console.log('distinto:', old.id, '\n  antes', sorted(x), '\n  ahora', sorted(y));
      }
    }
    console.log(kind, 'idénticas', same, 'de', data[kind].length);
  }
  process.exit(0);
}

// Las entradas existentes se actualizan con la conversión (conservan id y nombre en castellano,
// porque las fichas guardadas las referencian); las nuevas se agregan al final.
const match = (rows, old) =>
  rows.find(r => r.id === old.id || r.english + '|' + r.source === old.english + '|' + old.source);
let updated = 0;
const refresh = (olds, rows) =>
  olds.map(old => {
    const mine = match(rows, old);
    if (!mine) return old;
    const next = { ...mine, id: old.id, name: old.name };
    if (JSON.stringify(next) !== JSON.stringify(old)) updated++;
    return next;
  });
const fresh = (olds, rows) => rows.filter(r => !olds.some(old => match([r], old)));
const addRaces = fresh(data.races, raceRows),
  addBgs = fresh(data.backgrounds, bgRows);
data.sources = { ...BOOKS };
data.races = [...refresh(data.races, raceRows), ...addRaces];
data.backgrounds = [...refresh(data.backgrounds, bgRows), ...addBgs];
fs.writeFileSync(OUT, prefix + JSON.stringify(data) + suffix);

// Los libros habilitables de cada ficha se validan contra Catalog.sources: se suman los que falten.
const CAT = path.join(__dirname, '..', 'catalog.js'),
  catText = fs.readFileSync(CAT, 'utf8'),
  catPrefix = '(function(root){root.Catalog=',
  catEnd = catText.lastIndexOf(';})('),
  catalog = JSON.parse(catText.slice(catPrefix.length, catEnd));
const missing = Object.entries(BOOKS).filter(([id]) => !catalog.sources.some(([k]) => k === id));
if (missing.length) {
  catalog.sources = [...catalog.sources, ...missing];
  fs.writeFileSync(CAT, catPrefix + JSON.stringify(catalog) + catText.slice(catEnd));
}
console.log(`+${missing.length} libros en el catálogo`);
console.log(`+${addRaces.length} razas, +${addBgs.length} trasfondos, ${updated} actualizadas`);
for (const r of [...addRaces, ...addBgs]) console.log(' ', r.source.padEnd(6), r.english, '→', r.name);
