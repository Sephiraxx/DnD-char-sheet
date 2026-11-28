/* Pixel spells, batch 45: large silhouettes, held peaks and floor-only lasting grease. */
(function (root) {
  'use strict';
  const FX = root.BoardPixelFX;
  if (!FX) return;
  const k = FX.kit;
  const AMBER = ['#1a100d', '#302017', '#795015', '#e5a52c', '#ffe888', '#ffffe9'];
  const PINK = ['#300e2c', '#6a245b', '#c3448d', '#ff87ca', '#ffd4ec', '#fff5fd'];
  const GOLD = ['#301609', '#85400d', '#dc7c1d', '#ffc94c', '#fff1b1', '#ffffed'];
  const HEX = ['#190b28', '#2b103e', '#6b246f', '#ef4bce', '#ffb6ed', '#fff0fc'];
  const GREEN = ['#10271b', '#235738', '#49a44a', '#8ff45c', '#ddffad', '#faffeb'];
  const THUNDER = ['#112337', '#355477', '#6d9ec1', '#b0e4ff', '#e3faff', '#ffffff'];
  const NECRO = ['#110b1a', '#291332', '#582b62', '#a5cf7a', '#e3ffbe', '#fcfff0'];
  const HEAL = ['#152a18', '#306a36', '#69b94e', '#b6f36e', '#ffe9a2', '#ffffe4'];
  const BANE = ['#260e24', '#4d1939', '#963254', '#db789d', '#f5c2e4', '#fff0f4'];
  const SPEED = ['#172738', '#3a586c', '#6797aa', '#b3e3ef', '#e6fcff', '#ffffff'];

  function stroke(a, b, pal, color = 4, size = 2) {
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 1.5));
    for (const [ink, w] of [
      [pal[0], size + 2],
      [pal[color], size],
    ])
      for (let i = 0; i <= n; i++) k.dot(k.mix(a.x, b.x, i / n), k.mix(a.y, b.y, i / n), ink, w);
  }

  // Cached rings keep the large structural strokes cheap, including during linger.
  function ring(at, rx, ry, pal, color = 4, alpha = 1, width = 2) {
    rx = Math.max(2, Math.round(rx));
    ry = Math.max(2, Math.round(ry));
    const w = rx * 2 + 6,
      h = ry * 2 + 6;
    const img = k.sprite(`45:ring:${pal[0]}:${rx}:${ry}:${color}:${width}`, w, h, pal, set => {
      for (let y = 1; y < h - 1; y++)
        for (let x = 1; x < w - 1; x++) {
          const dx = x - w / 2,
            dy = y - h / 2;
          const a = Math.atan2(dy / ry, dx / rx);
          const edge = Math.hypot(Math.cos(a) * rx, Math.sin(a) * ry);
          if (Math.abs(Math.hypot(dx, dy) - edge) <= width / 2) set(x, y, color);
        }
    });
    k.blit(img, at.x - w / 2, at.y - h / 2, alpha);
  }

  function spark(at, pal, size = 3) {
    const img = k.sprite(`45:spark:${pal[0]}:${size}`, size * 2 + 5, size * 2 + 5, pal, set => {
      const c = size + 2;
      for (let j = -size; j <= size; j++) {
        set(c + j, c, Math.abs(j) < 2 ? 5 : 4);
        set(c, c + j, Math.abs(j) < 2 ? 5 : 4);
      }
    });
    k.blit(img, at.x - size - 2, at.y - size - 2);
  }

  // All icons have real two-pixel strokes, a cached dark outline and a pale face.
  function glyph(name, pal) {
    return k.sprite(`45:glyph:${name}:${pal[0]}`, 31, 35, pal, set => {
      const put = (x, y, c) => set(x + 15, y + 17, c);
      const box = (x, y, w, h, c) => {
        for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) put(i, j, c);
      };
      const line = (x, y, xx, yy, c = 4, width = 2) => {
        const n = Math.max(1, Math.ceil(Math.hypot(xx - x, yy - y)));
        for (let i = 0; i <= n; i++)
          box(Math.round(k.mix(x, xx, i / n)), Math.round(k.mix(y, yy, i / n)), width, width, c);
      };
      if (name === 'heart') {
        for (let y = -7; y <= 7; y++)
          for (let x = -9; x <= 9; x++) {
            const lobe = Math.hypot(x + 4, y + 3) < 5 || Math.hypot(x - 4, y + 3) < 5;
            if (lobe || (y >= -2 && Math.abs(x) <= 8 - y)) put(x, y, y < -3 ? 4 : y > 3 ? 2 : 3);
          }
        line(-6, -4, -3, -5, 5);
      } else if (name === 'badge' || name === 'bane') {
        const cursed = name === 'bane';
        for (let j = 0; j < 2; j++) {
          const y = j * 6 - 7;
          line(-8, y, 0, y + 7, cursed ? 3 : 4, 3);
          line(0, y + 7, 8, y, cursed ? 4 : 3, 3);
        }
        if (cursed) {
          line(0, -8, -2, -2, 1);
          line(-2, -2, 2, 1, 1);
          line(2, 1, -1, 10, 1);
          put(-3, -3, 5);
          put(3, 1, 5);
        } else line(-6, -8, 0, -3, 5);
      } else if (name === 'crosshair') {
        for (let y = -10; y <= 10; y++)
          for (let x = -10; x <= 10; x++) {
            const r = Math.hypot(x, y);
            if (r >= 7 && r <= 9 && Math.abs(x) > 2 && Math.abs(y) > 2) put(x, y, x + y < 0 ? 4 : 3);
          }
        for (const [x, y, xx, yy] of [
          [-11, 0, -5, 0],
          [5, 0, 11, 0],
          [0, -11, 0, -5],
          [0, 5, 0, 11],
        ])
          line(x, y, xx, yy, 4);
        box(-1, -1, 3, 3, 5);
      } else if (name === 'arrow') {
        line(0, -6, 0, 6, 4);
        line(-4, -1, 0, -6, 5);
        line(0, -6, 4, -1, 5);
        line(-3, 4, 0, 6, 3);
        line(0, 6, 3, 4, 3);
      } else if (name === 'sigil') {
        const pts = [
          [0, -12],
          [10, -6],
          [10, 6],
          [0, 12],
          [-10, 6],
          [-10, -6],
        ];
        for (let y = -10; y <= 10; y++)
          for (let x = -9; x <= 9; x++) if (Math.abs(y) < 11 - Math.abs(x) * 0.5) put(x, y, 1);
        for (let j = 0; j < 6; j++) line(...pts[j], ...pts[(j + 1) % 6], 3);
        for (let j = 0; j < 6; j++) line(...pts[j], ...pts[(j + 2) % 6], 3);
        box(-2, -2, 5, 5, 4);
        box(-1, -1, 3, 3, 1);
      } else if (name === 'eye') {
        for (let x = -8; x <= 8; x++) {
          const h = Math.round(4 * (1 - Math.abs(x) / 9));
          for (let y = -h; y <= h; y++) put(x, y, Math.abs(y) >= h - 1 ? 3 : 4);
        }
        box(-1, -3, 3, 7, 1);
        put(-2, -2, 5);
      } else if (name === 'word' || name === 'healword') {
        box(-10, -8, 20, 14, 3);
        box(-8, -6, 16, 10, 4);
        for (let j = 0; j < 5; j++) box(-6, 5 + j, 6 - j, 1, 4);
        if (name === 'word') {
          box(-1, -5, 3, 6, 1);
          box(-1, 3, 3, 2, 1);
          line(-6, -3, -4, -3, 5);
          line(5, -3, 7, -3, 5);
        } else {
          line(-6, 0, -3, 0, 2);
          line(-3, 0, -1, -4, 2);
          line(-1, -4, 2, 2, 2);
          line(2, 2, 5, -1, 2);
        }
        line(-7, -7, 5, -7, 5);
      } else if (name === 'plus') {
        box(-3, -10, 7, 21, 3);
        box(-10, -3, 21, 7, 3);
        box(-2, -9, 4, 18, 4);
        box(-9, -2, 18, 4, 4);
        box(-2, -8, 2, 8, 5);
        box(-8, -2, 8, 2, 5);
      } else if (name === 'exclamation') {
        box(-1, -7, 3, 9, 5);
        box(-1, 5, 3, 3, 4);
      } else if (name === 'boot') {
        box(-4, -7, 7, 12, 3);
        box(-4, 2, 12, 6, 4);
        box(-5, 7, 14, 2, 2);
        line(-3, -6, 1, -6, 5);
        for (let j = 0; j < 3; j++) {
          line(-4, -2 + j * 2, -12 + j * 2, -9 + j * 2, j === 0 ? 5 : 4);
          line(3, -2 + j * 2, 12 - j * 2, -9 + j * 2, j === 0 ? 5 : 4);
        }
      } else if (name === 'aura') {
        const p = [
          [-2, -13],
          [-5, -11],
          [-5, -6],
          [-8, -3],
          [-9, 4],
          [-6, 6],
          [-6, 12],
          [-2, 12],
          [0, 5],
          [2, 12],
          [6, 12],
          [6, 6],
          [9, 4],
          [8, -3],
          [5, -6],
          [5, -11],
          [2, -13],
          [-2, -13],
        ];
        for (let j = 0; j < p.length - 1; j++) line(...p[j], ...p[j + 1], 4, 1);
      }
    });
  }

  function icon(name, at, pal, alpha = 1) {
    k.blit(glyph(name, pal), at.x - 15, at.y - 17, alpha);
  }

  function body(t) {
    return k.P(t);
  }
  function feet(t) {
    return k.P({ x: t.baseX ?? t.x, y: t.baseY ?? t.y + 0.62 * (t.span || 1) });
  }
  function head(t) {
    const p = body(t);
    return { x: p.x, y: p.y - 12 * (t.span || 1) };
  }
  function caster(s) {
    const b = s.pose.base || s.pose.hand || s.pose.target || { x: 0, y: 0 };
    return {
      id: s.event.caster ?? null,
      x: b.x,
      y: b.y - 0.62 * (b.span || 1),
      baseX: b.x,
      baseY: b.y,
      span: b.span || 1,
    };
  }
  function subjects(s) {
    return s.targets.length ? s.targets : [caster(s)];
  }
  function beatFor(s, t) {
    return s.hits.find(h => h.id === t.id) || s.hits[0];
  }
  function beatAge(s, t) {
    const h = beatFor(s, t);
    return h ? s.real(h) : -1;
  }
  function beats(event, kit, travel, kind = 'soft', stop = 75, self = false) {
    const ids = self ? [event.caster ?? null] : event.targets?.length ? event.targets : [null];
    return ids.map(target => ({ at: kit.CAST + travel, stop, target, kind, power: kind === 'soft' ? 0.03 : 0.075 }));
  }
  function residue(e, until = 750) {
    return 1 - k.clamp((e - until + 160) / 160);
  }
  function impact(s, t, pal, name, size = 23, count = 5) {
    const e = beatAge(s, t),
      p = body(t);
    k.drawHit(k.hitStyle(`45:${name}`, pal, { S: size, spikes: 5, jag: 0.22 }), p, e);
    k.shards(p, e, pal, (s.event.seed || 0) + (t.id ? t.id.length : 0), count, 17);
  }
  function rising(s, t, pal, e, n = 6) {
    if (e < 0 || e > 650) return;
    const f = feet(t),
      seed = s.event.seed || 0;
    for (let i = 0; i < n; i++) {
      const q = k.clamp((e - i * 28) / 540);
      if (q <= 0 || q >= 1) continue;
      spark({ x: f.x + (k.hash(i, seed) - 0.5) * 25, y: f.y - q * 34 - (i % 3) }, pal, i % 3 ? 1 : 2);
    }
  }
  function flight(s, t, pal, name, swirl = false) {
    const hit = beatFor(s, t);
    if (!hit || !s.pose.hand || s.c.t < k.CAST || s.c.t >= hit.at) return;
    const H = k.P(s.pose.hand),
      T = body(t),
      q = (s.c.t - k.CAST) / (hit.at - k.CAST);
    const at = u => ({ x: k.mix(H.x, T.x, u), y: k.mix(H.y, T.y, u) - Math.sin(u * Math.PI) * 9 });
    for (let j = 8; j >= 0; j--) {
      const u = q - j * 0.045;
      if (u < 0) continue;
      const p = at(u),
        a = u * k.tau * 2.2;
      if (swirl) {
        p.x += Math.cos(a) * 4;
        p.y += Math.sin(a) * 5;
      }
      k.dot(p.x, p.y, pal[0], j < 3 ? 5 : 4);
      k.dot(p.x, p.y, pal[j < 3 ? 5 : 3], j < 3 ? 3 : 2);
    }
    if (name) icon(name, at(q), pal);
  }
  function coil(t, pal, e, down = false) {
    const p = body(t);
    for (let j = 0; j < 3; j++) {
      const a = e / 180 + j * 2.1,
        y = p.y - 9 + j * 7;
      const x = p.x + Math.cos(a) * 9;
      stroke({ x, y }, { x: x + Math.sin(a) * 4, y: y + (down ? 6 : -5) }, pal, j % 2 ? 3 : 4);
    }
  }

  // Template corners can be arrays; work in the cube's own axes, never assume x/y is its centre.
  function cube(s, fallbackFeet) {
    const a = s.area || {
      ...(s.pose.target || s.pose.base || { x: 0, y: 0 }),
      feet: fallbackFeet,
      dir: 0,
      kind: 'cube',
    };
    const pts = k.outline(a, s.grid);
    const conv = p => k.P(Array.isArray(p) ? { x: p[0], y: p[1] } : p);
    const len = ((a.feet || fallbackFeet) / (s.grid.feet || 5)) * 16;
    const O = pts.length >= 4 ? conv(pts[0]) : k.P(a);
    const U =
      pts.length >= 4 ? conv(pts[1]) : { x: O.x + len * Math.cos(a.dir || 0), y: O.y + len * Math.sin(a.dir || 0) };
    const V =
      pts.length >= 4 ? conv(pts[3]) : { x: O.x - len * Math.sin(a.dir || 0), y: O.y + len * Math.cos(a.dir || 0) };
    const ux = (U.x - O.x) / len,
      uy = (U.y - O.y) / len;
    const vx = (V.x - O.x) / len,
      vy = (V.y - O.y) / len;
    return {
      O,
      len,
      ux,
      uy,
      vx,
      vy,
      at: (u, v) => ({ x: O.x + ux * u + vx * v, y: O.y + uy * u + vy * v }),
      local: p => ({ x: (p.x - O.x) * ux + (p.y - O.y) * uy, y: (p.x - O.x) * vx + (p.y - O.y) * vy }),
    };
  }

  function greaseFloor(s, alpha) {
    const b = cube(s, 10),
      seed = (s.event.seed || 0) % 5;
    const progress = k.clamp((s.c.t - k.CAST) / 220);
    if (progress <= 0 || alpha <= 0) return;
    const stage = Math.min(5, Math.floor(k.ease(progress) * 5));
    const grow = 0.25 + stage * 0.15;
    const dim = Math.ceil(b.len * 1.42) + 6;
    const img = k.sprite(
      `45:slick:${b.len}:${stage}:${seed}:${Math.round(b.ux * 100)}:${Math.round(b.uy * 100)}`,
      dim,
      dim,
      AMBER,
      set => {
        const c = dim / 2,
          L = b.len * grow;
        // Overlapping round lobes leave scallops, fingers and bays, never straight box edges.
        const lobes = [
          [0, 0, 0.38, 0.28],
          [-0.25, -0.12, 0.2, 0.22],
          [0.24, -0.16, 0.19, 0.22],
          [-0.18, 0.22, 0.22, 0.19],
          [0.2, 0.21, 0.24, 0.18],
          [0.34, 0.04, 0.13, 0.15],
        ];
        for (let y = 2; y < dim - 2; y++)
          for (let x = 2; x < dim - 2; x++) {
            const dx = (x - c) * b.ux + (y - c) * b.uy;
            const dy = (x - c) * b.vx + (y - c) * b.vy;
            if (Math.abs(dx) > b.len / 2 - 1 || Math.abs(dy) > b.len / 2 - 1) continue;
            let edge = 2;
            for (const [ox, oy, rx, ry] of lobes)
              edge = Math.min(edge, Math.hypot((dx - ox * L) / (rx * L), (dy - oy * L) / (ry * L)));
            if (edge > 1) continue;
            let ink = edge > 0.85 ? 2 : 1;
            if (edge > 0.88 && edge < 0.98 && dy > 0) ink = 3;
            const shine = dy + L * 0.11 + Math.sin((dx / L) * 7 + seed * 0.3) * L * 0.045;
            if (dx > -L * 0.3 && dx < L * 0.19 && Math.abs(shine) < 1.2) ink = shine < 0 ? 5 : 3;
            if (dx > L * 0.1 && dx < L * 0.34 && Math.abs(dy - L * 0.15 + dx * 0.18) < 1) ink = 4;
            set(x, y, ink);
          }
      },
    );
    const C = b.at(b.len / 2, b.len / 2);
    k.blit(img, C.x - dim / 2, C.y - dim / 2, alpha);
    if (progress < 0.8) return;
    const loop = (s.c.raw / 2400) % 1;
    for (let i = 0; i < 2; i++) {
      const q = (loop + i / 2) % 1;
      const p = b.at(b.len * (0.35 + i * 0.3), b.len * (i ? 0.67 : 0.42));
      ring(p, 2 + q * 4, 1 + q * 1.5, AMBER, i ? 4 : 3, alpha * (q < 0.8 ? 1 : 0.5), 1);
    }
  }

  // Grease: glossy amber-black liquid floods the floor, splashes and catches a slipping foot.
  FX.register('grease', {
    palette: AMBER,
    travel: 200,
    beats: (event, kit, travel) => beats(event, kit, travel, 'soft', 70),
    end: () => 1210,
    ground(s) {
      // Linger takes over at impact; never paint the floor twice while the zone is active.
      if (!(s.pose.linger > 0 && s.c.t >= 500)) greaseFloor(s, residue(s.c.t - 500, 710));
      for (const t of subjects(s)) {
        const e = beatAge(s, t),
          f = feet(t);
        if (e < 0 || e > 400) continue;
        k.drawHit(k.hitStyle('45:slip', AMBER, { S: 20, spikes: 4, jag: 0.15 }), f, e);
        k.shards(f, e, AMBER, (s.event.seed || 0) + 9, 7, 12);
        for (let i = 0; i < 4; i++) {
          const q = k.clamp((e - i * 15) / 350),
            side = i % 2 ? 1 : -1;
          if (q <= 0 || q >= 1) continue;
          const p = { x: f.x + side * (4 + q * (5 + i)), y: f.y - Math.sin(q * Math.PI) * 8 + q * 3 };
          k.disc(p.x, p.y, 2.5, AMBER[0]);
          k.disc(p.x, p.y, 1.5, AMBER[4]);
        }
      }
    },
    linger(s) {
      greaseFloor(s, s.linger);
    },
  });

  // Charm Person: a pink spiral wraps the head, then a large candy-bright heart pops and holds.
  FX.register('charm-person', {
    palette: PINK,
    travel: 300,
    beats: (event, kit, travel) => beats(event, kit, travel),
    end: () => 1390,
    ground(s) {
      for (const t of subjects(s)) {
        const e = beatAge(s, t);
        if (e >= 0) {
          icon('aura', body(t), PINK, 0.5 * residue(e, 850));
          ring(feet(t), 10, 4, PINK, 3, 0.5 * residue(e, 850));
        }
      }
    },
    air(s) {
      for (const t of subjects(s)) {
        flight(s, t, PINK, null, true);
        const e = beatAge(s, t),
          h = head(t);
        if (e < 0) continue;
        impact(s, t, PINK, 'charm', 20, 5);
        if (e < 440) {
          coil({ ...t, y: t.y - 0.3 }, PINK, e);
          icon('heart', { x: h.x, y: h.y - 3 - (e < 80 ? (1 - e / 80) * 4 : 0) }, PINK);
          spark({ x: h.x - 13, y: h.y - 7 }, PINK, 2);
          spark({ x: h.x + 13, y: h.y + 1 }, PINK, 2);
        } else if (e < 850) icon('heart', { x: h.x, y: h.y - 4 }, PINK, 0.5 * residue(e, 850));
      }
    },
  });

  // Heroism: a golden courage column erupts from the feet and stamps a broad double-chevron badge.
  FX.register('heroism', {
    palette: GOLD,
    travel: 180,
    beats: (event, kit, travel) => beats(event, kit, travel, 'soft', 95),
    end: () => 1300,
    ground(s) {
      for (const t of subjects(s)) {
        const f = feet(t),
          age = s.c.t - k.CAST;
        if (age < 0) continue;
        const e = beatAge(s, t),
          height = 32 * k.ease(k.clamp(age / 180));
        if (e < 420) {
          const img = k.sprite(`45:column:${Math.round(height)}`, 25, 39, GOLD, set => {
            for (let y = 37 - Math.round(height); y <= 37; y++)
              for (let x = 2; x <= 22; x++) {
                if (x < 5 || x > 19) {
                  if ((y + x) % 5 < 3) set(x, y, 3);
                } else set(x, y, x < 8 || x > 16 ? 2 : x < 11 ? 4 : 3);
              }
          });
          k.blit(img, f.x - 12, f.y - 37, e > 220 ? 0.5 : 1);
        }
        if (e >= 0) {
          icon('aura', body(t), GOLD, residue(e, 900));
          ring(f, 11, 4, GOLD, 4, residue(e, 900));
        }
      }
    },
    air(s) {
      for (const t of subjects(s)) {
        const e = beatAge(s, t);
        if (e < 0) continue;
        impact(s, t, GOLD, 'heroism', 23);
        if (e < 470) icon('badge', body(t), GOLD);
        rising(s, t, GOLD, e);
        if (e >= 470) icon('aura', body(t), GOLD, 0.75 * residue(e, 900));
      }
    },
  });

  // Hex: a square-wide magenta-edged violet seal slams down; its lid opens into a watching eye.
  FX.register('hex', {
    palette: HEX,
    travel: 230,
    beats: (event, kit, travel) => beats(event, kit, travel, 'soft', 100),
    end: () => 1350,
    ground(s) {
      for (const t of subjects(s)) {
        const e = beatAge(s, t);
        if (e >= 0) ring(feet(t), 11, 5, HEX, 3, residue(e, 900));
      }
    },
    air(s) {
      for (const t of subjects(s)) {
        const p = body(t),
          e = beatAge(s, t),
          age = s.c.t - k.CAST;
        if (age >= 0 && e < 0) icon('sigil', { x: p.x, y: p.y - 18 * (1 - k.clamp(age / 230)) }, HEX);
        if (e < 0) continue;
        impact(s, t, HEX, 'hex', 27, 7);
        if (e < 380) icon('sigil', p, HEX);
        if (e >= 80 && e < 900) {
          const h = head(t);
          if (e < 145) stroke({ x: h.x - 8, y: h.y - 5 }, { x: h.x + 8, y: h.y - 5 }, HEX);
          else icon('eye', { x: h.x, y: h.y - 5 }, HEX, residue(e, 900));
          coil(t, HEX, e);
        }
      }
    },
  });

  // Hunter's Mark: four bright green brackets converge, snap to a thick crosshair and leave an arrow.
  FX.register('hunters-mark', {
    palette: GREEN,
    travel: 260,
    beats: (event, kit, travel) => beats(event, kit, travel, 'soft', 90),
    end: () => 1350,
    air(s) {
      for (const t of subjects(s)) {
        const p = body(t),
          age = s.c.t - k.CAST,
          e = beatAge(s, t);
        if (age >= 0 && e < 0) {
          const r = k.mix(21, 10, k.ease(k.clamp(age / 260)));
          for (const [dx, dy] of [
            [-1, -1],
            [1, -1],
            [1, 1],
            [-1, 1],
          ]) {
            const a = { x: p.x + dx * r, y: p.y + dy * r };
            stroke(a, { x: a.x - dx * 5, y: a.y }, GREEN);
            stroke(a, { x: a.x, y: a.y - dy * 5 }, GREEN);
          }
        }
        if (e < 0) continue;
        impact(s, t, GREEN, 'mark', 20, 4);
        if (e < 430) icon('crosshair', p, GREEN);
        if (e >= 180) icon('arrow', { x: p.x, y: head(t).y - 7 }, GREEN, residue(e, 880));
      }
    },
  });

  // Thunderwave: three thick pressure fronts burst from the caster and sweep the entire cube.
  FX.register('thunderwave', {
    palette: THUNDER,
    travel: 170,
    beats: (event, kit, travel) => beats(event, kit, travel, 'blast', 145),
    end: () => 1240,
    flash: (event, e) =>
      e < 35 ? { color: THUNDER[5], alpha: 0.28 } : e < 75 ? { color: THUNDER[0], alpha: 0.18 } : null,
    ground(s) {
      const age = s.c.t - k.CAST;
      if (age < 0 || age > 850) return;
      const b = cube(s, 15),
        source = b.local(k.P(s.pose.base || s.area || s.pose.target));
      const phase = Math.floor(age / 30),
        L = Math.ceil(b.len),
        pad = 3;
      // This cached raster clips every front to the actual cube, including a rotated template.
      const corners = [b.at(0, 0), b.at(b.len, 0), b.at(0, b.len), b.at(b.len, b.len)];
      const x0 = Math.floor(Math.min(...corners.map(p => p.x))) - pad;
      const y0 = Math.floor(Math.min(...corners.map(p => p.y))) - pad;
      const W = Math.ceil(Math.max(...corners.map(p => p.x)) - x0) + pad;
      const H = Math.ceil(Math.max(...corners.map(p => p.y)) - y0) + pad;
      const img = k.sprite(
        `45:pressure:${L}:${phase}:${Math.round(source.x)}:${Math.round(source.y)}:${Math.round(b.ux * 100)}:${Math.round(b.uy * 100)}`,
        W,
        H,
        THUNDER,
        set => {
          const front = ((phase * 30) / 370) * b.len * 1.5;
          for (let y = 2; y < H - 2; y++)
            for (let x = 2; x < W - 2; x++) {
              const q = b.local({ x: x + x0, y: y + y0 });
              if (q.x < 1 || q.y < 1 || q.x > b.len - 1 || q.y > b.len - 1) continue;
              const d = Math.hypot(q.x - source.x, q.y - source.y);
              for (let j = 0; j < 3; j++) {
                const r = front - j * b.len * 0.24;
                if (r > 0 && Math.abs(d - r) <= 1.6) {
                  set(x, y, j === 0 ? 5 : j === 1 ? 4 : 3);
                  break;
                }
                if (r > 0 && d < r - 2 && d > r - 5) set(x, y, 2);
              }
            }
        },
      );
      k.blit(img, x0, y0, age > 670 ? 0.5 : 1);
    },
    air(s) {
      for (const t of subjects(s)) {
        const e = beatAge(s, t);
        if (e < 0) continue;
        impact(s, t, THUNDER, 'thunderwave', 30, 6);
        const f = feet(t),
          B = k.P(s.pose.base || t),
          dx = f.x - B.x,
          dy = f.y - B.y,
          d = Math.hypot(dx, dy) || 1;
        if (e < 530) {
          const q = k.clamp(e / 530);
          for (let i = 0; i < 6; i++) {
            const p = {
              x: f.x + (dx / d) * q * 22 + (k.hash(i, s.event.seed) - 0.5) * 14,
              y: f.y + (dy / d) * q * 22 - Math.sin(q * Math.PI) * (5 + (i % 3) * 3),
            };
            k.disc(p.x, p.y, i % 2 ? 2 : 3, k.palettes.DUST[0]);
            k.disc(p.x, p.y, i % 2 ? 1 : 2, k.palettes.DUST[2]);
          }
        }
      }
    },
  });

  // Inflict Wounds: a green-white touch core tears open black-violet cracks across the body.
  FX.register('inflict-wounds', {
    palette: NECRO,
    travel: 140,
    beats: (event, kit, travel) => beats(event, kit, travel, 'hit', 120),
    end: () => 1150,
    air(s) {
      for (const t of subjects(s)) {
        const p = body(t),
          e = beatAge(s, t);
        const contact = k.P(k.contact(t, s.pose.hand || t));
        if (s.c.t >= k.CAST && e < 0) {
          ring(contact, 5 + 3 * (1 - k.clamp((s.c.t - k.CAST) / 140)), 7, NECRO, 4);
          continue;
        }
        if (e < 0) continue;
        k.drawHit(k.hitStyle('45:wounds', NECRO, { S: 32, spikes: 7, jag: 0.4, void: true }), contact, e);
        k.shards(contact, e, NECRO, s.event.seed || 0, 9, 19);
        if (e < 440) {
          const cracks = [
            [0, 0, -3, -5],
            [-3, -5, -1, -11],
            [-3, -5, -7, -7],
            [0, 0, 5, -3],
            [5, -3, 7, 2],
            [0, 0, -4, 5],
            [-4, 5, -2, 10],
            [-4, 5, -8, 7],
            [0, 0, 4, 5],
            [4, 5, 6, 10],
          ];
          const n = Math.min(cracks.length, 3 + Math.floor(e / 18));
          for (let j = 0; j < n; j++) {
            const [x, y, xx, yy] = cracks[j];
            stroke({ x: p.x + x, y: p.y + y }, { x: p.x + xx, y: p.y + yy }, NECRO, e < 170 ? 5 : 3, 1);
          }
          if (e < 180) {
            k.disc(contact.x, contact.y, 4, NECRO[0]);
            k.disc(contact.x, contact.y, 2.5, NECRO[5]);
          }
        }
        if (e > 90 && e < 650)
          for (let i = 0; i < 8; i++) {
            const q = (e - 90) / 560,
              a = k.hash(i, s.event.seed) * k.tau;
            const x = p.x + Math.cos(a) * (7 + q * 11),
              y = p.y + Math.sin(a) * 7 - q * 15;
            k.disc(x, y, 3, NECRO[0]);
            k.disc(x, y, 2, i % 3 ? NECRO[1] : NECRO[2]);
            if (i % 3 === 0) k.dot(x - 1, y - 1, NECRO[4]);
          }
      }
    },
  });

  // Command: a gold-white spoken rune flies out and stamps the figure, leaving an emphatic exclamation.
  FX.register('command', {
    palette: GOLD,
    travel: 300,
    beats: (event, kit, travel) => beats(event, kit, travel, 'soft', 100),
    end: () => 1390,
    air(s) {
      for (const t of subjects(s)) {
        flight(s, t, GOLD, 'word');
        const e = beatAge(s, t),
          p = body(t);
        if (e < 0) continue;
        impact(s, t, GOLD, 'command', 24, 6);
        if (e < 330) {
          ring(p, 11 + k.ease(k.clamp(e / 300)) * 6, 11 + e / 100, GOLD, 4);
          icon('word', p, GOLD);
        }
        if (e >= 150) icon('exclamation', { x: p.x, y: head(t).y - 5 }, GOLD, residue(e, 850));
      }
    },
  });

  // Healing Word: a green-gold word bursts into a large outlined plus, a round pulse and rising stars.
  FX.register('healingword', {
    palette: HEAL,
    travel: 300,
    beats: (event, kit, travel) => beats(event, kit, travel, 'soft', 85),
    end: () => 1380,
    ground(s) {
      for (const t of subjects(s)) {
        const e = beatAge(s, t);
        if (e >= 0) {
          ring(feet(t), 11 + k.clamp(e / 400) * 3, 5, HEAL, 4, residue(e, 850));
          icon('aura', body(t), HEAL, 0.5 * residue(e, 850));
        }
      }
    },
    air(s) {
      for (const t of subjects(s)) {
        flight(s, t, HEAL, 'healword');
        const e = beatAge(s, t),
          p = body(t);
        if (e < 0) continue;
        impact(s, t, HEAL, 'healingword', 25, 6);
        if (e < 500) {
          ring(p, 14, 14, HEAL, 3);
          icon('plus', p, HEAL);
        } else if (e < 850) icon('plus', { x: p.x, y: p.y - 3 }, HEAL, 0.5 * residue(e, 850));
        rising(s, t, HEAL, e, 8);
      }
    },
  });

  // Bane: a pale-edged purple-red cracked chevron drops onto every head and drains into dark ribbons.
  FX.register('bane', {
    palette: BANE,
    travel: 220,
    beats: (event, kit, travel) => beats(event, kit, travel, 'soft', 95),
    end: () => 1320,
    ground(s) {
      for (const t of subjects(s)) {
        const e = beatAge(s, t);
        if (e >= 0) ring(feet(t), 10, 4, BANE, 2, residue(e, 900));
      }
    },
    air(s) {
      for (const t of subjects(s)) {
        const h = head(t),
          e = beatAge(s, t),
          age = s.c.t - k.CAST;
        if (age >= 0 && e < 0) icon('bane', { x: h.x, y: h.y - 20 * (1 - k.clamp(age / 220)) }, BANE);
        if (e < 0) continue;
        impact(s, t, BANE, 'bane', 22, 6);
        if (e < 500) icon('bane', { x: h.x, y: h.y + 1 }, BANE);
        if (e < 850) {
          coil(t, BANE, e, true);
          const p = body(t);
          for (let i = 0; i < 4; i++) {
            const q = (e / 650 + i / 4) % 1;
            const x = p.x + (i % 2 ? 1 : -1) * (5 + Math.sin(q * 5 + i) * 3),
              y = h.y + q * 24;
            stroke({ x, y }, { x: x + 2, y: y + 5 }, BANE, i % 2 ? 2 : 3);
          }
        }
      }
    },
  });

  function wardDome(t, progress, alpha) {
    const f = feet(t),
      span = Math.max(1, t.span || 1),
      rx = Math.round(12 * span),
      ry = Math.round(28 * span);
    const step = Math.min(8, Math.floor(progress * 8)),
      W = rx * 2 + 7,
      H = ry + 8;
    const img = k.sprite(`45:ward:${rx}:${ry}:${step}`, W, H, GOLD, set => {
      for (let y = 2; y <= ry + 3; y++)
        for (let x = 2; x < W - 2; x++) {
          const dx = x - W / 2,
            dy = y - ry - 3;
          const angle = Math.atan2(-dy / ry, dx / rx);
          const d = Math.hypot(dx / rx, dy / ry);
          // Both sides rise from the feet and meet at the crown.
          if (angle > ((step / 8) * Math.PI) / 2 && angle < Math.PI - ((step / 8) * Math.PI) / 2) continue;
          if (d < 1.03 && d > 0.84) set(x, y, dx < -2 ? 5 : 4);
        }
    });
    k.blit(img, f.x - W / 2, f.y - ry - 3, alpha);
  }

  // Protection from Evil and Good: two pale-gold rims close into a dome with orbiting holy runes.
  FX.register('protection-from-evil-and-good', {
    palette: GOLD,
    travel: 220,
    beats: (event, kit, travel) => beats(event, kit, travel, 'soft', 90),
    end: () => 1350,
    ground(s) {
      const age = s.c.t - k.CAST;
      if (age < 0) return;
      for (const t of subjects(s)) {
        const e = beatAge(s, t),
          f = feet(t);
        wardDome(t, k.clamp(age / 220), e < 410 ? 1 : 0.25 * residue(e, 900));
        ring(f, 12, 5, GOLD, 4, e < 410 ? 1 : 0.5 * residue(e, 900));
      }
    },
    air(s) {
      for (const t of subjects(s)) {
        const e = beatAge(s, t),
          f = feet(t);
        if (e < 0) continue;
        impact(s, t, GOLD, 'ward', 22, 5);
        if (e < 520) {
          for (let i = 0; i < 5; i++) {
            const a = (i * k.tau) / 5 + e / 750;
            const p = { x: f.x + Math.cos(a) * 13, y: f.y - 11 + Math.sin(a) * 7 };
            stroke({ x: p.x, y: p.y - 2 }, { x: p.x, y: p.y + 2 }, GOLD, 5, 1);
            stroke({ x: p.x - 2, y: p.y - 1 }, { x: p.x + 2, y: p.y - 1 }, GOLD, 4, 1);
          }
          spark({ x: f.x, y: f.y - 28 }, GOLD, e < 180 ? 4 : 2);
        }
      }
    },
  });

  // Expeditious Retreat: shining legs, a winged boot and long white speed streaks with hollow afterimages.
  FX.register('expeditious-retreat', {
    palette: SPEED,
    travel: 160,
    beats: (event, kit, travel) => beats(event, kit, travel, 'soft', 85, true),
    end: () => 1280,
    ground(s) {
      const t = caster(s),
        e = beatAge(s, t),
        f = feet(t);
      if (e < 0 || e > 880) return;
      const dir = Math.atan2((s.pose.target?.y ?? t.y) - t.y, (s.pose.target?.x ?? t.x + 1) - t.x);
      const dx = Math.cos(dir),
        dy = Math.sin(dir),
        q = k.clamp(e / 550);
      for (let i = 3; i >= 1; i--) {
        const p = body(t),
          d = i * (5 + q * 3);
        icon('aura', { x: p.x - dx * d, y: p.y - dy * d }, SPEED, (1 - i * 0.18) * residue(e, 880));
      }
      ring(f, 9, 4, SPEED, 4, residue(e, 880));
      if (e < 500)
        for (let i = 0; i < 7; i++) {
          const d = 4 + q * (10 + i * 2),
            side = ((i % 3) - 1) * 4;
          const x = f.x - dx * d - dy * side,
            y = f.y - dy * d + dx * side - Math.sin(q * Math.PI) * 4;
          k.disc(x, y, 3, k.palettes.DUST[0]);
          k.disc(x, y, 2, k.palettes.DUST[2]);
        }
    },
    air(s) {
      const t = caster(s),
        p = body(t),
        f = feet(t),
        age = s.c.t - k.CAST,
        e = beatAge(s, t);
      if (age < 0) return;
      if (e < 440) {
        for (const side of [-1, 1])
          stroke({ x: f.x + side * 3, y: f.y - 9 }, { x: f.x + side * 4, y: f.y - 1 }, SPEED, 5, 3);
      }
      if (e < 0) return;
      impact(s, t, SPEED, 'retreat', 23, 5);
      if (e < 470) icon('boot', { x: p.x, y: p.y - 2 }, SPEED);
      const dir = Math.atan2((s.pose.target?.y ?? t.y) - t.y, (s.pose.target?.x ?? t.x + 1) - t.x);
      const dx = Math.cos(dir),
        dy = Math.sin(dir);
      if (e < 620)
        for (let i = 0; i < 5; i++) {
          const side = (i - 2) * 5,
            d = 5 + ((e / 240 + i * 0.16) % 1) * 10;
          const start = { x: p.x - dx * d - dy * side, y: p.y - dy * d + dx * side };
          stroke(
            start,
            { x: start.x - dx * (13 + (i % 2) * 6), y: start.y - dy * (13 + (i % 2) * 6) },
            SPEED,
            i % 2 ? 4 : 5,
          );
        }
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
