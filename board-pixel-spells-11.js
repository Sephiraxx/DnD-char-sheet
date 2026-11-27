/* Pixel spells, batch 11 (see docs/pixel-spells/BRIEF.md). */
(function (root) {
  'use strict';
  const FX = root.BoardPixelFX;
  if (!FX) return;
  const k = FX.kit;
  const SILVER = ['#151b30', '#3a4862', '#74899e', '#b4d3e4', '#ecf8ff', '#ffffff'];
  const FORCE = ['#111d32', '#304b78', '#598fac', '#9ddadd', '#e4fcf5', '#ffffff'];
  const MIND = ['#240d2a', '#64205b', '#a94391', '#ee7cc7', '#ffdaef', '#ffffff'];
  const EARTH = ['#261b17', '#594031', '#946547', '#c79864', '#f1d5a1', '#ffffff'];
  const ROPE = ['#241a13', '#655032', '#a37d48', '#d4b879', '#f8e9b6', '#ffffff'];
  const BOND = ['#11261d', '#355e36', '#73a64a', '#badb7d', '#f4f0bc', '#ffffff'];
  const STRIDE = ['#202318', '#5b6331', '#9ba344', '#dce27b', '#fff3bf', '#ffffff'];
  const FIRE = ['#2b100e', '#731e16', '#bf3e1c', '#f77c24', '#ffcf61', '#ffffff'];
  const SMOKE = ['#1b171b', '#382f36', '#5d4f53', '#8c7a77', '#c4b2a3', '#ffffff'];
  const SIZE = ['#231334', '#52307d', '#9564c6', '#d3a3f5', '#f7e1ff', '#ffffff'];
  const AIR = ['#102437', '#2e607e', '#66a6c2', '#b1e5ee', '#efffff', '#ffffff'];
  const CHANGE = ['#142a29', '#32635b', '#61ac96', '#a8e0c0', '#e8ffda', '#ffffff'];
  const GOLD = ['#291c16', '#775329', '#ba913c', '#f1d272', '#fff1bd', '#ffffff'];
  const ARCANE = ['#14152f', '#3e3c7b', '#7970c6', '#bbb7ff', '#f3eeff', '#ffffff'];
  const seed = s => s.event.seed || 0;
  const finish = tail => (event, travel) => k.CAST + travel + tail;
  const beats =
    (stop = 60, kind = 'soft') =>
    (event, kit, travel) =>
      (event.targets?.length ? event.targets : [null]).map(target => ({
        at: kit.CAST + travel,
        stop,
        target,
        kind,
        power: kind === 'soft' ? 0.03 : 0.075,
      }));
  function caster(s) {
    const p = s.pose.base || s.pose.hand || s.pose.target || { x: 0, y: 0 };
    return { x: p.x, y: p.y - 0.55, baseX: p.x, baseY: p.y, span: p.span || 1 };
  }
  function subject(s, hit = s.hits[0], self = true) {
    const t = s.targets.find(t => hit?.id != null && t.id === hit.id);
    if (t) return t;
    if (!self) return s.targets[0] || caster(s);
    return s.event.targets?.length ? s.targets[0] || caster(s) : caster(s);
  }
  const feet = t => k.P({ x: t.baseX ?? t.x, y: t.baseY ?? t.y + 0.55 });
  const centre = s => k.P(s.area || s.pose.target || s.pose.base || s.pose.hand || { x: 0, y: 0 });
  function pixel(x, y, ramp, index = 3, size = 1) {
    k.dot(x, y, ramp[0], size + 2);
    k.dot(x, y, ramp[index], size);
  }
  function ball(x, y, r, ramp, index = 3) {
    k.disc(x, y, r + 1, ramp[0]);
    k.disc(x, y, r, ramp[index]);
  }
  function stroke(points, ramp, index = 3, width = 1, budget = 45) {
    const lengths = points.slice(1).map((p, i) => Math.hypot(p.x - points[i].x, p.y - points[i].y));
    const total = lengths.reduce((a, b) => a + b, 0) || 1;
    for (const outer of [true, false]) {
      for (let j = 1; j < points.length; j++) {
        const n = Math.max(1, Math.ceil(Math.min(lengths[j - 1], (budget * lengths[j - 1]) / total)));
        for (let i = j === 1 ? 0 : 1; i <= n; i++) {
          k.dot(
            k.mix(points[j - 1].x, points[j].x, i / n),
            k.mix(points[j - 1].y, points[j].y, i / n),
            ramp[outer ? 0 : index],
            width + (outer ? 2 : 0),
          );
        }
      }
    }
  }
  // Cached, banded rings keep even the large ground waves cheap.
  function ring(p, rx, ry, ramp, index = 3, broken = false, phase = 0) {
    rx = Math.max(2, Math.round(rx));
    ry = Math.max(2, Math.round(ry));
    const w = 2 * rx + 5,
      h = 2 * ry + 5;
    const img = k.sprite(`11:ring:${rx}:${ry}:${ramp[2]}:${index}:${broken}:${phase % 4}`, w, h, ramp, set => {
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const dx = (x - rx - 2) / rx,
            dy = (y - ry - 2) / ry;
          if (Math.abs(Math.hypot(dx, dy) - 1) * Math.min(rx, ry) > 0.65) continue;
          if (broken && (Math.floor(((Math.atan2(dy, dx) + Math.PI) * 6) / Math.PI) + phase) % 4 === 0) continue;
          set(x, y, index);
        }
      }
    });
    k.blit(img, p.x - rx - 2, p.y - ry - 2);
  }
  const ICONS = {
    barb: ['.....5.', '....45.', '...343.', '..343..', '.3434..', '232.43.', '.1...2.'],
    star: ['...5...', '...4...', '..343..', '5434345', '..343..', '...4...', '...5...'],
    paw: ['.33...33.', '3443.3443', '.33.3.33.', '...343...', '..34443..', '.3444443.', '.3444443.', '..33333..'],
    eye: ['...333...', '.3344433.', '344151443', '.3344433.', '...333...'],
    boot: ['.333...', '.343...', '.343...', '.343...', '.34433.', '.344443', '.222223'],
    glove: ['..4.4..', '.43434.', '.43434.', '.43434.', '444444.', '344443.', '.3443..', '..33...'],
    knot: ['..3333..', '.343343.', '.342243.', '..3443..', '..3443..', '.343343.', '..3333..'],
    jaw: [
      '..33....33...',
      '.3443..3443..',
      '.34443344433.',
      '..34444444443',
      '...344544443.',
      '..344444443..',
      '.343.4.4.3...',
      '..3..3.3.....',
    ],
    face: [
      '..333333..',
      '.34444443.',
      '3444444443',
      '3442442443',
      '3444444443',
      '.34424443.',
      '..344443..',
      '...3333...',
    ],
    scale: ['...3...', '..343..', '.34443.', '3445443', '.34443.', '..333..'],
    lock: [
      '..3333..',
      '.344443.',
      '.34..43.',
      '.34..43.',
      '33333333',
      '34444443',
      '34411443',
      '34411443',
      '34444443',
      '33333333',
    ],
    openLock: [
      '...33333....',
      '..3444443...',
      '..34...43...',
      '..34....3...',
      '..34........',
      '..34........',
      '.33333333...',
      '.34444443...',
      '.34411443...',
      '.34411443...',
      '.34444443...',
      '.33333333...',
    ],
    key: ['..333......', '.34443.....', '.34.43.....', '.344433333.', '..33344443.', '.....33.33.'],
    sword: [
      '...5...',
      '..454..',
      '..454..',
      '..454..',
      '..454..',
      '..454..',
      '..343..',
      '3344433',
      '..232..',
      '..232..',
      '..333..',
    ],
    person: [
      '...333...',
      '..34443..',
      '..34443..',
      '...333...',
      '..33333..',
      '.33.3.33.',
      '.3..3..3.',
      '.3..3..3.',
      '....3....',
      '...333...',
      '...3.3...',
      '...3.3...',
      '..33.33..',
    ],
  };
  function icon(name, p, ramp, scale = 1, angle = 0) {
    const rows = ICONS[name],
      w = rows[0].length * scale + 2,
      h = rows.length * scale + 2;
    const img = k.sprite(`11:icon:${name}:${ramp[2]}:${scale}`, w, h, ramp, set => {
      rows.forEach((row, y) =>
        [...row].forEach((c, x) => {
          if (c === '.') return;
          for (let yy = 0; yy < scale; yy++)
            for (let xx = 0; xx < scale; xx++) set(1 + x * scale + xx, 1 + y * scale + yy, Number(c));
        }),
      );
    });
    if (angle) k.blitRotated(img, p.x, p.y, angle);
    else k.blit(img, p.x - w / 2, p.y - h / 2);
  }
  function impact(s, hit, p, ramp, key, size = 20, n = 5, reach = 15) {
    const e = s.real(hit);
    k.drawHit(k.hitStyle(`11:${key}`, ramp, { S: size, spikes: 5, jag: 0.3 }), p, e);
    k.shards(p, e, ramp, seed(s) + s.hits.indexOf(hit) * 19, n, reach);
  }
  function blessingGround(s, ramp) {
    s.hits.forEach(hit => {
      const e = s.real(hit);
      if (e < 0 || e > 340) return;
      const p = feet(subject(s, hit));
      ring(p, 9 + k.ease(e / 340) * 6, 4 + k.ease(e / 340) * 3, ramp, e < 65 ? 4 : 3, e > 200);
    });
  }
  const breathRamp = event =>
    ({
      fire: FIRE,
      frost: ['#0e2035', '#27588a', '#4c9bc9', '#9ddcff', '#e8fcff', '#ffffff'],
      lightning: ['#171b39', '#3d4694', '#727fec', '#b9ceff', '#f4fbff', '#ffffff'],
      ácido: ['#1b270c', '#526a20', '#98b431', '#d7ed70', '#f7ffce', '#ffffff'],
      veneno: ['#17251b', '#3c6440', '#79a450', '#b7d978', '#eaffc6', '#ffffff'],
    })[event.element] || FIRE;

  // Silvery Barbs: cruel silver hooks cinch a foe, then a stolen lucky star skips to an ally.
  FX.register('silvery', {
    palette: SILVER,
    travel: 170,
    beats: (event, kit, travel) => [
      { at: kit.CAST + travel, stop: 75, target: event.targets?.[0] ?? null, kind: 'soft', power: 0.03 },
      { at: kit.CAST + travel + 260, stop: 55, target: event.targets?.[1] ?? null, kind: 'soft', power: 0.03 },
    ],
    end: finish(750),
    air(s) {
      const [snag, luck] = s.hits,
        foe = k.P(subject(s, snag, false));
      const ally = k.P(luck.id != null ? subject(s, luck) : caster(s));
      const t = s.c.t - k.CAST;
      if (t < 0) return;
      if (t < 390) {
        const r = t < 170 ? k.mix(18, 8, k.ease(t / 170)) : 8 + k.clamp((t - 170) / 220) * 3;
        ring(foe, r, r * 0.7, SILVER, 3, t > 280);
        for (let i = 0; i < 4; i++) {
          const a = (i * k.tau) / 4 + Math.floor(t / 60) * 0.25;
          icon('barb', { x: foe.x + Math.cos(a) * r, y: foe.y + Math.sin(a) * r * 0.7 }, SILVER, 1, a + Math.PI);
        }
      }
      impact(s, snag, foe, SILVER, 'silver-snag', 24, 6, 17);
      if (s.c.t >= snag.at && s.c.t < luck.at) {
        const q = (s.c.t - snag.at) / (luck.at - snag.at);
        const at = u => ({ x: k.mix(foe.x, ally.x, u), y: k.mix(foe.y, ally.y - 13, u) - Math.sin(u * Math.PI) * 10 });
        for (let i = 1; i <= 5; i++) {
          const u = q - i * 0.055;
          if (u >= 0) {
            const p = at(u);
            pixel(p.x, p.y, SILVER, i < 3 ? 4 : 2);
          }
        }
        icon('star', at(q), SILVER);
      }
      const e = s.real(luck);
      if (e >= 0 && e < 430) icon('star', { x: ally.x, y: ally.y - 13 - Math.floor(e / 110) }, SILVER);
      impact(s, luck, { x: ally.x, y: ally.y - 13 }, SILVER, 'silver-boon', 18, 4, 12);
    },
  });

  // Unseen Servant: an empty pair of spectral gloves lift a tray while a broom sweeps itself.
  FX.register('unseen-servant', {
    palette: FORCE,
    travel: 160,
    beats: beats(65),
    end: finish(950),
    ground(s) {
      const e = s.c.t - k.CAST;
      if (e < 0 || e > 760) return;
      const p = centre(s);
      ring(p, 10 + Math.min(5, e / 45), 5, FORCE, 3, e > 370, Math.floor(e / 100));
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2 + 0.4;
        pixel(p.x + Math.cos(a) * 12, p.y + Math.sin(a) * 5, FORCE, 4);
      }
    },
    air(s) {
      const t = s.c.t - k.CAST,
        p = centre(s);
      if (t < 0) return;
      const y = p.y - 6 - 7 * k.ease(k.clamp(t / 160));
      const bob = Math.floor(Math.sin(t / 100) * 1.5);
      if (t < 850) {
        const gap = t > 680 ? Math.floor((t - 680) / 45) : 0;
        stroke(
          [
            { x: p.x - 9, y: y + bob },
            { x: p.x - 6, y: y + 3 + bob },
            { x: p.x + 7, y: y + 3 + bob },
            { x: p.x + 10, y: y + bob },
          ],
          FORCE,
          3,
          1,
          30,
        );
        if (gap < 2) {
          icon('glove', { x: p.x - 9, y: y + 5 + bob }, FORCE);
          icon('glove', { x: p.x + 10, y: y + 5 + bob }, FORCE);
        }
        const sweep = Math.sin(t / 95) * 3;
        stroke(
          [
            { x: p.x + 15, y: y - 7 },
            { x: p.x + 12 + sweep, y: p.y - 1 },
          ],
          ROPE,
          3,
          1,
          20,
        );
        for (let j = -2; j <= 2; j++) pixel(p.x + 12 + sweep + j, p.y + 1 - Math.abs(j), ROPE, 3);
        if (t > 260 && t < 650)
          for (let i = 0; i < 3; i++) {
            const q = ((t + i * 90) % 270) / 270;
            pixel(p.x + 13 - q * 13, p.y + 3 - Math.sin(q * Math.PI) * 3, FORCE, 2);
          }
      }
      impact(s, s.hits[0], { x: p.x, y }, FORCE, 'servant', 20, 4, 13);
    },
  });

  // Dissonant Whispers: broken pink sound ribbons worm into a temple and burst into panicked mind shards.
  FX.register('dissonant-whispers', {
    palette: MIND,
    travel: 240,
    beats: beats(125, 'hit'),
    end: finish(560),
    air(s) {
      const H = k.P(s.pose.hand || s.pose.base || subject(s));
      s.hits.forEach(hit => {
        const target = subject(s, hit, false),
          T = k.P(k.contact(target, s.pose.hand || target));
        const dx = T.x - H.x,
          dy = T.y - H.y,
          L = Math.hypot(dx, dy) || 1;
        const nx = -dy / L,
          ny = dx / L;
        const t = s.c.t - k.CAST;
        if (t >= 0 && t < 240) {
          const q = t / 240;
          for (let i = 0; i < 3; i++) {
            const u = q - i * 0.14;
            if (u < 0) continue;
            const p = { x: k.mix(H.x, T.x, u), y: k.mix(H.y, T.y, u) };
            const points = [];
            for (let j = 0; j < 7; j++) {
              const z = j - 3,
                wobble = (j % 2 ? 1 : -1) * (3 - Math.abs(z) * 0.5);
              points.push({ x: p.x + nx * z * 2 + (dx / L) * wobble, y: p.y + ny * z * 2 + (dy / L) * wobble });
            }
            stroke(points, MIND, i === 0 ? 4 : 2, 1, 18);
          }
        }
        impact(s, hit, T, MIND, 'whispers', 32, 8, 23);
        const e = s.real(hit);
        if (e >= 70 && e < 430) {
          for (let i = 0; i < 3; i++) {
            const r = 8 + i * 5 + k.ease(k.clamp(e / 430)) * 8;
            const p = { x: T.x + (dx / L) * r, y: T.y + (dy / L) * r };
            stroke(
              [
                { x: p.x - (dx / L) * 3 + nx * 3, y: p.y - (dy / L) * 3 + ny * 3 },
                p,
                { x: p.x - (dx / L) * 3 - nx * 3, y: p.y - (dy / L) * 3 - ny * 3 },
              ],
              MIND,
              i === 0 ? 4 : 2,
              1,
              10,
            );
          }
        }
      });
    },
  });

  // Earth Tremor: a caster-centred ten-foot shock fractures the floor and kicks ochre stones into the air.
  FX.register('earth-tremor', {
    palette: EARTH,
    travel: 60,
    beats: beats(160, 'blast'),
    end: finish(900),
    flash: (event, e) =>
      e < 30 ? { color: '#f1d5a1', alpha: 0.16 } : e < 65 ? { color: EARTH[0], alpha: 0.13 } : null,
    ground(s) {
      const e = s.real(s.hits[0]);
      if (e < 0 || e > 1000) return;
      const p = k.P(s.area || s.pose.base || s.pose.hand),
        R = ((s.area?.feet || 10) / (s.grid.feet || 5)) * k.PX;
      const stage = Math.min(3, Math.floor(e / 100)),
        dim = e > 690;
      const size = Math.ceil(R * 2 + 7),
        c = size / 2;
      const img = k.sprite(`11:quake:${R}:${stage}:${dim}:${seed(s)}`, size, size, EARTH, set => {
        for (let i = 0; i < 7; i++) {
          const a = (i * k.tau) / 7 + k.hash(i, seed(s)) * 0.25;
          const length = (R * (0.65 + k.hash(i, seed(s), 1) * 0.3) * (stage + 1)) / 4;
          for (let d = 3; d < length; d++) {
            const side = Math.floor(d / 5) % 2 ? 2 : 0;
            const x = Math.round(c + Math.cos(a) * d - Math.sin(a) * side);
            const y = Math.round(c + Math.sin(a) * d + Math.cos(a) * side);
            set(x, y, 1);
            set(x + 1, y - 1, dim ? 2 : 4);
            if (d > length * 0.65 && i % 2 === 0) set(x + 3, y, 2);
          }
        }
      });
      k.blit(img, p.x - c, p.y - c);
      if (e < 360) ring(p, R * k.ease(k.clamp(e / 230)), R * k.ease(k.clamp(e / 230)), EARTH, e < 45 ? 4 : 3, e > 180);
      if (e > 170 && e < 620) ring(p, R * 0.85, R * 0.85, EARTH, 2, true, Math.floor(e / 110));
    },
    air(s) {
      const e = s.real(s.hits[0]);
      const C = k.P(s.area || s.pose.base || s.pose.hand),
        R = ((s.area?.feet || 10) / (s.grid.feet || 5)) * k.PX;
      if (e >= 0 && e < 550) {
        const q = e / 550;
        for (let i = 0; i < 12; i++) {
          const a = k.hash(i, seed(s)) * k.tau,
            r = R * (0.3 + k.hash(i, seed(s), 1) * 0.62);
          const x = C.x + Math.cos(a) * r,
            y = C.y + Math.sin(a) * r - Math.sin(q * Math.PI) * (5 + k.hash(i, seed(s), 2) * 9);
          ball(x, y, i % 3 === 0 ? 2 : 1, EARTH, q > 0.75 ? 2 : 3);
        }
      }
      s.hits.forEach(hit => impact(s, hit, feet(subject(s, hit, false)), EARTH, 'tremor', 27, 5, 15));
    },
  });

  // Snare: a braided rope uncoils into a ground loop, locks its knot, then becomes magically invisible.
  FX.register('snare', {
    palette: ROPE,
    travel: 240,
    beats: (event, kit, travel) => [{ at: kit.CAST + travel, stop: 70, target: null, kind: 'soft', power: 0.03 }],
    end: finish(750),
    ground(s) {
      const t = s.c.t - k.CAST;
      if (t < 0 || t > 850) return;
      const C = centre(s),
        R = ((s.area?.feet || 5) / (s.grid.feet || 5)) * k.PX;
      const r = Math.round(R * k.mix(0.35, 1, k.ease(k.clamp(t / 240))));
      const phase = Math.floor(Math.max(0, t - 490) / 85);
      const size = Math.ceil(R * 2 + 9),
        mid = size / 2;
      const img = k.sprite(`11:snare:${Math.round(R)}:${Math.round(r)}:${phase}`, size, size, ROPE, set => {
        for (let y = 1; y < size - 1; y++)
          for (let x = 1; x < size - 1; x++) {
            const dx = x - mid,
              dy = y - mid;
            if (Math.abs(Math.hypot(dx, dy) - r) > 1.15) continue;
            const a = Math.atan2(dy, dx) + Math.PI;
            if (phase > 0 && Math.floor(a * 8) % 5 < phase) continue;
            set(x, y, (Math.round(a * r) + x + y) % 5 < 2 ? 4 : 2);
          }
      });
      k.blit(img, C.x - mid, C.y - mid);
      if (t < 650) {
        const knot = { x: C.x + r, y: C.y };
        icon('knot', knot, ROPE);
        stroke([knot, { x: knot.x + 4, y: knot.y - 5 }, { x: knot.x + 3, y: knot.y - 9 }], ROPE, 3, 1, 14);
      }
    },
    air(s) {
      const C = centre(s),
        R = ((s.area?.feet || 5) / (s.grid.feet || 5)) * k.PX;
      impact(s, s.hits[0], { x: C.x + R, y: C.y }, ROPE, 'snare-knot', 18, 4, 10);
      const e = s.real(s.hits[0]);
      if (e >= 280 && e < 640)
        for (let i = 0; i < 4; i++) {
          const a = (i * Math.PI) / 2,
            q = (e - 280) / 360;
          icon('star', { x: C.x + Math.cos(a) * R, y: C.y + Math.sin(a) * R - q * 6 }, SILVER);
        }
    },
  });

  // Beast Bond: a green-gold thought thread carries paw-shaped pulses between caster and beast.
  FX.register('beast-bond', {
    palette: BOND,
    travel: 180,
    beats: beats(60),
    end: finish(850),
    ground: s => blessingGround(s, BOND),
    air(s) {
      const H = k.P(caster(s)),
        t = s.c.t - k.CAST;
      if (t < 0 || t > 970) return;
      s.hits.forEach(hit => {
        const T = k.P(subject(s, hit)),
          dx = T.x - H.x,
          dy = T.y - H.y;
        const at = q => ({ x: k.mix(H.x, T.x, q), y: k.mix(H.y, T.y, q) - Math.sin(q * Math.PI) * 11 });
        if (t < 720) {
          const points = Array.from({ length: 17 }, (_, i) => at(i / 16));
          stroke(points, BOND, 2, 1, 60);
          for (let i = 0; i < 2; i++) {
            const q = (t / 490 + i / 2) % 1,
              u = i ? 1 - q : q;
            const p = at(u);
            ball(p.x, p.y, 2, BOND, 4);
          }
        }
        if (t > 160 && t < 850) {
          icon('eye', { x: H.x, y: H.y - 14 }, BOND);
          icon('paw', { x: T.x, y: T.y - 14 }, BOND);
          if (Math.hypot(dx, dy) < 1) icon('paw', { x: T.x + 11, y: T.y - 10 }, BOND);
        }
        impact(s, hit, { x: T.x, y: T.y - 14 }, BOND, 'beast-bond', 18, 4, 12);
      });
    },
  });

  // Longstrider: gold-green boots stamp a lengthening trail of footprints and quick forward chevrons.
  FX.register('longstrider', {
    palette: STRIDE,
    travel: 80,
    beats: beats(65),
    end: finish(750),
    ground(s) {
      s.hits.forEach(hit => {
        const t = s.c.t - k.CAST,
          F = feet(subject(s, hit));
        if (t < 0 || t > 780) return;
        const step = Math.min(4, Math.floor(t / 105));
        for (let i = 0; i <= step; i++) {
          if (t > 530 + i * 35) continue;
          const x = F.x - 12 + i * (4 + i),
            y = F.y + (i % 2 ? 4 : -2);
          icon('boot', { x, y }, STRIDE, 1, Math.PI / 2);
        }
        if (t < 430) ring(F, 12 + Math.floor(t / 80), 5, STRIDE, 3, true);
      });
    },
    air(s) {
      s.hits.forEach(hit => {
        const F = feet(subject(s, hit)),
          e = s.real(hit);
        impact(s, hit, { x: F.x, y: F.y - 3 }, STRIDE, 'longstrider', 20, 5, 14);
        if (e < 0 || e > 560) return;
        for (let i = 0; i < 3; i++) {
          const x = F.x + 5 + i * 5 + Math.floor(k.ease(k.clamp(e / 560)) * 9);
          stroke(
            [
              { x: x - 3, y: F.y - 12 },
              { x, y: F.y - 9 },
              { x: x - 3, y: F.y - 6 },
            ],
            STRIDE,
            i === 2 ? 4 : 3,
            1,
            8,
          );
        }
      });
    },
  });

  // Aganazzar's Scorcher: a full thirty-foot lane snaps white-hot, burns in orange bands, then leaves ash.
  FX.register('aganazzars-scorcher', {
    palette: FIRE,
    travel: 35,
    beats: beats(145, 'beam'),
    end: finish(1050),
    flash: (event, e) => (e < 28 ? { color: FIRE[4], alpha: 0.22 } : e < 65 ? { color: FIRE[0], alpha: 0.16 } : null),
    ground(s) {
      const t = s.c.t - k.CAST;
      if (t < 0 || t > 1080) return;
      const a = s.area,
        H = k.P(a || s.pose.base || s.pose.hand);
      const aim = k.P(s.pose.target || subject(s, s.hits[0], false));
      const dir = a?.dir ?? Math.atan2(aim.y - H.y, aim.x - H.x);
      const L = ((a?.feet || 30) / (s.grid.feet || 5)) * k.PX;
      const W = ((a?.width || 5) / (s.grid.feet || 5)) * k.PX;
      const f = Math.min(10, Math.floor(t / 85));
      const ux = Math.cos(dir),
        uy = Math.sin(dir);
      const margin = W / 2 + 5;
      const x0 = Math.floor(Math.min(0, ux * L) - margin),
        y0 = Math.floor(Math.min(0, uy * L) - margin);
      const width = Math.ceil(Math.abs(ux * L) + margin * 2 + 2),
        height = Math.ceil(Math.abs(uy * L) + margin * 2 + 2);
      const img = k.sprite(`11:scorcher:${L}:${W}:${dir}:${f}:${seed(s)}`, width, height, FIRE, set => {
        // Rasterise in the template's actual direction; only decorative sprites snap headings.
        for (let x = 1; x < width - 1; x++) {
          for (let y = 1; y < height - 1; y++) {
            const dx = x + x0,
              dy = y + y0;
            const along = dx * ux + dy * uy,
              across = -dx * uy + dy * ux;
            if (along < 0 || along > L) continue;
            const u = along / L,
              d = Math.abs(across);
            const tooth = ((along + f * 3 + (across > 0 ? 5 : 0)) % 13) / 13;
            const edge = W * (0.28 + 0.22 * (1 - tooth) ** 2);
            if (d > edge) continue;
            if (f >= 7) {
              const chunk = Math.floor(along / 6);
              if (chunk % 5 === 0 || d > W * (0.15 + k.hash(chunk, seed(s)) * 0.12)) continue;
              set(x, y, f < 9 && Math.floor(along + across) % 7 === 0 ? 3 : 1);
            } else {
              const v = d / edge;
              const curl = Math.sin(along * 0.34 - f * 1.7 + across * 0.65);
              set(x, y, f === 0 ? 5 : v < 0.18 && curl > 0 ? 5 : v < 0.48 ? 4 : v < 0.8 ? 3 : 2);
              if (f > 3 && u > 0.2 && curl < -0.5 && v > 0.5) set(x, y, 1);
            }
          }
        }
      });
      k.blit(img, H.x + x0, H.y + y0);
    },
    air(s) {
      const a = s.area,
        H = k.P(a || s.pose.base || s.pose.hand),
        e = s.real(s.hits[0]);
      const aim = k.P(s.pose.target || subject(s, s.hits[0], false));
      const dir = a?.dir ?? Math.atan2(aim.y - H.y, aim.x - H.x),
        ux = Math.cos(dir),
        uy = Math.sin(dir);
      const L = ((a?.feet || 30) / (s.grid.feet || 5)) * k.PX;
      if (e >= 0 && e < 770)
        for (let i = 0; i < 12; i++) {
          const u = (i + 0.4) / 12,
            q = ((e + k.hash(i, seed(s)) * 240) % 360) / 360;
          const side = (k.hash(i, seed(s), 2) - 0.5) * 10;
          const x = H.x + ux * L * u - uy * side,
            y = H.y + uy * L * u + ux * side - q * 13;
          if (e < 450) pixel(x, y, FIRE, q < 0.3 ? 5 : 3, q < 0.5 ? 2 : 1);
          else if (i % 2 === 0) ball(x, y, 2 + Math.floor(q * 2), SMOKE, 2);
        }
      s.hits.forEach(hit => {
        const target = subject(s, hit, false);
        impact(s, hit, k.P(k.contact(target, s.pose.hand || target)), FIRE, 'scorcher', 29, 6, 21);
      });
    },
  });

  // Enlarge / Reduce: violet measuring brackets expand a hollow giant silhouette, then fold to a tiny twin.
  FX.register('enlarge-reduce', {
    palette: SIZE,
    travel: 120,
    beats: beats(75),
    end: finish(1050),
    ground: s => blessingGround(s, SIZE),
    air(s) {
      const t = s.c.t - k.CAST;
      if (t < 0 || t > 1130) return;
      s.hits.forEach(hit => {
        const F = feet(subject(s, hit)),
          large = t >= 120 && t < 610;
        const scale = large ? 2 : 1,
          h = large ? 28 : 14;
        // The glyph has an open torso so the actual miniature stays legible.
        icon('person', { x: F.x, y: F.y - h / 2 - 2 }, SIZE, scale);
        const q = t < 120 ? k.ease(t / 120) : t < 610 ? 1 : 1 - k.ease(k.clamp((t - 610) / 210));
        const spread = Math.round(8 + q * 10),
          height = Math.round(14 + q * 15);
        const brackets = k.sprite(`11:measure:${spread}:${height}`, spread * 2 + 5, height + 5, SIZE, set => {
          for (const side of [-1, 1]) {
            const x = 2 + (side < 0 ? 0 : spread * 2);
            for (let y = 0; y <= height; y++) set(x, y + 2, 3);
            for (let d = 0; d <= 4; d++) {
              set(x - side * d, 2, 4);
              set(x - side * d, height + 2, 3);
            }
          }
        });
        k.blit(brackets, F.x - spread - 2, F.y - height - 2);
        for (const side of [-1, 1]) {
          const x = F.x + side * spread;
          const y = F.y - h / 2;
          const dir = t < 610 ? side : -side;
          stroke(
            [
              { x: x - dir * 3, y: y - 3 },
              { x, y },
              { x: x - dir * 3, y: y + 3 },
            ],
            SIZE,
            4,
            1,
            10,
          );
        }
        impact(s, hit, { x: F.x, y: F.y - 12 }, SIZE, 'size', 23, 5, 17);
      });
    },
  });

  // Air Bubble: a clear cyan globe snaps around the head, with a bright rim and tiny circulating air beads.
  FX.register('air-bubble', {
    palette: AIR,
    travel: 100,
    beats: beats(60),
    end: finish(850),
    air(s) {
      const t = s.c.t - k.CAST;
      if (t < 0 || t > 910) return;
      s.hits.forEach(hit => {
        const T = k.P(subject(s, hit)),
          C = { x: T.x, y: T.y - 7 };
        const r = Math.round(t < 100 ? 7 + 3 * k.ease(t / 100) : t < 220 ? 10 - k.clamp((t - 100) / 120) : 9);
        ring(C, r, r + 1, AIR, 3, t > 740);
        stroke(
          [
            { x: C.x - r + 3, y: C.y - 3 },
            { x: C.x - r + 4, y: C.y - 6 },
            { x: C.x - r + 7, y: C.y - 8 },
          ],
          AIR,
          5,
          1,
          10,
        );
        if (t < 730)
          for (let i = 0; i < 3; i++) {
            const a = (i * k.tau) / 3 + t / 250;
            ball(C.x + Math.cos(a) * (r - 3), C.y + Math.sin(a) * (r - 2), 1, AIR, 4);
          }
        impact(s, hit, { x: C.x + r, y: C.y }, AIR, 'air-bubble', 16, 4, 10);
      });
    },
  });

  // Dragon's Breath: draconic jaws crown the recipient as a chosen-element ember coils into their throat.
  FX.register('dragons-breath', {
    palette: breathRamp,
    travel: 180,
    beats: beats(80),
    end: finish(850),
    ground: s => blessingGround(s, s.ramp),
    air(s) {
      const t = s.c.t - k.CAST,
        ramp = s.ramp;
      if (t < 0 || t > 960) return;
      s.hits.forEach(hit => {
        const T = k.P(subject(s, hit)),
          mouth = { x: T.x + 4, y: T.y - 5 };
        if (t < 180) {
          const q = t / 180,
            a = q * k.tau * 1.2,
            r = 17 * (1 - q);
          ball(mouth.x + Math.cos(a) * r, mouth.y + Math.sin(a) * r * 0.6, 3, ramp, 4);
          for (let i = 1; i <= 4; i++) {
            const u = Math.max(0, q - i * 0.07),
              rr = 17 * (1 - u),
              aa = u * k.tau * 1.2;
            pixel(mouth.x + Math.cos(aa) * rr, mouth.y + Math.sin(aa) * rr * 0.6, ramp, 3);
          }
        }
        if (t > 160 && t < 820) {
          icon('jaw', { x: T.x, y: T.y - 18 }, ramp);
          const phase = Math.floor(t / 75) % 3;
          ball(mouth.x, mouth.y, phase === 0 ? 3 : 2, ramp, 4);
          for (let i = 0; i < 3; i++) {
            const q = ((t + i * 90) % 270) / 270;
            pixel(mouth.x + 3 + q * 7, mouth.y - q * 4, ramp, q < 0.4 ? 4 : 2);
          }
        }
        impact(s, hit, mouth, ramp, `breath:${ramp[2]}`, 23, 5, 15);
      });
    },
  });

  // Alter Self: a green transformation scan crosses a split face, leaving scales, gill slashes and claw tips.
  FX.register('alter-self', {
    palette: CHANGE,
    travel: 160,
    beats: beats(65),
    end: finish(900),
    ground: s => blessingGround(s, CHANGE),
    air(s) {
      const t = s.c.t - k.CAST;
      if (t < 0 || t > 1000) return;
      s.hits.forEach(hit => {
        const T = k.P(subject(s, hit)),
          F = feet(subject(s, hit));
        if (t < 640) {
          const scan = F.y - 23 + k.clamp(t / 560) * 25;
          ring({ x: F.x, y: scan }, 11, 3, CHANGE, 4);
          if (t > 150) {
            icon('face', { x: T.x, y: T.y - 16 }, CHANGE);
            // Gill marks on one side of the face and a scaled shoulder on the other.
            for (let i = 0; i < 3; i++)
              stroke(
                [
                  { x: T.x - 8, y: T.y - 8 + i * 3 },
                  { x: T.x - 5, y: T.y - 10 + i * 3 },
                ],
                CHANGE,
                3,
                1,
                4,
              );
            icon('scale', { x: T.x + 10, y: T.y - 2 }, CHANGE);
          }
        }
        if (t > 540 && t < 880) {
          for (let i = 0; i < 3; i++)
            stroke(
              [
                { x: T.x + 7 + i * 3, y: T.y + 5 },
                { x: T.x + 10 + i * 3, y: T.y - 2 },
              ],
              CHANGE,
              4,
              1,
              8,
            );
          icon('scale', { x: T.x - 9, y: T.y + 1 }, CHANGE);
        }
        impact(s, hit, { x: T.x, y: T.y - 9 }, CHANGE, 'alter-self', 21, 5, 14);
      });
    },
  });

  // Knock: a golden key strikes a lock; its shackle jumps open with a sharp, expanding thunder ring.
  FX.register('knock', {
    palette: GOLD,
    travel: 200,
    beats: (event, kit, travel) => [{ at: kit.CAST + travel, stop: 115, target: null, kind: 'hit', power: 0.03 }],
    end: finish(700),
    air(s) {
      const T = k.P(s.pose.target || subject(s, s.hits[0], false)),
        t = s.c.t - k.CAST;
      if (t < 0) return;
      const e = s.real(s.hits[0]);
      if (t < 200) {
        icon('lock', T, GOLD, 2);
        icon('key', { x: T.x - 20 + 13 * k.ease(t / 200), y: T.y + 2 }, GOLD);
      } else if (e < 660) {
        icon('openLock', { x: T.x, y: T.y - 3 }, GOLD, 2);
        if (e < 400) {
          const q = k.ease(k.clamp(e / 400));
          ring(T, 7 + q * 21, 7 + q * 21, SILVER, e < 80 ? 4 : 3, e > 220);
        }
        if (e > 80 && e < 390)
          icon('key', { x: T.x - 10 - e / 55, y: T.y + 1 + e / 90 }, GOLD, 1, (Math.floor(e / 70) * Math.PI) / 8);
      }
      impact(s, s.hits[0], T, GOLD, 'knock', 28, 7, 24);
    },
  });

  // Magic Weapon: a silver sword is etched from hilt to tip, then snaps into a violet-white enchanted edge.
  FX.register('magic-weapon', {
    palette: ARCANE,
    travel: 180,
    beats: beats(80),
    end: finish(850),
    ground: s => blessingGround(s, ARCANE),
    air(s) {
      const t = s.c.t - k.CAST;
      if (t < 0 || t > 970) return;
      s.hits.forEach(hit => {
        const T = k.P(subject(s, hit)),
          W = { x: T.x + 11, y: T.y - 5 };
        if (t < 850) {
          icon('sword', W, t < 180 ? SILVER : ARCANE, 2);
          if (t < 430) {
            const y = W.y + 6 - k.clamp(t / 360) * 17;
            ring({ x: W.x, y }, 7, 2, ARCANE, 4);
            pixel(W.x - 5, y, ARCANE, 5);
          }
          if (t > 230) {
            const a = t / 180;
            icon('star', { x: W.x + Math.cos(a) * 9, y: W.y - 7 + Math.sin(a) * 7 }, ARCANE);
          }
        }
        impact(s, hit, { x: W.x, y: W.y - 10 }, ARCANE, 'magic-weapon', 25, 6, 17);
      });
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
