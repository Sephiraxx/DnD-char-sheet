/* Pixel spells, batch 28 (see docs/pixel-spells/BRIEF.md). */
(function (root) {
  'use strict';
  const FX = root.BoardPixelFX;
  if (!FX) return;
  const k = FX.kit;
  const C = k.CAST;
  const GOLD = ['#291b0b', '#775121', '#bd8c32', '#f1c75f', '#fff2bf', '#ffffff'];
  const LEAF = ['#11251b', '#2c5332', '#538845', '#9dc85f', '#e0f4a2', '#fffce0'];
  const ILLUSION = ['#16102e', '#3e306b', '#7960b2', '#b5a2eb', '#e5ddff', '#ffffff'];
  const TIME = ['#102132', '#294864', '#4e8fa5', '#8fd6df', '#dbf7ef', '#ffffff'];
  const SILVER = ['#151d2c', '#3f536e', '#849eaf', '#c5dce4', '#f2f6e3', '#ffffff'];
  const MIND = ['#250d29', '#632957', '#b04792', '#ee7cce', '#ffdcf2', '#ffffff'];
  const NECRO = ['#0c0a17', '#221a30', '#493157', '#866397', '#c1afcf', '#f4e6ff'];
  const FIRE = ['#2a0d0c', '#6e1a12', '#b8321a', '#ec6a1c', '#ffb53a', '#fff1bc'];
  const SMOKE = ['#151319', '#29252e', '#47404b', '#73646b', '#a39190', '#d1c0b2'];
  const seed = s => s.event.seed || 0;
  const live = (s, end) => s.c.t >= C && s.c.t < end;
  const first = event => event.targets?.[0] ?? null;
  const ids = event => (event.targets?.length ? event.targets : [null]);
  const beat = (at, stop, target = null, kind = 'soft', power = 0.05) => ({ at, stop, target, kind, power });
  const target = (s, h = s.hits[0]) =>
    s.targets.find(t => t.id === h?.id) ||
    s.targets[0] ||
    s.pose.target ||
    s.pose.base ||
    s.pose.hand || { x: 0, y: 0 };
  const body = (s, h) => k.P(target(s, h));
  const feet = p => k.P({ x: p.baseX ?? p.x, y: p.baseY ?? p.y, span: p.span || 1 });
  const caster = s => feet(s.pose.base || s.pose.hand || target(s));
  const centre = s => k.P(s.area || s.pose.target || target(s));
  const radius = (s, ft) => ((s.area?.feet || ft) / (s.grid.feet || 5)) * 16;
  const at = (p, x, y) => ({ x: p.x + x, y: p.y + y });
  const lightFlash = (event, e) =>
    e < 32 ? { color: '#fff4dc', alpha: 0.19 } : e < 70 ? { color: '#1a1125', alpha: 0.12 } : null;

  function pixel(p, ramp, color = 3, size = 1) {
    k.dot(p.x, p.y, ramp[0], size + 2);
    k.dot(p.x, p.y, ramp[color], size);
  }
  function orb(p, r, ramp, color = 3) {
    k.disc(p.x, p.y, r + 1, ramp[0]);
    k.disc(p.x, p.y, r, ramp[color]);
    if (r > 2) k.disc(p.x - 1, p.y - 1, Math.max(1, r / 2), ramp[4]);
  }
  function stroke(a, b, ramp, color = 3, size = 1, cap = 42) {
    const n = Math.max(1, Math.min(cap, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y))));
    for (let pass = 0; pass < 2; pass++)
      for (let i = 0; i <= n; i++)
        k.dot(k.mix(a.x, b.x, i / n), k.mix(a.y, b.y, i / n), ramp[pass ? color : 0], size + (pass ? 0 : 2));
  }
  function stamp(img, p) {
    k.blit(img, p.x - img.width / 2, p.y - img.height / 2);
  }
  function icon(name, ramp, rows) {
    return k.sprite('b28:' + name, Math.max(...rows.map(r => r.length)) + 2, rows.length + 2, ramp, set => {
      rows.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) if (row[x] !== '.') set(x + 1, y + 1, Number(row[x]));
      });
    });
  }
  function ring(p, rx, ry, ramp, color = 3, gap = 0, phase = 0) {
    rx = Math.max(2, Math.round(rx));
    ry = Math.max(2, Math.round(ry));
    phase = Math.floor(phase) % 2;
    const img = k.sprite(
      `b28:ring:${ramp[2]}:${rx}:${ry}:${color}:${gap}:${phase}`,
      rx * 2 + 6,
      ry * 2 + 6,
      ramp,
      set => {
        const n = Math.ceil(k.tau * Math.max(rx, ry));
        for (let i = 0; i < n; i++) {
          if (gap && (Math.floor((i / n) * gap * 2) + phase) % 2) continue;
          const a = (i / n) * k.tau;
          set(rx + 3 + Math.cos(a) * rx, ry + 3 + Math.sin(a) * ry, color);
        }
      },
    );
    stamp(img, p);
  }
  function impact(s, h, p, ramp, name, size = 28, count = 6) {
    const e = s.real(h);
    k.drawHit(k.hitStyle('b28:' + name, ramp, { S: size, spikes: 6, minor: 2, jag: 0.3 }), p, e);
    k.shards(p, e, ramp, seed(s) + s.hits.indexOf(h) * 37, count, size * 0.7);
  }
  function pulse(s, p, ramp, r = 18) {
    const e = s.real(s.hits[0]);
    if (e < 0 || e > 390) return;
    const q = k.ease(e / 390);
    ring(p, r * (0.4 + q), r * (0.2 + q * 0.5), ramp, e < 60 ? 5 : 3, e > 180 ? 8 : 0);
  }
  function spark(p, ramp, r = 4) {
    stamp(
      icon(
        'spark:' + ramp[2] + ':' + r,
        ramp,
        Array.from({ length: r * 2 + 1 }, (_, y) =>
          Array.from({ length: r * 2 + 1 }, (_, x) =>
            Math.abs(x - r) + Math.abs(y - r) <= 1 || x === r || y === r ? (x === r && y === r ? '5' : '4') : '.',
          ).join(''),
        ),
      ),
      p,
    );
  }
  function ghost(p, ramp, frame = 0) {
    const img = k.sprite(`b28:ghost:${ramp[2]}:${frame}`, 19, 29, ramp, set => {
      for (let y = 2; y < 27; y++)
        for (let x = 2; x < 17; x++) {
          const head = (x - 9) ** 2 + (y - 6) ** 2 < 15;
          const robe = y >= 12 && y < 24 && Math.abs(x - 9) <= 3 + Math.floor((y - 12) / 5);
          const legs = y >= 24 && (x === 6 || x === 7 || x === 11 || x === 12);
          if ((head || robe || legs) && (frame === 0 || (x + y + frame) % 4 !== 0)) set(x, y, head ? 4 : x < 9 ? 3 : 2);
        }
    });
    k.blit(img, p.x - 9, p.y - 27);
  }
  function eye(p, ramp, name = 'eye') {
    stamp(
      icon(name + ramp[2], ramp, [
        '....33333....',
        '..334444433..',
        '.34445554443.',
        '3444511154443',
        '.34445154443.',
        '..334444433..',
        '....33333....',
      ]),
      p,
    );
  }
  function chain(a, b, ramp, q = 1) {
    const n = Math.max(1, Math.min(11, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 6)));
    for (let i = 0; i <= Math.floor(n * q); i++)
      ring({ x: k.mix(a.x, b.x, i / n), y: k.mix(a.y, b.y, i / n) }, i % 2 ? 2 : 3, i % 2 ? 3 : 2, ramp, 3);
  }
  function flame(p, age, name, w = 25, h = 37, ramp = FIRE) {
    const f = Math.floor(age / 65) % 4;
    const img = k.sprite(`b28:flame:${name}:${w}:${h}:${f}:${ramp[2]}`, w, h, ramp, set => {
      for (let y = 2; y < h - 2; y++)
        for (let x = 2; x < w - 2; x++) {
          const v = (h - 3 - y) / (h - 5),
            dx = (x - w / 2) / (w / 2 - 3);
          const tip = 0.6 + 0.25 * Math.cos(dx * 9 + f * 1.8) + 0.12 * Math.sin(dx * 18 - f);
          if (v < tip && Math.abs(dx) < 1 - v * 0.8) {
            const core = 1 - Math.abs(dx) - v * 0.6;
            set(x, y, core > 0.65 ? 5 : core > 0.4 ? 4 : core > 0.15 ? 3 : 2);
          }
        }
    });
    k.blit(img, p.x - w / 2, p.y - h + 4);
  }

  // Awaken: an amber agate sprouts green leaves; two golden eyes and a thinking spark open above the creature.
  FX.register('awaken', {
    palette: LEAF,
    travel: 330,
    beats: (event, kit, travel) => [beat(C + travel, 85, first(event))],
    end: () => C + 980,
    ground(s) {
      if (!live(s, C + 980)) return;
      const p = feet(target(s)),
        e = s.c.t - C;
      ring(p, 13 + Math.min(7, e / 40), 7, LEAF, 3, e > 780 ? 8 : 0);
      pulse(s, p, GOLD, 17);
    },
    air(s) {
      if (!live(s, C + 980)) return;
      const p = body(s),
        e = s.c.t - C;
      if (e < 330) {
        const h = k.P(s.pose.hand || target(s)),
          q = e / 330;
        const a = { x: k.mix(h.x, p.x, q), y: k.mix(h.y, p.y - 6, q) - Math.sin(q * Math.PI) * 9 };
        stamp(icon('agate', GOLD, ['..44..', '.4554.', '345543', '.3443.', '..33..']), a);
      } else {
        for (let i = 0; i < 4; i++) {
          const a = (i * k.tau) / 4 + 0.4,
            r = 9 + k.ease(k.clamp((e - 330) / 230)) * 6;
          stamp(
            icon('awaken-leaf', LEAF, ['...4', '..43', '.432', '332.']),
            at(p, Math.cos(a) * r, Math.sin(a) * 9 - 7),
          );
        }
        if (s.real(s.hits[0]) > 110) {
          eye(at(p, -7, -10), GOLD, 'awaken-eye');
          eye(at(p, 7, -10), GOLD, 'awaken-eye');
          spark(at(p, 0, -23), GOLD, 3);
        }
      }
      impact(s, s.hits[0], at(p, 0, -6), GOLD, 'awaken', 24, 6);
    },
  });

  // Mislead: a lilac double steps away as a broken outline and empty footprints mark the invisible caster.
  FX.register('mislead', {
    palette: ILLUSION,
    travel: 140,
    beats: () => [beat(C + 140, 65)],
    end: () => C + 1000,
    ground(s) {
      if (!live(s, C + 1000)) return;
      const p = caster(s),
        q = k.ease(k.clamp((s.c.t - C) / 450));
      ring(p, 12, 6, ILLUSION, 3, 8);
      ring(at(p, 18 * q, 2), 9, 4, ILLUSION, 4, 6);
      for (let i = 0; i < 3; i++) pixel(at(p, -5 - i * 5, 5 + (i % 2) * 3), ILLUSION, 2, 2);
    },
    air(s) {
      if (!live(s, C + 1000)) return;
      const p = caster(s),
        t = s.c.t - C,
        q = k.ease(k.clamp(t / 450));
      if (t < 230) ghost(p, ILLUSION, 1);
      if (t >= 140 && t < 880) {
        ghost(at(p, 18 * q, 2), ILLUSION, t > 730 ? 2 : 0);
        for (let i = 0; i < 3; i++) pixel(at(p, -9 + i * 9, -13 - ((Math.floor(t / 75) + i) % 4) * 3), ILLUSION, 3);
      }
      impact(s, s.hits[0], at(p, 0, -12), ILLUSION, 'mislead', 24, 7);
    },
  });

  // Temporal Shunt: a cyan clock fractures around the subject, swallowing its echo before returning it in reversed ticks.
  FX.register('temporal-shunt', {
    palette: TIME,
    travel: 110,
    beats: event => [beat(C + 110, 95, first(event)), beat(C + 610, 75, first(event))],
    end: () => C + 1060,
    air(s) {
      if (!live(s, C + 1060)) return;
      const p = body(s),
        t = s.c.t - C,
        e = s.real(s.hits[0]);
      const clock = at(p, 0, -4);
      if (t < 300 || (t >= 610 && t < 900)) {
        const returning = t >= 610;
        ring(clock, 17, 17, TIME, returning ? 4 : 3, t > 110 && !returning ? 12 : 0);
        for (let i = 0; i < 8; i++) {
          const a = (i * k.tau) / 8;
          pixel(at(clock, Math.cos(a) * 14, Math.sin(a) * 14), TIME, 4);
        }
        const a = ((returning ? -1 : 1) * t) / 90;
        stroke(clock, at(clock, Math.cos(a) * 10, Math.sin(a) * 10), TIME, 5, 1, 12);
        stroke(clock, at(clock, -5, -4), TIME, 4, 1, 6);
      }
      if (t >= 110 && t < 610) {
        for (let i = 0; i < 6; i++) {
          const q = k.clamp(e / 530),
            a = (i * k.tau) / 6 - q * 2;
          const r = 19 - q * 14;
          pixel(at(clock, Math.cos(a) * r, Math.sin(a) * r), TIME, i % 2 ? 3 : 4, 2);
        }
        if (e < 180) ghost(at(feet(target(s)), 9 * k.ease(e / 180), -3), TIME, 2);
        stamp(
          icon('hourglass', TIME, ['4444444', '.32223.', '..353..', '...5...', '..353..', '.34443.', '4444444']),
          clock,
        );
      }
      for (const h of s.hits) impact(s, h, clock, TIME, 'temporal-shunt', 30, 7);
    },
  });

  // Dispel Evil and Good: silver-white ward ribs and a gold halo sweep hostile planar sigils outward into fragments.
  FX.register('dispel-evil-and-good', {
    palette: SILVER,
    travel: 200,
    beats: () => [beat(C + 200, 85)],
    end: () => C + 1060,
    ground(s) {
      if (!live(s, C + 1060)) return;
      const p = caster(s);
      ring(p, 19, 10, SILVER, 4);
      ring(p, 23, 12, GOLD, 3, 8);
      pulse(s, p, SILVER, 24);
    },
    air(s) {
      if (!live(s, C + 1060)) return;
      const p = at(caster(s), 0, -13),
        t = s.c.t - C;
      ring(p, 17, 23, SILVER, t < 200 ? 3 : 4, t > 850 ? 10 : 0);
      ring(at(p, 0, -19), 12, 4, GOLD, 4);
      if (t < 790)
        for (let i = 0; i < 4; i++) {
          const a = (i * k.tau) / 4 + 0.3,
            q = k.ease(k.clamp((t - 200) / 450));
          const pt = at(p, Math.cos(a) * (18 + q * 9), Math.sin(a) * 16);
          if (t < 410) stamp(icon('planar-bane', NECRO, ['3.3', '.4.', '3.3', '.2.']), pt);
          else pixel(pt, SILVER, 4, t < 590 ? 2 : 1);
        }
      impact(s, s.hits[0], p, SILVER, 'dispel-evil-and-good', 27, 7);
    },
  });

  // Dominate Person: a magenta puppet crown clamps over the mind, with taut strings leading back to the caster's hand.
  FX.register('dominate-person', {
    palette: MIND,
    travel: 260,
    beats: (event, kit, travel) => [beat(C + travel, 115, first(event))],
    end: () => C + 1030,
    ground(s) {
      if (live(s, C + 1030)) pulse(s, feet(target(s)), MIND, 18);
    },
    air(s) {
      if (!live(s, C + 1030)) return;
      const p = at(body(s), 0, -14),
        t = s.c.t - C,
        h = k.P(s.pose.hand || target(s));
      const q = k.clamp(t / 260);
      if (t < 780) {
        for (let i = -1; i <= 1; i++) {
          const end = { x: k.mix(h.x, p.x + i * 6, q), y: k.mix(h.y, p.y, q) - (1 - q) * 5 };
          stroke(h, end, MIND, i ? 2 : 4, 1, 36);
        }
      }
      if (t >= 260) {
        stamp(
          icon('puppet-crown', MIND, ['4...4...4', '43.343.34', '433343334', '.3333333.', '.2444442.', '..22222..']),
          p,
        );
        eye(at(p, 0, 8), MIND, 'dominate-eye');
      }
      impact(s, s.hits[0], p, MIND, 'dominate-person', 30, 6);
    },
  });

  // Enervation: a black-violet tendril snaps into the body, then pulls pale life motes upstream into the caster.
  FX.register('enervation', {
    palette: NECRO,
    travel: 90,
    beats: (event, kit, travel) => [beat(C + travel, 105, first(event), 'beam', 0.07), beat(C + 540, 65)],
    end: () => C + 1050,
    flash: (event, e) => (e < 35 ? { color: NECRO[0], alpha: 0.17 } : null),
    air(s) {
      if (!live(s, C + 1050)) return;
      const h = k.P(s.pose.hand || target(s)),
        p = k.P(k.contact(target(s), s.pose.hand || target(s))),
        t = s.c.t - C;
      const dx = p.x - h.x,
        dy = p.y - h.y,
        len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len,
        ny = dx / len,
        q = Math.min(1, t / 90);
      const curve = u => {
        const wave = Math.sin(u * Math.PI) * Math.sin(u * 10 - t / 75) * 4;
        return { x: k.mix(h.x, p.x, u) + nx * wave, y: k.mix(h.y, p.y, u) + ny * wave };
      };
      if (t < 760) {
        for (let pass = 0; pass < 3; pass++)
          for (let i = 0; i <= 64; i++) {
            const u = (i / 64) * q,
              pt = curve(u);
            k.dot(pt.x, pt.y, NECRO[pass === 0 ? 0 : pass === 1 ? 2 : 1], pass === 0 ? 7 : pass === 1 ? 5 : 3);
          }
        if (t >= 90)
          for (let i = 0; i < 7; i++) {
            const u = 1 - (((t - 90) / 420 + i / 7) % 1);
            const pt = curve(u);
            orb(pt, i % 2 ? 1 : 2, NECRO, 4);
          }
      }
      if (t >= 90 && t < 700) ring(p, 9, 12, NECRO, 2, 6, t / 90);
      impact(s, s.hits[0], p, NECRO, 'enervation-bite', 34, 8);
      impact(s, s.hits[1], h, NECRO, 'enervation-drain', 22, 5);
    },
  });

  // Scrying: silver water opens into an upright mirror, showing a distant silhouette beneath a watchful magical eye.
  FX.register('scrying', {
    palette: SILVER,
    travel: 370,
    beats: () => [beat(C + 370, 70)],
    end: () => C + 1140,
    ground(s) {
      if (!live(s, C + 1140)) return;
      const p = caster(s);
      ring(at(p, 0, 5), 17, 8, SILVER, 3);
      ring(at(p, 0, 5), 11 + (Math.floor(s.c.t / 90) % 4), 5, TIME, 3, 6);
    },
    air(s) {
      if (!live(s, C + 1140)) return;
      const p = at(caster(s), 0, -12),
        t = s.c.t - C;
      ring(p, 15, 21, SILVER, 4, t > 980 ? 8 : 0);
      ring(p, 12, 18, TIME, 2);
      if (t < 370) {
        for (let i = 0; i < 4; i++) pixel(at(p, (i - 1.5) * 6, 10 - ((t / 14 + i * 6) % 25)), SILVER, 4);
      } else {
        ghost(at(p, 0, 12), TIME, 2);
        eye(at(p, 0, -15), SILVER, 'scry-eye');
        if (t < 850) spark(at(p, 12, 4), SILVER, 3);
      }
      impact(s, s.hits[0], at(p, 0, -12), SILVER, 'scrying', 24, 6);
    },
  });

  // Synaptic Static: a pink psychic sphere bursts into branching brain folds and jagged, lingering synapse sparks.
  FX.register('synaptic-static', {
    palette: MIND,
    travel: 310,
    beats: (event, kit, travel) => ids(event).map(id => beat(C + travel, 155, id, 'blast', 0.085)),
    end: () => C + 1230,
    flash: (event, e) => (e < 35 ? { color: MIND[4], alpha: 0.25 } : e < 80 ? { color: MIND[0], alpha: 0.19 } : null),
    reach: (event, grid) => ({ r: ((event.area?.feet || 20) / (grid.feet || 5)) * 1.15 + 1, up: 1.3 }),
    ground(s) {
      if (!live(s, C + 1230)) return;
      const p = centre(s),
        r = Math.round(radius(s, 20)),
        e = s.real(s.hits[0]);
      if (e < 0) {
        ring(p, r, r, MIND, 2, 12);
        return;
      }
      const f = Math.min(11, Math.floor(e / 70)),
        size = r * 2 + 8;
      const img = k.sprite(`b28:static:${r}:${f}:${seed(s) % 4}`, size, size, MIND, set => {
        const grow = f < 2 ? 0.35 + f * 0.5 : 1;
        for (let y = 2; y < size - 2; y++)
          for (let x = 2; x < size - 2; x++) {
            const dx = x - size / 2,
              dy = y - size / 2,
              d = Math.hypot(dx, dy) / r;
            if (d > grow || (d < 0.06 && f > 3)) continue;
            if (f < 2) {
              set(x, y, f === 0 ? 5 : d < 0.3 ? 1 : 4);
              continue;
            }
            const fold = Math.sin(dx / 6 + Math.sin(dy / 8) * 2) + Math.cos(dy / 5 - dx / 14);
            const boundary = Math.abs(d - (0.87 + Math.sin(Math.atan2(dy, dx) * 10) * 0.05));
            if (f < 6 && d < 0.88) set(x, y, fold > 1.25 ? 4 : fold > 0.55 ? 3 : fold > -0.2 ? 2 : 1);
            else if (boundary < 0.025 && (f < 8 || (x + y) % 6 < 3)) set(x, y, f < 8 ? 3 : 2);
            else if (f < 10 && Math.abs(fold - 1.4) < 0.09 && d < 0.83 && Math.floor((dx + dy) / 7 + f) % 3 === 0)
              set(x, y, 3);
          }
      });
      if (e < 840) stamp(img, p);
    },
    air(s) {
      if (!live(s, C + 1230)) return;
      const p = centre(s),
        t = s.c.t - C,
        r = radius(s, 20);
      if (t < 310) {
        const h = k.P(s.pose.hand || s.area || target(s)),
          q = t / 310;
        const pt = { x: k.mix(h.x, p.x, q), y: k.mix(h.y, p.y, q) - Math.sin(q * Math.PI) * 9 };
        orb(pt, 4, MIND, 3);
        spark(pt, MIND, 4);
      }
      const e = s.real(s.hits[0]);
      if (e >= 0 && e < 650)
        for (let i = 0; i < 8; i++) {
          const a = k.hash(i, seed(s)) * k.tau,
            d = r * (0.35 + k.hash(i, seed(s), 1) * 0.5);
          const pt = at(p, Math.cos(a) * d, Math.sin(a) * d);
          if ((Math.floor(e / 70) + i) % 3 !== 0) spark(pt, MIND, i % 2 ? 3 : 4);
        }
      for (const h of s.hits) {
        const pt = body(s, h);
        impact(s, h, pt, MIND, 'synaptic-static', 35, 6);
        const e = s.real(h);
        if (e > 220 && e < 760)
          stamp(
            icon('brain-static', MIND, [
              '..33.33..',
              '.3432343.',
              '343323343',
              '343232343',
              '.3432343.',
              '..33233..',
              '....3....',
            ]),
            at(pt, 0, -17),
          );
      }
    },
  });

  // Geas: a golden written command closes into a wax-red oath seal, fastening a short chain around the subject's brow.
  FX.register('geas', {
    palette: GOLD,
    travel: 370,
    beats: (event, kit, travel) => [beat(C + travel, 100, first(event))],
    end: () => C + 1090,
    ground(s) {
      if (live(s, C + 1090)) pulse(s, feet(target(s)), GOLD, 18);
    },
    air(s) {
      if (!live(s, C + 1090)) return;
      const p = at(body(s), 0, -11),
        t = s.c.t - C;
      const h = k.P(s.pose.hand || target(s)),
        q = k.clamp(t / 370);
      if (t < 370) {
        const pt = { x: k.mix(h.x, p.x, q), y: k.mix(h.y, p.y, q) - Math.sin(q * Math.PI) * 7 };
        stamp(
          icon('oath-scroll', GOLD, [
            '33333333333',
            '34544444443',
            '34422224443',
            '34444444443',
            '34422222443',
            '34444444443',
            '34422244443',
            '33333333333',
          ]),
          pt,
        );
      } else {
        ring(p, 12, 5, GOLD, 3);
        chain(at(p, -11, 0), at(p, -4, 5), GOLD);
        chain(at(p, 11, 0), at(p, 4, 5), GOLD);
        stamp(
          icon(
            'geas-seal',
            ['#291218', '#6e2533', '#a54349', '#d66e58', '#f8cb86', '#fff1c6'],
            ['..333..', '.34443.', '3454543', '3445443', '3454543', '.34443.', '..333..', '..2.2..'],
          ),
          at(p, 0, 4),
        );
        if (t < 870) spark(at(p, 0, -13), GOLD, 3);
      }
      impact(s, s.hits[0], p, GOLD, 'geas', 27, 6);
    },
  });

  // Steel Wind Strike: the caster's silver echo blinks between five victims, each cut a crisp force-edged sword crescent.
  FX.register('steel-wind-strike', {
    palette: SILVER,
    travel: 140,
    beats: event =>
      ids(event)
        .slice(0, 5)
        .map((id, i) => beat(C + 140 + i * 150, 70, id, 'hit', 0.075)),
    end: event => C + 140 + (Math.min(5, ids(event).length) - 1) * 150 + 490,
    ground(s) {
      const end = C + 140 + (Math.min(5, ids(s.event).length) - 1) * 150 + 490;
      if (!live(s, end)) return;
      for (const h of s.hits) {
        const e = s.real(h);
        if (e >= 0 && e < 300) ring(feet(target(s, h)), 13 + Math.floor(e / 65), 6, TIME, 3, 8);
      }
      const last = s.hits[s.hits.length - 1],
        e = s.c.t - last.at;
      if (e >= 180 && e < 400) ring(feet(s.event.teleport?.to || target(s, last)), 14, 7, SILVER, 4, 6);
    },
    air(s) {
      const last = s.hits[s.hits.length - 1];
      if (!live(s, last.at + 490)) return;
      if (s.c.t < s.hits[0].at) {
        const p = caster(s);
        ghost(at(p, 8, 0), TIME, 2);
        spark(at(p, 0, -12), SILVER, 5);
      }
      s.hits.forEach((h, i) => {
        const e = s.real(h),
          p = body(s, h);
        if (e >= 0 && e < 290) {
          const f = Math.floor(e / 45),
            side = i % 2 ? -1 : 1;
          if (e < 150) {
            const b = feet(target(s, h));
            ghost(at(b, -side * 15, 0), TIME, 2);
            stamp(
              icon('steel-sword', SILVER, ['....5', '...54', '..543', '.543.', '343..', '.3...', '2....']),
              at(p, -side * 7, -7),
            );
          }
          const img = k.sprite(`b28:steel-cut:${f}:${side}`, 53, 43, SILVER, set => {
            for (let y = 2; y < 41; y++)
              for (let x = 2; x < 51; x++) {
                const dx = (x - 26) / 23,
                  dy = (y - 21) / 17,
                  d = Math.hypot(dx, dy);
                const a = Math.atan2(dy, dx * side);
                if (Math.abs(a + 0.6 - f * 0.16) < 1.25 && d < 1 && d > 0.71 + f * 0.035)
                  set(x, y, d > 0.94 ? 5 : d > 0.85 ? 4 : 2);
              }
          });
          stamp(img, p);
        }
        impact(s, h, p, SILVER, 'steel-wind-strike', 34, 7);
      });
      const e = s.c.t - last.at;
      if (e >= 180 && e < 370) ghost(feet(s.event.teleport?.to || target(s, last)), SILVER, e < 270 ? 2 : 0);
    },
  });

  // Flame Strike: a vertical orange fire pillar crashes from above around a white-gold radiant core, leaving black cinders.
  FX.register('flame-strike', {
    palette: FIRE,
    travel: 280,
    beats: (event, kit, travel) => ids(event).map(id => beat(C + travel, 170, id, 'blast', 0.09)),
    end: () => C + 1280,
    flash: lightFlash,
    reach: (event, grid) => ({ r: (event.area?.feet || 10) / (grid.feet || 5) + 1.5, up: 5.5 }),
    ground(s) {
      if (!live(s, C + 1280)) return;
      const p = centre(s),
        r = Math.round(radius(s, 10)),
        t = s.c.t - C,
        e = s.real(s.hits[0]);
      if (t < 280) {
        ring(p, r, r * 0.5, GOLD, 4, 8);
        return;
      }
      if (e < 670) {
        const f = Math.min(9, Math.floor(e / 65)),
          w = r * 2 + 8,
          h = 98;
        const img = k.sprite(`b28:pillar:${r}:${f}`, w, h, FIRE, set => {
          const top = f < 2 ? Math.max(2, 70 - f * 45) : 2 + Math.max(0, f - 5) * 18;
          for (let y = top; y < h - 3; y++)
            for (let x = 2; x < w - 2; x++) {
              const dx = Math.abs(x - w / 2),
                edge = r * (0.82 + 0.1 * Math.sin(y / 8 + f));
              if (dx < edge) set(x, y, dx < r * 0.23 ? 5 : dx < r * 0.46 ? 4 : dx < r * 0.69 ? 3 : 2);
            }
        });
        k.blit(img, p.x - w / 2, p.y - h + r * 0.3);
        ring(p, r + Math.min(9, e / 30), r * 0.55, GOLD, e < 100 ? 5 : 3, e > 350 ? 12 : 0);
      } else {
        const img = k.sprite(`b28:flame-scorch:${r}`, r * 2 + 8, r + 8, SMOKE, set => {
          for (let y = 2; y < r + 6; y++)
            for (let x = 2; x < r * 2 + 6; x++) {
              const d = Math.hypot((x - r - 4) / r, (y - r / 2 - 4) / (r / 2));
              if (d < 0.9 && (d < 0.65 || (x + y) % 4 < 2)) set(x, y, d < 0.5 ? 1 : 2);
            }
        });
        stamp(img, p);
      }
    },
    air(s) {
      if (!live(s, C + 1280)) return;
      const p = centre(s),
        r = radius(s, 10),
        t = s.c.t - C,
        e = s.real(s.hits[0]);
      if (t < 280) {
        const top = at(p, 0, -73);
        ring(top, r * 0.65, 5, GOLD, 4);
        for (let i = -1; i <= 1; i++) pixel(at(top, i * 9, t / 9), GOLD, 4, 2);
      }
      if (e >= 0 && e < 500) {
        stroke(at(p, 0, -70 + Math.min(40, e / 8)), at(p, 0, -33), GOLD, 5, 3, 30);
        for (let i = 0; i < 7; i++) {
          const a = k.hash(i, seed(s)) * k.tau,
            q = e / 500;
          pixel(
            at(p, Math.cos(a) * r * (0.5 + q * 0.5), -8 - q * (18 + k.hash(i, seed(s), 2) * 30)),
            FIRE,
            i % 2 ? 3 : 4,
            2,
          );
        }
      }
      if (e >= 500 && e < 1020)
        for (let i = 0; i < 5; i++) {
          const q = (e - 500) / 520;
          const pt = at(p, (i - 2) * r * 0.3 + Math.sin(i + q * 3) * 3, -10 - q * 23);
          if (q < 0.7) orb(pt, 4 + Math.floor(q * 3), SMOKE, 2);
          else pixel(pt, FIRE, 2, 1);
        }
      for (const h of s.hits) impact(s, h, body(s, h), FIRE, 'flame-strike', 38, 7);
    },
  });

  // Immolation: a single victim ignites in tall clinging orange tongues; a second flare spits embers, then charcoal smoke.
  FX.register('immolation', {
    palette: FIRE,
    travel: 180,
    beats: event => [beat(C + 180, 115, first(event), 'hit', 0.07), beat(C + 600, 65, first(event), 'hit', 0.045)],
    end: () => C + 1230,
    flash: lightFlash,
    ground(s) {
      if (!live(s, C + 1230)) return;
      const p = feet(target(s)),
        t = s.c.t - C;
      if (t >= 180) ring(p, 12, 6, t < 850 ? FIRE : SMOKE, t < 850 ? 2 : 1, 6);
    },
    air(s) {
      if (!live(s, C + 1230)) return;
      const p = body(s),
        b = feet(target(s)),
        t = s.c.t - C;
      if (t < 180) {
        for (let i = 0; i < 4; i++) {
          const a = (i * k.tau) / 4 + t / 130,
            r = 16 * (1 - t / 200);
          pixel(at(p, Math.cos(a) * r, Math.sin(a) * r), FIRE, 4, 2);
        }
      } else if (t < 870) {
        // Side tongues keep the face readable; central fire hugs the feet.
        flame(at(b, -9, -1), s.c.raw, 'immolation-left', 13, 35);
        flame(at(b, 9, -1), s.c.raw + 130, 'immolation-right', 13, 39);
        flame(at(b, 0, 3), s.c.raw + 65, 'immolation-foot', 19, 19);
      }
      const e = s.real(s.hits[0]);
      if (e >= 0 && e < 1020)
        for (let i = 0; i < 7; i++) {
          const q = (e / 520 + i / 7) % 1;
          const pt = at(p, (k.hash(i, seed(s)) - 0.5) * 24 + Math.sin(q * 5 + i) * 3, 8 - q * 34);
          if (t < 900) pixel(pt, FIRE, i % 2 ? 3 : 4, q > 0.7 ? 1 : 2);
          else if (i < 4) orb(pt, 3, SMOKE, 2);
        }
      s.hits.forEach(h => impact(s, h, p, FIRE, 'immolation', h === s.hits[0] ? 34 : 26, 7));
    },
  });

  // Hold Monster: violet runic shackles snap shut around any-sized body; crossed chains lock under a heavy arcane padlock.
  FX.register('hold-monster', {
    palette: ILLUSION,
    travel: 230,
    beats: (event, kit, travel) => ids(event).map(id => beat(C + travel, 110, id)),
    end: () => C + 1050,
    ground(s) {
      if (!live(s, C + 1050)) return;
      for (const h of s.hits) {
        const p = feet(target(s, h)),
          r = Math.min(25, 13 * (target(s, h).span || 1));
        ring(p, r, r * 0.5, ILLUSION, 3);
        for (let i = 0; i < 4; i++) {
          const a = Math.PI / 4 + (i * k.tau) / 4;
          stamp(
            icon('hold-rune', ILLUSION, ['.4.', '343', '.3.', '343', '.4.']),
            at(p, Math.cos(a) * r, Math.sin(a) * r * 0.5),
          );
        }
      }
    },
    air(s) {
      if (!live(s, C + 1050)) return;
      for (const h of s.hits) {
        const p = body(s, h),
          t = s.c.t - C,
          r = Math.min(23, 11 * (target(s, h).span || 1));
        const q = k.ease(k.clamp(t / 230)),
          spread = r + (1 - q) * 9;
        for (const side of [-1, 1]) {
          stroke(at(p, side * spread, -16), at(p, side * spread, 10), ILLUSION, 2, 1, 18);
          stamp(icon('hold-clasp', ILLUSION, ['44444', '32.23', '32.23', '44444']), at(p, side * spread, 3));
        }
        if (t >= 230) {
          chain(at(p, -r, -12), at(p, r, 7), ILLUSION);
          chain(at(p, r, -12), at(p, -r, 7), ILLUSION);
          stamp(
            icon('hold-lock', ILLUSION, [
              '..444..',
              '.42.24.',
              '.4...4.',
              '3444443',
              '3455543',
              '3451543',
              '3451543',
              '.33333.',
            ]),
            at(p, 0, -2),
          );
        }
        impact(s, h, p, ILLUSION, 'hold-monster', 28, 6);
      }
    },
  });

  // Summon Celestial: a gold summoning seal raises a winged, haloed angel with a radiant spear and feather motes.
  FX.register('summon-celestial', {
    palette: GOLD,
    travel: 410,
    beats: (event, kit, travel) => [beat(C + travel, 110)],
    end: () => C + 1260,
    ground(s) {
      if (!live(s, C + 1260)) return;
      const p = centre(s),
        t = s.c.t - C;
      ring(p, 23, 12, GOLD, 3, t > 1050 ? 8 : 0);
      ring(p, 16, 8, GOLD, 4, 6, t / 120);
      for (let i = 0; i < 6; i++) {
        const a = (i * k.tau) / 6;
        pixel(at(p, Math.cos(a) * 22, Math.sin(a) * 11), GOLD, 4, 2);
      }
      pulse(s, p, GOLD, 25);
    },
    air(s) {
      if (!live(s, C + 1260)) return;
      const p = centre(s),
        t = s.c.t - C;
      // A small sideways offset lets the summoned silhouette read beside an existing target figure.
      const b = at(p, 12, -1);
      if (t < 410) {
        for (let i = 0; i < 6; i++) {
          const a = (i * k.tau) / 6 + t / 180,
            r = 17 * (1 - t / 520);
          pixel(at(b, Math.cos(a) * r, -12 + Math.sin(a) * r), GOLD, 4, 2);
        }
      } else if (t < 1140) {
        const img = k.sprite('b28:celestial', 55, 50, GOLD, set => {
          for (let y = 2; y < 47; y++)
            for (let x = 2; x < 53; x++) {
              const dx = x - 27;
              if (y >= 14 && y <= 34 && Math.abs(dx) > 5) {
                const wing = 23 - (y - 14) * 0.6;
                if (Math.abs(dx) < wing && y > 9 + Math.abs(dx) * 0.22 && (y + Math.floor(Math.abs(dx) / 3)) % 6 < 4)
                  set(x, y, y < 21 ? 5 : Math.abs(dx) > wing - 4 ? 3 : 4);
              }
              if (dx * dx + (y - 12) ** 2 < 16) set(x, y, dx < 0 ? 5 : 4);
              if (y >= 18 && y < 40 && Math.abs(dx) < 4 + (y - 18) / 8)
                set(x, y, Math.abs(dx) < 2 ? 5 : dx < 0 ? 4 : 2);
              if (y >= 40 && y < 46 && (dx === -3 || dx === 3)) set(x, y, 3);
              if (y >= 13 && y < 44 && x === 44) set(x, y, 3);
              if (y >= 7 && y < 16 && Math.abs(x - 44) < (y < 12 ? (y - 6) / 2 : (16 - y) / 2)) set(x, y, 5);
            }
        });
        k.blit(img, b.x - 27, b.y - 45);
        ring(at(b, 0, -41), 8, 3, GOLD, 5);
        if (t < 920) spark(at(b, 17, -34), GOLD, 4);
      }
      const e = s.real(s.hits[0]);
      if (e >= 0 && e < 790)
        for (let i = 0; i < 7; i++) {
          const q = e / 790,
            a = k.hash(i, seed(s)) * k.tau;
          const pt = at(b, Math.cos(a) * (12 + q * 12), -20 + Math.sin(a) * 10 + q * q * 17);
          stamp(icon('celestial-feather', GOLD, ['..4', '.45', '343', '33.']), pt);
        }
      impact(s, s.hits[0], at(b, 0, -15), GOLD, 'summon-celestial', 38, 9);
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
