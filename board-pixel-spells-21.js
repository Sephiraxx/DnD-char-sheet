/* Pixel spells, batch 21 (see docs/pixel-spells/BRIEF.md). */
(function (root) {
  'use strict';
  const FX = root.BoardPixelFX;
  if (!FX) return;
  const k = FX.kit;
  const FORCE = ['#100f2b', '#343360', '#666dba', '#adaaff', '#e7e3ff', '#ffffff'];
  const HEAL = ['#10251b', '#296848', '#57b97b', '#aceba2', '#fff2ba', '#ffffff'];
  const GOLD = ['#2b1a20', '#705032', '#bd8b47', '#f1cd78', '#fff1c2', '#ffffff'];
  const THUNDER = ['#111b2d', '#354968', '#6585b0', '#b1d1ea', '#eaf8ff', '#ffffff'];
  const LIGHTNING = ['#13172f', '#354582', '#688ac5', '#b4d9ff', '#fff3ae', '#ffffff'];
  const HYPNOTIC = ['#22152f', '#643a80', '#cc5cab', '#79d4cd', '#ffe3a2', '#ffffff'];
  const TIME = ['#20182b', '#51405d', '#92718f', '#d3a876', '#ffe4a6', '#ffffff'];
  const WATER = ['#0c2030', '#25516c', '#398ba3', '#81d7dc', '#d7ffff', '#ffffff'];
  const CURSE = ['#190e25', '#392343', '#674272', '#a572aa', '#e5b8df', '#ffffff'];
  const DREAM = ['#181c35', '#3e4773', '#7b84b4', '#bdc4ed', '#f6e9bb', '#ffffff'];

  const GLYPHS = {
    word: ['..3....', '.333...', '..3.3..', '..3.33.', '..3.3..', '.333...', '..3....'],
    diamond: ['....4....', '...454...', '..45554..', '.4355534.', '..34543..', '...343...', '....3....'],
    shield: ['.4444444.', '.4333334.', '.4322234.', '.4325234.', '.4322234.', '..43334..', '...434...', '....4....'],
    hourglass: [
      '.4444444.',
      '..33333..',
      '..43234..',
      '...434...',
      '....4....',
      '...434...',
      '..43534..',
      '..33333..',
      '.4444444.',
    ],
    moon: ['...4444..', '..445....', '.445.....', '.445.....', '.445...4.', '..44444..', '...444...'],
    sleep: ['.44444.', '....4..', '...4...', '..4....', '.44444.'],
    eye: ['.3.....3.', '..33333..', '...3.3...'],
    chain: ['..222..222..', '.2...22...2.', '.2...22...2.', '..222..222..'],
    key: ['..444....', '.45554...', '.45554...', '..4444...', '.....44..', '......44.', '......4..'],
    heart: ['.33...33.', '3443.3443', '345434543', '.3444443.', '..34443..', '...343...', '....3....'],
    message: [
      '.444444444.',
      '.433333334.',
      '.434444434.',
      '.433333334.',
      '.434443334.',
      '.433333334.',
      '.444444444.',
      '...44......',
      '..4........',
    ],
    pillow: ['..3333333..', '.344444443.', '.344444443.', '..3333333..'],
    servant: [
      '....444....',
      '...43234...',
      '..4322234..',
      '..4325234..',
      '.343222343.',
      '3.3433343.3',
      '3..33333..3',
      '...3...3...',
      '..33...33..',
    ],
    cup: ['..444444...', '..433334.4.', '..432234..4', '..432234.4.', '...4334....', '...4444....'],
  };

  function glyph(name, p, ramp, scale = 1) {
    const rows = GLYPHS[name];
    const w = rows[0].length * scale + 4,
      h = rows.length * scale + 4;
    const img = k.sprite(`b21:g:${name}:${scale}:${ramp.join('')}`, w, h, ramp, set => {
      rows.forEach((row, y) =>
        [...row].forEach((ch, x) => {
          if (ch === '.') return;
          for (let yy = 0; yy < scale; yy++)
            for (let xx = 0; xx < scale; xx++) set(x * scale + xx + 2, y * scale + yy + 2, +ch);
        }),
      );
    });
    k.blit(img, p.x - w / 2, p.y - h / 2);
  }

  function speck(x, y, ramp, index = 4, size = 1) {
    k.dot(x, y, ramp[0], size + 2);
    k.dot(x, y, ramp[index], size);
  }

  // Cache ellipse contours instead of sampling a large ring with hundreds of dots each frame.
  function ring(p, rx, ry, ramp, index = 3, width = 1, gaps = 0, phase = 0) {
    rx = Math.max(2, Math.round(rx));
    ry = Math.max(2, Math.round(ry));
    phase = Math.floor(phase) % 8;
    const w = rx * 2 + 8,
      h = ry * 2 + 8;
    const img = k.sprite(`b21:r:${rx}:${ry}:${index}:${width}:${gaps}:${phase}:${ramp.join('')}`, w, h, ramp, set => {
      for (let y = 2; y < h - 2; y++)
        for (let x = 2; x < w - 2; x++) {
          const dx = x - w / 2,
            dy = y - h / 2;
          const d = Math.hypot(dx / rx, dy / ry);
          if (Math.abs(d - 1) * Math.min(rx, ry) > width / 2) continue;
          if (gaps && Math.floor((Math.atan2(dy / ry, dx / rx) / k.tau + 1) * gaps * 2 + phase) % 2) continue;
          set(x, y, index);
        }
    });
    k.blit(img, p.x - w / 2, p.y - h / 2);
  }

  function stroke(points, ramp, index = 4, width = 1, stride = 2) {
    for (const pass of [0, 1]) {
      for (let j = 1; j < points.length; j++) {
        const a = points[j - 1],
          b = points[j];
        const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / stride));
        for (let i = 0; i <= n; i++) {
          const q = i / n;
          k.dot(k.mix(a.x, b.x, q), k.mix(a.y, b.y, q), ramp[pass ? index : 0], width + (pass ? 0 : 2));
        }
      }
    }
  }

  function beats(event, travel, stop = 65, kind = 'soft', power = 0.04) {
    return (event.targets?.length ? event.targets : [null]).map(target => ({
      at: k.CAST + travel,
      stop,
      target,
      kind,
      power,
    }));
  }
  function centre(s) {
    if (!s.area) return s.pose.target || s.pose.base || s.pose.hand || { x: 0, y: 0 };
    const a = s.area;
    if (a.kind === 'circle' || a.kind === 'cylinder') return a;
    const d = a.feet / (s.grid.feet || 5) / 2;
    return { x: a.x + Math.cos(a.dir || 0) * d, y: a.y + Math.sin(a.dir || 0) * d };
  }
  function places(s) {
    return s.targets.length ? s.targets : [{ ...centre(s), span: 1, id: null }];
  }
  function hitPoint(s, hit) {
    const t = s.targets.find(t => t.id === hit.id);
    return k.P(t ? k.contact(t, s.pose.hand || centre(s)) : centre(s));
  }
  function marks(s, ramp, key, size = 23, count = 5, reach = 18) {
    for (const [i, hit] of s.hits.entries()) {
      const p = hitPoint(s, hit),
        e = s.real(hit);
      k.drawHit(k.hitStyle(`b21:${key}:${ramp.join('')}`, ramp, { S: size, spikes: 4, minor: 2, jag: 0.2 }), p, e);
      k.shards(p, e, ramp, (s.event.seed || 0) + i * 19, count, reach);
    }
  }
  function foot(t) {
    return k.P({ x: t.baseX ?? t.x, y: t.baseY ?? t.y });
  }
  function age(s) {
    return s.c.t - k.CAST;
  }
  function softGround(s, ramp, duration = 700) {
    const e = age(s);
    if (e < 0 || e > duration) return;
    const q = k.clamp(e / duration);
    places(s).forEach(t => ring(foot(t), 9 + k.ease(q) * 8, 4 + q * 4, ramp, q < 0.3 ? 4 : 2, 1, q > 0.65 ? 8 : 0));
  }

  // Rasterize the actual template; all extensive bodies stay beneath the miniatures.
  function field(s, mode, frame, ramp) {
    if (!s.area) return;
    const raw = k.outline(s.area, s.grid);
    if (raw.length < 3) return;
    const poly = raw.map(p => k.P(Array.isArray(p) ? { x: p[0], y: p[1] } : p));
    const x0 = Math.floor(Math.min(...poly.map(p => p.x))) - 3;
    const y0 = Math.floor(Math.min(...poly.map(p => p.y))) - 3;
    const w = Math.ceil(Math.max(...poly.map(p => p.x))) - x0 + 4;
    const h = Math.ceil(Math.max(...poly.map(p => p.y))) - y0 + 4;
    const points = poly.map(p => ({ x: Math.round(p.x - x0), y: Math.round(p.y - y0) }));
    const a = k.P(s.area),
      dir = s.area.dir || 0;
    const length = (s.area.feet / (s.grid.feet || 5)) * 16;
    const ax = a.x - x0,
      ay = a.y - y0;
    const img = k.sprite(
      `b21:field:${mode}:${frame}:${w}:${h}:${points.map(p => `${p.x},${p.y}`).join(';')}:${ramp.join('')}`,
      w,
      h,
      ramp,
      set => {
        for (let y = 2; y < h - 2; y++)
          for (let x = 2; x < w - 2; x++) {
            let inside = false;
            for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
              const p = points[i],
                q = points[j];
              if (p.y > y !== q.y > y && x < ((q.x - p.x) * (y - p.y)) / (q.y - p.y) + p.x) inside = !inside;
            }
            if (!inside) continue;
            const u = ((x - ax) * Math.cos(dir) + (y - ay) * Math.sin(dir)) / length;
            const v = (-(x - ax) * Math.sin(dir) + (y - ay) * Math.cos(dir)) / length;
            if (mode === 'pulse') {
              const front = (frame + 1) / 9;
              const d = front - u;
              if (d >= 0 && d < 0.19) set(x, y, d < 0.025 ? 5 : d < 0.06 ? 4 : d < 0.12 ? 3 : 1);
              else if (d > 0.22 && d < 0.25 && u > 0.02) set(x, y, 2);
            } else if (mode === 'hypnotic') {
              const ribbon = Math.sin(u * 15 + frame * 0.75) * 0.13;
              const lane = Math.abs((((v - ribbon + 2) * 7) % 1) - 0.5);
              const diamond = Math.abs(((u * 7 + frame / 8) % 1) - 0.5) + Math.abs(((v * 7 + 4) % 1) - 0.5);
              if (lane < 0.08) set(x, y, 3);
              else if (diamond < 0.19) set(x, y, 4);
              else if (diamond < 0.27) set(x, y, 2);
            } else {
              const edge = Math.min(u, 1 - u, v + 0.5, 0.5 - v) * length;
              if (edge < 2 && edge >= 0) set(x, y, frame < 2 ? 4 : 2);
              // Widely spaced temporal grid lines, visibly stepping farther apart.
              else if ((Math.floor(u * length) + frame * 2) % 24 < 2 && Math.floor((v + 0.5) * length) % 24 < 12)
                set(x, y, 2);
            }
          }
      },
    );
    k.blit(img, x0, y0);
  }

  // Pulse Wave: violet force compresses into a widening, flat-fronted cone and kicks out stone chips.
  FX.register('pulse-wave', {
    palette: FORCE,
    travel: 210,
    beats: (event, kit, travel) => beats(event, travel, 150, 'blast', 0.085),
    end: () => 1080,
    ground(s) {
      const e = age(s);
      if (e < 0 || e > 510) return;
      const f = Math.min(8, Math.floor(e / 30));
      if (e < 270) field(s, 'pulse', f, FORCE);
      else if (e < 420) field(s, 'pulse', 8, [FORCE[0], FORCE[1], FORCE[1], FORCE[2], FORCE[2], FORCE[3]]);
    },
    air(s) {
      if (age(s) < 0) return;
      marks(s, FORCE, 'pulse', 34, 8, 26);
      if (!s.area || !s.hits[0]) return;
      const e = s.real(s.hits[0]);
      if (e < 0 || e > 410) return;
      const a = s.area,
        d = a.feet / (s.grid.feet || 5),
        dir = a.dir || 0;
      for (let i = 0; i < 10; i++) {
        const side = (i / 9 - 0.5) * d * 0.9;
        const q = k.ease(k.clamp(e / 330));
        const along = d * (0.7 + q * 0.25);
        const p = k.P({
          x: a.x + Math.cos(dir) * along - Math.sin(dir) * side,
          y: a.y + Math.sin(dir) * along + Math.cos(dir) * side,
        });
        speck(p.x, p.y - Math.sin(q * Math.PI) * 10 + q * 6, FORCE, i % 2 ? 2 : 3, 2);
      }
    },
    flash: (event, e) => (e < 30 ? { color: FORCE[4], alpha: 0.16 } : e < 65 ? { color: FORCE[0], alpha: 0.12 } : null),
  });

  // Mass Healing Word: a spoken green-gold rune fans into six-or-fewer allies and blossoms upward.
  FX.register('mass-healing-word', {
    palette: HEAL,
    travel: 280,
    beats: (event, kit, travel) => beats(event, travel, 75),
    end: () => 1170,
    ground: s => softGround(s, HEAL, 770),
    air(s) {
      const e = age(s);
      if (e < 0 || e > 850) return;
      const H = k.P(s.pose.hand || s.pose.base || centre(s));
      if (e < 180) {
        glyph('word', { x: H.x + 5, y: H.y - 5 }, HEAL);
        ring(H, 6 + e / 16, 4 + e / 26, HEAL, 4, 1, 5);
      }
      places(s).forEach((t, i) => {
        const T = k.P(t);
        if (e < 280) {
          const q = e / 280;
          const p = { x: k.mix(H.x, T.x, q), y: k.mix(H.y, T.y, q) - Math.sin(q * Math.PI) * (8 + (i % 3) * 4) };
          glyph('word', p, HEAL);
          speck(p.x - 4, p.y + 5, HEAL, 3);
        }
        const hit = s.hits.find(h => h.id === t.id) || s.hits[0],
          r = s.real(hit);
        if (r >= 90 && r < 560) {
          glyph('heart', { x: T.x, y: T.y - 9 - k.ease(r / 560) * 9 }, HEAL);
          for (let j = 0; j < 3; j++) speck(T.x + (j - 1) * 8, T.y + 6 - ((r / 40 + j * 6) % 24), HEAL, j % 2 ? 4 : 3);
        }
      });
      marks(s, HEAL, 'mass-word', 22, 4, 13);
    },
  });

  // Thunder Step: a violent sonic crack at departure, then a separate blue-white arrival aperture.
  FX.register('thunder-step', {
    palette: THUNDER,
    travel: 60,
    beats(event, kit, travel) {
      return [
        ...beats(event, travel, 150, 'blast', 0.09),
        { at: 620, stop: 60, target: null, kind: 'soft', power: 0.03 },
      ];
    },
    end: () => 1180,
    reach: () => ({ r: 4, up: 3 }),
    ground(s) {
      const e = age(s);
      if (e < 0 || e > 780) return;
      const A = k.P(s.event.teleport?.from || s.pose.base || s.pose.hand || centre(s));
      const B = k.P(s.event.teleport?.to || s.pose.target || centre(s));
      if (e < 420) {
        for (let i = 0; i < 2; i++) {
          const q = k.clamp((e - i * 50) / 350);
          if (e < i * 50 || q >= 1) continue;
          ring(A, 7 + q * 27, 4 + q * 17, THUNDER, q < 0.25 ? 5 : 3, q < 0.4 ? 2 : 1, q > 0.6 ? 9 : 0);
        }
      }
      if (e >= 280 && e < 690)
        ring(B, 12 + Math.sin(((e - 280) / 410) * Math.PI) * 5, 6, THUNDER, 4, 1, e > 570 ? 6 : 0);
    },
    air(s) {
      const A = k.P(s.event.teleport?.from || s.pose.base || s.pose.hand || centre(s));
      const B = k.P(s.event.teleport?.to || s.pose.target || centre(s));
      const e = age(s),
        hit = s.hits[0];
      if (e < 0 || e > 870) return;
      const real = s.real(hit);
      k.drawHit(
        k.hitStyle('b21:thunder-depart', THUNDER, { S: 52, spikes: 8, jag: 0.4, void: true }),
        { x: A.x, y: A.y - 7 },
        real,
      );
      k.shards(A, real, THUNDER, s.event.seed || 0, 12, 32);
      marks(s, THUNDER, 'thunder-contact', 27, 5, 20);
      const arrival = s.real(s.hits[s.hits.length - 1]);
      if (arrival >= 0 && arrival < 420) {
        ring({ x: B.x, y: B.y - 9 }, Math.max(3, 11 - arrival / 45), 17, THUNDER, 4, 2, arrival > 250 ? 6 : 0);
        k.shards({ x: B.x, y: B.y - 9 }, arrival, THUNDER, (s.event.seed || 0) + 41, 6, 16);
      }
    },
    flash: (event, e) =>
      e < 30 ? { color: THUNDER[5], alpha: 0.22 } : e < 70 ? { color: THUNDER[0], alpha: 0.18 } : null,
  });

  // Hypnotic Pattern: interlocking rose, turquoise and gold ribbons fill the cube, catching eyes in spirals.
  FX.register('hypnotic', {
    palette: HYPNOTIC,
    travel: 120,
    beats: (event, kit, travel) => beats(event, travel, 80),
    end: () => 1450,
    ground(s) {
      const e = age(s);
      if (e >= 0 && e < 1050) field(s, 'hypnotic', Math.min(7, Math.floor(e / 110)), HYPNOTIC);
    },
    air(s) {
      const e = age(s);
      if (e < 0 || e > 1100) return;
      places(s).forEach((t, i) => {
        const p = k.P(t),
          h = s.hits.find(h => h.id === t.id) || s.hits[0],
          r = s.real(h);
        if (r < 0) return;
        for (let j = 0; j < 13; j++) {
          const a = j * 0.65 + Math.floor(e / 140) * 0.25 + i;
          const radius = 2 + j * 0.6;
          speck(p.x + Math.cos(a) * radius, p.y - 14 + Math.sin(a) * radius * 0.5, HYPNOTIC, 2 + (j % 3));
        }
      });
      marks(s, HYPNOTIC, 'hypnosis', 19, 3, 12);
    },
  });

  function hut(s, e) {
    const at = k.P(s.area || s.pose.base || centre(s));
    const radius = Math.round(((s.area?.feet || 10) / (s.grid.feet || 5)) * 16);
    const f = Math.min(5, Math.floor(e / 60));
    const r = Math.max(9, Math.round(radius * (0.3 + 0.7 * k.ease(f / 5))));
    const w = r * 2 + 10,
      h = r + Math.ceil(r * 0.4) + 10,
      cx = w / 2,
      cy = r + 4;
    const img = k.sprite(`b21:hut:${r}`, w, h, GOLD, set => {
      for (let y = 2; y < h - 2; y++)
        for (let x = 2; x < w - 2; x++) {
          const dx = (x - cx) / r,
            dy = (y - cy) / r;
          const d = Math.hypot(dx, dy);
          const base = Math.abs(Math.hypot(dx, dy / 0.32) - 1) * r;
          if (base < 1.1) {
            set(x, y, 4);
            continue;
          }
          if (dy > 0 || d > 1) continue;
          // Solid banded rim and architectural ribs surround a clear interior.
          const rim = (1 - d) * r;
          const rib = Math.min(Math.abs(dx - dy * 0.52), Math.abs(dx + dy * 0.52));
          if (rim < 3) set(x, y, rim < 1 ? 4 : 2);
          else if (rib * r < 1.1 || Math.abs(dy + 0.47) * r < 1) set(x, y, 3);
          else if (dy < -0.72 && (x + y) % 4 === 0) set(x, y, 1);
        }
    });
    k.blit(img, at.x - cx, at.y - cy);
    if (e < 700)
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * k.tau;
        glyph('word', { x: at.x + Math.cos(a) * r * 0.86, y: at.y + Math.sin(a) * r * 0.28 }, GOLD);
      }
  }

  // Leomund's Tiny Hut: an amber hemispherical shelter locks its ribs into a sealed circular foundation.
  FX.register('leomunds-tiny-hut', {
    palette: GOLD,
    travel: 300,
    beats: (event, kit, travel) => [{ at: kit.CAST + travel, stop: 85, target: null, kind: 'soft', power: 0.03 }],
    end: () => 1390,
    reach: (event, grid) => ({ r: (event.area?.feet || 10) / (grid.feet || 5) + 1, up: 3 }),
    ground(s) {
      const e = age(s);
      if (e >= 0 && e < 1090) hut(s, e);
    },
    air(s) {
      const h = s.hits[0],
        e = s.real(h),
        p = k.P(s.area || s.pose.base || centre(s));
      p.y -= ((s.area?.feet || 10) / (s.grid.feet || 5)) * 16;
      k.drawHit(k.hitStyle('b21:hut-lock', GOLD, { S: 22, spikes: 4, jag: 0 }), p, e);
      k.shards(p, e, GOLD, s.event.seed || 0, 5, 14);
    },
    linger(s) {
      if (s.c.t >= 1390 && s.linger > 0.25) hut(s, 1000);
    },
  });

  // Protection from Energy: a faceted elemental shield closes around the recipient and catches orbiting sparks.
  FX.register('protection-from-energy', {
    palette: event =>
      ['fire', 'frost', 'lightning', 'trueno', '\u00e1cido'].includes(event.element) ? k.paletteFor(event) : WATER,
    travel: 180,
    beats: (event, kit, travel) => beats(event, travel, 75),
    end: () => 1190,
    ground: s => softGround(s, s.ramp, 800),
    air(s) {
      const e = age(s),
        ramp = s.ramp;
      if (e < 0 || e > 870) return;
      places(s).forEach(t => {
        const p = k.P(t);
        if (e < 180) {
          const q = e / 180;
          for (let i = 0; i < 4; i++) {
            const a = (i * k.tau) / 4 + q;
            speck(p.x + Math.cos(a) * (25 - q * 13), p.y + Math.sin(a) * (21 - q * 5), ramp, 4, 2);
          }
        } else {
          ring(p, 12, 17, ramp, 3, 1, e > 700 ? 8 : 0);
          glyph('shield', { x: p.x, y: p.y - 16 }, ramp);
          for (let i = 0; i < 3; i++) {
            const a = e / 180 + (i * k.tau) / 3;
            speck(p.x + Math.cos(a) * 13, p.y + Math.sin(a) * 17, ramp, i % 2 ? 4 : 3, 2);
          }
        }
      });
      marks(s, ramp, 'energy-seal', 21, 4, 14);
    },
  });

  // Remove Curse: dark linked fetters tighten once, split at a golden key, and scatter away from the body.
  FX.register('remove-curse', {
    palette: GOLD,
    travel: 260,
    beats: (event, kit, travel) => beats(event, travel, 115),
    end: () => 1190,
    ground: s => softGround(s, GOLD, 790),
    air(s) {
      const e = age(s);
      if (e < 0 || e > 890) return;
      places(s).forEach((t, i) => {
        const p = k.P(t),
          hit = s.hits.find(h => h.id === t.id) || s.hits[0],
          r = s.real(hit);
        if (r < 0) {
          glyph('chain', { x: p.x - 5, y: p.y + 2 }, CURSE);
          glyph('chain', { x: p.x + 5, y: p.y - 6 }, CURSE);
          glyph('key', { x: p.x, y: p.y - 18 + e / 24 }, GOLD);
        } else {
          k.shards(p, r, CURSE, (s.event.seed || 0) + i * 17, 9, 25);
          if (r < 480) {
            glyph('key', { x: p.x, y: p.y - 5 - r / 32 }, GOLD);
            ring(p, 7 + k.ease(k.clamp(r / 480)) * 13, 6 + r / 60, GOLD, r < 100 ? 5 : 3, 1, r > 250 ? 7 : 0);
          }
        }
      });
      marks(s, GOLD, 'curse-break', 29, 5, 18);
    },
  });

  // Slow: a bronze temporal lattice traps the cube; hourglasses turn and clock hands advance in heavy ticks.
  FX.register('slow', {
    palette: TIME,
    travel: 170,
    beats: (event, kit, travel) => beats(event, travel, 125),
    end: () => 1510,
    ground(s) {
      const e = age(s);
      if (e < 0 || e > 1200) return;
      field(s, 'slow', Math.min(5, Math.floor(e / 190)), TIME);
      const p = k.P(centre(s));
      ring(p, 22, 12, TIME, 3, 1, 12, 0);
      glyph('hourglass', p, TIME, 2);
    },
    air(s) {
      const e = age(s);
      if (e < 170 || e > 1200) return;
      places(s).forEach(t => {
        const p = k.P(t),
          C = { x: p.x, y: p.y - 17 };
        ring(C, 7, 7, TIME, 3);
        const tick = Math.floor((e - 170) / 300),
          a = -Math.PI / 2 + (tick * Math.PI) / 4;
        stroke([{ x: C.x - 3, y: C.y + 2 }, C, { x: C.x + Math.cos(a) * 5, y: C.y + Math.sin(a) * 5 }], TIME, 4);
        speck(C.x, C.y, TIME, 5);
      });
      marks(s, TIME, 'slow-tick', 20, 4, 11);
    },
  });

  // Sending: a silver-blue speech tablet becomes a racing word, reaches an ear, and returns a reply.
  FX.register('sending', {
    palette: DREAM,
    travel: 460,
    beats(event, kit, travel) {
      return [...beats(event, travel, 60), { at: 1190, stop: 50, target: null, kind: 'soft', power: 0.03 }];
    },
    end: () => 1570,
    air(s) {
      const e = age(s);
      if (e < 0 || e > 1220) return;
      const H = k.P(s.pose.hand || s.pose.base || centre(s));
      const T = k.P(s.targets[0] || s.pose.target || centre(s));
      const there = e < 460;
      const back = e >= 600 && e < 890;
      if (there || back) {
        const q = there ? e / 460 : (e - 600) / 290;
        const A = there ? H : T,
          B = there ? T : H;
        const p = { x: k.mix(A.x, B.x, q), y: k.mix(A.y, B.y, q) - Math.sin(q * Math.PI) * (there ? 18 : 10) };
        glyph('word', p, DREAM);
        for (let i = 1; i <= 5; i++) {
          const u = q - i * 0.045;
          if (u < 0) continue;
          speck(
            k.mix(A.x, B.x, u),
            k.mix(A.y, B.y, u) - Math.sin(u * Math.PI) * (there ? 18 : 10),
            DREAM,
            i < 3 ? 4 : 2,
          );
        }
      }
      if (e >= 460 && e < 700) {
        glyph('message', { x: T.x + 8, y: T.y - 14 }, DREAM);
        ring({ x: T.x + 4, y: T.y - 5 }, 5 + (e - 460) / 26, 8, DREAM, 4, 1, 4);
      }
      const first = s.hits[0],
        r = s.real(first);
      k.drawHit(k.hitStyle('b21:sending-ear', DREAM, { S: 17, spikes: 4, jag: 0 }), T, r);
      k.shards(T, r, DREAM, s.event.seed || 0, 3, 10);
      const answer = s.real(s.hits[s.hits.length - 1]);
      k.drawHit(k.hitStyle('b21:sending-answer', DREAM, { S: 17, spikes: 4, jag: 0 }), H, answer);
      k.shards(H, answer, DREAM, (s.event.seed || 0) + 39, 3, 9);
      if (e >= 890 && e < 1120) glyph('message', { x: H.x + 7, y: H.y - 11 }, DREAM);
    },
  });

  // Lightning Bolt: a white-hot, forked electrical stroke snaps along the full 100-foot template.
  FX.register('lightning-bolt', {
    palette: LIGHTNING,
    travel: 35,
    beats: (event, kit, travel) => beats(event, travel, 130, 'beam', 0.08),
    end: () => 1020,
    ground(s) {
      const e = age(s);
      if (e < 120 || e > 570) return;
      const a = s.area,
        A = k.P(a || s.pose.hand || centre(s));
      const B = a
        ? k.P({
            x: a.x + (Math.cos(a.dir || 0) * a.feet) / (s.grid.feet || 5),
            y: a.y + (Math.sin(a.dir || 0) * a.feet) / (s.grid.feet || 5),
          })
        : k.P(centre(s));
      for (let i = 0; i < 16; i++) {
        const q = (i + 0.5) / 16;
        if (e > 380 && i % 2) continue;
        speck(k.mix(A.x, B.x, q), k.mix(A.y, B.y, q) + 2, LIGHTNING, 1, 2);
      }
    },
    air(s) {
      const e = age(s);
      if (e < 0 || e > 720) return;
      const a = s.area,
        A = k.P(a || s.pose.hand || centre(s));
      const B = a
        ? k.P({
            x: a.x + (Math.cos(a.dir || 0) * a.feet) / (s.grid.feet || 5),
            y: a.y + (Math.sin(a.dir || 0) * a.feet) / (s.grid.feet || 5),
          })
        : k.P(s.pose.target || centre(s));
      const dx = B.x - A.x,
        dy = B.y - A.y,
        L = Math.hypot(dx, dy) || 1,
        nx = -dy / L,
        ny = dx / L;
      if (e < 290) {
        const tick = Math.floor(e / 65),
          n = Math.max(8, Math.ceil(L / 11));
        const points = Array.from({ length: n + 1 }, (_, i) => {
          const q = i / n,
            off = i === 0 || i === n ? 0 : (k.hash(i, s.event.seed || 0, tick) - 0.5) * 13;
          return { x: k.mix(A.x, B.x, q) + nx * off, y: k.mix(A.y, B.y, q) + ny * off };
        });
        // Discrete chunks break apart after the electrical hold; never a fading beam.
        const w = e < 85 ? 4 : e < 170 ? 3 : 1;
        for (let j = 1; j < points.length; j++) {
          if (e > 195 && j % 3 === tick % 3) continue;
          stroke([points[j - 1], points[j]], LIGHTNING, e < 110 ? 5 : 4, w, 4);
        }
        for (let i = 1; i <= 3; i++) {
          const p = points[Math.floor((n * i) / 4)],
            side = i % 2 ? 1 : -1;
          stroke(
            [
              p,
              { x: p.x + nx * side * 10 + (dx / L) * 5, y: p.y + ny * side * 10 + (dy / L) * 5 },
              { x: p.x + nx * side * 17 + (dx / L) * 16, y: p.y + ny * side * 17 + (dy / L) * 16 },
            ],
            LIGHTNING,
            3,
            1,
            4,
          );
        }
      }
      marks(s, LIGHTNING, 'lightning', 34, 7, 23);
    },
    flash: (event, e) =>
      e < 28 ? { color: LIGHTNING[5], alpha: 0.24 } : e < 65 ? { color: LIGHTNING[0], alpha: 0.18 } : null,
  });

  // Water Breathing: aqua gill brackets open beside each face as clear, outlined bubbles rise and pop.
  FX.register('water-breathing', {
    palette: WATER,
    travel: 210,
    beats: (event, kit, travel) => beats(event, travel, 65),
    end: () => 1230,
    ground: s => softGround(s, WATER, 820),
    air(s) {
      const e = age(s);
      if (e < 0 || e > 920) return;
      places(s).forEach((t, i) => {
        const p = k.P(t),
          hit = s.hits.find(h => h.id === t.id) || s.hits[0],
          r = s.real(hit);
        if (e < 720)
          for (const side of [-1, 1]) {
            for (let j = 0; j < 2; j++) {
              const x = p.x + side * (7 + j * 2),
                y = p.y - 8 + j * 3;
              stroke(
                [
                  { x: x + side * 2, y: y - 2 },
                  { x, y },
                  { x: x + side * 2, y: y + 2 },
                ],
                WATER,
                e < 210 ? 3 : 4,
                1,
                3,
              );
            }
          }
        if (r < 0) return;
        for (let j = 0; j < 5; j++) {
          const b = r - j * 65;
          if (b < 0 || b > 470) continue;
          const q = b / 470,
            x = p.x + (k.hash(j, s.event.seed || 0, i) - 0.5) * 21 + Math.sin(q * 4 + j) * 2;
          const y = p.y + 6 - q * 27,
            size = 2 + (j % 3);
          if (q < 0.8) {
            ring({ x, y }, size, size, WATER, 3);
            speck(x - 1, y - 1, WATER, 5);
          } else {
            speck(x - 3, y, WATER, 4);
            speck(x + 3, y - 2, WATER, 3);
          }
        }
      });
      marks(s, WATER, 'gills', 19, 3, 12);
    },
  });

  // Revivify: a descending diamond shatters into gold, and a sharp heartbeat relights the fallen body.
  FX.register('revivify', {
    palette: GOLD,
    travel: 380,
    beats: (event, kit, travel) => beats(event, travel, 160),
    end: () => 1620,
    ground(s) {
      const e = age(s);
      if (e < 0 || e > 1190) return;
      places(s).forEach(t => {
        const p = foot(t);
        ring(
          p,
          e < 380 ? 17 - e / 45 : 10 + k.ease(k.clamp((e - 380) / 450)) * 12,
          7,
          GOLD,
          e < 380 ? 2 : 4,
          1,
          e > 950 ? 8 : 0,
        );
      });
    },
    air(s) {
      const e = age(s);
      if (e < 0 || e > 1320) return;
      places(s).forEach((t, i) => {
        const p = k.P(t),
          hit = s.hits.find(h => h.id === t.id) || s.hits[0],
          r = s.real(hit);
        if (r < 0) {
          glyph('diamond', { x: p.x, y: p.y - 27 + k.ease(e / 380) * 20 }, GOLD, 2);
          for (let j = 0; j < 4; j++) {
            const q = k.clamp(e / 380),
              a = (j * k.tau) / 4 + q;
            speck(p.x + Math.cos(a) * (18 - q * 14), p.y + Math.sin(a) * (12 - q * 9), CURSE, 2);
          }
        } else {
          k.shards({ x: p.x, y: p.y - 5 }, r, GOLD, (s.event.seed || 0) + i * 11, 10, 24);
          if (r > 110 && r < 800) {
            const C = { x: p.x, y: p.y - 4 };
            glyph('heart', { x: C.x, y: C.y - Math.min(10, (r - 110) / 55) }, HEAL, r < 220 ? 2 : 1);
            const line = [
              { x: C.x - 18, y: C.y + 8 },
              { x: C.x - 7, y: C.y + 8 },
              { x: C.x - 3, y: C.y + 3 },
              { x: C.x, y: C.y + 13 },
              { x: C.x + 4, y: C.y - 1 },
              { x: C.x + 8, y: C.y + 8 },
              { x: C.x + 18, y: C.y + 8 },
            ];
            if (r < 510) stroke(line, GOLD, 4, 1);
            for (let j = 0; j < 4; j++)
              speck(C.x + (j - 1.5) * 6, C.y + 6 - ((r / 26 + j * 7) % 27), GOLD, j % 2 ? 3 : 4);
          }
        }
      });
      marks(s, GOLD, 'life-return', 39, 6, 22);
    },
    flash: (event, e) => (e < 35 ? { color: GOLD[4], alpha: 0.15 } : null),
  });

  // Catnap: a lilac pillow settles, eyelids close, and a tiny crescent carries rising sleep runes.
  FX.register('catnap', {
    palette: DREAM,
    travel: 240,
    beats: (event, kit, travel) => beats(event, travel, 85),
    end: () => 1350,
    ground(s) {
      const e = age(s);
      if (e < 0 || e > 1040) return;
      places(s).forEach(t => {
        const p = foot(t);
        ring(p, 12, 6, DREAM, 2, 1, 6);
        glyph('pillow', { x: p.x, y: p.y - 1 }, DREAM, 2);
      });
    },
    air(s) {
      const e = age(s);
      if (e < 0 || e > 1050) return;
      places(s).forEach(t => {
        const p = k.P(t),
          hit = s.hits.find(h => h.id === t.id) || s.hits[0],
          r = s.real(hit);
        const moon = { x: p.x + 11, y: p.y - 17 - Math.min(5, e / 100) };
        glyph('moon', moon, DREAM);
        if (r < 0) return;
        glyph('eye', { x: p.x, y: p.y - 4 }, DREAM);
        for (let j = 0; j < 3; j++) {
          const q = (r - j * 130) / 670;
          if (q < 0 || q >= 1) continue;
          glyph('sleep', { x: p.x - 4 + q * 11 + Math.sin(q * 4) * 2, y: p.y - 8 - q * 19 }, DREAM);
        }
      });
      marks(s, DREAM, 'catnap', 17, 3, 10);
    },
  });

  // Tiny Servant: a mundane cup sprouts bright eyes, wiry arms and feet, then takes two eager little steps.
  FX.register('tiny-servant', {
    palette: GOLD,
    travel: 320,
    beats: (event, kit, travel) => [
      { at: kit.CAST + travel, stop: 85, target: event.targets?.[0] ?? null, kind: 'soft', power: 0.03 },
    ],
    end: () => 1430,
    ground(s) {
      const e = age(s);
      if (e < 0 || e > 1080) return;
      const p = k.P(s.pose.target || s.targets[0] || centre(s));
      ring({ x: p.x, y: p.y + 5 }, e < 320 ? 12 : 10, 5, GOLD, e < 320 ? 3 : 2, 1, e > 700 ? 6 : 0);
    },
    air(s) {
      const e = age(s),
        hit = s.hits[0];
      if (e < 0 || e > 1130) return;
      const p = k.P(s.pose.target || s.targets[0] || centre(s));
      const r = s.real(hit);
      if (r < 0) {
        glyph('cup', p, GOLD, 2);
        for (let j = 0; j < 5; j++) {
          const a = (j / 5) * k.tau + e / 120,
            radius = 17 - e / 32;
          speck(p.x + Math.cos(a) * radius, p.y + Math.sin(a) * radius * 0.6, GOLD, 4);
        }
      } else {
        const step = Math.min(2, Math.floor(Math.max(0, e - 450) / 190));
        const hop = e >= 450 && e < 830 ? -Math.sin((((e - 450) % 190) / 190) * Math.PI) * 3 : 0;
        glyph('servant', { x: p.x + step * 3, y: p.y + hop - 2 }, GOLD, 2);
        if (r < 490) {
          glyph('word', { x: p.x + 15, y: p.y - 13 - Math.min(5, r / 75) }, GOLD);
          k.shards(p, r, GOLD, s.event.seed || 0, 6, 18);
        }
      }
      k.drawHit(k.hitStyle('b21:servant-wake', GOLD, { S: 23, spikes: 4, jag: 0 }), p, r);
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
