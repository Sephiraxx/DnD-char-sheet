/* Motor de efectos de subclase: lee subclass-fx-data.js y responde a cada cálculo de la ficha
   (CA, velocidad, iniciativa, salvaciones, pruebas, defensas, críticos, ataques, daño extra, conjuros
   y lo que pasa al empezar o terminar el turno). Con multiclase evalúa cada clase con su propio nivel. */
(function (root) {
  'use strict';
  const data = () => root.SubclassFXData || {},
    names = () => root.SubclassFXNames || {},
    mod = n => Math.floor((Number(n) - 10) / 2),
    val = (v, x) => (typeof v === 'function' ? v(x) : v) || 0;

  // Armadura pesada equipada (cálculo por equipo). Con CA manual no se sabe: no cuenta.
  function heavy(s) {
    const cfg = s.equipmentDefense;
    if (!cfg?.armorId) return false;
    const row = (s.inventory || []).find(x => x.id === cfg.armorId && x.qty > 0);
    return root.EquipmentData?.items?.[row?.equipmentId]?.armor?.type === 'heavy';
  }
  function context(s, v) {
    const C = root.Classes,
      total = C?.totalLevel ? C.totalLevel(s) : s.level,
      scores = root.Rules?.scores ? root.Rules.scores(s) : s.abilities || {},
      m = Object.fromEntries(Object.entries(scores).map(([k, n]) => [k, mod(n)]));
    const x = { s, v, l: v.level, pb: 2 + Math.floor((total - 1) / 4), m };
    Object.defineProperty(x, 'heavy', { get: () => heavy(s) });
    Object.defineProperty(x, 'max', { get: () => root.Rules.stats(s).maxHP });
    return x;
  }
  // Rasgos vigentes: [{ key, sub, en, spec, x }]. Un rasgo opcional de Tasha requiere activarlos, y
  // si está vigente desplaza a los que reemplaza (Golpes bendecidos → Golpe divino o Lanzamiento potente).
  function active(s) {
    const C = root.Classes;
    if (!C?.sub || !s) return [];
    const out = [];
    for (const v of C.views ? C.views(s) : [s]) {
      const sub = C.sub(v),
        table = sub && data()[sub.id];
      if (!table) continue;
      const x = context(s, v),
        here = [];
      for (const [en, spec] of Object.entries(table)) {
        if (v.level < (spec.lv || 1)) continue;
        if (spec.optional && !s.optionalClassFeatures) continue;
        if (spec.when && !spec.when(x)) continue;
        here.push({ key: sub.id + ':' + en, sub, en, spec, x });
      }
      out.push(...here.filter(e => !e.spec.replacedBy || !here.some(o => o.en === e.spec.replacedBy)));
    }
    return out;
  }
  const label = e => names()[e.key] || e.en;
  const parts = (s, k) =>
    active(s)
      .map(e => ({ label: e.spec.label || label(e), value: val(e.spec[k], e.x) }))
      .filter(p => p.value);
  const total = list => list.reduce((a, p) => a + p.value, 0);

  const ac = s => parts(s, 'ac');
  const saves = s => parts(s, 'saves');
  const speed = s => total(parts(s, 'speed'));
  const initiative = s => parts(s, 'init');
  // Competencia en salvaciones: «first» toma la primera que todavía no tenés.
  function saveProfs(s) {
    const C = root.Classes,
      have = new Set([...(C?.info?.(s)?.saves || []), ...(root.FeatFX?.saves(s) || [])]),
      out = [];
    for (const e of active(s)) {
      const p = e.spec.saveProf;
      if (!p) continue;
      for (const a of Array.isArray(p) ? p : [p.first.find(a => !have.has(a) && !out.includes(a)) || p.first[0]])
        if (!out.includes(a)) out.push(a);
    }
    return out;
  }
  const list = (s, k) => [...new Set(active(s).flatMap(e => e.spec[k] || []))];
  const skills = s => list(s, 'skills');
  const expertise = s => list(s, 'expertise');
  const armor = (s, type) => list(s, 'armor').includes(type);
  // Bonos a pruebas de característica: por habilidad o por característica.
  function checks(s, ability, skill = '') {
    return active(s)
      .filter(e => {
        const c = e.spec.check;
        return c && ((skill && (c.skills || []).includes(skill)) || (c.abilities || []).includes(ability));
      })
      .map(e => ({ label: e.spec.check.label || label(e), value: val(e.spec.check.value, e.x) }))
      .filter(p => p.value);
  }
  function defenses(s) {
    const out = { resist: [], immune: [], conditions: [], conditional: [], advSaves: [] };
    for (const e of active(s)) {
      const sp = e.spec,
        why = label(e);
      for (const t of sp.resist || []) out.resist.push([t, why]);
      for (const t of sp.immune || []) out.immune.push([t, why]);
      for (const c of sp.conditions || []) if (!out.conditions.includes(c)) out.conditions.push(c);
      if (sp.resistIf) out.conditional.push({ ...sp.resistIf, why: sp.resistIf.why || why });
      if (sp.advSave) out.advSaves.push([sp.advSave, why]);
    }
    return out;
  }
  // Crítico de los ataques con arma: el menor número que lo consigue (20 sin rasgos).
  const crit = s => Math.min(20, ...active(s).map(e => e.spec.crit || 20));
  const attacks = s => Math.max(1, ...active(s).map(e => e.spec.attacks || 1));
  const noStrength = s => active(s).some(e => e.spec.noStrength);
  const magicAbility = s => active(s).find(e => e.spec.magicAbility)?.spec.magicAbility || '';
  // Velocidades especiales (vuelo, nado) que la ficha muestra junto a la de caminar.
  function speeds(s, walk) {
    const out = [];
    for (const e of active(s)) {
      if (e.spec.fly)
        out.push({
          kind: 'fly',
          value: e.spec.fly === 'walk' ? walk : e.spec.fly,
          why: label(e) + (e.spec.flyNote ? ', ' + e.spec.flyNote : ''),
        });
      if (e.spec.swim) out.push({ kind: 'swim', value: e.spec.swim, why: label(e) });
    }
    return out;
  }
  function darkvision(s, base = 0) {
    let v = base;
    for (const e of active(s)) {
      const d = e.spec.darkvision;
      if (d) v = Math.max(v, base && d.plus ? base + d.plus : d.base);
    }
    return v;
  }

  // ---------- Una vez por turno ----------
  const turn = s => (root.Combat?.data(s).active ? root.Combat.data(s).turn : null);
  const onceUsed = (s, id) => turn(s) !== null && (s.combatState?.fxOnce || {})[id] === turn(s);
  function markOnce(s, id) {
    if (turn(s) === null) return;
    root.Combat.data(s).fxOnce = { ...(root.Combat.data(s).fxOnce || {}), [id]: turn(s) };
  }

  // Daño extra al impactar con un arma: { id, dice, flat, type, label, once, available }.
  function riders(s, { melee = true } = {}) {
    return active(s)
      .filter(e => e.spec.rider && (!e.spec.rider.melee || melee))
      .map(e => {
        const r = e.spec.rider;
        return {
          id: e.key,
          dice: r.dice(e.x),
          flat: val(r.flat, e.x),
          type: r.type,
          label: r.label || label(e),
          once: !!r.once,
          available: !r.once || !onceUsed(s, e.key),
        };
      });
  }
  // Modificadores fijos al daño con arma (Aura de odio).
  function damageMods(s, { melee = true } = {}) {
    return active(s)
      .filter(e => e.spec.dmgMod && (!e.spec.dmgMod.melee || melee))
      .map(e => ({ label: e.spec.dmgMod.label || label(e), value: val(e.spec.dmgMod.value, e.x) }))
      .filter(p => p.value);
  }

  // ---------- Conjuros ----------
  const canon = t => root.Defenses?.normalize(t) || t;
  // Bonos a una tirada de daño o curación de conjuro.
  // ctx: { slot, heal, classId (de la clase que lo lanza), types (los del daño) }.
  function spellBonus(s, sp, ctx = {}) {
    const slot = ctx.slot ?? sp.level,
      types = [].concat(ctx.types || sp.damageTypes || []).map(canon),
      out = [];
    for (const e of active(s)) {
      const b = e.spec.spell;
      if (!b) continue;
      if (ctx.heal ? !b.heal : !b.damage) continue;
      if (b.cantrip && sp.level !== 0) continue;
      if (b.minLevel && sp.level < b.minLevel) continue;
      if (b.cls && b.cls !== (ctx.classId || e.x.v.classId)) continue;
      if (b.school && sp.school !== b.school) continue;
      if (b.save && !(sp.saveAbility || []).length) continue;
      if (!ctx.heal && b.types && !types.some(t => b.types.includes(t))) continue;
      const x = { ...e.x, slot };
      out.push({
        id: e.key,
        label: b.label || label(e),
        value: val(b.value, x),
        dice: b.dice || '',
        max: !!b.max,
        optional: !!b.optional,
        checked: b.checked !== false,
        once: !!b.once,
        available: !b.once || !onceUsed(s, e.key),
        note: b.note || '',
      });
    }
    return out.filter(b => b.value || b.dice || b.max || b.note);
  }

  // ---------- Inicio y fin del turno ----------
  // Curaciones automáticas (Superviviente, Espíritu protector). Devuelve los textos para avisar.
  function tick(s, k, rnd = n => 1 + Math.floor(Math.random() * n)) {
    const notes = [];
    if (s.hp === null || s.hp === undefined) return notes;
    for (const e of active(s)) {
      const fn = e.spec[k];
      const got = fn && fn(e.x);
      if (!got) continue;
      const die = got.dice ? rnd(Number(got.dice.slice(1))) : 0,
        heal = Math.max(0, die + got.heal),
        max = root.Rules.stats(s).maxHP,
        before = s.hp;
      s.hp = Math.min(max, s.hp + heal);
      if (s.hp > before)
        notes.push(`${got.why}: +${s.hp - before} PG${got.dice ? ` (${got.dice} ${die} + ${got.heal})` : ''}`);
    }
    return notes;
  }
  const turnStart = (s, rnd) => tick(s, 'turnStart', rnd);
  const turnEnd = (s, rnd) => tick(s, 'turnEnd', rnd);

  // ---------- Lo que se ve en la ficha ----------
  // Qué hace sola la ficha y qué queda para la mesa, por rasgo vigente.
  function report(s) {
    const seen = new Set();
    return active(s)
      .filter(e => !seen.has(e.key) && seen.add(e.key))
      .map(e => ({ key: e.key, name: label(e), auto: e.spec.auto || '', table: e.spec.table || '' }));
  }
  // Nota para la tarjeta de un rasgo: la del rasgo y, en el primer rasgo de la subclase, la de los
  // rasgos que el libro describe dentro de él (no tienen tarjeta propia).
  function trait(s, sub, en) {
    if (!sub) return null;
    const table = data()[sub.id] || {},
      listed = new Set((sub.features || []).map(f => f.english || f.name)),
      first = (sub.features || [])[0],
      firstName = first && (first.english || first.name),
      rows = report(s).filter(r => {
        const [id, ...rest] = r.key.split(':'),
          name = rest.join(':');
        if (id !== sub.id || !table[name]) return false;
        return name === en || (en === firstName && !listed.has(name));
      });
    if (!rows.length) return null;
    const text = rows
      .map(
        r =>
          (rows.length > 1 || r.name !== en ? r.name + ': ' : '') +
          [r.auto, r.table && 'En la mesa: ' + r.table].filter(Boolean).join(' '),
      )
      .join(' · ');
    return { note: 'En la ficha: ' + text };
  }
  // Rasgos de la auditoría que tienen datos (para la prueba de cobertura).
  const keys = () => Object.entries(data()).flatMap(([id, t]) => Object.keys(t).map(en => id + ':' + en));

  root.SubclassFX = {
    active,
    ac,
    saves,
    saveProfs,
    speed,
    speeds,
    initiative,
    skills,
    expertise,
    armor,
    checks,
    defenses,
    crit,
    attacks,
    noStrength,
    magicAbility,
    darkvision,
    riders,
    damageMods,
    spellBonus,
    onceUsed,
    markOnce,
    turnStart,
    turnEnd,
    report,
    trait,
    keys,
    heavy,
  };
  if (typeof module !== 'undefined') module.exports = root.SubclassFX;
})(typeof window !== 'undefined' ? window : globalThis);
