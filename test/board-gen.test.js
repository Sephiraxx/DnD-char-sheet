const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const B = require('../board-core.js');
const G = require('../board-gen.js');

const codes = new Set(B.TERRAIN.map(t => t.code));
// Casillas por las que se puede caminar, unidas entre sí desde la primera.
function reachable(m) {
  const open = c => !B.terrainType(c).blocks && c !== '.' && c !== 'p',
    cells = m.terrain,
    start = [...cells].findIndex(open),
    seen = new Uint8Array(cells.length),
    stack = [start];
  let n = 0;
  seen[start] = 1;
  while (stack.length) {
    const i = stack.pop(),
      x = i % m.cols,
      y = (i / m.cols) | 0;
    n++;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx,
        ny = y + dy,
        j = ny * m.cols + nx;
      if (nx < 0 || ny < 0 || nx >= m.cols || ny >= m.rows || seen[j]) continue;
      // Las puertas se cruzan.
      if (open(cells[j]) || cells[j] === 'D') {
        seen[j] = 1;
        stack.push(j);
      }
    }
  }
  return n / [...cells].filter(c => open(c) || c === 'D').length;
}

test('generador de mapas: todos los tipos y tamaños dan terreno válido y repetible', () => {
  for (const [type] of G.TYPES)
    for (const size of Object.keys(G.SIZES))
      for (const seed of [1, 2, 99]) {
        const m = G.generate(type, { size, seed });
        assert.equal(m.terrain.length, m.cols * m.rows, type);
        assert.deepEqual([m.cols, m.rows], G.SIZES[size].slice(1), type);
        for (const c of m.terrain) assert.ok(codes.has(c), `${type}: código ${c}`);
        assert.equal(G.generate(type, { size, seed }).terrain, m.terrain, type + ' no es repetible');
        // Queda lugar para jugar: al menos un 30 % del mapa se puede pisar (una mazmorra, entre muros, algo menos).
        const open = [...m.terrain].filter(c => !B.terrainType(c).blocks && c !== '.').length;
        assert.ok(
          open / m.terrain.length > (type === 'dungeon' ? 0.18 : 0.3),
          `${type} ${size} ${seed}: muy cerrado (${open})`,
        );
      }
  assert.notEqual(G.generate('woods', { seed: 1 }).terrain, G.generate('woods', { seed: 2 }).terrain);
  assert.throws(() => G.generate('spaceship'), /no existe/);
});

test('generador de mapas: cavernas y mazmorras quedan conectadas', () => {
  for (const type of ['cave', 'dungeon', 'tavern', 'castle'])
    for (let seed = 1; seed <= 25; seed++) {
      const m = G.generate(type, { seed });
      assert.ok(reachable(m) > (type === 'cave' ? 0.97 : 0.99), `${type} ${seed}: ${reachable(m)}`);
    }
  // Una mazmorra tiene salas, muros y alguna puerta.
  const d = G.generate('dungeon', { seed: 4 });
  for (const c of ['f', '#', 'D']) assert.ok(d.terrain.includes(c), c);
});

test('el generador se carga en las pantallas con mapa y queda disponible sin conexión', () => {
  const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
  for (const f of ['index.html', 'dm.html', 'board.html']) {
    const h = read(f);
    assert.ok(
      h.indexOf('board-gen.js') > h.indexOf('board-art.js') && h.indexOf('board-gen.js') < h.indexOf('./board.js'),
      f,
    );
  }
  assert.match(read('sw.js'), /'\.\/board-gen\.js'/);
});

test('generador: los mapas techados traen una escalera y cada tipo su ambiente', () => {
  for (const type of ['dungeon', 'castle', 'tavern', 'ship']) {
    let withStairs = 0;
    for (let seed = 1; seed <= 12; seed++) if (G.generate(type, { seed }).terrain.includes('S')) withStairs++;
    assert.ok(withStairs >= 10, `${type}: ${withStairs} de 12 con escalera`);
  }
  assert.ok(!G.generate('woods', { seed: 3 }).terrain.includes('S'));
  assert.equal(G.ambient('tavern'), 'tavern');
  assert.equal(G.ambient('ship'), 'sea');
  assert.equal(G.ambient('nada'), '');
});
