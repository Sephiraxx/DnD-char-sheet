/* Pixel spells, batch 07 (see docs/pixel-spells/BRIEF.md). */
(function (root) {
  'use strict';
  const FX = root.BoardPixelFX;
  if (!FX) return;
  const k = FX.kit;
  const ICE = k.palettes.frost;
  const GOLD = k.palettes.radiante;
  const HEAL = k.palettes.heal;
  const MAGIC = k.palettes.magic;
  const FORCE = k.palettes.FORCE;
  const STONE = k.palettes.contundente;
  const WATER = ['#081c30', '#164266', '#237da8', '#58c6e5', '#c3f6ff', '#ffffff'];
  const DREAD = ['#180b24', '#32133e', '#642965', '#b94f9e', '#f3b8df', '#ffffff'];
  const SICK = ['#102014', '#304c28', '#658743', '#bbd464', '#eff6bd', '#ffffff'];
  const CHAOS = [
    ['#202407', '#53720f', '#94b92a', '#d3ed57', '#f3ffc2', '#ffffff'],
    ICE,
    ['#290c0b', '#7d2217', '#d24b1d', '#ff932e', '#ffdf87', '#ffffff'],
    FORCE,
    k.palettes.lightning,
    ['#18240b', '#3a6129', '#70a342', '#b7df6c', '#e8ffc4', '#ffffff'],
    DREAD,
    k.palettes.trueno,
  ];
  const add = (p, x, y) => ({ x: p.x + x, y: p.y + y });
  const seed = s => s.event.seed || 0;
  const end = tail => (event, travel) => k.CAST + travel + tail;
  const beats =
    (stop, kind = 'hit', power = 0.06, all = false) =>
    (event, kit, travel) =>
      (all && event.targets?.length ? event.targets : [event.targets?.[0] ?? null]).map(target => ({
        at: kit.CAST + travel,
        stop,
        target,
        kind,
        power,
      }));
  const soft = beats(60, 'soft', 0, true);
  function caster(s) {
    const b = s.pose.base || s.pose.hand || s.pose.target || { x: 0, y: 0 };
    return { x: s.pose.hand?.x ?? b.x, y: s.pose.hand?.y ?? b.y - 0.6, baseX: b.x, baseY: b.y, span: b.span || 1 };
  }
  function recipient(s, hit = s.hits[0]) {
    return s.targets.find(t => hit?.id != null && t.id === hit.id) || s.targets[0] || s.pose.target || caster(s);
  }
  function aim(s, hit) {
    const t = recipient(s, hit);
    return k.P(s.pose.hand ? k.contact(t, s.pose.hand) : t);
  }
  function feet(t) {
    return k.P({ x: t.baseX ?? t.x, y: t.baseY ?? t.y });
  }
  function centre(s) {
    return k.P(s.area || s.pose.target || recipient(s));
  }
  function pixel(p, ramp, index = 3, size = 1) {
    k.dot(p.x, p.y, ramp[0], size + 2);
    k.dot(p.x, p.y, ramp[index], size);
  }
  function ball(p, radius, ramp, index = 3) {
    k.disc(p.x, p.y, radius + 1, ramp[0]);
    k.disc(p.x, p.y, radius, ramp[index]);
  }
  function stroke(points, ramp, index = 3, width = 1, budget = 26) {
    const lengths = points.slice(1).map((p, i) => Math.hypot(p.x - points[i].x, p.y - points[i].y));
    const step = Math.max(1, lengths.reduce((a, b) => a + b, 0) / budget);
    for (const [color, size] of [
      [ramp[0], width + 2],
      [ramp[index], width],
    ]) {
      lengths.forEach((length, i) => {
        const n = Math.max(1, Math.ceil(length / step));
        for (let j = 0; j <= n; j++)
          k.dot(k.mix(points[i].x, points[i + 1].x, j / n), k.mix(points[i].y, points[i + 1].y, j / n), color, size);
      });
    }
  }
  function icon(name, rows, ramp) {
    return k.sprite(`07:icon:${name}:${ramp[2]}`, rows[0].length + 2, rows.length + 2, ramp, set => {
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
  function ring(p, rx, ry, ramp, index = 3, broken = false, phase = 0) {
    rx = Math.max(2, Math.round(rx));
    ry = Math.max(2, Math.round(ry));
    const img = k.sprite(
      `07:ring:${ramp[2]}:${rx}:${ry}:${index}:${broken}:${phase}`,
      rx * 2 + 6,
      ry * 2 + 6,
      ramp,
      set => {
        for (let y = -ry - 1; y <= ry + 1; y++)
          for (let x = -rx - 1; x <= rx + 1; x++) {
            if (Math.abs(Math.hypot(x / rx, y / ry) - 1) * Math.min(rx, ry) > 0.65) continue;
            if (broken && (Math.floor((Math.atan2(y, x) + k.tau) * 4) + phase) % 3 === 0) continue;
            set(x + rx + 3, y + ry + 3, index);
          }
      },
    );
    k.blit(img, p.x - rx - 3, p.y - ry - 3);
  }
  function spark(p, ramp) {
    show(icon('spark', ['..4..', '..5..', '45554', '..5..', '..4..'], ramp), p);
  }
  function skull(p, ramp, small = false) {
    show(
      icon(
        small ? 'skull-small' : 'skull',
        small
          ? ['.444.', '41114', '41414', '.333.', '.3.3.']
          : ['..33333..', '.3444443.', '344444443', '341141143', '341141143', '.4431344.', '..33333..', '..4.4.4..'],
        ramp,
      ),
      p,
    );
  }
  function mark(s, hit, p, ramp, name, size = 30, count = 7, reach = 20) {
    const e = s.real(hit);
    k.drawHit(k.hitStyle(`07:${name}:${ramp[2]}`, ramp, { S: size, spikes: 5, jag: 0.32 }), p, e);
    k.shards(p, e, ramp, seed(s) + hit.at, count, reach);
  }
  function areaPoints(s, kind, feetDefault) {
    if (s.area) {
      const points = k.outline(s.area, s.grid);
      if (points.length) return points.map(p => k.P({ x: p[0], y: p[1] }));
    }
    const a = s.area || { ...caster(s), dir: 0, feet: feetDefault };
    const p = k.P(a),
      r = ((a.feet || feetDefault) / (s.grid.feet || 5)) * k.PX;
    const angle = a.dir || 0,
      ux = Math.cos(angle),
      uy = Math.sin(angle);
    const at = (along, side) => add(p, along * ux - side * uy, along * uy + side * ux);
    return kind === 'cone'
      ? [p, at(r, -r / 2), at(r, r / 2)]
      : [at(0, -r / 2), at(r, -r / 2), at(r, r / 2), at(0, r / 2)];
  }
  // Cached polygon bodies retain the board template's exact orientation and dimensions.
  function surface(points, ramp, name, stage) {
    const left = Math.floor(Math.min(...points.map(p => p.x))) - 2;
    const top = Math.floor(Math.min(...points.map(p => p.y))) - 2;
    const poly = points.map(p => ({ x: p.x - left, y: p.y - top }));
    const w = Math.ceil(Math.max(...poly.map(p => p.x))) + 3;
    const h = Math.ceil(Math.max(...poly.map(p => p.y))) + 3;
    const key = poly.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(':');
    const img = k.sprite(`07:surface:${name}:${key}:${stage}`, w, h, ramp, set => {
      for (let y = 1; y < h - 1; y++)
        for (let x = 1; x < w - 1; x++) {
          let inside = false;
          for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
            const a = poly[i],
              b = poly[j];
            if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
          }
          if (!inside) continue;
          if (stage === 3 && (x + y * 2) % 9 > 1) continue;
          const band = (Math.floor(y / 4) + Math.floor(x / 12)) % 3;
          set(x, y, stage === 0 ? 4 : stage === 1 ? 2 + (band === 0 ? 1 : 0) : 1 + (band === 0 ? 1 : 0));
        }
    });
    k.blit(img, left, top);
  }
  function shot(s, hit, ramp, paint, bow = 0) {
    if (!s.pose.hand || s.c.t < k.CAST || s.c.t >= hit.at) return;
    const H = k.P(s.pose.hand),
      T = aim(s, hit);
    const q = k.clamp((s.c.t - k.CAST) / Math.max(1, hit.at - k.CAST));
    const at = u => ({ x: k.mix(H.x, T.x, u), y: k.mix(H.y, T.y, u) - Math.sin(u * Math.PI) * bow });
    for (let i = 7; i >= 1; i--) {
      const u = q - i * 0.035;
      if (u < 0) continue;
      pixel(at(u), ramp, i < 3 ? 4 : i < 5 ? 3 : 2, i < 3 ? 2 : 1);
    }
    const p = at(q),
      before = at(Math.max(0, q - 0.02));
    paint(p, Math.atan2(p.y - before.y, p.x - before.x), q);
  }
  function groundSeal(s, ramp, radius = 12, self = false) {
    const e = s.real(s.hits[0]);
    if (e < 0 || e > 740) return;
    const p = feet(self ? caster(s) : recipient(s));
    const q = k.clamp(e / 600);
    ring(
      p,
      radius + Math.floor(k.ease(q) * 5),
      radius * 0.5 + 2,
      ramp,
      e < 80 ? 4 : 2,
      e > 460,
      Math.floor(e / 100) % 3,
    );
  }
  function orbitSparks(s, p, ramp, e, n = 6) {
    if (e < 0 || e > 720) return;
    for (let i = 0; i < n; i++) {
      if (e > 500 && i % 2) continue;
      const a = (i / n) * k.tau + e / 350;
      const r = 8 + Math.min(e / 40, 7);
      pixel(add(p, Math.cos(a) * r, Math.sin(a) * r * 0.5 - e / 65), ramp, i % 2 ? 3 : 4);
    }
  }

  // Wrathful Smite: a weapon snaps through a magenta psychic crescent; a dreadful face follows the wound.
  FX.register('wrathful-smite', {
    palette: DREAD,
    travel: 100,
    beats: beats(115),
    end: end(640),
    air(s) {
      const hit = s.hits[0],
        p = aim(s),
        t = s.c.t - k.CAST,
        e = s.real(hit);
      if (t >= 0 && t < 250) {
        const q = k.clamp(t / 100);
        const angle = -2.4 + q * 2.9;
        const tip = add(p, Math.cos(angle) * 12, Math.sin(angle) * 12);
        const hilt = add(tip, -8, 9);
        stroke([hilt, tip], STONE, 4, 2, 14);
        stroke([add(hilt, -3, -2), add(hilt, 2, 3)], DREAD, 3, 2, 8);
        const sweep = [];
        for (let i = 0; i < 10; i++) {
          const a = -2.4 + (q * 2.9 * i) / 9;
          sweep.push(add(p, Math.cos(a) * 14, Math.sin(a) * 14));
        }
        stroke(sweep, DREAD, 4, e < 60 ? 3 : 1, 30);
      }
      mark(s, hit, p, DREAD, 'wrath', 36);
      if (e >= 140 && e < 650) {
        const face = add(p, 0, -13 - Math.floor((e - 140) / 100));
        skull(face, DREAD);
        if (e < 430) {
          stroke([add(face, -6, -2), add(face, -10, -7)], DREAD, 2, 1, 6);
          stroke([add(face, 6, -2), add(face, 10, -7)], DREAD, 2, 1, 6);
        }
      }
    },
  });

  // Catapult: a chipped stone is ripped from beside the caster and hurled straight into a dusty physical impact.
  FX.register('catapult', {
    palette: STONE,
    travel: 320,
    beats: beats(125),
    end: end(440),
    ground(s) {
      const hit = s.hits[0],
        e = s.real(hit);
      if (e < 0 || e > 450) return;
      const p = feet(recipient(s));
      ring(p, 4 + k.ease(k.clamp(e / 300)) * 17, 3 + e / 70, STONE, 2, e > 130);
      for (let i = 0; i < 4; i++) {
        const x = (k.hash(i, seed(s)) - 0.5) * 25;
        ball(add(p, x, -e / 90 - (i % 2) * 3), e < 180 ? 3 : 2, STONE, 1);
      }
    },
    air(s) {
      const hit = s.hits[0];
      if (s.pose.hand && s.c.t >= k.CAST && s.c.t < hit.at) {
        const H = add(k.P(s.pose.hand), 2, 8),
          T = aim(s);
        const q = k.clamp((s.c.t - k.CAST) / (hit.at - k.CAST));
        const p = { x: k.mix(H.x, T.x, q), y: k.mix(H.y, T.y, q) };
        for (let i = 0; i < 4; i++) {
          const u = q - 0.055 * (i + 1);
          if (u < 0) continue;
          const a = { x: k.mix(H.x, T.x, u), y: k.mix(H.y, T.y, u) + (i % 2 ? 3 : -3) };
          const dx = T.x - H.x,
            dy = T.y - H.y,
            len = Math.hypot(dx, dy) || 1;
          stroke([a, add(a, (-dx / len) * 7, (-dy / len) * 7)], STONE, 2, 1, 6);
        }
        const rock = icon(
          'catapult-rock',
          ['...333...', '..34432..', '.3443322.', '.3433222.', '..33221..', '...221...'],
          STONE,
        );
        k.blitRotated(rock, p.x, p.y, (Math.floor(q * 8) * Math.PI) / 4);
      }
      mark(s, hit, aim(s), STONE, 'catapult', 40, 10, 28);
    },
  });

  // Cause Fear: a horned spectral skull opens above the victim with black, retreating fear ripples.
  FX.register('cause-fear', {
    palette: DREAD,
    travel: 100,
    beats: beats(90, 'soft', 0, true),
    end: end(780),
    ground: s => groundSeal(s, DREAD),
    air(s) {
      s.hits.forEach(hit => {
        const e = s.real(hit),
          p = aim(s, hit);
        if (e < 0 || e > 820) return;
        const face = add(p, 0, -14 - Math.floor(Math.min(e, 500) / 140));
        if (e < 650) {
          skull(face, DREAD);
          show(
            icon(
              'fear-horns',
              ['.3.............3.', '.3.3.........3.3.', '..33.........33..', '...3.........3...'],
              DREAD,
            ),
            add(face, 0, -6),
          );
        }
        k.drawHit(k.hitStyle('07:fear', DREAD, { S: 28, spikes: 4, void: true }), face, e);
        k.shards(face, e, DREAD, seed(s), 5, 18);
        for (let i = 0; i < 3; i++) {
          const r = (e - i * 110) / 28;
          if (r < 2 || r > 18) continue;
          stroke([add(p, -r - 3, -r * 0.5), add(p, -r - 6, -r * 0.5 - 4)], DREAD, 2, 1, 3);
          stroke([add(p, r + 3, -r * 0.5), add(p, r + 6, -r * 0.5 - 4)], DREAD, 2, 1, 3);
        }
      });
    },
  });

  // Ceremony: a golden ritual chalice pours silver holy water into a consecration seal, then a blessing locks shut.
  FX.register('ceremony', {
    palette: GOLD,
    travel: 120,
    beats: soft,
    end: end(930),
    ground(s) {
      const e = s.real(s.hits[0]);
      if (e < 0 || e > 970) return;
      const p = feet(recipient(s));
      ring(p, 15, 8, GOLD, e < 100 ? 4 : 3, e > 760);
      ring(p, 10, 5, GOLD, 2, true, Math.floor(e / 140) % 3);
      if (e < 750)
        for (let i = 0; i < 4; i++)
          spark(add(p, Math.cos((i * Math.PI) / 2) * 14, Math.sin((i * Math.PI) / 2) * 7), GOLD);
    },
    air(s) {
      const hit = s.hits[0],
        e = s.real(hit),
        p = add(aim(s), 0, -13);
      if (e < 0 || e > 970) return;
      if (e < 640)
        show(
          icon(
            'chalice',
            ['444...444', '.4444444.', '.4333334.', '..43334..', '...434...', '...434...', '..44444..', '.4333334.'],
            GOLD,
          ),
          p,
        );
      if (e < 500)
        for (let i = 0; i < 5; i++) {
          const q = ((e + i * 65) % 340) / 340;
          pixel(add(p, 7 + Math.sin(q * Math.PI) * 3, -2 + q * 18), WATER, 4, 1);
        }
      k.drawHit(k.hitStyle('07:ceremony', GOLD, { S: 24, spikes: 4, jag: 0 }), p, e);
      k.shards(p, e, GOLD, seed(s), 5, 12);
      if (e >= 610 && e < 890) {
        ring(p, 8, 8, GOLD, 4);
        spark(p, GOLD);
      }
    },
  });

  // Comprehend Languages: a parchment scroll's jumbled runes resolve into orderly text beside the caster's ear.
  FX.register('comprehend-languages', {
    palette: GOLD,
    travel: 80,
    beats: beats(60, 'soft', 0),
    end: end(860),
    ground: s => groundSeal(s, GOLD, 11, true),
    air(s) {
      const hit = s.hits[0],
        e = s.real(hit),
        p = add(k.P(caster(s)), 8, -15);
      if (e < 0 || e > 900) return;
      const frame = Math.min(3, Math.floor(e / 150));
      const img = k.sprite(`07:scroll:${frame}`, 23, 19, GOLD, set => {
        for (let y = 3; y <= 15; y++) for (let x = 3; x <= 18; x++) set(x, y, x < 5 ? 2 : 4);
        for (let x = 2; x <= 20; x++) {
          set(x, 2, 3);
          set(x, 16, 3);
        }
        for (let row = 0; row < 3; row++)
          for (let x = 7; x <= 16; x++) {
            if (frame < 3 && (x + row) % 3 === 0) continue;
            set(x, 5 + row * 4 + (frame < 3 ? (x + frame + row) % 2 : 0), 1);
          }
      });
      if (e < 760) show(img, p);
      if (e < 450)
        for (let i = 0; i < 4; i++) {
          const a = (i * Math.PI) / 2 - e / 350;
          const r = 18 - e / 40;
          const q = add(p, Math.cos(a) * r, Math.sin(a) * r * 0.65);
          stroke([add(q, -2, -2), add(q, 2, -2), add(q, -1, 2), add(q, 2, 2)], GOLD, 3, 1, 8);
        }
      orbitSparks(s, p, GOLD, e, 4);
      if (e >= 480 && e < 720) spark(add(p, -15, 2), GOLD);
      k.drawHit(k.hitStyle('07:comprehend', GOLD, { S: 20, spikes: 4 }), p, e);
      k.shards(p, e, GOLD, seed(s), 4, 13);
    },
  });

  // Ice Knife: a faceted piercing dagger hits first, then detonates into the exact five-foot cold circle.
  FX.register('ice-knife', {
    palette: ICE,
    travel: 300,
    beats(event, kit, travel) {
      return [
        { at: kit.CAST + travel, stop: 65, target: event.targets?.[0] ?? null, kind: 'dart', power: 0.04 },
        ...(event.targets?.length ? event.targets : [null]).map(target => ({
          at: kit.CAST + travel + 120,
          stop: 110,
          target,
          kind: 'blast',
          power: 0.065,
        })),
      ];
    },
    end: end(720),
    ground(s) {
      const hit = s.hits[1],
        e = s.real(hit);
      if (e < 0 || e > 620) return;
      const C = centre(s),
        R = ((s.area?.feet || 5) / (s.grid.feet || 5)) * k.PX;
      const f = Math.min(7, Math.floor(e / 80));
      const r = Math.max(2, Math.round(R));
      const img = k.sprite(`07:ice-burst:${r}:${f}`, r * 2 + 6, r * 2 + 6, ICE, set => {
        for (let y = -r; y <= r; y++)
          for (let x = -r; x <= r; x++) {
            const d = Math.hypot(x, y) / r;
            if (d > 1) continue;
            const a = Math.atan2(y, x);
            const crack = Math.abs(Math.sin(a * 6 + d * 2)) < 0.18;
            if (f > 3 && !crack && Math.abs(d - 0.84) > 0.05) continue;
            if (f > 5 && ((x + y) & 3) > 1) continue;
            set(x + r + 3, y + r + 3, f === 0 ? 5 : crack ? 4 : f < 3 ? 2 + (d < 0.5 ? 1 : 0) : 1);
          }
      });
      show(img, C);
    },
    air(s) {
      const first = s.hits[0];
      shot(s, first, ICE, (p, angle) => {
        const blade = icon(
          'ice-knife',
          ['...........4..', '...2333444554.', '.223334444554.', '...2333444554.', '...........4..'],
          ICE,
        );
        k.blitRotated(blade, p.x, p.y, angle, 0.85);
      });
      mark(s, first, aim(s, first), ICE, 'knife-pierce', 24, 4, 12);
      const burst = s.hits[1],
        e = s.real(burst),
        C = centre(s);
      mark(s, burst, C, ICE, 'knife-burst', 40, 12, 25);
      s.hits.slice(1).forEach(hit => {
        if (hit.id != null)
          k.drawHit(k.hitStyle('07:knife-target', ICE, { S: 22, spikes: 6 }), aim(s, hit), s.real(hit));
      });
      if (e >= 60 && e < 420)
        for (let i = 0; i < 6; i++) {
          const a = (i * k.tau) / 6 + seed(s),
            q = k.ease(k.clamp(e / 360));
          const p = add(C, Math.cos(a) * q * 23, Math.sin(a) * q * 16 + q * q * 8);
          k.blitRotated(icon('ice-splinter', ['..4..', '.454.', '..3..', '..2..'], ICE), p.x, p.y, a);
        }
    },
  });

  // Cure Wounds: a luminous healing hand closes a red wound into green stitches and rising restorative crosses.
  FX.register('cure', {
    palette: HEAL,
    travel: 80,
    beats: beats(60, 'soft', 0),
    end: end(720),
    ground: s => groundSeal(s, HEAL),
    air(s) {
      s.hits.forEach(hit => {
        const e = s.real(hit),
          p = aim(s, hit);
        if (e < 0 || e > 760) return;
        if (e < 270) {
          const wound = ['#280e16', '#723044', '#af5564', '#e18c83', '#ffe1b5', '#ffffff'];
          const width = 6 * (1 - k.clamp(e / 260));
          stroke([add(p, -width, -3), add(p, width, 3)], wound, 3, 1, 12);
        }
        if (e < 390) {
          show(
            icon(
              'healing-hand',
              [
                '...4.4.4...',
                '...4.4.4.4.',
                '...4343434.',
                '.4.4333334.',
                '.443333334.',
                '..4333334..',
                '...43334...',
                '...43334...',
              ],
              HEAL,
            ),
            add(p, -5, 4),
          );
          for (let i = 0; i < 3; i++)
            if (e >= 60 + i * 70) stroke([add(p, -4 + i * 4, -3), add(p, -6 + i * 4, 2)], HEAL, 4, 1, 5);
        }
        k.drawHit(k.hitStyle('07:cure', HEAL, { S: 26, spikes: 4, jag: 0 }), p, e);
        k.shards(p, e, HEAL, seed(s), 6, 13);
        for (let i = 0; i < 3; i++) {
          const age = e - i * 110;
          if (age < 120 || age > 620) continue;
          const q = add(p, (i - 1) * 9, -age / 35);
          show(icon('healing-cross', ['.44.', '4554', '.44.'], HEAL), q);
        }
      });
    },
  });

  // Frost Fingers: five icy streams erupt from the hand, laying a fifteen-foot triangular fan of rime.
  FX.register('frost-fingers', {
    palette: ICE,
    travel: 160,
    beats: beats(105, 'blast', 0.065, true),
    end: end(650),
    ground(s) {
      const t = s.c.t - k.CAST,
        e = s.real(s.hits[0]);
      if (t < 0 || e > 660) return;
      const poly = areaPoints(s, 'cone', 15);
      const q = k.ease(k.clamp(t / 160));
      const fan = [
        poly[0],
        ...poly.slice(1).map(p => ({
          x: k.mix(poly[0].x, p.x, q),
          y: k.mix(poly[0].y, p.y, q),
        })),
      ];
      surface(fan, ICE, 'frost-cone', e < 0 ? 1 : e < 65 ? 0 : e < 220 ? 1 : e < 430 ? 2 : 3);
      if (e >= 0 && e < 480)
        for (let i = 0; i < 5; i++) {
          const u = (i + 0.5) / 5;
          const p = { x: k.mix(poly[1].x, poly[2].x, u), y: k.mix(poly[1].y, poly[2].y, u) };
          const q = { x: k.mix(poly[0].x, p.x, 0.7), y: k.mix(poly[0].y, p.y, 0.7) };
          spark(q, ICE);
        }
    },
    air(s) {
      const t = s.c.t - k.CAST;
      if (t < 0) return;
      const poly = areaPoints(s, 'cone', 15);
      if (t < 300)
        for (let i = 0; i < 5; i++) {
          const u = i / 4;
          const far = { x: k.mix(poly[1].x, poly[2].x, u), y: k.mix(poly[1].y, poly[2].y, u) };
          const q = k.clamp(t / 160),
            tail = Math.max(0, q - 0.3);
          const at = v => ({ x: k.mix(poly[0].x, far.x, v), y: k.mix(poly[0].y, far.y, v) });
          stroke([at(tail), at(q)], ICE, t < 180 ? 4 : 2, 1, 14);
        }
      s.hits.forEach(hit => mark(s, hit, hit.id == null ? centre(s) : aim(s, hit), ICE, 'fingers', 28, 5, 16));
    },
  });

  // Chaos Bolt: a tumbling eight-colour energy knot sheds unstable motes and resolves into one seeded damage colour.
  FX.register('chaos-bolt', {
    palette: event => CHAOS[Math.floor(k.hash(event.seed || 0, 71) * CHAOS.length)],
    travel: 340,
    beats: beats(110),
    end: end(520),
    air(s) {
      const hit = s.hits[0],
        resolved = s.ramp;
      shot(
        s,
        hit,
        resolved,
        (p, angle, q) => {
          const tick = Math.floor((s.c.t - k.CAST) / 55);
          const a = CHAOS[(Math.floor(k.hash(seed(s), 17) * 8) + tick) % 8];
          const b = CHAOS[(Math.floor(k.hash(seed(s), 17) * 8) + tick + 3) % 8];
          ball(p, 4, a, 2);
          ball(add(p, -2, -2), 2, a, 4);
          for (let i = 0; i < 3; i++) {
            const phase = q * 14 + (i * k.tau) / 3;
            pixel(add(p, Math.cos(phase) * 6, Math.sin(phase) * 4), i % 2 ? a : b, 3, 2);
          }
          stroke([add(p, -5, 3), add(p, 0, -3), add(p, 4, 2)], a, 5, 1, 12);
        },
        4,
      );
      const p = aim(s),
        e = s.real(hit);
      mark(s, hit, p, resolved, 'chaos', 40, 9, 25);
      if (e >= 60 && e < 440) {
        const r = 6 + k.ease(k.clamp(e / 360)) * 12;
        ring(p, r, r * 0.7, resolved, e < 200 ? 4 : 2, true, Math.floor(e / 80) % 3);
      }
    },
  });

  function detectionGround(s, ramp) {
    const e = s.real(s.hits[0]);
    if (e < 0 || e > 820) return;
    const p = feet(caster(s));
    for (let i = 0; i < 2; i++) {
      const age = e - i * 160;
      if (age < 0 || age > 620) continue;
      const q = age / 620;
      ring(p, 8 + k.ease(q) * 24, 4 + k.ease(q) * 12, ramp, age < 90 ? 4 : 2, age > 360);
    }
  }
  function detectionAir(s, mode, ramp) {
    const hit = s.hits[0],
      e = s.real(hit),
      p = add(k.P(caster(s)), 0, -15);
    if (e < 0 || e > 860) return;
    if (e < 720) {
      if (mode === 'magic') {
        show(icon('detect-eye', ['...33333...', '.334444433.', '34441514443', '.334444433.', '...33333...'], ramp), p);
        for (let i = 0; i < 3; i++) {
          const a = e / 450 + (i * k.tau) / 3;
          const q = add(p, Math.cos(a) * 14, Math.sin(a) * 7);
          const color = [FORCE, GOLD, DREAD][i];
          show(icon('magic-rune', ['.4.', '434', '.4.', '434', '.4.'], color), q);
        }
      } else if (mode === 'beings') {
        show(icon('presence-eye', ['..444..', '.43134.', '4315134', '.43134.', '..444..'], GOLD), p);
        const left = add(p, -12, -3),
          right = add(p, 12, -3);
        ring(add(left, 0, -4), 4, 2, GOLD, 4);
        stroke([add(left, -4, 0), add(left, 0, 3), add(left, 4, 0)], GOLD, 3, 1, 12);
        show(icon('presence-horns', ['3.....3', '.3...3.', '.23332.', '..141..', '..333..'], DREAD), right);
        if (e > 350) {
          skull(add(p, -9, 10), MAGIC, true);
          show(icon('presence-leaf', ['..3..', '.343.', '34343', '.343.', '..2..'], HEAL), add(p, 9, 10));
        }
      } else {
        show(
          icon('poison-drop', ['...4...', '...4...', '..343..', '.34433.', '3443332', '3433322', '.33222.'], SICK),
          add(p, -6, 0),
        );
        skull(add(p, 5, 1), SICK, true);
        for (let i = 0; i < 4; i++) {
          const a = (i * k.tau) / 4 + e / 700;
          const q = add(p, Math.cos(a) * 15, Math.sin(a) * 10);
          ball(q, 1, SICK, 3);
          pixel(add(q, Math.cos(a) * 3, Math.sin(a) * 3), SICK, 2);
        }
      }
    }
    k.drawHit(k.hitStyle(`07:detect-${mode}`, ramp, { S: 24, spikes: 4, jag: 0 }), p, e);
    k.shards(p, e, ramp, seed(s), 5, 13);
    // Brackets read as sensed presences; they never strike, mark alignment, or push a creature.
    if (e >= 230 && e < 720)
      s.targets.slice(0, 4).forEach(t => {
        const q = k.P(t);
        stroke([add(q, -7, -5), add(q, -10, -5), add(q, -10, 4)], ramp, 3, 1, 12);
        stroke([add(q, 7, -5), add(q, 10, -5), add(q, 10, 4)], ramp, 3, 1, 12);
      });
  }

  // Detect Evil and Good: a sacred sensing pulse reveals celestial, fiendish, undead and otherworldly presence motifs.
  FX.register('detect-evil-and-good', {
    palette: GOLD,
    travel: 100,
    beats: beats(55, 'soft', 0),
    end: end(820),
    ground: s => detectionGround(s, GOLD),
    air: s => detectionAir(s, 'beings', GOLD),
  });

  // Detect Magic: a lavender third eye scans outward while coloured school-like runes orbit its iris.
  FX.register('detectmagic', {
    palette: MAGIC,
    travel: 100,
    beats: beats(55, 'soft', 0),
    end: end(820),
    ground: s => detectionGround(s, MAGIC),
    air: s => detectionAir(s, 'magic', MAGIC),
  });

  // Detect Poison and Disease: olive sensing rings resolve into a venom droplet, a tiny skull and spore motes.
  FX.register('detect-poison-and-disease', {
    palette: SICK,
    travel: 100,
    beats: beats(55, 'soft', 0),
    end: end(820),
    ground: s => detectionGround(s, SICK),
    air: s => detectionAir(s, 'sickness', SICK),
  });

  function diskBase(s) {
    const b = caster(s),
      point = s.pose.target;
    return k.P(point && point.id == null && point.baseY == null ? point : { x: b.baseX + 0.9, y: b.baseY + 0.35 });
  }
  function disk(s, loop = false) {
    const hit = s.hits[0],
      e = loop ? 500 : s.real(hit);
    if (e < 0 || (!loop && s.c.t >= hit.at + 980)) return;
    const base = diskBase(s);
    const bob = Math.round(Math.sin(s.c.raw / 230));
    const p = add(base, 0, -Math.round(k.ease(k.clamp(e / 160)) * 10) + bob);
    ring(base, 5, 2, FORCE, 1, true);
    const img = k.sprite('07:tenser-disk', 15, 9, FORCE, set => {
      for (let y = -2; y <= 2; y++)
        for (let x = -5; x <= 5; x++) {
          const d = (x * x) / 25 + (y * y) / 4;
          if (d > 1) continue;
          const band = d > 0.7 ? 4 : y < 0 ? 3 : y > 0 ? 1 : 2;
          set(x + 7, y + 3, band);
          if (y >= 0 && d > 0.6) set(x + 7, y + 4, 1);
        }
      for (let x = 4; x <= 10; x += 3) {
        set(x, 2, 5);
      }
    });
    if (!loop || s.linger > 0.25) show(img, p);
    else ring(p, 5, 2, FORCE, 2, true);
    if (e < 300) {
      ring(p, 4 + e / 35, 2 + e / 90, FORCE, 4, e > 180);
      k.shards(p, e, FORCE, seed(s), 5, 12);
    }
  }

  // Tenser's Floating Disk: a three-foot blue force platter lifts clear of its shadow and settles into a gentle hover.
  FX.register('tensers-floating-disk', {
    palette: FORCE,
    travel: 120,
    beats: beats(60, 'soft', 0),
    end: end(980),
    ground(s) {
      disk(s);
    },
    air(s) {
      const e = s.real(s.hits[0]);
      const p = diskBase(s);
      k.drawHit(k.hitStyle('07:disk', FORCE, { S: 24, spikes: 4, jag: 0 }), add(p, 0, -10), e);
    },
    linger(s) {
      if (s.c.t >= s.hits[0].at + 980) disk(s, true);
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
