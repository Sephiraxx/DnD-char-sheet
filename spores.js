/* Druida del Círculo de las Esporas (TCE): Halo de esporas, Entidad simbiótica, Esporas propagadas
   y Cuerpo fúngico. La Entidad simbiótica gasta un uso de Forma salvaje, da 4 PG temporales por nivel
   y dura mientras queden PG temporales (o hasta usar Forma salvaje, descansar o darla por terminada). */
(function (root) {
  'use strict';
  const SUBCLASS = 'druid-circle-of-spores';
  const is = s => s?.classId === 'druid' && s.classSubclass === SUBCLASS && (s.level || 0) >= 2;
  // Dado del Halo de esporas: d4, d6 en nivel 6, d8 en 10 y d10 en 14.
  const haloDie = level => (level >= 14 ? 10 : level >= 10 ? 8 : level >= 6 ? 6 : 4);
  const tempFor = s => 4 * (s.level || 0);
  // Activa mientras queden PG temporales: perderlos todos la termina.
  const active = s => Boolean(is(s) && s.symbiotic && (s.temp || 0) > 0);
  // Las esporas propagadas (nivel 10) existen solo con la entidad activa; mientras estén, no hay Halo.
  const spread = s => active(s) && Boolean(s.symbiotic.spread);

  function start(s) {
    if (!is(s)) throw Error('Entidad simbiótica es del Círculo de las Esporas, desde el nivel 2 de druida.');
    const res = root.Classes.resources(s).find(r => r.id === 'wild-shape');
    if (!res || root.Classes.spent(s, res) === null) throw Error('Confirmá tus usos de Forma salvaje.');
    const blocked = root.Combat.blocked(s, 'action');
    if (blocked) throw Error(blocked);
    if (res.max !== 999) root.Classes.spend(s, res.id, 1);
    root.Combat.use(s, 'action', 'Entidad simbiótica');
    // Los PG temporales no se suman: te quedás con los de la entidad si son más que los que tenías.
    s.temp = Math.max(s.temp || 0, tempFor(s));
    s.symbiotic = { spread: false };
    return s;
  }
  function end(s) {
    delete s.symbiotic;
    return s;
  }
  // Daño del Halo: el dado se tira dos veces con la Entidad simbiótica activa.
  function halo(s, rnd = Math.random) {
    if (!is(s)) throw Error('El Halo de esporas es del Círculo de las Esporas.');
    const die = haloDie(s.level),
      n = active(s) ? 2 : 1,
      rolls = Array.from({ length: n }, () => 1 + Math.floor(rnd() * die));
    return { die, rolls, total: rolls.reduce((a, b) => a + b, 0), dc: root.Rules.stats(s).dc };
  }
  function useHalo(s, rnd) {
    if (spread(s)) throw Error('Mientras existan las Esporas propagadas no podés usar el Halo de esporas.');
    const blocked = root.Combat.blocked(s, 'reaction');
    if (blocked) throw Error(blocked);
    root.Combat.use(s, 'reaction', 'Halo de esporas');
    return halo(s, rnd);
  }
  function startSpread(s) {
    if (!is(s) || s.level < 10) throw Error('Esporas propagadas se obtiene en el nivel 10 de druida.');
    if (!active(s)) throw Error('Necesitás la Entidad simbiótica activa.');
    const blocked = root.Combat.blocked(s, 'bonus');
    if (blocked) throw Error(blocked);
    root.Combat.use(s, 'bonus', 'Esporas propagadas');
    s.symbiotic.spread = true;
    return s;
  }
  const endSpread = s => {
    if (s.symbiotic) s.symbiotic.spread = false;
    return s;
  };
  // 1d6 necrótico extra en los ataques cuerpo a cuerpo con arma mientras la entidad está activa.
  const meleeBonus = s => (active(s) ? { dice: '1d6', label: 'necrótico (Entidad simbiótica)' } : null);
  // Cuerpo fúngico (nivel 14): inmune a estas condiciones.
  const conditionImmune = s => (is(s) && s.level >= 14 ? ['Cegado', 'Ensordecido', 'Asustado', 'Envenenado'] : []);

  const api = {
    SUBCLASS,
    is,
    haloDie,
    tempFor,
    active,
    spread,
    start,
    end,
    halo,
    useHalo,
    startSpread,
    endSpread,
    meleeBonus,
    conditionImmune,
  };
  if (typeof module !== 'undefined') module.exports = api;
  root.Spores = api;
})(typeof window !== 'undefined' ? window : globalThis);
