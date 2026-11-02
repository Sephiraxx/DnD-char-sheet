/* Tablero de la mesa: mapa con cuadrícula, fichas que se mueven en vivo, niebla de guerra y terreno.
   El DM prepara mapas (imagen, Dungeondraft/Universal VTT o terreno pintado) y elige cuál ve la mesa.
   Cada jugador mueve solo su ficha. Con ?tv=1 es una pantalla para la tele: vista de jugador, sin herramientas. */
'use strict';
const BC = BoardCore,
  esc = PartyView.esc,
  $ = s => document.querySelector(s);
const TV = new URLSearchParams(location.search).has('tv');
const CELL = 70; // px por casilla en mapas sin imagen
const MAX_IMAGE = 4096; // lado máximo de la imagen guardada

const S = {
  id: decodeURIComponent(location.hash.slice(1)),
  me: null,
  party: null,
  isDM: false,
  asPlayer: TV, // el DM puede ver como jugador; la tele siempre
  board: null,
  maps: [],
  tokens: [],
  mapId: null, // mapa que se está viendo (el DM puede editar uno que no está en la mesa)
  grid: BC.normGrid(),
  terrain: '',
  walls: [],
  fogOn: false,
  fog: null,
  img: null,
  imgPath: '',
  view: { s: 1, x: 0, y: 0 },
  fitted: false,
  tool: 'move',
  fogMode: 'reveal',
  paintCode: 'f',
  paintMode: 'brush',
  radius: 0,
  showWalls: true,
  sel: null,
  drag: null,
  remote: new Map(), // arrastres de otros: id → {x, y}
  pings: [],
  channel: null,
  follow: TV,
  pending: {},
  saveTimer: 0,
  panelMin: false,
  dirty: true,
};
const canvas = $('#board'),
  ctx = canvas.getContext('2d');

// ---------- Utilidades de interfaz ----------
let toastTimer;
function toast(msg) {
  const el = $('#toast');
  clearTimeout(toastTimer);
  el.textContent = msg;
  el.hidden = false;
  el.classList.add('visible');
  toastTimer = setTimeout(() => {
    el.classList.remove('visible');
    el.hidden = true;
  }, 3800);
}
const button = (label, action, classes = 'secondary', data = '') =>
  `<button type="button" class="button ${classes}" data-action="${action}" ${data}>${label}</button>`;
const field = (label, name, value = '', type = 'text', extra = '') =>
  `<label class="field">${label}<input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`;
function modal(title, html, submit, saveLabel = 'Guardar') {
  const d = $('#modal');
  if (d.open) d.close();
  $('#modal-content').innerHTML =
    `<div class="modal-head"><h2 id="dialog-title">${esc(title)}</h2><button type="button" class="icon-btn" data-close aria-label="Cerrar">×</button></div><form id="dialog-form"><div class="modal-body">${html}<p class="form-error" id="form-error" role="alert"></p>${submit ? `<div class="modal-actions"><button type="button" class="button secondary" data-close>Cancelar</button><button class="button" type="submit">${esc(saveLabel)}</button></div>` : ''}</div></form>`;
  $('#dialog-form').addEventListener('submit', async e => {
    e.preventDefault();
    if (!submit) return;
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
document.addEventListener('click', e => {
  if (e.target.closest('[data-close]')) $('#modal').close();
});
function hint(text) {
  $('#board-hint').textContent = text || '';
}
function message(html) {
  const el = $('#board-message');
  el.hidden = !html;
  el.innerHTML = html ? `<section class="card">${html}</section>` : '';
}

// ---------- Datos ----------
const currentMap = () => S.maps.find(m => m.id === S.mapId) || null;
const activeId = () => S.board?.map_id || null;
const playerView = () => S.asPlayer || !S.isDM;
const myCharacters = () => (S.party?.characters || []).filter(c => c.owner_id === S.me?.id).map(c => c.id);
const mapTokens = () => S.tokens.filter(t => t.map_id === S.mapId);
const cellPx = () => (S.img ? S.grid.size : CELL);
const origin = () => (S.img ? { x: S.grid.ox, y: S.grid.oy } : { x: 0, y: 0 });
const worldSize = () =>
  S.img ? { w: S.img.width, h: S.img.height } : { w: S.grid.cols * CELL, h: S.grid.rows * CELL };

async function start() {
  if (!Cloud.enabled) {
    message(
      '<h1>Mesa compartida no configurada</h1><p>El tablero usa la mesa compartida. Los pasos están en el README, sección «Mesa compartida».</p>',
    );
    return;
  }
  if (!S.id) {
    message(
      `<h1>Abrí el tablero desde tu mesa</h1><p>El DM lo abre desde su pantalla y los jugadores desde <b>Mesa</b> en su ficha.</p><div class="actions"><a class="button" href="./">Ir a mi ficha</a><a class="button secondary" href="./dm.html">Pantalla del DM</a></div>`,
    );
    return;
  }
  try {
    S.me = await Cloud.user();
    S.party = await Cloud.party(S.id);
  } catch (e) {
    return joinForm(e.message);
  }
  S.isDM = S.party.campaign.dm_id === S.me.id;
  if (TV) S.asPlayer = true;
  try {
    const data = await Cloud.board(S.id);
    Object.assign(S, { board: data.board, maps: data.maps, tokens: data.tokens });
  } catch (e) {
    message(
      `<h1>El tablero todavía no está instalado</h1><p>${esc(e.message)}</p><p class="small">Quien administra la mesa tiene que ejecutar <code>supabase/migrations/008_board.sql</code> en Supabase (SQL Editor) una sola vez.</p>`,
    );
    return;
  }
  document.body.classList.toggle('board-tv', TV);
  resize();
  await openMap(activeId() || (S.isDM && !TV ? S.maps[0]?.id : null));
  S.channel = await Cloud.subscribeBoard(S.id, onBoard, onMessage);
  await Cloud.subscribe(S.id, onParty);
  if (S.isDM && !TV) ensureTokens();
  ui();
}
// Una tele u otro dispositivo que todavía no está en la mesa se suma con el código.
function joinForm(reason) {
  message(
    `<h1>Entrar al tablero</h1><p class="small">${esc(reason)}</p><form id="join-form" class="stack">${field('Código de la mesa', 'code', '', 'text', 'maxlength="6" required autocomplete="off" style="text-transform:uppercase"')}${field('Nombre de esta pantalla', 'name', TV ? 'Tele' : '', 'text', 'maxlength="40" required')}<div class="actions"><button class="button" type="submit">Entrar</button></div></form>`,
  );
  $('#join-form').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      const c = await Cloud.joinOnly(String(fd.get('code')).trim(), String(fd.get('name')).trim());
      location.hash = c.campaignId;
      location.reload();
    } catch (err) {
      toast(err.message);
    }
  });
}

async function openMap(id) {
  S.mapId = id;
  S.sel = null;
  S.fitted = false;
  const m = currentMap();
  loadMapFields(m);
  S.img = null;
  S.imgPath = '';
  if (m?.image_path) await loadImage(m.image_path);
  fit();
  ui();
}
function loadMapFields(m) {
  S.grid = BC.normGrid(m?.grid || {});
  S.terrain = BC.cells(S.grid, m?.terrain?.cells || '');
  S.walls = Array.isArray(m?.terrain?.walls) ? m.terrain.walls : [];
  S.fogOn = !!m?.fog?.on;
  S.fog = BC.fogBits(S.grid, m?.fog?.revealed || '');
  S.dirty = true;
}
async function loadImage(path) {
  S.imgPath = path;
  try {
    const url = await Cloud.mapImageUrl(path);
    const img = new Image();
    img.decoding = 'async';
    await new Promise((ok, fail) => {
      img.onload = ok;
      img.onerror = () => fail(Error('No se pudo cargar la imagen del mapa.'));
      img.src = url;
    });
    if (S.imgPath === path) S.img = img;
  } catch (e) {
    toast(e.message);
  }
  S.dirty = true;
}
async function reload() {
  try {
    const data = await Cloud.board(S.id);
    const keep = S.mapId;
    Object.assign(S, { board: data.board, maps: data.maps, tokens: data.tokens });
    const want = !S.isDM || TV ? activeId() : S.maps.some(m => m.id === keep) ? keep : activeId();
    if (want !== S.mapId || (currentMap()?.image_path || '') !== S.imgPath) await openMap(want);
    else loadMapFields(currentMap());
  } catch (e) {
    toast(e.message);
  }
  ui();
}

// Guardado diferido: pintar niebla o terreno no escribe en cada movimiento.
function saveSoon(patch) {
  const id = S.mapId;
  if (!id) return;
  S.editedAt = performance.now();
  S.pending[id] = { ...(S.pending[id] || {}), ...patch };
  clearTimeout(S.saveTimer);
  S.saveTimer = setTimeout(flushSave, 450);
}
async function flushSave() {
  const all = S.pending;
  S.pending = {};
  for (const [id, patch] of Object.entries(all)) {
    try {
      const row = await Cloud.saveMap(S.id, patch, id);
      S.maps = S.maps.map(m => (m.id === id ? row : m));
    } catch (e) {
      toast('No se guardó el mapa: ' + e.message);
    }
  }
}
const fogPatch = () => ({ fog: { on: S.fogOn, revealed: BC.fogEncode(S.fog) } });
const terrainPatch = () => ({ terrain: { cells: S.terrain, walls: S.walls } });

// ---------- Fichas automáticas (DM): la party y las criaturas del combate ----------
let ensuring = false;
const lastHidden = new Map();
async function ensureTokens() {
  const map = activeId();
  if (!S.isDM || TV || !map || ensuring) return;
  ensuring = true;
  try {
    const m = S.maps.find(x => x.id === map),
      g = BC.normGrid(m?.grid || {}),
      t = BC.cells(g, m?.terrain?.cells || ''),
      on = S.tokens.filter(x => x.map_id === map),
      rows = [];
    for (const c of S.party.characters || [])
      if (!on.some(x => x.character_id === c.id)) {
        const p = BC.freeSpot(g, [...on, ...rows], { x: 1, y: Math.floor(g.rows / 2) }, t);
        rows.push(tokenRow({ kind: 'pc', character_id: c.id, name: c.name, ...p }, map));
      }
    for (const c of S.party.combatants || []) {
      if (c.kind !== 'monster') continue;
      const tok = on.find(x => x.combatant_id === c.id);
      if (!tok) {
        const p = BC.freeSpot(g, [...on, ...rows], { x: g.cols - 2, y: Math.floor(g.rows / 2) }, t);
        rows.push(tokenRow({ kind: 'monster', combatant_id: c.id, name: c.name, hidden: c.hidden, ...p }, map));
      } else if (lastHidden.has(c.id) && lastHidden.get(c.id) !== c.hidden && tok.hidden !== c.hidden) {
        // El DM reveló (o volvió a ocultar) la criatura en el combate: la ficha la sigue.
        await Cloud.updateToken(tok.id, { hidden: c.hidden });
        tok.hidden = c.hidden;
        S.channel?.send({ t: 'refresh' });
      }
      lastHidden.set(c.id, c.hidden);
    }
    if (rows.length) {
      const made = await Cloud.addTokens(rows);
      S.tokens = [...S.tokens.filter(x => !made.some(y => y.id === x.id)), ...made];
    }
  } catch (e) {
    // Otra pestaña del DM pudo crearlas al mismo tiempo: se recarga.
    if (!/duplicate|unique/i.test(e.message)) toast(e.message);
    else await reload();
  } finally {
    ensuring = false;
    S.dirty = true;
  }
}
function tokenRow(x, map) {
  return {
    campaign_id: S.id,
    map_id: map,
    kind: x.kind,
    character_id: x.character_id || null,
    combatant_id: x.combatant_id || null,
    name: String(x.name || 'Ficha').slice(0, 100),
    label: x.label ?? BC.initials(x.name),
    color: x.color || BC.colorFor(x.character_id || x.combatant_id || x.name, x.kind),
    x: x.x,
    y: x.y,
    size: x.size || 1,
    hidden: !!x.hidden,
  };
}

// ---------- Tiempo real ----------
function onBoard(table, p) {
  if (table === 'boards') {
    const was = activeId();
    S.board = p.new?.campaign_id ? p.new : S.board;
    if (playerView() && !S.isDM) reload();
    else if (TV && activeId() !== was) reload();
    else {
      if (S.isDM && activeId() !== was) ensureTokens();
      ui();
    }
    return;
  }
  if (table === 'maps') {
    if (p.eventType === 'DELETE') {
      S.maps = S.maps.filter(m => m.id !== p.old.id);
      if (S.mapId === p.old.id) openMap(activeId());
    } else {
      const row = p.new;
      S.maps = [...S.maps.filter(m => m.id !== row.id), row].sort((a, b) => a.sort - b.sort);
      // Ecos de mis propios guardados: no pisan lo que sigo pintando.
      const mine = S.isDM && performance.now() - (S.editedAt || 0) < 2500;
      if (row.id === S.mapId && !S.pending[row.id] && !mine) {
        const imgChanged = (row.image_path || '') !== S.imgPath;
        loadMapFields(row);
        if (imgChanged) (row.image_path ? loadImage(row.image_path) : Promise.resolve((S.img = null))).then(fit);
      }
    }
    ui();
    return;
  }
  if (table === 'map_tokens') {
    if (p.eventType === 'DELETE') S.tokens = S.tokens.filter(t => t.id !== p.old.id);
    else {
      const row = p.new;
      if (S.drag?.token.id === row.id) return; // lo estoy moviendo yo
      S.tokens = [...S.tokens.filter(t => t.id !== row.id), row];
      S.remote.delete(row.id);
    }
    if (S.sel && !S.tokens.some(t => t.id === S.sel)) S.sel = null;
    S.dirty = true;
    card();
  }
}
function onMessage(m) {
  if (!m || typeof m !== 'object') return;
  if (m.t === 'drag' && m.map === S.mapId) S.remote.set(m.id, { x: m.x, y: m.y });
  if (m.t === 'drop') S.remote.delete(m.id);
  if (m.t === 'ping' && m.map === S.mapId) addPing(m.x, m.y, m.color, m.name);
  if (m.t === 'refresh' && !S.isDM) reload();
  if (m.t === 'view' && S.follow && m.map === S.mapId) fitRect(m.x, m.y, m.w, m.h);
  S.dirty = true;
}
let partyTimer = 0;
function onParty(table) {
  if (table === 'presence') return;
  clearTimeout(partyTimer);
  partyTimer = setTimeout(async () => {
    try {
      S.party = await Cloud.party(S.id);
    } catch {
      return;
    }
    if (S.isDM) ensureTokens();
    S.dirty = true;
    ui();
  }, 250);
}

// ---------- Cámara ----------
function resize() {
  const r = canvas.parentElement.getBoundingClientRect(),
    dpr = window.devicePixelRatio || 1;
  if (!r.width || !r.height) return;
  canvas.width = Math.round(r.width * dpr);
  canvas.height = Math.round(r.height * dpr);
  canvas.style.width = r.width + 'px';
  canvas.style.height = r.height + 'px';
  if (!S.fitted) fit();
  S.dirty = true;
}
// Encuadre: el DM ve todo el mapa; con niebla, los jugadores ven la zona revelada.
function fit() {
  const { w, h } = worldSize();
  S.fitted = true;
  if (playerView() && S.fogOn && S.mapId) {
    let x0 = Infinity,
      y0 = Infinity,
      x1 = -1,
      y1 = -1;
    for (let y = 0; y < S.grid.rows; y++)
      for (let x = 0; x < S.grid.cols; x++)
        if (BC.isRevealed(S.grid, S.fog, x, y)) {
          x0 = Math.min(x0, x);
          y0 = Math.min(y0, y);
          x1 = Math.max(x1, x);
          y1 = Math.max(y1, y);
        }
    if (x1 >= 0) {
      const c = cellPx(),
        o = origin(),
        pad = 1;
      return fitRect(
        o.x + (x0 - pad) * c,
        o.y + (y0 - pad) * c,
        (x1 - x0 + 1 + pad * 2) * c,
        (y1 - y0 + 1 + pad * 2) * c,
      );
    }
  }
  fitRect(0, 0, w, h);
}
function fitRect(x, y, w, h) {
  const r = canvas.getBoundingClientRect();
  if (!r.width || !w || !h) return;
  const s = Math.min(r.width / w, r.height / h) * 0.96;
  S.view = { s, x: (r.width - w * s) / 2 - x * s, y: (r.height - h * s) / 2 - y * s };
  S.dirty = true;
}
const toWorld = (sx, sy) => ({ x: (sx - S.view.x) / S.view.s, y: (sy - S.view.y) / S.view.s });
const toCell = w => {
  const o = origin(),
    c = cellPx();
  return { x: Math.floor((w.x - o.x) / c), y: Math.floor((w.y - o.y) / c) };
};
const cellCenter = (x, y) => {
  const o = origin(),
    c = cellPx();
  return { x: o.x + (x + 0.5) * c, y: o.y + (y + 0.5) * c };
};
function zoomAt(sx, sy, factor) {
  const w = toWorld(sx, sy),
    s = Math.max(0.05, Math.min(8, S.view.s * factor));
  S.view = { s, x: sx - w.x * s, y: sy - w.y * s };
  S.dirty = true;
}

// ---------- Dibujo ----------
function info(t) {
  // Datos vivos de la ficha: PG, estados, retrato, turno.
  const out = { ring: null, dead: false, conditions: [], portrait: '', turn: false, status: '', speed: 30 };
  const enc = S.party?.encounter,
    current = enc?.active ? (S.party.combatants || []).find(c => c.id === enc.current_id) : null;
  if (t.character_id) {
    const row = (S.party?.characters || []).find(c => c.id === t.character_id);
    if (row) {
      const x = summary(row);
      if (!x.broken) {
        out.ring = x.maxHP ? Math.max(0, Math.min(1, (x.hp ?? x.maxHP) / x.maxHP)) : null;
        out.conditions = x.conditions;
        out.portrait = x.portrait;
        out.speed = x.speed || 30;
        out.status = x.hp != null ? `${x.hp}/${x.maxHP} PG` : '';
        out.dead = x.hp === 0;
      }
    }
    out.turn = !!current && current.character_id === t.character_id;
  }
  if (t.combatant_id) {
    const c = (S.party?.combatants || []).find(x => x.id === t.combatant_id);
    if (c) {
      out.conditions = c.conditions || [];
      out.status = c.status;
      out.dead = c.status === 'derrotado';
      const sec = (S.party.secrets || []).find(x => x.combatant_id === c.id);
      if (sec && !playerView()) {
        out.ring = Math.max(0, Math.min(1, sec.hp / sec.max_hp));
        out.status = `${sec.hp}/${sec.max_hp} PG · ${c.status}`;
      } else
        out.ring = { ileso: 1, herido: 0.75, malherido: 0.45, 'a punto de caer': 0.2, derrotado: 0 }[c.status] ?? null;
    }
    out.turn = !!current && current.id === t.combatant_id;
  }
  return out;
}
// Resumen de la ficha (PG, retrato…): se calcula una vez por versión, no en cada cuadro.
const summaries = new Map();
function summary(row) {
  const key = row.id + '@' + row.updated_at;
  if (!summaries.has(key)) {
    for (const k of summaries.keys()) if (k.startsWith(row.id + '@')) summaries.delete(k);
    summaries.set(key, PartyView.summarize(row.data));
  }
  return summaries.get(key);
}
const portraits = new Map();
function portraitImg(src) {
  if (!src) return null;
  if (!portraits.has(src)) {
    const img = new Image();
    img.onload = () => (S.dirty = true);
    img.src = src;
    portraits.set(src, img);
  }
  const img = portraits.get(src);
  return img.complete && img.naturalWidth ? img : null;
}
function visibleTokens() {
  const mine = myCharacters();
  return mapTokens().filter(t => {
    if (!playerView()) return true;
    if (t.hidden) return false;
    if (!S.fogOn || mine.includes(t.character_id)) return true;
    // En la niebla no se ven las fichas (salvo las propias).
    const c = Math.round(t.x + (t.size - 1) / 2),
      r = Math.round(t.y + (t.size - 1) / 2);
    return BC.isRevealed(S.grid, S.fog, c, r);
  });
}
function draw() {
  if (!S.dirty && !S.pings.length && !S.remote.size) return requestAnimationFrame(draw);
  S.dirty = false;
  const dpr = window.devicePixelRatio || 1,
    { w, h } = worldSize(),
    c = cellPx(),
    o = origin(),
    g = S.grid;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = playerView() && S.fogOn ? '#05090b' : '#071014';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (!S.mapId) return requestAnimationFrame(draw);
  ctx.setTransform(dpr * S.view.s, 0, 0, dpr * S.view.s, dpr * S.view.x, dpr * S.view.y);
  // Celdas visibles en pantalla (para no dibujar todo el mapa en cada cuadro).
  const tl = toCell(toWorld(0, 0)),
    br = toCell(toWorld(canvas.width / dpr, canvas.height / dpr));
  const x0 = Math.max(0, tl.x - 1),
    y0 = Math.max(0, tl.y - 1),
    x1 = Math.min(g.cols - 1, br.x + 1),
    y1 = Math.min(g.rows - 1, br.y + 1);
  // Fondo
  if (S.img) ctx.drawImage(S.img, 0, 0);
  else {
    ctx.fillStyle = '#1d2a2e';
    ctx.fillRect(0, 0, w, h);
  }
  // Terreno
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const code = S.terrain[y * g.cols + x];
      if (code && code !== '.') drawCell(code, o.x + x * c, o.y + y * c, c, x, y);
    }
  // Cuadrícula
  if (g.show) {
    ctx.strokeStyle = S.img ? hexA(g.color, g.opacity) : 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1 / S.view.s;
    ctx.beginPath();
    for (let x = x0; x <= x1 + 1; x++) {
      ctx.moveTo(o.x + x * c, o.y + y0 * c);
      ctx.lineTo(o.x + x * c, o.y + (y1 + 1) * c);
    }
    for (let y = y0; y <= y1 + 1; y++) {
      ctx.moveTo(o.x + x0 * c, o.y + y * c);
      ctx.lineTo(o.x + (x1 + 1) * c, o.y + y * c);
    }
    ctx.stroke();
  }
  // Paredes importadas (solo el DM)
  if (!playerView() && S.showWalls && S.walls.length) {
    ctx.lineWidth = 3 / S.view.s;
    for (const [ax, ay, bx, by, door] of S.walls) {
      ctx.strokeStyle = door ? 'rgba(255,170,60,0.9)' : 'rgba(80,200,255,0.7)';
      ctx.beginPath();
      ctx.moveTo(o.x + ax * c, o.y + ay * c);
      ctx.lineTo(o.x + bx * c, o.y + by * c);
      ctx.stroke();
    }
  }
  // Fichas
  const list = visibleTokens().sort((a, b) => (a.kind === 'object' ? -1 : 0) - (b.kind === 'object' ? -1 : 0));
  for (const t of list) drawToken(t);
  // Niebla
  if (S.fogOn) {
    const solid = playerView(),
      pad = solid ? 0.5 : 0; // sin bordes visibles entre casillas cuando la niebla es opaca
    ctx.fillStyle = solid ? '#05090b' : 'rgba(5,9,11,0.55)';
    // Un solo trazado: sin líneas entre casillas ni doble sombra en el borde.
    ctx.beginPath();
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++)
        if (!BC.isRevealed(g, S.fog, x, y)) ctx.rect(o.x + x * c - pad, o.y + y * c - pad, c + pad * 2, c + pad * 2);
    ctx.fill();
    // Fuera de la cuadrícula también se cubre para los jugadores.
    if (playerView() && S.img) {
      ctx.fillRect(-w, -h, w * 3, h + o.y);
      ctx.fillRect(-w, o.y + g.rows * c, w * 3, h * 2);
      ctx.fillRect(-w, 0, w + o.x, h);
      ctx.fillRect(o.x + g.cols * c, 0, w * 2, h);
    }
  }
  // Herramientas en curso
  if (S.drag?.token) drawRuler(S.drag.from, S.drag.token, info(S.drag.token).speed);
  if (S.drag?.ruler) drawRuler(S.drag.ruler.a, S.drag.ruler.b);
  if (S.drag?.rect) {
    const r = S.drag.rect;
    ctx.strokeStyle = '#e0be80';
    ctx.lineWidth = 2 / S.view.s;
    ctx.setLineDash([8 / S.view.s, 6 / S.view.s]);
    ctx.strokeRect(
      o.x + Math.min(r.a.x, r.b.x) * c,
      o.y + Math.min(r.a.y, r.b.y) * c,
      (Math.abs(r.a.x - r.b.x) + 1) * c,
      (Math.abs(r.a.y - r.b.y) + 1) * c,
    );
    ctx.setLineDash([]);
  }
  drawPings();
  requestAnimationFrame(draw);
}
const hexA = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
};
function drawCell(code, px, py, c, x, y) {
  const t = BC.terrainType(code);
  ctx.globalAlpha = S.img ? 0.6 : 1;
  ctx.fillStyle = t.color;
  ctx.fillRect(px, py, c + 0.5, c + 0.5);
  ctx.globalAlpha = 1;
  const k = c / 70;
  ctx.lineWidth = 2 * k;
  // Texturas simples para distinguir de un vistazo (deterministas por casilla).
  const r = ((x * 73856093) ^ (y * 19349663)) >>> 0;
  if (code === '#') {
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    for (let i = 1; i < 3; i++) {
      ctx.moveTo(px, py + (c * i) / 3);
      ctx.lineTo(px + c, py + (c * i) / 3);
    }
    ctx.moveTo(px + c / 2, py);
    ctx.lineTo(px + c / 2, py + c / 3);
    ctx.moveTo(px + c / 4, py + c / 3);
    ctx.lineTo(px + c / 4, py + (2 * c) / 3);
    ctx.moveTo(px + (3 * c) / 4, py + (2 * c) / 3);
    ctx.lineTo(px + (3 * c) / 4, py + c);
    ctx.stroke();
  } else if (code === 'w' || code === 'W') {
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    for (const f of [0.3, 0.65]) {
      ctx.moveTo(px + c * 0.15, py + c * f);
      ctx.quadraticCurveTo(px + c * 0.35, py + c * (f - 0.1), px + c * 0.5, py + c * f);
      ctx.quadraticCurveTo(px + c * 0.65, py + c * (f + 0.1), px + c * 0.85, py + c * f);
    }
    ctx.stroke();
  } else if (code === 't') {
    ctx.fillStyle = 'rgba(20,50,20,0.9)';
    ctx.beginPath();
    ctx.arc(px + c * (0.4 + (r % 20) / 100), py + c * 0.45, c * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(110,170,90,0.5)';
    ctx.beginPath();
    ctx.arc(px + c * 0.45, py + c * 0.4, c * 0.14, 0, Math.PI * 2);
    ctx.fill();
  } else if (code === 'd' || code === 'r' || code === 'a') {
    ctx.fillStyle = code === 'a' ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.35)';
    for (let i = 0; i < (code === 'r' ? 3 : 5); i++) {
      const rx = ((r >> (i * 4)) & 15) / 15,
        ry = ((r >> (i * 4 + 2)) & 15) / 15;
      ctx.beginPath();
      ctx.arc(px + c * (0.15 + rx * 0.7), py + c * (0.15 + ry * 0.7), c * (code === 'r' ? 0.18 : 0.06), 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (code === 'D') {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(px + c * 0.1, py + c * 0.42, c * 0.8, c * 0.16);
    ctx.fillStyle = '#e0be80';
    ctx.beginPath();
    ctx.arc(px + c * 0.72, py + c * 0.5, c * 0.05, 0, Math.PI * 2);
    ctx.fill();
  } else if (code === 'm') {
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    for (let i = 1; i < 4; i++) {
      ctx.moveTo(px, py + (c * i) / 4);
      ctx.lineTo(px + c, py + (c * i) / 4);
    }
    ctx.stroke();
  } else if (code === 'l') {
    ctx.fillStyle = 'rgba(255,210,80,0.55)';
    ctx.beginPath();
    ctx.arc(px + c * (0.3 + (r % 40) / 100), py + c * 0.5, c * 0.12, 0, Math.PI * 2);
    ctx.fill();
  } else if (code === 'p') {
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.strokeRect(px + c * 0.2, py + c * 0.2, c * 0.6, c * 0.6);
  }
}
function tokenPos(t) {
  const r = S.drag?.token?.id === t.id ? S.drag.token : S.remote.get(t.id) || t;
  return { x: r.x, y: r.y };
}
function drawToken(t) {
  const c = cellPx(),
    o = origin(),
    p = tokenPos(t),
    d = info(t),
    size = t.size || 1,
    cx = o.x + (p.x + size / 2) * c,
    cy = o.y + (p.y + size / 2) * c,
    rad = (size * c) / 2 - c * 0.06;
  ctx.save();
  if (t.hidden) ctx.globalAlpha = 0.45;
  // Turno actual: halo dorado.
  if (d.turn) {
    ctx.beginPath();
    ctx.arc(cx, cy, rad + c * 0.12, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(224,190,128,0.35)';
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(cx, cy, rad, 0, Math.PI * 2);
  ctx.fillStyle = t.color || BC.colorFor(t.id, t.kind);
  ctx.fill();
  const img = portraitImg(d.portrait);
  if (img) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, rad - c * 0.05, 0, Math.PI * 2);
    ctx.clip();
    const k = (rad * 2) / Math.min(img.width, img.height);
    ctx.drawImage(img, cx - (img.width * k) / 2, cy - (img.height * k) / 2, img.width * k, img.height * k);
    ctx.restore();
  } else {
    ctx.fillStyle = t.kind === 'monster' ? '#fff' : '#10252a';
    ctx.font = `700 ${Math.max(8, rad * (String(t.label).length > 2 ? 0.62 : 0.8))}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(t.label || BC.initials(t.name), cx, cy + rad * 0.04);
  }
  // Borde: blanco; seleccionado: dorado.
  ctx.lineWidth = (S.sel === t.id ? 4 : 2) * (c / 70);
  ctx.strokeStyle = S.sel === t.id ? '#e0be80' : 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.arc(cx, cy, rad, 0, Math.PI * 2);
  ctx.stroke();
  // Anillo de PG.
  if (d.ring !== null && d.ring !== undefined && t.kind !== 'object') {
    ctx.lineWidth = 5 * (c / 70);
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.arc(cx, cy, rad + c * 0.05, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = d.ring > 0.5 ? '#6fcf97' : d.ring > 0.25 ? '#f2c94c' : '#eb5757';
    ctx.beginPath();
    ctx.arc(cx, cy, rad + c * 0.05, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * d.ring);
    ctx.stroke();
  }
  if (d.dead) {
    ctx.strokeStyle = '#eb5757';
    ctx.lineWidth = 5 * (c / 70);
    ctx.beginPath();
    ctx.moveTo(cx - rad * 0.6, cy - rad * 0.6);
    ctx.lineTo(cx + rad * 0.6, cy + rad * 0.6);
    ctx.moveTo(cx + rad * 0.6, cy - rad * 0.6);
    ctx.lineTo(cx - rad * 0.6, cy + rad * 0.6);
    ctx.stroke();
  }
  // Estados: puntitos arriba a la derecha.
  d.conditions.slice(0, 4).forEach((_, i) => {
    ctx.fillStyle = '#b39ddb';
    ctx.beginPath();
    ctx.arc(cx + rad * 0.75 - i * c * 0.14, cy - rad * 0.8, c * 0.07, 0, Math.PI * 2);
    ctx.fill();
  });
  // Nombre debajo cuando hay espacio.
  if (S.view.s * c > 34) {
    ctx.font = `600 ${c * 0.2}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const label = t.name + (t.hidden ? ' (oculta)' : '');
    const wTxt = ctx.measureText(label).width;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(cx - wTxt / 2 - c * 0.06, cy + rad + c * 0.08, wTxt + c * 0.12, c * 0.26);
    ctx.fillStyle = '#f1f1e8';
    ctx.fillText(label, cx, cy + rad + c * 0.1);
  }
  ctx.restore();
}
function drawRuler(a, b, speed) {
  const c = cellPx(),
    o = origin(),
    size = b.size || 1;
  const ax = o.x + (a.x + size / 2) * c,
    ay = o.y + (a.y + size / 2) * c,
    bx = o.x + (b.x + size / 2) * c,
    by = o.y + (b.y + size / 2) * c;
  const ft = BC.feet(S.grid, a, { x: BC.snap(b.x), y: BC.snap(b.y) }),
    diff = BC.difficultOnPath(S.grid, S.terrain, a, b),
    over = speed && ft > speed;
  ctx.strokeStyle = over ? '#eb5757' : '#e0be80';
  ctx.lineWidth = 3 / S.view.s;
  ctx.setLineDash([10 / S.view.s, 6 / S.view.s]);
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.stroke();
  ctx.setLineDash([]);
  const text = ft + ' pies' + (diff ? ' · terreno difícil' : '') + (over ? ' · más que tu velocidad' : '');
  ctx.font = `700 ${16 / S.view.s}px Inter, system-ui, sans-serif`;
  const tw = ctx.measureText(text).width;
  ctx.fillStyle = 'rgba(7,16,20,0.85)';
  ctx.fillRect(bx + 14 / S.view.s, by - 30 / S.view.s, tw + 14 / S.view.s, 24 / S.view.s);
  ctx.fillStyle = over ? '#eb5757' : '#e0be80';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, bx + 21 / S.view.s, by - 18 / S.view.s);
}
function addPing(x, y, color = '#e0be80', name = '') {
  S.pings.push({ x, y, color, name, at: performance.now() });
  S.dirty = true;
}
function drawPings() {
  const now = performance.now();
  S.pings = S.pings.filter(p => now - p.at < 2200);
  for (const p of S.pings) {
    const k = (now - p.at) / 2200;
    for (const off of [0, 0.3]) {
      const kk = (k + off) % 1;
      ctx.strokeStyle = hexA(/^#[0-9a-f]{6}$/i.test(p.color) ? p.color : '#e0be80', 1 - kk);
      ctx.lineWidth = 4 / S.view.s;
      ctx.beginPath();
      ctx.arc(p.x, p.y, (12 + kk * 70) / S.view.s, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (p.name) {
      ctx.fillStyle = '#f1f1e8';
      ctx.font = `700 ${14 / S.view.s}px Inter, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(p.name, p.x, p.y - 26 / S.view.s);
    }
  }
}

// ---------- Entrada (mouse, lápiz y dedos) ----------
const pointers = new Map();
let pinch = null,
  press = null;
const canMove = t =>
  !TV && (S.isDM ? !S.asPlayer || myCharacters().includes(t.character_id) : myCharacters().includes(t.character_id));
function hitToken(w) {
  const c = cellPx(),
    o = origin();
  const list = visibleTokens().slice().reverse();
  return list.find(t => {
    const p = tokenPos(t),
      size = t.size || 1,
      cx = o.x + (p.x + size / 2) * c,
      cy = o.y + (p.y + size / 2) * c;
    return Math.hypot(w.x - cx, w.y - cy) <= (size * c) / 2;
  });
}
function local(e) {
  const r = canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}
canvas.addEventListener('pointerdown', e => {
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, local(e));
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), m: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
    S.drag = null;
    clearTimeout(press?.timer);
    return;
  }
  if (!S.mapId) return;
  const p = local(e),
    w = toWorld(p.x, p.y),
    cell = toCell(w);
  press = { p, at: performance.now(), moved: false, timer: 0 };
  const tool = S.tool;
  if (tool === 'move' || tool === 'tokens') {
    const t = hitToken(w);
    if (t && canMove(t))
      S.drag = { token: { ...t }, from: { x: t.x, y: t.y }, grab: { x: w.x, y: w.y }, start: { x: t.x, y: t.y } };
    else S.drag = { pan: { x: S.view.x, y: S.view.y, p }, tap: t?.id || null };
    // Mantener apretado en un lugar vacío: señal para todos.
    press.timer = setTimeout(() => {
      if (!press?.moved && !S.drag?.token) {
        ping(w);
        S.drag = null;
        press = null;
      }
    }, 550);
  } else if (tool === 'ruler') S.drag = { ruler: { a: cell, b: cell } };
  else if (tool === 'ping') ping(w);
  else if (tool === 'fog' && S.isDM) {
    if (S.fogMode === 'room') revealRoom(cell);
    else if (S.fogMode === 'rect' || S.fogMode === 'rect-hide') S.drag = { rect: { a: cell, b: cell }, fog: true };
    else {
      S.drag = { brush: true };
      fogBrush(cell);
    }
  } else if (tool === 'paint' && S.isDM) {
    if (S.paintMode === 'brush') {
      S.drag = { brush: true };
      paintBrush(cell);
    } else S.drag = { rect: { a: cell, b: cell }, paint: true };
  }
  S.dirty = true;
});
canvas.addEventListener('pointermove', e => {
  if (!pointers.has(e.pointerId)) return hover(e);
  pointers.set(e.pointerId, local(e));
  if (pinch && pointers.size === 2) {
    const [a, b] = [...pointers.values()],
      d = Math.hypot(a.x - b.x, a.y - b.y),
      m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    zoomAt(m.x, m.y, d / pinch.d);
    S.view.x += m.x - pinch.m.x;
    S.view.y += m.y - pinch.m.y;
    pinch = { d, m };
    return;
  }
  const p = local(e),
    w = toWorld(p.x, p.y),
    cell = toCell(w);
  if (press && Math.hypot(p.x - press.p.x, p.y - press.p.y) > 6) {
    press.moved = true;
    clearTimeout(press.timer);
  }
  const d = S.drag;
  if (!d) return;
  if (d.pan && press?.moved) {
    S.view.x = d.pan.x + p.x - d.pan.p.x;
    S.view.y = d.pan.y + p.y - d.pan.p.y;
  } else if (d.token) {
    const c = cellPx();
    d.token.x = d.start.x + (w.x - d.grab.x) / c;
    d.token.y = d.start.y + (w.y - d.grab.y) / c;
    sendDrag(d.token);
  } else if (d.ruler) d.ruler.b = cell;
  else if (d.rect) d.rect.b = cell;
  else if (d.brush) S.tool === 'fog' ? fogBrush(cell) : paintBrush(cell);
  S.dirty = true;
});
function endPointer(e) {
  pointers.delete(e.pointerId);
  if (pinch) {
    if (pointers.size < 2) pinch = null;
    return;
  }
  clearTimeout(press?.timer);
  const d = S.drag;
  S.drag = null;
  if (d?.token) dropToken(d);
  else if (d?.pan && !press?.moved) {
    S.sel = d.tap;
    card();
  } else if (d?.rect && d.fog) {
    const cells = BC.rect(d.rect.a.x, d.rect.a.y, d.rect.b.x, d.rect.b.y);
    S.fog = BC.setFog(S.grid, S.fog, cells, S.fogMode === 'rect');
    saveSoon(fogPatch());
  } else if (d?.rect && d.paint) {
    const { a, b } = d.rect;
    if (S.paintMode === 'room') {
      S.terrain = BC.paint(S.grid, S.terrain, BC.rect(a.x, a.y, b.x, b.y), S.paintCode === '.' ? '.' : S.paintCode);
      S.terrain = BC.paint(S.grid, S.terrain, BC.outline(a.x, a.y, b.x, b.y), '#');
    } else S.terrain = BC.paint(S.grid, S.terrain, BC.rect(a.x, a.y, b.x, b.y), S.paintCode);
    saveSoon(terrainPatch());
  }
  press = null;
  S.dirty = true;
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);
canvas.addEventListener(
  'wheel',
  e => {
    e.preventDefault();
    const p = local(e);
    zoomAt(p.x, p.y, Math.exp(-e.deltaY * 0.0015));
  },
  { passive: false },
);
canvas.addEventListener('contextmenu', e => e.preventDefault());
function hover(e) {
  if (!['move', 'tokens'].includes(S.tool) || TV) return;
  const t = hitToken(toWorld(local(e).x, local(e).y));
  canvas.style.cursor = t && canMove(t) ? 'grab' : 'default';
}
let lastSend = 0;
function sendDrag(t) {
  const now = performance.now();
  if (now - lastSend < 80) return;
  lastSend = now;
  S.channel?.send({ t: 'drag', id: t.id, map: S.mapId, x: t.x, y: t.y });
}
async function dropToken(d) {
  const t = d.token,
    size = t.size || 1;
  const x = Math.max(0, Math.min(S.grid.cols - Math.max(1, size), Math.round(t.x))),
    y = Math.max(0, Math.min(S.grid.rows - Math.max(1, size), Math.round(t.y)));
  const moved = x !== d.start.x || y !== d.start.y;
  S.channel?.send({ t: 'drop', id: t.id });
  if (!moved) {
    S.sel = t.id;
    return card();
  }
  const before = S.tokens.find(k => k.id === t.id);
  S.tokens = S.tokens.map(k => (k.id === t.id ? { ...k, x, y } : k));
  S.sel = t.id;
  card();
  try {
    const rows = await Cloud.updateToken(t.id, { x, y });
    if (!rows.length) throw Error('No podés mover esa ficha.');
  } catch (e) {
    S.tokens = S.tokens.map(k => (k.id === t.id ? before : k));
    toast(e.message);
  }
  S.dirty = true;
}
function ping(w) {
  const me = (S.party?.characters || []).find(c => c.owner_id === S.me?.id);
  const name = S.isDM && !TV ? 'DM' : me?.name || '';
  const color = me ? BC.colorFor(me.id, 'pc') : '#e0be80';
  addPing(w.x, w.y, color, name);
  S.channel?.send({ t: 'ping', map: S.mapId, x: w.x, y: w.y, color, name });
}

// ---------- Herramientas del DM: niebla y terreno ----------
function fogBrush(cell) {
  const cells = BC.brush(cell.x, cell.y, S.radius);
  S.fog = BC.setFog(S.grid, S.fog, cells, S.fogMode === 'reveal');
  saveSoon(fogPatch());
}
function revealRoom(cell) {
  const cells = BC.room(S.grid, S.terrain, S.walls, cell.x, cell.y);
  if (!cells.length) return;
  S.fog = BC.setFog(S.grid, S.fog, cells, true);
  saveSoon(fogPatch());
  hint(`Revelaste ${cells.length} casillas.`);
}
function paintBrush(cell) {
  S.terrain = BC.paint(S.grid, S.terrain, BC.brush(cell.x, cell.y, S.radius), S.paintCode);
  saveSoon(terrainPatch());
}

// ---------- Interfaz ----------
function ui() {
  topBar();
  tools();
  panel();
  card();
  turn();
  S.dirty = true;
}
function topBar() {
  const m = currentMap(),
    live = m && m.id === activeId();
  const back = S.isDM ? `./dm.html#${encodeURIComponent(S.id)}` : './#table';
  $('#board-top').innerHTML = TV
    ? `<span class="board-title">${esc(m?.name || 'Esperando un mapa…')}</span><button type="button" class="icon-btn" data-action="fullscreen" title="Pantalla completa" aria-label="Pantalla completa">⛶</button>`
    : `<a class="icon-btn" href="${back}" aria-label="Volver" title="Volver">←</a><div class="board-title"><span class="eyebrow">${esc(S.party?.campaign.name || 'TABLERO')}</span><b>${esc(m?.name || (S.isDM ? 'Sin mapa' : 'Esperando al DM'))}</b>${S.isDM && m ? `<span class="tag ${live ? '' : 'warn'}">${live ? 'En la mesa' : 'Solo vos'}</span>` : ''}</div><div class="board-top-actions">${S.isDM ? (m && !live ? button('Mostrar a la mesa', 'go-live', '') : '') + button('Mapas', 'maps') + button(S.asPlayer ? 'Vista DM' : 'Ver como jugador', 'as-player') + button('📺 Tele', 'tv') : button(S.follow ? 'Siguiendo al DM' : 'Seguir al DM', 'follow')}<button type="button" class="icon-btn" data-action="fit" title="Ver todo el mapa" aria-label="Ver todo el mapa">⤢</button></div>`;
}
function tools() {
  if (TV) return ($('#board-tools').innerHTML = '');
  const t = (id, icon, label) =>
    `<button type="button" class="board-tool ${S.tool === id ? 'on' : ''}" data-action="tool" data-tool="${id}" aria-pressed="${S.tool === id}"><span aria-hidden="true">${icon}</span>${label}</button>`;
  $('#board-tools').innerHTML =
    t('move', '✋', 'Mover') +
    t('ruler', '📏', 'Medir') +
    t('ping', '📍', 'Señalar') +
    (S.isDM && S.mapId && !S.asPlayer
      ? t('fog', '🌫', 'Niebla') + t('paint', '🧱', 'Terreno') + t('tokens', '♟', 'Fichas')
      : '');
  hint(
    {
      move: S.isDM
        ? 'Arrastrá cualquier ficha. Mantené apretado para señalar.'
        : 'Arrastrá tu ficha. Mantené apretado para señalar.',
      ruler: 'Arrastrá para medir en pies.',
      ping: 'Tocá el mapa para señalar un lugar a todos.',
      fog: 'Pintá para revelar u ocultar. «Sala» revela un cuarto entero hasta sus muros.',
      paint: 'Elegí un terreno y pintá. «Sala» traza muros alrededor y rellena el piso.',
      tokens: 'Tocá una ficha para editarla.',
    }[S.tool] || '',
  );
}
function panel() {
  const el = $('#board-panel');
  const chip = (action, value, label, on, extra = '') =>
    `<button type="button" class="chip ${on ? 'selected' : ''}" data-action="${action}" data-v="${esc(value)}" aria-pressed="${on}" ${extra}>${label}</button>`;
  const sizes = [0, 1, 2, 3].map(r => chip('radius', r, ['1', '3', '5', '7'][r], S.radius === r)).join('');
  let html = '';
  if (S.tool === 'fog' && S.isDM) {
    html = `<div class="board-row"><label class="check"><input type="checkbox" data-action="fog-on" ${S.fogOn ? 'checked' : ''}>Niebla activa</label></div><div class="chips">${[
      ['reveal', 'Revelar'],
      ['hide', 'Ocultar'],
      ['room', 'Sala'],
      ['rect', 'Rect. revelar'],
      ['rect-hide', 'Rect. ocultar'],
    ]
      .map(([v, l]) => chip('fog-mode', v, l, S.fogMode === v))
      .join(
        '',
      )}</div><div class="chips"><span class="small muted">Pincel</span>${sizes}</div><div class="actions">${button('Revelar todo', 'fog-all')}${button('Cubrir todo', 'fog-none')}</div>`;
  } else if (S.tool === 'paint' && S.isDM) {
    html = `<div class="chips terrain-chips">${BC.TERRAIN.map(
      t =>
        `<button type="button" class="chip ${S.paintCode === t.code ? 'selected' : ''}" data-action="paint-code" data-v="${esc(t.code)}"><i style="background:${t.color || 'transparent'}"></i>${esc(t.name)}</button>`,
    ).join('')}</div><div class="chips">${[
      ['brush', 'Pincel'],
      ['rect', 'Rectángulo'],
      ['room', 'Sala con muros'],
    ]
      .map(([v, l]) => chip('paint-mode', v, l, S.paintMode === v))
      .join(
        '',
      )}</div>${S.paintMode === 'brush' ? `<div class="chips"><span class="small muted">Pincel</span>${sizes}</div>` : ''}${S.walls.length ? `<label class="check"><input type="checkbox" data-action="walls" ${S.showWalls ? 'checked' : ''}>Ver paredes importadas (${S.walls.length})</label>` : ''}`;
  } else if (S.tool === 'tokens' && S.isDM) {
    const list = mapTokens().sort((a, b) => a.name.localeCompare(b.name, 'es'));
    html = `<div class="actions">${button('+ PNJ', 'token-new', '', 'data-kind="npc"')}${button('+ Objeto', 'token-new', 'secondary', 'data-kind="object"')}${S.mapId === activeId() ? button('Traer a la party', 'ensure') : ''}</div><div class="board-token-list">${
      list
        .map(
          t =>
            `<button type="button" class="board-token-row ${S.sel === t.id ? 'on' : ''}" data-action="select" data-id="${t.id}"><i style="background:${esc(t.color || '#888')}">${esc(t.label)}</i><span>${esc(t.name)}</span>${t.hidden ? '<small>oculta</small>' : ''}</button>`,
        )
        .join('') || '<p class="small muted">Sin fichas en este mapa.</p>'
    }</div>`;
  }
  el.hidden = !html;
  // Plegable: el panel no tapa el mapa mientras pintás.
  const title = { fog: 'Niebla', paint: 'Terreno', tokens: 'Fichas' }[S.tool] || '';
  el.classList.toggle('min', S.panelMin);
  el.innerHTML = html
    ? `<div class="board-panel-head"><b>${title}</b><button type="button" class="icon-btn" data-action="panel-min" aria-expanded="${!S.panelMin}" aria-label="${S.panelMin ? 'Mostrar opciones' : 'Plegar opciones'}">${S.panelMin ? '▴' : '▾'}</button></div>${S.panelMin ? '' : html}`
    : '';
}
function card() {
  const el = $('#board-card'),
    t = S.tokens.find(x => x.id === S.sel && x.map_id === S.mapId);
  if (!t || TV) {
    el.hidden = true;
    return;
  }
  const d = info(t),
    dm = S.isDM && !S.asPlayer;
  el.hidden = false;
  el.innerHTML = `<div class="board-card-head"><i style="background:${esc(t.color || '#888')}">${esc(t.label)}</i><div><b>${esc(t.name)}</b><p class="small muted">${{ pc: 'Personaje', monster: 'Criatura', npc: 'PNJ', object: 'Objeto' }[t.kind]}${d.status ? ' · ' + esc(d.status) : ''}${d.conditions.length ? ' · ' + esc(d.conditions.join(', ')) : ''}</p></div><button type="button" class="icon-btn" data-action="deselect" aria-label="Cerrar">×</button></div>${
    dm
      ? `<div class="actions">${button(t.hidden ? 'Mostrar' : 'Ocultar', 'token-hide', 'secondary', `data-id="${t.id}"`)}${button('Tamaño −', 'token-size', 'secondary', `data-id="${t.id}" data-d="-1"`)}${button('Tamaño +', 'token-size', 'secondary', `data-id="${t.id}" data-d="1"`)}${button('Editar', 'token-edit', 'secondary', `data-id="${t.id}"`)}${button('Quitar', 'token-remove', 'danger', `data-id="${t.id}"`)}</div>`
      : ''
  }`;
}
function turn() {
  const el = $('#board-turn'),
    enc = S.party?.encounter;
  const cur = enc?.active ? (S.party.combatants || []).find(c => c.id === enc.current_id) : null;
  el.hidden = !cur;
  if (cur) el.innerHTML = `Ronda ${enc.round} · turno de <b>${esc(cur.hidden && playerView() ? '¿?' : cur.name)}</b>`;
}

// ---------- Acciones ----------
document.addEventListener('click', async e => {
  const el = e.target.closest('[data-action]');
  if (!el || el.tagName === 'INPUT') return;
  const a = el.dataset.action;
  try {
    if (a === 'tool') {
      S.tool = el.dataset.tool;
      if (S.tool !== 'tokens') S.sel = S.sel && S.tool === 'move' ? S.sel : null;
    } else if (a === 'fit') fit();
    else if (a === 'fullscreen') document.documentElement.requestFullscreen?.();
    else if (a === 'follow') S.follow = !S.follow;
    else if (a === 'as-player') S.asPlayer = !S.asPlayer;
    else if (a === 'maps') return mapsDialog();
    else if (a === 'tv') return tvDialog();
    else if (a === 'go-live') await goLive(S.mapId);
    else if (a === 'fog-mode') S.fogMode = el.dataset.v;
    else if (a === 'radius') S.radius = Number(el.dataset.v);
    else if (a === 'fog-all' || a === 'fog-none') {
      S.fog = BC.fogAll(S.grid, a === 'fog-all');
      saveSoon(fogPatch());
    } else if (a === 'paint-code') S.paintCode = el.dataset.v;
    else if (a === 'paint-mode') S.paintMode = el.dataset.v;
    else if (a === 'select') S.sel = el.dataset.id;
    else if (a === 'deselect') S.sel = null;
    else if (a === 'ensure') await ensureTokens();
    else if (a === 'token-new') return tokenDialog(null, el.dataset.kind);
    else if (a === 'token-edit') return tokenDialog(S.tokens.find(t => t.id === el.dataset.id));
    else if (a === 'token-hide') {
      const t = S.tokens.find(x => x.id === el.dataset.id);
      await patchToken(t, { hidden: !t.hidden });
      S.channel?.send({ t: 'refresh' });
    } else if (a === 'token-size') {
      const t = S.tokens.find(x => x.id === el.dataset.id),
        steps = [0.5, 1, 2, 3, 4],
        i = Math.max(0, steps.indexOf(t.size)) + Number(el.dataset.d);
      await patchToken(t, { size: steps[Math.max(0, Math.min(steps.length - 1, i))] });
    } else if (a === 'token-remove') {
      const t = S.tokens.find(x => x.id === el.dataset.id);
      if (!confirm(`¿Quitar «${t.name}» del mapa?`)) return;
      await Cloud.removeToken(t.id);
      S.tokens = S.tokens.filter(x => x.id !== t.id);
      S.sel = null;
    } else if (a === 'map-open') {
      $('#modal').close();
      await openMap(el.dataset.id);
    } else if (a === 'map-live') {
      $('#modal').close();
      await openMap(el.dataset.id);
      await goLive(el.dataset.id);
    } else if (a === 'map-new') return newMapDialog();
    else if (a === 'map-edit') return mapEditDialog(S.maps.find(m => m.id === el.dataset.id));
    else if (a === 'map-delete') {
      const m = S.maps.find(x => x.id === el.dataset.id);
      if (!confirm(`¿Eliminar el mapa «${m.name}»? Se borran su imagen, su niebla y sus fichas.`)) return;
      await Cloud.deleteMap(m.id, m.image_path);
      S.maps = S.maps.filter(x => x.id !== m.id);
      if (S.mapId === m.id) await openMap(activeId());
      return mapsDialog();
    } else if (a === 'send-view') {
      const r = canvas.getBoundingClientRect(),
        a1 = toWorld(0, 0),
        b1 = toWorld(r.width, r.height);
      S.channel?.send({ t: 'view', map: S.mapId, x: a1.x, y: a1.y, w: b1.x - a1.x, h: b1.y - a1.y });
      toast('La tele y quien siga al DM ven lo mismo que vos.');
    } else if (a === 'copy-tv') {
      await navigator.clipboard?.writeText(el.dataset.url);
      toast('Enlace copiado.');
    } else return;
  } catch (err) {
    toast(err.message);
  }
  ui();
});
document.addEventListener('change', e => {
  const a = e.target.dataset?.action;
  if (a === 'fog-on') {
    S.fogOn = e.target.checked;
    saveSoon(fogPatch());
    ui();
  } else if (a === 'walls') {
    S.showWalls = e.target.checked;
    S.dirty = true;
  }
});
async function patchToken(t, patch) {
  const rows = await Cloud.updateToken(t.id, patch);
  S.tokens = S.tokens.map(x => (x.id === t.id ? rows[0] || { ...x, ...patch } : x));
}
async function goLive(id) {
  await Cloud.setBoardMap(S.id, id);
  S.board = { ...(S.board || { campaign_id: S.id }), map_id: id };
  await ensureTokens();
  toast('La mesa ya ve este mapa.');
}

function mapsDialog() {
  const live = activeId();
  modal(
    'Mapas de la mesa',
    `<p class="small">Preparalos antes de la sesión: los jugadores solo ven el que está <b>en la mesa</b>.</p><div class="board-maps">${
      S.maps
        .map(
          m =>
            `<div class="board-map-row ${m.id === S.mapId ? 'on' : ''}"><div><b>${esc(m.name)}</b><p class="small muted">${m.image_path ? 'Imagen' : 'Terreno'} · ${BC.normGrid(m.grid).cols}×${BC.normGrid(m.grid).rows} casillas${m.fog?.on ? ' · niebla' : ''}</p></div>${m.id === live ? '<span class="tag">En la mesa</span>' : ''}<div class="actions">${button('Abrir', 'map-open', 'secondary', `data-id="${m.id}"`)}${m.id === live ? '' : button('Mostrar a la mesa', 'map-live', '', `data-id="${m.id}"`)}${button('Ajustes', 'map-edit', 'secondary', `data-id="${m.id}"`)}${button('Eliminar', 'map-delete', 'text-btn danger-text', `data-id="${m.id}"`)}</div></div>`,
        )
        .join('') || '<p class="muted">Todavía no hay mapas.</p>'
    }</div><div class="actions">${button('+ Nuevo mapa', 'map-new', '')}</div>`,
  );
}
function tvDialog() {
  const url = location.origin + location.pathname + '?tv=1#' + encodeURIComponent(S.id);
  modal(
    'Tablero en la tele',
    `<ol class="small"><li>En el navegador de la tele (o una compu conectada), abrí este enlace.</li><li>Si no entró nunca a la mesa, pide el código <b class="table-code">${esc(S.party.campaign.code)}</b>: se suma como una pantalla más, sin ficha.</li><li>La tele muestra la vista de los jugadores: con niebla y sin fichas ocultas. Tocá ⛶ para pantalla completa.</li></ol><p><code class="board-url">${esc(url)}</code></p><div class="actions">${button('Copiar enlace', 'copy-tv', '', `data-url="${esc(url)}"`)}<a class="button secondary" href="${esc(url)}" target="_blank" rel="noopener">Abrir acá</a>${button('Enviar mi vista a la tele', 'send-view')}</div><p class="small muted">«Enviar mi vista» encuadra la tele (y a quien siga al DM) en la zona que estás viendo.</p>`,
  );
}

// ---------- Nuevos mapas ----------
function newMapDialog() {
  modal(
    'Nuevo mapa',
    `${field('Nombre', 'name', 'Mapa ' + (S.maps.length + 1), 'text', 'maxlength="100" required')}<fieldset class="board-source"><legend>De dónde sale</legend><label class="check"><input type="radio" name="kind" value="image" checked>Una imagen (JPG, PNG o WebP)</label><label class="check"><input type="radio" name="kind" value="uvtt">Dungeondraft / Dungeon Alchemist (.dd2vtt, .uvtt): trae la cuadrícula y las paredes</label><label class="check"><input type="radio" name="kind" value="blank">En blanco, para pintar el terreno</label></fieldset><label class="field">Archivo<input type="file" name="file" accept="image/*,.dd2vtt,.uvtt,.json"></label>${field('Casillas de ancho de la imagen (si no lo sabés, dejalo y ajustalo después)', 'across', '', 'number', 'min="1" max="200"')}<div class="form-grid">${field('Columnas (en blanco)', 'cols', 30, 'number', 'min="1" max="200"')}${field('Filas (en blanco)', 'rows', 20, 'number', 'min="1" max="200"')}</div><label class="field">Piso inicial (en blanco)<select name="floor">${BC.TERRAIN.filter(
      t => !t.blocks,
    )
      .map(
        t =>
          `<option value="${esc(t.code)}" ${t.code === 'f' ? 'selected' : ''}>${esc(t.code === '.' ? 'Vacío' : t.name)}</option>`,
      )
      .join(
        '',
      )}</select></label><p class="small muted">Las imágenes se achican a ${MAX_IMAGE} px de lado y se guardan en WebP para que carguen rápido en el celular.</p>`,
    async fd => {
      const name = String(fd.get('name')).trim() || 'Mapa',
        kind = fd.get('kind'),
        file = fd.get('file');
      let row = { name, sort: S.maps.length };
      if (kind === 'blank') {
        const grid = BC.normGrid({ cols: fd.get('cols'), rows: fd.get('rows'), size: CELL });
        row = {
          ...row,
          grid,
          terrain: { cells: BC.cells(grid, String(fd.get('floor')).repeat(grid.cols * grid.rows)), walls: [] },
        };
      } else {
        if (!file?.size) throw Error('Elegí un archivo.');
        hintModal('Procesando el mapa…');
        let source = file,
          grid,
          walls = [];
        if (kind === 'uvtt' || /\.(dd2vtt|uvtt|json)$/i.test(file.name)) {
          const m = BC.parseUVTT(await file.text());
          source = m.image;
          grid = m.grid;
          walls = m.walls;
        }
        const img = await shrink(source);
        if (grid) grid = BC.normGrid({ ...grid, size: grid.size * img.scale });
        else {
          const across = Number(fd.get('across')) || Math.round(img.width / 70) || 20;
          grid = BC.gridForImage(img.width, img.height, img.width / across);
        }
        const path = await Cloud.uploadMapImage(S.id, img.blob, img.ext);
        row = { ...row, image_path: path, grid, terrain: { cells: '', walls } };
      }
      row.fog = { on: false };
      const made = await Cloud.saveMap(S.id, row);
      S.maps = [...S.maps, made];
      await openMap(made.id);
      if (!activeId()) await goLive(made.id);
      toast(kind === 'image' ? 'Mapa listo. Revisá la cuadrícula en «Mapas → Ajustes».' : 'Mapa listo.');
    },
    'Crear mapa',
  );
}
function hintModal(text) {
  const el = $('#form-error');
  if (el) el.textContent = text;
}
// Imagen → WebP de hasta MAX_IMAGE px de lado. Devuelve el factor de escala para ajustar la cuadrícula.
async function shrink(source) {
  const img = new Image();
  const url = typeof source === 'string' ? source : URL.createObjectURL(source);
  await new Promise((ok, fail) => {
    img.onload = ok;
    img.onerror = () => fail(Error('No se pudo leer la imagen.'));
    img.src = url;
  });
  const scale = Math.min(1, MAX_IMAGE / Math.max(img.naturalWidth, img.naturalHeight)),
    w = Math.round(img.naturalWidth * scale),
    h = Math.round(img.naturalHeight * scale);
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  cv.getContext('2d').drawImage(img, 0, 0, w, h);
  let blob = await new Promise(ok => cv.toBlob(ok, 'image/webp', 0.84)),
    ext = 'webp';
  if (!blob || blob.type !== 'image/webp') {
    blob = await new Promise(ok => cv.toBlob(ok, 'image/jpeg', 0.86));
    ext = 'jpg';
  }
  if (typeof source !== 'string') URL.revokeObjectURL(url);
  if (blob.size > 10 * 1024 * 1024) throw Error('La imagen sigue siendo muy pesada (más de 10 MB).');
  return { blob, ext, width: w, height: h, scale };
}

// ---------- Ajustes del mapa (cuadrícula con vista previa) ----------
function mapEditDialog(m) {
  if (!m) return;
  const g = BC.normGrid(m.grid);
  modal(
    'Ajustes del mapa',
    `${field('Nombre', 'name', m.name, 'text', 'maxlength="100" required')}${
      m.image_path
        ? `<p class="small">Hacé coincidir la cuadrícula con la del dibujo: primero el tamaño de la casilla, después el desfase. Se ve en vivo detrás de esta ventana.</p><div class="form-grid">${field('Tamaño de casilla (px)', 'size', +g.size.toFixed(2), 'number', 'min="8" max="1000" step="0.1" data-live')}${field('Desfase X (px)', 'ox', +g.ox.toFixed(1), 'number', 'step="0.5" data-live')}${field('Desfase Y (px)', 'oy', +g.oy.toFixed(1), 'number', 'step="0.5" data-live')}</div><div class="form-grid">${field('Columnas', 'cols', g.cols, 'number', 'min="1" max="200" data-live')}${field('Filas', 'rows', g.rows, 'number', 'min="1" max="200" data-live')}</div><div class="actions">${button('Calcular columnas y filas', 'grid-auto')}</div>`
        : `<div class="form-grid">${field('Columnas', 'cols', g.cols, 'number', 'min="1" max="200"')}${field('Filas', 'rows', g.rows, 'number', 'min="1" max="200"')}</div>`
    }<div class="form-grid">${field('Pies por casilla', 'feet', g.feet, 'number', 'min="1" max="100"')}<label class="field">Color de la cuadrícula<input type="color" name="color" value="${esc(g.color)}" data-live></label>${field('Opacidad', 'opacity', g.opacity, 'range', 'min="0" max="1" step="0.05" data-live')}</div><label class="check"><input type="checkbox" name="show" ${g.show ? 'checked' : ''} data-live>Mostrar cuadrícula</label>`,
    async fd => {
      const grid = readGrid(fd, g);
      // Cambiar columnas o filas reacomoda terreno y niebla.
      const terrain = { cells: resizeCells(m, g, grid), walls: m.terrain?.walls || [] };
      const fog = { on: !!m.fog?.on, revealed: resizeFog(m, g, grid) };
      const row = await Cloud.saveMap(
        S.id,
        { name: String(fd.get('name')).trim() || m.name, grid, terrain, fog },
        m.id,
      );
      S.maps = S.maps.map(x => (x.id === m.id ? row : x));
      if (S.mapId === m.id) loadMapFields(row);
      ui();
    },
  );
  const form = $('#dialog-form');
  // Diálogo al costado y sin oscurecer: la cuadrícula se ve mientras se ajusta.
  $('#modal').classList.add('board-side');
  $('#modal').addEventListener('close', () => $('#modal').classList.remove('board-side'), { once: true });
  // Vista previa: el mapa detrás del diálogo se redibuja con cada cambio.
  const live = () => {
    if (S.mapId !== m.id) return;
    S.grid = readGrid(new FormData(form), g);
    S.terrain = BC.cells(S.grid, resizeCells(m, g, S.grid));
    S.dirty = true;
  };
  form.addEventListener('input', live);
  form.querySelector('[data-action=grid-auto]')?.addEventListener('click', () => {
    const fd = new FormData(form),
      size = Number(fd.get('size')) || g.size;
    form.elements.cols.value = Math.max(1, Math.round(((S.img?.width || 0) - (Number(fd.get('ox')) || 0)) / size));
    form.elements.rows.value = Math.max(1, Math.round(((S.img?.height || 0) - (Number(fd.get('oy')) || 0)) / size));
    live();
  });
  $('#modal').addEventListener('close', () => S.mapId === m.id && loadMapFields(S.maps.find(x => x.id === m.id)), {
    once: true,
  });
}
function readGrid(fd, g) {
  return BC.normGrid({
    ...g,
    size: fd.has('size') ? fd.get('size') : g.size,
    ox: fd.has('ox') ? fd.get('ox') : g.ox,
    oy: fd.has('oy') ? fd.get('oy') : g.oy,
    cols: fd.get('cols'),
    rows: fd.get('rows'),
    feet: fd.get('feet') || g.feet,
    color: fd.get('color') || g.color,
    opacity: Number(fd.get('opacity') ?? g.opacity),
    show: fd.has('show'),
  });
}
function resizeCells(m, from, to) {
  const src = BC.cells(from, m.terrain?.cells || '');
  let out = '';
  for (let y = 0; y < to.rows; y++) for (let x = 0; x < to.cols; x++) out += BC.at(from, src, x, y);
  return out;
}
function resizeFog(m, from, to) {
  const src = BC.fogBits(from, m.fog?.revealed || ''),
    list = [];
  for (let y = 0; y < to.rows; y++)
    for (let x = 0; x < to.cols; x++) if (BC.isRevealed(from, src, x, y)) list.push([x, y]);
  return BC.fogEncode(BC.setFog(to, BC.fogBits(to, ''), list, true));
}

// ---------- Fichas a mano: PNJ y objetos ----------
function tokenDialog(t, kind = t?.kind) {
  const isNew = !t;
  modal(
    isNew ? (kind === 'object' ? 'Nuevo objeto' : 'Nuevo PNJ') : 'Editar ficha',
    `${field('Nombre', 'name', t?.name || '', 'text', 'maxlength="100" required')}<div class="form-grid">${field('Letras o emoji', 'label', t?.label || (kind === 'object' ? '📦' : ''), 'text', 'maxlength="4"')}<label class="field">Color<input type="color" name="color" value="${esc(/^#[0-9a-f]{6}$/i.test(t?.color || '') ? t.color : kind === 'object' ? '#9e9e9e' : '#83c8bd')}"></label>${field('Tamaño (casillas)', 'size', t?.size || 1, 'number', 'min="0.5" max="6" step="0.5"')}</div><label class="check"><input type="checkbox" name="hidden" ${t?.hidden ? 'checked' : ''}>Oculta para los jugadores</label>`,
    async fd => {
      const name = String(fd.get('name')).trim();
      if (!name) throw Error('Poné un nombre.');
      const patch = {
        name,
        label: String(fd.get('label') || '').trim() || BC.initials(name),
        color: fd.get('color'),
        size: Math.max(0.5, Math.min(6, Number(fd.get('size')) || 1)),
        hidden: fd.has('hidden'),
      };
      if (isNew) {
        const r = canvas.getBoundingClientRect(),
          center = toCell(toWorld(r.width / 2, r.height / 2));
        const p = BC.freeSpot(S.grid, mapTokens(), center, S.terrain);
        const [row] = await Cloud.addTokens([tokenRow({ ...patch, kind, ...p }, S.mapId)]);
        S.tokens.push(row);
        S.sel = row.id;
      } else {
        await patchToken(t, patch);
        if (patch.hidden !== t.hidden) S.channel?.send({ t: 'refresh' });
      }
      ui();
    },
    isNew ? 'Agregar' : 'Guardar',
  );
}

// ---------- Inicio ----------
new ResizeObserver(resize).observe($('#stage'));
window.addEventListener('hashchange', () => location.reload());
document.addEventListener('keydown', e => {
  if (e.target.closest('input, textarea, select') || $('#modal').open) return;
  if (e.key === 'Escape') {
    S.sel = null;
    card();
  }
  if (e.key === '+' || e.key === '=') zoomAt(canvas.clientWidth / 2, canvas.clientHeight / 2, 1.2);
  if (e.key === '-') zoomAt(canvas.clientWidth / 2, canvas.clientHeight / 2, 1 / 1.2);
  if ((e.key === 'Delete' || e.key === 'Backspace') && S.sel && S.isDM && !S.asPlayer)
    document.querySelector('[data-action=token-remove]')?.click();
  S.dirty = true;
});
resize();
requestAnimationFrame(draw);
start().catch(e => message(`<h1>No se pudo abrir el tablero</h1><p>${esc(e.message)}</p>`));
