/* Pixel spells, batch 29 (see docs/pixel-spells/BRIEF.md). */
(function (root) {
  'use strict';
  const FX = root.BoardPixelFX;
  if (!FX) return;
  const k = FX.kit;
  const C = k.CAST;
  const FORCE = ['#10142f', '#293a7b', '#527dd1', '#9acbfa', '#e1f6ff', '#ffffff'];
  const GOLD = ['#30200e', '#815222', '#c88c32', '#f4cb63', '#fff2bc', '#ffffff'];
  const MIND = ['#260e2d', '#67295d', '#ad4d9b', '#e88ad2', '#ffdef6', '#ffffff'];
  const LEAF = ['#132216', '#325329', '#648a39', '#a4c956', '#e4efa6', '#fff9da'];
  const STONE = ['#202127', '#454650', '#70747b', '#a2a6ac', '#d7d8d2', '#fff4dd'];
  const HELL = ['#270d15', '#651e2c', '#ad3834', '#ed763f', '#ffc478', '#fff1cb'];
  const VOID = ['#100c1c', '#24162f', '#4b2b60', '#8e62aa', '#d1b7dd', '#f6e8ff'];
  const MIST = ['#142134', '#344d69', '#678caa', '#a6d1de', '#deeff0', '#ffffff'];
  const BUG = ['#242019', '#51432c', '#8e7646', '#c7ad6c', '#eee0a1', '#fff8d7'];
  const THUNDER = ['#171b2a', '#3d4b62', '#748eaa', '#b7d3e6', '#edf6ff', '#ffffff'];
  const seed = s => s.event.seed || 0;
  const ids = event => (event.targets?.length ? event.targets : [null]);
  const beat = (at, stop, target = null, kind = 'soft', power = 0.05) => ({ at, stop, target, kind, power });
  const target = (s, h = s.hits[0]) =>
    s.targets.find(t => t.id === h?.id) ||
    s.targets[0] ||
    s.pose.target ||
    s.pose.base ||
    s.pose.hand || { x: 0, y: 0 };
  const centre = s => k.P(s.area || s.pose.target || target(s));
  const feet = p => k.P({ x: p.baseX ?? p.x, y: p.baseY ?? p.y });
  const caster = s => feet(s.pose.base || s.pose.hand || target(s));
  const offset = (p, x, y) => ({ x: p.x + x, y: p.y + y });
  const radius = (s, ft) => ((s.area?.feet || ft) / (s.grid.feet || 5)) * 16;
  const live = (s, end) => s.c.t >= C && s.c.t < end;
  const flash = (event, e) =>
    e < 30 ? { color: '#fff5de', alpha: 0.2 } : e < 65 ? { color: '#17101f', alpha: 0.15 } : null;

  function pixel(p, ramp, color = 3, size = 1) {
    k.dot(p.x, p.y, ramp[0], size + 2);
    k.dot(p.x, p.y, ramp[color], size);
  }
  function orb(p, r, ramp, color = 3) {
    k.disc(p.x, p.y, r + 1, ramp[0]);
    k.disc(p.x, p.y, r, ramp[color]);
    if (r > 2) k.disc(p.x - 1, p.y - 1, Math.max(1, r * 0.4), ramp[4]);
  }
  function stamp(img, p) {
    k.blit(img, p.x - img.width / 2, p.y - img.height / 2);
  }
  function rect(set, x, y, w, h, color) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) set(i, j, color);
  }
  function line(set, a, b, color, width = 1) {
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1])));
    for (let i = 0; i <= n; i++)
      rect(set, Math.round(k.mix(a[0], b[0], i / n)), Math.round(k.mix(a[1], b[1], i / n)), width, width, color);
  }
  function polygon(set, points, color) {
    const minX = Math.floor(Math.min(...points.map(p => p[0]))),
      maxX = Math.ceil(Math.max(...points.map(p => p[0])));
    const minY = Math.floor(Math.min(...points.map(p => p[1]))),
      maxY = Math.ceil(Math.max(...points.map(p => p[1])));
    for (let y = minY; y <= maxY; y++)
      for (let x = minX; x <= maxX; x++) {
        let inside = false;
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
          const a = points[i],
            b = points[j];
          if (a[1] > y !== b[1] > y && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) inside = !inside;
        }
        if (inside) set(x, y, color);
      }
  }
  function icon(name, ramp, rows) {
    return k.sprite(
      'b29:' + name + ':' + ramp[2],
      Math.max(...rows.map(row => row.length)) + 2,
      rows.length + 2,
      ramp,
      set => {
        rows.forEach((row, y) => {
          for (let x = 0; x < row.length; x++) if (row[x] !== '.') set(x + 1, y + 1, Number(row[x]));
        });
      },
    );
  }
  // Cached pixel strokes and rings keep large walls and 30-foot circles cheap.
  function stroke(a, b, ramp, color = 3, width = 1) {
    const dx = Math.round(b.x - a.x),
      dy = Math.round(b.y - a.y),
      pad = width + 2;
    const img = k.sprite(
      `b29:line:${dx}:${dy}:${ramp[2]}:${color}:${width}`,
      Math.abs(dx) + pad * 2 + 1,
      Math.abs(dy) + pad * 2 + 1,
      ramp,
      set => {
        line(
          set,
          [pad + Math.max(0, -dx), pad + Math.max(0, -dy)],
          [pad + Math.max(0, dx), pad + Math.max(0, dy)],
          color,
          width,
        );
      },
    );
    k.blit(img, Math.min(a.x, b.x) - pad, Math.min(a.y, b.y) - pad);
  }
  function ring(p, rx, ry, ramp, color = 3, gaps = 0, phase = 0) {
    rx = Math.max(2, Math.round(rx));
    ry = Math.max(2, Math.round(ry));
    phase = Math.floor(phase) % 2;
    const img = k.sprite(
      `b29:ring:${rx}:${ry}:${ramp[2]}:${color}:${gaps}:${phase}`,
      rx * 2 + 6,
      ry * 2 + 6,
      ramp,
      set => {
        const n = Math.ceil(k.tau * Math.max(rx, ry));
        for (let i = 0; i < n; i++) {
          if (gaps && (Math.floor((i / n) * gaps * 2) + phase) % 2) continue;
          const a = (i / n) * k.tau;
          set(rx + 3 + Math.cos(a) * rx, ry + 3 + Math.sin(a) * ry, color);
        }
      },
    );
    stamp(img, p);
  }
  function impact(s, h, p, ramp, name, size = 30, count = 7) {
    const e = s.real(h);
    k.drawHit(
      k.hitStyle('b29:' + name + ':' + ramp[2], ramp, { S: size, spikes: 6, minor: 2, jag: 0.3, void: ramp === VOID }),
      p,
      e,
    );
    k.shards(p, e, ramp, seed(s) + s.hits.indexOf(h) * 31, count, size * 0.75);
  }
  function pulse(s, p, ramp, size = 20) {
    const e = s.real(s.hits[0]);
    if (e < 0 || e > 420) return;
    const q = k.ease(e / 420);
    ring(p, size * (0.4 + q), size * (0.2 + q * 0.5), ramp, e < 55 ? 5 : 3, e > 190 ? 8 : 0);
  }
  function rune(p, ramp, time, infernal = false) {
    ring(p, 24, 12, ramp, 3);
    ring(p, 18, 9, ramp, 2, 8, time / 180);
    if (infernal) {
      const points = Array.from({ length: 5 }, (_, i) => ({
        x: p.x + Math.cos((i * k.tau) / 5 - Math.PI / 2) * 20,
        y: p.y + Math.sin((i * k.tau) / 5 - Math.PI / 2) * 10,
      }));
      points.forEach((v, i) => stroke(v, points[(i + 2) % 5], ramp, 4));
    } else
      for (let i = 0; i < 6; i++) {
        const a = (i * k.tau) / 6;
        pixel(offset(p, Math.cos(a) * 24, Math.sin(a) * 12), ramp, 4, 2);
      }
  }
  function dragonRamp(event) {
    // Honour an elemental spirit's chosen breath; a sapphire spirit is the neutral preview.
    return event.element && event.element !== 'magic' ? k.paletteFor(event).slice(0, 6) : FORCE;
  }
  function dragon(ramp, frame) {
    return k.sprite(`b29:dragon:${ramp[2]}:${frame}`, 67, 55, ramp, set => {
      const lift = frame ? 5 : 0;
      polygon(
        set,
        [
          [30, 25],
          [13, 8 - lift],
          [3, 5],
          [9, 25],
          [16, 20],
          [22, 31],
        ],
        2,
      );
      polygon(
        set,
        [
          [36, 25],
          [53, 8 - lift],
          [63, 5],
          [57, 25],
          [50, 20],
          [44, 31],
        ],
        2,
      );
      line(set, [30, 25], [13, 8 - lift], 4);
      line(set, [13, 8 - lift], [9, 25], 3);
      line(set, [36, 25], [53, 8 - lift], 4);
      line(set, [53, 8 - lift], [57, 25], 3);
      polygon(
        set,
        [
          [27, 23],
          [39, 23],
          [43, 36],
          [36, 43],
          [26, 40],
          [23, 32],
        ],
        3,
      );
      polygon(
        set,
        [
          [30, 26],
          [36, 26],
          [38, 38],
          [32, 41],
          [28, 35],
        ],
        4,
      );
      line(set, [30, 40], [23, 48], 2, 3);
      line(set, [23, 48], [9, 47], 3, 2);
      line(set, [9, 47], [5, 41], 4);
      polygon(
        set,
        [
          [28, 26],
          [27, 12],
          [31, 6],
          [39, 9],
          [45, 17],
          [40, 22],
          [35, 20],
          [35, 29],
        ],
        3,
      );
      rect(set, 36, 15, 11, 5, 4);
      rect(set, 41, 19, 5, 2, 2);
      line(set, [29, 10], [25, 3], 5);
      line(set, [36, 10], [39, 3], 5);
      rect(set, 36, 12, 3, 2, 1);
      set(37, 12, 5);
      for (let i = 0; i < 4; i++) rect(set, 27 + (i % 2), 25 + i * 3, 2, 2, 2);
      line(set, [26, 35], [22, 43], 2, 3);
      line(set, [39, 35], [44, 43], 2, 3);
      line(set, [22, 44], [16, 44], 5);
      line(set, [44, 44], [50, 44], 5);
    });
  }
  function devil(frame) {
    return k.sprite(`b29:devil:${frame}`, 47, 58, HELL, set => {
      polygon(
        set,
        [
          [18, 16],
          [29, 16],
          [34, 35],
          [26, 39],
          [15, 33],
        ],
        2,
      );
      polygon(
        set,
        [
          [20, 19],
          [26, 19],
          [29, 30],
          [21, 33],
        ],
        3,
      );
      rect(set, 20, 7, 10, 10, 3);
      rect(set, 23, 14, 4, 5, 2);
      line(set, [21, 8], [16, 2], 4, 2);
      line(set, [29, 8], [34, 2], 4, 2);
      rect(set, 21, 10, 3, 1, 5);
      rect(set, 27, 10, 2, 1, 5);
      line(set, [19, 22], [9, 31], 3, 3);
      line(set, [29, 22], [37, 29], 3, 3);
      line(set, [20, 36], [16, 49], 2, 4);
      line(set, [27, 36], [30, 49], 2, 4);
      rect(set, 12, 49, 8, 3, 1);
      rect(set, 30, 49, 8, 3, 1);
      line(set, [29, 35], [40, 43 + frame], 2, 2);
      line(set, [40, 43 + frame], [43, 34], 3);
      polygon(
        set,
        [
          [40, 34],
          [46, 30],
          [45, 38],
        ],
        3,
      );
      line(set, [8, 20], [8, 48], 4);
      line(set, [4, 18], [8, 24], 3);
      line(set, [12, 18], [8, 24], 3);
      for (let i = 0; i < 3; i++) rect(set, 22, 23 + i * 3, 4, 1, 4);
    });
  }
  function hand(closed) {
    return k.sprite('b29:hand:' + closed, 43, 53, FORCE, set => {
      rect(set, 12, 25, 22, 18, 3);
      rect(set, 14, 27, 7, 13, 4);
      polygon(
        set,
        [
          [13, 27],
          [7, 22],
          [3, 24],
          [8, 38],
          [15, 41],
        ],
        3,
      );
      for (let i = 0; i < 4; i++) {
        const x = 12 + i * 6,
          y = closed ? 18 + (i % 2) : 6 + Math.abs(i - 1) * 3;
        rect(set, x, y, 5, 28 - y, i % 2 ? 3 : 4);
        rect(set, x + 1, y + 1, 2, closed ? 3 : 9, 5);
        if (closed) rect(set, x, 24, 4, 2, 2);
      }
      rect(set, 17, 42, 13, 6, 2);
      rect(set, 19, 43, 3, 5, 4);
      line(set, [19, 33], [28, 31], 2);
      line(set, [21, 36], [27, 38], 2);
    });
  }
  function summon(s, name) {
    if (!live(s, 1460)) return;
    const p = centre(s),
      t = s.c.t - C,
      ramp = name === 'dragon' ? s.ramp : name === 'devil' ? HELL : FORCE;
    if (t < 650) rune(p, ramp, s.c.raw, name === 'devil');
    if (t < 240) {
      for (let i = 0; i < 8; i++) {
        const a = (i * k.tau) / 8 + t / 180,
          r = 23 * (1 - t / 300);
        pixel(offset(p, Math.cos(a) * r, Math.sin(a) * r * 0.5 - t / 12), ramp, i % 2 ? 4 : 3, 2);
      }
      return;
    }
    const q = k.back(k.clamp((t - 240) / 200)),
      bob = Math.round(Math.sin(t / 150) * 2);
    const img =
      name === 'dragon'
        ? dragon(ramp, Math.floor(t / 150) % 2)
        : name === 'devil'
          ? devil(Math.floor(t / 200) % 2)
          : hand(t < 410);
    k.blit(img, p.x - img.width / 2, p.y - img.height + 5 + (1 - q) * 25 + bob);
    if (t > 780) ring(p, 17, 8, ramp, 2, 10);
  }
  function summonAir(s, ramp, name) {
    if (!live(s, 1460)) return;
    const p = centre(s);
    pulse(s, p, ramp, 24);
    impact(s, s.hits[0], offset(p, 0, -14), ramp, name, 36, 10);
  }
  function corners(s, fallback = 60) {
    if (s.area) {
      const points = k.outline(s.area, s.grid);
      if (points.length >= 4) return points.slice(0, 4).map(p => k.P(Array.isArray(p) ? { x: p[0], y: p[1] } : p));
    }
    const p = centre(s),
      r = radius(s, fallback) / 2;
    return [offset(p, -r, -r), offset(p, r, -r), offset(p, r, r), offset(p, -r, r)];
  }
  function patchPoint(points, u, v) {
    return {
      x: k.mix(k.mix(points[0].x, points[1].x, u), k.mix(points[3].x, points[2].x, u), v),
      y: k.mix(k.mix(points[0].y, points[1].y, u), k.mix(points[3].y, points[2].y, u), v),
    };
  }
  function tree(frame) {
    return k.sprite('b29:tree:' + frame, 29, 40, LEAF, set => {
      polygon(
        set,
        [
          [12, 34],
          [13, 14],
          [17, 11],
          [17, 32],
          [24, 37],
          [16, 35],
          [7, 38],
        ],
        1,
      );
      line(set, [15, 24], [6, 16 - frame * 3], 2, 2);
      line(set, [16, 20], [25, 10 + frame * 3], 2, 2);
      polygon(
        set,
        [
          [3, 13],
          [8, 6],
          [16, 3],
          [25, 7],
          [27, 17],
          [20, 20],
          [15, 16],
          [8, 20],
        ],
        2,
      );
      polygon(
        set,
        [
          [5, 12],
          [11, 6],
          [18, 6],
          [23, 11],
          [18, 14],
          [11, 12],
        ],
        3,
      );
      line(set, [15, 32], [15, 19], 3);
    });
  }
  function wallEnds(s, ft) {
    if (s.area) {
      const a = corners(s, ft);
      return [patchPoint(a, 0, 0.5), patchPoint(a, 1, 0.5)];
    }
    const p = centre(s),
      length = (ft / (s.grid.feet || 5)) * 16;
    return [offset(p, -length / 2, 0), offset(p, length / 2, 0)];
  }
  function wall(s, type, loop = false) {
    if (!loop && !live(s, 1490)) return;
    const ramp = type === 'stone' ? STONE : type === 'light' ? GOLD : FORCE;
    const [a, b] = wallEnds(s, type === 'stone' ? 60 : 60),
      t = s.c.t - C;
    const n = Math.max(1, Math.min(16, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 16)));
    const fullHeight = Math.max(
      16,
      Math.min(64, ((s.area?.height || (type === 'stone' ? 10 : 10)) / (s.grid.feet || 5)) * 16),
    );
    for (let i = 0; i < n; i++) {
      const age = t - i * 18;
      if (!loop && age < 0) continue;
      const h = Math.round(fullHeight * (loop ? 1 : k.ease(k.clamp(age / 230))));
      if (h < 2) continue;
      const p = { x: k.mix(a.x, b.x, i / n), y: k.mix(a.y, b.y, i / n) };
      const dx = Math.round((b.x - a.x) / n),
        dy = Math.round((b.y - a.y) / n),
        pad = 3;
      const phase = type === 'stone' ? 0 : Math.floor(s.c.raw / 120) % 3;
      const img = k.sprite(
        `b29:wall:${type}:${dx}:${dy}:${h}:${i % 2}:${phase}`,
        Math.abs(dx) + 7,
        Math.abs(dy) + h + 7,
        ramp,
        set => {
          const x0 = pad + Math.max(0, -dx),
            y0 = pad + h + Math.max(0, -dy);
          const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy)));
          for (let u = 0; u <= steps; u++) {
            const x = Math.round(x0 + (dx * u) / steps),
              y = Math.round(y0 + (dy * u) / steps);
            for (let v = 0; v <= h; v++) {
              let color;
              if (type === 'stone')
                color =
                  v === h ? 4 : v % 9 === 0 || (u + (Math.floor(v / 9) % 2) * 7) % 16 === 0 ? 1 : v % 9 > 6 ? 2 : 3;
              else if (type === 'light') {
                if ((u + phase * 2) % 7 > 3 && v > 2 && v < h - 2) continue;
                color = v > h - 3 || (u + phase) % 7 === 0 ? 5 : u % 3 ? 4 : 3;
              } else {
                // Invisible force: only a thin boundary and sparse refracting facets.
                if (v !== 0 && v !== h && u !== 0 && u !== steps && (u + v + phase * 4) % 23 !== 0) continue;
                color = v === h ? 4 : 2;
              }
              set(x, y - v, color);
            }
          }
        },
      );
      k.blit(img, Math.min(p.x, p.x + dx) - pad, Math.min(p.y, p.y + dy) - h - pad, loop ? s.linger : 1);
    }
  }
  function wallAir(s, type) {
    if (!live(s, 1490)) return;
    const ramp = type === 'stone' ? STONE : type === 'light' ? GOLD : FORCE;
    const [a, b] = wallEnds(s, 60),
      e = s.real(s.hits[0]);
    if (e >= 0 && e < 450)
      for (let i = 0; i < 6; i++) {
        const p = { x: k.mix(a.x, b.x, (i + 0.5) / 6), y: k.mix(a.y, b.y, (i + 0.5) / 6) };
        k.shards(p, e - i * 12, ramp, seed(s) + i * 13, 3, type === 'stone' ? 18 : 12);
      }
    if (type === 'light') for (const h of s.hits) impact(s, h, k.P(target(s, h)), GOLD, 'radiant-wall', 28, 4);
    else impact(s, s.hits[0], { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - 12 }, ramp, type + '-wall', 28, 5);
  }
  function memoryTile(p, frame) {
    stamp(
      icon(
        'memory:' + frame,
        MIND,
        frame
          ? ['333333333', '344444443', '345554443', '344454443', '344455543', '344444443', '333333333']
          : ['333333333', '344444443', '344434443', '344333443', '343333343', '344444443', '333333333'],
      ),
      p,
    );
  }
  function locust(p, frame, angle = 0) {
    const img = icon(
      'locust:' + frame,
      BUG,
      frame
        ? ['4...4..', '.4.4...', '..323..', '.33233.', '4.121.4', '..2.2..', '.2...2.']
        : ['.......', '44...44', '.43234.', '..323..', '.31213.', '2.2.2.2', '.......'],
    );
    k.blitRotated(img, p.x, p.y, angle);
  }
  function plague(s, loop = false) {
    if (!loop && !live(s, 1690)) return;
    const p = centre(s),
      r = radius(s, 20),
      t = s.c.t - C;
    const grow = loop ? 1 : k.ease(k.clamp(t / 280));
    const frame = Math.floor(s.c.raw / 160) % 3;
    const img = k.sprite(
      `b29:swarm:${Math.round(r)}:${frame}`,
      Math.ceil(r * 2 + 8),
      Math.ceil(r * 2 + 8),
      BUG,
      set => {
        const c = r + 4;
        for (let i = 0; i < 100; i++) {
          const a = k.hash(i, 29) * k.tau,
            d = Math.sqrt(k.hash(i, 41)) * r;
          const x = Math.round(c + Math.cos(a) * d),
            y = Math.round(c + Math.sin(a) * d);
          rect(set, x, y, 2, 1, (i + frame) % 3 ? 1 : 2);
        }
      },
    );
    if (t >= 240 || loop) k.blit(img, p.x - img.width / 2, p.y - img.height / 2, loop ? s.linger : 1);
    ring(p, r * grow, r * grow, BUG, 2, 18, frame);
  }

  // Summon Draconic Spirit: a jewelled dragon unfolds ribbed wings above an elemental seal.
  FX.register('summon-draconic-spirit', {
    palette: dragonRamp,
    travel: 240,
    beats: () => [beat(C + 240, 105)],
    end: () => 1460,
    ground: s => summon(s, 'dragon'),
    air: s => summonAir(s, s.ramp, 'dragon-arrival'),
    reach: () => ({ r: 3, up: 4 }),
  });

  // Wrath of Nature: grasping grass, lashing trees and hurled rocks awaken across the cube.
  FX.register('wrath-of-nature', {
    palette: LEAF,
    travel: 240,
    beats: event =>
      [240, 480, 720].flatMap((delay, i) =>
        ids(event).map(id => beat(C + delay, [80, 100, 125][i], id, i === 0 ? 'pull' : 'hit', 0.065)),
      ),
    end: () => 1670,
    ground(s) {
      if (!live(s, 1670)) return;
      const points = corners(s, 60),
        t = s.c.t - C;
      const grow = k.ease(k.clamp(t / 240));
      points.forEach((p, i) => stroke(p, points[(i + 1) % 4], LEAF, 2));
      for (let i = 0; i < 12; i++) {
        const u = 0.08 + k.hash(i, seed(s)) * 0.84,
          v = 0.08 + k.hash(i, seed(s), 1) * 0.84;
        const p = patchPoint(points, u, v),
          tip = offset(p, (i % 2 ? 1 : -1) * grow * 11, -grow * (7 + (i % 3) * 3));
        stroke(p, tip, LEAF, 3, 2);
        pixel(offset(tip, i % 2 ? 3 : -3, -2), LEAF, 4, 3);
      }
      if (t >= 300)
        for (let i = 0; i < 4; i++) {
          const p = patchPoint(points, i % 2 ? 0.82 : 0.18, i < 2 ? 0.2 : 0.8),
            img = tree(Math.floor(t / 180) % 2);
          k.blit(img, p.x - 14, p.y - 37);
        }
      if (t >= 720)
        for (let i = 0; i < 6; i++) {
          const p = patchPoint(points, k.hash(i, seed(s), 4), k.hash(i, seed(s), 5));
          orb(p, 3 + (i % 2), STONE, 2);
        }
    },
    air(s) {
      if (!live(s, 1670)) return;
      const points = corners(s, 60);
      s.hits.forEach((h, i) => {
        const p = k.P(target(s, h)),
          phase = Math.floor(i / ids(s.event).length),
          e = s.real(h);
        impact(s, h, p, phase === 2 ? STONE : LEAF, 'nature-' + phase, phase === 2 ? 34 : 26, 5);
        if (phase === 2 && s.c.t >= h.at - 160 && s.c.t < h.at) {
          const from = patchPoint(points, ((i % 3) + 1) / 4, 0.8),
            q = (s.c.t - h.at + 160) / 160;
          orb({ x: k.mix(from.x, p.x, q), y: k.mix(from.y, p.y, q) - Math.sin(q * Math.PI) * 22 }, 5, STONE);
        }
        if (phase === 0 && e >= 0 && e < 330) ring(offset(p, 0, 5), 10, 5, LEAF, 3, 6, e / 90);
      });
    },
    reach: (event, grid) => ({ r: (event.area?.feet || 60) / (grid.feet || 5) + 1, up: 3 }),
  });

  // Infernal Calling: a horned, cloven-hoofed devil steps from a red pentacle with snapping chains.
  FX.register('infernal-calling', {
    palette: HELL,
    travel: 240,
    beats: () => [beat(C + 240, 115)],
    end: () => 1460,
    ground: s => summon(s, 'devil'),
    air(s) {
      summonAir(s, HELL, 'infernal-arrival');
      const e = s.real(s.hits[0]),
        p = centre(s);
      if (e < 0 || e > 520) return;
      for (let side = -1; side <= 1; side += 2)
        for (let i = 0; i < 4; i++) {
          const q = e / 520,
            x = p.x + side * (12 + i * 5 + k.ease(q) * 14),
            y = p.y - 14 - i * 4 + q * q * 26;
          ring({ x, y }, 3, 2, HELL, i % 2 ? 4 : 2);
        }
    },
    reach: () => ({ r: 3, up: 4 }),
  });

  // Bigby's Hand: a giant sapphire force fist springs open into a floating, articulated palm.
  FX.register('bigbys-hand', {
    palette: FORCE,
    travel: 240,
    beats: () => [beat(C + 240, 110)],
    end: () => 1460,
    ground: s => summon(s, 'hand'),
    air: s => summonAir(s, FORCE, 'bigby-palm'),
    reach: () => ({ r: 2.5, up: 4 }),
  });

  // Modify Memory: a pink hypnotic spiral extracts a picture, rewrites it, then locks it into the mind.
  FX.register('modify-memory', {
    palette: MIND,
    travel: 340,
    beats: event => [beat(C + 340, 65, event.targets?.[0] ?? null)],
    end: () => 1460,
    ground(s) {
      if (!live(s, 1460)) return;
      const p = feet(target(s));
      ring(p, 14, 7, MIND, 2, 8, s.c.raw / 140);
    },
    air(s) {
      if (!live(s, 1460)) return;
      const p = offset(k.P(target(s)), 0, -12),
        t = s.c.t - C;
      if (t < 340) {
        const h = k.P(s.pose.hand || target(s)),
          q = t / 340;
        for (let i = 0; i < 7; i++) {
          const u = q - i * 0.05;
          if (u >= 0)
            pixel({ x: k.mix(h.x, p.x, u), y: k.mix(h.y, p.y, u) - Math.sin(u * Math.PI) * 9 }, MIND, i < 2 ? 4 : 2, 2);
        }
      } else {
        const e = s.real(s.hits[0]);
        if (t < 840) {
          ring(p, 13, 9, MIND, 3, 10, s.c.raw / 100);
          for (let i = 0; i < 3; i++) {
            const a = t / 180 + (i * k.tau) / 3;
            memoryTile(offset(p, Math.cos(a) * 18, Math.sin(a) * 8), t >= 620 ? 1 : 0);
          }
        } else {
          const q = k.clamp((t - 840) / 160);
          memoryTile(offset(p, 0, -15 * (1 - q)), 1);
          if (t > 1030) ring(p, 8, 6, MIND, 4);
        }
        impact(s, s.hits[0], p, MIND, 'memory-edit', 24, 5);
        if (e < 100) orb(p, 3, MIND, 5);
      }
    },
  });

  // Wall of Force: an almost invisible pane snaps upright, traced by blue edges and refraction facets.
  FX.register('wall-of-force', {
    palette: FORCE,
    travel: 260,
    beats: () => [beat(C + 260, 75)],
    end: () => 1490,
    ground: s => wall(s, 'force'),
    air: s => wallAir(s, 'force'),
    linger: s => wall(s, 'force', true),
    reach: (event, grid) => ({ r: (event.area?.feet || 60) / (grid.feet || 5) + 1, up: 5 }),
  });

  // Wall of Light: a sixty-foot curtain of white-gold radiant pillars ignites with sharp starbursts.
  FX.register('wall-of-light', {
    palette: GOLD,
    travel: 260,
    beats: event => ids(event).map(id => beat(C + 260, 115, id, 'beam', 0.065)),
    end: () => 1490,
    flash,
    ground: s => wall(s, 'light'),
    air: s => wallAir(s, 'light'),
    linger: s => wall(s, 'light', true),
    reach: (event, grid) => ({ r: (event.area?.feet || 60) / (grid.feet || 5) + 1, up: 5 }),
  });

  // Wall of Stone: heavy grey slabs rise in sequence, lock their masonry seams and shed angular chips.
  FX.register('wall-of-stone', {
    palette: STONE,
    travel: 260,
    beats: () => [beat(C + 260, 130, null, 'hit', 0.055)],
    end: () => 1490,
    ground: s => wall(s, 'stone'),
    air: s => wallAir(s, 'stone'),
    linger: s => wall(s, 'stone', true),
    reach: (event, grid) => ({ r: (event.area?.feet || 60) / (grid.feet || 5) + 1, up: 5 }),
  });

  // Negative Energy Flood: black-violet death ribbons flood one body, burst into a skull and implode.
  FX.register('negative-energy-flood', {
    palette: VOID,
    travel: 300,
    beats: event => [beat(C + 300, 145, event.targets?.[0] ?? null, 'hit', 0.08)],
    end: () => 1220,
    flash: (event, e) =>
      e < 40 ? { color: '#130b20', alpha: 0.25 } : e < 70 ? { color: '#e2caef', alpha: 0.13 } : null,
    ground(s) {
      if (!live(s, 1220)) return;
      pulse(s, feet(target(s)), VOID, 20);
    },
    air(s) {
      if (!live(s, 1220)) return;
      const h = s.hits[0],
        p = k.P(target(s, h)),
        from = k.P(s.pose.hand || target(s)),
        t = s.c.t - C;
      if (t < 300) {
        const q = t / 300;
        for (let strand = 0; strand < 3; strand++)
          for (let i = 0; i < 18; i++) {
            const u = q - i * 0.025;
            if (u < 0) continue;
            const a = u * Math.PI * 5 + (strand * k.tau) / 3;
            const at = { x: k.mix(from.x, p.x, u), y: k.mix(from.y, p.y, u) + Math.sin(a) * Math.sin(u * Math.PI) * 7 };
            orb(at, i < 5 ? 3 : 1, VOID, strand === 1 ? 1 : 2);
          }
      }
      const e = s.real(h);
      impact(s, h, p, VOID, 'negative-flood', 42, 11);
      if (e >= 60 && e < 370)
        stamp(
          icon('death-skull', VOID, [
            '...33333...',
            '.334444433.',
            '34444444443',
            '34411411443',
            '34411411443',
            '.344414443.',
            '..3444443..',
            '...42424...',
            '...42424...',
          ]),
          offset(p, 0, -e / 55),
        );
      if (e >= 0 && e < 540)
        for (let i = 0; i < 10; i++) {
          const a = k.hash(i, seed(s)) * k.tau,
            r = 30 * (1 - k.clamp(e / 540));
          pixel(offset(p, Math.cos(a) * r, Math.sin(a) * r * 0.7), VOID, i % 3 ? 2 : 4, 2);
        }
    },
  });

  // Destructive Wave: a caster-centred thunder shockfront cracks into a second radiant or necrotic ring.
  FX.register('destructive-wave', {
    palette: event => (event.element === 'necrótico' ? VOID : GOLD),
    travel: 260,
    beats: event =>
      [260, 390].flatMap((delay, i) => ids(event).map(id => beat(C + delay, i ? 130 : 120, id, 'blast', 0.09))),
    end: () => 1540,
    flash,
    ground(s) {
      if (!live(s, 1540)) return;
      const p = caster(s),
        r = radius(s, 30),
        t = s.c.t - C;
      // Both fronts start at the caster, never at the selected enemy.
      for (let j = 0; j < 2; j++) {
        const q = k.clamp((t - j * 130) / 260),
          age = t - j * 130;
        if (age < 0 || age > 750) continue;
        const ramp = j ? s.ramp : THUNDER;
        ring(p, r * k.ease(q), r * k.ease(q), ramp, age < 300 ? 4 : 2, age > 350 ? 18 : 0);
        if (age < 400) ring(p, r * k.ease(q) * 0.88, r * k.ease(q) * 0.88, ramp, 3, 12);
      }
      if (t >= 260 && t < 850)
        for (let i = 0; i < 12; i++) {
          const a = (i * k.tau) / 12 + k.hash(i, seed(s)) * 0.2;
          const p0 = offset(p, Math.cos(a) * r * 0.35, Math.sin(a) * r * 0.35);
          const p1 = offset(p, Math.cos(a + 0.04) * r * 0.65, Math.sin(a + 0.04) * r * 0.65);
          const p2 = offset(p, Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95);
          stroke(p0, p1, s.ramp, 2);
          stroke(p1, p2, s.ramp, 3);
        }
    },
    air(s) {
      if (!live(s, 1540)) return;
      const n = ids(s.event).length;
      s.hits.forEach((h, i) =>
        impact(s, h, k.P(target(s, h)), i < n ? THUNDER : s.ramp, i < n ? 'thunder-wave' : 'divine-wave', 38, 7),
      );
    },
    reach: (event, grid) => ({ r: (event.area?.feet || 30) / (grid.feet || 5) + 2, up: 2 }),
  });

  // Passwall: stone blocks slide aside to expose a deep rectangular passage with receding jambs.
  FX.register('passwall', {
    palette: STONE,
    travel: 300,
    beats: () => [beat(C + 300, 90)],
    end: () => 1440,
    ground(s) {
      if (!live(s, 1440)) return;
      const p = centre(s),
        t = s.c.t - C,
        open = Math.round(9 * k.ease(k.clamp(t / 300)));
      const img = k.sprite('b29:passwall:' + open, 47, 55, [STONE[0], '#101017', ...STONE.slice(2)], set => {
        rect(set, 3, 4, 40, 46, 2);
        for (let y = 5; y < 50; y++)
          for (let x = 4; x < 43; x++) {
            if (y % 8 === 0 || (x + (Math.floor(y / 8) % 2) * 7) % 14 === 0) set(x, y, 1);
            else if (y % 8 === 1) set(x, y, 3);
          }
        if (open) {
          rect(set, 23 - open, 10, open * 2, 39, 1);
          rect(set, 25 - open, 12, Math.max(1, open * 2 - 4), 35, 1);
          line(set, [23 - open, 10], [27 - open, 15], 4);
          line(set, [23 + open - 1, 10], [19 + open, 15], 3);
          line(set, [23 - open, 48], [27 - open, 43], 3);
          line(set, [23 + open - 1, 48], [19 + open, 43], 2);
          line(set, [23 - open, 10], [23 - open, 48], 4);
          line(set, [22 + open, 10], [22 + open, 48], 3);
        }
      });
      k.blit(img, p.x - 23, p.y - 48);
    },
    air(s) {
      if (!live(s, 1440)) return;
      const p = centre(s),
        e = s.real(s.hits[0]);
      impact(s, s.hits[0], offset(p, 0, -24), STONE, 'passwall-open', 30, 9);
      if (e >= 0 && e < 420)
        for (let i = 0; i < 6; i++) {
          const side = i % 2 ? 1 : -1,
            q = e / 420;
          orb(offset(p, side * (10 + k.ease(q) * 15), -12 - i * 4 + q * q * 22), 2, STONE, 2);
        }
    },
    reach: () => ({ r: 2.5, up: 4 }),
  });

  // Far Step: cool mist folds the caster away and a separate distant mist column snaps into place.
  FX.register('far-step', {
    palette: MIST,
    travel: 260,
    beats: () => [beat(C + 260, 70)],
    end: () => 1250,
    ground(s) {
      if (!live(s, 1250)) return;
      const from = s.event.teleport?.from ? k.P(s.event.teleport.from) : caster(s);
      const to = k.P(s.event.teleport?.to || s.pose.target || target(s));
      const t = s.c.t - C;
      if (t < 460) ring(from, 13 + k.clamp(t / 460) * 5, 6, MIST, 3, t > 240 ? 8 : 0);
      if (t >= 260) {
        ring(to, 17, 8, MIST, 4, t > 650 ? 8 : 0);
        pulse(s, to, MIST, 20);
      }
    },
    air(s) {
      if (!live(s, 1250)) return;
      const from = s.event.teleport?.from ? k.P(s.event.teleport.from) : caster(s);
      const to = k.P(s.event.teleport?.to || s.pose.target || target(s)),
        t = s.c.t - C;
      for (let side = 0; side < 2; side++) {
        const age = t - side * 260;
        if (age < 0 || age > 560) continue;
        const p = side ? to : from,
          q = age / 560;
        for (let i = 0; i < 9; i++) {
          const a = i * 2.4 + age / 150,
            r = (side ? 1 - q : q) * 11 + 2;
          const at = offset(p, Math.cos(a) * r, -i * 3 - q * 11);
          orb(at, Math.max(1, 4 - Math.floor(q * 4)), MIST, i % 2 ? 3 : 4);
        }
      }
      impact(s, s.hits[0], offset(to, 0, -10), MIST, 'far-step-arrive', 32, 8);
    },
  });

  // Insect Plague: a sandy twenty-foot sphere churns with winged locusts and biting chitin slashes.
  FX.register('insect-plague', {
    palette: BUG,
    travel: 280,
    beats: event => ids(event).map(id => beat(C + 280, 105, id, 'hit', 0.06)),
    end: () => 1690,
    ground: s => plague(s),
    linger: s => plague(s, true),
    air(s) {
      if (!live(s, 1690)) return;
      const p = centre(s),
        r = radius(s, 20),
        t = s.c.t - C;
      const grow = k.ease(k.clamp(t / 280));
      for (let i = 0; i < 34; i++) {
        const a = k.hash(i, seed(s)) * k.tau + t / (i % 2 ? 350 : -450);
        const d = Math.sqrt(k.hash(i, seed(s), 2)) * r * grow;
        locust(
          offset(p, Math.cos(a) * d, Math.sin(a) * d - Math.sin(t / 90 + i) * 3),
          Math.floor(s.c.raw / 55 + i) % 2,
          a + Math.PI / 2,
        );
      }
      s.hits.forEach(h => {
        const at = k.P(target(s, h));
        impact(s, h, at, BUG, 'locust-bite', 26, 6);
        const e = s.real(h);
        if (e >= 0 && e < 300) {
          const q = e / 300;
          stroke(offset(at, -7 + q * 8, 7 - q * 12), offset(at, -2 + q * 8, 1 - q * 12), BUG, 4, 2);
        }
      });
    },
    reach: (event, grid) => ({ r: (event.area?.feet || 20) / (grid.feet || 5) + 1, up: 2 }),
  });

  // Skill Empowerment: golden eye, hand and swift-foot emblems align into a precise mastery badge.
  FX.register('skill-empowerment', {
    palette: GOLD,
    travel: 300,
    beats: event => [beat(C + 300, 65, event.targets?.[0] ?? null)],
    end: () => 1320,
    ground(s) {
      if (!live(s, 1320)) return;
      const p = feet(target(s));
      ring(p, 13, 6, GOLD, 3, 6, s.c.raw / 160);
      pulse(s, p, GOLD, 17);
    },
    air(s) {
      if (!live(s, 1320)) return;
      const p = offset(k.P(target(s)), 0, -11),
        t = s.c.t - C;
      const rows = [
        ['...333...', '.3344433.', '344151443', '.3344433.', '...333...'],
        ['.4.4.4.', '.43434.', '..3333.', '.43333.', '..333..', '..222..'],
        ['...33..', '...34..', '...34..', '..334..', '.344443', '.333333'],
      ];
      for (let i = 0; i < 3; i++) {
        const a = (i * k.tau) / 3 - Math.PI / 2 + Math.min(t, 400) / 240;
        const r = t < 300 ? 18 : 18 * (1 - k.clamp((t - 300) / 260));
        if (t < 560) stamp(icon('skill:' + i, GOLD, rows[i]), offset(p, Math.cos(a) * r, Math.sin(a) * r * 0.65));
      }
      if (t >= 560)
        stamp(
          icon('mastery', GOLD, [
            '....4....',
            '...454...',
            '..45554..',
            '.4555554.',
            '455545554',
            '.454.454.',
            '..4...4..',
          ]),
          offset(p, 0, -k.ease(k.clamp((t - 560) / 240)) * 5),
        );
      impact(s, s.hits[0], p, GOLD, 'skill-focus', 26, 6);
      if (t >= 300 && t < 750)
        for (let i = 0; i < 3; i++) {
          const y = -((s.c.raw / 25 + i * 8) % 24);
          stroke(offset(p, -6, y + 3), offset(p, 0, y), GOLD, 4);
          stroke(offset(p, 0, y), offset(p, 6, y + 3), GOLD, 4);
        }
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
