// Abre el Tablero real con datos de ejemplo y sin conectarse a Supabase.
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const sample = require('./miniature-samples.json');
const root = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const port = Number(process.argv[3] || 8765);
const board = fs.readFileSync(path.join(root, 'board.html'), 'utf8');
const files = new Set([...board.matchAll(/(?:src|href)="\.\/([^"]+)"/g)].map(([, name]) => name));
const tiles = [
  'rrrttttttttttttttr',
  'rrrtttgggggggggttr',
  'r#######gggggggttr',
  'r#fffff#ggggaggttt',
  'r#fffffOaaaaaagttt',
  'r#fffff#gggaaagttt',
  'r#######gggaggtttt',
  'rrrttgggggaaggtttt',
  'rrrttgggggaaggtttt',
];
const positions = {
  forjado: [3, 4],
  enano: [4, 5],
  'cleriga-elfa': [5, 4],
  skeleton: [9, 4],
  'dragon-red': [11, 3],
  goblin: [9, 6],
  wolf: [13, 6],
  ghost: [12, 2],
};
const map = {
  id: 'chapel',
  name: 'Ruinas de la capilla',
  grid: { cols: tiles[0].length, rows: tiles.length },
  terrain: {
    cells: tiles.join(''),
    props: [
      [2, 3, 'brazier', 0],
      [6, 5, 'brazier', 0],
    ],
  },
  fog: { on: false },
};
const tokens = sample.map(({ id, name, miniature, size }) => ({
  id,
  name,
  map_id: map.id,
  kind: miniature ? 'pc' : 'monster',
  x: positions[id][0],
  y: positions[id][1],
  character_id: miniature ? id : null,
  creature_model: miniature ? null : id,
  size: size === 'large' ? 2 : 1,
  combatant_id: 'combat-' + id,
}));
const party = {
  campaign: { id: 'preview', name: 'Mesa de prueba', dm_id: 'viewer', settings: {} },
  members: [],
  secrets: [],
  enemyNpcs: [],
  characters: sample
    .filter(row => row.miniature)
    .map(({ id, name, miniature }) => ({
      id,
      name,
      owner_id: 'viewer',
      updated_at: 'preview',
      summary: { miniature, hp: 17, maxHP: 20 },
    })),
  combatants: tokens.map(t => ({
    id: t.combatant_id,
    kind: t.kind,
    character_id: t.character_id,
    name: t.name,
    status: t.id === 'skeleton' ? 'herido' : 'ileso',
  })),
  encounter: { active: true, current_id: 'combat-forjado', round: 1 },
};
const boardData = { board: { map_id: map.id }, maps: [map], tokens };
const fixture = `
Object.assign(Cloud,{
  enabled:true, user:async()=>({id:'viewer'}), party:async()=>${JSON.stringify(party)},
  board:async()=>${JSON.stringify(boardData)}, preparedEncounters:async()=>[],
  subscribe:async()=>()=>{}, subscribeBoard:async()=>({close(){},send(){}}),
  updateToken:async()=>[], addTokens:async()=>[]
});
`;
const types = {
  '.html': 'text/html;charset=utf-8',
  '.js': 'text/javascript;charset=utf-8',
  '.css': 'text/css;charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
};
http
  .createServer((req, res) => {
    const key = new URL(req.url, 'http://localhost').pathname.slice(1);
    if (key !== 'board.html' && !files.has(key) && !/^(fonts|assets\/minis)\/[a-zA-Z0-9_.-]+$/.test(key))
      return res.writeHead(404).end();
    res.setHeader('Content-Type', types[path.extname(key)] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');
    if (key === 'config.js') return res.end('window.CLOUD_CONFIG={};');
    if (key === 'updates.js') return res.end('');
    const file = path.join(root, key);
    if (!fs.existsSync(file)) return res.writeHead(404).end();
    const bytes = fs.readFileSync(file);
    res.end(key === 'cloud.js' ? bytes.toString('utf8') + '\n' + fixture : bytes);
  })
  .listen(port, '127.0.0.1', () => console.log(`http://127.0.0.1:${port}/board.html#preview`));
