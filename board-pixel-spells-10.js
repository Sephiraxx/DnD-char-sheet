/* Pixel spells, batch 10 (see docs/pixel-spells/BRIEF.md). */
(function (root) {
  'use strict';
  const FX = root.BoardPixelFX;
  if (!FX) return;
  const k = FX.kit;
  const GOLD = ['#261709', '#79501b', '#c48b28', '#ffd15c', '#fff3bc', '#ffffff'];
  const HEAL = ['#0b2119', '#216344', '#48b982', '#9ee9aa', '#f0ffd3', '#ffffff'];
  const BANE = ['#200b20', '#4d193c', '#87345c', '#cb578a', '#f8b3d1', '#ffffff'];
  const WARD = ['#111b32', '#34477b', '#6b92bd', '#b2dcf0', '#fff0c5', '#ffffff'];
  const WATER = ['#0c2127', '#205360', '#38959e', '#82ded3', '#dffff1', '#ffffff'];
  const WITCH = ['#110b30', '#382679', '#5268c7', '#84b5ff', '#ccefff', '#ffffff'];
  const POISON = ['#17200c', '#364b20', '#698c2e', '#acd342', '#e8f6a0', '#ffffff'];
  const FIRE = ['#2a0b10', '#711925', '#bd3230', '#f36b2d', '#ffcc60', '#ffffff'];
  const SPEED = ['#29180d', '#805027', '#cd8e39', '#f4c965', '#fff0bd', '#ffffff'];
  const MIND = ['#230c2d', '#622465', '#aa459f', '#ed80ca', '#ffd4ee', '#ffffff'];
  const JUMP = ['#102514', '#2c6430', '#65aa40', '#ade66c', '#eaffb8', '#ffffff'];
  const SMOKE = ['#16121c', '#322938', '#514351', '#7f6b78', '#b5a1ad', '#ffffff'];
  // Six separately outlined ramps keep the rainbow saturated without blending colours.
  const SPECTRUM = [
    ['#2c0c20', '#852139', '#c43b4b', '#ff666a', '#ffc2bd', '#ffffff'],
    ['#30180b', '#895023', '#d88b2b', '#ffc249', '#ffe4a1', '#ffffff'],
    ['#252607', '#737626', '#b5be32', '#edf15d', '#faffb9', '#ffffff'],
    ['#0a281e', '#21714d', '#42b76a', '#80ed9d', '#d0ffdb', '#ffffff'],
    ['#0d1c38', '#28517d', '#408dd2', '#76ceff', '#d0f0ff', '#ffffff'],
    ['#240c39', '#5e277e', '#9d4ac2', '#df89ee', '#f6ccff', '#ffffff'],
  ];
  const seed = s => s.event.seed || 0;
  const finish = tail => (event, travel) => k.CAST + travel + tail;
  const beats =
    (stop, kind = 'soft', all = true) =>
    (event, kit, travel) =>
      (all && event.targets?.length ? event.targets : [event.targets?.[0] ?? null]).map(target => ({
        at: kit.CAST + travel,
        stop,
        target,
        kind,
        power: kind === 'soft' ? 0.03 : 0.07,
      }));
  function subject(s, hit = s.hits[0], self = false) {
    const target = s.targets.find(t => hit?.id != null && t.id === hit.id) || s.targets[0];
    if (target && (!self || s.event.targets?.length)) return target;
    const p = (self ? s.pose.base : s.pose.target) || s.pose.base || s.pose.hand || { x: 0, y: 0 };
    return { x: p.x, y: p.y - 0.55, baseX: p.x, baseY: p.y, span: p.span || 1 };
  }
  const feet = t => k.P({ x: t.baseX ?? t.x, y: t.baseY ?? t.y + 0.55 });
  const contact = (s, hit) => {
    const t = subject(s, hit);
    return k.P(k.contact(t, s.pose.hand || t));
  };
  function pixel(x, y, ramp, index = 3, size = 1) {
    k.dot(x, y, ramp[0], size + 2);
    k.dot(x, y, ramp[index], size);
  }
  function ball(x, y, r, ramp, index = 3) {
    k.disc(x, y, r + 1, ramp[0]);
    k.disc(x, y, r, ramp[index]);
  }
  function stroke(points, ramp, index = 3, width = 1, budget = 60) {
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
  function ring(p, rx, ry, ramp, index = 3, broken = false, phase = 0) {
    rx = Math.max(2, Math.round(rx));
    ry = Math.max(2, Math.round(ry));
    const w = rx * 2 + 5,
      h = ry * 2 + 5;
    const img = k.sprite(`10:ring:${rx}:${ry}:${ramp[2]}:${index}:${broken}:${phase % 4}`, w, h, ramp, set => {
      for (let y = 1; y < h - 1; y++)
        for (let x = 1; x < w - 1; x++) {
          const dx = (x - rx - 2) / rx,
            dy = (y - ry - 2) / ry;
          if (Math.abs(Math.hypot(dx, dy) - 1) * Math.min(rx, ry) > 0.6) continue;
          if (broken && (Math.floor(((Math.atan2(dy, dx) + Math.PI) * 6) / Math.PI) + phase) % 4 === 0) continue;
          set(x, y, index);
        }
    });
    k.blit(img, p.x - rx - 2, p.y - ry - 2);
  }
  const ICONS = {
    crown: ['.4....5....4.', '.34..454..43.', '.23444444432.', '..233333332..', '..244444442..', '..222222222..'],
    heart: [
      '..333...333..',
      '.34443.34443.',
      '.34544444543.',
      '.34444444443.',
      '..344444443..',
      '...3444443...',
      '....34443....',
      '.....343.....',
      '......3......',
    ],
    cross: [
      '....444....',
      '....454....',
      '....454....',
      '.444454444.',
      '.455555554.',
      '.444454444.',
      '....454....',
      '....454....',
      '....444....',
    ],
    curse: [
      '..22.....22..',
      '.2332...2332.',
      '.23433333432.',
      '..233333332..',
      '...2113112...',
      '...2113112...',
      '....33333....',
      '.....333.....',
      '....23332....',
      '...22.3.22...',
      '......3......',
      '.....232.....',
      '......2......',
    ],
    shield: [
      '...44444...',
      '.443333344.',
      '.433454334.',
      '.433454334.',
      '.434555434.',
      '.433454334.',
      '..4333334..',
      '...43334...',
      '....434....',
      '.....4.....',
    ],
    star: [
      '......5......',
      '.....454.....',
      '.....454.....',
      '....44544....',
      '.44444544444.',
      '..455555554..',
      '....44544....',
      '.....454.....',
      '.....454.....',
      '......5......',
    ],
    drop: [
      '.....4.....',
      '....454....',
      '....454....',
      '...34543...',
      '..3445443..',
      '..3454443..',
      '.345444443.',
      '.344444443.',
      '..3444443..',
      '...33333...',
    ],
    skull: [
      '...333333...',
      '..34444443..',
      '.3445444443.',
      '.3444444443.',
      '.3411441143.',
      '.3411441143.',
      '..34411443..',
      '...344443...',
      '...3.33.3...',
      '...3.33.3...',
    ],
    boot: [
      '......444...',
      '......434...',
      '......434...',
      '.4....434...',
      '.344..434...',
      '..34444334..',
      '...23333334.',
      '....2222222.',
    ],
    grin: [
      '..33.....33..',
      '.3443...3443.',
      '..33.....33..',
      '.............',
      '.3.........3.',
      '.34555555543.',
      '..345454543..',
      '...3444443...',
      '....33333....',
    ],
    dove: [
      '.44.......44.',
      '.454.....454.',
      '..454...454..',
      '...454.454...',
      '....44544.44.',
      '....45555443.',
      '...4455544...',
      '..4444444....',
      '...44.44.....',
    ],
    cup: [
      '..444444444..',
      '..433333334..',
      '..434444434..',
      '...4333334...',
      '....43334....',
      '.....434.....',
      '.....434.....',
      '...4444444...',
    ],
    loaf: ['....33333....', '..334444433..', '.34454454443.', '.34454454443.', '.34444444443.', '..333333333..'],
  };
  function stamp(name, p, ramp, angle = 0) {
    const rows = ICONS[name];
    const img = k.sprite(`10:icon:${name}:${ramp[2]}`, rows[0].length + 2, rows.length + 2, ramp, set => {
      rows.forEach((row, y) =>
        [...row].forEach((ch, x) => {
          if (ch !== '.') set(x + 1, y + 1, Number(ch));
        }),
      );
    });
    k.blitRotated(img, p.x, p.y, angle);
  }
  function impact(s, hit, p, ramp, size = 26, n = 5) {
    const e = s.real(hit);
    k.drawHit(
      k.hitStyle(`10:${s.event.id}:${ramp[2]}`, ramp, {
        S: size,
        spikes: ramp === GOLD ? 4 : 5,
        minor: 2,
        jag: 0.25,
        void: ramp === BANE,
      }),
      p,
      e,
    );
    k.shards(p, e, ramp, seed(s) + s.hits.indexOf(hit) * 23, n, size * 0.65);
  }
  function aura(s, ramp, self = false, tail = 650) {
    for (const hit of s.hits) {
      const e = s.c.t - hit.at;
      if (e < 0 || e >= tail) continue;
      const B = feet(subject(s, hit, self)),
        r = 9 + 6 * k.ease(k.clamp(e / 240));
      ring(B, r, r * 0.42, ramp, e < 80 ? 4 : 3, e > tail - 200, Math.floor(e / 90));
    }
  }
  function voice(s, hit, T, ramp) {
    if (!s.pose.hand || s.c.t < k.CAST || s.c.t >= hit.at) return;
    const H = k.P(s.pose.hand),
      q = (s.c.t - k.CAST) / Math.max(1, hit.at - k.CAST);
    // Expanding syllable rings: a spoken spell rather than a solid missile.
    for (let i = 0; i < 3; i++) {
      const u = q - i * 0.16;
      if (u < 0) continue;
      ring({ x: k.mix(H.x, T.x, u), y: k.mix(H.y, T.y, u) }, 2 + u * 3, 3 + u * 4, ramp, i ? 3 : 4);
    }
  }
  function direction(s, B) {
    const p = s.pose.target || s.pose.hand || { x: B.x + 1, y: B.y };
    const dx = p.x - B.x,
      dy = p.y - B.y,
      length = Math.hypot(dx, dy) || 1;
    return { x: length === 1 && dx === 0 && dy === 0 ? 1 : dx / length, y: dy / length };
  }

  // Guiding Bolt: a white-gold radiant lance bursts into four-point stars and leaves a guiding sparkle.
  FX.register('guiding-bolt', {
    palette: GOLD,
    travel: 290,
    beats: beats(105, 'hit', false),
    end: finish(760),
    ground(s) {
      aura(s, GOLD, false, 700);
    },
    air(s) {
      const hit = s.hits[0],
        T = contact(s, hit);
      if (s.pose.hand && s.c.t >= k.CAST && s.c.t < hit.at) {
        const H = k.P(s.pose.hand),
          q = (s.c.t - k.CAST) / (hit.at - k.CAST);
        const dx = T.x - H.x,
          dy = T.y - H.y,
          L = Math.hypot(dx, dy) || 1;
        const p = { x: k.mix(H.x, T.x, q), y: k.mix(H.y, T.y, q) };
        const a = Math.atan2(dy, dx);
        stroke([{ x: p.x - (dx / L) * 17, y: p.y - (dy / L) * 17 }, p], GOLD, 3, 3);
        stroke([{ x: p.x - (dx / L) * 10, y: p.y - (dy / L) * 10 }, p], GOLD, 5);
        stamp('star', p, GOLD, a);
        for (let i = 1; i < 4; i++) {
          const u = q - i * 0.085;
          if (u >= 0) pixel(k.mix(H.x, T.x, u), k.mix(H.y, T.y, u) + (i % 2 ? -3 : 3), GOLD, 4);
        }
      }
      impact(s, hit, T, GOLD, 42, 9);
      const e = s.real(hit);
      if (e < 140 || e >= 840) return;
      stamp('star', { x: T.x, y: T.y - 16 }, GOLD, (Math.floor(e / 130) * Math.PI) / 8);
      for (let i = 0; i < 4; i++) {
        const a = e / 270 + (i * Math.PI) / 2;
        pixel(T.x + Math.cos(a) * 12, T.y + Math.sin(a) * 7, GOLD, i % 2 ? 4 : 3);
      }
    },
    flash: (event, e) => (e < 30 ? { color: GOLD[4], alpha: 0.16 } : e < 65 ? { color: GOLD[0], alpha: 0.1 } : null),
  });

  // Purify Food and Drink: an aqua cleansing sweep lifts black impurities off a loaf and goblet.
  FX.register('purify-food-and-drink', {
    palette: WATER,
    travel: 160,
    beats: beats(60),
    end: finish(720),
    ground(s) {
      const e = s.c.t - s.hits[0].at;
      if (e < 0 || e >= 720) return;
      const T = k.P(s.area || s.pose.target || subject(s));
      ring(T, 8 + k.ease(k.clamp(e / 420)) * 15, 4 + k.ease(k.clamp(e / 420)) * 8, WATER, 3, e > 500);
    },
    air(s) {
      const hit = s.hits[0],
        T = k.P(s.area || s.pose.target || subject(s)),
        e = s.real(hit);
      voice(s, hit, T, WATER);
      impact(s, hit, T, WATER, 24, 5);
      if (e < 0 || e >= 760) return;
      stamp('cup', { x: T.x + 8, y: T.y + 1 }, e < 180 ? WATER : GOLD);
      stamp('loaf', { x: T.x - 8, y: T.y + 3 }, e < 180 ? WATER : GOLD);
      if (e < 420) stamp('drop', { x: T.x, y: T.y - 17 + e / 35 }, WATER);
      for (let i = 0; i < 7; i++) {
        const q = k.clamp((e - i * 18) / 580);
        if (q <= 0 || q >= 1) continue;
        const x = T.x + (k.hash(i, seed(s)) - 0.5) * 24 + Math.sin(q * 5 + i) * 3;
        const y = T.y + 2 - q * 24;
        pixel(x, y, q < 0.42 ? SMOKE : WATER, q < 0.42 ? 2 : 4, q < 0.42 ? 2 : 1);
      }
    },
  });

  // Ray of Sickness: a sickly green needle trails coiling droplets, then splatters into a poison skull.
  FX.register('ray-of-sickness', {
    palette: POISON,
    travel: 260,
    beats: beats(90, 'hit', false),
    end: finish(650),
    air(s) {
      const hit = s.hits[0],
        T = contact(s, hit);
      if (s.pose.hand && s.c.t >= k.CAST && s.c.t < hit.at) {
        const H = k.P(s.pose.hand),
          q = (s.c.t - k.CAST) / (hit.at - k.CAST);
        const a = Math.atan2(T.y - H.y, T.x - H.x),
          ux = Math.cos(a),
          uy = Math.sin(a);
        const p = { x: k.mix(H.x, T.x, q), y: k.mix(H.y, T.y, q) };
        stroke(
          [
            { x: p.x - ux * 12, y: p.y - uy * 12 },
            { x: p.x + ux * 4, y: p.y + uy * 4 },
          ],
          POISON,
          3,
          2,
        );
        pixel(p.x, p.y, POISON, 4, 2);
        for (let i = 1; i <= 7; i++) {
          const u = q - i * 0.045;
          if (u < 0) continue;
          const off = Math.sin(i * 1.7 - s.c.raw / 50) * 3;
          ball(k.mix(H.x, T.x, u) - uy * off, k.mix(H.y, T.y, u) + ux * off, i < 3 ? 1.5 : 0.5, POISON, i < 3 ? 3 : 2);
        }
      }
      impact(s, hit, T, POISON, 32, 8);
      const e = s.real(hit);
      if (e < 90 || e >= 720) return;
      stamp('skull', { x: T.x, y: T.y - 12 - Math.min(4, e / 130) }, POISON);
      for (let i = 0; i < 5; i++) {
        const q = k.clamp((e - 90 - i * 27) / 460);
        if (q <= 0 || q >= 1) continue;
        const x = T.x + (i - 2) * 4,
          y = T.y + q * q * 18;
        pixel(x, y, POISON, 2, 2);
        if (q < 0.6) pixel(x, y - 3, POISON, 3);
      }
    },
  });

  function flame(p, frame, ramp, variant) {
    const img = k.sprite(`10:flame:${frame}:${variant}`, 15, 29, ramp, set => {
      const height = frame < 2 ? 9 + frame * 8 : frame < 6 ? 24 - (frame % 2) * 3 : Math.max(3, 23 - (frame - 5) * 4);
      for (let y = 1; y <= height; y++) {
        const q = y / height,
          bend = Math.round(Math.sin(q * 5 + variant + frame) * (1 - q) * 3);
        const half = Math.max(0, Math.floor(q * 4));
        for (let x = -half; x <= half; x++) {
          const centre = 7 + bend;
          const index = q > 0.65 && Math.abs(x) < 2 ? 5 : Math.abs(x) < half * 0.5 ? 4 : q > 0.4 ? 3 : 2;
          set(centre + x, 27 - height + y, index);
        }
      }
    });
    k.blit(img, p.x - 7, p.y - 27);
  }

  // Hellish Rebuke: a red infernal seal erupts directly beneath the offender in a crown of hellfire.
  FX.register('hellish-rebuke', {
    palette: FIRE,
    travel: 70,
    beats: beats(120, 'hit', false),
    end: finish(840),
    ground(s) {
      const hit = s.hits[0],
        e = s.real(hit),
        B = feet(subject(s, hit));
      if (e < 0 || e >= 900) return;
      ring(B, 13 + Math.min(4, e / 100), 7, e < 600 ? FIRE : SMOKE, e < 70 ? 5 : 2, e > 650);
      if (e < 630) {
        const points = Array.from({ length: 6 }, (_, i) => {
          const a = (i * Math.PI * 4) / 5 - Math.PI / 2;
          return { x: B.x + Math.cos(a) * 11, y: B.y + Math.sin(a) * 6 };
        });
        stroke(points, FIRE, e < 100 ? 4 : 2, 1, 48);
      }
    },
    air(s) {
      const hit = s.hits[0],
        T = contact(s, hit),
        B = feet(subject(s, hit)),
        e = s.real(hit);
      impact(s, hit, T, FIRE, 38, 9);
      if (e < 0 || e >= 900) return;
      if (e < 570)
        for (let i = 0; i < 5; i++) {
          const a = (i * k.tau) / 5;
          flame({ x: B.x + Math.cos(a) * 12, y: B.y + Math.sin(a) * 5 }, Math.floor(e / 60), FIRE, i % 3);
        }
      if (e >= 460)
        for (let i = 0; i < 5; i++) {
          const q = (e - 460) / 440;
          if (q > 0.65 && i % 2) continue;
          ball(B.x + (i - 2) * 6, B.y - 13 - q * 17, Math.max(0.5, 3 - q * 2), SMOKE, 2);
          if (q < 0.65) pixel(B.x + (i - 2) * 7, B.y - 8 - q * 23, FIRE, 4);
        }
    },
    flash: (event, e) => (e < 30 ? { color: FIRE[4], alpha: 0.19 } : e < 75 ? { color: FIRE[0], alpha: 0.13 } : null),
  });

  function cone(s) {
    if (s.area?.kind === 'cone') return s.area;
    const B = s.pose.base || s.pose.hand || { x: 0, y: 0 },
      T = s.pose.target || subject(s);
    return { kind: 'cone', x: B.x, y: B.y, dir: Math.atan2(T.y - B.y, T.x - B.x), feet: 15, self: true };
  }
  function conePoint(s, area, along, side) {
    const L = area.feet / (s.grid.feet || 5),
      d = area.dir || 0;
    return k.P({
      x: area.x + (Math.cos(d) * along - Math.sin(d) * side) * L,
      y: area.y + (Math.sin(d) * along + Math.cos(d) * side) * L,
    });
  }
  function rainbow(s, area, frame) {
    const L = (area.feet / (s.grid.feet || 5)) * k.PX;
    const points = k.outline(area, s.grid);
    const corners =
      points.length === 3
        ? points.map(p => k.P(Array.isArray(p) ? { x: p[0], y: p[1] } : p))
        : [conePoint(s, area, 0, 0), conePoint(s, area, 1, -0.5), conePoint(s, area, 1, 0.5)];
    const x0 = Math.floor(Math.min(...corners.map(p => p.x))) - 2,
      y0 = Math.floor(Math.min(...corners.map(p => p.y))) - 2;
    const w = Math.ceil(Math.max(...corners.map(p => p.x))) - x0 + 3;
    const h = Math.ceil(Math.max(...corners.map(p => p.y))) - y0 + 3;
    const A = k.P(area),
      d = area.dir || 0,
      cosine = Math.cos(d),
      sine = Math.sin(d);
    const reach = frame < 3 ? [0.2, 0.55, 1][frame] : 1;
    // Six cached colour wedges, all clipped to the actual triangular board template.
    for (let band = 0; band < 6; band++) {
      const ramp = SPECTRUM[band];
      const img = k.sprite(`10:rainbow:${w}:${h}:${L}:${d}:${frame}:${band}`, w, h, ramp, set => {
        for (let y = 1; y < h - 1; y++)
          for (let x = 1; x < w - 1; x++) {
            const dx = x0 + x - A.x,
              dy = y0 + y - A.y;
            const u = (dx * cosine + dy * sine) / L,
              v = (-dx * sine + dy * cosine) / L;
            if (u <= 0 || u > reach || Math.abs(v) > u * 0.5) continue;
            const lane = Math.min(5, Math.floor((v / u + 0.5) * 6));
            if (lane !== band) continue;
            if (frame > 5 && (Math.floor(u * 16) + frame) % 4 < frame - 5) continue;
            if (frame > 8 && u < (frame - 8) * 0.26) continue;
            set(x, y, u > reach - 0.06 ? 4 : (Math.floor(u * 12) + frame) % 4 === 0 ? 2 : 3);
          }
      });
      k.blit(img, x0, y0);
    }
  }

  // Color Spray: six hard-edged rainbow wedges fan across the caster's 15-foot cone, then shatter into stars.
  FX.register('color-spray', {
    palette: MIND,
    travel: 120,
    beats: beats(100),
    end: finish(650),
    ground(s) {
      const e = s.c.t - k.CAST;
      if (e < 0 || e >= 750) return;
      rainbow(s, cone(s), Math.floor(e / 65));
    },
    air(s) {
      const area = cone(s),
        e = s.c.t - k.CAST;
      if (e >= 0 && e < 730)
        for (let i = 0; i < 12; i++) {
          const q = (e / 480 + k.hash(i, seed(s))) % 1;
          if (e > 450 && q < 0.4) continue;
          const u = 0.12 + q * 0.88,
            v = (k.hash(i, seed(s), 1) - 0.5) * u * 0.9;
          const p = conePoint(s, area, u, v);
          pixel(p.x, p.y - Math.sin(q * Math.PI) * 4, SPECTRUM[i % 6], 4, i % 3 ? 1 : 2);
        }
      s.hits.forEach((hit, i) => {
        const T = k.P(subject(s, hit)),
          real = s.real(hit),
          ramp = SPECTRUM[i % 6];
        impact(s, hit, { x: T.x, y: T.y - 6 }, ramp, 27, 5);
        if (real < 90 || real >= 700) return;
        for (let j = 0; j < 3; j++) {
          const a = real / 180 + (j * k.tau) / 3;
          stamp('star', { x: T.x + Math.cos(a) * 11, y: T.y - 13 + Math.sin(a) * 4 }, SPECTRUM[(i + j * 2) % 6]);
        }
      });
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
