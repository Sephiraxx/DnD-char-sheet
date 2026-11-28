/* Pixel spells, batch 41: lasting spell art and two quick silver reactions. */
(function (root) {
  'use strict';
  const FX = root.BoardPixelFX;
  if (!FX) return;
  const k = FX.kit;
  const FIRE = ['#2a0d0c', '#6e1a12', '#b8321a', '#ec6a1c', '#ffb53a', '#fff2bd'];
  const SILVER = ['#131c36', '#3c4e73', '#7893b5', '#b8d6ed', '#e9f7ff', '#ffffff'];
  const HOLY = ['#30203d', '#775174', '#c0928b', '#f4cf88', '#fff0c4', '#ffffff'];
  const GRAVE = ['#160d24', '#3e2857', '#765389', '#b294cb', '#e0d1ef', '#ffffff'];
  const VINE = k.palettes.VINE;
  const ARCANE = ['#180f32', '#493371', '#8760be', '#c39aeb', '#eee0ff', '#ffffff'];
  const seedOf = s => s.event.seed || 0;
  const centre = s => s.area || s.pose.target || s.pose.base || s.pose.hand;
  const radius = s => ((s.area?.feet || 5) / (s.grid.feet || 5)) * k.PX;
  const guardianPalette = event => (/necr|necrot|evil/.test(event.element || '') ? GRAVE : HOLY);

  function place(img, p, alpha = 1) {
    k.blit(img, p.x - img.width / 2, p.y - img.height / 2, alpha);
  }
  function line(set, x0, y0, x1, y1, color, width = 1) {
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
    for (let i = 0; i <= n; i++) {
      const x = Math.round(k.mix(x0, x1, i / n)),
        y = Math.round(k.mix(y0, y1, i / n));
      for (let d = 0; d < width; d++) set(x + d, y, color);
    }
  }
  function ring(r, ry, ramp, dashed = false) {
    r = Math.max(2, Math.round(r));
    ry = Math.max(2, Math.round(ry));
    return k.sprite(`b41:ring:${r}:${ry}:${ramp[2]}:${dashed}`, r * 2 + 7, ry * 2 + 7, ramp, set => {
      for (let y = -ry - 1; y <= ry + 1; y++)
        for (let x = -r - 1; x <= r + 1; x++) {
          const d = Math.hypot(x / r, y / ry);
          if (Math.abs(d - 1) > 1 / Math.min(r, ry)) continue;
          if (dashed && Math.floor(((Math.atan2(y, x) + Math.PI) * 8) / Math.PI) % 2) continue;
          set(x + r + 3, y + ry + 3, y < 0 ? 3 : 4);
        }
    });
  }
  function spark(ramp) {
    return k.sprite(`b41:spark:${ramp[2]}`, 9, 9, ramp, set => {
      line(set, 4, 1, 4, 7, 4);
      line(set, 1, 4, 7, 4, 4);
      set(4, 4, 5);
    });
  }
  function beats(event, kit, travel, stop = 85, kind = 'hit') {
    return (event.targets || []).map(target => ({ at: kit.CAST + travel, stop, target, kind, power: 0.045 }));
  }
  function impacts(s, key, ramp, size = 28) {
    for (let i = 0; i < s.hits.length; i++) {
      const hit = s.hits[i],
        target = s.targets.find(t => t.id === hit.id);
      if (!target) continue;
      const at = k.P(k.contact(target, s.pose.hand || centre(s)));
      const e = s.real(hit);
      k.drawHit(k.hitStyle(`b41:${key}:${ramp[2]}`, ramp, { S: size, spikes: 5, jag: 0.25 }), at, e);
      k.shards(at, e, ramp, seedOf(s) + i * 13, 6, 18);
    }
  }
  function arrival(s, ramp, duration = 260) {
    const e = s.c.t - k.CAST;
    if (e < 0 || e >= duration || !centre(s)) return;
    const p = k.P(centre(s)),
      r = 7 + k.ease(e / duration) * Math.min(48, radius(s));
    place(ring(r, r * 0.55, ramp, e > duration * 0.5), p, 1 - (e / duration) * 0.5);
  }
  function fallback(s, draw, onset) {
    if (!s.pose.linger && s.c.t >= onset) draw({ ...s, linger: 1 });
  }

  // Flame silhouettes have three nested bands, a crooked tip, and an outlined white-hot foot.
  function flame(frame, variant, tip = false, clip = null) {
    const tag = clip ? clip.join(',') : '';
    return k.sprite(`b41:flame:${frame}:${variant}:${tip}:${tag}`, 18, 62, FIRE, set => {
      const h = 43 + variant * 4 + [0, 4, 1, -3][frame];
      for (let y = 2; y < 60; y++) {
        const t = (60 - y) / h;
        if (t > 1 || (tip && t < 0.66)) continue;
        const cx = 8 + Math.sin(t * 6 + frame * 1.2 + variant) * t * 3;
        const w = Math.max(0.5, (1 - t) * 7 + Math.sin(t * 10 + variant) * 1.2);
        for (let x = 1; x < 17; x++) {
          if (clip && (x < clip[0] || y < clip[1] || x >= clip[2] || y >= clip[3])) continue;
          const d = Math.abs(x - cx) / w;
          if (d <= 1) set(x, y, t < 0.34 && d < 0.38 ? 5 : d < 0.48 ? 4 : d < 0.8 ? 3 : 2);
        }
      }
    });
  }
  function wallShape(s) {
    if (!s.area) return null;
    const a = s.area,
      C = k.P(a),
      r = radius(s),
      dir = a.dir || 0;
    const side = s.event.wallSide === -1 ? -1 : 1;
    // The outline supplies the true wall width, including templates from older boards.
    const corners = k.outline(a, s.grid);
    const width =
      !a.ring && corners.length >= 4
        ? Math.hypot(corners[0][0] - corners[3][0], corners[0][1] - corners[3][1]) * k.PX
        : ((a.width || 5) / (s.grid.feet || 5)) * k.PX;
    return { a, C, r, dir, side, width };
  }
  function wallHeat(w) {
    const { a, r, dir, side, width } = w,
      pad = 38;
    const dx = Math.cos(dir),
      dy = Math.sin(dir);
    const minX = a.ring ? -r - pad : Math.min(0, dx * r) - pad;
    const minY = a.ring ? -r - pad : Math.min(0, dy * r) - pad;
    const W = Math.ceil((a.ring ? 2 * r : Math.abs(dx * r)) + 2 * pad + 3);
    const H = Math.ceil((a.ring ? 2 * r : Math.abs(dy * r)) + 2 * pad + 3);
    const img = k.sprite(`b41:heat:${r}:${dir}:${side}:${!!a.ring}:${width}`, W, H, FIRE, set => {
      for (let y = 1; y < H - 1; y++)
        for (let x = 1; x < W - 1; x++) {
          const px = x + minX,
            py = y + minY;
          const along = px * dx + py * dy;
          const cross = a.ring ? (Math.hypot(px, py) - r) * side : (-px * dy + py * dx) * side;
          if (!a.ring && (along < 0 || along > r)) continue;
          if (Math.abs(cross) <= width / 2) set(x, y, 2);
          else if (cross > 0 && cross < 32 && (cross < 10 || k.dith(x, y) < (32 - cross) / 44))
            set(x, y, cross < 12 ? 3 : 1);
        }
    });
    k.blit(img, w.C.x + minX, w.C.y + minY, (w.alpha ?? 1) * 0.5);
  }
  function wall(s, tips = false) {
    const w = wallShape(s);
    if (!w) return;
    const alpha = s.linger,
      bounds = s.pose.wallBounds || [];
    if (tips && !bounds.length) return;
    if (!tips) wallHeat({ ...w, alpha });
    const count = Math.max(2, Math.ceil((w.a.ring ? k.tau * w.r : w.r) / 7));
    const flames = [];
    for (let i = 0; i <= count; i++) {
      if (w.a.ring && i === count) continue;
      const u = i / count;
      flames.push({
        i,
        x: w.C.x + (w.a.ring ? Math.cos(u * k.tau) * w.r : Math.cos(w.dir) * w.r * u),
        y: w.C.y + (w.a.ring ? Math.sin(u * k.tau) * w.r : Math.sin(w.dir) * w.r * u),
      });
    }
    flames.sort((a, b) => a.y - b.y);
    for (const p of flames) {
      const frame = (Math.floor(s.c.raw / 160) + p.i) % 4;
      const variant = Math.floor(k.hash(p.i, seedOf(s)) * 3);
      const x = Math.round(p.x - 9),
        y = Math.round(p.y - 59);
      if (!tips) k.blit(flame(frame, variant), x, y, alpha);
      else
        for (const rect of bounds) {
          const B = k.P({ x: rect[0], y: rect[1] });
          // Leave a one-pixel inset so the sprite's automatic outline also stays inside the figure.
          const clip = [
            Math.ceil(B.x - x) + 1,
            Math.ceil(B.y - y) + 1,
            Math.floor(B.x + rect[2] * k.PX - x) - 1,
            Math.floor(B.y + rect[3] * k.PX - y) - 1,
          ];
          if (clip[0] >= 17 || clip[2] <= 1 || clip[1] >= 35 || clip[3] <= 1) continue;
          k.blit(flame(frame, variant, true, clip), x, y, alpha * 0.25);
        }
    }
  }

  // Wall of Fire: a rising orange curtain, white-hot feet and a one-sided bed of heat.
  FX.register('wall-of-fire', {
    palette: FIRE,
    travel: 80,
    beats: (event, kit, travel) => beats(event, kit, travel, 105),
    end: () => 1050,
    reach: (event, grid) => ({ r: (event.area?.feet || 60) / (grid.feet || 5) + 3, up: 5 }),
    ground(s) {
      arrival(s, FIRE);
      fallback(s, wall, k.CAST + 80);
    },
    air(s) {
      impacts(s, 'wall', FIRE, 32);
    },
    linger: s => wall(s),
    lingerAir: s => wall(s, true),
  });

  function moon(s) {
    if (!s.area) return;
    const C = k.P(s.area),
      r = Math.max(4, Math.round(radius(s)));
    const top = k.P({ x: s.area.x, y: s.pose.top ?? 0 }).y;
    const h = Math.max(16, Math.ceil(C.y - top)),
      W = r * 2 + 7;
    const img = k.sprite(`b41:moon:${r}:${h}`, W, h + r + 6, SILVER, set => {
      const cx = r + 3;
      for (let y = 1; y < h; y++)
        for (let x = -r; x <= r; x++) {
          const edge = Math.abs(x) / r;
          if (edge > 0.9 && k.dith(x, y) > 0.5) continue;
          set(cx + x, y, edge < 0.32 ? 4 : edge < 0.78 ? 3 : 2);
        }
      for (let y = -r; y <= r; y++)
        for (let x = -r; x <= r; x++) {
          const d = Math.hypot(x, y) / r;
          if (d <= 1) set(cx + x, h + y, d < 0.72 ? 4 : 3);
        }
    });
    k.blit(img, C.x - r - 3, top, s.linger * 0.25);
    place(ring(r, r, SILVER), C, s.linger * 0.75);
    // A crescent badge distinguishes the moon's light from a generic holy column.
    const crescent = k.sprite('b41:crescent', 17, 19, SILVER, set => {
      for (let y = 1; y < 18; y++)
        for (let x = 1; x < 16; x++)
          if (Math.hypot(x - 8, y - 9) < 7 && Math.hypot(x - 11, y - 7) > 6) set(x, y, x < 7 ? 3 : 5);
    });
    place(crescent, { x: C.x, y: C.y - 36 }, s.linger * 0.75);
    for (let i = 0; i < 6; i++) {
      const q = (s.c.raw / 2600 + k.hash(i, seedOf(s))) % 1;
      place(
        spark(SILVER),
        { x: C.x + (k.hash(i, seedOf(s), 2) - 0.5) * r * 1.5, y: C.y - 4 - q * 47 },
        s.linger * (q < 0.8 ? 0.75 : 0.25),
      );
    }
  }

  // Moonbeam: a silver shaft from the board's top, a luminous floor seal and rising moon motes.
  FX.register('moonbeam', {
    palette: SILVER,
    travel: 90,
    beats: (event, kit, travel) => beats(event, kit, travel, 95),
    end: () => 1000,
    reach: (event, grid) => ({
      r: (event.area?.feet || 5) / (grid.feet || 5) + 1,
      up: Math.max(40 / (grid.feet || 5), event.area?.y || 0) + 2,
    }),
    ground(s) {
      arrival(s, SILVER);
      fallback(s, moon, k.CAST + 90);
    },
    air(s) {
      impacts(s, 'moon', SILVER, 30);
    },
    linger: moon,
  });

  function guardian(ramp, frame) {
    return k.sprite(`b41:guardian:${ramp[2]}:${frame}`, 23, 27, ramp, set => {
      // Hood, trailing robe, spread wings and a small upright sword.
      for (let y = 6; y < 24; y++) {
        const half = y < 12 ? 3 : 2 + Math.floor((y - 12) / 3);
        for (let x = 10 - half; x <= 10 + half; x++) {
          if (y > 20 && (x + frame) % 3 === 0) continue;
          set(x, y, y < 10 ? 4 : x < 10 ? 2 : 3);
        }
      }
      for (let side = -1; side <= 1; side += 2)
        for (let feather = 0; feather < 3; feather++)
          line(set, 10 + side * 3, 12 + feather, 10 + side * (9 - feather), 8 + feather * 3 + frame, 3);
      set(9, 10, 5);
      set(11, 10, 5);
      line(set, 18, 4, 18, 19, 4);
      line(set, 16, 16, 20, 16, 3);
      line(set, 7, 3, 13, 3, 4);
    });
  }
  function guardians(s) {
    if (!s.area) return;
    const C = k.P(s.area),
      r = radius(s),
      ramp = s.ramp;
    place(ring(r, r, ramp, true), C, s.linger * 0.5);
    const ghosts = Array.from({ length: 7 }, (_, i) => {
      const a = (i / 7 + s.c.raw / 10000) * k.tau;
      return { i, x: C.x + Math.cos(a) * r, y: C.y + Math.sin(a) * r };
    }).sort((a, b) => a.y - b.y);
    for (const p of ghosts) {
      const f = Math.floor(s.c.raw / 360 + p.i) % 2;
      place(guardian(ramp, f), { x: p.x, y: p.y - 13 - Math.sin(s.c.raw / 450 + p.i) * 2 }, s.linger * 0.75);
    }
  }

  // Spirit Guardians: seven winged sword-bearing spirits orbit a gold or necrotic violet ward.
  FX.register('spirit-guardians', {
    palette: guardianPalette,
    travel: 100,
    beats: (event, kit, travel) => beats(event, kit, travel, 85),
    end: () => 1020,
    ground(s) {
      arrival(s, s.ramp);
      fallback(s, guardians, k.CAST + 100);
    },
    air(s) {
      impacts(s, 'guardians', s.ramp);
    },
    linger: guardians,
  });

  function vineTile(variant, frame) {
    return k.sprite(`b41:vine:${variant}:${frame}`, 19, 24, VINE, set => {
      const sway = frame ? 1 : -1;
      line(set, 8, 21, 8, 11, 2, 2);
      line(set, 8, 11, 12 + sway, 5, 3, 2);
      line(set, 12 + sway, 5, 15 + sway, 7, 3);
      line(set, 15 + sway, 7, 12, 11, 3);
      line(set, 8, 17, 4 - sway, 12, 2);
      line(set, 4 - sway, 12, 3, 8 + variant, 3);
      line(set, 3, 20, 15, 20, 1);
      for (const [x, y] of [
        [5 - sway, 13],
        [11 + sway, 14],
      ]) {
        line(set, x - 2, y - 1, x + 2, y + 1, 3, 2);
        set(x, y, 4);
      }
    });
  }
  function entangled(s) {
    if (!s.area) return;
    const corners = k.outline(s.area, s.grid);
    if (corners.length < 4) return;
    const a = corners[0],
      b = corners[1],
      d = corners[3];
    const nx = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1])));
    const ny = Math.max(1, Math.ceil(Math.hypot(d[0] - a[0], d[1] - a[1])));
    // One grasping shoot in every template cell, even when the square is rotated.
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) {
        const u = (i + 0.5) / nx,
          v = (j + 0.5) / ny;
        const p = k.P({
          x: a[0] + (b[0] - a[0]) * u + (d[0] - a[0]) * v,
          y: a[1] + (b[1] - a[1]) * u + (d[1] - a[1]) * v,
        });
        const n = j * nx + i,
          variant = Math.floor(k.hash(n, seedOf(s)) * 3);
        const frame = Math.floor(s.c.raw / 650 + k.hash(n, seedOf(s), 1) * 2) % 2;
        k.blit(vineTile(variant, frame), p.x - 9, p.y - 18, s.linger * 0.75);
      }
  }

  // Entangle: hooked green shoots claw up through every square, with broad leaves and slow swaying.
  FX.register('entangle', {
    palette: VINE,
    travel: 80,
    beats: (event, kit, travel) => beats(event, kit, travel, 85, 'soft'),
    end: () => 1000,
    ground(s) {
      arrival(s, VINE);
      fallback(s, entangled, k.CAST + 80);
    },
    air(s) {
      impacts(s, 'entangle', VINE, 24);
    },
    linger: entangled,
  });

  function weapon(form, lean = 0) {
    return k.sprite(`b41:weapon:${form}:${lean}`, 37, 43, HOLY, set => {
      const shift = y => Math.round((y - 22) * lean * 0.3);
      for (let y = 10; y <= 36; y++) for (let x = 16; x <= 18; x++) set(x + shift(y), y, x === 16 ? 2 : 4);
      for (let y = 6; y < 18; y++)
        for (let x = 5; x < 30; x++) {
          const dx = x - 17,
            dy = y - 12;
          const inside =
            form === 'mace'
              ? Math.abs(dx) + Math.abs(dy) < 11
              : form === 'axe'
                ? dx > -2 && dx < 13 && Math.abs(dy) < 3 + dx * 0.4
                : Math.abs(dx) < 11 && Math.abs(dy) < 5;
          if (inside) set(x + shift(y), y, y < 10 ? 5 : x < 12 ? 2 : y < 14 ? 4 : 3);
        }
      if (form === 'mace')
        for (const [x, y] of [
          [17, 2],
          [3, 12],
          [30, 12],
          [17, 21],
        ])
          line(set, 17 + shift(12), 12, x + shift(y), y, 3, 2);
      line(set, 14 + shift(34), 34, 20 + shift(34), 34, 3);
    });
  }
  function spiritual(s) {
    if (!s.pose.target) return;
    const form = ['mace', 'axe'].includes(s.event.weaponForm) ? s.event.weaponForm : 'hammer';
    const home = k.P(s.pose.target);
    let x = home.x,
      y = home.y - k.PX * 0.6 + Math.sin(s.c.raw / 440) * 2,
      lean = 0;
    const swing = s.event.swing,
      e = swing ? s.c.now - swing.at : -1;
    if (e >= 0 && e <= 550 && swing.point) {
      const q = e / 550,
        reach = q < 0.47 ? k.ease(q / 0.47) : 1 - k.ease((q - 0.47) / 0.53);
      const T = k.P(swing.point);
      x = k.mix(x, T.x, reach);
      y = k.mix(y, T.y, reach) - Math.sin(q * Math.PI) * 6;
      lean = q < 0.47 ? -1 : 1;
    }
    place(ring(11, 4, HOLY, true), { x: home.x, y: home.y + 4 }, s.linger * 0.25);
    place(weapon(form, lean), { x, y }, s.linger * 0.85);
    place(spark(HOLY), { x: x - 15, y: y - 10 }, s.linger * 0.5);
    const impact = s.event.attackImpact,
      age = impact ? s.c.now - impact.at : -1;
    if (impact?.point && age >= 0 && age < 370 && s.linger > 0) {
      const T = k.P(impact.point),
        S = Math.round(30 * Math.min(1.5, Math.max(1, impact.span || 1)));
      // The kit's hit marks have no alpha parameter; end them on the final fade step.
      if (s.linger >= 0.5) {
        k.drawHit(k.hitStyle(`b41:weapon:${S}`, HOLY, { S, spikes: 4, minor: 4, jag: 0.15 }), T, age);
        k.shards(T, age, HOLY, seedOf(s), 7, 21);
      }
    }
  }

  // Spiritual Weapon: a gold spectral hammer, mace or axe condenses, hovers and swoops on board attacks.
  FX.register('spiritual-weapon', {
    palette: HOLY,
    travel: 40,
    beats: () => [],
    end: () => 900,
    air(s) {
      arrival(s, HOLY, 330);
      fallback(s, spiritual, k.CAST + 40);
      const e = s.c.t - k.CAST;
      if (e < 0 || e > 440 || !s.pose.target) return;
      const P = k.P(s.pose.target);
      for (let i = 0; i < 5; i++) {
        const a = (i * k.tau) / 5 + 0.4,
          r = 4 + (1 - k.ease(e / 440)) * 24;
        place(spark(HOLY), { x: P.x + Math.cos(a) * r, y: P.y - 10 + Math.sin(a) * r }, 1 - e / 550);
      }
    },
    lingerAir: spiritual,
  });

  function mist(frame, variant) {
    return k.sprite(`b41:mist:${frame}:${variant}`, 55, 43, SILVER, set => {
      const q = frame / 7;
      const puffs = Array.from({ length: 5 }, (_, i) => ({
        x: 27 + Math.cos(i * 2.4 + variant) * (5 + q * 14),
        y: 28 - q * (6 + i * 1.5) + Math.sin(i * 2.4) * 6,
        r: 6 + Math.sin(q * Math.PI) * 3 - q * 2,
      }));
      for (let y = 1; y < 42; y++)
        for (let x = 1; x < 54; x++) {
          let d = 2;
          for (const p of puffs) d = Math.min(d, Math.hypot(x - p.x, (y - p.y) * 1.05) / p.r);
          if (d >= 1 || (q > 0.55 && k.dith(x, y) < (q - 0.55) * 1.7)) continue;
          set(x, y, d < 0.48 ? 4 : d < 0.78 ? 3 : 2);
        }
    });
  }
  function mistBurst(s, point, start, duration, variant) {
    const e = s.c.t - start;
    if (!point || e < 0 || e >= duration) return;
    const q = e / duration,
      P = k.P(point);
    k.blit(mist(Math.min(7, Math.floor(q * 8)), variant), P.x - 27, P.y - 35, 1);
    if (q < 0.8)
      for (let i = 0; i < 4; i++) {
        const a = (i * k.tau) / 4 + seedOf(s),
          r = 6 + k.ease(q) * 15;
        place(spark(SILVER), { x: P.x + Math.cos(a) * r, y: P.y - 12 + Math.sin(a) * r * 0.8 }, 1 - q * 0.6);
      }
  }

  // Misty Step: silver mist swallows the old position, then a second puff reveals the destination.
  FX.register('misty-step', {
    palette: SILVER,
    beats: () => [],
    end: () => 1000,
    air(s) {
      const teleport = s.event.teleport;
      if (!teleport) return;
      mistBurst(s, teleport.from, 300, 320, 0);
      mistBurst(s, teleport.to, 545, 430, 1);
    },
  });

  function rune(frame) {
    return k.sprite(`b41:counter-rune:${frame}`, 51, 51, ARCANE, set => {
      for (let y = 2; y < 49; y++)
        for (let x = 2; x < 49; x++) {
          const dx = x - 25,
            dy = y - 25,
            r = Math.hypot(dx, dy),
            a = Math.atan2(dy, dx);
          if (
            (Math.abs(r - 20) < 0.7 || Math.abs(r - 16) < 0.55) &&
            !(frame && Math.floor((a + Math.PI) * 5) % 3 === 0)
          )
            set(x, y, frame ? 2 : 4);
        }
      for (let i = 0; i < 6; i++) {
        const a = (i * k.tau) / 6;
        const x = 25 + Math.cos(a) * 20,
          y = 25 + Math.sin(a) * 20;
        line(set, x - Math.sin(a) * 3, y + Math.cos(a) * 3, x + Math.cos(a) * 4, y + Math.sin(a) * 4, 3);
      }
    });
  }
  const counterspell = {
    palette: ARCANE,
    travel: 145,
    beats: (event, kit, travel) => [
      { at: kit.CAST + travel, stop: 65, target: event.targets?.[0] ?? null, kind: 'hit', power: 0.035 },
    ],
    end: () => 900,
    air(s) {
      const target = s.targets[0] || s.pose.target;
      if (!target || s.c.t < k.CAST) return;
      const P = k.P(target),
        hit = s.hits[0],
        e = s.real(hit);
      if (e < 0) place(rune(0), P);
      else if (e < 75) place(rune(1), P);
      if (e >= 0 && e < 160) {
        const slash = k.sprite(`b41:counter-slash:${Math.floor(e / 40)}`, 61, 55, ARCANE, set => {
          const q = Math.min(1, (Math.floor(e / 40) + 1) / 2);
          line(set, 7, 46, 7 + 46 * q, 46 - 38 * q, 4, e < 80 ? 3 : 1);
          if (e < 80) line(set, 8, 46, 8 + 46 * q, 46 - 38 * q, 5);
        });
        place(slash, P);
      }
      k.drawHit(k.hitStyle('b41:counter', ARCANE, { S: 26, spikes: 4, jag: 0.1 }), P, e);
      k.shards(P, e, ARCANE, seedOf(s), 9, 29);
    },
  };

  // Counterspell: an enemy rune snaps shut, a silver slash cuts it apart and violet fragments scatter.
  FX.register('counterspell', counterspell);
  // Counter: the older id uses the identical severed-rune reaction.
  FX.register('counter', counterspell);
})(typeof window !== 'undefined' ? window : globalThis);
