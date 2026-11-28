/* Pixel spells, batch 43: large silhouettes, held peaks and crisp contact beats. */
(function (root) {
  'use strict';
  const FX = root.BoardPixelFX;
  if (!FX) return;
  const k = FX.kit;
  const NEC = ['#16251d', '#385343', '#719b67', '#b4e78b', '#e6ffd3', '#ffffff'];
  const MAGIC = ['#211831', '#5c477a', '#9983b9', '#cbb0ff', '#f0e4ff', '#ffffff'];
  const GOLD = ['#352715', '#80613a', '#c29b43', '#ffda72', '#fff2c3', '#ffffff'];
  const WIND = ['#1a2d3c', '#41667e', '#78afc4', '#b3e4f3', '#e3faff', '#ffffff'];
  const SILVER = ['#252c3c', '#586879', '#8eabba', '#c6dbe2', '#edf8fc', '#ffffff'];
  const NATURE = ['#25321e', '#567342', '#87ad5c', '#c5e783', '#f2f9bd', '#ffffff'];
  const WATER = ['#162f43', '#246987', '#36b4d5', '#74e9f6', '#cbfbff', '#ffffff'];
  const TRICK = ['#30223c', '#76569e', '#dd78b1', '#ffbd73', '#a5f4e6', '#ffffff'];
  const DUST = ['#302a24', '#675a4b', '#9d8b6d', '#d3c29b', '#f3e5c7', '#ffffff'];

  function beat(event, travel, kind = 'soft', stop = 65) {
    return [{ at: k.CAST + travel, stop, target: event.targets?.[0] ?? null, kind, power: 0.06 }];
  }
  function body(s, hit = s.hits[0]) {
    return s.targets.find(t => t.id === hit?.id) || s.targets[0] || s.pose.target || s.area || s.pose.base;
  }
  function feet(t) {
    return k.P({ x: t.baseX ?? t.x, y: t.baseY ?? t.y + 0.62 });
  }
  function aim(s) {
    return k.P(s.pose.target || body(s));
  }
  function speck(x, y, pal, size = 2, ink = 4) {
    k.dot(x, y, pal[0], size + 2);
    k.dot(x, y, pal[ink], size);
  }
  function stroke(points, pal, size = 2, ink = 4) {
    for (const [color, width] of [
      [pal[0], size + 2],
      [pal[ink], size],
    ]) {
      for (let i = 0; i < points.length; i++) k.dot(points[i].x, points[i].y, color, width);
    }
  }
  function line(a, b, pal, size = 2, ink = 4) {
    const n = Math.min(80, Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y))));
    stroke(
      Array.from({ length: n + 1 }, (_, i) => ({ x: k.mix(a.x, b.x, i / n), y: k.mix(a.y, b.y, i / n) })),
      pal,
      size,
      ink,
    );
  }
  function stamp(name, w, h, pal, paint) {
    return k.sprite('b43:' + name, w, h, pal, set => {
      const rect = (x, y, rw, rh, ink) => {
        for (let j = y; j < y + rh; j++) for (let i = x; i < x + rw; i++) set(i, j, ink);
      };
      paint(set, rect);
    });
  }
  function show(img, x, y, alpha = 1) {
    k.blit(img, x - img.width / 2, y - img.height / 2, alpha);
  }
  function ring(x, y, rx, ry, pal, alpha = 1, thick = 2) {
    rx = Math.max(2, Math.round(rx));
    ry = Math.max(2, Math.round(ry));
    const pad = thick + 2,
      w = 2 * (rx + pad) + 1,
      h = 2 * (ry + pad) + 1;
    const img = stamp('ring:' + pal[3] + ':' + rx + ':' + ry + ':' + thick, w, h, pal, set => {
      for (let y = 1; y < h - 1; y++)
        for (let x = 1; x < w - 1; x++) {
          const dx = x - (w - 1) / 2,
            dy = y - (h - 1) / 2;
          const d = Math.hypot(dx / rx, dy / ry);
          if (Math.abs(d - 1) * Math.min(rx, ry) < thick / 2) set(x, y, dy < 0 ? 4 : 3);
        }
    });
    show(img, x, y, alpha);
  }
  function star(x, y, pal, radius = 7, alpha = 1) {
    const r = Math.round(radius),
      w = r * 2 + 3;
    show(
      stamp('star:' + pal[3] + ':' + r, w, w, pal, set => {
        for (let y = -r; y <= r; y++)
          for (let x = -r; x <= r; x++) {
            if (
              Math.abs(x) + Math.abs(y) <= r &&
              Math.min(Math.abs(x), Math.abs(y)) <= Math.max(1, (r - Math.max(Math.abs(x), Math.abs(y))) / 3)
            )
              set(x + r + 1, y + r + 1, Math.abs(x) + Math.abs(y) < r / 2 ? 5 : 4);
          }
      }),
      x,
      y,
      alpha,
    );
  }
  function motes(s, C, pal, e, n = 6, radius = 12) {
    if (e < 0 || e > 650) return;
    for (let i = 0; i < n; i++) {
      const a = k.hash(i, s.event.seed) * k.tau;
      const x = C.x + Math.cos(a) * radius + Math.sin(e / 170 + i) * 2;
      const y = C.y + Math.sin(a) * radius * 0.4 - e / 45;
      if (e > 440 && i % 2) continue;
      if (i % 3 === 0) star(x, y, pal, 3, 1 - k.clamp((e - 400) / 250));
      else speck(x, y, pal, 2, i % 2 ? 4 : 3);
    }
  }
  function hitArt(s, hit, C, pal, key, size = 25, debris = 7) {
    const e = s.real(hit);
    k.drawHit(k.hitStyle('b43:' + key, pal, { S: size, spikes: 4, minor: 4, jag: 0.12 }), C, e);
    k.shards(C, e, pal, (s.event.seed || 0) + 43, debris, 19);
  }
  function leaf() {
    return stamp('leaf', 10, 8, NATURE, (set, rect) => {
      rect(2, 2, 5, 3, 3);
      rect(4, 1, 4, 2, 4);
      rect(1, 4, 4, 2, 3);
      for (let i = 2; i < 7; i++) set(i, 6 - Math.floor(i / 2), 5);
    });
  }
  function cube(s) {
    const pts = s.area ? k.outline(s.area, s.grid).map(p => k.P({ x: p[0], y: p[1] })) : [];
    if (pts.length < 4) {
      const C = aim(s),
        half = ((s.area?.feet || 5) / (s.grid.feet || 5)) * 8;
      pts.splice(
        0,
        pts.length,
        { x: C.x - half, y: C.y - half },
        { x: C.x + half, y: C.y - half },
        { x: C.x + half, y: C.y + half },
        { x: C.x - half, y: C.y + half },
      );
    }
    return {
      pts,
      C: { x: pts.reduce((v, p) => v + p.x, 0) / pts.length, y: pts.reduce((v, p) => v + p.y, 0) / pts.length },
    };
  }
  function cup(part) {
    return stamp('cup:' + part, 22, 20, SILVER, (set, rect) => {
      for (let y = 3; y <= 15; y++)
        for (let x = 3; x <= 15; x++) {
          if (y > 12 && (x < 5 || x > 13)) continue;
          const split = 9 + (y < 7 ? 0 : y < 11 ? 2 : 0);
          if ((part === 'left' && x > split) || (part === 'right' && x <= split)) continue;
          if (y < 6 || y >= 13 || x < 6 || x > 13) set(x, y, y < 6 || x < 6 ? 5 : 3);
          else set(x, y, 2);
        }
      if (part !== 'left') {
        rect(16, 6, 3, 2, 4);
        rect(18, 7, 2, 5, 4);
        rect(15, 11, 4, 2, 4);
      }
    });
  }
  function flame() {
    return stamp('flame', 15, 19, ['#35223c', '#824b67', '#e58144', '#ffc15c', '#fff0b3', '#ffffff'], set => {
      for (let y = 2; y < 17; y++)
        for (let x = 1; x < 14; x++) {
          const width = y < 8 ? (y - 1) / 2 : y < 13 ? 5.5 : 6 - (y - 13) * 0.8;
          const cx = 7 + (y < 9 ? 1 : -1);
          if (Math.abs(x - cx) < width)
            set(x, y, y > 9 && Math.abs(x - 6) < 2 ? 5 : Math.abs(x - cx) < width - 2 ? 4 : 3);
        }
    });
  }
  function shield() {
    return stamp('shield', 21, 25, SILVER, set => {
      for (let y = 2; y < 23; y++)
        for (let x = 2; x < 19; x++) {
          const half = y < 6 ? 5 + (y - 2) : y < 14 ? 8 : (23 - y) * 0.85;
          if (Math.abs(x - 10) <= half) {
            const rim = Math.abs(x - 10) > half - 2 || y < 4;
            set(x, y, rim ? 5 : x < 10 ? 4 : 3);
            if (!rim && (Math.abs(x - 10) <= 1 || y === 10 || y === 11)) set(x, y, 2);
          }
        }
    });
  }
  function hand(clenched) {
    return stamp('hand:' + clenched, 26, 28, NEC, (set, rect) => {
      rect(8, 17, 11, 5, 4);
      rect(10, 22, 7, 4, 3);
      rect(11, 22, 2, 4, 5);
      for (let i = 0; i < 4; i++) {
        const x = 6 + i * 4,
          top = clenched ? 10 + Math.abs(i - 1) : 3 + Math.abs(i - 1) * 2;
        rect(x, top, 3, 17 - top, 5);
        rect(x, top + 4, 3, 2, 2);
        rect(x + 1, top, 2, 3, 4);
      }
      rect(3, 14, 4, 4, 4);
      rect(5, 17, 4, 4, 5);
      for (let i = 0; i < 3; i++) {
        rect(9 + i * 3, 18, 1, 4, 2);
        set(10 + i * 3, 17, 5);
      }
      if (clenched) {
        rect(7, 9, 13, 3, 4);
        rect(5, 15, 10, 3, 5);
      }
    });
  }
  function bell() {
    return stamp('bell', 19, 22, GOLD, (set, rect) => {
      rect(8, 2, 3, 3, 4);
      rect(6, 5, 7, 2, 5);
      rect(4, 7, 11, 8, 3);
      rect(5, 7, 3, 7, 5);
      rect(3, 14, 13, 3, 4);
      rect(2, 17, 15, 2, 5);
      rect(8, 19, 3, 2, 3);
    });
  }
  function paw() {
    return stamp('paw-heart', 25, 27, NATURE, (set, rect) => {
      rect(5, 3, 4, 6, 4);
      rect(11, 1, 4, 6, 5);
      rect(17, 3, 4, 6, 4);
      rect(2, 10, 5, 5, 3);
      rect(19, 10, 4, 5, 3);
      for (let y = 10; y < 24; y++)
        for (let x = 6; x < 19; x++) {
          if (Math.hypot((x - 12) / 7, (y - 17) / 7) < 1) set(x, y, 4);
        }
      rect(8, 14, 3, 3, 2);
      rect(14, 14, 3, 3, 2);
      rect(8, 17, 9, 2, 2);
      rect(10, 19, 5, 2, 2);
      rect(12, 21, 1, 1, 2);
      rect(9, 14, 2, 2, 5);
      rect(14, 14, 2, 2, 5);
    });
  }
  function feather() {
    return stamp('feather', 14, 23, WIND, (set, rect) => {
      for (let y = 2; y < 19; y++)
        for (let x = 2; x < 12; x++) {
          const cx = 8 - y * 0.15,
            width = Math.sin(((y - 1) / 19) * Math.PI) * 4.7;
          if (Math.abs(x - cx) < width && !((y === 8 || y === 13) && x < cx - 1)) set(x, y, x < cx ? 5 : 4);
        }
      for (let y = 4; y < 22; y++) rect(8 - Math.floor(y * 0.15), y, 1, 1, 3);
    });
  }
  function droplet() {
    return stamp('drop', 11, 15, WATER, set => {
      for (let y = 2; y < 13; y++)
        for (let x = 1; x < 10; x++) {
          const width = y < 8 ? (y - 1) * 0.6 : Math.sqrt(Math.max(0, 17 - (y - 9) ** 2));
          if (Math.abs(x - 5) <= width) set(x, y, x < 5 ? 5 : x < 7 ? 4 : 3);
        }
    });
  }

  // Sapping Sting: a pale necrotic ground barb, a draining body ripple and a dusty toppled afterimage.
  FX.register('sapping-sting', {
    palette: NEC,
    travel: 160,
    beats: (event, kit, travel) => beat(event, travel, 'hit', 110),
    end: () => 1270,
    ground(s) {
      const t = s.c.t - k.CAST,
        F = feet(body(s));
      if (t < 0) return;
      ring(F.x, F.y, 5 + k.ease(k.clamp(t / 160)) * 7, 4, NEC, t < 550 ? 1 : 0.5);
      const e = s.real(s.hits[0]);
      if (e >= 80 && e < 600) {
        for (let i = 0; i < 5; i++) {
          const q = k.clamp((e - 80) / 520),
            x = F.x + (i - 2) * (3 + q * 4),
            y = F.y - Math.sin(q * Math.PI) * 4;
          k.disc(x, y, 3.5 - q * 2, DUST[0]);
          k.disc(x, y - 1, 2.5 - q * 2, DUST[3]);
        }
      }
    },
    air(s) {
      const t = s.c.t - k.CAST,
        T = k.P(body(s)),
        F = feet(body(s)),
        hit = s.hits[0];
      if (t < 0) return;
      if (t < 480) {
        const rise = k.ease(k.clamp(t / 160)),
          retract = k.clamp((t - 360) / 120);
        const img = stamp('barb', 16, 27, NEC, set => {
          for (let y = 2; y < 25; y++)
            for (let x = 2; x < 14; x++) {
              const half = y < 13 ? (y - 1) * 0.4 : y < 17 ? 6 : 2;
              if (Math.abs(x - 8) <= half) set(x, y, x <= 8 ? 5 : x < 11 ? 4 : 3);
            }
        });
        show(img, F.x, F.y + 13 - rise * 23 + retract * 20);
      }
      const e = s.real(hit);
      hitArt(s, hit, T, NEC, 'sting', 24, 7);
      if (e >= 0 && e < 420) {
        const q = e / 420;
        ring(T.x, T.y + q * 6, 10 + q * 5, 7 - q * 3, NEC, 1 - q * 0.5, 3);
        for (let i = 0; i < 3; i++)
          speck(T.x + Math.sin(i * 2 + q * 3) * (11 - q * 7), k.mix(T.y, F.y, q) - i * 2, NEC, 3);
      }
      if (e >= 150 && e < 570) {
        // A falling spectral echo communicates prone without moving or replacing the board's figure.
        const q = k.ease(k.clamp((e - 150) / 160));
        const ghost = stamp('prone-echo', 22, 12, NEC, (set, rect) => {
          rect(2, 4, 5, 5, 4);
          rect(8, 5, 8, 4, 3);
          rect(15, 3, 5, 2, 4);
          rect(15, 8, 5, 2, 4);
        });
        show(ghost, F.x + q * 4, k.mix(T.y, F.y - 2, q), 1 - k.clamp((e - 390) / 180));
      }
    },
  });

  // Magic Stone: a fist-sized white-violet pebble arcs into a rune-star crack and chunky stone chips.
  FX.register('magic-stone', {
    palette: MAGIC,
    travel: 350,
    beats: (event, kit, travel) => beat(event, travel, 'hit', 95),
    end: () => 1230,
    air(s) {
      const hit = s.hits[0],
        target = body(s),
        H = k.P(s.pose.hand || s.pose.base),
        T = k.P(k.contact(target, s.pose.hand || target));
      const t = s.c.t - k.CAST;
      if (t >= 0 && t < 350) {
        const q = t / 350,
          at = u => ({ x: k.mix(H.x, T.x, u), y: k.mix(H.y, T.y, u) - Math.sin(u * Math.PI) * 17 });
        for (let i = 9; i > 0; i--) {
          const u = q - i * 0.025;
          if (u >= 0) {
            const p = at(u);
            speck(p.x, p.y, MAGIC, i < 4 ? 3 : 2, i < 5 ? 4 : 3);
          }
        }
        const p = at(q);
        const img = stamp('stone', 12, 12, MAGIC, (set, rect) => {
          rect(3, 2, 5, 1, 4);
          rect(2, 3, 8, 5, 3);
          rect(3, 8, 6, 2, 2);
          rect(3, 3, 5, 3, 5);
          rect(4, 6, 4, 2, 4);
          set(8, 4, 5);
        });
        k.blitRotated(img, p.x, p.y, q * k.tau);
      }
      const e = s.real(hit);
      hitArt(s, hit, T, MAGIC, 'stone', 37, 8);
      if (e >= 0 && e < 300) {
        ring(T.x, T.y, 11, 11, MAGIC, e < 220 ? 1 : 0.5);
        for (let i = 0; i < 4; i++) {
          const a = (i * Math.PI) / 2;
          star(T.x + Math.cos(a) * 11, T.y + Math.sin(a) * 11, MAGIC, 3);
        }
      }
      if (e >= 0 && e < 510) {
        const q = e / 510;
        for (let i = 0; i < 7; i++) {
          const a = k.hash(i, s.event.seed, 2) * k.tau,
            r = k.ease(q) * (12 + k.hash(i, s.event.seed, 3) * 13);
          const x = T.x + Math.cos(a) * r,
            y = T.y + Math.sin(a) * r * 0.6 + q * q * 14;
          speck(x, y, SILVER, i % 3 ? 3 : 4, i % 2 ? 3 : 4);
        }
      }
    },
  });

  // Prestidigitation: four generous harmless tricks -- coloured sparks, dancing flame, star and confetti.
  FX.register('prestidigitation', {
    palette: TRICK,
    travel: 100,
    beats: event =>
      [100, 330, 560, 790].map(t => ({
        at: k.CAST + t,
        stop: 50,
        target: event.targets?.[0] ?? null,
        kind: 'soft',
        power: 0,
      })),
    end: () => 1560,
    air(s) {
      const C = aim(s),
        t = s.c.t - k.CAST;
      if (t < 0) return;
      if (t < 330) {
        const q = k.clamp(t / 150);
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * k.tau;
          star(C.x + Math.cos(a) * (3 + q * 9), C.y + Math.sin(a) * (3 + q * 7), i % 2 ? TRICK : MAGIC, 4);
        }
      }
      if (t >= 230 && t < 580) {
        show(flame(), C.x + Math.sin((t - 230) / 60) * 3, C.y - 2);
        ring(C.x, C.y + 9, 9, 3, GOLD);
      }
      if (t >= 460 && t < 810) star(C.x, C.y - 3, MAGIC, 11);
      if (t >= 690 && t < 1080) {
        const e = s.real(s.hits[3]),
          q = k.clamp(Math.max(0, e) / 400);
        ring(C.x, C.y, 9 + q * 9, 5 + q * 4, TRICK, 1 - q);
        for (let i = 0; i < 12; i++) {
          const a = k.hash(i, s.event.seed) * k.tau,
            r = 5 + k.ease(q) * 15;
          const x = C.x + Math.cos(a) * r,
            y = C.y + Math.sin(a) * r * 0.7 + q * q * 10;
          speck(x, y, i % 3 === 0 ? GOLD : i % 3 === 1 ? TRICK : WIND, 3, 3 + (i % 3));
        }
      }
      for (let i = 0; i < s.hits.length; i++) {
        const e = s.real(s.hits[i]);
        if (e >= 0 && e < 140) k.drawHit(k.hitStyle('b43:trick', TRICK, { S: 22, spikes: 4, jag: 0 }), C, e);
      }
      if (t >= 1000)
        for (let i = 0; i < 4; i++)
          star(
            C.x + (i - 1.5) * 7 + Math.sin(t / 160 + i) * 2,
            C.y - (t - 1000) / 65 - (i % 2) * 5,
            TRICK,
            3,
            1 - k.clamp((t - 1090) / 170),
          );
    },
  });

  // Mending: two broken cup halves join, a gold zigzag seam pulses, then the repaired cup gleams.
  FX.register('mending', {
    palette: GOLD,
    travel: 280,
    beats: (event, kit, travel) => beat(event, travel, 'soft', 80),
    end: () => 1410,
    air(s) {
      const C = aim(s),
        t = s.c.t - k.CAST,
        hit = s.hits[0];
      if (t < 0) return;
      const gap = 8 * (1 - k.ease(k.clamp(t / 280))),
        alpha = 1 - k.clamp((t - 790) / 250),
        bob = Math.sin(t / 150) * (1 - k.clamp(t / 280));
      show(cup('left'), C.x - gap, C.y - 2 + bob, alpha);
      show(cup('right'), C.x + gap, C.y - 2 - bob, alpha);
      if (t >= 280 && t < 750) {
        const seam = [
          { x: C.x - 1, y: C.y - 9 },
          { x: C.x - 1, y: C.y - 5 },
          { x: C.x + 1, y: C.y - 2 },
          { x: C.x + 1, y: C.y + 2 },
          { x: C.x - 1, y: C.y + 5 },
        ];
        for (let i = 1; i < seam.length; i++) line(seam[i - 1], seam[i], GOLD, 2, 5);
      }
      const e = s.real(hit);
      if (e >= 0 && e < 400) ring(C.x, C.y, 10 + k.ease(e / 400) * 8, 8 + e / 100, GOLD, 1 - e / 500);
      if (t >= 620 && t < 930) star(C.x + 6, C.y - 8, GOLD, 7);
      if (e >= 0 && e < 200) k.drawHit(k.hitStyle('b43:mend', GOLD, { S: 21, spikes: 4, jag: 0 }), C, e);
    },
  });

  // Gust: three white-blue curling ribbons carry leaves to the creature, wrap it and sweep beyond it.
  FX.register('gust', {
    palette: WIND,
    travel: 320,
    beats: (event, kit, travel) => beat(event, travel, 'soft', 65),
    end: () => 1260,
    ground(s) {
      const e = s.real(s.hits[0]),
        F = feet(body(s));
      if (e >= 0 && e < 430) ring(F.x + e / 45, F.y, 10 + e / 65, 4, DUST, 1 - e / 500);
    },
    air(s) {
      const t = s.c.t - k.CAST;
      if (t < 0 || t > 820) return;
      const H = k.P(s.pose.hand || s.pose.base),
        T = aim(s),
        dx = T.x - H.x,
        dy = T.y - H.y,
        length = Math.hypot(dx, dy) || 1;
      const ux = dx / length,
        uy = dy / length,
        nx = -uy,
        ny = ux;
      const advance = t < 320 ? t / 320 : 1 + k.clamp((t - 570) / 250) * 0.8;
      for (let j = 0; j < 3; j++) {
        const pts = [];
        for (let i = 0; i < 32; i++) {
          const v = i / 31,
            along = Math.max(0, advance - 0.48 + v * 0.48),
            curl = Math.sin(v * k.tau + j * 0.8) * 5 + (j - 1) * 6;
          pts.push({ x: H.x + ux * length * along + nx * curl, y: H.y + uy * length * along + ny * curl });
        }
        stroke(pts, WIND, 2, j === 1 ? 5 : 4);
      }
      if (t >= 320 && t < 640) {
        const pts = Array.from({ length: 40 }, (_, i) => {
          const a = (i / 39) * k.tau * 1.4 + t / 160;
          return { x: T.x + Math.cos(a) * 12, y: T.y + Math.sin(a) * 8 };
        });
        stroke(pts, WIND, 2);
      }
      const e = s.real(s.hits[0]);
      for (let i = 0; i < 6; i++) {
        const q = k.clamp(t / 700),
          v = Math.max(0, q * 1.6 - i * 0.055),
          off = Math.sin(t / 120 + i) * 10;
        k.blitRotated(leaf(), H.x + ux * length * v + nx * off, H.y + uy * length * v + ny * off, t / 200 + i);
      }
      k.drawHit(k.hitStyle('b43:gust', WIND, { S: 24, spikes: 3, jag: 0 }), T, e);
      k.shards(T, e, DUST, s.event.seed || 0, 5, 18);
    },
  });

  // Resistance: a body-sized silver shield rises from a foot ring and contracts into a floor ward.
  FX.register('resistance', {
    palette: SILVER,
    travel: 220,
    beats: (event, kit, travel) => beat(event, travel, 'soft', 75),
    end: () => 1420,
    ground(s) {
      const t = s.c.t - k.CAST,
        F = feet(body(s));
      if (t < 0) return;
      const r = t < 470 ? 11 : k.mix(11, 5, k.clamp((t - 470) / 260));
      ring(F.x, F.y, r, r * 0.42, SILVER, 1 - k.clamp((t - 830) / 250));
      if (t >= 690 && t < 1020) star(F.x, F.y, SILVER, 4, 0.75);
    },
    air(s) {
      const t = s.c.t - k.CAST,
        C = k.P(body(s)),
        F = feet(body(s));
      if (t < 0) return;
      if (t < 500) show(shield(), C.x, k.mix(F.y + 7, C.y - 2, k.ease(k.clamp(t / 220))));
      else if (t < 730) {
        const q = (t - 500) / 230,
          cy = k.mix(C.y - 2, F.y, q),
          r = k.mix(9, 3, q);
        ring(C.x, cy, r, r * 1.1, SILVER);
        star(C.x, cy, SILVER, Math.max(3, 7 - q * 4));
      }
      const e = s.real(s.hits[0]);
      k.drawHit(k.hitStyle('b43:resist', SILVER, { S: 27, spikes: 4, jag: 0 }), C, e);
      motes(s, C, SILVER, e - 150, 5, 11);
    },
  });

  // Chill Touch: an open skeletal ghost hand flies in, grips the body, sheds cold wisps and clenches.
  FX.register('chill-touch', {
    palette: NEC,
    travel: 340,
    beats: (event, kit, travel) => beat(event, travel, 'hit', 105),
    end: () => 1380,
    air(s) {
      const t = s.c.t - k.CAST,
        hit = s.hits[0],
        H = k.P(s.pose.hand || s.pose.base),
        T = k.P(body(s));
      if (t < 0) return;
      if (t < 340) {
        const q = t / 340,
          x = k.mix(H.x, T.x, q),
          y = k.mix(H.y, T.y, q) - Math.sin(q * Math.PI) * 8;
        for (let i = 5; i > 0; i--) {
          const u = Math.max(0, q - i * 0.035);
          speck(k.mix(H.x, T.x, u), k.mix(H.y, T.y, u) - Math.sin(u * Math.PI) * 8 + 8, NEC, 3, 4);
        }
        show(hand(false), x, y - 2);
      } else if (t < 880) show(hand(t >= 570), T.x, T.y - 2, 1 - k.clamp((t - 720) / 160));
      const e = s.real(hit);
      hitArt(s, hit, T, NEC, 'chill', 28, 7);
      if (e >= 0 && e < 520) {
        for (let j = 0; j < 4; j++) {
          const a = (j * Math.PI) / 2 + 0.4,
            r = 8 + k.ease(e / 520) * 10;
          const pts = Array.from({ length: 12 }, (_, i) => ({
            x: T.x + Math.cos(a) * (r + i / 3) + Math.sin(i / 3 + e / 90) * 2,
            y: T.y + Math.sin(a) * r - i * 0.7 - e / 90,
          }));
          stroke(pts, NEC, 2, j % 2 ? 5 : 4);
        }
      }
    },
  });

  // Alarm: the actual cube becomes an outlined ward, four corner runes blink and a great bell rings.
  FX.register('alarm', {
    palette: GOLD,
    travel: 210,
    beats: (event, kit, travel) => beat(event, travel, 'soft', 75),
    end: () => 1520,
    ground(s) {
      const t = s.c.t - k.CAST;
      if (t < 0) return;
      const { pts } = cube(s),
        q = k.ease(k.clamp(t / 210));
      const alpha = t < 700 ? 1 : t < 1020 ? 0.5 : 0.25;
      // Cache the entire rotated square; corner placement follows the supplied template exactly.
      const minX = Math.floor(Math.min(...pts.map(p => p.x))) - 4,
        minY = Math.floor(Math.min(...pts.map(p => p.y))) - 4;
      const w = Math.ceil(Math.max(...pts.map(p => p.x)) - minX) + 5,
        h = Math.ceil(Math.max(...pts.map(p => p.y)) - minY) + 5;
      const coords = pts.map(p => ({ x: Math.round(p.x - minX), y: Math.round(p.y - minY) }));
      const img = stamp('ward:' + coords.map(p => p.x + ',' + p.y).join(':'), w, h, GOLD, (set, rect) => {
        for (let j = 0; j < 4; j++) {
          const a = coords[j],
            b = coords[(j + 1) % 4],
            n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y));
          for (let i = 0; i <= n; i++)
            rect(Math.round(k.mix(a.x, b.x, i / n)), Math.round(k.mix(a.y, b.y, i / n)), 2, 2, 4);
        }
      });
      k.blit(img, minX, minY, alpha * (0.5 + q * 0.5));
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        if (t < 800) {
          ring(p.x, p.y, 5, 5, GOLD, Math.floor((s.c.raw + i * 55) / 150) % 2 ? 0.5 : 1);
          star(p.x, p.y, GOLD, 3);
        }
      }
    },
    air(s) {
      const t = s.c.t - k.CAST,
        { C } = cube(s);
      if (t < 0 || t > 900) return;
      const y = C.y - 19 - k.ease(k.clamp(t / 210)) * 3;
      const angle = t >= 210 ? Math.sin((t - 210) / 58) * 0.3 * (1 - k.clamp((t - 600) / 300)) : 0;
      k.blitRotated(bell(), C.x, y, angle);
      if (t >= 210 && t < 740)
        for (const side of [-1, 1]) {
          for (let j = 0; j < 2; j++) {
            const r = 12 + j * 5 + (Math.floor(s.c.raw / 90) % 2);
            const pts = Array.from({ length: 12 }, (_, i) => {
              const a = -0.8 + (i / 11) * 1.6;
              return { x: C.x + side * Math.cos(a) * r, y: y + Math.sin(a) * r };
            });
            stroke(pts, GOLD, 2, j ? 3 : 5);
          }
        }
      const e = s.real(s.hits[0]);
      k.drawHit(k.hitStyle('b43:alarm', GOLD, { S: 23, spikes: 4, jag: 0 }), { x: C.x, y }, e);
    },
  });

  // Animal Friendship: green-gold coils embrace the beast beneath an oversized heart-in-paw seal.
  FX.register('animal-friendship', {
    palette: NATURE,
    travel: 220,
    beats: (event, kit, travel) => beat(event, travel, 'soft', 75),
    end: () => 1460,
    ground(s) {
      const t = s.c.t - k.CAST;
      if (t >= 0) {
        const F = feet(body(s));
        ring(F.x, F.y, 12, 5, NATURE, 1 - k.clamp((t - 790) / 340));
      }
    },
    air(s) {
      const t = s.c.t - k.CAST,
        T = k.P(body(s)),
        hit = s.hits[0];
      if (t < 0) return;
      if (t < 720) {
        const reach = k.clamp(t / 220),
          pts = Array.from({ length: 60 }, (_, i) => {
            const q = (i / 59) * reach,
              a = q * k.tau * 1.7 + s.c.raw / 340;
            return { x: T.x + Math.cos(a) * 12, y: T.y + 11 - q * 24 + Math.sin(a) * 3 };
          });
        stroke(pts, NATURE, 2, 4);
      }
      if (t >= 140 && t < 850)
        show(paw(), T.x, T.y - 17 - Math.sin(k.clamp((t - 140) / 80) * Math.PI) * 3, 1 - k.clamp((t - 680) / 170));
      const e = s.real(hit);
      if (e >= 0 && e < 630) {
        for (let i = 0; i < 4; i++) {
          const a = (i * Math.PI) / 2 + e / 650;
          k.blitRotated(leaf(), T.x + Math.cos(a) * 17, T.y + Math.sin(a) * 8 - e / 100, a);
        }
        motes(s, T, GOLD, e, 5, 14);
      }
      if (t >= 670 && t < 1130) {
        const alpha = 1 - k.clamp((t - 920) / 210);
        ring(T.x, T.y, 9, 13, NATURE, alpha, 2);
      }
      if (e >= 0 && e < 150) k.drawHit(k.hitStyle('b43:friend', NATURE, { S: 25, spikes: 4, jag: 0 }), T, e);
    },
  });

  // Bless: broad gold-white heavenly rays touch every body, then leave a halo over every head.
  FX.register('bless', {
    palette: GOLD,
    travel: 210,
    beats: (event, kit, travel) =>
      (event.targets?.length ? event.targets : [null]).map(target => ({
        at: kit.CAST + travel,
        stop: 75,
        target,
        kind: 'soft',
        power: 0,
      })),
    end: () => 1450,
    ground(s) {
      const t = s.c.t - k.CAST;
      if (t < 0) return;
      for (const hit of s.hits) {
        const F = feet(body(s, hit));
        ring(F.x, F.y, 11, 5, GOLD, 1 - k.clamp((t - 650) / 420));
      }
    },
    air(s) {
      const t = s.c.t - k.CAST;
      if (t < 0) return;
      for (const hit of s.hits) {
        const T = k.P(body(s, hit)),
          F = feet(body(s, hit)),
          e = s.real(hit);
        if (t < 700) {
          const ray = stamp('bless-rays', 23, 44, GOLD, (set, rect) => {
            rect(3, 2, 3, 32, 3);
            rect(7, 1, 3, 38, 4);
            rect(11, 1, 3, 41, 5);
            rect(15, 2, 3, 36, 4);
            rect(19, 3, 2, 29, 3);
          });
          k.blit(ray, T.x - 12, F.y - 43 - (1 - k.ease(k.clamp(t / 210))) * 15, t < 450 ? 0.75 : 0.5);
        }
        if (t >= 160 && t < 1080)
          ring(
            T.x,
            T.y - 12 + (1 - k.ease(k.clamp((t - 160) / 180))) * -7,
            8,
            3,
            GOLD,
            1 - k.clamp((t - 870) / 210),
            2,
          );
        k.drawHit(k.hitStyle('b43:bless', GOLD, { S: 25, spikes: 4, jag: 0 }), T, e);
        motes(s, { x: T.x, y: F.y - 2 }, GOLD, e - 170, 5, 9);
      }
    },
  });

  // Feather Fall: great white feathers sway around each creature over a bobbing pale-blue air cushion.
  FX.register('feather', {
    palette: WIND,
    travel: 200,
    beats: (event, kit, travel) =>
      (event.targets?.length ? event.targets : [null]).map(target => ({
        at: kit.CAST + travel,
        stop: 60,
        target,
        kind: 'soft',
        power: 0,
      })),
    end: () => 1580,
    ground(s) {
      const t = s.c.t - k.CAST;
      if (t < 0) return;
      for (const hit of s.hits) {
        const F = feet(body(s, hit)),
          bob = Math.sin(k.clamp((t - 200) / 900) * k.tau) * 2;
        const alpha = 1 - k.clamp((t - 960) / 270);
        ring(F.x, F.y + 2, 12, 5, WIND, alpha, 3);
        ring(F.x, F.y - 1 + bob, 9, 3, WIND, alpha, 2);
      }
    },
    air(s) {
      const t = s.c.t - k.CAST;
      if (t < 0) return;
      for (const hit of s.hits) {
        const T = k.P(body(s, hit)),
          F = feet(body(s, hit));
        for (let i = 0; i < 3; i++) {
          const local = k.clamp((t - i * 70) / 1050),
            sway = Math.sin(local * 7 + i * 2);
          const x = T.x + (i - 1) * 13 + sway * 4,
            y = T.y - 18 + local * 27;
          if (t < 1120) k.blitRotated(feather(), x, y, sway * 0.35 + (i - 1) * 0.25);
        }
        const e = s.real(hit);
        if (e >= 0 && e < 140)
          k.drawHit(k.hitStyle('b43:feather', WIND, { S: 23, spikes: 4, jag: 0 }), { x: T.x, y: F.y - 2 }, e);
        // Two rising support curls bob against the figure's sides; the actual token remains board-owned.
        if (t >= 200 && t < 1080)
          for (const side of [-1, 1]) {
            const bob = Math.sin((t - 200) / 160) * 2;
            stroke(
              Array.from({ length: 13 }, (_, j) => ({
                x: T.x + side * (8 + Math.sin((j / 12) * Math.PI) * 3),
                y: F.y - 3 - j * 0.7 + bob,
              })),
              WIND,
              2,
            );
          }
      }
    },
  });

  // Create or Destroy Water: a bright cyan upsurge fills the cube centre, throws fat drops and settles to a puddle.
  FX.register('create-or-destroy-water', {
    palette: WATER,
    travel: 240,
    beats: (event, kit, travel) => beat(event, travel, 'soft', 85),
    end: () => 1490,
    ground(s) {
      const t = s.c.t - k.CAST;
      if (t < 0) return;
      const { C, pts } = cube(s),
        width = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      const r = Math.min(28, Math.max(11, width * 0.38)),
        alpha = 1 - k.clamp((t - 850) / 310);
      ring(C.x, C.y, 5 + k.ease(k.clamp(t / 240)) * r, 4 + k.ease(k.clamp(t / 240)) * r * 0.36, WATER, alpha, 3);
      if (t < 700) {
        const column = stamp('water-column', 31, 44, WATER, (set, rect) => {
          for (let y = 3; y < 40; y++)
            for (let x = 5; x < 26; x++) {
              const edge = 3 + (y > 29 ? (y - 29) * 0.3 : 0);
              if (Math.abs(x - 15) <= 8 + (y > 29 ? edge : 0)) set(x, y, x < 10 ? 3 : x < 14 ? 5 : x < 21 ? 4 : 3);
            }
          rect(4, 4, 4, 7, 5);
          rect(23, 3, 3, 9, 4);
          rect(2, 34, 27, 5, 4);
          rect(3, 34, 25, 2, 5);
        });
        const rise = k.ease(k.clamp(t / 240)),
          settle = k.clamp((t - 490) / 210);
        k.blit(column, C.x - 15, C.y - 39 + (1 - rise + settle) * 27, t < 560 ? 1 : 0.5);
      }
      if (t >= 680) ring(C.x - 3, C.y - 1, r * 0.58, r * 0.19, WATER, alpha * 0.75, 2);
    },
    air(s) {
      const t = s.c.t - k.CAST,
        hit = s.hits[0],
        { C } = cube(s),
        e = s.real(hit);
      if (t < 0) return;
      if (e >= 0 && e < 630) {
        for (let i = 0; i < 7; i++) {
          const q = e / 630,
            a = k.hash(i, s.event.seed, 6) * k.tau;
          const r = 7 + q * (14 + k.hash(i, s.event.seed, 7) * 12);
          const x = C.x + Math.cos(a) * r,
            y = C.y - 15 + Math.sin(a) * r * 0.45 - Math.sin(q * Math.PI) * 16 + q * q * 17;
          show(droplet(), x, y, e < 470 ? 1 : 0.5);
        }
        hitArt(s, hit, { x: C.x, y: C.y - 18 }, WATER, 'water', 30, 7);
      }
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
