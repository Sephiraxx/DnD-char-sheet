/* Pixel spells, batch 27 (see docs/pixel-spells/BRIEF.md). */
(function (root) {
  'use strict';
  const FX = root.BoardPixelFX;
  if (!FX) return;
  const k = FX.kit;
  const GOLD = ['#291b12', '#795025', '#b88c36', '#edc75b', '#fff0b2', '#ffffff'];
  const NATURE = ['#10251b', '#28583d', '#51854d', '#91bd6c', '#d8efad', '#fffce3'];
  const FROST = ['#101d34', '#29527e', '#548bb8', '#99d9ed', '#dcf8ff', '#ffffff'];
  const STEEL = ['#171b28', '#3e4d64', '#788fa5', '#bad4df', '#edf6ed', '#ffffff'];
  const PLANE = ['#1a102c', '#402659', '#784c9f', '#bc8ee2', '#edcaff', '#ffffff'];
  const SICK = ['#192018', '#3e4f28', '#72863a', '#b6c95b', '#e8edaa', '#ffffe5'];
  const WIND = ['#172831', '#36505a', '#688d95', '#acd2ce', '#e3f6df', '#ffffff'];
  const WOOD = ['#241724', '#50312e', '#8c573b', '#bf8b57', '#ebce8e', '#fff4d1'];
  const DEAD = ['#171423', '#34334c', '#577c71', '#90c5a1', '#d9e9b9', '#fffbe3'];
  const FIRE = ['#2a0d0c', '#6e1a12', '#b8321a', '#ec6a1c', '#ffb53a', '#fff1b4'];
  const WATER = ['#101e33', '#214b73', '#377da1', '#6fc8d3', '#c9f2e7', '#ffffff'];
  const EARTH = ['#221d19', '#4d4138', '#7c6950', '#ad9569', '#e1cea0', '#fff2ce'];
  const C = k.CAST;
  const seed = s => s.event.seed || 0;
  const local = s => s.c.t - C;
  const active = (s, end) => s.c.t >= C && s.c.t < end;
  const caster = s => k.P(s.pose.base || s.pose.hand || s.pose.target || { x: 0, y: 0 });
  const centre = s => k.P(s.area || s.pose.target || s.targets[0] || s.pose.base || { x: 0, y: 0 });
  const radius = (s, feet) => ((s.area?.feet || feet) / (s.grid.feet || 5)) * 16;
  const targetOf = (s, h) => s.targets.find(t => t.id === h.id) || s.targets[0];
  function summonCentre(s) {
    const p = centre(s);
    // Keep the new silhouette beside a selected token, inside its existing buffer bounds.
    if (s.targets.some(t => t.id != null && Math.hypot(k.P(t).x - p.x, k.P(t).y - p.y) < 8)) p.x += 14;
    return p;
  }
  const beat = (at, stop, target = null, kind = 'soft', power = 0.04) => ({ at, stop, target, kind, power });
  const group = (event, at, stop, kind = 'soft', max = Infinity) =>
    (event.targets?.length ? event.targets.slice(0, max) : [null]).map(id => beat(at, stop, id, kind, 0.07));

  function pixel(x, y, ramp, color = 3, size = 1) {
    k.dot(x, y, ramp[0], size + 2);
    k.dot(x, y, ramp[color], size);
  }
  function stroke(a, b, ramp, color = 3, size = 1, steps = 16) {
    const n = Math.min(steps, Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y))));
    for (const pass of [0, 1])
      for (let i = 0; i <= n; i++)
        k.dot(k.mix(a.x, b.x, i / n), k.mix(a.y, b.y, i / n), ramp[pass ? color : 0], size + (pass ? 0 : 2));
  }
  function icon(name, ramp, rows) {
    return k.sprite('b27:' + name, rows[0].length + 2, rows.length + 2, ramp, set => {
      rows.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) if (row[x] !== '.') set(x + 1, y + 1, Number(row[x]));
      });
    });
  }
  function stamp(img, at) {
    k.blit(img, at.x - img.width / 2, at.y - img.height / 2);
  }
  function ring(at, rx, ry, ramp, color = 3, gap = 0, phase = 0) {
    rx = Math.max(2, Math.round(rx));
    ry = Math.max(2, Math.round(ry));
    const img = k.sprite(
      `b27:ring:${ramp[2]}:${rx}:${ry}:${color}:${gap}:${phase}`,
      rx * 2 + 6,
      ry * 2 + 6,
      ramp,
      set => {
        const n = Math.ceil(k.tau * Math.max(rx, ry));
        for (let i = 0; i < n; i++) {
          if (gap && (Math.floor((i / n) * gap * 2) + phase) % 2) continue;
          const a = (i / n) * k.tau;
          set(rx + 3 + Math.cos(a) * rx, ry + 3 + Math.sin(a) * ry, color);
        }
      },
    );
    stamp(img, at);
  }
  function cross(at, ramp, size = 4) {
    stroke({ x: at.x - size, y: at.y }, { x: at.x + size, y: at.y }, ramp, 4, 1, size * 2);
    stroke({ x: at.x, y: at.y - size }, { x: at.x, y: at.y + size }, ramp, 5, 1, size * 2);
  }
  function impact(s, h, at, ramp, name, size = 28, count = 6) {
    const e = s.real(h);
    k.drawHit(k.hitStyle('b27:' + name, ramp, { S: size, spikes: 6, minor: 3, jag: 0.25 }), at, e);
    k.shards(at, e, ramp, seed(s) + s.hits.indexOf(h) * 23, count, 22);
  }
  function pulse(s, at, ramp, r = 22) {
    const e = s.real(s.hits[0]);
    if (e < 0 || e > 360) return;
    const q = k.ease(e / 360);
    ring(at, r * (0.5 + q), r * (0.28 + q * 0.5), ramp, e < 70 ? 5 : 3, e > 180 ? 8 : 0);
  }
  function footprint(s, feet = 10) {
    const points = s.area ? k.outline(s.area, s.grid) : [];
    if (points.length >= 3) return points.map(p => k.P(Array.isArray(p) ? { x: p[0], y: p[1] } : p));
    const p = centre(s),
      r = radius(s, feet) / 2;
    return [
      { x: p.x - r, y: p.y - r },
      { x: p.x + r, y: p.y - r },
      { x: p.x + r, y: p.y + r },
      { x: p.x - r, y: p.y + r },
    ];
  }
  function quad(points, u, v) {
    return {
      x: k.mix(k.mix(points[0].x, points[1].x, u), k.mix(points[3].x, points[2].x, u), v),
      y: k.mix(k.mix(points[0].y, points[1].y, u), k.mix(points[3].y, points[2].y, u), v),
    };
  }
  const softFlash = (event, e) => (e < 35 ? { color: '#fff2c9', alpha: 0.12 } : null);
  const coldFlash = (event, e) =>
    e < 35 ? { color: '#e4faff', alpha: 0.22 } : e < 75 ? { color: '#10243b', alpha: 0.12 } : null;

  // Commune: incense rises to a golden divine eye; three distinct answer lights lock into its halo.
  FX.register('commune', {
    palette: GOLD,
    travel: 430,
    beats: () => [beat(C + 430, 65), beat(C + 650, 65), beat(C + 870, 90)],
    end: () => C + 1310,
    ground(s) {
      if (!active(s, C + 1310)) return;
      const p = caster(s);
      ring(p, 20, 10, GOLD, 3, 6);
      for (let i = 0; i < 3; i++)
        stamp(icon('censer', GOLD, ['..333..', '.24442.', '.22222.', '..222..', '..333..']), {
          x: p.x + (i - 1) * 15,
          y: p.y + 9,
        });
    },
    air(s) {
      if (!active(s, C + 1310)) return;
      const p = caster(s),
        eye = { x: p.x, y: p.y - 25 };
      ring(eye, 18, 17, GOLD, 3, 8);
      stamp(
        icon('divine-eye', GOLD, [
          '......444......',
          '....4433344....',
          '..4435553344...',
          '.433555553334..',
          '..4435553344...',
          '....4433344....',
          '......444......',
        ]),
        eye,
      );
      for (let i = 0; i < 8; i++) {
        const q = (local(s) / 740 + i / 8) % 1;
        pixel(p.x + Math.sin(q * 8 + i) * 7, p.y - q * 22, GOLD, 2, 1);
      }
      s.hits.forEach((h, i) => {
        const at = { x: eye.x + (i - 1) * 13, y: eye.y - 23 };
        if (s.real(h) >= 0) stamp(icon('answer', GOLD, ['..4..', '.454.', '45554', '.454.', '..4..']), at);
        impact(s, h, at, GOLD, 'divine-answer', 20, 3);
      });
    },
  });

  // Commune with Nature: roots connect a spectral tree to three visions of mountains, water and wildlife.
  FX.register('commune-with-nature', {
    palette: NATURE,
    travel: 400,
    beats: () => [beat(C + 400, 70), beat(C + 660, 70), beat(C + 920, 70)],
    end: () => C + 1390,
    ground(s) {
      if (!active(s, C + 1390)) return;
      const p = caster(s),
        q = k.ease(k.clamp(local(s) / 380));
      for (let i = 0; i < 6; i++) {
        const a = (i * k.tau) / 6 + (seed(s) % 6);
        const end = { x: p.x + Math.cos(a) * 26 * q, y: p.y + Math.sin(a) * 14 * q };
        stroke(p, end, NATURE, 2, 2, 12);
        pixel(end.x, end.y, NATURE, 4, 2);
      }
      pulse(s, p, NATURE, 25);
    },
    air(s) {
      if (!active(s, C + 1390)) return;
      const p = caster(s);
      stamp(
        icon('world-tree', NATURE, [
          '.......4.......',
          '.....34443.....',
          '...34444443....',
          '..2344344432...',
          '...23333332....',
          '.2344444444432.',
          '..23333333332..',
          '......222......',
          '......232......',
          '.....22322.....',
          '....222.222....',
        ]),
        { x: p.x, y: p.y - 20 },
      );
      const visions = [
        ['....4....', '...454...', '..43334..', '.4332334.', '433222334'],
        ['33....33.', '.3443344.', '..33333..', '44....44.', '.3443344.'],
        ['.4....4..', '.44..44..', '..4444...', '...43....', '..2332...', '..2..2...'],
      ];
      s.hits.forEach((h, i) => {
        const at = { x: p.x + (i - 1) * 23, y: p.y - 34 - (i === 1 ? 12 : 0) };
        if (s.real(h) >= 0) stamp(icon('nature-vision-' + i, NATURE, visions[i]), at);
        impact(s, h, at, NATURE, 'nature-answer', 20, 4);
      });
    },
  });

  function elementalRamp(event) {
    const e = event.element || '';
    return e === 'water' || e === 'frost'
      ? WATER
      : e === 'earth' || e === 'contundente'
        ? EARTH
        : e === 'air' || e === 'trueno'
          ? WIND
          : FIRE;
  }
  function elemental(s) {
    const ramp = s.ramp;
    const type = ramp === WATER ? 'water' : ramp === EARTH ? 'earth' : ramp === WIND ? 'air' : 'fire';
    const f = Math.floor(Math.max(0, local(s)) / 110) % 3;
    return k.sprite(`b27:elemental:${type}:${f}`, 35, 41, ramp, set => {
      for (let y = 2; y < 39; y++)
        for (let x = 2; x < 33; x++) {
          const dx = x - 17;
          const width = y < 12 ? 5 : y < 27 ? 9 : 5 + (type === 'earth' ? 2 : 0);
          let body = Math.abs(dx) < width && y > 5;
          if (y >= 15 && y <= 27 && Math.abs(dx) < 14 && Math.abs(dx) > 8) body = true;
          if (type === 'fire') body = body || (y < 17 && Math.abs(dx + Math.sin(y * 0.4 + f) * 3) < 4 && y > 2);
          if (type === 'air' && (y + f * 2) % 9 < 3) body = false;
          if (y > 31 && type === 'earth' && Math.abs(dx) < 2) body = false;
          if (!body) continue;
          set(x, y, x < 13 ? 3 : x < 22 ? 2 : 1);
          if (type === 'water' && (y + f * 2) % 11 === 0) set(x, y, 4);
          if (type === 'fire' && y > 20 && Math.abs(dx) < 4) set(x, y, 4);
        }
      set(14, 12, 5);
      set(20, 12, 5);
    });
  }

  // Conjure Elemental: a runic rift erupts into a flame giant, wave spirit, stone brute or air vortex.
  FX.register('conjure-elemental', {
    palette: elementalRamp,
    travel: 500,
    beats: () => [beat(C + 500, 130)],
    end: () => C + 1430,
    ground(s) {
      if (!active(s, C + 1430)) return;
      const p = summonCentre(s),
        t = local(s);
      ring(p, 22, 12, s.ramp, 3, 8, Math.floor(t / 180) % 2);
      if (t >= 500) stamp(elemental(s), { x: p.x, y: p.y - 19 + 18 * (1 - k.ease(k.clamp((t - 500) / 220))) });
      pulse(s, p, s.ramp, 28);
    },
    air(s) {
      if (!active(s, C + 1430)) return;
      const p = summonCentre(s),
        t = local(s);
      if (t < 500)
        for (let i = 0; i < 10; i++) {
          const a = (i * k.tau) / 10 + t / 190;
          pixel(p.x + Math.cos(a) * (24 - t / 30), p.y + Math.sin(a) * 11 - t / 35, s.ramp, i % 2 ? 3 : 4, 2);
        }
      impact(s, s.hits[0], p, s.ramp, 'elemental-' + s.ramp[2], 40, 12);
    },
  });

  function cone(s) {
    const points = s.area ? k.outline(s.area, s.grid) : [];
    if (points.length === 3) return points.map(p => k.P(Array.isArray(p) ? { x: p[0], y: p[1] } : p));
    const h = s.pose.hand || s.pose.base || { x: 0, y: 0 },
      p = k.P(h),
      r = radius(s, 60);
    const dir = s.area?.dir ?? Math.atan2((s.pose.target?.y ?? h.y) - h.y, (s.pose.target?.x ?? h.x + 1) - h.x);
    const at = side => ({
      x: p.x + Math.cos(dir) * r - Math.sin(dir) * side,
      y: p.y + Math.sin(dir) * r + Math.cos(dir) * side,
    });
    return [p, at(-r / 2), at(r / 2)];
  }
  function frostBody(s) {
    const pts = cone(s),
      t = local(s),
      e = s.real(s.hits[0]);
    const f = t < 360 ? Math.floor(t / 60) : 6 + Math.min(6, Math.floor(Math.max(0, e) / 100));
    const xs = pts.map(p => p.x),
      ys = pts.map(p => p.y),
      x0 = Math.floor(Math.min(...xs)) - 2,
      y0 = Math.floor(Math.min(...ys)) - 2;
    const w = Math.ceil(Math.max(...xs)) - x0 + 3,
      h = Math.ceil(Math.max(...ys)) - y0 + 3;
    const a = pts.map(p => ({ x: Math.round(p.x - x0), y: Math.round(p.y - y0) }));
    const key = a.map(p => p.x + ',' + p.y).join(':');
    const img = k.sprite(`b27:frost:${key}:${f}`, w, h, FROST, set => {
      const ux = (a[1].x + a[2].x) / 2 - a[0].x,
        uy = (a[1].y + a[2].y) / 2 - a[0].y;
      const L = Math.hypot(ux, uy) || 1,
        dx = ux / L,
        dy = uy / L;
      const reach = f < 6 ? (f + 1) / 6 : 1;
      for (let y = 1; y < h - 1; y++)
        for (let x = 1; x < w - 1; x++) {
          const along = ((x - a[0].x) * dx + (y - a[0].y) * dy) / L;
          const side = Math.abs(-(x - a[0].x) * dy + (y - a[0].y) * dx) / L;
          if (along < 0 || along > reach || side > along / 2) continue;
          const edge = side / Math.max(0.01, along / 2);
          if (f >= 9 && (Math.floor(along * 32) + Math.floor(side * 44)) % 6 > 12 - f) continue;
          const ridge = ((Math.floor(along * 25 - f * 2) % 8) + 8) % 8;
          set(x, y, f === 6 ? 4 : f >= 9 ? 2 : edge > 0.85 ? 2 : ridge < 2 ? 4 : ridge < 4 ? 3 : 1);
        }
    });
    k.blit(img, x0, y0);
  }

  // Cone of Cold: a caster-anchored sixty-foot white-blue blizzard fans out, cracks, then leaves ice chips.
  FX.register('cone-of-cold', {
    palette: FROST,
    travel: 360,
    beats: event => group(event, C + 360, 160, 'blast'),
    end: () => C + 1110,
    flash: coldFlash,
    ground(s) {
      if (active(s, C + 1010)) frostBody(s);
    },
    air(s) {
      if (!active(s, C + 1110)) return;
      const pts = cone(s),
        t = local(s);
      if (t < 540)
        for (let i = 0; i < 20; i++) {
          const q = (t / 360 + k.hash(i, seed(s))) % 1,
            side = k.hash(i, seed(s), 2);
          const edge = { x: k.mix(pts[1].x, pts[2].x, side), y: k.mix(pts[1].y, pts[2].y, side) };
          const p = { x: k.mix(pts[0].x, edge.x, q), y: k.mix(pts[0].y, edge.y, q) };
          pixel(p.x, p.y, FROST, i % 3 ? 4 : 5, i % 4 ? 1 : 3);
        }
      s.hits.forEach(h => {
        const target = targetOf(s, h);
        impact(
          s,
          h,
          target ? k.P(target) : { x: (pts[1].x + pts[2].x) / 2, y: (pts[1].y + pts[2].y) / 2 },
          FROST,
          'cold',
          38,
          9,
        );
      });
    },
  });

  // Legend Lore: incense uncurls a gold-edged scroll; ancient writing resolves into a crown and sword.
  FX.register('legend-lore', {
    palette: GOLD,
    travel: 570,
    beats: () => [beat(C + 570, 90)],
    end: () => C + 1400,
    ground(s) {
      if (!active(s, C + 1400)) return;
      ring(caster(s), 20, 10, GOLD, 2, 8);
    },
    air(s) {
      if (!active(s, C + 1400)) return;
      const p = caster(s),
        t = local(s);
      const scroll = icon('legend-scroll', GOLD, [
        '333333333333333333333',
        '344444444444444444443',
        '333444444444444444333',
        '..34444444444444443..',
        '..34424442444244443..',
        '..34444444444444443..',
        '..34422442244424443..',
        '..34444444444444443..',
        '..34442444224444443..',
        '..34444444444444443..',
        '333444444444444444333',
        '344444444444444444443',
        '333333333333333333333',
      ]);
      stamp(scroll, { x: p.x, y: p.y - 24 });
      for (let i = 0; i < 9; i++) {
        const q = (t / 820 + i / 9) % 1;
        pixel(p.x + Math.sin(q * 8 + i) * 15, p.y - q * 38, GOLD, 2, 1);
      }
      const at = { x: p.x, y: p.y - 43 };
      if (s.real(s.hits[0]) >= 0) {
        stamp(icon('legend-crown', GOLD, ['4...4...4', '44.454.44', '.4444444.', '.3333333.', '..44444..']), at);
        stamp(icon('legend-sword', STEEL, ['..4..', '..5..', '..5..', '..4..', '34443', '..2..', '..3..']), {
          x: p.x + 17,
          y: p.y - 28,
        });
      }
      impact(s, s.hits[0], at, GOLD, 'legend', 28, 7);
    },
  });

  function holyWard(s, lingering = false) {
    const p = centre(s),
      r = radius(s, 60);
    const e = lingering ? 1000 : s.real(s.hits[0]);
    const q = e < 0 ? k.clamp(local(s) / 480) : 1;
    ring(p, r * (0.35 + q * 0.65), r * (0.35 + q * 0.65), GOLD, e >= 0 && e < 90 ? 5 : 3, 16);
    ring(p, r * 0.83, r * 0.83, GOLD, 2, 12);
    for (let i = 0; i < 8; i++) {
      const a = (i * k.tau) / 8,
        at = { x: p.x + Math.cos(a) * r * 0.92, y: p.y + Math.sin(a) * r * 0.92 };
      stamp(icon('hallow-candle', GOLD, ['..4..', '.454.', '..3..', '..4..', '..3..', '.222.']), at);
    }
  }

  // Contact Other Plane: a vertical violet aperture opens an alien slit-eye; five cold stars answer it.
  FX.register('contact-other-plane', {
    palette: PLANE,
    travel: 480,
    beats: () => [beat(C + 480, 85), beat(C + 790, 85)],
    end: () => C + 1440,
    ground(s) {
      if (!active(s, C + 1440)) return;
      const p = caster(s);
      ring(p, 21, 10, PLANE, 3, 5);
      ring(p, 13, 6, PLANE, 2, 3);
    },
    air(s) {
      if (!active(s, C + 1440)) return;
      const p = caster(s),
        at = { x: p.x, y: p.y - 27 },
        t = local(s);
      ring(at, 13, 22, PLANE, 3, 7, Math.floor(t / 140) % 2);
      stamp(
        icon('alien-eye', PLANE, [
          '....33333....',
          '..332222233..',
          '.32224442223.',
          '3222445442223',
          '.32224442223.',
          '..332222233..',
          '....33333....',
        ]),
        at,
      );
      for (let i = 0; i < 5; i++) {
        const a = (i * k.tau) / 5 - Math.PI / 2;
        const q = { x: at.x + Math.cos(a) * 23, y: at.y + Math.sin(a) * 26 };
        if (t > 190 + i * 110) pixel(q.x, q.y, PLANE, 4, 2);
      }
      s.hits.forEach((h, i) => impact(s, h, { x: at.x, y: at.y + (i ? -15 : 0) }, PLANE, 'planar-answer', 24, 5));
    },
  });

  function windField(s, lingering = false) {
    const pts = footprint(s, 100),
      t = local(s);
    for (let i = 0; i < 7; i++) {
      const u = (t / 610 + i / 7) % 1;
      const v = 0.09 + (i / 6) * 0.82;
      const p = quad(pts, u, v),
        tail = quad(pts, Math.max(0, u - 0.12), v);
      stroke(tail, p, WIND, lingering ? 2 : 3, 1, 16);
      pixel(p.x, p.y, WIND, 4, 2);
    }
    for (let i = 0; i < 4; i++) {
      const a = pts[i],
        b = pts[(i + 1) % 4];
      for (let j = 0; j < 6; j++) pixel(k.mix(a.x, b.x, j / 6), k.mix(a.y, b.y, j / 6), WIND, 2, 1);
    }
  }

  function coffer(s) {
    const pts = footprint(s, 5),
      p = quad(pts, 0.5, 0.5);
    const img = icon('created-coffer', WOOD, [
      '....33333333333....',
      '...3444444444433...',
      '..344444444443323..',
      '.33333333333322223.',
      '.34434434434422223.',
      '.33333333333322223.',
      '.32232232232221223.',
      '.32232234232221223.',
      '.32232234332221223.',
      '.32232232232221223.',
      '.33333333333322223.',
      '..222222222222222..',
    ]);
    stamp(img, { x: p.x, y: p.y - 7 });
  }

  // Creation: violet shadow threads weave a five-foot volume, snapping into a tangible wooden coffer.
  FX.register('creation', {
    palette: PLANE,
    travel: 620,
    beats: () => [beat(C + 620, 110)],
    end: () => C + 1330,
    ground(s) {
      if (!active(s, C + 1330)) return;
      const pts = footprint(s, 5);
      if (local(s) < 800) for (let i = 0; i < 4; i++) stroke(pts[i], pts[(i + 1) % 4], PLANE, 2, 1, 14);
      if (local(s) >= 620) coffer(s);
    },
    air(s) {
      if (!active(s, C + 1330)) return;
      const pts = footprint(s, 5),
        t = local(s);
      if (t < 620) {
        const q = k.clamp(t / 620);
        for (let i = 0; i < 6; i++) {
          const a = quad(pts, i / 5, 0),
            b = quad(pts, i / 5, q);
          a.y -= 10;
          b.y -= 10;
          stroke(a, b, PLANE, i % 2 ? 3 : 2, 1, 12);
          const d = quad(pts, 0, i / 5),
            e = quad(pts, q, i / 5);
          d.y -= 10;
          e.y -= 10;
          stroke(d, e, PLANE, 3, 1, 12);
        }
      }
      const p = quad(pts, 0.5, 0.5);
      impact(s, s.hits[0], { x: p.x, y: p.y - 7 }, PLANE, 'creation', 32, 8);
    },
  });

  // Create Spelljamming Helm: astral filaments crown a high-backed chair with a small orbiting star globe.
  FX.register('create-spelljamming-helm', {
    palette: PLANE,
    travel: 650,
    beats: () => [beat(C + 650, 120)],
    end: () => C + 1470,
    ground(s) {
      if (!active(s, C + 1470)) return;
      const p = summonCentre(s),
        t = local(s);
      ring(p, 21, 11, PLANE, 3, 8);
      if (t > 180)
        stamp(
          icon('spelljammer-chair', GOLD, [
            '...3.......3...',
            '...344444443...',
            '...322222223...',
            '...324444423...',
            '...324222423...',
            '...324444423...',
            '...322222223...',
            '.3332222222333.',
            '.3432222222343.',
            '.3334444444333.',
            '.3333333333333.',
            '...32.....23...',
            '...32.....23...',
            '...33.....33...',
          ]),
          { x: p.x, y: p.y - 11 },
        );
      pulse(s, p, PLANE, 25);
    },
    air(s) {
      if (!active(s, C + 1470)) return;
      const p = summonCentre(s),
        t = local(s),
        globe = { x: p.x, y: p.y - 34 };
      ring(globe, 10, 10, PLANE, 3);
      ring(globe, 4, 10, PLANE, 2);
      ring(globe, 11, 4, GOLD, 3);
      for (let i = 0; i < 6; i++) {
        const a = t / 240 + (i * k.tau) / 6;
        pixel(globe.x + Math.cos(a) * 17, globe.y + Math.sin(a) * 8, PLANE, i % 2 ? 4 : 5, 1);
      }
      if (t < 650) {
        for (let i = 0; i < 3; i++) {
          const x = p.x + (i - 1) * 10;
          pixel(x, k.mix(p.y, globe.y, (t / 600 + i / 3) % 1), PLANE, 4, 2);
        }
      } else cross(globe, GOLD, 4);
      impact(s, s.hits[0], globe, PLANE, 'spelljammer', 34, 10);
    },
  });

  // Mass Cure Wounds: six green-gold ribbons arc together into allies, blooming as upward healing crosses.
  FX.register('mass-cure-wounds', {
    palette: k.palettes.heal,
    travel: 360,
    beats: event => group(event, C + 360, 95, 'soft', 6),
    end: () => C + 1130,
    ground(s) {
      if (!active(s, C + 1130)) return;
      const ramp = s.ramp;
      s.hits.forEach(h => {
        const target = targetOf(s, h);
        const p = target ? k.P({ x: target.baseX ?? target.x, y: target.baseY ?? target.y }) : centre(s);
        const e = s.real(h);
        if (e >= 0 && e < 580)
          ring(
            p,
            10 + Math.floor(Math.min(e, 300) / 70),
            5 + Math.floor(Math.min(e, 300) / 140),
            ramp,
            e < 80 ? 5 : 3,
            e > 260 ? 6 : 0,
          );
      });
    },
    air(s) {
      if (!active(s, C + 1130)) return;
      const ramp = s.ramp,
        H = s.pose.hand ? k.P(s.pose.hand) : caster(s),
        t = local(s);
      s.hits.forEach((h, i) => {
        const target = targetOf(s, h),
          T = target ? k.P(target) : centre(s);
        if (t < 360) {
          const q = t / 360;
          for (let j = 0; j < 6; j++) {
            const u = q - j * 0.045;
            if (u < 0) continue;
            pixel(
              k.mix(H.x, T.x, u),
              k.mix(H.y, T.y, u) - Math.sin(u * Math.PI) * (14 + i * 2),
              ramp,
              j < 2 ? 4 : 3,
              j ? 1 : 3,
            );
          }
        }
        impact(s, h, T, ramp, 'mass-cure', 25, 4);
        const e = s.real(h);
        if (e >= 110 && e < 650) cross({ x: T.x, y: T.y - 5 - Math.floor((e - 110) / 55) }, ramp, e < 390 ? 4 : 3);
      });
    },
  });

  function dancerAt(s, i) {
    const list = s.targets.filter(t => t.id != null);
    const target = list[i];
    if (target) {
      const at = k.P({ x: target.baseX ?? target.x, y: target.baseY ?? target.y });
      return { x: at.x + 13, y: at.y };
    }
    const p = centre(s),
      a = (i * k.tau) / 5;
    return { x: p.x + Math.cos(a) * 20, y: p.y + Math.sin(a) * 12 };
  }
  function dancers(s) {
    const t = local(s),
      count = Math.min(5, s.targets.filter(t => t.id != null).length || 5);
    const bone = icon('macabre-skeleton', DEAD, [
      '....4444....',
      '...455554...',
      '...421124...',
      '....4334....',
      '.....33.....',
      '..34433443..',
      '.43.4334.34.',
      '.3..4334..3.',
      '....4334....',
      '.....33.....',
      '....3333....',
      '....3..3....',
      '...43..34...',
      '...3....3...',
      '..44....44..',
    ]);
    for (let i = 0; i < count; i++) {
      const at = dancerAt(s, i);
      ring(at, 9, 5, DEAD, 3, 6);
      if (t >= 520)
        stamp(bone, {
          x: at.x,
          y: at.y - 9 + 8 * (1 - k.ease(k.clamp((t - 520) / 220))) + (Math.floor(t / 140 + i) % 2),
        });
    }
  }

  // Danse Macabre: five bone-white skeletons rise from green grave sigils, tugged upright by a conductor's notes.
  FX.register('danse-macabre', {
    palette: DEAD,
    travel: 520,
    beats: event => group(event, C + 520, 140, 'soft', 5),
    end: () => C + 1490,
    ground(s) {
      if (active(s, C + 1490)) dancers(s);
    },
    air(s) {
      if (!active(s, C + 1490)) return;
      const p = centre(s),
        t = local(s),
        H = s.pose.hand ? k.P(s.pose.hand) : caster(s);
      const note = icon('death-note', DEAD, ['..3333', '..3..3', '..3..3', '..3.43', '.43.44', '.44...']);
      for (let i = 0; i < 5; i++) {
        const q = (t / 850 + i / 5) % 1;
        stamp(note, {
          x: k.mix(H.x, p.x, q) + Math.sin(i + q * 5) * 14,
          y: k.mix(H.y, p.y - 25, q) - Math.sin(q * Math.PI) * 14,
        });
      }
      const count = Math.min(5, s.targets.filter(t => t.id != null).length || 5);
      for (let i = 0; i < count; i++) {
        const h = s.hits[i] || s.hits[0],
          at = dancerAt(s, i);
        impact(s, h, { x: at.x, y: at.y - 9 }, DEAD, 'danse', 27, 5);
      }
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
