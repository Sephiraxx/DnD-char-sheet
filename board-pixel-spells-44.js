/* Pixel spells, batch 44: large silhouettes, held peaks and crisp contact beats. */
(function (root) {
  'use strict';
  const FX = root.BoardPixelFX;
  if (!FX) return;
  const k = FX.kit;
  const HEAL = ['#17291c', '#3d7143', '#83ba64', '#c8ee91', '#fff1ab', '#fffde8'];
  const BLUE = ['#152b45', '#365e8b', '#76b2d3', '#abe9f3', '#e5fcff', '#ffffff'];
  const STONE = ['#25232b', '#555261', '#898593', '#bdb8c2', '#e6e1d9', '#ffffff'];
  const FEAR = ['#280c1a', '#65182e', '#ae2944', '#ef576b', '#ffd1c5', '#fff5e2'];
  const VIOLET = ['#251734', '#543a78', '#9270c1', '#c5a0ef', '#f0dcff', '#ffffff'];
  const DEATH = ['#1a1025', '#39213f', '#654475', '#ac82c9', '#e9d7ff', '#ffffff'];
  const GOLD = ['#382514', '#865924', '#d1a14d', '#ffdb7a', '#fff3c0', '#ffffff'];
  const FAIRY = ['#321337', '#792b86', '#bd50c8', '#ed8ef1', '#ffd4ff', '#ffffff'];
  const WIND = ['#173444', '#427d91', '#76b8c4', '#b7ebec', '#edffff', '#ffffff'];

  const beat = (event, travel, kind = 'soft', stop = 70) => [
    { at: k.CAST + travel, stop, target: event.targets?.[0] ?? null, kind, power: kind === 'soft' ? 0 : 0.07 },
  ];
  const selfBeat = (event, travel, stop) => [
    { at: k.CAST + travel, stop, target: event.caster ?? null, kind: 'soft', power: 0 },
  ];
  const elapsed = s => s.c.t - k.CAST;
  const first = s => s.targets.find(t => t.id === s.hits[0]?.id) || s.targets[0];
  const point = s => s.pose.target || s.area || first(s) || s.pose.base || s.pose.hand;
  const feet = t => ({ x: t.baseX ?? t.x, y: t.baseY ?? t.y + 0.62 * (t.span || 1) });
  const groundPoint = s => {
    const p = point(s);
    return p && p.baseY != null ? feet(p) : p;
  };
  function actor(s, self = false) {
    const t = self ? null : first(s);
    if (t) return { C: k.P(t), B: k.P(feet(t)), span: t.span || 1 };
    const b = s.pose.base || s.pose.hand || point(s);
    if (!b) return null;
    const B = k.P(b),
      span = b.span || 1;
    return { B, C: { x: B.x, y: B.y - 10 * span }, span };
  }
  function stroke(a, b, ramp, color = 4, width = 2) {
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y)));
    for (const [ink, size] of [
      [ramp[0], width + 2],
      [ramp[color], width],
    ])
      for (let i = 0; i <= n; i++) k.dot(k.mix(a.x, b.x, i / n), k.mix(a.y, b.y, i / n), ink, size);
  }
  function spark(x, y, ramp, size = 2, color = 4) {
    k.dot(x, y, ramp[0], size + 2);
    k.dot(x, y, ramp[color], size);
  }
  function ring(C, rx, ry, ramp, color = 4, width = 2, alpha = 1) {
    rx = Math.max(2, Math.round(rx));
    ry = Math.max(2, Math.round(ry));
    const w = rx * 2 + 8,
      h = ry * 2 + 8;
    const img = k.sprite(`44:ring:${ramp[0]}:${ramp[color]}:${rx}:${ry}:${width}`, w, h, ramp, set => {
      for (let y = 1; y < h - 1; y++)
        for (let x = 1; x < w - 1; x++) {
          const dx = x - w / 2,
            dy = y - h / 2;
          const outer = (dx / (rx + width / 2)) ** 2 + (dy / (ry + width / 2)) ** 2;
          const inner = (dx / Math.max(0.5, rx - width / 2)) ** 2 + (dy / Math.max(0.5, ry - width / 2)) ** 2;
          if (outer <= 1 && inner >= 1) set(x, y, color);
        }
    });
    k.blit(img, C.x - w / 2, C.y - h / 2, alpha);
  }
  function stamp(name, rows, ramp) {
    return k.sprite(`44:${name}`, rows[0].length, rows.length, ramp, set => {
      rows.forEach((row, y) =>
        [...row].forEach((v, x) => {
          if (v !== '.') set(x, y, Number(v));
        }),
      );
    });
  }
  function icon(name, rows, ramp, C, alpha = 1) {
    const img = stamp(name, rows, ramp);
    k.blit(img, C.x - img.width / 2, C.y - img.height / 2, alpha);
  }
  function motes(s, C, ramp, e, duration = 600, n = 6, spread = 11) {
    if (e < 0 || e >= duration) return;
    const q = e / duration;
    for (let i = 0; i < n; i++) {
      if (q > 0.8 && i % 2) continue;
      spark(
        C.x + (k.hash(i, s.event.seed, 1) - 0.5) * spread * 2 + Math.sin(q * 5 + i) * 2,
        C.y - q * (8 + k.hash(i, s.event.seed, 2) * 11),
        ramp,
        i % 3 ? 1 : 2,
        i % 2 ? 3 : 4,
      );
    }
  }
  // A transparent, two-pixel coat around head, shoulders, hands, torso and both legs.
  function coat(B, span, ramp, alpha = 1, crouch = false) {
    const z = Math.max(1, Math.round(span * 16));
    const w = Math.round(z * 1.5) + 8,
      h = Math.round(z * 1.9) + 8;
    const img = k.sprite(`44:coat:${ramp[0]}:${ramp[4]}:${z}:${crouch}`, w, h, ramp, set => {
      const bottom = h - 5,
        cx = Math.floor(w / 2);
      const inside = (x, y) => {
        const dx = (x - cx) / z,
          up = (bottom - y) / z;
        if (crouch)
          return (
            (dx / 0.25) ** 2 + ((up - 0.8) / 0.27) ** 2 < 1 ||
            (up > 0.1 && up < 0.65 && Math.abs(dx) < 0.42 - up * 0.15)
          );
        return (
          (dx / 0.22) ** 2 + ((up - 1.25) / 0.25) ** 2 < 1 ||
          (up > 0.45 && up < 1.03 && Math.abs(dx) < 0.29) ||
          (up > 0.35 && up < 0.94 && Math.abs(dx) > 0.27 && Math.abs(dx) < 0.45) ||
          (up > 0 && up <= 0.46 && Math.abs(dx) > 0.07 && Math.abs(dx) < 0.29)
        );
      };
      for (let y = 1; y < h - 1; y++)
        for (let x = 1; x < w - 1; x++) {
          if (inside(x, y)) continue;
          let near = false;
          for (let dy = -2; dy <= 2 && !near; dy++)
            for (let dx = -2; dx <= 2; dx++)
              if (dx * dx + dy * dy <= 5 && inside(x + dx, y + dy)) {
                near = true;
                break;
              }
          if (near) set(x, y, y % 7 === 1 ? 5 : 4);
        }
    });
    k.blit(img, B.x - Math.floor(w / 2), B.y - (h - 5), alpha);
  }
  const PLUS = [
    '.............',
    '.....444.....',
    '.....454.....',
    '.....454.....',
    '.....454.....',
    '.44444544444.',
    '.45555555554.',
    '.44444544444.',
    '.....454.....',
    '.....454.....',
    '.....454.....',
    '.....444.....',
    '.............',
  ];
  const MASK = [
    '................',
    '..444......444..',
    '.45554444445554.',
    '.45445555554454.',
    '.44004455440044.',
    '..400445544004..',
    '..444445544444..',
    '...4445555444...',
    '....44555544....',
    '.....440044.....',
    '......4444......',
    '................',
  ];
  const SCREAM = [
    '...............',
    '.....44444.....',
    '...445555544...',
    '..44555555544..',
    '..45004500454..',
    '..45004500454..',
    '..44555555544..',
    '...45500554....',
    '...45000054....',
    '...45000054....',
    '...45000054....',
    '....450054.....',
    '....445544.....',
    '.....4444......',
    '...............',
  ];

  // Cure Wounds: green-gold light rises from the feet and blooms into a large chest cross.
  FX.register('cure', {
    palette: HEAL,
    travel: 240,
    beats: (event, kit, travel) => beat(event, travel, 'soft', 80),
    end: () => 1180,
    ground(s) {
      const a = actor(s),
        e = elapsed(s);
      if (!a || e < 0) return;
      if (e < 740) ring(a.B, 7 + k.ease(k.clamp(e / 240)) * 3, 4, HEAL, e < 240 ? 3 : 4);
    },
    air(s) {
      const a = actor(s),
        e = elapsed(s);
      if (!a || e < 0) return;
      if (e < 300) {
        const q = k.clamp(e / 240);
        for (let i = -2; i <= 2; i++) {
          const x = a.B.x + i * 3;
          stroke({ x, y: a.B.y - 2 }, { x, y: a.B.y - q * (14 - Math.abs(i) * 2) }, HEAL, i % 2 ? 3 : 4, 2);
        }
      }
      if (e >= 190 && e < 610) {
        const r = 7 + Math.sin(k.clamp((e - 240) / 300) * Math.PI) * 4;
        ring(a.C, r, r, HEAL, 3);
        icon('healing-plus', PLUS, HEAL, a.C);
      }
      motes(s, { x: a.C.x, y: a.C.y + 2 }, HEAL, s.real(s.hits[0]) - 220, 470, 5);
    },
  });

  // Tenser's Floating Disk: a broad pale-blue platter spins up, then bobs above a soft pixel shadow.
  FX.register('tensers-floating-disk', {
    palette: BLUE,
    travel: 180,
    beats: (event, kit, travel) => beat(event, travel),
    end: () => 1380,
    ground(s) {
      const e = elapsed(s),
        p = groundPoint(s);
      if (!p || e < 0) return;
      const C = k.P(p);
      const img = k.sprite(
        '44:disk-shadow',
        23,
        11,
        [BLUE[0], BLUE[1]],
        set => {
          for (let y = 1; y < 10; y++)
            for (let x = 1; x < 22; x++) {
              const d = ((x - 11) / 10) ** 2 + ((y - 5) / 4) ** 2;
              if (d < 0.5 || (d < 1 && k.dith(x, y) < 0.45)) set(x, y, 1);
            }
        },
        false,
      );
      k.blit(img, C.x - 11, C.y - 3, e < 150 ? 0.25 : 0.5);
    },
    air(s) {
      const e = elapsed(s),
        p = groundPoint(s);
      if (!p || e < 0) return;
      const C = k.P(p),
        q = k.ease(k.clamp(e / 180));
      if (e < 160) {
        k.drawHit(k.hitStyle('44-disk-flash', BLUE, { S: 25, spikes: 4 }), C, e);
      }
      const cy = C.y - 6 * q + Math.round(Math.sin(s.c.raw / 190));
      const ry = e < 180 ? 2 + Math.round(3 * q) : 5;
      const img = k.sprite(`44:disk:${ry}`, 23, 17, BLUE, set => {
        for (let y = 1; y < 16; y++)
          for (let x = 1; x < 22; x++) {
            const d = ((x - 11) / 9) ** 2 + ((y - 8) / ry) ** 2;
            if (d <= 1) set(x, y, d > 0.45 ? (y < 8 ? 4 : 3) : 2);
            if (d <= 1 && y >= 8 && d > 0.45) set(x, y + 1, 3);
            if (d > 0.54 && d < 0.95 && y < 7 && x < 15) set(x, y, 5);
          }
      });
      k.blit(img, C.x - 11, cy - 8);
      const spin = s.c.raw / 100;
      spark(C.x + Math.cos(spin) * 7, cy + Math.sin(spin) * (ry - 1), BLUE, 2, 5);
    },
  });

  // Catapult: a fist-sized faceted rock follows a high arc and explodes into chips and dust.
  FX.register('catapult', {
    palette: STONE,
    travel: 430,
    beats: (event, kit, travel) => beat(event, travel, 'hit', 135),
    end: () => 1250,
    air(s) {
      const t = first(s),
        p = t || point(s);
      if (!s.pose.hand || !p) return;
      const H = k.P(s.pose.hand),
        T = k.P(t ? k.contact(t, s.pose.hand) : p);
      const e = elapsed(s),
        hit = s.hits[0];
      if (e >= 0 && s.c.t < hit.at) {
        const q = e / 430;
        const at = u => ({ x: k.mix(H.x, T.x, u), y: k.mix(H.y, T.y, u) - Math.sin(u * Math.PI) * 27 });
        for (let i = 6; i >= 1; i--) {
          const u = q - i * 0.035;
          if (u < 0) continue;
          const A = at(u),
            B = at(Math.max(0, u - 0.025));
          stroke(B, A, STONE, i < 3 ? 4 : 2, 2);
        }
        const rock = stamp(
          'catapult-rock',
          [
            '............',
            '....444.....',
            '..4455544...',
            '.445444443..',
            '.454333333..',
            '.4433332233.',
            '.4333322233.',
            '..33322223..',
            '..3322223...',
            '...33333....',
            '............',
          ],
          STONE,
        );
        const C = at(q);
        k.blitRotated(rock, C.x, C.y, q * 5);
      }
      const real = s.real(hit);
      k.drawHit(k.hitStyle('44-catapult', STONE, { S: 42, spikes: 7, minor: 4, jag: 0.35 }), T, real);
      k.shards(T, real, STONE, s.event.seed, 13, 28);
      if (real >= 70 && real < 480) {
        const q = (real - 70) / 410;
        for (let i = 0; i < 5; i++) {
          const x = T.x + (i - 2) * (3 + q * 5),
            y = T.y + 5 + q * 8;
          const r = Math.max(1, Math.round(4 * (1 - q)));
          k.disc(x, y, r + 1, STONE[0]);
          k.disc(x, y, r, i % 2 ? STONE[3] : STONE[2]);
        }
      }
    },
  });

  // Wrathful Smite: a crimson weapon flare erupts into a pale screaming face and cowering shoulders.
  FX.register('wrathful-smite', {
    palette: FEAR,
    travel: 180,
    beats: (event, kit, travel) => beat(event, travel, 'hit', 110),
    end: () => 1230,
    air(s) {
      const a = actor(s),
        t = first(s);
      if (!a) return;
      const hit = s.hits[0],
        e = elapsed(s),
        T = t && s.pose.hand ? k.P(k.contact(t, s.pose.hand)) : a.C;
      if (e >= 0 && e < 180) {
        const q = k.ease(e / 180);
        stroke({ x: T.x - 9 + q * 12, y: T.y - 13 + q * 6 }, { x: T.x + 4, y: T.y + 6 }, FEAR, 4, 3);
      }
      const real = s.real(hit);
      k.drawHit(k.hitStyle('44-wrathful', FEAR, { S: 32, spikes: 5 }), T, real);
      k.shards(T, real, FEAR, s.event.seed, 8, 18);
      if (real >= 0 && real < 500) {
        const q = k.clamp(real / 380);
        ring(a.C, 8 + q * 9, 6 + q * 6, FEAR, 2);
        if (real > 90) ring(a.C, 6 + q * 5, 5 + q * 4, FEAR, 3);
      }
      if (e >= 180 && e < 700) {
        const C = { x: a.C.x, y: a.C.y - 2 - 3 * k.ease(k.clamp((e - 180) / 180)) };
        icon('fear-face', SCREAM, FEAR, C);
        // Tucked shoulders and raised guarding hands are drawn as a reaction echo, without moving the token.
        stroke({ x: a.C.x - 8, y: a.C.y + 5 }, { x: a.C.x - 5, y: a.C.y - 1 }, FEAR, 4);
        stroke({ x: a.C.x + 8, y: a.C.y + 5 }, { x: a.C.x + 5, y: a.C.y - 1 }, FEAR, 4);
      }
      if (e >= 700) motes(s, a.C, FEAR, e - 700, 230, 3, 6);
    },
  });

  // Disguise Self: an ordered violet pixel curtain washes down the caster, leaving a masked shimmer coat.
  FX.register('disguise-self', {
    palette: VIOLET,
    travel: 260,
    beats: (event, kit, travel) => selfBeat(event, travel, 60),
    end: () => 1330,
    air(s) {
      const a = actor(s, true),
        e = elapsed(s);
      if (!a || e < 0) return;
      if (e < 430) {
        const f = Math.min(9, Math.floor(e / 40));
        const img = k.sprite(`44:disguise-curtain:${f}`, 23, 31, VIOLET, set => {
          const front = 3 + f * 3;
          for (let y = 2; y < 29; y++)
            for (let x = 3; x < 20; x++) {
              const behind = front - y;
              if (behind < 0 || behind > 9) continue;
              if (k.dith(x, y) < (behind < 3 ? 0.88 : 0.35)) set(x, y, behind < 3 ? 4 : 3);
            }
        });
        k.blit(img, a.B.x - 11, a.B.y - 28);
      }
      if (e >= 230 && e < 640) icon('disguise-mask', MASK, VIOLET, { x: a.C.x, y: a.C.y - 4 });
      if (e >= 270) coat(a.B, a.span, VIOLET, e < 680 ? 0.75 : 0.25);
      motes(s, a.B, VIOLET, s.real(s.hits[0]) - 240, 430, 4, 9);
    },
  });

  // Gift of Alacrity: a full-sized cyan clock spins rapidly and contracts into a bright body ring.
  FX.register('gift-of-alacrity', {
    palette: BLUE,
    travel: 240,
    beats: (event, kit, travel) => beat(event, travel),
    end: () => 1340,
    air(s) {
      const a = actor(s),
        e = elapsed(s);
      if (!a || e < 0) return;
      const C = { x: a.C.x, y: a.C.y - 3 };
      if (e < 670) {
        const r = e < 130 ? 4 + 5 * k.ease(e / 130) : 9;
        ring(C, r, r, BLUE, 4);
        for (let i = 0; i < 4; i++) {
          const angle = (i * Math.PI) / 2;
          spark(C.x + Math.cos(angle) * 7, C.y + Math.sin(angle) * 7, BLUE, 2, 5);
        }
        const angle = s.c.raw / 45;
        stroke(C, { x: C.x + Math.sin(angle) * 6, y: C.y - Math.cos(angle) * 6 }, BLUE, 5);
        stroke(C, { x: C.x + Math.sin(angle / 3) * 4, y: C.y - Math.cos(angle / 3) * 4 }, BLUE, 3);
        spark(C.x, C.y, BLUE, 2, 5);
        for (let j = 0; j < 3; j++) {
          const a0 = s.c.raw / 180 + (j * k.tau) / 3;
          const A = { x: C.x + Math.cos(a0) * 13, y: C.y + Math.sin(a0) * 10 };
          const B = { x: C.x + Math.cos(a0 + 0.5) * 13, y: C.y + Math.sin(a0 + 0.5) * 10 };
          stroke(A, B, BLUE, 3);
        }
      } else if (e < 850) {
        const q = k.ease((e - 670) / 180);
        ring({ x: C.x, y: k.mix(C.y, a.B.y - 3, q) }, 9, k.mix(9, 4, q), BLUE, 5);
      } else {
        ring({ x: a.B.x, y: a.B.y - 3 }, 9, 4, BLUE, 4, 2, 0.75);
        motes(s, a.B, BLUE, e - 850, 220, 4, 8);
      }
    },
  });

  // Illusory Script: a broad parchment unrolls, writes violet runes, scrambles them, and rolls shut.
  FX.register('illusory-script', {
    palette: VIOLET,
    travel: 260,
    beats: (event, kit, travel) => beat(event, travel, 'soft', 65),
    end: () => 1640,
    air(s) {
      const e = elapsed(s),
        p = point(s);
      if (!p || e < 0) return;
      const C = k.P(p),
        paper = [GOLD[0], GOLD[1], GOLD[2], GOLD[3], '#fff0c6', '#fffce6'];
      const open = e < 220 ? k.ease(e / 220) : e > 1000 ? 1 - k.ease(k.clamp((e - 1000) / 220)) : 1;
      const half = Math.round(2 + open * 7);
      if (e < 1230) {
        const img = k.sprite(`44:scroll:${half}`, 25, 25, paper, set => {
          for (let y = 12 - half; y <= 12 + half; y++) for (let x = 4; x <= 20; x++) set(x, y, x < 6 || x > 18 ? 3 : 4);
          for (const y0 of [12 - half, 12 + half])
            for (let y = y0 - 1; y <= y0 + 1; y++)
              for (let x = 2; x <= 22; x++) set(x, y, y === y0 - 1 ? 5 : y === y0 ? 3 : 2);
          for (const x of [3, 21]) for (const y of [12 - half, 12 + half]) set(x, y, 1);
        });
        k.blit(img, C.x - 12, C.y - 15);
        if (e >= 220 && e <= 1000) {
          const scramble = e >= 620 ? 1 + Math.floor((e - 620) / 90) : 0;
          const count = Math.min(6, Math.floor((e - 220) / 45) + 1);
          const runes = k.sprite(`44:script-runes:${scramble}:${count}`, 19, 13, VIOLET, set => {
            for (let i = 0; i < count; i++) {
              const x = 2 + (i % 3) * 5,
                y = 2 + Math.floor(i / 3) * 5;
              const flip = (i + scramble) % 3;
              for (let v = 0; v < 3; v++) {
                set(x, y + v, 3);
                set(x + 1, y + v, 4);
              }
              for (let u = 0; u < 3; u++) set(x + u, y + (flip === 0 ? 0 : 2), 3);
              set(x + 2, y + (flip === 2 ? 0 : 1), 4);
            }
          });
          k.blit(runes, C.x - 9, C.y - 9);
        }
      }
      if (e >= 1200) motes(s, C, VIOLET, e - 1200, 150, 3, 7);
    },
  });

  // False Life: a necrotic swell becomes a pale two-pixel vitality shell and a pulsing skull-heart.
  FX.register('false-life', {
    palette: DEATH,
    travel: 270,
    beats: (event, kit, travel) => selfBeat(event, travel, 90),
    end: () => 1330,
    ground(s) {
      const a = actor(s, true),
        e = elapsed(s);
      if (!a || e < 0) return;
      if (e < 740) ring(a.B, 6 + Math.sin(Math.min(1, e / 500) * Math.PI) * 6, 4, DEATH, e < 270 ? 2 : 3, 3);
    },
    air(s) {
      const a = actor(s, true),
        e = elapsed(s);
      if (!a || e < 0) return;
      if (e < 330) {
        const q = k.ease(k.clamp(e / 270));
        for (let i = -2; i <= 2; i++) {
          const x = a.B.x + i * 4;
          stroke(
            { x, y: a.B.y },
            { x: x + Math.sin(e / 80 + i) * 2, y: a.B.y - q * (22 - Math.abs(i) * 3) },
            DEATH,
            i % 2 ? 2 : 3,
            3,
          );
        }
      }
      if (e >= 230) coat(a.B, a.span, DEATH, e < 760 ? 1 : 0.5);
      if (e >= 270 && e < 730) {
        const pulse = e < 470 ? 1 : 0;
        if (pulse) ring(a.C, 8 + 3 * Math.sin(((e - 270) / 200) * Math.PI), 8, DEATH, 3);
        icon(
          'skull-heart',
          [
            '...............',
            '..4444...4444..',
            '.455554.455554.',
            '.4555555555554.',
            '.4455555555544.',
            '..44500500544..',
            '..44500500544..',
            '...445555544...',
            '....450054.....',
            '.....4444......',
            '.....4544......',
            '......44.......',
            '...............',
          ],
          DEATH,
          a.C,
        );
      }
      motes(s, a.B, DEATH, s.real(s.hits[0]) - 480, 250, 4, 9);
    },
  });

  // Divine Favor: a gold shaft strikes the weapon hand and kindles a tall white-gold radiant blade.
  FX.register('divine-favor', {
    palette: GOLD,
    travel: 200,
    beats: (event, kit, travel) => selfBeat(event, travel, 80),
    end: () => 1270,
    ground(s) {
      const a = actor(s, true),
        e = elapsed(s);
      if (!a || e < 0 || e > 690) return;
      ring(a.B, 8, 4, GOLD, e < 200 ? 3 : 4);
    },
    air(s) {
      const e = elapsed(s);
      if (!s.pose.hand || e < 0) return;
      const H = k.P(s.pose.hand),
        hand = { x: H.x + 4, y: H.y + 1 };
      if (e < 260) {
        const end = k.mix(hand.y - 28, hand.y, k.ease(k.clamp(e / 180)));
        stroke({ x: hand.x, y: hand.y - 29 }, { x: hand.x, y: end }, GOLD, 3, 4);
        stroke({ x: hand.x, y: hand.y - 29 }, { x: hand.x, y: end }, GOLD, 5, 2);
      }
      if (e >= 170 && e < 690) {
        icon(
          'radiant-weapon',
          [
            '.............',
            '......5......',
            '.....454.....',
            '.....454.....',
            '....34543....',
            '....34543....',
            '....34543....',
            '....34543....',
            '....34543....',
            '....34543....',
            '....34543....',
            '....34543....',
            '.....454.....',
            '..444454444..',
            '..355555553..',
            '.....454.....',
            '.....343.....',
            '.....343.....',
            '.....444.....',
            '.............',
          ],
          GOLD,
          { x: hand.x, y: hand.y - 7 },
        );
      }
      const real = s.real(s.hits[0]);
      if (real >= 0 && real < 520) {
        k.shards(hand, real, GOLD, s.event.seed, 7, 16);
        motes(s, hand, GOLD, real - 140, 400, 5, 8);
      }
      if (e >= 690) {
        ring(hand, 4, 4, GOLD, 3, 2, 0.75);
        spark(hand.x, hand.y, GOLD, 3, 4);
      }
    },
  });

  // Find Familiar: a pale flame and smoke puff reveal a broad-eyed, blinking ivory owl on the circle.
  FX.register('find-familiar', {
    palette: VIOLET,
    travel: 350,
    beats: (event, kit, travel) => beat(event, travel, 'soft', 90),
    end: () => 1660,
    ground(s) {
      const p = groundPoint(s),
        e = elapsed(s);
      if (!p || e < 0) return;
      const C = k.P(p);
      ring(C, 10, 5, VIOLET, e < 350 ? 4 : 3);
      if (e < 430) ring(C, 6, 3, VIOLET, 4, 1);
    },
    air(s) {
      const p = groundPoint(s),
        e = elapsed(s);
      if (!p || e < 0) return;
      const C = k.P(p);
      if (e < 340) {
        const f = Math.floor(e / 70) % 3;
        const flame = k.sprite(`44:familiar-flame:${f}`, 15, 22, VIOLET, set => {
          for (let y = 2; y < 20; y++)
            for (let x = 1; x < 14; x++) {
              const up = (20 - y) / 18,
                dx = x - 7 - Math.round(Math.sin(up * 7 + f) * up * 2);
              const half = 5 * (1 - up) + Math.sin(up * Math.PI) * 2;
              if (Math.abs(dx) < half) set(x, y, Math.abs(dx) < half * 0.4 ? 5 : 4);
            }
        });
        k.blit(flame, C.x - 7, C.y - 20);
      }
      const real = s.real(s.hits[0]);
      if (real >= -90 && real < 280) {
        const q = k.clamp((real + 90) / 370);
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * k.tau;
          const r = Math.max(1, Math.round(5 * (1 - q)));
          const x = C.x + Math.cos(a) * (3 + q * 12),
            y = C.y - 6 + Math.sin(a) * (3 + q * 4) - q * 5;
          k.disc(x, y, r + 1, VIOLET[0]);
          k.disc(x, y, r, VIOLET[i % 2 ? 3 : 4]);
        }
      }
      if (e >= 350) {
        const blink = e > 850 && e < 980;
        const rows = [
          '................',
          '..44........44..',
          '..4544....4454..',
          '..455544445554..',
          '.44555555555544.',
          '.45544455444554.',
          '.45400544500454.',
          '.45400544500454.',
          '.45544433444554.',
          '..455553355554..',
          '..344555555443..',
          '..334455554433..',
          '...3344444433...',
          '....34444443....',
          '.....44..44.....',
          '....333..333....',
          '................',
        ];
        if (blink) {
          rows[6] = '.45444444444454.';
          rows[7] = '.45400444400454.';
        }
        icon(`familiar-owl:${blink}`, rows, [VIOLET[0], VIOLET[1], '#8f859f', '#c8b8cc', '#eee6e2', '#fffdf0'], {
          x: C.x,
          y: C.y - 8 - (e < 550 ? Math.round(2 * (1 - (e - 350) / 200)) : 0),
        });
      }
    },
  });

  function cube(s) {
    if (!s.area) return null;
    const corners = k.outline(s.area, s.grid).map(p => k.P({ x: p[0], y: p[1] }));
    return corners.length >= 4 ? corners : null;
  }
  function within(C, corners) {
    let sign = 0;
    for (let i = 0; i < corners.length; i++) {
      const A = corners[i],
        B = corners[(i + 1) % corners.length];
      const cross = (B.x - A.x) * (C.y - A.y) - (B.y - A.y) * (C.x - A.x);
      if (Math.abs(cross) < 0.01) continue;
      if (sign && Math.sign(cross) !== sign) return false;
      sign = Math.sign(cross);
    }
    return true;
  }

  // Faerie Fire: the cube floor dances with sparks while whole figures wear thick pink-violet light.
  FX.register('faeriefire', {
    palette: FAIRY,
    travel: 220,
    beats(event, kit, travel) {
      return (event.targets?.length ? event.targets : [null]).map(target => ({
        at: kit.CAST + travel,
        stop: 75,
        target,
        kind: 'soft',
        power: 0,
      }));
    },
    end: () => 1720,
    ground(s) {
      const e = elapsed(s),
        corners = cube(s);
      if (e < 0 || !corners) return;
      const minX = Math.floor(Math.min(...corners.map(p => p.x))),
        minY = Math.floor(Math.min(...corners.map(p => p.y)));
      const w = Math.ceil(Math.max(...corners.map(p => p.x)) - minX) + 3;
      const h = Math.ceil(Math.max(...corners.map(p => p.y)) - minY) + 3;
      const local = corners.map(p => ({ x: p.x - minX, y: p.y - minY }));
      const key = local.map(p => `${Math.round(p.x)},${Math.round(p.y)}`).join(':');
      const tile = k.sprite(`44:fairy-floor:${w}:${h}:${key}`, w, h, FAIRY, set => {
        for (let y = 1; y < h - 1; y++)
          for (let x = 1; x < w - 1; x++)
            if (within({ x, y }, local) && x % 8 < 2 && y % 8 < 2) set(x, y, (x + y) % 16 < 8 ? 3 : 4);
      });
      k.blit(tile, minX, minY, e < 180 ? 0.5 : e < 1100 ? 1 : 0.5);
      const A = corners[0],
        U = { x: corners[1].x - A.x, y: corners[1].y - A.y };
      const V = { x: corners[3].x - A.x, y: corners[3].y - A.y };
      for (let i = 0; i < 12; i++) {
        const u = k.hash(i, s.event.seed, 2),
          v = k.hash(i, s.event.seed, 3);
        const q = (s.c.raw / 700 + i / 12) % 1;
        spark(
          A.x + U.x * u + V.x * v + Math.sin(q * k.tau) * 2,
          A.y + U.y * u + V.y * v - q * 3,
          FAIRY,
          q < 0.5 ? 2 : 1,
          q < 0.3 ? 5 : 3,
        );
      }
    },
    air(s) {
      const e = elapsed(s),
        corners = cube(s);
      if (e < 120) return;
      for (const t of s.targets) {
        const B = k.P(feet(t));
        if (corners && !within(B, corners)) continue;
        coat(B, t.span || 1, FAIRY, e < 1100 ? 1 : 0.75);
        const C = k.P(t);
        for (let i = 0; i < 4; i++) {
          const q = (s.c.raw / 950 + i / 4) % 1;
          const side = i % 2 ? 1 : -1;
          spark(C.x + side * (8 + Math.sin(q * Math.PI) * 2), B.y - q * 24, FAIRY, 2, i % 2 ? 4 : 5);
        }
      }
    },
  });

  // Zephyr Strike: a cyan-white rush leaves broad wind ribbons, then a gust star kicks up spinning leaves.
  FX.register('zephyr-strike', {
    palette: WIND,
    travel: 220,
    beats: (event, kit, travel) => beat(event, travel, 'hit', 100),
    end: () => 1240,
    air(s) {
      const t = first(s),
        p = t || point(s);
      if (!p || !s.pose.hand) return;
      const H = k.P(s.pose.hand),
        T = k.P(t ? k.contact(t, s.pose.hand) : p);
      const e = elapsed(s),
        hit = s.hits[0];
      if (e >= 0 && e < 320) {
        const q = k.ease(k.clamp(e / 220));
        const dx = T.x - H.x,
          dy = T.y - H.y,
          len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len,
          ny = dx / len;
        for (let j = -1; j <= 1; j++) {
          const points = [];
          const from = Math.max(0, q - 0.42),
            to = Math.max(from, q - (j === 0 ? 0.015 : 0.06));
          for (let i = 0; i <= 22; i++) {
            const u = k.mix(from, to, i / 22),
              bend = j * 6 + Math.sin(u * Math.PI * 3 - e / 70) * 2;
            points.push({ x: H.x + dx * u + nx * bend, y: H.y + dy * u + ny * bend });
          }
          for (const [color, size] of [
            [WIND[0], 5],
            [WIND[j ? 4 : 5], 3],
          ])
            for (const C of points) k.dot(C.x, C.y, color, size);
        }
        if (e < 220) {
          const C = { x: k.mix(H.x, T.x, q), y: k.mix(H.y, T.y, q) };
          coat({ x: C.x, y: C.y + 10 }, 0.7, WIND, 0.75, true);
          stroke({ x: C.x - nx * 5, y: C.y - ny * 5 - 6 }, { x: C.x + nx * 6, y: C.y + ny * 6 + 4 }, WIND, 5, 3);
        }
      }
      const real = s.real(hit);
      k.drawHit(k.hitStyle('44-zephyr', WIND, { S: 39, spikes: 5, minor: 3, jag: 0.16 }), T, real);
      k.shards(T, real, WIND, s.event.seed, 7, 24);
      if (real >= 0 && real < 600) {
        const q = real / 600;
        const leaf = stamp(
          'zephyr-leaf',
          ['.......', '....44.', '..3444.', '.3444..', '.443...', '.......'],
          [WIND[0], '#385240', '#6b8656', '#b3d895', '#e6f3bd', '#ffffff'],
        );
        for (let i = 0; i < 6; i++) {
          const angle = (i * k.tau) / 6 + q * 3,
            r = 6 + k.ease(q) * 16;
          const x = T.x + Math.cos(angle) * r,
            y = T.y + Math.sin(angle) * r * 0.5 + q * q * 10;
          k.blitRotated(leaf, x, y, angle + Math.PI / 3);
        }
      }
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
