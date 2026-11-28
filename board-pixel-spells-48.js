/* Pixel spells, batch 48: readable silhouettes, held peaks and real-time impacts. */
(function (root) {
  'use strict';
  const FX = root.BoardPixelFX;
  if (!FX) return;
  const k = FX.kit;
  const GOLD = ['#291b36', '#765021', '#ba8d38', '#ffce65', '#fff3bc', '#ffffff'];
  const BIND = ['#24132f', '#543066', '#a17bd2', '#ffd064', '#fff0b5', '#ffffff'];
  const WIND = ['#142c3a', '#315d70', '#6ca8ba', '#a7ebef', '#e3ffff', '#ffffff'];
  const SILVER = ['#172432', '#435366', '#829aaf', '#c4e0ed', '#edfbff', '#ffffff'];
  const VIOLET = ['#231334', '#53316f', '#9b64c5', '#d2a5ff', '#f1deff', '#ffffff'];
  const MIST = ['#202d2c', '#526957', '#819e88', '#b3d4b5', '#e3f2d5', '#ffffff'];
  const CYAN = ['#102c43', '#17647f', '#28abc7', '#66eaff', '#c5fbff', '#ffffff'];
  const BARK = ['#2b211c', '#6b422e', '#a36e42', '#dca66c', '#ffe0a6', '#fff9df'];
  const DRAIN = ['#24302b', '#526651', '#8fa28a', '#c5d6a9', '#edf5d5', '#ffffff'];
  const FROST = ['#182b42', '#426785', '#7fa8c7', '#b8e3fa', '#e9faff', '#ffffff'];
  const LEAF = ['#1b3025', '#426445', '#7eaa61', '#bfe58e', '#eff8cd', '#ffffff'];

  const ICONS = {
    lock: [
      '...44444...',
      '..44...44..',
      '..44...44..',
      '..44...44..',
      '.333333333.',
      '.344444443.',
      '.344554443.',
      '.344114443.',
      '.344114443.',
      '.333333333.',
    ],
    anchor: [
      '......444......',
      '.....43334.....',
      '.....43.34.....',
      '......444......',
      '......434......',
      '..44444344444..',
      '......434......',
      '......434......',
      '.44...434...44.',
      '.434..434..434.',
      '..43444344434..',
      '...433333334...',
      '.....43334.....',
      '......444......',
    ],
    leaf: [
      '.........44..',
      '......44434..',
      '....4433334..',
      '..443343334..',
      '.433343334...',
      '.43343334....',
      '..443334.....',
      '...4444......',
      '..44.........',
    ],
    plus: [
      '....4444....',
      '....4554....',
      '....4554....',
      '....4554....',
      '444445544444',
      '455555555554',
      '455555555554',
      '444445544444',
      '....4554....',
      '....4554....',
      '....4554....',
      '....4444....',
    ],
    bull: [
      '.44.........44.',
      '.434.......434.',
      '.4334.....4334.',
      '..43344444334..',
      '...433333334...',
      '...435333534...',
      '...431333134...',
      '....4333334....',
      '....4344434....',
      '....4333334....',
      '.....44444.....',
    ],
    arrow: [
      '.444...........',
      '.434...........',
      '.434...........',
      '.43444444......',
      '.433333334.....',
      '..444443334....',
      '.......4334....',
      '.......4334....',
      '.....44433444..',
      '......433334...',
      '.......4334....',
      '........44.....',
    ],
    hourglass: [
      '.444444444.',
      '.433333334.',
      '..4555554..',
      '..4355534..',
      '...43534...',
      '....454....',
      '...43534...',
      '..4335334..',
      '..4335334..',
      '.433333334.',
      '.444444444.',
    ],
    foot: ['.44.', '4334', '4334', '.44.', '.44.', '.44.'],
  };
  function icon(name, pal) {
    const rows = ICONS[name];
    return k.sprite('48:' + name + ':' + pal[3], rows[0].length + 2, rows.length + 2, pal, set => {
      rows.forEach((row, y) =>
        [...row].forEach((c, x) => {
          if (c !== '.') set(x + 1, y + 1, +c);
        }),
      );
    });
  }
  function stamp(img, x, y, alpha = 1) {
    k.blit(img, x - img.width / 2, y - img.height / 2, alpha);
  }
  function point(x, y, color, size, pal) {
    k.dot(x, y, pal[0], size + 2);
    k.dot(x, y, color, size);
  }
  function stroke(points, pal, color = pal[4], width = 2) {
    for (const p of points) k.dot(p.x, p.y, pal[0], width + 2);
    for (const p of points) k.dot(p.x, p.y, color, width);
  }
  function line(a, b, pal, color = pal[4], width = 2) {
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 2));
    stroke(
      Array.from({ length: n + 1 }, (_, i) => ({ x: k.mix(a.x, b.x, i / n), y: k.mix(a.y, b.y, i / n) })),
      pal,
      color,
      width,
    );
  }
  function arc(x, y, rx, ry, start, sweep, pal, color = pal[4], width = 2) {
    const n = Math.max(8, Math.ceil((Math.abs(sweep) * Math.max(rx, ry)) / 2.4));
    stroke(
      Array.from({ length: n + 1 }, (_, i) => {
        const a = start + (sweep * i) / n;
        return { x: x + Math.cos(a) * rx, y: y + Math.sin(a) * ry };
      }),
      pal,
      color,
      width,
    );
  }
  function ring(x, y, rx, ry, pal, alpha = 1) {
    rx = Math.max(2, Math.round(rx));
    ry = Math.max(2, Math.round(ry));
    const img = k.sprite(`48:ring:${pal[3]}:${rx}:${ry}`, rx * 2 + 6, ry * 2 + 6, pal, set => {
      for (let y = -ry - 1; y <= ry + 1; y++)
        for (let x = -rx - 1; x <= rx + 1; x++) {
          const d = Math.hypot(x / rx, y / ry);
          if (Math.abs(d - 1) < 1.1 / ry) set(x + rx + 3, y + ry + 3, y < 0 ? 4 : 3);
        }
    });
    stamp(img, x, y, alpha);
  }
  function feet(t) {
    return k.P({ x: t.baseX ?? t.x, y: t.baseY ?? t.y + 0.62 * (t.span || 1) });
  }
  function caster(s) {
    const b = s.pose.base || s.pose.hand || s.pose.target;
    return b ? { x: b.x, y: b.y - 0.62, baseX: b.x, baseY: b.y, span: b.span || 1 } : null;
  }
  function subjects(s) {
    return s.targets.length ? s.targets : [caster(s)].filter(Boolean);
  }
  function beats(event, kit, travel, kind = 'soft', stop = 85) {
    return (event.targets?.length ? event.targets : [null]).map(target => ({
      at: kit.CAST + travel,
      stop,
      target,
      kind,
      power: 0.035,
    }));
  }
  function impact(s, pal, size = 19, count = 5) {
    s.hits.forEach((h, i) => {
      const t = s.targets.find(t => t.id === h.id) || subjects(s)[i % Math.max(1, subjects(s).length)];
      if (!t) return;
      const p = k.P(t),
        e = s.real(h);
      k.drawHit(k.hitStyle('48:' + s.event.id, pal, { S: size, spikes: 4, jag: 0.12 }), p, e);
      k.shards(p, e, pal, (s.event.seed || 0) + i * 13, count, 13);
    });
  }
  function mote(x, y, pal) {
    point(x, y, pal[4], 1, pal);
  }
  function puff(frame, pal) {
    return k.sprite('48:puff:' + pal[3] + ':' + frame, 31, 12, pal, set => {
      for (let y = 1; y < 11; y++)
        for (let x = 1; x < 30; x++) {
          const inside = [
            [7, 7, 5],
            [14, 5, 5],
            [22, 7, 6],
          ].some(([cx, cy, r]) => Math.hypot(x - cx, (y - cy) * 1.5) < r);
          if (inside && !(frame > 0 && x < frame * 3 && (x + y) % 3 === 0)) set(x, y, y < 5 ? 4 : y < 8 ? 3 : 2);
        }
    });
  }
  function ghost(pal) {
    return k.sprite('48:ghost:' + pal[3], 13, 23, pal, set => {
      for (let y = 1; y < 22; y++)
        for (let x = 1; x < 12; x++) {
          const head = y < 7 && Math.hypot(x - 6, y - 4) < 3;
          const body = y >= 8 && y < 16 && Math.abs(x - 6) <= 3 + (y < 11 ? 1 : 0);
          const legs = y >= 16 && (x === 3 || x === 4 || x === 8 || x === 9);
          if (head || body || legs) set(x, y, x < 6 ? 4 : 3);
        }
    });
  }

  // Hold Person: golden-violet body bands cinch shut; a bright padlock crowns the captive.
  FX.register('hold', {
    palette: BIND,
    travel: 260,
    beats,
    end: () => 1330,
    ground(s) {
      if (s.c.t < k.CAST) return;
      subjects(s).forEach(t => {
        const p = feet(t);
        ring(p.x, p.y, 10, 4, BIND, s.c.t > 1150 ? 0.5 : 1);
      });
    },
    air(s) {
      const e = s.c.t - k.CAST;
      if (e < 0) return;
      subjects(s).forEach(t => {
        const p = k.P(t),
          f = feet(t),
          wrap = k.clamp(e / 260);
        for (let j = 0; j < 3; j++) {
          const y = f.y - 3 - j * 6;
          arc(p.x, y, 8 + (1 - wrap) * 5, 3, -Math.PI, k.tau * wrap, BIND, j === 1 ? BIND[2] : BIND[3]);
          if (wrap === 1) point(p.x + 7, y, BIND[5], 2, BIND);
        }
        if (e >= 230) stamp(icon('lock', BIND), p.x, p.y - 19, e > 900 ? 0.75 : 1);
      });
      impact(s, BIND, 19);
    },
  });

  // Freedom Of The Winds: white cloud slippers, curling cyan gusts and a rising wind-borne silhouette.
  FX.register('freedom-of-the-winds', {
    palette: WIND,
    travel: 260,
    beats: (event, kit, travel) => [{ at: kit.CAST + travel, stop: 80, target: null, kind: 'soft', power: 0 }],
    end: () => 1460,
    ground(s) {
      const e = s.c.t - k.CAST,
        t = caster(s);
      if (e < 0 || !t) return;
      const f = feet(t);
      stamp(puff(e > 850 ? 2 : 0, WIND), f.x, f.y + 1, e > 950 ? 0.5 : 1);
    },
    air(s) {
      const e = s.c.t - k.CAST,
        t = caster(s);
      if (e < 0 || !t) return;
      const f = feet(t),
        lift = 7 * k.ease(k.clamp(e / 450));
      if (e > 150) stamp(ghost(WIND), f.x, f.y - 12 - lift, e > 900 ? 0.25 : 0.5);
      stamp(puff(e > 850 ? 2 : 0, WIND), f.x, f.y - lift, e > 1000 ? 0.5 : 1);
      for (let j = 0; j < 3; j++) {
        const y = f.y - 3 - j * 8 - lift;
        arc(f.x, y, 12 - j, 5, e / 140 + j * 2, Math.PI * 1.35, WIND, j % 2 ? WIND[5] : WIND[3]);
      }
      if (e < 850)
        for (let j = 0; j < 4; j++) {
          const x = f.x - 13 + j * 8,
            y = f.y - ((e / 25 + j * 5) % 25);
          line({ x, y }, { x: x + 2, y: y - 6 }, WIND);
        }
      const h = s.hits[0];
      if (h) {
        const p = { x: f.x, y: f.y - 9 };
        k.drawHit(k.hitStyle('48:wind', WIND, { S: 20, spikes: 4 }), p, s.real(h));
        k.shards(p, s.real(h), WIND, s.event.seed || 0, 5, 14);
      }
    },
  });

  function bird(frame) {
    return k.sprite('48:bird:' + frame, 21, 16, WIND, set => {
      const rows = frame
        ? ['...44.......44...', '...454.....454...', '....455444554....', '.....4555554.....', '......43334......']
        : ['.................', '..444.......444..', '..45544...44554..', '...45554445554...', '.....4555554.....'];
      rows.forEach((row, y) =>
        [...row].forEach((c, x) => {
          if (c !== '.') set(x + 1, y + 1, +c);
        }),
      );
      for (let y = 6; y <= 10; y++) for (let x = 8; x <= 13; x++) set(x, y, y < 8 ? 5 : 3);
      set(14, 7, 4);
      set(15, 8, 4);
      set(12, 7, 1);
      for (let x = 5; x < 9; x++) set(x, 11, 4);
      for (let y = 11; y < 14; y++) for (let x = 9; x < 16; x++) set(x, y, y === 12 ? 2 : 5);
    });
  }

  function dagger() {
    return k.sprite('48:dagger', 5, 10, SILVER, set => {
      for (let y = 1; y <= 6; y++) {
        set(2, y, 5);
        if (y > 1 && y < 6) set(3, y, 3);
      }
      for (let x = 1; x <= 3; x++) set(x, 7, 4);
      set(2, 8, 2);
    });
  }
  function cube(s) {
    const a = s.area;
    let corners = a ? k.outline(a, s.grid).map(p => k.P({ x: p[0], y: p[1] })) : [];
    if (corners.length !== 4) {
      const p = k.P(s.pose.target || s.targets[0] || s.pose.base);
      corners = [
        { x: p.x - 8, y: p.y - 8 },
        { x: p.x + 8, y: p.y - 8 },
        { x: p.x + 8, y: p.y + 8 },
        { x: p.x - 8, y: p.y + 8 },
      ];
    }
    const c = { x: corners.reduce((v, p) => v + p.x, 0) / 4, y: corners.reduce((v, p) => v + p.y, 0) / 4 };
    return { corners, c, r: Math.max(7, Math.hypot(corners[0].x - corners[1].x, corners[0].y - corners[1].y) / 2) };
  }
  function bladeCloud(s, front, alpha) {
    if (alpha <= 0) return;
    const { corners, c, r } = cube(s),
      height = Math.max(13, r * 1.6);
    const phase = s.c.raw / 420;
    if (!front) {
      // Cache the whole wire cube: only the freely orbiting blades move each frame.
      const rel = corners.map(p => ({ x: Math.round(p.x - c.x), y: Math.round(p.y - c.y) }));
      const extent = Math.ceil(r * 1.5 + 4),
        w = extent * 2 + 1,
        h = Math.ceil(extent * 2 + height + 3);
      const img = k.sprite(`48:cube:${rel.map(p => p.x + ',' + p.y).join(':')}`, w, h, SILVER, set => {
        const edge = (a, b) => {
          const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y)));
          for (let j = 0; j <= n; j++) {
            const x = Math.round(k.mix(a.x, b.x, j / n)) + extent;
            const y = Math.round(k.mix(a.y, b.y, j / n)) + extent + Math.ceil(height);
            set(x, y, 3);
            set(x, y - 1, 4);
          }
        };
        rel.forEach((p, i) => {
          const b = rel[(i + 1) % 4];
          edge(p, b);
          edge({ x: p.x, y: p.y - height }, { x: b.x, y: b.y - height });
          edge(p, { x: p.x, y: p.y - height });
        });
      });
      k.blit(img, c.x - extent, c.y - extent - Math.ceil(height), alpha * 0.75);
    }
    for (let i = 0; i < 18; i++) {
      const a = phase + (i * k.tau) / 6 + Math.floor(i / 6) * 0.8;
      if (Math.sin(a) >= 0 !== front) continue;
      const x = c.x + Math.cos(a) * r * 0.92,
        y = c.y + Math.sin(a) * r * 0.6 - 3 - (Math.floor(i / 6) * height) / 3;
      // Fade with blit once the zone ends; the rotation helper has no alpha parameter.
      if (alpha >= 0.75) k.blitRotated(dagger(), x, y, a + Math.PI / 3);
      else stamp(dagger(), x, y, alpha);
      if ((i + Math.floor(s.c.raw / 160)) % 9 === 0 && alpha > 0.5) {
        point(x + 3, y - 3, SILVER[5], 2, SILVER);
      }
    }
  }
  // Cloud Of Daggers: a full silver wire cube filled with eighteen spinning, white-edged knives.
  FX.register('cloud-of-daggers', {
    palette: SILVER,
    travel: 240,
    beats: (event, kit, travel) => beats(event, kit, travel, 'hit', 105),
    end: () => 1190,
    ground(s) {
      if (s.c.t >= k.CAST && (s.c.t < 540 || !(s.pose.linger > 0))) bladeCloud(s, false, 1);
    },
    air(s) {
      if (s.c.t >= k.CAST && (s.c.t < 540 || !(s.pose.linger > 0))) bladeCloud(s, true, 1);
      impact(s, SILVER, 25, 7);
    },
    linger(s) {
      bladeCloud(s, false, s.linger);
    },
    lingerAir(s) {
      bladeCloud(s, true, s.linger);
    },
  });

  // Immovable Object: a massive violet anchor rune drops hard, then four chains snap taut.
  FX.register('immovable-object', {
    palette: VIOLET,
    travel: 260,
    beats: (event, kit, travel) => beats(event, kit, travel, 'hit', 115),
    end: () => 1350,
    ground(s) {
      const e = s.c.t - 560;
      if (e < 0) return;
      const p = k.P(s.pose.target || s.targets[0] || s.pose.base);
      ring(
        p.x,
        p.y + 4,
        7 + 12 * k.ease(k.clamp(e / 300)),
        3 + 4 * k.ease(k.clamp(e / 300)),
        VIOLET,
        e < 310 ? 1 : 0.25,
      );
    },
    air(s) {
      const e = s.c.t - k.CAST;
      if (e < 0) return;
      const p = k.P(s.pose.target || s.targets[0] || s.pose.base),
        drop = 22 * (1 - k.clamp(e / 260)) ** 2;
      stamp(icon('anchor', VIOLET), p.x, p.y - 4 - drop, e > 900 ? 0.75 : 1);
      if (e >= 260)
        for (let j = 0; j < 4; j++) {
          const a = (j * Math.PI) / 2 + Math.PI / 4;
          for (let i = 1; i <= 4; i++) {
            const r = i * 4 * k.ease(k.clamp((e - 260) / 130));
            ring(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r * 0.6, 3, 2, VIOLET);
          }
        }
      s.hits.forEach(h => {
        k.drawHit(k.hitStyle('48:anchor', VIOLET, { S: 29, spikes: 4 }), p, s.real(h));
        k.shards(p, s.real(h), VIOLET, s.event.seed || 0, 8, 20);
      });
    },
  });

  // Kinetic Jaunt: cyan springs coil round the legs while a bright running echo snaps behind the body.
  FX.register('kinetic-jaunt', {
    palette: CYAN,
    travel: 230,
    beats,
    end: () => 1300,
    ground(s) {
      if (s.c.t < k.CAST) return;
      subjects(s).forEach(t => {
        const p = feet(t);
        ring(p.x, p.y, 10, 4, CYAN, 0.75);
      });
    },
    air(s) {
      const e = s.c.t - k.CAST;
      if (e < 0) return;
      subjects(s).forEach(t => {
        const f = feet(t),
          dash = 5 + 14 * k.ease(k.clamp(e / 230));
        stamp(ghost(CYAN), f.x - dash, f.y - 12, e > 750 ? 0.25 : 0.5);
        for (let j = 0; j < 3; j++) {
          const y = f.y - 4 - j * 5;
          arc(f.x, y, 8, 3, e / 110 + j * 1.7, Math.PI * 1.5, CYAN, j % 2 ? CYAN[5] : CYAN[3]);
          if (e < 780 && j !== 1) line({ x: f.x - dash - 6, y: y - 4 }, { x: f.x - 4, y: y - 4 }, CYAN, CYAN[4]);
        }
      });
      impact(s, CYAN, 19, 5);
    },
  });

  // Barkskin: tan-lit bark plates climb from boots to shoulders, settling into a leaf-tipped armour outline.
  FX.register('barkskin', {
    palette: BARK,
    travel: 330,
    beats,
    end: () => 1460,
    ground(s) {
      if (s.c.t < k.CAST) return;
      subjects(s).forEach(t => {
        const p = feet(t);
        ring(p.x, p.y, 9, 4, BARK, 0.75);
      });
    },
    air(s) {
      const e = s.c.t - k.CAST;
      if (e < 0) return;
      subjects(s).forEach(t => {
        const f = feet(t);
        for (let row = 0; row < 4; row++) {
          const grow = k.clamp((e - row * 65) / 120);
          if (!grow) continue;
          for (const side of [-1, 1]) {
            const x = f.x + side * (row > 1 ? 6 : 4),
              y = f.y - 3 - row * 5 + (1 - grow) * 5;
            const img = k.sprite('48:bark:' + row, 7, 9, BARK, set => {
              for (let y = 1; y <= 7; y++)
                for (let x = 1; x <= 5; x++) {
                  if ((x === 1 || x === 5) && (y === 1 || y === 7)) continue;
                  set(x, y, x === 1 || y === 1 ? 4 : x === 2 ? 3 : 2);
                }
              set(4, 3, 1);
              set(3, 4, 1);
              set(3, 5, 1);
            });
            // Plates contract to edge armour, keeping the creature's centre open.
            stamp(img, x + side * k.clamp((e - 670) / 180) * 2, y, e > 930 ? 0.75 : 1);
          }
        }
        if (e > 270)
          for (const side of [-1, 1]) {
            point(f.x + side * 9, f.y - 21, LEAF[3], 4, LEAF);
            k.dot(f.x + side * 9, f.y - 22, LEAF[4], 2);
          }
      });
      impact(s, BARK, 19, 6);
    },
  });

  function lightColumn(p, height, pal, alpha) {
    const img = k.sprite('48:column:' + height + ':' + pal[3], 21, height + 4, pal, set => {
      for (let y = 1; y < height; y++)
        for (let x = 2; x < 19; x++) {
          const edge = x < 5 || x > 15;
          if (!edge && (x + y) % 4 !== 0) continue;
          set(x, y, edge ? 3 : 4);
        }
    });
    k.blit(img, p.x - 10, p.y - height, alpha);
  }
  // Prayer Of Healing: broad golden shafts descend onto every creature, with large crosses and halo rings.
  FX.register('prayer-of-healing', {
    palette: GOLD,
    travel: 330,
    beats,
    end: () => 1510,
    ground(s) {
      const e = s.c.t - k.CAST;
      if (e < 0) return;
      subjects(s).forEach(t => {
        const f = feet(t);
        lightColumn(f, 33, GOLD, e > 930 ? 0.25 : 0.5);
        ring(f.x, f.y, 11, 4, GOLD, e > 950 ? 0.5 : 1);
      });
    },
    air(s) {
      const e = s.c.t - k.CAST;
      if (e < 0) return;
      subjects(s).forEach((t, j) => {
        const p = k.P(t),
          f = feet(t),
          descend = 17 * (1 - k.ease(k.clamp(e / 330)));
        ring(p.x, f.y - 25 - descend, 9, 3, GOLD, e > 950 ? 0.5 : 1);
        if (e >= 180) stamp(icon('plus', GOLD), p.x, p.y - descend, e > 970 ? 0.5 : 1);
        for (let i = 0; i < 6; i++) {
          const q = (e / 700 + k.hash(i, s.event.seed || 0, j)) % 1;
          mote(p.x + (i % 2 ? 1 : -1) * (8 + (i % 3) * 2), f.y - q * 27, GOLD);
        }
      });
      impact(s, GOLD, 18, 4);
    },
  });

  // Enhance Ability: a rising gold aura resolves into an unmistakable, horned bull's head above the body.
  FX.register('enhance-ability', {
    palette: GOLD,
    travel: 280,
    beats,
    end: () => 1390,
    ground(s) {
      const e = s.c.t - k.CAST;
      if (e < 0) return;
      subjects(s).forEach(t => {
        const p = feet(t);
        lightColumn(p, 27, GOLD, e > 850 ? 0.25 : 0.5);
        ring(p.x, p.y, 11, 4, GOLD);
      });
    },
    air(s) {
      const e = s.c.t - k.CAST;
      if (e < 0) return;
      subjects(s).forEach(t => {
        const p = k.P(t),
          f = feet(t),
          rise = 14 * k.ease(k.clamp(e / 280));
        arc(p.x, f.y - 12, 11, 16, 0.3, Math.PI * 0.8, GOLD);
        arc(p.x, f.y - 12, 11, 16, Math.PI + 0.3, Math.PI * 0.8, GOLD);
        stamp(icon('bull', GOLD), p.x, f.y - 12 - rise, e > 880 ? 0.75 : 1);
        if (e < 850) for (let i = 0; i < 4; i++) mote(p.x - 10 + i * 7, f.y - ((e / 30 + i * 6) % 24), GOLD);
      });
      impact(s, GOLD, 21, 6);
    },
  });

  // Ray Of Enfeeblement: a thick white-cored sickly ray drains into sagging contours and a heavy down arrow.
  FX.register('ray-of-enfeeblement', {
    palette: DRAIN,
    travel: 60,
    beats: (event, kit, travel) => beats(event, kit, travel, 'beam', 100),
    end: () => 1330,
    air(s) {
      const e = s.c.t - k.CAST;
      if (e < 0 || !s.pose.hand) return;
      const h = k.P(s.pose.hand);
      subjects(s).forEach(t => {
        const p = k.P(t),
          f = feet(t),
          end = k.P(k.contact(t, s.pose.hand));
        if (e < 350) {
          line(h, end, DRAIN, DRAIN[3], e < 220 ? 6 : 4);
          line(h, end, DRAIN, DRAIN[5], 2);
        }
        if (e >= 60) {
          const sag = 4 * k.ease(k.clamp((e - 60) / 180));
          // Sloping shoulders and bent knees suggest weakness without moving the token.
          stroke(
            [
              { x: p.x - 7, y: p.y - 6 },
              { x: p.x - 5, y: p.y - 3 + sag },
              { x: p.x - 5, y: p.y + 3 + sag },
              { x: p.x - 7, y: f.y - 1 },
            ],
            DRAIN,
            DRAIN[4],
          );
          stroke(
            [
              { x: p.x + 7, y: p.y - 6 },
              { x: p.x + 5, y: p.y - 3 + sag },
              { x: p.x + 5, y: p.y + 3 + sag },
              { x: p.x + 7, y: f.y - 1 },
            ],
            DRAIN,
            DRAIN[4],
          );
          stamp(icon('arrow', DRAIN), p.x, p.y - 20 + sag, e > 850 ? 0.75 : 1);
          for (let j = 0; j < 3; j++) {
            const q = (e / 620 + j / 3) % 1;
            arc(p.x + (j - 1) * 7, p.y + q * 14, 4, 5, q * 2 + j, Math.PI, DRAIN, DRAIN[3]);
          }
        }
      });
      impact(s, DRAIN, 25, 7);
    },
  });

  // Gentle Repose: an icy white shroud lowers around the body beneath a large preserving hourglass.
  FX.register('gentle-repose', {
    palette: FROST,
    travel: 320,
    beats,
    end: () => 1490,
    ground(s) {
      const e = s.c.t - k.CAST;
      if (e < 0) return;
      subjects(s).forEach(t => {
        const p = feet(t);
        ring(p.x, p.y, 12, 5, FROST, e > 950 ? 0.5 : 1);
      });
    },
    air(s) {
      const e = s.c.t - k.CAST;
      if (e < 0) return;
      const img = k.sprite('48:shroud', 27, 31, FROST, set => {
        for (let y = 2; y < 29; y++)
          for (let x = 2; x < 25; x++) {
            const width = y < 8 ? 4 + y : 11,
              d = Math.abs(x - 13);
            if (d > width || (y > 26 && x % 5 < 2)) continue;
            if (d >= width - 2) set(x, y, x < 13 ? 5 : 3);
            else if (y < 5 || y > 25) set(x, y, 4);
            else if ((x + y * 2) % 7 === 0) set(x, y, 3);
          }
      });
      subjects(s).forEach(t => {
        const f = feet(t),
          fall = 15 * (1 - k.ease(k.clamp(e / 320)));
        k.blit(img, f.x - 13, f.y - 28 - fall, e > 970 ? 0.5 : 0.75);
        if (e > 180) stamp(icon('hourglass', FROST), f.x, f.y - 31 - fall, e > 950 ? 0.75 : 1);
        for (let j = 0; j < 4; j++) {
          const a = (j * Math.PI) / 2 + e / 700,
            x = f.x + Math.cos(a) * 12,
            y = f.y - 13 + Math.sin(a) * 10;
          point(x, y, FROST[5], 2, FROST);
        }
      });
      impact(s, FROST, 18, 5);
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
