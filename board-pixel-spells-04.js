/* Pixel spells, batch 04: cantrips (see docs/pixel-spells/BRIEF.md). */
(function (root) {
  'use strict';
  const FX = root.BoardPixelFX;
  if (!FX) return;
  const k = FX.kit;
  const GOLD = ['#281c10', '#735124', '#bd8b37', '#f5cb68', '#fff0bc', '#ffffff'];
  const THUNDER = ['#141a26', '#3a4f6e', '#6f8fb5', '#b6d0ea', '#eef6ff', '#ffffff'];
  const GREEN = ['#092218', '#155435', '#219b48', '#74e84d', '#d5ff9c', '#ffffff'];
  const VIOLET = ['#16122c', '#393268', '#7563b0', '#b5a0ed', '#e5dbff', '#ffffff'];
  const POISON = ['#182015', '#34472a', '#708140', '#acca64', '#e8edb3', '#ffffff'];
  const BLUE = ['#0d1030', '#2b3fb0', '#4f8dff', '#a8e4ff', '#f4fdff', '#ffffff'];
  const WATER = ['#102232', '#194e6c', '#2785aa', '#67cbdc', '#c3f4f5', '#ffffff'];
  const EARTH = ['#251c18', '#493023', '#805135', '#b58a54', '#dfc08a', '#fff0cc'];
  const firstBeat = (event, kit, travel, kind = 'soft', stop = 0) => [
    { at: kit.CAST + travel, stop, target: event.targets?.[0] ?? null, kind, power: kind === 'soft' ? 0 : 0.065 },
  ];
  const soft = (event, kit, travel) => firstBeat(event, kit, travel);
  const finish = tail => (event, travel) => k.CAST + travel + tail;
  const seed = s => s.event.seed || 0;
  const add = (p, x, y) => ({ x: p.x + x, y: p.y + y });
  function aim(s, index = 0) {
    const hit = s.hits[index];
    const target = s.targets.find(t => hit && t.id === hit.id) || s.targets[index];
    return target || s.pose.target || s.area || s.pose.hand || s.pose.base;
  }
  function point(s, index = 0) {
    const t = aim(s, index);
    return k.P(s.pose.hand && t ? k.contact(t, s.pose.hand) : t);
  }
  function feet(s) {
    const t = aim(s);
    return k.P({ x: t.baseX ?? t.x, y: t.baseY ?? t.y });
  }
  function pixel(p, ramp, color = 3, size = 1) {
    k.dot(p.x, p.y, ramp[0], size + 2);
    k.dot(p.x, p.y, ramp[color], size);
  }
  function stroke(points, ramp, color = 3, width = 1, dashed = false) {
    // Bound the sample count even for a very long beam.
    const lengths = points.slice(1).map((p, i) => Math.hypot(p.x - points[i].x, p.y - points[i].y));
    const total = lengths.reduce((a, b) => a + b, 0);
    const step = Math.max(1, total / 66);
    for (const [ink, w] of [
      [ramp[0], width + 2],
      [ramp[color], width],
    ]) {
      for (let i = 0; i < lengths.length; i++) {
        const n = Math.max(1, Math.ceil(lengths[i] / step));
        for (let j = 0; j <= n; j++) {
          if (dashed && Math.floor(j / 3) % 2) continue;
          const q = j / n;
          k.dot(k.mix(points[i].x, points[i + 1].x, q), k.mix(points[i].y, points[i + 1].y, q), ink, w);
        }
      }
    }
  }
  function ring(p, rx, ry, ramp, color = 3, broken = false) {
    rx = Math.max(2, Math.round(rx));
    ry = Math.max(2, Math.round(ry));
    const img = k.sprite(`04:ring:${ramp[2]}:${rx}:${ry}:${color}:${broken}`, rx * 2 + 7, ry * 2 + 7, ramp, set => {
      for (let y = 1; y < ry * 2 + 6; y++)
        for (let x = 1; x < rx * 2 + 6; x++) {
          const dx = x - rx - 3,
            dy = y - ry - 3;
          const d = Math.hypot(dx / rx, dy / ry);
          if (Math.abs(d - 1) * Math.min(rx, ry) > 0.65) continue;
          if (broken && Math.floor((Math.atan2(dy, dx) + k.tau) * 5) % 3 === 0) continue;
          set(x, y, color);
        }
    });
    k.blit(img, p.x - rx - 3, p.y - ry - 3);
  }
  function spark(p, ramp, r = 3) {
    stroke([add(p, -r, 0), add(p, r, 0)], ramp, 4);
    stroke([add(p, 0, -r), add(p, 0, r)], ramp, 5);
  }
  function impact(s, index, ramp, style, size = 30) {
    const h = s.hits[index];
    if (!h) return;
    const p = point(s, index),
      e = s.real(h);
    k.drawHit(k.hitStyle(`04:${style}`, ramp, { S: size, spikes: style === 'sacred' ? 4 : 6, jag: 0.25 }), p, e);
    k.shards(p, e, ramp, seed(s) + index * 37, 8, 20);
  }
  function flame(ramp, frame, size = 19) {
    return k.sprite(`04:flame:${ramp[2]}:${frame}:${size}`, size, size + 10, ramp, set => {
      for (let y = 2; y < size + 8; y++)
        for (let x = 2; x < size - 2; x++) {
          const h = (size + 7 - y) / (size + 5),
            dx = x - size / 2;
          const sway = Math.sin(h * 7 + frame * 1.2) * h * 2;
          const width = (1 - h) * size * 0.37 + Math.sin(h * 9 + frame) * 1.3;
          if (Math.abs(dx - sway) < width) set(x, y, h > 0.65 ? 2 : Math.abs(dx) < width * 0.4 ? 5 : dx < 0 ? 4 : 3);
        }
    });
  }
  function blade(s, ramp) {
    const e = s.c.t - k.CAST;
    if (e < 0 || e > 270 || !s.pose.hand) return;
    const H = k.P(s.pose.hand),
      T = point(s),
      q = k.clamp(e / 180);
    const img = k.sprite(`04:blade:${ramp[2]}`, 30, 13, ramp, set => {
      for (let x = 7; x < 27; x++) {
        const w = x > 23 ? 1 : 2;
        for (let y = 6 - w; y <= 6 + w; y++) set(x, y, y < 6 ? 5 : y === 6 ? 4 : 2);
      }
      for (let y = 2; y <= 10; y++) set(7, y, 3);
      for (let x = 2; x < 7; x++) {
        set(x, 6, 1);
        set(x, 5, 3);
      }
    });
    const a = Math.atan2(T.y - H.y, T.x - H.x) - 1.1 + k.ease(q) * 1.9;
    // A local weapon swing and a separate contact slash: never a flying sword.
    if (e < 180) k.blitRotated(img, H.x, H.y, a, 0.15);
    const slash = [];
    for (let i = 0; i < 11; i++) {
      const t = -1.8 + i * 0.16 + q * 0.45;
      slash.push(add(T, Math.cos(t) * 15, Math.sin(t) * 18));
    }
    if (e > 85) stroke(slash, ramp, e < 200 ? 5 : 3, e < 200 ? 2 : 1);
  }
  function footprint(s) {
    const corners = s.area ? k.outline(s.area, s.grid) : [];
    if (corners.length >= 4) return corners.slice(0, 4).map(p => k.P(Array.isArray(p) ? { x: p[0], y: p[1] } : p));
    const C = k.P(s.pose.target || s.area || aim(s));
    const half = (((s.area?.feet || 5) / (s.grid.feet || 5)) * k.PX) / 2;
    return [add(C, -half, -half), add(C, half, -half), add(C, half, half), add(C, -half, half)];
  }
  function plot(s) {
    const v = footprint(s);
    const C = { x: v.reduce((a, p) => a + p.x, 0) / 4, y: v.reduce((a, p) => a + p.y, 0) / 4 };
    return { v, C, size: Math.max(8, Math.min(64, Math.hypot(v[1].x - v[0].x, v[1].y - v[0].y))) };
  }
  function patch(s, ramp, water, frame) {
    const { v, C } = plot(s);
    const x0 = Math.floor(Math.min(...v.map(p => p.x))) - 2;
    const y0 = Math.floor(Math.min(...v.map(p => p.y))) - 2;
    const w = Math.ceil(Math.max(...v.map(p => p.x)) - x0) + 3;
    const h = Math.ceil(Math.max(...v.map(p => p.y)) - y0) + 3;
    const local = v.map(p => ({ x: Math.round(p.x - x0), y: Math.round(p.y - y0) }));
    const key = local.map(p => `${p.x},${p.y}`).join(':');
    const img = k.sprite(`04:patch:${water}:${key}:${frame}`, w, h, ramp, set => {
      for (let y = 2; y < h - 2; y++)
        for (let x = 2; x < w - 2; x++) {
          let inside = false;
          for (let i = 0, j = 3; i < 4; j = i++) {
            const a = local[i],
              b = local[j];
            if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
          }
          if (!inside) continue;
          const edge = Math.min(
            ...local.map((a, i) => {
              const b = local[(i + 1) % 4],
                dx = b.x - a.x,
                dy = b.y - a.y;
              return Math.abs(dx * (a.y - y) - (a.x - x) * dy) / (Math.hypot(dx, dy) || 1);
            }),
          );
          if (water) {
            const wave = Math.floor((Math.hypot(x - w / 2, (y - h / 2) * 1.5) - frame * 2) / 3);
            set(x, y, edge < 2 ? 4 : wave % 4 === 0 ? 3 : y < h / 2 ? 2 : 1);
          } else set(x, y, edge < 2 ? 3 : edge < 4 ? 2 : 1);
        }
    });
    k.blit(img, x0, y0);
    return { v, C };
  }

  // Guidance: a warm blessing spirals upward and resolves into a small four-sided divination die.
  FX.register('guidance', {
    palette: GOLD,
    travel: 160,
    beats: soft,
    end: finish(820),
    ground(s) {
      const e = s.c.t - k.CAST;
      if (e < 0 || e > 900) return;
      ring(feet(s), 10 + Math.min(4, e / 70), 6, GOLD, 3, e > 650);
    },
    air(s) {
      const e = s.c.t - k.CAST;
      if (e < 0 || e > 980) return;
      const T = point(s),
        C = add(T, 0, -15 - k.ease(k.clamp(e / 300)) * 6);
      for (let i = 0; i < 6; i++) {
        const q = (e / 750 + i / 6) % 1,
          a = q * k.tau * 1.4 + seed(s);
        if (e > 720 && i % 2) continue;
        pixel(add(T, Math.cos(a) * 10, 8 - q * 29), GOLD, i % 2 ? 3 : 4);
      }
      if (e > 120) {
        const img = k.sprite('04:guidance-d4', 17, 18, GOLD, set => {
          for (let y = 2; y < 15; y++)
            for (let x = 2; x < 15; x++) if (Math.abs(x - 8) <= (y - 1) / 2) set(x, y, x < 8 ? 4 : 2);
          for (let y = 7; y < 13; y++) set(8, y, 5);
          set(7, 8, 5);
        });
        k.blit(img, C.x - 8, C.y - 8);
        if (e < 360) spark(add(C, 10, -4), GOLD, 2);
      }
    },
  });

  // Booming Blade: a blue-white weapon cut leaves a tight, vibrating cage of thunder around the victim.
  FX.register('booming-blade', {
    palette: THUNDER,
    travel: 180,
    beats: (event, kit, travel) => firstBeat(event, kit, travel, 'hit', 100),
    end: finish(640),
    ground(s) {
      const e = s.real(s.hits[0]);
      if (e < 0 || e > 690) return;
      const C = feet(s);
      ring(C, 10 + Math.min(10, e / 20), 5 + Math.min(4, e / 40), THUNDER, e < 80 ? 5 : 3, e > 340);
    },
    air(s) {
      blade(s, THUNDER);
      const e = s.real(s.hits[0]);
      if (e >= 80 && e < 650) {
        const T = point(s),
          tick = Math.floor(e / 55);
        for (let side = -1; side <= 1; side += 2) {
          const pts = Array.from({ length: 7 }, (_, i) =>
            add(T, side * (11 + (i % 2 ? 2 : 0) + (tick % 2)), -12 + i * 4),
          );
          stroke(pts, THUNDER, e < 440 ? 4 : 2);
        }
        ring(add(T, 0, -10), 12 + (tick % 2), 4, THUNDER, 3, e > 420);
      }
      impact(s, 0, THUNDER, 'thunder', 34);
    },
  });

  // Green-Flame Blade: an emerald burning sword cuts once; green fire leaps from that body to a second victim.
  FX.register('green-flame-blade', {
    palette: GREEN,
    travel: 180,
    beats(event, kit, travel) {
      const ids = event.targets?.length ? event.targets.slice(0, 2) : [null];
      return ids.map((target, i) => ({
        at: kit.CAST + travel + i * 260,
        stop: i ? 70 : 90,
        target,
        kind: 'hit',
        power: 0.06,
      }));
    },
    end: event => k.CAST + 180 + (event.targets?.length > 1 ? 260 : 0) + 540,
    air(s) {
      blade(s, GREEN);
      s.hits.forEach((hit, i) => {
        const e = s.real(hit),
          T = point(s, i);
        if (e >= 0 && e < 430) {
          const img = flame(GREEN, Math.floor(e / 60) % 4, e > 300 ? 11 : 17);
          k.blit(img, T.x - img.width / 2, T.y - img.height + 8);
        }
        impact(s, i, GREEN, 'green-flame', 28);
      });
      if (s.hits.length < 2) return;
      const e = s.c.t - s.hits[0].at,
        flight = s.hits[1].at - s.hits[0].at;
      if (e < 0 || e >= flight) return;
      const A = point(s),
        B = point(s, 1),
        q = e / flight;
      for (let j = 4; j >= 0; j--) {
        const u = q - j * 0.075;
        if (u < 0) continue;
        const p = { x: k.mix(A.x, B.x, u), y: k.mix(A.y, B.y, u) - Math.sin(u * Math.PI) * 12 };
        pixel(p, GREEN, j ? 3 : 5, j ? 2 : 4);
      }
    },
  });

  // True Strike: a violet diviner's eye opens over the selected foe and brackets a precise weak point.
  FX.register('true-strike', {
    palette: VIOLET,
    travel: 200,
    beats: soft,
    end: finish(800),
    air(s) {
      const e = s.c.t - k.CAST;
      if (e < 0 || e > 1000) return;
      const T = point(s),
        E = add(T, 0, -21),
        r = 12 - 5 * k.ease(k.clamp(e / 360));
      if (e < 320 && s.pose.hand) stroke([k.P(s.pose.hand), T], VIOLET, 2, 1, true);
      const img = k.sprite('04:true-eye', 25, 13, VIOLET, set => {
        for (let y = 2; y <= 10; y++)
          for (let x = 2; x <= 22; x++)
            if (Math.abs(y - 6) <= 4 * (1 - Math.abs(x - 12) / 11)) set(x, y, Math.abs(x - 12) <= 2 ? 2 : 4);
        for (let y = 3; y <= 9; y++) set(12, y, 1);
        set(11, 4, 5);
      });
      k.blit(img, E.x - 12, E.y - 6);
      for (let side = -1; side <= 1; side += 2) {
        stroke([add(T, side * (r - 3), -r), add(T, side * r, -r), add(T, side * r, -r + 4)], VIOLET, 4);
        stroke([add(T, side * (r - 3), r), add(T, side * r, r), add(T, side * r, r - 4)], VIOLET, 4);
      }
      if (e > 200 && e < 550) spark(T, VIOLET, 2);
    },
  });

  // Infestation: a dirty green swarm of winged biting insects converges, stings and scatters sideways.
  FX.register('infestation', {
    palette: POISON,
    travel: 260,
    beats: (event, kit, travel) => firstBeat(event, kit, travel, 'hit', 80),
    end: finish(650),
    air(s) {
      const e = s.c.t - k.CAST;
      if (e < 0 || e > 910) return;
      const T = point(s),
        real = s.real(s.hits[0]);
      for (let i = 0; i < 11; i++) {
        const a = (i * k.tau) / 11 + e / 95,
          r = e < 260 ? k.mix(23, 6, k.clamp(e / 260)) : 7 + Math.max(0, real - 180) / 32;
        const flee = Math.max(0, real - 300) / 25,
          dir = (Math.floor(k.hash(4, seed(s)) * 4) * Math.PI) / 2;
        const p = add(
          T,
          Math.cos(a) * r + Math.cos(dir) * flee,
          Math.sin(a) * r * 0.6 + Math.cos(i + e / 45) * 2 + Math.sin(dir) * flee,
        );
        if (real > 530 && i % 2) continue;
        const flap = (Math.floor(s.c.raw / 40) + i) % 2;
        const bug = k.sprite(`04:insect:${flap}`, 9, 9, POISON, set => {
          set(3, 3, 4);
          set(5, 3, 4);
          set(2, 2 + flap, 4);
          set(6, 2 + flap, 4);
          set(4, 3, 1);
          set(4, 4, 3);
          set(4, 5, 2);
          set(3, 6, 1);
          set(5, 6, 1);
        });
        k.blit(bug, p.x - 4, p.y - 4);
      }
      impact(s, 0, POISON, 'bites', 24);
    },
  });

  // Lightning Lure: a jagged blue lightning cord hooks around the body, snaps taut and reels toward the caster.
  FX.register('lightning-lure', {
    palette: BLUE,
    travel: 90,
    beats: (event, kit, travel) => firstBeat(event, kit, travel, 'pull', 95),
    end: finish(580),
    air(s) {
      const e = s.c.t - k.CAST;
      if (e < 0 || e > 670 || !s.pose.hand) return;
      const H = k.P(s.pose.hand),
        T = point(s),
        dx = T.x - H.x,
        dy = T.y - H.y,
        L = Math.hypot(dx, dy) || 1;
      const retract = k.clamp((e - 330) / 240),
        reach = 1 - k.ease(retract);
      if (reach > 0.02) {
        const tick = Math.floor(e / 40),
          pts = [];
        for (let i = 0; i <= 12; i++) {
          const u = (i / 12) * reach,
            zig = i === 0 || i === 12 ? 0 : (k.hash(i, seed(s), tick) - 0.5) * (e < 90 ? 12 : 6);
          pts.push({ x: H.x + dx * u - (dy / L) * zig, y: H.y + dy * u + (dx / L) * zig });
        }
        stroke(pts, BLUE, 3, 3);
        stroke(pts, BLUE, 5, 1);
        ring(pts[12], 6 * reach + 2, 10 * reach + 2, BLUE, 4, e > 250);
        if (e < 180) spark(H, BLUE, 4);
      }
      impact(s, 0, BLUE, 'lightning', 34);
    },
  });

  // Sacred Flame: an ivory-gold tongue of radiant fire drops vertically from heaven into a four-point holy strike.
  FX.register('sacred-flame', {
    palette: GOLD,
    travel: 250,
    beats: (event, kit, travel) => firstBeat(event, kit, travel, 'hit', 105),
    end: finish(550),
    ground(s) {
      const e = s.real(s.hits[0]);
      if (e < 0 || e > 440) return;
      ring(feet(s), 6 + k.ease(k.clamp(e / 320)) * 12, 3 + e / 90, GOLD, e < 75 ? 5 : 3, e > 180);
    },
    air(s) {
      const e = s.c.t - k.CAST,
        T = point(s);
      if (e >= 0 && e < 250) {
        const q = e / 250,
          p = add(T, 0, -30 * (1 - q * q));
        const img = flame(GOLD, Math.floor(e / 45) % 4, 15);
        k.blit(img, p.x - img.width / 2, p.y - img.height + 7);
        for (let i = 1; i < 5; i++) pixel(add(p, i % 2 ? -3 : 3, -i * 4), GOLD, i < 3 ? 4 : 2);
      }
      const real = s.real(s.hits[0]);
      if (real >= 70 && real < 440) {
        for (let i = 0; i < 5; i++) {
          const q = real / 440;
          pixel(add(T, (i - 2) * (3 + q * 3), -k.ease(q) * (13 + k.hash(i, seed(s)) * 9)), GOLD, i % 2 ? 4 : 3);
        }
      }
      impact(s, 0, GOLD, 'sacred', 36);
    },
  });

  // Dancing Lights: exactly four cool lantern motes fan out from the hand and bob in a loose, circling quartet.
  FX.register('dancing-lights', {
    palette: VIOLET,
    travel: 300,
    beats: soft,
    end: finish(1000),
    ground(s) {
      const e = s.c.t - k.CAST;
      if (e < 250 || e > 1300) return;
      const T = k.P(aim(s));
      for (let i = 0; i < 4; i++) {
        const a = (i * k.tau) / 4 + e / 1000;
        ring(add(T, Math.cos(a) * 15, Math.sin(a) * 7 + 9), 4, 2, VIOLET, 2);
      }
    },
    air(s) {
      const e = s.c.t - k.CAST;
      if (e < 0 || e > 1300) return;
      const T = k.P(aim(s)),
        H = k.P(s.pose.hand || aim(s)),
        q = k.ease(k.clamp(e / 300));
      for (let i = 0; i < 4; i++) {
        const a = (i * k.tau) / 4 + e / 1000;
        const p = {
          x: k.mix(H.x, T.x + Math.cos(a) * 15, q),
          y: k.mix(H.y, T.y + Math.sin(a) * 7 - 10 + Math.sin(e / 160 + i) * 3, q),
        };
        k.disc(p.x, p.y, 4, VIOLET[0]);
        k.disc(p.x, p.y, 3, VIOLET[3]);
        k.disc(p.x - 1, p.y - 1, 1.5, VIOLET[5]);
        if (e < 1000) spark(add(p, i % 2 ? 6 : -6, -3), VIOLET, 1);
      }
    },
  });

  // Light: a touched pebble becomes a steady white-gold lamp; crisp rays pop outward and settle around it.
  FX.register('light', {
    palette: GOLD,
    travel: 100,
    beats: soft,
    end: finish(900),
    ground(s) {
      const e = s.c.t - k.CAST - 100;
      if (e < 0 || e > 900) return;
      const T = k.P(aim(s));
      ring(add(T, 0, 6), 8 + Math.min(8, e / 35), 4 + Math.min(3, e / 70), GOLD, 2, e < 280);
    },
    air(s) {
      const e = s.c.t - k.CAST;
      if (e < 100 || e > 1000) return;
      const T = k.P(aim(s));
      k.disc(T.x, T.y, 5, GOLD[0]);
      k.disc(T.x, T.y, 4, GOLD[3]);
      k.disc(T.x - 1, T.y - 1, 2, GOLD[5]);
      const r = 9 + Math.min(3, (e - 100) / 30);
      for (let i = 0; i < 8; i++) {
        const a = (i * k.tau) / 8,
          len = i % 2 ? 2 : 4;
        stroke(
          [add(T, Math.cos(a) * r, Math.sin(a) * r), add(T, Math.cos(a) * (r + len), Math.sin(a) * (r + len))],
          GOLD,
          e < 200 ? 5 : 4,
        );
      }
      if (e < 430) k.shards(T, s.real(s.hits[0]), GOLD, seed(s), 5, 13);
    },
  });

  // Mage Hand: a translucent cyan five-fingered hand floats out, pinches a pebble, lifts it and gently lets go.
  FX.register('magehand', {
    palette: WATER,
    travel: 300,
    beats: soft,
    end: finish(1000),
    air(s) {
      const e = s.c.t - k.CAST;
      if (e < 0 || e > 1300) return;
      const H = k.P(s.pose.hand || aim(s)),
        T = k.P(aim(s)),
        q = k.ease(k.clamp(e / 300));
      const lift =
        e < 400 ? 0 : e < 700 ? k.ease((e - 400) / 300) * 9 : e < 950 ? 9 : 9 * (1 - k.clamp((e - 950) / 250));
      const p = { x: k.mix(H.x, T.x - 4, q), y: k.mix(H.y, T.y - 3, q) - lift };
      const closed = e > 360 && e < 1000;
      const img = k.sprite(`04:hand:${closed}`, 23, 26, WATER, set => {
        for (let y = 10; y <= 20; y++) for (let x = 7; x <= 16; x++) set(x, y, x < 11 ? 3 : 2);
        for (let f = 0; f < 4; f++) {
          const x = 7 + f * 3,
            top = closed ? 9 + (f % 2) : 3 + Math.abs(f - 1);
          for (let y = top; y < 13; y++) {
            set(x, y, 4);
            set(x + 1, y, 3);
          }
        }
        for (let y = 12; y <= 17; y++) {
          const x = 3 + Math.floor((y - 12) / 2);
          set(x, y, 4);
          set(x + 1, y, 3);
        }
        for (let y = 21; y <= 23; y++) for (let x = 9; x <= 14; x++) set(x, y, y === 23 ? 1 : 2);
        for (let y = 12; y <= 17; y++) set(9, y, 4);
      });
      // The harmless demonstration prop follows the gripping fingers, then drops back in place.
      if (e > 300) pixel(add(T, 0, 9 - lift), THUNDER, 3, 3);
      k.blit(img, p.x - 11, p.y - 13);
      if (e < 400) for (let i = 1; i < 5; i++) pixel(add(p, -i * 3, 12 + i), WATER, 2);
    },
  });

  // Message: a narrow curling whisper thread carries tiny speech marks to an outlined listening ear.
  FX.register('message', {
    palette: VIOLET,
    travel: 380,
    beats: soft,
    end: finish(620),
    air(s) {
      const e = s.c.t - k.CAST;
      if (e < 0 || e > 1000 || !s.pose.hand) return;
      const H = k.P(s.pose.hand),
        T = add(point(s), 7, -5),
        q = k.clamp(e / 380);
      const at = u => ({ x: k.mix(H.x, T.x, u), y: k.mix(H.y, T.y, u) + Math.sin(u * k.tau) * 6 });
      if (e < 540) {
        const pts = Array.from({ length: 19 }, (_, i) => at((i / 18) * q));
        stroke(pts, VIOLET, e < 380 ? 3 : 2, 1, true);
        for (let i = 0; i < 3; i++) {
          const u = q - i * 0.13;
          if (u < 0 || e > 460) continue;
          const p = at(u);
          stroke([add(p, -2, -2), add(p, 0, -2), add(p, 0, 1), add(p, -1, 2)], VIOLET, 4);
        }
      }
      if (e > 280) {
        const img = k.sprite('04:ear', 14, 19, VIOLET, set => {
          const rows = [
            '...3333...',
            '..344443..',
            '.34....43.',
            '.34.33.43.',
            '.34.34343.',
            '..3.34343.',
            '....34343.',
            '...34343..',
            '...3443...',
            '...343....',
            '...343....',
            '....33....',
          ];
          rows.forEach((row, y) =>
            [...row].forEach((v, x) => {
              if (v !== '.') set(x + 2, y + 3, Number(v));
            }),
          );
        });
        k.blit(img, T.x - 6, T.y - 9);
        if (e < 760) {
          const r = 5 + (Math.floor((e - 280) / 100) % 3) * 3;
          stroke([add(T, -r, -5), add(T, -r - 2, 0), add(T, -r, 5)], VIOLET, 4);
        }
      }
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
