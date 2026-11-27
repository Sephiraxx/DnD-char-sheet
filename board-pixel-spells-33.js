/* Pixel spells, batch 33 (see docs/pixel-spells/BRIEF.md). */
(function (root) {
  'use strict';
  const FX = root.BoardPixelFX;
  if (!FX) return;
  const k = FX.kit;
  const C = k.CAST;
  const BRIAR = ['#182016', '#34451e', '#557d2e', '#93b64e', '#d9d69a', '#fff5d3'];
  const ICE = ['#101d32', '#28517e', '#519bcc', '#9edff2', '#e1faff', '#ffffff'];
  const GOLD = ['#2a1c17', '#725127', '#b78a35', '#f4cb65', '#fff0b6', '#fffef2'];
  const GATE = ['#13142b', '#302653', '#60539b', '#a2a4ed', '#d7edff', '#ffffff'];
  const MIND = ['#260e29', '#60214f', '#a83b83', '#ee83c6', '#ffcfec', '#fff5fc'];
  const IRON = ['#201526', '#493149', '#80516c', '#bd8095', '#f1bdc9', '#fff0e5'];
  const BOLT = ['#101630', '#304b91', '#588ed6', '#a2dfff', '#e7fbff', '#ffffff'];
  const HEAL = ['#12251c', '#26694d', '#54b780', '#a1e8a0', '#e5ffd2', '#ffffff'];
  const STEEL = ['#171b30', '#3e4a6c', '#7e94bc', '#bacfe4', '#eef7fa', '#ffffff'];
  const SOUL = ['#19142b', '#453568', '#8266b8', '#bba3ed', '#e9daff', '#ffffff'];
  const BARK = ['#211b17', '#513c28', '#896341', '#bb9558', '#dfc98c', '#fff1c9'];
  const LEAF = ['#11231c', '#27543a', '#48955b', '#8dd286', '#d3f1b1', '#fbffe5'];
  const SIGHT = ['#121f32', '#285780', '#489eb8', '#9bddd8', '#e5fff1', '#ffffff'];
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
  function contact(s, hit) {
    const t = target(s, hit);
    return k.P(k.contact(t, s.pose.hand || s.pose.base || t));
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
    return k.sprite(`b33:${key}:${ramp[1]}`, rows[0].length + 2, rows.length + 2, ramp, set => {
      rows.forEach((row, y) => [...row].forEach((v, x) => v !== '.' && set(x + 1, y + 1, Number(v))));
    });
  }
  // Long strokes and large rings are cached rasters, keeping the live dot budget small.
  function stroke(a, b, ramp, width = 1, index = 3) {
    const dx = Math.round(b.x - a.x),
      dy = Math.round(b.y - a.y),
      pad = width + 2;
    const ox = pad - Math.min(0, dx),
      oy = pad - Math.min(0, dy);
    const img = k.sprite(
      `b33:stroke:${dx}:${dy}:${ramp[1]}:${width}:${index}`,
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
  function ring(p, rx, ry, ramp, index = 3, gap = 0, phase = 0) {
    rx = Math.max(2, Math.round(rx));
    ry = Math.max(2, Math.round(ry));
    const f = gap ? Math.floor(phase) % 8 : 0;
    const img = k.sprite(`b33:ring:${rx}:${ry}:${ramp[1]}:${index}:${gap}:${f}`, rx * 2 + 5, ry * 2 + 5, ramp, set => {
      for (let y = -ry; y <= ry; y++)
        for (let x = -rx; x <= rx; x++) {
          if (Math.abs(Math.hypot(x / rx, y / ry) - 1) * Math.min(rx, ry) > 0.65) continue;
          if (gap && Math.floor(((Math.atan2(y, x) + Math.PI) / k.tau) * gap * 2 + f / 2) % 2) continue;
          set(x + rx + 2, y + ry + 2, index);
        }
    });
    stamp(img, p);
  }
  function impact(s, h, p, ramp, name, size = 28, n = 7) {
    const e = s.real(h);
    k.drawHit(k.hitStyle(`b33:${name}`, ramp, { S: size, spikes: 6, minor: 2, jag: 0.3 }), p, e);
    k.shards(p, e, ramp, seed(s) + h.at, n, size * 0.65);
  }
  function pulse(s, h, p, ramp, radius = 22) {
    const e = s.real(h);
    if (e < 0 || e >= 430) return;
    const q = k.ease(e / 430);
    ring(p, 4 + q * radius, 2 + q * radius * 0.5, ramp, e < 60 ? 5 : 3, e > 260 ? 8 : 0);
  }
  function motes(s, p, ramp, e, n = 9, radius = 18, rise = 22) {
    if (e < 0 || e >= 620) return;
    const q = e / 620;
    for (let i = 0; i < n; i++) {
      if (q > 0.75 && i % 2) continue;
      const a = k.hash(i, seed(s), 33) * k.tau;
      pixel(add(p, Math.cos(a) * (3 + k.ease(q) * radius), Math.sin(a) * radius * 0.4 - q * rise), ramp, i % 2 ? 3 : 4);
    }
  }
  function rune(p, ramp, index = 0) {
    const rows = [
      ['..4..', '.434.', '43.34', '.434.', '..4..'],
      ['4...4', '.4.4.', '..4..', '..4..', '.444.'],
      ['.444.', '.4.4.', '..4..', '.4.4.', '.4.4.'],
    ][index % 3];
    stamp(icon(`rune:${index % 3}`, ramp, rows), p);
  }
  function sigil(p, ramp, t, radius = 18) {
    ring(p, radius, radius * 0.48, ramp, 3);
    ring(p, radius * 0.72, radius * 0.34, ramp, 2, 6, t / 90);
    for (let i = 0; i < 4; i++) {
      const a = (i * k.tau) / 4;
      rune(add(p, Math.cos(a) * radius, Math.sin(a) * radius * 0.48), ramp, i);
    }
  }
  function quad(s, fallbackKind = 'cube', length = 40, width = 40) {
    // Without a board template, keep a centred preview inside the engine's target padding.
    const preview = Math.min(length, 20);
    const a = s.area || {
      kind: fallbackKind,
      feet: preview,
      width,
      x: (s.pose.target || target(s)).x - preview / (s.grid.feet || 5) / 2,
      y: (s.pose.target || target(s)).y,
      dir: 0,
    };
    const outline = k.outline(a, s.grid);
    if (outline.length >= 4) return outline.slice(0, 4).map(p => k.P(Array.isArray(p) ? { x: p[0], y: p[1] } : p));
    const p = k.P(a),
      f = 16 / (s.grid.feet || 5),
      l = a.feet * f;
    const w = (a.kind === 'cube' ? a.feet : a.width || width) * f;
    const ux = Math.cos(a.dir || 0),
      uy = Math.sin(a.dir || 0);
    return [
      add(p, (uy * w) / 2, (-ux * w) / 2),
      add(p, ux * l + (uy * w) / 2, uy * l - (ux * w) / 2),
      add(p, ux * l - (uy * w) / 2, uy * l + (ux * w) / 2),
      add(p, (-uy * w) / 2, (ux * w) / 2),
    ];
  }
  const point = (q, u, v) => ({
    x: q[0].x + (q[1].x - q[0].x) * u + (q[3].x - q[0].x) * v,
    y: q[0].y + (q[1].y - q[0].y) * u + (q[3].y - q[0].y) * v,
  });
  function border(q, ramp, index = 3) {
    q.forEach((p, i) => stroke(p, q[(i + 1) % q.length], ramp, 1, index));
  }
  function wallPanel(ice, height, variant) {
    const ramp = ice ? ICE : BRIAR,
      h = Math.max(4, Math.round(height));
    return k.sprite(`b33:wall:${ice}:${h}:${variant}`, 23, h + 8, ramp, set => {
      for (let y = 2; y < h + 5; y++)
        for (let x = 2; x < 21; x++) {
          if (ice) {
            const top = 3 + Math.abs(x - 9) * 0.23 + (variant % 2);
            if (y < top || y > h + 3) continue;
            const seam = (x + Math.floor(y / 8) * 4 + variant * 3) % 13;
            const index = y < top + 2 ? 5 : seam === 0 ? 1 : seam < 5 ? 3 : 2;
            set(x, y, index);
            if (x === 5 + (Math.floor(y / 5) % 3) && y > 7 && y < h - 2) set(x, y, 4);
          } else {
            const q = y / h,
              braid = 11 + Math.sin(q * 11 + variant) * 5;
            const cross = 11 + Math.sin(q * 11 + variant + Math.PI) * 5;
            if (Math.abs(x - braid) < 2.3 || Math.abs(x - cross) < 1.8) set(x, y, x < braid ? 3 : 2);
            const tooth = (y + variant * 3) % 10;
            const side = Math.floor((y + variant * 3) / 10) % 2 ? -1 : 1;
            const reach = (x - braid) * side;
            if (tooth < 4 && reach >= 1 && reach < 9 - tooth * 2) set(x, y, tooth === 0 ? 5 : 4);
            if ((y + variant * 4) % 15 < 4 && Math.abs(x - cross - 4) < 3) set(x, y, 3);
          }
        }
    });
  }
  function wall(s, ice, loop = false) {
    if (!loop && !live(s, 1480)) return;
    if (loop && (s.c.t < 1480 || s.linger <= 0)) return;
    const t = s.c.t - C,
      q = quad(s, 'wall', 60, ice ? 10 : 5);
    const len = Math.hypot(q[1].x - q[0].x, q[1].y - q[0].y);
    const count = Math.max(2, Math.min(32, Math.ceil(len / 14)));
    const ramp = ice ? ICE : BRIAR;
    border(q, ramp, t < 280 ? 4 : 2);
    const panels = Array.from({ length: count }, (_, i) => ({ p: point(q, (i + 0.5) / count, 0.5), i }));
    panels.sort((a, b) => a.p.y - b.p.y);
    for (const { p, i } of panels) {
      if (loop && k.hash(i, seed(s)) > s.linger) continue;
      const rise = loop ? 1 : k.ease(k.clamp((t - (i % 3) * 28) / 220));
      const h = Math.round(((s.area?.height || 10) / (s.grid.feet || 5)) * 16 * rise);
      const img = wallPanel(ice, h, i % 3);
      k.blit(img, p.x - 11, p.y - img.height + 5);
      if (ice && i % 2 === 0 && t > 230 && t < 850) {
        ring(add(p, 0, 2), 8 + (Math.floor(t / 120) % 3), 3, ICE, 3, 4, t / 100);
      }
    }
  }
  function wallAir(s, ice) {
    if (!live(s, 1480)) return;
    const ramp = ice ? ICE : BRIAR,
      q = quad(s, 'wall', 60, ice ? 10 : 5);
    s.hits.forEach(h => {
      const p = h.id == null ? point(q, 0.5, 0.5) : contact(s, h);
      impact(s, h, p, ramp, ice ? 'ice-wall' : 'thorn-wall', 30);
    });
    for (let i = 0; i < 5; i++) {
      const p = point(q, (i + 0.5) / 5, 0.5);
      k.shards(p, s.real(s.hits[0]) - i * 14, ramp, seed(s) + i, 4, 16);
    }
  }
  function gates(s) {
    const from = s.event.teleport?.from || s.pose.base || s.pose.hand;
    const to = s.event.teleport?.to || s.pose.target || target(s);
    return [feet(from || to), feet(to || from)];
  }
  function portal(p, ramp, t, plants = false, close = false) {
    const stage = Math.min(3, Math.floor(t / 70));
    const rx = close ? 3 : 4 + stage * 3,
      ry = 18;
    const img = k.sprite(`b33:portal:${ramp[1]}:${rx}:${plants}`, rx * 2 + 9, 45, ramp, set => {
      for (let y = -ry; y <= ry; y++)
        for (let x = -rx; x <= rx; x++) {
          const d = Math.hypot(x / rx, y / ry);
          if (d > 1) continue;
          const edge = d > 0.83;
          set(x + rx + 4, y + 21, edge ? (x < 0 ? 4 : 3) : 1);
          if (!edge && (Math.abs(x + y * 0.25) < 1 || Math.abs(x - y * 0.2 + 4) < 0.7)) set(x + rx + 4, y + 21, 2);
        }
    });
    k.blit(img, p.x - rx - 4, p.y - 40);
    if (!close)
      for (let i = 0; i < 6; i++) {
        const a = (i * k.tau) / 6 + Math.floor(t / 100) * 0.15;
        const at = add(p, Math.cos(a) * (rx + 3), -19 + Math.sin(a) * 21);
        if (plants) stamp(icon('portal-leaf', LEAF, ['...4.', '..443', '.443.', '443..', '.3...']), at);
        else rune(at, ramp, i);
      }
  }
  function soul(p, frame = 0) {
    stamp(
      icon(`soul:${frame % 2}`, SOUL, [
        '..444..',
        '.45554.',
        '.44144.',
        '.44444.',
        '..343..',
        '.33333.',
        frame % 2 ? '33.3.33' : '.3.3.3.',
      ]),
      p,
    );
  }
  function eye(p, ramp, open = true) {
    stamp(
      icon(
        `eye:${open}`,
        ramp,
        open
          ? [
              '......44444......',
              '...44433333444...',
              '.44333454333344.',
              '4333345154333334',
              '.44333454333344.',
              '...44433333444...',
              '......44444......',
            ]
          : [
              '.................',
              '.................',
              '..4...........4..',
              '...44444444444...',
              '....4.......4....',
              '.................',
              '.................',
            ],
      ),
      p,
    );
  }
  function mindCage(p, shut) {
    const rx = shut ? 16 : 23;
    ring(add(p, 0, 11), rx, 5, IRON, 2);
    ring(add(p, 0, -15), rx, 5, MIND, 3);
    for (const side of [-1, 1]) {
      stroke(add(p, side * rx, -15), add(p, side * rx, 11), IRON, 2, 2);
      stroke(add(p, side * 8, -17), add(p, side * 8, -6), IRON, 1, 3);
      stamp(icon('illusory-fire', MIND, ['..4..', '.443.', '43433', '43323', '.232.']), add(p, side * (rx + 4), 2));
    }
    eye(add(p, 0, -23), MIND);
  }
  function ward(s, loop = false) {
    if (!loop && !live(s, 1580)) return;
    if (loop && (s.c.t < 1580 || s.linger <= 0)) return;
    const q = quad(s),
      t = s.c.t - C;
    border(q, GOLD, loop ? 2 : t < 280 ? 4 : 3);
    const rows = 6;
    for (let i = 1; i < rows; i++) {
      if (loop && i / rows > s.linger) continue;
      stroke(point(q, i / rows, 0), point(q, i / rows, 1), GOLD, 1, 1);
      stroke(point(q, 0, i / rows), point(q, 1, i / rows), GOLD, 1, 1);
    }
    for (let i = 0; i < 4; i++) {
      const p = point(q, i === 1 || i === 2 ? 0.9 : 0.1, i > 1 ? 0.9 : 0.1);
      sigil(p, GOLD, t, 11);
    }
    const p = point(q, 0.5, 0.5);
    ring(p, 19, 19, GOLD, 3);
    // A barred portal is a planar ward, rather than a damaging explosion filling the cube.
    stamp(
      icon('sealed-door', GOLD, [
        '..44444..',
        '.4333334.',
        '433...334',
        '43.....34',
        '43.....34',
        '43.....34',
        '43.....34',
        '43.....34',
        '444444444',
      ]),
      p,
    );
    stroke(add(p, -12, 12), add(p, 12, -12), GOLD, 2, 4);
  }
  function solar(s, floor = false) {
    if (!live(s, 1240)) return;
    const a = s.area,
      from = a ? k.P(a) : k.P(s.pose.hand || s.pose.base);
    const aim = k.P(s.pose.target || target(s));
    const dir = a?.dir ?? Math.atan2(aim.y - from.y, aim.x - from.x);
    const length = ((a?.feet || 60) / (s.grid.feet || 5)) * 16;
    const t = s.c.t - C,
      ux = Math.cos(dir),
      uy = Math.sin(dir);
    const to = add(from, ux * length, uy * length);
    if (floor) {
      const width = Math.max(3, Math.round(((a?.width || 5) / (s.grid.feet || 5)) * 16));
      if (t < 590) stroke(from, to, GOLD, width, t < 70 ? 4 : 2);
      else
        for (let i = 0; i < 10; i++) {
          if (t > 770 && i % 2) continue;
          const p = add(from, (ux * length * (i + 0.5)) / 10, (uy * length * (i + 0.5)) / 10);
          pixel(p, GOLD, 2);
        }
      return;
    }
    if (t < 580) {
      // Full length on release: a straight shaft, gold bands and a white solar core.
      stroke(from, to, GOLD, t < 100 ? 9 : 7, 3);
      stroke(from, to, GOLD, t < 100 ? 5 : 3, 5);
      for (let i = 0; i < 4; i++) {
        const u = (t / 380 + i / 4) % 1;
        const p = add(from, ux * length * u, uy * length * u);
        ring(p, 3, 7, GOLD, 4);
      }
      orb(from, 6, GOLD, 5);
      for (let i = 0; i < 8; i++) {
        const a = (i * k.tau) / 8;
        stroke(add(from, Math.cos(a) * 9, Math.sin(a) * 9), add(from, Math.cos(a) * 13, Math.sin(a) * 13), GOLD, 1, 4);
      }
    }
    s.hits.forEach(h => impact(s, h, h.id == null ? to : contact(s, h), GOLD, 'sunbeam', 34, 8));
  }
  function lightning(a, b, e, salt) {
    if (e < 0 || e >= 400) return;
    const dx = b.x - a.x,
      dy = b.y - a.y,
      len = Math.hypot(dx, dy) || 1;
    const frame = Math.min(5, Math.floor(e / 40));
    const n = Math.max(3, Math.min(24, Math.ceil(len / 9)));
    const pts = Array.from({ length: n + 1 }, (_, i) => {
      const q = i / n,
        off = i === 0 || i === n ? 0 : (k.hash(i, salt, frame) - 0.5) * 14;
      return add(a, dx * q - (dy / len) * off, dy * q + (dx / len) * off);
    });
    for (let i = 0; i < n; i++) {
      if (e > 220 && i % 3 === 1) continue;
      stroke(pts[i], pts[i + 1], BOLT, e < 90 ? 4 : 2, 3);
      stroke(pts[i], pts[i + 1], BOLT, 1, e < 180 ? 5 : 4);
    }
    if (e < 180)
      for (let i = 2; i < n; i += 4) {
        const p = pts[i],
          side = i % 3 ? 1 : -1;
        stroke(p, add(p, (-dy / len) * 7 * side - (dx / len) * 4, (dx / len) * 7 * side - (dy / len) * 4), BOLT, 1, 4);
      }
  }
  function tree(p, t, close = false) {
    const img = k.sprite('b33:tree-trunk', 43, 49, BARK, set => {
      for (let y = 3; y < 47; y++)
        for (let x = 2; x < 41; x++) {
          const q = y / 47,
            half = q < 0.25 ? 9 + (0.25 - q) * 35 : q > 0.8 ? 9 + (q - 0.8) * 30 : 9;
          if (Math.abs(x - 21) > half) continue;
          const furrow = (x + Math.floor(y / 12) * 2) % 7;
          set(x, y, furrow === 0 ? 1 : x < 21 ? 3 : 2);
        }
    });
    k.blit(img, p.x - 21, p.y - 45);
    portal(p, LEAF, t, true, close);
    for (let i = 0; i < 3; i++) {
      const at = add(p, (i - 1) * 11, -41 + Math.abs(i - 1) * 3);
      stamp(
        icon(`tree-crown:${i}`, LEAF, [
          '.....333333.....',
          '...3344444333...',
          '..344444444333..',
          '.34444444444333.',
          '3444433444443333',
          '3443333444433333',
          '.33333444333333.',
          '..333333333333..',
          '....33333333....',
        ]),
        at,
      );
    }
  }

  // Wall of Thorns: braided green brambles erupt into a dense hedge of huge ivory piercing thorns.
  FX.register('wall-of-thorns', {
    palette: BRIAR,
    travel: 240,
    beats: (e, kit, travel) => ids(e).map(id => beat(C + travel, 130, id, 'hit', 0.07)),
    end: () => 1480,
    reach: (e, grid) => ({ r: (e.area?.feet || 60) / (grid.feet || 5) + 2, up: 4 }),
    ground: s => wall(s, false),
    air: s => wallAir(s, false),
    linger: s => wall(s, false, true),
  });

  // Wall of Ice: a blue-white faceted rampart snaps upward, shedding hard frost chips and cold rings.
  FX.register('wall-of-ice', {
    palette: ICE,
    travel: 240,
    beats: (e, kit, travel) => ids(e).map(id => beat(C + travel, 150, id, 'blast', 0.075)),
    end: () => 1480,
    reach: (e, grid) => ({ r: (e.area?.feet || 60) / (grid.feet || 5) + 2, up: 5 }),
    flash: (e, t) => (t < 35 ? { color: ICE[4], alpha: 0.16 } : t < 70 ? { color: ICE[0], alpha: 0.12 } : null),
    ground: s => wall(s, true),
    air: s => wallAir(s, true),
    linger: s => wall(s, true, true),
  });

  // Word of Recall: golden spoken rings gather the party, lift them in pillars and stamp a sanctuary seal.
  FX.register('word-of-recall', {
    palette: GOLD,
    travel: 330,
    beats: () => [beat(C + 330, 100), beat(C + 660, 90)],
    end: () => 1660,
    ground(s) {
      if (!live(s, 1660)) return;
      const [a, b] = gates(s),
        t = s.c.t - C;
      if (t < 700) sigil(a, GOLD, t, 25);
      if (t >= 540) sigil(b, GOLD, t, 23);
      pulse(s, s.hits[0], a, GOLD, 28);
      pulse(s, s.hits[1], b, GOLD, 23);
      if (t >= 620) {
        stroke(add(b, -9, -2), add(b, 0, -8), GOLD, 1, 4);
        stroke(add(b, 0, -8), add(b, 9, -2), GOLD, 1, 4);
        stroke(add(b, -6, -2), add(b, -6, 5), GOLD, 1, 3);
        stroke(add(b, 6, -2), add(b, 6, 5), GOLD, 1, 3);
      }
    },
    air(s) {
      if (!live(s, 1660)) return;
      const [a, b] = gates(s),
        t = s.c.t - C;
      const group = [
        a,
        ...s.targets
          .filter(v => v.id !== s.event.caster)
          .slice(0, 5)
          .map(feet),
      ];
      group.forEach((p, i) => {
        if (t < 330) ring(add(p, 0, -12), 9 + Math.floor(t / 90), 4, GOLD, 4);
        const e = s.real(s.hits[0]);
        if (e >= 0 && e < 420) {
          const q = k.ease(e / 420),
            at = add(p, 0, -9 - q * 28);
          stroke(add(p, -5, -3), add(p, -5, -18 - q * 18), GOLD, 1, 4);
          stroke(add(p, 5, -3), add(p, 5, -18 - q * 18), GOLD, 1, 4);
          rune(at, GOLD, i);
          k.shards(at, e, GOLD, seed(s) + i, 4, 10);
        }
      });
      impact(s, s.hits[0], add(a, 0, -12), GOLD, 'recall-leave', 22, 5);
      impact(s, s.hits[1], add(b, 0, -12), GOLD, 'recall-arrive', 26, 7);
      motes(s, b, GOLD, s.real(s.hits[1]), 10, 20, 27);
    },
  });

  // Arcane Gate: paired vertical smoky discs open inside lilac rune rims, with motes crossing both thresholds.
  FX.register('arcane-gate', {
    palette: GATE,
    travel: 210,
    beats: () => [beat(C + 210, 90), beat(C + 390, 80)],
    end: () => 1600,
    ground(s) {
      if (!live(s, 1600)) return;
      gates(s).forEach((p, i) => {
        portal(p, GATE, Math.max(0, s.c.t - C - i * 130));
        ring(p, 16, 6, GATE, 2);
        pulse(s, s.hits[i], p, GATE, 20);
      });
    },
    air(s) {
      if (!live(s, 1600)) return;
      gates(s).forEach((p, i) => {
        impact(s, s.hits[i], add(p, 0, -19), GATE, 'gate-open', 24, 6);
        const e = s.real(s.hits[i]);
        if (e >= 120 && e < 730) {
          const q = (e - 120) / 610;
          for (let j = 0; j < 4; j++) {
            const phase = (q + j / 4) % 1;
            pixel(add(p, (i ? -1 : 1) * (15 - phase * 14), -7 - phase * 22), GATE, 4, 2);
          }
        }
      });
    },
    linger(s) {
      if (s.c.t < 1600 || s.linger <= 0) return;
      gates(s).forEach(p => portal(p, GATE, s.c.raw, false, s.linger < 0.4));
    },
  });

  // Mental Prison: a pink psychic eye strikes the mind; illusory iron and rose fire slam shut around it.
  FX.register('mental-prison', {
    palette: MIND,
    travel: 230,
    beats: (e, kit, travel) => [beat(C + travel, 120, ids(e)[0], 'hit', 0.06), beat(C + 460, 70)],
    end: () => 1540,
    ground(s) {
      if (!live(s, 1540)) return;
      const p = feet(target(s));
      ring(p, 18, 7, MIND, 2, 6, s.c.t / 90);
      pulse(s, s.hits[0], p, MIND, 20);
      if (s.c.t >= C + 230) mindCage(add(p, 0, -10), s.c.t >= C + 460);
    },
    air(s) {
      if (!live(s, 1540)) return;
      const p = k.P(target(s)),
        t = s.c.t - C;
      if (t < 230) {
        eye(add(p, 0, -16), MIND);
        for (const side of [-1, 1]) stroke(add(p, side * (20 - t / 20), -5), add(p, side * 7, -5), MIND, 1, 4);
      }
      impact(s, s.hits[0], p, MIND, 'mental-prison', 34, 9);
      impact(s, s.hits[1], add(p, 0, -20), MIND, 'prison-lock', 18, 4);
      if (t >= 460) rune(add(p, 0, -25), MIND, 1);
    },
    linger(s) {
      if (s.c.t < 1540 || s.linger <= 0) return;
      const p = feet(target(s));
      ring(p, 17, 7, MIND, 2, 8, s.c.raw / 180);
      if (s.linger > 0.4) mindCage(add(p, 0, -10), true);
    },
  });

  // Forbiddance: a golden consecrated lattice seals the cube with four wards and a barred planar doorway.
  FX.register('forbiddance', {
    palette: GOLD,
    travel: 320,
    beats: soft,
    end: () => 1580,
    reach: (e, grid) => ({ r: (e.area?.feet || 40) / (grid.feet || 5) + 2, up: 2 }),
    ground: s => ward(s),
    air(s) {
      if (!live(s, 1580)) return;
      const q = quad(s);
      impact(s, s.hits[0], point(q, 0.5, 0.5), GOLD, 'forbiddance', 32, 10);
      for (let i = 0; i < 4; i++) {
        const p = point(q, i === 1 || i === 2 ? 0.9 : 0.1, i > 1 ? 0.9 : 0.1);
        motes(s, p, GOLD, s.real(s.hits[0]) - i * 25, 4, 9, 20);
      }
    },
    linger: s => ward(s, true),
  });

  // Sunbeam: an instant sixty-foot gold-white shaft of sunlight sears the line with hard radiant starbursts.
  FX.register('sunbeam', {
    palette: GOLD,
    travel: 40,
    beats: (e, kit, travel) => ids(e).map(id => beat(C + travel, 150, id, 'beam', 0.075)),
    end: () => 1240,
    flash: (e, t) => (t < 35 ? { color: GOLD[4], alpha: 0.22 } : t < 75 ? { color: GOLD[0], alpha: 0.15 } : null),
    ground: s => solar(s, true),
    air: s => solar(s),
  });

  // Magic Jar: the caster's violet soul streams into a crystal vessel; a gold lid snaps over the trapped light.
  FX.register('magic-jar', {
    palette: SOUL,
    travel: 470,
    beats: soft,
    end: () => 1550,
    ground(s) {
      if (!live(s, 1550)) return;
      const p = caster(s);
      ring(p, 17, 7, SOUL, 2, 6, s.c.t / 110);
      pulse(s, s.hits[0], p, SOUL, 16);
    },
    air(s) {
      if (!live(s, 1550)) return;
      const t = s.c.t - C,
        from = add(caster(s), 0, -16);
      const jar = add(k.P(s.pose.hand || s.pose.base || target(s)), 12, -9);
      stamp(
        icon('crystal-vessel', GATE, [
          '....444....',
          '...43334...',
          '..43...34..',
          '.43.....34.',
          '43.......34',
          '43.......34',
          '43.......34',
          '43.......34',
          '.43.....34.',
          '..4333334..',
          '...44444...',
        ]),
        jar,
      );
      if (t < 470) {
        const q = k.clamp(t / 470);
        const path = u => ({ x: k.mix(from.x, jar.x, u), y: k.mix(from.y, jar.y, u) - Math.sin(u * Math.PI) * 17 });
        for (let i = 1; i <= 7; i++) {
          const u = q - i * 0.055;
          if (u > 0) pixel(path(u), SOUL, i < 4 ? 4 : 2, i < 4 ? 2 : 1);
        }
        soul(path(q), Math.floor(t / 90));
      } else {
        orb(add(jar, 0, 1), 3, SOUL, 4);
        stamp(icon('jar-lid', GOLD, ['.44444.', '4333334', '.44444.']), add(jar, 0, -7));
        rune(add(jar, 0, -16), SOUL, 0);
      }
      impact(s, s.hits[0], jar, SOUL, 'jar-seal', 24, 7);
      motes(s, jar, SOUL, s.real(s.hits[0]), 7, 13, 19);
    },
  });

  // Chain Lightning: a blue-white bolt hits once, then three jagged forks leap from that first victim to the rest.
  FX.register('chain-lightning', {
    palette: BOLT,
    travel: 80,
    beats: (e, kit, travel) =>
      ids(e)
        .slice(0, 4 + Math.max(0, Math.min(9, e.slot || e.level || 6) - 6))
        .map((id, i) => beat(C + travel + (i ? 170 : 0), i ? 100 : 130, id, 'beam', 0.08)),
    end: () => 1280,
    flash: (e, t) => (t < 30 ? { color: BOLT[4], alpha: 0.2 } : t < 65 ? { color: BOLT[0], alpha: 0.14 } : null),
    ground(s) {
      if (!live(s, 1280)) return;
      s.hits.forEach(h => pulse(s, h, feet(target(s, h)), BOLT, 16));
    },
    air(s) {
      if (!live(s, 1280)) return;
      const first = contact(s, s.hits[0]);
      s.hits.forEach((h, i) => {
        const p = contact(s, h),
          from = i ? first : k.P(s.pose.hand || s.pose.base || target(s));
        // The first frame is full length; subsequent forks share one punchy branching beat.
        const release = h.at - 80,
          e = s.c.t < h.at ? s.c.t - release : 80 + s.real(h);
        lightning(from, p, e, seed(s) + i * 19);
        impact(s, h, p, BOLT, 'chain-lightning', i ? 30 : 36, 8);
      });
    },
  });

  // Heal: twin green-gold ribbons climb the body, close a bright healing cross and release clean rising sparks.
  FX.register('heal', {
    palette: HEAL,
    travel: 320,
    beats: (e, kit, travel) => [beat(C + travel, 110, ids(e)[0])],
    end: () => 1440,
    ground(s) {
      if (!live(s, 1440)) return;
      s.hits.forEach(h => {
        const p = feet(target(s, h));
        ring(p, 18, 8, HEAL, 3, 6, s.c.t / 100);
        pulse(s, h, p, GOLD, 23);
      });
    },
    air(s) {
      if (!live(s, 1440)) return;
      s.hits.forEach(h => {
        const p = feet(target(s, h)),
          t = s.c.t - C;
        if (t < 610)
          for (let i = 0; i < 10; i++) {
            const q = (t / 480 + i / 10) % 1,
              angle = q * k.tau * 1.5;
            for (const side of [-1, 1])
              pixel(add(p, Math.cos(angle) * 11 * side, -q * 34), side === 1 ? HEAL : GOLD, 4, 2);
          }
        const e = s.real(h),
          at = add(p, 0, -18);
        if (e >= 0 && e < 620)
          stamp(
            icon('heal-cross', HEAL, [
              '...444...',
              '...454...',
              '...454...',
              '444454444',
              '455555554',
              '444454444',
              '...454...',
              '...454...',
              '...444...',
            ]),
            add(at, 0, -k.ease(e / 620) * 9),
          );
        impact(s, h, at, HEAL, 'heal', 26, 6);
        motes(s, p, HEAL, e, 10, 21, 35);
      });
    },
  });

  // Mass Suggestion: rose-gold spoken glyphs fan to many heads and settle into quiet, entrancing thought rings.
  FX.register('mass-suggestion', {
    palette: MIND,
    travel: 300,
    beats: (e, kit, travel) =>
      ids(e)
        .slice(0, 12)
        .map((id, i) => beat(C + travel + Math.floor(i / 4) * 80, 65, id)),
    end: () => 1580,
    ground(s) {
      if (!live(s, 1580)) return;
      s.hits.forEach(h => pulse(s, h, feet(target(s, h)), MIND, 14));
    },
    air(s) {
      if (!live(s, 1580)) return;
      const from = k.P(s.pose.hand || s.pose.base || target(s)),
        t = s.c.t - C;
      if (t < 480) {
        ring(add(from, 5, -3), 5 + Math.floor(t / 85), 6, GOLD, 3, 4, t / 100);
        rune(add(from, 8, -6), GOLD, 1);
      }
      s.hits.forEach((h, i) => {
        const p = add(k.P(target(s, h)), 0, -13),
          arrive = h.at - C;
        if (t < arrive) {
          const q = k.clamp(t / arrive),
            bend = ((i % 3) - 1) * 7 - 8;
          const path = u => ({ x: k.mix(from.x, p.x, u), y: k.mix(from.y, p.y, u) + Math.sin(u * Math.PI) * bend });
          for (let j = 1; j < 5; j++) if (q > j * 0.05) pixel(path(q - j * 0.05), MIND, 2);
          rune(path(q), i % 2 ? GOLD : MIND, i);
        }
        const e = s.real(h);
        if (e >= 0 && e < 760) {
          ring(p, 10, 5, MIND, 3, e > 560 ? 5 : 0, e / 90);
          rune(add(p, 0, -6), GOLD, 1);
        }
        impact(s, h, p, MIND, 'suggestion', 18, 4);
      });
    },
  });

  // Tenser's Transformation: violet strength surges into silver spectral armor and a pair of crossed battle blades.
  FX.register('tensers-transformation', {
    palette: SOUL,
    travel: 300,
    beats: (e, kit, travel) => [beat(C + travel, 120, e.caster ?? null), beat(C + 510, 85, e.caster ?? null)],
    end: () => 1580,
    ground(s) {
      if (!live(s, 1580)) return;
      const p = caster(s);
      sigil(p, SOUL, s.c.t, 22);
      s.hits.forEach(h => pulse(s, h, p, STEEL, 23));
    },
    air(s) {
      if (!live(s, 1580)) return;
      const p = caster(s),
        t = s.c.t - C,
        q = k.ease(k.clamp(t / 300));
      for (const side of [-1, 1]) {
        const at = add(p, side * (26 - q * 15), -18);
        stamp(
          icon(`tenser-pauldron:${side}`, STEEL, [
            '..44444..',
            '.4555544.',
            '453333234',
            '433332234',
            '.4332234.',
            '..42234..',
          ]),
          at,
        );
        if (t > 250) {
          stroke(add(p, side * 8, -17), add(p, side * 10, -5), STEEL, 2, 3);
          rune(add(p, side * 17, -8), SOUL, 0);
        }
        impact(s, s.hits[0], at, STEEL, 'tenser-armor', 18, 5);
      }
      if (t >= 300) {
        const top = add(p, 0, -35);
        for (const side of [-1, 1]) {
          stroke(add(top, -side * 9, 9), add(top, side * 10, -9), STEEL, 3, 3);
          stroke(add(top, -side * 9, 9), add(top, side * 10, -9), STEEL, 1, 5);
          stroke(add(top, -side * 10, 2), add(top, -side * 3, 9), GOLD, 2, 3);
        }
        rune(add(p, 0, -18), SOUL, 1);
        impact(s, s.hits[1], top, SOUL, 'tenser-blades', 28, 8);
      }
      motes(s, p, SOUL, s.real(s.hits[0]), 12, 22, 37);
    },
  });

  // Transport via Plants: two great bark trunks split into green living doors; leaf silhouettes cross between them.
  FX.register('transport-via-plants', {
    palette: LEAF,
    travel: 260,
    beats: () => [beat(C + 260, 100), beat(C + 590, 90)],
    end: () => 1720,
    ground(s) {
      if (!live(s, 1720)) return;
      const t = s.c.t - C;
      gates(s).forEach((p, i) => {
        tree(p, Math.max(0, t - i * 140));
        for (const side of [-1, 1]) stroke(add(p, side * 7, -3), add(p, side * 21, 5), BARK, 3, 2);
        pulse(s, s.hits[i], p, LEAF, 23);
      });
    },
    air(s) {
      if (!live(s, 1720)) return;
      gates(s).forEach((p, i) => {
        const e = s.real(s.hits[i]);
        impact(s, s.hits[i], add(p, 0, -20), LEAF, 'tree-door', 26, 7);
        if (e >= 100 && e < 700) {
          const q = (e - 100) / 600;
          for (let j = 0; j < 7; j++) {
            const u = (q + j / 7) % 1;
            const at = add(p, (i ? 1 : -1) * (22 - u * 20), -5 - u * 30);
            stamp(icon('travelling-leaf', LEAF, ['...4.', '..443', '.443.', '443..', '.3...']), at);
          }
        }
      });
    },
    linger(s) {
      if (s.c.t < 1720 || s.linger <= 0) return;
      gates(s).forEach(p => tree(p, s.c.raw, s.linger < 0.4));
    },
  });

  // True Seeing: a turquoise-gold eye opens above the brow, splitting a violet false mask into falling fragments.
  FX.register('true-seeing', {
    palette: SIGHT,
    travel: 300,
    beats: (e, kit, travel) => [beat(C + travel, 90, ids(e)[0])],
    end: () => 1430,
    ground(s) {
      if (!live(s, 1430)) return;
      s.hits.forEach(h => {
        const p = feet(target(s, h));
        ring(p, 18, 8, SIGHT, 3, 8, s.c.t / 120);
        pulse(s, h, p, GOLD, 22);
      });
    },
    air(s) {
      if (!live(s, 1430)) return;
      s.hits.forEach(h => {
        const p = add(k.P(target(s, h)), 0, -17),
          e = s.real(h);
        eye(p, SIGHT, s.c.t >= h.at);
        if (e < 0) {
          for (const side of [-1, 1]) stroke(add(p, side * 4, -5), add(p, side * 5, 5), SOUL, 2, 2);
        } else {
          if (e < 450)
            for (const side of [-1, 1]) {
              const at = add(p, side * (5 + k.ease(e / 450) * 15), (e / 450) ** 2 * 16);
              stroke(add(at, 0, -4), add(at, side * 2, 3), SOUL, 2, 2);
            }
          ring(p, 15, 12, GOLD, 3, 8, e / 90);
          for (let i = 0; i < 3; i++) rune(add(p, (i - 1) * 12, -14 + Math.abs(i - 1) * 5), GOLD, i);
        }
        impact(s, h, p, SIGHT, 'true-seeing', 24, 7);
        motes(s, p, SIGHT, e, 7, 20, 15);
      });
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
