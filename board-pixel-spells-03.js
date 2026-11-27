/* Pixel spells, batch 03: cantrip touches, enchantments, nature and close-range bursts. */
(function (root) {
  'use strict';
  const FX = root.BoardPixelFX;
  if (!FX) return;
  const k = FX.kit;
  const LIGHTNING = k.palettes.lightning;
  const PSYCHIC = k.palettes['psíquico'];
  const NECROTIC = k.palettes['necrótico'];
  const THUNDER = k.palettes.trueno;
  const NATURE = k.palettes.nature;
  const HEAL = k.palettes.heal;
  const STEEL = k.palettes.cortante;
  const MAGIC = k.palettes.magic;
  const FIRE = ['#2a0d0c', '#6e1a12', '#b8321a', '#ec6a1c', '#ffb53a', '#ffffff'];
  const SILVER = ['#131c2b', '#36485e', '#6e91ab', '#b9dfeb', '#e7fcff', '#ffffff'];
  const BRONZE = ['#211426', '#49304a', '#85604b', '#bf9861', '#eed5a0', '#ffffff'];

  const seed = s => s.event.seed || 0;
  const end = (event, travel) => k.CAST + travel + 560;
  const beats =
    (stop, kind = 'hit', all = false) =>
    (event, kit, travel) => {
      const ids = event.targets?.length ? event.targets : [null];
      return (all ? ids : ids.slice(0, 1)).map(target => ({
        at: kit.CAST + travel,
        stop,
        target,
        kind,
        power: kind === 'soft' ? 0 : 0.065,
      }));
    };
  const selfBeat = (event, kit, travel) => [{ at: kit.CAST + travel, stop: 55, target: null, kind: 'soft', power: 0 }];
  function point(s, hit = s.hits[0]) {
    const t = s.targets.find(t => t.id === hit?.id) || s.targets[0];
    return t ? k.P(k.contact(t, s.pose.hand || t)) : k.P(s.pose.target || s.pose.hand || s.pose.base);
  }
  function head(s) {
    const b = s.pose.base || s.pose.hand || s.pose.target;
    return k.P({ x: b.x, y: b.y - (b.span || 1) * 0.8 });
  }
  function ink(x, y, ramp, size = 1, color = 3) {
    k.dot(x, y, ramp[0], size + 2);
    k.dot(x, y, ramp[color], size);
  }
  // Bounded samples keep long links cheap. All strokes get a complete outline pass first.
  function stroke(points, ramp, width = 1, color = 3) {
    for (const [c, w] of [
      [ramp[0], width + 2],
      [ramp[color], width],
    ]) {
      for (let j = 1; j < points.length; j++) {
        const a = points[j - 1],
          b = points[j];
        const n = Math.max(1, Math.min(36, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y))));
        for (let i = 0; i <= n; i++) k.dot(k.mix(a.x, b.x, i / n), k.mix(a.y, b.y, i / n), c, w);
      }
    }
  }
  function ring(p, rx, ry, ramp, color = 3, gap = 0, spin = 0) {
    k.ellipse(p.x, p.y, rx, ry, ramp[0], 3, gap, spin);
    k.ellipse(p.x, p.y, rx, ry, ramp[color], 1, gap, spin);
  }
  function mark(s, ramp, key, size = 28, count = 7) {
    s.hits.forEach((hit, i) => {
      const p = point(s, hit),
        e = s.real(hit);
      k.drawHit(k.hitStyle('b03-' + key, ramp, { S: size, spikes: 5, jag: 0.35 }), p, e);
      k.shards(p, e, ramp, seed(s) + i * 19, count, 17);
    });
  }
  const glyphs = {
    heart: ['.22.22.', '2332332', '2333332', '.23332.', '..232..', '...2...'],
    mouth: ['.22222.', '2444442', '2333332', '.21112.', '..222..'],
    bell: [
      '....33....',
      '...3443...',
      '..344443..',
      '..344443..',
      '..344443..',
      '.34444443.',
      '.33333333.',
      '....33....',
    ],
    skull: ['..3333..', '.344443.', '34444443', '34144143', '.344443.', '..3131..', '..3333..'],
    flower: ['..33.33..', '.3443443.', '..34443..', '.3445443.', '..34443..', '.3443443.', '..33.33..'],
    leaf: ['....3.', '..343.', '.3443.', '3443..', '.33...', '.3....'],
    sword: [
      '......5..',
      '.....45..',
      '....345..',
      '...345...',
      '..345....',
      '.234.....',
      '..32.....',
      '.2..2....',
      '2........',
    ],
    shield: [
      '.3333333.',
      '344454443',
      '344454443',
      '344454443',
      '.3445443.',
      '.3445443.',
      '..34543..',
      '...343...',
      '....3....',
    ],
    rune: ['..4..', '.434.', '43.34', '.434.', '..4..'],
  };
  function glyph(name, ramp) {
    const rows = glyphs[name];
    return k.sprite('b03:' + name + ':' + ramp.join(''), rows[0].length + 2, rows.length + 2, ramp, set => {
      rows.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) if (row[x] !== '.') set(x + 1, y + 1, +row[x]);
      });
    });
  }
  function icon(name, p, ramp) {
    const img = glyph(name, ramp);
    k.blit(img, p.x - img.width / 2, p.y - img.height / 2);
  }
  function cube(s) {
    const area = s.area;
    const corners = area ? k.outline(area, s.grid) : [];
    if (corners.length >= 4) return corners.slice(0, 4).map(p => k.P({ x: p[0], y: p[1] }));
    const p = k.P(area || s.pose.target || s.pose.hand || s.pose.base);
    const half = (((area?.feet || 5) / (s.grid.feet || 5)) * k.PX) / 2;
    return [
      { x: p.x - half, y: p.y - half },
      { x: p.x + half, y: p.y - half },
      { x: p.x + half, y: p.y + half },
      { x: p.x - half, y: p.y + half },
    ];
  }
  function inCube(s, u = 0.5, v = 0.5) {
    const q = cube(s);
    return {
      x: q[0].x + (q[1].x - q[0].x) * u + (q[3].x - q[0].x) * v,
      y: q[0].y + (q[1].y - q[0].y) * u + (q[3].y - q[0].y) * v,
    };
  }
  function aura(s) {
    return { p: k.P(s.area || s.pose.base || s.pose.hand), r: ((s.area?.feet || 5) / (s.grid.feet || 5)) * k.PX };
  }
  function flame(frame, tall = false) {
    const h = tall ? 25 : 18;
    return k.sprite('b03:flame:' + tall + ':' + frame, 17, h, FIRE, set => {
      for (let y = 2; y < h - 2; y++) {
        const v = (h - 2 - y) / (h - 4);
        const center = 8 + Math.round(Math.sin(v * 5 + frame * 0.9) * v * 3);
        const width = Math.max(0, Math.round(6 * (1 - v) ** 0.65));
        for (let x = center - width; x <= center + width; x++) {
          const band = Math.abs(x - center) / (width + 1) + v * 0.55;
          set(x, y, band < 0.28 ? 5 : band < 0.52 ? 4 : band < 0.85 ? 3 : 2);
        }
      }
    });
  }
  function bonfire(s, loop = false) {
    const e = loop ? 160 : s.real(s.hits[0]);
    if (e < 0 || (!loop && e > 620)) return;
    const c = inCube(s),
      q = cube(s);
    stroke([...q, q[0]], FIRE, 1, 1);
    const active = loop || e < 410;
    if (active) {
      const f = Math.floor(s.c.raw / 65) % 6;
      for (const [u, v, tall] of [
        [0.3, 0.3, false],
        [0.7, 0.35, false],
        [0.5, 0.65, true],
      ]) {
        const p = inCube(s, u, v),
          img = flame((f + Math.round(u * 6)) % 6, tall);
        k.blit(img, p.x - 8, p.y - img.height + 3);
      }
      if (!loop && e < 75) {
        k.disc(c.x, c.y, 7, FIRE[0]);
        k.disc(c.x, c.y, 6, FIRE[e < 35 ? 5 : 1]);
      }
    } else {
      for (let i = 0; i < 3; i++) {
        const p = inCube(s, 0.25 + i * 0.25, 0.5);
        k.disc(p.x, p.y - (e - 410) / 28 - i * 2, 3, k.palettes.SMOKE[0]);
        k.disc(p.x, p.y - (e - 410) / 28 - i * 2, 2, k.palettes.SMOKE[2]);
        ink(p.x, p.y, FIRE, 1, 2);
      }
    }
  }

  // Shocking Grasp: a crackling blue palm clamps the body, then forks into white lightning fingers.
  FX.register('shocking-grasp', {
    palette: LIGHTNING,
    travel: 90,
    beats: beats(115),
    end,
    flash: (event, e) =>
      e < 28 ? { color: LIGHTNING[4], alpha: 0.16 } : e < 60 ? { color: LIGHTNING[0], alpha: 0.12 } : null,
    air(s) {
      const t = s.c.t - k.CAST;
      if (t < 0) return;
      const T = point(s),
        H = k.P(s.pose.hand || s.pose.base),
        e = s.real(s.hits[0]);
      if (e < 190) {
        const p = { x: k.mix(H.x, T.x, k.clamp(t / 90)), y: k.mix(H.y, T.y, k.clamp(t / 90)) };
        // Only the hand travels: no ranged lightning beam.
        k.disc(p.x, p.y + 2, 4, LIGHTNING[0]);
        k.disc(p.x, p.y + 2, 3, LIGHTNING[3]);
        for (let i = 0; i < 4; i++) {
          const x = p.x - 4 + i * 2,
            j = (Math.floor(s.c.raw / 35) + i) % 2;
          stroke(
            [
              { x, y: p.y },
              { x: x - 1, y: p.y - 4 - j },
              { x: x + 1, y: p.y - 7 - j },
            ],
            LIGHTNING,
            1,
            4,
          );
        }
        if (e >= 0)
          for (let i = 0; i < 3; i++) {
            const a = (i * k.tau) / 3 + Math.floor(s.c.raw / 45);
            stroke(
              [
                T,
                { x: T.x + Math.cos(a) * 7, y: T.y + Math.sin(a) * 5 },
                { x: T.x + Math.cos(a + 0.4) * 13, y: T.y + Math.sin(a + 0.4) * 11 },
              ],
              LIGHTNING,
              1,
              4,
            );
          }
      }
      mark(s, LIGHTNING, 'grasp', 30);
    },
  });

  // Friends: rose glamour curls around the caster's face and resolves into a small friendly heart.
  FX.register('friends', {
    palette: PSYCHIC,
    travel: 0,
    beats: selfBeat,
    end,
    air(s) {
      const e = s.real(s.hits[0]);
      if (e < 0 || e > 570) return;
      const p = head(s);
      if (e < 340) ring(p, 10, 7, PSYCHIC, 3, 4, e / 180);
      icon('heart', { x: p.x, y: p.y - 9 - Math.min(5, e / 80) }, PSYCHIC);
      for (let i = 0; i < 4 && e < 430; i++) {
        const a = (i * k.tau) / 4 + e / 280;
        ink(p.x + Math.cos(a) * 13, p.y + Math.sin(a) * 8, PSYCHIC, 1, i % 2 ? 4 : 3);
      }
    },
  });

  // Vicious Mockery: a sneering psychic mouth at the victim spits jagged magenta verbal barbs.
  FX.register('mockery', {
    palette: PSYCHIC,
    travel: 120,
    beats: beats(95),
    end,
    air(s) {
      const t = s.c.t - k.CAST,
        T = point(s),
        e = s.real(s.hits[0]);
      if (t >= 0 && e < 280) {
        const p = { x: T.x, y: T.y - 12 - (e > 0 ? Math.floor(e / 100) : 0) };
        icon('mouth', p, PSYCHIC);
        for (const side of [-1, 1])
          stroke(
            [
              { x: p.x + side * 5, y: p.y + 5 },
              { x: p.x + side * 10, y: p.y + 7 },
              { x: p.x + side * 7, y: p.y + 10 },
              { x: T.x + side * 3, y: T.y },
            ],
            PSYCHIC,
            1,
            3,
          );
      }
      mark(s, PSYCHIC, 'mockery', 28, 6);
    },
  });

  // Control Flames: existing orange flames fold sideways into an ordered spiral inside the chosen cube.
  FX.register('control-flames', {
    palette: FIRE,
    travel: 0,
    beats: selfBeat,
    end: () => k.CAST + 780,
    ground(s) {
      const e = s.real(s.hits[0]);
      if (e < 0 || e > 760) return;
      const c = inCube(s),
        q = cube(s);
      if (e < 200) stroke([...q, q[0]], FIRE, 1, 2);
      const img = flame(Math.floor(e / 75) % 6);
      if (e < 180 || e > 570) k.blit(img, c.x - 8, c.y - img.height + 3);
      else {
        const pts = [];
        for (let i = 0; i < 22; i++) {
          const a = i * 0.29 + e / 200,
            r = 2 + i * 0.26;
          pts.push({ x: c.x + Math.cos(a) * r, y: c.y - 7 + Math.sin(a) * r });
        }
        stroke(pts, FIRE, 2, 3);
        ink(pts[21].x, pts[21].y, FIRE, 2, 4);
      }
    },
    air(s) {
      const e = s.real(s.hits[0]),
        c = inCube(s);
      if (e < 0 || e > 500) return;
      for (let i = 0; i < 4; i++) ink(c.x + Math.sin(e / 160 + i) * 7, c.y - 5 - ((e / 30 + i * 4) % 17), FIRE, 1, 4);
    },
  });

  // Create Bonfire: the five-foot cube ignites in a sharp flash, burns in layered tongues, then settles to coals.
  FX.register('create-bonfire', {
    palette: FIRE,
    travel: 70,
    beats: beats(105, 'hit', true),
    end: () => k.CAST + 800,
    ground: s => bonfire(s),
    linger: s => {
      if (s.linger > 0.25) bonfire(s, true);
    },
    air(s) {
      mark(s, FIRE, 'bonfire', 26, 5);
      const e = s.real(s.hits[0]),
        c = inCube(s);
      if (e < 0 || e > 530) return;
      for (let i = 0; i < 5; i++) {
        const q = ((e + i * 71) % 360) / 360;
        ink(c.x + (k.hash(i, seed(s)) - 0.5) * 12 + Math.sin(q * 6 + i) * 2, c.y - q * 25, FIRE, 1, 4);
      }
    },
    reach: (event, grid) => ({ r: (event.area?.feet || 5) / (grid.feet || 5) + 1, up: 2 }),
  });

  // Toll the Dead: a spectral bronze funeral bell swings above the victim; violet death-rings and a skull answer.
  FX.register('toll-the-dead', {
    palette: NECROTIC,
    travel: 180,
    beats: beats(145),
    end: () => k.CAST + 820,
    air(s) {
      const t = s.c.t - k.CAST,
        e = s.real(s.hits[0]),
        T = point(s);
      if (t < 0) return;
      if (e < 390) {
        const img = glyph('bell', BRONZE);
        k.blitRotated(img, T.x, T.y - 17, e < 0 ? Math.sin(t / 55) * 0.5 : Math.sin(e / 70) * 0.35);
      }
      if (e >= 0 && e < 430) {
        for (let i = 0; i < 2; i++) {
          const q = k.clamp((e - i * 65) / 360);
          if (q > 0 && q < 1) ring(T, 5 + q * 12, 3 + q * 7, NECROTIC, 3, q > 0.65 ? 6 : 0);
        }
        if (e > 80) icon('skull', { x: T.x, y: T.y - (e - 80) / 65 }, NECROTIC);
      }
      mark(s, NECROTIC, 'toll', 30, 7);
    },
  });

  // Druidcraft: a green shoot unfurls leaves and a pink flower, scattering a few seeds over the selected patch.
  FX.register('druidcraft', {
    palette: NATURE,
    travel: 0,
    beats: selfBeat,
    end: () => k.CAST + 950,
    ground(s) {
      const e = s.real(s.hits[0]);
      if (e < 0 || e > 940) return;
      const p = inCube(s),
        h = 3 + 11 * k.ease(k.clamp(e / 280));
      if (e < 240) ring(p, 7 + e / 60, 3 + e / 120, NATURE, 2, 5);
      stroke([p, { x: p.x + 1, y: p.y - h / 2 }, { x: p.x, y: p.y - h }], NATURE, 1, 3);
      if (e > 110) icon('leaf', { x: p.x + 4, y: p.y - 6 }, NATURE);
      if (e > 180) {
        const img = glyph('leaf', NATURE);
        k.blitRotated(img, p.x - 3, p.y - 9, -Math.PI / 2);
      }
      if (e > 280) icon('flower', { x: p.x, y: p.y - h - 3 }, PSYCHIC);
    },
    air(s) {
      const e = s.real(s.hits[0]),
        p = inCube(s);
      if (e < 290 || e > 800) return;
      for (let i = 0; i < 5; i++) {
        const q = (e - 290) / 510,
          a = k.hash(i, seed(s)) * k.tau;
        ink(p.x + Math.cos(a) * q * 12, p.y - 16 - Math.sin(q * Math.PI) * 9 + q * 14, NATURE, 1, 4);
      }
    },
  });

  // Encode Thoughts: a silver-blue memory thread is drawn from the caster's temple into a floating runic ribbon.
  FX.register('encode-thoughts', {
    palette: SILVER,
    travel: 0,
    beats: selfBeat,
    end: () => k.CAST + 900,
    air(s) {
      const e = s.real(s.hits[0]);
      if (e < 0 || e > 870) return;
      const H = k.P(s.pose.hand || s.pose.base),
        A = head(s),
        q = k.ease(k.clamp(e / 350));
      const tip = { x: H.x + 10 * q, y: H.y - 9 * q };
      const pts = [];
      for (let i = 0; i < 24; i++) {
        const u = i / 23;
        pts.push({
          x: k.mix(A.x + 4, tip.x, u),
          y: k.mix(A.y, tip.y, u) + Math.sin(u * k.tau * 1.5 + e / 180) * 3 * q,
        });
      }
      if (e < 480) stroke(pts, SILVER, 1, 4);
      else {
        const coil = [];
        for (let i = 0; i < 24; i++) {
          const a = (i / 23) * k.tau * 1.5;
          coil.push({ x: tip.x + Math.cos(a) * 8, y: tip.y + Math.sin(a) * 3 + i * 0.2 });
        }
        stroke(coil, SILVER, 1, 4);
      }
      for (let i = 0; i < 3; i++)
        if (e > 130 + i * 80) icon('rune', { x: tip.x - i * 5, y: tip.y - 5 + i * 2 }, SILVER);
    },
  });

  // Mind Sliver: a violet psychic needle materialises above the skull and drives straight into a fractured mind.
  FX.register('mind-sliver', {
    palette: PSYCHIC,
    travel: 150,
    beats: beats(105),
    end,
    air(s) {
      const t = s.c.t - k.CAST,
        e = s.real(s.hits[0]),
        T = point(s);
      if (t < 0) return;
      if (e < 110) {
        const y = T.y - 17 * (1 - k.clamp(t / 150));
        const img = k.sprite('b03:mind-needle', 7, 19, PSYCHIC, set => {
          for (let y = 2; y < 16; y++) {
            const w = y < 7 ? 1 : y < 12 ? 2 : 0;
            for (let x = 3 - w; x <= 3 + w; x++) set(x, y, x === 3 ? 5 : x < 3 ? 2 : 3);
          }
        });
        k.blit(img, T.x - 3, y - 16);
      }
      if (e >= 65 && e < 370) {
        for (const side of [-1, 1])
          stroke(
            [
              { x: T.x, y: T.y - 5 },
              { x: T.x + side * 4, y: T.y - 2 },
              { x: T.x + side * 2, y: T.y + 2 },
              { x: T.x + side * 7, y: T.y + 5 },
            ],
            PSYCHIC,
            1,
            3,
          );
      }
      mark(s, PSYCHIC, 'sliver', 26, 8);
    },
  });

  // Spare the Dying: a gentle ivory-green touch stills a wavering life-thread into a steady protective pulse.
  FX.register('spare-the-dying', {
    palette: HEAL,
    travel: 90,
    beats: beats(60, 'soft'),
    end: () => k.CAST + 900,
    ground(s) {
      const e = s.real(s.hits[0]);
      if (e < 0 || e > 600) return;
      const t = s.targets[0],
        p = t ? k.P({ x: t.baseX ?? t.x, y: t.baseY ?? t.y }) : point(s);
      ring(p, 9, 5, HEAL, 3, e > 420 ? 6 : 0);
    },
    air(s) {
      const t = s.c.t - k.CAST,
        e = s.real(s.hits[0]),
        T = point(s);
      if (t < 0 || e > 760) return;
      if (e < 0) {
        const H = k.P(s.pose.hand || s.pose.base),
          q = k.clamp(t / 90);
        ink(k.mix(H.x, T.x, q), k.mix(H.y, T.y, q), HEAL, 3, 4);
      } else {
        const amp = e < 270 ? 4 * (1 - e / 270) : 0;
        stroke(
          [
            { x: T.x - 10, y: T.y },
            { x: T.x - 4, y: T.y },
            { x: T.x - 2, y: T.y - amp },
            { x: T.x, y: T.y + amp },
            { x: T.x + 2, y: T.y },
            { x: T.x + 10, y: T.y },
          ],
          HEAL,
          1,
          4,
        );
        if (e > 160) icon('rune', { x: T.x, y: T.y - 9 }, HEAL);
        if (e < 450) for (const side of [-1, 1]) ink(T.x + side * 8, T.y - 3 - e / 70, HEAL, 1, 3);
      }
    },
  });

  // Sword Burst: six silver force-blades snap outward around the caster and shear into blue-white fragments.
  FX.register('sword-burst', {
    palette: k.palettes.fuerza,
    travel: 90,
    beats: beats(110, 'hit', true),
    end,
    ground(s) {
      const e = s.real(s.hits[0]);
      if (e < 0 || e > 350) return;
      const { p, r } = aura(s),
        q = k.ease(k.clamp(e / 220));
      ring(p, r * (0.5 + q * 0.5), r * (0.5 + q * 0.5), SILVER, 3, e > 170 ? 8 : 0);
    },
    air(s) {
      const t = s.c.t - k.CAST,
        e = s.real(s.hits[0]);
      if (t < 0) return;
      const { p, r } = aura(s),
        img = glyph('sword', SILVER);
      if (e < 210)
        for (let i = 0; i < 6; i++) {
          const a = (i * k.tau) / 6 + 0.2,
            d = r * (0.35 + 0.65 * k.ease(k.clamp(t / 90)));
          const x = p.x + Math.cos(a) * d,
            y = p.y + Math.sin(a) * d - 5;
          k.blitRotated(img, x, y, a + Math.PI / 4);
        }
      if (e >= 0) k.shards(p, e, SILVER, seed(s), 9, r + 5);
      mark(s, s.ramp, 'sword-burst', 26, 5);
    },
  });

  // Thunderclap: a white pressure snap at the caster launches a circular slate-blue shock front and dust chips.
  FX.register('thunderclap', {
    palette: THUNDER,
    travel: 0,
    beats: beats(150, 'blast', true),
    end: () => k.CAST + 650,
    flash: (event, e) =>
      e < 30 ? { color: THUNDER[5], alpha: 0.2 } : e < 70 ? { color: THUNDER[0], alpha: 0.14 } : null,
    ground(s) {
      const e = s.real(s.hits[0]);
      if (e < 0 || e > 430) return;
      const { p, r } = aura(s);
      const q = k.ease(k.clamp(e / 200));
      ring(p, Math.max(2, r * q), Math.max(2, r * q), THUNDER, e < 70 ? 4 : 3, e > 240 ? 8 : 0);
      if (e > 65 && e < 300)
        ring(p, Math.max(2, r * k.clamp((e - 65) / 200)), Math.max(2, r * k.clamp((e - 65) / 200)), THUNDER, 2, 6);
    },
    air(s) {
      const e = s.real(s.hits[0]),
        { p, r } = aura(s);
      k.drawHit(k.hitStyle('b03-clap-core', THUNDER, { S: 24, spikes: 8, jag: 0.1 }), { x: p.x, y: p.y - 7 }, e);
      k.shards(p, e, THUNDER, seed(s), 9, r + 4);
      mark(s, THUNDER, 'clap', 26, 5);
    },
  });

  // Shillelagh: a wooden cudgel at the hand gains living green knots, a winding vine and fresh leaves.
  FX.register('shillelagh', {
    palette: NATURE,
    travel: 90,
    beats: selfBeat,
    end: () => k.CAST + 930,
    air(s) {
      const t = s.c.t - k.CAST,
        e = s.real(s.hits[0]);
      if (t < 0 || e > 800) return;
      const H = k.P(s.pose.hand || s.pose.base),
        B = { x: H.x + 2, y: H.y + 5 },
        T = { x: H.x + 8, y: H.y - 16 };
      const WOOD = ['#23180f', '#49301d', '#795332', '#ac8051', '#dfbb7c', '#ffffff'];
      stroke([B, T], WOOD, 3, 2);
      k.disc(T.x, T.y, 4, WOOD[0]);
      k.disc(T.x, T.y, 3, WOOD[3]);
      if (e >= 0) {
        const pts = [];
        for (let i = 0; i < 15; i++) {
          const u = i / 14;
          pts.push({ x: k.mix(B.x, T.x, u) + Math.sin(u * k.tau * 2) * 3, y: k.mix(B.y, T.y, u) });
        }
        stroke(pts, NATURE, 1, 3);
        icon('leaf', { x: T.x + 4, y: T.y }, NATURE);
        if (e > 120) icon('leaf', { x: H.x - 1, y: H.y - 6 }, NATURE);
        k.shards(T, e, NATURE, seed(s), 5, 12);
      }
    },
  });

  // Blade Ward: a blue abjuration shield locks in front of the caster and turns aside two spectral blades.
  FX.register('blade-ward', {
    palette: MAGIC,
    travel: 0,
    beats: selfBeat,
    end: () => k.CAST + 840,
    ground(s) {
      const e = s.real(s.hits[0]);
      if (e < 0 || e > 680) return;
      const p = k.P(s.pose.base || s.pose.hand);
      ring(p, 11, 6, SILVER, 3, e > 520 ? 6 : 0);
    },
    air(s) {
      const e = s.real(s.hits[0]);
      if (e < 0 || e > 800) return;
      const H = k.P(s.pose.hand || s.pose.base),
        p = { x: H.x, y: H.y - 2 };
      icon('shield', p, SILVER);
      if (e > 550) {
        icon('rune', { x: p.x, y: p.y - 9 }, MAGIC);
        return;
      }
      for (const side of [-1, 1]) {
        const q = k.clamp(e / 200),
          out = k.ease(k.clamp((e - 200) / 300));
        const x = p.x + side * (16 - q * 10 + out * 15),
          y = p.y - 3 + out * 9;
        k.blitRotated(glyph('sword', STEEL), x, y, side * (0.8 + out));
        if (e >= 200) {
          const at = { x: p.x + side * 6, y: p.y - 2 };
          k.drawHit(k.hitStyle('b03-ward-parry', SILVER, { S: 16, spikes: 4, jag: 0.1 }), at, e - 200);
          k.shards(at, e - 200, SILVER, seed(s) + side, 4, 12);
        }
      }
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
