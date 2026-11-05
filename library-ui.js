/* Biblioteca del DM: importar los PDF de los libros propios (se leen en este dispositivo) y guardar lo
   encontrado —criaturas, conjuros y objetos mágicos— en la cuenta, para usarlo desde cualquier lado.
   Los PDF no se suben: solo los datos extraídos, en un lugar privado de la cuenta (migración 011).
   Usa las utilidades de dm.js (modal, button, field, toast, esc, current, party, draw). */
const LibraryUI = (() => {
  'use strict';
  const LC = LibraryCore;
  const PDFJS = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/';
  const KINDS = [
    ['monster', 'criaturas'],
    ['spell', 'conjuros'],
    ['item', 'objetos'],
    ['feature', 'rasgos y opciones de clase'],
    ['feat', 'dotes'],
  ];
  let books = null, // libros de la cuenta (y los compartidos con sus mesas)
    loadError = '',
    myId = null,
    attached = null, // promesa: criaturas importadas ya sumadas al bestiario
    pending = []; // libros leídos que todavía no se guardaron

  // ---------- Libros guardados ----------
  async function loadBooks() {
    try {
      myId = (await Cloud.user()).id;
      books = await Cloud.libraryBooks();
      loadError = '';
    } catch (e) {
      books = [];
      loadError = e.message;
    }
    return books;
  }
  const countText = c =>
    KINDS.map(([k, label]) => (c?.[k] ? c[k] + ' ' + label : ''))
      .filter(Boolean)
      .join(' · ') || 'vacío';
  function card() {
    if (books === null && !loadError) loadBooks().then(() => typeof draw === 'function' && draw());
    const mine = (books || []).filter(b => !isShared(b));
    const shared = (books || []).filter(isShared);
    return `<section class="card library-card"><div class="card-header"><h2>Biblioteca</h2>${button('Importar PDF', 'lib-import')}</div><p class="small muted">Tus libros en PDF: las criaturas aparecen en «Monstruo del SRD» y en el tablero; los rasgos de clase, opciones y dotes, en las fichas (compartí el libro con una mesa para que los vean sus jugadores). Los PDF no se suben; solo lo que se encuentra en ellos, en tu cuenta${current ? '' : ': podés importarlos antes de tener una mesa'}.</p>${
      loadError ? `<p class="small">${esc(loadError)}</p>` : ''
    }${
      books === null
        ? '<p class="muted small">Cargando…</p>'
        : mine.length
          ? `<div class="library-books">${mine
              .map(
                b =>
                  `<div class="library-book"><div><b>${esc(b.title)}</b><p class="small muted">${b.lang === 'en' ? 'Inglés · ' : ''}${esc(countText(b.counts))}${b.shared_with && b.shared_with === current ? ' · compartido con esta mesa' : b.shared_with ? ' · compartido con una mesa' : ''}</p></div><div class="actions">${button('Ver', 'lib-browse', 'text-btn', `data-id="${b.id}"`)}${current ? button(b.shared_with === current ? 'Dejar de compartir' : 'Compartir con la mesa', 'lib-share', 'text-btn', `data-id="${b.id}" title="Los jugadores de esta mesa ven sus conjuros, objetos, rasgos de clase y dotes (nunca las criaturas)"`) : ''}${button('Eliminar', 'lib-delete', 'text-btn danger-text', `data-id="${b.id}"`)}</div></div>`,
              )
              .join('')}</div>`
          : loadError
            ? ''
            : '<p class="muted small">Todavía no importaste libros.</p>'
    }${shared.length ? `<p class="small muted section-space">Compartidos con vos: ${shared.map(b => esc(b.title)).join(', ')}</p>` : ''}</section>`;
  }
  const isShared = b => b.owner_id && myId && b.owner_id !== myId;

  // ---------- Leer PDF en el navegador ----------
  let pdfjs = null;
  async function pdf() {
    if (pdfjs) return pdfjs;
    try {
      pdfjs = await import(PDFJS + 'pdf.min.mjs');
    } catch {
      throw Error('No se pudo cargar el lector de PDF. Revisá tu conexión.');
    }
    pdfjs.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.mjs';
    return pdfjs;
  }
  async function readPdf(file, onPage) {
    const lib = await pdf();
    const doc = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    const pages = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const p = await doc.getPage(i);
      const vp = p.getViewport({ scale: 1 });
      const tc = await p.getTextContent();
      pages.push({
        w: vp.width,
        h: vp.height,
        items: tc.items
          .filter(it => typeof it.str === 'string')
          .map(it => ({
            s: it.str,
            x: it.transform[4],
            y: vp.height - it.transform[5],
            w: it.width,
            h: it.height || Math.abs(it.transform[3]),
            f: it.fontName,
          })),
      });
      p.cleanup();
      onPage?.(i, doc.numPages);
    }
    await doc.destroy();
    return pages;
  }
  // Palabras y nombres que el sitio ya conoce: corrigen el texto de PDF escaneados (en español).
  let vocab = null;
  async function vocabulary() {
    if (vocab) return vocab;
    await MonsterUI.load().catch(() => {});
    const srd = (window.MonsterData || []).filter(m => !m.book);
    const spells = window.Catalog?.spells || [];
    vocab = LC.vocabulary(
      [
        ...spells.flatMap(s => [s.text, s.brief, s.time, s.range, s.duration, s.components]),
        ...srd.flatMap(m => [
          m.name,
          m.speed,
          m.senses,
          m.lang,
          ...m.traits.map(x => x[1]),
          ...m.actions.map(a => a.d),
        ]),
      ],
      [...spells.map(s => s.name), ...srd.map(m => m.name)],
    );
    return vocab;
  }
  const uuid = () =>
    crypto.randomUUID?.() ||
    'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => ((Math.random() * 16) | 0).toString(16));
  // Rasgos de clase y subclase, opciones (invocaciones, maniobras…) y dotes: el sitio ya conoce sus
  // nombres y niveles; del libro sale el texto.
  function rules(lines, opts) {
    if (typeof ClassData === 'undefined' || !LC.rules) return { feature: [], feat: [] };
    const found = LC.rules(lines, LC.ruleTargets(ClassData, typeof Catalog !== 'undefined' ? Catalog : null), opts);
    return {
      feature: found.filter(x => x.kind === 'feature').map(x => x.data),
      feat: found.filter(x => x.kind === 'feat').map(x => x.data),
    };
  }
  async function parse(file, onPage) {
    const id = uuid(),
      prefix = 'lib:' + id.slice(0, 8);
    const pages = await readPdf(file, onPage);
    const lines = LC.readLines(pages);
    const lang = LC.detectLang(lines);
    const opts = { prefix, vocab: lang === 'es' ? await vocabulary() : null };
    const textChars = pages.reduce((a, p) => a + p.items.reduce((b, it) => b + it.s.length, 0), 0);
    return {
      id,
      title: file.name
        .replace(/\.pdf$/i, '')
        .replace(/[_]+/g, ' ')
        .trim()
        .slice(0, 200),
      lang,
      pages: pages.length,
      scanned: textChars < pages.length * 200, // casi sin texto: imagen escaneada sin reconocimiento
      unreadable: LC.unreadablePages(pages),
      monster: LC.monsters(lines, opts),
      spell: LC.spells(lines, opts),
      item: LC.items(lines, opts),
      ...rules(lines, opts),
    };
  }

  // ---------- Importar ----------
  function importDialog() {
    pending = [];
    modal(
      'Importar libros',
      `<p class="small">Elegí uno o varios PDF de tus libros. Se leen en este dispositivo: el archivo no se sube. Se buscan los bloques de criaturas, conjuros y objetos mágicos, en español o en inglés.</p><label class="field">Archivos PDF<input type="file" id="lib-files" accept="application/pdf,.pdf" multiple></label><div id="lib-progress" class="library-progress" aria-live="polite"></div><div id="lib-results"></div>`,
      null,
    );
    const d = document.getElementById('modal');
    d.classList.add('library-modal');
    d.addEventListener('close', () => d.classList.remove('library-modal'), { once: true });
    document.getElementById('lib-files').addEventListener('change', async e => {
      const files = [...e.target.files];
      e.target.disabled = true;
      const box = document.getElementById('lib-progress');
      for (const [n, file] of files.entries()) {
        try {
          const r = await parse(file, (i, total) => {
            if (box) box.textContent = `Leyendo «${file.name}» (${n + 1} de ${files.length}): página ${i} de ${total}…`;
          });
          pending.push(r);
        } catch (err) {
          pending.push({
            id: uuid(),
            title: file.name,
            error: err.message || String(err),
            monster: [],
            spell: [],
            item: [],
          });
        }
        drawResults();
      }
      if (box) box.textContent = pending.length ? 'Listo. Revisá lo encontrado y guardalo.' : '';
      e.target.disabled = false;
    });
  }
  function drawResults() {
    const box = document.getElementById('lib-results');
    if (!box) return;
    box.innerHTML = pending.length
      ? `<div class="library-results">${pending
          .map((r, i) => {
            if (r.error)
              return `<div class="library-result"><b>${esc(r.title)}</b><p class="small">No se pudo leer: ${esc(r.error)}</p></div>`;
            const found = KINDS.map(([k]) => r[k].length).reduce((a, b) => a + b, 0);
            const flagged = KINDS.flatMap(([k, label]) => r[k].filter(x => x.issues).map(x => [label, x]));
            return `<div class="library-result"><label class="field">Nombre del libro<input data-lib-title="${i}" value="${esc(r.title)}" maxlength="200"></label><p class="small">${r.pages} páginas · ${r.lang === 'en' ? 'inglés' : 'español'} · ${KINDS.map(([k, label]) => `<b>${r[k].length}</b> ${label}`).join(' · ')}</p>${
              r.scanned
                ? '<p class="small">Este PDF casi no tiene texto (páginas escaneadas como imagen): no se puede leer. Si tenés otra copia con texto, usá esa.</p>'
                : !found
                  ? '<p class="small muted">No se encontraron criaturas, conjuros ni objetos con el formato de los libros de 5e.</p>'
                  : ''
            }${
              !r.scanned && r.unreadable?.length
                ? `<p class="small">${r.unreadable.length} páginas tienen el texto ilegible (la fuente del PDF no trae las letras), por ejemplo la ${r.unreadable.slice(0, 5).join(', ')}. Lo que esté ahí no se puede importar desde esta copia.</p>`
                : ''
            }${
              flagged.length
                ? `<details class="battle-rule"><summary>${flagged.length} con datos incompletos (se guardan igual; revisalos en la mesa)</summary><ul class="small library-flagged">${flagged
                    .slice(0, 200)
                    .map(
                      ([label, x]) =>
                        `<li><b>${esc(x.name)}</b> <span class="muted">(${label}, pág. ${x.page})</span>: ${esc(x.issues.join(', '))}</li>`,
                    )
                    .join('')}</ul></details>`
                : ''
            }<div class="chips">${KINDS.filter(([k]) => r[k].length)
              .map(
                ([k, label]) =>
                  `<label class="check"><input type="checkbox" data-lib-kind="${i}:${k}" checked>Guardar ${label}</label>`,
              )
              .join('')}</div></div>`;
          })
          .join(
            '',
          )}</div><div class="actions section-space">${pending.some(r => !r.error && KINDS.some(([k]) => r[k].length)) ? button('Guardar en mi biblioteca', 'lib-save', '') : ''}</div>`
      : '';
  }
  async function save() {
    const box = document.getElementById('lib-progress');
    const btn = document.querySelector('[data-action=lib-save]');
    if (btn) btn.disabled = true;
    let saved = 0;
    for (const [i, r] of pending.entries()) {
      if (r.error) continue;
      const title = document.querySelector(`[data-lib-title="${i}"]`)?.value.trim() || r.title;
      const kinds = KINDS.map(([k]) => k).filter(
        k => r[k].length && document.querySelector(`[data-lib-kind="${i}:${k}"]`)?.checked,
      );
      const entries = kinds.flatMap(k => r[k].map(data => ({ kind: k, data: { ...data, book: title } })));
      if (!entries.length) continue;
      const counts = Object.fromEntries(kinds.map(k => [k, r[k].length]));
      await Cloud.saveLibraryBook({ id: r.id, title, lang: r.lang, counts });
      await Cloud.addLibraryEntries(r.id, entries, (n, total) => {
        if (box) box.textContent = `Guardando «${title}»: ${n} de ${total}…`;
      });
      saved++;
    }
    pending = [];
    document.getElementById('modal').close();
    await loadBooks();
    await refresh();
    toast(saved ? `Biblioteca actualizada (${saved} libro${saved === 1 ? '' : 's'}).` : 'No había nada para guardar.');
    if (typeof draw === 'function') draw();
  }

  // ---------- Criaturas importadas en el bestiario ----------
  // Se suman a MonsterData con su libro; el resto de la pantalla del DM las usa igual que las del SRD.
  function attach() {
    return (attached ||= (async () => {
      if (!window.MonsterData || !Cloud.enabled) return;
      let rows;
      try {
        rows = await Cloud.libraryEntries('monster');
      } catch {
        return; // sin migración 011 o sin conexión: queda el SRD
      }
      const ids = new Set(window.MonsterData.map(m => m.id));
      for (const r of rows) {
        const m = r.data;
        if (!m?.id || ids.has(m.id)) continue;
        window.MonsterData.push({
          ...m,
          traits: m.traits || [],
          actions: m.actions || [],
          reactions: m.reactions || [],
          legendary: m.legendary || [],
        });
        ids.add(m.id);
      }
    })());
  }
  async function refresh() {
    if (!window.MonsterData) return;
    window.MonsterData = window.MonsterData.filter(m => !m.book || m.bundled);
    attached = null;
    vocab = null;
    await attach();
  }

  // ---------- Ver un libro ----------
  let browsing = null;
  async function browse(id) {
    const b = (books || []).find(x => x.id === id);
    if (!b) return;
    await MonsterUI.load();
    modal(
      b.title,
      `<div class="chips" role="group">${KINDS.map(([k, label]) => `<button type="button" class="chip" data-action="lib-tab" data-k="${k}" data-id="${id}">${label[0].toUpperCase() + label.slice(1)} (${b.counts?.[k] || 0})</button>`).join('')}</div>${field('Buscar', 'q', '', 'search', 'id="lib-q" autocomplete="off"')}<div id="lib-list" class="library-list"></div>`,
      null,
    );
    browsing = { id, kind: (KINDS.find(([k]) => b.counts?.[k]) || KINDS[0])[0], rows: {} };
    await showKind(browsing.kind);
  }
  async function showKind(kind) {
    if (!browsing) return;
    browsing.kind = kind;
    document
      .querySelectorAll('[data-action=lib-tab]')
      .forEach(x => x.classList.toggle('selected', x.dataset.k === kind));
    if (!browsing.rows[kind])
      browsing.rows[kind] = (await Cloud.libraryEntries(kind)).filter(r => r.book_id === browsing.id);
    drawList();
  }
  // «Brujo: El Insondable · nivel 1», «Invocación sobrenatural (brujo)», «Dote».
  const OPTION_KIND = {
    EI: 'Invocación sobrenatural (brujo)',
    PB: 'Don del pacto (brujo)',
    MV: 'Maniobra (guerrero)',
    AI: 'Infusión (artífice)',
    FS: 'Estilo de combate',
    AS: 'Disparo arcano (guerrero)',
    ED: 'Disciplina elemental (monje)',
    MM: 'Metamagia (hechicero)',
    RN: 'Runa (guerrero)',
  };
  function ruleWhere(x) {
    if (x.target === 'feat') return 'Dote';
    const D = typeof ClassData !== 'undefined' ? ClassData : null;
    if (x.target === 'option') {
      const types = D?.options.find(o => o.id === x.ref)?.types || [x.group || ''];
      return OPTION_KIND[String(types[0]).split(':')[0]] || 'Opción de clase';
    }
    const sub = x.target === 'subclass' ? D?.subclasses.find(s => s.id === x.ref) : null;
    const cls = D?.classes[sub ? sub.classId : x.ref];
    const owner = sub ? `${cls?.name || ''}: ${sub.name}` : cls?.name || '';
    const part = x.child
      ? `parte de «${D ? (sub || cls)?.features?.find(f => f.english === x.feature)?.name || x.feature : x.feature}»`
      : '';
    return [owner, x.level ? 'nivel ' + x.level : '', part].filter(Boolean).join(' · ');
  }
  function drawList() {
    const box = document.getElementById('lib-list');
    if (!box || !browsing) return;
    const q = LC.key(document.getElementById('lib-q')?.value || '');
    const rules = browsing.kind === 'feature' || browsing.kind === 'feat';
    let rows = (browsing.rows[browsing.kind] || []).filter(
      r => !q || LC.key(r.name).includes(q) || (rules && LC.key(ruleWhere(r.data)).includes(q)),
    );
    // Rasgos agrupados por clase y subclase, en orden de nivel.
    if (rules)
      rows = rows
        .map(r => ({ r, w: ruleWhere(r.data) }))
        .sort(
          (a, b) =>
            a.w.split(' · ')[0].localeCompare(b.w.split(' · ')[0], 'es') ||
            (a.r.data.level || 0) - (b.r.data.level || 0),
        )
        .map(x => x.r);
    rows = rows.slice(0, rules ? 600 : 150);
    box.innerHTML = rows.length
      ? rows
          .map(({ data: x }) => {
            if (browsing.kind === 'monster')
              return `<div class="list-row"><span><b>${esc(x.name)}</b> <span class="small muted">VD ${MonsterUI.crText(x.cr)} · ${esc(x.type)} · pág. ${x.page}${x.issues ? ' · ⚠ ' + esc(x.issues.join(', ')) : ''}</span></span>${button('Ver', 'monster-view', 'text-btn', `data-id="${esc(x.id)}"`)}</div>`;
            if (browsing.kind === 'spell')
              return `<details class="library-entry"><summary><b>${esc(x.name)}</b> <span class="small muted">${x.level ? 'Nivel ' + x.level : 'Truco'} · ${esc(x.school)} · pág. ${x.page}</span></summary><p class="small">${esc(x.time)} · ${esc(x.range)} · ${esc(x.components)} · ${esc(x.duration)}</p><p class="small">${esc(x.text)}</p>${x.higher ? `<p class="small"><b>A niveles superiores.</b> ${esc(x.higher)}</p>` : ''}</details>`;
            if (browsing.kind === 'feature' || browsing.kind === 'feat')
              return `<details class="library-entry"><summary><b>${esc(x.name)}</b> <span class="small muted">${esc(ruleWhere(x))} · pág. ${x.page}</span></summary><p class="small library-text">${esc(x.text)}</p></details>`;
            return `<details class="library-entry"><summary><b>${esc(x.name)}</b> <span class="small muted">${esc(x.detail)} · pág. ${x.page}</span></summary><p class="small">${esc(x.text)}</p></details>`;
          })
          .join('')
      : '<p class="muted small">Nada para mostrar.</p>';
  }

  Object.assign(actions, {
    'lib-import': () => importDialog(),
    'lib-save': () => save(),
    'lib-browse': e => browse(e.dataset.id),
    'lib-tab': e => showKind(e.dataset.k),
    'lib-share': async e => {
      const b = books.find(x => x.id === e.dataset.id);
      await Cloud.updateLibraryBook(b.id, { shared_with: b.shared_with === current ? null : current });
      await loadBooks();
      toast(
        b.shared_with === current
          ? 'Ya no se comparte con esta mesa.'
          : 'Los jugadores de esta mesa ven sus conjuros y objetos.',
      );
      draw();
    },
    'lib-delete': async e => {
      const b = books.find(x => x.id === e.dataset.id);
      if (
        !confirm(
          `¿Eliminar «${b.title}» de tu biblioteca? Las criaturas que ya estén en una iniciativa quedan con sus PG y CA.`,
        )
      )
        return;
      await Cloud.deleteLibraryBook(b.id);
      await loadBooks();
      await refresh();
      draw();
    },
  });
  document.addEventListener('input', e => {
    if (e.target.id === 'lib-q') drawList();
  });
  return { card, attach, refresh, parse };
})();
// dm.js dibuja la portada antes de que cargue este archivo: se redibuja para que aparezca la Biblioteca.
if (typeof current !== 'undefined' && !current && typeof draw === 'function') setTimeout(draw, 0);
