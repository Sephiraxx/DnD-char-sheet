// Local preview of the real board, with an in-memory table and no Supabase connection.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const samples = require('./miniature-samples.json');

const mapId = 'miniature-board';
const roster = [
  ...samples.filter(row => row.miniature),
  {
    id: 'small',
    name: 'Mediano · personalizado',
    miniature: { race: 'halfling', outfit: 'coat', gear: 'dagger', cloth: '#285366' },
  },
  {
    id: 'stocky',
    name: 'Enano · personalizado',
    miniature: { race: 'dwarf', beard: 'braided', gear: 'axe', cloth: '#8d302d' },
  },
  {
    id: 'standard',
    name: 'Humana · personalizada',
    miniature: { race: 'human', gender: 'woman', outfit: 'vestments', hair: 'braid', gear: 'staff', cloth: '#763558' },
  },
  { id: 'tall', name: 'Goliat · personalizado', miniature: { race: 'goliath', gear: 'hammer', cloth: '#243138' } },
  {
    id: 'iron',
    name: 'Forjado · todo hierro',
    miniature: {
      race: 'warforged',
      feature: 'iron',
      outfit: 'armor',
      skin: '#3a444f',
      cableColor: '#8d9fa7',
      eyeColor: '#76f2f0',
      gear: 'sword',
    },
  },
];
const grid = { cols: 15, rows: 9, feet: 5, color: '#182119', opacity: 0.55 };
const map = {
  id: mapId,
  name: 'Prueba de miniaturas',
  grid,
  terrain: {
    cells: Array.from({ length: grid.rows }, (_, y) => (y < 4 ? 'ggggggggggggggg' : 'gggffffffffffgg')).join(''),
  },
  fog: { on: false },
};
const points = [
  [2, 5],
  [4, 5],
  [6, 5],
  [9, 3],
  [4, 7],
  [6, 7],
  [11, 7],
  [8, 7],
];
const pcTokens = roster.map(({ id, name }, i) => ({
  id,
  name,
  kind: 'pc',
  character_id: id,
  size: 1,
  x: points[i][0],
  y: points[i][1],
}));
const rats = [
  [0, 0],
  [0.5, 0],
  [0, 0.5],
  [0.5, 0.5],
].map(([x, y], i) => ({
  id: `rat${i + 1}`,
  name: `Rata ${i + 1}`,
  kind: 'monster',
  x: 3 + x,
  y: 2 + y,
  size: 0.5,
}));
const monsters = [
  {
    id: 'giant',
    name: 'Gigante de las colinas',
    creature_model: 'hill-giant',
    size: 3,
    x: 8,
    y: 4,
    show_hp: true,
    hp_fraction: 0.62,
  },
  { id: 'dragon', name: 'Dragón rojo joven', creature_model: 'dragon-red', model_form: 'young', size: 2, x: 12, y: 3 },
  { id: 'flyer', name: 'Ave rapaz', creature_model: 'hawk', size: 0.5, x: 13, y: 6.5, elev: 30, kind: 'npc' },
  ...rats,
].map(t => ({ kind: 'monster', stage: 'placed', ...t }));
const fixture = {
  map,
  characters: roster.map(row => ({
    id: row.id,
    name: row.name,
    owner_id: 'demo-player',
    updated_at: 'preview',
    summary: { hp: 17, maxHP: 23, miniature: row.miniature },
  })),
  tokens: [...pcTokens, ...monsters].map(t => ({
    map_id: mapId,
    label: t.name.slice(0, 2),
    color: '#707c79',
    hidden: false,
    ...t,
  })),
  combatants: [
    { id: 'giant-turn', kind: 'monster', status: 'herido' },
    { id: 'dragon-turn', kind: 'monster', status: 'herido' },
  ],
};
fixture.tokens.find(t => t.id === 'giant').combatant_id = 'giant-turn';
fixture.tokens.find(t => t.id === 'dragon').combatant_id = 'dragon-turn';

const rotationFixture = structuredClone(fixture);
const facingGrid = { ...grid, cols: 20, rows: 11, rotation: { mode: 'travel', marker: true } };
rotationFixture.map.grid = facingGrid;
rotationFixture.map.name = 'Prueba de orientación';
rotationFixture.map.terrain.cells = Array.from({ length: 11 }, (_, y) =>
  y < 4 ? 'g'.repeat(20) : 'gg' + 'f'.repeat(16) + 'gg',
).join('');
const arrangements = {
  forjado: [2, 6, 5],
  enano: [4, 6, 0],
  'cleriga-elfa': [6, 6, 3],
  small: [6, 3, 5],
  stocky: [4, 8, 3],
  standard: [6, 8, 6],
  tall: [11, 8, 1],
  iron: [8, 8, 4],
  dragon: [8, 3, 5],
  giant: [12, 2, 2],
  flyer: [2.5, 8.5, 6],
};
rotationFixture.tokens.forEach(t => {
  const point = arrangements[t.id];
  if (point) [t.x, t.y, t.facing] = point;
  else t.facing = [0, 2, 4, 6][Number(t.id.at(-1)) - 1];
  t.facing_manual = true;
  t.facing_mode = 'inherit';
});
rotationFixture.characters.push({
  id: 'centaur',
  name: 'Centauro',
  owner_id: 'demo-player',
  updated_at: 'preview',
  summary: { miniature: { race: 'centaur', cloth: '#a56a2e', gear: 'spear' } },
});
rotationFixture.tokens.push(
  {
    id: 'centaur',
    character_id: 'centaur',
    kind: 'pc',
    name: 'Centauro',
    size: 1,
    x: 9,
    y: 9,
    facing: 2,
    map_id: mapId,
  },
  {
    id: 'ancient',
    kind: 'monster',
    name: 'Dragón negro anciano',
    stage: 'placed',
    creature_model: 'dragon-black',
    model_form: 'ancient',
    size: 4,
    x: 15,
    y: 6,
    facing: 5,
    map_id: mapId,
  },
);

function connect(data) {
  const { map, characters, combatants } = data;
  let tokens = data.tokens;
  let updates;
  const live = new BroadcastChannel('tablero-demo-' + map.name);
  const defaultPose = { facing: 0, facing_mode: 'inherit', facing_manual: false };
  const incoming = rows => {
    for (const row of rows) {
      const existing = tokens.find(t => t.id === row.id);
      if (existing) Object.assign(existing, row);
      updates?.('map_tokens', { eventType: 'UPDATE', new: structuredClone(row) });
    }
  };
  live.onmessage = e => incoming(e.data);
  const secrets = [
    { combatant_id: 'giant-turn', hp: 62, max_hp: 100 },
    { combatant_id: 'dragon-turn', hp: 73, max_hp: 128 },
  ];
  window.Cloud = {
    enabled: true,
    user: async () => ({ id: location.search.includes('viewer=1') ? 'demo-player' : 'demo-dm' }),
    party: async () => ({
      campaign: { name: 'Tablero de prueba', dm_id: 'demo-dm' },
      characters,
      combatants,
      secrets,
      encounter: { active: false },
    }),
    board: async () => ({ board: { map_id: map.id }, maps: [map], tokens: structuredClone(tokens) }),
    preparedEncounters: async () => [
      {
        data: {
          id: 'demo-encounter',
          name: 'Bestias de la cueva',
          monsters: [
            { uid: 'demo-snake', name: 'Serpiente venenosa' },
            { uid: 'demo-ooze', name: 'Pudín negro' },
          ],
        },
      },
    ],
    subscribeBoard: async (_id, callback) => {
      updates = callback;
      return { send() {}, close() {} };
    },
    subscribe: async () => {},
    updateToken: async (id, patch) => {
      const row = tokens.find(t => t.id === id);
      Object.assign(row, patch);
      const secret = secrets.find(s => s.combatant_id === row.combatant_id);
      row.hp_fraction = row.show_hp && secret ? secret.hp / secret.max_hp : null;
      return [structuredClone(row)];
    },
    poseTokens: async (_campaign, _map, changes) => {
      const rows = changes.map(({ id, before, patch }) => {
        const row = tokens.find(t => t.id === id);
        if (!row || !Object.keys(before).every(k => (row[k] ?? defaultPose[k]) === before[k]))
          throw Error('La ficha cambió.');
        return { ...row, ...patch };
      });
      incoming(rows);
      live.postMessage(rows);
      return structuredClone(rows);
    },
    saveMap: async (_campaign, patch) => Object.assign(map, patch),
    addTokens: async rows => {
      const added = rows.map(row => ({ ...row, id: crypto.randomUUID() }));
      tokens.push(...added);
      return structuredClone(added);
    },
    removeToken: async id => {
      tokens = tokens.filter(t => t.id !== id);
    },
    hiddenTurnsReady: async () => true,
    updateCombatant: async (id, patch) =>
      Object.assign(
        combatants.find(c => c.id === id),
        patch,
      ),
  };
  window.miniatureDemo = {
    tokens: () => structuredClone(tokens),
    update(patch) {
      Object.assign(
        tokens.find(row => row.id === patch.id),
        patch,
      );
      updates('map_tokens', { eventType: 'UPDATE', new: structuredClone(tokens.find(row => row.id === patch.id)) });
    },
  };
}

const root = path.join(__dirname, '..');
const types = {
  '.js': 'text/javascript',
  '.html': 'text/html',
  '.css': 'text/css',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
};
function demoFile(pathname) {
  if (pathname === '/board-demo-data.js')
    return { contentType: 'text/javascript; charset=utf-8', body: `(${connect})(${JSON.stringify(fixture)});` };
  if (pathname === '/board-demo-facings.js')
    return { contentType: 'text/javascript; charset=utf-8', body: `(${connect})(${JSON.stringify(rotationFixture)});` };
  if (pathname === '/' || pathname === '/rotations') {
    const html = fs.readFileSync(path.join(root, 'board.html'), 'utf8');
    return {
      contentType: 'text/html; charset=utf-8',
      body: html.replace('./cloud.js', pathname === '/' ? './board-demo-data.js' : './board-demo-facings.js'),
    };
  }
  if (!/^(?:\/[A-Za-z0-9_][A-Za-z0-9_.-]*)+$/.test(pathname)) return null;
  const file = path.join(root, pathname);
  const contentType = types[path.extname(file)];
  return contentType && fs.statSync(file, { throwIfNoEntry: false })?.isFile()
    ? { contentType, body: fs.readFileSync(file) }
    : null;
}
function serve(port = 0) {
  const server = http.createServer((req, res) => {
    const file = demoFile(new URL(req.url, 'http://localhost').pathname);
    if (!file) return res.writeHead(404).end();
    res.setHeader('Content-Type', file.contentType);
    res.end(file.body);
  });
  return new Promise(resolve => server.listen(port, '127.0.0.1', () => resolve(server)));
}
if (require.main === module)
  serve().then(server => console.log(`http://127.0.0.1:${server.address().port}/rotations#demo`));
module.exports = { serve, demoFile };
