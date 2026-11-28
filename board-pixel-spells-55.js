/* Pixel spells, batch 55: rebuilt silhouettes, held peaks and quiet lasting art. */
(function (root) {
  'use strict';
  const FX = root.BoardPixelFX;
  if (!FX) return;
  const k = FX.kit;
  const GOLD = ['#30200c', '#78501e', '#bd852c', '#ffd44e', '#fff2aa', '#ffffff'];
  const NECRO = ['#100b1a', '#211329', '#57306e', '#a46cce', '#caff99', '#f7ffe8'];
  const GLASS = ['#172c42', '#34556c', '#729bb5', '#badfea', '#e3f8ff', '#ffffff'];
  const BUG = ['#302314', '#79522a', '#b88c38', '#efc75d', '#ffeaa0', '#fff7d1'];
  const FEY = ['#192b24', '#3c7651', '#7bb77c', '#bff6b3', '#ffe385', '#fffde1'];
  const ALCHEMY = ['#291025', '#651c49', '#aa3368', '#ed6dbe', '#f5badc', '#fff2d8'];
  const GHOUL = ['#121a18', '#253c31', '#508b60', '#a6d59a', '#ddf4b6', '#fff9d6'];
  const THUNDER = ['#1a2136', '#4b527e', '#8d9dc2', '#c4e4f5', '#f2faff', '#ffffff'];
  const STONE = ['#28251e', '#615744', '#a89976', '#dfd0a6', '#fff1d3', '#ffffff'];
  const MUSIC = ['#29152e', '#76366b', '#bf5bc0', '#ff9ad7', '#ffe8ab', '#ffffff'];

  const age = s => s.c.t - k.CAST;
  const target = s => s.targets[0] || s.pose.target || s.pose.base;
  const body = s => k.P(target(s));
  const feet = t => k.P({ x: t.baseX ?? t.x, y: t.baseY ?? t.y + 0.55 });
  const summonAt = s => k.P(s.pose.target || s.area || target(s));
  const alphaOut = (e, start, end) => 1 - k.clamp((e - start) / (end - start));
  function beat(event, at, stop, kind = 'soft', caster = false) {
    return [{ at, stop, target: caster ? (event.caster ?? null) : (event.targets?.[0] ?? null), kind, power: 0.075 }];
  }
  function allBeats(event, at, stop, kind = 'blast') {
    return (event.targets?.length ? event.targets : [null]).map(id => ({ at, stop, target: id, kind, power: 0.085 }));
  }
  function line(A, B, ramp, tone = 4, size = 2) {
    const n = Math.max(1, Math.ceil(Math.hypot(B.x - A.x, B.y - A.y) / 1.5));
    for (const [color, w] of [
      [ramp[0], size + 2],
      [ramp[tone], size],
    ])
      for (let i = 0; i <= n; i++) k.dot(k.mix(A.x, B.x, i / n), k.mix(A.y, B.y, i / n), color, w);
  }
  function spark(x, y, ramp, r = 3) {
    k.dot(x, y, ramp[0], r * 2 + 3);
    k.dot(x, y, ramp[4], r * 2 + 1);
    k.dot(x - r, y - r, ramp[0], r);
    k.dot(x + r, y - r, ramp[0], r);
    k.dot(x - r, y + r, ramp[0], r);
    k.dot(x + r, y + r, ramp[0], r);
    k.dot(x, y, ramp[5], 2);
  }
  function pixels(key, rows, ramp, reveal = 1) {
    const cut = Math.floor((1 - reveal) * rows.length);
    return k.sprite('55:' + key + ':' + cut, rows[0].length + 2, rows.length + 2, ramp, set => {
      rows.forEach((row, y) => {
        if (y >= rows.length - cut) return;
        [...row].forEach((v, x) => {
          if (v !== '.') set(x + 1, y + 1, +v);
        });
      });
    });
  }
  function centered(img, x, y, alpha = 1) {
    k.blit(img, x - img.width / 2, y - img.height / 2, alpha);
  }
  // Raster rings are cached: a 30-foot wave costs one blit, not thousands of dots.
  function ring(C, rx, ry, ramp, w = 3, alpha = 1, broken = false) {
    rx = Math.max(2, Math.round(rx));
    ry = Math.max(2, Math.round(ry));
    const W = rx * 2 + 8,
      H = ry * 2 + 8;
    const img = k.sprite(`55:ring:${ramp[3]}:${rx}:${ry}:${w}:${broken}`, W, H, ramp, set => {
      for (let y = 1; y < H - 1; y++)
        for (let x = 1; x < W - 1; x++) {
          const dx = x - W / 2,
            dy = y - H / 2;
          const d = (Math.hypot(dx / rx, dy / ry) - 1) * Math.min(rx, ry);
          if (Math.abs(d) > w / 2) continue;
          if (broken && Math.floor((Math.atan2(dy, dx) + Math.PI) * 9) % 4 === 0) continue;
          set(x, y, d < -0.4 ? 3 : d < 0.7 ? 5 : 4);
        }
    });
    centered(img, C.x, C.y, alpha);
  }
  function landing(s, key, ramp, size = 38, shards = 10) {
    s.hits.forEach((h, i) => {
      const t = s.targets.find(t => t.id === h.id) || target(s);
      const T = k.P(t),
        real = s.real(h);
      k.drawHit(k.hitStyle('55:' + key, ramp, { S: size, spikes: 7, jag: 0.35 }), T, real);
      k.shards(T, real, ramp, (s.event.seed || 0) + i * 17, shards, size * 0.7);
    });
  }
  function delivery(s, ramp, dest, duration) {
    const e = age(s);
    if (e < 0 || e >= duration || !s.pose.hand) return;
    const H = k.P(s.pose.hand),
      q = e / duration;
    for (let i = 5; i >= 0; i--) {
      const u = Math.max(0, q - i * 0.055);
      const x = k.mix(H.x, dest.x, u),
        y = k.mix(H.y, dest.y, u) - Math.sin(u * Math.PI) * 10;
      k.dot(x, y, ramp[0], i ? 5 : 9);
      k.dot(x, y, ramp[i ? 3 : 5], i ? 3 : 7);
    }
  }
  function motes(s, C, ramp, radius, count = 8, speed = 450) {
    for (let i = 0; i < count; i++) {
      const a = (i * k.tau) / count + s.c.raw / speed;
      spark(C.x + Math.cos(a) * radius, C.y + Math.sin(a) * radius * 0.6, ramp, 1);
    }
  }
  function cracks(C, radius, seed, ramp, alpha = 1) {
    const R = Math.round(radius),
      W = R * 2 + 10,
      H = R * 2 + 10;
    const img = k.sprite(`55:cracks:${R}:${seed}:${ramp[3]}`, W, H, ramp, set => {
      for (let i = 0; i < 12; i++) {
        const a = (i * k.tau) / 12 + k.hash(i, seed) * 0.2;
        for (let j = 0; j < R * 0.45; j++) {
          const rr = R * 0.66 + j,
            bend = Math.floor(j / 4) % 2 ? 2 : -1;
          const x = Math.round(W / 2 + Math.cos(a) * rr - Math.sin(a) * bend);
          const y = Math.round(H / 2 + Math.sin(a) * rr * 0.58 + Math.cos(a) * bend);
          set(x, y, 3);
          set(x + 1, y, 4);
        }
      }
    });
    centered(img, C.x, C.y, alpha);
  }
  const SKULL = [
    '..44444..',
    '.4555554.',
    '455555554',
    '451151154',
    '451151154',
    '.4551554.',
    '..44444..',
    '..51515..',
  ];
  // Flowing pillar and radial rupture use different silhouettes, with a shared sickly core.
  function necroticFrame(mode, frame, seed) {
    const W = 64,
      H = 72,
      f = Math.min(13, frame);
    return k.sprite(`55:necro:${mode}:${f}:${seed}`, W, H, NECRO, set => {
      const grow = f < 4 ? 0.45 + 0.55 * k.ease(f / 3) : f < 9 ? 1 : 1 - (f - 9) * 0.12;
      for (let y = 2; y < H - 2; y++)
        for (let x = 2; x < W - 2; x++) {
          const dx = x - 32,
            dy = y - 42;
          let d;
          if (mode === 'flood') {
            const height = (65 - y) / 57;
            if (height < 0 || height > grow) continue;
            const edge = (9 + (1 - height) * 12 + Math.sin(height * 15 + f) * 4) * grow;
            d = Math.abs(dx) / edge;
            if (d > 1 || (height > 0.78 && Math.cos(dx * 0.6 + height * 12) < -0.3)) continue;
            if (d < 0.25 && height < 0.9) set(x, y, f < 2 ? 5 : 4 + (Math.abs(dx) < 3 ? 1 : 0));
            else set(x, y, d > 0.8 ? 3 : d > 0.6 ? 2 : 1);
          } else {
            const a = Math.atan2(dy, dx),
              r = 22 * grow * (1 + 0.3 * Math.abs(Math.cos(a * 7 + seed)) ** 4);
            d = Math.hypot(dx, dy * 0.86) / r;
            if (d > 1) continue;
            set(x, y, d < 0.25 ? 5 : d < 0.4 ? 4 : d < 0.72 ? 1 : d < 0.87 ? 2 : 3);
          }
        }
    });
  }

  // Negative Energy Flood: a black-violet torrent with a green-white heart and rising skulls.
  FX.register('negative-energy-flood', {
    palette: NECRO,
    travel: 180,
    beats: event => beat(event, k.CAST + 180, 170, 'blast'),
    end: () => 1480,
    flash: (event, e) => (e < 40 ? { color: NECRO[4], alpha: 0.2 } : e < 95 ? { color: NECRO[0], alpha: 0.12 } : null),
    ground(s) {
      const e = age(s) - 180,
        T = body(s);
      if (e < 0) return;
      const f = Math.min(13, Math.floor(e / 65));
      centered(necroticFrame('flood', f, s.event.seed || 0), T.x, T.y - 3, alphaOut(e, 780, 1000));
      ring(feet(target(s)), 18, 9, NECRO, 3, alphaOut(e, 750, 1000));
    },
    air(s) {
      const T = body(s),
        e = age(s) - 180;
      delivery(s, NECRO, T, 180);
      if (e < 0) return;
      landing(s, 'negative-flood', NECRO, 46, 14);
      if (e < 620) {
        // The heart of the torrent crests above the miniature as well as behind it.
        const C = { x: T.x, y: T.y - 18 };
        k.disc(C.x, C.y, 6, NECRO[0]);
        k.disc(C.x, C.y, 5, NECRO[4]);
        k.disc(C.x, C.y - 1, 3, NECRO[5]);
        line({ x: C.x, y: C.y + 4 }, { x: C.x + 2, y: C.y + 11 }, NECRO, 4, 3);
      }
      if (e < 710) {
        const img = pixels('skull', SKULL, NECRO);
        for (let i = 0; i < 3; i++) {
          const u = (s.c.raw / 850 + i / 3) % 1;
          centered(img, T.x + Math.sin(u * 8 + i) * 12, T.y + 9 - u * 35, u < 0.8 ? 1 : 0.5);
        }
      } else spark(T.x, T.y + 6, NECRO, 2);
    },
  });

  // Destructive Wave: heavy concentric thunder/holy shock fronts roll over a cracked 30-foot floor.
  FX.register('destructive-wave', {
    palette: GOLD,
    travel: 110,
    beats: event => allBeats(event, k.CAST + 110, 180),
    end: () => 1500,
    flash: (event, e) =>
      e < 45 ? { color: GOLD[5], alpha: 0.24 } : e < 100 ? { color: THUNDER[0], alpha: 0.12 } : null,
    ground(s) {
      const e = age(s) - 110;
      if (e < 0) return;
      const C = k.P(s.area || s.pose.base),
        R = ((s.area?.feet || 30) / (s.grid.feet || 5)) * 16;
      const q = k.clamp(e / 430),
        rr = R * (0.12 + 0.88 * k.ease(q));
      cracks(C, R * k.ease(k.clamp(e / 380)), s.event.seed || 0, STONE, alphaOut(e, 740, 1090));
      if (e > 300) ring(C, R * 0.96, R * 0.96, STONE, 3, alphaOut(e, 740, 1090), true);
      if (e < 820) {
        ring(C, rr, rr, THUNDER, 4, alphaOut(e, 600, 820));
        ring(C, rr * 0.83, rr * 0.83, GOLD, 3, alphaOut(e, 580, 820));
        ring(C, rr * 0.61, rr * 0.61, THUNDER, 3, alphaOut(e, 540, 800));
      }
      if (e < 650)
        for (let i = 0; i < 16; i++) {
          const real = s.hits[0] ? s.real(s.hits[0]) : e;
          const a = (i * k.tau) / 16,
            r = R * (0.12 + 0.88 * k.ease(k.clamp(real / 550))) * (0.9 + k.hash(i, s.event.seed) * 0.12);
          const x = C.x + Math.cos(a) * r,
            y = C.y + Math.sin(a) * r;
          k.disc(x, y, 4, STONE[0]);
          k.disc(x, y - 1, 3, STONE[3]);
        }
    },
    air(s) {
      if (age(s) < 110) return;
      landing(s, 'destructive-wave', GOLD, 36, 8);
      const h = s.hits[0];
      if (h) k.shards(k.P(s.pose.base), s.real(h), THUNDER, s.event.seed || 0, 16, 50);
    },
  });

  function locust(frame) {
    return pixels(
      'locust:' + frame,
      frame
        ? ['.44.44.', '..434..', '.33333.', '..212..', '.2...2.']
        : ['..4.4..', '.44344.', '..333..', '.22122.', '2.....2'],
      BUG,
    );
  }
  function swarm(s, alpha, release = false) {
    const C = k.P(s.area || s.pose.target || target(s));
    const R = ((s.area?.feet || 20) / (s.grid.feet || 5)) * 16;
    const progress = release ? 0.25 + 0.75 * k.ease(k.clamp((age(s) - 150) / 240)) : 1;
    ring(C, R * progress, R * progress, BUG, 2, alpha * 0.75, true);
    // Fill the area, rather than placing the insects only on its rim. All bugs remain below figures.
    for (let i = 0; i < 116; i++) {
      const a = i * 2.39996 + s.c.raw / (release ? 650 : 3000) + k.hash(i, s.event.seed) * 0.35;
      const r = Math.sqrt((i + 0.5) / 116) * (R - 4) * progress;
      const x = C.x + Math.cos(a) * r,
        y = C.y + Math.sin(a) * r;
      centered(locust((Math.floor(s.c.raw / 160) + i) % 2), x, y, alpha);
    }
    // A second, raised spiral gives the swarm volume without covering any miniatures.
    for (let i = 0; i < 20; i++) {
      const a = i * 2.4 + s.c.raw / 2100,
        r = R * (0.3 + k.hash(i, s.event.seed, 8) * 0.55) * progress;
      centered(locust(i % 2), C.x + Math.cos(a) * r, C.y + Math.sin(a) * r * 0.7 - 12, alpha * 0.75);
    }
  }
  // Insect Plague: a dense yellow/tan locust sphere, continuously swirling while the zone lasts.
  FX.register('insect-plague', {
    palette: BUG,
    travel: 150,
    beats: event => allBeats(event, k.CAST + 150, 85, 'hit'),
    end: () => 1290,
    ground(s) {
      if (age(s) >= 0 && age(s) < 150) ring(k.P(s.area || target(s)), 12 + age(s) / 8, 10, BUG);
      else if (age(s) >= 150 && !(s.pose.linger > 0)) swarm(s, alphaOut(age(s), 650, 990), true);
    },
    air(s) {
      if (age(s) >= 150) landing(s, 'locust-bites', BUG, 26, 6);
    },
    linger(s) {
      swarm(s, s.linger, false);
    },
  });

  function badge() {
    return k.sprite('55:skill-badge', 29, 29, GOLD, set => {
      const pts = [];
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5,
          r = i % 2 ? 6 : 12;
        pts.push([14 + Math.cos(a) * r, 14 + Math.sin(a) * r]);
      }
      for (let y = 1; y < 28; y++)
        for (let x = 1; x < 28; x++) {
          let inside = false;
          for (let i = 0, j = 9; i < 10; j = i++) {
            const A = pts[i],
              B = pts[j];
            if (A[1] > y !== B[1] > y && x < ((B[0] - A[0]) * (y - A[1])) / (B[1] - A[1]) + A[0]) inside = !inside;
          }
          if (inside) set(x, y, Math.hypot(x - 14, y - 14) < 5 ? 2 : y < 12 ? 5 : 3);
        }
      // A bold ascending skill rune, inset in the badge.
      for (let y = 9; y <= 19; y++) for (let x = 13; x <= 15; x++) set(x, y, 5);
      for (let j = 0; j < 5; j++) {
        set(14 - j, 12 + j, 5);
        set(15 - j, 12 + j, 5);
        set(14 + j, 12 + j, 5);
        set(13 + j, 12 + j, 5);
      }
    });
  }
  // Skill Empowerment: a full gold star badge crowns the target, an ascending skill rune at its centre.
  FX.register('skill-empowerment', {
    palette: GOLD,
    travel: 200,
    beats: event => beat(event, k.CAST + 200, 85),
    end: () => 1420,
    ground(s) {
      const e = age(s) - 200;
      if (e >= 0) ring(feet(target(s)), 13, 7, GOLD, 3, alphaOut(e, 550, 900));
    },
    air(s) {
      const T = body(s),
        e = age(s) - 200;
      delivery(s, GOLD, T, 200);
      if (e < 0) return;
      const rise = 9 * k.ease(k.clamp(e / 160));
      centered(badge(), T.x, T.y - 12 - rise, alphaOut(e, 620, 900));
      if (e < 680) motes(s, { x: T.x, y: T.y - 13 }, GOLD, 21, 6);
      const h = s.hits[0];
      if (h) {
        k.drawHit(k.hitStyle('55:skill', GOLD, { S: 30, spikes: 4 }), T, s.real(h));
        k.shards(T, s.real(h), GOLD, s.event.seed || 0, 7, 18);
      }
    },
  });

  function wallShape(s) {
    if (s.area) return s.area;
    // The lab can cast a wall without a template; give that preview a short pane at its aim.
    const T = target(s),
      H = s.pose.hand || T;
    const dir = Math.atan2(T.y - H.y, T.x - H.x);
    return {
      x: T.x - Math.cos(dir) * 1.5,
      y: (T.baseY ?? T.y + 0.55) - Math.sin(dir) * 1.5,
      feet: 15,
      height: 10,
      dir,
    };
  }
  function forcePane(s, alpha, growth = 1) {
    const a = wallShape(s);
    const C = k.P(a),
      length = ((a.feet || 30) / (s.grid.feet || 5)) * 16;
    const dx = Math.round(Math.cos(a.dir || 0) * length),
      dy = Math.round(Math.sin(a.dir || 0) * length);
    const height = Math.max(20, Math.round(((a.height || 10) / (s.grid.feet || 5)) * 16));
    const lean = Math.round(height * 0.5 * (1 - Math.abs(dx) / Math.max(1, length)));
    const h = Math.max(2, Math.round(height * growth));
    const minX = Math.min(0, dx) - 4,
      minY = Math.min(0, dy) - height - 4;
    const W = Math.abs(dx) + lean + 9,
      H = Math.abs(dy) + height + 9;
    const frame = Math.floor(s.c.raw / 320) % 4;
    const img = k.sprite(
      `55:pane:${dx}:${dy}:${height}:${h}:${frame}`,
      W,
      H,
      GLASS,
      set => {
        // Sampling along the baseline also handles an almost vertical wall without special cases.
        const n = Math.max(Math.abs(dx), Math.abs(dy), 1);
        // Outline the pane's perimeter, leaving its transparent interior free of dark dither halos.
        for (let i = -1; i <= n + 1; i++) {
          const bx = Math.round((dx * i) / n - minX),
            by = Math.round((dy * i) / n - minY);
          for (let j = -1; j <= h + 1; j++) {
            if (j < 0 || j > h || i < 1 || i > n - 1) {
              const x = bx + Math.round((lean * j) / height);
              set(x - 1, by - j, 0);
              set(x, by - j, 0);
              set(x + 1, by - j, 0);
            }
          }
        }
        for (let i = 0; i <= n; i++) {
          const bx = Math.round((dx * i) / n - minX),
            by = Math.round((dy * i) / n - minY);
          for (let j = 0; j <= h; j++) {
            const x = bx + Math.round((lean * j) / height),
              y = by - j,
              edge = j < 2 || j > h - 3 || i < 2 || i > n - 2;
            if (edge) set(x, y, j > h - 3 ? 5 : 4);
            else if (k.dith(x, y) < 0.28) set(x, y, 3);
            // Sparse broad diagonal reflections, never a dark wire lattice.
            else if ((x + y + frame * 2) % 38 < 3 && k.dith(x, y) < 0.6) set(x, y, 4);
          }
        }
      },
      false,
    );
    k.blit(img, C.x + minX, C.y + minY, alpha);
  }
  // Wall of Force: a broad, pale dithered glass pane rises with white bevels and slow reflections.
  FX.register('wall-of-force', {
    palette: GLASS,
    travel: 180,
    beats: event => beat(event, k.CAST + 180, 90, 'soft', true),
    end: () => 1260,
    reach: (event, grid) => ({ r: (event.area?.feet || 60) / (grid.feet || 5) + 1, up: 4 }),
    ground(s) {
      if (age(s) >= 0 && age(s) < 180) forcePane(s, 1, k.ease(age(s) / 180));
      else if (age(s) >= 180 && !(s.pose.linger > 0)) forcePane(s, alphaOut(age(s), 650, 960));
    },
    air(s) {
      if (age(s) < 180 || age(s) > 600) return;
      const a = wallShape(s),
        C = k.P(a),
        L = ((a.feet || 30) / (s.grid.feet || 5)) * 16;
      const height = Math.max(20, ((a.height || 10) / (s.grid.feet || 5)) * 16);
      const lean = height * 0.5 * (1 - Math.abs(Math.cos(a.dir || 0)));
      for (let i = 0; i < 6; i++) {
        const q = (i + 0.5) / 6;
        spark(C.x + Math.cos(a.dir || 0) * L * q + lean, C.y + Math.sin(a.dir || 0) * L * q - height, GLASS, 2);
      }
      const h = s.hits[0];
      if (h) k.shards(C, s.real(h), GLASS, s.event.seed || 0, 8, 22);
    },
    linger(s) {
      forcePane(s, s.linger);
    },
  });

  const FEY_ROWS = [
    '...4.....4.....4...',
    '....44..444..44....',
    '.....444444444.....',
    '......3333333......',
    '.....355355353.....',
    '.....335335333.....',
    '......3333333......',
    '.......33333.......',
    '...3..4343434..3...',
    '..333334444433333..',
    '.33333334343333333.',
    '3333.333333333.3333',
    '.33..23333332..33..',
    '.....23333332......',
    '....2333333332.....',
    '...233333333332....',
    '..23333333333332...',
    '.....33...33.......',
    '.....34...43.......',
    '....444...444......',
  ];
  function flower(C, i) {
    const img = pixels('flower:' + (i % 2), ['..4..', '.434.', '43434', '.434.', '..2..', '.22..'], i % 2 ? GOLD : FEY);
    centered(img, C.x, C.y);
  }

  function clockwork(frame) {
    return k.sprite('55:clockwork:' + frame, 53, 53, GOLD, set => {
      for (let y = 1; y < 52; y++)
        for (let x = 1; x < 52; x++) {
          const dx = x - 26,
            dy = y - 26,
            d = Math.hypot(dx, dy),
            a = Math.atan2(dy, dx) + (frame * k.tau) / 16;
          const tooth = Math.floor(((a + k.tau * 2) * 12) / k.tau) % 2 === 0;
          if (Math.abs(d - 20) < 1.5 || Math.abs(d - 15) < 1 || (tooth && d > 21 && d < 24)) set(x, y, d < 20 ? 3 : 4);
          if (d > 10 && d < 17 && Math.abs(Math.sin(a * 6)) < 0.15) set(x, y, 5);
        }
      for (let y = 14; y < 27; y++) {
        set(26, y, 5);
        set(27, y, 5);
      }
      for (let j = 0; j < 9; j++) {
        set(26 + j, 26 + j, 4);
        set(27 + j, 26 + j, 4);
      }
    });
  }
  const GEM = [
    '....5....',
    '...454...',
    '..45554..',
    '.4455544.',
    '444555444',
    '.3445443.',
    '..34443..',
    '...343...',
    '....3....',
  ];
  // Contingency: a gold clockwork cage turns around the caster; a gem snaps into its twelve-o'clock socket.
  FX.register('contingency', {
    palette: GOLD,
    travel: 300,
    beats: event => beat(event, k.CAST + 300, 100, 'soft', true),
    end: () => 1620,
    ground(s) {
      const e = age(s),
        C = k.P(s.pose.base);
      if (e >= 0) ring(C, 23, 12, GOLD, 3, alphaOut(e, 680, 1080));
    },
    air(s) {
      const e = age(s),
        B = k.P(s.pose.base),
        C = { x: B.x, y: B.y - 13 };
      if (e < 0) return;
      const frame = e < 300 ? Math.floor(e / 45) % 16 : 6;
      centered(clockwork(frame), C.x, C.y, alphaOut(e, 620, 970));
      const q = k.ease(k.clamp(e / 300)),
        gemY = C.y - 21 - (1 - q) * 13;
      centered(pixels('contingency-gem', GEM, GOLD), C.x, gemY, e > 1000 ? 0.5 : 1);
      if (e >= 300) {
        const h = s.hits[0],
          G = { x: C.x, y: C.y - 21 };
        if (h) {
          k.drawHit(k.hitStyle('55:gem-click', GOLD, { S: 28, spikes: 4 }), G, s.real(h));
          k.shards(G, s.real(h), GOLD, s.event.seed || 0, 6, 14);
        }
        if (e > 970) ring(G, 7, 7, GOLD, 2, 0.5);
      }
    },
  });

  const HOMUNCULUS = [
    '4...........4',
    '44...4.4...44',
    '434..444..434',
    '4334333334334',
    '4333353533334',
    '.43333333334.',
    '..43.333.34..',
    '......3......',
    '....43334....',
    '....33333....',
    '.....333.....',
    '....33.33....',
    '.2..34.43....',
    '..222........',
  ];

  const GHOUL_ROWS = [
    '....33333....',
    '...3444443...',
    '...4114114...',
    '...3441443...',
    '....45554....',
    '..3.33333.3..',
    '.33333333333.',
    '3332333332333',
    '34.2333332.43',
    '45..23332..54',
    '5...23332...5',
    '....33333....',
    '....33.33....',
    '...333.333...',
    '..344...443..',
  ];
  // Create Undead: three toothy, long-clawed ghouls heave out of green-black grave ruptures.
  FX.register('create-undead', {
    palette: GHOUL,
    travel: 260,
    beats: event => beat(event, k.CAST + 260, 150),
    end: () => 1720,
    ground(s) {
      const e = age(s),
        C = summonAt(s);
      if (e < 0) return;
      for (let i = 0; i < 3; i++) {
        const B = { x: C.x + (i - 1) * 18, y: C.y + (i === 1 ? -8 : 3) };
        ring(B, 10, 5, GHOUL, 3, alphaOut(e, 950, 1350));
        if (e > 200) cracks(B, 13, (s.event.seed || 0) + i, GHOUL, alphaOut(e, 950, 1350));
        if (e >= 260 && e < 750) {
          k.disc(B.x, B.y - 3, 8, GHOUL[0]);
          k.disc(B.x, B.y - 4, 6, GHOUL[3]);
        }
      }
    },
    air(s) {
      const e = age(s) - 260,
        C = summonAt(s);
      if (e < 0) return;
      const h = s.hits[0];
      for (let i = 0; i < 3; i++) {
        const B = { x: C.x + (i - 1) * 18, y: C.y + (i === 1 ? -8 : 3) };
        if (h) {
          k.drawHit(k.hitStyle('55:grave', GHOUL, { S: 32, spikes: 5 }), B, s.real(h) - i * 45);
          k.shards(B, s.real(h) - i * 45, STONE, (s.event.seed || 0) + i, 7, 20);
        }
        const q = k.clamp((e - i * 45) / 230),
          reveal = Math.min(4, Math.floor(q * 4)) / 4;
        const img = pixels('ghoul', GHOUL_ROWS, GHOUL, reveal);
        k.blit(img, B.x - img.width / 2, B.y - img.height + 3 + (1 - q) * GHOUL_ROWS.length, alphaOut(e, 1000, 1160));
      }
    },
  });

  function shell(frame) {
    const ramps = [k.palettes.FIRE, k.palettes.frost, STONE];
    const pal = [STONE[0], ...ramps.map(r => r[3]), ...ramps.map(r => r[4]), '#ffffff'];
    return k.sprite('55:element-shell:' + frame, 43, 53, pal, set => {
      for (let y = 1; y < 52; y++)
        for (let x = 1; x < 42; x++) {
          const dx = (x - 21) / 19,
            dy = (y - 26) / 24,
            d = Math.hypot(dx, dy);
          if (d < 0.73 || d > 1) continue;
          const a = Math.atan2(dy, dx) + (frame * k.tau) / 12 + k.tau * 2;
          const elem = Math.floor((a * 3) / k.tau) % 3;
          set(x, y, d > 0.9 ? elem + 4 : d > 0.8 ? elem + 1 : 7);
        }
    });
  }
  const ELEMENT_RUNES = [
    ['...4...', '..44...', '..434..', '.43334.', '4333334', '.44444.'],
    ['4..4..4', '.4.4.4.', '..444..', '4445444', '..444..', '.4.4.4.', '4..4..4'],
    ['..444..', '.43334.', '4333334', '4333334', '.44444.'],
  ];
  // Primordial Ward: a large fire/ice/stone shell encloses the figure with three bold orbiting element glyphs.
  FX.register('primordial-ward', {
    palette: GLASS,
    travel: 210,
    beats: event => beat(event, k.CAST + 210, 105),
    end: () => 1570,
    ground(s) {
      const e = age(s) - 210;
      if (e >= 0) ring(feet(target(s)), 21, 11, STONE, 3, alphaOut(e, 760, 1120));
    },
    air(s) {
      const T = body(s),
        e = age(s) - 210;
      delivery(s, GLASS, T, 210);
      if (e < 0) return;
      const alpha = alphaOut(e, 780, 1110);
      centered(shell(Math.floor(s.c.raw / 120) % 12), T.x, T.y - 4, alpha);
      const ramps = [k.palettes.FIRE, k.palettes.frost, STONE];
      for (let i = 0; i < 3; i++) {
        const a = (i * k.tau) / 3 + s.c.raw / 650;
        centered(
          pixels('element-rune:' + i, ELEMENT_RUNES[i], ramps[i]),
          T.x + Math.cos(a) * 23,
          T.y - 4 + Math.sin(a) * 20,
          alpha,
        );
      }
      const h = s.hits[0];
      if (h) {
        k.drawHit(k.hitStyle('55:ward-lock', GLASS, { S: 34, spikes: 4 }), T, s.real(h));
        k.shards(T, s.real(h), STONE, s.event.seed || 0, 10, 28);
      }
    },
  });

  // Harm: an enormous black-violet rupture, green-white core, and luminous-edged dark fractures on the body.
  FX.register('harm', {
    palette: NECRO,
    travel: 170,
    beats: event => beat(event, k.CAST + 170, 210, 'blast'),
    end: () => 1460,
    flash: (event, e) =>
      e < 45 ? { color: NECRO[5], alpha: 0.24 } : e < 120 ? { color: NECRO[0], alpha: 0.16 } : null,
    ground(s) {
      const e = age(s) - 170,
        T = body(s);
      if (e < 0) return;
      centered(necroticFrame('harm', Math.floor(e / 60), s.event.seed || 0), T.x, T.y - 2, alphaOut(e, 740, 990));
      cracks(feet(target(s)), 23, s.event.seed || 0, NECRO, alphaOut(e, 730, 990));
    },
    air(s) {
      const e = age(s) - 170,
        T = body(s);
      delivery(s, NECRO, T, 170);
      if (e < 0) return;
      landing(s, 'harm', NECRO, 56, 18);
      if (e < 310) {
        k.disc(T.x, T.y - 3, 9, NECRO[0]);
        k.disc(T.x, T.y - 3, 8, NECRO[4]);
        k.disc(T.x, T.y - 4, 4, NECRO[5]);
      }
      if (e < 750) {
        const img = k.sprite('55:harm-body-cracks', 27, 35, NECRO, set => {
          const paths = [
            [
              [13, 3],
              [10, 9],
              [15, 14],
              [10, 21],
              [14, 30],
            ],
            [
              [4, 11],
              [10, 14],
              [17, 12],
              [23, 18],
            ],
            [
              [8, 27],
              [14, 23],
              [22, 26],
            ],
          ];
          paths.forEach(points =>
            points.slice(1).forEach((B, i) => {
              const A = points[i],
                n = Math.ceil(Math.hypot(B[0] - A[0], B[1] - A[1]));
              for (let j = 0; j <= n; j++) {
                const x = Math.round(k.mix(A[0], B[0], j / n)),
                  y = Math.round(k.mix(A[1], B[1], j / n));
                set(x - 1, y, 4);
                set(x, y, 1);
                set(x + 1, y, 1);
              }
            }),
          );
        });
        centered(img, T.x, T.y, e > 600 ? 0.5 : 1);
      } else ring(feet(target(s)), 12, 6, NECRO, 2, 0.5);
    },
  });

  function musicNote(variant) {
    return pixels(
      'note:' + variant,
      variant
        ? [
            '....444444444',
            '....455555554',
            '....44....444',
            '....44....444',
            '....44....444',
            '....44....444',
            '.44444.444444',
            '4555544555554',
            '4555544555554',
            '.4444..44444.',
          ]
        : [
            '.....44....',
            '.....444...',
            '.....4544..',
            '.....45544.',
            '.....44.44.',
            '.....44....',
            '.....44....',
            '..44444....',
            '.455554....',
            '.455554....',
            '..4444.....',
          ],
      MUSIC,
    );
  }
  function spotlight() {
    const rainbow = ['#2a1936', '#ff859f', '#ffd473', '#b5ed9a', '#95def7', '#d2a9ff', '#ffffff'];
    return k.sprite(
      '55:rainbow-spotlight',
      57,
      67,
      rainbow,
      set => {
        for (let y = 2; y < 65; y++)
          for (let x = 1; x < 56; x++) {
            const half = 6 + y * 0.29,
              dx = x - 28;
            if (Math.abs(dx) > half) continue;
            if (Math.abs(Math.abs(dx) - half) < 0.6) set(x, y, 0);
            else if (Math.abs(Math.abs(dx) - half) < 1.8) set(x, y, 6);
            else if (k.dith(x, y) < 0.24) set(x, y, 1 + Math.min(4, Math.floor(((dx + half) / (half * 2)) * 5)));
          }
      },
      false,
    );
  }
  // Otto's Irresistible Dance: huge dancing notes circle a rainbow-lit figure with bobbing hands and stepping shoes.
  FX.register('ottos-irresistible-dance', {
    palette: MUSIC,
    travel: 190,
    beats: event => beat(event, k.CAST + 190, 85),
    end: () => 1890,
    ground(s) {
      const e = age(s) - 190,
        T = target(s);
      if (e < 0) return;
      const B = feet(T),
        alpha = alphaOut(e, 1050, 1390);
      centered(spotlight(), B.x, B.y - 30, alpha);
      ring(B, 23, 10, MUSIC, 3, alpha);
      ring(B, 17, 6, GOLD, 2, alpha);
    },
    air(s) {
      const T = body(s),
        e = age(s) - 190;
      delivery(s, MUSIC, T, 190);
      if (e < 0) return;
      const alpha = alphaOut(e, 1120, 1400),
        beat = Math.floor(e / 150),
        bob = Math.sin(e / 95);
      const B = feet(target(s));
      for (let i = 0; i < 5; i++) {
        const a = (i * k.tau) / 5 + e / 440;
        centered(musicNote(i % 2), T.x + Math.cos(a) * 24, T.y - 8 + Math.sin(a) * 20, alpha);
      }
      if (e < 1200) {
        // A hollow dancing outline hugs the existing miniature; only its hands and shoes are filled.
        // This is art only: no token coordinates or figure animation state are changed.
        const img = k.sprite('55:dance-pose:' + (beat % 4), 31, 36, MUSIC, set => {
          const side = beat % 2 ? 1 : -1,
            cx = 15 + side * 2;
          for (let y = 9; y < 28; y++) {
            const w = y < 15 ? 6 : y < 24 ? 4 : 5;
            set(cx - w, y, 4);
            set(cx + w, y, 4);
          }
          for (let j = 0; j < 8; j++) {
            set(cx - 6 - j, 14 - side * j, 3);
            set(cx - 6 - j, 15 - side * j, 4);
            set(cx + 6 + j, 14 + side * j, 3);
            set(cx + 6 + j, 15 + side * j, 4);
          }
          for (let y = 29; y < 33; y++)
            for (let x = 0; x < 7; x++) {
              set(cx - 9 + x, y - (side > 0 ? 3 : 0), 4);
              set(cx + 3 + x, y - (side < 0 ? 3 : 0), 3);
            }
        });
        centered(img, T.x + Math.round(bob * 2), B.y - 14 - Math.round(Math.abs(bob) * 2), alpha);
      }
      const h = s.hits[0];
      if (h) {
        k.drawHit(k.hitStyle('55:dance-downbeat', MUSIC, { S: 34, spikes: 4 }), T, s.real(h));
        k.shards(T, s.real(h), GOLD, s.event.seed || 0, 8, 24);
      }
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
