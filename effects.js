/* Efectos con duración (Bendición 1 minuto, Hechizado 10 rondas…): cuentan rondas y terminan solos. */
(function (root) {
  'use strict';
  const UNITS = {
    asalto: 1,
    asaltos: 1,
    ronda: 1,
    rondas: 1,
    minuto: 10,
    minutos: 10,
    hora: 600,
    horas: 600,
    día: 14400,
    días: 14400,
  };

  // «Concentración, hasta 1 minuto» → 10 rondas. null = sin duración fija; 0 = instantáneo.
  function roundsFrom(duration) {
    const text = String(duration || '').toLowerCase();
    if (/instant/.test(text)) return 0;
    const m = /(\d+)\s*(asaltos?|rondas?|minutos?|horas?|días?)/.exec(text);
    return m ? Number(m[1]) * UNITS[m[2]] : null;
  }
  function list(s) {
    return Array.isArray(s.timedEffects) ? s.timedEffects : [];
  }
  // `link` identifica un efecto lanzado por otro (personaje:conjuro): relanzarlo lo reemplaza.
  function add(s, { name, rounds = null, concentration = null, from = 'self', link = null, casting = null }) {
    const id = 'fx-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    s.timedEffects = [
      ...list(s).filter(x => !(concentration && x.concentration === concentration) && !(link && x.link === link)),
      {
        id,
        name: String(name).slice(0, 100),
        rounds,
        concentration,
        from,
        ...(link ? { link: String(link).slice(0, 120) } : {}),
        ...(casting ? { casting: structuredClone(casting) } : {}),
      },
    ].slice(-30);
  }
  // Al lanzar un conjuro con duración se anota su efecto, ligado a la concentración si corresponde.
  function fromSpell(s, sp, opts = {}) {
    const rounds = roundsFrom(sp.duration);
    if (rounds === 0 || rounds === 1) return;
    if (!sp.concentration && rounds === null) return;
    add(s, {
      name: sp.name,
      rounds,
      concentration: sp.concentration ? sp.id : null,
      ...(sp.id === 'heat-metal'
        ? {
            casting: {
              spellId: sp.id,
              slot: opts.slot || sp.level,
              ability: sp.castAbility || root.Classes.casting(root.Classes.spellCaster(s, sp.id)).ability,
              turn: root.Combat.data(s).active ? root.Combat.data(s).turn : null,
              object: String(opts.object || '').slice(0, 150),
            },
          }
        : {}),
    });
  }
  function repeatInfo(s) {
    if (s.concentration !== 'heat-metal') return null;
    const effect = list(s).find(x => x.from === 'self' && x.concentration === 'heat-metal' && x.rounds !== 0),
      sp = root.Rules.allSpells(s).find(sp => sp.id === 'heat-metal');
    if (!effect || !sp) return null;
    return {
      effect,
      sp,
      slot: effect.casting?.slot || null,
      ability: effect.casting?.ability || root.Classes.casting(root.Classes.spellCaster(s, sp.id)).ability,
      object: effect.casting?.object || '',
    };
  }
  function repeatBlock(s) {
    const info = repeatInfo(s);
    if (!info) return 'Calentar metal ya no está activo.';
    const blocked = root.Combat.blocked(s, 'bonus');
    if (blocked) return blocked;
    const c = root.Combat.data(s);
    if (c.active && info.effect.casting?.turn === c.turn) return 'Podés repetir el daño desde tu siguiente turno.';
    return '';
  }
  function repeat(s, legacySlot) {
    const reason = repeatBlock(s);
    if (reason) throw Error(reason);
    const info = repeatInfo(s),
      slot = info.slot || legacySlot;
    if (!Number.isInteger(slot) || slot < 2 || slot > 9) throw Error('Confirmá el nivel original de Calentar metal.');
    if (!info.slot)
      info.effect.casting = { spellId: info.sp.id, slot, ability: info.ability, turn: null, object: info.object };
    root.Combat.use(s, 'bonus', 'Calentar metal · repetir daño');
    return { sp: { ...info.sp, castAbility: info.ability }, slot, object: info.object };
  }
  // Al empezar tu turno pasa una ronda. Devuelve los nombres de los efectos que terminaron.
  function tick(s) {
    const ended = [];
    s.timedEffects = list(s).filter(x => {
      if (x.rounds === null) return true;
      x.rounds--;
      if (x.rounds > 0) return true;
      ended.push(x.name);
      if (x.concentration && x.concentration === s.concentration) {
        s.concentration = null;
        if (root.Combat) root.Combat.data(s).checks = [];
      }
      return false;
    });
    return ended;
  }
  // Los efectos de concentración terminan cuando termina (o cambia) la concentración.
  function sync(s) {
    if (!list(s).length) return;
    s.timedEffects = list(s).filter(x => !x.concentration || x.concentration === s.concentration);
  }
  function remaining(x) {
    if (x.rounds === null) return 'sin duración fija';
    if (x.rounds >= 600) return '≈ ' + Math.round(x.rounds / 600) + ' h';
    if (x.rounds >= 10) return x.rounds + ' rondas (≈ ' + Math.ceil(x.rounds / 10) + ' min)';
    return x.rounds + (x.rounds === 1 ? ' ronda' : ' rondas');
  }
  function valid(s) {
    const xs = s.timedEffects;
    return (
      xs === undefined ||
      (Array.isArray(xs) &&
        xs.length <= 30 &&
        xs.every(
          x =>
            x &&
            typeof x.id === 'string' &&
            x.id.length <= 60 &&
            typeof x.name === 'string' &&
            x.name.length <= 100 &&
            (x.rounds === null || (Number.isInteger(x.rounds) && x.rounds >= 0 && x.rounds <= 100000)) &&
            (x.concentration === null || typeof x.concentration === 'string') &&
            (x.link === undefined || (typeof x.link === 'string' && x.link.length <= 120)) &&
            ['self', 'dm'].includes(x.from) &&
            (x.casting === undefined ||
              (x.casting &&
                x.casting.spellId === 'heat-metal' &&
                Number.isInteger(x.casting.slot) &&
                x.casting.slot >= 2 &&
                x.casting.slot <= 9 &&
                ['str', 'dex', 'con', 'int', 'wis', 'cha'].includes(x.casting.ability) &&
                (x.casting.turn === null || (Number.isInteger(x.casting.turn) && x.casting.turn >= 0)) &&
                typeof x.casting.object === 'string' &&
                x.casting.object.length <= 150)),
        ))
    );
  }
  root.Effects = { roundsFrom, list, add, fromSpell, repeatInfo, repeatBlock, repeat, tick, sync, remaining, valid };
  if (typeof module !== 'undefined') module.exports = root.Effects;
})(typeof window !== 'undefined' ? window : globalThis);
