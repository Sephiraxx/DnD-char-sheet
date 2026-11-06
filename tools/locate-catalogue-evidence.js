/* Find the printed headers/stat tables for the catalogue review contact sheets. */
const fs = require('node:fs'),
  z = require('node:zlib'),
  path = require('node:path');
const LC = require('../library-core'),
  A = require('./audit-official-catalogue');
const reviews = require('./official-entry-reviews.json').monsters;
const manifest = require('./official-books.json'),
  report = require(path.resolve(process.argv[3]));
const dir = process.argv[2],
  output = process.argv[4];
const all = A.allMonsters(),
  evidence = { items: [], monsters: [] };
for (const book of manifest) {
  const input = JSON.parse(z.gunzipSync(fs.readFileSync(path.join(dir, book.id + '.json.gz'))));
  input.pages = input.pages.map((p, i) => {
    const file = path.join(dir, book.id + '-abilities-v4', String(i + 1) + '.json');
    return fs.existsSync(file) ? { ...p, items: JSON.parse(fs.readFileSync(file)) } : p;
  });
  const lines = LC.readLines(input.pages),
    opts = { positions: true, prefix: 'official-' + book.id };
  const items = LC.items(lines, opts),
    monsters = LC.monsters(lines, opts);
  for (const original of A.ctx.OfficialContentData.items.filter(m => m.bookId === book.id)) {
    const found = items
      .filter(m => m.page === original.page)
      .sort((a, b) => A.similarity(original.name, b.name) - A.similarity(original.name, a.name))[0];
    if (found)
      evidence.items.push({
        id: original.id,
        bookId: book.id,
        path: book.relativePath,
        page: original.page,
        label: original.name,
        ...found.pdfPosition,
        w: input.pages[original.page - 1].w,
        height: input.pages[original.page - 1].h,
      });
  }
  for (const original of all.filter(m => m.bookId === book.id)) {
    const row = report.rows.find(x => x.id === original.id),
      review = reviews[original.id],
      ref = A.facts.monsters.find(r => A.id(r) === (review?.reference || row?.best));
    const changed =
      ref &&
      (original.hp !== ref.hp?.average ||
        original.ac !== A.ac(ref.ac?.[0]) ||
        original.cr !== A.cr(ref.cr) ||
        original.ab.some((n, i) => n !== [ref.str, ref.dex, ref.con, ref.int, ref.wis, ref.cha][i]));
    if (!changed && !review?.needsPDF) continue;
    const candidates = monsters.filter(m => m.page === original.page),
      found = candidates.sort((a, b) => A.similarity(original.name, b.name) - A.similarity(original.name, a.name))[0];
    if (!found?.pdfPosition) continue;
    const pos = found.pdfPosition;
    evidence.monsters.push({
      id: original.id,
      bookId: book.id,
      path: book.relativePath,
      page: original.page,
      label: original.name,
      target: ref
        ? ref.name +
          ' | AC ' +
          A.ac(ref.ac?.[0]) +
          ' HP ' +
          (ref.hp?.average ?? ref.hp?.special) +
          ' CR ' +
          (ref.cr?.cr ?? ref.cr) +
          ' | ' +
          [ref.str, ref.dex, ref.con, ref.int, ref.wis, ref.cha].join(',')
        : 'PDF check',
      x: pos.x,
      y: pos.y - pos.h * 4,
      h: pos.h,
      bottom: pos.y + pos.h * 23,
      w: input.pages[original.page - 1].w,
      height: input.pages[original.page - 1].h,
    });
  }
}
fs.writeFileSync(output, JSON.stringify(evidence));
console.log(JSON.stringify({ items: evidence.items.length, monsters: evidence.monsters.length }));
