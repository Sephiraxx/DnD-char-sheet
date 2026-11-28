/* Pixel spells, batch 15: lasting enchantments, nature signs, steel, earth and restoration. */
(function (root) {
  'use strict';
  const FX = root.BoardPixelFX;
  if (!FX) return;
  const k = FX.kit;
  const FIRE = ['#290e12', '#7a2419', '#d84c22', '#ff962f', '#ffe697', '#ffffff'];
  const GOLD = ['#291c12', '#765020', '#c18b35', '#f4cd69', '#fff2b8', '#ffffff'];
  const GREEN = ['#102318', '#295b36', '#56944b', '#a2d778', '#e2f5b8', '#ffffff'];
  const HEAL = ['#10271d', '#246449', '#4fbd87', '#adf1b3', '#f4ffd6', '#ffffff'];
  const ROT = ['#150d20', '#382339', '#69445f', '#a476aa', '#dbc6e7', '#ffffff'];
  const STEEL = ['#151923', '#354153', '#7892a8', '#c1dce9', '#f1faff', '#ffffff'];
  const ARCANE = ['#1a1334', '#483578', '#8b66bd', '#c5a9f0', '#f3e5ff', '#ffffff'];
  const SHADOW = ['#0c101b', '#202b38', '#3f5157', '#758d84', '#b9d3b1', '#ffffff'];
  const CYAN = ['#102535', '#2c587c', '#519ac0', '#93e0ea', '#d9fffa', '#ffffff'];
  const BARK = ['#241a10', '#50331d', '#87562e', '#b78546', '#e1bc7b', '#ffffff'];
  const EARTH = ['#251b18', '#59402f', '#967052', '#c39b70', '#e6d0a0', '#ffffff'];
  const SMOKE = ['#15151e', '#33323f', '#585666', '#888394', '#c4beca', '#ffffff'];
  const PINK = ['#2a172b', '#703a60', '#b2678a', '#ecabc5', '#ffe3e6', '#ffffff'];

  function pixel(x, y, ramp, index = 3, size = 1) {
    k.dot(x, y, ramp[0], size + 2);
    k.dot(x, y, ramp[index], size);
  }
  function line(A, B, ramp, index = 3, size = 1) {
    const n = Math.max(1, Math.min(48, Math.ceil(Math.hypot(B.x - A.x, B.y - A.y) / 2)));
    for (const [color, width] of [
      [ramp[0], size + 2],
      [ramp[index], size],
    ])
      for (let j = 0; j <= n; j++) k.dot(k.mix(A.x, B.x, j / n), k.mix(A.y, B.y, j / n), color, width);
  }
  // Cached rings keep large search radii cheap. Broken edges end in discrete pieces.
  function ring(C, rx, ry, ramp, index = 3, broken = false, phase = 0) {
    rx = Math.max(2, Math.round(rx));
    ry = Math.max(2, Math.round(ry));
    const f = ((Math.floor(phase) % 8) + 8) % 8;
    const img = k.sprite(
      `15:ring:${ramp[0]}:${rx}:${ry}:${index}:${broken}:${f}`,
      rx * 2 + 6,
      ry * 2 + 6,
      ramp,
      set => {
        const n = Math.ceil(k.tau * Math.max(rx, ry) * 1.5);
        for (let i = 0; i < n; i++) {
          if (broken && (Math.floor((i / n) * 24) + f) % 3 === 0) continue;
          const a = (i / n) * k.tau;
          set(rx + 3 + Math.cos(a) * rx, ry + 3 + Math.sin(a) * ry, index);
        }
      },
    );
    k.blit(img, C.x - rx - 3, C.y - ry - 3);
  }
  function image(key, rows, ramp) {
    return k.sprite(
      `15:${key}:${ramp[0]}`,
      Math.max(...rows.map(row => row.length)) + 2,
      rows.length + 2,
      ramp,
      set => {
        rows.forEach((row, y) =>
          [...row].forEach((v, x) => {
            if (v !== '.') set(x + 1, y + 1, +v);
          }),
        );
      },
    );
  }
  function stamp(key, rows, ramp, C) {
    const img = image(key, rows, ramp);
    k.blit(img, C.x - img.width / 2, C.y - img.height / 2);
  }
  function subject(s, hit = s.hits[0]) {
    return (
      s.targets.find(t => t.id === hit?.id) ||
      s.targets[0] ||
      s.pose.target ||
      s.pose.base ||
      s.pose.hand || { x: 0, y: 0 }
    );
  }
  function feet(t) {
    return k.P({ x: t.baseX ?? t.x, y: t.baseY ?? t.y });
  }
  function aim(s) {
    return k.P(s.area || s.pose.target || subject(s));
  }
  function beats(event, kit, travel, kind = 'soft', stop = 60) {
    return (event.targets?.length ? event.targets : [null]).map(target => ({
      at: kit.CAST + travel,
      stop,
      target,
      kind,
      power: kind === 'soft' ? 0 : 0.07,
    }));
  }
  function impact(s, hit, C, ramp, size = 22, n = 5, salt = 0) {
    const e = s.real(hit);
    k.drawHit(k.hitStyle(`15:${s.event.id}:${salt}`, ramp, { S: size, spikes: 5, jag: 0.25 }), C, e);
    k.shards(C, e, ramp, (s.event.seed || 0) + salt * 29, n, size * 0.65);
  }
  function mote(s, T, ramp) {
    const hit = s.hits[0];
    if (!s.pose.hand || s.c.t < k.CAST || s.c.t >= hit.at) return;
    const H = k.P(s.pose.hand),
      q = (s.c.t - k.CAST) / Math.max(1, hit.at - k.CAST);
    for (let i = 5; i >= 0; i--) {
      const u = q - i * 0.06;
      if (u >= 0) pixel(k.mix(H.x, T.x, u), k.mix(H.y, T.y, u) - Math.sin(u * Math.PI) * 6, ramp, i ? 3 : 5, i ? 1 : 3);
    }
  }
  function spark(C, ramp, size = 3) {
    line({ x: C.x - size, y: C.y }, { x: C.x + size, y: C.y }, ramp, 4);
    line({ x: C.x, y: C.y - size }, { x: C.x, y: C.y + size }, ramp, 5);
  }
  const LEAF = ['.......3.', '.....334.', '...33443.', '..34443..', '.34443...', '.3443....', '..33.....', '.3.......'];
  const PAW = ['.33...33.', '3443.3443', '.33...33.', '...333...', '..34443..', '.3444443.', '.3444443.', '..33.33..'];
  const KEY = [
    '..333....',
    '.34443...',
    '.34.43...',
    '.34443...',
    '..333....',
    '...3.....',
    '...333...',
    '...3.....',
    '...333...',
  ];
  const FLAME = [
    '.....4.....',
    '.....44....',
    '....344....',
    '....3543...',
    '..3.3553...',
    '..3335543..',
    '.23345543..',
    '.23455543..',
    '.23455432..',
    '..234432...',
    '...2222....',
  ];
  const BOOT = ['...333...', '...343...', '...343...', '...343...', '...34433.', '..3444433', '..2222222'];
  const DAGGER = [
    '....5....',
    '...454...',
    '...454...',
    '...354...',
    '...354...',
    '...234...',
    '..33333..',
    '....2....',
    '....3....',
    '....2....',
  ];

  function areaRadius(s, fallback = 10) {
    return ((s.area?.feet || fallback) / (s.grid.feet || 5)) * k.PX;
  }
  // Cube corners follow the board's start-and-direction convention, not a centre square.
  function cube(s) {
    const points = s.area ? k.outline(s.area, s.grid) : [];
    if (points.length === 4) return points.map(p => k.P(Array.isArray(p) ? { x: p[0], y: p[1] } : p));
    const C = aim(s),
      r = areaRadius(s, 5) / 2;
    return [
      { x: C.x - r, y: C.y - r },
      { x: C.x + r, y: C.y - r },
      { x: C.x + r, y: C.y + r },
      { x: C.x - r, y: C.y + r },
    ];
  }
  function cubePoint(points, u, v) {
    return {
      x: points[0].x + (points[1].x - points[0].x) * u + (points[3].x - points[0].x) * v,
      y: points[0].y + (points[1].y - points[0].y) * u + (points[3].y - points[0].y) * v,
    };
  }
  function daggerCloud(s, linger = false) {
    const e = s.c.t - s.hits[0].at;
    if (!linger && (e < 0 || e > 980)) return;
    const points = cube(s),
      tick = Math.floor(s.c.t / 65),
      img = image('dagger', DAGGER, STEEL);
    for (let i = 0; i < 7; i++) {
      if (!linger && e > 780 && i < Math.floor((e - 780) / 30)) continue;
      const a = tick * 0.6 + (i * k.tau) / 7;
      const C = cubePoint(points, 0.5 + Math.cos(a) * 0.32, 0.5 + Math.sin(a) * 0.32);
      C.y -= 4 + (i % 3) * 4;
      if (i < 3) pixel(C.x - Math.cos(a) * 4, C.y - Math.sin(a) * 2, STEEL, 2);
      k.blitRotated(img, C.x, C.y, a + Math.PI / 2);
    }
  }

  // Continual Flame: a ruby-lit object sprouts a steady, smokeless amber flame with a white heart.
  FX.register('continual-flame', {
    palette: FIRE,
    travel: 180,
    beats: (event, kit, travel) => beats(event, kit, travel),
    end: () => 1450,
    air(s) {
      const C = aim(s),
        e = s.c.t - s.hits[0].at;
      mote(s, C, FIRE);
      impact(s, s.hits[0], C, FIRE, 20, 4);
      if (e < 0 || e > 900) return;
      stamp('ruby', ['.22.', '2442', '.22.'], PINK, { x: C.x, y: C.y + 3 });
      const flick = Math.floor(s.c.t / 120) % 3;
      stamp('continual-flame', FLAME, FIRE, { x: C.x + (flick === 1 ? 1 : 0), y: C.y - 5 });
      if (e < 700) ring({ x: C.x, y: C.y + 4 }, 8, 3, GOLD, 3, true, flick);
    },
  });

  // Locate Animals or Plants: green sensing ripples resolve into a leaf, a paw and a directional trail.
  FX.register('locate-animals-or-plants', {
    palette: GREEN,
    travel: 520,
    beats: (event, kit, travel) => beats(event, kit, travel),
    end: () => 1540,
    ground(s) {
      const t = s.c.t - k.CAST;
      if (t < 0 || t > 1110) return;
      const C = feet(s.pose.base || subject(s));
      for (let i = 0; i < 3; i++) {
        const q = (t - i * 150) / 780;
        if (q < 0 || q > 1) continue;
        ring(C, 9 + q * 23, 5 + q * 14, GREEN, q < 0.6 ? 3 : 2, q > 0.65, i);
      }
    },
    air(s) {
      const hit = s.hits[0],
        e = s.c.t - hit.at,
        T = aim(s);
      if (e < -300 || e > 640) return;
      const B = k.P(s.pose.base || subject(s)),
        dx = T.x - B.x,
        dy = T.y - B.y,
        L = Math.hypot(dx, dy) || 1;
      for (let i = 0; i < 3; i++) {
        const r = 10 + i * 6;
        pixel(B.x + (dx / L) * r, B.y + (dy / L) * r, GREEN, i === Math.floor(s.c.t / 120) % 3 ? 4 : 2, 2);
      }
      if (e < 0) return;
      ring(T, 13, 9, GREEN, 3, true, Math.floor(e / 150));
      stamp('locate-leaf', LEAF, GREEN, { x: T.x - 6, y: T.y - 10 });
      stamp('locate-paw', PAW, GOLD, { x: T.x + 6, y: T.y - 3 });
      impact(s, hit, T, GREEN, 20, 4);
    },
  });

  // Locate Object: a gold compass sweeps, locks toward the object and stamps a key-shaped detection seal.
  FX.register('locate-object', {
    palette: GOLD,
    travel: 430,
    beats: (event, kit, travel) => beats(event, kit, travel),
    end: () => 1440,
    ground(s) {
      const t = s.c.t - k.CAST;
      if (t < 0 || t > 1000) return;
      const C = feet(s.pose.base || subject(s)),
        T = aim(s);
      ring(C, 15, 9, GOLD, 3);
      const locked = Math.atan2(T.y - C.y, T.x - C.x),
        a = t < 430 ? locked + (1 - t / 430) * k.tau : locked;
      const N = { x: C.x + Math.cos(a) * 12, y: C.y + Math.sin(a) * 7 };
      line(C, N, GOLD, 4, 2);
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2;
        pixel(C.x + Math.cos(a) * 17, C.y + Math.sin(a) * 11, GOLD, 4);
      }
    },
    air(s) {
      const hit = s.hits[0],
        e = s.c.t - hit.at,
        C = aim(s);
      if (e < 0 || e > 620) return;
      ring(C, 12, 12, GOLD, 3, e > 400, Math.floor(e / 120));
      stamp('locate-key', KEY, GOLD, C);
      if (e < 340) spark({ x: C.x + 13, y: C.y - 9 }, GOLD, 2);
      impact(s, hit, C, GOLD, 22, 4);
    },
  });

  // Wither and Bloom: a violet necrotic sphere shrivels foliage, then life gathers into a pink-green bloom.
  FX.register('wither-and-bloom', {
    palette: ROT,
    travel: 200,
    beats(event, kit, travel) {
      return [...beats(event, kit, travel, 'hit', 115), { at: 1010, stop: 75, target: null, kind: 'soft', power: 0 }];
    },
    end: () => 1710,
    ground(s) {
      const C = aim(s),
        R = areaRadius(s),
        e = s.c.t - s.hits[0].at;
      if (e < 0 || e > 1120) return;
      if (e < 520) {
        ring(
          C,
          R * (0.65 + k.ease(k.clamp(e / 180)) * 0.35),
          R * (0.65 + k.ease(k.clamp(e / 180)) * 0.35),
          ROT,
          e < 65 ? 4 : 2,
          e > 300,
          Math.floor(e / 90),
        );
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * k.tau,
            r = R * (0.45 + k.hash(i, s.event.seed || 0) * 0.35);
          const P = { x: C.x + Math.cos(a) * r, y: C.y + Math.sin(a) * r };
          stamp(
            'wither-leaf',
            e < 100 ? LEAF : ['.2....', '..2...', '..22..', '.2.22.', '2...2.'],
            e < 100 ? GREEN : ROT,
            P,
          );
        }
      }
      const bloom = s.hits[s.hits.length - 1],
        life = s.c.t - bloom.at;
      if (life < -240) return;
      const B = { x: C.x + R * 0.55, y: C.y + R * 0.55 };
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * k.tau,
          q = k.clamp((life + 240) / 240),
          r = (1 - q) * R * 0.6;
        if (life < 100) pixel(B.x + Math.cos(a) * r, B.y + Math.sin(a) * r * 0.6, HEAL, 3);
      }
      line({ x: B.x, y: B.y + 5 }, { x: B.x, y: B.y - 6 }, GREEN, 3, 2);
      stamp('bloom-leaf', LEAF, GREEN, { x: B.x + 4, y: B.y });
      if (life >= 0)
        stamp(
          'bloom-flower',
          ['..33.33..', '.3443443.', '.3455543.', '..45554..', '.3455543.', '.3443443.', '..33.33..'],
          PINK,
          { x: B.x, y: B.y - 9 },
        );
    },
    air(s) {
      s.hits.slice(0, -1).forEach((hit, i) => impact(s, hit, k.P(subject(s, hit)), ROT, 30, 7, i));
      const C = aim(s),
        R = areaRadius(s),
        hit = s.hits[s.hits.length - 1];
      impact(s, hit, { x: C.x + R * 0.55, y: C.y + R * 0.55 - 9 }, HEAL, 25, 6, 99);
    },
    flash: (event, e) =>
      e < 30 ? { color: '#dcc6ed', alpha: 0.14 } : e < 65 ? { color: '#150d20', alpha: 0.16 } : null,
  });

  // Pyrotechnics: a source flame bursts into red-gold fireworks, followed by a low violet-grey smoke bank.
  FX.register('pyrotechnics', {
    palette: FIRE,
    travel: 220,
    beats: (event, kit, travel) => beats(event, kit, travel, 'soft', 120),
    end: () => 1730,
    reach: (event, grid) => ({ r: (event.area?.feet || 10) / (grid.feet || 5) + 1, up: 2.2 }),
    ground(s) {
      const e = s.c.t - s.hits[0].at,
        C = aim(s),
        R = areaRadius(s);
      if (e < 300 || e > 1160) return;
      const frame = Math.min(7, Math.floor((e - 300) / 110)),
        W = Math.ceil(R * 2 + 12),
        H = Math.ceil(R * 1.2 + 16);
      const img = k.sprite(`15:pyro-smoke:${W}:${H}:${frame}`, W, H, SMOKE, set => {
        for (let y = 2; y < H - 2; y++)
          for (let x = 2; x < W - 2; x++) {
            const dx = (x - W / 2) / (R + 2),
              dy = (y - H / 2) / (R * 0.52 + 3);
            const edge = 1 + Math.cos(x / 5) * 0.1;
            if (dx * dx + dy * dy > edge) continue;
            if (frame > 4) {
              let puff = false;
              for (let i = 0; i < 5; i++) {
                const px = W * (0.15 + i * 0.175),
                  py = H * (i % 2 ? 0.4 : 0.58);
                const radius = Math.max(2, R * (0.29 - (frame - 5) * 0.075));
                if (((x - px) / radius) ** 2 + ((y - py) / (radius * 0.7)) ** 2 < 1) puff = true;
              }
              if (!puff) continue;
            }
            set(x, y, 1 + k.band(0.65 - dy * 0.23 - dx * 0.15, 3, x, y));
          }
      });
      k.blit(img, C.x - W / 2, C.y - H / 2 - Math.min(5, frame));
    },
    air(s) {
      const C = aim(s),
        hit = s.hits[0],
        e = s.real(hit),
        design = s.c.t - hit.at;
      if (s.c.t >= k.CAST && design < 0) stamp('pyro-source', FLAME, FIRE, { x: C.x, y: C.y - 5 });
      impact(s, hit, C, GOLD, 40, 12);
      if (e < 0 || e > 640) return;
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * k.tau + k.hash(i, s.event.seed || 0) * 0.16,
          q = k.clamp(e / 500);
        const r = 5 + k.ease(q) * 29,
          ramp = i % 3 === 0 ? ARCANE : i % 3 === 1 ? FIRE : GOLD;
        const T = { x: C.x + Math.cos(a) * r, y: C.y - 9 + Math.sin(a) * r * 0.8 + q * q * 15 };
        if (e > 460 && i % 2) continue;
        pixel(T.x, T.y, ramp, q < 0.4 ? 5 : 3, 2);
        if (e < 320) pixel(T.x - Math.cos(a) * 4, T.y - Math.sin(a) * 4, ramp, 2);
      }
    },
    flash: (event, e) =>
      e < 32 ? { color: '#fff1c9', alpha: 0.25 } : e < 78 ? { color: '#24172a', alpha: 0.2 } : null,
  });

  const BEASTS = [
    ['.33...33.', '344333443', '344444443', '.3424243.', '.3444443.', '..32223..', '...333...'],
    ['3.......3', '43.....34', '.43...34.', '..33333..', '.3424243.', '..34443..', '...333...'],
    ['33.....33', '343...343', '344333443', '.3444443.', '.3452543.', '..34443..', '...333...'],
    ['.33...33.', '344333443', '345434543', '345434543', '.3434343.', '..34443..', '...333...'],
    ['33.....33', '343...343', '.3433343.', '.3452543.', '..34443..', '...343...', '....3....'],
    ['3.......3', '43.....34', '.4333334.', '..34543..', '333454333', '..34443..', '...333...'],
  ];

  function earthHand(s, linger = false) {
    const C = cubePoint(cube(s), 0.5, 0.5),
      e = s.c.t - (s.hits[0].at - 190);
    if (!linger && (e < 0 || e > 1080)) return;
    // The fingers close on the impact frame, including throughout its hitstop.
    const f = linger
      ? 5
      : e < 190
        ? Math.min(2, Math.floor(e / 65))
        : e < 760
          ? 3 + Math.min(3, Math.floor((e - 190) / 180))
          : 7 + Math.min(1, Math.floor((e - 760) / 160));
    const img = k.sprite(`15:earthen-hand:${f}`, 40, 43, EARTH, set => {
      const rise = f < 2 ? (f + 1) / 2 : 1,
        top = 39 - 33 * rise;
      const closed = f >= 3;
      for (let y = 2; y < 41; y++)
        for (let x = 2; x < 38; x++) {
          const dx = x - 20;
          let inside = y > 27 && y < 40 && Math.abs(dx) < 7 + (y - 27) * 0.25;
          if (closed) {
            inside ||= (dx / 12) ** 2 + ((y - 24) / 10) ** 2 < 1;
            for (let i = 0; i < 4; i++) {
              const fx = 10 + i * 6,
                fy = 13 + [3, 0, 1, 5][i];
              inside ||= (x - fx) ** 2 + (y - fy) ** 2 < 11;
              inside ||= Math.abs(x - fx) <= 2 && y > fy && y < 25;
            }
          } else {
            inside ||= y >= top + 13 && y < 32 && Math.abs(dx) <= 11;
            for (let i = 0; i < 4; i++) {
              const fx = 9 + i * 6,
                fy = top + [4, 0, 2, 7][i];
              inside ||= x >= fx && x <= fx + 4 && y >= fy && y < 28;
            }
          }
          if (!inside) continue;
          if (f >= 7 && y < 8 + (f - 7) * 12 && (Math.floor(x / 5) + Math.floor(y / 4)) % 3 === 0) continue;
          const crack =
            (x === 14 && y > 18 && y < 29) ||
            (x === 23 && y > 11 && y < 24) ||
            (y === 28 && x > 12 && x < 28) ||
            (closed && y === 20 && x > 8 && x < 28);
          const chip = (Math.floor(x / 5) + Math.floor(y / 6)) % 3 === 0;
          set(x, y, crack ? 1 : y % 6 === 2 && chip ? 4 : x < 15 || chip ? 3 : 2);
        }
    });
    k.blit(img, C.x - 20, C.y - 36);
    return C;
  }

  // Maximilian's Earthen Grasp: a massive clay hand punches out of the cube, closes and crushes with stone chips.
  FX.register('maximillians-earthen-grasp', {
    palette: EARTH,
    travel: 250,
    beats: (event, kit, travel) => beats(event, kit, travel, 'hit', 150),
    end: () => 1670,
    reach: (event, grid) => ({ r: (event.area?.feet || 5) / (grid.feet || 5) + 1, up: 2.5 }),
    ground(s) {
      const e = s.c.t - k.CAST;
      if (e < 0 || e > 1210) return;
      const C = cubePoint(cube(s), 0.5, 0.5);
      ring(C, 15, 7, EARTH, 2, true, 2);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * k.tau;
        line(
          { x: C.x + Math.cos(a) * 9, y: C.y + Math.sin(a) * 4 },
          { x: C.x + Math.cos(a) * 19, y: C.y + Math.sin(a) * 9 },
          EARTH,
          1,
        );
      }
      earthHand(s);
    },
    air(s) {
      const hit = s.hits[0],
        e = s.c.t - hit.at;
      const C = cubePoint(cube(s), 0.5, 0.5);
      if (e >= 0 && e < 700) {
        // Only the curled thumb crosses in front of the figure; the palm stays beneath it.
        stamp('earth-thumb', ['..2222..', '.233432.', '2344432.', '234432..', '.2222...'], EARTH, {
          x: C.x + 5,
          y: C.y - 7,
        });
      }
      s.hits.forEach((h, i) =>
        impact(s, h, h.id == null ? { x: C.x, y: C.y - 14 } : k.P(subject(s, h)), EARTH, 34, 9, i),
      );
    },
    linger(s) {
      if (s.linger > 0.25) earthHand(s, true);
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
