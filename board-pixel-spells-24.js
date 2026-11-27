/* Pixel spells, batch 24 (see docs/pixel-spells/BRIEF.md). */
(function (root) {
  'use strict';
  const FX = root.BoardPixelFX;
  if (!FX) return;
  const k = FX.kit;
  const GOLD = ['#281b16', '#73502b', '#bd8c39', '#f0ca63', '#fff1ba', '#ffffff'];
  const WOOD = ['#251910', '#55402a', '#957046', '#c5a366', '#eee0ad', '#fff9df'];
  const AIR = ['#132231', '#345369', '#6b9eaf', '#afe1df', '#e8fff3', '#ffffff'];
  const ARCANE = ['#181129', '#433074', '#8065ba', '#bea1ed', '#f2ddff', '#ffffff'];
  const MIND = ['#280f29', '#65215b', '#b04c99', '#f48ccb', '#ffe0f3', '#ffffff'];
  const NATURE = ['#15200e', '#354c21', '#698c35', '#aed266', '#e7f4b1', '#fffde4'];
  const VOID = ['#130c24', '#332044', '#75458c', '#b779cf', '#eec8fa', '#ffffff'];
  const STONE = ['#1c2029', '#434955', '#78858b', '#afc4bd', '#e1eee0', '#ffffff'];
  const DEMON = ['#230e1b', '#59182d', '#a33442', '#e45e56', '#ffb38a', '#fff1d2'];
  const FIRE = ['#2a1011', '#712522', '#c04926', '#f98b32', '#ffda82', '#fffbe0'];
  const WATER = ['#101e32', '#23476f', '#468db1', '#83cddc', '#def8ff', '#ffffff'];

  const ART = {
    table: [
      '..333333333333..',
      '.34444444444432.',
      '3444444444444432',
      '.2222222222222.',
      '..32........23..',
      '..32........23..',
      '..32........23..',
      '..33........33..',
    ],
    chest: [
      '..333333333..',
      '.34444444432.',
      '3444444444432',
      '3222224222222',
      '3333335433332',
      '3233334333322',
      '3233333333322',
      '.22222222222.',
    ],
    courier: [
      '......44444.....',
      '....344444432...',
      '...34......23...',
      '....33333332....',
      '...344244243....',
      '..34444333332...',
      '....3333332.....',
      '.....34432......',
      '....34432.......',
      '......332.......',
      '.....33.........',
    ],
    lock: [
      '...44444...',
      '..43...34..',
      '..43...34..',
      '.333333333.',
      '.344444432.',
      '.343243432.',
      '.343223432.',
      '.344224432.',
      '.333333332.',
    ],
    knight: [
      '......44444......',
      '.....3444432.....',
      '.....3442432.....',
      '......33332......',
      '..333344443333...',
      '.34433444334432..',
      '.34334444334332..',
      '.34334444334332..',
      '.34334444334332..',
      '.34334444334332..',
      '.34433333333432..',
      '..433344433332...',
      '...3..34432..3...',
      '...3..32.23..3...',
      '...3..32.23..3...',
      '...3.332.233.3...',
    ],
    sword: [
      '...4...',
      '...4...',
      '...4...',
      '...4...',
      '...4...',
      '...4...',
      '.44444.',
      '...3...',
      '...3...',
      '..333..',
    ],
    shield: [
      '.4444444.',
      '433333334',
      '432444234',
      '432343234',
      '432343234',
      '.4333334.',
      '..43334..',
      '...434...',
      '....4....',
    ],
    tree: [
      '..3...3...3..',
      '..33..3..33..',
      '...3333333...',
      '.33334443333.',
      '3344444444433',
      '.33444444433.',
      '...3344433...',
      '....34432....',
      '....34432....',
      '....34432....',
      '....34432....',
      '...3344332...',
      '..334434332..',
      '.33344343332.',
    ],
    heart: [
      '.3343.3433.',
      '34444344443',
      '34444444443',
      '.344444443.',
      '..3444443..',
      '...34443...',
      '....343....',
      '.....3.....',
    ],
    scorpion: [
      '..33.......33...',
      '.3443.....3443..',
      '.3443.....3443..',
      '..33..333..33...',
      '...333444333....',
      '..33.34443.33...',
      '.33..34443..33..',
      '33...34443...33.',
      '.33..34443..33..',
      '..33.34443.33...',
      '.....33333......',
      '.......33.......',
      '.......33...33..',
      '........3333443.',
      '..........33343.',
    ],
    beholder: [
      '..3....3....3..',
      '..33..343..33..',
      '...333343333...',
      '..33444444332..',
      '.3444444444432.',
      '344433333444432',
      '344345554344432',
      '344345254344432',
      '344345554344432',
      '.3443333344432.',
      '..34444444332..',
      '...333333332...',
      '..33.33.33.33..',
      '.33..3...3..33.',
    ],
    construct: [
      '.....333333.....',
      '....34444432....',
      '....34224232....',
      '.....333333.....',
      '..333344443333..',
      '.34433444334432.',
      '.34433444334432.',
      '.34433454334432.',
      '.34433444334432.',
      '..333344443333..',
      '..33.333333.33..',
      '..33.33..33.33..',
      '.....33..33.....',
      '....333..333....',
    ],
    demon: [
      '..3.........3..',
      '..33.......33..',
      '...33.333.33...',
      '....3344433....',
      '....3424243....',
      '.....34443.....',
      '..33333433333..',
      '.3443344433443.',
      '344433444334443',
      '3443.34443.3443',
      '.33..34443..33.',
      '.....33333.....',
      '....33...33....',
      '...343...343...',
      '..3443...3443..',
      '..333.....333..',
    ],
    flame: [
      '.......4.......',
      '......343......',
      '......343..3...',
      '....33443.33...',
      '...334443343...',
      '..33444444332..',
      '.3344444444332.',
      '334444444444332',
      '344442444244432',
      '.3444444444432.',
      '..34445544432..',
      '...344554432...',
      '....3444432....',
      '.....34432.....',
      '......332......',
    ],
    wave: [
      '.....44444.....',
      '...344444432...',
      '..3444...4432..',
      '.3444.....432..',
      '..3333333332...',
      '...34444432....',
      '..3442442432...',
      '.344444444432..',
      '..3333333332...',
      '...34444432....',
      '..3444444432...',
      '....3444432....',
      '.....33332.....',
    ],
    wind: [
      '....4444444....',
      '..34444444432..',
      '.344.....4432..',
      '..3333333332...',
      '...34444432....',
      '..3442442432...',
      '...33333332....',
      '..3444444432...',
      '....3444432....',
      '.....34432.....',
      '....34432......',
      '......33.......',
    ],
    foot: ['..33....', '.3443...', '.3443...', '..333...', '...333..', '...3443.', '..34443.', '..33333.'],
    lance: [
      '......................4..',
      '......333333333333334443.',
      '.222333444444444444555554',
      '......333333333333334443.',
      '......................4..',
    ],
  };

  function speck(x, y, ramp, index = 4, size = 1) {
    k.dot(x, y, ramp[0], size + 2);
    k.dot(x, y, ramp[index], size);
  }

  // All large silhouettes and rings are cached; a reveal is one of five hard-edged build stages.
  function art(name, ramp, scale = 1, reveal = 4) {
    const rows = ART[name],
      w = Math.max(...rows.map(row => row.length));
    return k.sprite(
      `b24:${name}:${scale}:${reveal}:${ramp.join('')}`,
      w * scale + 4,
      rows.length * scale + 4,
      ramp,
      set => {
        rows.forEach((row, y) => {
          if (y < rows.length * (1 - reveal / 4)) return;
          for (let x = 0; x < row.length; x++) {
            if (row[x] === '.') continue;
            for (let dy = 0; dy < scale; dy++)
              for (let dx = 0; dx < scale; dx++) set(2 + x * scale + dx, 2 + y * scale + dy, +row[x]);
          }
        });
      },
    );
  }

  function icon(name, p, ramp, scale = 1, reveal = 4) {
    const img = art(name, ramp, scale, reveal);
    k.blit(img, p.x - img.width / 2, p.y - img.height / 2);
  }

  function ring(p, rx, ry, ramp, index = 3, gaps = 0, turn = 0) {
    rx = Math.max(2, Math.round(rx));
    ry = Math.max(2, Math.round(ry));
    const phase = Math.floor(turn) % 8,
      w = 2 * rx + 6,
      h = 2 * ry + 6;
    const img = k.sprite(`b24:ring:${rx}:${ry}:${index}:${gaps}:${phase}:${ramp.join('')}`, w, h, ramp, set => {
      const n = Math.ceil(k.tau * Math.max(rx, ry));
      for (let i = 0; i < n; i++) {
        if (gaps && Math.floor((i / n) * gaps * 2 + phase) % 2) continue;
        const a = (i / n) * k.tau;
        set(w / 2 + Math.cos(a) * rx, h / 2 + Math.sin(a) * ry, index);
      }
    });
    k.blit(img, p.x - w / 2, p.y - h / 2);
  }

  function stroke(points, ramp, index = 3, width = 1, budget = 60) {
    for (let pass = 0; pass < 2; pass++)
      for (let j = 1; j < points.length; j++) {
        const a = points[j - 1],
          b = points[j];
        const length = Math.hypot(b.x - a.x, b.y - a.y);
        const n = Math.max(1, Math.min(Math.ceil(length), Math.floor(budget / (points.length - 1))));
        const size = Math.max(width, Math.ceil(length / n));
        for (let i = 0; i <= n; i++)
          k.dot(k.mix(a.x, b.x, i / n), k.mix(a.y, b.y, i / n), ramp[pass ? index : 0], size + (pass ? 0 : 2));
      }
  }

  function corners(s) {
    if (s.area) {
      const points = k.outline(s.area, s.grid);
      if (points.length >= 4) return points.slice(0, 4).map(p => k.P(Array.isArray(p) ? { x: p[0], y: p[1] } : p));
      const a = s.area,
        len = (a.feet || 10) / (s.grid.feet || 5),
        dir = a.dir || 0;
      return [
        [0, -0.5],
        [1, -0.5],
        [1, 0.5],
        [0, 0.5],
      ].map(([u, v]) =>
        k.P({
          x: a.x + Math.cos(dir) * u * len - Math.sin(dir) * v * len,
          y: a.y + Math.sin(dir) * u * len + Math.cos(dir) * v * len,
        }),
      );
    }
    const p = location(s);
    return [
      [-16, -16],
      [16, -16],
      [16, 16],
      [-16, 16],
    ].map(([x, y]) => ({ x: p.x + x, y: p.y + y }));
  }

  function location(s) {
    if (s.area) {
      if (s.area.kind === 'cube') {
        const len = (s.area.feet || 10) / (s.grid.feet || 5) / 2;
        return k.P({ x: s.area.x + Math.cos(s.area.dir || 0) * len, y: s.area.y + Math.sin(s.area.dir || 0) * len });
      }
      return k.P(s.area);
    }
    return k.P(s.pose.target || s.targets[0] || s.pose.base || s.pose.hand || { x: 0, y: 0 });
  }

  function cubeRim(points, ramp, index) {
    const x = Math.floor(Math.min(...points.map(p => p.x))) - 2;
    const y = Math.floor(Math.min(...points.map(p => p.y))) - 2;
    const w = Math.ceil(Math.max(...points.map(p => p.x))) - x + 3;
    const h = Math.ceil(Math.max(...points.map(p => p.y))) - y + 3;
    const local = points.map(p => ({ x: Math.round(p.x - x), y: Math.round(p.y - y) }));
    const key = local.map(p => `${p.x},${p.y}`).join(':');
    const img = k.sprite(`b24:cube:${key}:${index}:${ramp.join('')}`, w, h, ramp, set => {
      local.forEach((a, i) => {
        const b = local[(i + 1) % local.length];
        const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y)));
        for (let j = 0; j <= n; j++) set(Math.round(k.mix(a.x, b.x, j / n)), Math.round(k.mix(a.y, b.y, j / n)), index);
      });
    });
    k.blit(img, x, y);
  }

  function recipients(s) {
    return s.targets.length ? s.targets.slice(0, 6) : [s.pose.base || s.pose.target || { x: 0, y: 0 }];
  }
  function foot(t) {
    return k.P({ x: t.baseX ?? t.x, y: t.baseY ?? t.y });
  }
  function soft(event, kit, travel) {
    return (event.targets?.length ? event.targets : [null]).map(target => ({
      at: kit.CAST + travel,
      stop: 70,
      target,
      kind: 'soft',
      power: 0,
    }));
  }
  function arrival(event, kit, travel) {
    return [{ at: kit.CAST + travel, stop: 110, target: null, kind: 'soft', power: 0 }];
  }
  function marks(s, ramp, key, at, size = 28, count = 7) {
    s.hits.slice(0, 6).forEach((hit, i) => {
      const p = at || k.P(s.targets.find(t => t.id === hit.id) || s.pose.base || s.pose.target || { x: 0, y: 0 });
      const e = s.real(hit);
      k.drawHit(k.hitStyle(`b24:${key}`, ramp, { S: size, spikes: key === 'lance' ? 4 : 6, jag: 0.25 }), p, e);
      k.shards(p, e, ramp, (s.event.seed || 0) + i * 19, count, size * 0.65);
    });
  }

  function portal(s, ramp, r = 18) {
    const e = s.c.t - k.CAST;
    if (e < 0 || e >= 1210) return;
    const p = location(s),
      q = e < 340 ? 1 : 1 - k.clamp((e - 760) / 450) * 0.45;
    ring(p, r * q, r * q * 0.45, ramp, e < 420 ? 4 : 2, e > 760 ? 6 : 0, e / 90);
    if (e < 760) ring(p, r * 0.66, r * 0.27, ramp, 3, 4, e / 110);
    for (let i = 0; i < 4 && e < 700; i++) {
      const a = (i * k.tau) / 4 + e / 650;
      speck(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r * 0.45, ramp);
    }
  }

  function summonBody(s, name, ramp, floating = false) {
    const e = s.c.t - k.CAST;
    if (e < 0 || e >= 1230) return;
    const p = location(s),
      reveal = e < 340 ? Math.min(3, 1 + Math.floor(e / 115)) : 4;
    const rise = floating ? -3 + Math.sin(Math.floor(e / 90) * 0.6) * 2 : 0;
    const snap = e >= 340 && e < 490 ? Math.round(3 * (1 - k.clamp((e - 340) / 150))) : 0;
    icon(name, { x: p.x, y: p.y - 16 + rise + snap }, ramp, 2, reveal);
  }

  function buffGround(s, ramp) {
    const e = s.c.t - k.CAST;
    if (e < 0 || e >= 850) return;
    recipients(s).forEach(t => {
      const p = foot(t),
        r = e < 220 ? 10 + k.ease(e / 220) * 5 : 15 - k.clamp((e - 600) / 250) * 4;
      ring(p, r, r * 0.45, ramp, e < 240 ? 4 : 3, e > 600 ? 4 : 0, e / 120);
    });
  }

  // Fabricate: raw timber chips spiral into a neatly joined table inside the actual cube footprint.
  FX.register('fabricate', {
    palette: WOOD,
    travel: 440,
    beats: arrival,
    end: () => 1590,
    ground(s) {
      const e = s.c.t - k.CAST;
      if (e < 0 || e >= 1250) return;
      const pts = corners(s),
        p = location(s);
      if (e < 850) cubeRim(pts, GOLD, e < 440 ? 3 : 2);
      if (e >= 300) icon('table', { x: p.x, y: p.y - 3 }, WOOD, 2, Math.min(4, 1 + Math.floor((e - 300) / 50)));
      if (e < 440)
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * k.tau + e / 220,
            r = 23 * (1 - k.ease(e / 440));
          speck(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r * 0.5 - 2, WOOD, 2 + (i % 3), 2);
        }
    },
    air(s) {
      const p = location(s);
      marks(s, GOLD, 'fabricate', p, 30, 8);
      const e = s.c.t - 740;
      if (e >= 250 && e < 650) for (let i = 0; i < 3; i++) speck(p.x - 10 + i * 10, p.y - 10 - (e - 250) / 45, GOLD, 4);
    },
  });

  // Galder's Speedy Courier: a little air elemental takes a brass chest into a closing planar slit.
  FX.register('galders-speedy-courier', {
    palette: AIR,
    travel: 340,
    beats: arrival,
    end: () => 1710,
    ground(s) {
      portal(s, AIR);
    },
    air(s) {
      const e = s.c.t - k.CAST,
        p = location(s);
      marks(s, AIR, 'courier', { x: p.x, y: p.y - 12 }, 25, 5);
      if (e < 0 || e >= 1260) return;
      const depart = k.ease(k.clamp((e - 680) / 430)),
        x = p.x + depart * 13,
        y = p.y - 12 - depart * 13;
      ring(
        { x: p.x + 13, y: p.y - 24 },
        8 * (1 - k.clamp((e - 1030) / 180)),
        14 * (1 - k.clamp((e - 1030) / 180)),
        ARCANE,
        4,
      );
      if (e < 1080) {
        icon('courier', { x, y: y - 10 }, AIR, 2, e < 340 ? 2 : 4);
        icon('chest', { x, y: y + 7 }, GOLD);
        for (let i = 0; i < 3; i++) ring({ x: x - 6 - i * 3, y: y + 2 + i * 4 }, 6 + i * 2, 2, AIR, 3, 2, e / 80 + i);
      }
    },
  });

  // Gate Seal: planar apertures in the cube pinch shut, then gold bars stitch an arcane padlock.
  FX.register('gate-seal', {
    palette: ARCANE,
    travel: 380,
    beats: arrival,
    end: () => 1560,
    reach: (event, grid) => ({ r: (event.area?.feet || 20) / (grid.feet || 5) + 1, up: 2 }),
    ground(s) {
      const e = s.c.t - k.CAST;
      if (e < 0 || e >= 1190) return;
      const pts = corners(s),
        p = location(s);
      cubeRim(pts, ARCANE, e < 380 ? 4 : 2);
      const close = 1 - k.clamp(e / 380);
      if (close > 0) for (let i = -1; i <= 1; i++) ring({ x: p.x + i * 15, y: p.y - 6 }, 6 * close, 13, VOID, 3);
      if (e >= 380) icon('lock', { x: p.x, y: p.y - 9 }, GOLD, 2);
      if (e >= 380 && e < 780)
        for (const v of pts) {
          const q = k.clamp((e - 380) / 180);
          stroke([v, { x: k.mix(v.x, p.x, q), y: k.mix(v.y, p.y, q) }], GOLD, 3, 1, 16);
        }
    },
    air(s) {
      marks(s, GOLD, 'seal', location(s), 32, 8);
    },
  });

  // Guardian of Faith: a stationary golden armored sentinel forms with a radiant sword and shield.
  FX.register('guardian-of-faith', {
    palette: GOLD,
    travel: 340,
    beats: arrival,
    end: () => 1590,
    ground(s) {
      portal(s, GOLD, 19);
      summonBody(s, 'knight', GOLD);
      const e = s.c.t - 640,
        p = location(s);
      if (e >= 0 && e < 880) {
        ring({ x: p.x, y: p.y - 39 }, 9, 3, GOLD, 4);
        icon('sword', { x: p.x - 17, y: p.y - 18 }, GOLD, 2);
        icon('shield', { x: p.x + 13, y: p.y - 15 }, GOLD, 2);
      }
    },
    air(s) {
      marks(s, GOLD, 'faith', { x: location(s).x, y: location(s).y - 15 }, 34, 9);
    },
  });

  // Guardian of Nature: the Great Tree form rises as bark, leafy branches and spreading roots.
  FX.register('guardian-of-nature', {
    palette: NATURE,
    travel: 240,
    beats: soft,
    end: () => 1400,
    ground(s) {
      buffGround(s, NATURE);
      const e = s.c.t - 540;
      if (e < 0 || e >= 800) return;
      recipients(s).forEach(t => {
        const p = foot(t);
        icon('tree', { x: p.x, y: p.y - 17 }, NATURE, 2);
        for (let i = 0; i < 4; i++) {
          const a = (i * k.tau) / 4 + 0.3,
            r = 19 * k.ease(k.clamp(e / 180));
          stroke(
            [
              p,
              { x: p.x + Math.cos(a) * r * 0.6, y: p.y + Math.sin(a) * r * 0.2 },
              { x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r * 0.5 },
            ],
            NATURE,
            2,
            2,
            8,
          );
        }
      });
    },
    air(s) {
      marks(s, NATURE, 'great-tree', null, 26, 6);
      const e = s.c.t - 540;
      if (e < 0 || e >= 790) return;
      recipients(s).forEach(t => {
        const p = k.P(t);
        for (let i = 0; i < 4; i++) {
          const a = (i * k.tau) / 4 + e / 260;
          speck(p.x + Math.cos(a) * 13, p.y - 7 + Math.sin(a) * 8, NATURE, 3 + (i % 2), 2);
        }
      });
    },
  });

  // Charm Monster: rose-pink enchantment curls into a heart above the creature's head.
  FX.register('charm-monster', {
    palette: MIND,
    travel: 260,
    beats: soft,
    end: () => 1310,
    ground(s) {
      buffGround(s, MIND);
    },
    air(s) {
      marks(s, MIND, 'charm', null, 24, 4);
      const e = s.c.t - k.CAST;
      if (e < 0 || e >= 940) return;
      recipients(s).forEach(t => {
        const p = k.P(t);
        if (e < 260 && s.pose.hand) {
          const h = k.P(s.pose.hand),
            q = e / 260;
          icon('heart', { x: k.mix(h.x, p.x, q), y: k.mix(h.y, p.y - 14, q) - Math.sin(q * Math.PI) * 8 }, MIND);
        } else {
          const rise = k.clamp((e - 700) / 240) * 8;
          icon('heart', { x: p.x, y: p.y - 17 - rise }, MIND);
          ring({ x: p.x, y: p.y - 11 - rise }, 12, 4, MIND, 3, 3, e / 120);
        }
      });
    },
  });

  // Giant Insect: a tiny scorpion jumps to giant size, raising claws and a poison stinger.
  FX.register('giant-insect', {
    palette: NATURE,
    travel: 340,
    beats: arrival,
    end: () => 1570,
    ground(s) {
      portal(s, NATURE, 18);
      const e = s.c.t - k.CAST;
      if (e < 0 || e >= 1200) return;
      const p = location(s),
        scale = e < 200 ? 1 : 2;
      icon('scorpion', { x: p.x, y: p.y - 9 }, NATURE, scale);
      if (e >= 340 && e < 750) ring(p, 18 + Math.floor((e - 340) / 70), 8, WOOD, 2, 6);
    },
    air(s) {
      const p = location(s);
      marks(s, NATURE, 'insect', p, 31, 8);
      const e = s.c.t - 640;
      if (e >= 0 && e < 550) speck(p.x + 13, p.y + 1 - (Math.floor(e / 120) % 2), NATURE, 4, 2);
    },
  });

  // Greater Invisibility: a silver-violet humanoid shell unweaves into transparent checker cutouts.
  FX.register('greaterinvis', {
    palette: ARCANE,
    travel: 240,
    beats: soft,
    end: () => 1290,
    ground(s) {
      buffGround(s, ARCANE);
    },
    air(s) {
      marks(s, ARCANE, 'invisibility', null, 24, 5);
      const e = s.c.t - k.CAST;
      if (e < 0 || e >= 900) return;
      const frame = Math.min(7, Math.floor(e / 110));
      const img = k.sprite(`b24:invisibility:${frame}`, 26, 38, ARCANE, set => {
        for (let y = 3; y < 35; y++)
          for (let x = 3; x < 23; x++) {
            const dx = x - 13;
            const head = Math.hypot(dx, y - 8) < 5;
            const body = y > 13 && y < 25 && Math.abs(dx) < 7;
            const legs = y >= 25 && y < 34 && Math.abs(dx) < 6 && Math.abs(dx) > 1;
            if (!(head || body || legs)) continue;
            // Clear whole pixel tiles; the underlying figure stays readable through the gaps.
            if ((Math.floor(x / 2) + Math.floor(y / 2)) % 2 === 0 || y < 3 + frame * 5) continue;
            set(x, y, Math.abs(dx) > 4 ? 3 : 4);
          }
      });
      recipients(s).forEach(t => {
        const p = foot(t);
        k.blit(img, p.x - 13, p.y - 34);
        if (e >= 540 && e < 850) ring({ x: p.x, y: p.y - 2 }, 12, 4, ARCANE, 4, 4, e / 130);
      });
    },
  });

  // Summon Aberration: an alien violet rift births a floating beholderkin with one vast eye and eyestalks.
  FX.register('summon-aberration', {
    palette: VOID,
    travel: 340,
    beats: arrival,
    end: () => 1590,
    ground(s) {
      portal(s, VOID);
      summonBody(s, 'beholder', VOID, true);
    },
    air(s) {
      const p = location(s);
      marks(s, MIND, 'aberration', { x: p.x, y: p.y - 18 }, 32, 8);
      const e = s.c.t - 640;
      if (e >= 0 && e < 500) ring({ x: p.x, y: p.y - 18 }, 17 + Math.floor(e / 70), 9, MIND, 3, 6, e / 100);
    },
  });

  // Summon Construct: squared stone blocks lock into a heavy golem, its chest rune sparking to life.
  FX.register('summon-construct', {
    palette: STONE,
    travel: 340,
    beats: arrival,
    end: () => 1590,
    ground(s) {
      portal(s, ARCANE);
      summonBody(s, 'construct', STONE);
      const e = s.c.t - k.CAST,
        p = location(s);
      if (e >= 0 && e < 340)
        for (let i = 0; i < 6; i++) {
          const side = i % 2 ? 1 : -1,
            q = k.ease(e / 340);
          speck(p.x + side * (26 - q * 17), p.y - 3 - i * 4, STONE, i % 2 ? 3 : 2, 4);
        }
    },
    air(s) {
      const p = location(s);
      marks(s, STONE, 'construct', p, 34, 9);
      const e = s.c.t - 640;
      if (e >= 0 && e < 640) speck(p.x + 1, p.y - 16, ARCANE, Math.floor(e / 100) % 2 ? 3 : 5, 2);
    },
  });

  // Summon Greater Demon: a blood-red summoning ring splits into an Abyssal rift and a horned brute.
  FX.register('summon-greater-demon', {
    palette: DEMON,
    travel: 340,
    beats: arrival,
    end: () => 1690,
    ground(s) {
      portal(s, DEMON, 22);
      const e = s.c.t - k.CAST,
        p = location(s);
      if (e >= 0 && e < 520) {
        const w = e < 340 ? 3 + Math.floor(e / 70) : 7;
        ring({ x: p.x, y: p.y - 18 }, w, 20, VOID, 2);
        stroke(
          [
            { x: p.x - 1, y: p.y - 36 },
            { x: p.x + 2, y: p.y - 20 },
            { x: p.x - 2, y: p.y - 3 },
          ],
          VOID,
          1,
          w,
          32,
        );
      }
      summonBody(s, 'demon', DEMON);
    },
    air(s) {
      const p = location(s);
      marks(s, DEMON, 'demon', { x: p.x, y: p.y - 10 }, 40, 11);
      const hit = s.hits[0],
        real = s.real(hit);
      if (real >= 0 && real < 360) k.shards({ x: p.x, y: p.y - 20 }, real, VOID, (s.event.seed || 0) + 41, 7, 24);
    },
  });

  function element(event) {
    if (event.element === 'frost' || event.element === 'water') return { ramp: WATER, name: 'wave' };
    if (event.element === 'nature' || event.element === 'earth' || event.element === 'contundente')
      return { ramp: STONE, name: 'construct' };
    if (event.element === 'air' || event.element === 'trueno' || event.element === 'lightning')
      return { ramp: AIR, name: 'wind' };
    return { ramp: FIRE, name: 'flame' };
  }

  // Summon Elemental: a whirling elemental spirit condenses, defaulting to a white-hot fire humanoid.
  FX.register('summon-elemental', {
    palette: event => element(event).ramp,
    travel: 340,
    beats: arrival,
    end: () => 1590,
    ground(s) {
      const el = element(s.event);
      portal(s, el.ramp, 20);
      summonBody(s, el.name, el.ramp, el.name === 'wind');
    },
    air(s) {
      const p = location(s),
        el = element(s.event),
        e = s.c.t - 640;
      marks(s, el.ramp, `elemental-${el.name}`, { x: p.x, y: p.y - 12 }, 34, 9);
      if (e < 0 || e >= 700) return;
      for (let i = 0; i < 5; i++) {
        const a = (i * k.tau) / 5 + e / 270;
        speck(p.x + Math.cos(a) * 17, p.y - 13 + Math.sin(a) * 9, el.ramp, 3 + (i % 2), 2);
      }
    },
  });

  // Raulothim's Psychic Lance: a translucent pink crystal spear impales the mind; broken thought-rings recoil.
  FX.register('raulothims-psychic-lance', {
    palette: MIND,
    travel: 260,
    beats: (event, kit, travel) => [
      { at: kit.CAST + travel, stop: 160, target: event.targets?.[0] ?? null, kind: 'beam', power: 0.07 },
    ],
    end: () => 1160,
    air(s) {
      const hit = s.hits[0],
        target = s.targets.find(t => t.id === hit.id) || s.targets[0];
      const aim = target || s.pose.target;
      if (!aim) return;
      const t = k.P(target ? k.contact(target, s.pose.hand || aim) : aim);
      if (s.pose.hand && s.c.t >= k.CAST && s.c.t < hit.at) {
        const h = k.P(s.pose.hand),
          q = (s.c.t - k.CAST) / 260;
        const dx = t.x - h.x,
          dy = t.y - h.y,
          angle = Math.atan2(dy, dx);
        for (let i = 7; i >= 1; i--) {
          const u = q - i * 0.035;
          if (u < 0) continue;
          speck(k.mix(h.x, t.x, u), k.mix(h.y, t.y, u) + (i % 2 ? 2 : -2), MIND, i < 3 ? 4 : 2);
        }
        k.blitRotated(art('lance', MIND), k.mix(h.x, t.x, q), k.mix(h.y, t.y, q), angle, 0.95);
      }
      marks(s, MIND, 'lance', t, 40, 10);
      const real = s.real(hit);
      if (real >= 0 && real < 500) {
        const r = 7 + k.ease(k.clamp(real / 450)) * 18;
        ring({ x: t.x, y: t.y - 4 }, r, r * 0.4, MIND, real < 90 ? 5 : 3, 5, real / 80);
        if (real < 300) ring({ x: t.x, y: t.y - 4 }, r * 0.6, r * 0.6, VOID, 3, 3, -real / 100);
      }
    },
  });

  // Freedom of Movement: cyan ribbons snap spectral shackles apart, leaving light unimpeded footsteps.
  FX.register('freedom-of-movement', {
    palette: AIR,
    travel: 240,
    beats: soft,
    end: () => 1350,
    ground(s) {
      buffGround(s, AIR);
      const e = s.c.t - 540;
      if (e < 0 || e >= 740) return;
      recipients(s).forEach(t => {
        const p = foot(t);
        for (let i = 0; i < 3; i++) {
          const q = k.clamp((e - i * 100) / 400);
          if (q <= 0 || q >= 1) continue;
          icon('foot', { x: p.x + (i % 2 ? -4 : 4), y: p.y + 4 - q * 18 }, AIR);
        }
      });
    },
    air(s) {
      marks(s, AIR, 'freedom', null, 28, 8);
      const e = s.c.t - k.CAST;
      if (e < 0 || e >= 960) return;
      recipients(s).forEach(t => {
        const p = foot(t),
          breakage = k.clamp((e - 240) / 260);
        if (e < 580)
          for (let i = -1; i <= 1; i += 2) {
            const x = p.x + i * (6 + k.ease(breakage) * 15),
              y = p.y - 3 + breakage * 7;
            ring({ x, y }, 4, 3, STONE, 3, breakage > 0 ? 2 : 0, i);
            if (breakage === 0)
              stroke(
                [
                  { x: p.x - 3, y: p.y - 3 },
                  { x: p.x + 3, y: p.y - 3 },
                ],
                STONE,
                2,
                1,
                5,
              );
          }
        if (e >= 240 && e < 850) {
          const turn = (e - 240) / 200;
          for (let i = 0; i < 3; i++) ring({ x: p.x, y: p.y - 4 - i * 8 }, 12, 4, AIR, 4, 3, turn + i);
        }
      });
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
