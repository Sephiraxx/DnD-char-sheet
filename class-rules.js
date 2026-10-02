/* Clases de D&D 5e 2014, con multiclase básica. Datos de fuentes en class-data.js.
   La clase principal usa classId/level/classSubclass; las demás viven en s.multiclass. */
(function (root) {
  'use strict';
  const D = root.ClassData,
    R = () => root.Rules;
  const id = s => s.classId || 'bard',
    info = s => D.classes[id(s)],
    sub = s =>
      D.subclasses.find(x => x.id === s.classSubclass) ||
      (id(s) === 'bard' && s.subclass === 'eloquence'
        ? D.subclasses.find(x => x.id === 'bard-college-of-eloquence')
        : null);
  // Multiclase: cada clase secundaria se evalúa como una «vista» con su propio nivel de clase.
  const mcList = s => (Array.isArray(s.multiclass) ? s.multiclass : []);
  const totalLevel = s => s._total || s.level + mcList(s).reduce((a, x) => a + x.level, 0);
  function view(s, mc) {
    return {
      ...s,
      classId: mc.classId,
      level: mc.level,
      classSubclass: mc.subclass || '',
      subclass: '',
      classChoices: mc.choices || {},
      known: mc.spells || [],
      prepared: mc.prepared || [],
      extras: [],
      secretKnown: [],
      arcanum: {},
      castingAbility: undefined,
      multiclass: [],
      _total: totalLevel(s),
    };
  }
  const views = s => [s, ...mcList(s).map(mc => view(s, mc))];
  const at = (arr, l) => arr?.[l - 1] || 0,
    mod = n => Math.floor((n - 10) / 2),
    clone = x => JSON.parse(JSON.stringify(x));
  function casting(s) {
    const c = info(s),
      sc = sub(s),
      caster = sc?.caster || c.caster,
      ability = s.castingAbility || sc?.ability || c.ability || 'int';
    let type = c.prepared ? 'prepared' : 'known';
    if (id(s) === 'wizard') type = 'book';
    if (!caster || (caster === '1/2' && s.level < 2) || (caster === '1/3' && s.level < 3)) type = 'none';
    return {
      caster,
      ability,
      type,
      cantrips:
        at(sc?.cantrips || c.cantrips, s.level) +
        ((s.classChoices?.['Pact Boon'] || []).includes('pact-of-the-tome-PHB') ? 3 : 0),
      known: at(sc?.known || c.known, s.level),
    };
  }
  function ownSlots(s) {
    const c = casting(s).caster,
      l = s.level,
      t = R().slots;
    if (c === 'full') return t[l];
    if (c === 'pact') {
      const level = Math.min(5, Math.ceil(l / 2)),
        a = Array(level).fill(0);
      a[level - 1] = l === 1 ? 1 : l < 11 ? 2 : l < 17 ? 3 : 4;
      return a;
    }
    if (c === '1/2') return l < 2 ? [] : t[Math.ceil(l / 2)];
    if (c === 'artificer') return t[Math.ceil(l / 2)];
    if (c === '1/3') return l < 3 ? [] : t[Math.ceil(l / 3)];
    return [];
  }
  // Nivel de lanzador multiclase (PHB p. 164). El pacto mágico va aparte.
  function casterLevel(v) {
    const c = casting(v).caster,
      l = v.level;
    if (c === 'full') return l;
    if (c === '1/2') return Math.floor(l / 2);
    if (c === 'artificer') return Math.ceil(l / 2);
    if (c === '1/3') return Math.floor(l / 3);
    return 0;
  }
  const spellcasters = s => views(s).filter(v => casting(v).type !== 'none' && casting(v).caster !== 'pact');
  // Espacios de pacto separados cuando hay multiclase con brujo (salvo brujo principal sin otros lanzadores).
  function pact(s) {
    if (!mcList(s).length || s._total) return null;
    const w = views(s).find(v => id(v) === 'warlock');
    if (!w || (w === s && !spellcasters(s).length)) return null;
    const a = ownSlots(w);
    return { level: a.length, max: a[a.length - 1] };
  }
  function slots(s) {
    if (!mcList(s).length || s._total) return ownSlots(s);
    const casters = spellcasters(s);
    if (!casters.length) return id(s) === 'warlock' ? ownSlots(s) : [];
    if (casters.length === 1) return ownSlots(casters[0]);
    return R().slots[
      Math.min(
        20,
        casters.reduce((a, v) => a + casterLevel(v), 0),
      )
    ];
  }
  function hitDiceSet(s) {
    const out = {};
    for (const v of views(s)) out[info(v).die] = (out[info(v).die] || 0) + v.level;
    return Object.entries(out)
      .map(([die, count]) => ({ die: Number(die), count }))
      .sort((a, b) => b.die - a.die);
  }
  function stats(s) {
    const c = info(s),
      l = s.level,
      total = totalLevel(s),
      p = 2 + Math.floor((total - 1) / 4),
      m = Object.fromEntries(Object.entries(s.abilities).map(([k, v]) => [k, mod(v)])),
      cast = casting(s),
      ss = slots(s);
    let ac = s.acBase + (s.armorDexCap === undefined ? m.dex : Math.min(m.dex, s.armorDexCap)) + s.acBonus;
    if (s.armorMode === 'fixed') ac = s.acBase + s.acBonus;
    if (s.armorMode === 'barbarian') ac = 10 + m.dex + m.con + s.acBonus;
    if (s.armorMode === 'monk') ac = 10 + m.dex + m.wis + s.acBonus;
    if (s.equipmentDefense && root.Equipment) ac = root.Equipment.defense(s).total;
    return {
      prof: p,
      mods: m,
      maxHP: Math.max(1, s.hpBase + total * (m.con + (root.FeatFX?.hpPerLevel(s) || 0))),
      ac,
      dc: 8 + p + m[cast.ability],
      attack: p + m[cast.ability],
      inspirationMax: Math.max(1, m.cha),
      inspirationDie: R().die(l),
      hitDice: total,
      hitDie: c.die,
      hitDiceSet: hitDiceSet(s),
      totalLevel: total,
      slots: ss,
      pact: pact(s),
      known: cast.known + (sub(s)?.id === 'bard-college-of-lore' && l >= 6 ? 2 : 0),
      cantrips: cast.cantrips,
      prepared:
        cast.type === 'prepared' || cast.type === 'book'
          ? Math.max(1, m[cast.ability] + (['artificer', 'paladin'].includes(id(s)) ? Math.floor(l / 2) : l))
          : 0,
      initiative:
        m.dex +
        (views(s).some(v => id(v) === 'bard' && v.level >= 2) ? Math.floor(p / 2) : 0) +
        (root.FeatFX?.initiative(s) || 0),
      speed: (s.speed ?? 30) + (root.FeatFX?.speed(s) || 0),
      songDie: id(s) === 'bard' && l >= 2 ? R().song(l) : 0,
    };
  }
  function member(sp, s) {
    if (root.Campaign?.expanded(s).includes(sp.id) && casting(s).type !== 'none') return true;
    if (sp.level === 0 && (s.classChoices?.['Pact Boon'] || []).includes('pact-of-the-tome-PHB')) return true;
    const lists = sp.classes || D.spellClasses[sp.id] || [];
    if (id(s) === 'bard') return sp.bard && (!sp.optionalBard || s.progression.expanded);
    if (['fighter', 'rogue'].includes(id(s)) && casting(s).caster) return lists.includes('wizard');
    return lists.includes(id(s));
  }
  const spellToken = t =>
    String(t)
      .split(/[|#]/)[0]
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  function lookupSpell(s, t) {
    const key = spellToken(t);
    return R()
      .allSpells(s)
      .find(x => spellToken(x.english || x.name) === key || spellToken(x.id) === key);
  }
  const subclassNames = {
    'druid-circle-of-spores': 'Círculo de las Esporas',
    'druid-circle-of-stars': 'Círculo de las Estrellas',
    'druid-circle-of-wildfire': 'Círculo del Fuego Salvaje',
    'druid-circle-of-the-land': 'Círculo de la Tierra',
    'druid-circle-of-the-moon': 'Círculo de la Luna',
  };
  function granted(s) {
    const result = { prepared: [], known: [], expanded: [], choices: [], details: {} },
      sc = sub(s);
    if (!sc || s.level < info(s).subclassLevel) return result;
    for (const grant of sc.spells || [])
      for (const mode of ['prepared', 'known', 'expanded'])
        for (const [key, values] of Object.entries(grant[mode] || {})) {
          const threshold = key.startsWith('s') ? Number(key.slice(1)) <= slots(s).length : Number(key) <= s.level;
          if (!threshold) continue;
          for (const val of Array.isArray(values) ? values : []) {
            if (typeof val === 'string') {
              const sp = lookupSpell(s, val);
              if (sp) {
                if (!result[mode].includes(sp.id)) result[mode].push(sp.id);
                if (mode !== 'expanded' && (!result.details[sp.id] || mode === 'prepared'))
                  result.details[sp.id] = {
                    mode,
                    origin: subclassNames[sc.id] || sc.name,
                    source: sc.source,
                    level: key.startsWith('s') ? null : Number(key),
                    spellLevel: key.startsWith('s') ? Number(key.slice(1)) : null,
                  };
              }
            } else result.choices.push(val);
          }
        }
    return result;
  }
  function spellGrant(s, spellId) {
    return granted(s).details[spellId] || null;
  }
  function spellCounts(s) {
    const g = granted(s),
      auto = new Set([...g.prepared, ...g.known]),
      normal = (s.known || [])
        .filter(id => !auto.has(id))
        .map(id =>
          R()
            .allSpells(s)
            .find(x => x.id === id),
        )
        .filter(Boolean);
    return {
      prepared: (s.prepared || []).filter(id => !g.prepared.includes(id)).length,
      known: normal.filter(x => x.level > 0 || (s.secretKnown || []).includes(x.id)).length,
      cantrips: normal.filter(x => x.level === 0 && !(s.secretKnown || []).includes(x.id)).length,
      automaticPrepared: g.prepared.length,
      automaticKnown: g.known.length,
    };
  }

  // Conjuros que puede lanzar una sola clase: trucos, conocidos y, si prepara, solo los preparados.
  function ownUsable(v) {
    const mode = casting(v).type,
      g = granted(v);
    return [
      ...(v.known || []).filter(x => {
        const sp = R()
          .allSpells(v)
          .find(y => y.id === x);
        return sp?.level === 0 || !['book', 'prepared'].includes(mode) || (v.prepared || []).includes(x);
      }),
      ...g.prepared,
      ...g.known,
    ];
  }
  // Qué clase lanza un conjuro (para la CD y el ataque): la principal o una secundaria de la multiclase.
  function spellCaster(s, spellId) {
    if (s._total) return s;
    return views(s).find(v => ownUsable(v).includes(spellId)) || s;
  }
  function usable(s) {
    const mode = casting(s).type,
      g = granted(s);
    return [
      ...new Set([
        ...(s._total ? [] : views(s).slice(1).flatMap(ownUsable)),
        ...s.known.filter(x => {
          const sp = R()
            .allSpells(s)
            .find(y => y.id === x);
          return sp?.level === 0 || !['book', 'prepared'].includes(mode) || (s.prepared || []).includes(x);
        }),
        ...s.extras,
        ...g.prepared,
        ...g.known,
        ...Object.values(s.arcanum || {}),
      ]),
    ];
  }
  function ritualAllowed(s, sp) {
    if (!sp.ritual) return false;
    if (s.extras.includes(sp.id)) return true;
    const c = id(s);
    if (c === 'wizard') return s.known.includes(sp.id);
    return ['bard', 'cleric', 'druid', 'artificer'].includes(c) && usable(s).includes(sp.id);
  }
  // Recursos de clase (de cada clase con multiclase) y de dotes.
  function resources(s) {
    return s._total ? ownResources(s) : [...classResources(s), ...(root.FeatFX?.resources(s) || [])];
  }
  function classResources(s) {
    if (!mcList(s).length) return ownResources(s);
    const seen = new Set(),
      out = [];
    for (const v of views(s))
      for (const r of ownResources(v))
        if (!seen.has(r.id)) {
          seen.add(r.id);
          out.push(v === s ? r : { ...r, name: r.name + ' · ' + info(v).name });
        }
    return out;
  }
  function ownResources(s) {
    const c = id(s),
      l = s.level,
      m = stats(s).mods,
      p = stats(s).prof,
      out = [];
    const add = (id, name, max, reset, text, action = 'manual') => out.push({ id, name, max, reset, text, action });
    if (c === 'barbarian')
      add(
        'rage',
        'Rabia',
        l === 20 ? 999 : l >= 17 ? 6 : l >= 12 ? 5 : l >= 6 ? 4 : l >= 3 ? 3 : 2,
        'long',
        'Acción adicional para entrar en rabia. Duración 1 minuto; revisá mantenimiento y beneficios del rasgo. No podés lanzar ni concentrar conjuros mientras dura. Nivel 20: usos ilimitados.',
        'bonus',
      );
    if (c === 'fighter') {
      add(
        'second-wind',
        'Segundo aliento',
        1,
        'short',
        'Acción adicional: recuperá 1d10 + nivel de guerrero PG. Registrá la curación obtenida.',
        'bonus',
      );
      if (l >= 2)
        add(
          'action-surge',
          'Acción súbita',
          l >= 17 ? 2 : 1,
          'short',
          'Después de registrar tu primera acción del turno, usá este botón para habilitar una segunda acción. Como máximo un uso por turno. No da otra acción adicional (bonus).',
          'free',
        );
      if (l >= 9)
        add(
          'indomitable',
          'Indomable',
          l >= 17 ? 3 : l >= 13 ? 2 : 1,
          'long',
          'Repetí una salvación fallida; debés usar el nuevo resultado.',
        );
    }
    if (c === 'monk' && l >= 2)
      add(
        'ki',
        'Puntos de ki',
        l,
        'short',
        'Ráfaga de golpes, Defensa paciente y Paso del viento cuestan 1 punto y una acción adicional. Otros rasgos tienen sus propios costes. Requiere al menos 30 minutos de meditación dentro del descanso.',
      );
    if (c === 'sorcerer' && l >= 2)
      add(
        'sorcery',
        'Puntos de hechicería',
        l,
        'long',
        'Reservá el coste indicado por cada Metamagia. Crear espacios o convertirlos usa una acción adicional; no se realiza automáticamente al ajustar este contador.',
      );
    if (c === 'cleric' && l >= 2)
      add(
        'channel',
        'Canalizar divinidad',
        l >= 18 ? 3 : l >= 6 ? 2 : 1,
        'short',
        'Elegí Expulsar muertos vivientes u otra opción de tu dominio. Comparten usos.',
      );
    if (c === 'paladin') {
      add(
        'lay-on-hands',
        'Imposición de manos',
        l * 5,
        'long',
        'Acción: gastá puntos para curar por toque. Gastar 5 puede neutralizar un veneno o curar una enfermedad. No afecta muertos vivientes ni constructos.',
        'action',
      );
      add(
        'divine-sense',
        'Sentido divino',
        Math.max(1, 1 + m.cha),
        'long',
        'Acción: detectá celestiales, infernales y muertos vivientes a 60 pies sin cobertura total, hasta el fin de tu siguiente turno.',
        'action',
      );
      if (l >= 3)
        add('channel', 'Canalizar divinidad', 1, 'short', 'Usá una opción de tu juramento. Comparten un uso.');
      if (l >= 14)
        add(
          'cleansing',
          'Toque purificador',
          Math.max(1, m.cha),
          'long',
          'Acción: terminá un conjuro sobre vos o una criatura voluntaria que toques.',
          'action',
        );
    }
    if (c === 'druid' && l >= 2)
      add(
        'wild-shape',
        'Forma salvaje',
        l === 20 ? 999 : 2,
        'short',
        'Transformación según tu círculo y límites de nivel, VD y movimiento. Conservá tus PG originales: anotá los de la forma aparte. Nivel 20: usos ilimitados.',
        'action',
      );
    if (c === 'wizard')
      add(
        'arcane-recovery',
        'Recuperación arcana',
        1,
        'long',
        'Una vez al día, tras un descanso corto: recuperá espacios que sumen hasta ' +
          Math.ceil(l / 2) +
          ' niveles, ninguno de nivel 6 o superior. Ajustalos después de registrar el uso.',
      );
    if (c === 'artificer' && l >= 7)
      add(
        'flash',
        'Destello de genialidad',
        Math.max(1, m.int),
        'long',
        'Reacción: sumá INT a una prueba o salvación tuya o de otra criatura visible a 30 pies.',
        'reaction',
      );
    if (c === 'warlock')
      for (const [lv, id] of Object.entries(s.arcanum || {}))
        add(
          'arcanum' + lv,
          'Arcanum nivel ' + lv,
          1,
          'long',
          'Lanzamiento del conjuro elegido una vez por descanso largo, sin gastar espacio de pacto.',
        );
    const sc = sub(s)?.name;
    if (c === 'fighter' && sc === 'Battle Master' && l >= 3)
      add(
        'superiority',
        'Dados de superioridad',
        l >= 15 ? 6 : l >= 7 ? 5 : 4,
        'short',
        'd' + (l >= 18 ? 12 : l >= 10 ? 10 : 8) + '. Elegí una maniobra y cumplí su desencadenante.',
      );
    return out;
  }
  function spent(s, res) {
    return (s.classSpent || {})[res.id] ?? (s.classResourcesConfirmed === false ? null : 0);
  }
  function spend(s, rid, n) {
    const res = resources(s).find(x => x.id === rid);
    if (!res || spent(s, res) === null || !Number.isInteger(n) || n < 1 || spent(s, res) + n > res.max)
      throw Error('No alcanza ese recurso.');
    s.classSpent = s.classSpent || {};
    s.classSpent[rid] = spent(s, res) + n;
  }
  function reset(s, type) {
    s.raging = false;
    s.classSpent = s.classSpent || {};
    for (const res of resources(s)) if (type === 'long' || res.reset === 'short') s.classSpent[res.id] = 0;
    if (id(s) === 'warlock' && type === 'short' && !pact(s)) s.slotsSpent = Array(9).fill(0);
    if (pact(s)) s.pactSpent = 0;
    if (id(s) === 'bard' && (type === 'long' || s.level >= 5)) s.inspirationSpent = 0;
  }
  function choices(s) {
    const sc = sub(s),
      all = [...info(s).choices, ...(sc?.choices || [])];
    return all
      .map(x => {
        let count = Array.isArray(x.progression)
          ? at(x.progression, s.level)
          : Object.entries(x.progression)
              .filter(([l]) => Number(l) <= s.level)
              .sort((a, b) => Number(b[0]) - Number(a[0]))[0]?.[1] || 0;
        return {
          name: x.name,
          types: x.featureType,
          count,
          options: D.options.filter(
            o =>
              o.types.some(t => x.featureType.includes(t)) &&
              o.level <= s.level &&
              (!root.Campaign || root.Campaign.enabled(s, o) || (s.classChoices?.[x.name] || []).includes(o.id)),
          ),
        };
      })
      .filter(x => x.count);
  }
  function features(s, level = s.level) {
    return [
      ...info(s).features.filter(x => !x.optional || s.optionalClassFeatures),
      ...(sub(s)?.features || []),
    ].filter(x => x.level <= level);
  }
  function asiLevels(s) {
    return id(s) === 'fighter'
      ? [4, 6, 8, 12, 14, 16, 19]
      : id(s) === 'rogue'
        ? [4, 8, 10, 12, 16, 19]
        : [4, 8, 12, 16, 19];
  }
  function taskDetails(s) {
    const d = stats(s),
      cast = casting(s),
      counts = spellCounts(s),
      result = [];
    const add = (id, text, action, extra = {}) => result.push({ id, text, action, ...extra });
    if (s.level >= info(s).subclassLevel && !sub(s)) add('subclass', 'Elegí tu subclase.', 'class-config');
    if (counts.cantrips < d.cantrips)
      add('cantrips', 'Elegí ' + (d.cantrips - counts.cantrips) + ' truco(s).', 'spell-manage', { spellLevel: '0' });
    if (cast.type === 'known' && counts.known < d.known)
      add('known', 'Aprendé ' + (d.known - counts.known) + ' conjuro(s).', 'spell-manage');
    if (cast.type === 'book' && counts.known < 6 + 2 * (s.level - 1))
      add(
        'book',
        'Completá el libro: faltan al menos ' + (6 + 2 * (s.level - 1) - counts.known) + ' conjuros de progresión.',
        'spell-manage',
      );
    if (['book', 'prepared'].includes(cast.type) && counts.prepared < d.prepared)
      add('prepared', 'Podés preparar ' + (d.prepared - counts.prepared) + ' conjuro(s) más.', 'spell-manage');
    for (const c of choices(s)) {
      const count = (s.classChoices?.[c.name] || []).length;
      if (count < c.count)
        add(
          'choice:' + c.name,
          'Elegí ' + (c.count - count) + ' opción(es) de ' + (root.NamesEs?.choice(c.name) || c.name) + '.',
          'class-choices',
          {
            group: c.name,
          },
        );
    }
    if (id(s) === 'warlock')
      for (const [l, sl] of [
        [11, 6],
        [13, 7],
        [15, 8],
        [17, 9],
      ])
        if (s.level >= l && !s.arcanum?.[sl])
          add('arcanum:' + sl, 'Elegí tu Arcanum de nivel ' + sl + '.', 'spell-manage', { spellLevel: String(sl) });
    const ex =
      id(s) === 'rogue' ? (s.level >= 6 ? 4 : 2) : id(s) === 'bard' ? (s.level >= 10 ? 4 : s.level >= 3 ? 2 : 0) : 0;
    if (s.expertise.length < ex)
      add(
        'expertise',
        'Elegí ' + (ex - s.expertise.length) + ' Pericia(s), o registrá herramientas según tu rasgo.',
        'class-config',
      );
    return result;
  }
  function tasks(s) {
    return taskDetails(s).map(t => t.text);
  }
  function validate(s) {
    if (!D.classes[id(s)]) throw Error('Clase desconocida.');
    if (s.multiclass !== undefined) {
      if (!Array.isArray(s.multiclass) || s.multiclass.length > 12) throw Error('Multiclase inválida.');
      const seen = new Set([id(s)]);
      for (const mc of s.multiclass) {
        if (!mc || !D.classes[mc.classId] || seen.has(mc.classId)) throw Error('Clase secundaria inválida.');
        seen.add(mc.classId);
        if (!Number.isInteger(mc.level) || mc.level < 1 || mc.level > 19) throw Error('Nivel de clase inválido.');
        if (mc.subclass && !D.subclasses.some(x => x.id === mc.subclass && x.classId === mc.classId))
          throw Error('Subclase secundaria incompatible.');
        if (mc.notes !== undefined && (typeof mc.notes !== 'string' || mc.notes.length > 5000))
          throw Error('Notas de clase inválidas.');
        const ids = x => Array.isArray(x) && x.length <= 300 && x.every(v => typeof v === 'string' && v.length <= 100);
        if ((mc.spells !== undefined && !ids(mc.spells)) || (mc.prepared !== undefined && !ids(mc.prepared)))
          throw Error('Conjuros de clase secundaria inválidos.');
        if (
          mc.choices !== undefined &&
          (!mc.choices ||
            typeof mc.choices !== 'object' ||
            Array.isArray(mc.choices) ||
            Object.values(mc.choices).some(v => !ids(v)))
        )
          throw Error('Opciones de clase secundaria inválidas.');
      }
      if (totalLevel(s) > 20) throw Error('El nivel total no puede superar 20.');
    }
    if (
      s.pactSpent !== undefined &&
      s.pactSpent !== null &&
      (!Number.isInteger(s.pactSpent) || s.pactSpent < 0 || s.pactSpent > 4)
    )
      throw Error('Espacios de pacto inválidos.');
    if (s.castingAbility && !['str', 'dex', 'con', 'int', 'wis', 'cha'].includes(s.castingAbility))
      throw Error('Característica de lanzamiento inválida.');
    if (s.armorMode && !['normal', 'medium', 'fixed', 'barbarian', 'monk'].includes(s.armorMode))
      throw Error('Fórmula de armadura inválida.');
    if (s.armorDexCap !== undefined && (!Number.isInteger(s.armorDexCap) || s.armorDexCap < 0 || s.armorDexCap > 30))
      throw Error('Límite de DES inválido.');
    if (s.classSubclass && !D.subclasses.some(x => x.id === s.classSubclass && x.classId === id(s)))
      throw Error('Subclase incompatible.');
    const arr = x => Array.isArray(x) && x.length <= 520 && x.every(v => typeof v === 'string' && v.length <= 100);
    for (const key of ['prepared']) if (s[key] !== undefined && !arr(s[key])) throw Error('Repertorio inválido.');
    if (s.prepared?.some(x => !s.known.includes(x))) throw Error('Prepará solo conjuros de tu repertorio o libro.');
    for (const k of ['classSpent', 'spellModes', 'arcanum', 'classChoices'])
      if (s[k] !== undefined && (!s[k] || typeof s[k] !== 'object' || Array.isArray(s[k])))
        throw Error('Datos de clase inválidos.');
    for (const v of Object.values(s.classSpent || {}))
      if (!Number.isInteger(v) || v < 0 || v > 9999) throw Error('Recurso inválido.');
    for (const [k, v] of Object.entries(s.spellModes || {}))
      if (!s.extras.includes(k) || !['slot', 'free'].includes(v)) throw Error('Modo de conjuro inválido.');
    for (const [k, v] of Object.entries(s.classChoices || {}))
      if (k.length > 150 || !arr(v)) throw Error('Elecciones inválidas.');
    for (const [k, v] of Object.entries(s.arcanum || {}))
      if (
        id(s) !== 'warlock' ||
        ![6, 7, 8, 9].includes(Number(k)) ||
        s.level < 11 + (Number(k) - 6) * 2 ||
        !R()
          .allSpells(s)
          .some(x => x.id === v && x.level === Number(k))
      )
        throw Error('Arcanum inválido.');
    for (const k of ['race', 'background', 'languages', 'characterNotes', 'classNotes'])
      if (s[k] !== undefined && (typeof s[k] !== 'string' || s[k].length > 20000))
        throw Error('Texto de personaje inválido.');
    if (s.speed !== undefined && (!Number.isInteger(s.speed) || s.speed < 0 || s.speed > 500))
      throw Error('Velocidad inválida.');
  }
  function levelUp(s, choice) {
    const next = clone(s);
    if (totalLevel(s) >= 20) throw Error('Ya estás en nivel 20 de personaje.');
    const l = s.level + 1,
      die = info(s).die,
      roll = choice.hpMethod === 'rolled' ? Number(choice.hpRoll) : die / 2 + 1;
    if (!Number.isInteger(roll) || roll < 1 || roll > die) throw Error('Tirada de PG inválida.');
    next.level = l;
    if (choice.subclass) {
      next.classSubclass = choice.subclass;
      next.subclass = choice.subclass === 'bard-college-of-eloquence' ? 'eloquence' : 'manual';
    }
    if (l >= info(next).subclassLevel && !sub(next)) throw Error('Elegí una subclase.');
    if (asiLevels(s).includes(l)) {
      if (choice.asi === 'scores') {
        for (const a of [choice.a1, choice.a2]) {
          if (!Object.hasOwn(next.abilities, a)) throw Error('Elegí las características.');
          if (++next.abilities[a] > 20) throw Error('La mejora no puede superar 20.');
        }
      } else {
        const feat = root.Catalog.feats.find(x => x.id === choice.feat);
        if (!feat || !choice.reviewed) throw Error('Elegí una dote y revisá sus requisitos.');
        next.progression.learnedFeats.push(feat.id);
        next.features.push({ name: feat.name, text: 'Dote: ' + choice.featNotes });
      }
    }
    next.hpBase += Math.max(1, roll + mod(next.abilities.con)) - mod(next.abilities.con);
    if (next.hp !== null) next.hp = Math.min(next.hp, stats(next).maxHP);
    const before = slots(s),
      after = slots(next);
    if (casting(next).caster === 'pact' && !pact(next)) {
      const used = s.slotsSpent[before.length - 1];
      next.slotsSpent = Array(9).fill(0);
      next.slotsSpent[after.length - 1] = used === null ? null : Math.min(used, after[after.length - 1]);
    } else
      after.forEach((n, i) => {
        if (!before[i] && n) next.slotsSpent[i] = 0;
      });
    next.levelHistory.push({
      level: totalLevel(next),
      note:
        'Clase ' +
        info(s).name +
        '. PG máximos ' +
        stats(s).maxHP +
        ' → ' +
        stats(next).maxHP +
        '. Revisá las elecciones y los rasgos nuevos en Clase.',
    });
    return R().validate(next);
  }
  // Subir un nivel en una clase secundaria o empezar una nueva.
  function levelUpSecondary(s, choice) {
    const next = clone(s);
    if (totalLevel(s) >= 20) throw Error('Ya estás en nivel 20 de personaje.');
    if (!D.classes[choice.classId] || choice.classId === id(s)) throw Error('Elegí otra clase.');
    next.multiclass = mcList(next);
    let mc = next.multiclass.find(x => x.classId === choice.classId);
    if (!mc) next.multiclass.push((mc = { classId: choice.classId, level: 0, subclass: '', notes: '' }));
    mc.level++;
    const c = D.classes[mc.classId],
      roll = choice.hpMethod === 'rolled' ? Number(choice.hpRoll) : c.die / 2 + 1;
    if (!Number.isInteger(roll) || roll < 1 || roll > c.die) throw Error('Tirada de PG inválida.');
    if (choice.subclass) mc.subclass = choice.subclass;
    if (mc.level >= c.subclassLevel && !mc.subclass) throw Error('Elegí una subclase para ' + c.name + '.');
    next.hpBase += Math.max(1, roll + mod(next.abilities.con)) - mod(next.abilities.con);
    if (next.hp !== null) next.hp = Math.min(next.hp, stats(next).maxHP);
    const before = slots(s),
      after = slots(next);
    after.forEach((n, i) => {
      if (!before[i] && n) next.slotsSpent[i] = 0;
    });
    if (pact(next) && next.pactSpent === undefined) next.pactSpent = 0;
    const asi = asiLevels(view(next, mc)).includes(mc.level);
    next.levelHistory.push({
      level: totalLevel(next),
      note:
        c.name +
        ' ' +
        mc.level +
        '. PG máximos ' +
        stats(s).maxHP +
        ' → ' +
        stats(next).maxHP +
        '.' +
        (asi ? ' Mejora de características o dote: aplicala en Características.' : ''),
    });
    return R().validate(next);
  }
  // Requisitos de multiclase (PHB p. 163): 13 o más en la característica principal de cada clase.
  const PREREQ = {
    artificer: [['int']],
    barbarian: [['str']],
    bard: [['cha']],
    cleric: [['wis']],
    druid: [['wis']],
    fighter: [['str'], ['dex']],
    monk: [['dex', 'wis']],
    paladin: [['str', 'cha']],
    ranger: [['dex', 'wis']],
    rogue: [['dex']],
    sorcerer: [['cha']],
    warlock: [['cha']],
    wizard: [['int']],
  };
  // «Mago 3 / Guerrero 2»; con subclases si withSub.
  function label(s, withSub = false) {
    return views(s)
      .map(v => {
        const sc = withSub ? sub(v) : null;
        return info(v).name + ' ' + v.level + (sc ? ' (' + sc.name + ')' : '');
      })
      .join(' / ');
  }
  const meetsPrereq = (s, cid) => (PREREQ[cid] || []).some(group => group.every(a => s.abilities[a] >= 13));
  root.Classes = {
    totalLevel,
    views,
    label,
    pact,
    hitDiceSet,
    levelUpSecondary,
    meetsPrereq,
    PREREQ,
    id,
    info,
    sub,
    casting,
    slots,
    stats,
    member,
    granted,
    spellGrant,
    spellCounts,
    usable,
    spellCaster,
    ritualAllowed,
    resources,
    spent,
    spend,
    reset,
    choices,
    features,
    asiLevels,
    tasks,
    taskDetails,
    validate,
    levelUp,
  };
})(typeof window !== 'undefined' ? window : globalThis);
