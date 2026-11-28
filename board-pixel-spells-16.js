/* Pixel spells, batch 16: cleansing wards, mental magic, rays, wind and fey tricks. */
(function (root) {
  'use strict';
  const FX = root.BoardPixelFX;
  if (!FX) return;
  const k = FX.kit;
  const FIRE = ['#290d10', '#792014', '#cb421d', '#ff8429', '#ffd785', '#fff9dc'];
  const MIND = ['#250e2b', '#65215f', '#ac398c', '#ee7ecb', '#ffd5f1', '#ffffff'];
  const WIND = ['#142733', '#365464', '#789eae', '#b1dce0', '#e1fbf5', '#ffffff'];
  const POISON = ['#152316', '#315936', '#68a148', '#afe579', '#e4ffc6', '#ffffff'];
  const HEAL = ['#10281f', '#296c4e', '#56bd84', '#a8efb0', '#efffce', '#ffffff'];
  const GOLD = ['#2a1e1b', '#79502b', '#bb873b', '#f5cc72', '#fff1bd', '#ffffff'];
  const ROT = ['#120f20', '#2d253e', '#51405f', '#8c799d', '#c7b2ca', '#eee4ef'];
  const SILK = ['#18212f', '#424d65', '#8394ad', '#c3cfdf', '#eff5ef', '#ffffff'];
  const FEY = ['#271334', '#623366', '#aa5c9a', '#efa0ce', '#ffe2d7', '#ffffff'];
  const FORCE = ['#181831', '#423e86', '#7e79d6', '#bdb8ff', '#ece7ff', '#ffffff'];
  const SPIDER = ['#211522', '#4d2d3a', '#945053', '#d88b73', '#f8d1a0', '#ffffff'];
  const CARD = ['#261a2b', '#5c3044', '#b83f5c', '#e8c99d', '#fff4dc', '#ffffff'];

  function pixel(x, y, ramp, index = 3, size = 1) {
    k.dot(x, y, ramp[0], size + 2);
    k.dot(x, y, ramp[index], size);
  }
  function stroke(A, B, ramp, index = 3, width = 1, cap = 48) {
    const length = Math.hypot(B.x - A.x, B.y - A.y);
    const n = Math.max(1, Math.min(cap, Math.ceil(length / 2)));
    // Wider samples keep long rays continuous without a per-pixel loop.
    width = Math.max(width, Math.ceil(length / n));
    for (const [color, size] of [
      [ramp[0], width + 2],
      [ramp[index], width],
    ])
      for (let i = 0; i <= n; i++) k.dot(k.mix(A.x, B.x, i / n), k.mix(A.y, B.y, i / n), color, size);
  }
  function ring(C, rx, ry, ramp, index = 3, broken = false, phase = 0) {
    rx = Math.max(2, Math.round(rx));
    ry = Math.max(2, Math.round(ry));
    const f = ((Math.floor(phase) % 8) + 8) % 8;
    const img = k.sprite(
      `16:ring:${ramp[0]}:${rx}:${ry}:${index}:${broken}:${f}`,
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
  function icon(key, rows, ramp) {
    return k.sprite(
      `16:${key}:${ramp[0]}`,
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
    const img = icon(key, rows, ramp);
    k.blit(img, C.x - img.width / 2, C.y - img.height / 2);
  }
  const DROP = ['...3...', '...43..', '..443..', '..4543.', '.34543.', '.34443.', '..333..'];
  const EYE = ['...33333...', '.334444433.', '34443234443', '.344323443.', '...33333...'];
  const PAW = ['.33...33.', '3443.3443', '.33...33.', '...333...', '..34443..', '.3444443.', '..33.33..'];
  const HOURGLASS = ['3333333', '.34443.', '..343..', '...3...', '..343..', '.34443.', '3333333'];
  const LEAF = ['.....3.', '...334.', '..3443.', '.3443..', '.343...', '..3....'];
  const BUTTERFLY = ['33...33', '344.443', '3442443', '.33233.', '.34243.', '..323..'];
  const FLOWER = ['...33...', '..3443..', '.334433.', '34455443', '.334433.', '...33...', '...23...', '..223...'];
  const BOOT = ['..333...', '..343...', '..343...', '..34433.', '.3444443', '.2222222'];
  const MOUTH = ['333333333', '.4555554.', '.3444443.', '..34443..', '...333...'];

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
  function beatList(event, kit, travel, kind = 'soft', stop = 60) {
    return (event.targets?.length ? event.targets : [null]).map(target => ({
      at: kit.CAST + travel,
      stop,
      target,
      kind,
      power: kind === 'soft' ? 0 : 0.06,
    }));
  }
  function impact(s, hit, C, ramp, size = 24, count = 6, salt = 0) {
    const e = s.real(hit);
    k.drawHit(k.hitStyle(`16:${s.event.id}:${salt}`, ramp, { S: size, spikes: 5, jag: 0.3 }), C, e);
    k.shards(C, e, ramp, (s.event.seed || 0) + salt * 37, count, size * 0.65);
  }
  function mote(s, T, ramp) {
    const hit = s.hits[0];
    if (!s.pose.hand || s.c.t < k.CAST || s.c.t >= hit.at) return;
    const H = k.P(s.pose.hand),
      q = (s.c.t - k.CAST) / Math.max(1, hit.at - k.CAST);
    for (let i = 5; i >= 0; i--) {
      const u = q - i * 0.055;
      if (u < 0) continue;
      pixel(k.mix(H.x, T.x, u), k.mix(H.y, T.y, u) - Math.sin(u * Math.PI) * 5, ramp, i ? 3 : 5, i ? 1 : 3);
    }
  }
  function softGround(s, ramp) {
    const e = s.c.t - s.hits[0].at;
    if (e < 0 || e > 620) return;
    const C = feet(subject(s));
    ring(
      C,
      10 + k.ease(k.clamp(e / 220)) * 6,
      5 + k.ease(k.clamp(e / 220)) * 3,
      ramp,
      e < 400 ? 3 : 2,
      e > 440,
      e / 80,
    );
  }
  function areaAxis(s, fallback, kind) {
    const a = s.area || { ...(s.pose.base || subject(s)), dir: 0, feet: fallback, kind };
    const O = k.P(a),
      dir = a.dir || 0;
    return {
      O,
      dx: Math.cos(dir),
      dy: Math.sin(dir),
      length: ((a.feet || fallback) / (s.grid.feet || 5)) * k.PX,
      width: ((a.width || 10) / (s.grid.feet || 5)) * k.PX,
    };
  }
  function along(a, u, side = 0) {
    return { x: a.O.x + a.dx * u - a.dy * side, y: a.O.y + a.dy * u + a.dx * side };
  }
  function windRibbons(a, e) {
    const corners = [
      along(a, 0, -a.width / 2 - 5),
      along(a, a.length, -a.width / 2 - 5),
      along(a, a.length, a.width / 2 + 5),
      along(a, 0, a.width / 2 + 5),
    ];
    const x0 = Math.floor(Math.min(...corners.map(p => p.x))) - 3;
    const y0 = Math.floor(Math.min(...corners.map(p => p.y))) - 3;
    const w = Math.ceil(Math.max(...corners.map(p => p.x)) - x0) + 4;
    const h = Math.ceil(Math.max(...corners.map(p => p.y)) - y0) + 4;
    const front = Math.ceil(k.clamp(e / 120) * 12),
      tail = Math.floor(k.clamp((e - 760) / 300) * 12);
    const f = Math.floor(e / 42) % 8;
    const img = k.sprite(
      `16:wind:${a.length}:${a.width}:${a.dx.toFixed(3)}:${a.dy.toFixed(3)}:${front}:${tail}:${f}`,
      w,
      h,
      WIND,
      set => {
        for (let lane = 0; lane < 5; lane++)
          for (let x = 0; x <= a.length; x++) {
            if (
              x > (a.length * front) / 12 ||
              x < (a.length * tail) / 12 ||
              Math.floor((x + f * 4 + lane * 7) / 18) % 4 === 0
            )
              continue;
            const side = (lane / 4 - 0.5) * a.width * 0.84 + Math.sin(x / 17 - (f * Math.PI) / 4 + lane) * 2;
            const P = along(a, x, side);
            set(P.x - x0, P.y - y0, lane % 2 ? 3 : 4);
            if (lane % 2 === 0) set(P.x - x0 - a.dy, P.y - y0 + a.dx, 2);
          }
      },
    );
    k.blit(img, x0, y0);
  }
  function cube(s) {
    const a = s.area;
    const points = a ? k.outline(a, s.grid) : [];
    if (points.length === 4) return points.map(p => k.P(Array.isArray(p) ? { x: p[0], y: p[1] } : p));
    const C = k.P(s.pose.target || subject(s)),
      side = ((a?.feet || 20) / (s.grid.feet || 5)) * k.PX;
    return [
      { x: C.x - side / 2, y: C.y - side / 2 },
      { x: C.x + side / 2, y: C.y - side / 2 },
      { x: C.x + side / 2, y: C.y + side / 2 },
      { x: C.x - side / 2, y: C.y + side / 2 },
    ];
  }
  function uv(points, u, v) {
    return {
      x: points[0].x + (points[1].x - points[0].x) * u + (points[3].x - points[0].x) * v,
      y: points[0].y + (points[1].y - points[0].y) * u + (points[3].y - points[0].y) * v,
    };
  }
  // Large ground geometry is rasterised once per construction stage, then only blitted.
  function zoneSprite(s, web, stage = 3) {
    const p = cube(s),
      x0 = Math.floor(Math.min(...p.map(v => v.x))) - 3,
      y0 = Math.floor(Math.min(...p.map(v => v.y))) - 3;
    const w = Math.ceil(Math.max(...p.map(v => v.x)) - x0) + 4,
      h = Math.ceil(Math.max(...p.map(v => v.y)) - y0) + 4;
    const local = p.map(v => ({ x: v.x - x0, y: v.y - y0 }));
    const geometry = local.map(v => `${Math.round(v.x)},${Math.round(v.y)}`).join(':');
    const img = k.sprite(`16:zone:${web}:${stage}:${geometry}`, w, h, web ? SILK : FEY, set => {
      const line = (A, B, index) => {
        const n = Math.max(1, Math.ceil(Math.hypot(B.x - A.x, B.y - A.y) * 1.4));
        for (let i = 0; i <= n; i++) set(k.mix(A.x, B.x, i / n), k.mix(A.y, B.y, i / n), index);
      };
      if (!web) {
        for (let i = 0; i < 4; i++) line(local[i], local[(i + 1) % 4], 3);
        for (let i = 0; i < 12; i++) {
          const C = uv(local, ((i % 4) + 0.5) / 4, (Math.floor(i / 4) + 0.5) / 3);
          set(C.x, C.y, i % 2 ? 2 : 3);
          set(C.x + 1, C.y, 4);
        }
        return;
      }
      const C = uv(local, 0.5, 0.5),
        reach = (stage + 1) / 4;
      const tips = [];
      for (let i = 0; i < 12; i++) {
        const side = Math.floor(i / 3),
          q = (i % 3) / 3;
        const E = {
          x: k.mix(local[side].x, local[(side + 1) % 4].x, q),
          y: k.mix(local[side].y, local[(side + 1) % 4].y, q),
        };
        tips.push(E);
        line(C, { x: k.mix(C.x, E.x, reach), y: k.mix(C.y, E.y, reach) }, i % 3 ? 3 : 4);
      }
      for (let r = 1; r <= stage + 1; r++) {
        const f = r / 4;
        for (let i = 0; i < 12; i++) {
          const A = { x: k.mix(C.x, tips[i].x, f), y: k.mix(C.y, tips[i].y, f) };
          const B = { x: k.mix(C.x, tips[(i + 1) % 12].x, f), y: k.mix(C.y, tips[(i + 1) % 12].y, f) };
          const sag = { x: k.mix(A.x, B.x, 0.5) * 0.92 + C.x * 0.08, y: k.mix(A.y, B.y, 0.5) * 0.92 + C.y * 0.08 };
          line(A, sag, r % 2 ? 3 : 2);
          line(sag, B, r % 2 ? 3 : 2);
        }
      }
    });
    k.blit(img, x0, y0);
  }

  // Mind Spike: a psionic crystal snaps into the brow; concentric pain rings leave a tracking eye.
  FX.register('mind-spike', {
    palette: MIND,
    travel: 130,
    beats: (event, kit, travel) => beatList(event, kit, travel, 'hit', 110),
    end: () => k.CAST + 820,
    air(s) {
      const hit = s.hits[0],
        C = k.P(subject(s)),
        T = { x: C.x, y: C.y - 8 },
        e = s.c.t - k.CAST;
      if (e < 0) return;
      if (e < 200) {
        const q = k.ease(k.clamp(e / 130));
        const img = icon(
          'mind-needle',
          ['.....5.....', '....454....', '...34543...', '....343....', '....343....', '....232....', '.....2.....'],
          MIND,
        );
        k.blitRotated(img, T.x + (1 - q) * 15, T.y - (1 - q) * 23, -Math.PI / 4);
      }
      impact(s, hit, T, MIND, 38, 9);
      const real = s.real(hit);
      if (real >= 0 && real < 470)
        for (let i = 0; i < 2; i++) {
          const q = k.clamp((real - i * 70) / 330);
          if (real < i * 70 || q >= 1) continue;
          ring(T, 5 + q * 18, 3 + q * 10, MIND, i ? 2 : 4, q > 0.5, real / 70);
        }
      if (real >= 230 && real < 720) stamp('tracking-eye', EYE, MIND, { x: T.x, y: T.y - 13 });
    },
  });

  // Gust of Wind: a full sixty-foot corridor of white wind ribbons carries leaves straight away from the caster.
  FX.register('gust-of-wind', {
    palette: WIND,
    travel: 120,
    beats: (event, kit, travel) => beatList(event, kit, travel, 'hit', 80),
    end: () => k.CAST + 1140,
    ground(s) {
      const e = s.c.t - k.CAST;
      if (e < 0 || e > 1060) return;
      windRibbons(areaAxis(s, 60, 'line'), e);
    },
    air(s) {
      const a = areaAxis(s, 60, 'line'),
        e = s.c.t - k.CAST;
      if (e >= 0 && e < 1030)
        for (let i = 0; i < 9; i++) {
          const u = (e / 490 + i / 9) % 1;
          if (u > k.clamp(e / 120) || u < k.clamp((e - 760) / 300)) continue;
          const side = (k.hash(i, s.event.seed || 0) - 0.5) * a.width * 0.8;
          const P = along(a, u * a.length, side);
          if (i % 3 === 0) stamp('wind-leaf', LEAF, POISON, P);
          else ring(P, 7, 3, WIND, 4, true, e / 70 + i);
        }
      s.hits.forEach((hit, i) => impact(s, hit, k.P(subject(s, hit)), WIND, 24, 5, i));
    },
  });

  function rayCount(event) {
    return Math.max(3, Math.min(10, Math.floor(event.slot || event.level || 2) + 1));
  }
  // Scorching Ray: three individually aimed orange-white lances punch in, leaving ember bursts and charcoal puffs.
  FX.register('scorching-ray', {
    palette: FIRE,
    travel: 35,
    beats(event, kit, travel) {
      const list = kit.targetList(event, event.rays);
      return Array.from({ length: rayCount(event) }, (_, i) => ({
        at: kit.CAST + travel + i * 100,
        stop: 55,
        target: list.length ? list[i % list.length] : null,
        kind: 'beam',
        power: 0.06,
      }));
    },
    end: event => k.CAST + 35 + (rayCount(event) - 1) * 100 + 430,
    flash: (event, e) =>
      e < 24 ? { color: '#ffe5ae', alpha: 0.12 } : e < 48 ? { color: '#250e13', alpha: 0.09 } : null,
    air(s) {
      if (!s.pose.hand) return;
      const H = k.P(s.pose.hand);
      s.hits.forEach((hit, i) => {
        const T = k.P(k.contact(subject(s, hit), s.pose.hand)),
          e = s.c.t - (hit.at - 35);
        if (e >= 0 && e < 160) {
          const B = e < 35 ? { x: k.mix(H.x, T.x, k.clamp(e / 24)), y: k.mix(H.y, T.y, k.clamp(e / 24)) } : T;
          stroke(H, B, FIRE, e < 85 ? 4 : 2, e < 85 ? 6 : 2, 40);
          if (e < 90) stroke(H, B, FIRE, 5, 1, 40);
          k.disc(H.x, H.y, 4, FIRE[0]);
          k.disc(H.x, H.y, 3, FIRE[4]);
        }
        impact(s, hit, T, FIRE, 32, 7, i);
        const real = s.real(hit);
        if (real >= 130 && real < 460)
          for (let j = 0; j < 3; j++) {
            const q = (real - 130) / 330;
            const x = T.x + (j - 1) * (4 + q * 5),
              y = T.y - q * 13 + (j % 2) * 3;
            const r = real > 350 ? 2 : 3 + (j % 2);
            k.disc(x, y, r + 1, ROT[0]);
            k.disc(x, y, r, ROT[1]);
            if (real < 260) pixel(x, y + 3, FIRE, 3);
          }
      });
    },
  });

  function cardSprite(suit, back) {
    return k.sprite(`16:card:${suit}:${back}`, 9, 13, CARD, set => {
      for (let y = 1; y < 12; y++) for (let x = 1; x < 8; x++) set(x, y, back ? ((x + y) % 2 ? 1 : 2) : 4);
      if (back) return;
      set(2, 2, suit % 2 ? 1 : 2);
      set(6, 10, suit % 2 ? 1 : 2);
      const rows =
        suit % 4 === 0
          ? ['2.2', '222', '.2.']
          : suit % 4 === 1
            ? ['.1.', '111', '111', '.1.']
            : suit % 4 === 2
              ? ['.2.', '222', '.2.']
              : ['.1.', '111', '.1.', '111'];
      rows.forEach((row, y) => [...row].forEach((v, x) => v !== '.' && set(x + 3, y + 4, +v)));
    });
  }
  // Spray of Cards: a snapping fan of red-and-black playing cards fills the fifteen-foot cone with force-edged cuts.
  FX.register('spray-of-cards', {
    palette: FORCE,
    travel: 240,
    beats: (event, kit, travel) => beatList(event, kit, travel, 'hit', 100),
    end: () => k.CAST + 880,
    ground(s) {
      const e = s.c.t - s.hits[0].at;
      if (e < 60 || e > 570) return;
      const a = areaAxis(s, 15, 'cone');
      for (let i = 0; i < 5; i++) {
        const u = 0.62 + k.hash(i, s.event.seed || 0) * 0.3,
          side = (i / 4 - 0.5) * a.length * u * 0.9;
        const P = along(a, u * a.length, side);
        k.blitRotated(cardSprite(i, false), P.x, P.y, a.dx + i * 0.9);
      }
    },
    air(s) {
      const a = areaAxis(s, 15, 'cone'),
        e = s.c.t - k.CAST;
      if (e >= 0 && e < 650)
        for (let i = 0; i < 12; i++) {
          const release = (i % 3) * 20,
            q = k.clamp((e - release) / 240);
          if (e < release || e > 390 + i * 10) continue;
          const lane = (i / 11 - 0.5) * 0.94,
            u = q * (0.78 + (i % 3) * 0.1);
          const P = along(a, u * a.length, lane * a.length * u);
          P.y -= Math.sin(q * Math.PI) * 3;
          if (q < 1) {
            const A = along(a, Math.max(0, u - 0.12) * a.length, lane * a.length * Math.max(0, u - 0.12));
            stroke(A, P, FORCE, 3, 1, 6);
          } else P.y += (e - 240) / 35;
          k.blitRotated(
            cardSprite(i, Math.floor(e / 55 + i) % 4 === 0),
            P.x,
            P.y,
            Math.atan2(a.dy, a.dx) + lane + (Math.floor(e / 70 + i) * Math.PI) / 8,
          );
        }
      s.hits.forEach((hit, i) => impact(s, hit, k.P(subject(s, hit)), FORCE, 30, 7, i));
    },
  });

  // Web: a silver spindle bursts into a sticky, corner-anchored twenty-foot cobweb with sagging cross-strands.
  FX.register('web', {
    palette: SILK,
    travel: 220,
    beats: (event, kit, travel) => beatList(event, kit, travel, 'soft', 85),
    end: () => k.CAST + 1140,
    ground(s) {
      const e = s.c.t - s.hits[0].at;
      if (e < 0) return;
      zoneSprite(s, true, Math.min(3, Math.floor(e / 75)));
    },
    air(s) {
      const p = cube(s),
        C = uv(p, 0.5, 0.5),
        hit = s.hits[0];
      mote(s, C, SILK);
      impact(s, hit, C, SILK, 28, 9);
      const real = s.real(hit);
      if (real >= 0 && real < 380)
        for (let i = 0; i < 4; i++) {
          const q = k.ease(k.clamp(real / 180)),
            P = { x: k.mix(C.x, p[i].x, q), y: k.mix(C.y, p[i].y, q) };
          pixel(P.x, P.y, SILK, 5, real < 200 ? 3 : 1);
        }
      s.hits.forEach((h, i) => {
        if (h.id !== null) impact(s, h, k.P(subject(s, h)), SILK, 20, 4, i + 1);
      });
    },
    linger(s) {
      if (s.c.t >= k.CAST + 1140 && s.linger > 0) zoneSprite(s, true);
    },
  });

  function mischief(s) {
    const e = s.c.t - s.hits[0].at;
    if (e < 0) return;
    zoneSprite(s, false);
    const p = cube(s),
      phase = Math.floor(e / 260) % 4;
    for (let i = 0; i < 9; i++) {
      const seed = s.event.seed || 0,
        u = 0.12 + k.hash(i, seed, 2) * 0.76,
        v = 0.12 + k.hash(i, seed, 3) * 0.76;
      const C = uv(p, u, v);
      if (phase === 0) stamp('fey-flower', FLOWER, i % 2 ? FEY : GOLD, C);
      else if (phase === 1) {
        const img = icon('fey-butterfly', BUTTERFLY, i % 2 ? FEY : GOLD);
        k.blitRotated(
          img,
          C.x + Math.sin(e / 110 + i) * 4,
          C.y + Math.cos(e / 130 + i) * 3,
          Math.sin(e / 85 + i) * 0.5,
        );
      } else if (phase === 2) {
        ring(C, 5, 3, POISON, 3, true, e / 100 + i);
        if (i % 3 === 0) stamp('fey-giggle', MOUTH, FEY, C);
      } else {
        k.disc(C.x, C.y, 6, GOLD[0]);
        k.disc(C.x, C.y, 5, GOLD[1]);
        k.disc(C.x - 1, C.y - 1, 3, GOLD[2]);
        pixel(C.x + 1, C.y - 2, GOLD, 3);
      }
    }
  }
  // Nathair's Mischief: a fey cube cycles through fragrant flowers, bright butterflies, giggles and sticky amber molasses.
  FX.register('nathairs-mischief', {
    palette: FEY,
    travel: 100,
    beats: (event, kit, travel) => beatList(event, kit, travel, 'soft', 75),
    end: () => k.CAST + 1320,
    ground: mischief,
    air(s) {
      const hit = s.hits[0],
        C = uv(cube(s), 0.5, 0.5);
      mote(s, C, FEY);
      impact(s, hit, C, FEY, 30, 10);
      const real = s.real(hit);
      if (real < 0 || real > 600) return;
      for (let i = 0; i < 8; i++) {
        const a = k.hash(i, s.event.seed || 0) * k.tau,
          q = real / 600;
        const P = {
          x: C.x + Math.cos(a) * k.ease(q) * 25,
          y: C.y + Math.sin(a) * k.ease(q) * 16 - Math.sin(q * Math.PI) * 12 + q * q * 16,
        };
        pixel(P.x, P.y, i % 3 ? FEY : GOLD, i % 2 ? 3 : 4, 2);
      }
    },
    linger(s) {
      if (s.c.t >= k.CAST + 1320 && s.linger > 0) mischief(s);
    },
    reach: (event, grid) => ({ r: (event.area?.feet || 20) / (grid.feet || 5) + 1, up: 2 }),
  });

  function spider(C, e) {
    for (let i = 0; i < 4; i++)
      for (const side of [-1, 1]) {
        const wobble = Math.sin(e / 70 + i) * 1.5;
        const knee = { x: C.x + side * (7 + (i % 2) * 2), y: C.y + (i - 1.5) * 4 };
        stroke({ x: C.x + side * 2, y: C.y }, knee, SPIDER, 3, 1, 5);
        stroke(knee, { x: knee.x + side * 2, y: knee.y + (i < 2 ? -3 : 3) + wobble }, SPIDER, 3, 1, 3);
      }
    k.disc(C.x, C.y + 2, 4.5, SPIDER[0]);
    k.disc(C.x, C.y + 2, 3.5, SPIDER[2]);
    k.disc(C.x, C.y - 3, 3, SPIDER[0]);
    k.disc(C.x, C.y - 3, 2, SPIDER[3]);
    pixel(C.x - 1, C.y - 4, SPIDER, 5);
    pixel(C.x + 1, C.y - 4, SPIDER, 5);
  }

  function rope(s, persistent = false) {
    const hit = s.hits[0],
      e = s.c.t - k.CAST;
    if (e < 0 || (!persistent && e > 1230)) return;
    const B = k.P(s.pose.target || s.pose.base || subject(s)),
      height = 30;
    const rise = k.ease(k.clamp(e / 260)),
      top = { x: B.x + 2, y: B.y - height };
    if (e >= 260) {
      ring(top, 13, 5, FORCE, 2);
      ring(top, 9, 2, FORCE, 1);
      ring({ x: top.x, y: top.y - 1 }, 13, 5, GOLD, 4, true, e / 120);
    }
    const n = 24;
    for (const [color, size] of [
      [GOLD[0], 4],
      [GOLD[3], 2],
    ])
      for (let i = 0; i <= n; i++) {
        const u = i / n;
        const wiggle = Math.sin(u * 8 - e / 85) * (1 - u) * (e < 400 ? 3 : 1);
        k.dot(k.mix(B.x, top.x, u) + wiggle, B.y - u * height * rise, color, size);
      }
    for (let i = 1; i < 9; i++) {
      const u = i / 9;
      pixel(k.mix(B.x, top.x, u), B.y - u * height * rise, GOLD, i % 2 ? 2 : 4, 1);
    }
    const real = s.real(hit);
    if (!persistent) impact(s, hit, top, FORCE, 26, 7);
    if (real >= 160 && real < 700) {
      // A last knot is visibly swallowed by the extradimensional opening.
      const q = k.clamp((real - 160) / 500);
      ring({ x: B.x + 2, y: B.y - q * height }, 3, 2, GOLD, 4);
    }
  }
  // Rope Trick: a knotted rope stands upright and feeds into a dark, gold-rimmed extradimensional hatch overhead.
  FX.register('rope-trick', {
    palette: GOLD,
    travel: 260,
    beats: (event, kit, travel) => [{ at: kit.CAST + travel, stop: 75, target: null, kind: 'soft', power: 0 }],
    end: () => k.CAST + 1240,
    ground(s) {
      const e = s.c.t - k.CAST;
      if (e < 0 || e > 490) return;
      const C = k.P(s.pose.target || s.pose.base || subject(s));
      ring(C, 9 - k.clamp(e / 490) * 5, 4, GOLD, 3, e > 280, e / 90);
    },
    air: s => rope(s),
    reach: () => ({ r: 2, up: 3 }),
  });
})(typeof window !== 'undefined' ? window : globalThis);
