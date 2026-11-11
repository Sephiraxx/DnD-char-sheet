/* Build full references for existing official 2014 options; no new character mechanics.
   node tools/build-shared-references.js <private 5etools data folder> */
const fs = require('node:fs'),
  path = require('node:path'),
  crypto = require('node:crypto');
const { load } = require('../test/load');
const { renderer, plain } = require('./official-rules-text');
const root = path.join(__dirname, '..');
const dir = process.argv[2];
if (!dir) throw Error('A private source folder is required.');
const read = f => JSON.parse(fs.readFileSync(path.join(dir, f.replaceAll('/', '--')), 'utf8'));
const g = load([
  'catalog.js',
  'class-data.js',
  'names-es.js',
  'feat-data.js',
  'feats.js',
  'magic-items.js',
  'companions.js',
  'campaign-data.js',
  'book-content-data.js',
  'book-content.js',
  'official-content-data.js',
  'official-text-data.js',
  'official-monsters-data.js',
  'shared-spell-data.js',
  'official-content.js',
]);
const key = s =>
  String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
const hash = x =>
  crypto
    .createHash('sha256')
    .update(typeof x === 'string' ? x : JSON.stringify(x))
    .digest('hex');
const cls = Object.fromEntries(Object.keys(g.ClassData.classes).map(id => [id, read('class/class-' + id + '.json')]));
const feats = read('feats.json').feat,
  options = read('optionalfeatures.json').optionalfeature;
const render = renderer({ classes: cls, options });
const races = read('races.json'),
  backgrounds = read('backgrounds.json').background;
const entries = [],
  features = [],
  unmatched = [];
const sourceNames = { ...g.CampaignData.sources, ...Object.fromEntries(g.Catalog.sources) };
const abilityNames = {
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma',
};
function abilityText(abilities) {
  return (abilities || [])
    .map(a => {
      const fixed = Object.entries(a)
        .filter(([k, v]) => abilityNames[k] && typeof v === 'number')
        .map(([k, v]) => `Increase your ${abilityNames[k]} score by ${v}, to a maximum of 20.`);
      if (a.choose)
        fixed.push(
          `Increase your ${(a.choose.from || []).map(k => abilityNames[k] || k).join(' or ')} score by ${a.choose.amount || 1}, to a maximum of 20.`,
        );
      return fixed.join('\n');
    })
    .filter(Boolean)
    .join('\nOR\n');
}
function copy(row, pool, seen = new Set()) {
  if (!row._copy) return structuredClone(row);
  const uid = row.name + '|' + row.source;
  if (seen.has(uid)) throw Error('Cyclic copy ' + uid);
  const base = pool.find(r => r.name === row._copy.name && r.source === row._copy.source);
  if (!base) throw Error('Missing copy ' + uid + ' -> ' + JSON.stringify(row._copy));
  const out = { ...copy(base, pool, new Set([...seen, uid])), ...structuredClone(row) };
  delete out._copy;
  for (const [field, mods] of Object.entries(row._copy._mod || {}))
    for (const mod of [mods].flat()) {
      if (mod.mode === 'replaceTxt') {
        const regex = new RegExp(mod.replace, mod.flags || 'g');
        const replace = v =>
          typeof v === 'string'
            ? v.replace(regex, mod.with)
            : Array.isArray(v)
              ? v.map(replace)
              : v && typeof v === 'object'
                ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, replace(x)]))
                : v;
        if (field === '*') out.entries = replace(out.entries);
        else out[field] = replace(out[field]);
        continue;
      }
      const list = out[field] || [],
        items = [mod.items || []].flat();
      if (mod.mode === 'appendArr') out[field] = [...list, ...items];
      else if (mod.mode === 'insertArr') {
        out[field] = [...list];
        out[field].splice(mod.index, 0, ...items);
      } else if (mod.mode === 'replaceArr') {
        const at =
          typeof mod.replace === 'number'
            ? mod.replace
            : mod.replace?.index !== undefined
              ? mod.replace.index
              : list.findIndex(x => x.name === mod.replace || x === mod.replace);
        if (at < 0) throw Error('Copy replacement not found ' + uid + ' / ' + mod.replace);
        out[field] = [...list];
        out[field].splice(at, 1, ...items);
      } else throw Error('Unsupported copy ' + uid + ' / ' + mod.mode);
    }
  return out;
}
function emit(kind, target, raw, text) {
  if (!text?.trim()) throw Error('Empty reference ' + kind + ':' + target.id);
  if (/\{@|\[object Object\]|undefined/.test(text)) throw Error('Unrendered ' + kind + ':' + target.id);
  const source = raw.source || target.sourceKey || target.source;
  const row = {
    key: kind + ':' + target.id,
    name: target.name,
    text,
    book: sourceNames[source] || source,
    sourceKey: source,
    sourcePage: raw.page,
    rulesLanguage: 'en',
    language: 'en',
    bundled: true,
    reference: (raw.name || target.english) + '|' + source,
  };
  entries.push(row);
}
function recordFailure(kind, target, error) {
  unmatched.push({
    kind,
    id: target.id,
    name: target.english || target.name,
    source: target.sourceKey || target.source,
    reason: String(error.message || error),
  });
}
const run = (kind, targets, fn) => {
  for (const target of targets) {
    if ((target.sourceKey || target.source) === 'TDCSR') continue;
    try {
      fn(target);
    } catch (e) {
      recordFailure(kind, target, e);
    }
  }
};
run('background', g.CampaignData.backgrounds, t => {
  const raw = backgrounds.find(r => r.source === t.source && key(r.name) === key(t.english));
  if (!raw) throw Error('No exact source match');
  const r = copy(raw, backgrounds);
  emit('background', t, r, render.prose(r.entries));
});
run('race', g.CampaignData.races, t => {
  let raw = races.race.find(r => r.source === t.source && key(r.name) === key(t.english)),
    r;
  if (raw) r = copy(raw, races.race);
  else {
    const sub = races.subrace.find(
      s => s.source === t.source && key(s.raceName + (s.name ? ' (' + s.name + ')' : '')) === key(t.english),
    );
    if (!sub) throw Error('No exact race/subrace match');
    const base = races.race.find(r => r.name === sub.raceName && r.source === sub.raceSource);
    if (!base) throw Error('No base race');
    const b = copy(base, races.race),
      s = copy(sub, races.subrace),
      removed = new Set((s.entries || []).map(e => e?.data?.overwrite).filter(Boolean));
    r = {
      ...b,
      ...s,
      name: t.english,
      entries: [...(b.entries || []).filter(e => !removed.has(e?.name)), ...(s.entries || [])],
    };
  }
  emit('race', t, r, render.prose(r.entries));
});
run('feat', g.Catalog.feats, t => {
  const r = feats.find(r => r.source === t.sourceKey && key(r.name) === key(t.english || t.name));
  if (!r) throw Error('No exact source match');
  const text = [abilityText(r.ability), render.prose(r.entries)].filter(Boolean).join('\n\n');
  emit('feat', t, r, text);
  features.push({ ...entries.at(-1), key: 'feat:' + t.id });
});
run('option', g.ClassData.options, t => {
  const r = options.find(r => r.source === t.source && key(r.name) === key(t.english || t.name));
  if (!r) throw Error('No exact source match');
  emit('option', t, r, render.prose(r.entries));
  features.push({ ...entries.at(-1), key: 'opt:' + t.id });
});
function featureRows(kind, t, book) {
  const list = kind === 'class' ? book.classFeature : book.subclassFeature;
  for (const f of t.features) {
    const candidates = list.filter(
      r =>
        key(r.name) === key(f.english || f.name) &&
        r.level === f.level &&
        r.source === f.source &&
        (r.classSource || 'PHB') !== 'XPHB' &&
        (kind === 'class' || r.subclassSource === t.source),
    );
    if (candidates.length === 1) {
      const r = candidates[0],
        text = render.prose(r.entries);
      if (text)
        features.push({
          key: (kind === 'class' ? 'class' : 'sub') + ':' + t.id + ':' + (f.english || f.name),
          name: f.name,
          text,
          book: sourceNames[r.source] || r.source,
          sourceKey: r.source,
          sourcePage: r.page,
          rulesLanguage: 'en',
          language: 'en',
          bundled: true,
          reference: r.name + '|' + r.source,
        });
    }
  }
}
run('class', Object.values(g.ClassData.classes), t => {
  const b = cls[t.id],
    r = b.class.find(r => r.source === t.source);
  if (!r) throw Error('No exact class source');
  const nodes = (r.classFeatures || []).map(v =>
    typeof v === 'string'
      ? { type: 'refClassFeature', classFeature: v }
      : v.classFeature
        ? { type: 'refClassFeature', classFeature: v.classFeature }
        : v,
  );
  emit('class', t, r, [render.prose(r.fluff || []), render.prose(nodes)].filter(Boolean).join('\n\n'));
  featureRows('class', t, b);
});
run('subclass', g.ClassData.subclasses, t => {
  const b = cls[t.classId],
    r = b.subclass.find(
      r => r.source === t.source && key(r.name) === key(t.english) && (r.classSource || 'PHB') !== 'XPHB',
    );
  if (!r) throw Error('No exact subclass source');
  const nodes = (r.subclassFeatures || []).map(v =>
    typeof v === 'string' ? { type: 'refSubclassFeature', subclassFeature: v } : v,
  );
  emit('subclass', t, r, render.prose(nodes));
  featureRows('subclass', t, b);
});
const itemRows = read('items.json').item;
const variantRows = read('magicvariants.json').magicvariant;
const itemKey = s =>
  String(s || '')
    .toLowerCase()
    .replace(/\(luckstone\)/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .sort()
    .join(' ');
run('item', g.MagicItems.ITEMS, t => {
  if (g.OfficialContent.itemTexts.has(t.id)) return;
  const names = [t.english, t.name].filter(Boolean).map(itemKey),
    source = t.sourceKey && !t.sourceKey.startsWith('WOTC-') ? t.sourceKey : null;
  const candidates = [...itemRows, ...variantRows].filter(
    r =>
      names.includes(itemKey(r.name)) &&
      (source ? (r.source || r.inherits?.source) === source : ['DMG', 'TCE'].includes(r.source || r.inherits?.source)),
  );
  if (candidates.length !== 1) throw Error('No unambiguous classic item source match: ' + candidates.length);
  const raw = candidates[0],
    r = raw.inherits ? { ...raw, ...raw.inherits } : copy(raw, itemRows);
  const rules = ((raw.inherits && raw.entries) || r.entries || []).filter(
    e => typeof e !== 'string' || !e.startsWith('{@note Note: According to the SRD'),
  );
  const expanded = JSON.parse(
    JSON.stringify(rules).replace(/\{=([^}]+)\}/g, (_, k) => {
      if (r[k] === undefined) throw Error('Unresolved item value ' + k);
      return r[k];
    }),
  );
  const text = render.prose(expanded);
  emit('item', t, r, text);
});
const aliases = {};
for (const b of g.OfficialContentData.books)
  if (b.referenceSources?.length === 1 && b.sourceKey !== b.referenceSources[0])
    aliases[b.sourceKey] = b.referenceSources[0];
const itemIds = [],
  owners = new Map();
for (const row of g.OfficialContentData.items) {
  if (!row.catalogId) continue;
  const owner = owners.get(row.catalogId);
  if (!owner) {
    owners.set(row.catalogId, row);
    continue;
  }
  if (key(owner.english || owner.name) === key(row.english || row.name)) continue;
  const id =
    (
      'official-' +
      row.bookId +
      '-' +
      (row.english || row.name)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
    ).slice(0, 88) +
    '-' +
    hash(row.reference || row.name).slice(0, 8);
  itemIds.push({
    oldId: row.catalogId,
    id,
    bookId: row.bookId,
    name: row.name,
    english: row.english || '',
    reference: row.reference,
  });
}
const duplicateGroups = [];
const official = g.BookContentData.monsters;
const stats = m => JSON.stringify([m.ac, m.hp, String(m.hd || '').replace(/\s/g, ''), m.ab, m.cr, m.type, m.size]);
const monsterGroups = new Map();
for (const m of official) {
  const identity = m.reference + '|' + stats(m) + '|' + (m.variantNote || '') + '|' + Boolean(m.referenceOnlyActions);
  if (!monsterGroups.has(identity)) monsterGroups.set(identity, []);
  monsterGroups.get(identity).push(m);
}
const vm = require('node:vm');
vm.runInContext(fs.readFileSync(path.join(root, 'monsters-data.js'), 'utf8'), g);
for (const m of g.MonsterData) {
  const candidates = official.filter(
    o =>
      o.reference?.startsWith('MM:') &&
      !o.referenceOnlyActions &&
      stats(o) === stats(m) &&
      [o.name, o.english, ...(o.searchNames || [])]
        .filter(Boolean)
        .some(n => key(n) === key(m.name) || key(n) === key(m.english)),
  );
  if (candidates.length) {
    const o = candidates[0],
      identity = o.reference + '|' + stats(o) + '|' + (o.variantNote || '') + '|' + Boolean(o.referenceOnlyActions);
    monsterGroups.get(identity).push(m);
  }
}
const quality = m =>
  (m.traits || []).reduce((s, t) => s + t[1].length, 0) + (m.actions || []).reduce((s, a) => s + a.d.length, 0);
for (const rows of monsterGroups.values())
  if (rows.length > 1) {
    rows.sort((a, b) => quality(b) - quality(a));
    duplicateGroups.push({ kind: 'creature', ids: rows.map(m => m.id), preferred: rows[0].id });
  }
const raceGroups = new Map(),
  refs = new Map(entries.map(r => [r.key, r]));
for (const r of g.CampaignData.races) {
  const { id, name, english, source, sources, page, ...mechanics } = r;
  const identity = key(english) + '|' + JSON.stringify(mechanics) + '|' + (refs.get('race:' + id)?.text || '');
  if (!raceGroups.has(identity)) raceGroups.set(identity, []);
  raceGroups.get(identity).push(r);
}
for (const rows of raceGroups.values())
  if (rows.length > 1) duplicateGroups.push({ kind: 'race', ids: rows.map(r => r.id), preferred: rows[0].id });
const output = { entries, features, sourceAliases: aliases, itemIds, duplicateGroups };
if (unmatched.length) throw Error('Unmatched official references: ' + JSON.stringify(unmatched));
const review = {
  snapshot: '3a16c3ae035b286e693c19e2dd98e5264289c9cc',
  source: 'https://5e.tools/',
  entries: entries.map(e => ({ key: e.key, reference: e.reference, sha256: hash(e.text) })),
  features: features.map(e => ({ key: e.key, reference: e.reference, sha256: hash(e.text) })),
  itemIds,
  duplicateGroups,
  sourceAliases: aliases,
  unmatched,
};
// Los textos largos van aparte (shared-reference-text.js): la ficha se abre sin ellos y los pide después.
{
  const { entries: textEntries, features: textFeatures, ...small } = output;
  const FOOT = ';})(typeof window!=="undefined"?window:globalThis);\n';
  fs.writeFileSync(
    path.join(root, 'shared-reference-data.js'),
    '/* Full references for existing official 2014 options, matched by source. Long texts live in shared-reference-text.js. */\n(function(r){r.SharedReferenceData=' +
      JSON.stringify(small) +
      FOOT,
  );
  fs.writeFileSync(
    path.join(root, 'shared-reference-text.js'),
    '/* Long reference texts (entries and features), split from shared-reference-data.js so sheets open without them. */\n(function(r){var t=' +
      JSON.stringify({ entries: textEntries, features: textFeatures }) +
      ';var d=r.SharedReferenceData||(r.SharedReferenceData={});d.entries=t.entries;d.features=t.features;if(r.OfficialContent&&r.OfficialContent.applyTexts)r.OfficialContent.applyTexts()' +
      FOOT,
  );
}
fs.writeFileSync(path.join(root, 'tools/shared-reference-review.json'), JSON.stringify(review, null, 2) + '\n');
console.log(
  'References',
  entries.reduce((a, r) => ((a[r.key.split(':')[0]] = (a[r.key.split(':')[0]] || 0) + 1), a), {}),
  'features',
  features.length,
);
console.log(JSON.stringify(unmatched, null, 2));
console.log(
  'Duplicate groups',
  duplicateGroups.reduce((a, r) => ((a[r.kind] = (a[r.kind] || 0) + r.ids.length - 1), a), {}),
  'item ID fixes',
  itemIds.length,
);
