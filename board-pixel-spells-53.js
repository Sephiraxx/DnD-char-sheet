/* Pixel spells, batch 53: rebuilt silhouettes and calm lasting zones. */
(function (root) {
  'use strict';
  const FX = root.BoardPixelFX;
  if (!FX) return;
  const k = FX.kit;
  const GOLD = ['#392442', '#946132', '#deb540', '#ffe27e', '#fff5cf', '#ffffff'];
  const SILVER = ['#192c46', '#456788', '#7db5c9', '#bceeff', '#e8fbff', '#ffffff'];
  const VIOLET = ['#291338', '#663d91', '#aa66d7', '#daabff', '#f4ddff', '#ffffff'];
  const PSYCHIC = ['#35103f', '#8734a6', '#d64bb9', '#ff8ae3', '#ffe1fb', '#ffffff'];
  const PLAGUE = ['#27311b', '#60752a', '#9ab740', '#cfec75', '#efffb5', '#ffffff'];
  const WIND = ['#193440', '#46848c', '#81c8cf', '#b4edf0', '#e3ffff', '#ffffff'];
  const LEAF = ['#263329', '#617342', '#a8b968', '#e1dea0', '#fff0c0', '#ffffff'];
  const C = k.CAST;

  function beats(at, stop, kind = 'soft', power = 0.035) {
    return event => (event.targets?.length ? event.targets : [null]).map(target => ({ at, stop, target, kind, power }));
  }
  function people(s, caster = false) {
    if (caster && s.pose.base) {
      const b = s.pose.base;
      return [{ id: null, x: b.x, y: b.y - 0.62, baseX: b.x, baseY: b.y, span: b.span || 1 }];
    }
    if (s.targets.length) return s.targets;
    return people(s, true);
  }
  function feet(t) {
    return k.P({ x: t.baseX ?? t.x, y: t.baseY ?? t.y + 0.62 });
  }
  function stroke(points, ramp, width = 2, index = 4) {
    for (const [color, size] of [
      [ramp[0], width + 2],
      [ramp[index], width],
    ]) {
      for (let j = 1; j < points.length; j++) {
        const a = points[j - 1],
          b = points[j];
        const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / Math.max(1, width)));
        for (let i = 0; i <= n; i++) k.dot(k.mix(a.x, b.x, i / n), k.mix(a.y, b.y, i / n), color, size);
      }
    }
  }
  function spark(x, y, ramp, size = 3) {
    k.dot(x, y, ramp[0], size + 2);
    k.dot(x, y, ramp[5], size);
    k.dot(x - size, y, ramp[0], 3);
    k.dot(x + size, y, ramp[0], 3);
    k.dot(x - size, y, ramp[3], 1);
    k.dot(x + size, y, ramp[3], 1);
  }
  function ring(x, y, rx, ry, ramp, alpha = 1, width = 2) {
    rx = Math.max(2, Math.round(rx));
    ry = Math.max(2, Math.round(ry));
    const img = k.sprite(`53:ring:${ramp[3]}:${rx}:${ry}:${width}`, rx * 2 + 8, ry * 2 + 8, ramp, set => {
      for (let v = -ry - 1; v <= ry + 1; v++)
        for (let u = -rx - 1; u <= rx + 1; u++) {
          const d = Math.hypot(u / rx, v / ry);
          if (Math.abs(d - 1) <= width / Math.min(rx, ry) / 2) set(u + rx + 4, v + ry + 4, v < 0 ? 5 : 3);
        }
    });
    k.blit(img, x - rx - 4, y - ry - 4, alpha);
  }
  function motes(s, p, ramp, e, n = 12, reach = 24) {
    if (e < 0 || e > 600) return;
    for (let i = 0; i < n; i++) {
      const a = k.hash(i, s.event.seed, 53) * k.tau;
      const r = (5 + k.ease(k.clamp(e / 430)) * reach) * (0.5 + k.hash(i, s.event.seed, 8) * 0.5);
      const x = p.x + Math.cos(a) * r,
        y = p.y + Math.sin(a) * r * 0.7 - e / 55;
      k.dot(x, y, ramp[0], 4);
      k.dot(x, y, ramp[i % 3 ? 4 : 5], 2);
    }
  }
  function impacts(s, ramp, key, size = 30) {
    s.hits.forEach((hit, i) => {
      const t = s.targets.find(t => t.id === hit.id) || s.targets[i % Math.max(1, s.targets.length)];
      const p = t ? k.P(t) : s.area ? k.P(s.area) : s.pose.target ? k.P(s.pose.target) : null;
      if (!p) return;
      const e = s.real(hit);
      k.drawHit(k.hitStyle(`53:${key}`, ramp, { S: size, spikes: 5, jag: 0.22 }), p, e);
      k.shards(p, e, ramp, (s.event.seed || 0) + i * 17, 8, 24);
    });
  }
  function glyph(key, rows, ramp, scale = 1) {
    return k.sprite(
      `53:glyph:${key}:${scale}`,
      Math.max(...rows.map(row => row.length)) * scale + 4,
      rows.length * scale + 4,
      ramp,
      set => {
        rows.forEach((row, y) =>
          [...row].forEach((ch, x) => {
            if (ch === '.') return;
            for (let v = 0; v < scale; v++)
              for (let u = 0; u < scale; u++) set(x * scale + u + 2, y * scale + v + 2, Number(ch));
          }),
        );
      },
    );
  }
  function centered(img, p, alpha = 1) {
    k.blit(img, p.x - img.width / 2, p.y - img.height / 2, alpha);
  }
  function silhouette(ramp, phase, outlineOnly = false) {
    return k.sprite(`53:figure:${ramp[3]}:${phase}:${outlineOnly}`, 27, 37, ramp, set => {
      const inside = (x, y) =>
        Math.hypot((x - 13) / 4, (y - 7) / 4) < 1 ||
        (y >= 12 && y < 26 && Math.abs(x - 13) < 8 - (y - 12) * 0.2) ||
        (y >= 25 && y < 34 && (Math.abs(x - 9) < 3 || Math.abs(x - 17) < 3));
      for (let y = 2; y < 35; y++)
        for (let x = 3; x < 24; x++) {
          if (!inside(x, y)) continue;
          const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
          if (outlineOnly ? edge && (x + y + phase) % 4 !== 0 : k.dith(x, y) > phase / 5) set(x, y, edge ? 5 : 4);
        }
    });
  }
  function areaInfo(s, fallback = 20) {
    const a = s.area || s.pose.target || s.pose.base;
    if (!a) return null;
    return { p: k.P(a), r: Math.max(16, Math.round(((s.area?.feet || fallback) / (s.grid.feet || 5)) * 16)) };
  }
  function areaPoint(s, i, fallback = 20) {
    const a = s.area;
    const u = k.hash(i, s.event.seed, 1),
      v = k.hash(i, s.event.seed, 2);
    const corners = a?.kind === 'cube' ? k.outline(a, s.grid) : [];
    if (corners.length >= 4) {
      const x = corners[0][0] + (corners[1][0] - corners[0][0]) * u + (corners[3][0] - corners[0][0]) * v;
      const y = corners[0][1] + (corners[1][1] - corners[0][1]) * u + (corners[3][1] - corners[0][1]) * v;
      return k.P({ x, y });
    }
    const z = areaInfo(s, fallback);
    return {
      x: z.p.x + Math.cos(u * k.tau) * Math.sqrt(v) * z.r * 0.92,
      y: z.p.y + Math.sin(u * k.tau) * Math.sqrt(v) * z.r * 0.92,
    };
  }
  function pillar(ramp, width, height, slant = 0) {
    width = Math.round(width);
    height = Math.round(height);
    slant = Math.round(slant);
    return k.sprite(
      `53:pillar:${ramp[3]}:${width}:${height}:${slant}`,
      width + Math.abs(slant) + 8,
      height + 8,
      ramp,
      set => {
        for (let y = 2; y <= height; y++)
          for (let x = 0; x < width; x++) {
            const edge = Math.min(x, width - x - 1);
            if (edge < 2 && k.dith(x, y) < 0.5) continue;
            set(
              x + 4 + Math.round(slant > 0 ? slant * (1 - y / height) : (-slant * y) / height),
              y + 2,
              edge < 3 ? 3 : edge < width * 0.25 ? 4 : 5,
            );
          }
      },
    );
  }

  // Greater Invisibility: a bright humanoid dissolves into a pale dithered contour and heat ripples.
  FX.register('greaterinvis', {
    palette: SILVER,
    travel: 190,
    beats: beats(C + 190, 80),
    end: () => 1330,
    air(s) {
      const e = s.c.t - C;
      if (e < 0) return;
      people(s).forEach((t, i) => {
        const p = k.P(t),
          f = feet(t);
        const q = k.clamp((e - 140) / 470),
          phase = Math.min(4, Math.floor(q * 5));
        const img = silhouette(SILVER, phase, e > 610);
        k.blit(img, p.x - 13, f.y - 34, e > 700 ? 0.25 : 0.75);
        if (e < 540) {
          const r = 8 + 9 * k.ease(k.clamp(e / 190));
          ring(p.x, p.y, r, 19, SILVER, e < 400 ? 0.75 : 0.25);
        }
        const hit = s.hits.find(h => h.id === t.id) || s.hits[0];
        if (hit) {
          motes(s, p, SILVER, s.real(hit), 18, 26);
          k.shards(p, s.real(hit), SILVER, (s.event.seed || 0) + i, 7, 21);
        }
        if (e > 470)
          for (let j = 0; j < 3; j++) {
            const y = f.y - 7 - j * 10,
              x = p.x + Math.sin(s.c.raw / 130 + j * 2) * 3;
            const ripple = k.sprite(`53:heat:${j}`, 19, 5, SILVER, set => {
              for (let u = 2; u < 17; u++) if (u % 4 !== j) set(u, 2 + Math.round(Math.sin(u / 3)), 4);
            });
            k.blit(ripple, x - 9, y, 0.25);
          }
      });
    },
  });

  // Freedom of Movement: heavy silver chains burst apart as a white-blue ribbon wraps the body.
  FX.register('freedom-of-movement', {
    palette: SILVER,
    travel: 180,
    beats: beats(C + 180, 95),
    end: () => 1380,
    air(s) {
      const e = s.c.t - C;
      if (e < 0) return;
      people(s).forEach(t => {
        const p = k.P(t),
          hit = s.hits.find(h => h.id === t.id) || s.hits[0];
        const real = hit ? s.real(hit) : -1;
        const link = glyph('chain', ['.4444.', '44..54', '4...54', '45..44', '.4444.'], SILVER);
        if (real < 420)
          for (let j = 0; j < 6; j++) {
            const side = j % 2 ? 1 : -1,
              q = k.clamp(real / 420);
            const x = p.x + side * (6 + k.ease(q) * (19 + j * 2));
            const y = p.y - 10 + Math.floor(j / 2) * 10 - Math.sin(q * Math.PI) * 15 + q * q * 19;
            k.blitRotated(link, x, y, side * q * 4 + j * 0.4);
          }
        if (e < 850) {
          const pts = [];
          for (let j = 0; j < 32; j++) {
            const a = (j / 31) * k.tau * 1.8 + s.c.raw / 170;
            pts.push({ x: p.x + Math.sin(a) * 15, y: p.y + 20 - j * 1.25 });
          }
          stroke(pts, SILVER, e > 680 ? 2 : 3, 4);
        }
        if (hit) {
          k.drawHit(k.hitStyle('53:chains', SILVER, { S: 32, spikes: 4 }), p, real);
          k.shards(p, real, SILVER, s.event.seed, 12, 29);
        }
        if (e > 550) ring(p.x, feet(t).y, 15, 5, SILVER, 0.5);
      });
    },
  });

  // Raulothim's Psychic Lance: a broad pink-white spear punches through the head, ringing violet.
  FX.register('raulothims-psychic-lance', {
    palette: PSYCHIC,
    travel: 200,
    beats: beats(C + 200, 135, 'beam', 0.075),
    end: () => 1160,
    air(s) {
      if (!s.pose.hand || !s.targets.length || s.c.t < C) return;
      const H = k.P(s.pose.hand),
        T = k.P(s.targets[0]);
      T.y -= 10;
      const dx = T.x - H.x,
        dy = T.y - H.y,
        len = Math.hypot(dx, dy) || 1;
      const ux = dx / len,
        uy = dy / len,
        e = s.c.t - C;
      if (e < 470) {
        const q = e < 200 ? k.ease(e / 200) : 1;
        const tip = { x: H.x + ux * (len + 18) * q, y: H.y + uy * (len + 18) * q };
        const length = Math.max(34, Math.min(90, len * 0.8));
        const img = k.sprite(`53:lance:${Math.round(length)}`, Math.round(length) + 6, 19, PSYCHIC, set => {
          for (let x = 2; x < length + 2; x++) {
            const half = Math.max(1, Math.round(6 * Math.min((length + 2 - x) / 18, 1)));
            for (let y = -half; y <= half; y++) set(x, y + 9, Math.abs(y) < 2 ? 5 : Math.abs(y) < 4 ? 4 : 2);
          }
        });
        stroke([H, { x: tip.x - ux * 12, y: tip.y - uy * 12 }], PSYCHIC, e > 380 ? 2 : 4, 3);
        k.blitRotated(img, tip.x, tip.y, Math.atan2(dy, dx), 0.98, 0.5);
      }
      const hit = s.hits[0],
        real = s.real(hit);
      if (real >= 0 && real < 520) {
        const q = k.clamp(real / 420);
        ring(T.x, T.y, 12 + 15 * k.ease(q), 16 + 10 * k.ease(q), PSYCHIC, real < 290 ? 1 : 0.5, 3);
        if (real > 85) ring(T.x, T.y, 8 + 10 * q, 13 + 5 * q, VIOLET, 0.75);
      }
      k.drawHit(k.hitStyle('53:psychic', PSYCHIC, { S: 44, spikes: 7, jag: 0.2 }), T, real);
      k.shards(T, real, PSYCHIC, s.event.seed, 13, 31);
    },
  });

  // Raise Dead: a towering white-gold resurrection beam lifts a soul beneath halos and a beating heart.
  FX.register('raise-dead', {
    palette: GOLD,
    travel: 300,
    beats: beats(C + 300, 180),
    end: () => 1920,
    ground(s) {
      const e = s.c.t - C;
      if (e < 0) return;
      people(s).forEach(t => {
        const p = feet(t),
          q = k.ease(k.clamp(e / 300));
        ring(p.x, p.y, 24 * q + 4, 12 * q + 3, GOLD, e > 1250 ? 0.25 : 1, 3);
        if (e < 1220) {
          const img = pillar(GOLD, e < 190 ? 18 : 30, 92);
          k.blit(img, p.x - img.width / 2, p.y - 92, e > 940 ? 0.25 : 0.75);
        }
      });
    },
    air(s) {
      const e = s.c.t - C;
      if (e < 0) return;
      const heart = glyph(
        'heart',
        [
          '..444..444..',
          '.4555445554.',
          '455555555554',
          '455555555554',
          '.455555554.',
          '..4555554..',
          '...45554...',
          '....454....',
          '.....4.....',
        ],
        GOLD,
        2,
      );
      people(s).forEach(t => {
        const p = k.P(t),
          f = feet(t),
          lift = 10 * k.ease(k.clamp((e - 160) / 360));
        if (e > 170 && e < 1180) {
          const soul = silhouette(GOLD, 2);
          k.blit(soul, p.x - 13, f.y - 34 - lift, e > 960 ? 0.25 : 0.5);
          ring(p.x, f.y - 51 - lift, 20, 6, GOLD, 1, 3);
          ring(p.x, f.y - 15 - lift, 23, 8, GOLD, 0.75);
          for (let j = 0; j < 6; j++) {
            const a = (j / 6) * k.tau;
            stroke(
              [
                { x: p.x + Math.cos(a) * 20, y: p.y + Math.sin(a) * 23 - lift },
                { x: p.x + Math.cos(a) * 34, y: p.y + Math.sin(a) * 38 - lift },
              ],
              GOLD,
              2,
              4,
            );
          }
          centered(heart, { x: p.x, y: p.y - 5 - lift + (Math.floor(e / 130) % 2 ? -1 : 1) });
        }
        const hit = s.hits.find(h => h.id === t.id) || s.hits[0];
        if (hit) {
          motes(s, p, GOLD, s.real(hit), 18, 31);
          k.shards(p, s.real(hit), GOLD, s.event.seed, 8, 28);
        }
        if (e > 1120) {
          ring(p.x, f.y, 19, 7, GOLD, 0.5);
          spark(p.x, p.y - 17, GOLD, 2);
        }
      });
    },
    flash: (event, e) => (e >= 0 && e < 65 ? { color: GOLD[4], alpha: 0.18 } : null),
  });

  // Seeming: a lavender curtain sweeps each creature, revealing a large mask and a violet body contour.
  FX.register('seeming', {
    palette: VIOLET,
    travel: 240,
    beats: beats(C + 240, 85),
    end: () => 1440,
    air(s) {
      const e = s.c.t - C;
      if (e < 0) return;
      const mask = glyph(
        'mask',
        [
          '.444444444444.',
          '45555555555554',
          '45555555555554',
          '45..45554..454',
          '45..45554..454',
          '.45555555554.',
          '..455555554..',
          '...44..444...',
          '....44444....',
        ],
        VIOLET,
        2,
      );
      people(s).forEach(t => {
        const p = k.P(t),
          f = feet(t);
        if (e < 540) {
          const x = p.x - 18 + 36 * k.clamp(e / 360);
          const veil = k.sprite('53:veil', 19, 43, VIOLET, set => {
            for (let y = 2; y < 41; y++)
              for (let u = 2; u < 17; u++) {
                if (u < 5 && k.dith(u, y) < 0.5) continue;
                set(u + Math.round(Math.sin(y / 6)), y, u > 13 ? 5 : u > 9 ? 4 : 3);
              }
          });
          k.blit(veil, x - 9, f.y - 39, 0.75);
        }
        if (e >= 180 && e < 710) centered(mask, { x: p.x, y: p.y - 6 }, e > 570 ? 0.5 : 1);
        if (e > 450) k.blit(silhouette(VIOLET, 1, true), p.x - 13, f.y - 34, 0.5);
        const hit = s.hits.find(h => h.id === t.id) || s.hits[0];
        if (hit) {
          motes(s, p, VIOLET, s.real(hit), 10, 21);
          k.shards(p, s.real(hit), VIOLET, s.event.seed, 5, 18);
        }
      });
    },
  });

  // Holy Weapon: an immense white-gold sword ignites beside the wielder, shedding long rays and sparks.
  FX.register('holy-weapon', {
    palette: GOLD,
    travel: 180,
    beats: beats(C + 180, 100),
    end: () => 1350,
    air(s) {
      const e = s.c.t - C;
      if (e < 0) return;
      const sword = glyph(
        'holy-sword',
        [
          '.....5.....',
          '....454....',
          '....454....',
          '....454....',
          '....454....',
          '....454....',
          '....454....',
          '....454....',
          '.444454444.',
          '.555555555.',
          '....434....',
          '....434....',
          '....454....',
          '....444....',
        ],
        GOLD,
        2,
      );
      people(s).forEach(t => {
        const p = k.P(t),
          f = feet(t),
          at = { x: p.x + 8, y: p.y - 3 };
        if (e < 760) {
          ring(at.x, at.y - 8, 21, 25, GOLD, e > 610 ? 0.5 : 0.75, 3);
          for (let j = 0; j < 8; j++) {
            const a = (j * k.tau) / 8 + 0.15,
              r = 28 + (j % 2) * 7;
            stroke(
              [
                { x: at.x + Math.cos(a) * 15, y: at.y - 8 + Math.sin(a) * 18 },
                { x: at.x + Math.cos(a) * r, y: at.y - 8 + Math.sin(a) * r },
              ],
              GOLD,
              2,
              4,
            );
          }
        }
        centered(sword, at, e > 790 ? 0.5 : 1);
        const hit = s.hits.find(h => h.id === t.id) || s.hits[0];
        if (hit) {
          k.drawHit(k.hitStyle('53:holy', GOLD, { S: 40, spikes: 6 }), at, s.real(hit));
          motes(s, at, GOLD, s.real(hit), 12, 28);
        }
        if (e > 180) {
          spark(at.x + 2, at.y - 23, GOLD, 2);
          ring(p.x, f.y, 14, 5, GOLD, 0.5);
        }
      });
    },
  });

  // Swift Quiver: a silver-blue quiver bristles with luminous arrows, then fires a fast paired volley.
  FX.register('swift-quiver', {
    palette: SILVER,
    travel: 200,
    beats: beats(C + 200, 85),
    end: () => 1400,
    air(s) {
      const e = s.c.t - C;
      if (e < 0) return;
      const quiver = glyph(
        'quiver',
        [
          '.444444444.',
          '45555555554',
          '.43333334.',
          '.43444334.',
          '.43444334.',
          '.43444334.',
          '.43444334.',
          '..433334..',
          '..444444..',
        ],
        SILVER,
        2,
      );
      const arrow = glyph(
        'swift-arrow',
        ['...5...', '..454..', '.44544.', '...4...', '...4...', '...4...', '..454..', '.4.4.4.'],
        SILVER,
      );
      people(s, true).forEach(t => {
        const p = k.P(t),
          at = { x: p.x - 8, y: p.y + 3 };
        if (e < 850) ring(at.x, at.y - 8, 21, 25, SILVER, 0.5);
        for (let j = 0; j < 7; j++) {
          const x = at.x - 9 + j * 3,
            y = at.y - 13 - (j % 3) * 3 - 5 * k.ease(k.clamp(e / 200));
          stroke(
            [
              { x, y: y + 15 },
              { x, y },
            ],
            SILVER,
            2,
            4,
          );
          centered(arrow, { x, y: y - 2 });
        }
        centered(quiver, at, e > 850 ? 0.5 : 1);
        for (let j = 0; j < 2; j++) {
          const q = (e - 370 - j * 100) / 260;
          if (q < 0 || q > 1) continue;
          const tip = { x: at.x + q * 72, y: at.y - 24 - q * (18 + j * 12) };
          stroke([{ x: tip.x - 25, y: tip.y + 8 }, tip], SILVER, 3, 3);
          k.blitRotated(arrow, tip.x, tip.y, Math.PI / 2 - 0.3, 0.5, 0.2);
        }
        const hit = s.hits[0];
        if (hit) {
          motes(s, at, SILVER, s.real(hit), 10, 23);
          k.shards(at, s.real(hit), SILVER, s.event.seed, 7, 20);
        }
      });
    },
  });

  function sunFloor(r) {
    return k.sprite(`53:sunfloor:${r}`, r * 2 + 12, r * 2 + 12, GOLD, set => {
      const c = r + 6;
      for (let y = -r - 2; y <= r + 2; y++)
        for (let x = -r - 2; x <= r + 2; x++) {
          const d = Math.hypot(x, y),
            a = Math.atan2(y, x);
          if (d > r) continue;
          const ray = Math.abs(Math.sin(a * 12)) < 0.13;
          if (d > r - 2) set(x + c, y + c, 4);
          else if (d < r * 0.22) set(x + c, y + c, 5);
          else if (ray && d > r * 0.32) set(x + c, y + c, 5);
          else set(x + c, y + c, d < r * 0.7 ? 5 : 4);
        }
    });
  }
  function dawnZone(s, alpha) {
    const z = areaInfo(s, 30);
    if (!z || alpha <= 0) return;
    centered(sunFloor(z.r), z.p, 0.75 * alpha);
    // Broad slanted shafts live below the figures, with a dazzling central sun column.
    for (let j = -2; j <= 2; j++) {
      const x = z.p.x + j * z.r * 0.31,
        y = z.p.y + Math.sqrt(Math.max(0, z.r * z.r - (x - z.p.x) ** 2)) * 0.35;
      const img = pillar(GOLD, j === 0 ? 18 : 7, 82, 21);
      k.blit(img, x - 4, y - 82, (j === 0 ? 0.5 : 0.25) * alpha);
    }
    const dots = k.sprite('53:sunmote', 7, 7, GOLD, set => {
      set(3, 2, 5);
      set(2, 3, 4);
      set(3, 3, 5);
      set(4, 3, 4);
      set(3, 4, 5);
    });
    for (let i = 0; i < 14; i++) {
      const p = areaPoint(s, i, 30),
        q = (s.c.raw / 2600 + k.hash(i, s.event.seed, 6)) % 1;
      k.blit(dots, p.x - 3, p.y - 3 - q * 24, alpha * (q < 0.8 ? 0.75 : 0.25));
    }
  }

  // Dawn: a pale sunlit floor and bright slanted white-gold shafts fill the entire cylinder.
  FX.register('dawn', {
    palette: GOLD,
    travel: 220,
    beats: beats(C + 220, 140, 'blast', 0.045),
    end: () => 1460,
    ground(s) {
      const e = s.c.t - C,
        z = areaInfo(s, 30);
      if (e < 0 || !z) return;
      if (e < 220) {
        centered(sunFloor(Math.max(8, Math.round(z.r * k.ease(e / 220)))), z.p, 0.75);
      } else if (!s.pose.linger) dawnZone(s, e > 880 ? 0.5 : 1);
    },
    air(s) {
      impacts(s, GOLD, 'dawn', 35);
    },
    linger(s) {
      dawnZone(s, s.linger);
    },
    flash: (event, e) => (e >= 0 && e < 75 ? { color: GOLD[4], alpha: 0.16 } : null),
  });

  // Conjure Volley: dense white-silver arrowheads rain down in waves, bursting into dust on landing.
  FX.register('conjure-volley', {
    palette: SILVER,
    travel: 240,
    beats(event) {
      return [0, 250, 500].flatMap((dt, i) =>
        (event.targets?.length ? event.targets : [null]).map(target => ({
          at: C + 240 + dt,
          stop: i === 0 ? 95 : 60,
          target,
          kind: 'hit',
          power: 0.045,
        })),
      );
    },
    end: () => 1680,
    ground(s) {
      const img = glyph('arrow-stuck', ['..5..', '..4..', '..4..', '.454.', '.444.'], SILVER);
      for (let i = 0; i < 56; i++) {
        const land = C + 240 + k.hash(i, s.event.seed, 7) * 700,
          e = s.c.t - land;
        if (e < 0) continue;
        const p = areaPoint(s, i);
        if (e < 600) centered(img, p, e > 390 ? 0.25 : 0.75);
      }
    },
    air(s) {
      const arrow = glyph(
        'volley-arrow',
        ['.4.4.4.', '..454..', '...5...', '...5...', '...5...', '.44544.', '..454..', '...5...'],
        SILVER,
      );
      for (let i = 0; i < 56; i++) {
        const land = C + 240 + k.hash(i, s.event.seed, 7) * 700,
          e = s.c.t - land;
        const p = areaPoint(s, i);
        if (e >= -240 && e < 0 && s.c.t >= C) {
          const q = -e / 240,
            at = { x: p.x - q * 15, y: p.y - q * 70 };
          if (i % 2 === 0) stroke([{ x: at.x - 3, y: at.y - 12 }, at], SILVER, 2, 3);
          centered(arrow, at);
        }
        // Anchor each distributed impact to a real-time beat, so debris moves through freezes.
        let hit = s.hits[0];
        for (const h of s.hits) if (h.at <= land && h.at >= hit.at) hit = h;
        const real = s.real(hit) - (land - hit.at);
        if (e >= 0 && real >= 0 && real < 300) {
          k.drawHit(k.hitStyle('53:volley', SILVER, { S: 16, spikes: 4, jag: 0.1 }), p, real);
          if (i % 4 === 0) k.shards(p, real, LEAF, (s.event.seed || 0) + i, 3, 12);
        }
      }
      impacts(s, SILVER, 'volley-target', 30);
    },
  });

  function sacredCircle(r) {
    return k.sprite(`53:sacred:${r}`, r * 2 + 12, r * 2 + 12, GOLD, set => {
      const c = r + 6;
      for (let y = -r - 2; y <= r + 2; y++)
        for (let x = -r - 2; x <= r + 2; x++) {
          const d = Math.hypot(x, y),
            a = Math.atan2(y, x);
          const sector = ((((a / k.tau) * 12) % 1) + 1) % 1;
          const border = Math.abs(d - r) < 1.4 || Math.abs(d - r * 0.82) < 1.2 || Math.abs(d - r * 0.32) < 1.5;
          const rune =
            d > r * 0.86 &&
            d < r * 0.95 &&
            (sector < 0.08 || Math.abs(sector - 0.33) < 0.07 || (d > r * 0.91 && sector < 0.35));
          const spoke = Math.abs(Math.sin(a * 6)) < 0.025 && d > r * 0.36 && d < r * 0.78;
          const sun = d < r * 0.12 || (d < r * 0.25 && Math.abs(Math.sin(a * 4)) < 0.17);
          if (border || rune || spoke || sun) set(x + c, y + c, border || sun ? 4 : 3);
        }
    });
  }
  function hallowZone(s, alpha) {
    const z = areaInfo(s, 60);
    if (!z || alpha <= 0) return;
    centered(sacredCircle(z.r), z.p, alpha);
    const img = pillar(GOLD, 6, 32);
    for (let j = 0; j < 10; j++) {
      const a = (j / 10) * k.tau;
      const x = z.p.x + Math.cos(a) * z.r * 0.94,
        y = z.p.y + Math.sin(a) * z.r * 0.94;
      k.blit(img, x - img.width / 2, y - 32, alpha * 0.5);
    }
    const pulse = (s.c.raw / 3000) % 1;
    ring(z.p.x, z.p.y, z.r * (0.34 + pulse * 0.43), z.r * (0.34 + pulse * 0.43), GOLD, alpha * 0.25);
  }

  // Hallow: a vast golden sacred seal inscribes its runes, guarded by a ring of holy light pillars.
  FX.register('hallow', {
    palette: GOLD,
    travel: 300,
    beats: beats(C + 300, 120),
    end: () => 1550,
    ground(s) {
      const e = s.c.t - C,
        z = areaInfo(s, 60);
      if (e < 0 || !z) return;
      if (e < 300) centered(sacredCircle(Math.max(10, Math.round(z.r * k.ease(e / 300)))), z.p);
      else if (!s.pose.linger) hallowZone(s, e > 950 ? 0.5 : 1);
    },
    air(s) {
      impacts(s, GOLD, 'hallow', 32);
    },
    linger(s) {
      hallowZone(s, s.linger);
    },
  });

  // Contagion: a luminous sick-green plague boils over the body, carrying pustules and a disease skull.
  FX.register('contagion', {
    palette: PLAGUE,
    travel: 160,
    beats: beats(C + 160, 115, 'hit', 0.055),
    end: () => 1400,
    ground(s) {
      const e = s.c.t - C;
      if (e < 0) return;
      people(s).forEach(t => {
        const p = k.P(t),
          f = feet(t),
          frame = Math.min(7, Math.floor(e / 100));
        const cloud = k.sprite(`53:plague:${frame}`, 65, 59, PLAGUE, set => {
          const q = Math.min(1, frame / 2);
          for (let y = 2; y < 57; y++)
            for (let x = 2; x < 63; x++) {
              let best = 0;
              for (let j = 0; j < 7; j++) {
                const a = (j / 7) * k.tau,
                  cx = 32 + Math.cos(a) * 17 * q,
                  cy = 30 + Math.sin(a) * 12 * q - frame;
                best = Math.max(best, 1 - Math.hypot(x - cx, y - cy) / (10 + q * 4));
              }
              if (best <= 0 || (frame > 5 && k.dith(x, y) < (frame - 5) / 3)) continue;
              set(x, y, best < 0.16 ? 2 : best < 0.4 ? 3 : 4);
            }
        });
        if (e < 830) k.blit(cloud, p.x - 32, p.y - 29, e > 640 ? 0.5 : 1);
        if (e > 500) ring(p.x, f.y, 15, 6, PLAGUE, 0.5, 3);
      });
    },
    air(s) {
      const e = s.c.t - C;
      if (e < 0) return;
      const skull = glyph(
        'disease-skull',
        [
          '...444444...',
          '..45555554..',
          '.4555555554.',
          '455555555554',
          '45..4554..54',
          '45..4554..54',
          '455554455554',
          '.4554..4554.',
          '..45555554..',
          '..4.4.4.44..',
          '..44444444..',
        ],
        PLAGUE,
        2,
      );
      people(s).forEach(t => {
        const p = k.P(t),
          hit = s.hits.find(h => h.id === t.id) || s.hits[0],
          real = hit ? s.real(hit) : -1;
        if (e > 120 && e < 760) centered(skull, { x: p.x, y: p.y - 7 }, e > 620 ? 0.5 : 1);
        if (e < 950)
          for (let j = 0; j < 7; j++) {
            const a = (j / 7) * k.tau + 0.2,
              q = (e / 650 + j / 7) % 1;
            const x = p.x + Math.cos(a) * 22,
              y = p.y + Math.sin(a) * 17 - q * 13;
            const r = 3 + Math.floor(q * 3);
            k.disc(x, y, r + 1, PLAGUE[0]);
            k.disc(x, y, r, PLAGUE[3]);
            k.dot(x - 1, y - 2, PLAGUE[5], 2);
          }
        if (hit) {
          k.drawHit(k.hitStyle('53:contagion', PLAGUE, { S: 36, spikes: 6 }), p, real);
          k.shards(p, real, PLAGUE, s.event.seed, 10, 27);
        }
      });
    },
  });

  function windCurl(frame, small = false) {
    const w = small ? 31 : 63,
      h = small ? 33 : 25;
    return k.sprite(`53:windcurl:${frame}:${small}`, w, h, WIND, set => {
      const put = (x, y, r, color) => {
        for (let v = -r; v <= r; v++) for (let u = -r; u <= r; u++) set(x + u, y + v, color);
      };
      if (small) {
        for (let j = 0; j < 4; j++) {
          const cy = h - 7 - j * 6,
            rx = 3 + j * 3;
          for (let i = 0; i < 30; i++) {
            const a = (i / 30) * k.tau + frame * 0.45;
            if (i > 23) continue;
            put(w / 2 + Math.cos(a) * rx, cy + Math.sin(a) * 3, 1, i < 15 ? 4 : 3);
          }
        }
      } else {
        for (let i = 0; i < 48; i++) {
          const q = i / 47,
            a = q * k.tau * 1.2 + 0.4;
          const x = q < 0.55 ? 3 + q * 67 : 43 + Math.cos(a) * (15 * (1 - q) + 3);
          const y = q < 0.55 ? 14 + Math.sin(q * 5 + frame * 0.3) * 3 : 11 + Math.sin(a) * 8;
          put(x, y, 1, q < 0.75 ? 4 : 3);
        }
      }
    });
  }
  function windZone(s, alpha, strong = false) {
    if (alpha <= 0 || !areaInfo(s, 100)) return;
    const corners = s.area ? k.outline(s.area, s.grid) : [];
    const a = corners.length >= 4 ? k.P({ x: corners[0][0], y: corners[0][1] }) : areaInfo(s).p;
    const b = corners.length >= 4 ? k.P({ x: corners[1][0], y: corners[1][1] }) : { x: a.x + 96, y: a.y };
    const d = corners.length >= 4 ? k.P({ x: corners[3][0], y: corners[3][1] }) : { x: a.x, y: a.y + 96 };
    const frame = Math.floor(s.c.raw / 190) % 4;
    for (let j = 0; j < 13; j++) {
      const q = (s.c.raw / (strong ? 950 : 2400) + k.hash(j, s.event.seed, 3)) % 1;
      const side = 0.08 + k.hash(j, s.event.seed, 4) * 0.84;
      const x = a.x + (b.x - a.x) * (0.08 + q * 0.84) + (d.x - a.x) * side;
      const y = a.y + (b.y - a.y) * (0.08 + q * 0.84) + (d.y - a.y) * side;
      centered(windCurl((frame + j) % 4), { x, y }, alpha * (strong ? 1 : 0.5));
    }
    for (let j = 0; j < 4; j++) {
      const p = areaPoint(s, 80 + j, 100);
      centered(windCurl((frame + j) % 4, true), { x: p.x, y: p.y - 10 }, alpha * 0.75);
    }
    const leaf = glyph('wind-leaf', ['..44.', '.4554', '4554.', '.44..'], LEAF);
    for (let j = 0; j < 14; j++) {
      const p = areaPoint(s, 100 + j, 100),
        q = (s.c.raw / 1600 + j / 14) % 1;
      k.blit(leaf, p.x - 12 + q * 24, p.y - Math.sin(q * Math.PI) * 12, alpha * 0.75);
    }
  }

  // Control Winds: broad cyan-white gust curls cross the cube amid swirling leaves and dust devils.
  FX.register('control-winds', {
    palette: WIND,
    travel: 180,
    beats: beats(C + 180, 100, 'soft'),
    end: () => 1510,
    ground(s) {
      const e = s.c.t - C;
      if (e < 0) return;
      if (e < 180 || !s.pose.linger) windZone(s, e > 920 ? 0.5 : 1, true);
      else if (e < 680) windZone(s, 0.5, true);
    },
    air(s) {
      impacts(s, WIND, 'wind', 32);
    },
    linger(s) {
      windZone(s, s.linger);
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
