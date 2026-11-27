/* Pixel spells, batch 05: cantrips (see docs/pixel-spells/BRIEF.md). */
(function (root) {
  'use strict';
  const FX = root.BoardPixelFX;
  if (!FX) return;
  const k = FX.kit;
  const ICE = k.palettes.frost;
  const GOLD = k.palettes.radiante;
  const MAGIC = k.palettes.magic;
  const DEATH = k.palettes['necrótico'];
  const ACID = k.palettes['ácido'];
  const POISON = k.palettes.veneno;
  const WIND = k.palettes.trueno;
  const FIRE = ['#2a0d0c', '#6e1a12', '#b8321a', '#ec6a1c', '#ffb53a', '#ffffff'];
  const STONE = ['#171a27', '#41455e', '#747a96', '#adaec7', '#d9d6f6', '#ffffff'];
  const add = (p, x, y) => ({ x: p.x + x, y: p.y + y });
  const seed = s => s.event.seed || 0;
  const finish = tail => (event, travel) => k.CAST + travel + tail;
  const single =
    (stop = 75, kind = 'hit', power = 0.05) =>
    (event, kit, travel) => [{ at: kit.CAST + travel, stop, target: event.targets?.[0] ?? null, kind, power }];
  const soft = single(50, 'soft', 0);
  function aim(s, i = 0) {
    const id = s.hits[i]?.id;
    return (
      s.targets.find(t => id != null && t.id === id) || s.targets[i] || s.pose.target || s.pose.hand || s.pose.base
    );
  }
  function point(s, i = 0) {
    const t = aim(s, i);
    return k.P(s.pose.hand ? k.contact(t, s.pose.hand) : t);
  }
  function foot(s, i = 0) {
    const t = !s.targets.length && !s.pose.target ? s.pose.base || aim(s, i) : aim(s, i);
    return k.P({ x: t.baseX ?? t.x, y: t.baseY ?? t.y });
  }
  function pixel(p, ramp, color = 3, size = 1) {
    k.dot(p.x, p.y, ramp[0], size + 2);
    k.dot(p.x, p.y, ramp[color], size);
  }
  function ball(p, r, ramp, color = 3) {
    k.disc(p.x, p.y, r + 1, ramp[0]);
    k.disc(p.x, p.y, r, ramp[color]);
  }
  function stroke(points, ramp, color = 3, width = 1) {
    const lengths = points.slice(1).map((p, i) => Math.hypot(p.x - points[i].x, p.y - points[i].y));
    const step = Math.max(1, lengths.reduce((a, b) => a + b, 0) / 48);
    for (const [ink, size] of [
      [ramp[0], width + 2],
      [ramp[color], width],
    ]) {
      for (let i = 0; i < lengths.length; i++) {
        const n = Math.max(1, Math.ceil(lengths[i] / step));
        for (let j = 0; j <= n; j++) {
          const q = j / n;
          k.dot(k.mix(points[i].x, points[i + 1].x, q), k.mix(points[i].y, points[i + 1].y, q), ink, size);
        }
      }
    }
  }
  function ring(p, rx, ry, ramp, color = 3, broken = false) {
    rx = Math.max(2, Math.round(rx));
    ry = Math.max(2, Math.round(ry));
    const img = k.sprite(`05:ring:${ramp[2]}:${rx}:${ry}:${color}:${broken}`, rx * 2 + 7, ry * 2 + 7, ramp, set => {
      for (let y = 2; y < ry * 2 + 5; y++)
        for (let x = 2; x < rx * 2 + 5; x++) {
          const dx = x - rx - 3,
            dy = y - ry - 3;
          if (Math.abs(Math.hypot(dx / rx, dy / ry) - 1) * Math.min(rx, ry) > 0.65) continue;
          if (broken && Math.floor((Math.atan2(dy, dx) + k.tau) * 6) % 3 === 0) continue;
          set(x, y, color);
        }
    });
    k.blit(img, p.x - rx - 3, p.y - ry - 3);
  }
  function spark(p, ramp, r = 3) {
    // One cached, outlined four-point glint; no soft light around it.
    const img = k.sprite(`05:spark:${ramp[2]}:${r}`, r * 2 + 5, r * 2 + 5, ramp, set => {
      const c = r + 2;
      for (let d = -r; d <= r; d++) {
        set(c + d, c, Math.abs(d) < 2 ? 5 : 3);
        set(c, c + d, Math.abs(d) < 2 ? 5 : 4);
      }
    });
    k.blit(img, p.x - r - 2, p.y - r - 2);
  }
  function impact(s, i, ramp, name, size = 30, spikes = 6) {
    const h = s.hits[i];
    if (!h) return;
    const T = point(s, i),
      e = s.real(h);
    k.drawHit(k.hitStyle(`05:${name}`, ramp, { S: size, spikes, jag: 0.3 }), T, e);
    k.shards(T, e, ramp, seed(s) + i * 41, 7, 18);
  }
  function flight(s, arc = 0) {
    if (!s.pose.hand || !s.hits[0]) return null;
    const H = k.P(s.pose.hand),
      T = point(s);
    const q = (s.c.t - k.CAST) / (s.hits[0].at - k.CAST);
    const at = u => ({ x: k.mix(H.x, T.x, u), y: k.mix(H.y, T.y, u) - Math.sin(u * Math.PI) * arc });
    return { H, T, q, at };
  }
  function trail(f, ramp, n = 7) {
    for (let i = n; i >= 1; i--) {
      const u = f.q - i * 0.04;
      if (u >= 0) pixel(f.at(u), ramp, i < 3 ? 4 : 2, i < 3 ? 2 : 1);
    }
  }
  function crystal(p, angle, length = 10) {
    const img = k.sprite(`05:ice:${length}`, length + 5, 11, ICE, set => {
      for (let x = 2; x <= length + 1; x++) {
        const w = Math.max(0, Math.floor((1 - (x - 2) / length) * 3));
        for (let y = 5 - w; y <= 5 + w; y++) set(x, y, y < 5 ? 4 : y === 5 ? 5 : 2);
      }
    });
    k.blitRotated(img, p.x, p.y, angle, 0.15);
  }
  function flame(frame) {
    return k.sprite(`05:flame:${frame}`, 17, 23, FIRE, set => {
      for (let y = 2; y <= 20; y++)
        for (let x = 2; x <= 14; x++) {
          const h = (20 - y) / 18;
          const dx = x - 8 - Math.sin(h * 8 + frame * 1.4) * h * 2;
          const w = Math.sin((1 - h) * Math.PI * 0.85) * 6;
          if (Math.abs(dx) <= w) set(x, y, h > 0.72 ? 2 : Math.abs(dx) < w * 0.38 ? 5 : dx < 0 ? 4 : 3);
        }
    });
  }
  function puddle(s, ramp, i = 0) {
    const e = s.real(s.hits[i]);
    if (e < 0 || e >= 490) return;
    const C = foot(s, i),
      f = Math.floor(e / 70);
    const img = k.sprite(`05:puddle:${ramp[2]}:${f}`, 31, 15, ramp, set => {
      for (let y = 2; y <= 12; y++)
        for (let x = 2; x <= 28; x++) {
          const d = Math.hypot((x - 15) / 12, (y - 7) / 4);
          const edge = 1 + Math.sin(x * 0.9 + y) * 0.12;
          if (d > edge || (f > 4 && (x < 12 || x > 18 || y % 3 === 0))) continue;
          set(x, y, d > 0.7 ? 2 : y < 7 ? 3 : 1);
        }
    });
    k.blit(img, C.x - 15, C.y - 7);
    if (e > 100 && e < 350) {
      for (let j = 0; j < 3; j++) {
        const q = ((e - 100 + j * 63) % 180) / 180;
        ring(add(C, (j - 1) * 7, -q * 9), 2, 2, ramp, 4, q > 0.7);
      }
    }
  }

  // Frostbite: blue-white rime grips the victim from both sides, then snaps into falling ice chips.
  FX.register('frostbite', {
    palette: ICE,
    travel: 100,
    beats: single(90),
    end: finish(540),
    ground(s) {
      const e = s.real(s.hits[0]);
      if (e >= 0 && e < 440) ring(foot(s), 10 + Math.min(4, e / 45), 5, ICE, e < 200 ? 4 : 2, e > 280);
    },
    air(s) {
      const T = point(s),
        t = s.c.t - k.CAST,
        e = s.real(s.hits[0]);
      if (t >= 0 && t < 100) {
        for (let i = 0; i < 6; i++) {
          const a = (i * k.tau) / 6,
            r = 17 - t / 10;
          crystal(add(T, Math.cos(a) * r, Math.sin(a) * r), a + Math.PI, 7);
        }
      }
      impact(s, 0, ICE, 'frostbite', 29);
      if (e >= 0 && e < 430) {
        for (let i = 0; i < 5; i++) {
          const a = (i * k.tau) / 5 + 0.3;
          const r = e < 170 ? 5 : 5 + (e - 170) / 25;
          crystal(add(T, Math.cos(a) * r, Math.sin(a) * r + Math.max(0, e - 230) / 30), a, e < 240 ? 8 : 5);
        }
      }
    },
  });

  // Word of Radiance: a spoken golden sunburst erupts within the caster's five-foot circle.
  FX.register('word-of-radiance', {
    palette: GOLD,
    travel: 60,
    beats: (event, kit, travel) =>
      (event.targets?.length ? event.targets : [null]).map(target => ({
        at: kit.CAST + travel,
        stop: 100,
        target,
        kind: 'hit',
        power: 0.06,
      })),
    end: finish(520),
    ground(s) {
      const e = s.real(s.hits[0]);
      if (e < 0 || e >= 470) return;
      const C = k.P(s.area || s.pose.base || s.pose.hand);
      const R = ((s.area?.feet || 5) / (s.grid.feet || 5)) * k.PX;
      const f = Math.floor(e / 65),
        radius = Math.round(R * (0.2 + 0.8 * k.ease(Math.min(1, e / 150))));
      const img = k.sprite(`05:radiance:${R}:${radius}:${f}`, Math.ceil(R * 2) + 9, Math.ceil(R * 2) + 9, GOLD, set => {
        const c = Math.ceil(R) + 4;
        for (let y = 2; y < c * 2 - 1; y++)
          for (let x = 2; x < c * 2 - 1; x++) {
            const dx = x - c,
              dy = y - c,
              d = Math.hypot(dx, dy);
            const a = Math.atan2(dy, dx),
              ray = Math.abs(Math.cos(a * 8)) ** 12;
            if (d > radius || (f > 3 && (d < radius * 0.68 || ray < 0.8))) continue;
            if (d < radius * 0.46 || ray > 0.75 || Math.abs(d - radius) < 1)
              set(x, y, f < 2 ? (d < radius * 0.35 ? 5 : 4) : f < 4 ? 3 : 2);
          }
      });
      k.blit(img, C.x - Math.ceil(R) - 4, C.y - Math.ceil(R) - 4);
    },
    air(s) {
      const t = s.c.t - k.CAST;
      if (t >= 0 && t < 140 && s.pose.hand) {
        const H = k.P(s.pose.hand);
        ring(H, 5 + t / 14, 7 + t / 14, GOLD, 4, true);
      }
      s.hits.forEach((h, i) => {
        // With an empty area the sunburst stays at the caster; no invented distant hit.
        if (h.id != null) impact(s, i, GOLD, 'radiance', 27, 8);
      });
    },
    flash: (event, e) =>
      e < 30 ? { color: '#fff6cf', alpha: 0.16 } : e < 65 ? { color: '#2a1a06', alpha: 0.1 } : null,
  });

  // Sapping Sting: a tiny black-violet puncture drains downward into a buckling, necrotic wisp.
  FX.register('sapping-sting', {
    palette: DEATH,
    travel: 100,
    beats: single(95, 'hit', 0.055),
    end: finish(540),
    ground(s) {
      const e = s.real(s.hits[0]);
      if (e >= 0 && e < 450) ring(foot(s), 11 - Math.min(6, e / 70), 4, DEATH, 2, true);
    },
    air(s) {
      const T = point(s),
        t = s.c.t - k.CAST,
        e = s.real(s.hits[0]);
      if (t >= 0 && t < 100) {
        const d = 10 * (1 - t / 100);
        stroke([add(T, -d - 5, -4), T, add(T, d + 5, 4)], DEATH, 4);
      }
      impact(s, 0, DEATH, 'sting', 23, 3);
      if (e >= 0 && e < 450) {
        for (let i = 0; i < 6; i++) {
          const q = k.clamp((e - i * 16) / 370);
          if (q >= 1) continue;
          const x = Math.sin(q * 6 + i) * (6 - q * 4);
          pixel(add(T, x, q * 20 - 5), DEATH, q < 0.45 ? 3 : 1, q < 0.5 ? 2 : 1);
        }
        if (e > 120 && e < 340) {
          const y = (e - 120) / 14;
          stroke([add(T, -4, y), add(T, 0, y + 4), add(T, 4, y)], DEATH, 3);
        }
      }
    },
  });

  // Magic Stone: three runed pebbles flash at the hand; one is slung in a fast, enchanted arc.
  FX.register('magic-stone', {
    palette: MAGIC,
    travel: 310,
    beats: single(80),
    end: finish(440),
    air(s) {
      const f = flight(s, 9);
      if (!f) return;
      const rock = k.sprite('05:stone', 11, 9, STONE, set => {
        for (let y = 2; y <= 6; y++)
          for (let x = 2; x <= 8; x++) if (Math.abs(x - 5) + Math.abs(y - 4) < 5) set(x, y, y < 4 ? 4 : x < 5 ? 3 : 2);
      });
      if (f.q >= 0 && f.q < 1) {
        trail(f, MAGIC, 5);
        const p = f.at(f.q);
        k.blitRotated(rock, p.x, p.y, f.q * k.tau * 2);
        pixel(add(p, 0, -1), MAGIC, 5);
        if (f.q < 0.4) {
          for (let i = 0; i < 2; i++) {
            const p2 = add(f.H, i ? -5 : 5, 6);
            k.blit(rock, p2.x - 5, p2.y - 4);
            pixel(p2, MAGIC, 4);
          }
        }
      }
      impact(s, 0, MAGIC, 'stone', 29, 4);
      k.shards(f.T, s.real(s.hits[0]), STONE, seed(s) + 21, 5, 14);
    },
  });

  // Prestidigitation: violet, gold and blue pinwheel sparks whisk away a little patch of dust.
  FX.register('prestidigitation', {
    palette: MAGIC,
    travel: 180,
    beats: soft,
    end: finish(620),
    ground(s) {
      const t = s.c.t - k.CAST;
      if (t < 0 || t > 380) return;
      const C = foot(s),
        q = k.clamp(t / 380);
      for (let i = 0; i < 6; i++) {
        if (q > 0.5 + i * 0.07) continue;
        pixel(add(C, (i - 2.5) * 3 * (1 - q), Math.sin(i * 4) * 2 - q * 5), STONE, 2);
      }
    },
    air(s) {
      const T = point(s),
        t = s.c.t - k.CAST,
        e = s.real(s.hits[0]);
      if (t < 0) return;
      if (t < 180) {
        for (let i = 0; i < 3; i++) {
          const a = (i * k.tau) / 3 + t / 90;
          spark(add(T, Math.cos(a) * 9, Math.sin(a) * 6), [MAGIC, GOLD, ICE][i], 2);
        }
      }
      if (e >= 0 && e < 540) {
        for (let i = 0; i < 9; i++) {
          const q = k.clamp((e - i * 12) / 430);
          if (q >= 1) continue;
          const a = (i * k.tau) / 9 + q * 1.4,
            r = 3 + k.ease(q) * 13;
          spark(add(T, Math.cos(a) * r, Math.sin(a) * r - q * 8), [MAGIC, GOLD, ICE][i % 3], q < 0.45 ? 3 : 1);
        }
      }
    },
  });

  // Produce Flame: a palm-sized orange flame tumbles from the hand and splashes into short fire tongues.
  FX.register('produce-flame', {
    palette: FIRE,
    travel: 330,
    beats: single(80),
    end: finish(490),
    ground(s) {
      const e = s.real(s.hits[0]);
      if (e >= 0 && e < 380) ring(foot(s), 7 + Math.min(7, e / 25), 4, FIRE, e < 160 ? 3 : 1, e > 180);
    },
    air(s) {
      const f = flight(s, 8);
      if (!f) return;
      if (f.q >= 0 && f.q < 1) {
        trail(f, FIRE, 5);
        const p = f.at(f.q);
        k.blit(flame(Math.floor(s.c.raw / 65) % 4), p.x - 8, p.y - 15);
      }
      impact(s, 0, FIRE, 'produce-flame', 31, 5);
      const e = s.real(s.hits[0]);
      if (e >= 65 && e < 340) {
        for (let i = 0; i < 3; i++) {
          const p = add(f.T, (i - 1) * (5 + e / 45), -e / 30);
          k.blit(flame((Math.floor(e / 65) + i) % 4), p.x - 8, p.y - 9);
        }
      }
      if (e >= 260 && e < 450) {
        for (let i = 0; i < 4; i++) pixel(add(f.T, (i - 1.5) * 5, -12 - (e - 260) / 12), FIRE, i % 2 ? 2 : 4);
      }
    },
  });

  // Gust: pale air curls surge forward, carrying leaves and dust into a brief, visible shove.
  FX.register('gust', {
    palette: WIND,
    travel: 260,
    beats: single(65, 'hit', 0.035),
    end: finish(460),
    ground(s) {
      const e = s.real(s.hits[0]);
      if (e >= 0 && e < 360) ring(foot(s), 8 + e / 35, 3 + e / 100, WIND, e < 140 ? 3 : 2, true);
    },
    air(s) {
      const f = flight(s);
      if (!f) return;
      const t = s.c.t - k.CAST,
        e = s.real(s.hits[0]);
      const a = Math.atan2(f.T.y - f.H.y, f.T.x - f.H.x);
      if (t >= 0 && (f.q < 1 || e < 230)) {
        const q = f.q < 1 ? f.q : 1 + k.clamp(e / 230) * 0.1;
        const C = f.at(q);
        for (let i = 0; i < 3; i++) {
          const points = [];
          for (let j = 0; j < 13; j++) {
            const u = (j / 12) * Math.PI * 1.65;
            const x = Math.cos(u) * (5 + i),
              y = Math.sin(u) * (3 + i) + (i - 1) * 7;
            points.push(add(C, x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)));
          }
          stroke(points, WIND, e > 100 ? 2 : 4);
        }
        for (let i = 0; i < 5; i++) {
          const u = Math.max(0, q - i * 0.08),
            p = f.at(u);
          pixel(
            add(p, Math.sin(i * 4 + t / 60) * 4, Math.cos(i * 3 + t / 70) * 8),
            i % 2 ? STONE : k.palettes.VINE,
            3,
            2,
          );
        }
      }
      const T = f.T;
      k.drawHit(k.hitStyle('05:gust', WIND, { S: 24, spikes: 3, jag: 0.1 }), T, e);
      k.shards(T, e, WIND, seed(s), 5, 16);
    },
  });

  // Ray of Frost: a straight cyan-white needle flashes from the hand; icy collars travel down its length.
  FX.register('ray-of-frost', {
    palette: ICE,
    travel: 55,
    beats: single(85, 'beam', 0.05),
    end: finish(500),
    ground(s) {
      const e = s.real(s.hits[0]);
      if (e >= 0 && e < 420) ring(foot(s), 11, 5, ICE, e < 180 ? 4 : 2, e > 230);
    },
    air(s) {
      if (!s.pose.hand) return;
      const H = k.P(s.pose.hand),
        T = point(s),
        t = s.c.t - k.CAST,
        e = s.real(s.hits[0]);
      if (t >= 0 && t < 260) {
        const dx = T.x - H.x,
          dy = T.y - H.y;
        if (t < 155) {
          stroke([H, T], ICE, t < 75 ? 4 : 3, t < 75 ? 3 : 1);
          stroke([H, T], ICE, 5);
        } else {
          for (let i = 0; i < 9; i++) {
            if ((i + Math.floor(t / 40)) % 3 === 0) continue;
            const q = i / 9;
            pixel(add(H, dx * q, dy * q), ICE, 3);
          }
        }
        for (let i = 0; i < 3; i++) {
          const q = (t / 150 + i / 3) % 1;
          crystal(add(H, dx * q, dy * q), Math.atan2(dy, dx), 6);
        }
      }
      impact(s, 0, ICE, 'frost-ray', 32, 6);
      if (e >= 70 && e < 380) {
        for (let i = 0; i < 3; i++)
          crystal(add(T, (i - 1) * 6, 4 + Math.max(0, e - 200) / 28), -Math.PI / 2 + (i - 1) * 0.5, 8);
      }
    },
  });

  // Mending: two broken metal halves draw together while golden stitches close the crack.
  FX.register('mending', {
    palette: GOLD,
    travel: 340,
    beats: soft,
    end: finish(540),
    air(s) {
      const T = point(s),
        t = s.c.t - k.CAST,
        e = s.real(s.hits[0]);
      if (t < 0 || e > 460) return;
      const q = k.ease(k.clamp(t / 340)),
        gap = Math.round(7 * (1 - q));
      for (let side = 0; side < 2; side++) {
        const img = k.sprite(`05:mend-half:${side}`, 11, 17, STONE, set => {
          for (let y = 2; y <= 14; y++)
            for (let x = 2; x <= 8; x++) {
              const gx = side ? x + 6 : x;
              const seam = 8 + (Math.floor(y / 3) % 2 ? 1 : -1);
              if (Math.hypot(gx - 8, y - 8) > 6 || (side ? gx < seam : gx >= seam)) continue;
              set(x, y, y < 6 ? 4 : gx < 8 ? 3 : 2);
            }
        });
        k.blit(img, T.x - 8 + (side ? 6 + gap : -gap), T.y - 8);
      }
      if (t < 340) {
        for (let i = 0; i < 4; i++) {
          const y = (i - 1.5) * 3;
          stroke([add(T, -gap - 3, y - 1), add(T, gap + 3, y + 1)], GOLD, 3);
        }
      } else {
        if (e < 170) stroke([add(T, 0, -5), add(T, 1, -1), add(T, -1, 2), add(T, 0, 5)], GOLD, 5);
        if (e < 360) {
          spark(add(T, -8 - e / 45, -5 - e / 25), GOLD, e < 120 ? 3 : 1);
          spark(add(T, 8 + e / 45, 5 - e / 25), GOLD, 2);
        }
      }
    },
  });

  // Resistance: a silver-violet ward closes around an ally and resolves into a small protective shield.
  FX.register('resistance', {
    palette: MAGIC,
    travel: 160,
    beats: soft,
    end: finish(680),
    ground(s) {
      const t = s.c.t - k.CAST;
      if (t >= 0 && t < 720) ring(foot(s), 12, 6, MAGIC, t < 300 ? 4 : 2, t > 480);
    },
    air(s) {
      const T = point(s),
        t = s.c.t - k.CAST,
        e = s.real(s.hits[0]);
      if (t < 0) return;
      if (t < 160) {
        for (let i = 0; i < 4; i++) {
          const a = (i * k.tau) / 4 + t / 160;
          spark(add(T, Math.cos(a) * (17 - t / 16), Math.sin(a) * 12), MAGIC, 2);
        }
      }
      if (e >= 0 && e < 600) {
        const img = k.sprite('05:resistance-shield', 19, 23, MAGIC, set => {
          for (let y = 3; y <= 19; y++)
            for (let x = 3; x <= 15; x++) {
              const w = y < 11 ? 6 : (20 - y) * 0.67;
              const dx = Math.abs(x - 9);
              if (dx > w) continue;
              set(x, y, dx > w - 1.5 || y < 5 ? 4 : x === 9 || y === 9 ? 5 : x < 9 ? 3 : 1);
            }
        });
        const C = add(T, 0, -10 - Math.min(5, e / 100));
        if (e < 440 || Math.floor(e / 65) % 2 === 0) k.blit(img, C.x - 9, C.y - 11);
        if (e < 330) {
          for (let i = 0; i < 4; i++) {
            const a = (i * k.tau) / 4 + e / 250;
            spark(add(C, Math.cos(a) * 13, Math.sin(a) * 15), MAGIC, 1);
          }
        }
      }
    },
  });

  // Poison Spray: a short, widening green vapor jet rolls out of the palm and bursts in toxic puffs.
  FX.register('poison-spray', {
    palette: POISON,
    travel: 190,
    beats: single(80),
    end: finish(560),
    ground(s) {
      const e = s.real(s.hits[0]);
      if (e < 0 || e >= 480) return;
      const C = foot(s);
      for (let i = 0; i < 5; i++) {
        const a = (i * k.tau) / 5,
          r = 5 + Math.min(9, e / 22);
        const p = add(C, Math.cos(a) * r, Math.sin(a) * r * 0.45 - e / 100);
        ball(p, e < 200 ? 6 : e < 330 ? 4 : 2, POISON, e < 130 ? 3 : 1);
      }
    },
    air(s) {
      const f = flight(s);
      if (!f) return;
      if (f.q >= 0 && f.q < 1) {
        const a = Math.atan2(f.T.y - f.H.y, f.T.x - f.H.x);
        for (let i = 0; i < 9; i++) {
          const u = Math.max(0, f.q - i * 0.055),
            p = f.at(u);
          const side = Math.sin(i * 2.4) * (2 + u * 6);
          const C = add(p, -Math.sin(a) * side, Math.cos(a) * side);
          ball(C, 2 + u * 3, POISON, i % 3 ? 3 : 2);
          pixel(add(C, -1, -1), POISON, 4);
        }
      }
      impact(s, 0, POISON, 'poison-spray', 30, 5);
      const e = s.real(s.hits[0]);
      if (e >= 70 && e < 420) {
        for (let i = 0; i < 5; i++) {
          const a = k.hash(i, seed(s)) * k.tau;
          const r = k.ease(e / 420) * 15;
          const p = add(f.T, Math.cos(a) * r, Math.sin(a) * r * 0.7 - e / 45);
          ring(p, e < 220 ? 4 : 2, e < 220 ? 3 : 2, POISON, e < 200 ? 3 : 2, e > 280);
        }
      }
    },
  });

  // Acid Splash: a lobbed chartreuse glob ruptures into corrosive droplets and bubbling stains.
  FX.register('acid-splash', {
    palette: ACID,
    travel: 350,
    beats: (event, kit, travel) =>
      (event.targets?.length ? event.targets.slice(0, 2) : [null]).map(target => ({
        at: kit.CAST + travel,
        stop: 85,
        target,
        kind: 'hit',
        power: 0.05,
      })),
    end: finish(550),
    ground(s) {
      s.hits.forEach((h, i) => puddle(s, ACID, i));
    },
    air(s) {
      const f = flight(s, 18);
      if (!f) return;
      if (f.q >= 0 && f.q < 1) {
        trail(f, ACID, 4);
        const p = f.at(f.q);
        ball(p, 4.5, ACID, 3);
        k.disc(p.x - 1, p.y - 1, 2, ACID[4]);
        pixel(add(p, -2, -2), ACID, 5);
        ball(add(p, -5, 2), 1, ACID, 2);
      }
      s.hits.forEach((h, i) => {
        const T = point(s, i),
          e = s.real(h);
        impact(s, i, ACID, 'acid', 31, 7);
        if (e < 0 || e > 360) return;
        for (let j = 0; j < 6; j++) {
          const a = k.hash(j, seed(s) + i * 23) * k.tau;
          const q = e / 360,
            r = k.ease(q) * (9 + k.hash(j, seed(s), 3) * 9);
          ball(
            add(T, Math.cos(a) * r, Math.sin(a) * r * 0.6 - Math.sin(q * Math.PI) * 8 + q * q * 13),
            q < 0.5 ? 2 : 1,
            ACID,
            j % 2 ? 3 : 4,
          );
        }
      });
    },
  });

  // Primal Savagery: acid-green claws grow at the hand, rake the victim locally and shed caustic flecks.
  FX.register('primal-savagery', {
    palette: ACID,
    travel: 150,
    beats: single(100, 'hit', 0.07),
    end: finish(470),
    ground(s) {
      puddle(s, ACID);
    },
    air(s) {
      const T = point(s),
        H = k.P(s.pose.hand || aim(s)),
        t = s.c.t - k.CAST;
      if (t >= 0 && t < 150) {
        const claw = k.sprite('05:primal-claws', 23, 21, ACID, set => {
          for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 13; j++) {
              const x = 3 + i * 5 + Math.floor(j * 0.3),
                y = 17 - j;
              set(x, y, j > 9 ? 5 : 3);
              if (j < 10) set(x + 1, y, 2);
            }
          }
          for (let x = 3; x <= 17; x++) set(x, 17, 2);
        });
        k.blitRotated(claw, H.x, H.y, -0.5 + t / 150);
      }
      impact(s, 0, ACID, 'savagery', 34, 3);
      const e = s.real(s.hits[0]);
      if (e >= 0 && e < 320) {
        const q = k.clamp(e / 180);
        for (let i = 0; i < 3; i++) {
          const d = (i - 1) * 5;
          const A = add(T, d - 6, -9),
            B = add(T, d + 6, 9);
          stroke([A, add(A, (B.x - A.x) * k.ease(q), (B.y - A.y) * k.ease(q))], ACID, e < 130 ? 5 : 3, e < 100 ? 2 : 1);
        }
      }
    },
  });

  // Thaumaturgy: violet voice arcs boom from the caster as golden eyes flash and the ground trembles.
  FX.register('thaumaturgy', {
    palette: MAGIC,
    travel: 80,
    beats: (event, kit, travel) => [{ at: kit.CAST + travel, stop: 60, target: null, kind: 'soft', power: 0 }],
    end: finish(700),
    ground(s) {
      const e = s.real(s.hits[0]);
      if (e < 0 || e >= 590) return;
      const C = k.P(s.pose.base || s.pose.hand || aim(s));
      for (let i = 0; i < 2; i++) {
        const q = (e - i * 90) / 500;
        if (q < 0 || q >= 1) continue;
        ring(C, 8 + k.ease(q) * 22, 4 + k.ease(q) * 10, MAGIC, q < 0.3 ? 4 : 2, true);
      }
      if (e < 380) {
        for (let i = 0; i < 6; i++) {
          const a = (i * k.tau) / 6;
          pixel(add(C, Math.cos(a) * 16, Math.sin(a) * 7 - Math.abs(Math.sin(e / 55 + i)) * 3), STONE, 2);
        }
      }
    },
    air(s) {
      const t = s.c.t - k.CAST,
        e = s.real(s.hits[0]);
      if (t < 0) return;
      const C = k.P(s.pose.hand || s.pose.base || aim(s));
      if (t < 240) {
        pixel(add(C, -3, -4), GOLD, 5, 2);
        pixel(add(C, 3, -4), GOLD, 5, 2);
      }
      if (e >= 0 && e < 600) {
        for (let i = 0; i < 3; i++) {
          const q = (e - i * 85) / 400;
          if (q < 0 || q >= 1) continue;
          const r = 6 + k.ease(q) * 15;
          const points = [];
          for (let j = 0; j <= 12; j++) {
            const a = -1.15 + (j / 12) * 2.3;
            points.push(add(C, Math.cos(a) * r, Math.sin(a) * r));
          }
          stroke(points, MAGIC, q < 0.4 ? 4 : 2, q < 0.25 ? 2 : 1);
        }
      }
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
