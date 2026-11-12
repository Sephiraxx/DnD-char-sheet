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
    { code: 'p', name: 'Abismo', color: '#0d0b0b' },
    { code: 'l', name: 'Lava', color: '#d4501d', difficult: true },
  ];
  const BY_CODE = Object.fromEntries(TERRAIN.map(t => [t.code, t]));
  const terrainType = c => BY_CODE[c] || BY_CODE['.'];

  const clampSide = n => Math.max(1, Math.min(MAX_SIDE, Math.round(Number(n) || 1)));
  // Cuadrícula normalizada: cols/rows (casillas), size (px por casilla en la imagen), ox/oy (desfase en px).
  function normGrid(g = {}) {
    return {
      cols: clampSide(g.cols ?? 30),
      rows: clampSide(g.rows ?? 20),
      size: Math.max(8, Math.min(1000, Number(g.size) || 70)),
      ox: Number(g.ox) || 0,
      oy: Number(g.oy) || 0,
      feet: Math.max(1, Math.min(100, Number(g.feet) || 5)),
      show: g.show !== false,
      color: typeof g.color === 'string' && /^#[0-9a-f]{6}$/i.test(g.color) ? g.color : '#000000',
      opacity: Math.max(0, Math.min(1, g.opacity ?? 0.35)),
      // Visión: los = los jugadores solo ven lo que sus personajes tienen a la vista; dark = mapa a oscuras
      // (se ve hasta la luz que lleva la party, o hasta la visión en la oscuridad de cada uno).
      vision: {
        los: g.vision?.los === true,
        dark: g.vision?.dark === true,
        light: Math.max(0, Math.min(600, Math.round(Number(g.vision?.light ?? 40)) || 0)),
      },
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
      edges = wallEdges(g, walls),
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

  // Casilla libre más cercana para una ficha nueva (espiral desde «near»).
  function freeSpot(g, tokens, near = { x: 0, y: 0 }, terrain = '') {
    const t = cells(g, terrain),
      taken = new Set(tokens.map(k => Math.round(k.x) + ',' + Math.round(k.y)));
    const ok = (x, y) => inside(g, x, y) && !taken.has(x + ',' + y) && !terrainType(at(g, t, x, y)).blocks;
    const cx = Math.max(0, Math.min(g.cols - 1, Math.round(near.x))),
      cy = Math.max(0, Math.min(g.rows - 1, Math.round(near.y)));
    for (let r = 0; r <= Math.max(g.cols, g.rows); r++)
      for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          if (ok(cx + dx, cy + dy)) return { x: cx + dx, y: cy + dy };
        }
    return { x: cx, y: cy };
  }

  // ---------- Combate en el tablero: alcance, flanqueo y ataques de oportunidad ----------
  // Una ficha ocupa casillas enteras: (x, y) es su esquina superior izquierda y size su lado (mínimo 1).
  const side = k => Math.max(1, Math.round(k.size || 1));
  // Casillas de separación entre dos fichas, de borde a borde (1 = adyacentes, también en diagonal).
  function gap(a, b) {
    const ax = Math.round(a.x),
      ay = Math.round(a.y),
      bx = Math.round(b.x),
      by = Math.round(b.y);
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
    const c = k => ({ x: Math.round(k.x) + side(k) / 2, y: Math.round(k.y) + side(k) / 2 });
    const x0 = Math.round(target.x),
      y0 = Math.round(target.y),
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
  function steps(a, b) {
    const out = [{ x: Math.round(a.x), y: Math.round(a.y) }],
      n = Math.max(Math.abs(Math.round(b.x) - Math.round(a.x)), Math.abs(Math.round(b.y) - Math.round(a.y)));
    for (let i = 1; i <= n; i++)
      out.push({ x: Math.round(a.x + ((b.x - a.x) * i) / n), y: Math.round(a.y + ((b.y - a.y) * i) / n) });
    return out;
  }
  // Pies que cuesta un recorrido casilla por casilla: el terreno difícil cuesta el doble.
  function pathCost(g, terrain, path) {
    const t = cells(g, terrain || '');
    let ft = 0;
    for (let i = 1; i < path.length; i++)
      ft += g.feet * (terrainType(at(g, t, path[i].x, path[i].y)).difficult ? 2 : 1);
    return ft;
  }
  // Movimiento del turno: puntos donde la ficha se detuvo (con los pies gastados hasta ahí).
  // Volver a un punto anterior devuelve el movimiento (sirve para corregir un arrastre).
  function moveTo(g, terrain, pts, to, budget) {
    const back = pts.findIndex(p => p.x === to.x && p.y === to.y);
    if (back >= 0) return { ok: true, pts: pts.slice(0, back + 1), used: pts[back].ft, cost: 0 };
    const last = pts[pts.length - 1],
      cost = pathCost(g, terrain, steps(last, to)),
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
      if (portal.bounds?.length >= 2) add(portal.bounds, portal.closed === false ? 2 : 1);
    return {
      grid: normGrid({ cols: r.map_size.x, rows: r.map_size.y, size: r.pixels_per_grid, ox: 0, oy: 0 }),
      image: 'data:image/png;base64,' + String(d.image).replace(/^data:[^,]*,/, ''),
      walls: walls.slice(0, 4000),
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
    squares,
    feet,
    difficultOnPath,
    snap,
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
      const n = Math.max(1, Math.round(k.size || 1));
      for (let dy = 0; dy < n; dy++)
        for (let dx = 0; dx < n; dx++) if (set.has(Math.round(k.x) + dx + ',' + (Math.round(k.y) + dy))) return true;
      return false;
    });
  }

  // ---------- Línea de visión ----------
  // Segmentos que tapan la vista: paredes importadas y los bordes de las casillas de muro, roca o puerta.
  function sightBlockers(g, terrain = '', walls = []) {
    const segs = walls.map(w => [w[0], w[1], w[2], w[3]]);
    const solid = (x, y) => inside(g, x, y) && !!terrainType(terrain[y * g.cols + x] || '.').blocks;
    for (let y = 0; y < g.rows; y++)
      for (let x = 0; x < g.cols; x++) {
        if (!solid(x, y)) continue;
        if (!solid(x, y - 1)) segs.push([x, y, x + 1, y]);
        if (!solid(x, y + 1)) segs.push([x, y + 1, x + 1, y + 1]);
        if (!solid(x - 1, y)) segs.push([x, y, x, y + 1]);
        if (!solid(x + 1, y)) segs.push([x + 1, y, x + 1, y + 1]);
      }
    return segs;
  }
  // Casillas visibles desde los observadores [{ x, y (centro, en casillas), range (casillas; Infinity = sin límite) }].
  // Un muro se ve (su cara), pero no lo que hay detrás.
  function visibleCells(g, terrain, walls, viewers) {
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
  // Lo que se ve en un mapa a oscuras: lo que cada observador tiene a su alcance, más lo que alguna luz
  // ilumina y el observador tiene a la vista (por lejos que esté). viewers y lights: [{ x, y, range }] en casillas.
  function sight(g, terrain, walls, viewers, lights) {
    const near = visibleCells(g, terrain, walls, viewers);
    if (!lights.length || !viewers.length) return near;
    const lit = visibleCells(g, terrain, walls, lights),
      far = visibleCells(
        g,
        terrain,
        walls,
        viewers.map(v => ({ ...v, range: Infinity })),
      );
    for (let i = 0; i < near.length; i++) if (!near[i] && lit[i] && far[i]) near[i] = 1;
    return near;
  }
  // Distancia en pies contando la altura (misma regla que las diagonales: vale el tramo más largo).
  const distance3d = (a, b, feetPerSquare = 5) =>
    Math.max(gap(a, b) * feetPerSquare, Math.abs((a.elev || 0) - (b.elev || 0)));

  Object.assign(api, {
    LIGHTS,
    lightFeet,
    sight,
    SHAPES,
    templateCells,
    templateOutline,
    templateHits,
    sightBlockers,
    visibleCells,
    distance3d,
  });
  if (typeof module !== 'undefined') module.exports = api;
  root.BoardCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
