/* Biblioteca personal. El contenido importado vive en IndexedDB, separado de las fichas y la nube. */
(function (root) {
  'use strict';
  const DB = 'dnd-personal-library';
  const normalize = value =>
    String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  const EDITIONS = ['2014', '2024', '3.5', '4e', 'other'];
  const ORIGINS = ['official', 'third-party', 'playtest', 'unverified'];
  const CATEGORIES = ['creatures', 'classes', 'spells', 'items', 'adventures', 'reference'];
  let opening;
  function open() {
    if (!root.indexedDB) return Promise.reject(Error('Este navegador no permite guardar la biblioteca.'));
    return (opening ||= new Promise((resolve, reject) => {
      const request = root.indexedDB.open(DB, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore('books', { keyPath: 'id' });
        request.result.createObjectStore('index', { keyPath: 'id' });
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          opening = null;
        };
        resolve(db);
      };
      request.onerror = () => {
        opening = null;
        reject(Error('No se pudo abrir tu biblioteca.'));
      };
      request.onblocked = () => reject(Error('Cerrá las otras pestañas de la biblioteca y volvé a intentar.'));
    }));
  }
  function string(value, max, label, empty = false) {
    if (typeof value !== 'string' || value.length > max || (!empty && !value.trim()))
      throw Error('Revisá ' + label + ' en el archivo de biblioteca.');
    return value;
  }
  const integer = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;
  function monster(value, book, pages) {
    const hd = /^(\d{1,3})d(4|6|8|10|12|20)([+-]\d{1,4})?$/.exec(value?.hd || '');
    if (
      !value ||
      book.edition !== '2014' ||
      book.origin !== 'official' ||
      value.edition !== '2014' ||
      value.bookId !== book.id ||
      !pages.has(value.page) ||
      !integer(value.ac, 1, 30) ||
      !integer(value.hp, 1, 2000) ||
      !Array.isArray(value.ab) ||
      value.ab.length !== 6 ||
      !value.ab.every(n => integer(n, 1, 30)) ||
      ![0, 0.125, 0.25, 0.5, ...Array.from({ length: 30 }, (_, i) => i + 1)].includes(value.cr) ||
      !integer(value.xp, 0, 200000) ||
      !hd ||
      Number(hd[1]) < 1 ||
      Math.floor((Number(hd[1]) * (Number(hd[2]) + 1)) / 2) + Number(hd[3] || 0) !== value.hp
    )
      throw Error('Una criatura no tiene estadísticas completas de 2014 o una página de referencia válida.');
    const id = string(value.id, 180, 'el identificador de criatura');
    if (!id.startsWith('book-' + book.id + '-') || !/^[a-z0-9-]+$/.test(id))
      throw Error('Identificador de criatura inválido.');
    const fields = Object.fromEntries(
      ['name', 'size', 'type', 'align', 'speed', 'saves', 'skills', 'vuln', 'res', 'imm', 'cimm', 'senses', 'lang'].map(
        k => [k, string(value[k] ?? '', 2000, k, !['name', 'size', 'type'].includes(k))],
      ),
    );
    return {
      ...fields,
      id,
      ac: value.ac,
      hp: value.hp,
      ab: value.ab.slice(),
      hd: value.hd,
      cr: value.cr,
      xp: value.xp,
      bookId: book.id,
      page: value.page,
      source: book.title,
      edition: '2014',
      referenceOnlyActions: true,
      traits: [],
      actions: [],
      reactions: [],
      legendary: [],
    };
  }
  function validate(pack) {
    if (pack?.format !== 'dnd-personal-library' || pack.version !== 1 || !Array.isArray(pack.books))
      throw Error('Elegí un paquete de biblioteca compatible (.json).');
    if (!pack.books.length || pack.books.length > 2000) throw Error('El paquete debe contener entre 1 y 2000 libros.');
    const ids = new Set();
    let totalPages = 0;
    return pack.books.map(value => {
      if (!value || typeof value.id !== 'string' || !/^[a-z0-9-]{1,80}$/.test(value.id) || ids.has(value.id))
        throw Error('Hay libros repetidos o con un identificador inválido.');
      ids.add(value.id);
      if (
        !EDITIONS.includes(value.edition) ||
        !ORIGINS.includes(value.origin) ||
        !CATEGORIES.includes(value.category) ||
        !integer(value.pageCount, 0, 10000) ||
        !Array.isArray(value.pages) ||
        value.pages.length > value.pageCount ||
        !Array.isArray(value.monsters) ||
        value.monsters.length > 3000 ||
        !['ready', 'partial', 'needs-ocr', 'locked', 'error'].includes(value.status)
      )
        throw Error('El formato de un libro está incompleto.');
      totalPages += value.pages.length;
      if (totalPages > 200000) throw Error('El paquete supera las 200.000 páginas.');
      const pageNumbers = new Set();
      const pages = value.pages.map(p => {
        if (!p || !integer(p.number, 1, value.pageCount) || pageNumbers.has(p.number))
          throw Error('Hay páginas duplicadas o fuera del libro.');
        pageNumbers.add(p.number);
        return {
          number: p.number,
          title: string(p.title, 500, 'el título de página', true),
          text: string(p.text, 200000, 'el texto de página'),
        };
      });
      pages.sort((a, b) => a.number - b.number);
      const book = {
        id: value.id,
        title: string(value.title, 300, 'el título del libro'),
        edition: value.edition,
        origin: value.origin,
        category: value.category,
        status: value.status,
        pageCount: value.pageCount,
        pages,
      };
      const monsters = value.monsters.map(m => monster(m, book, pageNumbers));
      if (new Set(monsters.map(m => m.id)).size !== monsters.length)
        throw Error('Hay criaturas duplicadas en un libro.');
      return { ...book, monsters };
    });
  }
  async function importPack(pack) {
    // Validate the ENTIRE pack before opening a write transaction. Failure preserves the old library.
    const books = validate(pack);
    const db = await open();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(['books', 'index'], 'readwrite');
      tx.oncomplete = resolve;
      tx.onabort = () =>
        reject(
          Error('No se pudo guardar la biblioteca. Revisá el espacio disponible; la versión anterior se conserva.'),
        );
      tx.onerror = () => {};
      for (const book of books) {
        tx.objectStore('books').put(book);
        const { pages, ...metadata } = book;
        tx.objectStore('index').put({ ...metadata, searchablePages: pages.length });
      }
    });
    return books.length;
  }
  async function list() {
    const db = await open();
    return new Promise((resolve, reject) => {
      const request = db.transaction('index').objectStore('index').getAll();
      request.onsuccess = () => resolve(request.result.sort((a, b) => a.title.localeCompare(b.title, 'es')));
      request.onerror = () => reject(Error('No se pudo leer la biblioteca.'));
    });
  }
  async function get(id) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const request = db.transaction('books').objectStore('books').get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(Error('No se pudo abrir el libro.'));
    });
  }
  async function remove(id) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['books', 'index'], 'readwrite');
      tx.objectStore('books').delete(id);
      tx.objectStore('index').delete(id);
      tx.oncomplete = resolve;
      tx.onabort = () => reject(Error('No se pudo quitar el libro.'));
    });
  }
  function matches(book, filters) {
    return (
      ['edition', 'origin', 'category'].every(k => !filters[k] || book[k] === filters[k]) &&
      (!filters.bookId || book.id === filters.bookId)
    );
  }
  function findInBook(book, query, limit = 80) {
    const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
    if (!terms.length) return [];
    const results = [];
    for (const p of book.pages) {
      const heading = normalize(p.title);
      const body = normalize(p.text);
      if (!terms.every(term => (heading + ' ' + body).includes(term))) continue;
      const position = Math.max(0, body.indexOf(terms[0]));
      results.push({
        bookId: book.id,
        bookTitle: book.title,
        edition: book.edition,
        origin: book.origin,
        page: p.number,
        title: p.title,
        excerpt: p.text.slice(Math.max(0, position - 80), position + 230).replace(/\n/g, ' '),
        score: terms.every(term => heading.includes(term)) ? 2 : body.includes(terms.join(' ')) ? 1 : 0,
      });
    }
    return results.sort((a, b) => b.score - a.score || a.page - b.page).slice(0, limit);
  }
  async function search(query, filters = {}, limit = 80) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const results = [];
      const tx = db.transaction('books');
      const request = tx.objectStore('books').openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        if (matches(cursor.value, filters)) results.push(...findInBook(cursor.value, query, limit));
        // Bound retained memory; each book is released after this cursor step.
        results.sort((a, b) => b.score - a.score || a.bookTitle.localeCompare(b.bookTitle, 'es') || a.page - b.page);
        results.length = Math.min(results.length, limit);
        cursor.continue();
      };
      tx.oncomplete = () => resolve(results);
      tx.onabort = () => reject(Error('No se pudo buscar en los libros.'));
    });
  }
  async function monsters() {
    return (await list()).filter(b => b.edition === '2014' && b.origin === 'official').flatMap(b => b.monsters);
  }
  function mergeMonsters(base, imported) {
    const originals = base.filter(m => !m.bookId || m.bundled);
    const ids = new Set(originals.map(m => m.id));
    return [...originals, ...imported.filter(m => !ids.has(m.id) && ids.add(m.id))];
  }
  root.LibraryStore = {
    normalize,
    validate,
    importPack,
    list,
    get,
    remove,
    search,
    findInBook,
    matches,
    monsters,
    mergeMonsters,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.LibraryStore;
})(typeof window !== 'undefined' ? window : globalThis);
