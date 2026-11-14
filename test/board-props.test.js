const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const P = require('../board-props.js');
const G = require('../board-gen.js');
const B = require('../board-core.js');

const grid = { cols: 10, rows: 8 };

test('muebles: el catálogo es coherente', () => {
  const ids = new Set();
  const groups = new Set(P.GROUPS.map(g => g[0]));
  assert.ok(P.CATALOG.length >= 50);
  for (const p of P.CATALOG) {
    assert.ok(!ids.has(p.id), 'repetido: ' + p.id);
    ids.add(p.id);
    assert.match(p.id, /^[a-z0-9]+$/);
    assert.ok(p.name && groups.has(p.group), p.id);
    assert.ok(p.w >= 1 && p.w <= 3 && p.h >= 1 && p.h <= 3, p.id);
    assert.equal(typeof p.draw, 'function');
  }
  for (const [g] of P.GROUPS)
    assert.ok(
      P.CATALOG.some(p => p.group === g),
      g,
    );
});

test('muebles: lo guardado se limpia (piezas conocidas, dentro del mapa, sin repetir)', () => {
  const raw = [
    [1, 1, 'table', 0],
    [1, 1, 'table', 0],
    [9, 0, 'table2', 0], // se sale por la derecha
    [9, 0, 'table2', 1], // girada entra: 1×2
    [0, 7, 'bed', 0], // se sale por abajo
    [2, 2, 'nave-espacial', 0],
    ['x', 2, 'chair', 0],
    [3, 3, 'chair', 7], // giro de más: se reduce a 0–3
    'basura',
  ];
  assert.deepEqual(P.norm(grid, raw), [
    [1, 1, 'table', 0],
    [9, 0, 'table2', 1],
    [3, 3, 'chair', 3],
  ]);
  assert.deepEqual(P.norm(grid, null), []);
  assert.equal(
    P.norm(
      grid,
      Array.from({ length: 900 }, (_, i) => [i % 10, ((i / 10) % 8) | 0, 'stool', i % 4]),
    ).length <= P.MAX,
    true,
  );
});

test('muebles: tamaño según el giro, pieza bajo el toque y luces', () => {
  assert.deepEqual(P.footprint('bed', 0), [1, 2]);
  assert.deepEqual(P.footprint('bed', 1), [2, 1]);
  assert.deepEqual(P.footprint('rug', 3), [2, 3]);
  const props = [
    [2, 2, 'rug', 0],
    [3, 2, 'table', 0],
    [6, 5, 'hearth', 0],
  ];
  assert.equal(P.at(props, 3, 2), 1); // la mesa gana sobre la alfombra
  assert.equal(P.at(props, 2, 3), 0);
  assert.equal(P.at(props, 7, 5), 2);
  assert.equal(P.at(props, 0, 0), -1);
  assert.deepEqual(P.lights(props), [{ x: 7, y: 5.5, feet: 30 }]);
  assert.ok(P.fits(grid, 8, 0, 'table2', 0) && !P.fits(grid, 9, 0, 'table2', 0));
});

test('muebles: espejar conserva el lugar y la orientación', () => {
  const props = [
    [0, 0, 'bed', 0],
    [2, 3, 'wardrobe', 1],
  ];
  const h = P.mirror(props, 10, 8, true);
  assert.deepEqual(h, [
    [9, 0, 'bed', 0],
    [7, 3, 'wardrobe', 3],
  ]);
  assert.deepEqual(P.mirror(h, 10, 8, true), props);
  const v = P.mirror(props, 10, 8, false);
  assert.deepEqual(v[0], [0, 6, 'bed', 2]);
  assert.deepEqual(P.mirror(v, 10, 8, false), props);
});

test('generador: los muebles caen dentro del mapa, sobre piso, y se repiten con la semilla', () => {
  for (const [type] of G.TYPES)
    for (const size of Object.keys(G.SIZES))
      for (const seed of [1, 2, 99]) {
        const m = G.generate(type, { size, seed, floors: 3, cellar: true });
        assert.deepEqual(G.generate(type, { size, seed, floors: 3, cellar: true }).floors, m.floors, type);
        for (const f of m.floors) {
          assert.equal(f.terrain.length, m.cols * m.rows);
          assert.deepEqual(P.norm(m, f.props), f.props, `${type}: muebles fuera del mapa`);
          for (const [x, y, id, rot] of f.props) {
            const [w, h] = P.footprint(id, rot);
            for (let j = 0; j < h; j++)
              for (let i = 0; i < w; i++) {
                const c = f.terrain[(y + j) * m.cols + x + i];
                assert.ok(
                  !B.terrainType(c).blocks && !'.SDOLpWl'.includes(c),
                  `${type} ${size} ${seed}: ${id} sobre «${c}»`,
                );
              }
          }
        }
      }
  assert.ok(G.generate('tavern', { seed: 5 }).props.length > 25, 'una taberna tiene muebles');
  assert.ok(G.generate('dungeon', { seed: 5 }).props.length > 4);
});

// Todas las casillas pisables de un piso están unidas (cruzando puertas).
function connected(cols, rows, terrain) {
  const open = c => !B.terrainType(c).blocks && c !== '.',
    pass = c => open(c) || c === 'D',
    start = [...terrain].findIndex(open),
    seen = new Uint8Array(terrain.length),
    stack = [start];
  seen[start] = 1;
  let n = 0;
  while (stack.length) {
    const i = stack.pop();
    n++;
    for (const d of [1, -1, cols, -cols]) {
      const j = i + d;
      if (j < 0 || j >= terrain.length || seen[j] || (Math.abs(d) === 1 && ((j / cols) | 0) !== ((i / cols) | 0)))
        continue;
      if (pass(terrain[j])) {
        seen[j] = 1;
        stack.push(j);
      }
    }
  }
  return n === [...terrain].filter(pass).length;
}

test('generador: una taberna de varios pisos queda unida por sus escaleras', () => {
  for (const size of Object.keys(G.SIZES))
    for (let seed = 1; seed <= 20; seed++)
      for (const [floors, cellar] of [
        [1, false],
        [2, false],
        [3, true],
        [2, true],
      ]) {
        const m = G.generate('tavern', { size, seed, floors, cellar }),
          tag = `${size} ${seed} ${floors}${cellar ? '+s' : ''}`;
        assert.equal(m.floors.length, floors + (cellar ? 1 : 0), tag);
        assert.equal(m.floors[0].name, 'Planta baja');
        m.floors.forEach((f, i) => {
          assert.ok(connected(m.cols, m.rows, f.terrain), `${tag}: ${f.name} tiene un cuarto sin salida`);
          const stairs = [...f.terrain].filter(c => c === 'S').length;
          // Con un solo piso, la escalera de la planta baja queda para que el DM la una a mano.
          if (floors > 1)
            assert.equal(Object.keys(f.links).length, stairs, `${tag}: ${f.name} tiene escaleras sin destino`);
          for (const [key, to] of Object.entries(f.links)) {
            const [x, y] = key.split(',').map(Number);
            assert.equal(f.terrain[y * m.cols + x], 'S', `${tag}: ${f.name} ${key}`);
            // La escalera de vuelta está en la misma casilla del otro piso.
            assert.equal(m.floors[to].links[key], i, `${tag}: ${f.name} → ${m.floors[to].name}`);
          }
        });
        // Desde la planta baja se llega a todos los pisos.
        const reach = new Set([0]);
        for (let k = 0; k < 4; k++)
          for (const i of [...reach]) Object.values(m.floors[i].links).forEach(t => reach.add(t));
        assert.equal(reach.size, m.floors.length, tag);
        if (floors > 1)
          assert.ok(
            m.floors[1].props.some(p => p[2] === 'bed' || p[2] === 'bed2'),
            `${tag}: sin camas`,
          );
      }
});

test('los muebles se cargan antes que el generador y el tablero, y quedan disponibles sin conexión', () => {
  const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
  for (const f of ['index.html', 'dm.html', 'board.html']) {
    const h = read(f);
    assert.ok(h.indexOf('board-props.js') > 0 && h.indexOf('board-props.js') < h.indexOf('board-gen.js'), f);
  }
  assert.match(read('sw.js'), /'\.\/board-props\.js'/);
});
