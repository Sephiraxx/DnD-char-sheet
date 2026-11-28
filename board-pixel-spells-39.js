/* Pixel spells, batch 39. See docs/pixel-spells/BRIEF.md. */
(function (root) {
  'use strict';
  const FX = root.BoardPixelFX;
  if (!FX) return;
  const k = FX.kit;
  const LIFE = ['#11291f', '#28654b', '#50b988', '#a5edb0', '#fff0bd', '#ffffff'];
  const GOLD = ['#291b21', '#76512c', '#c49143', '#f1cc75', '#fff0c8', '#ffffff'];
  const STORM = ['#10151f', '#272d3d', '#454d62', '#778599', '#c8d8df', '#ffffff'];
  const ACID = ['#19200e', '#486026', '#81a53c', '#cae861', '#f0ffc1', '#ffffff'];
  const BOLT = ['#14152e', '#35478e', '#689edb', '#b4e7ff', '#edfbff', '#ffffff'];
  const ICE = ['#132235', '#335a7b', '#689bb9', '#b4dcea', '#e9fcff', '#ffffff'];
  const VOID = ['#080810', '#13101e', '#302443', '#6a5192', '#b7a1dd', '#ffffff'];
  const ROCK = ['#17131d', '#3b323f', '#70616b', '#aa9392', '#e0c9b3', '#ffffff'];
  const seed = s => s.event.seed || 0;
  const ids = event => (event.targets?.length ? event.targets : [null]);
  const subject = (s, hit) =>
    s.targets.find(t => t.id === hit?.id) || s.targets[0] || s.pose.target || s.pose.base || s.pose.hand;
  const feet = t => k.P({ x: t.baseX ?? t.x, y: t.baseY ?? t.y + 0.5 });
  const centre = s => s.area || s.pose.target || subject(s, s.hits[0]);
  const radius = (s, fallback) => ((s.area?.feet || fallback) / (s.grid.feet || 5)) * k.PX;
  const pixel = (x, y, p, index = 3, size = 1) => {
    k.dot(x, y, p[0], size + 2);
    k.dot(x, y, p[index], size);
  };
  function beats(event, at, stop, kind, power) {
    return ids(event).map(target => ({ at, stop, target, kind, power }));
  }
  function stroke(A, B, p, index = 3, size = 1, samples = 16) {
    const n = Math.max(1, Math.min(samples, Math.ceil(Math.hypot(B.x - A.x, B.y - A.y))));
    const w = Math.max(size, Math.ceil(Math.hypot(B.x - A.x, B.y - A.y) / n));
    for (const [color, width] of [
      [p[0], w + 2],
      [p[index], w],
    ])
      for (let i = 0; i <= n; i++) k.dot(k.mix(A.x, B.x, i / n), k.mix(A.y, B.y, i / n), color, width);
  }
  // Large rings are rasterised once; their gaps break into clean pieces at the end.
  function ring(C, rx, ry, p, index = 3, broken = false, phase = 0) {
    rx = Math.max(2, Math.round(rx));
    ry = Math.max(2, Math.round(ry));
    phase = ((Math.floor(phase) % 8) + 8) % 8;
    const w = rx * 2 + 6,
      h = ry * 2 + 6;
    const img = k.sprite(`b39:ring:${p[0]}:${rx}:${ry}:${index}:${broken}:${phase}`, w, h, p, set => {
      for (let y = 2; y < h - 2; y++)
        for (let x = 2; x < w - 2; x++) {
          const dx = (x - rx - 3) / rx,
            dy = (y - ry - 3) / ry;
          if (Math.abs(Math.hypot(dx, dy) - 1) * Math.min(rx, ry) > 0.65) continue;
          if (broken && (Math.floor(((Math.atan2(dy, dx) + Math.PI) / k.tau) * 24) + phase) % 2) continue;
          set(x, y, index);
        }
    });
    k.blit(img, C.x - rx - 3, C.y - ry - 3);
  }
  function emblem(name, p, frame = 0) {
    return k.sprite(`b39:${name}:${p[0]}:${frame}`, 49, 63, p, set => {
      const put = (x, y, i) => set(x + 24, y + 31, i);
      if (name === 'soul') {
        for (let y = -17; y <= 14; y++)
          for (let x = -11; x <= 11; x++) {
            const head = x * x + (y + 11) ** 2 < 24;
            const body = y >= -4 && Math.abs(x) < 7 - Math.max(0, y - 4) * 0.34;
            if (head || body) put(x, y, Math.abs(x) < 2 ? 5 : y < 0 ? 4 : 3);
          }
      } else if (name === 'wings') {
        for (let side = -1; side <= 1; side += 2)
          for (let feather = 0; feather < 5; feather++)
            for (let j = 0; j < 16 - feather * 2; j++) {
              const x = side * (4 + j),
                y = -j + feather * 4 - 5;
              put(x, y, 4);
              put(x, y + 1, feather % 2 ? 3 : 5);
            }
      } else if (name === 'body') {
        for (let y = -25; y <= 0; y++)
          for (let x = -10; x <= 10; x++) {
            if (y < -frame * 4) continue;
            const head = x * x + (y + 21) ** 2 < 16;
            const torso = y >= -15 && y <= -7 && Math.abs(x) <= 5;
            const limbs = y > -7 && Math.abs(x) >= 2 && Math.abs(x) <= 4;
            const arms = y > -15 && y < -6 && Math.abs(x) >= 6 && Math.abs(x) <= 8;
            if (head || torso || limbs || arms) put(x, y, y % 4 === 0 ? 5 : Math.abs(x) > 3 ? 2 : 3);
          }
      } else if (name === 'lotus') {
        for (let y = -12; y <= 7; y++)
          for (let x = -15; x <= 15; x++) {
            const middle = Math.abs(x) / 5 + Math.abs(y + 4) / 10 < 1;
            const leaf = Math.abs(Math.abs(x) - 7) / 8 + Math.abs(y + Math.abs(x) * 0.45) / 6 < 1;
            if (middle || leaf) put(x, y, y < -6 ? 4 : Math.abs(x) < 3 ? 5 : y > 1 ? 2 : 3);
          }
      }
    });
  }
  function icon(name, p, C, frame = 0) {
    const img = emblem(name, p, frame);
    k.blit(img, C.x - 24, C.y - 31);
  }
  function marks(s, p, key, size, count = 5, reach = 20) {
    const n = Math.max(1, Math.min(count, Math.floor(60 / Math.max(1, s.targets.length))));
    s.hits.forEach((hit, i) => {
      const t = subject(s, hit);
      if (!t) return;
      const T = k.P(t),
        e = s.real(hit);
      k.drawHit(k.hitStyle(`b39:${key}`, p, { S: size, spikes: 4, minor: 4, jag: 0.18 }), T, e);
      k.shards(T, e, p, seed(s) + i * 13, n, reach);
    });
  }

  // True Resurrection: a golden soul descends into a rebuilding body; ivory wings snap open above a life seal.
  FX.register('true-resurrection', {
    palette: GOLD,
    travel: 480,
    beats: (event, kit, travel) => [
      { at: kit.CAST + travel, stop: 160, target: event.targets?.[0] ?? null, kind: 'soft', power: 0.05 },
    ],
    end: () => 1680,
    flash: (event, e) => (e < 40 ? { color: GOLD[4], alpha: 0.18 } : e < 85 ? { color: GOLD[0], alpha: 0.1 } : null),
    ground(s) {
      const t = subject(s, s.hits[0]);
      if (!t || s.c.t < k.CAST || s.c.t >= 1610) return;
      const F = feet(t),
        e = s.c.t - s.hits[0].at;
      const r = e < 0 ? 14 : 14 + Math.floor(k.ease(k.clamp(e / 400)) * 10);
      ring(F, r, r * 0.55, GOLD, e < 70 ? 4 : 3, e > 550);
      ring(F, r * 0.7, r * 0.38, LIFE, 3, true, s.c.t / 100);
      if (e < 0) icon('body', LIFE, F, Math.min(7, Math.floor((s.c.t - k.CAST) / 65) + 1));
    },
    air(s) {
      const t = subject(s, s.hits[0]);
      if (!t || s.c.t < k.CAST || s.c.t >= 1680) return;
      const T = k.P(t),
        F = feet(t),
        hit = s.hits[0],
        e = s.c.t - hit.at;
      if (e < 0) {
        const q = (s.c.t - k.CAST) / 480;
        const C = { x: T.x, y: T.y - 14 * (1 - k.ease(q)) };
        icon('soul', GOLD, C);
        ring({ x: C.x, y: C.y - 22 }, 8, 3, GOLD, 4);
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * k.tau + q * 2;
          pixel(F.x + Math.cos(a) * (18 - q * 9), F.y - q * 22 + Math.sin(a) * 5, LIFE, i % 2 ? 3 : 4);
        }
      } else {
        const real = s.real(hit);
        if (real < 510) icon('wings', GOLD, { x: T.x, y: T.y - 11 - Math.floor(real / 110) });
        if (e < 600) ring({ x: T.x, y: T.y - 25 }, 9, 3, GOLD, 4, e > 400);
        k.drawHit(k.hitStyle('b39:resurrection', GOLD, { S: 48, spikes: 4, minor: 4, jag: 0.08 }), T, real);
        k.shards(T, real, LIFE, seed(s), 10, 27);
        for (let i = 0; i < 10; i++) {
          const q = (real - i * 24) / 720;
          if (q < 0 || q >= 1) continue;
          const a = (i / 10) * k.tau;
          pixel(T.x + Math.cos(a) * (8 + q * 16), F.y - q * 42, GOLD, i % 3 ? 4 : 5, q < 0.6 ? 2 : 1);
        }
      }
    },
  });

  function stormHeight(s) {
    return Math.max(24, Math.min(48, ((s.area?.height || 15) / (s.grid.feet || 5)) * k.PX));
  }
  function cloud(R, frame) {
    R = Math.max(12, Math.round(R));
    const w = R * 2 + 8,
      h = Math.ceil(R * 0.8) + 12;
    return k.sprite(`b39:cloud:${R}:${frame}`, w, h, STORM, set => {
      for (let y = 2; y < h - 2; y++)
        for (let x = 2; x < w - 2; x++) {
          const dx = (x - w / 2) / R,
            dy = (y - h / 2) / (h * 0.46);
          const a = Math.atan2(dy, dx),
            d = Math.hypot(dx, dy);
          const rim = 0.91 + 0.065 * Math.cos(a * 11 + frame * 0.3);
          if (d > rim) continue;
          if (frame >= 6 && Math.abs(dx) < (frame - 5) * 0.15) continue;
          const band = Math.cos(d * 15 + a * 3 + frame * 0.5);
          set(x, y, d > rim - 0.08 ? 2 : band > 0.65 ? 3 : band > -0.2 ? 2 : 1);
        }
    });
  }
  function stormBody(s, lingering = false) {
    const c = centre(s);
    if (!c) return;
    const t = s.c.t - k.CAST;
    if (!lingering && (t < 0 || t >= 1540)) return;
    const C = k.P(c),
      R = radius(s, 40),
      H = stormHeight(s);
    const f = lingering
      ? Math.floor(s.c.raw / 150) % 4
      : t < 1150
        ? Math.floor(t / 140) % 4
        : 6 + Math.min(2, Math.floor((t - 1150) / 130));
    const img = cloud(R, f);
    k.blit(img, C.x - img.width / 2, C.y - H - img.height / 2, lingering ? s.linger : 1);
    ring(C, R, R, STORM, 2, true, s.c.t / 160);
    if (!lingering && t < 450)
      ring(
        C,
        R * (0.4 + 0.6 * k.ease(k.clamp((t - 180) / 270))),
        R * (0.4 + 0.6 * k.ease(k.clamp((t - 180) / 270))),
        STORM,
        4,
        true,
      );
  }
  function lightning(T, height, variation) {
    const points = [
      { x: T.x - 5, y: T.y - height },
      { x: T.x + 5 + variation, y: T.y - height * 0.63 },
      { x: T.x - 6, y: T.y - height * 0.45 },
      T,
    ];
    for (let i = 1; i < points.length; i++) stroke(points[i - 1], points[i], BOLT, 5, 2, 10);
    stroke(points[1], { x: T.x + 17, y: T.y - height * 0.3 }, BOLT, 3, 1, 7);
  }

  // Storm of Vengeance: a roiling purple-grey canopy delivers thunder, acid rain, lightning, hail, then a driving gale.
  FX.register('storm-of-vengeance', {
    palette: STORM,
    travel: 200,
    beats(event, kit, travel) {
      const stops = [85, 65, 140, 90, 60];
      return stops.flatMap((stop, i) =>
        beats(
          event,
          kit.CAST + travel + i * 220,
          stop,
          i === 2 ? 'beam' : i === 0 ? 'blast' : 'hit',
          i === 2 ? 0.09 : 0.05,
        ),
      );
    },
    end: () => 1850,
    reach: (event, grid) => ({ r: (event.area?.feet || 40) / (grid.feet || 5) + 1, up: 6 }),
    flash: (event, e) => (e < 25 ? { color: BOLT[4], alpha: 0.18 } : e < 60 ? { color: STORM[0], alpha: 0.14 } : null),
    ground: s => stormBody(s),
    air(s) {
      const c = centre(s),
        t = s.c.t - k.CAST;
      if (!c || t < 0 || s.c.t >= 1850) return;
      const C = k.P(c),
        R = radius(s, 40),
        H = stormHeight(s),
        phase = Math.max(0, Math.min(4, Math.floor((t - 200) / 220)));
      // Broad storm bodies stay below figures; only sparse streaks and impacts cross them.
      if (t < 1320) {
        const p = phase === 1 ? ACID : phase === 3 ? ICE : STORM;
        for (let i = 0; i < 17; i++) {
          const a = k.hash(i, seed(s)) * k.tau,
            d = Math.sqrt(k.hash(i, seed(s), 2)) * R * 0.88;
          const q = (s.c.raw / (phase === 4 ? 150 : 270) + k.hash(i, seed(s), 3)) % 1;
          const x = C.x + Math.cos(a) * d,
            y = C.y + Math.sin(a) * d;
          const P = { x: x - (1 - q) * (phase === 4 ? 24 : 4), y: y - H * (1 - q) };
          if (phase === 3) {
            pixel(P.x, P.y, ICE, 4, 3);
            pixel(P.x - 1, P.y - 1, ICE, 5);
          } else {
            stroke(P, { x: P.x - (phase === 4 ? 12 : 2), y: P.y - 5 }, p, phase === 1 ? 3 : 4, 1, 4);
          }
        }
      }
      s.hits.forEach((hit, i) => {
        const target = subject(s, hit);
        if (!target) return;
        const T = k.P(target),
          real = s.real(hit),
          stage = Math.round((hit.at - s.hits[0].at) / 220);
        const p = stage === 1 ? ACID : stage === 2 ? BOLT : stage === 3 ? ICE : STORM;
        if (stage === 2 && real >= 0 && real < 150) lightning(T, H + 12, Math.floor(k.hash(i, seed(s)) * 6));
        k.drawHit(
          k.hitStyle(`b39:storm:${stage}`, p, { S: stage === 2 ? 42 : 30, spikes: stage === 3 ? 6 : 4, jag: 0.3 }),
          T,
          real,
        );
        k.shards(
          T,
          real,
          p,
          seed(s) + i * 7,
          Math.max(1, Math.min(5, Math.floor(35 / Math.max(1, s.targets.length)))),
          stage === 3 ? 25 : 18,
        );
      });
    },
    linger: s => stormBody(s, true),
  });

  // Banded black sphere with bent accretion lanes; the frame cache also contains its torn settling rim.
  function voidFrame(R, frame, collapse = 0) {
    R = Math.max(8, Math.round(R));
    const w = R * 2 + 8;
    return k.sprite(`b39:void:${R}:${frame}:${collapse}`, w, w, VOID, set => {
      for (let y = 2; y < w - 2; y++)
        for (let x = 2; x < w - 2; x++) {
          const dx = (x - w / 2) / R,
            dy = (y - w / 2) / R,
            d = Math.hypot(dx, dy);
          if (d > 1) continue;
          const a = Math.atan2(dy, dx);
          if (collapse && (Math.floor(((a + Math.PI) / k.tau) * 24) + frame) % 3 < collapse) continue;
          if (d < 0.7) set(x, y, 1);
          else if (d < 0.8) set(x, y, 2);
          else if (d < 0.91) set(x, y, 3);
          else set(x, y, 2);
          const bend = Math.sin(a * 2 + d * 12 - (frame * Math.PI) / 4);
          if (d > 0.81 && d < 0.96 && bend > 0.8) set(x, y, 4);
        }
    });
  }
  function voidBody(s, lingering = false) {
    const c = centre(s);
    if (!c) return;
    const e = s.c.t - k.CAST;
    if (!lingering && (e < 0 || s.c.t >= 1750)) return;
    const C = k.P(c),
      full = radius(s, 20);
    let q = e < 220 ? 0.18 + 0.82 * k.ease(e / 220) : 1;
    if (!lingering && e > 1100) q = Math.max(0.02, 1 - k.ease(k.clamp((e - 1100) / 330)));
    if (lingering) q = 1;
    const R = Math.max(3, Math.round((full * q) / 2) * 2);
    const frame = Math.floor(s.c.t / 75) % 8;
    const img = voidFrame(R, frame, !lingering && e > 1220 ? 1 : 0);
    k.blit(img, C.x - img.width / 2, C.y - img.height / 2, lingering ? s.linger : 1);
    if (q > 0.3) ring(C, R * 1.08, R * 0.32, VOID, 4, true, frame);
    if (!lingering && e > 1350) ring(C, Math.max(3, 16 - (e - 1350) / 6), 3, VOID, 3, true);
  }

  // Ravenous Void: an opaque black gravity sphere, violet lensing arcs and stones spiralling inward to a crushing force beat.
  FX.register('ravenous-void', {
    palette: VOID,
    travel: 260,
    beats(event, kit, travel) {
      return [
        ...beats(event, kit.CAST + travel, 130, 'pull', 0.08),
        ...beats(event, kit.CAST + travel + 390, 170, 'blast', 0.09),
      ];
    },
    end: () => 1790,
    reach: (event, grid) => ({ r: ((event.area?.feet || 20) / (grid.feet || 5)) * 1.35 + 1, up: 1 }),
    flash: (event, e) => (e < 30 ? { color: VOID[4], alpha: 0.13 } : e < 85 ? { color: VOID[0], alpha: 0.24 } : null),
    ground: s => voidBody(s),
    air(s) {
      const c = centre(s),
        e = s.c.t - k.CAST;
      if (!c || e < 0 || s.c.t >= 1790) return;
      const C = k.P(c),
        R = radius(s, 20);
      if (e < 1260) {
        for (let i = 0; i < 18; i++) {
          const q = (s.c.raw / 610 + k.hash(i, seed(s))) % 1;
          const a = k.hash(i, seed(s), 2) * k.tau + q * 2.1;
          const d = R * (1.3 - k.ease(q) * 1.12);
          const P = { x: C.x + Math.cos(a) * d, y: C.y + Math.sin(a) * d * 0.72 };
          // Two trailing chips point away from the singularity; the head falls inward.
          pixel(P.x + Math.cos(a - 0.12) * 5, P.y + Math.sin(a - 0.12) * 4, VOID, 2);
          pixel(P.x, P.y, i % 3 ? ROCK : VOID, i % 3 ? 3 : 4, i % 4 ? 2 : 3);
        }
      }
      s.hits.forEach((hit, i) => {
        const t = subject(s, hit);
        if (!t) return;
        const T = k.P(t),
          real = s.real(hit),
          crush = hit.at > 800;
        k.drawHit(
          k.hitStyle(`b39:void:${crush}`, VOID, { S: crush ? 40 : 30, spikes: 7, jag: 0.4, void: true }),
          T,
          real,
        );
        k.shards(
          T,
          real,
          ROCK,
          seed(s) + i,
          Math.max(1, Math.min(5, Math.floor(35 / Math.max(1, s.targets.length)))),
          16,
        );
        if (real < 0 || real > 370) return;
        const n = Math.max(1, Math.min(6, Math.floor(36 / Math.max(1, s.targets.length))));
        for (let j = 0; j < n; j++) {
          const q = k.clamp(real / 370),
            a = k.hash(j, seed(s) + i) * k.tau;
          const x = k.mix(T.x + Math.cos(a) * 14, C.x, k.ease(q));
          const y = k.mix(T.y + Math.sin(a) * 12, C.y, k.ease(q)) - Math.sin(q * Math.PI) * 8;
          pixel(x, y, VOID, crush ? 4 : 3, q < 0.7 ? 2 : 1);
        }
      });
    },
    linger: s => voidBody(s, true),
  });
})(typeof window !== 'undefined' ? window : globalThis);
