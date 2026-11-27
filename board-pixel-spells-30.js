/* Pixel spells, batch 30 (see docs/pixel-spells/BRIEF.md). */
(function (root) {
  'use strict';
  const FX = root.BoardPixelFX;
  if (!FX) return;
  const k = FX.kit;
  const C = k.CAST;
  const LIFE = ['#11271b', '#285e42', '#51ad74', '#a1e6a1', '#f3f5bd', '#ffffff'];
  const GOLD = ['#30200f', '#80552b', '#c79a46', '#f3d47c', '#fff1c5', '#ffffff'];
  const MIND = ['#20112f', '#52346b', '#9561bb', '#dba0e9', '#f9d7fa', '#ffffff'];
  const FORCE = ['#161830', '#393875', '#7364be', '#afa5f4', '#e6e4ff', '#ffffff'];
  const ROCK = ['#242125', '#50454a', '#827275', '#afa09b', '#ddd1bf', '#fff5df'];
  const MUD = ['#271c17', '#5c3828', '#8d5939', '#b98654', '#dfba7f', '#fff0c5'];
  const WATER = ['#101f2b', '#174758', '#227c92', '#55bccc', '#b8e9e6', '#ffffff'];
  const LEAF = ['#142519', '#35582f', '#628d43', '#a1c762', '#e1ecaf', '#fff8dd'];
  const BARK = ['#261e19', '#59412c', '#8a653e', '#b79558', '#e3ca8b', '#fff1c3'];
  const SILVER = ['#191c2a', '#414a61', '#8098b1', '#c4d9ea', '#f5f3dc', '#ffffff'];
  const WIND = ['#182938', '#40576c', '#7b9da9', '#b9d8dd', '#eaf6ee', '#ffffff'];
  const DEATH = ['#100b19', '#261a34', '#50325d', '#885691', '#c6a5ce', '#f7e8f5'];
  const seed = s => s.event.seed || 0;
  const ids = e => (e.targets?.length ? e.targets : [null]);
  const beat = (at, stop, target = null, kind = 'soft', power = 0.05) => ({ at, stop, target, kind, power });
  const target = (s, h = s.hits[0]) =>
    s.targets.find(t => t.id === h?.id) ||
    s.targets[0] ||
    s.pose.target ||
    s.pose.base ||
    s.pose.hand || { x: 0, y: 0 };
  const feet = p => k.P({ x: p.baseX ?? p.x, y: p.baseY ?? p.y });
  const centre = s => k.P(s.area || s.pose.target || target(s));
  const offset = (p, x, y) => ({ x: p.x + x, y: p.y + y });
  const live = (s, end) => s.c.t >= C && s.c.t < end;
  const radius = (s, fallback = 18) => (s.area ? (s.area.feet / (s.grid.feet || 5)) * 16 : fallback);
  const reach = (e, g) => ({ r: (e.area?.feet || 60) / (g.feet || 5) + 3, up: 5 });
  const flash = (e, t) =>
    t < 30 ? { color: '#faf1dc', alpha: 0.18 } : t < 65 ? { color: '#171320', alpha: 0.14 } : null;

  function pixel(p, ramp, color = 3, size = 1) {
    k.dot(p.x, p.y, ramp[0], size + 2);
    k.dot(p.x, p.y, ramp[color], size);
  }
  function orb(p, r, ramp, color = 3) {
    k.disc(p.x, p.y, r + 1, ramp[0]);
    k.disc(p.x, p.y, r, ramp[color]);
    if (r > 2) k.disc(p.x - 1, p.y - 1, Math.max(1, r * 0.35), ramp[4]);
  }
  function stamp(img, p, alpha = 1) {
    k.blit(img, p.x - img.width / 2, p.y - img.height / 2, alpha);
  }
  function rect(set, x, y, w, h, color) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(x + i, y + j, color);
  }
  function line(set, a, b, color, width = 1) {
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y)));
    for (let i = 0; i <= n; i++)
      rect(set, Math.round(k.mix(a.x, b.x, i / n)), Math.round(k.mix(a.y, b.y, i / n)), width, width, color);
  }
  function icon(name, ramp, rows) {
    return k.sprite(
      'b30:' + name + ':' + ramp[2],
      Math.max(...rows.map(r => r.length)) + 2,
      rows.length + 2,
      ramp,
      set => {
        rows.forEach((row, y) => {
          for (let x = 0; x < row.length; x++) if (row[x] !== '.') set(x + 1, y + 1, Number(row[x]));
        });
      },
    );
  }
  // Cached strokes and rings avoid per-frame dot loops over the 100-foot wall and 60-foot sphere.
  function stroke(a, b, ramp, color = 3, width = 1) {
    const dx = Math.round(b.x - a.x),
      dy = Math.round(b.y - a.y),
      pad = width + 2;
    const img = k.sprite(
      `b30:stroke:${dx}:${dy}:${ramp[2]}:${color}:${width}`,
      Math.abs(dx) + pad * 2 + 1,
      Math.abs(dy) + pad * 2 + 1,
      ramp,
      set => {
        line(
          set,
          { x: pad + Math.max(0, -dx), y: pad + Math.max(0, -dy) },
          { x: pad + Math.max(0, dx), y: pad + Math.max(0, dy) },
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
      `b30:ring:${rx}:${ry}:${ramp[2]}:${color}:${gaps}:${phase}`,
      rx * 2 + 7,
      ry * 2 + 7,
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
    k.blit(img, p.x - rx - 3, p.y - ry - 3);
  }
  function impact(s, h, p, ramp, name, size = 28, n = 6) {
    const e = s.real(h);
    k.drawHit(k.hitStyle('b30:' + name, ramp, { S: size, spikes: 5, minor: 3, jag: 0.3, void: ramp === DEATH }), p, e);
    k.shards(p, e, ramp, seed(s) + s.hits.indexOf(h) * 37, n, size * 0.7);
  }
  function pulse(s, h, p, ramp, r = 19) {
    const e = s.real(h);
    if (e < 0 || e >= 420) return;
    const q = k.ease(e / 420);
    ring(p, r * (0.4 + q), r * (0.2 + q * 0.5), ramp, e < 65 ? 5 : 3, e > 210 ? 8 : 0);
  }
  function motes(s, p, ramp, age, n = 9, reach = 15, up = 18) {
    if (age < 0 || age > 650) return;
    const q = age / 650;
    for (let i = 0; i < n; i++) {
      if (q > 0.75 && i % 2) continue;
      const a = k.hash(i, seed(s), 17) * k.tau;
      pixel(offset(p, Math.cos(a) * reach * k.ease(q), Math.sin(a) * reach * 0.45 - q * up), ramp, i % 2 ? 3 : 4);
    }
  }
  function leaf(p, angle = 0) {
    k.blitRotated(icon('leaf', LEAF, ['..4..', '.434.', '4332.', '.32..', '..1..']), p.x, p.y, angle);
  }
  function ghost(p, ramp, form = 0) {
    const rows =
      form === 0
        ? ['...44...', '..4554..', '..4334..', '...33...', '..3333..', '.233332.', '.23..32.', '..3..3..', '..3..3..']
        : form === 1
          ? [
              '...44...',
              '..4554..',
              '.243342.',
              '...33...',
              '.333333.',
              '23333332',
              '23.33.32',
              '...33...',
              '..3..3..',
              '.33..33.',
            ]
          : [
              '...44...',
              '..4554..',
              '..4334..',
              '...33...',
              '..3443..',
              '.334433.',
              '.3.33.3.',
              '...33...',
              '..3..3..',
              '..3..3..',
              '.33..33.',
            ];
    stamp(icon('spirit-' + form, ramp, rows), p);
  }
  function sigil(p, ramp, time, r = 23) {
    ring(p, r, r * 0.5, ramp, 3);
    ring(p, r * 0.75, r * 0.375, ramp, 2, 6, time / 160);
    for (let i = 0; i < 6; i++) {
      const a = (i * k.tau) / 6;
      pixel(offset(p, Math.cos(a) * r, Math.sin(a) * r * 0.5), ramp, 4, 2);
    }
  }
  // The supplied template is authoritative; a compact patch also handles point-only previews.
  function corners(s) {
    const pts = s.area ? k.outline(s.area, s.grid) : [];
    if (pts.length >= 4) return pts.slice(0, 4).map(p => k.P({ x: p[0], y: p[1] }));
    const p = centre(s);
    return [offset(p, -16, -16), offset(p, 16, -16), offset(p, 16, 16), offset(p, -16, 16)];
  }
  function tilePoint(pts, u, v) {
    return {
      x: pts[0].x + (pts[1].x - pts[0].x) * u + (pts[3].x - pts[0].x) * v,
      y: pts[0].y + (pts[1].y - pts[0].y) * u + (pts[3].y - pts[0].y) * v,
    };
  }
  function border(pts, ramp, color = 3) {
    pts.forEach((p, i) => stroke(p, pts[(i + 1) % pts.length], ramp, color));
  }
  function patch(s, mode, frame) {
    const pts = corners(s),
      minX = Math.floor(Math.min(...pts.map(p => p.x))),
      minY = Math.floor(Math.min(...pts.map(p => p.y)));
    const w = Math.ceil(Math.max(...pts.map(p => p.x)) - minX) + 5,
      h = Math.ceil(Math.max(...pts.map(p => p.y)) - minY) + 5;
    const local = pts.map(p => ({ x: Math.round(p.x - minX + 2), y: Math.round(p.y - minY + 2) }));
    const ramp = mode === 'grove' ? LEAF : frame < 3 ? ROCK : MUD;
    const img = k.sprite(
      `b30:patch:${mode}:${w}:${h}:${local.map(p => p.x + ',' + p.y).join(':')}:${frame}:${seed(s) % 4}`,
      w,
      h,
      ramp,
      set => {
        const a = local[0],
          ux = local[1].x - a.x,
          uy = local[1].y - a.y,
          vx = local[3].x - a.x,
          vy = local[3].y - a.y;
        const det = ux * vy - uy * vx || 1;
        for (let y = 1; y < h - 1; y++)
          for (let x = 1; x < w - 1; x++) {
            const u = ((x - a.x) * vy - (y - a.y) * vx) / det,
              v = (ux * (y - a.y) - uy * (x - a.x)) / det;
            if (u < 0 || u > 1 || v < 0 || v > 1) continue;
            if (mode === 'grove') {
              const grass = x % 14 < 3 && y % 11 < 3,
                root = (x + Math.floor(y / 9) * 3) % 27 < 2;
              if (grass || root) set(x, y, grass ? 3 : 1);
            } else if (frame >= 3) {
              // Broad, curved pools replace the straight cracks once the stone has liquefied.
              const pool = Math.sin(x / 15) + Math.cos(y / 11) + Math.sin((x + y) / 24) * 0.4;
              set(x, y, pool > 1.2 ? 3 : pool > 1 ? 4 : pool > -0.5 ? 2 : 1);
            } else {
              const crack = (x + Math.floor(y / 12) * 5) % 19 < 2 || (y + Math.floor(x / 21) * 3) % 17 < 2;
              const pool = Math.sin(x / 13) + Math.cos(y / 11) > (frame < 3 ? 2 - frame * 0.6 : -0.7);
              set(x, y, crack ? 1 : pool ? 2 : 3);
              if (!crack && (x + y) % 23 === 0) set(x, y, 4);
            }
          }
      },
    );
    k.blit(img, minX - 2, minY - 2);
    return pts;
  }

  // Reincarnate: a green soul leaves its old outline, turns in an amber cocoon, and returns in a new body.
  FX.register('reincarnate', {
    palette: LIFE,
    travel: 460,
    beats: e => ids(e).map(id => beat(C + 460, 100, id)),
    end: () => 1650,
    ground(s) {
      if (!live(s, 1650)) return;
      s.hits.forEach(h => {
        const p = feet(target(s, h)),
          t = s.c.t - C;
        if (t < 1100) sigil(p, LIFE, t, t < 460 ? 17 : 21);
        pulse(s, h, p, GOLD);
      });
    },
    air(s) {
      if (!live(s, 1650)) return;
      s.hits.forEach(h => {
        const p = k.P(target(s, h)),
          t = s.c.t - C;
        if (t < 460) {
          ghost(offset(p, 0, -Math.sin((t / 460) * Math.PI) * 9), LIFE, Math.floor(t / 160) % 2);
          ring(p, 10, 15, GOLD, 3, 6, t / 80);
          for (let i = 0; i < 6; i++) {
            const a = t / 100 + (i * k.tau) / 6;
            leaf(offset(p, Math.cos(a) * 13, Math.sin(a) * 7 - 3), a);
          }
        } else if (t < 970) {
          ghost(offset(p, 0, -4), LIFE, 2);
          ring(p, 12, 16, LIFE, 4, 8, t / 100);
        }
        impact(s, h, p, LIFE, 'reincarnate', 30);
        motes(s, p, GOLD, s.real(h), 10, 17, 25);
      });
    },
  });

  // Greater Restoration: diamond-white light breaks dark binding links; emerald vitality rises through the body.
  FX.register('greater-restoration', {
    palette: LIFE,
    travel: 220,
    beats: e => ids(e).map(id => beat(C + 220, 100, id)),
    end: () => 1270,
    ground(s) {
      if (!live(s, 1270)) return;
      s.hits.forEach(h => pulse(s, h, feet(target(s, h)), LIFE, 23));
    },
    air(s) {
      if (!live(s, 1270)) return;
      s.hits.forEach(h => {
        const p = k.P(target(s, h)),
          e = s.real(h),
          t = s.c.t - C;
        if (t < 220) {
          stamp(
            icon('diamond', GOLD, ['...5...', '..454..', '.44544.', '3455543', '.34543.', '..343..', '...3...']),
            offset(p, 0, -12),
          );
          ring(p, 12, 6, DEATH, 2, 5, t / 70);
        }
        if (e >= 0 && e < 430)
          for (let i = 0; i < 6; i++) {
            const a = (i * k.tau) / 6,
              q = k.ease(e / 430);
            const v = offset(p, Math.cos(a) * (10 + q * 18), Math.sin(a) * (7 + q * 12) + q * q * 7);
            stamp(
              icon(
                'broken-link-' + (i % 2),
                DEATH,
                i % 2 ? ['.22.', '2..2', '2...', '.2..'] : ['.22.', '...2', '2..2', '.22.'],
              ),
              v,
            );
          }
        if (e >= 0 && e < 550) {
          const y = 12 - k.ease(e / 550) * 28;
          ring(offset(p, 0, y), 12, 4, LIFE, e < 70 ? 5 : 4, e > 350 ? 6 : 0);
        }
        impact(s, h, p, LIFE, 'restoration', 34, 10);
        motes(s, p, GOLD, e, 10, 12, 26);
      });
    },
  });

  // Dream: a violet crescent, sleeping eye, and miniature star-cloud enter a drifting dream bubble.
  FX.register('dream', {
    palette: MIND,
    travel: 280,
    beats: e => ids(e).map(id => beat(C + 280, 65, id)),
    end: () => 1450,
    ground(s) {
      if (!live(s, 1450)) return;
      s.hits.forEach(h => pulse(s, h, feet(target(s, h)), MIND, 17));
    },
    air(s) {
      if (!live(s, 1450)) return;
      s.hits.forEach(h => {
        const p = offset(k.P(target(s, h)), 0, -9),
          t = s.c.t - C;
        if (t < 850) {
          ring(p, 15, 14, MIND, 3, t > 700 ? 7 : 0);
          stamp(
            icon('crescent', MIND, [
              '..444...',
              '.454....',
              '454.....',
              '454.....',
              '454.....',
              '.454..4.',
              '..4444..',
            ]),
            offset(p, -5, -3),
          );
          stamp(icon('sleeping-eye', MIND, ['2.....2', '.3...3.', '..444..']), offset(p, 2, 7));
          for (let i = 0; i < 5; i++) {
            const a = i * 2.4 + t / 330;
            pixel(offset(p, Math.cos(a) * 12, Math.sin(a) * 10), GOLD, 4);
          }
        }
        if (t > 280 && t < 950) {
          const q = (t - 280) / 670;
          stamp(
            icon('dream-cloud', MIND, ['..333..44..', '.344434554.', '34444444543', '.333333333.']),
            offset(p, 4 + q * 7, -8 - q * 8),
          );
        }
        impact(s, h, p, MIND, 'dream', 20, 4);
        motes(s, p, MIND, s.real(h), 5, 15, 12);
      });
    },
  });

  // Telekinesis: opposing violet palms clamp a target in force rings and lift a halo of loose stones.
  FX.register('telekinesis', {
    palette: FORCE,
    travel: 210,
    beats: e => ids(e).map(id => beat(C + 210, 95, id)),
    end: () => 1480,
    ground(s) {
      if (!live(s, 1480)) return;
      s.hits.forEach(h => {
        const p = feet(target(s, h)),
          t = s.c.t - C;
        if (t < 980) ring(p, 16, 7, FORCE, 2, 8, t / 130);
        pulse(s, h, p, FORCE, 17);
      });
    },
    air(s) {
      if (!live(s, 1480)) return;
      s.hits.forEach(h => {
        const p = k.P(target(s, h)),
          t = s.c.t - C,
          q = k.ease(k.clamp(t / 210));
        if (t < 980) {
          for (let side = -1; side <= 1; side += 2) {
            const at = offset(p, side * (24 - q * 9), -3 - Math.sin(t / 180) * 2);
            k.blitRotated(
              icon('force-palm', FORCE, [
                '..3.3.3..',
                '..4.4.4.3',
                '..4.4.4.4',
                '..4444444',
                '.34444443',
                '34444443.',
                '.344443..',
                '..3333...',
              ]),
              at.x,
              at.y,
              side < 0 ? 0 : Math.PI,
            );
          }
          ring(offset(p, 0, -q * 5), 13, 5, FORCE, 4, 4, t / 110);
          for (let i = 0; i < 5; i++) {
            const a = (i * k.tau) / 5 + t / 260;
            orb(offset(p, Math.cos(a) * 15, 10 + Math.sin(a) * 6 - q * 13), 2, ROCK, 3);
          }
        }
        impact(s, h, p, FORCE, 'telekinesis', 26, 7);
      });
    },
  });

  // Transmute Rock: a slate square fractures, slabs sink, and thick ochre mud bubbles up between the plates.
  FX.register('transmute-rock', {
    palette: MUD,
    travel: 320,
    beats: e => ids(e).map(id => beat(C + 320, 130, id, 'hit', 0.07)),
    end: () => 1660,
    reach,
    flash,
    ground(s) {
      if (!live(s, 1660)) return;
      const t = s.c.t - C,
        pts = patch(s, 'mud', Math.min(5, Math.floor(t / 100)));
      border(pts, t < 320 ? ROCK : MUD, 2);
      for (let i = 0; i < 16; i++) {
        const p = tilePoint(pts, 0.1 + k.hash(i, seed(s), 1) * 0.8, 0.1 + k.hash(i, seed(s), 2) * 0.8);
        if (t < 620) {
          const q = k.clamp((t - 230) / 390);
          stamp(
            icon('sinking-rock', ROCK, ['..3333..', '.344443.', '34444432', '23333322', '.222222.']),
            offset(p, 0, q * 5),
            1 - Math.floor(q * 3) / 4,
          );
        } else if (i % 2 === 0 && t < 1140) {
          const q = ((t + i * 43) % 280) / 280;
          ring(p, 2 + q * 4, 1 + q * 2, MUD, 3, q > 0.6 ? 4 : 0);
        }
      }
    },
    linger(s) {
      const pts = patch(s, 'mud', 5);
      border(pts, MUD, s.linger < 0.5 ? 1 : 2);
    },
    air(s) {
      if (!live(s, 1660)) return;
      s.hits.forEach(h => impact(s, h, k.P(target(s, h)), MUD, 'transmute-rock', 30, 9));
      const p = centre(s),
        h = s.hits[0];
      if (!s.targets.length) impact(s, h, p, ROCK, 'rock-fracture', 32, 9);
    },
  });

  // Rary's Telepathic Bond: rose-violet mind sigils connect the caster and companions with travelling thought pearls.
  FX.register('rarys-telepathic-bond', {
    palette: MIND,
    travel: 240,
    beats: e => ids(e).map(id => beat(C + 240, 70, id)),
    end: () => 1430,
    ground(s) {
      if (!live(s, 1430)) return;
      s.hits.forEach(h => pulse(s, h, feet(target(s, h)), MIND, 15));
    },
    air(s) {
      if (!live(s, 1430)) return;
      const t = s.c.t - C,
        from = offset(k.P(s.pose.hand || s.pose.base || target(s)), 0, -12);
      const nodes = [from, ...(s.targets.length ? s.targets : [target(s)]).map(p => offset(k.P(p), 0, -13))];
      if (t < 930)
        nodes.forEach((p, i) => {
          stamp(
            icon('mind-knot', MIND, ['..3.3..', '.34343.', '34.4.43', '.34543.', '34.4.43', '.34343.', '..3.3..']),
            p,
          );
          const b = nodes[(i + 1) % nodes.length];
          if (t < 740) {
            stroke(p, b, MIND, t < 240 ? 2 : 3);
            for (let j = 0; j < 3; j++) {
              const q = (t / 480 + j / 3) % 1;
              orb({ x: k.mix(p.x, b.x, q), y: k.mix(p.y, b.y, q) }, 1, MIND, 4);
            }
          }
        });
      s.hits.forEach(h => impact(s, h, offset(k.P(target(s, h)), 0, -13), MIND, 'telepathic', 20, 4));
    },
  });

  function whirlpool(s, lingering = false) {
    const t = s.c.t - C;
    if (!lingering && (t < 0 || s.c.t >= 1720)) return;
    const p = centre(s),
      r = Math.max(8, Math.round(radius(s))),
      f = Math.floor(s.c.raw / 70) % 8;
    const stage = lingering ? 3 : t < 320 ? Math.floor(t / 80) : t < 1020 ? 3 : t < 1220 ? 2 : 1;
    const size = r * 2 + 7;
    const img = k.sprite(`b30:maelstrom:${r}:${f}:${stage}`, size, size, WATER, set => {
      for (let y = 2; y < size - 2; y++)
        for (let x = 2; x < size - 2; x++) {
          const dx = x - r - 3,
            dy = y - r - 3,
            d = Math.hypot(dx, dy) / r;
          if (d > 1 || (stage === 1 && d < 0.72)) continue;
          const a = Math.atan2(dy, dx),
            wave = (a * 3 + d * 22 - (f * k.tau) / 8) / k.tau;
          const band = wave - Math.floor(wave);
          set(x, y, d < 0.13 ? 1 : band < 0.1 ? 4 : band < 0.2 ? 3 : d < 0.4 ? 1 : 2);
        }
    });
    stamp(img, p, lingering ? s.linger : 1);
    ring(p, r, r, WATER, stage === 3 ? 4 : 3, stage === 1 ? 12 : 0, f);
  }

  // Maelstrom: a turquoise water column collapses into a foaming whirlpool, dragging victims toward its black eye.
  FX.register('maelstrom', {
    palette: WATER,
    travel: 320,
    beats: e => ids(e).map(id => beat(C + 320, 140, id, 'pull', 0.08)),
    end: () => 1720,
    reach,
    flash,
    ground: s => whirlpool(s),
    linger: s => whirlpool(s, true),
    air(s) {
      if (!live(s, 1720)) return;
      const p = centre(s),
        r = radius(s),
        t = s.c.t - C;
      if (t < 680)
        for (let i = 0; i < 18; i++) {
          const a = (i * k.tau) / 18 + t / 170,
            q = k.clamp(t / 320);
          const at = offset(
            p,
            Math.cos(a) * r * (0.45 + q * 0.45),
            Math.sin(a) * r * (0.45 + q * 0.45) - Math.sin(q * Math.PI) * 14,
          );
          pixel(at, WATER, i % 3 ? 4 : 5, i % 3 ? 2 : 3);
        }
      s.hits.forEach(h => {
        const at = k.P(target(s, h));
        impact(s, h, at, WATER, 'maelstrom', 34, 9);
        motes(s, at, WATER, s.real(h), 7, 23, 8);
      });
    },
  });

  function tree(p, open, age) {
    const trunk = icon('tree-door-' + (open ? 1 : 0), BARK, [
      '..222222222..',
      '..233333332..',
      '.23344443332.',
      '.2334...4332.',
      '.234.....432.',
      '.234.....432.',
      '.234.....432.',
      '.234.....432.',
      '.234.....432.',
      '.234.....432.',
      '.234.....432.',
      '.234.....432.',
      '2334.....4332',
      '2334.....4332',
      '2333333333332',
      '2222.....2222',
    ]);
    if (!open) stroke(offset(p, 0, -18), offset(p, 0, -2), BARK, 2, 8);
    stamp(trunk, offset(p, 0, -7));
    const crown = icon('tree-crown', LEAF, [
      '...2222222...',
      '..233333332..',
      '.23444443332.',
      '2344444443332',
      '.23344443332.',
      '..233333332..',
      '....22222....',
    ]);
    stamp(crown, offset(p, 0, -20));
    if (open) ring(offset(p, 0, -7), 4, 7, LIFE, 4, age > 600 ? 6 : 0);
    for (let i = 0; i < 3; i++) leaf(offset(p, (i - 1) * 9, -18 - (i % 2) * 2), i);
  }

  // Tree Stride: paired living trunks open green heartwood doors; a leaf-shaped traveller vanishes and reappears.
  FX.register('tree-stride', {
    palette: LEAF,
    travel: 160,
    beats: () => [beat(C + 160, 60), beat(C + 420, 85)],
    end: () => 1430,
    ground(s) {
      if (!live(s, 1430)) return;
      const from = feet(s.event.teleport?.from || s.pose.base || target(s));
      const to = feet(s.event.teleport?.to || s.pose.target || target(s));
      const t = s.c.t - C;
      if (t < 740) tree(from, t < 420, t);
      if (t >= 220 && t < 980) tree(to, t >= 420 && t < 820, t - 220);
      pulse(s, s.hits[0], from, LEAF, 17);
      pulse(s, s.hits[1], to, LIFE, 19);
    },
    air(s) {
      if (!live(s, 1430)) return;
      const from = feet(s.event.teleport?.from || s.pose.base || target(s));
      const to = feet(s.event.teleport?.to || s.pose.target || target(s));
      const t = s.c.t - C;
      if (t < 160) ghost(offset(from, 0, -9), LIFE);
      if (t >= 420 && t < 700) ghost(offset(to, 0, -9), LIFE, 2);
      [from, to].forEach((p, j) => {
        const h = s.hits[j],
          e = s.real(h);
        impact(s, h, offset(p, 0, -8), LEAF, 'tree-stride-' + j, 24, 5);
        if (e < 0 || e > 520) return;
        for (let i = 0; i < 9; i++) {
          const a = k.hash(i, seed(s), j) * k.tau + e / 220;
          leaf(offset(p, Math.cos(a) * (5 + e / 45), -8 + Math.sin(a) * 8 - e / 40), a);
        }
      });
    },
  });

  function wings(p, ramp, t, bat = false) {
    const rows = bat
      ? [
          '4...........',
          '34..........',
          '.344........',
          '.34444......',
          '..3444444...',
          '..344.34444.',
          '...32..33344',
          '...2....2233',
        ]
      : [
          '4...........',
          '34..........',
          '.344........',
          '.34444......',
          '..3444444...',
          '..234444444.',
          '...234444444',
          '....23444443',
          '.....233333.',
          '......222...',
        ];
    const img = icon('wings-' + bat, ramp, rows);
    const a = Math.sin(t / 140) * 0.22;
    k.blitRotated(img, p.x - 3, p.y, a, 1, 0.8);
    k.blitRotated(img, p.x + 3, p.y, Math.PI - a, 1, 0.2);
  }

  // Planar Ally: a gold summoning seal opens and a winged celestial envoy steps down through a vertical planar gate.
  FX.register('planar-ally', {
    palette: GOLD,
    travel: 420,
    beats: () => [beat(C + 420, 120)],
    end: () => 1730,
    flash,
    ground(s) {
      if (!live(s, 1730)) return;
      const p = centre(s),
        t = s.c.t - C;
      if (t < 1150) sigil(p, GOLD, t, t < 420 ? 19 : 24);
      pulse(s, s.hits[0], p, GOLD, 24);
    },
    air(s) {
      if (!live(s, 1730)) return;
      const p = centre(s),
        t = s.c.t - C;
      if (t < 700) {
        ring(offset(p, 0, -9), 12, 18, GOLD, t < 420 ? 3 : 4, t > 560 ? 8 : 0);
        ring(offset(p, 0, -9), 9, 15, GOLD, 2);
      }
      if (t >= 180 && t < 1120) {
        const v = offset(p, 0, -11 - (1 - k.ease(k.clamp((t - 180) / 240))) * 9);
        wings(v, GOLD, t);
        ghost(v, GOLD, 2);
        ring(offset(v, 0, -10), 5, 2, GOLD, 4);
        stroke(offset(v, 8, -6), offset(v, 8, 12), GOLD, 3, 2);
      }
      impact(s, s.hits[0], offset(p, 0, -6), GOLD, 'planar-ally', 38, 11);
      motes(s, p, GOLD, s.real(s.hits[0]), 12, 23, 28);
    },
  });

  // Tasha's Otherworldly Guise: a violet winged transformation locks on spectral armor, a crown, and a floating blade.
  FX.register('tashas-otherworldly-guise', {
    palette: FORCE,
    travel: 300,
    beats: e => ids(e).map(id => beat(C + 300, 110, id)),
    end: () => 1580,
    ground(s) {
      if (!live(s, 1580)) return;
      s.hits.forEach(h => {
        const p = feet(target(s, h));
        if (s.c.t < 1150) sigil(p, FORCE, s.c.raw, 17);
        pulse(s, h, p, FORCE, 22);
      });
    },
    air(s) {
      if (!live(s, 1580)) return;
      s.hits.forEach(h => {
        const p = k.P(target(s, h)),
          t = s.c.t - C;
        if (t >= 160 && t < 1050) {
          wings(offset(p, 0, -4), FORCE, t, true);
          stamp(icon('guise-armor', FORCE, ['.4..4.', '344443', '.3553.', '.3443.', '..33..']), offset(p, 0, 1));
          stamp(icon('guise-crown', GOLD, ['4.4.4', '34443', '.333.']), offset(p, 0, -13));
          const blade = icon('guise-sword', FORCE, [
            '..5..',
            '.454.',
            '.343.',
            '.343.',
            '.343.',
            '34443',
            '..2..',
            '..3..',
          ]);
          k.blitRotated(blade, p.x + 16, p.y + 2, -Math.PI / 8);
          ring(offset(p, 0, 11), 14, 4, FORCE, 4, 6, t / 100);
        } else if (t < 160) ring(p, 12, 15, FORCE, 3, 5, t / 50);
        impact(s, h, p, FORCE, 'otherworldly-guise', 34, 9);
        motes(s, p, GOLD, s.real(h), 7, 19, 20);
      });
    },
  });

  function grove(s, lingering = false) {
    if (!lingering && !live(s, 1780)) return;
    const t = s.c.t - C,
      pts = patch(s, 'grove', 0);
    border(pts, LEAF, lingering && s.linger < 0.5 ? 1 : 2);
    for (let i = 0; i < 4; i++) {
      const p = tilePoint(pts, i % 2 ? 0.88 : 0.12, i < 2 ? 0.12 : 0.88);
      if (lingering || t > 110 + i * 65) {
        tree(p, false, 0);
        // Watchful eyes distinguish the four awakened guardians from ordinary foliage.
        pixel(offset(p, -2, -8), GOLD, 4);
        pixel(offset(p, 2, -8), GOLD, 4);
      }
    }
    const fog = icon('grove-fog', WIND, [
      '...2222...222...',
      '.2233332223332..',
      '233344333344332.',
      '.22233333333222.',
    ]);
    for (let i = 0; i < 12; i++) {
      if (!lingering && t < i * 25) continue;
      const p = tilePoint(pts, 0.08 + k.hash(i, seed(s), 4) * 0.84, 0.08 + k.hash(i, seed(s), 5) * 0.84);
      stamp(fog, offset(p, Math.floor(Math.sin(s.c.raw / 380 + i) * 3), 0), lingering ? s.linger : t < 1050 ? 1 : 0.5);
    }
  }

  // Druid Grove: four watchful tree guardians rise around tangled roots, flowering grass, and low silver fog.
  FX.register('druid-grove', {
    palette: LEAF,
    travel: 380,
    beats: () => [beat(C + 380, 110)],
    end: () => 1780,
    reach,
    ground: s => grove(s),
    linger: s => grove(s, true),
    air(s) {
      if (!live(s, 1780)) return;
      const h = s.hits[0],
        pts = corners(s),
        e = s.real(h);
      impact(s, h, centre(s), LEAF, 'druid-grove', 34, 9);
      if (e >= 0 && e < 650)
        for (let i = 0; i < 12; i++) {
          const p = tilePoint(pts, k.hash(i, seed(s), 8), k.hash(i, seed(s), 9));
          leaf(offset(p, Math.sin(e / 100 + i) * 4, -e / 40), i + e / 200);
        }
    },
  });

  function bladeWall(s, lingering = false) {
    if (!lingering && !live(s, 1660)) return;
    const pts = corners(s),
      a = tilePoint(pts, 0, 0.5),
      b = tilePoint(pts, 1, 0.5);
    const length = Math.hypot(b.x - a.x, b.y - a.y),
      n = Math.min(42, Math.max(4, Math.ceil(length / 10)));
    const t = s.c.t - C,
      phase = Math.floor(s.c.raw / 65) % 8;
    border(pts, SILVER, 2);
    const height = s.area ? Math.max(12, ((s.area.height || 20) / (s.grid.feet || 5)) * 16) : 22;
    const blade = icon('barrier-blade', SILVER, [
      '...5...',
      '..454..',
      '..454..',
      '..343..',
      '..343..',
      '.23432.',
      '3444443',
      '...2...',
      '...3...',
    ]);
    const row = (r, count) => {
      for (let i = 0; i < count; i++) {
        if (lingering && s.linger < 0.5 && i % 2) continue;
        const u = (i + 0.5) / count,
          p = { x: k.mix(a.x, b.x, u), y: k.mix(a.y, b.y, u) - r * height };
        if (!lingering && t < 240 && u > 0.15 + (t / 240) * 0.85) continue;
        k.blitRotated(blade, p.x, p.y, ((phase + i * 2 + r * 3) * Math.PI) / 4);
      }
    };
    // All the tall rotating steel stays below the figures; only contact sparks cross them.
    stroke(a, b, SILVER, 3, 2);
    stroke(offset(a, 0, -height), offset(b, 0, -height), SILVER, 2);
    row(0.15, n);
    row(0.5, n);
    row(0.85, n);
  }

  // Blade Barrier: a full hundred-foot curtain of whirling silver swords shears upward with white steel contact sparks.
  FX.register('blade-barrier', {
    palette: SILVER,
    travel: 240,
    beats: e => ids(e).map(id => beat(C + 240, 130, id, 'hit', 0.08)),
    end: () => 1660,
    reach,
    flash,
    ground: s => bladeWall(s),
    linger: s => bladeWall(s, true),
    air(s) {
      if (!live(s, 1660)) return;
      s.hits.forEach(h => {
        const p = k.P(target(s, h)),
          e = s.real(h);
        impact(s, h, p, SILVER, 'blade-barrier', 36, 12);
        if (e >= 0 && e < 180) {
          const r = 4 + e / 12;
          stroke(offset(p, -r, r), offset(p, r, -r), SILVER, e < 60 ? 5 : 3, 2);
        }
      });
    },
  });

  // Wind Walk: bodies unspool into pale cloud silhouettes, then race away as long, curling ribbons of wind.
  FX.register('wind-walk', {
    palette: WIND,
    travel: 260,
    beats: e => ids(e).map(id => beat(C + 260, 80, id)),
    end: () => 1470,
    ground(s) {
      if (!live(s, 1470)) return;
      s.hits.forEach(h => pulse(s, h, feet(target(s, h)), WIND, 21));
    },
    air(s) {
      if (!live(s, 1470)) return;
      s.hits.forEach(h => {
        const p = k.P(target(s, h)),
          t = s.c.t - C;
        if (t < 260) {
          for (let i = 0; i < 3; i++) ring(offset(p, 0, 8 - i * 8), 12 + i * 2, 4, WIND, 3, 5, t / 70 + i);
        } else if (t < 960) {
          const q = (t - 260) / 700;
          stamp(
            icon('wind-body', WIND, [
              '...444...',
              '..45554..',
              '...444...',
              '..34443..',
              '.3455543.',
              '344444443',
              '.3333333.',
              '..3333...',
              '...33....',
              '....3....',
            ]),
            offset(p, q * 13, -q * 7),
          );
          for (let i = 0; i < 6; i++) {
            const x = -16 + ((t / 24 + i * 7) % 31),
              y = -12 + i * 4;
            stroke(offset(p, x, y), offset(p, x + 9, y - 1), WIND, i % 2 ? 3 : 4);
          }
        }
        impact(s, h, p, WIND, 'wind-walk', 26, 6);
        motes(s, p, WIND, s.real(h), 8, 23, 14);
      });
    },
  });

  function deathField(s) {
    if (!live(s, 1640)) return;
    const p = centre(s),
      r = Math.max(8, Math.round(radius(s, 24))),
      t = s.c.t - C;
    if (t < 300) {
      const grow = Math.max(0.06, k.ease(t / 300));
      ring(p, r * grow, r * grow, DEATH, 4);
      return;
    }
    const f = Math.min(9, Math.floor((t - 300) / 95)),
      size = r * 2 + 7;
    const img = k.sprite(`b30:death-field:${r}:${f}`, size, size, DEATH, set => {
      for (let y = 2; y < size - 2; y++)
        for (let x = 2; x < size - 2; x++) {
          const dx = x - r - 3,
            dy = y - r - 3,
            d = Math.hypot(dx, dy) / r;
          if (d > 1) continue;
          const a = Math.atan2(dy, dx),
            rib = Math.abs(Math.sin(a * 12 + d * 4));
          if (f < 2) set(x, y, d > 0.93 ? 4 : f === 0 ? 1 : 2);
          else if (d > 0.87 + f * 0.009 && (f < 6 || Math.floor(a * 13) % 3 === 0)) set(x, y, f < 5 ? 3 : 2);
          else if (f < 6 && rib < 0.07 && d > f * 0.12) set(x, y, 2);
        }
    });
    stamp(img, p);
  }

  // Circle of Death: a black-violet sixty-foot death sphere snaps outward; skeletal sigils shatter into necrotic ash.
  FX.register('circle-of-death', {
    palette: DEATH,
    travel: 300,
    beats: e => ids(e).map(id => beat(C + 300, 190, id, 'blast', 0.09)),
    end: () => 1640,
    reach,
    flash: (e, t) => (t < 32 ? { color: '#ead8ee', alpha: 0.22 } : t < 90 ? { color: '#100919', alpha: 0.28 } : null),
    ground: s => deathField(s),
    air(s) {
      if (!live(s, 1640)) return;
      const p = centre(s),
        t = s.c.t - C;
      if (t < 300) {
        orb(p, 4, DEATH, 4);
        for (let i = 0; i < 5; i++) {
          const a = (i * k.tau) / 5 + t / 160;
          pixel(offset(p, Math.cos(a) * 13, Math.sin(a) * 8), DEATH, 3, 2);
        }
      }
      s.hits.forEach(h => {
        const at = k.P(target(s, h)),
          e = s.real(h);
        impact(s, h, at, DEATH, 'circle-of-death', 42, 12);
        if (e >= 95 && e < 430) {
          const rise = (e - 95) / 28;
          stamp(
            icon('death-skull', DEATH, [
              '..44444..',
              '.4333334.',
              '434343434',
              '433333334',
              '.4434344.',
              '..44444..',
              '..3.3.3..',
            ]),
            offset(at, 0, -7 - rise),
          );
        }
        motes(s, at, DEATH, e, 10, 23, 28);
      });
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
