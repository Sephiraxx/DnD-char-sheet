/* Pixel spells, batch 09 (see docs/pixel-spells/BRIEF.md). */
(function (root) {
  'use strict';
  const FX = root.BoardPixelFX;
  if (!FX) return;
  const k = FX.kit;
  const OIL = ['#20180e', '#514025', '#887039', '#b6a45b', '#f0e6ab', '#ffffff'];
  const LEAF = ['#10200f', '#2d5426', '#548d3b', '#99c86a', '#e1f1b4', '#ffffff'];
  const ROSE = ['#290e28', '#68245c', '#b64b91', '#ed8fca', '#ffe0ef', '#ffffff'];
  const GOLD = ['#291a0a', '#85541c', '#c99130', '#f4ca60', '#fff1bb', '#ffffff'];
  const MAGIC = ['#15112e', '#393675', '#676ac1', '#a3c5ef', '#dfefff', '#ffffff'];
  const DEATH = ['#160c20', '#3b184d', '#753375', '#ae65b4', '#e6bbdc', '#ffffff'];
  const JIM = ['#171339', '#47318c', '#7264db', '#a5cbff', '#e0f8ff', '#ffffff'];
  const THORN = ['#241b10', '#514128', '#827846', '#afbd71', '#e9e5b6', '#ffffff'];
  const HUNT = ['#102219', '#29533a', '#53865c', '#a3c573', '#e8f3ba', '#ffffff'];
  const FIRE = ['#2a0d0c', '#6e1a12', '#b8321a', '#ec6a1c', '#ffb53a', '#ffffff'];
  const THUNDER = ['#141a26', '#3a4f6e', '#6f8fb5', '#b6d0ea', '#eef6ff', '#ffffff'];
  const SMOKE = ['#141011', '#2a2122', '#43383a', '#5f5250', '#80716a', '#b9aba0'];
  const ORBS = {
    fire: FIRE,
    frost: ['#0b1a2e', '#1d4f8a', '#3e8fd6', '#8fd4ff', '#e3f8ff', '#ffffff'],
    lightning: ['#0d1030', '#2b3fb0', '#4f8dff', '#a8e4ff', '#f4fdff', '#ffffff'],
    trueno: THUNDER,
    ácido: ['#101a06', '#3b6114', '#79ad1f', '#c5ef45', '#f3ffb5', '#ffffff'],
    veneno: ['#0e1a0d', '#2f5a2b', '#5f9a3f', '#a5d66a', '#e2ffc4', '#ffffff'],
  };
  const seed = s => s.event.seed || 0;
  const end = tail => (event, travel) => k.CAST + travel + tail;
  const beats =
    (stop, kind = 'hit', all = false) =>
    (event, kit, travel) =>
      (all && event.targets?.length ? event.targets : [event.targets?.[0] ?? null]).map(target => ({
        at: kit.CAST + travel,
        stop,
        target,
        kind,
        power: kind === 'soft' ? 0.03 : 0.075,
      }));
  const soft = beats(60, 'soft', true);
  function subject(s, hit = s.hits[0], self = false) {
    const t = s.targets.find(t => hit?.id != null && t.id === hit.id) || s.targets[0];
    if (t && (!self || s.event.targets?.length)) return t;
    const b = (self ? s.pose.base : s.pose.target) || s.pose.base || s.pose.hand || { x: 0, y: 0 };
    return { x: b.x, y: b.y - 0.5, baseX: b.x, baseY: b.y, span: b.span || 1 };
  }
  const feet = t => k.P({ x: t.baseX ?? t.x, y: t.baseY ?? t.y + 0.5 });
  const contact = (s, hit) => k.P(k.contact(subject(s, hit), s.pose.hand || subject(s, hit)));
  function pixel(p, ramp, index = 3, size = 1) {
    k.dot(p.x, p.y, ramp[0], size + 2);
    k.dot(p.x, p.y, ramp[index], size);
  }
  function ball(p, r, ramp, index = 3) {
    k.disc(p.x, p.y, r + 1, ramp[0]);
    k.disc(p.x, p.y, r, ramp[index]);
  }
  function stroke(points, ramp, index = 3, width = 1) {
    // Bound long strokes so distant targets never multiply the particle budget.
    for (const outer of [true, false]) {
      for (let j = 1; j < points.length; j++) {
        const a = points[j - 1],
          b = points[j];
        const n = Math.min(32, Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y))));
        for (let i = j === 1 ? 0 : 1; i <= n; i++) {
          k.dot(k.mix(a.x, b.x, i / n), k.mix(a.y, b.y, i / n), ramp[outer ? 0 : index], width + (outer ? 2 : 0));
        }
      }
    }
  }
  function ring(p, rx, ry, ramp, index = 3, broken = false, phase = 0) {
    rx = Math.max(2, Math.round(rx));
    ry = Math.max(2, Math.round(ry));
    const w = rx * 2 + 5,
      h = ry * 2 + 5;
    const img = k.sprite(`09:ring:${rx}:${ry}:${ramp[2]}:${index}:${broken}:${phase % 4}`, w, h, ramp, set => {
      for (let y = 1; y < h - 1; y++)
        for (let x = 1; x < w - 1; x++) {
          const dx = (x - rx - 2) / rx,
            dy = (y - ry - 2) / ry;
          if (Math.abs(Math.hypot(dx, dy) - 1) * Math.min(rx, ry) > 0.65) continue;
          if (broken && (Math.floor(((Math.atan2(dy, dx) + Math.PI) * 6) / Math.PI) + phase) % 4 === 0) continue;
          set(x, y, index);
        }
    });
    k.blit(img, p.x - rx - 2, p.y - ry - 2);
  }
  function icon(name, rows, ramp) {
    return k.sprite(
      `09:icon:${name}:${ramp[2]}`,
      Math.max(...rows.map(r => r.length)) + 2,
      rows.length + 2,
      ramp,
      set => {
        rows.forEach((row, y) => [...row].forEach((v, x) => v !== '.' && set(x + 1, y + 1, Number(v))));
      },
    );
  }
  function stamp(name, rows, ramp, p) {
    const img = icon(name, rows, ramp);
    k.blit(img, p.x - img.width / 2, p.y - img.height / 2);
  }
  function impact(s, hit, p, ramp, size = 30, n = 6) {
    const e = s.real(hit);
    k.drawHit(
      k.hitStyle(`09:${s.event.id}:${ramp[2]}`, ramp, {
        S: size,
        spikes: 5,
        minor: 2,
        jag: 0.32,
        void: ramp === DEATH,
      }),
      p,
      e,
    );
    k.shards(p, e, ramp, seed(s) + s.hits.indexOf(hit) * 19, n, size * 0.7);
  }
  function flight(s, hit, T, ramp, arc = 0, radius = 3) {
    if (!s.pose.hand || s.c.t < k.CAST || s.c.t >= hit.at) return;
    const H = k.P(s.pose.hand),
      q = (s.c.t - k.CAST) / Math.max(1, hit.at - k.CAST);
    for (let i = 6; i >= 0; i--) {
      const u = q - i * 0.045;
      if (u < 0) continue;
      const p = { x: k.mix(H.x, T.x, u), y: k.mix(H.y, T.y, u) - Math.sin(u * Math.PI) * arc };
      if (i) pixel(p, ramp, i < 3 ? 4 : 2, i < 3 ? 2 : 1);
      else {
        ball(p, radius, ramp);
        ball({ x: p.x - 1, y: p.y - 1 }, Math.max(0.5, radius - 2), ramp, 5);
      }
    }
  }
  function aura(s, ramp) {
    for (const hit of s.hits) {
      const e = s.c.t - hit.at;
      if (e < 0 || e > 650) continue;
      const B = feet(subject(s, hit, true)),
        r = 9 + 8 * k.ease(k.clamp(e / 450));
      ring(B, r, r * 0.45, ramp, e < 100 ? 4 : 2, e > 440, Math.floor(e / 100));
    }
  }
  function shape(s, kind, feetSize, self = false) {
    if (s.area) return s.area;
    const target = s.pose.target || subject(s),
      b = s.pose.base || s.pose.hand || target;
    const length = feetSize / (s.grid.feet || 5);
    return {
      kind,
      feet: feetSize,
      x: self ? b.x : target.x - length / 2,
      y: self ? b.y : target.y,
      dir: self ? Math.atan2(target.y - b.y, target.x - b.x) : 0,
      self,
    };
  }
  function corners(s, area) {
    let points = k.outline(area, s.grid);
    if (!points.length) {
      const L = area.feet / (s.grid.feet || 5),
        d = area.dir || 0;
      const at = (u, v) => [area.x + Math.cos(d) * u - Math.sin(d) * v, area.y + Math.sin(d) * u + Math.cos(d) * v];
      points =
        area.kind === 'cone'
          ? [at(0, 0), at(L, -L / 2), at(L, L / 2)]
          : [at(0, -L / 2), at(L, -L / 2), at(L, L / 2), at(0, L / 2)];
    }
    return points.map(p => k.P(Array.isArray(p) ? { x: p[0], y: p[1] } : p));
  }
  function local(s, area, u, v) {
    const L = area.feet / (s.grid.feet || 5),
      d = area.dir || 0;
    return k.P({
      x: area.x + (Math.cos(d) * u - Math.sin(d) * v) * L,
      y: area.y + (Math.sin(d) * u + Math.cos(d) * v) * L,
    });
  }
  function field(s, area, name, frame, ramp, paint) {
    const pts = corners(s, area),
      x0 = Math.floor(Math.min(...pts.map(p => p.x))) - 2,
      y0 = Math.floor(Math.min(...pts.map(p => p.y))) - 2;
    const w = Math.ceil(Math.max(...pts.map(p => p.x))) - x0 + 3,
      h = Math.ceil(Math.max(...pts.map(p => p.y))) - y0 + 3;
    const A = k.P(area),
      L = (area.feet / (s.grid.feet || 5)) * 16,
      d = area.dir || 0;
    const relative = pts.map(p => [Math.round((p.x - A.x) * 10), Math.round((p.y - A.y) * 10)]).join(':');
    const anchor = `${w}:${h}:${(A.x - x0).toFixed(2)}:${(A.y - y0).toFixed(2)}`;
    const img = k.sprite(
      `09:field:${name}:${relative}:${anchor}:${frame}:${ramp[2]}:${seed(s) % 4}`,
      w,
      h,
      ramp,
      set => {
        for (let y = 1; y < h - 1; y++)
          for (let x = 1; x < w - 1; x++) {
            const dx = x + x0 - A.x,
              dy = y + y0 - A.y;
            const u = (dx * Math.cos(d) + dy * Math.sin(d)) / L,
              v = (-dx * Math.sin(d) + dy * Math.cos(d)) / L;
            let inside = false;
            for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
              const a = pts[i],
                b = pts[j],
                px = x + x0,
                py = y + y0;
              if (a.y > py !== b.y > py && px < ((b.x - a.x) * (py - a.y)) / (b.y - a.y) + a.x) inside = !inside;
            }
            if (!inside) continue;
            const index = paint(u, v, x, y, frame);
            if (index > 0) set(x, y, index);
          }
      },
    );
    k.blit(img, x0, y0);
  }
  function greaseFloor(s, life = 1) {
    const area = shape(s, 'cube', 10),
      frame = Math.floor(s.c.raw / 160) % 3;
    field(s, area, 'grease', frame, OIL, (u, v) => {
      const edge = Math.max(Math.abs(u - 0.5) * 2, Math.abs(v) * 2);
      if (edge > 0.94 + 0.025 * Math.sin(u * 32 + v * 23)) return 0;
      const sheen = Math.sin(u * 21 + v * 12 + frame * 0.35);
      if (edge > 0.84) return 1;
      if (sheen > 0.93 && u < 0.8) return 4;
      return edge > 0.66 ? 2 : sheen > 0.6 ? 3 : 1;
    });
    // A zone disappears in discrete patches, rather than becoming a soft wash.
    if (life < 0.5) return;
    for (let i = 0; i < 3; i++) {
      const p = local(s, area, 0.2 + i * 0.28, (i % 2 ? 1 : -1) * 0.24);
      ring(p, 4 + i, 2, OIL, 4, true, frame);
    }
  }
  const HEART = ['.33.33.', '3443443', '3444443', '.34443.', '..343..', '...3...'];
  const PAW = ['.3..3..3.', '343343343', '.3..3..3.', '...333...', '..34443..', '.3444443.', '..33333..'];
  const SHIELD = [
    '44444444444',
    '43333333334',
    '43222422234',
    '.322444223.',
    '.322242223.',
    '..3224223..',
    '...32223...',
    '....323....',
    '.....3.....',
  ];
  const SKULL = ['..33333..', '.3444443.', '343434343', '341434143', '.3443443.', '..32323..', '..34343..'];
  const PALM = ['.3.3.3.3.', '.4.4.4.4.', '.4343434.', '.3444443.', '33444443.', '34444443.', '.344443..', '..3333...'];
  const DART = ['......4...', '....344...', '.2334455..', '233445555.', '.2334455..', '....344...', '......4...'];
  const BARB = [
    '.........4.',
    '.......443.',
    '.....4433..',
    '...4433....',
    '.2433......',
    '..23.......',
    '.2.........',
  ];

  // Speak with Animals: green speech bubbles trade a paw print and a bird above the caster.
  FX.register('speak-with-animals', {
    palette: LEAF,
    travel: 100,
    beats: soft,
    end: end(780),
    ground: s => aura(s, LEAF),
    air(s) {
      const hit = s.hits[0],
        T = k.P(subject(s, hit, true)),
        e = s.c.t - k.CAST;
      if (e < 0 || e > 880) return;
      for (let i = 0; i < 2; i++) {
        const p = { x: T.x + (i ? 12 : -12), y: T.y - 15 - (Math.floor(e / 150) % 2) };
        const w = 19,
          h = 16;
        const img = k.sprite(`09:bubble:${i}`, w, h, LEAF, set => {
          for (let y = 2; y < 12; y++)
            for (let x = 2; x < 17; x++) {
              if ((x === 2 || x === 16) && (y === 2 || y === 11)) continue;
              set(x, y, x === 3 || y === 2 ? 4 : 1);
            }
          set(i ? 6 : 12, 12, 3);
          set(i ? 5 : 13, 13, 3);
        });
        if (e > 700 && Math.floor(e / 60) % 3 === i) continue;
        k.blit(img, p.x - w / 2, p.y - h / 2);
        if (!i) stamp('paw', PAW, LEAF, { x: p.x, y: p.y - 1 });
        else stamp('bird', ['..4.....', '.343....', '34443.4.', '.334443.', '..333...', '...3....'], LEAF, p);
      }
      impact(s, hit, { x: T.x, y: T.y - 12 }, LEAF, 18, 4);
      if (e > 240 && e < 670) {
        for (let i = 0; i < 3; i++)
          pixel({ x: T.x - 4 + i * 4, y: T.y - 16 + ((i + Math.floor(e / 100)) % 2) * 2 }, LEAF, 4);
      }
    },
  });

  // Identify: a blue appraisal lens scans the object, resolves a gold rune and snaps shut.
  FX.register('identify', {
    palette: MAGIC,
    travel: 100,
    beats: soft,
    end: end(880),
    air(s) {
      const hit = s.hits[0],
        T = k.P(subject(s, hit)),
        e = s.c.t - hit.at;
      if (s.c.t < k.CAST || e > 880) return;
      const scan = k.clamp((e + 100) / 520),
        y = T.y - 11 + scan * 22;
      if (e < 500) {
        ring({ x: T.x, y }, 12, 4, MAGIC, 4);
        for (const side of [-1, 1])
          stroke(
            [
              { x: T.x + side * 15, y: T.y - 12 },
              { x: T.x + side * 18, y: T.y - 12 },
              { x: T.x + side * 18, y: T.y + 12 },
              { x: T.x + side * 15, y: T.y + 12 },
            ],
            MAGIC,
            3,
          );
      } else if (e < 760) {
        ring({ x: T.x, y: T.y - 4 }, 9, 9, GOLD, 4);
        stroke(
          [
            { x: T.x + 7, y: T.y + 3 },
            { x: T.x + 13, y: T.y + 9 },
          ],
          GOLD,
          3,
          2,
        );
        stamp('identified-rune', ['...4...', '..434..', '.43.34.', '4.4.4.4', '.43.34.', '..434..', '...4...'], GOLD, {
          x: T.x,
          y: T.y - 4,
        });
      } else {
        for (let i = 0; i < 4; i++)
          pixel(
            {
              x: T.x + (i % 2 ? 1 : -1) * (11 - (e - 760) / 16),
              y: T.y - 4 + (i < 2 ? -1 : 1) * (11 - (e - 760) / 16),
            },
            GOLD,
            4,
          );
      }
      impact(s, hit, { x: T.x, y: T.y - 4 }, MAGIC, 18, 4);
    },
  });

  // Silent Image: a violet construction grid raises a hollow, shimmering castle inside the illusion cube.
  FX.register('silent-image', {
    palette: MAGIC,
    travel: 160,
    beats: soft,
    end: end(820),
    ground(s) {
      const e = s.c.t - s.hits[0].at;
      if (e < 0) return;
      const area = shape(s, 'cube', 15),
        frame = Math.min(5, Math.floor(e / 100));
      field(s, area, 'illusion-grid', frame, MAGIC, (u, v) => {
        const edge = Math.min(u, 1 - u, 0.5 - Math.abs(v));
        if (edge < 0.035) return 4;
        return Math.abs((u * 3) % 1) < 0.045 || Math.abs(((v + 0.5) * 3) % 1) < 0.045 ? 2 : 0;
      });
      const C = local(s, area, 0.5, 0),
        rise = Math.min(5, Math.floor(e / 80));
      const phase = Math.floor(e / 110) % 4;
      const img = k.sprite(`09:illusion-castle:${rise}:${phase}`, 43, 42, MAGIC, set => {
        for (let y = 2; y < 38; y++)
          for (let x = 3; x < 40; x++) {
            if (y < 36 - rise * 7) continue;
            const tower = (x < 13 || x > 29) && y >= 8;
            const crown = tower && y < 12 && Math.floor(x / 3) % 2 === 0;
            const keep = x >= 13 && x <= 29 && y >= 18;
            if ((!tower && !keep) || crown) continue;
            const door = x >= 18 && x <= 24 && y > 26;
            const opening = (x === 7 || x === 34) && y > 16 && y < 21;
            if (door || opening) continue;
            const edge = y === 8 || y === 18 || y === 37 || x === 3 || x === 12 || x === 30 || x === 39;
            if (!edge && (x + y + phase) % 4 !== 0) continue;
            set(x, y, edge ? 4 : y % 7 === 0 ? 3 : 2);
          }
      });
      k.blit(img, C.x - 21, C.y - 35);
    },
    air(s) {
      const hit = s.hits[0],
        C = local(s, shape(s, 'cube', 15), 0.5, 0);
      flight(s, hit, C, MAGIC, 7, 2);
      impact(s, hit, C, MAGIC, 20, 5);
    },
    linger(s) {
      if (s.linger < 0.25) return;
      const a = shape(s, 'cube', 15),
        C = local(s, a, 0.5, 0);
      ring(C, 15, 6, MAGIC, 2, true, Math.floor(s.c.raw / 180));
      stamp(
        'illusion-diamond',
        [
          '....4....',
          '...434...',
          '..43.34..',
          '.43...34.',
          '43.....34',
          '.43...34.',
          '..43.34..',
          '...434...',
          '....4....',
        ],
        MAGIC,
        { x: C.x, y: C.y - 13 },
      );
    },
  });

  // Jim's Magic Missile: blue-violet, star-tipped force darts corkscrew separately and burst into glitter.
  FX.register('jims-magic-missile', {
    palette: JIM,
    travel: 390,
    beats(event, kit, travel) {
      const count = Math.min(11, 2 + Math.max(1, event.slot || event.level || 1));
      const ids = kit.targetList(event, event.darts);
      return Array.from({ length: count }, (_, i) => ({
        at: kit.CAST + travel + i * 62,
        stop: 50,
        target: ids[i % Math.max(1, ids.length)] ?? null,
        kind: 'dart',
        power: 0.04,
      }));
    },
    end: (event, travel) =>
      k.CAST + travel + (Math.min(11, 2 + Math.max(1, event.slot || event.level || 1)) - 1) * 62 + 380,
    air(s) {
      if (!s.pose.hand) return;
      const H = k.P(s.pose.hand);
      s.hits.forEach((hit, i) => {
        const T = contact(s, hit),
          launch = k.CAST + i * 62,
          q = (s.c.t - launch) / 390;
        const dx = T.x - H.x,
          dy = T.y - H.y,
          L = Math.hypot(dx, dy) || 1;
        const path = u => {
          const env = Math.sin(u * Math.PI),
            side = Math.sin(u * k.tau * 2 + i * 2) * 5 + ((i % 3) - 1) * 12;
          return {
            x: k.mix(H.x, T.x, u) - (dy / L) * side * env,
            y: k.mix(H.y, T.y, u) + (dx / L) * side * env - env * 7,
          };
        };
        if (q >= 0 && q < 1) {
          for (let j = 5; j >= 1; j--) {
            const u = q - j * 0.045;
            if (u >= 0) pixel(path(u), JIM, j < 3 ? 4 : 2, j < 3 ? 2 : 1);
          }
          const p = path(q),
            prev = path(Math.max(0, q - 0.02));
          k.blitRotated(icon('jim-dart', DART, JIM), p.x, p.y, Math.atan2(p.y - prev.y, p.x - prev.x), 0.8);
          pixel({ x: p.x, y: p.y - 5 }, GOLD, 4);
        }
        impact(s, hit, T, JIM, 26, 4);
        const e = s.real(hit);
        if (e >= 0 && e < 300)
          for (let j = 0; j < 3; j++) {
            const a = (j * k.tau) / 3 + i,
              r = k.ease(e / 300) * 15;
            pixel({ x: T.x + Math.cos(a) * r, y: T.y + Math.sin(a) * r - 4 }, j % 2 ? GOLD : JIM, 4);
          }
      });
    },
  });

  // Hail of Thorns: a thorn-wrapped arrow strikes, then a five-foot halo detonates into piercing barbs.
  FX.register('hail-of-thorns', {
    palette: THORN,
    travel: 260,
    beats(event, kit, travel) {
      const ids = event.targets?.length ? event.targets : [null];
      return [
        { at: kit.CAST + travel, stop: 75, target: ids[0], kind: 'hit', power: 0.06 },
        ...ids.map(target => ({ at: kit.CAST + travel + 65, stop: 95, target, kind: 'hit', power: 0.065 })),
      ];
    },
    end: end(620),
    ground(s) {
      const hit = s.hits[1],
        e = s.real(hit);
      if (e < 0 || e > 400) return;
      const B = feet(subject(s, s.hits[0])),
        r = 4 + k.ease(e / 400) * ((5 / (s.grid.feet || 5)) * 16);
      ring(B, r, r * 0.65, THORN, e < 90 ? 4 : 2, e > 160, Math.floor(e / 80));
    },
    air(s) {
      const first = s.hits[0],
        T = contact(s, first);
      if (s.pose.hand && s.c.t >= k.CAST && s.c.t < first.at) {
        const H = k.P(s.pose.hand),
          q = (s.c.t - k.CAST) / 260;
        const p = { x: k.mix(H.x, T.x, q), y: k.mix(H.y, T.y, q) - Math.sin(q * Math.PI) * 4 };
        const angle = Math.atan2(T.y - H.y, T.x - H.x) + Math.PI / 4;
        k.blitRotated(icon('thorn-arrow', BARB, THORN), p.x, p.y, angle);
        for (let i = 1; i <= 4; i++) {
          const u = q - i * 0.04;
          if (u >= 0) pixel({ x: k.mix(H.x, T.x, u), y: k.mix(H.y, T.y, u) }, LEAF, 3);
        }
      }
      impact(s, first, T, THORN, 24, 4);
      for (const hit of s.hits.slice(1)) impact(s, hit, contact(s, hit), THORN, 30, 5);
      const e = s.real(s.hits[1]);
      if (e < 0 || e > 460) return;
      for (let i = 0; i < 12; i++) {
        const a = (i * k.tau) / 12 + seed(s) * 0.1,
          q = k.clamp(e / 420),
          r = 4 + k.ease(q) * 20;
        const p = { x: T.x + Math.cos(a) * r, y: T.y + Math.sin(a) * r * 0.8 + q * q * 6 };
        if (e > 350 && i % 2) continue;
        k.blitRotated(icon('hail-barb', BARB, THORN), p.x, p.y, a + Math.PI / 4);
      }
    },
  });

  // Burning Hands: two splayed palms release a full fifteen-foot orange fan, then black ash and embers.
  FX.register('burning-hands', {
    palette: FIRE,
    travel: 30,
    beats: beats(130, 'blast', true),
    end: end(690),
    flash: (event, e) =>
      e < 30 ? { color: '#ffdf91', alpha: 0.22 } : e < 65 ? { color: '#2a0d0c', alpha: 0.16 } : null,
    ground(s) {
      const e = s.c.t - k.CAST;
      if (e < 0 || e > 720) return;
      const area = shape(s, 'cone', 15, true),
        frame = Math.floor(e / 55);
      field(s, area, e < 440 ? 'flame-fan' : 'fan-ash', frame, e < 440 ? FIRE : SMOKE, (u, v, x, y) => {
        const age = frame * 55;
        if (age >= 440) {
          const seam = Math.sin(u * 33 + v * 21);
          return u > 0.2 && seam > 0.3 && (x + y) % 3 !== 0 ? 1 + (seam > 0.85 ? 1 : 0) : 0;
        }
        const edge = Math.abs(v) / Math.max(0.03, u * 0.5);
        const tongue = Math.sin(v * 47 + frame * 1.2) * 0.07 + Math.sin(v * 19 - frame) * 0.04;
        if (u > 0.88 + tongue && age > 70) return 0;
        if (age < 65) return u < 0.65 && edge < 0.75 ? 5 : 4;
        if (age > 300 && Math.floor((u * 21 + v * 17 + frame) % 5) < 2) return 0;
        return edge > 0.88 || u > 0.78 + tongue ? 2 : edge > 0.6 || u > 0.54 + tongue ? 3 : u > 0.25 ? 4 : 5;
      });
    },
    air(s) {
      const e = s.c.t - k.CAST;
      if (e >= 0 && e < 160 && s.pose.hand) {
        const H = k.P(s.pose.hand);
        stamp('fire-palm', PALM, FIRE, { x: H.x - 5, y: H.y });
        stamp('fire-palm', PALM, FIRE, { x: H.x + 5, y: H.y - 2 });
      }
      for (const hit of s.hits) impact(s, hit, contact(s, hit), FIRE, 36, 6);
      const real = s.real(s.hits[0]),
        area = shape(s, 'cone', 15, true);
      if (real < 0 || real > 540) return;
      for (let i = 0; i < 10; i++) {
        const u = 0.35 + k.hash(i, seed(s)) * 0.6,
          q = real / 540;
        const p = local(s, area, u, (k.hash(i, seed(s), 2) - 0.5) * u * 0.8);
        pixel({ x: p.x + Math.sin(i + q * 5) * 3, y: p.y - q * (7 + (i % 4)) }, FIRE, q < 0.3 ? 5 : q < 0.65 ? 4 : 2);
      }
    },
  });

  // Chromatic Orb: a faceted elemental sphere launches from a diamond focus and bursts in its chosen element.
  FX.register('chromatic-orb', {
    palette: event => ORBS[event.element] || MAGIC,
    travel: 330,
    beats: beats(110),
    end: end(570),
    air(s) {
      const hit = s.hits[0],
        T = contact(s, hit),
        ramp = s.ramp;
      if (s.pose.hand && s.c.t >= k.CAST && s.c.t < hit.at) {
        const H = k.P(s.pose.hand),
          q = (s.c.t - k.CAST) / 330;
        if (q < 0.3)
          stamp(
            'diamond-focus',
            ['..44444..', '.4533354.', '43.4.4.34', '.43.4.34.', '..43434..', '...434...', '....4....'],
            ramp,
            H,
          );
        const path = u => ({ x: k.mix(H.x, T.x, u), y: k.mix(H.y, T.y, u) - Math.sin(u * Math.PI) * 9 });
        for (let i = 6; i >= 1; i--) {
          if (q - i * 0.035 >= 0) pixel(path(q - i * 0.035), ramp, i < 3 ? 4 : 2, 2);
        }
        const p = path(q),
          frame = Math.floor(s.c.raw / 65) % 3;
        const img = k.sprite(`09:orb:${ramp[2]}:${frame}`, 17, 17, ramp, set => {
          for (let y = 2; y < 15; y++)
            for (let x = 2; x < 15; x++) {
              const dx = x - 8,
                dy = y - 8;
              if (dx * dx + dy * dy > 40) continue;
              const facet = dx + dy * 0.6;
              set(x, y, facet < -3 ? 4 : facet < 1 ? 3 : facet < 5 ? 2 : 1);
              if (Math.abs(dx + dy - frame + 1) < 1 && dx < 1) set(x, y, 5);
            }
        });
        k.blit(img, p.x - 8, p.y - 8);
        ring(p, 8, 3 + frame, ramp, 4, true, frame);
      }
      impact(s, hit, T, ramp, 38, 9);
      const e = s.real(hit);
      if (e < 0 || e > 530) return;
      const element = s.event.element;
      for (let i = 0; i < 6; i++) {
        const a = (i * k.tau) / 6 + seed(s) * 0.2,
          q = e / 530;
        const r = 5 + k.ease(q) * 16,
          p = { x: T.x + Math.cos(a) * r, y: T.y + Math.sin(a) * r * 0.8 };
        if (element === 'lightning') {
          if (e < 320) stroke([T, { x: p.x + 3, y: p.y - 4 }, { x: p.x - 2, y: p.y - 2 }, p], ramp, 4);
        } else if (element === 'frost') {
          const ice = icon('orb-ice', ['...4...', '..454..', '..343..', '.33433.', '..232..', '...2...'], ramp);
          k.blitRotated(ice, p.x, p.y + q * q * 6, a + Math.PI / 2);
        } else if (element === 'trueno') {
          if (i < 3 && e < 400) ring(T, r + i * 4, (r + i * 4) * 0.65, ramp, i ? 3 : 4, e > 170, i);
        } else {
          p.y += element === 'fire' ? -q * 12 : q * q * 12;
          ball(p, q < 0.35 ? 3 : q < 0.75 ? 2 : 1, ramp, q < 0.25 ? 4 : q < 0.65 ? 3 : 2);
          if (element === 'ácido' || element === 'veneno') ring({ x: p.x, y: p.y + 3 }, 3, 2, ramp, 3);
        }
      }
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
