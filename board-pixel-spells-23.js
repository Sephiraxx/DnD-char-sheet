/* Pixel spells, batch 23 (see docs/pixel-spells/BRIEF.md). */
(function (root) {
  'use strict';
  const FX = root.BoardPixelFX;
  if (!FX) return;
  const k = FX.kit;
  const WATER = ['#0b1c30', '#153c62', '#237ba0', '#55bdd4', '#b9f3ef', '#ffffff'];
  const MIND = ['#230d2b', '#552458', '#a04499', '#e88bcf', '#ffe0eb', '#ffffff'];
  const GOLD = ['#281c24', '#735232', '#bd8b42', '#f0cb70', '#fff0bf', '#ffffff'];
  const FEY = ['#15271d', '#335442', '#669863', '#ade48a', '#f2f6bd', '#ffffff'];
  const FIRE = ['#2b1118', '#70242a', '#bc4322', '#f37c2c', '#ffd06b', '#fff8df'];
  const EARTH = ['#251e1b', '#514338', '#8b7250', '#c0a271', '#e8d8b0', '#fff7e1'];
  const WIND = ['#152335', '#3b5674', '#7ba8ba', '#b6dfdf', '#eaf9f4', '#ffffff'];
  const FORCE = ['#17132f', '#3a3775', '#7475bd', '#b9c9f3', '#ecf7ff', '#ffffff'];
  const VOID = ['#100c22', '#292047', '#5e3e8e', '#a77ada', '#e4c5fa', '#ffffff'];
  const STORM = ['#131b30', '#2b3651', '#495e7c', '#839cba', '#c3dcf1', '#ffffff'];
  const BOLT = ['#151b35', '#304a88', '#5f9fe1', '#a2e5ff', '#effcff', '#ffffff'];
  const ACID = ['#17200a', '#3c5918', '#7ca62a', '#c8e842', '#f2ffb1', '#ffffff'];
  const VINE = ['#16210e', '#35501d', '#648632', '#a3c95c', '#dcf2a0', '#fff9d9'];

  const ICONS = {
    question: ['.333.', '34443', '43.43', '...43', '..43.', '..4..', '.....', '..4..'],
    eye: ['...33333...', '.334444433.', '34442224443', '.334254433.', '...33333...'],
    shield: [
      '.444444444.',
      '4333333334',
      '4324444234',
      '4323443234',
      '4322442234',
      '4323443234',
      '.43444434.',
      '..433334..',
      '...4334...',
      '....44....',
    ],
    skull: ['.22222.', '2343432', '2323232', '.22322.', '..222..', '..2.2..'],
    leaf: ['....33', '..3443', '.3443.', '3443..', '.43...', '3.....'],
    flame: [
      '.....4.....',
      '....34.....',
      '...234.3...',
      '..234433...',
      '.23344332..',
      '2334444332.',
      '.23455432..',
      '..234432...',
      '...2332....',
    ],
    mephit: [
      '3....3....3',
      '33..232..33',
      '343.252.343',
      '34422322443',
      '.333343333.',
      '..2333332..',
      '...23332...',
      '...32.23...',
      '..32...23..',
    ],
    droplet: [
      '.....3.....',
      '....343....',
      '...34443...',
      '..3444432..',
      '.344444332.',
      '34454443332',
      '34424424332',
      '.344443332.',
      '..3333332..',
      '...33.33...',
    ],
    rock: [
      '...33333...',
      '..3444432..',
      '.344244232.',
      '..3444432..',
      '23333333332',
      '34234443243',
      '32.34443.23',
      '...32.23...',
      '..332.233..',
    ],
    sylph: [
      '....4444...',
      '..34444432.',
      '.34.....23.',
      '..3333332..',
      '.344244243.',
      '..3333332..',
      '...34432...',
      '..334432...',
      '....343....',
      '.....3.....',
    ],
    pixie: [
      '44...3...44',
      '454.343.454',
      '.454343454.',
      '..4433344..',
      '.443343344.',
      '454.343.454',
      '44..333..44',
      '....3.3....',
      '...3...3...',
    ],
    dryad: [
      '.3..3..3.',
      '..3.3.3..',
      '...343...',
      '...454...',
      '..33433..',
      '.3.343.3.',
      '..34443..',
      '.3444443.',
      '...3.3...',
      '..3...3..',
    ],
    pegasus: [
      '.............4...................',
      '............443..................',
      '...........4543..................',
      '..........45543.............4....',
      '.........455443..........44443...',
      '........455443.........34455443..',
      '.......4554443........3445444443..',
      '......45544443.......34445444443..',
      '.....455444443.......344444443....',
      '....455444443........344443.......',
      '...344444443........344443........',
      '..34444444333333333344443.........',
      '.344444444444444444444443.........',
      '3444434444444444444444443.........',
      '.333..344444444444444443..........',
      '.......344444444444443...........',
      '........3344333334433............',
      '........3443....3443.............',
      '........343......343.............',
      '.......343........343............',
      '.......333........333............',
    ],
  };

  function icon(name, p, ramp, frame = 0) {
    const rows = ICONS[name];
    const w = Math.max(...rows.map(row => row.length)) + 4;
    const h = rows.length + 4;
    const img = k.sprite(`b23:icon:${name}:${frame}:${ramp.join('')}`, w, h, ramp, set => {
      rows.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
          if (row[x] === '.') continue;
          // A second wing pose closes the long feathers without changing the horse's body.
          if (name === 'pegasus' && frame && y < 11 && x < 21 && y < 5) continue;
          set(x + 2, y + 2, +row[x]);
        }
      });
    });
    k.blit(img, p.x - w / 2, p.y - h / 2);
  }

  function speck(x, y, ramp, index = 4, size = 1) {
    k.dot(x, y, ramp[0], size + 2);
    k.dot(x, y, ramp[index], size);
  }

  // Cache the raster of large rings; even a 20 ft sphere costs only a blit per ring.
  function ring(p, rx, ry, ramp, index = 3, gaps = 0, phase = 0, half = 0) {
    rx = Math.max(2, Math.round(rx));
    ry = Math.max(2, Math.round(ry));
    phase = Math.floor(phase) % 8;
    const w = rx * 2 + 8,
      h = ry * 2 + 8;
    const img = k.sprite(`b23:ring:${rx}:${ry}:${index}:${gaps}:${phase}:${half}:${ramp.join('')}`, w, h, ramp, set => {
      for (let y = 2; y < h - 2; y++)
        for (let x = 2; x < w - 2; x++) {
          if (half && (half > 0 ? y < h / 2 : y >= h / 2)) continue;
          const dx = (x - w / 2) / rx,
            dy = (y - h / 2) / ry;
          if (Math.abs(Math.hypot(dx, dy) - 1) * Math.min(rx, ry) > 0.7) continue;
          if (gaps && Math.floor((Math.atan2(dy, dx) / k.tau + 1) * gaps * 2 + phase) % 2) continue;
          set(x, y, index);
        }
    });
    k.blit(img, p.x - w / 2, p.y - h / 2);
  }

  function stroke(points, ramp, index = 3, width = 1, budget = 72) {
    const count = Math.max(1, points.length - 1);
    for (let pass = 0; pass < 2; pass++)
      for (let j = 1; j < points.length; j++) {
        const a = points[j - 1],
          b = points[j];
        const length = Math.hypot(b.x - a.x, b.y - a.y);
        const n = Math.max(1, Math.min(Math.floor(budget / count), Math.ceil(length)));
        const size = Math.max(width, Math.ceil(length / n));
        for (let i = 0; i <= n; i++)
          k.dot(k.mix(a.x, b.x, i / n), k.mix(a.y, b.y, i / n), ramp[pass ? index : 0], size + (pass ? 0 : 2));
      }
  }

  function centre(s) {
    if (s.area) {
      if (s.area.kind === 'circle' || s.area.kind === 'cylinder') return s.area;
      const half = (s.area.feet || 20) / (s.grid.feet || 5) / 2;
      return { x: s.area.x + Math.cos(s.area.dir || 0) * half, y: s.area.y + Math.sin(s.area.dir || 0) * half };
    }
    return s.pose.target || s.targets[0] || s.pose.base || s.pose.hand || { x: 0, y: 0 };
  }

  function radius(s, feet) {
    return ((s.area?.feet || feet) / (s.grid.feet || 5)) * 16;
  }

  function recipients(s) {
    return s.targets.length ? s.targets.slice(0, 8) : [s.pose.base || centre(s)];
  }

  function foot(t) {
    return k.P({ x: t.baseX ?? t.x, y: t.baseY ?? t.y });
  }

  function beat(event, kit, travel, kind = 'soft', stop = 80, power = 0.04) {
    return (event.targets?.length ? event.targets : [null]).map(target => ({
      at: kit.CAST + travel,
      stop,
      target,
      kind,
      power: target ? power : 0,
    }));
  }

  function marks(s, ramp, key, size = 26, count = 6, offset = 0, voidCore = false) {
    s.hits.slice(offset, offset + 8).forEach((hit, i) => {
      const t = s.targets.find(t => t.id === hit.id);
      const p = k.P(t || centre(s));
      const e = s.real(hit);
      k.drawHit(k.hitStyle(`b23:${key}`, ramp, { S: size, spikes: 5, jag: 0.3, void: voidCore }), p, e);
      k.shards(p, e, ramp, (s.event.seed || 0) + 17 * i, count, size * 0.65);
    });
  }

  function portal(p, ramp, t, r = 14) {
    ring(p, r, r * 0.46, ramp, 3);
    ring(p, r * 0.66, r * 0.3, ramp, 4, 4, t / 95);
    for (let i = 0; i < 4; i++) {
      const a = (i * k.tau) / 4 + t / 700;
      speck(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r * 0.46, ramp, 4);
    }
  }

  function missile(s, ramp, arrive, destination, arc = 7) {
    if (!s.pose.hand || s.c.t < k.CAST || s.c.t >= arrive) return;
    const H = k.P(s.pose.hand),
      T = destination || k.P(centre(s));
    const q = (s.c.t - k.CAST) / (arrive - k.CAST);
    const at = u => ({ x: k.mix(H.x, T.x, u), y: k.mix(H.y, T.y, u) - Math.sin(u * Math.PI) * arc });
    for (let i = 7; i >= 1; i--) {
      if (q - i * 0.04 < 0) continue;
      const p = at(q - i * 0.04);
      speck(p.x, p.y, ramp, i < 3 ? 4 : 2, i < 3 ? 2 : 1);
    }
    const p = at(q);
    k.disc(p.x, p.y, 5, ramp[0]);
    k.disc(p.x, p.y, 4, ramp[3]);
    k.disc(p.x - 1, p.y - 1, 2, ramp[5]);
  }

  // Filled area art is cached in discrete frames, with bands and transparent cutouts.
  function field(p, R, ramp, type, frame) {
    R = Math.max(6, Math.round(R));
    frame = Math.max(0, Math.min(11, frame | 0));
    const w = R * 2 + 8;
    const img = k.sprite(`b23:field:${type}:${R}:${frame}:${ramp.join('')}`, w, w, ramp, set => {
      for (let y = 2; y < w - 2; y++)
        for (let x = 2; x < w - 2; x++) {
          const dx = x - w / 2,
            dy = y - w / 2,
            d = Math.hypot(dx, dy) / R,
            a = Math.atan2(dy, dx);
          if (d > 1) continue;
          if (type === 'mind') {
            const ribbon = Math.sin(a * 3 + d * 13 - frame * 0.8);
            if (d < 0.13 || ribbon < 0.53 || (frame > 8 && d < 0.68)) continue;
            set(x, y, ribbon > 0.93 ? 3 : d > 0.85 ? 1 : 2);
          } else if (type === 'storm') {
            if (frame > 8 && d < (frame - 8) * 0.22) continue;
            const band = Math.sin(a * 4 + d * 15 - frame * 0.85);
            set(x, y, d > 0.94 ? 2 : band > 0.82 ? 3 : band > 0.4 ? 2 : 1);
          } else if (type === 'acid') {
            if (d > 0.91 + 0.065 * Math.sin(a * 9 + frame * 0.5)) continue;
            if (frame > 8 && d > 0.85 - (frame - 8) * 0.13) continue;
            const band = Math.sin(d * 22 - frame * 1.2 + Math.sin(a * 5));
            set(x, y, d > 0.8 ? 2 : band > 0.85 ? 4 : band > -0.2 ? 3 : 2);
          } else if (type === 'water') {
            const band = Math.sin(dy * 0.45 + Math.sin(dx * 0.21 + frame) * 1.8 - frame);
            set(x, y, d > 0.88 ? 2 : band > 0.88 ? 4 : dx + dy < -R * 0.3 ? 3 : 2);
          } else if (type === 'force') {
            if (d < 0.84 && !(dx < -R * 0.35 && dy < -R * 0.2 && d > 0.65)) continue;
            set(x, y, d > 0.97 ? 2 : dx + dy < 0 ? 4 : 3);
          }
        }
    });
    k.blit(img, p.x - w / 2, p.y - w / 2);
  }

  function summonGround(s, ramps, offsets) {
    const e = s.c.t - k.CAST;
    if (e < 0 || e > 1100) return;
    const C = k.P(centre(s));
    offsets.forEach((v, i) => {
      const p = { x: C.x + v[0], y: C.y + v[1] };
      if (e < 850) portal(p, ramps[i % ramps.length], e, 9);
      else ring(p, 10, 4, ramps[i % ramps.length], 2, 4, i);
    });
  }

  // Confusion: mauve spirals spread over the 10 ft circle; crooked questions orbit bewildered heads.
  FX.register('confusion', {
    palette: MIND,
    travel: 230,
    beats: (event, kit, travel) => beat(event, kit, travel, 'soft', 85),
    end: () => 1510,
    ground(s) {
      const e = s.c.t - 530;
      if (e < 0 || e > 940) return;
      const C = k.P(centre(s)),
        R = radius(s, 10);
      field(C, R, MIND, 'mind', Math.floor(e / 85));
      ring(C, R, R, MIND, e < 160 ? 4 : 2, 8, e / 130);
    },
    air(s) {
      missile(s, MIND, 530);
      marks(s, MIND, 'confusion', 24, 4);
      const e = s.c.t - 530;
      if (e < 0 || e > 900) return;
      recipients(s).forEach((t, i) => {
        const p = k.P(t);
        const turn = e / 190 + i * 1.7;
        ring({ x: p.x, y: p.y - 12 }, 10, 4, MIND, 3, 3, turn);
        icon('question', { x: p.x + Math.cos(turn) * 9, y: p.y - 16 + Math.sin(turn) * 3 }, GOLD);
        speck(p.x - Math.cos(turn) * 10, p.y - 12 - Math.sin(turn) * 4, MIND, 4);
      });
    },
  });

  // Conjure Minor Elementals: four small portals pop into fiery, watery, rocky and airy mephit forms.
  FX.register('conjure-minor-elementals', {
    palette: WIND,
    travel: 310,
    beats: (event, kit, travel) => [{ at: kit.CAST + travel, stop: 100, target: null, kind: 'soft', power: 0 }],
    end: () => 1490,
    ground(s) {
      summonGround(
        s,
        [FIRE, WATER, EARTH, WIND],
        [
          [-15, -8],
          [15, -8],
          [-15, 12],
          [15, 12],
        ],
      );
    },
    air(s) {
      const hit = s.hits[0],
        e = s.real(hit);
      const C = k.P(centre(s));
      if (e < 0 || s.c.t > 1480) return;
      const ramps = [FIRE, WATER, EARTH, WIND],
        shapes = ['mephit', 'droplet', 'rock', 'sylph'];
      [
        [-15, -8],
        [15, -8],
        [-15, 12],
        [15, 12],
      ].forEach((v, i) => {
        const p = { x: C.x + v[0], y: C.y + v[1] - 7 };
        k.drawHit(k.hitStyle(`b23:minor:${i}`, ramps[i], { S: 21, spikes: 4 }), p, e);
        k.shards(p, e, ramps[i], (s.event.seed || 0) + i * 7, 5, 12);
        const rise = Math.sin(k.clamp((s.c.t - 610) / 360) * Math.PI) * 6;
        icon(shapes[i], { x: p.x, y: p.y - rise + (i === 3 ? Math.sin(s.c.t / 90) * 2 : 0) }, ramps[i]);
      });
    },
  });

  // Conjure Woodland Beings: leaf-ring doorways release fluttering pixies around an antlered dryad.
  FX.register('conjure-woodland-beings', {
    palette: FEY,
    travel: 300,
    beats: (event, kit, travel) => [{ at: kit.CAST + travel, stop: 85, target: null, kind: 'soft', power: 0 }],
    end: () => 1510,
    ground(s) {
      summonGround(
        s,
        [FEY],
        [
          [-16, 5],
          [0, -7],
          [16, 5],
        ],
      );
    },
    air(s) {
      const hit = s.hits[0],
        e = s.real(hit),
        C = k.P(centre(s));
      if (e < 0 || s.c.t > 1500) return;
      [
        [-16, 5],
        [0, -7],
        [16, 5],
      ].forEach((v, i) => {
        const p = { x: C.x + v[0], y: C.y + v[1] - 9 };
        k.drawHit(k.hitStyle('b23:woodland', FEY, { S: 24, spikes: 4 }), p, e);
        k.shards(p, e, FEY, (s.event.seed || 0) + i, 4, 14);
        icon(i === 1 ? 'dryad' : 'pixie', { x: p.x, y: p.y + (i === 1 ? 0 : Math.sin(s.c.t / 85 + i) * 3) }, FEY);
      });
      if (e < 500)
        for (let i = 0; i < 6; i++) {
          const a = (i * k.tau) / 6 + e / 220;
          icon('leaf', { x: C.x + Math.cos(a) * (12 + e / 45), y: C.y + Math.sin(a) * 13 - e / 45 }, FEY);
        }
    },
  });

  // Control Water: a square flood rises into two curling banks, opening a dry channel through the cube.
  FX.register('control-water', {
    palette: WATER,
    travel: 300,
    beats: (event, kit, travel) => beat(event, kit, travel, 'soft', 100),
    end: () => 1740,
    reach: (event, grid) => ({ r: ((event.area?.feet || 100) / (grid.feet || 5)) * 1.6 + 1, up: 1 }),
    ground(s) {
      const e = s.c.t - k.CAST;
      if (e < 0 || e > 1400) return;
      const side = ((s.area?.feet || 20) / (s.grid.feet || 5)) * 16;
      const dir = s.area?.dir || 0,
        dx = Math.cos(dir),
        dy = Math.sin(dir);
      const C = k.P(centre(s));
      const frame = Math.min(11, Math.floor(e / 110));
      const size = Math.ceil(side * (Math.abs(dx) + Math.abs(dy))) + 14;
      const img = k.sprite(`b23:water-cube:${side}:${dir.toFixed(4)}:${frame}`, size, size, WATER, set => {
        const gap = frame < 3 ? 0 : Math.min(0.22, (frame - 2) * 0.055) * side;
        for (let y = 2; y < size - 2; y++)
          for (let x = 2; x < size - 2; x++) {
            const px = x - size / 2,
              py = y - size / 2;
            const along = px * dx + py * dy,
              across = -px * dy + py * dx;
            if (Math.abs(along) > side / 2 || Math.abs(across) > side / 2) continue;
            const bank = gap + Math.sin(along / 9 + frame * 0.7) * (gap ? 2 : 0);
            if (gap && Math.abs(across) < bank) continue;
            if (frame > 9 && Math.abs(across) < (frame - 8) * side * 0.11) continue;
            const crest = Math.sin(across / 5 - frame + Math.sin(along / 12));
            set(x, y, gap && Math.abs(across) < bank + 3 ? 4 : crest > 0.88 ? 3 : crest > 0 ? 2 : 1);
          }
      });
      k.blit(img, C.x - size / 2, C.y - size / 2);
    },
    air(s) {
      marks(s, WATER, 'control-water', 26, 5);
      const hit = s.hits[0],
        e = s.real(hit);
      if (e < 0 || e > 480) return;
      const C = k.P(centre(s)),
        R = radius(s, 20) * 0.45;
      for (let i = 0; i < 12; i++) {
        const a = k.hash(i, s.event.seed || 0) * k.tau;
        const q = e / 480;
        speck(C.x + Math.cos(a) * R * (0.5 + q), C.y + Math.sin(a) * R - Math.sin(q * Math.PI) * 13, WATER, 4, 2);
      }
    },
  });

  // Banishment: a violet planar iris cages the target, folds inward, and snaps into a four-point rift.
  FX.register('banishment', {
    palette: VOID,
    travel: 310,
    beats: (event, kit, travel) => beat(event, kit, travel, 'soft', 125),
    end: () => 1340,
    ground(s) {
      const e = s.c.t - k.CAST;
      if (e < 0 || e > 1000) return;
      recipients(s).forEach(t => {
        const p = foot(t);
        const r = e < 310 ? 13 : Math.max(3, 13 * (1 - k.clamp((e - 520) / 350)));
        ring(p, r, r * 0.45, VOID, 3, e > 700 ? 4 : 0);
      });
    },
    air(s) {
      const e = s.c.t - k.CAST;
      if (e < 0 || e > 1000) return;
      recipients(s).forEach((t, i) => {
        const p = k.P(t),
          hit = s.hits.find(h => h.id === t.id) || s.hits[0],
          real = s.real(hit);
        const close = k.clamp((e - 310) / 400);
        const rx = e < 310 ? 5 + 9 * k.ease(e / 310) : Math.max(1, 14 * (1 - k.ease(close)));
        if (e < 760) {
          ring(p, rx, 21 - close * 15, VOID, 3);
          ring(p, rx * 0.7, 18 - close * 13, VOID, 4, 5, e / 100);
          if (e >= 310)
            stroke(
              [
                { x: p.x, y: p.y - 17 * (1 - close) },
                { x: p.x, y: p.y + 17 * (1 - close) },
              ],
              VOID,
              1,
              3,
              28,
            );
        }
        k.drawHit(k.hitStyle('b23:banishment', VOID, { S: 35, spikes: 4, jag: 0.1, void: true }), p, real);
        k.shards(p, real, VOID, (s.event.seed || 0) + i * 9, 7, 21);
        if (e > 720 && e < 900) speck(p.x, p.y, VOID, 5, 2);
      });
    },
  });

  // Dominate Beast: a magenta thought-thread reaches the beast; an eye and a closed psychic collar latch on.
  FX.register('dominate-beast', {
    palette: MIND,
    travel: 270,
    beats: (event, kit, travel) => beat(event, kit, travel, 'soft', 85),
    end: () => 1270,
    ground(s) {
      const e = s.c.t - 570;
      if (e < 0 || e > 650) return;
      recipients(s).forEach(t => ring(foot(t), 11, 5, MIND, 2, 4, e / 130));
    },
    air(s) {
      const e = s.c.t - k.CAST;
      if (e < 0 || e > 940) return;
      marks(s, MIND, 'dominate-beast', 23, 4);
      recipients(s).forEach(t => {
        const T = k.P(t);
        if (s.pose.hand && e < 530) {
          const H = k.P(s.pose.hand),
            q = k.clamp(e / 270);
          const points = Array.from({ length: 9 }, (_, i) => {
            const u = (i / 8) * q;
            return { x: k.mix(H.x, T.x, u), y: k.mix(H.y, T.y - 9, u) + Math.sin(u * Math.PI * 4 - e / 55) * 3 };
          });
          stroke(points, MIND, e < 270 ? 3 : 2, 1, Math.min(64, Math.floor(144 / recipients(s).length)));
        }
        if (e >= 270) {
          icon('eye', { x: T.x, y: T.y - 17 }, MIND);
          ring({ x: T.x, y: T.y - 4 }, 9, 4, MIND, 3);
          speck(T.x, T.y, MIND, 4, 2);
        }
      });
    },
  });

  // Find Greater Steed: a celestial horseshoe gate opens and a pearl-white pegasus lands with spreading wings.
  FX.register('find-greater-steed', {
    palette: GOLD,
    travel: 370,
    beats: (event, kit, travel) => [{ at: kit.CAST + travel, stop: 120, target: null, kind: 'soft', power: 0 }],
    end: () => 1590,
    ground(s) {
      const e = s.c.t - k.CAST;
      if (e < 0 || e > 1250) return;
      const C = k.P(centre(s));
      if (e < 850) portal(C, GOLD, e, 21);
      else ring(C, 19, 6, GOLD, 2, 4);
      if (e >= 370 && e < 660) ring(C, 19 + (e - 370) / 18, 7 + (e - 370) / 36, WIND, 3, 8);
    },
    air(s) {
      const C = k.P(centre(s)),
        hit = s.hits[0],
        real = s.real(hit),
        e = s.c.t - 670;
      if (s.c.t >= k.CAST && e < 0) ring({ x: C.x, y: C.y - 13 }, 16, 22, GOLD, 4, 3, s.c.t / 120);
      if (e < 0 || e > 900) return;
      k.drawHit(k.hitStyle('b23:greater-steed', GOLD, { S: 39, spikes: 4 }), { x: C.x, y: C.y - 5 }, real);
      k.shards(C, real, GOLD, s.event.seed || 0, 9, 25);
      const drop = e < 300 ? (1 - k.ease(e / 300)) * 10 : 0;
      icon('pegasus', { x: C.x, y: C.y - 11 - drop }, WIND, e < 250 ? 0 : 1);
      if (real < 460)
        for (let i = 0; i < 5; i++) {
          const a = k.hash(i, s.event.seed || 0) * k.tau;
          speck(C.x + Math.cos(a) * (14 + real / 40), C.y - 9 + Math.sin(a) * 14 + real / 50, GOLD, 4);
        }
    },
  });

  // Grasping Vine: a rooted green stalk sprouts at the chosen point, lashes out, and coils to drag its quarry.
  FX.register('grasping-vine', {
    palette: VINE,
    travel: 390,
    beats: (event, kit, travel) => beat(event, kit, travel, 'pull', 100, 0.055),
    end: () => 1450,
    ground(s) {
      const e = s.c.t - k.CAST;
      if (e < 0 || e > 1100) return;
      const C = k.P(centre(s));
      portal(C, VINE, e, 11);
      for (let i = 0; i < 4; i++) {
        const a = (i * k.tau) / 4 + 0.4;
        stroke([C, { x: C.x + Math.cos(a) * 13, y: C.y + Math.sin(a) * 7 }], VINE, 2, 2, 7);
      }
    },
    air(s) {
      const e = s.c.t - k.CAST;
      if (e < 0 || e > 1100) return;
      const C = k.P(centre(s)),
        t = s.targets[0],
        T = k.P(t || centre(s));
      const aim = { x: T.x, y: T.y - 1 };
      const tip =
        e < 180
          ? { x: C.x + Math.sin(e / 60) * 4, y: C.y - k.ease(e / 180) * 22 }
          : {
              x: k.mix(C.x, aim.x, k.ease(k.clamp((e - 180) / 210))),
              y: k.mix(C.y - 22, aim.y, k.ease(k.clamp((e - 180) / 210))),
            };
      const points = Array.from({ length: 17 }, (_, i) => {
        const q = i / 16;
        const curl = Math.sin(q * Math.PI * 3 - e / 85) * Math.sin(q * Math.PI) * (e < 390 ? 5 : 2);
        return { x: k.mix(C.x, tip.x, q) + curl, y: k.mix(C.y, tip.y, q) - Math.sin(q * Math.PI) * 10 };
      });
      stroke(points, VINE, 2, 3, 64);
      for (let i = 3; i < points.length; i += 4) {
        const p = points[i];
        icon('leaf', { x: p.x + (i % 2 ? 4 : -4), y: p.y - 2 }, VINE);
      }
      if (e >= 390) {
        ring(aim, 9, 5, VINE, 3);
        ring({ x: aim.x, y: aim.y + 5 }, 8, 4, VINE, 2);
      }
      marks(s, VINE, 'grasping-vine', 27, 7);
    },
  });

  // Fire Shield: a hollow wreath of orange flame (or icy blue chill flames) wraps the protected figure.
  FX.register('fire-shield', {
    palette: event => (/cold|frost|fr[ií]o|chill/.test(String(event.element || '')) ? WATER : FIRE),
    travel: 150,
    beats: (event, kit, travel) => beat(event, kit, travel, 'soft', 80),
    end: () => 1260,
    ground(s) {
      const e = s.c.t - 450;
      if (e < 0 || e > 770) return;
      recipients(s).forEach(t => ring(foot(t), 13, 6, s.ramp, 3, 8, e / 100));
    },
    air(s) {
      const e = s.c.t - 450;
      if (e < 0 || e > 770) return;
      marks(s, s.ramp, 'fire-shield-' + s.ramp[3], 25, 5);
      recipients(s).forEach(t => {
        const p = k.P(t);
        ring(p, 13, 17, s.ramp, 2, 8, e / 80);
        for (let i = 0; i < 6; i++) {
          const a = (i * k.tau) / 6 + Math.floor(e / 100) * 0.35;
          // The middle remains empty so the ward never paints over the figure's face.
          icon('flame', { x: p.x + Math.cos(a) * 13, y: p.y + Math.sin(a) * 14 }, s.ramp);
        }
      });
    },
  });

  // Watery Sphere: a blue bead swells into a rolling 5 ft water globe with a foamy equator and trapped bubbles.
  FX.register('watery-sphere', {
    palette: WATER,
    travel: 300,
    beats: (event, kit, travel) => beat(event, kit, travel, 'soft', 110),
    end: () => 1510,
    ground(s) {
      const e = s.c.t - 600;
      if (e < 0 || e > 860) return;
      const C = k.P(centre(s)),
        R = radius(s, 5);
      const grow = 0.4 + 0.6 * k.back(k.clamp(e / 200));
      field(C, R * grow, WATER, 'water', Math.floor(e / 90) % 8);
      ring({ x: C.x, y: C.y + R * 0.65 }, R, R * 0.3, WATER, 3, 5, e / 110);
    },
    air(s) {
      missile(s, WATER, 600);
      marks(s, WATER, 'watery-sphere', 29, 8);
      const e = s.c.t - 600;
      if (e < 0 || e > 860) return;
      const C = k.P(centre(s)),
        R = radius(s, 5);
      ring(C, R, R, WATER, 3, 5, e / 160);
      ring(C, R, R * 0.3, WATER, 4, 0, 0, 1);
      for (let i = 0; i < 4; i++) {
        const q = (e / 650 + i / 4) % 1;
        const x = C.x + Math.sin(i * 3.2 + q * 2) * R * 0.6;
        ring({ x, y: C.y + R * (0.7 - q * 1.4) }, 2, 2, WATER, 4);
      }
    },
  });

  // Otiluke's Resilient Sphere: a pearl-blue elastic shell snaps around its occupant and rebounds without breaking.
  FX.register('otilukes-resilient-sphere', {
    palette: FORCE,
    travel: 190,
    beats: (event, kit, travel) => beat(event, kit, travel, 'soft', 95),
    end: () => 1270,
    ground(s) {
      const e = s.c.t - 490;
      if (e < 0 || e > 730) return;
      recipients(s).forEach(t => {
        const p = k.P(t),
          R = Math.max(13, (t.span || 1) * 11);
        field(p, R + 2, FORCE, 'force', 0);
        ring(foot(t), R, R * 0.35, FORCE, 2);
      });
    },
    air(s) {
      marks(s, FORCE, 'resilient-sphere', 25, 5);
      const e = s.c.t - 490;
      if (e < 0 || e > 730) return;
      recipients(s).forEach(t => {
        const p = k.P(t),
          R = Math.max(13, (t.span || 1) * 11);
        const wobble = e < 380 ? Math.sin(e / 38) * 0.16 * (1 - e / 380) : 0;
        ring(p, R * (1 + wobble), (R + 3) * (1 - wobble), FORCE, 3);
        ring(p, R, 4, FORCE, 4, 0, 0, 1);
        ring(p, 4, R + 3, FORCE, 2, 6, 0, 1);
        speck(p.x - R * 0.5, p.y - R * 0.65, FORCE, 5, 2);
      });
    },
  });

  // Storm Sphere: a slate-grey 20 ft wind globe slams outward, then a blue-white bolt cracks out of its heart.
  FX.register('storm-sphere', {
    palette: STORM,
    travel: 300,
    beats(event, kit, travel) {
      return [
        ...beat(event, kit, travel, 'blast', 120, 0.075),
        { at: 1010, stop: 95, target: event.targets?.[0] ?? null, kind: 'beam', power: 0.07 },
      ];
    },
    end: () => 1720,
    flash: (event, e) =>
      e < 28 ? { color: '#e7f6ff', alpha: 0.16 } : e < 58 ? { color: '#111b30', alpha: 0.13 } : null,
    ground(s) {
      const e = s.c.t - 600;
      if (e < 0 || e > 1080) return;
      const C = k.P(centre(s)),
        R = radius(s, 20);
      field(C, R * (0.5 + 0.5 * k.ease(k.clamp(e / 170))), STORM, 'storm', Math.floor(e / 90));
      ring(C, R, R, WIND, 2, 8, e / 95);
      if (e < 300) ring(C, R * (0.35 + e / 450), R * (0.35 + e / 450), WIND, 3, 8, e / 90);
    },
    air(s) {
      const e = s.c.t - 600;
      marks({ ...s, hits: s.hits.filter(h => h.at === 600) }, WIND, 'storm-wind', 30, 6);
      const hit = s.hits[s.hits.length - 1],
        real = s.real(hit),
        C = k.P(centre(s)),
        R = radius(s, 20);
      if (e >= 0 && e < 850) {
        for (let i = 0; i < 8; i++) {
          const a = (i * k.tau) / 8 - s.c.t / 150;
          const p = { x: C.x + Math.cos(a) * R * 0.8, y: C.y + Math.sin(a) * R * 0.65 };
          speck(p.x, p.y, EARTH, 3, 2);
        }
      }
      if (real < 0 || real > 360) return;
      const t = s.targets.find(t => t.id === hit.id),
        T = k.P(t || centre(s));
      if (real < 190) {
        const start = { x: C.x, y: C.y - R * 0.7 };
        const tick = Math.floor(real / 36);
        const points = Array.from({ length: 7 }, (_, i) => {
          const q = i / 6;
          const off = i && i < 6 ? (k.hash(i, tick, s.event.seed || 0) - 0.5) * 14 : 0;
          return { x: k.mix(start.x, T.x, q) + off, y: k.mix(start.y, T.y, q) };
        });
        stroke(points, BOLT, real < 65 ? 5 : 3, 2, 80);
      }
      k.drawHit(k.hitStyle('b23:storm-bolt', BOLT, { S: 34, spikes: 7, jag: 0.4 }), T, real);
      k.shards(T, real, BOLT, s.event.seed || 0, 8, 24);
    },
  });

  // Vitriolic Sphere: a sizzling chartreuse globe bursts across 20 ft, splashes acid, then bites again in a caustic fizz.
  FX.register('vitriolic-sphere', {
    palette: ACID,
    travel: 380,
    beats(event, kit, travel) {
      return [...beat(event, kit, travel, 'blast', 140, 0.085), ...beat(event, kit, 890, 'hit', 65, 0.04)];
    },
    end: () => 1910,
    flash: (event, e) =>
      e < 30 ? { color: '#f3ffba', alpha: 0.23 } : e < 65 ? { color: '#172009', alpha: 0.18 } : null,
    ground(s) {
      const e = s.c.t - 680;
      if (e < 0 || e > 1180) return;
      const C = k.P(centre(s)),
        R = radius(s, 20);
      if (e < 90) {
        field(C, R * (0.45 + e / 165), ACID, 'acid', 0);
        return;
      }
      field(C, R, ACID, 'acid', Math.floor(e / 100));
      if (e < 400) ring(C, R * (0.5 + e / 700), R * (0.5 + e / 700), ACID, 4, 10, e / 80);
    },
    air(s) {
      missile(s, ACID, 680, null, 12);
      marks({ ...s, hits: s.hits.filter(h => h.at === 680) }, ACID, 'vitriol-impact', 35, 8);
      marks({ ...s, hits: s.hits.filter(h => h.at === 1190) }, ACID, 'vitriol-bite', 25, 5);
      const C = k.P(centre(s)),
        R = radius(s, 20),
        real = s.real(s.hits[0]);
      if (real >= 0 && real < 500) {
        const q = real / 500;
        for (let i = 0; i < 16; i++) {
          const a = k.hash(i, s.event.seed || 0, 4) * k.tau;
          const distance = R * (0.15 + k.ease(q) * (0.55 + k.hash(i, s.event.seed || 0) * 0.4));
          const x = C.x + Math.cos(a) * distance,
            y = C.y + Math.sin(a) * distance - Math.sin(q * Math.PI) * 19;
          speck(x, y, ACID, i % 3 ? 3 : 4, q < 0.6 ? 3 : 2);
        }
      }
      const e = s.c.t - 680;
      if (e < 240 || e > 1140) return;
      // Open bubbles and short rising wisps read as corrosive liquid, rather than poison fog.
      for (let i = 0; i < 9; i++) {
        const q = (e / 540 + k.hash(i, s.event.seed || 0)) % 1;
        const a = k.hash(i, s.event.seed || 0, 3) * k.tau;
        const d = R * (0.25 + k.hash(i, s.event.seed || 0, 7) * 0.6);
        const p = { x: C.x + Math.cos(a) * d, y: C.y + Math.sin(a) * d - q * 9 };
        if (q < 0.65) ring(p, 2 + q * 3, 2 + q * 2, ACID, 4);
        else speck(p.x + Math.sin(q * 8) * 2, p.y - 3, ACID, 2, 1);
      }
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
