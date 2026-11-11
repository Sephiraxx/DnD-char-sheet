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

// ---------- Combate en el tablero ----------
const tok = (id, x, y, size = 1) => ({ id, x, y, size });

test('distancia de borde a borde, también con criaturas grandes', () => {
  assert.equal(B.gap(tok('a', 0, 0), tok('b', 1, 1)), 1);
  assert.equal(B.distanceFt(tok('a', 0, 0), tok('b', 3, 0)), 15);
  // Un ogro (2×2) en 2,2 ocupa 2..3: un héroe en 4,4 está adyacente en diagonal.
  assert.equal(B.gap(tok('o', 2, 2, 2), tok('h', 4, 4)), 1);
  assert.ok(B.inReach(tok('o', 2, 2, 2), tok('h', 4, 4)));
  assert.ok(!B.inReach(tok('a', 0, 0), tok('b', 2, 0)));
  assert.ok(B.inReach(tok('a', 0, 0), tok('b', 2, 0), 10), 'alcance 10 pies');
  assert.ok(!B.inReach(tok('a', 0, 0), tok('a2', 0, 0)), 'la misma casilla no cuenta');
});

test('flanqueo de la Guía del DM: lados y esquinas opuestos', () => {
  const g = tok('g', 5, 5);
  assert.ok(B.flanks(tok('a', 4, 5), tok('b', 6, 5), g), 'izquierda y derecha');
  assert.ok(B.flanks(tok('a', 5, 4), tok('b', 5, 6), g), 'arriba y abajo');
  assert.ok(B.flanks(tok('a', 4, 4), tok('b', 6, 6), g), 'esquinas opuestas');
  assert.ok(!B.flanks(tok('a', 4, 5), tok('b', 5, 4), g), 'en ángulo recto no');
  assert.ok(!B.flanks(tok('a', 4, 4), tok('b', 6, 5), g), 'esquina y lado no opuestos');
  assert.ok(!B.flanks(tok('a', 3, 5), tok('b', 6, 5), g), 'el atacante tiene que estar adyacente');
  // Objetivo grande (2×2 en 5,5): opuestos en sus lados largos.
  const o = tok('o', 5, 5, 2);
  assert.ok(B.flanks(tok('a', 4, 6), tok('b', 7, 5), o));
  assert.ok(!B.flanks(tok('a', 4, 6), tok('b', 6, 7), o));
  assert.equal(B.flankingAlly(tok('a', 4, 5), g, [tok('a', 4, 5), tok('x', 9, 9), tok('b', 6, 5)]).id, 'b');
});

test('ataques de oportunidad: al salir del alcance, no al moverse dentro', () => {
  const goblin = { token: tok('g', 5, 5), reach: 5 };
  const hero = tok('h', 4, 5);
  // Se aleja: provoca.
  assert.equal(B.provokers(hero, B.steps({ x: 4, y: 5 }, { x: 1, y: 5 }), [goblin]).length, 1);
  // Lo rodea sin salir del alcance: no provoca.
  assert.equal(
    B.provokers(
      hero,
      [
        { x: 4, y: 5 },
        { x: 4, y: 4 },
        { x: 5, y: 4 },
        { x: 6, y: 4 },
      ],
      [goblin],
    ).length,
    0,
  );
  // Llega desde lejos: no provoca.
  assert.equal(B.provokers(tok('h', 1, 5), B.steps({ x: 1, y: 5 }, { x: 4, y: 5 }), [goblin]).length, 0);
  // Con alcance 10 no basta con alejarse una casilla.
  assert.equal(
    B.provokers(
      hero,
      [
        { x: 4, y: 5 },
        { x: 3, y: 5 },
      ],
      [{ token: goblin.token, reach: 10 }],
    ).length,
    0,
  );
  assert.equal(
    B.provokers(hero, B.steps({ x: 4, y: 5 }, { x: 2, y: 5 }), [{ token: goblin.token, reach: 10 }]).length,
    1,
  );
  // Cada enemigo reacciona una sola vez, aunque entre y salga.
  const zig = [
    { x: 4, y: 5 },
    { x: 3, y: 5 },
    { x: 4, y: 5 },
    { x: 3, y: 5 },
  ];
  assert.equal(B.provokers(hero, zig, [goblin]).length, 1);
});

test('alcance de monstruos a partir del texto de sus acciones', () => {
  assert.equal(B.reachFromText(['Ataque con arma cuerpo a cuerpo: +5 al ataque, alcance 10 pies, un objetivo.']), 10);
  assert.equal(B.reachFromText(['Melee Weapon Attack: +4 to hit, reach 5 ft., one target.', 'Ranged 80/320 ft.']), 5);
  assert.equal(B.reachFromText([]), 5);
});

test('movimiento del turno: costo, terreno difícil, límite y volver atrás', () => {
  const g = B.normGrid({ cols: 10, rows: 3 });
  const t = B.paint(g, '', [[3, 0]], 'w');
  assert.equal(B.pathCost(g, '', B.steps({ x: 0, y: 0 }, { x: 4, y: 0 })), 20);
  assert.equal(B.pathCost(g, t, B.steps({ x: 0, y: 0 }, { x: 4, y: 0 })), 25, 'el agua cuesta el doble');
  let pts = [{ x: 0, y: 0, ft: 0 }];
  let r = B.moveTo(g, '', pts, { x: 4, y: 0 }, 30);
  assert.ok(r.ok);
  assert.equal(r.used, 20);
  pts = r.pts;
  r = B.moveTo(g, '', pts, { x: 7, y: 0 }, 30);
  assert.ok(!r.ok, 'se pasa de 30 pies');
  assert.equal(r.left, 10);
  r = B.moveTo(g, '', pts, { x: 0, y: 0 }, 30);
  assert.ok(r.ok);
  assert.equal(r.used, 0, 'volver al inicio devuelve el movimiento');
  assert.equal(r.pts.length, 1);
});

test('áreas de efecto: esfera, cono, línea y cubo cubren las casillas esperadas', () => {
  const g = B.normGrid({ cols: 20, rows: 20 });
  // Radio de 20 pies desde una intersección: 4 casillas hacia cada lado.
  const circle = B.templateCells(g, { kind: 'circle', x: 10, y: 10, feet: 20 });
  assert.equal(circle.length, 52);
  assert.ok(circle.every(([x, y]) => Math.hypot(x + 0.5 - 10, y + 0.5 - 10) <= 4));
  // Cono de 15 pies hacia la derecha: se abre, no toca detrás del origen.
  const cone = B.templateCells(g, { kind: 'cone', x: 10, y: 10.5, dir: 0, feet: 15 });
  assert.ok(cone.every(([x]) => x >= 10 && x <= 12));
  assert.ok(cone.some(([x, y]) => x === 12 && y === 9) && cone.some(([x, y]) => x === 12 && y === 11));
  // Línea de 30 × 5 pies: seis casillas en fila.
  assert.deepEqual(
    B.templateCells(g, { kind: 'line', x: 10, y: 10.5, dir: 0, feet: 30, width: 5 }),
    [10, 11, 12, 13, 14, 15].map(x => [x, 10]),
  );
  assert.equal(B.templateCells(g, { kind: 'cube', x: 10, y: 10, dir: 0, feet: 10 }).length, 4);
  const hits = B.templateHits(g, { kind: 'circle', x: 10, y: 10, feet: 10 }, [
    { name: 'a', x: 9, y: 9, size: 1 },
    { name: 'b', x: 15, y: 15, size: 1 },
    { name: 'grande', x: 12, y: 9, size: 2 },
  ]);
  assert.deepEqual(
    hits.map(t => t.name),
    ['a'],
  );
});

test('línea de visión: los muros tapan, las aberturas dejan ver y la oscuridad limita el alcance', () => {
  const g = B.normGrid({ cols: 20, rows: 12 });
  let t = '.'.repeat(240).split('');
  for (let y = 0; y < 12; y++) if (y !== 5) t[y * 20 + 10] = '#';
  t = t.join('');
  const v = B.visibleCells(g, t, [], [{ x: 5.5, y: 5.5, range: Infinity }]),
    at = (x, y) => v[y * 20 + x];
  assert.equal(at(3, 2), 1); // mismo cuarto
  assert.equal(at(10, 2), 1); // la cara del muro se ve
  assert.equal(at(15, 5), 1); // por la abertura
  assert.equal(at(15, 1), 0); // detrás del muro
  // Pared importada (segmento) entre el observador y el fondo.
  const w = B.visibleCells(g, '.'.repeat(240), [[8, 0, 8, 12, 0]], [{ x: 5.5, y: 5.5, range: Infinity }]);
  assert.equal(w[5 * 20 + 7], 1);
  assert.equal(w[5 * 20 + 9], 0);
  // A oscuras: solo hasta el alcance.
  const d = B.visibleCells(g, '.'.repeat(240), [], [{ x: 5.5, y: 5.5, range: 2 }]);
  assert.equal(d[5 * 20 + 7], 1);
  assert.equal(d[5 * 20 + 9], 0);
  assert.equal(B.normGrid({ vision: { los: true, light: 9999 } }).vision.light, 600);
  assert.equal(B.distance3d({ x: 0, y: 0, size: 1, elev: 30 }, { x: 2, y: 0, size: 1 }), 30);
});
