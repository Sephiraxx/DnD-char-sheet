/* Pixel spells, batch 17: revealing sight, protective bonds, planar magic and radiant steel. */
(function (root) {
  'use strict';
  const FX = root.BoardPixelFX;
  if (!FX) return;
  const k = FX.kit;
  const GOLD = ['#26182b', '#70513e', '#b68a42', '#edc76c', '#fff2bf', '#ffffff'];
  const SILVER = ['#152031', '#3b5269', '#789ba9', '#b7dce0', '#eafff5', '#ffffff'];
  const WIND = ['#172730', '#3a5862', '#7196a3', '#b7d9de', '#e7faf3', '#ffffff'];
  const NIGHT = ['#111321', '#303342', '#626578', '#b5b9c4', '#ece7cf', '#ffffff'];
  const AMBER = ['#282017', '#70542b', '#b28e39', '#e8c95a', '#fff3ba', '#ffffff'];
  const WARP = ['#190e30', '#49306c', '#8055ae', '#bd8eea', '#e9d6ff', '#ffffff'];
  const SPEED = ['#13213c', '#315b91', '#54a1c8', '#99e8e4', '#eaffcf', '#ffffff'];
  const ROT = ['#181326', '#3e2a54', '#686045', '#98b873', '#dceab3', '#ffffff'];
  const BONE = ['#231d29', '#5e514f', '#a0937d', '#d7cbb0', '#fff4d8', '#ffffff'];
  const MIND = ['#2b102a', '#6c2358', '#b63a7e', '#f079b7', '#ffd4ea', '#ffffff'];
  const HEAL = ['#10271e', '#286946', '#58b77c', '#acf0a2', '#f3ffd0', '#ffffff'];
  const WATER = ['#12283d', '#285d85', '#409cc0', '#90deea', '#dcffff', '#ffffff'];
  const FIRE = ['#2b1114', '#7c261a', '#c74a20', '#f78a2d', '#ffdb83', '#ffffff'];
  const FROST = ['#11253b', '#285786', '#50a0cf', '#a5e2fb', '#edffff', '#ffffff'];
  const ACID = ['#202411', '#536b1b', '#91b832', '#d3ee68', '#f7ffc2', '#ffffff'];
  const LIGHTNING = ['#19173a', '#474599', '#8189e5', '#b7d9ff', '#efffff', '#ffffff'];
  const THUNDER = ['#202335', '#465674', '#8099b3', '#bfd4e8', '#f1f8ff', '#ffffff'];

  function pixel(x, y, ramp, index = 3, size = 1) {
    k.dot(x, y, ramp[0], size + 2);
    k.dot(x, y, ramp[index], size);
  }
  function stroke(A, B, ramp, index = 3, width = 1, cap = 28) {
    const length = Math.hypot(B.x - A.x, B.y - A.y);
    const n = Math.max(1, Math.min(cap, Math.ceil(length / 2)));
    const w = Math.max(width, Math.ceil(length / n));
    for (const [color, size] of [
      [ramp[0], w + 2],
      [ramp[index], w],
    ])
      for (let i = 0; i <= n; i++) k.dot(k.mix(A.x, B.x, i / n), k.mix(A.y, B.y, i / n), color, size);
  }
  function ring(C, rx, ry, ramp, index = 3, gaps = 0, phase = 0) {
    rx = Math.max(1, Math.round(rx));
    ry = Math.max(1, Math.round(ry));
    const f = ((Math.floor(phase) % 8) + 8) % 8;
    const img = k.sprite(`17:ring:${ramp[0]}:${rx}:${ry}:${index}:${gaps}:${f}`, rx * 2 + 6, ry * 2 + 6, ramp, set => {
      const n = Math.ceil(k.tau * Math.max(rx, ry) * 1.5);
      for (let i = 0; i < n; i++) {
        if (gaps && (Math.floor((i / n) * gaps) + f) % 3 === 0) continue;
        const a = (i / n) * k.tau;
        set(rx + 3 + Math.cos(a) * rx, ry + 3 + Math.sin(a) * ry, index);
      }
    });
    k.blit(img, C.x - rx - 3, C.y - ry - 3);
  }
  function stamp(key, rows, ramp, C) {
    const img = k.sprite(
      `17:${key}:${ramp[0]}`,
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
    k.blit(img, C.x - img.width / 2, C.y - img.height / 2);
  }
  const EYE = [
    '....33333....',
    '..334444433..',
    '.34443234443.',
    '3444332334443',
    '.34443234443.',
    '..334444433..',
    '....33333....',
  ];
  const SHIELD = [
    '.3333333.',
    '344444443',
    '344434443',
    '344434443',
    '.3443443.',
    '..34443..',
    '...343...',
    '....3....',
  ];
  const KEY = ['.333.......', '34443......', '34343333333', '34443...3.3', '.333....3.3'];
  const BOOT = ['..333...', '..343...', '..343...', '..34433.', '.3444443', '.2222222'];
  const DROP = ['...3...', '..343..', '..343..', '.34443.', '3445443', '.34443.', '..333..'];
  const CROSS = ['..333..', '..343..', '3344433', '3445443', '3344433', '..343..', '..333..'];
  const SCALES = [
    '.....3.....',
    '....343....',
    '.333343333.',
    '..3..3..3..',
    '.3.3.3.3.3.',
    '34443334443',
    '.333.3.333.',
    '.....3.....',
    '...33333...',
  ];
  const SPEECH = ['.3333333.', '344444443', '344333443', '344444443', '.3333433.', '....33...', '....3....'];
  const BLADE = [
    '....4....',
    '...454...',
    '...454...',
    '...454...',
    '...454...',
    '...454...',
    '...343...',
    '.3344433.',
    '...232...',
    '...232...',
    '...333...',
  ];
  const RAGE = ['33.....33', '.34...43.', '..34.43..', '...3.3...', '.........', '..33333..', '.34...43.'];

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
  function beats(event, kit, travel, kind = 'soft', stop = 60) {
    return (event.targets?.length ? event.targets : [null]).map(target => ({
      at: kit.CAST + travel,
      stop,
      target,
      kind,
      power: kind === 'soft' ? 0 : 0.065,
    }));
  }
  function impact(s, hit, C, ramp, size = 22, n = 5, salt = 0) {
    const e = s.real(hit);
    k.drawHit(
      k.hitStyle(`17:${s.event.id}:${ramp[0]}:${salt}`, ramp, { S: size, spikes: 4, minor: 4, jag: 0.2 }),
      C,
      e,
    );
    k.shards(C, e, ramp, (s.event.seed || 0) + salt * 29, n, size * 0.55);
  }
  function deliver(s, C, ramp) {
    const hit = s.hits[0];
    if (!s.pose.hand || s.c.t < k.CAST || s.c.t >= hit.at) return;
    const H = k.P(s.pose.hand),
      q = (s.c.t - k.CAST) / Math.max(1, hit.at - k.CAST);
    for (let j = 5; j >= 0; j--) {
      const u = q - j * 0.055;
      if (u < 0) continue;
      pixel(k.mix(H.x, C.x, u), k.mix(H.y, C.y, u) - Math.sin(u * Math.PI) * 6, ramp, j ? 3 : 5, j ? 1 : 3);
    }
  }
  function seal(s, ramp) {
    const e = s.c.t - s.hits[0].at;
    if (e < 0 || e > 600) return;
    const r = 9 + Math.floor(k.ease(k.clamp(e / 180)) * 5);
    for (const hit of s.hits) ring(feet(subject(s, hit)), r, r * 0.45, ramp, e < 380 ? 3 : 2, e > 430 ? 12 : 0);
  }
  function area(s, fallback) {
    const a = s.area || s.pose.base || subject(s);
    return { C: k.P(a), R: ((s.area?.feet ?? fallback) / (s.grid.feet || 5)) * k.PX };
  }
  function sparks(C, e, ramp, seed, n = 8, radius = 15) {
    if (e < 0 || e >= 650) return;
    const q = e / 650;
    for (let i = 0; i < n; i++) {
      if (q > 0.72 && i % 2) continue;
      const a = k.hash(i, seed, 3) * k.tau;
      pixel(
        C.x + Math.cos(a) * radius * (0.4 + q * 0.6),
        C.y + Math.sin(a) * radius * 0.4 - q * 14,
        ramp,
        i % 3 ? 3 : 4,
      );
    }
  }

  // See Invisibility: a golden third eye opens, scanning through broken violet ethereal contours.
  FX.register('see-invisibility', {
    palette: GOLD,
    travel: 190,
    beats,
    end: (event, travel) => k.CAST + travel + 680,
    ground: s => seal(s, GOLD),
    air(s) {
      const first = k.P(subject(s));
      deliver(s, first, GOLD);
      for (const [i, hit] of s.hits.entries()) {
        const T = k.P(subject(s, hit)),
          e = s.real(hit);
        if (e < 0 || e > 720) continue;
        impact(s, hit, { x: T.x, y: T.y - 7 }, GOLD, 20, 4, i);
        if (e < 600) {
          const y = T.y - 9 + Math.min(3, Math.floor(e / 130));
          stamp('seeing-eye', EYE, GOLD, { x: T.x, y });
          for (let j = 0; j < 2; j++) {
            const x = T.x + (j ? 1 : -1) * 11;
            ring({ x, y: T.y + 2 }, 4, 8, WARP, e < 220 ? 2 : 4, 18, 0);
          }
          const sweep = Math.floor(e / 65) % 8;
          for (let j = -2; j <= 2; j++) pixel(T.x + j * 4, T.y - 6 + sweep * 2, GOLD, 4);
        }
      }
    },
  });

  function windField(s, ending = false) {
    const e = s.c.t - s.hits[0].at;
    if (e < 0) return;
    const { C, R } = area(s, 10);
    const f = Math.floor(s.c.raw / 55) % 8;
    const shrink = ending ? 0.85 + 0.15 * s.linger : 0.72 + 0.28 * k.ease(k.clamp(e / 180));
    ring(C, R * shrink, R * shrink, WIND, 2, 24, f);
    // Cached, open helical ribbons leave the middle and the figures clear.
    const r = Math.round(R * shrink),
      w = r * 2 + 8,
      h = r * 2 + 26;
    const img = k.sprite(`17:wind:${r}:${f}`, w, h, WIND, set => {
      for (let lane = 0; lane < 3; lane++)
        for (let j = 0; j < 120; j++) {
          if ((Math.floor(j / 10) + f + lane) % 4 === 0) continue;
          const a = (j / 120) * k.tau + (f * k.tau) / 8 + lane * 1.8;
          const x = r + 4 + Math.cos(a) * r;
          const y = r + 22 + Math.sin(a) * r - lane * 7 - (j / 120) * 6;
          set(x, y, lane % 2 ? 3 : 4);
        }
    });
    k.blit(img, C.x - r - 4, C.y - r - 22);
    for (let j = 0; j < 8; j++) {
      const a = s.c.raw / 190 + (j / 8) * k.tau;
      const x = C.x + Math.cos(a) * R * 0.9,
        y = C.y + Math.sin(a) * R * 0.9;
      pixel(x, y, j % 2 ? BONE : WIND, j % 2 ? 2 : 4, 2);
      pixel(x - Math.sin(a) * 4, y + Math.cos(a) * 4, WIND, 2);
    }
  }

  // Warding Wind: a ten-foot wall of silver-white helices sweeps grit around the caster.
  FX.register('warding-wind', {
    palette: WIND,
    travel: 70,
    beats: (event, kit, travel) => [{ at: kit.CAST + travel, stop: 65, target: null, kind: 'soft', power: 0 }],
    end: (event, travel) => k.CAST + travel + 920,
    ground(s) {
      if (s.c.t < s.hits[0].at + 920) windField(s);
    },
    air(s) {
      const { C } = area(s, 10);
      impact(s, s.hits[0], C, WIND, 26, 8);
    },
    linger(s) {
      if (s.c.t >= s.hits[0].at + 920) windField(s, true);
    },
    reach: (event, grid) => ({ r: (event.area?.feet || 10) / (grid.feet || 5) + 0.6, up: 1.5 }),
  });

  // Warding Bond: paired platinum rings lock together, linking two silver protective shields.
  FX.register('warding-bond', {
    palette: SILVER,
    travel: 230,
    beats,
    end: (event, travel) => k.CAST + travel + 720,
    ground(s) {
      const e = s.c.t - k.CAST;
      if (e < 0 || e > 950) return;
      const A = feet(s.pose.base || subject(s)),
        B = feet(subject(s));
      for (let j = 0; j < 24; j++) {
        if (e > 740 && j % 3) continue;
        const q = j / 23;
        pixel(
          k.mix(A.x, B.x, q),
          k.mix(A.y, B.y, q) + Math.sin(q * Math.PI) * 5,
          SILVER,
          (j + Math.floor(s.c.raw / 60)) % 7 < 2 ? 4 : 2,
        );
      }
      for (const C of [A, B]) {
        ring({ x: C.x - 3, y: C.y }, 6, 4, SILVER, 3);
        ring({ x: C.x + 3, y: C.y }, 6, 4, SILVER, 4);
      }
    },
    air(s) {
      const hit = s.hits[0],
        T = k.P(subject(s)),
        e = s.real(hit);
      deliver(s, T, SILVER);
      if (e < 0 || e > 760) return;
      const A = k.P(s.pose.hand || s.pose.base || subject(s));
      impact(s, hit, T, SILVER, 22, 6);
      if (e < 610) for (const C of [A, T]) stamp('bond-shield', SHIELD, SILVER, { x: C.x, y: C.y - 10 });
      sparks(T, e, SILVER, s.event.seed || 0, 5, 11);
    },
  });

  // Darkvision: amber slit pupils ignite beneath a grey crescent; monochrome sight bands sweep down.
  FX.register('darkvision', {
    palette: NIGHT,
    travel: 170,
    beats,
    end: (event, travel) => k.CAST + travel + 650,
    ground: s => seal(s, NIGHT),
    air(s) {
      deliver(s, k.P(subject(s)), NIGHT);
      for (const [i, hit] of s.hits.entries()) {
        const T = k.P(subject(s, hit)),
          e = s.real(hit);
        if (e < 0 || e > 710) continue;
        impact(s, hit, { x: T.x, y: T.y - 6 }, NIGHT, 18, 4, i);
        if (e < 560) {
          stamp(
            'night-crescent',
            ['...3333.', '..344...', '.344....', '344.....', '344.....', '.344....', '..344...', '...3333.'],
            NIGHT,
            { x: T.x, y: T.y - 13 },
          );
          for (const side of [-1, 1]) {
            ring({ x: T.x + side * 4, y: T.y - 3 }, 3, 2, AMBER, 4);
            pixel(T.x + side * 4, T.y - 3, NIGHT, 1, 1);
          }
          const y = T.y + Math.floor(e / 70) * 2;
          for (let j = -2; j <= 2; j++) pixel(T.x + j * 4, y, NIGHT, j % 2 ? 2 : 3);
        }
      }
    },
  });

  function warpPoints(s) {
    const t = subject(s),
      jump = s.event.teleport;
    const from = jump?.from || { x: t.baseX ?? t.x, y: t.baseY ?? t.y };
    const to = jump?.to || s.pose.target || s.area || from;
    return [k.P(from), k.P(to)];
  }
  function vortex(C, e, reverse) {
    if (e < 0 || e >= 540) return;
    const q = e / 540,
      r = reverse ? 2 + 13 * Math.sin(q * Math.PI) : 15 * (1 - k.ease(k.clamp(q * 1.5))) + 2;
    ring(C, r, r * 0.45, WARP, 3, 18, e / 55);
    ring({ x: C.x, y: C.y - 7 }, r * 0.75, r, WARP, 4, 18, -e / 55);
    for (let j = 0; j < 12; j++) {
      const a = (j / 12) * k.tau + (e / 70) * (reverse ? -1 : 1);
      const d = r * (0.3 + (j % 4) / 5);
      pixel(C.x + Math.cos(a) * d, C.y - 7 + Math.sin(a) * d, WARP, j % 3 ? 3 : 5, j % 3 ? 1 : 2);
    }
  }

  // Vortex Warp: violet space spirals inward at the subject, then snaps outward at the destination.
  FX.register('vortex-warp', {
    palette: WARP,
    travel: 250,
    beats: (event, kit, travel) => [
      { at: kit.CAST + travel, stop: 100, target: event.targets?.[0] ?? null, kind: 'soft', power: 0 },
    ],
    end: (event, travel) => k.CAST + travel + 690,
    ground(s) {
      const [A, B] = warpPoints(s),
        e = s.c.t - k.CAST;
      if (e < 0 || e > 940) return;
      if (e < 360) ring(A, Math.max(2, 16 - Math.floor(e / 24)), 5, WARP, 3, 18, e / 50);
      if (e >= 250 && e < 850)
        ring(B, 3 + Math.floor(k.ease(k.clamp((e - 250) / 210)) * 13), 7, WARP, e < 650 ? 4 : 2, e > 650 ? 18 : 0);
    },
    air(s) {
      const [A, B] = warpPoints(s),
        hit = s.hits[0],
        e = s.real(hit);
      vortex(A, s.c.t - k.CAST, false);
      vortex(B, e, true);
      impact(s, hit, { x: B.x, y: B.y - 7 }, WARP, 30, 9);
    },
  });

  // Warp Sense: concentric divination sweeps resolve into a small planar gate and its key sigil.
  FX.register('warp-sense', {
    palette: WARP,
    travel: 120,
    beats: (event, kit, travel) => [{ at: kit.CAST + travel, stop: 55, target: null, kind: 'soft', power: 0 }],
    end: (event, travel) => k.CAST + travel + 830,
    ground(s) {
      const e = s.c.t - k.CAST;
      if (e < 0 || e > 950) return;
      const C = feet(s.pose.base || subject(s));
      for (let j = 0; j < 2; j++) {
        const q = ((e + j * 220) % 500) / 500;
        if (e > 720 && j === 1) continue;
        ring(C, 6 + Math.floor(q * 15), 3 + Math.floor(q * 8), WARP, q < 0.5 ? 3 : 2, 24, e / 70);
      }
    },
    air(s) {
      const C = k.P(s.pose.hand || s.pose.base || subject(s)),
        hit = s.hits[0],
        e = s.real(hit);
      if (e < 0 || e > 880) return;
      impact(s, hit, C, WARP, 20, 5);
      const G = { x: C.x, y: C.y - 10 };
      if (e < 680) {
        ring(G, 6, 10, WARP, 3, e < 180 ? 18 : 0, 0);
        ring(G, 3, 7, GOLD, 3, 18, 0);
        stamp('planar-key', KEY, GOLD, { x: G.x + 10, y: G.y + 6 });
        for (let i = 0; i < 4; i++) {
          const a = (i * Math.PI) / 2 + (Math.floor(s.c.raw / 110) * Math.PI) / 4;
          pixel(G.x + Math.cos(a) * 11, G.y + Math.sin(a) * 13, WARP, 4);
        }
      }
    },
  });

  function truthField(s, persistent = false) {
    const e = s.c.t - s.hits[0].at;
    if (e < 0) return;
    const { C, R } = area(s, 15);
    const q = persistent ? 1 : k.ease(k.clamp(e / 200));
    ring(C, R * (0.35 + q * 0.65), R * (0.35 + q * 0.65), GOLD, 3);
    ring(C, R - 5, R - 5, GOLD, 2, 24, 0);
    stamp('truth-scales', SCALES, GOLD, C);
    for (let i = 0; i < 8; i++) {
      if (persistent && s.linger < 0.5 && i % 2) continue;
      const a = (i / 8) * k.tau,
        x = C.x + Math.cos(a) * (R - 2),
        y = C.y + Math.sin(a) * (R - 2);
      pixel(x, y, GOLD, (i + Math.floor(s.c.raw / 140)) % 4 ? 3 : 4, 2);
    }
  }

  // Zone of Truth: a fifteen-foot gold oath seal opens around balanced scales and clear speech runes.
  FX.register('zone-of-truth', {
    palette: GOLD,
    travel: 240,
    beats,
    end: (event, travel) => k.CAST + travel + 880,
    ground(s) {
      if (s.c.t >= s.hits[0].at + 880) return;
      truthField(s);
    },
    air(s) {
      const { C, R } = area(s, 15);
      deliver(s, C, GOLD);
      impact(s, s.hits[0], C, GOLD, 30, 8);
      for (const hit of s.hits) {
        const t = subject(s, hit),
          T = k.P(t),
          e = s.real(hit);
        if (Math.hypot(T.x - C.x, T.y - C.y) > R || e < 80 || e > 640) continue;
        stamp('truth-speech', SPEECH, GOLD, { x: T.x, y: T.y - 13 });
      }
    },
    linger(s) {
      if (s.c.t >= s.hits[0].at + 880) truthField(s, true);
    },
    reach: (event, grid) => ({ r: (event.area?.feet || 15) / (grid.feet || 5) + 0.6, up: 1 }),
  });

  // Haste: a turquoise clock spins faster, then bursts into doubled boot prints and sharp speed chevrons.
  FX.register('haste', {
    palette: SPEED,
    travel: 180,
    beats,
    end: (event, travel) => k.CAST + travel + 720,
    ground(s) {
      seal(s, SPEED);
      const e = s.c.t - s.hits[0].at;
      if (e < 60 || e > 700) return;
      for (const hit of s.hits) {
        const C = feet(subject(s, hit));
        for (let i = 0; i < 3; i++) {
          const x = C.x - 12 + i * 7 + (Math.floor(e / 65) % 3);
          stamp('haste-boot', BOOT, SPEED, { x, y: C.y + (i % 2 ? 3 : -2) });
        }
      }
    },
    air(s) {
      deliver(s, k.P(subject(s)), SPEED);
      for (const [i, hit] of s.hits.entries()) {
        const T = k.P(subject(s, hit)),
          e = s.real(hit);
        if (e < 0 || e > 770) continue;
        impact(s, hit, T, SPEED, 24, 7, i);
        const C = { x: T.x, y: T.y - 10 };
        if (e < 360) {
          ring(C, 8, 8, SPEED, 4);
          const a = (Math.floor(e / 55 + (e * e) / 14000) * Math.PI) / 4;
          stroke(C, { x: C.x + Math.cos(a) * 5, y: C.y + Math.sin(a) * 5 }, SPEED, 5, 1, 6);
          stroke(C, { x: C.x, y: C.y - 3 }, SPEED, 3, 1, 3);
        } else if (e < 650) {
          const run = Math.floor((e - 360) / 40) % 4;
          for (let j = 0; j < 3; j++) {
            const x = T.x - 14 + j * 8 + run * 2,
              y = T.y - 5 + (j % 2) * 5;
            stamp('speed-chevron', ['3..', '.4.', '..5', '.4.', '3..'], SPEED, { x, y });
          }
        }
      }
    },
  });

  function skeleton(C, phase) {
    const rows = [
      '...34443...',
      '...41414...',
      '...34443...',
      '....333....',
      '..3343433..',
      '.3.34443.3.',
      '.3.34343.3.',
      '3..34443..3',
      '....333....',
      '....343....',
      '...33.33...',
      '...3...3...',
      '..33...33..',
    ];
    const img = k.sprite(`17:skeleton:${phase}`, 15, 18, BONE, set => {
      const rise = [4, 8, 13][phase];
      rows.forEach((row, y) =>
        [...row].forEach((v, x) => {
          if (v !== '.' && y < rise) set(x + 2, y + 2 + 13 - rise, +v);
        }),
      );
    });
    k.blit(img, C.x - 7, C.y - 17);
  }

  // Animate Dead: green-violet grave magic pulls ivory bones upright, ending in an alert skeleton.
  FX.register('animate-dead', {
    palette: ROT,
    travel: 260,
    beats: (event, kit, travel) => beats(event, kit, travel, 'soft', 90),
    end: (event, travel) => k.CAST + travel + 1080,
    ground(s) {
      const e = s.c.t - k.CAST;
      if (e < 0 || e > 1340) return;
      for (const hit of s.hits) {
        const C = feet(subject(s, hit));
        ring(C, 13, 7, ROT, e < 900 ? 3 : 2, e > 1030 ? 18 : 0, 0);
        for (let j = 0; j < 4; j++) {
          const a = (j * Math.PI) / 2;
          stroke(
            { x: C.x + Math.cos(a) * 5, y: C.y + Math.sin(a) * 3 },
            { x: C.x + Math.cos(a) * 11, y: C.y + Math.sin(a) * 6 },
            ROT,
            2,
            1,
            5,
          );
        }
      }
    },
    air(s) {
      deliver(s, feet(subject(s)), ROT);
      for (const [i, hit] of s.hits.entries()) {
        const C = feet(subject(s, hit)),
          e = s.real(hit);
        if (e < 0 || e > 1170) continue;
        impact(s, hit, C, ROT, 26, 8, i);
        if (e < 720) {
          const q = e / 720;
          for (let j = 0; j < 6; j++) {
            const a = (j / 6) * k.tau + q * 3;
            pixel(C.x + Math.cos(a) * (12 - q * 7), C.y - q * 15 + Math.sin(a) * 5, ROT, j % 2 ? 3 : 4, 2);
          }
        }
        if (e >= 90 && e < 1040) {
          skeleton(C, e < 240 ? 0 : e < 430 ? 1 : 2);
          if (e >= 430) for (const side of [-1, 1]) pixel(C.x + side * 2, C.y - 14, ROT, 3);
        }
      }
    },
  });

  // Antagonize: spiteful pink whispers coil into the victim's head and crack into an angry psychic crown.
  FX.register('antagonize', {
    palette: MIND,
    travel: 210,
    beats: (event, kit, travel) => [
      { at: kit.CAST + travel, stop: 115, target: event.targets?.[0] ?? null, kind: 'hit', power: 0.065 },
    ],
    end: (event, travel) => k.CAST + travel + 620,
    air(s) {
      const hit = s.hits[0],
        T = k.P(subject(s)),
        H = k.P(s.pose.hand || subject(s)),
        e = s.real(hit);
      const q = k.clamp((s.c.t - k.CAST) / 210);
      if (s.c.t >= k.CAST && s.c.t < hit.at)
        for (let i = 0; i < 14; i++) {
          const u = q - i * 0.035;
          if (u < 0) continue;
          pixel(
            k.mix(H.x, T.x, u),
            k.mix(H.y, T.y - 7, u) + Math.sin(u * Math.PI * 5) * 3,
            MIND,
            i < 3 ? 4 : 2,
            i < 3 ? 2 : 1,
          );
        }
      impact(s, hit, { x: T.x, y: T.y - 5 }, MIND, 36, 11);
      if (e >= 60 && e < 590) {
        stamp('antagonize-rage', RAGE, MIND, { x: T.x, y: T.y - 11 });
        for (let j = 0; j < 3; j++) {
          const a = Math.PI + (j * Math.PI) / 2 + Math.floor(e / 75) * 0.1;
          const A = { x: T.x + Math.cos(a) * 9, y: T.y - 6 + Math.sin(a) * 9 };
          const B = { x: A.x + Math.cos(a) * 5, y: A.y + Math.sin(a) * 5 };
          stroke(A, B, MIND, 3, 1, 5);
        }
      }
    },
  });

  function weaponElement(event) {
    const name = String(event.element || '').toLowerCase();
    if (name === 'frost' || name === 'cold' || name === 'frío' || name === 'frio') return FROST;
    if (name === 'lightning' || name === 'relámpago' || name === 'relampago') return LIGHTNING;
    if (name === 'ácido' || name === 'acido' || name === 'acid') return ACID;
    if (name === 'trueno' || name === 'thunder') return THUNDER;
    return FIRE;
  }

  // Elemental Weapon: a silver blade is enchanted with one chosen element, never a mixed rainbow.
  FX.register('elemental-weapon', {
    palette: weaponElement,
    travel: 200,
    beats,
    end: (event, travel) => k.CAST + travel + 720,
    ground(s) {
      seal(s, s.ramp);
    },
    air(s) {
      const ramp = s.ramp;
      deliver(s, k.P(subject(s)), ramp);
      for (const [i, hit] of s.hits.entries()) {
        const T = k.P(subject(s, hit)),
          C = { x: T.x + 8, y: T.y - 2 },
          e = s.real(hit);
        if (e < 0 || e > 780) continue;
        impact(s, hit, C, ramp, 24, 7, i);
        if (e > 640) continue;
        stamp('elemental-blade', BLADE, SILVER, C);
        const f = Math.floor(s.c.raw / 70) % 4;
        for (let j = 0; j < 4; j++) {
          const x = C.x + (j % 2 ? 1 : -1) * 5,
            y = C.y + 3 - j * 3;
          if (ramp === FIRE) stamp('weapon-flame', ['..3.', '.343', '3453', '.33.'], ramp, { x, y: y - f });
          else if (ramp === FROST) stamp('weapon-ice', ['..3..', '.343.', '34543', '.343.', '..3..'], ramp, { x, y });
          else if (ramp === LIGHTNING)
            stamp('weapon-bolt', ['..34', '.34.', '345.', '..43', '.43.', '43..'], ramp, { x: x + (f % 2), y });
          else if (ramp === ACID) stamp('weapon-acid', DROP, ramp, { x, y: y + f });
          else ring({ x, y }, 3 + f, 2, ramp, 3, 12, f);
        }
        pixel(C.x, C.y - 4, ramp, 5, 2);
      }
    },
  });

  function vitality(s, persistent = false) {
    const e = s.c.t - s.hits[0].at;
    if (e < 0) return;
    const { C, R } = area(s, 30);
    const q = persistent ? 1 : k.ease(k.clamp(e / 240));
    ring(C, R * (0.25 + q * 0.75), R * (0.25 + q * 0.75), HEAL, 3, 48, 0);
    ring(C, R - 5, R - 5, HEAL, 2, 48, 0);
    const f = Math.floor(s.c.raw / 120) % 8;
    for (let j = 0; j < 8; j++) {
      if (persistent && s.linger < 0.5 && j % 2) continue;
      const a = (j / 8) * k.tau;
      const C2 = { x: C.x + Math.cos(a) * R * 0.9, y: C.y + Math.sin(a) * R * 0.9 };
      stamp('vitality-cross', CROSS, HEAL, { x: C2.x, y: C2.y - ((j + f) % 4) });
    }
    stamp('vitality-heart', ['.33.33.', '3443443', '3445443', '.34443.', '..343..', '...3...'], HEAL, C);
  }

  // Aura of Vitality: a thirty-foot emerald sanctuary breathes with rising healing crosses and a warm heart.
  FX.register('aura-of-vitality', {
    palette: HEAL,
    travel: 90,
    beats: (event, kit, travel) => [{ at: kit.CAST + travel, stop: 70, target: null, kind: 'soft', power: 0 }],
    end: (event, travel) => k.CAST + travel + 980,
    ground(s) {
      if (s.c.t < s.hits[0].at + 980) vitality(s);
    },
    air(s) {
      const { C } = area(s, 30),
        e = s.real(s.hits[0]);
      impact(s, s.hits[0], C, HEAL, 28, 8);
      sparks({ x: C.x, y: C.y - 5 }, e, HEAL, s.event.seed || 0, 8, 17);
    },
    linger(s) {
      if (s.c.t >= s.hits[0].at + 980) vitality(s, true);
    },
    reach: (event, grid) => ({ r: (event.area?.feet || 30) / (grid.feet || 5) + 0.7, up: 1 }),
  });

  // Water Walk: pale blue soles settle on firm ripples, leaving dry boot prints above beaded water.
  FX.register('water-walk', {
    palette: WATER,
    travel: 200,
    beats,
    end: (event, travel) => k.CAST + travel + 740,
    ground(s) {
      const e = s.c.t - s.hits[0].at;
      if (e < 0 || e > 740) return;
      for (const hit of s.hits) {
        const C = feet(subject(s, hit));
        for (let j = 0; j < 2; j++) {
          const x = C.x + (j ? 4 : -4),
            y = C.y + (j ? -2 : 1);
          ring({ x, y }, 7 + Math.floor(k.ease(k.clamp(e / 260)) * 5), 3 + j, WATER, e < 420 ? 3 : 2, e > 520 ? 18 : 0);
          if (e < 620) stamp('water-sole', ['.333.', '34443', '34443', '.343.', '.343.', '.333.'], WATER, { x, y });
        }
      }
    },
    air(s) {
      deliver(s, feet(subject(s)), WATER);
      for (const [i, hit] of s.hits.entries()) {
        const C = feet(subject(s, hit)),
          e = s.real(hit);
        if (e < 0 || e > 800) continue;
        impact(s, hit, C, WATER, 22, 6, i);
        if (e < 480) {
          for (let j = 0; j < 4; j++) {
            const q = e / 480,
              side = j % 2 ? 1 : -1;
            const x = C.x + side * (8 + q * 7),
              y = C.y - Math.sin(q * Math.PI) * (7 + j * 2) + q * 3;
            pixel(x, y, WATER, j % 2 ? 3 : 4, 2);
          }
          stamp('dry-boot', BOOT, SILVER, { x: C.x, y: C.y - 6 });
        }
      }
    },
  });

  // Blinding Smite: a white-gold melee crescent detonates on contact, leaving a sunburst across the eyes.
  FX.register('blinding-smite', {
    palette: GOLD,
    travel: 130,
    beats: (event, kit, travel) => [
      { at: kit.CAST + travel, stop: 165, target: event.targets?.[0] ?? null, kind: 'hit', power: 0.085 },
    ],
    end: (event, travel) => k.CAST + travel + 690,
    flash: (event, e) =>
      e < 35 ? { color: '#fff4d1', alpha: 0.25 } : e < 75 ? { color: '#251426', alpha: 0.15 } : null,
    ground(s) {
      const hit = s.hits[0],
        e = s.real(hit);
      if (e < 0 || e > 400) return;
      const C = feet(subject(s));
      ring(
        C,
        6 + Math.floor(k.ease(e / 400) * 14),
        3 + Math.floor(k.ease(e / 400) * 6),
        GOLD,
        e < 140 ? 4 : 2,
        e > 220 ? 18 : 0,
      );
    },
    air(s) {
      const hit = s.hits[0],
        t = subject(s),
        T = k.P(k.contact(t, s.pose.hand || t)),
        e = s.real(hit);
      const q = (s.c.t - k.CAST) / 130;
      // The blade sweeps locally around contact; it never flies from the caster like a missile.
      if (q >= 0 && q < 1) {
        for (let j = 0; j < 10; j++) {
          const u = q - j * 0.035;
          if (u < 0) continue;
          const a = -2.5 + u * 3.2;
          pixel(T.x + Math.cos(a) * 13, T.y + Math.sin(a) * 12, GOLD, j < 3 ? 5 : 3, j < 3 ? 3 : 1);
        }
        stamp('smite-blade', BLADE, GOLD, {
          x: T.x + Math.cos(-2.5 + q * 3.2) * 11,
          y: T.y + Math.sin(-2.5 + q * 3.2) * 11,
        });
      }
      impact(s, hit, T, GOLD, 42, 13);
      if (e >= 90 && e < 650) {
        const C = { x: T.x, y: T.y - 8 };
        stamp('blind-eyes', ['3..3..3..3', '.34444443.', '..455554..', '.34444443.', '3..3..3..3'], GOLD, C);
        if (e < 400)
          for (let j = 0; j < 8; j++) {
            const a = (j / 8) * k.tau;
            const r = 10 + e / 70;
            pixel(C.x + Math.cos(a) * r, C.y + Math.sin(a) * r * 0.65, GOLD, j % 2 ? 3 : 4, 2);
          }
      }
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
