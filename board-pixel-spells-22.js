/* Pixel spells, batch 22 (see docs/pixel-spells/BRIEF.md). */
(function (root) {
  'use strict';
  const FX = root.BoardPixelFX;
  if (!FX) return;
  const k = FX.kit;
  const ABYSS = ['#160c20', '#43172e', '#832d50', '#d65b80', '#ffc0ce', '#fff1df'];
  const EARTH = ['#21180f', '#503723', '#876044', '#ba8a5b', '#e2c294', '#fff0cb'];
  const NECRO = ['#130b1c', '#35203e', '#673752', '#af566d', '#edb5c5', '#fff2eb'];
  const ICE = ['#101d30', '#2d4564', '#577e9c', '#99cbdc', '#dbf2f4', '#ffffff'];
  const LIFE = ['#13251c', '#315e38', '#5da965', '#b4df87', '#fff0b6', '#ffffff'];
  const WIND = ['#172337', '#3e597d', '#739fb6', '#b6e3e6', '#edfaff', '#ffffff'];
  const FIRE = ['#290f13', '#712325', '#bd3f21', '#f27e24', '#ffc65b', '#fff4ce'];
  const GOLD = ['#271b31', '#65436b', '#a67b7f', '#dfb76d', '#fff0b6', '#ffffff'];
  const NIGHT = ['#100b1c', '#29203f', '#58406c', '#ac65a7', '#efb3db', '#fff0fa'];
  const PURE = ['#19253a', '#435b80', '#83adc2', '#cee5df', '#fff4d1', '#ffffff'];
  const MIND = ['#24102c', '#5c285e', '#a74e99', '#ec98d2', '#ffe2ed', '#ffffff'];
  const ARCANE = ['#15122f', '#3b3472', '#7765ad', '#baace2', '#ece5ff', '#ffffff'];

  const ICONS = {
    demon: [
      '.2.........2.',
      '.23.......32.',
      '..233...332..',
      '...2333332...',
      '...2452542...',
      '....22222....',
      '..222333222..',
      '.23.23332.32.',
      '23..23332..32',
      '2...23332...2',
      '....22.22....',
      '...22...22...',
      '..33.....33..',
    ],
    claw: [
      '..4..4..4....',
      '..34.34.34...',
      '..234234234..',
      '...234234234.',
      '....23333332.',
      '..4323333332.',
      '...43233332..',
      '....432332...',
      '.....2332....',
    ],
    feather: [
      '........4..',
      '......344..',
      '....34434..',
      '..344334...',
      '.343334....',
      '.43334.....',
      '..334......',
      '.34........',
      '4..........',
    ],
    heart: ['.33...33.', '3443.3443', '345434543', '344444443', '.3444443.', '..34443..', '...343...', '....3....'],
    eye: [
      '....33333....',
      '..334444433..',
      '.34442224443.',
      '3444225224443',
      '.34442224443.',
      '..334444433..',
      '....33333....',
    ],
    star: [
      '....4....',
      '....4....',
      '...343...',
      '..34543..',
      '444555444',
      '..34543..',
      '...343...',
      '....4....',
      '....4....',
    ],
    shield: ['.4444444.', '.4333334.', '.4325234.', '.4325234.', '.4355534.', '..43234..', '...434...', '....4....'],
    sprout: ['33.....33', '344...443', '.344.443.', '..34443..', '....4....', '....4....', '...343...', '..34443..'],
    chest: [
      '...333333333...',
      '..34444444443..',
      '.3422222222243.',
      '.3433333333343.',
      '.3444444444443.',
      '.3422245422243.',
      '.3422255522243.',
      '.3422245422243.',
      '.3422222222243.',
      '.3444444444443.',
      '..33.......33..',
    ],
    arrow: ['....4....', '....44...', '4444444..', '44444444.', '4444444..', '....44...', '....4....'],
    boot: ['..333...', '..343...', '..343...', '..3433..', '..34443.', '..33333.'],
    skull: ['..22222..', '.2333332.', '234333432', '232232232', '.2222222.', '..23232..', '...222...'],
  };

  function icon(name, p, ramp, scale = 1, angle = null) {
    const rows = ICONS[name];
    const w = rows[0].length * scale + 4,
      h = rows.length * scale + 4;
    const img = k.sprite(`b22:icon:${name}:${scale}:${ramp.join('')}`, w, h, ramp, set => {
      rows.forEach((row, y) =>
        [...row].forEach((ch, x) => {
          if (ch === '.') return;
          for (let yy = 0; yy < scale; yy++)
            for (let xx = 0; xx < scale; xx++) set(2 + x * scale + xx, 2 + y * scale + yy, +ch);
        }),
      );
    });
    if (angle === null) k.blit(img, p.x - w / 2, p.y - h / 2);
    else k.blitRotated(img, p.x, p.y, angle);
  }

  function speck(p, ramp, index = 4, size = 1) {
    k.dot(p.x, p.y, ramp[0], size + 2);
    k.dot(p.x, p.y, ramp[index], size);
  }

  // Bounded sampling keeps long ribbons cheap; both passes share the same pixel centres.
  function stroke(points, ramp, index = 3, width = 1, budget = 42) {
    const segments = Math.max(1, points.length - 1);
    for (let pass = 0; pass < 2; pass++) {
      for (let j = 1; j < points.length; j++) {
        const a = points[j - 1],
          b = points[j];
        const n = Math.max(1, Math.min(Math.floor(budget / segments), Math.ceil(Math.hypot(b.x - a.x, b.y - a.y))));
        for (let i = 0; i <= n; i++) {
          const q = i / n;
          k.dot(k.mix(a.x, b.x, q), k.mix(a.y, b.y, q), ramp[pass ? index : 0], width + (pass ? 0 : 2));
        }
      }
    }
  }

  // Large rings are cached rasters, rather than hundreds of live dots around a template.
  function ring(p, rx, ry, ramp, index = 3, gaps = 0, phase = 0) {
    rx = Math.max(2, Math.round(rx / 2) * 2);
    ry = Math.max(2, Math.round(ry / 2) * 2);
    phase = Math.floor(phase) % 8;
    const w = rx * 2 + 8,
      h = ry * 2 + 8;
    const img = k.sprite(`b22:ring:${rx}:${ry}:${index}:${gaps}:${phase}:${ramp.join('')}`, w, h, ramp, set => {
      for (let y = 2; y < h - 2; y++)
        for (let x = 2; x < w - 2; x++) {
          const dx = (x - w / 2) / rx,
            dy = (y - h / 2) / ry;
          if (Math.abs(Math.hypot(dx, dy) - 1) * Math.min(rx, ry) > 0.7) continue;
          if (gaps && Math.floor((Math.atan2(dy, dx) / k.tau + 1) * gaps * 2 + phase) % 2) continue;
          set(x, y, index);
        }
    });
    k.blit(img, p.x - w / 2, p.y - h / 2);
  }

  function age(s) {
    return s.c.t - k.CAST;
  }
  function seed(s) {
    return s.event.seed || 0;
  }
  function centre(s) {
    if (!s.area) return s.pose.target || s.pose.base || s.pose.hand || { x: 0, y: 0 };
    const a = s.area;
    if (a.kind === 'circle' || a.kind === 'cylinder') return a;
    const half = a.feet / (s.grid.feet || 5) / 2;
    return { x: a.x + Math.cos(a.dir || 0) * half, y: a.y + Math.sin(a.dir || 0) * half };
  }
  function base(s) {
    return k.P(s.pose.base || s.pose.hand || centre(s));
  }
  function recipients(s) {
    return s.targets.length ? s.targets.slice(0, 8) : [s.pose.base || centre(s)];
  }
  function foot(t) {
    return k.P({ x: t.baseX ?? t.x, y: t.baseY ?? t.y });
  }
  function impact(s, hit) {
    const t = s.targets.find(t => t.id === hit.id);
    return k.P(t ? k.contact(t, s.pose.hand || centre(s)) : centre(s));
  }
  function beats(event, travel, stop = 80, kind = 'soft', power = 0.04) {
    return (event.targets?.length ? event.targets : [null]).map(target => ({
      at: k.CAST + travel,
      stop,
      target,
      kind,
      power,
    }));
  }
  function marks(s, ramp, key, size = 28, debris = 6) {
    s.hits.forEach((hit, i) => {
      const e = s.real(hit),
        p = impact(s, hit);
      k.drawHit(k.hitStyle(`b22:${key}`, ramp, { S: size, spikes: 5, minor: 2, jag: 0.3 }), p, e);
      k.shards(p, e, ramp, seed(s) + i * 17, debris, size * 0.65);
    });
  }
  function softBurst(s, ramp, key) {
    s.hits.forEach((hit, i) => {
      const e = s.real(hit),
        p = impact(s, hit);
      k.drawHit(k.hitStyle(`b22:${key}`, ramp, { S: 22, spikes: 4, jag: 0.1 }), p, e);
      k.shards(p, e, ramp, seed(s) + i * 11, 3, 12);
    });
  }
  function radius(s, fallback) {
    return ((s.area?.feet || fallback) / (s.grid.feet || 5)) * 16;
  }
  function auraCentre(s) {
    return k.P(s.area || s.pose.base || centre(s));
  }

  // Rasterize inside the board's polygon, preserving cube rotation and the full circular footprint.
  function terrain(s, mode, frame, ramp) {
    const fallback = centre(s);
    const a =
      s.area ||
      (mode === 'earth'
        ? {
            kind: 'cube',
            feet: 20,
            x: fallback.x - 10 / (s.grid.feet || 5),
            y: fallback.y,
            dir: 0,
          }
        : null);
    if (!a) return;
    const outline = k.outline(a, s.grid);
    if (outline.length < 3) return;
    const pts = outline.map(p => k.P(Array.isArray(p) ? { x: p[0], y: p[1] } : p));
    const x0 = Math.floor(Math.min(...pts.map(p => p.x))) - 3;
    const y0 = Math.floor(Math.min(...pts.map(p => p.y))) - 14;
    const w = Math.ceil(Math.max(...pts.map(p => p.x))) - x0 + 4;
    const h = Math.ceil(Math.max(...pts.map(p => p.y))) - y0 + 4;
    const poly = pts.map(p => ({ x: Math.round(p.x - x0), y: Math.round(p.y - y0) }));
    const sd = seed(s) % 97;
    const img = k.sprite(
      `b22:terrain:${mode}:${frame}:${sd}:${poly.map(p => `${p.x},${p.y}`).join(';')}`,
      w,
      h,
      ramp,
      set => {
        const rocks = Array.from({ length: 16 }, (_, i) => ({
          x: (((i % 4) + 0.5 + (k.hash(i, sd, 1) - 0.5) * 0.65) * w) / 4,
          y: 14 + ((Math.floor(i / 4) + 0.5 + (k.hash(i, sd, 2) - 0.5) * 0.65) * (h - 18)) / 4,
        }));
        for (let y = 2; y < h - 2; y++)
          for (let x = 2; x < w - 2; x++) {
            let inside = false;
            for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
              const p = poly[i],
                q = poly[j];
              if (p.y > y !== q.y > y && x < ((q.x - p.x) * (y - p.y)) / (q.y - p.y) + p.x) inside = !inside;
            }
            if (!inside) continue;
            if (mode === 'earth') {
              let near = Infinity,
                next = Infinity,
                rock = 0;
              for (let i = 0; i < rocks.length; i++) {
                const d = (x - rocks[i].x) ** 2 + (y - rocks[i].y) ** 2;
                if (d < near) {
                  next = near;
                  near = d;
                  rock = i;
                } else if (d < next) next = d;
              }
              const ox = x - rocks[rock].x,
                oy = y - rocks[rock].y;
              const split = Math.sqrt(next) - Math.sqrt(near) < 1.5;
              if (frame === 0) {
                if (split) set(x, y, 1);
                continue;
              }
              if (frame === 1) {
                if (split) set(x, y, 5);
                else if (oy < -2) set(x, y, 3);
                continue;
              }
              if (split) set(x, y, 1);
              else if (frame < 5) {
                const lift = Math.round((frame === 2 ? 1 : frame === 3 ? 0.7 : 0.3) * (3 + k.hash(rock, sd, 3) * 3));
                for (let sy = 0; sy < lift; sy++) set(x, y - sy, 2);
                set(x, y - lift, ox + oy < -4 ? 4 : ox - oy < 2 ? 3 : 2);
              } else if (ox + oy < -4) set(x, y, 3);
              else set(x, y, 2);
            } else {
              const ty = Math.floor(y / 19),
                tx = Math.floor((x + (ty % 2) * 11) / 23);
              const ox = ((x + (ty % 2) * 11) % 23) - 11,
                oy = (y % 19) - 9;
              const patch = Math.abs(ox) / 10 + Math.abs(oy) / 8;
              const frozen = k.hash(tx, ty, sd) > 0.33;
              if (frozen && patch < 0.9) {
                const crack = Math.abs(ox - oy * 0.8);
                if (crack < 1) set(x, y, 1);
                else if (patch > 0.74 && oy < 1) set(x, y, 4);
                else set(x, y, oy < -2 ? 3 : 2);
              } else if ((x * 3 + y * 5 + frame * 11) % 109 === 0 && (tx + ty) % 3 === 0) set(x, y, 4);
            }
          }
      },
    );
    k.blit(img, x0, y0);
  }

  function demonCount(s) {
    return [2, 2, 4, 4, 8, 8][Math.floor(k.hash(22, seed(s)) * 6)];
  }
  function demonPlace(s, i, n) {
    const p = k.P(centre(s));
    const a = (i * k.tau) / n + k.hash(3, seed(s)) * 1.2;
    const r = n === 2 ? 12 : n === 4 ? 20 : 29;
    return { x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r * 0.65 };
  }

  // Summon Lesser Demons: several ragged crimson Abyssal tears disgorge small horned, clawed fiends.
  FX.register('summon-lesser-demons', {
    palette: ABYSS,
    travel: 280,
    beats: () => [{ at: k.CAST + 280, stop: 95, target: null, kind: 'soft', power: 0.03 }],
    end: () => 1400,
    ground(s) {
      const e = age(s);
      if (e < 0 || e > 1060) return;
      const n = demonCount(s);
      for (let i = 0; i < n; i++) {
        const p = demonPlace(s, i, n),
          q = k.clamp((e - 40) / 190);
        const r = e < 690 ? 3 + q * 7 : Math.max(2, 10 * (1 - (e - 690) / 340));
        ring(p, r, r * 0.55, ABYSS, e < 280 ? 2 : 4, 5, i);
        if (e > 210 && e < 760) {
          k.disc(p.x, p.y, 4, ABYSS[0]);
          k.disc(p.x, p.y, 2, ABYSS[1]);
        }
      }
    },
    air(s) {
      const e = age(s);
      if (e < 170 || e > 1100) return;
      const n = demonCount(s),
        real = s.real(s.hits[0]);
      for (let i = 0; i < n; i++) {
        const p = demonPlace(s, i, n);
        const q = k.ease(k.clamp((e - 170 - i * 13) / 320));
        icon('demon', { x: p.x, y: p.y + 5 - q * 13 }, ABYSS);
        k.drawHit(k.hitStyle('b22:demon-gate', ABYSS, { S: 18, spikes: 4, void: true }), p, real);
        k.shards(p, real, ABYSS, seed(s) + i * 19, 3, 12);
        if (e > 900) speck({ x: p.x + 6, y: p.y - 15 }, ABYSS, 4);
      }
    },
  });

  // Erupting Earth: the actual cube splits, flashes, heaves into ochre slabs and settles into rubble.
  FX.register('erupting-earth', {
    palette: EARTH,
    travel: 260,
    beats: (event, kit, travel) => beats(event, travel, 180, 'blast', 0.09),
    end: () => 1320,
    reach: (event, grid) => ({ r: (event.area?.feet || 20) / (grid.feet || 5) + 1, up: 2 }),
    ground(s) {
      const e = age(s);
      if (e < 0) return;
      const frame = e < 260 ? 0 : e < 330 ? 1 : e < 460 ? 2 : e < 620 ? 3 : e < 780 ? 4 : 5;
      terrain(s, 'earth', frame, EARTH);
      if (e > 260 && e < 700) {
        const p = k.P(centre(s)),
          r = ((s.area?.feet || 20) / (s.grid.feet || 5)) * 8;
        ring(p, r * k.ease(k.clamp((e - 260) / 230)), r * 0.75, EARTH, 4, 12);
      }
    },
    air(s) {
      marks(s, EARTH, 'earth', 38, 8);
      const real = s.real(s.hits[0]);
      if (real < 0 || real > 650) return;
      const a = s.area,
        p = k.P(centre(s));
      const side = ((a?.feet || 20) / (s.grid.feet || 5)) * 16;
      const dir = a?.dir || 0;
      for (let i = 0; i < 18; i++) {
        const u = (k.hash(i, seed(s), 1) - 0.5) * side * 0.92;
        const v = (k.hash(i, seed(s), 2) - 0.5) * side * 0.92;
        const t = real / 650,
          lift = Math.sin(t * Math.PI) * (12 + k.hash(i, seed(s), 3) * 27);
        const at = {
          x: p.x + u * Math.cos(dir) - v * Math.sin(dir) + (t * 2 - 1) * 3,
          y: p.y + u * Math.sin(dir) + v * Math.cos(dir) - lift,
        };
        speck(at, EARTH, i % 3 ? 3 : 4, t < 0.7 ? 3 : 2);
      }
    },
    linger(s) {
      if (s.linger > 0.2) terrain(s, 'earth', 5, EARTH);
    },
    flash: (event, e) => (e < 30 ? { color: EARTH[5], alpha: 0.2 } : e < 65 ? { color: EARTH[0], alpha: 0.18 } : null),
  });

  function sleet(s, persistent) {
    const e = age(s);
    if (!persistent && (e < 0 || e > 1400)) return;
    if (persistent && s.linger < 0.2) return;
    const p = k.P(centre(s)),
      r = radius(s, 40);
    const frame = Math.floor(s.c.raw / 140) % 6;
    terrain(s, 'sleet', frame, ICE);
    ring(p, r, r, ICE, 2, 16, Math.floor(s.c.raw / 260));
  }

  // Sleet Storm: a broad cylinder of dark storm bands, slanting white sleet and slick, cracked ice; no damage burst.
  FX.register('sleet-storm', {
    palette: ICE,
    travel: 230,
    beats: (event, kit, travel) => beats(event, travel, 90, 'soft', 0.03),
    end: () => 1710,
    ground(s) {
      sleet(s, false);
    },
    air(s) {
      const e = age(s);
      if (e < 0 || e > 1400) return;
      const p = k.P(centre(s)),
        r = radius(s, 40);
      const roof = Math.min(48, ((s.area?.height || 20) / (s.grid.feet || 5)) * 16);
      // Sparse cloud scallops leave the centre of the cylinder readable.
      for (let i = 0; i < 7; i++) {
        const a = Math.PI + (i * Math.PI) / 6;
        ring({ x: p.x + Math.cos(a) * r * 0.65, y: p.y + Math.sin(a) * r * 0.4 - roof }, r * 0.23, 7, ICE, 1, 6, i);
      }
      const last = k.clamp((e - 1080) / 320),
        count = Math.floor(35 * (1 - last));
      for (let i = 0; i < count; i++) {
        const a = k.hash(i, seed(s), 1) * k.tau;
        const rr = Math.sqrt(k.hash(i, seed(s), 2)) * r * 0.94;
        const q = (s.c.raw / 410 + k.hash(i, seed(s), 3)) % 1;
        const x = p.x + Math.cos(a) * rr,
          y = p.y + Math.sin(a) * rr;
        if (q < 0.82) {
          const at = { x: x + (1 - q / 0.82) * 7, y: y - (1 - q / 0.82) * roof };
          speck(at, ICE, i % 3 ? 4 : 3, 1);
          if (i % 3 === 0) speck({ x: at.x + 1, y: at.y - 3 }, ICE, 3);
        } else if (i % 4 === 0) ring({ x, y }, 3 + (q - 0.82) * 15, 2, ICE, 4);
      }
      const real = s.real(s.hits[0]);
      if (real >= 0 && real < 360)
        for (let i = 0; i < 4; i++) {
          const a = (i * k.tau) / 4;
          const at = { x: p.x + Math.cos(a) * r * 0.5, y: p.y + Math.sin(a) * r * 0.5 };
          k.drawHit(k.hitStyle('b22:sleet', ICE, { S: 16, spikes: 4 }), at, real);
          k.shards(at, real, ICE, seed(s) + i, 3, 10);
        }
    },
    linger(s) {
      sleet(s, true);
    },
  });

  function strideGround(s, persistent) {
    const e = age(s);
    if (persistent ? s.linger < 0.2 : e < 0 || e > 940) return;
    const C = auraCentre(s),
      r = radius(s, 5);
    ring(C, r, r, FIRE, 3, 10, Math.floor(s.c.raw / 90));
    const dir = s.area?.dir || 0;
    for (let i = 0; i < 5; i++) {
      const d = (i + 1) * r * 0.3;
      const side = (i % 2 ? 1 : -1) * 3;
      const p = {
        x: C.x - Math.cos(dir) * d - Math.sin(dir) * side,
        y: C.y - Math.sin(dir) * d + Math.cos(dir) * side,
      };
      icon('boot', p, FIRE, 1, dir);
    }
  }

  // Divination: incense curls into a golden watching eye; four omen stars align, then leave a single clear sign.
  FX.register('divination', {
    palette: GOLD,
    travel: 400,
    beats: () => [{ at: k.CAST + 400, stop: 100, target: null, kind: 'soft', power: 0.03 }],
    end: () => 1450,
    ground(s) {
      const e = age(s);
      if (e < 0 || e > 1100) return;
      const C = base(s);
      ring(C, 15, 8, GOLD, e < 650 ? 3 : 2, 8, Math.floor(e / 180));
    },
    air(s) {
      const e = age(s);
      if (e < 0 || e > 1140) return;
      const C = base(s),
        P = { x: C.x, y: C.y - 24 };
      if (e < 720)
        for (let i = 0; i < 3; i++) {
          const q = (e / 650 + i / 3) % 1;
          ring({ x: C.x + Math.sin(q * 7 + i) * 4, y: C.y - q * 23 }, 4 + q * 3, 2, GOLD, 2, 5, i);
        }
      if (e >= 140 && e < 930) icon('eye', P, GOLD, 2);
      if (e < 700)
        for (let i = 0; i < 4; i++) {
          const a = (i * k.tau) / 4 - 0.4 * (1 - k.clamp(e / 400));
          const rr = 25 - k.ease(k.clamp(e / 400)) * 7;
          icon('star', { x: P.x + Math.cos(a) * rr, y: P.y + Math.sin(a) * rr * 0.6 }, GOLD);
        }
      const real = s.real(s.hits[0]);
      k.drawHit(k.hitStyle('b22:omen', GOLD, { S: 30, spikes: 4 }), P, real);
      k.shards(P, real, GOLD, seed(s), 5, 23);
      if (e > 900) icon('star', P, GOLD, 2);
    },
  });

  // Phantasmal Killer: a private violet nightmare takes a horned, hollow-eyed shape and rakes inward through the mind.
  FX.register('phantasmal-killer', {
    palette: NIGHT,
    travel: 350,
    beats: (event, kit, travel) => beats({ targets: event.targets?.slice(0, 1) }, travel, 145, 'hit', 0.075),
    end: () => 1420,
    ground(s) {
      const e = age(s);
      if (e < 0 || e > 1090) return;
      const T = impact(s, s.hits[0]);
      ring({ x: T.x, y: T.y + 8 }, 9 + Math.sin(k.clamp(e / 800) * Math.PI) * 9, 6, NIGHT, 1, 7);
    },
    air(s) {
      const e = age(s);
      if (e < 0 || e > 1110) return;
      const T = impact(s, s.hits[0]);
      if (e < 680) {
        const q = k.ease(k.clamp(e / 350));
        const P = { x: T.x, y: T.y - 19 + (1 - q) * 8 };
        icon('skull', P, NIGHT, 2);
        for (let side = -1; side <= 1; side += 2) {
          stroke(
            [
              { x: P.x + side * 5, y: P.y - 5 },
              { x: P.x + side * 11, y: P.y - 11 },
              { x: P.x + side * 10, y: P.y - 16 },
            ],
            NIGHT,
            2,
            2,
            18,
          );
          icon('claw', { x: T.x + side * (23 - q * 15), y: T.y + 5 }, NIGHT, 1, side > 0 ? Math.PI : 0);
        }
      }
      marks(s, NIGHT, 'nightmare', 38, 8);
      const real = s.real(s.hits[0]);
      if (real >= 0 && real < 520)
        for (let i = 0; i < 6; i++) {
          const a = (i * k.tau) / 6,
            q = k.clamp(real / 520);
          speck({ x: T.x + Math.cos(a) * (23 - 18 * q), y: T.y + Math.sin(a) * (17 - 12 * q) - q * 8 }, MIND, 3);
        }
      if (e >= 680 && e < 970) icon('eye', { x: T.x, y: T.y - 17 }, NIGHT);
    },
    flash: (event, e) => (e < 35 ? { color: NIGHT[4], alpha: 0.12 } : e < 75 ? { color: NIGHT[0], alpha: 0.18 } : null),
  });

  function holyAura(s, ramp, living, persistent) {
    const e = age(s);
    if (persistent ? s.linger < 0.2 : e < 0 || e > 1040) return;
    const C = auraCentre(s),
      R = radius(s, 30);
    const q = persistent ? 1 : k.ease(k.clamp(e / 240));
    const r = Math.max(4, R * q);
    ring(C, r, r, ramp, 3);
    ring(C, Math.max(3, r - 5), Math.max(3, r - 5), ramp, 2, living ? 12 : 8, Math.floor(s.c.raw / 240));
    for (let i = 0; i < 8; i++) {
      const a = (i * k.tau) / 8;
      icon(living ? 'sprout' : 'shield', { x: C.x + Math.cos(a) * r * 0.86, y: C.y + Math.sin(a) * r * 0.86 }, ramp);
    }
    if (living)
      for (let i = 0; i < 6; i++) {
        const a = (i * k.tau) / 6 + 0.2,
          rr = R * (0.28 + 0.07 * (i % 3));
        icon('star', { x: C.x + Math.cos(a) * rr, y: C.y + Math.sin(a) * rr }, ramp);
      }
  }

  function auraAir(s, ramp, living) {
    const e = age(s);
    if (e < 0 || e > 1050) return;
    const C = base(s);
    if (e < 570) {
      icon(living ? 'sprout' : 'shield', { x: C.x, y: C.y - 18 - k.ease(k.clamp(e / 240)) * 4 }, ramp, 2);
    }
    const real = s.real(s.hits[0]);
    k.drawHit(k.hitStyle(living ? 'b22:life-aura' : 'b22:pure-aura', ramp, { S: 28, spikes: living ? 6 : 4 }), C, real);
    k.shards(C, real, ramp, seed(s), 6, 22);
    if (e > 240 && e < 850)
      for (let i = 0; i < 12; i++) {
        const a = k.hash(i, seed(s)) * k.tau,
          r = radius(s, 30) * (0.2 + k.hash(i, seed(s), 1) * 0.7);
        const q = (s.c.raw / 650 + i / 12) % 1;
        speck({ x: C.x + Math.cos(a) * r, y: C.y + Math.sin(a) * r - q * 11 }, ramp, living ? 3 : 4);
      }
  }

  // Staggering Smite: a rose-violet weapon crescent strikes once, followed by a broken halo of disorienting psychic shards.
  FX.register('staggering-smite', {
    palette: MIND,
    travel: 140,
    beats: (event, kit, travel) => beats({ targets: event.targets?.slice(0, 1) }, travel, 155, 'hit', 0.09),
    end: () => 1100,
    air(s) {
      const e = age(s);
      if (e < 0 || e > 790) return;
      const T = impact(s, s.hits[0]);
      if (e < 240) {
        const q = k.clamp(e / 140),
          points = [];
        for (let i = 0; i < 11; i++) {
          const a = -2.4 + q * 1.1 + (i / 10) * 1.3;
          points.push({ x: T.x + Math.cos(a) * 20, y: T.y + Math.sin(a) * 19 });
        }
        stroke(points, MIND, e < 140 ? 3 : 4, 3, 40);
        const tip = points[points.length - 1];
        stroke([tip, { x: tip.x + 14, y: tip.y + 15 }], MIND, 5, 2, 22);
      }
      marks(s, MIND, 'stagger', 36, 9);
      const real = s.real(s.hits[0]);
      if (real >= 40 && real < 620) {
        const P = { x: T.x + (Math.floor(real / 75) % 2 ? 2 : -2), y: T.y - 19 };
        ring(P, 12, 5, MIND, 3, 7, Math.floor(real / 80));
        for (let i = 0; i < 3; i++) {
          const a = real / 170 + (i * k.tau) / 3;
          icon('star', { x: P.x + Math.cos(a) * 12, y: P.y + Math.sin(a) * 5 }, MIND);
        }
      }
    },
    flash: (event, e) => (e < 30 ? { color: MIND[4], alpha: 0.15 } : e < 65 ? { color: MIND[0], alpha: 0.14 } : null),
  });

  // Compulsion: pink enchantment coils catch the minds, then repeated bright arrows order every recipient the same way.
  FX.register('compulsion', {
    palette: MIND,
    travel: 280,
    beats: (event, kit, travel) => beats(event, travel, 85, 'soft', 0.03),
    end: () => 1390,
    ground(s) {
      const e = age(s);
      if (e < 280 || e > 1070) return;
      const dir = s.area?.dir || 0;
      recipients(s).forEach(t => {
        const F = foot(t),
          q = ((e - 280) / 520) % 1;
        ring(F, 9, 5, MIND, 2, 5);
        for (let i = 0; i < 2; i++)
          icon(
            'arrow',
            {
              x: F.x + Math.cos(dir) * (8 + i * 10 + q * 6),
              y: F.y + Math.sin(dir) * (8 + i * 10 + q * 6),
            },
            MIND,
            1,
            dir,
          );
      });
    },
    air(s) {
      const e = age(s);
      if (e < 0 || e > 1080) return;
      const H = k.P(s.pose.hand || s.pose.base || centre(s));
      const list = recipients(s);
      list.forEach((t, i) => {
        const T = k.P(t),
          P = { x: T.x, y: T.y - 13 };
        if (e < 350) {
          const q = k.clamp(e / 280),
            points = [H];
          for (let j = 1; j <= 5; j++) {
            const u = (j / 5) * q;
            points.push({ x: k.mix(H.x, P.x, u), y: k.mix(H.y, P.y, u) + Math.sin(u * Math.PI * 3 + i) * 4 });
          }
          stroke(points, MIND, 3, 1, Math.max(15, Math.floor(65 / list.length)));
        }
        if (e > 220 && e < 900) {
          ring(P, 10, 6, MIND, 3, 6, Math.floor(e / 100));
          icon('eye', { x: P.x, y: P.y - 3 }, MIND);
        }
      });
      softBurst(s, MIND, 'compulsion');
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
