/* Resistencias, inmunidades y vulnerabilidades al daño de una ficha, y el daño ajustado por tipo.
   Fuentes: raza, Furia del bárbaro mientras dura, dotes (FeatFX) y las que se anotan a mano. */
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
    const own = s.defenses || {};
    add('resist', own.resist, 'anotada');
    add('immune', own.immune, 'anotada');
    add('vulnerable', own.vulnerable, 'anotada');
    if (s.raging) add('resist', ['bludgeoning', 'piercing', 'slashing'], 'Furia');
    for (const r of root.FeatFX?.resistances?.(s) || []) add('resist', [r.type], r.why);
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
  root.Defenses = { TYPES, normalize, label, conditionLabel, of, apply, partsOf, validate };
  if (typeof module !== 'undefined') module.exports = root.Defenses;
})(typeof window !== 'undefined' ? window : globalThis);
