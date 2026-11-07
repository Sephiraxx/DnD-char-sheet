/* Metadata for existing official 2014 entries, from the pinned private reference snapshot.
   node tools/build-grant-data.js .tmp-test/reference-source */
const fs = require('node:fs'),
  path = require('node:path');
const { load } = require('../test/load');
const g = load(),
  dir = process.argv[2];
if (!dir) throw Error('Provide the reference metadata folder.');
const read = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const fields = [
  'additionalSpells',
  'skillProficiencies',
  'toolProficiencies',
  'languageProficiencies',
  'weaponProficiencies',
  'armorProficiencies',
  'skillToolLanguageProficiencies',
  'expertise',
];
const pick = row => Object.fromEntries(fields.filter(k => row?.[k] !== undefined).map(k => [k, row[k]]));
const feats = read('feats.json').feat,
  opts = read('optionalfeatures.json').optionalfeature,
  races = read('races.json');
const out = {
  version: 1,
  edition: '2014',
  feats: {},
  options: {},
  races: {},
  classes: {},
  audit: {
    backgrounds: g.CampaignData.backgrounds.length,
    races: g.CampaignData.races.length,
    feats: g.Catalog.feats.length,
    options: g.ClassData.options.length,
    unmatched: [],
  },
};
for (const id of Object.keys(g.ClassData.classes)) {
  const file = path.join(dir, 'class--class-' + id + '.json');
  if (!fs.existsSync(file)) throw Error('Missing class metadata: ' + id);
  const pool = JSON.parse(fs.readFileSync(file, 'utf8')).class,
    raw = pool.find(c => c.name.toLowerCase() === id && c.source !== 'XPHB');
  if (!raw) throw Error('Missing 2014 class: ' + id);
  out.classes[id] = {
    start: raw.startingProficiencies?.toolProficiencies || [],
    multiclass: raw.multiclassing?.proficienciesGained?.toolProficiencies || [],
  };
}
for (const [kind, targets, pool] of [
  ['feats', g.Catalog.feats, feats],
  ['options', g.ClassData.options, opts],
]) {
  for (const row of targets) {
    if ((row.sourceKey || row.source) === 'TDCSR') continue;
    const raw = pool.find(x => x.name === (row.english || row.name) && x.source === (row.sourceKey || row.source));
    if (!raw) {
      out.audit.unmatched.push(kind + ':' + row.id);
      continue;
    }
    const data = pick(raw);
    if (Object.keys(data).length) out[kind][row.id] = data;
  }
}
function resolve(row, pool) {
  if (!row?._copy) return row;
  const base = pool.find(x => x.name === row._copy.name && x.source === row._copy.source);
  return { ...resolve(base, pool), ...row };
}
for (const row of g.CampaignData.races) {
  const split = /^(.*?) \((.*?)\)$/.exec(row.english);
  const base = resolve(
    races.race.find(x => x.name === row.english && x.source === row.source) ||
      races.race.find(x => x.name === split?.[1] && x.source === 'PHB') ||
      races.race.find(x => x.name === split?.[1]),
    races.race,
  );
  const sub =
    split && races.subrace.find(x => x.name === split[2] && x.raceName === split[1] && x.source === row.source);
  const data = pick({ ...base, ...resolve(sub, races.subrace) });
  // The existing merged catalog is authoritative for replacement traits and spells.
  for (const key of ['additionalSpells', 'skillProficiencies', 'toolProficiencies', 'languageProficiencies'])
    delete data[key];
  if (Object.keys(data).length) out.races[row.id] = data;
}
const root = path.join(__dirname, '..');
fs.writeFileSync(
  path.join(root, 'grant-data.js'),
  '/* Generated official 2014 grant metadata. */\n(function(root){root.GrantData=' +
    JSON.stringify(out) +
    ';})(typeof window!=="undefined"?window:globalThis);\n',
);
console.log(
  JSON.stringify({
    ...out.audit,
    spellFeats: Object.values(out.feats).filter(x => x.additionalSpells).length,
    spellOptions: Object.values(out.options).filter(x => x.additionalSpells).length,
  }),
);
