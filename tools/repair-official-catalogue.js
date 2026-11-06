/* Apply source-specific identity reviews to the PDF extraction. Stable IDs are retained.
   node tools/repair-official-catalogue.js <private-clean-blocks.json> [audit-output.json]
   Only blocks corresponding to entries in the supplied PDFs are emitted. */
const fs = require('node:fs'),
  path = require('node:path');
const A = require('./audit-official-catalogue'),
  ES = require('./monsters-es');
const reviews = require('./official-entry-reviews.json'),
  sources = require('./official-book-sources.json'),
  names = require('./official-name-aliases.json');
const LC = require('../library-core');
const rulePlain = require('./official-rules-text').plain;
const RAW =
  require.main === module && process.argv[2]
    ? JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
    : { monsters: [], items: [] };
const rawMonsters = new Map(RAW.monsters.map(r => [A.id(r), r]));
const rawItems = new Map((RAW.items || []).map(r => [A.id(r), r]));
const root = path.join(__dirname, '..');
const data = A.ctx.OfficialContentData;
const plain = s =>
  rulePlain(
    String(s ?? '')
      .replace(/\{@hom\}/g, 'Hit or Miss: ')
      .replace(/\{@hitYourSpellAttack\}/g, 'your spell attack modifier')
      .replace(/\{@quickref ([^}]+)\}/g, (_, v) => v.split('|')[4] || v.split('|')[0])
      .replace(/\{@(?:h)\}/g, 'Hit: ')
      .replace(
        /\{@atk ([^}]+)\}/g,
        (_, v) =>
          ({
            mw: 'Melee Weapon Attack:',
            rw: 'Ranged Weapon Attack:',
            ms: 'Melee Spell Attack:',
            rs: 'Ranged Spell Attack:',
            'mw,rw': 'Melee or Ranged Weapon Attack:',
            'ms,rs': 'Melee or Ranged Spell Attack:',
          })[v] || 'Attack:',
      )
      .replace(/\{@skillCheck ([^ }]+) ([^}]+)\}/g, (_, skill, bonus) => (/^[+-]/.test(bonus) ? bonus : '+' + bonus))
      .replace(/\{@recharge(?: (\d))?\}/g, (_, v) => `(Recharge ${v || 6}${v && v !== '6' ? '-6' : ''})`)
      .replace(/\{@hit ([^}]+)\}/g, (_, v) => (/^-/.test(v) ? v : '+' + v))
      .replace(/\{@dc ([^}|]+)(?:\|[^}]+)?\}/g, 'DC $1'),
  )
    .replace(/\s+/g, ' ')
    .trim();
function prose(x) {
  if (typeof x === 'string') return plain(x);
  if (typeof x === 'number') return String(x);
  if (Array.isArray(x)) return x.map(prose).filter(Boolean).join('\n\n');
  if (!x) return '';
  if (x.type === 'cell' && x.roll)
    return x.roll.exact !== undefined ? String(x.roll.exact) : x.roll.min + '–' + x.roll.max;
  if (x.type === 'table')
    return [x.caption, (x.colLabels || []).map(prose).join(' · '), ...(x.rows || []).map(r => r.map(prose).join(' · '))]
      .filter(Boolean)
      .join('\n');
  const content = prose(x.entries || x.items || x.entry || '');
  return (x.name ? plain(x.name) + ': ' : '') + content;
}
const size = { T: 'Diminuto', S: 'Pequeño', M: 'Mediano', L: 'Grande', H: 'Enorme', G: 'Gargantuesco' };
const type = {
  aberration: 'aberración',
  beast: 'bestia',
  construct: 'constructo',
  celestial: 'celestial',
  dragon: 'dragón',
  elemental: 'elemental',
  fey: 'feérico',
  fiend: 'infernal',
  giant: 'gigante',
  humanoid: 'humanoide',
  monstrosity: 'monstruosidad',
  ooze: 'cieno',
  plant: 'planta',
  undead: 'muerto viviente',
};
const align = {
  L: 'legal',
  N: 'neutral',
  C: 'caótico',
  G: 'bueno',
  E: 'malvado',
  U: 'sin alineamiento',
  A: 'cualquier alineamiento',
};
const xp = [
  10, 200, 450, 700, 1100, 1800, 2300, 2900, 3900, 5000, 5900, 7200, 8400, 10000, 11500, 13000, 15000, 18000, 20000,
  22000, 25000, 33000, 41000, 50000, 62000, 75000, 90000, 105000, 120000, 135000, 155000,
];
const list = x =>
  (x || [])
    .map(v =>
      typeof v === 'string'
        ? v
        : Object.entries(v)
            .filter(([k]) => !['cond', 'preNote', 'note'].includes(k))
            .map(([, v]) => (Array.isArray(v) ? list(v) : plain(v)))
            .join(', ') + (v.note ? ' ' + plain(v.note) : ''),
    )
    .join('; ');
const skills = x =>
  Object.entries(x || {})
    .map(
      ([k, v]) =>
        (k.length === 3 ? k.toUpperCase() : k.replace(/\b[a-z]/g, c => c.toUpperCase()).replace(' Of ', ' of ')) +
        ' ' +
        plain(v),
    )
    .join(', ');
function actions(raw, facts) {
  return (raw || []).map((r, i) => {
    const f = (facts || []).find(f => f.name === r.name) || facts?.[i];
    const out = { n: plain(r.name), d: prose(r.entries) };
    if (Number.isFinite(f?.atk)) out.atk = f.atk;
    if (f?.save && Number.isInteger(f.save[1])) out.dc = f.save;
    const damage = (f?.defaultDamage || []).filter(([d]) => /^(?:\d+d\d+(?:[+-]\d+)?|\d+)$/.test(d));
    if (damage.length) out.dmg = damage;
    return out;
  });
}
function converted(m, r, review, rawInput) {
  const out = { ...m, reference: A.id(r), reviewed: true, english: review.english || r.name };
  out.name = (
    review.name || (m.language === 'en' ? out.english : names[out.english]?.[0] || ES.name(out.english))
  ).replace(/^['"](.*)['"]$/, '$1');
  out.searchNames = [...new Set([m.name, out.english, ...(names[out.english] || [])])];
  out.ab = [r.str, r.dex, r.con, r.int, r.wis, r.cha];
  const numericAc = r.ac?.map(A.ac).find(Number.isInteger);
  if (numericAc !== undefined) out.ac = numericAc;
  if (r.hp.average) {
    out.hp = r.hp.average;
    out.hd = A.dice(r.hp.formula);
  }
  if (r.hp.special) {
    out.hpNote = plain(r.hp.special);
    out.summon = Boolean(r.summonedByClass || r.summonedBySpell) || !r.cr;
  }
  const acSpecial = r.ac?.find(a => a.special)?.special;
  if (acSpecial) out.acNote = plain(acSpecial);
  out.cr = Number.isFinite(A.cr(r.cr)) ? A.cr(r.cr) : 0;
  out.unrated = !Number.isFinite(A.cr(r.cr));
  out.xp = out.unrated ? 0 : out.cr === 0.125 ? 25 : out.cr === 0.25 ? 50 : out.cr === 0.5 ? 100 : xp[out.cr] || 0;
  const raw = rawInput || rawMonsters.get(A.id(r));
  out.acDetails = (r.ac || [])
    .map(a =>
      typeof a === 'number'
        ? String(a)
        : a.special
          ? plain(a.special)
          : [
              a.ac,
              a.from?.length ? '(' + a.from.map(plain).join(', ') + ')' : '',
              a.condition ? plain(a.condition) : '',
            ]
              .filter(Boolean)
              .join(' '),
    )
    .join('; ');
  if (raw?.legendaryActions || raw?.legendaryHeader)
    out.legendaryNote =
      prose(raw.legendaryHeader) ||
      `${raw.legendaryActions} legendary actions per round; regain them at the start of its turn.`;
  if (!review.coreOnly && raw) {
    out.size = (r.size || []).map(s => size[s] || s).join(' / ');
    out.type = type[typeof r.type === 'object' ? r.type.type : r.type] || m.type;
    out.align = (r.alignment || []).map(a => (typeof a === 'string' ? align[a] || a : prose(a))).join(' ');
    out.speed = Object.entries(r.speed || {})
      .filter(([, v]) => typeof v === 'number' || v?.number)
      .map(
        ([k, v]) =>
          (k === 'walk' ? '' : k + ' ') + (v.number || v) + ' ft.' + (v.condition ? ' ' + plain(v.condition) : ''),
      )
      .join(', ');
    out.saves = skills(r.save);
    out.skills = skills(r.skill);
    out.vuln = list(r.vulnerable);
    out.res = list(r.resist);
    out.imm = list(r.immune);
    out.cimm = list(r.conditionImmune);
    out.senses = [...(r.senses || []), 'passive Perception ' + r.passive].map(plain).join(', ');
    out.lang = (r.languages || []).map(plain).join(', ') || '—';
    out.traits = (raw.trait || []).map(t => [plain(t.name), prose(t.entries)]);
    for (const cast of raw.spellcasting || [])
      out.traits.push([
        plain(cast.name || 'Spellcasting'),
        [
          prose(cast.headerEntries),
          ...Object.entries(cast.spells || {}).map(
            ([level, v]) =>
              `${level === '0' ? 'Cantrips' : `Level ${level}${v.slots ? ' (' + v.slots + ' slots)' : ''}`}: ${(v.spells || []).map(plain).join(', ')}`,
          ),
          cast.will ? 'At will: ' + cast.will.map(plain).join(', ') : '',
          ...Object.entries(cast.daily || {}).map(
            ([n, v]) => n.replace(/e$/, ' each') + '/day: ' + v.map(plain).join(', '),
          ),
          prose(cast.footerEntries),
        ]
          .filter(Boolean)
          .join('\n'),
      ]);
    out.actions = actions(raw.action, r.action);
    out.reactions = actions(raw.reaction, r.reaction);
    out.legendary = actions(raw.legendary, r.legendary);
    out.bonus = actions(raw.bonus, r.bonus);
    out.mythic = actions(raw.mythic, r.mythic);
    const translated = ES.translate({ ...out, name: r.name, english: undefined });
    for (const f of [
      'speed',
      'align',
      'saves',
      'skills',
      'vuln',
      'res',
      'imm',
      'cimm',
      'senses',
      'lang',
      'traits',
      'actions',
      'reactions',
      'legendary',
    ])
      out[f] = translated[f] || out[f];
    for (const section of ['bonus', 'mythic'])
      out[section] = (out[section] || []).map(a => ({ ...a, n: ES.action(a.n), d: ES.text(a.d) }));
    out.rulesLanguage = 'en';
    out.referenceOnlyActions = false;
  }
  if (review.variantNote) out.variantNote = review.variantNote;
  if (review.coreOnly) {
    for (const section of ['actions', 'reactions', 'legendary'])
      out[section] = (out[section] || []).map(a => ({ n: a.n, d: a.d }));
    out.referenceOnlyActions = true;
  }
  Object.assign(out, review.overrides || {});
  if (out.unrated) {
    out.cr = 0;
    out.xp = 0;
  }
  delete out.issues;
  return out;
}
if (require.main === module) {
  const report = { monsters: [], items: [], removedDuplicates: [], unresolved: [] };
  const map = new Map();
  for (const m of A.allMonsters()) {
    const review = reviews.monsters[m.id] || {};
    const matched = A.matchMonster(m);
    const ref = review.reference || (matched.accepted ? matched.best?.reference : null);
    const r = A.facts.monsters.find(r => A.id(r) === ref);
    let out;
    if (review.pdf)
      out = {
        ...m,
        ...review.overrides,
        english: review.english,
        reviewed: true,
        reference: 'PDF:' + m.bookId + ':' + m.page,
      };
    else if (r) out = converted(m, r, review);
    else {
      report.unresolved.push(m.id);
      continue;
    }
    const signature = m.bookId + ':' + (review.coreOnly || review.pdf ? m.id : ref);
    if (map.has(signature)) {
      const first = map.get(signature);
      first.aliasIds = [...(first.aliasIds || []), out.id, ...(out.aliasIds || [])];
      first.searchNames = [...new Set([...(first.searchNames || []), m.name])];
      report.removedDuplicates.push(out.id);
      continue;
    }
    map.set(signature, out);
    report.monsters.push({
      id: out.id,
      reference: out.reference,
      changed: ['name', 'hp', 'ac', 'cr', 'hd', 'ab'].filter(f => JSON.stringify(out[f]) !== JSON.stringify(m[f])),
    });
  }
  if (report.unresolved.length) throw Error('Unreviewed creatures: ' + report.unresolved.join(', '));
  data.monsters = [...map.values()];
  data.completeMonsterReplacement = true;
  const rarities = {
    common: 'común',
    uncommon: 'infrecuente',
    rare: 'raro',
    'very rare': 'muy raro',
    legendary: 'legendario',
    artifact: 'artefacto',
    varies: 'variable',
    unknown: 'variable',
    'unknown (magic)': 'variable',
  };
  const itemNames = require('./official-item-name-aliases.json');
  const itemMap = new Map();
  if (process.argv[4]) {
    const z = require('node:zlib'),
      id = '17182bc795d5ced5';
    const input = JSON.parse(z.gunzipSync(fs.readFileSync(path.join(process.argv[4], id + '.json.gz'))));
    const old = data.items.filter(r => r.bookId === id),
      meta = old[0];
    const fixed = require('./parse-official-cards')(input).map(r => ({ ...meta, ...r, canonicalId: null }));
    const oldNames = [
      'Arco largo +1',
      'Bastón de llamada de ave',
      'Cota de malla de mithral',
      'Guanteletes de fuerza de ogro',
      'Hacha de guerra +1',
      'Pértiga contraíble',
      'Piedras mensajeras',
      'Poción de curación',
      'Poción de curación',
      'Poción de curación mayor',
      'Poción de respirar bajo el agua',
      'Sombrero de hechicería',
      'Vara inamovible',
      'Yelmo temible',
    ];
    for (let i = 0; i < old.length; i++) {
      const target = fixed.find(r => r.name === oldNames[i]);
      if (target) {
        target.aliasCatalogIds = [
          ...(target.aliasCatalogIds || []),
          (
            'official-' +
            id +
            '-' +
            old[i].name
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, ' ')
              .trim()
              .replace(/ /g, '-')
          ).slice(0, 100),
        ];
      }
    }
    data.items = data.items.filter(r => r.bookId !== id).concat(fixed);
  }
  for (const original of data.items) {
    const review = reviews.items[original.id] || {};
    if (review.remove) {
      report.removedDuplicates.push(original.id);
      continue;
    }
    const row = { ...original, ...review.overrides };
    if (review.name) row.name = review.name;
    row.catalogId =
      original.catalogId ||
      (
        'official-' +
        original.bookId +
        '-' +
        original.name
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, ' ')
          .trim()
          .replace(/ /g, '-')
      ).slice(0, 100);
    const matched = A.matchItem(row),
      ref = review.reference || (matched.accepted ? matched.best?.reference : null),
      r = A.facts.items.find(r => A.id(r) === ref);
    if (r) {
      row.english = r.name;
      row.reference = ref;
      if (row.language === 'en') row.name = r.name;
      else if (itemNames[r.name]) row.name = itemNames[r.name][0];
      const group = matched.referenceGroup?.map(ref => A.facts.items.find(r => A.id(r) === ref));
      row.rarity = group && new Set(group.map(r => r.rarity)).size > 1 ? 'variable' : rarities[r.rarity] || row.rarity;
      row.attunement = Boolean(r.reqAttune);
      row.attunementRequirement = typeof r.reqAttune === 'string' ? r.reqAttune : '';
      if (group) {
        row.variants = group.map(r => ({
          name: r.name,
          rarity: rarities[r.rarity] || r.rarity,
          attunement: Boolean(r.reqAttune),
        }));
        row.variantNote = 'Elegí la variante y su rareza antes de usar este objeto.';
      }
      const generic = /variable|varies|\+1.*\+2/i.test(original.detail) || review.overrides?.rarity === 'variable';
      const raw = rawItems.get(ref);
      if (raw?.entries && !group && !generic) {
        row.text = prose(raw.entries);
        row.rulesLanguage = 'en';
      }
    }
    Object.assign(row, review.overrides || {});
    row.name = row.name
      .replace(/^[^\p{L}\p{N}]+/u, '')
      .replace(/\s+/g, ' ')
      .trim();
    row.name = row.name.charAt(0).toUpperCase() + row.name.slice(1);
    row.reviewed = true;
    const signature = row.bookId + ':' + (ref || A.key(row.name));
    if (itemMap.has(signature)) {
      report.removedDuplicates.push(row.id);
      const keep = itemMap.get(signature);
      keep.aliasCatalogIds = [...(keep.aliasCatalogIds || []), row.catalogId];
      continue;
    }
    itemMap.set(signature, row);
    report.items.push({ id: row.id, reference: ref || 'PDF:' + row.bookId + ':' + row.page });
  }
  data.items = [...itemMap.values()];
  const adventures = new Set(
    'LRDT DC CRCotN TftYP DitLCoT OotA DSotDQ RoT SDW DIP LLK SKT GoS NEE SLW CoS LMoP ToA WBtW KftGV LoX QftIS PaBTSO ToFW PotA BGDIA IMR DoSI HotDQ IDRotF VEoR JttRC WDH WDMM'.split(
      ' ',
    ),
  );
  for (const b of data.books) {
    b.referenceSources = sources[b.id] || [];
    b.kind = b.referenceSources.some(s => adventures.has(s)) ? 'adventure' : 'rules';
    b.counts.monsters = data.monsters.filter(m => m.bookId === b.id).length;
    b.counts.items = data.items.filter(m => m.bookId === b.id).length;
  }
  for (const s of data.spells) {
    const canonical = A.ctx.Catalog.spells.find(x => x.id === s.canonicalId);
    if (canonical) {
      s.name = s.language === 'en' ? canonical.english : canonical.name;
      s.reviewed = true;
    }
  }
  data.audit.catalogueReview = {
    creatures: data.monsters.length,
    items: data.items.length,
    duplicatesRemoved: report.removedDuplicates.length,
    unresolved: report.unresolved.length,
  };
  fs.writeFileSync(
    path.join(root, 'official-content-data.js'),
    '/* Official 2014 game blocks from the supplied PDFs; identities and numerical fields reviewed against source metadata and documented PDF exceptions. */\n(function(r){r.OfficialContentData=' +
      JSON.stringify(data) +
      ';})(typeof window!=="undefined"?window:globalThis);\n',
  );
  if (process.argv[3]) fs.writeFileSync(process.argv[3], JSON.stringify(report, null, 2));
  console.log(JSON.stringify(data.audit.catalogueReview));
}
module.exports = { plain, prose, converted };
