/* Pixel spells, batch 36 (see docs/pixel-spells/BRIEF.md). */
(function (root) {
  'use strict';
  const FX = root.BoardPixelFX;
  if (!FX) return;
  const k = FX.kit;
  const C = k.CAST;
  const GOLD = ['#281b16', '#79501f', '#c58c30', '#f5ce67', '#fff3bc', '#ffffff'];
  const NULL = ['#10161f', '#293541', '#4f636e', '#8b9fa5', '#cbd7d6', '#f4faf6'];
  const MIND = ['#240c29', '#63215e', '#a94797', '#e58bcc', '#ffd4ef', '#ffffff'];
  const DREAD = ['#230d19', '#631d35', '#a83d53', '#ed746e', '#ffbdab', '#fff5e3'];
  const FLESH = ['#281420', '#623341', '#a75d69', '#dc9291', '#f8c9b3', '#fff3db'];
  const GLASS = ['#112432', '#285366', '#48899a', '#88c6ca', '#d3f4ed', '#ffffff'];
  const SKY = ['#151c30', '#2a3d58', '#536a88', '#8da3bd', '#d5e1ef', '#ffffff'];
  const SHADOW = ['#100b20', '#241c3a', '#493663', '#81679e', '#cab3df', '#f8e7ff'];
  const VOID = ['#080911', '#121222', '#302743', '#665283', '#b3a4cb', '#ede5ff'];
  const LIFE = ['#152116', '#36502b', '#68984b', '#a5d879', '#e2f5af', '#ffffde'];
  const STONE = ['#1b1c26', '#3c3e51', '#6a7084', '#a1acb9', '#d4d9d7', '#fff4d4'];
  const WITHER = ['#211621', '#4b2e42', '#77505b', '#b08b77', '#dcc5a2', '#fff0cf'];
  const SILVER = ['#1a172c', '#47415c', '#787994', '#bfc5d8', '#f1f4ff', '#ffffff'];
  const add = (p, x, y) => ({ x: p.x + x, y: p.y + y });
  const seed = s => s.event.seed || 0;
  const live = (s, end) => s.c.t >= C && s.c.t < end;
  const ids = e => (e.targets?.length ? [...new Set(e.targets)] : [null]);
  const aim = s => s.area || s.pose.target || s.targets[0] || s.pose.base || s.pose.hand;
  const feet = t => k.P({ x: t.baseX ?? t.x, y: t.baseY ?? t.y });
  const base = s => feet(s.pose.base || aim(s));
  const subjects = s => (s.targets.length ? s.targets : [s.pose.base || aim(s)]);
  const point = (s, h) => k.P(s.targets.find(t => t.id === h.id) || aim(s));
  const soft = (e, kit, travel) =>
    ids(e).map(target => ({ at: C + travel, stop: 75, target, kind: 'soft', power: 0.03 }));
  const blast = (e, kit, travel) =>
    ids(e).map(target => ({ at: C + travel, stop: 170, target, kind: 'blast', power: 0.085 }));
  const reach = feet => (e, grid) => ({ r: (e.area?.feet || feet) / (grid.feet || 5) + 3, up: 6 });
  function pixel(p, ramp, index = 4, size = 1) {
    k.dot(p.x, p.y, ramp[0], size + 2);
    k.dot(p.x, p.y, ramp[index], size);
  }
  function orb(p, r, ramp, index = 3) {
    k.disc(p.x, p.y, r + 1, ramp[0]);
    k.disc(p.x, p.y, r, ramp[index]);
    if (r > 3) k.disc(p.x - 1, p.y - 1, r * 0.45, ramp[4]);
  }
  function stamp(img, p) {
    k.blit(img, p.x - img.width / 2, p.y - img.height / 2);
  }
  function icon(key, ramp, rows) {
    return k.sprite(`b36:${key}`, rows[0].length + 2, rows.length + 2, ramp, set => {
      rows.forEach((row, y) =>
        [...row].forEach((v, x) => {
          if (v !== '.') set(x + 1, y + 1, +v);
        }),
      );
    });
  }
  // Cache long strokes and rings: the huge templates must not become thousands of live dots.
  function line(a, b, ramp, index = 3, width = 1) {
    const dx = Math.round(b.x - a.x),
      dy = Math.round(b.y - a.y),
      pad = width + 2;
    const ox = pad - Math.min(0, dx),
      oy = pad - Math.min(0, dy);
    const img = k.sprite(
      `b36:line:${dx}:${dy}:${ramp[1]}:${index}:${width}`,
      Math.abs(dx) + pad * 2 + 1,
      Math.abs(dy) + pad * 2 + 1,
      ramp,
      set => {
        const n = Math.max(1, Math.ceil(Math.hypot(dx, dy)));
        for (let i = 0; i <= n; i++)
          for (let x = 0; x < width; x++)
            for (let y = 0; y < width; y++) set(ox + (dx * i) / n + x, oy + (dy * i) / n + y, index);
      },
    );
    k.blit(img, a.x - ox, a.y - oy);
  }
  function ring(p, rx, ry, ramp, index = 3, gaps = 0, phase = 0) {
    rx = Math.max(2, Math.round(rx));
    ry = Math.max(2, Math.round(ry));
    const f = gaps ? Math.floor(phase) % 8 : 0;
    const img = k.sprite(`b36:ring:${rx}:${ry}:${ramp[1]}:${index}:${gaps}:${f}`, rx * 2 + 5, ry * 2 + 5, ramp, set => {
      for (let y = -ry; y <= ry; y++)
        for (let x = -rx; x <= rx; x++) {
          if (Math.abs(Math.hypot(x / rx, y / ry) - 1) * Math.min(rx, ry) > 0.65) continue;
          if (gaps && Math.floor((Math.atan2(y, x) / k.tau + 0.5) * gaps * 2 + f / 2) % 2) continue;
          set(x + rx + 2, y + ry + 2, index);
        }
    });
    stamp(img, p);
  }
  function corners(s, fallback = 30) {
    const supplied = s.area && k.outline(s.area, s.grid);
    if (supplied?.length === 4) return supplied.map(p => k.P({ x: p[0], y: p[1] }));
    const p = k.P(aim(s)),
      r = (fallback / (s.grid.feet || 5)) * 8;
    return [add(p, -r, -r), add(p, r, -r), add(p, r, r), add(p, -r, r)];
  }
  function center(s, cube = false) {
    if (!cube) return k.P(aim(s));
    const ps = corners(s);
    return { x: ps.reduce((v, p) => v + p.x, 0) / 4, y: ps.reduce((v, p) => v + p.y, 0) / 4 };
  }
  function radius(s, fallback) {
    return ((s.area?.feet || fallback) / (s.grid.feet || 5)) * 16;
  }
  function border(s, ramp, height = 0) {
    const ps = corners(s);
    ps.forEach((p, i) => {
      line(p, ps[(i + 1) % 4], ramp, 2);
      if (height) {
        line(add(p, 0, -height), add(ps[(i + 1) % 4], 0, -height), ramp, 3);
        line(p, add(p, 0, -height), ramp, 3);
      }
    });
  }
  function impact(s, h, p, ramp, key, size = 30, count = 7) {
    const e = s.real(h);
    k.drawHit(k.hitStyle(`b36:${key}:${ramp[1]}`, ramp, { S: size, spikes: 7, minor: 3, jag: 0.28 }), p, e);
    k.shards(p, e, ramp, seed(s) + h.at, count, size * 0.7);
  }
  function motes(s, p, ramp, e, n = 12, r = 25, inward = false) {
    if (e < 0 || e > 550) return;
    const q = e / 550;
    for (let i = 0; i < n; i++) {
      if (q > 0.8 && i % 2) continue;
      const a = k.hash(i, seed(s), 36) * k.tau;
      const d = (inward ? 1 - k.ease(q) : k.ease(q)) * r;
      pixel(add(p, Math.cos(a) * d, Math.sin(a) * d * 0.65 - q * 8), ramp, i % 3 ? 3 : 4);
    }
  }
  const heart = () => icon('heart', MIND, ['.44.44.', '4554554', '3444443', '.34443.', '..343..', '...3...']);
  const mask = () =>
    icon('dread-mask', DREAD, [
      '.3333333.',
      '344444443',
      '341414143',
      '344242443',
      '.3322233.',
      '..32323..',
      '...333...',
    ]);
  const eye = () =>
    icon('mind-eye', MIND, ['....333....', '..3444443..', '34555255443', '.344525443.', '..3444443..', '....333....']);
  const shield = () =>
    icon('holy-shield', GOLD, [
      '.4444444.',
      '455454554',
      '454454454',
      '455555554',
      '454454454',
      '.4445444.',
      '..44544..',
      '...444...',
      '....4....',
    ]);
  const rune = () =>
    icon('null-rune', NULL, ['..444..', '.42.24.', '42...24', '.42.24.', '..444..', '..424..', '.42.24.']);
  function aura(s, ramp, ft, active = false) {
    const p = base(s),
      R = radius(s, ft);
    const q = active ? 1 : k.ease(k.clamp((s.c.t - C) / 230));
    ring(p, R * (0.25 + q * 0.75), R * (0.25 + q * 0.75), ramp, 3);
    ring(p, R - 5, R - 5, ramp, 2, 12, s.c.raw / 130);
    return { p, R };
  }

  // Holy Aura: a thirty-foot golden sanctuary, white winged shields and steady halos over the protected figures.
  FX.register('holy-aura', {
    palette: GOLD,
    travel: 220,
    beats: soft,
    end: () => 1450,
    reach: reach(30),
    ground(s) {
      if (live(s, 1450) && !(s.pose.linger > 0 && s.c.t >= 520)) aura(s, GOLD, 30);
    },
    air(s) {
      if (!live(s, 1450)) return;
      subjects(s).forEach(t => {
        const p = k.P(t),
          h = add(p, 0, -15);
        ring(h, 9, 3, GOLD, 4);
        if (s.c.t >= 520) {
          stamp(shield(), add(p, 11, -3));
          for (const side of [-1, 1])
            for (let j = 0; j < 3; j++)
              line(add(h, side * (11 + j * 3), 3 + j), add(h, side * (17 + j * 2), -2 + j), GOLD, 4);
        }
      });
      s.hits.forEach(h => impact(s, h, point(s, h), GOLD, 'holy', 26, 5));
    },
    linger(s) {
      if (s.linger <= 0) return;
      const { p, R } = aura(s, GOLD, 30, true);
      for (let i = 0; i < 8; i++) {
        const a = (i * k.tau) / 8;
        stamp(shield(), add(p, Math.cos(a) * (R - 10), Math.sin(a) * (R - 10)));
      }
    },
  });

  function cloneVat() {
    return k.sprite('b36:clone-vat', 43, 65, [...GLASS, ...FLESH.slice(1, 5)], set => {
      for (let y = 5; y < 60; y++)
        for (let x = 4; x < 39; x++) {
          const dx = x - 21;
          if (Math.abs(dx) > 16 || ((y < 10 || y > 55) && Math.abs(dx) > 12)) continue;
          set(x, y, y < 12 || y > 55 ? 2 : x < 9 ? 3 : 1);
          if ((x === 9 || x === 10) && y > 13 && y < 48) set(x, y, 4);
          if (y > 18 && y < 54 && x > 12 && x < 34) set(x, y, 6);
          const head = (x - 25) ** 2 + (y - 25) ** 2 < 30;
          const body = ((x - 22) / 7) ** 2 + ((y - 38) / 10) ** 2 < 1;
          const curledLeg = y > 43 && y < 50 && x > 20 && x < 31;
          const arm = y >= 31 && y < 37 && x > 26 && x < 33;
          if (head || body || curledLeg || arm) set(x, y, x < 23 ? 8 : 7);
          if (head && y === 24 && x > 25 && x < 28) set(x, y, 6);
          if (x === 33 && y > 13 && y < 51) set(x, y, 3);
        }
    });
  }
  // Clone: a sealed blue glass vessel rises around a curled flesh-coloured duplicate in crimson nutrient fluid.
  FX.register('clone', {
    palette: GLASS,
    travel: 420,
    beats: soft,
    end: () => 1760,
    reach: reach(10),
    ground(s) {
      if (!live(s, 1760)) return;
      const p = center(s);
      ring(p, 27, 12, FLESH, 3, 8, 0);
      ring(p, 20, 9, GLASS, 4);
      const q = k.ease(k.clamp((s.c.t - C) / 420));
      // The vessel is under the tokens; its final frame holds, rather than dissolving.
      k.blit(cloneVat(), p.x - 21, p.y - 56 + (1 - q) * 37);
    },
    air(s) {
      if (!live(s, 1760)) return;
      const p = center(s);
      for (let i = 0; i < 5; i++) {
        const q = ((s.c.t - C) / 850 + i / 5) % 1;
        ring(add(p, 8 + (i % 2) * 5, -12 - q * 30), 2, 2, GLASS, 4);
      }
      s.hits.forEach(h => impact(s, h, add(p, 0, -24), FLESH, 'clone', 24, 5));
    },
  });

  function cloud(ramp, storm = false, compact = false) {
    const scale = compact ? 0.6 : 1;
    return k.sprite(
      `b36:cloud:${ramp[1]}:${storm}:${compact}`,
      Math.ceil(79 * scale),
      Math.ceil(37 * scale),
      ramp,
      set => {
        const lobes = [
          [15, 23, 11],
          [29, 14, 13],
          [45, 13, 12],
          [60, 23, 13],
          [38, 24, 18],
        ];
        for (let y = 2; y < 35; y++)
          for (let x = 2; x < 77; x++) {
            if (!lobes.some(([cx, cy, r]) => (x - cx) ** 2 + (y - cy) ** 2 < r * r)) continue;
            set(x * scale, y * scale, y < 12 ? 4 : y < 20 ? 3 : storm ? 1 : 2);
          }
      },
    );
  }
  // Control Weather: sunshine gives way to rolling storm banks, slanting rain, a lightning snap, then clearing skies.
  FX.register('control-weather', {
    palette: SKY,
    travel: 520,
    beats: (e, kit, t) => [{ at: C + t, stop: 100, target: null, kind: 'soft', power: 0.03 }],
    end: () => 1970,
    reach: reach(30),
    ground(s) {
      if (!live(s, 1970)) return;
      const p = center(s),
        R = Math.min(radius(s, 30), s.area ? 104 : 40),
        t = s.c.t - C;
      if (t < 300 || t > 1250) {
        orb(add(p, R * 0.5, -R * 0.45), 11, GOLD, 4);
        for (let i = 0; i < 8; i++) {
          const a = (i * k.tau) / 8;
          line(
            add(p, R * 0.5 + Math.cos(a) * 16, -R * 0.45 + Math.sin(a) * 16),
            add(p, R * 0.5 + Math.cos(a) * 21, -R * 0.45 + Math.sin(a) * 21),
            GOLD,
            3,
          );
        }
      }
      const shift = t < 300 ? (1 - k.ease(t / 300)) * R : t > 1200 ? k.ease((t - 1200) / 470) * R : 0;
      for (let i = 0; i < 3; i++)
        stamp(
          cloud(SKY, t >= 300 && t < 1250, !s.area),
          add(p, (i - 1) * R * (s.area ? 0.6 : 0.3) + shift, -R * 0.45 + (i % 2) * 8),
        );
      if (t >= 300 && t < 1250)
        for (let i = 0; i < 20; i++) {
          const q = (s.c.raw / 430 + k.hash(i, seed(s))) % 1;
          const at = add(p, (k.hash(i, seed(s), 2) - 0.5) * R * 1.7 - q * 12, -R * 0.3 + q * R);
          line(at, add(at, -3, 7), GLASS, 3);
        }
      for (let i = 0; i < 3; i++) ring(add(p, (i - 1) * R * 0.5, R * 0.25), 19, 5, SKY, 3, 4, s.c.raw / 100 + i);
    },
    air(s) {
      if (!live(s, 1970)) return;
      const p = center(s),
        e = s.real(s.hits[0]);
      if (e >= 0 && e < 150) {
        const ps = [add(p, 10, s.area ? -42 : -25), add(p, -1, -12), add(p, 8, -12), add(p, -6, 3)];
        ps.slice(1).forEach((v, i) => line(ps[i], v, GOLD, e < 50 ? 5 : 3, 2));
      }
      impact(s, s.hits[0], add(p, -6, 3), SKY, 'weather', 32, 6);
    },
    linger(s) {
      if (s.linger <= 0) return;
      const p = center(s),
        R = Math.min(radius(s, 30), s.area ? 104 : 40);
      ring(p, R, R, SKY, 2, 12, s.c.raw / 300);
      for (let i = 0; i < 3; i++)
        stamp(cloud(SKY, false, !s.area), add(p, (i - 1) * R * (s.area ? 0.65 : 0.3), -R * 0.5));
    },
  });

  // Dominate Monster: a violet thought-link locks a many-pronged crown and an unblinking eye onto the creature's mind.
  FX.register('dominate-monster', {
    palette: MIND,
    travel: 280,
    beats: soft,
    end: () => 1480,
    ground(s) {
      if (!live(s, 1480)) return;
      subjects(s).forEach(t => ring(feet(t), 17, 8, MIND, 2, 6, s.c.raw / 120));
    },
    air(s) {
      if (!live(s, 1480)) return;
      const H = k.P(s.pose.hand || s.pose.base || aim(s));
      subjects(s).forEach(t => {
        const p = add(k.P(t), 0, -17),
          q = k.clamp((s.c.t - C) / 280);
        if (s.c.t < 950)
          for (let i = 0; i < 11; i++) {
            const u = (i / 10) * q;
            const at = { x: k.mix(H.x, p.x, u), y: k.mix(H.y, p.y, u) - Math.sin(u * Math.PI) * 10 };
            ring(at, 3, 2, MIND, i % 2 ? 3 : 4);
          }
        if (s.c.t >= 580) {
          line(add(p, -12, 5), add(p, 12, 5), MIND, 3, 2);
          for (let i = -2; i <= 2; i++) {
            const a = add(p, i * 5, 4),
              b = add(p, i * 5, -4 - (2 - Math.abs(i)) * 2);
            line(a, b, MIND, 4, 2);
            orb(b, 1, MIND, 5);
          }
          stamp(eye(), add(p, 0, -13));
        }
      });
      s.hits.forEach(h => impact(s, h, add(point(s, h), 0, -15), MIND, 'dominate', 27, 5));
    },
  });

  function dragon(frame) {
    return k.sprite(`b36:illusory-dragon:${frame}`, 95, 73, SHADOW, set => {
      for (let y = 2; y < 100; y++)
        for (let x = 2; x < 135; x++) {
          const dx = x - 68,
            ay = frame ? 9 : 0;
          const body = (dx / 14) ** 2 + ((y - 65) / 24) ** 2 < 1;
          const neck = y > 31 && y < 61 && x > 64 + (61 - y) * 0.2 && x < 79 + (61 - y) * 0.3;
          const head = y > 25 && y < 40 && x > 72 && x < 103 - Math.abs(y - 32);
          const horn =
            y > 14 && y < 29 && (Math.abs(x - (77 - (28 - y) * 0.5)) < 2 || Math.abs(x - (88 + (28 - y) * 0.3)) < 2);
          const wing =
            Math.abs(dx) > 12 &&
            Math.abs(dx) < 61 &&
            y > 11 + Math.abs(dx) * 0.32 + ay &&
            y < 65 - Math.abs(dx) * 0.13 + Math.abs(Math.sin(dx / 12)) * 10;
          const tail = y > 80 && Math.abs(x - (68 + Math.sin((y - 80) / 12) * 31)) < (101 - y) / 6 + 1;
          const claw = y > 80 && y < 92 && Math.abs(Math.abs(dx) - (18 + (y - 80) * 0.6)) < 3;
          if (body || neck || head || horn || wing || tail || claw) {
            const band = x < 68 ? 3 : 2;
            const sx = Math.floor(x * 0.68) + 1,
              sy = Math.floor(y * 0.68) + 1;
            const rib = Math.abs(y - (28 + Math.abs(dx) * 0.3 + ay)) < 2;
            set(sx, sy, horn ? 4 : wing ? (rib ? 3 : y < 42 ? 2 : 1) : band);
            if ((y + frame) % 13 === 0 && !horn && !wing) set(sx, sy, 1);
            if (head && y === 30 && x > 87 && x < 91) set(sx, sy, 5);
            if (head && y === 36 && x > 91) set(sx, sy, 4);
          }
        }
    });
  }
  function breathRamp(e) {
    return ['fire', 'frost', 'lightning', 'veneno', 'necrótico', 'ácido'].includes(e.element)
      ? k.paletteFor(e)
      : k.palettes.veneno;
  }
  // Illusory Dragon: a Huge horned shadow-dragon unfurls scalloped wings, then exhales a fearsome elemental breath.
  FX.register('illusory-dragon', {
    palette: SHADOW,
    travel: 690,
    beats: blast,
    end: () => 1990,
    reach: reach(25),
    ground(s) {
      if (!live(s, 1990)) return;
      const p = center(s),
        t = s.c.t - C;
      ring(p, 49, 23, SHADOW, 3, 10, s.c.raw / 150);
      const rise = 12 * (1 - k.ease(k.clamp(t / 380)));
      k.blit(dragon(Math.floor(s.c.t / 180) % 2), p.x - 47, p.y - 44 + rise);
      if (t >= 520 && t < 1170) {
        const H = add(p, 20, -21),
          ramp = breathRamp(s.event);
        const target = k.P(s.targets[0] || s.pose.target || aim(s));
        const angle = Math.atan2(target.y - H.y, target.x - H.x);
        const L = Math.max(24, Math.min(140, Math.hypot(target.x - H.x, target.y - H.y)));
        const q = k.ease(k.clamp((t - 520) / 170));
        for (let i = 8; i >= 0; i--) {
          const u = (i / 8) * q,
            at = add(H, Math.cos(angle) * L * u, Math.sin(angle) * L * u);
          orb(at, 3 + u * 13, ramp, i % 3 === 0 ? 4 : 2);
        }
      }
    },
    air(s) {
      if (!live(s, 1990)) return;
      s.hits.forEach(h => impact(s, h, point(s, h), breathRamp(s.event), 'dragon-breath', 39, 9));
      if (s.c.t < 850) motes(s, center(s), SHADOW, s.c.t - C, 12, 55, true);
    },
  });

  function voidBody(R, f) {
    R = Math.max(12, Math.round(R));
    return k.sprite(`b36:void:${R}:${f}`, R * 2 + 5, R * 2 + 5, VOID, set => {
      for (let y = -R; y <= R; y++)
        for (let x = -R; x <= R; x++) {
          const d = Math.hypot(x, y) / R,
            a = Math.atan2(y, x);
          if (d > 1) continue;
          const arm = Math.sin(a * 3 + d * 13 - f * 0.7);
          set(x + R + 2, y + R + 2, d < 0.57 ? 1 : d > 0.96 ? 3 : arm > 0.75 ? 2 : 1);
        }
    });
  }
  // Dark Star: a forty-foot light-devouring sphere forms a violet accretion rim and crushes inward-falling rock.
  FX.register('dark-star', {
    palette: VOID,
    travel: 320,
    beats: (e, kit, t) =>
      ids(e).flatMap(target => [
        { at: C + t, stop: 160, target, kind: 'pull', power: 0.08 },
        { at: 1100, stop: 110, target, kind: 'pull', power: 0.06 },
      ]),
    end: () => 1810,
    reach: reach(40),
    ground(s) {
      if (!live(s, 1810) || (s.pose.linger > 0 && s.c.t >= 620)) return;
      const p = center(s),
        R = radius(s, 40),
        q = k.ease(k.clamp((s.c.t - C) / 320));
      const r = R * (0.12 + 0.88 * q);
      stamp(voidBody(r, Math.floor(s.c.t / 100) % 8), p);
      ring(p, r, r * 0.35, VOID, 4, 12, s.c.raw / 80);
    },
    air(s) {
      if (!live(s, 1810)) return;
      const p = center(s),
        R = radius(s, 40);
      for (let i = 0; i < 16; i++) {
        const q = (s.c.raw / 660 + k.hash(i, seed(s))) % 1;
        const a = (i * k.tau) / 16 + q * 0.8,
          d = R * (1 - q);
        const at = add(p, Math.cos(a) * d, Math.sin(a) * d);
        pixel(at, STONE, 2 + (i % 2), q < 0.6 ? 3 : 1);
      }
      s.hits.forEach(h => impact(s, h, point(s, h), VOID, 'dark-star', 35, 7));
    },
    linger(s) {
      if (s.linger <= 0) return;
      const p = center(s),
        R = radius(s, 40);
      stamp(voidBody(R, Math.floor(s.c.raw / 160) % 8), p);
      ring(p, R, R * 0.35, VOID, 3, 12, s.c.raw / 130);
    },
  });

  function solarBody(R, f) {
    R = Math.round(R);
    return k.sprite(`b36:solar:${R}:${f}`, R * 2 + 5, R * 2 + 5, GOLD, set => {
      const q = f / 9;
      for (let y = -R; y <= R; y++)
        for (let x = -R; x <= R; x++) {
          const d = Math.hypot(x, y) / R,
            a = Math.atan2(y, x);
          const ray = Math.abs(Math.cos(a * 12)) ** 18;
          if (f < 2) {
            if (d < 0.32 || d < 0.4 + ray * 0.6) set(x + R + 2, y + R + 2, f === 0 ? 5 : d < 0.3 ? 1 : 4);
          } else if (f < 6) {
            if (d > 1 || d > 0.73 + ray * 0.27) continue;
            set(x + R + 2, y + R + 2, d < 0.2 ? 5 : d < 0.45 ? 4 : d < 0.7 ? 3 : 2);
          } else if (Math.abs(d - (0.7 + q * 0.28)) < 0.025 && Math.floor(a * 20) % 3 !== 0)
            set(x + R + 2, y + R + 2, 3);
        }
    });
  }
  // Sunburst: a sixty-foot white-gold sun detonates in needle rays, an inverse flash, and a broken radiant shock ring.
  FX.register('sunburst', {
    palette: GOLD,
    travel: 280,
    beats: blast,
    end: () => 1640,
    reach: reach(60),
    flash: (e, t) => (t < 35 ? { color: '#fff6d5', alpha: 0.3 } : t < 75 ? { color: '#24191d', alpha: 0.22 } : null),
    ground(s) {
      if (!live(s, 1640)) return;
      const p = center(s),
        R = radius(s, 60),
        t = s.c.t - 580;
      if (t < 0) {
        orb(p, 4 + Math.floor((s.c.t - C) / 70), GOLD, 5);
        ring(p, 16, 16, GOLD, 4, 8, 0);
      } else if (t < 880) {
        const real = s.real(s.hits[0]);
        const f = real < 80 ? Math.floor(real / 40) : Math.min(9, 2 + Math.floor(t / 110));
        stamp(solarBody(R, f), p);
      }
    },
    air(s) {
      if (!live(s, 1640)) return;
      s.hits.forEach(h => {
        const p = point(s, h),
          e = s.real(h);
        impact(s, h, p, GOLD, 'sunburst', 43, 10);
        if (e > 210 && e < 740) {
          const head = add(p, 0, -15);
          ring(head, 7, 3, GOLD, 4);
          line(add(head, -6, 5), add(head, 6, -5), GOLD, 5);
        }
      });
    },
  });

  function beast(type) {
    const rows =
      type % 3 === 0
        ? [
            '..33....33.....',
            '.3443333443....',
            '.34543345343...',
            '..344444443....',
            '...3444443.....',
            '.333444433333..',
            '34444444444443.',
            '.344444444443..',
            '..3344444433...',
            '..33......33...',
          ]
        : type % 3 === 1
          ? [
              '.........3...3..',
              '........3443443.',
              '.33333333444443.',
              '34444444444443..',
              '3444444444443...',
              '.34444444443....',
              '..33..33..33....',
              '..3...3....3....',
            ]
          : [
              '3...........3',
              '34.........43',
              '.344..3..443.',
              '..344454443..',
              '...3444443...',
              '..344444443..',
              '.33..343..33.',
              '.....343.....',
              '.....3.3.....',
            ];
    return icon(`animal:${type % 3}`, LIFE, rows);
  }

  function fortress(stage) {
    return k.sprite(`b36:fortress:${stage}`, 93, 77, STONE, paint => {
      const set = (x, y, index) => paint(Math.floor(x * 0.7) + 1, Math.floor(y * 0.7) + 1, index);
      for (let y = 11; y < 101; y++)
        for (let x = 6; x < 125; x++) {
          const tower = ((x > 7 && x < 33) || (x > 97 && x < 123)) && y > 24;
          const keep = x > 43 && x < 87 && y > 13;
          const wall = x > 25 && x < 106 && y > 59;
          if (!(tower || keep || wall) || y < 100 - stage * 22) continue;
          const top = keep ? 14 : tower ? 25 : 60;
          if (y < top + 7 && Math.floor(x / 6) % 2 === 0) continue;
          set(x, y, (Math.floor(y / 7) % 2 ? (x + 5) % 12 : x % 12) === 0 || y % 7 === 0 ? 1 : x < 65 ? 3 : 2);
          if (y > 74 && x > 54 && x < 77 && (y > 82 || (x - 65) ** 2 + (y - 85) ** 2 < 121)) set(x, y, 1);
          if (y > 84 && x > 57 && x < 74 && x % 4 === 0) set(x, y, 4);
          if ((x === 18 || x === 110 || x === 63) && y > 40 && y < 48) set(x, y, 1);
        }
      if (stage === 4) {
        for (let y = 2; y < 15; y++) set(65, y, 4);
        for (let y = 2; y < 9; y++) for (let x = 66; x < 79 - y / 2; x++) set(x, y, 3);
      }
    });
  }
  // Mighty Fortress: four-square stone battlements rise tier by tier, locking into towers, a barred gate and a flag.
  FX.register('mighty-fortress', {
    palette: STONE,
    travel: 540,
    beats: (e, kit, t) => [{ at: C + t, stop: 140, target: null, kind: 'blast', power: 0.06 }],
    end: () => 1930,
    reach: reach(35),
    ground(s) {
      if (!live(s, 1930)) return;
      const p = center(s),
        stage = Math.min(4, Math.floor((s.c.t - C) / 135) + 1);
      ring(p, s.area ? 72 : 34, s.area ? 30 : 17, STONE, 2, 12, 0);
      // Two rear corner towers make the four-tower footprint legible from above.
      for (const side of [-1, 1]) {
        const at = add(p, side * 29, -28);
        for (let j = 0; j < 3; j++) line(add(at, -9, j * 5), add(at, 9, j * 5), STONE, j === 0 ? 4 : 2, 3);
        for (let j = -1; j <= 1; j++) pixel(add(at, j * 7, -3), STONE, 3, 3);
      }
      k.blit(fortress(stage), p.x - 46, p.y - 39);
    },
    air(s) {
      if (!live(s, 1930)) return;
      const p = center(s),
        h = s.hits[0],
        e = s.real(h);
      impact(s, h, p, STONE, 'fortress', 39, 12);
      if (e >= 0 && e < 620)
        for (let i = 0; i < 9; i++) {
          const q = e / 620,
            at = add(p, (i - 4) * 15, -q * 13 + Math.sin(i) * 4);
          if (q > 0.7 && i % 2) continue;
          ring(at, 4 + q * 6, 3 + q * 3, WITHER, 3, q > 0.5 ? 5 : 0, i);
        }
    },
  });

  function labyrinth() {
    return k.sprite('b36:labyrinth', 55, 55, GOLD, set => {
      for (let y = 2; y < 53; y++)
        for (let x = 2; x < 53; x++) {
          const dx = x - 27,
            dy = y - 27,
            r = Math.max(Math.abs(dx), Math.abs(dy));
          if (r > 24 || r % 6 > 1) continue;
          const gap = (dy > 0 && dx > -2 && dx < 3 && r !== 12) || (dx < 0 && dy > -2 && dy < 3 && r === 12);
          if (!gap) set(x, y, x < 28 ? 4 : 2);
        }
      for (let y = 23; y < 31; y++) set(25, y, 3);
      for (let x = 25; x < 32; x++) set(x, 23, 3);
    });
  }
  // Maze: nested golden right-angle corridors open beneath the victim, swallowing a silhouette before the gate locks shut.
  FX.register('maze', {
    palette: GOLD,
    travel: 420,
    beats: soft,
    end: () => 1600,
    ground(s) {
      if (!live(s, 1600)) return;
      subjects(s).forEach(t => {
        const p = feet(t);
        ring(p, 31, 25, SHADOW, 2);
        stamp(labyrinth(), add(p, 0, -5));
        if (s.c.t >= 1060) ring(p, 30, 24, GOLD, 3, 8, 0);
      });
    },
    air(s) {
      if (!live(s, 1600)) return;
      subjects(s).forEach(t => {
        const p = k.P(t),
          q = k.ease(k.clamp((s.c.t - C) / 420));
        const L = add(p, -24 - (1 - q) * 12, -27),
          R = add(p, 24 + (1 - q) * 12, -27);
        if (s.c.t < 1070) {
          line(L, add(L, 0, 48), GOLD, 3, 2);
          line(R, add(R, 0, 48), GOLD, 3, 2);
          line(L, R, GOLD, 4, 2);
          for (let i = 0; i < 3; i++) {
            const at = add(p, -12 + i * 12, -17 + i * 7);
            line(at, add(at, 7, 0), GOLD, 2);
            line(add(at, 7, 0), add(at, 7, 8), GOLD, 3);
          }
        }
        if (s.c.t >= 720 && s.c.t < 1070) {
          const shrink = k.clamp((s.c.t - 720) / 350);
          const ghost = add(p, 0, shrink * 12);
          orb(add(ghost, 0, -8), 3 * (1 - shrink) + 1, SHADOW, 2);
          line(ghost, add(ghost, 0, 8 * (1 - shrink)), SHADOW, 2, Math.max(1, 5 - Math.floor(shrink * 4)));
        }
        if (s.c.t >= 1070) {
          stamp(labyrinth(), add(p, 0, -8));
          line(add(p, -8, -3), add(p, 8, -3), GOLD, 5, 2);
        }
      });
      s.hits.forEach(h => impact(s, h, point(s, h), GOLD, 'maze', 28, 6));
    },
  });

  const lips = () =>
    icon('silver-tongue', SILVER, [
      '..333...333..',
      '.34443434443.',
      '3444445444443',
      '.33222222233.',
      '..34555443...',
      '...345543....',
      '....3443.....',
      '.....33......',
    ]);
})(typeof window !== 'undefined' ? window : globalThis);
