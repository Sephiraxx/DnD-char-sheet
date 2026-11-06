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
  const rank = row => (row.language === 'es' ? 10000 : 0) + Math.min(8000, (row.text || row.data?.text || '').length);
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
    const monsters = new Map(
      (data.completeMonsterReplacement
        ? []
        : target.BookContentData.monsters.filter(m => m.bookId !== 'eb3e374f79f75889')
      ).map(m => [m.id, m]),
    );
    for (const monster of data.monsters) monsters.set(monster.id, monster);
    target.BookContentData.monsters = [...monsters.values()];
    for (const row of data.rules) {
      const previous = ruleTexts.get(row.key);
      if (!previous || rank(row.data) > rank(previous)) ruleTexts.set(row.key, reference(row.data));
    }
    for (const row of data.spells) {
      const id = row.canonicalId;
      if (!id) continue; // Unmatched names stay in the conversion audit until class membership is verified.
      const previous = spellTexts.get(id);
      const primarySource = target.Catalog.spells.find(spell => spell.id === id)?.sourceKey;
      const spellRank = spell => rank(spell) + (spell.sourceKey === primarySource ? 100000 : 0);
      if (!previous || spellRank(row) > spellRank(previous))
        spellTexts.set(id, { ...reference(row), higher: row.higher || '', language: row.language });
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
    for (const row of target.SharedReferenceData?.entries || []) entryTexts.set(row.key, reference(row));
    for (const row of target.SharedReferenceData?.features || [])
      if (!ruleTexts.has(row.key)) ruleTexts.set(row.key, reference(row));
    const existing = new Map(
      (target.MagicItems?.ITEMS || []).flatMap(it =>
        [it.name, it.english].filter(Boolean).map(n => [normalize(n), it]),
      ),
    );
    for (const row of data.items) {
      let item = row.canonicalId
        ? target.MagicItems?.byId(row.canonicalId)
        : existing.get(normalize(row.name)) || existing.get(normalize(row.english));
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
          note: row.text.slice(0, 480),
          manualEffects: true,
        };
        const count = /(?:tiene|has|contiene|dispone de)\s+(\d{1,2})\s+(?:cargas|charges)\b/i.exec(row.text);
        if (count && Number(count[1]) > 0) item.charges = { max: Number(count[1]), regain: '0' };
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
    for (const row of target.SharedReferenceData?.entries || [])
      if (row.key.startsWith('item:')) itemTexts.set(row.key.slice(5), reference(row));
    target.BookContentData.official = {
      ...data.audit,
      rules: ruleTexts.size,
      spellDescriptions: spellTexts.size,
      itemDescriptions: itemTexts.size,
      creatureEntries: data.monsters.length,
      officialBooks: data.books,
    };
  }
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
    return `<details class="library-feature"><summary>Reglas del libro · ${esc(row.book)}${location}${row.rulesLanguage === 'en' ? ' · texto en inglés' : ''}</summary>${spellHeader}${row.variantNote ? '<p class="small">' + esc(row.variantNote) + '</p>' : ''}${row.variants ? '<p class="small">' + row.variants.map(v => esc(v.name) + ' · ' + esc(v.rarity)).join('<br>') + '</p>' : ''}${row.attunementRequirement ? '<p class="small">Sintonización: ' + esc(row.attunementRequirement) + '</p>' : ''}<p class="small library-text">${esc(row.text)}${row.higher ? '\n\nA niveles superiores: ' + esc(row.higher) : ''}</p>${original}</details>`;
  }
  root.OfficialContent = {
    apply,
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
  if (typeof module !== 'undefined' && module.exports) module.exports = root.OfficialContent;
})(typeof window !== 'undefined' ? window : globalThis);
