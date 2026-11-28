/* Pixel spells, batch 46: large silhouettes, held glyphs and crisp contact beats. */
(function (root) {
  'use strict';
  const FX = root.BoardPixelFX;
  if (!FX) return;
  const k = FX.kit;
  const PINK = ['#300e30', '#74215e', '#c4479a', '#ff91d6', '#ffe495', '#fff9ee'];
  const GREEN = ['#142b18', '#326830', '#65ad38', '#b4f65a', '#e8ffb3', '#ffffff'];
  const GOLD = ['#34243c', '#7b5b36', '#c9a154', '#ffe095', '#fff5d9', '#ffffff'];
  const BLUE = ['#101b43', '#2944a1', '#568bf3', '#a3ddff', '#e1f7ff', '#ffffff'];
  const EARTH = ['#332317', '#76502a', '#b48842', '#efbd62', '#ffe6a3', '#fff8df'];
  const VIOLET = ['#281c44', '#654493', '#a17bd0', '#d7b9ff', '#f0e4ff', '#ffffff'];
  const HOT = ['#371b29', '#8e292b', '#d64b24', '#ff9738', '#ffe69a', '#fffefa'];
  const CALM = ['#243748', '#47778f', '#7ab1c6', '#b5e6ed', '#e5fbfa', '#ffffff'];
  const DARK = ['#180f2c', '#302044', '#614b88', '#bd8cff', '#ead3ff', '#ffffff'];

  const GLYPHS = {
    ha: ['100100110', '100101001', '111101111', '100101001', '100101001'],
    ankh: ['0011100', '0110110', '0110110', '0011100', '0001000', '1111111', '0001000', '0001000'],
    eye: ['00011111000', '01100000110', '11001110011', '10001110001', '11001110011', '01100000110', '00011111000'],
    drop: ['0001000', '0011100', '0011100', '0111110', '1111111', '1111111', '0111110'],
    star: [
      '000010000',
      '000111000',
      '000111000',
      '011111110',
      '111111111',
      '011111110',
      '000111000',
      '000111000',
      '000010000',
    ],
    note: ['001111', '001111', '001001', '001001', '001001', '111111', '111111'],
    mask: ['011111110', '110000011', '100101001', '100000001', '110101011', '011111110'],
    rune: ['000110000', '001111000', '011001100', '110000110', '011001100', '001111000', '000110000', '001111000'],
  };

  function glyph(name, pal, scale = 2) {
    const rows = GLYPHS[name];
    return k.sprite(
      '46:g:' + name + ':' + pal[3] + ':' + scale,
      rows[0].length * scale + 2,
      rows.length * scale + 2,
      pal,
      set => {
        rows.forEach((row, y) =>
          [...row].forEach((ch, x) => {
            if (ch !== '1') return;
            for (let j = 0; j < scale; j++)
              for (let i = 0; i < scale; i++) set(1 + x * scale + i, 1 + y * scale + j, y < 2 ? 5 : y < 4 ? 4 : 3);
          }),
        );
      },
    );
  }
  function stamp(img, p, alpha = 1) {
    k.blit(img, p.x - img.width / 2, p.y - img.height / 2, alpha);
  }
  function stroke(points, pal, width = 2, color = 4) {
    for (const [ink, size] of [
      [pal[0], width + 2],
      [pal[color], width],
    ])
      for (const p of points) k.dot(p.x, p.y, ink, size);
  }
  function line(a, b, pal, width = 2, color = 4) {
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 2));
    stroke(
      Array.from({ length: n + 1 }, (_, i) => ({ x: k.mix(a.x, b.x, i / n), y: k.mix(a.y, b.y, i / n) })),
      pal,
      width,
      color,
    );
  }
  function ring(rx, ry, pal, dashed = false) {
    rx = Math.max(2, Math.round(rx));
    ry = Math.max(2, Math.round(ry));
    return k.sprite('46:ring:' + rx + ':' + ry + ':' + pal[3] + ':' + dashed, rx * 2 + 8, ry * 2 + 8, pal, set => {
      for (let y = 1; y < ry * 2 + 7; y++)
        for (let x = 1; x < rx * 2 + 7; x++) {
          const dx = x - rx - 4,
            dy = y - ry - 4;
          const d = Math.hypot(dx / rx, dy / ry);
          if (Math.abs(d - 1) > 1.1 / Math.min(rx, ry)) continue;
          if (dashed && Math.floor((Math.atan2(dy, dx) + Math.PI) * 8) % 3 === 0) continue;
          set(x, y, dy < -ry * 0.4 ? 5 : dy < 0 ? 4 : 3);
        }
    });
  }
  function people(s) {
    if (s.targets.length) return s.targets;
    if (s.pose.target) return [s.pose.target];
    const t = caster(s);
    return t ? [t] : [];
  }
  function body(t) {
    return k.P(t);
  }
  function feet(t) {
    return k.P({ x: t.baseX ?? t.x, y: t.baseY ?? t.y + 0.62 });
  }
  function caster(s) {
    if (s.pose.base)
      return {
        id: s.event.caster,
        x: s.pose.base.x,
        y: s.pose.base.y - 0.62,
        baseX: s.pose.base.x,
        baseY: s.pose.base.y,
      };
    return s.pose.hand || s.pose.target;
  }
  function beats(event, at, stop = 80, kind = 'soft', self = false) {
    const ids = self ? [event.caster ?? null] : event.targets?.length ? event.targets : [null];
    return ids.map(target => ({ at, stop, target, kind, power: kind === 'soft' ? 0 : 0.065 }));
  }
  function hitFor(s, t) {
    return s.hits.find(h => h.id === t.id) || s.hits[0];
  }
  function impact(s, t, at, pal, size = 22, n = 6) {
    const hit = hitFor(s, t);
    if (!hit) return;
    const real = s.real(hit);
    k.drawHit(k.hitStyle('46:' + s.event.id, pal, { S: size, spikes: 4, jag: 0.16 }), at, real);
    k.shards(at, real, pal, (s.event.seed || 0) + 17, n, size * 0.65);
  }
  function deliver(s, t, at, pal) {
    if (s.c.t < k.CAST || s.c.t >= at || !s.pose.hand) return;
    const H = k.P(s.pose.hand),
      T = body(t),
      q = k.clamp((s.c.t - k.CAST) / (at - k.CAST));
    const points = [];
    for (let i = 6; i >= 0; i--) {
      const u = q - i * 0.04;
      if (u >= 0) points.push({ x: k.mix(H.x, T.x, u), y: k.mix(H.y, T.y, u) - Math.sin(u * Math.PI) * 8 });
    }
    stroke(points, pal, 2, 4);
    const p = points[points.length - 1];
    if (p) {
      k.disc(p.x, p.y, 4, pal[0]);
      k.disc(p.x, p.y, 3, pal[4]);
    }
  }
  function dust(s, t, hit, pal = EARTH) {
    const e = s.real(hit);
    if (e < 0 || e > 400) return;
    const F = feet(t),
      q = e / 400;
    stamp(ring(7 + 11 * k.ease(q), 3 + 4 * q, pal, q > 0.55), F, q > 0.7 ? 0.5 : 1);
    k.shards(F, e, pal, s.event.seed || 0, 7, 16);
  }
  function echo(pal) {
    return k.sprite('46:figure:' + pal[3], 15, 22, pal, set => {
      for (let y = 1; y < 21; y++)
        for (let x = 1; x < 14; x++) {
          const head = (x - 7) ** 2 + (y - 4) ** 2 <= 7;
          const torso = y >= 8 && y <= 14 && Math.abs(x - 7) <= 3;
          const arm = y >= 9 && y <= 12 && Math.abs(x - 7) <= 6;
          const leg = y >= 15 && ((x >= 3 && x <= 5) || (x >= 9 && x <= 11));
          if (head || torso || arm || leg) set(x, y, x < 7 ? 4 : 3);
        }
      set(6, 4, 1);
      set(9, 4, 1);
    });
  }
  function spiral(p, pal, phase, radius = 10, turns = 1.4) {
    const points = [];
    for (let i = 0; i < 26; i++) {
      const q = i / 25,
        a = phase + q * k.tau * turns;
      points.push({ x: p.x + Math.cos(a) * radius * q, y: p.y + Math.sin(a) * radius * q * 0.6 });
    }
    stroke(points, pal, 2, 3);
  }

  // Tasha's Hideous Laughter: huge HA bursts, a pink-gold helix and a toppling, shaking figure echo.
  FX.register('laughter', {
    palette: PINK,
    travel: 240,
    beats: event => beats(event, 540, 95),
    end: () => 1480,
    ground(s) {
      if (s.c.t < 470) return;
      for (const t of people(s)) stamp(ring(11, 5, PINK, s.c.t > 1120), feet(t), s.c.t > 1250 ? 0.5 : 1);
    },
    air(s) {
      for (const t of people(s)) {
        deliver(s, t, 540, PINK);
        if (s.c.t < 480) continue;
        const T = body(t),
          F = feet(t),
          e = s.c.t - 540;
        impact(s, t, T, PINK, 24);
        const sway = Math.sin(s.c.raw / 28) * (e < 650 ? 1.5 : 0.5);
        if (e >= 0 && e < 780) {
          const fall = k.ease(k.clamp(e / 240));
          k.blitRotated(echo(PINK), F.x + 4 * fall + sway, F.y - 1, (fall * Math.PI) / 2, 0.5, 0.94);
        }
        for (let j = 0; j < 2; j++) {
          const points = [];
          for (let i = 0; i < 22; i++) {
            const u = i / 21,
              a = u * k.tau + s.c.raw / 240 + j * Math.PI;
            points.push({ x: T.x + Math.cos(a) * 12, y: T.y - 5 + u * 12 + Math.sin(a) * 3 });
          }
          if (e < 680) stroke(points, PINK, 2, j ? 4 : 3);
        }
        if (e < 680) {
          stamp(glyph('ha', PINK), { x: T.x - 7 + sway, y: T.y - 13 - Math.sin(s.c.raw / 90) * 2 });
          stamp(glyph('ha', GOLD), { x: T.x + 9 - sway, y: T.y + 9 });
          for (const side of [-1, 1])
            for (let j = 0; j < 2; j++)
              line({ x: T.x + side * 13, y: T.y - 3 + j * 5 }, { x: T.x + side * 18, y: T.y - 6 + j * 8 }, PINK, 2, 4);
        } else stamp(glyph('ha', PINK, 1), { x: T.x + 8, y: T.y - 9 }, 0.5);
      }
    },
  });

  // Jump: a luminous spring coil launches a figure echo along an arc into a dusty landing.
  FX.register('jump', {
    palette: GREEN,
    travel: 190,
    beats: event => [...beats(event, 490, 70), ...beats(event, 1030, 85)],
    end: () => 1390,
    ground(s) {
      if (s.c.t < k.CAST) return;
      for (const t of people(s)) {
        const F = feet(t),
          e = s.c.t - k.CAST;
        if (e < 780) {
          const img = k.sprite('46:coil:' + Math.floor(k.clamp(e / 190) * 4), 29, 19, GREEN, set => {
            const h = 3 + Math.floor(k.clamp(e / 190) * 4);
            for (let i = 0; i < 100; i++) {
              const u = i / 99,
                a = u * k.tau * 2.7;
              const x = 14 + Math.cos(a) * 10,
                y = 13 - u * h + Math.sin(a) * 2;
              set(x, y, 3);
              set(x, y - 1, 4);
            }
          });
          stamp(img, { x: F.x, y: F.y - 2 }, e > 650 ? 0.5 : 1);
        }
        const hit = s.hits.find(h => h.at === 1030 && h.id === t.id) || s.hits.find(h => h.at === 1030);
        if (hit) dust(s, t, hit);
      }
    },
    air(s) {
      for (const t of people(s)) {
        deliver(s, t, 490, GREEN);
        const T = body(t),
          F = feet(t),
          e = s.c.t - 490;
        if (e < 0) continue;
        impact(s, t, F, GREEN, 20);
        if (e <= 540) {
          const q = k.clamp(e / 540);
          const at = u => ({ x: F.x + Math.sin(u * Math.PI * 2) * 5, y: F.y - Math.sin(u * Math.PI) * 23 });
          const points = [];
          for (let i = 0; i < 24; i++) {
            const u = q - i * 0.019;
            if (u >= 0) points.push(at(u));
          }
          stroke(points, GREEN, 3, 4);
          const p = at(q);
          k.blitRotated(echo(GREEN), p.x, p.y, -Math.sin(q * k.tau) * 0.25, 0.5, 0.94);
          if (q < 0.65)
            for (const side of [-1, 1])
              line({ x: T.x + side * 9, y: F.y - 6 }, { x: T.x + side * 11, y: F.y - 16 }, GREEN, 2, 3);
        } else {
          const hit = s.hits.find(h => h.at === 1030 && h.id === t.id) || s.hits.find(h => h.at === 1030);
          if (hit) {
            k.drawHit(k.hitStyle('46:jump-land', GREEN, { S: 23, spikes: 4 }), F, s.real(hit));
            k.shards(F, s.real(hit), EARTH, s.event.seed || 0, 6, 15);
          }
        }
      }
    },
  });

  // Sanctuary: a white-gold bubble closes around the whole figure, sealed by a radiant ankh.
  FX.register('sanctuary', {
    palette: GOLD,
    travel: 280,
    beats: event => beats(event, 580, 90),
    end: () => 1440,
    ground(s) {
      if (s.c.t < 380) return;
      for (const t of people(s)) stamp(ring(11, 5, GOLD), feet(t), s.c.t > 1220 ? 0.5 : 1);
    },
    air(s) {
      for (const t of people(s)) {
        deliver(s, t, 580, GOLD);
        if (s.c.t < 400) continue;
        const T = body(t),
          e = s.c.t - 580,
          phase = Math.min(4, Math.floor(k.clamp((s.c.t - 400) / 180) * 4));
        impact(s, t, T, GOLD, 19, 4);
        const bubble = k.sprite('46:bubble:' + phase, 29, 33, GOLD, set => {
          for (let y = 1; y < 32; y++)
            for (let x = 1; x < 28; x++) {
              const dx = (x - 14) / 11,
                dy = (y - 16) / 13,
                d = Math.hypot(dx, dy);
              if (y < 16 - phase * 4 && Math.abs(dx) < 0.72) continue;
              if (Math.abs(d - 1) < 0.1) set(x, y, dy < -0.2 ? 5 : dx < 0 ? 4 : 3);
              else if (d < 0.88 && d > 0.68 && dx < -0.48 && dy < -0.05) set(x, y, 4);
            }
        });
        stamp(bubble, { x: T.x, y: T.y - 1 }, e > 540 ? 0.5 : 1);
        if (e >= 0 && e < 670) stamp(glyph('ankh', GOLD), { x: T.x, y: T.y - 1 }, e > 520 ? 0.5 : 1);
      }
    },
  });

  // Witch Bolt: a thick blue-white forked lightning tether burns bright, then holds a quieter crackle.
  FX.register('witch-bolt', {
    palette: BLUE,
    travel: 60,
    beats: event => [...beats(event, 360, 105, 'beam'), ...beats(event, 760, 65, 'beam')],
    end: () => 1600,
    air(s) {
      if (s.c.t < k.CAST || !s.pose.hand) return;
      const t = people(s)[0];
      if (!t) return;
      const H = k.P(s.pose.hand),
        T = k.P(k.contact(t, s.pose.hand));
      const dx = T.x - H.x,
        dy = T.y - H.y,
        length = Math.hypot(dx, dy) || 1;
      const nx = -dy / length,
        ny = dx / length,
        tick = Math.floor(s.c.raw / 55),
        seed = s.event.seed || 0;
      const dim = s.c.t > 1080,
        points = [];
      const count = Math.max(12, Math.min(108, Math.ceil(length / 1.4)));
      for (let i = 0; i <= count; i++) {
        const u = i / count,
          knot = u * 14,
          index = Math.floor(knot);
        const offset =
          (k.mix(k.hash(index, tick, seed), k.hash(index + 1, tick, seed), knot - index) - 0.5) *
          (dim ? 5 : 11) *
          Math.sin(u * Math.PI);
        points.push({ x: H.x + dx * u + nx * offset, y: H.y + dy * u + ny * offset });
      }
      stroke(points, BLUE, dim ? 2 : 6, dim ? 3 : 2);
      if (!dim) {
        for (const p of points) k.dot(p.x, p.y, BLUE[3], 4);
        for (const p of points) k.dot(p.x, p.y, BLUE[5], 2);
      }
      for (let i = 0; i < 3; i++) {
        const p = points[Math.floor(count * (0.3 + i * 0.24))],
          side = i % 2 ? -1 : 1;
        const fork = [];
        for (let j = 0; j < 7; j++)
          fork.push({
            x: p.x + nx * side * j * 1.6 + (dx / length) * (j % 2) * 3,
            y: p.y + ny * side * j * 1.6 + (dy / length) * (j % 2) * 3,
          });
        stroke(fork, BLUE, dim ? 1 : 2, 4);
      }
      for (const hit of s.hits) {
        k.drawHit(k.hitStyle('46:witch', BLUE, { S: 29, spikes: 7, jag: 0.42 }), T, s.real(hit));
        k.shards(T, s.real(hit), BLUE, seed + hit.at, 9, 22);
      }
      if (s.c.t < 1370)
        for (let i = 0; i < 4; i++) {
          const a = (i * k.tau) / 4 + tick * 0.6,
            p = { x: T.x + Math.cos(a) * 8, y: T.y + Math.sin(a) * 10 };
          line(p, { x: p.x + Math.cos(a + 0.5) * 5, y: p.y + Math.sin(a + 0.5) * 5 }, BLUE, 2, dim ? 3 : 5);
        }
    },
  });

  // Earthbind: heavy gilded earth-chain coils cinch the body and yank into a dusty ground slam.
  FX.register('earthbind', {
    palette: EARTH,
    travel: 350,
    beats: event => beats(event, 650, 130, 'hit'),
    end: () => 1440,
    ground(s) {
      if (s.c.t < k.CAST) return;
      for (const t of people(s)) {
        const F = feet(t);
        stamp(ring(11, 5, EARTH, s.c.t > 1100), F, s.c.t > 1250 ? 0.5 : 1);
        dust(s, t, hitFor(s, t));
      }
    },
    air(s) {
      if (s.c.t < k.CAST) return;
      const link = k.sprite('46:earth-link', 9, 7, EARTH, set => {
        for (let y = 1; y < 6; y++)
          for (let x = 1; x < 8; x++) if (x < 3 || x > 5 || y < 3 || y > 3) set(x, y, y < 3 ? 4 : 3);
      });
      for (const t of people(s)) {
        const T = body(t),
          F = feet(t),
          q = k.clamp((s.c.t - k.CAST) / 350),
          e = s.c.t - 650;
        impact(s, t, F, EARTH, 30, 9);
        const settle = k.ease(k.clamp((e - 300) / 370));
        if (q > 0.55 && e < 130)
          k.blitRotated(echo(EARTH), F.x, F.y - (1 - k.ease(k.clamp((q - 0.55) / 0.45))) * 12, 0, 0.5, 0.94);
        const count = Math.floor(18 * q * (1 - settle * 0.6));
        for (let i = 0; i < count; i++) {
          const u = i / 17,
            a = u * k.tau * 2.5 + (1 - q) * 3;
          const p = {
            x: T.x + Math.cos(a) * (9 + (1 - q) * 7 - settle * 2),
            y: k.mix(T.y - 9 + u * 18 + Math.sin(a) * 2, F.y - 2 + Math.sin(a) * 2, settle),
          };
          k.blitRotated(link, p.x, p.y, Math.cos(a) * 0.7);
        }
        if (q > 0.6 && settle < 0.7)
          for (const side of [-1, 1]) {
            for (let i = 0; i < 4; i++) stamp(link, { x: T.x + side * (8 + i * 2), y: F.y - 8 + i * 3 });
            if (e > -120 && e < 320) {
              line({ x: T.x + side * 15, y: T.y - 5 }, { x: T.x + side * 15, y: F.y - 3 }, EARTH, 2, 4);
              line({ x: T.x + side * 12, y: F.y - 6 }, { x: T.x + side * 15, y: F.y - 3 }, EARTH, 2, 4);
            }
          }
        if (e > 430) stamp(ring(8, 3, EARTH), { x: F.x, y: F.y - 1 }, 0.5);
      }
    },
  });

  // Nystul's Magic Aura: a pale-violet rune circle envelops the figure and flips between false signatures.
  FX.register('nystuls-magic-aura', {
    palette: VIOLET,
    travel: 240,
    beats: event => beats(event, 540, 85),
    end: () => 1490,
    ground(s) {
      if (s.c.t < 400) return;
      for (const t of people(s)) stamp(ring(12, 6, VIOLET), feet(t), s.c.t > 1180 ? 0.5 : 1);
    },
    air(s) {
      for (const t of people(s)) {
        deliver(s, t, 540, VIOLET);
        if (s.c.t < 440) continue;
        const T = body(t),
          e = s.c.t - 540,
          settle = e > 650;
        impact(s, t, T, VIOLET, 21, 5);
        stamp(ring(11, 12, VIOLET, settle), T, settle ? 0.5 : 1);
        if (!settle) {
          const flip = Math.floor(Math.max(0, e) / 230) % 2;
          stamp(glyph(flip ? 'mask' : 'rune', VIOLET), T);
          for (let i = 0; i < 4; i++) {
            const a = (i * Math.PI) / 2 + s.c.raw / 700;
            k.dot(T.x + Math.cos(a) * 13, T.y + Math.sin(a) * 13, VIOLET[0], 5);
            k.dot(T.x + Math.cos(a) * 13, T.y + Math.sin(a) * 13, VIOLET[i % 2 ? 4 : 5], 3);
          }
        }
      }
    },
  });

  // Wristpocket: a palm-sized violet spatial vortex gulps a bright trinket and snaps shut with a pop.
  FX.register('wristpocket', {
    palette: VIOLET,
    travel: 210,
    beats: event => [...beats(event, 510, 65, 'soft', true), ...beats(event, 1010, 75, 'soft', true)],
    end: () => 1290,
    air(s) {
      if (s.c.t < k.CAST || !s.pose.hand) return;
      const H = k.P(s.pose.hand),
        e = s.c.t - k.CAST,
        close = k.clamp((s.c.t - 900) / 110);
      if (e < 710) {
        const rx = Math.max(2, Math.round(8 * (1 - close)));
        const portal = k.sprite('46:pocket:' + rx, rx * 2 + 8, 25, VIOLET, set => {
          for (let y = 1; y < 24; y++)
            for (let x = 1; x < rx * 2 + 7; x++) {
              const d = Math.hypot((x - rx - 4) / rx, (y - 12) / 9);
              if (d < 1) set(x, y, d < 0.65 ? 1 : d < 0.81 ? 3 : 5);
            }
        });
        stamp(portal, H);
        spiral(H, VIOLET, s.c.raw / 100, rx - 1, 1.2);
        if (s.c.t < 850) {
          const q = k.clamp((s.c.t - 490) / 360);
          const p = { x: H.x + (1 - q) * 17, y: H.y - Math.sin(q * Math.PI) * 8 - (1 - q) * 3 };
          stamp(glyph('star', GOLD, 1), p, q > 0.9 ? 0.5 : 1);
        }
      }
      for (const hit of s.hits) {
        k.drawHit(k.hitStyle('46:pocket-pop', VIOLET, { S: hit.at === 1010 ? 26 : 17, spikes: 4 }), H, s.real(hit));
        k.shards(H, s.real(hit), VIOLET, s.event.seed || 0, 5, 13);
      }
      if (s.c.t > 1100) stamp(glyph('star', VIOLET, 1), H, 0.5);
    },
  });

  // Heat Metal: white-orange plate armour and a blazing weapon flare over the gear, hissing sparks and heat.
  FX.register('heat-metal', {
    palette: HOT,
    travel: 240,
    beats: event => beats(event, 540, 100, 'hit'),
    end: () => 1450,
    air(s) {
      for (const t of people(s)) {
        deliver(s, t, 540, HOT);
        if (s.c.t < 470) continue;
        const T = body(t),
          e = s.c.t - 540,
          cool = e > 560;
        impact(s, t, T, HOT, 26, 10);
        const armour = k.sprite('46:hot-armour:' + cool, 29, 26, HOT, set => {
          for (let y = 1; y < 25; y++)
            for (let x = 1; x < 28; x++) {
              const dx = Math.abs(x - 13);
              const plate = y >= 8 && y <= 17 && dx <= 5 && (dx >= 3 || y < 10 || y > 14);
              const shoulder = y >= 6 && y <= 9 && dx >= 5 && dx <= 8;
              const boot = y >= 20 && y <= 23 && dx >= 2 && dx <= 5;
              const sword = ((x === 24 || x === 25) && y >= 2 && y <= 19) || (y === 17 && x >= 21 && x <= 27);
              if (plate || shoulder || boot || sword) set(x, y, cool ? 3 : (x + y) % 4 ? 4 : 5);
            }
        });
        stamp(armour, { x: T.x, y: T.y + 1 }, e > 730 ? 0.5 : 1);
        for (let i = 0; i < 4; i++) {
          const q = (s.c.raw / 500 + i * 0.25) % 1,
            x = T.x - 9 + i * 6;
          const points = [];
          for (let j = 0; j < 6; j++)
            points.push({ x: x + Math.sin(j * 1.3 + s.c.raw / 90) * 2, y: T.y - 5 - q * 11 - j });
          stroke(points, HOT, 2, cool ? 3 : 4);
        }
        if (!cool)
          for (let i = 0; i < 5; i++) {
            const q = (s.c.raw / 320 + k.hash(i, s.event.seed || 0)) % 1;
            const x = T.x + (i - 2) * 5,
              y = T.y - q * 17;
            k.dot(x, y, HOT[0], 4);
            k.dot(x, y, i % 2 ? HOT[4] : HOT[3], 2);
          }
      }
    },
  });

  // Calm Emotions: a broad pale-blue wave blankets the full sphere with slow ripples and descending teardrops.
  FX.register('calm-emotions', {
    palette: CALM,
    travel: 280,
    beats: event => beats(event, 580, 85),
    end: () => 1650,
    ground(s) {
      if (s.c.t < k.CAST) return;
      const area = s.area || s.pose.target;
      if (!area) return;
      const C = k.P(area),
        R = Math.max(8, ((s.area?.feet || 20) / (s.grid.feet || 5)) * 16);
      const e = s.c.t - k.CAST,
        q = k.clamp(e / 280),
        radius = Math.round(R * (0.15 + 0.85 * k.ease(q)));
      const wave = k.sprite('46:calm-wave:' + radius, radius * 2 + 12, radius * 2 + 12, CALM, set => {
        for (let y = 1; y < radius * 2 + 11; y++)
          for (let x = 1; x < radius * 2 + 11; x++) {
            const dx = x - radius - 6,
              dy = y - radius - 6,
              d = Math.hypot(dx, dy),
              edge = radius - d;
            if (edge >= 0 && edge < 4) set(x, y, edge < 1 ? 3 : edge < 3 ? 4 : 3);
            else if (edge >= 4 && edge < 9 && (x + y) % 4 === 0) set(x, y, 2);
          }
      });
      stamp(wave, C, e > 1040 ? 0.5 : 1);
      if (e > 200) {
        stamp(ring(Math.round(R * 0.72), Math.round(R * 0.72), CALM, true), C, 0.5);
        stamp(ring(Math.round(R * 0.4), Math.round(R * 0.4), CALM, true), C, 0.5);
        for (let j = 0; j < 3; j++) {
          const y = C.y + (j - 1) * R * 0.4,
            points = [];
          for (let i = 0; i < 27; i++) {
            const x = (i / 26 - 0.5) * R * 1.4;
            points.push({ x: C.x + x, y: y + Math.sin(i * 0.35 + s.c.raw / 500) * 2 });
          }
          stroke(points, CALM, 2, 3);
        }
      }
    },
    air(s) {
      if (s.c.t < 580) return;
      for (const t of people(s)) {
        const T = body(t),
          e = s.c.t - 580;
        impact(s, t, T, CALM, 17, 4);
        stamp(glyph('drop', CALM), { x: T.x, y: T.y - 12 + Math.sin(s.c.raw / 280) }, e > 760 ? 0.5 : 1);
      }
      const area = s.area || s.pose.target;
      if (!area) return;
      const C = k.P(area),
        R = ((s.area?.feet || 20) / (s.grid.feet || 5)) * 16;
      for (let i = 0; i < 16; i++) {
        const a = k.hash(i, s.event.seed || 0) * k.tau,
          r = Math.sqrt(k.hash(i, s.event.seed || 0, 2)) * R * 0.85;
        const q = (s.c.raw / 1100 + k.hash(i, 19)) % 1;
        const x = C.x + Math.cos(a) * r,
          y = C.y + Math.sin(a) * r - 12 + q * 17;
        k.dot(x, y, CALM[0], 4);
        k.dot(x, y, CALM[4], 2);
      }
    },
  });

  // Enthrall: a stream of pink-violet notes opens a hypnotic eye, with head spirals and a swaying echo.
  FX.register('enthrall', {
    palette: PINK,
    travel: 310,
    beats: event => beats(event, 610, 90),
    end: () => 1550,
    ground(s) {
      if (s.c.t < 610) return;
      for (const t of people(s)) stamp(ring(10, 4, PINK, true), feet(t), 0.5);
    },
    air(s) {
      if (s.c.t < k.CAST) return;
      for (const t of people(s)) {
        const T = body(t),
          F = feet(t),
          H = k.P(s.pose.hand || t),
          e = s.c.t - 610;
        if (s.c.t < 1100)
          for (let i = 0; i < 5; i++) {
            const u = (s.c.t - k.CAST) / 410 - i * 0.18;
            if (u < 0 || u > 1) continue;
            stamp(glyph('note', i % 2 ? VIOLET : PINK, 1), {
              x: k.mix(H.x, T.x, u),
              y: k.mix(H.y, T.y, u) - Math.sin(u * Math.PI) * 10,
            });
          }
        impact(s, t, T, PINK, 23, 5);
        if (e >= 0) {
          const sway = Math.sin(s.c.raw / 180) * 0.22;
          if (e < 650) k.blitRotated(echo(VIOLET), F.x, F.y, sway, 0.5, 0.94);
          stamp(glyph('eye', PINK), { x: T.x + Math.sin(s.c.raw / 180) * 2, y: T.y - 15 }, e > 700 ? 0.5 : 1);
          if (e < 700) {
            spiral({ x: T.x - 6, y: T.y - 4 }, VIOLET, s.c.raw / 180, 7);
            stamp(glyph('note', PINK, 1), { x: T.x + 10, y: T.y - 2 + Math.sin(s.c.raw / 160) * 2 });
          }
        }
      }
    },
  });

  // Blindness/Deafness: a violet-edged black blindfold snaps over the eyes beneath a struck-through eye.
  FX.register('blindness-deafness', {
    palette: DARK,
    travel: 240,
    beats: event => beats(event, 540, 95),
    end: () => 1410,
    air(s) {
      for (const t of people(s)) {
        deliver(s, t, 540, DARK);
        if (s.c.t < 480) continue;
        const T = body(t),
          e = s.c.t - 540;
        impact(s, t, T, DARK, 23, 7);
        const band = k.sprite('46:blindfold', 23, 10, DARK, set => {
          for (let y = 2; y < 8; y++)
            for (let x = 2; x < 21; x++) set(x, y, y === 2 || y === 7 || x === 2 || x === 20 ? 3 : 1);
          for (let i = 0; i < 5; i++) {
            set(18 + i, 4 + i, 3);
            set(18 + i, 5 + i, 3);
          }
        });
        stamp(band, { x: T.x, y: T.y - 5 }, e > 640 ? 0.5 : 1);
        if (e >= 0 && e < 720) {
          const p = { x: T.x, y: T.y - 17 };
          stamp(glyph('eye', DARK), p);
          line({ x: p.x - 9, y: p.y + 6 }, { x: p.x + 9, y: p.y - 6 }, DARK, 3, 4);
        }
        if (e < 620)
          for (const side of [-1, 1]) {
            const points = [];
            for (let i = 0; i < 12; i++)
              points.push({ x: T.x + side * (10 + Math.sin(i * 0.5 + s.c.raw / 150) * 3), y: T.y + 6 - i });
            stroke(points, DARK, 2, 3);
          }
      }
    },
  });

  // Borrowed Knowledge: a large open golden book spills bright pages into the caster's head, crowned by a star.
  FX.register('borrowed-knowledge', {
    palette: GOLD,
    travel: 260,
    beats: event => [...beats(event, 560, 80, 'soft', true), ...beats(event, 1020, 75, 'soft', true)],
    end: () => 1490,
    ground(s) {
      const t = caster(s);
      if (t && s.c.t > 450) stamp(ring(11, 5, GOLD), feet(t), s.c.t > 1200 ? 0.5 : 1);
    },
    air(s) {
      const t = caster(s);
      if (!t || s.c.t < k.CAST) return;
      const T = body(t),
        B = { x: T.x, y: T.y - 16 },
        e = s.c.t - 560;
      const open = Math.min(3, Math.floor(k.clamp((s.c.t - k.CAST) / 260) * 3));
      const book = k.sprite('46:book:' + open, 31, 22, GOLD, set => {
        const half = 4 + open * 3;
        for (let x = 15 - half; x <= 15 + half; x++) {
          const dx = Math.abs(x - 15),
            top = 5 - Math.floor(dx / 5),
            bottom = 17 - Math.floor(dx / 6);
          for (let y = top; y <= bottom; y++) {
            const edge = y === bottom || dx === half;
            set(x, y, edge ? 2 : x === 15 ? 2 : y < top + 2 ? 5 : 4);
            if (!edge && dx > 2 && dx < half - 1 && y > top + 3 && y < bottom - 2 && y % 3 === 0) set(x, y, 2);
          }
        }
        for (let y = 6; y < 19; y++) set(15, y, 3);
      });
      if (s.c.t < 1130) stamp(book, B, s.c.t > 1020 ? 0.5 : 1);
      const page = k.sprite('46:page', 8, 11, GOLD, set => {
        for (let y = 1; y < 10; y++)
          for (let x = 1; x < 7; x++) set(x, y, x === 6 || y === 9 ? 3 : y % 3 === 0 && x < 5 ? 2 : 5);
      });
      if (e >= 50 && e < 600)
        for (let i = 0; i < 4; i++) {
          const u = (e - 50 - i * 80) / 290;
          if (u < 0 || u > 1) continue;
          const side = i % 2 ? 1 : -1;
          const p = {
            x: T.x + side * Math.sin(u * Math.PI) * 14,
            y: k.mix(B.y, T.y - 4, u) - Math.sin(u * Math.PI) * 3,
          };
          if (u < 0.85) k.blitRotated(page, p.x, p.y, side * u * 1.2);
          else {
            k.dot(p.x, p.y, GOLD[0], 5);
            k.dot(p.x, p.y, GOLD[5], 3);
          }
        }
      for (const hit of s.hits) {
        const at = hit.at === 560 ? B : { x: T.x, y: T.y - 6 };
        k.drawHit(k.hitStyle('46:knowledge', GOLD, { S: 23, spikes: 4 }), at, s.real(hit));
        k.shards(at, s.real(hit), GOLD, (s.event.seed || 0) + hit.at, 5, 14);
      }
      if (s.c.t >= 1020) stamp(glyph('star', GOLD), { x: T.x, y: T.y - 12 }, s.c.t > 1320 ? 0.5 : 1);
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
