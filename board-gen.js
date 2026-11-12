/* Generador de mapas para el tablero: caminos, bosques, ríos, cuevas, mazmorras…
   Devuelve terreno pintado (los mismos códigos que el pincel), así que el resultado se puede retocar a mano.
   Con la misma semilla sale siempre el mismo mapa. Lógica sin navegador. */
(function (root) {
  'use strict';
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
    ['tavern', 'Taberna', 'Un edificio con salón, habitaciones y la calle al frente.'],
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
    return { R, cols, rows, cells, inside, get, set, int, noise, each, fill, meander, band, blob, near, scatter };
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
    tavern(m) {
      m.fill('g');
      // La calle abajo y el edificio ocupando el resto.
      for (let y = m.rows - 3; y < m.rows; y++) for (let x = 0; x < m.cols; x++) m.set(x, y, 'a');
      const x0 = 2,
        y0 = 1,
        x1 = m.cols - 3,
        y1 = m.rows - 5;
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) m.set(x, y, x === x0 || y === y0 || x === x1 || y === y1 ? '#' : 'm');
      // Una pared a lo ancho separa el salón (abajo) de las habitaciones (arriba), que se dividen entre sí.
      const split = y0 + Math.max(4, Math.round((y1 - y0) * 0.4));
      for (let x = x0 + 1; x < x1; x++) m.set(x, split, '#');
      const roomsN = Math.max(2, Math.round((x1 - x0) / 8)),
        step = (x1 - x0) / roomsN;
      for (let i = 0; i < roomsN; i++) {
        const left = Math.round(x0 + i * step),
          right = Math.round(x0 + (i + 1) * step);
        if (i) for (let y = y0 + 1; y < split; y++) m.set(left, y, '#');
        m.set(m.int(left + 1, right - 1), split, 'D');
      }
      // Entrada, cocina de piedra en un rincón del salón y la barra (escombros hacen de mobiliario).
      m.set(m.int(x0 + 3, x1 - 3), y1, 'D');
      for (let y = split + 1; y < Math.min(y1, split + 4); y++) for (let x = x1 - 4; x < x1; x++) m.set(x, y, 'f');
      for (let x = x0 + 2; x < x0 + Math.min(8, Math.round((x1 - x0) / 2)); x++) m.set(x, split + 2, 'd');
      m.scatter('t', 0.25, (c, x) => c === 'g' && (x < 2 || x > m.cols - 3));
    },
  };

  // Genera un mapa: { type, name, cols, rows, seed, terrain } (terrain: una letra por casilla, por filas).
  function generate(type, { size = 'medium', cols, rows, seed } = {}) {
    const info = TYPES.find(t => t[0] === type);
    if (!info) throw Error('Ese tipo de mapa no existe.');
    const s = SIZES[size] || SIZES.medium,
      c = Math.max(12, Math.min(80, Math.trunc(cols) || s[1])),
      r = Math.max(10, Math.min(80, Math.trunc(rows) || s[2])),
      sd = (seed ?? Math.floor(Math.random() * 4294967296)) >>> 0,
      m = make(c, r, sd);
    GEN[type](m);
    return { type, name: info[1], cols: c, rows: r, seed: sd, terrain: m.cells.join('') };
  }
  const api = { TYPES, SIZES, generate, rng };
  if (typeof module !== 'undefined') module.exports = api;
  root.BoardGen = api;
})(typeof window !== 'undefined' ? window : globalThis);
