/* Parse the reviewed official PDFs with the same positioned-text parser as the app.
   node --max-old-space-size=4096 tools/build-official-content.js <geometry-dir> [--watch]
   Intermediate extraction caches remain outside the published application. */
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const vm = require('node:vm');
const crypto = require('node:crypto');
const LC = require('../library-core.js');
const root = path.join(__dirname, '..');
const manifest = require('./official-books.json');
const corrections = require('./official-entry-corrections.json');
const ctx = { structuredClone };
ctx.window = ctx;
vm.createContext(ctx);
for (const file of [
  'catalog.js',
  'class-data.js',
  'names-es.js',
  'campaign-data.js',
  'magic-items.js',
  'monsters-data.js',
  'book-content-data.js',
])
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), ctx);
const canonical = value => LC.key(value);
const spellByName = new Map(
  ctx.Catalog.spells.flatMap(s => [s.name, s.english].filter(Boolean).map(name => [canonical(name), s])),
);
for (const [name, id] of Object.entries(require('./official-spell-aliases.json'))) {
  const spell = ctx.Catalog.spells.find(s => s.id === id);
  if (!spell) throw Error('Unknown spell alias: ' + name + ' -> ' + id);
  spellByName.set(canonical(name), spell);
}
const itemByName = new Map(
  ctx.MagicItems.ITEMS.flatMap(s => [s.name, s.english].filter(Boolean).map(name => [canonical(name), s])),
);
const targets = LC.ruleTargets(ctx.ClassData, ctx.Catalog);
const vocab = LC.vocabulary(
  [
    ...ctx.Catalog.spells.flatMap(s => [s.text, s.brief, s.time, s.range, s.duration, s.components]),
    ...ctx.MonsterData.flatMap(m => [
      m.name,
      m.speed,
      m.senses,
      m.lang,
      ...m.traits.map(x => x[1]),
      ...m.actions.map(a => a.d),
    ]),
  ],
  [...spellByName.values()]
    .flatMap(s => [s.name, s.english])
    .filter(Boolean)
    .concat(ctx.MagicItems.ITEMS.flatMap(s => [s.name, s.english]).filter(Boolean)),
);
const parserVersion = crypto
  .createHash('sha256')
  .update(fs.readFileSync(path.join(root, 'library-core.js')))
  .update(fs.readFileSync(__filename))
  .update(fs.readFileSync(path.join(__dirname, 'official-spell-aliases.json')))
  .update(fs.readFileSync(path.join(__dirname, 'official-entry-corrections.json')))
  .digest('hex');

function parse(book, input) {
  const lines = LC.readLines(input.pages);
  const language = LC.detectLang(lines);
  const sourceKey =
    (book.id === '5c72ae78a4070b66' ? 'DMG' : ctx.BookContentData.books.find(b => b.id === book.id)?.sourceKey) ||
    'WOTC-' + book.id;
  const opts = { prefix: 'official-' + book.id, vocab: language === 'es' ? vocab : null };
  const rawMonsters = LC.monsters(lines, opts);
  const fallback = input.originalPages ? LC.monsters(LC.readLines(input.originalPages), opts) : [];
  const monsters = [],
    rejected = [];
  for (const m of [...rawMonsters, ...fallback.map(m => ({ ...m, originalOCR: true }))]) {
    if (m.originalOCR && monsters.some(x => x.page === m.page)) continue;
    m.name = m.name.replace(/^[|_~\s-]+/, '');
    const correction = corrections.find(
      c =>
        c.bookId === book.id &&
        c.page === m.page &&
        (c.matchName ? canonical(c.matchName) === canonical(m.name) : c.matchHP === m.hp),
    );
    if (correction) {
      for (const field of ['name', 'hp', 'hd']) if (correction[field] !== undefined) m[field] = correction[field];
      if (correction.name) m.issues = m.issues?.filter(issue => issue !== 'Sin nombre');
    }
    const fatal = (m.issues || []).filter(issue =>
      /Sin (?:CA|PG|desafío|puntuaciones de característica|línea de tamaño y tipo|nombre)|Características (aproximadas|incompletas)/i.test(
        issue,
      ),
    );
    if (!Number.isFinite(m.cr) && !m.summon) fatal.push('Sin desafío');
    if (!m.ab || m.ab.length !== 6 || m.ab.some(n => !Number.isInteger(n) || n < 1 || n > 30))
      fatal.push('Características inválidas');
    if (!Number.isInteger(m.ac) || m.ac < 1 || m.ac > 30 || !Number.isInteger(m.hp) || m.hp < 1 || m.hp > 3000)
      fatal.push('CA/PG fuera de rango');
    if (fatal.length) {
      if (!m.originalOCR) rejected.push({ name: m.name, page: m.page, issues: fatal });
      continue;
    }
    const old = ctx.BookContentData.monsters.find(x => x.bookId === book.id && canonical(x.name) === canonical(m.name));
    monsters.push({
      ...m,
      id: old?.id || 'book-' + book.id + '-' + LC.slug(m.name),
      bookId: book.id,
      source: book.title,
      sourceKey,
      book: book.title,
      bundled: true,
      edition: '2014',
      referenceOnlyActions: false,
      language,
    });
  }
  const spells = LC.spells(lines, opts)
    .filter(s => !s.issues?.length && s.text.length >= 40)
    .map(s => ({
      ...s,
      canonicalId: spellByName.get(canonical(s.name))?.id || null,
      bookId: book.id,
      book: book.title,
      sourceKey,
      language,
    }));
  const items = LC.items(lines, opts)
    .filter(s => !s.issues?.length && s.text.length >= 20)
    .map(s => ({
      ...s,
      canonicalId: itemByName.get(canonical(s.name))?.id || null,
      bookId: book.id,
      book: book.title,
      sourceKey,
      language,
    }));
  // Class chapter headings locate subclasses even when the class itself comes from PHB.
  const relevantTargets = targets.filter(
    t => t.kind === 'class' || t.source === sourceKey || t.features?.some(f => f.source === sourceKey),
  );
  const rules = (relevantTargets.length ? LC.rules(lines, relevantTargets, opts) : [])
    .filter(r => r.source === sourceKey)
    .map(r => ({
      ...r,
      data: { ...r.data, book: book.title, bookId: book.id, source: r.source, language, bundled: true },
    }));
  const unique = list => [...new Map(list.map(x => [x.id, x])).values()];
  const result = {
    book: { ...book, sourceKey, language, ocrPages: input.summary.ocrPages, textPages: input.summary.textPages },
    monsters: unique(monsters),
    spells,
    items,
    rules,
    rejected,
  };
  result.summary = {
    book: book.title,
    monsters: result.monsters.length,
    spells: spells.length,
    items: items.length,
    rules: rules.length,
    rejected: rejected.length,
  };
  return result;
}

function aggregate(results) {
  const data = {
    version: 1,
    edition: '2014',
    books: results.map(r => ({ ...r.book, relativePath: undefined, counts: r.summary })),
    monsters: results.flatMap(r => r.monsters),
    spells: results.flatMap(r => r.spells),
    items: results.flatMap(r => r.items),
    rules: results.flatMap(r => r.rules),
    audit: {
      expectedBooks: manifest.length,
      processedBooks: results.length,
      excludedHomebrew: true,
      rejectedBlocks: results.flatMap(r => r.rejected.map(x => ({ bookId: r.book.id, ...x }))),
    },
  };
  const output =
    '/* Official 2014 game entries extracted from the user-provided PDFs. No narrative chapters or PDF pages. */\n' +
    '(function(r){r.OfficialContentData=' +
    JSON.stringify(data) +
    ';})(typeof window!=="undefined"?window:globalThis);\n';
  // Extraction is a review input. It must never replace the audited live catalogue.
  const staging = path.join(root, '.tmp-test', 'unreviewed-official-content-data.js');
  fs.mkdirSync(path.dirname(staging), { recursive: true });
  fs.writeFileSync(staging, output);
  return {
    books: data.books.length,
    monsters: data.monsters.length,
    spells: data.spells.length,
    items: data.items.length,
    rules: data.rules.length,
    rejected: data.audit.rejectedBlocks.length,
  };
}

async function main() {
  const directory = process.argv[2];
  if (!directory) throw Error('Specify the local geometry cache directory.');
  const parsed = path.join(directory, 'parsed');
  fs.mkdirSync(parsed, { recursive: true });
  const results = new Map();
  do {
    for (const book of manifest) {
      if (results.has(book.id)) continue;
      const file = path.join(directory, book.id + '.json.gz');
      if (!fs.existsSync(file)) continue;
      const stat = fs.statSync(file);
      const repairDir = path.join(directory, book.id + '-abilities-v4');
      const repairs = new Map(
        fs.existsSync(repairDir)
          ? fs
              .readdirSync(repairDir)
              .filter(f => f.endsWith('.json'))
              .map(f => [Number(f.replace('.json', '')) - 1, fs.readFileSync(path.join(repairDir, f), 'utf8')])
          : [],
      );
      const repairSignature = crypto
        .createHash('sha256')
        .update(JSON.stringify([...repairs]))
        .digest('hex');
      const cache = path.join(parsed, book.id + '.json');
      let result;
      if (fs.existsSync(cache)) {
        const previous = JSON.parse(fs.readFileSync(cache, 'utf8'));
        if (
          previous.parserVersion === parserVersion &&
          previous.inputSize === stat.size &&
          previous.repairSignature === repairSignature
        )
          result = previous.result;
      }
      if (!result) {
        let input;
        try {
          input = JSON.parse(zlib.gunzipSync(fs.readFileSync(file)).toString('utf8'));
        } catch (error) {
          if (process.argv.includes('--watch')) continue;
          throw error;
        }
        input.originalPages = input.pages.some(p => p.ocrLines)
          ? input.pages.map((p, i) => {
              const original = path.join(directory, book.id + '-ocr-v2', String(i + 1) + '.json');
              return p.ocr && fs.existsSync(original)
                ? { ...p, items: JSON.parse(fs.readFileSync(original, 'utf8')) }
                : p;
            })
          : null;
        input.pages = input.pages.map((p, i) => (repairs.has(i) ? { ...p, items: JSON.parse(repairs.get(i)) } : p));
        result = parse(book, input);
        fs.writeFileSync(cache, JSON.stringify({ parserVersion, inputSize: stat.size, repairSignature, result }));
      }
      results.set(book.id, result);
      console.log(JSON.stringify(result.summary));
      const progress = aggregate([...results.values()]);
      fs.writeFileSync(path.join(directory, 'parsed-progress.json'), JSON.stringify(progress));
    }
    if (results.size === manifest.length || !process.argv.includes('--watch')) break;
    await new Promise(resolve => setTimeout(resolve, 2000));
  } while (true);
  console.log(JSON.stringify({ complete: results.size === manifest.length, ...aggregate([...results.values()]) }));
}
if (require.main === module)
  main().catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
module.exports = { parse, aggregate };
