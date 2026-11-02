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
  };
  if (typeof module !== 'undefined') module.exports = api;
  root.BoardCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
