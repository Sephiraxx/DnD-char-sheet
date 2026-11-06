/* Metamagia y Fuente de magia del hechicero (PHB p. 101–102; Tasha p. 66).
   Lo que se decide al lanzar (acelerado, distante, extendido, sutil, duplicado, cuidadoso, intensificado,
   transmutado) se elige en «Lanzar»: cobra los puntos y cambia el conjuro de esa vez. Lo que se decide al
   tirar (potenciado y rastreador) aparece en la tirada del conjuro. Una sola opción por lanzamiento, salvo
   Potenciado y Rastreador, que se suman a otra. Los puntos de la dote Adepto de la metamagia se usan primero. */
(function (root) {
  'use strict';
  const C = () => root.Classes;
  const n = v => Number(v) || 0;
  const esc = v =>
    String(v ?? '').replace(
      /[&<>"']/g,
      c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const feet = range => {
    const m = /(\d+)\s*(pies|feet|ft|millas?|miles?)/i.exec(String(range || '').replace(/(\d),(\d)/g, '$1$2'));
    if (!m) return null;
    return /mill|mile/i.test(m[2]) ? Number(m[1]) * 5280 : Number(m[1]);
  };
  const self = sp => /^\s*(personal|self)/i.test(sp.range || '');
  const touch = sp => /^\s*(toque|touch)/i.test(sp.range || '');
  const saves = sp => (sp.saveAbility || []).length > 0;
  const attacks = sp => (sp.attackKind || []).length > 0;
  // Duración en minutos («Concentración, hasta 1 hora» → 60); null si es instantánea o especial.
  function minutes(duration) {
    const m = /(\d+)\s*(minutos?|minutes?|horas?|hours?|d[ií]as?|days?)/i.exec(String(duration || ''));
    if (!m) return null;
    const k = /^min/i.test(m[2]) ? 1 : /^(hora|hour)/i.test(m[2]) ? 60 : 1440;
    return Number(m[1]) * k;
  }
  const DAMAGE = ['acid', 'cold', 'fire', 'lightning', 'poison', 'thunder'];
  const DAMAGE_ES = {
    acid: 'ácido',
    cold: 'frío',
    fire: 'fuego',
    lightning: 'relámpago',
    poison: 'veneno',
    thunder: 'trueno',
  };
  const EN = Object.fromEntries(Object.entries(DAMAGE_ES).map(([k, v]) => [v, k]));
  // Tipos de daño del conjuro que se pueden transmutar, en inglés (el catálogo los guarda en castellano).
  const typesOf = sp =>
    (sp.damageTypes || [])
      .map(t => String(t).toLowerCase())
      .map(t => (DAMAGE.includes(t) ? t : EN[t]))
      .filter(Boolean);

  // when: 'cast' (se elige al lanzar) o 'roll' (al tirar). ok(sp) devuelve '' o por qué no aplica.
  const OPTIONS = {
    careful: {
      en: 'Careful Spell',
      name: 'Conjuro cuidadoso',
      cost: () => 1,
      when: 'cast',
      ok: sp => (saves(sp) ? '' : 'solo conjuros con salvación'),
      text: s => `Hasta ${Math.max(1, mod(s))} criatura(s) que elijas superan automáticamente la salvación.`,
    },
    distant: {
      en: 'Distant Spell',
      name: 'Conjuro distante',
      cost: () => 1,
      when: 'cast',
      ok: sp => (touch(sp) || (feet(sp.range) || 0) >= 5 ? '' : 'solo alcance de toque o de 5 pies o más'),
      text: () => 'Duplica el alcance; un conjuro de toque llega a 30 pies.',
    },
    empowered: {
      en: 'Empowered Spell',
      name: 'Conjuro potenciado',
      cost: () => 1,
      when: 'roll',
      combine: true,
      ok: () => '',
      text: s => `Al tirar el daño, repetís hasta ${Math.max(1, mod(s))} dado(s) y usás los nuevos.`,
    },
    extended: {
      en: 'Extended Spell',
      name: 'Conjuro extendido',
      cost: () => 1,
      when: 'cast',
      ok: sp => (minutes(sp.duration) >= 1 ? '' : 'solo duraciones de 1 minuto o más'),
      text: () => 'Duplica la duración (máximo 24 horas).',
    },
    heightened: {
      en: 'Heightened Spell',
      name: 'Conjuro intensificado',
      cost: () => 3,
      when: 'cast',
      ok: sp => (saves(sp) ? '' : 'solo conjuros con salvación'),
      text: () => 'Un objetivo tiene desventaja en su primera salvación contra el conjuro.',
    },
    quickened: {
      en: 'Quickened Spell',
      name: 'Conjuro acelerado',
      cost: () => 2,
      when: 'cast',
      ok: sp => (sp.time === 'Acción' ? '' : 'solo conjuros de 1 acción'),
      text: () => 'Lo lanzás con una acción adicional.',
    },
    seeking: {
      en: 'Seeking Spell',
      name: 'Conjuro rastreador',
      cost: () => 2,
      when: 'roll',
      combine: true,
      ok: sp => (attacks(sp) ? '' : 'solo conjuros con tirada de ataque'),
      text: () => 'Si fallás el ataque de conjuro, repetís el d20 y usás el nuevo resultado.',
    },
    subtle: {
      en: 'Subtle Spell',
      name: 'Conjuro sutil',
      cost: () => 1,
      when: 'cast',
      ok: () => '',
      text: () => 'Sin componentes verbales ni somáticos: no se puede contraconjurar por verte lanzarlo.',
    },
    transmuted: {
      en: 'Transmuted Spell',
      name: 'Conjuro transmutado',
      cost: () => 1,
      when: 'cast',
      ok: sp =>
        !typesOf(sp).length
          ? 'solo daño de ácido, frío, fuego, relámpago, veneno o trueno'
          : typesOf(sp).length >= DAMAGE.length
            ? 'el conjuro ya deja elegir el tipo'
            : '',
      text: () => 'Cambiás ese tipo de daño por otro de la lista.',
    },
    twinned: {
      en: 'Twinned Spell',
      name: 'Conjuro duplicado',
      cost: (sp, slot) => Math.max(1, slot || sp.level),
      when: 'cast',
      ok: sp => (self(sp) ? 'no sirve con alcance personal' : ''),
      text: () => 'Un segundo objetivo dentro del alcance (solo conjuros de un único objetivo).',
    },
  };
  const KEYS = Object.keys(OPTIONS);
  const byEnglish = Object.fromEntries(KEYS.map(k => [OPTIONS[k].en, k]));
  function mod(s) {
    const st = root.Rules.stats(s);
    return st.mods.cha;
  }
  const optionId = key =>
    root.ClassData?.options.find(o => o.english === OPTIONS[key].en && o.types.includes('MM'))?.id;
  // Opciones aprendidas: de la clase (y de un hechicero secundario) y de la dote.
  function known(s) {
    const ids = new Set(s.metamagicAdept || []);
    for (const v of C()?.views ? C().views(s) : [s]) for (const id of v.classChoices?.Metamagic || []) ids.add(id);
    return KEYS.filter(k => {
      const id = optionId(k);
      return id && ids.has(id);
    });
  }
  const knows = (s, key) => known(s).includes(key);
  const hasAdept = s => (s.progression?.learnedFeats || []).includes('metamagic-adept');
  // Puntos disponibles: los de la dote y los de hechicería.
  function pools(s) {
    return (C()?.resources(s) || [])
      .filter(r => r.id === 'feat-metamagic-adept' || r.id === 'sorcery')
      .sort((a, b) => (a.id === 'sorcery') - (b.id === 'sorcery'))
      .map(r => ({ r, left: C().spent(s, r) === null ? 0 : Math.max(0, r.max - C().spent(s, r)) }));
  }
  const points = s => pools(s).reduce((a, p) => a + p.left, 0);
  function pay(s, cost, label = 'Metamagia') {
    if (!cost) return;
    if (points(s) < cost) throw Error(`${label}: necesitás ${cost} punto(s) de hechicería y te quedan ${points(s)}.`);
    let left = cost;
    for (const p of pools(s)) {
      const k = Math.min(p.left, left);
      if (k) C().spend(s, p.r.id, k);
      left -= k;
    }
  }

  // Valida la elección y devuelve el conjuro de esta vez, el coste y notas para la tirada.
  function plan(s, sp, picks = [], { slot = sp.level, damageType = '' } = {}) {
    const keys = [...new Set(picks)].filter(k => OPTIONS[k]);
    for (const k of keys) {
      if (!knows(s, k)) throw Error(`No conocés ${OPTIONS[k].name}.`);
      const why = OPTIONS[k].ok(sp);
      if (why) throw Error(`${OPTIONS[k].name}: ${why}.`);
    }
    if (keys.filter(k => !OPTIONS[k].combine).length > 1)
      throw Error('Solo podés usar una opción de Metamagia por lanzamiento.');
    const cost = keys.filter(k => OPTIONS[k].when === 'cast').reduce((a, k) => a + OPTIONS[k].cost(sp, slot), 0);
    const out = { ...sp };
    const notes = [];
    if (keys.includes('quickened')) {
      out.time = 'Adicional';
      out.castingTimeEs = '1 acción adicional';
    }
    if (keys.includes('distant'))
      out.range = touch(sp)
        ? '30 pies'
        : String(sp.range)
            .replace(/(\d),(\d)/g, '$1$2')
            .replace(/(\d+)(\s*(?:pies|feet|ft|millas?|miles?))/i, (_, a, b) => a * 2 + b);
    if (keys.includes('extended')) {
      const m = Math.min(1440, minutes(sp.duration) * 2);
      const text =
        m >= 1440 ? '24 horas' : m >= 60 && m % 60 === 0 ? `${m / 60} hora${m === 60 ? '' : 's'}` : `${m} minutos`;
      out.duration = String(sp.duration).replace(/\d+\s*(?:minutos?|minutes?|horas?|hours?|d[ií]as?|days?)/i, text);
    }
    if (keys.includes('subtle')) {
      const material = /\bM\b.*$/.exec(sp.components || '')?.[0];
      out.components = material ? material + ' (sin V ni S: sutil)' : 'Sin componentes (sutil)';
    }
    let types = null;
    if (keys.includes('transmuted')) {
      if (!DAMAGE.includes(damageType)) throw Error('Conjuro transmutado: elegí el tipo de daño nuevo.');
      types = DAMAGE_ES[damageType];
      out.damageTypes = (sp.damageTypes || []).map(t => (typesOf({ damageTypes: [t] }).length ? types : t));
      notes.push(`daño de ${types}`);
    }
    for (const k of keys)
      if (OPTIONS[k].when === 'cast' && k !== 'transmuted') notes.push(OPTIONS[k].name.toLowerCase());
    out.name = sp.name;
    return {
      sp: out,
      cost,
      keys,
      label: keys.length ? ' · ' + keys.map(k => OPTIONS[k].name).join(', ') : '',
      roll: {
        careful: keys.includes('careful') ? Math.max(1, mod(s)) : 0,
        heightened: keys.includes('heightened'),
        twinned: keys.includes('twinned'),
        types,
        from: typesOf(sp).map(t => DAMAGE_ES[t]),
      },
      notes,
    };
  }

  // Casillas para el modal de «Lanzar».
  function castFields(s, sp) {
    const list = known(s).filter(k => OPTIONS[k].when === 'cast');
    if (!list.length) return '';
    const left = points(s);
    const rows = list
      .map(k => {
        const o = OPTIONS[k],
          why = o.ok(sp),
          cost = o.cost(sp, sp.level);
        return `<label class="check ${why ? 'muted' : ''}"><input type="checkbox" name="mm" value="${k}" ${why ? 'disabled' : ''} data-mm-cost="${k === 'twinned' ? 'level' : cost}">${esc(o.name)} · ${k === 'twinned' ? 'puntos = nivel del espacio' : cost + ' punto' + (cost > 1 ? 's' : '')}<small>${esc(why ? 'No aplica: ' + why : o.text(s))}</small></label>`;
      })
      .join('');
    const trans =
      list.includes('transmuted') && !OPTIONS.transmuted.ok(sp)
        ? `<label class="field">Conjuro transmutado: daño nuevo<select name="mmType">${DAMAGE.filter(
            t => !typesOf(sp).includes(t),
          )
            .map(t => `<option value="${t}">${DAMAGE_ES[t]}</option>`)
            .join('')}</select></label>`
        : '';
    return `<fieldset class="metamagic-pick"><legend>Metamagia · te quedan ${left} punto(s)</legend>${rows}${trans}<p class="small">Una opción por lanzamiento.${known(s).some(k => OPTIONS[k].when === 'roll') ? ' Potenciado y Rastreador se eligen al tirar.' : ''}</p></fieldset>`;
  }
  function fromForm(fd) {
    return { picks: fd.getAll('mm').map(String), damageType: String(fd.get('mmType') || '') };
  }

  // ---------- Fuente de magia ----------
  const CREATE = { 1: 2, 2: 3, 3: 5, 4: 6, 5: 7 };
  // Nivel mínimo de hechicero para crear cada espacio (fe de erratas del PHB).
  const CREATE_MIN = { 1: 2, 2: 3, 3: 5, 4: 7, 5: 9 };
  const sorcererLevel = s =>
    (C()?.views ? C().views(s) : [s]).find(v => (C()?.id ? C().id(v) : v.classId) === 'sorcerer')?.level || 0;
  const sorcery = s => (C()?.resources(s) || []).find(r => r.id === 'sorcery');
  function sorceryLeft(s) {
    const r = sorcery(s);
    if (!r || C().spent(s, r) === null) return 0;
    return r.max - C().spent(s, r);
  }
  const fontSlots = s => (Array.isArray(s.fontSlots) ? s.fontSlots : Array(9).fill(0));
  // Puntos → espacio (hasta nivel 5). Si hay uno gastado de ese nivel, se recupera; si no, queda uno de más
  // que desaparece con el descanso largo.
  function createSlot(s, level) {
    const cost = CREATE[level];
    if (!cost) throw Error('Solo podés crear espacios de nivel 1 a 5.');
    if (!sorcery(s)) throw Error('Fuente de magia es del hechicero de nivel 2.');
    if (sorcererLevel(s) < CREATE_MIN[level])
      throw Error(`Crear un espacio de nivel ${level} requiere hechicero de nivel ${CREATE_MIN[level]}.`);
    if (sorceryLeft(s) < cost)
      throw Error(`Un espacio de nivel ${level} cuesta ${cost} puntos y te quedan ${sorceryLeft(s)}.`);
    C().spend(s, 'sorcery', cost);
    if (n(s.slotsSpent[level - 1]) > 0) s.slotsSpent[level - 1]--;
    else {
      const f = fontSlots(s).slice();
      f[level - 1] = n(f[level - 1]) + 1;
      s.fontSlots = f;
    }
  }
  // Espacio → puntos (tantos como su nivel, sin pasar del máximo).
  function convertSlot(s, level) {
    const r = sorcery(s);
    if (!r) throw Error('Fuente de magia es del hechicero de nivel 2.');
    const max = root.Rules.stats(s).slots[level - 1] || 0,
      extra = n(fontSlots(s)[level - 1]);
    if (!extra && (s.slotsSpent[level - 1] === null || s.slotsSpent[level - 1] >= max))
      throw Error('No te queda un espacio de ese nivel.');
    const spent = C().spent(s, r) || 0;
    if (!spent) throw Error('Ya tenés todos tus puntos de hechicería.');
    if (extra) {
      const f = fontSlots(s).slice();
      f[level - 1] = extra - 1;
      s.fontSlots = f;
    } else s.slotsSpent[level - 1]++;
    s.classSpent[r.id] = Math.max(0, spent - level);
  }
  function validate(s) {
    if (
      s.fontSlots !== undefined &&
      (!Array.isArray(s.fontSlots) ||
        s.fontSlots.length !== 9 ||
        s.fontSlots.some(v => !Number.isInteger(v) || v < 0 || v > 9))
    )
      throw Error('Los espacios creados con Fuente de magia no son válidos.');
    if (
      s.metamagicAdept !== undefined &&
      (!Array.isArray(s.metamagicAdept) ||
        s.metamagicAdept.length > 2 ||
        s.metamagicAdept.some(id => typeof id !== 'string' || id.length > 100))
    )
      throw Error('La metamagia de la dote no es válida.');
  }

  // ---------- En la ficha (Clase y Combate → recursos) ----------
  // Usa las funciones de la página: button(), modal(), select(), commit(), toast(), esc(), state.
  function panel(s) {
    const own = sorcery(s),
      list = known(s),
      adept = hasAdept(s);
    if (!own && !list.length && !adept) return '';
    const rows = list
      .map(
        k =>
          `<li><b>${esc(OPTIONS[k].name)}</b> · ${k === 'twinned' ? 'nivel del conjuro' : OPTIONS[k].cost({ level: 1 }) + ' pt'} — ${esc(OPTIONS[k].text(s))}</li>`,
      )
      .join('');
    const font = fontSlots(s)
      .map((v, i) => (v ? `${v} de nivel ${i + 1}` : ''))
      .filter(Boolean);
    return `<div class="pool-row metamagic-panel"><div class="pool-head"><b>Metamagia</b><span>${points(s)} punto(s)</span></div>${
      rows
        ? `<ul class="small">${rows}</ul><p class="small">Se elige en «Lanzar»; Potenciado y Rastreador, en la tirada.</p>`
        : '<p class="small">Todavía no elegiste opciones de Metamagia.</p>'
    }${font.length ? `<p class="small">Espacios creados: ${font.join(', ')} (desaparecen con el descanso largo).</p>` : ''}<div class="actions">${own ? button('Crear espacio', 'font-create', '') + button('Espacio → puntos', 'font-convert', 'secondary') : ''}${adept ? button('Metamagia de la dote', 'mm-adept', 'secondary') : ''}</div></div>`;
  }
  function install(actions) {
    const g = root;
    const levels = s =>
      Object.keys(CREATE)
        .map(Number)
        .filter(l => sorcererLevel(s) >= CREATE_MIN[l]);
    Object.assign(actions, {
      'font-create': () => {
        const s = state;
        if (!levels(s).length) throw Error('Fuente de magia requiere hechicero de nivel 2.');
        modal(
          'Fuente de magia · crear espacio',
          `<p>Te quedan <b>${sorceryLeft(s)}</b> punto(s). Usa una acción adicional.</p>${select(
            'Espacio',
            'level',
            levels(s).map(l => [l, `Nivel ${l} · ${CREATE[l]} puntos`]),
            1,
          )}`,
          fd => {
            const l = Number(fd.get('level'));
            commit(`Fuente de magia: espacio de nivel ${l} (${CREATE[l]} pt)`, x => {
              if (g.Combat?.data(x).active) g.Combat.use(x, 'bonus', 'Fuente de magia');
              createSlot(x, l);
            });
            toast(`Tenés un espacio de nivel ${l} más.`);
          },
          'Crear',
        );
      },
      'font-convert': () => {
        const s = state,
          d = g.Rules.stats(s),
          opts = Array.from({ length: 9 }, (_, i) => i + 1).filter(
            l =>
              fontSlots(s)[l - 1] > 0 ||
              (d.slots[l - 1] && s.slotsSpent[l - 1] !== null && s.slotsSpent[l - 1] < d.slots[l - 1]),
          );
        if (!opts.length) throw Error('No te quedan espacios para convertir.');
        modal(
          'Fuente de magia · espacio a puntos',
          `<p>Gastás un espacio y ganás tantos puntos como su nivel (sin pasar del máximo). Sin acción.</p>${select(
            'Espacio',
            'level',
            opts.map(l => [l, `Nivel ${l} → ${l} punto(s)`]),
            opts[0],
          )}`,
          fd => {
            const l = Number(fd.get('level'));
            commit(`Fuente de magia: espacio de nivel ${l} → puntos`, x => convertSlot(x, l));
          },
          'Convertir',
        );
      },
      'mm-adept': () => {
        const s = state,
          have = s.metamagicAdept || [];
        modal(
          'Adepto de la metamagia',
          `<p class="small">Elegí dos opciones de Metamagia. Los 2 puntos de la dote solo sirven para Metamagia.</p>${KEYS.map(
            k => {
              const id = optionId(k);
              return id
                ? `<label class="check"><input type="checkbox" name="mm" value="${id}" ${have.includes(id) ? 'checked' : ''}>${esc(OPTIONS[k].name)}<small>${esc(OPTIONS[k].text(s))}</small></label>`
                : '';
            },
          ).join('')}`,
          fd => {
            const ids = fd.getAll('mm').map(String);
            if (ids.length > 2) throw Error('La dote enseña dos opciones.');
            commit('Adepto de la metamagia: opciones', x => (x.metamagicAdept = ids));
          },
          'Guardar',
        );
      },
    });
  }

  root.Metamagic = {
    panel,
    install,
    OPTIONS,
    KEYS,
    byEnglish,
    DAMAGE_ES,
    known,
    knows,
    hasAdept,
    optionId,
    points,
    pay,
    plan,
    castFields,
    fromForm,
    minutes,
    CREATE,
    CREATE_MIN,
    sorcererLevel,
    sorceryLeft,
    fontSlots,
    createSlot,
    convertSlot,
    validate,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.Metamagic;
})(typeof window !== 'undefined' ? window : globalThis);
