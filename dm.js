/* Pantalla del DM: crea la mesa, sigue a la party en vivo y envía órdenes que cada ficha aplica. */
'use strict';
const PV = PartyView,
  esc = PV.esc;
const $ = s => document.querySelector(s);
const CONDITIONS = [
  'Derribado',
  'Asustado',
  'Hechizado',
  'Envenenado',
  'Incapacitado',
  'Inconsciente',
  'Agarrado',
  'Restringido',
  'Cegado',
  'Ensordecido',
  'Paralizado',
  'Aturdido',
  'Invisible',
  'Petrificado',
];
let current = null, // id de la mesa abierta
  party = null,
  feed = [],
  error = '',
  unsubscribe = null,
  online = [],
  publishTimer,
  toastTimer;

// ---------- Utilidades de interfaz ----------
function toast(msg) {
  const el = $('#toast');
  clearTimeout(toastTimer);
  el.textContent = msg;
  el.hidden = false;
  el.classList.add('visible');
  toastTimer = setTimeout(() => {
    el.classList.remove('visible');
    el.hidden = true;
  }, 4200);
}
const field = (label, name, value = '', type = 'text', extra = '') =>
  `<label class="field">${label}<input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`;
const select = (label, name, options, value = '') =>
  `<label class="field">${label}<select name="${name}">${options.map(([v, t]) => `<option value="${esc(v)}" ${String(v) === String(value) ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`;
const button = (label, action, classes = 'secondary', data = '') =>
  `<button type="button" class="button ${classes}" data-action="${action}" ${data}>${label}</button>`;
function modal(title, html, submit, saveLabel = 'Enviar') {
  const d = $('#modal');
  if (d.open) d.close();
  $('#modal-content').innerHTML =
    `<div class="modal-head"><h2 id="dialog-title">${esc(title)}</h2><button type="button" class="icon-btn" data-close aria-label="Cerrar">×</button></div><form id="dialog-form"><div class="modal-body">${html}<p class="form-error" id="form-error" role="alert"></p><div class="modal-actions"><button type="button" class="button secondary" data-close>Cancelar</button><button class="button" type="submit">${esc(saveLabel)}</button></div></div></form>`;
  $('#dialog-form').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.currentTarget.querySelector('button[type=submit]');
    btn.disabled = true;
    try {
      if ((await submit(new FormData(e.currentTarget))) !== false) d.close();
    } catch (err) {
      $('#form-error').textContent = err.message;
    }
    btn.disabled = false;
  });
  d.showModal();
}
function int(fd, key, min, max, def) {
  const raw = fd.get(key);
  if ((raw === null || raw === '') && def !== undefined) return def;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < min || n > max) throw Error(`Revisá «${key}»: usá un entero entre ${min} y ${max}.`);
  return n;
}
const d20 = () => {
  const a = new Uint32Array(1);
  let x;
  do x = crypto.getRandomValues(a)[0];
  while (x >= 4294967280);
  return (x % 20) + 1;
};
const sign = n => (n >= 0 ? '+' : '') + n;

// ---------- Ajustes de la mesa ----------
function settingsFields(st = Cloud.cleanSettings({})) {
  return `<fieldset class="campaign-sources"><legend>Libros habilitados para crear y subir personajes</legend><div class="source-grid">${Object.entries(
    CampaignData.sources,
  )
    .map(
      ([id, n]) =>
        `<label class="check"><input type="checkbox" name="source" value="${id}" ${st.sources.includes(id) ? 'checked' : ''} ${id === 'PHB' ? 'disabled' : ''}>${esc(n)}</label>`,
    )
    .join(
      '',
    )}</div><p class="small">El Manual del Jugador siempre queda habilitado. Los jugadores ven razas, trasfondos y opciones de estos libros.</p></fieldset><div class="form-grid">${field('Nivel inicial de los personajes', 'startLevel', st.startLevel, 'number', 'min="1" max="20" required')}</div><label class="field">Reglas de la casa (opcional)<textarea name="rules" maxlength="2000" placeholder="Puntos de golpe máximos en nivel 1, sin dotes, compra de puntos…">${esc(st.rules)}</textarea></label>`;
}
const readSettings = fd => ({
  sources: ['PHB', ...fd.getAll('source')],
  startLevel: Number(fd.get('startLevel')),
  rules: String(fd.get('rules') || '').trim(),
});
function settingsSummary(st) {
  const books =
    st.sources.length === Object.keys(CampaignData.sources).length ? 'todos los libros' : st.sources.join(', ');
  return `Libros: ${esc(books)} · Nivel inicial ${st.startLevel}${st.rules ? ' · Reglas de la casa' : ''}`;
}

// ---------- Iniciativa (se guarda solo en este dispositivo) ----------
const initKey = () => 'dnd-dm-initiative-' + current;
function tracker() {
  try {
    const t = JSON.parse(localStorage.getItem(initKey()) || 'null');
    if (t && Array.isArray(t.entries)) return t;
  } catch {}
  return { entries: [], turn: -1, round: 0 };
}
function saveTracker(t) {
  t.entries.sort((a, b) => (b.init ?? -99) - (a.init ?? -99) || (b.dex ?? 0) - (a.dex ?? 0));
  localStorage.setItem(initKey(), JSON.stringify(t));
  publishOrder();
}
// Los jugadores ven el orden de iniciativa (sin PG ni CA de las criaturas).
function publishOrder() {
  clearTimeout(publishTimer);
  const id = current;
  publishTimer = setTimeout(() => {
    if (id !== current) return;
    const t = tracker();
    send('initiative', {
      round: t.round,
      turn: t.turn,
      entries: t.entries.map(e => ({ name: e.name, init: e.init, characterId: e.characterId || null })),
    }).catch(() => {});
  }, 800);
}
const notesKey = () => 'dnd-dm-notes-' + current;

// ---------- Datos ----------
const characterById = id => party?.characters.find(c => c.id === id);
const summaries = () => (party?.characters || []).map(c => ({ row: c, x: PV.summarize(c.data) }));
async function send(kind, payload, target = null, visibility = 'all') {
  const ev = await Cloud.post(current, kind, payload, { target, visibility });
  feed = [ev, ...feed.filter(x => x.id !== ev.id)];
  draw();
  return ev;
}

async function open(id) {
  current = id;
  party = null;
  feed = [];
  error = '';
  localStorage.setItem('dnd-dm-last', id);
  if (location.hash !== '#' + id) history.replaceState(null, '', '#' + id);
  draw();
  unsubscribe?.();
  try {
    [party, feed] = await Promise.all([Cloud.party(id), Cloud.events(id, 100)]);
    if (party.campaign.dm_id !== (await Cloud.user()).id) throw Error('Esta mesa la dirige otra cuenta.');
    Cloud.rememberDmTable(party.campaign);
    unsubscribe = await Cloud.subscribe(id, onChange, { role: 'dm' });
  } catch (e) {
    error = e.message;
  }
  draw();
}
async function refresh() {
  try {
    [party, feed] = await Promise.all([Cloud.party(current), Cloud.events(current, 100)]);
    error = '';
  } catch (e) {
    error = e.message;
  }
  draw();
}
function onChange(table, payload) {
  if (table === 'presence') {
    online = payload;
    draw();
    return;
  }
  if (table === 'characters' && party) {
    if (payload.eventType === 'DELETE') party.characters = party.characters.filter(c => c.id !== payload.old.id);
    else {
      const row = payload.new;
      party.characters = [...party.characters.filter(c => c.id !== row.id), row].sort((a, b) =>
        a.name.localeCompare(b.name, 'es'),
      );
    }
    draw();
  } else if (table === 'events' && payload.eventType === 'INSERT') {
    const ev = payload.new;
    feed = [ev, ...feed.filter(x => x.id !== ev.id)].slice(0, 200);
    // Las respuestas de iniciativa completan el orden automáticamente.
    if (ev.kind === 'roll-response') {
      const req = feed.find(x => x.id === ev.payload.requestId);
      if (req?.payload.type === 'initiative') {
        const t = tracker(),
          e = t.entries.find(x => x.characterId === ev.payload.characterId);
        if (e) {
          e.init = ev.payload.total;
          saveTracker(t);
        }
      }
      toast(`${ev.payload.character}: ${ev.payload.label} ${ev.payload.total}`);
    }
    draw();
  } else refresh();
}

// ---------- Vistas ----------
function draw() {
  $('#breadcrumb').textContent = party?.campaign.name || 'Tus mesas';
  document.title = (party ? party.campaign.name + ' · ' : '') + 'Pantalla del DM';
  if (!Cloud.enabled) {
    $('#main').innerHTML =
      `<section class="card"><h1>Mesa compartida no configurada</h1><p>Para usar la pantalla del DM, quien publica la aplicación tiene que completar <code>config.js</code> con un proyecto de Supabase. Los pasos están en el README, sección «Mesa compartida».</p></section>`;
    return;
  }
  if (!current) return drawHome();
  if (!party)
    return ($('#main').innerHTML =
      `<section class="card"><p>${error ? esc(error) : 'Cargando la mesa…'}</p>${error ? button('Volver a mis mesas', 'home') : ''}</section>`);
  const list = summaries();
  const t = tracker();
  $('#main').innerHTML =
    `<div class="heading"><div><p class="eyebrow">MESA EN VIVO</p><h1>${esc(party.campaign.name)}</h1><p>Código para unirse: <b class="table-code">${esc(party.campaign.code)}</b> · ${list.length} ficha${list.length === 1 ? '' : 's'}</p><p class="small">${settingsSummary(Cloud.cleanSettings(party.campaign.settings))}</p></div><div class="actions">${button('Pedir tirada a todos', 'request')}${button('Descanso corto', 'rest-short')}${button('Descanso largo', 'rest-long')}${button('Mensaje a todos', 'message')}${button('Ajustes de la mesa', 'settings')}${button('Mis mesas', 'home')}${button('Eliminar mesa', 'delete-table', 'danger', `data-id="${esc(party.campaign.id)}" data-name="${esc(party.campaign.name)}"`)}</div></div>
  ${error ? `<div class="banner"><p>${esc(error)}</p>${button('Reintentar', 'refresh')}</div>` : ''}
  <div class="dm-layout"><div class="stack">
    <div class="party-grid">${
      list.length
        ? list
            .map(({ row, x }) =>
              PV.card(x, {
                owner: party.members.find(m => m.user_id === row.owner_id)?.display_name,
                online: online.some(p => p.characterId === row.id),
                actions: `<div class="party-actions">${button('PG', 'hp', 'secondary', `data-id="${row.id}"`)}${button('Estados', 'conditions', 'secondary', `data-id="${row.id}"`)}${button(x.heroic ? '★ Quitar Insp.' : '★ Inspiración', 'inspire', 'secondary', `data-id="${row.id}" data-on="${x.heroic ? '' : '1'}"`)}${button('Dado', 'bonus-die', 'secondary', `data-id="${row.id}"`)}${button('Tirada', 'request', 'secondary', `data-id="${row.id}"`)}${button('Dar', 'give', 'secondary', `data-id="${row.id}"`)}${button('Mensaje', 'message', 'secondary', `data-id="${row.id}"`)}${button('Más', 'more', 'secondary', `data-id="${row.id}"`)}</div>`,
              }),
            )
            .join('')
        : `<section class="card"><h2>Esperando a la party</h2><p>Cada jugador abre su ficha, entra en <b>Mesa</b> y escribe el código <b class="table-code">${esc(party.campaign.code)}</b>.</p></section>`
    }</div>
    ${feedCard()}
  </div><div class="stack">
    ${initiativeCard(t)}
    ${TableExtras.dmHtml(party)}
    <section class="card"><div class="card-header"><h2>Notas del DM</h2></div><label class="field"><span class="visually-hidden">Notas privadas</span><textarea id="dm-notes" style="min-height:160px" placeholder="Solo se guardan en este dispositivo.">${esc(localStorage.getItem(notesKey()) || '')}</textarea></label></section>
  </div></div>`;
}

function drawHome() {
  const tables = Cloud.dmTables();
  $('#main').innerHTML =
    `<div class="heading"><div><p class="eyebrow">PANTALLA DEL DM</p><h1>Tus mesas.</h1><p>Creá una mesa, compartí el código con la party y seguí sus fichas en vivo.</p></div></div>
  <div class="columns"><section class="card"><h2>Nueva mesa</h2><form id="create-form" class="stack">${field('Nombre de la campaña', 'name', '', 'text', 'required maxlength="100" placeholder="La maldición de Strahd"')}${field('Tu nombre', 'display', 'DM', 'text', 'maxlength="100"')}${settingsFields()}<div class="actions"><button class="button" type="submit">Crear mesa</button></div><p class="form-error" id="create-error" role="alert">${esc(error)}</p></form></section>
  <section class="card"><h2>Abiertas en este dispositivo</h2>${
    tables.length
      ? `<div class="dm-tables">${tables.map(x => `<div class="list-row"><div><b>${esc(x.name)}</b><p class="small muted">Código ${esc(x.code)}</p></div><div class="actions">${button('Abrir', 'open', '', `data-id="${x.id}"`)}${button('Olvidar', 'forget', 'secondary', `data-id="${x.id}"`)}${button('Eliminar', 'delete-table', 'danger', `data-id="${x.id}" data-name="${esc(x.name)}"`)}</div></div>`).join('')}</div>`
      : '<p class="muted">Todavía no creaste mesas en este dispositivo.</p>'
  }<p class="small muted section-space">Tu acceso de DM queda guardado en este navegador. Guardalo con tu email para dirigir tus mesas desde otro dispositivo.</p></section></div>${AccountUI.card('account')}`;
  if (!merged) {
    merged = true;
    Cloud.myDmTables()
      .then(r => r.length && !current && drawHome())
      .catch(() => {});
  }
}
let merged = false;
addEventListener('cloud-login', () => {
  merged = false;
  if (!current) drawHome();
});

function initiativeCard(t) {
  const items = t.entries
    .map((e, i) => {
      const pc = e.characterId ? characterById(e.characterId) : null,
        x = pc ? PV.summarize(pc.data) : null;
      const sub = x
        ? `${x.hp ?? '—'}/${x.maxHP} PG · CA ${x.ac}${x.conditions.length ? ' · ' + esc(x.conditions.join(', ')) : ''}`
        : `CA ${e.ac ?? '—'}`;
      const down = x ? x.hp === 0 : e.hp === 0;
      return `<li class="${i === t.turn ? 'current' : ''} ${down ? 'down' : ''}"><span class="init">${e.init ?? '—'}</span><span class="who"><b>${esc(e.name)}</b><small>${sub}</small></span><span class="monster-hp">${
        e.characterId
          ? button('Init', 'init-set', 'text-btn', `data-entry="${e.id}"`)
          : `<input type="number" aria-label="PG de ${esc(e.name)}" data-monster-hp="${e.id}" value="${e.hp ?? ''}" min="0" max="99999">/${e.max ?? '—'}${button('Init', 'init-set', 'text-btn', `data-entry="${e.id}"`)}`
      }${button('×', 'init-remove', 'text-btn', `data-entry="${e.id}" aria-label="Quitar ${esc(e.name)}"`)}</span></li>`;
    })
    .join('');
  return `<section class="card"><div class="card-header"><h2>Iniciativa${t.round ? ' · ronda ' + t.round : ''}</h2></div>
  <div class="actions">${button('Agregar party', 'init-party')}${button('Pedir iniciativa', 'init-request')}${button('Agregar criatura', 'init-monster')}</div>
  ${items ? `<ol class="initiative-list section-space">${items}</ol>` : '<p class="muted section-space">Agregá a la party y a las criaturas. Las tiradas de iniciativa de los jugadores se completan solas.</p>'}
  ${t.entries.length ? `<div class="actions section-space">${button(t.turn < 0 ? 'Empezar combate' : 'Siguiente turno', 'init-next', '')}${t.turn >= 0 ? button('Terminar combate', 'init-end') : ''}${button('Vaciar', 'init-clear')}</div>` : ''}</section>`;
}

function feedCard() {
  const responses = new Map();
  for (const e of feed)
    if (e.kind === 'roll-response') {
      const list = responses.get(e.payload.requestId) || [];
      list.push(e);
      responses.set(e.payload.requestId, list);
    }
  const items = feed
    .filter(e => e.kind !== 'initiative')
    .filter(e => e.kind !== 'roll-response' || !feed.some(r => r.id === e.payload.requestId))
    .slice(0, 60)
    .map(e => {
      let extra = '';
      if (e.kind === 'roll-request') {
        const dc = Number(e.payload.dc) || null;
        const rs = (responses.get(e.id) || []).map(
          r =>
            `<span class="chip ${dc ? (r.payload.total >= dc ? 'selected' : 'warn') : ''}">${esc(r.payload.character)}: ${esc(r.payload.total)}${r.payload.physical ? ' · físico' : ''}</span>`,
        );
        extra = rs.length
          ? `<div class="chips">${rs.join('')}</div>`
          : '<p class="small muted">Esperando respuestas…</p>';
      }
      const time = new Date(e.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
      return `<div class="log-item"><time>${esc(time)}</time><div><p>${PV.eventText(e, party)}${e.visibility !== 'all' ? ' <span class="muted small">(privado)</span>' : ''}${e.kind !== 'roll' && e.kind !== 'roll-response' && e.target_character && e.applied_at === null && Cloud.COMMANDS.includes(e.kind) ? ' <span class="muted small">· pendiente</span>' : ''}</p>${extra}</div></div>`;
    })
    .join('');
  return `<section class="card"><div class="card-header"><h2>En la mesa</h2>${button('Tirar dados', 'dice')}</div><div class="log table-feed">${items || '<p class="muted">Las tiradas de la party y tus órdenes aparecerán acá.</p>'}</div></section>`;
}

// ---------- Acciones ----------
function targetName(id) {
  return id ? characterById(id)?.name || 'Personaje' : 'toda la party';
}
const actions = {
  home: () => {
    unsubscribe?.();
    current = null;
    party = null;
    localStorage.removeItem('dnd-dm-last');
    history.replaceState(null, '', location.pathname);
    draw();
  },
  open: e => open(e.dataset.id),
  settings: () =>
    modal(
      'Ajustes de la mesa',
      settingsFields(Cloud.cleanSettings(party.campaign.settings)) +
        '<p class="small">Los cambios valen para personajes nuevos y para las fichas que se unan desde ahora. Las fichas ya unidas conservan sus elecciones.</p>',
      async fd => {
        party.campaign.settings = await Cloud.updateSettings(current, readSettings(fd));
        draw();
        toast('Ajustes guardados.');
      },
      'Guardar',
    ),
  'delete-table': e => {
    const { id, name } = e.dataset;
    modal(
      'Eliminar «' + name + '»',
      `<p>Se borran para siempre la mesa, su código, las fichas compartidas en ella y todo el historial de tiradas y órdenes. <b>Las fichas siguen en los dispositivos de cada jugador</b> y pueden unirse a otra mesa.</p>${field('Escribí el nombre de la mesa para confirmar', 'confirm', '', 'text', 'required autocomplete="off"')}`,
      async fd => {
        if (String(fd.get('confirm')).trim() !== name) throw Error('El nombre no coincide.');
        await Cloud.deleteCampaign(id);
        localStorage.removeItem('dnd-dm-initiative-' + id);
        localStorage.removeItem('dnd-dm-notes-' + id);
        if (current === id) actions.home();
        else draw();
        toast('Mesa eliminada.');
      },
      'Eliminar para siempre',
    );
  },
  forget: e => {
    Cloud.forgetDmTable(e.dataset.id);
    draw();
  },
  refresh,
  hp: e => {
    const id = e.dataset.id;
    modal(
      'PG de ' + targetName(id),
      `<div class="form-grid">${field('Cantidad', 'amount', '', 'number', 'min="1" max="9999" required autofocus')}${select(
        'Tipo',
        'kind',
        [
          ['damage', 'Daño'],
          ['heal', 'Curación'],
          ['temp', 'PG temporales'],
        ],
      )}</div>${field('Origen (opcional)', 'source', '', 'text', 'maxlength="80" placeholder="Aliento del dragón"')}<p class="small">La ficha del jugador aplica el daño a sus PG temporales primero y le recuerda la salvación de concentración.</p>`,
      fd => send(fd.get('kind'), { amount: int(fd, 'amount', 1, 9999), source: String(fd.get('source')).trim() }, id),
    );
  },
  conditions: e => {
    const id = e.dataset.id,
      x = PV.summarize(characterById(id).data);
    modal(
      'Estados de ' + targetName(id),
      `<div class="chips">${CONDITIONS.map(c => `<label class="check"><input type="checkbox" name="c" value="${c}" ${x.conditions?.includes(c) ? 'checked' : ''}>${c}</label>`).join('')}</div><h3 class="section-space">Efecto con duración (opcional)</h3><div class="form-grid">${field('Nombre', 'fxName', '', 'text', 'maxlength="100" placeholder="Hechizado por la dríada"')}${field('Rondas (10 = 1 minuto)', 'fxRounds', 10, 'number', 'min="1" max="9999"')}</div><p class="small">El efecto descuenta una ronda al empezar cada turno del jugador y termina solo.</p>`,
      async fd => {
        const next = fd.getAll('c'),
          now = x.conditions || [];
        for (const c of CONDITIONS)
          if (next.includes(c) !== now.includes(c)) await send('condition', { name: c, on: next.includes(c) }, id);
        const fx = String(fd.get('fxName') || '').trim();
        if (fx) await send('effect', { name: fx, rounds: int(fd, 'fxRounds', 1, 9999, 10) }, id);
      },
      'Aplicar',
    );
  },
  request: e => {
    const id = e.dataset.id || null;
    const opts = [
      ['initiative:', 'Iniciativa'],
      ...Rules.skills.map(([k, n]) => ['skill:' + k, n]),
      ...Object.entries(Rules.attrs).map(([k, n]) => ['save:' + k, 'Salvación de ' + n]),
      ...Object.entries(Rules.attrs).map(([k, n]) => ['ability:' + k, 'Prueba de ' + n]),
    ];
    modal(
      'Pedir tirada a ' + targetName(id),
      `${select('Tirada', 'what', opts, 'skill:perception')}<div class="form-grid">${field('CD (opcional)', 'dc', '', 'number', 'min="1" max="40"')}</div><label class="check"><input type="checkbox" name="showDc">Mostrar la CD a los jugadores</label><label class="check"><input type="checkbox" name="secret">Respuestas solo para el DM</label>`,
      fd => {
        const [type, key] = String(fd.get('what')).split(':'),
          label = opts.find(o => o[0] === fd.get('what'))[1];
        return send(
          'roll-request',
          {
            type,
            id: key,
            label,
            dc: int(fd, 'dc', 1, 40, null),
            showDc: fd.has('showDc'),
            secret: fd.has('secret'),
          },
          id,
        );
      },
    );
  },
  give: e => {
    const id = e.dataset.id;
    modal(
      'Entregar a ' + targetName(id),
      `<h3>Monedas</h3><div class="form-grid">${['pp', 'gp', 'ep', 'sp', 'cp'].map(k => field({ pp: 'Platino', gp: 'Oro', ep: 'Electro', sp: 'Plata', cp: 'Cobre' }[k], k, '', 'number', 'min="0" max="999999"')).join('')}</div><h3>Objeto</h3>${field('Nombre', 'item', '', 'text', 'maxlength="150" placeholder="Poción de curación"')}<div class="form-grid">${field('Cantidad', 'qty', 1, 'number', 'min="1" max="999"')}</div><label class="field">Notas<textarea name="notes" maxlength="2000"></textarea></label>`,
      async fd => {
        const coins = Object.fromEntries(['pp', 'gp', 'ep', 'sp', 'cp'].map(k => [k, int(fd, k, 0, 999999, 0)]));
        const item = String(fd.get('item')).trim();
        if (!item && !Object.values(coins).some(Boolean)) throw Error('Indicá monedas o un objeto.');
        if (Object.values(coins).some(Boolean)) await send('gold', coins, id);
        if (item)
          await send('item', { name: item, qty: int(fd, 'qty', 1, 999, 1), notes: String(fd.get('notes')).trim() }, id);
      },
    );
  },
  message: e => {
    const id = e.dataset.id || null;
    modal(
      'Mensaje a ' + targetName(id),
      `<label class="field">Texto<textarea name="text" maxlength="2000" required></textarea></label><p class="small">${id ? 'Solo lo ven ese jugador y vos.' : 'Lo ve toda la party.'}</p>`,
      fd => send('note', { text: String(fd.get('text')).trim() }, id, id ? 'target' : 'all'),
    );
  },
  more: e => {
    const id = e.dataset.id,
      row = characterById(id);
    modal(
      targetName(id),
      `<div class="actions">${button('Descanso corto', 'rest-short', 'secondary', `data-id="${id}"`)}${button('Descanso largo', 'rest-long', 'secondary', `data-id="${id}"`)}${button('Habilitar subida de nivel', 'level', 'secondary', `data-id="${id}"`)}</div><div class="divider"></div><p class="small">Quitar la ficha de la mesa no la borra del dispositivo del jugador.</p>${button('Quitar de la mesa', 'kick', 'secondary', `data-id="${id}"`)}<p class="small muted section-space">Última actualización: ${esc(new Date(row.updated_at).toLocaleString('es-AR'))}</p>`,
      () => true,
      'Cerrar',
    );
  },
  'rest-short': e => rest('short', e.dataset.id),
  'rest-long': e => rest('long', e.dataset.id),
  level: async e => {
    const x = PV.summarize(characterById(e.dataset.id).data);
    await send('level', { level: Math.min(20, x.level + 1) }, e.dataset.id);
    $('#modal').close();
    toast('Subida de nivel habilitada.');
  },
  kick: async e => {
    if (!confirm('¿Quitar a ' + targetName(e.dataset.id) + ' de la mesa?')) return;
    await Cloud.removeCharacter(e.dataset.id);
    $('#modal').close();
  },
  dice: () =>
    modal(
      'Tirada del DM',
      `<div class="form-grid">${field('Cantidad', 'n', 1, 'number', 'min="1" max="30" required')}${select(
        'Dado',
        'die',
        [4, 6, 8, 10, 12, 20, 100].map(x => [x, 'd' + x]),
        20,
      )}${field('Modificador', 'mod', 0, 'number', 'min="-100" max="100" required')}</div>${field('Para qué', 'label', '', 'text', 'maxlength="80" placeholder="Ataque del ogro"')}<label class="check"><input type="checkbox" name="public">Mostrar a la party</label>`,
      fd => {
        const n = int(fd, 'n', 1, 30),
          die = int(fd, 'die', 4, 100),
          mod = int(fd, 'mod', -100, 100);
        const rolls = Array.from({ length: n }, () => {
          const a = new Uint32Array(1),
            lim = Math.floor(4294967296 / die) * die;
          let x;
          do x = crypto.getRandomValues(a)[0];
          while (x >= lim);
          return (x % die) + 1;
        });
        const total = rolls.reduce((a, b) => a + b, 0) + mod;
        toast(`${total} (${rolls.join(', ')} ${sign(mod)})`);
        return send(
          'roll',
          { character: 'DM', label: String(fd.get('label')).trim() || n + 'd' + die, rolls, bonus: mod, total },
          null,
          fd.has('public') ? 'all' : 'dm',
        );
      },
      'Tirar',
    ),
  'init-party': () => {
    const t = tracker();
    for (const { row, x } of summaries())
      if (!t.entries.some(e => e.characterId === row.id))
        t.entries.push({ id: crypto.randomUUID(), characterId: row.id, name: row.name, init: null, dex: x.initiative });
    saveTracker(t);
    draw();
  },
  'init-request': async () => {
    actions['init-party']();
    await send('roll-request', { type: 'initiative', id: '', label: 'Iniciativa' });
    toast('Pedido enviado: las respuestas completan la iniciativa.');
  },
  'init-monster': () =>
    modal(
      'Agregar criatura',
      `${field('Nombre', 'name', '', 'text', 'required maxlength="80" placeholder="Goblin"')}<div class="form-grid">${field('Cantidad', 'count', 1, 'number', 'min="1" max="20" required')}${field('Mod. de iniciativa', 'mod', 0, 'number', 'min="-10" max="20" required')}${field('PG', 'hp', '', 'number', 'min="1" max="99999"')}${field('CA', 'ac', '', 'number', 'min="1" max="40"')}</div><p class="small">Se tira la iniciativa de cada una (d20 + modificador). Podés corregirla con «Init».</p>`,
      fd => {
        const t = tracker(),
          n = int(fd, 'count', 1, 20),
          mod = int(fd, 'mod', -10, 20),
          hp = int(fd, 'hp', 1, 99999, null),
          ac = int(fd, 'ac', 1, 40, null),
          name = String(fd.get('name')).trim();
        for (let i = 1; i <= n; i++)
          t.entries.push({
            id: crypto.randomUUID(),
            name: n > 1 ? `${name} ${i}` : name,
            init: d20() + mod,
            dex: mod,
            hp,
            max: hp,
            ac,
          });
        saveTracker(t);
        draw();
      },
      'Agregar',
    ),
  'init-set': e => {
    const t = tracker(),
      entry = t.entries.find(x => x.id === e.dataset.entry);
    modal(
      'Iniciativa de ' + entry.name,
      field('Resultado', 'init', entry.init ?? '', 'number', 'min="-10" max="50" required autofocus'),
      fd => {
        entry.init = int(fd, 'init', -10, 50);
        saveTracker(t);
        draw();
      },
      'Guardar',
    );
  },
  'init-remove': e => {
    const t = tracker(),
      i = t.entries.findIndex(x => x.id === e.dataset.entry);
    if (i < 0) return;
    t.entries.splice(i, 1);
    if (t.turn >= t.entries.length) t.turn = t.entries.length - 1;
    else if (i < t.turn) t.turn--;
    saveTracker(t);
    draw();
  },
  'init-next': async () => {
    const t = tracker();
    if (!t.entries.length) return;
    if (t.turn < 0) {
      t.turn = 0;
      t.round = 1;
    } else {
      t.turn = (t.turn + 1) % t.entries.length;
      if (t.turn === 0) t.round++;
    }
    saveTracker(t);
    const e = t.entries[t.turn];
    await send('turn', { characterId: e.characterId || null, name: e.name, round: t.round });
  },
  'init-end': async () => {
    const t = tracker();
    t.turn = -1;
    t.round = 0;
    saveTracker(t);
    await send('combat-end', {});
  },
  'init-clear': () => {
    if (!confirm('¿Vaciar la iniciativa?')) return;
    localStorage.removeItem(initKey());
    publishOrder();
    draw();
  },
  'bonus-die': e => {
    const id = e.dataset.id;
    modal(
      'Dado de bonificación para ' + targetName(id),
      `<div class="form-grid">${select(
        'Dado',
        'die',
        [4, 6, 8, 10, 12].map(d => [d, 'd' + d]),
        4,
      )}${select(
        'Para',
        'kind',
        [
          ['check', 'Pruebas de característica'],
          ['attack', 'Ataques'],
          ['save', 'Salvaciones'],
          ['any', 'Cualquier tirada'],
        ],
        'check',
      )}</div>${field('Motivo', 'reason', '', 'text', 'maxlength="200" placeholder="Por distraer al guardia"')}<fieldset class="campaign-sources"><legend>Solo para estas habilidades (opcional, en pruebas)</legend><div class="source-grid">${Rules.skills.map(([k, n]) => `<label class="check"><input type="checkbox" name="skill" value="${k}">${esc(n)}</label>`).join('')}</div></fieldset><p class="small">El jugador lo ve en su ficha y lo suma cuando tira; se gasta al usarlo.</p>`,
      fd => {
        const kind = fd.get('kind');
        return send(
          'bonus-die',
          {
            die: int(fd, 'die', 4, 12),
            kind,
            skills: kind === 'check' ? fd.getAll('skill') : [],
            reason: String(fd.get('reason')).trim(),
          },
          id,
        );
      },
      'Dar dado',
    );
  },
  inspire: async e => {
    const on = Boolean(e.dataset.on);
    await send('inspiration', { on }, e.dataset.id);
    toast(on ? 'Inspiración entregada.' : 'Inspiración retirada.');
  },
};
async function rest(type, id) {
  const targets = id ? [id] : (party?.characters || []).map(c => c.id);
  for (const t of targets) await send('rest', { type }, t);
  $('#modal').open && $('#modal').close();
  toast(`Descanso ${type === 'long' ? 'largo' : 'corto'} anunciado.`);
}

document.addEventListener('click', async e => {
  if (e.target.closest('[data-close]')) return $('#modal').close();
  const el = e.target.closest('[data-action]');
  if (!el || !actions[el.dataset.action]) return;
  try {
    await actions[el.dataset.action](el);
  } catch (err) {
    toast(err.message);
  }
});
document.addEventListener('change', e => {
  const id = e.target.dataset.monsterHp;
  if (!id) return;
  const t = tracker(),
    entry = t.entries.find(x => x.id === id);
  if (!entry) return;
  const v = e.target.value === '' ? null : Math.max(0, Math.min(99999, Math.floor(Number(e.target.value))));
  entry.hp = v;
  saveTracker(t);
  draw();
});
document.addEventListener('input', e => {
  if (e.target.id === 'dm-notes') localStorage.setItem(notesKey(), e.target.value);
});
document.addEventListener('submit', e => {
  if (e.target.id !== 'create-form') return;
  e.preventDefault();
  const fd = new FormData(e.target),
    out = $('#create-error');
  out.textContent = 'Creando…';
  Cloud.createCampaign(String(fd.get('name')).trim(), String(fd.get('display')).trim())
    .then(async c => {
      await Cloud.updateSettings(c.id, readSettings(fd));
      open(c.id);
    })
    .catch(err => (out.textContent = err.message));
});
window.addEventListener('hashchange', () => {
  const id = location.hash.includes('=') ? '' : location.hash.slice(1);
  if (id && id !== current) open(id);
});
Cloud.onStatus(() => {});
TableExtras.install({ refresh: () => refresh(), campaignId: () => current, characterId: () => null });
// Al volver a la pestaña (o desbloquear el celular), se pone al día con la mesa.
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && current) refresh();
});
const hashId = location.hash.includes('=') ? '' : location.hash.slice(1);
const start = hashId || localStorage.getItem('dnd-dm-last');
if (Cloud.enabled && start) open(start);
else draw();
