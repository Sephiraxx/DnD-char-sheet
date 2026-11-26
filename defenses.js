/* Resistencias, inmunidades y vulnerabilidades al daño de una ficha, y el daño ajustado por tipo.
   Fuentes: raza, Furia del bárbaro mientras dura, dotes (FeatFX), subclase (SubclassFX) y las anotadas a mano. */
(function (root) {
  'use strict';
  const TYPES = [
    ['acid', 'ácido'],
    ['bludgeoning', 'contundente'],
    ['cold', 'frío'],
    ['fire', 'fuego'],
    ['force', 'fuerza'],
    ['lightning', 'relámpago'],
    ['necrotic', 'necrótico'],
    ['piercing', 'perforante'],
    ['poison', 'veneno'],
    ['psychic', 'psíquico'],
    ['radiant', 'radiante'],
    ['slashing', 'cortante'],
    ['thunder', 'trueno'],
  ];
  const ES = Object.fromEntries(TYPES);
  const canon = v =>
    String(v || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .trim();
  const ALIAS = {
    venenoso: 'poison',
    rayo: 'lightning',
    electrico: 'lightning',
    psiquico: 'psychic',
    necrotico: 'necrotic',
  };
  // Acepta el nombre en inglés o en castellano («fuego», «Fire», «psíquico»…).
  function normalize(t) {
    const c = canon(t);
    if (!c) return '';
    const hit = TYPES.find(([en, es]) => en === c || canon(es) === c);
    return hit ? hit[0] : ALIAS[c] || '';
  }
  const label = t => ES[t] || t;
  const amount = value => Math.max(0, Math.floor(Number(value) || 0));
  function afterSave(damage, saved, half) {
    const total = amount(damage);
    return saved ? (half ? Math.floor(total / 2) : 0) : total;
  }
  function partsAfterSave(parts, saved, half) {
    let subtotal = 0;
    return parts.map(part => {
      const previous = afterSave(subtotal, saved, half);
      subtotal += amount(part.amount);
      return { ...part, amount: afterSave(subtotal, saved, half) - previous };
    });
  }
  // A qualifier after a list of physical types belongs to that list, even after commas.
  function monsterTraits(monster) {
    const physical = new Set(['bludgeoning', 'piercing', 'slashing']);
    const out = { resist: [], immune: [], vulnerable: [], weapon: [] };
    for (const [key, field] of [
      ['resist', 'res'],
      ['immune', 'imm'],
      ['vulnerable', 'vuln'],
    ]) {
      for (const clause of String(monster?.[field] || '').split(';')) {
        const words = canon(clause).match(/[a-z]+/g) || [];
        const types = [...new Set(words.map(normalize).filter(Boolean))];
        const nonmagical = /\b(no magic\w*|nonmagical|non magical)\b/.test(canon(clause));
        const silver = /\b(plat\w*|silver\w*)\b/.test(canon(clause));
        const adamantine = /\badamantin\w*/.test(canon(clause));
        for (const type of types) {
          if (physical.has(type) && (nonmagical || silver || adamantine))
            out.weapon.push({ type, kind: key, nonmagical, silver, adamantine });
          else if (!out[key].includes(type)) out[key].push(type);
        }
      }
    }
    return out;
  }
  function monsterDamage(traits, parts) {
    const totals = new Map();
    for (const p of parts) {
      const type = normalize(p.type);
      const key = JSON.stringify([type, !!p.magical, !!p.silvered, !!p.adamantine]);
      const part = totals.get(key) || { ...p, type, amount: 0 };
      part.amount += amount(p.amount);
      totals.set(key, part);
    }
    return [...totals.values()].reduce((sum, part) => {
      const applies = kind =>
        traits?.[kind]?.includes(part.type) ||
        traits?.weapon?.some(
          r =>
            r.kind === kind &&
            r.type === part.type &&
            (!r.nonmagical || !part.magical) &&
            (!r.silver || !part.silvered) &&
            (!r.adamantine || !part.adamantine),
        );
      if (applies('immune')) return sum;
      const damage = applies('resist') ? Math.floor(part.amount / 2) : part.amount;
      return sum + damage * (applies('vulnerable') ? 2 : 1);
    }, 0);
  }
  const CONDITIONS = {
    poisoned: 'envenenado',
    charmed: 'hechizado',
    frightened: 'asustado',
    disease: 'enfermedades',
    exhaustion: 'agotamiento',
    paralyzed: 'paralizado',
    petrified: 'petrificado',
    sleep: 'sueño mágico',
  };
  const conditionLabel = c => CONDITIONS[canon(c)] || c;

  // Resistencias de una ficha, con la razón de cada una (para mostrarlas).
  function of(s) {
    const out = { resist: new Map(), immune: new Map(), vulnerable: new Map(), conditions: [] };
    const add = (kind, list, why) => {
      for (const x of [].concat(list || [])) {
        if (typeof x !== 'string') continue; // «elegí una» (ascendencia dracónica): se anota a mano.
        const t = normalize(x);
        if (t && !out[kind].has(t)) out[kind].set(t, why);
      }
    };
    const race = root.Campaign?.race?.(s);
    if (race) {
      add('resist', race.resist, race.name);
      add('immune', race.immune, race.name);
      add('vulnerable', race.vulnerable, race.name);
      for (const c of race.conditionImmune || []) if (typeof c === 'string') out.conditions.push(c);
    }
    add('resist', root.Grants?.proficiencies(s, 'resist'), race?.name || 'Rasgo');
    const own = s.defenses || {};
    add('resist', own.resist, 'anotada');
    add('immune', own.immune, 'anotada');
    add('vulnerable', own.vulnerable, 'anotada');
    if (s.raging) add('resist', ['bludgeoning', 'piercing', 'slashing'], 'Furia');
    for (const c of root.Spores?.conditionImmune(s) || []) if (!out.conditions.includes(c)) out.conditions.push(c);
    const items = root.MagicItems?.defenses(s);
    for (const [t, why] of items?.resist || []) add('resist', t, why);
    for (const [t, why] of items?.immune || []) add('immune', t, why);
    for (const c of items?.conditions || []) if (!out.conditions.includes(c)) out.conditions.push(c);
    const feats = root.FeatFX?.defenses(s);
    for (const [t, why] of feats?.resist || []) add('resist', t, why);
    for (const [t, why] of feats?.immune || []) add('immune', t, why);
    for (const c of feats?.conditions || []) if (!out.conditions.includes(c)) out.conditions.push(c);
    // Subclase: las fijas se aplican solas; las condicionadas (armas no mágicas, daño de conjuros) se recuerdan.
    const sub = root.SubclassFX?.defenses(s);
    for (const [t, why] of sub?.resist || []) add('resist', t, why);
    for (const [t, why] of sub?.immune || []) add('immune', t, why);
    for (const c of sub?.conditions || []) if (!out.conditions.includes(c)) out.conditions.push(c);
    out.conditional = sub?.conditional || [];
    out.advSaves = sub?.advSaves || [];
    return out;
  }

  // parts: [{ amount, type }]. Devuelve el total y una nota por cada ajuste.
  function apply(s, parts) {
    const d = of(s),
      notes = [];
    let total = 0;
    for (const p of parts) {
      const n = Math.max(0, Math.floor(Number(p.amount) || 0)),
        t = normalize(p.type);
      let v = n;
      for (const c of d.conditional)
        if (t && !d.immune.has(t) && !d.resist.has(t) && (c.types === 'all' || c.types.includes(t)))
          notes.push(`${c.why}: resistencia a ${label(t)} ${c.note} (si corresponde, registrá la mitad)`);
      if (t && d.immune.has(t)) {
        v = 0;
        notes.push(`inmune a ${label(t)} (${d.immune.get(t)})`);
      } else {
        if (t && d.resist.has(t)) {
          v = Math.floor(v / 2);
          notes.push(`resistencia a ${label(t)} (${d.resist.get(t)}): ${n} → ${v}`);
        }
        if (t && d.vulnerable.has(t)) {
          const before = v;
          v *= 2;
          notes.push(`vulnerable a ${label(t)}: ${before} → ${v}`);
        }
      }
      total += v;
    }
    return { total, notes };
  }
  // Partes del pedido de daño: varias tipadas, una con tipo o solo un número.
  function partsOf(p) {
    if (Array.isArray(p.parts) && p.parts.length) return p.parts;
    const first = String(p.type || p.types || '').split(/,\s*/)[0];
    return [{ amount: p.amount, type: first }];
  }
  function validate(s) {
    const d = s.defenses;
    if (d === undefined) return;
    if (
      !d ||
      typeof d !== 'object' ||
      ['resist', 'immune', 'vulnerable'].some(
        k => d[k] !== undefined && (!Array.isArray(d[k]) || d[k].some(t => !ES[t])),
      )
    )
      throw Error('Resistencias inválidas.');
  }
  root.Defenses = {
    TYPES,
    normalize,
    label,
    conditionLabel,
    of,
    apply,
    partsOf,
    afterSave,
    partsAfterSave,
    monsterTraits,
    monsterDamage,
    validate,
  };
  if (typeof module !== 'undefined') module.exports = root.Defenses;
})(typeof window !== 'undefined' ? window : globalThis);
