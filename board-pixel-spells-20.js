/* Pixel spells, batch 20: grave spirits, sacred light, storm bolts and elemental walls. */
(function (root) {
  'use strict';
  const FX = root.BoardPixelFX;
  if (!FX) return;
  const k = FX.kit;
  const DEAD = ['#140f21', '#38213f', '#426556', '#83bb91', '#e1e6c1', '#ffffff'];
  const CURSE = ['#180d23', '#392041', '#733d87', '#b363c2', '#efb5e1', '#ffffff'];
  const GOLD = ['#302014', '#815024', '#c18b31', '#f1c85c', '#fff0b1', '#ffffff'];
  const WORD = ['#102934', '#225466', '#368d9a', '#7fd6ca', '#e2f9d8', '#ffffff'];
  const PINK = ['#31162b', '#78344e', '#bb5d7a', '#ef9dba', '#ffe0e4', '#ffffff'];
  const BOLT = ['#10162c', '#293d79', '#5089cc', '#a5dcf2', '#edfbff', '#ffffff'];
  const CLOUD = ['#151b2b', '#2d3749', '#475871', '#70839a', '#b4c5cf', '#ffffff'];
  const FIRE = ['#2a0d0c', '#6e1a12', '#b8321a', '#ec6a1c', '#ffb53a', '#ffffff'];
  const ROCK = ['#221b22', '#4a3431', '#805247', '#b17b5c', '#dcc2a0', '#ffffff'];
  const DREAD = ['#120d1e', '#302039', '#56364f', '#93637e', '#c7a0bb', '#ffffff'];
  const GHOST = ['#15232e', '#315466', '#649d9b', '#a7d5cd', '#e7f6e5', '#ffffff'];
  const WATER = ['#102333', '#1e5079', '#348fb4', '#73cddc', '#ceeff1', '#ffffff'];
  const SAND = ['#332517', '#795032', '#b78645', '#dfb466', '#f5daa0', '#ffffff'];
  const WIND = ['#192832', '#40576b', '#7b9eac', '#b8d5d8', '#e7f1e7', '#ffffff'];

  const seed = s => s.event.seed || 0;
  const add = (p, x, y) => ({ x: p.x + x, y: p.y + y });
  const end = tail => (event, travel) => k.CAST + travel + tail;
  const age = s => s.c.t - k.CAST;
  function beats(event, kit, travel, kind = 'soft', stop = 80) {
    return (event.targets?.length ? event.targets : [null]).map(target => ({
      at: kit.CAST + travel,
      stop,
      target,
      kind,
      power: kind === 'soft' ? 0.03 : 0.08,
    }));
  }
  function subject(s, hit = s.hits[0]) {
    return s.targets.find(t => t.id === hit?.id) || s.targets[0] || s.pose.target || s.pose.base || { x: 0, y: 0 };
  }
  const feet = t => k.P({ x: t.baseX ?? t.x, y: t.baseY ?? t.y });
  const centre = s => k.P(s.area || s.pose.target || subject(s));
  const caster = s => k.P(s.pose.base || s.pose.hand || subject(s));
  const radius = (s, fallback) => ((s.area?.feet ?? fallback) / (s.grid.feet || 5)) * k.PX;
  function pixel(C, ramp, index = 3, size = 1) {
    k.dot(C.x, C.y, ramp[0], size + 2);
    k.dot(C.x, C.y, ramp[index], size);
  }
  function ball(C, r, ramp, index = 3) {
    k.disc(C.x, C.y, r + 1, ramp[0]);
    k.disc(C.x, C.y, r, ramp[index]);
  }
  function stroke(A, B, ramp, index = 3, width = 1, cap = 30) {
    const d = Math.hypot(B.x - A.x, B.y - A.y);
    const n = Math.max(1, Math.min(cap, Math.ceil(d / 2)));
    for (const [color, w] of [
      [ramp[0], width + 2],
      [ramp[index], width],
    ])
      for (let i = 0; i <= n; i++) k.dot(k.mix(A.x, B.x, i / n), k.mix(A.y, B.y, i / n), color, w);
  }
  function ring(C, rx, ry, ramp, index = 3, gaps = 0) {
    rx = Math.max(1, Math.round(rx));
    ry = Math.max(1, Math.round(ry));
    const img = k.sprite(`20:ring:${ramp[0]}:${rx}:${ry}:${index}:${gaps}`, rx * 2 + 6, ry * 2 + 6, ramp, set => {
      const n = Math.ceil(k.tau * Math.max(rx, ry) * 1.5);
      for (let i = 0; i < n; i++) {
        if (gaps && Math.floor((i / n) * gaps * 2) % 2) continue;
        const a = (i / n) * k.tau;
        set(rx + 3 + Math.cos(a) * rx, ry + 3 + Math.sin(a) * ry, index);
      }
    });
    k.blit(img, C.x - rx - 3, C.y - ry - 3);
  }
  function stamp(key, rows, ramp, C) {
    const w = Math.max(...rows.map(row => row.length)) + 2;
    const img = k.sprite(`20:${key}:${ramp[0]}`, w, rows.length + 2, ramp, set => {
      rows.forEach((row, y) =>
        [...row].forEach((v, x) => {
          if (v !== '.') set(x + 1, y + 1, +v);
        }),
      );
    });
    k.blit(img, C.x - w / 2, C.y - img.height / 2);
  }
  function impact(s, hit, C, ramp, size = 26, count = 6, salt = 0) {
    const e = s.real(hit);
    k.drawHit(
      k.hitStyle(`20:${s.event.id}:${ramp[0]}:${size}`, ramp, {
        S: size,
        spikes: 5,
        minor: 3,
        jag: 0.35,
      }),
      C,
      e,
    );
    k.shards(C, e, ramp, seed(s) + salt * 37, count, size * 0.7);
  }
  function delivery(s, hit, C, ramp) {
    if (!s.pose.hand || s.c.t < k.CAST || s.c.t >= hit.at) return;
    const H = k.P(s.pose.hand),
      q = (s.c.t - k.CAST) / Math.max(1, hit.at - k.CAST);
    for (let i = 5; i >= 0; i--) {
      const u = q - i * 0.045;
      if (u < 0) continue;
      pixel({ x: k.mix(H.x, C.x, u), y: k.mix(H.y, C.y, u) - Math.sin(u * Math.PI) * 7 }, ramp, i ? 3 : 5, i ? 1 : 3);
    }
  }
  function sparks(s, C, e, ramp, n = 9, spread = 22) {
    if (e < 0 || e > 650) return;
    for (let i = 0; i < n; i++) {
      const q = e / 650;
      if (q > 0.7 && i % 2) continue;
      const a = k.hash(i, seed(s), 3) * k.tau;
      pixel(add(C, Math.cos(a) * spread * (0.35 + q), Math.sin(a) * spread * 0.45 - q * 12), ramp, i % 3 ? 3 : 4);
    }
  }
  const SKULL = [
    '..4444444..',
    '.445555544.',
    '44555555544',
    '44511511544',
    '.444454444.',
    '..4411144..',
    '..4343434..',
    '...33333...',
  ];
  const GHOST_FACE = [
    '...4444...',
    '..455554..',
    '.45555554.',
    '.45155154.',
    '.45511554.',
    '..455554..',
    '..344443..',
    '.33444433.',
    '33.3333.33',
    '3..3..3..3',
  ];
  const SWORD = ['...5...', '..454..', '..454..', '..454..', '..454..', '..343..', '4334334', '...3...', '..333..'];
  const SHIELD = [
    '.4444444.',
    '433333334',
    '433454334',
    '.3345433.',
    '.3334333.',
    '..33333..',
    '...333...',
    '....3....',
  ];
  const RUNES = [
    ['.4.4.', '44444', '.4.4.', '..4..', '.444.'],
    ['.444.', '4...4', '..44.', '.4...', '44444'],
    ['4...4', '4.4.4', '.444.', '..4..', '..4..'],
  ];
  function ghost(C, ramp, frame = 0) {
    stamp(
      `spirit:${frame % 2}`,
      frame % 2 ? GHOST_FACE.map((row, i) => (i > 7 ? row.slice(1) + '.' : row)) : GHOST_FACE,
      ramp,
      C,
    );
  }
  function geometry(s, length = 30, width = 5) {
    const a = s.area || { ...(s.pose.target || s.pose.base || subject(s)), dir: 0, feet: length, width };
    const O = k.P(a),
      d = a.dir || 0;
    return {
      O,
      dx: Math.cos(d),
      dy: Math.sin(d),
      L: ((a.feet || length) / (s.grid.feet || 5)) * k.PX,
      W: ((a.width || width) / (s.grid.feet || 5)) * k.PX,
      d,
    };
  }
  const along = (g, u, v = 0, z = 0) => ({ x: g.O.x + g.dx * u - g.dy * v, y: g.O.y + g.dy * u + g.dx * v - z });
  function footprint(s, ramp, mode, phase = 0) {
    const g = geometry(s, 30, mode === 'wash' ? 10 : 5);
    const cone = mode === 'fear',
      half = cone ? g.L / 2 : g.W / 2;
    // Template corners are converted once; no canvas paths or rotated, softened area fills.
    const corners = s.area ? k.outline(s.area, s.grid) : [];
    const points =
      corners.length === 4 || (cone && corners.length === 3)
        ? corners.map(p => k.P({ x: p[0], y: p[1] }))
        : [along(g, 0, -half), along(g, g.L, -half), along(g, g.L, half), along(g, 0, half)];
    const x0 = Math.floor(Math.min(...points.map(p => p.x))) - 3;
    const y0 = Math.floor(Math.min(...points.map(p => p.y))) - 3;
    const w = Math.ceil(Math.max(...points.map(p => p.x)) - x0) + 4;
    const h = Math.ceil(Math.max(...points.map(p => p.y)) - y0) + 4;
    const ox = g.O.x - x0,
      oy = g.O.y - y0;
    const img = k.sprite(`20:foot:${mode}:${g.L}:${g.W}:${g.d.toFixed(4)}:${phase}`, w, h, ramp, set => {
      for (let y = 2; y < h - 2; y++)
        for (let x = 2; x < w - 2; x++) {
          const u = (x - ox) * g.dx + (y - oy) * g.dy;
          const v = -(x - ox) * g.dy + (y - oy) * g.dx;
          const edge = cone ? u / 2 : half;
          if (u < 0 || u > g.L || Math.abs(v) > edge) continue;
          if (mode === 'fear') {
            if (phase < 2 && u > (g.L * (phase + 1)) / 3) continue;
            const band = Math.floor((u / g.L) * 7 - phase / 2);
            if (band % 3 === 0 || Math.abs(v) > edge - 2) set(x, y, phase > 3 ? 2 : 3);
            else if (Math.abs(v) < edge * 0.7) set(x, y, 1);
          } else if (mode === 'wash') {
            if (u / g.L > (phase + 1) / 6) continue;
            const band = Math.floor(v / 3 + Math.sin(u / 8) * 1.2 + phase);
            if (phase > 3 && band % 3) continue;
            set(x, y, Math.abs(v) > edge - 2 ? 4 : band % 3 === 0 ? 3 : 2);
          } else {
            if (Math.abs(v) > edge - 1 || Math.floor(u / 9) % 3 === 0) set(x, y, 2);
          }
        }
    });
    k.blit(img, x0, y0);
  }
  function lightField(C, R, ramp, phase, mantle = false, alpha = 1) {
    R = Math.max(6, Math.round(R));
    const img = k.sprite(`20:light:${R}:${phase}:${mantle}`, R * 2 + 6, R * 2 + 6, ramp, set => {
      for (let y = 2; y < R * 2 + 4; y++)
        for (let x = 2; x < R * 2 + 4; x++) {
          const dx = x - R - 3,
            dy = y - R - 3,
            r = Math.hypot(dx, dy);
          if (r > R) continue;
          const a = Math.atan2(dy, dx),
            spokes = Math.abs(Math.sin(a * (mantle ? 8 : 12)));
          if (mantle) {
            if (r > R - 2 || (r > R * 0.89 && r < R * 0.91)) set(x, y, 3);
            else if (r > R * 0.7 && spokes < 0.035 && phase < 3) set(x, y, 2);
          } else {
            if (r < R * 0.12) set(x, y, 4);
            else if (r > R - 2) set(x, y, 3);
            else if (spokes < 0.07 && r > R * 0.2) set(x, y, 3);
            else set(x, y, phase < 2 ? 4 : 2);
          }
        }
    });
    k.blit(img, C.x - R - 3, C.y - R - 3, alpha);
  }
  function storm(s, C, e) {
    if (e < 0 || e > 760) return;
    const frame = Math.min(3, Math.floor(e / 140));
    const img = k.sprite(`20:storm:${frame}`, 69, 29, CLOUD, set => {
      const lobes = [
        [16, 17, 12],
        [29, 12, 12],
        [43, 14, 13],
        [54, 18, 10],
      ];
      for (let y = 2; y < 27; y++)
        for (let x = 2; x < 67; x++) {
          let v = 0;
          for (const [cx, cy, r] of lobes) v = Math.max(v, 1 - Math.hypot(x - cx, y - cy) / r);
          if (v <= 0) continue;
          set(x, y, y > 19 ? 1 : v > 0.4 ? 3 : 2);
          if (frame === 1 && y > 19 && x > 28 && x < 39) set(x, y, 4);
        }
    });
    k.blit(img, C.x - 34, C.y - 73 + (frame === 3 ? -3 : 0));
  }
  function lightning(s, C, e) {
    if (e < 0 || e > 280) return;
    const tick = Math.floor(e / 40),
      points = [];
    for (let i = 0; i <= 7; i++)
      points.push(add(C, i === 7 ? 0 : (k.hash(i, seed(s), tick) - 0.5) * 18, -54 + (i * 54) / 7));
    // All outline segments precede the coloured core, preserving a continuous angular silhouette.
    for (const [color, width] of [
      [BOLT[0], 7],
      [BOLT[3], 5],
      [BOLT[tick % 2 ? 4 : 5], 2],
    ])
      for (let i = 1; i < points.length; i++) {
        const A = points[i - 1],
          B = points[i];
        const n = Math.ceil(Math.hypot(B.x - A.x, B.y - A.y) / 2);
        for (let j = 0; j <= n; j++) k.dot(k.mix(A.x, B.x, j / n), k.mix(A.y, B.y, j / n), color, width);
      }
    if (e < 130) {
      stroke(points[3], add(C, -16, -17), BOLT, 4, 1, 10);
      stroke(points[5], add(C, 16, -5), BOLT, 4, 1, 10);
    }
  }
  function wallBody(s, ramp, type, growth = 1, life = 1, custom = null) {
    if (growth <= 0 || life <= 0) return;
    const g = custom || geometry(s, type === 'wind' ? 50 : 30, type === 'sand' ? 10 : 1);
    const full = ((s.area?.height || (type === 'wind' ? 15 : 10)) / (s.grid.feet || 5)) * k.PX;
    const H = Math.max(2, Math.round((full * growth) / 4) * 4);
    const f = Math.floor((s.c.t - k.CAST) / 100) % 6;
    const corners = [along(g, 0, -g.W / 2), along(g, 0, g.W / 2), along(g, g.L, -g.W / 2), along(g, g.L, g.W / 2)];
    const x0 = Math.floor(Math.min(...corners.map(p => p.x))) - 4;
    const y0 = Math.floor(Math.min(...corners.map(p => p.y))) - H - 6;
    const w = Math.ceil(Math.max(...corners.map(p => p.x)) - x0) + 5;
    const h = Math.ceil(Math.max(...corners.map(p => p.y)) - y0) + 5;
    const ox = g.O.x - x0,
      oy = g.O.y - y0;
    const img = k.sprite(
      `20:wall:${type}:${g.L.toFixed(2)}:${g.W.toFixed(2)}:${g.d.toFixed(4)}:${H}:${f}`,
      w,
      h,
      ramp,
      set => {
        // Extrude the actual template footprint upward in screen space. Bodies stay under figures.
        for (let y = H + 2; y < h - 2; y++)
          for (let x = 2; x < w - 2; x++) {
            const u = (x - ox) * g.dx + (y - oy) * g.dy;
            const v = -(x - ox) * g.dy + (y - oy) * g.dx;
            if (u < 0 || u > g.L || Math.abs(v) > g.W / 2) continue;
            const curl = Math.round(Math.sin(u / 8 + f * 0.7) * 2);
            const column = type === 'wind' ? H : Math.max(2, H - 3 + curl);
            for (let z = 0; z < column; z++) {
              if (type === 'wind') {
                const ribbon = (((z + Math.round(u / 4) + curl * 2 + f * 3) % 18) + 18) % 18;
                if (ribbon > 3 || (Math.floor(u / 16 + f / 2) % 4 === 0 && z < H * 0.8)) continue;
                set(x, y - z, ribbon === 0 ? 4 : 3);
              } else {
                const band = Math.floor((z + curl) / (type === 'sand' ? 6 : 9));
                const top = z > column - (type === 'sand' ? 2 : 3);
                set(x, y - z, top ? (type === 'water' ? 5 : 4) : z < H * 0.25 ? 1 : band % 3 === 0 ? 3 : 2);
              }
            }
          }
      },
    );
    k.blit(img, x0, y0, life);
  }
  function wallGround(s, ramp, type, loop = false) {
    const t = age(s);
    if (t < 0 || (!loop && t > 1100)) return;
    if (!loop && s.pose.linger > 0 && s.c.t >= s.hits[0].at) return;
    footprint(s, ramp, type);
    wallBody(s, ramp, type, loop ? Math.max(0.1, s.linger) : k.ease(k.clamp((t + 25) / 300)), loop ? s.linger : 1);
    const g = geometry(s, type === 'wind' ? 50 : 30, type === 'sand' ? 10 : 1);
    const n = type === 'wind' ? 10 : 8;
    for (let i = 0; i < n; i++) {
      const q = (s.c.t / 700 + k.hash(i, seed(s))) % 1;
      const u = ((i + 0.5) / n) * g.L;
      const h = ((s.area?.height || (type === 'wind' ? 15 : 10)) / (s.grid.feet || 5)) * k.PX;
      const C = along(g, u + Math.sin(q * k.tau) * 3, 0, h * q);
      pixel(C, ramp, type === 'sand' ? 4 : 5, i % 3 ? 1 : 2);
    }
  }
  function wallAir(s, ramp, type) {
    const g = geometry(s, type === 'wind' ? 50 : 30, type === 'sand' ? 10 : 1);
    const at = along(g, g.L / 2);
    if (s.c.t < s.hits[0].at) delivery(s, s.hits[0], at, ramp);
    for (const [i, hit] of s.hits.entries()) {
      const C = hit.id == null ? at : k.P(subject(s, hit));
      impact(s, hit, C, ramp, type === 'wind' ? 34 : 23, 5, i);
    }
  }

  // Summon Undead: a sickly grave seal cracks open and raises a bone-white skeleton wrapped in green ectoplasm.
  FX.register('summon-undead', {
    palette: DEAD,
    travel: 360,
    beats: (event, kit, travel) => [{ at: kit.CAST + travel, stop: 115, target: null, kind: 'soft', power: 0.03 }],
    end: end(850),
    ground(s) {
      const t = age(s),
        C = centre(s);
      if (t < 0 || t > 1210) return;
      ring(C, 20, 9, DEAD, t < 500 ? 3 : 2, 7);
      ring(C, 13, 6, CURSE, 2);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * k.tau;
        stroke(add(C, Math.cos(a) * 7, Math.sin(a) * 3), add(C, Math.cos(a) * 18, Math.sin(a) * 8), DEAD, 1, 1, 6);
      }
    },
    air(s) {
      const t = age(s),
        C = centre(s),
        hit = s.hits[0];
      if (t < 0 || t > 1210) return;
      if (t < 360) {
        delivery(s, hit, add(C, 0, -8), DEAD);
        for (let i = 0; i < 5; i++) {
          const q = (t / 360 + i / 5) % 1;
          pixel(add(C, Math.cos(q * k.tau + i) * (15 - q * 10), -q * 24), DEAD, 3, 2);
        }
      }
      if (t >= 160) {
        const f = Math.min(4, Math.floor((t - 160) / 80));
        const rows = [
          '.......444444.......',
          '......45555554......',
          '......45155154......',
          '......45511554......',
          '.......443344.......',
          '........4444........',
          '.........4..........',
          '....344444444443....',
          '...43..434434..34...',
          '...4...444444...4...',
          '..43...434434...34..',
          '..4....444444....4..',
          '..4.....4344.....4..',
          '.443.....44.....344.',
          '.........44.........',
          '.......344443.......',
          '.......44..44.......',
          '.......4....4.......',
          '......44....44......',
          '......4......4......',
          '.....44......44.....',
          '.....4........4.....',
          '....444......444....',
        ];
        stamp(
          `undead-rise:${f}`,
          rows.map((row, y) => (y < 20 - f * 5 ? '.'.repeat(row.length) : row)),
          DEAD,
          add(C, 0, -12),
        );
        if (f >= 3) {
          pixel(add(C, -2, -21), DEAD, 3);
          pixel(add(C, 2, -21), DEAD, 3);
          for (let i = 0; i < 3; i++) {
            const q = (s.c.t / 700 + i / 3) % 1;
            ghost(add(C, Math.sin(q * k.tau) * 13, -4 - q * 18), DEAD, i);
          }
        }
      }
      impact(s, hit, add(C, 0, -8), DEAD, 32, 9);
      sparks(s, C, s.real(hit) - 160, CURSE, 7, 20);
    },
  });

  // Bestow Curse: a violet wisp carries a black skull to the victim; hooked claws clamp an ill-omen seal around them.
  FX.register('bestow-curse', {
    palette: CURSE,
    travel: 240,
    beats: (event, kit, travel) => beats(event, kit, travel, 'soft', 100),
    end: end(700),
    ground(s) {
      for (const hit of s.hits) {
        const e = s.c.t - hit.at;
        if (e < 0 || e > 700) continue;
        ring(feet(subject(s, hit)), 15, 8, CURSE, e < 460 ? 3 : 2, e > 550 ? 7 : 0);
      }
    },
    air(s) {
      if (age(s) < 0) return;
      for (const [i, hit] of s.hits.entries()) {
        const C = k.P(subject(s, hit)),
          e = s.c.t - hit.at;
        delivery(s, hit, C, CURSE);
        if (e >= 0 && e < 660) {
          stamp('curse-skull', SKULL, CURSE, add(C, 0, -16));
          const close = k.ease(k.clamp(e / 140));
          for (const side of [-1, 1])
            for (let j = 0; j < 3; j++) {
              const A = add(C, side * (20 - close * 8), -12 + j * 6);
              const B = add(C, side * (13 - close * 7), -8 + j * 5);
              stroke(A, B, CURSE, j === 1 ? 4 : 3, 2, 6);
              stroke(B, add(B, -side * 3, 4), CURSE, 2, 1, 4);
            }
          stamp('curse-rune', RUNES[2], CURSE, add(C, 0, 4));
        }
        impact(s, hit, C, CURSE, 30, 7, i);
        sparks(s, C, s.real(hit) - 90, CURSE, 6, 18);
      }
    },
  });

  // Call Lightning: a squat thunderhead opens above the five-foot strike; a forked blue-white bolt hammers the ground.
  FX.register('call-lightning', {
    palette: BOLT,
    travel: 360,
    beats: (event, kit, travel) => beats(event, kit, travel, 'blast', 170),
    end: end(650),
    reach: (event, grid) => ({ r: (event.area?.feet || 5) / (grid.feet || 5) + 2, up: 5 }),
    flash: (event, e) => (e < 35 ? { color: BOLT[5], alpha: 0.25 } : e < 85 ? { color: BOLT[0], alpha: 0.17 } : null),
    ground(s) {
      const e = s.c.t - s.hits[0].at,
        C = centre(s),
        R = radius(s, 5);
      if (e < 0 || e > 650) return;
      ring(C, R, R, BOLT, 2, e > 470 ? 10 : 0);
      if (e < 280)
        ring(C, R * (0.3 + k.ease(e / 280)), R * (0.3 + k.ease(e / 280)), BOLT, e < 60 ? 5 : 3, e > 170 ? 9 : 0);
      for (let i = 0; i < 5; i++) {
        const a = (i * k.tau) / 5 + seed(s);
        stroke(C, add(C, Math.cos(a) * R * 0.85, Math.sin(a) * R * 0.85), CLOUD, 1, 1, 7);
      }
    },
    air(s) {
      if (age(s) < 0 || age(s) > 1010) return;
      const C = centre(s),
        hit = s.hits[0];
      storm(s, C, age(s));
      lightning(s, C, s.real(hit));
      impact(s, hit, C, BOLT, 46, 12);
      for (const [i, h] of s.hits.entries()) if (h.id != null) impact(s, h, k.P(subject(s, h)), BOLT, 28, 5, i + 1);
    },
  });

  // Daylight: a golden bead becomes a crisp miniature sun; broad, banded daylight fills the full sixty-foot circle.
  FX.register('daylight', {
    palette: GOLD,
    travel: 250,
    beats: (event, kit, travel) => [{ at: kit.CAST + travel, stop: 85, target: null, kind: 'soft', power: 0.03 }],
    end: end(750),
    ground(s) {
      const e = s.c.t - s.hits[0].at;
      if (e < 0 || e > 750 || s.pose.linger > 0) return;
      const q = e < 80 ? 0.25 : e < 160 ? 0.55 : e < 240 ? 0.8 : 1;
      lightField(centre(s), radius(s, 60) * q, GOLD, e < 100 ? 1 : 2, false, e < 100 ? 0.75 : 0.25);
    },
    air(s) {
      const C = centre(s),
        hit = s.hits[0],
        e = s.c.t - hit.at;
      delivery(s, hit, C, GOLD);
      if (e >= 0 && e < 750) {
        ball(C, 7, GOLD, 4);
        ball(add(C, -1, -1), 3, GOLD, 5);
        for (let i = 0; i < 8; i++) {
          const a = (i * k.tau) / 8;
          stroke(add(C, Math.cos(a) * 10, Math.sin(a) * 10), add(C, Math.cos(a) * 15, Math.sin(a) * 15), GOLD, 3, 1, 4);
        }
      }
      impact(s, hit, C, GOLD, 30, 7);
    },
    linger(s) {
      lightField(centre(s), radius(s, 60), GOLD, 2, false, s.linger * 0.25);
      ball(centre(s), 5, GOLD, 4);
    },
  });

  // Crusader's Mantle: a thirty-foot gold boundary unfurls from the caster, with upright radiant swords and a pennant.
  FX.register('crusaders-mantle', {
    palette: GOLD,
    travel: 260,
    beats,
    end: end(800),
    ground(s) {
      const t = age(s);
      if (t < 0 || t > 1060 || (s.pose.linger > 0 && s.c.t >= s.hits[0].at)) return;
      lightField(
        caster(s),
        radius(s, 30) * (0.2 + 0.8 * k.ease(k.clamp(t / 260))),
        GOLD,
        Math.min(3, Math.floor(t / 200)),
        true,
      );
    },
    air(s) {
      const e = s.c.t - s.hits[0].at;
      if (e >= 0 && e < 750) {
        const C = caster(s);
        stamp(
          'crusader-banner',
          [
            '..433333333.',
            '..434444443.',
            '..434454443.',
            '..434555443.',
            '..434454443.',
            '..43333333..',
            '..43........',
            '..43........',
            '..43........',
            '..43........',
          ],
          GOLD,
          add(C, 0, -18),
        );
        for (let i = 0; i < 3; i++) stamp('mantle-sword', SWORD, GOLD, add(C, (i - 1) * 13, -7 + (i % 2) * 5));
      }
      for (const [i, hit] of s.hits.entries()) impact(s, hit, k.P(subject(s, hit)), GOLD, 23, 5, i);
    },
    linger(s) {
      const C = caster(s),
        R = radius(s, 30);
      lightField(C, R, GOLD, 3, true, s.linger);
      for (let i = 0; i < 6; i++) {
        const a = (i * k.tau) / 6 + Math.floor(s.c.t / 180) * 0.035;
        stamp('mantle-sword', SWORD, GOLD, add(C, Math.cos(a) * (R - 8), Math.sin(a) * (R - 8)));
      }
    },
  });

  // Melf's Minute Meteors: six burning stones orbit the caster; two peel off in arcs and burst into fire and rock.
  FX.register('melfs-minute-meteors', {
    palette: FIRE,
    travel: 650,
    beats(event, kit, travel) {
      const list = kit.targetList(event, event.darts);
      return [0, 1].map(i => ({
        at: kit.CAST + travel + i * 170,
        stop: 95,
        target: list.length ? list[i % list.length] : null,
        kind: 'dart',
        power: 0.06,
      }));
    },
    end: () => k.CAST + 1300,
    ground(s) {
      for (const hit of s.hits) {
        const e = s.c.t - hit.at;
        if (e < 0 || e > 420) continue;
        const C = feet(subject(s, hit));
        if (e < 190) {
          ball(C, e < 50 ? 5 : 10, FIRE, e < 50 ? 5 : 3);
          ball(add(C, -4, -3), 4, FIRE, 4);
        } else {
          for (let j = 0; j < 3; j++) ball(add(C, (j - 1) * 5, -(e - 190) / 35), 3, CLOUD, j % 2 ? 2 : 1);
        }
      }
    },
    air(s) {
      const t = age(s);
      if (t < 0 || t > 1300) return;
      const H = k.P(s.pose.hand || s.pose.base || subject(s));
      for (let i = 0; i < 6; i++) {
        if (i < 2 && t >= 260 + i * 170) continue;
        if (s.pose.linger > 0 && s.c.t >= s.hits[0].at) continue;
        const a = t / 280 + (i * k.tau) / 6;
        const C = add(H, Math.cos(a) * 17, Math.sin(a) * 8 - 2);
        ball(C, 3, FIRE, 3);
        ball(add(C, 0, 1), 1, ROCK, 2);
        pixel(add(C, -1, -2), FIRE, 4);
      }
      for (const [i, hit] of s.hits.entries()) {
        const T = k.P(subject(s, hit));
        const start = k.CAST + 260 + i * 170;
        if (s.c.t >= start && s.c.t < hit.at) {
          const q = (s.c.t - start) / (hit.at - start);
          const path = u => ({ x: k.mix(H.x, T.x, u), y: k.mix(H.y, T.y, u) - Math.sin(u * Math.PI) * (22 + i * 7) });
          for (let j = 8; j > 0; j--) {
            const u = q - j * 0.026;
            if (u < 0) continue;
            pixel(path(u), j > 5 ? CLOUD : FIRE, j > 5 ? 2 : 4, j > 4 ? 1 : 2);
          }
          const C = path(q);
          ball(C, 4, FIRE, 3);
          ball(add(C, 0, 1), 2, ROCK, 2);
          pixel(add(C, -1, -2), FIRE, 5, 2);
        }
        impact(s, hit, T, FIRE, 34, 7, i);
        k.shards(T, s.real(hit), ROCK, seed(s) + i * 13, 5, 24);
      }
    },
    linger(s) {
      const C = k.P(s.pose.hand || s.pose.base || subject(s));
      for (let i = 0; i < 4; i++) {
        const a = (s.c.t - k.CAST) / 280 + ((i + 2) * k.tau) / 6;
        const p = add(C, Math.cos(a) * 17, Math.sin(a) * 8 - 2);
        ball(p, 3, FIRE, s.linger < 0.4 ? 2 : 3);
        pixel(add(p, -1, -1), FIRE, 4);
      }
    },
  });

  // Fear: a thirty-foot violet-black scream cone races outward, carrying hollow-eyed phantasmal skulls.
  FX.register('fear', {
    palette: DREAD,
    travel: 300,
    beats: (event, kit, travel) => beats(event, kit, travel, 'soft', 125),
    end: end(650),
    ground(s) {
      const t = age(s);
      if (t < 0 || t > 950) return;
      footprint(s, DREAD, 'fear', Math.min(5, Math.floor(t / 130)));
    },
    air(s) {
      const t = age(s),
        g = geometry(s, 30);
      if (t < 0 || t > 950) return;
      for (let i = 0; i < 7; i++) {
        const q = k.clamp(t / 300) * (0.35 + i / 11);
        const C = along(g, q * g.L, ((i % 3) - 1) * q * g.L * 0.28, 7);
        if (t < 500 || (i % 2 === 0 && t < 750)) {
          stamp('fear-skull', SKULL, DREAD, C);
          for (let j = 1; j <= 2; j++) pixel(along(g, q * g.L - j * 4, ((i % 3) - 1) * q * g.L * 0.28, 7), DREAD, 2);
        }
      }
      for (const [i, hit] of s.hits.entries()) {
        const C = k.P(subject(s, hit));
        impact(s, hit, C, DREAD, 27, 6, i);
        if (s.real(hit) >= 90 && s.real(hit) < 550) {
          stamp('fear-eye', ['.444.444.', '451444154', '.444.444.'], DREAD, add(C, 0, -15));
        }
      }
    },
  });

  // Wall of Water: a thin, thirty-foot blue curtain rises with a white foam crest, streaming bands and falling droplets.
  FX.register('wall-of-water', {
    palette: WATER,
    travel: 320,
    beats: (event, kit, travel) => [{ at: kit.CAST + travel, stop: 90, target: null, kind: 'soft', power: 0.03 }],
    end: end(780),
    ground: s => wallGround(s, WATER, 'water'),
    air: s => wallAir(s, WATER, 'water'),
    linger: s => wallGround(s, WATER, 'water', true),
  });

  // Wall of Sand: a thick ochre rampart surges up in layered dunes; loose grains spiral along its scalloped top.
  FX.register('wall-of-sand', {
    palette: SAND,
    travel: 340,
    beats: (event, kit, travel) => [{ at: kit.CAST + travel, stop: 110, target: null, kind: 'soft', power: 0.03 }],
    end: end(760),
    ground: s => wallGround(s, SAND, 'sand'),
    air: s => wallAir(s, SAND, 'sand'),
    linger: s => wallGround(s, SAND, 'sand', true),
  });

  // Wind Wall: fifty feet of pale, open spiralling gust ribbons snap upward and batter creatures with wind-borne debris.
  FX.register('wind-wall', {
    palette: WIND,
    travel: 280,
    beats: (event, kit, travel) => beats(event, kit, travel, 'blast', 125),
    end: end(820),
    ground: s => wallGround(s, WIND, 'wind'),
    air(s) {
      wallAir(s, WIND, 'wind');
      for (const [i, hit] of s.hits.entries())
        k.shards(k.P(subject(s, hit)), s.real(hit), ROCK, seed(s) + i * 5, 4, 24);
    },
    linger: s => wallGround(s, WIND, 'wind', true),
  });

  // Tidal Wave: a tall turquoise breaker rolls down the thirty-foot strip, slams into white foam and leaves broken ripples.
  FX.register('tidal-wave', {
    palette: WATER,
    travel: 460,
    beats: (event, kit, travel) => beats(event, kit, travel, 'blast', 155),
    end: end(780),
    ground(s) {
      const t = age(s),
        g = geometry(s, 30, 10),
        hit = s.hits[0],
        e = s.c.t - hit.at;
      if (t < 0 || t > 1240) return;
      const q = k.clamp(t / 460);
      footprint(s, WATER, 'wash', e < 0 ? Math.min(5, Math.floor(q * 6)) : e < 220 ? 5 : 4);
      if (e < 190) {
        const A = along(g, q * g.L, -g.W / 2);
        const crest = { O: A, dx: -g.dy, dy: g.dx, d: g.d + Math.PI / 2, L: g.W, W: 4 };
        const rise = e < 0 ? 0.5 + Math.min(0.5, t / 250) : Math.max(0.08, 1 - e / 190);
        wallBody(s, WATER, 'water', rise, 1, crest);
        for (let i = 0; i < 5; i++) {
          const C = along(g, q * g.L + Math.sin(i * 1.7 + t / 80) * 2, (i / 4 - 0.5) * g.W, 31 * rise);
          stamp('wave-curl', ['.4444.', '445554', '45..44', '.4...4', '.....4'], WATER, C);
        }
      } else if (e < 600) {
        for (let i = 0; i < 4; i++) {
          const C = along(g, ((i + 0.5) / 4) * g.L);
          ring(C, 5 + (e - 190) / 60, 3, WATER, e < 360 ? 4 : 2, e > 420 ? 5 : 0);
        }
      }
    },
    air(s) {
      for (const [i, hit] of s.hits.entries()) {
        const C = k.P(subject(s, hit));
        impact(s, hit, C, WATER, 40, 10, i);
        sparks(s, C, s.real(hit) - 90, WATER, 8, 26);
      }
    },
    flash: (event, e) => (e < 35 ? { color: WATER[4], alpha: 0.12 } : null),
  });
})(typeof window !== 'undefined' ? window : globalThis);
