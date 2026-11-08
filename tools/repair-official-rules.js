/* Correct only rule blocks belonging to the supplied 2014 books. Private reference cache is not published.
   node tools/repair-official-rules.js <private-rules-reference.json> [report.json] */
const fs = require('node:fs'),
  path = require('node:path'),
  crypto = require('node:crypto');
const { load } = require('../test/load');
const { normalize: norm, renderer, featureId } = require('./official-rules-text');
const sources = require('./official-book-sources.json');
const root = path.join(__dirname, '..');
const input = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const g = load();
if (process.env.OFFICIAL_RULES_INPUT)
  require('node:vm').runInContext(fs.readFileSync(process.env.OFFICIAL_RULES_INPUT, 'utf8'), g);
const data = g.OfficialContentData,
  render = renderer(input);
const report = { rules: [], spells: [], addedRules: [], addedSpells: [], unsupported: [] };
const abilityNames = {
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma',
};
const children = {
  Trucos: 'Cantrips',
  'Espacios de conjuro': 'Spell Slots',
  'Aptitud mágica': 'Spellcasting Ability',
  'Lanzamiento ritual': 'Ritual Casting',
  'Canalizador mágico': 'Spellcasting Focus',
  'Preparar y lanzar conjuros': 'Preparing and Casting Spells',
  'Aprender conjuros de nivel 1 o superior': 'Learning Spells of 1st Level and Higher',
  'Libro de conjuros': 'Spellbook',
  'Tu libro de conjuros': 'Your Spellbook',
  'Conjuros de dominio': 'Domain Spells',
  'Conjuros de juramento': 'Oath Spells',
  'Lista de conjuros ampliada': 'Expanded Spell List',
};
function childEntry(entries, name) {
  for (const entry of entries || []) {
    if (typeof entry !== 'object' || entry === null) continue;
    if (norm(entry.name) === norm(children[name] || name)) return entry;
    const nested = childEntry(entry.entries || entry.items, name);
    if (nested) return nested;
  }
  return null;
}
function matchRule(row) {
  const [scope, id, ...rest] = row.key.split(':'),
    full = rest.join(':');
  // Slash is also part of the printed feature name Destroy Undead (CR 1/2).
  const name = row.data.feature || full;
  let rows = [];
  if (scope === 'class')
    rows = (input.classes[id]?.classFeature || []).filter(
      r =>
        norm(r.name) === norm(name) &&
        r.level === row.data.level &&
        r.source === row.source &&
        (r.classSource || 'PHB') !== 'XPHB',
    );
  if (scope === 'sub') {
    const sc = g.ClassData.subclasses.find(s => s.id === id),
      book = input.classes[sc?.classId];
    const classSource = g.ClassData.classes[sc?.classId]?.source;
    const subs = (book?.subclass || []).filter(
      r => norm(r.name) === norm(sc.english) && r.source === sc.source && (r.classSource || 'PHB') === classSource,
    );
    if (subs.length !== 1) throw Error('Ambiguous subclass identity: ' + row.key);
    rows = book.subclassFeature.filter(
      r =>
        norm(r.name) === norm(name) &&
        r.level === row.data.level &&
        r.source === row.source &&
        r.subclassShortName === (subs[0].shortName || subs[0].name) &&
        (r.subclassSource || 'PHB') === sc.source &&
        (r.classSource || 'PHB') !== 'XPHB',
    );
  }
  if (scope === 'opt') {
    const target = g.ClassData.options.find(r => r.id === id);
    rows = input.options.filter(r => norm(r.name) === norm(target?.english) && r.source === row.source);
  }
  if (scope === 'feat') {
    const target = g.Catalog.feats.find(r => r.id === id);
    rows = input.feats.filter(r => norm(r.name) === norm(target?.english) && r.source === row.source);
  }
  if (rows.length !== 1) throw Error('Ambiguous rule identity: ' + row.key + ' (' + rows.length + ')');
  const rowRef = rows[0],
    baseKey = `${scope}:${id}:${name}`;
  const childName = full.startsWith(name + '/') ? full.slice(name.length + 1) : null;
  const child = childName ? childEntry(rowRef.entries, childName) : null;
  if (childName && !child) throw Error('Unmatched child heading: ' + row.key);
  return { rowRef, entries: child ? child.entries : rowRef.entries, childName, baseKey };
}
function abilityText(ability) {
  return (ability || [])
    .map(a =>
      Object.entries(a)
        .map(([key, value]) =>
          key === 'choose'
            ? value.entry ||
              `Increase your ${value.from.map(k => abilityNames[k]).join(' or ')} score by ${value.amount || 1}, to a maximum of 20.`
            : `Increase your ${abilityNames[key]} score by ${value}, to a maximum of 20.`,
        )
        .join('\n'),
    )
    .join('\nOR\n');
}
function cleanRule(row) {
  const { rowRef: r, entries, childName } = matchRule(row);
  const text = [row.kind === 'feat' && abilityText(r.ability), render.prose(entries)].filter(Boolean).join('\n\n');
  if (!text) throw Error('Empty cleaned rule: ' + row.key);
  row.data = { ...row.data, text, rulesLanguage: 'en', reviewed: true, reference: featureId(r), sourcePage: r.page };
  report.rules.push({
    key: row.key,
    reference: featureId(r),
    child: childName || undefined,
    bookId: row.data.bookId,
    page: row.data.page,
    sourcePage: r.page,
    sha256: crypto.createHash('sha256').update(text).digest('hex'),
  });
}
for (const row of data.rules) cleanRule(row);
const bySource = new Map();
for (const book of data.books)
  for (const source of sources[book.id] || []) if (!bySource.has(source)) bySource.set(source, book);
const keys = new Set(data.rules.map(r => r.key));
function addRule(scope, target, feature) {
  const source = feature?.source || target.source || target.sourceKey,
    book = bySource.get(source);
  if (!book) return;
  const name = feature?.english || feature?.name,
    key = scope === 'class' || scope === 'sub' ? `${scope}:${target.id}:${name}` : `${scope}:${target.id}`;
  if (keys.has(key)) return;
  // Structural advancement headings have no independent rule text.
  if (feature && /^(?:.* feature|.* feature \(.*\))$/i.test(name)) return;
  const row = {
    kind: scope === 'feat' ? 'feat' : 'feature',
    key,
    source,
    data: {
      target: scope === 'sub' ? 'subclass' : scope === 'opt' ? 'option' : scope,
      ref: target.id,
      name: feature?.name || target.name,
      ...(feature ? { feature: name, level: feature.level } : {}),
      book: book.title,
      bookId: book.id,
      source,
      language: book.language,
      bundled: true,
      page: null,
    },
  };
  try {
    cleanRule(row);
  } catch (error) {
    report.unsupported.push({ key, reason: error.message });
    return;
  }
  keys.add(key);
  data.rules.push(row);
  report.addedRules.push(key);
}
for (const c of Object.values(g.ClassData.classes)) for (const f of c.features) addRule('class', c, f);
for (const c of g.ClassData.subclasses) for (const f of c.features) addRule('sub', c, f);
for (const c of g.ClassData.options) addRule('opt', c);
for (const c of g.Catalog.feats) addRule('feat', c);
function spellReference(row, canonical) {
  const own = sources[row.bookId] || [];
  let refs = input.spells.filter(r => norm(r.name) === norm(canonical.english));
  const preferred = refs.filter(r => own.includes(r.source) || r.source === row.sourceKey);
  if (preferred.length) refs = preferred;
  else {
    const original = refs.filter(r => r.source === canonical.sourceKey);
    if (original.length) refs = original;
  }
  if (refs.length !== 1) throw Error('Ambiguous spell identity: ' + canonical.id);
  return refs[0];
}
const schools = {
  A: 'Abjuración',
  C: 'Conjuración',
  D: 'Adivinación',
  E: 'Encantamiento',
  I: 'Ilusión',
  N: 'Nigromancia',
  T: 'Transmutación',
  V: 'Evocación',
};
function spellTime(times) {
  return times
    .map(
      t =>
        `${t.number} ${t.unit === 'bonus' ? 'bonus action' : t.unit}${t.number === 1 ? '' : 's'}${t.condition ? ', ' + t.condition : ''}`,
    )
    .join(' or ');
}
function spellRange(range) {
  const d = range.distance;
  return range.type === 'point'
    ? d?.amount
      ? `${d.amount} ${d.type}`
      : d?.type || 'special'
    : `Self (${d?.amount || ''} ${d?.type || ''} ${range.type})`;
}
function spellDuration(durations) {
  return durations
    .map(
      d =>
        `${d.concentration ? 'Concentration, ' : ''}${d.type === 'timed' ? (d.concentration || d.duration.upTo ? 'up to ' : '') + d.duration.amount + ' ' + d.duration.type + (d.duration.amount === 1 ? '' : 's') : d.type === 'permanent' ? 'Until ' + (d.ends || ['dispelled']).map(e => ({ dispel: 'dispelled', trigger: 'triggered', discharge: 'discharged' })[e] || e).join(' or ') : d.type === 'instant' ? 'Instantaneous' : d.type}`,
    )
    .join(' or ');
}
function cleanSpell(row) {
  const canonical = g.Catalog.spells.find(s => s.id === row.canonicalId),
    r = spellReference(row, canonical);
  row.name = row.language === 'en' ? r.name : canonical.name;
  row.level = r.level;
  row.school = schools[r.school];
  row.ritual = Boolean(r.meta?.ritual);
  row.time = spellTime(r.time);
  row.range = spellRange(r.range);
  row.components = [
    r.components.v && 'V',
    r.components.s && 'S',
    r.components.m && 'M (' + (typeof r.components.m === 'string' ? r.components.m : r.components.m.text) + ')',
  ]
    .filter(Boolean)
    .join(', ');
  row.duration = spellDuration(r.duration);
  row.concentration = r.duration.some(d => d.concentration);
  row.text = render.prose(r.entries);
  row.higher = render.prose(r.entriesHigherLevel).replace(/^At Higher Levels\s*/, '');
  row.rulesLanguage = 'en';
  row.reviewed = true;
  row.reference = r.name + '|' + r.source;
  row.sourcePage = r.page;
  report.spells.push({
    id: row.id,
    reference: row.reference,
    bookId: row.bookId,
    page: row.page,
    sourcePage: r.page,
    sha256: crypto
      .createHash('sha256')
      .update(row.text + '\n' + row.higher)
      .digest('hex'),
  });
}
for (const row of data.spells) cleanSpell(row);
const knownSpells = new Set(data.spells.map(s => s.canonicalId));
for (const canonical of g.Catalog.spells) {
  if (knownSpells.has(canonical.id)) continue;
  const book = bySource.get(canonical.sourceKey);
  if (!book || !input.spells.some(r => r.source === canonical.sourceKey && norm(r.name) === norm(canonical.english)))
    continue;
  const row = {
    id: `official-${book.id}:${canonical.id}`,
    canonicalId: canonical.id,
    bookId: book.id,
    book: book.title,
    sourceKey: canonical.sourceKey,
    language: book.language,
    page: null,
  };
  cleanSpell(row);
  data.spells.push(row);
  knownSpells.add(canonical.id);
  report.addedSpells.push(canonical.id);
}
for (const book of data.books) {
  book.counts.rules = data.rules.filter(r => r.data.bookId === book.id).length;
  book.counts.spells = data.spells.filter(r => r.bookId === book.id).length;
}
data.audit.rulesReview = {
  rules: data.rules.length,
  spells: data.spells.length,
  addedRules: report.addedRules.length,
  addedSpells: report.addedSpells.length,
  unresolved: report.unsupported.length,
};
if (report.unsupported.length) throw Error('Unreviewed rules remain: ' + JSON.stringify(report.unsupported));
require('./official-data-io.js').write(
  root,
  data,
  'Reviewed official 2014 game rules from the supplied books. Private PDFs and reference caches are excluded.',
);
if (process.argv[3]) fs.writeFileSync(process.argv[3], JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ...data.audit.rulesReview, unsupported: report.unsupported }, null, 2));
