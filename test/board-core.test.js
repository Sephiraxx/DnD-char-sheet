const test = require('node:test');
const assert = require('node:assert/strict');
const B = require('../board-core.js');

const g = B.normGrid({ cols: 6, rows: 4 });

test('los ocho rumbos giran alrededor del centro de cada huella', () => {
  assert.deepEqual(
    [
      [0, 1],
      [-1, 1],
      [-1, 0],
      [-1, -1],
      [0, -1],
      [1, -1],
      [1, 0],
      [1, 1],
    ].map(([x, y]) => B.headingTo(x, y)),
    [0, 1, 2, 3, 4, 5, 6, 7],
  );
  assert.equal(B.headingDelta(7, 0), 1);
  assert.equal(B.headingDelta(0, 7), -1);
  assert.equal(B.facingTo({ x: 0, y: 0, size: 4 }, { x: 4, y: 1.5, size: 1 }), 6);
  assert.equal(B.normGrid().size, 64);
  assert.deepEqual(B.normGrid({ rotation: { mode: 'enemy', marker: true, playerMonsters: true } }).rotation, {
    mode: 'enemy',
    marker: true,
    playerMonsters: true,
  });
});

test('cuatro fichas diminutas encajan en la misma casilla sin superponerse', () => {
  const grid = B.normGrid({ cols: 1, rows: 1 });
  const tokens = [];
  for (let i = 0; i < 4; i++) {
    const spot = B.freeSpot(grid, tokens, { x: 0, y: 0 }, '.', 0.5);
    const next = { ...spot, size: 0.5 };
    assert.ok(B.roomFor(grid, '.', next, tokens));
    tokens.push(next);
  }
  assert.ok(!B.roomFor(grid, '.', { x: 0, y: 0, size: 0.5 }, tokens));
  assert.equal(B.gap({ x: 0.5, y: 0.5, size: 0.5 }, { x: 0, y: 1, size: 1 }), 1);
});

test('se selecciona y ordena por la huella aunque el centro de la figura quede más arriba', () => {
  const huge = { id: 'huge', x: 1, y: 0, size: 3 };
  const medium = { id: 'medium', x: 4, y: 1.9, size: 1 };
  const tiny = { id: 'tiny', x: 0.5, y: 1.5, size: 0.5 };
  assert.deepEqual(B.footprintRect(huge), { x: 1, y: 0, right: 4, bottom: 3, span: 3 });
  assert.ok(B.depthOrder(huge, { ...medium, y: 1.49 }) > 0);
  assert.ok(B.inFootprint(huge, 3.99, 2.99));
  assert.ok(!B.inFootprint(huge, 4, 2.99));
  assert.ok(B.inFootprint(tiny, 0.5, 1.5));
  assert.ok(!B.inFootprint(tiny, 0.49, 1.5));
  assert.equal(B.moveTo(g, '', [{ x: 0.5, y: 0, ft: 0 }], { x: 1, y: 0.5 }, 5, 0.5).cost, 2.5);
});

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

test('luces: en un mapa a oscuras se ve lo que una antorcha alumbra, si está a la vista', () => {
  const g = B.normGrid({ cols: 30, rows: 10 }),
    open = '.'.repeat(300),
    viewer = [{ x: 2.5, y: 5.5, range: 2 }],
    torch = [{ x: 20.5, y: 5.5, range: 3 }];
  assert.equal(B.lightFeet('light:40'), 40);
  assert.equal(B.lightFeet('enc:a:b'), 0);
  assert.equal(B.lightFeet('light:9999'), 0);
  const dark = B.sight(g, open, [], viewer, []),
    lit = B.sight(g, open, [], viewer, torch),
    at = (bits, x, y) => bits[y * 30 + x];
  assert.equal(at(dark, 20, 5), 0);
  assert.equal(at(lit, 20, 5), 1); // la antorcha lejana se ve
  assert.equal(at(lit, 22, 5), 1);
  assert.equal(at(lit, 10, 5), 0); // el tramo oscuro del medio, no
  assert.equal(at(lit, 3, 5), 1); // lo cercano sigue viéndose
  // Con un muro entre el observador y la antorcha, su luz no se ve.
  const wall = B.sight(g, open, [[12, 0, 12, 10, 0]], viewer, torch);
  assert.equal(at(wall, 20, 5), 0);
  // Y la luz no atraviesa muros: detrás de una pared pegada a la antorcha queda oscuro.
  const behind = B.sight(g, open, [[22, 0, 22, 10, 0]], viewer, torch);
  assert.equal(at(behind, 21, 5), 1);
  assert.equal(at(behind, 22, 5), 0);
});

test('puertas: abrir y cerrar; la trabada no se mueve; la abierta deja ver', () => {
  const g2 = B.normGrid({ cols: 5, rows: 3 });
  let t = B.cells(g2, '..#....D....#..'.replace(/\./g, 'f'));
  assert.equal(B.at(g2, t, 2, 1), 'D');
  const shut = B.sight(g2, t, [], [{ x: 0, y: 1, r: 10 }], []);
  t = B.toggleDoor(g2, t, 2, 1);
  assert.equal(B.at(g2, t, 2, 1), 'O');
  const open = B.sight(g2, t, [], [{ x: 0, y: 1, r: 10 }], []);
  const count = bits => Array.from(bits).filter(Boolean).length;
  assert.ok(count(open) > count(shut), 'con la puerta abierta se ve más');
  assert.equal(B.at(g2, B.toggleDoor(g2, t, 2, 1), 2, 1), 'D');
  const locked = B.paint(g2, t, [[2, 1]], 'L');
  assert.equal(B.toggleDoor(g2, locked, 2, 1), null);
  assert.equal(B.toggleDoor(g2, t, 0, 0), null);
  assert.ok(B.isDoor('L') && B.isDoor('O') && !B.isDoor('#'));
  assert.ok(B.terrainType('L').blocks && !B.terrainType('O').blocks);
});

test('escaleras: los destinos solo valen sobre una escalera; se llega junto a la que vuelve', () => {
  const g2 = B.normGrid({ cols: 4, rows: 2 });
  const t = B.cells(g2, 'fSff' + 'fffS');
  const raw = { '1,0': 'mapa-a', '3,1': 'mapa-b', '0,0': 'mapa-c', 'x,y': 'no', '2,0': 7 };
  assert.deepEqual(B.links(g2, t, raw), { '1,0': 'mapa-a', '3,1': 'mapa-b' });
  assert.deepEqual(B.arrival(g2, t, raw, 'mapa-b'), [3, 1]);
  assert.deepEqual(B.arrival(g2, t, raw, 'otro'), [1, 0]);
  assert.equal(B.arrival(g2, B.cells(g2, ''), {}, 'x'), null);
  assert.deepEqual(B.links(g2, t, null), {});
});

test('sonido de ambiente: se guarda en la cuadrícula si es un nombre simple', () => {
  assert.equal(B.normGrid({ ambient: 'tavern' }).ambient, 'tavern');
  assert.equal(B.normGrid({ ambient: '<b>' }).ambient, '');
  assert.equal(B.normGrid().ambient, '');
});

test('heavily obscured clouds block sight inside and across them, even with lighting beyond', () => {
  const grid = B.normGrid({ cols: 16, rows: 9 });
  const viewer = { x: 2.5, y: 4.5, range: Infinity };
  const clouds = [{ x: 7, y: 4.5, r: 2 }];
  const direct = B.sight(grid, '', [], [viewer], [], clouds);
  const cell = (bits, x, y) => bits[y * grid.cols + x];
  assert.equal(cell(direct, 4, 4), 1);
  assert.equal(cell(direct, 7, 4), 0);
  assert.equal(cell(direct, 11, 4), 0);
  assert.equal(cell(B.sight(grid, '', [], [viewer], []), 11, 4), 1);
  const lit = B.sight(grid, '', [], [{ ...viewer, range: 1 }], [{ x: 11.5, y: 4.5, range: 5 }], clouds);
  assert.equal(cell(lit, 11, 4), 0);
  assert.equal(cell(B.sight(grid, '', [], [viewer, { x: 13.5, y: 4.5, range: Infinity }], [], clouds), 11, 4), 1);
});

test('paredes dibujadas: la puerta abierta y la ventana dejan ver; la cerrada y la trabada, no', () => {
  const grid = B.normGrid({ cols: 10, rows: 3 });
  const eye = [{ x: 1.5, y: 1.5, range: Infinity }];
  const behind = kind => B.visibleCells(grid, '', [[5, 0, 5, 3, kind]], eye)[1 * 10 + 7];
  assert.equal(behind(B.WALL.wall), 0);
  assert.equal(behind(B.WALL.door), 0);
  assert.equal(behind(B.WALL.locked), 0);
  assert.equal(behind(B.WALL.open), 1);
  assert.equal(behind(B.WALL.window), 1);
  // «Revelar sala» pasa por la puerta abierta, no por la ventana.
  assert.ok(B.room(grid, '', [[5, 0, 5, 3, B.WALL.open]], 1, 1).some(([x]) => x === 7));
  assert.ok(!B.room(grid, '', [[5, 0, 5, 3, B.WALL.window]], 1, 1).some(([x]) => x === 7));
});

test('importa Universal VTT: las puertas abiertas quedan abiertas', () => {
  const m = B.parseUVTT({
    resolution: { map_origin: { x: 0, y: 0 }, map_size: { x: 4, y: 4 }, pixels_per_grid: 70 },
    portals: [
      {
        bounds: [
          { x: 1, y: 0 },
          { x: 2, y: 0 },
        ],
        closed: false,
      },
    ],
    image: 'iVBORw0KGgo=',
  });
  assert.equal(m.walls[0][4], B.WALL.open);
  assert.equal(B.blocksSight(m.walls[0]), false);
  assert.equal(B.blocksMove(m.walls[0]), false);
});

test('paredes guardadas: se descartan las rotas y se respeta el tipo', () => {
  assert.deepEqual(
    B.normWalls([[0, 0, 2, 0], [1, 1, 1, 1, 0], ['a', 0, 1, 1], [0, 0, 1.23456, 3, 9], [0, 0, 0, 2, 4], 'x']),
    [
      [0, 0, 2, 0, 0],
      [0, 0, 1.23, 3, 0],
      [0, 0, 0, 2, 4],
    ],
  );
  assert.deepEqual(B.normWalls(null), []);
});

test('puertas dibujadas: abrir, cerrar, trabar y encontrarlas tocando cerca', () => {
  const walls = [
    [0, 0, 4, 0, B.WALL.wall],
    [4, 0, 5, 0, B.WALL.door],
    [5, 0, 6, 0, B.WALL.locked],
  ];
  const open = B.toggleWallDoor(walls, 1);
  assert.equal(open[1][4], B.WALL.open);
  assert.equal(B.toggleWallDoor(open, 1)[1][4], B.WALL.door);
  assert.equal(B.toggleWallDoor(walls, 2), null, 'la trabada no se mueve');
  assert.equal(B.toggleWallDoor(walls, 0), null, 'una pared no es una puerta');
  assert.equal(walls[1][4], B.WALL.door, 'no cambia la lista original');
  assert.equal(B.nearestWall(walls, 4.5, 0.2, 0.4, B.isWallDoor), 1);
  assert.equal(B.nearestWall(walls, 2, 0.2, 0.4, B.isWallDoor), -1);
  assert.equal(B.nearestWall(walls, 2, 0.2), 0);
  assert.equal(B.setWallKind(walls, 2, B.WALL.door)[2][4], B.WALL.door);
  assert.ok(Math.abs(B.wallDistance(walls[0], 2, 1) - 1) < 1e-9);
});

test('dibujar una puerta encima de una pared la corta', () => {
  let walls = B.addWall([], [0, 2, 6, 2, B.WALL.wall]);
  walls = B.addWall(walls, [2, 2, 3, 2, B.WALL.door]);
  assert.deepEqual(walls, [
    [0, 2, 2, 2, 0],
    [3, 2, 6, 2, 0],
    [2, 2, 3, 2, 1],
  ]);
  // Una ventana en la punta deja un solo tramo de pared; una que no está sobre la recta no corta nada.
  assert.deepEqual(B.addWall([[0, 0, 4, 0, 0]], [3, 0, 4, 0, B.WALL.window]).slice(0, 1), [[0, 0, 3, 0, 0]]);
  assert.equal(B.addWall([[0, 0, 4, 0, 0]], [1, 1, 2, 1, B.WALL.door]).length, 2);
  // Una pared nueva no corta otra pared, y un punto no es un tramo.
  assert.equal(B.addWall([[0, 0, 4, 0, 0]], [1, 0, 2, 0, B.WALL.wall]).length, 2);
  assert.equal(B.addWall([], [1, 1, 1, 1, 0]).length, 0);
  // La puerta corta las dos paredes que tapa, aunque cruce su unión.
  assert.deepEqual(
    B.addWall(
      [
        [0, 0, 2, 0, 0],
        [2, 0, 4, 0, 0],
      ],
      [1, 0, 3, 0, B.WALL.door],
    ).map(w => w.slice(0, 4)),
    [
      [0, 0, 1, 0],
      [3, 0, 4, 0],
      [1, 0, 3, 0],
    ],
  );
});

test('apoyar puntos: primero en el extremo de una pared cercana, después en la esquina de casilla', () => {
  const walls = [[1.37, 2.41, 5, 2.41, 0]];
  assert.deepEqual(B.snapWallPoint(walls, { x: 1.5, y: 2.5 }), { x: 1.37, y: 2.41 });
  assert.deepEqual(B.snapWallPoint(walls, { x: 3.4, y: 0.6 }), { x: 3, y: 1 });
  assert.deepEqual(B.snapWallPoint(walls, { x: 3.456, y: 0.6 }, false), { x: 3.46, y: 0.6 });
});

test('las paredes siguen al dibujo al cambiar el tamaño o el desfase de la cuadrícula', () => {
  const from = B.normGrid({ size: 70, ox: 0, oy: 0 }),
    to = B.normGrid({ size: 35, ox: 35, oy: -35 });
  // La esquina en (2,1) casillas está en el píxel (140,70) de la imagen: con la cuadrícula nueva, (3,3).
  assert.deepEqual(B.regridWalls([[2, 1, 4, 1, 1]], from, to), [[3, 3, 7, 3, 1]]);
  const same = [[1, 1, 2, 1, 0]];
  assert.equal(B.regridWalls(same, from, from), same);
});

test('movimiento: una pared o una puerta cerrada cortan el camino; una abierta, no', () => {
  const wall = kind => [[3, 0, 3, 5, kind]];
  const path = [
    { x: 1, y: 2 },
    { x: 2, y: 2 },
    { x: 3, y: 2 },
    { x: 4, y: 2 },
  ];
  assert.ok(B.wallOnPath(wall(B.WALL.wall), path));
  assert.ok(B.wallOnPath(wall(B.WALL.door), path));
  assert.ok(B.wallOnPath(wall(B.WALL.window), path), 'por una ventana no se pasa');
  assert.equal(B.wallOnPath(wall(B.WALL.open), path), null);
  assert.equal(B.wallOnPath(wall(B.WALL.wall), path.slice(0, 2)), null, 'llegar hasta la pared sí');
  // Por la abertura entre dos tramos se pasa; rozando en diagonal la punta de una pared, no.
  const gap = [
    [3, 0, 3, 2, 0],
    [3, 3, 3, 5, 0],
  ];
  assert.equal(B.wallOnPath(gap, path), null);
  assert.ok(
    B.wallOnPath(gap, [
      { x: 2, y: 0 },
      { x: 3, y: 1 },
    ]),
  );
  // Se mide desde el centro del espacio de la ficha: una grande pasa junto a la punta que a una mediana la frena.
  const stub = [[0, 2, 1.8, 2, 0]],
    down = [
      { x: 1, y: 0 },
      { x: 1, y: 2 },
    ];
  assert.ok(B.wallOnPath(stub, down, 1));
  assert.equal(B.wallOnPath(stub, down, 2), null);
});

test('polígono de visión: una pared tapa lo de atrás, la caja limita y se ve por la abertura', () => {
  const box = { x0: 0, y0: 0, x1: 10, y1: 10 };
  const open = B.visibilityPolygon(2, 5, [], box);
  assert.ok(B.inPolygon(open, 9, 9) && B.inPolygon(open, 0.5, 0.5));
  assert.ok(!B.inPolygon(open, 11, 5), 'fuera de la caja no');
  // Pared en x=5 con una abertura entre y=4 y y=6.
  const walls = [
    [5, 0, 5, 4],
    [5, 6, 5, 10],
  ];
  const poly = B.visibilityPolygon(2, 5, walls, box);
  assert.ok(B.inPolygon(poly, 4, 1), 'de este lado se ve todo');
  assert.ok(B.inPolygon(poly, 8, 5), 'por la abertura, de frente');
  assert.ok(!B.inPolygon(poly, 8, 1), 'detrás de la pared, no');
  assert.ok(!B.inPolygon(poly, 9, 9.5));
  // El borde del cono que pasa por la abertura sale de la punta de la pared, no de una casilla.
  assert.ok(B.inPolygon(poly, 8, 5 + (6 - 5) * (6 / 3) - 0.1));
  assert.ok(!B.inPolygon(poly, 8, 5 + (6 - 5) * (6 / 3) + 0.1));
  // Muchas paredes: el resultado sigue siendo correcto con las cubetas.
  const many = [];
  for (let i = 0; i < 400; i++)
    many.push([20 + (i % 20), 1 + Math.floor(i / 20), 20.5 + (i % 20), 1 + Math.floor(i / 20)]);
  const far = B.visibilityPolygon(2, 5, [...many, [5, 0, 5, 4], [5, 6, 5, 50]], { x0: 0, y0: 0, x1: 50, y1: 50 });
  assert.ok(B.inPolygon(far, 15, 5) && !B.inPolygon(far, 15, 30));
});

test('bordes de muros pintados: tramos largos en vez de uno por casilla', () => {
  const grid = B.normGrid({ cols: 6, rows: 3 });
  const segs = B.sightBlockers(grid, B.cells(grid, '......' + '.####.' + '......'));
  assert.equal(segs.length, 4);
  assert.deepEqual(segs.map(s => s.join()).sort(), ['1,1,1,2', '1,1,5,1', '1,2,5,2', '5,1,5,2']);
});

test('niveles de luz: brillante cerca de la antorcha, penumbra después; la visión en la oscuridad sube un nivel', () => {
  const grid = B.normGrid({ cols: 30, rows: 3 });
  const torch = [{ x: 20.5, y: 1.5, bright: 4, dim: 8 }];
  const at = (levels, x) => levels[1 * 30 + x];
  const human = B.sightLevels(grid, '', [], [{ x: 2.5, y: 1.5, range: 0 }], torch);
  assert.equal(at(human, 21), 2);
  assert.equal(at(human, 26), 1);
  assert.equal(at(human, 29), 0);
  assert.equal(at(human, 8), 0, 'la oscuridad entre medio no se ve');
  // Visión en la oscuridad de 30 pies (6 casillas): la oscuridad cercana como penumbra.
  const elf = B.sightLevels(grid, '', [], [{ x: 2.5, y: 1.5, range: 6 }], torch);
  assert.equal(at(elf, 6), 1);
  assert.equal(at(elf, 10), 0);
  const close = B.sightLevels(grid, '', [], [{ x: 22.5, y: 1.5, range: 6 }], torch);
  assert.equal(at(close, 26), 2, 'la penumbra al alcance de la visión en la oscuridad se ve como luz brillante');
  // Sin luces, solo la visión en la oscuridad.
  assert.equal(at(B.sightLevels(grid, '', [], [{ x: 2.5, y: 1.5, range: 6 }], []), 4), 1);
  assert.equal(B.sightLevels(grid, '', [], [], torch).some(Boolean), false);
});

test('zonas de luz: pintadas sobre un mapa a oscuras o iluminado', () => {
  const grid = B.normGrid({ cols: 4, rows: 1 });
  assert.equal(B.ambientCells(grid, 'bx'), 'b...');
  assert.deepEqual(Array.from(B.ambientLevels(grid, 'bdn.', true)), [2, 1, 0, 0]);
  assert.deepEqual(Array.from(B.ambientLevels(grid, 'bdn.', false)), [2, 1, 0, 2]);
  assert.ok(B.ambientMatters('..b.', true) && !B.ambientMatters('..b.', false) && B.ambientMatters('n', false));
  // Una zona iluminada lejos se ve si está a la vista, aunque no haya ninguna luz.
  const row = B.normGrid({ cols: 20, rows: 1 });
  const lit = B.ambientLevels(row, '.'.repeat(15) + 'bbbbd', true);
  const levels = B.sightLevels(row, '', [], [{ x: 0.5, y: 0.5, range: 0 }], [], [], lit);
  assert.deepEqual(Array.from(levels.slice(10)), [0, 0, 0, 0, 0, 2, 2, 2, 2, 1]);
  const walled = B.sightLevels(row, '', [[12, 0, 12, 1, 0]], [{ x: 0.5, y: 0.5, range: 0 }], [], [], lit);
  assert.equal(walled[16], 0, 'detrás de una pared no');
});

test('luces fijas y luz de los monstruos: se descartan las inválidas', () => {
  const grid = B.normGrid({ cols: 10, rows: 10 });
  assert.deepEqual(B.normLights(grid, [[1, 2, 40], [11, 2, 40], [1.234, 2, 33], 'x', [3, 3, 9999]]), [
    [1, 2, 40],
    [1.23, 2, 35],
    [3, 3, 300],
  ]);
  assert.deepEqual(B.normTokenLights({ abc: 40, 'a b': 40, def: 0, ghi: 999 }), { abc: 40 });
  assert.deepEqual(B.normTokenLights([1]), {});
});

test('importa Universal VTT: las luces del archivo quedan como luces fijas', () => {
  const m = B.parseUVTT({
    resolution: { map_origin: { x: 1, y: 0 }, map_size: { x: 8, y: 8 }, pixels_per_grid: 70 },
    lights: [
      { position: { x: 3, y: 4 }, range: 6 },
      { position: { x: 2, y: 2 }, range: 0 },
    ],
    image: 'iVBORw0KGgo=',
  });
  assert.deepEqual(m.lights, [[2, 4, 30]]);
});

test('visión precalculada: al abrir una puerta se reutiliza lo que no la ve, con el mismo resultado', () => {
  const grid = B.normGrid({ cols: 30, rows: 10 });
  const base = [
    [10, 0, 10, 4, 0],
    [10, 5, 10, 10, 0],
    [20, 0, 20, 10, 0],
  ];
  const shut = [...base, [10, 4, 10, 5, B.WALL.door]],
    open = [...base, [10, 4, 10, 5, B.WALL.open]];
  const near = { x: 5.5, y: 4.5 },
    far = { x: 25.5, y: 4.5 };
  const before = B.sightContext(grid, '', shut);
  before.visible(near.x, near.y, Infinity);
  before.visible(far.x, far.y, Infinity);
  const after = B.sightContext(grid, '', open, before);
  assert.ok(after.polys.has('25.5,4.5,all'), 'el del otro cuarto se conserva');
  assert.ok(!after.polys.has('5.5,4.5,all'), 'el que veía la puerta se recalcula');
  const fresh = B.sightContext(grid, '', open);
  for (const p of [near, far])
    assert.deepEqual(Array.from(after.visible(p.x, p.y, Infinity)), Array.from(fresh.visible(p.x, p.y, Infinity)));
  assert.equal(after.visible(near.x, near.y, Infinity)[4 * 30 + 15], 1, 'por la puerta abierta se ve');
});
