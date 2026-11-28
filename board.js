/* Tablero de la mesa: mapa con cuadrícula, fichas que se mueven en vivo, niebla de guerra y terreno.
   El DM prepara mapas (imagen, Dungeondraft/Universal VTT o terreno pintado) y elige cuál ve la mesa.
   Cada jugador mueve solo su ficha. Con ?tv=1 es una pantalla para la tele: vista de jugador, sin herramientas.
   También se abre dentro de la ficha (app.html) y de la pantalla del DM (dm.html): Board.open(mesa, ganchos).
   Ahí suma el combate: objetivo tocando fichas, flanqueo, alcance y ataques de oportunidad. */
(function () {
  'use strict';
  const BC = BoardCore,
    BP = globalThis.BoardProps || null,
    esc = PartyView.esc,
    $ = s => document.querySelector(s);
  // board.html: página propia. En la ficha o la pantalla del DM, el tablero se monta encima al abrirlo.
  const STANDALONE = document.body.classList.contains('board-page');
  const params = new URLSearchParams(location.search);
  const PLAYER_SCREEN = STANDALONE && params.has('players');
  const TV = STANDALONE && (params.has('tv') || PLAYER_SCREEN);
  if (PLAYER_SCREEN) {
    document.body.classList.add('board-tv', 'player-screen');
    document.title = 'Pantalla para jugadores';
    window.addEventListener('storage', e => {
      if (e.key === 'dnd-calendar-update-' + S.id) onParty('calendar');
    });
  }
  const CELL = Miniatures.boardCell;
  const MAX_IMAGE = 4096; // lado máximo de la imagen guardada

  const S = {
    id: STANDALONE ? decodeURIComponent(location.hash.slice(1)) : '',
    me: null,
    party: null,
    isDM: false,
    asPlayer: TV, // el DM puede ver como jugador; la tele siempre
    board: null,
    maps: [],
    tokens: [],
    prepared: [],
    mapId: null, // mapa que se está viendo (el DM puede editar uno que no está en la mesa)
    grid: BC.normGrid(),
    terrain: '',
    walls: [],
    props: [], // muebles y objetos de escena: [x, y, id, giro]
    propId: 'table', // pieza elegida para colocar, o 'move' / 'erase'
    propRot: 0,
    propGroup: 'inn',
    propHover: null,
    links: {}, // escaleras que llevan a otro mapa: { 'x,y': idDelMapa }
    fogOn: false,
    fog: null,
    img: null,
    imgPath: '',
    view: { s: 1, x: 0, y: 0 },
    fitted: false,
    tool: 'move',
    spell: 'fire',
    sheetSpell: '',
    casts: [],
    spellCasts: [],
    spellAim: null,
    fogMode: 'reveal',
    paintCode: 'f',
    paintMode: 'brush',
    radius: 0,
    showWalls: true,
    // Herramienta «Paredes»: qué se traza, si se apoya en las esquinas, el trazo en curso y lo que se puede deshacer.
    wallMode: 'wall',
    wallSnap: true,
    wallChain: null, // último punto del trazo en curso (en casillas)
    wallAim: null, // dónde caería el próximo punto
    wallHover: -1, // tramo bajo el puntero (cambiar tipo o borrar)
    wallDraw: null, // tramo que se está arrastrando
    wallUndo: [],
    // Luz del mapa: zonas pintadas (una letra por casilla), luces fijas invisibles y la luz de cada monstruo.
    ambient: '',
    fixedLights: [], // [[x, y, pies], …]
    tokenLights: {}, // { idDeFicha: pies } (monstruos)
    lightMode: 'b', // b / d / n / '.' pintan zonas; 'place' y 'remove' ponen o quitan luces fijas
    lightFeet: 40,
    sel: null,
    selected: new Set(),
    multiSelect: false,
    aimFacing: false,
    poseUndo: [],
    rotationPreview: new Map(),
    drag: null,
    remote: new Map(), // arrastres de otros: id → {x, y}
    pings: [],
    templates: [], // áreas de efecto a la vista (no se guardan: viajan por el canal en vivo)
    area: { kind: 'circle', feet: 20, width: 5 },
    channel: null,
    follow: TV,
    pending: {},
    saveTimer: 0,
    panelMin: false,
    group: null, // encuentro preparado que se mueve como grupo
    dirty: true,
    target: null, // ficha elegida como objetivo (combate)
    disengaged: new Set(), // criaturas que se destrabaron este turno (DM)
    turnId: null,
    dockMin: matchMedia('(max-width: 600px)').matches, // en el celular empieza plegado: el mapa primero
  };
  let canvas = null,
    ctx = null,
    H = {}, // ganchos de la página que monta el tablero (ficha o pantalla del DM)
    shown = STANDALONE;
  const canvasListeners = [];
  let casting, castDrag;
  let quickPick;
  const onCanvas = (...a) => canvasListeners.push(a);

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
    `<button type="button" class="button ${classes}" data-action="bd-${action}" ${data}>${label}</button>`;
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
  if (STANDALONE)
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
  const cellPx = () => CELL;
  const imageScale = () => CELL / S.grid.size;
  const origin = () => (S.img ? { x: S.grid.ox * imageScale(), y: S.grid.oy * imageScale() } : { x: 0, y: 0 });
  const worldSize = () =>
    S.img
      ? { w: S.img.width * imageScale(), h: S.img.height * imageScale() }
      : { w: S.grid.cols * CELL, h: S.grid.rows * CELL };
  function rememberMaps(rows) {
    const maps = new Map(S.maps.map(row => [row.id, row]));
    for (const row of rows) maps.set(row.id, row);
    S.maps = [...maps.values()].sort((a, b) => a.sort - b.sort || a.created_at?.localeCompare(b.created_at));
  }
  async function refreshPrepared() {
    if (STANDALONE && S.isDM && !TV) {
      const id = S.id;
      try {
        const rows = await Cloud.preparedEncounters(id);
        if (id === S.id) S.prepared = rows.map(row => row.data);
      } catch (err) {
        if (id === S.id) toast(err.message);
      }
    }
  }

  async function start() {
    if (!Cloud.enabled) {
      message(
        '<h1>Mesa compartida no configurada</h1><p>El tablero usa la mesa compartida. Los pasos están en el README, sección «Mesa compartida».</p>',
      );
      return;
    }
    if (!S.id) {
      message(
        `<h1>Abrí el tablero desde tu mesa</h1><p>El DM lo abre desde su pantalla y los jugadores desde <b>Mesa</b> en su ficha.</p><div class="actions"><a class="button" href="./app.html">Ir a mi ficha</a><a class="button secondary" href="./dm.html">Pantalla del DM</a></div>`,
      );
      return;
    }
    const id = S.id;
    try {
      const me = await Cloud.user();
      const party = await Cloud.party(id);
      if (id !== S.id) return;
      Object.assign(S, { me, party });
    } catch (e) {
      if (id !== S.id) return;
      return joinForm(e.message);
    }
    // Abierto desde la ficha de un jugador (actorId), siempre es la vista del jugador: aunque la cuenta
    // sea la del DM (probando en un mismo dispositivo), no muestra PG ocultos ni herramientas del DM.
    S.isDM = !TV && S.party.campaign.dm_id === S.me.id && !H.actorId;
    if (PLAYER_SCREEN) {
      renderPlayerScreen();
      await Cloud.subscribe(id, onParty);
    }
    if (TV) S.asPlayer = true;
    document.body.classList.toggle('board-tv', TV);
    resize();
    try {
      const data = await Cloud.board(id, { liveOnly: TV });
      if (id !== S.id) return;
      Object.assign(S, { board: data.board, maps: data.maps, tokens: data.tokens.map(sizedToken) });
      await openMap(activeId() || (S.isDM ? S.maps[0]?.id : null));
    } catch (e) {
      if (id !== S.id) return;
      if (PLAYER_SCREEN) {
        $('#screen-map-empty').textContent = 'No se pudo cargar el mapa.';
        $('#screen-map-empty').hidden = false;
        topBar();
      } else {
        message(
          `<h1>El tablero todavía no está instalado</h1><p>${esc(e.message)}</p><p class="small">Quien administra la mesa tiene que ejecutar <code>supabase/migrations/008_board.sql</code> en Supabase (SQL Editor) una sola vez.</p>`,
        );
        return;
      }
    }
    const channel = await Cloud.subscribeBoard(id, onBoard, onMessage, () => {
      if (id === S.id) queueMicrotask(() => casting?.connectionChanged());
    });
    if (id !== S.id) return channel.close();
    S.channel = channel;
    casting?.connectionChanged();
    // Dentro de la ficha o la pantalla del DM, la página ya escucha la mesa y avisa con Board.onParty.
    if (STANDALONE && !PLAYER_SCREEN) await Cloud.subscribe(S.id, onParty);
    await refreshPrepared();
    if (S.isDM && !TV) ensureTokens();
    turnChanged();
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
    if (id !== S.mapId) Object.assign(S, { wallChain: null, wallDraw: null, wallHover: -1, wallUndo: [] });
    S.mapId = id;
    S.templates = [];
    S.casts = [];
    S.spellCasts = [];
    spellZones.clear();
    zoneTurn = null;
    S.spellAim = null;
    spellCrumbles.clear();
    teleportFrames.clear();
    weaponAim = null;
    vineAim = null;
    dustAim = null;
    spellClouds = [];
    receivedCasts.clear();
    S.sel = null;
    S.selected.clear();
    S.multiSelect = S.aimFacing = false;
    S.poseUndo = [];
    S.rotationPreview.clear();
    displayFacings.clear();
    hoverToken = null;
    landing.clear();
    S.fitted = false;
    S.touched = false;
    const m = currentMap();
    if (PLAYER_SCREEN) {
      $('#screen-map-empty').textContent = 'Esperando un mapa de la mesa…';
      $('#screen-map-empty').hidden = !!m;
    }
    loadMapFields(m);
    S.img = null;
    S.imgPath = '';
    if (m?.image_path) await loadImage(m.image_path);
    if (m && !TV && Cloud.spellZones) {
      const campaign = S.id;
      Cloud.spellZones(campaign, id)
        .then(events => {
          if (campaign !== S.id || id !== S.mapId) return;
          restoreSpellZones(events);
        })
        .catch(err => console.warn('No se pudieron recuperar las zonas de conjuro.', err));
    }
    fit();
    ui();
    queueEnemyFacing();
  }
  function loadMapFields(m) {
    if (m && S.pending[m.id]) m = { ...m, ...S.pending[m.id].patch };
    S.grid = BC.normGrid(m?.grid || {});
    S.terrain = BC.cells(S.grid, m?.terrain?.cells || '');
    S.walls = BC.normWalls(m?.terrain?.walls);
    S.ambient = BC.ambientCells(S.grid, m?.terrain?.ambient);
    S.fixedLights = BC.normLights(S.grid, m?.terrain?.lights);
    S.tokenLights = BC.normTokenLights(m?.terrain?.tokenLights);
    S.links = BC.links(S.grid, S.terrain, m?.terrain?.links);
    S.props = BP ? BP.norm(S.grid, m?.terrain?.props) : [];
    if (typeof Sound !== 'undefined') Sound.ambient(shown || STANDALONE ? S.grid.ambient : '');
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
  let reloadVersion = 0;
  async function reload() {
    const id = S.id,
      version = ++reloadVersion;
    try {
      const data = await Cloud.board(id, { liveOnly: TV });
      if (id !== S.id || version !== reloadVersion) return;
      const keep = S.mapId;
      Object.assign(S, { board: data.board, maps: data.maps, tokens: data.tokens.map(sizedToken) });
      const want =
        !S.isDM || TV ? activeId() : S.maps.some(m => m.id === keep) ? keep : activeId() || S.maps[0]?.id || null;
      if (want !== S.mapId || (currentMap()?.image_path || '') !== S.imgPath) await openMap(want);
      else loadMapFields(currentMap());
    } catch (e) {
      if (id !== S.id) return;
      toast(e.message);
    }
    ui();
  }

  // Guardado diferido: pintar niebla o terreno no escribe en cada movimiento.
  function saveSoon(patch) {
    const id = S.mapId;
    if (!id) return;
    S.editedAt = performance.now();
    S.pending[id] = { campaign: S.id, patch: { ...S.pending[id]?.patch, ...patch } };
    clearTimeout(S.saveTimer);
    S.saveTimer = setTimeout(flushSave, 450);
  }
  let savingMaps;
  function flushSave() {
    clearTimeout(S.saveTimer);
    return (savingMaps ||= (async () => {
      const failed = new Set();
      let next;
      while ((next = Object.entries(S.pending).find(([id]) => !failed.has(id)))) {
        const [id, write] = next;
        try {
          const row = await Cloud.saveMap(write.campaign, write.patch, id);
          if (S.pending[id] === write) delete S.pending[id];
          if (write.campaign === S.id) rememberMaps([row]);
        } catch (e) {
          failed.add(id);
          toast('Cambios del mapa pendientes: ' + e.message);
        }
      }
    })().finally(() => (savingMaps = null)));
  }
  const fogPatch = () => ({ fog: { on: S.fogOn, revealed: BC.fogEncode(S.fog) } });
  const terrainPatch = () => ({
    terrain: {
      cells: S.terrain,
      walls: S.walls,
      links: BC.links(S.grid, S.terrain, S.links),
      props: S.props,
      ambient: /[bdn]/.test(S.ambient) ? S.ambient : '',
      lights: S.fixedLights,
      // Solo la luz de monstruos que siguen en este mapa.
      tokenLights: Object.fromEntries(
        Object.entries(S.tokenLights).filter(([id]) => mapTokens().some(t => t.id === id && t.kind === 'monster')),
      ),
    },
  });

  // ---------- Fichas automáticas (DM): la party y las criaturas del combate ----------
  let ensuring = false,
    ensureTimer = 0;
  const firstSeen = new Map();
  const lastHidden = new Map();
  const monsterLinks = new Set();
  async function linkPlacedMonsters(on) {
    if (typeof MonsterUI === 'undefined' || !Cloud.linkBoardMonster) return;
    const secrets = new Map((S.party?.secrets || []).map(s => [s.combatant_id, s]));
    const pending = on.filter(
      t =>
        t.kind === 'monster' &&
        !t.character_id &&
        !monsterLinks.has(t.id) &&
        (t.combatant_id ? !secrets.get(t.combatant_id)?.damage_traits : !t.stage || t.stage === 'placed'),
    );
    if (!pending.length) return;
    await MonsterUI.load({ sharedOnly: STANDALONE });
    for (const t of pending) {
      const prior = secrets.get(t.combatant_id);
      const block = prior?.monster_id ? MonsterUI.byId(prior.monster_id) : MonsterUI.byName(t.name);
      if (!block) continue;
      const id = await Cloud.linkBoardMonster(t.id, MonsterUI.profile(block));
      t.combatant_id = id;
      monsterLinks.add(t.id);
    }
  }
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
      await linkPlacedMonsters(on).catch(err => {
        if (!/029_board_monster_combat/.test(err.message)) throw err;
      });
      for (const c of S.party.characters || [])
        if (
          !on.some(x => x.character_id === c.id) &&
          (c.data?.friendlyNpc !== true || S.party.combatants?.some(x => x.character_id === c.id))
        ) {
          const occupied = [...on, ...rows];
          const p = BC.freeSpot(g, occupied, { x: 1, y: Math.floor(g.rows / 2) }, t);
          if (BC.roomFor(g, t, p, occupied))
            rows.push(tokenRow({ kind: 'pc', character_id: c.id, name: c.name, ...p }, map));
        }
      const now = performance.now();
      for (const c of S.party.combatants || []) {
        if (c.board_only) continue;
        if (c.kind !== 'monster') continue;
        // La ficha puede estar en otro mapa (encuentro preparado): no se duplica.
        const tok = S.tokens.find(x => x.combatant_id === c.id);
        if (!firstSeen.has(c.id)) firstSeen.set(c.id, now);
        if (!tok && c.status === 'derrotado') continue;
        if (!tok && now - firstSeen.get(c.id) < 3000) {
          // Recién lanzada: la pantalla del DM puede estar vinculándola con su ficha preparada.
          clearTimeout(ensureTimer);
          ensureTimer = setTimeout(ensureTokens, 3200);
          continue;
        }
        if (!tok) {
          const size = modelFootprint(c.name);
          const occupied = [...on, ...rows];
          const p = BC.freeSpot(g, occupied, { x: g.cols - 2, y: Math.floor(g.rows / 2) }, t, size);
          if (!BC.roomFor(g, t, { ...p, size }, occupied)) continue;
          rows.push(
            tokenRow(
              {
                kind: 'monster',
                combatant_id: c.id,
                character_id: c.character_id,
                name: c.name,
                size,
                hidden: c.hidden,
                ...p,
              },
              map,
            ),
          );
        } else if (lastHidden.has(c.id) && lastHidden.get(c.id) !== c.hidden && tok.hidden !== c.hidden) {
          // El DM reveló (o volvió a ocultar) la criatura en el combate: la ficha la sigue.
          await Cloud.updateToken(tok.id, { hidden: c.hidden });
          tok.hidden = c.hidden;
          S.channel?.send({ t: 'refresh' });
        }
        lastHidden.set(c.id, c.hidden);
      }
      // Fichas de criaturas que ya no están en combate: las preparadas vuelven a esperar ocultas; el resto se quita.
      for (const k of S.tokens.filter(x => x.kind === 'monster' && !x.combatant_id && x.stage !== 'placed')) {
        if (k.stage && !k.hidden) await patchToken(k, { hidden: true });
        else if (!k.stage) {
          await Cloud.removeToken(k.id);
          S.tokens = S.tokens.filter(x => x.id !== k.id);
        }
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
  // Fichas recién creadas: el aviso en vivo puede llegar antes que la respuesta; sin duplicados.
  function addLocal(rows) {
    S.tokens = [...S.tokens.filter(k => !rows.some(r => r.id === k.id)), ...rows.map(sizedToken)];
    S.dirty = true;
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
      ...(x.stage ? { stage: x.stage } : {}),
      ...(x.creature_model ? { creature_model: x.creature_model } : {}),
      ...(x.model_form != null ? { model_form: x.model_form } : {}),
      ...(x.show_hp ? { show_hp: true } : {}),
    };
  }

  // ---------- Tiempo real ----------
  function onBoard(table, p) {
    if (table === 'boards') {
      const was = activeId();
      S.board = p.eventType === 'DELETE' ? null : p.new?.campaign_id ? p.new : S.board;
      if (playerView() && !S.isDM) reload();
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
        if (TV && row.id !== activeId()) return;
        rememberMaps([row]);
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
        if (S.drag?.token?.id === row.id) return; // lo estoy moviendo yo
        const previous = tokenById(row.id);
        if (previous?.updated_at > row.updated_at) return;
        S.tokens = S.tokens.filter(t => t.id !== row.id);
        if (!TV || (!row.hidden && row.map_id === activeId())) S.tokens.push(sizedToken(row));
        S.remote.delete(row.id);
        if (row.map_id === S.mapId && (!previous || previous.x !== row.x || previous.y !== row.y)) queueEnemyFacing();
      }
      if (p.eventType === 'DELETE') {
        S.selected.delete(p.old.id);
        displayFacings.delete(p.old.id);
        missingFacings.delete(p.old.id);
        queueEnemyFacing();
      }
      if (S.sel && !S.tokens.some(t => t.id === S.sel)) S.sel = null;
      if (S.target && !S.tokens.some(t => t.id === S.target)) S.target = null;
      S.dirty = true;
      pick();
    }
  }
  function onMessage(m) {
    if (!m || typeof m !== 'object') return;
    if (m.t === 'drag' && m.map === S.mapId) S.remote.set(m.id, { x: m.x, y: m.y, facing: m.facing });
    if (m.t === 'drop' && S.remote.delete(m.id)) landing.set(m.id, performance.now());
    if (m.t === 'moved') setTimeout(() => onMoved(m), 300); // espera que llegue la posición final
    if (m.t === 'spell' && m.map === S.mapId && m.map === activeId()) addCast(m);
    if (m.t === 'spell-fx' && m.map === S.mapId && m.map === activeId() && addSpellCast(m.cast)) {
      const source = visibleTokens().find(t => t.id === m.cast.caster),
        me = actor();
      if (source && me && enemies(me, source)) {
        if (m.cast.id === 'magic-missile' && m.cast.darts?.includes(me.id))
          offerSpellReaction({ id: 'shield', magicMissile: true });
        else if (Spells.distance(me, source, tokenCenter(source), S.grid.feet) <= 60)
          offerSpellReaction({ id: 'counter', source });
      }
    }
    if (m.t === 'spell-resolution' && m.action === 'pull' && m.map === S.mapId) applySpellPull(m);
    else if (m.t === 'spell-resolution' && m.map === S.mapId && m.map === activeId()) {
      spellResolution(m);
      if (typeof m.saved === 'boolean') casting?.updateSave(m.castId, m.token, m.saved);
    }
    if (
      m.t === 'spell-targets' &&
      m.map === S.mapId &&
      m.map === activeId() &&
      Array.isArray(m.kinds) &&
      Array.isArray(m.targets)
    ) {
      const targets = visibleTokens().filter(token =>
        m.targets
          .slice(0, 100)
          .some(
            t =>
              t &&
              (token.id === t.token ||
                (token.character_id && token.character_id === t.character) ||
                (token.combatant_id && token.combatant_id === t.combatant)),
          ),
      );
      if (m.spell && Spells.implemented(m.spell.id) && targets.length) {
        const caster = visibleTokens().find(t => t.character_id === m.spell.caster);
        const [first] = targets;
        addSpellCast({
          ...m.spell,
          caster: caster?.id,
          targets: targets.map(t => t.id),
          point: { x: first.x + BC.tokenSpan(first) / 2, y: first.y + BC.tokenSpan(first) / 2 },
          element: BoardSceneFX.typeKey(m.kinds[0]),
        });
        return;
      }
      for (const token of targets) {
        for (const type of m.kinds.slice(0, 13))
          if (typeof type === 'string')
            addCast({
              kind: BoardSceneFX.typeKey(type),
              x: Math.floor(token.x + token.size / 2),
              y: Math.floor(token.y + token.size / 2),
            });
      }
    }
    if (m.t === 'ping' && m.map === S.mapId) addPing(m.x, m.y, m.color, m.name);
    if (m.t === 'tpl' && m.map === S.mapId && m.tpl) addTemplate(m.tpl);
    if (m.t === 'tpl-clear' && m.map === S.mapId)
      S.templates = S.templates.filter(t => (m.all ? false : t.by !== m.by));
    if (m.t === 'refresh' && !S.isDM) reload();
    if (m.t === 'door' && m.map === S.mapId) onDoorAsk(m);
    if (m.t === 'wall-door' && m.map === S.mapId) onWallDoorAsk(m);
    if (m.t === 'explored-reset' && typeof m.map === 'string') forgetExplored(m.map);
    if (m.t === 'door-locked' && m.map === S.mapId && m.to === S.me?.id) toast('Esa puerta está trabada.');
    if (m.t === 'view' && S.follow && m.map === S.mapId) fitRect(m.x, m.y, m.w, m.h);
    S.dirty = true;
  }
  let partyTimer = 0,
    partyVersion = 0;
  function onParty(table) {
    if (table === 'presence') return;
    const version = ++partyVersion,
      id = S.id;
    clearTimeout(partyTimer);
    partyTimer = setTimeout(async () => {
      try {
        const party = await Cloud.party(id);
        if (id !== S.id || version !== partyVersion) return;
        S.party = party;
      } catch {
        return;
      }
      if (S.isDM) ensureTokens();
      if (PLAYER_SCREEN) renderPlayerScreen();
      S.dirty = true;
      turnChanged();
      ui();
    }, 250);
  }
  function projectAbility(campaign, spell, targets) {
    if (campaign !== S.id || !S.channel || !S.mapId || S.mapId !== activeId()) return false;
    const m = { t: 'spell-targets', map: S.mapId, kinds: ['magic'], targets, spell };
    onMessage(m);
    S.channel.send(m);
    return true;
  }

  // ---------- Cámara ----------
  function resize() {
    const r = canvas.parentElement.getBoundingClientRect(),
      dpr = window.devicePixelRatio || 1;
    if (!r.width || !r.height) return;
    const prevWidth = canvas.width / dpr,
      prevHeight = canvas.height / dpr;
    const old = S.view;
    const center = toWorld(prevWidth / 2, prevHeight / 2);
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    canvas.style.width = r.width + 'px';
    canvas.style.height = r.height + 'px';
    // Si nadie movió la cámara, se vuelve a encuadrar (por ejemplo, al abrirse el panel de acciones).
    if (!S.fitted || !S.touched) fit();
    else if (
      playerView() &&
      !TV &&
      S.mapId &&
      prevWidth &&
      prevHeight &&
      (Math.abs(prevWidth - r.width) > 1 || Math.abs(prevHeight - r.height) > 1)
    ) {
      const { w, h } = worldSize();
      const wasCovered = old.s * w >= prevWidth - 1 && old.s * h >= prevHeight - 1;
      if (wasCovered) coverView(center.x, center.y, old.s);
    }
    S.dirty = true;
  }
  // Encuadre: el DM ve todo el mapa; con niebla, los jugadores ven la zona revelada.
  function fit() {
    const { w, h } = worldSize();
    S.fitted = true;
    S.touched = false;
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
        if (!TV) return coverView(o.x + ((x0 + x1 + 1) * c) / 2, o.y + ((y0 + y1 + 1) * c) / 2);
        return fitRect(
          o.x + (x0 - pad) * c,
          o.y + (y0 - pad) * c,
          (x1 - x0 + 1 + pad * 2) * c,
          (y1 - y0 + 1 + pad * 2) * c,
        );
      }
    }
    if (playerView() && !TV) {
      const me = actor(),
        o = origin(),
        c = cellPx(),
        p = me && tokenCenter(me);
      coverView(p ? o.x + (p.x + 1.8) * c : w / 2, p ? o.y + p.y * c : h / 2);
    } else fitRect(0, 0, w, h);
  }
  function coverView(x, y, minScale = 0) {
    const r = canvas.getBoundingClientRect(),
      { w, h } = worldSize();
    if (!r.width || !r.height || !w || !h) return;
    const s = Math.max(minScale, r.width / w, r.height / h);
    S.view = {
      s,
      x: Math.min(0, Math.max(r.width - w * s, r.width / 2 - x * s)),
      y: Math.min(0, Math.max(r.height - h * s, r.height / 2 - y * s)),
    };
    S.dirty = true;
  }
  function fitRect(x, y, w, h) {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !w || !h) return;
    const s = Math.min(r.width / w, r.height / h) * 0.96;
    S.view = { s, x: (r.width - w * s) / 2 - x * s, y: (r.height - h * s) / 2 - y * s };
    S.dirty = true;
  }
  const toWorld = (sx, sy) => ({ x: (sx - S.view.x) / S.view.s, y: (sy - S.view.y) / S.view.s });
  // Posición en casillas, con decimales.
  const toCellF = w => {
    const o = origin(),
      c = cellPx();
    return { x: (w.x - o.x) / c, y: (w.y - o.y) / c };
  };
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
    S.touched = true;
    S.dirty = true;
  }

  // ---------- Dibujo ----------
  function info(t) {
    // Datos vivos de la ficha: PG, estados, retrato, turno.
    const out = {
      ring: null,
      dead: false,
      conditions: [],
      portrait: '',
      turn: false,
      status: '',
      speed: 30,
      cls: '',
      color: '',
    };
    const enc = S.party?.encounter,
      current = enc?.active ? (S.party.combatants || []).find(c => c.id === enc.current_id) : null;
    if (t.character_id) {
      const rows = playerView()
        ? S.party?.characters || []
        : [...(S.party?.characters || []), ...(S.party?.enemyNpcs || [])];
      const row = rows.find(c => c.id === t.character_id);
      if (row) {
        const x = summary(row);
        if (!x.broken) {
          out.ring = x.maxHP ? Math.max(0, Math.min(1, (x.hp ?? x.maxHP) / x.maxHP)) : null;
          out.conditions = x.conditions;
          out.portrait = x.portrait;
          out.traits = x.boardTraits;
          out.miniature = x.miniature;
          out.name = x.name || row.name;
          out.cls = x.cls || '';
          out.color = x.color || '';
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
          out.ring =
            { ileso: 1, herido: 0.75, malherido: 0.45, 'a punto de caer': 0.2, derrotado: 0 }[c.status] ?? null;
      }
      out.turn = !!current && current.id === t.combatant_id;
    }
    if (playerView() && t.kind === 'monster') out.ring = t.show_hp ? (t.hp_fraction ?? out.ring) : null;
    return out;
  }
  // Resumen de la ficha (PG, retrato…): se calcula una vez por versión, no en cada cuadro.
  const summaries = new Map();
  function summary(row) {
    const key = row.id + '@' + row.updated_at;
    if (!summaries.has(key)) {
      for (const k of summaries.keys()) if (k.startsWith(row.id + '@')) summaries.delete(k);
      summaries.set(key, PartyView.rowSummary(row));
    }
    return summaries.get(key);
  }
  const portraits = new Map(),
    failedPortraits = new Set();
  function portraitImg(src) {
    if (!src) return null;
    if (!portraits.has(src)) {
      const img = new Image();
      img.onload = () => (S.dirty = true);
      img.onerror = () => {
        failedPortraits.add(src);
        S.dirty = true;
      };
      img.src = src;
      portraits.set(src, img);
    }
    const img = portraits.get(src);
    return img.complete && img.naturalWidth ? img : null;
  }
  function visibleTokens(silhouettes = false) {
    const mine = myCharacters(),
      bits = playerView() ? seen() : null,
      baseline = playerView() && silhouettes && spellClouds.length ? seen(true) : bits;
    return mapTokens().filter(t => {
      if (t.character_id && !spellCrumbles.has(t.id)) {
        const row = S.party?.characters?.find(c => c.id === t.character_id);
        const sheet = row && summary(row);
        if (sheet?.hp === 0 && sheet.effects?.includes('Cuerpo desintegrado')) return false;
      }
      if (!playerView()) return true;
      if (t.hidden || (t.combatant_id && S.party?.combatants?.some(c => c.id === t.combatant_id && c.hidden)))
        return false;
      const c = Math.floor(t.x + BC.tokenSpan(t) / 2),
        r = Math.floor(t.y + BC.tokenSpan(t) / 2);
      const obscured = tokenInSpellCloud(t);
      if (!obscured && (mine.includes(t.character_id) || t.kind === 'pc')) return true;
      if (!silhouettes && obscured) return mine.includes(t.character_id);
      const revealed = !S.fogOn || BC.isRevealed(S.grid, S.fog, c, r);
      if (silhouettes && obscured) return revealed && isSeen(baseline, c, r);
      return revealed && isSeen(bits, c, r);
    });
  }
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let lastSceneFrame = -Infinity;
  reducedMotion.addEventListener?.('change', () => (S.dirty = true));
  const spellDuration = 1400;
  const Spells = globalThis.BoardSpells;
  const SpellFX = globalThis.BoardSpellFX;
  const receivedCasts = new Set();
  const spellCrumbles = new Map();
  const teleportFrames = new Map();
  let weaponAim = null;
  let vineAim = null;
  let dustAim = null;
  const fxPrefs = { reduced: false, shake: true, pixelMinis: true };
  // Pixel-art figures: art pixels per square for the sprite set in assets/minis-pixel.
  const PIXEL_MINIS = 32;
  try {
    const prefs = JSON.parse(localStorage.getItem('dnd-board-spell-effects') || '{}');
    fxPrefs.reduced = prefs.reduced === true;
    fxPrefs.shake = prefs.shake !== false;
    fxPrefs.pixelMinis = prefs.pixelMinis !== false;
    fxPrefs.reactionSeconds = prefs.reactionSeconds;
  } catch {}
  const reduceEffects = () => fxPrefs.reduced || reducedMotion.matches;
  const reactionSeconds = () => Math.min(60, Math.max(3, Number(fxPrefs.reactionSeconds) || 10));
  // Visión precalculada del mapa (segmentos que tapan, polígonos y casillas por fuente). Se reutiliza mientras no
  // cambien el terreno, las paredes ni el tamaño, aunque el mapa se vuelva a cargar (por ejemplo, al pintar niebla).
  const sightCtxCache = { refs: [], key: '', value: null };
  function sightCtx() {
    const c = sightCtxCache,
      refs = [S.grid, S.terrain, S.walls];
    if (!c.value || refs.some((r, i) => r !== c.refs[i])) {
      const key = `${S.grid.cols}x${S.grid.rows}|${S.terrain}|${JSON.stringify(S.walls)}`;
      if (!c.value || key !== c.key)
        Object.assign(c, { key, value: BC.sightContext(S.grid, S.terrain, S.walls, c.value) });
      c.refs = refs;
    }
    return c.value;
  }
  const targetingWalls = () => sightCtx().segs;
  const burstSpreads = new Set([
    'fireball',
    'fog-cloud',
    'darkness',
    'cloudkill',
    'incendiary-cloud',
    'stinking-cloud',
  ]);
  const canSeeGround = (p, ignoreClouds = false) =>
    canSeeCast(Math.min(S.grid.cols - 1, Math.floor(p.x)), Math.min(S.grid.rows - 1, Math.floor(p.y)), ignoreClouds);
  const tokenCenter = t => ({ x: t.x + BC.tokenSpan(t) / 2, y: t.y + BC.tokenSpan(t) / 2 });
  const spellPoint = p =>
    p &&
    Number.isFinite(p.x) &&
    Number.isFinite(p.y) &&
    p.x >= 0 &&
    p.y >= 0 &&
    p.x <= S.grid.cols &&
    p.y <= S.grid.rows;
  function spellResolution(m) {
    const event = S.spellCasts.find(e => e.castId === m.castId);
    const token = visibleTokens().find(t => t.id === m.token);
    const now = performance.now();
    if (m.action === 'teleport-cancel' && event?.teleport) {
      teleportFrames.delete(event.caster);
      event.teleport = null;
      event.started = now - 3200;
    } else if (
      m.action === 'bane' &&
      event?.id === 'bane' &&
      event.targets.includes(m.token) &&
      typeof m.saved === 'boolean'
    ) {
      event.saved.set(m.token, m.saved);
    } else if (m.action === 'swing' && event?.id === 'spiritual-weapon' && token && spellPoint(m.point)) {
      event.swing = { at: now, point: m.point };
    } else if (m.action === 'weapon-impact' && event?.id === 'spiritual-weapon' && token) {
      event.attackImpact = { at: now, point: tokenCenter(token), span: BC.tokenSpan(token) };
    } else if (m.action === 'dust-move' && spellPoint(m.point)) {
      const zone = spellZones.get(m.castId);
      if (zone?.id !== 'dust-devil') return;
      const dx = m.point.x - zone.point.x,
        dy = m.point.y - zone.point.y;
      const area = { ...zone.area, x: zone.area.x + dx, y: zone.area.y + dy, origin: m.point };
      Object.assign(zone, { point: m.point, area, moved: true });
      if (event) Object.assign(event, { point: m.point, area, moved: true });
    } else if (m.action === 'smite-used' && event?.id === 'thunderous-smite') {
      event.endedAt = now;
    } else if (m.action === 'crumble' && token && !spellCrumbles.has(token.id)) {
      globalThis.BoardInk?.prepare('disintegrate', 'beam');
      spellCrumbles.set(token.id, { at: now, point: tokenCenter(token), span: BC.tokenSpan(token) });
    } else return;
    S.dirty = true;
  }
  async function resolveSpellSave(campaign, request, subject, result) {
    const meta = request.board;
    const movement = Spells.forcedMove(request.spellId);
    if (!meta?.map || !meta.castId || (!movement && !['disintegrate', 'bane'].includes(request.spellId))) return;
    if (movement?.on === 'hit' && !result.hit) return;
    if (result.saved && request.spellId !== 'bane')
      return request.spellId === 'lightning-lure' ? { damageAllowed: false } : undefined;
    if (request.spellId === 'disintegrate' && !result.destroyed) return;
    const data = await Cloud.board(campaign);
    if (data.board?.map_id !== meta.map) return;
    const map = data.maps.find(row => row.id === meta.map);
    const tokens = data.tokens.filter(t => t.map_id === meta.map).map(sizedToken);
    const token = tokens.find(t =>
      subject.combatant
        ? t.combatant_id === subject.combatant
        : subject.character && t.character_id === subject.character,
    );
    if (!map || !token) return;
    const publish = async fields => {
      const m = { t: 'spell-resolution', map: meta.map, castId: meta.castId, token: token.id, ...fields };
      if (S.id === campaign && S.mapId === meta.map && S.channel) {
        spellResolution(m);
        await S.channel.send(m);
      } else await Cloud.broadcastBoardSpell(campaign, m);
    };
    if (request.spellId === 'bane') return publish({ action: 'bane', saved: Boolean(result.saved) });
    if (request.spellId === 'disintegrate') {
      try {
        await publish({ action: 'crumble' });
      } finally {
        if (subject.combatant) {
          await new Promise(resolve => setTimeout(resolve, 820));
          await Cloud.removeToken(token.id);
        }
      }
      return;
    }
    if (!Number.isFinite(meta.origin?.x) || !Number.isFinite(meta.origin?.y)) return;
    const grid = BC.normGrid(map.grid || {});
    const terrain = BC.cells(grid, map.terrain?.cells || '');
    const walls = BC.sightBlockers(grid, terrain, map.terrain?.walls || []);
    const others = tokens.filter(t => t.id !== token.id && t.kind !== 'object');
    const next = Spells.forcedDestination(
      grid,
      request.spellId,
      meta,
      token,
      (candidate, prior) =>
        BC.roomFor(grid, terrain, candidate, others) &&
        Spells.unobstructed(tokenCenter(prior), tokenCenter(candidate), walls),
    );
    const final = next || token;
    if (next) {
      const patch = { x: next.x, y: next.y };
      if (
        S.id === campaign &&
        S.mapId === meta.map &&
        tokenById(token.id)?.x === token.x &&
        tokenById(token.id)?.y === token.y
      ) {
        await applyPoses([{ id: token.id, patch }], {});
        afterMove({ token, start: token, free: true }, next.x, next.y);
      } else await Cloud.poseTokens(campaign, meta.map, [{ id: token.id, patch, before: token.savedXY }]);
    }
    if (request.spellId === 'lightning-lure') {
      const caster = tokens.find(
        t =>
          t.id !== token.id &&
          (t.id === meta.caster || (tokenCenter(t).x === meta.origin.x && tokenCenter(t).y === meta.origin.y)),
      );
      const source = caster || { x: meta.origin.x - 0.5, y: meta.origin.y - 0.5, size: 1 };
      return { damageAllowed: Spells.distance(source, final, null, grid.feet) <= 5 };
    }
  }

  /* A spell attack that moves its target on a hit. Only the DM's board may
     move creature tokens, so a player's hit is sent to the DM's board, which applies it. */
  async function spellHit(campaign, meta, subject, spellId) {
    if (Spells.forcedMove(spellId)?.on !== 'hit' || !meta?.map || !meta.castId || !subject) return;
    const m = {
      t: 'spell-resolution',
      map: meta.map,
      castId: meta.castId,
      action: 'pull',
      spellId,
      origin: meta.origin,
      point: meta.point,
      subject,
    };
    if (S.id === campaign && dmView()) return applySpellPull(m);
    await Cloud.broadcastBoardSpell(campaign, m);
  }
  function applySpellPull(m) {
    // Older Thorn Whip messages did not include the spell ID.
    const spellId = m.spellId || 'thorn-whip';
    if (!S.id || !dmView() || !m.origin || !m.subject || Spells.forcedMove(spellId)?.on !== 'hit') return;
    const subject = m.subject.combatant
      ? { combatant: String(m.subject.combatant) }
      : { character: String(m.subject.character) };
    // Let the hit land before the figure moves.
    setTimeout(
      () =>
        resolveSpellSave(
          S.id,
          { spellId, board: { map: m.map, castId: m.castId, origin: m.origin, point: m.point } },
          subject,
          {
            saved: false,
            hit: true,
          },
        ).catch(err => toast(err.message)),
      150,
    );
  }
  let spellClouds = [];
  function updateSpellClouds(now) {
    const previous = spellClouds;
    spellClouds = S.spellCasts
      .filter(
        event =>
          event.id === 'fog-cloud' &&
          event.area &&
          now >= event.started + 300 &&
          (event.endedAt ?? (event.held ? Infinity : event.until)) > now,
      )
      .map(({ area }) => ({ x: area.x, y: area.y, r: area.feet / S.grid.feet }));
    if (previous.length !== spellClouds.length && (S.sel || S.target)) pick();
  }
  function tokenInSpellCloud(token) {
    const t = tokenPos(token),
      r = BC.tokenSpan(token) / 2;
    return spellClouds.some(cloud => Math.hypot(t.x + r - cloud.x, t.y + r - cloud.y) < cloud.r);
  }
  function movementOfSpell(id, caster, point) {
    const token = mapTokens().find(t => t.id === caster);
    if (id !== 'fire-bolt' || !token) return undefined;
    const span = BC.tokenSpan(token) / 2;
    const distance = Math.hypot(point.x - (token.x + span), point.y - (token.y + span));
    return Math.max(150, Math.min(1150, (distance * 350) / 6));
  }
  const ownsSpellEffect = (row, cast) =>
    row?.data ? row.data.concentration === cast.id : summary(row).concentration === cast.name;
  const spellZones = new Map();
  let zoneTurn = null;
  function restoreSpellZones(events) {
    // Cloud returns newest first; a moved zone retains its cast ID and lifetime.
    const latest = new Map();
    for (const { payload } of events) if (!latest.has(payload.castId)) latest.set(payload.castId, payload);
    for (const payload of [...latest.values()].reverse()) {
      const rounds = zoneRoundsLeft(payload.zone);
      if (rounds > 0) addSpellCast({ ...payload, rounds, restored: true });
    }
  }
  function zoneRoundsLeft(zone) {
    if (!zone) return 0;
    const enc = S.party?.encounter;
    if (enc?.active && zone.turn && Number(enc.round) >= zone.round) return zone.rounds - (enc.round - zone.round);
    return (zone.expiry - Date.now()) / 6000;
  }
  function rememberSpellZone(cast) {
    if (!cast?.zone || !cast.area || !Spells.zoneRule(cast.id) || spellZones.has(cast.castId)) return;
    if (cast.concentration) {
      for (const prior of spellZones.values())
        if (prior.caster === cast.caster && prior.concentration) {
          if (prior.zone.created >= cast.zone.created) return;
          spellZones.delete(prior.castId);
        }
    }
    spellZones.set(cast.castId, cast);
  }
  function activeSpellZones() {
    return [...spellZones.values()].filter(cast => {
      const source = tokenById(cast.caster);
      if (!source || zoneRoundsLeft(cast.zone) <= 0) {
        spellZones.delete(cast.castId);
        return false;
      }
      if (!dmView() && source.id !== actor()?.id) return false;
      const own = H.compactCast && source.id === actor()?.id;
      const row = own
        ? { data: state }
        : source.character_id &&
          [...(S.party?.characters || []), ...(S.party?.enemyNpcs || [])].find(
            candidate => candidate.id === source.character_id,
          );
      const concentrating = row && ownsSpellEffect(row, cast);
      if (concentrating) cast.observedConcentration = true;
      if (
        cast.concentration &&
        row &&
        !concentrating &&
        (own || cast.observedConcentration || Date.now() - cast.zone.created > 6000)
      ) {
        spellZones.delete(cast.castId);
        return false;
      }
      return true;
    });
  }
  function zoneArea(cast) {
    if (!cast.area.self) return cast.area;
    const source = tokenById(cast.caster),
      center = tokenCenter(source);
    return { ...cast.area, ...center, origin: center, elev: source.elev || 0 };
  }
  function zoneTarget(cast, token, rule) {
    if (!token || !sideOf(token) || info(token).dead) return false;
    if (!rule.hostile) return true;
    if (token.id === cast.caster || cast.zone.excluded.includes(token.id)) return false;
    return cast.zone.included.includes(token.id) || enemies(tokenById(cast.caster), token);
  }
  function spellBoardMeta(cast, origin, area = cast.area) {
    const point = area?.origin || cast.point;
    return {
      castId: cast.castId,
      map: S.mapId,
      caster: cast.caster,
      origin,
      point: point && { x: point.x, y: point.y },
      ...(area?.kind === 'line' ? { dir: area.dir, length: area.feet } : {}),
    };
  }
  function postZoneTrigger(cast, token, phase, turn, id, units = 1) {
    const rule = Spells.zoneRule(cast.id),
      zone = cast.zone;
    const roll = rule.rolls?.[phase] || zone;
    const ability = rule.noSave ? '' : roll.ability;
    const formula = units > 1 ? String(2 * units) + 'd4' : roll.formula;
    if (!formula && !ability) return;
    const key = [cast.castId, token.id, turn, phase, id].join(':');
    if (zoneTriggers.has(key)) return;
    zoneTriggers.add(key);
    if (zoneTriggers.size > 2500) zoneTriggers.delete(zoneTriggers.values().next().value);
    const source = tokenById(cast.caster);
    Cloud.post(
      S.id,
      'spell-zone-trigger',
      {
        key,
        phase,
        caster: zone.caster,
        spell: cast.name,
        spellId: cast.id,
        board: spellBoardMeta(
          cast,
          source ? tokenCenter(source) : cast.area.origin,
          source ? zoneArea(cast) : cast.area,
        ),
        formula,
        ability,
        dc: zone.dc,
        half: Boolean(ability && roll.half),
        types: roll.types,
        magical: true,
        targets: [{ id: token.combatant_id, character: token.character_id, name: token.name, token: token.id }],
      },
      { visibility: 'dm' },
    ).catch(err => {
      if (err.code === '23505' || /duplicate key/i.test(err.message)) return;
      zoneTriggers.delete(key);
      toast(err.message);
    });
  }
  const zoneTriggers = new Set(),
    zoneTravel = new Map();
  const turnZoneKey = enc =>
    enc?.active && enc.current_id ? [enc.round, enc.current_id, enc.updated_at || ''].join(':') : null;
  function checkZoneTurn(token, phase, turn) {
    if (!token) return;
    const walls = targetingWalls();
    for (const cast of activeSpellZones()) {
      const rule = Spells.zoneRule(cast.id);
      if (
        rule[phase] &&
        zoneTarget(cast, token, rule) &&
        Spells.zoneContains(S.grid, zoneArea(cast), token, { ...rule, walls, wallSide: cast.wallSide })
      )
        postZoneTrigger(cast, token, phase, turn, '');
    }
  }
  function checkZoneMove(token, msg) {
    const turn = msg.turn || turnZoneKey(S.party?.encounter) || msg.moveId;
    if (!turn || !msg.moveId) return;
    const span = Math.min(1, BC.tokenSpan(token));
    const path = msg.teleport
      ? msg.path
      : msg.path
          .slice(1)
          .reduce((steps, point, i) => steps.concat(BC.steps(msg.path[i], point, span).slice(1)), msg.path.slice(0, 1));
    const walls = targetingWalls();
    for (const cast of activeSpellZones()) {
      const rule = Spells.zoneRule(cast.id);
      if (!zoneTarget(cast, token, rule) || (!rule.enter && !rule.travel)) continue;
      const { enters, feet } = Spells.zoneMovement(S.grid, zoneArea(cast), token, path, { ...rule, walls });
      if (rule.enter && enters) postZoneTrigger(cast, token, 'enter', turn, '');
      if (!msg.teleport && rule.travel && feet) {
        const key = cast.castId + ':' + token.id,
          prior = zoneTravel.get(key);
        if (prior?.moveId === msg.moveId) continue;
        const total = (prior?.remainder || 0) + feet;
        zoneTravel.set(key, { moveId: msg.moveId, remainder: total % 5 });
        if (total >= 5) postZoneTrigger(cast, token, 'travel', turn, msg.moveId, Math.floor(total / 5));
      }
    }
  }
  const syncableArea = new Set(['cone', 'circle', 'cube', 'line', 'cylinder', 'wall']);
  function addSpellCast(raw) {
    if (
      !raw ||
      typeof raw !== 'object' ||
      typeof raw.id !== 'string' ||
      !Spells.implemented(raw.id) ||
      typeof raw.castId !== 'string' ||
      raw.castId.length > 80 ||
      receivedCasts.has(raw.castId)
    )
      return false;
    const boundedPoint = p =>
      p &&
      Number.isFinite(p.x) &&
      Number.isFinite(p.y) &&
      p.x >= 0 &&
      p.y >= 0 &&
      p.x <= S.grid.cols &&
      p.y <= S.grid.rows;
    if (!boundedPoint(raw.point)) return false;
    const area =
      raw.area &&
      syncableArea.has(raw.area.kind) &&
      Number.isFinite(raw.area.x) &&
      Number.isFinite(raw.area.y) &&
      boundedPoint(raw.area.origin) &&
      cleanTemplate(raw.area, true);
    if (!canSeeGround(raw.point) && !area) return false;
    if (area) {
      area.ring = raw.area.ring === true && area.kind === 'wall';
      area.self = raw.area.self === true;
      area.origin = raw.area.origin;
      area.height = Math.max(0, Math.min(600, Number(raw.area.height) || 0));
    }
    if (!raw.restored && raw.concentration && !raw.zone) {
      for (const prior of spellZones.values())
        if (prior.caster === raw.caster && prior.concentration) spellZones.delete(prior.castId);
    }
    if (raw.zone && area) rememberSpellZone({ ...raw, area });
    const clock = performance.now();
    const duration = Number(raw.rounds);
    const finite = Number.isFinite(duration) && duration > 0;
    const event = {
      castId: raw.castId,
      id: raw.id,
      name: String(raw.name || '').slice(0, 120),
      kind: Spells.kindFor(raw.id),
      point: raw.point,
      area: area || null,
      caster: typeof raw.caster === 'string' ? raw.caster : '',
      targets: Array.isArray(raw.targets) ? raw.targets.filter(id => typeof id === 'string').slice(0, 80) : [],
      darts: Array.isArray(raw.darts) ? raw.darts.slice(0, 11).map(id => (typeof id === 'string' ? id : null)) : [],
      allies: new Set(Array.isArray(raw.allies) ? raw.allies.filter(id => typeof id === 'string').slice(0, 80) : []),
      travelMs: movementOfSpell(raw.id, raw.caster, raw.point),
      element: Object.hasOwn(BoardSceneFX.colors, raw.element) ? raw.element : 'magic',
      school: typeof raw.school === 'string' ? raw.school.slice(0, 32) : '',
      level: Math.max(0, Math.min(9, Number(raw.level) || 0)),
      concentration: raw.concentration === true,
      started: raw.restored ? clock - 1500 : clock,
      until: finite ? clock + Math.min(duration, 14400) * 6000 : 0,
      seed: raw.castId.charCodeAt(raw.castId.length - 1) || 0,
      slot: Math.max(1, Math.min(9, Number(raw.level) || 1)),
      beats: Math.min(4, Math.max(1, Math.floor(Number(raw.beams)) || 1)),
      rays: Array.isArray(raw.rays) ? raw.rays.filter(id => typeof id === 'string').slice(0, 4) : [],
      weaponForm: Spells.weaponForm(raw.weaponForm),
      wallSide: raw.wallSide === -1 ? -1 : 1,
      summonedTurn: raw.summonedTurn,
      moved: raw.moved === true,
      saved: new Map(),
      saveTargets: new Set(
        Array.isArray(raw.saveTargets) ? raw.saveTargets.filter(id => typeof id === 'string').slice(0, 80) : [],
      ),
    };
    if (event.id === 'misty-step' && event.caster && boundedPoint(raw.departure)) {
      event.teleport = { from: raw.departure, to: event.point };
      if (Number.isFinite(raw.sentAt)) event.started -= Math.max(0, Math.min(850, Date.now() - raw.sentAt));
      teleportFrames.set(event.caster, event);
    }
    if ((!area && !Spells.markedCast(event.kind)) || !(finite || event.concentration)) event.until = 0;
    else if (!event.until) event.until = Infinity;
    if (event.concentration && event.caster)
      for (const prior of S.spellCasts)
        if (prior.caster === event.caster && prior.concentration && prior.until && prior.endedAt == null)
          prior.endedAt = clock;
    globalThis.BoardInk?.prepare(event.id, event.kind);
    if (event.id === 'spiritual-weapon')
      for (const prior of S.spellCasts)
        if (prior.id === event.id && prior.caster === event.caster && prior.endedAt == null) prior.endedAt = clock;
    receivedCasts.add(event.castId);
    if (receivedCasts.size > 300) receivedCasts.delete(receivedCasts.values().next().value);
    S.spellCasts = [...S.spellCasts.slice(-39), event];
    S.dirty = true;
    return true;
  }

  let lastSpellPoses = [];
  function evaluateSpellCasts(now, pieces) {
    const visible = new Map(pieces.map(piece => [piece.t.id, piece]));
    const byId = new Map(mapTokens().map(token => [token.id, token]));
    const rows = [...(S.party?.characters || []), ...(S.party?.enemyNpcs || [])];
    const o = origin(),
      c = cellPx();
    function tokenPose(id) {
      const piece = visible.get(id);
      if (!piece) return null;
      const { bounds, foot, t, facing } = piece;
      const heading = ((facing || 0) * Math.PI) / 4;
      return {
        x: (foot.x - o.x) / c + Math.sin(-heading) * 0.17 * BC.tokenSpan(t),
        y: (bounds.y + bounds.h * 0.48 - o.y) / c - Math.max(0, ((t.elev || 0) / S.grid.feet) * 0.18),
        baseX: (foot.x - o.x) / c,
        baseY: (foot.y - o.y) / c,
        span: BC.tokenSpan(t),
        id: t.id,
        obscured: playerView() && tokenInSpellCloud(t),
      };
    }
    lastSpellPoses = [];
    S.spellCasts = S.spellCasts.filter(event => {
      const token = byId.get(event.caster);
      const row = token?.character_id && rows.find(item => item.id === token.character_id);
      const zone = spellZones.get(event.castId);
      let expires = zone?.zone.turn && zoneRoundsLeft(zone.zone) > 0 && inCombat() ? Infinity : event.until;
      event.held = false;
      if (expires && event.endedAt == null && row) {
        const active = event.concentration
          ? ownsSpellEffect(row, event)
          : summary(row).effects?.some(effect => effect === event.name || effect.startsWith(event.name + ' ('));
        if (active) {
          event.observedDuration = true;
          if (S.party?.encounter?.active) {
            expires = Infinity;
            event.held = true;
          }
        } else if (event.observedDuration || (event.concentration && now - event.started > 12000)) {
          event.endedAt = now;
        }
      }
      expires = event.endedAt ?? expires;
      const phase = SpellFX.phase(event, now, reduceEffects());
      const linger = expires ? Math.min(1, Math.max(0, (expires + 500 - now) / 500)) : 0;
      if (phase.done && phase.decal >= 1 && !linger) return false;
      const casterPose = tokenPose(event.caster);
      const hand = casterPose?.obscured ? null : casterPose;
      let area = event.area;
      if (area?.self && event.kind === 'aura-persistent' && event.id !== 'globe-of-invulnerability') {
        if (!hand) return true;
        area = { ...area, x: hand.baseX, y: hand.baseY };
      }
      const targets = event.targets.map(tokenPose).filter(p => p && !p.obscured);
      const explicitPoint = ['teleport', 'summon'].includes(event.kind);
      const target =
        !explicitPoint && !area && targets.length ? targets[0] : canSeeGround(event.point) ? event.point : null;
      if (!area && !target && !hand) return true;
      if (area && !canSeeGround(area.origin, event.id === 'fog-cloud') && !targets.length && !hand) return true;
      if (!event.castSound && hand && !phase.hit) {
        event.castSound = true;
        document.dispatchEvent(
          new CustomEvent('board-spell-sound', {
            detail: { spellId: event.id, archetype: event.kind, element: event.element, phase: 'cast' },
          }),
        );
      }
      if (phase.hit && !event.sounded && (target || hand || targets.length)) {
        event.sounded = true;
        document.dispatchEvent(
          new CustomEvent('board-spell-sound', {
            detail: { spellId: event.id, archetype: event.kind, element: event.element, phase: 'impact' },
          }),
        );
      }
      const base = hand ? { x: hand.baseX, y: hand.baseY, span: hand.span } : null;
      const rowY = Math.max(area?.y || 0, target?.y || 0, ...targets.map(p => p.baseY));
      const top = 0;
      const caster = visible.get(event.caster)?.t;
      const casterName = hand && caster ? caster.name : '';
      const allies = new Set(event.allies);
      if (caster?.kind === 'pc')
        for (const p of targets) if (visible.get(p.id)?.t.kind === 'pc' && p.id !== event.caster) allies.add(p.id);
      const fogAlpha = event.id === 'fog-cloud' && phase.hit ? Math.min(1, phase.elapsed / 450) * linger : 0;
      lastSpellPoses.push({
        event,
        hand,
        base,
        area,
        target,
        targets,
        linger,
        rowY,
        casterName,
        allies,
        top,
        fogAlpha,
        swing: event.swing,
        wallBounds:
          event.id === 'wall-of-fire'
            ? pieces
                .filter(p => !tokenInSpellCloud(p.t) && p.alpha > 0.04)
                .map(({ bounds: b }) => [(b.x - o.x) / c, (b.y - o.y) / c, b.w / c, b.h / c])
            : null,
      });
      return true;
    });
    lastSpellPoses.sort((a, b) => a.rowY - b.rowY);
  }
  function drawSpellLayer(now, layer) {
    if (!lastSpellPoses.length && !(layer === 'air' && spellCrumbles.size)) return;
    const o = origin(),
      c = cellPx();
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.scale(c, c);
    ctx.beginPath();
    ctx.rect(0, 0, S.grid.cols, S.grid.rows);
    ctx.clip();
    const budget = SpellFX.beginFrame();
    for (const pose of lastSpellPoses) {
      if (layer === 'ground') SpellFX.drawGround(ctx, pose.event, pose, now, reduceEffects(), S.grid, budget);
      else if (layer === 'fog') SpellFX.drawFog(ctx, pose, now, reduceEffects(), S.grid, !playerView());
      else SpellFX.drawAir(ctx, pose.event, pose, now, reduceEffects(), S.grid, budget);
    }
    if (layer === 'air') {
      SpellFX.drawWardMarkers(ctx, lastSpellPoses, now, reduceEffects());
      for (const { at, point, span } of spellCrumbles.values()) {
        const t = (now - at) / 760;
        if (t >= 0 && t < 1)
          BoardInk.draw(ctx, 'disintegrate-dust', t, point.x, point.y, span * 1.3, span * 1.65, { anchorY: 0.71 });
      }
    }
    ctx.restore();
  }
  // Big impacts flash the board once light, once dark (never a flat white add).
  function drawSpellFlash(now, o, c) {
    if (reduceEffects() || !fxPrefs.shake || !SpellFX.flash) return;
    for (const event of S.spellCasts) {
      const f = SpellFX.flash(event, now);
      if (!f) continue;
      ctx.save();
      ctx.globalAlpha = f.alpha;
      ctx.fillStyle = f.color;
      ctx.fillRect(o.x, o.y, S.grid.cols * c, S.grid.rows * c);
      ctx.restore();
      S.dirty = true;
      return;
    }
  }
  function drawThunderRipple(now, dpr, shake) {
    if (reduceEffects()) return;
    const o = origin(),
      s = S.view.s,
      c = cellPx() * s,
      x = S.view.x + shake.x + o.x * s,
      y = S.view.y + shake.y + o.y * s;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.beginPath();
    ctx.rect(x, y, c * S.grid.cols, c * S.grid.rows);
    ctx.clip();
    for (const pose of lastSpellPoses) {
      if (pose.event.id !== 'thunderclap' || !pose.area) continue;
      const t = (now - pose.event.started - 300) / 210;
      const width = ((2 * pose.area.feet) / S.grid.feet) * c;
      if (t >= 0 && t < 1)
        BoardInk.draw(ctx, 'thunder-ripple', t, x + pose.area.x * c, y + pose.area.y * c, width, width, {
          opacity: 0.54,
        });
    }
    ctx.restore();
  }
  let traitsVisible = false;
  function drawBoardTraits(pieces, now) {
    traitsVisible = false;
    const o = origin();
    const c = cellPx();
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.scale(c, c);
    ctx.beginPath();
    ctx.rect(0, 0, S.grid.cols, S.grid.rows);
    ctx.clip();
    for (const p of pieces) {
      if (!p.d.traits?.length || p.d.dead || p.alpha < 0.5 || (playerView() && tokenInSpellCloud(p.t))) continue;
      traitsVisible = true;
      const span = BC.tokenSpan(p.t);
      const base = { x: (p.foot.x - o.x) / c, y: (p.foot.y - o.y) / c };
      const hand = {
        x: base.x - Math.sin((p.facing * Math.PI) / 4) * 0.17 * span,
        y: (p.bounds.y + p.bounds.h * 0.48 - o.y) / c,
      };
      SpellFX.drawTraits(ctx, p.d.traits, base, hand, span, now, reduceEffects());
    }
    ctx.restore();
  }
  function drawCastBanner(now, dpr) {
    const pose = lastSpellPoses.reduce(
      (recent, p) => (!recent || p.event.started > recent.event.started ? p : recent),
      null,
    );
    if (!pose || !pose.event.name) return;
    const age = Math.max(0, now - pose.event.started);
    if (age >= 1500) return;
    const label = pose.casterName ? pose.casterName + ' · ' + pose.event.name : pose.event.name;
    const color = SpellFX.colorFor(pose.event.id, pose.event.element, pose.event.school)[1];
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = Math.min(1, (1500 - age) / 380);
    ctx.font = '600 14px system-ui';
    const width = Math.min(canvas.width / dpr - 30, ctx.measureText(label).width + 39);
    ctx.fillStyle = '#141c1ce8';
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(15, 15, width, 32, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.fillRect(24, 25, 2, 12);
    ctx.fillStyle = '#fff5e5';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(label, 33, 31, width - 33);
    ctx.restore();
  }
  const pingDuration = 2200;
  function canSeeCast(x, y, ignoreClouds = false) {
    return !playerView() || ((!S.fogOn || BC.isRevealed(S.grid, S.fog, x, y)) && isSeen(seen(ignoreClouds), x, y));
  }
  function addCast({ kind, x, y, area }) {
    if (
      !S.mapId ||
      typeof kind !== 'string' ||
      !Object.hasOwn(BoardSceneFX.colors, kind) ||
      !Number.isInteger(x) ||
      !Number.isInteger(y) ||
      !BC.inside(S.grid, x, y) ||
      !canSeeCast(x, y)
    )
      return false;
    const shape = area && cleanTemplate({ ...area, name: '', color: BoardSceneFX.colors[kind] });
    S.casts = [...S.casts.slice(-11), { kind, x, y, area: shape, start: performance.now() }];
    S.dirty = true;
    return true;
  }
  const activeSpell = () => {
    const spells = H.spells?.() || [];
    return spells.find(sp => sp.id === S.sheetSpell) || spells[0];
  };
  function spellPlacement(sp, cell, slot = sp.level, aimed = null, tokenId = null) {
    if (!shown || !S.mapId || S.mapId !== activeId() || !H.cast || !BC.inside(S.grid, cell.x, cell.y)) return null;
    const aim = aimed || { x: cell.x + 0.5, y: cell.y + 0.5 };
    const tokens = visibleTokens();
    const me = tokens.find(t => t.character_id === H.actorId?.());
    const legacy = Rules.spellImpact(sp, slot).area;
    const shape = Spells.areaFor(sp, slot, legacy);
    const travelRange = Spells.destinationRange(sp.id);
    const range = travelRange || Spells.targetRange(sp) + (sp.id === 'produce-flame' ? 30 : 0);
    const self = range === 0 || shape?.self === true;
    const subject = tokens.find(t => t.id === tokenId) || tokens.find(t => BC.inFootprint(t, aim.x, aim.y));
    const base = t => ({ x: t.x + BC.tokenSpan(t) / 2, y: t.y + BC.tokenSpan(t) / 2 });
    const square = Spells.placedSquare(sp.id);
    const aimPoint = square
      ? { x: cell.x + 0.5, y: cell.y + 0.5 }
      : shape && !self && shape.kind !== 'wall'
        ? Spells.snapIntersection(aim, S.grid)
        : aim;
    const destination = travelRange || Spells.kindFor(sp.id) === 'summon' || square;
    const teleport = sp.id === 'misty-step' && me && mistyDestination(me, aim);
    const targetPoint = destination
      ? teleport
        ? base(teleport)
        : square
          ? aimPoint
          : aim
      : self && !shape && me
        ? base(me)
        : !shape && subject
          ? base(subject)
          : aimPoint;
    const relevant = myCharacters();
    const placement = {
      map: S.mapId,
      campaign: S.id,
      actorId: H.actorId?.(),
      cell,
      aim,
      tokenId: subject?.id || null,
      point: targetPoint,
      caster: me?.id || '',
      casterBase: me && { ...base(me), span: BC.tokenSpan(me) },
      range,
      hits: [],
      cells: [],
      tokens: [],
      allies: [],
    };
    if (!me) return { ...placement, error: 'Primero ubicá tu ficha lanzadora en el mapa activo.' };
    if (square) {
      const space = { x: cell.x, y: cell.y, size: 1 };
      if (!BC.roomFor(S.grid, S.terrain, space, tokens)) return { ...placement, error: 'Elegí una casilla libre.' };
    }
    if (sp.id === 'lightning-lure' && (!subject || subject.id === me.id || subject.kind === 'object'))
      return { ...placement, error: 'Elegí otra criatura visible a 15 pies o menos.' };
    if (sp.id === 'misty-step') {
      if (!canMove(me)) return { ...placement, error: 'No tenés permiso para mover la ficha lanzadora.' };
      if (!BC.roomFor(S.grid, S.terrain, teleport, []) || overlapsPieces(teleport, tokens))
        return { ...placement, error: 'Paso brumoso necesita casillas libres para toda la ficha.' };
      placement.teleport = { x: teleport.x, y: teleport.y };
    }
    if (!canSeeGround(targetPoint) && !self) return { ...placement, error: 'Elegí un punto visible del mapa activo.' };
    const area = Spells.makeTemplate(S.grid, shape && { ...shape, self }, me, aimPoint);
    placement.area = area;
    if (square && area) placement.cells = Spells.affectedCells(S.grid, area, targetingWalls());
    const distance = self
      ? 0
      : Spells.distance(me, teleport || (shape || destination ? null : subject), targetPoint, S.grid.feet);
    if (distance > range) return { ...placement, error: 'Fuera de alcance (' + distance + ' / ' + range + ' pies).' };
    if (!self && sp.id !== 'misty-step' && !Spells.unobstructed(base(me), targetPoint, targetingWalls()))
      return { ...placement, error: 'Hay cobertura total entre tu ficha y el punto elegido.' };
    const eligible = tokens.filter(t => t.kind !== 'object');
    const affected = destination
      ? travelRange
        ? [me]
        : []
      : area
        ? Spells.affectedTokens(
            (placement.cells = Spells.affectedCells(S.grid, area, targetingWalls(), burstSpreads.has(sp.id))),
            eligible,
          )
        : self
          ? [me]
          : subject && subject.kind !== 'object'
            ? [subject]
            : [];
    const excluded = new Set([
      'earth-tremor',
      'thunderclap',
      'word-of-radiance',
      'sword-burst',
      'arms-of-hadar',
      'burning-hands',
      'frost-fingers',
      'color-spray',
      'rimes-binding-ice',
      'lightning-bolt',
      'thunderwave',
      'fear',
    ]);
    const hits = affected.filter(
      t => t !== me || !(excluded.has(sp.id) || (self && (area?.kind === 'cone' || area?.kind === 'line'))),
    );
    placement.hits = hits.map(t => ({ character: t.character_id, combatant: t.combatant_id, token: t.id }));
    placement.tokens = hits.map(t => t.id);
    placement.allies = hits
      .filter(t => t !== me && (t.kind === 'pc' || relevant.includes(t.character_id)))
      .map(t => t.id);
    placement.x = Math.min(S.grid.cols - 1, Math.floor(targetPoint.x));
    placement.y = Math.min(S.grid.rows - 1, Math.floor(targetPoint.y));
    return placement;
  }
  const castRays = new Set(['magic-missile', 'scorching-ray', 'eldritch-blast']);
  const friendlySpells = new Set(['bless', 'cure', 'healingword', 'aid', 'heroism', 'shield-of-faith']);
  const castCell = p => ({
    x: Math.min(S.grid.cols - 1, Math.floor(p.x)),
    y: Math.min(S.grid.rows - 1, Math.floor(p.y)),
  });
  const castDirection = a => a && (a.kind === 'line' || a.kind === 'cone' || (a.kind === 'cube' && a.self));
  const castHit = t => ({
    id: t.id,
    token: t.id,
    character: t.character_id,
    combatant: t.combatant_id,
    name: info(t).name || t.name,
  });
  function compactToken(sp, t, object) {
    if (!t || (t.kind === 'object') !== object) return false;
    if (info(t).dead && !Rules.spellImpact(sp).healing) return false;
    if (friendlySpells.has(sp.id) && !['pc', 'npc'].includes(t.kind)) return false;
    const aim = tokenCenter(t),
      p = spellPlacement(sp, castCell(aim), sp.level, aim, t.id);
    return p && !p.error && !(castRays.has(sp.id) && p.caster === t.id);
  }
  function prepareCompactCast(p, spell, level, s) {
    const visible = visibleTokens();
    if (spell.id === 'grasping-vine') {
      const targets = s.selected.map(id => visible.find(t => t.id === id));
      if (targets.length > 1 || targets.some(t => !vineTarget(p.point, t)))
        throw Error('Elegí una criatura visible a 30 pies o menos de la enredadera.');
      p.hits = targets.map(castHit);
      p.tokens = targets.map(t => t.id);
      p.saveTargets = p.tokens;
      p.allies = targets.filter(t => t.kind === 'pc' && t.id !== p.caster).map(t => t.id);
      return p;
    }
    if (p.area?.kind === 'wall') {
      if (s.ring) p.area = { ...p.area, ring: true, feet: 10, width: 1 };
      else if (s.wallEnd) {
        const end = Spells.snapIntersection(s.wallEnd, S.grid);
        const dx = end.x - p.area.x,
          dy = end.y - p.area.y;
        const horiz = Math.abs(dx) >= Math.abs(dy),
          feet = Math.abs(horiz ? dx : dy) * S.grid.feet;
        if (feet)
          p.area = {
            ...p.area,
            feet: Math.min(p.area.feet, feet),
            dir: horiz ? (dx < 0 ? Math.PI : 0) : dy < 0 ? -Math.PI / 2 : Math.PI / 2,
          };
      }
      p.wallSide = s.wallSide;
      p.cells = Spells.affectedCells(S.grid, p.area, targetingWalls());
      p.tokens = Spells.affectedTokens(
        p.cells,
        visible.filter(t => t.kind !== 'object'),
      ).map(t => t.id);
    }
    if (p.area) {
      let targets = visible.filter(t => p.tokens.includes(t.id));
      if (spell.id === 'spirit-guardians') {
        const source = tokenById(p.caster);
        targets = targets.filter(
          t => t.id !== p.caster && !s.excluded.has(t.id) && (enemies(source, t) || s.included.has(t.id)),
        );
        p.zoneExcluded = [...s.excluded];
        p.zoneIncluded = [...s.included];
      }
      p.hits = targets.map(castHit);
    } else if (s.selected.length) {
      const targets = s.selected.map(id => visible.find(t => t.id === id));
      if (targets.some(t => !compactToken(spell, t, s.object))) throw Error('Revisá los objetivos en el mapa.');
      if (spell.id === 'magic-missile') return assignMissiles(p, spell, level, s.selected);
      if (castRays.has(spell.id)) return assignRays(p, spell, s.max, s.selected);
      p.hits = targets.map(castHit);
    } else p.hits = visible.filter(t => p.tokens.includes(t.id)).map(castHit);
    p.tokens = p.hits.map(t => t.id);
    p.allies = visible.filter(t => t.kind === 'pc' && t.id !== p.caster && p.tokens.includes(t.id)).map(t => t.id);
    if (['bane', 'hold', 'hold-monster'].includes(spell.id)) p.saveTargets = p.tokens;
    return p;
  }
  function compactPlan(s, max) {
    const me = actor();
    if (!me) return { ready: false, prompt: 'Tu ficha no está en este mapa' };
    const { sp, slot } = s,
      center = tokenCenter(me),
      shape = Spells.areaFor(sp, slot.level, Rules.spellImpact(sp, slot.level).area);
    const destination = Spells.destinationRange(sp.id),
      range = destination || Spells.targetRange(sp);
    const groundPoint = !destination && (Spells.kindFor(sp.id) === 'summon' || Spells.placedSquare(sp.id));
    const allowObject =
      ['fire-bolt', 'light', 'heat-metal', 'disintegrate'].includes(sp.id) ||
      /criatura (?:u|o) objeto/i.test(sp.text || '');
    const tokens = visibleTokens(),
      picked = tokens.find(t => t.id === s.selected[0]);
    const far = {
      x: Math.min(S.grid.cols - 0.5, center.x + Math.max(1, Math.min(6, range / S.grid.feet))),
      y: center.y,
    };
    const aim = s.aim || (picked && tokenCenter(picked)) || (shape ? far : center);
    let placement = spellPlacement(sp, castCell(aim), slot.level, aim, picked?.id);
    if (placement?.error && shape && !s.aim) placement = spellPlacement(sp, castCell(center), slot.level, center);
    const count = s.selected.length,
      rays = castRays.has(sp.id);
    const tokenSpell = !shape && !destination && !groundPoint && range > 0;
    const valid = tokenSpell ? new Set(tokens.filter(t => compactToken(sp, t, s.object)).map(t => t.id)) : null;
    let ready = Boolean(
      placement &&
      !placement.error &&
      (destination || groundPoint ? s.aim : tokenSpell ? count && (rays ? count === max : count <= max) : true),
    );
    if (ready) {
      try {
        placement = prepareCompactCast(placement, sp, slot.level, { ...s, max });
      } catch {
        ready = false;
      }
    }
    const prompt =
      sp.id === 'grasping-vine'
        ? s.aim
          ? 'Tocá una criatura a 30 pies de la enredadera (opcional) y confirmá'
          : 'Tocá una casilla libre para la enredadera'
        : sp.id === 'dust-devil'
          ? 'Tocá una casilla libre para el remolino'
          : destination
            ? 'Tocá un destino libre'
            : groundPoint
              ? 'Tocá un punto de invocación'
              : castDirection(shape)
                ? 'Arrastrá el control para apuntar'
                : shape?.kind === 'wall'
                  ? 'Arrastrá para dibujar el muro'
                  : sp.id === 'spirit-guardians'
                    ? 'Tocá una ficha para incluirla o excluirla'
                    : shape && !shape.self
                      ? 'Arrastrá el área para moverla'
                      : tokenSpell
                        ? s.object
                          ? 'Elegí un objeto'
                          : 'Tocá las fichas para elegir'
                        : 'Sobre vos';
    const warn = (Rules.spellImpact(sp).types.length && (shape || rays)) || sp.id === 'spirit-guardians';
    return {
      ready,
      prompt,
      placement,
      allowObject,
      valid,
      destination,
      groundPoint,
      shape,
      range,
      center,
      aim,
      max,
      counter: tokenSpell
        ? count + '/' + max + (rays ? (sp.id === 'magic-missile' ? ' dardos' : ' rayos') : ' objetivos')
        : '',
      allies: warn ? (placement?.allies || []).map(id => tokens.find(t => t.id === id)?.name).filter(Boolean) : [],
    };
  }
  function wallArrow(a, side) {
    if (a.ring) return { x: a.x, y: a.y + (side === 1 ? 1.35 : 2.55) };
    const tip = Spells.clipRay(S.grid, a, {
      x: a.x + (Math.cos(a.dir) * a.feet) / S.grid.feet,
      y: a.y + (Math.sin(a.dir) * a.feet) / S.grid.feet,
    });
    return {
      x: (a.x + tip.x) / 2 - Math.sin(a.dir) * side * 0.57,
      y: (a.y + tip.y) / 2 + Math.cos(a.dir) * side * 0.57,
    };
  }
  function compactTarget(s, { w, start, drag, rotation }, max, held) {
    const aim = toCellF(w),
      cell = toCell(w),
      p = compactPlan(s, max);
    if (!p.center || !BC.inside(S.grid, cell.x, cell.y)) return false;
    const id = hitToken(w)?.id;
    if (s.sp.id === 'grasping-vine' && s.aim && id) {
      const token = visibleTokens().find(t => t.id === id);
      if (drag || !vineTarget(p.placement?.point, token)) return false;
      s.selected = s.selected.includes(id) ? [] : [id];
      return true;
    }
    if (p.valid) {
      if (drag || !p.valid.has(id)) return false;
      const at = s.selected.lastIndexOf(id);
      if (castRays.has(s.sp.id)) {
        if (held && at >= 0) s.selected.splice(at, 1);
        else if (!held && s.selected.length < max) s.selected.push(id);
      } else if (at >= 0) s.selected.splice(at, 1);
      else if (max === 1) s.selected = [id];
      else if (s.selected.length < max) s.selected.push(id);
      return true;
    }
    if (s.sp.id === 'spirit-guardians') {
      const t = visibleTokens().find(t => t.id === id);
      if (drag || !t || t.id === p.placement?.caster || !Spells.affectedTokens(p.placement?.cells || [], [t]).length)
        return false;
      const set = enemies(tokenById(p.placement.caster), t) ? s.excluded : s.included;
      set.has(id) ? set.delete(id) : set.add(id);
      return true;
    }
    if (!p.shape && !p.destination && !p.groundPoint) return false;
    if (p.shape?.kind === 'wall' && !drag && p.placement?.area) {
      const arrow = wallArrow(p.placement.area, s.wallSide);
      if (Math.hypot(aim.x - arrow.x, aim.y - arrow.y) < 0.75) {
        s.wallSide = -s.wallSide;
        return true;
      }
    }
    let next = aim;
    if (rotation != null)
      next = {
        x: Math.max(0, Math.min(S.grid.cols - 0.01, p.center.x + Math.cos(rotation) * 4)),
        y: Math.max(0, Math.min(S.grid.rows - 0.01, p.center.y + Math.sin(rotation) * 4)),
      };
    if (p.shape?.kind === 'wall' && drag && !s.ring) next = toCellF(start);
    const test = spellPlacement(s.sp, castCell(next), s.slot.level, next);
    if (!test || test.error) return false;
    s.aim = next;
    if (s.sp.id === 'grasping-vine') s.selected = [];
    if (p.shape?.kind === 'wall' && drag && !s.ring) s.wallEnd = aim;
    return true;
  }
  function focusCasting(sp) {
    const me = actor();
    if (!me || !canvas.clientWidth) return;
    resize();
    const o = origin(),
      c = cellPx(),
      center = tokenCenter(me),
      size = worldSize();
    const min = Math.max(canvas.clientWidth / size.w, canvas.clientHeight / size.h);
    const range = sp
      ? (Spells.destinationRange(sp.id) || Spells.targetRange(sp)) / S.grid.feet
      : Math.max(S.grid.cols, S.grid.rows);
    const span = Math.max(6, Math.min(Math.max(S.grid.cols, S.grid.rows), range * 2 + 2));
    const scale = Math.max(min, canvas.clientWidth / (Math.min(13, span) * c));
    S.view = {
      s: scale,
      x: Math.min(
        0,
        Math.max(canvas.clientWidth - size.w * scale, canvas.clientWidth * 0.45 - (o.x + (center.x + 1.8) * c) * scale),
      ),
      y:
        size.h * scale < canvas.clientHeight
          ? (canvas.clientHeight - size.h * scale) / 2
          : Math.min(
              0,
              Math.max(canvas.clientHeight - size.h * scale, canvas.clientHeight / 2 - (o.y + center.y * c) * scale),
            ),
    };
    S.touched = true;
    S.dirty = true;
  }
  function offerSpellReaction(event) {
    if (!castCanReact(event.id)) return;
    const spell = H.spells().find(sp => sp.id === event.id),
      me = actor();
    if (!spell || !me || Combat.spellBlock(state, spell)) return;
    const available = Combat.availableSlots(state, spell),
      slot = available[0];
    if (!slot && !Combat.specialCast(state, spell)) return;
    const ac = Rules.stats(state).ac + 5;
    const body =
      event.id === 'shield'
        ? `+5 CA → ${ac}. ${event.magicMissile ? 'Anula Proyectil mágico.' : Number.isFinite(event.total) && event.natural !== 20 && event.total < ac ? 'El ataque fallaría.' : ''}`
        : `Nivel ${slot?.level || spell.level}${slot ? ' · ' + slot.left + ' disponibles' : ''}. ${event.level != null ? (event.level <= (slot?.level || spell.level) ? 'Interrupción automática.' : 'Prueba CD ' + (10 + event.level) + '.') : 'Nivel del conjuro enemigo sin revelar.'}`;
    return new Promise(resolve => {
      if (
        !casting.promptReaction({
          label: `¿Usar ${spell.name}?`,
          body,
          seconds: reactionSeconds(),
          pass: () => resolve(false),
          use: async () => {
            if (Combat.spellBlock(state, spell)) return resolve(false);
            casting.begin(spell.id, event);
            if (event.source) {
              const p = tokenCenter(event.source),
                o = origin();
              const w = { x: o.x + p.x * cellPx(), y: o.y + p.y * cellPx() };
              casting.mapTap({ w, start: w });
            }
            if (event.id === 'shield') await casting.confirm();
            resolve(event.id === 'shield' && Boolean(Effects.active(state, 'shield')));
          },
        })
      )
        resolve(false);
    });
  }
  function useConcentrationSave() {
    const dc = Combat.data(state).checks[0];
    if (!state.concentration || !dc) return;
    const form = new FormData(),
      bonus = Rules.saveBonus(state, 'con');
    const mods = RollUI.conditionMods(state, 'save', 'con');
    form.set('adv', globalThis.FeatFX?.concentrationAdvantage(state) ? (mods.mode === 'dis' ? '' : 'adv') : mods.mode);
    const roll = RollUI.readD20(form),
      total = roll.kept + bonus,
      success = total >= dc;
    commit('Salvación de concentración', s => {
      Combat.data(s).checks.shift();
      if (!success) Combat.endConcentration(s);
    });
    TableUI.shareRoll({ label: 'Concentración (CD ' + dc + ')', rolls: roll.rolls, bonus, total });
    casting.showResult({
      name: 'Salvación de concentración',
      face: roll.kept,
      total,
      formula: 'CON · CD ' + dc,
      rows: [success ? 'Mantenés la concentración' : 'Terminó la concentración'],
      saves: {},
    });
  }
  function castCanReact(id) {
    return shown && H.compactCast && casting && !S.isDM && (id === 'shield' || id === 'counter');
  }
  function mistyDestination(token, point) {
    const span = BC.tokenSpan(token);
    return { ...token, x: BC.snapToken(point.x - span / 2, span), y: BC.snapToken(point.y - span / 2, span) };
  }
  function selectedPlacement(sp, slot = sp.level) {
    if (Spells.destinationRange(sp.id)) return null;
    const t = tokenById(S.target) || (Spells.targetRange(sp) === 0 ? actor() : null);
    if (!t || t.map_id !== S.mapId) return null;
    const aim = { x: t.x + BC.tokenSpan(t) / 2, y: t.y + BC.tokenSpan(t) / 2 };
    return spellPlacement(sp, { x: Math.floor(aim.x), y: Math.floor(aim.y) }, slot, aim, t.id);
  }
  function missileOptions(placement, spell) {
    if (!placement || placement.map !== S.mapId || placement.campaign !== S.id || !placement.caster) return [];
    return visibleTokens()
      .filter(t => t.kind !== 'object' && t.id !== placement.caster && !info(t).dead)
      .flatMap(t => {
        const p = { x: t.x + BC.tokenSpan(t) / 2, y: t.y + BC.tokenSpan(t) / 2 };
        const target = spellPlacement(spell, { x: Math.floor(p.x), y: Math.floor(p.y) }, spell.level, p, t.id);
        if (!target || target.error || target.tokens[0] !== t.id) return [];
        return [
          {
            id: t.id,
            name: info(t).name || t.name,
            character: t.character_id,
            combatant: t.combatant_id,
            ally: t.kind === 'pc',
          },
        ];
      });
  }
  function assignMissiles(placement, spell, slot, ids) {
    const available = new Map(missileOptions(placement, spell).map(t => [t.id, t]));
    const count = Spells.missileCount(slot);
    const missiles = Array.from({ length: count }, (_, i) => available.get(ids[i] || placement.tokenId));
    if (missiles.some(dart => !dart)) throw Error('Cada dardo necesita un objetivo visible y en alcance.');
    const unique = [...new Map(missiles.map(dart => [dart.id, dart])).values()];
    return {
      ...placement,
      missiles,
      tokens: unique.map(dart => dart.id),
      hits: unique.map(({ character, combatant }) => ({ character, combatant })),
      allies: unique.filter(dart => dart.ally).map(dart => dart.id),
    };
  }
  function assignRays(placement, spell, count, ids) {
    const available = new Map(missileOptions(placement, spell).map(t => [t.id, t]));
    const options = Array.from({ length: count }, (_, i) => available.get(ids[i] || placement.tokenId));
    if (options.some(t => !t)) throw Error('Cada rayo necesita un objetivo visible y al alcance.');
    const targets = [...new Map(options.map(t => [t.id, t])).values()];
    return {
      ...placement,
      beams: count,
      rays: options,
      tokens: targets.map(t => t.id),
      hits: targets,
      allies: targets.filter(t => t.ally).map(t => t.id),
    };
  }
  function wardTargets(placement, spell, slot) {
    if (!Spells.wardCount(spell.id, slot)) return [];
    return visibleTokens().flatMap(t => {
      const span = BC.tokenSpan(t);
      const aim = { x: t.x + span / 2, y: t.y + span / 2 };
      const target = spellPlacement(spell, { x: Math.floor(aim.x), y: Math.floor(aim.y) }, slot, aim, t.id);
      return !target || target.error || !target.tokens.includes(t.id) || info(t).dead
        ? []
        : [
            {
              id: t.id,
              name: info(t).name || t.name,
              character: t.character_id,
              combatant: t.combatant_id,
              token: t.id,
            },
          ];
    });
  }
  function assignWard(placement, spell, slot, ids) {
    const options = new Map(wardTargets(placement, spell, slot).map(t => [t.id, t]));
    const chosen = [...new Set(ids)].map(id => options.get(id));
    const max = Spells.wardCount(spell.id, slot);
    if (!chosen.length || chosen.length > max || chosen.some(t => !t))
      throw Error('Elegí entre 1 y ' + max + ' criaturas visibles dentro del alcance.');
    return {
      ...placement,
      tokens: chosen.map(t => t.id),
      hits: chosen,
      saveTargets: spell.id === 'bane' ? chosen.filter(t => t.character || t.combatant).map(t => t.id) : [],
    };
  }
  function projectSpell(placement, kinds, spell, slot = spell?.level, zone) {
    if (!placement || placement.error || placement.map !== S.mapId || placement.campaign !== S.id) return;
    if (spell && Spells.implemented(spell.id)) {
      const cast = {
        castId: globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2),
        id: spell.id,
        name: spell.name,
        school: spell.school,
        level: slot,
        element: BoardSceneFX.typeKey(kinds[0]),
        point: placement.point,
        area: placement.area,
        caster: placement.caster,
        targets: placement.tokens,
        saveTargets: placement.saveTargets,
        darts: placement.missiles?.map(dart => dart.id),
        beams: placement.beams,
        rays: placement.rays?.map(t => t.id),
        weaponForm: placement.weaponForm,
        wallSide: placement.wallSide,
        allies: placement.allies,
        concentration: spell.concentration,
        rounds: globalThis.Effects?.roundsFrom(spell.duration),
      };
      if (zone && cast.area) {
        const created = Date.now(),
          encounter = S.party?.encounter,
          rounds = cast.rounds || 1;
        cast.zone = {
          ...zone,
          created,
          expiry: created + 6000 * rounds,
          rounds,
          turn: turnZoneKey(encounter),
          round: encounter?.round || 0,
          excluded: placement.zoneExcluded || [],
          included: placement.zoneIncluded || [],
        };
        Cloud.post(S.id, 'spell-zone', { ...cast, map: S.mapId }).catch(err => toast(err.message));
      }
      if (spell.id === 'misty-step') {
        if (!placement.teleport || !placement.casterBase) return;
        cast.departure = { x: placement.casterBase.x, y: placement.casterBase.y };
        cast.sentAt = Date.now();
      }
      if (addSpellCast(cast)) S.channel?.send({ t: 'spell-fx', map: S.mapId, cast });
      if (spell.id === 'misty-step') moveMistyStep(placement, cast.castId);
      S.spellAim = null;
      S.dirty = true;
      if (['spiritual-weapon', 'grasping-vine', 'dust-devil'].includes(spell.id)) {
        const weapon = S.spellCasts.find(e => e.castId === cast.castId);
        if (weapon) {
          weapon.summonedTurn = H.spiritualTurn?.();
          if (spell.id === 'grasping-vine') weapon.lashed = placement.hits.length > 0;
        }
        panel();
        tools();
      }
      return { ...spellBoardMeta(cast, placement.casterBase), zone: Boolean(cast.zone) };
    }
    for (const type of kinds) {
      const msg = {
        t: 'spell',
        map: S.mapId,
        kind: BoardSceneFX.typeKey(type),
        x: placement.x,
        y: placement.y,
        area: placement.area,
      };
      if (addCast(msg)) S.channel?.send(msg);
    }
    S.spellAim = null;
    S.dirty = true;
  }
  function moveMistyStep(placement, castId) {
    setTimeout(async () => {
      try {
        if (placement.map !== S.mapId || placement.campaign !== S.id) return;
        const t = tokenById(placement.caster);
        if (!t || !canMove(t)) throw Error('La ficha lanzadora ya no se puede mover.');
        const { x, y } = placement.teleport;
        if (!BC.roomFor(S.grid, S.terrain, { ...t, x, y }, []) || overlapsPieces({ ...t, x, y }, visibleTokens()))
          throw Error('Las casillas de destino se ocuparon.');
        if (
          t.x + BC.tokenSpan(t) / 2 !== placement.casterBase.x ||
          t.y + BC.tokenSpan(t) / 2 !== placement.casterBase.y
        )
          throw Error('La ficha lanzadora se movió antes de teletransportarse.');
        await applyPoses([{ id: t.id, patch: { x, y } }], {});
        afterMove(
          {
            token: t,
            start: { x: placement.casterBase.x - BC.tokenSpan(t) / 2, y: placement.casterBase.y - BC.tokenSpan(t) / 2 },
            free: true,
          },
          x,
          y,
          true,
        );
        pick();
      } catch (err) {
        const m = { t: 'spell-resolution', map: placement.map, castId, action: 'teleport-cancel' };
        spellResolution(m);
        S.channel?.send(m);
        toast(err.message);
      }
    }, 530);
  }
  function setSpellAim(world) {
    if (weaponAim || vineAim || dustAim) return null;
    const sp = S.tool === 'scene' && H.cast && activeSpell();
    const cell = toCell(world);
    if (!sp || !BC.inside(S.grid, cell.x, cell.y)) {
      if (S.spellAim) S.dirty = true;
      S.spellAim = null;
      return null;
    }
    const placement = spellPlacement(sp, cell, sp.level, toCellF(world), hitToken(world)?.id);
    const effect = Rules.spellImpact(sp);
    const kind = BoardSceneFX.typeKey(effect.types[0] || (effect.healing ? 'heal' : 'magic'));
    S.spellAim = placement && {
      world,
      placement,
      color: SpellFX.colorFor(sp.id, kind, sp.school)[1],
      warn:
        effect.types.length > 0 ||
        ['web', 'grease', 'hypnotic', 'sleep', 'entangle', 'fear', 'color-spray'].includes(sp.id),
      wallWarning: sp.id === 'wall-of-fire' && placement?.tokens.length > 0,
    };
    hint(
      placement?.error ||
        (S.spellAim?.wallWarning
          ? 'Criaturas en las casillas del muro: ' +
            placement.tokens.length +
            '. El muro puede dañarlas. Tocá para confirmar.'
          : placement?.allies.length && S.spellAim?.warn
            ? 'Aliados en el área: ' + placement.allies.length + '. Tocá para confirmar el punto.'
            : 'Tocá para elegir el punto. Arrastrá para mover la cámara.'),
    );
    S.dirty = true;
    return placement;
  }
  function castAt(cell, world) {
    if (dustAim) {
      moveDustDevil(cell, dustAim, H.prepareDustMove)
        .then(() => {
          dustAim = null;
          if (H.compactCast) S.tool = 'move';
          tools();
          panel();
        })
        .catch(err => toast(err.message));
      return;
    }
    if (vineAim) {
      const t = hitToken(world);
      try {
        const strike = lashGraspingVine(t?.id, vineAim, H.prepareVineLash);
        Promise.resolve(H.vineLash?.(strike))
          .then(result => {
            if (result) casting?.showResult(result);
          })
          .catch(err => toast(err.message));
        vineAim = null;
        if (H.compactCast) S.tool = 'move';
        tools();
        panel();
      } catch (err) {
        toast(err.message);
      }
      return;
    }
    if (weaponAim) {
      const t = hitToken(world);
      if (!t) return toast('Elegí una criatura junto al arma espiritual.');
      try {
        const strike = swingSpiritualWeapon(t.id, weaponAim, H.prepareSpiritualAttack);
        H.spiritualAttack?.(strike);
        weaponAim = null;
        if (H.compactCast) S.tool = 'move';
        tools();
        panel();
      } catch (err) {
        toast(err.message);
      }
      return;
    }
    if (H.cast) {
      const sp = activeSpell();
      if (!sp) return;
      const placement = setSpellAim(world);
      if (!placement || placement.error) return toast(placement?.error || 'Elegí una casilla visible del mapa activo.');
      try {
        H.cast(sp.id, false, placement);
      } catch (err) {
        toast(err.message);
      }
      return;
    }
    const msg = { t: 'spell', map: S.mapId, kind: S.spell, x: cell.x, y: cell.y };
    if (!addCast(msg)) return;
    if (S.mapId === activeId()) S.channel?.send(msg);
  }
  function activeSpiritualWeapon() {
    const me = actor();
    const now = performance.now();
    return (
      me &&
      S.spellCasts.findLast(
        e => e.id === 'spiritual-weapon' && e.caster === me.id && (e.held || e.until > now) && !e.endedAt,
      )
    );
  }
  function activeGraspingVine() {
    const me = actor(),
      now = performance.now();
    if (!me || (H.compactCast && state.concentration !== 'grasping-vine')) return null;
    return S.spellCasts.findLast(
      e => e.id === 'grasping-vine' && e.caster === me.id && (e.held || e.until > now) && e.endedAt == null,
    );
  }
  function vineTarget(point, token) {
    if (!point || !token || token.kind === 'object' || info(token).dead) return false;
    const source = { x: point.x - 0.5, y: point.y - 0.5, size: 1 };
    return (
      Spells.distance(source, token, point, S.grid.feet) <= 30 &&
      Spells.unobstructed(point, tokenCenter(token), targetingWalls())
    );
  }
  function activeDustDevil() {
    const me = actor(),
      now = performance.now();
    if (!me || (H.compactCast && state.concentration !== 'dust-devil')) return null;
    return S.spellCasts.findLast(
      e =>
        e.id === 'dust-devil' &&
        e.caster === me.id &&
        (e.held || e.until > now) &&
        e.endedAt == null &&
        spellZones.has(e.castId),
    );
  }
  let dustMoving = false;
  async function moveDustDevil(cell, castId, beforeMove = null) {
    const devil = activeDustDevil();
    if (!devil || devil.castId !== castId) throw Error('El remolino ya no está activo.');
    if (dustMoving) throw Error('Esperá a que termine de moverse el remolino.');
    const point = { x: cell.x + 0.5, y: cell.y + 0.5 };
    const source = { x: devil.point.x - 0.5, y: devil.point.y - 0.5, size: 1 };
    const destination = { x: cell.x, y: cell.y, size: 1 };
    if (
      !Number.isInteger(cell.x) ||
      !Number.isInteger(cell.y) ||
      !BC.roomFor(S.grid, S.terrain, destination, mapTokens()) ||
      Spells.distance(source, destination, null, S.grid.feet) > 30 ||
      BC.wallOnPath(S.walls, [source, destination]) ||
      !Spells.unobstructed(devil.point, point, targetingWalls())
    )
      throw Error('Elegí una casilla libre a 30 pies o menos del remolino, sin atravesar paredes.');
    if (point.x === devil.point.x && point.y === devil.point.y)
      throw Error('Elegí otra casilla para mover el remolino.');
    dustMoving = true;
    try {
      beforeMove?.({ first: !devil.moved && devil.summonedTurn === H.spiritualTurn?.() });
      const zone = spellZones.get(castId);
      const dx = point.x - zone.point.x,
        dy = point.y - zone.point.y;
      const area = { ...zone.area, x: zone.area.x + dx, y: zone.area.y + dy, origin: point };
      await Cloud.post(S.id, 'spell-zone', {
        ...zone,
        area,
        point,
        moved: true,
        map: S.mapId,
        summonedTurn: devil.summonedTurn,
      });
      const message = { t: 'spell-resolution', action: 'dust-move', map: S.mapId, castId, point };
      spellResolution(message);
      await S.channel?.send(message);
      return { point, area };
    } finally {
      dustMoving = false;
    }
  }
  function lashGraspingVine(id, castId, beforeLash = null) {
    const vine = activeGraspingVine();
    if (!vine || vine.castId !== castId) throw Error('La enredadera ya no está activa.');
    const token = visibleTokens().find(t => t.id === id);
    if (!vineTarget(vine.point, token)) throw Error('Elegí una criatura visible a 30 pies o menos de la enredadera.');
    const strike = {
      slot: vine.slot,
      first: !vine.lashed && vine.summonedTurn === H.spiritualTurn?.(),
      hits: [castHit(token)],
      boardCast: spellBoardMeta(vine, tokenCenter(actor())),
    };
    beforeLash?.(strike);
    vine.lashed = true;
    return strike;
  }
  function smiteStrike(id, reach = 5) {
    const me = actor(),
      now = performance.now();
    if (!me) return null;
    const smite = S.spellCasts.findLast(
      e => e.id === 'thunderous-smite' && e.caster === me.id && (e.held || e.until > now) && e.endedAt == null,
    );
    const target = visibleTokens().find(t => (t.combatant_id === id || t.character_id === id) && t.kind !== 'object');
    if (!smite || !target || target.id === me.id) return null;
    if (Spells.distance(me, target, null, S.grid.feet) > reach) return false;
    const strike = { hits: [castHit(target)], boardCast: spellBoardMeta(smite, tokenCenter(me)) };
    const m = { t: 'spell-resolution', map: S.mapId, castId: smite.castId, action: 'smite-used' };
    spellResolution(m);
    S.channel?.send(m);
    return strike;
  }
  function swingSpiritualWeapon(id, castId, beforeSwing = null) {
    const weapon = activeSpiritualWeapon();
    if (!weapon || weapon.castId !== castId) throw Error('El arma espiritual ya no está activa.');
    const token = visibleTokens().find(t => t.id === id && t.kind !== 'object' && !info(t).dead);
    if (!token) throw Error('Elegí una criatura visible.');
    const span = BC.tokenSpan(token);
    const { x, y } = weapon.point;
    const distance = Math.max(token.x - x, x - token.x - span, token.y - y, y - token.y - span, 0) * S.grid.feet;
    if (distance > 5 || !Spells.unobstructed(weapon.point, tokenCenter(token), targetingWalls()))
      throw Error('El objetivo debe estar al alcance de 5 pies del arma.');
    const strike = {
      castId,
      token: token.id,
      slot: weapon.slot,
      first: !weapon.swing && weapon.summonedTurn === H.spiritualTurn?.(),
      hits: [{ character: token.character_id, combatant: token.combatant_id }],
    };
    beforeSwing?.(strike);
    const m = { t: 'spell-resolution', map: S.mapId, castId, action: 'swing', token: id, point: tokenCenter(token) };
    spellResolution(m);
    S.channel?.send(m);
    return strike;
  }
  function spiritualImpact(castId, id) {
    const weapon = activeSpiritualWeapon();
    if (!weapon || weapon.castId !== castId || !visibleTokens().some(t => t.id === id)) return;
    const m = { t: 'spell-resolution', map: S.mapId, castId, action: 'weapon-impact', token: id };
    spellResolution(m);
    S.channel?.send(m);
  }

  function drawSpellAim(ground, pieces) {
    const compact = casting?.plan();
    if (compact) return drawCompactAim(compact, ground, pieces);
    const aim = S.tool === 'scene' && S.spellAim;
    if (!aim) return;
    const { placement, color, warn, wallWarning } = aim;
    const c = cellPx(),
      o = origin();
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.scale(c, c);
    ctx.beginPath();
    ctx.rect(0, 0, S.grid.cols, S.grid.rows);
    ctx.clip();
    if (ground) {
      if (placement.casterBase && Number.isFinite(placement.range) && placement.range > 0) {
        const r = placement.range / S.grid.feet + placement.casterBase.span / 2;
        const { x, y } = placement.casterBase;
        ctx.setLineDash([0.12, 0.12]);
        ctx.strokeStyle = hexA(color, 0.36);
        ctx.lineWidth = 0.024;
        ctx.strokeRect(x - r, y - r, 2 * r, 2 * r);
      }
      ctx.setLineDash([]);
      ctx.lineWidth = 0.046;
      ctx.strokeStyle = placement.error ? '#fb725e' : color;
      const a = placement.area;
      if (a) {
        ctx.fillStyle = wallWarning ? '#ff612b6b' : hexA(ctx.strokeStyle, 0.26);
        for (const [x, y] of placement.cells) if (canSeeCast(x, y)) ctx.fillRect(x, y, 1, 1);
        const points = Spells.outline(S.grid, a);
        ctx.beginPath();
        points.forEach(([x, y], i) => ctx[i ? 'lineTo' : 'moveTo'](x, y));
        ctx.closePath();
        ctx.stroke();
      } else if (placement.point) {
        ctx.beginPath();
        ctx.arc(placement.point.x, placement.point.y, 0.24, 0, 2 * Math.PI);
        ctx.stroke();
      }
    } else if (!placement.error) {
      const hits = new Set(placement.tokens),
        allies = new Set(placement.allies);
      for (const { t, foot } of pieces)
        if (hits.has(t.id)) {
          const radius = Math.max(0.23, BC.tokenSpan(t) * 0.45);
          ctx.strokeStyle = wallWarning ? '#ff7040' : warn && allies.has(t.id) ? '#ffab67' : color;
          ctx.lineWidth = 0.05;
          ctx.beginPath();
          ctx.ellipse((foot.x - o.x) / c, (foot.y - o.y) / c, radius, radius * 0.65, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
    }
    ctx.restore();
  }
  function drawCompactAim(plan, ground, pieces) {
    const s = casting.aim(),
      p = plan.placement;
    if (!s || !plan.center) return;
    const o = origin(),
      c = cellPx(),
      gold = '#f5ca78',
      bright = '#82e3bf';
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.scale(c, c);
    ctx.beginPath();
    ctx.rect(0, 0, S.grid.cols, S.grid.rows);
    ctx.clip();
    if (ground) {
      if (plan.range) {
        ctx.beginPath();
        ctx.arc(
          plan.center.x,
          plan.center.y,
          plan.range / S.grid.feet + (p?.casterBase?.span || 1) / 2,
          0,
          2 * Math.PI,
        );
        ctx.setLineDash([0.12, 0.11]);
        ctx.strokeStyle = '#8bdcc0bb';
        ctx.lineWidth = 0.035;
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (plan.destination) {
        const r = Math.ceil(plan.range / S.grid.feet),
          { x, y } = plan.center,
          selected = p?.teleport;
        for (let row = Math.max(0, Math.floor(y) - r); row < Math.min(S.grid.rows, y + r); row++)
          for (let col = Math.max(0, Math.floor(x) - r); col < Math.min(S.grid.cols, x + r); col++) {
            const test = spellPlacement(s.sp, { x: col, y: row }, s.slot.level, { x: col + 0.5, y: row + 0.5 });
            if (test?.error || !test) continue;
            ctx.fillStyle =
              selected && s.aim && test.teleport.x === selected.x && test.teleport.y === selected.y
                ? '#a9f2c9a0'
                : '#71d1ae48';
            ctx.fillRect(col + 0.04, row + 0.04, 0.92, 0.92);
          }
      }
      if (p?.area) {
        const points = Spells.outline(S.grid, p.area);
        ctx.beginPath();
        points.forEach(([x, y], i) => ctx[i ? 'lineTo' : 'moveTo'](x, y));
        ctx.closePath();
        ctx.strokeStyle = gold;
        ctx.lineWidth = p.area.ring ? p.area.width / S.grid.feet : 0.04;
        ctx.fillStyle = p.area.kind === 'wall' ? '#f171356f' : '#f7c36846';
        if (!p.area.ring) ctx.fill();
        ctx.stroke();
      }
    } else {
      const affected = new Set(p?.tokens || []);
      for (const { t, foot } of pieces) {
        const x = (foot.x - o.x) / c,
          y = (foot.y - o.y) / c;
        const radius = Math.max(0.21, BC.tokenSpan(t) * 0.44),
          count = s.selected.filter(id => id === t.id).length;
        if (dimCastTarget(plan, s, t)) {
          ctx.strokeStyle = '#e4d9c3dc';
          ctx.lineWidth = 0.035;
          ctx.beginPath();
          ctx.ellipse(x, y, radius, radius * 0.62, 0, 0, 2 * Math.PI);
          ctx.moveTo(x - radius * 0.72, y + radius * 0.43);
          ctx.lineTo(x + radius * 0.72, y - radius * 0.43);
          ctx.stroke();
        }
        if (count || (p?.area && affected.has(t.id))) {
          const ally = p?.allies.includes(t.id);
          ctx.strokeStyle = ally ? '#ff9871' : bright;
          ctx.lineWidth = 0.065;
          ctx.beginPath();
          ctx.ellipse(x, y, radius, radius * 0.62, 0, 0, 2 * Math.PI);
          ctx.stroke();
          castBadge(
            x + radius * 0.7,
            y + radius * 0.47,
            castRays.has(s.sp.id) ? '×' + count : '✓',
            ally ? '#ff9871' : bright,
          );
        }
      }
      const a = p?.area;
      if (a?.kind === 'wall') {
        const arrow = wallArrow(a, s.wallSide);
        castBadge(arrow.x, arrow.y, s.wallSide === 1 ? '↻' : '↺', '#ff9b61');
      } else if (castDirection(a)) {
        const at = Spells.clipRay(S.grid, a, { x: a.x + Math.cos(a.dir) * 1.4, y: a.y + Math.sin(a.dir) * 1.4 });
        castBadge(at.x, at.y, '↻', gold);
      }
    }
    ctx.restore();
  }
  function dimCastTarget(plan, selection, token) {
    const p = plan?.placement;
    if (!selection || token.id === p?.caster) return false;
    if (plan.valid) return !plan.valid.has(token.id);
    if (selection.sp.id !== 'spirit-guardians' || !p?.cells || token.kind === 'object') return false;
    return Spells.affectedTokens(p.cells, [token]).length > 0 && !p.tokens.includes(token.id);
  }
  function castBadge(x, y, label, color) {
    ctx.beginPath();
    ctx.arc(x, y, 0.24, 0, 2 * Math.PI);
    ctx.fillStyle = '#122427';
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.035;
    ctx.stroke();
    ctx.font = 'bold 0.27px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(label, x, y + 0.015);
  }

  function drawScene(now, cellSize, origin, width, height, dpr) {
    if (S.grid.weather === 'clear' && !S.casts.length) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.clip();
    if (S.grid.weather !== 'clear') {
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      BoardSceneFX.weather(ctx, S.grid.weather, canvas.clientWidth, canvas.clientHeight, 0);
      ctx.restore();
    }
    S.casts = S.casts.filter(cast => now - cast.start < spellDuration);
    for (const cast of S.casts) {
      if (!canSeeCast(cast.x, cast.y)) continue;
      if (cast.area) drawTemplate(cast.area, true);
      ctx.save();
      ctx.translate(origin.x + (cast.x + 0.5) * cellSize, origin.y + (cast.y + 0.5) * cellSize);
      ctx.scale(cellSize, cellSize);
      BoardSceneFX.spell(ctx, cast.kind, reduceEffects() ? 0.4 : (now - cast.start) / spellDuration);
      ctx.restore();
    }
    ctx.restore();
  }
  function draw() {
    if (!shown) return requestAnimationFrame(draw);
    const now = performance.now();
    for (const [id, e] of teleportFrames) if (now - e.started > 950) teleportFrames.delete(id);
    for (const [id, e] of spellCrumbles) if (now - e.at > 850) spellCrumbles.delete(id);
    const settling = landing.size > 0;
    for (const [id, start] of landing) if (now - start >= 150) landing.delete(id);
    const animating = S.mapId && S.casts.length;
    const spellAnimating = S.mapId && S.spellCasts.length;
    const fastSpell =
      spellCrumbles.size ||
      teleportFrames.size ||
      (spellAnimating &&
        S.spellCasts.some(
          event =>
            now - event.started < 2200 ||
            (event.swing && now - event.swing.at < 560) ||
            (event.attackImpact && now - event.attackImpact.at < 400),
        ));
    const rotating = [...displayFacings.values()].some(f => f.previous);
    if (rotating)
      for (const f of displayFacings.values()) if (reducedMotion.matches || now - f.at >= 120) f.previous = null;
    if (
      !S.dirty &&
      !settling &&
      !rotating &&
      !S.pings.some(ping => now - ping.at >= pingDuration) &&
      !(animating && now - lastSceneFrame >= 1000 / 24) &&
      !(fastSpell && now - lastSceneFrame >= 15) &&
      !(traitsVisible && !reduceEffects() && now - lastSceneFrame >= 1000 / 15) &&
      !(spellAnimating && now - lastSceneFrame >= (fastSpell ? 15 : 1000 / 15))
    )
      return requestAnimationFrame(draw);
    lastSceneFrame = now;
    S.dirty = false;
    const dpr = window.devicePixelRatio || 1,
      { w, h } = worldSize(),
      c = cellPx(),
      o = origin(),
      g = S.grid;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = playerView() && (S.fogOn || S.grid.vision?.los) ? '#05090b' : '#071014';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (!S.mapId) return requestAnimationFrame(draw);
    const shake = { x: 0, y: 0 };
    if (fastSpell && fxPrefs.shake && !reduceEffects())
      for (const event of S.spellCasts) {
        const s = SpellFX.shake(event, now);
        shake.x += s?.x || 0;
        shake.y += s?.y || 0;
      }
    ctx.setTransform(dpr * S.view.s, 0, 0, dpr * S.view.s, dpr * (S.view.x + shake.x), dpr * (S.view.y + shake.y));
    // Celdas visibles en pantalla (para no dibujar todo el mapa en cada cuadro).
    const tl = toCell(toWorld(0, 0)),
      br = toCell(toWorld(canvas.width / dpr, canvas.height / dpr));
    const x0 = Math.max(0, tl.x - 1),
      y0 = Math.max(0, tl.y - 1),
      x1 = Math.min(g.cols - 1, br.x + 1),
      y1 = Math.min(g.rows - 1, br.y + 1);
    // Fondo
    if (S.img) ctx.drawImage(S.img, 0, 0, w, h);
    else {
      ctx.fillStyle = '#1d2a2e';
      ctx.fillRect(0, 0, w, h);
    }
    // Terreno: en los mapas pintados, una ilustración guardada en un lienzo aparte (board-art.js);
    // sobre una imagen, solo marcas semitransparentes.
    const art = S.img ? null : terrainArt();
    if (art) ctx.drawImage(art, 0, 0, art.width, art.height, o.x, o.y, g.cols * c, g.rows * c);
    else
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) {
          const code = S.terrain[y * g.cols + x];
          if (code && code !== '.') drawCell(code, o.x + x * c, o.y + y * c, c, x, y);
        }
    // Cuadrícula
    if (g.show) {
      ctx.strokeStyle = S.img ? hexA(g.color, g.opacity) : art ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.12)';
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
    drawWalls();
    drawLightMarks();
    // Muebles y objetos de escena
    const furniture = propsArt();
    if (furniture) ctx.drawImage(furniture, 0, 0, furniture.width, furniture.height, o.x, o.y, g.cols * c, g.rows * c);
    if (S.tool === 'props' && S.propHover && BP?.get(S.propId) && !S.drag) {
      const spot = propSpot(S.propHover);
      ctx.save();
      ctx.globalAlpha = BP.fits(g, spot[0], spot[1], S.propId, S.propRot) ? 0.6 : 0.2;
      ctx.translate(o.x, o.y);
      BP.drawOne(ctx, c, [spot[0], spot[1], S.propId, S.propRot]);
      ctx.restore();
    }
    // Áreas de efecto (debajo de las fichas)
    for (const t of S.templates) drawTemplate(t);
    if (S.drag?.area) drawTemplate({ ...S.drag.area, ...whoAmI() }, true);
    drawLights();
    // Fichas
    updateSpellClouds(now);
    const list = visibleTokens(true).sort(tokenOrder);
    const inView = list.filter(t => {
      const p = tokenPos(t),
        size = t.size || 1;
      return (
        p.x + size >= tl.x - 2 * size && p.x <= br.x + 2 * size && p.y + size >= tl.y - size && p.y <= br.y + 3 * size
      );
    });
    const pieces = inView.map(t => presentToken(t, now));
    if (spellAnimating) evaluateSpellCasts(now, pieces);
    else lastSpellPoses = [];
    drawSpellAim(true, pieces);
    drawSpellLayer(now, 'ground');
    ctx.imageSmoothingEnabled = !pixelMinis(); // pixel figures stay hard-edged at any zoom
    drawPieces(pieces);
    ctx.imageSmoothingEnabled = true;
    drawBoardTraits(pieces, now);
    drawSpellLayer(now, 'air');
    drawThunderRipple(now, dpr, shake);
    drawSpellFlash(now, o, c);
    drawSpellLayer(now, 'fog');
    drawSpellAim(false, pieces);
    drawScene(now, c, o, w, h, dpr);
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
    // Línea de visión: lo que la party no tiene a la vista (opaco para jugadores, velado para el DM).
    const state = sightState(!playerView());
    if (state && state.los && !(playerView() && spellClouds.length)) {
      // Con paredes: la máscara suave, con penumbra y visión en la oscuridad.
      const mask = visionMask(state);
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      if (playerView() && mask.grey) {
        ctx.globalCompositeOperation = 'saturation';
        drawWindowLayer(mask.grey, mask.win);
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.globalAlpha = playerView() ? 1 : 0.5;
      drawWindowLayer(mask.dark, mask.win);
      ctx.restore();
      if (playerView() && S.img && !S.fogOn) {
        ctx.fillStyle = '#05090b';
        ctx.fillRect(-w, -h, w * 3, h + o.y);
        ctx.fillRect(-w, o.y + g.rows * c, w * 3, h * 2);
        ctx.fillRect(-w, 0, w + o.x, h);
        ctx.fillRect(o.x + g.cols * c, 0, w * 2, h);
      }
    } else if (state) {
      // Nubes de conjuro (Nube de niebla, Oscuridad…): casilla por casilla.
      const bits = state.bits;
      const clearSight = playerView() && spellClouds.length ? seen(true) : null;
      const solid = playerView(),
        pad = solid ? 0.5 : 0;
      ctx.fillStyle = solid ? '#05090b' : 'rgba(5,9,11,0.45)';
      ctx.beginPath();
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++)
          if (!bits[y * g.cols + x]) {
            const soft =
              spellClouds.some(p => Math.hypot(x + 0.5 - p.x, y + 0.5 - p.y) < p.r) && isSeen(clearSight, x, y);
            if (!soft) ctx.rect(o.x + x * c - pad, o.y + y * c - pad, c + pad * 2, c + pad * 2);
          }
      ctx.fill();
      if (solid && S.img && !S.fogOn) {
        ctx.fillRect(-w, -h, w * 3, h + o.y);
        ctx.fillRect(-w, o.y + g.rows * c, w * 3, h * 2);
        ctx.fillRect(-w, 0, w + o.x, h);
        ctx.fillRect(o.x + g.cols * c, 0, w * 2, h);
      }
    }
    drawPlayerDoors();
    drawTarget();
    // Herramientas en curso
    if (S.drag?.token)
      drawRuler(S.drag.from, S.drag.token, info(S.drag.token).speed, S.drag.risk, S.drag.plan, S.drag.wall);
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
    const readable = playerView() ? pieces.filter(p => !tokenInSpellCloud(p.t)) : pieces;
    drawMiniLabel(readable);
    positionCard(readable);
    positionRotationHandle(readable);
    drawCastBanner(now, dpr);
    requestAnimationFrame(draw);
  }
  const hexA = (hex, a) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
  };
  // Ilustración del terreno pintado: se arma una vez y, al pintar, se rehace solo la parte que cambió.
  const artCache = { canvas: null, terrain: null, cols: 0, rows: 0, tile: 0 };
  function terrainArt() {
    const A = globalThis.BoardArt,
      g = S.grid;
    if (!A) return null;
    const tile = A.tileFor(g);
    if (!artCache.canvas || artCache.cols !== g.cols || artCache.rows !== g.rows || artCache.tile !== tile) {
      artCache.canvas ||= document.createElement('canvas');
      artCache.canvas.width = g.cols * tile;
      artCache.canvas.height = g.rows * tile;
      Object.assign(artCache, { cols: g.cols, rows: g.rows, tile, terrain: null });
    }
    if (artCache.terrain !== S.terrain) {
      const region = artCache.terrain === null ? undefined : A.changed(g, artCache.terrain, S.terrain);
      if (region !== null) A.paint(artCache.canvas.getContext('2d'), g, S.terrain, tile, region);
      artCache.terrain = S.terrain;
    }
    return artCache.canvas;
  }
  // Los muebles se dibujan una vez en un lienzo aparte y se rehacen solo cuando cambian.
  const propCache = { canvas: null, props: null, cols: 0, rows: 0, tile: 0 };
  function propsArt() {
    if (!BP || !S.props.length) return null;
    const g = S.grid,
      tile = globalThis.BoardArt?.tileFor(g) || 48;
    if (
      propCache.props !== S.props ||
      propCache.cols !== g.cols ||
      propCache.rows !== g.rows ||
      propCache.tile !== tile
    ) {
      propCache.canvas ||= document.createElement('canvas');
      propCache.canvas.width = g.cols * tile;
      propCache.canvas.height = g.rows * tile;
      BP.paint(propCache.canvas.getContext('2d'), S.props, tile);
      Object.assign(propCache, { props: S.props, cols: g.cols, rows: g.rows, tile });
    }
    return propCache.canvas;
  }
  // Esquina donde cae la pieza elegida al tocar una casilla: centrada sobre el toque.
  function propSpot(cell) {
    const [w, h] = BP.footprint(S.propId, S.propRot);
    return [cell.x - Math.floor((w - 1) / 2), cell.y - Math.floor((h - 1) / 2)];
  }
  const saveProps = next => {
    S.props = next;
    saveSoon(terrainPatch());
    S.dirty = true;
    if (S.tool === 'props') panel();
  };
  function propDown(cell) {
    if (S.propId === 'erase') {
      S.drag = { propErase: true };
      return propErase(cell);
    }
    if (S.propId === 'move') {
      const i = BP.at(S.props, cell.x, cell.y);
      if (i < 0) return false;
      const it = S.props[i];
      S.drag = { prop: { i, dx: cell.x - it[0], dy: cell.y - it[1], moved: false } };
      return true;
    }
    const [x, y] = propSpot(cell);
    if (!BP.fits(S.grid, x, y, S.propId, S.propRot)) return toast('Ahí no entra: queda fuera del mapa.');
    if (S.props.length >= BP.MAX) return toast(`Este mapa ya tiene ${BP.MAX} piezas. Borrá alguna para sumar más.`);
    if (S.props.some(p => p[0] === x && p[1] === y && p[2] === S.propId && p[3] === S.propRot)) return true;
    saveProps([...S.props, [x, y, S.propId, S.propRot]]);
    return true;
  }
  function propErase(cell) {
    const i = BP.at(S.props, cell.x, cell.y);
    if (i >= 0) saveProps(S.props.filter((_, k) => k !== i));
  }
  function propDrag(d, cell) {
    const it = S.props[d.i],
      x = cell.x - d.dx,
      y = cell.y - d.dy;
    if (!it || (x === it[0] && y === it[1]) || !BP.fits(S.grid, x, y, it[2], it[3])) return;
    d.moved = true;
    S.props = S.props.map((p, k) => (k === d.i ? [x, y, p[2], p[3]] : p));
  }
  // Soltar una pieza: si se movió queda ahí; si solo se tocó, gira un cuarto de vuelta.
  function propUp(d) {
    const it = S.props[d.i];
    if (!it) return;
    if (d.moved) return saveProps(S.props);
    const [w, h] = BP.footprint(it[2], it[3]),
      rot = (it[3] + 1) & 3,
      [nw, nh] = BP.footprint(it[2], rot),
      // Gira sobre su centro: una cama de 1×2 no se corre de lugar más de lo necesario.
      x = Math.max(0, Math.min(S.grid.cols - nw, it[0] + Math.floor((w - nw) / 2))),
      y = Math.max(0, Math.min(S.grid.rows - nh, it[1] + Math.floor((h - nh) / 2)));
    saveProps(S.props.map((p, k) => (k === d.i ? [x, y, p[2], rot] : p)));
  }
  // Paredes, puertas y ventanas. El DM las ve todas (con la herramienta «Paredes» o «Ver paredes»);
  // los jugadores solo ven las puertas, para poder abrirlas. La visión y la niebla tapan las que no ven.
  const WALL_STYLE = {
    0: { color: 'rgba(80,200,255,0.8)', width: 3 },
    1: { color: '#f0a040', width: 6 },
    2: { color: '#f0a040', width: 3, dash: [6, 5] },
    3: { color: '#e0524a', width: 6 },
    4: { color: '#bfefff', width: 3, dash: [2, 5] },
  };
  // Las puertas que ven los jugadores van encima de la oscuridad: una puerta está justo en el borde entre lo que
  // se ve y lo que no. Se dibuja si alguna de las dos casillas que separa está a la vista (y sin niebla).
  function drawPlayerDoors() {
    if (!playerView() || !S.walls.length) return;
    const c = cellPx(),
      o = origin(),
      k = 1 / S.view.s,
      bits = seen();
    const visible = ([x, y]) =>
      isSeen(bits, x, y) && (!S.fogOn || BC.isRevealed(S.grid, S.fog, x, y)) && BC.inside(S.grid, x, y);
    ctx.save();
    ctx.lineCap = 'round';
    for (const w of S.walls) {
      if (!BC.isWallDoor(w)) continue;
      const mx = (w[0] + w[2]) / 2,
        my = (w[1] + w[3]) / 2,
        len = Math.hypot(w[2] - w[0], w[3] - w[1]) || 1,
        nx = (-(w[3] - w[1]) / len) * 0.35,
        ny = ((w[2] - w[0]) / len) * 0.35;
      const sides = [
        [Math.floor(mx + nx), Math.floor(my + ny)],
        [Math.floor(mx - nx), Math.floor(my - ny)],
      ];
      if (!sides.some(visible)) continue;
      // Una trabada se ve igual que una cerrada: eso lo descubren al intentar abrirla.
      const open = BC.wallKind(w) === BC.WALL.open;
      for (const [color, width, dash] of [
        ['rgba(20,12,6,0.85)', open ? 5 : 9, null],
        [open ? '#d9a35b' : '#b57636', open ? 3 : 6, open ? [6, 5] : null],
      ]) {
        ctx.strokeStyle = color;
        ctx.lineWidth = width * k;
        ctx.setLineDash(dash ? dash.map(d => d * k) : []);
        ctx.beginPath();
        ctx.moveTo(o.x + w[0] * c, o.y + w[1] * c);
        ctx.lineTo(o.x + w[2] * c, o.y + w[3] * c);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  function drawWalls() {
    const c = cellPx(),
      o = origin(),
      k = 1 / S.view.s,
      editing = S.tool === 'walls' && dmView(),
      all = !playerView() && (S.showWalls || editing);
    if ((!S.walls.length || !all) && !editing) return;
    const line = (w, style, width = style.width) => {
      ctx.strokeStyle = style.color;
      ctx.lineWidth = width * k;
      ctx.setLineDash(style.dash ? style.dash.map(d => d * k) : []);
      ctx.beginPath();
      ctx.moveTo(o.x + w[0] * c, o.y + w[1] * c);
      ctx.lineTo(o.x + w[2] * c, o.y + w[3] * c);
      ctx.stroke();
    };
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 0; i < S.walls.length; i++) {
      const w = S.walls[i],
        kind = BC.wallKind(w);
      if (all) {
        if (editing && i === S.wallHover) line(w, { color: 'rgba(255,255,255,0.9)' }, WALL_STYLE[kind].width + 5);
        line(w, WALL_STYLE[kind]);
      }
    }
    ctx.setLineDash([]);
    if (editing) {
      // Extremos, para apoyar tramos nuevos, y el tramo que se está trazando.
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      for (const w of S.walls)
        for (const [x, y] of [
          [w[0], w[1]],
          [w[2], w[3]],
        ]) {
          ctx.moveTo(o.x + x * c + 3.5 * k, o.y + y * c);
          ctx.arc(o.x + x * c, o.y + y * c, 3.5 * k, 0, Math.PI * 2);
        }
      ctx.fill();
      const from = S.wallDraw?.from || S.wallChain,
        to = S.wallDraw?.to || S.wallAim;
      if (from && to && ['wall', 'door', 'window'].includes(S.wallMode)) {
        const kind = { wall: 0, door: 1, window: 4 }[S.wallMode];
        line([from.x, from.y, to.x, to.y], { ...WALL_STYLE[kind], color: 'rgba(255,255,255,0.95)' }, 2);
        line([from.x, from.y, to.x, to.y], WALL_STYLE[kind]);
        ctx.setLineDash([]);
      }
      for (const p of [from, to].filter(Boolean)) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(o.x + p.x * c, o.y + p.y * c, 5 * k, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
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
        ctx.arc(
          px + c * (0.15 + rx * 0.7),
          py + c * (0.15 + ry * 0.7),
          c * (code === 'r' ? 0.18 : 0.06),
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    } else if (code === 'S') {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      for (let i = 0; i < 4; i++) ctx.fillRect(px + c * 0.12, py + c * (0.14 + i * 0.2), c * 0.76, c * 0.07);
    } else if (code === 'O') {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(px + c * 0.1, py + c * 0.42, c * 0.12, c * 0.5);
    } else if (code === 'D' || code === 'L') {
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
    const r =
      S.drag?.token?.id === t.id ? S.drag.token : S.drag?.group?.find(k => k.id === t.id) || S.remote.get(t.id) || t;
    return { x: r.x, y: r.y, facing: r.facing };
  }

  const factionColors = { ally: '#4ade80', enemy: '#ef4444', neutral: '#facc15' };
  const propSizes = { tiny: 0.5, small: 1, medium: 1, large: 2, huge: 3, gargantuan: 4 };
  const miniPack = new Map();
  const characterPack = new Map();
  const landing = new Map();
  let hoverToken = null;
  let coveredPieces = [];
  const pixelMinis = () => (fxPrefs.pixelMinis ? PIXEL_MINIS : 0);
  async function loadMiniPack() {
    Miniatures.setPixelStyle?.(pixelMinis());
    miniPack.clear();
    characterPack.clear();
    displayFacings.clear();
    S.dirty = true;
    if (typeof fetch !== 'function') return;
    try {
      const density = pixelMinis();
      const response = await fetch(`./assets/${density ? 'minis-pixel' : 'minis'}/index.json`);
      if (!response.ok) return;
      for (const entry of await response.json()) {
        if (!/^[A-Za-z0-9_-]+\.png$/.test(entry.image) || typeof entry.id !== 'string') continue;
        if (!Number.isFinite(entry.anchor?.x) || !Number.isFinite(entry.anchor?.y)) continue;
        if (entry.pixelsPerSquare !== (density || CELL) || !propSizes[entry.size]) continue;
        miniPack.set(entry.id, entry);
        if (typeof entry.appearance === 'string') characterPack.set(entry.appearance, entry);
      }
      S.dirty = true;
    } catch {
      // El tablero también abre sin un paquete de imágenes.
    }
  }
  function modelFootprint(name) {
    return propSizes[CreatureMiniatures.selection(name)?.size] || 1;
  }
  function creatureFor(t, appearance = info(t)) {
    if (!['monster', 'npc'].includes(t.kind)) return null;
    if (!t.creature_model && (appearance.miniature || appearance.portrait)) return null;
    return CreatureMiniatures.selection(t.name, t.creature_model, t.model_form, t.size);
  }
  function creaturePack(model) {
    if (!model) return null;
    const form = model.age || model.variant;
    return (
      miniPack.get(form ? `${model.id}-${form}` : model.id) || (model.age === 'young' ? miniPack.get(model.id) : null)
    );
  }
  function displayTokenName(t, model) {
    if (!model || CreatureMiniatures.resolve(t.name)?.id !== model.id) return t.name || '';
    const indexed = /(?:^|\s)#?\d+$/.exec(t.name)?.[0] || '';
    const name = creaturePack(model)?.name || model.name;
    const age = model.age && CreatureMiniatures.forms(model.id).find(form => form.age === model.age)?.label;
    return name + (age ? ' ' + age.toLowerCase() : '') + indexed;
  }
  function sizedToken(t) {
    if (t.kind === 'object') return t;
    const model = creatureFor(t);
    const size =
      propSizes[model?.size] ||
      (t.kind === 'pc' || t.character_id ? 1 : [0.5, 1, 2, 3, 4].includes(t.size) ? t.size : 1);
    return { ...t, size, savedXY: { x: t.x, y: t.y }, x: BC.snapToken(t.x, size), y: BC.snapToken(t.y, size) };
  }
  function tokenFoot(t, position = tokenPos(t)) {
    const { x, y, span } = BC.footprintRect({ ...position, size: t.size });
    const c = cellPx(),
      o = origin();
    return {
      x: o.x + (x + span / 2) * c,
      y: o.y + (y + span / 2) * c,
      diameter: span * c,
    };
  }
  function tokenOrder(a, b) {
    return BC.depthOrder({ ...a, ...tokenPos(a) }, { ...b, ...tokenPos(b) });
  }
  function landingAmount(t, now) {
    if (reducedMotion.matches) return 0;
    if ((press?.moved && (S.drag?.token?.id === t.id || S.drag?.group?.some(k => k.id === t.id))) || S.remote.has(t.id))
      return 1;
    const start = landing.get(t.id);
    if (start === undefined) return 0;
    return Math.max(0, 1 - (now - start) / 150) ** 2;
  }
  const displayFacings = new Map(),
    missingFacings = new Set();
  const fixedStands = new Set([
    'bat',
    'hawk',
    'owl',
    'stirge',
    'wasp',
    'bat-swarm',
    'raven-swarm',
    'insect-swarm',
    'wisp',
    'beholder',
    'flying-sword',
  ]);
  const boardSpriteUrl = filename =>
    pixelMinis() ? `./assets/minis-pixel/${filename}` : `./assets/minis/${filename}?px=${CELL}`;
  // Pixel sprites ship at art resolution; blow each up once to the board's scale, hard-edged.
  const blownUp = new WeakMap();
  function frameImage(frame) {
    if (
      !/^[A-Za-z0-9_-]+\.png$/.test(frame?.image) ||
      !Number.isFinite(frame.anchor?.x) ||
      !Number.isFinite(frame.anchor?.y)
    )
      return null;
    const image = portraitImg(boardSpriteUrl(frame.image));
    if (!image || !pixelMinis()) return image && { image, anchor: frame.anchor };
    const f = Math.round(CELL / pixelMinis());
    let big = blownUp.get(image);
    if (!big) {
      big = document.createElement('canvas');
      big.width = image.naturalWidth * f;
      big.height = image.naturalHeight * f;
      const g = big.getContext('2d');
      g.imageSmoothingEnabled = false;
      g.drawImage(image, 0, 0, big.width, big.height);
      blownUp.set(image, big);
    }
    return { image: big, anchor: { x: frame.anchor.x * f, y: frame.anchor.y * f } };
  }
  function presentToken(t, now) {
    const tele = teleportFrames.get(t.id);
    const travel = tele && now - tele.started;
    const endpoint = tele && (travel < 535 ? tele.teleport.from : tele.teleport.to);
    const span = BC.tokenSpan(t);
    const foot = tokenFoot(t, endpoint ? { x: endpoint.x - span / 2, y: endpoint.y - span / 2 } : undefined),
      d = info(t),
      model = creatureFor(t, d);
    const crumb = spellCrumbles.get(t.id);
    const crumble = crumb ? Math.max(0, Math.min(1, (now - crumb.at) / 690)) : 0;
    const teleportAlpha = !endpoint
      ? 1
      : travel < 495
        ? Math.min(1, (495 - travel) / 145)
        : travel < 690
          ? 0
          : Math.min(1, (travel - 690) / 190);
    if (!endpoint && !crumb && !reduceEffects()) {
      const shock = S.spellCasts.find(
        e => e.id === 'thunderwave' && e.targets.includes(t.id) && now - e.started >= 300 && now - e.started < 570,
      );
      if (shock) {
        const origin = shock.area?.origin || shock.point;
        const dx = foot.x - origin.x * CELL - (S.img ? S.grid.ox * imageScale() : 0);
        const dy = foot.y - origin.y * CELL - (S.img ? S.grid.oy * imageScale() : 0);
        const f =
          (Math.max(0, Math.sin(((now - shock.started - 300) / 270) * Math.PI)) * 8) / (Math.hypot(dx, dy) || 1);
        foot.x += dx * f;
        foot.y += dy * f;
      }
    }
    if (!endpoint && !crumb && SpellFX.reaction)
      for (const event of S.spellCasts) {
        if (!event.targets?.includes(t.id) && !event.darts?.includes(t.id) && !event.rays?.includes(t.id)) continue;
        const r = SpellFX.reaction(event, t.id, now, reduceEffects());
        if (!r) continue;
        foot.x += r.x * cellPx();
        foot.y += r.y * cellPx();
      }
    const creature = model?.id,
      figure = !t.creature_model && d.miniature;
    const portrait = !t.creature_model && !figure && portraitImg(d.portrait);
    const pack = figure ? characterPack.get(Miniatures.appearanceKey(figure)) : creaturePack(model);
    const facing = BC.heading(S.rotationPreview.get(t.id) ?? tokenPos(t).facing ?? t.facing);
    const rotation =
      BC.heading((figure && pack ? Math.round((figure.facing - (pack.facing ?? 20)) / 45) : 0) - facing) * 45;
    const key = String(rotation).padStart(3, '0');
    const fixed = fixedStands.has(creature) || !!pack?.fixture;
    const fixedModel = fixedStands.has(creature) && !pack?.fixture;
    const staticFrame = !fixedModel && pack && (pack.rotations?.[key] || (rotation === 0 ? pack : null));
    const incomplete = pack && !fixedModel && Object.keys(pack.rotations || {}).length !== 8;
    const sourceFailed = staticFrame && failedPortraits.has(boardSpriteUrl(staticFrame.image));
    const unavailable = incomplete || sourceFailed;
    if (unavailable) missingFacings.add(t.id);
    else missingFacings.delete(t.id);
    const file = !sourceFailed && frameImage(staticFrame);
    const legacy = !file && unavailable && frameImage(pack);
    let fixture = frameImage(pack?.fixture);
    let frame = file || (legacy && { ...legacy, mirror: BC.headingDelta(0, facing) > 0 });
    const old = displayFacings.get(t.id);
    if (!frame && staticFrame && !sourceFailed && old) frame = old.current;
    if (!frame && figure) {
      const custom = Miniatures.boardPack(figure).rotations[key];
      frame = { image: custom.sculpt, anchor: custom.sculpt.anchor };
    }
    if (!frame && creature) {
      const art = Miniatures.creatureSprite(creature, t.size || 1, {
        ...model,
        rotation,
        layer: fixed ? 'figure' : undefined,
      });
      frame = { image: art, anchor: art.anchor };
    }
    if (fixedModel) {
      const base = Miniatures.creatureSprite(creature, t.size || 1, { ...model, layer: 'fixture' });
      fixture = { image: base, anchor: base.anchor };
    }
    if (portrait) frame = null;
    const lift = landingAmount(t, now),
      zoom = 1 + 0.06 * lift;
    const rise = (t.elev > 0 ? CELL * 0.16 : 0) + (lift * 6) / S.view.s;
    const boundsFor = art =>
      art
        ? {
            x: foot.x - (art.mirror ? art.image.width - art.anchor.x : art.anchor.x) * zoom,
            y: foot.y - art.anchor.y * zoom - rise,
            w: art.image.width * zoom,
            h: art.image.height * zoom,
          }
        : {
            x: foot.x - foot.diameter * 0.27,
            y: foot.y - foot.diameter * 0.32 - rise,
            w: foot.diameter * 0.54,
            h: foot.diameter * 0.54,
          };
    const same = old?.current.image === frame?.image && old?.current.mirror === frame?.mirror;
    let current = old;
    if (frame && !same) {
      current = {
        current: frame,
        facing,
        previous: old && old.facing !== facing && !reducedMotion.matches ? old.current : null,
        at: now,
        direction: Math.sign(BC.headingDelta(old?.facing ?? facing, facing)),
      };
      displayFacings.set(t.id, current);
    } else if (frame && old && !staticFrame) old.facing = facing;
    if (current?.previous && now - current.at >= 120) current.previous = null;
    return {
      t,
      motion: figureMotion(t, d, now),
      alpha: teleportAlpha * (1 - crumble),
      crumble,
      foot,
      d,
      sprite: frame?.image,
      frame,
      portrait,
      fixture,
      bounds: boundsFor(frame),
      previous: current?.previous,
      prevBounds: current?.previous && boundsFor(current.previous),
      blend: current?.previous ? Math.max(0, Math.min(1, (now - current.at) / 120)) : 1,
      direction: current?.direction || 0,
      facing,
      lift,
      faction: t.kind === 'pc' ? 'ally' : t.kind === 'monster' ? 'enemy' : 'neutral',
      ghost: creature === 'ghost',
      name: d.name || displayTokenName(t, model),
    };
  }
  // Poses from BoardFigureMotion: cast lean, hit squash and flash, defeat topple.
  const aliveSeen = new Set(),
    defeats = new Map();
  function figureMotion(t, d, now) {
    const Motion = globalThis.BoardFigureMotion;
    if (!Motion || t.kind === 'object') return null;
    if (!d.dead) {
      aliveSeen.add(t.id);
      defeats.delete(t.id);
    } else if (!defeats.has(t.id)) {
      // Seen alive before: play the fall. Already down when the map opened: just lie there.
      defeats.set(t.id, { at: aliveSeen.has(t.id) ? now : -Infinity, pc: t.kind === 'pc', side: t.x % 2 ? 1 : -1 });
    }
    const death = defeats.get(t.id) || null;
    if (death && now - death.at < 1400) S.dirty = true;
    const where = id => {
      const k = id && mapTokens().find(x => x.id === id);
      return k ? tokenPos(k) : null;
    };
    return Motion.pose(S.spellCasts, { id: t.id, ...tokenPos(t) }, where, now, reduceEffects(), death);
  }
  function drawMiniGround({ t, foot, d, lift, faction, ghost, facing }) {
    const { x, y, diameter } = foot;
    const color = factionColors[faction] || factionColors.neutral;
    ctx.save();
    ctx.globalAlpha = t.hidden ? 0.45 : 1;
    {
      ctx.save();
      ctx.translate(x + diameter * 0.055, y + diameter * 0.06);
      ctx.scale(1, 0.65);
      const radius = diameter * (0.63 + 0.18 * lift);
      const shadow = ctx.createRadialGradient(0, 0, radius * 0.15, 0, 0, radius);
      shadow.addColorStop(0, ghost ? '#99f6fa62' : 'rgba(0,0,0,0.35)');
      shadow.addColorStop(0.65, ghost ? '#63e9ec36' : 'rgba(0,0,0,0.24)');
      shadow.addColorStop(1, 'transparent');
      ctx.fillStyle = shadow;
      ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
      ctx.restore();
    }
    if (t.kind !== 'object') {
      ctx.beginPath();
      ctx.ellipse(x, y, diameter * 0.525, diameter * 0.525 * Math.sin((55 * Math.PI) / 180), 0, 0, Math.PI * 2);
      ctx.strokeStyle = hexA(color, 0.7);
      ctx.lineWidth = Math.max(2 / S.view.s, diameter * 0.048);
      if (t.stage?.startsWith('enc:') && !t.combatant_id) ctx.setLineDash([diameter * 0.12, diameter * 0.07]);
      ctx.stroke();
      ctx.setLineDash([]);
      if (d.turn || S.sel === t.id || S.selected.has(t.id)) {
        ctx.beginPath();
        ctx.ellipse(x, y, diameter * 0.58, diameter * 0.476, 0, 0, Math.PI * 2);
        ctx.lineWidth = 2 / S.view.s;
        ctx.strokeStyle = '#e0be80';
        ctx.stroke();
      }
    }
    if (S.grid.rotation.marker && t.kind !== 'object') {
      const angle = (facing * Math.PI) / 4;
      const px = -Math.sin(angle),
        py = Math.cos(angle) * Math.sin((55 * Math.PI) / 180);
      ctx.beginPath();
      ctx.moveTo(x + diameter * 0.44 * px, y + diameter * 0.44 * py);
      ctx.lineTo(x + diameter * 0.6 * px, y + diameter * 0.6 * py);
      ctx.strokeStyle = '#171d21';
      ctx.lineWidth = 5 / S.view.s;
      ctx.stroke();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2 / S.view.s;
      ctx.stroke();
    }
    ctx.restore();
  }
  function drawToken(
    { t, foot, d, sprite, frame, portrait, bounds, fixture, previous, prevBounds, blend, direction, motion },
    opacity = 1,
    silhouette = false,
  ) {
    const { x, y, diameter } = foot;
    const Motion = globalThis.BoardFigureMotion;
    ctx.save();
    ctx.globalAlpha = opacity * (t.hidden ? 0.45 : 1) * (motion?.alpha ?? 1);
    if (motion) {
      ctx.translate(motion.dx * cellPx(), motion.dy * cellPx());
      Motion.apply(ctx, x, y, motion);
    }
    if (silhouette) ctx.filter = 'grayscale(1) brightness(.52) blur(1.3px)';
    if (fixture) ctx.drawImage(fixture.image, x - fixture.anchor.x, y - fixture.anchor.y);
    if (sprite) {
      const alpha = ctx.globalAlpha;
      const drawFrame = (art, b, weight, angle) => {
        if (weight <= 0) return;
        ctx.save();
        ctx.globalAlpha = alpha * weight;
        ctx.translate(x, y);
        ctx.rotate(angle);
        if (art.mirror) ctx.scale(-1, 1);
        ctx.drawImage(art.image, art.mirror ? x - b.x - b.w : b.x - x, b.y - y, b.w, b.h);
        if (motion?.flash && !silhouette && art === frame)
          Motion.flash(ctx, art.image, art.mirror ? x - b.x - b.w : b.x - x, b.y - y, b.w, b.h, motion.flash);
        ctx.restore();
      };
      const turn = direction * 0.045;
      if (previous) drawFrame(previous, prevBounds, 1 - blend, turn * blend);
      drawFrame(frame, bounds, blend, -turn * (1 - blend));
    } else if (portrait) {
      ctx.drawImage(portrait, bounds.x, bounds.y, bounds.w, bounds.h);
      if (motion?.flash) Motion.flash(ctx, portrait, bounds.x, bounds.y, bounds.w, bounds.h, motion.flash);
    } else if (!silhouette) {
      const glyph = t.kind === 'pc' ? d.cls : globalThis.Sigils?.forName(t.name);
      const hasGlyph =
        glyph && globalThis.Sigils?.draw(ctx, glyph, x, y - diameter * 0.1, diameter * 0.46, '#fff4da', 1);
      if (!hasGlyph) {
        ctx.font = '800 ' + diameter * 0.31 + 'px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = '#17201e';
        ctx.lineWidth = 3 / S.view.s;
        ctx.strokeText(t.label || BC.initials(t.name), x, y - diameter * 0.1);
        ctx.fillStyle = '#fff4da';
        ctx.fillText(t.label || BC.initials(t.name), x, y - diameter * 0.1);
      }
    }
    ctx.restore();
    if (motion?.dust != null && !silhouette) Motion.dust(ctx, x, y, motion.dust, cellPx() / 32, t.id.length);
  }
  function drawTokenStatus({ t, foot, d }) {
    const { x, y, diameter } = foot;
    ctx.save();
    if (t.hidden) ctx.globalAlpha = 0.45;
    // PG y estados: marcas cerca de la base, independientes del color del bando.
    if (d.ring != null && t.kind !== 'object') {
      const w = diameter * 0.32,
        h = Math.max(2 / S.view.s, diameter * 0.025),
        yy = y + diameter * 0.33;
      ctx.fillStyle = '#171e1f';
      ctx.fillRect(x - w / 2, yy, w, h);
      ctx.fillStyle = d.ring > 0.5 ? '#b6e2ad' : d.ring > 0.25 ? '#f4ba5e' : '#ef777c';
      ctx.fillRect(x - w / 2, yy, w * d.ring, h);
    }
    for (const [i] of d.conditions.slice(0, 4).entries()) {
      ctx.beginPath();
      ctx.arc(x + diameter * (0.24 + i * 0.085), y + diameter * 0.2, diameter * 0.035, 0, 2 * Math.PI);
      ctx.fillStyle = '#c4a6ee';
      ctx.fill();
    }
    if (d.dead || t.elev) drawAltitude(foot, d.dead, t.elev);
    ctx.restore();
  }
  function drawAltitude({ x, y, diameter }, dead, elevation) {
    const text = dead ? '\u2020' : `${elevation > 0 ? '+' : '\u2212'}${Math.abs(elevation)} ft`;
    const size = Math.max(10 / S.view.s, Math.min(14 / S.view.s, diameter * 0.13));
    ctx.font = `700 ${size}px system-ui`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    const xx = x + diameter * 0.41,
      yy = y - diameter * 0.38;
    const w = ctx.measureText(text).width + size * 0.65;
    ctx.fillStyle = '#15262bed';
    ctx.fillRect(xx - w / 2, yy - size * 0.65, w, size * 1.3);
    ctx.fillStyle = dead ? '#ff8e8e' : '#d3f0fa';
    ctx.fillText(text, xx, yy);
  }
  const spriteMasks = new WeakMap();
  let occlusionLayer, occlusionOutline;
  function spriteMask(sprite, mirror = false) {
    const cached = spriteMasks.get(sprite) || {};
    const key = mirror ? 'mirrored' : 'forward';
    if (cached[key]) return cached[key];
    const mask = document.createElement('canvas');
    const scale = Math.min(1, 256 / Math.max(sprite.width, sprite.height));
    mask.width = Math.max(1, Math.ceil(sprite.width * scale));
    mask.height = Math.max(1, Math.ceil(sprite.height * scale));
    const mc = mask.getContext('2d', { willReadFrequently: true });
    if (mirror) mc.setTransform(-1, 0, 0, 1, mask.width, 0);
    mc.drawImage(sprite, 0, 0, mask.width, mask.height);
    const image = mc.getImageData(0, 0, mask.width, mask.height);
    let solidPixels = 0;
    const solid = Uint8Array.from({ length: mask.width * mask.height }, (_, i) => {
      const alpha = image.data[i * 4 + 3] >= 102 ? 255 : 0;
      if (alpha) solidPixels++;
      image.data[i * 4 + 3] = alpha;
      return alpha;
    });
    mc.putImageData(image, 0, 0);
    const top = Math.max(0, Math.floor(solid.indexOf(255) / mask.width)) / mask.height;
    const record = { mask, solid, top, solidPixels };
    cached[key] = record;
    spriteMasks.set(sprite, cached);
    return record;
  }
  function covers(a, b) {
    if (!a.sprite || !b.sprite || b.t.hidden) return false;
    const back = a.bounds,
      front = b.bounds;
    const left = Math.max(back.x, front.x),
      right = Math.min(back.x + back.w, front.x + front.w);
    const top = Math.max(back.y, front.y),
      bottom = Math.min(back.y + back.h, front.y + front.h);
    if (right <= left || bottom <= top) return false;
    const [ma, mb] = [spriteMask(a.sprite, a.frame?.mirror), spriteMask(b.sprite, b.frame?.mirror)];
    const pixel = (r, m, x, y) =>
      m.solid[
        Math.floor(((y - r.y) * m.mask.height) / r.h) * m.mask.width + Math.floor(((x - r.x) * m.mask.width) / r.w)
      ];
    const step = Math.max(1, cellPx() / CELL);
    // Tails and wingtips can touch without covering enough of the figure to need a marker.
    const area = (ma.solidPixels * back.w * back.h) / (ma.mask.width * ma.mask.height);
    const minimum = Math.max(1, Math.ceil((area * 0.18) / (step * step)));
    if ((right - left) * (bottom - top) < area * 0.18) return false;
    let covered = 0;
    for (let y = top + step / 2; y < bottom; y += step)
      for (let x = left + step / 2; x < right; x += step)
        if (pixel(back, ma, x, y) && pixel(front, mb, x, y) && ++covered >= minimum) return true;
    return false;
  }
  function drawOcclusion(item, blockers) {
    const b = item.bounds;
    const { mask, top } = spriteMask(item.sprite, item.frame?.mirror);
    const color = factionColors[item.faction];
    const stroke = 2 / S.view.s;
    occlusionLayer ||= document.createElement('canvas');
    occlusionOutline ||= document.createElement('canvas');
    const scale = Math.min(ctx.getTransform().a, 512 / Math.max(b.w, b.h));
    const w = b.w + stroke * 2,
      h = b.h + stroke * 2;
    occlusionLayer.width = occlusionOutline.width = Math.ceil(w * scale);
    occlusionLayer.height = occlusionOutline.height = Math.ceil(h * scale);
    const sx = occlusionLayer.width / w,
      sy = occlusionLayer.height / h;
    const frame = occlusionLayer.getContext('2d');
    frame.setTransform(sx, 0, 0, sy, stroke * sx, stroke * sy);
    for (const { bounds: f, sprite, frame: art } of blockers)
      frame.drawImage(spriteMask(sprite, art?.mirror).mask, f.x - b.x, f.y - b.y, f.w, f.h);
    frame.globalCompositeOperation = 'destination-in';
    frame.drawImage(mask, 0, 0, b.w, b.h);
    frame.globalCompositeOperation = 'source-in';
    frame.fillStyle = hexA(color, 0.2);
    frame.fillRect(-stroke, -stroke, w, h);
    const edge = occlusionOutline.getContext('2d');
    edge.setTransform(sx, 0, 0, sy, stroke * sx, stroke * sy);
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      edge.drawImage(mask, Math.cos(angle) * stroke, Math.sin(angle) * stroke, b.w, b.h);
    }
    edge.globalCompositeOperation = 'destination-out';
    edge.drawImage(mask, 0, 0, b.w, b.h);
    edge.globalCompositeOperation = 'source-in';
    edge.fillStyle = color;
    edge.fillRect(-stroke, -stroke, w, h);
    ctx.save();
    ctx.globalAlpha = item.t.hidden ? 0.45 : 1;
    ctx.drawImage(occlusionLayer, b.x - stroke, b.y - stroke, w, h);
    ctx.drawImage(occlusionOutline, b.x - stroke, b.y - stroke, w, h);
    const x = item.foot.x,
      y = b.y + b.h * top - 10 / S.view.s,
      r = 5 / S.view.s;
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(-r, -r / 2);
    ctx.lineTo(0, -r);
    ctx.lineTo(r, -r / 2);
    ctx.lineTo(r, r / 3);
    ctx.lineTo(0, r);
    ctx.lineTo(-r, r / 3);
    ctx.closePath();
    ctx.fillStyle = '#14221f';
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2 / S.view.s;
    ctx.stroke();
    ctx.restore();
  }
  function drawPieces(pieces) {
    pieces = pieces.filter(piece => piece.alpha > 0);
    const plan = casting?.plan(),
      selection = casting?.aim();
    const faded = new Set(),
      occluded = [];
    const obscured = new Set(pieces.filter(p => tokenInSpellCloud(p.t)).map(p => p.t.id));
    const silhouette = piece => playerView() && obscured.has(piece.t.id);
    const clear = pieces.filter(p => !silhouette(p));
    coveredPieces = [];
    for (let i = 0; i < pieces.length - 1; i++) {
      const item = pieces[i];
      if (silhouette(item)) continue;
      const blockers = pieces.slice(i + 1).filter(front => !silhouette(front) && covers(item, front));
      if (!blockers.length) continue;
      coveredPieces.push(item);
      occluded.push([item, blockers]);
      if (item.t.id === hoverToken || item.t.id === S.sel) for (const blocker of blockers) faded.add(blocker.t.id);
    }
    for (const piece of clear) if (piece.alpha > 0.6) drawMiniGround(piece);
    for (const piece of pieces) {
      const faint = silhouette(piece);
      const alpha = faint
        ? 0.83
        : dimCastTarget(plan, selection, piece.t)
          ? 0.6
          : obscured.has(piece.t.id)
            ? 0.93
            : faded.has(piece.t.id)
              ? 0.4
              : 1;
      if (!piece.crumble || reduceEffects()) drawToken(piece, alpha * piece.alpha, faint);
      else {
        const b = piece.bounds;
        const band = b.h / 10;
        ctx.save();
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const keep = Math.max(0, 1 - piece.crumble * (1.1 + Math.sin(i * 8) * 0.38));
          const left = i % 2 === 0 ? 0 : b.w * (1 - keep);
          ctx.rect(b.x + left, b.y + i * band, b.w * keep, band * (1 - piece.crumble * 0.52));
        }
        ctx.clip();
        drawToken(piece, alpha * piece.alpha, faint);
        ctx.restore();
      }
    }
    for (const [item, blockers] of occluded) drawOcclusion(item, blockers);
    for (const piece of clear) if (piece.alpha > 0.76) drawTokenStatus(piece);
  }
  function drawMiniLabel(tokens) {
    const fallback = $('#board-hover-name');
    if (fallback) fallback.hidden = true;
    if (!TV && hoverToken === S.sel && !$('#board-card').hidden) return;
    const item = tokens.find(({ t }) => t.id === hoverToken);
    if (!item?.name) return;
    const {
        foot: { x, y, diameter },
        name,
      } = item,
      scale = S.view.s;
    const font = 12 / scale,
      h = 19 / scale;
    ctx.font = '600 ' + font + 'px system-ui';
    const w = ctx.measureText(name).width + 14 / scale;
    const below = Math.max(y + diameter * 0.44, item.bounds.y + item.bounds.h);
    const min = toWorld(5, 5),
      max = toWorld(canvas.clientWidth - 5, canvas.clientHeight - 5);
    const candidates = [4, 14, 26].map(gap => [x, below + gap / scale]);
    candidates.push([x, item.bounds.y - h - 4 / scale]);
    for (const side of [-1, 1]) candidates.push([x + side * (diameter * 0.52 + w / 2 + 4 / scale), y]);
    for (const [xx, yy] of candidates) {
      if (xx - w / 2 < min.x || xx + w / 2 > max.x || yy < min.y || yy + h > max.y) continue;
      if (
        tokens.some(
          ({ bounds: b, t }) =>
            t.id !== item.t.id && xx - w / 2 < b.x + b.w && xx + w / 2 > b.x && yy < b.y + b.h && yy + h > b.y,
        )
      )
        continue;
      ctx.fillStyle = '#131916ed';
      ctx.fillRect(xx - w / 2, yy, w, h);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff4da';
      ctx.fillText(name, xx, yy + h / 2);
      return;
    }
    if (fallback) {
      if (fallback.textContent !== name) fallback.textContent = name;
      fallback.hidden = false;
    }
  }
  // Objetivo: mira roja y línea desde quien actúa, con la distancia.
  function drawTarget() {
    const t = tokenById(S.target),
      me = actor();
    if (!t || t.map_id !== S.mapId || !visibleTokens().includes(t)) return;
    const c = cellPx(),
      center = k => {
        const { x, y, diameter } = tokenFoot(k);
        return { x, y, r: diameter / 2 };
      };
    const b = center(t),
      ctxInfo = combatContext();
    ctx.save();
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 3 * (c / 70);
    ctx.setLineDash([c * 0.1, c * 0.07]);
    ctx.beginPath();
    ctx.ellipse(b.x, b.y, b.r + c * 0.11, b.r * 0.819 + c * 0.085, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    for (const k of [0, 1, 2, 3]) {
      const ang = (k * Math.PI) / 2,
        r1 = b.r + c * 0.08,
        r2 = b.r + c * 0.3;
      ctx.beginPath();
      ctx.moveTo(b.x + Math.cos(ang) * r1, b.y + Math.sin(ang) * r1);
      ctx.lineTo(b.x + Math.cos(ang) * r2, b.y + Math.sin(ang) * r2);
      ctx.stroke();
    }
    if (me && me.id !== t.id && !S.drag?.token) {
      const a = center(me);
      ctx.strokeStyle = ctxInfo.flank ? 'rgba(224,190,128,0.85)' : 'rgba(255,107,107,0.6)';
      ctx.lineWidth = 2 / S.view.s;
      ctx.setLineDash([6 / S.view.s, 5 / S.view.s]);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.setLineDash([]);
      const text = ctxInfo.distance + ' pies' + (ctxInfo.flank ? ' · flanqueo' : '');
      ctx.font = `700 ${14 / S.view.s}px Inter, system-ui, sans-serif`;
      // Etiqueta arriba del objetivo, para no tapar las fichas cuando están pegadas.
      const mx = b.x,
        my = b.y - b.r - c * 0.42,
        tw = ctx.measureText(text).width;
      ctx.fillStyle = 'rgba(7,16,20,0.85)';
      ctx.fillRect(mx - tw / 2 - 6 / S.view.s, my - 11 / S.view.s, tw + 12 / S.view.s, 22 / S.view.s);
      ctx.fillStyle = ctxInfo.flank ? '#e0be80' : '#ff9b9b';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, mx, my);
    }
    ctx.restore();
  }
  function drawRuler(a, b, speed, risk = [], plan = null, wall = false) {
    const c = cellPx(),
      o = origin(),
      size = b.size || 1;
    const ax = o.x + (a.x + size / 2) * c,
      ay = o.y + (a.y + size / 2) * c,
      bx = o.x + (b.x + size / 2) * c,
      by = o.y + (b.y + size / 2) * c;
    const ft = plan ? plan.cost : Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y)) * S.grid.feet,
      diff = BC.difficultOnPath(S.grid, S.terrain, a, b),
      over = plan ? !plan.ok : speed && ft > speed;
    ctx.strokeStyle = over || wall || risk?.length ? '#eb5757' : '#e0be80';
    ctx.lineWidth = 3 / S.view.s;
    ctx.setLineDash([10 / S.view.s, 6 / S.view.s]);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
    ctx.setLineDash([]);
    const text =
      ft +
      ' pies' +
      (diff ? ' · terreno difícil' : '') +
      (plan
        ? plan.blocked
          ? ' · no es tu turno'
          : plan.ok
            ? ` · te quedan ${plan.budget - plan.used}`
            : ` · no te alcanza (te quedan ${plan.left})`
        : over
          ? ' · más que tu velocidad'
          : '') +
      (risk?.length ? ' · ⚠ ataque de oportunidad: ' + risk.map(k => k.name).join(', ') : '') +
      (wall ? ' · una pared corta el camino' : '');
    ctx.font = `700 ${16 / S.view.s}px Inter, system-ui, sans-serif`;
    const tw = ctx.measureText(text).width;
    ctx.fillStyle = 'rgba(7,16,20,0.85)';
    ctx.fillRect(bx + 14 / S.view.s, by - 30 / S.view.s, tw + 14 / S.view.s, 24 / S.view.s);
    ctx.fillStyle = over || wall || risk?.length ? '#eb5757' : '#e0be80';
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
    S.pings = S.pings.filter(p => now - p.at < pingDuration);
    for (const p of S.pings) {
      ctx.strokeStyle = hexA(/^#[0-9a-f]{6}$/i.test(p.color) ? p.color : '#e0be80', 0.85);
      ctx.lineWidth = 3 / S.view.s;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 22 / S.view.s, 0, Math.PI * 2);
      ctx.stroke();
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
  const canRotate = t =>
    !!t &&
    !TV &&
    t.kind !== 'object' &&
    (dmView() ||
      (t.kind === 'pc' && myCharacters().includes(t.character_id)) ||
      (t.kind === 'monster' && S.grid.rotation.playerMonsters && !t.hidden));
  const rotationGroup = () => visibleTokens().filter(t => (S.selected.has(t.id) || t.id === S.sel) && canRotate(t));
  const autoMode = t => (t.facing_mode && t.facing_mode !== 'inherit' ? t.facing_mode : S.grid.rotation.mode);
  let nearestTimer;
  function queueEnemyFacing() {
    clearTimeout(nearestTimer);
    const map = S.mapId;
    nearestTimer = setTimeout(async () => {
      if (map !== S.mapId || TV || !shown) return;
      const list = visibleTokens();
      const changes = list
        .filter(t => canRotate(t) && canMove(t) && autoMode(t) === 'enemy' && !t.facing_manual)
        .flatMap(t => {
          const facing = enemyHeading(t, list);
          return facing == null || facing === BC.heading(t.facing) ? [] : [{ id: t.id, patch: { facing } }];
        });
      try {
        await applyPoses(changes, null, false);
      } catch {
        /* A later update will retry automatic facing. */
      }
    }, 100);
  }
  function enemyHeading(t, list = visibleTokens()) {
    const target = list
      .filter(k => enemies(t, k) && !k.hidden && !info(k).dead)
      .sort((a, b) => BC.gap(t, a) - BC.gap(t, b) || String(a.id).localeCompare(String(b.id)))[0];
    return target ? BC.facingTo(t, target) : null;
  }
  function movePose(t, x, y) {
    const mode = autoMode(t);
    const facing =
      mode === 'travel' ? BC.headingTo(x - t.x, y - t.y) : mode === 'enemy' ? enemyHeading({ ...t, x, y }) : null;
    return { x, y, ...(facing != null && { facing }), ...(t.facing_manual && { facing_manual: false }) };
  }
  const poseDefaults = { facing: 0, facing_mode: 'inherit', facing_manual: false };
  const poseValue = (t, key) => t[key] ?? poseDefaults[key];
  let poseWrites = Promise.resolve();
  async function applyPoses(specs, movement, record = true) {
    const map = S.mapId,
      campaign = S.id;
    const changes = specs
      .map(({ id, patch }) => {
        const t = tokenById(id);
        patch = Object.fromEntries(Object.entries(patch).filter(([key, value]) => poseValue(t, key) !== value));
        const before = Object.fromEntries(Object.keys(patch).map(key => [key, poseValue(t, key)]));
        const expected = Object.fromEntries(Object.keys(patch).map(key => [key, t.savedXY?.[key] ?? before[key]]));
        return { id, patch, before, expected };
      })
      .filter(c => Object.keys(c.patch).length);
    if (!changes.length) return;
    const merge = (patches, undo = false) => {
      const indexed = new Map(patches.map(c => [c.id, c]));
      S.tokens = S.tokens.map(t => {
        const edit = indexed.get(t.id);
        if (!edit || t.map_id !== map) return t;
        if (!undo) return { ...t, ...edit.patch };
        return {
          ...t,
          ...Object.fromEntries(
            Object.entries(edit.patch)
              .filter(([key, val]) => poseValue(t, key) === val)
              .map(([key]) => [key, edit.before[key]]),
          ),
        };
      });
    };
    const write = async () => {
      if (map !== S.mapId || campaign !== S.id) return;
      merge(changes);
      S.dirty = true;
      try {
        let rows;
        try {
          rows = await Cloud.poseTokens(
            campaign,
            map,
            changes.map(({ id, patch, expected }) => ({ id, patch, before: expected })),
          );
        } catch (err) {
          if (!/commit_board_token_poses|PGRST202/.test(err.message)) throw err;
          if (!movement) throw Error('Para girar y guardar la orientación, aplicá la migración 028_token_facing.sql.');
          rows = (
            await Promise.all(
              changes
                .filter(c => 'x' in c.patch || 'y' in c.patch)
                .map(c =>
                  Cloud.updateToken(c.id, {
                    ...(Object.hasOwn(c.patch, 'x') && { x: c.patch.x }),
                    ...(Object.hasOwn(c.patch, 'y') && { y: c.patch.y }),
                  }),
                ),
            )
          ).flat();
        }
        if (rows.length !== changes.length) throw Error('No se pudo guardar el cambio de las fichas.');
        if (map !== S.mapId || campaign !== S.id) return;
        const byId = new Map(rows.map(row => [row.id, row]));
        S.tokens = S.tokens.map(t =>
          byId.has(t.id) && !(t.updated_at > byId.get(t.id).updated_at) ? sizedToken(byId.get(t.id)) : t,
        );
        if (record) {
          const saved = changes.map(c => ({
            ...c,
            patch: Object.fromEntries(Object.keys(c.patch).map(key => [key, poseValue(byId.get(c.id), key)])),
          }));
          S.poseUndo.push({ changes: saved, movement });
          if (S.poseUndo.length > 40) S.poseUndo.shift();
        }
        return true;
      } catch (err) {
        if (map === S.mapId && campaign === S.id) merge(changes, true);
        throw err;
      } finally {
        S.dirty = true;
      }
    };
    const queued = poseWrites.then(write, write);
    poseWrites = queued.catch(() => {});
    return queued;
  }
  async function undoPose() {
    await poseWrites;
    const last = S.poseUndo.at(-1);
    if (!last) return;
    if (last.movement?.turn && last.movement.turn !== S.turnId) throw Error('Ese movimiento fue en otro turno.');
    for (const { id, patch, before } of last.changes) {
      const t = tokenById(id);
      if (!t || t.map_id !== S.mapId || Object.keys(patch).some(key => poseValue(t, key) !== patch[key]))
        throw Error('La ficha cambió desde la última acción.');
      if (
        ('x' in before || 'y' in before) &&
        overlapsPieces(
          { ...t, ...before },
          mapTokens().filter(k => !last.changes.some(c => c.id === k.id)),
        )
      )
        throw Error('La casilla anterior está ocupada.');
    }
    if (
      await applyPoses(
        last.changes.map(c => ({ id: c.id, patch: c.before })),
        last.movement,
        false,
      )
    ) {
      S.poseUndo.pop();
      if (last.movement?.pts) {
        moves().tokens[last.movement.id] = last.movement.pts;
        saveMoves();
      }
      pick();
    }
  }
  let turnsQueued = Promise.resolve();
  function rotateSelection(directory, ids = rotationGroup().map(t => t.id)) {
    const map = S.mapId;
    turnsQueued = turnsQueued
      .then(async () => {
        if (map !== S.mapId) return;
        const choices = ids
          .map(tokenById)
          .filter(canRotate)
          .map(t => ({ id: t.id, patch: { facing: BC.heading(directory(t)), facing_manual: true } }));
        await applyPoses(choices);
        pick();
      })
      .catch(err => toast(err.message));
    return turnsQueued;
  }
  const turnBy = n => rotateSelection(t => BC.heading(t.facing) + n);
  function selectForRotation(t) {
    if (!canRotate(t)) return;
    if (!S.selected.size && S.sel) S.selected.add(S.sel);
    if (S.selected.has(t.id) && S.selected.size > 1) S.selected.delete(t.id);
    else S.selected.add(t.id);
    S.sel = S.selected.has(t.id) ? t.id : S.selected.values().next().value;
    pick();
  }
  function hitToken(w) {
    const list = visibleTokens().sort(tokenOrder).reverse();
    const p = toCellF(w);
    return list.find(t => BC.inFootprint({ ...t, ...tokenPos(t) }, p.x, p.y));
  }
  function local(e) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  const pointerAngle = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
  function turnGesture(angle) {
    const start = rotationGroup().map(t => [t.id, BC.heading(t.facing)]);
    return { start, angle, sweep: 0, steps: 0, map: S.mapId };
  }
  function turnGestureMove(g, angle) {
    g.sweep += Math.atan2(Math.sin(angle - g.angle), Math.cos(angle - g.angle));
    g.angle = angle;
    g.steps = Math.round(g.sweep / (Math.PI / 4));
    S.rotationPreview = new Map(g.start.map(([id, facing]) => [id, BC.heading(facing + g.steps)]));
    S.dirty = true;
  }
  function turnGestureEnd(g, cancel) {
    S.rotationPreview.clear();
    S.dirty = true;
    if (!cancel && g.steps && g.map === S.mapId)
      rotateSelection(
        t => BC.heading(t.facing) + g.steps,
        g.start.map(([id]) => id),
      );
  }
  let rotationHandle;
  function mountRotationHandle() {
    rotationHandle = document.createElement('button');
    rotationHandle.type = 'button';
    rotationHandle.className = 'board-rotate-handle';
    rotationHandle.setAttribute('aria-label', 'Girar ficha');
    rotationHandle.title = 'Arrastrá para girar · Q / E';
    rotationHandle.innerHTML = '<span aria-hidden="true">↻</span>';
    rotationHandle.hidden = true;
    canvas.parentElement.append(rotationHandle);
    let drag;
    rotationHandle.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      const t = tokenById(S.sel);
      if (!canRotate(t)) return;
      const p = local(e);
      if (e.shiftKey || e.ctrlKey || e.metaKey || S.multiSelect || S.aimFacing) {
        const target = hitToken(toWorld(p.x, p.y));
        if (S.aimFacing) {
          S.aimFacing = false;
          if (target) rotateSelection(item => BC.facingTo(item, target) ?? item.facing);
          tools();
        } else selectForRotation(target);
        e.preventDefault();
        return;
      }
      const foot = tokenFoot(t),
        center = { x: foot.x * S.view.s + S.view.x, y: foot.y * S.view.s + S.view.y };
      drag = { center, ...turnGesture(pointerAngle(center, p)) };
      rotationHandle.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    rotationHandle.addEventListener('pointermove', e => {
      if (drag) turnGestureMove(drag, pointerAngle(drag.center, local(e)));
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'])
      rotationHandle.addEventListener(type, e => {
        if (!drag) return;
        const gesture = drag;
        drag = null;
        turnGestureEnd(gesture, type !== 'pointerup');
        if (type === 'pointerup' && Math.abs(gesture.sweep) < 0.09) rotationDialog();
      });
    rotationHandle.addEventListener('click', e => {
      if (e.detail === 0) rotationDialog();
    });
  }
  function positionRotationHandle(pieces) {
    const item = pieces.find(({ t }) => t.id === S.sel && canRotate(t));
    if (!item || S.multiSelect || S.aimFacing || !['move', 'tokens', 'enc'].includes(S.tool)) {
      rotationHandle.hidden = true;
      return;
    }
    const { s, x, y } = S.view,
      f = item.foot;
    const cx = f.x * s + x,
      cy = f.y * s + y;
    const w = canvas.clientWidth,
      h = canvas.clientHeight;
    rotationHandle.hidden = cx < 0 || cx > w || cy < 0 || cy > h;
    if (rotationHandle.hidden) return;
    const r = f.diameter * s;
    const right = Math.max(22, Math.min(w - 22, cx + r * 0.43));
    const bottom = Math.max(22, Math.min(h - 22, cy + r * 0.39 + 3));
    rotationHandle.style.left = `${right}px`;
    rotationHandle.style.top = `${bottom}px`;
  }
  onCanvas('pointerdown', e => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, local(e));
    if (casting?.aim()) {
      const p = local(e),
        world = toWorld(p.x, p.y);
      const shape = casting.plan()?.shape;
      if (pointers.size === 1) {
        castDrag = {
          p,
          world,
          time: performance.now(),
          moved: false,
          view: { ...S.view },
          template: shape && (!shape.self || castDirection(shape)),
        };
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        castDrag = {
          multi: true,
          dir: pointerAngle(a, b),
          length: Math.hypot(a.x - b.x, a.y - b.y),
          rotation: castDirection(shape) ? (casting.plan()?.placement?.area?.dir ?? 0) : null,
        };
      }
      return;
    }
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const selected = rotationGroup().some(t => {
        const f = tokenFoot(t);
        return [a, b, m].some(p => {
          const w = toWorld(p.x, p.y),
            radius = f.diameter / 2 + 12 / S.view.s;
          return Math.abs(w.x - f.x) <= radius && Math.abs(w.y - f.y) <= radius;
        });
      });
      pinch =
        e.pointerType === 'touch' && selected
          ? { turn: turnGesture(pointerAngle(a, b)) }
          : { d: Math.hypot(a.x - b.x, a.y - b.y), m };
      if (S.drag?.token) S.channel?.send({ t: 'drop', id: S.drag.token.id });
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
    if (tool === 'move' || tool === 'tokens' || tool === 'enc') {
      if (TV) {
        S.drag = { pan: { x: S.view.x, y: S.view.y, p } };
        return;
      }
      // Justo sobre una puerta dibujada, el toque es para la puerta aunque haya una ficha al lado.
      const f = toCellF(w),
        onDoor =
          tool === 'move' && S.walls.length && BC.nearestWall(S.walls, f.x, f.y, touchReach(10), BC.isWallDoor) >= 0;
      const t = onDoor ? null : hitToken(w);
      if (S.aimFacing || S.multiSelect || e.shiftKey || e.ctrlKey || e.metaKey) {
        S.drag = { rotationTap: true, tap: t?.id };
        return;
      }
      const group = t && S.group && t.stage?.startsWith('enc:' + S.group + ':') ? groupTokens(S.group) : null;
      if (t && canMove(t))
        S.drag = {
          token: { ...t },
          from: { x: t.x, y: t.y },
          grab: { x: w.x, y: w.y },
          start: { x: t.x, y: t.y },
          path: [{ x: t.x, y: t.y }],
          risk: [],
          group: group?.filter(k => k.id !== t.id).map(k => ({ ...k, sx: k.x, sy: k.y })),
        };
      else S.drag = { pan: { x: S.view.x, y: S.view.y, p }, tap: t?.id || null };
      // Mantener apretado en un lugar vacío: señal para todos.
      press.timer = setTimeout(() => {
        if (!press?.moved && !S.drag?.token) {
          ping(w);
          S.drag = null;
          press = null;
        }
      }, 550);
    } else if (tool === 'scene') {
      S.drag = { cast: true, pan: { x: S.view.x, y: S.view.y, p } };
      if (e.pointerType !== 'touch') setSpellAim(w);
    } else if (tool === 'ruler') S.drag = { ruler: { a: cell, b: cell } };
    else if (tool === 'ping') ping(w);
    else if (tool === 'area') {
      const f = toCellF(w);
      // El origen se apoya en una intersección de la cuadrícula (o en el centro de una casilla, lo más cercano).
      const snap = v => Math.round(v * 2) / 2;
      S.drag = { area: { ...S.area, x: snap(f.x), y: snap(f.y), dir: 0 } };
    } else if (tool === 'fog' && S.isDM) {
      if (S.fogMode === 'room') revealRoom(cell);
      else if (S.fogMode === 'rect' || S.fogMode === 'rect-hide') S.drag = { rect: { a: cell, b: cell }, fog: true };
      else {
        S.drag = { brush: true };
        fogBrush(cell);
      }
    } else if (tool === 'props' && S.isDM && BP) {
      if (!propDown(cell)) S.drag = { pan: { x: S.view.x, y: S.view.y, p }, tap: null };
    } else if (tool === 'paint' && S.isDM) {
      if (S.paintMode === 'brush') {
        S.drag = { brush: true };
        paintBrush(cell);
      } else S.drag = { rect: { a: cell, b: cell }, paint: true };
    } else if (tool === 'walls' && dmView()) S.drag = { wall: { down: w, from: drawingWalls() ? wallPoint(w) : null } };
    else if (tool === 'light' && dmView()) {
      if (['place', 'remove'].includes(S.lightMode)) S.drag = { lightTap: w };
      else {
        S.drag = { brush: true };
        ambientBrush(cell);
      }
    }
    S.dirty = true;
  });
  onCanvas('pointermove', e => {
    if (!pointers.has(e.pointerId)) return hover(e);
    pointers.set(e.pointerId, local(e));
    if (castDrag) {
      const p = local(e),
        w = toWorld(p.x, p.y),
        d = castDrag;
      if (d.multi && pointers.size === 2) {
        const [a, b] = [...pointers.values()],
          dist = Math.hypot(a.x - b.x, a.y - b.y),
          angle = pointerAngle(a, b);
        if (d.rotation != null && Math.abs(angle - d.dir) > 0.055 && Math.abs(dist / d.length - 1) < 0.12) {
          d.rotation += angle - d.dir;
          casting.mapTap({ w, drag: true, start: w, rotation: d.rotation });
        } else if (d.length && dist) zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, dist / d.length);
        d.dir = angle;
        d.length = dist;
      } else if (!d.multi && Math.hypot(p.x - d.p.x, p.y - d.p.y) > 6) {
        d.moved = true;
        if (d.template) casting.mapTap({ w, start: d.world, drag: true });
        else {
          S.view.x = d.view.x + p.x - d.p.x;
          S.view.y = d.view.y + p.y - d.p.y;
          S.dirty = true;
        }
      }
      return;
    }
    if (pinch && pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      if (pinch.turn) return turnGestureMove(pinch.turn, pointerAngle(a, b));
      const d = Math.hypot(a.x - b.x, a.y - b.y),
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
      S.touched = true;
      S.view.x = d.pan.x + p.x - d.pan.p.x;
      S.view.y = d.pan.y + p.y - d.pan.p.y;
    } else if (d.token) {
      const c = cellPx();
      const size = BC.tokenSpan(d.token);
      const others = d.group || [];
      const step = others.some(k => BC.tokenSpan(k) >= 1) ? 1 : size;
      const dx = BC.snapToken((w.x - d.grab.x) / c, step);
      const dy = BC.snapToken((w.y - d.grab.y) / c, step);
      d.token.x = others.length ? d.start.x + dx : Math.max(0, Math.min(S.grid.cols - size, d.start.x + dx));
      d.token.y = others.length ? d.start.y + dy : Math.max(0, Math.min(S.grid.rows - size, d.start.y + dy));
      for (const k of d.group || []) {
        k.x = k.sx + d.token.x - d.start.x;
        k.y = k.sy + d.token.y - d.start.y;
      }
      if (d.token.x !== d.start.x || d.token.y !== d.start.y) {
        const before = tokenById(d.token.id);
        if (before) d.token.facing = movePose(before, d.token.x, d.token.y).facing ?? before.facing;
        for (const k of d.group || []) {
          const prior = tokenById(k.id);
          if (prior) k.facing = movePose(prior, k.x, k.y).facing ?? prior.facing;
        }
      }
      trackPath(d);
      sendDrag(d.token);
    } else if (d.ruler) d.ruler.b = cell;
    else if (d.area) {
      const f = toCellF(w);
      if (Math.hypot(f.x - d.area.x, f.y - d.area.y) > 0.3) d.area.dir = Math.atan2(f.y - d.area.y, f.x - d.area.x);
    } else if (d.rect) d.rect.b = cell;
    else if (d.prop) propDrag(d.prop, cell);
    else if (d.propErase) propErase(cell);
    else if (d.brush) S.tool === 'fog' ? fogBrush(cell) : S.tool === 'light' ? ambientBrush(cell) : paintBrush(cell);
    else if (d.wall && press?.moved) {
      if (d.wall.from) S.wallDraw = { from: d.wall.from, to: wallPoint(w) };
      else if (S.wallMode === 'erase') wallEraseAt(w);
    }
    S.dirty = true;
  });
  function endPointer(e) {
    pointers.delete(e.pointerId);
    if (castDrag) {
      const d = castDrag;
      if (!pointers.size) castDrag = null;
      if (!d.multi && !d.moved && e.type === 'pointerup')
        casting.mapTap({ w: d.world, start: d.world }, performance.now() - d.time > 540);
      return;
    }
    if (pinch) {
      if (pointers.size < 2) {
        if (pinch.turn) turnGestureEnd(pinch.turn, e.type === 'pointercancel');
        pinch = null;
        press = null;
      }
      return;
    }
    clearTimeout(press?.timer);
    const d = S.drag;
    S.drag = null;
    if (d?.rotationTap && e.type !== 'pointercancel' && !press?.moved) {
      const target = tokenById(d.tap);
      if (S.aimFacing) {
        S.aimFacing = false;
        if (target) rotateSelection(t => BC.facingTo(t, target) ?? t.facing);
        tools();
      } else selectForRotation(target);
    } else if (d?.token) {
      // Mayúsculas o Alt al soltar: movimiento libre (empujón, teletransporte…), no provoca.
      d.free = e.shiftKey || e.altKey;
      if (press?.moved) for (const token of [d.token, ...(d.group || [])]) landing.set(token.id, performance.now());
      if (e.type !== 'pointercancel') dropToken(d);
      else S.channel?.send({ t: 'drop', id: d.token.id });
    } else if (d?.cast) {
      if (e.type === 'pointerup' && press && !press.moved && !TV) {
        const world = toWorld(press.p.x, press.p.y);
        castAt(toCell(world), world);
      }
    } else if (d?.pan && !press?.moved && !TV) {
      // Tocar una puerta o una escalera sin ficha encima: se abre, se cierra o se sube.
      if (S.tool === 'props') S.propHover = null;
      else if (
        d.tap ||
        S.tool !== 'move' ||
        !tapCell(toCell(toWorld(press.p.x, press.p.y)), toCellF(toWorld(press.p.x, press.p.y)))
      )
        tapToken(d.tap);
    } else if (d?.prop) propUp(d.prop);
    else if (d?.lightTap) {
      if (!press?.moved && e.type !== 'pointercancel') lightTap(d.lightTap);
    } else if (d?.wall) {
      const drawn = S.wallDraw;
      S.wallDraw = null;
      if (e.type === 'pointercancel') S.dirty = true;
      else if (drawn) {
        if (commitWall(drawn.from, drawn.to)) S.wallChain = drawn.to;
        hint(wallHint());
        panel();
      } else if (!press?.moved) wallTap(d.wall.down);
      else panel();
    } else if (d?.area) placeTemplate(d.area);
    else if (d?.rect && d.fog) {
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
    if (S.pending[S.mapId]) flushSave();
  }
  onCanvas('pointerup', endPointer);
  onCanvas('pointercancel', endPointer);
  onCanvas('pointerleave', () => {
    if (S.spellAim && !S.drag?.cast) {
      S.spellAim = null;
      S.dirty = true;
    }
    if (hoverToken === null) return;
    hoverToken = null;
    S.dirty = true;
  });
  onCanvas(
    'wheel',
    e => {
      e.preventDefault();
      if ((rotationKey || e.altKey) && rotationGroup().length && e.deltaY) {
        const now = performance.now();
        if (now - lastWheelTurn >= 65) {
          lastWheelTurn = now;
          turnBy(Math.sign(e.deltaY));
        }
        return;
      }
      const p = local(e);
      zoomAt(p.x, p.y, Math.exp(-e.deltaY * 0.0015));
    },
    { passive: false },
  );
  onCanvas('contextmenu', e => e.preventDefault());
  function hover(e) {
    if (casting?.active()) return;
    if (S.tool === 'scene' && H.cast && !TV) {
      const p = local(e);
      setSpellAim(toWorld(p.x, p.y));
      return;
    }
    if (S.tool === 'walls' && dmView()) {
      const w = toWorld(local(e).x, local(e).y),
        f = toCellF(w);
      S.wallAim = drawingWalls() ? wallPoint(w) : null;
      S.wallHover = drawingWalls() ? -1 : BC.nearestWall(S.walls, f.x, f.y, touchReach());
      canvas.style.cursor = drawingWalls() ? 'crosshair' : S.wallHover >= 0 ? 'pointer' : 'default';
      S.dirty = true;
      return;
    }
    if (S.tool === 'props' && !TV) {
      const cell = toCell(toWorld(local(e).x, local(e).y));
      if (S.propHover?.x !== cell.x || S.propHover?.y !== cell.y) {
        S.propHover = cell;
        S.dirty = true;
      }
      return;
    }
    const p = local(e),
      w = toWorld(p.x, p.y);
    const t = S.mapId && hitToken(w);
    const near = 9 / S.view.s;
    const id =
      t?.id ||
      coveredPieces.find(
        ({ foot }) =>
          Math.abs(w.x - foot.x) <= foot.diameter / 2 + near && Math.abs(w.y - foot.y) <= foot.diameter / 2 + near,
      )?.t.id ||
      null;
    if (hoverToken !== id) {
      hoverToken = id;
      S.dirty = true;
    }
    if (!['move', 'tokens'].includes(S.tool) || TV) return;
    canvas.style.cursor = t && canMove(t) ? 'grab' : 'default';
  }
  let lastSend = 0;
  let rotationKey = false,
    lastWheelTurn = -Infinity;
  function sendDrag(t) {
    const now = performance.now();
    if (now - lastSend < 80) return;
    lastSend = now;
    S.channel?.send({ t: 'drag', id: t.id, map: S.mapId, x: t.x, y: t.y, facing: BC.heading(t.facing) });
  }
  async function dropToken(d) {
    const t = d.token,
      size = BC.tokenSpan(t);
    if (d.group?.length && (t.x !== d.start.x || t.y !== d.start.y)) {
      S.channel?.send({ t: 'drop', id: t.id });
      return dropGroup(d, t.x - d.start.x, t.y - d.start.y);
    }
    const x = Math.max(0, Math.min(S.grid.cols - size, BC.snapToken(t.x, size))),
      y = Math.max(0, Math.min(S.grid.rows - size, BC.snapToken(t.y, size)));
    const moved = x !== d.start.x || y !== d.start.y;
    S.channel?.send({ t: 'drop', id: t.id });
    if (!moved) return tapToken(t.id);
    const occupied = dmView() ? mapTokens() : visibleTokens();
    if (overlapsPieces({ ...t, x, y }, occupied)) {
      toast('Esa casilla ya está ocupada.');
      return pick();
    }
    if (!d.free && !BC.roomFor(S.grid, S.terrain, { ...t, x, y }, [])) {
      toast('La ficha no cabe en ese terreno.');
      return pick();
    }
    if (!d.free && wallInWay(d.path, d.start, { x, y }, size)) {
      toast(
        'Una pared o una puerta cerrada corta el camino. Arrastrá la ficha por una abertura' +
          (dmView() ? ' o soltala con Mayúsculas para moverla libre.' : '.'),
      );
      return pick();
    }
    const before = S.tokens.find(k => k.id === t.id);
    let plan = null;
    if (before && limited(before)) {
      const why = turnBlock(before);
      if (why) {
        toast(why);
        return pick();
      }
      plan = BC.moveTo(S.grid, S.terrain, turnPts(before), { x, y }, budget(before), size);
      if (!plan.ok) {
        toast(`No te alcanza el movimiento: te quedan ${plan.left} de ${budget(before)} pies este turno.`);
        return pick();
      }
    }
    if (before && inCombat() && !isFree(d, before)) {
      const risk = threats({ ...before, x, y }, [
        { x: d.start.x, y: d.start.y },
        { x, y },
      ]);
      if (risk.length && !(await confirmMove(risk))) return pick();
    }
    S.sel = t.id;
    if (dmView() && !enemies(t, tokenById(S.target))) S.target = null;
    pick();
    try {
      await applyPoses([{ id: t.id, patch: movePose(before || t, x, y) }], {
        id: t.id,
        turn: plan && S.turnId,
        pts: plan && turnPts(before),
      });
      if (plan) {
        moves().tokens[t.id] = plan.pts;
        saveMoves();
      }
      afterMove(d, x, y);
      queueEnemyFacing();
    } catch (e) {
      toast(e.message);
    }
    pick();
  }
  // ---------- Áreas de efecto ----------
  const whoAmI = () => {
    const me = (S.party?.characters || []).find(c => c.owner_id === S.me?.id);
    return S.isDM && !TV
      ? { by: 'dm', name: 'DM', color: '#e0be80' }
      : { by: S.me?.id || 'yo', name: me?.name || '', color: me ? BC.colorFor(me.id, 'pc') : '#7fd1c1' };
  };
  function cleanTemplate(t, spell = false) {
    if (!t || (!Object.hasOwn(BC.SHAPES, t.kind) && !(spell && syncableArea.has(t.kind)))) return null;
    const n = (v, min, max, def) => (Number.isFinite(Number(v)) ? Math.max(min, Math.min(max, Number(v))) : def);
    return {
      id: String(t.id || '').slice(0, 40) || Math.random().toString(36).slice(2),
      kind: t.kind,
      x: n(t.x, -50, 1000, 0),
      y: n(t.y, -50, 1000, 0),
      dir: n(t.dir, -7, 7, 0),
      feet: n(t.feet, 5, 600, 20),
      width: n(t.width, spell && t.kind === 'wall' ? 0.1 : 5, 100, 5),
      by: String(t.by || '').slice(0, 60),
      name: String(t.name || '').slice(0, 60),
      color: /^#[0-9a-f]{6}$/i.test(t.color) ? t.color : '#e0be80',
    };
  }
  function addTemplate(raw) {
    const t = cleanTemplate(raw);
    if (!t) return;
    S.templates = [...S.templates.filter(x => x.id !== t.id), t].slice(-12);
    S.dirty = true;
    if (S.tool === 'area') panel();
  }
  function placeTemplate(a) {
    const t = cleanTemplate({
      ...a,
      ...whoAmI(),
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    });
    addTemplate(t);
    S.channel?.send({ t: 'tpl', map: S.mapId, tpl: t });
    const hit = BC.templateHits(
      S.grid,
      t,
      visibleTokens().filter(k => k.kind !== 'object'),
    );
    hint(hit.length ? 'En el área: ' + hit.map(k => k.name).join(', ') + '.' : 'Nadie queda dentro del área.');
  }
  function clearTemplates(all) {
    const by = whoAmI().by;
    S.templates = all ? [] : S.templates.filter(t => t.by !== by);
    S.channel?.send({ t: 'tpl-clear', map: S.mapId, by, all: !!all });
    S.dirty = true;
  }
  function drawTemplate(t, preview = false) {
    const c = cellPx(),
      o = origin();
    ctx.save();
    ctx.fillStyle = hexA(t.color || '#e0be80', preview ? 0.22 : 0.3);
    ctx.beginPath();
    for (const [x, y] of BC.templateCells(S.grid, t)) ctx.rect(o.x + x * c, o.y + y * c, c, c);
    ctx.fill();
    const pts = BC.templateOutline(S.grid, t);
    ctx.strokeStyle = t.color || '#e0be80';
    ctx.lineWidth = 2.5 / S.view.s;
    if (preview) ctx.setLineDash([8 / S.view.s, 6 / S.view.s]);
    ctx.beginPath();
    pts.forEach(([x, y], i) => ctx[i ? 'lineTo' : 'moveTo'](o.x + x * c, o.y + y * c));
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
    // Origen y etiqueta.
    ctx.fillStyle = t.color || '#e0be80';
    ctx.beginPath();
    ctx.arc(o.x + t.x * c, o.y + t.y * c, 4 / S.view.s, 0, Math.PI * 2);
    ctx.fill();
    const label = `${BC.SHAPES[t.kind].split(' ')[0]} ${t.feet} pies${t.name ? ' · ' + t.name : ''}`;
    ctx.font = `600 ${13 / S.view.s}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    const wTxt = ctx.measureText(label).width,
      pad = 4 / S.view.s;
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(o.x + t.x * c - wTxt / 2 - pad, o.y + t.y * c - 24 / S.view.s, wTxt + pad * 2, 17 / S.view.s);
    ctx.fillStyle = '#f1f1e8';
    ctx.fillText(label, o.x + t.x * c, o.y + t.y * c - 9 / S.view.s);
    ctx.restore();
  }

  // ---------- Visión: lo que los personajes tienen a la vista ----------
  const sightCache = [{}, {}];
  function darkvision(t) {
    const row = (S.party?.characters || []).find(c => c.id === t.character_id);
    try {
      return row ? summary(row).darkvision || 0 : 0;
    } catch {
      return 0;
    }
  }
  // Fichas que dan luz en este mapa: [{ x, y (centro, en casillas), range (casillas), feet }].
  // La mitad del radio es luz brillante y el resto penumbra (antorcha: 20 + 20 pies).
  // Pies de luz que lleva una ficha: los personajes, PNJ y objetos la guardan en la ficha; los monstruos, en el mapa.
  const tokenLight = t => BC.lightFeet(t.stage) || (t.kind === 'monster' ? S.tokenLights[t.id] || 0 : 0);
  function lightSources() {
    return mapTokens()
      .filter(t => !t.hidden && tokenLight(t))
      .map(t => ({
        x: t.x + (t.size || 1) / 2,
        y: t.y + (t.size || 1) / 2,
        feet: tokenLight(t),
        range: tokenLight(t) / S.grid.feet,
      }))
      .concat(BP ? BP.lights(S.props).map(l => ({ ...l, range: l.feet / S.grid.feet })) : [])
      .concat(S.fixedLights.map(([x, y, feet]) => ({ x, y, feet, range: feet / S.grid.feet })));
  }
  // Luces de un mapa a oscuras: las de fichas y muebles, más la que lleva cada personaje («Luz que lleva la party»),
  // salvo que su propia luz sea mayor.
  function sceneLights() {
    const v = S.grid.vision || {},
      own = lightSources(),
      carried = v.light
        ? mapTokens()
            .filter(t => t.kind === 'pc' && !t.hidden && tokenLight(t) < v.light)
            .map(t => ({
              x: t.x + (t.size || 1) / 2,
              y: t.y + (t.size || 1) / 2,
              feet: v.light,
              range: v.light / S.grid.feet,
            }))
        : [];
    return own.concat(carried).map(l => ({ ...l, dim: l.range, bright: l.range / 2 }));
  }
  // Quién mira: los personajes en el mapa. Con «cada jugador ve lo suyo», la pantalla de un jugador usa solo
  // a sus personajes (si tiene alguno acá); el DM, la tele y la pantalla compartida ven lo de toda la party.
  function viewerTokens() {
    const pcs = mapTokens().filter(t => t.kind === 'pc' && !t.hidden);
    if (!S.grid.vision?.own || S.isDM || TV || PLAYER_SCREEN) return pcs;
    const mine = pcs.filter(t => myCharacters().includes(t.character_id));
    return mine.length ? mine : pcs;
  }
  // Casillas que ve la party (null si el mapa no usa línea de visión).
  function seen(ignoreClouds = false) {
    return sightState(ignoreClouds)?.bits || null;
  }
  function sightState(ignoreClouds = false) {
    const v = S.grid.vision || {};
    const clouds = ignoreClouds ? [] : spellClouds;
    if (!v.los && !clouds.length) return null;
    // Hay que calcular la luz si el mapa está a oscuras o si tiene zonas pintadas en penumbra u oscuras.
    const dark = !!(v.los && (v.dark || BC.ambientMatters(S.ambient, false))),
      lights = dark ? sceneLights() : [],
      viewers = viewerTokens().map(t => ({
        x: t.x + (t.size || 1) / 2,
        y: t.y + (t.size || 1) / 2,
        range: dark ? darkvision(t) / S.grid.feet : Infinity,
      }));
    const key =
      S.mapId +
      '|' +
      S.grid.cols +
      'x' +
      S.grid.rows +
      '|' +
      JSON.stringify(v) +
      '|' +
      viewers.map(p => `${p.x},${p.y},${p.range}`).join(';') +
      '|' +
      lights.map(p => `${p.x},${p.y},${p.range}`).join(';') +
      '|' +
      clouds.map(p => [p.x, p.y, p.r].join(',')).join(';');
    const sight = sightCache[Number(ignoreClouds)];
    // Mientras el DM pinta terreno o zonas de luz con el pincel, se sigue mostrando lo anterior: se recalcula al soltar.
    if (sight.bits && S.drag?.brush && ['paint', 'light'].includes(S.tool) && sight.mapId === S.mapId) return sight;
    if (
      sight.key !== key ||
      sight.terrain !== S.terrain ||
      sight.walls !== S.walls ||
      sight.ambientCells !== S.ambient
    ) {
      const terrain = v.los ? S.terrain : '',
        walls = v.los ? S.walls : [],
        ambient = dark && BC.ambientMatters(S.ambient, !!v.dark) ? BC.ambientLevels(S.grid, S.ambient, !!v.dark) : null,
        context = v.los ? sightCtx() : null,
        levels = dark ? BC.sightLevels(S.grid, terrain, walls, viewers, lights, clouds, ambient, context) : null;
      Object.assign(sight, {
        key,
        mapId: S.mapId,
        terrain: S.terrain,
        walls: S.walls,
        ambientCells: S.ambient,
        ambient,
        los: !!v.los,
        dark,
        viewers,
        lights,
        levels,
        bits: levels ? levels.map(l => (l ? 1 : 0)) : BC.visibleCells(S.grid, terrain, walls, viewers, clouds, context),
        mask: null,
      });
      if (!ignoreClouds || !clouds.length) remember(sight.bits);
    }
    return sight;
  }
  // ---------- Lo explorado: cada pantalla de jugador recuerda lo que la party ya vio ----------
  // Se guarda en el dispositivo (un bit por casilla). Se ve en penumbra y sin fichas.
  const explored = { tag: '', bits: null, timer: 0 };
  const exploredStore = () => `dnd-board-explored-${S.id}-${S.mapId}`;
  function exploredBits() {
    if (!S.grid.vision?.memory || !playerView() || !S.mapId) return null;
    const g = S.grid,
      size = `${g.cols}x${g.rows}`,
      tag = `${S.id}|${S.mapId}|${size}`;
    if (explored.tag !== tag) {
      clearTimeout(explored.timer);
      Object.assign(explored, { tag, bits: new Uint8Array(g.cols * g.rows) });
      try {
        const raw = localStorage.getItem(exploredStore()) || '';
        if (raw.startsWith(size + ':')) {
          const packed = BC.fogBits(g, raw.slice(size.length + 1));
          for (let i = 0; i < explored.bits.length; i++) explored.bits[i] = (packed[i >> 3] >> (i & 7)) & 1;
        }
      } catch {}
    }
    return explored.bits;
  }
  function remember(bits) {
    const e = exploredBits();
    if (!e || !bits) return;
    let changed = false;
    for (let i = 0; i < e.length; i++)
      if (bits[i] && !e[i]) {
        e[i] = 1;
        changed = true;
      }
    if (!changed) return;
    clearTimeout(explored.timer);
    const key = exploredStore(),
      size = `${S.grid.cols}x${S.grid.rows}`;
    explored.timer = setTimeout(() => {
      const packed = new Uint8Array(Math.ceil(e.length / 8));
      for (let i = 0; i < e.length; i++) if (e[i]) packed[i >> 3] |= 1 << (i & 7);
      try {
        localStorage.setItem(key, size + ':' + BC.fogEncode(packed));
      } catch {}
    }, 1200);
  }
  function forgetExplored(mapId) {
    try {
      localStorage.removeItem(`dnd-board-explored-${S.id}-${mapId}`);
    } catch {}
    if (mapId === S.mapId) {
      clearTimeout(explored.timer);
      explored.tag = '';
      for (const c of sightCache) c.key = '';
      S.dirty = true;
    }
  }
  // ---------- Máscara de visión: bordes suaves siguiendo las paredes ----------
  // Se arma en coordenadas del mapa (unos píxeles por casilla) y solo cuando cambia lo que se ve.
  // «dark» es la oscuridad que va encima del mapa: opaca donde no se ve, a medias en penumbra y nada con buena luz.
  // «grey» marca lo que solo se ve con visión en la oscuridad, que se dibuja sin color.
  const sightPolygon = (p, range) => sightCtx().polygon(p.x, p.y, range);
  const maskPool = new Map();
  function maskLayer(name, w, h) {
    let el = maskPool.get(name);
    if (!el) maskPool.set(name, (el = document.createElement('canvas')));
    if (el.width !== w || el.height !== h) Object.assign(el, { width: w, height: h });
    const cx = el.getContext('2d');
    cx.setTransform(1, 0, 0, 1, 0, 0);
    cx.globalCompositeOperation = 'source-over';
    cx.globalAlpha = 1;
    cx.clearRect(0, 0, w, h);
    return cx;
  }
  // ---------- Ventana de las capas de luz ----------
  // Las capas se arman solo para lo que se ve en pantalla, con un margen, a una resolución parecida a la de la
  // pantalla: hasta 24 px por casilla y unos 900.000 px en total. Acercada, la sombra sale nítida; alejada, la capa
  // cubre todo el mapa con menos detalle. Se rehace al salir de la ventana o al acercar bastante la cámara.
  const MASK_BUDGET = 900000;
  function screenCells() {
    const g = S.grid,
      a = toCellF(toWorld(0, 0)),
      b = toCellF(toWorld(canvas?.clientWidth || 0, canvas?.clientHeight || 0)),
      clamp = (v, max) => Math.max(0, Math.min(max, v));
    return {
      x0: clamp(Math.floor(a.x), g.cols),
      y0: clamp(Math.floor(a.y), g.rows),
      x1: clamp(Math.ceil(b.x), g.cols),
      y1: clamp(Math.ceil(b.y), g.rows),
      want: cellPx() * S.view.s * (window.devicePixelRatio || 1),
    };
  }
  function newWindow() {
    const g = S.grid,
      sc = screenCells(),
      mx = Math.ceil((sc.x1 - sc.x0) / 2) + 2,
      my = Math.ceil((sc.y1 - sc.y0) / 2) + 2,
      x0 = Math.max(0, sc.x0 - mx),
      y0 = Math.max(0, sc.y0 - my),
      x1 = Math.min(g.cols, Math.max(x0 + 1, sc.x1 + mx)),
      y1 = Math.min(g.rows, Math.max(y0 + 1, sc.y1 + my)),
      maxRes = Math.max(2, Math.min(24, Math.floor(Math.sqrt(MASK_BUDGET / ((x1 - x0) * (y1 - y0)))))),
      res = Math.max(2, Math.min(maxRes, Math.ceil(sc.want)));
    return { map: S.mapId, cols: g.cols, rows: g.rows, x0, y0, x1, y1, res, W: (x1 - x0) * res, H: (y1 - y0) * res };
  }
  function windowFits(win) {
    if (!win || win.map !== S.mapId || win.cols !== S.grid.cols || win.rows !== S.grid.rows) return false;
    const sc = screenCells();
    if (sc.x0 < win.x0 || sc.y0 < win.y0 || sc.x1 > win.x1 || sc.y1 > win.y1) return false;
    return newWindow().res < win.res * 1.5;
  }
  // Dibuja una capa de ventana sobre el mapa.
  function drawWindowLayer(layer, win) {
    const c = cellPx(),
      o = origin();
    ctx.drawImage(layer, o.x + win.x0 * c, o.y + win.y0 * c, (win.x1 - win.x0) * c, (win.y1 - win.y0) * c);
  }
  function visionMask(state) {
    if (state.mask && windowFits(state.mask.win)) return state.mask;
    const g = S.grid,
      win = newWindow(),
      { res, W, H } = win,
      ox = win.x0 * res,
      oy = win.y0 * res;
    // Un polígono, opcionalmente hasta un radio con el borde difuminado.
    const fill = (cx, poly, at = null, r = Infinity) => {
      if (poly.length < 3 || r <= 0) return;
      cx.beginPath();
      poly.forEach(([x, y], i) => (i ? cx.lineTo(x * res - ox, y * res - oy) : cx.moveTo(x * res - ox, y * res - oy)));
      cx.closePath();
      if (Number.isFinite(r)) {
        const outer = (r + 0.75) * res,
          gr = cx.createRadialGradient(at.x * res - ox, at.y * res - oy, 0, at.x * res - ox, at.y * res - oy, outer);
        gr.addColorStop(0, '#000');
        gr.addColorStop(Math.max(0, (r + 0.25) / (r + 0.75)), '#000');
        gr.addColorStop(1, 'rgba(0,0,0,0)');
        cx.fillStyle = gr;
      } else cx.fillStyle = '#000';
      cx.fill();
    };
    // Casillas que cumplen `keep`, con el borde suave: una imagen de un píxel por casilla, agrandada con suavizado.
    const cw = win.x1 - win.x0,
      ch = win.y1 - win.y0;
    const softCells = (cx, keep, alpha = 1) => {
      const layer = maskLayer('cells', cw, ch),
        img = layer.createImageData(cw, ch);
      for (let y = 0; y < ch; y++)
        for (let x = 0; x < cw; x++) if (keep((y + win.y0) * g.cols + x + win.x0)) img.data[(y * cw + x) * 4 + 3] = 255;
      layer.putImageData(img, 0, 0);
      cx.save();
      cx.globalAlpha = alpha;
      cx.imageSmoothingEnabled = true;
      cx.drawImage(layer.canvas, 0, 0, W, H);
      cx.restore();
    };
    // Las casillas de muro o roca que se ven (su cara) se muestran enteras.
    const solidCells = (cx, min) => {
      cx.fillStyle = '#000';
      for (let y = win.y0; y < win.y1; y++)
        for (let x = win.x0; x < win.x1; x++) {
          const i = y * g.cols + x;
          if ((state.levels ? state.levels[i] : state.bits[i] ? 2 : 0) >= min && BC.terrainType(S.terrain[i]).blocks)
            cx.fillRect(x * res - ox, y * res - oy, res, res);
        }
    };
    const own = name => {
      state[name] ||= document.createElement('canvas');
      return state[name];
    };
    const darkEl = own('darkLayer');
    if (darkEl.width !== W || darkEl.height !== H) Object.assign(darkEl, { width: W, height: H });
    const dark = darkEl.getContext('2d');
    dark.globalCompositeOperation = 'source-over';
    dark.globalAlpha = 1;
    dark.fillStyle = '#05090b';
    dark.fillRect(0, 0, W, H);
    // Lo ya explorado se ve en penumbra (sin fichas, que dependen de lo que se ve ahora).
    const memory = exploredBits();
    if (memory) {
      dark.globalCompositeOperation = 'destination-out';
      softCells(dark, i => memory[i], 0.3);
      dark.globalCompositeOperation = 'source-over';
    }
    const los = maskLayer('los', W, H);
    for (const v of state.viewers) fill(los, sightPolygon(v, Infinity));
    let grey = null;
    if (!state.dark) {
      dark.globalCompositeOperation = 'destination-out';
      dark.drawImage(los.canvas, 0, 0);
      solidCells(dark, 1);
    } else {
      const dim = maskLayer('dim', W, H),
        bright = maskLayer('bright', W, H),
        dv = maskLayer('dv', W, H),
        work = maskLayer('work', W, H);
      for (const l of state.lights) {
        // Una luz lejos de la ventana no suma nada.
        if (
          l.x + l.dim + 1 < win.x0 ||
          l.x - l.dim - 1 > win.x1 ||
          l.y + l.dim + 1 < win.y0 ||
          l.y - l.dim - 1 > win.y1
        )
          continue;
        const poly = sightPolygon(l, l.dim);
        fill(dim, poly, l, l.dim);
        fill(bright, poly, l, l.bright);
      }
      // Zonas pintadas: ya tienen su luz, sin depender de ninguna fuente.
      if (state.ambient) {
        softCells(dim, i => state.ambient[i] >= 1);
        softCells(bright, i => state.ambient[i] >= 2);
      }
      for (const v of state.viewers) fill(dv, sightPolygon(v, Infinity), v, v.range);
      // Visión en la oscuridad sin ninguna luz: en gris.
      const greyEl = own('greyLayer');
      if (greyEl.width !== W || greyEl.height !== H) Object.assign(greyEl, { width: W, height: H });
      grey = greyEl.getContext('2d');
      grey.globalCompositeOperation = 'source-over';
      grey.clearRect(0, 0, W, H);
      grey.drawImage(dv.canvas, 0, 0);
      grey.globalCompositeOperation = 'destination-out';
      grey.drawImage(dim.canvas, 0, 0);
      grey.globalCompositeOperation = 'source-in';
      grey.fillStyle = '#808080';
      grey.fillRect(0, 0, W, H);
      // Lo que se ve: alguna luz a la vista, o la visión en la oscuridad. Queda en penumbra.
      work.drawImage(dim.canvas, 0, 0);
      work.globalCompositeOperation = 'destination-in';
      work.drawImage(los.canvas, 0, 0);
      work.globalCompositeOperation = 'source-over';
      work.drawImage(dv.canvas, 0, 0);
      solidCells(work, 1);
      dark.globalCompositeOperation = 'destination-out';
      dark.globalAlpha = 0.58;
      dark.drawImage(work.canvas, 0, 0);
      // Bien iluminado: luz brillante a la vista, o penumbra al alcance de la visión en la oscuridad.
      work.globalCompositeOperation = 'source-over';
      work.clearRect(0, 0, W, H);
      work.drawImage(bright.canvas, 0, 0);
      work.globalCompositeOperation = 'destination-in';
      work.drawImage(los.canvas, 0, 0);
      dv.globalCompositeOperation = 'destination-in';
      dv.drawImage(dim.canvas, 0, 0);
      work.globalCompositeOperation = 'source-over';
      work.drawImage(dv.canvas, 0, 0);
      solidCells(work, 2);
      dark.globalAlpha = 1;
      dark.drawImage(work.canvas, 0, 0);
    }
    dark.globalCompositeOperation = 'source-over';
    dark.globalAlpha = 1;
    state.mask = { dark: darkEl, grey: grey && grey.canvas, win };
    return state.mask;
  }
  // Resplandor cálido alrededor de cada luz, solo donde realmente alumbra: más fuerte en la luz brillante.
  // Se arma en una capa de ventana y solo se rehace cuando cambian las luces, las paredes o la ventana. Cada luz se
  // pinta con «el más claro gana»: varias antorchas juntas no se suman hasta quedar blancas.
  const glow = { key: '', ctx: null, layer: null, win: null };
  function drawLights() {
    const v = S.grid.vision || {},
      lights = v.los && v.dark ? sceneLights() : lightSources();
    if (!lights.length) return;
    const context = sightCtx(),
      key = `${S.mapId}|${lights.map(l => `${l.x},${l.y},${l.range}`).join(';')}`;
    if (glow.key !== key || glow.ctx !== context || !windowFits(glow.win)) {
      const win = newWindow(),
        { res, W, H } = win,
        ox = win.x0 * res,
        oy = win.y0 * res;
      glow.layer ||= document.createElement('canvas');
      if (glow.layer.width !== W || glow.layer.height !== H) Object.assign(glow.layer, { width: W, height: H });
      const cx = glow.layer.getContext('2d');
      cx.globalCompositeOperation = 'source-over';
      cx.fillStyle = '#000';
      cx.fillRect(0, 0, W, H);
      cx.globalCompositeOperation = 'lighten';
      for (const l of lights) {
        if (
          l.x + l.range + 1 < win.x0 ||
          l.x - l.range - 1 > win.x1 ||
          l.y + l.range + 1 < win.y0 ||
          l.y - l.range - 1 > win.y1
        )
          continue;
        const poly = sightPolygon(l, l.range);
        if (poly.length < 3) continue;
        cx.save();
        cx.beginPath();
        poly.forEach(([x, y], i) =>
          i ? cx.lineTo(x * res - ox, y * res - oy) : cx.moveTo(x * res - ox, y * res - oy),
        );
        cx.closePath();
        cx.clip();
        const px = l.x * res - ox,
          py = l.y * res - oy,
          rad = (l.range + 0.5) * res,
          gr = cx.createRadialGradient(px, py, 0, px, py, rad);
        // Colores ya multiplicados por su intensidad, sobre negro: al sumarlos al mapa, el negro no cambia nada.
        gr.addColorStop(0, 'rgb(107,90,55)');
        gr.addColorStop(0.45, 'rgb(66,49,26)');
        gr.addColorStop(0.55, 'rgb(31,20,10)');
        gr.addColorStop(1, '#000');
        cx.fillStyle = gr;
        cx.fillRect(px - rad, py - rad, rad * 2, rad * 2);
        cx.restore();
      }
      Object.assign(glow, { key, ctx: context, win });
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.imageSmoothingEnabled = true;
    drawWindowLayer(glow.layer, glow.win);
    ctx.restore();
  }
  const isSeen = (bits, x, y) => !bits || (BC.inside(S.grid, x, y) && bits[y * S.grid.cols + x] === 1);

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
  // ---------- Puertas y escaleras ----------
  // Devuelve true si el toque cayó en una puerta o una escalera y ya se resolvió.
  function tapCell(cell, f = null) {
    if (TV || !S.mapId) return false;
    if (f && S.walls.length && tapWallDoor(f)) return true;
    if (!BC.inside(S.grid, cell.x, cell.y)) return false;
    const code = BC.at(S.grid, S.terrain, cell.x, cell.y);
    if (code === 'S') {
      if (dmView()) stairsDialog(cell);
      else {
        const to = S.maps.find(m => m.id === S.links[cell.x + ',' + cell.y]);
        toast(to ? `Escalera a «${to.name}». El DM lleva la mesa.` : 'Una escalera.');
      }
      return true;
    }
    if (!BC.isDoor(code)) return false;
    if (dmView()) {
      if (code === 'L') lockedDialog(cell);
      else setDoor(cell, code === 'D' ? 'O' : 'D');
      return true;
    }
    // Un jugador abre o cierra la puerta que tiene al lado; el cambio lo guarda la pantalla del DM.
    const me = mapTokens().find(t => myCharacters().includes(t.character_id));
    if (!me) return false;
    const size = Math.max(1, Math.round(me.size || 1)),
      dx = Math.max(me.x - cell.x, 0, cell.x - (me.x + size - 1)),
      dy = Math.max(me.y - cell.y, 0, cell.y - (me.y + size - 1));
    if (Math.max(dx, dy) > 1) toast('Acercate a la puerta para abrirla o cerrarla.');
    else
      S.channel?.send({
        t: 'door',
        map: S.mapId,
        x: cell.x,
        y: cell.y,
        to: code === 'O' ? 'D' : 'O',
        by: S.me?.id,
      });
    return true;
  }
  function setDoor(cell, to) {
    if (BC.at(S.grid, S.terrain, cell.x, cell.y) === to) return;
    S.terrain = BC.paint(S.grid, S.terrain, [[cell.x, cell.y]], to);
    saveSoon(terrainPatch());
    S.dirty = true;
  }
  // Pedido de un jugador: lo atiende la pantalla del DM que tiene ese mapa abierto.
  function onDoorAsk(m) {
    if (!S.isDM || TV || !Number.isInteger(m.x) || !Number.isInteger(m.y)) return;
    const code = BC.at(S.grid, S.terrain, m.x, m.y);
    if (code === 'L') S.channel?.send({ t: 'door-locked', map: S.mapId, to: m.by });
    else if ((code === 'D' && m.to === 'O') || (code === 'O' && m.to === 'D')) setDoor({ x: m.x, y: m.y }, m.to);
  }
  function lockedDialog(cell) {
    modal(
      'Puerta trabada',
      '<p>Los jugadores no pueden abrirla. Para volver a trabarla, pintala con «Terreno» → «Puerta trabada».</p>',
      async () => setDoor(cell, 'D'),
      'Destrabar',
    );
  }
  function stairsDialog(cell) {
    const key = cell.x + ',' + cell.y,
      cur = S.links[key] || '',
      others = S.maps.filter(m => m.id !== S.mapId);
    if (!others.length) return toast('Creá otro mapa para unirlo con esta escalera.');
    modal(
      'Escalera',
      `<label class="field">Lleva a<select name="to"><option value="">Ningún mapa</option>${others
        .map(m => `<option value="${esc(m.id)}" ${m.id === cur ? 'selected' : ''}>${esc(m.name)}</option>`)
        .join(
          '',
        )}</select></label><label class="check"><input type="checkbox" name="go" ${cur ? 'checked' : ''}>Llevar la mesa a ese mapa ahora</label><p class="small">Al llegar, los personajes aparecen junto a la escalera de ese mapa que vuelve a este (o junto a la primera que tenga).</p>`,
      async fd => {
        const to = String(fd.get('to') || '');
        S.links = { ...S.links };
        if (to) S.links[key] = to;
        else delete S.links[key];
        const from = S.mapId;
        saveSoon(terrainPatch());
        if (to && fd.has('go')) await travel(to, from);
        else ui();
      },
    );
  }
  // Lleva la mesa a otro mapa y acomoda a los personajes junto a la escalera de llegada.
  async function travel(to, from) {
    clearTimeout(S.saveTimer);
    await flushSave();
    await goLive(to);
    await openMap(to);
    const spot = BC.arrival(S.grid, S.terrain, currentMap()?.terrain?.links, from);
    if (!spot) return;
    const placed = mapTokens().filter(t => t.kind !== 'pc');
    for (const t of mapTokens().filter(k => k.kind === 'pc')) {
      const p = BC.freeSpot(S.grid, placed, { x: spot[0], y: spot[1] }, S.terrain);
      placed.push({ ...t, ...p });
      if (p.x !== t.x || p.y !== t.y) await patchToken(t, p);
    }
    S.channel?.send({ t: 'refresh' });
    S.dirty = true;
  }
  function paintBrush(cell) {
    S.terrain = BC.paint(S.grid, S.terrain, BC.brush(cell.x, cell.y, S.radius), S.paintCode);
    saveSoon(terrainPatch());
  }

  // ---------- Luz del mapa: zonas pintadas y luces fijas ----------
  function lightHint() {
    if (S.lightMode === 'place') return 'Tocá donde hay una lámpara, una vela o un brasero en el dibujo.';
    if (S.lightMode === 'remove') return 'Tocá una luz fija para quitarla.';
    return 'Pintá las zonas con luz propia: un patio de día, una sala con antorchas, una cueva oscura.';
  }
  function ambientBrush(cell) {
    S.ambient = BC.paint(S.grid, S.ambient, BC.brush(cell.x, cell.y, S.radius), S.lightMode);
    saveSoon(terrainPatch());
  }
  function lightTap(w) {
    const f = toCellF(w);
    if (S.lightMode === 'place') {
      if (S.fixedLights.length >= BC.MAX_FIXED_LIGHTS)
        return toast(`Este mapa ya tiene el máximo de ${BC.MAX_FIXED_LIGHTS} luces fijas.`);
      const x = Math.round(f.x * 2) / 2,
        y = Math.round(f.y * 2) / 2;
      S.fixedLights = BC.normLights(S.grid, [...S.fixedLights, [x, y, S.lightFeet]]);
    } else {
      let best = -1,
        dist = Math.max(0.5, touchReach(20));
      S.fixedLights.forEach(([x, y], i) => {
        const d = Math.hypot(x - f.x, y - f.y);
        if (d <= dist) [best, dist] = [i, d];
      });
      if (best < 0) return;
      S.fixedLights = S.fixedLights.filter((_, i) => i !== best);
    }
    saveSoon(terrainPatch());
    panel();
    S.dirty = true;
  }
  // Para el DM: las zonas pintadas (con la herramienta) y las luces fijas, que los jugadores no ven.
  const AMBIENT_TINT = { b: 'rgba(255,220,120,0.24)', d: 'rgba(255,150,60,0.18)', n: 'rgba(20,30,80,0.42)' };
  function drawLightMarks() {
    if (!dmView()) return;
    const c = cellPx(),
      o = origin(),
      k = 1 / S.view.s,
      g = S.grid,
      tool = S.tool === 'light';
    if (tool)
      for (const code of 'bdn') {
        ctx.fillStyle = AMBIENT_TINT[code];
        ctx.beginPath();
        for (let i = 0; i < S.ambient.length; i++)
          if (S.ambient[i] === code) ctx.rect(o.x + (i % g.cols) * c, o.y + Math.floor(i / g.cols) * c, c, c);
        ctx.fill();
      }
    if (!tool && !S.showWalls) return;
    ctx.save();
    for (const [x, y, feet] of S.fixedLights) {
      const px = o.x + x * c,
        py = o.y + y * c;
      if (tool) {
        ctx.strokeStyle = 'rgba(255,214,130,0.6)';
        ctx.lineWidth = 2 * k;
        ctx.setLineDash([6 * k, 5 * k]);
        ctx.beginPath();
        ctx.arc(px, py, (feet / g.feet) * c, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.fillStyle = 'rgba(20,12,6,0.85)';
      ctx.beginPath();
      ctx.arc(px, py, 9 * k, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd27a';
      ctx.font = `700 ${12 * k}px Inter, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✦', px, py + 0.5 * k);
    }
    ctx.restore();
  }

  // ---------- Paredes dibujadas a mano (sobre todo para mapas de imagen) ----------
  const drawingWalls = () => ['wall', 'door', 'window'].includes(S.wallMode);
  function wallHint() {
    if (S.wallMode === 'edit')
      return 'Tocá un tramo para cambiarlo: pared, puerta (abierta, cerrada o trabada) o ventana.';
    if (S.wallMode === 'erase') return 'Tocá un tramo para borrarlo, o arrastrá por encima de varios.';
    return S.wallChain
      ? 'Tocá el próximo punto. Tocá otra vez el último (o Esc) para terminar el trazo.'
      : 'Tocá donde empieza y después cada esquina, o arrastrá un tramo suelto. Seguí las paredes del dibujo.';
  }
  // Distancia de toque en casillas: unos 16 píxeles de pantalla, al zoom que haya.
  const touchReach = (px = 16) => Math.max(0.15, px / (cellPx() * S.view.s));
  const wallPoint = w => BC.snapWallPoint(S.walls, toCellF(w), S.wallSnap, touchReach(12));
  const samePoint = (a, b) => !!a && !!b && Math.hypot(a.x - b.x, a.y - b.y) < 0.05;
  function changeWalls(next) {
    if (next === S.walls) return;
    S.wallUndo = [...S.wallUndo.filter(u => u.map === S.mapId).slice(-49), { map: S.mapId, walls: S.walls }];
    S.walls = next;
    S.wallHover = -1;
    saveSoon(terrainPatch());
    S.dirty = true;
  }
  function undoWalls() {
    const i = S.wallUndo.findLastIndex(u => u.map === S.mapId);
    if (i < 0) return false;
    S.walls = S.wallUndo[i].walls;
    S.wallUndo = S.wallUndo.filter((_, j) => j !== i);
    Object.assign(S, { wallChain: null, wallHover: -1 });
    saveSoon(terrainPatch());
    S.dirty = true;
    return true;
  }
  function commitWall(from, to) {
    if (samePoint(from, to)) return false;
    if (S.walls.length >= BC.MAX_WALLS) {
      toast(`Este mapa ya tiene el máximo de ${BC.MAX_WALLS} tramos.`);
      return false;
    }
    const kind = { wall: BC.WALL.wall, door: BC.WALL.door, window: BC.WALL.window }[S.wallMode];
    changeWalls(BC.addWall(S.walls, [from.x, from.y, to.x, to.y, kind]));
    return true;
  }
  function endWallChain() {
    S.wallChain = null;
    S.wallDraw = null;
    hint(wallHint());
    panel();
    S.dirty = true;
  }
  // Toque con la herramienta: un punto del trazo, o elegir un tramo para cambiarlo o borrarlo.
  function wallTap(w) {
    if (drawingWalls()) {
      const p = wallPoint(w);
      if (!S.wallChain) S.wallChain = p;
      else if (samePoint(S.wallChain, p)) return endWallChain();
      else if (commitWall(S.wallChain, p)) S.wallChain = p;
      hint(wallHint());
      panel();
      return;
    }
    const f = toCellF(w),
      i = BC.nearestWall(S.walls, f.x, f.y, touchReach());
    if (i < 0) return;
    if (S.wallMode === 'erase') {
      changeWalls(S.walls.filter((_, j) => j !== i));
      panel();
    } else wallEditDialog(i);
  }
  function wallEraseAt(w) {
    const f = toCellF(w),
      i = BC.nearestWall(S.walls, f.x, f.y, touchReach());
    if (i >= 0) changeWalls(S.walls.filter((_, j) => j !== i));
  }
  function wallEditDialog(i) {
    const w = S.walls[i];
    if (!w) return;
    const cur = BC.wallKind(w),
      len = Math.hypot(w[2] - w[0], w[3] - w[1]) * S.grid.feet;
    modal(
      'Tramo de pared',
      `<label class="field">Qué es<select name="kind">${BC.WALL_KINDS.map(
        ([k, name]) => `<option value="${k}" ${k === cur ? 'selected' : ''}>${esc(name)}</option>`,
      ).join(
        '',
      )}<option value="remove">Quitar el tramo</option></select></label><p class="small">Mide ${Math.round(len)} pies. Las puertas trabadas no las abren los jugadores; el DM las destraba tocándolas.</p>`,
      async fd => {
        const v = String(fd.get('kind'));
        changeWalls(v === 'remove' ? S.walls.filter((_, j) => j !== i) : BC.setWallKind(S.walls, i, Number(v)));
        ui();
      },
    );
  }
  // Puertas dibujadas: el DM las abre y cierra con un toque; un jugador, si su personaje está al lado.
  function tapWallDoor(f) {
    const i = BC.nearestWall(S.walls, f.x, f.y, touchReach(18), BC.isWallDoor);
    if (i < 0) return false;
    const w = S.walls[i],
      kind = BC.wallKind(w);
    if (dmView()) {
      if (kind === BC.WALL.locked) lockedWallDialog(i);
      else setWallDoor(i);
      return true;
    }
    const me = mapTokens().find(t => myCharacters().includes(t.character_id));
    if (!me) return false;
    const half = BC.tokenSpan(me) / 2;
    if (BC.wallDistance(w, me.x + half, me.y + half) > half + 1.05)
      toast('Acercate a la puerta para abrirla o cerrarla.');
    else if (kind === BC.WALL.locked) toast('Esa puerta está trabada.');
    else
      S.channel?.send({
        t: 'wall-door',
        map: S.mapId,
        i,
        w: w.slice(0, 4),
        to: kind === BC.WALL.open ? BC.WALL.door : BC.WALL.open,
        by: S.me?.id,
      });
    return true;
  }
  function setWallDoor(i, to = null) {
    const w = S.walls[i];
    if (!w || (to !== null && BC.wallKind(w) === to)) return;
    const next = BC.toggleWallDoor(S.walls, i);
    if (!next) return;
    S.walls = next;
    saveSoon(terrainPatch());
    S.dirty = true;
  }
  function lockedWallDialog(i) {
    modal(
      'Puerta trabada',
      '<p>Los jugadores no pueden abrirla. Para volver a trabarla, usá «Paredes» → «Cambiar tipo».</p>',
      async () => {
        S.walls = BC.setWallKind(S.walls, i, BC.WALL.door);
        saveSoon(terrainPatch());
        S.dirty = true;
      },
      'Destrabar',
    );
  }
  // Pedido de un jugador: lo atiende la pantalla del DM. El índice se confirma con las puntas del tramo,
  // por si las paredes cambiaron mientras tanto.
  function onWallDoorAsk(m) {
    if (!S.isDM || TV || !Array.isArray(m.w) || m.w.length !== 4) return;
    const match = w => !!w && m.w.every((v, j) => Math.abs(Number(v) - w[j]) < 0.011);
    const i = match(S.walls[m.i]) ? m.i : S.walls.findIndex(match);
    const kind = BC.wallKind(S.walls[i]);
    if (i < 0 || !BC.isWallDoor(S.walls[i])) return;
    if (kind === BC.WALL.locked) S.channel?.send({ t: 'door-locked', map: S.mapId, to: m.by });
    else if ((m.to === BC.WALL.open && kind === BC.WALL.door) || (m.to === BC.WALL.door && kind === BC.WALL.open))
      setWallDoor(i, m.to);
  }

  // ---------- Combate: objetivo, flanqueo, alcance y ataques de oportunidad ----------
  const tokenById = id => S.tokens.find(t => t.id === id) || null;
  const sideOf = t => (t?.kind === 'pc' ? 'pc' : t?.kind === 'monster' ? 'monster' : null);
  const enemies = (a, b) => !!sideOf(a) && !!sideOf(b) && sideOf(a) !== sideOf(b);
  const inCombat = () => !!S.party?.encounter?.active;
  const dmView = () => S.isDM && !S.asPlayer && !TV;
  // Quién actúa en esta pantalla: el jugador, su personaje; el DM, la ficha que tiene seleccionada.
  function actor() {
    if (TV) return null;
    if (dmView()) {
      const t = tokenById(S.sel);
      return t && t.map_id === S.mapId && t.kind !== 'object' ? t : null;
    }
    const id = H.actorId?.();
    return mapTokens().find(t => (id ? t.character_id === id : myCharacters().includes(t.character_id))) || null;
  }
  // Tocar una ficha: con alguien que actúa, tocar a otro lo marca como objetivo (el DM elige objetivo
  // solo entre enemigos de su criatura; tocar a otra la selecciona).
  function tapToken(id) {
    S.selected.clear();
    const t = tokenById(id),
      me = actor();
    if (!t) {
      S.sel = null;
      if (dmView()) S.target = null;
    } else if (dmView()) {
      if (me && me.id !== t.id && enemies(me, t)) S.target = S.target === t.id ? null : t.id;
      else {
        S.sel = t.id;
        if (!enemies(t, tokenById(S.target))) S.target = null;
      }
    } else {
      S.sel = t.id;
      if (me && t.id !== me.id && t.kind !== 'object') {
        S.target = t.id;
        S.dockMin = false; // elegir objetivo es para actuar: se abre el panel
      }
    }
    pick();
  }
  function setTarget(id) {
    S.target = id;
    pick();
  }
  function combatContext() {
    const me = actor(),
      t = me && tokenById(S.target);
    const base = {
      actor: me ? { id: me.id, name: me.name, characterId: me.character_id, combatantId: me.combatant_id } : null,
    };
    if (
      !me ||
      !t ||
      t.map_id !== S.mapId ||
      t.id === me.id ||
      (playerView() &&
        spellClouds.length &&
        (!visibleTokens().some(v => v.id === t.id) ||
          !canSeeGround({ x: t.x + BC.tokenSpan(t) / 2, y: t.y + BC.tokenSpan(t) / 2 })))
    )
      return { ...base, target: null };
    const feet = S.grid.feet || 5,
      live = visibleTokens().filter(k => k.kind !== 'object' && !info(k).dead);
    const allies = live.filter(k => k.id !== me.id && k.id !== t.id && sideOf(k) === sideOf(me));
    const ally = enemies(me, t) ? BC.flankingAlly(me, t, allies) : null;
    const near = live.filter(k => enemies(me, k) && BC.gap(me, k) === 1);
    return {
      ...base,
      target: { id: t.id, name: t.name, combatantId: t.combatant_id, characterId: t.character_id, kind: t.kind },
      combatantId: t.combatant_id || null,
      characterId: t.character_id || null,
      name: t.name,
      distance: Math.max(BC.distanceFt(me, t, feet), Math.abs((me.elev || 0) - (t.elev || 0))),
      adjacent: BC.gap(me, t) === 1,
      flank: !!ally,
      flankWith: ally?.name || '',
      foeAdjacent: near.length > 0,
    };
  }
  let lastPick = '';
  function pick() {
    const c = combatContext(),
      key = JSON.stringify(c);
    if (key !== lastPick) {
      lastPick = key;
      H.pick?.(c);
      dock();
    }
    card();
    S.dirty = true;
  }
  const autoChoices = { off: 'Desactivada', travel: 'Dirección de avance', enemy: 'Enemigo más cercano' };
  const directionNames = ['Sur', 'Suroeste', 'Oeste', 'Noroeste', 'Norte', 'Noreste', 'Este', 'Sureste'];
  function rotationDialog() {
    const group = rotationGroup();
    if (!group.length) return;
    const primary = group.find(t => t.id === S.sel) || group[0];
    const modeChoices = { inherit: 'Usar ajuste del tablero', ...autoChoices };
    const configurable = group.every(canMove);
    const directionGrid = [3, 4, 5, 2, null, 6, 1, 0, 7]
      .map(n =>
        n == null
          ? '<span aria-hidden="true">✥</span>'
          : `<button type="button" class="button secondary" data-direction="${n}" aria-label="${directionNames[n]}" aria-pressed="${group.every(t => BC.heading(t.facing) === n)}">${BC.headings[n]}</button>`,
      )
      .join('');
    const options = Object.entries(modeChoices)
      .map(
        ([key, label]) =>
          `<option value="${key}" ${key === (primary.facing_mode || 'inherit') ? 'selected' : ''}>${label}</option>`,
      )
      .join('');
    modal(
      group.length > 1 ? `Girar ${group.length} fichas` : `Girar · ${info(primary).name || primary.name}`,
      `<div class="board-compass" aria-label="Dirección">${directionGrid}</div><div class="actions"><button class="button secondary" type="button" data-look-at>Mirar a…</button><button class="button secondary" type="button" data-select-group>${S.multiSelect ? 'Terminar selección' : 'Seleccionar varias'}</button>${S.poseUndo.length ? '<button class="button secondary" type="button" data-undo-pose>Deshacer</button>' : ''}</div>${group.some(t => missingFacings.has(t.id)) ? '<p class="small muted">Faltan vistas de giro. La miniatura quedó marcada para volver a renderizar.</p>' : ''}${configurable ? `<label class="field">Orientación automática<select name="mode">${options}</select></label>` : ''}`,
      configurable
        ? async fd => {
            await applyPoses(group.map(t => ({ id: t.id, patch: { facing_mode: fd.get('mode') } })));
            queueEnemyFacing();
            pick();
          }
        : null,
    );
    const modalEl = $('#modal');
    for (const direction of modalEl.querySelectorAll('[data-direction]'))
      direction.addEventListener('click', () => {
        modalEl.close();
        rotateSelection(() => Number(direction.dataset.direction));
      });
    modalEl.querySelector('[data-look-at]').onclick = () => {
      modalEl.close();
      S.aimFacing = true;
      $('#board-card').setAttribute('data-offscreen', '');
      rotationHandle.hidden = true;
      if (!['move', 'tokens', 'enc'].includes(S.tool)) S.tool = 'move';
      hint('Tocá la ficha hacia la que querés mirar.');
      S.dirty = true;
    };
    modalEl.querySelector('[data-select-group]').onclick = () => {
      modalEl.close();
      S.multiSelect = !S.multiSelect;
      if (!['move', 'tokens', 'enc'].includes(S.tool)) S.tool = 'move';
      tools();
    };
    modalEl.querySelector('[data-undo-pose]')?.addEventListener('click', () => {
      modalEl.close();
      undoPose().catch(err => toast(err.message));
    });
  }
  function rotationSettings() {
    if (!dmView() || !S.mapId) return;
    const { mode, marker, playerMonsters } = S.grid.rotation;
    modal(
      'Orientación del tablero',
      `<label class="field">Orientación automática<select name="mode">${Object.entries(autoChoices)
        .map(([key, label]) => `<option value="${key}" ${key === mode ? 'selected' : ''}>${label}</option>`)
        .join(
          '',
        )}</select></label><label class="check"><input type="checkbox" name="marker" ${marker ? 'checked' : ''}>Marca de orientación en las peanas</label><label class="check"><input type="checkbox" name="playerMonsters" ${playerMonsters ? 'checked' : ''}>Los jugadores pueden girar monstruos visibles</label>`,
      async fd => {
        const grid = {
          ...currentMap().grid,
          rotation: { mode: fd.get('mode'), marker: fd.has('marker'), playerMonsters: fd.has('playerMonsters') },
        };
        const map = S.mapId;
        const saved = await Cloud.saveMap(S.id, { grid }, map);
        rememberMaps([saved]);
        if (map === S.mapId) S.grid.rotation = BC.normGrid(grid).rotation;
        queueEnemyFacing();
        ui();
      },
    );
  }
  function targetLine(c) {
    if (!c?.target) return '';
    return `${esc(c.name)} · ${c.distance} pies${c.flank ? ` · <b>flanqueo con ${esc(c.flankWith)}</b>: ventaja cuerpo a cuerpo` : ''}${c.foeAdjacent ? ' · enemigo al lado: desventaja a distancia' : ''}`;
  }
  // Panel de acciones al costado (o abajo en el celular): lo arma la página (ficha del jugador o criatura del DM).
  function dock() {
    const el = $('#board-dock');
    if (!el) return;
    const c = combatContext(),
      html = shown && H.dock ? H.dock(c) : '';
    el.hidden = !html || casting?.active();
    if (!html) return;
    const scroll = el.querySelector('.board-dock-body')?.scrollTop || 0;
    const me = actor(),
      free = me?.combatant_id && S.disengaged.has(me.combatant_id);
    el.classList.toggle('min', S.dockMin);
    el.innerHTML = `<div class="board-dock-head"><div><b>${c.target ? '🎯 ' + targetLine(c) : me ? 'Tocá una ficha para elegir objetivo' : dmView() ? 'Tocá una criatura para ver sus acciones' : 'Tu ficha no está en este mapa'}</b></div><div class="actions">${c.target ? button('×', 'untarget', 'text-btn', 'aria-label="Quitar objetivo" title="Quitar objetivo"') : ''}${dmView() && me?.combatant_id ? button(free ? 'Destrabada ✓' : 'Destrabarse', 'disengage', free ? '' : 'secondary', 'title="Su movimiento no provoca ataques de oportunidad este turno"') : ''}<button type="button" class="icon-btn" data-action="bd-dock-min" aria-expanded="${!S.dockMin}" aria-label="${S.dockMin ? 'Mostrar acciones' : 'Plegar acciones'}">${S.dockMin ? '▴' : '▾'}</button></div></div>${S.dockMin ? '' : `<div class="board-dock-body">${html}</div>`}`;
    const body = el.querySelector('.board-dock-body');
    if (body) body.scrollTop = scroll;
  }
  // Recorrido de la ficha durante el arrastre, casilla por casilla.
  function trackPath(d) {
    const last = d.path[d.path.length - 1],
      { x, y, span } = BC.footprintRect(d.token);
    if (x === last.x && y === last.y) return;
    d.path.push(...BC.steps(last, { x, y }, Math.min(1, span)).slice(1));
    d.wall = !d.group?.length && !!wallInWay(d.path, d.start, { x, y }, span);
    // Solo cuenta dónde empieza y dónde termina: tantear el recorrido arrastrando no provoca nada.
    const t = tokenById(d.token.id);
    d.risk = inCombat() && !d.group?.length && t && !isFree(d, t) ? threats({ ...t, x, y }, [d.start, { x, y }]) : [];
    d.plan =
      t && limited(t)
        ? turnBlock(t)
          ? { ok: false, blocked: true, cost: 0 }
          : { ...BC.moveTo(S.grid, S.terrain, turnPts(t), { x, y }, budget(t), span), budget: budget(t) }
        : null;
  }
  const isFree = (d, t) => d.free || !!H.disengaged?.(t) || (!!t.combatant_id && S.disengaged.has(t.combatant_id));
  // Pared que corta el paso: tanto el recorrido arrastrado como la línea recta tienen que chocar con alguna,
  // así se puede tantear arrastrando, o dar la vuelta por una puerta abierta.
  function wallInWay(path, from, to, span) {
    if (!S.walls.length) return null;
    const dragged = BC.wallOnPath(S.walls, [...path, to], span);
    return dragged && BC.wallOnPath(S.walls, BC.steps(from, to, Math.min(1, span)), span);
  }

  // ---------- Movimiento por turno (jugadores en combate) ----------
  // Cada jugador tiene su velocidad por turno (el doble si usó Correr). Se guarda en este dispositivo
  // para que recargar la página no lo reinicie. El DM mueve sin límite.
  const movesKey = () => 'dnd-board-moves-' + S.id;
  const turnKey = () => {
    const e = S.party?.encounter;
    return e?.active ? e.round + ':' + e.current_id : '';
  };
  function moves() {
    const k = turnKey();
    if (!S.moves || S.moves.key !== k) {
      let saved = null;
      try {
        saved = JSON.parse(localStorage.getItem(movesKey()) || 'null');
      } catch {}
      S.moves = saved?.key === k && saved.tokens ? saved : { key: k, tokens: {} };
    }
    return S.moves;
  }
  function saveMoves() {
    try {
      localStorage.setItem(movesKey(), JSON.stringify(S.moves));
    } catch {}
  }
  const limited = t => inCombat() && !TV && !dmView() && mine(t);
  const budget = t => H.speed?.(t) ?? info(t).speed ?? 30;
  // Puntos del turno; si el DM la movió mientras tanto, se sigue desde donde está.
  function turnPts(t) {
    const list = moves().tokens[t.id];
    const { x, y } = BC.footprintRect(t);
    if (!list?.length) return [{ x, y, ft: 0 }];
    const last = list[list.length - 1];
    return last.x === x && last.y === y ? list : [{ x, y, ft: last.ft }];
  }
  function turnBlock(t) {
    const c = (S.party?.combatants || []).find(x => x.character_id && x.character_id === t.character_id);
    if (!c || S.party.encounter.current_id === c.id) return '';
    return 'Todavía no es tu turno: esperá para moverte (si hace falta, el DM puede mover tu ficha).';
  }
  // Antes de provocar, se pregunta: evita ataques de oportunidad por un arrastre sin querer.
  function confirmMove(list) {
    return new Promise(ok => {
      let yes = false;
      modal(
        '¿Moverte igual?',
        `<p>Salir del alcance de <b>${esc(list.map(k => k.name).join(', '))}</b> provoca un ataque de oportunidad.</p><p class="small muted">Si usaste Destrabarse, marcalo antes (en tu ficha o en el panel). Soltar con Mayúsculas o Alt es un movimiento libre que no provoca (empujón, teletransporte).</p>`,
        () => {
          yes = true;
        },
        'Mover igual',
      );
      $('#modal').addEventListener('close', () => ok(yes), { once: true });
    });
  }
  // Enemigos de los que sale del alcance (para avisar mientras arrastra). El alcance real lo sabe cada página.
  function threats(mover, path) {
    if (!sideOf(mover)) return [];
    const others = visibleTokens()
      .filter(k => enemies(mover, k) && !info(k).dead && !(k.hidden && playerView()))
      .map(k => ({ token: k, reach: H.reach?.(k) || 5 }));
    return BC.provokers(mover, path, others, S.grid.feet || 5).map(p => p.token);
  }
  // Tras mover: avisa a todos el recorrido; cada pantalla ve si alguna de sus fichas puede reaccionar.
  function afterMove(d, x, y, teleport = false) {
    if (d.group?.length) return;
    const t = tokenById(d.token.id);
    if (!t || !sideOf(t)) return;
    const path = [
      { x: d.start.x, y: d.start.y },
      { x, y },
    ];
    const msg = {
      t: 'moved',
      id: t.id,
      map: S.mapId,
      path,
      free: teleport || isFree(d, t),
      teleport,
      turn: turnZoneKey(S.party?.encounter),
      moveId: globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2),
    };
    S.channel?.send(msg);
    onMoved(msg);
  }
  function mine(k) {
    if (TV) return false;
    if (dmView()) return k.kind === 'monster' && !!k.combatant_id;
    const id = H.actorId?.();
    return k.kind === 'pc' && (id ? k.character_id === id : myCharacters().includes(k.character_id));
  }
  function onMoved(m) {
    if (
      m.map !== S.mapId ||
      !Array.isArray(m.path) ||
      m.path.length < 2 ||
      m.path.length > 200 ||
      !m.path.every(
        p =>
          Number.isFinite(p.x) &&
          Number.isFinite(p.y) &&
          p.x >= 0 &&
          p.y >= 0 &&
          p.x <= S.grid.cols &&
          p.y <= S.grid.rows,
      )
    )
      return;
    const mover = tokenById(m.id);
    if (!mover) return;
    checkZoneMove(mover, m);
    if (m.free || !inCombat()) return;
    const reactors = mapTokens()
      .filter(k => k.id !== mover.id && mine(k) && enemies(k, mover) && !info(k).dead)
      .map(k => ({ token: k, reach: H.reach?.(k) || 5 }));
    for (const { token } of BC.provokers(mover, m.path, reactors, S.grid.feet || 5)) {
      const who = { reactor: token, mover };
      if (H.opportunity) H.opportunity(who);
      else
        toast(
          `${mover.name} sale del alcance de ${token.name}: puede hacer un ataque de oportunidad (abrí el tablero desde ${S.isDM ? 'la pantalla del DM' : 'tu ficha'} para atacar).`,
        );
    }
  }
  // Al pasar el turno: las criaturas dejan de estar destrabadas y el DM ve las acciones de la que le toca.
  function turnChanged() {
    const enc = S.party?.encounter,
      id = enc?.active ? enc.current_id : null;
    const zoneKey = turnZoneKey(enc);
    if (zoneKey !== zoneTurn?.key) {
      const tokenFor = combatant =>
        mapTokens().find(
          k =>
            k.combatant_id === combatant ||
            (k.character_id && S.party?.combatants?.some(c => c.id === combatant && c.character_id === k.character_id)),
        );
      if (zoneTurn && zoneKey) checkZoneTurn(tokenFor(zoneTurn.id), 'end', zoneTurn.key);
      zoneTurn = zoneKey ? { key: zoneKey, id } : null;
      if (zoneTurn) checkZoneTurn(tokenFor(id), 'start', zoneKey);
    }
    if (id === S.turnId) return;
    S.turnId = id;
    S.disengaged.clear();
    if (dmView() && !STANDALONE && id) {
      const t = mapTokens().find(k => k.combatant_id === id);
      if (t) {
        S.sel = t.id;
        if (!enemies(t, tokenById(S.target))) S.target = null;
      }
    }
    pick();
  }

  // ---------- Interfaz ----------
  function ui() {
    topBar();
    tools();
    panel();
    pick();
    dock(); // también cuando solo cambió el panel (plegar, destrabarse)
    turn();
    S.dirty = true;
  }
  function renderPlayerScreen() {
    const party = S.party;
    const calendar = party.campaign.settings?.calendar;
    const date = calendar && Chronicle.cleanCalendar(calendar);
    const roster = party.characters.map(row => {
      const pc = summary(row);
      const hp = pc.broken
        ? 'PG sin datos'
        : `${pc.hp ?? '—'} / ${pc.maxHP} PG${pc.temp ? ` · +${pc.temp} temp.` : ''}`;
      const meter =
        pc.hp != null && pc.maxHP > 0
          ? `<meter aria-label="Puntos de golpe" min="0" max="${esc(pc.maxHP)}" value="${esc(pc.hp)}"></meter>`
          : '';
      return `<li><b>${esc(pc.name || row.name)}</b><span>${esc(hp)}</span>${meter}</li>`;
    });
    const enc = party.encounter;
    const initiative = enc?.active
      ? Cloud.order(
          party.combatants.filter(c => !c.hidden && !c.board_only),
          true,
        ).map(c => {
          const name = c.name || 'Sin nombre';
          const initial = Array.from(name.trim())[0]?.toLocaleUpperCase('es') || '·';
          return `<li${enc.current_id === c.id ? ' aria-current="step"' : ''}><span class="screen-initial" aria-hidden="true">${esc(initial)}</span><b>${esc(name)}</b></li>`;
        })
      : [];
    const el = $('#player-screen-party');
    el.hidden = false;
    const daylight = date?.time && Number(date.time.slice(0, 2)) >= 6 && Number(date.time.slice(0, 2)) < 18;
    const sky = daylight
      ? '<span class="clock-sky day" role="img" aria-label="Día">☀</span>'
      : '<span class="clock-sky night" role="img" aria-label="Noche">☾</span>';
    el.querySelector('.screen-clock').innerHTML =
      `${date?.time ? `<time>${sky}${esc(date.time)}</time>` : ''}${date ? `<span>${esc(Chronicle.dateText(date))}</span>` : ''}`;
    const cards = el.querySelector('.screen-roster');
    cards.innerHTML = roster.join('');
    cards.hidden = !roster.length;
    const order = el.querySelector('.screen-initiative');
    const previous = order.querySelector('[aria-current]')?.textContent;
    order.innerHTML = initiative.join('');
    order.hidden = !initiative.length;
    const active = order.querySelector('[aria-current]');
    if (active && active.textContent !== previous) active.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  function topBar() {
    const m = currentMap(),
      live = m && m.id === activeId();
    const back = S.isDM ? `./dm.html#${encodeURIComponent(S.id)}` : './#table';
    $('#board-top').classList.toggle('board-top-compact', playerView() && !TV);
    if (playerView() && !TV) {
      const follow = S.follow ? 'Dejar de seguir al DM' : 'Seguir al DM';
      $('#board-top').innerHTML =
        `${STANDALONE ? `<a class="icon-btn" href="${back}" aria-label="Volver">←</a>` : '<button type="button" class="icon-btn" data-action="bd-close" aria-label="Cerrar el tablero">←</button>'}<div class="board-title"><b>${esc(m?.name || 'Esperando al DM')}</b></div><span id="board-hover-name" hidden></span><div class="board-top-actions"><button type="button" class="icon-btn" data-action="bd-follow" aria-label="${follow}" aria-pressed="${S.follow}" title="${follow}">◎</button>${S.isDM ? button('Vista DM', 'as-player') : ''}${typeof Sound !== 'undefined' ? Sound.toggleHTML() : ''}<button type="button" class="icon-btn" data-action="bd-fit" aria-label="Centrar el mapa" title="Centrar el mapa">⤢</button></div>`;
      return;
    }
    if (PLAYER_SCREEN) {
      $('#board-top').innerHTML =
        `<div class="board-title"><b>${esc(S.party?.campaign.name || '')}</b><span>${esc(m?.name || 'Tablero')}</span></div><button type="button" class="icon-btn" data-action="bd-fullscreen" aria-label="Pantalla completa" title="Pantalla completa">⛶</button>`;
      return;
    }
    $('#board-top').innerHTML = TV
      ? `<span class="board-title">${esc(m?.name || 'Esperando un mapa…')}</span><button type="button" class="icon-btn" data-action="bd-fullscreen" title="Pantalla completa" aria-label="Pantalla completa">⛶</button>`
      : `${STANDALONE ? `<a class="icon-btn" href="${back}" aria-label="Volver" title="Volver">←</a>` : `<button type="button" class="icon-btn" data-action="bd-close" aria-label="Cerrar el tablero" title="Volver">←</button>`}<div class="board-title"><span class="eyebrow">${esc(S.party?.campaign.name || 'TABLERO')}</span><b>${esc(m?.name || (S.isDM ? 'Sin mapa' : 'Esperando al DM'))}</b>${S.isDM && m ? `<span class="tag ${live ? '' : 'warn'}">${live ? 'En la mesa' : 'Solo el DM'}</span>` : ''}</div><span id="board-hover-name" class="board-hover-name" hidden></span><div class="board-top-actions">${S.isDM ? (m && !live ? button('Mostrar a la mesa', 'go-live', '') : '') + button('Mapas', 'maps') + (m && dmView() ? button('Orientación', 'rotation-settings') : '') + button(S.asPlayer ? 'Vista DM' : 'Ver como jugador', 'as-player') + button('📺 Tele', 'tv') : button(S.follow ? 'Siguiendo al DM' : 'Seguir al DM', 'follow')}${typeof Sound !== 'undefined' ? Sound.toggleHTML() : ''}<button type="button" class="icon-btn" data-action="bd-fit" title="Ver todo el mapa" aria-label="Ver todo el mapa">⤢</button></div>`;
  }
  function tools() {
    if (TV) return ($('#board-tools').innerHTML = '');
    const t = (id, icon, label) =>
      `<button type="button" class="board-tool ${S.tool === id ? 'on' : ''}" data-action="bd-tool" data-tool="${id}" aria-pressed="${S.tool === id}"><span aria-hidden="true">${icon}</span>${label}</button>`;
    $('#board-tools').innerHTML =
      t('move', '✋', 'Mover') +
      t('ruler', '📏', 'Medir') +
      t('ping', '📍', 'Señalar') +
      (S.mapId
        ? t('area', '💥', 'Área') + (H.compactCast ? t('cast', '✦', 'Lanzar') : t('scene', '✦', 'Efectos'))
        : '') +
      (S.isDM && S.mapId && !S.asPlayer
        ? t('fog', '🌫', 'Niebla') +
          t('paint', '🧱', 'Terreno') +
          t('walls', '🚪', 'Paredes') +
          t('light', '💡', 'Luz') +
          (BP ? t('props', '🪑', 'Muebles') : '') +
          t('tokens', '♟', 'Fichas') +
          t('enc', '⚔', 'Encuentros')
        : '');
    if (H.compactCast)
      $('#board-tools').insertAdjacentHTML(
        'beforeend',
        button('⚙', 'cast-settings', 'secondary', 'aria-label="Ajustes del tablero"'),
      );
    if (H.compactCast && activeSpiritualWeapon())
      $('#board-tools').insertAdjacentHTML(
        'beforeend',
        button('Arma', 'weapon-swing', 'secondary', 'aria-label="Atacar con arma espiritual"'),
      );
    if (H.compactCast && activeGraspingVine())
      $('#board-tools').insertAdjacentHTML(
        'beforeend',
        button('Enredadera', 'vine-lash', 'secondary', 'aria-label="Azotar con la enredadera"'),
      );
    if (H.compactCast && activeDustDevil())
      $('#board-tools').insertAdjacentHTML(
        'beforeend',
        button('Remolino', 'dust-move', 'secondary', 'aria-label="Mover el remolino"'),
      );
    hint(
      {
        move: S.isDM
          ? 'Arrastrá cualquier ficha. Mantené apretado para señalar.'
          : 'Arrastrá tu ficha. Mantené apretado para señalar.',
        scene: 'Elegí un conjuro y tocá una casilla para lanzarlo. Arrastrá para mover la cámara.',
        ruler: 'Arrastrá para medir en pies.',
        ping: 'Tocá el mapa para señalar un lugar a todos.',
        area: 'Elegí forma y tamaño. Tocá para una esfera; arrastrá desde el origen para apuntar un cono, línea o cubo.',
        fog: 'Pintá para revelar u ocultar. «Sala» revela un cuarto entero hasta sus muros.',
        paint: 'Elegí un terreno y pintá. «Sala» traza muros alrededor y rellena el piso.',
        walls: wallHint(),
        light: lightHint(),
        props: 'Elegí una pieza y tocá el mapa para colocarla. Con «Mover», arrastrala; un toque la gira.',
        tokens: 'Tocá una ficha para editarla.',
        enc: S.group
          ? 'Arrastrá cualquier criatura del grupo: se mueven juntas.'
          : 'Colocá tus encuentros preparados. Arrastrá cada criatura o mové el grupo entero.',
      }[S.tool] || '',
    );
    if (S.multiSelect) {
      $('#board-tools').insertAdjacentHTML('beforeend', button('Terminar selección', 'selection-done'));
      hint('Tocá las fichas que querés girar juntas.');
    }
  }
  function panel() {
    const el = $('#board-panel');
    const chip = (action, value, label, on, extra = '') =>
      `<button type="button" class="chip ${on ? 'selected' : ''}" data-action="bd-${action}" data-v="${esc(value)}" aria-pressed="${on}" ${extra}>${label}</button>`;
    const sizes = [0, 1, 2, 3].map(r => chip('radius', r, ['1', '3', '5', '7'][r], S.radius === r)).join('');
    let html = '';
    if (S.tool === 'scene' && S.mapId && !TV && !H.compactCast) {
      if (H.cast) {
        const spells = H.spells();
        html = spells.length
          ? `<label class="field">Conjuro de tu ficha<select data-action="bd-sheet-spell">${spells.map(sp => `<option value="${esc(sp.id)}" ${sp.id === S.sheetSpell ? 'selected' : ''}>${esc(sp.name)}</option>`).join('')}</select></label>`
          : '<p>Tu ficha no tiene conjuros disponibles.</p>';
        if (activeSpiritualWeapon())
          html += button(weaponAim ? 'Cancelar ataque del arma' : 'Atacar con arma espiritual', 'weapon-swing');
        if (activeGraspingVine()) html += button(vineAim ? 'Cancelar azote' : 'Azotar con la enredadera', 'vine-lash');
        if (activeDustDevil()) html += button(dustAim ? 'Cancelar movimiento' : 'Remolino', 'dust-move');
      } else
        html = `<div class="chips"><span class="small">Conjuro</span>${Object.entries(BoardSceneFX.spells)
          .map(([id, label]) => chip('spell', id, label, S.spell === id))
          .join('')}</div>`;
      html += `<div class="board-row"><label class="check"><input type="checkbox" data-action="bd-fx-reduced" \${fxPrefs.reduced ? 'checked' : ''}>Efectos reducidos</label><label class="check"><input type="checkbox" data-action="bd-fx-shake" \${fxPrefs.shake ? 'checked' : ''}>Vibración leve</label></div>`;
      if (dmView())
        html += `<div class="chips"><span class="small">Clima</span>${Object.entries(BC.WEATHER)
          .map(([id, label]) => chip('weather', id, label, S.grid.weather === id))
          .join('')}</div>`;
    } else if (S.tool === 'fog' && S.isDM) {
      html = `<div class="board-row"><label class="check"><input type="checkbox" data-action="bd-fog-on" ${S.fogOn ? 'checked' : ''}>Niebla activa</label></div><div class="chips">${[
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
          `<button type="button" class="chip ${S.paintCode === t.code ? 'selected' : ''}" data-action="bd-paint-code" data-v="${esc(t.code)}"><i style="background:${t.color || 'transparent'}"></i>${esc(t.name)}</button>`,
      ).join('')}</div><div class="chips">${[
        ['brush', 'Pincel'],
        ['rect', 'Rectángulo'],
        ['room', 'Sala con muros'],
      ]
        .map(([v, l]) => chip('paint-mode', v, l, S.paintMode === v))
        .join(
          '',
        )}</div>${S.paintMode === 'brush' ? `<div class="chips"><span class="small muted">Pincel</span>${sizes}</div>` : ''}`;
    } else if (S.tool === 'light' && dmView()) {
      const v = S.grid.vision || {},
        zones = (S.ambient.match(/[bdn]/g) || []).length,
        feet = [...new Set(BC.LIGHTS.map(l => l[2]))];
      html = `<div class="chips">${[
        ['b', '☀ Iluminada'],
        ['d', '◐ Penumbra'],
        ['n', '● Oscura'],
        ['.', '🧽 Como el mapa'],
        ['place', '✦ Luz fija'],
        ['remove', '✕ Quitar luz'],
      ]
        .map(([m, l]) => chip('light-mode', m, l, S.lightMode === m))
        .join('')}</div>${
        S.lightMode === 'place'
          ? `<div class="chips"><span class="small muted">Radio</span>${feet
              .map(f => chip('light-feet', f, f + ' pies', S.lightFeet === f))
              .join('')}</div>`
          : ['place', 'remove'].includes(S.lightMode)
            ? ''
            : `<div class="chips"><span class="small muted">Pincel</span>${sizes}</div>`
      }<div class="actions">${zones ? button('Quitar todas las zonas', 'light-zones-clear', 'text-btn danger-text') : ''}${S.fixedLights.length ? button('Quitar las luces fijas', 'light-fixed-clear', 'text-btn danger-text') : ''}</div><p class="small muted">${zones} ${zones === 1 ? 'casilla pintada' : 'casillas pintadas'} · ${S.fixedLights.length} ${S.fixedLights.length === 1 ? 'luz fija' : 'luces fijas'}. ${v.dark ? 'El mapa está a oscuras: lo que no pintes queda oscuro.' : 'El mapa está iluminado: pintá en penumbra u oscuro lo que no tenga luz (una cueva, un sótano).'} Las luces fijas son invisibles (lámparas del dibujo); las importadas de Dungeondraft aparecen acá.${v.los ? '' : ' <b>Para que cuente, activá la línea de visión en Mapas → Ajustes.</b>'}</p>`;
    } else if (S.tool === 'walls' && dmView()) {
      const doors = S.walls.filter(BC.isWallDoor).length;
      html = `<div class="chips">${[
        ['wall', '━ Pared'],
        ['door', '🚪 Puerta'],
        ['window', '▭ Ventana'],
        ['edit', '✎ Cambiar tipo'],
        ['erase', '🧽 Borrar'],
      ]
        .map(([v, l]) => chip('wall-mode', v, l, S.wallMode === v))
        .join(
          '',
        )}</div><div class="board-row"><label class="check"><input type="checkbox" data-action="bd-wall-snap" ${S.wallSnap ? 'checked' : ''}>Apoyar en las esquinas de la cuadrícula</label><label class="check"><input type="checkbox" data-action="bd-walls" ${S.showWalls ? 'checked' : ''}>Verlas también con las otras herramientas</label></div><div class="actions">${S.wallChain ? button('Terminar trazo', 'wall-end') : ''}${S.wallUndo.some(u => u.map === S.mapId) ? button('Deshacer', 'wall-undo', 'secondary') : ''}${S.walls.length ? button('Borrar todas', 'wall-clear', 'text-btn danger-text') : ''}</div><p class="small muted">${S.walls.length} ${S.walls.length === 1 ? 'tramo' : 'tramos'}${doors ? ` · ${doors} ${doors === 1 ? 'puerta' : 'puertas'}` : ''}. Las paredes y las puertas cerradas tapan la vista y el paso; las ventanas dejan ver pero no pasar. Una puerta o ventana dibujada encima de una pared la corta. Los jugadores solo ven las puertas, y las abren tocándolas desde al lado.</p>`;
    } else if (S.tool === 'props' && S.isDM && BP) {
      const pick = (v, label, extra = '') =>
        `<button type="button" class="chip ${S.propId === v ? 'selected' : ''}" data-action="bd-prop" data-v="${esc(v)}" aria-pressed="${S.propId === v}" ${extra}>${label}</button>`;
      html = `<div class="chips">${pick('move', '✋ Mover y girar')}${pick('erase', '🧽 Borrar')}<button type="button" class="chip" data-action="bd-prop-rot" title="Girar la pieza elegida">⟳ Girar${S.propRot ? ' · ' + S.propRot * 90 + '°' : ''}</button></div><div class="chips">${BP.GROUPS.map(([id, name]) => chip('prop-group', id, esc(name), S.propGroup === id)).join('')}</div><div class="prop-grid">${BP.CATALOG.filter(
        p => p.group === S.propGroup,
      )
        .map(
          p =>
            `<button type="button" class="prop-pick ${S.propId === p.id ? 'selected' : ''}" data-action="bd-prop" data-v="${esc(p.id)}" aria-pressed="${S.propId === p.id}" title="${esc(p.name)}${p.light ? ' · da luz' : ''}"><canvas data-prop="${esc(p.id)}"></canvas><span>${esc(p.name)}${p.light ? ' ✦' : ''}</span></button>`,
        )
        .join(
          '',
        )}</div><p class="small muted">${S.props.length} ${S.props.length === 1 ? 'pieza' : 'piezas'} en este mapa. Las marcadas con ✦ dan luz.${S.props.length ? ` <button type="button" class="chip" data-action="bd-prop-clear">Quitar todas</button>` : ''}</p>`;
    } else if (S.tool === 'tokens' && S.isDM) {
      const list = mapTokens().sort((a, b) => a.name.localeCompare(b.name, 'es'));
      html = `<div class="actions">${button('+ Criatura', 'token-new', '', 'data-kind="monster"')}${button('+ PNJ', 'token-new', 'secondary', 'data-kind="npc"')}${button('+ Objeto', 'token-new', 'secondary', 'data-kind="object"')}${button('+ Antorcha', 'light-new', 'secondary', 'data-light="torch"')}${button('+ Farol', 'light-new', 'secondary', 'data-light="lantern"')}${button('+ Fogata', 'light-new', 'secondary', 'data-light="campfire"')}${S.mapId === activeId() ? button('Traer a la party', 'ensure') : ''}</div><div class="board-token-list">${
        list
          .map(
            t =>
              `<button type="button" class="board-token-row ${S.sel === t.id ? 'on' : ''}" data-action="bd-select" data-id="${t.id}"><i style="background:${esc(t.color || '#888')}">${esc(t.label)}</i><span>${esc(t.name)}</span>${t.hidden ? '<small>oculta</small>' : ''}</button>`,
          )
          .join('') || '<p class="small muted">Sin fichas en este mapa.</p>'
      }</div>`;
    }
    if (S.tool === 'area') {
      const mine = S.templates.filter(t => t.by === whoAmI().by).length;
      html = `<div class="chips">${Object.entries(BC.SHAPES)
        .map(([v, l]) => chip('area-kind', v, l, S.area.kind === v))
        .join(
          '',
        )}</div><div class="chips"><span class="small muted">${S.area.kind === 'circle' ? 'Radio' : S.area.kind === 'cube' ? 'Lado' : 'Largo'} (pies)</span>${[
        5, 10, 15, 20, 30, 40, 60, 90, 120,
      ]
        .map(n => chip('area-feet', n, n, S.area.feet === n))
        .join(
          '',
        )}</div>${S.area.kind === 'line' ? `<div class="chips"><span class="small muted">Ancho</span>${[5, 10, 15].map(n => chip('area-width', n, n, S.area.width === n)).join('')}</div>` : ''}<div class="actions">${mine ? button('Borrar las mías', 'area-clear') : ''}${S.isDM && !S.asPlayer && S.templates.length ? button('Borrar todas', 'area-clear', 'secondary', 'data-all="1"') : ''}</div>${
        S.templates.length
          ? `<p class="small muted">${S.templates
              .map(t => {
                const hit = BC.templateHits(
                  S.grid,
                  t,
                  visibleTokens().filter(k => k.kind !== 'object'),
                );
                return `${esc(BC.SHAPES[t.kind].split(' ')[0])} de ${t.feet} pies${t.name ? ' (' + esc(t.name) + ')' : ''}: ${hit.length ? esc(hit.map(k => k.name).join(', ')) : 'nadie'}`;
              })
              .join('<br>')}</p>`
          : ''
      }`;
    }
    if (S.tool === 'enc' && S.isDM) html = encounterPanel();
    el.hidden = !html;
    // Plegable: el panel no tapa el mapa mientras pintás.
    const title =
      {
        fog: 'Niebla',
        paint: 'Terreno',
        props: 'Muebles',
        tokens: 'Fichas',
        enc: 'Encuentros preparados',
        area: 'Área de efecto',
        scene: 'Efectos del mapa',
      }[S.tool] || '';
    el.classList.toggle('min', S.panelMin);
    el.innerHTML = html
      ? `<div class="board-panel-head"><b>${title}</b><button type="button" class="icon-btn" data-action="bd-panel-min" aria-expanded="${!S.panelMin}" aria-label="${S.panelMin ? 'Mostrar opciones' : 'Plegar opciones'}">${S.panelMin ? '▴' : '▾'}</button></div>${S.panelMin ? '' : html}`
      : '';
    if (BP) el.querySelectorAll('canvas[data-prop]').forEach(cv => BP.thumb(cv, cv.dataset.prop));
  }
  function card() {
    const el = $('#board-card'),
      t = S.tokens.find(x => x.id === S.sel && x.map_id === S.mapId);
    if (!t || TV || (playerView() && !visibleTokens().some(x => x.id === t.id))) {
      el.hidden = true;
      return;
    }
    if (el.hidden || el.dataset.token !== t.id) el.setAttribute('data-offscreen', '');
    el.dataset.token = t.id;
    const d = info(t),
      dm = dmView();
    const attrs = `data-id="${esc(t.id)}"`;
    const light = tokenLight(t);
    const selectionCount = rotationGroup().length;
    const actions = [
      H.compactCast && mine(t) && button('Lanzar', 'cast-picker'),
      canMove(t) &&
        t.kind !== 'object' &&
        button('Altura', 'token-elev', 'secondary', `${attrs} title="Altura: ${Number(t.elev) || 0} pies"`),
      (dm || (t.kind === 'pc' && canMove(t))) &&
        button('Luz', 'token-light', 'secondary', `${attrs} title="Luz: ${light || 0} pies"`),
      dm && button(t.hidden ? 'Mostrar' : 'Ocultar', 'token-hide', 'secondary', attrs),
      dm && button('Editar', 'token-edit', 'secondary', attrs),
      selectionCount && button('Girar', 'token-rotate', 'secondary', attrs),
      dm && button('Quitar', 'token-remove', 'danger', attrs),
    ]
      .filter(Boolean)
      .join('');
    el.hidden = false;
    el.innerHTML = `<div class="board-card-head"><i style="background:${esc(t.color || '#888')}">${esc(t.label)}</i><div><b>${esc(d.name || displayTokenName(t, creatureFor(t, d)))}</b><p class="small muted">${t.stage?.startsWith('enc:') && !t.combatant_id ? 'Preparada · ' + esc(prepared().find(e => t.stage.startsWith('enc:' + e.id + ':'))?.name || 'encuentro') + ' · ' : ''}${{ pc: 'Personaje', monster: 'Criatura', npc: 'PNJ', object: 'Objeto' }[t.kind]}${d.status ? ' · ' + esc(d.status) : ''}${selectionCount > 1 ? ` · ${selectionCount} seleccionadas` : ''}${d.conditions.length ? ' · ' + esc(d.conditions.join(', ')) : ''}</p>${t.id === S.target ? `<p class="small board-target-line">🎯 ${targetLine(combatContext())}</p>` : ''}</div><button type="button" class="icon-btn" data-action="bd-deselect" aria-label="Cerrar">×</button></div>${actions ? `<div class="board-card-actions">${actions}</div>` : ''}`;
  }
  // Puertas dibujadas cerca de la ficha elegida, en píxeles del lienzo: la tarjeta no las tapa, así se pueden tocar.
  function cardDoorBoxes(t) {
    const c = cellPx(),
      o = origin(),
      { s, x, y } = S.view,
      half = BC.tokenSpan(t) / 2,
      cx = t.x + half,
      cy = t.y + half,
      pad = 14,
      px = v => (o.x + v * c) * s + x,
      py = v => (o.y + v * c) * s + y,
      box = (x0, y0, x1, y1) => ({
        left: Math.min(px(x0), px(x1)) - pad,
        right: Math.max(px(x0), px(x1)) + pad,
        top: Math.min(py(y0), py(y1)) - pad,
        bottom: Math.max(py(y0), py(y1)) + pad,
      });
    const out = S.walls
      .filter(w => BC.isWallDoor(w) && BC.wallDistance(w, cx, cy) < half + 3)
      .map(w => box(w[0], w[1], w[2], w[3]));
    // Puertas pintadas en el terreno (una casilla cada una).
    for (let yy = Math.floor(cy - half - 3); yy <= Math.ceil(cy + half + 3); yy++)
      for (let xx = Math.floor(cx - half - 3); xx <= Math.ceil(cx + half + 3); xx++)
        if (BC.inside(S.grid, xx, yy) && BC.isDoor(BC.at(S.grid, S.terrain, xx, yy)))
          out.push(box(xx, yy, xx + 1, yy + 1));
    return out;
  }
  function positionCard(pieces) {
    const el = $('#board-card');
    if (el.hidden) return;
    const selected = pieces.find(({ t }) => t.id === S.sel);
    const visible = !!selected && !S.multiSelect && !S.aimFacing;
    el.toggleAttribute('data-offscreen', !visible);
    if (!visible) return;
    const { s, x, y } = S.view;
    const { clientWidth: width, clientHeight: height } = canvas;
    const w = el.offsetWidth,
      h = el.offsetHeight;
    const b = selected.bounds,
      f = selected.foot;
    const sprite = { left: b.x * s + x, right: (b.x + b.w) * s + x, top: b.y * s + y, bottom: (b.y + b.h) * s + y };
    const fx = f.x * s + x,
      fy = f.y * s + y;
    if (sprite.right < 0 || sprite.left > width || sprite.bottom < 0 || sprite.top > height) {
      el.setAttribute('data-offscreen', '');
      return;
    }
    const gap = 10,
      margin = 8;
    const candidates = [
      ['right', sprite.right + gap, fy - h / 2, width - sprite.right - gap - w],
      ['left', sprite.left - gap - w, fy - h / 2, sprite.left - gap - w],
      ['top', fx - w / 2, sprite.top - gap - h, sprite.top - gap - h],
      ['bottom', fx - w / 2, sprite.bottom + gap, height - sprite.bottom - gap - h],
    ];
    const stage = canvas.getBoundingClientRect();
    const blockers = ['#board-panel', '#board-turn'].flatMap(selector => {
      const node = $(selector);
      if (!node || node.hidden) return [];
      const r = node.getBoundingClientRect();
      return [
        {
          left: r.left - stage.left,
          right: r.right - stage.left,
          top: r.top - stage.top,
          bottom: r.bottom - stage.top,
        },
      ];
    });
    const neighbors = pieces
      .filter(p => p !== selected)
      .map(({ foot }) => {
        const r = (foot.diameter * s) / 2;
        const cx = foot.x * s + x,
          cy = foot.y * s + y;
        return { left: cx - r, right: cx + r, top: cy - r, bottom: cy + r };
      });
    const doors = cardDoorBoxes(selected.t);
    const overlap = (left, top, box) =>
      Math.max(0, Math.min(left + w, box.right) - Math.max(left, box.left)) *
      Math.max(0, Math.min(top + h, box.bottom) - Math.max(top, box.top));
    const ranked = candidates.map(([side, left, top, room]) => {
      left = Math.round(Math.max(margin, Math.min(width - w - margin, left)));
      top = Math.round(Math.max(margin, Math.min(height - h - margin, top)));
      const crowding = blockers.reduce((area, box) => area + overlap(left, top, box), 0);
      const occupied = neighbors.reduce((area, box) => area + overlap(left, top, box), 0);
      const covered = doors.reduce((area, box) => area + overlap(left, top, box), 0);
      const score =
        room -
        (overlap(left, top, sprite) * 3000 + crowding * 2800 + occupied * 700 + covered * 6000) / Math.max(1, w * h);
      return { side, left, top, score };
    });
    const { side, left, top } = ranked.sort((a, b) => b.score - a.score)[0];
    el.dataset.side = side;
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  }
  function turn() {
    const el = $('#board-turn'),
      enc = S.party?.encounter;
    const cur = enc?.active ? (S.party.combatants || []).find(c => c.id === enc.current_id) : null;
    const visible =
      cur &&
      (!playerView() ||
        (!cur.hidden &&
          visibleTokens().some(
            t => t.combatant_id === cur.id || (cur.character_id && t.character_id === cur.character_id),
          )));
    el.hidden = !visible;
    el.innerHTML = visible ? `Ronda ${enc.round} · turno de <b>${esc(cur.name)}</b>` : '';
  }

  // ---------- Acciones ----------
  document.addEventListener('click', async e => {
    const el = e.target.closest('[data-action^="bd-"]');
    if (!el || ['INPUT', 'SELECT'].includes(el.tagName)) return;
    const a = el.dataset.action.slice(3);
    try {
      if (a === 'close') return close();
      if (a === 'cast-picker' || (a === 'tool' && el.dataset.tool === 'cast')) {
        if (!quickPick?.swiped) casting?.begin();
        return;
      }
      if (a === 'cast-settings')
        return modal(
          'Ajustes del tablero',
          `<label class="check"><input type="checkbox" data-action="bd-fx-reduced" ${fxPrefs.reduced ? 'checked' : ''}>Efectos reducidos</label><label class="check"><input type="checkbox" data-action="bd-fx-shake" ${fxPrefs.shake ? 'checked' : ''}>Vibración leve</label><label class="check"><input type="checkbox" data-action="bd-fx-pixel" ${fxPrefs.pixelMinis ? 'checked' : ''}>Figuras pixeladas</label><label class="field">Segundos para reaccionar<input type="number" min="3" max="60" data-action="bd-reaction-seconds" value="${reactionSeconds()}"></label>`,
          null,
        );
      if (a === 'dock-min') S.dockMin = !S.dockMin;
      else if (a === 'untarget') setTarget(null);
      else if (a === 'disengage') {
        const t = actor();
        if (t?.combatant_id)
          S.disengaged.has(t.combatant_id) ? S.disengaged.delete(t.combatant_id) : S.disengaged.add(t.combatant_id);
      } else if (a === 'tool') {
        S.tool = el.dataset.tool;
        Object.assign(S, { wallChain: null, wallDraw: null, wallHover: -1, wallAim: null });
        if (canvas) canvas.style.cursor = 'default';
        if (S.tool !== 'tokens') S.sel = S.sel && S.tool === 'move' ? S.sel : null;
        if (S.tool === 'enc') await refreshPrepared();
      } else if (a === 'fit') fit();
      else if (a === 'panel-min') S.panelMin = !S.panelMin;
      else if (a === 'enc-place') return await placeEncounterDialog(el.dataset.id);
      else if (a === 'enc-remove') await removeEncounter(el.dataset.id);
      else if (a === 'enc-group') S.group = S.group === el.dataset.id ? null : el.dataset.id;
      else if (a === 'enc-show') showGroup(el.dataset.id);
      else if (a === 'fullscreen') document.documentElement.requestFullscreen?.();
      else if (a === 'follow') S.follow = !S.follow;
      else if (a === 'as-player') S.asPlayer = !S.asPlayer;
      else if (a === 'maps') {
        await reload();
        return mapsDialog();
      } else if (a === 'tv') return tvDialog();
      else if (a === 'go-live') await goLive(S.mapId);
      else if (a === 'spell' && !TV && Object.hasOwn(BoardSceneFX.spells, el.dataset.v)) S.spell = el.dataset.v;
      else if (a === 'dust-move' && H.cast) {
        dustAim = dustAim ? null : activeDustDevil()?.castId || null;
        vineAim = weaponAim = null;
        if (H.compactCast) S.tool = dustAim ? 'scene' : 'move';
        S.spellAim = null;
        panel();
        hint(dustAim ? 'Tocá una casilla libre a 30 pies o menos del remolino.' : '');
        return;
      } else if (a === 'vine-lash' && H.cast) {
        dustAim = null;
        vineAim = vineAim ? null : activeGraspingVine()?.castId || null;
        weaponAim = null;
        if (H.compactCast) S.tool = vineAim ? 'scene' : 'move';
        S.spellAim = null;
        panel();
        hint(vineAim ? 'Elegí una criatura a 30 pies o menos de la enredadera.' : '');
        return;
      } else if (a === 'weapon-swing' && H.cast) {
        dustAim = null;
        vineAim = null;
        weaponAim = weaponAim ? null : activeSpiritualWeapon()?.castId || null;
        if (H.compactCast) S.tool = weaponAim ? 'scene' : 'move';
        S.spellAim = null;
        panel();
        hint(weaponAim ? 'Elegí una criatura a 5 pies del arma espiritual.' : '');
        return;
      } else if (a === 'weather' && dmView() && S.mapId && Object.hasOwn(BC.WEATHER, el.dataset.v)) {
        S.grid.weather = el.dataset.v;
        saveSoon({ grid: { ...currentMap()?.grid, weather: S.grid.weather } });
      } else if (a === 'area-kind') S.area.kind = el.dataset.v;
      else if (a === 'area-feet') S.area.feet = Number(el.dataset.v);
      else if (a === 'area-width') S.area.width = Number(el.dataset.v);
      else if (a === 'area-clear') clearTemplates(!!el.dataset.all);
      else if (a === 'token-elev') return elevDialog(S.tokens.find(t => t.id === el.dataset.id));
      else if (a === 'fog-mode') S.fogMode = el.dataset.v;
      else if (a === 'radius') S.radius = Number(el.dataset.v);
      else if (a === 'fog-all' || a === 'fog-none') {
        S.fog = BC.fogAll(S.grid, a === 'fog-all');
        saveSoon(fogPatch());
      } else if (a === 'prop') S.propId = el.dataset.v;
      else if (a === 'prop-group') S.propGroup = el.dataset.v;
      else if (a === 'prop-rot') S.propRot = (S.propRot + 1) & 3;
      else if (a === 'prop-clear') {
        if (!confirm('¿Quitar todos los muebles de este mapa?')) return;
        S.props = [];
        saveSoon(terrainPatch());
      } else if (a === 'wall-mode') {
        S.wallMode = el.dataset.v;
        Object.assign(S, { wallChain: null, wallDraw: null, wallHover: -1 });
        hint(wallHint());
      } else if (a === 'light-mode') {
        S.lightMode = el.dataset.v;
        hint(lightHint());
      } else if (a === 'light-feet') S.lightFeet = Number(el.dataset.v) || 40;
      else if (a === 'light-zones-clear') {
        if (!confirm('¿Quitar todas las zonas de luz pintadas en este mapa?')) return;
        S.ambient = BC.ambientCells(S.grid, '');
        saveSoon(terrainPatch());
      } else if (a === 'light-fixed-clear') {
        if (!confirm(`¿Quitar las ${S.fixedLights.length} luces fijas de este mapa?`)) return;
        S.fixedLights = [];
        saveSoon(terrainPatch());
      } else if (a === 'wall-end') endWallChain();
      else if (a === 'wall-undo') undoWalls();
      else if (a === 'wall-clear') {
        if (!confirm(`¿Borrar las ${S.walls.length} paredes, puertas y ventanas de este mapa?`)) return;
        changeWalls([]);
      } else if (a === 'paint-code') S.paintCode = el.dataset.v;
      else if (a === 'paint-mode') S.paintMode = el.dataset.v;
      else if (a === 'select') tapToken(el.dataset.id);
      else if (a === 'deselect') {
        S.sel = null;
        S.selected.clear();
        S.multiSelect = false;
      } else if (a === 'token-rotate') return rotationDialog();
      else if (a === 'selection-done') S.multiSelect = false;
      else if (a === 'rotation-settings') return rotationSettings();
      else if (a === 'ensure') await ensureTokens();
      else if (a === 'token-new') return tokenDialog(null, el.dataset.kind);
      else if (a === 'light-new') await addLight(el.dataset.light);
      else if (a === 'token-light') return lightDialog(S.tokens.find(t => t.id === el.dataset.id));
      else if (a === 'token-edit') return tokenDialog(S.tokens.find(t => t.id === el.dataset.id));
      else if (a === 'token-hide') {
        const t = S.tokens.find(x => x.id === el.dataset.id);
        await patchToken(t, { hidden: !t.hidden });
        S.channel?.send({ t: 'refresh' });
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
      else if (a === 'map-gen') {
        await refreshPrepared();
        return genDialog();
      } else if (a === 'map-edit') {
        // Lo recién pintado o dibujado se guarda antes, para que los ajustes no lo pisen.
        await flushSave();
        return mapEditDialog(S.maps.find(m => m.id === el.dataset.id));
      } else if (a === 'map-delete') {
        const m = S.maps.find(x => x.id === el.dataset.id);
        if (!confirm(`¿Eliminar el mapa «${m.name}»? Se borran su imagen, su niebla y sus fichas.`)) return;
        await Cloud.deleteMap(m.id, m.image_path);
        delete S.pending[m.id];
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
      toast(
        /stage/.test(err.message)
          ? 'Falta ejecutar supabase/migrations/010_board_staging.sql en Supabase.'
          : err.message,
      );
    }
    ui();
  });
  document.addEventListener('change', e => {
    const a = e.target.dataset?.action;
    if (a === 'bd-sheet-spell' && H.spells) {
      S.sheetSpell = e.target.value;
      globalThis.BoardInk?.prepare(S.sheetSpell, Spells.kindFor(S.sheetSpell));
      if (S.spellAim) setSpellAim(S.spellAim.world);
    } else if (a === 'bd-reaction-seconds') {
      fxPrefs.reactionSeconds = Number(e.target.value);
      localStorage.setItem('dnd-board-spell-effects', JSON.stringify(fxPrefs));
    } else if (a === 'bd-fx-reduced' || a === 'bd-fx-shake' || a === 'bd-fx-pixel') {
      fxPrefs[{ 'bd-fx-reduced': 'reduced', 'bd-fx-shake': 'shake', 'bd-fx-pixel': 'pixelMinis' }[a]] =
        e.target.checked;
      try {
        localStorage.setItem('dnd-board-spell-effects', JSON.stringify(fxPrefs));
      } catch {}
      if (a === 'bd-fx-pixel') loadMiniPack();
      S.dirty = true;
    } else if (a === 'bd-fog-on') {
      S.fogOn = e.target.checked;
      saveSoon(fogPatch());
      ui();
    } else if (a === 'bd-walls') {
      S.showWalls = e.target.checked;
      S.dirty = true;
    } else if (a === 'bd-wall-snap') S.wallSnap = e.target.checked;
  });
  async function patchToken(t, patch) {
    const rows = await Cloud.updateToken(t.id, patch);
    if (!rows.length) throw Error('No se pudo actualizar esa ficha.');
    S.tokens = S.tokens.map(x => (x.id === t.id ? sizedToken(rows[0]) : x));
    if (dmView() && t.combatant_id && Object.hasOwn(patch, 'hidden')) {
      if (!(await Cloud.hiddenTurnsReady())) {
        toast('La ficha del mapa se actualizó. La iniciativa necesita la actualización de privacidad de tu mesa.');
        return;
      }
      await Cloud.updateCombatant(t.combatant_id, { hidden: patch.hidden });
      const actor = S.party?.combatants.find(c => c.id === t.combatant_id);
      if (actor) actor.hidden = patch.hidden;
      lastHidden.set(t.combatant_id, patch.hidden);
    }
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
      `<p class="small">Los mapas se guardan en esta mesa. Los jugadores solo ven el que está <b>en la mesa</b>.</p><div class="board-maps">${
        S.maps
          .map(
            m =>
              `<div class="board-map-row ${m.id === S.mapId ? 'on' : ''}"><div><b>${esc(m.name)}</b><p class="small muted">${m.image_path ? 'Imagen' : 'Terreno'} · ${BC.normGrid(m.grid).cols}×${BC.normGrid(m.grid).rows} casillas${m.fog?.on ? ' · niebla' : ''}</p></div>${m.id === live ? '<span class="tag">En la mesa</span>' : ''}<div class="actions">${button('Abrir', 'map-open', 'secondary', `data-id="${m.id}"`)}${m.id === live ? '' : button('Mostrar a la mesa', 'map-live', '', `data-id="${m.id}"`)}${button('Ajustes', 'map-edit', 'secondary', `data-id="${m.id}"`)}${button('Eliminar', 'map-delete', 'text-btn danger-text', `data-id="${m.id}"`)}</div></div>`,
          )
          .join('') || '<p class="muted">Todavía no hay mapas.</p>'
      }</div><div class="actions">${button('+ Nuevo mapa', 'map-new', '')}${globalThis.BoardGen ? button('🎲 Generar mapa', 'map-gen', 'secondary') : ''}</div>`,
    );
  }
  function tvDialog() {
    const url = new URL('./board.html', location.href).href.split('#')[0] + '?tv=1#' + encodeURIComponent(S.id);
    modal(
      'Tablero en la tele',
      `<ol class="small"><li>En el navegador de la tele (o una compu conectada), abrí este enlace.</li><li>Si no entró nunca a la mesa, pide el código <b class="table-code">${esc(S.party.campaign.code)}</b>: se suma como una pantalla más, sin ficha.</li><li>La tele muestra la vista de los jugadores: con niebla y sin fichas ocultas. Tocá ⛶ para pantalla completa.</li></ol><p><code class="board-url">${esc(url)}</code></p><div class="actions">${button('Copiar enlace', 'copy-tv', '', `data-url="${esc(url)}"`)}<a class="button secondary" href="${esc(url)}" target="_blank" rel="noopener">Abrir acá</a>${button('Enviar mi vista a la tele', 'send-view')}</div><p class="small muted">«Enviar mi vista» encuadra la tele (y a quien siga al DM) en la zona que estás viendo.</p>`,
    );
  }

  // ---------- Encuentros preparados sobre el mapa ----------
  // Se arman en la pantalla del DM. Acá se colocan como fichas ocultas marcadas
  // «enc:<encuentro>:<criatura>»; al lanzarlos, cada criatura del combate ocupa su ficha y aparece donde quedó.
  function prepared() {
    if (!S.isDM || TV) return [];
    return typeof Encounters === 'undefined' ? S.prepared : Encounters.list(S.id);
  }
  const groupTokens = (encId, map = S.mapId) =>
    S.tokens.filter(k => k.map_id === map && String(k.stage || '').startsWith('enc:' + encId + ':'));
  function encounterPanel() {
    const list = prepared();
    if (!list.length)
      return '<p class="small">Todavía no hay encuentros preparados en esta mesa. Armalos en la pantalla del DM y volvé acá para colocarlos.</p>';
    return `<p class="small muted">Las criaturas quedan ocultas hasta que lanzás el encuentro desde la pantalla del DM: ahí aparecen donde las dejaste.</p><div class="board-enc-list">${list
      .map(e => {
        const here = groupTokens(e.id),
          elsewhere = [
            ...new Set(
              S.tokens
                .filter(k => String(k.stage || '').startsWith('enc:' + e.id + ':') && k.map_id !== S.mapId)
                .map(k => k.map_id),
            ),
          ],
          other = S.maps.find(m => m.id === elsewhere[0])?.name,
          live = here.filter(k => k.combatant_id).length,
          missing = (e.monsters || []).filter(
            m => m.uid && !here.some(k => k.stage === 'enc:' + e.id + ':' + m.uid),
          ).length;
        const where = here.length
          ? `Colocado en este mapa${here.length < (e.monsters || []).length ? ' (' + here.length + ')' : ''}${live ? ' · ' + live + ' en combate' : ''}`
          : other
            ? 'Colocado en «' + esc(other) + '»'
            : 'Sin colocar';
        return `<div class="board-enc ${S.group === e.id ? 'on' : ''}"><div><b>${esc(e.name)}</b><p class="small muted">${(e.monsters || []).length} criatura${(e.monsters || []).length === 1 ? '' : 's'} · ${where}</p></div><div class="actions">${
          !here.length || missing
            ? button(
                here.length ? 'Colocar las que faltan' : other ? 'Traer a este mapa' : 'Colocar acá',
                'enc-place',
                '',
                `data-id="${esc(e.id)}"`,
              )
            : ''
        }${here.length ? button(S.group === e.id ? 'Mover de a una' : 'Mover juntas', 'enc-group', 'secondary', `data-id="${esc(e.id)}"`) + button('Ver', 'enc-show', 'secondary', `data-id="${esc(e.id)}"`) + button('Quitar', 'enc-remove', 'text-btn danger-text', `data-id="${esc(e.id)}"`) : ''}</div></div>`;
      })
      .join('')}</div>`;
  }
  const footprintNames = {
    tiny: 'Diminuto · ½ casilla',
    small: 'Pequeño · 1 casilla',
    medium: 'Mediano · 1 casilla',
    large: 'Grande · 2 × 2',
    huge: 'Enorme · 3 × 3',
    gargantuan: 'Gargantuesco · 4 × 4',
  };
  function variantOptions(model) {
    if (!model) return '';
    const forms = CreatureMiniatures.forms(model.id);
    if (!forms.length) return '';
    const option = (value, label, size) =>
      `<option value="${esc(value)}" ${value === (model.age || model.variant || '') ? 'selected' : ''}>${esc(label)} · ${footprintNames[size]}</option>`;
    const base = CreatureMiniatures.metadata(model.id, { base: true });
    return (
      (forms.some(f => f.age) ? '' : option('', base.name, base.size)) +
      forms.map(f => option(f.age || f.variant, f.label, f.size)).join('')
    );
  }
  async function placeEncounterDialog(encId) {
    const enc = prepared().find(e => e.id === encId);
    const prefix = `enc:${encId}:`;
    const here = new Set(groupTokens(encId).map(k => k.stage));
    const selections = (enc?.monsters || [])
      .filter(m => !here.has(prefix + m.uid))
      .map(m => {
        const prior = S.tokens.find(k => k.stage === prefix + m.uid);
        return { m, options: variantOptions(prior ? creatureFor(prior) : CreatureMiniatures.selection(m.name)) };
      })
      .filter(r => r.options);
    if (!selections.length) {
      await placeEncounter(encId);
      return ui();
    }
    modal(
      'Variantes del encuentro',
      selections
        .map(
          ({ m, options }) =>
            `<label class="field">${esc(m.name)}<select name="${esc(m.uid)}">${options}</select></label>`,
        )
        .join(''),
      async fd => {
        await placeEncounter(encId, fd);
        ui();
      },
      'Colocar',
    );
  }
  async function placeEncounter(encId, variants = new FormData()) {
    const enc = prepared().find(e => e.id === encId);
    if (!enc?.monsters?.length) throw Error('Ese encuentro no tiene criaturas.');
    if (enc.monsters.some(m => !m.uid))
      throw Error('Abrí la pantalla del DM una vez para actualizar este encuentro y volvé a intentar.');
    // Si estaba en otro mapa, se trae (las fichas preparadas viven en un solo mapa).
    const away = S.tokens.filter(k => String(k.stage || '').startsWith('enc:' + encId + ':') && k.map_id !== S.mapId);
    const here = groupTokens(encId);
    const r = canvas.getBoundingClientRect(),
      center = toCell(toWorld(r.width / 2, r.height / 2));
    // Numeración por nombre, como al lanzar: «Goblin 1», «Goblin 2»…
    const count = {},
      total = {};
    for (const m of enc.monsters) total[m.name] = (total[m.name] || 0) + 1;
    const rows = [],
      transfers = [],
      planned = [];
    for (const m of enc.monsters) {
      count[m.name] = (count[m.name] || 0) + 1;
      const stage = 'enc:' + encId + ':' + m.uid;
      if (here.some(k => k.stage === stage)) continue;
      const name = total[m.name] > 1 ? m.name + ' ' + count[m.name] : m.name;
      const prior = away.find(k => k.stage === stage);
      const modelForm = variants.get(m.uid) ?? prior?.model_form;
      const model = CreatureMiniatures.selection(name, prior?.creature_model, modelForm, prior?.size);
      const size = propSizes[model?.size] || 1;
      const occupied = [...mapTokens(), ...planned].filter(k => k.kind !== 'object');
      const p = BC.freeSpot(S.grid, occupied, center, S.terrain, size);
      if (!BC.roomFor(S.grid, S.terrain, { ...p, size }, occupied))
        throw Error('No hay lugar en el mapa para ' + name + '.');
      const row = tokenRow(
        {
          kind: 'monster',
          name,
          hidden: true,
          stage,
          size,
          creature_model: prior?.creature_model,
          model_form: modelForm,
          show_hp: prior?.show_hp,
          ...p,
        },
        S.mapId,
      );
      planned.push(row);
      if (prior)
        transfers.push({
          prior,
          patch: { map_id: row.map_id, size, ...p, ...(modelForm != null && { model_form: modelForm }) },
        });
      else rows.push(row);
    }
    addLocal(await Cloud.addTokens(rows));
    for (const { prior, patch } of transfers) await patchToken(prior, patch);
    S.group = encId;
    toast(`«${enc.name}» colocado. Arrastralo junto o criatura por criatura.`);
  }
  async function removeEncounter(encId) {
    const list = groupTokens(encId);
    if (!confirm(`¿Quitar las ${list.length} criaturas preparadas de este mapa?`)) return;
    for (const k of list) await Cloud.removeToken(k.id);
    S.tokens = S.tokens.filter(k => !list.includes(k));
    if (S.group === encId) S.group = null;
  }
  function showGroup(encId) {
    const list = groupTokens(encId);
    if (!list.length) return;
    const c = cellPx(),
      o = origin(),
      x0 = Math.min(...list.map(k => k.x)) - 2,
      y0 = Math.min(...list.map(k => k.y)) - 2,
      x1 = Math.max(...list.map(k => k.x + (k.size || 1))) + 2,
      y1 = Math.max(...list.map(k => k.y + (k.size || 1))) + 2;
    fitRect(o.x + x0 * c, o.y + y0 * c, (x1 - x0) * c, (y1 - y0) * c);
    S.group = encId;
  }
  // Mover el grupo entero: todas las fichas se desplazan lo mismo y se guardan juntas.
  function overlapsPieces(a, others) {
    if (a.kind === 'object') return false;
    return others.some(b => a.id !== b.id && b.kind !== 'object' && BC.overlaps(a, b));
  }
  async function dropGroup(d, dx, dy) {
    const all = [d.token, ...d.group].map(k => S.tokens.find(x => x.id === k.id)).filter(Boolean);
    if (all.some(k => k.size !== 0.5)) {
      dx = Math.round(dx);
      dy = Math.round(dy);
    }
    const moved = all.map(k => ({ ...k, x: BC.snapToken(k.x + dx, k.size), y: BC.snapToken(k.y + dy, k.size) }));
    const other = visibleTokens().filter(t => !moved.some(k => k.id === t.id));
    if (
      moved.some((t, i) => {
        const size = BC.tokenSpan(t);
        return (
          t.x < 0 ||
          t.y < 0 ||
          t.x + size > S.grid.cols ||
          t.y + size > S.grid.rows ||
          overlapsPieces(t, other) ||
          (!d.free && !BC.roomFor(S.grid, S.terrain, t, [])) ||
          (!d.free && !!BC.wallOnPath(S.walls, BC.steps(all[i], t, Math.min(1, size)), size))
        );
      })
    ) {
      toast('El grupo no entra en esas casillas, o una pared le corta el camino.');
      return pick();
    }
    try {
      await applyPoses(
        moved.map((k, i) => ({ id: k.id, patch: movePose(all[i], k.x, k.y) })),
        {},
      );
      moved.forEach((k, i) => afterMove({ token: all[i], start: all[i], free: true }, k.x, k.y));
      queueEnemyFacing();
    } catch (e) {
      toast(e.message);
    }
    pick();
  }

  // ---------- Nuevos mapas ----------
  // Generador de mapas: elegir un tipo, ver la vista previa, volver a tirar y crear.
  const genState = { type: 'trail', size: 'medium', map: null, floors: 2, cellar: false, view: 0 };
  function genDialog() {
    const G = globalThis.BoardGen,
      encounters = prepared().filter(e => e.monsters?.length && e.monsters.every(x => x.uid)),
      roll = () =>
        (genState.map = G.generate(genState.type, {
          size: genState.size,
          floors: genState.floors,
          cellar: genState.cellar,
        })),
      chips = (name, list, cur) =>
        `<div class="chips gen-chips" role="radiogroup">${list
          .map(
            ([v, l, tip]) =>
              `<button type="button" class="chip ${v === cur ? 'selected' : ''}" data-gen-${name}="${esc(v)}" title="${esc(tip || '')}" role="radio" aria-checked="${v === cur}">${esc(l)}</button>`,
          )
          .join('')}</div>`;
    roll();
    modal(
      'Generar mapa',
      `<p class="small">Elegí un tipo de lugar y tirá hasta que te guste. El mapa queda como terreno pintado y amueblado: después lo podés retocar con «Terreno» y «Muebles».</p>${chips('type', G.TYPES, genState.type)}<p class="small muted" id="gen-about"></p>${chips(
        'size',
        Object.entries(G.SIZES).map(([k, v]) => [k, `${v[0]} · ${v[1]}×${v[2]}`]),
        genState.size,
      )}<div id="gen-multi" hidden><div class="chips gen-chips" role="radiogroup" aria-label="Pisos">${[1, 2, 3].map(n => `<button type="button" class="chip" data-gen-floors="${n}" role="radio">${n === 1 ? 'Solo planta baja' : n + ' pisos'}</button>`).join('')}<label class="check"><input type="checkbox" id="gen-cellar">Con sótano</label></div><p class="small muted">Cada piso se crea como un mapa aparte, unido a los demás por sus escaleras.</p></div><div class="actions">${button('🎲 Otra versión', 'gen-roll', 'secondary')}</div><div class="gen-preview"><canvas id="gen-canvas" aria-label="Vista previa del mapa"></canvas></div><div class="chips gen-chips" id="gen-floor-tabs" hidden></div>${field('Nombre', 'name', '', 'text', 'maxlength="100" required')}${
        encounters.length
          ? `<label class="field">Colocar un encuentro preparado<select name="enc"><option value="">Ninguno</option>${encounters
              .map(e => `<option value="${esc(e.id)}">${esc(e.name)} (${(e.monsters || []).length})</option>`)
              .join('')}</select></label>` +
            '<p class="small muted">Las criaturas quedan ocultas en el mapa nuevo hasta que lances el encuentro.</p>'
          : ''
      }`,
      async fd => {
        const m = genState.map,
          base = String(fd.get('name')).trim() || m.name,
          made = [];
        // Un mapa por piso; después se unen las escaleras con los mapas ya creados.
        for (const [i, f] of m.floors.entries()) {
          const grid = BC.normGrid({ cols: m.cols, rows: m.rows, size: CELL, ambient: f.ambient || '' });
          made.push(
            await Cloud.saveMap(S.id, {
              name: (m.floors.length > 1 ? `${base} · ${f.name}` : base).slice(0, 100),
              sort: S.maps.length + i,
              grid,
              terrain: { cells: BC.cells(grid, f.terrain), walls: [], props: f.props },
              fog: { on: false },
            }),
          );
        }
        if (m.floors.length > 1)
          for (const [i, f] of m.floors.entries()) {
            const links = Object.fromEntries(Object.entries(f.links).map(([k, to]) => [k, made[to].id]));
            made[i] = await Cloud.saveMap(S.id, { terrain: { ...made[i].terrain, links } }, made[i].id);
          }
        rememberMaps(made);
        await openMap(made[0].id);
        if (!activeId()) await goLive(made[0].id);
        const enc = String(fd.get('enc') || '');
        if (enc) {
          $('#modal').addEventListener('close', () => placeEncounterDialog(enc).catch(err => toast(err.message)), {
            once: true,
          });
          toast('Mapa generado.');
        } else
          toast(
            made.length > 1
              ? `Se crearon ${made.length} mapas, uno por piso. Tocá una escalera para pasar de uno a otro.`
              : 'Mapa generado. Retocalo con «Terreno» y «Muebles» si hace falta.',
          );
      },
      'Crear mapa',
    );
    const form = $('#dialog-form'),
      name = form.querySelector('[name=name]');
    let autoName = '';
    const show = () => {
      const m = genState.map,
        canvas = $('#gen-canvas'),
        tile = Math.max(8, Math.floor(640 / m.cols));
      canvas.width = m.cols * tile;
      canvas.height = m.rows * tile;
      const multi = G.MULTI?.[genState.type],
        floor = m.floors[Math.min(genState.view || 0, m.floors.length - 1)],
        c2 = canvas.getContext('2d');
      c2.fillStyle = '#0b1114';
      c2.fillRect(0, 0, canvas.width, canvas.height);
      globalThis.BoardArt?.paint(c2, BC.normGrid({ cols: m.cols, rows: m.rows }), floor.terrain, tile);
      BP?.paint(c2, floor.props, tile);
      $('#gen-multi').hidden = !multi;
      $('#gen-cellar').checked = Boolean(genState.cellar);
      form.querySelectorAll('[data-gen-floors]').forEach(b => {
        const on = Number(b.dataset.genFloors) === genState.floors;
        b.classList.toggle('selected', on);
        b.setAttribute('aria-checked', on);
      });
      const tabs = $('#gen-floor-tabs');
      tabs.hidden = m.floors.length < 2;
      tabs.innerHTML = m.floors
        .map(
          (f, i) =>
            `<button type="button" class="chip ${f === floor ? 'selected' : ''}" data-gen-view="${i}" aria-pressed="${f === floor}">${esc(f.name)}</button>`,
        )
        .join('');
      $('#gen-about').textContent = G.TYPES.find(t => t[0] === genState.type)[2];
      // El nombre sigue al tipo mientras el DM no lo haya cambiado.
      if (!name.value || name.value === autoName) {
        const n = S.maps.filter(x => x.name.startsWith(m.name)).length;
        name.value = autoName = m.name + (n ? ' ' + (n + 1) : '');
      }
      form.querySelectorAll('[data-gen-type]').forEach(b => {
        b.classList.toggle('selected', b.dataset.genType === genState.type);
        b.setAttribute('aria-checked', b.dataset.genType === genState.type);
      });
      form.querySelectorAll('[data-gen-size]').forEach(b => {
        b.classList.toggle('selected', b.dataset.genSize === genState.size);
        b.setAttribute('aria-checked', b.dataset.genSize === genState.size);
      });
    };
    form.addEventListener('click', e => {
      const t = e.target.closest(
        '[data-gen-type], [data-gen-size], [data-gen-floors], [data-gen-view], #gen-cellar, [data-action=bd-gen-roll]',
      );
      if (!t) return;
      if (t.id === 'gen-cellar') {
        genState.cellar = t.checked;
        genState.view = 0;
        roll();
        return show();
      }
      e.preventDefault();
      e.stopPropagation();
      // Mirar otro piso no vuelve a tirar el mapa.
      if (t.dataset.genView) {
        genState.view = Number(t.dataset.genView);
        return show();
      }
      if (t.dataset.genType) genState.type = t.dataset.genType;
      if (t.dataset.genSize) genState.size = t.dataset.genSize;
      if (t.dataset.genFloors) genState.floors = Number(t.dataset.genFloors);
      genState.view = 0;
      roll();
      show();
    });
    show();
  }
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
            walls = [],
            lights = [];
          if (kind === 'uvtt' || /\.(dd2vtt|uvtt|json)$/i.test(file.name)) {
            const m = BC.parseUVTT(await file.text());
            source = m.image;
            grid = m.grid;
            walls = m.walls;
            lights = m.lights;
          }
          const img = await shrink(source);
          if (grid) grid = BC.normGrid({ ...grid, size: grid.size * img.scale });
          else {
            const across = Number(fd.get('across')) || Math.round(img.width / 70) || 20;
            grid = BC.gridForImage(img.width, img.height, img.width / across);
          }
          const path = await Cloud.uploadMapImage(S.id, img.blob, img.ext);
          row = { ...row, image_path: path, grid, terrain: { cells: '', walls, lights } };
        }
        row.fog = { on: false };
        const made = await Cloud.saveMap(S.id, row);
        rememberMaps([made]);
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
      }<div class="form-grid">${field('Pies por casilla', 'feet', g.feet, 'number', 'min="1" max="100"')}<label class="field">Color de la cuadrícula<input type="color" name="color" value="${esc(g.color)}" data-live></label>${field('Opacidad', 'opacity', g.opacity, 'range', 'min="0" max="1" step="0.05" data-live')}</div><label class="check"><input type="checkbox" name="show" ${g.show ? 'checked' : ''} data-live>Mostrar cuadrícula</label>${typeof Sound !== 'undefined' ? `<label class="field">Sonido de ambiente (lo oye toda la mesa)<select name="ambient">${Sound.AMBIENTS.map(([id, n]) => `<option value="${id}" ${id === g.ambient ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label>` : ''}<fieldset class="skill-choice"><legend>Visión de los jugadores</legend><input type="hidden" name="visionForm" value="1"><label class="check"><input type="checkbox" name="los" ${g.vision.los ? 'checked' : ''}>Solo ven lo que sus personajes tienen a la vista (tapan los muros, rocas y puertas pintados y las paredes de la herramienta «Paredes»)</label><label class="check"><input type="checkbox" name="own" ${g.vision.own ? 'checked' : ''}>Cada jugador ve solo lo que ve su personaje (si no, toda la party comparte lo que ve)</label><label class="check"><input type="checkbox" name="dark" ${g.vision.dark ? 'checked' : ''}>Mapa a oscuras: se ve lo que alumbran las luces (la mitad del radio con luz brillante y el resto en penumbra) y, con visión en la oscuridad, la oscuridad cercana en gris</label>${field('Luz que lleva cada personaje (pies; 40 = antorcha)', 'light', g.vision.light, 'number', 'min="0" max="600" step="5"')}<label class="check"><input type="checkbox" name="memory" ${g.vision.memory ? 'checked' : ''}>Recordar lo explorado: lo que ya vieron queda a la vista en penumbra, sin fichas</label><div class="actions"><button type="button" class="button secondary" data-forget-explored>Olvidar lo explorado en todas las pantallas</button></div><p class="small muted">Se combina con la niebla manual. Como la niebla, se dibuja en el dispositivo de cada jugador.</p></fieldset>`,
      async fd => {
        const grid = readGrid(fd, g);
        // Cambiar columnas o filas reacomoda terreno y niebla.
        const terrain = {
          cells: resizeCells(m, g, grid),
          walls: m.image_path
            ? BC.regridWalls(BC.normWalls(m.terrain?.walls), g, grid)
            : BC.normWalls(m.terrain?.walls),
          links: m.terrain?.links || {},
          props: BP ? BP.norm(grid, m.terrain?.props) : [],
          ambient: resizeAmbient(m, g, grid),
          lights: regridLights(m, g, grid),
          tokenLights: BC.normTokenLights(m.terrain?.tokenLights),
        };
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
      if (m.image_path) S.walls = BC.regridWalls(BC.normWalls(m.terrain?.walls), g, S.grid);
      S.dirty = true;
    };
    form.addEventListener('input', live);
    form.querySelector('[data-forget-explored]')?.addEventListener('click', () => {
      S.channel?.send({ t: 'explored-reset', map: m.id });
      forgetExplored(m.id);
      toast('Lo explorado se olvidó en las pantallas conectadas.');
    });
    form.querySelector('[data-action=bd-grid-auto]')?.addEventListener('click', () => {
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
      vision: fd.has('visionForm')
        ? {
            los: fd.has('los'),
            own: fd.has('own'),
            dark: fd.has('dark'),
            light: fd.get('light'),
            memory: fd.has('memory'),
          }
        : g.vision,
      ambient: fd.has('ambient') ? String(fd.get('ambient')) : g.ambient,
    });
  }
  function resizeCells(m, from, to) {
    const src = BC.cells(from, m.terrain?.cells || '');
    let out = '';
    for (let y = 0; y < to.rows; y++) for (let x = 0; x < to.cols; x++) out += BC.at(from, src, x, y);
    return out;
  }
  function resizeAmbient(m, from, to) {
    const src = BC.ambientCells(from, m.terrain?.ambient);
    if (!/[bdn]/.test(src)) return '';
    let out = '';
    for (let y = 0; y < to.rows; y++) for (let x = 0; x < to.cols; x++) out += BC.at(from, src, x, y);
    return out;
  }
  // Las luces fijas de una imagen siguen al dibujo, como las paredes.
  function regridLights(m, from, to) {
    const lights = BC.normLights(from, m.terrain?.lights);
    if (!m.image_path) return BC.normLights(to, lights);
    const moved = BC.regridWalls(
      lights.map(([x, y]) => [x, y, x + 1, y, 0]),
      from,
      to,
    );
    return BC.normLights(
      to,
      moved.map((w, i) => [w[0], w[1], lights[i][2]]),
    );
  }
  function resizeFog(m, from, to) {
    const src = BC.fogBits(from, m.fog?.revealed || ''),
      list = [];
    for (let y = 0; y < to.rows; y++)
      for (let x = 0; x < to.cols; x++) if (BC.isRevealed(from, src, x, y)) list.push([x, y]);
    return BC.fogEncode(BC.setFog(to, BC.fogBits(to, ''), list, true));
  }

  // ---------- Fichas a mano: PNJ y objetos ----------
  // Altura sobre el suelo (vuelo, cornisas, pozos): cuenta para la distancia al objetivo.
  function elevDialog(t) {
    if (!t) return;
    modal(
      'Altura de ' + t.name,
      `${field('Pies sobre el suelo (negativo: bajo el nivel)', 'elev', t.elev || 0, 'number', 'min="-1000" max="10000" step="5" required')}<p class="small">La distancia al objetivo usa el tramo más largo entre el recorrido en el mapa y la diferencia de altura.</p>`,
      async fd => {
        const elev = Math.max(-1000, Math.min(10000, Math.round(Number(fd.get('elev')) || 0)));
        try {
          await patchToken(t, { elev });
        } catch (err) {
          if (/elev/.test(err.message))
            throw Error(
              'Falta ejecutar supabase/migrations/016_campaign_chronicle.sql en Supabase para guardar alturas.',
            );
          throw err;
        }
        ui();
      },
    );
  }
  // Una antorcha, farol o fogata suelta en el mapa: un objeto que ilumina.
  async function addLight(id) {
    const def = BC.LIGHTS.find(l => l[0] === id);
    if (!def) return;
    const r = canvas.getBoundingClientRect(),
      p = BC.freeSpot(S.grid, mapTokens(), toCell(toWorld(r.width / 2, r.height / 2)), S.terrain),
      [row] = await Cloud.addTokens([
        tokenRow(
          { kind: 'object', name: def[1], label: def[3], color: '#3a2a12', stage: 'light:' + def[2], ...p },
          S.mapId,
        ),
      ]);
    addLocal([row]);
    S.sel = row.id;
    toast(
      `${def[1]} colocada: ilumina ${def[2]} pies.${S.grid.vision?.dark ? '' : ' Para que importe, activá «Mapa a oscuras» en los ajustes del mapa.'}`,
    );
  }
  // Cualquier ficha puede llevar una luz (la antorcha del guerrero, el conjuro del mago).
  function lightDialog(t) {
    if (!t) return;
    const cur = tokenLight(t);
    modal(
      'Luz de ' + t.name,
      `<label class="field">Qué lleva<select name="feet"><option value="0">Sin luz</option>${BC.LIGHTS.map(
        ([, n, f]) => `<option value="${f}" ${f === cur ? 'selected' : ''}>${esc(n)} · ${f} pies</option>`,
      ).join(
        '',
      )}</select></label>${field('O un radio a medida (pies)', 'custom', BC.LIGHTS.some(l => l[2] === cur) ? '' : cur || '', 'number', 'min="5" max="300" step="5"')}<p class="small">En un mapa a oscuras, los jugadores ven lo que esta luz alumbra si lo tienen a la vista. El radio cuenta la luz brillante más la penumbra: la mitad es luz brillante (antorcha: 20 + 20 pies).</p>`,
      async fd => {
        const feet = Math.max(0, Math.min(300, Math.round(Number(fd.get('custom')) || Number(fd.get('feet')) || 0)));
        // Los monstruos la llevan en el mapa: su campo de etapa ya marca encuentros y criaturas colocadas.
        if (t.kind === 'monster') {
          S.tokenLights = { ...S.tokenLights };
          if (feet) S.tokenLights[t.id] = feet;
          else delete S.tokenLights[t.id];
          saveSoon(terrainPatch());
          ui();
          return;
        }
        const want = feet ? 'light:' + feet : null;
        await patchToken(t, { stage: want });
        // Sin la actualización 017, la base ignora el cambio de un jugador.
        if ((S.tokens.find(x => x.id === t.id)?.stage || null) !== want)
          toast('Tu mesa todavía no deja que los jugadores cambien su luz: pedile al DM que la actualice (017).');
        ui();
      },
    );
  }
  function tokenDimensions(t, size) {
    if (size === t.size) return { size };
    const next = { ...t, size, x: BC.snapToken(t.x, size), y: BC.snapToken(t.y, size) };
    const blockers = mapTokens().filter(k => k.id !== t.id && k.kind !== 'object');
    if (!BC.roomFor(S.grid, S.terrain, next, blockers))
      throw Error(
        'No hay lugar en esas casillas para este tamaño. Mové la ficha a un espacio libre antes de cambiarla.',
      );
    return { size, x: next.x, y: next.y };
  }
  async function tokenDialog(t, kind = t?.kind) {
    const linkable = kind === 'monster' && !t?.character_id && (!t?.stage || t.stage === 'placed' || t.combatant_id);
    const priorBlock = (S.party?.secrets || []).find(row => row.combatant_id === t?.combatant_id)?.monster_id;
    const blocks =
      linkable && typeof MonsterUI !== 'undefined'
        ? (await MonsterUI.load({ sharedOnly: STANDALONE }), globalThis.MonsterData || [])
        : [];
    const statField = blocks.length
      ? '<label class="field">Bloque de estadísticas<select name="monster_block"><option value="">Buscar por el nombre de la ficha</option>' +
        [...blocks]
          .sort((a, b) => a.name.localeCompare(b.name, 'es'))
          .map(
            m =>
              '<option value="' +
              esc(m.id) +
              '" ' +
              (priorBlock === m.id ? 'selected' : '') +
              '>' +
              esc(m.name + ' · ' + m.id) +
              '</option>',
          )
          .join('') +
        '</select></label>'
      : '';

    const isNew = !t;
    const modelOption = key =>
      `<option value="${key}" ${t?.creature_model === key ? 'selected' : ''}>${esc(CreatureMiniatures.options[key])}</option>`;
    const modelField = ['npc', 'monster'].includes(kind)
      ? `<label class="field">Miniatura<select name="creature_model"><option value="">Automática</option>${modelOption('sigil')}${Object.entries(
          CreatureMiniatures.groups,
        )
          .map(([group, keys]) => `<optgroup label="${esc(group)}">${keys.map(modelOption).join('')}</optgroup>`)
          .join(
            '',
          )}</select></label><label class="field" id="token-form-field" hidden>Edad o variante<select name="model_form"></select></label>`
      : '';
    const canSize = !t?.character_id && kind !== 'pc';
    const categories = [
      ['0.5', 'Diminuto'],
      ['1', 'Pequeño o mediano'],
      ['2', 'Grande'],
      ['3', 'Enorme'],
      ['4', 'Gargantuesco'],
    ];
    const sizeOptions = categories
      .map(
        ([size, label]) =>
          `<option value="${size}" ${Number(size) === (t?.size || 1) ? 'selected' : ''}>${label}</option>`,
      )
      .join('');
    const hp =
      kind === 'monster'
        ? `<label class="check"><input type="checkbox" name="show_hp" ${t?.show_hp ? 'checked' : ''}>Mostrar la barra de PG a los jugadores</label>`
        : '';
    modal(
      isNew ? { object: 'Nuevo objeto', npc: 'Nuevo PNJ', monster: 'Colocar criatura' }[kind] : 'Editar ficha',
      `${field('Nombre', 'name', t?.name || '', 'text', 'maxlength="100" required')}<div class="form-grid">${field('Letras o emoji', 'label', t?.label || '', 'text', 'maxlength="4"')}<label class="field">Color<input type="color" name="color" value="${esc(/^#[0-9a-f]{6}$/i.test(t?.color || '') ? t.color : kind === 'object' ? '#9e9e9e' : '#83c8bd')}"></label><label class="field">Tamaño<select name="size" ${canSize ? '' : 'disabled'}>${sizeOptions}</select></label></div><label class="check"><input type="checkbox" name="hidden" ${t?.hidden ? 'checked' : ''}>Oculta para los jugadores</label>${modelField}${statField}${hp}`,
      async fd => {
        const name = String(fd.get('name')).trim();
        if (!name) throw Error('Poné un nombre.');
        const block = blocks.length ? MonsterUI.byId(fd.get('monster_block')) || MonsterUI.byName(name) : null;
        if (linkable && blocks.length && !block && !t?.combatant_id)
          throw Error('Elegí un bloque del bestiario para esta criatura.');
        const model = fd.get('creature_model') || null;
        const form = fd.get('model_form');
        const appearance = t && info(t);
        const selected =
          modelField && (model || !(appearance?.miniature || appearance?.portrait))
            ? CreatureMiniatures.selection(name, model, form)
            : null;
        const patch = {
          name,
          label: String(fd.get('label') || '').trim() || BC.initials(name),
          color: fd.get('color'),
          size: propSizes[selected?.size] || (canSize ? Number(fd.get('size')) || 1 : 1),
          hidden: fd.has('hidden'),
        };
        if (modelField && model !== (t?.creature_model || null)) patch.creature_model = model;
        if (modelField && form !== (t?.model_form ?? null)) patch.model_form = form;
        if (kind === 'monster' && fd.has('show_hp') !== !!t?.show_hp) patch.show_hp = fd.has('show_hp');
        try {
          if (isNew) {
            const r = canvas.getBoundingClientRect(),
              center = toCell(toWorld(r.width / 2, r.height / 2));
            const tokens = mapTokens().filter(k => k.kind !== 'object');
            const p = BC.freeSpot(S.grid, tokens, center, S.terrain, patch.size);
            if (!BC.roomFor(S.grid, S.terrain, { ...p, size: patch.size }, tokens))
              throw Error('No hay casillas libres para este tamaño.');
            const stage = kind === 'monster' ? 'placed' : null;
            const [row] = await Cloud.addTokens([tokenRow({ ...patch, kind, stage, ...p }, S.mapId)]);
            if (block) {
              try {
                row.combatant_id = await Cloud.linkBoardMonster(row.id, MonsterUI.profile(block));
                monsterLinks.add(row.id);
              } catch (error) {
                await Cloud.removeToken(row.id);
                throw error;
              }
            }
            addLocal([row]);
            S.sel = row.id;
          } else {
            await patchToken(t, { ...patch, ...tokenDimensions(t, patch.size) });
            if (block) {
              t.combatant_id = await Cloud.linkBoardMonster(t.id, MonsterUI.profile(block));
              monsterLinks.add(t.id);
            }
            if (patch.hidden !== t.hidden || block) S.channel?.send({ t: 'refresh' });
          }
        } catch (err) {
          if (/model_form|show_hp/.test(err.message) && /schema cache|does not exist/i.test(err.message))
            throw Error(
              'Aplicá la migración 027_board_miniatures.sql en Supabase para guardar variantes y barras de PG.',
            );
          if (
            patch.creature_model &&
            /creature_model/i.test(err.message) &&
            /check constraint|schema cache|does not exist/i.test(err.message)
          )
            throw Error('Para guardar la miniatura elegida, aplicá las migraciones 025 y 026 en Supabase.');
          throw err;
        }
        ui();
      },
      isNew ? 'Agregar' : 'Guardar',
    );
    if (!modelField) return;
    const { name, creature_model: miniature, model_form: form, size } = $('#dialog-form').elements;
    const formField = $('#token-form-field');
    const appearance = t && info(t);
    function selection(value, initial = false) {
      if (!miniature.value && (appearance?.miniature || appearance?.portrait)) return null;
      return CreatureMiniatures.selection(name.value, miniature.value, value, initial ? t?.size : undefined);
    }
    function syncSize(model) {
      size.disabled = !canSize || !!model;
      if (model) size.value = propSizes[model.size];
    }
    function syncForms(initial = false) {
      const model = selection(initial ? t?.model_form : null, initial);
      form.innerHTML = variantOptions(model);
      formField.hidden = form.disabled = !form.options.length;
      syncSize(model);
    }
    miniature.addEventListener('change', () => {
      if (!name.value.trim() && miniature.value && miniature.value !== 'sigil')
        name.value = CreatureMiniatures.options[miniature.value];
      syncForms();
    });
    name.addEventListener('input', () => {
      if (!miniature.value) syncForms();
    });
    form.addEventListener('change', () => syncSize(selection(form.value)));
    syncForms(true);
  }

  // ---------- Inicio ----------
  // Marcado del tablero cuando se monta dentro de otra página (en board.html ya está en el HTML).
  const SHELL = `<div class="board-shell">
  <header class="board-top" id="board-top"></header>
  <div id="bc-status" class="bc-status" hidden></div>
  <div class="board-main">
    <div class="board-stage board-table" id="stage">
      <canvas id="board" aria-label="Mapa del tablero"></canvas>
      <div class="board-turn" id="board-turn" hidden></div>
      <div class="board-hint" id="board-hint" role="status" aria-live="polite"></div>
      <div class="board-card" id="board-card" hidden></div>
      <div class="board-panel" id="board-panel" hidden></div>
    </div>
    <aside class="board-dock" id="board-dock" aria-label="Acciones de combate" hidden></aside>
  </div>
  <aside id="board-casting" class="board-casting" hidden aria-label="Lanzamiento"></aside>
  <nav class="board-tools" id="board-tools" aria-label="Herramientas del tablero"></nav>
</div>
<div class="board-message" id="board-message" hidden></div>`;
  document.addEventListener('pointerdown', e => {
    if (!casting || casting.active() || e.pointerType !== 'touch' || !e.target.closest('[data-tool="cast"]')) return;
    quickPick = { id: e.pointerId, y: e.clientY, swiped: false, item: null };
  });
  document.addEventListener('pointermove', e => {
    const q = quickPick;
    if (!q || q.id !== e.pointerId) return;
    if (!q.swiped && q.y - e.clientY > 18) {
      q.swiped = true;
      document.body.setPointerCapture(e.pointerId);
      casting.begin();
    }
    if (!q.swiped) return;
    q.item?.classList.remove('bc-swipe-target');
    q.item = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-bc="choose"]:not(:disabled)');
    q.item?.classList.add('bc-swipe-target');
  });
  for (const type of ['pointerup', 'pointercancel'])
    document.addEventListener(type, e => {
      const q = quickPick;
      if (!q || q.id !== e.pointerId) return;
      if (q.swiped) {
        q.item?.classList.remove('bc-swipe-target');
        if (type === 'pointerup') q.item?.click();
        setTimeout(() => {
          if (quickPick === q) quickPick = null;
        }, 0);
      } else quickPick = null;
    });
  let mounted = false;
  function mount() {
    if (mounted) return;
    mounted = true;
    canvas = $('#board');
    ctx = canvas.getContext('2d');
    mountRotationHandle();
    loadMiniPack();
    for (const a of canvasListeners) canvas.addEventListener(...a);
    new ResizeObserver(resize).observe($('#stage'));
    resize();
    requestAnimationFrame(draw);
  }
  document.addEventListener('keydown', e => {
    if (!mounted || !shown || e.target.closest('input, textarea, select') || $('#modal').open) return;
    const key = e.key.toLowerCase();
    if (['shift', 'control', 'meta'].includes(key)) $('#stage').classList.add('board-selection-modifier');
    if (key === 'r' && !TV) rotationKey = true;
    if (!e.ctrlKey && !e.metaKey && (key === 'q' || key === 'e') && rotationGroup().length) {
      e.preventDefault();
      turnBy(key === 'q' ? -1 : 1);
      return;
    }
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && key === 'z' && S.tool === 'walls' && dmView()) {
      e.preventDefault();
      if (undoWalls()) ui();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && key === 'z' && S.poseUndo.length) {
      e.preventDefault();
      undoPose().catch(err => toast(err.message));
      return;
    }
    if (e.key === 'Escape') {
      if (casting?.active()) return casting.close();
      if (S.wallChain || S.wallDraw) return endWallChain();
      if (S.aimFacing) {
        S.aimFacing = false;
        tools();
        pick();
        return;
      }
      if (!S.sel && !STANDALONE) return close();
      S.sel = null;
      S.selected.clear();
      S.multiSelect = false;
      tools();
      card();
    }
    if (e.key === '+' || e.key === '=') zoomAt(canvas.clientWidth / 2, canvas.clientHeight / 2, 1.2);
    if (e.key === '-') zoomAt(canvas.clientWidth / 2, canvas.clientHeight / 2, 1 / 1.2);
    if ((e.key === 'Delete' || e.key === 'Backspace') && S.sel && S.isDM && !S.asPlayer)
      document.querySelector('[data-action=bd-token-remove]')?.click();
    S.dirty = true;
  });
  document.addEventListener('keyup', e => {
    if (e.key.toLowerCase() === 'r') rotationKey = false;
    if (!e.shiftKey && !e.ctrlKey && !e.metaKey) $('#stage')?.classList.remove('board-selection-modifier');
  });
  window.addEventListener('blur', () => {
    rotationKey = false;
    $('#stage')?.classList.remove('board-selection-modifier');
  });
  const failed = e => message(`<h1>No se pudo abrir el tablero</h1><p>${esc(e.message)}</p>`);
  async function reconnectBoard() {
    if (!mounted || !S.id || !shown) return;
    await flushSave();
    await refreshPrepared();
    await reload();
  }
  window.addEventListener('online', reconnectBoard);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (mounted) flushSave();
    } else reconnectBoard();
  });
  if (STANDALONE) {
    window.addEventListener('hashchange', () => location.reload());
    mount();
    start().catch(failed);
  }
  // Tablero encima de la ficha o de la pantalla del DM. Se monta una vez y queda escuchando la mesa
  // aunque se cierre: así los avisos de ataques de oportunidad llegan igual.
  function open(campaignId, hooks = {}) {
    H = hooks;
    let host = $('#board-embed');
    if (!host) {
      host = document.createElement('div');
      host.id = 'board-embed';
      host.className = 'board-embed';
      host.innerHTML = SHELL;
      document.body.append(host);
    }
    host.hidden = false;
    shown = true;
    if (typeof Sound !== 'undefined') Sound.ambient(S.mapId ? S.grid.ambient : '');
    document.documentElement.classList.add('board-open');
    mount();
    if (hooks.compactCast && !casting) {
      casting = BoardCasting.mount($('#board-casting'), {
        spells: () => H.spells(),
        plan: compactPlan,
        target: compactTarget,
        focus: focusCasting,
        cast: (id, placement, options) => H.cast(id, false, placement, options),
        online: () => navigator.onLine && Boolean(S.channel) && S.channel.connected !== false,
        scope: () => [S.id, S.mapId, H.actorId?.()].join(':'),
        status: html => {
          const status = $('#bc-status');
          status.innerHTML = html;
          status.hidden = !html;
        },
        dirty: () => {
          S.dirty = true;
        },
      });
      $('#bc-status').addEventListener('click', e => {
        const action = e.target.closest('[data-bc]')?.dataset.bc;
        if (action === 'concentration')
          modal(
            'Concentración',
            `<p>${esc(e.target.textContent)}</p><button class="button danger" type="button" data-action="concentration-end" data-close-concentration>Terminar conjuro</button>`,
            null,
          );
        if (action === 'concentration-save') useConcentrationSave();
      });
      document.addEventListener('click', e => {
        if (e.target.closest('[data-close-concentration]')) $('#modal').close();
      });
      for (const name of ['online', 'offline']) window.addEventListener(name, () => casting.connectionChanged());
    }
    if (S.id !== campaignId) {
      S.channel?.close();
      Object.assign(S, {
        id: campaignId,
        board: null,
        maps: [],
        tokens: [],
        prepared: [],
        mapId: null,
        sel: null,
        target: null,
        channel: null,
      });
      message('');
      start().catch(failed);
    } else {
      resize();
      ui();
      reconnectBoard();
    }
  }
  function close() {
    casting?.close();
    flushSave();
    const host = $('#board-embed');
    if (host) host.hidden = true;
    shown = false;
    document.documentElement.classList.remove('board-open');
    if (typeof Sound !== 'undefined') Sound.ambient('');
    H.closed?.();
  }
  window.Board = {
    open,
    close,
    isOpen: () => shown && !STANDALONE,
    // La página avisa los cambios de la mesa (personajes, iniciativa…) y cuándo cambió su propia ficha.
    onParty: table => S.id && onParty(table),
    refresh: () => mounted && S.id && (dock(), card(), casting?.top()),
    context: () => combatContext(),
    selectedPlacement,
    spellPlacement,
    projectSpell,
    projectAbility,
    prepareCompactCast,
    offerSpellReaction,
    showSpellSave(castId, save) {
      const token = mapTokens().find(t => t.combatant_id === save.targetId);
      if (token)
        casting?.updateSave(castId, token.id, save.success, {
          damage: save.damage,
          roll: save.roll,
          total: save.total,
        });
    },
    async startCasting(id) {
      if (!casting) return;
      for (let i = 0; !S.mapId && i < 100 && shown; i++) await new Promise(resolve => setTimeout(resolve, 40));
      if (shown) casting.begin(id);
    },
    missileOptions,
    assignMissiles,
    assignRays,
    wardTargets,
    assignWard,
    resolveSpellSave,
    swingSpiritualWeapon,
    spiritualImpact,
    lashGraspingVine,
    moveDustDevil,
    smiteStrike,
    spellHit,
    undoPose,
    aimSpell: id => {
      S.sheetSpell = id;
      globalThis.BoardInk?.prepare(id, Spells.kindFor(id));
      S.spellAim = null;
      S.tool = 'scene';
      S.panelMin = false;
      if (S.mapId) ui();
    },
    // Abre el panel de acciones si estaba plegado (por ejemplo, llegó algo que el DM tiene que resolver).
    expand: () => {
      if (!mounted || !S.dockMin) return;
      S.dockMin = false;
      dock();
    },
    _state: () => S, // para pruebas y depuración
    _sightContext: () => sightCtx(),
    _vision: () => {
      const st = sightState(!playerView());
      return st && { ...st, mask: st.los ? visionMask(st) : null };
    },
  };
})();
