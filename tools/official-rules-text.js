/* Render structured 2014 rule blocks as readable plain text. Never evaluate reference markup. */
const normalize = value =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
function plain(value) {
  let text = String(value ?? '');
  for (let pass = 0; pass < 12 && /\{@/.test(text); pass++)
    text = text.replace(/\{@(\w+)(?: ([^{}]*))?\}/g, (_, tag, body = '') => {
      const bits = body.split('|');
      if (tag === 'h') return 'Hit: ';
      if (tag === 'dc') return 'DC ' + bits[0];
      if (tag === 'hit') return /^[+-]/.test(bits[0]) ? bits[0] : '+' + bits[0];
      if (['dice', 'damage'].includes(tag)) return bits[1] || bits[0];
      // Scale tags display the increment; the initial total is the roller's private payload.
      if (['scaledice', 'scaledamage'].includes(tag)) return bits[4] || bits[2];
      if (['book', 'adventure', 'classFeature', 'subclassFeature'].includes(tag)) return bits[0];
      if (tag === 'chance') return bits[1] || bits[0] + ' percent';
      if (tag === 'd20') return bits[1] || (/^[+-]/.test(bits[0]) ? bits[0] : '+' + bits[0]);
      if (['b', 'i', 'u', 's', 'note', 'sup', 'sub'].includes(tag)) return body;
      if (tag === 'filter') return bits[0];
      if (tag === 'quickref') return bits[4] || bits[0];
      return bits[2] || bits[0];
    });
  if (/\{@/.test(text)) throw Error('Unrendered rule markup: ' + text.slice(0, 160));
  return text
    .replace(/\u00ad/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim();
}
const featureId = row =>
  [
    row.name,
    row.className,
    row.classSource || 'PHB',
    ...(row.subclassShortName ? [row.subclassShortName, row.subclassSource || 'PHB'] : []),
    row.level,
    row.source,
  ].join('|');
function renderer(reference) {
  const features = Object.values(reference.classes).flatMap(c => [...c.classFeature, ...c.subclassFeature]);
  function referenced(value, type) {
    const p = value.split('|');
    let rows;
    if (type === 'refClassFeature')
      rows = features.filter(
        r =>
          !r.subclassShortName &&
          r.name === p[0] &&
          r.className === p[1] &&
          (r.classSource || 'PHB') === (p[2] || 'PHB') &&
          r.level === Number(p[3]) &&
          r.source === (p[4] || p[2] || 'PHB'),
      );
    else if (type === 'refSubclassFeature')
      rows = features.filter(
        r =>
          r.name === p[0] &&
          r.className === p[1] &&
          (r.classSource || 'PHB') === (p[2] || 'PHB') &&
          r.subclassShortName === p[3] &&
          (r.subclassSource || 'PHB') === (p[4] || 'PHB') &&
          r.level === Number(p[5]) &&
          r.source === (p[6] || p[4] || 'PHB'),
      );
    else rows = reference.options.filter(r => r.name === p[0] && r.source === (p[1] || 'PHB'));
    if (rows.length !== 1) throw Error('Unresolved feature reference: ' + value);
    return rows[0];
  }
  function prose(value, seen = new Set()) {
    if (value == null) return '';
    if (typeof value === 'string' || typeof value === 'number') return plain(value);
    if (Array.isArray(value))
      return value
        .map(v => prose(v, seen))
        .filter(Boolean)
        .join('\n\n');
    if (value.type?.startsWith('ref')) {
      const uid = value.classFeature || value.subclassFeature || value.optionalfeature;
      const row = referenced(uid, value.type),
        id = featureId(row);
      if (seen.has(id)) throw Error('Cyclic rule reference: ' + uid);
      return row.name + '\n' + prose(row.entries, new Set([...seen, id]));
    }
    if (value.type === 'table')
      return [
        value.caption && plain(value.caption),
        value.colLabels?.map(plain).join(' | '),
        ...(value.rows || []).map(r => (r.row || r).map(c => prose(c, seen).replace(/\n+/g, '; ')).join(' | ')),
        prose(value.footnotes, seen),
      ]
        .filter(Boolean)
        .join('\n');
    if (value.type === 'cell')
      return value.entry
        ? prose(value.entry, seen)
        : value.roll
          ? String(value.roll.exact ?? [value.roll.min, value.roll.max].join('–'))
          : '';
    if (value.type === 'list') return (value.items || []).map(v => '• ' + prose(v, seen)).join('\n');
    if (value.type === 'abilityDc')
      return (
        (value.name || 'Spell') +
        ' save DC = 8 + your proficiency bonus + your ' +
        (value.attributes || []).join(' or ') +
        ' modifier.'
      );
    if (value.type === 'abilityAttackMod')
      return (
        (value.name || 'Spell') +
        ' attack modifier = your proficiency bonus + your ' +
        (value.attributes || []).join(' or ') +
        ' modifier.'
      );
    if (value.type === 'abilityGeneric') return prose(value.text, seen);
    if (['image', 'gallery'].includes(value.type)) return '';
    const content = value.entries || value.items || value.entry || value.tables;
    if (content !== undefined)
      return [value.name && plain(value.name), prose(content, seen)].filter(Boolean).join('\n');
    throw Error('Unsupported rule node: ' + JSON.stringify(value).slice(0, 200));
  }
  return { prose, referenced };
}
module.exports = { normalize, plain, renderer, featureId };
