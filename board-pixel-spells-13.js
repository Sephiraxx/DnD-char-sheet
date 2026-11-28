/* Pixel spells, batch 13: enchanted sentries, wild terrain, spirits and second-level workings. */
(function (root) {
  'use strict';
  const FX = root.BoardPixelFX;
  if (!FX) return;
  const k = FX.kit;
  const IRON = ['#161820', '#414452', '#788799', '#b8ced9', '#ecf8ff', '#ffffff'];
  const MIND = ['#260e29', '#632153', '#a83f89', '#eb79c3', '#ffd3ec', '#ffffff'];
  const BRIAR = ['#192010', '#45502a', '#738144', '#a7b86b', '#e0e6b4', '#ffffff'];
  const SAND = ['#2a211c', '#66503b', '#9e8059', '#cdb585', '#f0dfba', '#ffffff'];
  const SPIRIT = ['#102336', '#305573', '#638eae', '#a1d6e5', '#e3ffff', '#ffffff'];
  const ARCANE = ['#1b1230', '#49316f', '#8160b3', '#baa0e8', '#eee2ff', '#ffffff'];
  const FROST = ['#101f35', '#28517c', '#4c8ec3', '#9ad5eb', '#e3f8ff', '#ffffff'];
  const CLOUD = ['#252c40', '#53627c', '#8a9db6', '#c1d6e2', '#edf8ff', '#ffffff'];
  const FIRE = ['#2a100f', '#751f13', '#c3431b', '#ef7c25', '#ffd267', '#ffffff'];
  const HEAL = ['#10291f', '#2b6851', '#53a782', '#9fe4ae', '#e4ffd5', '#ffffff'];
  const GOLD = ['#2b2032', '#79532f', '#bf913e', '#f1ce76', '#fff0c0', '#ffffff'];
  const ACID = ['#172008', '#405c16', '#79a62c', '#bde951', '#eeffb5', '#ffffff'];

  function pixel(x, y, ramp, index = 3, size = 1) {
    k.dot(x, y, ramp[0], size + 2);
    k.dot(x, y, ramp[index], size);
  }
  function stroke(a, b, ramp, index = 3, size = 1) {
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / Math.max(1, size)));
    for (const [color, width] of [
      [ramp[0], size + 2],
      [ramp[index], size],
    ]) {
      for (let i = 0; i <= n; i++) k.dot(k.mix(a.x, b.x, i / n), k.mix(a.y, b.y, i / n), color, width);
    }
  }
  // Cached rings keep even the twenty-foot terrain footprint cheap.
  function ring(C, rx, ry, ramp, index = 3, broken = false, phase = 0) {
    rx = Math.max(1, Math.round(rx));
    ry = Math.max(1, Math.round(ry));
    const f = Math.floor(phase) % 12;
    const img = k.sprite(
      `13:ring:${ramp[0]}:${rx}:${ry}:${index}:${broken}:${f}`,
      rx * 2 + 7,
      ry * 2 + 7,
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
  function icon(key, rows, ramp) {
    return k.sprite(`13:${key}`, Math.max(...rows.map(r => r.length)) + 2, rows.length + 2, ramp, set => {
      rows.forEach((row, y) =>
        [...row].forEach((ch, x) => {
          if (ch !== '.') set(x + 1, y + 1, +ch);
        }),
      );
    });
  }
  function stamp(key, rows, ramp, C) {
    const img = icon(key, rows, ramp);
    k.blit(img, C.x - img.width / 2, C.y - img.height / 2);
  }
  function subject(s, hit = s.hits[0], self = false) {
    return (
      s.targets.find(t => t.id === hit?.id) ||
      s.targets[0] ||
      (self ? s.pose.base : s.pose.target) ||
      s.pose.base ||
      s.pose.hand || { x: 0, y: 0 }
    );
  }
  function feet(t) {
    return k.P({ x: t.baseX ?? t.x, y: t.baseY ?? t.y });
  }
  function center(s) {
    if (s.area?.kind === 'cube') {
      const corners = k.outline(s.area, s.grid);
      if (corners.length) {
        const points = corners.map(p => (Array.isArray(p) ? { x: p[0], y: p[1] } : p));
        return k.P({
          x: points.reduce((v, p) => v + p.x, 0) / points.length,
          y: points.reduce((v, p) => v + p.y, 0) / points.length,
        });
      }
      const r = (s.area.feet || 5) / (s.grid.feet || 5) / 2;
      return k.P({ x: s.area.x + Math.cos(s.area.dir || 0) * r, y: s.area.y + Math.sin(s.area.dir || 0) * r });
    }
    return k.P(s.area || s.pose.target || subject(s));
  }
  function radius(s, fallback) {
    return ((s.area?.feet ?? fallback) / (s.grid.feet || 5)) * k.PX;
  }
  function beats(event, kit, travel, kind = 'soft', stop = 65, offset = 0) {
    return (event.targets?.length ? event.targets : [null]).map(target => ({
      at: kit.CAST + travel + offset,
      stop,
      target,
      kind,
      power: kind === 'soft' ? 0 : 0.065,
    }));
  }
  function impact(s, hit, C, ramp, size = 28, count = 6, salt = 0) {
    const real = s.real(hit);
    k.drawHit(k.hitStyle(`13:${s.event.id}:${salt}`, ramp, { S: size, spikes: 5, jag: 0.28 }), C, real);
    k.shards(C, real, ramp, (s.event.seed || 0) + salt * 17, count, size * 0.6);
  }
  function spark(C, ramp, size = 2) {
    stroke({ x: C.x - size, y: C.y }, { x: C.x + size, y: C.y }, ramp, 4);
    stroke({ x: C.x, y: C.y - size }, { x: C.x, y: C.y + size }, ramp, 5);
  }
  function mote(s, T, ramp, bow = 7) {
    const hit = s.hits[0],
      H = s.pose.hand && k.P(s.pose.hand);
    if (!H || s.c.t < k.CAST || s.c.t >= hit.at) return;
    const q = (s.c.t - k.CAST) / Math.max(1, hit.at - k.CAST);
    for (let i = 4; i >= 0; i--) {
      const u = q - i * 0.05;
      if (u < 0) continue;
      pixel(k.mix(H.x, T.x, u), k.mix(H.y, T.y, u) - Math.sin(u * Math.PI) * bow, ramp, i ? 3 : 5, i ? 1 : 3);
    }
  }
  const ARROW = ['..3...........', '.43........4..', '2444444444445.', '.43........4..', '..3...........'];
  const EYE = [
    '....33333....',
    '..334444433..',
    '.34442224443.',
    '3444235324443',
    '.34442224443.',
    '..334444433..',
    '....33333....',
  ];
  const OWL = ['3.......3', '333...333', '.3454543.', '..34443..', '.3333333.', '33.333.33', '...3.3...'];
  const BAT = [
    '3...........3',
    '33.........33',
    '3433..3..3343',
    '3443333333443',
    '.33345453333.',
    '..3.33333.3..',
    '.....3.3.....',
  ];
  const CAT = [
    '.3.....3..',
    '.33...33..',
    '.3454533..',
    '..34443...',
    '..33333..3',
    '.3333333.3',
    '.333333333',
    '..3...3...',
  ];
  const FOX = [
    '..3.....3.......',
    '..33...33.......',
    '...34543........',
    '...34443....33..',
    '....33333333343.',
    '...33343333343..',
    '..33.33333333...',
    '.....3....3.....',
  ];

  // Cordon of Arrows: four silver arrows plant point-down, then stand sentry with blinking enchanted fletching.
  FX.register('cordon-of-arrows', {
    palette: IRON,
    travel: 340,
    beats: (event, kit, travel) => beats(event, kit, travel, 'soft', 70),
    end: (event, travel) => k.CAST + travel + 800,
    ground(s) {
      const e = s.c.t - k.CAST,
        C = center(s);
      if (e < 0 || e > 1140) return;
      ring(C, 19, 10, ARCANE, e < 340 ? 4 : 2, true, e / 120);
      for (let i = 0; i < 4; i++) {
        const a = (i * k.tau) / 4 + 0.7;
        ring({ x: C.x + Math.cos(a) * 15, y: C.y + Math.sin(a) * 8 }, 3, 2, ARCANE, 3);
      }
    },
    air(s) {
      if (s.c.t < k.CAST) return;
      const C = center(s),
        H = k.P(s.pose.hand || s.pose.base || subject(s));
      const e = s.c.t - k.CAST;
      if (e > 1140) return;
      for (let i = 0; i < 4; i++) {
        const a = (i * k.tau) / 4 + 0.7,
          B = { x: C.x + Math.cos(a) * 15, y: C.y + Math.sin(a) * 8 };
        const q = k.clamp((e - i * 42) / (340 - i * 42));
        if (e < i * 42) continue;
        const P = { x: k.mix(H.x, B.x, q), y: k.mix(H.y, B.y - 7, q) - Math.sin(q * Math.PI) * 15 };
        k.blitRotated(icon('sentry-arrow', ARROW, IRON), P.x, P.y, Math.PI / 2);
        if (q === 1 && e < 1020) pixel(B.x, B.y - 13, ARCANE, Math.floor(e / 110 + i) % 4 === 0 ? 5 : 3, 2);
      }
      impact(s, s.hits[0], C, ARCANE, 22, 4);
    },
    linger(s) {
      if (s.linger <= 0 || s.c.t < s.hits[0].at + 800) return;
      const C = center(s);
      for (let i = 0; i < 4; i++) {
        const a = (i * k.tau) / 4 + 0.7;
        k.blitRotated(
          icon('sentry-arrow', ARROW, IRON),
          C.x + Math.cos(a) * 15,
          C.y + Math.sin(a) * 8 - 7,
          Math.PI / 2,
        );
      }
    },
  });

  function briars(s, growth = 1, life = 1) {
    const C = center(s),
      R = Math.max(2, Math.round(radius(s, 20))),
      seed = s.event.seed || 0;
    const f = Math.min(5, Math.floor(k.clamp(growth) * 5)),
      S = R * 2 + 19;
    const img = k.sprite(`13:briars:${R}:${f}:${seed}`, S, S, BRIAR, set => {
      const c = R + 9,
        reach = R * (0.12 + f * 0.176);
      for (let y = -R; y <= R; y++) {
        for (let x = -R; x <= R; x++) {
          const d = Math.hypot(x, y);
          if (d > reach) continue;
          const a = Math.atan2(y, x);
          // Visible branching roots, with open map between them.
          if (Math.abs(Math.sin(a * 9 + d / 12)) < 0.13 && d > 3) set(c + x, c + y, d % 13 < 2 ? 3 : 1);
        }
      }
      for (let y = -R + 5; y < R; y += 10) {
        for (let x = -R + 5; x < R; x += 11) {
          const xx = x + Math.floor(k.hash(x, y, seed) * 5) - 2;
          const yy = y + Math.floor(k.hash(y, x, seed) * 4) - 2;
          if (Math.hypot(xx, yy) > reach - 4) continue;
          const h = 4 + Math.floor(k.hash(xx, yy, seed) * 4);
          for (let v = 0; v < h; v++) {
            const w = Math.max(0, Math.floor((h - v) / 3));
            for (let u = -w; u <= w; u++)
              set(c + xx + u + Math.floor(v / 3), c + yy - v, u < 0 ? 2 : v > h - 3 ? 4 : 3);
          }
          set(c + xx - 3, c + yy - 2, 3);
          set(c + xx - 4, c + yy - 3, 4);
        }
      }
    });
    k.blit(img, C.x - R - 9, C.y - R - 9, life);
  }
  // Spike Growth: camouflaged olive brambles race over the full twenty-foot circle and harden into ivory piercing spikes.
  FX.register('spike-growth', {
    palette: BRIAR,
    travel: 220,
    beats: (event, kit, travel) => beats(event, kit, travel, 'soft', 70),
    end: (event, travel) => k.CAST + travel + 900,
    ground(s) {
      const e = s.c.t - s.hits[0].at;
      if (e < 0 || e > 900) return;
      briars(s, k.ease(k.clamp(e / 390)));
      if (e < 420)
        ring(
          center(s),
          radius(s, 20) * k.ease(k.clamp(e / 360)),
          radius(s, 20) * k.ease(k.clamp(e / 360)),
          BRIAR,
          3,
          true,
        );
    },
    air(s) {
      const hit = s.hits[0],
        C = center(s),
        real = s.real(hit);
      if (real < 0) return;
      // Establishing terrain is harmless; sharp chips illustrate its piercing texture.
      impact(s, hit, C, BRIAR, 24, 6);
      if (real < 440) {
        for (let i = 0; i < 9; i++) {
          const a = k.hash(i, s.event.seed || 0) * k.tau;
          const r = radius(s, 20) * k.ease(k.clamp(real / 440)) * 0.85;
          pixel(
            C.x + Math.cos(a) * r,
            C.y + Math.sin(a) * r - Math.sin((real / 440) * Math.PI) * 6,
            BRIAR,
            i % 2 ? 4 : 2,
          );
        }
      }
    },
    linger(s) {
      if (s.c.t >= s.hits[0].at + 900) briars(s, 1, s.linger);
    },
  });

  function funnel(s, e, life = 1) {
    const C = center(s),
      half = Math.max(4, radius(s, 5) / 2),
      W = Math.round(half * 2 + 15),
      H = Math.round(half * 2 + 29);
    const f = Math.floor(Math.max(0, e) / 65) % 8;
    const img = k.sprite(`13:funnel:${W}:${H}:${f}`, W, H, SAND, set => {
      const cx = W / 2,
        bottom = H - half - 4;
      for (let y = 3; y <= bottom; y++) {
        const q = (bottom - y) / (bottom - 3),
          r = 2 + half * q;
        const cx2 = cx + Math.sin(q * 5 + (f * k.tau) / 8) * q * 2;
        for (let x = Math.ceil(cx2 - r); x <= cx2 + r; x++) {
          const band = (Math.floor(y / 3) + f + Math.floor((x - cx2) / 5)) % 4;
          if (q > 0.88 && Math.abs(x - cx2) < r * 0.65) continue;
          set(x, y, Math.abs(x - cx2) > r - 2 ? 2 : band === 0 ? 4 : band === 1 ? 3 : 1);
        }
      }
    });
    k.blit(img, C.x - W / 2, C.y - H + half + 4, life);
  }
  // Dust Devil: a compact ochre funnel spins within the cube, lifting grit in corkscrews before collapsing into sand.
  FX.register('dust-devil', {
    palette: SAND,
    travel: 260,
    beats: (event, kit, travel) => beats(event, kit, travel, 'blast', 105),
    end: (event, travel) => k.CAST + travel + 950,
    ground(s) {
      const e = s.c.t - s.hits[0].at,
        C = center(s),
        R = Math.max(5, radius(s, 5) / 2);
      if (e < 0 || e > 950) return;
      if (e < 760) funnel(s, e);
      ring(C, R * (e < 760 ? 1 : 1 + (e - 760) / 200), R * 0.55, SAND, 2, true, e / 65);
    },
    air(s) {
      const e = s.c.t - s.hits[0].at,
        C = center(s),
        R = Math.max(5, radius(s, 5) / 2),
        seed = s.event.seed || 0;
      if (e < 0 || e > 950) return;
      for (let i = 0; i < 10; i++) {
        const q = (s.c.raw / 560 + k.hash(i, seed)) % 1,
          a = q * k.tau * 2 + i;
        const spread = e > 760 ? (e - 760) / 20 : 0;
        pixel(
          C.x + Math.cos(a) * (3 + q * R + spread),
          C.y - q * (R * 2 + 18) + Math.sin(a) * 3 + spread,
          SAND,
          i % 3 ? 3 : 2,
          i % 4 ? 1 : 2,
        );
      }
      s.hits.forEach((hit, i) => impact(s, hit, k.P(subject(s, hit)), SAND, 28, 5, i));
    },
    linger(s) {
      if (s.c.t >= s.hits[0].at + 950) funnel(s, s.c.raw, s.linger);
    },
  });

  const HORSE = [
    '.....................3...3...',
    '....................333.33...',
    '...................3343333...',
    '..................334454433..',
    '.................33444444433.',
    '................333444444443',
    '....333333333333333444433333.',
    '...33444444444444444443.....',
    '..334444444444444444433.....',
    '.333444444444444444433......',
    '3343344444444444444333......',
    '33.3344444444444443333......',
    '3..333444444444443333.......',
    '...33333333333333333........',
    '...33.33.......33.33........',
    '...33..33......33..33.......',
    '..33...33......33...33......',
    '..33....33....33....33......',
    '..44....44....44....44......',
  ];
  // Find Steed: silver hoofprints gallop out of a celestial summoning seal and resolve into a pale spectral warhorse.
  FX.register('find-steed', {
    palette: SPIRIT,
    travel: 360,
    beats: (event, kit, travel) => beats(event, kit, travel, 'soft', 100),
    end: (event, travel) => k.CAST + travel + 930,
    ground(s) {
      const e = s.c.t - k.CAST,
        C = feet(subject(s));
      if (e < 0 || e > 1290) return;
      ring(C, e < 360 ? 22 : 22 - k.clamp((e - 700) / 590) * 8, 9, SPIRIT, 3, e > 850, e / 140);
      if (e < 720)
        for (let i = 0; i < 6; i++) {
          const q = k.clamp((e - i * 65) / 240);
          if (!q || q === 1) continue;
          stamp('hoofprint', ['3.3', '3.3', '333'], SPIRIT, { x: C.x - 27 + i * 8, y: C.y + (i % 2 ? 3 : -3) });
        }
    },
    air(s) {
      const hit = s.hits[0],
        C = feet(subject(s)),
        e = s.c.t - hit.at;
      if (s.c.t < k.CAST || e > 930) return;
      if (e >= 0 && e < 800) {
        const q = k.ease(k.clamp(e / 280)),
          img = icon('spectral-steed', HORSE, SPIRIT);
        k.blit(img, C.x - img.width / 2 - (1 - q) * 12, C.y - img.height - Math.sin(q * Math.PI) * 5);
        if (e < 400)
          for (let i = 0; i < 3; i++) spark({ x: C.x - 12 + i * 10, y: C.y - 23 - ((e / 90 + i) % 3) }, SPIRIT, 1);
      }
      for (let i = 0; i < 5; i++) {
        const q = k.clamp((e + 360) / 1160),
          a = k.hash(i, s.event.seed || 0) * k.tau + q * 2;
        if (e < 240 || e > 760)
          pixel(C.x + Math.cos(a) * (8 + q * 14), C.y - 5 - q * 16 + Math.sin(a) * 4, SPIRIT, 3, 2);
      }
      impact(s, hit, { x: C.x, y: C.y - 9 }, SPIRIT, 30, 7);
    },
  });

  // Snilloc's Snowball Swarm: three tight volleys of blue-white snowballs burst in the five-foot circle with icy chips.
  FX.register('snillocs-snowball-swarm', {
    palette: FROST,
    travel: 330,
    beats(event, kit, travel) {
      return [0, 95, 190].flatMap(offset => beats(event, kit, travel, 'hit', 65, offset));
    },
    end: (event, travel) => k.CAST + travel + 700,
    ground(s) {
      const e = s.c.t - s.hits[0].at,
        C = center(s),
        R = Math.round(radius(s, 5));
      if (e < 0 || e > 700) return;
      const f = Math.min(3, Math.floor(e / 120));
      const img = k.sprite(`13:snow-drift:${R}:${f}`, R * 2 + 7, R * 2 + 7, FROST, set => {
        for (let y = -R; y <= R; y++)
          for (let x = -R; x <= R; x++) {
            const d = Math.hypot(x, y);
            if (d < R - 2 && (Math.sin(x / 3) + Math.cos(y / 4) > 0.5 || d < R * 0.35))
              set(x + R + 3, y + R + 3, f < 2 ? 4 : 2);
          }
      });
      k.blit(img, C.x - R - 3, C.y - R - 3);
    },
    air(s) {
      const C = center(s),
        H = k.P(s.pose.hand || s.pose.base || subject(s)),
        R = radius(s, 5),
        seed = s.event.seed || 0;
      for (let wave = 0; wave < 3; wave++) {
        const launch = k.CAST + wave * 95,
          arrive = k.CAST + 330 + wave * 95;
        if (s.c.t < launch || s.c.t >= arrive) continue;
        const q = (s.c.t - launch) / 330;
        for (let j = 0; j < 3; j++) {
          const a = (j / 3 + wave * 0.17) * k.tau;
          const T = { x: C.x + Math.cos(a) * R * 0.65, y: C.y + Math.sin(a) * R * 0.65 };
          const P = { x: k.mix(H.x, T.x, q), y: k.mix(H.y, T.y, q) - Math.sin(q * Math.PI) * (10 + j * 3) };
          pixel(P.x - (T.x - H.x) * 0.04, P.y - (T.y - H.y) * 0.04, FROST, 3, 2);
          k.disc(P.x, P.y, 4, FROST[0]);
          k.disc(P.x, P.y, 3, FROST[3]);
          k.disc(P.x - 1, P.y - 1, 1.5, FROST[5]);
        }
      }
      s.hits.forEach((hit, i) => impact(s, hit, k.P(subject(s, hit)), FROST, 26, 4, i));
      const real = s.real(s.hits[0]);
      if (real >= 0 && real < 620)
        for (let i = 0; i < 10; i++) {
          const q = (real / 620 + k.hash(i, seed)) % 1,
            a = k.hash(i, seed, 2) * k.tau;
          pixel(C.x + Math.cos(a) * R * 0.9, C.y + Math.sin(a) * R * 0.9 - 14 + q * 19, FROST, i % 2 ? 4 : 3);
        }
    },
    flash: (event, e) =>
      e < 28 ? { color: '#e3f8ff', alpha: 0.13 } : e < 55 ? { color: '#101f35', alpha: 0.08 } : null,
  });

  // Skywrite: a rising wind-quill writes HAIL in thick white cloud letters, then the lettering shears into cloudlets.
  FX.register('skywrite', {
    palette: CLOUD,
    travel: 420,
    beats: (event, kit, travel) => beats(event, kit, travel, 'soft', 60),
    end: (event, travel) => k.CAST + travel + 850,
    air(s) {
      const e = s.c.t - k.CAST,
        T = center(s),
        H = k.P(s.pose.hand || subject(s));
      if (e < 0 || e > 1270) return;
      const C = { x: T.x, y: T.y - 17 };
      const glyphs = ['3.3.333.333.3..', '3.3.3.3..3..3..', '333.333..3..3..', '3.3.3.3..3..3..', '3.3.3.3.333.333'];
      const visible = Math.min(15, Math.floor(e / 28) + 1),
        split = e > 1080 ? Math.floor((e - 1080) / 50) : 0;
      const img = k.sprite(`13:skyword:${visible}:${split}`, 51, 23, CLOUD, set => {
        glyphs.forEach((row, gy) =>
          [...row].forEach((ch, gx) => {
            if (ch === '.' || gx >= visible) return;
            for (let yy = 0; yy < 3; yy++)
              for (let xx = 0; xx < 3; xx++) {
                const x = gx * 3 + xx + 3 + (gy % 2 ? split : -split),
                  y = gy * 3 + yy + 4;
                if (split && (gx + gy) % 4 < split) continue;
                set(x, y, yy === 0 ? 5 : yy === 1 ? 4 : 3);
              }
          }),
        );
      });
      k.blit(img, C.x - 25, C.y - 17);
      if (e < 420) {
        const q = e / 420;
        for (let i = 0; i < 5; i++) {
          const u = k.clamp(q - i * 0.055);
          pixel(
            k.mix(H.x, C.x - 22 + visible * 3, u),
            k.mix(H.y, C.y - 8, u) - Math.sin(u * Math.PI) * 12,
            CLOUD,
            i ? 3 : 5,
            i ? 2 : 3,
          );
        }
      }
      impact(s, s.hits[0], { x: C.x + 20, y: C.y - 8 }, CLOUD, 18, 4);
    },
  });

  function fireSphere(s, e, life = 1) {
    const C = center(s),
      R = Math.max(2, Math.round(radius(s, 2.5))),
      f = Math.floor(Math.max(0, e) / 60) % 8;
    const S = R * 2 + 13;
    const img = k.sprite(`13:fire-sphere:${R}:${f}`, S, S + 5, FIRE, set => {
      const cx = R + 6,
        cy = R + 9;
      for (let y = -R - 5; y <= R; y++)
        for (let x = -R; x <= R; x++) {
          const d = Math.hypot(x, y),
            a = Math.atan2(y, x);
          const flame = y < -R * 0.3 && Math.abs(x) < R * 0.8 && y > -R - (Math.sin(x * 1.7 + f) + 1) * 2;
          if (d > R && !flame) continue;
          const spiral = Math.sin(a * 3 + d * 0.7 - (f * k.tau) / 8);
          set(cx + x, cy + y, d > R - 1.5 ? 2 : spiral > 0.5 ? 4 : spiral > -0.4 ? 3 : 1);
          if (d < R * 0.3) set(cx + x, cy + y, 5);
        }
    });
    k.blit(img, C.x - R - 6, C.y - R - 9, life);
  }
  // Flaming Sphere: a five-foot-wide orange fire globe snaps into being, churns with yellow spiral bands and spits embers.
  FX.register('flaming-sphere', {
    palette: FIRE,
    travel: 240,
    beats: (event, kit, travel) => beats(event, kit, travel, 'hit', 105),
    end: (event, travel) => k.CAST + travel + 830,
    ground(s) {
      const e = s.c.t - s.hits[0].at,
        C = center(s),
        R = radius(s, 2.5);
      if (e < 0 || e > 830) return;
      if (e < 700) fireSphere(s, e);
      ring(C, R + 3 + (e > 700 ? (e - 700) / 30 : 0), R * 0.55, FIRE, e < 100 ? 4 : 1, e > 550);
      if (e >= 700) for (let i = 0; i < 5; i++) pixel(C.x + (i - 2) * 3, C.y + Math.sin(i) * 2, FIRE, 2);
    },
    air(s) {
      const e = s.c.t - s.hits[0].at,
        C = center(s),
        R = radius(s, 2.5),
        seed = s.event.seed || 0;
      if (e < 0 || e > 830) return;
      s.hits.forEach((hit, i) => impact(s, hit, k.P(subject(s, hit)), FIRE, 28, 5, i));
      if (e < 740)
        for (let i = 0; i < 7; i++) {
          const q = (s.c.raw / 420 + k.hash(i, seed)) % 1;
          pixel(
            C.x + (k.hash(i, seed, 3) - 0.5) * R * 2 + Math.sin(q * 7 + i) * 2,
            C.y - q * (R + 15),
            FIRE,
            q > 0.75 ? 2 : 4,
            q < 0.4 ? 2 : 1,
          );
        }
    },
    linger(s) {
      if (s.c.t >= s.hits[0].at + 830) fireSphere(s, s.c.raw, s.linger);
    },
    flash: (event, e) =>
      e < 32 ? { color: '#ffd267', alpha: 0.17 } : e < 65 ? { color: '#2a100f', alpha: 0.1 } : null,
  });
})(typeof window !== 'undefined' ? window : globalThis);
