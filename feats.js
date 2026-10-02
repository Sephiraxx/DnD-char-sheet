/* Dotes que funcionan en la ficha: qué se aplica solo, qué se elige al ganarla y qué queda para la mesa.
   Lo mecánico de cada dote viene de feat-data.js; acá se suman los efectos que la ficha calcula. */
(function (root) {
  'use strict';
  const ABIL = {
    str: 'Fuerza',
    dex: 'Destreza',
    con: 'Constitución',
    int: 'Inteligencia',
    wis: 'Sabiduría',
    cha: 'Carisma',
  };
  const ARMOR = { light: 'armadura ligera', medium: 'armadura media', heavy: 'armadura pesada', shield: 'escudos' };

  // Efectos que la ficha calcula sola. res: [nombre, usos, descanso, texto, acción].
  const HAND = {
    alert: {
      init: 5,
      manual: 'No te sorprenden mientras estés consciente; quien esté oculto no tiene ventaja para atacarte.',
    },
    tough: { hp: 2 },
    mobile: {
      speed: 10,
      manual:
        'Al Correr, el terreno difícil no te frena; la criatura que atacás cuerpo a cuerpo no te hace ataques de oportunidad ese turno.',
    },
    'squat-nimbleness': { speed: 5, manual: 'Ventaja en Atletismo o Acrobacias para escapar de un agarre.' },
    observant: { passive: 5, manual: 'Podés leer los labios en un idioma que entiendas.' },
    durable: {
      manual: 'Al gastar un Dado de Golpe recuperás como mínimo el doble de tu modificador de CON (mínimo 2).',
    },
    lucky: {
      res: [
        'Suerte',
        3,
        'long',
        'Tras ver la tirada, antes del resultado: tirá otro d20 en tu ataque, prueba o salvación (o en un ataque contra vos) y elegí cuál vale.',
        'reaction',
      ],
    },
    'martial-adept': {
      res: ['Dado de superioridad (dote)', 1, 'short', 'Un d6 para usar una de las dos maniobras de la dote.'],
    },
    'second-chance': {
      res: [
        'Segunda oportunidad',
        1,
        'short',
        'Reacción: cuando te impactan, obligás a repetir la tirada de ataque.',
        'reaction',
      ],
    },
    'orcish-fury': { res: ['Furia orca', 1, 'short', 'Al impactar con un arma, sumá un dado de daño del arma.'] },
    'fey-touched': {
      res: [
        'Toque feérico',
        1,
        'long',
        'Lanzá Paso brumoso y el conjuro de nivel 1 de la dote una vez cada uno sin gastar espacio.',
      ],
      spells: ['misty-step'],
    },
    'shadow-touched': {
      res: [
        'Toque sombrío',
        1,
        'long',
        'Lanzá Invisibilidad y el conjuro de nivel 1 de la dote una vez cada uno sin gastar espacio.',
      ],
      spells: ['invisibility'],
    },
    'war-caster': {
      concentration: true,
      manual: 'Gestos con las manos ocupadas; podés lanzar un conjuro de una acción como ataque de oportunidad.',
    },
    sharpshooter: {
      manual:
        'A distancia: sin desventaja a largo alcance e ignorás cobertura media y tres cuartos. Podés tomar −5 al ataque por +10 al daño.',
    },
    'great-weapon-master': {
      manual:
        'Al hacer un crítico o dejar a 0 PG, un ataque cuerpo a cuerpo como acción adicional. Con armas pesadas, −5 al ataque por +10 al daño.',
    },
    'crossbow-expert': {
      manual:
        'Ignorás la recarga de ballestas, sin desventaja a 5 pies y ataque con ballesta de mano como acción adicional.',
    },
    'polearm-master': {
      manual: 'Ataque adicional con el otro extremo (d4) y ataques de oportunidad al entrar en tu alcance.',
    },
    sentinel: {
      manual:
        'Tus ataques de oportunidad dejan la velocidad en 0 e ignoran Destrabarse; reacción si atacan a un aliado cerca.',
    },
    'shield-master': {
      manual: 'Empujón con escudo como acción adicional; sumás el escudo a salvaciones de DES contra un solo objetivo.',
    },
    'dual-wielder': { manual: '+1 a la CA con un arma en cada mano; combate con dos armas no ligeras.' },
    'defensive-duelist': {
      manual: 'Reacción: sumás tu competencia a la CA contra un ataque cuerpo a cuerpo si empuñás un arma sutil.',
    },
    'mage-slayer': { manual: 'Reacción contra quien lanza a 5 pies; ventaja en salvaciones contra conjuros cercanos.' },
    'savage-attacker': {
      manual: 'Una vez por turno, repetí los dados de daño de un arma cuerpo a cuerpo y quedate con el mejor.',
    },
    'inspiring-leader': {
      manual: 'Discurso de 10 minutos: hasta seis criaturas ganan PG temporales iguales a tu nivel + CAR.',
    },
    healer: {
      manual:
        'Con un botiquín estabilizás y curás 1 PG; o curás 1d6 + 4 + nivel máximo del objetivo, una vez por descanso.',
    },
    'spell-sniper': {
      manual:
        'Doble alcance en conjuros de ataque, ignorás cobertura media y tres cuartos, y un truco de ataque extra.',
    },
    'elemental-adept': {
      manual: 'Tus conjuros ignoran la resistencia al tipo elegido y los 1 de daño cuentan como 2.',
    },
    'magic-initiate': { manual: 'Dos trucos y un conjuro de nivel 1 de una lista de clase: agregalos en Conjuros.' },
    'ritual-caster': { manual: 'Libro de rituales: anotá los conjuros rituales que copies.' },
    'tavern-brawler': {
      manual: 'Golpes sin armas d4, competencia con armas improvisadas y agarre como acción adicional al impactar.',
    },
    'heavy-armor-master': {
      manual: 'Con armadura pesada, reducís en 3 el daño contundente, perforante y cortante no mágico.',
    },
    'medium-armor-master': { manual: 'Sin desventaja en Sigilo con armadura media y hasta +3 de DES en la CA.' },
    'keen-mind': { manual: 'Sabés el norte, la hora y recordás todo lo del último mes.' },
    actor: { manual: 'Ventaja en Engaño e Interpretación al hacerte pasar por otro; imitás voces.' },
    athlete: { manual: 'Levantarte cuesta 5 pies, trepar no cuesta extra y saltos con carrera de 5 pies.' },
    charger: { manual: 'Tras Correr, ataque o empujón como acción adicional con +5 al daño si avanzaste 10 pies.' },
    grappler: { manual: 'Ventaja para atacar a quien agarrás; podés inmovilizarlo.' },
    skulker: { manual: 'Te escondés en penumbra; fallar un ataque a distancia no revela tu posición.' },
    'mounted-combatant': { manual: 'Ventaja contra criaturas más chicas que tu montura y protegés a tu montura.' },
    'weapon-master': { manual: 'Competencia con cuatro armas a elección: anotalas en Equipo.' },
    'eldritch-adept': { manual: 'Una invocación sobrenatural sin requisitos de nivel.' },
    'fighting-initiate': { manual: 'Un estilo de combate de guerrero.' },
    'metamagic-adept': {
      res: ['Puntos de hechicería (dote)', 2, 'long', 'Dos puntos para tus dos opciones de metamagia.'],
    },
    'dragon-hide': { manual: 'Sin armadura, tu CA es 13 + DES; garras de 1d4 cortante.' },
    'infernal-constitution': { manual: 'Ventaja en salvaciones contra veneno.' },
  };

  const data = id => ({ ...(root.FeatData?.[id] || {}), ...(HAND[id] || {}) });
  const feat = id => root.Catalog?.feats.find(f => f.id === id);
  const learned = s => s?.progression?.learnedFeats || [];
  const choiceOf = (s, id) => s?.progression?.featChoices?.[id] || {};
  const skillName = id => root.Rules?.skills.find(x => x[0] === id)?.[1] || id;

  // Lo que la ficha hace sola con la dote (sin depender de lo que elijas).
  function autoList(id, s) {
    const e = data(id),
      out = [];
    if (e.ability?.fixed)
      out.push(
        Object.entries(e.ability.fixed)
          .map(([k, v]) => `+${v} ${ABIL[k]}`)
          .join(', '),
      );
    if (e.ability?.from) {
      const pick = choiceOf(s, id).ability;
      out.push(pick ? `+1 ${ABIL[pick]}` : `+1 a ${e.ability.from.map(k => ABIL[k]).join(' o ')} (lo elegís)`);
    }
    if (e.save) {
      const pick = choiceOf(s, id).ability;
      out.push(
        pick ? `Competencia en salvaciones de ${ABIL[pick]}` : 'Competencia en la salvación de esa característica',
      );
    }
    if (e.hp) out.push(`+${e.hp} PG máximos por nivel`);
    if (e.init) out.push(`+${e.init} a la iniciativa`);
    if (e.speed) out.push(`+${e.speed} pies de velocidad`);
    if (e.passive) out.push(`+${e.passive} a Percepción e Investigación pasivas`);
    if (e.armor?.length) out.push('Competencia con ' + e.armor.map(k => ARMOR[k]).join(' y '));
    if (e.resist?.length) out.push('Resistencia a ' + e.resist.map(t => root.Defenses?.label?.(t) || t).join(' y '));
    if (e.concentration) out.push('Ventaja en salvaciones de concentración');
    if (e.res) out.push(`${e.res[0]}: ${e.res[1]} uso(s) por descanso ${e.res[2] === 'short' ? 'corto' : 'largo'}`);
    const picked = choiceOf(s, id);
    if (e.skills && picked.skills?.length) out.push('Competencia en ' + picked.skills.map(skillName).join(', '));
    else if (e.skills?.fixed) out.push('Competencia en ' + e.skills.fixed.map(skillName).join(', '));
    else if (e.skills) out.push(`Competencia en ${e.skills.n} habilidad(es) (las elegís)`);
    if (e.expertise && picked.expertise?.length) out.push('Pericia en ' + picked.expertise.map(skillName).join(', '));
    else if (e.expertise) out.push('Pericia en una habilidad (la elegís)');
    return out;
  }
  // Lo que queda a cargo del jugador o de la mesa.
  function manualList(id) {
    const e = data(id),
      out = [];
    if (e.manual) out.push(e.manual);
    if (e.skills?.tools) out.push('Si preferís herramientas en lugar de habilidades, anotalas en Personaje.');
    if (e.languages) out.push(`Anotá ${e.languages} idioma(s) nuevo(s) en Idiomas.`);
    if (e.spells?.length || /touched/.test(id)) out.push('Agregá los conjuros de la dote en Conjuros.');
    if (!e.manual && !autoList(id).length) out.push('Revisá el texto de la dote en su libro.');
    return out;
  }
  // Una línea para las tarjetas de elección.
  const summary = id => autoList(id).slice(0, 3).join(' · ');
  const auto = id => autoList(id).join(' · ');

  // Qué hay que elegir al ganar la dote (el paso de mejora lo pide).
  function needs(id, s) {
    const e = data(id),
      out = {};
    if (e.ability?.from) out.ability = e.ability.from.filter(k => (s?.abilities?.[k] ?? 0) < 20);
    if (e.skills && !e.skills.fixed) {
      const have = new Set(s?.proficiencies || []);
      out.skills = {
        n: e.skills.n,
        from: (e.skills.from || root.Rules.skills.map(x => x[0])).filter(k => !have.has(k)),
      };
    }
    if (e.expertise) out.expertise = e.expertise;
    return out;
  }
  function checkPicks(id, s, picks = {}) {
    const nd = needs(id, s);
    if (nd.ability && !nd.ability.includes(picks.ability)) throw Error('Elegí qué característica sube con la dote.');
    if (nd.skills) {
      const sk = picks.skills || [];
      if (sk.length !== Math.min(nd.skills.n, nd.skills.from.length) || sk.some(k => !nd.skills.from.includes(k)))
        throw Error(`Elegí ${nd.skills.n} habilidad(es) de la dote.`);
    }
    if (nd.expertise) {
      const can = new Set([...(s.proficiencies || []), ...(picks.skills || [])]);
      const ex = picks.expertise || [];
      if (ex.length !== nd.expertise || ex.some(k => !can.has(k) || (s.expertise || []).includes(k)))
        throw Error('Elegí una habilidad con competencia para la pericia.');
    }
  }
  // Aplica lo permanente al ganar la dote: características, habilidades y pericias.
  function onGain(s, id, picks = {}) {
    const e = data(id);
    checkPicks(id, s, picks);
    for (const [k, v] of Object.entries(e.ability?.fixed || {})) s.abilities[k] = Math.min(20, s.abilities[k] + v);
    if (picks.ability) s.abilities[picks.ability] = Math.min(20, s.abilities[picks.ability] + 1);
    const sk = [...(e.skills?.fixed || []), ...(picks.skills || [])];
    s.proficiencies = [...new Set([...(s.proficiencies || []), ...sk])];
    s.expertise = [...new Set([...(s.expertise || []), ...(picks.expertise || [])])];
    const keep = {};
    if (picks.ability) keep.ability = picks.ability;
    if (picks.skills?.length) keep.skills = picks.skills.slice();
    if (picks.expertise?.length) keep.expertise = picks.expertise.slice();
    s.progression.featChoices = {
      ...(s.progression.featChoices || {}),
      ...(Object.keys(keep).length ? { [id]: keep } : {}),
    };
    return s;
  }

  // ---------- Lo que la ficha calcula ----------
  const sum = (s, k) => learned(s).reduce((a, id) => a + (data(id)[k] || 0), 0);
  const hpPerLevel = s => sum(s, 'hp');
  const initiative = s => sum(s, 'init');
  const speed = s => sum(s, 'speed');
  const passive = (s, skill) => (['perception', 'investigation'].includes(skill) ? sum(s, 'passive') : 0);
  const concentrationAdvantage = s => learned(s).some(id => data(id).concentration);
  function saves(s) {
    return learned(s)
      .filter(id => data(id).save)
      .map(id => choiceOf(s, id).ability)
      .filter(Boolean);
  }
  const armor = (s, type) => learned(s).some(id => (data(id).armor || []).includes(type));
  function defenses(s) {
    const out = { resist: [], immune: [], conditions: [] };
    for (const id of learned(s)) {
      const e = data(id),
        name = feat(id)?.name || id;
      for (const t of e.resist || []) out.resist.push([t, name]);
      for (const t of e.immune || []) out.immune.push([t, name]);
      for (const c of e.conditionImmune || []) out.conditions.push(c);
    }
    return out;
  }
  function resources(s) {
    const seen = new Set();
    return learned(s)
      .filter(id => data(id).res && !seen.has(id) && seen.add(id))
      .map(id => {
        const [name, max, reset, text, action = 'manual'] = data(id).res;
        return { id: 'feat-' + id, name, max, reset, text, action, feat: id };
      });
  }
  // Para la tarjeta de dotes: cada dote con lo automático y lo manual.
  function report(s) {
    return learned(s).map(id => ({ id, name: feat(id)?.name || id, auto: autoList(id, s), manual: manualList(id) }));
  }

  // featChoices: { [idDeDote]: { ability, skills, expertise } }
  function validate(s) {
    const fc = s?.progression?.featChoices;
    if (fc === undefined) return;
    const ok =
      fc &&
      typeof fc === 'object' &&
      !Array.isArray(fc) &&
      Object.keys(fc).length <= 50 &&
      Object.values(fc).every(
        c =>
          c &&
          typeof c === 'object' &&
          (c.ability === undefined || Object.hasOwn(ABIL, c.ability)) &&
          ['skills', 'expertise'].every(
            k =>
              c[k] === undefined ||
              (Array.isArray(c[k]) &&
                c[k].length <= 18 &&
                c[k].every(x => root.Rules?.skills.some(r => r[0] === x) ?? true)),
          ),
      );
    if (!ok) throw Error('Las elecciones de dotes no son válidas.');
  }

  root.FeatFX = {
    summary,
    auto,
    autoList,
    manualList,
    needs,
    checkPicks,
    onGain,
    hpPerLevel,
    initiative,
    speed,
    passive,
    saves,
    armor,
    defenses,
    resources,
    concentrationAdvantage,
    report,
    validate,
  };
})(typeof window !== 'undefined' ? window : globalThis);
