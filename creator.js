/* Creador de personajes paso a paso: clase, trasfondo, raza, características, habilidades, conjuros, equipo,
   detalles y revisión. Pantalla completa con tarjetas; el borrador se guarda solo en este dispositivo.
   La ficha final la arma PartyUI.makeCharacter, igual que antes. */
const Creator = (() => {
  'use strict';
  const D = ClassData,
    C = Classes,
    R = Rules,
    DRAFT = 'dnd-creator-draft-v1',
    ABIL = ['str', 'dex', 'con', 'int', 'wis', 'cha'],
    ABIL_SHORT = { str: 'FUE', dex: 'DES', con: 'CON', int: 'INT', wis: 'SAB', cha: 'CAR' },
    COST = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
  const STEPS = [
    ['class', 'Clase'],
    ['background', 'Trasfondo'],
    ['race', 'Raza'],
    ['abilities', 'Características'],
    ['skills', 'Habilidades'],
    ['spells', 'Conjuros'],
    ['equipment', 'Equipo'],
    ['details', 'Detalles'],
    ['review', 'Revisar'],
  ];
  // Resúmenes propios de cada clase (no son texto de los libros).
  const CLASS_INFO = {
    artificer: ['Inventor que infunde objetos con magia y lanza conjuros con Inteligencia.', ['magic', 'support'], 3],
    barbarian: [
      'Entra en furia, aguanta muchísimo daño y pega fuerte cuerpo a cuerpo.',
      ['tank', 'damage', 'starter'],
      1,
    ],
    bard: [
      'Inspira a sus aliados con dados extra, lanza conjuros con Carisma y sabe un poco de todo.',
      ['support', 'magic', 'face'],
      2,
    ],
    cleric: [
      'Canaliza el poder de su dios para curar, proteger y castigar. Usa Sabiduría.',
      ['support', 'magic', 'tank', 'starter'],
      2,
    ],
    druid: ['Magia de la naturaleza y la capacidad de transformarse en bestias.', ['magic', 'support'], 3],
    fighter: [
      'Experto en armas y armaduras; con el tiempo ataca más veces que nadie.',
      ['damage', 'tank', 'starter'],
      1,
    ],
    monk: ['Artes marciales, mucha movilidad y golpes rápidos con su ki.', ['damage'], 2],
    paladin: ['Guerrero sagrado con armadura pesada, curación y golpes divinos.', ['tank', 'damage', 'support'], 2],
    ranger: ['Explorador y cazador, letal a distancia y con algo de magia natural.', ['damage', 'face'], 2],
    rogue: ['Sigilo, pericias y ataques furtivos devastadores.', ['damage', 'face', 'starter'], 1],
    sorcerer: ['Magia innata que puede moldear con metamagia. Usa Carisma.', ['magic'], 2],
    warlock: [
      'Un pacto con un patrón: pocos espacios que vuelven con un descanso corto e invocaciones.',
      ['magic', 'face'],
      2,
    ],
    wizard: ['El lanzador más versátil: aprende conjuros en su libro y los prepara con Inteligencia.', ['magic'], 3],
  };
  const ROLES = {
    damage: 'Pega fuerte',
    tank: 'Aguanta',
    support: 'Cura y apoya',
    magic: 'Magia',
    face: 'Habilidades',
    starter: 'Para empezar',
  };
  const COMPLEXITY = ['', 'Simple', 'Media', 'Compleja'];
  // Características principales (para resaltarlas); las clases sin lanzamiento no la traen en los datos.
  const PRIMARY = {
    barbarian: ['str'],
    fighter: ['str', 'dex'],
    monk: ['dex', 'wis'],
    paladin: ['str', 'cha'],
    ranger: ['dex', 'wis'],
    rogue: ['dex'],
  };
  const primary = c => PRIMARY[c.id] || [c.ability].filter(Boolean);
  const isKey = (c, k) => !!c && (primary(c).includes(k) || c.saves.includes(k));
  const ARMOR = { light: 'ligera', medium: 'media', heavy: 'pesada', shield: 'escudos' };
  const METHODS = {
    array: 'Repartir valores',
    pointbuy: 'Compra de puntos',
    roll: 'Tirar 4d6',
    manual: 'Escribir',
  };

  let d = null,
    step = 0,
    seen = 0,
    ui = { q: '', filter: 'all', family: '', open: '' },
    host = null;

  const esc = v =>
    String(v ?? '').replace(
      /[&<>"']/g,
      c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const canon = v => String(v).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const btn = (label, cr, cls = '', attrs = '') =>
    `<button type="button" class="button ${cls}" data-cr="${cr}" ${attrs}>${label}</button>`;
  const mod = n => Math.floor((Number(n) - 10) / 2);
  // Sin personaje abierto no hay conjuros propios: se busca directo en el catálogo.
  const spellName = id => Catalog.spells.find(x => x.id === id)?.name || '';
  const sign = n => (n >= 0 ? '+' : '') + n;
  const rules = () =>
    window.Cloud?.cleanSettings?.(window.Cloud?.pendingTable?.()?.settings || {})?.abilities || {
      methods: ['array', 'pointbuy', 'roll', 'manual'],
      array: [15, 14, 13, 12, 10, 8],
      points: 27,
      rollMin: 0,
    };
  const table = () => window.Cloud?.pendingTable?.() || null;
  const cls = () => D.classes[d.classId];

  // ---------- Borrador ----------
  function fresh() {
    const t = table(),
      r = rules();
    return {
      name: '',
      classId: '',
      level: t?.settings.startLevel || 1,
      campaignSources: t ? t.settings.sources.slice() : Campaign.selected(state).slice(),
      raceId: '',
      backgroundId: '',
      race: '',
      background: '',
      customRace: false,
      customBackground: false,
      languages: '',
      abilities: { str: '', dex: '', con: '', int: '', wis: '', cha: '' },
      method: ['array', 'pointbuy', 'roll', 'manual'].find(m => r.methods.includes(m)),
      base: { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 },
      assign: {},
      rolls: [],
      rollCount: 0,
      physicalRolls: false,
      applyRacial: true,
      racial: { mode: '21', tasha: false, picks: {} },
      skills: [],
      originSkills: {},
      extraSkills: [],
      raceSkillMode: '',
      spellPicks: { cantrips: [], known: [], prepared: [] },
      equipmentMode: 'standard',
      equipmentChoices: {},
      subclass: '',
      gold: 0,
      gear: '',
      hp: '',
      full: true,
      speed: 30,
      armor: 10,
      bonus: 0,
    };
  }
  function save() {
    if (editing) return;
    try {
      localStorage.setItem(DRAFT, JSON.stringify({ d, step, seen }));
    } catch {}
  }
  // Cambiar raza, trasfondo, nombre e idiomas de la ficha abierta con las mismas tarjetas del creador.
  let editing = false;
  function editOrigins() {
    editing = true;
    d = {
      ...fresh(),
      classId: state.classId,
      level: state.level,
      campaignSources: Campaign.selected(state).slice(),
      raceId: state.raceId || '',
      backgroundId: state.backgroundId || '',
      race: state.race || '',
      background: state.background || '',
      customRace: !state.raceId && !!state.race,
      customBackground: !state.backgroundId && !!state.background,
      name: state.name,
      languages: state.languages || '',
      speed: state.speed,
    };
    step = 0;
    seen = 2;
    ui = { q: '', filter: 'all', family: (Campaign.race(d)?.name || '').split(' · ')[0], open: '' };
    open();
  }
  function finishEdit() {
    const raceChanged = d.raceId !== (state.raceId || '');
    commit('Origen actualizado', s => {
      s.raceId = d.raceId || '';
      s.backgroundId = d.backgroundId || '';
      s.race = Campaign.race(d)?.name || d.race;
      s.background = Campaign.background(d)?.name || d.background;
      s.name = d.name;
      s.languages = d.languages;
      if (raceChanged && Number(d.speed) >= 0) s.speed = Number(d.speed);
    });
    host.hidden = true;
    document.body.classList.remove('creator-open');
    toast('Origen actualizado. Si cambiaron competencias o puntuaciones, ajustalas en Personaje.');
  }
  function originsStep() {
    return `<div class="form-grid">${field('Nombre del personaje', 'name', d.name, 'text', 'maxlength="100" autocomplete="off"')}${field('Idiomas', 'languages', d.languages, 'text', 'maxlength="500" placeholder="Común, Élfico"')}</div>${languageHint()}<p class="small">Las puntuaciones, habilidades y competencias no se recalculan solas: si la raza o el trasfondo nuevos dan otras, ajustalas en Personaje.</p>`;
  }
  function start() {
    editing = false;
    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem(DRAFT) || 'null');
    } catch {}
    if (saved?.d?.abilities) {
      d = { ...fresh(), ...saved.d };
      step = Math.min(saved.step || 0, STEPS.length - 1);
      seen = Math.max(step, saved.seen || 0);
      ui.resumed = true;
    } else restart();
    open();
  }
  function restart() {
    d = fresh();
    step = 0;
    seen = 0;
    ui = { q: '', filter: 'all', family: '', open: '' };
  }
  function open() {
    if (!host) {
      host = document.createElement('div');
      host.id = 'creator';
      host.setAttribute('role', 'dialog');
      host.setAttribute('aria-modal', 'true');
      host.setAttribute('aria-label', 'Crear personaje');
      document.body.append(host);
      host.addEventListener('click', onClick);
      host.addEventListener('change', onChange);
      host.addEventListener('input', onInput);
      host.addEventListener('submit', e => e.preventDefault());
      host.addEventListener('keydown', e => {
        if (e.key === 'Escape') close();
      });
    }
    const m = document.getElementById('modal');
    if (m?.open) m.close();
    host.hidden = false;
    document.body.classList.add('creator-open');
    draw();
  }
  function close() {
    save();
    host.hidden = true;
    document.body.classList.remove('creator-open');
  }

  // ---------- Pasos visibles ----------
  function provisional() {
    try {
      const x = JSON.parse(JSON.stringify(d));
      finalAbilities(x);
      if (ABIL.some(k => !Number(x.abilities[k]))) ABIL.forEach(k => (x.abilities[k] = Number(x.abilities[k]) || 10));
      x.hp = x.hp || suggestedHp(x);
      if (!x.name) x.name = 'Borrador';
      if (!x.race) x.race = 'Borrador';
      return PartyUI.makeCharacter(x);
    } catch {
      return null;
    }
  }
  // ¿Lanza conjuros a este nivel? (el paso de conjuros solo aparece si corresponde)
  function casts() {
    if (!d.classId) return true;
    try {
      const c = C.casting({
        classId: d.classId,
        level: d.level,
        classSubclass: d.subclass,
        classChoices: {},
        multiclass: [],
      });
      return c.type !== 'none' || c.cantrips > 0;
    } catch {
      return true;
    }
  }
  const steps = () =>
    editing
      ? [
          ['background', 'Trasfondo'],
          ['race', 'Raza'],
          ['origins', 'Nombre e idiomas'],
        ]
      : STEPS.filter(([id]) => id !== 'spells' || casts());
  const current = () => steps()[step]?.[0] || 'class';

  // ---------- Características ----------
  function racialPlan(x = d) {
    const race = Campaign.race(x),
      out = { fixed: {}, groups: [], weighted: false };
    if (!race || x.customRace) return out;
    const list = race.ability || [];
    if (list.some(a => a.choose?.weighted)) {
      out.weighted = true;
      out.groups =
        x.racial.mode === '111'
          ? [{ key: 'w1', count: 3, amount: 1, from: ABIL }]
          : [
              { key: 'w2', count: 1, amount: 2, from: ABIL },
              { key: 'w1', count: 1, amount: 1, from: ABIL },
            ];
      return out;
    }
    list.forEach((a, i) => {
      for (const [k, v] of Object.entries(a))
        if (k === 'choose')
          out.groups.push({
            key: 'c' + i,
            count: v.count || 1,
            amount: v.amount || 1,
            from: (v.from || ABIL).filter(f => ABIL.includes(f)),
          });
        else if (ABIL.includes(k)) out.fixed[k] = (out.fixed[k] || 0) + Number(v);
    });
    // Opción de Tasha: los aumentos fijos positivos se pueden mover a otras características.
    if (x.racial.tasha) {
      Object.entries(out.fixed)
        .filter(([, v]) => v > 0)
        .forEach(([k, v]) => {
          out.groups.push({ key: 't' + k, count: 1, amount: v, from: ABIL, was: k });
          delete out.fixed[k];
        });
    }
    return out;
  }
  function racialBonus(x = d) {
    const p = racialPlan(x),
      b = Object.fromEntries(ABIL.map(k => [k, p.fixed[k] || 0]));
    for (const g of p.groups) for (const k of (x.racial.picks[g.key] || []).slice(0, g.count)) if (k) b[k] += g.amount;
    return b;
  }
  function baseScores(x = d) {
    if (x.method === 'pointbuy') return { ...x.base };
    if (x.method === 'manual') return Object.fromEntries(ABIL.map(k => [k, Number(x.base[k]) || 0]));
    const pool = x.method === 'array' ? rules().array : x.rolls.map(r => r.total);
    return Object.fromEntries(
      ABIL.map(k => [k, x.assign[k] !== undefined && x.assign[k] !== '' ? pool[Number(x.assign[k])] : 0]),
    );
  }
  function finalAbilities(x = d) {
    const base = baseScores(x),
      bonus = x.method === 'manual' && !x.applyRacial ? {} : racialBonus(x);
    x.abilities = Object.fromEntries(ABIL.map(k => [k, base[k] ? String(base[k] + (bonus[k] || 0)) : '']));
    return x.abilities;
  }
  function roll4d6() {
    const r = window.roll(6, 4),
      kept = [...r].sort((a, b) => b - a).slice(0, 3);
    return { dice: r, total: kept.reduce((a, b) => a + b, 0) };
  }
  const floor = v => Math.max(rules().rollMin || 0, v);

  // ---------- Dibujo ----------
  function draw() {
    const list = steps(),
      top = host.querySelector('.creator-body')?.scrollTop || 0,
      id = current();
    const rail = list
      .map(([sid, label], i) => {
        const state = i === step ? 'cur' : i <= seen ? 'done' : '';
        return `<button type="button" class="creator-step ${state}" data-cr="go" data-i="${i}" ${i > seen ? 'disabled' : ''}>${i < step || (i <= seen && i !== step) ? '✓ ' : i + 1 + ' · '}${esc(stepLabel(sid, label))}</button>`;
      })
      .join('');
    host.innerHTML = `<div class="creator-shell"><header class="creator-head"><div><p class="eyebrow">${editing ? 'CAMBIAR ORIGEN' : 'CREAR PERSONAJE'} · PASO ${step + 1} DE ${list.length}</p><h1>${esc(title(id))}</h1></div><div class="actions">${editing ? '' : btn('Empezar de nuevo', 'restart', 'secondary')}${btn('Salir', 'close', 'secondary')}</div></header><nav class="creator-rail" aria-label="Pasos">${rail}</nav><form class="creator-body" id="creator-form" novalidate>${ui.resumed ? '<div class="banner"><p>Retomaste tu borrador guardado en este dispositivo.</p></div>' : ''}${step === 0 && !editing ? tablePanel() : ''}<div id="creator-error" class="creator-error" role="alert"></div>${body(id)}</form><footer class="creator-foot"><p class="creator-summary">${summary()}</p><div class="actions">${step ? btn('Atrás', 'back', 'secondary') : ''}${btn(id === 'review' ? 'Crear personaje' : id === 'origins' ? 'Guardar cambios' : 'Siguiente', 'next')}</div></footer></div>`;
    const b = host.querySelector('.creator-body');
    if (b) b.scrollTop = top;
  }
  function stepLabel(id, label) {
    if (id === 'class' && d.classId) return D.classes[d.classId].name;
    if (id === 'background' && (d.backgroundId || d.background)) return Campaign.background(d)?.name || d.background;
    if (id === 'race' && (d.raceId || d.race)) return (Campaign.race(d)?.name || d.race).split(' · ')[0];
    return label;
  }
  function title(id) {
    return {
      class: 'Elegí tu clase',
      background: 'Elegí tu trasfondo',
      race: 'Elegí tu raza',
      abilities: 'Tus características',
      skills: 'Habilidades y competencias',
      spells: 'Tus conjuros',
      equipment: 'Equipo inicial',
      details: 'Nombre y detalles',
      review: 'Revisá y creá',
      origins: 'Nombre e idiomas',
    }[id];
  }
  function summary() {
    const parts = [];
    if (d.classId)
      parts.push(
        cls().name +
          ' ' +
          d.level +
          (d.subclass ? ' (' + (D.subclasses.find(x => x.id === d.subclass)?.name || '') + ')' : ''),
      );
    const bg = Campaign.background(d)?.name || d.background,
      rc = Campaign.race(d)?.name || d.race;
    if (bg) parts.push(bg);
    if (rc) parts.push(rc);
    const ab = finalAbilities(JSON.parse(JSON.stringify(d)));
    if (d.classId && ABIL.every(k => Number(ab[k]))) {
      parts.push('PG ' + suggestedHp({ ...d, abilities: ab }));
      parts.push(ABIL.map(k => ABIL_SHORT[k] + ' ' + ab[k]).join(' '));
    }
    return parts.length ? '<b>Tu personaje:</b> ' + esc(parts.join(' · ')) : 'Elegí una clase para empezar.';
  }
  function searchBar(placeholder, chips = []) {
    return `<div class="creator-search"><input type="search" name="q" value="${esc(ui.q)}" placeholder="${esc(placeholder)}" aria-label="${esc(placeholder)}">${chips.map(([v, l]) => `<button type="button" class="chip ${ui.filter === v ? 'selected' : ''}" data-cr="filter" data-v="${v}" aria-pressed="${ui.filter === v}">${esc(l)}</button>`).join('')}</div>`;
  }
  function body(id) {
    return {
      class: classStep,
      background: backgroundStep,
      race: raceStep,
      abilities: abilityStep,
      skills: skillStep,
      spells: spellStep,
      equipment: equipmentStep,
      details: detailStep,
      review: reviewStep,
      origins: originsStep,
    }[id]();
  }

  // ---------- Mesa y libros (primer paso) ----------
  function tablePanel() {
    const t = table(),
      cloud = !!window.Cloud?.enabled,
      mine = cloud && typeof KEY !== 'undefined' && KEY ? window.Cloud.link(KEY) : null;
    if (t)
      return `<section class="card creator-table"><div class="card-header"><h2>Mesa «${esc(t.name)}»</h2>${btn('Crear sin mesa', 'leave-table', 'secondary')}</div><p class="small">Al terminar, la ficha se suma a esta mesa. Libros del DM: ${t.settings.sources.length >= Object.keys(CampaignData.sources).length ? 'todos' : t.settings.sources.length > 8 ? t.settings.sources.length + ' libros' : esc(t.settings.sources.join(', '))} · nivel inicial ${t.settings.startLevel}.${t.settings.rules ? ' Reglas de la casa: ' + esc(t.settings.rules) : ''}</p></section>`;
    const books = Object.entries(CampaignData.sources)
      .map(
        ([id, n]) =>
          `<label class="check"><input type="checkbox" name="source" value="${id}" ${d.campaignSources.includes(id) ? 'checked' : ''} ${id === 'PHB' ? 'disabled' : ''}>${esc(n)}</label>`,
      )
      .join('');
    return `<section class="card creator-table">${
      cloud
        ? `<h2>¿Es para una mesa?</h2><p class="small">Con el código del DM, el personaje usa sus libros, su nivel inicial y sus reglas de características, y al terminar queda en la mesa.</p><div class="creator-join">${field('Código de la mesa', 'tableCode', ui.code || '', 'text', 'maxlength="6" autocomplete="off" autocapitalize="characters" style="text-transform:uppercase;letter-spacing:.2em"')}${field('Tu nombre (jugador)', 'tableDisplay', ui.display || '', 'text', 'maxlength="100" placeholder="Opcional"')}${btn('Unirme', 'join')}</div>${mine?.code ? `<div class="actions">${btn('Usar la mesa de ' + esc(state?.name || 'tu personaje') + ': «' + esc(mine.campaignName || mine.code) + '»', 'join-current', 'secondary')}</div>` : ''}`
        : ''
    }<details class="creator-books" ${!cloud || ui.booksOpen ? 'open' : ''}><summary>Libros habilitados: ${d.campaignSources.length} de ${Object.keys(CampaignData.sources).length}${cloud ? ' (sin mesa)' : ''}</summary><p class="small">Marcá los que permite tu DM. Filtran las clases, razas, trasfondos y conjuros que ves.</p><div class="source-grid">${books}</div></details></section>`;
  }
  async function join(code) {
    const err = host.querySelector('#creator-error');
    code = String(code || '')
      .trim()
      .toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(code)) throw Error('El código de la mesa tiene 6 letras o números.');
    if (err) err.textContent = 'Conectando con la mesa…';
    const t = await window.Cloud.joinOnly(code, ui.display || '');
    d.campaignSources = t.settings.sources.slice();
    d.level = t.settings.startLevel;
    ui.code = '';
    save();
    draw();
  }

  // ---------- 1. Clase ----------
  function classStep() {
    const q = canon(ui.q);
    const cards = Object.values(D.classes)
      .filter(c => !q || canon(c.name + ' ' + c.english).includes(q))
      .filter(c => ui.filter === 'all' || CLASS_INFO[c.id]?.[1].includes(ui.filter))
      .map(c => {
        const [, roles, cx] = CLASS_INFO[c.id] || ['', [], 2];
        return `<button type="button" class="creator-card ${d.classId === c.id ? 'selected' : ''}" data-cr="class" data-id="${c.id}" aria-pressed="${d.classId === c.id}"><span class="creator-card-title">${esc(c.name)}</span><span class="creator-meta">d${c.die} · ${esc(
          primary(c)
            .map(k => R.attrs[k])
            .join(' o '),
        )}</span><span class="creator-tags">${roles
          .filter(r => r !== 'starter')
          .map(r => `<span class="tag">${ROLES[r]}</span>`)
          .join('')}<span class="tag cx-${cx}">${COMPLEXITY[cx]}</span></span></button>`;
      })
      .join('');
    let detail = '';
    if (d.classId) {
      const c = cls(),
        subs = D.subclasses.filter(x => x.classId === c.id && Campaign.enabled(d, x)),
        armor = String(c.armor || '')
          .split(/[\n,]/)
          .map(x => ARMOR[x.trim()] || '')
          .filter(Boolean);
      const feats = [1, 2, 3]
        .map(l => {
          const fs = (c.features || []).filter(f => f.level === l && !f.optional).map(f => f.name);
          return fs.length ? `<li><b>Nivel ${l}:</b> ${esc(fs.join(', '))}</li>` : '';
        })
        .join('');
      detail = `<section class="card creator-detail"><h2>${esc(c.name)}</h2><p>${esc(CLASS_INFO[c.id]?.[0] || '')}</p><p class="small">Dado de golpe d${c.die} · Salvaciones: ${c.saves.map(s => R.attrs[s]).join(', ')} · Armadura: ${armor.length ? esc(armor.join(', ')) : 'ninguna'}${c.caster ? ' · Lanza conjuros' : ''}</p><ul class="creator-list">${feats}</ul><p class="small">Subclase en nivel ${c.subclassLevel}: ${subs.length} opciones en tus libros.</p><div class="form-grid">${field('Nivel inicial', 'level', d.level, 'number', 'min="1" max="20" inputmode="numeric"')}</div>${
        d.level >= c.subclassLevel
          ? `<h3>Subclase</h3><div class="creator-grid small-cards">${subs
              .map(
                x =>
                  `<button type="button" class="creator-card ${d.subclass === x.id ? 'selected' : ''}" data-cr="subclass" data-id="${x.id}" aria-pressed="${d.subclass === x.id}"><span class="creator-card-title">${esc(x.name)}</span><span class="creator-meta">${esc(x.source)}</span></button>`,
              )
              .join('')}</div>`
          : ''
      }</section>`;
    }
    return (
      searchBar(
        'Buscar clase',
        [['all', 'Todas'], ...Object.entries(ROLES)].map(([k, v]) => [k, v]),
      ) + `<div class="creator-grid">${cards || '<p class="muted">Ninguna clase coincide.</p>'}</div>${detail}`
    );
  }

  // ---------- 2. Trasfondo ----------
  function skillNames(row) {
    const g = (row?.skillProficiencies || [])[0] || {};
    const fixed = Object.keys(g).filter(k => g[k] === true);
    const label = k =>
      R.skills.find(s => s[0] === ({ 'animal handling': 'animal', 'sleight of hand': 'sleight' }[k] || k))?.[1] || k;
    return [
      ...fixed.map(label),
      ...(g.choose ? ['elegí ' + (g.choose.count || 1)] : []),
      ...(g.any ? ['elegí ' + g.any] : []),
    ].join(', ');
  }
  function backgroundStep() {
    const q = canon(ui.q);
    const rows = CampaignData.backgrounds
      .filter(b => Campaign.enabled(d, b) || b.id === d.backgroundId)
      .filter(b => !q || canon(b.name + ' ' + b.english).includes(q))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
    const cards = rows
      .map(
        b =>
          `<button type="button" class="creator-card ${d.backgroundId === b.id ? 'selected' : ''}" data-cr="background" data-id="${b.id}" aria-pressed="${d.backgroundId === b.id}"><span class="creator-card-title">${esc(b.name)}</span><span class="creator-meta">${esc(skillNames(b))}</span><span class="creator-meta">${esc(b.sources.join(' / '))}</span></button>`,
      )
      .join('');
    const custom = `<button type="button" class="creator-card ${d.customBackground ? 'selected' : ''}" data-cr="background" data-id="" aria-pressed="${d.customBackground}"><span class="creator-card-title">Personalizado</span><span class="creator-meta">Uno que acordaste con el DM</span></button>`;
    const row = Campaign.background(d);
    const detail = d.customBackground
      ? `<section class="card creator-detail">${field('Nombre del trasfondo', 'background', d.background, 'text', 'maxlength="200"')}<p class="small">Sus habilidades se marcan en el paso de habilidades, en «Otras competencias».</p></section>`
      : row
        ? `<section class="card creator-detail"><h2>${esc(row.name)}</h2>${Campaign.originInfo(row, 'background')}</section>`
        : '';
    return (
      searchBar('Buscar trasfondo') +
      `<p class="small">${rows.length} trasfondos en los libros habilitados.</p><div class="creator-grid">${custom}${cards}</div>${detail}`
    );
  }

  // ---------- 3. Raza (agrupada por familia) ----------
  function families() {
    const map = new Map();
    for (const r of CampaignData.races) {
      if (!Campaign.enabled(d, r) && r.id !== d.raceId) continue;
      const [fam, ...rest] = r.name.split(' · ');
      if (!map.has(fam)) map.set(fam, []);
      map.get(fam).push({ row: r, label: (rest.join(' · ') || 'base') + ' · ' + r.source });
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'es'));
  }
  function raceStep() {
    const q = canon(ui.q),
      all = families(),
      chosen = Campaign.race(d),
      chosenFam = chosen?.name.split(' · ')[0];
    const fam = ui.family || chosenFam || '';
    const list = all.filter(
      ([f, vs]) => !q || canon(f + ' ' + vs.map(v => v.row.english + ' ' + v.label).join(' ')).includes(q),
    );
    const cards = list
      .map(([f, vs]) => {
        const sources = [...new Set(vs.map(v => v.row.source))];
        return `<button type="button" class="creator-card ${fam === f ? 'selected' : ''}" data-cr="family" data-id="${esc(f)}" aria-pressed="${fam === f}"><span class="creator-card-title">${esc(f)}</span><span class="creator-meta">${vs.length > 1 ? vs.length + ' variantes' : 'Sin variantes'}</span><span class="creator-meta">${esc(sources.join(', '))}</span></button>`;
      })
      .join('');
    const custom = `<button type="button" class="creator-card ${d.customRace ? 'selected' : ''}" data-cr="family" data-id="" aria-pressed="${d.customRace}"><span class="creator-card-title">Personalizada</span><span class="creator-meta">Escribís el nombre</span></button>`;
    let detail = '';
    if (d.customRace)
      detail = `<section class="card creator-detail">${field('Nombre de la raza o linaje', 'race', d.race, 'text', 'maxlength="150"')}<p class="small">Sus aumentos y competencias se registran a mano en los pasos siguientes.</p></section>`;
    else if (fam) {
      const vs = all.find(([f]) => f === fam)?.[1] || [];
      detail = `<section class="card creator-detail"><h2>${esc(fam)}</h2>${vs.length > 1 ? `<p class="small">Elegí una variante:</p><div class="chips">${vs.map(v => `<button type="button" class="chip ${d.raceId === v.row.id ? 'selected' : ''}" data-cr="race" data-id="${v.row.id}" aria-pressed="${d.raceId === v.row.id}">${esc(v.label)}</button>`).join('')}</div>` : ''}${chosen && chosen.name.split(' · ')[0] === fam ? Campaign.originInfo(chosen, 'race') : vs.length === 1 ? '' : '<p class="small">Tocá una variante para ver sus rasgos.</p>'}</section>`;
    }
    return (
      searchBar('Buscar raza o variante') +
      `<p class="small">${list.length} razas y linajes en los libros habilitados.</p><div class="creator-grid">${custom}${cards}</div>${detail}`
    );
  }
  function pickRace(id) {
    const before = d.raceId;
    d.raceId = id;
    d.customRace = false;
    d.race = Campaign.race(d)?.name || '';
    if (before !== id) {
      d.raceSkillMode = '';
      d.racial = { mode: '21', tasha: false, picks: {} };
      const rs = Campaign.race(d)?.speed;
      d.speed = typeof rs === 'number' ? rs : rs?.walk || 30;
      CreationSkills.reconcile(d);
    }
  }

  // ---------- 4. Características ----------
  function abilityStep() {
    const r = rules(),
      c = d.classId ? cls() : null,
      methods = ['array', 'pointbuy', 'roll', 'manual'].filter(m => r.methods.includes(m));
    if (!methods.includes(d.method)) d.method = methods[0];
    const tabs = `<div class="chips creator-methods">${methods.map(m => `<button type="button" class="chip ${d.method === m ? 'selected' : ''}" data-cr="method" data-v="${m}" aria-pressed="${d.method === m}">${METHODS[m]}</button>`).join('')}</div>`;
    let input = '';
    const assignSelects = pool =>
      `<div class="creator-abilities">${ABIL.map(k => {
        const taken = new Set(
          ABIL.filter(o => o !== k && d.assign[o] !== undefined && d.assign[o] !== '').map(o => String(d.assign[o])),
        );
        return `<label class="field ${isKey(c, k) ? 'key-ability' : ''}">${R.attrs[k]}<select name="assign:${k}"><option value="">—</option>${pool
          .map((v, i) =>
            taken.has(String(i))
              ? ''
              : `<option value="${i}" ${String(d.assign[k]) === String(i) ? 'selected' : ''}>${v}</option>`,
          )
          .join('')}</select></label>`;
      }).join('')}</div>`;
    if (d.method === 'array')
      input = `<p class="small">Repartí estos valores${table() ? ' del DM' : ''}: <b>${r.array.join(', ')}</b>. Cada uno se usa una vez.</p>${assignSelects(r.array)}`;
    if (d.method === 'pointbuy') {
      const spent = ABIL.reduce((t, k) => t + COST[d.base[k]], 0);
      input = `<p class="small">Cada puntuación va de 8 a 15. Puntos: <b>${spent} de ${r.points}</b>.</p><div class="creator-abilities">${ABIL.map(
        k =>
          `<div class="creator-buy ${isKey(c, k) ? 'key-ability' : ''}"><span>${R.attrs[k]}</span><div class="actions">${btn('−', 'buy', 'secondary', `data-k="${k}" data-v="-1" aria-label="Bajar ${R.attrs[k]}" ${d.base[k] <= 8 ? 'disabled' : ''}`)}<b>${d.base[k]}</b>${btn('+', 'buy', 'secondary', `data-k="${k}" data-v="1" aria-label="Subir ${R.attrs[k]}" ${d.base[k] >= 15 || spent + COST[d.base[k] + 1] - COST[d.base[k]] > r.points ? 'disabled' : ''}`)}</div></div>`,
      ).join('')}</div>`;
    }
    if (d.method === 'roll') {
      const rolled = d.rolls.length === 6;
      input = `<p class="small">4d6 por puntuación, descartando el dado más bajo.${r.rollMin ? ' Regla de la mesa: ningún resultado queda por debajo de <b>' + r.rollMin + '</b>.' : ''}</p><label class="check"><input type="checkbox" name="physicalRolls" ${d.physicalRolls ? 'checked' : ''}>Tiro mis dados físicos y anoto los seis resultados</label>${
        d.physicalRolls
          ? `<div class="creator-abilities">${[0, 1, 2, 3, 4, 5].map(i => field('Tirada ' + (i + 1), 'roll:' + i, d.rolls[i]?.raw ?? '', 'number', 'min="3" max="18" inputmode="numeric"')).join('')}</div>`
          : `<div class="actions">${btn(rolled ? 'Volver a tirar' : 'Tirar las seis', 'roll', rolled ? 'secondary' : '')}</div>${rolled ? `<div class="chips">${d.rolls.map(x => `<span class="chip" title="${x.dice?.join(' ') || ''}">${x.total}${x.dice ? ' <small>(' + x.dice.join(' ') + ')</small>' : ''}</span>`).join('')}</div>` : ''}`
      }${d.rollCount > 1 ? `<p class="small">Tiradas hechas: ${d.rollCount}. El DM lo ve en la revisión.</p>` : ''}${rolled ? assignSelects(d.rolls.map(x => x.total)) : ''}`;
    }
    if (d.method === 'manual')
      input = `<p class="small">Escribí tus puntuaciones (por ejemplo, si tiraste en la mesa).</p><div class="creator-abilities">${ABIL.map(k => `<label class="field ${isKey(c, k) ? 'key-ability' : ''}">${R.attrs[k]}<input type="number" name="base:${k}" value="${esc(d.base[k] || '')}" min="1" max="30" inputmode="numeric"></label>`).join('')}</div><label class="check"><input type="checkbox" name="applyRacial" ${d.applyRacial ? 'checked' : ''}>Sumar los aumentos de mi raza (desmarcalo si ya los incluiste)</label>`;
    return tabs + input + racialPanel() + abilityTable();
  }
  function racialPanel() {
    if (d.method === 'manual' && !d.applyRacial) return '';
    const race = Campaign.race(d);
    if (!race || d.customRace)
      return '<section class="card creator-detail"><h3>Aumentos de raza</h3><p class="small">Con una raza personalizada, escribí los aumentos en las puntuaciones o elegí «Escribir».</p></section>';
    const p = racialPlan();
    const fixed = Object.entries(p.fixed)
      .map(([k, v]) => `<span class="chip selected">${R.attrs[k]} ${sign(v)}</span>`)
      .join('');
    const used = g => new Set(p.groups.filter(o => o.key !== g.key).flatMap(o => d.racial.picks[o.key] || []));
    const groups = p.groups
      .map(g => {
        const picks = d.racial.picks[g.key] || [];
        return `<div class="creator-racial"><p class="small">${g.was ? 'Tu ' + sign(g.amount) + ' de ' + R.attrs[g.was] + ', a la característica que elijas' : g.count > 1 ? g.count + ' características distintas' : 'Una característica'} ${sign(g.amount)}:</p><div class="creator-abilities">${Array.from(
          { length: g.count },
          (_, i) =>
            `<select name="rp:${g.key}:${i}" aria-label="Aumento ${sign(g.amount)}"><option value="">Elegí…</option>${g.from
              .filter(k => !used(g).has(k) && !(k in p.fixed) && (picks[i] === k || !picks.includes(k)))
              .map(k => `<option value="${k}" ${picks[i] === k ? 'selected' : ''}>${R.attrs[k]}</option>`)
              .join('')}</select>`,
        ).join('')}</div></div>`;
      })
      .join('');
    const hasFixed = (race.ability || []).some(a => Object.entries(a).some(([k, v]) => ABIL.includes(k) && v > 0));
    return `<section class="card creator-detail"><h3>Aumentos de ${esc(race.name)}</h3>${
      p.weighted
        ? `<div class="chips">${[
            ['21', '+2 y +1'],
            ['111', '+1, +1 y +1'],
          ]
            .map(([v, l]) => {
              const on = (d.racial.mode === '111') === (v === '111');
              return `<button type="button" class="chip ${on ? 'selected' : ''}" data-cr="wmode" data-v="${v}" aria-pressed="${on}">${l}</button>`;
            })
            .join('')}</div>`
        : ''
    }${fixed ? `<div class="chips">${fixed}</div>` : ''}${groups}${hasFixed && !p.weighted ? `<label class="check"><input type="checkbox" name="tasha" ${d.racial.tasha ? 'checked' : ''}>Reubicar los aumentos fijos (opción de Tasha, si tu DM la permite)</label>` : ''}</section>`;
  }
  function abilityTable() {
    const base = baseScores(),
      bonus = d.method === 'manual' && !d.applyRacial ? {} : racialBonus(),
      c = d.classId ? cls() : null;
    return `<div class="creator-scores">${ABIL.map(k => {
      const total = base[k] ? base[k] + (bonus[k] || 0) : 0;
      return `<div class="creator-score ${isKey(c, k) ? 'key-ability' : ''}"><span>${ABIL_SHORT[k]}</span><b>${total || '—'}</b><small>${total ? sign(mod(total)) : ''}${bonus[k] ? ' · ' + sign(bonus[k]) + ' raza' : ''}</small></div>`;
    }).join('')}</div>${
      c
        ? `<p class="small">Resaltadas: lo que más usa ${esc(c.name)} (${esc(
            primary(c)
              .map(k => R.attrs[k])
              .join(' o '),
          )}) y sus salvaciones.</p>`
        : ''
    }`;
  }

  // ---------- 5. Habilidades ----------
  function skillStep() {
    CreationSkills.reconcile(d);
    return `<div id="creation-skills">${PartyUI.creationSkillFields(d)}</div>`;
  }
  function collectSkills(fd) {
    d.skills = fd.getAll('skill');
    d.extraSkills = fd.getAll('extraSkill');
    d.raceSkillMode = String(fd.get('raceSkillMode') || d.raceSkillMode || '');
    d.originSkills = Object.fromEntries(
      CreationSkills.plan(d)
        .groups.filter(g => g.id !== 'class')
        .map(g => [g.id, fd.getAll('origin:' + g.id)]),
    );
    CreationSkills.reconcile(d);
  }

  // ---------- 6. Conjuros ----------
  function spellLimits(p) {
    const st = R.stats(p),
      type = C.casting(p).type;
    return {
      type,
      cantrips: st.cantrips,
      known:
        type === 'known' ? st.known : type === 'book' ? 6 + 2 * (p.level - 1) : type === 'prepared' ? st.prepared : 0,
      prepared: type === 'book' ? st.prepared : 0,
      maxLevel: st.slots.length,
    };
  }
  function spellStep() {
    const p = provisional();
    if (!p) return '<p>Completá los pasos anteriores para ver tus conjuros.</p>';
    const L = spellLimits(p),
      g = C.granted(p),
      auto = new Set([...g.prepared, ...g.known]),
      q = canon(ui.q);
    const pool = R.allSpells(p)
      .filter(
        sp =>
          Campaign.enabled(p, sp) &&
          (C.member(sp, p) || g.expanded.includes(sp.id)) &&
          sp.level <= L.maxLevel &&
          !auto.has(sp.id),
      )
      .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, 'es'));
    const pick = d.spellPicks;
    const section = (kind, label, list, max, hint) => {
      const mine = pick[kind];
      const shown = list.filter(
        sp => !q || canon(sp.name + ' ' + (sp.english || '')).includes(q) || mine.includes(sp.id),
      );
      return `<section class="creator-spells"><div class="card-header"><h2>${label}</h2><span class="tag ${mine.length > max ? 'warn' : ''}">${mine.length} de ${max}</span></div>${hint ? `<p class="small">${hint}</p>` : ''}<div class="creator-grid small-cards">${shown
        .map(
          sp =>
            `<button type="button" class="creator-card ${mine.includes(sp.id) ? 'selected' : ''}" data-cr="spell" data-kind="${kind}" data-id="${sp.id}" aria-pressed="${mine.includes(sp.id)}"><span class="creator-card-title">${esc(sp.name)}</span><span class="creator-meta">${sp.level ? 'Nivel ' + sp.level : 'Truco'} · ${esc(sp.school || '')} · ${esc(sp.time)}</span><span class="creator-brief">${esc(sp.brief || '')}</span></button>`,
        )
        .join('')}</div></section>`;
    };
    let out = searchBar('Buscar conjuro');
    if (auto.size)
      out += `<p class="small"><b>Siempre preparados por tu subclase:</b> ${[...auto].map(id => esc(spellName(id) || id)).join(', ')}.</p>`;
    if (L.cantrips)
      out += section(
        'cantrips',
        'Trucos',
        pool.filter(sp => sp.level === 0),
        L.cantrips,
      );
    const leveled = pool.filter(sp => sp.level > 0);
    if (L.type === 'known') out += section('known', 'Conjuros conocidos', leveled, L.known);
    if (L.type === 'prepared')
      out += section(
        'known',
        'Conjuros preparados',
        leveled,
        L.known,
        'Podés cambiarlos después de cada descanso largo.',
      );
    if (L.type === 'book') {
      out += section('known', 'Tu libro de conjuros', leveled, L.known);
      const book = leveled.filter(sp => pick.known.includes(sp.id));
      out += book.length
        ? section('prepared', 'Preparados hoy', book, L.prepared, 'Elegí cuáles del libro tenés preparados.')
        : '<p class="small">Elegí primero los conjuros de tu libro para preparar algunos.</p>';
    }
    return out + '<p class="small">Podés dejar elecciones para después: la ficha te las va a recordar.</p>';
  }

  // ---------- 7. Equipo ----------
  function equipmentStep() {
    return `<div id="creation-equipment">${EquipmentUI.creationFields(d)}</div>`;
  }

  // ---------- 8. Detalles ----------
  function suggestedHp(x = d) {
    const c = D.classes[x.classId];
    if (!c) return 0;
    const con = mod(Number(x.abilities.con) || 10);
    return Math.max(1, c.die + (x.level - 1) * (c.die / 2 + 1) + x.level * con);
  }
  function languageHint() {
    const lines = [Campaign.race(d), Campaign.background(d)]
      .filter(Boolean)
      .map(x => {
        const div = document.createElement('div');
        div.innerHTML = Campaign.originInfo(x, 'background');
        const p = [...div.querySelectorAll('p')].find(e => e.textContent.startsWith('Idiomas:'));
        return p ? x.name + ': ' + p.textContent.replace('Idiomas: ', '') : '';
      })
      .filter(Boolean);
    return lines.length ? `<p class="small">Según tu raza y trasfondo: ${esc(lines.join(' · '))}.</p>` : '';
  }
  function detailStep() {
    finalAbilities();
    const hp = suggestedHp();
    if (!d.hp) d.hp = hp;
    return `<div class="form-grid">${field('Nombre del personaje', 'name', d.name, 'text', 'maxlength="100" autocomplete="off"')}${field('Idiomas', 'languages', d.languages, 'text', 'maxlength="500" placeholder="Común, Élfico"')}</div>${languageHint()}<h3 class="section-space">Puntos de golpe y velocidad</h3><p class="small">Sugeridos: ${hp} (máximo del dado en nivel 1${d.level > 1 ? ' y el promedio en los siguientes' : ''}, más Constitución). Si tu mesa tira los PG, escribí el resultado.</p><div class="form-grid">${field('PG máximos', 'hp', d.hp, 'number', 'min="1" max="2000" inputmode="numeric"')}${field('Velocidad (pies)', 'speed', d.speed, 'number', 'min="0" max="500" inputmode="numeric"')}</div><label class="check"><input type="checkbox" name="full" ${d.full ? 'checked' : ''}>Empezar con PG, espacios y recursos completos</label>`;
  }

  // ---------- 9. Revisión ----------
  function reviewStep() {
    finalAbilities();
    const c = cls(),
      sub = D.subclasses.find(x => x.id === d.subclass),
      sp = [...d.spellPicks.cantrips, ...d.spellPicks.known].map(id => spellName(id)).filter(Boolean);
    return `<section class="card"><h2>${esc(d.name || 'Sin nombre')}</h2><p>${esc(c.name)} ${d.level}${sub ? ' · ' + esc(sub.name) : ''} · ${esc(Campaign.race(d)?.name || d.race)} · ${esc(Campaign.background(d)?.name || d.background)}</p><div class="creator-scores">${ABIL.map(k => `<div class="creator-score"><span>${ABIL_SHORT[k]}</span><b>${d.abilities[k]}</b><small>${sign(mod(d.abilities[k]))}</small></div>`).join('')}</div><p class="small">Método: ${METHODS[d.method]}${d.method === 'roll' ? ' · tiradas: ' + d.rolls.map(r => r.total).join(', ') + (d.rollCount > 1 ? ' · se tiró ' + d.rollCount + ' veces' : '') : ''}${d.racial.tasha ? ' · aumentos reubicados (Tasha)' : ''}.</p><p><b>Habilidades:</b> ${
      CreationSkills.total(d)
        .map(k => esc(CreationSkills.label(k)))
        .join(', ') || 'ninguna'
    }.</p>${sp.length ? `<p><b>Conjuros:</b> ${esc(sp.join(', '))}.</p>` : ''}<p><b>PG máximos:</b> ${esc(d.hp)} · <b>Velocidad:</b> ${esc(d.speed)} pies${d.languages ? ' · <b>Idiomas:</b> ' + esc(d.languages) : ''}.</p></section>${EquipmentUI.review(d)}<p class="small">La ficha te recuerda lo que falte: estilos, invocaciones, Pericias y otras elecciones de clase.</p>`;
  }

  // ---------- Validación por paso ----------
  function validate(id) {
    if (id === 'origins' && !d.name.trim()) throw Error('Ponele un nombre a tu personaje.');
    if (id === 'class') {
      if (!d.classId) throw Error('Elegí una clase.');
      if (!Number.isInteger(d.level) || d.level < 1 || d.level > 20) throw Error('El nivel va de 1 a 20.');
      if (d.level >= cls().subclassLevel && !d.subclass) throw Error('A ese nivel elegís subclase.');
    }
    if (id === 'background' && !d.backgroundId && !d.background.trim())
      throw Error('Elegí un trasfondo o escribí uno.');
    if (id === 'race' && !d.raceId && !d.race.trim()) throw Error('Elegí una raza o escribí una.');
    if (id === 'abilities') {
      const r = rules(),
        base = baseScores();
      if (d.method === 'pointbuy' && ABIL.reduce((t, k) => t + COST[d.base[k]], 0) > r.points)
        throw Error('Gastaste más puntos de los permitidos.');
      if (
        (d.method === 'array' || d.method === 'roll') &&
        ABIL.some(k => d.assign[k] === undefined || d.assign[k] === '')
      )
        throw Error(
          d.method === 'roll' && d.rolls.length < 6
            ? 'Tirá o anotá las seis puntuaciones.'
            : 'Asigná un valor a cada característica.',
        );
      if (ABIL.some(k => !(base[k] >= 1 && base[k] <= 30)))
        throw Error('Completá las seis puntuaciones, entre 1 y 30.');
      if (!(d.method === 'manual' && !d.applyRacial))
        for (const g of racialPlan().groups)
          if ((d.racial.picks[g.key] || []).filter(Boolean).length < g.count)
            throw Error('Elegí los aumentos de tu raza.');
      finalAbilities();
    }
    if (id === 'skills') CreationSkills.validate(d);
    if (id === 'spells') {
      const p = provisional(),
        L = p && spellLimits(p);
      if (L) {
        if (d.spellPicks.cantrips.length > L.cantrips) throw Error('Elegiste más trucos de los que tenés.');
        if (d.spellPicks.known.length > L.known) throw Error('Elegiste más conjuros de los que tenés.');
        if (d.spellPicks.prepared.length > L.prepared) throw Error('Preparaste más conjuros de los permitidos.');
      }
    }
    if (id === 'equipment') Equipment.validateDraft(d);
    if (id === 'details') {
      if (!d.name.trim()) throw Error('Ponele un nombre a tu personaje.');
      if (!(Number(d.hp) >= 1)) throw Error('Revisá los PG máximos.');
      if (!(Number(d.speed) >= 0)) throw Error('Revisá la velocidad.');
    }
  }
  function finish() {
    finalAbilities();
    const s = PartyUI.makeCharacter(d),
      L = spellLimits(s),
      picks = d.spellPicks;
    s.known = [...new Set([...picks.cantrips, ...picks.known])];
    s.prepared =
      L.type === 'book'
        ? picks.prepared.filter(x => picks.known.includes(x))
        : L.type === 'prepared'
          ? picks.known.slice()
          : [];
    R.validate(s);
    const id = CharacterStorage.add(s);
    if (window.Cloud?.pendingTable?.()) localStorage.setItem('dnd-pending-attach-v1', id);
    try {
      localStorage.removeItem(DRAFT);
    } catch {}
    host.hidden = true;
    document.body.classList.remove('creator-open');
    CharacterStorage.activate(id);
  }

  // ---------- Eventos ----------
  function fail(e) {
    const el = host.querySelector('#creator-error');
    if (el) {
      el.textContent = e.message;
      el.scrollIntoView({ block: 'nearest' });
    }
  }
  function collect() {
    const f = host.querySelector('#creator-form');
    if (!f) return;
    const fd = new FormData(f),
      id = current();
    if (id === 'class' && fd.has('level')) d.level = Number(fd.get('level'));
    if (id === 'class' && host.querySelector('[name=source]')) {
      d.campaignSources = ['PHB', ...fd.getAll('source')];
      ui.booksOpen = host.querySelector('.creator-books')?.open;
    }
    if (fd.has('tableCode')) ui.code = String(fd.get('tableCode'));
    if (fd.has('tableDisplay')) ui.display = String(fd.get('tableDisplay'));
    if (id === 'background' && fd.has('background')) d.background = String(fd.get('background')).trim();
    if (id === 'race' && fd.has('race')) d.race = String(fd.get('race')).trim();
    if (id === 'abilities') {
      for (const k of ABIL) {
        if (fd.has('assign:' + k)) d.assign[k] = fd.get('assign:' + k);
        if (fd.has('base:' + k)) d.base[k] = fd.get('base:' + k) === '' ? '' : Number(fd.get('base:' + k));
      }
      if (d.method === 'manual') d.applyRacial = fd.has('applyRacial');
      if (d.method === 'roll') {
        d.physicalRolls = fd.has('physicalRolls');
        if (d.physicalRolls && fd.has('roll:0'))
          d.rolls = [0, 1, 2, 3, 4, 5].map(i => {
            const raw = fd.get('roll:' + i);
            return { raw, total: raw === '' ? 0 : floor(Number(raw)) };
          });
      }
      if (host.querySelector('[name=tasha]') && fd.has('tasha') !== d.racial.tasha) {
        d.racial.tasha = fd.has('tasha');
        d.racial.picks = {};
      }
      for (const [k, v] of fd)
        if (k.startsWith('rp:')) {
          const [, key, i] = k.split(':');
          (d.racial.picks[key] ||= [])[Number(i)] = String(v);
        }
    }
    if (id === 'skills') collectSkills(fd);
    if (id === 'equipment') EquipmentUI.collectCreation(fd, d);
    if (id === 'origins') {
      d.name = String(fd.get('name') || '').trim();
      d.languages = String(fd.get('languages') || '').trim();
    }
    if (id === 'details') {
      d.name = String(fd.get('name') || '').trim();
      d.languages = String(fd.get('languages') || '').trim();
      d.hp = fd.get('hp');
      d.speed = fd.get('speed');
      d.full = fd.has('full');
    }
  }
  function go(i) {
    step = Math.max(0, Math.min(i, steps().length - 1));
    seen = Math.max(seen, step);
    ui.q = '';
    ui.filter = 'all';
    ui.resumed = false;
    save();
    draw();
    host.querySelector('.creator-body')?.scrollTo(0, 0);
  }
  function onClick(e) {
    const t = e.target.closest('[data-cr]');
    if (!t || t.disabled) return;
    const a = t.dataset.cr;
    try {
      collect();
      if (a === 'close') return close();
      if (a === 'restart') {
        if (!confirm('¿Empezar de nuevo? Se descarta el borrador.')) return;
        restart();
        save();
        return draw();
      }
      if (a === 'next') {
        validate(current());
        if (current() === 'review') return finish();
        if (current() === 'origins') return finishEdit();
        return go(step + 1);
      }
      if (a === 'back') return go(step - 1);
      if (a === 'go') {
        // Para saltar hacia adelante, los pasos intermedios tienen que estar completos.
        const target = Number(t.dataset.i);
        for (let i = step; i < target; i++) validate(steps()[i][0]);
        return go(target);
      }
      if (a === 'join' || a === 'join-current') {
        const code = a === 'join' ? ui.code : window.Cloud.link(KEY)?.code;
        join(code).catch(fail);
        return;
      }
      if (a === 'leave-table') {
        if (!confirm('¿Crear el personaje sin mesa? Podés unirlo a una mesa más tarde desde «Mesa».')) return;
        window.Cloud.clearPending();
      }
      if (a === 'filter') ui.filter = t.dataset.v;
      if (a === 'class') {
        if (d.classId !== t.dataset.id) {
          d.classId = t.dataset.id;
          d.subclass = '';
          d.spellPicks = { cantrips: [], known: [], prepared: [] };
          d.equipmentChoices = {};
          d.equipmentTemplate = '';
          CreationSkills.reconcile(d);
        }
      }
      if (a === 'subclass') d.subclass = t.dataset.id;
      if (a === 'background') {
        d.backgroundId = t.dataset.id;
        d.customBackground = !t.dataset.id;
        d.background = Campaign.background(d)?.name || (d.customBackground ? d.background : '');
        CreationSkills.reconcile(d);
      }
      if (a === 'family') {
        ui.family = t.dataset.id;
        if (!t.dataset.id) {
          d.raceId = '';
          d.customRace = true;
          d.race = '';
          d.racial = { mode: '21', tasha: false, picks: {} };
          CreationSkills.reconcile(d);
        } else {
          d.customRace = false;
          const vs = families().find(([f]) => f === t.dataset.id)?.[1] || [];
          if (vs.length === 1) pickRace(vs[0].row.id);
          else if (!vs.some(v => v.row.id === d.raceId)) {
            d.raceId = '';
            d.race = '';
          }
        }
      }
      if (a === 'race') pickRace(t.dataset.id);
      if (a === 'method') {
        d.method = t.dataset.v;
        d.assign = {};
        if (d.method === 'pointbuy') d.base = { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 };
        if (d.method === 'manual') d.base = { str: '', dex: '', con: '', int: '', wis: '', cha: '' };
      }
      if (a === 'buy') d.base[t.dataset.k] = Math.max(8, Math.min(15, d.base[t.dataset.k] + Number(t.dataset.v)));
      if (a === 'roll') {
        d.rolls = Array.from({ length: 6 }, () => {
          const r = roll4d6();
          return { dice: r.dice, total: floor(r.total) };
        });
        d.rollCount++;
        d.assign = {};
      }
      if (a === 'wmode') {
        d.racial.mode = t.dataset.v;
        d.racial.picks = {};
      }
      if (a === 'spell') {
        const list = d.spellPicks[t.dataset.kind],
          id = t.dataset.id;
        if (!list.includes(id)) {
          const L = spellLimits(provisional()),
            max = { cantrips: L.cantrips, known: L.known, prepared: L.prepared }[t.dataset.kind];
          if (list.length >= max) throw Error(`Ya elegiste ${max}. Quitá uno para cambiarlo.`);
        }
        d.spellPicks[t.dataset.kind] = list.includes(id) ? list.filter(x => x !== id) : [...list, id];
        if (t.dataset.kind === 'known' && list.includes(id))
          d.spellPicks.prepared = d.spellPicks.prepared.filter(x => x !== id);
      }
      save();
      draw();
    } catch (err) {
      fail(err);
    }
  }
  function onChange(e) {
    const n = e.target.name || '';
    if (n === 'q') return;
    try {
      collect();
      if (current() === 'equipment' && n === 'equipmentMode') {
        delete d.equipmentDefense;
        d.gold = 0;
      }
      save();
      // Redibujar solo cuando cambia la estructura (los textos se guardan sin perder el foco).
      if (
        ![
          'name',
          'languages',
          'background',
          'race',
          'hp',
          'speed',
          'gear',
          'gold',
          'tableCode',
          'tableDisplay',
        ].includes(n)
      )
        draw();
      host.querySelector(`[name="${CSS.escape(n)}"]`)?.focus({ preventScroll: true });
    } catch (err) {
      fail(err);
    }
  }
  function onInput(e) {
    if (e.target.name !== 'q') return;
    ui.q = e.target.value;
    const pos = e.target.selectionStart;
    draw();
    const q = host.querySelector('[name=q]');
    q?.focus();
    q?.setSelectionRange(pos, pos);
  }

  return { start, close, editOrigins };
})();
