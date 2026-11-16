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
      const kept = here.filter(e => !e.spec.replacedBy || !here.some(o => o.en === e.spec.replacedBy));
      out.push(...kept);
      // Opciones elegidas (Espíritu tótem, maniobras, runas…): cada una cuenta como un rasgo más.
      for (const e of kept)
        if (e.spec.choice)
          for (const id of picked(s, e.key)) {
            const opt = optionsOf(e)[id];
            if (!opt || (opt.fx?.when && !opt.fx.when(x)) || (opt.lv && v.level < opt.lv)) continue;
            out.push({
              key: e.key + '@' + id,
              opt: e.key,
              sub,
              en: e.en,
              name: opt.name,
              spec: { lv: e.spec.lv, ...opt.fx },
              x,
            });
          }
      // Estados activados (Canto del filo, Forma del pavor…): mientras duran, sus efectos cuentan como un rasgo más.
      for (const e of kept)
        for (const [key, def] of stateDefs(e))
          if (isOn(s, key) && (def.dur !== 'rage' || s.raging))
            out.push({
              key: key + '#on',
              base: key,
              def,
              sub,
              en: e.en,
              name: def.name || names()[e.key] || e.en,
              spec: { lv: e.spec.lv, ...def.fx },
              x,
            });
    }
    return out;
  }
  const label = e => e.name || names()[e.key] || e.en;

  // ---------- Elecciones ----------
  // s.subclassChoices: { [clave del rasgo]: [ids de opción] }.
  const picked = (s, key) => s.subclassChoices?.[key] || [];
  const optionsOf = e =>
    typeof e.spec.choice.options === 'function' ? e.spec.choice.options(e.x) : e.spec.choice.options;
  // Elecciones vigentes: { key, name, label, count, options: [{ id, name, text }], picked, rest }.
  function choices(s) {
    return active(s)
      .filter(e => e.spec.choice && !e.base && !e.opt)
      .map(e => {
        const c = e.spec.choice,
          opts = optionsOf(e);
        return {
          key: e.key,
          name: label(e),
          label: c.label || 'Elegí',
          count: Math.max(1, val(c.count || 1, e.x)),
          options: Object.entries(opts)
            .filter(([, o]) => !o.lv || e.x.l >= o.lv)
            .map(([id, o]) => ({ id, name: o.name, text: o.text || '' })),
          picked: picked(s, e.key).filter(id => opts[id]),
          rest: c.rest || '',
        };
      });
  }
  const pending = s => choices(s).filter(c => c.picked.length < Math.min(c.count, c.options.length));
  function setChoice(s, key, ids) {
    const c = choices(s).find(x => x.key === key);
    if (!c) throw Error('Esa elección no está disponible.');
    ids = [...new Set(ids)];
    if (ids.length > c.count) throw Error(`Elegí como máximo ${c.count}.`);
    if (ids.some(id => !c.options.some(o => o.id === id))) throw Error('Opción inválida.');
    const next = { ...(s.subclassChoices || {}) };
    if (ids.length) next[key] = ids;
    else delete next[key];
    if (Object.keys(next).length) s.subclassChoices = next;
    else delete s.subclassChoices;
  }
  // Arma elegida que usa CAR (Guerrero maleficio).
  const weaponAbility = (s, itemId) =>
    active(s).some(e => e.spec.chaWeapon && e.spec.chaWeapon === itemId) ? 'cha' : '';
  // Lo que queda de un recurso (para los daños extra que cuestan un dado de superioridad, ki…).
  function left(s, res) {
    if (res === 'inspiration')
      return s.inspirationSpent === null ? 0 : root.Rules.stats(s).inspirationMax - s.inspirationSpent;
    const r = root.Classes.resources(s).find(x => x.id === res);
    const used = r && root.Classes.spent(s, r);
    return r && used !== null ? r.max - used : 0;
  }
  function pay(s, res, n = 1) {
    if (left(s, res) < n) throw Error('No alcanza el recurso.');
    if (res === 'inspiration') s.inspirationSpent += n;
    else root.Classes.spend(s, res, n);
  }

  // ---------- Estados con duración ----------
  // s.subclassStates: { [clave del rasgo]: { until } }. `until` es el turno propio en que termina (null: hasta
  // que lo termines o descanses). Un minuto son 10 turnos tuyos.
  const DUR = { turn: 1, minute: 10, '10min': 100, hour: 600 };
  const isOn = (s, key) => Boolean(s.subclassStates?.[key]);
  // Estados de un rasgo: el único (`state`, clave del rasgo) o varios (`states`, clave «rasgo/nombre»).
  const stateDefs = e => [
    ...(e.spec.state ? [[e.key, e.spec.state]] : []),
    ...Object.entries(e.spec.states || {}).map(([k, d]) => [e.key + '/' + k, d]),
  ];
  function states(s) {
    const t = turn(s);
    return active(s)
      .filter(e => e.base)
      .map(e => {
        const st = s.subclassStates[e.base];
        return {
          key: e.base,
          name: e.name,
          text: e.def.text || '',
          left: st.until !== null && t !== null ? Math.max(0, st.until - t) : null,
        };
      });
  }
  // Rasgos que se activan sin gastar nada (Alas de dragón): botón «Activar» en la tarjeta de estados.
  const toggles = s =>
    active(s)
      .filter(e => !e.base && e.spec.state && !e.spec.use && !isOn(s, e.key))
      .map(e => ({ key: e.key, name: e.spec.state.name || label(e), text: e.spec.state.text || '' }));
  function startState(s, key) {
    const def = active(s)
      .filter(e => !e.base)
      .flatMap(stateDefs)
      .find(([k]) => k === key)?.[1];
    if (!def) throw Error('Ese rasgo no se puede activar ahora.');
    const d = DUR[def.dur] || null,
      t = turn(s);
    s.subclassStates = { ...(s.subclassStates || {}), [key]: { until: d && t !== null ? t + d : null } };
  }
  function endState(s, key) {
    if (!s.subclassStates?.[key]) return;
    const next = { ...s.subclassStates };
    delete next[key];
    if (Object.keys(next).length) s.subclassStates = next;
    else delete s.subclassStates;
  }
  // Al empezar un turno propio terminan los estados vencidos. Devuelve sus nombres.
  function expire(s) {
    const t = turn(s),
      gone = [];
    if (t === null || !s.subclassStates) return gone;
    for (const [key, st] of Object.entries(s.subclassStates))
      if (st.until !== null && t >= st.until) {
        gone.push(names()[key] || key.split(':').slice(1).join(':'));
        endState(s, key);
      }
    return gone;
  }
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
      const get = k => [].concat((typeof sp[k] === 'function' ? sp[k](e.x) : sp[k]) || []);
      for (const t of get('resist')) out.resist.push([t, why]);
      for (const t of get('immune')) out.immune.push([t, why]);
      for (const c of get('conditions')) if (!out.conditions.includes(c)) out.conditions.push(c);
      if (sp.resistIf) out.conditional.push({ ...sp.resistIf, why: sp.resistIf.why || why });
      if (sp.advSave) out.advSaves.push([sp.advSave, why]);
    }
    return out;
  }
  // Crítico de los ataques con arma: el menor número que lo consigue (20 sin rasgos).
  const crit = s => Math.min(20, ...active(s).map(e => e.spec.crit || 20));
  const attacks = s => Math.max(1, ...active(s).map(e => val(e.spec.attacks, e.x) || 1));
  const noStrength = s => active(s).some(e => e.spec.noStrength);
  const magicAbility = s => active(s).find(e => e.spec.magicAbility)?.spec.magicAbility || '';
  // Velocidades especiales (vuelo, nado) que la ficha muestra junto a la de caminar.
  function speeds(s, walk) {
    const out = [];
    for (const e of active(s)) {
      const fly = e.spec.fly === 'walk' ? walk : val(e.spec.fly, e.x);
      if (fly)
        out.push({
          kind: 'fly',
          value: fly,
          why: label(e) + (e.spec.flyNote ? ', ' + e.spec.flyNote : ''),
        });
      const swim = val(e.spec.swim, e.x);
      if (swim) out.push({ kind: 'swim', value: swim, why: label(e) });
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
          label: (typeof r.label === 'function' ? r.label(e.x) : r.label) || label(e),
          once: !!r.once,
          available: (!r.once || !onceUsed(s, e.key)) && (!r.cost || left(s, r.cost.res) >= (r.cost.n || 1)),
          checked: r.checked !== false && !r.cost,
          cost: r.cost ? { ...r.cost, label: costLabel(r.cost), left: left(s, r.cost.res) } : null,
        };
      });
  }
  const COST = {
    superiority: 'dado de superioridad',
    ki: 'ki',
    inspiration: 'Inspiración bárdica',
    channel: 'Canalizar divinidad',
    sorcery: 'punto de hechicería',
  };
  const costLabel = c => (c.n > 1 ? c.n + ' ' : '') + (COST[c.res] || c.name || 'uso');
  // Bonos a la tirada de ataque con arma (Arma sagrada).
  const hitMods = s => parts(s, 'hit');
  // Característica para los golpes sin armas (Brazos del yo astral: SAB si es mejor).
  const unarmedAbility = s => active(s).find(e => e.spec.unarmedAbility)?.spec.unarmedAbility || '';
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
      if (b.when && !b.when(e.x)) continue;
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
      if (got.temp !== undefined) {
        const roll = got.dice ? rnd(Number(got.dice.slice(1))) : 0,
          temp = roll + got.temp;
        if (temp > (s.temp || 0)) {
          s.temp = temp;
          notes.push(`${got.why}: ${temp} PG temporales`);
        }
        continue;
      }
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
  const turnStart = (s, rnd) => {
    const gone = expire(s);
    return [...(gone.length ? ['Terminó: ' + gone.join(', ')] : []), ...tick(s, 'turnStart', rnd)];
  };
  const turnEnd = (s, rnd) => tick(s, 'turnEnd', rnd);

  // ---------- Usos, reservas y lanzamientos ----------
  const slug = t =>
    String(t)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  const uses = e => [].concat(e.spec.use || []);
  const useId = (e, u) => 'sfx:' + (u.id ? e.sub.id + '-' + u.id : slug(e.key));
  // Recurso que gasta un uso compartido: 'channel', 'ki', 'sorcery'… o la reserva psiónica de la subclase.
  const sharedId = (e, u) => (u.shared === 'psi' ? 'sfx:' + e.sub.id + '-psi' : u.shared);
  // Todos los usos vigentes: { id, e, u, x, name, own (tiene contador propio) }.
  function allUses(s) {
    const out = [];
    for (const e of active(s))
      for (const u of uses(e)) {
        const own = !u.shared && !u.free;
        out.push({ id: useId(e, u), e, u, x: e.x, own, name: u.name || label(e) });
      }
    return out;
  }
  // Recursos con contador propio: aparecen en Recursos y se recuperan solos con su descanso.
  function resources(s) {
    return allUses(s)
      .filter(r => r.own)
      .map(r => ({
        id: r.id,
        name: r.name,
        max: Math.max(1, val(r.u.max, r.x)),
        reset: r.u.reset || 'long',
        text: r.u.text,
        action: r.u.action || 'manual',
        fx: true,
      }));
  }
  // Rasgos sin contador propio (gastan Canalizar divinidad, ki, puntos…, o no tienen límite).
  const actions = s => allUses(s).filter(r => !r.own);
  const find = (s, id) => allUses(s).find(r => r.id === id) || null;
  // CD de un rasgo: 8 + competencia + modificador (o tu CD de conjuros, o la de ki).
  function dc(r) {
    const sv = r.u.save;
    if (!sv?.dc) return null;
    if (sv.dc === 'spell') return root.Rules.stats(r.x.v).dc;
    const a = sv.dc === 'ki' ? 'wis' : sv.dc === 'dex' ? (r.x.m.dex >= r.x.m.str ? 'dex' : 'str') : sv.dc;
    return 8 + r.x.pb + r.x.m[a];
  }
  // Lanzamientos de la subclase en formato de additionalSpells (los lee Grants como los de cualquier rasgo).
  function grantBlocks(s, v) {
    const out = [];
    for (const e of active(s))
      if (e.x.v.classId === v.classId && e.spec.cast) {
        const c = e.spec.cast,
          lv = String(Math.max(e.spec.lv || 1, c.minLevel || 0));
        let body;
        if (c.will) body = { will: c.spells };
        else if (c.cost) body = { resource: { [c.cost.n]: c.spells } };
        else
          body = {
            [c.reset === 'short' ? 'rest' : 'daily']: {
              [Math.max(1, val(c.max, e.x)) + (c.each ? 'e' : '')]:
                c.spells.length > 1 && !c.each ? { shared: c.spells } : c.spells,
            },
          };
        out.push({
          name: label(e),
          replaces: c.spells,
          ...(c.ability ? { ability: c.ability } : {}),
          ...(c.cost ? { resourceName: c.cost.res } : {}),
          innate: { [lv]: body },
        });
      }
    return out;
  }

  // ---------- Al tirar iniciativa ----------
  // Recupera un uso de lo que esté en 0 (Implacable, Espíritu incansable…) y devuelve los avisos.
  function onInitiative(s) {
    const notes = [];
    for (const e of active(s)) {
      const o = e.spec.onInit;
      if (!o) continue;
      if (o.note) notes.push(o.note);
      if (o.restore && root.Classes.resources(s).some(r => r.id === o.restore) && left(s, o.restore) === 0) {
        s.classSpent = { ...(s.classSpent || {}), [o.restore]: Math.max(0, (s.classSpent?.[o.restore] || 0) - 1) };
        notes.push(label(e) + ': recuperás un uso.');
      }
    }
    return notes;
  }

  // ---------- Compañeros de subclase ----------
  // companion: { name, cost, via, beast, build(x, monstruo) → { ac, maxHp, speed, attacks, notes }, variants }.
  // Las estadísticas se calculan con tu nivel; «Actualizar» las rehace al subir de nivel.
  function companionDefs(s) {
    const out = [];
    for (const e of active(s)) {
      const c = e.spec.companion;
      if (!c || e.opt) continue;
      const base = { key: e.key, e, x: e.x, cost: c.cost || null, via: c.via || '', beast: c.beast || null };
      if (c.variants)
        for (const [v, d] of Object.entries(c.variants))
          out.push({
            ...base,
            id: e.key + '/' + v,
            name: typeof d.name === 'function' ? d.name(e.x) : d.name,
            build: d.build || c.build,
            variant: v,
          });
      else out.push({ ...base, id: e.key, name: c.name, build: c.build });
    }
    return out;
  }
  // Datos del compañero listos para guardar en s.companions.
  function makeCompanion(s, id, monster = null, prev = null) {
    const d = companionDefs(s).find(x => x.id === id);
    if (!d) throw Error('Ese compañero no está disponible en tu nivel.');
    if (d.beast && !monster) throw Error('Elegí la bestia.');
    const b = d.build({ ...d.x, variant: d.variant }, monster),
      maxHp = Math.max(1, Math.min(9999, Math.floor(b.maxHp))),
      hp = prev ? Math.max(0, Math.min(maxHp, prev.hp + Math.max(0, maxHp - prev.maxHp))) : maxHp;
    return {
      id: prev?.id || root.Companions.uid(),
      kind: 'class',
      name: String(b.name || d.name).slice(0, 100),
      ...(monster || prev?.monsterId ? { monsterId: monster?.id || prev.monsterId } : {}),
      ac: Math.max(0, Math.min(40, b.ac)),
      maxHp,
      hp,
      speed: String(b.speed || '').slice(0, 100),
      attacks: (b.attacks || []).slice(0, 6).map(a => ({
        name: String(a.name).slice(0, 60),
        bonus: Math.max(-10, Math.min(30, a.bonus)),
        damage: String(a.damage).slice(0, 60),
      })),
      notes: String(b.notes || '').slice(0, 2000),
      sfx: id,
    };
  }
  // ¿Cambiaron sus estadísticas desde que lo creaste (subiste de nivel, cambió tu característica)?
  function staleCompanion(s, c) {
    if (!c.sfx || !companionDefs(s).some(d => d.id === c.sfx)) return false;
    const monster = c.monsterId ? root.MonsterData?.find(m => m.id === c.monsterId) : null;
    if (companionDefs(s).find(d => d.id === c.sfx).beast && !monster) return false;
    const fresh = makeCompanion(s, c.sfx, monster, c);
    return (
      ['ac', 'maxHp', 'speed', 'notes'].some(k => fresh[k] !== c[k]) ||
      JSON.stringify(fresh.attacks) !== JSON.stringify(c.attacks)
    );
  }
  function syncCompanion(s, cid) {
    const i = (s.companions || []).findIndex(c => c.id === cid);
    if (i < 0) throw Error('Ese compañero ya no está.');
    const c = s.companions[i],
      monster = c.monsterId ? root.MonsterData?.find(m => m.id === c.monsterId) : null;
    const next = makeCompanion(s, c.sfx, monster, c);
    s.companions = s.companions.map((x, j) => (j === i ? next : x));
    return next;
  }

  // ---------- Lo que se ve en la ficha ----------
  // Qué hace sola la ficha y qué queda para la mesa, por rasgo vigente.
  function report(s) {
    const seen = new Set();
    return active(s)
      .filter(e => !e.base && !e.opt && !seen.has(e.key) && seen.add(e.key))
      .map(e => {
        const c = e.spec.choice && choices(s).find(x => x.key === e.key),
          chosen =
            c && c.picked.length
              ? ' Elegido: ' + c.picked.map(id => c.options.find(o => o.id === id)?.name).join(', ') + '.'
              : '';
        return { key: e.key, name: label(e), auto: (e.spec.auto || usesText(e)) + chosen, table: e.spec.table || '' };
      });
  }
  const SHARED = {
    channel: 'Canalizar divinidad',
    ki: 'ki',
    sorcery: 'puntos de hechicería',
    inspiration: 'Inspiración bárdica',
    psi: 'dados psiónicos',
  };
  // Qué hace la ficha con los usos del rasgo, si los datos no lo dicen.
  function usesText(e) {
    const bits = uses(e).map(u => {
      const roll = u.roll
          ? ' y tira ' +
            ({ heal: 'la curación', temp: 'los PG temporales', damage: 'el daño' }[u.roll.kind] || 'los dados')
          : '',
        dc = u.save?.dc ? ', con tu CD' : '';
      if (u.shared) return `Botón «Usar» en combate y Recursos: gasta ${SHARED[u.shared] || u.shared}${roll}${dc}.`;
      if (u.free) return `Botón «Usar» en combate y Recursos${roll}${dc}.`;
      const max = Math.max(1, val(u.max, e.x));
      return `${u.pool ? 'Reserva de ' + max + ' dados' : max + ' uso' + (max > 1 ? 's' : '')} en Recursos (vuelve${max > 1 ? 'n' : ''} con descanso ${u.reset === 'short' ? 'corto o largo' : 'largo'})${roll}${dc}.`;
    });
    if (e.spec.cast) bits.push('Lanzamientos gratuitos en tus conjuros.');
    return bits.join(' ');
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
    const keys = new Set(rows.map(r => r.key)),
      acts = choices(s)
        .filter(c => keys.has(c.key))
        .map(c => [
          (c.picked.length ? 'Cambiar: ' : 'Elegir: ') +
            c.name +
            (c.count > 1 ? ` (${c.picked.length}/${c.count})` : ''),
          'sfx-choose',
          `data-key="${c.key.replace(/"/g, '&quot;')}"`,
        ]);
    const text = rows
      .map(
        r =>
          (rows.length > 1 || r.name !== en ? r.name + ': ' : '') +
          [r.auto, r.table && 'En la mesa: ' + r.table].filter(Boolean).join(' '),
      )
      .join(' · ');
    return { note: 'En la ficha: ' + text, ...(acts.length ? { actions: acts } : {}) };
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
    resources,
    actions,
    states,
    toggles,
    startState,
    endState,
    isOn,
    hitMods,
    unarmedAbility,
    onInitiative,
    companionDefs,
    makeCompanion,
    staleCompanion,
    syncCompanion,
    choices,
    pending,
    setChoice,
    weaponAbility,
    left,
    pay,
    find,
    dc,
    sharedId,
    grantBlocks,
    keys,
    heavy,
  };
  if (typeof module !== 'undefined') module.exports = root.SubclassFX;
})(typeof window !== 'undefined' ? window : globalThis);
