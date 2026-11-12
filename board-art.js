/* Dibujo de los mapas pintados del tablero: convierte la cuadrícula de terreno en una ilustración
   (losas, tablones, pasto, agua con orilla, muros con sombra, copas de árboles…).
   Todo es determinista por casilla: el mismo mapa se ve igual en todos los dispositivos.
   BoardArt.paint(ctx, grid, terrain, tile, region) dibuja en un lienzo con `tile` px por casilla;
   con `region` ({ x0, y0, x1, y1 } en casillas) repinta solo esa parte. */
(function (root) {
  'use strict';
  const TAU = Math.PI * 2;
  // Número pseudoaleatorio estable en [0, 1) para la casilla (x, y) y el índice i.
  function hash(x, y, i = 0) {
    let n = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(i | 0, 1274126177);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    n ^= n >>> 16;
    return (n >>> 0) / 4294967296;
  }
  const BLOCK = new Set(['#', 'D', 'r']);
  // Colores base de cada suelo.
  const BASE = {
    f: '#8d8577',
    m: '#8b5e3a',
    a: '#84694a',
    s: '#d2b983',
    g: '#58823f',
    d: '#7a7164',
    h: '#c6e3ee',
    w: '#4d8fb8',
    l: '#c8451a',
    p: '#0b0909',
  };
  // Capas blandas, de abajo hacia arriba: cada una pisa con borde irregular a las anteriores.
  const SOFT = ['a', 's', 'g', 'd', 'h', 'w', 'l', 'p'];
  // Ruido suave de una dimensión en [0, 1): continuo de una casilla a la siguiente.
  function noise1(v, seed) {
    const i = Math.floor(v),
      f = v - i,
      u = f * f * (3 - 2 * f);
    return hash(i, seed, 7) * (1 - u) + hash(i + 1, seed, 7) * u;
  }
  let scratch = null;

  function paint(ctx, g, terrain, T, region) {
    const cols = g.cols,
      rows = g.rows,
      at = (x, y) => (x >= 0 && y >= 0 && x < cols && y < rows ? terrain[y * cols + x] || '.' : '.'),
      // Suelo que se ve debajo de cada casilla: los árboles crecen en pasto, las puertas pisan losas
      // y una roca toma el suelo que la rodea.
      ground = (x, y) => {
        const c = at(x, y);
        if (c === 't') return 'g';
        if (c === 'D') return 'f';
        if (c === 'W') return 'w';
        if (c !== 'r') return c;
        const near = [at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)].map(n =>
          n === 't' ? 'g' : n === 'W' ? 'w' : n,
        );
        return near.find(n => n === 'f' || n === 'm') || near.find(n => 'gasdh'.includes(n)) || 'a';
      },
      R = region || { x0: 0, y0: 0, x1: cols - 1, y1: rows - 1 },
      // Se recorren dos casillas de más: copas, sombras y bordes se meten en las vecinas.
      x0 = Math.max(0, R.x0 - 2),
      y0 = Math.max(0, R.y0 - 2),
      x1 = Math.min(cols - 1, R.x1 + 2),
      y1 = Math.min(rows - 1, R.y1 + 2),
      each = fn => {
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) fn(x, y, at(x, y));
      },
      lw = w => Math.max(0.6, T * w);
    ctx.save();
    ctx.beginPath();
    ctx.rect(R.x0 * T, R.y0 * T, (R.x1 - R.x0 + 1) * T, (R.y1 - R.y0 + 1) * T);
    ctx.clip();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // ---------- Fondo sin pintar: pizarra con marcas de plano ----------
    ctx.fillStyle = '#18242a';
    ctx.fillRect(x0 * T, y0 * T, (x1 - x0 + 1) * T, (y1 - y0 + 1) * T);
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = lw(0.02);
    ctx.beginPath();
    each((x, y, c) => {
      if (c !== '.') return;
      const px = x * T,
        py = y * T,
        k = T * 0.07;
      ctx.moveTo(px - k, py);
      ctx.lineTo(px + k, py);
      ctx.moveTo(px, py - k);
      ctx.lineTo(px, py + k);
    });
    ctx.stroke();

    // Manchas suaves de claro y oscuro para que un color no quede plano.
    function blotches(x, y, light, dark, amount = 1) {
      for (let i = 0; i < 2; i++) {
        const cx = (x + hash(x, y, 10 + i)) * T,
          cy = (y + hash(x, y, 20 + i)) * T,
          r = T * (0.55 + hash(x, y, 30 + i) * 0.5),
          gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, r),
          col = hash(x, y, 40 + i) < 0.5 ? light : dark;
        gr.addColorStop(0, col.replace('A', (0.16 * amount).toFixed(3)));
        gr.addColorStop(1, col.replace('A', '0'));
        ctx.fillStyle = gr;
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      }
    }
    const WHITE = 'rgba(255,255,255,A)',
      BLACK = 'rgba(0,0,0,A)';

    // ---------- Pisos construidos: losas y tablones (bordes rectos) ----------
    function flagstones(x, y) {
      const px = x * T,
        py = y * T;
      ctx.fillStyle = BASE.f;
      ctx.fillRect(px, py, T + 0.5, T + 0.5);
      // Cuatro losas por casilla, con la junta corrida para que no parezca una grilla perfecta.
      const sx = T * (0.42 + hash(x, y, 1) * 0.16),
        sy = T * (0.42 + hash(x, y, 2) * 0.16),
        slabs = [
          [0, 0, sx, sy],
          [sx, 0, T - sx, sy],
          [0, sy, sx, T - sy],
          [sx, sy, T - sx, T - sy],
        ];
      slabs.forEach(([ax, ay, w, h], i) => {
        const v = hash(x, y, 50 + i);
        ctx.fillStyle =
          v < 0.5
            ? `rgba(255,255,255,${(0.1 * (0.5 - v)).toFixed(3)})`
            : `rgba(0,0,0,${(0.16 * (v - 0.5)).toFixed(3)})`;
        ctx.fillRect(px + ax, py + ay, w, h);
        // Bisel: luz arriba a la izquierda, sombra abajo a la derecha.
        ctx.fillStyle = 'rgba(255,255,255,0.10)';
        ctx.fillRect(px + ax + T * 0.03, py + ay + T * 0.03, w - T * 0.06, T * 0.025);
        ctx.fillStyle = 'rgba(0,0,0,0.10)';
        ctx.fillRect(px + ax + T * 0.03, py + ay + h - T * 0.05, w - T * 0.06, T * 0.025);
      });
      blotches(x, y, WHITE, BLACK, 0.7);
      // Juntas.
      ctx.strokeStyle = 'rgba(38,34,30,0.55)';
      ctx.lineWidth = lw(0.035);
      ctx.beginPath();
      ctx.moveTo(px + sx, py);
      ctx.lineTo(px + sx, py + T);
      ctx.moveTo(px, py + sy);
      ctx.lineTo(px + T, py + sy);
      ctx.rect(px, py, T, T);
      ctx.stroke();
      // Alguna grieta y motas.
      if (hash(x, y, 3) < 0.28) {
        const cx = px + T * (0.2 + hash(x, y, 4) * 0.6),
          cy = py + T * (0.2 + hash(x, y, 5) * 0.6);
        ctx.strokeStyle = 'rgba(30,26,22,0.45)';
        ctx.lineWidth = lw(0.018);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + T * 0.12, cy + T * 0.06);
        ctx.lineTo(cx + T * 0.16, cy + T * 0.18);
        ctx.lineTo(cx + T * 0.27, cy + T * 0.2);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      for (let i = 0; i < 4; i++)
        ctx.fillRect(px + hash(x, y, 60 + i) * T, py + hash(x, y, 70 + i) * T, lw(0.022), lw(0.022));
    }
    function planks(x, y) {
      const px = x * T,
        py = y * T,
        n = 4,
        h = T / n;
      ctx.fillStyle = BASE.m;
      ctx.fillRect(px, py, T + 0.5, T + 0.5);
      for (let i = 0; i < n; i++) {
        const row = y * n + i,
          v = hash(0, row, 80 + ((x + Math.floor(hash(0, row, 5) * 3)) >> 1)),
          ty = py + i * h;
        ctx.fillStyle =
          v < 0.5
            ? `rgba(255,225,180,${(0.2 * (0.5 - v)).toFixed(3)})`
            : `rgba(30,12,0,${(0.3 * (v - 0.5)).toFixed(3)})`;
        ctx.fillRect(px, ty, T, h);
        // Vetas.
        ctx.strokeStyle = 'rgba(50,25,8,0.22)';
        ctx.lineWidth = lw(0.012);
        ctx.beginPath();
        for (let k = 0; k < 2; k++) {
          const gy = ty + h * (0.3 + 0.4 * hash(x, row, 90 + k));
          ctx.moveTo(px, gy);
          ctx.bezierCurveTo(px + T * 0.3, gy - h * 0.12, px + T * 0.7, gy + h * 0.12, px + T, gy);
        }
        ctx.stroke();
        // Unión entre tablones y, cada tanto, el final de una tabla con sus clavos.
        ctx.fillStyle = 'rgba(25,12,4,0.5)';
        ctx.fillRect(px, ty, T, lw(0.025));
        if (hash(x, row, 6) < 0.45) {
          const ex = px + T * (0.15 + hash(x, row, 7) * 0.7);
          ctx.fillRect(ex, ty, lw(0.025), h);
          ctx.fillStyle = 'rgba(20,10,4,0.6)';
          for (const dx of [-0.05, 0.06]) {
            ctx.beginPath();
            ctx.arc(ex + T * dx, ty + h * 0.5, lw(0.016), 0, TAU);
            ctx.fill();
          }
        }
      }
      blotches(x, y, 'rgba(255,220,170,A)', BLACK, 0.6);
    }
    each((x, y) => {
      const c = ground(x, y);
      if (c === 'f') flagstones(x, y);
      else if (c === 'm') planks(x, y);
    });

    // ---------- Suelos naturales: bordes irregulares que se pisan entre sí ----------
    // Contorno de una capa: las casillas con las esquinas salientes redondeadas, las entrantes rellenas
    // y un borde ondulado hacia afuera, continuo entre casillas.
    const ROUND = 0.4; // radio de las esquinas, en casillas
    const isSoft = c => SOFT.includes(c);
    // Esquinas de una casilla: [hacia x, hacia y] desde su centro.
    const CORNERS = [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ];
    // ¿La casilla (x, y) redondea su esquina (sx, sy)? Solo si es saliente y da a suelos naturales.
    function rounded(x, y, sx, sy) {
      const me = ground(x, y);
      if (!isSoft(me)) return false;
      const a = ground(x + sx, y),
        b = ground(x, y + sy);
      return a !== me && b !== me && isSoft(a) && isSoft(b) && isSoft(ground(x + sx, y + sy));
    }
    function softPath(code) {
      const p = new Path2D(),
        is = (x, y) => ground(x, y) === code,
        seed = code.charCodeAt(0),
        R = T * ROUND,
        // Cuánto se sale el borde en un punto de la línea de cuadrícula `line` (coordenada v a lo largo).
        bulge = (v, line, dir) =>
          T *
          (0.03 +
            0.2 * noise1(v * 2.1, line * 31 + dir * 7 + seed) * (0.6 + 0.4 * noise1(v * 5.3, line * 17 + dir + seed))),
        // Todas las piezas se agregan girando para el mismo lado: si no, donde se pisan quedarían agujeros.
        poly = pts => {
          let area = 0;
          for (let i = 0; i < pts.length; i++) {
            const [ax, ay] = pts[i],
              [bx, by] = pts[(i + 1) % pts.length];
            area += ax * by - bx * ay;
          }
          if (area < 0) pts.reverse();
          pts.forEach(([qx, qy], i) => p[i ? 'lineTo' : 'moveTo'](qx, qy));
          p.closePath();
        },
        disc = (cx, cy, r) => {
          p.moveTo(cx + r, cy);
          p.arc(cx, cy, r, 0, TAU);
        };
      let any = false;
      each((x, y) => {
        const px = x * T,
          py = y * T;
        if (!is(x, y)) {
          // Esquina entrante: dos vecinas de esta capa se juntan en diagonal y el rincón se rellena curvo.
          const n = at(x, y);
          if (n === '#' || n === 'D') return;
          for (const [sx, sy] of CORNERS) {
            if (!is(x + sx, y) || !is(x, y + sy)) continue;
            const cx = px + (sx > 0 ? T : 0),
              cy = py + (sy > 0 ? T : 0),
              ox = cx - sx * R,
              oy = cy - sy * R,
              pts = [
                [cx - sx * R, cy + sy * 0.6],
                [cx + sx * 0.6, cy + sy * 0.6],
                [cx + sx * 0.6, cy - sy * R],
              ];
            // Arco con centro dentro de la casilla, de un lado de la esquina al otro.
            for (let k = 6; k >= 0; k--) {
              const a = (k / 6) * (Math.PI / 2);
              pts.push([ox + sx * R * Math.sin(a), oy + sy * R * Math.cos(a)]);
            }
            poly(pts);
          }
          return;
        }
        any = true;
        // La casilla, con las esquinas salientes redondeadas.
        const cell = [];
        CORNERS.forEach(([sx, sy], i) => {
          const cx = px + (sx > 0 ? T + 0.25 : -0.25),
            cy = py + (sy > 0 ? T + 0.25 : -0.25);
          if (!rounded(x, y, sx, sy)) return cell.push([cx, cy]);
          const ox = cx - sx * R,
            oy = cy - sy * R,
            start = [-Math.PI, -Math.PI / 2, 0, Math.PI / 2][i];
          for (let k = 0; k <= 6; k++) {
            const a = start + (k / 6) * (Math.PI / 2);
            cell.push([ox + R * Math.cos(a), oy + R * Math.sin(a)]);
          }
        });
        poly(cell);
        // [dx, dy, línea de cuadrícula, eje horizontal?]
        const sides = [
          [0, -1, y, true],
          [0, 1, y + 1, true],
          [-1, 0, x, false],
          [1, 0, x + 1, false],
        ];
        sides.forEach(([dx, dy, line, horiz], s) => {
          const n = at(x + dx, y + dy);
          // Contra un muro o una puerta el borde queda recto.
          if (is(x + dx, y + dy) || n === '#' || n === 'D') return;
          const STEPS = 8,
            v0 = horiz ? x : y,
            // ¿Esta casilla redondea la esquina del principio o del final de este lado?
            mine = end => (horiz ? rounded(x, y, end ? 1 : -1, dy) : rounded(x, y, dx, end ? 1 : -1)),
            // ¿La casilla de enfrente redondea la suya ahí? Entonces esta capa tiene que asomar por debajo.
            theirs = end => (horiz ? rounded(x, y + dy, end ? 1 : -1, -dy) : rounded(x + dx, y, -dx, end ? 1 : -1)),
            // Junto a una esquina propia redondeada, el borde empieza donde termina la curva y crece de a poco.
            fa = mine(0) ? ROUND : 0,
            fb = mine(1) ? 1 - ROUND : 1,
            on = f => (horiz ? [(v0 + f) * T, line * T] : [line * T, (v0 + f) * T]),
            pts = [on(fa)];
          for (let k = 0; k <= STEPS; k++) {
            const f = fa + ((fb - fa) * k) / STEPS,
              fade = Math.min(fa ? Math.min(1, (f - fa) * 4) : 1, fb < 1 ? Math.min(1, (fb - f) * 4) : 1),
              v = v0 + f,
              off = bulge(v, line, s) * fade;
            pts.push(horiz ? [v * T, line * T + dy * off] : [line * T + dx * off, v * T]);
          }
          pts.push(on(fb));
          poly(pts);
          for (const end of [0, 1]) {
            if (mine(end)) continue;
            const v = v0 + end;
            disc(horiz ? v * T : line * T, horiz ? line * T : v * T, theirs(end) ? R * 1.05 : bulge(v, line, s));
          }
        });
      });
      return any ? p : null;
    }
    // Banda de color pegada al borde real de la capa, hacia adentro (espuma, tierra, cornisa):
    // se dibuja la sombra del «afuera» recortada al «adentro».
    function innerEdge(path, color, width, strength = 1) {
      const w = (x1 - x0 + 1) * T,
        h = (y1 - y0 + 1) * T,
        pad = Math.ceil(T),
        ox = x0 * T - pad,
        oy = y0 * T - pad;
      scratch ||= typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(1, 1) : document.createElement('canvas');
      if (scratch.width !== w + pad * 2 || scratch.height !== h + pad * 2) {
        scratch.width = w + pad * 2;
        scratch.height = h + pad * 2;
      }
      const s = scratch.getContext('2d');
      s.setTransform(1, 0, 0, 1, 0, 0);
      s.globalCompositeOperation = 'source-over';
      s.fillStyle = '#000';
      s.fillRect(0, 0, scratch.width, scratch.height);
      s.globalCompositeOperation = 'destination-out';
      s.setTransform(1, 0, 0, 1, -ox, -oy);
      s.fill(path);
      // Un trazo fino cierra las rendijas entre piezas vecinas del contorno.
      s.lineWidth = 1.5;
      s.stroke(path);
      ctx.save();
      ctx.clip(path);
      ctx.shadowColor = color;
      ctx.shadowBlur = T * width;
      // La imagen del «afuera» se dibuja corrida fuera de la vista: solo llega su sombra.
      const far = scratch.width + scratch.height + 100;
      ctx.shadowOffsetX = far;
      ctx.shadowOffsetY = 0;
      for (let i = 0; i < strength; i++) ctx.drawImage(scratch, ox - far, oy);
      ctx.restore();
    }
    const DETAIL = {
      a(x, y) {
        blotches(x, y, 'rgba(255,230,180,A)', 'rgba(40,20,0,A)', 1.1);
        for (let i = 0; i < 5; i++) {
          const cx = (x + hash(x, y, 200 + i)) * T,
            cy = (y + hash(x, y, 210 + i)) * T,
            r = T * (0.018 + hash(x, y, 220 + i) * 0.03);
          ctx.fillStyle = 'rgba(40,26,12,0.35)';
          ctx.beginPath();
          ctx.ellipse(cx + r * 0.3, cy + r * 0.4, r * 1.2, r, 0, 0, TAU);
          ctx.fill();
          ctx.fillStyle = 'rgba(190,170,140,0.75)';
          ctx.beginPath();
          ctx.ellipse(cx, cy, r * 1.2, r, hash(x, y, 230 + i) * 3, 0, TAU);
          ctx.fill();
        }
      },
      s(x, y) {
        blotches(x, y, 'rgba(255,250,220,A)', 'rgba(120,80,20,A)', 0.9);
        ctx.strokeStyle = 'rgba(140,105,50,0.28)';
        ctx.lineWidth = lw(0.018);
        ctx.beginPath();
        for (let i = 0; i < 2; i++) {
          const yy = (y + 0.25 + i * 0.45 + hash(x, y, 240 + i) * 0.1) * T,
            xx = x * T;
          ctx.moveTo(xx + T * 0.08, yy);
          ctx.bezierCurveTo(xx + T * 0.3, yy - T * 0.08, xx + T * 0.6, yy + T * 0.08, xx + T * 0.92, yy - T * 0.02);
        }
        ctx.stroke();
        ctx.fillStyle = 'rgba(120,90,40,0.35)';
        for (let i = 0; i < 6; i++)
          ctx.fillRect((x + hash(x, y, 250 + i)) * T, (y + hash(x, y, 260 + i)) * T, lw(0.018), lw(0.018));
      },
      g(x, y) {
        blotches(x, y, 'rgba(190,230,120,A)', 'rgba(10,40,10,A)', 1.3);
        ctx.lineWidth = lw(0.022);
        for (let i = 0; i < 7; i++) {
          const cx = (x + hash(x, y, 300 + i)) * T,
            cy = (y + hash(x, y, 310 + i)) * T,
            h = T * (0.06 + hash(x, y, 320 + i) * 0.06);
          ctx.strokeStyle = hash(x, y, 330 + i) < 0.5 ? 'rgba(150,200,100,0.55)' : 'rgba(30,70,25,0.5)';
          ctx.beginPath();
          ctx.moveTo(cx - h * 0.5, cy - h);
          ctx.lineTo(cx, cy);
          ctx.lineTo(cx + h * 0.5, cy - h);
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx, cy - h * 1.2);
          ctx.stroke();
        }
        if (hash(x, y, 340) < 0.14) {
          const cx = (x + 0.2 + hash(x, y, 341) * 0.6) * T,
            cy = (y + 0.2 + hash(x, y, 342) * 0.6) * T;
          ctx.fillStyle = hash(x, y, 343) < 0.5 ? '#f4e9a8' : '#e9c3e6';
          for (let k = 0; k < 3; k++) {
            ctx.beginPath();
            ctx.arc(cx + Math.cos(k * 2.1) * T * 0.03, cy + Math.sin(k * 2.1) * T * 0.03, lw(0.02), 0, TAU);
            ctx.fill();
          }
        }
      },
      d(x, y) {
        blotches(x, y, WHITE, BLACK, 1);
        for (let i = 0; i < 6; i++) {
          const cx = (x + 0.12 + hash(x, y, 400 + i) * 0.76) * T,
            cy = (y + 0.12 + hash(x, y, 410 + i) * 0.76) * T,
            r = T * (0.05 + hash(x, y, 420 + i) * 0.08);
          stone(cx, cy, r, x, y, 430 + i * 7, '#9a9184', '#5d564c');
        }
      },
      h(x, y) {
        blotches(x, y, WHITE, 'rgba(60,120,160,A)', 1.4);
        const px = x * T,
          py = y * T;
        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        ctx.lineWidth = lw(0.03);
        ctx.beginPath();
        for (let i = 0; i < 2; i++) {
          const ox = T * (0.15 + hash(x, y, 500 + i) * 0.5),
            oy = T * (0.25 + hash(x, y, 510 + i) * 0.5),
            len = T * (0.14 + hash(x, y, 520 + i) * 0.14);
          ctx.moveTo(px + ox, py + oy);
          ctx.lineTo(px + ox + len, py + oy - len);
        }
        ctx.stroke();
        if (hash(x, y, 530) < 0.4) {
          ctx.strokeStyle = 'rgba(70,130,170,0.5)';
          ctx.lineWidth = lw(0.014);
          ctx.beginPath();
          const cx = px + T * (0.3 + hash(x, y, 531) * 0.4),
            cy = py + T * (0.3 + hash(x, y, 532) * 0.4);
          ctx.moveTo(cx - T * 0.2, cy - T * 0.05);
          ctx.lineTo(cx, cy);
          ctx.lineTo(cx + T * 0.08, cy + T * 0.2);
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + T * 0.2, cy - T * 0.1);
          ctx.stroke();
        }
      },
      w(x, y, c) {
        if (c === 'W') {
          // Agua profunda: más oscura, con el borde difuso hacia la orilla.
          const cx = (x + 0.5) * T,
            cy = (y + 0.5) * T,
            gr = ctx.createRadialGradient(cx, cy, T * 0.2, cx, cy, T * 0.95);
          gr.addColorStop(0, 'rgba(18,52,92,0.85)');
          gr.addColorStop(1, 'rgba(18,52,92,0)');
          ctx.fillStyle = gr;
          ctx.fillRect(cx - T, cy - T, T * 2, T * 2);
        } else blotches(x, y, 'rgba(170,225,240,A)', 'rgba(10,50,90,A)', 1.2);
        ctx.strokeStyle = c === 'W' ? 'rgba(170,210,235,0.28)' : 'rgba(225,245,250,0.4)';
        ctx.lineWidth = lw(0.022);
        ctx.beginPath();
        for (let i = 0; i < 2; i++) {
          const wx = (x + 0.1 + hash(x, y, 600 + i) * 0.45) * T,
            wy = (y + 0.22 + i * 0.42 + hash(x, y, 610 + i) * 0.14) * T,
            w = T * (0.2 + hash(x, y, 620 + i) * 0.16);
          ctx.moveTo(wx, wy);
          ctx.quadraticCurveTo(wx + w * 0.25, wy - T * 0.05, wx + w * 0.5, wy);
          ctx.quadraticCurveTo(wx + w * 0.75, wy + T * 0.05, wx + w, wy);
        }
        ctx.stroke();
      },
      l(x, y) {
        // Corteza oscura que se rompe y deja ver la roca fundida.
        blotches(x, y, 'rgba(255,220,90,A)', 'rgba(90,10,0,A)', 2.2);
        for (let i = 0; i < 3; i++) {
          const cx = (x + 0.15 + hash(x, y, 700 + i) * 0.7) * T,
            cy = (y + 0.15 + hash(x, y, 710 + i) * 0.7) * T,
            r = T * (0.1 + hash(x, y, 720 + i) * 0.12);
          ctx.fillStyle = 'rgba(52,18,10,0.82)';
          blob(cx, cy, r, x, y, 730 + i * 9);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,190,70,0.75)';
          ctx.lineWidth = lw(0.02);
          ctx.stroke();
        }
        ctx.fillStyle = 'rgba(255,240,150,0.8)';
        for (let i = 0; i < 2; i++) {
          ctx.beginPath();
          ctx.arc((x + hash(x, y, 760 + i)) * T, (y + hash(x, y, 770 + i)) * T, lw(0.03), 0, TAU);
          ctx.fill();
        }
      },
      p() {},
    };
    // Polígono irregular (piedra, corteza de lava, copa).
    function blob(cx, cy, r, x, y, seed, sides = 7) {
      ctx.beginPath();
      for (let k = 0; k < sides; k++) {
        const a = (k / sides) * TAU + hash(x, y, seed) * 2,
          rr = r * (0.72 + hash(x, y, seed + 1 + k) * 0.45);
        ctx[k ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
      }
      ctx.closePath();
    }
    function stone(cx, cy, r, x, y, seed, light, dark) {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      blob(cx + r * 0.22, cy + r * 0.3, r, x, y, seed);
      ctx.fill();
      const gr = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
      gr.addColorStop(0, light);
      gr.addColorStop(1, dark);
      ctx.fillStyle = gr;
      blob(cx, cy, r, x, y, seed);
      ctx.fill();
      ctx.strokeStyle = 'rgba(20,18,15,0.45)';
      ctx.lineWidth = lw(0.014);
      ctx.stroke();
    }
    // Debajo de cada esquina redondeada va el color de la vecina, por si ninguna capa llega a cubrirla.
    each((x, y) => {
      for (const [sx, sy] of CORNERS) {
        if (!rounded(x, y, sx, sy)) continue;
        const cx = (x + (sx > 0 ? 1 : 0)) * T,
          cy = (y + (sy > 0 ? 1 : 0)) * T,
          around = [ground(x + sx, y), ground(x, y + sy), ground(x + sx, y + sy)],
          low = SOFT.find(c => around.includes(c));
        ctx.fillStyle = BASE[low];
        ctx.beginPath();
        ctx.arc(cx, cy, T * ROUND * 1.1, 0, TAU);
        ctx.fill();
      }
    });
    const EDGE = {
      w: [
        ['rgba(225,246,250,0.8)', 0.3, 1],
        ['rgba(255,255,255,0.95)', 0.07, 2],
      ],
      g: [['rgba(20,50,18,0.75)', 0.16, 1]],
      a: [['rgba(40,24,8,0.6)', 0.16, 1]],
      s: [['rgba(110,80,30,0.55)', 0.14, 1]],
      d: [['rgba(25,22,18,0.6)', 0.16, 1]],
      h: [['rgba(255,255,255,0.95)', 0.16, 2]],
      l: [
        ['rgba(50,12,4,0.95)', 0.22, 2],
        ['rgba(255,205,90,0.9)', 0.05, 2],
      ],
      p: [
        ['rgba(96,86,74,1)', 0.3, 3],
        ['rgba(150,138,122,1)', 0.06, 2],
      ],
    };
    for (const code of SOFT) {
      const path = softPath(code);
      if (!path) continue;
      ctx.save();
      if (code === 'l') {
        // Resplandor que tiñe lo que rodea a la lava.
        ctx.shadowColor = 'rgba(255,120,20,0.9)';
        ctx.shadowBlur = T * 0.5;
      }
      ctx.fillStyle = BASE[code];
      ctx.fill(path);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.clip(path);
      each((x, y, c) => ground(x, y) === code && DETAIL[code](x, y, c));
      ctx.restore();
      for (const [color, width, strength] of EDGE[code] || []) innerEdge(path, color, width, strength);
    }

    // ---------- Relieve: sombras, rocas, muros, puertas y árboles ----------
    const solid = new Path2D();
    let anySolid = false;
    each((x, y, c) => {
      if (c !== '#' && c !== 'D') return;
      anySolid = true;
      solid.rect(x * T, y * T, T, T);
    });
    if (anySolid) {
      // Sombra de los muros sobre el piso (la luz viene de arriba a la izquierda).
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = T * 0.3;
      ctx.shadowOffsetX = T * 0.1;
      ctx.shadowOffsetY = T * 0.14;
      ctx.fillStyle = '#2b2824';
      ctx.fill(solid);
      ctx.restore();
    }
    // Rocas: peñascos que se montan unos sobre otros.
    each((x, y, c) => {
      if (c !== 'r') return;
      for (let i = 0; i < 3; i++) {
        const cx = (x + (i === 0 ? 0.5 : 0.25 + hash(x, y, 800 + i) * 0.5)) * T,
          cy = (y + (i === 0 ? 0.5 : 0.25 + hash(x, y, 810 + i) * 0.5)) * T,
          r = T * (i === 0 ? 0.5 : 0.22 + hash(x, y, 820 + i) * 0.14);
        stone(cx, cy, r, x, y, 830 + i * 11, '#8c8982', '#3f3c38');
        // Faceta de luz.
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        blob(cx - r * 0.25, cy - r * 0.28, r * 0.42, x, y, 870 + i * 5, 5);
        ctx.fill();
      }
    });
    // Muros: sillares con bisel y contorno donde dan a un espacio abierto.
    each((x, y, c) => {
      if (c !== '#') return;
      const px = x * T,
        py = y * T,
        open = (dx, dy) => at(x + dx, y + dy) !== '#';
      ctx.fillStyle = '#5a554d';
      ctx.fillRect(px, py, T + 0.5, T + 0.5);
      const rowsN = 3,
        h = T / rowsN;
      for (let i = 0; i < rowsN; i++) {
        const row = y * rowsN + i,
          off = row % 2 ? 0.5 : 0,
          ty = py + i * h;
        for (let k = -1; k < 2; k++) {
          const bx = px + (k + off) * (T / 2) + (x % 2 ? 0 : 0),
            ax = Math.max(px, bx),
            bw = Math.min(px + T, bx + T / 2) - ax;
          if (bw <= 0.5) continue;
          const v = hash(Math.round((bx / T) * 2), row, 900);
          ctx.fillStyle =
            v < 0.5
              ? `rgba(255,255,255,${(0.14 * (0.5 - v)).toFixed(3)})`
              : `rgba(0,0,0,${(0.22 * (v - 0.5)).toFixed(3)})`;
          ctx.fillRect(ax, ty, bw, h);
          ctx.fillStyle = 'rgba(255,255,255,0.09)';
          ctx.fillRect(ax + T * 0.02, ty + T * 0.025, bw - T * 0.04, T * 0.03);
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          ctx.fillRect(ax, ty + h - lw(0.03), bw, lw(0.03));
          if (bx > px) ctx.fillRect(bx, ty, lw(0.03), h);
        }
      }
      // Contorno: claro arriba e izquierda, oscuro abajo y derecha.
      ctx.lineWidth = lw(0.06);
      const line = (ax, ay, bx, by, color) => {
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
      };
      const k = lw(0.03);
      if (open(0, -1)) line(px, py + k, px + T, py + k, 'rgba(200,192,178,0.75)');
      if (open(-1, 0)) line(px + k, py, px + k, py + T, 'rgba(180,172,158,0.6)');
      if (open(0, 1)) line(px, py + T - k, px + T, py + T - k, 'rgba(18,16,14,0.85)');
      if (open(1, 0)) line(px + T - k, py, px + T - k, py + T, 'rgba(18,16,14,0.75)');
    });
    // Puertas: una hoja de madera con herrajes, atravesada en el paso.
    each((x, y, c) => {
      if (c !== 'D') return;
      const px = x * T,
        py = y * T,
        wall = (dx, dy) => BLOCK.has(at(x + dx, y + dy)) && at(x + dx, y + dy) !== 'r',
        vertical = wall(0, -1) && wall(0, 1) && !(wall(-1, 0) && wall(1, 0));
      ctx.save();
      ctx.translate(px + T / 2, py + T / 2);
      if (vertical) ctx.rotate(Math.PI / 2);
      // Jambas de piedra a los lados.
      ctx.fillStyle = '#4a463f';
      ctx.fillRect(-T / 2, -T * 0.24, T * 0.12, T * 0.48);
      ctx.fillRect(T / 2 - T * 0.12, -T * 0.24, T * 0.12, T * 0.48);
      ctx.shadowColor = 'rgba(0,0,0,0.55)';
      ctx.shadowBlur = T * 0.12;
      ctx.shadowOffsetY = T * 0.05;
      const gr = ctx.createLinearGradient(0, -T * 0.14, 0, T * 0.14);
      gr.addColorStop(0, '#b47a3c');
      gr.addColorStop(1, '#7a4a1e');
      ctx.fillStyle = gr;
      ctx.fillRect(-T * 0.38, -T * 0.13, T * 0.76, T * 0.26);
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = 'rgba(40,20,5,0.6)';
      ctx.lineWidth = lw(0.018);
      ctx.beginPath();
      for (let i = 1; i < 4; i++) {
        ctx.moveTo(-T * 0.38 + (T * 0.76 * i) / 4, -T * 0.13);
        ctx.lineTo(-T * 0.38 + (T * 0.76 * i) / 4, T * 0.13);
      }
      ctx.stroke();
      ctx.strokeRect(-T * 0.38, -T * 0.13, T * 0.76, T * 0.26);
      // Herrajes y picaporte.
      ctx.fillStyle = '#3a3a3c';
      ctx.fillRect(-T * 0.38, -T * 0.09, T * 0.76, T * 0.035);
      ctx.fillRect(-T * 0.38, T * 0.055, T * 0.76, T * 0.035);
      ctx.fillStyle = '#e3c27a';
      ctx.beginPath();
      ctx.arc(T * 0.26, 0, T * 0.04, 0, TAU);
      ctx.fill();
      ctx.restore();
    });
    // Árboles: sombra, tronco apenas visible y una copa de varios mechones (de arriba hacia abajo).
    each((x, y, c) => {
      if (c !== 't') return;
      const cx = (x + 0.5 + (hash(x, y, 950) - 0.5) * 0.3) * T,
        cy = (y + 0.5 + (hash(x, y, 951) - 0.5) * 0.3) * T,
        R0 = T * (0.5 + hash(x, y, 952) * 0.14);
      ctx.fillStyle = 'rgba(0,0,0,0.33)';
      ctx.beginPath();
      ctx.ellipse(cx + R0 * 0.28, cy + R0 * 0.36, R0 * 1.02, R0 * 0.92, 0, 0, TAU);
      ctx.fill();
      const tone = hash(x, y, 953),
        dark = tone < 0.33 ? '#1f4a22' : tone < 0.66 ? '#255527' : '#2d5a1f',
        mid = tone < 0.33 ? '#2f6b2e' : tone < 0.66 ? '#3a7a33' : '#4a7f2b',
        light = tone < 0.33 ? '#58a04a' : tone < 0.66 ? '#6bb052' : '#86b548';
      // Contorno oscuro de mechones.
      ctx.fillStyle = dark;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU + hash(x, y, 960) * 3,
          rr = R0 * 0.62;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, R0 * (0.36 + hash(x, y, 961 + i) * 0.1), 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = mid;
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * TAU + hash(x, y, 970) * 3,
          rr = R0 * 0.42;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * rr - R0 * 0.05, cy + Math.sin(a) * rr - R0 * 0.06, R0 * 0.36, 0, TAU);
        ctx.fill();
      }
      // Luz arriba a la izquierda.
      const gr = ctx.createRadialGradient(cx - R0 * 0.3, cy - R0 * 0.32, 0, cx - R0 * 0.3, cy - R0 * 0.32, R0 * 0.85);
      gr.addColorStop(0, light);
      gr.addColorStop(1, 'rgba(60,120,50,0)');
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.arc(cx - R0 * 0.08, cy - R0 * 0.1, R0 * 0.72, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(215,240,160,0.35)';
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(
          cx - R0 * 0.3 + (hash(x, y, 980 + i) - 0.5) * R0 * 0.7,
          cy - R0 * 0.3 + (hash(x, y, 990 + i) - 0.5) * R0 * 0.7,
          R0 * 0.09,
          0,
          TAU,
        );
        ctx.fill();
      }
    });
    ctx.restore();
  }
  // Píxeles por casilla para que el lienzo no pase de `max` de lado.
  const tileFor = (g, max = 3072) => Math.max(12, Math.min(64, Math.floor(max / Math.max(g.cols, g.rows))));
  // Rectángulo de casillas que cambió entre dos cadenas de terreno (null si son iguales).
  function changed(g, a, b) {
    if (a === b) return null;
    if (!a || !b || a.length !== b.length) return { x0: 0, y0: 0, x1: g.cols - 1, y1: g.rows - 1 };
    let x0 = g.cols,
      y0 = g.rows,
      x1 = -1,
      y1 = -1;
    for (let i = 0; i < a.length; i++)
      if (a[i] !== b[i]) {
        const x = i % g.cols,
          y = (i / g.cols) | 0;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    if (x1 < 0) return null;
    // Margen: lo que una casilla dibuja fuera de sí misma (copas, sombras, bordes).
    return {
      x0: Math.max(0, x0 - 2),
      y0: Math.max(0, y0 - 2),
      x1: Math.min(g.cols - 1, x1 + 2),
      y1: Math.min(g.rows - 1, y1 + 2),
    };
  }
  const api = { paint, tileFor, changed, hash };
  if (typeof module !== 'undefined') module.exports = api;
  root.BoardArt = api;
})(typeof window !== 'undefined' ? window : globalThis);
