/* Pixel spells, batch 49: large, outlined utility silhouettes. */
(function (root) {
  'use strict';
  const FX = root.BoardPixelFX;
  if (!FX) return;
  const k = FX.kit;
  const GREEN = ['#10251e', '#19553a', '#36a667', '#79efa1', '#d8ffe1', '#ffffff'];
  const GOLD = ['#302336', '#71533b', '#bc965a', '#f5d480', '#fff2c7', '#ffffff'];
  const PINK = ['#321d42', '#704080', '#b365c5', '#efa6e6', '#ffe1f4', '#ffffff'];
  const WEB = ['#182336', '#405270', '#789cae', '#b2e4eb', '#e4fcff', '#ffffff'];
  const WIND = ['#142e39', '#386675', '#72aeb7', '#b0e9eb', '#e4ffff', '#ffffff'];
  const SILVER = ['#22283d', '#515774', '#979db8', '#cddbec', '#effaff', '#ffffff'];
  const VIOLET = ['#21183f', '#49348b', '#7961e5', '#abacff', '#ddedff', '#ffffff'];
  const BONE = ['#20252b', '#586252', '#a2ae87', '#dbdfb7', '#fff6db', '#ffffff'];
  const LEAF = ['#252d25', '#655139', '#9b835a', '#adc675', '#e3e9ac', '#fff5d2'];

  function target(s) {
    return s.targets[0] || s.pose.target || s.pose.base || { x: 0, y: 0 };
  }
  function body(s) {
    return k.P(target(s));
  }
  function feet(s) {
    const t = target(s);
    return k.P({ x: t.baseX ?? t.x, y: t.baseY ?? t.y + 0.62 });
  }
  function caster(s) {
    const b = s.pose.base || s.pose.hand || target(s);
    return k.P({ x: b.x, y: b.y - 0.62 });
  }
  function soft(event, kit, travel) {
    return [{ at: kit.CAST + travel, stop: 80, target: event.targets?.[0] ?? null, kind: 'soft', power: 0.03 }];
  }
  const finish = (event, travel) => k.CAST + travel + 650;
  function age(s) {
    return s.c.t - s.hits[0].at;
  }
  // Structural strokes have a two-pixel colour core and an extra pixel on each side.
  function stroke(a, b, pal, width = 2, index = 4) {
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 1.5));
    for (const [color, size] of [
      [pal[0], width + 2],
      [pal[index], width],
    ])
      for (let i = 0; i <= n; i++) {
        const u = i / n;
        k.dot(k.mix(a.x, b.x, u), k.mix(a.y, b.y, u), color, size);
      }
  }
  function ring(p, rx, ry, pal, width = 2, index = 4) {
    k.ellipse(p.x, p.y, rx, ry, pal[0], width + 2);
    k.ellipse(p.x, p.y, rx, ry, pal[index], width);
  }
  function bead(p, pal, size = 3, index = 4) {
    k.dot(p.x, p.y, pal[0], size + 2);
    k.dot(p.x, p.y, pal[index], size);
  }
  function stamp(name, rows, pal) {
    return k.sprite('b49:' + name, rows[0].length + 2, rows.length + 2, pal, set => {
      rows.forEach((row, y) =>
        [...row].forEach((ch, x) => {
          if (ch !== '.') set(x + 1, y + 1, Number(ch));
        }),
      );
    });
  }
  function icon(name, rows, pal, p, alpha = 1) {
    const img = stamp(name, rows, pal);
    k.blit(img, p.x - img.width / 2, p.y - img.height / 2, alpha);
  }
  const EYE = [
    '......4444......',
    '....44555544....',
    '..445544445544..',
    '.44544....44544.',
    '4454..3333..4544',
    '454..335533..454',
    '454..335533..454',
    '4454..3333..4544',
    '.44544....44544.',
    '..445544445544..',
    '....44555544....',
    '......4444......',
  ];
  const PLUS = [
    '...444...',
    '...454...',
    '...454...',
    '444555444',
    '455555554',
    '444555444',
    '...454...',
    '...454...',
    '...444...',
  ];
  const SHIELD = [
    '444444444',
    '455555554',
    '453333354',
    '453444354',
    '453454354',
    '.4345434.',
    '.4344434.',
    '..43334..',
    '...444...',
  ];
  const SKULL = [
    '..33333..',
    '.3444443.',
    '344444443',
    '341141143',
    '341141143',
    '.4444444.',
    '..44144..',
    '..43434..',
    '..34343..',
  ];
  const FIGURE = [
    '...44...',
    '..4554..',
    '..4444..',
    '...33...',
    '.344443.',
    '44344344',
    '4.3443.4',
    '..3443..',
    '..4334..',
    '..4..4..',
    '.44..44.',
  ];
  const SKELETON = [
    '...4444...',
    '..455554..',
    '..411114..',
    '..414414..',
    '...4444...',
    '....44....',
    '.44444444.',
    '44.4444.44',
    '4..4444..4',
    '4...44...4',
    '....44....',
    '...4444...',
    '...4..4...',
    '..44..44..',
  ];
  const HAND = ['.4.4.4...', '.4.4.4.4.', '.4.4.4.4.', '.4444444.', '..44444..', '..34443..', '...444...', '...34....'];
  const BUBBLE = [
    '..44444444444..',
    '.4555555555554.',
    '455333333335554',
    '453334443333554',
    '453344544333554',
    '453335543333554',
    '453334433333554',
    '.4555555555554.',
    '..44444444444..',
    '....44.........',
    '...44..........',
  ];
  function impact(s, p, pal, name, hit = s.hits[0], size = 20) {
    const e = s.real(hit);
    k.drawHit(k.hitStyle('b49:' + name, pal, { S: size, spikes: 4, jag: 0.12, void: true }), p, e);
    k.shards(p, e, pal, (s.event.seed || 0) + name.length, 6, 13);
  }
  function delivery(s, p, pal) {
    if (!s.pose.hand || s.c.t < k.CAST || age(s) >= 0) return;
    const h = k.P(s.pose.hand),
      q = k.clamp((s.c.t - k.CAST) / (s.hits[0].at - k.CAST));
    for (let j = 3; j >= 0; j--) {
      const u = Math.max(0, q - j * 0.08);
      bead({ x: k.mix(h.x, p.x, u), y: k.mix(h.y, p.y, u) - Math.sin(u * Math.PI) * 5 }, pal, j ? 2 : 4);
    }
  }
  function arc(p, rx, ry, start, length, pal, width = 2, index = 4) {
    const n = Math.max(8, Math.ceil((Math.abs(length) * Math.max(rx, ry)) / 1.7));
    for (const [color, size] of [
      [pal[0], width + 2],
      [pal[index], width],
    ])
      for (let i = 0; i <= n; i++) {
        const a = start + (length * i) / n;
        k.dot(p.x + Math.cos(a) * rx, p.y + Math.sin(a) * ry, color, size);
      }
  }
  function openEye(s, p, pal, name, e) {
    if (e < 0) return;
    if (e < 90) {
      arc(p, 8, 1 + e / 18, 0, k.tau, pal);
    } else if (e < 470) icon(name, EYE, pal, p);
    else stroke({ x: p.x - 5, y: p.y }, { x: p.x + 5, y: p.y }, pal);
  }

  // Beast Sense: a square-wide golden animal eye opens on the beast and answers an eye across a bright link.
  FX.register('beast-sense', {
    palette: GOLD,
    travel: 180,
    beats: soft,
    end: finish,
    air(s) {
      const p = body(s),
        h = caster(s),
        e = age(s);
      delivery(s, p, GOLD);
      if (e < 0) return;
      const a = { x: h.x, y: h.y - 6 },
        b = { x: p.x, y: p.y - 6 };
      if (e < 480) {
        stroke(a, b, GOLD, 2, 3);
        const q = (s.c.t / 290) % 1;
        bead({ x: k.mix(a.x, b.x, q), y: k.mix(a.y, b.y, q) }, GOLD, 3, 5);
      }
      impact(s, p, GOLD, 'beast-eye');
      openEye(s, b, GOLD, 'beast-eye', e);
      openEye(s, a, GOLD, 'beast-eye', e);
      // A vertical slit makes these the eyes of a beast rather than a generic vision rune.
      if (e >= 90 && e < 470)
        for (const c of [a, b]) stroke({ x: c.x, y: c.y - 3 }, { x: c.x, y: c.y + 3 }, GOLD, 2, 1);
    },
  });

  // Suggestion: a pink-violet whisper coils round the head beneath a large rune-filled speech bubble.
  FX.register('suggestion', {
    palette: PINK,
    travel: 210,
    beats: soft,
    end: finish,
    air(s) {
      const p = body(s),
        e = age(s);
      delivery(s, p, PINK);
      if (e < 0) return;
      impact(s, p, PINK, 'whisper');
      if (e < 480) {
        arc({ x: p.x, y: p.y - 4 }, 9, 5, s.c.t / 180, Math.PI * 1.65, PINK);
        arc({ x: p.x, y: p.y - 3 }, 6, 3, -s.c.t / 200, Math.PI * 1.4, PINK, 2, 3);
        icon('whisper-bubble', BUBBLE, PINK, { x: p.x, y: p.y - 14 - (e < 130 ? (e / 130) * 2 : 2) });
      }
      stroke({ x: p.x - 3, y: p.y - 5 }, { x: p.x + 2, y: p.y - 5 }, PINK, 2, 5);
    },
  });

  // Spider Climb: broad luminous webs catch feet and hands, then eight bent spider legs grip the figure.
  FX.register('spider-climb', {
    palette: WEB,
    travel: 180,
    beats: soft,
    end: finish,
    ground(s) {
      const e = age(s);
      if (e < -90) return;
      const f = feet(s);
      const img = k.sprite('b49:floor-web', 25, 15, WEB, set => {
        for (let y = 1; y < 14; y++)
          for (let x = 1; x < 24; x++) {
            const dx = x - 12,
              dy = (y - 7) * 1.8,
              r = Math.hypot(dx, dy),
              a = Math.atan2(dy, dx);
            if (r <= 11 && (Math.abs(Math.sin(a * 4)) * r < 0.9 || Math.abs(r - 5) < 1 || Math.abs(r - 10) < 1))
              set(x, y, r < 6 ? 5 : 3);
          }
      });
      k.blit(img, f.x - 12, f.y - 7, e < 450 ? 1 : 0.5);
    },
    air(s) {
      const p = body(s),
        e = age(s);
      delivery(s, p, WEB);
      if (e < 0) return;
      impact(s, p, WEB, 'web-grip');
      if (e < 460)
        for (const side of [-1, 1]) {
          for (let i = 0; i < 4; i++) {
            const a = { x: p.x + side * 3, y: p.y - 4 + i * 3 };
            const b = { x: p.x + side * 8, y: p.y - 7 + i * 4 };
            stroke(a, b, WEB);
            stroke(b, { x: b.x + side * 2, y: b.y + 4 }, WEB, 2, 3);
          }
        }
      for (const side of [-1, 1]) {
        const h = { x: p.x + side * 5, y: p.y };
        stroke(h, { x: p.x + side * 3, y: p.y + 8 }, WEB, 2, 4);
        bead(h, WEB, 3, 5);
      }
    },
  });

  // Protection From Poison: a full green-white ward bubble crushes a poison skull into outlined fragments.
  FX.register('protection-from-poison', {
    palette: GREEN,
    travel: 190,
    beats: soft,
    end: finish,
    ground(s) {
      if (age(s) >= 0) ring(feet(s), 10, 4, GREEN);
    },
    air(s) {
      const p = body(s),
        e = age(s);
      delivery(s, p, GREEN);
      if (e < 0) return;
      ring(p, e < 100 ? 8 + e / 50 : 10, 12, GREEN, 2, e < 470 ? 4 : 3);
      arc(p, 8, 10, Math.PI, Math.PI * 0.65, GREEN, 2, 5);
      const real = s.real(s.hits[0]);
      if (real < 160) icon('poison-skull', SKULL, GREEN, p);
      // The skull hangs intact, then breaks on real time even when the ward's beat is frozen.
      if (real >= 160) {
        impact(s, p, GREEN, 'skull-break', { ...s.hits[0], freeze: { raw: s.hits[0].freeze.raw + 160 } });
        if (real < 390)
          for (let i = 0; i < 5; i++) {
            const u = (real - 160) / 230;
            bead({ x: p.x + (i - 2) * (2 + u * 4), y: p.y - u * 6 + (i % 2) * 3 }, GREEN, 2, 2);
          }
      }
      if (e > 320) icon('poison-ward', PLUS, GREEN, { x: p.x, y: p.y - 8 }, 0.75);
    },
  });

  function windWall(s, alpha, casting) {
    const area = s.area;
    const center = area || s.pose.base || target(s),
      p = k.P(center);
    const r = Math.max(8, Math.round(((area?.feet ?? 10) / (s.grid.feet || 5)) * 16));
    const frame = Math.floor(s.c.raw / (casting ? 80 : 210)) % 12;
    const w = r * 2 + 16,
      h = r * 2 + 18;
    const img = k.sprite('b49:wind:' + r + ':' + frame, w, h, WIND, set => {
      const cx = w / 2,
        cy = h / 2 + 3;
      // Four broad curling ribbons. Gaps leave the middle and the figures readable.
      for (let j = 0; j < 4; j++) {
        const start = (j * Math.PI) / 2 + (frame * k.tau) / 12;
        for (let i = 0; i < 33; i++) {
          const q = i / 32,
            a = start + q * 1.0,
            rr = r - 1 + Math.sin(q * Math.PI) * 3;
          const x = cx + Math.cos(a) * rr,
            y = cy + Math.sin(a) * rr - Math.sin(q * Math.PI) * 5;
          const size = q < 0.7 ? 3 : 2;
          for (let dy = -size; dy <= size; dy++)
            for (let dx = -size; dx <= size; dx++)
              if (dx * dx + dy * dy <= size * size) set(x + dx, y + dy, dy < 0 ? 5 : dy === 0 ? 4 : 3);
        }
        const a = start + 1,
          x = cx + Math.cos(a) * r,
          y = cy + Math.sin(a) * r;
        // Tight hooked tip at the end of each ribbon.
        for (let n = 0; n < 14; n++) {
          const b = (n / 13) * Math.PI * 1.5;
          const xx = x + Math.cos(b) * 3,
            yy = y - 3 + Math.sin(b) * 3;
          set(xx, yy, 4);
          set(xx + 1, yy, 5);
        }
      }
    });
    k.blit(img, p.x - w / 2, p.y - h / 2 - 3, alpha);
    const leaf = stamp('wind-leaf', ['..33.', '.3443', '3453.', '.33..'], LEAF);
    const dust = stamp('wind-dust', ['.22..', '2342.', '.2422', '..22.'], LEAF);
    for (let i = 0; i < 8; i++) {
      const a = (i * k.tau) / 8 + s.c.raw / (casting ? 180 : 850),
        rr = r + ((i % 3) - 1) * 4;
      k.blit(i % 2 ? leaf : dust, p.x + Math.cos(a) * rr - 3, p.y + Math.sin(a) * rr - 3, alpha);
    }
  }

  // Warding Wind: four thick cyan-white curls whip leaves around the actual ten-foot boundary, then circle calmly.
  FX.register('warding-wind', {
    palette: WIND,
    travel: 200,
    beats: soft,
    end: finish,
    reach: (event, grid) => ({ r: (event.area?.feet ?? 10) / (grid.feet || 5) + 1, up: 1 }),
    ground(s) {
      if (s.pose.linger > 0) return;
      const e = age(s);
      if (e < -120) return;
      windWall(s, e < 0 ? 0.75 : 1, true);
    },
    air(s) {
      const e = age(s);
      if (e < 0) return;
      impact(s, k.P(s.area || s.pose.base || target(s)), WIND, 'wind-release', s.hits[0], 22);
    },
    linger(s) {
      windWall(s, s.linger, age(s) < 400);
    },
  });

  // Warding Bond: bright silver rings encircle both creatures while a large shield rides a thick living tether.
  FX.register('warding-bond', {
    palette: SILVER,
    travel: 200,
    beats: soft,
    end: finish,
    ground(s) {
      if (age(s) < 0) return;
      ring(feet(s), 9, 4, SILVER);
      const b = s.pose.base;
      if (b) ring(k.P(b), 9, 4, SILVER);
    },
    air(s) {
      const p = body(s),
        h = caster(s),
        e = age(s);
      delivery(s, p, SILVER);
      if (e < 0) return;
      impact(s, p, SILVER, 'silver-bond');
      if (e < 500) {
        stroke(h, p, SILVER, 3, 3);
        stroke(h, p, SILVER, 1, 5);
        for (const at of [h, p]) ring(at, 8, 10, SILVER, 2, 4);
        const q = k.clamp(e / 330);
        icon('bond-shield', SHIELD, SILVER, { x: k.mix(h.x, p.x, q), y: k.mix(h.y, p.y, q) - 2 });
      } else {
        icon('bond-shield', SHIELD, SILVER, { x: p.x, y: p.y + 1 }, 0.75);
      }
    },
  });

  function vortex(p, e, pal, phase) {
    const r = phase === 'close' ? Math.max(2, 10 * (1 - k.clamp(e / 200))) : 10;
    for (let i = 0; i < 3; i++) {
      const a = e / 75 + (i * k.tau) / 3;
      arc(p, r, r * 1.05, a, Math.PI * 1.2, pal, 3, i % 2 ? 3 : 4);
    }
    if (r > 5) ring(p, r * 0.5, r * 0.65, pal, 2, 5);
  }

  // Vortex Warp: full-square violet-blue coils twist a silhouette away and pop it out at the destination.
  FX.register('vortex-warp', {
    palette: VIOLET,
    travel: 200,
    beats: (event, kit, travel) => [
      { at: kit.CAST + travel, stop: 90, target: event.targets?.[0] ?? null, kind: 'soft', power: 0.03 },
      { at: kit.CAST + travel + 290, stop: 100, target: event.targets?.[0] ?? null, kind: 'soft', power: 0.04 },
    ],
    end: (event, travel) => k.CAST + travel + 800,
    ground(s) {
      const e = age(s);
      if (e < -100) return;
      const p = s.event.teleport?.from ? k.P(s.event.teleport.from) : feet(s);
      if (e < 270) ring(p, 11, 5, VIOLET);
      if (e >= 220) ring(s.event.teleport?.to ? k.P(s.event.teleport.to) : feet(s), 11, 5, VIOLET, 2, e < 600 ? 4 : 3);
    },
    air(s) {
      const e = age(s),
        tp = s.event.teleport;
      // Teleport endpoints are feet positions. Never move the actual creature from a drawing hook.
      const from = tp?.from ? k.P({ x: tp.from.x, y: tp.from.y - 0.62 }) : body(s);
      const to = tp?.to ? k.P({ x: tp.to.x, y: tp.to.y - 0.62 }) : body(s);
      delivery(s, from, VIOLET);
      if (e < -120) return;
      if (e < 290) vortex(from, Math.max(0, e), VIOLET, e > 90 ? 'close' : 'open');
      if (e >= 0) impact(s, from, VIOLET, 'warp-in');
      if (e >= 80 && e < 250) {
        const q = k.clamp((e - 80) / 170);
        icon('warped-figure', FIGURE, VIOLET, { x: from.x + Math.sin(q * 8) * (1 - q) * 3, y: from.y - q * 4 }, 1 - q);
      }
      const out = e - 290;
      if (out >= -70 && out < 340) vortex(to, Math.max(0, out), VIOLET, out > 140 ? 'close' : 'open');
      impact(s, to, VIOLET, 'warp-out', s.hits[1], 28);
      if (out >= 0 && out < 320) icon('warped-figure', FIGURE, VIOLET, to, out < 220 ? 1 : 0.5);
      if (out > 340) ring({ x: to.x, y: to.y + 8 }, 6, 3, VIOLET, 2, 3);
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
