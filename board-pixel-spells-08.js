/* Pixel spells, batch 08: first-level glamours, wards and enchanted strikes. */
(function (root) {
  'use strict';
  const FX = root.BoardPixelFX;
  if (!FX) return;
  const k = FX.kit;
  const GLAMOUR = ['#170e2a', '#49315f', '#8b59b5', '#c58de8', '#f0d4fc', '#ffffff'];
  const GOLD = ['#2a1b0c', '#77501f', '#bf862b', '#f2c65a', '#fff0b1', '#ffffff'];
  const DREAM = ['#11132e', '#303460', '#6565a6', '#aaa0dc', '#e2d9ff', '#ffffff'];
  const TIME = ['#102328', '#27535b', '#439b9a', '#88ded0', '#e2ffe4', '#ffffff'];
  const DUEL = ['#29101e', '#69253c', '#b74b56', '#f28b78', '#ffe0ae', '#ffffff'];
  const DEATH = ['#190d22', '#46203e', '#80425d', '#bd718c', '#eebacb', '#ffffff'];
  const WIND = ['#10232c', '#27536a', '#5195ad', '#91d3dc', '#e0faf5', '#ffffff'];
  const FORCE = k.palettes.FORCE;
  const VINE = k.palettes.VINE;

  function soft(event, kit, travel) {
    return (event.targets?.length ? event.targets : [null]).map(target => ({
      at: kit.CAST + travel,
      stop: 65,
      target,
      kind: 'soft',
      power: 0.03,
    }));
  }
  function single(event, kit, travel, kind = 'hit', stop = 100) {
    return [{ at: kit.CAST + travel, stop, target: event.targets?.[0] ?? null, kind, power: 0.065 }];
  }
  function subject(s, hit = s.hits[0], self = false) {
    const target = s.targets.find(t => hit && t.id === hit.id) || s.targets[0];
    if (target && (!self || s.event.targets?.length)) return target;
    const base = self ? s.pose.base : s.pose.target || s.pose.base;
    if (!base) return s.pose.hand || { x: 0, y: 0, span: 1 };
    return { ...base, y: base.y - 0.55, baseX: base.x, baseY: base.y, span: base.span || 1 };
  }
  const feet = t => k.P({ x: t.baseX ?? t.x, y: t.baseY ?? t.y + 0.55 });
  function spark(x, y, ramp, size = 1, index = 4) {
    k.dot(x, y, ramp[0], size + 2);
    k.dot(x, y, ramp[index], size);
  }
  function stroke(points, ramp, index = 3, size = 1) {
    for (const outer of [true, false]) {
      for (let j = 1; j < points.length; j++) {
        const a = points[j - 1],
          b = points[j];
        const n = Math.min(80, Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y))));
        for (let i = j === 1 ? 0 : 1; i <= n; i++) {
          const q = i / n;
          k.dot(k.mix(a.x, b.x, q), k.mix(a.y, b.y, q), ramp[outer ? 0 : index], size + (outer ? 2 : 0));
        }
      }
    }
  }
  // Cache rings too: a large template must not spend its frame budget on perimeter dots.
  function ring(x, y, rx, ry, ramp, index = 3, broken = false, phase = 0) {
    rx = Math.max(2, Math.round(rx));
    ry = Math.max(2, Math.round(ry));
    const W = rx * 2 + 5,
      H = ry * 2 + 5;
    const img = k.sprite(`08:ring:${rx}:${ry}:${ramp[2]}:${index}:${broken}:${phase % 6}`, W, H, ramp, set => {
      for (let yy = 2; yy < H - 2; yy++) {
        for (let xx = 2; xx < W - 2; xx++) {
          const dx = (xx - rx - 2) / rx,
            dy = (yy - ry - 2) / ry;
          if (Math.abs(Math.hypot(dx, dy) - 1) * Math.min(rx, ry) > 0.6) continue;
          if (broken && (Math.floor(((Math.atan2(dy, dx) + Math.PI) * 6) / Math.PI) + phase) % 3 === 0) continue;
          set(xx, yy, index);
        }
      }
    });
    k.blit(img, x - rx - 2, y - ry - 2);
  }
  function icon(name, rows, ramp) {
    return k.sprite(`08:${name}:${ramp[2]}`, rows[0].length + 2, rows.length + 2, ramp, set => {
      rows.forEach((row, y) => [...row].forEach((v, x) => v !== '.' && set(x + 1, y + 1, Number(v))));
    });
  }
  function stamp(name, rows, ramp, at) {
    const img = icon(name, rows, ramp);
    k.blit(img, at.x - img.width / 2, at.y - img.height / 2);
  }
  function impact(s, hit, at, ramp, size = 22, count = 6) {
    const e = s.real(hit);
    k.drawHit(k.hitStyle(`08:${s.event.id}`, ramp, { S: size, spikes: 4, minor: 2, jag: 0.18 }), at, e);
    k.shards(at, e, ramp, (s.event.seed || 0) + 19, count, size * 0.65);
  }
  function flight(s, T, ramp, bend = 0) {
    const hit = s.hits[0],
      H = s.pose.hand && k.P(s.pose.hand);
    if (!H || s.c.t < k.CAST || s.c.t >= hit.at || hit.at === k.CAST) return;
    const q = (s.c.t - k.CAST) / (hit.at - k.CAST);
    for (let i = 5; i >= 0; i--) {
      const u = q - i * 0.05;
      if (u < 0) continue;
      spark(
        k.mix(H.x, T.x, u),
        k.mix(H.y, T.y, u) - Math.sin(u * Math.PI) * bend,
        ramp,
        i === 0 ? 3 : 1,
        i < 2 ? 4 : 2,
      );
    }
  }
  function buffGround(s, ramp, duration = 600) {
    const e = s.c.t - s.hits[0].at;
    if (e < 0 || e > duration) return;
    const B = feet(subject(s, s.hits[0], true));
    const q = k.clamp(e / duration),
      r = 9 + k.ease(q) * 8;
    ring(B.x, B.y, r, r * 0.45, ramp, q < 0.2 ? 4 : 2, q > 0.65, Math.floor(e / 100));
  }
  const MASK = [
    '..333.......333..',
    '.34443333334443.',
    '.34444444444443.',
    '.34311444113443.',
    '..33113431133..',
    '...344444443...',
    '....3344433....',
    '.....33333.....',
  ];
  const SHIELD = [
    '......44444......',
    '..4444333334444..',
    '..4333222223334..',
    '..4322224222234..',
    '..4322244422234..',
    '..4322444442234..',
    '...32224442223...',
    '...43222422234...',
    '....432222234....',
    '.....4322234.....',
    '......43234......',
    '.......434.......',
    '........4........',
  ];
  const BLADE = [
    '.............5.',
    '............54.',
    '...........543.',
    '..........543..',
    '.........543...',
    '........543....',
    '.......543.....',
    '..4...543......',
    '...4.543.......',
    '....443........',
    '...344.........',
    '..33..4........',
    '.33....4.......',
  ];

  // Disguise Self: a violet veil sweeps upward; two different masks exchange places and lock together.
  FX.register('disguise-self', {
    palette: GLAMOUR,
    travel: 140,
    beats: soft,
    end: (event, travel) => k.CAST + travel + 650,
    ground: s => buffGround(s, GLAMOUR),
    air(s) {
      const hit = s.hits[0],
        T = k.P(subject(s, hit, true)),
        e = s.c.t - k.CAST;
      if (e < 0 || e > 790) return;
      const q = k.clamp(e / 360),
        y = T.y + 10 - k.ease(q) * 25;
      ring(T.x, y, 10 + Math.sin(q * Math.PI) * 3, 4, GLAMOUR, 4, e > 570, Math.floor(e / 90));
      const slide = e < 140 ? 7 * (1 - e / 140) : e > 520 ? (e - 520) / 35 : 0;
      if (e < 590) {
        stamp('mask', MASK, GLAMOUR, { x: T.x - slide, y: T.y - 9 });
        if (e < 140) stamp('mask-shadow', MASK, DREAM, { x: T.x + slide, y: T.y - 8 });
      }
      for (let i = 0; i < 6; i++) {
        if (e > 630 && i % 2) continue;
        const a = (i * k.tau) / 6 + q * 2;
        spark(T.x + Math.cos(a) * 13, y + Math.sin(a) * 6, GLAMOUR);
      }
      impact(s, hit, { x: T.x, y: T.y - 9 }, GLAMOUR, 18, 4);
    },
  });

  // Distort Value: a tarnished coin becomes an ostentatious golden gem, with counterfeit doubling glints.
  FX.register('distort-value', {
    palette: GOLD,
    travel: 170,
    beats: soft,
    end: (event, travel) => k.CAST + travel + 580,
    ground: s => buffGround(s, GOLD, 500),
    air(s) {
      const hit = s.hits[0],
        T = k.P(subject(s)),
        e = s.c.t - hit.at;
      flight(s, T, GLAMOUR, 9);
      if (e < -170 || e > 580 || s.c.t < k.CAST) return;
      if (e < 160)
        stamp(
          'tarnished-coin',
          [
            '...22222...',
            '..2332222..',
            '.232111222.',
            '.231221122.',
            '.231211122.',
            '.231121122.',
            '.232111222.',
            '..2222222..',
            '...22222...',
          ],
          GOLD,
          T,
        );
      if (e >= 0 && e < 440) {
        const d = e < 160 ? 7 : 4;
        for (const side of [-1, 1])
          stamp(
            'false-gem',
            [
              '...44444...',
              '..4554444..',
              '.455543334.',
              '.444444444.',
              '..3333333..',
              '...23332...',
              '....232....',
              '.....2.....',
            ],
            GOLD,
            { x: T.x + side * d, y: T.y - 5 - k.ease(k.clamp(e / 160)) * 3 },
          );
      }
      if (e >= 0) {
        const q = k.clamp(e / 580);
        for (let i = 0; i < 5; i++) {
          const a = (i * k.tau) / 5 - q * 2;
          spark(T.x + Math.cos(a) * (9 + q * 9), T.y + Math.sin(a) * 8 - q * 9, GOLD, 1, 4);
        }
      }
      impact(s, hit, { x: T.x, y: T.y - 7 }, GOLD, 20, 5);
    },
  });

  // Gift of Alacrity: turquoise clockwork spins ahead; golden hands snap forward with quick chevrons.
  FX.register('gift-of-alacrity', {
    palette: TIME,
    travel: 150,
    beats: soft,
    end: (event, travel) => k.CAST + travel + 600,
    ground: s => buffGround(s, TIME),
    air(s) {
      const hit = s.hits[0],
        T = k.P(subject(s, hit, true)),
        e = s.c.t - hit.at;
      const C = { x: T.x, y: T.y - 12 };
      flight(s, C, TIME, 5);
      if (e < 0 || e > 600) return;
      if (e < 450) {
        ring(C.x, C.y, 10, 10, TIME, 3);
        for (let i = 0; i < 8; i++) {
          const a = (i * k.tau) / 8;
          spark(C.x + Math.cos(a) * 8, C.y + Math.sin(a) * 8, TIME, 1, i % 2 ? 2 : 4);
        }
        const a = (Math.floor(e / 55) * Math.PI) / 4;
        stroke(
          [
            { x: C.x + Math.cos(a) * 6, y: C.y + Math.sin(a) * 6 },
            C,
            { x: C.x + Math.cos(a - 1.6) * 4, y: C.y + Math.sin(a - 1.6) * 4 },
          ],
          GOLD,
          4,
        );
      }
      for (let i = 0; i < 3; i++) {
        const x = T.x - 12 + ((e / 12 + i * 10) % 30),
          y = T.y + 8;
        stroke(
          [
            { x, y: y - 3 },
            { x: x + 3, y },
            { x, y: y + 3 },
          ],
          TIME,
          4,
        );
      }
      impact(s, hit, C, TIME, 20, 4);
    },
  });

  // Sleep: a full-radius indigo dream tide settles into silver sand, crescents and rising Zs.
  FX.register('sleep', {
    palette: DREAM,
    travel: 220,
    beats: soft,
    end: (event, travel) => k.CAST + travel + 900,
    reach: (event, grid) => ({ r: (event.area?.feet || 20) / (grid.feet || 5) + 1, up: 1.5 }),
    ground(s) {
      const e = s.c.t - s.hits[0].at;
      if (e < 0 || e >= 900) return;
      const C = k.P(s.area || s.pose.target || subject(s));
      const R = Math.max(4, Math.round(((s.area?.feet || 20) / (s.grid.feet || 5)) * 16));
      const f = Math.min(7, Math.floor(e / 110));
      const img = k.sprite(`08:sleep:${R}:${f}`, R * 2 + 6, R * 2 + 6, DREAM, set => {
        const r = R * (f === 0 ? 0.55 : f === 1 ? 0.85 : 1);
        for (let y = 2; y < R * 2 + 4; y++) {
          for (let x = 2; x < R * 2 + 4; x++) {
            const dx = x - R - 3,
              dy = y - R - 3,
              d = Math.hypot(dx, dy);
            if (d > r) continue;
            if (f < 5 && Math.abs(d - r + 2) < 0.65) set(x, y, f < 2 ? 4 : 2);
            else if (f < 5 && Math.abs(d - r * 0.7) < 0.55 && (x + y) % 9 < 5) set(x, y, 1);
            else if (x % 13 === 3 && y % 11 === 4 && (x + y) % 7 >= f - 2) set(x, y, f < 3 ? 3 : 2);
          }
        }
      });
      k.blit(img, C.x - R - 3, C.y - R - 3);
    },
    air(s) {
      const C = k.P(s.area || s.pose.target || subject(s));
      flight(s, C, DREAM, 12);
      s.hits.forEach((hit, i) => {
        const T = k.P(subject(s, hit)),
          e = s.real(hit);
        if (e < 0 || e > 965) return;
        impact(s, hit, { x: T.x, y: T.y - 8 }, DREAM, 18, 5);
        if (e < 670)
          stamp(
            'crescent',
            ['....444..', '..4444...', '.4444....', '.444.....', '.444.....', '.4444....', '..4444...', '....444..'],
            DREAM,
            { x: T.x - 8, y: T.y - 13 },
          );
        for (let j = 0; j < 2; j++) {
          const age = e - j * 150;
          if (age < 0 || age > 650) continue;
          stamp('sleep-z', ['44444', '...4.', '..4..', '.4...', '44444'], DREAM, {
            x: T.x + 7 + j * 5 + Math.sin(age / 150 + i) * 2,
            y: T.y - 9 - age / 40,
          });
        }
      });
    },
  });

  // Compelled Duel: a crimson challenge ribbon binds two opposing sword sigils, without physical chains.
  FX.register('compelled-duel', {
    palette: DUEL,
    travel: 170,
    beats: (event, kit, travel) => single(event, kit, travel, 'soft', 80),
    end: (event, travel) => k.CAST + travel + 650,
    ground(s) {
      const e = s.c.t - s.hits[0].at;
      if (e < 0 || e > 620) return;
      for (const t of [subject(s), s.pose.base].filter(Boolean)) {
        const B = t === s.pose.base ? k.P(t) : feet(t);
        ring(B.x, B.y, 13, 6, DUEL, 3, true, Math.floor(e / 120));
      }
    },
    air(s) {
      const hit = s.hits[0],
        T = k.P(subject(s)),
        H = s.pose.hand && k.P(s.pose.hand);
      if (!H || s.c.t < k.CAST) return;
      const e = s.c.t - hit.at;
      flight(s, T, DUEL, -6);
      if (e < 0 || e > 650) return;
      if (e < 320) {
        const points = Array.from({ length: 17 }, (_, i) => {
          const q = i / 16;
          return { x: k.mix(H.x, T.x, q), y: k.mix(H.y, T.y, q) + Math.sin(q * Math.PI) * 7 };
        });
        stroke(points, DUEL, 2);
      }
      if (e < 500) {
        const img = icon('duel-blade', BLADE, DUEL);
        for (const side of [-1, 1]) k.blitRotated(img, T.x + side * 3, T.y - 12, (side * Math.PI) / 4);
        stamp('challenge', ['4', '4', '4', '.', '5'], GOLD, { x: T.x, y: T.y - 25 });
      }
      impact(s, hit, { x: T.x, y: T.y - 12 }, DUEL, 24, 5);
    },
  });

  // Find Familiar: a ritual circle opens, incense curls away and a small spectral owl unfolds its wings.
  FX.register('find-familiar', {
    palette: GLAMOUR,
    travel: 320,
    beats: (event, kit, travel) => single(event, kit, travel, 'soft', 90),
    end: (event, travel) => k.CAST + travel + 900,
    ground(s) {
      const T = feet(subject(s)),
        e = s.c.t - k.CAST;
      if (e < 0 || e > 1220) return;
      const r = e < 320 ? 15 : 15 - k.clamp((e - 650) / 570) * 7;
      ring(T.x, T.y, r, r * 0.55, GLAMOUR, 3, e > 800, Math.floor(e / 110));
      if (e < 700) {
        ring(T.x, T.y, 9, 5, GLAMOUR, 2, true, 2);
        for (let i = 0; i < 6; i++) {
          const a = (i * k.tau) / 6;
          spark(T.x + Math.cos(a) * 18, T.y + Math.sin(a) * 9, GLAMOUR, 2, 4);
        }
      }
    },
    air(s) {
      const hit = s.hits[0],
        B = feet(subject(s)),
        e = s.c.t - hit.at;
      if (s.c.t < k.CAST || e > 900) return;
      for (let i = 0; i < 5; i++) {
        const q = k.clamp((e + 320) / 950),
          a = i * 1.9 + q * 4;
        const x = B.x + Math.cos(a) * (7 + q * 10),
          y = B.y - 4 - q * 21 + Math.sin(a) * 3;
        if (e < 500) {
          k.disc(x, y, 3, GLAMOUR[0]);
          k.disc(x, y, 2, GLAMOUR[2]);
        }
      }
      if (e >= 0 && e < 760) {
        const spread = e < 170;
        stamp(
          spread ? 'owl-spread' : 'owl-perched',
          spread
            ? [
                '4...........4',
                '.44.3...3.44.',
                '..443343344..',
                '...3454543...',
                '...3442443...',
                '....34343....',
                '....33333....',
                '.....3.3.....',
              ]
            : ['..3...3..', '..33333..', '.3454543.', '.3442443.', '..34343..', '..33333..', '..23332..', '...3.3...'],
          GLAMOUR,
          { x: B.x, y: B.y - 10 - Math.sin(k.clamp(e / 300) * Math.PI) * 5 },
        );
      }
      impact(s, hit, { x: B.x, y: B.y - 10 }, GLAMOUR, 30, 8);
      if (e > 660) {
        for (let i = 0; i < 4; i++) spark(B.x + (i - 1.5) * 5, B.y - 13 - (e - 660) / 20, GLAMOUR);
      }
    },
  });

  // Illusory Script: a hovering quill writes violet runes on parchment, then disguises them as plain gold lines.
  FX.register('illusory-script', {
    palette: GLAMOUR,
    travel: 280,
    beats: soft,
    end: (event, travel) => k.CAST + travel + 650,
    air(s) {
      const hit = s.hits[0],
        T = k.P(subject(s)),
        e = s.c.t - k.CAST;
      if (e < 0 || e > 930) return;
      if (e < 780)
        stamp(
          'parchment',
          [
            '.4444444444444.',
            '443333333333344',
            '.4333333333334.',
            '.4333333333334.',
            '.4333333333334.',
            '.4333333333334.',
            '.4333333333334.',
            '.4333333333334.',
            '.4333333333334.',
            '443333333333344',
            '.4444444444444.',
          ],
          GOLD,
          T,
        );
      const row = Math.min(2, Math.floor(e / 150));
      for (let j = 0; j <= row; j++) {
        if (e > 780) continue;
        const plain = e > 530,
          palette = plain ? GOLD : GLAMOUR;
        for (let i = 0; i < 4; i++) {
          if (j === row && e < 450 && i > Math.floor((e % 150) / 37)) continue;
          spark(T.x - 4 + i * 3, T.y - 3 + j * 3, palette, 1, plain ? 1 : 3);
          if (!plain && i % 2) spark(T.x - 4 + i * 3, T.y - 4 + j * 3, palette, 1, 4);
        }
      }
      if (e < 520) {
        stamp(
          'quill',
          ['......44', '.....454', '....454.', '...454..', '..454...', '.454....', '..4.....', '.4......'],
          GLAMOUR,
          { x: T.x - 1 + ((e % 150) / 150) * 10, y: T.y - 7 + row * 3 },
        );
      }
      impact(s, hit, { x: T.x + 6, y: T.y - 5 }, GLAMOUR, 18, 4);
      if (e >= 780) {
        for (let i = 0; i < 5; i++) spark(T.x - 6 + i * 3, T.y - 4 - (e - 780) / 14, GLAMOUR);
      }
    },
  });

  // Shield: a blue force pane snaps up and sharply ricochets a white missile off its outer face.
  FX.register('shield', {
    palette: FORCE,
    travel: 110,
    beats: (event, kit, travel) => single(event, kit, travel, 'soft', 100),
    end: (event, travel) => k.CAST + travel + 560,
    ground: s => buffGround(s, FORCE, 480),
    air(s) {
      const hit = s.hits[0],
        T = k.P(subject(s, hit, true)),
        e = s.c.t - hit.at;
      if (s.c.t < k.CAST || e > 560) return;
      const C = { x: T.x + 11, y: T.y - 2 };
      if (e < 430) {
        const pane = k.sprite('08:force-pane', 23, 31, FORCE, set => {
          for (let y = 2; y < 29; y++) {
            const half = y < 7 ? 4 + y : y > 23 ? 32 - y : 10;
            for (let x = 11 - half; x <= 11 + half; x++) {
              if (Math.abs(x - 11) >= half - 1 || y === 2 || y === 28) set(x, y, x < 11 ? 4 : 3);
              else if ((x + y * 2) % 13 === 0) set(x, y, 2);
            }
          }
        });
        k.blit(pane, C.x - 11, C.y - 15);
      }
      if (e < 0) {
        const q = k.clamp((s.c.t - k.CAST) / 110);
        stroke(
          [
            { x: C.x + 36 - q * 32, y: C.y - 9 + q * 9 },
            { x: C.x + 29 - q * 25, y: C.y - 7 + q * 7 },
          ],
          FORCE,
          5,
          2,
        );
      }
      const real = s.real(hit);
      if (real >= 0 && real < 220)
        stroke(
          [
            { x: C.x + 4 + real / 10, y: C.y - real / 10 },
            { x: C.x + 9 + real / 10, y: C.y - 5 - real / 10 },
          ],
          FORCE,
          5,
          2,
        );
      impact(s, hit, { x: C.x + 4, y: C.y }, FORCE, 30, 8);
      if (e > 400) ring(C.x, C.y, 12, 15, FORCE, 2, true, Math.floor(e / 60));
    },
  });

  // Shield of Faith: a golden heraldic shield and radiant cross seat inside a revolving protective halo.
  FX.register('shield-of-faith', {
    palette: GOLD,
    travel: 180,
    beats: soft,
    end: (event, travel) => k.CAST + travel + 650,
    ground: s => buffGround(s, GOLD),
    air(s) {
      const hit = s.hits[0],
        T = k.P(subject(s, hit, true)),
        e = s.c.t - hit.at;
      flight(s, T, GOLD, 10);
      if (e < 0 || e > 650) return;
      ring(T.x, T.y, 13, 16, GOLD, e < 140 ? 4 : 3, e > 440, Math.floor(e / 90));
      if (e < 490) {
        stamp('faith-shield', SHIELD, GOLD, { x: T.x, y: T.y - 3 });
        stamp('faith-cross', ['..5..', '..5..', '55555', '..5..', '..5..', '..5..'], GOLD, { x: T.x, y: T.y - 4 });
      }
      for (let i = 0; i < 3; i++) {
        const a = (i * k.tau) / 3 + e / 240;
        spark(T.x + Math.cos(a) * 15, T.y + Math.sin(a) * 12, GOLD, 2, 4);
      }
      impact(s, hit, { x: T.x, y: T.y - 4 }, GOLD, 24, 6);
    },
  });

  // False Life: a dark elixir pours into a wine-violet rib cage, sealing temporary necromantic vitality.
  FX.register('false-life', {
    palette: DEATH,
    travel: 200,
    beats: soft,
    end: (event, travel) => k.CAST + travel + 630,
    ground: s => buffGround(s, DEATH),
    air(s) {
      const hit = s.hits[0],
        T = k.P(subject(s, hit, true)),
        e = s.c.t - hit.at;
      if (s.c.t < k.CAST || e > 630) return;
      if (e < 80)
        stamp(
          'elixir',
          ['..444..', '..232..', '..232..', '.23332.', '2333332', '2334332', '2233322', '.22222.'],
          DEATH,
          { x: T.x - 12, y: T.y - 8 },
        );
      if (e < 340) {
        for (let i = 0; i < 7; i++) {
          const q = ((e + 200) / 430 + i / 7) % 1;
          spark(T.x - 12 + q * 12, T.y - 6 + Math.sin(q * Math.PI) * 10, DEATH, 2, 3);
        }
      }
      if (e >= 0 && e < 490)
        stamp(
          'spectral-ribs',
          [
            '......4......',
            '..333343333..',
            '.34...4...43.',
            '.3....4....3.',
            '..333343333..',
            '.34...4...43.',
            '.3....4....3.',
            '..333343333..',
            '..34..4..43..',
            '...3334333...',
            '......4......',
          ],
          DEATH,
          T,
        );
      impact(s, hit, T, DEATH, 26, 7);
      if (e >= 430) {
        for (let i = 0; i < 6; i++) {
          const a = (i * k.tau) / 6;
          spark(T.x + Math.cos(a) * 10, T.y + Math.sin(a) * 9 - (e - 430) / 30, DEATH, 1, 2);
        }
      }
    },
  });

  // Divine Favor: a gold sunburst blesses the weapon; white-gold sparks run from hilt to blade tip.
  FX.register('divine-favor', {
    palette: GOLD,
    travel: 130,
    beats: soft,
    end: (event, travel) => k.CAST + travel + 610,
    ground: s => buffGround(s, GOLD),
    air(s) {
      const hit = s.hits[0],
        T = k.P(subject(s, hit, true)),
        e = s.c.t - hit.at;
      if (s.c.t < k.CAST || e > 610) return;
      const C = { x: T.x + 9, y: T.y - 5 };
      if (e < 470) {
        stamp('blessed-blade', BLADE, GOLD, C);
        if (e >= 0) {
          ring(C.x + 5, C.y - 7, 6, 6, GOLD, 4);
          for (let i = 0; i < 6; i++) {
            const a = (i * k.tau) / 6;
            spark(C.x + 5 + Math.cos(a) * 9, C.y - 7 + Math.sin(a) * 9, GOLD, 1, 4);
          }
        }
      }
      if (e >= 0) {
        for (let i = 0; i < 4; i++) {
          const q = (e / 280 + i / 4) % 1;
          spark(C.x - 5 + q * 12, C.y + 6 - q * 14, GOLD, i % 2 ? 1 : 2, 5);
        }
      }
      impact(s, hit, { x: C.x + 4, y: C.y - 5 }, GOLD, 26, 7);
    },
  });

  // Faerie Fire: violet fairy dust fills the exact cube footprint, then clings as harmless outline flames.
  FX.register('faeriefire', {
    palette: GLAMOUR,
    travel: 210,
    beats: soft,
    end: (event, travel) => k.CAST + travel + 850,
    reach: (event, grid) => ({ r: (event.area?.feet || 20) / (grid.feet || 5) + 1, up: 2 }),
    ground(s) {
      const e = s.c.t - s.hits[0].at;
      if (e < 0 || e > 850 || !s.area) return;
      const points = k.outline(s.area, s.grid).map(p => k.P(Array.isArray(p) ? { x: p[0], y: p[1] } : p));
      if (points.length < 4) return;
      const x0 = Math.floor(Math.min(...points.map(p => p.x))) - 3;
      const y0 = Math.floor(Math.min(...points.map(p => p.y))) - 3;
      const W = Math.ceil(Math.max(...points.map(p => p.x)) - x0) + 4;
      const H = Math.ceil(Math.max(...points.map(p => p.y)) - y0) + 4;
      const local = points.map(p => ({ x: Math.round(p.x - x0), y: Math.round(p.y - y0) }));
      const f = Math.min(6, Math.floor(e / 125)),
        seed = (s.event.seed || 0) % 5;
      const key = local.map(p => `${p.x},${p.y}`).join(':');
      const img = k.sprite(`08:fairy-cube:${key}:${W}:${H}:${f}:${seed}`, W, H, GLAMOUR, set => {
        for (let y = 2; y < H - 2; y++) {
          for (let x = 2; x < W - 2; x++) {
            let pos = false,
              neg = false,
              edge = Infinity;
            for (let i = 0; i < local.length; i++) {
              const a = local[i],
                b = local[(i + 1) % local.length];
              const cross = (x - a.x) * (b.y - a.y) - (y - a.y) * (b.x - a.x);
              if (cross > 0) pos = true;
              if (cross < 0) neg = true;
              edge = Math.min(edge, Math.abs(cross) / (Math.hypot(b.x - a.x, b.y - a.y) || 1));
            }
            if (pos && neg) continue;
            if (edge < 0.8 && f < 4) set(x, y, f === 0 ? 4 : 2);
            else if ((x + seed) % 12 === 3 && y % 10 === 4 && k.hash(x, y, seed) > f / 8) {
              set(x, y, 3);
              set(x, y - 1 - (f % 2), 4);
              set(x + 1, y + 1, 2);
            }
          }
        }
      });
      k.blit(img, x0, y0);
    },
    air(s) {
      flight(s, k.P(s.area || s.pose.target || subject(s)), GLAMOUR, 14);
      s.hits.forEach((hit, i) => {
        const target = subject(s, hit),
          T = k.P(target),
          B = feet(target),
          e = s.real(hit);
        if (e < 0 || e > 915) return;
        impact(s, hit, { x: T.x, y: T.y - 5 }, GLAMOUR, 22, 6);
        if (e < 760) {
          const w = 6 * (target.span || 1);
          const outline = [
            { x: T.x - w, y: B.y - 2 },
            { x: T.x - w - 1, y: T.y },
            { x: T.x - 4, y: T.y - 5 },
            { x: T.x - 3, y: T.y - 11 },
            { x: T.x + 3, y: T.y - 11 },
            { x: T.x + 4, y: T.y - 5 },
            { x: T.x + w + 1, y: T.y },
            { x: T.x + w, y: B.y - 2 },
          ];
          stroke(outline, GLAMOUR, 3);
          for (let j = 0; j < 4; j++) {
            const phase = (Math.floor(e / 85) + j + i) % 3;
            const x = T.x + (j % 2 ? -1 : 1) * (w + 1),
              y = T.y + j * 3 - 4;
            spark(x, y - phase, GLAMOUR, 2, 4);
          }
        }
      });
    },
  });

  // Ensnaring Strike: a thorn-tipped weapon streak lands, then green brambles burst up and cinch the victim.
  FX.register('ensnaring-strike', {
    palette: VINE,
    travel: 190,
    beats: (event, kit, travel) => single(event, kit, travel, 'hit', 115),
    end: (event, travel) => k.CAST + travel + 730,
    ground(s) {
      const hit = s.hits[0],
        e = s.c.t - hit.at;
      if (e < 0 || e > 730) return;
      const B = feet(subject(s));
      ring(B.x, B.y, 12, 6, VINE, 2, e > 520, Math.floor(e / 90));
      for (let i = 0; i < 4; i++) {
        const a = (i * k.tau) / 4 + 0.5;
        stroke([B, { x: B.x + Math.cos(a) * 13, y: B.y + Math.sin(a) * 6 }], VINE, 2, 2);
      }
    },
    air(s) {
      const hit = s.hits[0],
        target = subject(s),
        T = k.P(k.contact(target, s.pose.hand || target));
      const B = feet(target),
        e = s.c.t - hit.at;
      if (s.c.t < k.CAST || e > 730) return;
      if (e < 0) {
        flight(s, T, VINE, 0);
        const H = k.P(s.pose.hand || target),
          q = (s.c.t - k.CAST) / 190;
        k.blitRotated(
          icon('thorn-arrow', ['.......4.', '333333444', '.......4.'], VINE),
          k.mix(H.x, T.x, q),
          k.mix(H.y, T.y, q),
          Math.atan2(T.y - H.y, T.x - H.x),
        );
      }
      if (e >= 0 && e < 630) {
        const grow = k.ease(k.clamp(e / 190));
        for (const side of [-1, 1]) {
          const points = Array.from({ length: 25 }, (_, i) => {
            const q = i / 24;
            return { x: B.x + Math.sin(q * Math.PI * 3 + side) * (7 - q * 2), y: B.y - q * grow * 23 };
          });
          stroke(points, VINE, 2, 2);
          for (let i = 4; i < points.length; i += 5) {
            const p = points[i];
            spark(p.x + side * 2, p.y - 1, VINE, 3, 3);
            spark(p.x + side * 4, p.y - 2, VINE, 1, 4);
          }
        }
      }
      impact(s, hit, T, VINE, 36, 10);
    },
  });

  // Zephyr Strike: a pale blue weapon dash cuts a wind crescent; feathered slipstreams whip past on contact.
  FX.register('zephyr-strike', {
    palette: WIND,
    travel: 160,
    beats: (event, kit, travel) => single(event, kit, travel, 'hit', 110),
    end: (event, travel) => k.CAST + travel + 650,
    ground(s) {
      const H = s.pose.base && k.P(s.pose.base),
        B = feet(subject(s)),
        e = s.c.t - k.CAST;
      if (!H || e < 0 || e > 650) return;
      const dx = B.x - H.x,
        dy = B.y - H.y,
        L = Math.hypot(dx, dy) || 1;
      for (const side of [-1, 1]) {
        const from = k.clamp((e - 180) / 430),
          to = k.clamp(e / 160);
        const points = Array.from({ length: 19 }, (_, i) => {
          const q = k.mix(from, to, i / 18),
            off = side * (3 + Math.sin(q * Math.PI) * 5);
          return { x: k.mix(H.x, B.x, q) - (dy / L) * off, y: k.mix(H.y, B.y, q) + (dx / L) * off };
        });
        stroke(points, WIND, side < 0 ? 2 : 3);
      }
    },
    air(s) {
      const hit = s.hits[0],
        target = subject(s),
        T = k.P(k.contact(target, s.pose.hand || target));
      const H = k.P(s.pose.hand || target),
        e = s.c.t - hit.at;
      if (s.c.t < k.CAST || e > 650) return;
      if (e < 0) {
        const q = k.ease(k.clamp((s.c.t - k.CAST) / 160));
        const C = { x: k.mix(H.x, T.x, q), y: k.mix(H.y, T.y, q) };
        const a = Math.atan2(T.y - H.y, T.x - H.x);
        for (let i = 3; i >= 1; i--) {
          spark(C.x - Math.cos(a) * i * 4, C.y - Math.sin(a) * i * 4, WIND, 2, i === 1 ? 4 : 2);
        }
        k.blitRotated(icon('wind-blade', BLADE, WIND), C.x, C.y, a + Math.PI / 4);
      }
      const real = s.real(hit);
      if (real >= 0 && real < 310) {
        const f = Math.floor(real / 45);
        const img = k.sprite(`08:wind-cut:${f}`, 47, 47, WIND, set => {
          for (let y = 2; y < 45; y++) {
            for (let x = 2; x < 45; x++) {
              const dx = x - 23,
                dy = y - 23,
                r = Math.hypot(dx, dy),
                a = Math.atan2(dy, dx);
              const R = 12 + f * 1.5;
              if (a > -2.4 + f * 0.1 && a < 1.2 && r < R && r > R - 4 && Math.hypot(dx - 5, dy + 3) > R - 3) {
                set(x, y, r > R - 1.4 ? 4 : 2);
              }
            }
          }
        });
        k.blit(img, T.x - 23, T.y - 23);
      }
      impact(s, hit, T, WIND, 36, 9);
      if (real >= 110 && real < 590) {
        for (let i = 0; i < 5; i++) {
          const q = k.clamp((real - 110) / 480),
            a = k.hash(i, s.event.seed || 0) * k.tau;
          spark(T.x + Math.cos(a) * (10 + q * 18), T.y + Math.sin(a) * 10 - q * 9, WIND, 1, 3);
        }
      }
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
