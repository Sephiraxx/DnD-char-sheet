/* Pixel spells, batch 06 (see docs/pixel-spells/BRIEF.md). */
(function (root) {
  'use strict';
  const FX = root.BoardPixelFX;
  if (!FX) return;
  const k = FX.kit;
  const FIRE = ['#2a0d0c', '#6e1a12', '#b8321a', '#ec6a1c', '#ffdc81', '#ffffff'];
  const DEATH = ['#100b1c', '#302239', '#695273', '#a38bb7', '#dfd5e8', '#ffffff'];
  const HADAR = ['#100712', '#251026', '#541b45', '#97315f', '#d793b5', '#ffffff'];
  const GRAVITY = ['#101022', '#282440', '#51436f', '#8972bb', '#d4bff2', '#ffffff'];
  const ICE = k.palettes.frost;
  const MAGIC = k.palettes.magic;
  const GOLD = k.palettes.radiante;
  const NATURE = k.palettes.nature;
  const ACID = k.palettes['ácido'];
  const THUNDER = k.palettes.trueno;
  const BERRY = ['#260e21', '#5c1b3b', '#b62d59', '#f56579', '#ffd2ac', '#ffffff'];
  const add = (p, x, y) => ({ x: p.x + x, y: p.y + y });
  const seed = s => s.event.seed || 0;
  const end = tail => (event, travel) => k.CAST + travel + tail;
  const beats =
    (stop = 75, kind = 'hit', power = 0.06, all = false) =>
    (event, kit, travel) =>
      (all && event.targets?.length ? event.targets : [event.targets?.[0] ?? null]).map(target => ({
        at: kit.CAST + travel,
        stop,
        target,
        kind,
        power,
      }));
  const soft = beats(55, 'soft', 0, true);
  function caster(s) {
    const b = s.pose.base || s.pose.hand || s.pose.target || { x: 0, y: 0 };
    return { x: s.pose.hand?.x ?? b.x, y: s.pose.hand?.y ?? b.y - 0.6, baseX: b.x, baseY: b.y, span: b.span || 1 };
  }
  function target(s, i = 0) {
    const id = s.hits[i]?.id;
    return s.targets.find(t => id != null && t.id === id) || s.targets[i] || s.pose.target || caster(s);
  }
  function body(s, i = 0) {
    const t = target(s, i);
    return k.P(s.pose.hand ? k.contact(t, s.pose.hand) : t);
  }
  function feet(t) {
    return k.P({ x: t.baseX ?? t.x, y: t.baseY ?? t.y });
  }
  function recipients(s) {
    return s.targets.length ? s.targets : [caster(s)];
  }
  function pixel(p, ramp, color = 3, size = 1) {
    k.dot(p.x, p.y, ramp[0], size + 2);
    k.dot(p.x, p.y, ramp[color], size);
  }
  function ball(p, r, ramp, color = 3) {
    k.disc(p.x, p.y, r + 1, ramp[0]);
    k.disc(p.x, p.y, r, ramp[color]);
  }
  function stroke(points, ramp, color = 3, width = 1, budget = 40) {
    const lengths = points.slice(1).map((p, i) => Math.hypot(p.x - points[i].x, p.y - points[i].y));
    const step = Math.max(1, lengths.reduce((a, b) => a + b, 0) / budget);
    for (const [ink, size] of [
      [ramp[0], width + 2],
      [ramp[color], width],
    ]) {
      lengths.forEach((length, i) => {
        const n = Math.max(1, Math.ceil(length / step));
        for (let j = 0; j <= n; j++) {
          const q = j / n;
          k.dot(k.mix(points[i].x, points[i + 1].x, q), k.mix(points[i].y, points[i + 1].y, q), ink, size);
        }
      });
    }
  }
  function ring(p, rx, ry, ramp, color = 3, broken = false) {
    rx = Math.max(2, Math.round(rx));
    ry = Math.max(2, Math.round(ry));
    const img = k.sprite(`06:ring:${ramp[2]}:${rx}:${ry}:${color}:${broken}`, rx * 2 + 7, ry * 2 + 7, ramp, set => {
      for (let y = -ry - 1; y <= ry + 1; y++)
        for (let x = -rx - 1; x <= rx + 1; x++) {
          if (Math.abs(Math.hypot(x / rx, y / ry) - 1) * Math.min(rx, ry) > 0.65) continue;
          if (broken && Math.floor((Math.atan2(y, x) + k.tau) * 6) % 3 === 0) continue;
          set(x + rx + 3, y + ry + 3, color);
        }
    });
    k.blit(img, p.x - rx - 3, p.y - ry - 3);
  }
  function icon(name, rows, ramp) {
    return k.sprite(`06:${name}:${ramp[2]}`, rows[0].length + 2, rows.length + 2, ramp, set => {
      rows.forEach((row, y) =>
        [...row].forEach((ch, x) => {
          if (ch !== '.') set(x + 1, y + 1, Number(ch));
        }),
      );
    });
  }
  function show(img, p) {
    k.blit(img, p.x - img.width / 2, p.y - img.height / 2);
  }
  function spark(p, ramp, size = 3) {
    const rows = [];
    for (let y = -size; y <= size; y++) {
      let row = '';
      for (let x = -size; x <= size; x++) row += x === 0 || y === 0 ? (Math.abs(x) + Math.abs(y) < 2 ? '5' : '4') : '.';
      rows.push(row);
    }
    show(icon(`spark:${size}`, rows, ramp), p);
  }
  function impact(s, i, ramp, name, size = 30, spikes = 6, at) {
    const hit = s.hits[i];
    if (!hit) return;
    const T = at || body(s, i),
      real = s.real(hit);
    k.drawHit(k.hitStyle(`06:${name}:${ramp[2]}`, ramp, { S: size, spikes, jag: 0.35 }), T, real);
    k.shards(T, real, ramp, seed(s) + i * 43, 7, size * 0.6);
  }
  function circle(s) {
    return {
      C: k.P(s.area || s.pose.base || s.pose.target || caster(s)),
      R: ((s.area?.feet || 10) / (s.grid.feet || 5)) * 16,
    };
  }
  function corners(s) {
    if (!s.area) return [];
    return k.outline(s.area, s.grid).map(p => k.P(Array.isArray(p) ? { x: p[0], y: p[1] } : p));
  }
  function groundSeal(s, ramp, e) {
    if (e < 0 || e > 560) return;
    recipients(s).forEach(t => {
      const p = feet(t),
        r = (t.span || 1) * 10 + k.ease(k.clamp(e / 180)) * 3;
      ring(p, r, r * 0.5, ramp, e < 100 ? 4 : 2, e > 370);
    });
  }
  function handSprite(closed) {
    return icon(
      `hand:${closed}`,
      closed
        ? [
            '...............',
            '....444444.....',
            '...45252524....',
            '...45252524....',
            '...44242424....',
            '..4423333244...',
            '..4533333354...',
            '...44333344....',
            '....443344.....',
            '.....4344......',
            '.....434.......',
            '.....232.......',
          ]
        : [
            '.....4..4......',
            '..4..54.54.4...',
            '..54.54.54.54..',
            '..54.54.54.54..',
            '..54.54.54.54..',
            '...424242424...',
            '....4333334....',
            '.44.4333334....',
            '..454333334....',
            '...44333344....',
            '....443344.....',
            '.....4344......',
            '.....434.......',
            '.....232.......',
          ],
      DEATH,
    );
  }
  function shield(ramp, ice, frame) {
    return k.sprite(`06:shield:${ramp[2]}:${ice}:${frame}`, 35, 39, ramp, set => {
      for (let y = 3; y <= 33; y++)
        for (let x = 3; x <= 31; x++) {
          const dx = Math.abs(x - 17),
            half = y < 11 ? 8 + (y - 3) * 0.6 : y < 22 ? 13 : (34 - y) * 1.05;
          if (dx > half || (frame < 3 && y < 33 - frame * 11)) continue;
          const edge = half - dx;
          if (edge < 2 || y === 4 || y === 11 || (y > 21 && Math.abs(dx - (34 - y) * 0.55) < 1))
            set(x, y, x < 17 ? 4 : 2);
          else if (ice && dx > 7 && (x + y) % 7 < 4) set(x, y, x < 17 ? 3 : 1);
        }
      if (ice)
        for (let j = 0; j < 5; j++) {
          const x = 5 + j * 6,
            h = j % 2 ? 4 : 7;
          for (let y = 0; y < h; y++) for (let w = -1; w <= 1; w++) set(x + w, 10 - y, w < 0 ? 4 : 3);
        }
    });
  }
  function featherSprite() {
    return icon(
      'feather',
      [
        '.........4...',
        '.......445...',
        '......44554..',
        '.....445544..',
        '....445544...',
        '...445544....',
        '..445544.....',
        '..45544......',
        '.44544.......',
        '.4544........',
        '..44.........',
        '.44..........',
      ],
      THUNDER,
    );
  }
  function blade(p, angle, ramp) {
    const img = icon(
      'blade',
      [
        '..........4..',
        '.........454.',
        '........454..',
        '.......454...',
        '......454....',
        '.....454.....',
        '....454......',
        '..3344.......',
        '...43........',
        '..23.3.......',
        '.2...........',
      ],
      ramp,
    );
    k.blitRotated(img, p.x, p.y, angle + Math.PI / 4, 0.22, 0.8);
  }
  function smite(s, ramp, thunder) {
    if (!s.hits[0] || !s.pose.hand) return;
    const h = s.hits[0],
      e = s.c.t - k.CAST,
      real = s.real(h);
    if (e < 0) return;
    const H = k.P(s.pose.hand),
      T = body(s);
    const a = Math.atan2(T.y - H.y, T.x - H.x);
    if (s.c.t < h.at) {
      blade(H, a - 0.65 + e / 250, ramp);
      if (thunder) {
        ring(add(H, 3, -4), 8, 3, ramp, 4);
        ring(add(H, 6, -7), 10, 4, ramp, 3, true);
      } else
        for (let i = 0; i < 5; i++) {
          const f = (e / 150 + i / 5) % 1;
          pixel(add(H, 2 + i * 1.5, -3 - f * 10), ramp, i % 2 ? 4 : 3, 3 - Math.floor(f * 2));
        }
    }
    if (real >= 0 && real < 210) {
      const points = [];
      for (let i = 0; i < 15; i++) {
        const q = i / 14,
          ang = a - 1.2 + q * 2.1;
        points.push(add(T, Math.cos(ang) * 14, Math.sin(ang) * 14));
      }
      stroke(points, ramp, real < 65 ? 5 : 3, real < 65 ? 4 : 2, 35);
    }
    impact(s, 0, ramp, thunder ? 'thunder-smite' : 'fire-smite', thunder ? 42 : 34, thunder ? 8 : 6);
    if (real < 0 || real > 550) return;
    if (thunder) {
      for (let j = 0; j < 3; j++) {
        const age = real - j * 55;
        if (age < 0 || age > 320) continue;
        const r = 5 + k.ease(age / 320) * 26;
        ring(T, r, r * 0.62, ramp, age < 90 ? 4 : 2, age > 190);
      }
    } else
      for (let i = 0; i < 7; i++) {
        const q = (real / 420 + i / 7) % 1;
        if (real > 380 && i % 2) continue;
        const p = add(T, (k.hash(i, seed(s)) - 0.5) * 19, 6 - q * 24);
        ball(p, 1 + (1 - q) * 2, ramp, q < 0.25 ? 4 : q < 0.6 ? 3 : 1);
      }
  }

  // Chill Touch: a violet-white skeletal hand flies out, closes on flesh, and sheds necrotic bone splinters.
  FX.register('chill-touch', {
    palette: DEATH,
    travel: 290,
    beats: beats(100),
    end: end(520),
    air(s) {
      const hit = s.hits[0];
      if (!hit) return;
      const H = k.P(s.pose.hand || caster(s)),
        T = body(s),
        e = s.c.t - k.CAST;
      if (e >= 0 && s.c.t < hit.at) {
        const q = e / (hit.at - k.CAST);
        for (let i = 7; i > 0; i--) {
          const u = q - i * 0.035;
          if (u < 0) continue;
          pixel({ x: k.mix(H.x, T.x, u), y: k.mix(H.y, T.y, u) + Math.sin(u * 11) * 2 }, DEATH, i < 3 ? 3 : 1, 2);
        }
        show(handSprite(false), { x: k.mix(H.x, T.x, q), y: k.mix(H.y, T.y, q) - Math.sin(q * Math.PI) * 5 });
      }
      const real = s.real(hit);
      if (real >= 0 && real < 500) {
        show(handSprite(real > 55), add(T, 0, real > 320 ? (real - 320) / 35 : 0));
        if (real > 180)
          for (let j = 0; j < 4; j++) {
            const q = (real - 180) / 320;
            pixel(add(T, (j - 1.5) * 4, -5 - q * (8 + j * 2)), DEATH, 2, 2);
          }
      }
      impact(s, 0, DEATH, 'chill-touch', 30, 5);
    },
  });

  // Absorb Elements: elemental sparks collapse into a faceted ward, leaving energy stored by the weapon hand.
  FX.register('absorb-elements', {
    palette: event =>
      ['fire', 'frost', 'lightning', 'trueno', 'ácido'].includes(event.element)
        ? event.element === 'fire'
          ? FIRE
          : k.palettes[event.element]
        : FIRE,
    travel: 150,
    beats: soft,
    end: end(570),
    ground(s) {
      groundSeal(s, s.ramp, s.c.t - k.CAST);
    },
    air(s) {
      const e = s.c.t - k.CAST;
      if (e < 0 || e > 720) return;
      recipients(s).forEach((t, i) => {
        const p = k.P(t),
          ramp = s.ramp,
          q = k.clamp(e / 150);
        if (e < 230)
          for (let j = 0; j < 6; j++) {
            const a = (j * k.tau) / 6 + k.hash(i, seed(s)),
              r = 5 + (1 - k.ease(q)) * 14;
            pixel(add(p, Math.cos(a) * r, Math.sin(a) * r), ramp, j % 2 ? 4 : 3, 3);
          }
        if (e > 75 && e < 480) show(shield(ramp, false, 3), p);
        const h = s.hits[i] || s.hits[0];
        if (h) {
          const real = s.real(h);
          k.drawHit(k.hitStyle(`06:absorb:${ramp[2]}`, ramp, { S: 20, spikes: 4 }), p, real);
          k.shards(p, real, ramp, seed(s) + i, 4, 9);
        }
        if (e > 220) {
          const stored = add(p, 8, 2);
          ball(stored, e < 530 ? 3 : 2, ramp, 3);
          spark(stored, ramp, 2);
        }
      });
    },
  });

  // Alarm: a copper-gold ward traces the cube perimeter; corner seals lock and a small bell rings above it.
  FX.register('alarm', {
    palette: GOLD,
    travel: 240,
    beats: () => [{ at: k.CAST + 240, stop: 55, target: null, kind: 'soft', power: 0 }],
    end: end(600),
    ground(s) {
      const e = s.c.t - k.CAST,
        pts = corners(s);
      if (e < 0 || e > 840 || pts.length < 4) return;
      const xs = pts.map(p => p.x),
        ys = pts.map(p => p.y);
      const x0 = Math.floor(Math.min(...xs)) - 3,
        y0 = Math.floor(Math.min(...ys)) - 3;
      const local = pts.map(p => ({ x: Math.round(p.x - x0), y: Math.round(p.y - y0) }));
      const w = Math.ceil(Math.max(...xs) - x0) + 4,
        h = Math.ceil(Math.max(...ys) - y0) + 4;
      const frame = Math.min(4, Math.floor(e / 60));
      const img = k.sprite(`06:alarm:${JSON.stringify(local)}:${frame}`, w, h, GOLD, set => {
        for (let j = 0; j < 4; j++) {
          const a = local[j],
            b = local[(j + 1) % 4],
            n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y));
          const reach = k.clamp(frame - j + 1);
          for (let d = 0; d <= n * reach; d++) {
            const q = d / Math.max(1, n);
            set(k.mix(a.x, b.x, q), k.mix(a.y, b.y, q), d % 9 < 3 ? 4 : 2);
          }
        }
      });
      k.blit(img, x0, y0);
      pts.forEach(p => {
        show(icon('alarm-seal', ['..4..', '.424.', '42324', '.424.', '..4..'], GOLD), p);
        if (e < 450) spark(add(p, 0, -4), GOLD, 2);
      });
    },
    air(s) {
      const e = s.c.t - k.CAST,
        pts = corners(s);
      if (e < 0 || e > 840) return;
      const p = pts.length
        ? { x: pts.reduce((a, p) => a + p.x, 0) / pts.length, y: pts.reduce((a, p) => a + p.y, 0) / pts.length - 12 }
        : k.P(s.pose.target || caster(s));
      if (e > 140 && e < 720) {
        const img = icon(
          'bell',
          ['....4....', '...454...', '..43334..', '..43334..', '.4333334.', '.4444444.', '....3....', '...44....'],
          GOLD,
        );
        k.blitRotated(img, p.x, p.y, e < 400 ? Math.sin(e / 40) * 0.4 : 0);
        if (e > 240 && e < 550) {
          ring(p, 10 + Math.floor((e - 240) / 65), 7, GOLD, 3, true);
        }
      }
      impact(s, 0, GOLD, 'alarm', 18, 4, p);
    },
  });

  // Animal Friendship: a green musical ribbon carries pink hearts to the beast and settles into a friendly paw seal.
  FX.register('animal-friendship', {
    palette: NATURE,
    travel: 260,
    beats: soft,
    end: end(530),
    ground(s) {
      groundSeal(s, NATURE, s.c.t - k.CAST - 170);
    },
    air(s) {
      const e = s.c.t - k.CAST,
        h = s.hits[0];
      if (e < 0 || !h) return;
      const H = k.P(s.pose.hand || caster(s)),
        T = body(s);
      const heart = icon('heart', ['.33.33.', '3443443', '3444443', '.34443.', '..343..', '...3...'], BERRY);
      if (s.c.t < h.at) {
        const q = e / 260;
        for (let j = 0; j < 3; j++) {
          const u = Math.max(0, q - j * 0.12);
          const p = { x: k.mix(H.x, T.x, u), y: k.mix(H.y, T.y, u) - Math.sin(u * Math.PI) * 9 };
          if (j === 0) show(heart, p);
          else show(icon('note', ['..444', '..4.4', '..4.4', '334.4', '34333', '.3.43'], NATURE), p);
        }
      }
      const real = s.real(h);
      if (real >= 0 && real < 570) {
        for (let j = 0; j < 3; j++)
          show(heart, add(T, (j - 1) * 9, -10 - Math.min(12, real / 35) + Math.sin(j + real / 100) * 2));
        if (real > 100)
          show(
            icon('paw', ['.3...3.', '343.343', '.3.3.3.', '..343..', '.34443.', '.34443.', '..333..'], NATURE),
            add(T, 0, 4),
          );
      }
      impact(s, 0, NATURE, 'friendship', 18, 4);
    },
  });

  // Magnify Gravity: violet concentric pressure bands flatten as arrows and floating rubble slam down across the sphere.
  FX.register('magnify-gravity', {
    palette: GRAVITY,
    travel: 180,
    beats: beats(145, 'hit', 0.08, true),
    end: end(650),
    ground(s) {
      const e = s.c.t - k.CAST;
      if (e < 0 || e > 830) return;
      const { C, R } = circle(s),
        crush = k.ease(k.clamp(e / 180));
      for (let j = 0; j < 3; j++) {
        const r = R * (1 - j * 0.26);
        ring(add(C, 0, -(1 - crush) * (12 + j * 4)), r, r * (0.75 - crush * 0.25), GRAVITY, j === 0 ? 3 : 2, e > 580);
      }
      if (e > 180 && e < 580)
        for (let j = 0; j < 8; j++) {
          const a = (j * k.tau) / 8,
            p = add(C, Math.cos(a) * R * 0.7, Math.sin(a) * R * 0.4);
          show(icon('crack', ['...2...', '..232..', '.23....', '..232..', '...232.', '....2..'], GRAVITY), p);
        }
    },
    air(s) {
      const e = s.c.t - k.CAST;
      if (e < 0) return;
      const { C, R } = circle(s);
      if (e < 380)
        for (let j = 0; j < 8; j++) {
          const a = k.hash(j, seed(s)) * k.tau,
            r = R * (0.3 + k.hash(j, seed(s), 1) * 0.6);
          const drop = k.clamp(e / 180),
            lift = 17 * (1 - drop * drop);
          const p = add(C, Math.cos(a) * r, Math.sin(a) * r * 0.5 - lift);
          pixel(p, GRAVITY, j % 2 ? 3 : 2, 3);
          if (e < 180)
            show(icon('down', ['..4..', '..4..', '..4..', '4.4.4', '.444.', '..4..'], GRAVITY), add(p, 0, -9));
        }
      s.hits.forEach((h, i) => {
        impact(s, i, GRAVITY, 'gravity', 30, 4);
        const real = s.real(h);
        if (real >= 0 && real < 240) {
          const p = body(s, i);
          stroke([add(p, 0, -15 + Math.min(11, real / 15)), add(p, 0, 7)], GRAVITY, 4, 2, 12);
        }
      });
    },
    flash: (event, e) =>
      e < 30 ? { color: '#e3d2ff', alpha: 0.15 } : e < 65 ? { color: '#100b22', alpha: 0.17 } : null,
  });

  // Armor of Agathys: jagged blue ice pauldrons and a frosted breastplate lock around the body, shedding cold chips.
  FX.register('armor-of-agathys', {
    palette: ICE,
    travel: 180,
    beats: soft,
    end: end(620),
    ground(s) {
      groundSeal(s, ICE, s.c.t - k.CAST);
    },
    air(s) {
      const e = s.c.t - k.CAST;
      if (e < 0 || e > 800) return;
      recipients(s).forEach((t, i) => {
        const p = k.P(t),
          frame = Math.min(3, Math.floor(e / 60));
        if (e < 680) show(shield(ICE, true, frame), p);
        for (let j = 0; j < 6; j++) {
          if (e > 580 && j % 2) continue;
          const side = j % 2 ? 1 : -1,
            q = (e / 650 + j / 6) % 1;
          pixel(add(p, side * (10 + q * 5), -9 + j * 3 - q * 6), ICE, j % 3 ? 3 : 4, 2);
        }
        impact(s, i, ICE, 'agathys', 22, 6, p);
      });
    },
  });

  // Mage Armor: violet-blue force plates rise into a hollow heraldic shield, then seal with four arcane corner glints.
  FX.register('mage-armor', {
    palette: MAGIC,
    travel: 190,
    beats: soft,
    end: end(560),
    ground(s) {
      groundSeal(s, MAGIC, s.c.t - k.CAST);
    },
    air(s) {
      const e = s.c.t - k.CAST;
      if (e < 0 || e > 750) return;
      recipients(s).forEach((t, i) => {
        const p = k.P(t);
        if (e < 620) show(shield(MAGIC, false, Math.min(3, Math.floor(e / 63))), p);
        if (e > 140 && e < 620) {
          for (let j = 0; j < 4; j++) {
            const a = Math.PI / 4 + (j * Math.PI) / 2;
            spark(add(p, Math.cos(a) * 17, Math.sin(a) * 17), MAGIC, 2);
          }
          show(icon('armor-rune', ['..4..', '.434.', '43.34', '.434.', '..4..', '..4..'], MAGIC), add(p, 0, 1));
        }
        impact(s, i, MAGIC, 'mage-armor', 20, 4, p);
      });
    },
  });

  // Bless: warm gold motes descend onto each ally, resolve into holy four-point stars, and leave a small foot halo.
  FX.register('bless', {
    palette: GOLD,
    travel: 210,
    beats: soft,
    end: end(600),
    ground(s) {
      groundSeal(s, GOLD, s.c.t - k.CAST - 100);
    },
    air(s) {
      const e = s.c.t - k.CAST;
      if (e < 0 || e > 810) return;
      recipients(s).forEach((t, i) => {
        const p = k.P(t);
        if (e < 210)
          for (let j = 0; j < 3; j++) {
            const q = k.clamp(e / 210),
              a = (j * k.tau) / 3 + q * 2;
            pixel(add(p, Math.cos(a) * 9 * (1 - q), -22 + q * 14), GOLD, 4, 2);
          }
        if (e > 180 && e < 700) {
          spark(add(p, 0, -13), GOLD, e < 290 ? 5 : 3);
          for (let j = 0; j < 3; j++) pixel(add(p, (j - 1) * 8, 3 - ((e + j * 65) % 250) / 20), GOLD, 3);
        }
        impact(s, i, GOLD, 'bless', 20, 4, add(p, 0, -8));
      });
    },
  });

  // Arms of Hadar: black, wine-purple tendrils erupt around the caster and lash outward with pale sucking tips.
  FX.register('arms-of-hadar', {
    palette: HADAR,
    travel: 160,
    beats: beats(135, 'hit', 0.08, true),
    end: end(680),
    ground(s) {
      const e = s.c.t - k.CAST;
      if (e < 0 || e > 840) return;
      const { C, R } = circle(s),
        f = Math.min(11, Math.floor(e / 70));
      const pad = 10,
        size = Math.ceil(R * 2 + pad * 2),
        center = size / 2;
      const img = k.sprite(`06:hadar:${Math.round(R)}:${f}:${seed(s) % 7}`, size, size, HADAR, set => {
        const growth = f < 3 ? 0.35 + 0.65 * k.ease(f / 2) : f < 7 ? 1 : 1 - (f - 7) / 5;
        for (let j = 0; j < 8; j++) {
          const a = (j * k.tau) / 8 + k.hash(j, seed(s) % 7) * 0.25;
          for (let d = 0; d <= R * growth; d++) {
            const q = d / R,
              bend = Math.sin(q * 5 + f * 0.5 + j) * q * 7;
            const x = center + Math.cos(a) * d - Math.sin(a) * bend;
            const y = center + Math.sin(a) * d + Math.cos(a) * bend - Math.sin(q * Math.PI) * 5;
            const w = Math.max(1, Math.round(4 * (1 - q)));
            for (let dx = -w; dx <= w; dx++)
              for (let dy = -w; dy <= w; dy++) {
                if (dx * dx + dy * dy > w * w) continue;
                set(x + dx, y + dy, dy < -w / 2 ? 3 : dx < 0 ? 2 : 1);
              }
            if (d % 7 === 0 && q > 0.35) set(x + 1, y - 1, 4);
          }
        }
      });
      k.blit(img, C.x - center, C.y - center);
      if (e < 550) ring(C, R * 0.25, R * 0.18, HADAR, 2, true);
    },
    air(s) {
      const e = s.c.t - k.CAST;
      if (e < 0) return;
      const { C } = circle(s);
      s.hits.forEach((h, i) => {
        const p = body(s, i),
          real = s.real(h);
        if (e < 460) {
          const q = e < 160 ? k.ease(e / 160) : 1 - k.ease(k.clamp((e - 290) / 170));
          const tip = { x: k.mix(C.x, p.x, q), y: k.mix(C.y, p.y, q) };
          stroke([add(tip, -5, 5), add(tip, -3, -3), add(tip, 2, -6), add(tip, 4, -1)], HADAR, 2, 3, 15);
          pixel(add(tip, 2, -5), HADAR, 4, 1);
        }
        impact(s, i, HADAR, 'hadar', 32, 7);
        if (real >= 120 && real < 470) pixel(add(p, 4, -(real - 120) / 22), HADAR, 1, 3);
      });
    },
    flash: (event, e) => (e < 40 ? { color: '#170618', alpha: 0.18 } : null),
  });

  // Tasha's Caustic Brew: a foaming yellow-green jet floods the exact line, splashing sticky acid onto each victim.
  FX.register('tashas-caustic-brew', {
    palette: ACID,
    travel: 230,
    beats: beats(95, 'hit', 0.055, true),
    end: end(650),
    ground(s) {
      const e = s.c.t - k.CAST - 110,
        a = s.area;
      if (!a || e < 0 || e > 770) return;
      const pts = corners(s);
      if (pts.length < 4) return;
      const xs = pts.map(p => p.x),
        ys = pts.map(p => p.y),
        x0 = Math.floor(Math.min(...xs)) - 3,
        y0 = Math.floor(Math.min(...ys)) - 3;
      const local = pts.map(p => ({ x: p.x - x0, y: p.y - y0 }));
      const w = Math.ceil(Math.max(...xs) - x0) + 4,
        h = Math.ceil(Math.max(...ys) - y0) + 4;
      const f = Math.min(7, Math.floor(e / 95));
      const img = k.sprite(`06:brew:${JSON.stringify(local)}:${f}`, w, h, ACID, set => {
        const A = local[0],
          B = local[1],
          D = local[3],
          ux = B.x - A.x,
          uy = B.y - A.y,
          vx = D.x - A.x,
          vy = D.y - A.y;
        const det = ux * vy - uy * vx;
        if (Math.abs(det) < 0.01) return;
        for (let y = 2; y < h - 2; y++)
          for (let x = 2; x < w - 2; x++) {
            const dx = x - A.x,
              dy = y - A.y,
              u = (dx * vy - dy * vx) / det,
              v = (ux * dy - uy * dx) / det;
            if (u < 0 || u > Math.min(1, (f + 1) / 2)) continue;
            const center = 0.5 + Math.sin(u * 27) * 0.06,
              half = (0.29 + Math.sin(u * 43) * 0.09) * (f > 5 ? 0.65 : 1),
              edge = half - Math.abs(v - center),
              bubble = Math.sin(u * 45) + Math.cos(v * 19);
            if (edge < 0 || (f > 5 && Math.sin(u * 47) > 0.2)) continue;
            set(x, y, edge < 0.06 ? 1 : bubble > 1.5 ? 4 : bubble > 0 ? 3 : 2);
          }
      });
      k.blit(img, x0, y0);
    },
    air(s) {
      const e = s.c.t - k.CAST,
        a = s.area;
      if (e < 0) return;
      if (a && e < 380) {
        const H = k.P(a),
          L = (a.feet / (s.grid.feet || 5)) * 16,
          dir = a.dir || 0;
        const q = Math.min(1, e / 230),
          tail = Math.max(0, (e - 150) / 230),
          points = [];
        for (let j = 0; j <= 48; j++) {
          const u = k.mix(tail, q, j / 48),
            bend = Math.sin(u * 24 - Math.floor(e / 45)) * 1.5;
          points.push(
            add(
              H,
              Math.cos(dir) * L * u - Math.sin(dir) * bend,
              Math.sin(dir) * L * u + Math.cos(dir) * bend - Math.sin(u * Math.PI) * 4,
            ),
          );
        }
        stroke(points, ACID, e < 260 ? 3 : 2, 4, 55);
        for (let j = 0; j < 8; j++) {
          const u = k.mix(tail, q, j / 8);
          ball(add(H, Math.cos(dir) * L * u, Math.sin(dir) * L * u - 3), 1.5, ACID, 4);
        }
      }
      s.hits.forEach((h, i) => {
        impact(s, i, ACID, 'brew', 28, 5);
        const real = s.real(h),
          p = body(s, i);
        if (real >= 70 && real < 650)
          for (let j = 0; j < 4; j++) {
            const q = k.clamp((real - 70 - j * 25) / 490);
            pixel(add(p, (j - 1.5) * 3, -4 + q * q * 17), ACID, j % 2 ? 3 : 4, 2);
          }
      });
    },
  });

  // Goodberry: ten ruby berries sprout from green leaves, orbit the caster's palm, and settle into a countable handful.
  FX.register('goodberry', {
    palette: NATURE,
    travel: 220,
    beats: () => [{ at: k.CAST + 220, stop: 55, target: null, kind: 'soft', power: 0 }],
    end: end(620),
    air(s) {
      const e = s.c.t - k.CAST;
      if (e < 0 || e > 840) return;
      const H = k.P(s.pose.hand || caster(s));
      const berry = icon('berry', ['..4..', '.232.', '23332', '23432', '.222.'], BERRY);
      const leaf = icon('berry-leaf', ['...4.', '..343', '.343.', '232..'], NATURE);
      for (let i = 0; i < 10; i++) {
        const q = k.ease(k.clamp(e / 300)),
          a = (i * k.tau) / 10 + (1 - q) * 1.5;
        const orbit = add(H, Math.cos(a) * 18, Math.sin(a) * 11 - 8);
        const pile = add(H, ((i % 5) - 2) * 5, Math.floor(i / 5) * 6 - 4);
        const settle = k.ease(k.clamp((e - 280) / 210));
        const p = { x: k.mix(orbit.x, pile.x, settle), y: k.mix(orbit.y, pile.y, settle) };
        show(leaf, add(p, 1, -3));
        show(berry, p);
      }
      if (e > 500 && e < 700) spark(add(H, 0, -14), GOLD, 2);
      impact(s, 0, NATURE, 'goodberry', 18, 5, H);
    },
  });

  // Feather Fall: ivory feathers drift down beside each recipient and a soft air cushion visibly brakes their descent.
  FX.register('feather', {
    palette: THUNDER,
    travel: 180,
    beats: soft,
    end: end(690),
    ground(s) {
      const e = s.c.t - k.CAST;
      if (e < 100 || e > 760) return;
      recipients(s).forEach(t => {
        const p = feet(t),
          q = k.clamp((e - 100) / 250);
        ring(p, 8 + q * 6, 3 + q * 2, THUNDER, 3, e > 470);
        if (e < 480) ring(add(p, 0, -3), 7 + q * 4, 2, THUNDER, 2);
      });
    },
    air(s) {
      const e = s.c.t - k.CAST;
      if (e < 0 || e > 870) return;
      recipients(s).forEach((t, i) => {
        const p = k.P(t),
          q = k.clamp(e / 760),
          fall = 22 * (1 - (1 - q) ** 2);
        for (let j = 0; j < 3; j++) {
          const x = (j - 1) * 11 + Math.sin(e / 150 + j + k.hash(i, seed(s))) * 3;
          k.blitRotated(featherSprite(), p.x + x, p.y - 19 + fall - j * 4, Math.sin(e / 180 + j) * 0.4);
        }
        impact(s, i, THUNDER, 'feather', 16, 4, add(p, 0, 6));
      });
    },
  });

  // Searing Smite: the caster's blade catches orange fire; a close slash lands in a hot star and persistent tongues of flame.
  FX.register('searing-smite', {
    palette: FIRE,
    travel: 240,
    beats: beats(100),
    end: end(600),
    ground(s) {
      const h = s.hits[0],
        real = h ? s.real(h) : -1;
      if (real < 0 || real > 410) return;
      const p = feet(target(s));
      ring(p, 8 + k.ease(real / 410) * 8, 4, FIRE, 2, real > 200);
    },
    air(s) {
      smite(s, FIRE, false);
    },
    flash: (event, e) =>
      e < 28 ? { color: '#ffe9bb', alpha: 0.16 } : e < 55 ? { color: '#270d0b', alpha: 0.12 } : null,
  });

  // Thunderous Smite: compressed blue-white sound rings wrap the weapon, then burst from a heavy slash as concentric shock fronts.
  FX.register('thunderous-smite', {
    palette: THUNDER,
    travel: 240,
    beats: beats(155, 'blast', 0.09),
    end: end(620),
    ground(s) {
      const h = s.hits[0],
        real = h ? s.real(h) : -1;
      if (real < 0 || real > 460) return;
      const p = feet(target(s)),
        r = 6 + k.ease(k.clamp(real / 460)) * 24;
      ring(p, r, r * 0.45, THUNDER, real < 100 ? 4 : 2, real > 220);
    },
    air(s) {
      smite(s, THUNDER, true);
    },
    flash: (event, e) =>
      e < 32 ? { color: '#eef8ff', alpha: 0.22 } : e < 75 ? { color: '#111a29', alpha: 0.18 } : null,
  });
})(typeof window !== 'undefined' ? window : globalThis);
