/* Guía de subida: el borrador queda separado de la ficha hasta la confirmación. */
const Learning = (() => {
  'use strict';
  const P = Progression,
    DRAFT = KEY + '-level-draft';
  let draft,
    base,
    step = 0,
    steps = [],
    search = '',
    spellFilter = 'all',
    limit = 60;
  const names = ids => ids.map(spellName).join(', '),
    check = (name, label, value) =>
      `<label class="check"><input type="checkbox" name="${name}" ${value ? 'checked' : ''}>${label}</label>`;
  function buildSteps() {
    let p = P.plan(base);
    steps = [
      ['overview', 'Antes de subir'],
      ['hp', 'Puntos de golpe'],
    ];
    if (p.college) steps.push(['college', 'Elegí tu colegio']);
    if (p.expertise) steps.push(['expertise', 'Elegí dos Pericias']);
    if (p.asi) steps.push(['asi', 'Mejora o dote']);
    if (p.pending) steps.push(['pending', 'Completá tu nivel actual']);
    if (p.cantrips + p.pendingCantrips) steps.push(['cantrips', 'Elegí tus trucos']);
    if (p.spells) steps.push(['spells', 'Aprendé conjuros']);
    steps.push(['replace', 'Reemplazo opcional']);
    if (p.secrets) steps.push(['secrets', 'Secretos mágicos']);
    if (p.asi && draft.config.versatility) steps.push(['versatility', 'Versatilidad opcional']);
    steps.push(['review', 'Revisá y confirmá']);
  }
  function saveDraft() {
    try {
      localStorage.setItem(DRAFT, JSON.stringify({ base, draft, step }));
    } catch {}
  }
  function start() {
    base = clone(state);
    draft = P.draft(base);
    step = 0;
    try {
      const v = JSON.parse(localStorage.getItem(DRAFT) || 'null');
      if (
        v &&
        JSON.stringify(v.base) === JSON.stringify(base) &&
        v.draft?.from === base.level &&
        Array.isArray(v.draft.spells) &&
        Array.isArray(v.draft.config?.sources)
      ) {
        draft = v.draft;
        step = Number.isInteger(v.step) ? v.step : 0;
      }
    } catch {}
    buildSteps();
    step = Math.max(0, Math.min(step, steps.length - 1));
    search = '';
    spellFilter = 'all';
    draw();
  }
  function sourceControls(c) {
    return `<p class="small">Marcá los suplementos que tu DM permite. PHB = Manual del Jugador 2014. Los conjuros tienen resúmenes de mesa en español; revisá excepciones y tablas en su fuente.</p><div class="source-grid">${Catalog.sources.map(([id, label]) => check('source:' + id, esc(label), c.sources.includes(id))).join('')}</div><h3>Reglas opcionales de la mesa</h3>${check('config:expanded', 'Lista ampliada de bardo de Tasha', c.expanded)}${check('config:versatility', 'Versatilidad bárdica de Tasha (en niveles con mejora de características)', c.versatility)}${check('config:magical', 'Inspiración mágica de Tasha', c.magical)}${check('config:feats', 'Permitir dotes en lugar de mejora de características', c.feats)}`;
  }
  function overview() {
    const p = P.plan(base),
      a = p.before,
      b = p.after;
    return `<div class="level-summary"><span>Bardo ${base.level}</span><strong>→</strong><span>Bardo ${p.next}</span></div><div class="feature"><h3>Ganás automáticamente</h3><p>Competencia ${sign(a.prof)} → ${sign(b.prof)} · Inspiración d${a.inspirationDie} → d${b.inspirationDie}<br>Dados de Golpe ${base.level}d8 → ${p.next}d8</p><p>${b.slots.map((n, i) => `Espacios Nv. ${i + 1}: ${a.slots[i] || 0} → ${n}`).join('<br>')}</p></div><div class="feature"><h3>Lo que vas a elegir</h3><ul>${[
      'Cómo aumentar tus PG',
      p.college ? 'Colegio de bardo' : null,
      p.expertise ? 'Dos habilidades para Pericia' : null,
      p.asi ? 'Mejora de características o dote' : null,
      p.pending ? p.pending + ' conjuro pendiente del nivel actual' : null,
      p.cantrips + p.pendingCantrips ? p.cantrips + p.pendingCantrips + ' truco(s)' : null,
      p.spells ? p.spells + ' conjuro(s) nuevo(s)' : null,
      'Si querés reemplazar un conjuro conocido',
      p.secrets ? 'Dos Secretos mágicos' : null,
    ]
      .filter(Boolean)
      .map(t => `<li>${t}</li>`)
      .join('')}</ul></div>${R.features({ ...base, level: p.next })
      .filter(([n]) => !R.features(base).some(([old]) => old === n))
      .map(([n, t]) => `<details class="feature"><summary>${esc(n)}</summary><p>${esc(t)}</p></details>`)
      .join(
        '',
      )}<details class="feature"><summary>Libros y reglas permitidos por tu DM</summary>${sourceControls(draft.config)}</details><p class="small">La ficha no cambia hasta confirmar el último paso. El borrador se conserva en este navegador.</p>`;
  }
  function hp() {
    const p = P.plan(base);
    return `${select(
      'Elegí cómo aumentás los PG',
      'hpMethod',
      [
        ['fixed', 'Valor fijo: 5 + CON'],
        ['rolled', 'Tiré un d8 en mesa'],
      ],
      draft.hpMethod,
    )}${draft.hpMethod === 'rolled' ? field('Resultado de tu d8', 'hpRoll', draft.hpRoll, 'number', 'min="1" max="8" required') : ''}<p>CON actual: ${sign(p.before.mods.con)}. Aumento fijo previsto: ${Math.max(1, 5 + p.before.mods.con)} PG máximos.</p><p class="small">Si elegís aumentar CON después, se recalculan los PG de todos tus niveles. Tus PG actuales y recursos gastados se conservan; subir no cuenta como descanso.</p>`;
  }
  function expertise() {
    return `<p>Elegí exactamente dos habilidades en las que ya tengas competencia.</p>${R.skills
      .filter(x => base.proficiencies.includes(x[0]) && !base.expertise.includes(x[0]))
      .map(([id, n]) => check('expertise:' + id, esc(n), draft.expertise.includes(id)))
      .join('')}`;
  }
  function asi() {
    const list = Catalog.feats.filter(x => P.enabled(x, draft.config)),
      f = Catalog.feats.find(x => x.id === draft.feat);
    return `${select('Elegí tu mejora', 'asi', [['scores', '+2 a una característica o +1 a dos'], ...(draft.config.feats ? [['feat', 'Elegir una dote']] : [])], draft.asi)}${draft.asi === 'scores' ? `<div class="form-grid">${select('Primer +1', 'a1', Object.entries(R.attrs), draft.a1)}${select('Segundo +1', 'a2', Object.entries(R.attrs), draft.a2)}</div><p class="small">Podés elegir la misma característica dos veces. Máximo 20 con esta mejora.</p>` : `${select('Dote', 'feat', [['', 'Elegí una dote'], ...list.map(x => [x.id, x.name + ' · ' + x.sourceKey])], draft.feat)}${f ? `<div class="feature"><h3>${esc(f.name)}</h3><p>Requisito: ${esc(f.prerequisite || 'La referencia no indica un requisito; verificá las condiciones de la dote.')}</p><p>${esc(f.hint || 'Consultá la dote para elegir sus beneficios, competencias, conjuros o atributos. Registrá esas elecciones debajo.')}</p><a href="${referenceURL(f.name, 'feats')}" target="_blank" rel="noopener">Consultar referencia oficial</a></div>` : ''}${area('Mis elecciones y ajustes de esta dote', 'featNotes', draft.featNotes)}${check('featConfirmed', 'Revisé los requisitos con el DM y anoté qué ajustes debo aplicar. Los efectos de esta dote se registran como rasgo y se ajustan manualmente.', draft.featConfirmed)}`}<p class="small">Podés volver al primer paso para habilitar dotes y suplementos con tu DM.</p>`;
  }
  function referenceURL(name, type = 'spells') {
    return 'https://www.dndbeyond.com/' + type + '?filter-name=' + encodeURIComponent(name);
  }
  function card(sp, checked, group, disabled = false) {
    return `<div class="learn-card"><label class="check"><input type="checkbox" name="pick:${group}:${esc(sp.id)}" ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}><span><b>${esc(sp.name)}</b>${sp.english && sp.english !== sp.name ? `<small>${esc(sp.english)}</small>` : ''}<small>${sp.level ? 'Nivel ' + sp.level : 'Truco'} · ${esc(sp.sourceKey || sp.source)}${sp.optionalBard ? ' · Lista ampliada de Tasha' : ''}</small></span></label><details><summary>Qué hace / referencia</summary><p class="small">${esc(sp.time)} · ${esc(sp.range)} · ${esc(sp.duration)}</p><p class="spell-reference">${esc(sp.text || sp.brief)}</p>${sp.referenceOnly ? `<a href="${referenceURL(sp.english || sp.name)}" target="_blank" rel="noopener">Ver ficha oficial</a>` : ''}</details></div>`;
  }
  function pickedElsewhere(group) {
    return [
      ...base.known,
      ...base.extras,
      ...['pending', 'cantrips', 'spells', 'secrets'].filter(x => x !== group).flatMap(x => draft[x]),
      ...(group !== 'replaceIn' && draft.replaceIn ? [draft.replaceIn] : []),
      ...(group !== 'cantripIn' && draft.cantripIn ? [draft.cantripIn] : []),
    ];
  }
  function poolList(group) {
    const p = P.plan(base),
      isSecret = group === 'secrets',
      lvl = group === 'pending' ? base.level : p.next;
    const zero = ['cantrips', 'cantripIn'].includes(group);
    const blocked = pickedElsewhere(group);
    return P.available(base, draft.config, lvl, isSecret ? 'any' : 'bard')
      .filter(sp => (isSecret || zero === (sp.level === 0)) && !blocked.includes(sp.id))
      .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
  }
  function choosePage(group) {
    const p = P.plan(base),
      count = {
        pending: p.pending,
        cantrips: p.cantrips + p.pendingCantrips,
        spells: p.spells,
        secrets: p.secrets,
        replaceIn: 1,
        cantripIn: 1,
      }[group],
      chosen = Array.isArray(draft[group]) ? draft[group] : draft[group] ? [draft[group]] : [];
    let list = poolList(group);
    const q = search
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    list = list.filter(
      sp =>
        (spellFilter === 'all' || sp.level === Number(spellFilter)) &&
        [sp.name, sp.english || '', sp.school || '']
          .join(' ')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .includes(q),
    );
    return `<p>${group === 'pending' ? 'Falta completar el repertorio de tu nivel actual. Estas elecciones respetan tu nivel anterior.' : group === 'secrets' ? 'Elegí de cualquier clase, incluidos trucos. Cuentan dentro del total de conjuros conocidos.' : group === 'spells' ? 'Podés elegir del nuevo nivel de espacios o de niveles inferiores.' : 'Elegí las opciones que querés aprender.'}</p><div class="selection-status" role="status">Elegidos ${chosen.length} / ${count}${chosen.length ? ': ' + esc(names(chosen)) : ''}</div><div class="toolbar"><input class="control" id="learning-search" placeholder="Buscar nombre o escuela…" aria-label="Buscar en las opciones" value="${esc(search)}"><select class="control" id="learning-filter" aria-label="Filtrar nivel"><option value="all">Todos los niveles</option>${Array.from({ length: p.after.slots.length + 1 }, (_, i) => `<option value="${i}" ${spellFilter === String(i) ? 'selected' : ''}>${i ? 'Nivel ' + i : 'Trucos'}</option>`).join('')}</select></div><p class="small">${list.length} opciones con estos filtros. Las fuentes se habilitan en el primer paso.</p><div class="learn-list">${
      list
        .slice(0, limit)
        .map(sp => card(sp, chosen.includes(sp.id), group))
        .join('') || '<p>No hay opciones. Revisá el filtro o los libros habilitados.</p>'
    }</div>${list.length > limit ? '<button type="button" class="button secondary" data-wizard="more">Mostrar más</button>' : ''}`;
  }
  function replace() {
    const opts = base.known.map(spellById).filter(x => x && x.level > 0);
    return `${select('¿Querés reemplazar un conjuro?', 'replaceOut', [['', 'No, conservar los actuales'], ...opts.map(x => [x.id, x.name])], draft.replaceOut)}<p class="small">Como máximo uno por subida. El nuevo debe ser de la lista de bardo, incluso si reemplazás uno aprendido con Secretos mágicos.</p>${draft.replaceOut ? choosePage('replaceIn') : ''}`;
  }
  function versatility() {
    return `${select(
      'Cambio opcional (elegí solo uno)',
      'versatility',
      [
        ['none', 'Ninguno'],
        ['cantrip', 'Reemplazar un truco de bardo'],
        ['expertise', 'Cambiar una habilidad con Pericia'],
      ],
      draft.versatility,
    )}${
      draft.versatility === 'cantrip'
        ? select(
            'Truco que dejás',
            'cantripOut',
            [
              ['', 'Elegí un truco'],
              ...base.known
                .filter(id => !P.secret(base).includes(id))
                .map(spellById)
                .filter(x => x.level === 0)
                .map(x => [x.id, x.name]),
            ],
            draft.cantripOut,
          ) + choosePage('cantripIn')
        : draft.versatility === 'expertise'
          ? select(
              'Pericia que dejás',
              'expertiseOut',
              [['', 'Elegí'], ...base.expertise.map(id => [id, R.skills.find(x => x[0] === id)[1]])],
              draft.expertiseOut,
            ) +
            select(
              'Nueva Pericia',
              'expertiseIn',
              [
                ['', 'Elegí'],
                ...R.skills
                  .filter(x => base.proficiencies.includes(x[0]) && !base.expertise.includes(x[0]))
                  .map(x => [x[0], x[1]]),
              ],
              draft.expertiseIn,
            )
          : ''
    }`;
  }
  function review() {
    try {
      const n = P.apply(base, draft),
        d = R.stats(n);
      return `<div class="banner"><p><b>${esc(n.name)} · Bardo ${n.level}</b><br>PG máximos ${R.stats(base).maxHP} → ${d.maxHP}<br>PG actuales ${base.hp ?? 'sin confirmar'} · CD ${d.dc} · Inspiraciones máximas ${d.inspirationMax}d${d.inspirationDie}</p></div><p>${esc(n.levelHistory.at(-1).note)}</p><h3>Nuevos rasgos</h3>${
        R.features(n)
          .filter(([name]) => !R.features(base).some(([old]) => old === name))
          .map(([name, text]) => `<div class="feature"><b>${esc(name)}</b><p>${esc(text)}</p></div>`)
          .join('') || '<p class="small">Los cambios de este nivel son los indicados arriba.</p>'
      }<p class="small">Los espacios gastados, inventario, monedas y notas se conservan. Podés deshacer esta subida desde la ficha.</p>${check('reviewed', 'Revisé mis elecciones y quiero aplicar esta subida.', draft.reviewed)}`;
    } catch (e) {
      return `<p class="form-error">${esc(e.message)}</p><p>Volvé a los pasos anteriores para completar las elecciones.</p>`;
    }
  }
  function draw() {
    buildSteps();
    const [id, title] = steps[step];
    let body =
      id === 'overview'
        ? overview()
        : id === 'hp'
          ? hp()
          : id === 'college'
            ? `${select(
                'Colegio',
                'college',
                [
                  ['eloquence', 'Elocuencia'],
                  ['manual', 'Otro colegio — rasgos y elecciones manuales'],
                ],
                draft.college,
              )}<p class="small">Elocuencia incorpora Lengua de plata y Palabras perturbadoras. Para otro colegio, agregá sus rasgos y elecciones en Personaje.</p>`
            : id === 'expertise'
              ? expertise()
              : id === 'asi'
                ? asi()
                : ['pending', 'cantrips', 'spells', 'secrets'].includes(id)
                  ? choosePage(id)
                  : id === 'replace'
                    ? replace()
                    : id === 'versatility'
                      ? versatility()
                      : review();
    modal(
      'Subir a bardo ' + P.plan(base).next,
      `<div class="wizard-progress"><span>Paso ${step + 1} de ${steps.length}</span><b>${esc(title)}</b><progress value="${step + 1}" max="${steps.length}" aria-label="Progreso de la subida"></progress></div>${body}<div class="wizard-actions"><button type="button" class="button secondary" data-wizard="back" ${step === 0 ? 'disabled' : ''}>Atrás</button><button type="button" class="button" data-wizard="next">${id === 'review' ? 'Confirmar subida' : 'Siguiente'}</button></div><button type="button" class="text-btn" data-wizard="discard">Descartar borrador</button>`,
      null,
    );
    $('#modal').classList.add('learning-modal');
    saveDraft();
  }
  function validateStep() {
    let id = steps[step][0],
      p = P.plan(base);
    if (id === 'overview' && !draft.config.sources.includes('PHB'))
      throw Error('Mantené habilitado el Manual del Jugador 2014.');
    if (
      id === 'hp' &&
      draft.hpMethod === 'rolled' &&
      (!Number.isInteger(Number(draft.hpRoll)) || draft.hpRoll < 1 || draft.hpRoll > 8)
    )
      throw Error('Ingresá un resultado de 1 a 8.');
    if (id === 'expertise' && draft.expertise.length !== 2) throw Error('Elegí exactamente dos habilidades.');
    if (id === 'asi') {
      if (draft.asi === 'feat') {
        if (!draft.feat || !draft.featConfirmed || !draft.featNotes.trim())
          throw Error('Elegí la dote, anotá sus elecciones y confirmá los requisitos.');
      } else {
        const a = { ...base.abilities };
        a[draft.a1]++;
        a[draft.a2]++;
        if (a[draft.a1] > 20 || a[draft.a2] > 20) throw Error('La mejora no puede superar 20.');
      }
    }
    if (['pending', 'cantrips', 'spells', 'secrets'].includes(id)) {
      let n = { pending: p.pending, cantrips: p.cantrips + p.pendingCantrips, spells: p.spells, secrets: p.secrets }[
        id
      ];
      if (draft[id].length !== n) throw Error('Elegí exactamente ' + n + ' opción(es) para seguir.');
    }
    if (id === 'replace' && draft.replaceOut && !draft.replaceIn)
      throw Error('Elegí el nuevo conjuro o conservá el repertorio.');
    if (id === 'review') {
      if (!draft.reviewed) throw Error('Confirmá que revisaste tus elecciones.');
      if (JSON.stringify(base) !== JSON.stringify(state))
        throw Error('La ficha cambió mientras elegías. Cerrá y volvé a abrir la guía.');
      let next = P.apply(base, draft);
      commit('Subida guiada a bardo ' + next.level, s => Object.assign(s, next));
      try {
        localStorage.removeItem(DRAFT);
      } catch {}
      $('#modal').close();
      toast('Nivel ' + next.level + ' aplicado y elecciones guardadas.');
      return true;
    }
    return false;
  }
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-wizard]');
    if (!el) return;
    try {
      if (el.dataset.wizard === 'back') {
        step--;
        search = '';
        spellFilter = 'all';
        limit = 60;
        draw();
      }
      if (el.dataset.wizard === 'next') {
        if (!validateStep()) {
          step++;
          search = '';
          spellFilter = 'all';
          limit = 60;
          draw();
        }
      }
      if (el.dataset.wizard === 'more') {
        limit += 60;
        draw();
      }
      if (el.dataset.wizard === 'discard') {
        try {
          localStorage.removeItem(DRAFT);
        } catch {}
        $('#modal').close();
        draft = null;
      }
    } catch (err) {
      $('#form-error').textContent = err.message;
      $('#form-error').scrollIntoView({ block: 'nearest' });
    }
  });
  function redraw() {
    const y = $('#modal').scrollTop,
      open = [...$('#modal').querySelectorAll('details[open]')].map(x => x.querySelector('summary')?.textContent);
    draw();
    for (const el of $('#modal').querySelectorAll('details'))
      if (open.includes(el.querySelector('summary')?.textContent)) el.open = true;
    $('#modal').scrollTop = y;
  }
  function changed(e) {
    if (!$('#modal').classList.contains('learning-modal') || !draft) return;
    const el = e.target,
      n = el.name || '';
    if (el.id === 'learning-search') {
      search = el.value;
      const pos = el.selectionStart;
      redraw();
      $('#learning-search').focus();
      $('#learning-search').setSelectionRange(pos, pos);
      return;
    }
    if (el.id === 'learning-filter') {
      spellFilter = el.value;
      redraw();
      return;
    }
    if (n.startsWith('source:')) {
      const k = n.slice(7);
      draft.config.sources = el.checked
        ? [...new Set([...draft.config.sources, k])]
        : draft.config.sources.filter(x => x !== k);
    } else if (n.startsWith('config:')) {
      draft.config[n.slice(7)] = el.checked;
      if (!draft.config.feats) draft.asi = 'scores';
      if (!draft.config.versatility) draft.versatility = 'none';
    } else if (n.startsWith('expertise:')) {
      const k = n.slice(10);
      draft.expertise = el.checked ? [...draft.expertise, k] : draft.expertise.filter(x => x !== k);
    } else if (n.startsWith('pick:')) {
      const [, group, ...ids] = n.split(':'),
        id = ids.join(':');
      if (Array.isArray(draft[group]))
        draft[group] = el.checked ? [...draft[group], id] : draft[group].filter(x => x !== id);
      else draft[group] = el.checked ? id : '';
    } else if (Object.hasOwn(draft, n)) {
      draft[n] = el.type === 'checkbox' ? el.checked : el.value;
      if (n === 'replaceOut') draft.replaceIn = '';
      if (n === 'feat') draft.featConfirmed = false;
    } else return;
    saveDraft();
    if (!['featNotes', 'hpRoll', 'reviewed', 'featConfirmed'].includes(n)) redraw();
  }
  document.addEventListener('change', changed);
  document.addEventListener('input', e => {
    if (
      (['learning-search', ''].includes(e.target.id) && ['featNotes', 'hpRoll'].includes(e.target.name)) ||
      e.target.id === 'learning-search'
    )
      changed(e);
  });
  let catQuery = '',
    catLevel = 'all',
    catClass = 'bard',
    catLimit = 60;
  function catalog(reset = true) {
    if (reset) {
      catQuery = '';
      catLevel = 'all';
      catClass = 'bard';
      catLimit = 60;
    }
    let list = R.allSpells(state).filter(
      x =>
        (catClass === 'all' || x.bard) &&
        (catLevel === 'all' || x.level === Number(catLevel)) &&
        [x.name, x.english || ''].join(' ').toLowerCase().includes(catQuery.toLowerCase()),
    );
    modal(
      'Catálogo de conjuros 2014',
      `<p class="small">${Catalog.spells.length} conjuros indexados. El filtro «Todas las clases» sirve para explorar Secretos mágicos. Los textos completos SRD nuevos están en inglés; las demás referencias indican dónde consultar su efecto.</p><div class="toolbar"><input class="control" id="catalog-query" aria-label="Buscar conjuro" placeholder="Buscar conjuro…" value="${esc(catQuery)}"><select id="catalog-level" class="control" aria-label="Nivel del catálogo"><option value="all">Todos los niveles</option>${Array.from({ length: 10 }, (_, i) => `<option value="${i}" ${catLevel === String(i) ? 'selected' : ''}>${i ? 'Nivel ' + i : 'Trucos'}</option>`).join('')}</select><select id="catalog-class" class="control" aria-label="Lista de clase"><option value="bard">Lista de bardo</option><option value="all" ${catClass === 'all' ? 'selected' : ''}>Todas las clases</option></select></div><p class="small">${list.length} resultados. Tu repertorio se elige en la guía de subida.</p><div class="learn-list">${list
        .slice(0, catLimit)
        .map(
          sp =>
            `<details class="learn-card"><summary><b>${esc(sp.name)}</b><small>${sp.level ? 'Nivel ' + sp.level : 'Truco'} · ${esc(sp.sourceKey || sp.source)}${sp.optionalBard ? ' · Lista ampliada de Tasha' : ''}</small></summary><p class="small">${esc(sp.time)} · ${esc(sp.range)} · ${esc(sp.components)} · ${esc(sp.duration)}</p><p class="spell-reference">${esc(sp.text)}</p>${sp.referenceOnly ? `<a href="${referenceURL(sp.english || sp.name)}" target="_blank" rel="noopener">Consultar referencia oficial</a>` : ''}</details>`,
        )
        .join(
          '',
        )}</div>${list.length > catLimit ? '<button type="button" class="button secondary" data-catalog-more>Mostrar más</button>' : ''}`,
    );
    $('#modal').style.width = 'min(850px, calc(100vw - 24px))';
  }
  document.addEventListener('input', e => {
    if (e.target.id === 'catalog-query') {
      catQuery = e.target.value;
      const pos = e.target.selectionStart;
      catalog(false);
      $('#catalog-query').focus();
      $('#catalog-query').setSelectionRange(pos, pos);
    }
  });
  document.addEventListener('change', e => {
    if (e.target.id === 'catalog-level') {
      catLevel = e.target.value;
      catalog(false);
    }
    if (e.target.id === 'catalog-class') {
      catClass = e.target.value;
      catalog(false);
    }
  });
  document.addEventListener('click', e => {
    if (e.target.closest('[data-catalog-more]')) {
      catLimit += 60;
      catalog(false);
    }
  });
  function configure() {
    const c = clone(Progression.config(state));
    modal('Libros y reglas de la mesa', sourceControls(c), fd => {
      const selected = Catalog.sources.filter(([id]) => fd.has('source:' + id)).map(([id]) => id);
      if (!selected.includes('PHB')) throw Error('Mantené habilitado el Manual del Jugador 2014.');
      commit('Fuentes y reglas opcionales actualizadas', s => {
        s.campaignSources = selected;
        s.progression = {
          ...c,
          sources: selected,
          expanded: fd.has('config:expanded'),
          versatility: fd.has('config:versatility'),
          magical: fd.has('config:magical'),
          feats: fd.has('config:feats'),
        };
      });
    });
  }
  return { start, catalog, configure, sourceControls, referenceURL };
})();
