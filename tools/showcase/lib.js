// Video de la portada (assets/showcase.*): ayudas para grabarlo desde la app real con Playwright.
// Servidor local, mesa simulada en memoria (sin Supabase) y un cursor visible.
const http = require('http'),
  fs = require('fs'),
  path = require('path');
const ROOT = path.join(__dirname, '../..');
const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
};
function serve() {
  const server = http.createServer((req, res) => {
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = path.join(ROOT, p === '/' ? '/index.html' : p);
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404);
      return res.end();
    }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(ok => server.listen(0, '127.0.0.1', () => ok(server)));
}
const fixture = JSON.parse(fs.readFileSync(path.join(ROOT, 'test/fixtures/wizard-3.json'), 'utf8'));
const sheet = (name, classId, race, hp) => ({
  ...fixture,
  name,
  classId,
  classSubclass: classId === 'wizard' ? fixture.classSubclass : '',
  race,
  hp,
});
const PARTY = [
  ['c1', 'p1', 'Lyra', 'wizard', 'Elfo · alto', 11],
  ['c2', 'p2', 'Bram', 'fighter', 'Enano · de las colinas', 17],
  ['c3', 'p3', 'Sera', 'cleric', 'Humano', 6],
  ['c4', 'p4', 'Nim', 'rogue', 'Mediano · piesligeros', 14],
];
function party() {
  const t = '2026-11-20T21:00:00Z';
  const characters = PARTY.map(([id, owner, name, cls, race, hp]) => ({
    id,
    owner_id: owner,
    name,
    data: sheet(name, cls, race, hp),
    updated_at: t,
  }));
  const combatants = [
    {
      id: 'k1',
      campaign_id: 'camp',
      kind: 'pc',
      character_id: 'c2',
      name: 'Bram',
      init: 19,
      tiebreak: 0,
      status: 'ileso',
      conditions: [],
      hidden: false,
      created_at: t,
    },
    {
      id: 'k2',
      campaign_id: 'camp',
      kind: 'monster',
      character_id: null,
      name: 'Ogro',
      init: 16,
      tiebreak: 0,
      status: 'herido',
      conditions: [],
      hidden: false,
      created_at: t,
    },
    {
      id: 'k3',
      campaign_id: 'camp',
      kind: 'pc',
      character_id: 'c1',
      name: 'Lyra',
      init: 14,
      tiebreak: 0,
      status: 'ileso',
      conditions: [],
      hidden: false,
      created_at: t,
    },
    {
      id: 'k4',
      campaign_id: 'camp',
      kind: 'monster',
      character_id: null,
      name: 'Goblin 1',
      init: 12,
      tiebreak: 0,
      status: 'ileso',
      conditions: [],
      hidden: false,
      created_at: t,
    },
    {
      id: 'k5',
      campaign_id: 'camp',
      kind: 'pc',
      character_id: 'c3',
      name: 'Sera',
      init: 9,
      tiebreak: 0,
      status: 'malherido',
      conditions: ['Asustado'],
      hidden: false,
      created_at: t,
    },
    {
      id: 'k6',
      campaign_id: 'camp',
      kind: 'pc',
      character_id: 'c4',
      name: 'Nim',
      init: 7,
      tiebreak: 0,
      status: 'ileso',
      conditions: [],
      hidden: false,
      created_at: t,
    },
  ];
  return {
    campaign: { id: 'camp', name: 'La Cripta del Rey Gris', code: 'GRIS42', dm_id: 'dm', settings: {} },
    members: [
      { user_id: 'dm', role: 'dm', display_name: 'DM', joined_at: t },
      ...PARTY.map(([, owner, name]) => ({ user_id: owner, role: 'player', display_name: name, joined_at: t })),
    ],
    characters,
    enemyNpcs: [],
    loot: [],
    homebrew: [],
    combatants,
    secrets: [
      { combatant_id: 'k2', campaign_id: 'camp', hp: 38, max_hp: 59, ac: 11, saves: {} },
      { combatant_id: 'k4', campaign_id: 'camp', hp: 7, max_hp: 7, ac: 15, saves: {} },
    ],
    encounter: { campaign_id: 'camp', active: true, round: 2, current_id: 'k3', updated_at: t },
    viewerIsDM: true,
  };
}
let eventId = 100;
const event = (author, kind, payload) => ({
  id: ++eventId,
  campaign_id: 'camp',
  author_id: author,
  kind,
  payload,
  target_character: null,
  visibility: 'all',
  created_at: new Date().toISOString(),
});
// Reemplaza cloud.js por una mesa en memoria; `extra` agrega funciones (código JS, como texto).
async function stubCloud(page, who, extra = '') {
  await page.route('**/config.js', r =>
    r.fulfill({ contentType: 'application/javascript', body: 'window.CLOUD_CONFIG = {};' }),
  );
  await page.route('**/cloud.js', r =>
    r.fulfill({
      contentType: 'application/javascript',
      body:
        fs.readFileSync(path.join(ROOT, 'cloud.js'), 'utf8') +
        `
      // Lo que no se simula no llega a ningún servidor (y no muestra avisos de «mesa no configurada»).
      for (const k of Object.keys(Cloud)) if (Cloud[k]?.constructor?.name === 'AsyncFunction') Cloud[k] = async () => null;
      Object.assign(Cloud, {
        enabled: true,
        user: async () => ({ id: '${who}' }),
        currentUser: async () => ({ id: '${who}', is_anonymous: true }),
        party: async () => window.recParty(),
        events: async () => window.recEvents ? window.recEvents() : [],
        subscribe: async (_, handler) => { window.recChanged = handler; return () => {}; },
        subscribeBoard: async (_, handler, receive) => { window.boardChanged = handler; window.boardMessage = receive; return { send() {}, close() {} }; },
        board: async () => window.recBoard(),
        saveMap: async (c, row) => row,
        addTokens: async () => [],
        poseTokens: async (c, m, changes) => window.recPose(changes),
        updateToken: async (id, patch) => window.recPose([{ id, patch }]),
        preparedEncounters: async () => [],
        spellZones: async () => [],
        hiddenTurnsReady: async () => true,
        myDmTables: async () => [],
        backups: async () => [],
        applyUnloadedEnemyDamage: async () => false,
        post: async () => ({}),
      });
      ${extra}`,
    }),
  );
}
// Cursor visible en la grabación (Playwright no dibuja el del sistema).
async function cursor(page) {
  await page.addInitScript(() => {
    addEventListener('DOMContentLoaded', () => {
      const c = document.createElement('div');
      c.id = 'rec-cursor';
      c.style.cssText =
        'position:fixed;left:0;top:0;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;border:2px solid #fff;background:rgba(224,190,128,.45);box-shadow:0 0 0 2px rgba(0,0,0,.35);z-index:2147483647;pointer-events:none;transition:transform .12s ease;transform:translate(-100px,-100px)';
      document.documentElement.append(c);
      let x = -100,
        y = -100;
      addEventListener(
        'mousemove',
        e => {
          x = e.clientX;
          y = e.clientY;
          c.style.transform = `translate(${x}px,${y}px)`;
        },
        true,
      );
      addEventListener('mousedown', () => (c.style.transform = `translate(${x}px,${y}px) scale(.7)`), true);
      addEventListener('mouseup', () => (c.style.transform = `translate(${x}px,${y}px)`), true);
    });
  });
}
// Mueve el mouse de a poco hasta un elemento o punto, y hace clic.
async function glide(page, target, { steps = 18, click = true, pause = 250 } = {}) {
  let x, y;
  if (typeof target === 'string' || target?.boundingBox) {
    const loc = typeof target === 'string' ? page.locator(target).first() : target;
    await loc.scrollIntoViewIfNeeded().catch(() => {});
    const b = await loc.boundingBox();
    x = b.x + b.width / 2;
    y = b.y + b.height / 2;
  } else ({ x, y } = target);
  await page.mouse.move(x, y, { steps });
  await page.waitForTimeout(pause);
  if (click) await page.mouse.click(x, y);
}
module.exports = { serve, party, event, stubCloud, cursor, glide, fixture, sheet, PARTY, ROOT };
// Mapas generados con la misma herramienta del tablero.
globalThis.BoardProps = require(ROOT + '/board-props.js');
const Gen = require(ROOT + '/board-gen.js');
function boardData(type, seed, size, tokens, extra = {}) {
  const m = Gen.generate(type, { size, seed });
  return {
    board: { campaign_id: 'camp', map_id: 'map' },
    maps: [
      {
        id: 'map',
        name: m.name,
        sort: 0,
        grid: { cols: m.cols, rows: m.rows, ...(extra.grid || {}) },
        terrain: { cells: m.terrain, walls: [], props: m.props, ...(extra.terrain || {}) },
        fog: { on: false },
      },
    ],
    tokens: tokens.map(t => ({ map_id: 'map', size: 1, hidden: false, ...t })),
  };
}
module.exports.boardData = boardData;
module.exports.Gen = Gen;
// Encuadra la zona del mapa (en casillas) dentro de un rectángulo de la pantalla del tablero.
async function camera(page, [x0, y0, x1, y1], box) {
  await page.evaluate(
    ([x0, y0, x1, y1, box]) => {
      const S = Board._state(),
        c = Miniatures.boardCell,
        s = Math.min(box.width / ((x1 - x0) * c), box.height / ((y1 - y0) * c));
      S.view.s = s;
      S.view.x = box.left - x0 * c * s + (box.width - (x1 - x0) * c * s) / 2;
      S.view.y = box.top - y0 * c * s + (box.height - (y1 - y0) * c * s) / 2;
      S.touched = true;
      S.fitted = true;
      S.dirty = true;
    },
    [x0, y0, x1, y1, box],
  );
}
module.exports.camera = camera;

// Tablero en memoria: las fichas guardan cada movimiento, como la base de datos.
async function exposeBoard(ctx, board) {
  await ctx.exposeFunction('recBoard', () => board);
  await ctx.exposeFunction('recPose', changes =>
    changes.map(c =>
      Object.assign(
        board.tokens.find(t => t.id === c.id),
        c.patch,
      ),
    ),
  );
}
module.exports.exposeBoard = exposeBoard;
