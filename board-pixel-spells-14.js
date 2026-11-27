/* Pixel spells, batch 14: second-level illusions, conjured blades, binding ice and wind. */
(function (root) {
  'use strict';
  const FX = root.BoardPixelFX;
  if (!FX) return;
  const k = FX.kit;
  const WIND = ['#102431', '#315c70', '#6a9fac', '#a9dde0', '#e2ffff', '#ffffff'];
  const MIND = ['#260d2c', '#60235e', '#ac449a', '#ed85d1', '#ffe0f6', '#ffffff'];
  const ICE = ['#101e36', '#244f80', '#4e98c9', '#9cdafa', '#e2faff', '#ffffff'];
  const THUNDER = ['#171e30', '#3c486b', '#7a8fb8', '#becde6', '#edf6ff', '#ffffff'];
  const FIRE = ['#2a1012', '#762216', '#cb481c', '#fa852a', '#ffd76c', '#ffffff'];
  const SHADOW = ['#0c0918', '#25213a', '#4a3d70', '#8b73b7', '#d2b9ed', '#ffffff'];
  const GOLD = ['#302010', '#7c4f20', '#c48c30', '#f4c95c', '#fff0b0', '#ffffff'];
  const BEAST = ['#102a26', '#2e6153', '#599c78', '#a3d6a0', '#e1f7c8', '#ffffff'];
  const ARCANE = ['#1c1532', '#49366e', '#8668ae', '#c4a9e5', '#f0e5ff', '#ffffff'];

  function pixel(x, y, ramp, index = 3, size = 1) {
    k.dot(x, y, ramp[0], size + 2);
    k.dot(x, y, ramp[index], size);
  }
  function line(A, B, ramp, index = 3, size = 1) {
    const n = Math.min(72, Math.max(1, Math.ceil(Math.hypot(B.x - A.x, B.y - A.y) / 2)));
    for (const [color, width] of [
      [ramp[0], size + 2],
      [ramp[index], size],
    ])
      for (let j = 0; j <= n; j++) k.dot(k.mix(A.x, B.x, j / n), k.mix(A.y, B.y, j / n), color, width);
  }
  // Large rings are sprites, so their circumference adds no per-frame dot work.
  function ring(C, rx, ry, ramp, index = 3, broken = false, phase = 0) {
    rx = Math.max(1, Math.round(rx));
    ry = Math.max(1, Math.round(ry));
    const f = Math.floor(phase) % 8;
    const img = k.sprite(
      `14:ring:${ramp[0]}:${rx}:${ry}:${index}:${broken}:${f}`,
      rx * 2 + 6,
      ry * 2 + 6,
      ramp,
      set => {
        const n = Math.ceil(k.tau * Math.max(rx, ry) * 1.5);
        for (let i = 0; i < n; i++) {
          if (broken && (Math.floor((i / n) * 24) + f) % 3 === 0) continue;
          const a = (i / n) * k.tau;
          set(rx + 3 + Math.cos(a) * rx, ry + 3 + Math.sin(a) * ry, index);
        }
      },
    );
    k.blit(img, C.x - rx - 3, C.y - ry - 3);
  }
  function image(key, rows, ramp) {
    return k.sprite(
      `14:${key}:${ramp[0]}`,
      Math.max(...rows.map(row => row.length)) + 2,
      rows.length + 2,
      ramp,
      set => {
        rows.forEach((row, y) =>
          [...row].forEach((v, x) => {
            if (v !== '.') set(x + 1, y + 1, +v);
          }),
        );
      },
    );
  }
  function stamp(key, rows, ramp, C) {
    const img = image(key, rows, ramp);
    k.blit(img, C.x - img.width / 2, C.y - img.height / 2);
  }
  function subject(s, hit = s.hits[0]) {
    return (
      s.targets.find(t => t.id === hit?.id) ||
      s.targets[0] ||
      s.pose.target ||
      s.pose.base ||
      s.pose.hand || { x: 0, y: 0 }
    );
  }
  function feet(t) {
    return k.P({ x: t.baseX ?? t.x, y: t.baseY ?? t.y });
  }
  function aim(s) {
    return k.P(s.area || s.pose.target || subject(s));
  }
  function beats(event, kit, travel, kind = 'soft', stop = 65) {
    return (event.targets?.length ? event.targets : [null]).map(target => ({
      at: kit.CAST + travel,
      stop,
      target,
      kind,
      power: kind === 'soft' ? 0 : 0.07,
    }));
  }
  function selfBeat(event, kit, travel) {
    return [{ at: kit.CAST + travel, stop: 65, target: event.caster ?? null, kind: 'soft', power: 0 }];
  }
  function impact(s, hit, C, ramp, size = 28, count = 6, salt = 0) {
    const e = s.real(hit);
    k.drawHit(k.hitStyle(`14:${s.event.id}:${salt}`, ramp, { S: size, spikes: 5, jag: 0.32 }), C, e);
    k.shards(C, e, ramp, (s.event.seed || 0) + salt * 19, count, size * 0.65);
  }
  function spark(C, ramp, r = 3) {
    line({ x: C.x - r, y: C.y }, { x: C.x + r, y: C.y }, ramp, 4);
    line({ x: C.x, y: C.y - r }, { x: C.x, y: C.y + r }, ramp, 5);
  }
  function mote(s, T, ramp) {
    const hit = s.hits[0];
    if (!s.pose.hand || s.c.t < k.CAST || s.c.t >= hit.at) return;
    const H = k.P(s.pose.hand),
      q = (s.c.t - k.CAST) / Math.max(1, hit.at - k.CAST);
    for (let i = 5; i >= 0; i--) {
      const u = q - i * 0.055;
      if (u >= 0) pixel(k.mix(H.x, T.x, u), k.mix(H.y, T.y, u) - Math.sin(u * Math.PI) * 8, ramp, i ? 3 : 5, i ? 1 : 3);
    }
  }
  function corners(s) {
    if (!s.area) return [];
    return k.outline(s.area, s.grid).map(p => k.P(Array.isArray(p) ? { x: p[0], y: p[1] } : p));
  }
  const FIGURE = [
    '......333......',
    '.....34443.....',
    '.....34543.....',
    '......222......',
    '....3333333....',
    '...343333343...',
    '..34.33333.43..',
    '..3..33333..3..',
    '.....33333.....',
    '....3333333....',
    '....3433343....',
    '...343333343...',
    '...333333333...',
    '.....33.33.....',
    '.....32.23.....',
    '....333.333....',
  ];
  const EYE = [
    '....33333....',
    '..334444433..',
    '.34442224443.',
    '3444235324443',
    '.34442224443.',
    '..334444433..',
    '....33333....',
  ];
  const CRYSTAL = ['...4...', '..454..', '..435..', '.44335.', '.43335.', '..433..', '...3...'];
  const WOLF = [
    '...3......3..............',
    '...43....343.............',
    '...443333443.............',
    '..3454334543.............',
    '.34444444443333333.......',
    '34445344443344333333.....',
    '.333344443344444333333...',
    '....333333344444433.333..',
    '.....3333344444333...333.',
    '.....33.3333333333....33.',
    '.....33.33...33.33.......',
    '....343.33...33.343......',
    '....333.343..343.333.....',
    '........333..333.........',
  ];

  // Freedom of the Winds: white-teal vortices snap shut at departure and burst open at arrival.
  FX.register('freedom-of-the-winds', {
    palette: WIND,
    travel: 180,
    beats: selfBeat,
    end: () => k.CAST + 900,
    ground(s) {
      const e = s.c.t - k.CAST;
      if (e < 0 || e > 850) return;
      const from = k.P(s.event.teleport?.from || s.pose.base || subject(s));
      const to = k.P(s.event.teleport?.to || s.pose.target || subject(s));
      if (e < 260) ring(from, 16 * (1 - k.clamp(e / 280)) + 2, 5, WIND, 4, true, e / 40);
      if (e >= 180) ring(to, 8 + k.ease(k.clamp((e - 180) / 240)) * 13, 8, WIND, 3, e > 500, e / 70);
    },
    air(s) {
      const e = s.c.t - k.CAST;
      if (e < 0 || e > 880) return;
      const points = [
        k.P(s.event.teleport?.from || s.pose.base || subject(s)),
        k.P(s.event.teleport?.to || s.pose.target || subject(s)),
      ];
      points.forEach((C, j) => {
        const t = e - j * 180;
        if (t < 0 || t > (j ? 650 : 270)) return;
        const q = k.clamp(t / (j ? 650 : 270)),
          r = j ? 7 + k.ease(q) * 12 : 18 * (1 - q) + 2;
        for (let band = 0; band < 3; band++) {
          const y = C.y - band * 8 - (j ? q * 9 : 0);
          for (let i = 0; i < 14; i++) {
            const a = (i / 14) * k.tau + t / 65 + band;
            if (i % 7 > 4 || (q > 0.7 && i % 2)) continue;
            pixel(C.x + Math.cos(a) * r, y + Math.sin(a) * 4, WIND, i % 3 ? 3 : 5, 2);
          }
        }
      });
      impact(s, s.hits[0], { x: points[1].x, y: points[1].y - 10 }, WIND, 30, 10);
    },
  });

  // Phantasmal Force: a violet wire-cube contains a false fanged maw and a staring psychic eye.
  FX.register('phantasmal-force', {
    palette: MIND,
    travel: 260,
    beats: (e, kit, t) => beats(e, kit, t, 'hit', 100),
    end: () => k.CAST + 1050,
    ground(s) {
      const e = s.c.t - s.hits[0].at;
      if (e < 0 || e > 780) return;
      const p = corners(s),
        C = aim(s);
      const poly =
        p.length === 4
          ? p
          : [
              { x: C.x - 16, y: C.y - 10 },
              { x: C.x + 16, y: C.y - 10 },
              { x: C.x + 16, y: C.y + 10 },
              { x: C.x - 16, y: C.y + 10 },
            ];
      // One cached frame per cube size and height; the floor stays transparent.
      const height = Math.round(18 * k.back(k.clamp(e / 160)));
      const x0 = Math.floor(Math.min(...poly.map(v => v.x))) - 3,
        y0 = Math.floor(Math.min(...poly.map(v => v.y))) - height - 3;
      const w = Math.ceil(Math.max(...poly.map(v => v.x)) - x0) + 4,
        h = Math.ceil(Math.max(...poly.map(v => v.y)) - y0) + 4;
      const local = poly.map(v => ({ x: Math.round(v.x - x0), y: Math.round(v.y - y0) }));
      const key = local.map(v => `${v.x},${v.y}`).join(':');
      const img = k.sprite(`14:phantasm:${key}:${height}:${e > 580}`, w, h, MIND, set => {
        function edge(a, b, index) {
          const n = Math.ceil(Math.hypot(a.x - b.x, a.y - b.y));
          for (let i = 0; i <= n; i++)
            if (!(e > 580 && i % 4 < 2))
              set(k.mix(a.x, b.x, i / Math.max(1, n)), k.mix(a.y, b.y, i / Math.max(1, n)), index);
        }
        local.forEach((a, i) => {
          const b = local[(i + 1) % 4],
            up = { x: a.x, y: a.y - height };
          edge(a, b, 2);
          edge(up, { x: b.x, y: b.y - height }, 3);
          edge(a, up, 4);
        });
      });
      k.blit(img, x0, y0);
    },
    air(s) {
      const C = aim(s),
        p = corners(s);
      if (p.length === 4) {
        C.x = p.reduce((v, a) => v + a.x, 0) / 4;
        C.y = p.reduce((v, a) => v + a.y, 0) / 4;
      }
      mote(s, C, MIND);
      const e = s.c.t - s.hits[0].at;
      if (e >= 0 && e < 750) {
        const mouth = [
          '...222222222...',
          '..23333333332..',
          '.2344444444432.',
          '2345.5.5.5.5432',
          '233.........332',
          '.23.5.5.5.5.32.',
          '..23344444332..',
          '...222222222...',
        ];
        stamp('phantasm-maw', mouth, MIND, { x: C.x, y: C.y - 3 });
        stamp('mind-eye', EYE, MIND, { x: C.x, y: C.y - 17 + Math.sin(e / 90) * 2 });
      }
      s.hits.forEach((hit, i) => impact(s, hit, k.P(subject(s, hit)), MIND, 24, 4, i));
    },
  });

  // Gift of Gab: spoken words rewind into the mouth, then a fresh gold speech bubble replaces them.
  FX.register('gift-of-gab', {
    palette: GOLD,
    travel: 260,
    beats,
    end: () => k.CAST + 960,
    air(s) {
      const e = s.c.t - k.CAST;
      if (e < 0 || e > 920) return;
      const C = k.P(s.pose.hand || s.pose.base || subject(s));
      const old = e < 260,
        q = k.clamp(e / 260);
      const B = { x: C.x + (old ? 21 * (1 - q) : 12), y: C.y - 13 };
      const bubble = old
        ? ['.333333333.', '34444444443', '34.22.22.43', '34444444443', '.333333333.', '...33......', '..3........']
        : ['.333333333.', '34444444443', '345.5.5.543', '34444444443', '.333333333.', '...33......', '..3........'];
      if (e < 730) stamp(old ? 'old-words' : 'new-words', bubble, old ? MIND : GOLD, B);
      if (old) {
        for (let j = 0; j < 2; j++) {
          const x = C.x + 5 + j * 6;
          line({ x: x + 3, y: C.y + 3 }, { x, y: C.y + 6 }, GOLD, 4);
          line({ x, y: C.y + 6 }, { x: x + 3, y: C.y + 9 }, GOLD, 4);
        }
      }
      impact(s, s.hits[0], { x: C.x + 12, y: C.y - 13 }, GOLD, 20, 5);
      if (e > 300 && e < 800)
        s.targets.slice(0, 4).forEach((t, i) => {
          const T = k.P(t);
          ring({ x: T.x, y: T.y - 9 }, 6, 3, GOLD, 3, true, e / 80 + i);
        });
    },
  });

  // Shatter: a silver-violet sonic implosion cracks into expanding pressure rings and sharp fragments.
  FX.register('shatter', {
    palette: THUNDER,
    travel: 160,
    beats: (e, kit, t) => beats(e, kit, t, 'blast', 160),
    end: () => k.CAST + 890,
    flash: (e, t) => (t < 30 ? { color: THUNDER[5], alpha: 0.24 } : t < 65 ? { color: THUNDER[0], alpha: 0.18 } : null),
    ground(s) {
      const e = s.c.t - s.hits[0].at,
        C = aim(s),
        R = ((s.area?.feet ?? 10) / (s.grid.feet || 5)) * k.PX;
      if (e < 0 || e > 680) return;
      for (let i = 0; i < 3; i++) {
        const t = e - i * 60;
        if (t < 0 || t > 400) continue;
        const q = t / 400;
        ring(C, R * (0.15 + 0.85 * k.ease(q)), R * (0.15 + 0.85 * k.ease(q)), THUNDER, q < 0.2 ? 5 : 3, q > 0.4, i);
      }
      const img = k.sprite(
        `14:shatter-cracks:${Math.round(R)}`,
        Math.ceil(R * 2 + 8),
        Math.ceil(R * 2 + 8),
        THUNDER,
        set => {
          for (let j = 0; j < 7; j++) {
            const a = (j / 7) * k.tau;
            for (let r = 3; r < R * 0.82; r++) {
              const bend = Math.floor(r / 5) % 2 ? 2 : -2;
              set(
                R + 4 + Math.cos(a) * r - Math.sin(a) * bend,
                R + 4 + Math.sin(a) * r + Math.cos(a) * bend,
                r < R * 0.45 ? 4 : 2,
              );
            }
          }
        },
      );
      if (e > 50 && e < 600) k.blit(img, C.x - img.width / 2, C.y - img.height / 2);
    },
    air(s) {
      const C = aim(s),
        t = s.c.t - k.CAST;
      if (t >= 0 && t < 160) {
        const r = 13 * (1 - t / 160) + 2;
        ring(C, r, r, THUNDER, 4);
        stamp('shatter-crystal', CRYSTAL, THUNDER, C);
      }
      impact(s, s.hits[0], C, THUNDER, 52, 14);
      s.hits.forEach((hit, i) => {
        if (hit.id != null) impact(s, hit, k.P(subject(s, hit)), THUNDER, 24, 4, i + 1);
      });
    },
  });

  // Rime's Binding Ice: a cold blue cone rushes out from its apex and freezes into jagged ankle cuffs.
  FX.register('rimes-binding-ice', {
    palette: ICE,
    travel: 330,
    beats: (e, kit, t) => beats(e, kit, t, 'hit', 120),
    end: () => k.CAST + 1230,
    ground(s) {
      const e = s.c.t - k.CAST;
      if (e < 0 || e > 1180) return;
      const A = s.area || { ...(s.pose.base || subject(s)), dir: 0, feet: 30 };
      const C = k.P(A),
        L = ((A.feet || 30) / (s.grid.feet || 5)) * k.PX,
        dir = A.dir || 0;
      const q = k.clamp(e / 330),
        f = Math.min(7, Math.floor(q * 8)),
        late = e > 850;
      const W = Math.ceil(L * 2.5 + 10),
        mid = Math.floor(W / 2);
      const img = k.sprite(`14:rime-cone:${Math.round(L)}:${Math.round(dir * 1000)}:${f}:${late}`, W, W, ICE, set => {
        const reach = (L * (f + 1)) / 8;
        for (let y = 2; y < W - 2; y++)
          for (let x = 2; x < W - 2; x++) {
            const dx = x - mid,
              dy = y - mid,
              along = dx * Math.cos(dir) + dy * Math.sin(dir),
              side = -dx * Math.sin(dir) + dy * Math.cos(dir);
            // Angular fingers stay inside the supplied cone, with a serrated advancing edge.
            const finger = Math.abs(((side + 1200) % 12) - 6);
            const front = reach - finger * 1.7;
            if (along < 2 || along > front || Math.abs(side) > along / 2 - 1) continue;
            const branch = (side / Math.max(8, along)) * 10;
            const vein = (Math.abs(branch - Math.round(branch)) * along) / 10;
            const plate = Math.abs(((along + side * 0.8 + 1200) % 19) - 9.5);
            if (late) {
              if (vein < 0.8 || plate < 0.7) set(x, y, 2);
            } else if (along > front - 12) {
              set(x, y, along > front - 2 ? 4 : 3);
            } else if (vein < 0.9 || plate < 0.8) {
              set(x, y, 3);
            } else if (vein < 2.6 && plate < 7) {
              set(x, y, 1);
            }
          }
      });
      k.blit(img, C.x - mid, C.y - mid);
    },
    air(s) {
      const e = s.c.t - k.CAST;
      if (e >= 0 && e < 330) {
        const A = s.area || { ...(s.pose.base || subject(s)), dir: 0, feet: 30 },
          C = k.P(A);
        const L = ((A.feet || 30) / (s.grid.feet || 5)) * k.PX,
          d = A.dir || 0,
          q = e / 330;
        for (let i = 0; i < 15; i++) {
          const u = Math.max(0, q - k.hash(i, s.event.seed) * 0.22),
            side = (i / 14 - 0.5) * L * u;
          const T = {
            x: C.x + Math.cos(d) * L * u - Math.sin(d) * side,
            y: C.y + Math.sin(d) * L * u + Math.cos(d) * side - 3,
          };
          stamp('rime-crystal', CRYSTAL, ICE, T);
        }
      }
      s.hits.forEach((hit, i) => {
        const T = feet(subject(s, hit)),
          real = s.real(hit);
        impact(s, hit, { x: T.x, y: T.y - 5 }, ICE, 30, 7, i);
        if (real >= 0 && s.c.t < k.CAST + 1160) {
          for (let j = 0; j < 5; j++)
            stamp('ice-cuff', CRYSTAL, ICE, { x: T.x + (j - 2) * 4, y: T.y - 2 - (j % 2) * 3 });
        }
      });
    },
  });

  function blade(s, ramp, shadow) {
    const H = k.P(s.pose.hand || s.pose.base || subject(s)),
      e = s.c.t - k.CAST;
    if (e < 0 || e > 1040) return;
    const rows = shadow
      ? [
          '..........4..',
          '.........43..',
          '........432..',
          '.......4332..',
          '......4332...',
          '.....4332....',
          '....4332.....',
          '...4332......',
          '..4332.......',
          '.4332........',
          '..32.........',
          '.4444........',
          '..22.........',
          '..22.........',
        ]
      : [
          '..........5..',
          '.........54..',
          '........543..',
          '.......5432..',
          '......5432...',
          '.....5432....',
          '....5432.....',
          '...5432......',
          '..5432.......',
          '.5432........',
          '..43.........',
          '.4444........',
          '..22.........',
          '..22.........',
        ];
    const img = image(shadow ? 'shadow-blade' : 'flame-blade', rows, ramp);
    // The hilt stays in the caster's actual hand; the short snap settles into a held blade.
    const lean = e < 130 ? -0.4 * (1 - k.ease(e / 130)) : Math.sin(e / 130) * 0.025;
    k.blitRotated(img, H.x, H.y, lean, 0.21, 0.89);
    for (let i = 0; i < 7; i++) {
      const t = ((e + i * 47) % 320) / 320;
      const x = H.x + 2 + k.hash(i, s.event.seed) * 9 + (shadow ? -t * 5 : t * 2);
      const y = H.y - 4 - i * 1.5 - t * (shadow ? 7 : 13);
      if (e > 840 && i % 2) continue;
      pixel(x, y, ramp, shadow ? 2 + (i % 2) : 3 + (i % 3), shadow ? 2 : 1);
    }
    impact(s, s.hits[0], { x: H.x + 6, y: H.y - 8 }, ramp, 22, 6);
  }

  // Flame Blade: a white-hot curved scimitar snaps into the hand, shedding orange tongues and embers.
  FX.register('flame-blade', {
    palette: FIRE,
    travel: 60,
    beats: selfBeat,
    end: () => k.CAST + 1080,
    air: s => blade(s, FIRE, false),
  });

  // Shadow Blade: a solid black-violet psychic sword condenses from curling, inward-drawn darkness.
  FX.register('shadow-blade', {
    palette: SHADOW,
    travel: 90,
    beats: selfBeat,
    end: () => k.CAST + 1080,
    air: s => blade(s, SHADOW, true),
  });

  // Mirror Image: exactly three lavender humanoid doubles fan out and orbit the caster in lockstep.
  FX.register('mirror-image', {
    palette: ARCANE,
    travel: 100,
    beats: selfBeat,
    end: () => k.CAST + 1220,
    ground(s) {
      const e = s.c.t - k.CAST;
      if (e < 0 || e > 1150) return;
      const C = k.P(s.pose.base || subject(s)),
        q = k.ease(k.clamp(e / 180));
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * k.tau + e / 750;
        ring({ x: C.x + Math.cos(a) * 17 * q, y: C.y + Math.sin(a) * 8 * q }, 5, 2, ARCANE, 2);
      }
    },
    air(s) {
      const e = s.c.t - k.CAST;
      if (e < 0 || e > 1160) return;
      const C = k.P(s.pose.base || subject(s)),
        q = k.ease(k.clamp(e / 180));
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * k.tau + e / 750,
          x = C.x + Math.cos(a) * 17 * q,
          y = C.y + Math.sin(a) * 8 * q - 9;
        stamp('mirror-double', FIGURE, ARCANE, { x, y });
        if (e < 650) spark({ x: x + 7, y: y - 8 }, ARCANE, 2);
      }
      impact(s, s.hits[0], { x: C.x, y: C.y - 8 }, ARCANE, 24, 6);
    },
  });

  // Hold Person: gold bands clamp the wrists and ankles; a locked sigil snaps shut over the head.
  FX.register('hold', {
    palette: GOLD,
    travel: 200,
    beats: (e, kit, t) => beats(e, kit, t, 'hit', 110),
    end: () => k.CAST + 1120,
    ground(s) {
      const e = s.c.t - s.hits[0].at;
      if (e < 0 || e > 850) return;
      s.targets.forEach(t => ring(feet(t), 11, 6, GOLD, 3, true));
    },
    air(s) {
      mote(s, k.P(subject(s)), GOLD);
      s.hits.forEach((hit, i) => {
        const T = k.P(subject(s, hit)),
          e = s.c.t - hit.at;
        impact(s, hit, T, GOLD, 28, 5, i);
        if (e < 0 || e > 850) return;
        const clamp = 9 * (1 - k.ease(k.clamp(e / 100)));
        for (let j = 0; j < 3; j++) ring({ x: T.x, y: T.y - 5 + j * 6 }, 8 + clamp, 2, GOLD, 4);
        stamp(
          'hold-lock',
          ['...333...', '..34443..', '..34.43..', '.3333333.', '.3444443.', '.3442443.', '.3442443.', '.3333333.'],
          GOLD,
          { x: T.x, y: T.y - 17 },
        );
      });
    },
  });

  // Invisibility: a silver silhouette is erased bottom-to-top, leaving four empty outline corners.
  FX.register('invisibility', {
    palette: WIND,
    travel: 180,
    beats,
    end: () => k.CAST + 980,
    air(s) {
      s.hits.forEach((hit, i) => {
        const T = k.P(subject(s, hit)),
          e = s.c.t - k.CAST;
        if (e < 0 || e > 920) return;
        const f = Math.min(8, Math.floor(e / 65));
        const img = k.sprite(`14:invisible:${f}`, 17, 18, WIND, set => {
          FIGURE.forEach((row, y) =>
            [...row].forEach((v, x) => {
              if (v !== '.' && y < 16 - f * 2 && (x + y) % 3 !== 0) set(x + 1, y + 1, +v > 3 ? 4 : 2);
            }),
          );
        });
        k.blit(img, T.x - 8, T.y - 10);
        const sweep = { x: T.x, y: T.y + 7 - Math.min(1, e / 520) * 20 };
        if (e < 530) ring(sweep, 9, 2, WIND, 4, true, e / 65);
        if (e > 420 && e < 830) {
          const rows = [
            '33.........33',
            '3...........3',
            '.............',
            '.............',
            '.............',
            '3...........3',
            '33.........33',
          ];
          stamp('empty-outline', rows, WIND, T);
        }
        impact(s, hit, { x: T.x, y: T.y - 8 }, WIND, 20, 5, i);
      });
    },
  });

  // Summon Beast: a green paw-print seal opens and a fanged, long-tailed woodland spirit bounds out.
  FX.register('summon-beast', {
    palette: BEAST,
    travel: 250,
    beats: (e, kit, t) => [{ at: kit.CAST + t, stop: 90, target: null, kind: 'soft', power: 0 }],
    end: () => k.CAST + 1250,
    ground(s) {
      const e = s.c.t - k.CAST,
        C = aim(s);
      if (e < 0 || e > 1180) return;
      ring(C, 18, 10, BEAST, 3, true, e / 90);
      if (e < 500)
        stamp(
          'beast-paw',
          ['.44.....44.', '4444...4444', '.44.444.44.', '...44444...', '..4444444..', '..4444444..', '...44.44...'],
          BEAST,
          C,
        );
    },
    air(s) {
      const e = s.c.t - s.hits[0].at,
        C = aim(s);
      impact(s, s.hits[0], C, BEAST, 38, 10);
      if (e < 0 || e > 940) return;
      const q = k.clamp(e / 240),
        hop = Math.sin(q * Math.PI) * 9;
      stamp('summoned-wolf', WOLF, BEAST, { x: C.x + 5 * k.ease(q), y: C.y - 8 - hop });
      if (e > 240 && e < 800) {
        pixel(C.x - 7, C.y - 18, BEAST, 5);
        pixel(C.x + 1, C.y - 18, BEAST, 5);
      }
    },
  });

  // Jim's Glowing Coin: a spinning gold coin arcs to the floor, bounces and draws watching eyes.
  FX.register('jims-glowing-coin', {
    palette: GOLD,
    travel: 360,
    beats,
    end: () => k.CAST + 1200,
    ground(s) {
      const e = s.c.t - s.hits[0].at;
      if (e >= 0 && e < 780) ring(aim(s), 9 + k.ease(k.clamp(e / 260)) * 10, 7, GOLD, 3, true, e / 80);
    },
    air(s) {
      const e = s.c.t - k.CAST,
        T = aim(s),
        H = k.P(s.pose.hand || subject(s));
      if (e < 0 || e > 1160) return;
      let C;
      if (e < 360) {
        const q = e / 360;
        C = { x: k.mix(H.x, T.x, q), y: k.mix(H.y, T.y, q) - Math.sin(q * Math.PI) * 22 };
      } else {
        const q = k.clamp((e - 360) / 230);
        C = { x: T.x, y: T.y - Math.abs(Math.sin(q * Math.PI * 2)) * 5 * (1 - q) };
      }
      const face = Math.floor(e / 65) % 4;
      const rows =
        face % 2
          ? ['.3.', '343', '353', '353', '343', '.3.']
          : ['..333..', '.34443.', '3445443', '3452543', '3445443', '.34443.', '..333..'];
      stamp(`coin:${face % 2}`, rows, GOLD, C);
      impact(s, s.hits[0], T, GOLD, 24, 7);
      if (e > 420 && e < 1080) {
        for (let j = 0; j < 3; j++) {
          const a = (j / 3) * k.tau + e / 650;
          spark({ x: C.x + Math.cos(a) * 11, y: C.y + Math.sin(a) * 8 - 3 }, GOLD, 2);
        }
        s.targets.slice(0, 3).forEach(t => {
          const B = k.P(t);
          stamp('coin-watching-eye', EYE, GOLD, { x: B.x, y: B.y - 15 });
        });
      }
    },
  });

  // Tasha's Mind Whip: a pink psychic filament lashes straight into the brow and cracks into thought shards.
  FX.register('tashas-mind-whip', {
    palette: MIND,
    travel: 150,
    beats: (e, kit, t) => beats(e, kit, t, 'hit', 110),
    end: () => k.CAST + 860,
    flash: (e, t) => (t < 30 ? { color: MIND[4], alpha: 0.12 } : null),
    air(s) {
      if (!s.pose.hand) return;
      const H = k.P(s.pose.hand),
        e = s.c.t - k.CAST;
      if (e < 0) return;
      s.hits.forEach((hit, i) => {
        const B = k.P(subject(s, hit)),
          T = { x: B.x, y: B.y - 7 };
        const dx = T.x - H.x,
          dy = T.y - H.y,
          L = Math.hypot(dx, dy) || 1;
        if (e < 360) {
          const reach = e < 150 ? k.ease(e / 150) : 1;
          const start = e < 240 ? 0 : k.clamp((e - 240) / 120);
          const amp = e < 150 ? 11 * (1 - reach * 0.8) : 2 * Math.max(0, 1 - (e - 150) / 100);
          const points = [];
          for (let j = 0; j <= 42; j++) {
            const q = k.mix(start, reach, j / 42),
              wave = Math.sin(q * Math.PI * 3 - e / 28) * amp * q;
            points.push({ x: H.x + dx * q - (dy / L) * wave, y: H.y + dy * q + (dx / L) * wave });
          }
          for (const [color, width] of [
            [MIND[0], 5],
            [MIND[2], 3],
            [MIND[4], 1],
          ])
            points.forEach(p => k.dot(p.x, p.y, color, width));
        }
        impact(s, hit, T, MIND, 36, 8, i);
        const real = s.real(hit);
        if (real >= 90 && real < 600) {
          ring({ x: T.x, y: T.y - 4 }, 10, 5, MIND, 3, true, real / 60);
          for (let j = 0; j < 3; j++) pixel(T.x - 7 + j * 7, T.y - 12 - Math.sin(real / 70 + j) * 2, MIND, 4);
        }
      });
    },
  });

  // Levitate: lilac lifting rings stack upward, carrying a weightless silhouette above its ground shadow.
  FX.register('levitate', {
    palette: ARCANE,
    travel: 180,
    beats,
    end: () => k.CAST + 1260,
    ground(s) {
      const e = s.c.t - s.hits[0].at;
      if (e < 0 || e > 1020) return;
      s.hits.forEach(hit => {
        const C = feet(subject(s, hit));
        ring(C, 10 - 4 * k.ease(k.clamp(e / 400)), 3, SHADOW, 2);
        ring(C, 13, 7, ARCANE, 3, true, e / 90);
      });
    },
    air(s) {
      mote(s, k.P(subject(s)), ARCANE);
      s.hits.forEach((hit, i) => {
        const T = feet(subject(s, hit)),
          e = s.c.t - hit.at;
        impact(s, hit, { x: T.x, y: T.y - 4 }, ARCANE, 24, 5, i);
        if (e < 0 || e > 1020) return;
        const rise = k.ease(k.clamp(e / 380)) * 12,
          bob = e > 380 ? Math.sin(e / 100) * 1.5 : 0;
        if (e > 70) stamp('floating-figure', FIGURE, ARCANE, { x: T.x, y: T.y - 10 - rise + bob });
        for (let j = 0; j < 3; j++) {
          const u = ((e + j * 140) % 460) / 460;
          ring({ x: T.x, y: T.y - u * (rise + 8) }, 10 - u * 4, 3, ARCANE, j === 0 ? 4 : 3, true, j * 2);
        }
      });
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
