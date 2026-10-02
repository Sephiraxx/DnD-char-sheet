/* Subir de nivel, paso a paso y a pantalla completa como el creador: qué ganás, PG, subclase,
   mejora o dote, conjuros nuevos, opciones de clase y revisión. Solo aparecen los pasos que
   corresponden a ese nivel. Funciona igual para la clase principal y para una clase secundaria
   (multiclase): la secundaria se trabaja como una ficha virtual de esa clase y al final se copia
   a su entrada de multiclase. Los datos los aplica Classes.levelUp. */
const LevelUp = (() => {
  'use strict';
  const C = Classes,
    R = Rules,
    D = ClassData,
    ABIL = ['str', 'dex', 'con', 'int', 'wis', 'cha'],
    SHORT = { str: 'FUE', dex: 'DES', con: 'CON', int: 'INT', wis: 'SAB', cha: 'CAR' };
  let host = null,
    base = null,
    d = null,
    step = 0,
    q = '';

  const esc = v =>
    String(v ?? '').replace(
      /[&<>"']/g,
      c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const canon = v => String(v).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const btn = (label, a, cls = '', attrs = '') =>
    `<button type="button" class="button ${cls}" data-lv="${a}" ${attrs}>${label}</button>`;
  const mod = n => Math.floor((Number(n) - 10) / 2);
  // Efectos automáticos de dotes (feats.js), si está cargado.
  const fx = () => (typeof FeatFX !== 'undefined' ? FeatFX : null);
  const sign = n => (n >= 0 ? '+' : '') + n;

  // ---------- Estado provisional ----------
  // El personaje como quedaría con las elecciones de hasta ahora (sin los conjuros ni opciones nuevas).
  // Modo «opciones de clase»: sin subir de nivel, se eligen o cambian estilos, invocaciones, maniobras…
  let editMode = false,
    spellsOnly = false,
    target = '';
  // Ficha virtual de una clase secundaria: su nivel, subclase, conjuros y opciones, con el resto del personaje.
  function virtualOf(s, classId) {
    const tmp = clone(s);
    tmp.multiclass = [...(tmp.multiclass || [])];
    if (!tmp.multiclass.some(x => x.classId === classId))
      tmp.multiclass.push({ classId, level: 0, subclass: '', notes: '' });
    const v = clone(C.views(tmp).find((v, i) => i && v.classId === classId));
    // La vista conserva el PG total, pero no los contadores de otra clase.
    // Son datos provisionales: writeBack deja los usos reales sin cambios.
    v.subclass = v.classSubclass === 'bard-college-of-eloquence' ? 'eloquence' : 'manual';
    v.slotsSpent = Array(9).fill(null);
    v.inspirationSpent = null;
    v.pactSpent = null;
    return v;
  }
  function next() {
    if (spellsOnly) return clone(base);
    if (editMode) return { ...clone(base), classChoices: {} };
    // Con la mejora todavía incompleta se calcula sin aplicarla (una dote cualquiera solo para la vista previa).
    const nd = needs(),
      okScores = d.a1 && d.a2 && [d.a1, d.a2].every(k => base.abilities[k] + (d.a1 === k) + (d.a2 === k) <= 20),
      pending = nd.asi && (d.asi === 'scores' ? !okScores : !d.feat);
    try {
      return C.levelUp(base, {
        hpMethod: d.hpMethod,
        hpRoll: d.hpRoll,
        subclass: d.subclass || undefined,
        asi: pending ? 'feat' : d.asi,
        a1: d.a1,
        a2: d.a2,
        feat: pending ? Catalog.feats[0].id : d.feat,
        reviewed: true,
        featNotes: d.featNotes,
      });
    } catch {
      // Sin subclase todavía: nivel nuevo y PG, nada más.
      const t = clone(base),
        die = C.info(base).die,
        roll = d.hpMethod === 'rolled' ? Number(d.hpRoll) || die / 2 + 1 : die / 2 + 1;
      t.level++;
      if (t._total !== undefined) t._total++;
      const con = mod(R.scores(t).con);
      t.hpBase += Math.max(1, roll + con) - con;
      return t;
    }
  }
  const at = () => base.level + 1;
  function needs() {
    const c = C.info(base),
      l = at();
    return {
      subclass: l >= c.subclassLevel && !C.sub(base),
      asi: C.asiLevels(base).includes(l),
    };
  }
  function spellPlan(n = next()) {
    const cast = C.casting(n),
      st = R.stats(n),
      counts = C.spellCounts(n),
      bookMax = 6 + 2 * (n.level - 1);
    return {
      type: cast.type,
      cantrips: Math.max(0, st.cantrips - counts.cantrips),
      known: cast.type === 'known' ? Math.max(0, st.known - counts.known) : 0,
      book: cast.type === 'book' ? Math.max(0, bookMax - counts.known) : 0,
      prepared: ['prepared', 'book'].includes(cast.type) ? st.prepared : 0,
      maxLevel: st.slots.length,
    };
  }
  function choicePlan(n = next()) {
    return C.choices(n)
      .map(g => ({ ...g, have: (n.classChoices?.[g.name] || []).length }))
      .filter(g => g.count > g.have);
  }
  function steps() {
    if (spellsOnly)
      return [
        ['spells', 'Conjuros'],
        ['review', 'Revisar'],
      ];
    if (editMode)
      return [
        ['choices', 'Opciones de clase'],
        ['review', 'Revisar'],
      ];
    const nd = needs(),
      n = next(),
      sp = spellPlan(n),
      list = [
        ['overview', 'Qué ganás'],
        ['hp', 'Puntos de golpe'],
      ];
    if (nd.subclass) list.push(['subclass', 'Subclase']);
    if (nd.asi) list.push(['asi', 'Mejora o dote']);
    if (sp.cantrips || sp.known || sp.book || sp.type === 'prepared') list.push(['spells', 'Conjuros']);
    if (choicePlan(n).length) list.push(['choices', 'Opciones de clase']);
    list.push(['review', 'Revisar']);
    return list;
  }

  // ---------- Abrir / cerrar ----------
  function chooseOptions(classId = '') {
    const v = classId ? virtualOf(state, classId) : state;
    if (!C.choices(v).length) throw Error('Esa clase no tiene opciones para elegir a este nivel.');
    start(true, classId);
  }
  // Clase secundaria: subir de nivel (o sumarla), elegir sus opciones o sus conjuros.
  function startFor(classId, mode = 'levelup') {
    if (mode === 'options') return chooseOptions(classId);
    start(mode === 'spells' ? 'spells' : false, classId);
  }
  function start(options = false, classId = '') {
    editMode = options === true;
    spellsOnly = options === 'spells';
    target = classId && classId !== state.classId ? classId : '';
    if (!editMode && !spellsOnly && R.totalLevel(state) >= 20) throw Error('Ya estás en nivel 20 de personaje.');
    base = target ? virtualOf(state, target) : clone(state);
    const c = C.info(base);
    d = {
      hpMethod: 'fixed',
      hpRoll: c.die / 2 + 1,
      rolled: false,
      subclass: '',
      asi: 'scores',
      a1: '',
      a2: '',
      feat: '',
      featNotes: '',
      featAbility: '',
      featSkills: [],
      featExpertise: '',
      cantrips: [],
      known: [],
      prepared: [...(base.prepared || [])],
      choices: editMode ? clone(base.classChoices || {}) : {},
    };
    step = 0;
    q = '';
    if (!host) {
      host = document.createElement('div');
      host.id = 'levelup';
      host.className = 'creator-host';
      host.setAttribute('role', 'dialog');
      host.setAttribute('aria-modal', 'true');
      host.setAttribute('aria-label', 'Subir de nivel');
      document.body.append(host);
      host.addEventListener('click', onClick);
      host.addEventListener('change', onChange);
      host.addEventListener('input', onInput);
      host.addEventListener('submit', e => e.preventDefault());
      host.addEventListener('keydown', e => e.key === 'Escape' && close());
    }
    document.getElementById('modal')?.open && document.getElementById('modal').close();
    host.hidden = false;
    document.body.classList.add('creator-open');
    draw();
  }
  function close() {
    host.hidden = true;
    document.body.classList.remove('creator-open');
  }

  // ---------- Dibujo ----------
  function draw() {
    const list = steps();
    step = Math.min(step, list.length - 1);
    const id = list[step][0],
      top = host.querySelector('.creator-body')?.scrollTop || 0,
      c = C.info(base);
    host.innerHTML = `<div class="creator-shell"><header class="creator-head"><div><p class="eyebrow">${editMode ? `OPCIONES DE CLASE · ${esc(c.name).toUpperCase()} ${base.level}` : spellsOnly ? `CONJUROS · ${esc(c.name).toUpperCase()} ${base.level}` : `${target && !base.level ? 'SUMAR CLASE' : 'SUBIR DE NIVEL'} · ${esc(c.name).toUpperCase()} ${target && !base.level ? at() : base.level + ' → ' + at()}`}${target ? ' · MULTICLASE' : ''} · PASO ${step + 1} DE ${list.length}</p><h1>${esc(list[step][1])}</h1></div><div class="actions">${btn('Salir', 'close', 'secondary')}</div></header><nav class="creator-rail" aria-label="Pasos">${list
      .map(
        ([, label], i) =>
          `<button type="button" class="creator-step ${i === step ? 'cur' : i < step ? 'done' : ''}" data-lv="go" data-i="${i}" ${i > step ? 'disabled' : ''}>${i < step ? '✓ ' : i + 1 + ' · '}${esc(label)}</button>`,
      )
      .join(
        '',
      )}</nav><form class="creator-body" id="levelup-form" novalidate><div id="levelup-error" class="creator-error" role="alert"></div>${body(id)}</form><footer class="creator-foot"><p class="creator-summary">${summary()}</p><div class="actions">${step ? btn('Atrás', 'back', 'secondary') : ''}${btn(id === 'review' ? (editMode || spellsOnly ? 'Guardar' : 'Confirmar subida') : 'Siguiente', 'next')}</div></footer></div>`;
    const b = host.querySelector('.creator-body');
    if (b) b.scrollTop = top;
  }
  function summary() {
    const n = next(),
      before = R.stats(base),
      after = R.stats(n);
    return `<b>${esc(base.name)}:</b> PG ${before.maxHP} → ${after.maxHP} · Competencia ${sign(before.prof)}${after.prof !== before.prof ? ' → ' + sign(after.prof) : ''}`;
  }
  function body(id) {
    return { overview, hp, subclass, asi, spells, choices, review }[id]();
  }

  // 1. Qué ganás
  function overview() {
    const n = { ...base, level: at() },
      feats = C.features(n).filter(f => f.level === at()),
      before = R.stats(base),
      after = R.stats(next()),
      nd = needs(),
      sp = spellPlan(),
      slots = after.slots.map((v, i) => [i + 1, before.slots[i] || 0, v]).filter(([, a, b]) => a !== b);
    const items = [
      ...feats.map(
        f =>
          `<li><b>${esc(f.name)}</b>${f.children?.length ? ' <span class="small muted">· ' + esc(f.children.join(' · ')) + '</span>' : ''}</li>`,
      ),
      after.prof !== before.prof
        ? `<li>Bonificador de competencia ${sign(before.prof)} → <b>${sign(after.prof)}</b></li>`
        : '',
      ...slots.map(([lv, a, b]) => `<li>Espacios de nivel ${lv}: ${a} → <b>${b}</b></li>`),
      sp.cantrips ? `<li>${sp.cantrips} truco(s) nuevo(s)</li>` : '',
      sp.known ? `<li>${sp.known} conjuro(s) conocido(s) nuevo(s)</li>` : '',
      sp.book ? `<li>${sp.book} conjuro(s) nuevo(s) para tu libro</li>` : '',
      nd.subclass ? '<li><b>Elegís tu subclase</b></li>' : '',
      nd.asi ? '<li><b>Mejora de características o dote</b></li>' : '',
    ].filter(Boolean);
    const mcNote =
      target && typeof MulticlassUI !== 'undefined' ? MulticlassUI.joinNotes(state, target, !base.level) : '';
    return `${mcNote}<section class="card"><h2>${esc(C.info(base).name)} ${at()}${target ? ' · nivel de personaje ' + (R.totalLevel(state) + 1) : ''}</h2><ul class="creator-list levelup-gains">${items.join('') || '<li>Mejoras de recursos y de rasgos que ya tenés.</li>'}</ul><p class="small">Subir de nivel no es un descanso: los recursos gastados se conservan.</p></section>`;
  }

  // 2. PG
  function hp() {
    const c = C.info(base),
      con = mod(R.scores(next()).con),
      avg = c.die / 2 + 1;
    return `<div class="chips creator-methods">${[
      ['fixed', `Promedio: ${avg} ${sign(con)} CON`],
      ['rolled', `Tirar d${c.die} ${sign(con)} CON`],
    ]
      .map(
        ([v, l]) =>
          `<button type="button" class="chip ${d.hpMethod === v ? 'selected' : ''}" data-lv="hpmethod" data-v="${v}" aria-pressed="${d.hpMethod === v}">${l}</button>`,
      )
      .join('')}</div>${
      d.hpMethod === 'rolled'
        ? `<div class="actions">${btn(d.rolled ? 'Volver a tirar' : 'Tirar d' + c.die, 'hproll', d.rolled ? 'secondary' : '')}</div><div class="form-grid">${field('Resultado del d' + c.die + ' (o tu dado físico)', 'hpRoll', d.hpRoll, 'number', `min="1" max="${c.die}" inputmode="numeric"`)}</div>`
        : ''
    }<p>Sumás <b>${Math.max(1, (d.hpMethod === 'rolled' ? Number(d.hpRoll) || 0 : avg) + con)}</b> PG máximos.</p>`;
  }

  // 3. Subclase
  function subclass() {
    const list = D.subclasses.filter(x => x.classId === C.id(base) && Campaign.enabled(base, x));
    return `<div class="creator-grid small-cards">${list
      .map(
        x =>
          `<button type="button" class="creator-card ${d.subclass === x.id ? 'selected' : ''}" data-lv="subclass" data-id="${x.id}" aria-pressed="${d.subclass === x.id}"><span class="creator-card-title">${esc(x.name)}</span><span class="creator-meta">${esc(x.source)}</span><span class="creator-brief">${esc(
            (x.features || [])
              .filter(f => f.level <= at())
              .map(f => f.name)
              .join(', '),
          )}</span></button>`,
      )
      .join('')}</div>`;
  }

  // 4. Mejora o dote
  function asi() {
    const tabs = `<div class="chips creator-methods">${[
      ['scores', 'Mejorar características'],
      ['feat', 'Elegir una dote'],
    ]
      .map(
        ([v, l]) =>
          `<button type="button" class="chip ${d.asi === v ? 'selected' : ''}" data-lv="asimode" data-v="${v}" aria-pressed="${d.asi === v}">${l}</button>`,
      )
      .join('')}</div>`;
    if (d.asi === 'scores') {
      const opts = ABIL.map(k => [k, `${R.attrs[k]} (${base.abilities[k]})`]);
      return `${tabs}<p class="small">+2 a una característica, o +1 a dos. Elegí la misma dos veces para el +2. Máximo 20.</p><div class="form-grid">${select('Primer +1', 'a1', [['', 'Elegí…'], ...opts], d.a1)}${select('Segundo +1', 'a2', [['', 'Elegí…'], ...opts], d.a2)}</div><div class="creator-scores">${ABIL.map(
        k => {
          const v = base.abilities[k] + (d.a1 === k) + (d.a2 === k);
          return `<div class="creator-score ${v !== base.abilities[k] ? 'key-ability' : ''}"><span>${SHORT[k]}</span><b>${v}</b><small>${sign(mod(v))}</small></div>`;
        },
      ).join('')}</div>`;
    }
    const taken = new Set(base.progression?.learnedFeats || []);
    const list = Catalog.feats
      .filter(f => Campaign.enabled(base, f) && !(taken.has(f.id) && !f.repeatable))
      .filter(f => !q || canon(f.name + ' ' + (f.english || '')).includes(canon(q)))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
    const chosen = Catalog.feats.find(f => f.id === d.feat);
    return `${tabs}<div class="creator-search"><input type="search" name="q" value="${esc(q)}" placeholder="Buscar dote" aria-label="Buscar dote"></div><div class="creator-grid small-cards">${list
      .map(
        f =>
          `<button type="button" class="creator-card ${d.feat === f.id ? 'selected' : ''}" data-lv="feat" data-id="${f.id}" aria-pressed="${d.feat === f.id}"><span class="creator-card-title">${esc(f.name)}</span><span class="creator-meta">${esc(f.sourceKey)}${f.prerequisite ? ' · Requisito: ' + esc(f.prerequisite) : ''}</span>${fx()?.summary(f.id) ? `<span class="creator-brief">${esc(fx().summary(f.id))}</span>` : ''}</button>`,
      )
      .join(
        '',
      )}</div>${chosen ? `<section class="card creator-detail"><h3>${esc(chosen.name)}</h3>${featDetail(chosen.id)}<label class="field">Tus elecciones y notas de la dote<textarea name="featNotes" maxlength="1000" placeholder="Por ejemplo: +1 a Destreza; trucos elegidos…">${esc(d.featNotes)}</textarea></label></section>` : ''}`;
  }

  // Lo que hace la dote, lo que se elige ahora y lo que queda a cargo del jugador.
  const featPicks = () => ({
    ability: d.featAbility || undefined,
    skills: d.featSkills,
    expertise: d.featExpertise ? [d.featExpertise] : [],
  });
  function featDetail(id) {
    const f = fx();
    if (!f) return '';
    const nd = f.needs(id, base),
      auto = f.autoList(id, base),
      manual = f.manualList(id),
      skillName = k => R.skills.find(x => x[0] === k)?.[1] || k;
    const ability = nd.ability
      ? select(
          'Característica que sube +1',
          'featAbility',
          [['', 'Elegí…'], ...nd.ability.map(k => [k, `${R.attrs[k]} (${base.abilities[k]})`])],
          d.featAbility,
        )
      : '';
    const skills = nd.skills
      ? `<p class="small"><b>Habilidades (${d.featSkills.length}/${nd.skills.n}):</b></p><div class="chips">${nd.skills.from
          .map(
            k =>
              `<button type="button" class="chip ${d.featSkills.includes(k) ? 'selected' : ''}" data-lv="featskill" data-id="${k}" aria-pressed="${d.featSkills.includes(k)}">${esc(skillName(k))}</button>`,
          )
          .join('')}</div>`
      : '';
    const canExpert = [...new Set([...(base.proficiencies || []), ...d.featSkills])].filter(
      k => !(base.expertise || []).includes(k),
    );
    const expertise = nd.expertise
      ? select(
          'Pericia en',
          'featExpertise',
          [['', 'Elegí…'], ...canExpert.map(k => [k, skillName(k)])],
          d.featExpertise,
        )
      : '';
    return `${auto.length ? `<p class="small"><b>Se aplica sola en la ficha:</b> ${esc(auto.join(' · '))}</p>` : ''}${ability || expertise ? `<div class="form-grid">${ability}${expertise}</div>` : ''}${skills}${manual.length ? `<p class="small"><b>A cargo tuyo en la mesa:</b> ${esc(manual.join(' '))}</p>` : ''}`;
  }

  // 5. Conjuros
  function spells() {
    const n = next(),
      sp = spellPlan(n),
      g = C.granted(n),
      auto = new Set([...g.prepared, ...g.known]),
      known = new Set(n.known || []);
    const pool = R.allSpells(n)
      .filter(
        s =>
          Campaign.enabled(n, s) &&
          (C.member(s, n) || g.expanded.includes(s.id)) &&
          s.level <= sp.maxLevel &&
          !auto.has(s.id),
      )
      .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, 'es'));
    const card = (kind, s, on) =>
      `<button type="button" class="creator-card ${on ? 'selected' : ''}" data-lv="spell" data-kind="${kind}" data-id="${s.id}" aria-pressed="${on}"><span class="creator-card-title">${esc(s.name)}</span><span class="creator-meta">${s.level ? 'Nivel ' + s.level : 'Truco'} · ${esc(s.school || '')}</span><span class="creator-brief">${esc(s.brief || '')}</span></button>`;
    const section = (kind, title, list, max, hint = '') => {
      const mine = d[kind];
      const shown = list.filter(
        s => !q || canon(s.name + ' ' + (s.english || '')).includes(canon(q)) || mine.includes(s.id),
      );
      return `<section class="creator-spells"><div class="card-header"><h2>${title}</h2><span class="tag">${mine.length} de ${max}</span></div>${hint ? `<p class="small">${hint}</p>` : ''}<div class="creator-grid small-cards">${shown.map(s => card(kind, s, mine.includes(s.id))).join('')}</div></section>`;
    };
    if (!sp.cantrips && !sp.known && !sp.book && !['prepared', 'book'].includes(sp.type))
      return '<p>No hay conjuros nuevos para elegir en esta clase por ahora.</p>';
    let out = `<div class="creator-search"><input type="search" name="q" value="${esc(q)}" placeholder="Buscar conjuro" aria-label="Buscar conjuro"></div>`;
    if (sp.cantrips)
      out += section(
        'cantrips',
        'Trucos nuevos',
        pool.filter(s => s.level === 0 && !known.has(s.id)),
        sp.cantrips,
      );
    const fresh = pool.filter(s => s.level > 0 && !known.has(s.id));
    if (sp.known) out += section('known', 'Conjuros conocidos nuevos', fresh, sp.known);
    if (sp.book) out += section('known', 'Conjuros nuevos para tu libro', fresh, sp.book);
    if (sp.type === 'prepared' || sp.type === 'book') {
      const prepPool =
        sp.type === 'book'
          ? pool.filter(s => s.level > 0 && (known.has(s.id) || d.known.includes(s.id)))
          : pool.filter(s => s.level > 0);
      out += section(
        'prepared',
        'Preparados',
        prepPool,
        sp.prepared,
        'Podés cambiarlos después de cada descanso largo. Ahora podés preparar ' + sp.prepared + '.',
      );
    }
    return out;
  }

  // 6. Opciones de clase (estilos, invocaciones, metamagia, maniobras…)
  const PACTS = {
    Tome: 'Pacto del tomo',
    Blade: 'Pacto del filo',
    Chain: 'Pacto de la cadena',
    Talisman: 'Pacto del talismán',
  };
  const spellEs = t => {
    const key = canon(String(t).split('#')[0].split('|')[0]);
    if (key === 'hex/curse') return 'Maleficio o una maldición';
    return Catalog.spells.find(s => canon(s.english || '') === key)?.name || String(t).split('#')[0];
  };
  function requirement(o) {
    return (o.prerequisite || [])
      .map(p =>
        Object.entries(p)
          .map(([k, v]) =>
            k === 'level'
              ? 'nivel ' + (v.level ?? v)
              : k === 'pact'
                ? PACTS[v] || v
                : k === 'spell'
                  ? 'conocer ' + [].concat(v).map(spellEs).join(' o ')
                  : k === 'item'
                    ? 'objeto: ' + [].concat(v).join(', ')
                    : '',
          )
          .filter(Boolean)
          .join(', '),
      )
      .filter(Boolean)
      .join(' o ');
  }
  // El pacto se controla: sin el don del pacto pedido, la invocación no se puede elegir.
  function pactMissing(o, n) {
    const need = (o.prerequisite || []).map(p => p.pact).filter(Boolean);
    if (!need.length) return false;
    const have = [...(n.classChoices?.['Pact Boon'] || []), ...(d.choices['Pact Boon'] || [])];
    return !need.some(pk => have.some(id => id.startsWith('pact-of-the-' + pk.toLowerCase())));
  }
  function choices() {
    const n = next();
    return choicePlan(n)
      .map(gr => {
        const picks = [...(n.classChoices?.[gr.name] || []), ...(d.choices[gr.name] || [])];
        return `<section class="creator-spells"><div class="card-header"><h2>${esc(NamesEs.choice(gr.name))}</h2><span class="tag">${picks.length} de ${gr.count}</span></div><div class="creator-grid small-cards">${gr.options
          .map(o => {
            const had = (n.classChoices?.[gr.name] || []).includes(o.id),
              on = picks.includes(o.id),
              req = requirement(o),
              blocked = !on && pactMissing(o, n);
            return `<button type="button" class="creator-card ${on ? 'selected' : ''}" data-lv="choice" data-group="${esc(gr.name)}" data-id="${esc(o.id)}" ${had || blocked ? 'disabled' : ''} aria-pressed="${on}"><span class="creator-card-title">${esc(o.name)}</span><span class="creator-meta">${esc(o.source)}${had ? ' · ya la tenés' : ''}</span>${req ? `<span class="creator-meta ${blocked ? 'req-missing' : ''}">Requiere: ${esc(req)}</span>` : ''}${o.text ? `<span class="creator-brief">${esc(o.text)}</span>` : ''}</button>`;
          })
          .join('')}</div></section>`;
      })
      .join('');
  }

  // 7. Revisión
  function review() {
    if (spellsOnly) {
      const names = ids => ids.map(id => Catalog.spells.find(x => x.id === id)?.name || id).join(', ');
      return `<section class="card"><h2>${esc(C.info(base).name)} · conjuros</h2><ul class="creator-list">${
        [
          d.cantrips.length ? `<li>Trucos nuevos: ${esc(names(d.cantrips))}</li>` : '',
          d.known.length ? `<li>Conjuros nuevos: ${esc(names(d.known))}</li>` : '',
          ['prepared', 'book'].includes(spellPlan().type)
            ? `<li>Preparados: ${esc(names(d.prepared)) || 'ninguno'}</li>`
            : '',
        ].join('') || '<li>Sin cambios.</li>'
      }</ul></section>`;
    }
    if (editMode)
      return `<section class="card"><h2>${esc(base.name)} · opciones de clase</h2><ul class="creator-list">${
        Object.entries(d.choices)
          .filter(([, v]) => v.length)
          .map(
            ([g, v]) =>
              `<li>${esc(NamesEs.choice(g))}: ${esc(v.map(id => D.options.find(o => o.id === id)?.name || id).join(', '))}</li>`,
          )
          .join('') || '<li>Sin opciones elegidas.</li>'
      }</ul></section>`;
    const n = next(),
      before = R.stats(base),
      after = R.stats(n),
      sub = d.subclass && D.subclasses.find(x => x.id === d.subclass),
      feat = d.asi === 'feat' && Catalog.feats.find(f => f.id === d.feat),
      names = ids => ids.map(id => Catalog.spells.find(s => s.id === id)?.name || id).join(', ');
    return `<section class="card"><h2>${esc(base.name)} · ${esc(C.info(base).name)} ${at()}</h2><ul class="creator-list">${[
      `<li>PG máximos ${before.maxHP} → <b>${after.maxHP}</b> (${d.hpMethod === 'rolled' ? 'tirada ' + d.hpRoll : 'promedio'})</li>`,
      sub ? `<li>Subclase: <b>${esc(sub.name)}</b></li>` : '',
      needs().asi
        ? feat
          ? `<li>Dote: <b>${esc(feat.name)}</b></li>`
          : `<li>Mejora: ${esc(R.attrs[d.a1] || '?')} +1, ${esc(R.attrs[d.a2] || '?')} +1</li>`
        : '',
      d.cantrips.length ? `<li>Trucos: ${esc(names(d.cantrips))}</li>` : '',
      d.known.length ? `<li>Conjuros: ${esc(names(d.known))}</li>` : '',
      ['prepared', 'book'].includes(spellPlan().type) && d.prepared.length
        ? `<li>Preparados: ${esc(names(d.prepared))}</li>`
        : '',
      ...Object.entries(d.choices)
        .filter(([, v]) => v.length)
        .map(
          ([g, v]) =>
            `<li>${esc(NamesEs.choice(g))}: ${esc(v.map(id => D.options.find(o => o.id === id)?.name || id).join(', '))}</li>`,
        ),
    ]
      .filter(Boolean)
      .join('')}</ul><p class="small">Lo que dejes sin elegir queda como pendiente en Clase.</p></section>`;
  }

  // ---------- Validación y aplicación ----------
  function validate(id) {
    const c = C.info(base);
    if (
      id === 'hp' &&
      d.hpMethod === 'rolled' &&
      !(Number.isInteger(Number(d.hpRoll)) && d.hpRoll >= 1 && d.hpRoll <= c.die)
    )
      throw Error(`El dado va de 1 a ${c.die}.`);
    if (id === 'subclass' && !d.subclass) throw Error('Elegí tu subclase.');
    if (id === 'asi') {
      if (d.asi === 'scores') {
        if (!d.a1 || !d.a2) throw Error('Elegí las dos mejoras.');
        for (const k of new Set([d.a1, d.a2]))
          if (base.abilities[k] + (d.a1 === k) + (d.a2 === k) > 20)
            throw Error('Ninguna característica puede pasar de 20.');
      } else if (!d.feat) throw Error('Elegí una dote.');
      else fx()?.checkPicks(d.feat, base, featPicks());
    }
  }
  // Conjuros, opciones y dote elegidos, sobre la ficha ya subida (n).
  function applyPicks(n, picks) {
    const sp = spellPlan(n),
      lvl = id => R.allSpells(n).find(x => x.id === id)?.level;
    n.known = [...new Set([...(n.known || []), ...picks.cantrips, ...picks.known])];
    if (sp.type === 'book') n.prepared = picks.prepared.filter(id => n.known.includes(id));
    // Clérigo, druida, paladín y artífice: lo preparado es su repertorio (además de los trucos).
    if (sp.type === 'prepared') {
      n.prepared = picks.prepared.slice();
      n.known = [...new Set([...n.known.filter(id => lvl(id) === 0), ...n.prepared])];
    }
    for (const [g, ids] of Object.entries(picks.choices))
      n.classChoices = { ...(n.classChoices || {}), [g]: [...new Set([...(n.classChoices?.[g] || []), ...ids])] };
    return n;
  }
  // Copia una clase secundaria trabajada en su ficha virtual (n) a la ficha real (s).
  function writeBack(s, n, full) {
    s.multiclass = [...(s.multiclass || [])];
    let mc = s.multiclass.find(x => x.classId === target);
    if (!mc) s.multiclass.push((mc = { classId: target, level: 0, subclass: '', notes: '' }));
    const type = C.casting(n).type;
    mc.level = n.level;
    mc.subclass = n.classSubclass || mc.subclass || '';
    mc.spells = (n.known || []).slice();
    if (['prepared', 'book'].includes(type)) mc.prepared = (n.prepared || []).slice();
    else delete mc.prepared;
    mc.choices = clone(n.classChoices || {});
    if (full)
      for (const k of ['hpBase', 'abilities', 'proficiencies', 'expertise', 'progression', 'features'])
        s[k] = clone(n[k]);
  }
  function apply() {
    const picks = d;
    if (spellsOnly) {
      commit('Conjuros actualizados', s => {
        const n = applyPicks(target ? virtualOf(s, target) : clone(s), { ...picks, choices: {} });
        if (target) writeBack(s, n, false);
        else Object.assign(s, { known: n.known, prepared: n.prepared });
        Object.assign(s, R.validate(s));
      });
      close();
      return toast('Conjuros guardados.');
    }
    if (target && !editMode) {
      commit(`Subida de nivel: ${C.info(base).name} ${at()} (personaje ${R.totalLevel(state) + 1})`, s => {
        const before = C.slots(s),
          hpBefore = R.stats(s).maxHP;
        const n = C.levelUp(virtualOf(s, target), {
          hpMethod: picks.hpMethod,
          hpRoll: picks.hpRoll,
          subclass: picks.subclass || undefined,
          asi: picks.asi,
          a1: picks.a1,
          a2: picks.a2,
          feat: picks.feat,
          reviewed: true,
          featNotes: picks.featNotes,
        });
        applyPicks(n, picks);
        if (picks.asi === 'feat' && picks.feat && needs().asi) fx()?.onGain(n, picks.feat, featPicks());
        writeBack(s, n, true);
        C.slots(s).forEach((x, i) => {
          if (!before[i] && x) s.slotsSpent[i] = 0;
        });
        if (C.pact(s) && s.pactSpent === undefined) s.pactSpent = 0;
        s.levelHistory.push({
          level: R.totalLevel(s),
          note: `${C.info(n).name} ${n.level}. PG máximos ${hpBefore} → ${R.stats(s).maxHP}.`,
        });
        if (typeof SheetStatus !== 'undefined') SheetStatus.addRaceSpells(s);
        Object.assign(s, R.validate(s));
      });
      close();
      location.hash = 'class';
      return toast(`¡${state.name} es ahora ${C.label(state)}!`);
    }
    if (editMode) {
      for (const gr of C.choices(base))
        if ((picks.choices[gr.name] || []).length > gr.count)
          throw Error(`En ${NamesEs.choice(gr.name)} podés tener ${gr.count}.`);
      commit('Opciones de clase actualizadas', s => {
        if (target) {
          const mc = s.multiclass.find(x => x.classId === target);
          mc.choices = { ...(mc.choices || {}), ...clone(picks.choices) };
        } else s.classChoices = { ...(s.classChoices || {}), ...clone(picks.choices) };
      });
      close();
      return toast('Opciones de clase guardadas.');
    }
    commit('Subida a nivel ' + at(), s => {
      const n = C.levelUp(s, {
        hpMethod: picks.hpMethod,
        hpRoll: picks.hpRoll,
        subclass: picks.subclass || undefined,
        asi: picks.asi,
        a1: picks.a1,
        a2: picks.a2,
        feat: picks.feat,
        reviewed: true,
        featNotes: picks.featNotes,
      });
      applyPicks(n, picks);
      if (picks.asi === 'feat' && picks.feat) fx()?.onGain(n, picks.feat, featPicks());
      if (typeof SheetStatus !== 'undefined') SheetStatus.addRaceSpells(n);
      Object.assign(s, R.validate(n));
    });
    close();
    location.hash = 'class';
    toast(`¡${state.name} subió a nivel ${state.level}!`);
  }

  // ---------- Eventos ----------
  function fail(e) {
    const el = host.querySelector('#levelup-error');
    if (el) el.textContent = e.message;
  }
  function collect() {
    const f = host.querySelector('#levelup-form');
    if (!f) return;
    const fd = new FormData(f);
    if (fd.has('hpRoll')) d.hpRoll = Number(fd.get('hpRoll'));
    if (fd.has('a1')) d.a1 = String(fd.get('a1'));
    if (fd.has('a2')) d.a2 = String(fd.get('a2'));
    if (fd.has('featNotes')) d.featNotes = String(fd.get('featNotes'));
    if (fd.has('featAbility')) d.featAbility = String(fd.get('featAbility'));
    if (fd.has('featExpertise')) d.featExpertise = String(fd.get('featExpertise'));
  }
  function onClick(e) {
    const t = e.target.closest('[data-lv]');
    if (!t || t.disabled) return;
    const a = t.dataset.lv;
    try {
      collect();
      const list = steps(),
        id = list[step][0];
      if (a === 'close') return close();
      if (a === 'next') {
        validate(id);
        if (id === 'review') return apply();
        step++;
        q = '';
      }
      if (a === 'back') step = Math.max(0, step - 1);
      if (a === 'go') step = Number(t.dataset.i);
      if (a === 'hpmethod') d.hpMethod = t.dataset.v;
      if (a === 'hproll') {
        const die = C.info(base).die;
        d.hpRoll = window.roll(die, 1)[0];
        d.rolled = true;
        RollFX.show({ label: 'Puntos de golpe · d' + die, total: d.hpRoll, face: d.hpRoll });
      }
      if (a === 'subclass') d.subclass = t.dataset.id;
      if (a === 'asimode') d.asi = t.dataset.v;
      if (a === 'feat' && d.feat !== t.dataset.id) {
        d.feat = t.dataset.id;
        d.featAbility = '';
        d.featSkills = [];
        d.featExpertise = '';
      }
      if (a === 'featskill') {
        const k = t.dataset.id,
          n = fx()?.needs(d.feat, base).skills?.n || 0;
        if (d.featSkills.includes(k)) d.featSkills = d.featSkills.filter(x => x !== k);
        else {
          if (d.featSkills.length >= n) throw Error(`La dote da ${n} habilidad(es). Quitá una para cambiarla.`);
          d.featSkills = [...d.featSkills, k];
        }
        if (!d.featSkills.includes(d.featExpertise) && !(base.proficiencies || []).includes(d.featExpertise))
          d.featExpertise = '';
      }
      if (a === 'spell') {
        const kind = t.dataset.kind,
          sid = t.dataset.id,
          list2 = d[kind],
          sp = spellPlan(),
          max = { cantrips: sp.cantrips, known: sp.known || sp.book, prepared: sp.prepared }[kind];
        if (list2.includes(sid)) d[kind] = list2.filter(x => x !== sid);
        else {
          if (list2.length >= max) throw Error(`Ya elegiste ${max}. Quitá uno para cambiarlo.`);
          d[kind] = [...list2, sid];
        }
      }
      if (a === 'choice') {
        const g = t.dataset.group,
          gr = choicePlan().find(x => x.name === g),
          mine = d.choices[g] || [];
        if (mine.includes(t.dataset.id)) d.choices[g] = mine.filter(x => x !== t.dataset.id);
        else {
          if (gr && gr.have + mine.length >= gr.count)
            throw Error(`Ya elegiste ${gr.count}. Quitá una para cambiarla.`);
          d.choices[g] = [...mine, t.dataset.id];
        }
      }
      draw();
    } catch (err) {
      fail(err);
    }
  }
  function onChange(e) {
    if (e.target.name === 'q') return;
    collect();
    if (['a1', 'a2', 'hpRoll'].includes(e.target.name)) draw();
  }
  function onInput(e) {
    if (e.target.name !== 'q') return;
    q = e.target.value;
    const pos = e.target.selectionStart;
    draw();
    const el = host.querySelector('[name=q]');
    el?.focus();
    el?.setSelectionRange(pos, pos);
  }
  return { start, startFor, close, chooseOptions };
})();
