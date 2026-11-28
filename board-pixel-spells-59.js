/* Pixel spells, batch 59: monumental enchantments, broken reality and ninth-level magic. */
(function (root) {
  'use strict';
  const FX = root.BoardPixelFX;
  if (!FX) return;
  const k = FX.kit;
  const GOLD = ['#302015', '#826020', '#dca937', '#ffe178', '#fff5cb', '#ffffff'];
  const MIND = ['#200e32', '#4c226e', '#8747c4', '#c789ff', '#edccff', '#ffffff'];
  const BREAK = ['#170e30', '#4a266d', '#8650cf', '#b299ff', '#79edfa', '#f1ffff'];
  const EARTH = ['#251e1b', '#574234', '#997755', '#cfaa77', '#f7d7a1', '#fff2ce'];
  const WATER = ['#10263c', '#155784', '#208aca', '#4ac8f2', '#b0f0ff', '#ffffff'];
  const CHANGE = ['#132d2a', '#245b58', '#3fae9d', '#87efcb', '#d6ffe6', '#ffffff'];
  const AGE = ['#24242d', '#575763', '#92909a', '#cec6ae', '#ffe6ad', '#ffffff'];
  const BLADE = ['#140e20', '#21152e', '#59296c', '#b545a7', '#ff526c', '#fff0ed'];
  const at = (s, self = false) => {
    const t = self ? null : s.targets[0];
    if (t) return k.P(t);
    const b = s.pose.base || s.pose.target || s.pose.hand;
    const p = k.P(b);
    return { x: p.x, y: p.y - (self || !s.pose.target ? 10 : 0) };
  };
  const centre = s => k.P(s.area || s.pose.target || s.pose.base);
  const radius = (s, fallback) => Math.max(12, Math.round(((s.area?.feet || fallback) / (s.grid.feet || 5)) * 16));
  const beat = (event, travel, stop = 110, kind = 'soft', all = false) =>
    (all && event.targets?.length ? event.targets : [event.targets?.[0] ?? null]).map(target => ({
      at: k.CAST + travel,
      stop,
      target,
      kind,
      power: kind === 'soft' ? 0.03 : 0.085,
    }));
  function pixel(x, y, p, size = 2, index = 4) {
    k.dot(x, y, p[0], size + 2);
    k.dot(x, y, p[index], size);
  }
  // Sprite-space strokes have cached, automatic outlines; no canvas paths are used.
  function stroke(set, ax, ay, bx, by, index, width = 2) {
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay)));
    for (let j = 0; j <= n; j++)
      for (let dy = 0; dy < width; dy++)
        for (let dx = 0; dx < width; dx++)
          set(Math.round(k.mix(ax, bx, j / n)) + dx, Math.round(k.mix(ay, by, j / n)) + dy, index);
  }
  function place(img, p, alpha = 1) {
    k.blit(img, p.x - img.width / 2, p.y - img.height / 2, alpha);
  }
  function ring(p, rx, ry, pal, alpha = 1, index = 4, thick = 2) {
    rx = Math.max(3, Math.round(rx));
    ry = Math.max(2, Math.round(ry));
    const img = k.sprite(`59:ring:${pal[2]}:${rx}:${ry}:${index}:${thick}`, rx * 2 + 8, ry * 2 + 8, pal, set => {
      for (let y = -ry - 1; y <= ry + 1; y++)
        for (let x = -rx - 1; x <= rx + 1; x++) {
          const d = Math.hypot(x / rx, y / ry);
          if (Math.abs(d - 1) * Math.min(rx, ry) <= thick / 2) set(x + rx + 4, y + ry + 4, index);
        }
    });
    place(img, p, alpha);
  }
  function star(size, pal, key = 'star') {
    return k.sprite(`59:${key}:${size}:${pal[2]}`, size + 6, size + 6, pal, set => {
      const c = (size + 6) / 2;
      for (let y = 2; y < size + 4; y++)
        for (let x = 2; x < size + 4; x++) {
          const dx = x - c,
            dy = y - c,
            d = Math.hypot(dx, dy);
          const a = Math.atan2(dy, dx);
          const reach = size * (0.11 + 0.39 * Math.abs(Math.cos(a * 4)) ** 10);
          if (d < reach) set(x, y, d < size * 0.12 ? 5 : d < size * 0.25 ? 4 : 3);
        }
    });
  }
  function impacts(s, p, pal, name, size = 38) {
    for (const hit of s.hits) {
      const target = s.targets.find(t => t.id === hit.id);
      const q = target ? k.P(target) : p;
      const e = s.real(hit);
      k.drawHit(k.hitStyle(`59:${name}`, pal, { S: size, spikes: 6, minor: 4, jag: 0.25 }), q, e);
      k.shards(q, e, pal, (s.event.seed || 0) + 59, 9, size * 0.7);
    }
  }
  function chain(p, rx, ry, phase, pal, alpha = 1) {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * k.tau + phase;
      ring({ x: p.x + Math.cos(a) * rx, y: p.y + Math.sin(a) * ry }, 4, i % 2 ? 2 : 3, pal, alpha, i % 3 ? 3 : 4);
    }
  }
  function deliver(s, dest, pal, arrive) {
    if (!s.pose.hand || s.c.t < k.CAST || s.c.t >= arrive) return;
    const h = k.P(s.pose.hand),
      q = k.clamp((s.c.t - k.CAST) / (arrive - k.CAST));
    for (let i = 0; i < 9; i++) {
      const u = q - i * 0.035;
      if (u >= 0) pixel(k.mix(h.x, dest.x, u), k.mix(h.y, dest.y, u) - Math.sin(u * Math.PI) * 8, pal, i ? 2 : 5);
    }
  }
  const flash = (event, e) =>
    e < 40 ? { color: '#fff5d9', alpha: 0.23 } : e < 85 ? { color: '#21172e', alpha: 0.13 } : null;

  // Dominate Monster: heavy violet links snap around the skull, a mind-crown locks, and both eyes ignite.
  FX.register('dominate-monster', {
    palette: MIND,
    travel: 250,
    beats: (event, kit, travel) => beat(event, travel, 130),
    end: () => 1390,
    air(s) {
      const p = at(s),
        h = { x: p.x, y: p.y - 6 },
        t = s.c.t - 550;
      deliver(s, h, MIND, 550);
      if (s.c.t >= 380 && t < 0) chain(h, 25 - k.ease((s.c.t - 380) / 170) * 10, 10, s.c.t / 170, MIND);
      if (t >= 0) {
        const a = t < 570 ? 1 : 0.75;
        chain(h, 14, 7, 0.2, MIND, a);
        chain({ x: h.x, y: h.y + 5 }, 12, 5, -0.4, MIND, a);
        for (let i = -1; i <= 1; i++) {
          pixel(h.x + i * 8, h.y - 10 - (i === 0 ? 4 : 0), MIND, 4, 4);
        }
        pixel(h.x - 4, h.y + 1, MIND, 3, 5);
        pixel(h.x + 4, h.y + 1, MIND, 3, 5);
        if (t > 590) ring({ x: p.x, y: p.y + 9 }, 10, 4, MIND, 0.75);
      }
      impacts(s, h, MIND, 'dominate', 32);
    },
  });

  function auraFloor(s, alpha, growing = 1) {
    const p = k.P(s.pose.base),
      r = radius(s, 30);
    ring(p, r * growing, r * growing, GOLD, alpha, 3, 3);
    ring(p, r * growing - 6, r * growing - 6, GOLD, alpha * 0.5, 4);
    const halo = k.sprite('59:aura-centre', 53, 53, GOLD, set => {
      for (let y = 2; y < 51; y++)
        for (let x = 2; x < 51; x++) {
          const d = Math.hypot(x - 26, y - 26);
          if (d < 23 && (d < 12 || Math.abs(x - 26) < 3 || Math.abs(y - 26) < 3 || k.dith(x, y) < 0.25))
            set(x, y, d < 8 ? 4 : d < 14 ? 3 : 2);
        }
    });
    place(halo, p, alpha * 0.75);
    const pulse = (s.c.raw % 2200) / 2200;
    ring(p, 13 + pulse * 14, 8 + pulse * 9, GOLD, alpha * (1 - pulse * 0.6), 4, 3);
  }
  function halos(s, alpha) {
    const b = s.pose.base,
      list = [{ x: b.x, y: b.y - 0.62 }, ...s.targets];
    const seen = new Set();
    for (const t of list) {
      const key = `${Math.round(t.x * 8)}:${Math.round(t.y * 8)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const p = k.P(t);
      p.y -= 12 + Math.round(Math.sin(s.c.raw / 650) * 1);
      ring(p, 10, 4, GOLD, alpha, 5, 2);
      const wings = k.sprite('59:halo-wings', 33, 15, GOLD, set => {
        for (let side = -1; side <= 1; side += 2)
          for (let i = 0; i < 4; i++) {
            stroke(set, 16 + side * (8 + i * 2), 8 - i, 16 + side * (10 + i), 3 - i * 0.6, i % 2 ? 4 : 3, 2);
          }
      });
      place(wings, p, alpha);
    }
  }
  // Holy Aura: a thirty-foot gold-white sanctuary anchored by a bright caster pulse and winged ally halos.
  FX.register('holy-aura', {
    palette: GOLD,
    travel: 260,
    beats: (event, kit, travel) => beat(event, travel, 140, 'soft', true),
    end: () => 1560,
    flash,
    ground(s) {
      if (s.c.t < k.CAST) return;
      if (s.c.t < 560) auraFloor(s, 1, 0.18 + 0.82 * k.ease((s.c.t - k.CAST) / 260));
      else if (!s.pose.linger) auraFloor(s, 1);
    },
    air(s) {
      if (s.c.t >= 560 && !s.pose.linger) halos(s, 1);
      impacts(s, at(s, true), GOLD, 'holy-aura', 38);
    },
    linger(s) {
      auraFloor(s, s.linger);
    },
    lingerAir(s) {
      halos(s, s.linger);
    },
  });

  function word() {
    return k.sprite('59:word-stun', 51, 35, GOLD, set => {
      // Three monumental rune letters joined by a commanding top bar.
      stroke(set, 4, 7, 45, 7, 4, 3);
      for (let i = 0; i < 3; i++) {
        const x = 6 + i * 15;
        stroke(set, x, 5, x, 26, 5, 3);
        stroke(set, x, 14, x + 8, 10, 3, 3);
        stroke(set, x + 8, 10, x + 8, 23, 4, 3);
        stroke(set, x, 26, x + 8, 20, 4, 3);
      }
      stroke(set, 7, 30, 43, 30, 3, 2);
    });
  }
  // Power Word Stun: a massive white-gold command slams onto the body and leaves orbiting head stars.
  FX.register('power-word-stun', {
    palette: GOLD,
    travel: 220,
    beats: (event, kit, travel) => beat(event, travel, 180, 'hit'),
    end: () => 1440,
    flash,
    air(s) {
      const p = at(s),
        t = s.c.t - 520;
      if (s.c.t >= 300 && t < 430) place(word(), { x: p.x, y: p.y - (t < 0 ? 20 * (1 - k.ease((t + 220) / 220)) : 0) });
      if (t >= 0) {
        const h = { x: p.x, y: p.y - 13 };
        ring(h, 15, 5, GOLD, 0.75, 3);
        for (let i = 0; i < 4; i++) {
          const a = s.c.raw / 180 + (i * k.tau) / 4;
          place(star(11, GOLD), { x: h.x + Math.cos(a) * 15, y: h.y + Math.sin(a) * 5 });
        }
      }
      impacts(s, p, GOLD, 'word', 48);
    },
  });

  function fracture(index) {
    return k.sprite(`59:fracture:${index}`, 18, 27, BREAK, set => {
      for (let y = 3; y < 24; y++)
        for (let x = 2; x < 16; x++) {
          const v = Math.abs(x - 8 + (y - 13) * 0.23);
          if (v < (1 - Math.abs(y - 13) / 11) * 6) set(x, y, v > 3 ? 4 : x < 8 ? 2 : 3);
        }
      stroke(set, 9, 4, 4, 16, 5, 2);
    });
  }
  // Reality Break: the space around the target splinters into large cyan-edged violet fractal mirrors.
  FX.register('reality-break', {
    palette: BREAK,
    travel: 260,
    beats: (event, kit, travel) => beat(event, travel, 180, 'hit'),
    end: () => 1610,
    air(s) {
      const p = at(s),
        t = s.c.t - 560;
      deliver(s, p, BREAK, 560);
      if (t >= -120 && t < 730) {
        const q = t < 0 ? k.clamp((t + 120) / 120) : 1;
        const r = 11 + 12 * q + (t > 380 ? (t - 380) / 35 : 0);
        const tick = Math.floor(s.c.raw / 95);
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * k.tau;
          const dx = (k.hash(i, tick, s.event.seed) - 0.5) * 5;
          const point = { x: p.x + Math.cos(a) * r + dx, y: p.y + Math.sin(a) * r * 0.8 };
          k.blitRotated(fracture(i % 2), point.x, point.y, a + Math.PI / 2);
          if (i % 2) place(fracture(2), { x: point.x + 6, y: point.y + 9 }, 0.5);
        }
        for (let i = 0; i < 6; i++) {
          const x = p.x + (k.hash(i, tick, 7) - 0.5) * 40,
            y = p.y - 17 + i * 6;
          pixel(x, y, BREAK, 3, i % 2 ? 4 : 3);
          pixel(x + 5, y, BREAK, 2, 5);
        }
      }
      if (t >= 730) ring({ x: p.x, y: p.y + 10 }, 13, 5, BREAK, 0.75);
      impacts(s, p, BREAK, 'reality', 48);
    },
  });

  function fissures(r, stage, seed) {
    const w = r * 2 + 16,
      c = w / 2;
    const pal = [EARTH[0], EARTH[0], EARTH[2], EARTH[3], EARTH[4], EARTH[5]];
    return k.sprite(`59:fissures:${r}:${stage}:${seed % 7}`, w, w, pal, set => {
      const paths = [];
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * k.tau + (k.hash(i, seed) - 0.5) * 0.18;
        let prev = { x: c, y: c };
        const steps = Math.max(7, Math.ceil(r / 13));
        for (let j = 1; j <= steps; j++) {
          const d = (((r * j) / steps) * (stage + 1)) / 4;
          const bend = (k.hash(i, j, seed) - 0.5) * Math.min(15, r * 0.15);
          const next = { x: c + Math.cos(a) * d - Math.sin(a) * bend, y: c + Math.sin(a) * d + Math.cos(a) * bend };
          paths.push([prev.x, prev.y, next.x, next.y, j < steps / 2 ? 5 : 3]);
          if (j % 3 === 0) {
            const ba = a + (i % 2 ? 0.65 : -0.65),
              length = Math.min(28, r * 0.16);
            paths.push([next.x, next.y, next.x + Math.cos(ba) * length, next.y + Math.sin(ba) * length, 2]);
          }
          prev = next;
        }
      }
      for (const p of paths) stroke(set, p[0], p[1], p[2], p[3], 4, p[4] + 4);
      // Deep dark cracks within broad sunlit broken edges.
      for (const p of paths) stroke(set, p[0] + 1, p[1] + 1, p[2] + 1, p[3] + 1, 1, p[4]);
    });
  }
  function quakeFloor(s, alpha, stage = 3, shake = false) {
    const p = centre(s),
      r = radius(s, 100);
    if (shake) {
      p.x += Math.round(Math.sin(s.c.raw / 24) * 2);
      p.y += Math.round(Math.cos(s.c.raw / 31) * 2);
    }
    place(fissures(r, stage, s.event.seed || 0), p, alpha);
  }
  // Earthquake: branching black fault lines tear across the entire area with tan rims, rocks and dust.
  FX.register('earthquake', {
    palette: EARTH,
    travel: 200,
    beats: (event, kit, travel) => [
      ...beat(event, travel, 180, 'blast', true),
      ...beat(event, travel + 360, 130, 'blast', true),
    ],
    end: () => 1790,
    ground(s) {
      if (s.c.t < 300) return;
      const t = s.c.t - 500;
      quakeFloor(s, 1, Math.min(3, Math.max(0, Math.floor((t + 200) / 120))), true);
      if (t >= 0 && t < 620) {
        const p = centre(s),
          r = radius(s, 100);
        ring(
          p,
          r * (0.25 + 0.75 * k.ease(k.clamp(t / 620))),
          r * (0.25 + 0.75 * k.ease(k.clamp(t / 620))),
          EARTH,
          0.75,
          4,
          3,
        );
      }
    },
    air(s) {
      const p = centre(s),
        r = radius(s, 100);
      impacts(s, p, EARTH, 'quake', 44);
      for (const hit of [s.hits[0], s.hits.find(h => h.at > 500)]) {
        if (!hit) continue;
        const e = s.real(hit);
        if (e < 0 || e > 750) continue;
        const q = e / 750;
        for (let i = 0; i < 34; i++) {
          const a = k.hash(i, s.event.seed, 4) * k.tau,
            d = r * Math.sqrt(k.hash(i, 3, s.event.seed));
          const x = p.x + Math.cos(a) * d,
            y = p.y + Math.sin(a) * d - Math.sin(q * Math.PI) * (8 + k.hash(i, 9) * 16);
          if (i % 3) {
            k.disc(x, y, 3 + q * 4, EARTH[0]);
            k.disc(x, y - 1, 2 + q * 4, EARTH[q < 0.6 ? 3 : 2]);
          } else pixel(x, y, EARTH, 4, 4);
        }
      }
    },
    linger(s) {
      if (s.c.t >= 1790) quakeFloor(s, s.linger);
    },
  });

  function waterWall(s, alpha, advance = 0, calm = false) {
    const a = s.area,
      p = k.P(a || s.pose.target || s.pose.base);
    const len = radius(s, 300),
      dir = a?.dir || 0;
    const ux = Math.cos(dir),
      uy = Math.sin(dir),
      nx = -uy,
      ny = ux;
    const frame = Math.floor(s.c.raw / (calm ? 450 : 90)) % 4;
    const ox = 16 + Math.max(0, -ux * len),
      oy = 66 + Math.max(0, -uy * len);
    const w = Math.ceil(Math.abs(ux * len)) + 33,
      h = Math.ceil(Math.abs(uy * len)) + 74;
    // Cache the entire connected wall: only its outer silhouette receives an outline.
    const img = k.sprite(`59:water-wall:${len}:${dir.toFixed(4)}:${frame}`, w, h, WATER, set => {
      for (let d = 0; d <= len; d += 2) {
        const bx = Math.round(ox + ux * d),
          by = Math.round(oy + uy * d);
        for (let dx = -12; dx <= 12; dx++) {
          const crest = 55 + Math.round(Math.sin((d + dx + frame * 4) / 11) * 4);
          for (let y = 0; y <= crest; y++) {
            const stripe = (Math.round(d + dx) + Math.floor(y / 3) + frame * 3 + 32) % 25;
            const index = y > crest - 5 ? 5 : y > crest - 10 ? 4 : stripe < 3 ? 4 : y > 30 ? 3 : y > 10 ? 2 : 1;
            set(bx + dx, by - y, index);
          }
        }
      }
    });
    k.blit(img, p.x - ox + nx * advance, p.y - oy + ny * advance, alpha);
  }
  // Tsunami: a many-square blue water wall rises high, curls a white crest, then crashes forward in sheets.
  FX.register('tsunami', {
    palette: WATER,
    travel: 320,
    beats: (event, kit, travel) => beat(event, travel, 200, 'blast', true),
    end: () => 1810,
    reach: (event, grid) => ({ r: (event.area?.feet || 300) / (grid.feet || 5) + 3, up: 5 }),
    ground(s) {
      if (s.c.t < 300) return;
      const t = s.c.t - 620;
      const advance = t < 0 ? 0 : 16 * Math.sin(k.clamp(t / 1000) * Math.PI);
      waterWall(s, t < 0 ? 0.75 : 1, advance);
    },
    air(s) {
      const p = centre(s),
        e = s.real(s.hits[0]);
      impacts(s, p, WATER, 'tsunami', 48);
      if (e < 0 || e > 650) return;
      const a = s.area,
        len = radius(s, 300),
        dir = a?.dir || 0,
        q = e / 650;
      for (let i = 0; i < 32; i++) {
        const d = k.hash(i, s.event.seed, 3) * len;
        pixel(
          p.x + Math.cos(dir) * d - Math.sin(dir) * q * 30,
          p.y + Math.sin(dir) * d + Math.cos(dir) * q * 30 - 45 - Math.sin(q * Math.PI) * 16 + q * q * 55,
          WATER,
          3,
          i % 2 ? 4 : 5,
        );
      }
    },
    linger(s) {
      if (s.c.t >= 1810) waterWall(s, s.linger, 0, true);
    },
  });

  function beast() {
    return k.sprite('59:shape-dragon', 57, 57, CHANGE, set => {
      for (let y = 3; y < 54; y++)
        for (let x = 3; x < 54; x++) {
          const dx = x - 28,
            dy = y - 30;
          const body = (dx / 10) ** 2 + (dy / 16) ** 2 < 1;
          const wing = y > 10 && y < 35 && Math.abs(dx) > 7 && Math.abs(dx) < 24 - (y - 10) * 0.48;
          const neck = x > 24 && x < 34 && y > 6 && y < 26;
          const head = y > 6 && y < 15 && x > 27 && x < 44 - Math.abs(y - 10);
          const feet = y > 39 && y < 51 && Math.abs(dx) > 5 && Math.abs(dx) < 11;
          const tail = y > 36 && y < 44 && x > 10 && x < 27;
          if (body || wing || neck || head || feet || tail) set(x, y, wing ? 2 : x < 29 ? 1 : 2);
        }
      stroke(set, 6, 13, 18, 28, 3, 2);
      stroke(set, 49, 13, 37, 28, 4, 2);
      stroke(set, 29, 17, 24, 41, 3, 2);
      stroke(set, 32, 7, 30, 3, 4, 2);
      stroke(set, 36, 11, 39, 11, 5, 2);
    });
  }
  // Shapechange: brilliant emerald transformation coils reveal a large horned, winged creature silhouette.
  FX.register('shapechange', {
    palette: CHANGE,
    travel: 440,
    beats: (event, kit, travel) => [{ at: kit.CAST + travel, stop: 160, target: null, kind: 'soft', power: 0.03 }],
    end: () => 1660,
    ground(s) {
      if (s.c.t < 300) return;
      const p = k.P(s.pose.base);
      ring(p, 22, 11, CHANGE, 1, 4, 3);
    },
    air(s) {
      if (s.c.t < 300) return;
      const p = at(s, true),
        t = s.c.t - 740;
      if (t >= 0) place(beast(), { x: p.x, y: p.y - 6 }, t < 630 ? 1 : 0.75);
      if (t < 520)
        for (let j = 0; j < 3; j++) {
          const q = ((s.c.t - 300) / 500 + j / 3) % 1;
          ring({ x: p.x, y: p.y + 15 - q * 44 }, 21 - Math.abs(q - 0.5) * 12, 5, CHANGE, 1, j % 2 ? 4 : 3, 3);
        }
      if (t >= 630) ring({ x: p.x, y: p.y + 12 }, 15, 6, CHANGE, 0.75);
      impacts(s, p, CHANGE, 'shapechange', 54);
    },
  });

  // Wish: a blinding eight-point gold-white wish star anchors concentric ripples in reality.
  FX.register('wish', {
    palette: GOLD,
    travel: 280,
    beats: (event, kit, travel) => [{ at: kit.CAST + travel, stop: 220, target: null, kind: 'soft', power: 0.03 }],
    end: () => 1650,
    flash,
    ground(s) {
      if (s.c.t < 300) return;
      const p = k.P(s.pose.base),
        t = s.c.t - 300;
      for (let j = 0; j < 3; j++) {
        const q = (t / 1050 + j * 0.23) % 1;
        ring(p, 13 + q * 28, 9 + q * 21, GOLD, 1 - q * 0.6, j % 2 ? 4 : 3, 3);
      }
    },
    air(s) {
      const p = at(s, true),
        t = s.c.t - 580;
      if (s.c.t >= 300 && t < 0) {
        ring(p, 23 - (s.c.t - 300) / 20, 23 - (s.c.t - 300) / 20, GOLD, 1);
        place(star(19, GOLD), p);
      }
      if (t >= 0 && t < 680) {
        place(star(59, GOLD, 'wish'), p);
        ring(p, 19, 19, GOLD, 1, 4, 2);
        for (let i = 0; i < 4; i++) {
          const a = (i * Math.PI) / 2 + Math.PI / 4;
          pixel(p.x + Math.cos(a) * 25, p.y + Math.sin(a) * 25, GOLD, 3, 5);
        }
      }
      if (t >= 680) place(star(23, GOLD, 'wish-residue'), p, 0.75);
      impacts(s, p, GOLD, 'wish', 62);
    },
  });

  function clockFace(r) {
    return k.sprite(`59:clock:${r}`, r * 2 + 8, r * 2 + 8, GOLD, set => {
      const c = r + 4;
      for (let y = -r; y <= r; y++)
        for (let x = -r; x <= r; x++) {
          const d = Math.hypot(x, y);
          if (Math.abs(d - r + 2) < 1.5 || Math.abs(d - r + 8) < 1) set(x + c, y + c, 4);
        }
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * k.tau - Math.PI / 2;
        stroke(
          set,
          c + Math.cos(a) * (r - 12),
          c + Math.sin(a) * (r - 12),
          c + Math.cos(a) * (r - 18),
          c + Math.sin(a) * (r - 18),
          i % 3 ? 3 : 5,
          3,
        );
      }
    });
  }
  function clockHands(angle, r) {
    const f = Math.round(angle / (Math.PI / 8)) % 16;
    const c = r + 4;
    return k.sprite(`59:clock-hands:${f}:${r}`, c * 2, c * 2, GOLD, set => {
      const a = (f * Math.PI) / 8;
      stroke(set, c, c, c + Math.cos(a) * r * 0.65, c + Math.sin(a) * r * 0.65, 5, 3);
      stroke(set, c, c, c + Math.cos(a * 0.3 - 1.5) * r * 0.46, c + Math.sin(a * 0.3 - 1.5) * r * 0.46, 3, 4);
    });
  }
  function gear() {
    return k.sprite('59:gear', 25, 25, GOLD, set => {
      for (let y = 2; y < 23; y++)
        for (let x = 2; x < 23; x++) {
          const dx = x - 12,
            dy = y - 12,
            d = Math.hypot(dx, dy),
            a = Math.atan2(dy, dx);
          if (d > 5 && d < 8 + (Math.cos(a * 8) > 0 ? 3 : 0)) set(x, y, d < 7 ? 3 : 4);
        }
    });
  }
  // Time Stop: an enormous pale-gold clock covers a grey stillness field; its hands and gears halt together.
  FX.register('time-stop', {
    palette: GOLD,
    travel: 450,
    beats: (event, kit, travel) => [{ at: kit.CAST + travel, stop: 200, target: null, kind: 'soft', power: 0.03 }],
    end: () => 1710,
    ground(s) {
      if (s.c.t < 300) return;
      const p = s.area ? centre(s) : k.P(s.pose.base),
        r = s.area ? radius(s, 30) : 38;
      const field = k.sprite(`59:stillness:${r}`, r * 2 + 4, r * 2 + 4, AGE, set => {
        for (let y = 2; y < r * 2 + 2; y++)
          for (let x = 2; x < r * 2 + 2; x++) if (Math.hypot(x - r - 2, y - r - 2) < r) set(x, y, 2);
      });
      place(field, p, 0.5);
      place(clockFace(r), p, s.c.t > 1460 ? 0.5 : 1);
      const a = s.c.t < 750 ? (s.c.t - 300) / 80 : 450 / 80;
      place(clockHands(a, r), p);
      for (let i = 0; i < 3; i++) {
        const x = p.x + (i - 1) * 20,
          y = p.y + 15;
        k.blitRotated(gear(), x, y, a * (i % 2 ? -1 : 1));
      }
    },
    air(s) {
      const p = at(s, true);
      if (s.c.t >= 750) {
        for (const t of s.targets) {
          const q = k.P(t);
          ring(q, 12, 17, AGE, 0.5, 3, 2);
          pixel(q.x - 4, q.y - 1, AGE, 3, 3);
          pixel(q.x + 4, q.y - 1, AGE, 3, 3);
        }
      }
      impacts(s, p, GOLD, 'time-stop', 44);
    },
  });

  function gem(size) {
    return k.sprite(`59:prison-gem:${size}`, size + 6, size + 8, MIND, set => {
      const c = (size + 6) / 2;
      for (let y = 3; y < size + 5; y++)
        for (let x = 2; x < size + 4; x++) {
          const dx = x - c,
            dy = y - (size + 8) / 2;
          if (Math.abs(dx) / (size * 0.47) + Math.abs(dy) / (size * 0.6) < 1)
            set(x, y, Math.abs(dx) < 2 ? 5 : dx < 0 ? 4 : dy < 0 ? 3 : 2);
        }
    });
  }
  // Imprisonment: violet-gold shackles contract a spectral captive into a brilliant faceted prison gem.
  FX.register('imprisonment', {
    palette: MIND,
    travel: 300,
    beats: (event, kit, travel) => [...beat(event, travel, 150), ...beat(event, travel + 430, 140)],
    end: () => 1790,
    air(s) {
      const p = at(s),
        t = s.c.t - 600;
      deliver(s, p, GOLD, 600);
      if (s.c.t >= 440 && t < 590) {
        const shrink = 1 - k.clamp((t - 180) / 410) * 0.78;
        const rx = 16 * shrink,
          ry = 20 * shrink;
        chain(p, rx, ry, 0.7, GOLD);
        chain(p, rx, ry, -0.7, MIND);
        const frame = Math.min(5, Math.floor(k.clamp((t - 120) / 310) * 5));
        const scale = 1 - frame * 0.14;
        const captive = k.sprite(`59:captive:${frame}`, 23, 35, MIND, set => {
          for (let y = 3; y < 28; y++)
            for (let x = 3; x < 16; x++) {
              if (
                (x - 9) ** 2 + (y - 7) ** 2 < 17 ||
                (y > 11 && y < 23 && Math.abs(x - 9) < 5) ||
                (y >= 23 && Math.abs(x - 9) > 1 && Math.abs(x - 9) < 5)
              )
                set(11 + (x - 9) * scale, 17 + (y - 15) * scale, x < 9 ? 3 : 4);
            }
        });
        if (t < 430) place(captive, p, 0.75);
        else place(gem(16), p);
      }
      if (t >= 430) {
        place(gem(22), { x: p.x, y: p.y - 3 });
        ring({ x: p.x, y: p.y + 12 }, 15, 5, GOLD, 1, 3, 3);
        if (t > 610) chain({ x: p.x, y: p.y - 3 }, 12, 8, 0, GOLD, 0.75);
      }
      for (const hit of s.hits) {
        k.drawHit(k.hitStyle('59:imprison', MIND, { S: 40, spikes: 4, jag: 0.15 }), p, s.real(hit));
        k.shards(p, s.real(hit), GOLD, s.event.seed || 59, 8, 26);
      }
    },
  });

  function hourglass() {
    return k.sprite('59:hourglass', 35, 45, AGE, set => {
      stroke(set, 4, 4, 28, 4, 4, 4);
      stroke(set, 4, 36, 28, 36, 4, 4);
      stroke(set, 7, 8, 7, 34, 3, 2);
      stroke(set, 26, 8, 26, 34, 3, 2);
      stroke(set, 10, 10, 17, 21, 5, 2);
      stroke(set, 23, 10, 17, 21, 5, 2);
      stroke(set, 17, 21, 10, 34, 4, 2);
      stroke(set, 17, 21, 23, 34, 4, 2);
      for (let y = 10; y < 17; y++) for (let x = y - 1; x <= 34 - y; x++) set(x, y, 4);
      for (let y = 29; y < 35; y++) for (let x = 17 - (y - 28); x <= 17 + y - 28; x++) set(x, y, 3);
      stroke(set, 17, 21, 17, 29, 5, 2);
    });
  }
  // Time Ravage: a giant hourglass tips its golden sand into the victim as branching grey age cracks spread.
  FX.register('time-ravage', {
    palette: AGE,
    travel: 300,
    beats: (event, kit, travel) => beat(event, travel, 190, 'hit'),
    end: () => 1570,
    air(s) {
      const p = at(s),
        t = s.c.t - 600;
      deliver(s, p, AGE, 600);
      if (s.c.t >= 380 && t < 600) {
        const h = { x: p.x, y: p.y - 21 };
        place(hourglass(), h);
        if (t >= 0)
          for (let i = 0; i < 17; i++) {
            const q = (s.c.raw / 370 + i / 17) % 1;
            pixel(
              p.x + (k.hash(i, s.event.seed) - 0.5) * (3 + q * 11),
              p.y - 4 + q * 20,
              AGE,
              i % 3 ? 2 : 3,
              i % 2 ? 3 : 4,
            );
          }
      }
      if (t >= 0) {
        const cracks = k.sprite('59:age-cracks', 31, 35, AGE, set => {
          stroke(set, 9, 7, 14, 17, 3, 3);
          stroke(set, 14, 17, 10, 28, 3, 3);
          stroke(set, 14, 17, 22, 21, 4, 2);
          stroke(set, 23, 5, 20, 14, 4, 2);
          stroke(set, 20, 14, 26, 26, 3, 3);
          stroke(set, 20, 14, 15, 9, 4, 2);
        });
        place(cracks, { x: p.x, y: p.y + 1 }, t < 600 ? 1 : 0.75);
        if (t >= 600) ring({ x: p.x, y: p.y + 13 }, 13, 4, AGE, 0.75, 3);
      }
      impacts(s, p, AGE, 'time-ravage', 40);
    },
  });

  function riftBlade() {
    return k.sprite('59:rift-blade', 31, 61, BLADE, set => {
      for (let y = 3; y < 47; y++) {
        const half = Math.min(8, 1 + (y - 3) * 0.33);
        for (let x = 15 - half; x <= 15 + half; x++) {
          const edge = Math.abs(x - 15) > half - 2;
          set(x, y, edge ? 4 : Math.abs(x - 15) < 3 ? 1 : 2);
        }
      }
      stroke(set, 4, 46, 25, 46, 4, 3);
      stroke(set, 14, 48, 14, 56, 3, 4);
      stroke(set, 12, 57, 18, 57, 4, 2);
      stroke(set, 19, 18, 20, 40, 5, 1);
    });
  }
  // Blade of Disaster: a full-square black-violet rift sword tears open with a crimson edge and cleaves across it.
  FX.register('blade-of-disaster', {
    palette: BLADE,
    travel: 360,
    beats: (event, kit, travel) => [...beat(event, travel, 140, 'hit'), ...beat(event, travel + 300, 180, 'hit')],
    end: () => 1740,
    ground(s) {
      if (s.c.t < 300) return;
      const p = at(s);
      ring({ x: p.x, y: p.y + 12 }, 20, 7, BLADE, 1, 4, 3);
    },
    air(s) {
      if (s.c.t < 300) return;
      const p = at(s),
        t = s.c.t - 660;
      const rift = k.sprite('59:black-rift', 33, 65, BLADE, set => {
        for (let y = 3; y < 62; y++) {
          const mid = 15 + Math.round(Math.sin(y / 8) * 3),
            half = 2 + 6 * Math.sin(((y - 3) / 59) * Math.PI);
          for (let x = mid - half; x <= mid + half; x++) set(x, y, Math.abs(x - mid) > half - 2 ? 3 : 1);
        }
      });
      if (t < 620) place(rift, p);
      let angle = -0.35;
      if (t >= 100 && t < 300) angle = -0.35 - k.clamp((t - 100) / 200) * 0.7;
      else if (t >= 300 && t < 580) angle = k.mix(0.9, 0.3, k.ease((t - 300) / 280));
      else if (t >= 580) angle = 0.3;
      k.blitRotated(riftBlade(), p.x, p.y - 2, angle);
      if (t >= 300 && t < 620) {
        const slash = k.sprite('59:disaster-slash', 67, 55, BLADE, set => {
          stroke(set, 5, 7, 59, 45, 4, 5);
          stroke(set, 8, 7, 60, 42, 5, 2);
        });
        place(slash, p, t < 470 ? 1 : 0.5);
      }
      impacts(s, p, BLADE, 'disaster', 56);
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
