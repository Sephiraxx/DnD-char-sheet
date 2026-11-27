/* Pixel spells, batch 18: wards, divinations, fey arrivals and enchanted arrows. */
(function (root) {
  'use strict';
  const FX = root.BoardPixelFX;
  if (!FX) return;
  const k = FX.kit;
  const GOLD = ['#281d22', '#79552b', '#bc8b3d', '#edc76a', '#fff1be', '#ffffff'];
  const SIGHT = ['#171631', '#3b3976', '#7477b8', '#b8d9ef', '#eafaff', '#ffffff'];
  const FEY = ['#10251e', '#285b44', '#5c9c68', '#a8d98a', '#e8f5b9', '#ffffff'];
  const STEEL = ['#171e29', '#425367', '#7b97a9', '#bed5dd', '#f0f4e7', '#ffffff'];
  const GHOST = ['#131c2c', '#344758', '#678592', '#a7c6ce', '#e3f5ed', '#ffffff'];
  const FOOD = ['#302119', '#79502d', '#b78b4c', '#dfbc79', '#f9e6b8', '#ffffff'];
  const WATER = ['#122639', '#255a80', '#4698b9', '#91d9e8', '#def9ff', '#ffffff'];
  const GREEN = ['#152613', '#325c28', '#5e9236', '#9ac65a', '#dbec9a', '#ffffff'];
  const ARCANE = ['#1d1331', '#4c3277', '#8a65b5', '#c9a4e5', '#f3dfff', '#ffffff'];
  const MIND = ['#2b1127', '#702451', '#b34081', '#ed80b7', '#ffcee7', '#ffffff'];
  const DEATH = ['#171622', '#3d394d', '#71667d', '#aca2b3', '#e2ddd6', '#ffffff'];
  const BOLT = ['#11182f', '#2b4794', '#538fd6', '#9fdcff', '#e8fbff', '#ffffff'];
  const FIRE = ['#2b1215', '#7b271e', '#c74c27', '#f48b32', '#ffda83', '#ffffff'];

  function pixel(x, y, ramp, index = 3, size = 1) {
    k.dot(x, y, ramp[0], size + 2);
    k.dot(x, y, ramp[index], size);
  }
  function stroke(A, B, ramp, index = 3, width = 1, cap = 28) {
    const len = Math.hypot(B.x - A.x, B.y - A.y);
    const n = Math.max(1, Math.min(cap, Math.ceil(len / 2)));
    const w = Math.max(width, Math.ceil(len / n));
    for (const [color, size] of [
      [ramp[0], w + 2],
      [ramp[index], w],
    ])
      for (let i = 0; i <= n; i++) k.dot(k.mix(A.x, B.x, i / n), k.mix(A.y, B.y, i / n), color, size);
  }
  function ring(C, rx, ry, ramp, index = 3, gaps = 0) {
    rx = Math.max(1, Math.round(rx));
    ry = Math.max(1, Math.round(ry));
    const img = k.sprite(`18:ring:${ramp[0]}:${rx}:${ry}:${index}:${gaps}`, rx * 2 + 6, ry * 2 + 6, ramp, set => {
      const n = Math.ceil(k.tau * Math.max(rx, ry) * 1.5);
      for (let i = 0; i < n; i++) {
        if (gaps && Math.floor((i / n) * gaps * 2) % 2) continue;
        const a = (i / n) * k.tau;
        set(rx + 3 + Math.cos(a) * rx, ry + 3 + Math.sin(a) * ry, index);
      }
    });
    k.blit(img, C.x - rx - 3, C.y - ry - 3);
  }
  function glyph(key, rows, ramp) {
    return k.sprite(`18:${key}:${ramp[0]}`, Math.max(...rows.map(r => r.length)) + 2, rows.length + 2, ramp, set => {
      rows.forEach((row, y) =>
        [...row].forEach((v, x) => {
          if (v !== '.') set(x + 1, y + 1, +v);
        }),
      );
    });
  }
  function stamp(key, rows, ramp, C) {
    const img = glyph(key, rows, ramp);
    k.blit(img, C.x - img.width / 2, C.y - img.height / 2);
  }
  const EYE = [
    '.....33333.....',
    '...334444433...',
    '.3344432344433.',
    '344443252344443',
    '.3344432344433.',
    '...334444433...',
    '.....33333.....',
  ];
  const EAR = ['..3333..', '.344443.', '34433443', '343..343', '343.3443', '..33443.', '..343...', '..333...'];
  const WOLF = [
    '................3..3...',
    '...............343343..',
    '...............344443..',
    '..3............34445433',
    '.343..33333333334444333',
    '..343344444444444433...',
    '...344444444444443.....',
    '....34444333344443.....',
    '....34443...34443......',
    '....34343...34343......',
    '....343.3...343.3......',
    '...3333.33.3333.33.....',
  ];
  const HORSE = [
    '........................3..3.......',
    '.......................343343......',
    '......................2344443......',
    '.....................223444443.....',
    '....................22344445433....',
    '....................234444444443...',
    '...................223444433333....',
    '.....333333333333..22344443.........',
    '....34444444444443323444443.........',
    '..233444444444444444444443.........',
    '.2233444444444444444444443.........',
    '.23.344444444444444444443..........',
    '23..34444444444444444443...........',
    '3...3444444433333444443............',
    '....34434443.....344343............',
    '....3433443.......34343............',
    '....343.343.......34343............',
    '....343..343......343.43...........',
    '....343..343......343..43..........',
    '...3333..3333....3333..333.........',
  ];
  const LOAF = ['...3333333...', '..344444443..', '.34454454443.', '3445445444443', '3444444444443', '.22222222222.'];
  const JUG = [
    '...33333...',
    '...34443...',
    '..3444443..',
    '.3444444433',
    '34444444433',
    '34444444433',
    '3444444443.',
    '.34444443..',
    '..333333...',
  ];
  const DROP = ['...3...', '..343..', '..343..', '.34443.', '3445443', '.34443.', '..333..'];
  const HEART = ['.333.333.', '344434443', '344444443', '.3444443.', '..34443..', '...343...', '....3....'];
  const SKULL = ['..33333..', '.3444443.', '344444443', '344144143', '.3443443.', '..34343..', '..33333..'];
  const FACE = ['..33333..', '.3444443.', '344144143', '344444443', '.3411143.', '..33333..'];
  const HAND = [
    '....3.3...',
    '..3.4343..',
    '..434343..',
    '..4343433.',
    '..34444443',
    '.334444443',
    '344444443.',
    '.3444443..',
    '..33333...',
  ];
  const LEAF = ['....33', '..3343', '.34443', '34443.', '.333..'];
  const ARROW = ['.........4....', '.........44...', '.33333333544..', '.2.......44...', '.........4....'];
  const QUIVER = [
    '..3.3.3..',
    '..4.4.4..',
    '..3.3.3..',
    '.3333333.',
    '.3444443.',
    '.3444443.',
    '.3444443.',
    '..34443..',
    '..33333..',
  ];

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
  function centre(s) {
    return k.P(s.area || s.pose.target || subject(s));
  }
  function radius(s, fallback) {
    return Math.max(4, Math.round(((s.area?.feet ?? fallback) / (s.grid.feet || 5)) * k.PX));
  }
  function beats(event, kit, travel, kind = 'soft', stop = 70) {
    return (event.targets?.length ? event.targets : [null]).map(target => ({
      at: kit.CAST + travel,
      stop,
      target,
      kind,
      power: kind === 'soft' ? 0 : 0.07,
    }));
  }
  function impact(s, hit, C, ramp, size = 22, count = 5, salt = 0) {
    const e = s.real(hit);
    k.drawHit(
      k.hitStyle(`18:${s.event.id}:${ramp[0]}:${size}`, ramp, { S: size, spikes: 4, minor: 4, jag: 0.25 }),
      C,
      e,
    );
    k.shards(C, e, ramp, (s.event.seed || 0) + salt * 37, count, size * 0.6);
  }
  function deliver(s, C, ramp) {
    const hit = s.hits[0];
    if (!s.pose.hand || s.c.t < k.CAST || s.c.t >= hit.at) return;
    const H = k.P(s.pose.hand),
      q = (s.c.t - k.CAST) / Math.max(1, hit.at - k.CAST);
    for (let j = 5; j >= 0; j--) {
      const u = q - j * 0.06;
      if (u < 0) continue;
      pixel(k.mix(H.x, C.x, u), k.mix(H.y, C.y, u) - Math.sin(u * Math.PI) * 7, ramp, j ? 3 : 5, j ? 1 : 3);
    }
  }
  function seals(s, ramp) {
    const e = s.c.t - s.hits[0].at;
    if (e < 0 || e >= 700) return;
    for (const hit of s.hits) {
      const C = feet(subject(s, hit)),
        r = 9 + Math.round(k.ease(k.clamp(e / 180)) * 5);
      ring(C, r, r * 0.5, ramp, e < 500 ? 3 : 2, e > 500 ? 8 : 0);
    }
  }
  function motes(s, C, e, ramp, n = 8, spread = 18) {
    if (e < 0 || e >= 650) return;
    const q = e / 650,
      seed = s.event.seed || 0;
    for (let i = 0; i < n; i++) {
      if (q > 0.75 && i % 2) continue;
      const a = k.hash(i, seed, 2) * k.tau;
      pixel(C.x + Math.cos(a) * spread * (0.4 + q), C.y + Math.sin(a) * spread * 0.4 - q * 16, ramp, i % 3 ? 3 : 4);
    }
  }
  function ward(s, active) {
    const e = s.c.t - k.CAST;
    if (e < 0 || (!active && e > 1200)) return;
    const C = centre(s),
      R = radius(s, 10),
      f = Math.min(5, Math.floor(e / 50));
    const img = k.sprite(`18:ward:${R}:${f}`, R * 2 + 8, R * 2 + 8, GOLD, set => {
      const c = R + 4;
      for (let y = 1; y < R * 2 + 7; y++)
        for (let x = 1; x < R * 2 + 7; x++) {
          const dx = x - c,
            dy = y - c,
            d = Math.hypot(dx, dy),
            a = (Math.atan2(dy, dx) + k.tau) % k.tau;
          if (a / k.tau > (f + 1) / 6) continue;
          if (Math.abs(d - R) < 0.7 || Math.abs(d - R * 0.78) < 0.6) set(x, y, f < 5 ? 4 : 3);
          const sector = (a / k.tau) * 12,
            local = sector - Math.floor(sector);
          if (
            d > R * 0.83 &&
            d < R * 0.94 &&
            (Math.abs(local - 0.5) < 0.07 || (Math.abs(d / R - 0.88) < 0.015 && local > 0.3 && local < 0.7))
          )
            set(x, y, 4);
          if (d < R * 0.7 && (Math.abs(dx) < 0.6 || Math.abs(dy) < 0.6) && d > R * 0.35) set(x, y, 2);
        }
    });
    k.blit(img, C.x - R - 4, C.y - R - 4);
  }
  function plants(s, frame) {
    const C = centre(s),
      R = radius(s, 7.5),
      seed = (s.event.seed || 0) % 19;
    const img = k.sprite(`18:plants:${R}:${seed}:${frame}`, R * 2 + 10, R * 2 + 22, GREEN, set => {
      for (let i = 0; i < 100; i++) {
        const a = k.hash(i, seed, 1) * k.tau,
          r = Math.sqrt(k.hash(i, seed, 2)) * R;
        const stage = k.clamp((frame / 5) * 1.4 - (r / R) * 0.4);
        if (stage <= 0) continue;
        const x = Math.round(R + 5 + Math.cos(a) * r),
          y = Math.round(R + 15 + Math.sin(a) * r);
        const h = Math.floor((5 + k.hash(i, seed, 3) * 9) * stage);
        for (let j = 0; j <= h; j++) {
          const bend = Math.round(Math.sin(j / 4 + i) * 2);
          set(x + bend, y - j, j > h * 0.7 ? 3 : 2);
          if (j > 1 && j % 3 === 0) {
            const side = j % 2 ? 1 : -1;
            for (let l = 1; l <= 3; l++) set(x + bend + side * l, y - j - (l > 1 ? 1 : 0), l === 3 ? 4 : 3);
          }
        }
      }
    });
    k.blit(img, C.x - R - 5, C.y - R - 15);
  }

  // Magic Circle: a golden inscribed ward locks shut, then erects a hollow, rune-barred cylinder.
  FX.register('magic-circle', {
    palette: GOLD,
    travel: 260,
    beats: (event, kit, travel) => beats(event, kit, travel, 'soft', 100),
    end: () => 1600,
    reach: (event, grid) => ({
      r: (event.area?.feet || 10) / (grid.feet || 5) + 1,
      up: (event.area?.height || 20) / (grid.feet || 5),
    }),
    ground(s) {
      ward(s, false);
    },
    air(s) {
      const e = s.c.t - s.hits[0].at;
      if (e < 0 || e > 1000) return;
      const C = centre(s),
        R = radius(s, 10),
        h = ((s.area?.height || 20) / (s.grid.feet || 5)) * k.PX * k.ease(k.clamp(e / 240));
      ring({ x: C.x, y: C.y - h }, R, R, GOLD, e < 650 ? 4 : 2, e > 750 ? 12 : 0);
      if (e < 680)
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * k.tau,
            x = C.x + Math.cos(a) * R,
            y = C.y + Math.sin(a) * R;
          for (let j = 1; j <= 4; j++) pixel(x, y - (h * j) / 4, GOLD, j === 4 ? 4 : 2);
        }
      impact(s, s.hits[0], C, GOLD, 24, 8);
    },
    linger(s) {
      ward(s, true);
    },
  });

  // Clairvoyance: a silver scrying bead opens into an eye and an ear inside a turning sensor orbit.
  FX.register('clairvoyance', {
    palette: SIGHT,
    travel: 180,
    beats: (event, kit, travel) => beats(event, kit, travel, 'soft', 60),
    end: () => 1280,
    ground(s) {
      seals(s, SIGHT);
    },
    air(s) {
      const C = centre(s),
        e = s.c.t - s.hits[0].at;
      deliver(s, C, SIGHT);
      if (e < 0 || e > 740) return;
      ring(C, 17, 12, SIGHT, e < 500 ? 3 : 2, 6);
      stamp('eye', EYE, SIGHT, C);
      if (e > 160 && e < 650) stamp('ear', EAR, SIGHT, { x: C.x + 17, y: C.y - 10 });
      for (let i = 0; i < 3; i++) {
        const a = e / 260 + (i * k.tau) / 3;
        pixel(C.x + Math.cos(a) * 17, C.y + Math.sin(a) * 12, SIGHT, 4);
      }
      impact(s, s.hits[0], C, SIGHT, 18, 4);
    },
  });

  // Conjure Animals: leafy fey gates stamp open and a small pack of green-silver wolves bounds out.
  FX.register('conjure-animals', {
    palette: FEY,
    travel: 300,
    beats: (event, kit, travel) => beats(event, kit, travel, 'soft', 90),
    end: () => 1580,
    ground(s) {
      const e = s.c.t - k.CAST;
      if (e < 0 || e > 1100) return;
      const C = centre(s);
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * k.tau - 0.4;
        ring({ x: C.x + Math.cos(a) * 21, y: C.y + Math.sin(a) * 13 }, 12, 6, FEY, e < 650 ? 3 : 2, e > 800 ? 8 : 0);
      }
    },
    air(s) {
      const e = s.c.t - s.hits[0].at,
        C = centre(s);
      if (e < 0 || e > 920) return;
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * k.tau - 0.4,
          q = k.ease(k.clamp((e - i * 65) / 260));
        if (e < i * 65) continue;
        const W = { x: C.x + Math.cos(a) * (20 + q * 5), y: C.y + Math.sin(a) * 13 - 5 - Math.sin(q * Math.PI) * 10 };
        stamp('wolf', WOLF, FEY, W);
        motes(s, W, s.real(s.hits[0]) - i * 65, FEY, 4, 10);
      }
      impact(s, s.hits[0], C, FEY, 26, 9);
    },
  });

  // Conjure Barrage: mundane arrows multiply into three steel volleys filling the caster's cone.
  FX.register('conjure-barrage', {
    palette: STEEL,
    travel: 340,
    beats(event, kit, travel) {
      return [0, 1, 2].flatMap(wave => beats(event, kit, travel + wave * 100, 'dart', 60));
    },
    end: () => 1320,
    ground(s) {
      if (s.c.t < k.CAST || s.c.t > 1050 || !s.area) return;
      const corners = k.outline(s.area, s.grid);
      const points = corners.map(p => k.P(Array.isArray(p) ? { x: p[0], y: p[1] } : p));
      // Sparse steel dashes trace the actual template without a solid cone over the tokens.
      for (let i = 0; i < points.length; i++) {
        const A = points[i],
          B = points[(i + 1) % points.length];
        for (let j = 0; j < 12; j++) pixel(k.mix(A.x, B.x, j / 12), k.mix(A.y, B.y, j / 12), STEEL, 2);
      }
    },
    air(s) {
      const A = k.P(s.area || s.pose.hand || s.pose.base || subject(s));
      const aim = k.P(s.pose.target || subject(s));
      const dir = s.area?.dir ?? Math.atan2(aim.y - A.y, aim.x - A.x);
      const L = ((s.area?.feet || 60) / (s.grid.feet || 5)) * k.PX;
      const img = glyph('arrow', ARROW, STEEL);
      for (let wave = 0; wave < 3; wave++) {
        const q = (s.c.t - k.CAST - wave * 100) / 340;
        if (q < 0 || q >= 1) continue;
        for (let i = 0; i < 11; i++) {
          const side = (i / 10 - 0.5) * L;
          const x = A.x + Math.cos(dir) * L * q - Math.sin(dir) * side * q;
          const y = A.y + Math.sin(dir) * L * q + Math.cos(dir) * side * q;
          k.blitRotated(img, x, y, dir + Math.atan2(side, L), 0.8);
        }
      }
      s.hits.forEach((hit, i) => impact(s, hit, k.P(subject(s, hit)), STEEL, 24, 4, i));
    },
  });

  // Phantom Steed: cold hoofprints lead to a smoky, pale horse with a dark mane and spectral tack.
  FX.register('phantom-steed', {
    palette: GHOST,
    travel: 300,
    beats: (event, kit, travel) => beats(event, kit, travel, 'soft', 90),
    end: () => 1550,
    ground(s) {
      const e = s.c.t - k.CAST,
        C = centre(s);
      if (e < 0 || e > 1150) return;
      ring(C, 24, 10, GHOST, e < 700 ? 3 : 2, 10);
      for (let i = 0; i < 6; i++) {
        if (e < i * 45) continue;
        const x = C.x - 30 + i * 7,
          y = C.y + (i % 2 ? 5 : -2);
        ring({ x, y }, 2, 3, GHOST, 3, 3);
      }
    },
    air(s) {
      const e = s.c.t - s.hits[0].at,
        C = centre(s);
      if (e < 0 || e > 900) return;
      const q = k.ease(k.clamp(e / 250)),
        H = { x: C.x - 8 + q * 8, y: C.y - 10 - Math.sin(q * Math.PI) * 5 };
      stamp('horse', HORSE, GHOST, H);
      // Saddle and reins make the summoned creature read as a mount.
      stroke({ x: H.x - 6, y: H.y + 1 }, { x: H.x + 3, y: H.y + 1 }, GHOST, 1, 2, 5);
      stroke({ x: H.x + 3, y: H.y + 1 }, { x: H.x + 11, y: H.y - 5 }, GHOST, 2, 1, 5);
      motes(s, { x: C.x - 14, y: C.y }, s.real(s.hits[0]), GHOST, 10, 17);
      impact(s, s.hits[0], C, GHOST, 24, 7);
    },
  });

  // Create Food and Water: golden bread lands on platters as clear blue water pours into stout jugs.
  FX.register('create-food-and-water', {
    palette: FOOD,
    travel: 240,
    beats: (event, kit, travel) => beats(event, kit, travel, 'soft', 70),
    end: () => 1450,
    ground(s) {
      const e = s.c.t - s.hits[0].at,
        C = centre(s);
      if (e < 0 || e > 850) return;
      for (let i = 0; i < 3; i++) ring({ x: C.x - 20 + i * 19, y: C.y + (i % 2 ? 8 : 0) }, 10, 4, FOOD, 3);
    },
    air(s) {
      const C = centre(s),
        e = s.c.t - s.hits[0].at;
      deliver(s, C, FOOD);
      if (e < 0 || e > 850) return;
      for (let i = 0; i < 3; i++) {
        const q = k.clamp((e - i * 60) / 220);
        if (e < i * 60) continue;
        const P = { x: C.x - 20 + i * 19, y: C.y - 4 + (i % 2 ? 8 : 0) - Math.sin(q * Math.PI) * 9 };
        stamp('loaf', LOAF, FOOD, P);
      }
      const J = { x: C.x + 23, y: C.y - 9 };
      stamp('jug', JUG, FOOD, J);
      if (e < 500) {
        const v = (e % 180) / 180;
        stamp('drop', DROP, WATER, { x: J.x, y: J.y - 23 + v * 20 });
        ring({ x: J.x, y: J.y - 4 }, 3 + v * 3, 2, WATER, 4);
      }
      impact(s, s.hits[0], C, FOOD, 24, 7);
    },
  });

  // Plant Growth: a green pulse turns scattered sprouts into dense, broad-leaved undergrowth.
  FX.register('plant-growth', {
    palette: GREEN,
    travel: 220,
    beats: (event, kit, travel) => beats(event, kit, travel, 'soft', 90),
    end: () => 1580,
    ground(s) {
      const e = s.c.t - k.CAST;
      if (e < 0 || e > 1280) return;
      const C = centre(s),
        R = radius(s, 7.5);
      plants(s, Math.min(5, Math.floor(e / 100)));
      if (e < 500) ring(C, R * k.ease(k.clamp(e / 500)), R * k.ease(k.clamp(e / 500)), GREEN, 4, 12);
    },
    air(s) {
      const e = s.real(s.hits[0]),
        C = centre(s);
      impact(s, s.hits[0], C, GREEN, 26, 10);
      if (e < 0 || e > 650) return;
      for (let i = 0; i < 10; i++) {
        const a = k.hash(i, s.event.seed || 0) * k.tau,
          r = k.ease(e / 650) * 28;
        stamp('leaf', LEAF, GREEN, {
          x: C.x + Math.cos(a) * r,
          y: C.y + Math.sin(a) * r - Math.sin((e / 650) * Math.PI) * 13,
        });
      }
    },
    linger(s) {
      plants(s, 5);
    },
  });

  // Dispel Magic: a silver shearing sweep cracks violet enchantment rings into flying rune fragments.
  FX.register('dispel', {
    palette: ARCANE,
    travel: 230,
    beats: (event, kit, travel) => beats(event, kit, travel, 'soft', 85),
    end: () => 1150,
    ground(s) {
      const e = s.c.t - s.hits[0].at;
      if (s.c.t < k.CAST || e > 400) return;
      for (const hit of s.hits) ring(feet(subject(s, hit)), 15, 7, ARCANE, e < 0 ? 3 : 2, e < 0 ? 0 : 10);
    },
    air(s) {
      s.hits.forEach((hit, i) => {
        const C = k.P(subject(s, hit)),
          e = s.real(hit);
        deliver(s, C, SIGHT);
        if (s.c.t >= k.CAST && e < 0) {
          ring(C, 15, 18, ARCANE, 3, 8);
          ring(C, 10, 13, ARCANE, 2, 6);
        }
        if (e >= 0 && e < 200) {
          const d = 7 + e / 12;
          stroke({ x: C.x - d, y: C.y + d }, { x: C.x + d, y: C.y - d }, SIGHT, 5, e < 70 ? 3 : 1, 16);
        }
        impact(s, hit, C, ARCANE, 30, 10, i);
      });
    },
  });

  // Enemies Abound: hostile pink eyes multiply around the victim as friend-shaped faces turn menacing.
  FX.register('enemies-abound', {
    palette: MIND,
    travel: 220,
    beats: (event, kit, travel) => beats(event, kit, travel, 'soft', 80),
    end: () => 1330,
    ground(s) {
      seals(s, MIND);
    },
    air(s) {
      s.hits.forEach((hit, i) => {
        const C = k.P(subject(s, hit)),
          e = s.c.t - hit.at;
        deliver(s, C, MIND);
        if (e < 0 || e > 750) return;
        for (let j = 0; j < 3; j++) {
          const a = (j / 3) * k.tau - Math.PI / 2 + Math.sin(e / 180) * 0.15;
          const P = { x: C.x + Math.cos(a) * 21, y: C.y - 9 + Math.sin(a) * 14 };
          stamp(j === 0 ? 'eye' : 'hostile-face', j === 0 ? EYE : FACE, MIND, P);
          if (e < 420) pixel(k.mix(C.x, P.x, 0.65), k.mix(C.y - 5, P.y, 0.65), MIND, 4);
        }
        impact(s, hit, { x: C.x, y: C.y - 8 }, MIND, 22, 6, i);
      });
    },
  });

  // Beacon of Hope: a warm rising beacon crowns allies with golden halos and steady four-point stars.
  FX.register('beacon-of-hope', {
    palette: GOLD,
    travel: 180,
    beats: (event, kit, travel) => beats(event, kit, travel, 'soft', 70),
    end: () => 1420,
    ground(s) {
      seals(s, GOLD);
    },
    air(s) {
      s.hits.forEach((hit, i) => {
        const C = k.P(subject(s, hit)),
          e = s.c.t - hit.at;
        deliver(s, C, GOLD);
        if (e < 0 || e > 850) return;
        const H = { x: C.x, y: C.y - 16 - k.ease(k.clamp(e / 220)) * 7 };
        ring({ x: H.x, y: H.y + 9 }, 9, 3, GOLD, 4);
        const rays = glyph(
          'hope-star',
          [
            '....4....',
            '....4....',
            '...343...',
            '..34443..',
            '444454444',
            '..34443..',
            '...343...',
            '....4....',
            '....4....',
          ],
          GOLD,
        );
        k.blit(rays, H.x - rays.width / 2, H.y - rays.height / 2);
        if (e < 500) {
          for (let j = 0; j < 3; j++) pixel(C.x + (j - 1) * 6, C.y + 4 - ((e / 20 + j * 7) % 26), GOLD, 3);
        }
        impact(s, hit, H, GOLD, 24, 6, i);
      });
    },
  });

  // Fast Friends: a rosy charm ribbon ties a heart to a friendly, clasping-hand sigil above each subject.
  FX.register('fast-friends', {
    palette: MIND,
    travel: 240,
    beats: (event, kit, travel) => beats(event, kit, travel, 'soft', 65),
    end: () => 1330,
    ground(s) {
      seals(s, MIND);
    },
    air(s) {
      s.hits.forEach((hit, i) => {
        const C = k.P(subject(s, hit)),
          e = s.c.t - hit.at;
        deliver(s, C, MIND);
        if (e < 0 || e > 720) return;
        const y = C.y - 18 - k.ease(k.clamp(e / 220)) * 4;
        ring({ x: C.x, y }, 17, 8, MIND, 3, e > 500 ? 8 : 0);
        stamp('heart', HEART, MIND, { x: C.x - 9, y: y - 1 });
        stamp('friendly-hand', HAND, GOLD, { x: C.x + 8, y: y + 1 });
        motes(s, { x: C.x, y }, s.real(hit), MIND, 5, 13);
        impact(s, hit, { x: C.x, y }, MIND, 20, 4, i);
      });
    },
  });

  // Feign Death: a grey death-mask descends, the heartbeat flattens and a quiet shroud settles at the feet.
  FX.register('feign-death', {
    palette: DEATH,
    travel: 180,
    beats: (event, kit, travel) => beats(event, kit, travel, 'soft', 65),
    end: () => 1320,
    ground(s) {
      const e = s.c.t - s.hits[0].at;
      if (e < 0 || e > 760) return;
      for (const hit of s.hits) {
        const C = feet(subject(s, hit));
        ring(C, 15, 7, DEATH, e < 400 ? 3 : 2, 8);
        ring(C, 10, 4, DEATH, 1);
      }
    },
    air(s) {
      s.hits.forEach((hit, i) => {
        const C = k.P(subject(s, hit)),
          e = s.c.t - hit.at;
        deliver(s, C, DEATH);
        if (e < 0 || e > 760) return;
        const Y = C.y - 19 + k.ease(k.clamp(e / 450)) * 6;
        if (e < 520) stamp('death-mask', SKULL, DEATH, { x: C.x, y: Y });
        const img = k.sprite(`18:heartbeat:${e < 240 ? 0 : 1}`, 29, 11, DEATH, set => {
          for (let x = 1; x < 28; x++) {
            let y = 6;
            if (e < 240 && x > 10 && x < 16) y = x === 12 ? 2 : x === 14 ? 8 : 5;
            set(x, y, 3);
          }
        });
        k.blit(img, C.x - 14, C.y - 5);
        impact(s, hit, { x: C.x, y: C.y - 8 }, DEATH, 18, 4, i);
      });
    },
  });

  // Lightning Arrow: an arrow becomes a blue-white lightning shaft, then bursts into branching shock arcs.
  FX.register('lightning-arrow', {
    palette: BOLT,
    travel: 300,
    beats(event, kit, travel) {
      const list = event.targets?.length ? event.targets : [null];
      return [
        { at: kit.CAST + travel, stop: 115, target: list[0], kind: 'hit', power: 0.09 },
        ...list.map(target => ({ at: kit.CAST + travel + 120, stop: 75, target, kind: 'blast', power: 0.06 })),
      ];
    },
    end: () => 1230,
    flash: (event, e) => (e < 30 ? { color: BOLT[4], alpha: 0.2 } : e < 65 ? { color: BOLT[0], alpha: 0.16 } : null),
    ground(s) {
      const hit = s.hits[1],
        e = s.real(hit),
        C = feet(subject(s, s.hits[0]));
      if (e >= 0 && e < 360) ring(C, 5 + k.ease(e / 360) * 27, 3 + k.ease(e / 360) * 15, BOLT, e < 160 ? 4 : 2, 10);
    },
    air(s) {
      const first = s.hits[0],
        target = subject(s, first),
        T = k.P(target);
      if (s.pose.hand && s.c.t >= k.CAST && s.c.t < first.at) {
        const H = k.P(s.pose.hand),
          q = (s.c.t - k.CAST) / 300;
        const dir = Math.atan2(T.y - H.y, T.x - H.x);
        const tip = { x: k.mix(H.x, T.x, q), y: k.mix(H.y, T.y, q) };
        const rear = { x: tip.x - Math.cos(dir) * 25, y: tip.y - Math.sin(dir) * 25 };
        const kink = {
          x: k.mix(rear.x, tip.x, 0.55) - Math.sin(dir) * 3,
          y: k.mix(rear.y, tip.y, 0.55) + Math.cos(dir) * 3,
        };
        stroke(rear, kink, BOLT, 3, 2, 12);
        stroke(kink, tip, BOLT, 5, 2, 12);
        k.blitRotated(glyph('lightning-arrow', ARROW, BOLT), tip.x, tip.y, dir, 0.8);
      }
      s.hits.forEach((hit, i) => {
        const C = k.P(subject(s, hit)),
          e = s.real(hit);
        impact(s, hit, C, BOLT, i === 0 ? 36 : 26, i === 0 ? 10 : 5, i);
        if (i !== 1 || e < 0 || e > 300) return;
        // Six short, angular forks snap away from the struck body on real time.
        for (let j = 0; j < 6; j++) {
          const a = (j / 6) * k.tau + k.hash(j, s.event.seed || 0) * 0.3;
          const r = 12 + k.ease(e / 300) * 18;
          const K = { x: T.x + Math.cos(a + 0.2) * r * 0.55, y: T.y + Math.sin(a + 0.2) * r * 0.55 };
          const E = { x: T.x + Math.cos(a) * r, y: T.y + Math.sin(a) * r };
          stroke({ x: T.x + Math.cos(a) * 6, y: T.y + Math.sin(a) * 6 }, K, BOLT, e < 120 ? 5 : 3, 1, 5);
          stroke(K, E, BOLT, e < 120 ? 4 : 2, 1, 5);
        }
      });
    },
  });

  // Flame Arrows: fire runs up a quiver and lights a fan of ammunition, leaving bright ember-tipped shafts.
  FX.register('flame-arrows', {
    palette: FIRE,
    travel: 240,
    beats: (event, kit, travel) => beats(event, kit, travel, 'soft', 75),
    end: () => 1400,
    ground(s) {
      seals(s, FIRE);
    },
    air(s) {
      s.hits.forEach((hit, i) => {
        const C = k.P(subject(s, hit)),
          e = s.c.t - hit.at;
        deliver(s, C, FIRE);
        if (e < 0 || e > 780) return;
        const Q = { x: C.x + 11, y: C.y - 3 };
        stamp('quiver', QUIVER, FOOD, Q);
        for (let j = 0; j < 3; j++) {
          const angle = -Math.PI / 2 + (j - 1) * 0.3;
          const tip = { x: Q.x + Math.cos(angle) * 20, y: Q.y + Math.sin(angle) * 20 };
          k.blitRotated(glyph('flame-arrow', ARROW, FOOD), tip.x, tip.y, angle, 0.8);
          const f = Math.floor(s.c.raw / 65 + j) % 3;
          const img = k.sprite(`18:flame:${f}`, 11, 15, FIRE, set => {
            for (let y = 2; y < 13; y++)
              for (let x = 1; x < 10; x++) {
                const half = y < 5 ? 1 : y < 9 ? 2 : 3;
                const bend = y < 8 ? f - 1 : 0;
                if (Math.abs(x - 5 - bend) <= half) set(x, y, y > 8 && Math.abs(x - 5) < 2 ? 5 : x < 5 ? 3 : 2);
              }
          });
          k.blit(img, tip.x - 5, tip.y - 10);
        }
        motes(s, { x: Q.x, y: Q.y - 13 }, s.real(hit), FIRE, 6, 15);
        impact(s, hit, Q, FIRE, 24, 6, i);
      });
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
