/* Editable Ink Studio splat scenes. x/y are normalized to the cel, so the board can reproject the art. */
const tau = Math.PI * 2;
const fade = t => Math.sin(Math.PI * t);
const ease = t => 1 - (1 - Math.min(1, t)) ** 3;
const hot = [0xe84210, 0xff6d11, 0xffc24c, 0xffeaa1, 0xfff8dc];
const sun = [0xf3a326, 0xffbd43, 0xffdfa1, 0xfff4df];
const arc = [0x263ede, 0x588eff, 0x92dfff, 0xf3fbff];
const force = [0x5934e8, 0xa480ff, 0xdbbaff, 0xffe9ff];
const haze = [0xb5ced9, 0xcbdde3, 0xe4efee, 0xf7fbf8];
const smoke = [0x2b222a, 0x45343b, 0x684c43];
const moon = [0x8b9cbc, 0xc5d6f1, 0xe9efff, 0xfffffc];
const trace = [0x197740, 0x4dd457, 0x9ff272, 0xedffd7];
const pressure = [0xb5a289, 0xd8c39a, 0xf2e7ce, 0xfff9e9];
const dusk = [0x311744, 0x62368e, 0xac6ad5, 0xecccff];
const sample = (i, k) => {
  const n = Math.sin((i + 1) * 91.7 + k * 197.9) * 43758.5453;
  return n - Math.floor(n);
};
const rgb = c => [(c >> 16) & 255, (c >> 8) & 255, c & 255];
const luminous = { em: true, nd: true };
const flat = { nd: true };
const centered = (r, a) => [Math.cos(a) * r, Math.sin(a) * r];

function line(dab, a, b, radius, color, opacity) {
  const dx = b[0] - a[0],
    dy = b[1] - a[1];
  const steps = Math.max(2, Math.ceil(Math.hypot(dx, dy) * 76));
  for (let j = 0; j < steps; j++) {
    const f = j / (steps - 1);
    dab(a[0] + dx * f, a[1] + dy * f, radius, color, opacity, 0.14);
  }
}
function track(dab, x, y, r, flat, colors, opacity, spin = 0, n = 60) {
  for (let i = 0; i < n; i++) {
    const a = (i * tau) / n + spin;
    dab(
      x + Math.cos(a) * r,
      y + Math.sin(a) * r * flat,
      i % 5 === 0 ? 0.012 : 0.007,
      colors[i % colors.length],
      opacity * (i % 5 === 0 ? 1 : 0.6),
      0.13,
    );
  }
}
function rays(dab, center, colors, r, opacity, seed = 0, n = 12) {
  for (let i = 0; i < n; i++) {
    const a = (i * tau) / n + seed;
    const [x, y] = centered(r * (0.43 + sample(i, 8) * 0.57), a);
    line(
      dab,
      [center[0] + x * 0.41, center[1] + y * 0.41],
      [center[0] + x, center[1] + y],
      0.008,
      colors[i % colors.length],
      opacity,
    );
  }
}

function flare(dab, x, y, r, p, colors = sun) {
  dab(x, y, r * 0.88, colors[0], p * 0.34, -0.12);
  dab(x, y, r * 0.43, colors[1], p * 0.75, 0.0);
  dab(x, y, r * 0.24, colors.at(-1), p, 0.24);
}
function tongues(dab, x, y, scale, lean, t, intensity, colors = hot) {
  for (let j = 0; j < 7; j++) {
    const u = j / 6;
    const width = scale * (0.32 + (1 - u) * 0.51);
    const angle = (u * 1.4 + lean) * 3.2;
    const color = colors[Math.min(colors.length - 1, Math.floor((1 - u) * colors.length))];
    dab(
      x + Math.sin(angle) * u * scale * 0.54 + lean * u * scale * 0.37,
      y - scale * u * (1.8 + 0.26 * Math.sin(t * tau + lean)),
      width,
      color,
      intensity * (0.92 - u * 0.46),
      0.032 * j,
      true,
      [lean * 0.35, -1, 1.25 + u * 0.68],
    );
  }
}
function particles(dab, t, colors, options = {}) {
  const { count = 45, radius = 0.33, vertical = 0.12, heat = false } = options;
  const travel = ease(t);
  for (let i = 0; i < count; i++) {
    const a = sample(i, 2) * tau;
    const speed = 0.22 + sample(i, 3) * 0.78;
    const [dx, dy] = centered(travel * speed * radius, a);
    const size = (0.005 + sample(i, 4) * 0.018) * (1 - t * 0.58);
    const x = 0.5 + dx,
      y = 0.53 + dy - t * (0.2 + sample(i, 6) * 0.8) * vertical;
    if (heat && i % 3 === 0 && t < 0.67) tongues(dab, x, y, size * 1.6, sample(i, 7) - 0.5, t, (1 - t) * 0.82, colors);
    else dab(x, y, size, colors[i % colors.length], (1 - t) * (0.48 + sample(i, 6) * 0.49), sample(i, 7) * 0.2);
  }
}

const scenes = {
  sigil(dab, t) {
    const opacity = fade(t);
    const spin = t * 0.75;
    for (let i = 0; i < 76; i++) {
      const a = (i * tau) / 76 + spin;
      const [x, y] = centered(0.34, a);
      dab(
        0.5 + x,
        0.56 + y * 0.69,
        0.012,
        i % 8 === 0 ? 0xfff1dc : 0xb8a5f2,
        opacity * (i % 5 === 0 ? 0.86 : 0.49),
        0.1,
      );
      dab(0.5 + x * 0.78, 0.56 + y * 0.53, 0.006, 0xc8c2f3, opacity * 0.55, 0.1);
    }
    for (let i = 0; i < 6; i++) {
      const a = (i * tau) / 6 + spin;
      const point = r => [0.5 + Math.cos(a) * r, 0.56 + Math.sin(a) * r * 0.69];
      line(dab, point(0.265), point(0.37), 0.007, 0xfdf0e1, opacity * 0.71);
    }
  },
  flare(dab, t) {
    const p = fade(t);
    flare(dab, 0.5, 0.5, 0.37, p);
    for (let i = 0; i < 6; i++) {
      const a = (i * tau) / 6 + 0.2;
      const [x, y] = centered(0.34 * ease(t), a);
      line(dab, [0.5 + x * 0.45, 0.5 + y * 0.45], [0.5 + x, 0.5 + y], 0.009, sun[3], p * 0.64);
    }
  },
  'fire-bolt'(dab, t) {
    flare(dab, 0.64, 0.49, 0.3, 0.9 + Math.sin(t * tau) * 0.1, hot);
    for (let i = 0; i < 19; i++) {
      const x = 0.62 - sample(i, 2) * 0.48;
      const drift = Math.sin(t * tau + sample(i, 4) * tau);
      const y = 0.49 + (sample(i, 5) - 0.5) * (0.06 + (0.64 - x) * 0.37) + drift * 0.034;
      tongues(dab, x, y, 0.016 + sample(i, 6) * 0.025, 1.35, t, 0.63 + (x - 0.16) * 0.48);
    }
  },
  'fireball-bead'(dab, t) {
    flare(dab, 0.62, 0.51, 0.33, 0.9, hot);
    for (let i = 0; i < 23; i++) {
      const [dx, dy] = centered((0.08 + sample(i, 3) * 0.3) * (0.6 + t * 0.4), i * 2.4 + t * tau);
      dab(0.59 + dx - 0.09, 0.52 + dy, 0.008 + sample(i, 4) * 0.018, hot[i % 4], 0.84 - sample(i, 5) * 0.5, 0.11);
    }
  },
  'fire-impact'(dab, t) {
    flare(dab, 0.5, 0.53, 0.4, Math.max(0, 1 - t * 3), hot);
    particles(dab, t, hot, { heat: true });
    for (let i = 0; i < 11; i++) {
      const a = i * 2.4,
        r = ease(t) * 0.27 * sample(i, 4);
      dab(
        0.5 + Math.cos(a) * r,
        0.54 + Math.sin(a) * r - t * 0.18,
        0.03 + t * 0.016,
        smoke[i % 3],
        t * (1 - t) * 0.58,
        -0.4,
      );
    }
  },

  fireball(dab, t) {
    const swell = t < 0.34 ? ease(t / 0.34) : Math.max(0.16, 1 - (t - 0.34) * 1.32);
    const heat = Math.max(0, 1 - t * 1.51);
    const light = Math.max(0, 1 - t * 4.8);
    flare(dab, 0.5, 0.5, 0.034 + swell * 0.12, light, hot);
    for (let i = 0; i < 18; i++) {
      const [x, y] = centered((0.025 + sample(i, 5) * 0.17) * swell, i * 2.4);
      const radius = (0.018 + sample(i, 16) * 0.04) * (0.3 + swell * 0.7);
      tongues(dab, 0.5 + x, 0.51 + y, radius, Math.sin(i) * 1.4, t * 2 + i, heat * 0.8);
    }
    dab(0.5, 0.5, 0.024 + swell * 0.045, 0xffe9ac, heat * 0.68, 0.28);
    for (let i = 0; i < 69; i++) {
      const angle = i * 2.39996,
        radius = (0.17 + Math.sqrt(sample(i, 2)) * 0.26) * swell;
      const variant = i % 4;
      const life = Math.max(0, Math.min(1, (t - sample(i, 7) * 0.22) / (0.37 + sample(i, 8) * 0.19)));
      const pulse = Math.sin(Math.PI * life) * heat;
      const [dx, dy] = centered(radius, angle);
      const x = 0.5 + dx + life * (sample(i, 11) - 0.5) * 0.04,
        y = 0.5 + dy - life * (0.015 + sample(i, 5) * 0.05);
      const size = (0.009 + sample(i, 6) ** 2 * 0.035) * (1 - life * 0.46);
      if (variant === 0) {
        dab(x, y, size * 1.59, hot[1], pulse * 0.82, 0.05, true, [dx + 0.1, -0.8, 2.36]);
        dab(x + 0.003, y - 0.018, size * 0.73, hot[3], pulse * 0.62, 0.24, true, [0.1, -1, 1.92]);
      } else if (variant === 1 || variant === 2) {
        tongues(dab, x, y, size, Math.sin(angle) * (variant === 1 ? 0.91 : 1.7), life + sample(i, 9), pulse * 0.93);
      } else dab(x, y, size * 0.59, hot[i % 5], (1 - life) * 0.76, 0.19);
      if (t > 0.23) {
        const q = (t - 0.23) / 0.77,
          r = (0.15 + sample(i, 6) * 0.26) * ease(t);
        const [sx, sy] = centered(r, angle);
        dab(0.5 + sx + q * 0.053, 0.5 + sy - q * 0.105, 0.012 + q * 0.029, smoke[i % 3], fade(q) * 0.27, -0.41, false);
      }
    }
  },
  'fireball-ground'(dab, t) {
    const ash = Math.min(1, t * 3);
    for (let i = 0; i < 48; i++) {
      const [x, y] = centered(Math.sqrt(sample(i, 3)) * 0.25, i * 2.4);
      dab(
        0.5 + x,
        0.5 + y,
        0.027 + sample(i, 5) * 0.037,
        smoke[i % 3],
        ash * (0.052 + sample(i, 4) * 0.075),
        -0.3,
        false,
      );
    }
    if (t > 0.64) return;
    const r = 0.38 * ease(t / 0.61);
    const opacity = (1 - t / 0.65) * 0.72;
    for (let i = 0; i < 142; i++) {
      const angle = (i * tau) / 142;
      const [x, y] = centered(r, angle);
      dab(0.5 + x, 0.5 + y, 0.008, hot[2], opacity * (0.72 + sample(i, 8) * 0.28), 0.12);
      dab(0.5 + x * 0.89, 0.5 + y * 0.89, 0.014, hot[0], opacity * 0.36, 0.05);
    }
  },

  'burning-hands'(dab, t) {
    const front = ease(t / 0.23);
    const envelope = Math.max(0, 1 - t) * Math.min(1, t * 13);
    // Evenly spaced cross-sections keep the edges as dense as the center.
    for (let row = 1; row <= 15; row++) {
      const f = row / 15;
      const along = f * front;
      const wind = Math.sin(along * 17 - t * 22);
      for (let lane = -5; lane <= 5; lane++) {
        const side = lane / 5,
          i = row * 11 + lane + 5;
        const x = 0.082 + along * 0.852;
        const y = 0.53 + side * along * 0.385 + (1 - Math.abs(side)) * wind * 0.017 * along;
        const heat = (0.36 + 0.52 * sample(i, 5)) * envelope;
        dab(x, y, 0.02 + along * 0.014, hot[Math.abs(lane) % 3], heat * 0.52, -0.2, true, [1, side * 0.5, 1.55]);
        if (i % 3 === 0 || Math.abs(lane) === 5) {
          const active = 0.68 + 0.32 * Math.sin(t * 31 + sample(i, 2) * tau);
          tongues(
            dab,
            x - 0.007,
            y,
            0.012 + sample(i, 3) * 0.026,
            1.1 - side * 0.53,
            t + sample(i, 4),
            heat * active * 1.15,
          );
        }
      }
    }
    flare(dab, 0.104, 0.53, 0.118, envelope, hot);
  },
  'sacred-flame'(dab, t) {
    const progress = ease(t / 0.4);
    const opacity = t < 0.4 ? t / 0.4 : Math.max(0, 1 - (t - 0.4) / 0.6);
    for (let ray = 0; ray < 11; ray++) {
      const x = 0.5 + (ray - 5) * 0.054;
      const drift = (ray - 5) * 0.025;
      const y = 0.96 * progress * (0.78 + sample(ray, 2) * 0.22);
      const color = ray % 4 === 0 ? sun[3] : sun[ray % 3];
      line(dab, [x, 0], [0.5 + drift, y], ray % 2 ? 0.012 : 0.017, color, opacity * (0.24 + sample(ray, 5) * 0.27));
    }
    if (t > 0.35) flare(dab, 0.5, 0.9, 0.21, opacity, sun);
  },
  'radiant-impact'(dab, t) {
    flare(dab, 0.5, 0.61, 0.33, Math.max(0, 1 - t * 3.7), sun);
    particles(dab, t, sun, { radius: 0.3, vertical: 0.36, count: 68 });
    for (let i = 0; i < 9; i++) {
      const a = (i * tau) / 9 + 0.18,
        [x, y] = centered(0.3 * ease(t), a);
      line(dab, [0.5 + x * 0.62, 0.57 + y * 0.62], [0.5 + x, 0.57 + y], 0.008, sun[i % 4], (1 - t) * 0.66);
    }
  },
  'fog-cloud'(dab, t) {
    const turn = t * tau;
    dab(0.5, 0.5, 0.23, haze[0], 0.53, -0.36, false);
    for (let i = 0; i < 38; i++) {
      const a = i * 2.39996 + Math.sin(turn + i * 0.18) * 0.12,
        radius = sample(i, 2) * 0.31;
      const [dx, dy] = centered(radius, a);
      const x = 0.5 + dx + Math.sin(turn + i * 0.74) * 0.066;
      const y = 0.5 + dy + Math.cos(turn + i * 0.22) * 0.035;
      dab(
        x,
        y,
        0.048 + sample(i, 4) * 0.046,
        haze[i % 4],
        0.14 + sample(i, 5) * 0.24,
        -0.15 + sample(i, 7) * 0.21,
        false,
      );
      if (i % 2 === 0) dab(x - 0.043, y - 0.016, 0.045, haze[2], 0.14, 0.12, false);
    }
  },
  'magic-missile'(dab, t) {
    const white = force.at(-1);
    for (let i = 0; i < 34; i++) {
      const f = i / 33,
        x = 0.16 + 0.59 * f,
        y = 0.51 + Math.sin(f * 8 - t * tau) * (0.105 * (1 - f) + 0.012);
      dab(x, y, 0.012 + f * 0.035, force[i % 4], 0.22 + f * 0.54, 0.12);
      if (i % 4 === 0) dab(x, y - 0.03, 0.012, white, f * 0.85, 0.24);
    }
    flare(dab, 0.74, 0.5, 0.22, 0.99, force);
  },
  'force-impact'(dab, t) {
    flare(dab, 0.5, 0.51, 0.3, Math.max(0, 1 - t * 3.5), force);
    particles(dab, t, force, { radius: 0.3, vertical: 0.14, count: 42 });
    for (let i = 0; i < 55; i++) {
      const [dx, dy] = centered(0.31 * ease(t), (i / 55) * tau);
      dab(0.5 + dx, 0.51 + dy, 0.007, force[i % 4], (1 - t) * 0.49, 0.1);
    }
  },

  'lightning-bolt'(dab, t) {
    // Three separate discharge envelopes, each with its own seeded path.
    const pulses = [
      [0, 0.23, 1],
      [0.29, 0.21, 0.88],
      [0.57, 0.24, 0.64],
    ];
    pulses.forEach(([start, span, peak], k) => {
      const q = (t - start) / span;
      if (q < 0 || q >= 1) return;
      const p = peak * (1 - q) ** 0.42;
      const points = Array.from({ length: 28 }, (_, i) => [
        0.02 + (i * 0.96) / 27,
        i === 0 || i === 27 ? 0.5 : 0.5 + (sample(i, k + 12) - 0.5) * 0.39,
      ]);
      for (let i = 1; i < points.length; i++) {
        line(dab, points[i - 1], points[i], 0.075, arc[0], p * 0.48);
        line(dab, points[i - 1], points[i], 0.036, arc[2], p * 0.75);
        line(dab, points[i - 1], points[i], 0.019, arc[3], p);
        if (i % 4 === 0) {
          const [x, y] = points[i],
            side = i % 2 ? 1 : -1,
            mid = [x + 0.025, y + side * 0.16],
            end = [x + 0.056, y + side * (0.22 + sample(i, 6) * 0.12)];
          line(dab, [x, y], mid, 0.015, arc[2], p * 0.81);
          line(dab, mid, end, 0.008, arc[3], p * 0.64);
        }
      }
    });
  },
  'lightning-scorch'(dab, t) {
    for (let i = 0; i < 120; i++) {
      const x = 0.02 + (0.96 * i) / 119,
        y = 0.5 + Math.sin(i * 0.48) * 0.08 + (sample(i, 11) - 0.5) * 0.12;
      dab(x, y, 0.018 + sample(i, 8) * 0.019, 0x292022, (1 - t) * (0.21 + sample(i, 9) * 0.17), -0.12, false);
      if (i % 4 === 0) dab(x, y - 0.016, 0.011, 0xf98042, Math.max(0, 1 - t * 3) * 0.57, 0.1);
    }
  },
  'lightning-impact'(dab, t) {
    flare(dab, 0.5, 0.53, 0.34, Math.max(0, 1 - t * 2.5), arc);
    rays(dab, [0.5, 0.53], arc, 0.36 * ease(t), (1 - t) * 0.94, 0.29, 11);
    particles(dab, t, arc, { radius: 0.34, vertical: 0.08, count: 38 });
  },
  ray(dab, t) {
    const p = (1 - t) * Math.min(1, t * 16);
    for (let i = 0; i < 91; i++) {
      const f = i / 90,
        x = 0.02 + f * 0.96,
        wave = Math.sin(f * 27 - t * 22) * 0.038;
      dab(x, 0.5 + wave, 0.051, 0x487c94, p * 0.27, -0.14, true, [1, 0.01, 2.1]);
      dab(x, 0.5, 0.026, 0x49ead0, p * 0.69, 0.08);
      dab(x, 0.5 + wave * 0.33, 0.011, 0xeafff2, p, 0.21);
    }
    flare(dab, 0.96, 0.5, 0.27, p, [0x2d9d9f, 0x65e7be, 0xceffe6, 0xffffff]);
  },
  cylinder(dab, t) {
    const lunar = [0x436cba, 0x78bade, 0xbae9f5, 0xf1efff];
    for (let i = 0; i < 72; i++) {
      const u = sample(i, 5),
        f = (sample(i, 3) + t * 0.56) % 1,
        a = i * 2.4 + t * tau;
      const x = 0.5 + Math.cos(a) * (0.1 + u * 0.22),
        y = 0.05 + f * 0.87;
      dab(
        x,
        y,
        0.029 + u * 0.017,
        lunar[i % 4],
        (0.15 + 0.36 * Math.sin(f * Math.PI)) * (0.64 + 0.36 * sample(i, 6)),
        -0.2 + u * 0.3,
        true,
        [0.06, 1, 2.7],
      );
    }
    track(dab, 0.5, 0.88, 0.37, 0.19, lunar, 0.81, t * tau);
  },
  cube(dab, t) {
    const icy = [0x335ab2, 0x6d9fff, 0xb5eafd, 0xf6f1ff],
      p = (1 - t) * Math.min(1, t * 14);
    const x = 0.12 + 0.73 * ease(t);
    for (let row = 0; row < 8; row++) {
      const lean = (row - 3.5) * 0.097;
      line(dab, [x - 0.12, 0.5 + lean], [x, 0.5 + lean], 0.023, icy[row % 4], p * 0.47);
    }
    for (let i = 0; i < 70; i++) {
      const f = (sample(i, 3) + t * 0.89) % 1,
        a = (sample(i, 5) - 0.5) * 0.77;
      dab(0.09 + 0.79 * f, 0.5 + a, 0.009 + sample(i, 2) * 0.018, icy[i % 4], p * 0.79, 0.17, true, [1, 0.05, 1.8]);
    }
  },
  wall(dab, t) {
    for (let i = 0; i < 72; i++) {
      const f = i / 71,
        lift = (sample(i, 5) + t) % 1;
      tongues(
        dab,
        0.025 + f * 0.95,
        0.82 - lift * 0.29,
        0.025 + sample(i, 6) * 0.034,
        Math.sin(i * 2.7 - t * tau),
        lift,
        Math.sin(Math.PI * lift) * 0.74,
      );
    }
    line(dab, [0.024, 0.82], [0.975, 0.82], 0.069, hot[1], 0.29);
  },
  'aura-instant'(dab, t) {
    const storm = [0x4273b8, 0x76bfff, 0xcaf4ff, 0xfff8fe];
    for (let i = 0; i < 3; i++) {
      const q = (t - i * 0.1) / (0.83 - i * 0.12);
      if (q > 0 && q < 1) track(dab, 0.5, 0.5, 0.4 * ease(q), 1, storm, (1 - q) * 0.88, t * tau);
    }
    particles(dab, t, storm, { count: 66, radius: 0.38, vertical: 0.15 });
  },
  'aura-persistent'(dab, t) {
    track(dab, 0.5, 0.515, 0.405, 1, sun, 0.52, t * tau);
    for (let i = 0; i < 6; i++) {
      const a = (i * tau) / 6 + t * tau,
        [x, y] = centered(0.29 + 0.055 * Math.sin(a * 3), a);
      const tip = [0.5 + x, 0.515 + y];
      flare(dab, tip[0], tip[1], 0.11, 0.36 + 0.34 * Math.sin(a * 3) ** 2, sun);
      const [rx, ry] = centered(0.081, a - 0.4);
      line(dab, [tip[0] - rx, tip[1] - ry], tip, 0.012, sun[2], 0.64);
    }
  },
  touch(dab, t) {
    flare(dab, 0.5, 0.53, 0.26, Math.max(0, 1 - t * 2.9), arc);
    for (let i = 0; i < 7; i++) {
      const a = (i * tau) / 7 + t * 3,
        [x, y] = centered(0.36 * ease(t), a);
      const middle = [0.5 + x * 0.41 + 0.026, 0.54 + y * 0.55 - 0.029];
      line(dab, [0.5, 0.54], middle, 0.012, arc[2], (1 - t) * 0.89);
      line(dab, middle, [0.5 + x, 0.54 + y], 0.008, arc[3], (1 - t) * 0.88);
    }
    particles(dab, t, arc, { count: 34, radius: 0.33 });
  },
  buff(dab, t) {
    track(dab, 0.5, 0.54, 0.34, 0.63, sun, 0.76, t * tau);
    track(dab, 0.5, 0.54, 0.25, 0.63, sun, 0.48, -t * tau, 50);
    for (let i = 0; i < 6; i++) {
      const [x, y] = centered(0.34, (i * tau) / 6 + t * tau);
      flare(dab, 0.5 + x, 0.54 + y * 0.63, 0.11, 0.58, sun);
    }
  },
  debuff(dab, t) {
    const curse = [0x602c81, 0xa45bbb, 0xe580db, 0xfbd5f4];
    track(dab, 0.5, 0.56, 0.34, 0.67, curse, 0.72, -t * tau, 60);
    for (let i = 0; i < 5; i++) {
      const a = (i * tau) / 5 - t * tau;
      const [x, y] = centered(0.27, a);
      line(dab, [0.5 + x, 0.56 + y * 0.67], [0.5 + x * 0.72, 0.46 + y * 0.39], 0.011, curse[2], 0.66);
    }
  },
  healing(dab, t) {
    const green = [0x429b78, 0x84de8f, 0xcdf2a1, 0xfff7c3];
    track(dab, 0.5, 0.65, 0.34 * ease(t), 0.46, green, (1 - t) * 0.79, t * tau);
    particles(dab, t, green, { count: 64, vertical: 0.44, radius: 0.24 });
    flare(dab, 0.5, 0.63, 0.27, fade(t) * 0.52, green);
  },
  summon(dab, t) {
    const silver = [0x425bba, 0x827aff, 0xb4d4ff, 0xf5ebff];
    track(dab, 0.5, 0.66, 0.4, 0.55, silver, 0.72, t * tau);
    track(dab, 0.5, 0.66, 0.31, 0.55, silver, 0.55, -t * tau);
    const p = fade(t);
    for (let i = 0; i < 61; i++) {
      const f = sample(i, 4),
        y = 0.65 - sample(i, 5) * 0.46 * ease(t),
        x = 0.5 + (f - 0.5) * 0.54;
      dab(x, y, 0.01 + sample(i, 6) * 0.015, silver[i % 4], p * 0.8, 0.12, true, [0.04, 1, 2.4]);
    }
    flare(dab, 0.5, 0.52, 0.29, p * 0.88, silver);
  },
  teleport(dab, t) {
    const shade = [0x54559d, 0x9477d7, 0xb8a9ee, 0xeeebff],
      p = fade(t);
    for (let i = 0; i < 65; i++) {
      const a = i * 2.4 + t * tau * 0.52,
        r = (0.12 + sample(i, 6) * 0.23) * ease(t);
      const [x, y] = centered(r, a);
      dab(
        0.5 + x,
        0.68 + y * 0.6 - t * (0.15 + sample(i, 2) * 0.3),
        0.016 + sample(i, 3) * 0.023,
        shade[i % 4],
        p * 0.43,
        0.05,
        i % 3 === 0,
      );
    }
    flare(dab, 0.5, 0.62, 0.22, p, shade);
  },
  utility(dab, t) {
    const ink = [0x805ed4, 0x63b1ee, 0xe8baed, 0xfff6da];
    flare(dab, 0.5, 0.54, 0.22, fade(t) * 0.87, ink);
    track(dab, 0.5, 0.58, 0.27 * ease(t), 0.63, ink, fade(t) * 0.72, t * tau);
    particles(dab, t, ink, { count: 40, radius: 0.34, vertical: 0.19 });
  },
  strike(dab, t) {
    const dusk = [0x402b6c, 0x7f51ad, 0xba78e8, 0xe9c8ff];
    flare(dab, 0.5, 0.54, 0.31, Math.max(0, 1 - t * 2.4), dusk);
    track(dab, 0.5, 0.59, 0.38 * ease(t), 0.64, dusk, (1 - t) * 0.9, -t * tau);
    particles(dab, t, dusk, { count: 70, radius: 0.35, vertical: 0.17 });
  },
  'moonbeam-floor'(dab, t) {
    const pulse = 0.81 + Math.cos(t * tau) * 0.12;
    dab(0.5, 0.5, 0.4, moon[1], 0.21, -0.32);
    track(dab, 0.5, 0.5, 0.445, 1, moon.slice(1), pulse, (t * tau) / 60, 120);
    track(dab, 0.5, 0.5, 0.409, 1, moon, pulse * 0.54, (-t * tau) / 60, 90);
  },
  moonbeam(dab, t) {
    for (let i = 0; i < 48; i++) {
      const x = 0.5 + (sample(i, 1) - 0.5) * 0.66,
        f = (sample(i, 2) + t) % 1;
      const alpha = fade(f);
      dab(
        x,
        0.89 - f * 0.84,
        0.02 + sample(i, 3) * 0.009,
        moon[i % 4],
        alpha * (0.15 + sample(i, 6) * 0.36),
        0.14,
        true,
        [0, 1, 4.7],
      );
    }
    for (let i = 0; i < 13; i++) {
      const x = 0.5 + (i - 6) * 0.039;
      line(dab, [x, 0.91], [x, 0.076 + sample(i, 11) * 0.04], 0.014, moon[i % 4], 0.17 + 0.044 * Math.cos(t * tau + i));
    }
    flare(dab, 0.5, 0.91, 0.15, 0.62, moon);
  },
  disintegrate(dab, t) {
    const strength = Math.pow(1 - t, 1.35) * (0.77 + 0.23 * Math.sin(0.7 + t * 39) ** 2);
    line(dab, [0.026, 0.5], [0.974, 0.5], 0.055, trace[0], strength * 0.55);
    line(dab, [0.026, 0.5], [0.974, 0.5], 0.029, trace[1], strength);
    for (let j = 0; j < 5; j++) {
      let last = [0.025, 0.5];
      for (let i = 1; i <= 18; i++) {
        const p = [
          0.025 + (i / 18) * 0.95,
          0.5 + Math.sin((i / 18) * Math.PI) * (sample(i + j * 19, Math.floor(t * 21) + 2) - 0.5) * 0.67,
        ];
        line(dab, last, p, 0.006 + j * 0.0015, trace[1 + (j % 3)], strength * (0.47 + j * 0.07));
        last = p;
      }
    }
    line(dab, [0.026, 0.5], [0.974, 0.5], 0.012, trace[3], strength);
  },
  'disintegrate-hit'(dab, t) {
    flare(dab, 0.5, 0.52, 0.35, Math.max(0, 1 - t * 4.7), trace);
    rays(dab, [0.5, 0.52], trace, 0.43 * ease(t * 2.3), (1 - t) ** 2, t * 5, 19);
    particles(dab, t, trace, { count: 63, radius: 0.42, vertical: 0.18 });
  },
  'disintegrate-dust'(dab, t) {
    for (let i = 0; i < 94; i++) {
      const q = Math.max(0, (t - sample(i, 2) * 0.35) / 0.65);
      const x = 0.5 + (sample(i, 3) - 0.5) * (0.39 + q * 0.52),
        y = 0.59 - sample(i, 7) * 0.5 + q * (0.14 + sample(i, 8) * 0.15);
      dab(x, y, 0.006 + (1 - q) * sample(i, 9) * 0.017, trace[i % 4], fade(q) * (0.43 + sample(i, 5) * 0.54), 0.11);
    }
  },
  thunderwave(dab, t) {
    for (let wave = 0; wave < 4; wave++) {
      const q = (t - wave * 0.097) / 0.54;
      if (q <= 0 || q >= 1) continue;
      const r = 0.1 + 1.01 * ease(q);
      for (let i = 0; i < 116; i++) {
        const a = (i / 115 - 0.5) * Math.PI,
          x = Math.cos(a) * r,
          y = 0.5 + Math.sin(a) * r;
        if (x > 1 || y < 0 || y > 1) continue;
        const alpha = (1 - q) ** 0.64 * (0.62 + 0.35 * sample(i, wave + 2));
        dab(x, y, 0.026, pressure[wave % 2], alpha * 0.62, -0.15, false);
        dab(x, y, 0.012, pressure[2 + (i % 2)], alpha, 0.19);
        dab(
          x - sample(i, 7) * 0.105,
          y + (sample(i, 3) - 0.5) * 0.044,
          0.006 + sample(i, 6) * 0.012,
          pressure[i % 3],
          alpha * 0.64,
          0.03,
          false,
        );
      }
    }
  },
  'thunder-ripple'(dab, t) {
    track(dab, 0.5, 0.5, 0.46 * ease(t), 1, [0xf7e7d1, 0xffffff], (1 - t) * 0.72, 0, 116);
  },
  'toll-the-dead'(dab, t) {
    const p = Math.min(1, t * 12) * Math.min(1, (1 - t) * 2.2);
    const swing = Math.sin(t * 24) * (1 - t) * 0.048;
    const at = (x, y) => [x + (y - 0.21) * swing * 4, y];
    const profile = [
      [0.5, 0.21],
      [0.42, 0.24],
      [0.37, 0.31],
      [0.35, 0.42],
      [0.29, 0.54],
      [0.71, 0.54],
      [0.65, 0.42],
      [0.63, 0.31],
      [0.58, 0.24],
      [0.5, 0.21],
    ];
    for (let i = 0; i < 8; i++) {
      const y = 0.29 + i * 0.032;
      line(dab, at(0.41 - i * 0.011, y), at(0.59 + i * 0.011, y), 0.022, dusk[i % 2], p * 0.55);
    }
    for (let i = 1; i < profile.length; i++)
      line(dab, at(...profile[i - 1]), at(...profile[i]), 0.013, dusk[2 + (i % 2)], p);
    track(dab, 0.5, 0.206, 0.046, 0.76, dusk, p, 0, 24);
    line(dab, at(0.5, 0.5), at(0.5 + swing, 0.606), 0.016, dusk[3], p);
    dab(...at(0.5 + swing, 0.609), 0.023, dusk[2], p);
    for (let i = 0; i < 3; i++) {
      const q = (t - 0.13 - i * 0.1) / 0.56;
      if (q > 0 && q < 1) track(dab, 0.5, 0.68, 0.44 * ease(q), 0.42, dusk, (1 - q) * 0.95, t * tau, 92);
    }
  },
  'healing-word'(dab, t) {
    const vigor = [0x249660, 0x65d08a, 0xa9ee89, 0xffdf73, 0xffffe2];
    const p = Math.min(t * 16, 1) * (1 - t);
    flare(dab, 0.5, 0.69, 0.23, p * 0.94, vigor);
    track(dab, 0.5, 0.74, 0.41 * ease(t * 2.2), 0.38, vigor, p, t * tau, 94);
    for (let i = 0; i < 82; i++) {
      const f = Math.min(1, Math.max(0, (t - sample(i, 5) * 0.31) / (0.56 + sample(i, 8) * 0.12)));
      const a = i * 2.4 + f * 3;
      const dx = Math.cos(a) * (0.075 + sample(i, 4) * 0.28) * ease(f * 1.6);
      const y = 0.75 - f * (0.27 + sample(i, 7) * 0.51);
      dab(0.5 + dx, y, 0.007 + sample(i, 11) * 0.02, vigor[i % 5], fade(f) * 0.99, 0.14, true, [0.09, 1, 1.6]);
    }
  },
  'bless-icon'(dab) {
    dab(0.5, 0.5, 0.43, 0x302312, 1, -0.2, false);
    track(dab, 0.5, 0.5, 0.4, 1, sun, 0.9, 0, 66);
    dab(0.5, 0.5, 0.14, sun[3], 1, 0.2);
    rays(dab, [0.5, 0.5], [sun[2]], 0.325, 1, 0, 8);
  },
  'bane-icon'(dab) {
    dab(0.5, 0.5, 0.43, 0x24102d, 1, -0.2, false);
    track(dab, 0.5, 0.5, 0.4, 1, dusk, 0.9, 0, 66);
    line(dab, [0.5, 0.27], [0.5, 0.69], 0.025, dusk[3], 1);
    line(dab, [0.32, 0.52], [0.5, 0.69], 0.025, dusk[2], 1);
    line(dab, [0.68, 0.52], [0.5, 0.69], 0.025, dusk[2], 1);
  },
  'ward-icon'(dab) {
    dab(0.5, 0.5, 0.43, 0x192a38, 1, -0.2, false);
    track(dab, 0.5, 0.5, 0.4, 1, moon, 0.8, 0, 66);
    const points = [
      [0.5, 0.29],
      [0.69, 0.5],
      [0.5, 0.71],
      [0.31, 0.5],
      [0.5, 0.29],
    ];
    for (let i = 1; i < points.length; i++) line(dab, points[i - 1], points[i], 0.023, moon[3], 1);
  },
  'weapon-swing'(dab, t) {
    const tip = 0.15 + ease(t) * 2.21;
    for (let i = 0; i < 50; i++) {
      const a = -1.61 + tip - i * 0.029;
      const [x, y] = centered(0.43 - (i % 6) * 0.013, a);
      dab(0.48 + x, 0.48 + y, 0.027 - i * 0.00031, arc[i % 4], (1 - t) * (1 - i / 60), 0.12);
    }
    flare(dab, 0.69, 0.5, 0.23, fade(t) * 0.8, arc);
  },
};

const signatures = require('./signature-scenes')({
  tau,
  fade,
  ease,
  sample,
  centered,
  line,
  track,
  rays,
  flare,
  particles,
  hot,
  sun,
  arc,
  force,
});

function world(kit, id, t, w, h) {
  const B = kit.makeBuilder(81, [0x141821, 0x67869c, 0xff8544, 0xfff8ec]);
  const aspect = w / h;
  const dab = (x, y, size, color, opacity, z = 0, emit = true, elongate = null) => {
    if (opacity <= 0.003) return;
    const p = (x - 0.5) * 2 * aspect,
      q = (0.5 - y) * 2;
    const pigment = rgb(color),
      material = emit ? luminous : flat;
    if (elongate) {
      const [dx, dy, length] = elongate;
      B.axial(p, q, z, [dx * aspect, -dy, 0], size * 2 * length, size * 2, pigment, opacity, material);
    } else B.iso(p, q, z, size * 2, pigment, opacity, material);
  };
  (signatures[id] || scenes[id])(dab, t);
  return B.finish({
    cam: { target: [0, 0, 0], dist: 1 / Math.tan((19 * Math.PI) / 180), yaw: 0, pitch: 0, sway: 0 },
    radius: 4,
    detail: 1,
    dither: 0,
  });
}
module.exports = { scenes, world };
