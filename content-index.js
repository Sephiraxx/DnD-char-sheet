/* One listing per identical entry; original records and saved IDs remain available. */
(function (root) {
  'use strict';
  const data = root.SharedReferenceData || {},
    groups = new Map(),
    aliases = data.sourceAliases || {};
  const normalize = s =>
    String(s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '');
  for (const group of data.duplicateGroups || []) for (const id of group.ids) groups.set(group.kind + ':' + id, group);
  const canonicalSource = id => aliases[id] || id;
  const sources = row => [
    ...new Set((row.sources || [row.sourceKey || row.source]).filter(Boolean).flatMap(s => [s, canonicalSource(s)])),
  ];
  for (const [alias, id] of Object.entries(aliases)) {
    root.CampaignData.sources[id] ||= root.CampaignData.sources[alias];
    if (!root.Catalog.sources.some(([k]) => k === id)) root.Catalog.sources.push([id, root.CampaignData.sources[id]]);
  }
  function unique(kind, rows, selected = []) {
    if (Array.isArray(kind)) {
      selected = rows || [];
      rows = kind;
      kind = null;
    }
    const result = new Map(),
      wanted = new Set(selected);
    for (const row of rows) {
      const k = kind || row.kind,
        group = groups.get(k + ':' + row.id),
        signature = k + ':' + (group?.preferred || row.id);
      const previous = result.get(signature);
      if (!previous || wanted.has(row.id) || (!wanted.has(previous.id) && group?.preferred === row.id))
        result.set(signature, row);
    }
    return [...result.values()];
  }
  function list(kind, rows, selected = []) {
    const result = unique(kind, rows, selected),
      families = new Map();
    for (const r of result) {
      const k = normalize(r.english || r.name);
      families.set(k, [...(families.get(k) || []), r]);
    }
    return result.map(r => {
      const family = families.get(normalize(r.english || r.name));
      if (family.length < 2) return r;
      const sourceOf = x =>
        x.reference?.split(':')[0] ||
        canonicalSource(x.sourceKey || x.source) ||
        x.sources?.[0] ||
        x.book ||
        'personalizada';
      const source = sourceOf(r);
      const sameSource = family.filter(x => sourceOf(x) === source).length > 1;
      return { ...r, name: r.name + ' (versión ' + source + (sameSource && r.page ? ', p. ' + r.page : '') + ')' };
    });
  }
  function inventoryId(id, name) {
    const found = (data.itemIds || []).find(
      r => r.oldId === id && [r.name, r.english].filter(Boolean).some(n => normalize(n) === normalize(name)),
    );
    return found ? root.MagicItems.byId(found.id)?.id || found.id : id;
  }
  root.ContentIndex = { unique, list, sources, canonicalSource, inventoryId };
})(typeof window !== 'undefined' ? window : globalThis);
