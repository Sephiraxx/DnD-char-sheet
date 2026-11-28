/* Pixel spells, batch 37. See docs/pixel-spells/BRIEF.md. */
(function (root) {
  'use strict';
  const FX = root.BoardPixelFX;
  if (!FX) return;
  const k = FX.kit;
  const PSY = ['#210c28', '#582255', '#a74290', '#ee7ccc', '#ffd6f2', '#ffffff'];
  const BLANK = ['#142334', '#324f70', '#7196ae', '#b7dfec', '#efffff', '#ffffff'];
  const CLOUD = ['#230d13', '#38252b', '#79302b', '#e55b25', '#ffb947', '#fff1c0'];
  const DARK = ['#090812', '#141020', '#29203e', '#6c3b88', '#df8acc', '#fff0fb'];
  const GOLD = ['#302019', '#715125', '#bd8938', '#f5cb68', '#fff0bf', '#ffffff'];
  const RIFT = ['#1b102b', '#48275d', '#a94aa6', '#67c5da', '#d5f8ff', '#ffffff'];
  const DOOR = ['#130f24', '#29243c', '#554573', '#9e82bd', '#dbc8ed', '#fff5ff'];
  const EARTH = ['#251b18', '#4f382c', '#826045', '#bd9266', '#e6c99a', '#fff1cd'];
  const WATER = ['#0b2130', '#174663', '#207c9b', '#60bed0', '#b4edf1', '#ffffff'];
  const CHANGE = ['#15271d', '#275943', '#4a9a67', '#a2d183', '#f5e8aa', '#ffffff'];
  const GEM = ['#2b1425', '#66253f', '#b54665', '#ed9c87', '#ffe0a0', '#ffffff'];

  function beats(event, kit, travel, stop = 90, kind = 'soft', power = 0.04) {
    return (event.targets?.length ? event.targets : [null]).map(target => ({
      at: kit.CAST + travel,
      stop,
      target,
      kind,
      power,
    }));
  }
  function subject(s, hit = s.hits[0]) {
    const t = s.targets.find(t => t.id === hit?.id) || s.targets[0];
    if (t) return t;
    if (s.pose.target) return s.pose.target;
    const b = s.pose.base || s.pose.hand || { x: 0, y: 0 };
    return { x: b.x, y: b.y - 0.5, baseX: b.x, baseY: b.y };
  }
  function foot(s, t = subject(s)) {
    return k.P({ x: t.baseX ?? t.x, y: t.baseY ?? t.y + 0.4 });
  }
  function zone(s) {
    return {
      C: k.P(s.area || subject(s)),
      R: s.area ? Math.max(4, (s.area.feet / (s.grid.feet || 5)) * 16) : 20,
    };
  }
  const seed = s => s.event.seed || 0;
  const age = s => s.c.t - s.hits[0].at;
  const live = s => s.c.t >= k.CAST;
  function square(x, y, p, i, size = 1) {
    k.dot(x, y, p[0], size + 2);
    k.dot(x, y, p[i], size);
  }
  function stroke(points, p, index = 3, size = 1) {
    const samples = [];
    for (let j = 1; j < points.length; j++) {
      const a = points[j - 1],
        b = points[j];
      const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / Math.max(1, size)));
      for (let i = 0; i <= n; i++) samples.push({ x: k.mix(a.x, b.x, i / n), y: k.mix(a.y, b.y, i / n) });
    }
    for (const [color, w] of [
      [p[0], size + 2],
      [p[index], size],
    ])
      for (const q of samples) k.dot(q.x, q.y, color, w);
  }
  // Rings are cached rasters, including the large 60-foot boundary.
  function ring(C, rx, ry, p, index = 3, dashed = false, turn = 0) {
    rx = Math.max(2, Math.round(rx));
    ry = Math.max(2, Math.round(ry));
    const phase = ((Math.floor(turn) % 12) + 12) % 12;
    const w = rx * 2 + 6,
      h = ry * 2 + 6;
    const img = k.sprite(`b37:ring:${p[0]}:${rx}:${ry}:${index}:${dashed}:${phase}`, w, h, p, set => {
      for (let y = 2; y < h - 2; y++)
        for (let x = 2; x < w - 2; x++) {
          const dx = x - rx - 3,
            dy = y - ry - 3;
          const d = Math.hypot(dx / rx, dy / ry);
          if (Math.abs(d - 1) * Math.min(rx, ry) > 0.65) continue;
          if (dashed && (Math.floor(((Math.atan2(dy / ry, dx / rx) + Math.PI) / k.tau) * 24) + phase) % 2) continue;
          set(x, y, index);
        }
    });
    k.blit(img, C.x - rx - 3, C.y - ry - 3);
  }
  function impacts(s, p, name, size = 30, count = 7) {
    for (let i = 0; i < s.hits.length; i++) {
      const hit = s.hits[i],
        e = s.real(hit);
      const T = k.P(subject(s, hit));
      k.drawHit(k.hitStyle(`b37:${name}`, p, { S: size, spikes: 5, minor: 3, jag: 0.3 }), T, e);
      k.shards(T, e, p, seed(s) + i * 17, count, size * 0.7);
    }
  }
  function halo(s, p) {
    if (!live(s) || age(s) > 650) return;
    const F = foot(s),
      q = k.clamp((s.c.t - k.CAST) / 200);
    ring(F, 10 + Math.round(q * 5), 5 + Math.round(q * 3), p, 3, true, Math.floor(s.c.t / 90));
  }
  // Small, outlined emblems have deliberately solid bands and empty negative space.
  function emblem(name, p, frame = 0) {
    return k.sprite(`b37:emblem:${name}:${p[0]}:${frame}`, 39, 43, p, set => {
      const put = (x, y, i) => set(x + 19, y + 21, i);
      const line = (x, y, X, Y, i, width = 1) => {
        const n = Math.max(1, Math.ceil(Math.max(Math.abs(X - x), Math.abs(Y - y))));
        for (let j = 0; j <= n; j++)
          for (let a = 0; a < width; a++) put(Math.round(k.mix(x, X, j / n)) + a, Math.round(k.mix(y, Y, j / n)), i);
      };
      if (name === 'brain') {
        for (let y = -9; y <= 6; y++)
          for (let x = -10; x <= 10; x++) {
            const side = x < 0 ? -1 : 1;
            const d = Math.min(
              Math.hypot((x + 4) / 6, (y + 4) / 6),
              Math.hypot((x - 4) / 6, (y + 4) / 6),
              Math.hypot(x / 9, y / 6),
            );
            if (d > 1 || (frame && Math.abs(x) < 2)) continue;
            put(x + side * frame * 2, y + frame * (x % 3 === 0 ? 1 : 2), y < -4 ? 4 : x < 0 ? 3 : 2);
          }
        if (!frame) {
          line(0, -8, 0, 5, 1);
          line(-7, -3, -3, -5, 1);
          line(-3, -5, -4, 1, 1);
          line(4, -6, 7, -3, 1);
          line(7, -3, 3, 1, 1);
        }
      } else if (name === 'shield') {
        for (let y = -13; y <= 13; y++)
          for (let x = -11; x <= 11; x++) {
            const bound = y < 2 ? 11 : 11 - (y - 2) * 0.82;
            if (Math.abs(x) > bound || (y < -10 && Math.abs(x) > 7)) continue;
            if (Math.abs(x) > bound - 2 || y < -10 || y > 10) put(x, y, x < 0 ? 5 : 3);
          }
        // An empty white centre: no eye, rune or thought can enter.
        for (let y = -7; y <= 3; y++)
          for (let x = -5; x <= 5; x++) if (Math.hypot(x / 5, (y + 2) / 6) <= 1) put(x, y, 4);
      } else if (name === 'word') {
        line(-7, -12, 7, -12, 4, 2);
        line(0, -12, 0, 10, 3, 2);
        line(-9, -4, 9, -4, 4, 2);
        line(-9, -4, -4, 3, 3, 2);
        line(9, -4, 4, 3, 3, 2);
        line(-5, 10, 5, 10, 5, 2);
      } else if (name === 'rift') {
        for (let y = -17; y <= 16; y++) {
          const x = Math.round(Math.sin(y * 0.36) * 3);
          const w = Math.max(1, Math.round((17 - Math.abs(y)) * 0.35));
          for (let j = -w; j <= w; j++) put(x + j, y, j < -w + 2 ? 2 : j > w - 2 ? 4 : 1);
        }
        line(-11, -9, -6, -6, 3);
        line(7, 4, 12, 7, 2);
      } else if (name === 'door') {
        for (let y = -18; y <= 17; y++)
          for (let x = -12; x <= 12; x++) {
            if (Math.abs(x) >= 10 || y <= -16 || y >= 15) put(x, y, x < 0 ? 4 : 2);
            else put(x, y, y > 8 ? 2 : 1);
          }
        const edge = -9 + Math.round(18 * (1 - frame / 4));
        for (let y = -15; y <= 14; y++) for (let x = -9; x <= edge; x++) put(x, y, x === edge ? 4 : 2);
        if (frame < 4) put(edge - 2, 1, 5);
        if (frame >= 3) {
          line(-8, 14, 0, 7, 3);
          line(8, 14, 0, 7, 3);
          line(-6, 12, 6, 12, 3);
          line(-3, 10, 3, 10, 3);
        }
      } else if (name === 'mouth') {
        for (let y = -3; y <= 3; y++)
          for (let x = -7; x <= 7; x++) if (Math.hypot(x / 8, y / 4) < 1) put(x, y, Math.abs(y) > 1 ? 3 : 1);
        for (let x = -5; x <= 5; x += 3) {
          put(x, -1, 4);
          put(x + 1, 1, 2);
        }
      } else if (name === 'beast') {
        if (frame === 0) {
          for (let y = -11; y <= -6; y++) for (let x = -3; x <= 3; x++) put(x, y, 4);
          line(0, -5, 0, 6, 3, 4);
          line(-2, 4, -5, 12, 2, 2);
          line(2, 4, 5, 12, 3, 2);
          line(-1, -3, -8, 3, 3, 2);
          line(2, -3, 8, 3, 4, 2);
        } else {
          for (let y = -8; y <= 7; y++)
            for (let x = -7; x <= 8; x++) if (Math.hypot((x - 1) / 8, y / 9) < 1) put(x, y, y < -2 ? 3 : 2);
          line(2, -7, 10, -8, 4, 3);
          line(8, -6, 12, -4, 3, 3);
          line(-4, -6, -8, -14, 4, 2);
          line(3, -8, 5, -14, 4, 2);
          line(-5, 1, -15, -7, 3, 2);
          line(-15, -7, -12, 6, 2, 2);
          line(-12, 6, -5, 4, 3);
          line(5, 2, 14, -3, 3);
          line(14, -3, 12, 9, 2);
          line(12, 9, 5, 5, 3);
          line(-3, 6, -10, 13, 3, 2);
          line(-10, 13, -15, 11, 4);
          put(6, -6, 5);
        }
      } else if (name === 'prison') {
        const r = frame ? 7 : 13;
        for (let y = -r; y <= r; y++)
          for (let x = -r; x <= r; x++)
            if (Math.abs(x) / r + Math.abs(y) / r <= 1) put(x, y, x < 0 ? (y < 0 ? 4 : 2) : 1);
        line(0, -r, 0, r, 3);
        line(-r, 0, 0, -r, 4);
        line(0, -r, r, 0, 5);
        line(-r, 0, 0, r, 3);
        line(0, r, r, 0, 2);
        if (frame) {
          line(-1, -2, 1, -2, 5);
          line(0, 0, 0, 3, 5);
        } else for (let x = -6; x <= 6; x += 4) line(x, -6, x, 6, 4);
      } else if (name === 'star') {
        for (let y = -16; y <= 16; y++)
          for (let x = -16; x <= 16; x++) {
            const d = Math.hypot(x, y),
              a = Math.atan2(y, x);
            const r = 4 + 12 * Math.abs(Math.cos(a * 4)) ** 12;
            if (d < r) put(x, y, d < 3 ? 5 : d < 7 ? 4 : 3);
          }
      } else if (name === 'hourglass') {
        line(-7, -12, 7, -12, 4, 2);
        line(-7, 12, 7, 12, 4, 2);
        line(-6, -10, -6, -6, 3);
        line(6, -10, 6, -6, 3);
        line(-6, -6, 0, 0, 4);
        line(6, -6, 0, 0, 4);
        line(0, 0, -6, 6, 3);
        line(0, 0, 6, 6, 3);
        line(-6, 6, -6, 10, 3);
        line(6, 6, 6, 10, 3);
        for (let y = 5; y <= 9; y++) line(4 - y, y, y - 4, y, 4);
      }
    });
  }
  function badge(name, C, p, frame = 0) {
    k.blit(emblem(name, p, frame), C.x - 19, C.y - 21);
  }
  function flash(p, alpha = 0.18) {
    return (event, e) => (e < 32 ? { color: p[4], alpha } : e < 68 ? { color: p[0], alpha: alpha * 0.8 } : null);
  }
  function zoneReach(feet, up = 2) {
    return (event, grid) => ({ r: (event.area?.feet || feet) / (grid.feet || 5) + 1, up });
  }

  function cloudBody(s, darkness, linger = false) {
    const e = age(s);
    if (!linger && e < 0) return;
    const { C, R } = zone(s),
      p = darkness ? DARK : CLOUD;
    const f = linger ? 4 + (Math.floor(s.c.raw / 180) % 3) : Math.min(10, Math.floor(Math.max(0, e) / 110));
    const r = Math.round(R),
      w = r * 2 + 8,
      phase = seed(s) % 7;
    const img = k.sprite(`b37:cloud:${darkness}:${r}:${f}:${phase}`, w, w, p, set => {
      const billows = Array.from({ length: 9 }, (_, i) => {
        const a = (i / 9) * k.tau + phase * 0.2 + f * 0.035;
        return { x: Math.cos(a) * r * 0.61, y: Math.sin(a) * r * 0.61, r: r * (0.32 + k.hash(i, phase) * 0.1) };
      });
      for (let y = 2; y < w - 2; y++)
        for (let x = 2; x < w - 2; x++) {
          const dx = x - r - 4,
            dy = y - r - 4,
            d = Math.hypot(dx, dy) / r;
          if (d > 1) continue;
          let light = 1 - Math.hypot(dx, dy) / (r * 0.75);
          for (const b of billows) light = Math.max(light, 1 - Math.hypot(dx - b.x, dy - b.y) / b.r);
          if (light < 0) continue;
          if (darkness) {
            set(x, y, d > 0.91 ? 2 : 1);
            if (d > 0.85 && d < 0.89 && k.dith(x, y) < 0.25) set(x, y, 3);
          } else if (f < 2) {
            set(x, y, d < 0.24 ? (f === 0 ? 5 : 1) : d < 0.65 ? 3 : 2);
          } else {
            const heat = Math.max(0, 1 - Math.abs(light - 0.58) * 3.5);
            const ember = Math.sin(dx / (r * 0.19) + f * 0.6) * Math.cos(dy / (r * 0.18) - f * 0.4);
            set(
              x,
              y,
              f > 8 ? (light > 0.55 ? 2 : 1) : ember > 0.2 && heat > 0.35 ? (heat > 0.8 ? 4 : 3) : light > 0.35 ? 2 : 1,
            );
          }
        }
    });
    k.blit(img, C.x - r - 4, C.y - r - 4);
    if (darkness && (linger || e < 1000)) {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * k.tau + phase,
          rr = R * (0.38 + 0.25 * k.hash(i, phase));
        if ((i + Math.floor(s.c.raw / 170)) % 3 === 0) continue;
        badge('mouth', { x: C.x + Math.cos(a) * rr, y: C.y + Math.sin(a) * rr }, DARK);
      }
    }
  }

  // Feeblemind: pink psychic barbs converge on a brain, splitting its bright folds into falling fragments.
  FX.register('feeblemind', {
    palette: PSY,
    travel: 170,
    beats: (event, kit, travel) => beats(event, kit, travel, 130, 'hit', 0.075),
    end: (event, travel) => k.CAST + travel + 650,
    flash: flash(PSY, 0.13),
    air(s) {
      if (!live(s)) return;
      const T = k.P(subject(s)),
        e = age(s);
      if (e < 420) {
        const f = e < 0 ? 0 : Math.min(3, Math.floor(e / 110));
        badge('brain', { x: T.x, y: T.y - 5 + Math.max(0, e - 180) / 32 }, PSY, f);
      }
      if (e < 0)
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * k.tau + 0.4,
            r = 19 - ((s.c.t - k.CAST) / 170) * 13;
          const x = T.x + Math.cos(a) * r,
            y = T.y - 5 + Math.sin(a) * r;
          stroke(
            [
              { x: x + Math.cos(a) * 5, y: y + Math.sin(a) * 5 },
              { x, y },
              { x: x + Math.sin(a) * 3, y: y - Math.cos(a) * 3 },
            ],
            PSY,
            4,
          );
        }
      impacts(s, PSY, 'feeblemind', 34, 10);
    },
  });

  // Mind Blank: an empty pearl-white mental shield turns away pink intrusive thoughts and locks shut.
  FX.register('mind-blank', {
    palette: BLANK,
    travel: 180,
    beats: (event, kit, travel) => beats(event, kit, travel, 65),
    end: (event, travel) => k.CAST + travel + 680,
    ground: s => halo(s, BLANK),
    air(s) {
      if (!live(s)) return;
      const T = k.P(subject(s)),
        e = s.real(s.hits[0]);
      badge('shield', { x: T.x, y: T.y - 3 }, BLANK);
      if (e >= 0 && e < 430)
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * k.tau,
            r = 12 + k.ease(e / 430) * 9;
          square(T.x + Math.cos(a) * r, T.y - 3 + Math.sin(a) * r * 0.7, PSY, i % 2 ? 2 : 3, 2);
        }
      impacts(s, BLANK, 'mind-blank', 22, 5);
    },
  });

  // Incendiary Cloud: a full twenty-foot bed of rolling soot, orange furnace seams and rising hot cinders.
  FX.register('incendiary-cloud', {
    palette: CLOUD,
    travel: 240,
    beats: (event, kit, travel) => beats(event, kit, travel, 155, 'blast', 0.085),
    end: (event, travel) => k.CAST + travel + 1200,
    reach: zoneReach(20, 2),
    flash: flash(CLOUD, 0.22),
    ground: s => cloudBody(s, false),
    linger(s) {
      if (s.linger > 0.2 && age(s) >= 1200) cloudBody(s, false, true);
    },
    air(s) {
      impacts(s, CLOUD, 'incendiary-cloud', 36, 9);
      const e = s.real(s.hits[0]);
      if (e < 0 || e > 1150) return;
      const { C, R } = zone(s);
      for (let i = 0; i < 15; i++) {
        const a = k.hash(i, seed(s)) * k.tau,
          r = R * Math.sqrt(k.hash(i, seed(s), 1)) * 0.85;
        const q = (e / 640 + k.hash(i, seed(s), 2)) % 1;
        if (e > 870 && i % 2) continue;
        square(C.x + Math.cos(a) * r, C.y + Math.sin(a) * r - q * 18, CLOUD, q < 0.5 ? 4 : 3, q < 0.7 ? 2 : 1);
      }
    },
  });

  // Maddening Darkness: a vast violet-black sphere swallows the floor; disembodied mouths hiss psychic splinters.
  FX.register('maddening-darkness', {
    palette: DARK,
    travel: 210,
    beats: (event, kit, travel) => beats(event, kit, travel, 145, 'hit', 0.08),
    end: (event, travel) => k.CAST + travel + 1190,
    reach: zoneReach(60, 1),
    flash: flash(DARK, 0.18),
    ground: s => cloudBody(s, true),
    linger(s) {
      if (s.linger > 0.2 && age(s) >= 1190) cloudBody(s, true, true);
    },
    air(s) {
      impacts(s, PSY, 'maddening-darkness', 32, 8);
      const e = age(s);
      if (e < 0 || e > 1000) return;
      const { C, R } = zone(s);
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * k.tau + seed(s),
          rr = R * 0.83;
        const x = C.x + Math.cos(a) * rr,
          y = C.y + Math.sin(a) * rr;
        const d = Math.floor(s.c.raw / 95 + i) % 3;
        stroke(
          [
            { x: x - 4, y: y + d },
            { x, y: y - 3 },
            { x: x + 3, y: y + 2 },
            { x: x + 6, y: y - d },
          ],
          DARK,
          3,
        );
      }
    },
  });

  // Demiplane: a rectangular shadow door swings inward, revealing an empty violet room and receding floor.
  FX.register('demiplane', {
    palette: DOOR,
    travel: 260,
    beats: (event, kit, travel) => beats(event, kit, travel, 80),
    end: (event, travel) => k.CAST + travel + 850,
    ground(s) {
      if (!live(s)) return;
      const T = k.P(subject(s));
      stroke(
        [
          { x: T.x - 12, y: T.y + 16 },
          { x: T.x + 12, y: T.y + 16 },
          { x: T.x + 16, y: T.y + 20 },
          { x: T.x - 16, y: T.y + 20 },
          { x: T.x - 12, y: T.y + 16 },
        ],
        DOOR,
        2,
        2,
      );
    },
    air(s) {
      if (!live(s)) return;
      const T = k.P(subject(s)),
        e = age(s);
      badge('door', T, DOOR, Math.min(4, Math.floor((s.c.t - k.CAST) / 65)));
      if (e >= 0 && e < 300) {
        const H = { x: T.x + 9, y: T.y };
        k.drawHit(k.hitStyle('b37:door-latch', DOOR, { S: 20, spikes: 4, jag: 0.1 }), H, s.real(s.hits[0]));
        k.shards(H, s.real(s.hits[0]), DOOR, seed(s), 5, 10);
      }
    },
    linger(s) {
      if (s.linger > 0.2) badge('door', k.P(subject(s)), DOOR, 4);
    },
  });

  // Telepathy: two pink minds connect by paired thought waves, with bright messages flowing both ways.
  FX.register('telepathy', {
    palette: PSY,
    travel: 240,
    beats: (event, kit, travel) => beats(event, kit, travel, 60),
    end: (event, travel) => k.CAST + travel + 760,
    ground: s => halo(s, PSY),
    air(s) {
      if (!live(s)) return;
      const T = k.P(subject(s)),
        b = s.pose.base || s.pose.hand || subject(s);
      const H = k.P({ x: b.x, y: b.y - 0.65 });
      const dx = T.x - H.x,
        dy = T.y - H.y,
        L = Math.hypot(dx, dy) || 1;
      const path = (q, side) => ({
        x: k.mix(H.x, T.x, q) - (dy / L) * Math.sin(q * Math.PI) * 7 * side,
        y: k.mix(H.y, T.y - 5, q) + (dx / L) * Math.sin(q * Math.PI) * 7 * side,
      });
      for (let side = -1; side <= 1; side += 2) {
        for (let i = 1; i < 24; i++) {
          if (i % 3 === 0) continue;
          const q = i / 24,
            Q = path(q, side);
          square(Q.x, Q.y, PSY, 2, 1);
        }
        const q = ((s.c.t - k.CAST) / 460) % 1,
          Q = path(side > 0 ? q : 1 - q, side);
        square(Q.x, Q.y, PSY, 4, 3);
      }
      badge('brain', { x: H.x, y: H.y - 4 }, PSY);
      badge('brain', { x: T.x, y: T.y - 5 }, PSY);
      impacts(s, PSY, 'telepathy', 22, 5);
    },
  });

  function faults(R, phase) {
    const r = Math.round(R),
      w = r * 2 + 8;
    return k.sprite(`b37:faults:${r}:${phase}`, w, w, EARTH, set => {
      const mark = (x, y, i) => set(x + r + 4, y + r + 4, i);
      for (let ray = 0; ray < 9; ray++) {
        const a = (ray / 9) * k.tau + phase * 0.11;
        let last = { x: 0, y: 0 };
        for (let j = 1; j <= 6; j++) {
          const rr = (j / 6) * r * (0.7 + 0.25 * k.hash(ray, phase));
          const bend = (k.hash(ray, j, phase) - 0.5) * r * 0.18;
          const Q = { x: Math.cos(a) * rr - Math.sin(a) * bend, y: Math.sin(a) * rr + Math.cos(a) * bend };
          const n = Math.max(1, Math.ceil(Math.hypot(Q.x - last.x, Q.y - last.y)));
          for (let t = 0; t <= n; t++) {
            const x = Math.round(k.mix(last.x, Q.x, t / n)),
              y = Math.round(k.mix(last.y, Q.y, t / n));
            mark(x - 1, y, 3);
            mark(x, y, 1);
            mark(x + 1, y + 1, 1);
          }
          if (j % 2 === 0)
            for (let t = 0; t < r * 0.15; t++)
              mark(Math.round(Q.x + Math.cos(a + 0.8) * t), Math.round(Q.y + Math.sin(a + 0.8) * t), 2);
          last = Q;
        }
      }
    });
  }

  function wall(s) {
    const T = k.P(s.area || subject(s));
    const corners = s.area ? k.outline(s.area, s.grid) : [];
    let A = { x: T.x - 20, y: T.y + 8 },
      B = { x: T.x + 20, y: T.y + 8 };
    if (corners.length >= 4) {
      const point = i => (Array.isArray(corners[i]) ? { x: corners[i][0], y: corners[i][1] } : corners[i]);
      const a = point(0),
        b = point(1),
        c = point(2),
        d = point(3);
      A = k.P({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
      B = k.P({ x: (c.x + d.x) / 2, y: (c.y + d.y) / 2 });
    } else if (s.area) {
      const length = (s.area.feet / (s.grid.feet || 5)) * 16;
      A = T;
      B = { x: T.x + Math.cos(s.area.dir || 0) * length, y: T.y + Math.sin(s.area.dir || 0) * length };
    }
    return { A, B, height: s.area ? Math.min(64, ((s.area.height || 25) / (s.grid.feet || 5)) * 16) : 28 };
  }
  function wave(s, settled = false) {
    const { A, B, height } = wall(s);
    const dx = B.x - A.x,
      dy = B.y - A.y,
      L = Math.max(1, Math.hypot(dx, dy));
    const ux = dx / L,
      uy = dy / L,
      e = s.c.t - k.CAST;
    const f = settled ? 3 : Math.min(7, Math.floor(Math.max(0, e) / 170));
    const lift = [0.35, 0.72, 1, 1, 0.8, 0.46, 0.15, 0.08][f];
    const h = Math.round(height * lift),
      pad = 11;
    const w = Math.ceil(Math.abs(dx)) + pad * 2,
      ht = Math.ceil(Math.abs(dy)) + h + pad * 2;
    const ax = pad - Math.min(0, dx),
      ay = pad + h - Math.min(0, dy);
    const phase = seed(s) % 5;
    const img = k.sprite(`b37:wave:${Math.round(dx)}:${Math.round(dy)}:${h}:${f}:${phase}`, w, ht, WATER, set => {
      for (let i = 0; i <= Math.ceil(L); i++) {
        const q = Math.min(L, i),
          x = ax + ux * q,
          y = ay + uy * q;
        const top = Math.round(h * (0.85 + 0.15 * Math.sin(q / 9 + phase + f * 0.7)));
        for (let j = 0; j <= top; j++) {
          const band = j / Math.max(1, top);
          const color = j > top - 3 ? 5 : band > 0.65 ? 4 : band > 0.35 ? 3 : 2;
          for (let z = -2; z <= 2; z++) set(Math.round(x) + z, Math.round(y) - j, color);
        }
        if (f < 6)
          for (let curl = 0; curl < 5; curl++)
            set(Math.round(x - uy * curl), Math.round(y - top + curl * 0.5 + ux * curl), curl < 3 ? 5 : 3);
      }
    });
    k.blit(img, A.x - ax, A.y - ay);
  }
})(typeof window !== 'undefined' ? window : globalThis);
