/* Pixel spells, batch 32 (see docs/pixel-spells/BRIEF.md). */
(function (root) {
  'use strict';
  const FX = root.BoardPixelFX;
  if (!FX) return;
  const k = FX.kit;
  const C = k.CAST;
  const VOID = ['#100c22', '#241c47', '#514082', '#9677d4', '#d7c9ff', '#ffffff'];
  const WARD = ['#111a32', '#294475', '#537fb3', '#9bcde7', '#e1f6ff', '#ffffff'];
  const GOLD = ['#281b16', '#654227', '#a47938', '#e4b75c', '#fff0b4', '#fffdf0'];
  const STONE = ['#211b19', '#504339', '#81715c', '#b6a58a', '#e1d5b7', '#fff8df'];
  const EARTH = ['#241b16', '#57402c', '#87633b', '#bb955e', '#dbca8d', '#fff3cf'];
  const ICE = ['#101f32', '#28527c', '#509bd0', '#99dcee', '#e4fbff', '#ffffff'];
  const FIRE = ['#2b1118', '#732329', '#bd4225', '#f58329', '#ffd56e', '#fff4d3'];
  const WIND = ['#17232e', '#3c5868', '#6a94a3', '#add5db', '#e8f7eb', '#ffffff'];
  const IMAGE = ['#21122f', '#513362', '#9062a7', '#d39add', '#f4d6eb', '#ffffff'];
  const SAPPHIRE = ['#10172e', '#243a80', '#365fc4', '#6baaf1', '#c4eaff', '#ffffff'];
  const SOUL = ['#111322', '#302746', '#43675f', '#85b69e', '#d1f5d5', '#ffffff'];
  const EYE = ['#160e20', '#34223e', '#664b78', '#ad83b8', '#dfc9df', '#fff4f6'];
  const seed = s => s.event.seed || 0;
  const add = (p, x, y) => ({ x: p.x + x, y: p.y + y });
  const live = (s, end) => s.c.t >= C && s.c.t < end;
  const ids = e => (e.targets?.length ? [...new Set(e.targets)] : [null]);
  const beat = (at, stop, target = null, kind = 'soft', power = 0.04) => ({ at, stop, target, kind, power });
  const soft = (e, kit, travel) => [beat(C + travel, 80)];
  const feet = p => k.P({ x: p.baseX ?? p.x, y: p.baseY ?? p.y });
  const caster = s => feet(s.pose.base || s.pose.hand || s.pose.target);
  function target(s, hit) {
    return s.targets.find(t => t.id === hit?.id) || s.targets[0] || s.pose.target || s.pose.base || s.pose.hand;
  }
  function centre(s) {
    if (s.area?.kind === 'cube') {
      const q = quad(s);
      return tilePoint(q, 0.5, 0.5);
    }
    return k.P(s.area || s.pose.target || target(s));
  }
  function pixel(p, ramp, index = 4, size = 1) {
    k.dot(p.x, p.y, ramp[0], size + 2);
    k.dot(p.x, p.y, ramp[index], size);
  }
  function orb(p, r, ramp, index = 3) {
    k.disc(p.x, p.y, r + 1, ramp[0]);
    k.disc(p.x, p.y, r, ramp[index]);
    if (r > 2) k.disc(p.x - 1, p.y - 1, r * 0.4, ramp[4]);
  }
  function stamp(img, p) {
    k.blit(img, p.x - img.width / 2, p.y - img.height / 2);
  }
  function icon(key, ramp, rows) {
    return k.sprite(`b32:${key}`, rows[0].length + 2, rows.length + 2, ramp, set => {
      rows.forEach((row, y) => [...row].forEach((v, x) => v !== '.' && set(x + 1, y + 1, Number(v))));
    });
  }
  // Rasterised rings and strokes stay cheap even on the full hundred-foot template.
  function ring(p, rx, ry, ramp, index = 3, gap = 0, phase = 0) {
    rx = Math.max(2, Math.round(rx));
    ry = Math.max(2, Math.round(ry));
    const f = Math.floor(phase) % 8;
    const img = k.sprite(`b32:ring:${rx}:${ry}:${ramp[1]}:${index}:${gap}:${f}`, rx * 2 + 5, ry * 2 + 5, ramp, set => {
      for (let y = -ry; y <= ry; y++)
        for (let x = -rx; x <= rx; x++) {
          if (Math.abs(Math.hypot(x / rx, y / ry) - 1) * Math.min(rx, ry) > 0.65) continue;
          if (gap && Math.floor(((Math.atan2(y, x) + Math.PI) / k.tau) * gap * 2 + f / 2) % 2) continue;
          set(x + rx + 2, y + ry + 2, index);
        }
    });
    stamp(img, p);
  }
  function stroke(a, b, ramp, width = 1, index = 3) {
    const dx = Math.round(b.x - a.x),
      dy = Math.round(b.y - a.y),
      pad = width + 2,
      ox = pad - Math.min(0, dx),
      oy = pad - Math.min(0, dy);
    const img = k.sprite(
      `b32:line:${dx}:${dy}:${ramp[1]}:${width}:${index}`,
      Math.abs(dx) + pad * 2 + 1,
      Math.abs(dy) + pad * 2 + 1,
      ramp,
      set => {
        const n = Math.max(1, Math.ceil(Math.hypot(dx, dy)));
        for (let i = 0; i <= n; i++)
          for (let x = 0; x < width; x++)
            for (let y = 0; y < width; y++)
              set(
                Math.round(ox + (dx * i) / n + x - (width - 1) / 2),
                Math.round(oy + (dy * i) / n + y - (width - 1) / 2),
                index,
              );
      },
    );
    k.blit(img, a.x - ox, a.y - oy);
  }
  function impact(s, h, p, ramp, key, size = 28, n = 7) {
    const e = s.real(h);
    k.drawHit(k.hitStyle(`b32:${key}`, ramp, { S: size, spikes: 6, minor: 2, jag: 0.35 }), p, e);
    k.shards(p, e, ramp, seed(s) + h.at, n, size * 0.65);
  }
  function pulse(s, h, p, ramp, r = 22) {
    const e = s.real(h);
    if (e < 0 || e >= 420) return;
    const q = k.ease(e / 420);
    ring(p, 4 + q * r, 2 + q * r * 0.5, ramp, e < 60 ? 5 : 3, e > 260 ? 8 : 0);
  }
  function motes(s, p, ramp, e, n = 10, r = 20, rise = 20) {
    if (e < 0 || e >= 620) return;
    const q = e / 620;
    for (let i = 0; i < n; i++) {
      if (q > 0.75 && i % 2) continue;
      const a = k.hash(i, seed(s), 32) * k.tau;
      pixel(add(p, Math.cos(a) * (3 + k.ease(q) * r), Math.sin(a) * r * 0.4 - q * rise), ramp, i % 2 ? 3 : 4);
    }
  }
  function rune(p, ramp, i = 0) {
    const rows = [
      ['..4..', '.424.', '42.24', '.424.', '..4..'],
      ['4...4', '.4.4.', '..4..', '..4..', '.444.'],
      ['.444.', '.4.4.', '..4..', '.4.4.', '.4.4.'],
    ][i % 3];
    stamp(icon(`rune:${ramp[1]}:${i % 3}`, ramp, rows), p);
  }
  function sigil(p, ramp, t, r = 18) {
    ring(p, r, r * 0.5, ramp, 3);
    ring(p, r * 0.72, r * 0.36, ramp, 2, 6, t / 90);
    for (let i = 0; i < 5; i++) {
      const a = (i * k.tau) / 5;
      pixel(add(p, Math.cos(a) * r, Math.sin(a) * r * 0.5), ramp, 4);
    }
  }
  function quad(s, fallback = 64) {
    const points = s.area?.kind === 'cube' ? k.outline(s.area, s.grid) : [];
    if (points.length >= 4) return points.slice(0, 4).map(p => k.P(Array.isArray(p) ? { x: p[0], y: p[1] } : p));
    const p = k.P(s.area || s.pose.target || target(s));
    return [
      add(p, -fallback / 2, -fallback / 2),
      add(p, fallback / 2, -fallback / 2),
      add(p, fallback / 2, fallback / 2),
      add(p, -fallback / 2, fallback / 2),
    ];
  }
  const tilePoint = (q, u, v) => ({
    x: q[0].x + (q[1].x - q[0].x) * u + (q[3].x - q[0].x) * v,
    y: q[0].y + (q[1].y - q[0].y) * u + (q[3].y - q[0].y) * v,
  });
  function border(q, ramp, index = 3) {
    q.forEach((p, i) => stroke(p, q[(i + 1) % 4], ramp, 1, index));
  }
  // Paint a cached floor directly in the template's basis, including rotated cubes.
  function floor(s, name, ramp, frame, paint) {
    const q = quad(s),
      x0 = Math.floor(Math.min(...q.map(p => p.x))) - 2,
      y0 = Math.floor(Math.min(...q.map(p => p.y))) - 2,
      w = Math.ceil(Math.max(...q.map(p => p.x))) - x0 + 3,
      h = Math.ceil(Math.max(...q.map(p => p.y))) - y0 + 3,
      ax = q[1].x - q[0].x,
      ay = q[1].y - q[0].y,
      bx = q[3].x - q[0].x,
      by = q[3].y - q[0].y,
      det = ax * by - ay * bx;
    if (Math.abs(det) < 1) return;
    const img = k.sprite(
      `b32:floor:${name}:${Math.round(ax)}:${Math.round(ay)}:${Math.round(bx)}:${Math.round(by)}:${frame}`,
      w,
      h,
      ramp,
      set => {
        for (let y = 2; y < h - 2; y++)
          for (let x = 2; x < w - 2; x++) {
            const dx = x + x0 - q[0].x,
              dy = y + y0 - q[0].y,
              u = (dx * by - dy * bx) / det,
              v = (ax * dy - ay * dx) / det;
            if (u < 0 || u > 1 || v < 0 || v > 1) continue;
            const index = paint(u, v, x, y);
            if (index > 0) set(x, y, index);
          }
      },
    );
    k.blit(img, x0, y0);
  }
  function lineAxis(s) {
    const a = s.area,
      from = a ? k.P(a) : caster(s),
      aim = k.P(s.pose.target || target(s)),
      dir = a?.dir ?? Math.atan2(aim.y - from.y, aim.x - from.x),
      length = ((a?.feet || 100) / (s.grid.feet || 5)) * 16;
    return { from, dir, length, ux: Math.cos(dir), uy: Math.sin(dir), nx: -Math.sin(dir), ny: Math.cos(dir) };
  }
  function rift(s) {
    if (!live(s, 1340)) return;
    const a = lineAxis(s),
      t = s.c.t - C,
      width = t < 310 ? 5 : t < 650 ? 3 : 1;
    const at = u => {
      const bend = Math.sin(u * Math.PI) * (k.hash(Math.round(u * 24), seed(s)) - 0.5) * 5;
      return add(a.from, a.ux * a.length * u + a.nx * bend, a.uy * a.length * u + a.ny * bend);
    };
    for (let i = 0; i < 24; i++) {
      if (t > 780 && i % 3 === 1) continue;
      stroke(at(i / 24), at((i + 1) / 24), VOID, width, t < 100 ? 4 : t < 310 ? 2 : 1);
    }
    if (t >= 100 && t < 580)
      for (let i = 1; i < 9; i++) {
        const p = at(i / 9);
        ring(p, 4 + (i % 2), 10, VOID, 3, 4, t / 80);
      }
  }
  function globe(s, loop = false) {
    const t = s.c.t - C;
    if (!loop && !live(s, 1400)) return;
    const p = s.area ? k.P(s.area) : caster(s),
      radius = ((s.area?.feet || 10) / (s.grid.feet || 5)) * 16,
      r = Math.round(radius * (loop ? 1 : 0.65 + 0.35 * k.ease(k.clamp(t / 180))));
    ring(p, r, r * 0.46, WARD, loop ? 2 : 3);
    for (let i = 0; i < 6; i++) {
      const a = (i * k.tau) / 6;
      rune(add(p, Math.cos(a) * r, Math.sin(a) * r * 0.46), GOLD, i);
    }
    if (loop) {
      ring(add(p, 0, -r * 0.5), r, r, WARD, 2, 8, s.c.raw / 180);
      return;
    }
    pulse(s, s.hits[0], p, WARD, radius + 3);
  }
  function pillar(height, variant) {
    const w = 15,
      h = Math.max(8, Math.round(height));
    return k.sprite(`b32:pillar:${h}:${variant}`, w + 4, h + 8, STONE, set => {
      for (let y = 3; y < h + 4; y++)
        for (let x = 2; x <= w + 1; x++) {
          const top = 3 + Math.abs(x - 9) * 0.25;
          if (y < top || y > h + 4 - Math.abs(x - 9) * 0.25) continue;
          let index = x < 6 ? 3 : x < 12 ? 2 : 1;
          if (y < 8 - Math.abs(x - 8) * 0.25) index = 4;
          if (y > 9 && (y + variant * 3) % 13 === 0) index = 1;
          if (x === 7 + (Math.floor(y / 9) % 3) && y > 12 && y < h - 4) index = 1;
          set(x, y, index);
        }
    });
  }
  function columnPoints(s) {
    const p = centre(s),
      r = Math.max(22, ((s.area?.feet || 10) / (s.grid.feet || 5)) * 10);
    return Array.from({ length: 6 }, (_, i) => {
      if (s.targets[i] && s.event.targets?.length) return feet(s.targets[i]);
      const a = (i * k.tau) / 6 + 0.3;
      return add(p, Math.cos(a) * r, Math.sin(a) * r * 0.65);
    });
  }
  function crystal(p, h, lean = 0) {
    const img = k.sprite(`b32:crystal:${h}:${lean}`, 11, h + 4, ICE, set => {
      for (let y = 1; y <= h; y++)
        for (let x = 1; x < 10; x++) {
          const cx = 5 + lean * (1 - y / h),
            half = Math.min(y * 0.45, (h - y) * 0.6 + 1, 3);
          if (Math.abs(x - cx) <= half) set(x, y + 1, x < cx ? 4 : x === Math.round(cx) ? 3 : 2);
        }
    });
    k.blit(img, p.x - 5, p.y - h - 2);
  }
  function flame(p, height, frame) {
    const h = Math.round(height),
      f = frame % 4;
    const img = k.sprite(`b32:flame:${h}:${f}`, 17, h + 5, FIRE, set => {
      for (let y = 1; y <= h; y++)
        for (let x = 1; x < 16; x++) {
          const q = y / h,
            cx = 8 + Math.sin(q * 7 + f * 1.6) * (1 - q) * 3,
            half = Math.sin(q * Math.PI * 0.8) * 5;
          if (Math.abs(x - cx) > half || (y < h * 0.4 && x > cx + 1 && f % 2)) continue;
          const core = Math.abs(x - cx) / Math.max(1, half);
          set(x, y + 1, q > 0.65 && core < 0.35 ? 5 : core < 0.5 ? 4 : core < 0.8 ? 3 : 2);
        }
    });
    k.blit(img, p.x - 8, p.y - h - 1);
  }
  function mantleGround(s, ramp, radius) {
    if (!live(s, 1290)) return;
    const p = caster(s);
    ring(p, radius, radius * 0.5, ramp, s.c.t < 700 ? 3 : 2, 8, s.c.t / 110);
    pulse(s, s.hits[0], p, ramp, radius);
  }
  function mantleFinish(s, ramp, key) {
    const p = caster(s),
      h = s.hits[0];
    pulse(s, h, p, ramp, 13);
    // Assembly sparks stay beside the figure, leaving its face readable.
    for (const side of [-1, 1]) {
      const at = add(p, side * 12, -13);
      k.shards(at, s.real(h), ramp, seed(s) + side + 9, 5, 12);
      k.drawHit(k.hitStyle(`b32:mantle:${key}`, ramp, { S: 16, spikes: 4, jag: 0.15 }), at, s.real(h));
    }
  }
  function sapphire(p) {
    stamp(
      icon('sapphire', SAPPHIRE, ['...44...', '..4544..', '.453234.', '45322324', '.432234.', '..4324..', '...24...']),
      p,
    );
  }
  function key(p) {
    stamp(
      icon('summoned-key', GOLD, [
        '.444...........',
        '43234..........',
        '43.34444444444.',
        '43234.....4.4..',
        '.444......4.4..',
      ]),
      p,
    );
  }
  function soul(p, frame = 0) {
    stamp(
      icon(
        `soul:${frame % 2}`,
        SOUL,
        frame % 2
          ? ['..444..', '.45554.', '.44144.', '.44444.', '..343..', '.33333.', '33.3.33']
          : ['..444..', '.45554.', '.44144.', '.44444.', '..343..', '.33333.', '.3.3.3.'],
      ),
      p,
    );
  }
  function cage(p, shut) {
    ring(add(p, 0, 6), 7, 3, GOLD, 3);
    ring(add(p, 0, -8), 7, 3, GOLD, 4);
    for (let i = 0; i < 5; i++) {
      const x = (i - 2) * 3;
      if (!shut && i === 2) continue;
      stroke(add(p, x, -8), add(p, x, 6), GOLD, 1, i % 2 ? 2 : 3);
    }
    stroke(add(p, 0, -11), add(p, 0, -15), GOLD, 1, 4);
    ring(add(p, 0, -17), 2, 2, GOLD, 3);
    if (shut) pixel(add(p, 0, 0), GOLD, 4, 2);
  }
  function eye(p, closed = false) {
    const rows = closed
      ? [
          '.................',
          '.................',
          '..2...........2..',
          '...22222222222...',
          '....4.......4....',
          '.................',
          '.................',
        ]
      : [
          '......44444......',
          '...44411111444...',
          '.442111111111244.',
          '42111112111111214',
          '.442111111111244.',
          '...44411111444...',
          '......44444......',
        ];
    stamp(icon(`eye:${closed ? 1 : 0}`, EYE, rows), p);
  }
  const flash = (event, e) =>
    e < 30 ? { color: '#eee8ff', alpha: 0.2 } : e < 70 ? { color: '#110d20', alpha: 0.16 } : null;

  // Guards and Wards: fog fills a warded corridor plan; locks, stair-webs and misleading runes click into place.
  FX.register('guards-and-wards', {
    palette: IMAGE,
    travel: 220,
    beats: (e, kit, travel) => [beat(C + travel, 85), beat(C + 440, 60)],
    end: () => 1590,
    ground(s) {
      if (!live(s, 1590)) return;
      const f = Math.min(3, Math.floor((s.c.t - C) / 120)),
        q = quad(s);
      floor(s, 'ward-fog', WARD, f, (u, v) => {
        const corridor = Math.abs(u - 0.5) < 0.13 || Math.abs(v - 0.5) < 0.13;
        if (!corridor) return -1;
        const band = Math.floor(v * 28 + Math.sin(u * 14 + f) * 2);
        return band % 5 < 2 ? 2 : band % 5 === 2 ? 3 : -1;
      });
      border(q, IMAGE, 2);
      for (const u of [0.15, 0.85]) {
        stroke(tilePoint(q, u, 0.15), tilePoint(q, u, 0.85), GOLD, 1, 2);
        stroke(tilePoint(q, 0.15, u), tilePoint(q, 0.85, u), GOLD, 1, 2);
      }
      const web = tilePoint(q, 0.8, 0.22);
      for (let i = 0; i < 5; i++) {
        const a = (i * k.tau) / 5;
        stroke(web, add(web, Math.cos(a) * 12, Math.sin(a) * 8), WARD, 1, 3);
      }
      ring(web, 5, 4, WARD, 3);
      ring(web, 10, 7, WARD, 3);
      if (s.c.t > C + 200) q.forEach((p, i) => rune(p, IMAGE, i));
      s.hits.forEach(h => pulse(s, h, tilePoint(q, 0.5, 0.5), GOLD, 26));
    },
    air(s) {
      if (!live(s, 1590)) return;
      const q = quad(s),
        e = s.real(s.hits[0]);
      if (e >= 0)
        for (let i = 0; i < 3; i++) {
          const p = tilePoint(q, 0.2 + i * 0.3, i % 2 ? 0.82 : 0.18);
          stamp(
            icon('ward-lock', GOLD, ['..444..', '.4...4.', '.4...4.', '2333332', '2341432', '2331332', '.23332.']),
            add(p, 0, -5),
          );
          k.shards(p, s.real(s.hits[i === 2 ? 1 : 0]), IMAGE, seed(s) + i, 4, 10);
        }
    },
  });

  // Bones of the Earth: six stratified stone pillars punch upward in paired thuds, shedding chips and dust.
  FX.register('bones-of-the-earth', {
    palette: STONE,
    travel: 180,
    beats: e =>
      Array.from({ length: 6 }, (_, i) =>
        beat(C + 180 + Math.floor(i / 2) * 150, 90, e.targets?.[i] ?? null, 'blast', 0.07),
      ),
    end: () => 1670,
    flash,
    reach: (e, grid) => ({ r: (e.area?.feet || 15) / (grid.feet || 5) + 2, up: 5 }),
    ground(s) {
      if (!live(s, 1670)) return;
      const points = columnPoints(s);
      points
        .map((p, i) => ({ p, i }))
        .sort((a, b) => a.p.y - b.p.y)
        .forEach(({ p, i }) => {
          const h = s.hits[i],
            t = s.c.t - h.at;
          ring(p, 11, 6, STONE, t < 0 ? 2 : 1, t < 0 ? 6 : 0);
          if (t < -110) return;
          const f = Math.round(k.clamp((t + 110) / 110) * 6),
            height = 8 + f * (6 + (i % 2)),
            img = pillar(height, i % 3);
          k.blit(img, p.x - img.width / 2, p.y - img.height + 4);
          pulse(s, h, p, EARTH, 17);
        });
    },
    air(s) {
      if (!live(s, 1670)) return;
      columnPoints(s).forEach((p, i) => {
        const h = s.hits[i];
        impact(s, h, add(p, 0, -12), STONE, 'stone-pillar', 26, 8);
        motes(s, p, EARTH, s.real(h), 5, 15, 6);
      });
    },
  });

  // Programmed Illusion: a golden trigger clock opens a rose-violet stage and a banded, impossible dragon tableau.
  FX.register('programmed-illusion', {
    palette: IMAGE,
    travel: 240,
    beats: soft,
    end: () => 1560,
    ground(s) {
      if (!live(s, 1560)) return;
      const q = quad(s),
        p = tilePoint(q, 0.5, 0.65),
        t = s.c.t - C;
      border(q, IMAGE, 2);
      sigil(p, IMAGE, t, 22);
      if (t < 240) return;
      const f = Math.min(3, Math.floor((t - 240) / 110)),
        img = k.sprite(`b32:illusion-dragon:${f}`, 63, 48, IMAGE, set => {
          for (let y = 2; y < 45; y++)
            for (let x = 2; x < 61; x++) {
              const body = ((x - 32) / 10) ** 2 + ((y - 30) / 9) ** 2 < 1,
                neck = x > 36 && x < 43 && y > 12 && y < 31,
                head = x > 38 && x < 54 && y > 10 && y < 17,
                horn = x > 40 && x < 44 && y > 4 && y < 12,
                wing = x > 8 && x < 32 && y > 8 + (x - 8) * 0.3 && y < 32 - Math.abs(x - 20) * 0.8,
                tail = x > 6 && x < 29 && Math.abs(y - (39 - (x - 6) * 0.18)) < 2,
                legs = y > 34 && y < 43 && ((x > 26 && x < 30) || (x > 36 && x < 40));
              if (!(body || neck || head || horn || wing || tail || legs)) continue;
              if (Math.floor(y / 3 + f) % 5 === 0) continue;
              set(x, y, head && y === 12 && x === 48 ? 5 : y % 7 === 0 ? 4 : wing ? 2 : x < 33 ? 3 : 2);
            }
        });
      k.blit(img, p.x - 31, p.y - 44);
      pulse(s, s.hits[0], p, IMAGE, 25);
    },
    air(s) {
      if (!live(s, 1560)) return;
      const q = quad(s),
        p = tilePoint(q, 0.5, 0.1),
        e = s.real(s.hits[0]);
      stamp(
        icon('illusion-trigger', GOLD, ['4444444', '.4...4.', '..4.4..', '...4...', '..434..', '.43334.', '4444444']),
        add(p, 0, -9),
      );
      motes(s, p, IMAGE, e, 9, 25, 12);
      if (e >= 0) q.forEach((at, i) => rune(at, IMAGE, i));
    },
  });

  // Investiture of Ice: pale faceted icicles sheath the caster, with a crunchy frost skirt and orbiting snow.
  FX.register('investiture-of-ice', {
    palette: ICE,
    travel: 190,
    beats: soft,
    end: () => 1290,
    ground(s) {
      mantleGround(s, ICE, 30);
      if (!live(s, 1290)) return;
      const p = caster(s);
      for (let i = 0; i < 8; i++) {
        const a = (i * k.tau) / 8;
        crystal(add(p, Math.cos(a) * 23, Math.sin(a) * 12 + 3), 6 + (i % 3), 0);
      }
    },
    air(s) {
      if (!live(s, 1290)) return;
      const p = caster(s),
        q = k.ease(k.clamp((s.c.t - C) / 190));
      for (const side of [-1, 1])
        for (let i = 0; i < 3; i++) crystal(add(p, side * (8 + i * 3), -i * 5), Math.round(8 + q * (9 - i * 2)), side);
      motes(s, add(p, 0, -12), ICE, s.real(s.hits[0]), 12, 24, 24);
      mantleFinish(s, ICE, 'ice');
    },
  });

  // Investiture of Flame: orange-white tongues climb both shoulders, ember jets rise, and a charred rim settles.
  FX.register('investiture-of-flame', {
    palette: FIRE,
    travel: 180,
    beats: soft,
    end: () => 1290,
    ground(s) {
      mantleGround(s, FIRE, 18);
      if (!live(s, 1290)) return;
      const p = caster(s);
      ring(p, 14, 7, FIRE, 1, 7);
      for (let i = 0; i < 5; i++) flame(add(p, (i - 2) * 7, 3), 8 + (i % 3), Math.floor(s.c.t / 90) + i);
    },
    air(s) {
      if (!live(s, 1290)) return;
      const p = caster(s),
        f = Math.floor(s.c.t / 85);
      for (const side of [-1, 1]) {
        flame(add(p, side * 10, -3), 25, f + (side > 0 ? 2 : 0));
        flame(add(p, side * 8, -15), 16, f + 1);
      }
      motes(s, add(p, 0, -12), FIRE, s.real(s.hits[0]), 14, 20, 32);
      mantleFinish(s, FIRE, 'flame');
    },
  });

  // Summon Fiend: a brimstone pentacle splits open and a horned, winged, barbed-tail fiend rises from the pit.
  FX.register('summon-fiend', {
    palette: FIRE,
    travel: 310,
    beats: (e, kit, travel) => [beat(C + travel, 130, null, 'blast', 0.06)],
    end: () => 1630,
    flash: (e, t) => (t < 30 ? { color: '#ffe3a6', alpha: 0.2 } : t < 70 ? { color: '#240b19', alpha: 0.18 } : null),
    reach: () => ({ r: 4, up: 5 }),
    ground(s) {
      if (!live(s, 1630)) return;
      const p = centre(s),
        t = s.c.t - C,
        r = 23;
      sigil(p, FIRE, t, r);
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i * k.tau) / 5,
          b = -Math.PI / 2 + ((i + 2) * k.tau) / 5;
        stroke(
          add(p, Math.cos(a) * r, Math.sin(a) * r * 0.5),
          add(p, Math.cos(b) * r, Math.sin(b) * r * 0.5),
          FIRE,
          1,
          2,
        );
      }
      if (t < 120) return;
      const f = Math.min(7, Math.floor((t - 120) / 40)),
        img = k.sprite(`b32:fiend:${f}`, 47, 49, FIRE, set => {
          for (let y = 2; y < 47; y++)
            for (let x = 2; x < 45; x++) {
              const body = x > 18 && x < 29 && y > 18 && y < 35,
                head = x > 18 && x < 29 && y > 10 && y < 21,
                horns = y > 2 && y < 13 && (Math.abs(x - (17 + y * 0.3)) < 1.5 || Math.abs(x - (30 - y * 0.3)) < 1.5),
                wings =
                  y > 11 &&
                  y < 29 &&
                  Math.abs(x - 23) > 8 &&
                  Math.abs(x - 23) < 22 - (y - 11) * 0.5 &&
                  (y < 24 || x % 7 < 4),
                legs = y >= 34 && y < 44 && ((x > 17 && x < 22) || (x > 25 && x < 30)),
                tail = x > 29 && x < 43 && Math.abs(y - (42 - (x - 29) * 0.4)) < 1.5,
                barb = x > 38 && x < 44 && y > 30 && y < 38 && x > 38 + Math.abs(y - 34);
              if (!(body || head || horns || wings || legs || tail || barb)) continue;
              const yy = y + (7 - f) * 5;
              if (yy > 46) continue;
              const eyes = y === 15 && (x === 20 || x === 26);
              set(x, yy, eyes ? 5 : horns ? 4 : wings ? 1 : x < 23 ? 3 : 2);
            }
        });
      k.blit(img, p.x - 23, p.y - 45);
      pulse(s, s.hits[0], p, FIRE, 30);
    },
    air(s) {
      if (!live(s, 1630)) return;
      const p = centre(s),
        e = s.real(s.hits[0]);
      for (const side of [-1, 1]) flame(add(p, side * 21, 1), 17, Math.floor(s.c.t / 90) + (side > 0 ? 2 : 0));
      k.shards(p, e, FIRE, seed(s), 12, 31);
      k.drawHit(k.hitStyle('b32:fiend-gate', FIRE, { S: 34, spikes: 5, void: true }), add(p, 0, -4), e);
      motes(s, add(p, 0, -8), FIRE, e, 12, 25, 30);
    },
  });

  // Move Earth: broad ochre contour bands roll into stepped terraces, leaving a cut hollow and a raised bank.
  FX.register('move-earth', {
    palette: EARTH,
    travel: 260,
    beats: (e, kit, travel) => [beat(C + travel, 90), beat(C + 560, 90)],
    end: () => 1680,
    ground(s) {
      if (!live(s, 1680)) return;
      const t = s.c.t - C,
        f = Math.min(7, Math.floor(t / 100)),
        q = quad(s);
      floor(s, 'earth-terraces', EARTH, f, (u, v) => {
        const bend = Math.sin(v * Math.PI * 2) * 0.035,
          shift = f / 7,
          edge = 0.14 + shift * 0.4 + bend,
          hollow = u > 0.12 && u < edge - 0.07 && v > 0.1 && v < 0.9;
        if (hollow) return Math.floor((u + v) * 18) % 7 === 0 ? 2 : 1;
        const bank = (u - edge) / 0.32;
        if (bank < 0 || bank > 1 || v < 0.08 || v > 0.92) return -1;
        const terrace = Math.floor(bank * 4),
          rim = (bank * 4) % 1;
        return rim < 0.18 ? 4 : terrace < 2 ? 3 : 2;
      });
      border(q, EARTH, 2);
      for (let i = 0; i < 5; i++) {
        const p = tilePoint(q, 0.7, 0.15 + i * 0.17);
        stroke(add(p, -4, -2), add(p, 3, -2), EARTH, 1, 4);
      }
      s.hits.forEach(h => pulse(s, h, tilePoint(q, h === s.hits[0] ? 0.35 : 0.65, 0.5), EARTH, 25));
    },
    air(s) {
      if (!live(s, 1680)) return;
      const q = quad(s);
      s.hits.forEach((h, i) => {
        const e = s.real(h),
          p = tilePoint(q, i ? 0.65 : 0.35, 0.5);
        k.shards(p, e, EARTH, seed(s) + i, 9, 25);
        motes(s, p, EARTH, e, 8, 26, 8);
      });
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
