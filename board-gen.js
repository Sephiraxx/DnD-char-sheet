/* Generador de mapas para el tablero: caminos, bosques, ríos, cuevas, mazmorras…
   Devuelve terreno pintado (los mismos códigos que el pincel), así que el resultado se puede retocar a mano.
   Con la misma semilla sale siempre el mismo mapa. Lógica sin navegador. */
(function (root) {
  'use strict';
  // Muebles: el generador necesita saber cuánto ocupa cada pieza.
  const P =
    typeof module !== 'undefined' && typeof require === 'function' ? require('./board-props.js') : root.BoardProps;
  const TYPES = [
    ['trail', 'Camino en el bosque', 'Un sendero que serpentea entre árboles: emboscadas y encuentros de viaje.'],
    ['woods', 'Bosque cerrado', 'Arboleda densa con uno o dos claros donde pelear.'],
    ['river', 'Cruce de río', 'Un río con su puente o su vado, y el camino que lo cruza.'],
    ['coast', 'Costa', 'Playa, agua poco profunda y mar abierto de un lado; tierra firme del otro.'],
    ['swamp', 'Pantano', 'Charcas, barro y árboles sueltos: terreno difícil por todas partes.'],
    ['desert', 'Desierto', 'Arena abierta, peñascos para cubrirse y un oasis.'],
    ['ice', 'Paso helado', 'Suelo duro, placas de hielo, rocas y una grieta.'],
    ['cave', 'Caverna', 'Galerías naturales de roca, con escombros y algún charco.'],
    ['lava', 'Caverna de lava', 'Una caverna atravesada por un río de lava.'],
    ['dungeon', 'Mazmorra', 'Salas de piedra unidas por pasillos y puertas.'],
    ['ruins', 'Ruinas', 'Restos de edificios a cielo abierto, comidos por el pasto.'],
    [
      'tavern',
      'Taberna',
      'Salón con barra, cocina y depósito; habitaciones en los pisos de arriba y, si querés, sótano.',
    ],
    ['village', 'Aldea', 'Un cruce de caminos con casas, una plaza y un pozo.'],
    ['castle', 'Castillo', 'Muralla con torres, foso, patio de armas y la torre del homenaje.'],
    ['ship', 'Barco', 'La cubierta de un velero en mar abierto, con camarote y bodega.'],
  ];
  const SIZES = {
    small: ['Chico', 20, 14],
    medium: ['Mediano', 30, 20],
    large: ['Grande', 40, 28],
  };

  // Generador pseudoaleatorio con semilla (mulberry32).
  function rng(seed) {
    let a = seed >>> 0 || 1;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function make(cols, rows, seed) {
    const R = rng(seed),
      cells = new Array(cols * rows).fill('.'),
      inside = (x, y) => x >= 0 && y >= 0 && x < cols && y < rows,
      get = (x, y) => (inside(x, y) ? cells[y * cols + x] : null),
      set = (x, y, c) => {
        if (inside(x, y)) cells[y * cols + x] = c;
      },
      int = (a, b) => a + Math.floor(R() * (b - a + 1)),
      // Ruido suave en [0, 1): una grilla de valores al azar, interpolada.
      lattice = new Map(),
      val = (i, j, k) => {
        const key = i + ',' + j + ',' + k;
        if (!lattice.has(key)) lattice.set(key, R());
        return lattice.get(key);
      },
      noise = (x, y, scale = 6, k = 0) => {
        const fx = x / scale,
          fy = y / scale,
          i = Math.floor(fx),
          j = Math.floor(fy),
          u = fx - i,
          v = fy - j,
          su = u * u * (3 - 2 * u),
          sv = v * v * (3 - 2 * v);
        return (
          (val(i, j, k) * (1 - su) + val(i + 1, j, k) * su) * (1 - sv) +
          (val(i, j + 1, k) * (1 - su) + val(i + 1, j + 1, k) * su) * sv
        );
      },
      each = fn => {
        for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) fn(x, y, cells[y * cols + x]);
      },
      fill = c => cells.fill(c),
      // Una línea que serpentea de lado a lado: devuelve la coordenada transversal para cada paso.
      meander = (length, span, k, wobble = 0.3) => {
        const base = span * (0.3 + R() * 0.4),
          out = [];
        for (let i = 0; i < length; i++)
          out.push(
            Math.max(
              2,
              Math.min(
                span - 3,
                Math.round(base + (noise(i, 0, 7, k) - 0.5) * span * wobble * 2 + (noise(i, 0, 3, k + 1) - 0.5) * 2),
              ),
            ),
          );
        return out;
      },
      // Pinta una franja: horizontal (a lo largo de x) o vertical, de cierto ancho.
      band = (line, width, code, horizontal, keep) => {
        line.forEach((c, i) => {
          for (let d = -Math.floor(width / 2); d < Math.ceil(width / 2); d++) {
            const x = horizontal ? i : c + d,
              y = horizontal ? c + d : i;
            if (!keep || keep(get(x, y), x, y)) set(x, y, code);
          }
        });
      },
      blob = (cx, cy, r, code, keep) => {
        for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++)
          for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
            const d = Math.hypot(x - cx, y - cy) + (noise(x, y, 3, 77) - 0.5) * 1.6;
            if (d <= r && (!keep || keep(get(x, y), x, y))) set(x, y, code);
          }
      },
      near = (x, y, codes, dist = 1) => {
        for (let dy = -dist; dy <= dist; dy++)
          for (let dx = -dist; dx <= dist; dx++) if (codes.includes(get(x + dx, y + dy))) return true;
        return false;
      },
      scatter = (code, chance, on) =>
        each((x, y, c) => {
          if (on(c, x, y) && R() < chance) set(x, y, code);
        });
    // Muebles: [x, y, id, giro]. `free` dice si una casilla no tiene ya una pieza con cuerpo (las alfombras no cuentan).
    const api = {
      R,
      cols,
      rows,
      cells,
      inside,
      get,
      set,
      int,
      noise,
      each,
      fill,
      meander,
      band,
      blob,
      near,
      scatter,
      props: [],
    };
    const held = new Set();
    api.free = (x, y) => !held.has(x + ',' + y);
    api.hold = (x, y, w = 1, h = 1) => {
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) held.add(x + i + ',' + (y + j));
    };
    api.retake = () => {
      held.clear();
      for (const [x, y, id, rot] of api.props) if (!P.get(id).flat) api.hold(x, y, ...P.footprint(id, rot));
    };
    // Coloca una pieza si todas sus casillas cumplen `ok` (por defecto: dentro del mapa y libres).
    api.put = (x, y, id, rot = 0, ok = null) => {
      if (!P || !P.get(id)) return false;
      const [w, h] = P.footprint(id, rot),
        solid = !P.get(id).flat;
      for (let j = 0; j < h; j++)
        for (let i = 0; i < w; i++) {
          if (!inside(x + i, y + j) || (solid && !api.free(x + i, y + j))) return false;
          if (ok && !ok(get(x + i, y + j), x + i, y + j)) return false;
        }
      api.props.push([x, y, id, rot & 3]);
      if (solid) api.hold(x, y, w, h);
      return true;
    };
    api.pick = list => list[int(0, list.length - 1)];
    return api;
  }

  // Árboles según un ruido: más cerrados donde el ruido es alto.
  function forest(m, threshold, k = 1, on = c => c === 'g') {
    m.each((x, y, c) => {
      if (on(c) && m.noise(x, y, 4, k) * 0.7 + m.noise(x, y, 2, k + 1) * 0.3 > threshold) m.set(x, y, 't');
    });
  }
  const GEN = {
    trail(m) {
      m.fill('g');
      forest(m, 0.52);
      const horizontal = m.cols >= m.rows,
        line = m.meander(horizontal ? m.cols : m.rows, horizontal ? m.rows : m.cols, 20, 0.2);
      // El sendero y un margen despejado a los costados.
      m.band(line, 5, 'g', horizontal, c => c === 't' && m.R() < 0.75);
      m.band(line, m.int(2, 3), 'a', horizontal);
      m.scatter('r', 0.012, c => c === 'g');
      m.scatter('d', 0.05, (c, x, y) => c === 'a' && m.near(x, y, ['g', 't']));
    },
    woods(m) {
      m.fill('g');
      forest(m, 0.46);
      // Claros.
      for (let i = 0, n = m.int(1, 2) + (m.cols > 30 ? 1 : 0); i < n; i++)
        m.blob(m.int(5, m.cols - 6), m.int(4, m.rows - 5), m.int(3, 5), 'g');
      if (m.R() < 0.6) m.blob(m.int(4, m.cols - 5), m.int(4, m.rows - 5), m.int(1, 2), 'w');
      m.scatter('r', 0.015, c => c === 'g');
      m.scatter('d', 0.02, c => c === 'g');
    },
    river(m) {
      m.fill('g');
      forest(m, 0.56);
      const vertical = m.cols >= m.rows,
        line = m.meander(vertical ? m.rows : m.cols, vertical ? m.cols : m.rows, 30, 0.16),
        width = m.int(4, 6);
      m.band(line, width + 2, 'g', !vertical, c => c === 't');
      m.band(line, width, 'w', !vertical);
      if (width >= 4) m.band(line, width - 2, 'W', !vertical);
      // Orillas de arena en algunos tramos.
      m.each((x, y, c) => {
        if (c === 'g' && m.near(x, y, ['w']) && m.noise(x, y, 5, 40) > 0.6) m.set(x, y, 's');
      });
      // El camino que cruza, con un puente de madera (o un vado de arena).
      const road = m.meander(vertical ? m.cols : m.rows, vertical ? m.rows : m.cols, 50, 0.12),
        ford = m.R() < 0.3;
      road.forEach((c, i) => {
        for (let d = 0; d < 2; d++) {
          const x = vertical ? i : c + d,
            y = vertical ? c + d : i,
            cur = m.get(x, y);
          m.set(x, y, cur === 'w' || cur === 'W' ? (ford ? 's' : 'm') : 'a');
        }
      });
      m.scatter('r', 0.01, c => c === 'g');
    },
    coast(m) {
      // El mar queda del lado derecho o de abajo; la orilla la dibuja un ruido.
      const side = m.cols >= m.rows;
      m.each((x, y) => {
        const t = (side ? x / m.cols : y / m.rows) + (m.noise(x, y, 7, 60) - 0.5) * 0.28;
        m.set(x, y, t > 0.78 ? 'W' : t > 0.6 ? 'w' : t > 0.48 ? 's' : 'g');
      });
      forest(m, 0.56, 3);
      m.scatter('r', 0.03, c => c === 's');
      m.scatter('d', 0.02, c => c === 's');
      m.scatter('r', 0.012, c => c === 'w');
    },
    swamp(m) {
      m.each((x, y) => {
        const n = m.noise(x, y, 5, 70) * 0.7 + m.noise(x, y, 2.5, 71) * 0.3;
        m.set(x, y, n < 0.24 ? 'W' : n < 0.4 ? 'w' : n < 0.54 ? 'a' : 'g');
      });
      m.scatter('t', 0.14, c => c === 'g');
      m.scatter('t', 0.04, c => c === 'a');
      m.scatter('d', 0.04, c => c === 'a');
      m.scatter('r', 0.008, c => c === 'g' || c === 'a');
    },
    desert(m) {
      m.fill('s');
      m.each((x, y) => {
        const n = m.noise(x, y, 5, 80);
        if (n > 0.72) m.set(x, y, 'r');
        else if (n > 0.64) m.set(x, y, 'd');
        else if (m.noise(x, y, 6, 81) > 0.74) m.set(x, y, 'a');
      });
      // Oasis: agua, un anillo de pasto y palmeras.
      const ox = m.int(5, m.cols - 6),
        oy = m.int(4, m.rows - 5);
      m.blob(ox, oy, 4, 'g');
      m.blob(ox, oy, 2, 'w');
      m.scatter('t', 0.3, (c, x, y) => c === 'g' && Math.hypot(x - ox, y - oy) < 6);
    },
    ice(m) {
      m.each((x, y) => {
        const n = m.noise(x, y, 6, 90) * 0.75 + m.noise(x, y, 3, 91) * 0.25;
        m.set(x, y, n > 0.6 ? 'h' : n < 0.3 ? 'd' : 'a');
      });
      m.scatter('r', 0.05, c => c === 'd');
      m.scatter('r', 0.012, c => c === 'a');
      m.scatter('t', 0.03, c => c === 'a');
      // Una grieta que corta parte del mapa.
      const line = m.meander(m.cols, m.rows, 95, 0.15),
        from = m.int(2, Math.floor(m.cols / 3)),
        to = m.int(Math.floor((m.cols * 2) / 3), m.cols - 3);
      for (let x = from; x <= to; x++) m.set(x, line[x], 'p');
    },
    cave(m, floor = 'a') {
      // Autómata celular: empieza con ruido y se suaviza hasta formar galerías.
      // Si sale muy cerrada, se repite con menos roca.
      const at = (g, x, y) => m.inside(x, y) && g[y * m.cols + x];
      let seen, best, bestSize;
      for (let attempt = 0; attempt < 6; attempt++) {
        let open = [];
        for (let y = 0; y < m.rows; y++)
          for (let x = 0; x < m.cols; x++)
            open.push(x > 0 && y > 0 && x < m.cols - 1 && y < m.rows - 1 && m.R() > 0.44 - attempt * 0.03);
        for (let pass = 0; pass < 4; pass++)
          open = open.map((_, i) => {
            const x = i % m.cols,
              y = (i / m.cols) | 0;
            if (x === 0 || y === 0 || x === m.cols - 1 || y === m.rows - 1) return false;
            let n = 0;
            for (let dy = -1; dy <= 1; dy++)
              for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && at(open, x + dx, y + dy)) n++;
            return n >= 5 || (n >= 4 && at(open, x, y));
          });
        // Solo queda la galería más grande: nadie arranca encerrado.
        seen = new Int32Array(m.cols * m.rows);
        best = 0;
        bestSize = 0;
        let id = 0;
        open.forEach((o, i) => {
          if (!o || seen[i]) return;
          id++;
          let size = 0;
          const stack = [i];
          seen[i] = id;
          while (stack.length) {
            const c = stack.pop(),
              x = c % m.cols,
              y = (c / m.cols) | 0;
            size++;
            for (const [dx, dy] of [
              [1, 0],
              [-1, 0],
              [0, 1],
              [0, -1],
            ]) {
              const j = (y + dy) * m.cols + x + dx;
              if (at(open, x + dx, y + dy) && !seen[j]) {
                seen[j] = id;
                stack.push(j);
              }
            }
          }
          if (size > bestSize) {
            bestSize = size;
            best = id;
          }
        });
        if (bestSize >= m.cols * m.rows * 0.4) break;
      }
      m.each((x, y) => m.set(x, y, seen[y * m.cols + x] === best && best ? floor : 'r'));
      m.scatter('d', 0.06, (c, x, y) => c === floor && m.near(x, y, ['r']));
      if (floor === 'a' && m.R() < 0.7) {
        const spots = [];
        m.each((x, y, c) => c === floor && !m.near(x, y, ['r'], 2) && spots.push([x, y]));
        if (spots.length) {
          const [px, py] = spots[m.int(0, spots.length - 1)];
          m.blob(px, py, 2, 'w', c => c === floor);
        }
      }
    },
    lava(m) {
      GEN.cave(m, 'd');
      m.each((x, y, c) => {
        if (c === 'd' && m.noise(x, y, 4, 99) > 0.42) m.set(x, y, 'a');
      });
      const line = m.meander(m.cols, m.rows, 100, 0.25);
      m.band(line, m.int(2, 3), 'l', true, c => c !== 'r');
      // Pasos para cruzar.
      for (let i = 0, n = m.int(1, 2); i < n; i++) {
        const x = m.int(3, m.cols - 4);
        for (let y = 0; y < m.rows; y++) if (m.get(x, y) === 'l') m.set(x, y, 'd');
      }
    },
    dungeon(m) {
      const floor = new Uint8Array(m.cols * m.rows), // 1 = sala, 2 = pasillo
        rooms = [],
        F = (x, y) => (m.inside(x, y) ? floor[y * m.cols + x] : 0);
      for (let tries = 0; tries < 400 && rooms.length < Math.max(5, Math.round((m.cols * m.rows) / 55)); tries++) {
        const w = m.int(4, 8),
          h = m.int(3, 6),
          x = m.int(1, m.cols - w - 1),
          y = m.int(1, m.rows - h - 1);
        if (x < 1 || y < 1) continue;
        // Entre dos salas queda al menos un muro.
        if (rooms.some(r => x < r.x + r.w + 1 && x + w + 1 > r.x && y < r.y + r.h + 1 && y + h + 1 > r.y)) continue;
        rooms.push({ x, y, w, h, cx: x + (w >> 1), cy: y + (h >> 1) });
        for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) floor[j * m.cols + i] = 1;
      }
      rooms.sort((a, b) => a.cx - b.cx);
      const carve = (x, y) => {
        if (m.inside(x, y) && !floor[y * m.cols + x]) floor[y * m.cols + x] = 2;
      };
      // Pasillos en L entre salas vecinas, y alguno de más para que haya vueltas.
      const link = (a, b) => {
        let x = a.cx,
          y = a.cy;
        const first = m.R() < 0.5;
        const stepX = () => {
          while (x !== b.cx) carve((x += Math.sign(b.cx - x)), y);
        };
        const stepY = () => {
          while (y !== b.cy) carve(x, (y += Math.sign(b.cy - y)));
        };
        if (first) (stepX(), stepY());
        else (stepY(), stepX());
      };
      for (let i = 1; i < rooms.length; i++) link(rooms[i - 1], rooms[i]);
      if (rooms.length > 3) link(rooms[0], rooms[rooms.length - 1]);
      m.each((x, y) => {
        if (F(x, y)) return m.set(x, y, 'f');
        let touch = false;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (F(x + dx, y + dy)) touch = true;
        m.set(x, y, touch ? '#' : '.');
      });
      // Puertas: donde un pasillo entra a una sala, entre dos muros.
      m.each((x, y) => {
        if (F(x, y) !== 2) return;
        const room = [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ].some(([dx, dy]) => F(x + dx, y + dy) === 1);
        if (!room) return;
        const wall = (dx, dy) => m.get(x + dx, y + dy) === '#';
        if (((wall(0, -1) && wall(0, 1)) || (wall(-1, 0) && wall(1, 0))) && m.R() < 0.8) m.set(x, y, 'D');
      });
      // Detalles dentro de las salas.
      rooms.forEach((r, i) => {
        const roll = m.R(),
          inner = (dx, dy) => [r.x + 1 + m.int(0, Math.max(0, r.w - 3)), r.y + 1 + m.int(0, Math.max(0, r.h - 3))];
        if (i && roll < 0.2 && r.w >= 5 && r.h >= 4) {
          const [px, py] = inner();
          m.set(px, py, 'p');
          if (m.get(px + 1, py) === 'f') m.set(px + 1, py, 'p');
        } else if (roll < 0.3) {
          const [px, py] = inner();
          m.set(px, py, 'w');
        } else if (roll < 0.45)
          for (let j = r.y; j < r.y + r.h; j++)
            for (let k = r.x; k < r.x + r.w; k++) if (m.get(k, j) === 'f') m.set(k, j, 'm');
        for (let n = m.int(0, 2); n > 0; n--) {
          const [px, py] = inner();
          if (m.get(px, py) === 'f') m.set(px, py, 'd');
        }
      });
    },
    ruins(m) {
      m.fill('g');
      forest(m, 0.6);
      const horizontal = m.cols >= m.rows,
        line = m.meander(horizontal ? m.cols : m.rows, horizontal ? m.rows : m.cols, 110, 0.15);
      m.band(line, 2, 'a', horizontal);
      const made = [];
      for (let tries = 0; tries < 80 && made.length < (m.cols > 30 ? 4 : 3); tries++) {
        const w = m.int(5, 9),
          h = m.int(4, 7),
          x = m.int(1, m.cols - w - 1),
          y = m.int(1, m.rows - h - 1);
        if (
          x < 1 ||
          y < 1 ||
          made.some(r => x < r.x + r.w + 2 && x + w + 2 > r.x && y < r.y + r.h + 2 && y + h + 2 > r.y)
        )
          continue;
        made.push({ x, y, w, h });
        for (let j = y; j < y + h; j++)
          for (let i = x; i < x + w; i++) {
            const edge = i === x || j === y || i === x + w - 1 || j === y + h - 1,
              roll = m.R();
            if (edge) m.set(i, j, roll < 0.6 ? '#' : roll < 0.85 ? 'd' : 'g');
            else m.set(i, j, roll < 0.7 ? 'f' : roll < 0.85 ? 'd' : 'g');
          }
      }
      m.scatter('d', 0.02, c => c === 'g');
      m.scatter('r', 0.01, c => c === 'g');
    },
    tavern(m, opt = {}) {
      const floorsN = Math.max(1, Math.min(3, Math.trunc(opt.floors) || 2)),
        cellar = Boolean(opt.cellar);
      m.fill('g');
      // La calle abajo y el edificio ocupando el resto (después se espeja todo al azar, piso por piso igual).
      for (let y = m.rows - 3; y < m.rows; y++) for (let x = 0; x < m.cols; x++) m.set(x, y, 'a');
      const x0 = m.int(1, 3),
        y0 = m.int(1, 2),
        x1 = m.cols - 1 - m.int(1, 3),
        y1 = m.rows - 5,
        ix0 = x0 + 1,
        ix1 = x1 - 1,
        iy0 = y0 + 1,
        iy1 = y1 - 1,
        W = ix1 - ix0 + 1,
        H = iy1 - iy0 + 1;
      const shell = (k, floor) => {
        for (let y = y0; y <= y1; y++)
          for (let x = x0; x <= x1; x++) k.set(x, y, x === x0 || y === y0 || x === x1 || y === y1 ? '#' : floor);
      };
      // Escaleras: en el rincón de abajo a la derecha, una al lado de la otra; la del sótano, en el depósito.
      const UP = [ix1, iy1],
        UP2 = [ix1 - 1, iy1],
        DOWN = [ix1, iy0];
      const wood = c => c === 'm',
        // Casillas que tienen que quedar libres: frente a cada puerta y junto a las escaleras.
        keep = (k, x, y, w = 1, h = 1) => k.hold(x, y, w, h);

      // ----- Planta baja -----
      shell(m, 'm');
      const bh = H < 8 ? 2 : H < 12 ? 3 : 4,
        split = iy0 + bh,
        kx = ix0 + Math.max(3, Math.round(W * (0.36 + m.R() * 0.12)));
      for (let x = ix0; x <= ix1; x++) m.set(x, split, '#');
      for (let y = iy0; y < split; y++) m.set(kx, y, '#');
      for (let y = iy0; y < split; y++) for (let x = ix0; x < kx; x++) m.set(x, y, 'f');
      const kDoor = m.int(ix0 + 1, kx - 1),
        sDoor = m.int(kx + 2, ix1 - 3),
        entrance = m.int(ix0 + 2, Math.max(ix0 + 2, ix1 - 4));
      m.set(kDoor, split, 'D');
      m.set(sDoor, split, 'D');
      m.set(entrance, y1, 'D');
      for (const d of [kDoor, sDoor]) {
        keep(m, d, split - 1);
        keep(m, d, split + 1);
      }
      keep(m, entrance, iy1 - 1, 1, 2);
      keep(m, ix1 - 2, iy1 - 1, 3, 2);
      m.set(...UP, 'S');
      if (floorsN > 2) m.set(...UP2, 'S');
      if (cellar) {
        m.set(...DOWN, 'S');
        keep(m, ix1 - 1, iy0, 2, 2);
      }
      // Cocina: fuego, caldero, estante y una mesa de trabajo.
      const stone = c => c === 'f';
      m.put(ix0, iy0, 'stove', 0, stone);
      m.put(ix0 + 1, iy0, 'cauldron', 0, stone);
      m.put(kx - 2, iy0, 'shelf', 0, stone);
      if (bh >= 3) m.put(ix0, split - 1, m.pick(['sacks', 'crate', 'barrel']), 0, stone);
      if (bh >= 3 && kx - ix0 >= 5) m.put(ix0 + 2, iy0 + 1, 'table2', 0, stone);
      // Depósito: toneles y cajones contra la pared del fondo.
      for (let x = kx + 1; x <= ix1 - (cellar ? 2 : 0);) {
        const id = m.pick(['barrel', 'barrels', 'keg', 'crate', 'crates', 'sacks', 'barrel']),
          w = P.get(id).w;
        if (m.R() < 0.8) m.put(x, iy0, id, 0, wood);
        x += w;
      }
      if (bh >= 3)
        for (let x = kx + 1; x <= ix1; x++)
          if (m.R() < 0.3) m.put(x, split - 1, m.pick(['barrel', 'crate', 'sacks']), 0, wood);
      // Barra frente a la cocina, con toneles detrás y banquetas delante.
      const common = iy1 - split,
        deep = common >= 5,
        by = split + (deep ? 2 : 1),
        barLen = Math.max(3, Math.min(8, kx - ix0));
      for (let x = ix0; x < ix0 + barLen; x++) {
        if (deep && x === kDoor) continue; // el paso del cantinero a la cocina
        m.put(x, by, 'bar', 0, wood);
        if (m.R() < 0.7) m.put(x, by + 1, 'stool', 0, wood);
      }
      if (deep)
        for (let x = ix0; x < ix0 + barLen - 1; x++)
          if (x !== kDoor && x + 1 !== kDoor && m.R() < 0.5) {
            m.put(x, split + 1, m.pick(['keg', 'barrels', 'shelf']), 0, wood);
            x++;
          }
      keep(m, ix0, by + 1, barLen + 1, 1);
      // Hogar contra la pared del depósito, con su alfombra.
      let hx = Math.min(ix1 - 3, Math.max(kx + 1, sDoor + 2));
      if (hx + 1 >= ix1 || hx <= sDoor) hx = kx + 1 === sDoor ? sDoor + 1 : kx + 1;
      if (m.put(hx, split + 1, 'hearth', 0, wood) && common >= 4) {
        m.put(Math.max(ix0, Math.min(ix1 - 2, hx - 1)), split + 2, 'rug', 0, wood);
        keep(m, hx, split + 2, 2, 1);
      }
      // Mesas: se prueban conjuntos (mesa y sus sillas) casilla por casilla, dejando un paso entre ellos.
      const room = (x, y, w, h) => {
        for (let j = -1; j <= h; j++)
          for (let i = -1; i <= w; i++) {
            const c = m.get(x + i, y + j),
              border = i < 0 || j < 0 || i === w || j === h;
            if (border ? c === 'm' && !m.free(x + i, y + j) && false : c !== 'm' || !m.free(x + i, y + j)) return false;
          }
        return true;
      };
      const SETS = [
        // [ancho, alto, piezas [dx, dy, id, giro, probabilidad]]
        [
          3,
          3,
          [
            [1, 1, 'table'],
            [1, 0, 'chair', 0, 0.8],
            [1, 2, 'chair', 2, 0.8],
            [0, 1, 'chair', 3, 0.6],
            [2, 1, 'chair', 1, 0.6],
          ],
        ],
        [
          2,
          3,
          [
            [0, 1, 'table2'],
            [0, 0, 'bench'],
            [0, 2, 'bench'],
          ],
        ],
        [
          4,
          4,
          [
            [1, 1, 'table4'],
            [1, 0, 'chair', 0, 0.9],
            [2, 0, 'chair', 0, 0.7],
            [1, 3, 'chair', 2, 0.9],
            [2, 3, 'chair', 2, 0.7],
            [0, 1, 'chair', 3, 0.7],
            [3, 2, 'chair', 1, 0.7],
          ],
        ],
        [
          3,
          2,
          [
            [1, 0, 'table'],
            [0, 0, 'stool', 0, 0.9],
            [2, 0, 'stool', 0, 0.9],
            [1, 1, 'stool', 0, 0.6],
          ],
        ],
      ];
      for (let y = split + 1; y <= iy1; y++)
        for (let x = ix0; x <= ix1; x++) {
          const set = SETS[m.R() < 0.14 && common >= 6 ? 2 : m.pick([0, 0, 1, 1, 3])];
          if (m.R() < 0.75 && room(x, y, set[0], set[1])) {
            for (const [dx, dy, id, rot = 0, chance = 1] of set[2])
              if (m.R() < chance) m.put(x + dx, y + dy, id, rot, wood);
            m.hold(x - 1, y - 1, set[0] + 2, set[1] + 2);
          }
        }
      // Afuera: cartel y farol junto a la puerta, y la calle con su carro.
      m.props.push([entrance + 1, y1 + 1, 'sign', 0], [entrance - 1, y1 + 1, 'lamp', 0]);
      m.retake();
      const dirt = c => c === 'a',
        grass = c => c === 'g';
      for (let n = 0, tries = 0; n < 3 && tries < 30; tries++)
        if (
          m.put(
            m.int(1, m.cols - 3),
            m.int(m.rows - 2, m.rows - 1),
            m.pick(['cart', 'hay', 'trough', 'barrel', 'crates']),
            0,
            dirt,
          )
        )
          n++;
      m.scatter('t', 0.25, (c, x) => c === 'g' && (x < x0 || x > x1));
      for (let n = 0, tries = 0; n < 4 && tries < 40; tries++)
        if (
          m.put(
            m.int(0, m.cols - 2),
            m.int(0, y1),
            m.pick(['bush', 'woodpile', 'barrel', 'stump', 'well', 'hay']),
            0,
            grass,
          )
        )
          n++;

      // ----- Pisos de arriba: un pasillo y habitaciones -----
      const floors = [{ name: 'Planta baja', m, ambient: 'tavern', links: {} }];
      const bedroom = (k, rx0, ry0, rx1, ry1, doorX, below, grand) => {
        // `below`: la puerta está abajo (la cama va contra la pared de arriba). Si no, todo al revés.
        const w = rx1 - rx0 + 1,
          h = ry1 - ry0 + 1,
          at = (lx, ly, id, rot = 0) => {
            const [pw, ph] = P.footprint(id, rot);
            return (
              k.put(
                rx0 + lx,
                below ? ry0 + ly : ry1 - ly - (ph - 1),
                id,
                below || rot % 2 ? rot : (rot + 2) & 3,
                wood,
              ) && pw
            );
          };
        k.hold(doorX, below ? ry1 : ry0);
        if (h >= 3 && w >= 3 && k.R() < 0.5)
          at(Math.max(0, Math.floor((w - 2) / 2)), Math.max(1, h - 3), w >= 5 && k.R() < 0.5 ? 'rug' : 'rug2', 0);
        const big = grand || (w >= 5 && k.R() < 0.35);
        let x = k.R() < 0.5 ? 0 : Math.max(0, w - (big ? 2 : 1) - (w >= 4 ? 1 : 0));
        if (h < 2) return at(0, 0, 'chest');
        at(x, 0, big ? 'bed2' : 'bed');
        const side = x + (big ? 2 : 1) < w ? x + (big ? 2 : 1) : x - 1;
        if (side >= 0) at(side, 0, k.pick(['chest', 'candles', 'chest', 'stool']));
        // El resto de la pared del fondo: ropero, escritorio o biblioteca.
        for (let lx = 0; lx + 1 < w; lx++)
          if (
            k.R() < 0.6 &&
            at(lx, 0, k.pick(grand ? ['wardrobe', 'bookshelf', 'desk'] : ['wardrobe', 'desk', 'shelf']))
          )
            lx += 2;
        if (grand && h >= 4 && k.R() < 0.35) at(w - 1, h - 3, 'tub', 0);
        if (h >= 4 && k.R() < 0.5) at(k.int(0, w - 1), h - 1, k.pick(['chair', 'stool', 'crate', 'barrel']), 2);
      };
      const upper = idx => {
        const k = make(m.cols, m.rows, (opt.seed + idx * 7919) >>> 0),
          top = idx === floorsN - 1;
        shell(k, 'm');
        const rooms = (ax, bx, wallY, ry0, ry1, below) => {
          // Parte el ancho en habitaciones de 3 a 6 casillas, con una puerta cada una hacia el pasillo.
          let x = ax;
          while (x <= bx) {
            let w = top && k.R() < 0.4 ? k.int(5, 7) : k.int(3, 5);
            if (bx - (x + w) < 4) w = bx - x + 1;
            const rx1 = x + w - 1;
            if (rx1 < bx) for (let y = ry0; y <= ry1; y++) k.set(rx1 + 1, y, '#');
            const door = k.int(x + (w > 2 ? 1 : 0), rx1 - (w > 3 ? 1 : 0));
            k.set(door, wallY, 'D');
            k.hold(door, below ? wallY + 1 : wallY - 1);
            bedroom(k, x, ry0, rx1, ry1, door, below, top && w >= 5);
            x = rx1 + 2;
          }
        };
        if (H < 10) {
          // Edificio bajo: pasillo abajo y habitaciones arriba.
          const wallY = iy1 - 1;
          for (let x = ix0; x <= ix1; x++) k.set(x, wallY, '#');
          rooms(ix0, ix1, wallY, iy0, wallY - 1, true);
        } else {
          // Pasillo al medio, habitaciones a los dos lados y el descanso de la escalera a la derecha.
          const cy = iy0 + Math.floor((H - 2) / 2);
          for (let x = ix0; x <= ix1; x++) k.set(x, cy - 1, '#');
          for (let x = ix0; x <= ix1 - 3; x++) k.set(x, cy + 2, '#');
          for (let y = cy + 2; y <= iy1; y++) k.set(ix1 - 2, y, '#');
          rooms(ix0, ix1, cy - 1, iy0, cy - 2, true);
          rooms(ix0, ix1 - 3, cy + 2, cy + 3, iy1, false);
          if (k.R() < 0.7) k.put(ix0 + 1, cy, 'rug', 0, wood);
          k.put(ix1, cy + 3 <= iy1 - 2 ? cy + 3 : cy, k.pick(['candles', 'barrel', 'crate']), 0, wood);
        }
        // Lo de afuera del edificio no existe en un piso alto.
        k.each((x, y) => {
          if (x < x0 || x > x1 || y < y0 || y > y1) k.set(x, y, '.');
        });
        const stairsDown = idx === 1 ? UP : UP2;
        k.set(...stairsDown, 'S');
        const links = { [stairsDown.join(',')]: idx - 1 };
        if (idx < floorsN - 1) {
          k.set(...UP2, 'S');
          links[UP2.join(',')] = idx + 1;
        }
        // Nada delante de las escaleras.
        k.props = k.props.filter(([px, py, id, rot]) => {
          const [w, h] = P.footprint(id, rot);
          return P.get(id).flat || px + w <= ix1 - 2 || py + h <= iy1 - (H < 10 ? 0 : 1);
        });
        return { name: ['', 'Primer piso', 'Segundo piso'][idx], m: k, ambient: '', links };
      };
      floors[0].links[UP.join(',')] = floorsN > 1 ? 1 : null;
      if (floorsN > 2) floors[0].links[UP2.join(',')] = null; // la segunda escalera de la planta baja es de adorno
      for (let idx = 1; idx < floorsN; idx++) floors.push(upper(idx));
      if (floorsN > 2) {
        // Con tres pisos: planta baja → primero por UP; primero → segundo por UP2. En la planta baja queda una sola.
        m.set(...UP2, 'm');
        delete floors[0].links[UP2.join(',')];
      }
      if (floorsN < 2) delete floors[0].links[UP.join(',')];
      if (cellar) {
        const k = make(m.cols, m.rows, (opt.seed + 104729) >>> 0),
          stoneFloor = c => c === 'f';
        k.fill('.');
        shell(k, 'f');
        k.set(...DOWN, 'S');
        k.hold(ix1 - 1, iy0, 2, 2);
        for (let y = iy0 + 2; y <= iy1 - 2; y += 4)
          for (let x = ix0 + 3; x <= ix1 - 3; x += 5) k.put(x, y, 'pillar', 0, stoneFloor);
        for (let x = ix0; x <= ix1 - 3;) {
          const id = k.pick(['keg', 'keg', 'barrels', 'barrel', 'crates', 'shelf']);
          if (k.R() < 0.8) k.put(x, iy0, id, 0, stoneFloor);
          x += P.get(id).w;
        }
        for (let x = ix0; x <= ix1;) {
          const id = k.pick(['crates', 'crate', 'sacks', 'barrel', 'barrels', 'chest']);
          if (k.R() < 0.6) k.put(x, iy1, id, 0, stoneFloor);
          x += P.get(id).w;
        }
        for (const [cx, cy, rot] of [
          [ix0, iy1, 3],
          [ix1, iy1, 2],
          [ix0, iy0, 0],
        ])
          if (k.R() < 0.7) k.props.push([cx, cy, 'web', rot]);
        for (let n = 0; n < 4 + Math.round(W / 4); n++)
          k.put(
            k.int(ix0 + 1, ix1 - 2),
            k.int(iy0 + 2, iy1 - 2),
            k.pick(['table2', 'bones', 'crates', 'candles', 'barrels', 'keg', 'sacks']),
            k.int(0, 1),
            stoneFloor,
          );
        floors[0].links[DOWN.join(',')] = floors.length;
        floors.push({ name: 'Sótano', m: k, ambient: 'cave', links: { [DOWN.join(',')]: 0 } });
      }
      // Todo el edificio se espeja igual, piso por piso.
      const flipH = m.R() < 0.5,
        flipV = m.R() < 0.5;
      for (const f of floors) {
        if (flipH) mirror(f.m, true);
        if (flipV) mirror(f.m, false);
        f.links = Object.fromEntries(
          Object.entries(f.links).map(([key, to]) => {
            const [x, y] = key.split(',').map(Number);
            return [(flipH ? m.cols - 1 - x : x) + ',' + (flipV ? m.rows - 1 - y : y), to];
          }),
        );
      }
      return { floors };
    },
    village(m) {
      m.fill('g');
      // Dos caminos que se cruzan en una plaza empedrada con su pozo.
      const h = m.meander(m.cols, m.rows, 120, 0.1),
        v = m.meander(m.rows, m.cols, 121, 0.1);
      m.band(h, 2, 'a', true);
      m.band(v, 2, 'a', false);
      const px = v[Math.min(m.rows - 1, h[Math.floor(m.cols / 2)])],
        py = h[Math.min(m.cols - 1, px)];
      for (let y = py - 2; y <= py + 3; y++)
        for (let x = px - 3; x <= px + 3; x++) if (m.inside(x, y)) m.set(x, y, 'f');
      m.set(px, py, 'w');
      // Casas: paredes, piso de madera y una puerta hacia el camino más cercano.
      const houses = [];
      for (let tries = 0; tries < 300 && houses.length < Math.round((m.cols * m.rows) / 85); tries++) {
        const w = m.int(4, 7),
          hh = m.int(4, 6),
          x = m.int(1, m.cols - w - 1),
          y = m.int(1, m.rows - hh - 1);
        let clear = x >= 1 && y >= 1;
        for (let j = y - 1; clear && j <= y + hh; j++)
          for (let i = x - 1; i <= x + w; i++) if (m.get(i, j) !== 'g') clear = false;
        if (!clear) continue;
        // Tiene que quedar cerca de un camino.
        let close = false;
        for (let j = y - 3; j <= y + hh + 2; j++)
          for (let i = x - 3; i <= x + w + 2; i++) if (m.get(i, j) === 'a' || m.get(i, j) === 'f') close = true;
        if (!close) continue;
        houses.push({ x, y, w, h: hh });
        for (let j = y; j < y + hh; j++)
          for (let i = x; i < x + w; i++)
            m.set(i, j, i === x || j === y || i === x + w - 1 || j === y + hh - 1 ? '#' : 'm');
      }
      for (const r of houses) {
        // Puerta en el lado que mira al camino más cercano, y un senderito hasta él.
        const sides = [
          [r.x + m.int(1, r.w - 2), r.y, 0, -1],
          [r.x + m.int(1, r.w - 2), r.y + r.h - 1, 0, 1],
          [r.x, r.y + m.int(1, r.h - 2), -1, 0],
          [r.x + r.w - 1, r.y + m.int(1, r.h - 2), 1, 0],
        ]
          .map(([dx, dy, sx, sy]) => {
            let n = 1;
            while (n < 12 && m.get(dx + sx * n, dy + sy * n) === 'g') n++;
            const hit = m.get(dx + sx * n, dy + sy * n);
            return { dx, dy, sx, sy, n: hit === 'a' || hit === 'f' ? n : 99 };
          })
          .sort((a, b) => a.n - b.n)[0];
        m.set(sides.dx, sides.dy, 'D');
        if (sides.n < 99)
          for (let n = 1; n < sides.n; n++) m.set(sides.dx + sides.sx * n, sides.dy + sides.sy * n, 'a');
      }
      forest(m, 0.62, 5);
      m.scatter('d', 0.01, c => c === 'g');
    },
    castle(m) {
      m.fill('g');
      forest(m, 0.66, 6);
      // Foso, muralla y patio.
      const mx0 = 1,
        my0 = 1,
        mx1 = m.cols - 2,
        my1 = m.rows - 2,
        x0 = mx0 + 2,
        y0 = my0 + 2,
        x1 = mx1 - 2,
        y1 = my1 - 2;
      for (let y = my0; y <= my1; y++) for (let x = mx0; x <= mx1; x++) m.set(x, y, 'w');
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) m.set(x, y, x === x0 || y === y0 || x === x1 || y === y1 ? '#' : 'a');
      m.each((x, y, c) => {
        if (c === 'a' && m.noise(x, y, 4, 130) > 0.62) m.set(x, y, 'g');
      });
      // Torres en las esquinas: macizas por fuera, con un cuarto adentro.
      for (const [tx, ty] of [
        [x0, y0],
        [x1 - 2, y0],
        [x0, y1 - 2],
        [x1 - 2, y1 - 2],
      ]) {
        for (let y = ty - 1; y <= ty + 3; y++)
          for (let x = tx - 1; x <= tx + 3; x++) if (x >= mx0 && y >= my0 && x <= mx1 && y <= my1) m.set(x, y, '#');
        m.set(tx + 1, ty + 1, 'f');
        const ix = tx === x0 ? tx + 3 : tx - 1,
          iy = ty + 1;
        m.set(ix, iy, 'D');
      }
      // Puerta principal abajo, con su puente sobre el foso y el camino que llega.
      const gate = m.int(x0 + 5, x1 - 6);
      for (let d = 0; d < 2; d++) {
        m.set(gate + d, y1, 'D');
        for (let y = y1 + 1; y <= my1; y++) m.set(gate + d, y, 'm');
        for (let y = my1 + 1; y < m.rows; y++) m.set(gate + d, y, 'a');
        for (let y = y1 - 3; y < y1; y++) m.set(gate + d, y, 'a');
      }
      // Torre del homenaje contra la muralla del fondo, con salón de piedra y una cámara.
      const kw = Math.max(7, Math.round((x1 - x0) * 0.4)),
        kh = Math.max(5, Math.round((y1 - y0) * 0.4)),
        kx = m.int(x0 + 4, Math.max(x0 + 4, x1 - kw - 4)),
        ky = y0 + 2;
      for (let y = ky; y < ky + kh; y++)
        for (let x = kx; x < kx + kw; x++)
          m.set(x, y, x === kx || y === ky || x === kx + kw - 1 || y === ky + kh - 1 ? '#' : 'f');
      const wall = kx + Math.round(kw * 0.62);
      for (let y = ky + 1; y < ky + kh - 1; y++) m.set(wall, y, '#');
      m.set(wall, ky + m.int(1, kh - 2), 'D');
      m.set(kx + m.int(1, Math.max(1, wall - kx - 1)), ky + kh - 1, 'D');
      // Establo de madera y pozo en el patio.
      const sx = kx > (x0 + x1) / 2 ? x0 + 4 : x1 - 7,
        sy = y1 - 4;
      for (let y = sy; y < sy + 2; y++)
        for (let x = sx; x < sx + 4; x++) if (m.get(x, y) === 'a' || m.get(x, y) === 'g') m.set(x, y, 'm');
      const spots = [];
      m.each(
        (x, y, c) =>
          (c === 'a' || c === 'g') && x > x0 + 4 && x < x1 - 4 && y > ky + kh + 1 && y < y1 - 5 && spots.push([x, y]),
      );
      if (spots.length) m.set(...spots[m.int(0, spots.length - 1)], 'w');
      m.scatter('d', 0.02, c => c === 'a');
    },
    ship(m) {
      m.fill('W');
      m.each((x, y) => {
        if (m.noise(x, y, 5, 140) > 0.7) m.set(x, y, 'w');
      });
      // Casco: ancho al centro, popa recta a la izquierda y proa en punta a la derecha (después se espeja al azar).
      const cy = (m.rows - 1) / 2,
        left = 2,
        right = m.cols - 3,
        half = Math.min(Math.floor(m.rows / 2) - 2, Math.max(3, Math.round(m.cols / 7))),
        deck = (x, y) => {
          if (x < left || x > right) return false;
          const t = (x - left) / (right - left),
            w =
              t < 0.12
                ? half * (0.75 + t * 2)
                : t > 0.6
                  ? half * Math.sqrt(Math.max(0, 1 - ((t - 0.6) / 0.4) ** 2))
                  : half;
          return Math.abs(y - cy) <= w + 0.01;
        };
      m.each((x, y) => {
        if (!deck(x, y)) return;
        const edge = !deck(x - 1, y) || !deck(x + 1, y) || !deck(x, y - 1) || !deck(x, y + 1);
        m.set(x, y, edge ? '#' : 'm');
      });
      // Camarote de popa, con su puerta.
      const cabin = left + Math.max(4, Math.round((right - left) * 0.2));
      for (let y = 0; y < m.rows; y++) if (m.get(cabin, y) === 'm') m.set(cabin, y, '#');
      m.set(cabin, Math.round(cy) + m.int(-1, 1), 'D');
      // Mástiles, la escotilla de la bodega y carga en cubierta.
      for (const t of [0.42, 0.68]) m.set(Math.round(left + (right - left) * t), Math.round(cy), '#');
      const hx = Math.round(left + (right - left) * 0.55);
      for (let d = 0; d < 2; d++) if (m.get(hx + d, Math.round(cy) + 2) === 'm') m.set(hx + d, Math.round(cy) + 2, 'p');
      m.scatter('d', 0.05, (c, x, y) => c === 'm' && x > cabin + 1 && !m.near(x, y, ['D', 'p']));
      // Un bote amarrado al costado.
      const bx = Math.round(left + (right - left) * 0.3),
        by = Math.round(cy) + half + 2;
      if (by + 1 < m.rows) for (let x = bx; x < bx + 3; x++) m.set(x, by, 'm');
      if (m.R() < 0.5) mirror(m, true);
      if (m.R() < 0.5) mirror(m, false);
    },
  };
  // Espeja el mapa de izquierda a derecha (o de arriba abajo).
  function mirror(m, horizontal) {
    const copy = m.cells.slice();
    for (let y = 0; y < m.rows; y++)
      for (let x = 0; x < m.cols; x++)
        m.cells[y * m.cols + x] = copy[(horizontal ? y : m.rows - 1 - y) * m.cols + (horizontal ? m.cols - 1 - x : x)];
    if (m.props?.length && P) {
      m.props = P.mirror(m.props, m.cols, m.rows, horizontal);
      m.retake();
    }
  }

  // Genera un mapa: { type, name, cols, rows, seed, terrain } (terrain: una letra por casilla, por filas).
  // Sonido de ambiente que le va a cada tipo de mapa.
  const AMBIENT = {
    trail: 'forest',
    woods: 'forest',
    river: 'forest',
    swamp: 'forest',
    village: 'forest',
    ruins: 'wind',
    desert: 'wind',
    ice: 'wind',
    coast: 'sea',
    ship: 'sea',
    cave: 'cave',
    lava: 'cave',
    dungeon: 'dungeon',
    castle: 'dungeon',
    tavern: 'tavern',
  };
  const ambient = type => AMBIENT[type] || '';
  // Mapas techados: una escalera contra una pared, para unirlos con el piso de arriba o de abajo.
  const STAIRS = { dungeon: 'f', castle: 'f', ship: 'm', cave: 'f' };
  function stairs(m, floor) {
    const spots = [];
    m.each((x, y, c) => {
      if (c !== floor && !(floor === 'f' && c === 'a')) return;
      if (m.near(x, y, ['D', 'd', 'w', 'W', 'l', 'p'])) return;
      const solid = (dx, dy) => '#r'.includes(m.get(x + dx, y + dy));
      // Contra una pared de un solo lado: no tapa un pasillo.
      const sides = [solid(0, -1), solid(1, 0), solid(0, 1), solid(-1, 0)].filter(Boolean).length;
      if (sides === 1) spots.push([x, y]);
    });
    if (spots.length) m.set(...spots[m.int(0, spots.length - 1)], 'S');
  }
  // Decorado de los demás mapas: piezas contra las paredes (`wall`), sueltas en lugares abiertos (`open`)
  // y al aire libre (`out`: [códigos de terreno, piezas]). `n` = cuántas por cada 100 casillas aptas.
  const DECOR = {
    dungeon: {
      floor: 'fm',
      wall: ['barrel', 'crate', 'crates', 'rack', 'bones', 'web', 'chest', 'sacks', 'coffin', 'cage'],
      open: ['pillar', 'statue', 'brazier', 'bones', 'altar', 'table2', 'candles'],
      n: 10,
    },
    castle: {
      floor: 'f',
      wall: ['rack', 'bookshelf', 'wardrobe', 'chest', 'barrel', 'bed', 'shelf', 'crates', 'desk'],
      open: ['table2', 'table4', 'pillar', 'brazier', 'rug', 'statue', 'candles'],
      n: 12,
      out: ['a', ['cart', 'hay', 'barrel', 'crates', 'trough', 'woodpile', 'well', 'anvil']],
      outN: 3,
    },
    ruins: {
      floor: 'f',
      wall: ['web', 'bones', 'crate'],
      open: ['pillar', 'bones', 'statue', 'boulder'],
      n: 4,
      out: ['gad', ['boulder', 'bush', 'bones', 'stump', 'log']],
      outN: 1.5,
    },
    cave: { floor: 'af', wall: ['web', 'bones'], open: ['boulder', 'bones', 'boulder', 'campfire'], n: 2 },
    lava: { floor: 'af', wall: ['bones'], open: ['boulder', 'bones'], n: 2 },
    ship: {
      floor: 'm',
      wall: ['barrel', 'crate', 'crates', 'rope', 'barrels', 'cannon', 'hammock', 'chest'],
      open: ['rope', 'crate', 'table', 'barrel'],
      n: 12,
    },
    village: {
      floor: 'm',
      wall: ['bed', 'wardrobe', 'shelf', 'chest', 'barrel', 'desk', 'crate', 'stove'],
      open: ['table', 'table2', 'rug2', 'stool'],
      n: 22,
      out: ['ga', ['cart', 'hay', 'stall', 'sign', 'lamp', 'crops', 'barrel', 'trough', 'bush', 'woodpile', 'fence']],
      outN: 2,
    },
    trail: { out: ['g', ['log', 'stump', 'boulder', 'bush', 'bush']], outN: 1.6 },
    woods: { out: ['g', ['log', 'stump', 'boulder', 'bush', 'bush', 'campfire']], outN: 1.6 },
    river: { out: ['gs', ['log', 'boulder', 'bush', 'stump', 'boat']], outN: 1.3 },
    swamp: { out: ['ga', ['log', 'stump', 'bones', 'bush']], outN: 1.3 },
    coast: { out: ['sg', ['boat', 'log', 'boulder', 'crate', 'barrel', 'bush']], outN: 1.2 },
    desert: { out: ['sa', ['boulder', 'bones', 'boulder']], outN: 0.9 },
    ice: { out: ['hg', ['boulder', 'log', 'bones']], outN: 0.8 },
  };
  function decor(m, d) {
    if (!P) return;
    const solid = (x, y) => {
      const c = m.get(x, y);
      return c === '#' || c === 'r' || c === null;
    };
    if (d.floor) {
      const is = (x, y) => d.floor.includes(m.get(x, y)),
        wall = [],
        open = [];
      let total = 0;
      m.each((x, y, c) => {
        total += d.floor.includes(c) ? 1 : 0;
        if (!d.floor.includes(c) || m.near(x, y, ['D', 'O', 'L', 'S'], 1)) return;
        const sides = [solid(x, y - 1), solid(x + 1, y), solid(x, y + 1), solid(x - 1, y)],
          count = sides.filter(Boolean).length;
        // Contra una sola pared y con lugar enfrente: no tapa un pasillo de una casilla.
        if (count === 1 || (count === 2 && sides[0] !== sides[2])) {
          const rot = sides.indexOf(true),
            [ox, oy] = [
              [0, 1],
              [-1, 0],
              [0, -1],
              [1, 0],
            ][rot];
          if (is(x + ox, y + oy) && is(x + ox * 2, y + oy * 2)) wall.push([x, y, rot]);
        } else if (count === 0) {
          let all = true;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (!is(x + dx, y + dy)) all = false;
          if (all) open.push([x, y]);
        }
      });
      const want = wall.length + open.length ? Math.round((total * d.n) / 100) : 0,
        floorOnly = c => d.floor.includes(c);
      for (let n = 0, tries = 0; n < want && tries < want * 12; tries++) {
        if (wall.length && (m.R() < 0.65 || !open.length)) {
          const [x, y, rot] = m.pick(wall),
            id = m.pick(d.wall),
            [w, h] = P.footprint(id, rot);
          // Las piezas de dos casillas se apoyan a lo largo de la pared.
          const along = (i, j) => solid(x + i + [0, 1, 0, -1][rot], y + j + [-1, 0, 1, 0][rot]);
          let fine = true;
          for (let j = 0; j < h; j++)
            for (let i = 0; i < w; i++)
              if (!along(i, j) && (rot % 2 ? i === (rot === 1 ? w - 1 : 0) : j === (rot === 0 ? 0 : h - 1)))
                fine = false;
          if (fine && !m.near(x + w - 1, y + h - 1, ['D', 'O', 'L', 'S'], 1) && m.put(x, y, id, rot, floorOnly)) n++;
        } else if (open.length) {
          const [x, y] = m.pick(open),
            id = m.pick(d.open);
          if (
            !m.near(x, y, ['D', 'S'], 2) &&
            m.put(x, y, id, m.int(0, 1) * (P.get(id).w === P.get(id).h ? 0 : 1), floorOnly)
          ) {
            m.hold(x - 1, y - 1, 3, 3);
            n++;
          }
        }
      }
    }
    if (d.out) {
      const [codes, list] = d.out,
        on = c => codes.includes(c),
        spots = [];
      m.each((x, y, c) => on(c) && spots.push([x, y]));
      const want = Math.round((spots.length * d.outN) / 100);
      for (let n = 0, tries = 0; n < want && tries < want * 5; tries++) {
        const [x, y] = m.pick(spots),
          id = m.pick(list),
          // Los cultivos, sobre el pasto; los botes, en la arena de la orilla.
          ok = id === 'crops' ? c => c === 'g' : id === 'boat' ? c => c === 's' : on;
        if (!m.near(x, y, ['D', 'O', 'S'], 1) && m.put(x, y, id, m.int(0, 3), ok)) {
          m.hold(x - 1, y - 1, 3, 3);
          n++;
        }
      }
    }
  }

  // Genera un mapa: { type, name, cols, rows, seed, terrain, props, floors }.
  // terrain: una letra por casilla, por filas. props: muebles [x, y, id, giro].
  // floors: los pisos del lugar (el primero es la planta principal), cada uno con su terreno, sus muebles
  // y sus escaleras: links = { 'x,y': índice del piso al que lleva }.
  // Opciones: floors (1–3) y cellar para los edificios que los admiten (MULTI).
  const MULTI = { tavern: { floors: [1, 2, 3], cellar: true } };
  function generate(type, { size = 'medium', cols, rows, seed, floors, cellar } = {}) {
    const info = TYPES.find(t => t[0] === type);
    if (!info) throw Error('Ese tipo de mapa no existe.');
    const s = SIZES[size] || SIZES.medium,
      c = Math.max(12, Math.min(80, Math.trunc(cols) || s[1])),
      r = Math.max(10, Math.min(80, Math.trunc(rows) || s[2])),
      sd = (seed ?? Math.floor(Math.random() * 4294967296)) >>> 0,
      m = make(c, r, sd);
    // Solo los edificios con pisos reciben opciones: los demás usan su segundo parámetro para otra cosa.
    const built = MULTI[type] ? GEN[type](m, { floors, cellar, seed: sd }) : GEN[type](m);
    if (STAIRS[type]) stairs(m, STAIRS[type]);
    if (DECOR[type]) decor(m, DECOR[type]);
    const clean = k => (P ? P.norm({ cols: c, rows: r }, k.props) : []);
    const list = built?.floors
      ? built.floors.map(f => ({
          name: f.name,
          terrain: f.m.cells.join(''),
          props: clean(f.m),
          links: Object.fromEntries(Object.entries(f.links).filter(([, to]) => Number.isInteger(to))),
          ambient: f.ambient,
        }))
      : [{ name: info[1], terrain: m.cells.join(''), props: clean(m), links: {}, ambient: ambient(type) }];
    return {
      type,
      name: info[1],
      cols: c,
      rows: r,
      seed: sd,
      terrain: list[0].terrain,
      props: list[0].props,
      floors: list,
    };
  }
  const api = { TYPES, SIZES, MULTI, generate, rng, ambient };
  if (typeof module !== 'undefined') module.exports = api;
  root.BoardGen = api;
})(typeof window !== 'undefined' ? window : globalThis);
