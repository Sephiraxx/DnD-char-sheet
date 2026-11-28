/* Pixel spells, batch 42: readable silhouettes, held peaks and quiet residues. */
(function (root) {
  'use strict';
  const FX = root.BoardPixelFX;
  if (!FX) return;
  const k = FX.kit;
  const HEAL = k.palettes.heal;
  const FIRE = ['#291017', '#79242a', '#ce4724', '#ff922e', '#ffda76', '#fff9dd'];
  const PINK = ['#30102e', '#722a68', '#cb4e9b', '#ff92cf', '#ffe0f3', '#ffffff'];
  const LEAF = ['#14231c', '#28553d', '#519858', '#a7e877', '#ecffc4', '#ffffff'];
  const WATER = ['#10243e', '#205786', '#388fbe', '#79d9f2', '#d0f9ff', '#ffffff'];
  const EARTH = ['#291f24', '#664639', '#a1714b', '#dba66c', '#ffe1a2', '#fff5d7'];
  const WIND = ['#192a35', '#3e6d78', '#83b5b1', '#c7ece0', '#fff1b5', '#ffffff'];
  const GOLD = ['#2a1a19', '#805424', '#d5a43c', '#ffe18c', '#fff6da', '#ffffff'];
  const MAGIC = ['#23152f', '#614488', '#a276c6', '#d0a5fb', '#f1e0ff', '#ffffff'];
  const soft = (event, kit, travel) => [
    { at: kit.CAST + travel, stop: 65, target: event.targets?.[0] ?? null, kind: 'soft', power: 0.03 },
  ];
  const fade = (t, start, end) => 1 - k.clamp((t - start) / (end - start));
  const age = s => s.c.t - k.CAST;
  const active = (s, end) => age(s) >= 0 && age(s) < end;

  function body(s) {
    const hit = s.hits[0];
    return s.targets.find(t => t.id === hit?.id) || s.targets[0] || s.pose.target || s.pose.base;
  }
  function feet(s) {
    const t = body(s);
    return k.P({ x: t.baseX ?? t.x, y: t.baseY ?? t.y + 0.4 });
  }
  function cube(s) {
    const corners = s.area ? k.outline(s.area, s.grid) : [];
    if (corners.length) {
      const c = corners.reduce((v, p) => ({ x: v.x + p[0], y: v.y + p[1] }), { x: 0, y: 0 });
      return k.P({ x: c.x / corners.length, y: c.y / corners.length });
    }
    return k.P(s.area || s.pose.target || s.pose.base);
  }
  function stroke(points, pal, index = 4, width = 2) {
    for (const outline of [true, false]) {
      for (let j = 1; j < points.length; j++) {
        const a = points[j - 1],
          b = points[j];
        const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 1.5));
        for (let i = 0; i <= n; i++)
          k.dot(
            k.mix(a[0], b[0], i / n),
            k.mix(a[1], b[1], i / n),
            pal[outline ? 0 : index],
            width + (outline ? 2 : 0),
          );
      }
    }
  }
  function ring(p, rx, ry, pal, index = 3, width = 2) {
    k.ellipse(p.x, p.y, rx, ry, pal[0], width + 2);
    k.ellipse(p.x, p.y, rx, ry, pal[index], width);
  }
  function spark(x, y, pal, size = 3) {
    stroke(
      [
        [x - size, y],
        [x + size, y],
      ],
      pal,
      5,
      1,
    );
    stroke(
      [
        [x, y - size],
        [x, y + size],
      ],
      pal,
      4,
      1,
    );
  }
  function impact(s, p, pal, key, size = 15, count = 5) {
    const hit = s.hits[0];
    if (!hit) return;
    const e = s.real(hit);
    k.drawHit(k.hitStyle('b42-' + key, pal, { S: size, spikes: 4, minor: 0, jag: 0.1, void: true }), p, e);
    k.shards(p, e, pal, s.event.seed || 0, count, 13);
  }

  // Cached raster painters; all geometry is snapped to the same art-pixel grid as the kit.
  function line(set, x0, y0, x1, y1, color, width = 2) {
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
    for (let i = 0; i <= n; i++)
      for (let dy = 0; dy < width; dy++)
        for (let dx = 0; dx < width; dx++)
          set(Math.round(k.mix(x0, x1, i / n)) + dx, Math.round(k.mix(y0, y1, i / n)) + dy, color);
  }
  function oval(set, cx, cy, rx, ry, color) {
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
      for (let x = Math.floor(cx - rx); x <= cx + rx; x++)
        if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) set(x, y, color);
  }
  function poly(set, vertices, color) {
    const xs = vertices.map(p => p[0]),
      ys = vertices.map(p => p[1]);
    for (let y = Math.floor(Math.min(...ys)); y <= Math.max(...ys); y++) {
      for (let x = Math.floor(Math.min(...xs)); x <= Math.max(...xs); x++) {
        let inside = false;
        for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
          const a = vertices[i],
            b = vertices[j];
          if (a[1] > y + 0.5 !== b[1] > y + 0.5 && x + 0.5 < ((b[0] - a[0]) * (y + 0.5 - a[1])) / (b[1] - a[1]) + a[0])
            inside = !inside;
        }
        if (inside) set(x, y, color);
      }
    }
  }
  function image(key, w, h, pal, paint, outline = true) {
    return k.sprite('b42:' + key + ':' + pal[3], w, h, pal, paint, outline);
  }
  function heart() {
    return image('heart', 21, 19, PINK, set => {
      poly(
        set,
        [
          [2, 5],
          [5, 2],
          [8, 2],
          [10, 5],
          [13, 2],
          [16, 2],
          [19, 5],
          [19, 9],
          [10, 17],
          [2, 9],
        ],
        3,
      );
      line(set, 4, 5, 7, 4, 5);
      line(set, 4, 7, 4, 8, 4);
      line(set, 12, 12, 15, 9, 2);
    });
  }
  function leaf() {
    return image('leaf', 11, 9, LEAF, set => {
      poly(
        set,
        [
          [1, 6],
          [3, 2],
          [9, 1],
          [9, 5],
          [5, 7],
        ],
        3,
      );
      line(set, 2, 6, 7, 3, 4, 1);
    });
  }
  function flame(frame, small) {
    return image('flame:' + frame + ':' + small, 31, 34, FIRE, set => {
      if (small) {
        poly(
          set,
          [
            [11, 31],
            [10, 27],
            [13, 23],
            [14, 20],
            [17, 24],
            [20, 27],
            [19, 31],
          ],
          3,
        );
        poly(
          set,
          [
            [13, 31],
            [13, 28],
            [15, 24],
            [17, 28],
            [17, 31],
          ],
          4,
        );
        line(set, 14, 28, 14, 30, 5, 2);
        return;
      }
      const h = 27;
      const sway = Math.sin(frame * 0.8) * 2;
      poly(
        set,
        [
          [9, 31],
          [5, 26],
          [8, 20],
          [10, 26],
          [11, 31 - h],
          [16 + sway, 33 - h],
          [19, 17],
          [23, 12],
          [22, 24],
          [25, 27],
          [22, 31],
        ],
        3,
      );
      poly(
        set,
        [
          [11, 30],
          [10, 26],
          [14, 32 - h * 0.7],
          [17, 23],
          [20, 22],
          [21, 29],
          [18, 32],
        ],
        4,
      );
      poly(
        set,
        [
          [13, 30],
          [14, 25],
          [16, 23],
          [18, 30],
        ],
        5,
      );
    });
  }
  function plant(frame) {
    return image('plant:' + frame, 29, 31, LEAF, set => {
      const h = Math.min(22, 3 + frame * 3);
      const top = 28 - h;
      line(set, 14, 28, 14, top + 3, 3, 2);
      const grow = (x, y, color) => set(x, Math.round(28 + ((y - 28) * h) / 22), color);
      line(grow, 14, 24, 7, 18, 3);
      poly(
        grow,
        [
          [13, 21],
          [5, 20],
          [3, 14],
          [9, 15],
        ],
        3,
      );
      line(grow, 6, 17, 11, 20, 4, 1);
      if (frame > 2) {
        line(grow, 15, 19, 22, 14, 3);
        poly(
          grow,
          [
            [16, 17],
            [20, 10],
            [26, 10],
            [24, 16],
          ],
          4,
        );
      }
      if (frame >= 6) {
        // A broad five-petalled pale bloom, with a bright seed centre.
        for (let i = 0; i < 5; i++) {
          const a = (i * k.tau) / 5 - Math.PI / 2;
          oval(set, 15 + Math.cos(a) * 4, top + 3 + Math.sin(a) * 4, 3, 3, 4);
        }
        oval(set, 15, top + 3, 2, 2, 5);
      }
    });
  }
  function boots() {
    return image('winged-boots', 31, 20, WIND, set => {
      for (const x of [3, 17]) {
        poly(
          set,
          [
            [x + 3, 8],
            [x + 8, 8],
            [x + 8, 13],
            [x + 11, 14],
            [x + 11, 17],
            [x + 2, 17],
          ],
          4,
        );
        line(set, x + 3, 10, x + 7, 10, 5, 1);
        poly(
          set,
          [
            [x + 4, 11],
            [x, 8],
            [x - 1, 2],
            [x + 4, 5],
            [x + 6, 3],
            [x + 7, 8],
          ],
          3,
        );
        line(set, x + 1, 5, x + 4, 9, 5, 1);
      }
    });
  }

  // Spare the Dying: a body-wide green ECG spikes once, rings, then leaves a stabilising cross.
  FX.register('spare-the-dying', {
    palette: HEAL,
    travel: 240,
    beats: soft,
    end: () => 1430,
    air(s) {
      if (!active(s, 1130)) return;
      const p = k.P(body(s)),
        t = age(s);
      if (t < 610) {
        const trace = [
          [-13, 0],
          [-7, 0],
          [-5, -2],
          [-3, 3],
          [0, -9],
          [3, 6],
          [5, 0],
          [13, 0],
        ];
        const reveal = -13 + 26 * k.clamp(t / 240);
        const points = [];
        for (let i = 1; i < trace.length; i++) {
          const a = trace[i - 1],
            b = trace[i];
          if (a[0] > reveal) break;
          if (!points.length) points.push([p.x + a[0], p.y + a[1]]);
          const q = k.clamp((reveal - a[0]) / (b[0] - a[0]));
          points.push([p.x + k.mix(a[0], b[0], q), p.y + k.mix(a[1], b[1], q)]);
        }
        stroke(points, HEAL, 3, 2);
        const e = s.real(s.hits[0]);
        if (e >= 0 && e < 320) ring(p, 8 + k.ease(e / 320) * 9, 6 + k.ease(e / 320) * 7, HEAL, 4, 1);
        impact(s, p, HEAL, 'ecg', 12, 4);
      } else {
        const cross = image('cross', 13, 15, HEAL, set => {
          line(set, 5, 2, 5, 11, 3, 3);
          line(set, 2, 6, 9, 6, 4, 3);
          line(set, 6, 4, 6, 9, 5, 1);
        });
        k.blit(cross, p.x - 6, p.y - 7, fade(t, 850, 1130));
      }
    },
  });

  // Friends: a shoulder-wrapping pink ribbon lifts into a big heart, then clings as a shimmer.
  FX.register('friends', {
    palette: PINK,
    travel: 300,
    beats: soft,
    end: () => 1660,
    air(s) {
      if (!active(s, 1360)) return;
      const p = k.P(body(s)),
        t = age(s),
        turn = k.clamp(t / 300);
      if (t < 720) {
        const points = [];
        for (let i = 0; i <= 27; i++) {
          const q = (i / 27) * turn,
            a = q * k.tau * 1.6;
          points.push([p.x + Math.cos(a) * (12 - q * 3), p.y + 6 - q * 17 + Math.sin(a) * 4]);
        }
        stroke(points, PINK, 3, 2);
      }
      if (t >= 260 && t < 990) {
        const pop = Math.sin(k.clamp((t - 260) / 100) * Math.PI) * 2;
        k.blit(heart(), p.x - 10, p.y - 21 - pop, fade(t, 720, 990));
      }
      const e = s.real(s.hits[0]);
      if (e >= 0 && e < 400) {
        for (let i = 0; i < 4; i++) {
          const a = (i * k.tau) / 4 + 0.4,
            r = 13 + k.ease(e / 400) * 5;
          spark(p.x + Math.cos(a) * r, p.y - 7 + Math.sin(a) * r * 0.7, PINK, 2);
        }
        impact(s, { x: p.x, y: p.y - 9 }, PINK, 'friends', 12, 4);
      }
      if (t > 700) {
        const shimmer = image('charm-shimmer', 27, 28, PINK, set => {
          for (let y = 2; y < 25; y++) {
            const x = 3 + Math.round(Math.sin(y / 5) * 2);
            if (k.dith(x, y) < 0.5) {
              set(x, y, 4);
              set(26 - x, y, 3);
            }
          }
        });
        k.blit(shimmer, p.x - 13, p.y - 17, 0.5 * fade(t, 1050, 1360));
      }
    },
  });

  // Control Flames: a tall amber blaze curls into a bright spiral before settling to a hearth flame.
  FX.register('control-flames', {
    palette: FIRE,
    travel: 360,
    beats: soft,
    end: () => 1810,
    ground(s) {
      if (!active(s, 1510)) return;
      const p = cube(s),
        t = age(s),
        small = t > 1050;
      const f = Math.floor(s.c.raw / 95) % 6;
      k.blit(flame(f, small), p.x - 15, p.y - 26, fade(t, 1300, 1510));
      if (t >= 250 && t < 970) {
        const points = [];
        const q = k.clamp((t - 250) / 110);
        for (let i = 0; i <= 25; i++) {
          const u = (i / 25) * q,
            a = u * k.tau * 1.25 - Math.PI / 2,
            r = 9 * (1 - u) + 2;
          points.push([p.x + Math.cos(a) * r, p.y - 12 + Math.sin(a) * r]);
        }
        stroke(points, FIRE, 4, 2);
      }
    },
    air(s) {
      if (!active(s, 1510)) return;
      const p = cube(s);
      impact(s, { x: p.x, y: p.y - 13 }, FIRE, 'flames', 18, 7);
    },
  });

  // Druidcraft: leaves burst in a ring as a full-height seedling opens a pale flower.
  FX.register('druidcraft', {
    palette: LEAF,
    travel: 420,
    beats: soft,
    end: () => 1890,
    ground(s) {
      if (!active(s, 1590)) return;
      const p = cube(s),
        t = age(s);
      ring({ x: p.x, y: p.y + 4 }, 7, 3, LEAF, 3, 1);
      k.blit(plant(Math.min(7, Math.floor(t / 60))), p.x - 14, p.y - 24, fade(t, 1280, 1590));
    },
    air(s) {
      if (!active(s, 1590)) return;
      const p = cube(s),
        t = age(s);
      if (t < 500) {
        const r = 4 + k.ease(k.clamp(t / 350)) * 12;
        for (let i = 0; i < 6; i++) {
          const a = (i * k.tau) / 6 + t / 900;
          k.blitRotated(
            leaf(),
            p.x + Math.cos(a) * r,
            p.y + Math.sin(a) * r * 0.55 - Math.sin((t / 500) * Math.PI) * 4,
            a,
          );
        }
      }
      impact(s, { x: p.x, y: p.y - 16 }, LEAF, 'bloom', 17, 5);
      if (t > 800 && t < 1400) {
        const q = (t - 800) / 600;
        for (let i = 0; i < 3; i++) {
          const a = q * 5 + i * 1.8;
          k.blit(leaf(), p.x + q * 15 + Math.cos(a) * 5 - 5, p.y - 12 - q * 12 + Math.sin(a) * 3, fade(t, 1150, 1400));
        }
      }
    },
  });

  // Encode Thoughts: a psychic filament draws from the caster's head into a hand-held crystal spool.
  FX.register('encode-thoughts', {
    palette: PINK,
    travel: 430,
    beats: (event, kit, travel) => [{ at: kit.CAST + travel, stop: 65, target: null, kind: 'soft', power: 0.03 }],
    end: () => 1740,
    air(s) {
      if (!active(s, 1440)) return;
      const b = s.pose.base || s.pose.hand,
        hand = s.pose.hand || b;
      const h = k.P(hand),
        head = k.P({ x: b.x, y: b.y - (b.span || 1) * 0.9 });
      const p = { x: h.x + 2, y: h.y - 9 },
        t = age(s);
      if (t < 900) {
        const points = [],
          q = k.clamp(t / 430);
        for (let i = 0; i <= 25; i++) {
          const u = (i / 25) * q;
          points.push([
            k.mix(head.x, p.x, u) + Math.sin(u * 12) * 3,
            k.mix(head.y, p.y, u) - Math.sin(u * Math.PI) * 10,
          ]);
        }
        stroke(points, PINK, 4, 2);
      }
      if (t > 230) {
        const crystal = image('thought-crystal', 19, 27, PINK, set => {
          poly(
            set,
            [
              [9, 2],
              [16, 8],
              [16, 18],
              [9, 24],
              [2, 18],
              [2, 8],
            ],
            3,
          );
          poly(
            set,
            [
              [9, 3],
              [9, 23],
              [3, 17],
              [3, 9],
            ],
            4,
          );
          line(set, 9, 3, 9, 22, 5, 1);
          for (let y = 9; y <= 17; y += 4) line(set, 3, y, 14, y - 2, 2, 2);
          line(set, 4, 8, 7, 5, 5, 1);
        });
        k.blit(crystal, p.x - 9, p.y - 13, fade(t, 1120, 1440));
      }
      const e = s.real(s.hits[0]);
      if (e >= 0 && e < 300) ring(p, 10 + k.ease(e / 300) * 7, 13 + k.ease(e / 300) * 5, PINK, 4, 1);
      impact(s, p, PINK, 'thought', 14, 5);
    },
  });

  // Minor Illusion: a lavender scan assembles a solid wooden crate, with brief horizontal glitches.
  FX.register('illusion', {
    palette: MAGIC,
    travel: 250,
    beats: soft,
    end: () => 1850,
    ground(s) {
      if (!active(s, 1550)) return;
      const t = age(s),
        corners = s.area ? k.outline(s.area, s.grid).map(([x, y]) => k.P({ x, y })) : [],
        p = cube(s);
      const left = Math.round(corners.length ? Math.min(...corners.map(v => v.x)) : p.x - k.PX / 2),
        top = Math.round(corners.length ? Math.min(...corners.map(v => v.y)) : p.y - k.PX / 2),
        right = Math.round(corners.length ? Math.max(...corners.map(v => v.x)) : left + k.PX),
        bottom = Math.round(corners.length ? Math.max(...corners.map(v => v.y)) : top + k.PX),
        w = Math.max(1, right - left),
        h = Math.max(1, bottom - top);
      const pal = [MAGIC[3], '#66402b', '#a76b3b', '#d8a05e', '#f4cc88', MAGIC[4]];
      const entering = t < 250,
        leaving = t >= 1300,
        visible = entering ? Math.floor((t / 250) * h) : leaving ? Math.ceil(((1550 - t) / 250) * h) : h;

      // Cached opaque rows let the scan reveal real wood and the glitch displace whole rows.
      const cycle = Math.floor((t - 250) / 400),
        glitch = !entering && !leaving && cycle > 0 && (t - 250) % 400 < 32,
        glitchY = 3 + Math.floor(k.hash(cycle, s.event.seed || 0) * Math.max(1, h - 6)),
        shift = cycle % 2 ? 2 : -1;
      for (let y = 0; y < visible; y++) {
        const row = k.sprite(
          'b42:illusion-wood:' + w + ':' + h + ':' + y,
          w,
          1,
          pal,
          set => {
            for (let x = 0; x < w; x++) {
              const edge = Math.min(x, y, w - 1 - x, h - 1 - y);
              let color;
              if (edge === 0)
                color = 0; // Explicit one-pixel lavender outline, with no dark halo.
              else if (edge <= 2) color = x <= 2 || y <= 2 ? 2 : 1;
              else {
                const plank = Math.floor((x - 3) / 4),
                  diagonal = ((y - 3) * Math.max(1, w - 7)) / Math.max(1, h - 7),
                  brace = Math.abs(x - 3 - diagonal) <= 1 || Math.abs(w - 4 - x - diagonal) <= 1;
                color = (x - 3) % 4 === 3 ? 2 : plank % 2 ? 4 : 3;
                // Dark timber cross braces sit over the light, solid vertical planks.
                if (brace) color = 1;
                else if ((y === 5 || y === h - 6) && (x - 3) % 4 < 2) color = 2;
              }
              if ((x === 2 || x === w - 3) && (y === 2 || y === h - 3)) color = 4;
              set(x, 0, color);
            }
          },
          false,
        );
        const offset = glitch && y >= glitchY && y < glitchY + 2 ? shift : 0;
        k.blit(row, left + offset, top + y);
      }

      if (entering || leaving) {
        const scanY = Math.min(h - 1, leaving ? visible - 1 : visible);
        for (const dy of [0, leaving ? 2 : -2]) {
          const y = scanY + dy;
          if (y < 0 || y >= h) continue;
          for (let x = 0; x < w; x++) k.dot(left + x, top + y, MAGIC[dy === 0 ? 4 : 3]);
        }
        // Three small glints travel with the sweep; none are hit stars.
        for (let i = 0; i < 3; i++) {
          const x = left + Math.round(((i + 0.5) * (w - 1)) / 3),
            y = top + Math.max(0, Math.min(h - 1, scanY + (i % 2 ? -1 : 1)));
          k.dot(x, y, MAGIC[5]);
          k.dot(x - 1, y, MAGIC[3]);
          k.dot(x + 1, y, MAGIC[3]);
        }
      } else {
        // Sparse sparkle only on the perimeter; the wooden body has no dither or transparency.
        const tick = Math.floor(s.c.raw / 100);
        for (let i = 0; i < 3; i++) {
          const side = (tick + i) % 4,
            n = Math.floor(k.hash(tick, i, s.event.seed || 0) * (side % 2 ? h : w)),
            x = side === 1 ? w - 1 : side === 3 ? 0 : n,
            y = side === 0 ? 0 : side === 2 ? h - 1 : n;
          if (k.dith(x + tick, y) < 0.25) k.dot(left + x, top + y, MAGIC[4]);
        }
      }
    },
  });

  // Shape Water: a rising column squares into a block, curls into a crest, and splashes to a puddle.
  FX.register('shape-water', {
    palette: WATER,
    travel: 400,
    beats: soft,
    end: () => 2080,
    ground(s) {
      if (!active(s, 1780)) return;
      const p = cube(s),
        t = age(s);
      const form = t < 300 ? Math.floor(t / 60) : t < 770 ? 5 : t < 1130 ? 6 : 7;
      if (form < 7) {
        const water = image('water:' + form, 31, 34, WATER, set => {
          if (form < 5) {
            const h = 4 + form * 4;
            poly(
              set,
              [
                [8, 30],
                [8, 30 - h],
                [12, 27 - h],
                [21, 29 - h],
                [23, 30],
              ],
              3,
            );
            line(set, 10, 29, 10, 31 - h, 4, 2);
            line(set, 12, 29 - h, 19, 29 - h, 5, 2);
          } else if (form === 5) {
            poly(
              set,
              [
                [6, 13],
                [12, 8],
                [25, 10],
                [25, 26],
                [19, 31],
                [6, 29],
              ],
              3,
            );
            poly(
              set,
              [
                [7, 13],
                [12, 9],
                [24, 11],
                [19, 15],
              ],
              4,
            );
            line(set, 7, 15, 7, 27, 4, 2);
            line(set, 20, 16, 20, 28, 2, 2);
            line(set, 9, 14, 16, 15, 5, 1);
          } else {
            poly(
              set,
              [
                [4, 30],
                [7, 23],
                [8, 16],
                [12, 9],
                [19, 6],
                [25, 9],
                [27, 15],
                [23, 18],
                [19, 15],
                [22, 12],
                [18, 11],
                [15, 15],
                [15, 21],
                [26, 29],
              ],
              3,
            );
            line(set, 10, 17, 13, 11, 4, 2);
            line(set, 13, 10, 19, 7, 5, 2);
            line(set, 20, 7, 25, 10, 5, 2);
            line(set, 24, 11, 24, 15, 4, 2);
            line(set, 7, 28, 24, 28, 4, 2);
          }
        });
        k.blit(water, p.x - 15, p.y - 26);
      }
      if (t > 1100) {
        const puddle = image('puddle', 37, 15, WATER, set => {
          for (let y = 1; y < 14; y++)
            for (let x = 1; x < 36; x++) {
              const d = ((x - 18) / 16) ** 2 + ((y - 7) / 5) ** 2;
              if (d > 0.65 && d < 1) set(x, y, y < 7 ? 4 : 3);
            }
        });
        k.blit(puddle, p.x - 18, p.y - 3, fade(t, 1480, 1780));
      }
    },
    air(s) {
      if (!active(s, 1780)) return;
      const p = cube(s),
        t = age(s);
      impact(s, { x: p.x, y: p.y - 10 }, WATER, 'water', 18, 6);
      // Splash droplets use raw time relative to the first beat, including its hitstop.
      const e = s.real(s.hits[0]) - 795;
      if (e >= 0 && e < 390) {
        const q = e / 390;
        for (let i = 0; i < 9; i++) {
          const dx = (k.hash(i, s.event.seed) - 0.5) * 36;
          const x = p.x + dx * k.ease(q),
            y = p.y - Math.sin(q * Math.PI) * (9 + k.hash(i, s.event.seed, 1) * 10) + q * 5;
          k.dot(x, y, WATER[0], 4);
          k.dot(x, y, WATER[i % 2 ? 4 : 3], 2);
        }
      }
    },
  });

  // Mold Earth: a whole block heaves out of a dark trench, throws clods and settles as a raised mound.
  FX.register('mold-earth', {
    palette: EARTH,
    travel: 360,
    beats: soft,
    end: () => 1880,
    ground(s) {
      if (!active(s, 1580)) return;
      const p = cube(s),
        t = age(s);
      const trench = image('trench', 33, 22, EARTH, set => {
        poly(
          set,
          [
            [2, 7],
            [23, 3],
            [30, 9],
            [25, 18],
            [5, 18],
          ],
          1,
        );
        line(set, 3, 8, 23, 4, 4, 2);
        line(set, 4, 17, 24, 17, 3, 2);
        line(set, 26, 15, 29, 9, 4, 2);
      });
      k.blit(trench, p.x - 16, p.y - 6, fade(t, 1300, 1580));
      const raised = Math.round(9 * k.ease(k.clamp(t / 360)));
      const mound = t > 850;
      const earth = image('earth:' + raised + ':' + mound, 29, 31, EARTH, set => {
        if (!mound) {
          poly(
            set,
            [
              [5, 16 - raised],
              [19, 13 - raised],
              [25, 18 - raised],
              [24, 27],
              [7, 28],
            ],
            2,
          );
          poly(
            set,
            [
              [5, 16 - raised],
              [19, 13 - raised],
              [25, 18 - raised],
              [11, 21 - raised],
            ],
            4,
          );
          line(set, 8, 22 - raised, 8, 26, 3, 2);
          line(set, 21, 21 - raised, 21, 25, 1, 2);
        } else {
          poly(
            set,
            [
              [3, 27],
              [5, 20],
              [10, 15],
              [16, 13],
              [23, 18],
              [26, 27],
            ],
            3,
          );
          poly(
            set,
            [
              [6, 21],
              [11, 16],
              [16, 14],
              [22, 19],
              [17, 21],
              [12, 19],
            ],
            4,
          );
          line(set, 8, 24, 11, 23, 2, 2);
          line(set, 19, 23, 23, 25, 2, 2);
        }
      });
      k.blit(earth, p.x - 14, p.y - 22, fade(t, 1300, 1580));
    },
    air(s) {
      if (!active(s, 1580)) return;
      const p = cube(s),
        e = s.real(s.hits[0]);
      impact(s, { x: p.x, y: p.y - 6 }, EARTH, 'earth', 21, 7);
      if (e >= 0 && e < 450) {
        const q = e / 450;
        for (let i = 0; i < 6; i++) {
          const dx = (i - 2.5) * 6;
          const x = p.x + dx * k.ease(q),
            y = p.y - 7 - Math.sin(q * Math.PI) * (8 + k.hash(i, s.event.seed) * 9) + q * 10;
          k.dot(x, y, EARTH[0], 5);
          k.dot(x, y, EARTH[i % 2 ? 3 : 4], 3);
        }
      }
    },
  });

  // Longstrider: feet ignite beneath paired winged boots as wind and kicked dust sweep backward.
  FX.register('longstrider', {
    palette: WIND,
    travel: 230,
    beats: soft,
    end: () => 1580,
    ground(s) {
      if (!active(s, 1280)) return;
      const p = feet(s),
        t = age(s);
      if (t < 800) ring(p, 9 + k.clamp(t / 230) * 4, 4, WIND, 4, 2);
    },
    air(s) {
      if (!active(s, 1280)) return;
      const p = feet(s),
        t = age(s);
      const from = k.P(s.pose.hand || s.pose.base),
        b = k.P(body(s));
      const dx = b.x - from.x,
        dy = b.y - from.y,
        len = Math.hypot(dx, dy);
      const vx = len > 1 ? dx / len : 1,
        vy = len > 1 ? dy / len : 0;
      if (t >= 100 && t < 800) k.blit(boots(), p.x - 15, p.y - 17, fade(t, 580, 800));
      if (t >= 210 && t < 1050) {
        const q = k.clamp((t - 210) / 650);
        for (let i = 0; i < 5; i++) {
          const offset = (i - 2) * 5,
            d = 5 + q * 18 + (i % 2) * 3;
          const x = b.x - vx * d - vy * offset,
            y = b.y - vy * d + vx * offset;
          stroke(
            [
              [x, y],
              [x - vx * (7 - q * 3), y - vy * (7 - q * 3)],
            ],
            WIND,
            i % 2 ? 4 : 3,
            2,
          );
        }
      }
      impact(s, p, WIND, 'stride', 18, 7);
      k.shards(p, s.real(s.hits[0]) - 35, EARTH, (s.event.seed || 0) + 42, 6, 16);
    },
  });

  // Air Bubble: a clear, double-rimmed blue bubble encloses the head and shoulders with a white glint.
  FX.register('air-bubble', {
    palette: WATER,
    travel: 300,
    beats: soft,
    end: () => 1820,
    air(s) {
      if (!active(s, 1520)) return;
      const p = k.P(body(s)),
        t = age(s);
      const stage = Math.min(5, Math.floor(t / 60));
      const wobble = t < 300 ? 0 : Math.round(Math.sin((t - 300) / 90) * 2 * fade(t, 300, 850));
      const bubble = image('bubble:' + stage + ':' + wobble, 43, 45, WATER, set => {
        const rx = 6 + stage * 1.9 + wobble,
          ry = 7 + stage * 2.1 - wobble;
        for (let y = 1; y < 44; y++)
          for (let x = 1; x < 42; x++) {
            const dx = x - 21,
              dy = y - 22,
              d = (dx / rx) ** 2 + (dy / ry) ** 2;
            if (d <= 1 && (dx / (rx - 2)) ** 2 + (dy / (ry - 2)) ** 2 >= 1) set(x, y, y < 21 ? 4 : 3);
            if (dx < -rx * 0.35 && dy < -ry * 0.3 && d < 0.87 && d > 0.56) set(x, y, 5);
          }
      });
      k.blit(bubble, p.x - 21, p.y - 27, fade(t, 1210, 1520));
      if (t >= 360 && t < 1250) {
        for (let i = 0; i < 3; i++) {
          const q = ((s.c.raw - 360 + i * 190) % 780) / 780;
          const b = { x: p.x + 10 + Math.sin(q * 5 + i) * 3, y: p.y - 10 - q * 19 };
          ring(b, 2 + (i % 2), 2 + (i % 2), WATER, 4, 1);
        }
      }
      impact(s, { x: p.x, y: p.y - 5 }, WATER, 'bubble', 12, 4);
    },
  });

  function guardianPalette(event) {
    const pal = k.paletteFor(event);
    return pal === k.palettes['necr\u00f3tico'] ? pal : GOLD;
  }
  function ghost(pal, frame) {
    // Outline is explicit, so the ordered transparent holes do not acquire solid dark infill.
    const ghostPal = [pal[0], pal[0], pal[2], pal[3], pal[4], pal[5]];
    return image(
      'guardian:' + frame,
      29,
      34,
      ghostPal,
      set => {
        const mask = (x, y) => {
          const hood = ((x - 14) / 6) ** 2 + ((y - 9) / 7) ** 2 < 1;
          const wings = y >= 9 && y < 19 && Math.abs(x - 14) < 13 - (y - 9) * 0.65 && Math.abs(x - 14) > 4;
          const tail =
            y >= 12 && y < 31 && Math.abs(x - 14 - (Math.sin((y + frame * 2) / 4) * (y - 12)) / 10) < (32 - y) / 3;
          return hood || wings || tail;
        };
        for (let y = 1; y < 33; y++)
          for (let x = 1; x < 28; x++) {
            if (!mask(x, y)) continue;
            const edge = !mask(x - 1, y) || !mask(x + 1, y) || !mask(x, y - 1) || !mask(x, y + 1);
            if (edge) {
              if (y < 23 || k.dith(x, y) < 0.5) set(x, y, 1);
            } else if (k.dith(x, y) < (y < 13 ? 0.75 : 0.5)) set(x, y, y < 13 || x < 14 ? 4 : 3);
          }
        // Deep hood opening, luminous eyes, wing feathers and an open, tapering wisp tail.
        poly(
          set,
          [
            [14, 5],
            [18, 11],
            [17, 14],
            [11, 14],
            [10, 11],
          ],
          1,
        );
        line(set, 11, 10, 12, 10, 5, 1);
        line(set, 16, 10, 17, 10, 5, 1);
        line(set, 4, 10, 8, 14, 4, 1);
        line(set, 23, 10, 20, 14, 5, 1);
      },
      false,
    );
  }
  function guardians(s, alpha) {
    if (alpha <= 0) return;
    const a = s.area || s.pose.base;
    if (!a) return;
    const p = k.P(a),
      radius = Math.max(16, ((s.area?.feet || 15) / (s.grid.feet || 5)) * 16);
    const pal = s.ramp,
      R = Math.round(radius),
      size = R * 2 + 9;
    const floor = image('guardian-floor:' + R, size, size, pal, set => {
      const c = (size - 1) / 2;
      for (let y = 1; y < size - 1; y++)
        for (let x = 1; x < size - 1; x++) {
          const d = Math.hypot(x - c, y - c);
          if (Math.abs(d - R) < 1.1) set(x, y, 4);
          else if (Math.abs(d - (R - 4)) < 0.8 && k.dith(x, y) < 0.5) set(x, y, 3);
        }
    });
    k.blit(floor, p.x - size / 2, p.y - size / 2, alpha * 0.65);
    const phase = (s.c.raw / 7200) * k.tau + k.hash(s.event.seed || 0, 42) * k.tau;
    const spirits = [];
    for (let i = 0; i < 6; i++) {
      const angle = phase + (i * k.tau) / 6;
      spirits.push({ x: p.x + Math.cos(angle) * radius, y: p.y + Math.sin(angle) * radius, i });
    }
    spirits.sort((a, b) => a.y - b.y);
    for (const v of spirits) {
      const bob = Math.round(Math.sin(s.c.raw / 420 + v.i * 1.7) * 2);
      const f = Math.floor(s.c.raw / 240 + v.i) % 4;
      k.blit(ghost(pal, f), v.x - 14, v.y - 28 + bob, alpha);
    }
  }

  // Spirit Guardians: dithered winged spectres orbit a strong radiant or necrotic floor circle.
  FX.register('spirit-guardians', {
    palette: guardianPalette,
    travel: 320,
    beats: soft,
    end: () => 1630,
    ground(s) {
      if (!active(s, 1330)) return;
      const p = k.P(s.area || s.pose.base),
        t = age(s);
      const r = ((s.area?.feet || 15) / (s.grid.feet || 5)) * 16;
      if (t < 320) {
        const q = k.ease(t / 320);
        ring(p, 6 + (r - 6) * q, 6 + (r - 6) * q, s.ramp, 4, 2);
      }
      if (t >= 320 && !s.pose.linger) guardians(s, fade(t, 1020, 1330));
    },
    air(s) {
      if (!active(s, 1330)) return;
      impact(s, k.P(s.pose.base || s.area), s.ramp, 'guardians-' + s.ramp[3], 23, 8);
    },
    linger(s) {
      guardians(s, s.linger);
    },
    reach: (event, grid) => ({ r: 15 / (grid.feet || 5) + 1.2, up: 2.3 }),
  });
})(typeof window !== 'undefined' ? window : globalThis);
