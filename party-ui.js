const PartyUI = (() => {
  'use strict';
  const C = Classes,
    D = ClassData;
  let createDraft = null,
    createStep = 0,
    spellDraft = null,
    spellQuery = '',
    spellScope = 'class',
    spellLevel = 'all',
    spellLimit = 35;
  const className = s => C.info(s).name,
    canon = s =>
      String(s)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
  const classLink = s => 'https://dnd5e.wikidot.com/' + C.id(s);
  const prepNames = {
    none: 'Sin lanzamiento de clase',
    known: 'Conjuros conocidos',
    prepared: 'Conjuros preparados',
    book: 'Libro y conjuros preparados',
  };
  const skillId = s => ({ 'animal handling': 'animal', 'sleight of hand': 'sleight' })[s] || s;
  function decorate() {
    const n = document.getElementById('active-character-name');
    if (n) n.textContent = state.name;
    document.title = state.name + ' · Cuaderno de aventura';
    Portrait.decorate(state);
    const foot = document.querySelector('.sidebar-foot p');
    if (foot) foot.textContent = MulticlassUI.label(state);
  }
  function list() {
    let items;
    try {
      items = CharacterStorage.list();
    } catch (e) {
      throw e;
    }
    modal(
      'Personajes de este dispositivo',
      `<p>Cada ficha tiene su propio progreso, recursos y equipo. Tus compañeros pueden abrir esta página y crear sus personajes en sus dispositivos.</p><p class="small">No se sincronizan entre personas ni navegadores. Usá exportar e importar para trasladar una ficha.</p><div class="party-list">${items
        .map(x => {
          let label = x.name;
          try {
            label = JSON.parse(localStorage.getItem(x.key) || 'null')?.name || label;
          } catch {}
          return `<div class="list-row"><div class="party-person">${Portrait.savedThumb(x.key, label)}<b>${esc(label)}</b></div><div class="actions">${x.key === KEY ? '<span class="tag">Abierto</span>' : button('Abrir', 'party-open', '', `data-id="${esc(x.id)}"`) + button('Eliminar', 'party-delete', 'danger', `data-id="${esc(x.id)}"`)}</div></div>`;
        })
        .join(
          '',
        )}</div><div class="actions section-space">${button('Crear personaje', 'party-create', '')}${button('Importar como personaje nuevo', 'party-import')}${state ? button('Exportar personaje actual', 'backup') : ''}</div>`,
    );
  }
  function welcome() {
    document.title = 'Cuaderno de aventura · D&D 5e 2014';
    document.getElementById('active-character-name').textContent = 'CUADERNO DE AVENTURA';
    document.getElementById('breadcrumb').textContent = 'Empezá tu ficha';
    document.getElementById('save-status').textContent = 'Sin personaje abierto';
    document.getElementById('nav').innerHTML = '';
    const pic = document.querySelector('.portrait');
    if (pic) pic.hidden = true;
    let items = [];
    try {
      items = CharacterStorage.list();
    } catch (e) {
      storageIssue = e.message;
    }
    document.getElementById('main').innerHTML =
      `<section class="welcome-card card"><p class="eyebrow">TU MESA · TUS PERSONAJES · REGLAS 2014</p><h1>Creá tu personaje.</h1><p>Un cuaderno para tus aventuras: conjuros, combate, equipo y subidas de nivel, todo en tu propia ficha.</p><div class="welcome-actions">${button('Crear personaje', 'party-create', '')}${button('Importar una ficha JSON', 'party-import')}<a class="button secondary" href="./dm.html">Soy el DM</a></div><p class="small">Elegí tu clase, raza y trasfondo. Si ya tenés una copia de tu ficha, podés importarla y seguir jugando.</p>${items.length ? `<div class="divider"></div><h2>Fichas guardadas</h2><div class="party-list">${items.map(x => `<div class="list-row"><div class="party-person">${Portrait.savedThumb(x.key, x.name)}<b>${esc(x.name)}</b></div>${button('Abrir', 'party-open', 'secondary', `data-id="${esc(x.id)}"`)}</div>`).join('')}</div>` : ''}${storageIssue ? `<div class="banner"><p>${esc(storageIssue)}</p>${rawBroken ? button('Descargar datos guardados', 'raw-backup') : ''}</div>` : ''}<div class="welcome-note"><b>Tu ficha se guarda en este dispositivo.</b><p class="small">Cada integrante de la party crea la suya. Después, en <b>Mesa</b>, se une con el código del DM para compartirla en vivo.</p></div></section>`;
  }
  function startCreate() {
    createDraft = {
      name: '',
      classId: 'fighter',
      level: 1,
      campaignSources: Campaign.selected(state).slice(),
      raceId: '',
      backgroundId: '',
      race: '',
      background: '',
      languages: '',
      abilities: { str: '', dex: '', con: '', int: '', wis: '', cha: '' },
      skills: [],
      originSkills: {},
      extraSkills: [],
      raceSkillMode: '',
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
    createStep = 0;
    drawCreate();
  }
  function collectCreate() {
    const f = document.getElementById('dialog-form');
    if (!f) return;
    const fd = new FormData(f),
      d = createDraft;
    if (createStep === 0) {
      for (const k of ['name', 'race', 'background', 'languages', 'classId', 'raceId', 'backgroundId'])
        d[k] = String(fd.get(k) || '').trim();
      d.level = Number(fd.get('level'));
      CreationSkills.reconcile(d);
    }
    if (createStep === 1) {
      for (const k of Object.keys(d.abilities)) d.abilities[k] = fd.get(k);
      d.skills = fd.getAll('skill');
      d.extraSkills = fd.getAll('extraSkill');
      d.raceSkillMode = String(fd.get('raceSkillMode') || '');
      d.originSkills = Object.fromEntries(
        CreationSkills.plan(d)
          .groups.filter(g => g.id !== 'class')
          .map(g => [g.id, fd.getAll('origin:' + g.id)]),
      );
      d.subclass = fd.get('subclass') || '';
    }
    if (createStep === 2) {
      for (const k of ['hp', 'speed']) d[k] = fd.get(k);
      EquipmentUI.collectCreation(fd, d);
      d.full = fd.has('full');
    }
  }
  function validateCreateStep() {
    const d = createDraft,
      c = D.classes[d.classId];
    if (createStep === 0 && (!d.name || !c || !Number.isInteger(d.level) || d.level < 1 || d.level > 20 || !d.race))
      throw Error('Indicá nombre, clase, nivel 1–20 y raza o linaje.');
    if (createStep === 1) {
      for (const v of Object.values(d.abilities))
        if (v === '' || !Number.isInteger(Number(v)) || Number(v) < 1 || Number(v) > 30)
          throw Error('Ingresá las seis puntuaciones finales, entre 1 y 30.');
      CreationSkills.validate(d);
      if (d.level >= c.subclassLevel && !d.subclass) throw Error('Elegí la subclase para ese nivel.');
    }
    if (createStep === 2) Equipment.validateDraft(d);
  }
  function drawCreate() {
    const d = createDraft,
      c = D.classes[d.classId],
      labels = ['Identidad', 'Características y clase', 'Equipo y recursos', 'Revisar'];
    let body = `<p class="eyebrow">PASO ${createStep + 1} DE 4 · ${labels[createStep]}</p>`;
    if (createStep === 0)
      body += `<div class="form-grid">${field('Nombre', 'name', d.name, 'text', 'required maxlength="100"')}${select(
        'Clase (2014)',
        'classId',
        Object.values(D.classes).map(c => [c.id, c.name]),
        d.classId,
      )}${field('Nivel inicial', 'level', d.level, 'number', 'min="1" max="20" required')}${Campaign.identityFields(d)}${field('Idiomas', 'languages', d.languages, 'text', 'maxlength="500"')}</div><p class="small">Podés escribir cualquier raza o trasfondo autorizado. Esta guía cubre personajes de una sola clase; no calcula multiclase.</p><section id="create-skill-summary" class="battle-rule">${creationSummary(d, true)}</section>`;
    if (createStep === 1) {
      body += `<h3>${c.name} · Dado de Golpe d${c.die}</h3><p class="small">Ingresá puntuaciones finales, con los bonos de raza y mejoras ya incluidos. No se suman bonos de raza automáticamente.</p>${button('Usar matriz estándar como punto de partida', 'party-array')}<div class="form-grid">${Object.entries(
        R.attrs,
      )
        .map(([k, v]) => field(v, k, d.abilities[k], 'number', 'required min="1" max="30"'))
        .join(
          '',
        )}</div><div id="creation-skills">${creationSkillFields(d)}</div>${d.level >= c.subclassLevel ? select('Subclase', 'subclass', [['', 'Elegí una subclase'], ...D.subclasses.filter(x => x.classId === d.classId && (Campaign.enabled(d, x) || x.id === d.subclass)).map(x => [x.id, x.name + ' · ' + x.source])], d.subclass) : `<p class="small">Elegís subclase en nivel ${c.subclassLevel}.</p>`}`;
    }
    if (createStep === 2) {
      const suggested = c.die + (d.level - 1) * (c.die / 2 + 1) + d.level * R.mod(Number(d.abilities.con));
      body += `<div id="creation-equipment">${EquipmentUI.creationFields(d)}</div><h3 class="section-space">PG y recursos</h3><p class="small">PG sugeridos con aumentos fijos: ${Math.max(1, suggested)}. Si tiraron dados o tenés otros rasgos que dan PG, ingresá el máximo correspondiente.</p><div class="form-grid">${field('PG máximos', 'hp', d.hp || Math.max(1, suggested), 'number', 'min="1" max="2000" required')}${field('Velocidad base (pies)', 'speed', d.speed, 'number', 'min="0" max="500" required')}</div><label class="check"><input type="checkbox" name="full" ${d.full ? 'checked' : ''}>Crear con PG, espacios y recursos completos. Desmarcá si los valores actuales están pendientes.</label>`;
    }

    if (createStep === 3)
      body += `<h3>${esc(d.name)}</h3><p>${esc(d.race)} · ${c.name} ${d.level}${d.subclass ? ' · ' + esc(D.subclasses.find(x => x.id === d.subclass)?.name) : ''}</p><p><b>Competencias:</b> ${CreationSkills.total(
        d,
      )
        .map(k => esc(CreationSkills.label(k)))
        .join(
          ', ',
        )}.</p><p>PG máximos: ${esc(d.hp)}.</p>${EquipmentUI.review(d)}<p class="small">La ficha mostrará las elecciones pendientes: conjuros, preparación, Pericias, estilos, invocaciones y otras opciones según la clase. No se eligen por vos.</p><label class="check"><input type="checkbox" name="reviewed" required>Revisé mis puntuaciones y el equipo inicial con las reglas de mi mesa.</label>`;
    body += `<div class="wizard-actions">${createStep ? button('Atrás', 'party-create-back') : button('Cancelar', 'party')}<button class="button" type="submit">${createStep === 3 ? 'Crear personaje' : 'Continuar'}</button></div>`;
    modal(
      'Crear personaje',
      body,
      () => {
        collectCreate();
        validateCreateStep();
        if (createStep < 3) {
          createStep++;
          drawCreate();
          return false;
        } else {
          const s = makeCharacter(createDraft);
          const id = CharacterStorage.add(s);
          CharacterStorage.activate(id);
        }
      },
      '',
    );
    document.querySelector('#dialog-form>.modal-body>.modal-actions')?.remove();
    document.getElementById('dialog-form').addEventListener('change', e => {
      if (createStep === 0 && ['classId', 'raceId', 'backgroundId'].includes(e.target.name)) {
        const previousRace = d.raceId;
        collectCreate();
        if (previousRace !== d.raceId) {
          d.raceSkillMode = '';
          CreationSkills.reconcile(d);
          const rs = Campaign.race(d)?.speed;
          d.speed = typeof rs === 'number' ? rs : rs?.walk || 30;
        }
        document.getElementById('create-skill-summary').innerHTML = creationSummary(d, true);
      }
      if (createStep === 2 && e.target.closest('#creation-equipment')) {
        const name = e.target.name,
          box = document.querySelector('#modal .modal-body'),
          top = box.scrollTop;
        collectCreate();
        if (name === 'equipmentMode') {
          delete d.equipmentDefense;
          d.gold = 0;
        }
        const el = document.getElementById('creation-equipment');
        el.innerHTML = EquipmentUI.creationFields(d);
        [...el.querySelectorAll('input,select,textarea')].find(x => x.name === name)?.focus({ preventScroll: true });
        box.scrollTop = top;
      }
      if (createStep === 1 && e.target.closest('#creation-skills')) {
        const name = e.target.name,
          value = e.target.value,
          box = document.querySelector('#modal .modal-body'),
          top = box.scrollTop,
          open = document.querySelector('#skill-extras')?.open;
        collectCreate();
        CreationSkills.reconcile(d);
        document.getElementById('creation-skills').innerHTML = creationSkillFields(d);
        if (open) document.getElementById('skill-extras').open = true;
        [...document.querySelectorAll('#creation-skills input, #creation-skills select')]
          .find(el => el.name === name && el.value === value)
          ?.focus({ preventScroll: true });
        box.scrollTop = top;
      }
    });
  }
  function creationSummary(d, nextStep = false) {
    const p = CreationSkills.plan(d);
    return `<h3>Habilidades concedidas automáticamente</h3>${
      p.fixedIds.length
        ? '<ul>' +
          p.fixedIds
            .map(
              k =>
                '<li><b>' +
                esc(CreationSkills.label(k)) +
                '</b> · ' +
                p.fixed
                  .filter(x => x.id === k)
                  .map(x => esc(x.source))
                  .join(' / ') +
                '</li>',
            )
            .join('') +
          '</ul>'
        : '<p class="small">Esta combinación no concede habilidades fijas.</p>'
    }<p class="small">No consumen tus ${p.groups.find(g => g.id === 'class').count} elecciones de clase. Las elecciones de raza, trasfondo y los reemplazos se completan ${nextStep ? 'en el siguiente paso' : 'en los grupos de abajo'}.</p>`;
  }
  function creationSkillFields(d) {
    const p = CreationSkills.plan(d),
      used = new Set(CreationSkills.total(d)),
      fixed = new Set(p.fixedIds);
    const checks = (name, from, chosen, count) =>
      `<div class="source-grid">${from
        .map(k => {
          const own = chosen.includes(k),
            granted = used.has(k) && !own,
            full = chosen.length >= count;
          return `<label class="check"><input type="checkbox" name="${esc(name)}" value="${k}" ${own || granted ? 'checked' : ''} ${granted || (!own && full) ? 'disabled' : ''}><span>${esc(CreationSkills.label(k))}${granted ? '<small class="skill-grant">' + (fixed.has(k) ? 'Concedida automáticamente' : 'Ya elegida en otra fuente') + '</small>' : ''}</span></label>`;
        })
        .join('')}</div>`;
    return (
      creationSummary(d) +
      (p.variant
        ? select(
            p.variant.title,
            'raceSkillMode',
            [['', 'Elegí el rasgo'], ...p.variant.options],
            d.raceSkillMode || '',
          )
        : '') +
      p.groups
        .map(
          g =>
            `<fieldset class="skill-choice"><legend>${esc(g.title)}</legend><p class="small" role="status">Elegidas: ${CreationSkills.picks(d, g).length} de ${g.count}${g.id === 'class' ? ' · Solo cuentan las que elegís en este grupo.' : ''}.</p>${g.originalCount > g.count ? '<p class="small">Ya recibís parte de estas opciones por otra fuente. Completá las restantes y elegí los reemplazos al final.</p>' : ''}${g.id === 'replacement' ? '<p class="small">Dos fuentes conceden la misma habilidad. Elegí otra habilidad; repetir competencia no da Pericia.</p>' : ''}${checks(g.id === 'class' ? 'skill' : 'origin:' + g.id, g.from, CreationSkills.picks(d, g), g.count)}</fieldset>`,
        )
        .join('') +
      `<details id="skill-extras" class="battle-rule" ${d.extraSkills.length ? 'open' : ''}><summary>Otras competencias: dote, rasgo o DM</summary><p class="small">Marcá solo las concedidas por una fuente adicional. También podés usar este apartado para una raza o un trasfondo escrito manualmente.</p>${checks(
        'extraSkill',
        Rules.skills.map(([k]) => k),
        d.extraSkills,
        18,
      )}</details>`
    );
  }
  function makeCharacter(d) {
    const s = R.initial();
    s.classId = d.classId;
    s.classSubclass = d.subclass;
    s.subclass = d.subclass === 'bard-college-of-eloquence' ? 'eloquence' : 'manual';
    s.name = d.name;
    s.level = Number(d.level);
    s.raceId = d.raceId || '';
    s.backgroundId = d.backgroundId || '';
    s.race = Campaign.race(s)?.name || d.race;
    s.background = Campaign.background(s)?.name || d.background;
    s.campaignSources = Campaign.selected(d).slice();
    s.progression.sources = s.campaignSources.slice();
    s.languages = d.languages;
    s.abilities = Object.fromEntries(Object.entries(d.abilities).map(([k, v]) => [k, Number(v)]));
    s.proficiencies = CreationSkills.total(d);
    s.expertise = [];
    s.known = [];
    s.extras = [];
    s.secretKnown = [];
    s.prepared = [];
    s.classChoices = {};
    s.classSpent = {};
    s.arcanum = {};
    s.spellModes = {};
    s.hpBase = Number(d.hp) - s.level * R.mod(s.abilities.con);
    s.hpConfirmed = true;
    s.hp = d.full ? Number(d.hp) : null;
    s.slotsSpent = Array(9).fill(d.full ? 0 : null);
    s.inspirationSpent = d.full ? 0 : null;
    s.hdSpent = d.full ? 0 : null;
    s.speed = Number(d.speed);
    s.acBase = Number(d.armor);
    s.acBonus = Number(d.bonus);
    s.inventory = d.gear
      .split('\n')
      .map(x => x.trim())
      .filter(Boolean)
      .map(name => ({ id: uid(), name, qty: 1, category: 'Equipo', weight: null, location: 'Sin asignar', notes: '' }));
    s.gold = { cp: 0, sp: 0, ep: 0, gp: Number(d.gold), pp: 0 };
    s.goldConfirmed = true;
    s.notes = '';
    s.companion = { name: '', notes: '' };
    s.mule = { name: '', hp: null, max: 1, notes: '' };
    s.features = [];
    s.extraResources = [];
    s.classNotes = CreationSkills.variant(d)
      ? CreationSkills.variant(d).title +
        ': ' +
        (CreationSkills.variant(d).options.find(([k]) => k === d.raceSkillMode)?.[1] || 'Pendiente')
      : '';
    s.creationConfirmed = true;
    s.classResourcesConfirmed = d.full;
    EquipmentUI.initialState(d, s);
    return R.validate(s);
  }
  function classPage() {
    const c = C.info(state),
      sc = C.sub(state),
      d = R.stats(state),
      tasks = C.tasks(state);
    return (
      header(
        'Tu clase.',
        MulticlassUI.label(state, true),
        button('Subir de nivel', 'levelup', '') + button('Resolver elecciones', 'resolve-choices'),
      ) +
      `<div class="banner"><div><b>${tasks.length ? 'Elecciones pendientes' : 'Revisá tus rasgos y opciones'}</b>${tasks.length ? pendingList() : '<p class="small">Las elecciones de rasgos, equipo y efectos especiales se registran con las reglas de la mesa.</p>'}</div><div class="actions">${button('Conjuros', 'spell-manage')}${button('Elecciones de clase', 'class-choices')}${button('Subclase y Pericias', 'class-config')}</div></div><div class="grid two"><section class="card"><h2>Progresión 1–20</h2><div class="class-timeline">${Array.from(
        { length: 20 },
        (_, i) => i + 1,
      )
        .map(l => {
          const fs = C.features({ ...state, level: l }, l).filter(f => f.level === l);
          return `<details ${l === state.level ? 'open' : ''}><summary>Nivel ${l}${l === state.level ? ' · Actual' : ''}${C.asiLevels(state).includes(l) ? ' · Mejora o dote' : ''}</summary>${fs.map(f => `<div class="feature"><h3>${esc(f.name)}</h3><p class="small">${esc(f.source)}${f.children?.length ? ' · ' + f.children.map(esc).join(' · ') : ''}</p>${f.text ? `<details><summary>Texto SRD (inglés)</summary><p class="spell-reference">${esc(f.text)}</p></details>` : `<a href="${classLink(state)}" target="_blank" rel="noopener">Consultar el rasgo y sus elecciones</a>`}</div>`).join('') || '<p class="small">Consultá el aumento de recursos y las mejoras de los rasgos previos.</p>'}</details>`;
        })
        .join('')}</div></section><div class="stack"><section class="card"><h2>Elecciones registradas</h2>${
        Object.entries(state.classChoices || {})
          .map(
            ([name, ids]) =>
              `<div class="feature"><h3>${esc(name)}</h3><p>${ids.map(x => esc(D.options.find(o => o.id === x)?.name || x)).join(', ')}</p></div>`,
          )
          .join('') ||
        '<p class="small">Estilos, infusiones, Metamagia, invocaciones y otras elecciones aparecerán acá.</p>'
      }${button('Editar elecciones', 'class-choices')}</section><section class="card"><h2>Detalles de tus rasgos</h2><p class="small">Anotá decisiones internas del rasgo (enemigo predilecto, terreno, ancestro, formas, objetos infundidos…), requisitos y efectos que debas aplicar. Podés crear recursos o acciones de mesa para llevar sus usos.</p><label class="field">Notas de clase<textarea id="class-notes">${esc(state.classNotes || '')}</textarea></label>${button('Guardar notas', 'class-notes-save', '')}<div class="actions section-space">${button('Añadir rasgo', 'feature-new')}${button('Añadir recurso', 'resource-new')}</div><p class="small section-space"><a href="${classLink(state)}" target="_blank" rel="noopener">Referencia de ${c.name}</a>. Las opciones no incluidas se pueden registrar manualmente. Las reglas opcionales deben acordarse con el DM.</p></section></div></div>`
    );
  }
  function pendingList() {
    return (
      '<div class="pending-list">' +
      C.taskDetails(state)
        .map(
          t =>
            `<div class="pending-row"><span>${esc(t.text)}</span>${button('Elegir', 'resolve-task', 'secondary', `data-id="${esc(t.id)}"`)}</div>`,
        )
        .join('') +
      '</div>'
    );
  }
  function resolveTask(id) {
    const t = C.taskDetails(state).find(x => x.id === id);
    if (!t) return resolveChoices();
    if (t.action === 'spell-manage') return manageSpells(t.spellLevel || 'all');
    if (t.action === 'class-config') return classConfig();
    chooseClass(t.group);
  }
  function resolveChoices() {
    const tasks = C.taskDetails(state);
    if (tasks.length === 1) return resolveTask(tasks[0].id);
    modal(
      'Completar elecciones',
      tasks.length
        ? '<p>Elegí qué completar. Cada opción abre su selector.</p>' + pendingList()
        : '<p>No tenés elecciones pendientes para este nivel.</p>',
    );
  }
  function classConfig() {
    const c = C.info(state);
    modal(
      'Subclase, competencias y Pericias',
      `${state.level >= c.subclassLevel ? select('Subclase', 'subclass', [['', 'Pendiente'], ...D.subclasses.filter(x => x.classId === C.id(state) && (Campaign.enabled(state, x) || x.id === state.classSubclass)).map(x => [x.id, x.name + ' · ' + x.source])], state.classSubclass || C.sub(state)?.id || '') : ''}<p class="small">Marcá competencias concedidas por clase, raza, trasfondo o DM. La Pericia requiere competencia previa. Revisá cuántas te concede tu clase.</p><div class="class-skills">${R.skills.map(([k, n]) => `<div><b>${n}</b><label><input type="checkbox" name="skill" value="${k}" ${state.proficiencies.includes(k) ? 'checked' : ''}> Competencia</label><label><input type="checkbox" name="expertise" value="${k}" ${state.expertise.includes(k) ? 'checked' : ''}> Pericia</label></div>`).join('')}</div><label class="check"><input type="checkbox" name="optional" ${state.optionalClassFeatures ? 'checked' : ''}>Mostrar rasgos opcionales de clase (Tasha y otras fuentes). Revisaré reemplazos y requisitos con el DM.</label>`,
      fd =>
        commit('Subclase y competencias actualizadas', s => {
          if (fd.has('subclass')) {
            s.classSubclass = fd.get('subclass');
            s.subclass = s.classSubclass === 'bard-college-of-eloquence' ? 'eloquence' : 'manual';
          }
          s.proficiencies = fd.getAll('skill');
          s.expertise = fd.getAll('expertise');
          s.optionalClassFeatures = fd.has('optional');
        }),
    );
  }
  function chooseClass(group) {
    const groups = C.choices(state).filter(g => !group || g.name === group);
    if (!groups.length) {
      modal(
        'Opciones de tu clase',
        '<p>Esta clase y nivel no tienen opciones de catálogo para elegir.</p>' +
          (C.tasks(state).length ? pendingList() : '<p>No tenés elecciones pendientes.</p>'),
      );
      return;
    }
    modal(
      'Opciones de tu clase',
      `<p class="small">Las opciones muestran fuente y requisitos. Elegí hasta el máximo de cada grupo. Los efectos sobre armas, armadura u otros recursos se aplican según el rasgo; registralos en la ficha. Se pueden dejar elecciones pendientes.</p>${groups.map(g => `<details open class="battle-rule"><summary>${esc(g.name)} · ${g.count} elección(es)</summary><div class="option-picker">${g.options.map(o => `<label class="option-row"><input type="checkbox" name="choice:${esc(g.name)}" value="${esc(o.id)}" ${(state.classChoices?.[g.name] || []).includes(o.id) ? 'checked' : ''}><span><b>${esc(o.name)}</b><small>${esc(o.source)}${o.prerequisite.length ? ' · Requisitos: ' + esc(prerequisiteText(o.prerequisite)) : ''}</small>${o.text ? `<details><summary>Efecto SRD</summary><p class="spell-reference">${esc(o.text)}</p></details>` : ''}</span></label>`).join('')}</div></details>`).join('') || '<p>No hay una elección de catálogo pendiente para esta clase y nivel. Usá las notas para otras decisiones del rasgo.</p>'}<label class="check"><input type="checkbox" required>Revisé los requisitos de las opciones elegidas con mi DM.</label>`,
      fd =>
        commit('Opciones de clase actualizadas', s => {
          s.classChoices = s.classChoices || {};
          for (const g of groups) {
            const ids = fd.getAll('choice:' + g.name);
            if (ids.length > g.count) throw Error('Superás el máximo de ' + g.name);
            s.classChoices[g.name] = ids;
          }
        }),
    );
  }
  function prerequisiteText(p) {
    return p
      .map(x =>
        Object.entries(x)
          .map(([k, v]) => k + ': ' + (typeof v === 'string' || typeof v === 'number' ? v : JSON.stringify(v)))
          .join(', '),
      )
      .join(' / ');
  }
  function levelup() {
    if (!state.classId && C.id(state) === 'bard' && state.subclass === 'eloquence') return Learning.start();
    if (R.totalLevel(state) >= 20) throw Error('Ya estás en nivel 20 de personaje.');
    const next = state.level + 1,
      c = C.info(state),
      n = { ...state, level: next },
      d = R.stats(n),
      asi = C.asiLevels(state).includes(next),
      sc = next >= c.subclassLevel && !C.sub(state);
    modal(
      'Subir a ' + c.name + ' ' + next,
      `<p>Tu reserva será ${next}d${c.die}. Los recursos gastados se conservan: subir de nivel no aplica un descanso.</p><div class="form-grid">${select(
        'Aumento de PG',
        'hpMethod',
        [
          ['fixed', 'Fijo: ' + (c.die / 2 + 1) + ' + CON'],
          ['rolled', 'Tirada de d' + c.die + ' + CON'],
        ],
        'fixed',
      )}${field('Resultado del dado (si tiraste)', 'hpRoll', c.die / 2 + 1, 'number', `min="1" max="${c.die}" required`)}</div>${sc ? select('Elegí subclase', 'subclass', [['', 'Elegir…'], ...D.subclasses.filter(x => x.classId === C.id(state) && (Campaign.enabled(state, x) || x.id === state.classSubclass)).map(x => [x.id, x.name + ' · ' + x.source])], '') : ''}${
        asi
          ? `<h3>Mejora de características o dote</h3>${select(
              'Elegí mejora',
              'asi',
              [
                ['scores', 'Dos aumentos de +1 (pueden ser la misma característica)'],
                ['feat', 'Dote autorizada por el DM'],
              ],
              'scores',
            )}<div class="form-grid">${select('Primer +1', 'a1', Object.entries(R.attrs), 'str')}${select('Segundo +1', 'a2', Object.entries(R.attrs), 'str')}</div>${select('Dote (si elegiste dote)', 'feat', [['', 'Elegir…'], ...Catalog.feats.filter(x => Campaign.enabled(state, x)).map(x => [x.id, x.name + ' · ' + x.sourceKey])], '')}${area('Elecciones y efectos de la dote', 'featNotes', '')}`
          : ''
      }<h3>Rasgos de este nivel</h3><ul>${
        C.features(n)
          .filter(x => x.level === next)
          .map(x => '<li>' + esc(x.name) + '</li>')
          .join('') || '<li>Mejoras de recursos y rasgos previos.</li>'
      }</ul><p class="small">Después de confirmar, Clase te indicará los conjuros, Pericias y opciones por elegir. Revisá también las elecciones propias de cada rasgo y subclase.</p><label class="check"><input type="checkbox" name="reviewed" required>Revisé el aumento y, si elegí una dote, sus requisitos y ajustes.</label>`,
      fd => {
        const data = Object.fromEntries(fd);
        data.reviewed = fd.has('reviewed');
        commit('Subida a nivel ' + next, s => Object.assign(s, C.levelUp(s, data)));
        location.hash = 'class';
      },
      'Confirmar subida',
    );
  }
  function character() {
    const d = R.stats(state),
      c = C.info(state);
    return (
      header(
        esc(state.name),
        `${esc(state.race || (!state.classId ? 'Semielfo' : 'Linaje por registrar'))} · ${c.name} ${state.level}${C.sub(state) ? ' · ' + C.sub(state).name : ''}`,
        button('Características y armadura', 'stats') +
          button('Competencias', 'class-config') +
          button('Subir de nivel', 'levelup', '') +
          button('Libros habilitados', 'campaign-sources'),
      ) +
      Portrait.card(state) +
      `<div class="ability-grid">${Object.entries(R.attrs)
        .map(
          ([k, label]) =>
            `<section class="card ability-box"><span>${label}</span><strong>${sign(d.mods[k])}</strong><span>Puntuación ${state.abilities[k]}</span></section>`,
        )
        .join(
          '',
        )}</div><div class="grid two section-space"><section class="card"><h2>Habilidades</h2>${R.skills.map(([k, n]) => `<div class="list-row"><span>${n}${state.expertise.includes(k) ? ' ◆' : state.proficiencies.includes(k) ? ' •' : ''}</span><button class="roll-button" data-action="skill-roll" data-id="${k}">${sign(R.skillBonus(state, k))}</button></div>`).join('')}</section><div class="stack"><section class="card"><h2>Salvaciones</h2>${Object.entries(
        R.attrs,
      )
        .map(
          ([k, n]) =>
            `<div class="list-row"><span>${n}</span><button class="roll-button" data-action="roll" data-label="Salvación de ${n}" data-bonus="${R.saveBonus(state, k)}">${sign(R.saveBonus(state, k))}</button></div>`,
        )
        .join(
          '',
        )}<p class="small section-space">Competencia de clase: ${c.saves.map(k => R.attrs[k]).join(', ')}.</p></section><section class="card"><h2>Identidad y competencias</h2><p>${esc(state.background || (!state.classId ? 'Comerciante gremial' : ''))}</p><p>Idiomas: ${esc(state.languages || (!state.classId ? 'Común, Élfico, Enano, Gnómico' : 'Por registrar'))}</p><p class="small">Armaduras: ${esc(c.armor || 'Ninguna')}<br>Armas: ${esc(c.weapons || 'Consultar clase')}<br>Herramientas: ${esc(c.tools || 'Consultar elecciones de clase, raza y trasfondo')}<br>Velocidad base registrada: ${state.speed ?? 30} pies.</p>${button('Editar identidad', 'party-identity')}</section></div></div>${EquipmentUI.panel(state)}${Campaign.sheetOrigins()}<section class="card section-space"><h2>Rasgos y notas</h2>${
        !state.classId
          ? R.features(state)
              .map(([n, t]) => `<div class="feature"><h3>${esc(n)}</h3><p>${esc(t)}</p></div>`)
              .join('')
          : state.features.map(x => `<div class="feature"><h3>${esc(x.name)}</h3><p>${esc(x.text)}</p></div>`).join('')
      }<div class="actions">${button('Ver clase y todos sus niveles', 'class-open')}${button('Añadir rasgo', 'feature-new')}${button('Editar rasgos propios', 'feature-manage')}</div></section>`
    );
  }
  function automaticSpellNote(s, id, grants = C.granted(s)) {
    const g = grants.details[id];
    if (!g) return '';
    const label = g.mode === 'prepared' ? 'Siempre preparado' : 'Concedido automáticamente';
    return `<div class="spell-origin" data-spell-origin="${esc(id)}"><b>${label} · ${esc(g.origin)}</b><small>${g.level ? 'Desde nivel ' + g.level : g.spellLevel ? 'Desde acceso a conjuros de nivel ' + g.spellLevel : ''}${g.mode === 'prepared' ? ' · No ocupa tus preparaciones diarias.' : ' · No ocupa una elección normal de conjuro o truco.'}</small></div>`;
  }
  function spells() {
    const d = R.stats(state),
      cast = C.casting(state),
      usable = C.usable(state),
      grants = C.granted(state),
      counts = C.spellCounts(state),
      ids = [
        ...new Set([
          ...state.known,
          ...state.extras,
          ...C.granted(state).prepared,
          ...C.granted(state).known,
          ...Object.values(state.arcanum || {}),
        ]),
      ];
    let list = ids
      .map(spellById)
      .filter(Boolean)
      .filter(
        s =>
          canon(s.name + ' ' + (s.english || '')).includes(canon(query)) &&
          (filter === 'all' ||
            (filter === 'ritual' && s.ritual) ||
            (filter === 'concentration' && s.concentration) ||
            (filter === 'reaction' && s.time === 'Reacción')),
      );
    list.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
    return (
      header(
        'Tu repertorio.',
        `${prepNames[cast.type]} · ${className(state)} · CD ${d.dc} · Ataque ${sign(d.attack)}`,
        button('Agregar / preparar conjuros', 'spell-manage', '') +
          button('Crear conjuro propio', 'spell-new') +
          button('Libros habilitados', 'campaign-sources') +
          button('Dados y siglas', 'rules-help'),
      ) +
      `<div class="banner"><p>${cast.type === 'book' ? 'El libro conserva lo aprendido. Para lanzar, prepará hasta ' + d.prepared + ' conjuros; los rituales del libro pueden lanzarse sin prepararlos.' : cast.type === 'prepared' ? 'Podés preparar hasta ' + d.prepared + ' conjuros de clase, además de los siempre preparados y extras.' : cast.type === 'known' ? 'Máximo de clase: ' + d.known + ' conjuros y ' + d.cantrips + ' trucos.' : 'Los conjuros concedidos por objetos, raza o el DM se agregan como extras.'} Los extras del DM pueden ser de cualquier clase o nivel.</p></div>${['prepared', 'book'].includes(cast.type) ? `<p class="spell-counts">${counts.prepared}/${d.prepared} preparados por vos · ${counts.automaticPrepared} siempre preparados por subclase${counts.automaticKnown ? ' · ' + counts.automaticKnown + ' concedido(s) automáticamente' : ''}.</p>` : ''}<div class="toolbar"><input class="control" id="spell-search" type="search" aria-label="Buscar conjuros" placeholder="Buscar por nombre español o inglés…" value="${esc(query)}"><select class="control" id="spell-filter" aria-label="Filtrar conjuros">${[
        ['all', 'Todos'],
        ['ritual', 'Rituales'],
        ['concentration', 'Concentración'],
        ['reaction', 'Reacciones'],
      ]
        .map(([v, l]) => `<option value="${v}" ${filter === v ? 'selected' : ''}>${l}</option>`)
        .join(
          '',
        )}</select></div><div class="spell-grid">${list.map(sp => `<div>${automaticSpellNote(state, sp.id, grants)}${!usable.includes(sp.id) ? '<p class="tag warn">No preparado</p>' : ''}${Object.values(state.arcanum || {}).includes(sp.id) ? '<p class="tag">Arcanum · 1 uso por descanso largo</p>' : ''}${spellCard(sp)}</div>`).join('') || '<p class="empty">Todavía no agregaste conjuros. Abrí el catálogo para elegirlos.</p>'}</div>`
    );
  }
  function manageSpells(level = 'all') {
    spellDraft = clone(state);
    spellQuery = '';
    spellScope = 'class';
    spellLevel = String(level);
    spellLimit = 35;
    drawSpells();
  }
  function statusOf(id, g = C.granted(spellDraft)) {
    if (g.details[id]) return g.details[id].mode === 'prepared' ? 'automatic-prepared' : 'automatic-known';
    if (Object.values(spellDraft.arcanum || {}).includes(id)) return 'arcanum';
    if (spellDraft.extras.includes(id)) return 'extra';
    if (spellDraft.secretKnown.includes(id)) return 'secret';
    if ((spellDraft.prepared || []).includes(id)) return 'prepared';
    if (spellDraft.known.includes(id))
      return spellById(id)?.level === 0 ? 'known' : C.casting(spellDraft).type === 'book' ? 'book' : 'known';
    return 'no';
  }
  function spellChoice(id, value) {
    const s = spellDraft,
      sp = spellById(id);
    if (C.spellGrant(s, id)) return;
    s.known = s.known.filter(x => x !== id);
    s.extras = s.extras.filter(x => x !== id);
    s.prepared = (s.prepared || []).filter(x => x !== id);
    s.secretKnown = s.secretKnown.filter(x => x !== id);
    s.spellModes = s.spellModes || {};
    delete s.spellModes[id];
    s.arcanum = s.arcanum || {};
    for (const [k, v] of Object.entries(s.arcanum)) if (v === id) delete s.arcanum[k];
    if (value === 'extra') s.extras.push(id);
    else if (value === 'arcanum') s.arcanum[sp.level] = id;
    else if (value !== 'no') {
      s.known.push(id);
      if (value === 'prepared') s.prepared.push(id);
      if (value === 'secret') s.secretKnown.push(id);
    }
  }
  function drawSpells() {
    const s = spellDraft,
      d = R.stats(s),
      mode = C.casting(s).type,
      g = C.granted(s),
      counts = C.spellCounts(s);
    let list = R.allSpells(s).filter(
      sp =>
        canon(sp.name + ' ' + (sp.english || '')).includes(canon(spellQuery)) &&
        (spellScope === 'all' ||
          (spellScope === 'campaign' && Campaign.enabled(s, sp)) ||
          statusOf(sp.id, g) !== 'no' ||
          (spellScope === 'class' && Campaign.enabled(s, sp) && (C.member(sp, s) || g.expanded.includes(sp.id)))) &&
        (spellLevel === 'all' || sp.level === Number(spellLevel)),
    );
    let body = `<p class="small">Elegí «Todo el catálogo» para agregar cualquier conjuro como <b>Extra del DM</b>, sin límite de clase, fuente o nivel. Podés indicar si usa espacios o si tiene un lanzamiento especial sin espacio. Los usos limitados por día se llevan con un recurso personalizado.</p>${['fighter', 'rogue'].includes(C.id(s)) ? '<p class="small">Caballero arcano y Embaucador arcano: revisá las escuelas permitidas y las excepciones de cada nivel antes de aprender o reemplazar un conjuro.</p>' : ''}<div class="toolbar"><input class="control" id="party-spell-search" aria-label="Buscar catálogo" placeholder="Nombre en español o inglés" value="${esc(spellQuery)}"><select class="control" id="party-spell-scope" aria-label="Lista"><option value="class" ${spellScope === 'class' ? 'selected' : ''}>Mi clase y seleccionados</option><option value="campaign" ${spellScope === 'campaign' ? 'selected' : ''}>Libros habilitados</option><option value="all" ${spellScope === 'all' ? 'selected' : ''}>Todo el catálogo · extras del DM</option></select><select class="control" id="party-spell-level" aria-label="Nivel">${[['all', 'Todos los niveles'], ...Array.from({ length: 10 }, (_, i) => [i, i ? 'Nivel ' + i : '0 · Trucos'])].map(([v, n]) => `<option value="${v}" ${String(v) === spellLevel ? 'selected' : ''}>${n}</option>`).join('')}</select></div><p class="small">${list.length} resultados · ${counts.known} elegidos en repertorio/libro · ${counts.prepared}/${d.prepared} preparados por vos · ${counts.automaticPrepared} siempre preparados · ${counts.automaticKnown} concedido(s) automáticamente · ${s.extras.length} registros extra del DM.</p><div class="party-spell-list">${list
      .slice(0, spellLimit)
      .map(sp => {
        let options = [['no', 'No seleccionado']];
        const valid = Campaign.enabled(s, sp) && (C.member(sp, s) || g.expanded.includes(sp.id));
        if (valid && sp.level <= d.slots.length) {
          if (sp.level === 0) options.push(['known', 'Truco conocido']);
          else if (mode === 'book') options.push(['book', 'En el libro'], ['prepared', 'Libro + preparado']);
          else if (mode === 'prepared') options.push(['prepared', 'Preparado']);
          else options.push(['known', 'Conocido']);
        }
        if (
          C.id(s) === 'bard' &&
          (s.level >= 10 || (C.sub(s)?.name === 'College of Lore' && s.level >= 6)) &&
          sp.level <= d.slots.length
        )
          options.push(['secret', 'Secreto mágico']);
        if (
          C.id(s) === 'warlock' &&
          sp.level >= 6 &&
          sp.level <= 9 &&
          s.level >= 11 + (sp.level - 6) * 2 &&
          C.member(sp, s)
        )
          options.push(['arcanum', 'Arcanum nivel ' + sp.level]);
        options.push(['extra', 'Extra del DM']);
        const current = statusOf(sp.id, g),
          automatic = g.details[sp.id];
        if (automatic)
          options = [
            [current, automatic.mode === 'prepared' ? 'Siempre preparado · subclase' : 'Concedido por subclase'],
          ];
        if (!options.some(x => x[0] === current)) options.push([current, 'Selección previa']);
        return `<div class="party-spell-row"><div><b>${esc(sp.name)}</b><p class="small">${sp.level ? 'Nivel ' + sp.level : 'Truco'} · ${esc(sp.sourceKey || sp.source)} · ${esc(sp.time)}</p>${automaticSpellNote(s, sp.id, g)}<details><summary>Cómo funciona</summary><p class="spell-reference small">${esc(sp.text)}</p><p class="small">${esc(sp.materialEs || '')} · ${esc(sp.duration)}</p><p class="small">${sp.english ? esc(sp.english) + ' · ' : ''}Resumen de mesa; revisá excepciones en su fuente.</p></details></div><div><select class="control" data-spell-choice="${esc(sp.id)}" aria-label="Estado de ${esc(sp.name)}" ${automatic ? 'disabled' : ''}>${options.map(([v, n]) => `<option value="${v}" ${current === v ? 'selected' : ''}>${n}</option>`).join('')}</select>${automatic ? '<p class="small">Lo concede la subclase elegida; no se selecciona ni se quita al preparar.</p>' : ''}${automatic && s.extras.includes(sp.id) ? '<p class="small">También tenés un registro Extra del DM para este conjuro. Se conserva su modo de lanzamiento.</p>' : ''}${s.extras.includes(sp.id) ? `<label class="field small">Lanzamiento<select data-spell-mode="${esc(sp.id)}"><option value="slot">Usa espacios normales</option><option value="free" ${s.spellModes?.[sp.id] === 'free' ? 'selected' : ''}>Sin espacio · autorizado por DM</option></select></label>` : ''}</div></div>`;
      })
      .join('')}</div>${list.length > spellLimit ? button('Mostrar más', 'party-spells-more') : ''}`;
    modal('Agregar y preparar conjuros', body, () => {
      validateRepertoire(spellDraft);
      commit('Repertorio actualizado', next => {
        for (const k of ['known', 'extras', 'prepared', 'secretKnown', 'spellModes', 'arcanum'])
          next[k] = clone(spellDraft[k] || (['spellModes', 'arcanum'].includes(k) ? {} : []));
        if (next.concentration && !C.usable(next).includes(next.concentration)) next.concentration = null;
      });
    });
    document.getElementById('modal').classList.add('learning-modal');
  }
  function validateRepertoire(s) {
    const d = R.stats(s),
      mode = C.casting(s).type,
      g = C.granted(s),
      counts = C.spellCounts(s),
      known = s.known.map(spellById).filter(Boolean),
      can = counts.cantrips,
      count = counts.known;
    if (can > d.cantrips) throw Error('Superás tus trucos de clase. Usá Extra del DM para concesiones adicionales.');
    if (mode === 'known' && count > d.known) throw Error('Superás los conjuros conocidos de la clase.');
    if (counts.prepared > d.prepared) throw Error('Superás tus conjuros preparados.');
    const maxSecrets =
      2 * [10, 14, 18].filter(n => s.level >= n).length +
      (C.sub(s)?.name === 'College of Lore' && s.level >= 6 ? 2 : 0);
    if (s.secretKnown.length > maxSecrets) throw Error('Superás tus Secretos mágicos.');
    for (const sp of known) {
      if (g.details[sp.id]) continue;
      if (
        !state.known.includes(sp.id) &&
        !s.secretKnown.includes(sp.id) &&
        !(C.member(sp, s) || C.granted(s).expanded.includes(sp.id))
      )
        throw Error('Para conjuros de otra clase usá Extra del DM.');
      if (!state.known.includes(sp.id) && !Campaign.enabled(s, sp))
        throw Error('Ese libro no está habilitado. Usá Extra del DM.');
      if (sp.level > d.slots.length) throw Error('Ese nivel de conjuro requiere Extra del DM.');
    }
    R.validate(s);
  }
  function resourceCards() {
    return C.resources(state)
      .map(r => {
        const used = C.spent(state, r);
        return `<div class="pool-row"><div class="pool-head"><b>${esc(r.name)}</b><span>${used === null ? '—' : r.max === 999 ? '∞' : Math.max(0, r.max - used) + ' / ' + r.max}</span></div><p class="small">${esc(r.text)}</p><div class="actions">${button('Usar', 'class-resource', '', `data-id="${r.id}"`)}${button('Ajustar', 'class-resource-edit', 'secondary', `data-id="${r.id}"`)}</div><p class="small">Recuperación: descanso ${r.reset === 'short' ? 'corto o largo' : 'largo'}.</p>${r.id === 'rage' && state.raging ? button('Terminar rabia', 'class-rage-end') : ''}</div>`;
      })
      .join('');
  }
  function useResource(id, adjust = false) {
    const r = C.resources(state).find(x => x.id === id);
    if (!r) throw Error('Recurso no disponible.');
    const avail = r.max - (C.spent(state, r) || 0);
    if (adjust)
      return modal(
        'Ajustar ' + r.name,
        field(
          'Cantidad disponible',
          'available',
          C.spent(state, r) === null ? '' : avail,
          'number',
          `min="0" max="${r.max}" required`,
        ),
        fd =>
          commit('Recurso ajustado: ' + r.name, s => {
            s.classSpent = s.classSpent || {};
            s.classSpent[id] = r.max - number(fd, 'available', 0, r.max);
          }),
      );
    if (C.spent(state, r) === null) throw Error('Confirmá primero cuántos usos te quedan.');
    if (avail <= 0) throw Error('No quedan usos.');
    modal(
      r.name,
      `<p>${esc(r.text)}</p>${field('Cantidad a gastar', 'cost', 1, 'number', `min="1" max="${avail}" required`)}${select(
        'Qué consume en este uso',
        'action',
        [
          ['manual', 'Solo recurso / resolver desencadenante en mesa'],
          ['action', 'Acción'],
          ['bonus', 'Acción adicional'],
          ['reaction', 'Reacción'],
          ['free', 'Sin acción'],
        ],
        r.action,
      )}${id === 'second-wind' ? field('Resultado de tu d10 (se suma tu nivel)', 'roll', '', 'number', 'min="1" max="10" required') : ''}<label class="check"><input type="checkbox" required>Se cumple el desencadenante y el coste del rasgo elegido.</label>`,
      fd =>
        commit('Usado: ' + r.name, s => {
          const k = fd.get('action'),
            cost = number(fd, 'cost', 1, avail);
          if (['action', 'bonus', 'reaction'].includes(k)) Combat.use(s, k, r.name);
          if (id === 'action-surge') {
            const t = Combat.data(s);
            if (!t.active || !t.onTurn) throw Error('Usá Acción súbita durante tu turno con seguimiento activo.');
            if (cost !== 1) throw Error('Acción súbita gasta un solo uso.');
            if (!t.action)
              throw Error('Registrá tu primera acción antes de usar Acción súbita; así queda disponible la segunda.');
            if (t.surgeUsed) throw Error('Acción súbita solo puede usarse una vez por turno.');
            t.surgeUsed = true;
            t.action = null;
          }
          C.spend(s, id, cost);
          if (id === 'rage') {
            s.raging = true;
            s.concentration = null;
            Combat.data(s).checks = [];
          }
          if (id === 'second-wind') {
            if (s.hp === null) throw Error('Confirmá tus PG actuales.');
            s.hp = Math.min(R.stats(s).maxHP, s.hp + number(fd, 'roll', 1, 10) + s.level);
          }
        }),
      'Registrar uso',
    );
  }
  function shortRest() {
    const d = R.stats(state),
      dice = d.hitDiceSet,
      die = dice[0].die;
    if (state.hdSpent === null || state.hp === null)
      throw Error('Confirmá tus PG y Dados de Golpe antes de descansar.');
    const max = R.totalLevel(state) - state.hdSpent;
    modal(
      'Descanso corto completado',
      `<p>Podés gastar hasta ${max} Dados de Golpe (${dice.map(x => x.count + 'd' + x.die).join(' + ')} en total). Tirás cada dado, sumás CON ${sign(d.mods.con)} y recuperás ese resultado (mínimo 0 por dado). Podés decidir gastar otro después de cada tirada.</p>${
        dice.length > 1
          ? select(
              'Tipo de dado',
              'die',
              dice.map(x => [x.die, 'd' + x.die]),
            ) + '<p class="small">Para gastar dados de distinto tipo, hacé un descanso por cada tipo.</p>'
          : ''
      }${field('Cantidad de Dados de Golpe a gastar', 'count', 0, 'number', `min="0" max="${max}" required`)}${field('Resultados de los dados (separados por comas)', 'rolls', '', 'text', 'placeholder="Ejemplo: 3, 7"')}${button('Tirar la cantidad elegida', 'party-short-roll')}${field('Canción de descanso recibida (0 si no aplica)', 'song', 0, 'number', 'min="0" max="12" required')}<p class="small">Sumá Canción una sola vez si gastaste dados y escuchaste al bardo. El descanso también recupera tus recursos marcados «corto», y espacios de pacto si sos brujo. Mago: Recuperación arcana se usa aparte.</p><label class="check"><input type="checkbox" required>Completé al menos una hora de descanso y los requisitos de recuperación de mis rasgos.</label>`,
      fd => {
        const n = number(fd, 'count', 0, max),
          rolls = String(fd.get('rolls'))
            .trim()
            .split(/[,;\s]+/)
            .filter(Boolean)
            .map(Number),
          song = number(fd, 'song', 0, n ? 12 : 0);
        const used = Number(fd.get('die')) || die;
        if (rolls.length !== n || rolls.some(x => !Number.isInteger(x) || x < 1 || x > used))
          throw Error('Ingresá un resultado válido por cada d' + used + ' gastado.');
        const heal = rolls.reduce((a, n) => a + Math.max(0, n + d.mods.con), 0) + song;
        commit('Descanso corto · ' + n + ' Dados de Golpe · +' + heal + ' PG', s => {
          s.hdSpent += n;
          s.hp = Math.min(d.maxHP, s.hp + heal);
          C.reset(s, 'short');
          s.extraResources.forEach(r => {
            if (r.reset === 'short') r.spent = 0;
          });
          if (s.hp > 0) {
            s.death = { success: 0, failure: 0 };
            s.conditions = s.conditions.filter(x => x !== 'Inconsciente');
          }
          Combat.finish(s);
          s.combatState.effects = [];
        });
      },
    );
  }
  function statsEdit() {
    const d = R.stats(state);
    modal(
      'Características, armadura y velocidad',
      `<div class="form-grid">${Object.entries(R.attrs)
        .map(([k, v]) => field(v, k, state.abilities[k], 'number', 'min="1" max="30" required'))
        .join('')}${
        state.equipmentDefense
          ? ''
          : select(
              'Cálculo de CA',
              'armorMode',
              [
                ['normal', 'Base + DES'],
                ['medium', 'Base + DES (máximo +2)'],
                ['fixed', 'CA fija, sin DES'],
                ['barbarian', 'Sin armadura: 10 + DES + CON'],
                ['monk', 'Sin armadura: 10 + DES + SAB'],
              ],
              state.armorMode || 'normal',
            )
      }${state.equipmentDefense ? '' : field('Base de CA', 'base', state.acBase, 'number', 'min="0" max="40" required')}${state.equipmentDefense ? '' : field('Bonos (escudo, magia, estilo…)', 'bonus', state.acBonus, 'number', 'min="-20" max="30" required')}${select('Característica para conjuros', 'castingAbility', [['', 'La de mi clase'], ...Object.entries(R.attrs)], state.castingAbility || '')}${field('Velocidad en pies', 'speed', state.speed ?? 30, 'number', 'min="0" max="500" required')}</div><p class="small">${state.equipmentDefense ? 'La CA se recalcula con tu equipo y tus modificadores. Cambiá la armadura desde Equipar / calcular CA.' : 'Elegí una fórmula que permita tu equipo y tus rasgos.'} CON ajusta los PG máximos retroactivamente.</p>`,
      fd =>
        commit('Características y armadura actualizadas', s => {
          for (const k in R.attrs) s.abilities[k] = number(fd, k, 1, 30);
          s.castingAbility = fd.get('castingAbility');
          if (!s.equipmentDefense) {
            s.armorMode = fd.get('armorMode');
            s.armorDexCap = s.armorMode === 'medium' ? 2 : 30;
            s.acBase = number(fd, 'base', 0, 40);
            s.acBonus = number(fd, 'bonus', -20, 30);
          }
          s.speed = number(fd, 'speed', 0, 500);
          if (s.hp !== null) s.hp = Math.min(s.hp, R.stats(s).maxHP);
          if (s.inspirationSpent !== null) s.inspirationSpent = Math.min(s.inspirationSpent, R.stats(s).inspirationMax);
          s.infectiousSpent = Math.min(s.infectiousSpent, R.stats(s).inspirationMax);
        }),
    );
  }
  function genericAttack() {
    const d = R.stats(state),
      c = C.id(state),
      sc = C.sub(state)?.name;
    const count =
      c === 'fighter'
        ? state.level >= 20
          ? 4
          : state.level >= 11
            ? 3
            : state.level >= 5
              ? 2
              : 1
        : (['barbarian', 'monk', 'paladin', 'ranger'].includes(c) && state.level >= 5) ||
            (c === 'bard' && ['College of Swords', 'College of Valor'].includes(sc) && state.level >= 6) ||
            (c === 'artificer' && ['Battle Smith', 'Armorer'].includes(sc) && state.level >= 5)
          ? 2
          : 1;
    modal(
      'Acción de Atacar',
      `<p>Tu clase y subclase permiten <b>${count} ataque(s)</b> con esta acción. Resolvé cada impacto y daño en mesa. Otras excepciones de rasgos, dotes y objetos se aplican según su texto.</p><p>Bonos de referencia con competencia: FUE ${sign(d.mods.str + d.prof)} · DES ${sign(d.mods.dex + d.prof)}. Sin competencia, no sumes ${d.prof}. Las armas con sutileza permiten elegir FUE o DES; otras usan su característica correspondiente.</p>${field('Arma o ataque utilizado', 'weapon', '', 'text', 'required maxlength="150"')}<p class="small">Registrá el dado de daño y propiedades en Equipo. Este botón registra la acción completa, no un ataque individual.</p>`,
      fd => commit('Atacar: ' + fd.get('weapon'), s => Combat.use(s, 'action', 'Atacar: ' + fd.get('weapon'))),
      'Registrar acción de Atacar',
    );
  }
  function resourcesEdit() {
    const d = R.stats(state),
      bard = C.id(state) === 'bard',
      res = C.resources(state);
    modal(
      'Recursos actuales',
      `<div class="form-grid">${field('PG máximos', 'max', d.maxHP, 'number', 'min="1" max="2000" required')}${field('PG actuales', 'hp', state.hp ?? '', 'number', 'min="0" max="2000" required')}${field('PG temporales', 'temp', state.temp, 'number', 'min="0" max="9999" required')}${field('Dados de Golpe disponibles · d' + C.info(state).die, 'hd', state.hdSpent === null ? '' : state.level - state.hdSpent, 'number', `min="0" max="${state.level}" required`)}${bard ? field('Inspiraciones disponibles', 'inspiration', state.inspirationSpent === null ? '' : d.inspirationMax - state.inspirationSpent, 'number', `min="0" max="${d.inspirationMax}" required`) : ''}${d.slots.map((max, i) => (max ? field('Espacios disponibles de nivel ' + (i + 1), 'slot' + i, state.slotsSpent[i] === null ? '' : max - state.slotsSpent[i], 'number', `min="0" max="${max}" required`) : '')).join('')}${res.map(r => field(r.name + ' disponibles', 'res-' + r.id, C.spent(state, r) === null ? '' : r.max - C.spent(state, r), 'number', `min="0" max="${r.max}" required`)).join('')}</div><p class="small">Ingresá lo que te queda ahora. Esto no aplica un descanso.</p>`,
      fd =>
        commit('Recursos actuales confirmados', s => {
          const max = number(fd, 'max', 1, 2000);
          s.hpBase = max - R.totalLevel(s) * d.mods.con;
          s.hp = number(fd, 'hp', 0, max);
          s.hpConfirmed = true;
          s.temp = number(fd, 'temp', 0, 9999);
          s.hdSpent = R.totalLevel(s) - number(fd, 'hd', 0, R.totalLevel(s));
          if (bard) s.inspirationSpent = d.inspirationMax - number(fd, 'inspiration', 0, d.inspirationMax);
          s.slotsSpent = d.slots.map((max, i) => (max ? max - number(fd, 'slot' + i, 0, max) : 0));
          while (s.slotsSpent.length < 9) s.slotsSpent.push(0);
          s.classSpent = s.classSpent || {};
          for (const r of res) s.classSpent[r.id] = r.max - number(fd, 'res-' + r.id, 0, r.max);
          s.classResourcesConfirmed = true;
        }),
    );
  }
  function featureOptions() {
    const c = C.id(state),
      l = state.level,
      list = [];
    const add = (id, name, kind, text, resource = null, cost = 0) =>
      list.push({ id, name, kind, text, resource, cost });
    if (c === 'rogue' && l >= 2) {
      add('cunning-dash', 'Acción astuta: Correr', 'bonus', 'Ganás movimiento adicional igual a tu velocidad actual.');
      add(
        'cunning-disengage',
        'Acción astuta: Destrabarse',
        'bonus',
        'Tu movimiento no provoca ataques de oportunidad durante el resto del turno.',
      );
      add(
        'cunning-hide',
        'Acción astuta: Esconderse',
        'bonus',
        'Hacé una prueba de Sigilo si las circunstancias permiten ocultarte.',
      );
    }
    if (c === 'rogue' && l >= 5)
      add(
        'uncanny-dodge',
        'Esquiva asombrosa',
        'reaction',
        'Cuando un atacante que puedas ver te impacta con un ataque, reducís a la mitad el daño de ese ataque. Ingresá el daño ya reducido en tus PG.',
      );
    if (c === 'monk') {
      add(
        'martial-arts',
        'Artes marciales',
        'bonus',
        'Tras usar la acción de Atacar con un golpe sin armas o un arma de monje, podés hacer un golpe sin armas como acción adicional. Requiere cumplir las restricciones de armadura y armas del rasgo.',
      );
      if (l >= 2) {
        add(
          'flurry',
          'Ráfaga de golpes',
          'bonus',
          'Inmediatamente después de la acción de Atacar, gastá 1 ki y hacé dos golpes sin armas.',
          'ki',
          1,
        );
        add('patient', 'Defensa paciente', 'bonus', 'Gastá 1 ki para Esquivar como acción adicional.', 'ki', 1);
        add(
          'step-wind',
          'Paso del viento',
          'bonus',
          'Gastá 1 ki para Destrabarse o Correr como acción adicional; tu distancia de salto se duplica este turno.',
          'ki',
          1,
        );
      }
      if (l >= 3)
        add(
          'deflect',
          'Desviar proyectiles',
          'reaction',
          'Cuando te impacta un ataque con arma a distancia, reducís el daño en 1d10 + DES + nivel de monje. Atrapar y devolver el proyectil tiene requisitos adicionales; devolverlo gasta 1 ki, que podés registrar en tu reserva.',
        );
    }
    if (c === 'paladin' && l >= 2)
      add(
        'smite',
        'Castigo divino',
        'free',
        'Cuando impactás con un ataque de arma cuerpo a cuerpo, gastá un espacio para daño radiante adicional: 2d8 con nivel 1, +1d8 por nivel superior (máximo 5d8), y +1d8 contra infernales o muertos vivientes. No es lanzar un conjuro.',
      );
    if (c === 'cleric' && l >= 2)
      add(
        'turn-undead',
        'Expulsar muertos vivientes',
        'action',
        'Presentás tu símbolo sagrado. Cada muerto viviente que pueda verte u oírte a 30 pies hace SAB contra tu CD. Consultá duración, restricciones y Destruir muertos vivientes según tu nivel.',
        'channel',
        1,
      );
    return list;
  }
  function combatAbilities(kind) {
    const res = C.resources(state).filter(r => r.action === kind || (kind === 'action' && r.id === 'action-surge'));
    const feats = featureOptions().filter(f => f.kind === kind || (kind === 'action' && f.kind === 'free'));
    return (
      res
        .map(
          r =>
            `<article class="battle-choice"><h3>${esc(r.name)}</h3><p>${esc(r.text)}</p>${button('Usar rasgo', 'class-resource', 'secondary', `data-id="${r.id}"`)}</article>`,
        )
        .join('') +
      feats
        .map(
          f =>
            `<article class="battle-choice"><h3>${f.name}</h3><p>${f.text}</p>${button('Elegir', 'party-feature', 'secondary', `data-id="${f.id}"`)}</article>`,
        )
        .join('')
    );
  }
  function useFeature(id) {
    const f = featureOptions().find(x => x.id === id);
    if (!f) throw Error('Rasgo no disponible.');
    let body = `<p>${f.text}</p>`;
    if (id === 'smite') {
      const d = R.stats(state),
        slots = d.slots
          .map((max, i) => [i + 1, 'Nivel ' + (i + 1)])
          .filter(([l]) => state.slotsSpent[l - 1] !== null && state.slotsSpent[l - 1] < d.slots[l - 1]);
      if (!slots.length) throw Error('No quedan espacios.');
      body += select('Espacio a gastar', 'slot', slots, slots[0][0]);
    }
    body += '<label class="check"><input type="checkbox" required>Se cumplen las condiciones del rasgo.</label>';
    modal(
      f.name,
      body,
      fd =>
        commit('Usado: ' + f.name, s => {
          if (f.kind !== 'free') Combat.use(s, f.kind, f.name);
          if (f.resource) C.spend(s, f.resource, f.cost);
          if (id === 'smite') {
            const lv = number(fd, 'slot', 1, 9);
            if (s.slotsSpent[lv - 1] === null || s.slotsSpent[lv - 1] >= R.stats(s).slots[lv - 1])
              throw Error('No queda ese espacio.');
            s.slotsSpent[lv - 1]++;
          }
        }),
      'Registrar uso',
    );
  }
  function install() {
    Object.assign(actions, {
      'portrait-edit': () => Portrait.edit(),
      resources: resourcesEdit,
      'party-feature': e => useFeature(e.dataset.id),
      party: list,
      'party-create': startCreate,
      'party-open': e => CharacterStorage.activate(e.dataset.id),
      'party-delete': e =>
        confirmAction(
          'Eliminar personaje',
          'Se borrará esa ficha de este dispositivo. Conservá su exportación si querés recuperarla.',
          () => {
            CharacterStorage.remove(e.dataset.id);
            list();
          },
          'Eliminar',
        ),
      'party-array': () => {
        collectCreate();
        const c = D.classes[createDraft.classId],
          priority = [
            c.ability || (['fighter', 'barbarian', 'paladin'].includes(c.id) ? 'str' : 'dex'),
            'con',
            'dex',
            'wis',
            'str',
            'int',
            'cha',
          ],
          keys = [...new Set(priority)];
        keys.slice(0, 6).forEach((k, i) => (createDraft.abilities[k] = [15, 14, 13, 12, 10, 8][i]));
        drawCreate();
      },
      'party-create-back': () => {
        collectCreate();
        createStep = Math.max(0, createStep - 1);
        drawCreate();
      },
      'party-import': () => {
        const el = document.createElement('input');
        el.type = 'file';
        el.accept = '.json,application/json';
        el.onchange = async () => {
          try {
            const file = el.files[0];
            if (!file) return;
            if (file.size > 2 * 1024 * 1024) throw Error('La ficha supera 2 MB.');
            const s = R.validate(JSON.parse(await file.text()));
            const id = CharacterStorage.add(s);
            CharacterStorage.activate(id);
          } catch (e) {
            toast('No se importó: ' + e.message);
          }
        };
        el.click();
      },
      'class-open': () => (location.hash = 'class'),
      'class-config': classConfig,
      'class-choices': () => chooseClass(),
      'resolve-choices': resolveChoices,
      'resolve-task': e => resolveTask(e.dataset.id),
      'class-resource': e => useResource(e.dataset.id),
      'class-resource-edit': e => useResource(e.dataset.id, true),
      'class-rage-end': () => commit('Rabia terminada', s => (s.raging = false)),
      'class-notes-save': () => {
        const txt = document.getElementById('class-notes').value;
        commit('Notas de clase guardadas', s => (s.classNotes = txt));
      },
      'party-spells-more': () => {
        spellLimit += 35;
        drawSpells();
      },
      stats: statsEdit,
      'short-rest': shortRest,
      'party-attack': genericAttack,
      'party-short-roll': () => {
        const form = document.getElementById('dialog-form'),
          n = Number(form.elements.namedItem('count').value);
        if (!Number.isInteger(n) || n < 0 || n > R.totalLevel(state) - state.hdSpent)
          throw Error('Cantidad de dados inválida.');
        const die = Number(form.elements.namedItem('die')?.value) || C.info(state).die;
        form.elements.namedItem('rolls').value = roll(die, n).join(', ');
      },
      'party-identity': () =>
        modal(
          'Identidad del personaje',
          `${field('Nombre', 'name', state.name, 'text', 'required maxlength="100"')}${field('Raza o linaje', 'race', state.race || '', 'text', 'maxlength="150"')}${field('Trasfondo', 'background', state.background || '', 'text', 'maxlength="200"')}${field('Idiomas', 'languages', state.languages || '', 'text', 'maxlength="500"')}`,
          fd =>
            commit('Identidad actualizada', s => {
              for (const k of ['name', 'race', 'background', 'languages']) s[k] = String(fd.get(k)).trim();
            }),
        ),
      reset: () => {
        throw Error('Para empezar otra ficha usá Personajes → Crear personaje. Tu ficha actual se conserva.');
      },
    });
    document.addEventListener('input', e => {
      if (e.target.id === 'party-spell-search') {
        spellQuery = e.target.value;
        const pos = e.target.selectionStart;
        drawSpells();
        const input = document.getElementById('party-spell-search');
        input.focus();
        input.setSelectionRange(pos, pos);
      }
    });
    document.addEventListener('change', e => {
      if (e.target.id === 'party-spell-scope') {
        spellScope = e.target.value;
        drawSpells();
      }
      if (e.target.id === 'party-spell-level') {
        spellLevel = e.target.value;
        drawSpells();
      }
      if (e.target.dataset.spellChoice) {
        spellChoice(e.target.dataset.spellChoice, e.target.value);
        const body = document.querySelector('#modal .modal-body'),
          top = body.scrollTop;
        drawSpells();
        document.querySelector('#modal .modal-body').scrollTop = top;
      }
      if (e.target.dataset.spellMode) {
        spellDraft.spellModes = spellDraft.spellModes || {};
        spellDraft.spellModes[e.target.dataset.spellMode] = e.target.value;
      }
    });
  }
  return {
    decorate,
    welcome,
    list,
    startCreate,
    makeCharacter,
    classPage,
    classConfig,
    chooseClass,
    levelup,
    character,
    spells,
    manageSpells,
    validateRepertoire,
    automaticSpellNote,
    resourceCards,
    combatAbilities,
    shortRest,
    install,
  };
})();
