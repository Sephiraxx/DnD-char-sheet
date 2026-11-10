const PartyUI = (() => {
  'use strict';
  const C = Classes,
    D = ClassData;
  let spellDraft = null,
    spellQuery = '',
    spellScope = 'class',
    spellLevel = 'all';
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
      `<p>Cada ficha tiene su propio progreso, recursos y equipo. Tus compañeros pueden abrir esta página y crear sus personajes en sus dispositivos.</p><p class="small">${storageHelp()}</p><div class="party-list">${items
        .map(x => {
          let label = x.name;
          try {
            label = JSON.parse(localStorage.getItem(x.key) || 'null')?.name || label;
          } catch {}
          return `<div class="list-row"><div class="party-person">${Portrait.savedThumb(x.key, label)}<div><b>${esc(label)}</b>${copyTag(x.key)}</div></div><div class="actions">${x.key === KEY ? '<span class="tag">Abierto</span>' : button('Abrir', 'party-open', '', `data-id="${esc(x.id)}"`) + button('Eliminar', 'party-delete', 'danger', `data-id="${esc(x.id)}"`)}</div></div>`;
        })
        .join(
          '',
        )}</div><div class="actions section-space">${button('Crear personaje', 'party-create', '')}${button('Importar como personaje nuevo', 'party-import')}${state ? button('Exportar personaje actual', 'backup') : ''}${accountReady() ? button('Tu cuenta', 'account') : ''}</div>`,
    );
  }
  // ---------- Dónde vive cada ficha ----------
  const accountReady = () => typeof AccountUI !== 'undefined' && typeof Cloud !== 'undefined' && Cloud.enabled;
  const copyTag = key => (typeof AccountUI !== 'undefined' ? AccountUI.copyTag(key) : '');
  // La misma explicación en Personajes, Mi ficha y la portada.
  const storageHelp = () =>
    accountReady()
      ? 'Cada ficha se guarda en este dispositivo. Con una cuenta (email y contraseña), cada cambio se copia solo y la abrís en cualquier dispositivo, esté o no en una mesa. Sin cuenta, exportá la ficha y importala en el otro dispositivo.'
      : 'Cada ficha se guarda en este dispositivo. Para pasarla a otro, exportala e importala allá.';
  // «Tu cuenta» fuera de Mesa: en la portada lleva a la tarjeta de abajo; con una ficha abierta, abre un diálogo.
  function account() {
    const here = document.getElementById('account-restore');
    if (here) {
      const open = document.getElementById('modal');
      if (open?.open) open.close();
      const login = here.querySelector('form[data-account="login"]');
      login?.closest('details')?.setAttribute('open', '');
      here.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const target = (login || here).querySelector('input') || here.querySelector('h2');
      if (target?.tagName === 'H2') target.tabIndex = -1;
      target?.focus({ preventScroll: true });
      return;
    }
    // Sin el formulario del diálogo: las tarjetas de cuenta traen sus propios formularios.
    const d = document.getElementById('modal');
    d.classList.remove('learning-modal');
    if (d.open) d.close();
    document.getElementById('modal-content').innerHTML =
      `<div class="modal-head"><h2 id="dialog-title">Tu cuenta</h2><button type="button" class="icon-btn" data-close aria-label="Cerrar">×</button></div><div class="modal-body"><p class="small">${esc(storageHelp())}</p>${AccountUI.card('account')}</div>`;
    d.showModal();
  }
  // El índice guarda el nombre de cuando se creó la ficha; el actual está en la ficha misma.
  function savedName(x) {
    try {
      return JSON.parse(localStorage.getItem(x.key) || 'null')?.name || x.name;
    } catch {
      return x.name;
    }
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
    // Portada: tres caminos (crear ficha, unirse a una mesa, dirigir) y las fichas guardadas.
    document.getElementById('main').innerHTML =
      `<section class="welcome-hero"><p class="eyebrow">D&D 5E · REGLAS 2014 · PARA JUGAR EN LA MESA</p><h1>Tu cuaderno de aventura.</h1><p>Fichas completas, tiradas con dados digitales o físicos, y una mesa compartida para que el DM y la party jueguen en vivo.</p>${accountReady() ? `<p class="welcome-account"><button type="button" class="text-btn" data-action="account">¿Ya tenés una cuenta? Entrá</button></p>` : ''}</section>
      <div class="paths">
        <section class="card path-card"><span class="path-icon" aria-hidden="true">✦</span><h2>Creá tu personaje</h2><p>Clase, raza, trasfondo, conjuros y equipo, paso a paso. Se guarda en este dispositivo${accountReady() ? ' y, con una cuenta, en la nube' : ''}.</p><div class="actions">${button('Crear personaje', 'party-create', '')}${button('Importar ficha', 'party-import')}</div></section>
        <div id="path-join" class="path-slot"></div>
        <section class="card path-card"><span class="path-icon" aria-hidden="true">⚑</span><h2>Dirigí la partida</h2><p>Creá una mesa, compartí el código y seguí a la party: PG, iniciativa, monstruos, botín y pedidos de tirada.</p><div class="actions"><a class="button secondary" href="./dm.html">Soy el DM</a></div></section>
      </div>
      ${items.length ? `<section class="card section-space"><h2>Tus fichas</h2><div class="party-list saved-list">${items.map(x => `<div class="list-row"><div class="party-person">${Portrait.savedThumb(x.key, savedName(x))}<div><b>${esc(savedName(x))}</b>${copyTag(x.key)}</div></div>${button('Abrir', 'party-open', 'secondary', `data-id="${esc(x.id)}"`)}</div>`).join('')}</div></section>` : ''}
      ${storageIssue ? `<div class="banner"><p>${esc(storageIssue)}</p>${rawBroken ? button('Descargar datos guardados', 'raw-backup') : ''}</div>` : ''}`;
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
    // Los PG de rasgos (Dureza enana, Resistencia dracónica) se suman solos; los PG sugeridos no los incluyen.
    s.hpAuto = true;
    s.originAuto = true;
    if (d.full) s.hp = R.stats(s).maxHP;
    return R.validate(s);
  }
  // Mecánicas homebrew de la clase y la subclase que llegan en ese nivel (daño sin armas, conjuros, espacios).
  function homebrewMechanics(l) {
    const out = [];
    for (const data of [C.info(state)?.homebrew?.data, C.sub(state)?.homebrew?.data]) {
      if (!data) continue;
      for (const r of data.unarmed || []) if (r.level === l) out.push('golpe sin armas ' + r.dice);
      for (const r of data.prepared || [])
        if (r.level === l)
          out.push((Catalog.spells.find(sp => sp.id === r.spell)?.name || r.spell) + ' siempre preparado');
      for (const r of data.slots || []) if (r.level === l) out.push(`+${r.count} espacio(s) de nivel ${r.slot}`);
    }
    return out.join(' · ');
  }
  // Dotes junto a las demás elecciones: nombre, qué hacen y lo que aplica la ficha.
  function featChoices() {
    const ids = [
      ...new Set(typeof Grants !== 'undefined' ? Grants.feats(state) : state.progression?.learnedFeats || []),
    ];
    if (!ids.length || typeof GrantUI === 'undefined' || typeof FeatFX === 'undefined') return '';
    return `<div class="feature"><h3>Dotes</h3>${ids
      .map(id => {
        const d = FeatFX.describe(id, state);
        const short = d.brief ? (d.brief.length > 90 ? d.brief.slice(0, 89) + '…' : d.brief) : 'Qué hace';
        return `<details class="feat-choice"><summary><b>${esc(d.name)}</b><span class="small muted"> · ${esc(short)}</span></summary>${GrantUI.featInfo(state, id)}</details>`;
      })
      .join('')}</div>`;
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
      (state.xp
        ? `<p class="xp-line"><b>Experiencia:</b> ${state.xp} PX${R.xpNext(state) ? (state.xp >= R.xpNext(state) ? ' · <b>te alcanza para subir de nivel</b>' : ' · siguiente nivel con ' + R.xpNext(state) + ' PX') : ''}</p>`
        : '') +
      `<div class="banner"><div><b>${tasks.length ? 'Elecciones pendientes' : 'Revisá tus rasgos y opciones'}</b>${tasks.length ? pendingList() : '<p class="small">Las elecciones de rasgos, equipo y efectos especiales se registran con las reglas de la mesa.</p>'}</div><div class="actions">${button('Conjuros', 'spell-manage')}${button('Elecciones de clase', 'class-choices')}${button('Subclase y Pericias', 'class-config')}</div></div>${typeof SheetStatus !== 'undefined' ? SheetStatus.card() : ''}${oathCard()}<div class="grid two section-space"><section class="card"><h2>Progresión 1–20</h2><div class="class-timeline">${Array.from(
        { length: 20 },
        (_, i) => i + 1,
      )
        .map(l => {
          const fs = C.features({ ...state, level: l }, l).filter(f => f.level === l);
          const hbm = homebrewMechanics(l);
          return `<details ${l === state.level ? 'open' : ''}><summary>Nivel ${l}${l === state.level ? ' · Actual' : ''}${C.asiLevels(state).includes(l) ? ' · Mejora o dote' : ''}</summary>${hbm ? `<p class="small"><b>Se aplica solo:</b> ${esc(hbm)}</p>` : ''}${fs.map(f => `<div class="feature"><h3>${esc(f.name)}</h3><p class="small">${libraryLink(f.name)}</p><p class="small">${esc(f.source)}${f.children?.length ? ' · ' + f.children.map(esc).join(' · ') : ''}</p>${f.es ? `<p class="small">${esc(f.es)}</p>` : ''}${f.book ? LibraryText.html(f.book, !f.es && l === state.level) : ''}${f.text && f.source === 'HB' ? `<p class="small">${esc(f.text)}</p>` : f.text ? `<details><summary>Texto SRD (inglés)</summary><p class="spell-reference">${esc(f.text)}</p></details>` : f.book ? '' : `<a href="${classLink(state)}" target="_blank" rel="noopener">Consultar el rasgo y sus elecciones</a>`}</div>`).join('') || '<p class="small">Consultá el aumento de recursos y las mejoras de los rasgos previos.</p>'}</details>`;
        })
        .join('')}</div></section><div class="stack"><section class="card"><h2>Elecciones registradas</h2>${
        Object.entries(state.classChoices || {})
          .map(
            ([name, ids]) =>
              `<div class="feature"><h3>${esc(NamesEs.choice(name))}</h3><p>${ids.map(x => esc(D.options.find(o => o.id === x)?.name || x)).join(', ')}</p>${
                typeof LibraryText !== 'undefined'
                  ? ids
                      .map(x => {
                        const o = D.options.find(o => o.id === x);
                        return TraitsEs.option(o) || LibraryText.option(x)
                          ? `<p class="small"><b>${esc(o?.name || x)}</b>${TraitsEs.option(o) ? ': ' + esc(TraitsEs.option(o)) : ''}</p>${LibraryText.html(LibraryText.option(x))}`
                          : '';
                      })
                      .join('')
                  : ''
              }</div>`,
          )
          .join('') ||
        (featChoices()
          ? ''
          : '<p class="small">Estilos, infusiones, Metamagia, invocaciones, dotes y otras elecciones aparecerán acá.</p>')
      }${featChoices()}${button('Editar elecciones', 'class-choices')}${button('Dotes', 'feat-add')}</section><section class="card"><h2>Detalles de tus rasgos</h2><p class="small">Anotá decisiones internas del rasgo (enemigo predilecto, terreno, ancestro, formas, objetos infundidos…), requisitos y efectos que debas aplicar. Podés crear recursos o acciones de mesa para llevar sus usos.</p><label class="field">Notas de clase<textarea id="class-notes" data-autosave="classNotes">${esc(typeof noteValue === 'function' ? noteValue('classNotes') : state.classNotes || '')}</textarea></label><p class="small muted autosave-status" data-autosave-status="classNotes" aria-live="polite">${typeof noteStatus === 'function' ? noteStatus('classNotes') : ''}</p><div class="actions section-space">${button('Añadir rasgo', 'feature-new')}${button('Añadir recurso', 'resource-new')}</div><p class="small section-space"><a href="${classLink(state)}" target="_blank" rel="noopener">Referencia de ${c.name}</a>. Las opciones no incluidas se pueden registrar manualmente. Las reglas opcionales deben acordarse con el DM.</p></section></div></div>`
    );
  }
  // Paladín: romper el juramento (pasa a Rompejuramentos) y volver con Expiación.
  function oathCard() {
    const o = C.oath(state);
    if (!o) return '';
    const date = o.broken ? new Date(o.broken.date).toLocaleDateString('es-AR') : '';
    if (o.canAtone)
      return `<section class="card oath-card broken"><h2>Juramento roto</h2><p>Sos <b>${esc(o.current.name)}</b>. Antes: ${esc(o.before.name)}${date ? ' · roto el ' + esc(date) : ''}.</p>${o.broken.reason ? `<p class="small">Motivo: ${esc(o.broken.reason)}</p>` : ''}<p class="small">Si el DM acepta tu expiación, recuperás tu juramento anterior con sus conjuros y rasgos.</p><div class="actions">${button('Expiación', 'oath-atone')}</div></section>`;
    return `<section class="card oath-card"><h2>Tu juramento</h2><p><b>${esc(o.current.name)}</b></p><p class="small">Si rompés tu juramento a propósito y sin arrepentirte, el DM puede convertirte en Rompejuramentos. La ficha guarda tu juramento actual para poder volver con Expiación.</p><div class="actions">${button('Romper juramento', 'oath-break', 'danger')}</div></section>`;
  }
  function oathBreak() {
    const o = C.oath(state);
    if (!o?.canBreak) throw Error('Tu juramento ya está roto.');
    modal(
      'Romper juramento',
      `<p>Dejás de ser <b>${esc(o.current.name)}</b> y pasás a <b>Rompejuramentos</b>.</p><ul class="small"><li>Perdés los conjuros y rasgos de tu juramento; ganás los de Rompejuramentos según tu nivel (Reprensión infernal, Infligir heridas…).</li><li>Canalizar divinidad pasa a Controlar muertos vivientes o Aspecto aterrador; conservás los usos gastados.</li><li>Si te concentrás en un conjuro que ya no tenés, la concentración termina.</li><li>Tu juramento anterior queda guardado: con Expiación podés recuperarlo.</li></ul>${field('Qué pasó (opcional)', 'reason', '', 'text', 'maxlength="300" placeholder="Ejecutó al prisionero rendido"')}<label class="check"><input type="checkbox" name="dm" required>El DM confirmó que rompí mi juramento.</label>`,
      fd =>
        commit('Juramento roto: ' + o.current.name + ' → Rompejuramentos', s => {
          C.breakOath(s, String(fd.get('reason') || '').trim());
          if (s.concentration && !C.usable(s).includes(s.concentration)) s.concentration = null;
        }),
      'Romper juramento',
    );
  }
  function oathAtone() {
    const o = C.oath(state);
    if (!o?.canAtone) throw Error('No hay un juramento anterior para recuperar.');
    modal(
      'Expiación',
      `<p>Volvés a <b>${esc(o.before.name)}</b> con sus conjuros y rasgos. Rompejuramentos deja de aplicarse.</p><label class="check"><input type="checkbox" name="dm" required>El DM aceptó mi expiación.</label>`,
      () =>
        commit('Expiación: vuelve a ' + o.before.name, s => {
          C.atone(s);
          if (s.concentration && !C.usable(s).includes(s.concentration)) s.concentration = null;
        }),
      'Recuperar juramento',
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
    typeof LevelUp !== 'undefined' ? LevelUp.chooseOptions() : chooseClass(t.group);
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
      `${state.level >= c.subclassLevel ? select('Subclase', 'subclass', [['', 'Pendiente'], ...D.subclasses.filter(x => x.classId === C.id(state) && (Campaign.enabled(state, x) || x.id === state.classSubclass)).map(x => [x.id, x.name + ' · ' + x.source])], state.classSubclass || C.sub(state)?.id || '') : ''}<p class="small">Marcá tus competencias manuales o de clase. Las concesiones automáticas se completan en Rasgos y se suman sin marcarlas aquí. La Pericia requiere competencia previa. Revisá cuántas te concede tu clase.</p><div class="class-skills">${R.skills.map(([k, n]) => `<div><b>${n}</b><label><input type="checkbox" name="skill" value="${k}" ${state.proficiencies.includes(k) ? 'checked' : ''}> Competencia</label><label><input type="checkbox" name="expertise" value="${k}" ${state.expertise.includes(k) ? 'checked' : ''}> Pericia</label></div>`).join('')}</div><label class="check"><input type="checkbox" name="optional" ${state.optionalClassFeatures ? 'checked' : ''}>Mostrar rasgos opcionales de clase (Tasha y otras fuentes). Revisaré reemplazos y requisitos con el DM.</label>`,
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
      `<p class="small">Las opciones muestran fuente y requisitos. Elegí hasta el máximo de cada grupo. Los efectos sobre armas, armadura u otros recursos se aplican según el rasgo; registralos en la ficha. Se pueden dejar elecciones pendientes.</p>${groups.map(g => `<details open class="battle-rule"><summary>${esc(NamesEs.choice(g.name))} · ${g.count} elección(es)</summary><div class="option-picker">${g.options.map(o => `<label class="option-row"><input type="checkbox" name="choice:${esc(g.name)}" value="${esc(o.id)}" ${(state.classChoices?.[g.name] || []).includes(o.id) ? 'checked' : ''}><span><b>${esc(o.name)}</b><small>${esc(o.source)}${o.prerequisite.length ? ' · Requisitos: ' + esc(prerequisiteText(o.prerequisite)) : ''}</small>${TraitsEs.option(o) ? `<details><summary>Efecto</summary><p class="spell-reference">${esc(TraitsEs.option(o))}</p></details>` : ''}</span></label>`).join('')}</div></details>`).join('') || '<p>No hay una elección de catálogo pendiente para esta clase y nivel. Usá las notas para otras decisiones del rasgo.</p>'}<label class="check"><input type="checkbox" required>Revisé los requisitos de las opciones elegidas con mi DM.</label>`,
      fd =>
        commit('Opciones de clase actualizadas', s => {
          s.classChoices = s.classChoices || {};
          for (const g of groups) {
            const ids = fd.getAll('choice:' + g.name);
            if (ids.length > g.count) throw Error('Superás el máximo de ' + NamesEs.choice(g.name));
            s.classChoices[g.name] = ids;
          }
        }),
    );
  }
  const prerequisiteText = p => TraitsEs.prereqText(p);
  function levelup() {
    if (R.totalLevel(state) >= 20) throw Error('Ya estás en nivel 20 de personaje.');
    if (typeof LevelUp !== 'undefined') return LevelUp.start();
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
    const sc = R.formScores(state),
      c = C.info(state);
    return (
      header(
        esc(state.name),
        `${esc(state.race || 'Linaje por registrar')} · ${MulticlassUI.label(state, true)}`,
        '<a class="button secondary" href="#traits">Ver rasgos</a>' +
          button('Características y armadura', 'stats') +
          button('Competencias', 'class-config') +
          button('Imprimir / PDF', 'print-sheet') +
          button('Subir de nivel', 'levelup', '') +
          button('Libros habilitados', 'campaign-sources') +
          (typeof Cloud !== 'undefined' && Cloud.enabled && Cloud.hasSession()
            ? '<button type="button" class="button secondary" data-sheet-sync title="Deja esta ficha igual acá y en la nube, con la versión más nueva">Subir ficha</button>'
            : ''),
      ) +
      Portrait.card(state) +
      `<div class="ability-grid">${Object.entries(R.attrs)
        .map(
          ([k, label]) =>
            `<section class="card ability-box"><span>${label}</span><strong>${sign(R.mod(sc[k]))}</strong><span>Puntuación ${sc[k]}${state.wildShape?.ab && ['str', 'dex', 'con'].includes(k) ? ' (bestia)' : sc[k] !== state.abilities[k] ? ' (objeto)' : ''}</span>${(parts => `<button class="roll-button ability-check" data-action="ability-check" data-ability="${k}" title="${esc(R.partsText(parts))}">Prueba ${sign(parts.reduce((t, x) => t + x.value, 0))}</button>`)(R.checkParts(state, k))}</section>`,
        )
        .join(
          '',
        )}</div><div class="grid two section-space"><section class="card"><h2>Habilidades</h2><div class="passive-row">${[
        ['perception', 'Percepción pasiva'],
        ['investigation', 'Investigación pasiva'],
        ['insight', 'Perspicacia pasiva'],
      ]
        .map(([k, l]) => `<div class="passive-box"><strong>${R.passive(state, k)}</strong><span>${l}</span></div>`)
        .join(
          '',
        )}</div>${R.skills.map(([k, n, ab]) => `<div class="list-row"><span>${n} <small class="muted">(${R.attrs[ab].slice(0, 3)})</small>${R.hasExpertise(state, k) ? ' ◆' : R.hasSkill(state, k) ? ' •' : R.halfProf(state, ab) ? ' ½' : ''}</span><button class="roll-button" data-action="skill-roll" data-id="${k}" title="${esc(R.partsText(R.checkParts(state, ab, k)))}">${sign(R.skillBonus(state, k))}</button></div>`).join('')}${(h => `<p class="small muted">• competencia · ◆ pericia${h ? ` · ½ ${h.label} +${h.value}` : ''}</p>`)(R.halfProf(state, 'int') || R.halfProf(state, 'str'))}</section><div class="stack"><section class="card"><h2>Salvaciones</h2>${Object.entries(
        R.attrs,
      )
        .map(
          ([k, n]) =>
            `<div class="list-row"><span>${n}</span><button class="roll-button" data-action="roll-save" data-ability="${k}">${sign(R.saveBonus(state, k))}</button></div>`,
        )
        .join(
          '',
        )}<p class="small section-space">Competencia de clase: ${c.saves.map(k => R.attrs[k]).join(', ')}.</p></section></div></div>${EquipmentUI.panel(state)}${defensesCard()}${Campaign.sheetOrigins()}<section class="card section-space"><h2>Rasgos y notas</h2>${state.features
        .map(x => `<div class="feature"><h3>${esc(x.name)}</h3><p>${esc(x.text)}</p>${featBook(x)}</div>`)
        .join(
          '',
        )}<div class="actions">${button('Ver clase y todos sus niveles', 'class-open')}${button('Añadir rasgo', 'feature-new')}${button('Editar rasgos propios', 'feature-manage')}</div></section>`
    );
  }
  // Resistencias, inmunidades y vulnerabilidades con su origen; las anotadas se editan acá.
  function defensesCard() {
    const d = Defenses.of(state),
      row = (title, map) =>
        map.size
          ? `<p><b>${title}:</b> ${[...map].map(([t, why]) => `${esc(Defenses.label(t))} <span class="small muted">(${esc(why)})</span>`).join(', ')}</p>`
          : '';
    const body =
      row('Resistencia', d.resist) +
      row('Inmunidad', d.immune) +
      row('Vulnerabilidad', d.vulnerable) +
      (d.conditions.length
        ? `<p><b>Inmune a:</b> ${esc(d.conditions.map(Defenses.conditionLabel).join(', '))}</p>`
        : '');
    return `<section class="card section-space"><div class="card-header"><h2>Defensas</h2>${button('Editar', 'defenses-edit')}</div>${body || '<p class="small muted">Sin resistencias. Anotá las de objetos, conjuros o rasgos con «Editar».</p>'}<p class="small">El daño con tipo (del DM, de monstruos, de conjuros o el que anotás) se ajusta solo.</p></section>`;
  }
  function defensesEdit() {
    const own = state.defenses || {},
      box = (kind, t) =>
        `<input type="checkbox" name="${kind}" value="${t}" ${(own[kind] || []).includes(t) ? 'checked' : ''} aria-label="${kind} ${Defenses.label(t)}">`;
    modal(
      'Defensas anotadas',
      `<p class="small">Marcá las que te dan objetos, conjuros o rasgos. Las de tu raza y la Furia ya se cuentan solas.</p><div class="defenses-grid"><b>Tipo</b><b>Resistencia</b><b>Inmunidad</b><b>Vulnerable</b>${Defenses.TYPES.map(([t, l]) => `<span>${esc(l)}</span>${box('resist', t)}${box('immune', t)}${box('vulnerable', t)}`).join('')}</div>`,
      fd =>
        commit('Defensas actualizadas', s => {
          s.defenses = {
            resist: fd.getAll('resist'),
            immune: fd.getAll('immune'),
            vulnerable: fd.getAll('vulnerable'),
          };
        }),
    );
  }
  function automaticSpellNote(s, id, grants = C.granted(s)) {
    const g = grants.details[id];
    if (!g) return '';
    const label = g.mode === 'prepared' ? 'Siempre preparado' : 'Concedido automáticamente',
      since = g.ability
        ? 'Lanzamiento con ' + R.attrs[g.ability]
        : g.level
          ? 'Desde nivel ' + g.level
          : g.spellLevel
            ? 'Desde acceso a conjuros de nivel ' + g.spellLevel
            : '';
    const resource = g.freeResource && C.resources(s).find(r => r.id === g.freeResource),
      limits = resource
        ? ' · ' +
          (C.spent(s, resource) === null
            ? 'usos por confirmar'
            : Math.max(0, resource.max - C.spent(s, resource)) + '/' + resource.max + ' usos') +
          ' por descanso ' +
          (resource.reset === 'short' ? 'corto o largo' : 'largo')
        : g.ritualOnly
          ? ' · solo ritual'
          : g.costResource
            ? ' · ' + g.cost + ' ' + g.costResource
            : g.unlimited
              ? ' · sin espacio'
              : '';
    return `<div class="spell-origin" data-spell-origin="${esc(id)}"><b>${label} · ${esc(g.origin)}</b><small>${esc(since)}${g.mode === 'prepared' ? ' · No ocupa tus preparaciones diarias.' : ' · No ocupa una elección normal de conjuro o truco.'}${esc(limits)}${g.castLevel && g.castLevel !== spellById(id)?.level ? ' · lanzamiento nivel ' + g.castLevel : ''}</small>${g.note ? '<p class="small">' + esc(g.note) + '</p>' : ''}</div>`;
  }
  function strixhavenCard(s) {
    const info = FeatFX.strixhaven(s);
    if (!info) return '';
    const name = id => R.allSpells(s).find(sp => sp.id === id)?.name || id;
    return `<section class="card section-space"><div class="card-header"><h2>Iniciado de Strixhaven${info.data ? ' · ' + esc(info.data.name) : ''}</h2>${button(info.complete ? 'Editar conjuros de Strixhaven' : 'Elegir conjuros de Strixhaven', 'strixhaven-config')}</div><p>${info.background ? 'Concedido por ' + esc(info.background) + '.' : 'Concedido por tu dote.'} Dos trucos y un conjuro de nivel 1, adicionales a los de tu clase.</p>${info.complete ? `<p><b>Trucos:</b> ${info.cantrips.map(id => esc(name(id))).join(', ')}.</p><p><b>Conjuro de nivel 1:</b> ${esc(info.spell.name)}. <b>Característica:</b> ${esc(R.attrs[info.picks.castingAbility])}.</p><p class="small">Ya están en Conjuros. El conjuro de nivel 1 permite un lanzamiento gratuito por descanso largo; también podés gastar espacios. Los trucos no gastan espacios.</p>` : '<p class="small">Falta elegir la facultad, dos trucos, un conjuro de nivel 1 y la característica de lanzamiento. Se agregarán automáticamente a Conjuros al guardar.</p>'}</section>`;
  }
  function configureStrixhaven() {
    const initial = FeatFX.strixhaven(state);
    if (!initial) throw Error('Tu personaje no tiene Iniciado de Strixhaven.');
    let draft = { ...initial.picks, college: initial.college };
    const draw = () => {
      const next = {
          ...state,
          progression: {
            ...state.progression,
            featChoices: { ...state.progression.featChoices, 'strixhaven-initiate': draft },
          },
        },
        info = FeatFX.strixhaven(next),
        name = id => R.allSpells(state).find(sp => sp.id === id)?.name || id;
      modal(
        'Conjuros de Iniciado de Strixhaven',
        (info.forced
          ? `<p><b>Facultad: ${esc(info.data.name)}</b> · concedida por ${esc(info.background)}.</p>`
          : select(
              'Facultad de Strixhaven',
              'strixhavenCollege',
              [['', 'Elegí…'], ...Object.entries(FeatFX.STRIXHAVEN).map(([id, data]) => [id, data.name])],
              draft.college || '',
            )) +
          (info.data
            ? `<fieldset><legend>Elegí dos trucos de ${esc(info.data.name)}</legend>${info.data.cantrips.map(id => `<label class="check"><input type="checkbox" name="strixhavenCantrip" value="${esc(id)}" ${(draft.cantrips || []).includes(id) ? 'checked' : ''}>${esc(name(id))}</label>`).join('')}</fieldset>${select('Conjuro de nivel 1 de la dote', 'strixhavenSpell', [['', 'Elegí…'], ...info.firstSpells.sort((a, b) => a.name.localeCompare(b.name, 'es')).map(sp => [sp.id, sp.name + ' · ' + sp.sourceKey])], draft.spell || '')}${select('Característica de lanzamiento de la dote', 'strixhavenAbility', [['', 'Elegí…'], ...['int', 'wis', 'cha'].map(id => [id, R.attrs[id]])], draft.castingAbility || '')}`
            : '<p>Elegí una facultad para ver sus conjuros permitidos.</p>') +
          '<p class="small">No usan tus elecciones de trucos, conjuros conocidos ni preparaciones de clase. El conjuro de nivel 1 se puede lanzar una vez sin espacio por descanso largo, o con tus espacios.</p>',
        fd =>
          commit('Conjuros de Iniciado de Strixhaven actualizados', s =>
            FeatFX.configureStrixhaven(s, {
              college: initial.forced || String(fd.get('strixhavenCollege') || ''),
              cantrips: fd.getAll('strixhavenCantrip'),
              spell: String(fd.get('strixhavenSpell') || ''),
              castingAbility: String(fd.get('strixhavenAbility') || ''),
            }),
          ),
        'Guardar elecciones',
      );
      document
        .getElementById('dialog-form')
        .querySelector('[name="strixhavenCollege"]')
        ?.addEventListener('change', e => {
          const form = new FormData(document.getElementById('dialog-form'));
          draft = {
            college: e.target.value,
            cantrips: [],
            castingAbility: String(form.get('strixhavenAbility') || ''),
          };
          draw();
        });
    };
    draw();
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
      strixhavenCard(state) +
      GrantUI.card(state, true) +
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
  // ---------- Conjuros: pantalla completa con tarjetas, contadores y filtros ----------
  let spellOpen = '',
    spellHost = null;
  function manageSpells(level = 'all') {
    spellDraft = clone(state);
    spellQuery = '';
    spellScope = 'class';
    spellLevel = String(level);
    spellOpen = '';
    if (!spellHost) {
      spellHost = document.createElement('div');
      spellHost.id = 'spellbook';
      spellHost.className = 'creator-host';
      spellHost.setAttribute('role', 'dialog');
      spellHost.setAttribute('aria-modal', 'true');
      spellHost.setAttribute('aria-label', 'Conjuros');
      document.body.append(spellHost);
      spellHost.addEventListener('click', spellClick);
      spellHost.addEventListener('input', e => {
        if (e.target.name !== 'q') return;
        spellQuery = e.target.value;
        const pos = e.target.selectionStart;
        drawSpells();
        const q = spellHost.querySelector('[name=q]');
        q?.focus();
        q?.setSelectionRange(pos, pos);
      });
      spellHost.addEventListener('change', e => {
        if (!e.target.dataset.spellMode) return;
        spellDraft.spellModes = spellDraft.spellModes || {};
        spellDraft.spellModes[e.target.dataset.spellMode] = e.target.value;
      });
      spellHost.addEventListener('keydown', e => e.key === 'Escape' && closeSpells());
    }
    document.getElementById('modal')?.open && document.getElementById('modal').close();
    spellHost.hidden = false;
    document.body.classList.add('creator-open');
    drawSpells();
  }
  function closeSpells() {
    spellHost.hidden = true;
    document.body.classList.remove('creator-open');
  }
  // Estados posibles de un conjuro para esta ficha (los mismos que antes ofrecía el desplegable).
  // Una dote elegida («Dote: …» en los rasgos): su texto en los libros importados.
  function featBook(x) {
    if (typeof LibraryText === 'undefined' || !/^Dote:/.test(x.text || '')) return '';
    const f = Catalog.feats.find(c => c.name === x.name && (state.progression?.learnedFeats || []).includes(c.id));
    return f
      ? (TraitsEs.brief('feat:' + f.id) ? `<p class="small">${esc(TraitsEs.brief('feat:' + f.id))}</p>` : '') +
          LibraryText.html(LibraryText.feat(f.id))
      : '';
  }
  function spellOptions(sp, s, d, mode, g) {
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
      (s.level >= 10 || (C.sub(s)?.id === 'bard-college-of-lore' && s.level >= 6)) &&
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
        [
          current,
          automatic.mode === 'prepared'
            ? 'Siempre preparado · subclase'
            : automatic.grantType === 'feat'
              ? 'Concedido por dote'
              : 'Concedido por subclase',
        ],
      ];
    if (!options.some(x => x[0] === current)) options.push([current, 'Selección previa']);
    return { options, current, automatic };
  }
  const STATUS_LABEL = {
    known: 'Conocido',
    book: 'En el libro',
    prepared: 'Preparado',
    secret: 'Secreto mágico',
    arcanum: 'Arcanum',
    extra: 'Extra del DM',
    'automatic-prepared': 'Siempre preparado',
    'automatic-known': 'Concedido',
  };
  function drawSpells() {
    const s = spellDraft,
      d = R.stats(s),
      mode = C.casting(s).type,
      g = C.granted(s),
      counts = C.spellCounts(s),
      top = spellHost.querySelector('.creator-body')?.scrollTop || 0;
    const list = R.allSpells(s)
      .filter(
        sp =>
          canon(sp.name + ' ' + (sp.english || '')).includes(canon(spellQuery)) &&
          (spellScope === 'all' ||
            (spellScope === 'mine' && statusOf(sp.id, g) !== 'no') ||
            (spellScope === 'campaign' && Campaign.enabled(s, sp)) ||
            (spellScope === 'class' &&
              (statusOf(sp.id, g) !== 'no' ||
                (Campaign.enabled(s, sp) &&
                  sp.level <= Math.max(1, d.slots.length) &&
                  (C.member(sp, s) || g.expanded.includes(sp.id)))))) &&
          (spellLevel === 'all' || sp.level === Number(spellLevel)),
      )
      .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, 'es'));
    const meter = (label, have, max) =>
      `<span class="tag ${max !== null && have > max ? 'warn' : ''}">${label} <b>${have}${max !== null ? ' / ' + max : ''}</b></span>`;
    const meters = [
      d.cantrips ? meter('Trucos', counts.cantrips, d.cantrips) : '',
      mode === 'known' ? meter('Conocidos', counts.known, d.known) : '',
      mode === 'book' ? meter('En el libro', counts.known, null) : '',
      ['prepared', 'book'].includes(mode) ? meter('Preparados', counts.prepared, d.prepared) : '',
      counts.automaticPrepared + counts.automaticKnown
        ? meter('Concedidos por rasgos', counts.automaticPrepared + counts.automaticKnown, null)
        : '',
      s.extras.length ? meter('Extras del DM', s.extras.length, null) : '',
    ].join('');
    const chip = (kind, v, label, on) =>
      `<button type="button" class="chip ${on ? 'selected' : ''}" data-sb="${kind}" data-v="${v}" aria-pressed="${on}">${label}</button>`;
    const maxLevel = spellScope === 'all' || spellScope === 'campaign' ? 9 : Math.max(1, d.slots.length);
    const card = sp => {
      const { options, current, automatic } = spellOptions(sp, s, d, mode, g),
        open = spellOpen === sp.id,
        badge =
          current !== 'no'
            ? `<span class="tag spell-status">${esc(current === 'known' && !sp.level ? 'Truco conocido' : current === 'prepared' && mode === 'book' ? 'Libro + preparado' : STATUS_LABEL[current] || '')}</span>`
            : '';
      const head = `<span class="creator-card-title">${esc(sp.name)}</span><span class="creator-meta">${sp.level ? 'Nivel ' + sp.level : 'Truco'} · ${esc(sp.school || '')} · ${esc(sp.time)}${sp.concentration ? ' · Conc.' : ''}${sp.ritual ? ' · Ritual' : ''}</span>${badge}`;
      if (!open)
        return `<button type="button" class="creator-card ${current !== 'no' ? 'selected' : ''}" data-sb="open" data-id="${esc(sp.id)}" aria-expanded="false">${head}<span class="creator-brief">${esc(sp.brief || '')}</span></button>`;
      return `<div class="creator-card selected spell-open"><button type="button" class="spell-open-head" data-sb="open" data-id="${esc(sp.id)}" aria-expanded="true">${head}</button>${automaticSpellNote(s, sp.id, g)}<div class="chips">${options
        .map(
          ([v, l]) =>
            `<button type="button" class="chip ${current === v ? 'selected' : ''}" data-sb="set" data-id="${esc(sp.id)}" data-v="${v}" ${automatic ? 'disabled' : ''} aria-pressed="${current === v}">${esc(l)}</button>`,
        )
        .join('')}</div>${
        s.extras.includes(sp.id)
          ? `<label class="field small">Cómo se lanza<select data-spell-mode="${esc(sp.id)}"><option value="slot">Usa espacios normales</option><option value="free" ${s.spellModes?.[sp.id] === 'free' ? 'selected' : ''}>Sin espacio · autorizado por el DM</option></select></label>`
          : ''
      }<p class="small">${esc(sp.text || sp.brief || '')}</p>${typeof OfficialContent !== 'undefined' ? OfficialContent.spellHtml(sp.id) : ''}${(n => (n.length ? `<p class="spell-numbers">${n.map(esc).join('<br>')}</p>` : ''))(R.spellNumbersFor(s, sp))}<p class="small muted">${esc(sp.range || '')} · ${esc(sp.components || '')}${sp.materialEs ? ' (' + esc(sp.materialEs) + ')' : ''} · ${esc(sp.duration || '')} · ${esc(sp.sourceKey || sp.source || '')}${sp.english ? ' · ' + esc(sp.english) : ''}</p></div>`;
    };
    spellHost.innerHTML = `<div class="creator-shell"><header class="creator-head"><div><p class="eyebrow">CONJUROS · ${esc(className(s)).toUpperCase()} ${s.level} · ${esc(prepNames[mode] || '').toUpperCase()}</p><h1>Tus conjuros</h1></div><div class="actions">${'<button type="button" class="button secondary" data-sb="cancel">Cancelar</button>'}</div></header><div class="creator-rail spell-meters">${meters || '<span class="small muted">Tu clase no lanza conjuros a este nivel: podés anotar extras del DM.</span>'}</div><div class="creator-body"><div id="spellbook-error" class="creator-error" role="alert"></div><div class="creator-search"><input type="search" name="q" value="${esc(spellQuery)}" placeholder="Buscar en español o inglés" aria-label="Buscar conjuro"></div><div class="chips spell-filter">${[
      ['class', 'Mi clase'],
      ['mine', 'Solo los míos'],
      ['campaign', 'Libros habilitados'],
      ['all', 'Todo el catálogo'],
    ]
      .map(([v, l]) => chip('scope', v, l, spellScope === v))
      .join('')}</div><div class="chips spell-filter">${[
      ['all', 'Todos'],
      ...Array.from({ length: maxLevel + 1 }, (_, i) => [String(i), i ? 'Nivel ' + i : 'Trucos']),
    ]
      .map(([v, l]) => chip('level', v, l, spellLevel === v))
      .join(
        '',
      )}</div>${spellScope === 'all' ? '<p class="small">En «Todo el catálogo» podés sumar cualquier conjuro como <b>Extra del DM</b>, fuera de tu clase, libro o nivel.</p>' : ''}<p class="small">${list.length} conjuros. Tocá uno para elegir qué hacer con él.</p><div class="creator-grid small-cards">${list.map(card).join('') || '<p class="muted">Ningún conjuro coincide.</p>'}</div></div><footer class="creator-foot"><p class="creator-summary">${esc(state.name)}: CD ${d.dc} · ataque ${sign(d.attack)}</p><div class="actions"><button type="button" class="button" data-sb="save">Guardar</button></div></footer></div>`;
    const b = spellHost.querySelector('.creator-body');
    if (b) b.scrollTop = top;
  }
  function spellClick(e) {
    const t = e.target.closest('[data-sb]');
    if (!t || t.disabled) return;
    const a = t.dataset.sb;
    try {
      if (a === 'cancel') return closeSpells();
      if (a === 'save') {
        validateRepertoire(spellDraft);
        commit('Repertorio actualizado', next => {
          for (const k of ['known', 'extras', 'prepared', 'secretKnown', 'spellModes', 'arcanum'])
            next[k] = clone(spellDraft[k] || (['spellModes', 'arcanum'].includes(k) ? {} : []));
          if (next.concentration && !C.usable(next).includes(next.concentration)) next.concentration = null;
        });
        closeSpells();
        return toast('Conjuros guardados.');
      }
      if (a === 'open') spellOpen = spellOpen === t.dataset.id ? '' : t.dataset.id;
      if (a === 'set') spellChoice(t.dataset.id, t.dataset.v);
      if (a === 'scope') spellScope = t.dataset.v;
      if (a === 'level') spellLevel = t.dataset.v;
      drawSpells();
    } catch (err) {
      const el = spellHost.querySelector('#spellbook-error');
      if (el) el.textContent = err.message;
    }
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
      (C.sub(s)?.id === 'bard-college-of-lore' && s.level >= 6 ? 2 : 0);
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
    const mm = typeof Metamagic !== 'undefined' ? Metamagic.panel(state) : '';
    return (
      C.resources(state)
        .map(r => {
          const used = C.spent(state, r);
          return `<div class="pool-row"><div class="pool-head"><b>${esc(r.name)}</b><span>${used === null ? '—' : r.max === 999 ? '∞' : Math.max(0, r.max - used) + ' / ' + r.max}</span></div><p class="small">${esc(r.text)}</p><div class="actions">${r.id === 'cannon' ? button('Crear cañón', 'cannon-create', '') : button('Usar', 'class-resource', '', `data-id="${r.id}"`)}${button('Ajustar', 'class-resource-edit', 'secondary', `data-id="${r.id}"`)}</div><p class="small">Recuperación: descanso ${r.reset === 'short' ? 'corto o largo' : 'largo'}.</p>${r.id === 'rage' && state.raging ? button('Terminar rabia', 'class-rage-end') : ''}</div>`;
        })
        .join('') + mm
    );
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
      dice = C.hitDiceLeft(state),
      die = (dice.find(x => x.left) || dice[0]).die;
    if (state.hdSpent === null || state.hp === null)
      throw Error('Confirmá tus PG y Dados de Golpe antes de descansar.');
    const max = R.totalLevel(state) - state.hdSpent;
    modal(
      'Descanso corto completado',
      `<p>Podés gastar hasta ${max} Dados de Golpe (${dice.map(x => x.count + 'd' + x.die).join(' + ')} en total; te quedan ${dice.map(x => x.left + 'd' + x.die).join(' + ')}). Tirás cada dado, sumás CON ${sign(d.mods.con)} y recuperás ese resultado (mínimo 0 por dado). Podés decidir gastar otro después de cada tirada.</p>${
        dice.length > 1
          ? select(
              'Tipo de dado',
              'die',
              dice.map(x => [x.die, `d${x.die} (te quedan ${x.left})`]),
              die,
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
        const used = Number(fd.get('die')) || die,
          left = dice.find(x => x.die === used)?.left ?? 0;
        if (n > left) throw Error(`Te quedan ${left}d${used}. Para otro tipo de dado, elegilo arriba.`);
        if (rolls.length !== n || rolls.some(x => !Number.isInteger(x) || x < 1 || x > used))
          throw Error('Ingresá un resultado válido por cada d' + used + ' gastado.');
        const heal = rolls.reduce((a, n) => a + Math.max(0, n + d.mods.con), 0) + song;
        commit('Descanso corto · ' + n + 'd' + used + ' · +' + heal + ' PG', s => {
          C.spendHitDice(s, used, n);
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
          s.hpBase += max - R.stats(s).maxHP;
          s.hp = number(fd, 'hp', 0, max);
          s.hpConfirmed = true;
          s.temp = number(fd, 'temp', 0, 9999);
          s.hdSpent = R.totalLevel(s) - number(fd, 'hd', 0, R.totalLevel(s));
          delete s.hdSpentByDie;
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
      account,
      'party-create': () => Creator.start(),
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
      'strixhaven-config': configureStrixhaven,
      'class-config': classConfig,
      'oath-break': oathBreak,
      'oath-atone': oathAtone,
      'class-choices': () => (typeof LevelUp !== 'undefined' ? LevelUp.chooseOptions() : chooseClass()),
      'resolve-choices': resolveChoices,
      'resolve-task': e => resolveTask(e.dataset.id),
      'class-resource': e => useResource(e.dataset.id),
      'class-resource-edit': e => useResource(e.dataset.id, true),
      'class-rage-end': () => commit('Rabia terminada', s => (s.raging = false)),
      'defenses-edit': defensesEdit,
      'class-notes-save': () => flushNotes(),
      stats: statsEdit,
      'short-rest': shortRest,
      'party-attack': genericAttack,
      'party-short-roll': () => {
        const form = document.getElementById('dialog-form'),
          n = Number(form.elements.namedItem('count').value);
        const die =
            Number(form.elements.namedItem('die')?.value) ||
            C.hitDiceLeft(state).find(x => x.left)?.die ||
            C.info(state).die,
          left = C.hitDiceLeft(state).find(x => x.die === die)?.left ?? 0;
        if (!Number.isInteger(n) || n < 0 || n > left) throw Error(`Te quedan ${left}d${die}.`);
        form.elements.namedItem('rolls').value = roll(die, n).join(', ');
      },
    });
  }
  return {
    decorate,
    welcome,
    list,
    account,
    accountReady,
    storageHelp,
    makeCharacter,
    creationSkillFields,
    classPage,
    classConfig,
    chooseClass,
    levelup,
    character,
    spells,
    strixhavenCard,
    manageSpells,
    validateRepertoire,
    automaticSpellNote,
    resourceCards,
    combatAbilities,
    shortRest,
    install,
  };
})();
