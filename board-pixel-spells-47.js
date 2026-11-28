/* Pixel spells, batch 47: rebuilt silhouettes and held, readable peaks. */
(function (root) {
  'use strict';
  const FX = root.BoardPixelFX;
  if (!FX) return;
  const k = FX.kit;
  const BLUE = ['#101b38', '#365775', '#679bc2', '#a4dfff', '#d8f4ff', '#ffffff'];
  const MAD = ['#24102f', '#5e246e', '#a546cb', '#e5a642', '#ffe390', '#fff8e2'];
  const PINK = ['#300e32', '#7b235c', '#c54898', '#ff84d6', '#ffd5f2', '#ffffff'];
  const GOLD = ['#30200c', '#83521c', '#c78b27', '#ffd45b', '#fff0b1', '#ffffff'];
  const WARN = ['#36130d', '#8c2918', '#e65220', '#ff9c3b', '#ffe3a0', '#ffffff'];
  const HEAL = ['#102c25', '#237250', '#46bb80', '#97ffc2', '#ddffe6', '#ffffff'];
  const ACID = ['#1b290c', '#497522', '#83c22a', '#c6ff43', '#eeffb0', '#ffffff'];
  const GHOST = ['#211c38', '#554571', '#9487b1', '#c9c8ed', '#ecebff', '#ffffff'];
  const FIRE = ['#351015', '#9c2918', '#ec571f', '#ff9c32', '#ffe481', '#fffce6'];
  const SHADOW = ['#170e2b', '#251336', '#4c236c', '#a366e8', '#dfb8ff', '#faf0ff'];

  function self(s) {
    const b = s.pose.base;
    return b
      ? { x: b.x, y: b.y - 0.62 * (b.span || 1), baseX: b.x, baseY: b.y, span: b.span || 1 }
      : s.pose.hand || s.pose.target;
  }
  function subject(s) {
    return s.targets[0] || s.pose.target || self(s);
  }
  function head(t) {
    const p = k.P(t);
    p.y -= 10 * (t.span || 1);
    return p;
  }
  function center(s) {
    return k.P(s.area || s.pose.target || subject(s));
  }
  function feet(t) {
    return k.P({ x: t.baseX ?? t.x, y: t.baseY ?? t.y + 0.62 });
  }
  function beats(event, kit, travel) {
    return [{ at: kit.CAST + travel, stop: 90, target: event.targets?.[0] ?? null, kind: 'soft', power: 0.03 }];
  }
  function casterBeat(event, kit, travel) {
    return [{ at: kit.CAST + travel, stop: 90, target: null, kind: 'soft', power: 0.03 }];
  }
  function ball(x, y, r, ramp, shade = 3) {
    k.disc(x, y, r + 1, ramp[0]);
    k.disc(x, y, r, ramp[shade]);
  }
  function stroke(points, ramp, shade = 4, width = 2) {
    for (const [color, size] of [
      [ramp[0], width + 2],
      [ramp[shade], width],
    ]) {
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1],
          b = points[i];
        const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 1.5));
        for (let j = 0; j <= n; j++) k.dot(k.mix(a.x, b.x, j / n), k.mix(a.y, b.y, j / n), color, size);
      }
    }
  }
  function ring(p, rx, ry, ramp, gap = 0, spin = 0) {
    k.ellipse(p.x, p.y, rx, ry, ramp[0], 4, gap, spin);
    k.ellipse(p.x, p.y, rx, ry, ramp[4], 2, gap, spin);
  }
  function spark(p, ramp, size = 4) {
    stroke(
      [
        { x: p.x - size, y: p.y },
        { x: p.x + size, y: p.y },
      ],
      ramp,
      4,
    );
    stroke(
      [
        { x: p.x, y: p.y - size },
        { x: p.x, y: p.y + size },
      ],
      ramp,
      5,
    );
  }
  function stamp(img, p, alpha = 1) {
    k.blit(img, p.x - img.width / 2, p.y - img.height / 2, alpha);
  }
  function art(name, rows, ramp) {
    return k.sprite('b47:' + name, Math.max(...rows.map(r => r.length)) + 2, rows.length + 2, ramp, set => {
      rows.forEach((row, y) =>
        [...row].forEach((c, x) => {
          if (c !== '.') set(x + 1, y + 1, +c);
        }),
      );
    });
  }
  function impact(s, p, ramp, size = 22, debris = 6) {
    const hit = s.hits[0];
    if (!hit) return;
    const e = s.real(hit);
    k.drawHit(k.hitStyle('b47:' + s.event.id, ramp, { S: size, spikes: 4, jag: 0.2 }), p, e);
    k.shards(p, e, ramp, s.event.seed || 0, debris, size * 0.55);
  }
  function delivery(s, to, ramp, until) {
    if (!s.pose.hand || s.c.t < k.CAST || s.c.t >= until) return;
    const h = k.P(s.pose.hand),
      q = (s.c.t - k.CAST) / (until - k.CAST);
    for (let i = 5; i >= 0; i--) {
      const u = q - i * 0.045;
      if (u < 0) continue;
      ball(k.mix(h.x, to.x, u), k.mix(h.y, to.y, u) - Math.sin(u * Math.PI) * 7, i ? 1 : 3, ramp, i ? 3 : 5);
    }
  }
  function spiral(p, phase, ramp, radius = 6) {
    const points = [];
    for (let j = 0; j <= 20; j++) {
      const a = (j / 20) * k.tau * 1.5 + phase,
        r = radius * (1 - j / 24);
      points.push({ x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r });
    }
    stroke(points, ramp, 4, 2);
  }
  function figure(name, phase = 0, density = 1, outlineOnly = false) {
    const inside = (x, y) =>
      (x - 8) ** 2 + (y - 4) ** 2 <= 10 ||
      (y >= 8 && y <= 15 && Math.abs(x - 8) <= 3 + (y > 12 ? 1 : 0)) ||
      (y >= 10 && y <= 14 && Math.abs(x - 8) <= 6) ||
      (y >= 16 && y <= 21 && (Math.abs(x - 5) <= 1 || Math.abs(x - 11) <= 1));
    return k.sprite('b47:figure:' + name, 19, 25, BLUE, set => {
      for (let y = 0; y < 23; y++)
        for (let x = 0; x < 17; x++) {
          if (!inside(x, y)) continue;
          const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
          if (outlineOnly && !edge) continue;
          if (k.dith(x + phase, y) > (edge ? Math.min(1, density + 0.25) : density)) continue;
          set(x + 1, y + 1, edge ? 4 : x < 8 ? 3 : 2);
        }
    });
  }
  function crown() {
    return art(
      'crown',
      [
        '..4......44......4..',
        '..54.....45.....45..',
        '...43...4554...34...',
        '.4.43...4334...34.4.',
        '.54433..4334..33445.',
        '..5433344334433345..',
        '..5433332222333345..',
        '...54444333444445...',
        '...43333222333334...',
        '..4445544444455444..',
      ],
      MAD,
    );
  }
  function brain() {
    return art(
      'brain',
      [
        '....444..444....',
        '..445554455544..',
        '.45533544533554.',
        '4553553445353554',
        '4533553445333554',
        '4553353445353554',
        '.45535544535554.',
        '..455554455554..',
        '....44433444....',
        '.......44.......',
        '.......44.......',
      ],
      PINK,
    );
  }
  function bubble(large) {
    return art(
      large ? 'speech' : 'thought',
      large
        ? [
            '...4444444444444444...',
            '.44555555555555555544.',
            '455555555555555555554',
            '455333355333553335554',
            '455553335553335553554',
            '455555555555555555554',
            '455333553333553333554',
            '455555555555555555554',
            '.44555555555555555544.',
            '...4444444444444444...',
            '.....4444............',
            '....444..............',
          ]
        : [
            '...44444444...',
            '.445555555544.',
            '4553355335554',
            '4535533553354',
            '4555555555554',
            '.445555555544.',
            '...44444444...',
            '....44........',
            '..44..........',
          ],
      PINK,
    );
  }
  function plus() {
    return art(
      'plus',
      ['...55...', '...55...', '...55...', '55555555', '55555555', '...55...', '...55...', '...55...'],
      HEAL,
    );
  }
  function spirit() {
    return art(
      'spirit',
      [
        '.....44.....',
        '....4554....',
        '...455554...',
        '..45555554..',
        '.4553553554.',
        '.4552552554.',
        '..45555554..',
        '444455554444',
        '.3445555443.',
        '..34555443..',
        '...345543...',
        '....3443....',
        '...344......',
        '..44........',
      ],
      HEAL,
    );
  }
  function coin(frame) {
    const rx = [7, 5, 2, 5][frame];
    return k.sprite('b47:coin:' + frame, 19, 23, GOLD, set => {
      for (let y = 2; y <= 20; y++)
        for (let x = 1; x <= 17; x++) {
          const d = ((x - 9) / rx) ** 2 + ((y - 11) / 9) ** 2;
          if (d > 1) continue;
          const star = Math.abs(x - 9) + Math.abs(y - 11) < 4 || (Math.abs(x - 9) < 1 && Math.abs(y - 11) < 6);
          set(x, y, d > 0.7 ? (x < 9 ? 5 : 2) : star && rx > 2 ? 5 : x < 9 ? 4 : 3);
        }
    });
  }
  function warning() {
    return art(
      'warning',
      [
        '......55......',
        '.....5445.....',
        '.....5335.....',
        '....533335....',
        '...53355335...',
        '...53355335...',
        '..5333553335..',
        '.533335533335.',
        '.533333333335.',
        '53333355333335',
        '55555555555555',
      ],
      WARN,
    );
  }
  function familiar(type, flap) {
    const rows =
      type === 'owl'
        ? [
            '.4.....4.',
            '.5444445.',
            '.4555554.',
            '453545354',
            '455535554',
            '.4533354.',
            '.4533354.',
            '..45554..',
            '...4.4...',
          ]
        : type === 'cat'
          ? [
              '.4....4...',
              '.54..45...',
              '.455554...',
              '.453534...',
              '..4554....',
              '..4554..4.',
              '.455554.54',
              '.455554454',
              '.45555444.',
              '..44.44...',
            ]
          : flap
            ? [
                '4..........4',
                '54..4..4..45',
                '554.5445.455',
                '.5545555455.',
                '..45533554..',
                '...455554...',
                '....4554....',
                '.....44.....',
              ]
            : [
                '....4..4....',
                '44..5445..44',
                '455455554554',
                '.4555335554.',
                '..44555544..',
                '..4.4554.4..',
                '.4...44...4.',
              ];
    return art('familiar:' + type + ':' + flap, rows, GHOST);
  }
  function blade(shadow, frame, settle = 0) {
    const ramp = shadow ? SHADOW : FIRE;
    return k.sprite('b47:blade:' + shadow + ':' + frame + ':' + settle, 17, 29, ramp, paint => {
      const set = (x, y, color) => {
        if (!settle || k.dith(x, y) < 1 - settle / 4) paint(x, y, color);
      };
      for (let y = 2; y < 22; y++) {
        const cx = shadow ? 8 : 7 + Math.floor((21 - y) ** 2 / 65);
        const w = y < 5 ? 1 : shadow ? 2 : y < 15 ? 3 : 2;
        for (let x = cx - w; x <= cx + w; x++) {
          const edge = x === cx + w;
          set(x, y, shadow ? (edge ? 5 : x === cx - w ? 3 : 1) : Math.abs(x - cx) < 1 ? 5 : edge ? 4 : 3);
        }
      }
      for (let x = 3; x <= 12; x++) set(x, 22, 4);
      for (let y = 23; y <= 26; y++) {
        set(7, y, 2);
        set(8, y, 4);
      }
      set(7, 27, 4);
      set(8, 27, 4);
      if (!shadow) {
        for (let j = 0; j < 4; j++) {
          const y = 5 + j * 4,
            x = 6 + Math.floor((21 - y) ** 2 / 65);
          for (let n = 0; n < 3 + ((frame + j) % 3); n++) set(x - 2 - n, y - n, n > 2 ? 4 : 3);
        }
      }
    });
  }
  function spiritPosition(s) {
    const p = center(s);
    return { x: p.x, y: p.y - 12 + Math.sin(s.c.raw / 470) * 2 };
  }
  function spiritFloor(s, alpha) {
    const p = center(s);
    const img = k.sprite('b47:spirit-floor', 25, 13, HEAL, set => {
      for (let y = 1; y < 12; y++)
        for (let x = 1; x < 24; x++) {
          const d = Math.hypot((x - 12) / 10, (y - 6) / 4);
          if (d > 0.7 && d < 1) set(x, y, 3);
        }
    });
    stamp(img, p, alpha);
  }
  function bladeAir(s, shadow) {
    const t = s.c.t - k.CAST;
    if (t < 0 || !s.pose.hand) return;
    const ramp = shadow ? SHADOW : FIRE,
      h = k.P(s.pose.hand),
      frame = Math.floor(s.c.raw / 90) % 3;
    const angle = -0.45 + (t < 180 ? (1 - k.ease(t / 180)) * 1.4 : Math.sin(s.c.raw / 180) * 0.06);
    if (t < 250) {
      for (let i = 0; i < 5; i++) {
        const a = angle - Math.PI / 2 - (1 - i / 5) * 0.9;
        const p = { x: h.x + Math.cos(a) * (12 + i), y: h.y + Math.sin(a) * (12 + i) };
        ball(p.x, p.y, 2, ramp, i % 2 ? 4 : 3);
      }
    }
    // The grip is the rotation anchor, so the whole 20 px blade grows from the hand.
    const img = blade(shadow, frame, t < 1000 ? 0 : Math.min(3, 1 + Math.floor((t - 1000) / 85)));
    if (t < 1250) k.blitRotated(img, h.x, h.y, angle, 8 / 17, 25 / 29);
    if (t >= 160 && t < 1150) {
      for (let i = 0; i < 5; i++) {
        const u = (s.c.raw / (shadow ? 700 : 380) + i / 5) % 1;
        const p = { x: h.x + 4 + (i % 2) * 3 + Math.sin(u * 5 + i) * 2, y: h.y - 3 - u * 24 };
        if (shadow) stroke([p, { x: p.x + 3, y: p.y - 4 }], ramp, 3, 2);
        else ball(p.x, p.y, 1, ramp, u > 0.6 ? 3 : 4);
      }
    }
    impact(s, h, ramp, 24, 7);
  }

  // Blur: three full-height icy dithered doubles shear sideways around a held shimmer contour.
  FX.register('blur', {
    palette: BLUE,
    travel: 190,
    beats,
    end: () => 1630,
    ground(s) {
      if (s.c.t < 490) return;
      ring(feet(subject(s)), 11, 4, BLUE, 8, s.c.raw / 160);
    },
    air(s) {
      const t = s.c.t - k.CAST,
        target = subject(s);
      if (t < 0 || !target) return;
      const p = k.P(target);
      delivery(s, p, BLUE, 490);
      if (t < 120) return;
      const spread = 3 + k.ease(k.clamp((t - 120) / 160)) * 7;
      for (let i = -1; i <= 1; i++) {
        const x = p.x + i * spread + Math.round(Math.sin(s.c.raw / 115 + i * 2) * 3);
        const phase = Math.floor(s.c.raw / 120) % 4;
        stamp(figure('blur:' + phase, phase, 0.42), { x, y: p.y }, t > 1020 ? 0.5 : 0.75);
      }
      stamp(figure('blur-rim', 0, 1, true), p, t > 1130 ? 0.25 : 0.75);
      impact(s, { x: p.x, y: p.y + 5 }, BLUE, 20, 5);
    },
  });

  // Crown of Madness: a wide purple-and-gold thorn crown locks onto the head between mad spirals.
  FX.register('crown-of-madness', {
    palette: MAD,
    travel: 260,
    beats,
    end: () => 1680,
    air(s) {
      const t = s.c.t - k.CAST,
        target = subject(s);
      if (t < 0 || !target) return;
      const p = head(target);
      delivery(s, p, MAD, 560);
      if (t < 150) return;
      const drop = t < 260 ? (1 - k.ease((t - 150) / 110)) * 9 : 0;
      const alpha = t > 1100 ? 0.5 : 1;
      stamp(crown(), { x: p.x, y: p.y - 2 - drop }, alpha);
      if (t > 260 && t < 1090)
        for (let i = 0; i < 2; i++) {
          spiral({ x: p.x + (i ? 15 : -15), y: p.y + 7 }, s.c.raw / 170 + i * Math.PI, MAD, 5);
        }
      impact(s, { x: p.x, y: p.y + 5 }, MAD, 23, 7);
    },
  });

  // Detect Thoughts: a luminous pink brain sends a broad psychic ripple into squiggled thought bubbles.
  FX.register('detect-thoughts', {
    palette: PINK,
    travel: 500,
    beats,
    end: () => 1810,
    air(s) {
      const t = s.c.t - k.CAST,
        caster = self(s),
        target = subject(s);
      if (t < 0 || !caster || !target) return;
      const h = head(caster),
        p = head(target);
      if (t < 1050) stamp(brain(), { x: h.x, y: h.y - 3 }, t > 900 ? 0.5 : 1);
      if (t >= 140 && t < 590) {
        const q = k.clamp((t - 140) / 360),
          a = { x: k.mix(h.x, p.x, q), y: k.mix(h.y, p.y, q) };
        const angle = Math.atan2(p.y - h.y, p.x - h.x);
        for (let i = 0; i < 3; i++) {
          const x = a.x - Math.cos(angle) * i * 5,
            y = a.y - Math.sin(angle) * i * 5;
          stroke(
            [
              { x: x - Math.sin(angle) * 8, y: y + Math.cos(angle) * 8 },
              { x: x + Math.cos(angle) * 3, y: y + Math.sin(angle) * 3 },
              { x: x + Math.sin(angle) * 8, y: y - Math.cos(angle) * 8 },
            ],
            PINK,
            i ? 3 : 5,
          );
        }
      }
      impact(s, { x: p.x, y: p.y + 5 }, PINK, 20, 5);
      if (t >= 500) {
        stamp(bubble(false), { x: p.x, y: p.y - 4 - Math.sin(s.c.raw / 230) }, t > 1250 ? 0.5 : 1);
        if (t > 670 && t < 1220) stamp(bubble(false), { x: p.x + 17, y: p.y - 13 }, 0.75);
      }
    },
  });

  // Find Traps: a gold radar fan scans the floor and stamps large red-orange warning triangles in range.
  FX.register('find-traps', {
    palette: GOLD,
    travel: 400,
    beats: casterBeat,
    end: () => 1740,
    ground(s) {
      const t = s.c.t - k.CAST,
        caster = self(s);
      if (t < 0 || t > 1090 || !caster) return;
      const p = feet(caster),
        radius = s.area?.feet ? (s.area.feet / (s.grid.feet || 5)) * 16 : 38;
      const r = Math.min(radius, 54) * k.ease(k.clamp(t / 500));
      if (t < 640) {
        const radius = Math.max(5, Math.round(r)),
          dashed = t > 470;
        const img = k.sprite('b47:radar:' + radius + ':' + dashed, radius * 2 + 7, radius + 9, GOLD, set => {
          for (let y = 1; y < radius + 8; y++)
            for (let x = 1; x < radius * 2 + 6; x++) {
              const dx = x - radius - 3,
                dy = (y - (radius + 8) / 2) / 0.52;
              if (Math.abs(Math.hypot(dx, dy) - radius) > 1.3) continue;
              if (dashed && Math.floor(((Math.atan2(dy, dx) + Math.PI) / k.tau) * 20) % 2) continue;
              set(x, y, 4);
            }
        });
        stamp(img, p);
      }
      if (t < 820) {
        const a = t / 170;
        for (let i = 0; i < 3; i++)
          stroke(
            [p, { x: p.x + Math.cos(a - i * 0.14) * r, y: p.y + Math.sin(a - i * 0.14) * r * 0.52 }],
            GOLD,
            i ? 2 : 4,
          );
      }
    },
    air(s) {
      const t = s.c.t - k.CAST,
        caster = self(s);
      if (t < 0 || !caster) return;
      const p = feet(caster),
        radius = Math.min(48, s.area?.feet ? (s.area.feet / (s.grid.feet || 5)) * 16 : 38);
      for (let i = 0; i < 3; i++) {
        const appear = 260 + i * 90;
        if (t < appear) continue;
        const a = [-0.45, 2.8, 1.1][i] + (k.hash(i, s.event.seed || 0) - 0.5) * 0.2;
        const q = { x: p.x + Math.cos(a) * radius * 0.78, y: p.y + Math.sin(a) * radius * 0.5 - 8 };
        const pop = k.clamp((t - appear) / 130);
        stamp(warning(), { x: q.x, y: q.y - Math.sin(pop * Math.PI) * 3 }, t > 1110 ? 0.5 : 1);
      }
      impact(s, { x: p.x, y: p.y - 8 }, GOLD, 22, 6);
    },
  });

  // Healing Spirit: a green-white wisp with eyes and tiny arms floats over its cube, offering healing crosses.
  FX.register('healing-spirit', {
    palette: HEAL,
    travel: 260,
    beats,
    end: () => 1550,
    ground(s) {
      if (s.c.t >= 560 && !s.pose.linger) spiritFloor(s, 0.75);
    },
    air(s) {
      const t = s.c.t - k.CAST;
      if (t < 0) return;
      const p = spiritPosition(s);
      delivery(s, p, HEAL, 560);
      if (t < 260) return;
      if (!s.pose.linger) stamp(spirit(), p, t > 1000 ? 0.5 : 1);
      impact(s, { x: p.x, y: p.y + 7 }, HEAL, 25, 7);
      const target = subject(s);
      if (!target) return;
      const to = k.P(target);
      for (let i = 0; i < 5; i++) {
        const q = k.clamp((t - 320 - i * 50) / 390);
        if (q <= 0 || q >= 1) continue;
        ball(k.mix(p.x, to.x, q), k.mix(p.y, to.y, q) - Math.sin(q * Math.PI) * 7, 2, HEAL, i % 2 ? 4 : 3);
      }
      if (t >= 650) stamp(plus(), { x: to.x, y: to.y - 4 - k.clamp((t - 650) / 500) * 9 }, t > 1000 ? 0.5 : 1);
    },
    linger(s) {
      spiritFloor(s, s.linger * 0.6);
    },
    lingerAir(s) {
      const p = spiritPosition(s);
      stamp(spirit(), p, s.linger);
      const q = (s.c.raw / 2400) % 1;
      stamp(plus(), { x: p.x + 8, y: p.y + 7 - q * 13 }, s.linger * (q < 0.75 ? 0.75 : 0.25));
      const mote = k.sprite('b47:healing-mote', 5, 5, HEAL, set => {
        set(2, 1, 4);
        set(1, 2, 4);
        set(2, 2, 5);
        set(3, 2, 4);
        set(2, 3, 4);
      });
      for (let i = 0; i < 3; i++) {
        const a = s.c.raw / 1600 + (i * k.tau) / 3;
        stamp(mote, { x: p.x + Math.cos(a) * 10, y: p.y + 6 + Math.sin(a) * 4 }, s.linger * 0.75);
      }
    },
  });

  // Fortune's Favor: a broad gold coin flips above the head, catches a star, then showers the figure in gold.
  FX.register('fortunes-favor', {
    palette: GOLD,
    travel: 350,
    beats,
    end: () => 1700,
    air(s) {
      const t = s.c.t - k.CAST,
        target = subject(s);
      if (t < 0 || !target) return;
      const h = head(target),
        p = { x: h.x, y: h.y - 5 };
      delivery(s, p, GOLD, 650);
      if (t > 100 && t < 1040) {
        const frame = t < 350 ? Math.floor(t / 65) % 4 : t < 700 ? 0 : Math.floor(t / 80) % 4;
        stamp(coin(frame), { x: p.x, y: p.y - Math.sin(k.clamp((t - 100) / 250) * Math.PI) * 8 }, t > 900 ? 0.5 : 1);
      }
      impact(s, p, GOLD, 28, 9);
      if (t >= 350 && t < 780) spark({ x: p.x + 10, y: p.y - 8 }, GOLD, 5);
      if (t >= 480)
        for (let i = 0; i < 10; i++) {
          const q = (t - 480 - i * 40) / 520;
          if (q < 0 || q > 1) continue;
          const x = h.x + (k.hash(i, s.event.seed || 0) - 0.5) * 24;
          const y = p.y + q * 32;
          if (i % 3 === 0) spark({ x, y }, GOLD, 2);
          else ball(x, y, 1, GOLD, 4);
        }
    },
  });

  // Melf's Acid Arrow: an oversized lime arrow punches into a radial splash, falling globs and sizzling bubbles.
  FX.register('melfs-acid-arrow', {
    palette: ACID,
    travel: 350,
    beats: (event, kit, travel) => [
      { at: kit.CAST + travel, stop: 145, target: event.targets?.[0] ?? null, kind: 'hit', power: 0.075 },
    ],
    end: () => 1600,
    air(s) {
      const t = s.c.t - k.CAST,
        target = subject(s);
      if (t < 0 || !s.pose.hand || !target) return;
      const h = k.P(s.pose.hand),
        p = k.P(k.contact(target, s.pose.hand));
      if (t < 350) {
        const q = t / 350,
          a = Math.atan2(p.y - h.y, p.x - h.x);
        for (let i = 7; i >= 1; i--) {
          const u = q - i * 0.035;
          if (u >= 0) ball(k.mix(h.x, p.x, u), k.mix(h.y, p.y, u), i < 4 ? 2 : 1, ACID, i < 3 ? 4 : 3);
        }
        const img = art(
          'acid-arrow',
          [
            '............4.....',
            '...........454....',
            '.44.......45554...',
            '..45444444555554..',
            '..455555555555554.',
            '..45444444555554..',
            '.44.......45554...',
            '...........454....',
            '............4.....',
          ],
          ACID,
        );
        k.blitRotated(img, k.mix(h.x, p.x, q), k.mix(h.y, p.y, q), a, 0.75);
      }
      if (t < 350) return;
      const e = s.real(s.hits[0]);
      impact(s, p, ACID, 39, 12);
      if (e < 480) {
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * k.tau,
            u = k.clamp(e / 360),
            r = 4 + k.ease(u) * (10 + k.hash(i, s.event.seed || 0) * 5);
          const q = { x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r * 0.65 + u * u * 10 };
          if (e < 210) stroke([p, q], ACID, i % 2 ? 3 : 4, 3);
          ball(q.x, q.y, u < 0.6 ? 3 : 2, ACID, i % 2 ? 3 : 4);
          if (e > 140) stroke([q, { x: q.x, y: q.y + 3 + u * 4 }], ACID, 3, 2);
        }
      }
      if (e >= 180)
        for (let i = 0; i < 5; i++) {
          const x = p.x + (k.hash(i, s.event.seed || 0, 2) - 0.5) * 14;
          const y = p.y + 3 + (i % 3) * 3;
          ball(x, y, 2, ACID, 3);
          const q = (e / 430 + i / 5) % 1;
          if (e < 850) {
            k.ellipse(x, y - 3 - q * 7, 2, 2, ACID[0], 3);
            k.ellipse(x, y - 3 - q * 7, 2, 2, ACID[4], 1);
          }
        }
      if (e > 100 && e < 630)
        for (let i = 0; i < 3; i++) {
          const x = p.x - 7 + i * 7,
            y = p.y - 5 - (e - 100) / 65;
          stroke(
            [
              { x, y },
              { x: x + 2, y: y - 3 },
              { x, y: y - 6 },
            ],
            ACID,
            4,
            2,
          );
        }
    },
  });

  // Flock of Familiars: a pale owl, cat and bat spring from a lavender smoke ring and circle the caster.
  FX.register('flock-of-familiars', {
    palette: GHOST,
    travel: 250,
    beats: casterBeat,
    end: () => 1780,
    ground(s) {
      const t = s.c.t - k.CAST,
        caster = self(s);
      if (t < 80 || t > 980 || !caster) return;
      const p = feet(caster);
      ring(p, 11 + k.clamp(t / 250) * 5, 6, GHOST, t > 450 ? 8 : 0, s.c.raw / 350);
    },
    air(s) {
      const t = s.c.t - k.CAST,
        caster = self(s);
      if (t < 0 || !caster) return;
      const p = k.P(caster);
      if (t < 560)
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * k.tau,
            r = 5 + k.ease(k.clamp(t / 350)) * 10;
          ball(p.x + Math.cos(a) * r, p.y + 5 + Math.sin(a) * r * 0.5 - t / 90, t < 300 ? 4 : 3, GHOST, i % 2 ? 3 : 2);
        }
      impact(s, p, GHOST, 28, 8);
      if (t < 200) return;
      const spread = k.ease(k.clamp((t - 200) / 180));
      ['owl', 'cat', 'bat'].forEach((type, i) => {
        const a = [-2.4, 1.3, -0.45][i] + Math.max(0, t - 380) / 1500;
        const x = p.x + Math.cos(a) * 19 * spread;
        const y = p.y - 3 + Math.sin(a) * 12 * spread + Math.sin(s.c.raw / 130 + i) * (type === 'cat' ? 1 : 2);
        stamp(familiar(type, Math.floor(s.c.raw / 120) % 2), { x, y }, t > 1200 ? 0.5 : 1);
      });
    },
  });

  // Gift of Gab: an oversized luminous speech balloon spills sparks, then leaves a glowing speaking mouth.
  FX.register('gift-of-gab', {
    palette: PINK,
    travel: 210,
    beats: casterBeat,
    end: () => 1560,
    air(s) {
      const t = s.c.t - k.CAST,
        caster = self(s);
      if (t < 0 || !caster) return;
      const h = head(caster),
        p = { x: h.x, y: h.y - 3 };
      if (t >= 90 && t < 840)
        stamp(
          bubble(true),
          { x: p.x, y: p.y - (t < 210 ? Math.sin(((t - 90) / 120) * Math.PI) * 3 : 0) },
          t > 710 ? 0.5 : 1,
        );
      impact(s, { x: p.x, y: p.y + 4 }, PINK, 25, 9);
      if (t >= 210 && t < 820)
        for (let i = 0; i < 6; i++) {
          const q = k.clamp((t - 210 - i * 25) / 460),
            a = k.hash(i, s.event.seed || 0) * k.tau;
          if (q <= 0 || q >= 1) continue;
          spark({ x: p.x + Math.cos(a) * (10 + q * 13), y: p.y + Math.sin(a) * (7 + q * 9) }, PINK, 2);
        }
      if (t >= 720) {
        const mouth = art(
          'mouth',
          ['..33333333..', '.3444444443.', '345555555543', '.3111111113.', '..34444443..', '...333333...'],
          PINK,
        );
        stamp(mouth, { x: h.x, y: h.y + 5 }, t > 1040 ? 0.5 : 1);
        if (t < 1060)
          stroke(
            [
              { x: h.x + 9, y: h.y + 2 },
              { x: h.x + 12, y: h.y + 5 },
              { x: h.x + 9, y: h.y + 8 },
            ],
            PINK,
            4,
          );
      }
    },
  });

  // Flame Blade: a broad, curved yellow-white scimitar whooshes out of the hand with orange flame tongues.
  FX.register('flame-blade', {
    palette: FIRE,
    travel: 180,
    beats: casterBeat,
    end: () => 1550,
    air(s) {
      bladeAir(s, false);
    },
  });

  // Shadow Blade: a full-length solid violet sword forms with a white-violet cutting edge and trailing wisps.
  FX.register('shadow-blade', {
    palette: SHADOW,
    travel: 180,
    beats: casterBeat,
    end: () => 1550,
    air(s) {
      bladeAir(s, true);
    },
  });

  // Invisibility: a rising shimmer combs the body into a pale dithered silhouette, then a sparse wavering rim.
  FX.register('invisibility', {
    palette: BLUE,
    travel: 380,
    beats,
    end: () => 1660,
    air(s) {
      const t = s.c.t - k.CAST,
        target = subject(s);
      if (t < 0 || !target) return;
      const p = k.P(target),
        q = k.clamp(t / 430),
        phase = Math.floor(s.c.raw / 100) % 4;
      if (t < 500) {
        const y = p.y + 12 - q * 25;
        ring({ x: p.x, y }, 10, 3, BLUE);
        const sweepFrame = Math.floor(q * 25);
        const img = k.sprite('b47:vanish-sweep:' + sweepFrame, 21, 29, BLUE, set => {
          const limit = 26 - sweepFrame;
          for (let yy = Math.max(1, limit); yy < 27; yy++)
            for (let x = 2; x < 19; x++) {
              const width = yy < 9 ? 4 : yy < 21 ? 7 : 5;
              if (Math.abs(x - 10) <= width && k.dith(x, yy) < 0.66) set(x, yy, yy < limit + 3 ? 5 : 3);
            }
        });
        stamp(img, p, 0.75);
      }
      if (t > 220 && t < 780) {
        stamp(figure('invisible:' + phase + ':' + (t < 500), phase, t < 500 ? 0.65 : 0.25), p, t < 500 ? 1 : 0.5);
      }
      if (t >= 500) {
        const density = t < 820 ? 0.65 : 0.2;
        const img = figure('vanish-rim:' + phase + ':' + (t < 820), phase, density, true);
        stamp(img, { x: p.x + Math.round(Math.sin(s.c.raw / 160)), y: p.y }, t > 1060 ? 0.25 : 0.5);
      }
      impact(s, { x: p.x, y: p.y - 5 }, BLUE, 23, 7);
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
