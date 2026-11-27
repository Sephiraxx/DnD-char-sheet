/* Pixel spells, batch 19: mist, hidden wards, conversations and conjured visitors. */
(function (root) {
  'use strict';
  const FX = root.BoardPixelFX;
  if (!FX) return;
  const k = FX.kit;
  const MIST = ['#172331', '#3b5668', '#7094a5', '#a9cbd5', '#e2f1ef', '#ffffff'];
  const MIND = ['#211431', '#53326e', '#9654ac', '#d596e0', '#f6d8f9', '#ffffff'];
  const WATER = ['#102537', '#20557e', '#368db5', '#73cee1', '#d5f8fa', '#ffffff'];
  const STONE = ['#242129', '#514b52', '#817a7c', '#b5ac9e', '#e3dac0', '#ffffff'];
  const GOLD = ['#2d1c17', '#805024', '#be8a31', '#efc75a', '#fff0b3', '#ffffff'];
  const LEAF = ['#142719', '#30582d', '#5a913b', '#a0c95c', '#e0edaa', '#ffffff'];
  const DEAD = ['#19202c', '#364956', '#617d83', '#9dc5bd', '#def1dc', '#ffffff'];
  const IMAGE = ['#201632', '#51347d', '#8b65ba', '#c69aea', '#f4d8ff', '#ffffff'];
  const VEIL = ['#191c30', '#3c4365', '#737f9b', '#b6c4d8', '#edf2fc', '#ffffff'];
  const SHADOW = ['#0e1424', '#23233b', '#41405c', '#747695', '#b1dee8', '#ffffff'];
  const FEY = ['#142b28', '#285e51', '#549c73', '#a0d98c', '#f5dfae', '#ffffff'];

  const seed = s => s.event.seed || 0;
  const add = (p, x, y) => ({ x: p.x + x, y: p.y + y });
  const end = tail => (event, travel) => k.CAST + travel + tail;
  function beats(event, kit, travel, kind = 'soft', stop = 70) {
    return (event.targets?.length ? event.targets : [null]).map(target => ({
      at: kit.CAST + travel,
      stop,
      target,
      kind,
      power: kind === 'soft' ? 0 : 0.08,
    }));
  }
  function subject(s, hit = s.hits[0]) {
    return s.targets.find(t => t.id === hit?.id) || s.targets[0] || s.pose.target || s.pose.base || { x: 0, y: 0 };
  }
  const feet = t => k.P({ x: t.baseX ?? t.x, y: t.baseY ?? t.y });
  const centre = s => k.P(s.area || s.pose.target || subject(s));
  const radius = (s, fallback) => Math.max(4, Math.round(((s.area?.feet ?? fallback) / (s.grid.feet || 5)) * k.PX));
  function pixel(C, ramp, index = 3, size = 1) {
    k.dot(C.x, C.y, ramp[0], size + 2);
    k.dot(C.x, C.y, ramp[index], size);
  }
  function ball(C, r, ramp, index = 3) {
    k.disc(C.x, C.y, r + 1, ramp[0]);
    k.disc(C.x, C.y, r, ramp[index]);
  }
  function line(A, B, ramp, index = 3, width = 1, cap = 24) {
    const len = Math.hypot(B.x - A.x, B.y - A.y);
    const n = Math.max(1, Math.min(cap, Math.ceil(len / 2)));
    const w = Math.max(width, Math.ceil(len / n));
    for (const [color, size] of [
      [ramp[0], w + 2],
      [ramp[index], w],
    ])
      for (let i = 0; i <= n; i++) k.dot(k.mix(A.x, B.x, i / n), k.mix(A.y, B.y, i / n), color, size);
  }
  function ring(C, rx, ry, ramp, index = 3, gaps = 0) {
    rx = Math.max(1, Math.round(rx));
    ry = Math.max(1, Math.round(ry));
    const img = k.sprite(`19:ring:${ramp[0]}:${rx}:${ry}:${index}:${gaps}`, rx * 2 + 6, ry * 2 + 6, ramp, set => {
      const n = Math.ceil(k.tau * Math.max(rx, ry) * 1.5);
      for (let i = 0; i < n; i++) {
        if (gaps && Math.floor((i / n) * gaps * 2) % 2) continue;
        const a = (i / n) * k.tau;
        set(rx + 3 + Math.cos(a) * rx, ry + 3 + Math.sin(a) * ry, index);
      }
    });
    k.blit(img, C.x - rx - 3, C.y - ry - 3);
  }
  function stamp(key, rows, ramp, C) {
    const w = Math.max(...rows.map(row => row.length)) + 2;
    const img = k.sprite(`19:${key}:${ramp[0]}`, w, rows.length + 2, ramp, set => {
      rows.forEach((row, y) =>
        [...row].forEach((v, x) => {
          if (v !== '.') set(x + 1, y + 1, +v);
        }),
      );
    });
    k.blit(img, C.x - w / 2, C.y - img.height / 2);
  }
  function impact(s, hit, C, ramp, size = 22, count = 5, salt = 0) {
    const e = s.real(hit);
    k.drawHit(
      k.hitStyle(`19:${s.event.id}:${ramp[0]}:${size}`, ramp, { S: size, spikes: 4, minor: 4, jag: 0.25 }),
      C,
      e,
    );
    k.shards(C, e, ramp, seed(s) + salt * 41, count, size * 0.7);
  }
  function delivery(s, hit, C, ramp) {
    if (!s.pose.hand || s.c.t < k.CAST || s.c.t >= hit.at) return;
    const H = k.P(s.pose.hand),
      q = (s.c.t - k.CAST) / Math.max(1, hit.at - k.CAST);
    for (let i = 5; i >= 0; i--) {
      const u = q - i * 0.055;
      if (u < 0) continue;
      pixel({ x: k.mix(H.x, C.x, u), y: k.mix(H.y, C.y, u) - Math.sin(u * Math.PI) * 6 }, ramp, i ? 3 : 5, i ? 1 : 3);
    }
  }
  function motes(s, C, e, ramp, n = 8, spread = 18) {
    if (e < 0 || e > 650) return;
    const q = e / 650;
    for (let i = 0; i < n; i++) {
      if (q > 0.75 && i % 2) continue;
      const a = k.hash(i, seed(s), 1) * k.tau;
      pixel(add(C, Math.cos(a) * spread * (0.3 + q), Math.sin(a) * spread * 0.45 - q * 12), ramp, i % 3 ? 3 : 4);
    }
  }
  function seals(s, ramp) {
    const e = s.c.t - s.hits[0].at;
    if (e < 0 || e >= 720) return;
    for (const hit of s.hits)
      ring(feet(subject(s, hit)), 10 + k.ease(k.clamp(e / 180)) * 4, 6, ramp, e < 550 ? 3 : 2, e > 550 ? 8 : 0);
  }
  const GEM = ['....4....', '...454...', '..34543..', '.3345433.', '..23432..', '...232...', '....2....'];
  const EYE = ['...33333...', '.334444433.', '34441314443', '.334444433.', '...33333...'];
  const SKULL = [
    '..3333333..',
    '.344444443.',
    '34444444443',
    '34411411443',
    '.344434443.',
    '..3433343..',
    '..3434343..',
    '...33333...',
  ];
  const FLOWER = [
    '...44.44...',
    '..4344434..',
    '.433454334.',
    '..4344434..',
    '...44.44...',
    '.....3.....',
    '...233.....',
    '..2333.....',
    '.....3.....',
  ];
  const PERSON = [
    '....333....',
    '...34443...',
    '...34443...',
    '....333....',
    '..3333333..',
    '.33.343.33.',
    '.3..343..3.',
    '....343....',
    '....333....',
    '...33.33...',
    '...3...3...',
    '..33...33..',
  ];

  // Gaseous Form: silver-blue bands loosen into a hovering, scalloped mist cloud and thread through a crack.
  FX.register('gaseous-form', {
    palette: MIST,
    travel: 180,
    beats,
    end: end(900),
    ground: s => seals(s, MIST),
    air(s) {
      s.hits.forEach((hit, i) => {
        const C = k.P(subject(s, hit)),
          e = s.c.t - hit.at;
        delivery(s, hit, C, MIST);
        if (e < 0 || e > 900) return;
        const f = Math.min(8, Math.floor(e / 100));
        const img = k.sprite(`19:mist:${f}`, 51, 37, MIST, set => {
          const puffs = [
            [-12, 2, 7],
            [-4, -5, 10],
            [7, -3, 9],
            [14, 4, 6],
            [1, 5, 9],
          ];
          for (let y = 2; y < 35; y++)
            for (let x = 2; x < 49; x++) {
              let depth = -1;
              for (const [dx, dy, r] of puffs)
                depth = Math.max(
                  depth,
                  1 - Math.hypot(x - 25 - dx - Math.round(Math.sin(f + dy) * 2), y - 18 - dy) / r,
                );
              if (depth <= 0) continue;
              if (f < 3 && (y + f * 2) % 7 > 3) continue;
              if (f > 6 && x < (f - 6) * 6) continue;
              set(x, y, depth > 0.6 ? 4 : depth > 0.25 ? 3 : 2);
            }
        });
        k.blit(img, C.x - 25 + Math.max(0, f - 5) * 2, C.y - 18 - Math.min(4, f));
        for (let j = 0; j < 3; j++) {
          const a = e / 160 + j * 2;
          ring(add(C, Math.sin(a) * 5, 8 - j * 7 - e / 160), 12 + j * 2, 3, MIST, 4, 5);
        }
        impact(s, hit, C, MIST, 22, 5, i);
      });
    },
  });

  // Intellect Fortress: three mental sparks lock into a violet battlement around a protected mind.
  FX.register('intellect-fortress', {
    palette: MIND,
    travel: 220,
    beats,
    end: end(780),
    ground: s => seals(s, MIND),
    air(s) {
      s.hits.forEach((hit, i) => {
        const C = add(k.P(subject(s, hit)), 0, -11),
          e = s.c.t - hit.at;
        delivery(s, hit, C, MIND);
        if (e < 0 || e > 780) return;
        const q = k.ease(k.clamp(e / 180));
        const img = k.sprite('19:mind-fortress', 37, 27, MIND, set => {
          for (let y = 3; y < 24; y++)
            for (let x = 3; x < 34; x++) {
              const edge = x < 6 || x > 30;
              if (
                (y < 8 && Math.floor((x - 3) / 4) % 2 === 0) ||
                (y >= 8 && y < 12) ||
                (edge && y >= 8 && y < 21) ||
                (y >= 21 && x > 5 && x < 31)
              )
                set(x, y, y < 10 ? 4 : x < 18 ? 3 : 2);
            }
          for (let j = 0; j < 7; j++) {
            set(15 + j, 15, 4);
            set(18, 12 + j, 4);
            if (j % 2 === 0) {
              set(13, 13 + j, 3);
              set(23, 13 + j, 3);
            }
          }
        });
        k.blit(img, C.x - 18, C.y - 14 - Math.round(q * 3));
        for (let j = 0; j < 3; j++) {
          const a = -Math.PI / 2 + (j * k.tau) / 3;
          ball(add(C, Math.cos(a) * (24 - q * 6), Math.sin(a) * 14), 2, MIND, 4);
        }
        impact(s, hit, C, MIND, 26, 6, i);
      });
    },
  });

  // Freedom of the Waves: a turquoise cylinder crests in white foam, slams down, then drains into rings.
  FX.register('freedom-of-the-waves', {
    palette: WATER,
    travel: 280,
    beats: (event, kit, travel) => beats(event, kit, travel, 'blast', 150),
    end: end(1040),
    reach: (event, grid) => ({
      r: (event.area?.feet || 15) / (grid.feet || 5) + 0.8,
      up: (event.area?.height || 10) / (grid.feet || 5) + 1,
    }),
    flash: (event, e) => (e < 32 ? { color: WATER[4], alpha: 0.23 } : e < 70 ? { color: WATER[0], alpha: 0.16 } : null),
    ground(s) {
      const t = s.c.t - k.CAST;
      if (t < 0 || t > 1320) return;
      const C = centre(s),
        R = radius(s, 15),
        H = Math.round(((s.area?.height || 10) / (s.grid.feet || 5)) * k.PX);
      const e = s.real(s.hits[0]);
      const f = e < 0 ? Math.min(3, Math.floor(t / 70)) : 4 + Math.min(9, Math.floor(e / 95));
      const img = k.sprite(`19:wave:${R}:${H}:${f}`, R * 2 + 10, R * 2 + H + 10, WATER, set => {
        const cx = R + 5,
          cy = R + H + 5;
        const height = f < 4 ? H * (0.25 + f * 0.25) : f < 8 ? H * (1 - (f - 4) / 4) : 0;
        for (let y = 2; y < cy + R + 3; y++)
          for (let x = 2; x < R * 2 + 8; x++) {
            const dx = x - cx,
              dy = y - cy;
            const d = Math.hypot(dx, dy) / R;
            if (f >= 8) {
              if (d < 1 && Math.abs(d - (0.35 + (f - 8) * 0.12)) < 0.035) set(x, y, f < 11 ? 3 : 2);
              continue;
            }
            const front = Math.sqrt(Math.max(0, 1 - (dx / R) ** 2)) * R * 0.55;
            const crest = -height + Math.round(Math.sin(dx / 7 + f) * 3);
            if (Math.abs(dx) < R && dy > -front + crest && dy < front) {
              const foam = dy < -front + crest + 4 || (f > 4 && dy > front - 3);
              set(x, y, foam ? 4 : Math.floor((dy + height) / 7) % 3 === 0 ? 3 : dx < 0 ? 2 : 1);
            }
          }
      });
      k.blit(img, C.x - R - 5, C.y - R - H - 5);
      if (e >= 0 && e < 650)
        ring(
          C,
          R * (0.65 + 0.35 * k.ease(k.clamp(e / 500))),
          R * (0.65 + 0.35 * k.ease(k.clamp(e / 500))),
          WATER,
          e < 220 ? 4 : 2,
          e > 220 ? 12 : 0,
        );
    },
    air(s) {
      const C = centre(s),
        R = radius(s, 15),
        hit = s.hits[0],
        e = s.real(hit);
      s.hits.forEach((h, i) => impact(s, h, k.P(subject(s, h)), WATER, 36, 7, i));
      if (e >= 0 && e < 620) {
        for (let i = 0; i < 16; i++) {
          const a = k.hash(i, seed(s), 2) * k.tau,
            q = e / 620;
          if (q > 0.75 && i % 2) continue;
          pixel(
            add(C, Math.cos(a) * R * (0.5 + q * 0.45), Math.sin(a) * R * 0.6 - Math.sin(q * Math.PI) * 22 + q * q * 9),
            WATER,
            i % 3 ? 3 : 4,
            2,
          );
        }
      }
      // The caster briefly rides a small water crest: the spell also permits passage through the wave.
      if (s.pose.base && e >= 0 && e < 420) {
        const B = k.P(s.pose.base);
        ring(B, 10 + k.ease(e / 420) * 6, 5, WATER, 4, 6);
      }
    },
  });

  // Meld into Stone: a human-shaped seam sinks into banded rock; the seam closes and grit settles.
  FX.register('meld-into-stone', {
    palette: STONE,
    travel: 300,
    beats: (event, kit, travel) => [
      { at: kit.CAST + travel, stop: 95, target: event.caster ?? null, kind: 'soft', power: 0 },
    ],
    end: end(800),
    ground(s) {
      const e = s.c.t - k.CAST;
      if (e < 0 || e > 1100) return;
      const C = k.P(s.pose.base || subject(s)),
        f = Math.min(7, Math.floor(e / 135));
      const img = k.sprite(`19:meld:${f}`, 43, 47, STONE, set => {
        for (let y = 4; y < 44; y++)
          for (let x = 3; x < 40; x++) {
            const half = y < 11 ? 9 + y / 3 : y < 32 ? 18 : 18 - (y - 32) / 3;
            if (Math.abs(x - 21) > half) continue;
            const seam = y > 10 && y < 33 && Math.abs(x - 21) < (f < 4 ? 5 - f : 0);
            set(x, y, seam ? 1 : (y + Math.floor(x / 9) * 3) % 12 < 2 ? 2 : x < 22 ? 3 : 2);
          }
        if (f < 5)
          PERSON.forEach((row, y) =>
            [...row].forEach((v, x) => {
              if (v !== '.' && (x + y) % 5 >= f) set(16 + x, 12 + y * 2, f < 2 ? 4 : 2);
            }),
          );
      });
      k.blit(img, C.x - 21, C.y - 40);
      if (f < 5) ring(C, 18, 8, STONE, 3, 9);
    },
    air(s) {
      const C = k.P(s.pose.base || subject(s));
      impact(s, s.hits[0], add(C, 0, -9), STONE, 24, 8);
    },
  });

  // Galder's Tower: a square foundation assembles into two stone storeys, warm windows and a tiled roof.
  FX.register('galders-tower', {
    palette: STONE,
    travel: 520,
    beats: (event, kit, travel) => [{ at: kit.CAST + travel, stop: 110, target: null, kind: 'soft', power: 0 }],
    end: end(950),
    reach: () => ({ r: 2.3, up: 5 }),
    ground(s) {
      const e = s.c.t - k.CAST;
      if (e < 0 || e > 1470) return;
      const C = centre(s),
        f = Math.min(7, Math.floor(e / 100));
      // Keep the complete roof inside the engine's point-target buffer as well as its area buffer.
      const img = k.sprite(`19:tower:${f}`, 43, 53, STONE, set => {
        const top = f < 5 ? 48 - (f + 1) * 7 : 14;
        for (let y = Math.max(14, top); y < 49; y++)
          for (let x = 6; x < 37; x++) {
            const side = x > 28;
            const mortar = y % 6 === 0 || (x + (Math.floor(y / 6) % 2) * 4) % 8 === 0;
            set(x, y, mortar ? 1 : side ? 2 : 3);
            if ((x > 11 && x < 19 && y > 20 && y < 28) || (x > 11 && x < 19 && y > 35 && y < 43))
              set(x, y, x === 15 || y === 24 || y === 39 ? 1 : 4);
            if (x > 23 && x < 29 && y > 38) set(x, y, x === 27 && y === 44 ? 4 : 1);
          }
        if (f >= 5)
          for (let y = 4; y < 17; y++)
            for (let x = 3; x < 40; x++) {
              if (Math.abs(x - 21) < (y - 2) * 1.6) set(x, y, y % 4 === 0 ? 1 : x < 22 ? 3 : 2);
            }
        if (f >= 6) for (let y = 3; y < 13; y++) for (let x = 29; x < 34; x++) set(x, y, x === 29 ? 3 : 2);
      });
      k.blit(img, C.x - 21, C.y - 38);
      ring(add(C, 0, 9), 23, 10, GOLD, f < 5 ? 4 : 2, f < 5 ? 0 : 8);
    },
    air(s) {
      const C = centre(s),
        e = s.c.t - k.CAST;
      if (e >= 0 && e < 520)
        for (let i = 0; i < 8; i++) {
          const q = (e / 520 + i / 8) % 1,
            side = i % 2 ? 1 : -1;
          pixel(add(C, side * (29 - q * 14), -q * 32), STONE, i % 3 ? 3 : 4, 3);
        }
      impact(s, s.hits[0], C, STONE, 32, 10);
    },
  });

  // Glyph of Warding: angular explosive runes inscribe, trip, and burst into an elemental sphere.
  FX.register('glyph-of-warding', {
    palette: event => k.paletteFor(event),
    travel: 440,
    beats: (event, kit, travel) => beats(event, kit, travel, 'blast', 160),
    end: end(850),
    flash: (event, e) =>
      e < 35
        ? { color: k.paletteFor(event)[4], alpha: 0.26 }
        : e < 80
          ? { color: k.paletteFor(event)[0], alpha: 0.2 }
          : null,
    ground(s) {
      const t = s.c.t - k.CAST;
      if (t < 0 || t > 1290) return;
      const C = centre(s),
        R = radius(s, 20),
        ramp = s.ramp,
        e = s.real(s.hits[0]);
      const r = e < 0 ? Math.min(16, R * 0.65) : R * (0.15 + 0.85 * k.ease(k.clamp(e / 300)));
      ring(C, r, r, ramp, e < 90 ? 4 : 2, e > 260 ? 12 : 0);
      if (e < 160) {
        const img = k.sprite(`19:glyph:${ramp.join(':')}:${Math.min(3, Math.floor(t / 110))}`, 35, 35, ramp, set => {
          const stage = Math.min(3, Math.floor(t / 110));
          for (let j = 0; j < 4; j++) {
            if (j > stage) continue;
            const a = (j * Math.PI) / 2;
            for (let l = -7; l <= 7; l++) {
              set(
                17 + Math.cos(a) * l - Math.sin(a) * (8 - Math.abs(l) / 2),
                17 + Math.sin(a) * l + Math.cos(a) * (8 - Math.abs(l) / 2),
                4,
              );
              if (Math.abs(l) < 5)
                set(17 + Math.cos(a) * l - Math.sin(a) * 13, 17 + Math.sin(a) * l + Math.cos(a) * 13, 3);
            }
          }
          set(17, 17, 5);
        });
        k.blit(img, C.x - 17, C.y - 17);
      }
      if (e >= 0 && e < 600) {
        const f = Math.min(7, Math.floor(e / 75));
        const img = k.sprite(`19:glyph-burst:${R}:${ramp.join(':')}:${f}`, R * 2 + 8, R * 2 + 8, ramp, set => {
          const c = R + 4;
          for (let y = 2; y < c * 2 - 2; y++)
            for (let x = 2; x < c * 2 - 2; x++) {
              const dx = (x - c) / R,
                dy = (y - c) / R,
                d = Math.hypot(dx, dy);
              const edge = 0.25 + f * 0.11;
              if (d > edge || d < Math.max(0, edge - (f < 3 ? 0.24 : 0.1))) continue;
              if (f > 4 && Math.floor((Math.atan2(dy, dx) + k.tau) * 10) % 3 === 0) continue;
              set(x, y, f < 2 ? 4 : f < 4 ? 3 : 2);
            }
        });
        k.blit(img, C.x - R - 4, C.y - R - 4);
      }
    },
    air(s) {
      s.hits.forEach((hit, i) => impact(s, hit, k.P(subject(s, hit)), s.ramp, 38, 9, i));
      motes(s, centre(s), s.real(s.hits[0]) - 180, s.ramp, 10, radius(s, 20) * 0.65);
    },
  });

  // Speak with Plants: rooted leafy faces turn toward the caster and answer in little rustling speech marks.
  FX.register('speak-with-plants', {
    palette: LEAF,
    travel: 200,
    beats: (event, kit, travel) => [{ at: kit.CAST + travel, stop: 65, target: null, kind: 'soft', power: 0 }],
    end: end(1050),
    ground(s) {
      const e = s.c.t - k.CAST;
      if (e < 0 || e > 1250) return;
      const B = k.P(s.pose.base || subject(s));
      ring(B, 10 + k.ease(k.clamp(e / 500)) * 13, 7 + k.ease(k.clamp(e / 500)) * 9, LEAF, 3, 8);
      for (let j = 0; j < 3; j++) {
        const C = add(B, (j - 1) * 16, j === 1 ? -24 : -8),
          f = Math.floor(e / 170 + j) % 2;
        stamp(
          `plant-face:${f}`,
          [
            '...33...33...',
            '..3443.3443..',
            '.34444344443.',
            '..344434443..',
            '...3434343...',
            f ? '...3454543...' : '...3414143...',
            '....34343....',
            f ? '....34443....' : '.....343.....',
            '.....343.....',
            '...3333333...',
          ],
          LEAF,
          C,
        );
        if (e > 260 && e < 1050) {
          const q = ((e - 260 + j * 160) % 650) / 650;
          stamp(
            'leaf-word',
            ['...3..', '..343.', '.3443.', '3443..', '.33...'],
            LEAF,
            add(C, (1 - q) * (B.x - C.x) * 0.35, -12 - q * 10),
          );
          pixel(add(C, 7, -10 - q * 8), LEAF, 4);
        }
      }
    },
    air(s) {
      const C = add(k.P(s.pose.base || subject(s)), 0, -17);
      impact(s, s.hits[0], C, LEAF, 20, 5);
    },
  });

  // Speak with Dead: pale grave mist opens a corpse's jaw; five question sparks become whispered replies.
  FX.register('speak-with-dead', {
    palette: DEAD,
    travel: 250,
    beats,
    end: end(1120),
    ground: s => seals(s, DEAD),
    air(s) {
      const hit = s.hits[0],
        C = k.P(subject(s)),
        e = s.c.t - hit.at;
      delivery(s, hit, C, DEAD);
      if (e < 0 || e > 1120) return;
      ring(add(C, 0, 8), 16, 6, DEAD, 2, 7);
      stamp('talking-skull', SKULL, DEAD, add(C, 0, -4));
      const jaw = Math.floor(e / 100) % 2;
      line(add(C, -3, 1 + jaw * 2), add(C, 3, 1 + jaw * 2), DEAD, 4, 1, 4);
      for (let j = 0; j < 5; j++) {
        const A = add(C, (j - 2) * 6, -22);
        ball(A, 1, DEAD, e > 180 + j * 150 ? 2 : 4);
        const real = s.real(hit) - 140 - j * 150;
        if (real >= 0 && real < 370) {
          const q = real / 370;
          stamp(
            'dead-word',
            ['.33333.', '3444443', '3434343', '.33333.', '..3....'],
            DEAD,
            add(C, 12 + q * 8, -7 - q * 15),
          );
        }
      }
      motes(s, C, s.real(hit), DEAD, 7, 14);
      impact(s, hit, C, DEAD, 24, 5);
    },
  });

  // Major Image: a violet cube traces its footprint and fills with a convincing, winged dragon illusion.
  FX.register('major-image', {
    palette: IMAGE,
    travel: 320,
    beats: (event, kit, travel) => [{ at: kit.CAST + travel, stop: 85, target: null, kind: 'soft', power: 0 }],
    end: end(1040),
    ground(s) {
      const t = s.c.t - k.CAST;
      if (t < 0 || t > 1360) return;
      let corners = s.area ? k.outline(s.area, s.grid) : [];
      const C = centre(s),
        side = radius(s, 20);
      corners =
        corners.length >= 4
          ? corners.slice(0, 4).map(p => k.P({ x: p[0], y: p[1] }))
          : [
              add(C, -side / 2, -side / 2),
              add(C, side / 2, -side / 2),
              add(C, side / 2, side / 2),
              add(C, -side / 2, side / 2),
            ];
      if (t < 780)
        for (let j = 0; j < 4; j++) {
          line(corners[j], corners[(j + 1) % 4], IMAGE, t < 320 ? 4 : 2, 1, 16);
          pixel(corners[j], IMAGE, 4, 2);
        }
      if (t < 240) return;
      const cx = corners.reduce((v, p) => v + p.x, 0) / 4;
      const cy = corners.reduce((v, p) => v + p.y, 0) / 4;
      const f = Math.min(3, Math.floor((t - 240) / 140));
      const img = k.sprite(`19:dragon-image:${f}`, 69, 62, IMAGE, set => {
        for (let y = 4; y < 57; y++)
          for (let x = 3; x < 66; x++) {
            if (f === 0 && y % 4 > 1) continue;
            const wing =
              y > 8 &&
              y < 34 &&
              Math.abs(x - 33) > 8 &&
              Math.abs(x - 33) < 28 - (y - 8) * 0.5 &&
              y > Math.abs(x - 33) * 0.55;
            const body = ((x - 34) / 12) ** 2 + ((y - 39) / 13) ** 2 < 1;
            const neck = y > 16 && y < 40 && x > 37 && x < 46;
            const head = y > 13 && y < 23 && x > 39 && x < 57;
            const legs = y > 46 && y < 56 && ((x > 24 && x < 30) || (x > 39 && x < 45));
            const tail = x > 9 && x < 27 && Math.abs(y - (48 - (27 - x) * 0.35)) < 3;
            if (wing || body || neck || head || legs || tail)
              set(x, y, wing ? ((x + y) % 9 < 2 ? 3 : 2) : x < 36 ? 3 : 2);
          }
        if (f > 0) {
          set(50, 17, 5);
          set(44, 10, 4);
          set(46, 11, 4);
        }
      });
      k.blit(img, cx - 34, cy - 42);
      // A brief scan seam reveals the conjured image without turning it into a damaging breath attack.
      if (t > 900 && t < 1170)
        line({ x: cx - 25, y: cy - 29 + (t - 900) / 9 }, { x: cx + 25, y: cy - 29 + (t - 900) / 9 }, IMAGE, 4, 1, 20);
    },
    air(s) {
      impact(s, s.hits[0], centre(s), IMAGE, 26, 6);
    },
  });

  // Incite Greed: a displayed golden gem sends fascination across the circle; golden glances stream inward.
  FX.register('incite-greed', {
    palette: GOLD,
    travel: 240,
    beats,
    end: end(1000),
    ground(s) {
      const e = s.c.t - k.CAST;
      if (e < 0 || e > 1240) return;
      const C = centre(s),
        R = radius(s, 30);
      ring(
        C,
        R * (0.15 + 0.85 * k.ease(k.clamp(e / 400))),
        R * (0.15 + 0.85 * k.ease(k.clamp(e / 400))),
        GOLD,
        e < 400 ? 4 : 2,
        e > 400 ? 16 : 0,
      );
      const H = k.P(s.pose.hand || s.pose.base || subject(s));
      s.hits.forEach(hit => {
        const T = feet(subject(s, hit));
        if (e > 240 && e < 1050)
          for (let j = 0; j < 3; j++) {
            const q = ((e - 240) / 600 + j / 3) % 1;
            pixel({ x: k.mix(T.x, H.x, q), y: k.mix(T.y, H.y, q) }, GOLD, 3);
          }
      });
    },
    air(s) {
      const e = s.c.t - k.CAST;
      if (e < 0 || e > 1240) return;
      const H = k.P(s.pose.hand || s.pose.base || subject(s));
      stamp('greed-gem', GEM, GOLD, add(H, 0, -5));
      if (e < 750) ring(add(H, 0, -5), 10 + (Math.floor(e / 90) % 3), 10, GOLD, 4, 4);
      s.hits.forEach((hit, i) => {
        const C = add(k.P(subject(s, hit)), 0, -11),
          real = s.real(hit);
        if (real >= 0 && e < 1130) {
          stamp('greedy-eye', EYE, GOLD, C);
          stamp('greedy-gem', GEM, GOLD, add(C, 0, -12));
        }
        impact(s, hit, C, GOLD, 22, 5, i);
      });
    },
  });

  // Nondetection: diamond dust seals a silver veil; a scrying eye strikes the veil and breaks apart.
  FX.register('nondetection', {
    palette: VEIL,
    travel: 200,
    beats,
    end: end(940),
    ground: s => seals(s, VEIL),
    air(s) {
      s.hits.forEach((hit, i) => {
        const C = k.P(subject(s, hit)),
          e = s.c.t - hit.at;
        delivery(s, hit, C, VEIL);
        if (e < 0 || e > 940) return;
        const f = Math.min(5, Math.floor(e / 150));
        const img = k.sprite(`19:veil:${f}`, 39, 43, VEIL, set => {
          for (let y = 3; y < 39; y++)
            for (let x = 3; x < 36; x++) {
              const dx = (x - 19) / 16,
                dy = (y - 22) / 19,
                d = Math.hypot(dx, dy);
              if (d > 0.88 && d < 1.02 && (f < 4 || (x + y) % 7 < 3)) set(x, y, x < 19 ? 4 : 3);
              if (f < 2 && Math.abs(y - (36 - f * 13)) < 1 && Math.abs(dx) < 0.8) set(x, y, 4);
            }
        });
        k.blit(img, C.x - 19, C.y - 22);
        if (e < 420) stamp('scrying-eye', EYE, VEIL, add(C, 21 - k.ease(k.clamp(e / 420)) * 7, -17));
        if (e >= 420 && e < 760) {
          const real = s.real(hit) - hit.stop - 420;
          k.shards(add(C, 14, -17), real, VEIL, seed(s) + i, 7, 15);
          line(add(C, 10, -22), add(C, 19, -13), VEIL, 4, 1, 7);
        }
        motes(s, C, s.real(hit), VEIL, 10, 18);
        impact(s, hit, C, VEIL, 22, 5, i);
      });
    },
  });

  // Blink: a silver silhouette splits into the Ethereal Plane, leaves an empty interval, then snaps back.
  FX.register('blink', {
    palette: VEIL,
    travel: 130,
    beats(event, kit, travel) {
      return [
        { at: kit.CAST + travel, stop: 75, target: event.caster ?? null, kind: 'soft', power: 0 },
        { at: kit.CAST + 720, stop: 90, target: event.caster ?? null, kind: 'soft', power: 0 },
      ];
    },
    end: () => 1490,
    ground(s) {
      const t = s.c.t - k.CAST;
      if (t < 0 || t > 1190) return;
      const from = k.P(s.event.teleport?.from || s.pose.base || subject(s));
      const to = k.P(s.event.teleport?.to || s.pose.base || subject(s));
      if (t < 390) ring(from, 12 + k.ease(k.clamp(t / 390)) * 7, 6, VEIL, 4, t > 200 ? 8 : 0);
      if (t > 650) ring(to, 19 - k.ease(k.clamp((t - 650) / 400)) * 7, 6, VEIL, 3, t > 1000 ? 8 : 0);
    },
    air(s) {
      const t = s.c.t - k.CAST;
      if (t < 0 || t > 1190) return;
      const A = add(k.P(s.event.teleport?.from || s.pose.base || subject(s)), 0, -12);
      const B = add(k.P(s.event.teleport?.to || s.pose.base || subject(s)), 0, -12);
      if (t < 280) {
        const d = Math.floor(t / 60) * 3;
        stamp('ethereal-person', PERSON, VEIL, add(A, -d, 0));
        stamp('ethereal-person', PERSON, VEIL, add(A, d, -1));
      } else if (t > 650 && t < 900) {
        const d = Math.max(0, 9 - Math.floor((t - 650) / 35));
        stamp('ethereal-person', PERSON, VEIL, add(B, d, 0));
        stamp('ethereal-person', PERSON, VEIL, add(B, -d, 0));
      }
      impact(s, s.hits[0], A, VEIL, 30, 7);
      impact(s, s.hits[1], B, VEIL, 30, 7, 1);
    },
  });

  // Summon Shadowspawn: black tears pool into a long-armed, misshapen biped with an icy stare and claws.
  FX.register('summon-shadowspawn', {
    palette: SHADOW,
    travel: 360,
    beats: (event, kit, travel) => [{ at: kit.CAST + travel, stop: 115, target: null, kind: 'soft', power: 0 }],
    end: end(1020),
    ground(s) {
      const t = s.c.t - k.CAST;
      if (t < 0 || t > 1380) return;
      const C = centre(s);
      const img = k.sprite(`19:shadow-pool:${Math.min(3, Math.floor(t / 120))}`, 49, 25, SHADOW, set => {
        for (let y = 2; y < 23; y++)
          for (let x = 2; x < 47; x++) {
            const d = ((x - 24) / 21) ** 2 + ((y - 12) / 9) ** 2;
            if (d < 1) set(x, y, d < 0.65 ? 1 : 2);
          }
      });
      k.blit(img, C.x - 24, C.y - 12);
      ring(C, 23, 10, SHADOW, t < 360 ? 3 : 2, 8);
    },
    air(s) {
      const C = centre(s),
        t = s.c.t - k.CAST,
        e = s.c.t - s.hits[0].at;
      if (t < 0 || t > 1380) return;
      if (t < 360)
        for (let j = 0; j < 5; j++) {
          const q = (t / 360 + j / 5) % 1;
          ball(add(C, (j - 2) * (9 - q * 7), -23 * (1 - q)), 2, SHADOW, 3);
        }
      if (t >= 200) {
        const f = Math.min(5, Math.floor((t - 200) / 100));
        const img = k.sprite(`19:shadowspawn:${f}`, 43, 51, SHADOW, set => {
          for (let y = 3; y < 47; y++)
            for (let x = 3; x < 40; x++) {
              if (y < 39 - f * 8) continue;
              const head = ((x - 22) / 6) ** 2 + ((y - 11) / 8) ** 2 < 1;
              const body = y > 16 && y < 33 && Math.abs(x - (22 - (y - 16) / 8)) < 8 - (y - 16) / 5;
              const arms =
                y > 18 && y < 39 && (Math.abs(x - (14 - (y - 18) / 3)) < 3 || Math.abs(x - (29 + (y - 18) / 4)) < 3);
              const legs =
                y > 30 && y < 47 && (Math.abs(x - (18 - (y - 30) / 6)) < 3 || Math.abs(x - (25 + (y - 30) / 4)) < 3);
              if (head || body || arms || legs) set(x, y, x < 21 ? 2 : 1);
              if (arms && y > 35 && x % 2 === 0) set(x, y, 4);
            }
          if (f > 2) {
            set(20, 11, 4);
            set(24, 10, 4);
            set(23, 15, 3);
          }
        });
        k.blit(img, C.x - 21, C.y - 37 + (e > 300 ? Math.floor(Math.sin(s.c.t / 180) * 1.5) : 0));
      }
      impact(s, s.hits[0], add(C, 0, -15), SHADOW, 34, 9);
      motes(s, C, s.real(s.hits[0]) - 180, SHADOW, 8, 22);
    },
  });

  // Summon Fey: a gilded flower opens a mushroom ring; a pointed-eared, leaf-cloaked swordsprite steps out.
  FX.register('summon-fey', {
    palette: FEY,
    travel: 340,
    beats: (event, kit, travel) => [{ at: kit.CAST + travel, stop: 90, target: null, kind: 'soft', power: 0 }],
    end: end(1000),
    ground(s) {
      const t = s.c.t - k.CAST;
      if (t < 0 || t > 1340) return;
      const C = centre(s);
      ring(C, 21, 10, FEY, t < 500 ? 4 : 2, 9);
      for (let j = 0; j < 7; j++) {
        const a = (j / 7) * k.tau;
        stamp(
          'mushroom',
          ['..444..', '.43334.', '4333334', '..343..', '..333..'],
          FEY,
          add(C, Math.cos(a) * 21, Math.sin(a) * 10),
        );
      }
    },
    air(s) {
      const C = centre(s),
        t = s.c.t - k.CAST;
      if (t < 0 || t > 1340) return;
      if (t < 340) stamp('gilded-flower', FLOWER, GOLD, add(C, 0, -9 - k.ease(k.clamp(t / 340)) * 8));
      if (t >= 230) {
        const f = Math.min(4, Math.floor((t - 230) / 90));
        const img = k.sprite(`19:fey:${f}`, 37, 43, FEY, set => {
          for (let y = 4; y < 39; y++)
            for (let x = 3; x < 34; x++) {
              if (y < 31 - f * 8) continue;
              const face = y > 8 && y < 16 && x > 14 && x < 23;
              const ears = y > 8 && y < 13 && ((x > 10 && x < 15) || (x > 22 && x < 27));
              const hair = y > 5 && y < 10 && x > 13 && x < 24;
              const cloak = y > 15 && y < 30 && Math.abs(x - 18) < 4 + (y - 15) * 0.4;
              const legs = y > 29 && y < 38 && (x === 15 || x === 16 || x === 21 || x === 22);
              if (face || ears) set(x, y, 4);
              else if (hair || cloak || legs) set(x, y, x < 18 ? 3 : 2);
              if (cloak && (x + y) % 9 === 0) set(x, y, 3);
            }
          if (f > 1) {
            set(17, 12, 1);
            set(21, 12, 1);
          }
          if (f > 2)
            for (let j = 0; j < 17; j++) {
              set(26 + Math.floor(j / 5), 28 - j, 4);
              if (j === 4) for (let l = -2; l <= 2; l++) set(26 + l, 24, 3);
            }
        });
        const step = t < 650 ? Math.round((1 - k.ease(k.clamp((t - 230) / 420))) * 7) : 0;
        k.blit(img, C.x - 18 + step, C.y - 35);
      }
      if (t > 340 && t < 1100)
        for (let j = 0; j < 5; j++) {
          const a = s.c.raw / 300 + (j * k.tau) / 5;
          stamp(
            'fey-petal',
            ['.4.', '434', '.3.'],
            j % 2 ? GOLD : FEY,
            add(C, Math.cos(a) * 19, -17 + Math.sin(a) * 11),
          );
        }
      impact(s, s.hits[0], add(C, 0, -12), FEY, 30, 8);
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
