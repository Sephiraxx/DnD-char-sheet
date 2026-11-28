/* Pixel spells, batch 57: rebuilt silhouettes, held peaks and real-time impacts. */
(function (root) {
  'use strict';
  const FX = root.BoardPixelFX;
  if (!FX) return;
  const k = FX.kit;
  const GOLD = ['#202438', '#475f88', '#89c6de', '#ffda7b', '#e9faff', '#ffffff'];
  const SOUL = ['#191631', '#494683', '#9291d5', '#a9eafa', '#ebfdff', '#ffffff'];
  const BLUE = ['#10192f', '#294d95', '#568fff', '#9ce3ff', '#e5faff', '#ffffff'];
  const HEAL = ['#162a23', '#337d50', '#72c884', '#b7f3a3', '#ffe79a', '#ffffff'];
  const PINK = ['#321329', '#833763', '#d369a5', '#ffadd9', '#ffe1f1', '#ffffff'];
  const STAR = ['#35223b', '#8d623e', '#e6ad4c', '#ffdc79', '#fff3c9', '#ffffff'];
  const VIOLET = ['#231535', '#604a9d', '#a68bdf', '#d6c6ff', '#f3edff', '#ffffff'];
  const DEATH = ['#14251b', '#263f2c', '#52764a', '#a5d66a', '#e1ffa2', '#ffffff'];
  const RED = ['#300f23', '#761e43', '#bb3655', '#ff6377', '#ffbdba', '#ffffff'];
  const seed = s => s.event.seed || 0;
  const ids = e => (e.targets?.length ? e.targets : [null]);
  const soft = (e, at, stop = 90) => ids(e).map(target => ({ at, stop, target, kind: 'soft', power: 0.03 }));
  const aim = s => s.targets[0] || s.pose.target || s.pose.hand || s.pose.base;
  const caster = s => k.P(s.pose.base || s.pose.hand || aim(s));
  const body = s => {
    const p = caster(s);
    return { x: p.x, y: p.y - 10 };
  };
  const life = (t, hold, end) => 1 - k.clamp((t - hold) / (end - hold));

  function stamp(name, rows, pal) {
    return k.sprite('57:' + name, Math.max(...rows.map(row => row.length)) + 2, rows.length + 2, pal, set => {
      rows.forEach((row, y) =>
        [...row].forEach((v, x) => {
          if (v !== '.') set(x + 1, y + 1, Number(v));
        }),
      );
    });
  }
  function put(img, p, alpha = 1) {
    k.blit(img, p.x - img.width / 2, p.y - img.height / 2, alpha);
  }
  function line(a, b, pal, width = 3, index = 4) {
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 2));
    for (const [color, w] of [
      [pal[0], width + 2],
      [pal[index], width],
    ]) {
      for (let i = 0; i <= n; i++) {
        const q = i / n;
        k.dot(k.mix(a.x, b.x, q), k.mix(a.y, b.y, q), color, w);
      }
    }
  }
  function ring(p, rx, ry, pal, alpha = 1, width = 2) {
    rx = Math.max(2, Math.round(rx));
    ry = Math.max(2, Math.round(ry));
    const w = rx * 2 + 8,
      h = ry * 2 + 8;
    const img = k.sprite(`57:ring:${pal[0]}:${rx}:${ry}:${width}`, w, h, pal, set => {
      for (let y = 1; y < h - 1; y++)
        for (let x = 1; x < w - 1; x++) {
          const d = Math.hypot((x - w / 2) / rx, (y - h / 2) / ry);
          const edge = Math.abs(d - 1) * Math.min(rx, ry);
          if (edge <= width / 2) set(x, y, y < h / 2 ? 4 : 3);
        }
    });
    put(img, p, alpha);
  }
  function star(pal, name, large = false) {
    return stamp(
      name,
      large
        ? [
            '.....5.....',
            '.....5.....',
            '....454....',
            '....454....',
            '..4445444..',
            '55555555555',
            '..4445444..',
            '....454....',
            '....454....',
            '.....5.....',
            '.....5.....',
          ]
        : ['...4...', '...5...', '..454..', '4555554', '..454..', '...5...', '...4...'],
      pal,
    );
  }
  function impact(s, hit, p, pal, name, size = 36, count = 9) {
    const e = s.real(hit);
    k.drawHit(k.hitStyle('57:' + name, pal, { S: size, spikes: 7, minor: 4, jag: 0.22 }), p, e);
    k.shards(p, e - 20, pal, seed(s) + hit.at, count, size * 0.65);
  }
  function motes(s, p, pal, age, n = 10, radius = 18, alpha = 1) {
    const img = star(pal, 'mote:' + pal[0]);
    for (let i = 0; i < n; i++) {
      const q = (((age / 1000 + k.hash(i, seed(s))) % 1) + 1) % 1;
      put(
        img,
        {
          x: p.x + (k.hash(i, seed(s), 2) - 0.5) * radius * 2,
          y: p.y + 6 - q * 30,
        },
        alpha * (q < 0.8 ? 0.75 : 0.25),
      );
    }
  }
  function floorPoint(t) {
    return k.P({ x: t.baseX ?? t.x, y: t.baseY ?? t.y + 0.62 });
  }
  function areaInfo(s, feet) {
    return {
      p: k.P(s.area || s.pose.base || aim(s)),
      r: Math.max(8, Math.round(((s.area?.feet || feet) / (s.grid.feet || 5)) * k.PX)),
    };
  }

  function dome(radius) {
    const r = Math.round(radius),
      h = Math.round(r * 1.25),
      pad = 5;
    const w = r * 2 + pad * 2,
      height = h + Math.ceil(r * 0.46) + pad * 2;
    const cx = w / 2,
      cy = h + pad;
    const img = k.sprite('57:dome:' + r, w, height, GOLD, set => {
      // A solid arch, continuous thick rim and large hexagonal panes; the centre stays open.
      for (let y = 2; y < height - 2; y++)
        for (let x = 2; x < w - 2; x++) {
          const dx = x - cx,
            dy = y - cy;
          const roof = Math.hypot(dx / r, dy / h);
          const foot = Math.hypot(dx / r, dy / (r * 0.46));
          if (dy <= 0 && roof <= 1) {
            if (roof > 1 - 3 / r) set(x, y, dx < -r * 0.1 ? 4 : 3);
            else if (roof > 1 - 5 / r && k.dith(x, y) < 0.5) set(x, y, 2);
          }
          if (Math.abs(foot - 1) < 2 / (r * 0.46)) set(x, y, dy < 0 ? 2 : 4);
        }
      const stroke = (ax, ay, bx, by) => {
        const n = Math.ceil(Math.hypot(bx - ax, by - ay));
        for (let i = 0; i <= n; i++) {
          const x = Math.round(k.mix(ax, bx, i / n)),
            y = Math.round(k.mix(ay, by, i / n));
          if (y > cy - 3 || Math.hypot((x - cx) / r, (y - cy) / h) > 0.9) continue;
          set(x, y, 2);
          set(x + 1, y, 4);
        }
      };
      for (let row = -1; row < Math.ceil(h / 12); row++) {
        for (let col = -1; col < Math.ceil(w / 14); col++) {
          const x = col * 14 + (row % 2 ? 7 : 0),
            y = pad + row * 12;
          const pts = [
            [x, y - 8],
            [x + 7, y - 4],
            [x + 7, y + 4],
            [x, y + 8],
            [x - 7, y + 4],
            [x - 7, y - 4],
          ];
          for (let j = 0; j < 6; j++) stroke(...pts[j], ...pts[(j + 1) % 6]);
        }
      }
    });
    return { img, cx, cy };
  }
  function globeGround(s, alpha) {
    const { p, r } = areaInfo(s, 10),
      d = dome(r);
    k.blit(d.img, p.x - d.cx, p.y - d.cy, alpha);
  }
  function deflections(s, alpha) {
    const { p, r } = areaInfo(s, 10),
      img = star(GOLD, 'deflection', true);
    for (let i = 0; i < 3; i++) {
      const q = (s.c.raw / 1900 + i / 3) % 1;
      if (q > 0.48) continue;
      const a = -Math.PI * (0.15 + k.hash(i, seed(s)) * 0.7);
      const d = q < 0.18 ? (0.18 - q) * 35 : (q - 0.18) * 45;
      put(img, { x: p.x + Math.cos(a) * (r + d), y: p.y + Math.sin(a) * (r * 1.25 + d) }, alpha);
    }
  }

  // Globe of Invulnerability: a thick gold-blue hex dome turns incoming sparks aside.
  FX.register('globe-of-invulnerability', {
    palette: GOLD,
    travel: 200,
    beats: e => [{ at: 500, stop: 100, target: e.caster ?? null, kind: 'soft', power: 0.03 }],
    end: () => 1350,
    ground(s) {
      if (s.c.t < k.CAST) return;
      if (s.c.t >= 500) {
        if (!(s.pose.linger > 0)) globeGround(s, life(s.c.t, 1150, 1350));
        return;
      }
      const { p, r } = areaInfo(s, 10);
      ring(p, r * (0.4 + 0.6 * k.ease((s.c.t - k.CAST) / 200)), r * 0.46, GOLD);
    },
    air(s) {
      if (s.c.t < 500) return;
      const { p } = areaInfo(s, 10);
      impact(s, s.hits[0], { x: p.x, y: p.y - 32 }, GOLD, 'globe', 34, 6);
      if (!(s.pose.linger > 0)) deflections(s, life(s.c.t, 1150, 1350));
    },
    linger(s) {
      globeGround(s, s.linger);
    },
    lingerAir(s) {
      deflections(s, s.linger);
    },
  });

  function jarSprite() {
    return stamp(
      'jar',
      [
        '......44.......',
        '.....4554......',
        '....344443.....',
        '.....3333......',
        '.....4554......',
        '....345543.....',
        '...23455432....',
        '..2345555432...',
        '..2345555432...',
        '..2345555432...',
        '..2345555432...',
        '..2344554432...',
        '..2344554432...',
        '..2344554432...',
        '...23444432....',
        '....233332.....',
        '.....4444......',
        '....344443.....',
      ],
      SOUL,
    );
  }

  function chainAt(i, n) {
    return 470 + i * Math.min(150, 540 / Math.max(1, n - 1));
  }
  function bolt(a, b, age, pal, salt, width = 5) {
    if (age < 0 || age > 245) return;
    const n = Math.max(3, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 11));
    const dx = b.x - a.x,
      dy = b.y - a.y,
      length = Math.hypot(dx, dy) || 1;
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const q = i / n;
      const off = i === 0 || i === n ? 0 : (k.hash(i, salt, Math.floor(age / 55)) - 0.5) * 15;
      pts.push({ x: k.mix(a.x, b.x, q) - (dy / length) * off, y: k.mix(a.y, b.y, q) + (dx / length) * off });
    }
    // Paint whole outline first, then the blue body and white spine across every joint.
    for (const [color, w] of [
      [pal[0], width + 4],
      [pal[2], width + 2],
      [pal[3], width],
      [pal[5], 2],
    ]) {
      for (let i = 1; i < pts.length; i++) {
        const A = pts[i - 1],
          B = pts[i],
          steps = Math.max(1, Math.ceil(Math.hypot(B.x - A.x, B.y - A.y) / 2));
        for (let j = 0; j <= steps; j++) {
          if (age > 170 && (i + j) % 3 === 0) continue;
          k.dot(k.mix(A.x, B.x, j / steps), k.mix(A.y, B.y, j / steps), color, w);
        }
      }
    }
  }
  // Chain Lightning: a thick white-blue fork strikes once, then jumps between successive bodies.
  FX.register('chain-lightning', {
    palette: BLUE,
    travel: 170,
    beats: e =>
      ids(e).map((target, i, list) => ({
        at: chainAt(i, list.length),
        stop: Math.min(110, Math.floor(360 / list.length)),
        target,
        kind: 'beam',
        power: 0.08,
      })),
    end: e => chainAt(ids(e).length - 1, ids(e).length) + 490,
    air(s) {
      const list = s.targets.length ? s.targets : [aim(s)];
      s.hits.forEach((hit, i) => {
        const target = list.find(t => t.id === hit.id) || list[i % list.length];
        if (!target) return;
        const from = i ? list[(i - 1) % list.length] : s.pose.hand;
        if (!from) return;
        const a = k.P(from),
          b = k.P(k.contact(target, from));
        const age = s.c.t < hit.at ? s.c.t - (hit.at - 65) : 65 + s.real(hit);
        bolt(a, b, age, BLUE, seed(s) + i * 31);
        impact(s, hit, b, BLUE, 'chain', 44, 10);
      });
    },
    flash: (e, t) => (t < 45 ? { color: BLUE[4], alpha: 0.16 } : null),
  });

  function cross() {
    return k.sprite('57:heal-cross', 29, 29, HEAL, set => {
      for (let y = 2; y <= 26; y++)
        for (let x = 2; x <= 26; x++) {
          if ((x >= 10 && x <= 18) || (y >= 10 && y <= 18)) {
            set(x, y, x < 12 || y < 12 ? 5 : x > 16 || y > 16 ? 3 : 4);
          }
        }
    });
  }
  // Heal: an enormous gold-edged green cross blooms through a wide ring and rising life motes.
  FX.register('heal', {
    palette: HEAL,
    travel: 230,
    beats: e => soft(e, 530, 120),
    end: () => 1450,
    ground(s) {
      if (s.c.t < k.CAST) return;
      s.targets.forEach(t => {
        const p = floorPoint(t),
          age = s.c.t - k.CAST;
        ring(
          p,
          12 + 16 * k.ease(k.clamp(age / 230)),
          8 + 8 * k.ease(k.clamp(age / 230)),
          HEAL,
          life(s.c.t, 1100, 1450),
          3,
        );
      });
    },
    air(s) {
      if (s.c.t < k.CAST) return;
      s.hits.forEach((hit, i) => {
        const t = s.targets.find(t => t.id === hit.id) || s.targets[i] || aim(s);
        if (!t) return;
        const p = k.P(t),
          age = s.c.t - 530;
        if (age < 0) {
          const q = k.ease((s.c.t - k.CAST) / 230);
          ring({ x: p.x, y: p.y + 13 - q * 13 }, 6 + q * 16, 4 + q * 13, HEAL);
          return;
        }
        impact(s, hit, p, HEAL, 'heal', 52, 12);
        ring(p, 24, 24, HEAL, life(s.c.t, 1050, 1250), 3);
        put(cross(), { x: p.x, y: p.y - Math.max(0, age - 350) / 70 }, life(s.c.t, 1070, 1400));
        motes(s, p, HEAL, s.real(hit), 12, 26, life(s.c.t, 1240, 1450));
      });
    },
    flash: (e, t) => (t < 65 ? { color: HEAL[4], alpha: 0.18 } : null),
  });

  function bubble() {
    return stamp(
      'whisper-bubble',
      [
        '...444444444...',
        '..45555555554..',
        '.4555555555554.',
        '.4555555555554.',
        '.4552252252254.',
        '.4552252252254.',
        '.4555555555554.',
        '..45555555554..',
        '...444444444...',
        '.....444.......',
        '....444........',
        '...44..........',
      ],
      PINK,
    );
  }
  function whispers(phase, growth) {
    return k.sprite(`57:whispers:${phase}:${growth}`, 33, 31, PINK, set => {
      for (let j = 0; j <= growth * 24; j++) {
        const q = j / 144,
          a = q * k.tau * 2 + (phase / 12) * k.tau;
        const x = Math.round(16 + Math.cos(a) * 13),
          y = Math.round(15 + Math.sin(a) * 5 + 7 - q * 15);
        set(x, y, 3);
        set(x + 1, y, 4);
      }
    });
  }
  // Mass Suggestion: broad pink whisper coils wrap each head as bright speech bubbles pop open.
  FX.register('mass-suggestion', {
    palette: PINK,
    travel: 270,
    beats: e => soft(e, 570, 90),
    end: () => 1450,
    air(s) {
      if (s.c.t < k.CAST) return;
      s.hits.forEach((hit, i) => {
        const t = s.targets.find(t => t.id === hit.id) || s.targets[i] || aim(s);
        if (!t) return;
        const p = k.P(t),
          head = { x: p.x, y: p.y - 8 };
        const q = k.clamp((s.c.t - k.CAST) / 270),
          alpha = life(s.c.t, 1130, 1450);
        put(whispers(Math.floor(s.c.raw / 440) % 12, Math.ceil(q * 6)), head, alpha);
        if (s.c.t >= 570) {
          impact(s, hit, head, PINK, 'suggestion', 30, 5);
          put(bubble(), { x: head.x + 9, y: head.y - 15 - Math.sin(s.c.raw / 220) }, alpha);
        }
      });
    },
  });

  function construct(stage = 4) {
    const rows = [
      '......3443......',
      '.....345543.....',
      '.....345543.....',
      '......3443......',
      '...3344444433...',
      '..344345543443..',
      '..344345543443..',
      '..344345543443..',
      '..344344443443..',
      '..344334433443..',
      '...4433443344...',
      '.....344443.....',
      '.....344443.....',
      '.....344443.....',
      '.....344443.....',
      '....344..443....',
      '....344..443....',
      '....344..443....',
      '....344..443....',
      '...3444..4443...',
    ];
    return stamp(
      'construct:' + stage,
      rows.map((row, i) => (i < 20 - stage * 5 ? '.'.repeat(16) : row)),
      GOLD,
    );
  }
  // Create Magen: luminous feet, torso, arms and a crystal head assemble inside a brilliant seal.
  FX.register('create-magen', {
    palette: GOLD,
    travel: 500,
    beats: e => soft(e, 800, 110),
    end: () => 1540,
    ground(s) {
      if (s.c.t < k.CAST) return;
      const t = aim(s),
        p = floorPoint(t),
        alpha = life(s.c.t, 1340, 1540);
      ring(p, 20, 11, GOLD, alpha, 3);
      ring(p, 13, 7, GOLD, alpha);
    },
    air(s) {
      if (s.c.t < k.CAST) return;
      const t = aim(s),
        p = floorPoint(t),
        age = s.c.t - k.CAST;
      const stage = Math.min(4, 1 + Math.floor(age / 125));
      put(construct(stage), { x: p.x, y: p.y - 11 }, life(s.c.t, 1320, 1540));
      if (s.c.t < 800) {
        const y = p.y - Math.min(20, age / 25);
        line({ x: p.x - 12, y }, { x: p.x + 12, y }, GOLD, 2, 5);
        motes(s, { x: p.x, y: p.y + 3 }, GOLD, s.c.raw, 7, 19);
      }
      impact(s, s.hits[0], { x: p.x, y: p.y - 12 }, GOLD, 'magen', 40, 9);
    },
  });

  function skull() {
    return stamp(
      'death-skull',
      [
        '........4444444........',
        '......44555555544......',
        '.....4455555555544.....',
        '....445555555555544....',
        '...44555555555555544...',
        '...45555555555555554...',
        '..4455555555555555544..',
        '..4555555555555555554..',
        '..4551115555511155554..',
        '..4511111555111115554..',
        '..4511111555111115554..',
        '..4511111555111115554..',
        '...45111555551115554...',
        '...45555551555555554...',
        '....455551115555554....',
        '.....4555111555554.....',
        '.....4545555545454.....',
        '.....4545454545454.....',
        '.....4545454545454.....',
        '......44444444444......',
        '.......333333333.......',
      ],
      DEATH,
    );
  }
  // Finger of Death: a black-green bolt with a sickly white core detonates into a giant skull.
  FX.register('finger-of-death', {
    palette: DEATH,
    travel: 250,
    beats: e => [{ at: 550, stop: 180, target: e.targets?.[0] ?? null, kind: 'beam', power: 0.1 }],
    end: () => 1390,
    air(s) {
      if (s.c.t < k.CAST) return;
      const target = aim(s),
        hand = s.pose.hand || target;
      if (!target) return;
      const H = k.P(hand),
        T = k.P(k.contact(target, hand));
      if (s.c.t < 550) {
        const q = (s.c.t - k.CAST) / 250,
          p = { x: k.mix(H.x, T.x, q), y: k.mix(H.y, T.y, q) };
        const tail = { x: k.mix(H.x, T.x, Math.max(0, q - 0.45)), y: k.mix(H.y, T.y, Math.max(0, q - 0.45)) };
        line(tail, p, DEATH, 8, 3);
        const steps = Math.max(1, Math.ceil(Math.hypot(p.x - tail.x, p.y - tail.y) / 2));
        for (let i = 0; i <= steps; i++) {
          k.dot(k.mix(tail.x, p.x, i / steps), k.mix(tail.y, p.y, i / steps), DEATH[4], 3);
        }
        put(star(DEATH, 'necrotic-head', true), p);
      } else {
        impact(s, s.hits[0], T, DEATH, 'death', 56, 14);
        const age = s.c.t - 550;
        put(skull(), { x: T.x, y: T.y - 7 - Math.max(0, age - 330) / 45 }, life(s.c.t, 1090, 1390));
        if (age < 470) ring(T, 21 + k.ease(age / 470) * 7, 23, DEATH, 0.75, 2);
      }
    },
    flash: (e, t) => (t < 45 ? { color: DEATH[4], alpha: 0.2 } : t < 95 ? { color: DEATH[0], alpha: 0.12 } : null),
  });

  function sword() {
    return stamp(
      'spectral-sword',
      [
        '......5......',
        '.....454.....',
        '.....454.....',
        '.....454.....',
        '.....454.....',
        '.....454.....',
        '.....454.....',
        '.....454.....',
        '.....454.....',
        '.....454.....',
        '.....454.....',
        '.....454.....',
        '.....454.....',
        '.....454.....',
        '.....454.....',
        '.....454.....',
        '.....343.....',
        '..444444444..',
        '..355555553..',
        '.....343.....',
        '.....343.....',
        '.....343.....',
        '.....454.....',
        '......4......',
      ],
      VIOLET,
    );
  }

  function ghost(frame) {
    return k.sprite('57:ethereal:' + frame, 23, 31, SOUL, set => {
      for (let y = 2; y < 29; y++)
        for (let x = 2; x < 21; x++) {
          const dx = x - 11;
          const head = Math.hypot(dx / 4.5, (y - 7) / 5) <= 1;
          const robe = y >= 11 && y < 27 && Math.abs(dx) < 5 + (y - 11) * 0.23;
          const arms = y >= 13 && y < 22 && Math.abs(dx) >= 5 && Math.abs(dx) < 10;
          if (!head && !robe && !arms) continue;
          const edge = head ? Math.hypot(dx / 4.5, (y - 7) / 5) > 0.7 : Math.abs(dx) > 4 + (y - 11) * 0.23 || y > 24;
          if (!edge && k.dith(x + frame, y) > 0.38) continue;
          if (y > 25 && (x + frame) % 4 < 2) continue;
          set(x, y, edge ? 4 : 3);
        }
      set(9, 7, 5);
      set(13, 7, 5);
    });
  }
  // Etherealness: a body-sized blue-white ghost shell sheds its solid bands into ordered dither.
  FX.register('etherealness', {
    palette: SOUL,
    travel: 260,
    beats: e => [{ at: 560, stop: 100, target: e.caster ?? null, kind: 'soft', power: 0.03 }],
    end: () => 1500,
    ground(s) {
      if (s.c.t < k.CAST) return;
      ring(caster(s), 16, 7, SOUL, life(s.c.t, 1150, 1500));
    },
    air(s) {
      if (s.c.t < k.CAST) return;
      const b = caster(s),
        p = { x: b.x, y: b.y - 13 };
      const age = s.c.t - k.CAST,
        q = k.clamp(age / 260);
      const img = ghost(Math.floor(s.c.raw / 150) % 4);
      put(img, { x: p.x, y: p.y - Math.max(0, age - 400) / 200 }, life(s.c.t, 1230, 1500));
      if (age < 260) ring({ x: p.x, y: b.y - q * 26 }, 13, 5, SOUL, 1, 3);
      if (s.c.t >= 560) {
        impact(s, s.hits[0], p, SOUL, 'ethereal', 30, 9);
        motes(s, p, SOUL, s.real(s.hits[0]), 9, 20, life(s.c.t, 1270, 1500));
      }
    },
  });

  function arrow() {
    return stamp(
      'gravity-arrow',
      [
        '......5......',
        '.....454.....',
        '....45554....',
        '...4555554...',
        '..455555554..',
        '.45555555554.',
        '..333555333..',
        '.....454.....',
        '.....454.....',
        '.....454.....',
        '.....454.....',
        '.....454.....',
        '.....454.....',
        '.....333.....',
      ],
      VIOLET,
    );
  }
  function floatingFigure() {
    return stamp(
      'lifted-figure',
      [
        '......444......',
        '.....45554.....',
        '.....45554.....',
        '......444......',
        '..44.34443.44..',
        '..454345543454.',
        '...4544554454..',
        '....34455443...',
        '.....345543....',
        '.....344443....',
        '.....344443....',
        '....344.443....',
        '....454.454....',
        '...454...454...',
        '...443...344...',
      ],
      VIOLET,
    );
  }
  function gravityFloor(s, alpha) {
    const { p, r } = areaInfo(s, 50);
    ring(p, r, r, VIOLET, alpha, 3);
    ring(p, r - 6, r - 6, VIOLET, alpha * 0.5, 2);
    s.targets.forEach(t => {
      const f = floorPoint(t);
      if (Math.hypot(f.x - p.x, f.y - p.y) > r) return;
      const img = k.sprite('57:gravity-shadow', 19, 9, VIOLET, set => {
        for (let y = 1; y < 8; y++)
          for (let x = 1; x < 18; x++) {
            if (Math.hypot((x - 9) / 8, (y - 4) / 3) < 1) set(x, y, 1);
          }
      });
      put(img, f, alpha);
      ring(f, 11, 5, VIOLET, alpha, 2);
    });
  }
  function gravityAir(s, alpha, casting) {
    const { p, r } = areaInfo(s, 50),
      raw = s.c.raw;
    const q = casting ? k.ease(k.clamp((s.c.t - k.CAST) / 420)) : 1;
    const up = arrow(),
      fig = floatingFigure();
    const people = s.targets.filter(t => {
      const f = floorPoint(t);
      return Math.hypot(f.x - p.x, f.y - p.y) <= r;
    });
    people.forEach((t, i) => {
      const f = floorPoint(t),
        lift = q * (25 + (i % 3) * 3) + Math.sin(raw / 500 + i) * 2;
      put(fig, { x: f.x, y: f.y - 11 - lift }, alpha * 0.75);
      put(up, { x: f.x - 14, y: f.y - 10 - lift * 0.55 }, alpha);
      // Two broad streaks visually join the lifted body to its abandoned ground shadow.
      if (casting && s.c.t < 1000) {
        line({ x: f.x - 5, y: f.y - 6 }, { x: f.x - 5, y: f.y - lift + 1 }, VIOLET, 2, 3);
        line({ x: f.x + 5, y: f.y - 6 }, { x: f.x + 5, y: f.y - lift + 1 }, VIOLET, 2, 3);
      }
    });
    for (let i = 0; i < 10; i++) {
      const a = k.hash(i, seed(s)) * k.tau,
        d = Math.sqrt(k.hash(i, seed(s), 2)) * r * 0.84;
      const cycle = (raw / 2200 + k.hash(i, seed(s), 3)) % 1;
      const x = p.x + Math.cos(a) * d,
        y = p.y + Math.sin(a) * d - cycle * 32 * q;
      const rock = k.sprite('57:gravity-rock:' + (i % 3), 7, 7, VIOLET, set => {
        for (let yy = 2; yy < 5; yy++)
          for (let xx = 1; xx < 6; xx++) {
            if (xx + yy > 3 && xx + yy < 9) set(xx, yy, yy === 2 ? 4 : 2);
          }
      });
      put(rock, { x, y }, alpha);
      if (i < 5) put(up, { x, y: y - 13 }, alpha * 0.75);
    }
  }
  // Reverse Gravity: violet arrows haul bright creature silhouettes and rubble off their floor shadows.
  FX.register('reverse-gravity', {
    palette: VIOLET,
    travel: 420,
    beats: e => soft(e, 720, 130),
    end: () => 1600,
    reach: (e, grid) => ({ r: (e.area?.feet || 50) / (grid.feet || 5) + 2, up: 4 }),
    ground(s) {
      if (s.c.t < k.CAST) return;
      if (s.c.t >= 720) {
        if (!(s.pose.linger > 0)) gravityFloor(s, life(s.c.t, 1380, 1600));
        return;
      }
      gravityFloor(s, 1);
    },
    air(s) {
      if (s.c.t < k.CAST) return;
      if (s.c.t < 720) gravityAir(s, 1, true);
      else if (!(s.pose.linger > 0)) gravityAir(s, life(s.c.t, 1380, 1600), false);
      s.hits.forEach((hit, i) => {
        const target = s.targets.find(t => t.id === hit.id) || s.targets[i];
        if (!target) return;
        const p = floorPoint(target);
        impact(s, hit, { x: p.x, y: p.y - 30 }, VIOLET, 'gravity', 38, 8);
      });
    },
    linger(s) {
      gravityFloor(s, s.linger);
    },
    lingerAir(s) {
      gravityAir(s, s.linger, false);
    },
  });

  function painGlyph() {
    return stamp(
      'pain-word',
      [
        '....4.....4.....4....',
        '...454...454...454...',
        '..45554.45554.45554..',
        '...454...454...454...',
        '...454...454...454...',
        '.4455544455544455544.',
        '.4555555555555555554.',
        '...454...454...454...',
        '...454..45554..454...',
        '...454...454...454...',
        '..45554..454..45554..',
        '.454.454.454.454.454.',
        '....4...45554...4....',
        '.........454.........',
        '..........4..........',
      ],
      RED,
    );
  }
  // Power Word Pain: a crimson word-seal stamps the body and drives long red-white pain spikes outward.
  FX.register('power-word-pain', {
    palette: RED,
    travel: 220,
    beats: e => [{ at: 520, stop: 160, target: e.targets?.[0] ?? null, kind: 'hit', power: 0.09 }],
    end: () => 1380,
    air(s) {
      if (s.c.t < k.CAST) return;
      const t = aim(s);
      if (!t) return;
      const p = k.P(t),
        age = s.c.t - 520;
      if (age < 0) {
        const q = (s.c.t - k.CAST) / 220;
        put(painGlyph(), { x: p.x, y: p.y - (1 - q) * 24 });
        return;
      }
      impact(s, s.hits[0], p, RED, 'pain', 54, 13);
      const real = s.real(s.hits[0]);
      if (real < 650)
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * k.tau + Math.PI / 8;
          const d = 13 + 9 * k.ease(k.clamp(real / 190));
          const start = { x: p.x + Math.cos(a) * 10, y: p.y + Math.sin(a) * 10 };
          const end = { x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d };
          line(start, end, RED, real < 250 ? 3 : 2, i % 2 ? 4 : 3);
        }
      put(painGlyph(), p, life(s.c.t, 1090, 1380));
      if (age > 470) ring(p, 16, 15, RED, life(s.c.t, 1120, 1380), 2);
    },
    flash: (e, t) => (t < 55 ? { color: RED[3], alpha: 0.17 } : null),
  });
})(typeof window !== 'undefined' ? window : globalThis);
