/* Tablero: lógica sin interfaz (cuadrícula, terreno, niebla, paredes, distancias e importación de mapas).
   La usan board.js en el navegador y los tests en Node. Coordenadas en casillas: (0,0) es la esquina superior izquierda. */
(function (root) {
  'use strict';
  const MAX_SIDE = 200; // casillas por lado

  // ---------- Terreno: una letra por casilla ----------
  // blocks: corta la niebla al revelar una sala. difficult: terreno difícil (se marca al medir).
  const TERRAIN = [
    { code: '.', name: 'Borrar', color: '' },
    { code: 'f', name: 'Piso de piedra', color: '#8b8172' },
    { code: 'm', name: 'Madera', color: '#8a5a33' },
    { code: 'g', name: 'Pasto', color: '#4f7a3a' },
    { code: 'a', name: 'Tierra', color: '#8a6d45' },
    { code: 's', name: 'Arena', color: '#cdb27a' },
    { code: 'w', name: 'Agua', color: '#3f79a8', difficult: true },
    { code: 'W', name: 'Agua profunda', color: '#244f78', difficult: true },
    { code: 'd', name: 'Escombros', color: '#6d6458', difficult: true },
    { code: 'h', name: 'Hielo', color: '#bfe1ee', difficult: true },
    { code: 't', name: 'Árboles', color: '#2f5a2c', difficult: true },
    { code: 'r', name: 'Roca', color: '#55524d', blocks: true },
    { code: '#', name: 'Muro', color: '#2a2724', blocks: true },
    { code: 'D', name: 'Puerta', color: '#a0692e', blocks: true },
    { code: 'O', name: 'Puerta abierta', color: '#c79a5b' },
    { code: 'L', name: 'Puerta trabada', color: '#7a4a1c', blocks: true },
    { code: 'S', name: 'Escalera', color: '#9a9488' },
    { code: 'p', name: 'Abismo', color: '#0d0b0b' },
    { code: 'l', name: 'Lava', color: '#d4501d', difficult: true },
  ];
  const BY_CODE = Object.fromEntries(TERRAIN.map(t => [t.code, t]));
  const terrainType = c => BY_CODE[c] || BY_CODE['.'];
  // Puertas: cerrada (D), abierta (O) o trabada (L). Abrir y cerrar alterna D y O; la trabada no se mueve.
  const isDoor = c => c === 'D' || c === 'O' || c === 'L';
  const DOOR_NEXT = { D: 'O', O: 'D' };
  // Devuelve el terreno con la puerta de (x,y) abierta o cerrada; null si no hay puerta o está trabada.
  function toggleDoor(g, s, x, y) {
    const to = DOOR_NEXT[at(g, s, x, y)];
    return to ? paint(g, s, [[x, y]], to) : null;
  }
  // Escaleras y trampillas que llevan a otro mapa: { 'x,y': idDelMapa }. Se descartan las que ya no pisan una escalera.
  function links(g, s, raw) {
    const out = {};
    if (!raw || typeof raw !== 'object') return out;
    for (const [k, v] of Object.entries(raw)) {
      const m = /^(\d{1,3}),(\d{1,3})$/.exec(k);
      if (!m || typeof v !== 'string' || !v || v.length > 64) continue;
      if (at(g, s, Number(m[1]), Number(m[2])) === 'S') out[k] = v;
    }
    return out;
  }
  // Casilla de escalera de este mapa que lleva al mapa `to` (para aparecer al lado al llegar), o la primera escalera.
  function arrival(g, s, raw, to) {
    const all = links(g, s, raw);
    const hit = Object.entries(all).find(([, v]) => v === to);
    if (hit) return hit[0].split(',').map(Number);
    const i = cells(g, s).indexOf('S');
    return i < 0 ? null : [i % g.cols, Math.floor(i / g.cols)];
  }

  const clampSide = n => Math.max(1, Math.min(MAX_SIDE, Math.round(Number(n) || 1)));
  // Cuadrícula normalizada: cols/rows (casillas), size (px por casilla en la imagen), ox/oy (desfase en px).
  const WEATHER = { clear: 'Despejado', rain: 'Lluvia', storm: 'Tormenta', mist: 'Bruma' };
  function normGrid(g = {}) {
    return {
      cols: clampSide(g.cols ?? 30),
      rows: clampSide(g.rows ?? 20),
      size: Math.max(8, Math.min(1000, Number(g.size) || 64)),
      ox: Number(g.ox) || 0,
      oy: Number(g.oy) || 0,
      feet: Math.max(1, Math.min(100, Number(g.feet) || 5)),
      show: g.show !== false,
      color: typeof g.color === 'string' && /^#[0-9a-f]{6}$/i.test(g.color) ? g.color : '#000000',
      opacity: Math.max(0, Math.min(1, g.opacity ?? 0.35)),
      rotation: {
        mode: ['off', 'travel', 'enemy'].includes(g.rotation?.mode) ? g.rotation.mode : 'travel',
        marker: g.rotation?.marker === true,
        playerMonsters: g.rotation?.playerMonsters === true,
      },
      // Visión: los = los jugadores solo ven lo que sus personajes tienen a la vista; dark = mapa a oscuras
      // (se ve hasta la luz que lleva la party, o hasta la visión en la oscuridad de cada uno).
      vision: {
        los: g.vision?.los === true,
        own: g.vision?.own === true,
        memory: g.vision?.memory === true,
        dark: g.vision?.dark === true,
        light: Math.max(0, Math.min(600, Math.round(Number(g.vision?.light ?? 40)) || 0)),
      },
      weather: typeof g.weather === 'string' && Object.hasOwn(WEATHER, g.weather) ? g.weather : 'clear',
      // Sonido de ambiente del mapa (taberna, cueva…); '' = ninguno.
      ambient: typeof g.ambient === 'string' && /^[a-z]{1,12}$/.test(g.ambient) ? g.ambient : '',
    };
  }
  const inside = (g, x, y) => x >= 0 && y >= 0 && x < g.cols && y < g.rows;

  // Cadena de terreno con exactamente cols*rows letras.
  function cells(g, s = '') {
    const n = g.cols * g.rows;
    s = String(s || '');
    return s.length === n ? s : (s + '.'.repeat(n)).slice(0, n);
  }
  // Pinta un conjunto de casillas [[x,y],…] con un código.
  function paint(g, s, list, code) {
    const arr = cells(g, s).split('');
    for (const [x, y] of list) if (inside(g, x, y)) arr[y * g.cols + x] = code;
    return arr.join('');
  }
  const at = (g, s, x, y) => (inside(g, x, y) ? s[y * g.cols + x] || '.' : '.');
  // Rectángulo (inclusive) y pincel redondo: listas de casillas.
  function rect(x1, y1, x2, y2) {
    const out = [];
    for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++)
      for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) out.push([x, y]);
    return out;
  }
  function brush(cx, cy, r) {
    const out = [];
    for (let y = cy - r; y <= cy + r; y++)
      for (let x = cx - r; x <= cx + r; x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r + r) out.push([x, y]);
    return out;
  }
  // Borde de un rectángulo (para trazar salas con muros).
  function outline(x1, y1, x2, y2) {
    return rect(x1, y1, x2, y2).filter(
      ([x, y]) => x === Math.min(x1, x2) || x === Math.max(x1, x2) || y === Math.min(y1, y2) || y === Math.max(y1, y2),
    );
  }

  // ---------- Niebla de guerra: un bit por casilla, guardado en base64 ----------
  const b64e = bytes => {
    let s = '';
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return typeof btoa === 'function' ? btoa(s) : Buffer.from(s, 'binary').toString('base64');
  };
  const b64d = str => {
    const s = typeof atob === 'function' ? atob(str) : Buffer.from(str, 'base64').toString('binary');
    const out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  };
  function fogBits(g, revealed) {
    const bits = new Uint8Array(Math.ceil((g.cols * g.rows) / 8));
    if (revealed) {
      try {
        const src = b64d(revealed);
        bits.set(src.subarray(0, bits.length));
      } catch {
        /* niebla dañada: todo cubierto */
      }
    }
    return bits;
  }
  const fogEncode = bits => b64e(bits);
  const isRevealed = (g, bits, x, y) => {
    if (!inside(g, x, y)) return false;
    const i = y * g.cols + x;
    return !!(bits[i >> 3] & (1 << (i & 7)));
  };
  function setFog(g, bits, list, reveal) {
    const out = bits.slice();
    for (const [x, y] of list) {
      if (!inside(g, x, y)) continue;
      const i = y * g.cols + x;
      if (reveal) out[i >> 3] |= 1 << (i & 7);
      else out[i >> 3] &= ~(1 << (i & 7));
    }
    return out;
  }
  const fogAll = (g, reveal) =>
    reveal
      ? new Uint8Array(Math.ceil((g.cols * g.rows) / 8)).fill(255)
      : new Uint8Array(Math.ceil((g.cols * g.rows) / 8));
  const countRevealed = (g, bits) => {
    let n = 0;
    for (let y = 0; y < g.rows; y++) for (let x = 0; x < g.cols; x++) if (isRevealed(g, bits, x, y)) n++;
    return n;
  };

  // ---------- Paredes (segmentos en casillas) ----------
  // Cada pared es [x1, y1, x2, y2, tipo]. El tipo dice qué tapa: la vista, el paso o nada.
  const WALL = { wall: 0, door: 1, open: 2, locked: 3, window: 4 };
  const WALL_KINDS = [
    [WALL.wall, 'Pared'],
    [WALL.door, 'Puerta cerrada'],
    [WALL.open, 'Puerta abierta'],
    [WALL.locked, 'Puerta trabada'],
    [WALL.window, 'Ventana'],
  ];
  const MAX_WALLS = 4000;
  const wallKind = w => {
    const k = Number(w?.[4]) || 0;
    return Number.isInteger(k) && k >= 0 && k <= 4 ? k : 0;
  };
  const isWallDoor = w => [WALL.door, WALL.open, WALL.locked].includes(wallKind(w));
  // Las puertas abiertas y las ventanas dejan ver; solo las puertas abiertas dejan pasar.
  const blocksSight = w => [WALL.wall, WALL.door, WALL.locked].includes(wallKind(w));
  const blocksMove = w => wallKind(w) !== WALL.open;
  // Paredes guardadas: descarta lo que no sea un segmento válido y redondea a centésimas de casilla.
  function normWalls(raw) {
    if (!Array.isArray(raw)) return [];
    const out = [];
    for (const w of raw) {
      if (!Array.isArray(w) || w.length < 4) continue;
      const p = w.slice(0, 4).map(Number);
      if (!p.every(n => Number.isFinite(n) && Math.abs(n) <= MAX_SIDE * 2)) continue;
      if (p[0] === p[2] && p[1] === p[3]) continue;
      out.push([...p.map(round2), wallKind(w)]);
      if (out.length >= MAX_WALLS) break;
    }
    return out;
  }
  // Distancia de un punto al segmento de una pared, en casillas.
  function wallDistance(w, x, y) {
    const [ax, ay, bx, by] = w,
      dx = bx - ax,
      dy = by - ay,
      len = dx * dx + dy * dy,
      t = len ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len)) : 0;
    return Math.hypot(ax + dx * t - x, ay + dy * t - y);
  }
  // Índice de la pared más cercana a (x,y) que cumple `keep`, si está a menos de `max` casillas; -1 si no hay.
  function nearestWall(walls, x, y, max = 0.4, keep = () => true) {
    let best = -1,
      dist = max;
    walls.forEach((w, i) => {
      if (!keep(w)) return;
      const d = wallDistance(w, x, y);
      if (d <= dist) {
        best = i;
        dist = d;
      }
    });
    return best;
  }
  // Abre o cierra la puerta i. Devuelve las paredes nuevas, o null si no es una puerta que se pueda mover.
  function toggleWallDoor(walls, i) {
    const w = walls[i],
      k = wallKind(w);
    if (k !== WALL.door && k !== WALL.open) return null;
    return walls.map((x, j) => (j === i ? [...x.slice(0, 4), k === WALL.door ? WALL.open : WALL.door] : x));
  }
  const setWallKind = (walls, i, kind) =>
    walls[i] ? walls.map((x, j) => (j === i ? [...x.slice(0, 4), wallKind([0, 0, 0, 0, kind])] : x)) : walls;
  // Quita de la pared w el tramo a-b (si está sobre la misma recta). Devuelve 0, 1 o 2 tramos.
  function cutWall(w, a, b, eps = 0.06) {
    const [ax, ay, bx, by] = w,
      dx = bx - ax,
      dy = by - ay,
      len = Math.hypot(dx, dy);
    if (!len) return [w];
    const off = p => Math.abs((p[0] - ax) * dy - (p[1] - ay) * dx) / len,
      along = p => ((p[0] - ax) * dx + (p[1] - ay) * dy) / (len * len);
    if (off(a) > eps || off(b) > eps) return [w];
    const lo = Math.min(along(a), along(b)),
      hi = Math.max(along(a), along(b)),
      tiny = eps / len;
    if (hi <= tiny || lo >= 1 - tiny) return [w];
    const at = t => [round2(ax + dx * t), round2(ay + dy * t)],
      out = [];
    if (lo > tiny) out.push([ax, ay, ...at(lo), wallKind(w)]);
    if (hi < 1 - tiny) out.push([...at(hi), bx, by, wallKind(w)]);
    return out;
  }
  // Agrega un tramo. Una puerta o una ventana dibujada encima de una pared la corta: la abertura queda hecha.
  function addWall(walls, seg) {
    const [x1, y1, x2, y2] = seg.map(round2),
      kind = wallKind(seg);
    if (Math.hypot(x2 - x1, y2 - y1) < 0.05) return walls;
    let out = walls;
    if (kind !== WALL.wall)
      out = walls.flatMap(w => (wallKind(w) === WALL.wall ? cutWall(w, [x1, y1], [x2, y2]) : [w]));
    return out.length >= MAX_WALLS ? out : [...out, [x1, y1, x2, y2, kind]];
  }
  // Punto donde apoyar un tramo: el extremo de una pared cercana o, con `grid`, la esquina de casilla más cercana.
  function snapWallPoint(walls, p, grid = true, radius = 0.3) {
    let best = null,
      dist = radius;
    for (const w of walls)
      for (const [x, y] of [
        [w[0], w[1]],
        [w[2], w[3]],
      ]) {
        const d = Math.hypot(x - p.x, y - p.y);
        if (d <= dist) {
          best = { x, y };
          dist = d;
        }
      }
    if (best) return best;
    return grid ? { x: Math.round(p.x), y: Math.round(p.y) } : { x: round2(p.x), y: round2(p.y) };
  }
  // Al cambiar el tamaño o el desfase de la cuadrícula de una imagen, las paredes siguen pegadas al dibujo.
  function regridWalls(walls, from, to) {
    if (from.size === to.size && from.ox === to.ox && from.oy === to.oy) return walls;
    const x = v => round2((from.ox + v * from.size - to.ox) / to.size),
      y = v => round2((from.oy + v * from.size - to.oy) / to.size);
    return walls.map(w => [x(w[0]), y(w[1]), x(w[2]), y(w[3]), wallKind(w)]);
  }
  // Primera pared que corta el recorrido de una ficha (posiciones sucesivas de su esquina), o null.
  // Se mide de centro a centro de su espacio: pasar en diagonal justo por la punta de una pared también choca.
  function wallOnPath(walls, path, span = 1) {
    if (path.length < 2) return null;
    const half = span / 2,
      pts = path.map(p => [p.x + half, p.y + half]),
      x0 = Math.min(...pts.map(p => p[0])) - 0.01,
      x1 = Math.max(...pts.map(p => p[0])) + 0.01,
      y0 = Math.min(...pts.map(p => p[1])) - 0.01,
      y1 = Math.max(...pts.map(p => p[1])) + 0.01;
    const near = walls.filter(
      w =>
        blocksMove(w) &&
        Math.max(w[0], w[2]) >= x0 &&
        Math.min(w[0], w[2]) <= x1 &&
        Math.max(w[1], w[3]) >= y0 &&
        Math.min(w[1], w[3]) <= y1,
    );
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1],
        [bx, by] = pts[i];
      if (ax === bx && ay === by) continue;
      const hit = near.find(w => crosses(ax, ay, bx, by, w[0], w[1], w[2], w[3]));
      if (hit) return hit;
    }
    return null;
  }
  // ¿El segmento p1-p2 corta al segmento q1-q2? (sin contar toques en los extremos)
  function crosses(ax, ay, bx, by, cx, cy, dx, dy) {
    const d = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
    if (Math.abs(d) < 1e-9) return false;
    const t = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / d,
      u = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / d;
    return t > 1e-6 && t < 1 - 1e-6 && u > -1e-6 && u < 1 + 1e-6;
  }
  // Bordes bloqueados entre casillas vecinas: right[i] (hacia x+1) y down[i] (hacia y+1).
  function wallEdges(g, walls = []) {
    const right = new Uint8Array(g.cols * g.rows),
      down = new Uint8Array(g.cols * g.rows);
    for (const w of walls) {
      const [x1, y1, x2, y2] = w;
      const minX = Math.max(0, Math.floor(Math.min(x1, x2) - 1)),
        maxX = Math.min(g.cols - 1, Math.ceil(Math.max(x1, x2) + 1)),
        minY = Math.max(0, Math.floor(Math.min(y1, y2) - 1)),
        maxY = Math.min(g.rows - 1, Math.ceil(Math.max(y1, y2) + 1));
      for (let y = minY; y <= maxY; y++)
        for (let x = minX; x <= maxX; x++) {
          const cx = x + 0.5,
            cy = y + 0.5,
            i = y * g.cols + x;
          if (x + 1 < g.cols && crosses(cx, cy, cx + 1, cy, x1, y1, x2, y2)) right[i] = 1;
          if (y + 1 < g.rows && crosses(cx, cy, cx, cy + 1, x1, y1, x2, y2)) down[i] = 1;
        }
    }
    return { right, down };
  }
  // «Revelar sala»: casillas conectadas desde (sx,sy) sin atravesar muros, puertas ni paredes.
  // Incluye los muros y puertas que la rodean, para que se vean los bordes de la sala.
  function room(g, terrain, walls, sx, sy, limit = 2500) {
    if (!inside(g, sx, sy)) return [];
    const t = cells(g, terrain),
      edges = wallEdges(g, walls.filter(blocksMove)),
      seen = new Uint8Array(g.cols * g.rows),
      out = [],
      queue = [[sx, sy]];
    const blocked = (x, y) => !!terrainType(at(g, t, x, y)).blocks;
    if (blocked(sx, sy)) return [[sx, sy]];
    seen[sy * g.cols + sx] = 1;
    while (queue.length && out.length < limit) {
      const [x, y] = queue.shift();
      out.push([x, y]);
      if (blocked(x, y)) continue; // borde de la sala: se ve, pero no se sigue
      const i = y * g.cols + x;
      const next = [
        [x + 1, y, !edges.right[i]],
        [x - 1, y, x > 0 && !edges.right[i - 1]],
        [x, y + 1, !edges.down[i]],
        [x, y - 1, y > 0 && !edges.down[i - g.cols]],
      ];
      for (const [nx, ny, open] of next) {
        if (!open || !inside(g, nx, ny)) continue;
        const j = ny * g.cols + nx;
        if (seen[j]) continue;
        seen[j] = 1;
        queue.push([nx, ny]);
      }
    }
    // Las esquinas de muro (vecinas en diagonal) también se ven.
    const extra = [];
    for (const [x, y] of out) {
      if (blocked(x, y)) continue;
      for (const [dx, dy] of [
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
      ]) {
        const nx = x + dx,
          ny = y + dy;
        if (inside(g, nx, ny) && blocked(nx, ny) && !seen[ny * g.cols + nx]) {
          seen[ny * g.cols + nx] = 1;
          extra.push([nx, ny]);
        }
      }
    }
    return out.concat(extra);
  }

  // ---------- Movimiento y medidas ----------
  // Regla del Manual del Jugador: cada casilla, también en diagonal, son 5 pies.
  const squares = (a, b) =>
    Math.max(Math.abs(Math.round(a.x) - Math.round(b.x)), Math.abs(Math.round(a.y) - Math.round(b.y)));
  const feet = (g, a, b) => squares(a, b) * g.feet;
  // ¿Pasa por terreno difícil? (casillas atravesadas por la línea, aproximado)
  function difficultOnPath(g, terrain, a, b) {
    const t = cells(g, terrain),
      n = Math.max(1, squares(a, b));
    for (let i = 1; i <= n; i++) {
      const x = Math.round(a.x + ((b.x - a.x) * i) / n),
        y = Math.round(a.y + ((b.y - a.y) * i) / n);
      if (terrainType(at(g, t, x, y)).difficult) return true;
    }
    return false;
  }
  const snap = (v, size = 1) => (size % 2 === 1 || size < 1 ? Math.round(v) : Math.round(v - 0.5) + 0.5);
  const tokenSpan = k => (Number(k.size) === 0.5 ? 0.5 : Math.ceil(k.size || 1));
  const snapToken = (v, size = 1) => (Number(size) === 0.5 ? Math.round(v * 2) / 2 : Math.round(v));
  const headings = ['S', 'SO', 'O', 'NO', 'N', 'NE', 'E', 'SE'];
  const heading = n => ((Math.round(Number(n) || 0) % 8) + 8) % 8;
  const headingDelta = (a, b) => ((heading(b - a) + 4) % 8) - 4;
  const headingTo = (dx, dy) => (dx || dy ? heading(Math.atan2(-dx, dy) / (Math.PI / 4)) : null);
  function facingTo(from, to) {
    const offset = (tokenSpan(to) - tokenSpan(from)) / 2;
    return headingTo(to.x - from.x + offset, to.y - from.y + offset);
  }
  function footprintRect(token) {
    const span = tokenSpan(token),
      x = snapToken(token.x, span),
      y = snapToken(token.y, span);
    return { x, y, right: x + span, bottom: y + span, span };
  }
  function depthOrder(a, b) {
    const fa = footprintRect(a),
      fb = footprintRect(b);
    return fa.bottom - fb.bottom || fa.right - fb.right || String(a.id).localeCompare(String(b.id));
  }
  function inFootprint(token, x, y) {
    const f = footprintRect(token);
    return x >= f.x && x < f.right && y >= f.y && y < f.bottom;
  }
  function overlaps(a, b) {
    const m = tokenSpan(a),
      n = tokenSpan(b);
    return a.x < b.x + n && a.x + m > b.x && a.y < b.y + n && a.y + m > b.y;
  }
  function roomFor(g, terrain, token, tokens) {
    const { x, y } = token,
      endX = x + tokenSpan(token),
      endY = y + tokenSpan(token);
    if (x < 0 || y < 0 || endX > g.cols || endY > g.rows) return false;
    if (tokens.some(other => overlaps(token, other))) return false;
    for (let yy = Math.floor(y); yy < endY; yy++)
      for (let xx = Math.floor(x); xx < endX; xx++) if (terrainType(at(g, terrain, xx, yy)).blocks) return false;
    return true;
  }

  // Casilla libre más cercana para una ficha nueva (espiral desde «near»).
  function freeSpot(g, tokens, near = { x: 0, y: 0 }, terrain = '', footprint = 1) {
    const t = cells(g, terrain);
    const span = tokenSpan({ size: footprint });
    const sx = Math.max(0, Math.min(g.cols - span, snapToken(near.x, footprint))),
      sy = Math.max(0, Math.min(g.rows - span, snapToken(near.y, footprint)));
    const cx = Math.floor(sx),
      cy = Math.floor(sy);
    const corners =
      span === 0.5
        ? [
            [0, 0],
            [0.5, 0],
            [0, 0.5],
            [0.5, 0.5],
          ]
        : [[0, 0]];
    if (span === 0.5)
      corners.sort(
        ([ax, ay], [bx, by]) => Math.hypot(cx + ax - sx, cy + ay - sy) - Math.hypot(cx + bx - sx, cy + by - sy),
      );
    if (span > Math.min(g.cols, g.rows)) return { x: cx, y: cy };
    for (let r = 0; r <= Math.max(g.cols, g.rows); r++)
      for (let dy = -r; dy <= r; dy++) {
        const edgeStep = Math.abs(dy) === r ? 1 : 2 * r;
        for (let dx = -r; dx <= r; dx += edgeStep) {
          for (const [ox, oy] of corners) {
            const x = cx + dx + ox,
              y = cy + dy + oy;
            if (roomFor(g, t, { x, y, size: footprint }, tokens)) return { x, y };
          }
        }
      }
    return { x: cx, y: cy };
  }

  // ---------- Combate en el tablero: alcance, flanqueo y ataques de oportunidad ----------
  // Una ficha ocupa casillas enteras: (x, y) es su esquina superior izquierda y size su lado (mínimo 1).
  const side = k => Math.max(1, Math.round(k.size || 1));
  const cellOrigin = (v, token) => (tokenSpan(token) < 1 ? Math.floor(v) : Math.round(v));
  // Casillas de separación entre dos fichas, de borde a borde (1 = adyacentes, también en diagonal).
  function gap(a, b) {
    const ax = cellOrigin(a.x, a),
      ay = cellOrigin(a.y, a),
      bx = cellOrigin(b.x, b),
      by = cellOrigin(b.y, b);
    const dx = Math.max(0, bx - (ax + side(a) - 1), ax - (bx + side(b) - 1)),
      dy = Math.max(0, by - (ay + side(a) - 1), ay - (by + side(b) - 1));
    return Math.max(dx, dy);
  }
  const distanceFt = (a, b, feetPerSquare = 5) => gap(a, b) * feetPerSquare;
  // ¿b está dentro del alcance de a? (alcance en pies, 5 por defecto)
  const inReach = (a, b, reach = 5, feetPerSquare = 5) => {
    const g = gap(a, b);
    return g > 0 && g * feetPerSquare <= reach;
  };
  // Flanqueo (regla opcional de la Guía del DM): atacante y aliado adyacentes al objetivo y la línea
  // entre los centros de sus espacios entra y sale por lados (o esquinas) opuestos del espacio del objetivo.
  function flanks(attacker, ally, target) {
    if (gap(attacker, target) !== 1 || gap(ally, target) !== 1) return false;
    const c = k => ({ x: cellOrigin(k.x, k) + side(k) / 2, y: cellOrigin(k.y, k) + side(k) / 2 });
    const x0 = cellOrigin(target.x, target),
      y0 = cellOrigin(target.y, target),
      x1 = x0 + side(target),
      y1 = y0 + side(target);
    const p = c(attacker),
      q = c(ally),
      dx = q.x - p.x,
      dy = q.y - p.y,
      eps = 1e-9;
    let t0 = 0,
      t1 = 1;
    for (const [pp, qq] of [
      [-dx, p.x - x0],
      [dx, x1 - p.x],
      [-dy, p.y - y0],
      [dy, y1 - p.y],
    ]) {
      if (Math.abs(pp) < eps) {
        if (qq < -eps) return false;
      } else {
        const r = qq / pp;
        if (pp < 0) t0 = Math.max(t0, r);
        else t1 = Math.min(t1, r);
      }
    }
    if (t0 >= t1 - eps) return false; // no cruza (o solo roza una esquina)
    const sides = t => {
      const x = p.x + dx * t,
        y = p.y + dy * t,
        s = new Set();
      if (Math.abs(x - x0) < 1e-6) s.add('L');
      if (Math.abs(x - x1) < 1e-6) s.add('R');
      if (Math.abs(y - y0) < 1e-6) s.add('T');
      if (Math.abs(y - y1) < 1e-6) s.add('B');
      return s;
    };
    const a = sides(t0),
      b = sides(t1);
    return (
      (a.has('L') && b.has('R')) ||
      (a.has('R') && b.has('L')) ||
      (a.has('T') && b.has('B')) ||
      (a.has('B') && b.has('T'))
    );
  }
  // Primer aliado que flanquea con el atacante (o null).
  const flankingAlly = (attacker, target, allies) =>
    allies.find(a => a.id !== attacker.id && a.id !== target.id && flanks(attacker, a, target)) || null;
  // Ataques de oportunidad: quiénes ven salir de su alcance a la ficha a lo largo de su recorrido.
  // path: posiciones sucesivas del que se mueve; others: [{ token, reach }] de los enemigos que pueden reaccionar.
  function provokers(mover, path, others, feetPerSquare = 5) {
    const out = [];
    for (const { token, reach } of others) {
      if (token.id === mover.id) continue;
      for (let i = 1; i < path.length; i++) {
        const before = { ...mover, ...path[i - 1] },
          after = { ...mover, ...path[i] };
        if (inReach(token, before, reach, feetPerSquare) && !inReach(token, after, reach, feetPerSquare)) {
          out.push({ token, at: path[i - 1] });
          break;
        }
      }
    }
    return out;
  }
  // Recorrido casilla por casilla entre dos puntos (para completar arrastres rápidos).
  function steps(a, b, step = 1) {
    if (step === 0.5)
      return steps({ x: a.x * 2, y: a.y * 2 }, { x: b.x * 2, y: b.y * 2 }).map(({ x, y }) => ({ x: x / 2, y: y / 2 }));
    const out = [{ x: Math.round(a.x), y: Math.round(a.y) }],
      n = Math.max(Math.abs(Math.round(b.x) - Math.round(a.x)), Math.abs(Math.round(b.y) - Math.round(a.y)));
    for (let i = 1; i <= n; i++)
      out.push({ x: Math.round(a.x + ((b.x - a.x) * i) / n), y: Math.round(a.y + ((b.y - a.y) * i) / n) });
    return out;
  }
  // Pies que cuesta un recorrido casilla por casilla: el terreno difícil cuesta el doble.
  function pathCost(g, terrain, path, span = 1) {
    const t = cells(g, terrain || '');
    let ft = 0;
    for (let i = 1; i < path.length; i++) {
      const { x, y, right, bottom } = footprintRect({ ...path[i], size: span });
      let difficult = false;
      for (let yy = Math.floor(y); yy < bottom; yy++)
        for (let xx = Math.floor(x); xx < right; xx++) difficult ||= terrainType(at(g, t, xx, yy)).difficult;
      ft += g.feet * Math.min(1, span) * (difficult ? 2 : 1);
    }
    return ft;
  }
  // Movimiento del turno: puntos donde la ficha se detuvo (con los pies gastados hasta ahí).
  // Volver a un punto anterior devuelve el movimiento (sirve para corregir un arrastre).
  function moveTo(g, terrain, pts, to, budget, span = 1) {
    const back = pts.findIndex(p => p.x === to.x && p.y === to.y);
    if (back >= 0) return { ok: true, pts: pts.slice(0, back + 1), used: pts[back].ft, cost: 0 };
    const last = pts[pts.length - 1],
      cost = pathCost(g, terrain, steps(last, to, Math.min(1, span)), span),
      used = last.ft + cost;
    if (used > budget) return { ok: false, pts, used: last.ft, cost, left: budget - last.ft };
    return { ok: true, pts: [...pts, { x: to.x, y: to.y, ft: used }], used, cost };
  }
  // Alcance de un monstruo según sus acciones («Alcance 10 pies» / «reach 10 ft.»). 5 si no dice.
  function reachFromText(texts) {
    let best = 5;
    for (const t of texts) {
      for (const m of String(t || '').matchAll(/(?:alcance|reach)\s*(\d+)\s*(?:pies|ft)/gi))
        best = Math.max(best, Number(m[1]));
    }
    return best;
  }

  // ---------- Fichas ----------
  const PALETTE = ['#e0be80', '#83c8bd', '#b39ddb', '#90caf9', '#a5d6a7', '#ffcc80', '#f48fb1', '#80deea'];
  function initials(name) {
    const words = String(name || '?')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!words.length) return '?';
    const n = (words.at(-1).match(/^\d+$/) || [''])[0]; // «Goblin 3» → «G3»
    return ((words[0][0] || '?') + (n || (words[1]?.[0] ?? ''))).toUpperCase().slice(0, 3);
  }
  function colorFor(id, kind) {
    if (kind === 'monster') return '#d9534f';
    if (kind === 'object') return '#9e9e9e';
    let h = 0;
    for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return PALETTE[h % PALETTE.length];
  }
  // Tamaño en casillas a partir del tamaño de la criatura.
  const SIZE = { Diminuto: 0.5, Pequeño: 1, Mediano: 1, Grande: 2, Enorme: 3, Gargantuesco: 4 };
  const sizeFor = s =>
    SIZE[s] ||
    (/tiny|diminut/i.test(s)
      ? 0.5
      : /large|grande/i.test(s)
        ? 2
        : /huge|enorme/i.test(s)
          ? 3
          : /garg/i.test(s)
            ? 4
            : 1);

  // ---------- Importar mapas de Dungeondraft / Dungeon Alchemist (Universal VTT: .dd2vtt / .uvtt) ----------
  function parseUVTT(json) {
    const d = typeof json === 'string' ? JSON.parse(json) : json;
    const r = d?.resolution;
    if (!r?.map_size || !r.pixels_per_grid || !d.image)
      throw Error('El archivo no es un mapa Universal VTT (.dd2vtt / .uvtt) válido.');
    const ox = Number(r.map_origin?.x) || 0,
      oy = Number(r.map_origin?.y) || 0;
    const pt = p => [Number(p.x) - ox, Number(p.y) - oy];
    const walls = [];
    const add = (line, door = 0) => {
      for (let i = 1; i < line.length; i++) walls.push([...pt(line[i - 1]), ...pt(line[i]), door].map(round2));
    };
    for (const line of [...(d.line_of_sight || []), ...(d.objects_line_of_sight || [])]) add(line || []);
    for (const portal of d.portals || [])
      if (portal.bounds?.length >= 2) add(portal.bounds, portal.closed === false ? WALL.open : WALL.door);
    // Luces del archivo: posición y radio en casillas (5 pies cada una).
    const lights = (Array.isArray(d.lights) ? d.lights : [])
      .map(l => [...pt(l?.position || {}), Math.round((Number(l?.range) || 0) * 5)])
      .filter(([x, y, ft]) => Number.isFinite(x) && Number.isFinite(y) && ft > 0);
    const grid = normGrid({ cols: r.map_size.x, rows: r.map_size.y, size: r.pixels_per_grid, ox: 0, oy: 0 });
    return {
      grid,
      image: 'data:image/png;base64,' + String(d.image).replace(/^data:[^,]*,/, ''),
      walls: walls.slice(0, 4000),
      lights: normLights(grid, lights),
    };
  }
  const round2 = n => Math.round(n * 100) / 100;

  // Cuántas casillas entran en una imagen, dado el tamaño de la casilla en píxeles.
  function gridForImage(width, height, size, ox = 0, oy = 0) {
    return normGrid({
      cols: Math.max(1, Math.round((width - ox) / size)),
      rows: Math.max(1, Math.round((height - oy) / size)),
      size,
      ox,
      oy,
    });
  }

  const api = {
    MAX_SIDE,
    WEATHER,
    TERRAIN,
    terrainType,
    normGrid,
    inside,
    cells,
    paint,
    at,
    rect,
    brush,
    outline,
    fogBits,
    fogEncode,
    isRevealed,
    setFog,
    fogAll,
    countRevealed,
    crosses,
    wallEdges,
    room,
    WALL,
    WALL_KINDS,
    MAX_WALLS,
    wallKind,
    isWallDoor,
    blocksSight,
    blocksMove,
    normWalls,
    wallDistance,
    nearestWall,
    toggleWallDoor,
    setWallKind,
    cutWall,
    addWall,
    snapWallPoint,
    regridWalls,
    wallOnPath,
    squares,
    feet,
    difficultOnPath,
    snap,
    snapToken,
    headings,
    heading,
    headingDelta,
    headingTo,
    facingTo,
    tokenSpan,
    footprintRect,
    depthOrder,
    inFootprint,
    cellOrigin,
    overlaps,
    roomFor,
    freeSpot,
    initials,
    colorFor,
    sizeFor,
    parseUVTT,
    gridForImage,
    gap,
    distanceFt,
    inReach,
    flanks,
    flankingAlly,
    provokers,
    steps,
    reachFromText,
    pathCost,
    moveTo,
  };
  // ---------- Áreas de efecto ----------
  // Plantilla: { kind: 'circle' | 'cone' | 'line' | 'cube', x, y (origen, en casillas), dir (radianes), feet, width (pies, líneas) }.
  // Devuelve las casillas cuyo centro queda dentro. El cono mide tan ancho como largo (53° de apertura).
  const SHAPES = { circle: 'Esfera o radio', cone: 'Cono', line: 'Línea', cube: 'Cubo' };
  const CONE_HALF = Math.atan(0.5);
  function templateCells(g, t) {
    const len = Math.max(0, t.feet / g.feet),
      out = [];
    if (!len) return out;
    const cos = Math.cos(t.dir || 0),
      sin = Math.sin(t.dir || 0),
      half = Math.max(g.feet, t.width || g.feet) / g.feet / 2,
      x0 = Math.max(0, Math.floor(t.x - len - 1)),
      x1 = Math.min(g.cols - 1, Math.ceil(t.x + len + 1)),
      y0 = Math.max(0, Math.floor(t.y - len - 1)),
      y1 = Math.min(g.rows - 1, Math.ceil(t.y + len + 1)),
      eps = 1e-6;
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const dx = x + 0.5 - t.x,
          dy = y + 0.5 - t.y,
          along = dx * cos + dy * sin, // distancia a lo largo de la dirección
          side = Math.abs(-dx * sin + dy * cos), // distancia hacia el costado
          dist = Math.hypot(dx, dy);
        let hit = false;
        if (t.kind === 'circle') hit = dist <= len + eps;
        else if (t.kind === 'cone') hit = along > eps && dist <= len + eps && side <= along * Math.tan(CONE_HALF) + eps;
        else if (t.kind === 'line') hit = along > -eps && along <= len + eps && side <= half + eps;
        else if (t.kind === 'cube') hit = along > -eps && along <= len + eps && side <= len / 2 + eps;
        if (hit) out.push([x, y]);
      }
    return out;
  }
  // Contorno de la plantilla, en casillas, para dibujarla.
  function templateOutline(g, t) {
    const len = t.feet / g.feet,
      cos = Math.cos(t.dir || 0),
      sin = Math.sin(t.dir || 0),
      at = (a, s) => [t.x + a * cos - s * sin, t.y + a * sin + s * cos];
    if (t.kind === 'circle')
      return Array.from({ length: 48 }, (_, i) => [
        t.x + len * Math.cos((i * Math.PI) / 24),
        t.y + len * Math.sin((i * Math.PI) / 24),
      ]);
    if (t.kind === 'cone') {
      const pts = [[t.x, t.y]];
      for (let i = 0; i <= 12; i++) {
        const a = (t.dir || 0) - CONE_HALF + (i * 2 * CONE_HALF) / 12;
        pts.push([t.x + len * Math.cos(a), t.y + len * Math.sin(a)]);
      }
      return pts;
    }
    const half = t.kind === 'cube' ? len / 2 : Math.max(g.feet, t.width || g.feet) / g.feet / 2;
    return [at(0, -half), at(len, -half), at(len, half), at(0, half)];
  }
  // Fichas tocadas por la plantilla (alguna de sus casillas cae dentro).
  function templateHits(g, t, tokens) {
    const set = new Set(templateCells(g, t).map(([x, y]) => x + ',' + y));
    return tokens.filter(k => {
      const f = footprintRect(k);
      for (let y = Math.floor(f.y); y < f.bottom; y++)
        for (let x = Math.floor(f.x); x < f.right; x++) if (set.has(x + ',' + y)) return true;
      return false;
    });
  }

  // ---------- Línea de visión ----------
  // Segmentos que tapan la vista: paredes importadas y los bordes de las casillas de muro, roca o puerta.
  function sightBlockers(g, terrain = '', walls = []) {
    const segs = walls.filter(blocksSight).map(w => [w[0], w[1], w[2], w[3]]);
    const solid = (x, y) => inside(g, x, y) && !!terrainType(terrain[y * g.cols + x] || '.').blocks;
    // Bordes entre una casilla sólida y una abierta, unidos en tramos largos (menos segmentos que recorrer).
    for (let y = 0; y <= g.rows; y++) {
      let start = -1;
      for (let x = 0; x <= g.cols; x++) {
        const edge = x < g.cols && solid(x, y - 1) !== solid(x, y);
        if (edge && start < 0) start = x;
        if (!edge && start >= 0) {
          segs.push([start, y, x, y]);
          start = -1;
        }
      }
    }
    for (let x = 0; x <= g.cols; x++) {
      let start = -1;
      for (let y = 0; y <= g.rows; y++) {
        const edge = y < g.rows && solid(x - 1, y) !== solid(x, y);
        if (edge && start < 0) start = y;
        if (!edge && start >= 0) {
          segs.push([x, start, x, y]);
          start = -1;
        }
      }
    }
    return segs;
  }
  // ---------- Polígono de visión ----------
  // Lo que se ve desde (ox, oy) dentro de la caja { x0, y0, x1, y1 }, con los segmentos que tapan:
  // rayos hacia cada extremo (y apenas a los costados), cortados en la primera pared. Devuelve [[x, y], …] en orden.
  function clipSegment(s, b) {
    let [ax, ay, bx, by] = s,
      t0 = 0,
      t1 = 1;
    const dx = bx - ax,
      dy = by - ay;
    for (const [p, q] of [
      [-dx, ax - b.x0],
      [dx, b.x1 - ax],
      [-dy, ay - b.y0],
      [dy, b.y1 - ay],
    ]) {
      if (Math.abs(p) < 1e-12) {
        if (q < 0) return null;
      } else {
        const r = q / p;
        if (p < 0) t0 = Math.max(t0, r);
        else t1 = Math.min(t1, r);
        if (t0 > t1) return null;
      }
    }
    return [ax + dx * t0, ay + dy * t0, ax + dx * t1, ay + dy * t1];
  }
  function visibilityPolygon(ox, oy, segs, box) {
    const b = { x0: box.x0, y0: box.y0, x1: box.x1, y1: box.y1 };
    if (!(b.x1 > b.x0 && b.y1 > b.y0)) return [];
    const list = [];
    for (const s of segs) {
      const c = clipSegment(s, b);
      if (c && (c[0] !== c[2] || c[1] !== c[3])) list.push(c);
    }
    list.push([b.x0, b.y0, b.x1, b.y0], [b.x1, b.y0, b.x1, b.y1], [b.x1, b.y1, b.x0, b.y1], [b.x0, b.y1, b.x0, b.y0]);
    // Cubetas: cada rayo recorre solo las cercanas, en orden, hasta chocar.
    const size = Math.max(1, Math.max(b.x1 - b.x0, b.y1 - b.y0) / 48),
      nx = Math.max(1, Math.ceil((b.x1 - b.x0) / size)),
      ny = Math.max(1, Math.ceil((b.y1 - b.y0) / size)),
      buckets = Array.from({ length: nx * ny }, () => []);
    const col = x => Math.max(0, Math.min(nx - 1, Math.floor((x - b.x0) / size))),
      row = y => Math.max(0, Math.min(ny - 1, Math.floor((y - b.y0) / size)));
    list.forEach((s, i) => {
      for (let y = row(Math.min(s[1], s[3])); y <= row(Math.max(s[1], s[3])); y++)
        for (let x = col(Math.min(s[0], s[2])); x <= col(Math.max(s[0], s[2])); x++) buckets[y * nx + x].push(i);
    });
    const stamp = new Int32Array(list.length).fill(-1);
    let ray = 0;
    function cast(dx, dy) {
      ray++;
      let best = Infinity,
        cx = col(ox),
        cy = row(oy);
      const stepX = dx > 0 ? 1 : -1,
        stepY = dy > 0 ? 1 : -1,
        nextX = Math.abs(dx) < 1e-12 ? Infinity : (b.x0 + (cx + (dx > 0 ? 1 : 0)) * size - ox) / dx,
        nextY = Math.abs(dy) < 1e-12 ? Infinity : (b.y0 + (cy + (dy > 0 ? 1 : 0)) * size - oy) / dy,
        stepTX = Math.abs(dx) < 1e-12 ? Infinity : size / Math.abs(dx),
        stepTY = Math.abs(dy) < 1e-12 ? Infinity : size / Math.abs(dy);
      let tx = nextX,
        ty = nextY;
      for (;;) {
        for (const i of buckets[cy * nx + cx]) {
          if (stamp[i] === ray) continue;
          stamp[i] = ray;
          const [ax, ay, bx, by] = list[i],
            sx = bx - ax,
            sy = by - ay,
            den = dx * sy - dy * sx;
          if (Math.abs(den) < 1e-12) continue;
          const t = ((ax - ox) * sy - (ay - oy) * sx) / den,
            u = ((ax - ox) * dy - (ay - oy) * dx) / den;
          if (t > 1e-9 && u >= -1e-9 && u <= 1 + 1e-9 && t < best) best = t;
        }
        const exit = Math.min(tx, ty);
        if (best <= exit) break;
        if (tx < ty) {
          cx += stepX;
          tx += stepTX;
        } else {
          cy += stepY;
          ty += stepTY;
        }
        if (cx < 0 || cy < 0 || cx >= nx || cy >= ny) break;
      }
      return Number.isFinite(best) ? best : 0;
    }
    const angles = [];
    for (const s of list)
      for (const [x, y] of [
        [s[0], s[1]],
        [s[2], s[3]],
      ]) {
        const a = Math.atan2(y - oy, x - ox);
        angles.push(a - 1e-4, a, a + 1e-4);
      }
    angles.sort((p, q) => p - q);
    const out = [];
    let last = NaN;
    for (const a of angles) {
      if (a - last < 1e-7) continue;
      last = a;
      const dx = Math.cos(a),
        dy = Math.sin(a),
        t = cast(dx, dy);
      out.push([ox + dx * t, oy + dy * t]);
    }
    return out;
  }
  // ¿El punto (x, y) cae dentro del polígono? (para pruebas y para decidir qué se dibuja)
  function inPolygon(poly, x, y) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i],
        [xj, yj] = poly[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  // Casillas visibles desde los observadores [{ x, y (centro, en casillas), range (casillas; Infinity = sin límite) }].
  // Un muro se ve (su cara), pero no lo que hay detrás.
  // A cloud can obscure both its contents and anything viewed through it.
  function cloudBlocks(from, to, clouds) {
    const dx = to.x - from.x,
      dy = to.y - from.y,
      length = dx * dx + dy * dy;
    return clouds.some(({ x, y, r }) => {
      const at = length ? Math.max(0, Math.min(1, ((x - from.x) * dx + (y - from.y) * dy) / length)) : 0;
      return Math.hypot(from.x + dx * at - x, from.y + dy * at - y) < r;
    });
  }
  function visibleCells(g, terrain, walls, viewers, clouds = []) {
    const vis = new Uint8Array(g.cols * g.rows),
      segs = sightBlockers(g, terrain, walls);
    for (const v of viewers) {
      const r = Number.isFinite(v.range) ? v.range : Math.max(g.cols, g.rows) * 2,
        x0 = Math.max(0, Math.floor(v.x - r)),
        x1 = Math.min(g.cols - 1, Math.ceil(v.x + r)),
        y0 = Math.max(0, Math.floor(v.y - r)),
        y1 = Math.min(g.rows - 1, Math.ceil(v.y + r));
      // Solo los segmentos cercanos al observador.
      const near = segs.filter(
        s =>
          Math.max(s[0], s[2]) >= x0 - 1 &&
          Math.min(s[0], s[2]) <= x1 + 2 &&
          Math.max(s[1], s[3]) >= y0 - 1 &&
          Math.min(s[1], s[3]) <= y1 + 2,
      );
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) {
          const i = y * g.cols + x;
          if (vis[i]) continue;
          const cx = x + 0.5,
            cy = y + 0.5;
          if (Math.hypot(cx - v.x, cy - v.y) > r + 0.5) continue;
          // Una casilla abierta se ve si se ve su centro; un muro, si se ve alguna de sus caras.
          const targets = terrainType(terrain[i] || '.').blocks
            ? [
                [cx - 0.51, cy],
                [cx + 0.51, cy],
                [cx, cy - 0.51],
                [cx, cy + 0.51],
              ]
            : [[cx, cy]];
          let blocked = true;
          for (const [tx, ty] of targets) {
            if (clouds.length && cloudBlocks(v, { x: tx, y: ty }, clouds)) continue;
            let hit = false;
            for (const s of near)
              if (crosses(v.x, v.y, tx, ty, s[0], s[1], s[2], s[3])) {
                hit = true;
                break;
              }
            if (!hit) {
              blocked = false;
              break;
            }
          }
          if (!blocked) vis[i] = 1;
        }
    }
    return vis;
  }
  // ---------- Fuentes de luz ----------
  // Una ficha ilumina si su campo `stage` dice «light:<pies>» (antorcha 40, farol 60…).
  const LIGHTS = [
    ['candle', 'Vela', 10, '🕯️'],
    ['torch', 'Antorcha', 40, '🔥'],
    ['lantern', 'Farol', 60, '🏮'],
    ['campfire', 'Fogata', 40, '🔥'],
    ['spell', 'Conjuro de luz', 40, '✨'],
    ['daylight', 'Luz del día', 120, '☀️'],
  ];
  function lightFeet(stage) {
    const m = /^light:(\d{1,3})$/.exec(String(stage || ''));
    return m ? Math.max(0, Math.min(300, Number(m[1]))) : 0;
  }
  // Luces fijas del mapa (invisibles: lámparas del dibujo, luces importadas): [[x, y, pies], …].
  const MAX_FIXED_LIGHTS = 200;
  function normLights(g, raw) {
    if (!Array.isArray(raw)) return [];
    const out = [];
    for (const l of raw) {
      if (!Array.isArray(l)) continue;
      const [x, y, ft] = l.map(Number);
      if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0 || x > g.cols || y > g.rows) continue;
      const feet = Math.max(5, Math.min(300, Math.round((Number.isFinite(ft) ? ft : 0) / 5) * 5));
      out.push([round2(x), round2(y), feet]);
      if (out.length >= MAX_FIXED_LIGHTS) break;
    }
    return out;
  }
  // Luz de los monstruos (la lleva el mapa, porque las fichas de criaturas usan su propio campo): { idDeFicha: pies }.
  function normTokenLights(raw) {
    const out = {};
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
    for (const [id, ft] of Object.entries(raw).slice(0, 500)) {
      const feet = Math.round(Number(ft));
      if (/^[\w-]{1,64}$/.test(id) && feet > 0 && feet <= 300) out[id] = feet;
    }
    return out;
  }
  // Zonas de luz pintadas, una letra por casilla: «b» bien iluminada, «d» penumbra, «n» oscura, «.» como el mapa.
  const AMBIENT = [
    ['b', 'Iluminada', 2],
    ['d', 'Penumbra', 1],
    ['n', 'Oscura', 0],
  ];
  const ambientCells = (g, s) => cells(g, String(s || '').replace(/[^.bdn]/g, '.'));
  // ¿La zona pintada cambia algo? En un mapa iluminado, solo la penumbra y la oscuridad; a oscuras, cualquier zona.
  const ambientMatters = (s, dark) => (dark ? /[bdn]/ : /[dn]/).test(s || '');
  function ambientLevels(g, s, dark) {
    const t = ambientCells(g, s),
      base = dark ? 0 : 2,
      out = new Uint8Array(g.cols * g.rows);
    for (let i = 0; i < out.length; i++) out[i] = t[i] === 'b' ? 2 : t[i] === 'd' ? 1 : t[i] === 'n' ? 0 : base;
    return out;
  }
  // Luz en un mapa a oscuras, casilla por casilla: 0 no se ve, 1 penumbra, 2 bien iluminada.
  // viewers: [{ x, y, range }] con range = visión en la oscuridad (casillas); lights: [{ x, y, bright, dim }].
  // Se ve lo que alguna luz alumbra y el observador tiene a la vista (por lejos que esté), y lo que está
  // al alcance de su visión en la oscuridad: la oscuridad como penumbra y la penumbra como luz brillante.
  // ambient (opcional): la luz que ya tiene cada casilla (zonas pintadas), 0 a 2.
  function sightLevels(g, terrain, walls, viewers, lights, clouds = [], ambient = null) {
    const n = g.cols * g.rows,
      out = new Uint8Array(n);
    if (!viewers.length) return out;
    const dark = visibleCells(g, terrain, walls, viewers, clouds),
      far =
        lights.length || ambient?.some(Boolean)
          ? visibleCells(
              g,
              terrain,
              walls,
              viewers.map(v => ({ ...v, range: Infinity })),
              clouds,
            )
          : null,
      dim = lights.length
        ? visibleCells(
            g,
            terrain,
            walls,
            lights.map(l => ({ x: l.x, y: l.y, range: l.dim })),
          )
        : null,
      bright = lights.some(l => l.bright > 0)
        ? visibleCells(
            g,
            terrain,
            walls,
            lights.filter(l => l.bright > 0).map(l => ({ x: l.x, y: l.y, range: l.bright })),
          )
        : null;
    for (let i = 0; i < n; i++) {
      const lit = Math.max(dim?.[i] ? (bright?.[i] ? 2 : 1) : 0, ambient?.[i] || 0);
      let level = far?.[i] ? lit : 0;
      if (dark[i]) level = Math.max(level, lit ? 2 : 1);
      out[i] = level;
    }
    return out;
  }
  // Lo que se ve en un mapa a oscuras (0/1). Las luces [{ x, y, range }] alumbran la mitad de su radio con luz
  // brillante y el resto con penumbra, como una antorcha (20 + 20 pies).
  function sight(g, terrain, walls, viewers, lights, clouds = []) {
    if (!lights.length) return visibleCells(g, terrain, walls, viewers, clouds);
    const levels = sightLevels(
      g,
      terrain,
      walls,
      viewers,
      lights.map(l => ({ x: l.x, y: l.y, dim: l.range, bright: l.range / 2 })),
      clouds,
    );
    return levels.map(v => (v ? 1 : 0));
  }
  // Distancia en pies contando la altura (misma regla que las diagonales: vale el tramo más largo).
  const distance3d = (a, b, feetPerSquare = 5) =>
    Math.max(gap(a, b) * feetPerSquare, Math.abs((a.elev || 0) - (b.elev || 0)));

  Object.assign(api, {
    LIGHTS,
    lightFeet,
    MAX_FIXED_LIGHTS,
    normLights,
    normTokenLights,
    AMBIENT,
    ambientCells,
    ambientMatters,
    ambientLevels,
    sight,
    sightLevels,
    visibilityPolygon,
    inPolygon,
    SHAPES,
    templateCells,
    templateOutline,
    templateHits,
    sightBlockers,
    isDoor,
    toggleDoor,
    links,
    arrival,
    visibleCells,
    distance3d,
  });
  if (typeof module !== 'undefined') module.exports = api;
  root.BoardCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
