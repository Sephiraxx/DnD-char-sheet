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
  // Las dos reservas pueden pagar conjuros de cualquiera de las clases.
  function availableSlots(s, sp) {
    if (root.Grants && !root.Grants.slotAllowed(s, sp)) return [];
    const d = root.Rules.stats(s);
    // Espacios creados con Fuente de magia (por encima del máximo hasta el descanso largo).
    const font = Array.isArray(s.fontSlots) ? s.fontSlots : [];
    const out = Array.from({ length: 9 }, (_, i) => {
      const max = d.slots[i] || 0,
        normal = s.slotsSpent[i] !== null && s.slotsSpent[i] < max ? max - s.slotsSpent[i] : 0,
        left = normal + (font[i] || 0);
      return i + 1 >= sp.level && left > 0 ? [{ value: i + 1, level: i + 1, left }] : [];
    }).flat();
    const used = s.pactSpent === undefined ? 0 : s.pactSpent;
    if (d.pact && d.pact.level >= sp.level && used !== null && used < d.pact.max)
      out.push({ value: 'pact', level: d.pact.level, left: d.pact.max - used });
    return out;
  }
  const incapacitated = s =>
    s.hp === 0 ||
    s.conditions.some(x => ['Incapacitado', 'Inconsciente', 'Paralizado', 'Aturdido', 'Petrificado'].includes(x));
  const dead = s => s.hp === 0 && s.death.failure >= 3;
  const stable = s => s.hp === 0 && s.death.success >= 3 && !dead(s);
  function endConcentration(s) {
    s.concentration = null;
    delete s.ritualCasting;
    data(s).checks = [];
    root.Effects?.sync(s);
  }
  function condition(s, name, on) {
    s.conditions = s.conditions.filter(x => x !== name);
    if (on) s.conditions.push(name);
    if (incapacitated(s)) endConcentration(s);
  }
  function takeDamage(s, amount, critical = false) {
    const before = s.hp;
    const result = root.Companions.absorb(s, amount);
    s.hp = Math.max(0, before - result.toCharacter);
    if (s.hp === 0) {
      condition(s, 'Inconsciente', true);
      condition(s, 'Derribado', true);
      const max = root.Rules.stats(s).maxHP;
      if (!dead(s) && result.toCharacter > 0) {
        if (result.toCharacter - before >= max) s.death = { success: 0, failure: 3 };
        else if (before === 0) {
          if (stable(s)) s.death = { success: 0, failure: 0 };
          s.death.failure = Math.min(3, s.death.failure + (critical ? 2 : 1));
        }
      }
    } else if (s.concentration) data(s).checks.push(Math.min(5000, Math.max(10, Math.floor(amount / 2))));
    return result;
  }
  function deathSave(s, natural, total = natural) {
    if (s.hp !== 0 || dead(s) || stable(s)) throw Error('No corresponde una salvación de muerte.');
    if (natural === 20) {
      root.Companions.heal(s, 1);
      return '¡20 natural! Recuperás 1 PG y volvés en ti.';
    }
    if (natural !== 1 && total >= 10) {
      s.death.success++;
      if (stable(s)) {
        s.death.failure = 0;
        return 'Tres éxitos: estás estable.';
      }
      return 'Éxito (' + s.death.success + '/3).';
    }
    s.death.failure = Math.min(3, s.death.failure + (natural === 1 ? 2 : 1));
    return dead(s) ? 'Tres fallos: tu personaje muere. Avisale al DM.' : 'Fallo (' + s.death.failure + '/3).';
  }
  function blocked(s, k) {
    const c = data(s);
    if (incapacitated(s)) return 'No podés actuar mientras estés incapacitado o a 0 PG.';
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
    if (incapacitated(s)) return 'No podés lanzar conjuros mientras estés incapacitado o a 0 PG.';
    const c = data(s),
      k = kind(sp),
      reason = blocked(s, k);
    const special = specialCast(s, sp);
    const grant = root.Grants?.castingGrant(s, sp);
    if (!ritual && grant?.slotRequired && !invocationSlots(s, sp).length)
      return 'Esta invocación necesita un espacio de brujo disponible.';
    if (special?.startsWith('arcanum')) {
      const res = root.Classes.resources(s).find(r => r.id === special);
      if (!res || root.Classes.spent(s, res) === null || root.Classes.spent(s, res) >= res.max)
        return 'Arcanum sin usos disponibles confirmados.';
    }
    if (reason) return reason;
    if (c.active && (ritual || k === 'special'))
      return 'Este lanzamiento necesita más tiempo. Resolvelo fuera del seguimiento de turnos.';
    if (!ritual && sp.level && !specialCast(s, sp)) {
      if (!availableSlots(s, sp).length) return 'No quedan espacios compatibles confirmados. Revisá tus recursos.';
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
    if (level) return 'arcanum' + level;
    const grant = root.Grants?.castingGrant(s, sp);
    if (grant)
      return (
        grant.freeResource || (grant.costResource ? 'grant-cost:' + grant.sourceKey : 'grant-will:' + grant.sourceKey)
      );
    const feat = root.FeatFX?.spellGrant(s, sp.id),
      resource = feat?.freeResource && root.Classes.resources(s).find(r => r.id === feat.freeResource);
    return resource && root.Classes.spent(s, resource) !== null && root.Classes.spent(s, resource) < resource.max
      ? resource.id
      : null;
  }
  function invocationSlots(s, sp) {
    const d = root.Rules.stats(s);
    const available = availableSlots(s, sp);
    // These invocations explicitly require a warlock spell slot.
    return available.filter(x => (d.pact ? x.value === 'pact' : s.classId === 'warlock'));
  }
  function cast(s, sp, slot, ritual = false) {
    const reason = spellBlock(s, sp, ritual);
    if (reason) throw Error(reason);
    const c = data(s),
      k = kind(sp),
      special = specialCast(s, sp),
      grant = root.Grants?.castingGrant(s, sp),
      payment =
        (special?.startsWith('feat-') || special?.startsWith('grant')) &&
        !grant?.slotRequired &&
        (slot === 'pact' || (Number.isInteger(slot) && slot >= sp.level))
          ? null
          : special;
    if (!ritual && grant?.ritualOnly && !root.Grants.normalSpell(s, sp))
      throw Error('Este rasgo solo permite lanzarlo como ritual.');
    if (!ritual && grant?.slotRequired && !invocationSlots(s, sp).some(x => x.value === slot))
      throw Error('Elegí un espacio de brujo válido para la invocación.');
    if (sp.level && !ritual && !payment) {
      if (!availableSlots(s, sp).some(x => x.value === slot)) throw Error('No queda un espacio válido de ese nivel.');
    }
    if (!ritual && k !== 'special') use(s, k, sp.name);
    if (!ritual && sp.level) {
      if (payment?.startsWith('arcanum') || payment?.startsWith('feat-') || payment?.startsWith('grant:'))
        root.Classes.spend(s, payment, 1);
      if (payment?.startsWith('grant-cost:')) root.Classes.spend(s, grant.costResource, grant.cost);
      if (!payment || grant?.slotRequired) {
        if (slot === 'pact') s.pactSpent = (s.pactSpent ?? 0) + 1;
        else if (Array.isArray(s.fontSlots) && s.fontSlots[slot - 1] > 0) {
          s.fontSlots = s.fontSlots.slice();
          s.fontSlots[slot - 1]--;
        } else s.slotsSpent[slot - 1]++;
      }
    }
    if (c.active && c.onTurn && !ritual) c.spells.push({ kind: k, level: sp.level });
    if (sp.concentration || ritual) {
      endConcentration(s);
      s.concentration = sp.id;
      if (ritual) s.ritualCasting = sp.id;
    }
  }
  function completeRitual(s) {
    const id = s.ritualCasting;
    if (!id || s.concentration !== id || incapacitated(s)) throw Error('No hay un ritual en curso.');
    const spell = root.Rules.allSpells(s).find(sp => sp.id === id && sp.ritual);
    if (!spell) throw Error('No se encontró el conjuro del ritual.');
    endConcentration(s);
    if (spell.concentration) s.concentration = id;
    root.Effects.fromSpell(s, spell);
    return spell;
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
    c.rolled = {};
    c.extraRolls = 0;
    // Rasgos que actúan al empezar el turno (Superviviente): devuelve qué pasó para avisarlo.
    return root.SubclassFX?.turnStart(s) || [];
  }
  // Tiradas hechas con la página durante el combate: cada una vale una vez por turno (los ataques de
  // la acción, tantas como ataques tenga). Para repetir, el DM habilita otra tirada (extraRolls).
  // Fuera del seguimiento de turnos no hay límite.
  function rollsLeft(s, key, max = 1) {
    const c = data(s);
    if (!c.active) return Infinity;
    return Math.max(0, max - ((c.rolled || {})[key] || 0)) + (c.extraRolls || 0);
  }
  function takeRoll(s, key, max = 1) {
    const c = data(s);
    if (!c.active) return;
    const used = (c.rolled || {})[key] || 0;
    if (used < max) c.rolled = { ...(c.rolled || {}), [key]: used + 1 };
    else if ((c.extraRolls || 0) > 0) c.extraRolls--;
    else throw Error('Ya hiciste esa tirada en este turno. Si hay que repetirla, pedile al DM que te habilite otra.');
  }
  // Al terminar el propio turno en combate actúan rasgos como Espíritu protector.
  function end(s) {
    const was = data(s).active && data(s).onTurn;
    data(s).onTurn = false;
    data(s).spells = [];
    return was ? root.SubclassFX?.turnEnd(s) || [] : [];
  }
  function finish(s) {
    const c = data(s);
    c.active = false;
    c.onTurn = false;
    c.action = null;
    c.bonus = null;
    c.spells = [];
    c.effects = c.effects.filter(x => !['unsettling', 'ready'].includes(x.kind));
    c.rolled = {};
    c.extraRolls = 0;
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
  const api = {
    fresh,
    dead,
    stable,
    condition,
    endConcentration,
    takeDamage,
    deathSave,
    completeRitual,
    data,
    rollsLeft,
    takeRoll,
    kind,
    availableSlots,
    invocationSlots,
    blocked,
    specialCast,
    spellBlock,
    use,
    cast,
    start,
    end,
    finish,
    inspiration,
  };
  root.Combat = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
