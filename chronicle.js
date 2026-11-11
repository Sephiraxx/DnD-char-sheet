/* Crónica de la campaña: misiones, calendario del mundo y tiempo entre aventuras.
   Se guarda dentro de los ajustes de la mesa (la party lee lo que el DM marca como compartido en pantalla;
   los ajustes viajan completos, así que no es lugar para secretos de verdad). Lógica sin navegador. */
(function (root) {
  'use strict';
  const txt = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
  const int = (v, min, max, def) => (Number.isInteger(v) && v >= min && v <= max ? v : def);
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const STATUS = { active: 'En curso', done: 'Cumplida', failed: 'Fallida' };

  // ---------- Misiones ----------
  function cleanQuest(q) {
    const title = txt(q?.title, 120);
    if (!title) return null;
    return {
      id: txt(q.id, 40) || uid(),
      title,
      text: txt(q.text, 800),
      reward: txt(q.reward, 300),
      giver: txt(q.giver, 120),
      status: Object.hasOwn(STATUS, q.status) ? q.status : 'active',
      shared: q.shared !== false,
    };
  }

  // ---------- Calendario ----------
  const DEFAULT_MONTHS = Array.from({ length: 12 }, (_, i) => ({ name: 'Mes ' + (i + 1), days: 30 }));
  function cleanCalendar(c) {
    const months = Array.isArray(c?.months)
      ? c.months
          .slice(0, 24)
          .map(m => ({ name: txt(m?.name, 40), days: int(m?.days, 1, 100, 30) }))
          .filter(m => m.name)
      : [];
    const list = months.length ? months : DEFAULT_MONTHS.map(m => ({ ...m })),
      perYear = list.reduce((a, m) => a + m.days, 0);
    return {
      months: list,
      week: int(c?.week, 1, 20, 7),
      year: int(c?.year, -100000, 100000, 1),
      day: int(c?.day, 0, perYear - 1, 0), // día del año, desde 0
      notes: Array.isArray(c?.notes)
        ? c.notes
            .map(n => ({
              year: int(n?.year, -100000, 100000, null),
              day: int(n?.day, 0, 2400, null),
              text: txt(n?.text, 200),
            }))
            .filter(n => n.year !== null && n.day !== null && n.text)
            .slice(-60)
        : [],
    };
  }
  const yearDays = c => c.months.reduce((a, m) => a + m.days, 0);
  // { month, monthName, dayOfMonth (1…), year }
  function date(c, day = c.day, year = c.year) {
    let d = day,
      i = 0;
    while (i < c.months.length - 1 && d >= c.months[i].days) d -= c.months[i++].days;
    return { month: i, monthName: c.months[i].name, dayOfMonth: d + 1, year };
  }
  const dateText = (c, day = c.day, year = c.year) => {
    const d = date(c, day, year);
    return `${d.dayOfMonth} de ${d.monthName}, año ${d.year}`;
  };
  function advance(c, days) {
    const per = yearDays(c);
    let total = c.day + Math.trunc(days),
      year = c.year;
    while (total >= per) {
      total -= per;
      year++;
    }
    while (total < 0) {
      total += per;
      year--;
    }
    return { ...c, day: total, year };
  }
  function setDate(c, year, month, dayOfMonth) {
    const m = Math.max(0, Math.min(c.months.length - 1, month)),
      d = Math.max(1, Math.min(c.months[m].days, dayOfMonth));
    return { ...c, year, day: c.months.slice(0, m).reduce((a, x) => a + x.days, 0) + d - 1 };
  }

  // ---------- Tiempo entre aventuras ----------
  // Actividades del Manual del Jugador, resumidas.
  const ACTIVITIES = {
    craft: [
      'Fabricar',
      'Con competencia en la herramienta: avanzás 5 po de valor por día y pagás la mitad del precio en materiales.',
    ],
    work: [
      'Ejercer una profesión',
      'Mantenés un estilo de vida modesto sin gastar (cómodo si sos miembro de un gremio o actuás con competencia).',
    ],
    recover: [
      'Recuperarse',
      'Tras 3 días: salvación de Constitución CD 15 para terminar un efecto que impide curar PG o tener ventaja 24 h contra una enfermedad o veneno.',
    ],
    research: ['Investigar', 'El DM decide qué se averigua y cuánto lleva; suele costar 1 po por día en gastos.'],
    train: ['Aprender un idioma o herramienta', '250 días con un instructor, a 1 po por día.'],
    magic: [
      'Crear un objeto mágico',
      'Avanzás 25 po por día. Hace falta la fórmula, poder lanzar los conjuros del objeto y el nivel mínimo.',
    ],
    other: ['Otra actividad', ''],
  };
  // Objetos mágicos: costo de creación y nivel mínimo por rareza (Guía del Dungeon Master).
  const MAGIC_CRAFT = {
    común: [100, 3],
    infrecuente: [500, 3],
    'poco común': [500, 3],
    raro: [5000, 6],
    'muy raro': [50000, 11],
    legendario: [500000, 17],
  };
  // Fabricación mundana: días y materiales para un objeto de cierto precio, con varios artesanos.
  function craft(price, workers = 1) {
    const p = Math.max(0, Number(price) || 0),
      w = Math.max(1, Math.trunc(workers) || 1);
    return { days: Math.ceil(p / (5 * w)), materials: p / 2 };
  }
  function craftMagic(rarity, workers = 1) {
    const r = MAGIC_CRAFT[rarity];
    if (!r) return null;
    return { cost: r[0], minLevel: r[1], days: Math.ceil(r[0] / (25 * Math.max(1, Math.trunc(workers) || 1))) };
  }
  function cleanDowntime(d) {
    const who = txt(d?.who, 100);
    if (!who) return null;
    const days = int(d.days, 1, 100000, 1);
    return {
      id: txt(d.id, 40) || uid(),
      who,
      activity: Object.hasOwn(ACTIVITIES, d.activity) ? d.activity : 'other',
      goal: txt(d.goal, 200),
      days,
      done: int(d.done, 0, days, 0),
      notes: txt(d.notes, 300),
    };
  }
  // Suma días a las actividades en curso (al avanzar el calendario).
  const progress = (list, days) => list.map(d => ({ ...d, done: Math.max(0, Math.min(d.days, d.done + days)) }));

  function clean(x) {
    const list = (v, fn, max) => (Array.isArray(v) ? v.map(fn).filter(Boolean).slice(-max) : []);
    return {
      quests: list(x?.quests, cleanQuest, 60),
      calendar: x?.calendar ? cleanCalendar(x.calendar) : null,
      downtime: list(x?.downtime, cleanDowntime, 40),
    };
  }
  root.Chronicle = {
    STATUS,
    ACTIVITIES,
    MAGIC_CRAFT,
    uid,
    clean,
    cleanQuest,
    cleanCalendar,
    cleanDowntime,
    yearDays,
    date,
    dateText,
    advance,
    setDate,
    craft,
    craftMagic,
    progress,
  };
})(typeof window !== 'undefined' ? window : globalThis);
