const test = require('node:test');
const assert = require('node:assert/strict');
const B = require('../board-core.js');

const g = B.normGrid({ cols: 6, rows: 4 });

test('cuadrícula normalizada con límites', () => {
  const x = B.normGrid({ cols: 999, rows: 0, size: 2, opacity: 4 });
  assert.equal(x.cols, B.MAX_SIDE);
  assert.equal(x.rows, 1);
  assert.equal(x.size, 8);
  assert.equal(x.opacity, 1);
  assert.equal(B.normGrid().feet, 5);
});

test('terreno: pintar, leer y redimensionar', () => {
  let t = B.cells(g, '');
  assert.equal(t.length, 24);
  t = B.paint(g, t, B.rect(1, 1, 2, 2), 'w');
  assert.equal(B.at(g, t, 1, 1), 'w');
  assert.equal(B.at(g, t, 2, 2), 'w');
  assert.equal(B.at(g, t, 3, 2), '.');
  assert.equal(B.at(g, t, 99, 99), '.');
  t = B.paint(
    g,
    t,
    [
      [-1, 0],
      [6, 0],
    ],
    '#',
  ); // fuera del mapa: se ignora
  assert.equal(t.split('#').length, 1);
  assert.equal(B.outline(0, 0, 2, 2).length, 8);
  assert.ok(B.terrainType('w').difficult);
  assert.ok(B.terrainType('#').blocks);
});

test('niebla: revelar, ocultar y codificar', () => {
  let bits = B.fogBits(g, '');
  assert.equal(B.countRevealed(g, bits), 0);
  bits = B.setFog(g, bits, B.rect(0, 0, 1, 1), true);
  assert.equal(B.countRevealed(g, bits), 4);
  const again = B.fogBits(g, B.fogEncode(bits));
  assert.ok(B.isRevealed(g, again, 1, 1));
  assert.ok(!B.isRevealed(g, again, 2, 2));
  const hidden = B.setFog(g, again, [[0, 0]], false);
  assert.equal(B.countRevealed(g, hidden), 3);
  assert.equal(B.countRevealed(g, B.fogAll(g, true)), 24);
  assert.equal(B.countRevealed(g, B.fogBits(g, '%%no base64%%')), 0);
});

test('revelar sala: se detiene en muros pintados y puertas', () => {
  // ######
  // #..D.#
  // #..#.#
  // ######
  const rows = ['######', '#..D.#', '#..#.#', '######'];
  const t = rows.join('');
  const r = B.room(g, t, [], 1, 1);
  const set = new Set(r.map(c => c.join(',')));
  assert.ok(set.has('2,2'));
  assert.ok(set.has('3,1'), 'la puerta se ve');
  assert.ok(!set.has('4,1'), 'no pasa la puerta');
  assert.ok(set.has('0,0'), 'muros del borde visibles');
});

test('revelar sala: respeta paredes como segmentos (Dungeondraft)', () => {
  const open = B.room(g, '', [], 0, 0);
  assert.equal(open.length, 24);
  // Pared vertical en x=3 de arriba abajo.
  const r = B.room(g, '', [[3, 0, 3, 4, 0]], 0, 0);
  assert.equal(r.length, 12);
  assert.ok(r.every(([x]) => x < 3));
});

test('distancias en pies: diagonales a 5', () => {
  assert.equal(B.feet(g, { x: 0, y: 0 }, { x: 3, y: 4 }), 20);
  assert.equal(B.feet(B.normGrid({ feet: 10 }), { x: 0, y: 0 }, { x: 2, y: 0 }), 20);
  const t = B.paint(g, '', [[2, 0]], 'w');
  assert.ok(B.difficultOnPath(g, t, { x: 0, y: 0 }, { x: 4, y: 0 }));
  assert.ok(!B.difficultOnPath(g, t, { x: 0, y: 1 }, { x: 4, y: 1 }));
});

test('casilla libre para fichas nuevas, evitando ocupadas y muros', () => {
  const t = B.paint(g, '', [[1, 0]], '#');
  const spot = B.freeSpot(g, [{ x: 0, y: 0 }], { x: 0, y: 0 }, t);
  assert.deepEqual(spot, { x: 0, y: 1 });
});

test('iniciales y colores de fichas', () => {
  assert.equal(B.initials('Goblin 3'), 'G3');
  assert.equal(B.initials('Lyra Prueba'), 'LP');
  assert.equal(B.initials('Ánima'), 'Á');
  assert.equal(B.initials(''), '?');
  assert.equal(B.colorFor('x', 'monster'), '#d9534f');
  assert.equal(B.colorFor('abc', 'pc'), B.colorFor('abc', 'pc'));
  assert.equal(B.sizeFor('Grande'), 2);
  assert.equal(B.sizeFor('Huge'), 3);
});

test('importa Universal VTT: cuadrícula, imagen y paredes con puertas', () => {
  const m = B.parseUVTT({
    format: 0.3,
    resolution: { map_origin: { x: 0, y: 0 }, map_size: { x: 10, y: 8 }, pixels_per_grid: 140 },
    line_of_sight: [
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 8 },
      ],
    ],
    portals: [
      {
        bounds: [
          { x: 4, y: 0 },
          { x: 5, y: 0 },
        ],
        closed: true,
      },
    ],
    image: 'iVBORw0KGgo=',
  });
  assert.equal(m.grid.cols, 10);
  assert.equal(m.grid.rows, 8);
  assert.equal(m.grid.size, 140);
  assert.equal(m.walls.length, 3);
  assert.equal(m.walls[2][4], 1, 'puerta cerrada');
  assert.match(m.image, /^data:image\/png;base64,iVBOR/);
  assert.throws(() => B.parseUVTT({ hello: 1 }), /Universal VTT/);
});

test('cuadrícula a partir del tamaño de la imagen', () => {
  const x = B.gridForImage(2100, 1400, 70);
  assert.equal(x.cols, 30);
  assert.equal(x.rows, 20);
});
