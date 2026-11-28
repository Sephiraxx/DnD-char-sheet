/* Pixel spells, batch 50: large silhouettes, held peaks and real-time contact debris. */
(function (root) {
  'use strict';
  const FX = root.BoardPixelFX;
  if (!FX) return;
  const k = FX.kit;
  const GOLD = ['#30200c', '#885019', '#d59426', '#ffd45b', '#fff1b5', '#ffffff'];
  const LIFE = ['#102b23', '#276e48', '#53b77c', '#b1ef86', '#fff0a4', '#ffffff'];
  const WATER = ['#101f39', '#255583', '#499ecb', '#8cdeff', '#dcf8ff', '#ffffff'];
  const MIND = ['#360f2d', '#8c254c', '#d64c83', '#ff90be', '#ffe0c8', '#ffffff'];
  const DEAD = ['#192331', '#475766', '#8196a3', '#b9d0d8', '#e2f0ed', '#ffffff'];
  const GHOST = ['#142d2c', '#396c60', '#78b19a', '#b9efcf', '#eaffec', '#ffffff'];
  const FIRE = ['#300f15', '#913320', '#df672b', '#ffa94b', '#ffe297', '#ffffff'];

  const list = s => (s.targets.length ? s.targets : [s.pose.target || s.pose.base].filter(Boolean));
  const feet = t => k.P({ x: t.baseX ?? t.x, y: t.baseY ?? t.y });
  const caster = s => k.P(s.pose.base || s.pose.hand || s.pose.target);
  const beat = (s, t) => s.hits.find(h => h.id === t.id) || s.hits[0];
  const age = (s, t) => s.c.t - beat(s, t).at;
  const soft = (event, kit, travel) =>
    (event.targets?.length ? event.targets : [null]).map(target => ({
      at: kit.CAST + travel,
      stop: 90,
      target,
      kind: 'soft',
      power: 0.035,
    }));
  const end = (event, travel) => k.CAST + travel + 900;
  function art(name, w, h, p, paint) {
    return k.sprite('b50:' + name + ':' + p.join(''), w, h, p, set => {
      const rect = (x, y, w0, h0, ink) => {
        for (let yy = y; yy < y + h0; yy++) for (let xx = x; xx < x + w0; xx++) set(xx, yy, ink);
      };
      const line = (a, b, ink, width = 2) => {
        const n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y));
        for (let j = 0; j <= n; j++) {
          const q = j / Math.max(1, n);
          rect(Math.round(k.mix(a.x, b.x, q)), Math.round(k.mix(a.y, b.y, q)), width, width, ink);
        }
      };
      paint(set, rect, line);
    });
  }
  function stamp(img, x, y, alpha = 1) {
    k.blit(img, x - img.width / 2, y - img.height / 2, alpha);
  }
  function dot(x, y, p, ink = 4, width = 2) {
    k.dot(x, y, p[0], width + 2);
    k.dot(x, y, p[ink], width);
  }
  function stroke(points, p, width = 2, ink = 4) {
    for (const [color, size] of [
      [p[0], width + 2],
      [p[ink], width],
    ])
      for (let i = 0; i < points.length; i++) k.dot(points[i].x, points[i].y, color, size);
  }
  function ray(a, b, p, width = 2, ink = 4) {
    const n = Math.min(48, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 2));
    stroke(
      Array.from({ length: n + 1 }, (_, i) => ({
        x: k.mix(a.x, b.x, i / Math.max(1, n)),
        y: k.mix(a.y, b.y, i / Math.max(1, n)),
      })),
      p,
      width,
      ink,
    );
  }
  // Cached rings keep the full 30-foot aura cheap; all structural bands are 2-3 pixels wide.
  function ring(x, y, rx, ry, p, alpha = 1, ink = 4, width = 2) {
    rx = Math.max(2, Math.round(rx));
    ry = Math.max(2, Math.round(ry));
    const img = art('ring:' + [rx, ry, ink, width], rx * 2 + 8, ry * 2 + 8, p, set => {
      for (let yy = 1; yy < ry * 2 + 7; yy++)
        for (let xx = 1; xx < rx * 2 + 7; xx++) {
          const dx = xx - rx - 4,
            dy = yy - ry - 4;
          const a = Math.atan2(dy / ry, dx / rx);
          const edge = Math.hypot(Math.cos(a) * rx, Math.sin(a) * ry);
          const d = Math.hypot(dx, dy) - edge;
          if (Math.abs(d) <= width / 2) set(xx, yy, dy < -ry * 0.3 ? 5 : ink);
        }
    });
    stamp(img, x, y, alpha);
  }
  const GLYPHS = {
    plus: ['..333..', '..353..', '3335333', '3555553', '3335333', '..353..', '..333..'],
    skull: [
      '..44444..',
      '.4555554.',
      '455555554',
      '451151154',
      '451151154',
      '.4551554.',
      '..45554..',
      '..45454..',
      '..44444..',
    ],
    question: ['.444.', '45554', '4..54', '...54', '..54.', '..4..', '..5..'],
    exclaim: ['454', '454', '454', '454', '.4.', '...', '.5.'],
    heart: ['.333.333.', '344434443', '345444543', '344444443', '.3444443.', '..34443..', '...343...', '....3....'],
    rune: ['..4..', '.454.', '45.54', '.454.', '..4..', '.4.4.', '4...4'],
  };
  function glyph(name, p, scale = 2) {
    const rows = GLYPHS[name];
    return art('glyph:' + name + ':' + scale, rows[0].length * scale + 4, rows.length * scale + 4, p, (set, rect) =>
      rows.forEach((row, y) =>
        [...row].forEach((ch, x) => {
          if (ch !== '.') rect(x * scale + 2, y * scale + 2, scale, scale, Number(ch));
        }),
      ),
    );
  }
  function impact(s, t, p, name, size = 26, count = 6, reach = 20) {
    const e = s.real(beat(s, t)),
      T = k.P(t);
    k.drawHit(k.hitStyle('b50:' + name, p, { S: size, spikes: 6, jag: 0.2 }), T, e);
    k.shards(T, e, p, (s.event.seed || 0) + 17, count, reach);
  }
  function delivery(s, t, p, bow = 8) {
    const h = beat(s, t),
      e = s.c.t - k.CAST;
    if (e < 0 || s.c.t >= h.at || !s.pose.hand) return;
    const H = k.P(s.pose.hand),
      T = k.P(t),
      q = e / Math.max(1, h.at - k.CAST);
    const path = u => ({ x: k.mix(H.x, T.x, u), y: k.mix(H.y, T.y, u) - Math.sin(u * Math.PI) * bow });
    const points = Array.from({ length: 14 }, (_, i) => path(Math.max(0, q - i * 0.018)));
    stroke(points, p, 3, 3);
    const at = path(q);
    dot(at.x, at.y, p, 5, 5);
  }
  function wisp(x, y, p, phase, width = 2) {
    stroke(
      Array.from({ length: 14 }, (_, j) => ({
        x: x + Math.sin(j * 0.4 + phase) * 3,
        y: y - j,
      })),
      p,
      width,
      3,
    );
  }
  function gleam(x, y, p, size = 4) {
    ray({ x: x - size, y }, { x: x + size, y }, p, 2, 5);
    ray({ x, y: y - size }, { x, y: y + size }, p, 2, 4);
  }
  function sole(x, y) {
    const img = art('sole', 16, 9, WATER, (set, rect) => {
      rect(2, 3, 12, 4, 3);
      rect(4, 2, 8, 4, 4);
      rect(5, 3, 7, 2, 5);
    });
    stamp(img, x, y);
  }
  function eye(p, look = 0, blind = false) {
    return art('eye:' + look + ':' + blind, 34, 24, p, (set, rect, line) => {
      for (let y = 3; y < 21; y++)
        for (let x = 2; x < 32; x++) {
          const dx = (x - 16.5) / 15,
            dy = (y - 11.5) / 8;
          if (Math.abs(dy) + dx * dx < 1) set(x, y, Math.abs(dy) + dx * dx > 0.72 ? 3 : 4);
        }
      if (blind) {
        line({ x: 5, y: 21 }, { x: 27, y: 2 }, 2, 4);
        line({ x: 6, y: 21 }, { x: 28, y: 2 }, 5, 2);
      } else {
        rect(12 + look, 7, 9, 10, 3);
        rect(14 + look, 8, 5, 8, 1);
        rect(15 + look, 9, 3, 6, 5);
        rect(13 + look, 7, 3, 3, 5);
      }
    });
  }
  function weapon(p, form, frame, quiet = false) {
    return art('weapon:' + form + ':' + frame + ':' + quiet, 32, 42, p, (set, rect, line) => {
      if (!quiet)
        for (let y = 3; y < 29; y++) {
          const axis = 23 - y * 0.42;
          const spread = form === 'frost' ? 4 + (y % 8 < 4 ? 3 : 0) : 4 + Math.round(Math.sin(y * 0.7 + frame) * 2);
          for (let x = Math.floor(axis - spread); x <= axis + spread; x++) {
            if (form === 'lightning' && Math.abs(x - axis - (Math.floor(y / 5) % 2 ? 3 : -2)) > 3) continue;
            set(x, y, Math.abs(x - axis) < 2 ? 5 : x < axis ? 4 : 3);
          }
        }
      line({ x: 9, y: 30 }, { x: 22, y: 5 }, 4, 3);
      line({ x: 10, y: 29 }, { x: 23, y: 5 }, 5, 1);
      line({ x: 4, y: 26 }, { x: 17, y: 32 }, 3, 3);
      line({ x: 8, y: 32 }, { x: 5, y: 37 }, 2, 3);
      rect(3, 37, 5, 2, 4);
      if (form === 'frost' && !quiet) {
        line({ x: 13, y: 12 }, { x: 25, y: 18 }, 4, 2);
        line({ x: 14, y: 19 }, { x: 25, y: 11 }, 5, 2);
      }
    });
  }

  // Elemental Weapon: a full bright blade sheathed in flame, jagged frost or forked lightning.
  FX.register('elemental-weapon', {
    palette: event => (['fire', 'frost', 'lightning'].includes(event.element) ? k.palettes[event.element] : FIRE),
    travel: 220,
    beats: soft,
    end,
    air(s) {
      for (const t of list(s)) {
        delivery(s, t, s.ramp);
        const e = age(s, t);
        if (e < 0) continue;
        const T = k.P(t),
          form = ['frost', 'lightning'].includes(s.event.element) ? s.event.element : 'fire';
        impact(s, t, s.ramp, 'weapon:' + form, 30);
        stamp(weapon(s.ramp, form, Math.floor(s.c.raw / 95) % 3, e > 660), T.x + 9, T.y - 4);
        if (e < 650)
          for (let i = 0; i < 6; i++) {
            const q = (s.c.raw / 500 + k.hash(i, s.event.seed)) % 1;
            dot(T.x + 5 + k.hash(i, s.event.seed, 1) * 15, T.y + 2 - q * 26, s.ramp, i % 2 ? 4 : 5, 2);
          }
      }
    },
  });

  function auraFloor(s, alpha) {
    const C = caster(s),
      A = s.area ? k.P(s.area) : C;
    const R = ((s.area?.feet || 30) / (s.grid.feet || 5)) * k.PX;
    ring(A.x, A.y, R, R, LIFE, alpha, 3, 3);
    const plate = art('vitality-centre', 43, 29, LIFE, set => {
      for (let y = 2; y < 27; y++)
        for (let x = 2; x < 41; x++) {
          const d = Math.hypot((x - 21) / 19, (y - 14) / 11);
          if (d < 1) set(x, y, d < 0.4 ? 4 : d < 0.72 ? 3 : 2);
        }
    });
    stamp(plate, C.x, C.y, alpha);
    const phase = Math.floor((s.c.raw % 2400) / 300) / 8;
    ring(C.x, C.y, 14 + phase * 12, 8 + phase * 7, LIFE, alpha * (1 - phase * 0.5), 4, 2);
    for (let i = 0; i < 10; i++) {
      const q = (s.c.raw / 2600 + k.hash(i, s.event.seed)) % 1;
      const a = k.hash(i, s.event.seed, 2) * k.tau;
      const r = Math.sqrt(k.hash(i, s.event.seed, 3)) * R * 0.85;
      const img = glyph('plus', LIFE, 1);
      stamp(img, A.x + Math.cos(a) * r, A.y + Math.sin(a) * r - q * 10, alpha * (q > 0.85 ? 0.5 : 1));
    }
  }
  function auraCross(s, alpha) {
    const C = caster(s),
      bob = Math.round(Math.sin(s.c.raw / 650));
    stamp(glyph('plus', LIFE), C.x, C.y - 25 + bob, alpha);
  }

  // Aura of Vitality: a green-gold 30-foot boundary, luminous centre and a floating healing cross.
  FX.register('aura-of-vitality', {
    palette: LIFE,
    travel: 240,
    beats: soft,
    end,
    ground(s) {
      if (s.c.t < k.CAST) return;
      const e = s.c.t - k.CAST - 240;
      if (e < 0) {
        const C = caster(s);
        ring(C.x, C.y, 10 + k.ease((e + 240) / 240) * 14, 8, LIFE);
      } else if (!s.pose.linger) auraFloor(s, e > 700 ? 0.75 : 1);
    },
    air(s) {
      if (s.c.t < k.CAST + 240) return;
      if (!s.pose.linger) auraCross(s, 1);
      const C = caster(s),
        real = s.real(s.hits[0]);
      const at = { x: C.x, y: C.y - 10 };
      k.drawHit(k.hitStyle('b50:vitality', LIFE, { S: 30, spikes: 6 }), at, real);
      k.shards(at, real, LIFE, s.event.seed, 6, 16);
    },
    linger(s) {
      auraFloor(s, s.linger);
    },
    lingerAir(s) {
      auraCross(s, s.linger);
    },
  });

  // Water Walk: broad blue ripples, luminous soles and little arcs of water at every pair of feet.
  FX.register('water-walk', {
    palette: WATER,
    travel: 200,
    beats: soft,
    end,
    ground(s) {
      if (s.c.t < k.CAST) return;
      for (const t of list(s)) {
        const F = feet(t),
          e = age(s, t);
        const q = k.clamp((s.c.t - k.CAST) / 200);
        ring(F.x, F.y, e < 0 ? 5 + q * 9 : 18, e < 0 ? 3 + q * 4 : 8, WATER, 1, 3, 2);
        if (e >= 0) {
          ring(F.x, F.y + 1, 10 + Math.floor((e % 360) / 90) * 3, 5, WATER, e > 700 ? 0.5 : 1);
          sole(F.x - 6, F.y - 1);
          sole(F.x + 6, F.y - 1);
        }
      }
    },
    air(s) {
      for (const t of list(s)) {
        const e = age(s, t);
        if (e < 0) continue;
        const F = feet(t),
          real = s.real(beat(s, t));
        k.drawHit(k.hitStyle('b50:water-feet', WATER, { S: 26, spikes: 4 }), F, real);
        k.shards(F, real, WATER, s.event.seed, 6, 17);
        if (e < 620)
          for (let i = 0; i < 4; i++) {
            const q = (s.c.raw / 420 + i / 4) % 1,
              side = i % 2 ? 1 : -1;
            const x = F.x + side * (8 + q * 9),
              y = F.y - Math.sin(q * Math.PI) * 8;
            dot(x, y, WATER, 4, 3);
          }
      }
    },
  });

  // Blinding Smite: a white-gold weapon slash detonates into stabbing rays and a barred eye.
  FX.register('blinding-smite', {
    palette: GOLD,
    travel: 200,
    beats: (event, kit, travel) => [
      { at: kit.CAST + travel, stop: 180, target: event.targets?.[0] ?? null, kind: 'hit', power: 0.09 },
    ],
    end,
    flash: (event, e) => (e < 45 ? { color: GOLD[4], alpha: 0.27 } : e < 90 ? { color: GOLD[0], alpha: 0.18 } : null),
    air(s) {
      const t = list(s)[0];
      if (!t || s.c.t < k.CAST) return;
      const T = k.P(t),
        e = age(s, t);
      if (e < 0) {
        const q = (s.c.t - k.CAST) / 200;
        ray({ x: T.x - 17 + q * 20, y: T.y + 16 - q * 20 }, { x: T.x + 3 + q * 15, y: T.y - 4 - q * 15 }, GOLD, 5, 5);
        return;
      }
      impact(s, t, GOLD, 'blinding-smite', 64, 12, 30);
      if (e < 480) {
        const len = e < 280 ? 25 : 18;
        for (let i = 0; i < 8; i++) {
          const a = (i * k.tau) / 8;
          ray(
            { x: T.x + Math.cos(a) * 12, y: T.y + Math.sin(a) * 12 },
            { x: T.x + Math.cos(a) * len, y: T.y + Math.sin(a) * len },
            GOLD,
            3,
            i % 2 ? 4 : 5,
          );
        }
      }
      stamp(eye(GOLD, 0, true), T.x, T.y - 13, e > 680 ? 0.5 : 1);
      if (e > 480) ring(T.x, T.y, 12, 7, GOLD, 0.75);
    },
  });

  // Clairvoyance: a square-sized spectral eye opens, scans left and right, then leaves ripples.
  FX.register('clairvoyance', {
    palette: WATER,
    travel: 280,
    beats: soft,
    end,
    ground(s) {
      const t = list(s)[0];
      if (!t || s.c.t < k.CAST) return;
      const T = feet(t),
        e = age(s, t);
      ring(T.x, T.y, e < 0 ? 8 : 19 + Math.floor((e % 480) / 120) * 2, 8, WATER, e > 700 ? 0.5 : 1);
    },
    air(s) {
      const t = list(s)[0];
      if (!t) return;
      delivery(s, t, WATER, 16);
      const e = age(s, t);
      if (e < 0) return;
      const T = k.P(t),
        Y = T.y - 12 - Math.round(Math.sin(s.c.raw / 220) * 2);
      impact(s, t, WATER, 'clairvoyance', 34, 5, 20);
      if (e < 720) {
        const look = e < 200 ? -3 : e < 420 ? 3 : 0;
        stamp(eye(WATER, look), T.x, Y);
        ring(T.x, Y, 21, 14, WATER, 0.75, 3, 2);
      } else {
        ring(T.x, Y, 15, 5, WATER, 0.75);
        dot(T.x, Y, WATER, 5, 4);
      }
    },
  });

  // Dispel Magic: an unravelling blue ring pulls luminous threads off the body into broken runes.
  FX.register('dispel', {
    palette: WATER,
    travel: 260,
    beats: (event, kit, travel) =>
      (event.targets?.length ? event.targets : [null]).map(target => ({
        at: kit.CAST + travel,
        stop: 110,
        target,
        kind: 'soft',
        power: 0.04,
      })),
    end,
    air(s) {
      for (const t of list(s)) {
        delivery(s, t, WATER, -8);
        const T = k.P(t),
          e = age(s, t);
        if (e < 0) continue;
        const real = s.real(beat(s, t));
        impact(s, t, WATER, 'dispel', 38, 9, 29);
        if (e < 480) ring(T.x, T.y, 15 + Math.floor(k.clamp(e / 300) * 3) * 3, 18, WATER, 1, 4, 3);
        // Rooted ends stay on the figure while the other ends are peeled violently outwards.
        if (real < 760)
          for (let i = 0; i < 5; i++) {
            const a = (i * k.tau) / 5 + 0.3,
              q = k.clamp(real / 650);
            const root = { x: T.x + Math.cos(a) * 5, y: T.y + Math.sin(a) * 9 };
            const reach = 9 + k.ease(q) * 23;
            const tip = { x: T.x + Math.cos(a) * reach, y: T.y + Math.sin(a) * reach - q * 6 };
            const points = Array.from({ length: 18 }, (_, j) => {
              const u = j / 17;
              return {
                x: k.mix(root.x, tip.x, u) + Math.sin(u * 8 + i) * 2,
                y: k.mix(root.y, tip.y, u) + Math.sin(u * 9 + real / 100) * 3,
              };
            });
            const cut = Math.floor(k.clamp((real - 300) / 400) * points.length);
            stroke(points.slice(cut), WATER, 2, i % 2 ? 4 : 3);
            if (real < 470) stamp(glyph('rune', WATER, 1), tip.x, tip.y);
            else {
              ray({ x: tip.x - 3, y: tip.y - 5 }, { x: tip.x, y: tip.y - 2 }, WATER);
              ray({ x: tip.x + 3, y: tip.y + 1 }, { x: tip.x + 6, y: tip.y + 4 }, WATER);
            }
          }
        if (e > 600) ring(T.x, feet(t).y, 13, 5, WATER, 0.5);
      }
    },
  });

  // Enemies Abound: a crimson-pink head coil, alarm glyphs and hostile red silhouettes nearby.
  FX.register('enemies-abound', {
    palette: MIND,
    travel: 260,
    beats: soft,
    end,
    air(s) {
      const all = list(s);
      for (const t of all) {
        delivery(s, t, MIND);
        const e = age(s, t);
        if (e < 0) continue;
        const T = k.P(t);
        impact(s, t, MIND, 'enemies', 32, 6, 21);
        if (e < 700) {
          const points = Array.from({ length: 44 }, (_, j) => {
            const a = (j / 43) * k.tau * 1.8 + s.c.raw / 330;
            return { x: T.x + Math.cos(a) * 15, y: T.y - 12 + Math.sin(a) * 6 + j / 10 };
          });
          stroke(points, MIND, 3, 3);
          stamp(glyph('question', MIND), T.x - 10, T.y - 25);
          stamp(glyph('exclaim', MIND), T.x + 10, T.y - 23);
          // Only actual supplied figures (including the caster) receive suspicion outlines.
          if (Math.floor(s.c.raw / 140) % 3 !== 2) {
            const neighbours = all.filter(n => n !== t && Math.hypot(n.x - t.x, n.y - t.y) <= 6);
            if (s.pose.base && Math.hypot(s.pose.base.x - t.x, s.pose.base.y - t.y) <= 9)
              neighbours.push({ x: s.pose.base.x, y: s.pose.base.y - 0.62 });
            for (const n of neighbours.slice(0, 3)) {
              const N = k.P(n);
              const silhouette = art('hostile-outline', 28, 34, MIND, (set, rect, line) => {
                for (let j = 0; j < 24; j++) {
                  const a = (j / 24) * k.tau;
                  rect(Math.round(13 + Math.cos(a) * 5), Math.round(8 + Math.sin(a) * 5), 2, 2, 3);
                }
                line({ x: 7, y: 15 }, { x: 3, y: 26 }, 3);
                line({ x: 19, y: 15 }, { x: 23, y: 26 }, 3);
                line({ x: 7, y: 16 }, { x: 7, y: 30 }, 4);
                line({ x: 19, y: 16 }, { x: 19, y: 30 }, 4);
              });
              stamp(silhouette, N.x, N.y - 3, 0.75);
            }
          }
        } else stamp(glyph('question', MIND, 1), T.x, T.y - 17, 0.75);
      }
    },
  });

  function beacon(height) {
    return art('beacon:' + height, 38, 66, GOLD, (set, rect, line) => {
      const top = 61 - height;
      for (let y = top; y < 62; y++) {
        const half = 3 + Math.floor((y - top) / 12);
        rect(19 - half, y, half * 2, 1, 3);
        rect(17, y, 4, 1, 5);
      }
      line({ x: 19, y: top - 4 }, { x: 19, y: top + 10 }, 5, 2);
      line({ x: 12, y: top + 3 }, { x: 26, y: top + 3 }, 4, 2);
      line({ x: 3, y: top + 12 }, { x: 11, y: top + 20 }, 4, 2);
      line({ x: 27, y: top + 20 }, { x: 35, y: top + 12 }, 4, 2);
    });
  }
  // Beacon of Hope: a tall gold-white pillar at the caster sends broad rays into golden target halos.
  FX.register('beacon-of-hope', {
    palette: GOLD,
    travel: 260,
    beats: soft,
    end,
    ground(s) {
      if (s.c.t < k.CAST) return;
      const C = caster(s),
        e = s.c.t - k.CAST;
      const height = e < 260 ? 18 + Math.floor(k.ease(e / 260) * 5) * 6 : e < 930 ? 48 : 24;
      const img = beacon(height);
      k.blit(img, C.x - 19, C.y - 62, e > 1000 ? 0.5 : 1);
      ring(C.x, C.y, 18, 9, GOLD, 1, 4, 3);
    },
    air(s) {
      if (s.c.t < k.CAST) return;
      const C = caster(s);
      for (const t of list(s)) {
        const e = age(s, t),
          T = k.P(t);
        if (e < 330) {
          const q = k.clamp((s.c.t - k.CAST - 100) / 160);
          ray({ x: C.x, y: C.y - 35 }, { x: k.mix(C.x, T.x, q), y: k.mix(C.y - 35, T.y - 17, q) }, GOLD, 3, 4);
        }
        if (e < 0) continue;
        impact(s, t, GOLD, 'hope', 30, 5, 19);
        ring(T.x, T.y - 20, 12, 5, GOLD, e > 720 ? 0.75 : 1, 4, 3);
        if (e < 650) {
          gleam(T.x, T.y - 27, GOLD, 4);
          ray({ x: T.x - 10, y: T.y + 6 }, { x: T.x - 10, y: T.y - 8 }, GOLD, 2, 3);
          ray({ x: T.x + 10, y: T.y + 6 }, { x: T.x + 10, y: T.y - 8 }, GOLD, 2, 3);
        }
      }
    },
  });

  function handshake() {
    return art('handshake', 32, 20, MIND, (set, rect, line) => {
      rect(2, 5, 6, 9, 3);
      rect(24, 5, 6, 9, 2);
      rect(7, 6, 5, 7, 5);
      rect(21, 6, 4, 7, 5);
      // Two interlocked palms, diagonal fingers and contrasting sleeve cuffs.
      rect(11, 5, 7, 9, 4);
      rect(17, 7, 5, 8, 4);
      line({ x: 12, y: 6 }, { x: 17, y: 3 }, 5, 3);
      line({ x: 14, y: 7 }, { x: 19, y: 5 }, 2, 2);
      for (let i = 0; i < 4; i++) line({ x: 11 + i * 2, y: 11 }, { x: 14 + i * 2, y: 14 }, 3, 2);
      rect(6, 5, 2, 10, 4);
      rect(24, 5, 2, 10, 4);
    });
  }
  // Fast Friends: a broad pink-gold ribbon ties caster to target; a heart and clasped hands pop above.
  FX.register('fast-friends', {
    palette: MIND,
    travel: 320,
    beats: soft,
    end,
    air(s) {
      for (const t of list(s)) {
        if (s.c.t < k.CAST) continue;
        const T = k.P(t),
          H = k.P(s.pose.hand || t),
          e = age(s, t);
        if (e < 320) {
          const q = k.clamp((s.c.t - k.CAST) / 320);
          const points = Array.from({ length: 60 }, (_, i) => {
            const u = (i / 59) * q;
            return {
              x: k.mix(H.x, T.x, u),
              y: k.mix(H.y, T.y, u) + Math.sin(u * k.tau * 1.5 - s.c.raw / 220) * 7 * Math.sin(u * Math.PI),
            };
          });
          stroke(points, MIND, 5, 3);
          stroke(points, GOLD, 2, 4);
        }
        if (e < 0) continue;
        impact(s, t, MIND, 'friends', 36, 7, 23);
        const bob = e < 100 ? Math.round((1 - k.back(k.clamp(e / 100))) * 5) : 0;
        if (e < 710) {
          stamp(glyph('heart', MIND), T.x, T.y - 28 + bob);
          stamp(handshake(), T.x, T.y - 11 + bob);
          gleam(T.x - 19, T.y - 17, GOLD, 3);
          gleam(T.x + 19, T.y - 17, GOLD, 3);
        } else stamp(glyph('heart', MIND, 1), T.x, T.y - 17, 0.75);
      }
    },
  });

  function shroud(frame) {
    return art('shroud:' + frame, 32, 34, DEAD, (set, rect) => {
      // The shoulders descend and tilt as the drawn silhouette folds onto its knees.
      const slump = Math.min(6, frame * 2);
      for (let y = 3 + slump; y < 31; y++)
        for (let x = 3; x < 29; x++) {
          const dx = x - (14 + slump * 0.6),
            dy = y - (10 + slump);
          const head = (dx * dx) / 42 + (dy * dy) / 55 < 1;
          const cloth = y > 12 + slump && Math.abs(x - 16) < 5 + (y - 12 - slump) * 0.6;
          if (head || cloth) set(x, y, x < 13 ? 3 : x < 19 ? 4 : 2);
        }
      rect(11 + slump, 10 + slump, 8, 2, 1);
      rect(14, 22 + Math.floor(slump / 2), 3, 7, 3);
    });
  }
  // Feign Death: a slumping grey-blue shroud folds onto the token beneath a pale skull and mist.
  FX.register('feign-death', {
    palette: DEAD,
    travel: 240,
    beats: soft,
    end,
    ground(s) {
      for (const t of list(s)) {
        const e = age(s, t);
        if (e < 0) continue;
        const F = feet(t);
        ring(F.x, F.y, e < 500 ? 18 : 14, 6, DEAD, 0.75, 3, 2);
      }
    },
    air(s) {
      for (const t of list(s)) {
        delivery(s, t, DEAD, -5);
        const e = age(s, t);
        if (e < 0) continue;
        const T = k.P(t);
        impact(s, t, DEAD, 'feign', 28, 5, 17);
        stamp(shroud(Math.min(3, Math.floor(e / 90))), T.x, T.y + 5, e > 740 ? 0.5 : 0.75);
        if (e < 740) {
          stamp(glyph('skull', DEAD), T.x + 1, T.y - 21 - Math.min(3, Math.floor(e / 220)));
          wisp(T.x - 14, T.y + 8, DEAD, s.c.raw / 260);
          wisp(T.x + 15, T.y + 10, DEAD, s.c.raw / 260 + 2);
        } else wisp(T.x, T.y + 10, DEAD, s.c.raw / 300);
      }
    },
  });

  function ghostFace() {
    return art('ghost-face', 30, 32, GHOST, (set, rect) => {
      for (let y = 3; y < 29; y++)
        for (let x = 3; x < 27; x++) {
          const dx = (x - 15) / 11,
            dy = (y - 14) / 12;
          if (dx * dx + dy * dy < 1 || (y > 18 && y < 28 && Math.abs(x - 15) < 7 - ((y + x) % 5)))
            set(x, y, x < 10 ? 3 : x < 20 ? 4 : 2);
        }
      rect(7, 11, 6, 4, 1);
      rect(18, 11, 6, 4, 1);
      rect(9, 12, 3, 2, 5);
      rect(19, 12, 3, 2, 5);
      rect(13, 19, 5, 6, 1);
      rect(14, 20, 3, 3, 3);
    });
  }
  function speech(frame) {
    return art('speech:' + frame, 30, 18, GHOST, (set, rect) => {
      rect(2, 2, 25, 11, 4);
      rect(5, 12, 4, 3, 4);
      rect(5, 14, 2, 2, 4);
      for (let i = 0; i < 3; i++) {
        const x = 6 + i * 7;
        rect(x, 5, 2, 5, 1);
        rect(x - 1, 7 + ((i + frame) % 2), 4, 2, 2);
      }
    });
  }
  // Speak With Dead: a large green-white ghost face rises from the body and speaks runes into a bubble.
  FX.register('speak-with-dead', {
    palette: GHOST,
    travel: 260,
    beats: soft,
    end,
    ground(s) {
      for (const t of list(s)) {
        const e = age(s, t);
        if (e < 0) continue;
        const F = feet(t);
        ring(F.x, F.y, 17, 7, GHOST, e > 700 ? 0.5 : 1, 3, 2);
      }
    },
    air(s) {
      for (const t of list(s)) {
        delivery(s, t, GHOST, -10);
        const e = age(s, t);
        if (e < 0) continue;
        const T = k.P(t),
          rise = Math.round(k.ease(k.clamp(e / 320)) * 13);
        impact(s, t, GHOST, 'speak-dead', 32, 6, 22);
        if (e < 760) {
          wisp(T.x - 10, T.y + 10, GHOST, s.c.raw / 250);
          wisp(T.x + 12, T.y + 10, GHOST, s.c.raw / 250 + 2);
          stamp(ghostFace(), T.x, T.y - rise);
          if (e > 120) stamp(speech(Math.floor(s.c.raw / 170) % 2), T.x + 15, T.y - rise - 20);
        } else {
          stamp(glyph('rune', GHOST, 1), T.x, T.y - 17, 0.75);
          wisp(T.x, T.y, GHOST, s.c.raw / 280);
        }
      }
    },
  });

  function treasure(gem, turn = 0) {
    return art('treasure:' + gem + ':' + turn, 18, 18, GOLD, (set, rect, line) => {
      if (gem) {
        for (let y = 2; y <= 15; y++)
          for (let x = 2; x <= 15; x++) {
            const d = Math.abs(x - 8.5) / 6.5 + Math.abs(y - 8.5) / 7;
            if (d <= 1) set(x, y, x < 8 ? 4 : y < 8 ? 5 : 3);
          }
        line({ x: 5, y: 7 }, { x: 12, y: 7 }, 5, 1);
      } else {
        const rx = turn === 1 ? 3 : 6;
        for (let y = 2; y < 16; y++)
          for (let x = 1; x < 17; x++) {
            const d = Math.hypot((x - 8) / rx, (y - 8) / 6);
            if (d < 1) set(x, y, d > 0.7 ? 3 : 4);
          }
        rect(7, 4, 2, 8, 2);
        rect(6, 5, 4, 2, 5);
        rect(6, 9, 4, 2, 5);
      }
    });
  }
  // Incite Greed: oversized golden coins and faceted gems spill around each figure; the eyes gleam gold.
  FX.register('incite-greed', {
    palette: GOLD,
    travel: 260,
    beats: soft,
    end,
    ground(s) {
      for (const t of list(s)) {
        const e = age(s, t);
        if (e < 320) continue;
        const F = feet(t);
        for (let i = 0; i < 5; i++) {
          const a = (i * k.tau) / 5 + 0.5;
          stamp(treasure(i % 3 === 0), F.x + Math.cos(a) * 17, F.y + Math.sin(a) * 7, e > 760 ? 0.75 : 1);
        }
      }
    },
    air(s) {
      for (const t of list(s)) {
        delivery(s, t, GOLD, 12);
        const e = age(s, t);
        if (e < 0) continue;
        const T = k.P(t),
          real = s.real(beat(s, t));
        impact(s, t, GOLD, 'greed', 34, 7, 25);
        if (e < 680)
          for (let i = 0; i < 5; i++) {
            const q = k.clamp((real - i * 35) / 600);
            const side = i % 2 ? 1 : -1,
              x = T.x + side * (5 + k.ease(q) * (10 + i * 2));
            const y = T.y - 7 - Math.sin(q * Math.PI) * (18 + i * 2) + q * 13;
            stamp(treasure(i % 3 === 0, Math.floor(s.c.raw / 110 + i) % 2), x, y);
          }
        if (e < 740) {
          // Paired bright horizontal eye slits touch the head, with intermittent cross-shaped gleams.
          ray({ x: T.x - 6, y: T.y - 10 }, { x: T.x - 2, y: T.y - 10 }, GOLD, 3, 5);
          ray({ x: T.x + 2, y: T.y - 10 }, { x: T.x + 6, y: T.y - 10 }, GOLD, 3, 5);
          if (Math.floor(s.c.raw / 130) % 2) gleam(T.x + 5, T.y - 10, GOLD, 4);
        }
      }
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
