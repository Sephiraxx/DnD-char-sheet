/* Convierte un paquete personal validado en hechos de juego compartidos por GitHub Pages.
   Nunca copia páginas, prosa ni PDFs al resultado público.
   node tools/build-shared-content.js ruta/al/paquete.json [--check] */
const fs = require('node:fs');
const path = require('node:path');
const L = require('../library-store.js');

const SOURCE_NAMES = [
  [/^Manual del Jugador$/, 'PHB'],
  [/^Manual de Monstruos$/, 'MM'],
  [/Xanathar.*[Pp]ara [Tt]odo/, 'XGE'],
  [/Caldero de Tasha/, 'TCE'],
  [/Costa de la Espada$/, 'SCAG'],
  [/^Strixhaven/, 'SCC'],
  [/^Maestros del Gremio/, 'GGR'],
  [/^Eberron - Surgiendo/, 'ERLW'],
  [/^Tomo de Enemigos de Mordenkainen/, 'MTF'],
  [/^Gu[ií]a de Volo de los Monstruos$/i, 'VGM'],
  [/^Mordenkainen presenta - Monstruos del Multiverso$/, 'MPMM'],
  [/Explorador de Wildemount/, 'EGW'],
  [/^Gu[ií]a de Van Richten/, 'VRGR'],
  [/^El Tesoro de los Dragones de Fizban/, 'FTD'],
  [/^Las Tierras M[aá]s All[aá] de Brujaluz/, 'WBtW'],
  [/^Guia del Aventurero Astral/, 'AAG'],
  [/^Dragonlance - /, 'DSotDQ'],
  [/^Bigby Presenta/, 'BGG'],
  [/^(?:Planescape - Sigil|Sigil y las Tierras)/, 'SatO'],
  [/^Fantasmas de Saltmarsh/, 'GoS'],
  [/^La Tumba de la Aniquilaci[oó]n$/, 'ToA'],
  [/^Puerta de Baldur - Descenso/, 'BGDIA'],
  [/^El Paquete Tortuga/, 'TTP'],
  [/^Valle del Viento Helado/, 'IDRotF'],
  [/^El Laboratorio Perdido de Kwalish/, 'LLK'],
  [/^Tal'Dorei Renacido$/, 'TDCSR'],
];
const normalize = s => L.normalize(s).replace(/\s+/g, ' ').trim();
const diceAverage = formula => {
  const m = /^(\d{1,3})d(4|6|8|10|12|20)([+-]\d{1,4})?$/.exec(formula);
  return m ? Math.floor((Number(m[1]) * (Number(m[2]) + 1)) / 2) + Number(m[3] || 0) : null;
};
function attacks(monster, pageText) {
  const lines = pageText.split('\n');
  const nameIndex = lines.findIndex(line => normalize(line) === normalize(monster.name));
  if (nameIndex < 0) return [];
  const nextHeader = lines.findIndex((line, i) => i > nameIndex + 7 && /^Clase de Armadura\s*:?\s*\d/i.test(line));
  const block = lines.slice(nameIndex, nextHeader < 0 ? undefined : nextHeader - 2).join('\n');
  const pattern =
    /^([A-ZÁÉÍÓÚÑ][^\n.]{1,65})\.\s+(Ataque con (?:arma|conjuro)[\s\S]{0,180}?)Impacto:\s*(\d+)\s*\(([^)]+)\)\s*(?:de\s+)?daño\s+(ácido|contundente|frío|fuego|fuerza|relámpago|necrótico|perforante|veneno|psíquico|radiante|cortante|trueno)/gm;
  const out = [];
  for (const match of block.matchAll(pattern)) {
    const toHit = /([+-]\d+)\s+a impactar/.exec(match[2]);
    const dice = match[4].replace(/\s/g, '');
    if (!toHit || Math.abs(Number(toHit[1])) > 30 || diceAverage(dice) !== Number(match[3])) continue;
    out.push({
      n: match[1].trim(),
      atk: Number(toHit[1]),
      dmg: [[dice, match[5]]],
      d: `${/a distancia/.test(match[2]) ? 'Ataque a distancia' : 'Ataque cuerpo a cuerpo'}: ${toHit[1]} al ataque. Daño base: ${dice} de daño ${match[5]}. Revisá alcance, objetivos y efectos adicionales en la fuente.`,
      partial: true,
    });
  }
  return [...new Map(out.map(a => [a.n, a])).values()];
}
function build(pack) {
  const books = L.validate(pack);
  const publicBooks = books.map(book => ({
    id: book.id,
    title: book.title,
    edition: book.edition,
    origin: book.origin,
    category: book.category,
    status: book.status,
    pageCount: book.pageCount,
    sourceKey: book.edition === '2014' ? SOURCE_NAMES.find(([pattern]) => pattern.test(book.title))?.[1] || '' : '',
    creatures: book.monsters.length,
  }));
  const monsters = books.flatMap(book =>
    book.monsters.map(monster => ({
      ...monster,
      book: monster.source,
      bundled: true,
      actions: attacks(monster, book.pages.find(p => p.number === monster.page).text),
    })),
  );
  return {
    version: 1,
    books: publicBooks,
    monsters,
    coverage: {
      scannedBooks: books.length,
      searchablePages: books.reduce((n, b) => n + b.pages.length, 0),
      noTextBooks: books.filter(b => b.status === 'needs-ocr').length,
      coreCreatureEntries: monsters.length,
      creaturesWithAttacks: monsters.filter(m => m.actions.length).length,
      convertedSubclassIds: ['paladin-oath-of-the-open-sea'],
      convertedSpellIds: ['freedom-of-the-waves', 'freedom-of-the-winds'],
    },
  };
}
if (require.main === module) {
  if (!process.argv[2]) throw Error('Indicá el paquete personal de origen.');
  const output = path.join(__dirname, '..', 'book-content-data.js');
  const data = build(JSON.parse(fs.readFileSync(process.argv[2], 'utf8')));
  const text =
    '/* Hechos de juego y metadatos derivados de los PDFs del usuario. Sin páginas ni prosa de los libros. */\n' +
    '(function(r){r.BookContentData=' +
    JSON.stringify(data) +
    ';})(typeof window!=="undefined"?window:globalThis);\n';
  if (process.argv.includes('--check')) {
    if (fs.readFileSync(output, 'utf8').replace(/\r\n/g, '\n') !== text)
      throw Error('El contenido compartido está desactualizado.');
  } else fs.writeFileSync(output, text);
  console.log(JSON.stringify(data.coverage));
}
module.exports = { build, attacks, diceAverage };
