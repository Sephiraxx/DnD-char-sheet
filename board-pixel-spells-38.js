/* Pixel spells, batch 38. See docs/pixel-spells/BRIEF.md. */
(function (root) {
  'use strict';
  const FX = root.BoardPixelFX;
  if (!FX) return;
  const k = FX.kit;
  const NIGHT = ['#130b20', '#30203f', '#5b386c', '#aa70bd', '#f7bbdf', '#ffffff'];
  const TIME = ['#231b20', '#514145', '#967652', '#d7b573', '#f4e9be', '#ffffff'];
  const MIND = ['#240b26', '#651959', '#b73592', '#f677cc', '#ffdef5', '#ffffff'];
  const VOID = ['#100b1c', '#1f142e', '#492351', '#ac4aa1', '#edb4ed', '#ffffff'];
  const GOLD = ['#291c20', '#70522c', '#ba8a38', '#f1c965', '#fff0ba', '#ffffff'];
  const FIRE = ['#291213', '#6d261b', '#bd4820', '#f4842d', '#ffca64', '#fff5d4'];
  const ROCK = ['#201b22', '#3a3037', '#66504b', '#9c7760', '#d5ac80', '#fff0d1'];
  const DEATH = ['#140a1b', '#351433', '#702149', '#b83f63', '#f8a3ae', '#fff1ed'];
  const LIFE = ['#10251f', '#246b51', '#51b885', '#aff1b5', '#fff1b5', '#ffffff'];
  const CHANGE = ['#21132d', '#553373', '#9d5ab2', '#e39ace', '#ffe1a8', '#ffffff'];
  const PLANAR = ['#0c192c', '#24375c', '#5869aa', '#a3b8ed', '#f4dcb0', '#ffffff'];
  const SILVER = ['#111d2d', '#304766', '#668eae', '#b1dce8', '#edfdff', '#ffffff'];
  const RAINBOW = ['#21142f', '#f55767', '#ff9b42', '#ffe279', '#6ed88c', '#64c9ef', '#7978dc', '#ca83ed'];
  const seed = s => s.event.seed || 0;
  const age = s => s.c.t - s.hits[0].at;
  const active = (s, until = 1100) => s.c.t >= k.CAST && age(s) < until;

  function beats(event, kit, travel, stop = 90, kind = 'soft', power = 0.05) {
    return (event.targets?.length ? event.targets : [null]).map(target => ({
      at: kit.CAST + travel,
      stop,
      target,
      kind,
      power,
    }));
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
  function subjects(s) {
    return s.targets.length ? s.targets.slice(0, 10) : [subject(s)];
  }
  function foot(t) {
    return k.P({ x: t.baseX ?? t.x, y: t.baseY ?? t.y + 0.5 });
  }
  function zone(s, feet = 30) {
    return { C: k.P(s.area || s.pose.target || subject(s)), R: ((s.area?.feet || feet) / (s.grid.feet || 5)) * k.PX };
  }
  function pixel(x, y, p, index = 3, size = 1) {
    k.dot(x, y, p[0], size + 2);
    k.dot(x, y, p[index], size);
  }
  // Bounded sampling keeps even long lines inexpensive. All outlines precede their fill.
  function stroke(A, B, p, index = 3, size = 1, limit = 42) {
    const n = Math.max(1, Math.min(limit, Math.ceil(Math.hypot(B.x - A.x, B.y - A.y) / size)));
    const width = Math.max(size, Math.ceil(Math.hypot(B.x - A.x, B.y - A.y) / n));
    for (const [color, w] of [
      [p[0], width + 2],
      [p[index], width],
    ])
      for (let j = 0; j <= n; j++) k.dot(k.mix(A.x, B.x, j / n), k.mix(A.y, B.y, j / n), color, w);
  }
  // Raster rings avoid hundreds of immediate-mode dots around large areas.
  function ring(C, rx, ry, p, index = 3, dashed = false, phase = 0) {
    rx = Math.max(2, Math.round(rx));
    ry = Math.max(2, Math.round(ry));
    phase = ((Math.floor(phase) % 8) + 8) % 8;
    const w = rx * 2 + 6,
      h = ry * 2 + 6;
    const img = k.sprite(`b38:ring:${p[0]}:${rx}:${ry}:${index}:${dashed}:${phase}`, w, h, p, set => {
      for (let y = 2; y < h - 2; y++)
        for (let x = 2; x < w - 2; x++) {
          const dx = (x - rx - 3) / rx,
            dy = (y - ry - 3) / ry;
          if (Math.abs(Math.hypot(dx, dy) - 1) * Math.min(rx, ry) > 0.65) continue;
          if (dashed && (Math.floor(((Math.atan2(dy, dx) + Math.PI) / k.tau) * 24) + phase) % 2) continue;
          set(x, y, index);
        }
    });
    k.blit(img, C.x - rx - 3, C.y - ry - 3);
  }
  function emblem(name, p, frame = 0) {
    return k.sprite(`b38:emblem:${name}:${p[0]}:${frame}`, 43, 49, p, set => {
      const put = (x, y, i) => set(x + 21, y + 24, i);
      const line = (x, y, X, Y, i, width = 1) => {
        const n = Math.max(1, Math.ceil(Math.max(Math.abs(X - x), Math.abs(Y - y))));
        for (let j = 0; j <= n; j++)
          for (let a = 0; a < width; a++) put(Math.round(k.mix(x, X, j / n)) + a, Math.round(k.mix(y, Y, j / n)), i);
      };
      if (name === 'nightmare') {
        for (let y = -13; y <= 13; y++)
          for (let x = -12; x <= 12; x++) {
            const edge = y < 0 ? 11 - Math.abs(y + 5) * 0.3 : 10 - y * 0.45;
            if (Math.abs(x) > edge || (y > 6 && (x + y + frame) % 5 < 2)) continue;
            put(x, y, y < -7 ? 3 : Math.abs(x) > edge - 2 ? 2 : 1);
          }
        line(-10, -9, -14, -18, 3, 2);
        line(9, -9, 14, -18, 3, 2);
        line(-8, -5, -3, -3, 4, 2);
        line(3, -3, 8, -5, 4, 2);
        for (let x = -5; x <= 5; x += 2) line(x, 3, x, 6 + (x & 1), 4);
      } else if (name === 'hourglass') {
        line(-9, -13, 9, -13, 4, 2);
        line(-9, 13, 9, 13, 3, 2);
        line(-8, -11, 6, 11, 3);
        line(8, -11, -6, 11, 3);
        for (let y = -9; y <= 9; y++) {
          const bound = y < 0 ? -y * 0.6 : y * 0.6;
          const sand = frame === 0 ? y < -4 || y > 8 : y > 2;
          for (let x = -Math.floor(bound); x <= bound; x++) if (sand) put(x, y, y < 0 ? 4 : 2);
        }
        line(0, -2, 0, 4, 5);
      } else if (name === 'brain') {
        for (let y = -10; y <= 7; y++)
          for (let x = -12; x <= 12; x++) {
            const d = Math.min(Math.hypot((x + 5) / 7, (y + 3) / 8), Math.hypot((x - 5) / 7, (y + 3) / 8));
            if (d <= 1 && (!frame || Math.abs(x) > 2)) put(x + Math.sign(x) * frame * 3, y, y < -5 ? 4 : x < 0 ? 3 : 2);
          }
        line(0, -9, 0, 6, 1);
        line(-8, -5, -4, -2, 1);
        line(-4, -2, -7, 3, 1);
        line(7, -6, 4, -2, 1);
        line(4, -2, 8, 2, 1);
      } else if (name === 'blade') {
        for (let y = -20; y <= 8; y++) {
          const half = Math.max(1, Math.min(4, Math.floor((y + 22) / 3)));
          const bend = y % 7 < 2 ? 1 : 0;
          for (let x = -half; x <= half; x++) put(x + bend, y, Math.abs(x) === half ? 4 : x < 0 ? 2 : 1);
        }
        line(-9, 8, 9, 8, 3, 2);
        line(0, 9, 0, 17, 2, 3);
        line(-2, 18, 2, 18, 4, 2);
      } else if (name === 'shield') {
        for (let y = -14; y <= 14; y++) {
          const bound = y < 2 ? 11 : Math.max(0, 11 - (y - 2));
          for (let x = -bound; x <= bound; x++) if (Math.abs(x) >= bound - 2 || y < -11) put(x, y, x < 0 ? 5 : 3);
        }
        line(0, -9, 0, 7, 4, 2);
        line(-6, -2, 6, -2, 4, 2);
      } else if (name === 'word') {
        line(-8, -12, 8, -12, 4, 2);
        line(0, -12, 0, 12, 3, 2);
        line(-10, -3, 10, -3, 4, 2);
        line(-10, -3, -5, 3, 3, 2);
        line(10, -3, 5, 3, 3, 2);
        line(-5, 11, 5, 11, 5, 2);
      } else if (name === 'skull') {
        for (let y = -10; y <= 8; y++)
          for (let x = -9; x <= 9; x++)
            if (Math.hypot(x / 10, (y + 3) / 9) < 1 || (y > 1 && Math.abs(x) < 6)) put(x, y, y < -5 ? 4 : 2);
        line(-6, -3, -3, -3, 1, 3);
        line(3, -3, 6, -3, 1, 3);
        put(0, 1, 1);
        for (let x = -4; x <= 4; x += 2) line(x, 6, x, 8, 4);
      } else if (name === 'eye') {
        for (let x = -15; x <= 15; x++) {
          const y = Math.round(7 * (1 - Math.abs(x) / 15));
          put(x, y, 3);
          put(x, -y, 4);
        }
        for (let y = -5; y <= 5; y++)
          for (let x = -4; x <= 4; x++) if (x * x + y * y < 29) put(x, y, Math.abs(x) < 2 ? 1 : 4);
        line(-10, -10, -13, -14, 3);
        line(0, -11, 0, -17, 4);
        line(10, -10, 13, -14, 3);
      } else if (name === 'spirit') {
        for (let y = -14; y <= 13; y++)
          for (let x = -7; x <= 7; x++) {
            const d = y < -5 ? Math.hypot(x / 5, (y + 10) / 5) : Math.abs(x) / (6 - Math.max(0, y) * 0.22);
            if (d < 1 && (y < 8 || (x + y) % 4 > 0)) put(x, y, x < -2 ? 4 : x > 2 ? 2 : 3);
          }
        line(-5, -3, -11, 3, 3, 2);
        line(5, -3, 11, 3, 3, 2);
      } else if (name === 'dragon') {
        line(-1, -6, 4, 10, 3, 5);
        line(0, -7, 5, -13, 4, 4);
        line(5, -13, 10, -10, 4, 3);
        line(2, 10, -10, 13, 3, 2);
        for (let side = -1; side <= 1; side += 2) {
          for (let x = 4; x <= 15; x++) {
            const top = -2 - (x - 3) * 0.85;
            const bottom = x < 10 ? 1 : 3 - (x - 10) * 0.5;
            for (let y = Math.ceil(top); y <= bottom; y++) put(side * x, y, y < top + 3 ? 4 : 2);
          }
          line(side * 3, -2, side * 16, -13, 3, 2);
          line(side * 16, -13, side * 14, 3, 3);
          line(side * 14, 3, side * 3, 1, 3);
          line(side * 7, -4, side * 12, 2, 2);
        }
        put(7, -13, 5);
      } else if (name === 'butterfly') {
        for (let y = -11; y <= 9; y++)
          for (let x = -13; x <= 13; x++) {
            const d = Math.min(
              Math.hypot((Math.abs(x) - 7) / 6, (y + 5) / 7),
              Math.hypot((Math.abs(x) - 5) / 5, (y - 5) / 5),
            );
            if (d < 1 && Math.abs(x) > 1) put(x, y, d > 0.7 ? 2 : y < 0 ? 4 : 3);
          }
        line(0, -7, 0, 9, 1, 2);
        line(-1, -8, -4, -13, 3);
        line(1, -8, 4, -13, 3);
      } else if (name === 'frog') {
        for (let y = -4; y <= 9; y++)
          for (let x = -10; x <= 10; x++) if (Math.hypot(x / 10, (y - 3) / 7) < 1) put(x, y, y < 0 ? 4 : 3);
        line(-7, -7, -7, -3, 4, 4);
        line(6, -7, 6, -3, 4, 4);
        put(-7, -6, 1);
        put(7, -6, 1);
        line(-11, 11, -5, 8, 3, 2);
        line(11, 11, 5, 8, 3, 2);
      }
    });
  }
  function icon(name, C, p, frame = 0) {
    const img = emblem(name, p, frame);
    k.blit(img, C.x - 21, C.y - 24);
  }
  function impacts(s, p, name, size = 32, n = 6) {
    s.hits.slice(0, 10).forEach((hit, i) => {
      const T = k.P(subject(s, hit)),
        e = s.real(hit);
      k.drawHit(k.hitStyle(`b38:${name}`, p, { S: size, spikes: 6, minor: 3, jag: 0.35 }), T, e);
      k.shards(T, e, p, seed(s) + i * 19, n, size * 0.65);
    });
  }
  function halo(s, p) {
    if (!active(s, 750)) return;
    for (const t of subjects(s))
      ring(foot(t), 13 + Math.round(k.clamp(age(s) / 300) * 4), 7, p, 3, age(s) > 400, s.c.t / 100);
  }
  function flash(event, e) {
    return e < 32 ? { color: '#fff4dc', alpha: 0.22 } : e < 65 ? { color: '#180d24', alpha: 0.17 } : null;
  }

  // Weird: a thirty-foot nightmare pool; horned fear apparitions rear up at each victim's mind.
  FX.register('weird', {
    palette: NIGHT,
    travel: 460,
    beats: (e, kit, t) => beats(e, kit, t, 145, 'hit', 0.075),
    end: () => 1660,
    ground(s) {
      if (!active(s, 900)) return;
      const { C, R } = zone(s),
        q = k.ease(k.clamp((s.c.t - k.CAST) / 440));
      ring(C, R * q, R * q, NIGHT, 2, true, s.c.t / 100);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * k.tau + seed(s),
          d = R * 0.55;
        const Q = { x: C.x + Math.cos(a) * d, y: C.y + Math.sin(a) * d };
        ring(Q, 10 + Math.round(q * 6), 5, NIGHT, 1, true, i + s.c.t / 120);
      }
    },
    air(s) {
      if (!active(s, 850)) return;
      const e = age(s);
      for (const t of subjects(s)) {
        const T = k.P(t),
          lift = e < 0 ? k.ease(k.clamp((s.c.t - k.CAST) / 460)) * 12 : 12 + k.clamp(e / 700) * 6;
        if (e < 580) icon('nightmare', { x: T.x, y: T.y - lift }, NIGHT, Math.floor(s.c.t / 130) % 2);
        if (e >= 0 && e < 380) {
          stroke({ x: T.x - 16, y: T.y + 11 }, { x: T.x - 7, y: T.y - 6 }, NIGHT, 3, 1, 6);
          stroke({ x: T.x + 16, y: T.y + 11 }, { x: T.x + 7, y: T.y - 6 }, NIGHT, 3, 1, 6);
        }
      }
      impacts(s, MIND, 'weird', 34, 5);
    },
    linger(s) {
      const { C, R } = zone(s);
      ring(C, R, R, NIGHT, s.linger < 0.5 ? 1 : 2, true, s.c.raw / 180);
    },
  });

  // Psychic Scream: a silent magenta pressure wave fans out, splitting bright mind silhouettes at the heads.
  FX.register('psychic-scream', {
    palette: MIND,
    travel: 270,
    beats: (e, kit, t) => beats(e, kit, t, 190, 'blast', 0.09),
    end: () => 1250,
    flash,
    ground(s) {
      if (!active(s, 600) || !s.pose.hand) return;
      const H = k.P(s.pose.hand),
        reach = Math.max(
          24,
          ...subjects(s).map(t => {
            const T = k.P(t);
            return Math.hypot(T.x - H.x, T.y - H.y);
          }),
        );
      const q = k.clamp((s.c.t - k.CAST) / 460);
      if (q < 1)
        for (let i = 0; i < 3; i++)
          ring(H, Math.max(3, reach * q - i * 7), Math.max(3, reach * q - i * 7), MIND, 4 - i, true, i);
    },
    air(s) {
      if (!active(s, 600)) return;
      const e = age(s);
      for (const t of subjects(s)) {
        const T = k.P(t),
          head = { x: T.x, y: T.y - 10 };
        if (e < 220) icon('brain', head, MIND, e < 0 ? 0 : 1);
        if (e >= 0 && e < 340)
          for (let i = 0; i < 3; i++) ring(head, 13 + i * 5 + Math.round(e / 35), 9 + i * 3, MIND, 3, true, i);
      }
      impacts(s, MIND, 'psychic-scream', 42, 8);
    },
  });

  // Invulnerability: a white-gold ward locks into facets; incoming red chips shatter off its untouched rim.
  FX.register('invulnerability', {
    palette: GOLD,
    travel: 270,
    beats: (e, kit, t) => beats(e, kit, t, 100),
    end: () => 1350,
    ground(s) {
      halo(s, GOLD);
    },
    air(s) {
      if (!active(s, 750)) return;
      for (const t of subjects(s)) {
        const T = k.P(t),
          e = age(s);
        if (e < 550) {
          ring(T, 18, 23, GOLD, e < 50 ? 5 : 3);
          icon('shield', { x: T.x, y: T.y - 10 }, GOLD);
        }
        const real = s.real(s.hits[0]);
        if (real >= 0 && real < 360) {
          const Q = { x: T.x + 19, y: T.y - 5 };
          k.drawHit(k.hitStyle('b38:deflect', GOLD, { S: 22, spikes: 4 }), Q, real);
          k.shards(Q, real, ROCK, seed(s), 6, 20);
        }
      }
    },
    linger(s) {
      for (const t of subjects(s)) ring(foot(t), 16, 8, GOLD, s.linger > 0.5 ? 3 : 2, true);
    },
  });

  function meteorSites(s) {
    const { C, R } = zone(s, 40);
    return [0, 1, 2, 3].map(i => {
      const a = (i / 4) * k.tau + 0.5;
      return { x: C.x + Math.cos(a) * R * 0.43, y: C.y + Math.sin(a) * R * 0.43, r: R * 0.55 };
    });
  }
  function blast(C, R, frame) {
    R = Math.max(10, Math.round(R));
    const S = R * 2 + 10;
    const p = frame < 5 ? FIRE : ROCK;
    const img = k.sprite(`b38:meteor-blast:${R}:${frame}`, S, S, p, set => {
      const r = R * (frame < 3 ? 0.3 + frame * 0.3 : 1 - (frame - 3) * 0.04);
      const smoke = frame >= 5;
      const lobes = Array.from({ length: 7 }, (_, i) => {
        const a = (i / 7) * k.tau + 0.35;
        return { x: Math.cos(a) * r * 0.58, y: Math.sin(a) * r * 0.58, r: r * (0.35 + (i % 3) * 0.035) };
      });
      for (let y = 2; y < S - 2; y++)
        for (let x = 2; x < S - 2; x++) {
          const dx = x - S / 2,
            dy = y - S / 2;
          const radial = Math.hypot(dx, dy) / r;
          if (frame < 2) {
            const spike = Math.abs(Math.cos(Math.atan2(dy, dx) * 4)) ** 12;
            if (radial < 0.3 + spike * 0.65) set(x, y, frame === 0 ? 5 : radial < 0.25 ? 1 : 4);
            continue;
          }
          let d = frame < 8 ? radial / 0.7 : Infinity;
          let lit = 0;
          for (let i = 0; i < lobes.length; i++) {
            const b = lobes[i];
            const shrink = frame < 8 ? 1 : 1 - (frame - 7) * 0.22;
            const dist = Math.hypot(dx - b.x, dy - b.y + (smoke ? (frame - 4) * 1.5 : 0)) / (b.r * shrink);
            if (dist < d) {
              d = dist;
              lit = dy - b.y;
            }
          }
          if (d > 1) continue;
          set(
            x,
            y,
            smoke ? (d > 0.8 ? 1 : lit < -r * 0.12 ? 3 : 2) : radial < 0.36 ? 5 : d < 0.55 ? 4 : d < 0.8 ? 3 : 2,
          );
        }
    });
    k.blit(img, C.x - S / 2, C.y - S / 2);
  }

  // Meteor Swarm: four incandescent boulders plunge diagonally; white impacts become fire, stone and craters.
  FX.register('meteor-swarm', {
    palette: FIRE,
    travel: 510,
    beats(e, kit, t) {
      const ids = e.targets?.length ? e.targets : [null];
      return [0, 1, 2, 3].flatMap(i =>
        (i === 0 ? ids : [null]).map(target => ({
          at: kit.CAST + t + i * 115,
          stop: 80,
          target,
          kind: 'blast',
          power: 0.1,
        })),
      );
    },
    end: () => 1920,
    flash,
    reach: (e, grid) => ({ r: (e.area?.feet || 40) / (grid.feet || 5) + 3, up: 7 }),
    ground(s) {
      meteorSites(s).forEach((C, i) => {
        const e = s.c.t - (k.CAST + 510 + i * 115);
        if (e < 0) return;
        if (e < 680) blast(C, C.r, Math.min(9, Math.floor(e / 68)));
        if (e > 400 && e < 1100) {
          ring(C, C.r * 0.75, C.r * 0.6, ROCK, 1, e > 850);
          if (e < 800) ring(C, C.r * 0.6, C.r * 0.47, FIRE, 2, true);
        }
      });
    },
    air(s) {
      const sites = meteorSites(s);
      sites.forEach((C, i) => {
        const at = k.CAST + 510 + i * 115,
          launch = at - 430;
        if (s.c.t >= Math.max(k.CAST, launch) && s.c.t < at) {
          const q = (s.c.t - launch) / 430;
          const Q = { x: C.x - (1 - q) * 52, y: C.y - (1 - q) * 98 };
          for (let j = 7; j >= 1; j--) pixel(Q.x - j * 2, Q.y - j * 4, FIRE, j < 3 ? 4 : 2, Math.max(2, 8 - j));
          k.disc(Q.x, Q.y, 9, FIRE[0]);
          k.disc(Q.x, Q.y, 8, FIRE[3]);
          k.disc(Q.x + 1, Q.y + 1, 5, ROCK[0]);
          k.disc(Q.x + 1, Q.y + 1, 4, ROCK[2]);
          pixel(Q.x - 2, Q.y - 3, FIRE, 5, 2);
        }
        const hit = s.hits.find(h => h.at === at),
          real = s.real(hit);
        k.drawHit(k.hitStyle('b38:meteor', FIRE, { S: 55, spikes: 8, minor: 4 }), C, real);
        k.shards(C, real, ROCK, seed(s) + i * 31, 9, C.r * 0.8);
        k.shards(C, real - 50, FIRE, seed(s) + i * 37, 5, C.r);
      });
    },
  });

  function wall(s, lingering = false) {
    const a = s.area || { ...subject(s), feet: 90, height: 30, dir: 0 };
    const corners = k.outline(a, s.grid);
    const A = k.P(a);
    const B =
      corners.length >= 4
        ? k.P({ x: (corners[1][0] + corners[2][0]) / 2, y: (corners[1][1] + corners[2][1]) / 2 })
        : k.P({
            x: a.x + (Math.cos(a.dir || 0) * a.feet) / (s.grid.feet || 5),
            y: a.y + (Math.sin(a.dir || 0) * a.feet) / (s.grid.feet || 5),
          });
    const dx = Math.round(B.x - A.x),
      dy = Math.round(B.y - A.y);
    const H = Math.max(14, Math.round(((a.height || 30) / (s.grid.feet || 5)) * k.PX));
    const lean = Math.abs(dx) < 4 ? Math.round(H * 0.3) : 0;
    const x0 = Math.min(0, dx, -lean, dx - lean) - 3,
      y0 = Math.min(0, dy) - H - 3;
    const W = Math.abs(dx) + lean + 7,
      h = Math.abs(dy) + H + 7;
    const bands = lingering ? 7 : Math.min(7, 1 + Math.floor((s.c.t - k.CAST) / 48));
    const broken = lingering && s.linger < 0.5;
    const img = k.sprite(`b38:wall:${dx}:${dy}:${H}:${bands}:${broken}`, W, h, RAINBOW, set => {
      const det = dx * -H + dy * lean;
      for (let y = 1; y < h - 1; y++)
        for (let x = 1; x < W - 1; x++) {
          const X = x + x0,
            Y = y + y0;
          const u = (X * -H + Y * lean) / det,
            v = (dx * Y - dy * X) / det;
          if (u < 0 || u > 1 || v < 0 || v > 1 || (broken && Math.floor(u * 30) % 3 === 0)) continue;
          const band = Math.min(6, Math.floor((1 - v) * 7));
          if (band < bands) set(x, y, band + 1);
        }
    });
    k.blit(img, A.x + x0, A.y + y0);
    return { A, B, H, lean };
  }

  // Prismatic Wall: seven ordered rainbow layers snap into a tall, opaque planar barrier on the template.
  FX.register('prismatic-wall', {
    palette: PLANAR,
    travel: 340,
    beats: (e, kit, t) => beats(e, kit, t, 100),
    end: () => 1480,
    reach: (e, grid) => ({
      r: (e.area?.feet || 90) / (grid.feet || 5) + 2,
      up: (e.area?.height || 30) / (grid.feet || 5) + 1,
    }),
    ground(s) {
      if (active(s, 800)) wall(s);
    },
    air(s) {
      if (!active(s, 730)) return;
      // Only tiny rim glints sit above the figures; the solid curtain is below them.
      const a = s.area || subject(s),
        C = k.P(a),
        real = s.real(s.hits[0]);
      k.drawHit(k.hitStyle('b38:prismatic-seal', PLANAR, { S: 28, spikes: 7 }), C, real);
      k.shards(C, real, PLANAR, seed(s), 7, 26);
    },
    linger(s) {
      wall(s, true);
    },
  });

  // Power Word Kill: one crimson-black word appears at the victim; a death seal snaps inward without a missile.
  FX.register('power-word-kill', {
    palette: DEATH,
    travel: 160,
    beats: (e, kit, t) => beats(e, kit, t, 220, 'hit', 0.09),
    end: () => 1120,
    flash,
    ground(s) {
      if (!active(s, 550)) return;
      const e = age(s),
        F = foot(subject(s));
      if (e < 320)
        ring(F, 8 + 17 * (1 - k.clamp((e + 160) / 480)), 5 + 9 * (1 - k.clamp((e + 160) / 480)), DEATH, e < 0 ? 3 : 1);
    },
    air(s) {
      if (!active(s, 550)) return;
      const T = k.P(subject(s)),
        e = age(s),
        real = s.real(s.hits[0]);
      if (e < 0) icon('word', { x: T.x, y: T.y - 8 }, DEATH);
      else if (e < 300) icon('skull', { x: T.x, y: T.y - 4 }, DEATH);
      if (real >= 0 && real < 130) {
        stroke({ x: T.x - 15, y: T.y - 15 }, { x: T.x + 15, y: T.y + 15 }, DEATH, real < 40 ? 5 : 2, 2, 18);
        stroke({ x: T.x + 15, y: T.y - 15 }, { x: T.x - 15, y: T.y + 15 }, DEATH, real < 40 ? 5 : 2, 2, 18);
      }
      impacts(s, DEATH, 'power-word-kill', 42, 9);
    },
  });

  // Power Word Heal: an emerald-gold spoken rune restores a broken halo, releasing clean upward life sparks.
  FX.register('power-word-heal', {
    palette: LIFE,
    travel: 210,
    beats: (e, kit, t) => beats(e, kit, t, 95),
    end: () => 1320,
    ground(s) {
      halo(s, LIFE);
    },
    air(s) {
      if (!active(s, 750)) return;
      const e = age(s);
      for (const t of subjects(s)) {
        const T = k.P(t),
          real = s.real(s.hits[0]);
        if (e < 400) icon('word', { x: T.x, y: T.y - 9 - Math.max(0, e) / 70 }, LIFE);
        if (e >= 0 && e < 560) ring(T, 18, 22, LIFE, e < 80 ? 5 : 3, e > 400);
        if (real >= 0 && real < 640)
          for (let i = 0; i < 9; i++) {
            const q = real / 640,
              x = T.x + (k.hash(i, seed(s)) - 0.5) * 30;
            pixel(x, T.y + 16 - q * (30 + k.hash(i, seed(s), 1) * 15), LIFE, i % 2 ? 4 : 3, 2);
          }
      }
      impacts(s, LIFE, 'power-word-heal', 30, 5);
    },
  });

  function transmuteGround(s, mass) {
    if (!active(s, 850)) return;
    for (const t of subjects(s)) {
      const F = foot(t),
        q = k.clamp((s.c.t - k.CAST) / 400);
      ring(F, 12 + q * 7, 6 + q * 4, CHANGE, 3, age(s) > 450, s.c.t / 90);
      if (!mass) ring(F, 11, 5, GOLD, 4, true, -s.c.t / 80);
    }
  }
  function transmuteAir(s, mass) {
    if (!active(s, 850)) return;
    const e = age(s);
    subjects(s).forEach((t, i) => {
      const T = k.P(t);
      if (e < 180) {
        ring(T, 12 + Math.round(Math.sin(s.c.t / 60) * 2), 22, CHANGE, 3, false);
        for (let j = 0; j < 4; j++) {
          const a = s.c.t / 75 + (j / 4) * k.tau;
          pixel(T.x + Math.cos(a) * 13, T.y + Math.sin(a) * 21, CHANGE, j % 2 ? 4 : 3, 2);
        }
      } else if (e < 610) {
        const name = mass ? ['butterfly', 'frog', 'dragon'][i % 3] : 'dragon';
        icon(name, { x: T.x, y: T.y - 6 - Math.round(Math.sin(e / 90) * 2) }, CHANGE);
        if (e > 420) ring(foot(t), 15, 7, GOLD, 3, true);
      }
    });
    impacts(s, CHANGE, mass ? 'mass-polymorph' : 'true-polymorph', 34, 6);
  }

  // True Polymorph: gold and violet coils seal a cocoon, which cracks into a clear winged dragon silhouette.
  FX.register('true-polymorph', {
    palette: CHANGE,
    travel: 390,
    beats: (e, kit, t) => beats(e, kit, t, 120),
    end: () => 1530,
    ground(s) {
      transmuteGround(s, false);
    },
    air(s) {
      transmuteAir(s, false);
    },
  });

  // Mass Polymorph: synchronized violet cocoons burst into a menagerie of butterflies, frogs and tiny dragons.
  FX.register('mass-polymorph', {
    palette: CHANGE,
    travel: 390,
    beats: (e, kit, t) => beats(e, kit, t, 120),
    end: () => 1530,
    ground(s) {
      transmuteGround(s, true);
    },
    air(s) {
      transmuteAir(s, true);
    },
  });

  function portal(C, open, tick) {
    const rx = Math.max(2, Math.round(19 * open)),
      ry = 28;
    const img = k.sprite(`b38:gate:${rx}:${tick % 4}`, rx * 2 + 8, 64, PLANAR, set => {
      for (let y = -ry; y <= ry; y++)
        for (let x = -rx; x <= rx; x++) {
          const d = Math.hypot(x / rx, y / ry);
          if (d > 1) continue;
          const star = (x * 13 + y * 31 + 1000) % 79 === 0;
          set(x + rx + 4, y + 32, d > 0.91 ? 4 : d > 0.79 ? 3 : star ? 5 : 1);
        }
    });
    k.blit(img, C.x - rx - 4, C.y - 32);
  }

  // Gate: a vertical gold-edged seam opens onto a star-filled blue plane, with rotating threshold runes.
  FX.register('gate', {
    palette: PLANAR,
    travel: 380,
    beats: (e, kit, t) => beats(e, kit, t, 110),
    end: () => 1570,
    ground(s) {
      if (!active(s, 850)) return;
      ring(foot(subject(s)), 22, 9, GOLD, 3, true, s.c.t / 100);
    },
    air(s) {
      if (!active(s, 850)) return;
      const T = k.P(s.event.teleport?.to || s.pose.target || subject(s));
      const e = age(s),
        open = e < 0 ? k.ease(k.clamp((s.c.t - k.CAST) / 380)) : e > 580 ? 1 - k.clamp((e - 580) / 240) : 1;
      portal(T, open, Math.floor(s.c.raw / 130));
      if (open > 0.8)
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * k.tau + s.c.t / 700;
          pixel(T.x + Math.cos(a) * 22, T.y + Math.sin(a) * 30, GOLD, i % 2 ? 4 : 3, 2);
        }
      const real = s.real(s.hits[0]);
      k.drawHit(k.hitStyle('b38:gate-open', PLANAR, { S: 36, spikes: 4, minor: 4 }), T, real);
      k.shards(T, real, GOLD, seed(s), 8, 27);
    },
    linger(s) {
      const T = k.P(s.event.teleport?.to || s.pose.target || subject(s));
      portal(T, s.linger, Math.floor(s.c.raw / 160));
    },
  });

  // Foresight: a golden third eye opens above the subject while three future echoes converge into one path.
  FX.register('foresight', {
    palette: GOLD,
    travel: 310,
    beats: (e, kit, t) => beats(e, kit, t, 85),
    end: () => 1460,
    ground(s) {
      halo(s, GOLD);
    },
    air(s) {
      if (!active(s, 800)) return;
      const e = age(s);
      for (const t of subjects(s)) {
        const T = k.P(t),
          merge = 1 - k.ease(k.clamp((e + 310) / 650));
        if (e < 360)
          for (let i = -1; i <= 1; i++)
            icon('eye', { x: T.x + i * 17 * merge, y: T.y - 12 - Math.abs(i) * merge * 4 }, GOLD);
        if (e >= 360 && e < 690) icon('eye', { x: T.x, y: T.y - 14 }, GOLD);
        const real = s.real(s.hits[0]);
        if (real >= 0 && real < 400) ring(T, 18 + Math.round(real / 45), 9 + Math.round(real / 90), GOLD, 4, true);
      }
      impacts(s, GOLD, 'foresight', 26, 5);
    },
    linger(s) {
      for (const t of subjects(s)) ring(foot(t), 15, 7, GOLD, 3, true, s.c.raw / 220);
    },
  });

  // Astral Projection: silver-blue souls lift from resting bodies, each anchored by an unbroken silver cord.
  FX.register('astral-projection', {
    palette: SILVER,
    travel: 400,
    beats: (e, kit, t) => beats(e, kit, t, 100),
    end: () => 1600,
    ground(s) {
      halo(s, SILVER);
    },
    air(s) {
      if (!active(s, 850)) return;
      const e = age(s),
        q = k.ease(k.clamp((s.c.t - k.CAST) / 950));
      subjects(s).forEach((t, i) => {
        const T = k.P(t),
          F = foot(t);
        const soul = { x: T.x + Math.sin(s.c.t / 250 + i) * 5 * q, y: T.y - 18 * q };
        if (e < 760) {
          const mid = { x: (F.x + soul.x) / 2 + 5, y: (F.y + soul.y) / 2 };
          stroke(F, mid, SILVER, 4, 1, 9);
          stroke(mid, { x: soul.x, y: soul.y + 11 }, SILVER, 5, 1, 9);
          icon('spirit', soul, SILVER);
          if (e > 200) ring({ x: soul.x, y: soul.y - 2 }, 13, 19, PLANAR, 2, true, i);
        }
      });
      impacts(s, SILVER, 'astral-projection', 30, 6);
    },
    linger(s) {
      for (const t of subjects(s)) ring(foot(t), 15, 7, SILVER, s.linger > 0.5 ? 3 : 2, true);
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
