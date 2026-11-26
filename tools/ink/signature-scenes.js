/* Spell-specific transparent art, authored as normalized Ink Studio splats. */
module.exports = ({ tau, fade, ease, sample, centered, line, track, rays, flare, particles, hot, sun, arc, force }) => {
  const vine = [0x345025, 0x638447, 0x9fbd5d, 0xe7e699];
  const spore = [0x534536, 0x77864d, 0xb1bd76, 0xe0e7b4];
  const haloSpore = [0x4c554a, 0x748477, 0xa4b2a3, 0xd7e0cd];
  const rage = [0x780d27, 0xba1632, 0xe63147, 0xff7585];
  const ghost = [0x58477f, 0x9c95d6, 0xcbcaed, 0xfbf0ff];
  const ice = [0x4974ef, 0x89bdff, 0xcbeaff, 0xfbffff];
  const pressure = [0xb5a289, 0xd8c39a, 0xf2e7ce, 0xfff9e9];
  const life = t => Math.min(1, 15 * t) * Math.min(1, (1 - t) * 2.5);
  const path = (dab, points, radius, color, opacity) => {
    for (let i = 1; i < points.length; i++) line(dab, points[i - 1], points[i], radius, color, opacity);
  };
  function weapon(dab, t, form) {
    const y = Math.sin(t * tau) * 0.044;
    const at = (x, h) => [x, h + y];
    flare(dab, 0.56, 0.34 + y, 0.31, 0.65, ice);
    line(dab, at(0.29, 0.76), at(0.59, 0.33), 0.048, ice[0], 0.94);
    line(dab, at(0.29, 0.76), at(0.59, 0.33), 0.022, ice[2], 1);
    for (let j = 0; j < 4; j++) {
      const f = j * 0.036;
      line(dab, at(0.25 + f, 0.68 - f), at(0.36 + f, 0.75 - f), 0.016, ice[j % 3], 0.94);
    }
    if (form === 'mace') {
      const focus = at(0.625, 0.3);
      dab(...focus, 0.15, ice[1], 0.96, 0.02);
      rays(dab, focus, ice.slice(1), 0.217, 0.98, 0.24, 7);
      track(dab, ...focus, 0.13, 0.83, ice.slice(1), 0.9, 0, 44);
      dab(...focus, 0.066, ice[3], 0.91, 0.3);
    } else {
      const outlines = {
        hammer: [
          [0.5, 0.12],
          [0.83, 0.34],
          [0.7, 0.53],
          [0.37, 0.31],
          [0.5, 0.12],
        ],
        axe: [
          [0.56, 0.18],
          [0.7, 0.14],
          [0.84, 0.26],
          [0.87, 0.4],
          [0.83, 0.5],
          [0.75, 0.57],
          [0.69, 0.44],
          [0.5, 0.32],
          [0.56, 0.18],
        ],
      };
      for (let j = 0; j < 8; j++) {
        const f = j / 7;
        const left = form === 'hammer' ? at(0.5 - 0.13 * f, 0.12 + 0.19 * f) : at(0.55 + f * 0.13, 0.19 + f * 0.26);
        const right =
          form === 'hammer'
            ? at(0.83 - 0.13 * f, 0.34 + 0.19 * f)
            : at(0.73 + Math.sin(f * Math.PI) * 0.14, 0.15 + f * 0.39);
        line(dab, left, right, 0.037, ice[j < 2 ? 2 : 0], 0.92);
      }
      path(
        dab,
        outlines[form].map(([x, y]) => at(x, y)),
        0.017,
        ice[3],
        1,
      );
    }
    for (let i = 0; i < 17; i++) {
      const f = (sample(i, 7) + t) % 1;
      dab(0.24 + sample(i, 3) * 0.6, 0.78 - f * 0.64, 0.01, ice[i % 4], fade(f) * 0.64, 0.17);
    }
  }
  const slash = (dab, t, colors) => {
    flare(dab, 0.5, 0.54, 0.33, Math.max(0, 1 - t * 3.1), colors);
    rays(dab, [0.5, 0.54], colors.slice(1), 0.43 * ease(t * 2), (1 - t) ** 1.5, t * 0.8, 14);
    track(dab, 0.5, 0.54, 0.44 * ease(t), 0.68, colors, (1 - t) * 0.9);
  };
  function note(dab, x, y, size, opacity) {
    dab(x, y, size * 0.33, sun[2], opacity, 0.13, true, [1, -0.5, 1.5]);
    line(dab, [x + size * 0.28, y], [x + size * 0.28, y - size * 1.51], size * 0.12, sun[3], opacity);
    line(dab, [x + size * 0.28, y - size * 1.51], [x + size * 0.86, y - size * 1.09], size * 0.13, sun[2], opacity);
  }
  function mushroom(dab, x, y, size, opacity) {
    line(dab, [x, y], [x, y - size * 0.83], size * 0.12, spore[2], opacity);
    dab(x, y - size * 0.79, size * 0.46, spore[1], opacity, 0.21, false, [1, 0, 2.1]);
    dab(x, y - size * 0.93, size * 0.24, spore[3], opacity * 0.84, 0.26, true, [1, 0, 1.8]);
  }
  const star = (dab, x, y, r, p) => {
    line(dab, [x - r, y], [x + r, y], 0.01, sun[2], p);
    line(dab, [x, y - r], [x, y + r], 0.012, sun[3], p);
    dab(x, y, r * 0.32, sun[3], p, 0.24);
  };
  return {
    'summon-weapon': (dab, t) => weapon(dab, t, 'hammer'),
    'weapon-mace': (dab, t) => weapon(dab, t, 'mace'),
    'weapon-axe': (dab, t) => weapon(dab, t, 'axe'),
    'weapon-impact': (dab, t) => slash(dab, t, ice),
    'wall-flames'(dab, t) {
      for (let i = 0; i < 7; i++) {
        const flow = (t + sample(i, 2)) % 1;
        const x = 0.19 + sample(i, 3) * 0.61;
        const height = (0.38 + sample(i, 4) ** 1.35 * 0.5) * (0.69 + 0.31 * fade(flow));
        for (let k = 0; k < 15; k++) {
          const f = k / 14;
          const weave = Math.sin(f * 5.1 + sample(i, 8) * tau + t * tau) * 0.13 * f;
          const width = (0.07 + sample(i, 9) * 0.043) * (1 - f * 0.88);
          const tone = hot[f > 0.73 ? i % 2 : f > 0.3 ? 1 + (i % 2) : 2 + (i % 3)];
          dab(x + weave, 0.91 - height * f, width, tone, (0.46 + fade(flow) * 0.37) * (1 - f * 0.49), k * 0.011, true, [
            weave * 1.3,
            -1,
            1.62,
          ]);
        }
      }
      for (let i = 0; i < 23; i++) {
        const f = (sample(i, 3) + t) % 1;
        dab(
          0.15 + sample(i, 2) * 0.7 + Math.sin(f * 4) * 0.04,
          0.92 - f * 0.88,
          0.013 + sample(i, 9) * 0.011,
          hot[i % 5],
          fade(f) * 0.74,
          0.13,
        );
      }
    },
    'wall-embers'(dab, t) {
      for (let i = 0; i < 73; i++) {
        const f = (sample(i, 8) + t) % 1;
        dab(
          0.018 + i / 74,
          0.52 + (sample(i, 6) - 0.5) * 0.23,
          0.02 + sample(i, 5) * 0.055,
          hot[i % 4],
          0.3 + fade(f) * 0.65,
          0.09,
        );
      }
    },
    'wall-heat'(dab, t) {
      for (let i = 0; i < 8; i++) {
        let from = [0.01, 0.1 + i * 0.105];
        for (let j = 1; j < 29; j++) {
          const x = j / 29;
          const at = [x, 0.1 + i * 0.105 + Math.sin(x * 19 + t * tau + i) * 0.067];
          line(dab, from, at, 0.018, i % 2 ? 0xffd6af : 0xf1a36d, 0.13 * (1 - i * 0.06));
          from = at;
        }
      }
    },
    thunderclap(dab, t) {
      for (let wave = 0; wave < 3; wave++) {
        const q = (t - wave * 0.096) / 0.74;
        if (q <= 0 || q >= 1) continue;
        const r = (0.47 - wave * 0.033) * ease(q);
        for (let i = 0; i < 132; i++) {
          const [x, y] = centered(r, (i / 132) * tau);
          dab(0.5 + x, 0.5 + y, 0.028, pressure[1], 0.66 * (1 - q), 0.06);
          dab(0.5 + x, 0.5 + y, 0.017, 0xfff9e8, (1 - q) ** 0.62, 0.12);
        }
      }
      for (let i = 0; i < 62; i++) {
        const f = Math.max(0, (t - sample(i, 2) * 0.13) / 0.87);
        const [x, y] = centered((0.075 + sample(i, 6) * 0.34) * ease(f * 1.2), i * 2.4);
        dab(
          0.5 + x,
          0.51 + y - f * 0.068,
          0.019 + sample(i, 3) * 0.038,
          pressure[i % 3],
          fade(f) * (1 - f) * 0.68,
          -0.3,
          false,
        );
      }
    },
    'eldritch-bolt'(dab, t) {
      flare(dab, 0.68, 0.51, 0.27, 1, force);
      for (let i = 0; i < 38; i++) {
        const f = i / 37;
        const d = 0.5 * f;
        const z = Math.sin(f * 12 - t * 14);
        for (const side of [-1, 1]) {
          const y = 0.51 + side * z * (0.019 + f * 0.18);
          dab(0.69 - d, y, 0.024 * (1 - f * 0.74), force[i % 3], 1 - f * 0.9, 0.12);
        }
      }
      dab(0.68, 0.51, 0.046, force[3], 0.96, 0.31);
    },
    'eldritch-hit'(dab, t) {
      slash(dab, t, force);
      for (let i = 0; i < 6; i++) {
        const a = t * 2 + (i * tau) / 6;
        const [x, y] = centered(0.34 * ease(t * 1.8), a);
        const [dx, dy] = centered(0.11 * (1 - t), a + 0.55);
        line(dab, [0.5 + x, 0.5 + y], [0.5 + x + dx, 0.5 + y + dy], 0.019, force[i % 4], 1 - t);
      }
    },
    'chill-hand'(dab, t) {
      const dy = Math.sin(t * tau) * 0.037;
      const at = (x, y) => [x, y + dy];
      for (let i = 0; i < 25; i++) {
        const f = (sample(i, 5) + t) % 1;
        dab(
          0.53 - f * 0.47,
          0.52 + (sample(i, 7) - 0.5) * 0.35,
          0.029 + f * 0.021,
          ghost[i % 3],
          (1 - f) * 0.55,
          -0.2,
          false,
        );
      }
      line(dab, at(0.49, 0.58), at(0.64, 0.49), 0.061, ghost[1], 0.94);
      for (let i = 0; i < 5; i++) {
        const y = 0.33 + i * 0.077;
        const x = 0.85 - Math.abs(i - 2) * 0.033;
        path(dab, [at(0.61, 0.53), at(x - 0.061, y), at(x, y + 0.043)], 0.018, ghost[2 + (i % 2)], 0.99);
        dab(...at(x, y + 0.043), 0.02, ghost[3], 0.85, 0.19);
      }
    },
    'chill-grasp'(dab, t) {
      const p = life(t);
      for (let i = 0; i < 5; i++) {
        const x = 0.28 + i * 0.108;
        const lift = 0.36 + Math.sin(i * 0.79) * 0.17;
        const y = 0.68 - lift * ease(t * 4);
        path(
          dab,
          [
            [x, 0.71],
            [x + 0.045, y + 0.1],
            [x + 0.015, y],
            [x - 0.045, y + 0.044],
          ],
          0.019,
          ghost[2 + (i % 2)],
          p,
        );
      }
      track(dab, 0.5, 0.67, 0.33 * ease(t * 2.7), 0.47, ghost, p * 0.71, -t);
      particles(dab, t, ghost, { count: 32, vertical: 0.18 });
    },
    'guiding-star'(dab, t) {
      flare(dab, 0.69, 0.5, 0.31, 0.95, sun);
      star(dab, 0.69, 0.5, 0.13, 1);
      for (let i = 0; i < 30; i++) {
        const f = (sample(i, 3) + t) % 1;
        const y = 0.5 + (sample(i, 5) - 0.5) * (0.13 + f * 0.41);
        star(dab, 0.67 - f * 0.61, y, 0.012 + sample(i, 8) * 0.026, fade(f) * (1 - f));
      }
    },
    'guiding-mark'(dab, t) {
      slash(dab, t, sun);
      for (let i = 0; i < 8; i++) {
        const [x, y] = centered(0.36 * ease(t * 2.3), (i * tau) / 8);
        star(dab, 0.5 + x, 0.52 + y, 0.053 * (1 - t), Math.sqrt(1 - t));
      }
    },
    'cure-wounds'(dab, t) {
      const invigorate = [0x247650, 0x6cce83, 0xc9f099, 0xffebaa];
      flare(dab, 0.5, 0.57, 0.24, life(t), invigorate);
      for (let i = 0; i < 48; i++) {
        const f = (sample(i, 5) + t * 1.21) % 1;
        const [x, y] = centered(0.13 + 0.29 * (1 - t), (i * tau) / 48 + t * 6);
        dab(
          0.5 + x,
          0.66 + y * 0.55 - 0.35 * f,
          0.011 + sample(i, 2) * 0.018,
          invigorate[i % 4],
          life(t) * fade(f),
          0.12,
        );
      }
      for (let j = 0; j < 4; j++) {
        const a = (j * tau) / 4 + t * 2.2;
        const [x, y] = centered(0.29 * (1 - t), a);
        star(dab, 0.5 + x, 0.61 + y * 0.83, 0.045, life(t));
      }
    },
    'ward-shield'(dab, t) {
      const p = 0.28 + life(t) * 0.72;
      const r = 0.32 + Math.sin(t * tau) * 0.015;
      for (let i = 0; i < 6; i++) {
        const [x, y] = centered(r, (i * tau) / 6 - tau / 4);
        const [xx, yy] = centered(r, ((i + 1) * tau) / 6 - tau / 4);
        line(dab, [0.5 + x, 0.51 + y], [0.5 + xx, 0.51 + yy], 0.035, ice[0], p * 0.46);
        line(dab, [0.5 + x, 0.51 + y], [0.5 + xx, 0.51 + yy], 0.013, ice[3], p);
        if (i % 2 === 0) line(dab, [0.5, 0.51], [0.5 + x, 0.51 + y], 0.008, ice[1], p * 0.54);
      }
      flare(dab, 0.5, 0.51, 0.22, Math.max(0, 1 - t * 2.2), ice);
    },
    'hold-bindings'(dab, t) {
      const p = life(t);
      for (let coil = 0; coil < 4; coil++) {
        const y = 0.26 + coil * 0.145;
        for (let i = 0; i < 13; i++) {
          const a = (i / 13) * tau + t * 3 + coil * 0.81;
          const r = 0.35 - 0.13 * ease(t * 2.3);
          const x = 0.5 + r * Math.cos(a),
            yy = y + Math.sin(a) * 0.06;
          track(dab, x, yy, 0.033, 0.62, force, p * (0.58 + 0.42 * Math.sin(a) ** 2), a, 14);
        }
      }
    },
    'counterspell-sever'(dab, t) {
      const p = life(t);
      for (let i = 0; i < 3; i++) {
        const f = Math.max(0, (t - i * 0.13) / 0.74);
        track(dab, 0.5, 0.51, 0.1 + 0.32 * (1 - ease(f)), 0.79, ice, p * (1 - f), i * 0.45 - t * 7, 68);
      }
      const chop = 0.15 + 0.64 * ease(t * 1.6);
      line(dab, [chop - 0.13, 0.68], [chop + 0.15, 0.26], 0.023, ice[3], p);
      rays(dab, [0.5, 0.5], force, 0.41 * ease(t), (1 - t) ** 1.7, 0.1, 15);
    },
    'guardian-forms'(dab, t) {
      track(dab, 0.5, 0.5, 0.42, 1, sun, 0.51, t * tau, 123);
      for (let i = 0; i < 6; i++) {
        const a = t * tau + (i * tau) / 6;
        const x = 0.5 + Math.cos(a) * 0.36,
          y = 0.5 + Math.sin(a) * 0.36;
        const d = Math.sin(a * 3) * 0.019;
        dab(x, y - 0.049 + d, 0.018, sun[3], 0.97, 0.22);
        for (const side of [-1, 1]) {
          path(
            dab,
            [
              [x + side * 0.015, y - 0.027 + d],
              [x + side * 0.059, y - 0.06 + d],
              [x + side * 0.081, y - 0.048 + d],
              [x + side * 0.04, y + 0.013 + d],
            ],
            0.009,
            sun[2],
            0.74,
          );
        }
        line(dab, [x, y - 0.023 + d], [x, y + 0.052 + d], 0.023, sun[1], 0.72);
        for (let j = 1; j < 7; j++)
          dab(x + Math.sin(a) * j * 0.013, y - Math.cos(a) * j * 0.011, 0.013, sun[j % 4], 0.45 * (1 - j / 8), 0.1);
      }
    },
    'bardic-notes'(dab, t) {
      for (let i = 0; i < 8; i++) {
        const f = (sample(i, 2) + t * 1.05) % 1;
        const x = 0.5 + Math.sin(i * 3 + t * 4) * (0.17 + f * 0.19);
        note(dab, x, 0.78 - f * 0.56, 0.045 + sample(i, 6) * 0.03, fade(f) * 0.95);
      }
      for (let j = 0; j < 3; j++) track(dab, 0.5, 0.72, 0.18 + j * 0.089, 0.45, sun, fade(t) * 0.69, t * tau, 73);
    },
    'rage-burst'(dab, t) {
      const pulse = Math.sin(t * Math.PI) * (1 - t * 0.5);
      dab(0.5, 0.58, 0.3, rage[0], pulse * 0.68, 0.01);
      dab(0.5, 0.56, 0.22, rage[1], pulse * 0.5, 0.08);
      const shock = ease(t * 2.25);
      track(dab, 0.5, 0.72, 0.12 + shock * 0.33, 0.45, rage.slice(1), (1 - shock) * 0.92);
      for (let i = 0; i < 7; i++) {
        const f = Math.max(0, Math.min(1, t * 1.45 - i * 0.047));
        const [x, y] = centered(0.15 + sample(i, 6) * 0.19, i * 2.4);
        line(
          dab,
          [0.5 + x * f, 0.69 + y * 0.35 - f * 0.35],
          [0.5 + x * (f + 0.25), 0.61 + y * 0.35 - f * 0.35],
          0.009 + sample(i, 5) * 0.007,
          rage[1 + (i % 3)],
          fade(f) * 0.95,
        );
      }
    },
    'spore-halo'(dab, t) {
      const p = life(t);
      const reach = ease(t * 1.9);
      for (let i = 0; i < 66; i++) {
        const a = i * 2.4 + t * 2;
        const r = (0.13 + 0.32 * sample(i, 5)) * reach;
        const [x, y] = centered(r, a);
        dab(
          0.5 + x,
          0.58 + y * 0.67 - t * sample(i, 8) * 0.26,
          0.011 + sample(i, 3) * (i % 5 === 0 ? 0.057 : 0.022),
          haloSpore[i % 4],
          p * (0.57 + sample(i, 6) * 0.42),
          0.16,
          i % 4 !== 0,
        );
      }
    },
    'symbiotic-growth'(dab, t) {
      dab(0.5, 0.67, 0.33, spore[0], 0.56, 0.03);
      dab(0.5, 0.58, 0.27, spore[1], 0.38 + Math.sin(t * tau) * 0.1, 0.1);
      for (let i = 0; i < 13; i++) {
        const [x, y] = centered(0.34 * sample(i, 7) + 0.025, i * 2.4);
        mushroom(
          dab,
          0.5 + x,
          0.75 + y * 0.46,
          (0.05 + sample(i, 5) * 0.062) * (0.85 + 0.15 * Math.sin(t * tau + i)),
          0.94,
        );
      }
      for (let i = 0; i < 44; i++) {
        const f = (sample(i, 2) + t) % 1;
        const x = 0.5 + Math.sin(i * 2.4 + f * 2) * 0.35;
        dab(x, 0.77 - f * 0.65, 0.01 + sample(i, 6) * 0.011, spore[i % 4], fade(f) * 0.79, 0.12);
      }
    },
    'shillelagh-bark'(dab, t) {
      const p = life(t);
      path(
        dab,
        [
          [0.3, 0.82],
          [0.44, 0.59],
          [0.54, 0.37],
          [0.7, 0.19],
        ],
        0.048,
        0x6e4825,
        p,
      );
      for (let i = 0; i < 14; i++) {
        const f = (t + i / 14) % 1;
        const x = 0.32 + f * 0.39,
          y = 0.8 - f * 0.62;
        const d = Math.sin(f * 28) * 0.12;
        line(dab, [x - d, y + 0.048], [x + d, y], 0.018, vine[i % 4], fade(f) * 0.93);
        dab(x + d, y, 0.025, vine[2 + (i % 2)], fade(f) * 0.9, 0.23, true, [0.64, -1, 1.9]);
      }
    },
    'entangle-vines'(dab, t) {
      const swell = 0.25 + ease(t * 3) * 0.75;
      for (let i = 0; i < 13; i++) {
        const a = i * 2.4;
        const r = (0.12 + sample(i, 4) * 0.62) * swell;
        let from = [0.5 + Math.cos(a) * 0.08, 0.5 + Math.sin(a) * 0.08];
        for (let j = 1; j <= 14; j++) {
          const f = j / 14;
          const angle = a + Math.sin(f * 7 + i) * 0.45 + f * 0.17 * Math.sin(t * tau);
          const [x, y] = centered(r * f, angle);
          const at = [0.5 + x, 0.5 + y];
          line(dab, from, at, 0.017 * (1 - f * 0.61), vine[i % 2], 0.89);
          if (j % 3 === 0)
            dab(at[0], at[1], 0.027, vine[1 + (i % 3)], 0.91, 0.12, false, [Math.sin(angle), -Math.cos(angle), 2.2]);
          from = at;
        }
      }
    },
  };
};
