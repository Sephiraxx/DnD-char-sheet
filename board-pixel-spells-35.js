/* Pixel spells, batch 35 (see docs/pixel-spells/BRIEF.md). */
(function (root) {
  'use strict';
  const FX = root.BoardPixelFX;
  if (!FX) return;
  const k = FX.kit;
  const C = k.CAST;
  const ILLUSION = ['#17132b', '#393867', '#6b77b1', '#aabce6', '#dfedff', '#ffffff'];
  const LIFE = ['#11261e', '#285c40', '#50a76b', '#9de89a', '#e7ffd0', '#ffffff'];
  const GOLD = ['#2c1c20', '#79532d', '#c28d3d', '#f5cb70', '#fff0bf', '#ffffff'];
  const FROST = ['#102338', '#305477', '#5896bc', '#a0ddeb', '#e0faff', '#ffffff'];
  const BLUE = ['#10172e', '#213768', '#355eac', '#689fe2', '#bedcfa', '#f5fcff'];
  const ARCANE = ['#1e1532', '#50337b', '#8b60b8', '#cba3e7', '#f2ddff', '#ffffff'];
  const RUNE = ['#251023', '#60203f', '#a43b72', '#e77ba8', '#ffd3ea', '#ffffff'];
  const WIND = ['#182029', '#394854', '#6b7e89', '#aebfc5', '#e5eff0', '#ffffff'];
  const FIRE = ['#2b1012', '#74241b', '#c34421', '#f78029', '#ffd36b', '#fff4ce'];
  const ASH = ['#1b171d', '#37313a', '#62585e', '#95868a', '#c2b6b1', '#eee2cf'];
  const DRAGON = ['#201a2c', '#59404b', '#a87851', '#e5b775', '#f9e1b1', '#ffffff'];
  const SILVER = ['#1d1730', '#50436b', '#867da9', '#bdbce0', '#e8edff', '#ffffff'];
  const RAYS = [
    ['#300f19', '#7f1830', '#c43643', '#f56760', '#ffbba6', '#fff6eb'],
    ['#301b0f', '#8a4320', '#ca752a', '#ffa83e', '#ffda9a', '#fff9e8'],
    ['#2d260f', '#8c7620', '#c8b737', '#f9e35d', '#fff3ad', '#fffdea'],
    ['#102c1d', '#246238', '#43a35e', '#79e889', '#c9ffc6', '#f6fff0'],
    ['#101c38', '#284780', '#487bc6', '#7db6ff', '#c6e4ff', '#f3fbff'],
    ['#1c153a', '#422c80', '#7053ba', '#a78ce9', '#d8c9ff', '#faf4ff'],
    ['#2d113a', '#6d2980', '#ab50bf', '#e996ee', '#ffd2ff', '#fff5ff'],
  ];
  const add = (p, x, y) => ({ x: p.x + x, y: p.y + y });
  const seed = s => s.event.seed || 0;
  const live = (s, end) => s.c.t >= C && s.c.t < end;
  const ids = e => (e.targets?.length ? [...new Set(e.targets)] : [null]);
  const aim = s => s.area || s.pose.target || s.targets[0] || s.pose.base || s.pose.hand;
  const center = s => k.P(aim(s));
  const feet = p => k.P({ x: p.baseX ?? p.x, y: p.baseY ?? p.y });
  const body = s => k.P(s.targets[0] || s.pose.target || s.pose.hand || s.pose.base);
  const base = s => feet(s.pose.base || aim(s));
  const beat = (at, stop, target = null, kind = 'soft', power = 0.04) => ({ at, stop, target, kind, power });
  const soft = (e, kit, travel) => ids(e).map(id => beat(C + travel, 80, id));
  const blast = (e, kit, travel) => ids(e).map(id => beat(C + travel, 150, id, 'blast', 0.08));
  function hitPoint(s, h) {
    const t = s.targets.find(t => t.id === h.id) || s.targets[0] || aim(s);
    return k.P(k.contact(t, s.pose.hand || t));
  }
  function pixel(p, ramp, index = 4, size = 1) {
    k.dot(p.x, p.y, ramp[0], size + 2);
    k.dot(p.x, p.y, ramp[index], size);
  }
  function orb(p, r, ramp, index = 3) {
    k.disc(p.x, p.y, r + 1, ramp[0]);
    k.disc(p.x, p.y, r, ramp[index]);
    if (r > 2) k.disc(p.x - 1, p.y - 1, r * 0.45, ramp[4]);
  }
  function stamp(img, p) {
    k.blit(img, p.x - img.width / 2, p.y - img.height / 2);
  }
  function icon(key, ramp, rows) {
    return k.sprite(`b35:${key}`, rows[0].length + 2, rows.length + 2, ramp, set => {
      rows.forEach((row, y) => [...row].forEach((v, x) => v !== '.' && set(x + 1, y + 1, Number(v))));
    });
  }
  // Long strokes and large rings are cached, keeping live particle work small.
  function stroke(a, b, ramp, width = 1, index = 3) {
    const dx = Math.round(b.x - a.x),
      dy = Math.round(b.y - a.y),
      pad = width + 2;
    const ox = pad - Math.min(0, dx),
      oy = pad - Math.min(0, dy);
    const img = k.sprite(
      `b35:stroke:${dx}:${dy}:${ramp[1]}:${width}:${index}`,
      Math.abs(dx) + pad * 2 + 1,
      Math.abs(dy) + pad * 2 + 1,
      ramp,
      set => {
        const n = Math.max(1, Math.ceil(Math.hypot(dx, dy)));
        for (let i = 0; i <= n; i++)
          for (let x = 0; x < width; x++)
            for (let y = 0; y < width; y++)
              set(ox + (dx * i) / n + x - (width - 1) / 2, oy + (dy * i) / n + y - (width - 1) / 2, index);
      },
    );
    k.blit(img, a.x - ox, a.y - oy);
  }
  function ring(p, rx, ry, ramp, index = 3, gap = 0, phase = 0) {
    rx = Math.max(2, Math.round(rx));
    ry = Math.max(2, Math.round(ry));
    const f = gap ? Math.floor(phase) % 8 : 0;
    const img = k.sprite(`b35:ring:${rx}:${ry}:${ramp[1]}:${index}:${gap}:${f}`, rx * 2 + 5, ry * 2 + 5, ramp, set => {
      for (let y = -ry; y <= ry; y++)
        for (let x = -rx; x <= rx; x++) {
          if (Math.abs(Math.hypot(x / rx, y / ry) - 1) * Math.min(rx, ry) > 0.65) continue;
          if (gap && Math.floor(((Math.atan2(y, x) + Math.PI) / k.tau) * gap * 2 + f / 2) % 2) continue;
          set(x + rx + 2, y + ry + 2, index);
        }
    });
    stamp(img, p);
  }
  function impact(s, h, p, ramp, key, size = 30, n = 7) {
    const e = s.real(h);
    k.drawHit(k.hitStyle(`b35:${key}`, ramp, { S: size, spikes: 6, minor: 2, jag: 0.25 }), p, e);
    k.shards(p, e, ramp, seed(s) + h.at, n, size * 0.65);
  }
  function sparks(s, p, ramp, e, n = 12, reach = 20, rise = 10) {
    if (e < 0 || e >= 560) return;
    const q = e / 560;
    for (let i = 0; i < n; i++) {
      if (q > 0.75 && i % 2) continue;
      const a = k.hash(i, seed(s), 35) * k.tau;
      pixel(
        add(p, Math.cos(a) * k.ease(q) * reach, Math.sin(a) * k.ease(q) * reach * 0.6 - q * rise),
        ramp,
        i % 3 ? 3 : 4,
      );
    }
  }
  function diamond(p, ramp, size = 8) {
    const img = k.sprite(`b35:diamond:${ramp[1]}:${size}`, size * 2 + 5, size * 2 + 5, ramp, set => {
      for (let y = -size; y <= size; y++)
        for (let x = -size; x <= size; x++)
          if (Math.abs(x) + Math.abs(y) <= size)
            set(x + size + 2, y + size + 2, x < 0 ? (y < 0 ? 5 : 3) : y < 0 ? 4 : 2);
    });
    stamp(img, p);
  }
  function figure(ramp, phase = 0, scan = false) {
    return k.sprite(`b35:figure:${ramp[1]}:${phase}:${scan}`, 25, 35, ramp, set => {
      for (let y = 2; y < 32; y++)
        for (let x = 3; x < 22; x++) {
          if (scan && (y + phase) % 5 === 0) continue;
          const dx = x - 12;
          const head = y < 10 && Math.abs(dx) <= 4 - Math.floor(Math.abs(y - 6) / 2);
          const torso = y >= 11 && y < 23 && Math.abs(dx) <= 4;
          const arm = y >= 12 && y < 23 && Math.abs(dx) >= 5 && Math.abs(dx) <= 8;
          const legs = y >= 23 && Math.abs(dx) >= 1 && Math.abs(dx) <= 5;
          if (head || torso || arm || legs) set(x, y, x < 11 ? 3 : 2);
          if (head && y === 6 && (dx === -2 || dx === 2)) set(x, y, 5);
          if (torso && Math.abs(dx) < 2) set(x, y, 4);
        }
    });
  }
  const hourglass = () =>
    icon('hourglass', GOLD, [
      '444444444',
      '.3222223.',
      '..32223..',
      '...353...',
      '....5....',
      '...353...',
      '..34443..',
      '.3444443.',
      '444444444',
    ]);
  const heart = () => icon('heart', RUNE, ['.44.44.', '4554554', '3444443', '.34443.', '..343..', '...3...']);
  function sigil(p, ramp, radius, t) {
    ring(p, radius, radius * 0.55, ramp, 3);
    ring(p, radius * 0.7, radius * 0.38, ramp, 4, 6, t / 110);
    for (let i = 0; i < 4; i++) {
      const a = (i * k.tau) / 4;
      diamond(add(p, Math.cos(a) * radius, Math.sin(a) * radius * 0.55), ramp, 2);
    }
  }
  function portals(s) {
    return {
      from: k.P(s.event.teleport?.from || s.pose.base || s.pose.hand || aim(s)),
      to: k.P(s.event.teleport?.to || s.pose.target || s.targets[0] || aim(s)),
    };
  }
  function blueVeil(s, p) {
    const phase = s.c.t < 830 ? 0 : s.c.t < 1450 ? 1 : 2;
    const img = k.sprite(`b35:blue-veil:${phase}`, 51, 53, BLUE, set => {
      for (let y = 2; y < 51; y++)
        for (let x = 2; x < 49; x++) {
          const edge = 3 + Math.floor(Math.sin(y / 7) * 2);
          if (x < edge || x > 50 - edge) continue;
          const split = phase ? 3 + Math.floor((y / 51) * (phase === 1 ? 12 : 19)) : 1;
          if (Math.abs(x - 25) < split) {
            if (y > 35 && y < 39 && Math.abs(x - 25) < 11) set(x, y, 3);
            if (y === 15 && x === 25) set(x, y, 5);
            continue;
          }
          set(x, y, x % 10 < 3 ? 3 : x % 10 < 7 ? 2 : 1);
          if ((x * 13 + y * 7) % 139 === 0) set(x, y, 5);
        }
    });
    stamp(img, add(p, 0, -8));
  }
  function areaRadius(s, fallback) {
    return s.area ? (s.area.feet / (s.grid.feet || 5)) * 16 : fallback;
  }
  function polygon(s) {
    return s.area ? k.outline(s.area, s.grid).map(p => k.P(Array.isArray(p) ? { x: p[0], y: p[1] } : p)) : [];
  }
  const flash = (e, t) =>
    t < 35 ? { color: '#fff0d4', alpha: 0.23 } : t < 75 ? { color: '#211327', alpha: 0.16 } : null;

  // Project Image: a silver thread throws a striped, hollow-looking double of the caster to the aimed point.
  FX.register('project-image', {
    palette: ILLUSION,
    travel: 280,
    beats: soft,
    end: () => 1390,
    ground(s) {
      if (!live(s, 1390)) return;
      sigil(add(center(s), 0, 15), ILLUSION, 14, s.c.t);
    },
    air(s) {
      if (!live(s, 1390)) return;
      const p = center(s),
        h = s.hits[0],
        H = k.P(s.pose.hand || aim(s));
      if (s.c.t < h.at) {
        const q = (s.c.t - C) / 280;
        const tip = { x: k.mix(H.x, p.x, q), y: k.mix(H.y, p.y, q) };
        stroke(H, tip, ILLUSION, 1, 4);
        diamond(tip, ILLUSION, 4);
      } else {
        if (s.c.t < 1050) stroke(H, p, ILLUSION, 1, 2);
        stamp(figure(ILLUSION, Math.floor(s.c.t / 85) % 5, true), p);
        impact(s, h, p, ILLUSION, 'projection', 24, 5);
        ring(add(p, 0, -19), 8, 3, ILLUSION, 4);
      }
    },
  });

  // Resurrection: a faceted diamond shatters as a golden soul rises from a prone echo into a standing halo.
  FX.register('resurrection', {
    palette: GOLD,
    travel: 450,
    beats: soft,
    end: () => 1780,
    ground(s) {
      if (!live(s, 1780)) return;
      const p = add(body(s), 0, 12);
      sigil(p, GOLD, 22, s.c.t);
      if (s.c.t < 750) {
        stroke(add(p, -13, -2), add(p, 10, -2), ASH, 5, 2);
        orb(add(p, -16, -2), 4, ASH, 3);
      }
    },
    air(s) {
      if (!live(s, 1780)) return;
      const p = body(s),
        h = s.hits[0];
      if (s.c.t < h.at) {
        diamond(add(p, 0, -15), GOLD, 7);
        for (let i = 0; i < 8; i++) {
          const a = (i * k.tau) / 8 - s.c.t / 250;
          pixel(add(p, Math.cos(a) * 19, Math.sin(a) * 10 + 9), GOLD, 4);
        }
      } else {
        const q = k.ease(k.clamp((s.c.t - h.at) / 380));
        const soul = add(p, 0, 14 * (1 - q) - 4);
        stamp(figure(GOLD, 0, true), soul);
        ring(add(soul, 0, -20), 11, 4, GOLD, 4);
        impact(s, h, add(p, 0, -11), GOLD, 'resurrection', 40, 12);
        sparks(s, p, GOLD, s.real(h), 16, 26, 34);
        if (s.c.t > 1400) ring(add(p, 0, 12), 24, 10, GOLD, 2, 8);
      }
    },
  });

  // Prismatic Spray: seven sharp red-to-violet rays fan across the exact cone, then splinter on contact.
  FX.register('prismatic-spray', {
    palette: ARCANE,
    travel: 180,
    beats: blast,
    end: () => 1160,
    flash,
    reach: (e, grid) => ({ r: ((e.area?.feet || 60) / (grid.feet || 5)) * 1.2 + 2, up: 3 }),
    ground(s) {
      if (!live(s, 1160)) return;
      const points = polygon(s),
        A = points[0] || k.P(s.pose.base || aim(s));
      const L = areaRadius(s, 192),
        dir = s.area?.dir ?? 0;
      const B =
        points[1] || add(A, Math.cos(dir) * L + (Math.sin(dir) * L) / 2, Math.sin(dir) * L - (Math.cos(dir) * L) / 2);
      const D =
        points[2] || add(A, Math.cos(dir) * L - (Math.sin(dir) * L) / 2, Math.sin(dir) * L + (Math.cos(dir) * L) / 2);
      const u = { x: (B.x + D.x) / 2 - A.x, y: (B.y + D.y) / 2 - A.y };
      const v = { x: D.x - B.x, y: D.y - B.y };
      const det = u.x * v.y - u.y * v.x;
      if (Math.abs(det) < 1) return;
      const phase = s.c.t < 560 ? 0 : s.c.t < 780 ? 1 : 2;
      const minX = Math.floor(Math.min(A.x, B.x, D.x)) - 2,
        minY = Math.floor(Math.min(A.y, B.y, D.y)) - 2;
      const w = Math.ceil(Math.max(A.x, B.x, D.x) - minX) + 3;
      const hh = Math.ceil(Math.max(A.y, B.y, D.y) - minY) + 3;
      for (let ray = 0; ray < 7; ray++) {
        const img = k.sprite(
          `b35:prism:${u.x.toFixed(1)}:${u.y.toFixed(1)}:${v.x.toFixed(1)}:${v.y.toFixed(1)}:${ray}:${phase}`,
          w,
          hh,
          RAYS[ray],
          set => {
            for (let y = 1; y < hh - 1; y++)
              for (let x = 1; x < w - 1; x++) {
                const dx = x + minX - A.x,
                  dy = y + minY - A.y;
                const along = (dx * v.y - dy * v.x) / det;
                const side = (u.x * dy - u.y * dx) / det;
                if (along <= 0 || along > 1) continue;
                const lane = (side / along + 0.5) * 7 - ray;
                if (lane < 0.08 || lane > 0.92) continue;
                if (phase === 2 && Math.floor(along * 18) % 3 !== ray % 3) continue;
                set(x, y, phase === 0 ? (lane > 0.35 && lane < 0.65 ? 5 : 3) : lane < 0.24 || lane > 0.76 ? 2 : 4);
              }
          },
        );
        if (s.c.t < 980) k.blit(img, minX, minY);
      }
    },
    air(s) {
      if (!live(s, 1160)) return;
      const p = k.P(s.pose.hand || s.pose.base || aim(s));
      if (s.c.t < 600) diamond(p, ARCANE, 6);
      s.hits.forEach((h, i) => {
        const ramp = RAYS[Math.floor(k.hash(i, seed(s), 7) * 7)];
        impact(s, h, hitPoint(s, h), ramp, `prism-${RAYS.indexOf(ramp)}`, 36, 9);
      });
    },
  });

  // Symbol: an inscribed crimson-violet ward snaps into an eight-point sigil and erupts in concentric curse waves.
  FX.register('symbol', {
    palette: RUNE,
    travel: 380,
    beats: blast,
    end: () => 1520,
    flash,
    ground(s) {
      if (!live(s, 1520)) return;
      const p = center(s),
        r = areaRadius(s, 32),
        h = s.hits[0];
      const glyph = k.sprite('b35:symbol-glyph', 55, 55, RUNE, set => {
        for (let y = -25; y <= 25; y++)
          for (let x = -25; x <= 25; x++) {
            const d = Math.hypot(x, y),
              box = Math.max(Math.abs(x), Math.abs(y));
            if (
              Math.abs(d - 23) < 0.7 ||
              Math.abs(Math.abs(x) + Math.abs(y) - 20) < 0.6 ||
              (box <= 14 && (Math.abs(x) === 14 || Math.abs(y) === 14)) ||
              (Math.abs(x) < 2 && Math.abs(y) < 10) ||
              (Math.abs(y + 3) < 2 && Math.abs(x) < 8)
            )
              set(x + 27, y + 27, d > 21 ? 2 : 4);
          }
      });
      stamp(glyph, p);
      const e = s.real(h);
      if (e >= 0 && e < 600) {
        ring(p, r * (0.2 + 0.8 * k.ease(e / 600)), r * (0.2 + 0.8 * k.ease(e / 600)), RUNE, e < 70 ? 5 : 3);
        if (e > 110) ring(p, r * k.ease((e - 110) / 600), r * k.ease((e - 110) / 600), ARCANE, 3, 8);
      }
    },
    air(s) {
      if (!live(s, 1520)) return;
      const h = s.hits[0],
        p = center(s);
      impact(s, h, p, RUNE, 'symbol-trigger', 46, 12);
      s.hits.forEach(hit => {
        if (hit.id != null) impact(s, hit, hitPoint(s, hit), ARCANE, 'symbol-curse', 28, 5);
      });
    },
  });

  // Simulacrum: snow and ice assemble a humanoid double; a ruby-red heart wakes beneath its frosted shell.
  FX.register('simulacrum', {
    palette: FROST,
    travel: 510,
    beats: soft,
    end: () => 1670,
    ground(s) {
      if (!live(s, 1670)) return;
      const p = add(center(s), 0, 15);
      ring(p, 17, 8, FROST, 3);
      for (let i = 0; i < 9; i++) {
        const a = (i * k.tau) / 9;
        orb(add(p, Math.cos(a) * 15, Math.sin(a) * 6), 2, FROST, 4);
      }
    },
    air(s) {
      if (!live(s, 1670)) return;
      const p = center(s),
        h = s.hits[0];
      if (s.c.t < h.at) {
        const q = (s.c.t - C) / 510;
        for (let i = 0; i < 18; i++) {
          const a = k.hash(i, seed(s), 1) * k.tau + q * 3;
          const d = 28 * (1 - q) + 4;
          pixel(add(p, Math.cos(a) * d, 13 - q * (i % 6) * 5 + Math.sin(a) * d * 0.35), FROST, i % 2 ? 3 : 4, 2);
        }
        if (q > 0.5) stamp(figure(FROST, 0, true), add(p, 0, 5));
      } else {
        stamp(figure(FROST), p);
        diamond(add(p, 0, -2), RAYS[0], 3);
        impact(s, h, p, FROST, 'simulacrum-awakens', 32, 12);
        if (s.c.t > 1100) {
          for (const side of [-1, 1]) pixel(add(p, side * 2, -11), FROST, 5);
        }
      }
    },
  });

  // Dream of the Blue Veil: sleeping soul echoes drift through a star-strewn blue curtain onto another world's horizon.
  FX.register('dream-of-the-blue-veil', {
    palette: BLUE,
    travel: 530,
    beats: soft,
    end: () => 1880,
    ground(s) {
      if (!live(s, 1880)) return;
      const { from, to } = portals(s);
      sigil(from, BLUE, 17, s.c.t);
      ring(add(to, 0, 11), 27, 12, BLUE, 4);
      blueVeil(s, to);
    },
    air(s) {
      if (!live(s, 1880)) return;
      const { from, to } = portals(s),
        h = s.hits[0];
      const q = k.clamp((s.c.t - C) / 1000);
      const soul = { x: k.mix(from.x, to.x, k.ease(q)), y: k.mix(from.y - 10, to.y - 10, k.ease(q)) };
      if (q < 0.95) {
        stamp(figure(ILLUSION, Math.floor(s.c.t / 100) % 5, true), soul);
        ring(add(soul, -6, -23), 4, 5, GOLD, 4, 2);
        pixel(add(soul, 4, -28), BLUE, 5);
      }
      impact(s, h, add(to, 0, -8), BLUE, 'blue-veil-crossing', 30, 8);
    },
  });

  // Temple of the Gods: golden foundations lift into marble columns, a triangular pediment, and a radiant altar.
  FX.register('temple-of-the-gods', {
    palette: GOLD,
    travel: 520,
    beats: soft,
    end: () => 1830,
    ground(s) {
      if (!live(s, 1830)) return;
      const p = center(s),
        phase = Math.min(3, Math.floor((s.c.t - C) / 175));
      const scale = s.area ? 1 : 0.6;
      const temple = k.sprite(
        `b35:temple:${phase}:${scale}`,
        Math.ceil(107 * scale),
        Math.ceil(101 * scale),
        GOLD,
        paint => {
          const set = (x, y, index) => paint(Math.round(x * scale), Math.round(y * scale), index);
          for (let y = 4; y < 97; y++)
            for (let x = 4; x < 103; x++) {
              const dx = Math.abs(x - 53);
              if (y >= 86 && y < 96 && dx < 46 + Math.floor((y - 86) / 3)) set(x, y, y % 3 === 0 ? 4 : 2);
              if (phase < 1) continue;
              if (y > 44 && y < 86 && dx < 42) set(x, y, 1);
              const column = [17, 35, 71, 89].find(cx => Math.abs(x - cx) <= 4);
              if (column != null && y > 43 + (3 - phase) * 11 && y < 86) set(x, y, x <= column ? 4 : 3);
              if (phase >= 2 && y > 37 && y < 45 && dx < 44) set(x, y, y < 40 ? 4 : 2);
              if (phase >= 3 && y > 8 && y <= 37 && dx < (y - 8) * 1.6) set(x, y, y > 33 ? 4 : 2);
              if (phase >= 3 && y > 57 && y < 79 && dx < 10) set(x, y, y < 62 ? 4 : 3);
              if (phase >= 3 && ((dx < 2 && y > 15 && y < 30) || (Math.abs(y - 21) < 2 && dx < 7))) set(x, y, 5);
            }
        },
      );
      stamp(temple, add(p, 0, s.area ? -21 : -5));
      sigil(add(p, 0, s.area ? 24 : 17), GOLD, 43 * scale, s.c.t);
    },
    air(s) {
      if (!live(s, 1830)) return;
      const p = center(s),
        h = s.hits[0];
      impact(s, h, add(p, 0, s.area ? -27 : -13), GOLD, 'temple-consecration', 38, 10);
      if (s.c.t >= h.at && s.c.t < 1390) {
        diamond(add(p, 0, s.area ? -46 : -25), GOLD, 5);
        sparks(s, add(p, 0, s.area ? -20 : -4), GOLD, s.real(h), 14, s.area ? 42 : 20, s.area ? 30 : 14);
      }
    },
  });

  // Whirlwind: a tight gray-white funnel twists above the cylinder footprint, lifting dirt and battering targets with flying rubble.
  FX.register('whirlwind', {
    palette: WIND,
    travel: 260,
    beats: blast,
    end: () => 1640,
    reach: (e, grid) => ({ r: (e.area?.feet || 10) / (grid.feet || 5) + 2, up: 7 }),
    ground(s) {
      if (!live(s, 1640)) return;
      const p = center(s),
        r = areaRadius(s, 32),
        t = s.c.t - C;
      const phase = Math.floor(t / 65) % 8;
      const settle = s.c.t > 1240;
      const img = k.sprite(`b35:funnel:${Math.round(r)}:${phase}:${settle}`, Math.ceil(r * 2 + 13), 113, WIND, set => {
        const cx = Math.ceil(r + 6),
          cy = 103;
        for (let y = 5; y <= cy; y++) {
          const up = (cy - y) / 98;
          if (settle && up > 0.3) continue;
          const rr = (0.14 + up * 0.86) * r;
          const sway = Math.sin(up * 7 + (phase * k.tau) / 8) * r * 0.08;
          const band = Math.floor((y + phase * 3) / 9) % 3;
          for (let x = -Math.ceil(rr); x <= rr; x++) {
            const d = Math.abs(x / rr);
            if (d > 1 || (settle && Math.abs(x) < rr * 0.5)) continue;
            set(cx + x + sway, y, d > 0.86 ? 1 : band === 0 ? 4 : x < 0 ? 3 : 2);
          }
        }
      });
      k.blit(img, p.x - Math.ceil(r + 6), p.y - 103);
      ring(p, r, r, WIND, 3, 8, t / 80);
    },
    air(s) {
      if (!live(s, 1640)) return;
      const p = center(s),
        r = areaRadius(s, 32),
        e = s.real(s.hits[0]);
      if (e >= 0 && e < 950)
        for (let i = 0; i < 12; i++) {
          const q = ((e + i * 71) % 950) / 950;
          const a = q * 11 + k.hash(i, seed(s), 2) * k.tau;
          pixel(add(p, Math.cos(a) * r * (0.4 + q * 0.6), -q * 87 + Math.sin(a) * 8), i % 3 ? WIND : ASH, 3, 2);
        }
      s.hits.forEach(h => impact(s, h, hitPoint(s, h), WIND, 'whirlwind-buffet', 34, 8));
    },
  });

  // Fire Storm: adjoining ten-foot squares ignite in a snapped lattice of flame, then cool into black ash and embers.
  FX.register('fire-storm', {
    palette: FIRE,
    travel: 230,
    beats: blast,
    end: () => 1650,
    flash,
    ground(s) {
      if (!live(s, 1650)) return;
      const h = s.hits[0],
        points = polygon(s),
        step = s.area ? (10 / (s.grid.feet || 5)) * 16 : 14;
      const p = center(s),
        tile = Math.max(8, Math.round(step));
      const a = points[0] || add(p, -step * 2.5, -step);
      const along = points.length >= 4 ? { x: points[1].x - a.x, y: points[1].y - a.y } : { x: step * 5, y: 0 };
      const side = points.length >= 4 ? { x: points[3].x - a.x, y: points[3].y - a.y } : { x: 0, y: step * 2 };
      const nx = Math.max(1, Math.ceil(Math.hypot(along.x, along.y) / step));
      const ny = Math.max(1, Math.ceil(Math.hypot(side.x, side.y) / step));
      const total = Math.min(10, nx * ny);
      const e = s.real(h),
        frame = e < 0 ? -1 : Math.min(5, Math.floor(e / 150));
      for (let i = 0; i < total; i++) {
        const col = i % nx,
          row = Math.floor(i / nx);
        const q = add(
          a,
          (along.x * (col + 0.5)) / nx + (side.x * (row + 0.5)) / ny,
          (along.y * (col + 0.5)) / nx + (side.y * (row + 0.5)) / ny,
        );
        const img = k.sprite(
          `b35:firestorm:${tile}:${frame}:${i % 3}`,
          tile + 7,
          tile * 2 + 7,
          frame >= 4 ? ASH : FIRE,
          set => {
            const cx = (tile + 7) / 2,
              floor = tile * 1.5 + 2;
            for (let y = 2; y < tile * 2 + 4; y++)
              for (let x = 2; x < tile + 5; x++) {
                const dx = Math.abs(x - cx),
                  dy = y - floor;
                if (frame < 0) {
                  if (dx < tile / 2 && Math.abs(dy) < tile / 2 && (dx > tile / 2 - 2 || Math.abs(dy) > tile / 2 - 2))
                    set(x, y, 2);
                  continue;
                }
                if (frame >= 4) {
                  if (dx + Math.abs(dy) * 0.4 < tile * 0.46 && Math.abs(dy) < tile * 0.28)
                    set(x, y, (x + y) % 9 === 0 ? 3 : frame === 4 ? 2 : 1);
                  if (frame === 4 && Math.hypot((x - cx) / (tile * 0.3), (dy + tile * 0.6) / (tile * 0.38)) < 1)
                    set(x, y, x < cx ? 3 : 2);
                  continue;
                }
                const crest = -tile * (0.6 + 0.35 * Math.sin((x + (i % 3) * 7) * 0.5 + frame));
                if (dx < tile * 0.44 && dy > crest && dy < tile * 0.4) {
                  const heat = (dy - crest) / (tile * 1.4);
                  set(x, y, frame === 0 ? 5 : dx > tile * 0.35 ? 1 : heat > 0.65 ? 5 : heat > 0.35 ? 4 : 3);
                }
              }
          },
        );
        k.blit(img, q.x - img.width / 2, q.y - (tile * 1.5 + 2));
      }
    },
    air(s) {
      if (!live(s, 1650)) return;
      s.hits.forEach(h => {
        const p = hitPoint(s, h);
        impact(s, h, p, FIRE, 'firestorm-burn', 38, 11);
        sparks(s, p, FIRE, s.real(h) - 210, 9, 22, 30);
      });
    },
  });

  // Draconic Transformation: spectral bronze wings snap from the shoulders; horned eyes and a force-breath spark crown the caster.
  FX.register('draconic-transformation', {
    palette: DRAGON,
    travel: 280,
    beats: soft,
    end: () => 1470,
    ground(s) {
      if (!live(s, 1470)) return;
      const p = s.targets[0] ? feet(s.targets[0]) : base(s);
      sigil(p, DRAGON, 19, s.c.t);
      if (s.c.t >= 580) {
        const shadow = k.sprite('b35:dragon-shadow', 79, 29, DRAGON, set => {
          for (let y = 2; y < 27; y++)
            for (let x = 2; x < 77; x++) {
              const dx = Math.abs(x - 39);
              if (dx < 35 && y > 4 + dx / 3 && y < 24 - dx / 8 && (x + y) % 5 !== 0) set(x, y, 1);
            }
        });
        stamp(shadow, p);
      }
    },
    air(s) {
      if (!live(s, 1470)) return;
      const p = s.targets[0] ? body(s) : add(base(s), 0, -14),
        h = s.hits[0];
      if (s.c.t >= h.at) {
        const phase = Math.floor(s.c.t / 160) % 2;
        const wings = k.sprite(`b35:dragon-wings:${phase}`, 83, 51, DRAGON, set => {
          for (let y = 2; y < 48; y++)
            for (let x = 2; x < 81; x++) {
              const dx = Math.abs(x - 41),
                top = 5 + (37 - dx) * 0.32 + phase * dx * 0.07;
              const bottom = 32 - dx * 0.2 - (Math.floor(dx / 8) % 2) * 4;
              if (dx >= 6 && dx <= 37 && y > top && y < bottom) set(x, y, y < top + 3 ? 4 : dx % 9 < 2 ? 3 : 2);
              if (dx > 6 && dx < 12 && y > 32 - dx && y < 41 - dx) set(x, y, 4);
            }
        });
        stamp(wings, add(p, 0, -4));
        for (const side of [-1, 1]) {
          stroke(add(p, side * 4, -11), add(p, side * 7, -19), DRAGON, 2, 4);
          pixel(add(p, side * 3, -7), GOLD, 5, 2);
        }
        orb(add(p, 0, 2), 3, ARCANE, 4);
        impact(s, h, p, DRAGON, 'dragon-wings', 36, 10);
      } else {
        diamond(p, DRAGON, 5);
      }
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
