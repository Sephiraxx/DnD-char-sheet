/* Reglas de turno de 2014. No resuelve impactos, salvaciones ni efectos del DM. */
(function (root) {
  'use strict';
  const fresh = () => ({
    active: false,
    onTurn: false,
    turn: 0,
    action: null,
    bonus: null,
    spells: [],
    effects: [],
    checks: [],
  });
  const data = s => s.combatState || (s.combatState = fresh());
  const kind = sp => ({ Acción: 'action', Adicional: 'bonus', Reacción: 'reaction' })[sp.time] || 'special';
  function blocked(s, k) {
    const c = data(s);
    if (
      s.hp === 0 ||
      s.conditions.some(x => ['Incapacitado', 'Inconsciente', 'Paralizado', 'Aturdido', 'Petrificado'].includes(x))
    )
      return 'No podés actuar mientras estés incapacitado o a 0 PG.';
    if (k === 'reaction') return s.reactionUsed ? 'Ya gastaste la reacción. Vuelve al inicio de tu próximo turno.' : '';
    if (c.active) {
      if (!c.onTurn) return 'Esperá tu turno y tocá «Mi turno». La reacción sí puede usarse en turnos ajenos.';
      if (c[k]) return 'Ya usaste tu ' + (k === 'bonus' ? 'acción adicional' : 'acción') + ': ' + c[k] + '.';
    }
    return '';
  }
  function spellBlock(s, sp, ritual = false) {
    if (!sp) return 'Conjuro no encontrado.';
    if (root.Classes) {
      if (ritual ? !root.Classes.ritualAllowed(s, sp) : !root.Classes.usable(s).includes(sp.id))
        return 'Este conjuro no está preparado o disponible para este lanzamiento.';
      if (s.raging) return 'No podés lanzar conjuros mientras estás en rabia.';
      if (s.wildShape && !(s.classId === 'druid' && s.level >= 18))
        return 'En forma salvaje no podés lanzar conjuros (salvo con Conjuros bestiales, nivel 18).';
    } else if (![...s.known, ...s.extras].includes(sp.id)) return 'Este conjuro no está en tu repertorio.';
    const c = data(s),
      k = kind(sp),
      reason = blocked(s, k);
    const special = specialCast(s, sp);
    if (special?.startsWith('arcanum')) {
      const res = root.Classes.resources(s).find(r => r.id === special);
      if (!res || root.Classes.spent(s, res) === null || root.Classes.spent(s, res) >= res.max)
        return 'Arcanum sin usos disponibles confirmados.';
    }
    if (reason) return reason;
    if (c.active && (ritual || k === 'special'))
      return 'Este lanzamiento necesita más tiempo. Resolvelo fuera del seguimiento de turnos.';
    if (!ritual && sp.level && !specialCast(s, sp)) {
      const slots = root.Rules.stats(s).slots;
      if (!slots.some((n, i) => i + 1 >= sp.level && s.slotsSpent[i] !== null && s.slotsSpent[i] < n))
        return 'No quedan espacios compatibles confirmados. Revisá tus recursos.';
    }
    if (c.active && c.onTurn && !ritual) {
      if (k === 'bonus' && c.spells.some(x => !(x.kind === 'action' && x.level === 0)))
        return 'Ya lanzaste otro conjuro que impide lanzar uno de acción adicional en este turno (reglas de 2014).';
      if (k !== 'bonus' && c.spells.some(x => x.kind === 'bonus') && !(k === 'action' && sp.level === 0))
        return 'Tras un conjuro de acción adicional, solo podés lanzar otro conjuro si es un truco de una acción en este mismo turno.';
    }
    return '';
  }
  function use(s, k, label) {
    const reason = blocked(s, k);
    if (reason) throw Error(reason);
    const c = data(s);
    if (k === 'reaction') s.reactionUsed = true;
    else if (c.active) c[k] = label;
  }
  function specialCast(s, sp) {
    if (s.extras.includes(sp.id) && s.spellModes?.[sp.id] === 'free') return 'free';
    const level = Object.keys(s.arcanum || {}).find(l => s.arcanum[l] === sp.id);
    return level ? 'arcanum' + level : null;
  }
  function cast(s, sp, slot, ritual = false) {
    const reason = spellBlock(s, sp, ritual);
    if (reason) throw Error(reason);
    const c = data(s),
      k = kind(sp);
    if (sp.level && !ritual && !specialCast(s, sp)) {
      const max = root.Rules.stats(s).slots[slot - 1];
      if (
        !Number.isInteger(slot) ||
        slot < sp.level ||
        !max ||
        s.slotsSpent[slot - 1] === null ||
        s.slotsSpent[slot - 1] >= max
      )
        throw Error('No queda un espacio válido de ese nivel.');
    }
    if (!ritual && k !== 'special') use(s, k, sp.name);
    if (!ritual && sp.level) {
      const special = specialCast(s, sp);
      if (special?.startsWith('arcanum')) root.Classes.spend(s, special, 1);
      else if (!special) s.slotsSpent[slot - 1]++;
    }
    if (c.active && c.onTurn && !ritual) c.spells.push({ kind: k, level: sp.level });
    if (sp.concentration || ritual) {
      s.concentration = sp.id;
      c.checks = [];
    }
  }
  function start(s) {
    const c = data(s);
    c.active = true;
    c.onTurn = true;
    c.turn++;
    c.surgeUsed = false;
    c.action = null;
    c.bonus = null;
    c.spells = [];
    c.effects = c.effects.filter(x => x.kind !== 'unsettling' && x.kind !== 'ready');
    s.reactionUsed = false;
  }
  function end(s) {
    data(s).onTurn = false;
    data(s).spells = [];
  }
  function finish(s) {
    const c = data(s);
    c.active = false;
    c.onTurn = false;
    c.action = null;
    c.bonus = null;
    c.spells = [];
    c.effects = c.effects.filter(x => !['unsettling', 'ready'].includes(x.kind));
  }
  function inspiration(s, k, target, value) {
    const d = root.Rules.stats(s),
      c = data(s);
    if (k === 'unsettling' && (s.level < 3 || s.subclass !== 'eloquence'))
      throw Error('Palabras perturbadoras requiere Elocuencia de nivel 3.');
    if (s.inspirationSpent === null || s.inspirationSpent >= d.inspirationMax)
      throw Error('No quedan usos de Inspiración confirmados.');
    target = String(target).trim();
    if (!target || target.length > 100) throw Error('Indicá un objetivo.');
    if (k === 'inspired' && target.toLowerCase() === s.name.toLowerCase())
      throw Error('No podés darte Inspiración bárdica a vos mismo.');
    if (k === 'inspired' && c.effects.some(x => x.kind === k && x.target.toLowerCase() === target.toLowerCase()))
      throw Error('Ese aliado ya tiene tu dado registrado. Retiralo cuando lo use o expire.');
    if (k === 'unsettling' && (!Number.isInteger(value) || value < 1 || value > d.inspirationDie))
      throw Error('Anotá el resultado del dado de Inspiración.');
    use(s, 'bonus', k === 'inspired' ? 'Inspiración bárdica' : 'Palabras perturbadoras');
    s.inspirationSpent++;
    c.effects.push({
      id: 'effect-' + Date.now() + '-' + c.effects.length,
      kind: k,
      target,
      value: k === 'inspired' ? d.inspirationDie : value,
    });
  }
  const api = { fresh, data, kind, blocked, specialCast, spellBlock, use, cast, start, end, finish, inspiration };
  root.Combat = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
