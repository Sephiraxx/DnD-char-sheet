/* Renders spell timelines in grid units. The sample table is shared by every emitter. */
(function (root) {
  'use strict';
  const tau = Math.PI * 2;
  const clamp = t => Math.max(0, Math.min(1, t));
  const mix = (a, b, t) => a + (b - a) * t;
  const ease = t => 1 - (1 - t) ** 3;
  const palette = {
    fire: ['#f34315', '#ffab34', '#fff2b5', 'fire'],
    frost: ['#3096df', '#9fe7ff', '#effcff', 'ice'],
    lightning: ['#4a79ff', '#86d7ff', '#f3fcff', 'spark'],
    heal: ['#43bf86', '#a6f3a9', '#f6ffd6', 'light'],
    ácido: ['#7aae21', '#c8f743', '#f7ffbb', 'drop'],
    veneno: ['#458c3f', '#8ed56c', '#ddffc1', 'smoke'],
    necrótico: ['#593482', '#aa74d7', '#dfc9ff', 'smoke'],
    psíquico: ['#b23a91', '#ff88ce', '#ffe2f7', 'ripple'],
    fuerza: ['#7248e6', '#b497ff', '#f8ecff', 'spark'],
    radiante: ['#f2a426', '#ffdc7f', '#fffce3', 'light'],
    trueno: ['#4a89cf', '#a9e3ff', '#ebfaff', 'ripple'],
    contundente: ['#936648', '#d1a776', '#f5dfb9', 'chip'],
    cortante: ['#7995aa', '#c7e2ee', '#fffbeb', 'slash'],
    perforante: ['#638eab', '#bad7f3', '#f6fcff', 'slash'],
    magic: ['#765ace', '#c6b5fa', '#f4eaff', 'light'],
  };
  const schools = {
    abjuracion: '#77c7ec',
    adivinacion: '#b39ff4',
    conjuracion: '#9dd9ba',
    encantamiento: '#d986c1',
    evocacion: '#ecc686',
    ilusion: '#9d93ef',
    nigromancia: '#b087ca',
    necromancia: '#b087ca',
    transmutacion: '#99c486',
  };
  const pool = Array.from({ length: 128 }, (_, i) =>
    [1, 5, 7, 11].map(s => {
      const v = Math.sin((i + 1) * 127.1 + s * 311.7) * 43758.5453123;
      return v - Math.floor(v);
    }),
  );
  const quiet = new Set(['darkness', 'hunger-of-hadar', 'stinking-cloud', 'cloudkill', 'silence']);
  const rage = ['#8c1830', '#ef435b', '#ff8997'];
  const fungal = ['#534536', '#91a45e', '#d4df9d'];
  const spores = ['#657063', '#a5b5a6', '#dae5d4'];
  const inspiration = ['#b47723', '#ffcc60', '#fff0ae'];
  function colorFor(id, element, school) {
    if (id === 'barbarian-rage') return rage;
    if (id === 'symbiotic-entity') return fungal;
    if (id === 'halo-of-spores') return spores;
    if (id === 'bardic-inspiration') return inspiration;
    if (id === 'fog-cloud') return ['#7e989e', '#bad0d1', '#e3eeeb', 'smoke'];
    if (element !== 'magic') return palette[element] || palette.magic;
    if (id === 'darkness' || id === 'hunger-of-hadar') return palette['necrótico'];
    if (id === 'cloudkill' || id === 'stinking-cloud') return palette.veneno;
    const tint =
      schools[
        String(school || '')
          .normalize('NFD')
          .replace(/\p{Mark}/gu, '')
          .toLowerCase()
      ];
    return tint ? [tint, tint, '#fff4e1', 'light'] : palette.magic;
  }
  const signatures = {
    'fire-bolt': { travel: 350, impact: 560 },
    fireball: { travel: 460, impact: 1000, decal: 3200 },
    'burning-hands': { impact: 700 },
    'sacred-flame': { travel: 240, impact: 680 },
    'magic-missile': { travel: 510, impact: 540 },
    'lightning-bolt': { impact: 670, decal: 3400 },
    'fog-cloud': { impact: 800 },
    disintegrate: { impact: 820 },
    thunderwave: { impact: 760 },
    thunderclap: { impact: 680 },
    'toll-the-dead': { impact: 800 },
    healingword: { impact: 1000 },
    'healing-word': { impact: 1000 },
    'misty-step': { impact: 800 },
    'eldritch-blast': { impact: 1120 },
    'chill-touch': { travel: 485, impact: 700 },
    'guiding-bolt': { travel: 420, impact: 780 },
    cure: { impact: 1000 },
    counter: { impact: 750 },
    counterspell: { impact: 750 },
    'bardic-inspiration': { travel: 520, impact: 480 },
    'barbarian-rage': { impact: 630 },
    'halo-of-spores': { impact: 510 },
  };
  const pixel = event => root.BoardPixelFX?.handles(event);
  function phase(event, now, reduced) {
    const style = pixel(event) ? root.BoardPixelFX.timing(event) : signatures[event.id] || {};
    const cast = 300;
    const flight =
      event.travelMs ??
      style.travel ??
      (event.kind === 'projectile' ? 480 : ['vitriolic-sphere', 'ice-knife'].includes(event.id) ? 460 : 0);
    const travel = reduced && !pixel(event) ? flight * 0.75 : flight;
    const offsets =
      pixel(event) || event.id !== 'magic-missile' ? 0 : (root.BoardSpells.missileCount(event.level) - 1) * 80;
    const impact =
      (style.impact || 720) +
      offsets +
      (event.id === 'eldritch-blast' && !pixel(event) ? ((event.beats || 1) - 1) * 155 : 0);
    const age = Math.max(0, now - event.started),
      elapsed = age - cast - travel;
    return {
      age,
      elapsed,
      cast: clamp(age / cast),
      travel: travel ? clamp((age - cast) / travel) : 1,
      impact: clamp(elapsed / impact),
      decal: clamp(elapsed / (style.decal || 1700)),
      hit: elapsed >= 0,
      done: elapsed >= impact,
    };
  }
  function path(ctx, points, closed = true) {
    ctx.beginPath();
    points.forEach(([x, y], i) => ctx[i ? 'lineTo' : 'moveTo'](x, y));
    if (closed) ctx.closePath();
  }
  function oval(ctx, x, y, rx, ry = rx) {
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(0.001, rx), Math.max(0.001, ry), 0, 0, tau);
  }
  function glow(ctx, x, y, r, color, opacity, add = true) {
    if (opacity <= 0.005) return;
    ctx.save();
    if (add) ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = opacity;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.33, color + '95');
    gradient.addColorStop(1, color + '00');
    ctx.fillStyle = gradient;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.restore();
  }
  function ring(ctx, x, y, r, color, alpha, width, flat = 1) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.globalAlpha = alpha;
    oval(ctx, x, y, r, r * flat);
    ctx.stroke();
  }
  function flame(ctx, x, y, s, bend, colors, alpha) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = colors[0];
    path(ctx, [
      [x - s * 0.72, y + s * 0.55],
      [x - s * 0.85, y - s * 0.22],
      [x + s * (bend - 0.4), y - s * 1.18],
      [x + s * bend, y - s * 2.15],
      [x + s * (bend + 0.18), y - s * 0.82],
      [x + s * 0.77, y - s * 0.32],
      [x + s * 0.62, y + s * 0.5],
    ]);
    ctx.fill();
    ctx.fillStyle = colors[1];
    path(ctx, [
      [x - s * 0.42, y + s * 0.45],
      [x - s * 0.37, y - s * 0.18],
      [x + s * bend * 0.65, y - s * 1.26],
      [x + s * 0.43, y - s * 0.19],
      [x + s * 0.31, y + s * 0.49],
    ]);
    ctx.fill();
    ctx.fillStyle = colors[2];
    path(ctx, [
      [x - s * 0.21, y + s * 0.42],
      [x + s * 0.1, y - s * 0.69],
      [x + s * 0.22, y + s * 0.42],
    ]);
    ctx.fill();
  }
  function puff(ctx, x, y, s, color, alpha, soft = false) {
    if (soft) return glow(ctx, x, y, s, color, alpha, false);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    path(ctx, [
      [x - s, y - s * 0.06],
      [x - s * 0.78, y - s * 0.64],
      [x - s * 0.14, y - s * 0.89],
      [x + s * 0.65, y - s * 0.59],
      [x + s, y - s * 0.08],
      [x + s * 0.53, y + s * 0.35],
      [x - s * 0.33, y + s * 0.45],
    ]);
    ctx.fill();
  }
  function tuft(ctx, x, y, s, kind, colors, alpha, angle = 0.0) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = colors[1];
    ctx.strokeStyle = colors[2];
    ctx.lineWidth = Math.min(0.065, s * 0.42);
    if (kind === 'fire') return flame(ctx, x, y, s, angle, colors, alpha);
    if (kind === 'smoke') return puff(ctx, x, y, s, colors[1], alpha * 0.53);
    if (kind === 'light') {
      oval(ctx, x, y, s * 0.31);
      ctx.fill();
      if (s > 0.075) {
        path(
          ctx,
          [
            [x, y - s * 1.85],
            [x, y + s * 1.2],
          ],
          false,
        );
        ctx.stroke();
        path(
          ctx,
          [
            [x - s * 0.7, y],
            [x + s * 0.7, y],
          ],
          false,
        );
        ctx.stroke();
      }
    } else if (kind === 'ice') {
      path(ctx, [
        [x - s * 0.54, y + s * 0.61],
        [x + s * angle, y - s * 2],
        [x + s * 0.61, y - s * 0.16],
        [x + s * 0.34, y + s * 0.81],
      ]);
      ctx.fill();
      path(
        ctx,
        [
          [x + s * angle, y - s * 2],
          [x + s * 0.18, y + s * 0.44],
        ],
        false,
      );
      ctx.stroke();
    } else if (kind === 'spark' || kind === 'slash') {
      path(
        ctx,
        [
          [x - s, y + s * 0.7],
          [x - s * 0.12, y - s * 0.52],
          [x + s * 0.12, y + s * 0.14],
          [x + s, y - s * 0.94],
        ],
        false,
      );
      ctx.stroke();
    } else if (kind === 'drop') {
      path(ctx, [
        [x + s * angle, y - s * 1.28],
        [x + s * 0.69, y + s * 0.34],
        [x + s * 0.27, y + s * 0.8],
        [x - s * 0.42, y + s * 0.63],
        [x - s * 0.61, y + s * 0.13],
      ]);
      ctx.fill();
    } else if (kind === 'ripple') ring(ctx, x, y, s, colors[1], alpha, 0.025, 0.52);
    else {
      path(ctx, [
        [x - s * 0.8, y + s * 0.2],
        [x - s * 0.35, y - s * 0.77],
        [x + s * 0.64, y - s * 0.39],
        [x + s * 0.58, y + s * 0.46],
        [x, y + s * 0.66],
      ]);
      ctx.fill();
    }
  }
  function sigil(ctx, base, t, colors, reduced) {
    if (t >= 1 || !base) return;
    const a = Math.sin(Math.PI * t);
    const r = Math.max(0.23, base.span * 0.44) * (reduced ? 1 : 0.83 + t * 0.26);
    if (!reduced) glow(ctx, base.x, base.y, r * 1.38, colors[0], a * 0.48);
    ring(ctx, base.x, base.y, r, colors[1], a * 0.96, 0.041, 0.67);
    ring(ctx, base.x, base.y, r * 0.73, colors[2], a * 0.74, 0.026, 0.67);
    for (let i = 0; i < 6; i++) {
      const b = (i * tau) / 6 + (reduced ? 0 : t * 0.36);
      const x = Math.cos(b),
        y = Math.sin(b) * 0.67;
      ctx.globalAlpha = a * 0.93;
      ctx.strokeStyle = colors[2];
      ctx.lineWidth = 0.034;
      path(
        ctx,
        [
          [base.x + r * x, base.y + r * y],
          [base.x + (r + 0.1) * x, base.y + (r + 0.1) * y],
        ],
        false,
      );
      ctx.stroke();
    }
  }
  function castFlash(ctx, hand, t, colors, reduced) {
    if (!hand || t < 0.35 || t >= 1) return;
    const power = Math.sin(clamp((t - 0.35) / 0.65) * Math.PI * 0.87);
    if (!reduced) glow(ctx, hand.x, hand.y, 0.57, colors[1], power * 0.91);
    tuft(ctx, hand.x, hand.y, 0.13 + power * 0.085, 'light', colors, power * (reduced ? 0.48 : 1));
  }
  function burst(ctx, at, r, t, colors, count, budget, seed, reduced) {
    const mode = colors[3],
      expansion = ease(t);
    for (let i = 0; i < count && budget.left > 0; i++, budget.left--) {
      const [a, b, c, d] = pool[(seed + i) % pool.length],
        angle = a * tau;
      const radius = r * expansion * (0.18 + b * 0.82);
      const float =
        mode === 'light'
          ? t * (0.38 + d * 1.05)
          : mode === 'fire' || mode === 'smoke'
            ? t * (0.33 + d * 0.84)
            : mode === 'ice' || mode === 'drop'
              ? Math.sin(t * Math.PI) * (0.2 + d * 0.4)
              : 0;
      const x = at.x + Math.cos(angle) * radius;
      const y = at.y + Math.sin(angle) * radius * 0.82 - float;
      const size = (0.04 + c * 0.115) * Math.min(1.7, 1 + r * 0.21) * (1 - t * 0.55);
      const alpha = (1 - t) * (0.6 + d * 0.4);
      if (mode === 'fire' && t > 0.42 && i % 3 === 0) puff(ctx, x, y, size * 2.8, '#352522', alpha * 0.55);
      else if (mode === 'light' && !reduced && i % 5 === 0) {
        ctx.globalAlpha = alpha * 0.58;
        ctx.strokeStyle = colors[1];
        ctx.lineWidth = 0.032;
        path(
          ctx,
          [
            [at.x, at.y],
            [x, y],
          ],
          false,
        );
        ctx.stroke();
      } else tuft(ctx, x, y, size, mode, colors, alpha, 2 * d - 1);
    }
  }
  function trajectory(from, to, t, bend, rise) {
    const x = to.x - from.x,
      y = to.y - from.y,
      length = Math.hypot(x, y) || 1;
    const curve = Math.sin(t * Math.PI);
    return {
      x: mix(from.x, to.x, t) - (y / length) * curve * bend,
      y: mix(from.y, to.y, t) + (x / length) * curve * bend - curve * rise,
    };
  }
  function dart(ctx, from, to, t, colors, reduced, budget, { bend = 0, size = 0.21, fire = false } = {}) {
    if (!from || !to || t <= 0 || t >= 1) return;
    const rise = reduced ? 0 : 0.23;
    const head = trajectory(from, to, t, bend, rise);
    const tail = trajectory(from, to, Math.max(0, t - 0.2), bend, rise);
    ctx.lineCap = 'round';
    ctx.strokeStyle = colors[0];
    ctx.globalAlpha = 0.62;
    ctx.lineWidth = size * 0.9;
    path(
      ctx,
      [
        [tail.x, tail.y],
        [head.x, head.y],
      ],
      false,
    );
    ctx.stroke();
    ctx.strokeStyle = colors[1];
    ctx.lineWidth = size * 0.35;
    ctx.stroke();
    for (let i = 0; i < (reduced ? 4 : 14) && budget.left > 0; i++, budget.left--) {
      const [a, b, c] = pool[(i + 39) % pool.length],
        lag = i * 0.022;
      if (lag > t) break;
      const s = trajectory(from, to, t - lag, bend, rise);
      tuft(
        ctx,
        s.x + (a - 0.5) * lag,
        s.y - lag * (0.35 + b),
        size * (0.31 + c * 0.32) * (1 - lag * 2),
        fire ? 'fire' : 'light',
        colors,
        (1 - lag * 2.6) * 0.94,
        a - 0.5,
      );
    }
    if (!reduced) glow(ctx, head.x, head.y, size * 2.55, colors[1], 0.91);
    ctx.fillStyle = colors[2];
    ctx.globalAlpha = 0.97;
    oval(ctx, head.x, head.y, size, size * (fire ? 0.73 : 0.8));
    ctx.fill();
  }
  function fireball(ctx, at, r, p, colors, reduced, budget, seed) {
    const t = clamp(p.elapsed / 600);
    if (t < 1) {
      const swell = t < 0.55 ? ease(t / 0.55) : 1 - 0.63 * ((t - 0.55) / 0.45);
      if (!reduced) {
        glow(ctx, at.x, at.y, r * Math.max(0.15, swell), colors[0], (1 - t) * 0.83);
        glow(ctx, at.x, at.y, r * (0.22 + swell * 0.55), colors[2], Math.max(0, 1 - t * 3.45) * 0.98);
      }
      for (let i = 0; i < (reduced ? 20 : 76) && budget.left > 0; i++, budget.left--) {
        const [a, b, c, d] = pool[(i + seed) % pool.length],
          ang = a * tau;
        const radius = r * swell * Math.sqrt(b);
        flame(
          ctx,
          at.x + radius * Math.cos(ang),
          at.y + radius * Math.sin(ang) - t * (0.15 + d * 0.56),
          (0.15 + c * 0.32) * (1 - t * 0.59),
          d - 0.5,
          colors,
          (1 - t) * (0.57 + d * 0.41),
        );
      }
    }
    const smoke = clamp((p.elapsed - 330) / 590);
    if (smoke > 0 && smoke < 1)
      for (let i = 0; i < (reduced ? 5 : 21) && budget.left > 0; i++, budget.left--) {
        const [a, b, c, d] = pool[(i + seed + 51) % pool.length],
          ang = a * tau,
          drift = r * (0.21 + b * 0.55);
        puff(
          ctx,
          at.x + drift * Math.cos(ang) + smoke * 0.45,
          at.y + drift * Math.sin(ang) - smoke * (0.6 + d * 0.8),
          (0.24 + c * 0.62) * (0.65 + smoke * 0.65),
          i % 2 ? '#302527' : '#4b3c3b',
          Math.sin(Math.PI * smoke) * 0.36,
        );
      }
  }
  function coneFire(ctx, a, hand, r, t, colors, reduced, budget, seed) {
    const dir = a.dir,
      dx = Math.cos(dir),
      dy = Math.sin(dir),
      front = clamp(t / 0.28);
    const f = hand || a,
      floor = (x, y, up = 0) => [
        mix(f.x, a.x, clamp((x / r) * 3)) + x * dx - y * dy,
        mix(f.y, a.y, clamp((x / r) * 3)) + x * dy + y * dx - up,
      ];
    const span = r * front;
    const aurora = (1 - t) * Math.min(1, t * 11);
    ctx.globalAlpha = aurora * 0.67;
    const end = floor(span, 0),
      gradient = ctx.createLinearGradient(f.x, f.y, end[0] + dx * 0.02, end[1] + dy * 0.02);
    gradient.addColorStop(0, colors[2]);
    gradient.addColorStop(0.31, colors[1]);
    gradient.addColorStop(1, colors[0] + '22');
    ctx.fillStyle = gradient;
    path(ctx, [
      floor(0, 0),
      floor(span * 0.59, -span * 0.33),
      floor(span, -span * 0.5),
      floor(span * 0.91, 0),
      floor(span, span * 0.5),
      floor(span * 0.56, span * 0.29),
    ]);
    ctx.fill();
    if (!reduced) glow(ctx, f.x, f.y, 0.67, colors[1], aurora * 0.52);
    for (let i = 0; i < (reduced ? 22 : 76) && budget.left > 0; i++, budget.left--) {
      const [c, b, s, d] = pool[(i + seed) % pool.length];
      const roll = (b + t * 1.65) % 1;
      const along = span * (0.1 + roll * 0.9);
      const point = floor(along, (c - 0.5) * along, d * (0.18 + roll * 0.32));
      flame(
        ctx,
        point[0],
        point[1],
        (0.09 + s * 0.2) * (0.75 + roll * 0.52),
        d - 0.5,
        colors,
        aurora * (0.35 + 0.6 * Math.sin(roll * Math.PI)),
      );
    }
  }
  function lightning(ctx, a, hand, r, p, colors, reduced, budget, seed) {
    const start = hand || a,
      end = { x: a.x + Math.cos(a.dir) * r, y: a.y + Math.sin(a.dir) * r };
    const flash = clamp(1 - p.elapsed / 380);
    if (flash > 0) {
      const tick = reduced ? 0 : Math.floor(p.elapsed / 55);
      const points = [[start.x, start.y]];
      for (let i = 1; i < 18; i++) {
        const offset = (pool[(i + seed + tick * 11) % pool.length][0] - 0.5) * 0.43;
        points.push([
          mix(start.x, end.x, i / 18) - Math.sin(a.dir) * offset,
          mix(start.y, end.y, i / 18) + Math.cos(a.dir) * offset,
        ]);
      }
      points.push([end.x, end.y]);
      const widths = reduced ? [0.1, 0.035] : [0.36, 0.15, 0.052];
      for (let i = 0; i < widths.length; i++) {
        ctx.globalAlpha = flash * (i === 0 ? 0.54 : 0.97);
        ctx.strokeStyle = colors[i + (reduced ? 1 : 0)];
        ctx.lineWidth = widths[i];
        ctx.lineJoin = 'bevel';
        path(ctx, points, false);
        ctx.stroke();
      }
      if (!reduced)
        for (let i = 3; i < points.length - 2; i += 3) {
          const [x, y] = points[i],
            sign = i % 2 ? 1 : -1;
          ctx.globalAlpha = flash * 0.68;
          ctx.strokeStyle = colors[1];
          ctx.lineWidth = 0.049;
          path(
            ctx,
            [
              [x, y],
              [x + 0.27, y + sign * 0.31],
              [x + 0.39, y + sign * 0.18],
              [x + 0.62, y + sign * 0.55],
            ],
            false,
          );
          ctx.stroke();
        }
    }
    for (let i = 1; i < 5; i++) {
      const t = i / 5;
      burst(
        ctx,
        { x: mix(start.x, end.x, t), y: mix(start.y, end.y, t) },
        0.67,
        p.impact,
        colors,
        reduced ? 2 : 8,
        budget,
        seed + i,
        reduced,
      );
    }
  }
  function radiantColumn(ctx, target, p, top, colors, reduced) {
    const impact = target.baseY ?? target.y,
      x = target.baseX ?? target.x;
    const span = Math.max(0.5, target.span || 1),
      width = 0.23 + span * 0.23;
    const power = p.hit ? clamp(1 - p.elapsed / 345) : p.travel;
    if (power <= 0) return;
    const y = p.hit ? impact : mix(top, impact, ease(p.travel));
    ctx.save();
    if (!reduced) ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = power * 0.8;
    const gradient = ctx.createLinearGradient(x - width, 0, x + width, 0);
    gradient.addColorStop(0, colors[1] + '00');
    gradient.addColorStop(0.24, colors[1] + '70');
    gradient.addColorStop(0.5, colors[2]);
    gradient.addColorStop(0.76, colors[1] + '70');
    gradient.addColorStop(1, colors[1] + '00');
    ctx.fillStyle = gradient;
    path(ctx, [
      [x - width * 1.5, top],
      [x + width * 1.5, top],
      [x + width * 0.72, y],
      [x - width * 0.72, y],
    ]);
    ctx.fill();
    ctx.strokeStyle = colors[2];
    ctx.globalAlpha = power * 0.69;
    ctx.lineWidth = 0.039;
    path(
      ctx,
      [
        [x - width * 0.76, top],
        [x - width * 0.34, y],
      ],
      false,
    );
    ctx.stroke();
    path(
      ctx,
      [
        [x + width * 0.67, top],
        [x + width * 0.31, y],
      ],
      false,
    );
    ctx.stroke();
    ctx.restore();
    if (p.hit && !reduced) glow(ctx, x, y, width * 2.1, colors[2], power * 0.92);
  }
  function ink(ctx, id, t, at, width, height, opts) {
    ctx.globalAlpha = 1;
    return root.BoardInk?.draw(ctx, id, clamp(t), at.x, at.y, width, height, opts);
  }
  function inkTravel(ctx, id, from, to, t, bend, width, height, anchorX) {
    if (!from || !to || t <= 0 || t >= 1) return false;
    const head = trajectory(from, to, t, bend, 0.23);
    const prior = trajectory(from, to, Math.max(0, t - 0.075), bend, 0.23);
    return ink(ctx, id, t, head, width, height, { anchorX, angle: Math.atan2(head.y - prior.y, head.x - prior.x) });
  }
  function inkImpact(ctx, id, t, target, width) {
    return ink(ctx, id, t, target, width, width);
  }
  // The canonical Ink cels are placed against the current caster, grid and target.
  function inkAlong(ctx, id, t, from, to, height, opts = {}) {
    if (!from || !to) return false;
    const x = to.x - from.x,
      y = to.y - from.y;
    const len = Math.hypot(x, y);
    if (len < 0.001) return false;
    const pad = opts.pad ?? 0;
    return ink(ctx, id, t, from, len / (1 - pad * 2), height, {
      angle: Math.atan2(y, x),
      anchorX: pad,
      anchorY: opts.anchorY,
      opacity: opts.opacity,
    });
  }
  function areaTip(grid, area, from) {
    const r = area.feet / grid.feet;
    return root.BoardSpells.clipRay(grid, from, {
      x: area.x + Math.cos(area.dir) * r,
      y: area.y + Math.sin(area.dir) * r,
    });
  }
  function inkCone(ctx, area, hand, r, t) {
    const from = hand || area;
    const x = area.x + Math.cos(area.dir) * r - from.x,
      y = area.y + Math.sin(area.dir) * r - from.y;
    return ink(ctx, 'burning-hands', t, from, Math.hypot(x, y) / 0.852, r / 0.77, {
      anchorX: 0.082,
      anchorY: 0.53,
      angle: Math.atan2(y, x),
    });
  }
  function drawMissiles(ctx, event, pose, p, targets, colors, reduced, budget) {
    if (p.cast < 1 || !targets.length) return;
    const count = root.BoardSpells.missileCount(event.level);
    const source = pose.hand;
    for (let i = 0; i < count; i++) {
      const target = event.darts?.length ? targets.find(t => t.id === event.darts[i]) : targets[i % targets.length];
      if (!target) continue;
      const hit = (reduced ? 382.5 : 510) + i * 80;
      const elapsed = p.age - 300;
      const turn = (i - (count - 1) / 2) * 0.68;
      const bend = turn || -0.28;
      if (elapsed < hit) {
        const t = clamp(elapsed / hit);
        if (reduced || !inkTravel(ctx, 'magic-missile', source, target, t, bend, 1.13, 0.66, 0.74))
          dart(ctx, source, target, t, colors, reduced, budget, { bend, size: 0.135 });
      } else {
        const t = clamp((elapsed - hit) / 190);
        if (t >= 1) continue;
        const r = Math.max(0.44, target.span * 0.44);
        const at = { x: target.x, y: target.y };
        if (!reduced) {
          glow(ctx, at.x, at.y, r * 0.91, colors[2], Math.max(0, 1 - t * 4.2) * 0.8);
          inkImpact(ctx, 'force-impact', t, at, r * 2.1);
        }
        ring(ctx, at.x, at.y, r * (0.22 + ease(t) * 0.83), colors[1], (1 - t) * 0.9, 0.034, 0.74);
      }
    }
  }
  function drawWall(ctx, pose, t, reduced, grid) {
    const a = pose.area;
    if (!a) return false;
    const tip = areaTip(grid, a, a);
    const intensity = pose.linger || (!reduced ? 0.93 : 0.7);
    const height = Math.min(2.9, Math.max(0.8, ((a.height || 16) / grid.feet) * 0.56));
    return inkAlong(ctx, 'wall', t, a, tip, height, { anchorY: 0.82, pad: 0.025, opacity: intensity });
  }
  function fireWall(ctx, pose, p, reduced, grid, foreground) {
    const a = pose.area;
    if (!a || !p.hit || (p.done && !pose.linger)) return;
    const tip = areaTip(grid, a, a);
    const len = Math.hypot(tip.x - a.x, tip.y - a.y);
    if (len < 0.015) return;
    const light = clamp(p.elapsed / 250) * (pose.linger || 1 - p.impact);
    const cycle = reduced ? 0.52 : (p.elapsed / 1350) % 1;
    const side = pose.event.wallSide === -1 ? -1 : 1;
    if (a.ring) {
      if (foreground) return;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, grid.cols, grid.rows);
      ctx.clip();
      const radius = a.feet / grid.feet;
      ring(ctx, a.x, a.y, radius + side * 0.34, '#e66e32', light * 0.38, 0.24);
      for (let i = 0; i < 24; i++) {
        const angle = (i * tau) / 24;
        ink(
          ctx,
          'wall-flames',
          (cycle + i * 0.37) % 1,
          { x: a.x + Math.cos(angle) * radius, y: a.y + Math.sin(angle) * radius },
          0.52,
          1.1,
          { anchorY: 0.88, opacity: light },
        );
      }
      ctx.restore();
      return;
    }
    ctx.save();
    if (foreground) {
      if (!pose.wallBounds?.length) {
        ctx.restore();
        return;
      }
      ctx.beginPath();
      for (const bounds of pose.wallBounds) ctx.rect(...bounds);
      ctx.clip();
    } else {
      const offset = point => ({ x: point.x - Math.sin(a.dir) * side, y: point.y + Math.cos(a.dir) * side });
      inkAlong(ctx, 'wall-heat', cycle, offset(a), offset(tip), 2, { opacity: light * 0.64 });
      inkAlong(ctx, 'wall-embers', cycle, a, tip, 0.33, { pad: 0.018, opacity: light });
    }
    const count = Math.min(38, Math.max(1, Math.ceil(len / (reduced ? 0.81 : 0.49))));
    const height = clamp((a.height || 20) / 30) * 3.55;
    for (let i = 0; i < count; i++) {
      const r = (i + 0.5) / count;
      const pulse = (cycle + i * 0.377) % 1;
      const at = { x: mix(a.x, tip.x, r), y: mix(a.y, tip.y, r) };
      ink(
        ctx,
        'wall-flames',
        pulse,
        at,
        0.78 + 0.14 * Math.sin(i * 1.97),
        height * (0.75 + 0.24 * Math.sin(i * 2.83 + 0.9) ** 2),
        {
          anchorY: 0.91,
          opacity: light * (foreground ? 0.23 : 0.89),
        },
      );
    }
    ctx.restore();
  }
  function entangle(ctx, pose, p, reduced, grid) {
    const a = pose.area;
    if (!p.hit || !a || (p.done && !pose.linger)) return;
    const w = Math.min(20, a.feet) / grid.feet;
    ctx.save();
    path(ctx, root.BoardSpells.outline(grid, a));
    ctx.clip();
    const t = p.done ? 0.42 + (reduced ? 0 : Math.sin(p.age / 480) * 0.16) : p.impact;
    const rise = 0.21 + 0.79 * ease(clamp(p.elapsed / 400));
    for (let i = 0; i < Math.ceil(w); i++)
      for (let j = 0; j < Math.ceil(w); j++) {
        const at = { x: a.x + i + 0.5, y: a.y - w / 2 + j + 0.5 };
        ink(ctx, 'entangle-vines', t, at, rise * 1.42, rise * 1.32, {
          angle: (i * 17 + j * 13) % 7,
          opacity: (pose.linger || 1 - p.impact) * 0.86,
        });
      }
    ctx.restore();
  }
  function eldritch(ctx, event, pose, p, targets, reduced) {
    if (!pose.hand) return;
    const count = event.beats || 1;
    for (let i = 0; i < count; i++) {
      const target = event.rays?.length ? targets.find(t => t.id === event.rays[i]) : targets[i % targets.length];
      if (!target) continue;
      const elapsed = p.elapsed - i * 155;
      const duration = reduced ? 260 : 375;
      const bend = i % 2 === 0 ? -0.18 : 0.17;
      if (elapsed >= 0 && elapsed < duration)
        inkTravel(ctx, 'eldritch-bolt', pose.hand, target, elapsed / duration, bend, 1.33, 0.81, 0.69);
      else if (elapsed >= duration && elapsed < duration + 410)
        inkImpact(ctx, 'eldritch-hit', (elapsed - duration) / 410, target, Math.max(0.9, target.span * 1.16));
    }
  }
  function fireballFloor(ctx, a, p, r, reduced, budget, seed) {
    ctx.save();
    oval(ctx, a.x, a.y, r);
    ctx.clip();
    if (p.decal < 1) {
      if (
        reduced ||
        !ink(ctx, 'fireball-ground', p.impact, a, r / 0.38, r / 0.38, { opacity: p.done ? 1 - p.decal : 0.72 })
      ) {
        ctx.fillStyle = '#251916';
        ctx.globalAlpha = 0.32 * (1 - p.decal) * clamp(p.elapsed / 430);
        oval(ctx, a.x, a.y, r * 0.65, r * 0.56);
        ctx.fill();
      }
    }
    if (!p.done && !reduced && !ink(ctx, 'fireball', p.impact, a, r * 2.13, r * 2.13))
      fireball(ctx, a, r, p, palette.fire, reduced, budget, seed);
    ctx.restore();
  }
  function moonbeam(ctx, pose, p, grid, reduced) {
    const a = pose.area;
    const opacity = Math.min(1, p.elapsed / 220) * (pose.linger || Math.max(0, 1 - p.impact));
    if (opacity <= 0) return;
    const r = a.feet / grid.feet;
    const loop = reduced ? 0.5 : (p.elapsed / 2100) % 1;
    const height = ((a.height || 40) / grid.feet) * 0.52;
    ctx.save();
    oval(ctx, a.x, a.y, r);
    ctx.clip();
    if (!ink(ctx, 'moonbeam-floor', loop, a, (2 * r) / 0.91, (2 * r) / 0.91, { opacity }))
      ring(ctx, a.x, a.y, r - 0.025, '#f2f6ff', opacity, 0.05);
    ctx.restore();
    ink(ctx, 'moonbeam', loop, a, 2 * r, height, { anchorY: 0.91, opacity: opacity * 0.86 });
  }
  function thunderGround(ctx, event, pose, p, grid, reduced) {
    const a = pose.area;
    const r = a.feet / grid.feet;
    ctx.save();
    path(ctx, root.BoardSpells.outline(grid, a));
    ctx.clip();
    const art = event.id;
    const painted =
      !reduced &&
      (art === 'thunderclap'
        ? ink(ctx, art, p.impact, a, r / 0.49, r / 0.49)
        : ink(ctx, art, p.impact, a, r, r, { anchorX: 0, angle: a.dir }));
    if (!painted) ring(ctx, a.x, a.y, r * ease(p.impact) + 0.04, '#f8e7c6', (1 - p.impact) * 0.83, 0.072);
    ctx.restore();
  }
  function drawArchetype(ctx, event, pose, p, targets, colors, reduced, grid) {
    if (reduced) return false;
    const target = pose.target || targets[0] || pose.hand;
    if (!target) return false;
    const a = pose.area;
    const stage = p.impact;
    switch (event.kind) {
      case 'beam':
        return targets.length
          ? targets.map(t => inkAlong(ctx, 'ray', stage, pose.hand || target, t, 0.86, { pad: 0.02 })).some(Boolean)
          : inkAlong(ctx, 'ray', stage, pose.hand, target, 0.86, { pad: 0.02 });
      case 'column': {
        if (!a) return inkImpact(ctx, 'strike', stage, target, 1.44);
        const r = a.feet / grid.feet;
        const height = Math.min(5.8, Math.max(1.26, ((a.height || 20) / grid.feet) * 0.43));
        return ink(ctx, 'cylinder', (stage * 0.74) % 1, a, Math.max(0.82, r * 2.48), height, {
          anchorY: 0.89,
          opacity: 1 - stage * 0.44,
        });
      }
      case 'cube': {
        if (!a) return inkImpact(ctx, 'cube', stage, target, 1.63);
        const length = a.feet / grid.feet;
        return ink(ctx, 'cube', stage, a, length, length, { anchorX: 0, angle: a.dir });
      }
      case 'wall':
        return drawWall(ctx, pose, stage, false, grid);
      case 'aura-instant':
        return a
          ? inkImpact(ctx, 'aura-instant', stage, a, a.feet / grid.feet / 0.4)
          : inkImpact(ctx, 'aura-instant', stage, target, 2.6);
      case 'aura-persistent':
        return a
          ? ink(ctx, 'aura-persistent', stage, a, a.feet / grid.feet / 0.405, a.feet / grid.feet / 0.405, {
              opacity: 0.94,
            })
          : inkImpact(ctx, 'aura-persistent', stage, target, 2.7);
      case 'touch':
      case 'heal':
      case 'buff':
      case 'strike':
      case 'utility': {
        const kind =
          { heal: 'healing', buff: root.BoardSpells.debuff(event.id) ? 'debuff' : 'buff' }[event.kind] || event.kind;
        return (targets.length ? targets : [target])
          .map(t => {
            const at =
              event.kind === 'heal' || event.kind === 'buff' ? { x: t.baseX ?? t.x, y: t.baseY ?? t.y - 0.16 } : t;
            return inkImpact(ctx, kind, stage, at, Math.max(1.25, (t.span || 1) * 1.56));
          })
          .some(Boolean);
      }
      case 'summon':
        return ink(ctx, 'summon', stage, target, 2.3, 2.56, { anchorY: 0.66 });
      case 'teleport': {
        const departure =
          pose.base && ink(ctx, 'teleport', Math.min(1, stage * 1.6), pose.base, 1.93, 2.04, { anchorY: 0.68 });
        const arrival =
          stage > 0.22 && ink(ctx, 'teleport', (stage - 0.22) / 0.78, target, 1.93, 2.04, { anchorY: 0.68 });
        return departure || arrival;
      }
      default:
        return false;
    }
  }
  function inkRadiant(ctx, target, p, top) {
    const x = target.baseX ?? target.x,
      y = target.baseY ?? target.y;
    const t = p.hit ? 0.4 + p.impact * 0.6 : p.travel * 0.4;
    return ink(ctx, 'sacred-flame', t, { x, y: top }, 0.75 + target.span * 0.65, Math.max(0.1, (y - top) / 0.96), {
      anchorY: 0,
    });
  }
  function drawFog(ctx, pose, now, reduced, grid, dm) {
    const a = pose.area,
      alpha = pose.fogAlpha;
    if (!a || !alpha) return;
    const r = a.feet / grid.feet;
    ctx.save();
    if (
      !reduced &&
      ink(ctx, 'fog-cloud', ((now - pose.event.started) / 2600) % 1, a, r * 2.2, r * 2.2, {
        opacity: alpha * (dm ? 0.61 : 0.76),
      })
    ) {
      ctx.restore();
      return;
    }
    const mask = ctx.createRadialGradient(a.x, a.y, r * 0.1, a.x, a.y, r * 1.12);
    mask.addColorStop(0, dm ? '#b8ced582' : '#ccd8dca5');
    mask.addColorStop(0.68, dm ? '#a8bdc46b' : '#b9cbd190');
    mask.addColorStop(0.9, dm ? '#a7bbc545' : '#adbfc77a');
    mask.addColorStop(1, '#a7bbc500');
    ctx.globalAlpha = alpha;
    ctx.fillStyle = mask;
    oval(ctx, a.x, a.y, r * 1.12);
    ctx.fill();
    for (let i = 0; i < 11; i++) {
      const [b, c, d] = pool[i + 12],
        time = reduced ? 0 : now / 1900;
      const ang = b * tau + Math.sin(time * 0.34 + i) * 0.32;
      const radius = r * (0.12 + c * 0.63);
      puff(
        ctx,
        a.x + Math.cos(ang) * radius + Math.sin(time * 0.5 + i) * r * 0.075,
        a.y + Math.sin(ang) * radius,
        r * (0.27 + d * 0.23),
        '#e4edf0',
        alpha * (dm ? 0.19 : 0.27),
        true,
      );
    }
    ctx.restore();
  }
  function pulseTargets(ctx, pose, p, colors, reduced) {
    if (p.done || p.cast < 0.55 || (p.hit && pose.event.id === 'fog-cloud')) return;
    const clock = reduced ? 0.74 : 0.63 + 0.36 * Math.sin(p.age / 71);
    const alpha = (p.hit ? 1 - p.impact * 0.85 : 0.54) * clock;
    for (const target of pose.targets) {
      if (target.obscured) continue;
      const r = Math.max(0.23, target.span * 0.46);
      const ally = pose.allies.has(target.id),
        color = ally ? '#ffad52' : colors[2];
      if (!reduced) glow(ctx, target.baseX, target.baseY, r * 1.35, color, alpha * 0.23);
      ring(ctx, target.baseX, target.baseY, r, color, alpha, 0.055, 0.69);
      ring(ctx, target.baseX, target.baseY, r * 1.13, ally ? '#ffe2a4' : colors[1], alpha * 0.6, 0.028, 0.69);
    }
  }
  function drawGround(ctx, event, pose, now, reduced, grid, budget) {
    if (pixel(event)) {
      if (!phase(event, now, reduced).done || event.id === 'fireball')
        root.BoardPixelFX.drawGround(ctx, event, pose, now, grid);
      return;
    }
    const p = phase(event, now, reduced),
      colors = colorFor(event.id, event.element, event.school);
    ctx.save();
    if (p.cast < 1 && pose.base) {
      const width = Math.max(0.92, pose.base.span * 1.35);
      if (reduced || !ink(ctx, 'sigil', p.cast, pose.base, width, width * 0.82, { anchorY: 0.56 }))
        sigil(ctx, pose.base, p.cast, colors, reduced);
    }
    const a = pose.area;
    if (a && p.hit && event.id !== 'fog-cloud') {
      const r = a.feet / grid.feet;
      if (event.id === 'lightning-bolt' && p.decal < 1 && !reduced) {
        const tip = areaTip(grid, a, a);
        inkAlong(ctx, 'lightning-scorch', p.decal, a, tip, 0.76, { pad: 0.02 });
      }
      if (event.id === 'fireball') fireballFloor(ctx, a, p, r, reduced, budget, event.seed);
      else if (event.id === 'moonbeam') moonbeam(ctx, pose, p, grid, reduced);
      else if (event.id === 'thunderwave' || event.id === 'thunderclap') {
        if (!p.done) thunderGround(ctx, event, pose, p, grid, reduced);
      } else if (!p.done && a.kind === 'circle' && !quiet.has(event.id)) {
        ring(ctx, a.x, a.y, r * ease(p.impact) + 0.04, colors[1], (1 - p.impact) * 0.58, 0.07);
      }
      const loop = reduced ? 0.42 : (p.age / 2200) % 1;
      if (event.id === 'wall-of-fire') fireWall(ctx, pose, p, reduced, grid, false);
      else if (event.id === 'entangle') entangle(ctx, pose, p, reduced, grid);
      else if (event.id === 'spirit-guardians') {
        const opacity = Math.min(1, p.elapsed / 420) * (pose.linger || 1 - p.impact);
        ink(ctx, 'guardian-forms', reduced ? 0.5 : (p.elapsed / 3100) % 1, a, r / 0.42, r / 0.42, { opacity });
      } else if (pose.linger && p.done && event.kind === 'aura-persistent')
        ink(ctx, 'aura-persistent', loop, a, r / 0.405, r / 0.405, { opacity: pose.linger * 0.64 });
      else if (pose.linger && p.done && event.kind === 'wall') drawWall(ctx, pose, loop, reduced, grid);
      else if (pose.linger && p.done && event.kind === 'column' && event.id !== 'moonbeam') {
        const height = Math.min(5.8, Math.max(1.26, ((a.height || 20) / grid.feet) * 0.43));
        ink(ctx, 'cylinder', loop, a, Math.max(0.82, r * 2.48), height, { anchorY: 0.89, opacity: pose.linger * 0.64 });
      } else if (pose.linger && event.id !== 'moonbeam') {
        ctx.globalAlpha = pose.linger * (reduced ? 0.12 : 0.11 + 0.03 * Math.sin(now / 550));
        ctx.fillStyle = colors[0];
        path(ctx, root.BoardSpells.outline(grid, a));
        ctx.fill();
      }
    }
    ctx.restore();
  }
  function drawWeapon(ctx, pose, p, now, reduced) {
    if (!pose.target || !p.hit || !pose.linger) return;
    const at = { x: pose.target.x, y: pose.target.y - 0.58 };
    const model =
      pose.event.weaponForm === 'mace'
        ? 'weapon-mace'
        : pose.event.weaponForm === 'axe'
          ? 'weapon-axe'
          : 'summon-weapon';
    const hit = pose.event.attackImpact;
    if (hit && now >= hit.at && now - hit.at < 370)
      inkImpact(
        ctx,
        'weapon-impact',
        (now - hit.at) / 370,
        { x: hit.point.x, y: hit.point.y - 0.32 * hit.span },
        Math.max(1.01, hit.span * 1.02),
      );
    const attack = pose.swing;
    const swing = attack && (now - attack.at) / 550;
    if (attack && swing >= 0 && swing < 1 && !reduced) {
      const angle = Math.atan2(attack.point.y - 0.34 - at.y, attack.point.x - at.x);
      const quick = Math.sin(Math.PI * swing) ** 1.65;
      const hand = { x: at.x + Math.cos(angle) * quick * 0.31, y: at.y + Math.sin(angle) * quick * 0.31 };
      ink(ctx, 'weapon-swing', swing, hand, 1.65, 1.65, { angle });
      ink(ctx, model, 0.5, hand, 1.04, 1.08, { angle: angle - 1.42 + ease(swing) * 2.85 });
      return;
    }
    ink(ctx, model, reduced ? 0.5 : (p.age / 2400) % 1, at, 1.04, 1.08, {
      opacity: pose.linger * Math.min(1, p.elapsed / 300),
    });
  }
  const closeup = {
    cure: ['cure-wounds', 1.55],
    'toll-the-dead': ['toll-the-dead', 1.55],
    healingword: ['healing-word', 1.55],
    'healing-word': ['healing-word', 1.55],
    shield: ['ward-shield', 1.45],
    hold: ['hold-bindings', 1.61],
    counter: ['counterspell-sever', 1.64],
    counterspell: ['counterspell-sever', 1.64],
    shillelagh: ['shillelagh-bark', 1.18],
    'chill-touch': ['chill-grasp', 1.38],
    'guiding-bolt': ['guiding-mark', 1.55],
  };
  function drawWardMarkers(ctx, poses, now, reduced) {
    const byToken = new Map();
    for (const pose of poses) {
      const { event, linger } = pose;
      if (event.kind !== 'buff' || event.id === 'shillelagh' || !linger || !phase(event, now, reduced).hit) continue;
      const bad = root.BoardSpells.debuff(event.id);
      const icon = event.id === 'bless' || event.id === 'bane' ? event.id + '-icon' : bad ? 'bane-icon' : 'ward-icon';
      for (const t of pose.targets) {
        if (
          (event.id === 'bane' && event.saveTargets?.has(t.id) && event.saved.get(t.id) !== false) ||
          event.saved?.get(t.id) === true
        )
          continue;
        const list = byToken.get(t.id) || [];
        list.push({ t, icon, color: bad ? '#9e58cb' : '#ffd463', opacity: linger });
        byToken.set(t.id, list);
      }
    }
    for (const list of byToken.values()) {
      const shown = list.slice(-5);
      for (const [i, { t, icon, color, opacity }] of shown.entries()) {
        const r = Math.max(0.25, t.span * 0.43);
        const size = t.span < 1 ? 0.23 : 0.31;
        const at = { x: t.baseX + (i - (shown.length - 1) / 2) * size * 0.88, y: t.baseY + r * 0.56 };
        ring(ctx, t.baseX, t.baseY, r + i * 0.047, color, opacity * 0.94, 0.034, 0.67);
        ink(ctx, icon, 0, at, size, size, { opacity });
      }
    }
  }
  function musicalNote(ctx, at, size, opacity) {
    ctx.save();
    ctx.translate(at.x, at.y);
    ctx.scale(size, size);
    ctx.globalAlpha = opacity;
    ctx.fillStyle = inspiration[2];
    ctx.strokeStyle = inspiration[1];
    ctx.lineWidth = 0.16;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0.06, 0.24);
    ctx.lineTo(0.06, -0.46);
    ctx.quadraticCurveTo(0.43, -0.38, 0.44, -0.16);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(-0.09, 0.25, 0.23, 0.15, -0.34, 0, tau);
    ctx.fill();
    ctx.restore();
  }
  const traitMarkers = {
    'barbarian-rage': { colors: rage, glyph: 'rage' },
    'symbiotic-entity': { colors: fungal, glyph: 'mushroom' },
    'bardic-inspiration': { colors: inspiration, glyph: 'note' },
  };
  function traitMarker(ctx, at, size, { colors, glyph }) {
    ctx.save();
    ctx.translate(at.x, at.y);
    ctx.scale(size, size);
    oval(ctx, 0, 0, 0.51);
    ctx.fillStyle = '#211a1a';
    ctx.fill();
    ctx.strokeStyle = colors[1];
    ctx.lineWidth = 0.085;
    ctx.stroke();
    ctx.fillStyle = colors[2];
    if (glyph === 'note') musicalNote(ctx, { x: -0.03, y: 0.015 }, 0.72, 1);
    if (glyph === 'mushroom') {
      ctx.fillRect(-0.062, 0.035, 0.124, 0.22);
      ctx.beginPath();
      ctx.ellipse(0, 0.035, 0.29, 0.24, 0, Math.PI, tau);
      ctx.fill();
    }
    if (glyph === 'rage') {
      path(ctx, [
        [-0.24, 0.17],
        [-0.06, -0.24],
        [0.02, 0.025],
        [0.23, -0.15],
        [0.08, 0.26],
        [-0.02, 0.065],
      ]);
      ctx.fill();
    }
    ctx.restore();
  }
  function drawTraits(ctx, traits, base, hand, span, now, reduced) {
    const t = reduced ? 0.5 : (now / 2400) % 1;
    if (traits.includes('barbarian-rage')) {
      const pulse = 0.5 - 0.5 * Math.cos(t * tau);
      glow(ctx, base.x, hand.y, span * (0.58 + pulse * 0.17), rage[0], 0.39 + pulse * 0.29, false);
      ring(ctx, base.x, base.y, span * (0.43 + pulse * 0.04), rage[1], 0.68 + pulse * 0.22, 0.04, 0.56);
    }
    if (traits.includes('symbiotic-entity')) {
      if (!ink(ctx, 'symbiotic-growth', t, base, span * 1.53, span * 1.56, { anchorY: 0.75, opacity: 0.82 }))
        glow(ctx, base.x, hand.y, span * 0.71, fungal[1], 0.64, false);
      ring(ctx, base.x, base.y, span * 0.42, fungal[1], 0.75, 0.045, 0.56);
    }
    if (traits.includes('shillelagh'))
      ink(ctx, 'shillelagh-bark', t, hand, span * 0.78, span * 0.91, { opacity: 0.62 });
    const markers = traits.filter(trait => Object.hasOwn(traitMarkers, trait));
    const size = Math.max(0.22, Math.min(0.42, span * 0.32));
    for (const [i, trait] of markers.entries())
      traitMarker(
        ctx,
        { x: base.x + (i - (markers.length - 1) / 2) * size * 1.16, y: base.y + span * 0.22 },
        size,
        traitMarkers[trait],
      );
  }
  function drawClassFeature(ctx, id, pose, p, targets, reduced) {
    const t = p.impact;
    if (id === 'bardic-inspiration') {
      if (p.cast < 1) return;
      for (const target of targets) {
        if (!p.hit && pose.hand) {
          const count = reduced ? 2 : 6;
          for (let i = 0; i < count; i++) {
            const f = clamp(p.travel * 1.56 - i * 0.095);
            if (f > 0 && f < 1) {
              const point = trajectory(pose.hand, target, f, (i % 2 ? -1 : 1) * 0.13, 0.29 + i * 0.055);
              musicalNote(ctx, point, 0.27 - i * 0.012, Math.min(1, f * 9, (1 - f) * 10));
            }
          }
        } else if (p.hit && !ink(ctx, 'bardic-notes', t, target, 1.25, 1.05, { anchorY: 0.46, opacity: 1 - t }))
          musicalNote(ctx, { x: target.x, y: target.y - t * 0.38 }, 0.42, 1 - t);
      }
      return;
    }
    if (!p.hit) return;
    for (const target of targets) {
      const span = Math.max(0.75, target.span || 1);
      const base = { x: target.baseX ?? target.x, y: target.baseY ?? target.y };
      if (id === 'barbarian-rage') {
        if (reduced || !ink(ctx, 'rage-burst', t, base, span * 2.26, span * 2.02, { anchorY: 0.72 }))
          ring(ctx, base.x, base.y, span * (0.42 + t * 0.52), rage[1], 1 - t, 0.07, 0.52);
      } else if (id === 'symbiotic-entity') {
        ink(ctx, 'symbiotic-growth', reduced ? 0.5 : t, base, span * 1.8, span * 1.89, {
          anchorY: 0.75,
          opacity: Math.sin(Math.PI * t),
        });
      } else if (
        !ink(ctx, 'spore-halo', reduced ? 0.22 : t, target, span * 2.04, span * 1.78, {
          anchorY: 0.57,
          opacity: reduced ? 1 - t : 1,
        })
      ) {
        for (let i = 0; i < 8; i++) {
          const a = i * 2.4;
          const r = span * (0.14 + ease(t) * 0.48) * (0.66 + pool[i][0] * 0.34);
          puff(ctx, target.x + Math.cos(a) * r, target.y + Math.sin(a) * r * 0.72, span * 0.14, spores[i % 3], 1 - t);
        }
      }
    }
  }
  function drawAir(ctx, event, pose, now, reduced, grid, budget) {
    const p = phase(event, now, reduced);
    if (event.id === 'spiritual-weapon') drawWeapon(ctx, pose, p, now, reduced);
    if (event.id === 'wall-of-fire') fireWall(ctx, pose, p, reduced, grid, true);
    if (p.done) return;
    if (pixel(event)) {
      root.BoardPixelFX.drawAir(ctx, event, pose, now, grid);
      return;
    }
    const colors = colorFor(event.id, event.element, event.school),
      a = pose.area;
    const targets = pose.targets.length ? pose.targets : pose.target ? [{ ...pose.target, span: 1 }] : [];
    if (Object.hasOwn(traitMarkers, event.id) || event.id === 'halo-of-spores') {
      drawClassFeature(ctx, event.id, pose, p, targets, reduced);
      return;
    }
    ctx.save();
    if (
      pose.hand &&
      p.cast >= 0.35 &&
      p.cast < 1 &&
      (reduced || !ink(ctx, 'flare', (p.cast - 0.35) / 0.65, pose.hand, 0.97, 0.97))
    )
      castFlash(ctx, pose.hand, p.cast, colors, reduced);
    pulseTargets(ctx, pose, p, colors, reduced);
    if (event.id === 'magic-missile') {
      drawMissiles(ctx, event, pose, p, targets, colors, reduced, budget);
    } else if (event.id === 'eldritch-blast') {
      eldritch(ctx, event, pose, p, targets, reduced);
    } else if (event.id === 'sacred-flame') {
      if (p.cast === 1)
        for (const target of targets) {
          if (reduced || !inkRadiant(ctx, target, p, pose.top))
            radiantColumn(ctx, target, p, pose.top, colors, reduced);
          if (p.hit) {
            const foot = { x: target.baseX ?? target.x, y: target.baseY ?? target.y };
            if (reduced || !inkImpact(ctx, 'radiant-impact', p.impact, foot, Math.max(0.95, target.span * 2.01)))
              burst(ctx, foot, target.span * 0.77, p.impact, colors, reduced ? 13 : 35, budget, event.seed, reduced);
          }
        }
    } else if (!p.hit) {
      if (p.cast === 1 && p.travel < 1) {
        const travelArt = {
          'fire-bolt': ['fire-bolt', 0.64],
          fireball: ['fireball-bead', 0.62],
          'chill-touch': ['chill-hand', 0.76],
          'guiding-bolt': ['guiding-star', 0.69],
        }[event.id];
        if (
          reduced ||
          !travelArt ||
          !inkTravel(ctx, travelArt[0], pose.hand, pose.target, p.travel, 0, 1.34, 0.86, travelArt[1])
        )
          dart(ctx, pose.hand, pose.target, p.travel, colors, reduced, budget, {
            size: event.id === 'fire-bolt' ? 0.255 : event.id === 'fireball' ? 0.19 : 0.15,
            fire: colors[3] === 'fire',
          });
      }
    } else if (
      event.id === 'fireball' ||
      event.id === 'moonbeam' ||
      event.id === 'thunderwave' ||
      event.id === 'thunderclap' ||
      event.id === 'wall-of-fire' ||
      event.id === 'spirit-guardians' ||
      event.id === 'entangle'
    ) {
      // The pressure fronts, flames and fixed column live below the figures.
    } else if (event.id === 'disintegrate') {
      for (const target of targets) {
        if (!reduced) inkAlong(ctx, 'disintegrate', p.impact, pose.hand, target, 1.28, { pad: 0.026 });
        inkImpact(ctx, 'disintegrate-hit', p.impact, target, Math.max(1.24, target.span * 1.36));
      }
    } else if (Object.hasOwn(closeup, event.id)) {
      for (const t of targets) {
        const [art, min] = closeup[event.id];
        const scale = Math.max(min, t.span * 1.14);
        const foot = ['heal', 'buff'].includes(event.kind) && !['hold', 'shield', 'shillelagh'].includes(event.id);
        const at = foot ? { x: t.baseX ?? t.x, y: t.baseY ?? t.y } : t;
        ink(ctx, art, reduced ? Math.min(0.8, p.impact) : p.impact, at, scale, scale * 1.39, {
          anchorY: foot ? 0.74 : event.id === 'shield' || event.id === 'hold' ? 0.55 : 0.62,
        });
      }
    } else if (event.id === 'misty-step' && event.teleport) {
      const t = p.age;
      if (t < 620) ink(ctx, 'teleport', clamp((t - 300) / 320), event.teleport.from, 1.55, 1.63, { anchorY: 0.68 });
      if (t >= 545) ink(ctx, 'teleport', clamp((t - 545) / 430), event.teleport.to, 1.55, 1.63, { anchorY: 0.68 });
    } else if (a && event.id === 'burning-hands') {
      const r = a.feet / grid.feet;
      if (reduced || !inkCone(ctx, a, pose.hand, r, p.impact))
        coneFire(ctx, a, pose.hand, r, p.impact, colors, reduced, budget, event.seed);
    } else if (a && event.id === 'lightning-bolt') {
      const from = pose.hand || a,
        tip = areaTip(grid, a, from);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, grid.cols, grid.rows);
      ctx.clip();
      if (reduced || !inkAlong(ctx, 'lightning-bolt', p.impact, from, tip, 1.52, { pad: 0.02 }))
        lightning(ctx, a, pose.hand, a.feet / grid.feet, p, colors, reduced, budget, event.seed);
      for (const target of pose.targets) {
        const hit = clamp((p.elapsed - (target.baseX + target.baseY) * 3) / 210);
        if (hit >= 1) continue;
        const w = Math.max(0.8, target.span * 1.29);
        if (reduced || !inkImpact(ctx, 'lightning-impact', hit, target, w))
          ring(ctx, target.baseX, target.baseY, w * 0.5, colors[1], (1 - hit) * 0.82, 0.05, 0.72);
      }
      ctx.restore();
    } else if (drawArchetype(ctx, event, pose, p, targets, colors, reduced, grid)) {
      // This archetype painted its authored Ink cels.
    } else if (a && !quiet.has(event.id) && event.id !== 'fog-cloud') {
      burst(ctx, a, Math.min(14, a.feet / grid.feet), p.impact, colors, reduced ? 16 : 52, budget, event.seed, reduced);
    } else if (!a)
      for (const target of targets) {
        const impact = event.id === 'fire-bolt' ? 'fire-impact' : event.id === 'magic-missile' ? 'force-impact' : '';
        if (impact && !reduced && inkImpact(ctx, impact, p.impact, target, Math.max(1.0, target.span * 1.86))) continue;
        const r = Math.max(0.35, target.span * 0.66);
        if (!reduced) glow(ctx, target.x, target.y, 0.35 + r * 0.53, colors[1], Math.max(0, 0.85 - p.impact * 3.8));
        burst(
          ctx,
          target,
          r,
          p.impact,
          colors,
          reduced ? 8 : Math.min(42, 12 + Math.round(target.span * 8)),
          budget,
          event.seed,
          reduced,
        );
      }
    ctx.restore();
  }
  /* Screen offset in CSS pixels. */
  function shake(event, now) {
    if (pixel(event)) return root.BoardPixelFX.shake(event, now);
    if (event.level < 3 || !['fireball', 'lightning-bolt'].includes(event.id)) return { x: 0, y: 0 };
    const t = phase(event, now, false).elapsed;
    const s = t >= 0 && t < 155 ? Math.sin(t / 12) * 2.2 * (1 - t / 155) : 0;
    return { x: s, y: s * 0.45 };
  }
  const flash = (event, now) => (pixel(event) ? root.BoardPixelFX.flash(event, now) : null);
  const reaction = (event, id, now, reduced) =>
    pixel(event) ? root.BoardPixelFX.reaction(event, id, now, reduced) : null;
  const beginFrame = () => ({ left: 2000 });
  root.BoardSpellFX = {
    phase,
    colorFor,
    drawGround,
    drawAir,
    drawFog,
    drawWardMarkers,
    drawTraits,
    beginFrame,
    shake,
    flash,
    reaction,
  };
})(typeof window !== 'undefined' ? window : globalThis);
