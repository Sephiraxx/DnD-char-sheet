/* Pixel spells, batch 25 (see docs/pixel-spells/BRIEF.md). */
(function (root) {
  'use strict';
  const FX = root.BoardPixelFX;
  if (!FX) return;
  const k = FX.kit;
  const GOLD = ['#251b12', '#684825', '#b58839', '#e9c264', '#fff0b4', '#ffffff'];
  const ARCANE = ['#150d28', '#392359', '#7951b0', '#b58bed', '#e9d6ff', '#ffffff'];
  const STONE = ['#191d23', '#3e4650', '#737e87', '#a7b6bd', '#dce4df', '#ffffff'];
  const WITHER = ['#160b20', '#332039', '#674275', '#a37cab', '#d9c9dc', '#ffffff'];
  const LEAF = ['#21190e', '#504021', '#85703a', '#b29a58', '#e2cc85', '#fff3c4'];
  const SICK = ['#101b13', '#244a2d', '#4c853d', '#9bdc57', '#dbff9c', '#f7ffe5'];
  const SHADOW = ['#0c0a17', '#211b32', '#40304e', '#79608c', '#bc9ec9', '#f5e5ff'];
  const GHOST = ['#101c28', '#294553', '#567e8a', '#9ac5ca', '#dff5ed', '#ffffff'];
  const VOID = ['#0b091c', '#241f47', '#514576', '#9883c5', '#ded3f5', '#ffffff'];
  const FIRE = ['#281013', '#712222', '#ba4226', '#f5822e', '#ffd081', '#fff6df'];
  const WOOL = ['#272321', '#514941', '#9c9381', '#d9d5c2', '#fff8e4', '#ffffff'];
  const ART = {
    eye: [
      '....33333....',
      '..334444433..',
      '.34442224443.',
      '3444225224443',
      '.34442224443.',
      '..334444433..',
      '....33333....',
    ],
    paw: [
      '..33..33..',
      '.34433443.',
      '.34433443.',
      '..33..33..',
      '33......33',
      '43..33..34',
      '.3.3443.3.',
      '..344443..',
      '..344443..',
      '...3333...',
    ],
    hand: [
      '....33.33....',
      '.33.43.43.33.',
      '.43.43.43.43.',
      '.43.43.43.43.',
      '.43343343343.',
      '..344444443..',
      '33.34444443..',
      '44334444443..',
      '.344444443...',
      '..3444443....',
      '...33333.....',
    ],
    sheep: [
      '.....33..33.......',
      '...3344334433.....',
      '..3444444444433...',
      '.344444444444443..',
      '.34444444444444333',
      '.344444444444432443',
      '..3444444444432443',
      '...333333333332333',
      '....23...23.......',
      '....23...23.......',
    ],
    hound: [
      '...................3......',
      '.................3343.33..',
      '..3............3344433443.',
      '.343.........334444444443.',
      '.3443..333333444444424443.',
      '..34433444444444444444433',
      '...344444444444444444333..',
      '....344444444444443333....',
      '....344444444444443......',
      '.....34444444334443......',
      '......344443...3443......',
      '......34443....3443......',
      '......34343....3433......',
      '......34343....343.......',
      '.....3343343..33433......',
    ],
    reaper: [
      '............44444.....',
      '........34444444443...',
      '.......344.......443..',
      '.......34.........443.',
      '.......34..........43.',
      '.......34.............',
      '....33334.............',
      '...3222343............',
      '..324424343...........',
      '..324224343...........',
      '...322234343..........',
      '....333343443.........',
      '...32222344343........',
      '..322222234343........',
      '.322222222343.........',
      '.322222222343.........',
      '..32222222343.........',
      '..32222222343.........',
      '.322322322343.........',
      '..33.33.33343.........',
    ],
    lock: [
      '...44444...',
      '..43...34..',
      '..43...34..',
      '.333333333.',
      '.344444432.',
      '.343343432.',
      '.343223432.',
      '.344224432.',
      '.333333332.',
    ],
    flame: [
      '.....4.....',
      '....343....',
      '....343.3..',
      '..3.344343.',
      '.343444443.',
      '.344454443.',
      '..3445443..',
      '...34443...',
      '....333....',
    ],
    snow: [
      '....4....',
      '.4..4..4.',
      '..4.4.4..',
      '...444...',
      '444454444',
      '...444...',
      '..4.4.4..',
      '.4..4..4.',
      '....4....',
    ],
    bolt: ['.....444.', '....444..', '...444...', '..44444..', '....44...', '...44....', '..44.....', '.4.......'],
    drop: ['....4....', '...343...', '..34443..', '.3444443.', '.3454443.', '.3444432.', '..33332..'],
    wave: ['..33..33..', '.34433443.', '34..34..34', '..........', '..33..33..', '.34433443.', '34..34..34'],
  };

  function icon(name, ramp, frame = 99) {
    const rows = ART[name];
    const width = Math.max(...rows.map(row => row.length));
    return k.sprite(`25:${name}:${ramp[2]}:${frame}`, width + 2, rows.length + 2, ramp, set => {
      rows.forEach((row, y) => {
        if (y > frame) return;
        for (let x = 0; x < row.length; x++) if (row[x] !== '.') set(x + 1, y + 1, +row[x]);
      });
    });
  }
  function stamp(name, at, ramp, frame) {
    const img = icon(name, ramp, frame);
    k.blit(img, at.x - img.width / 2, at.y - img.height / 2);
  }
  function point(s) {
    return s.area || s.pose.target || s.targets[0] || s.pose.base || s.pose.hand;
  }
  function subjects(s) {
    return s.targets.length ? s.targets : [point(s)].filter(Boolean);
  }
  function feet(t) {
    return { x: t.baseX ?? t.x, y: t.baseY ?? t.y, span: t.span || 1 };
  }
  function beat(event, kit, travel, kind = 'soft', stop = 60, power = 0.04) {
    return (event.targets?.length ? event.targets : [null]).map(target => ({
      at: kit.CAST + travel,
      stop,
      target,
      kind,
      power,
    }));
  }
  function pixels(a, b, color, size, gap = 0) {
    const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 2));
    for (let i = 0; i <= steps; i++) {
      if (gap && Math.floor(i / gap) % 2) continue;
      k.dot(k.mix(a.x, b.x, i / steps), k.mix(a.y, b.y, i / steps), color, size);
    }
  }
  function line(a, b, ramp, size = 1, shade = 3, gap = 0) {
    pixels(a, b, ramp[0], size + 2, gap);
    pixels(a, b, ramp[shade], size, gap);
  }
  function mote(x, y, ramp, size = 1, shade = 4) {
    k.dot(x, y, ramp[0], size + 2);
    k.dot(x, y, ramp[shade], size);
  }
  // Rings are cached raster shapes: a 30 ft boundary costs one blit, not 1,200 dots.
  function ring(at, rx, ry, ramp, shade = 3, broken = false) {
    rx = Math.max(2, Math.round(rx));
    ry = Math.max(2, Math.round(ry));
    const img = k.sprite(`25:ring:${rx}:${ry}:${ramp[2]}:${shade}:${broken}`, rx * 2 + 6, ry * 2 + 6, ramp, set => {
      for (let y = -ry - 1; y <= ry + 1; y++)
        for (let x = -rx - 1; x <= rx + 1; x++) {
          const d = Math.hypot(x / rx, y / ry);
          if (Math.abs(d - 1) > 0.7 / Math.min(rx, ry)) continue;
          if (broken && Math.floor((Math.atan2(y, x) + Math.PI) * 6) % 3 === 0) continue;
          set(x + rx + 3, y + ry + 3, shade);
        }
    });
    k.blit(img, at.x - rx - 3, at.y - ry - 3);
  }
  function impacts(s, ramp, key, size = 24, count = 7) {
    for (let i = 0; i < s.hits.length; i++) {
      const hit = s.hits[i];
      const target = s.targets.find(t => t.id === hit.id) || point(s);
      if (!target) continue;
      const at = k.P(target);
      const e = s.real(hit);
      k.drawHit(k.hitStyle(`25:${key}:${ramp[2]}`, ramp, { S: size, spikes: 5, jag: 0.3 }), at, e);
      k.shards(at, e, ramp, (s.event.seed || 0) + 17 * i, count, size * 0.65);
    }
  }
  function radius(s, fallback) {
    return ((s.area?.feet || fallback) / (s.grid.feet || 5)) * k.PX;
  }
  function endAfter(ms) {
    return (event, travel) => k.CAST + travel + ms;
  }
  function flash(ramp, alpha = 0.16) {
    return (event, e) => (e < 30 ? { color: ramp[4], alpha } : e < 65 ? { color: ramp[0], alpha: alpha * 0.7 } : null);
  }
  function field(s, mode, strength = 1) {
    const at = point(s);
    if (!at || strength <= 0) return;
    const C = k.P(at);
    const R = Math.round(radius(s, mode === 'sick' ? 30 : 20));
    const ramp = mode === 'sick' ? SICK : VOID;
    const frame = Math.floor(s.c.t / 110) % 4;
    const img = k.sprite(`25:field:${mode}:${R}:${frame}`, R * 2 + 6, R * 2 + 6, ramp, set => {
      for (let y = -R; y <= R; y++)
        for (let x = -R; x <= R; x++) {
          const d = Math.hypot(x, y) / R;
          if (d > 1) continue;
          if (mode === 'sick') {
            if (d > 0.975) set(x + R + 3, y + R + 3, 3);
            else if (d > 0.91) set(x + R + 3, y + R + 3, 2);
            else if (d < 0.82 && (Math.abs(x + y + frame * 3) % 24 < 2 || (x % 19 === 0 && y % 19 === 0))) {
              set(x + R + 3, y + R + 3, d < 0.35 ? 2 : 1);
            }
          } else {
            const a = Math.atan2(y, x);
            const spiral = Math.sin(a * 3 + d * 18 - (frame * Math.PI) / 2);
            if (d < 0.13) set(x + R + 3, y + R + 3, 1);
            else if (d > 0.96 || (spiral > 0.9 && d > 0.17)) set(x + R + 3, y + R + 3, d > 0.65 ? 2 : 3);
          }
        }
    });
    k.blit(img, C.x - R - 3, C.y - R - 3);
  }

  // Locate Creature: golden search pulses resolve into a compass needle and a trail of pawprints.
  FX.register('locate-creature', {
    palette: GOLD,
    travel: 180,
    beats: (event, kit, travel) => beat(event, kit, travel),
    end: endAfter(820),
    ground(s) {
      if (!s.pose.base || s.c.t < k.CAST) return;
      const C = k.P(s.pose.base);
      const t = s.c.t - k.CAST;
      for (let i = 0; i < 2; i++) {
        const q = (t - i * 230) / 640;
        if (q >= 0 && q < 1) ring(C, 10 + q * 31, 6 + q * 18, GOLD, q < 0.7 ? 3 : 2, q > 0.7);
      }
      const aim = point(s);
      if (!aim || t < 180) return;
      const T = k.P(aim);
      const dx = T.x - C.x,
        dy = T.y - C.y,
        d = Math.hypot(dx, dy) || 1;
      for (let i = 1; i <= 3; i++) {
        if (t < 180 + i * 110 || t > 880 + i * 55) continue;
        stamp('paw', { x: C.x + (dx / d) * (12 + i * 10), y: C.y + (dy / d) * (12 + i * 10) }, GOLD);
      }
    },
    air(s) {
      if (!s.pose.base || !point(s)) return;
      const t = s.c.t - k.CAST;
      if (t < 0 || t > 980) return;
      const C = k.P(s.pose.base),
        T = k.P(point(s));
      const at = { x: C.x, y: C.y - 18 };
      ring(at, 9, 9, GOLD, 3, true);
      const angle = Math.atan2(T.y - C.y, T.x - C.x) + (t < 180 ? (1 - t / 180) * k.tau : 0);
      line(at, { x: at.x + Math.cos(angle) * 8, y: at.y + Math.sin(angle) * 8 }, GOLD, 2, 4);
      mote(at.x, at.y, GOLD, 2, 5);
      if (s.hits[0]) k.drawHit(k.hitStyle('25:locate', GOLD, { S: 18, spikes: 4 }), at, s.real(s.hits[0]));
    },
  });

  // Blight: necrotic veins clamp onto the victim; living leaves shrivel into falling brown husks.
  FX.register('blight', {
    palette: WITHER,
    travel: 180,
    beats: (event, kit, travel) => beat(event, kit, travel, 'hit', 145, 0.085),
    end: endAfter(620),
    flash: flash(WITHER),
    ground(s) {
      const t = s.c.t - k.CAST;
      if (t < 0 || t > 700) return;
      for (const target of subjects(s)) {
        const C = k.P(feet(target));
        ring(C, 11 + Math.min(t / 25, 5), 5, WITHER, 1, t > 450);
      }
    },
    air(s) {
      const t = s.c.t - k.CAST;
      if (t < 0) return;
      for (const target of subjects(s)) {
        const C = k.P(target);
        if (t < 540)
          for (let i = 0; i < 5; i++) {
            const a = (i / 5) * k.tau - Math.PI / 2;
            const r = t < 180 ? k.mix(17, 4, k.ease(t / 180)) : 5;
            const B = { x: C.x + Math.cos(a) * r, y: C.y + Math.sin(a) * r };
            line(B, { x: B.x + Math.cos(a + 0.7) * 8, y: B.y + Math.sin(a + 0.7) * 8 }, WITHER, 1, t < 180 ? 3 : 1);
          }
      }
      impacts(s, WITHER, 'blight', 38, 9);
      for (const hit of s.hits) {
        const target = s.targets.find(t => t.id === hit.id) || point(s);
        if (!target) continue;
        const C = k.P(target),
          e = s.real(hit);
        if (e < 0 || e > 640) continue;
        for (let i = 0; i < 7; i++) {
          const a = k.hash(i, s.event.seed || 0) * k.tau;
          const q = e / 640;
          const x = C.x + Math.cos(a) * (8 + q * 12),
            y = C.y + Math.sin(a) * 9 + q * q * 22;
          const ramp = e < 80 ? SICK : LEAF;
          mote(x, y, ramp, e < 180 ? 3 : 2, e < 300 ? 3 : 1);
          if (e < 180) mote(x + 1, y - 1, ramp, 1, 4);
        }
      }
    },
  });

  // Stone Shape: a luminous hand kneads a solid stone block into a clean, masonry-lined arch.
  FX.register('stone-shape', {
    palette: STONE,
    travel: 250,
    beats: (event, kit, travel) => beat(event, kit, travel, 'soft', 75),
    end: endAfter(820),
    ground(s) {
      if (!point(s) || s.c.t < k.CAST) return;
      const C = k.P(point(s)),
        t = s.c.t - k.CAST;
      const frame = Math.min(5, Math.floor(Math.max(0, t - 160) / 70));
      const img = k.sprite(`25:stone-arch:${frame}`, 35, 34, STONE, set => {
        for (let y = 3; y < 31; y++)
          for (let x = 3; x < 32; x++) {
            const opening = y > 13 || ((x - 17) ** 2 + (y - 14) ** 2 < 65 && y > 5);
            if (Math.abs(x - 17) < frame * 1.7 && opening) continue;
            const seam = y % 7 === 3 || (x + (Math.floor(y / 7) % 2) * 6) % 12 === 0;
            set(x, y, seam ? 1 : x < 10 || y < 8 ? 4 : x > 26 ? 2 : 3);
          }
      });
      k.blit(img, C.x - 17, C.y - 22);
      if (t < 400) ring({ x: C.x, y: C.y + 10 }, 19, 6, GOLD, 3, true);
    },
    air(s) {
      if (!point(s)) return;
      const C = k.P(point(s)),
        t = s.c.t - k.CAST;
      if (t >= 0 && t < 600) stamp('hand', { x: C.x + k.mix(-12, 12, k.clamp(t / 500)), y: C.y - 9 }, GOLD);
      impacts(s, STONE, 'stone-shape', 20, 8);
    },
  });

  // Arcane Eye: a small violet, lidless eye glides from the hand and swivels above a thin scrying orbit.
  FX.register('arcane-eye', {
    palette: ARCANE,
    travel: 260,
    beats: (event, kit, travel) => beat(event, kit, travel, 'soft', 55),
    end: endAfter(800),
    air(s) {
      const target = point(s);
      if (!target) return;
      const t = s.c.t - k.CAST;
      if (t < 0 || t > 1060) return;
      const H = k.P(s.pose.hand || target),
        T = k.P(target),
        q = k.ease(k.clamp(t / 260));
      const C = { x: k.mix(H.x, T.x, q), y: k.mix(H.y, T.y - 12, q) - Math.sin(q * Math.PI) * 8 };
      ring(C, 12, 7, ARCANE, 2, true);
      stamp('eye', C, ARCANE);
      mote(C.x + Math.round(Math.sin(t / 180) * 2), C.y, ARCANE, 2, 2);
      mote(C.x - 1, C.y - 1, ARCANE, 1, 5);
      if (s.hits[0]) k.shards(C, s.real(s.hits[0]), ARCANE, s.event.seed || 0, 5, 13);
    },
    linger(s) {
      if (!point(s) || s.linger < 0.25) return;
      const C = k.P(point(s));
      stamp('eye', { x: C.x, y: C.y - 12 + Math.round(Math.sin(s.c.raw / 280) * 2) }, ARCANE);
    },
  });

  function baneRamp(event) {
    const element = event.element;
    return element === 'frost' || element === 'lightning' || element === 'trueno' || element === 'ácido'
      ? k.palettes[element]
      : FIRE;
  }
  function baneIcon(event) {
    return { frost: 'snow', lightning: 'bolt', trueno: 'wave', ácido: 'drop' }[event.element] || 'flame';
  }
  function baneSeal(s, loop) {
    const t = s.c.t - k.CAST;
    if (!point(s) || (!loop && (t < 0 || t > 960)) || (loop && s.linger < 0.25)) return;
    for (const target of subjects(s)) {
      const C = k.P(target),
        ramp = s.ramp;
      const r = loop ? 13 : k.mix(23, 13, k.ease(k.clamp(t / 200)));
      ring(C, r, r, ramp, 2, true);
      for (let i = 0; i < 3; i++) {
        const a = (i * k.tau) / 3 + (loop ? s.c.raw / 1400 : t / 650);
        const B = { x: C.x + Math.cos(a) * r, y: C.y + Math.sin(a) * r };
        line(B, { x: C.x + Math.cos(a) * (r - 5), y: C.y + Math.sin(a) * (r - 5) }, ramp, 2, 3);
      }
      const seal = { x: C.x, y: C.y - 17 };
      stamp(baneIcon(s.event), seal, ramp);
      // The split rune and dark diagonal slash distinguish a vulnerability curse from protection.
      line({ x: seal.x - 6, y: seal.y + 5 }, { x: seal.x + 5, y: seal.y - 5 }, WITHER, 2, 3);
    }
  }

  // Elemental Bane: a broken elemental rune and inward hooks brand the victim with vulnerability.
  FX.register('elemental-bane', {
    palette: baneRamp,
    travel: 200,
    beats: (event, kit, travel) => beat(event, kit, travel, 'hit', 95, 0.045),
    end: endAfter(760),
    air(s) {
      baneSeal(s, false);
      impacts(s, s.ramp, 'elemental-bane', 24, 6);
    },
    linger(s) {
      baneSeal(s, true);
    },
  });

  function skin(s, loop) {
    const t = s.c.t - k.CAST;
    if ((!loop && (t < 0 || t > 920)) || (loop && s.linger < 0.25)) return;
    for (const target of subjects(s)) {
      const C = k.P(target),
        scale = Math.min(2, target.span || 1);
      for (let i = 0; i < 8; i++) {
        const row = Math.floor(i / 2),
          side = i % 2 ? 1 : -1;
        if (!loop && t < row * 50) continue;
        const x = C.x + side * (6 + (row === 0 ? 0 : 2)) * scale;
        const y = C.y + (row * 4 - 6) * scale;
        k.dot(x, y, STONE[0], 6);
        k.dot(x, y, STONE[2], 4);
        k.dot(x - 1, y - 1, STONE[4], 2);
        k.dot(x + 1, y + 1, STONE[1], 2);
      }
      if (!loop && t >= 170 && t < 530) {
        const y = C.y - 13 + (t - 170) / 13;
        line({ x: C.x - 10 * scale, y }, { x: C.x + 10 * scale, y }, STONE, 1, 4);
      }
    }
  }

  // Stoneskin: top-lit granite plates climb the body's contours, then lock with a hard mineral snap.
  FX.register('stoneskin', {
    palette: STONE,
    travel: 170,
    beats: (event, kit, travel) => beat(event, kit, travel, 'soft', 80),
    end: endAfter(750),
    air(s) {
      skin(s, false);
      impacts(s, STONE, 'stoneskin', 22, 7);
    },
    ground(s) {
      const t = s.c.t - k.CAST;
      if (t < 0 || t > 650) return;
      for (const target of subjects(s)) ring(k.P(feet(target)), 12, 5, STONE, t < 170 ? 3 : 2, true);
    },
    linger(s) {
      skin(s, true);
    },
  });

  // Polymorph: green-gold transmutation ribbons fold into a recognisable woolly sheep silhouette.
  FX.register('polymorph', {
    palette: GOLD,
    travel: 220,
    beats: (event, kit, travel) => beat(event, kit, travel, 'soft', 90),
    end: endAfter(820),
    air(s) {
      const t = s.c.t - k.CAST;
      if (t < 0 || t > 1040) return;
      for (const target of subjects(s)) {
        const C = k.P(target);
        if (t < 550)
          for (let j = 0; j < 2; j++) {
            for (let i = 0; i < 14; i++) {
              const a = (i / 14) * k.tau + t / 105 + j * Math.PI;
              const r = t < 220 ? k.mix(18, 5, k.ease(t / 220)) : k.mix(5, 17, k.clamp((t - 220) / 330));
              mote(C.x + Math.cos(a) * r, C.y + Math.sin(a) * r * 0.55 + j * 5 - 4, j ? SICK : GOLD, 1, 3);
            }
          }
        if (t >= 220) {
          const B = k.P(feet(target));
          const frame = Math.min(12, Math.floor((t - 220) / 25) * 3);
          stamp('sheep', { x: B.x, y: B.y - 5 }, WOOL, frame);
        }
      }
      impacts(s, GOLD, 'polymorph', 28, 8);
    },
  });

  function doors(s) {
    return [
      s.event.teleport?.from || s.pose.base || s.pose.hand,
      s.event.teleport?.to || s.pose.target || s.targets[0] || s.area,
    ].filter(Boolean);
  }
  function doorway(C, width, ramp, tick) {
    const w = Math.max(1, Math.round(width));
    const img = k.sprite(`25:door:${w}:${tick}`, w * 2 + 8, 36, ramp, set => {
      for (let y = 3; y < 33; y++)
        for (let x = -w; x <= w; x++) {
          const edge = Math.abs(x) >= w - 1 || y < 5 || y > 30;
          set(x + w + 4, y, edge ? 3 + ((y + tick * 2) % 9 < 2 ? 1 : 0) : 1);
          if (!edge && (x + y + tick * 3) % 13 === 0) set(x + w + 4, y, 2);
        }
    });
    k.blit(img, C.x - w - 4, C.y - 30);
  }

  // Dimension Door: two rectangular violet thresholds snap open, exchange sparks, and zip shut.
  FX.register('dimension', {
    palette: ARCANE,
    travel: 180,
    beats(event, kit, travel) {
      return [
        { at: kit.CAST + travel, stop: 65, target: null, kind: 'soft', power: 0 },
        { at: kit.CAST + travel + 300, stop: 80, target: event.targets?.[0] ?? null, kind: 'soft', power: 0.03 },
      ];
    },
    end: endAfter(900),
    ground(s) {
      const t = s.c.t - k.CAST;
      if (t < 0 || t > 1000) return;
      doors(s).forEach((pt, i) => {
        if (t >= i * 180) ring(k.P(pt), 12, 5, ARCANE, 2, true);
      });
    },
    air(s) {
      const t = s.c.t - k.CAST;
      if (t < 0 || t > 1080) return;
      doors(s).forEach((pt, i) => {
        const e = t - i * 180;
        if (e < 0 || e > 820) return;
        const C = k.P(pt),
          w = e < 100 ? 2 + 7 * k.ease(e / 100) : e < 620 ? 9 : 9 * (1 - k.clamp((e - 620) / 200));
        doorway(C, w, ARCANE, Math.floor(s.c.raw / 90) % 4);
        const hit = s.hits[i];
        if (hit) {
          const at = { x: C.x, y: C.y - 13 };
          k.drawHit(k.hitStyle('25:dimension', ARCANE, { S: 26, spikes: 4 }), at, s.real(hit));
          k.shards(at, s.real(hit), ARCANE, (s.event.seed || 0) + i, 7, 18);
        }
      });
    },
  });

  // Sickening Radiance: a full-size green radiance field ignites; pale motes rise from irradiated bodies.
  FX.register('sickening-radiance', {
    palette: SICK,
    travel: 240,
    beats: (event, kit, travel) => beat(event, kit, travel, 'hit', 125, 0.055),
    end: endAfter(1050),
    flash: flash(SICK, 0.22),
    ground(s) {
      const t = s.c.t - k.CAST;
      if (!point(s) || t < 0 || t > 1290) return;
      const C = k.P(point(s)),
        R = radius(s, 30);
      if (t < 240) ring(C, R * (0.15 + 0.85 * k.ease(t / 240)), R * (0.15 + 0.85 * k.ease(t / 240)), SICK, 4);
      else field(s, 'sick');
    },
    air(s) {
      if (!point(s)) return;
      const e = s.c.t - k.CAST - 240;
      if (e < 0 || e > 1050) return;
      impacts(s, SICK, 'radiance', 28, 7);
      const C = k.P(point(s)),
        R = radius(s, 30);
      for (let i = 0; i < 17; i++) {
        const a = k.hash(i, s.event.seed || 0) * k.tau,
          r = Math.sqrt(k.hash(i, 23)) * R * 0.9;
        const q = (s.c.raw / 700 + k.hash(i, 44)) % 1;
        mote(C.x + Math.cos(a) * r, C.y + Math.sin(a) * r - q * 15, SICK, 1, q < 0.7 ? 4 : 2);
      }
    },
    linger(s) {
      field(s, 'sick', s.linger);
    },
  });

  // Faithful Hound: a translucent blue watchdog materialises with raised muzzle and barks a warning.
  FX.register('mordenkainens-faithful-hound', {
    palette: GHOST,
    travel: 260,
    beats: (event, kit, travel) => beat(event, kit, travel, 'soft', 65),
    end: endAfter(850),
    ground(s) {
      const t = s.c.t - k.CAST;
      if (!point(s) || t < 0 || t > 1000) return;
      const C = k.P(point(s));
      ring({ x: C.x, y: C.y + 7 }, 18, 7, GHOST, 2, t > 600);
    },
    air(s) {
      if (!point(s)) return;
      const t = s.c.t - k.CAST;
      if (t < 0 || t > 1110) return;
      const C = k.P(point(s));
      const img = icon('hound', GHOST);
      // Blitting in quarter steps gives an explicitly spectral preview of the normally invisible guardian.
      if (t >= 170) k.blit(img, C.x - img.width / 2, C.y - img.height + 10, t > 880 ? 0.5 : 0.75);
      if (t < 260)
        for (let i = 0; i < 8; i++) {
          const q = k.clamp(t / 260),
            a = (i * k.tau) / 8;
          mote(C.x + Math.cos(a) * (22 - q * 15), C.y + 8 - q * (8 + (i % 3) * 3), GHOST, 2, 3);
        }
      for (let j = 0; j < 2; j++) {
        const q = (t - 350 - j * 160) / 280;
        if (q < 0 || q > 1) continue;
        for (let i = 0; i < 9; i++) {
          const a = -0.75 + i * 0.18;
          mote(C.x + 12 + Math.cos(a) * (4 + q * 12), C.y - 3 + Math.sin(a) * (4 + q * 12), GHOST, 1, 4);
        }
      }
      if (s.hits[0]) k.shards(C, s.real(s.hits[0]), GHOST, s.event.seed || 0, 6, 16);
    },
    linger(s) {
      if (!point(s) || s.linger < 0.25) return;
      const C = k.P(point(s)),
        img = icon('hound', GHOST);
      k.blit(img, C.x - img.width / 2, C.y - img.height + 10, 0.5);
    },
  });

  function sanctum(s, loop) {
    const t = s.c.t - k.CAST;
    if ((!loop && (t < 0 || t > 1180)) || (loop && s.linger < 0.25) || !point(s)) return;
    let corners = s.area ? k.outline(s.area, s.grid) : [];
    const aim = point(s);
    if (corners.length < 4) {
      const r = (s.area?.feet || 10) / (s.grid.feet || 5);
      corners = [
        [aim.x - r / 2, aim.y - r / 2],
        [aim.x + r / 2, aim.y - r / 2],
        [aim.x + r / 2, aim.y + r / 2],
        [aim.x - r / 2, aim.y + r / 2],
      ];
    }
    const pts = corners.slice(0, 4).map(p => k.P({ x: p[0], y: p[1] }));
    const x0 = Math.floor(Math.min(...pts.map(p => p.x))) - 3;
    const y0 = Math.floor(Math.min(...pts.map(p => p.y))) - 3;
    const h = Math.min(34, radius(s, 10) * 0.45);
    const phase = loop ? 4 : Math.min(4, Math.floor(t / 90));
    const rel = pts.map(p => ({ x: Math.round(p.x - x0), y: Math.round(p.y - y0) }));
    const w = Math.ceil(Math.max(...rel.map(p => p.x))) + 4;
    const height = Math.ceil(Math.max(...rel.map(p => p.y)) + h) + 4;
    const img = k.sprite(`25:sanctum:${rel.map(p => `${p.x},${p.y}`).join(':')}:${phase}`, w, height, ARCANE, set => {
      const edge = (a, b, offset, shade, dashed) => {
        const n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y));
        for (let j = 0; j <= n; j++) {
          if (dashed && Math.floor(j / 4) % 2) continue;
          set(k.mix(a.x, b.x, j / Math.max(1, n)), k.mix(a.y, b.y, j / Math.max(1, n)) + offset, shade);
        }
      };
      for (let i = 0; i < 4; i++) {
        const a = rel[i],
          b = rel[(i + 1) % 4];
        edge(a, b, h, 2, false);
        if (phase >= 1) edge({ x: a.x, y: a.y + h }, { x: a.x, y: a.y + h - h * Math.min(1, phase / 3) }, 0, 3, false);
        if (phase >= 3) edge(a, b, 0, 3, phase < 4);
        if (phase === 4) edge(a, b, h * 0.5, 1, true);
      }
    });
    k.blit(img, x0, y0 - h);
  }

  // Private Sanctum: an exact-template violet ward cube closes, sealing a lock and a crossed-out scrying eye.
  FX.register('mordenkainens-private-sanctum', {
    palette: ARCANE,
    travel: 360,
    beats: (event, kit, travel) => beat(event, kit, travel, 'soft', 80),
    end: endAfter(820),
    reach: (event, grid) => ({ r: (event.area?.feet || 20) / (grid.feet || 5) + 1, up: 3 }),
    ground(s) {
      sanctum(s, false);
    },
    air(s) {
      if (!point(s)) return;
      const t = s.c.t - k.CAST;
      if (t < 280 || t > 1180) return;
      const C = k.P(point(s));
      stamp('lock', { x: C.x - 9, y: C.y - 15 }, ARCANE);
      stamp('eye', { x: C.x + 10, y: C.y - 15 }, ARCANE);
      line({ x: C.x + 4, y: C.y - 10 }, { x: C.x + 16, y: C.y - 20 }, GOLD, 1, 4);
      if (s.hits[0]) k.shards({ x: C.x, y: C.y - 15 }, s.real(s.hits[0]), ARCANE, s.event.seed || 0, 8, 18);
    },
    linger(s) {
      sanctum(s, true);
    },
  });

  function moil(s, loop) {
    const t = s.c.t - k.CAST;
    if ((!loop && (t < 0 || t > 1000)) || (loop && s.linger < 0.25)) return;
    for (const target of subjects(s)) {
      const C = k.P(target),
        B = k.P(feet(target));
      const tick = Math.floor(s.c.raw / 85) % 4;
      // Only the silhouette's margins carry the flame; the figure remains readable in the hollow centre.
      for (let i = 0; i < 7; i++) {
        const a = Math.PI + (i / 6) * Math.PI;
        const x = C.x + Math.cos(a) * 10,
          y = B.y - 2 + Math.sin(a) * 18;
        const r = 3 + ((i + tick) % 3);
        k.disc(x, y, r + 1, SHADOW[0]);
        k.disc(x, y, r, SHADOW[1]);
        mote(x - 1, y - r + 1, SHADOW, 1, 3);
      }
      if (!loop && t > 180 && t < 480) {
        for (let i = 0; i < 4; i++) {
          const side = i % 2 ? -1 : 1,
            q = (t - 180) / 300;
          mote(C.x + side * (11 + q * 7), C.y - 8 + i * 4 - q * 6, WITHER, 2, 3);
        }
      }
    }
  }

  // Shadow of Moil: ragged black-purple flames wreath the caster; necrotic tongues whip out at the edges.
  FX.register('shadow-of-moil', {
    palette: SHADOW,
    travel: 180,
    beats: (event, kit, travel) => beat(event, kit, travel, 'soft', 85),
    end: endAfter(820),
    ground(s) {
      const t = s.c.t - k.CAST;
      if (t < 0 || t > 1000) return;
      for (const target of subjects(s)) {
        const C = k.P(feet(target));
        ring(C, 17, 8, SHADOW, 1);
        ring(C, 22, 10, SHADOW, 2, true);
      }
    },
    air(s) {
      moil(s, false);
      impacts(s, WITHER, 'moil', 24, 6);
    },
    linger(s) {
      moil(s, true);
    },
  });

  // Spirit of Death: a hooded skeletal reaper rises through a death seal, its cold scythe catching the light.
  FX.register('spirit-of-death', {
    palette: GHOST,
    travel: 300,
    beats: (event, kit, travel) => beat(event, kit, travel, 'soft', 100),
    end: endAfter(900),
    ground(s) {
      const t = s.c.t - k.CAST;
      if (!point(s) || t < 0 || t > 1200) return;
      const C = k.P(point(s));
      ring({ x: C.x, y: C.y + 5 }, 18, 8, WITHER, 3, true);
      ring({ x: C.x, y: C.y + 5 }, 12, 5, GHOST, 2);
    },
    air(s) {
      const t = s.c.t - k.CAST;
      if (!point(s) || t < 0 || t > 1200) return;
      const C = k.P(point(s));
      const frame = Math.min(24, Math.floor(t / 45) * 4);
      stamp('reaper', { x: C.x, y: C.y - 9 - k.ease(k.clamp(t / 300)) * 3 }, GHOST, frame);
      if (t < 600)
        for (let i = 0; i < 10; i++) {
          const q = (s.c.raw / 650 + k.hash(i, s.event.seed || 0)) % 1,
            a = (i / 10) * k.tau;
          mote(C.x + Math.cos(a + q) * (17 - q * 10), C.y + 7 - q * 25, WITHER, 1, 3);
        }
      if (s.hits[0]) {
        const at = { x: C.x + 4, y: C.y - 20 };
        k.drawHit(k.hitStyle('25:reaper', GHOST, { S: 23, spikes: 4 }), at, s.real(s.hits[0]));
        k.shards(at, s.real(s.hits[0]), GHOST, s.event.seed || 0, 7, 18);
      }
    },
    linger(s) {
      if (!point(s) || s.linger < 0.25) return;
      const C = k.P(point(s));
      stamp('reaper', { x: C.x, y: C.y - 12 + Math.round(Math.sin(s.c.raw / 280) * 2) }, GHOST);
    },
  });

  // Gravity Sinkhole: a violet lens buckles inward, hauling orbiting rubble into a crushing white pinprick.
  FX.register('gravity-sinkhole', {
    palette: VOID,
    travel: 280,
    beats: (event, kit, travel) => beat(event, kit, travel, 'pull', 175, 0.09),
    end: endAfter(1000),
    flash: flash(VOID, 0.24),
    pushFrom: 'area',
    ground(s) {
      const t = s.c.t - k.CAST;
      if (!point(s) || t < 0 || t > 1280) return;
      const C = k.P(point(s)),
        R = radius(s, 20);
      if (t < 280) {
        const r = R * (1 - 0.78 * k.ease(t / 280));
        ring(C, r, r, VOID, 3, true);
      } else if (t < 850) {
        field(s, 'gravity');
        k.disc(C.x, C.y, 9, VOID[0]);
        ring(C, 10, 6, VOID, 4);
      } else {
        const q = k.clamp((t - 850) / 300);
        ring(C, 10 + q * R * 0.4, 6 + q * R * 0.18, VOID, 2, true);
        if (q < 0.5) mote(C.x, C.y, VOID, 2, 4);
      }
    },
    air(s) {
      const t = s.c.t - k.CAST;
      if (!point(s) || t < 0 || t > 1280) return;
      const C = k.P(point(s)),
        R = radius(s, 20);
      // Rubble uses real time even while the crushing beat freezes the spell's design clock.
      const hit = s.hits[0],
        real = hit ? s.real(hit) : -1;
      const q = real < 0 ? k.clamp(t / 280) * 0.28 : k.clamp(0.28 + real / 670);
      if (q < 1)
        for (let i = 0; i < 19; i++) {
          const a = k.hash(i, s.event.seed || 0) * k.tau + q * 2.8;
          const r = (0.4 + k.hash(i, 73) * 0.6) * R * (1 - q);
          const x = C.x + Math.cos(a) * r,
            y = C.y + Math.sin(a) * r * 0.85 - Math.sin(q * Math.PI) * 5;
          mote(x, y, i % 3 ? STONE : VOID, i % 4 ? 2 : 3, i % 3 ? 2 : 4);
        }
      if (hit) {
        k.drawHit(k.hitStyle('25:sinkhole', VOID, { S: 46, spikes: 7, jag: 0.42, void: true }), C, real);
        k.shards(C, real, VOID, s.event.seed || 0, 10, 24);
      }
      impacts(s, VOID, 'gravity', 26, 5);
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
