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
  function add(s, { name, rounds = null, concentration = null, from = 'self' }) {
    const id = 'fx-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    s.timedEffects = [
      ...list(s).filter(x => !(concentration && x.concentration === concentration)),
      { id, name: String(name).slice(0, 100), rounds, concentration, from },
    ].slice(-30);
  }
  // Al lanzar un conjuro con duración se anota su efecto, ligado a la concentración si corresponde.
  function fromSpell(s, sp) {
    const rounds = roundsFrom(sp.duration);
    if (rounds === 0 || rounds === 1) return;
    if (!sp.concentration && rounds === null) return;
    add(s, { name: sp.name, rounds, concentration: sp.concentration ? sp.id : null });
  }
  // Al empezar tu turno pasa una ronda. Devuelve los nombres de los efectos que terminaron.
  function tick(s) {
    const ended = [];
    s.timedEffects = list(s).filter(x => {
      if (x.rounds === null) return true;
      x.rounds--;
      if (x.rounds > 0) return true;
      ended.push(x.name);
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
            ['self', 'dm'].includes(x.from),
        ))
    );
  }
  root.Effects = { roundsFrom, list, add, fromSpell, tick, sync, remaining, valid };
  if (typeof module !== 'undefined') module.exports = root.Effects;
})(typeof window !== 'undefined' ? window : globalThis);
