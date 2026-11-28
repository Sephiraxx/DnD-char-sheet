/* Pixel spells, batch 34 (see docs/pixel-spells/BRIEF.md). */
(function (root) {
  'use strict';
  const FX = root.BoardPixelFX;
  if (!FX) return;
  const k = FX.kit;
  const C = k.CAST;
  const FIRE = ['#290d10', '#722019', '#bf3c1d', '#f57926', '#ffd165', '#fff6d5'];
  const GOLD = ['#291a24', '#73502b', '#c48b37', '#f6c65f', '#fff0b6', '#ffffff'];
  const FORCE = ['#151330', '#39327c', '#7264c6', '#b3a8fa', '#e7e2ff', '#ffffff'];
  const JADE = ['#122328', '#28514d', '#478978', '#86c5a2', '#c9e7c4', '#f6ffeb'];
  const DEATH = ['#100e1b', '#283135', '#476345', '#82a45b', '#c8e39c', '#efffd6'];
  const PLANAR = ['#19102e', '#492775', '#8749b3', '#d987d6', '#f8d5ef', '#ffffff'];
  const GHOST = ['#182332', '#3b5366', '#7996aa', '#b2cbd6', '#e2eef0', '#ffffff'];
  const MIND = ['#280e29', '#68204e', '#b53679', '#f77caf', '#ffd1df', '#fff5f8'];
  const MIRAGE = ['#152533', '#344f64', '#438c83', '#8ec4ac', '#e3d2a3', '#fff4d6'];
  const ASH = ['#19151c', '#30262c', '#554248', '#82716d', '#ac9b86', '#e2d1aa'];
  const seed = s => s.event.seed || 0;
  const add = (p, x, y) => ({ x: p.x + x, y: p.y + y });
  const ids = e => (e.targets?.length ? [...new Set(e.targets)] : [null]);
  const beat = (at, stop, target = null, kind = 'soft', power = 0.04) => ({ at, stop, target, kind, power });
  const soft = (e, kit, travel) => [beat(C + travel, 80)];
  const live = (s, end) => s.c.t >= C && s.c.t < end;
  const feet = p => k.P({ x: p.baseX ?? p.x, y: p.baseY ?? p.y });
  const aim = s => s.area || s.pose.target || s.targets[0] || s.pose.base || s.pose.hand;
  const center = s => k.P(aim(s));
  const base = s => feet(s.pose.base || s.pose.hand || aim(s));
  function contact(s, hit) {
    const t = s.targets.find(t => t.id === hit.id) || s.targets[0] || aim(s);
    return k.P(k.contact(t, s.pose.hand || s.pose.base || t));
  }
  function pixel(p, ramp, index = 4, size = 1) {
    k.dot(p.x, p.y, ramp[0], size + 2);
    k.dot(p.x, p.y, ramp[index], size);
  }
  function orb(p, radius, ramp, index = 3) {
    k.disc(p.x, p.y, radius + 1, ramp[0]);
    k.disc(p.x, p.y, radius, ramp[index]);
    if (radius > 2) k.disc(p.x - 1, p.y - 1, radius * 0.42, ramp[4]);
  }
  function stamp(img, p) {
    k.blit(img, p.x - img.width / 2, p.y - img.height / 2);
  }
  function icon(key, ramp, rows) {
    return k.sprite(`b34:${key}`, rows[0].length + 2, rows.length + 2, ramp, set => {
      rows.forEach((row, y) => [...row].forEach((v, x) => v !== '.' && set(x + 1, y + 1, Number(v))));
    });
  }
  // Cache long strokes and area rings; only small moving accents use live dots.
  function line(a, b, ramp, width = 1, index = 3) {
    const dx = Math.round(b.x - a.x),
      dy = Math.round(b.y - a.y),
      pad = width + 2;
    const ox = pad - Math.min(0, dx),
      oy = pad - Math.min(0, dy);
    const img = k.sprite(
      `b34:line:${dx}:${dy}:${ramp[1]}:${width}:${index}`,
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
    const img = k.sprite(`b34:ring:${rx}:${ry}:${ramp[1]}:${index}:${gap}:${f}`, rx * 2 + 5, ry * 2 + 5, ramp, set => {
      for (let y = -ry; y <= ry; y++)
        for (let x = -rx; x <= rx; x++) {
          if (Math.abs(Math.hypot(x / rx, y / ry) - 1) * Math.min(rx, ry) > 0.65) continue;
          if (gap && Math.floor(((Math.atan2(y, x) + Math.PI) / k.tau) * gap * 2 + f / 2) % 2) continue;
          set(x + rx + 2, y + ry + 2, index);
        }
    });
    stamp(img, p);
  }
  function impact(s, h, p, ramp, name, size = 30, n = 7) {
    const e = s.real(h);
    k.drawHit(k.hitStyle(`b34:${name}`, ramp, { S: size, spikes: 6, minor: 2, jag: 0.3 }), p, e);
    k.shards(p, e, ramp, seed(s) + h.at, n, size * 0.6);
  }
  function motes(s, p, ramp, e, n = 10, reach = 20, up = 0) {
    if (e < 0 || e > 520) return;
    const q = e / 520;
    for (let i = 0; i < n; i++) {
      if (q > 0.7 && i % 2) continue;
      const a = k.hash(i, seed(s), 34) * k.tau;
      pixel(
        add(p, Math.cos(a) * k.ease(q) * reach, Math.sin(a) * k.ease(q) * reach * 0.55 - up * q),
        ramp,
        i % 2 ? 3 : 4,
      );
    }
  }
  function sigil(p, ramp, q, radius = 17) {
    ring(p, radius, radius * 0.5, ramp, 3);
    ring(p, radius * 0.72, radius * 0.36, ramp, 2, 6, q);
    for (let i = 0; i < 6; i++) {
      const a = (i * k.tau) / 6;
      pixel(add(p, Math.cos(a) * radius, Math.sin(a) * radius * 0.5), ramp, 4);
    }
  }
  function star(p, ramp, r = 4) {
    const img = k.sprite(`b34:star:${r}:${ramp[1]}`, r * 2 + 5, r * 2 + 5, ramp, set => {
      for (let y = -r; y <= r; y++)
        for (let x = -r; x <= r; x++)
          if (Math.abs(x) + Math.abs(y) <= r && (Math.abs(x) <= 1 || Math.abs(y) <= 1))
            set(x + r + 2, y + r + 2, Math.abs(x) + Math.abs(y) < 2 ? 5 : 3);
    });
    stamp(img, p);
  }
  function flight(H, T, q, bend = 0) {
    return { x: k.mix(H.x, T.x, q), y: k.mix(H.y, T.y, q) - Math.sin(q * Math.PI) * bend };
  }
  function trail(H, T, q, ramp, bend = 0) {
    for (let i = 7; i > 0; i--) {
      const u = q - i * 0.035;
      if (u >= 0) pixel(flight(H, T, u, bend), ramp, i < 3 ? 4 : 2, i < 3 ? 2 : 1);
    }
  }
  function celestial() {
    return icon('celestial', GOLD, [
      '...........44444...........',
      '..........4.....4..........',
      '...........44444...........',
      '.5..........555..........5.',
      '.45........54445........54.',
      '.345.......54445.......543.',
      '..3455......333......5543..',
      '..23455....45554....55432..',
      '...234455.4555554.554432...',
      '....2344454555554544432....',
      '.....23333455555433332.....',
      '.......2224555554222.......',
      '..........3455543..........',
      '..........3455543..........',
      '..........3445443..........',
      '.........344454443.........',
      '.........344454443.........',
      '........34444544443........',
      '........34444544443........',
      '.......3444445444443.......',
      '.......3333333333333.......',
    ]);
  }
  function magen() {
    return icon('magen', JADE, [
      '......33333......',
      '.....3444443.....',
      '.....3454543.....',
      '.....3444443.....',
      '......33333......',
      '...22333333322...',
      '..2333345433332..',
      '..2333345433332..',
      '..2323345433232..',
      '..2323333333232..',
      '..2322333332232..',
      '..232.33333.232..',
      '..343.22222.343..',
      '......33.33......',
      '.....333.333.....',
      '.....332.233.....',
      '.....332.233.....',
      '.....332.233.....',
      '....2332.2332....',
      '....2222.2222....',
    ]);
  }
  function sword() {
    return icon('sword', FORCE, [
      '......5......',
      '.....454.....',
      '.....454.....',
      '.....354.....',
      '.....354.....',
      '.....354.....',
      '.....354.....',
      '.....354.....',
      '.....354.....',
      '.....354.....',
      '.....354.....',
      '.....354.....',
      '.....354.....',
      '.....354.....',
      '.....354.....',
      '.33..354..33.',
      '..344444443..',
      '...3333333...',
      '......3......',
      '......4......',
      '......3......',
      '.....343.....',
      '......3......',
    ]);
  }
  function skull() {
    return icon('death-skull', DEATH, [
      '..33333..',
      '.3444443.',
      '344444443',
      '341444143',
      '341444143',
      '.3442443.',
      '..43434..',
      '..43434..',
      '...333...',
    ]);
  }
  function doorway(key, ramp, frame, mansion = false) {
    return k.sprite(`b34:door:${key}:${frame}`, 35, 41, ramp, set => {
      for (let y = 2; y < 39; y++)
        for (let x = 3; x < 32; x++) {
          const dx = Math.abs(x - 17);
          if (dx > 13 || y < 2 + Math.max(0, dx - 5)) continue;
          const edge = dx > 10 || y < 4 + Math.max(0, dx - 5) || y > 36;
          if (edge) {
            set(x, y, (x + y) % 7 === 0 ? 5 : 3);
            continue;
          }
          if (mansion) {
            // A tiny lit banquet hall beyond the threshold: columns, chandelier, red carpet.
            let index = y < 25 ? 1 : 2;
            if ((x === 9 || x === 25) && y > 12 && y < 32) index = 4;
            if (y > 27 && dx < (y - 24) * 0.55) index = 3;
            if ((y === 11 && dx <= 5) || (dx === 5 && y >= 8 && y < 12)) index = 5;
            if (y === 23 && dx <= 6) index = 4;
            set(x, y, index);
          } else {
            const d = Math.hypot((x - 17) / 10, (y - 23) / 16);
            set(x, y, 1 + ((Math.floor(d * 5) + frame) % 3));
            if ((x * 7 + y * 11 + frame * 5) % 71 === 0) set(x, y, 5);
          }
        }
    });
  }

  // Delayed Blast Fireball: a tiny golden bead hangs and pulses, then detonates into fire, soot and embers.
  FX.register('delayed-blast-fireball', {
    palette: FIRE,
    travel: 950,
    beats: (e, kit, travel) => ids(e).map(id => beat(C + travel, 200, id, 'blast', 0.09)),
    end: (e, travel) => C + travel + 820,
    flash: (e, t) => (t < 35 ? { color: FIRE[5], alpha: 0.3 } : t < 80 ? { color: FIRE[0], alpha: 0.25 } : null),
    reach: (e, g) => ({ r: ((e.area?.feet || 20) / (g.feet || 5)) * 1.15 + 0.5, up: 3 }),
    ground(s) {
      if (!live(s, 2070)) return;
      const p = center(s),
        h = s.hits[0],
        e = s.real(h);
      const R = ((s.area?.feet || 20) / (s.grid.feet || 5)) * k.PX;
      if (s.c.t < h.at) {
        if (s.c.t >= C + 260) ring(p, 7 + (Math.floor((s.c.t - C) / 100) % 3), 4, GOLD, 3);
        return;
      }
      if (e < 0) return;
      const f = Math.min(12, Math.floor(e / 65));
      const img = k.sprite(
        `b34:delayed:${Math.round(R)}:${f}:${seed(s) % 4}`,
        Math.ceil(R * 2.4 + 6),
        Math.ceil(R * 1.6 + 6),
        [...FIRE, ...ASH.slice(1)],
        set => {
          const w = Math.ceil(R * 2.4 + 6),
            hh = Math.ceil(R * 1.6 + 6);
          const q = k.clamp(f / 5),
            radius = R * (0.22 + 0.78 * k.ease(q));
          const billows = [];
          if (f < 10) billows.push({ x: 0, y: 0, r: radius * 0.65, i: 0 });
          for (let i = 1; i <= 9; i++) {
            const a = (i * k.tau) / 9 + (seed(s) % 4) * 0.4;
            const settle = f < 9 ? 1 : Math.max(0.12, 1 - (f - 9) * 0.26);
            billows.push({
              x: Math.cos(a) * radius * 0.65,
              y: Math.sin(a) * radius * 0.6 - Math.max(0, f - 6) * R * 0.055,
              r: radius * (0.28 + k.hash(i, seed(s) % 4) * 0.09) * settle,
              i,
            });
          }
          for (let y = 2; y < hh - 2; y++)
            for (let x = 2; x < w - 2; x++) {
              const dx = x - w / 2,
                dy = (y - hh / 2) / 0.63;
              const d = Math.hypot(dx, dy);
              if (f < 2) {
                const a = Math.atan2(dy, dx),
                  spike = Math.abs(Math.cos(a * 6)) ** 12;
                if (d < radius * (0.5 + spike * 0.5)) set(x, y, f ? (d < radius * 0.35 ? 1 : 5) : 5);
                continue;
              }
              let best = null,
                depth = 0;
              for (const b of billows) {
                const v = 1 - Math.hypot(dx - b.x, dy - b.y) / b.r;
                if (v > depth) {
                  best = b;
                  depth = v;
                }
              }
              if (!best) continue;
              const light = k.clamp(0.55 - ((dx - best.x) / best.r) * 0.25 - ((dy - best.y) / best.r) * 0.45);
              const cool = f >= 7 && (best.i > 0 || f >= 9);
              set(
                x,
                y,
                cool
                  ? 6 + k.band(light, 4, x, y)
                  : 1 + k.band(1 - (d / radius) * 0.7 + light * 0.35 - Math.max(0, f - 5) * 0.08, 5, x, y),
              );
            }
        },
      );
      stamp(img, p);
      if (e < 520)
        ring(p, R * (0.35 + k.ease(e / 520) * 0.75), R * 0.55 * (0.35 + k.ease(e / 520) * 0.75), ASH, 4, 12, 0);
    },
    air(s) {
      if (!live(s, 2070)) return;
      const p = center(s),
        h = s.hits[0],
        t = s.c.t - C;
      if (s.c.t < h.at) {
        const H = k.P(s.pose.hand || aim(s));
        if (t < 260) {
          const q = t / 260;
          trail(H, p, q, FIRE, 10);
          orb(flight(H, p, q, 10), 2, GOLD, 4);
        } else {
          const pulse = Math.floor((t - 260) / 90) % 3;
          orb(p, 2 + (pulse === 2 ? 1 : 0), GOLD, 4);
          for (let i = 0; i < 4; i++) {
            const a = (i * k.tau) / 4 + t / 150;
            pixel(add(p, Math.cos(a) * (9 - pulse * 2), Math.sin(a) * (9 - pulse * 2)), FIRE, 3);
          }
        }
        return;
      }
      s.hits.forEach(h => impact(s, h, contact(s, h), FIRE, 'delayed-fire', 40, 9));
      const e = s.real(h);
      motes(s, p, FIRE, e - 130, 18, ((s.area?.feet || 20) / (s.grid.feet || 5)) * 14, 9);
    },
  });

  // Conjure Celestial: a golden seal opens beneath a haloed, feather-winged heavenly visitor.
  FX.register('conjure-celestial', {
    palette: GOLD,
    travel: 390,
    beats: soft,
    end: () => 1540,
    ground(s) {
      if (!live(s, 1540)) return;
      sigil(add(center(s), 0, 13), GOLD, s.c.t / 90);
    },
    air(s) {
      if (!live(s, 1540)) return;
      const p = center(s),
        h = s.hits[0],
        t = s.c.t - C;
      if (s.c.t < h.at) {
        for (let i = 0; i < 5; i++) {
          const x = (i - 2) * 5;
          line(add(p, x, 12), add(p, x, 12 - k.ease(t / 390) * (25 - Math.abs(x))), GOLD, 1, i % 2 ? 3 : 4);
        }
      } else {
        stamp(celestial(), add(p, 0, -2 - Math.round(Math.sin((s.c.t - h.at) / 190))));
        impact(s, h, p, GOLD, 'celestial-arrival', 30, 6);
        motes(s, p, GOLD, s.real(h), 10, 18, 7);
      }
    },
  });

  // Plane Shift: a tuning fork rings, a violet planar aperture opens, and travellers break into crossing sparks.
  FX.register('plane-shift', {
    palette: PLANAR,
    travel: 380,
    beats: soft,
    end: () => 1600,
    ground(s) {
      if (!live(s, 1600)) return;
      const from = feet(s.event.teleport?.from || s.pose.base || aim(s));
      const to = feet(s.event.teleport?.to || s.pose.target || aim(s));
      sigil(from, PLANAR, s.c.t / 100, 17);
      if (s.c.t >= 960) sigil(to, PLANAR, -s.c.t / 100, 17);
    },
    air(s) {
      if (!live(s, 1600)) return;
      const h = s.hits[0],
        from = feet(s.event.teleport?.from || s.pose.base || aim(s));
      const to = feet(s.event.teleport?.to || s.pose.target || aim(s));
      const t = s.c.t - C;
      if (t < 220) {
        const p = k.P(s.pose.hand || s.pose.base || aim(s));
        line(add(p, 0, 4), add(p, 0, -3), GOLD, 1, 4);
        line(add(p, -3, -10), add(p, -3, -3), GOLD, 1, 4);
        line(add(p, 3, -10), add(p, 3, -3), GOLD, 1, 4);
        line(add(p, -3, -3), add(p, 3, -3), GOLD, 1, 4);
        ring(p, 7 + Math.floor(t / 45), 10, PLANAR, 3, 8, 0);
      }
      const door = (p, e) => {
        if (e < 0 || e > 600) return;
        if (e < 400) stamp(doorway('plane', PLANAR, Math.floor(e / 80) % 4), add(p, 0, -1));
        else ring(p, Math.max(2, 14 * (1 - (e - 400) / 200)), 17, PLANAR, 4, 8, 0);
      };
      door(from, t - 180);
      door(to, t - 660);
      impact(s, h, add(from, 0, -8), PLANAR, 'plane-depart', 30, 6);
      motes(s, from, PLANAR, s.real(h), 12, 17, 13);
      const arrival = s.real(h) - 480;
      k.drawHit(k.hitStyle('b34:plane-arrive', PLANAR, { S: 28, spikes: 4 }), add(to, 0, -8), arrival);
      motes(s, to, PLANAR, arrival, 12, 17, 5);
    },
  });

  function cage(s, front) {
    const p = center(s),
      corners = s.area ? k.outline(s.area, s.grid) : [];
    const pts =
      corners.length >= 4
        ? corners.slice(0, 4).map(v => k.P({ x: v.x ?? v[0], y: v.y ?? v[1] }))
        : [add(p, -19, -10), add(p, 19, -10), add(p, 19, 12), add(p, -19, 12)];
    const cy = pts.reduce((sum, at) => sum + at.y, 0) / 4;
    const h = s.area ? ((s.area.height || s.area.feet || 20) / (s.grid.feet || 5)) * k.PX : 28;
    const q = k.ease(k.clamp((s.c.t - C) / 450));
    for (let i = 0; i < 4; i++) {
      const a = pts[i],
        b = pts[(i + 1) % 4];
      const isFront = (a.y + b.y) / 2 >= cy;
      if (isFront !== front) continue;
      line(a, b, FORCE, 1, 3);
      const n = Math.max(2, Math.min(16, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 7)));
      for (let j = 0; j <= n; j++) {
        const at = flight(a, b, j / n);
        line(at, add(at, 0, -h * q), FORCE, 1, j === 0 || j === n ? 4 : 2);
      }
      line(add(a, 0, -h * q), add(b, 0, -h * q), FORCE, 1, 4);
    }
    if (!front && q === 1) {
      for (let j = 1; j < 6; j++) {
        const a = flight(pts[0], pts[1], j / 6),
          b = flight(pts[3], pts[2], j / 6);
        line(add(a, 0, -h), add(b, 0, -h), FORCE, 1, 2);
      }
    }
    if (q === 1 && front) pts.forEach(at => star(add(at, 0, -h), FORCE, 2));
  }

  // Magnificent Mansion: an ornate freestanding doorway opens onto a warm hall with columns, carpet and chandelier.
  FX.register('mordenkainens-magnificent-mansion', {
    palette: GOLD,
    travel: 470,
    beats: soft,
    end: () => 1620,
    ground(s) {
      if (!live(s, 1620)) return;
      const p = center(s);
      sigil(add(p, 0, 17), GOLD, s.c.t / 120, 15);
      if (s.c.t >= 770) {
        line(add(p, -7, 18), add(p, 7, 18), GOLD, 2, 3);
        line(add(p, -9, 20), add(p, 9, 20), GOLD, 1, 4);
      }
    },
    air(s) {
      if (!live(s, 1620)) return;
      const p = center(s),
        h = s.hits[0];
      if (s.c.t < h.at) {
        const q = (s.c.t - C) / 470;
        line(add(p, -14, 17), add(p, -14, 17 - q * 32), GOLD, 2, 3);
        line(add(p, 14, 17), add(p, 14, 17 - q * 32), GOLD, 2, 3);
        star(add(p, 0, -q * 18), GOLD, 3);
      } else {
        stamp(doorway('mansion', GOLD, 0, true), p);
        for (const x of [-15, 15]) {
          line(add(p, x, 14), add(p, x, -11), GOLD, 1, 2);
          star(add(p, x, -13), GOLD, 2);
        }
        impact(s, h, p, GOLD, 'mansion-open', 30, 8);
      }
    },
    linger(s) {
      if (s.linger > 0 && s.c.t >= 1620) stamp(doorway('mansion', GOLD, 0, true), center(s));
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
