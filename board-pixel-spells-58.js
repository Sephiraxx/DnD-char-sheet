/* Pixel spells, batch 58: high-level words, transformations and force boundaries. */
(function (root) {
  'use strict';
  const FX = root.BoardPixelFX;
  if (!FX) return;
  const k = FX.kit;
  const GOLD = ['#30200d', '#805017', '#c99732', '#ffe077', '#fff7c9', '#ffffff'];
  const GREEN = ['#10271d', '#226847', '#42ad70', '#8effa3', '#ddffe0', '#ffffff'];
  const VIOLET = ['#261736', '#563372', '#9361bc', '#d4a6ff', '#f3e2ff', '#ffffff'];
  const FORCE = ['#152939', '#356783', '#65a9d4', '#a4e3ff', '#e2f8ff', '#ffffff'];
  const LINK = ['#351525', '#8b253d', '#e54b65', '#ffbe72', '#ffe8b5', '#ffffff'];
  const NULL = ['#202831', '#4f5d68', '#85939c', '#bdccd2', '#e9f2f2', '#ffffff'];
  const LAND = ['#253341', '#477879', '#65b5ad', '#aedfc1', '#f1d795', '#fff4ce'];
  const DRY = ['#302319', '#62452e', '#a47548', '#d4a46a', '#f4d79c', '#fff2cb'];
  const WATER = ['#112c42', '#246a99', '#39ace1', '#84e3ff', '#d6faff', '#ffffff'];

  const elapsed = s => s.c.t - k.CAST;
  const life = (t, hold, end) => 1 - k.clamp((t - hold) / (end - hold));
  const caster = s => k.P(s.pose.base || s.pose.hand || s.pose.target || { x: 0, y: 0 });
  const bodies = s => (s.targets.length ? s.targets : [s.pose.target || s.pose.base].filter(Boolean));
  const feet = t => k.P({ x: t.baseX ?? t.x, y: t.baseY ?? t.y });
  const beats = (event, kit, travel, stop = 85, kind = 'soft') =>
    (event.targets?.length ? event.targets : [null]).map(target => ({
      at: kit.CAST + travel,
      stop,
      target,
      kind,
      power: kind === 'soft' ? 0.03 : 0.075,
    }));
  const flash = (event, e) =>
    e >= 0 && e < 40 ? { color: '#fff7da', alpha: 0.2 } : e >= 40 && e < 80 ? { color: '#261a30', alpha: 0.1 } : null;
  const reach = (event, grid) => ({ r: (event.area?.feet || 25) / (grid.feet || 5) + 2, up: 5 });

  // Raster strokes are shared by cached glyphs, terrain and the cage. No canvas paths.
  function pen(set) {
    const rect = (x, y, w, h, c) => {
      for (let yy = Math.round(y); yy < Math.round(y + h); yy++)
        for (let xx = Math.round(x); xx < Math.round(x + w); xx++) set(xx, yy, c);
    };
    const line = (x, y, X, Y, c, w = 2) => {
      const n = Math.max(1, Math.ceil(Math.hypot(X - x, Y - y)));
      for (let j = 0; j <= n; j++) rect(k.mix(x, X, j / n) - w / 2, k.mix(y, Y, j / n) - w / 2, w, w, c);
    };
    return { rect, line };
  }
  function stroke(a, b, p, w = 3, index = 4) {
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 2));
    for (const [color, size] of [
      [p[0], w + 2],
      [p[index], w],
    ])
      for (let i = 0; i <= n; i++) k.dot(k.mix(a.x, b.x, i / n), k.mix(a.y, b.y, i / n), color, size);
  }
  function ring(at, rx, ry, p, alpha = 1, width = 2) {
    rx = Math.max(2, Math.round(rx));
    ry = Math.max(2, Math.round(ry));
    const pad = width + 2,
      w = 2 * (rx + pad) + 1,
      h = 2 * (ry + pad) + 1;
    const img = k.sprite(`58:ring:${p[3]}:${rx}:${ry}:${width}`, w, h, p, set => {
      for (let y = 1; y < h - 1; y++)
        for (let x = 1; x < w - 1; x++) {
          const d = Math.hypot((x - (w - 1) / 2) / rx, (y - (h - 1) / 2) / ry);
          if (Math.abs(d - 1) * Math.min(rx, ry) < width / 2) set(x, y, y < h / 2 ? 4 : 3);
        }
    });
    k.blit(img, at.x - (w - 1) / 2, at.y - (h - 1) / 2, alpha);
  }
  function glyph(name, p) {
    return k.sprite(`58:glyph:${name}:${p[3]}`, 40, 40, p, set => {
      const { rect, line } = pen(set);
      if (name === 'word') {
        line(20, 3, 7, 16, 3, 3);
        line(7, 16, 20, 33, 4, 3);
        line(20, 33, 33, 16, 3, 3);
        line(33, 16, 20, 3, 4, 3);
        line(20, 7, 20, 29, 5, 3);
        line(11, 14, 29, 14, 5, 3);
        line(13, 23, 27, 23, 4, 3);
        rect(17, 0, 6, 3, 4);
      } else if (name === 'glass') {
        rect(9, 5, 22, 4, 4);
        rect(9, 30, 22, 4, 4);
        line(12, 10, 27, 29, 3, 3);
        line(28, 10, 13, 29, 4, 3);
        for (let y = 11; y <= 16; y++) rect(15 + (y - 11) / 2, y, 10 - (y - 11), 1, 5);
        for (let y = 25; y <= 29; y++) rect(20 - (y - 24), y, 2 * (y - 24), 1, 4);
      } else if (name === 'bubble') {
        rect(4, 5, 31, 22, 3);
        rect(7, 2, 25, 28, 3);
        rect(7, 5, 25, 19, 4);
        rect(7, 5, 25, 3, 5);
        for (let y = 26; y < 35; y++) rect(9, y, 15 - (y - 25), 1, 3);
        line(11, 12, 27, 12, 1, 2);
        line(11, 18, 22, 18, 1, 2);
        rect(28, 17, 3, 3, 5);
        rect(24, 11, 3, 3, 5);
      } else if (name === 'repel' || name === 'attract') {
        const inward = name === 'attract';
        rect(18, 17, 5, 7, 5);
        for (const side of [-1, 1]) {
          const tail = 20 + side * (inward ? 17 : 7),
            tip = 20 + side * (inward ? 7 : 17);
          line(tail, 20, tip, 20, 4, 3);
          line(tip - side * (inward ? -5 : 5), 14, tip, 20, 5, 3);
          line(tip - side * (inward ? -5 : 5), 26, tip, 20, 5, 3);
        }
      }
    });
  }
  function icon(name, at, p, alpha = 1) {
    k.blit(glyph(name, p), at.x - 20, at.y - 20, alpha);
  }
  function spark(at, p, size = 3) {
    k.dot(at.x, at.y, p[0], size + 4);
    k.dot(at.x, at.y, p[4], size + 2);
    k.dot(at.x - size, at.y, p[0], 3);
    k.dot(at.x + size, at.y, p[0], 3);
    k.dot(at.x - size, at.y, p[4], 1);
    k.dot(at.x + size, at.y, p[5], 1);
    k.dot(at.x, at.y, p[5], size);
  }
  function impact(s, at, p, key, size = 30, i = 0) {
    const hit = s.hits[i] || s.hits[0];
    if (!hit) return;
    const e = s.real(hit);
    k.drawHit(k.hitStyle(`58:${key}`, p, { S: size, spikes: 6, jag: 0.2 }), at, e);
    k.shards(at, e, p, (s.event.seed || 0) + i * 13, 7, size * 0.7);
  }
  function polygon(s) {
    const points = s.area ? k.outline(s.area, s.grid) : [];
    if (points.length >= 3) return points.map(p => k.P({ x: p[0], y: p[1] }));
    const c = k.P(s.pose.target || s.targets[0] || s.pose.base || { x: 0, y: 0 });
    return [
      { x: c.x - 40, y: c.y - 28 },
      { x: c.x + 40, y: c.y - 28 },
      { x: c.x + 40, y: c.y + 28 },
      { x: c.x - 40, y: c.y + 28 },
    ];
  }
  function geometry(s) {
    const points = polygon(s),
      x = Math.floor(Math.min(...points.map(p => p.x))) - 4,
      y = Math.floor(Math.min(...points.map(p => p.y))) - 4;
    const w = Math.ceil(Math.max(...points.map(p => p.x)) - x) + 5,
      h = Math.ceil(Math.max(...points.map(p => p.y)) - y) + 5;
    const local = points.map(p => ({ x: Math.round(p.x - x), y: Math.round(p.y - y) }));
    return { points, local, x, y, w, h, cx: x + w / 2, cy: y + h / 2, key: local.map(p => `${p.x},${p.y}`).join(':') };
  }
  function inside(x, y, poly) {
    let yes = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i],
        b = poly[j];
      if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) yes = !yes;
    }
    return yes;
  }
  function terrain(s, type, alpha = 1) {
    const g = geometry(s),
      p = type === 'mirage' ? LAND : type === 'dry' ? DRY : VIOLET;
    const seed = (s.event.seed || 0) % 4;
    const img = k.sprite(`58:terrain:${type}:${g.key}:${seed}`, g.w, g.h, p, set => {
      const { line } = pen(set);
      for (let y = 3; y < g.h - 3; y++)
        for (let x = 3; x < g.w - 3; x++) {
          if (!inside(x, y, g.local)) continue;
          const edge =
            !inside(x - 3, y, g.local) ||
            !inside(x + 3, y, g.local) ||
            !inside(x, y - 3, g.local) ||
            !inside(x, y + 3, g.local);
          if (edge && k.dith(x, y) > 0.62) continue;
          if (type === 'mirage') {
            const river = Math.abs(x - g.w * 0.48 - Math.sin(y / 17 + seed) * g.w * 0.2);
            set(
              x,
              y,
              river < g.w * 0.1
                ? y % 12 < 3
                  ? 3
                  : 2
                : 3 + (Math.floor(y / 10 + Math.sin(x / 19) * 2) % 3 === 0 ? 2 : 1),
            );
          } else if (type === 'dry') set(x, y, 2 + ((Math.floor(x / 11) + Math.floor(y / 9)) % 2));
          else if ((x + y) % 8 < 4) set(x, y, 2);
        }
      if (type === 'dry') {
        for (let i = 0; i < 20; i++) {
          const x = 8 + k.hash(i, seed) * (g.w - 16),
            y = 8 + k.hash(i, seed, 1) * (g.h - 16);
          for (const [dx, dy] of [
            [8, -5],
            [-6, 9],
            [10, 8],
          ]) {
            if (inside(x, y, g.local) && inside(x + dx, y + dy, g.local)) {
              line(x, y, x + dx, y + dy, 1, 3);
              line(x, y - 1, x + dx, y + dy - 1, 4, 1);
            }
          }
        }
      }
      for (let i = 0; i < g.local.length; i++) {
        const a = g.local[i],
          b = g.local[(i + 1) % g.local.length];
        line(a.x, a.y, b.x, b.y, type === 'dry' ? 3 : 4, 2);
      }
    });
    k.blit(img, g.x, g.y, alpha);
    return g;
  }

  // Divine Word: a monumental gold-white word-rune erupts from the caster with solar rays and a shock ring.
  FX.register('divine-word', {
    palette: GOLD,
    travel: 140,
    beats: (e, kit, t) => beats(e, kit, t, 150, 'blast'),
    end: () => 1330,
    flash,
    ground(s) {
      const t = elapsed(s);
      if (t < 0) return;
      const C = caster(s),
        q = k.clamp((t - 140) / 520);
      ring(C, 12 + 40 * k.ease(q), 7 + 22 * k.ease(q), GOLD, life(t, 470, 900), 3);
    },
    air(s) {
      const t = elapsed(s);
      if (t < 0) return;
      const C = caster(s),
        R = { x: C.x, y: C.y - 16 };
      if (t < 650) {
        const q = k.clamp(t / 140),
          length = t < 140 ? 8 + q * 9 : 26;
        for (let i = 0; i < 8; i++) {
          const a = (i * k.tau) / 8;
          stroke(
            { x: R.x + Math.cos(a) * 19, y: R.y + Math.sin(a) * 13 },
            { x: R.x + Math.cos(a) * (19 + length), y: R.y + Math.sin(a) * (13 + length * 0.6) },
            GOLD,
            3,
            i % 2 ? 3 : 5,
          );
        }
      }
      icon('word', R, GOLD, life(t, 620, 850));
      impact(s, R, GOLD, 'word', 48);
      if (t > 650) ring(C, 12, 6, GOLD, life(t, 820, 1030));
    },
  });

  // Mirage Arcane: a sweeping shimmer replaces the whole footprint with sandbanks and a bright turquoise river.
  FX.register('mirage-arcane', {
    palette: LAND,
    travel: 260,
    beats: (e, kit, t) => beats(e, kit, t, 95),
    end: () => 1650,
    reach,
    ground(s) {
      const t = elapsed(s);
      if (t < 0) return;
      const g = terrain(s, 'mirage', t < 260 ? 0.5 : life(t, 1030, 1350));
      if (t < 720) {
        const y = g.y + 5 + (g.h - 10) * k.clamp(t / 650);
        // Clip the sweeping front to the actual area, including rotated templates.
        for (let x = g.x + 5; x < g.x + g.w - 5; x += 4)
          if (inside(x - g.x, y - g.y, g.local)) {
            k.dot(x, y, VIOLET[0], 6);
            k.dot(x, y, VIOLET[4], 4);
          }
      }
    },
    air(s) {
      const t = elapsed(s);
      if (t < 260 || t > 900) return;
      const g = geometry(s);
      g.points.forEach((p, i) => {
        const e = s.real(s.hits[0]);
        k.shards(p, e, VIOLET, (s.event.seed || 0) + i, 4, 14);
      });
      impact(s, { x: g.cx, y: g.cy }, VIOLET, 'mirage', 38);
    },
  });

  function cage(s, air, alpha, drop = 0) {
    const g = geometry(s),
      lift = 32;
    const img = k.sprite(`58:cage:${air}:${g.key}`, g.w, g.h + lift + 4, FORCE, set => {
      const { line } = pen(set);
      const points = g.local.map(p => ({ x: p.x, y: p.y + lift }));
      for (let i = 0; i < points.length; i++) {
        const a = points[i],
          b = points[(i + 1) % points.length];
        const front = (a.y + b.y) / 2 >= g.h / 2 + lift;
        if (front !== air) continue;
        // A translucent face is dithered, with plenty of open space between the bars.
        const n = Math.max(2, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 11));
        for (let j = 0; j <= n; j++) {
          const x = k.mix(a.x, b.x, j / n),
            y = k.mix(a.y, b.y, j / n);
          line(x, y, x, y - lift, 3, 3);
          line(x - 1, y - 1, x - 1, y - lift + 1, 5, 1);
        }
        line(a.x, a.y, b.x, b.y, 4, 3);
        line(a.x, a.y - lift, b.x, b.y - lift, 4, 3);
        line(a.x, a.y - lift - 1, b.x, b.y - lift - 1, 5, 1);
        for (let j = 1; j < n; j++) {
          const x = k.mix(a.x, b.x, j / n) + 4,
            y = k.mix(a.y, b.y, j / n) - 12;
          set(x, y, 3);
          set(x + 1, y + 1, 3);
        }
      }
      if (!air)
        for (let i = 0; i < points.length; i++) {
          const a = points[i],
            b = points[(i + 1) % points.length];
          line(a.x, a.y - lift, b.x, b.y - lift, 4, 3);
        }
      if (!air && points.length === 4) {
        // Roof crossbars make the enclosure read as a volume, rather than two fences.
        for (let i = 1; i < 6; i++) {
          const q = i / 6,
            a = points[0],
            b = points[1],
            c = points[3],
            d = points[2];
          line(k.mix(a.x, b.x, q), k.mix(a.y, b.y, q) - lift, k.mix(c.x, d.x, q), k.mix(c.y, d.y, q) - lift, 3, 2);
        }
      }
    });
    k.blit(img, g.x, g.y - lift - drop, alpha);
  }

  // Forcecage: white-highlighted pale-blue prison bars slam down; the front bars remain above the figures.
  FX.register('forcecage', {
    palette: FORCE,
    travel: 220,
    beats: (e, kit, t) => beats(e, kit, t, 140, 'hit'),
    end: () => 1320,
    reach,
    ground(s) {
      const t = elapsed(s);
      if (t < 0 || (s.pose.linger > 0 && t >= 220)) return;
      cage(s, false, 0.8, 30 * (1 - k.ease(k.clamp(t / 220))));
    },
    air(s) {
      const t = elapsed(s);
      if (t < 0) return;
      if (!(s.pose.linger > 0 && t >= 220)) cage(s, true, 0.8, 30 * (1 - k.ease(k.clamp(t / 220))));
      if (t >= 220) geometry(s).points.forEach(p => impact(s, p, FORCE, 'cage', 24));
    },
    linger(s) {
      cage(s, false, 0.75 * s.linger);
    },
    lingerAir(s) {
      cage(s, true, 0.75 * s.linger);
    },
  });

  // Sequester: a soft, banded violet cocoon closes around the creature and seals with a large hourglass.
  FX.register('sequester', {
    palette: VIOLET,
    travel: 280,
    beats: (e, kit, t) => beats(e, kit, t, 105),
    end: () => 1540,
    ground(s) {
      const t = elapsed(s);
      if (t < 0) return;
      bodies(s).forEach(tar => ring(feet(tar), 17, 8, VIOLET, life(t, 950, 1240)));
    },
    air(s) {
      const t = elapsed(s);
      if (t < 0) return;
      const q = k.ease(k.clamp(t / 280));
      bodies(s).forEach((tar, i) => {
        const B = feet(tar),
          C = { x: B.x, y: B.y - 16 };
        const img = k.sprite('58:cocoon', 40, 52, VIOLET, set => {
          for (let y = 2; y < 50; y++)
            for (let x = 2; x < 38; x++) {
              const d = Math.hypot((x - 20) / 17, (y - 26) / 23);
              if (d > 1) continue;
              if (d > 0.85) set(x, y, x < 19 ? 4 : 3);
              else if (d > 0.68 && k.dith(x, y) < 0.5) set(x, y, 3);
              else if ((y + Math.floor(x / 4)) % 13 < 2) set(x, y, 2);
            }
        });
        k.blit(img, C.x - 20, C.y - 26, (0.5 + q * 0.25) * life(t, 850, 1200));
        if (t >= 280) icon('glass', C, VIOLET, life(t, 900, 1210));
        impact(s, C, VIOLET, 'sequester', 30, i);
      });
    },
  });

  function column(at, width, height, alpha) {
    const img = k.sprite(`58:teleport:${width}:${height}`, width + 8, height + 8, VIOLET, set => {
      for (let y = 4; y < height + 4; y++)
        for (let x = 4; x < width + 4; x++) {
          const d = Math.abs(x - 4 - width / 2) / (width / 2);
          set(x, y, d > 0.8 ? 3 : d > 0.5 ? 4 : 5);
        }
    });
    k.blit(img, at.x - width / 2 - 4, at.y - height - 4, alpha);
  }

  // Teleport: wide violet-white columns engulf every traveller, burst into stars and pinch shut to an empty ring.
  FX.register('teleport', {
    palette: VIOLET,
    travel: 260,
    beats: (e, kit, t) => beats(e, kit, t, 120),
    end: () => 1370,
    flash,
    ground(s) {
      const t = elapsed(s);
      if (t < 0) return;
      bodies(s).forEach(tar =>
        ring(feet(tar), t < 630 ? 18 : 18 * life(t, 630, 950), 7, VIOLET, life(t, 820, 1070), 3),
      );
    },
    air(s) {
      const t = elapsed(s);
      if (t < 0) return;
      bodies(s).forEach((tar, i) => {
        const B = feet(tar),
          q = k.clamp(t / 180),
          closing = k.clamp((t - 560) / 170);
        if (t < 730) column(B, Math.max(3, Math.round(25 * (1 - closing))), Math.round(12 + q * 34), 1);
        impact(s, { x: B.x, y: B.y - 17 }, VIOLET, 'teleport', 42, i);
        const e = s.real(s.hits[i] || s.hits[0]);
        if (e >= 0 && e < 650)
          for (let j = 0; j < 6; j++) {
            const a = k.hash(j, s.event.seed || 0, i) * k.tau,
              r = 12 + k.ease(k.clamp(e / 600)) * 17;
            spark({ x: B.x + Math.cos(a) * r, y: B.y - 15 + Math.sin(a) * r * 0.6 - e / 70 }, VIOLET, 1);
          }
      });
    },
  });

  function heart(at, alpha) {
    const img = k.sprite('58:heart', 15, 14, LINK, set => {
      const { rect } = pen(set);
      rect(2, 2, 4, 5, 2);
      rect(8, 2, 4, 5, 2);
      rect(3, 4, 8, 5, 2);
      for (let y = 7; y < 12; y++) rect(3 + (y - 7), y, 9 - (y - 7) * 2, 1, 3);
      rect(3, 3, 2, 2, 5);
      rect(9, 3, 2, 2, 4);
    });
    k.blit(img, at.x - 7, at.y - 6, alpha);
  }

  // Tether Essence: a thick crimson cord with a gold core snaps between two bodies, pumping large hearts along it.
  FX.register('tether-essence', {
    palette: LINK,
    travel: 220,
    beats: (e, kit, t) => beats(e, kit, t, 100),
    end: () => 1630,
    ground(s) {
      const t = elapsed(s);
      if (t < 0) return;
      bodies(s)
        .slice(0, 2)
        .forEach(tar => ring(feet(tar), 12, 6, LINK, life(t, 970, 1320)));
    },
    air(s) {
      const t = elapsed(s);
      if (t < 0) return;
      const list = bodies(s),
        A = k.P(list[0] || s.pose.base),
        B = list.length > 1 ? k.P(list[1]) : caster(s);
      const q = k.ease(k.clamp(t / 220)),
        fade = life(t, 990, 1320);
      const n = Math.max(8, Math.ceil(Math.hypot(B.x - A.x, B.y - A.y) / 3));
      for (const [color, size] of [
        [LINK[0], 7],
        [LINK[2], 5],
        [LINK[4], 2],
      ])
        for (let j = 0; j <= n * q; j++) {
          const u = j / n,
            bow = Math.sin(u * Math.PI) * (5 + Math.sin(s.c.raw / 140) * 2);
          if (fade < 0.5 && j % 4 > 1) continue;
          k.dot(k.mix(A.x, B.x, u), k.mix(A.y, B.y, u) - bow, color, size);
        }
      if (t >= 220)
        for (let j = 0; j < 3; j++) {
          const u = (s.c.raw / 900 + j / 3) % 1;
          heart({ x: k.mix(A.x, B.x, u), y: k.mix(A.y, B.y, u) - Math.sin(u * Math.PI) * 6 }, fade);
        }
      impact(s, A, LINK, 'tether', 28);
      impact(s, B, LINK, 'tether', 28, 1);
    },
  });

  // Antipathy/Sympathy: a full violet aura carries opposed attraction and repulsion glyphs with travelling ripples.
  FX.register('antipathy-sympathy', {
    palette: VIOLET,
    travel: 240,
    beats: (e, kit, t) => beats(e, kit, t, 105),
    end: () => 1690,
    reach,
    ground(s) {
      const t = elapsed(s);
      if (t < 0) return;
      const g = terrain(s, 'aura', life(t, 1080, 1390));
      const rx = Math.max(16, g.w * 0.43),
        ry = Math.max(12, g.h * 0.4);
      if (t < 1120)
        for (let i = 0; i < 2; i++) {
          const q = (s.c.raw / 700 + i / 2) % 1;
          ring({ x: g.cx - g.w * 0.2, y: g.cy }, rx * (0.35 + q * 0.55), ry * (0.35 + q * 0.55), VIOLET, 0.75);
          ring({ x: g.cx + g.w * 0.2, y: g.cy }, rx * (0.9 - q * 0.55), ry * (0.9 - q * 0.55), GOLD, 0.75);
        }
    },
    air(s) {
      const t = elapsed(s);
      if (t < 0) return;
      const g = geometry(s),
        a = { x: g.cx - Math.max(18, g.w * 0.2), y: g.cy - 12 },
        b = { x: g.cx + Math.max(18, g.w * 0.2), y: g.cy - 12 };
      icon('repel', a, VIOLET, life(t, 1020, 1320));
      icon('attract', b, GOLD, life(t, 1020, 1320));
      impact(s, a, VIOLET, 'repel', 30);
      impact(s, b, GOLD, 'attract', 30);
    },
  });

  function nullSphere(s, alpha, forming = 1) {
    const C = s.area ? k.P(s.area) : caster(s),
      r = Math.max(8, Math.round(((s.area?.feet || 10) / (s.grid.feet || 5)) * 16));
    const img = k.sprite(`58:null:${r}`, 2 * r + 10, 2 * r + 10, NULL, set => {
      const c = r + 5;
      for (let y = 2; y < 2 * r + 8; y++)
        for (let x = 2; x < 2 * r + 8; x++) {
          const d = Math.hypot(x - c, y - c);
          if (Math.abs(d - r) < 1.8) set(x, y, y < c ? 5 : 3);
          else if (d < r && d > r - 7 && k.dith(x, y) < 0.25) set(x, y, 3);
          else if (d < r && (x + 2 * y) % 19 === 0) set(x, y, 1);
        }
    });
    k.blit(img, C.x - r - 5, C.y - r - 5, alpha * forming);
    ring(C, r, Math.round(r * 0.36), NULL, alpha, 2);
  }

  // Antimagic Field: an outlined grey-white dead-zone sphere snuffs coloured magic against its ten-foot rim.
  FX.register('antimagic-field', {
    palette: NULL,
    travel: 220,
    beats: (e, kit, t) => beats(e, kit, t, 85),
    end: () => 1430,
    reach,
    ground(s) {
      const t = elapsed(s);
      if (t < 0 || (s.pose.linger > 0 && t >= 220)) return;
      nullSphere(s, life(t, 850, 1130), t < 220 ? 0.75 : 1);
    },
    air(s) {
      const t = elapsed(s);
      if (t < 0) return;
      const C = s.area ? k.P(s.area) : caster(s),
        r = ((s.area?.feet || 10) / (s.grid.feet || 5)) * 16;
      for (let i = 0; i < 6; i++) {
        const a = k.hash(i, s.event.seed || 0) * k.tau,
          q = (s.c.raw / 620 + i / 6) % 1,
          rr = r + 13 * (1 - q),
          p = i % 2 ? VIOLET : WATER,
          at = { x: C.x + Math.cos(a) * rr, y: C.y + Math.sin(a) * rr };
        if (t > 900) continue;
        if (q < 0.75) {
          k.dot(at.x, at.y, p[0], 5);
          k.dot(at.x, at.y, p[4], 3);
        } else {
          k.dot(at.x - 2, at.y - 2, NULL[0], 4);
          k.dot(at.x - 2, at.y - 2, NULL[4], 2);
          k.dot(at.x + 3, at.y + 2, NULL[0], 3);
          k.dot(at.x + 3, at.y + 2, NULL[2], 1);
        }
      }
      // Quiet perimeter impact; the sphere itself stays underneath the figures.
      if (t >= 220)
        for (let i = 0; i < 4; i++) {
          const a = (i * k.tau) / 4;
          impact(s, { x: C.x + Math.cos(a) * r, y: C.y + Math.sin(a) * r }, NULL, 'null', 18);
        }
    },
    linger(s) {
      nullSphere(s, 0.75 * s.linger);
    },
  });

  function beast(form) {
    return k.sprite(`58:beast:${form}`, 42, 34, GREEN, set => {
      const { rect, line } = pen(set);
      rect(10, 12, 21, 13, 3);
      rect(7, 15, 28, 7, 3);
      rect(26, 5, 12, 12, 3);
      rect(35, 10, 5, 6, 3);
      rect(28, 2, 4, 7, 4);
      rect(34, 3, 3, 6, 3);
      rect(10, 22, 5, 9, 2);
      rect(26, 22, 5, 9, 2);
      if (form) {
        rect(6, 10, 17, 12, 3);
        rect(8, 7, 12, 8, 3);
      } else {
        line(10, 15, 3, 5, 3, 4);
        rect(18, 23, 3, 7, 2);
      }
      line(10, form ? 9 : 13, 28, 9, 3, 2);
      line(8, 15, 5, 8, 4, 2);
      line(11, 30, 15, 30, 4, 2);
      line(27, 30, 32, 30, 4, 2);
      rect(33, 8, 2, 2, 5);
      rect(37, 12, 2, 2, 3);
    });
  }

  // Animal Shapes: green-white transformation flashes resolve into large wolf and bear silhouettes on every target.
  FX.register('animal-shapes', {
    palette: GREEN,
    travel: 220,
    beats: (e, kit, t) => beats(e, kit, t, 115),
    end: () => 1600,
    ground(s) {
      const t = elapsed(s);
      if (t < 0) return;
      bodies(s).forEach(tar => ring(feet(tar), 20, 9, GREEN, life(t, 960, 1300), 3));
    },
    air(s) {
      const t = elapsed(s);
      if (t < 0) return;
      bodies(s).forEach((tar, i) => {
        const B = feet(tar);
        if (t < 220) {
          const q = k.ease(t / 220);
          ring({ x: B.x, y: B.y - q * 20 }, 17, 6, GREEN, 1, 3);
        } else k.blit(beast(i % 2), B.x - 21, B.y - 30, life(t, 920, 1270));
        impact(s, { x: B.x, y: B.y - 14 }, GREEN, 'animal', 44, i);
      });
    },
  });

  // Abi Dalzim's Horrid Wilting: thick blue moisture streams rip upward from every victim over a cracked, desiccated cube.
  FX.register('abi-dalzims-horrid-wilting', {
    palette: WATER,
    travel: 200,
    beats: (e, kit, t) => beats(e, kit, t, 180, 'blast'),
    end: () => 1690,
    flash,
    reach,
    ground(s) {
      const t = elapsed(s);
      if (t < 0) return;
      terrain(s, 'dry', t < 200 ? 0.5 : life(t, 1050, 1390));
    },
    air(s) {
      const t = elapsed(s);
      if (t < 0) return;
      bodies(s).forEach((tar, i) => {
        const C = k.P(tar),
          q = k.ease(k.clamp(t / 200)),
          fade = life(t, 820, 1140);
        // Cached stream frames keep three broad, white-edged jets cheap even with many creatures.
        const frame = Math.floor(s.c.raw / 70) % 6;
        const img = k.sprite(`58:drain:${frame}`, 50, 60, WATER, set => {
          const { rect } = pen(set);
          for (let j = 0; j < 3; j++)
            for (let y = 6; y <= 52; y++) {
              const u = (52 - y) / 46,
                x = 25 + (j - 1) * (5 + u * 12) + Math.sin(u * 6 + frame + j) * 3;
              rect(x - 2, y, 5, 2, 3);
              rect(x - 1, y, 2, 2, 5);
              if ((y + frame * 3) % 15 < 4) rect(x + 4, y, 3, 3, 4);
            }
        });
        k.blit(img, C.x - 25, C.y - 46 + (1 - q) * 20, fade);
        impact(s, C, WATER, 'wilting', 42, i);
        const e = s.real(s.hits[i] || s.hits[0]);
        k.shards({ x: C.x, y: C.y + 5 }, e, DRY, (s.event.seed || 0) + i * 17, 8, 25);
        if (e > 300 && e < 1000)
          for (let j = 0; j < 5; j++) {
            const u = (e - 300) / 700,
              x = C.x + (k.hash(j, s.event.seed || 0, i) - 0.5) * 34;
            k.dot(x, C.y - 15 - u * 24 + j * 3, DRY[0], 4);
            k.dot(x, C.y - 15 - u * 24 + j * 3, j % 2 ? DRY[3] : DRY[4], 2);
          }
      });
    },
  });

  // Glibness: a large golden speech bubble crowns the caster while bright word-bars and sparks spill from its mouth.
  FX.register('glibness', {
    palette: GOLD,
    travel: 160,
    beats: (e, kit, t) => [{ at: kit.CAST + t, stop: 85, target: e.caster ?? null, kind: 'soft', power: 0.03 }],
    end: () => 1410,
    ground(s) {
      const t = elapsed(s);
      if (t < 0) return;
      ring(caster(s), 14, 7, GOLD, life(t, 810, 1110));
    },
    air(s) {
      const t = elapsed(s);
      if (t < 0) return;
      const B = caster(s),
        C = { x: B.x, y: B.y - 22 };
      icon('bubble', { x: C.x, y: C.y + 7 * (1 - k.ease(k.clamp(t / 160))) }, GOLD, life(t, 800, 1090));
      impact(s, C, GOLD, 'glibness', 30);
      if (t > 160 && t < 950)
        for (let i = 0; i < 3; i++) {
          const q = (s.c.raw / 680 + i / 3) % 1,
            x = C.x + 17 + q * 15,
            y = C.y - 3 - q * 10;
          if (i === 1) spark({ x, y }, GOLD, 1);
          else stroke({ x, y }, { x: x + 5, y }, GOLD, 2, 4);
        }
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
