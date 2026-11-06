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
    itemTexts = new Map();
  let applied = false;
  const rank = row => (row.language === 'es' ? 10000 : 0) + Math.min(8000, (row.text || row.data?.text || '').length);
  const reference = row => ({
    name: row.name,
    text: row.text,
    page: row.page,
    book: row.book,
    bookId: row.bookId,
    language: row.language,
    bundled: true,
  });
  function apply(target = root) {
    const data = target.OfficialContentData;
    if (!data || applied) return;
    applied = true;
    for (const book of data.books) {
      if (book.edition !== '2014') continue;
      target.CampaignData.sources[book.sourceKey] ||= book.title;
      if (!target.Catalog.sources.some(([id]) => id === book.sourceKey))
        target.Catalog.sources.push([book.sourceKey, book.title]);
    }
    const monsters = new Map(
      target.BookContentData.monsters.filter(m => m.bookId !== 'eb3e374f79f75889').map(m => [m.id, m]),
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
      if (!previous || rank(row) > rank(previous))
        spellTexts.set(id, { ...reference(row), higher: row.higher || '', language: row.language });
    }
    const existing = new Map(
      (target.MagicItems?.ITEMS || []).flatMap(it =>
        [it.name, it.english].filter(Boolean).map(n => [normalize(n), it]),
      ),
    );
    for (const row of data.items) {
      let item = row.canonicalId ? target.MagicItems?.byId(row.canonicalId) : existing.get(normalize(row.name));
      if (!item && target.MagicItems) {
        const name = row.name.trim();
        if (name.length < 3 || name.length > 100) continue;
        const id = ('official-' + row.bookId + '-' + normalize(name).replace(/ /g, '-')).slice(0, 100);
        item = {
          id,
          name,
          english: row.language === 'en' ? name : '',
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
      if (item.id.startsWith('official-') && row.attunement) item.attune = true;
      const previous = itemTexts.get(item.id);
      if (!previous || rank(row) > rank(previous))
        itemTexts.set(item.id, { ...reference(row), language: row.language });
    }
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
    return `<details class="library-feature"><summary>Reglas del libro · ${esc(row.book)} · PDF p. ${row.page}</summary><p class="small library-text">${esc(row.text)}${row.higher ? '\n\nA niveles superiores: ' + esc(row.higher) : ''}</p></details>`;
  }
  root.OfficialContent = {
    apply,
    ruleTexts,
    spellTexts,
    itemTexts,
    html,
    spellHtml: id => html(spellTexts.get(id)),
    itemHtml: id =>
      (root.MagicItems?.byId(id)?.manualEffects
        ? '<p class="small">Aplicá los efectos especiales y la recuperación de cargas según las reglas del libro.</p>'
        : '') + html(itemTexts.get(id)),
  };
  if (root.OfficialContentData && root.Catalog && root.ClassData && root.CampaignData) apply();
  if (typeof module !== 'undefined' && module.exports) module.exports = root.OfficialContent;
})(typeof window !== 'undefined' ? window : globalThis);
