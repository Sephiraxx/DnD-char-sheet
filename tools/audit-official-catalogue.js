/* Compare every imported entry with edition/source-specific reference metadata.
   Run without --write first; uncertain identities require an explicit review. */
const fs = require('node:fs'),
  path = require('node:path'),
  vm = require('node:vm');
const ROOT = path.join(__dirname, '..');
const facts = require('./official-reference-facts.json');
const additions = require('./official-reference-additions.json');
facts.monsters.push(...additions.monsters);
facts.items.push(...additions.items);
for (const r of facts.monsters)
  Object.assign(r, require('./official-entry-reviews.json').referenceOverrides?.[r.source + ':' + r.name] || {});
facts.items.push(...require('./official-variant-facts.json').items);
const sources = require('./official-book-sources.json');
const ES = require('./monsters-es.js');
const aliases = require('./official-name-aliases.json');
const itemWords = require('./item-name-translations.json');
const itemAliases = require('./official-item-name-aliases.json');
const ctx = { structuredClone };
ctx.window = ctx;
vm.createContext(ctx);
for (const f of [
  'catalog.js',
  'class-data.js',
  'names-es.js',
  'campaign-data.js',
  'magic-items.js',
  'monsters-data.js',
  'book-content-data.js',
  'official-content-data.js',
  'official-monsters-data.js',
])
  vm.runInContext(
    fs.readFileSync(
      f === 'official-content-data.js' && process.env.OFFICIAL_CONTENT_INPUT
        ? process.env.OFFICIAL_CONTENT_INPUT
        : path.join(ROOT, f),
      'utf8',
    ),
    ctx,
  );
const key = s =>
  String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
const dice = s =>
  String(s || '')
    .toLowerCase()
    .replace(/\s/g, '');
const cr = x => {
  x = typeof x === 'object' ? x.cr : x;
  return String(x).includes('/') ? Number(x.split('/')[0]) / Number(x.split('/')[1]) : Number(x);
};
const ac = x => (typeof x === 'number' ? x : x?.ac);
function distance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let p = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const v = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, p + (a[i - 1] === b[j - 1] ? 0 : 1));
      p = v;
    }
  }
  return row[b.length];
}
const similarity = (a, b) => {
  a = key(a);
  b = key(b);
  return !a || !b ? 0 : 1 - distance(a, b) / Math.max(a.length, b.length);
};
const tokenKey = s =>
  String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(x => x && !['of', 'the', 'de', 'del', 'la', 'el', 'los', 'las', 'y', 'and'].includes(x))
    .sort()
    .join('');
const referenceLabels = new Map(
  facts.monsters.map(r => [
    r,
    [...new Set([r.name, ...(r.alias || []), ...(aliases[r.name] || []), ES.name(r.name)].map(key))],
  ]),
);
const nameScores = new Map();
const nameSimilarity = (m, r) => {
  const wanted = key(m.name),
    cache = wanted + '|' + r.name;
  if (nameScores.has(cache)) return nameScores.get(cache);
  let best = 0;
  for (const label of referenceLabels.get(r) || []) {
    if (!label) continue;
    const max = Math.max(wanted.length, label.length);
    if (1 - Math.abs(wanted.length - label.length) / max <= best) continue;
    best = Math.max(best, 1 - distance(wanted, label) / max);
  }
  nameScores.set(cache, best);
  return best;
};
const id = r => r.source + ':' + r.name;
function scoreMonster(m, r) {
  const values = [r.str, r.dex, r.con, r.int, r.wis, r.cha],
    ab = values.filter((v, i) => v === m.ab[i]).length;
  const hp = m.hp === r.hp?.average,
    armor = (r.ac || []).some(x => ac(x) === m.ac),
    challenge = m.cr === cr(r.cr);
  const formula = Boolean(m.hd) && dice(m.hd) === dice(r.hp?.formula),
    name = nameSimilarity(m, r);
  const primary = (sources[m.bookId] || []).includes(r.source);
  const page = primary && Number.isFinite(r.page) ? Math.max(0, 8 - Math.abs(m.page - r.page)) : 0;
  return {
    reference: id(r),
    score: ab * 7 + (hp ? 12 : 0) + (armor ? 5 : 0) + (challenge ? 10 : 0) + (formula ? 8 : 0) + name * 60 + page,
    ab,
    hp,
    armor,
    challenge,
    formula,
    name,
    page,
    primary,
  };
}
const refs = facts.monsters.filter(r => r.hp && [r.str, r.dex, r.con, r.int, r.wis, r.cha].every(Number.isInteger));
function matchMonster(m) {
  const primary = new Set([...(sources[m.bookId] || []), 'MM']);
  let list = refs
    .map(r => ({ r, ...scoreMonster(m, r) }))
    .filter(r => primary.has(r.r.source) || r.name >= 0.8)
    .sort((a, b) => b.score - a.score);
  let best = list[0],
    second = list.find(x => key(x.r.name) !== key(best.r.name));
  if (!best || best.score < 64) {
    const fallback = refs
      .map(r => ({ r, ...scoreMonster(m, r) }))
      .filter(x => x.ab === 6 && x.hp && x.armor && x.challenge)
      .sort((a, b) => b.score - a.score);
    if (fallback[0] && (!best || fallback[0].score > best.score)) {
      list = fallback;
      best = list[0];
      second = list.find(x => key(x.r.name) !== key(best.r.name));
    }
  }
  const margin = best ? best.score - (second?.score || 0) : 0;
  const accepted =
    best &&
    ((best.name >= 0.84 && best.score >= 55 && margin >= 5) ||
      (best.score >= 65 && margin >= 12) ||
      (best.ab === 6 && best.hp && best.armor && best.challenge && margin >= 8));
  return { accepted: Boolean(accepted), best, margin, candidates: list.slice(0, 4).map(({ r, ...s }) => s) };
}
function allMonsters() {
  if (ctx.OfficialContentData.completeMonsterReplacement) return ctx.OfficialContentData.monsters;
  const map = new Map(ctx.BookContentData.monsters.filter(m => sources[m.bookId]).map(m => [m.id, m]));
  for (const m of ctx.OfficialContentData.monsters) map.set(m.id, m);
  return [...map.values()];
}
const rarity = {
  common: 'comun',
  uncommon: 'infrecuente',
  rare: 'raro',
  'very rare': 'muyraro',
  legendary: 'legendario',
  artifact: 'artefacto',
  varies: 'variable',
};
const spellAliases = require('./official-spell-aliases.json');
const spellNames = ctx.Catalog.spells.map(s => ({
  en: s.english.toLowerCase(),
  names: [s.name, s.english, ...Object.keys(spellAliases).filter(k => spellAliases[k] === s.id)]
    .map(key)
    .filter(x => x.length >= 7),
}));
function translatedItem(name) {
  let t = name.toLowerCase();
  for (const [a, b] of Object.entries(itemWords).sort((a, b) => b[0].length - a[0].length))
    t = t.replace(new RegExp('\\b' + a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'g'), b);
  return t;
}
const itemLabels = new Map(facts.items.map(r => [r, translatedItem(r.name)]));
const itemBase = name =>
  name
    .replace(/^\+[123]\s+/, '')
    .replace(/\s*\((?:Cantrip|[1-5](?:st|nd|rd|th) Level|Small|Medium|Large)\)$/, '')
    .replace(/^(?:Acid|Cold|Fire|Force|Lightning|Necrotic|Poison|Psychic|Radiant|Thunder) Absorbing/, 'Absorbing')
    .replace(/^(?:Air|Earth|Fire|Water) Elemental/, 'Elemental')
    .replace(/^(?:Lawful|Chaotic|Good|Evil) Outer/, 'Outer');
const itemAliasLabels = r => {
  const base = itemBase(r.name),
    tier = /^\+([123])\s+/.exec(r.name)?.[1];
  return [...(itemAliases[r.name] || []), ...(itemAliases[base] || []).map(n => n + (tier ? ' +' + tier : ''))];
};
const itemByRef = new Map(facts.items.map(r => [id(r), r]));
function matchItem(m) {
  const text = key(m.text),
    mentions = new Set(spellNames.filter(s => s.names.some(n => text.includes(n))).map(s => s.en));
  const base = m.canonicalId && ctx.MagicItems.byId(m.canonicalId),
    wanted = base?.english;
  const primary = new Set([...(sources[m.bookId] || []), 'DMG']);
  const list = facts.items
    .filter(
      r =>
        primary.has(r.source) ||
        (r.otherSources || []).some(s => primary.has(s.source)) ||
        key(m.name) === key(r.name) ||
        itemAliasLabels(r).some(n => key(n) === key(m.name)),
    )
    .map(r => {
      const tier = /\+([123])/.exec(m.name)?.[1],
        refTier = /\+([123])/.exec(r.name)?.[1];
      const labels = itemAliasLabels(r);
      if (!tier) labels.push(...(itemAliases[itemBase(r.name)] || []));
      const name =
        tier && refTier && tier !== refTier
          ? 0
          : Math.max(
              similarity(m.name, r.name),
              similarity(m.name, itemLabels.get(r)),
              similarity(tokenKey(m.name), tokenKey(itemLabels.get(r))),
              wanted ? similarity(wanted, r.name) : 0,
              ...labels.map(n => similarity(m.name, n)),
            );
      const n = (r.spells || []).filter(s => mentions.has(s)).length,
        spell = n >= 2 ? n / Math.max(1, r.spells.length) : 0;
      const score =
        name * 70 +
        spell * 28 +
        (rarity[r.rarity] === key(m.rarity) ? 3 : 0) +
        (Boolean(r.reqAttune) === m.attunement ? 2 : 0);
      return { reference: id(r), score, name, spells: n, spell, rarity: r.rarity, attune: r.reqAttune };
    })
    .sort((a, b) => b.score - a.score);
  const best = list[0];
  const bestRef = best && itemByRef.get(best.reference),
    group = bestRef
      ? list.filter(x => {
          const r = itemByRef.get(x.reference);
          return r.source === bestRef.source && itemBase(r.name) === itemBase(bestRef.name) && x.name >= 0.92;
        })
      : [];
  const other = list.find(x => !group.some(g => g.reference === x.reference));
  const margin = best ? best.score - (other?.score || 0) : 0;
  return {
    accepted: Boolean(
      best &&
      ((best.name >= 0.92 && margin >= 3) ||
        (best.name >= 0.85 && margin >= 8) ||
        (best.spells >= 3 && best.spell >= 0.7 && margin >= 12)),
    ),
    best,
    margin,
    referenceGroup: group.length > 1 ? group.map(x => x.reference) : undefined,
    candidates: list.slice(0, 4),
  };
}
function main() {
  const rows = allMonsters().map(m => {
    const x = matchMonster(m);
    return {
      id: m.id,
      bookId: m.bookId,
      page: m.page,
      name: m.name,
      accepted: x.accepted,
      margin: x.margin,
      best: x.best?.reference,
      candidates: x.candidates,
    };
  });
  const output = process.argv[2] || path.join(ROOT, '.tmp-test', 'catalogue-audit.json');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const items = ctx.OfficialContentData.items.map(m => {
    const x = matchItem(m);
    return { id: m.id, name: m.name, bookId: m.bookId, page: m.page, ...x };
  });
  fs.writeFileSync(
    output,
    JSON.stringify({ total: rows.length, accepted: rows.filter(x => x.accepted).length, rows, items }, null, 2),
  );
  console.log(
    JSON.stringify({
      total: rows.length,
      accepted: rows.filter(x => x.accepted).length,
      review: rows.filter(x => !x.accepted).length,
      items: items.length,
      itemMatched: items.filter(x => x.accepted).length,
      report: output,
    }),
  );
}
if (require.main === module) main();
module.exports = {
  ctx,
  facts,
  refs,
  key,
  dice,
  cr,
  ac,
  similarity,
  id,
  scoreMonster,
  matchMonster,
  matchItem,
  allMonsters,
};
