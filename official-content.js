/* Official book entries available to every visitor. Account-library imports remain separate. */
(function (root) {
  'use strict';
  const normalize = s =>
    String(s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  const ruleTexts = new Map(),
    spellTexts = new Map(),
    itemTexts = new Map(),
    entryTexts = new Map();
  let applied = false;
  const adventureSources = new Set(),
    adventureTitles = new Set();
  // textLen: largo del texto cuando todavía no llegó (official-text-data.js se carga después).
  const rank = row =>
    (row.language === 'es' ? 10000 : 0) +
    Math.min(8000, row.text || row.data?.text ? (row.text || row.data.text).length : row.textLen || 0);
  // De qué fila del libro salió cada texto de conjuro elegido, para completarlo cuando llega.
  const spellRows = new Map();
  const reference = row => ({
    name: row.name,
    text: row.text,
    page: row.page,
    book: row.book,
    bookId: row.bookId,
    sourceKey: row.sourceKey || row.source,
    language: row.language,
    rulesLanguage: row.rulesLanguage,
    originalText: row.originalText,
    originalHigher: row.originalHigher,
    sourcePage: row.sourcePage,
    spellDetails:
      row.canonicalId && row.time
        ? { time: row.time, range: row.range, components: row.components, duration: row.duration, ritual: row.ritual }
        : undefined,
    bundled: true,
    variantNote: row.variantNote,
    variants: row.variants,
    attunementRequirement: row.attunementRequirement,
  });
  function apply(target = root) {
    const data = target.OfficialContentData;
    if (!data || applied) return;
    applied = true;
    for (const fix of target.SharedReferenceData?.itemIds || []) {
      const row = data.items.find(r => r.bookId === fix.bookId && r.name === fix.name && r.catalogId === fix.oldId);
      if (row) {
        row.catalogId = fix.id;
        row.aliasCatalogIds = (row.aliasCatalogIds || []).filter(id => id !== fix.oldId);
      }
    }
    // This 8th-level replacement is Tasha's optional 2014 rule, including on older domains.
    for (const sub of target.ClassData.subclasses.filter(s => s.classId === 'cleric'))
      for (const feature of sub.features.filter(f => f.english === 'Blessed Strikes')) {
        feature.source = 'TCE';
        feature.optional = true;
      }
    for (const book of data.books.filter(b => b.kind === 'adventure')) {
      adventureSources.add(book.sourceKey);
      for (const source of book.referenceSources || []) adventureSources.add(source);
      adventureTitles.add(book.title);
    }
    // Locathah Rising is an existing adventure source outside the PDF expansion.
    adventureSources.add('LR');
    if (target.CampaignData.sources.LR) adventureTitles.add(target.CampaignData.sources.LR);
    for (const book of data.books) {
      if (book.edition !== '2014') continue;
      target.CampaignData.sources[book.sourceKey] ||= book.title;
      if (!target.Catalog.sources.some(([id]) => id === book.sourceKey))
        target.Catalog.sources.push([book.sourceKey, book.title]);
    }
    applyMonsters(target);
    for (const row of data.spells) {
      const id = row.canonicalId;
      if (!id) continue; // Unmatched names stay in the conversion audit until class membership is verified.
      const previous = spellTexts.get(id);
      const primarySource = target.Catalog.spells.find(spell => spell.id === id)?.sourceKey;
      const spellRank = spell => rank(spell) + (spell.sourceKey === primarySource ? 100000 : 0);
      if (!previous || spellRank(row) > spellRank(previous)) {
        spellTexts.set(id, {
          ...reference(row),
          higher: row.higher || '',
          language: row.language,
          textLen: row.textLen,
        });
        spellRows.set(id, row);
      }
    }
    // These references were supplied directly, rather than extracted from the PDF allowlist.
    for (const row of target.SharedSpellData || []) {
      const spell = target.Catalog.spells.find(s => s.id === row.canonicalId);
      if (!spell || spell.english !== row.english || spell.sourceKey !== row.sourceKey) continue;
      const { canonicalId, english, book, summary, text, higher, originalText, originalHigher, ...metadata } = row;
      Object.assign(spell, metadata, {
        text: summary,
        brief: summary,
        castingTimeEs: row.castingTimeEs || (row.time === 'Acción' ? '1 acción' : row.time),
        ritual: false,
        bard: row.classes.includes('bard'),
        optionalBard: false,
        referenceOnly: false,
        summaryEs: true,
        higherLevels: Boolean(higher),
        saveAbility: row.saveAbility || [],
        attackKind: row.attackKind || [],
      });
      target.ClassData.spellClasses[canonicalId] = [...row.classes];
      spellRows.delete(canonicalId);
      spellTexts.set(canonicalId, {
        ...reference({
          ...row,
          name: spell.name,
          time: spell.castingTimeEs,
          components: row.components + (row.materialEs ? ' (' + row.materialEs + ')' : ''),
          language: 'es',
          rulesLanguage: 'es',
          ritual: false,
        }),
        higher,
      });
    }
    for (const [id, book] of spellTexts) {
      const spell = target.Catalog.spells.find(s => s.id === id);
      if (spell && book.spellDetails) spell.ritual = Boolean(book.spellDetails.ritual);
    }
    const existing = new Map(
      (target.MagicItems?.ITEMS || []).flatMap(it =>
        [it.name, it.english].filter(Boolean).map(n => [normalize(n), it]),
      ),
    );
    for (const row of data.items) {
      let item = row.canonicalId
        ? target.MagicItems?.byId(row.canonicalId)
        : existing.get(normalize(row.name)) || existing.get(normalize(row.english));
      // «Munición +1, +2 o +3» del libro: es la «Munición +1» de la ficha (con «+2» y «+3» al lado), con su texto.
      if (!item && /^munici[oó]n\s*,?\s*\+\s?[1li]\b.*\+\s?2.*\+\s?3/i.test(row.name))
        item = target.MagicItems?.byId('ammunition-1');
      if (!item && target.MagicItems) {
        const name = row.name.trim();
        if (name.length < 3 || name.length > 100) continue;
        const id = row.catalogId || ('official-' + row.bookId + '-' + normalize(name).replace(/ /g, '-')).slice(0, 100);
        item = {
          id,
          name,
          english: row.english || (row.language === 'en' ? name : ''),
          aliasIds: row.aliasCatalogIds || [],
          rarity: row.rarity,
          attune: Boolean(row.attunement),
          sourceKey: row.sourceKey,
          source: row.book,
          bookId: row.bookId,
          note: (target.MagicItems.ownText ? target.MagicItems.ownText(row.text) : row.text).slice(0, 480),
          manualEffects: true,
        };
        const count = /(?:tiene|has|contiene|dispone de)\s+(\d{1,2})\s+(?:cargas|charges)\b/i.exec(row.text);
        if (count && Number(count[1]) > 0) item.charges = { max: Number(count[1]), regain: '0' };
        // Bonos que la ficha sabe aplicar, leídos del texto (+N, CA, salvaciones, resistencias, curación…).
        if (target.MagicItems.derive) Object.assign(item, target.MagicItems.derive(item, row));
        // Texto del libro en inglés: nombre y resumen en español (traits-es-data.js); el libro sigue en el desplegable.
        const es = target.TraitsEs?.item(id);
        if (es) {
          if (es.name) item.name = es.name;
          item.note = es.note;
        }
        target.MagicItems.ITEMS.push(item);
        existing.set(normalize(name), item);
      }
      if (!item) continue;
      if (row.english) existing.set(normalize(row.english), item);
      item.aliasIds = [
        ...new Set([
          ...(item.aliasIds || []),
          ...(row.aliasCatalogIds || []),
          ...(row.catalogId && row.catalogId !== item.id ? [row.catalogId] : []),
        ]),
      ];
      if (item.id.startsWith('official-')) {
        item.attune = Boolean(row.attunement);
        item.rarity = row.rarity;
      }
      const previous = itemTexts.get(item.id);
      if (!previous || rank(row) > rank(previous))
        itemTexts.set(item.id, { ...reference(row), language: row.language });
    }
    target.BookContentData.official = {
      ...data.audit,
      rules: ruleTexts.size,
      spellDescriptions: spellTexts.size,
      itemDescriptions: itemTexts.size,
      creatureEntries: data.monsters?.length || 0,
      officialBooks: data.books,
    };
    applyLongTexts(target);
    applyTexts(target);
  }
  // Textos de reglas y de conjuros (official-text-data.js): en la ficha llegan después de mostrarse.
  let longApplied = false;
  function applyLongTexts(target = root) {
    const data = target.OfficialContentData;
    if (longApplied || !applied || !data?.rules) return;
    longApplied = true;
    for (const row of data.rules) {
      const previous = ruleTexts.get(row.key);
      if (!previous || rank(row.data) > rank(previous)) ruleTexts.set(row.key, reference(row.data));
    }
    for (const [id, row] of spellRows) {
      const entry = spellTexts.get(id);
      if (entry)
        Object.assign(entry, {
          text: row.text,
          higher: row.higher || '',
          originalText: row.originalText,
          originalHigher: row.originalHigher,
        });
    }
    if (target.BookContentData?.official) target.BookContentData.official.rules = ruleTexts.size;
    applyTexts(target);
    if (typeof target.dispatchEvent === 'function' && typeof Event === 'function')
      target.dispatchEvent(new Event('reference-texts'));
  }
  // Textos largos de referencia (shared-reference-text.js): la ficha los pide después de mostrarse.
  let textsApplied = false;
  function applyTexts(target = root) {
    const ref = target.SharedReferenceData;
    if (textsApplied || !applied || !longApplied || !ref?.entries) return;
    textsApplied = true;
    for (const row of ref.entries) entryTexts.set(row.key, reference(row));
    for (const row of ref.features || []) if (!ruleTexts.has(row.key)) ruleTexts.set(row.key, reference(row));
    for (const row of ref.entries) if (row.key.startsWith('item:')) itemTexts.set(row.key.slice(5), reference(row));
    const official = target.BookContentData?.official;
    if (official) Object.assign(official, { rules: ruleTexts.size, itemDescriptions: itemTexts.size });
    if (typeof target.dispatchEvent === 'function' && typeof Event === 'function')
      target.dispatchEvent(new Event('reference-texts'));
  }
  // Carga diferida de un archivo de datos (una sola vez; si falla, se puede reintentar).
  const pending = new Map();
  function script(src, ready, message) {
    if (ready() || typeof document === 'undefined') return Promise.resolve();
    if (!pending.has(src))
      pending.set(
        src,
        new Promise((ok, fail) => {
          const s = document.createElement('script');
          s.src = src;
          s.onload = ok;
          s.onerror = () => {
            pending.delete(src);
            fail(Error(message));
          };
          document.head.append(s);
        }),
      );
    return pending.get(src);
  }
  const loadTexts = () =>
    script('./official-text-data.js', () => longApplied, 'No se pudieron cargar los textos de los libros.')
      .then(() => applyLongTexts())
      .then(() =>
        script('./shared-reference-text.js', () => textsApplied, 'No se pudieron cargar los textos de los libros.'),
      )
      .then(() => applyTexts());
  // Los bloques de criaturas pesan más que todo lo demás junto: van en official-monsters-data.js,
  // que la ficha y la pantalla del DM cargan recién al abrir el bestiario (el catálogo, al inicio).
  let monstersApplied = false;
  function applyMonsters(target = root) {
    const data = target.OfficialContentData;
    if (monstersApplied || !applied || !data?.monsters || !target.BookContentData) return;
    monstersApplied = true;
    const monsters = new Map(
      (data.completeMonsterReplacement
        ? []
        : target.BookContentData.monsters.filter(m => m.bookId !== 'eb3e374f79f75889')
      ).map(m => [m.id, m]),
    );
    for (const monster of data.monsters) monsters.set(monster.id, monster);
    target.BookContentData.monsters = [...monsters.values()];
    if (target.BookContentData.official) target.BookContentData.official.creatureEntries = data.monsters.length;
  }
  const loadMonsters = () =>
    script(
      './official-monsters-data.js',
      () => !!root.OfficialContentData?.monsters,
      'No se pudo cargar el bestiario. Revisá tu conexión.',
    ).then(() => applyMonsters());
  const esc = s =>
    String(s ?? '').replace(
      /[&<>"']/g,
      c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  function html(row) {
    if (!row) return '';
    const location = row.page ? ` · PDF p. ${row.page}` : row.sourcePage ? ` · ed. inglesa p. ${row.sourcePage}` : '';
    const spell = row.spellDetails;
    const spellHeader = spell
      ? `<p class="small library-text">Tiempo de lanzamiento: ${esc(spell.time)}${spell.ritual ? ' (ritual)' : ''}\nAlcance: ${esc(spell.range)}\nComponentes: ${esc(spell.components)}\nDuración: ${esc(spell.duration)}</p>`
      : '';
    const original = row.originalText
      ? `<details><summary>Texto original en inglés</summary><p class="small library-text">${esc(row.originalText)}${row.originalHigher ? '\n\nAt Higher Levels: ' + esc(row.originalHigher) : ''}</p></details>`
      : '';
    return `<details class="library-feature"><summary>Reglas del libro · ${esc(row.book)}${location}${row.rulesLanguage === 'en' ? ' · texto en inglés' : ''}</summary>${spellHeader}${row.variantNote ? '<p class="small">' + esc(row.variantNote) + '</p>' : ''}${row.variants ? '<p class="small">' + row.variants.map(v => esc(v.name) + ' · ' + esc(v.rarity)).join('<br>') + '</p>' : ''}${row.attunementRequirement ? '<p class="small">Sintonización: ' + esc(row.attunementRequirement) + '</p>' : ''}<p class="small library-text">${row.text === undefined ? 'Cargando el texto del libro…' : esc(row.text)}${row.higher ? '\n\nA niveles superiores: ' + esc(row.higher) : ''}</p>${original}</details>`;
  }
  root.OfficialContent = {
    apply,
    applyMonsters,
    loadMonsters,
    applyTexts,
    applyLongTexts,
    loadTexts,
    // Promesa que se cumple cuando los textos de los libros ya están (para quien los necesita, como las tablas).
    ready: () => (longApplied && textsApplied ? Promise.resolve() : loadTexts()),
    textsReady: () => textsApplied,
    ruleTexts,
    spellTexts,
    itemTexts,
    entryTexts,
    adventureSources,
    selectableSource: source =>
      !adventureSources.has(source) && (!root.ContentIndex || root.ContentIndex.canonicalSource(source) === source),
    selectableBook: title => !adventureTitles.has(title),
    html,
    spellHtml: id => html(spellTexts.get(id)),
    entryHtml: (kind, id) => html(entryTexts.get(kind + ':' + id)),
    itemHtml: id =>
      (root.MagicItems?.byId(id)?.manualEffects
        ? '<p class="small">Aplicá los efectos especiales y la recuperación de cargas según las reglas del libro.</p>'
        : '') + html(itemTexts.get(id)),
  };
  if (root.OfficialContentData && root.Catalog && root.ClassData && root.CampaignData) apply();
  // En el navegador, los textos largos llegan solos cuando la página ya terminó de cargar.
  if (typeof document !== 'undefined' && typeof root.addEventListener === 'function' && !textsApplied) {
    const later = () => setTimeout(() => loadTexts().catch(() => {}), 0);
    if (document.readyState === 'complete') later();
    else root.addEventListener('load', later, { once: true });
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = root.OfficialContent;
})(typeof window !== 'undefined' ? window : globalThis);
