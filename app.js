/* Aplicación estática. La mesa compartida (cloud.js) es opcional; sin ella todo queda en el dispositivo. */
'use strict';
const R = window.Rules,
  KEY = CharacterStorage.activeKey(),
  BACKUP = KEY + '-previous';
const $ = s => document.querySelector(s),
  esc = v =>
    String(v ?? '').replace(
      /[&<>"']/g,
      c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
const sign = n => (n >= 0 ? '+' : '') + n,
  uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id' + Date.now() + Math.random().toString(36).slice(2)),
  clone = o => JSON.parse(JSON.stringify(o));
let state = null,
  view = 'combat',
  history = [],
  query = '',
  filter = 'all',
  storageIssue = '',
  rawBroken = null,
  toastTimer;
try {
  const raw = KEY ? localStorage.getItem(KEY) : null;
  if (raw) {
    try {
      state = R.validate(JSON.parse(raw));
    } catch (e) {
      rawBroken = raw;
      storageIssue =
        'No se pudo leer la ficha guardada. Podés descargar el contenido desde Mi ficha antes de reemplazarlo.';
    }
  }
} catch (e) {
  storageIssue = 'El navegador no permite guardar aquí. Exportá una copia antes de cerrar.';
}
const navs = [
  ['combat', '◈', 'Combate'],
  ['spells', '✦', 'Conjuros'],
  ['gear', '▣', 'Equipo'],
  ['character', '◇', 'Personaje'],
  ['class', '✧', 'Clase'],
  ['journal', '≡', 'Diario'],
  ['table', '⚑', 'Mesa'],
];
function hideToast() {
  clearTimeout(toastTimer);
  const el = $('#toast');
  el.classList.remove('visible');
  el.hidden = true;
}
function toast(msg) {
  const el = $('#toast'),
    close = document.createElement('button');
  clearTimeout(toastTimer);
  close.type = 'button';
  close.className = 'toast-close';
  close.dataset.action = 'toast-dismiss';
  close.setAttribute('aria-label', 'Cerrar aviso');
  close.textContent = '×';
  el.replaceChildren(document.createTextNode(msg), close);
  el.hidden = false;
  el.classList.add('visible');
  toastTimer = setTimeout(hideToast, 4200);
}
function persist(before) {
  if (!state || !KEY) throw Error('Creá o importá un personaje primero.');
  try {
    if (rawBroken) throw Error('Resguardá o reemplazá la ficha dañada desde Mi ficha.');
    if (before) localStorage.setItem(BACKUP, JSON.stringify(before));
    localStorage.setItem(KEY, JSON.stringify(state));
    $('#save-status').textContent = 'Guardado en este dispositivo';
    storageIssue = '';
    Cloud.changed(KEY, state);
  } catch (e) {
    storageIssue = rawBroken ? e.message : 'No se pudo guardar. Tu ficha sigue abierta: exportá una copia.';
    $('#save-status').textContent = 'Sin guardar';
    toast(storageIssue);
  }
}
function commit(label, fn, requireSaved = false) {
  if (!state || !KEY) throw Error('Creá o importá un personaje primero.');
  const before = clone(state),
    next = clone(state);
  try {
    fn(next);
    next.log.unshift({ date: new Date().toISOString(), text: label });
    next.log = next.log.slice(0, 100);
    R.validate(next);
  } catch (e) {
    throw Error(e.message || 'No se pudo aplicar el cambio.');
  }
  if (requireSaved) {
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch (e) {
      throw Error(
        'No hay espacio para guardar la foto. Quitá fotos de otras fichas o exportá y eliminá una ficha que no uses.',
      );
    }
    try {
      localStorage.setItem(BACKUP, JSON.stringify(before));
    } catch {}
    storageIssue = '';
    $('#save-status').textContent = 'Guardado en este dispositivo';
    Cloud.changed(KEY, next);
  }
  history.push(before);
  history = history.slice(-20);
  state = next;
  if (!requireSaved) persist(before);
  render();
}
function download(name, data, type = 'application/json') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([data], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function roll(sides, count = 1) {
  const a = [];
  for (let i = 0; i < count; i++) {
    let x;
    const limit = Math.floor(4294967296 / sides) * sides;
    do {
      x = crypto.getRandomValues(new Uint32Array(1))[0];
    } while (x >= limit);
    a.push((x % sides) + 1);
  }
  return a;
}
function number(fd, key, min, max, def) {
  const raw = fd.get(key);
  if ((raw === null || raw === '') && def !== undefined) return def;
  const n = Number(raw);
  if (raw === '' || !Number.isFinite(n) || !Number.isInteger(n) || n < min || n > max)
    throw Error('Revisá «' + key + '»: usá un entero entre ' + min + ' y ' + max + '.');
  return n;
}
function field(label, name, value = '', type = 'text', extra = '') {
  return `<label class="field">${label}<input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`;
}
function select(label, name, options, value) {
  return `<label class="field">${label}<select name="${name}">${options.map(([v, t]) => `<option value="${esc(v)}" ${String(v) === String(value) ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`;
}
function area(label, name, value) {
  return `<label class="field">${label}<textarea name="${name}">${esc(value)}</textarea></label>`;
}
function modal(title, html, submit, saveLabel = 'Guardar') {
  hideToast();
  const d = $('#modal');
  d.classList.remove('learning-modal');
  if (d.open) d.close();
  $('#modal-content').innerHTML =
    `<div class="modal-head"><h2 id="dialog-title">${esc(title)}</h2><button type="button" class="icon-btn" data-close aria-label="Cerrar">×</button></div><form id="dialog-form"><div class="modal-body">${html}<p class="form-error" id="form-error" role="alert"></p>${submit ? `<div class="modal-actions"><button type="button" class="button secondary" data-close>Cancelar</button><button class="button" type="submit">${esc(saveLabel)}</button></div>` : ''}</div></form>`;
  $('#dialog-form').addEventListener('submit', e => {
    e.preventDefault();
    if (!submit) return;
    try {
      const result = submit(new FormData(e.currentTarget));
      if (result !== false) d.close();
    } catch (err) {
      $('#form-error').textContent = err.message;
    }
  });
  d.showModal();
}
function confirmAction(title, text, fn, label = 'Confirmar') {
  modal(title, `<p>${esc(text)}</p>`, () => fn(), label);
}
function header(title, subtitle, buttons = '') {
  return `<div class="heading"><div><p class="eyebrow">${view === 'combat' ? 'EN LA MESA' : 'CUADERNO DE PERSONAJE'}</p><h1>${title}</h1><p>${subtitle}</p></div><div class="actions">${buttons}</div></div>`;
}
function button(label, action, classes = 'secondary', data = '') {
  return `<button type="button" class="button ${classes}" data-action="${action}" ${data}>${label}</button>`;
}
function poolValue(s, type, index) {
  if (type === 'slot') return s.slotsSpent[index];
  if (type === 'inspiration') return s.inspirationSpent;
  if (type === 'hd') return s.hdSpent;
  if (type === 'pact') return s.pactSpent ?? 0;
  if (type === 'universal') return s.universalSpent;
  if (type === 'infectious') return s.infectiousSpent;
  return s.extraResources.find(x => x.id === index)?.spent;
}
function poolMax(s, type, index) {
  const d = R.stats(s);
  return type === 'slot'
    ? d.slots[index] || 0
    : type === 'inspiration' || type === 'infectious'
      ? d.inspirationMax
      : type === 'hd'
        ? R.totalLevel(s)
        : type === 'pact'
          ? R.stats(s).pact?.max || 0
          : type === 'universal'
            ? 1
            : s.extraResources.find(x => x.id === index)?.max || 0;
}
function setPool(s, type, index, value) {
  if (type === 'slot') s.slotsSpent[index] = value;
  else if (type === 'inspiration') s.inspirationSpent = value;
  else if (type === 'hd') s.hdSpent = value;
  else if (type === 'pact') s.pactSpent = value;
  else if (type === 'universal') s.universalSpent = value;
  else if (type === 'infectious') s.infectiousSpent = value;
  else s.extraResources.find(x => x.id === index).spent = value;
}
function pool(title, type, index = '', help = '') {
  const max = poolMax(state, type, index),
    used = poolValue(state, type, index);
  return `<div class="pool-row"><div class="pool-head"><span>${title}</span><button class="text-btn" data-action="pool-edit" data-type="${type}" data-index="${esc(index)}"><strong>${used === null ? '—' : max - used} / ${max}</strong></button></div><div class="pips">${Array.from({ length: max }, (_, i) => `<button class="pip ${used === null ? 'unknown' : i < used ? 'spent' : ''}" data-action="pip" data-type="${type}" data-index="${esc(index)}" data-pip="${i}" aria-label="${esc(title)}: ${used === null ? 'ajustar cantidad' : i < used ? 'recuperar un uso' : 'gastar un uso'}">${used === null ? '?' : i < used ? '−' : '✦'}</button>`).join('')}</div>${help ? `<div class="pool-help">${help}</div>` : ''}</div>`;
}
function spellById(id) {
  return R.allSpells(state).find(s => s.id === id);
}
function spellName(id) {
  return spellById(id)?.name || 'Conjuro';
}
function missing() {
  return R.stats(state).known - Progression.spellCount(state);
}
function combat() {
  return combatView();
}
function spellCard(s) {
  const extra = state.extras.includes(s.id);
  return `<details class="spell" id="spell-${esc(s.id)}"><summary><div class="spell-title"><div><h2>${esc(s.name)}</h2><div class="spell-meta">${s.level ? 'Nivel ' + s.level : 'Truco'} · ${esc(s.time)} · ${esc(s.range)}</div></div>${extra ? '<span class="tag">Extra DM</span>' : s.concentration ? '<span class="tag">Conc.</span>' : ''}</div><p class="spell-brief">${esc(s.brief)}</p></summary><div class="spell-body"><p>${esc(s.text)}</p>${button('Explicación y requisitos', 'spell-help', 'secondary', `data-id="${esc(s.id)}"`)}<p class="small">Componentes: ${esc(s.components)}<br>Duración: ${esc(s.duration)}${s.concentration ? ' · Concentración' : ''}<br>Fuente: ${esc(s.source)}</p><div class="spell-footer">${button(s.level ? 'Lanzar' : 'Usar truco', 'cast', '', `data-id="${esc(s.id)}"`)}${Classes.ritualAllowed(state, s) ? button('Ritual · sin espacio', 'ritual', 'secondary', `data-id="${esc(s.id)}"`) : ''}${button('Editar', 'spell-edit', 'secondary', `data-id="${esc(s.id)}"`)}</div></div></details>`;
}
function legacySpellPage() {
  let list = [...state.known, ...state.extras]
    .map(spellById)
    .filter(Boolean)
    .filter(
      s =>
        (filter === 'all' ||
          (filter === 'ritual' && s.ritual) ||
          (filter === 'concentration' && s.concentration) ||
          (filter === 'reaction' && s.time === 'Reacción')) &&
        s.name.toLowerCase().includes(query.toLowerCase()),
    );
  list.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
  let d = R.stats(state);
  return (
    header(
      'Tu repertorio.',
      `CD ${d.dc} · Ataques ${sign(d.attack)} · ${Progression.spellCount(state)}/${d.known} conjuros de bardo + ${state.extras.length} adicional del DM`,
      button('Fuentes y opciones', 'learning-config') +
        button('Catálogo completo', 'spell-catalog') +
        button('Gestionar conjuros', 'spell-manage') +
        button('Crear conjuro', 'spell-new', ''),
    ) +
    `${missing() > 0 ? `<div class="banner"><p>Te falta elegir ${missing()} conjuro${missing() > 1 ? 's' : ''}. Silvery Barbs está disponible en el catálogo; Detectar magia no ocupa esta elección.</p>${button('Elegir', 'spell-manage')}</div>` : ''}<div class="toolbar"><input class="control" id="spell-search" type="search" placeholder="Buscar en tus conjuros…" aria-label="Buscar conjuros" value="${esc(query)}"><select class="control" id="spell-filter" aria-label="Filtrar conjuros">${[
      ['all', 'Todos'],
      ['concentration', 'Concentración'],
      ['ritual', 'Rituales'],
      ['reaction', 'Reacciones'],
    ]
      .map(([v, t]) => `<option value="${v}" ${v === filter ? 'selected' : ''}>${t}</option>`)
      .join(
        '',
      )}</select></div><div class="spell-grid">${list.length ? list.map(spellCard).join('') : '<div class="empty">No hay conjuros con ese filtro.</div>'}</div>`
  );
}
function gear() {
  const total = state.gold.cp + state.gold.sp * 10 + state.gold.ep * 50 + state.gold.gp * 100 + state.gold.pp * 1000;
  const weight = state.inventory.reduce((a, x) => a + (x.weight || 0) * x.qty, 0);
  return (
    header(
      'Cada cosa en su lugar.',
      'Equipo, provisiones y cuentas del viaje.',
      button('Añadir del catálogo', 'equipment-catalog', '') + button('Añadir objeto libre', 'item-new', 'secondary'),
    ) +
    EquipmentUI.panel(state) +
    `<div class="columns gear-columns"><section class="card"><div class="card-header"><h2>Inventario</h2><small>${state.inventory.length} entradas</small></div><div class="inventory-list">${state.inventory.map(x => `<div class="list-row"><div><button class="text-btn item-name" data-action="item-edit" data-id="${esc(x.id)}">${esc(x.name)}</button><p>${esc(x.category)} · ${esc(x.location)}</p></div><div class="qty"><button class="icon-btn" aria-label="Restar ${esc(x.name)}" data-action="qty" data-id="${esc(x.id)}" data-delta="-1" ${x.qty === 0 ? 'disabled' : ''}>−</button><span>${x.qty}</span><button class="icon-btn" aria-label="Sumar ${esc(x.name)}" data-action="qty" data-id="${esc(x.id)}" data-delta="1">+</button></div></div>`).join('')}</div><p class="small section-space">Peso registrado: ${weight.toFixed(1)} lb. Solo suma objetos con peso informado; no es la carga total. Capacidad normal del personaje: ${state.abilities.str * 15} lb.</p></section><div class="stack"><section class="card"><div class="card-header"><h2>La bolsa</h2><button class="text-btn" data-action="gold-edit">Editar saldo</button></div><div class="coin-grid">${[
      ['cp', 'pc'],
      ['sp', 'pp'],
      ['ep', 'pe'],
      ['gp', 'po'],
      ['pp', 'ppt'],
    ]
      .map(([k, l]) => `<div class="coin"><strong>${state.gold[k]}</strong><span class="small">${l}</span></div>`)
      .join(
        '',
      )}</div><p class="small section-space">Equivalente: ${(total / 100).toLocaleString('es-AR', { maximumFractionDigits: 2 })} po. ${state.goldConfirmed ? '' : 'Saldo inicial de 15 po; confirmá gastos y recompensas.'}</p><div class="actions">${button('Ingreso / gasto', 'gold-transaction', '')}</div></section><section class="card ${state.classId ? 'legacy-only' : ''}"><div class="card-header"><h2>${esc(state.mule.name)}</h2><span class="tag">CA 10</span></div><div class="hp-number" style="font-size:2.8rem">${state.mule.hp ?? '—'}<small> / ${state.mule.max} PG</small></div><p class="small section-space">40 pies · Iniciativa +0 · Mediana<br>Pezuñas +2 · 1d4 + 2 contundente<br>Paso firme: ventaja FUE/DES contra derribo.</p><p class="small">Carga: 420 lb. Con carro: 2.100 lb incluido el carro. El DM maneja su conducta; no es un ataque adicional automático. Darien puede ir en el carro; la mula no es de un tamaño mayor que él.</p>${button('Editar mula', 'mule')}</section><section class="card ${state.classId ? 'legacy-only' : ''}"><h2>Comerciante gremial</h2><p class="small">Cuota: 5 po al mes. Herramientas de navegante: competencia confirmada, juego físico por confirmar. No se añadieron raciones, cuerda ni otros objetos que no tuvieras.</p></section></div></div>`
  );
}
function legacyCharacter() {
  const d = R.stats(state);
  return (
    header(
      'La ficha de Darien.',
      `Semielfo · Bardo ${state.level} · ${state.level >= 3 ? (state.subclass === 'eloquence' ? 'Colegio de la Elocuencia' : 'Subclase manual') : 'Colegio en nivel 3'}`,
      button('Editar características', 'stats') + button('Subir de nivel', 'levelup', ''),
    ) +
    `<div class="ability-grid">${Object.entries(R.attrs)
      .map(
        ([k, label]) =>
          `<section class="card ability-box"><span>${label}</span><strong>${sign(d.mods[k])}</strong><span>Puntuación ${state.abilities[k]}</span></section>`,
      )
      .join(
        '',
      )}</div><div class="grid two section-space"><section class="card"><h2>Habilidades</h2><div class="skill-list">${R.skills.map(([id, name]) => `<div class="list-row"><span>${esc(name)}${state.expertise.includes(id) ? ' ◆' : state.proficiencies.includes(id) ? ' •' : ''}</span><button class="roll-button" data-action="skill-roll" data-id="${id}">${sign(R.skillBonus(state, id))}</button></div>`).join('')}</div><p class="small section-space">• Competencia · ◆ Pericia. Todos los bonos ya están incluidos. Percepción pasiva: ${10 + R.skillBonus(state, 'perception')}.</p></section><section class="card"><h2>Salvaciones</h2>${Object.entries(
      R.attrs,
    )
      .map(
        ([k, label]) =>
          `<div class="list-row"><span>${label}</span><button class="roll-button" data-action="roll" data-label="Salvación de ${label}" data-bonus="${R.saveBonus(state, k)}">${sign(R.saveBonus(state, k))}</button></div>`,
      )
      .join(
        '',
      )}<div class="divider"></div><h3>Idiomas y competencias</h3><p class="small">Común, Élfico, Enano y Gnómico. Armaduras ligeras. Armas simples, ballesta de mano, espada larga, estoque y espada corta. Flauta, laúd, viola y herramientas de navegante.</p></section></div><section class="card section-space"><div class="card-header"><h2>Lo que podés hacer</h2>${button('Rasgo personalizado', 'feature-new')}</div>${R.features(
      state,
    )
      .map(([name, text]) => `<div class="feature"><h3>${esc(name)}</h3><p>${esc(text)}</p></div>`)
      .join('')}${state.features.length ? button('Editar rasgos propios', 'feature-manage') : ''}</section>`
  );
}
function journal() {
  return (
    header('El viaje continúa.', 'Notas, compañeros e historial de cambios.', button('Exportar copia', 'backup')) +
    `<div class="columns"><div class="stack"><section class="card"><h2>Notas de la sesión</h2><label class="field"><span class="visually-hidden">Notas</span><textarea id="journal-notes" style="min-height:230px">${esc(state.notes)}</textarea></label>${button('Guardar notas', 'notes-save', '')}</section><section class="card"><div class="card-header"><h2>Compañeros y mascotas</h2><button class="text-btn" data-action="companion">Editar</button></div><div class="companion">${state.classId ? '' : '<img src="./assets/companion.webp" alt="Retrato de la compañera de viaje" width="768" height="1152">'}<div>${state.companion.name || state.companion.notes ? `<h3>${esc(state.companion.name)}</h3><p>${esc(state.companion.notes)}</p>` : '<p class="muted">Anotá familiares, mascotas, monturas o PNJ que viajan con vos.</p>'}</div></div></section><section class="card"><h2>Progresión registrada</h2>${state.levelHistory.length ? state.levelHistory.map(x => `<div class="feature"><h3>Nivel ${x.level}</h3><p>${esc(x.note)}</p></div>`).join('') : '<p class="muted">Las próximas subidas de nivel quedarán registradas acá.</p>'}</section></div><section class="card"><div class="card-header"><h2>Últimos cambios</h2><button class="text-btn" data-action="undo">Deshacer</button></div><div class="log">${
      state.log.length
        ? state.log
            .slice(0, 40)
            .map(
              x =>
                `<div class="log-item"><time>${esc(new Date(x.date).toLocaleString('es-AR'))}</time><p>${esc(x.text)}</p></div>`,
            )
            .join('')
        : '<p class="muted">Los gastos, descansos y cambios de la ficha se registrarán acá.</p>'
    }</div></section></div>`
  );
}
function render() {
  const y = scrollY;
  document.body.classList.toggle('no-character', !state);
  if (!state) {
    PartyUI.welcome();
    return;
  }
  PartyUI.decorate();
  $('#nav').innerHTML = navs
    .map(
      ([id, icon, label]) =>
        `<a class="nav-link ${view === id ? 'active' : ''}" href="#${id}" ${view === id ? 'aria-current="page"' : ''}><span class="nav-symbol" aria-hidden="true">${icon}</span><span>${label}</span></a>`,
    )
    .join('');
  $('#breadcrumb').textContent = navs.find(x => x[0] === view)?.[2] || 'Combate';
  $('#main').innerHTML =
    (storageIssue ? `<div class="banner"><p>${esc(storageIssue)}</p>${button('Mi ficha', 'settings')}</div>` : '') +
    (view === 'combat' ? `<div id="table-requests">${TableUI.requestBanner()}</div>` : '') +
    (
      {
        combat,
        spells: spellPage,
        gear,
        character,
        journal,
        class: () => PartyUI.classPage() + MulticlassUI.section(),
        table: TableUI.page,
      }[view] || combat
    )();
  scrollTo(0, y);
}
function go() {
  hideToast();
  view = location.hash.slice(1);
  if (!navs.some(x => x[0] === view)) view = 'combat';
  query = '';
  filter = 'all';
  render();
  scrollTo(0, 0);
}
function editResources() {
  let d = R.stats(state);
  modal(
    'Recursos actuales',
    `<p class="small">Ingresá lo que te queda ahora. El máximo de PG sugerido (${d.maxHP}) usa los aumentos fijos hasta nivel ${state.level} salvo ajustes previos.</p><div class="form-grid">${field('PG máximos', 'máximo', d.maxHP, 'number', 'min="1" max="2000" required')}${field('PG actuales', 'PG', state.hp ?? '', 'number', 'min="0" max="2000" required')}${field('PG temporales', 'temporales', state.temp, 'number', 'min="0" max="9999" required')}${field('Inspiraciones disponibles', 'inspiración', state.inspirationSpent === null ? '' : d.inspirationMax - state.inspirationSpent, 'number', `min="0" max="${d.inspirationMax}" required`)}${field('Dados de Golpe disponibles', 'dados', state.hdSpent === null ? '' : R.totalLevel(state) - state.hdSpent, 'number', `min="0" max="${R.totalLevel(state)}" required`)}${d.slots.map((max, i) => (max ? field('Espacios disponibles de nivel ' + (i + 1), 'slot' + i, state.slotsSpent[i] === null ? '' : max - state.slotsSpent[i], 'number', `min="0" max="${max}" required`) : '')).join('')}</div>`,
    fd => {
      const max = number(fd, 'máximo', 1, 2000),
        hp = number(fd, 'PG', 0, max);
      commit('Ajuste de recursos actuales', s => {
        s.hpBase = max - R.totalLevel(s) * d.mods.con;
        s.hp = hp;
        s.hpConfirmed = true;
        s.temp = number(fd, 'temporales', 0, 9999);
        s.inspirationSpent = d.inspirationMax - number(fd, 'inspiración', 0, d.inspirationMax);
        s.hdSpent = R.totalLevel(s) - number(fd, 'dados', 0, R.totalLevel(s));
        d.slots.forEach((n, i) => (s.slotsSpent[i] = n ? n - number(fd, 'slot' + i, 0, n) : 0));
      });
    },
  );
}
function editPool(type, index) {
  let max = poolMax(state, type, index),
    used = poolValue(state, type, index);
  modal(
    'Ajustar usos',
    field('Usos disponibles', 'usos', used === null ? '' : max - used, 'number', `min="0" max="${max}" required`),
    fd => commit('Ajuste de usos disponibles', s => setPool(s, type, index, max - number(fd, 'usos', 0, max))),
  );
}
function cast(id, ritual = false) {
  const sp = spellById(id);
  if (ritual && !sp?.ritual) throw Error('No es ritual.');
  const reason = Combat.spellBlock(state, sp, ritual);
  if (reason) throw Error(reason);
  const special = Combat.specialCast(state, sp);
  const d = R.stats(state),
    c = Combat.data(state),
    eligible = d.slots
      .map((max, i) => [i + 1, `Nivel ${i + 1} · ${max - state.slotsSpent[i]} disponibles`])
      .filter(([l]) => l >= sp.level && state.slotsSpent[l - 1] !== null && state.slotsSpent[l - 1] < d.slots[l - 1]);
  let html = `<p>${esc(sp.text || sp.brief)}</p><p class="small">Dados: 1d4 = un dado de 4 caras; 2d6 = dos dados de 6 caras. «Modificador de lanzamiento» en esta ficha: ${sign(d.mods[Classes.casting(state).ability])}. ${esc(sp.materialEs || '')}</p><p class="small">${sp.level ? 'Conjuro de nivel ' + sp.level : 'Truco · no gasta espacio'} · ${esc(sp.time)} · ${esc(sp.range)}<br>${esc(sp.components)} · ${esc(sp.duration)}${ritual ? ' · Ritual: añade 10 minutos al lanzamiento.' : ''}</p>`;
  if (sp.level && !ritual && !special) html += select('Espacio a gastar', 'espacio', eligible, eligible[0]?.[0]);
  if (special)
    html +=
      '<p class="tag">' +
      (special === 'free'
        ? 'Lanzamiento sin espacio autorizado por DM; controlá sus límites de uso.'
        : 'Gasta un uso de Arcanum; no gasta espacio de pacto.') +
      '</p>';
  if (sp.concentration || ritual)
    html += `<div class="banner"><p>${state.concentration ? 'Al iniciar, termina tu concentración en ' + esc(spellName(state.concentration)) + '.' : 'Requiere concentración.'}</p></div>`;
  if (Combat.kind(sp) === 'reaction' && !ritual)
    html +=
      '<label class="check"><input type="checkbox" name="válido" required>Se cumple el desencadenante de esta reacción y sus requisitos de alcance y objetivo.</label>';
  if (sp.id === 'silvery')
    html +=
      field('Quién recibe la ventaja (opcional)', 'ventaja', '', 'text', 'maxlength="100"') +
      '<p class="small">Otra criatura que veas a 60 pies, incluido vos. El enemigo repite el d20 exitoso y usa el menor: podría seguir teniendo éxito.</p>';
  if (!c.active)
    html +=
      '<p class="small">Fuera del seguimiento: se registran espacios, reacción y concentración. Activá «Mi turno» en Combate para controlar acción y adicional.</p>';
  modal(
    ritual ? 'Lanzamiento ritual' : sp.name,
    html,
    fd => {
      const slot = sp.level && !ritual && !special ? number(fd, 'espacio', sp.level, 9) : 0;
      commit((ritual ? 'Ritual: ' : 'Lanzado: ') + sp.name + (slot ? ' · espacio ' + slot : ''), s => {
        Combat.cast(s, sp, slot, ritual);
        const target = String(fd.get('ventaja') || '').trim();
        if (sp.id === 'silvery' && target) {
          const effects = Combat.data(s).effects;
          const old = effects.find(x => x.kind === 'advantage' && x.target.toLowerCase() === target.toLowerCase());
          if (old) old.target = target;
          else effects.push({ id: uid(), kind: 'advantage', target, value: 0 });
        }
      });
      toast(
        ritual
          ? 'Ritual iniciado. Controlá su tiempo en mesa.'
          : 'Lanzamiento registrado. Resolvé el efecto y las tiradas en mesa.',
      );
    },
    ritual ? 'Iniciar ritual' : 'Registrar lanzamiento',
  );
}
function spellManage() {
  const d = R.stats(state),
    list = R.allSpells(state).filter(
      x => x.level <= d.slots.length || state.known.includes(x.id) || state.extras.includes(x.id),
    );
  modal(
    'Corregir repertorio',
    `<p class="small">Para aprender al subir usá la guía. Acá podés corregir la ficha: ${d.known} conjuros conocidos (incluye Secretos mágicos) y ${d.cantrips} trucos normales. Extra DM no cuenta.</p><div class="catalog">${list.map(x => `<div class="list-row"><div><b>${esc(x.name)}</b><p>${x.level ? 'Nivel ' + x.level : 'Truco'} · ${esc(x.sourceKey || x.source)}</p></div><select class="control" style="max-width:150px" name="spell-${esc(x.id)}" aria-label="Estado de ${esc(x.name)}"><option value="no">No conocido</option><option value="known" ${state.known.includes(x.id) && !Progression.secret(state).includes(x.id) ? 'selected' : ''}>Conocido</option><option value="secret" ${Progression.secret(state).includes(x.id) ? 'selected' : ''}>Secreto mágico</option><option value="extra" ${state.extras.includes(x.id) ? 'selected' : ''}>Extra del DM</option></select></div>`).join('')}</div>`,
    fd => {
      let k = [],
        ex = [],
        sk = [];
      for (let sp of list) {
        let v = fd.get('spell-' + sp.id);
        if (v === 'known' || v === 'secret') k.push(sp.id);
        if (v === 'secret') sk.push(sp.id);
        if (v === 'extra') ex.push(sp.id);
        if (
          v === 'known' &&
          !state.known.includes(sp.id) &&
          (!Progression.bard(sp, Progression.config(state)) || !Progression.enabled(sp, Progression.config(state)))
        )
          throw Error(
            'Esa opción requiere otra fuente, la lista ampliada, Secretos mágicos o un regalo del DM. Habilitá fuentes en la guía.',
          );
      }
      const maxSecrets = 2 * [10, 14, 18].filter(n => state.level >= n).length;
      if (sk.length > maxSecrets) throw Error('Todavía no ganaste tantos Secretos mágicos.');
      let trial = { ...state, known: k, secretKnown: sk };
      if (Progression.spellCount(trial) > d.known || Progression.cantripCount(trial) > d.cantrips)
        throw Error('Superás el máximo de conjuros o trucos conocidos.');
      commit('Repertorio corregido', s => {
        s.known = k;
        s.extras = ex;
        s.secretKnown = sk;
        if (s.concentration && !k.includes(s.concentration) && !ex.includes(s.concentration)) s.concentration = null;
      });
    },
  );
}
function customSpell(id) {
  let source = id ? spellById(id) : null;
  let isCustom = source && state.customSpells.some(x => x.id === id);
  modal(
    source ? 'Editar referencia del conjuro' : 'Crear conjuro',
    `${source && !isCustom ? '<p class="small">Se creará una versión personal de esta referencia, conservando si lo tenías conocido o como extra.</p>' : ''}<div class="form-grid">${field('Nombre', 'nombre', source?.name || '', 'text', 'required maxlength="150"')}${field('Nivel (0 = truco)', 'nivel', source?.level ?? 1, 'number', 'min="0" max="9" required')}${select(
      'Tiempo',
      'tiempo',
      ['Acción', 'Adicional', 'Reacción', 'Especial'].map(x => [x, x]),
      source?.time || 'Acción',
    )}${field('Alcance', 'alcance', source?.range || '', 'text', 'required maxlength="100"')}${field('Componentes', 'componentes', source?.components || '', 'text', 'required maxlength="500"')}${field('Duración', 'duración', source?.duration || '', 'text', 'required maxlength="100"')}</div>${field('Fuente', 'fuente', source?.source || 'DM', 'text', 'maxlength="100" required')}${field('Resumen', 'resumen', source?.brief || '', 'text', 'maxlength="1000" required')}${area('Descripción completa', 'descripción', source?.text || '')}<label class="check"><input name="concentración" type="checkbox" ${source?.concentration ? 'checked' : ''}>Concentración</label><label class="check"><input name="ritual" type="checkbox" ${source?.ritual ? 'checked' : ''}>Ritual</label><label class="check"><input name="bardo" type="checkbox" ${source?.bard !== false ? 'checked' : ''}>Pertenece a mi lista de clase o fue autorizado como selección normal por el DM.</label>`,
    fd => {
      const newId = isCustom ? id : uid();
      let sp = {
        id: newId,
        name: String(fd.get('nombre')).trim(),
        level: number(fd, 'nivel', 0, 9),
        time: fd.get('tiempo'),
        range: fd.get('alcance'),
        components: fd.get('componentes'),
        duration: fd.get('duración'),
        source: fd.get('fuente'),
        brief: fd.get('resumen'),
        text: fd.get('descripción'),
        concentration: fd.has('concentración'),
        ritual: fd.has('ritual'),
        bard: fd.has('bardo'),
        classes: source
          ? source.classes || ClassData.spellClasses[source.id] || [Classes.id(state)]
          : fd.has('bardo')
            ? [Classes.id(state)]
            : [],
      };
      commit('Referencia de conjuro: ' + sp.name, s => {
        if (isCustom) s.customSpells[s.customSpells.findIndex(x => x.id === id)] = sp;
        else s.customSpells.push(sp);
        if (source && s.known.includes(id) && (sp.level !== source.level || sp.bard !== source.bard))
          throw Error('Para cambiar el nivel o la lista, quitá primero el conjuro del repertorio.');
        if (source && !isCustom) {
          s.known = s.known.map(x => (x === id ? newId : x));
          s.secretKnown = s.secretKnown.map(x => (x === id ? newId : x));
          s.extras = s.extras.map(x => (x === id ? newId : x));
          if (s.prepared) s.prepared = s.prepared.map(x => (x === id ? newId : x));
          if (s.spellModes?.[id]) {
            s.spellModes[newId] = s.spellModes[id];
            delete s.spellModes[id];
          }
          for (const k in s.arcanum || {}) if (s.arcanum[k] === id) s.arcanum[k] = newId;
          if (s.concentration === id) s.concentration = newId;
        }
      });
      toast(source ? 'Referencia guardada.' : 'Conjuro creado. Podés elegirlo en Gestionar conjuros.');
    },
  );
}
function rest() {
  modal(
    'Un respiro en el camino',
    `<p>Elegí el descanso que completaste.</p><div class="actions">${button('Descanso corto', 'short-rest', '')}${button('Descanso largo', 'long-rest', 'secondary')}</div><p class="small section-space">Corto: al menos una hora. Largo: al menos ocho horas y como máximo sus beneficios una vez por 24 horas. La ficha no avanza el tiempo por vos.</p>`,
  );
}
function shortRest() {
  const d = R.stats(state);
  if (state.hdSpent === null || state.hp === null) throw Error('Confirmá tus PG y Dados de Golpe en Ajustar recursos.');
  const avail = state.level - state.hdSpent;
  modal(
    'Descanso corto',
    `<p class="small">Disponibles: ${avail}d8. Anotá la suma de tus dados físicos o usá «Tirar dados». Canción de descanso se suma una sola vez si gastás al menos un dado.</p><div class="form-grid">${field('Dados de Golpe a gastar', 'dados', 0, 'number', `min="0" max="${avail}" required`)}${field('Suma de los d8 (sin CON)', 'tirada', 0, 'number', 'min="0" max="160" required')}${field('Resultado Canción de descanso', 'canción', 0, 'number', `min="0" max="${d.songDie}" required`)}</div>${button('Tirar dados seleccionados', 'short-roll')}<p class="small section-space">Cada d8 suma CON ${sign(d.mods.con)}. ${state.level >= 5 ? 'También recuperás Inspiración.' : 'No recuperás espacios ni Inspiración.'}</p>`,
    fd => {
      const n = number(fd, 'dados', 0, avail),
        sum = number(fd, 'tirada', n, n * 8),
        song = number(fd, 'canción', 0, n ? d.songDie : 0);
      const heal = n ? Math.max(0, sum + n * d.mods.con) + song : 0;
      commit(`Descanso corto: ${n} Dados de Golpe, +${heal} PG`, s => {
        s.hdSpent += n;
        s.hp = Math.min(d.maxHP, s.hp + heal);
        if (s.hp > 0) {
          s.death = { success: 0, failure: 0 };
          if (heal > 0) s.conditions = s.conditions.filter(x => x !== 'Inconsciente');
        }
        if (s.level >= 5) s.inspirationSpent = 0;
        s.extraResources.forEach(x => {
          if (x.reset === 'short') x.spent = 0;
        });
      });
    },
  );
}
function longRest() {
  if (state.hp === 0) throw Error('Para obtener los beneficios del descanso largo debés iniciarlo con al menos 1 PG.');
  let d = R.stats(state);
  modal(
    'Descanso largo completado',
    `<p>Recuperás todos tus PG, espacios y recursos de clase con recuperación por descanso. Recuperás hasta <b>${Math.max(1, Math.floor(R.totalLevel(state) / 2))} Dados de Golpe gastados</b>.</p>${state.hdSpent === null ? field('Dados de Golpe disponibles antes del descanso', 'dados', '', 'number', `min="0" max="${R.totalLevel(state)}" required`) : ''}<label class="check"><input name="completo" type="checkbox" required>Confirmo que completé un descanso válido y lo inicié con al menos 1 PG.</label><p class="small">Se limpian PG temporales y concentración. Las condiciones se conservan para que revises su duración.</p>`,
    fd =>
      commit('Descanso largo completado', s => {
        if (s.hdSpent === null) s.hdSpent = R.totalLevel(s) - number(fd, 'dados', 0, R.totalLevel(s));
        s.hdSpent = Math.max(0, s.hdSpent - Math.max(1, Math.floor(R.totalLevel(s) / 2)));
        s.hp = d.maxHP;
        s.temp = 0;
        s.inspirationSpent = 0;
        s.slotsSpent = Array(9).fill(0);
        s.reactionUsed = false;
        s.concentration = null;
        s.combatState = Combat.fresh();
        Classes.reset(s, 'long');
        s.death = { success: 0, failure: 0 };
        s.universalSpent = 0;
        s.infectiousSpent = 0;
        s.extraResources.forEach(x => {
          if (x.reset !== 'manual') x.spent = 0;
        });
      }),
    'Aplicar descanso',
  );
}
function itemEdit(id) {
  const x = state.inventory.find(x => x.id === id);
  modal(
    x ? 'Editar objeto' : 'Añadir objeto',
    `${field('Nombre', 'nombre', x?.name || '', 'text', 'required maxlength="200"')}<div class="form-grid">${field('Cantidad', 'cantidad', x?.qty ?? 1, 'number', 'min="0" max="999999" required')}${select(
      'Categoría',
      'categoría',
      ['Equipo', 'Armas', 'Armaduras', 'Paquete', 'Consumibles', 'Transporte', 'Tesoro', 'Otro'].map(x => [x, x]),
      x?.category || 'Equipo',
    )}${field('Peso unitario (lb, opcional)', 'peso', x?.weight ?? '', 'number', 'min="0" max="999999" step="0.01"')}${field('Ubicación', 'ubicación', x?.location || 'Sin asignar', 'text', 'maxlength="200"')}</div>${EquipmentUI.itemFields(x)}${area('Descripción / propiedades', 'notas', x?.notes || '')}${x ? button('Eliminar objeto', 'item-delete', 'danger', `data-id="${esc(x.id)}"`) : ''}`,
    fd => {
      const obj = {
        ...x,
        id: x?.id || uid(),
        name: String(fd.get('nombre')).trim(),
        qty: number(fd, 'cantidad', 0, 999999),
        category: fd.get('categoría'),
        notes: fd.get('notas'),
        location: fd.get('ubicación'),
        weight: fd.get('peso') === '' ? null : Number(fd.get('peso')),
      };
      if (fd.get('equipmentId')) obj.equipmentId = String(fd.get('equipmentId'));
      if (!obj.name) throw Error('Escribí un nombre.');
      commit((x ? 'Editado: ' : 'Añadido: ') + obj.name, s => {
        if (x) s.inventory[s.inventory.findIndex(a => a.id === x.id)] = obj;
        else s.inventory.push(obj);
      });
    },
  );
}
function goldEdit() {
  modal(
    'Saldo de monedas',
    `<p class="small">pc cobre · pp plata · pe electro · po oro · ppt platino.</p><div class="form-grid">${[
      ['cp', 'Cobre'],
      ['sp', 'Plata'],
      ['ep', 'Electro'],
      ['gp', 'Oro'],
      ['pp', 'Platino'],
    ]
      .map(([k, l]) => field(l, k, state.gold[k], 'number', 'min="0" max="99999999" required'))
      .join('')}</div>`,
    fd =>
      commit('Saldo de monedas confirmado', s => {
        for (let k in s.gold) s.gold[k] = number(fd, k, 0, 99999999);
        s.goldConfirmed = true;
      }),
  );
}
function transaction() {
  modal(
    'Ingreso o gasto',
    `<div class="form-grid">${select(
      'Movimiento',
      'tipo',
      [
        ['income', 'Ingreso'],
        ['expense', 'Gasto'],
      ],
      'expense',
    )}${field('Cantidad', 'cantidad', '', 'number', 'min="0.01" max="999999" step="0.01" required')}${select(
      'Moneda',
      'moneda',
      [
        ['1', 'Cobre'],
        ['10', 'Plata'],
        ['50', 'Electro'],
        ['100', 'Oro'],
        ['1000', 'Platino'],
      ],
      '100',
    )}</div>${field('Motivo', 'motivo', '', 'text', 'required maxlength="200"')}<p class="small">Se convierte el saldo total a su equivalente en oro, plata y cobre al registrar el movimiento.</p>`,
    fd => {
      let value = Number(fd.get('cantidad')) * Number(fd.get('moneda'));
      if (!Number.isFinite(value) || value <= 0 || Math.abs(value - Math.round(value)) > 0.00001)
        throw Error('El importe debe equivaler a una cantidad entera de cobre.');
      value = Math.round(value);
      const total =
        state.gold.cp + 10 * state.gold.sp + 50 * state.gold.ep + 100 * state.gold.gp + 1000 * state.gold.pp;
      const next = total + (fd.get('tipo') === 'income' ? value : -value);
      if (next < 0) throw Error('No alcanza el saldo.');
      commit(
        `${fd.get('tipo') === 'income' ? 'Ingreso' : 'Gasto'}: ${fd.get('cantidad')} ${fd.get('moneda') === '100' ? 'po' : '(moneda elegida)'} · ${fd.get('motivo')}`,
        s => {
          s.gold = { pp: 0, ep: 0, gp: Math.floor(next / 100), sp: Math.floor((next % 100) / 10), cp: next % 10 };
          s.goldConfirmed = true;
        },
      );
    },
  );
}
function editStats() {
  let d = R.stats(state);
  modal(
    'Características y armadura',
    `<div class="form-grid">${Object.entries(R.attrs)
      .map(([k, l]) => field(l, k, state.abilities[k], 'number', 'min="1" max="30" required'))
      .join(
        '',
      )}${field('Base de CA (sin DES)', 'base', state.acBase, 'number', 'min="0" max="40" required')}${field('Otros bonos de CA', 'bonus', state.acBonus, 'number', 'min="-20" max="30" required')}</div><p class="small">Los cambios de CON ajustan los PG máximos retroactivamente (${state.level} niveles). Conservamos tus PG actuales, limitados al nuevo máximo. La armadura se calcula como base + DES + otros bonos; para armaduras con límite de DES, ajustá el bono manualmente.</p>`,
    fd =>
      commit('Características actualizadas', s => {
        for (let k in R.attrs) s.abilities[k] = number(fd, k, 1, 30);
        s.acBase = number(fd, 'base', 0, 40);
        s.acBonus = number(fd, 'bonus', -20, 30);
        const next = R.stats(s);
        if (s.hp !== null) s.hp = Math.min(s.hp, next.maxHP);
        if (s.inspirationSpent !== null) s.inspirationSpent = Math.min(s.inspirationSpent, next.inspirationMax);
        s.infectiousSpent = Math.min(s.infectiousSpent, next.inspirationMax);
      }),
  );
}
function levelup() {
  PartyUI.levelup();
}
function character() {
  return PartyUI.character();
}
function spellPage() {
  return PartyUI.spells();
}
function settings() {
  modal(
    'Mi ficha',
    `${field('Nombre', 'nombre', state.name, 'text', 'required maxlength="100"')}<div class="actions">${button('Ajustar recursos', 'resources')}${button('Características', 'stats')}${button('Foto del personaje', 'portrait-edit')}${button('Recurso personalizado', 'resource-new')}</div><div class="divider"></div><h3>Copias y dispositivos</h3><p class="small">Cada navegador guarda su propia ficha. Exportá un archivo JSON e importalo en el otro dispositivo. Borrar datos del navegador también borra la ficha local. No hay sincronización automática ni cuentas.</p><div class="actions">${button('Exportar JSON', 'backup', '')}${button('Importar JSON', 'import')}${button('Recuperar copia anterior', 'recover')}${rawBroken ? button('Descargar datos no legibles', 'raw-backup') : ''}</div><div class="divider"></div><p class="small">El nivel actual es ${state.level}. Los PG máximos ${state.hpConfirmed ? 'fueron confirmados' : 'están sugeridos con aumento fijo'}. Para impresiones, usá la versión PDF de tu ficha o la función del navegador.</p>${button('Reiniciar ficha', 'reset', 'danger')}`,
    fd => commit('Nombre actualizado', s => (s.name = String(fd.get('nombre')).trim())),
  );
}
function sources() {
  modal(
    'Reglas y créditos',
    `<p>Ficha para <b>D&D 5e 2014</b>. Las reglas de mesa del DM prevalecen sobre la referencia. Los cálculos automáticos cubren las 13 clases sin multiclase; las dotes, objetos y otras excepciones se registran y ajustan manualmente.</p><p><a href="https://media.wizards.com/2023/downloads/dnd/SRD_CC_v5.1.pdf" target="_blank" rel="noopener">SRD 5.1</a> · <a href="https://www.dndbeyond.com/posts/1371-silvery-barbs-snatch-a-victory-from-the-jaws-of" target="_blank" rel="noopener">Silvery Barbs</a></p><p class="small">Colegio de la Elocuencia: Tasha’s Cauldron of Everything. Comerciante gremial: Manual del Jugador 2014. Referencias resumidas para uso de mesa; el catálogo incluye referencias de la línea 2014. Las fuentes y reglas opcionales se habilitan con el DM. Los conjuros incluyen resúmenes de uso en español; las excepciones y tablas se consultan en su fuente.</p><p class="small">This work includes material taken from the System Reference Document 5.1 (“SRD 5.1”) by Wizards of the Coast LLC and available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License available at https://creativecommons.org/licenses/by/4.0/legalcode.</p><p class="small">Ilustraciones creadas para Darien y su compañera. Esta aplicación no envía tus datos a servicios externos.</p>`,
  );
}
const actions = {
  'toast-dismiss': hideToast,
  settings: settings,
  resources: editResources,
  stats: editStats,
  rest: rest,
  'short-rest': shortRest,
  'long-rest': longRest,
  levelup: levelup,
  'spell-manage': () => PartyUI.manageSpells(),
  'spell-catalog': () => Learning.catalog(),
  'learning-config': () => Learning.configure(),
  'spell-new': () => customSpell(),
  'spell-edit': e => customSpell(e.dataset.id),
  cast: e => cast(e.dataset.id),
  ritual: e => cast(e.dataset.id, true),
  sources: sources,
  backup: () => {
    const name =
      state.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, '-')
        .replace(/^-+|-+$/g, '') || 'personaje';

    download(name + '-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify(state, null, 2));
    toast('Copia exportada.');
  },
  'raw-backup': () => download('ficha-datos-por-recuperar.txt', rawBroken || '', 'text/plain'),
  undo: () => {
    if (!history.length) throw Error('No hay cambios para deshacer en esta sesión.');
    let previous = history.pop(),
      before = clone(state);
    state = previous;
    persist(before);
    render();
    toast('Último cambio deshecho.');
  },
  import: () => $('#import-file').click(),
  recover: () => {
    let raw = localStorage.getItem(BACKUP);
    if (!raw) throw Error('No hay una copia anterior.');
    const imported = R.validate(JSON.parse(raw));
    confirmAction(
      'Recuperar copia anterior',
      'Se reemplaza la ficha abierta. Podés exportarla antes de continuar.',
      () => {
        const before = clone(state);
        history.push(before);
        state = imported;
        rawBroken = null;
        persist(before);
        render();
        toast('Copia anterior recuperada.');
      },
    );
  },
  reset: () =>
    confirmAction(
      'Reiniciar ficha',
      'Volverá a Darien nivel 2 y sus objetos iniciales. Exportá tu ficha si querés conservarla.',
      () => {
        const before = clone(state);
        history.push(before);
        state = R.initial();
        rawBroken = null;
        persist(before);
        render();
      },
      'Reiniciar',
    ),
  damage: () => {
    if (state.hp === null) throw Error('Confirmá primero tus PG actuales.');
    const n = Number($('#hp-amount').value);
    if (!Number.isInteger(n) || n < 1 || n > 9999) throw Error('Usá una cantidad de daño válida.');
    const conc = state.concentration;
    commit('Daño recibido: ' + n, s => {
      const absorbed = Math.min(s.temp, n);
      s.temp -= absorbed;
      s.hp = Math.max(0, s.hp - (n - absorbed));
      if (s.hp === 0) {
        s.concentration = null;
        Combat.data(s).checks = [];
        if (!s.conditions.includes('Inconsciente')) s.conditions.push('Inconsciente');
        if (!s.conditions.includes('Derribado')) s.conditions.push('Derribado');
      } else if (conc) Combat.data(s).checks.push(Math.max(10, Math.floor(n / 2)));
    });
    $('#modal').close();
    toast(
      conc && state.hp > 0
        ? 'Daño registrado. Resolvé la salvación de concentración en «En curso».'
        : 'Daño registrado. Si estabas a 0 PG, ajustá las salvaciones de muerte según el impacto.',
    );
  },
  heal: () => {
    if (state.hp === null) throw Error('Confirmá primero tus PG actuales.');
    let n = Number($('#hp-amount').value);
    if (!Number.isInteger(n) || n < 1 || n > 9999) throw Error('Usá una cantidad de curación válida.');
    commit('Curación: ' + n, s => {
      s.hp = Math.min(R.stats(s).maxHP, s.hp + n);
      if (s.hp > 0) {
        s.death = { success: 0, failure: 0 };
        s.conditions = s.conditions.filter(x => x !== 'Inconsciente');
      }
    });
    $('#modal').close();
    toast('Curación registrada.');
  },
  temp: () =>
    modal(
      'PG temporales',
      field('Nuevo valor', 'temporales', state.temp, 'number', 'min="0" max="9999" required') +
        '<p class="small">No se suman con otros PG temporales: elegí qué valor conservar.</p>',
      fd => commit('PG temporales ajustados', s => (s.temp = number(fd, 'temporales', 0, 9999))),
    ),
  pip: e => {
    let t = e.dataset.type,
      i = t === 'slot' ? Number(e.dataset.index) : e.dataset.index,
      u = poolValue(state, t, i),
      max = poolMax(state, t, i);
    if (u === null) return editPool(t, i);
    let next = u + (Number(e.dataset.pip) < u ? -1 : 1);
    commit(
      'Uso ' +
        (next > u ? 'gastado' : 'recuperado') +
        ': ' +
        (t === 'slot'
          ? 'espacio Nv. ' + (i + 1)
          : t === 'inspiration'
            ? 'Inspiración'
            : t === 'hd'
              ? 'Dado de Golpe'
              : t),
      s => setPool(s, t, i, Math.max(0, Math.min(max, next))),
    );
  },
  'pool-edit': e => editPool(e.dataset.type, e.dataset.type === 'slot' ? Number(e.dataset.index) : e.dataset.index),
  reaction: () =>
    commit('Reacción ' + (state.reactionUsed ? 'recuperada' : 'gastada'), s => (s.reactionUsed = !s.reactionUsed)),
  turn: () => {
    commit('Inicio de mi turno: reacción disponible', s => (s.reactionUsed = false));
    toast('Reacción recuperada.');
  },
  'concentration-end': () =>
    commit('Concentración terminada', s => {
      s.concentration = null;
      Combat.data(s).checks = [];
    }),
  condition: e => {
    let c = e.dataset.condition;
    commit((state.conditions.includes(c) ? 'Quitada: ' : 'Añadida: ') + c, s => {
      s.conditions = s.conditions.includes(c) ? s.conditions.filter(x => x !== c) : [...s.conditions, c];
      if (
        ['Incapacitado', 'Inconsciente', 'Paralizado', 'Aturdido', 'Petrificado'].includes(c) &&
        s.conditions.includes(c)
      ) {
        s.concentration = null;
        Combat.data(s).checks = [];
      }
    });
  },
  death: e =>
    commit('Salvación de muerte registrada', s => {
      let k = e.dataset.kind;
      s.death[k] = (s.death[k] + 1) % 4;
    }),
  'death-reset': () => commit('Salvaciones de muerte reiniciadas', s => (s.death = { success: 0, failure: 0 })),
  roll: e => {
    if (
      e.dataset.label === 'Iniciativa' &&
      state.level >= 20 &&
      state.inspirationSpent === R.stats(state).inspirationMax
    )
      commit('Inspiración superior: recuperada una Inspiración al tirar iniciativa', s => s.inspirationSpent--);
    let b = Number(e.dataset.bonus),
      n = roll(20)[0];
    commit(`${e.dataset.label}: d20 ${n} ${sign(b)} = ${n + b}`, () => {});
    TableUI.shareRoll({ label: e.dataset.label, rolls: [n], bonus: b, total: n + b });
    toast(`${e.dataset.label}: ${n} ${sign(b)} = ${n + b}`);
  },
  'skill-roll': e => {
    let id = e.dataset.id,
      n = roll(20)[0],
      used =
        state.level >= 3 && state.subclass === 'eloquence' && ['persuasion', 'deception'].includes(id)
          ? Math.max(10, n)
          : n,
      b = R.skillBonus(state, id),
      name = R.skills.find(x => x[0] === id)[1];
    commit(`${name}: d20 ${n}${n !== used ? ' → 10 (Lengua de plata)' : ''} ${sign(b)} = ${used + b}`, () => {});
    toast(`${name}: ${n !== used ? n + ' → ' + used : used} ${sign(b)} = ${used + b}`);
    TableUI.shareRoll({ label: name, rolls: [used], bonus: b, total: used + b });
  },
  dice: () =>
    modal(
      'Tirada de dados',
      `<div class="form-grid">${field('Cantidad', 'cantidad', 1, 'number', 'min="1" max="30" required')}${select(
        'Dado',
        'dado',
        [4, 6, 8, 10, 12, 20, 100].map(x => [x, 'd' + x]),
        20,
      )}${field('Modificador', 'modificador', 0, 'number', 'min="-100" max="100" required')}</div>${Cloud.link(KEY) ? '<label class="check"><input type="checkbox" name="secreta">Solo para el DM</label>' : ''}`,
      fd => {
        let a = roll(number(fd, 'dado', 4, 100), number(fd, 'cantidad', 1, 30)),
          b = number(fd, 'modificador', -100, 100),
          sum = a.reduce((x, y) => x + y, 0) + b;
        commit('Dados: ' + a.join(', ') + ' ' + sign(b) + ' = ' + sum, () => {});
        TableUI.shareRoll(
          { label: a.length + 'd' + number(fd, 'dado', 4, 100), rolls: a, bonus: b, total: sum },
          fd.has('secreta') ? 'dm' : 'all',
        );
        toast('Resultado: ' + sum + ' (' + a.join(', ') + ' ' + sign(b) + ')');
      },
      'Tirar',
    ),
  'spell-open': e => {
    location.hash = 'spells';
    setTimeout(() => {
      let el = document.getElementById('spell-' + e.dataset.id);
      if (el) {
        el.open = true;
        el.scrollIntoView({ block: 'center' });
      }
    }, 20);
  },
  'item-new': () => itemEdit(),
  'item-edit': e => itemEdit(e.dataset.id),
  'item-delete': e =>
    confirmAction(
      'Eliminar objeto',
      'Se quitará esta entrada del inventario.',
      () => commit('Objeto eliminado', s => (s.inventory = s.inventory.filter(x => x.id !== e.dataset.id))),
      'Eliminar',
    ),
  qty: e =>
    commit('Cantidad de ' + state.inventory.find(x => x.id === e.dataset.id).name + ' modificada', s => {
      let x = s.inventory.find(x => x.id === e.dataset.id);
      x.qty = Math.max(0, Math.min(999999, x.qty + Number(e.dataset.delta)));
    }),
  'gold-edit': goldEdit,
  'gold-transaction': transaction,
  mule: () =>
    modal(
      'Tu mula',
      `${field('Nombre', 'nombre', state.mule.name, 'text', 'maxlength="100" required')}<div class="form-grid">${field('PG máximos', 'máximo', state.mule.max, 'number', 'min="1" max="9999" required')}${field('PG actuales', 'PG', state.mule.hp ?? '', 'number', 'min="0" max="9999" required')}</div>${area('Notas', 'notas', state.mule.notes)}`,
      fd =>
        commit('Mula actualizada', s => {
          let max = number(fd, 'máximo', 1, 9999);
          s.mule = { name: fd.get('nombre'), max, hp: number(fd, 'PG', 0, max), notes: fd.get('notas') };
        }),
    ),
  'notes-save': () => {
    const txt = $('#journal-notes').value;
    commit('Notas de sesión guardadas', s => (s.notes = txt));
    toast('Notas guardadas.');
  },
  companion: () =>
    modal(
      'Compañeros y mascotas',
      `${field('Nombre', 'nombre', state.companion.name, 'text', 'maxlength="100"')}${area('Descripción y notas', 'notas', state.companion.notes)}`,
      fd => commit('Compañeros actualizados', s => (s.companion = { name: fd.get('nombre'), notes: fd.get('notas') })),
    ),
  'feature-new': () =>
    modal(
      'Rasgo personalizado',
      `${field('Nombre', 'nombre', '', 'text', 'maxlength="150" required')}${area('Qué hace y cómo se usa', 'texto', '')}`,
      fd => commit('Rasgo añadido', s => s.features.push({ name: fd.get('nombre'), text: fd.get('texto') })),
    ),
  'feature-manage': () =>
    modal(
      'Rasgos personalizados',
      state.features
        .map(
          (x, i) =>
            `<div class="feature">${field('Nombre', 'name' + i, x.name, 'text', 'required maxlength="150"')}${area('Descripción', 'text' + i, x.text)}</div>`,
        )
        .join(''),
      fd =>
        commit(
          'Rasgos personalizados actualizados',
          s => (s.features = s.features.map((x, i) => ({ name: fd.get('name' + i), text: fd.get('text' + i) }))),
        ),
    ),
  'resource-new': () =>
    modal(
      'Recurso personalizado',
      `${field('Nombre', 'nombre', '', 'text', 'required maxlength="100"')}${field('Usos máximos', 'máximo', 1, 'number', 'min="1" max="30" required')}${select(
        'Recuperación',
        'recuperación',
        [
          ['short', 'Descanso corto o largo'],
          ['long', 'Descanso largo'],
          ['manual', 'Manual'],
        ],
        'long',
      )}`,
      fd =>
        commit('Recurso personalizado añadido', s =>
          s.extraResources.push({
            id: uid(),
            name: fd.get('nombre'),
            max: number(fd, 'máximo', 1, 30),
            spent: 0,
            reset: fd.get('recuperación'),
          }),
        ),
    ),
  'short-roll': () => {
    let form = $('#dialog-form'),
      n = Number(form.elements.namedItem('dados').value);
    if (!Number.isInteger(n) || n < 0 || n > state.level - state.hdSpent) throw Error('Cantidad de dados no válida.');
    const a = roll(8, n),
      b = n && state.level >= 2 ? roll(R.stats(state).songDie)[0] : 0;
    form.elements.namedItem('tirada').value = a.reduce((x, y) => x + y, 0);
    form.elements.namedItem('canción').value = b;
    toast('d8: ' + (a.join(', ') || 'ninguno') + ' · Canción: ' + b);
  },
};
installCombatActions();
PartyUI.install();
Campaign.install();
EquipmentUI.install();
TableUI.install();
AttackUI.install();
MulticlassUI.install();
document.addEventListener('click', e => {
  if (e.target.closest('[data-close]')) {
    $('#modal').close();
    return;
  }
  const el = e.target.closest('[data-action]');
  if (!el) return;
  try {
    if (
      !state &&
      ![
        'party',
        'party-create',
        'party-array',
        'party-create-back',
        'party-import',
        'party-open',
        'toast-dismiss',
        'sources',
        'raw-backup',
      ].includes(el.dataset.action)
    )
      throw Error('Creá o importá un personaje primero.');
    actions[el.dataset.action]?.(el);
  } catch (err) {
    toast(err.message);
  }
});
document.addEventListener('input', e => {
  if (e.target.id === 'spell-search') {
    let pos = e.target.selectionStart;
    query = e.target.value;
    render();
    $('#spell-search').focus();
    $('#spell-search').setSelectionRange(pos, pos);
  }
});
document.addEventListener('change', e => {
  if (e.target.id === 'spell-filter') {
    filter = e.target.value;
    render();
  }
});
$('#import-file').addEventListener('change', async e => {
  let file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    if (file.size > 2 * 1024 * 1024) throw Error('La copia debe pesar menos de 2 MB.');
    const next = R.validate(JSON.parse(await file.text()));
    confirmAction(
      'Importar ficha',
      `Vas a abrir ${next.name}, nivel ${next.level}. Reemplazará la ficha de este navegador; exportá una copia si querés conservarla.`,
      () => {
        const before = clone(state);
        history.push(before);
        state = next;
        rawBroken = null;
        persist(before);
        render();
        toast('Ficha importada.');
      },
      'Importar',
    );
  } catch (err) {
    toast('No se importó: ' + err.message);
  }
});
window.addEventListener('hashchange', go);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) hideToast();
});
window.addEventListener('pageshow', hideToast);
window.addEventListener('storage', e => {
  if (e.key === KEY && e.newValue) {
    try {
      state = R.validate(JSON.parse(e.newValue));
      history = [];
      render();
      toast('Ficha actualizada desde otra pestaña.');
    } catch {
      toast('No se pudo leer el cambio de otra pestaña. Exportá tu ficha.');
    }
  }
});
go();
TableUI.boot();
if ('serviceWorker' in navigator && location.protocol !== 'file:')
  navigator.serviceWorker.register('./sw.js').catch(() => {});
try {
  if (document.modelContext?.registerTool)
    document.modelContext.registerTool({
      name: 'read_character_sheet',
      description: 'Read the active character sheet and remaining resources without changing it.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: () =>
        state
          ? {
              name: state.name,
              level: state.level,
              stats: R.stats(state),
              hp: state.hp,
              slotsSpent: state.slotsSpent,
              inspirationSpent: state.inspirationSpent,
              known: state.known.map(spellName),
              extras: state.extras.map(spellName),
            }
          : { needsCharacter: true },
    });
} catch {}
