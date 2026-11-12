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
      // La calle abajo y el edificio ocupando el resto (después se espeja al azar).
      for (let y = m.rows - 3; y < m.rows; y++) for (let x = 0; x < m.cols; x++) m.set(x, y, 'a');
      const x0 = m.int(1, 3),
        y0 = m.int(1, 2),
        x1 = m.cols - 1 - m.int(1, 3),
        y1 = m.rows - 5;
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) m.set(x, y, x === x0 || y === y0 || x === x1 || y === y1 ? '#' : 'm');
      if (m.R() < 0.5) {
        // Habitaciones arriba, salón abajo.
        const split = y0 + Math.max(4, Math.round((y1 - y0) * (0.35 + m.R() * 0.12)));
        for (let x = x0 + 1; x < x1; x++) m.set(x, split, '#');
        const roomsN = Math.max(2, Math.round((x1 - x0) / m.int(6, 9))),
          step = (x1 - x0) / roomsN;
        for (let i = 0; i < roomsN; i++) {
          const left = Math.round(x0 + i * step),
            right = Math.round(x0 + (i + 1) * step);
          if (i) for (let y = y0 + 1; y < split; y++) m.set(left, y, '#');
          m.set(m.int(left + 1, right - 1), split, 'D');
        }
        for (let x = x0 + 2; x < x0 + Math.min(8, Math.round((x1 - x0) / 2)); x++) m.set(x, split + 2, 'd');
        for (let y = split + 1; y < Math.min(y1, split + 4); y++) for (let x = x1 - 4; x < x1; x++) m.set(x, y, 'f');
      } else {
        // Habitaciones a un costado, salón al otro, con un pasillo de puertas.
        const split = x0 + Math.max(5, Math.round((x1 - x0) * (0.3 + m.R() * 0.12)));
        for (let y = y0 + 1; y < y1; y++) m.set(split, y, '#');
        const roomsN = Math.max(2, Math.round((y1 - y0) / m.int(4, 6))),
          step = (y1 - y0) / roomsN;
        for (let i = 0; i < roomsN; i++) {
          const top = Math.round(y0 + i * step),
            bottom = Math.round(y0 + (i + 1) * step);
          if (i) for (let x = x0 + 1; x < split; x++) m.set(x, top, '#');
          m.set(split, m.int(top + 1, bottom - 1), 'D');
        }
        // Barra en L y cocina al fondo.
        for (let y = y0 + 2; y < y0 + Math.min(6, y1 - y0 - 2); y++) m.set(x1 - 3, y, 'd');
        for (let y = y0 + 1; y < y0 + 4; y++) for (let x = x1 - 2; x < x1; x++) m.set(x, y, 'f');
      }
      // Mesas sueltas en el salón, a veces la trampilla del sótano, y la entrada.
      m.scatter('d', 0.035, (c, x, y) => c === 'm' && !m.near(x, y, ['#', 'D', 'd', 'f']));
      if (m.R() < 0.4) {
        const spots = [];
        m.each((x, y, c) => c === 'm' && !m.near(x, y, ['#', 'D', 'd']) && spots.push([x, y]));
        if (spots.length) m.set(...spots[m.int(0, spots.length - 1)], 'p');
      }
      const doors = [];
      for (let x = x0 + 2; x < x1 - 1; x++) if (m.get(x, y1 - 1) === 'm') doors.push(x);
      m.set(doors.length ? doors[m.int(0, doors.length - 1)] : x0 + 3, y1, 'D');
      m.scatter('t', 0.25, (c, x) => c === 'g' && (x < x0 || x > x1));
      if (m.R() < 0.5) mirror(m, true);
      if (m.R() < 0.5) mirror(m, false);
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
  }

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
