/* Pixel spells, batch 60: rebuilt silhouettes and bright, held contact frames. */
(function (root) {
  'use strict';
  const FX = root.BoardPixelFX;
  if (!FX) return;
  const k = FX.kit;
  const GOLD = ['#30200b', '#82601b', '#d99d25', '#ffdc65', '#fff5bb', '#ffffff'];
  const LIFE = ['#10291d', '#23754c', '#55c87b', '#b3f18a', '#fff0a2', '#ffffff'];
  const VIOLET = ['#210d35', '#59317e', '#a258d5', '#d69aff', '#f6dcff', '#ffffff'];
  const DEATH = ['#08060e', '#08060e', '#30203e', '#b4a0c5', '#f3eaff', '#ffffff'];
  const SMOKE = ['#1c1720', '#39303d', '#635969', '#9b8e9c', '#cbbdcb', '#f6edf4'];
  const finish = () => 1570;
  const keyOf = p => p.join('');
  const level = e => Math.max(1, Math.min(9, e.slot || e.level || 1));
  function elementRamp(event) {
    const p = k.paletteFor(event);
    return p.length > 6 ? [p[0], p[1], p[2], p[4], p[5], k.WHITE] : p;
  }
  function beats(event, at = 590, stop = 90, kind = 'soft', single = false) {
    let ids = event.targets?.length ? event.targets : [null];
    if (single) ids = ids.slice(0, 1);
    return ids.map(target => ({ at, stop, target, kind, power: kind === 'soft' ? 0.03 : 0.09 }));
  }
  function people(s, single = false) {
    const list = s.event.targets?.length ? s.targets : [self(s)];
    return single ? list.slice(0, 1) : list;
  }
  function self(s) {
    const b = s.pose.base || s.pose.target || { x: 0, y: 0 };
    return { id: null, x: b.x, y: b.y - 0.55, baseX: b.x, baseY: b.y, span: b.span || 1 };
  }
  function body(t) {
    return k.P(t);
  }
  function feet(t) {
    return k.P({ x: t.baseX ?? t.x, y: t.baseY ?? t.y + 0.55 });
  }
  function stamp(img, x, y, alpha = 1) {
    k.blit(img, x - img.width / 2, y - img.height / 2, alpha);
  }
  function spark(x, y, p, size = 2) {
    k.dot(x, y, p[0], size + 2);
    k.dot(x, y, p[4], size);
  }
  // Raster strokes are used only to paint cached sprites; no canvas paths are needed.
  function stroke(set, ax, ay, bx, by, width, ink) {
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay)));
    for (let j = 0; j <= n; j++) {
      const x = Math.round(k.mix(ax, bx, j / n)),
        y = Math.round(k.mix(ay, by, j / n));
      for (let dy = -Math.floor(width / 2); dy < Math.ceil(width / 2); dy++)
        for (let dx = -Math.floor(width / 2); dx < Math.ceil(width / 2); dx++) set(x + dx, y + dy, ink);
    }
  }
  function icon(name, p, phase = 0) {
    return k.sprite('b60:icon:' + name + ':' + phase + keyOf(p), 40, 44, p, set => {
      const line = (a, b, c, d, w = 2, ink = 4) => stroke(set, a, b, c, d, w, ink);
      if (name === 'plus') {
        line(20, 9, 20, 33, 7, 3);
        line(8, 21, 32, 21, 7, 3);
        line(20, 10, 20, 32, 3, 5);
        line(9, 21, 31, 21, 3, 4);
      } else if (name === 'rune') {
        line(20, 13, 20, 30, 3, 4);
        line(14, 18, 26, 24, 3, 4);
        line(14, 24, 26, 18, 3, 5);
        line(20, 13, 26, 16, 2, 3);
      } else if (name === 'word' || name === 'doom') {
        // A single monumental word made of three interlocking, angular rune strokes.
        const ink = name === 'doom' ? 1 : 4;
        line(7, 14, 7, 29, 4, ink);
        line(7, 14, 14, 18, 3, ink);
        line(14, 18, 14, 27, 3, ink);
        line(14, 27, 7, 24, 3, ink);
        line(20, 10, 20, 33, 4, ink);
        line(15, 14, 25, 14, 3, ink);
        line(20, 25, 25, 21, 3, ink);
        line(20, 33, 26, 29, 3, ink);
        line(30, 13, 30, 31, 4, ink);
        line(26, 18, 35, 18, 3, ink);
        line(26, 26, 35, 26, 3, ink);
        if (name !== 'doom') {
          line(6, 35, 34, 35, 2, 3);
          line(20, 5, 20, 7, 2, 5);
        }
      } else if (name === 'skull') {
        for (let y = 8; y <= 28; y++)
          for (let x = 7; x <= 33; x++) {
            const d = ((x - 20) / 13) ** 2 + ((y - 19) / 12) ** 2;
            if (d <= 1) set(x, y, x < 12 || y > 25 ? 4 : 5);
          }
        for (let y = 27; y <= 35; y++) for (let x = 12; x <= 28; x++) set(x, y, 5);
        line(12, 18, 16, 21, 5, 1);
        line(24, 21, 28, 18, 5, 1);
        line(20, 24, 19, 27, 3, 1);
        for (let x = 15; x <= 25; x += 5) line(x, 31, x, 35, 2, 1);
      } else if (name === 'eye') {
        const h = phase === 0 ? 1 : 9;
        for (let x = 3; x <= 37; x++) {
          const u = 1 - Math.abs(x - 20) / 17;
          line(x, 22 - h * u, x, 22 + h * u, 2, 3);
        }
        if (phase) {
          for (let y = 15; y <= 29; y++)
            for (let x = 13; x <= 27; x++) if ((x - 20) ** 2 + (y - 22) ** 2 <= 45) set(x, y, 5);
          line(20, 17, 20, 27, 4, 1);
          line(17, 16, 19, 16, 2, 4);
        }
        line(20, 5, 20, 10, 3, 4);
        line(7, 9, 11, 13, 2, 4);
        line(29, 13, 33, 9, 2, 4);
      } else if (name === 'diamond') {
        const top = 3 + phase * 3,
          bottom = 41 - phase * 3;
        line(20, top, 5, 22, 4, 3);
        line(5, 22, 20, bottom, 4, 4);
        line(20, bottom, 35, 22, 4, 3);
        line(35, 22, 20, top, 4, 5);
        line(20, top, 12, 24, 2, 4);
        line(12, 24, 20, bottom, 2, 3);
        line(20, top, 28, 24, 2, 3);
        line(28, 24, 20, bottom, 2, 5);
        line(6, 22, 34, 22, 2, 4);
      } else if (name === 'wolf' || name === 'dragon' || name === 'summon') {
        // Filled, outlined side profiles: four legs and a muzzle, or wings, horns and a long tail.
        line(11, 28, 27, 28, 9, 3);
        line(27, 25, 29, 18, 7, 4);
        line(28, 18, 35, 20, 6, 4);
        line(29, 15, 31, 11, 3, 4);
        line(11, 30, 9, 38, 4, 4);
        line(17, 30, 17, 38, 3, 3);
        line(25, 30, 28, 38, 4, 4);
        line(22, 30, 23, 38, 3, 3);
        line(11, 27, 4, 22, 4, 3);
        line(4, 22, 3, 16, 3, 4);
        if (name === 'dragon') {
          for (let y = 5; y <= 24; y++)
            for (let x = 7; x <= 24; x++)
              if (x >= 8 + (y - 5) * 0.5 && x <= 20 + (y - 5) * 0.21) set(x, y, x < 15 ? 4 : 2);
          line(8, 5, 21, 25, 2, 5);
          line(21, 25, 23, 10, 2, 4);
          line(31, 15, 35, 11, 3, 5);
          line(35, 22, 38, 23, 2, 5);
        } else if (name === 'summon') {
          line(11, 18, 11, 32, 7, 3);
          line(25, 18, 25, 32, 7, 3);
          line(12, 16, 26, 16, 9, 4);
          line(12, 13, 10, 7, 3, 5);
          line(26, 13, 28, 7, 3, 5);
        }
        set(32, 18, 1);
        set(31, 17, 5);
      } else if (name === 'fallen') {
        const y = phase ? 34 : 19;
        if (phase) {
          line(7, y, 26, y, 5, 1);
          line(11, y, 4, y - 5, 3, 1);
          line(25, y, 33, y + 3, 4, 1);
          line(29, y - 1, 33, y - 1, 7, 1);
        } else {
          line(20, 17, 20, 28, 7, 1);
          line(18, 28, 12, 38, 4, 1);
          line(22, 28, 28, 38, 4, 1);
          line(12, 21, 28, 21, 4, 1);
          line(20, 9, 20, 12, 8, 1);
        }
      }
    });
  }
  function ringSprite(rx, ry, p, ink = 4, width = 2, gap = 0) {
    rx = Math.max(2, Math.round(rx));
    ry = Math.max(2, Math.round(ry));
    return k.sprite(`b60:ring:${rx}:${ry}:${ink}:${width}:${gap}:` + keyOf(p), rx * 2 + 8, ry * 2 + 8, p, set => {
      for (let y = -ry - 2; y <= ry + 2; y++)
        for (let x = -rx - 2; x <= rx + 2; x++) {
          const d = Math.hypot(x / rx, y / ry);
          if (Math.abs(d - 1) * Math.min(rx, ry) > width / 2) continue;
          if (gap && Math.floor(((Math.atan2(y, x) + Math.PI) / k.tau) * gap * 2) % 2) continue;
          set(x + rx + 4, y + ry + 4, ink);
        }
    });
  }
  function ring(x, y, rx, ry, p, ink = 4, width = 2, alpha = 1, gap = 0) {
    stamp(ringSprite(rx, ry, p, ink, width, gap), x, y, alpha);
  }
  function motes(s, t, p, n = 7) {
    const B = feet(t),
      seed = s.event.seed || 0;
    for (let i = 0; i < n; i++) {
      const q = (s.c.raw / 650 + k.hash(i, seed)) % 1;
      spark(B.x + (k.hash(i, seed, 2) - 0.5) * 24, B.y - q * 34, p, i % 3 ? 1 : 2);
    }
  }
  function contacts(s, p, name, size = 26, count = 6) {
    s.hits.forEach((hit, i) => {
      const t = s.targets.find(t => t.id === hit.id);
      const T = t ? body(t) : k.P(s.pose.target || s.pose.base);
      const e = s.real(hit);
      k.drawHit(k.hitStyle('b60:' + name + keyOf(p), p, { S: size, spikes: 4, minor: 4, jag: 0.15 }), T, e);
      k.shards(T, e, p, (s.event.seed || 0) + i * 11, count, 19);
    });
  }
  function floorPulse(s, list, p, start = 590) {
    const e = s.c.t - start;
    if (e < 0) return;
    list.forEach(t => {
      const B = feet(t);
      const q = k.clamp(e / 340);
      ring(B.x, B.y + 1, 9 + q * 5, 4 + q * 2, p, e < 350 ? 4 : 3, 2, e > 1050 ? 0.5 : 1);
    });
  }
  function column(s, t, p, age, full = false) {
    if (age < 0 || age > 860) return;
    const B = feet(t),
      h = full ? 30 : 24,
      w = full ? 20 : 16;
    const frame = Math.floor(k.clamp(age / 230) * 4);
    const image = k.sprite(`b60:column:${w}:${h}:${frame}:` + keyOf(p), w + 6, h + 6, p, set => {
      const height = Math.max(4, Math.round((h * (frame + 1)) / 5));
      for (let y = h - height + 2; y <= h + 1; y++)
        for (let x = 3; x <= w + 2; x++) {
          if (x < 6 || x > w - 1) set(x, y, 4);
          else if (y < h - height + 6) set(x, y, 5);
          else set(x, y, (x + 2) % 6 < 2 ? 5 : 3);
        }
    });
    k.blit(image, B.x - image.width / 2, B.y - h - 2, age > 620 ? 0.5 : 0.75);
  }
  function band(s, t, p, age) {
    const B = feet(t),
      q = k.clamp(age / 290);
    if (age < 0 || age > 860) return;
    const y = B.y - q * 25;
    ring(B.x, y, 11, 4, p, 4, 3, age > 630 ? 0.5 : 1);
    if (age < 540) ring(B.x, y + 5, 10, 4, p, 3, 2);
  }
  function centre(s) {
    return k.P(s.area || s.pose.target || s.pose.base);
  }
  function radius(s, fallback = 3) {
    return s.area ? (s.area.feet / (s.grid.feet || 5)) * 16 : fallback * 16;
  }
  function wave(R, p, frame, seed = 0, blast = false, RY = R) {
    R = Math.max(12, Math.round(R));
    RY = Math.max(12, Math.round(RY));
    const W = R * 2 + 10,
      H = RY * 2 + 10,
      cx = W / 2,
      cy = H / 2;
    return k.sprite(`b60:wave:${R}:${RY}:${frame}:${seed % 3}:${blast}:` + keyOf(p), W, H, p, set => {
      const grow = [0.28, 0.58, 0.88, 1, 1, 1][Math.min(5, frame)];
      const blobs = [];
      for (let i = 0; i < 19; i++) {
        const a = i * 2.399 + (seed % 3),
          r = Math.sqrt(i / 19) * R * 0.8;
        blobs.push({ x: Math.cos(a) * r, y: Math.sin(a) * r, r: R * (0.25 + 0.07 * k.hash(i, seed % 3)) });
      }
      for (let y = -RY; y <= RY; y++)
        for (let x = -R; x <= R; x++) {
          const yy = (y * R) / RY,
            d = Math.hypot(x, yy);
          if (d > R * grow) continue;
          if (!blast) {
            if (frame > 3 && d < R * (frame === 4 ? 0.52 : 0.85)) continue;
            set(x + cx, y + cy, d > R * grow - 3 ? 4 : Math.floor(d / 6) % 2 ? 3 : 4);
          } else {
            let best = 0;
            blobs.forEach(b => {
              best = Math.max(best, 1 - Math.hypot(x / grow - b.x, yy / grow - b.y) / b.r);
            });
            if (best > 0) set(x + cx, y + cy, best > 0.55 ? 5 : best > 0.25 ? 4 : 2);
          }
        }
    });
  }
  function swirl(s, t, age, dragon) {
    if (age < 0) return;
    const B = feet(t),
      T = body(t);
    if (age < 550) {
      const img = k.sprite('b60:swirl:' + (Math.floor(age / 65) % 8), 42, 48, VIOLET, set => {
        const phase = Math.floor(age / 65) % 8;
        for (let j = 0; j < 3; j++)
          for (let n = 0; n <= 44; n++) {
            const a = (n / 44) * Math.PI * 1.5 + (phase * Math.PI) / 4 + j * 2.1;
            const x = 21 + Math.cos(a) * (16 - n / 10),
              y = 40 - n * 0.72;
            stroke(set, x, y, x, y, 3, n < 12 ? 3 : 4);
          }
      });
      k.blit(img, B.x - 21, B.y - 43);
    }
    if (age >= 290 && age < 1000) {
      stamp(icon(dragon ? 'dragon' : 'wolf', VIOLET), B.x, B.y - 19, age > 850 ? 0.5 : 1);
      if (age < 780) {
        spark(T.x - 16, T.y - 5, VIOLET);
        spark(T.x + 17, T.y + 3, VIOLET);
      }
    }
  }

  // Invulnerability: gold-white facets lock into a body-sized diamond shell and hold firm.
  FX.register('invulnerability', {
    palette: GOLD,
    travel: 280,
    beats: () => [{ at: 580, stop: 120, target: null, kind: 'soft', power: 0.03 }],
    end: () => 1790,
    ground(s) {
      floorPulse(s, [self(s)], GOLD, 580);
    },
    air(s) {
      const e = s.c.t - 300,
        t = self(s),
        T = body(t);
      if (e < 0) return;
      stamp(icon('diamond', GOLD, e < 180 ? 2 : e < 280 ? 1 : 0), T.x, T.y - 3, e > 1320 ? 0.75 : 1);
      if (e < 1100) {
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * k.tau + s.c.raw / 520;
          spark(T.x + Math.cos(a) * 21, T.y - 3 + Math.sin(a) * 22, GOLD, i % 2 ? 1 : 2);
        }
      }
      const hit = s.hits[0];
      k.drawHit(k.hitStyle('b60:invulnerable', GOLD, { S: 44, spikes: 4 }), T, s.real(hit));
      k.shards(T, s.real(hit), GOLD, s.event.seed || 0, 9, 27);
    },
  });

  // Power Word Kill: a black death-word slams down, a white skull erupts, and a shadow crumples.
  FX.register('power-word-kill', {
    palette: DEATH,
    travel: 290,
    beats: e => beats(e, 590, 220, 'blast', true),
    end: () => 1570,
    flash: (e, age) =>
      age < 40 ? { color: '#ffffff', alpha: 0.28 } : age < 110 ? { color: '#08060e', alpha: 0.28 } : null,
    ground(s) {
      floorPulse(s, people(s, true), DEATH, 590);
    },
    air(s) {
      const e = s.c.t - 300;
      if (e < 0) return;
      people(s, true).forEach(t => {
        const T = body(t),
          B = feet(t),
          hit = s.hits[0],
          real = s.real(hit);
        if (e < 300) {
          // White backing makes the black strokes legible even on a black dungeon floor.
          ring(T.x, T.y - (1 - k.clamp(e / 290)) * 22, 18, 13, DEATH, 5, 4);
          stamp(icon('doom', [DEATH[4], ...DEATH.slice(1)]), T.x, T.y - (1 - k.clamp(e / 290)) * 22);
        }
        if (e >= 290 && e < 830) {
          stamp(icon('fallen', DEATH, e > 540 ? 1 : 0), B.x, B.y - 18);
          stamp(icon('skull', DEATH), T.x, T.y - 4 - Math.min(9, Math.max(0, real) / 40));
        }
        if (e >= 830) stamp(icon('fallen', DEATH, 1), B.x, B.y - 18, e > 1100 ? 0.5 : 1);
        k.drawHit(k.hitStyle('b60:death', DEATH, { S: 48, spikes: 8, void: true }), T, real);
        k.shards(T, real, DEATH, s.event.seed || 0, 12, 29);
      });
    },
  });

  // Power Word Heal: a monumental gold-green word crowns a full-body flood of healing light.
  FX.register('power-word-heal', {
    palette: LIFE,
    travel: 290,
    beats: e => beats(e, 590, 130, 'soft', true),
    end: finish,
    ground(s) {
      floorPulse(s, people(s, true), LIFE);
    },
    air(s) {
      const e = s.c.t - 300;
      people(s, true).forEach(t => {
        const B = feet(t);
        column(s, t, LIFE, e, true);
        if (e >= 290 && e < 1000) stamp(icon('word', LIFE), B.x, B.y - 31, e > 850 ? 0.5 : 1);
        if (e >= 0 && e < 1000) motes(s, t, LIFE, 10);
      });
      contacts(s, LIFE, 'word-heal', 34, 8);
    },
  });

  // True Polymorph: a luminous violet helix closes into a winged, horned dragon silhouette.
  FX.register('true-polymorph', {
    palette: VIOLET,
    travel: 290,
    beats: e => beats(e, 590, 130, 'soft', true),
    end: finish,
    ground(s) {
      floorPulse(s, people(s, true), VIOLET);
    },
    air(s) {
      people(s, true).forEach(t => swirl(s, t, s.c.t - 300, true));
      contacts(s, VIOLET, 'true-morph', 35);
    },
  });

  // Mass Polymorph: individual violet transformation spirals resolve into bright four-legged beasts.
  FX.register('mass-polymorph', {
    palette: VIOLET,
    travel: 290,
    beats: e => beats(e, 590, 110),
    end: finish,
    ground(s) {
      floorPulse(s, people(s), VIOLET);
    },
    air(s) {
      people(s).forEach(t => swirl(s, t, s.c.t - 300, false));
      contacts(s, VIOLET, 'mass-morph', 28, 5);
    },
  });

  // Foresight: a golden third eye opens over the brow and fans out branching rays of possible futures.
  FX.register('foresight', {
    palette: GOLD,
    travel: 290,
    beats: e => beats(e, 590, 100, 'soft', true),
    end: finish,
    ground(s) {
      floorPulse(s, people(s, true), GOLD);
    },
    air(s) {
      const e = s.c.t - 300;
      if (e < 0) return;
      people(s, true).forEach(t => {
        const B = feet(t),
          T = body(t);
        band(s, t, GOLD, e);
        if (e < 1080) {
          stamp(icon('eye', GOLD, e < 290 ? 0 : 1), B.x, T.y - 16, e > 920 ? 0.5 : 1);
          if (e >= 290) {
            const rays = k.sprite('b60:future-rays', 74, 44, GOLD, set => {
              for (let i = 0; i < 7; i++) {
                const a = Math.PI * (1.12 + i * 0.126),
                  x = 37 + Math.cos(a) * 32,
                  y = 39 + Math.sin(a) * 32;
                stroke(set, 37 + Math.cos(a) * 19, 39 + Math.sin(a) * 19, x, y, 2, i % 2 ? 4 : 3);
                stroke(set, x, y, x + (i - 3) * 1.2, y - 4, 2, 5);
              }
            });
            k.blit(rays, B.x - 37, T.y - 52, e > 870 ? 0.5 : 1);
          }
        }
      });
      contacts(s, GOLD, 'foresight', 28, 6);
    },
  });

  // Mass Heal: a wide green-gold flood rolls beneath everyone; huge white-cored plus signs crown each target.
  FX.register('mass-heal', {
    palette: LIFE,
    travel: 290,
    beats: e => beats(e, 590, 150),
    end: () => 1720,
    ground(s) {
      const e = s.c.t - 300;
      if (e < 0) return;
      const list = people(s),
        points = list.map(feet);
      const C = s.area
        ? centre(s)
        : {
            x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
            y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
          };
      // Without a template, fit the flood to the figures' buffer margins instead of clipping a giant disc.
      const bodies = list.map(body),
        margin = 34;
      const R = s.area
        ? radius(s)
        : Math.min(C.x - Math.min(...bodies.map(p => p.x - margin)), Math.max(...bodies.map(p => p.x + margin)) - C.x);
      const RY = s.area
        ? R
        : Math.min(C.y - Math.min(...bodies.map(p => p.y - margin)), Math.max(...bodies.map(p => p.y + margin)) - C.y);
      if (e < 920) stamp(wave(R, LIFE, Math.min(5, Math.floor(e / 155)), 0, false, RY), C.x, C.y, e > 760 ? 0.75 : 1);
      if (e >= 590) ring(C.x, C.y, R, RY, LIFE, 3, 3, e > 1120 ? 0.5 : 1);
      floorPulse(s, list, LIFE);
    },
    air(s) {
      const e = s.c.t - 300;
      people(s).forEach(t => {
        const B = feet(t);
        column(s, t, LIFE, e, true);
        if (e >= 290 && e < 1160) stamp(icon('plus', LIFE), B.x, B.y - 32, e > 970 ? 0.5 : 1);
        if (e >= 0 && e < 1100) motes(s, t, LIFE, 6);
      });
      contacts(s, LIFE, 'mass-heal', 32, 7);
    },
  });

  // Sphere fallback: a white flash and thick shock front open into pale-cored elemental billows, smoke and scorch.
  FX.register('kind:sphere', {
    palette: elementRamp,
    travel: 250,
    beats: e => beats(e, 550, 85 + level(e) * 13, 'blast'),
    end: () => 1690,
    flash: (e, age) =>
      age < 32
        ? { color: '#ffffff', alpha: 0.16 + level(e) * 0.012 }
        : age < 65
          ? { color: '#17101c', alpha: 0.15 }
          : null,
    ground(s) {
      const e = s.c.t - 550;
      if (e < 0) return;
      const C = centre(s),
        R = radius(s),
        p = s.ramp;
      if (e < 100) {
        k.disc(C.x, C.y, Math.max(9, R * 0.42) + 2, p[0]);
        k.disc(C.x, C.y, Math.max(7, R * 0.42), k.WHITE);
      }
      if (e < 610) stamp(wave(R, p, Math.min(5, Math.floor(e / 85)), s.event.seed || 0, true), C.x, C.y);
      if (e < 450) {
        const r = R * (0.22 + 0.78 * k.ease(k.clamp(e / 400)));
        ring(C.x, C.y, r, r, p, e < 170 ? 5 : 4, 3);
      }
      if (e >= 570) {
        ring(C.x, C.y, R * 0.94, R * 0.94, SMOKE, 2, 3, e > 970 ? 0.75 : 1, 15);
        ring(C.x, C.y, R * 0.85, R * 0.85, p, 2, 2, e > 970 ? 0.5 : 1, 11);
      }
    },
    air(s) {
      const C = centre(s),
        p = s.ramp,
        R = radius(s),
        e = s.c.t - 550;
      if (s.c.t >= 300 && e < 0 && s.pose.hand) {
        const H = k.P(s.pose.hand),
          q = (s.c.t - 300) / 250;
        const T = { x: k.mix(H.x, C.x, q), y: k.mix(H.y, C.y, q) - Math.sin(q * Math.PI) * 12 };
        k.disc(T.x, T.y, 5, p[0]);
        k.disc(T.x, T.y, 3, p[4]);
      }
      contacts(s, p, 'sphere', 30 + level(s.event) * 2, 5 + Math.floor(level(s.event) / 2));
      const hit = s.hits[0],
        real = hit ? s.real(hit) : -1;
      if (real >= 0 && real < 750) {
        const q = real / 750,
          n = 7 + Math.floor(level(s.event) / 2);
        for (let i = 0; i < n; i++) {
          const a = (i / n) * k.tau,
            rr = R * (0.3 + k.ease(q) * 0.65);
          const x = C.x + Math.cos(a) * rr,
            y = C.y + Math.sin(a) * rr - Math.sin(q * Math.PI) * (10 + level(s.event));
          if (real > 170) {
            const r = 3 + Math.floor(q * 4);
            k.disc(x, y - q * 12, r + 1, SMOKE[0]);
            k.disc(x, y - q * 12, r, SMOKE[q < 0.6 ? 3 : 2]);
          } else spark(x, y, p, 3);
        }
      }
    },
  });

  function cube(s) {
    const a = s.area;
    const corners = a ? k.outline(a, s.grid) : [];
    const pts = corners.length >= 4 ? corners.map(p => k.P({ x: p[0], y: p[1] })) : [];
    if (pts.length)
      return {
        O: pts[0],
        U: { x: pts[1].x - pts[0].x, y: pts[1].y - pts[0].y },
        V: { x: pts[3].x - pts[0].x, y: pts[3].y - pts[0].y },
      };
    const C = centre(s);
    return { O: { x: C.x - 16, y: C.y - 16 }, U: { x: 32, y: 0 }, V: { x: 0, y: 32 } };
  }
  function tileArt(s, age, motesOnly) {
    const p = s.ramp,
      { O, U, V } = cube(s),
      N = Math.max(1, Math.ceil(Math.hypot(U.x, U.y) / 16));
    const size = Math.ceil(Math.max(Math.abs(U.x) + Math.abs(V.x), Math.abs(U.y) + Math.abs(V.y))) + 24;
    const frame = Math.min(9, Math.floor(age / 110));
    const img = k.sprite(
      `b60:tiles:${Math.round(U.x)}:${Math.round(U.y)}:${Math.round(V.x)}:${Math.round(V.y)}:${frame}:${motesOnly}:` +
        keyOf(p),
      size,
      size + 24,
      p,
      set => {
        const mid = size / 2,
          at = (u, v) => ({ x: mid + (u - 0.5) * U.x + (v - 0.5) * V.x, y: mid + (u - 0.5) * U.y + (v - 0.5) * V.y });
        for (let y = 0; y < N; y++)
          for (let x = 0; x < N; x++) {
            const edge = Math.min(x + 0.5, y + 0.5, N - x - 0.5, N - y - 0.5) / N;
            if (!motesOnly) {
              if (frame > 5 && edge < (frame - 5) / 9) continue;
              const A = at(x / N, y / N),
                B = at((x + 1) / N, y / N),
                C = at((x + 1) / N, (y + 1) / N),
                D = at(x / N, (y + 1) / N);
              [
                [A, B],
                [B, C],
                [C, D],
                [D, A],
              ].forEach(([a, b]) => stroke(set, a.x, a.y, b.x, b.y, 2, 4));
              const M = at((x + 0.5) / N, (y + 0.5) / N);
              if (frame < 6) stroke(set, M.x - 3, M.y, M.x + 3, M.y, 5, frame < 3 ? 5 : 3);
            } else if (frame < 7) {
              const q = (frame / 6 + k.hash(x, y, 8)) % 1;
              const M = at((x + 0.5) / N, (y + 0.5) / N),
                h = 5 + q * 18;
              stroke(set, M.x, M.y - h, M.x, M.y - h + 4, 3, 4);
              stroke(set, M.x - 1, M.y - h + 1, M.x + 1, M.y - h + 1, 2, 5);
            }
          }
        if (!motesOnly && frame >= 6) {
          const A = at(0, 0),
            B = at(1, 0),
            C = at(1, 1),
            D = at(0, 1);
          [
            [A, B],
            [B, C],
            [C, D],
            [D, A],
          ].forEach(([a, b]) => stroke(set, a.x, a.y, b.x, b.y, 2, 3));
        }
      },
    );
    k.blit(img, O.x + (U.x + V.x) / 2 - size / 2, O.y + (U.y + V.y) / 2 - size / 2, age > 1000 ? 0.5 : 1);
  }

  // Cube fallback: every template cell lights in a pale outlined grid and throws up a bright shard pulse.
  FX.register('kind:cube', {
    palette: elementRamp,
    travel: 220,
    beats: e => beats(e, 520, 100, 'blast'),
    end: () => 1740,
    ground(s) {
      if (s.c.t >= 300) tileArt(s, s.c.t - 300, false);
    },
    air(s) {
      if (s.c.t >= 300) tileArt(s, s.c.t - 300, true);
      contacts(s, s.ramp, 'cube', 32, 7);
    },
  });

  // Heal fallback: a square-wide green-gold column climbs the body and a large healing cross holds above it.
  FX.register('kind:heal', {
    palette: LIFE,
    travel: 290,
    beats: e => beats(e, 590, 85, 'soft', true),
    end: finish,
    ground(s) {
      floorPulse(s, people(s, true), LIFE);
    },
    air(s) {
      const e = s.c.t - 300;
      people(s, true).forEach(t => {
        const B = feet(t);
        column(s, t, LIFE, e);
        if (e >= 290 && e < 960) stamp(icon('plus', LIFE), B.x, B.y - 30, e > 810 ? 0.5 : 1);
        if (e >= 0 && e < 1000) motes(s, t, LIFE);
      });
      contacts(s, LIFE, 'heal', 27, 6);
    },
  });

  // Summon fallback: a runed portal and light pillar vent smoke, revealing a sturdy horned creature.
  FX.register('kind:summon', {
    palette: elementRamp,
    travel: 280,
    beats: () => [],
    end: () => 1750,
    ground(s) {
      const e = s.c.t - 300;
      if (e < 0) return;
      const C = centre(s),
        p = s.ramp;
      const seal = k.sprite('b60:summon-seal:' + keyOf(p), 48, 30, p, set => {
        for (let i = 0; i < 80; i++) {
          const a = (i / 80) * k.tau;
          stroke(set, 24 + Math.cos(a) * 19, 15 + Math.sin(a) * 10, 24 + Math.cos(a) * 19, 15 + Math.sin(a) * 10, 2, 4);
        }
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * k.tau,
            x = 24 + Math.cos(a) * 13,
            y = 15 + Math.sin(a) * 6;
          stroke(set, x - 1, y - 2, x + 1, y + 2, 2, 5);
          stroke(set, x - 2, y + 1, x + 2, y - 1, 2, 3);
        }
      });
      stamp(seal, C.x, C.y, e > 1250 ? 0.5 : 1);
    },
    air(s) {
      const e = s.c.t - 300;
      if (e < 0) return;
      const C = centre(s),
        p = s.ramp;
      const t = {
        x: (s.area || s.pose.target || s.pose.base).x,
        y: (s.area || s.pose.target || s.pose.base).y - 0.55,
        baseX: (s.area || s.pose.target || s.pose.base).x,
        baseY: (s.area || s.pose.target || s.pose.base).y,
      };
      if (e < 510) column(s, t, p, e, true);
      if (e >= 280 && e < 1300) stamp(icon('summon', p), C.x, C.y - 19, e > 1140 ? 0.75 : 1);
      if (e >= 190 && e < 660) {
        const q = (e - 190) / 470;
        for (let i = 0; i < 6; i++) {
          const x = C.x + (i - 2.5) * (3 + q * 6),
            y = C.y - 10 - Math.sin(q * Math.PI) * 10;
          const r = Math.max(2, 7 - q * 5);
          k.disc(x, y, r + 1, p[0]);
          k.disc(x, y, r, i % 2 ? p[3] : p[4]);
        }
      }
    },
  });

  // Utility fallback: a hand rune sends a bright arcing mote into an outlined star-ring and a held destination rune.
  FX.register('kind:utility', {
    palette: elementRamp,
    travel: 390,
    beats: e => beats(e, 690, 70, 'soft', true),
    end: () => 1620,
    ground(s) {
      const e = s.c.t - 690,
        C = centre(s);
      if (e >= 0) ring(C.x, C.y + 5, 12, 5, s.ramp, 3, 2, e > 700 ? 0.5 : 1);
    },
    air(s) {
      const e = s.c.t - 300,
        p = s.ramp,
        T = centre(s),
        H = k.P(s.pose.hand || s.pose.base);
      if (e < 0) return;
      if (e < 180) {
        ring(H.x, H.y, 7, 7, p, 4, 2);
        stamp(icon('rune', p), H.x, H.y);
      }
      if (e < 390) {
        for (let i = 5; i >= 0; i--) {
          const q = k.clamp(e / 390 - i * 0.045);
          spark(k.mix(H.x, T.x, q), k.mix(H.y, T.y, q) - Math.sin(q * Math.PI) * 18, p, i ? 1 : 4);
        }
      } else {
        const age = e - 390;
        if (age < 550) {
          ring(T.x, T.y, 16, 16, p, 4, 3, age > 430 ? 0.5 : 1);
          for (let i = 0; i < 4; i++) {
            const a = (i / 4) * k.tau;
            spark(T.x + Math.cos(a) * 18, T.y + Math.sin(a) * 18, p, 3);
          }
        }
        stamp(icon('rune', p), T.x, T.y, age > 700 ? 0.5 : 1);
      }
      contacts(s, p, 'utility', 27, 6);
    },
  });

  // Buff fallback: individual pale rising bands wrap the figures, crowned by large glyphs and orbiting sparks.
  FX.register('kind:buff', {
    palette: elementRamp,
    travel: 290,
    beats: e => beats(e, 590, 90),
    end: finish,
    ground(s) {
      floorPulse(s, people(s), s.ramp);
    },
    air(s) {
      const e = s.c.t - 300,
        p = s.ramp;
      if (e < 0) return;
      people(s).forEach(t => {
        const B = feet(t),
          T = body(t);
        band(s, t, p, e);
        if (e >= 290 && e < 1020) stamp(icon('word', p), B.x, B.y - 31, e > 870 ? 0.5 : 1);
        if (e < 1080)
          for (let i = 0; i < 5; i++) {
            const a = (i / 5) * k.tau + s.c.raw / 450;
            spark(T.x + Math.cos(a) * 12, T.y + Math.sin(a) * 9, p, i % 2 ? 1 : 2);
          }
      });
      contacts(s, p, 'buff', 27, 5);
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
