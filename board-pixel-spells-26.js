/* Pixel spells, batch 26 (see docs/pixel-spells/BRIEF.md). */
(function (root) {
  'use strict';
  const FX = root.BoardPixelFX;
  if (!FX) return;
  const k = FX.kit;
  const INK = ['#080912', '#141321', '#282438', '#514663', '#8e7d9e', '#dcd5e8'];
  const MIRAGE = ['#181129', '#36374c', '#587548', '#9db474', '#c3c7bb', '#f8e4ff'];
  const ICE = ['#101c30', '#28456d', '#4b8bb3', '#9ad5ed', '#e0f7ff', '#ffffff'];
  const GOLD = ['#2b1b18', '#72502d', '#b98b3e', '#f5ce6c', '#fff2bf', '#ffffff'];
  const LIFE = ['#10201c', '#285542', '#519b75', '#a7e5a0', '#f4f4c5', '#ffffff'];
  const ARC = ['#17102e', '#3c286b', '#7753b1', '#bc95ef', '#eddaff', '#ffffff'];
  const ROSE = ['#25102a', '#65335e', '#a15a9b', '#e997cf', '#f8d6f1', '#ffffff'];
  const VOID = ['#100d23', '#292440', '#534a70', '#8c7ca7', '#cfbddc', '#faf0ff'];
  const WOOD = ['#21171d', '#59402e', '#9c7250', '#d9b27b', '#f4dfb7', '#ffffff'];
  const ART = {
    sword: [
      '......4..',
      '.....454.',
      '....454..',
      '...454...',
      '..454....',
      '.343.....',
      '33433....',
      '..32.....',
      '.32......',
    ],
    mask: ['.333...333.', '34443344443', '34324442343', '.344434443.', '..3434343..', '...34443...', '....333....'],
    shield: [
      '.3333333.',
      '344444443',
      '343353343',
      '343353343',
      '.4335334.',
      '.4333334.',
      '..43334..',
      '...434...',
      '....3....',
    ],
    lock: [
      '...333...',
      '..34443..',
      '..34.43..',
      '..34.43..',
      '.3333333.',
      '.3444443.',
      '.3432343.',
      '.3442443.',
      '.3333333.',
    ],
    quiver: [
      '.4...4.4..',
      '..4.4.4...',
      '...444....',
      '..33333...',
      '..34443...',
      '..34243...',
      '..34243...',
      '..34243...',
      '..34443...',
      '...333....',
    ],
    arrow: [
      '......4....',
      '.....454...',
      '......3....',
      '......3....',
      '......3....',
      '......3....',
      '.....343...',
      '....34.43..',
    ],
    cup: ['.33333...', '.3444333.', '.34243.3.', '.3424333.', '..343....', '..343....', '.33333...'],
    chair: ['.33...33.', '.34...43.', '.3433343.', '.3444443.', '.3333333.', '.34...43.', '.34...43.'],
    key: ['..333....', '.34443...', '.34243...', '..343....', '...343...', '....3433.', '.....343.'],
    diamond: ['....4....', '...454...', '..45554..', '.3455543.', '..34543..', '...343...', '....3....'],
  };

  function mote(x, y, ramp, size = 1, shade = 4) {
    k.dot(x, y, ramp[0], size + 2);
    k.dot(x, y, ramp[shade], size);
  }
  function stamp(name, C, ramp, angle = 0) {
    const rows = ART[name],
      w = Math.max(...rows.map(row => row.length)) + 2;
    const img = k.sprite(`26:art:${name}:${ramp[2]}`, w, rows.length + 2, ramp, set => {
      rows.forEach((row, y) =>
        [...row].forEach((v, x) => {
          if (v !== '.') set(x + 1, y + 1, +v);
        }),
      );
    });
    k.blitRotated(img, C.x, C.y, angle);
  }
  function ring(C, rx, ry, ramp, runes = false, phase = 0, alpha = 1) {
    rx = Math.max(2, Math.round(rx));
    ry = Math.max(2, Math.round(ry));
    const w = rx * 2 + 8,
      h = ry * 2 + 8;
    const img = k.sprite(`26:ring:${rx}:${ry}:${ramp[2]}:${runes}:${phase}`, w, h, ramp, set => {
      for (let y = 2; y < h - 2; y++)
        for (let x = 2; x < w - 2; x++) {
          const dx = x - w / 2,
            dy = y - h / 2;
          const d = Math.hypot(dx / rx, dy / ry);
          const a = (Math.atan2(dy / ry, dx / rx) + k.tau) / k.tau;
          if (Math.abs(d - 1) < 0.8 / Math.min(rx, ry)) set(x, y, 3);
          if (runes && Math.abs(d - 0.78) < 0.7 / Math.min(rx, ry)) set(x, y, 2);
          if (runes && d > 0.82 && d < 0.94) {
            const tooth = Math.floor(a * 64 + phase * 2);
            if (tooth % 8 === 0 || (tooth % 8 === 1 && d < 0.88)) set(x, y, 4);
          }
        }
    });
    k.blit(img, C.x - w / 2, C.y - h / 2, alpha);
  }
  function line(A, B, ramp, width = 1, shade = 3, steps = 16) {
    for (const grow of [2, 0])
      for (let i = 0; i <= steps; i++) {
        const q = i / steps;
        k.dot(k.mix(A.x, B.x, q), k.mix(A.y, B.y, q), ramp[grow ? 0 : shade], width + grow);
      }
  }
  const feet = t => ({ x: t.baseX ?? t.x, y: t.baseY ?? t.y });
  const subjects = s => (s.targets.length ? s.targets : [s.pose.base || s.pose.target || s.pose.hand].filter(Boolean));
  const point = s => s.area || s.pose.target || s.targets[0] || s.pose.base || s.pose.hand;
  const endAfter = ms => (event, travel) => k.CAST + travel + ms;
  function beats(event, kit, travel, kind = 'soft', stop = 75) {
    return (event.targets?.length ? event.targets : [null]).map(target => ({
      at: kit.CAST + travel,
      stop,
      target,
      kind,
      power: kind === 'soft' ? 0 : 0.065,
    }));
  }
  function impacts(s, ramp, key, size = 28, count = 6) {
    s.hits.forEach((hit, i) => {
      const t = s.targets.find(t => t.id === hit.id);
      const p = t || point(s);
      if (!p) return;
      const C = k.P(t ? k.contact(t, s.pose.hand || p) : p),
        e = s.real(hit);
      k.drawHit(k.hitStyle(`26:${key}`, ramp, { S: size, spikes: 6, jag: 0.25 }), C, e);
      k.shards(C, e, ramp, (s.event.seed || 0) + i * 17, count, size * 0.65);
    });
  }
  const flash = ramp => (event, e) =>
    e < 0 || e > 85 ? null : { color: ramp[e < 36 ? 5 : 0], alpha: e < 36 ? 0.19 : 0.1 };
  const radius = (s, fallback) => ((s.area?.feet || fallback) / (s.grid.feet || 5)) * 16;
  function square(s, fallback) {
    const corners = s.area ? k.outline(s.area, s.grid) : [];
    const pts = corners.map(p => (Array.isArray(p) ? { x: p[0], y: p[1] } : p));
    const center = pts.length
      ? {
          x: pts.reduce((a, p) => a + p.x, 0) / pts.length,
          y: pts.reduce((a, p) => a + p.y, 0) / pts.length,
        }
      : point(s);
    return center ? { C: k.P(center), side: Math.round(radius(s, fallback)), angle: s.area?.dir || 0 } : null;
  }
  function tile(s, style, alpha = 1) {
    const a = square(s, style === 'ink' ? 20 : 40);
    if (!a) return;
    const N = a.side + 4,
      ramp = style === 'ink' ? INK : MIRAGE;
    const img = k.sprite(`26:tile:${style}:${N}:${(s.event.seed || 0) % 4}`, N, N, ramp, set => {
      for (let y = 2; y < N - 2; y++)
        for (let x = 2; x < N - 2; x++) {
          if (style === 'ink') {
            const v = Math.sin(x / 8) + Math.cos(y / 7);
            set(x, y, v > 1.1 ? 2 : 1);
            if ((x + y * 2) % 23 === 0 && v > 0.9) set(x, y, 3);
          } else {
            const river = Math.abs(x - N * 0.5 - Math.sin(y / 13) * N * 0.2);
            const rocky = Math.sin(x / 13) + Math.cos(y / 11) > 1.15;
            set(x, y, river < N * 0.085 ? 1 : rocky ? 4 : 2);
            if (river > N * 0.085 && river < N * 0.105) set(x, y, 3);
            if (!rocky && river > N * 0.14 && x % 9 === 0 && y % 11 < 3) set(x, y, 3);
            if (x === 2 || y === 2 || x === N - 3 || y === N - 3) set(x, y, 4);
          }
        }
    });
    // All supplied cube corners, including the board's offset cube origin, determine this centre.
    if (alpha < 1 && a.angle === 0) k.blit(img, a.C.x - N / 2, a.C.y - N / 2, alpha);
    else k.blitRotated(img, a.C.x, a.C.y, a.angle);
  }
  function tentacles(s, looping = false) {
    const a = square(s, 20),
      t = s.c.t - k.CAST;
    if (!a || (!looping && (t < 0 || t > 1250))) return;
    const alive = looping ? s.linger : t < 950 ? 1 : 1 - k.clamp((t - 950) / 300);
    if (alive <= 0) return;
    tile(s, 'ink', alive);
    const frame = Math.floor(s.c.raw / 95) % 8,
      seed = s.event.seed || 0;
    const growth = looping ? 4 : Math.max(1, Math.ceil(k.clamp(t / 240) * alive * 4));
    const img = k.sprite(`26:tentacle:${frame}:${growth}`, 27, 38, INK, set => {
      const phase = (frame / 8) * k.tau;
      for (let j = 0; j < Math.round((29 * growth) / 4); j++) {
        const q = j / ((29 * growth) / 4),
          x = 13 + Math.sin(q * 4.6 + phase) * q * 8;
        const y = 34 - j,
          thick = Math.max(1, Math.round(4 * (1 - q)));
        for (let dx = -thick; dx <= thick; dx++) set(x + dx, y, dx < 0 ? 1 : dx < thick ? 2 : 3);
        if (j % 5 === 0 && j > 7) set(x - thick, y, 4);
      }
    });
    for (let i = 0; i < 9; i++) {
      const x = ((i % 3) / 3 - 0.33) * a.side,
        y = (Math.floor(i / 3) / 3 - 0.33) * a.side;
      const C = {
        x: a.C.x + x * Math.cos(a.angle) - y * Math.sin(a.angle),
        y: a.C.y + x * Math.sin(a.angle) + y * Math.cos(a.angle),
      };
      ring(C, 6, 3, INK);
      k.blit(img, C.x - 13 + (k.hash(i, seed) - 0.5) * 3, C.y - 34, alive);
    }
  }
  function column(s, ramp, fallback, mode, looping = false) {
    const p = point(s),
      t = s.c.t - k.CAST;
    if (!p || (!looping && (t < 0 || t > 1350))) return;
    const C = k.P(p),
      R = Math.round(radius(s, fallback));
    const frame = Math.floor(s.c.raw / 100) % 6;
    const active = looping ? s.linger : t < 1050 ? 1 : 1 - k.clamp((t - 1050) / 300);
    if (active <= 0) return;
    const H = mode === 'sun' ? 72 : 55,
      W = R * 2 + 8;
    const img = k.sprite(`26:column:${mode}:${R}:${frame}`, W, H + R * 2 + 8, ramp, set => {
      const cy = H + R + 4;
      for (let y = 2; y < H + R * 2 + 6; y++)
        for (let x = 2; x < W - 2; x++) {
          const dx = x - W / 2,
            dy = y - cy;
          if (Math.hypot(dx / R, dy / R) < 1) {
            const d = Math.hypot(dx / R, dy / R);
            if (mode === 'sun') set(x, y, d > 0.94 ? 4 : d > 0.82 ? 2 : 1);
            else if (d > 0.93 || (x % 13 < 5 && y % 17 < 4)) set(x, y, d > 0.93 ? 3 : 2);
          }
          // Narrow shafts leave most of the cylinder transparent, even below the figures.
          const shaft = Math.abs(dx) < R * 0.83 && (x + frame * 2) % 19 < (mode === 'sun' ? 3 : 1);
          if (shaft && dy < 0 && dy > -H && (mode === 'sun' || (y + frame * 7) % 23 < 8))
            set(x, y, mode === 'sun' ? 3 : 4);
        }
    });
    k.blit(img, C.x - W / 2, C.y - H - R - 4, active);
    ring(C, R, R, ramp, mode === 'sun', frame % 4, active);
  }
  function aura(s, mode, looping = false) {
    const p = s.area || s.pose.base || s.pose.hand;
    const t = s.c.t - k.CAST;
    if (!p || (!looping && (t < 0 || t > 1150))) return;
    const C = k.P(p),
      ramp = mode === 'life' ? VOID : GOLD;
    const R = Math.round(radius(s, mode === 'life' ? 10 : 30));
    const active = looping ? s.linger : t < 900 ? 1 : 1 - k.clamp((t - 900) / 250);
    if (active <= 0) return;
    ring(C, R, R, ramp, true, Math.floor(s.c.raw / 170) % 4, active);
    const img = k.sprite(`26:dome:${mode}:${R}`, R * 2 + 8, R + 20, ramp, set => {
      const cx = R + 4,
        cy = R + 14;
      for (let j = 0; j <= 84; j++) {
        const a = (j / 84) * Math.PI;
        const x = cx + Math.cos(a) * R,
          y = cy - Math.sin(a) * (R + 8);
        if (j % 7 < 5) set(x, y, 3);
        if (j % 9 < 6) set(cx + Math.cos(a) * R * 0.35, y, 2);
      }
    });
    k.blit(img, C.x - R - 4, C.y - R - 14, active);
    if (mode === 'power')
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * k.tau;
        stamp('shield', { x: C.x + Math.cos(a) * R * 0.88, y: C.y + Math.sin(a) * R * 0.88 }, GOLD);
      }
  }

  // Evard's Black Tentacles: oily black coils erupt from a square pool and crush with pale sucker flashes.
  FX.register('evards-black-tentacles', {
    palette: INK,
    travel: 240,
    beats: (event, kit, travel) => beats(event, kit, travel, 'hit', 145),
    end: endAfter(1040),
    ground(s) {
      tentacles(s);
    },
    air(s) {
      impacts(s, INK, 'evard', 32, 8);
    },
    linger(s) {
      tentacles(s, true);
    },
  });

  // Hallucinatory Terrain: a violet survey sweep replaces the cube's ground with a false meadow and winding stream.
  FX.register('hallucinatory-terrain', {
    palette: MIRAGE,
    travel: 360,
    beats: (event, kit, travel) => beats(event, kit, travel, 'soft', 65),
    end: endAfter(1000),
    ground(s) {
      const t = s.c.t - k.CAST,
        a = square(s, 40);
      if (!a || t < 0 || t > 1360) return;
      tile(s, 'mirage', t > 1140 ? 0.75 : 1);
      if (t < 600) {
        const x = a.C.x - a.side / 2 + a.side * k.clamp(t / 600);
        line({ x, y: a.C.y - a.side / 2 }, { x, y: a.C.y + a.side / 2 }, ROSE, 1, 4, 38);
      }
    },
    air(s) {
      impacts(s, ROSE, 'terrain', 22, 4);
    },
    linger(s) {
      if (s.linger > 0) tile(s, 'mirage', s.linger);
    },
  });

  // Ice Storm: two volleys of blue-white hailstones hammer the cylinder, shatter, and leave icy slush.
  FX.register('ice-storm', {
    palette: ICE,
    travel: 280,
    beats(event, kit, travel) {
      return [0, 290].flatMap(dt => beats(event, kit, travel + dt, 'blast', dt ? 105 : 145));
    },
    end: endAfter(1100),
    flash: flash(ICE),
    ground(s) {
      column(s, ICE, 20, 'hail');
    },
    air(s) {
      const C0 = point(s),
        t = s.c.t - k.CAST;
      if (!C0 || t < 0 || t > 1380) return;
      const C = k.P(C0),
        R = radius(s, 20),
        seed = s.event.seed || 0;
      const stone = k.sprite('26:hail', 11, 13, ICE, set => {
        for (let y = 2; y < 11; y++)
          for (let x = 2; x < 9; x++) {
            if (Math.abs(x - 5) + Math.abs(y - 6) * 0.65 < 4) set(x, y, x < 5 ? 4 : y < 6 ? 3 : 2);
          }
      });
      for (let volley = 0; volley < 2; volley++)
        for (let i = 0; i < 11; i++) {
          const a = k.hash(i, seed, 1) * k.tau,
            r = Math.sqrt(k.hash(i, seed, 2)) * R * 0.92;
          const T = { x: C.x + Math.cos(a) * r, y: C.y + Math.sin(a) * r };
          const land = 280 + volley * 290 + (i % 4) * 30;
          const e = t - land,
            q = (e + 240) / 240;
          if (q >= 0 && q < 1) {
            const y = T.y - (1 - q * q) * 55;
            line({ x: T.x + 6, y: y - 10 }, { x: T.x, y }, ICE, 1, 3, 6);
            k.blitRotated(stone, T.x, y, 0.2);
          }
          const h = s.hits.find(h => h.at === k.CAST + 280 + volley * 290);
          if (h) {
            const real = s.real(h) - (i % 4) * 30;
            k.shards(T, real, ICE, seed + i, 3, 12);
            if (real >= 0 && real < 120) ring(T, 6, 3, ICE);
          }
        }
      impacts(s, ICE, 'hail-hit', 34, 7);
    },
  });

  // Animate Objects: mundane chair, cup, key, coins and blade snap to life, orbit, and bob on violet tethers.
  FX.register('animate-objects', {
    palette: ARC,
    travel: 220,
    beats: (event, kit, travel) => beats(event, kit, travel, 'soft', 90),
    end: endAfter(1050),
    ground(s) {
      const t = s.c.t - k.CAST,
        p = point(s);
      if (p && t >= 0 && t < 1270) ring(k.P(p), 20, 9, ARC, true);
    },
    air(s) {
      const p = point(s),
        t = s.c.t - k.CAST;
      if (!p || t < 0 || t > 1270) return;
      const C = k.P(p),
        seed = s.event.seed || 0;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * k.tau + k.ease(k.clamp(t / 850)) * 1.3 + k.hash(i, seed) * 0.15;
        const lift = k.ease(k.clamp(t / 220)) * 13;
        const B = { x: C.x + Math.cos(a) * 20, y: C.y + Math.sin(a) * 9 };
        const T = { x: B.x, y: B.y - lift - Math.sin(t / 100 + i) * 2 };
        if (t < 500) line(B, T, ARC, 1, 3, 9);
        if (i < 4) stamp(['chair', 'cup', 'key', 'sword'][i], T, i === 3 ? ICE : WOOD, Math.sin(t / 140 + i) * 0.4);
        else {
          k.disc(T.x, T.y, 4, GOLD[0]);
          k.disc(T.x, T.y, 3, GOLD[3]);
          mote(T.x - 1, T.y - 1, GOLD, 1, 5);
        }
        if (t > 930) ring(T, 5, 3, ARC);
      }
      impacts(s, ARC, 'objects', 26, 6);
    },
  });

  // Planar Binding: a golden contract seal closes three linked chains around an extraplanar subject and locks.
  FX.register('planar-binding', {
    palette: GOLD,
    travel: 340,
    beats: (event, kit, travel) => beats(event, kit, travel, 'soft', 110),
    end: endAfter(900),
    ground(s) {
      const t = s.c.t - k.CAST;
      if (t < 0 || t > 1240) return;
      for (const target of subjects(s)) ring(k.P(feet(target)), 16, 10, GOLD, true, 0);
    },
    air(s) {
      const t = s.c.t - k.CAST;
      if (t < 0 || t > 1240) return;
      for (const target of subjects(s)) {
        const C = k.P(target),
          q = k.ease(k.clamp(t / 340));
        if (t < 1040)
          for (let j = 0; j < 3; j++)
            for (let i = 0; i < 9; i++) {
              const a = (i / 9) * k.tau + j * 0.8;
              const r = k.mix(24, 10, q),
                x = C.x + Math.cos(a) * r,
                y = C.y + Math.sin(a) * 5 + (j - 1) * 6;
              ring({ x, y }, 3, 2, GOLD);
            }
        if (t >= 340 && t < 1100) stamp('lock', { x: C.x, y: C.y + 4 }, GOLD);
      }
      impacts(s, GOLD, 'binding', 30, 7);
    },
  });

  // Antilife Shell: a cold, hollow violet hemisphere seals around the caster and repels green life motes outward.
  FX.register('antilife-shell', {
    palette: VOID,
    travel: 240,
    beats: (event, kit, travel) => [{ at: kit.CAST + travel, stop: 95, target: null, kind: 'soft', power: 0 }],
    end: endAfter(940),
    ground(s) {
      aura(s, 'life');
    },
    air(s) {
      const p = s.area || s.pose.base || s.pose.hand,
        t = s.c.t - k.CAST;
      if (!p || t < 240 || t > 900) return;
      const C = k.P(p),
        R = radius(s, 10),
        h = s.hits[0],
        e = s.real(h);
      k.drawHit(k.hitStyle('26:antilife', VOID, { S: 26, spikes: 8, void: true }), C, e);
      k.shards(C, e, VOID, s.event.seed || 0, 8, R);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * k.tau,
          q = k.clamp(e / 600),
          r = R + q * 12;
        mote(C.x + Math.cos(a) * r, C.y + Math.sin(a) * r, LIFE, 2, 2);
      }
    },
    linger(s) {
      aura(s, 'life', true);
    },
  });

  // Banishing Smite: a violet force edge slashes on contact, opens a starless rift, then snaps it into a point.
  FX.register('banishing-smite', {
    palette: ARC,
    travel: 170,
    beats: (event, kit, travel) => beats(event, kit, travel, 'hit', 180),
    end: endAfter(950),
    flash: flash(ARC),
    air(s) {
      const t = s.c.t - k.CAST;
      if (t < 0 || t > 1120) return;
      for (const target of subjects(s)) {
        const C = k.P(target);
        if (t < 340) {
          const q = k.clamp(t / 170),
            B = { x: C.x - 17 + q * 31, y: C.y + 13 - q * 27 };
          line({ x: B.x - 8, y: B.y + 8 }, B, ARC, 3, 4, 12);
          stamp('sword', B, ARC);
        }
        if (t >= 170 && t < 920) {
          const q = k.clamp((t - 600) / 320),
            w = Math.max(1, Math.round(9 * (1 - k.ease(q))));
          const img = k.sprite(`26:rift:${w}`, 25, 39, VOID, set => {
            for (let y = 3; y < 36; y++)
              for (let x = 2; x < 23; x++) {
                const d = Math.abs(x - 12) / w + Math.abs(y - 19) / 19;
                if (d < 1) set(x, y, d > 0.72 ? 3 : 1);
              }
          });
          k.blit(img, C.x - 12, C.y - 19);
          ring(C, w + 4, 16 * (1 - q) + 2, ARC);
        }
      }
      impacts(s, ARC, 'banish', 40, 10);
    },
  });

  // Circle of Power: a vast gold prayer wheel forms a protective dome with six outward-facing shield seals.
  FX.register('circle-of-power', {
    palette: GOLD,
    travel: 260,
    beats: (event, kit, travel) => [{ at: kit.CAST + travel, stop: 100, target: null, kind: 'soft', power: 0 }],
    end: endAfter(920),
    ground(s) {
      aura(s, 'power');
    },
    air(s) {
      const p = s.area || s.pose.base || s.pose.hand;
      if (!p) return;
      const h = s.hits[0],
        C = k.P(p),
        e = s.real(h);
      k.drawHit(k.hitStyle('26:power', GOLD, { S: 32, spikes: 8 }), C, e);
      k.shards(C, e, GOLD, s.event.seed || 0, 10, 30);
    },
    linger(s) {
      aura(s, 'power', true);
    },
  });

  // Teleportation Circle: concentric violet runes ignite on the floor, a spiral draws inward, and travellers lift as sparks.
  FX.register('teleportation-circle', {
    palette: ARC,
    travel: 380,
    beats(event, kit, travel) {
      return [
        { at: kit.CAST + travel, stop: 90, target: null, kind: 'soft', power: 0 },
        { at: kit.CAST + travel + 360, stop: 100, target: null, kind: 'soft', power: 0 },
      ];
    },
    end: endAfter(1150),
    ground(s) {
      const t = s.c.t - k.CAST,
        p = s.event.teleport?.from || s.area || s.pose.target || s.pose.base;
      if (!p || t < 0 || t > 1530) return;
      const C = k.P(p),
        phase = Math.floor(s.c.raw / 120) % 4;
      const active = t < 1260 ? 1 : 1 - k.clamp((t - 1260) / 270);
      ring(C, 16, 16, ARC, true, phase, active);
      ring(C, 10, 10, ARC, false, 0, active);
      if (s.event.teleport?.to) ring(k.P(s.event.teleport.to), 16, 16, ARC, true, (phase + 2) % 4, active);
    },
    air(s) {
      const t = s.c.t - k.CAST,
        p = s.event.teleport?.from || s.area || s.pose.target || s.pose.base;
      if (!p || t < 0 || t > 1530) return;
      const C = k.P(p),
        to = s.event.teleport?.to ? k.P(s.event.teleport.to) : null;
      if (t < 740)
        for (let i = 0; i < 24; i++) {
          const a = (i / 24) * k.tau * 2 + t / 170,
            r = 15 * (1 - i / 27);
          mote(C.x + Math.cos(a) * r, C.y + Math.sin(a) * r, ARC, 1, i % 3 ? 3 : 5);
        }
      for (let i = 0; i < 12; i++) {
        const e = t - 740 - i * 14;
        if (e < 0 || e > 440) continue;
        const a = k.hash(i, s.event.seed || 0) * k.tau,
          r = k.hash(i, 7) * 11;
        const q = e / 440;
        mote(C.x + Math.cos(a) * r * (1 - q), C.y + Math.sin(a) * r - q * 27, ARC, q < 0.6 ? 2 : 1, 4);
        if (to) mote(to.x + Math.cos(a) * r * q, to.y + Math.sin(a) * r - (1 - q) * 27, ARC, 1, 5);
      }
      s.hits.forEach((h, i) => {
        const P = i && to ? to : C,
          e = s.real(h);
        k.drawHit(k.hitStyle(`26:circle:${i}`, ARC, { S: i ? 36 : 28, spikes: 8 }), P, e);
        k.shards(P, e, ARC, (s.event.seed || 0) + i, 8, 22);
      });
    },
    linger(s) {
      const p = s.event.teleport?.from || s.area || s.pose.target || s.pose.base;
      if (p && s.linger > 0) ring(k.P(p), 16, 16, ARC, true, Math.floor(s.c.raw / 180) % 4, s.linger);
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
