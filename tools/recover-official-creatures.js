/* Recover only the reviewed missing 2014 blocks. No network or private cache is published.
   node tools/recover-official-creatures.js <private-resolved-bestiary.json> */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const A = require('./audit-official-catalogue');
const { converted, prose, plain } = require('./repair-official-catalogue');
const plan = require('./official-creature-recovery.json');
const sources = require('./official-book-sources.json');
const reviews = require('./official-entry-reviews.json');
const ES = require('./monsters-es');
const root = path.join(__dirname, '..');
const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');

function recover(data, input) {
  const rawById = new Map(input.monsters.map(r => [A.id(r), r]));
  const groups = new Map((input.legendaryGroup || []).map(r => [A.id(r), r]));
  const byRef = new Map(data.monsters.map(r => [r.reference, r]));
  const added = [];
  const correctedNames = [...(data.audit.creatureRecovery?.correctedNames || [])];
  for (const m of data.monsters.filter(m => /undefined/.test(m.name))) {
    const name = ES.name(m.english);
    if (!name || /undefined/.test(name)) throw Error('Unresolved creature name: ' + m.reference);
    correctedNames.push({ id: m.id, reference: m.reference, previous: m.name, name });
    m.name = name;
    m.searchNames = [...new Set([...(m.searchNames || []).filter(n => !/undefined/.test(n)), m.english, name])];
  }
  for (const e of plan.entries) {
    const r = A.facts.monsters.find(r => A.id(r) === e.reference);
    const raw = rawById.get(e.reference);
    const book = data.books.find(b => b.id === e.bookId);
    if (!r || !raw || !book || raw._copy || hash(raw) !== e.sourceHash)
      throw Error('Missing or changed reviewed block: ' + e.reference);
    if (!sources[e.bookId]?.includes(r.source) || book.edition !== '2014')
      throw Error('Wrong source or edition: ' + e.reference);
    for (const k of ['str', 'dex', 'con', 'int', 'wis', 'cha', 'hp', 'ac', 'cr', 'speed'])
      if (JSON.stringify(r[k]) !== JSON.stringify(raw[k]))
        throw Error('Unreviewed numerical change: ' + e.reference + ' / ' + k);
    if (byRef.has(e.reference)) continue;
    const slug = A.key(r.name).length
      ? r.name
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
      : '';
    let id = 'book-' + book.id + '-' + slug;
    if (data.monsters.some(m => m.id === id)) id += '-' + A.key(r.source);
    if (data.monsters.some(m => m.id === id)) throw Error('Creature ID collision: ' + e.reference);
    const review = reviews.monsters[id] || {};
    const template = {
      id,
      name: r.name,
      bookId: book.id,
      book: book.title,
      source: book.title,
      sourceKey: book.sourceKey,
      page: e.page,
      language: book.language,
      edition: '2014',
      bundled: true,
      hp: 1,
      ac: 10,
      hd: '',
      type: 'criatura',
      size: 'Mediano',
      traits: [],
      actions: [],
      reactions: [],
      legendary: [],
    };
    const out = converted(template, r, review, raw);
    out.referenceOrigin = plan.referenceUrl;
    out.recovered = true;
    if (raw.speed?.canHover && !/flotar|hover/i.test(out.speed)) out.speed += ' (puede flotar durante el vuelo)';
    if (r.cr && typeof r.cr === 'object' && r.cr.lair)
      out.traits.push(['Desafío en su guarida', 'VD ' + r.cr.lair + '.']);
    if (raw.level) out.traits.push(['Nivel del compañero', String(raw.level)]);
    if (raw.pbNote) out.traits.push(['Bonificador por competencia', plain(raw.pbNote)]);
    if (raw.reactionHeader) out.traits.push(['Reglas de reacción', prose(raw.reactionHeader)]);
    if (raw.actionHeader) out.traits.push(['Reglas de acciones', prose(raw.actionHeader)]);
    if (raw.bonusHeader) out.traits.push(['Reglas de acciones adicionales', prose(raw.bonusHeader)]);
    if (raw.variant?.length) out.traits.push(['Variantes y progresión', prose(raw.variant)]);
    if (raw.footer?.length) out.traits.push(['Reglas adicionales', prose(raw.footer)]);
    if (raw.legendary?.length && !out.legendaryNote)
      out.legendaryNote = 'Dispone de 3 acciones legendarias por ronda y las recupera al comienzo de su turno.';
    if (raw.legendaryGroup) {
      const group = groups.get(A.id(raw.legendaryGroup));
      if (!group) throw Error('Missing lair/regional rules: ' + e.reference);
      if (group.lairActions) out.traits.push(['Acciones de guarida', prose(group.lairActions)]);
      if (group.regionalEffects) out.traits.push(['Efectos regionales', prose(group.regionalEffects)]);
    }
    const invalid = /\{@|\[object Object\]|undefined/.exec(JSON.stringify(out));
    if (invalid)
      throw Error(
        'Unrendered text: ' +
          e.reference +
          ' ' +
          JSON.stringify(out).slice(Math.max(0, invalid.index - 90), invalid.index + 110),
      );
    if (!out.ab.every(n => Number.isInteger(n) && n >= 1 && n <= 30) || !(out.hp > 0 && out.ac > 0))
      throw Error('Invalid core statistics: ' + e.reference);
    data.monsters.push(out);
    byRef.set(e.reference, out);
    added.push({ id: out.id, reference: out.reference, bookId: out.bookId, page: out.page, sourceHash: e.sourceHash });
  }
  const archive = data.audit.originalRejectedBlocks || data.audit.rejectedBlocks;
  data.audit.originalRejectedBlocks = archive;
  const reviewedPages = new Set(plan.reviewedPages.map(r => r.bookId + ':' + r.page));
  const excluded = new Set(plan.excludedBooks.map(r => r.bookId));
  const unsupported = new Set(plan.unsupportedPages.map(r => r.bookId + ':' + r.page));
  const resolved = archive.filter(
    r =>
      !excluded.has(r.bookId) &&
      reviewedPages.has(r.bookId + ':' + r.page) &&
      !unsupported.has(r.bookId + ':' + r.page),
  );
  data.audit.rejectedBlocks = archive.filter(
    r =>
      !excluded.has(r.bookId) &&
      (!reviewedPages.has(r.bookId + ':' + r.page) || unsupported.has(r.bookId + ':' + r.page)),
  );
  const report = {
    referenceUrl: plan.referenceUrl,
    snapshot: plan.snapshot.commit,
    correctedNames,
    entries: plan.entries.map(e => ({
      reference: e.reference,
      id: byRef.get(e.reference).id,
      bookId: e.bookId,
      page: e.page,
      sourceHash: e.sourceHash,
    })),
    resolvedRejectedRows: resolved.length,
    excludedPlaytestRows: archive.filter(r => excluded.has(r.bookId)).length,
    remainingRejectedRows: data.audit.rejectedBlocks.length,
  };
  data.audit.creatureRecovery = {
    correctedNames,
    entries: report.entries.length,
    resolvedRejectedRows: report.resolvedRejectedRows,
    excludedPlaytestRows: report.excludedPlaytestRows,
    remainingRejectedRows: report.remainingRejectedRows,
  };
  data.audit.catalogueReview.creatures = data.monsters.length;
  for (const book of data.books) {
    book.counts.monsters = data.monsters.filter(r => r.bookId === book.id).length;
    book.counts.rejected = data.audit.rejectedBlocks.filter(r => r.bookId === book.id).length;
    if (excluded.has(book.id))
      book.coverageNote = 'Este PDF utiliza D&D Next: se excluyen sus 106 bloques de criaturas de prueba.';
    if (plan.unsupportedPages.some(r => r.bookId === book.id))
      book.coverageNote = 'Los bloques pendientes son vehículos, separados del bestiario de criaturas.';
  }
  return { added, report };
}
if (require.main === module) {
  if (!process.argv[2]) throw Error('A private resolved bestiary file is required.');
  const input = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const data = A.ctx.OfficialContentData;
  const { added, report } = recover(data, input);
  require('./official-data-io.js').write(
    root,
    data,
    'Reviewed official 2014 game blocks from the supplied books and source-matched bestiary references.',
  );
  fs.writeFileSync(
    path.join(root, 'tools/official-creature-recovery-review.json'),
    JSON.stringify(report, null, 2) + '\n',
  );
  console.log(
    JSON.stringify({ added: added.length, totalCreatures: data.monsters.length, ...data.audit.creatureRecovery }),
  );
}
module.exports = { recover };
