/* Pixel spells, batch 52: large silhouettes, held peaks, and calm lasting floor art. */
(function (root) {
  'use strict';
  const FX = root.BoardPixelFX;
  if (!FX) return;
  const k = FX.kit;
  const WATER = ['#081b36', '#16467b', '#298bc9', '#68d9ff', '#c5f5ff', '#ffffff'];
  const DREAM = ['#151935', '#30376f', '#626ab5', '#a3baff', '#e4ecff', '#ffffff'];
  const GOLD = ['#30200c', '#896022', '#dba43c', '#ffda70', '#fff4c6', '#ffffff'];
  const BLOOD = ['#2b071d', '#700d32', '#c8234b', '#ff4966', '#ffacb4', '#fff4ed'];
  const HEAL = ['#10291f', '#287b4c', '#58c77c', '#a1f6ab', '#e8ffcc', '#ffffff'];
  const WING = ['#172739', '#526d89', '#8facc5', '#c6e6f3', '#edfaff', '#ffffff'];
  const FIRE = ['#300f12', '#8a291d', '#dc4a22', '#ff8d35', '#ffdb8a', '#fff9e1'];
  const PURE = ['#132c42', '#3c6688', '#79b6d5', '#bfeaff', '#e7faff', '#ffffff'];
  const VIOLET = ['#220e36', '#53276d', '#9150bf', '#cc8dff', '#f0d2ff', '#ffffff'];
  const PINK = ['#35132b', '#842d65', '#cf559b', '#ff92cd', '#ffdbed', '#ffffff'];

  const alpha = (e, hold, end) => (e < 0 || e >= end ? 0 : 1 - k.clamp((e - hold) / (end - hold)));
  const targets = s =>
    s.targets.length
      ? s.targets
      : s.pose.base
        ? [
            {
              ...s.pose.base,
              y: s.pose.base.y - 0.55,
              baseX: s.pose.base.x,
              baseY: s.pose.base.y,
              id: null,
            },
          ]
        : [];
  const feet = t => k.P({ x: t.baseX ?? t.x, y: t.baseY ?? t.y + 0.55 });
  const caster = s =>
    s.pose.base ? k.P({ x: s.pose.base.x, y: s.pose.base.y - 0.55 }) : k.P(s.pose.hand || s.pose.target);
  const beat = (event, kit, travel, stop = 90, kind = 'soft') =>
    (event.targets?.length ? event.targets : [null]).map(target => ({
      at: kit.CAST + travel,
      stop,
      target,
      kind,
      power: kind === 'soft' ? 0 : 0.055,
    }));

  function image(name, w, h, ramp, paint) {
    return k.sprite('b52:' + name + ':' + ramp[3], w, h, ramp, paint);
  }
  function centered(img, x, y, a = 1) {
    k.blit(img, x - img.width / 2, y - img.height / 2, a);
  }
  function rows(name, pattern, ramp, scale = 1) {
    return image(
      name + ':' + scale,
      Math.ceil(pattern[0].length * scale) + 2,
      Math.ceil(pattern.length * scale) + 2,
      ramp,
      set => {
        pattern.forEach((row, y) =>
          [...row].forEach((ch, x) => {
            if (ch === '.') return;
            for (let yy = Math.floor(y * scale); yy < Math.ceil((y + 1) * scale); yy++)
              for (let xx = Math.floor(x * scale); xx < Math.ceil((x + 1) * scale); xx++)
                set(xx + 1, yy + 1, Number(ch));
          }),
        );
      },
    );
  }
  function ring(ramp, rx, ry, width = 2) {
    rx = Math.max(2, Math.round(rx));
    ry = Math.max(2, Math.round(ry));
    return image('ring:' + rx + ':' + ry + ':' + width, rx * 2 + 7, ry * 2 + 7, ramp, set => {
      for (let y = -ry - 1; y <= ry + 1; y++)
        for (let x = -rx - 1; x <= rx + 1; x++) {
          const d = Math.hypot(x / rx, y / ry);
          const edge = (1 - d) * Math.min(rx, ry);
          if (edge >= 0 && edge < width) set(x + rx + 3, y + ry + 3, edge < 0.8 ? 4 : 3);
        }
    });
  }
  function glow(ramp, rx = 15, ry = 11) {
    return image('glow:' + rx + ':' + ry, rx * 2 + 5, ry * 2 + 5, ramp, set => {
      for (let y = -ry; y <= ry; y++)
        for (let x = -rx; x <= rx; x++) {
          const d = Math.hypot(x / rx, y / ry);
          if (d < 0.94 && (d < 0.65 || k.dith(x, y) > (d - 0.65) * 3))
            set(x + rx + 2, y + ry + 2, d < 0.4 ? 4 : d < 0.65 ? 3 : 2);
        }
    });
  }
  function spark(ramp) {
    return rows('spark', ['...4...', '...5...', '...5...', '4555554', '...5...', '...5...', '...4...'], ramp);
  }
  function sparkles(s, p, ramp, e, n = 7, radius = 18, a = 1) {
    if (e < 0 || a <= 0) return;
    for (let i = 0; i < n; i++) {
      const q = (e / 720 + k.hash(i, s.event.seed || 0)) % 1;
      const angle = k.hash(i, s.event.seed || 0, 8) * k.tau;
      centered(
        spark(ramp),
        p.x + Math.cos(angle) * radius * (0.5 + q * 0.5),
        p.y + Math.sin(angle) * radius * 0.5 - q * 10,
        a * (q < 0.8 ? 1 : 0.5),
      );
    }
  }
  function impact(s, t, ramp, name, size = 28) {
    const hit = s.hits.find(h => h.id === t.id) || s.hits[0];
    if (!hit) return;
    const e = s.real(hit);
    const p = k.P(t);
    k.drawHit(k.hitStyle('b52:' + name, ramp, { S: size, spikes: 4, minor: 4, jag: 0.1 }), p, e);
    k.shards(p, e, ramp, (s.event.seed || 0) + 52, 7, 18);
  }
  function floor(s, ramp, at, hold, end) {
    const e = s.c.t - at;
    const a = alpha(e, hold, end);
    if (!a) return;
    targets(s).forEach(t => {
      const f = feet(t);
      centered(glow(ramp), f.x, f.y - 2, a * 0.5);
      centered(ring(ramp, 10 + Math.round(3 * k.ease(k.clamp(e / 220))), 6, 2), f.x, f.y, a);
    });
  }
  function heart(ramp, scale = 1) {
    return rows(
      'heart',
      [
        '...4444...4444...',
        '..455554.455554..',
        '.455555545555554.',
        '.455555555555554.',
        '.455555555555554.',
        '.455555555555554.',
        '..4555555555554..',
        '..4555555555554..',
        '...45555555554...',
        '....455555554....',
        '.....4555554.....',
        '......45554......',
        '.......454.......',
      ],
      ramp,
      scale,
    );
  }
  function plus(ramp) {
    return image('heal-plus', 21, 21, ramp, set => {
      for (let y = 2; y < 19; y++)
        for (let x = 2; x < 19; x++) {
          if ((x >= 8 && x <= 12) || (y >= 8 && y <= 12)) set(x, y, x === 8 || x === 12 || y === 8 || y === 12 ? 3 : 5);
        }
    });
  }
  function bubble() {
    return image('bubble', 23, 23, WATER, set => {
      for (let y = 2; y < 21; y++)
        for (let x = 2; x < 21; x++) {
          const d = Math.hypot(x - 11, y - 11);
          if (d >= 6.8 && d <= 9) set(x, y, y < 10 ? 4 : 3);
          if ((x - 7) ** 2 + (y - 6) ** 2 < 5 && d < 8.5) set(x, y, 5);
          if (x >= 13 && x <= 16 && y === 16) set(x, y, 4);
        }
      // Three little circles inside the large ring make this a breathing-bubble glyph.
      for (const [cx, cy] of [
        [8, 12],
        [14, 10],
        [13, 15],
      ])
        for (let y = -1; y <= 1; y++) for (let x = -1; x <= 1; x++) if (x * x + y * y <= 1) set(cx + x, cy + y, 4);
    });
  }
  function moon() {
    return image('crescent', 21, 23, DREAM, set => {
      for (let y = 2; y < 21; y++)
        for (let x = 2; x < 19; x++) {
          if (Math.hypot(x - 10, y - 11) <= 9 && Math.hypot(x - 15, y - 7) > 8) set(x, y, x < 7 ? 5 : y > 15 ? 3 : 4);
        }
    });
  }
  function zed() {
    return image('sleep-z', 13, 15, DREAM, set => {
      for (let y = 2; y <= 12; y++)
        for (let x = 2; x <= 10; x++) {
          if (y <= 4 || y >= 10 || Math.abs(x - (12 - y * 0.75)) < 1.7) set(x, y, y < 5 ? 5 : 4);
        }
    });
  }
  function fangs() {
    return image('fangs', 25, 21, BLOOD, set => {
      for (let y = 3; y <= 7; y++) for (let x = 3; x <= 21; x++) set(x, y, y < 5 ? 3 : 4);
      for (let y = 6; y < 19; y++)
        for (const cx of [7, 17]) {
          const w = Math.max(0, 3 - Math.floor((y - 6) / 4));
          for (let x = cx - w; x <= cx + w; x++) set(x, y, x < cx ? 4 : 5);
        }
    });
  }
  function drop() {
    return image('blood-drop', 9, 11, BLOOD, set => {
      for (let y = 1; y <= 9; y++)
        for (let x = 1; x <= 7; x++) {
          const dx = x - 4;
          if (Math.abs(dx) <= Math.min(3, y * 0.5, (10 - y) * 1.4)) set(x, y, dx < 0 ? 4 : 3);
        }
    });
  }
  function ribbon(s, from, to, e, duration, reverse = false) {
    if (e < 0 || e >= duration) return;
    const A = reverse ? to : from;
    const B = reverse ? from : to;
    const dx = B.x - A.x,
      dy = B.y - A.y;
    const length = Math.hypot(dx, dy) || 1;
    const nx = -dy / length,
      ny = dx / length;
    const head = k.clamp(e / 210);
    const tail = k.clamp((e - duration + 180) / 180);
    const path = u => {
      const bend = Math.sin(u * Math.PI) * (8 + Math.sin(u * 8 - s.c.raw / 95) * 3);
      return { x: k.mix(A.x, B.x, u) + nx * bend, y: k.mix(A.y, B.y, u) + ny * bend };
    };
    const steps = Math.min(90, Math.max(12, Math.ceil(length / 2)));
    for (const [color, width] of [
      [BLOOD[0], 9],
      [BLOOD[2], 7],
      [BLOOD[3], 5],
      [BLOOD[4], 2],
    ]) {
      for (let i = 0; i <= steps; i++) {
        const u = i / steps;
        if (u < tail || u > head) continue;
        const p = path(u);
        k.dot(p.x, p.y, color, width);
      }
    }
    for (let i = 0; i < 8; i++) {
      const u = (e / 420 + i / 8) % 1;
      if (u < tail || u > head) continue;
      const p = path(u);
      centered(drop(), p.x, p.y);
    }
  }
  function featherWing(side, frame, fold) {
    return image('wing:' + side + ':' + frame + ':' + fold, 25, 28, WING, set => {
      const put = (x, y, c) => {
        const xx = Math.round(4 + (x - 4) * (0.25 + fold * 0.1875));
        set(side < 0 ? 24 - xx : xx, y, c);
      };
      const rise = [0, 2, 5, 2][frame];
      // Four broad, separate primaries, each at least three pixels thick.
      for (let f = 0; f < 5; f++) {
        const tipX = 20 - f * 2;
        const tipY = 3 + f * 4 + rise;
        const rootY = 18 + Math.floor(f / 2);
        for (let i = 0; i <= 20; i++) {
          const u = i / 20;
          const x = Math.round(k.mix(4, tipX, u));
          const y = Math.round(k.mix(rootY, tipY, u) - Math.sin(u * Math.PI) * 2);
          const w = u < 0.8 ? 2 : 1;
          for (let oy = -w; oy <= w; oy++)
            for (let ox = -1; ox <= 1; ox++) put(x + ox, y + oy, oy < 0 ? 5 : f % 2 ? 4 : 3);
        }
      }
      for (let y = 15; y <= 23; y++)
        for (let x = 2; x <= 9; x++) if (Math.hypot((x - 5) / 4, (y - 19) / 5) < 1) put(x, y, x < 5 ? 4 : 5);
    });
  }
  function flame(frame) {
    return image('flame:' + frame, 13, 21, FIRE, set => {
      for (let y = 2; y < 19; y++)
        for (let x = 2; x < 11; x++) {
          const cx = 6 + Math.round(Math.sin(y / 4 + frame * 1.5));
          const w = y < 7 ? 1 : y < 12 ? 2 : y < 17 ? 4 : 3;
          if (Math.abs(x - cx) <= w) set(x, y, y > 10 && Math.abs(x - 6) < 2 ? 5 : x < cx ? 4 : 3);
        }
    });
  }
  function footprint(side) {
    return image('footprint:' + side, 11, 17, FIRE, set => {
      for (let y = 2; y <= 14; y++)
        for (let x = 2; x <= 8; x++) {
          const cx = 5 + (y < 7 ? side : 0);
          if ((y < 9 && Math.abs(x - cx) < 3) || (y > 10 && Math.abs(x - 5) < 2))
            set(x, y, Math.abs(x - cx) < 1.5 ? 5 : 3);
        }
    });
  }
  function leaf() {
    return image('life-leaf', 11, 11, HEAL, set => {
      for (let y = 2; y < 9; y++)
        for (let x = 2; x < 9; x++) {
          if ((x - 5) ** 2 + (y - 5) ** 2 < 15 && Math.abs(x + y - 10) < 4) set(x, y, x === y ? 5 : x < y ? 4 : 3);
        }
    });
  }
  function auraGeometry(s, fallback) {
    const a = s.area;
    const p = a ? k.P(a) : s.pose.base ? k.P(s.pose.base) : caster(s);
    return { p, radius: Math.max(4, Math.round(((a?.feet ?? fallback) / (s.grid.feet || 5)) * k.PX)) };
  }
  function auraFloor(s, ramp, living, strength, growth = 1) {
    if (strength <= 0) return;
    const { p, radius } = auraGeometry(s, 30);
    const r = Math.max(5, Math.round(radius * growth));
    centered(glow(ramp, r, r), p.x, p.y, strength * 0.25);
    // Full circular template radius, with a three-pixel pale band and dark inner/outer rims.
    centered(ring(ramp, r, r, 3), p.x, p.y, strength);
    const C = s.pose.base ? k.P(s.pose.base) : p;
    centered(glow(ramp, 19, 15), C.x, C.y - 3, strength * 0.75);
    const pulse = (s.c.raw / 2100) % 1;
    centered(
      ring(ramp, 12 + Math.floor(pulse * 7), 8 + Math.floor(pulse * 4), 2),
      C.x,
      C.y,
      strength * (1 - pulse * 0.5),
    );
    centered(ring(ramp, 9, 6, 2), C.x, C.y, strength);
    for (let i = 0; i < 14; i++) {
      const q = (s.c.raw / 3500 + k.hash(i, s.event.seed || 0)) % 1;
      const a = k.hash(i, s.event.seed || 0, 2) * k.tau;
      const d = Math.sqrt(k.hash(i, s.event.seed || 0, 3)) * r * 0.86;
      const x = p.x + Math.cos(a) * d;
      const y = p.y + Math.sin(a) * d - q * 6;
      centered(living && i % 2 ? leaf() : spark(ramp), x, y, strength * (q > 0.85 ? 0.5 : 1));
    }
  }
  function auraAir(s, ramp, name) {
    const e = s.c.t - k.CAST;
    if (e < 0 || e >= 1000) return;
    const C = caster(s);
    const a = alpha(e, 650, 1000);
    const t = { x: C.x, y: C.y };
    const hit = s.hits[0];
    if (hit) {
      k.drawHit(k.hitStyle('b52:' + name, ramp, { S: 36, spikes: 6, jag: 0.1 }), t, s.real(hit));
      k.shards(t, s.real(hit), ramp, s.event.seed || 0, 8, 22);
    }
    centered(ring(ramp, 13, 17, 2), C.x, C.y - 2, a);
    sparkles(s, C, ramp, e, 5, 21, a);
  }
  function chest(open, sink = 0) {
    return image('secret-chest:' + open + ':' + sink, 29, 29, GOLD, paint => {
      const set = (x, y, c) => {
        if (y < 29 - sink) paint(x, y, c);
      };
      for (let y = 13; y <= 24; y++)
        for (let x = 3; x <= 25; x++) {
          let c = y < 16 ? 2 : 1;
          if (x <= 5 || x >= 23 || y === 13 || y >= 23 || x === 10 || x === 18) c = 3;
          if (x === 4 || x === 24 || y === 13 || y === 23) c = 4;
          if ((y === 16 || y === 21) && (x === 7 || x === 21)) c = 5;
          set(x, y, c);
        }
      for (let y = open ? 3 : 9; y <= (open ? 10 : 14); y++)
        for (let x = 3; x <= 25; x++) {
          const edge = y === (open ? 3 : 9) || y === (open ? 10 : 14) || x < 6 || x > 22;
          set(x, y, edge ? 4 : x === 10 || x === 18 ? 3 : 2);
        }
      if (open) for (let x = 5; x < 24; x++) set(x, 12, 1);
      for (let y = 14; y <= 18; y++) for (let x = 12; x <= 16; x++) set(x, y, x === 14 && y > 15 ? 1 : 5);
      for (const x of [5, 23]) for (let y = 25; y <= 26; y++) set(x, y, 4);
    });
  }
  function ankh() {
    return image('ankh', 23, 29, GOLD, set => {
      for (let y = 2; y < 27; y++)
        for (let x = 2; x < 21; x++) {
          const d = Math.hypot((x - 11) / 5, (y - 8) / 6);
          if (
            (d <= 1 && d >= 0.5) ||
            (x >= 9 && x <= 13 && y >= 12 && y <= 26) ||
            (x >= 3 && x <= 19 && y >= 14 && y <= 18)
          )
            set(x, y, x === 10 || y === 15 || (d > 0.72 && x < 12) ? 5 : x > 12 ? 3 : 4);
        }
    });
  }
  function crown() {
    return image('charm-crown', 21, 13, GOLD, set => {
      for (let y = 2; y <= 10; y++)
        for (let x = 2; x <= 18; x++) {
          const tip = x < 5 || x > 15 ? 3 : Math.abs(x - 10) < 2 ? 1 : 7;
          if (y >= tip) set(x, y, y === 10 ? 3 : y === 8 || x === 10 ? 5 : 4);
        }
    });
  }
  function charmSpiral(phase, extent) {
    return image('charm-spiral:' + phase + ':' + extent, 45, 55, PINK, set => {
      for (const [color, width] of [
        [3, 4],
        [4, 2],
      ])
        for (let i = 0; i <= 64; i++) {
          const q = i / 64;
          if (q > extent / 4) continue;
          const angle = q * k.tau * 2 - (phase / 16) * k.tau;
          const radius = 17 - q * 4;
          const x = Math.round(22 + Math.cos(angle) * radius);
          const y = Math.round(27 + 13 - q * 30 + Math.sin(angle) * 5);
          for (let yy = 0; yy < width; yy++)
            for (let xx = 0; xx < width; xx++) set(x + xx - width / 2, y + yy - width / 2, color);
        }
    });
  }

  // Water Breathing: luminous head-sized bubble glyphs lift through a blue breathing shimmer.
  FX.register('water-breathing', {
    palette: WATER,
    travel: 210,
    beats: (event, kit, travel) => beat(event, kit, travel, 90),
    end: () => 1320,
    ground: s => floor(s, WATER, k.CAST, 650, 1020),
    air(s) {
      const e = s.c.t - k.CAST;
      const a = alpha(e, 650, 1020);
      if (!a) return;
      targets(s).forEach(t => {
        const p = k.P(t);
        impact(s, t, WATER, 'breathing');
        centered(ring(WATER, 11, 16, 2), p.x, p.y, a * 0.75);
        const rise = e < 210 ? k.mix(8, -12, k.ease(e / 210)) : -12 - k.clamp((e - 560) / 460) * 10;
        centered(bubble(), p.x, p.y + rise, a);
        for (let i = 0; i < 3; i++) {
          const q = (e / 780 + i / 3) % 1;
          centered(ring(WATER, 4, 4, 2), p.x + (i % 2 ? -12 : 12), p.y + 8 - q * 30, a * 0.75);
        }
        sparkles(s, p, WATER, e, 3, 13, a);
      });
    },
  });

  // Revivify: a descending gold-white pillar, a huge pulsing heart, and an ascending gold figure.
  FX.register('revivify', {
    palette: GOLD,
    travel: 250,
    beats: (event, kit, travel) => beat(event, kit, travel, 180),
    end: () => 1600,
    flash: (event, e) => (e < 35 ? { color: GOLD[5], alpha: 0.25 } : e < 70 ? { color: GOLD[0], alpha: 0.12 } : null),
    ground(s) {
      const e = s.c.t - k.CAST;
      const a = alpha(e, 800, 1300);
      if (!a) return;
      targets(s).forEach(t => {
        const f = feet(t);
        const height = Math.max(4, Math.round(48 * k.clamp(e / 250)));
        const pillar = image('resurrection-column:' + height, 33, 55, GOLD, set => {
          for (let y = 3; y < 3 + height; y++)
            for (let x = 5; x <= 27; x++) {
              if (x < 8 || x > 24) set(x, y, 3);
              else if (x < 11 || x > 21) set(x, y, 4);
              else set(x, y, 5);
            }
        });
        k.blit(pillar, f.x - 16, f.y - 51, a * (e < 800 ? 0.75 : 0.5));
        centered(glow(GOLD, 24, 13), f.x, f.y, a * 0.75);
        centered(ring(GOLD, 19, 10, 3), f.x, f.y, a);
        // Drawn echo only: the board retains control of the actual creature token.
        if (e >= 250) {
          const ghost = image('rising-figure', 17, 27, GOLD, set => {
            for (let y = 2; y <= 24; y++)
              for (let x = 2; x <= 14; x++) {
                const head = (x - 8) ** 2 + (y - 5) ** 2 < 10;
                const torso = y >= 10 && y < 19 && Math.abs(x - 8) < 3;
                const arms = y >= 11 && y <= 14 && Math.abs(x - 8) <= 6;
                const legs = y >= 19 && y <= 24 && (x === 5 || x === 6 || x === 10 || x === 11);
                if (head || torso || arms || legs) set(x, y, x < 8 ? 5 : 3);
              }
          });
          k.blit(ghost, f.x - 8, f.y - 23 - k.ease(k.clamp((e - 250) / 600)) * 8, a * 0.75);
        }
      });
    },
    air(s) {
      const e = s.c.t - k.CAST;
      if (e < 200) return;
      const a = alpha(e, 850, 1300);
      targets(s).forEach(t => {
        const p = k.P(t);
        impact(s, t, GOLD, 'revivify', 44);
        const pulse = e >= 250 && Math.floor((e - 250) / 170) % 2 === 0;
        centered(heart(GOLD, pulse ? 1.5 : 1.25), p.x, p.y - 9 - (e > 800 ? (e - 800) / 60 : 0), a);
        if (e >= 250 && e < 850) centered(ring(GOLD, 14 + (Math.floor((e - 250) / 140) % 2), 12, 2), p.x, p.y - 9, a);
        sparkles(s, p, GOLD, e, 10, 25, a);
      });
    },
  });

  // Catnap: a broad blue drowsy cocoon, a luminous crescent, and large rising Z glyphs.
  FX.register('catnap', {
    palette: DREAM,
    travel: 220,
    beats: (event, kit, travel) => beat(event, kit, travel, 100),
    end: () => 1390,
    ground: s => floor(s, DREAM, k.CAST, 730, 1090),
    air(s) {
      const e = s.c.t - k.CAST;
      const a = alpha(e, 730, 1090);
      if (!a) return;
      targets(s).forEach(t => {
        const p = k.P(t);
        impact(s, t, DREAM, 'catnap', 24);
        centered(ring(DREAM, 13, 15, 2), p.x, p.y + 2, a * 0.5);
        const lift = e < 220 ? k.mix(7, -12, k.ease(e / 220)) : -12 - k.clamp((e - 700) / 390) * 7;
        centered(moon(), p.x - 5, p.y + lift, a);
        centered(zed(), p.x + 12, p.y + lift - 5, a);
        centered(zed(), p.x + 21, p.y + lift - 18, a * 0.75);
        sparkles(s, p, DREAM, e, 3, 19, a);
      });
    },
  });

  // Vampiric Touch: white fangs bite, then a thick crimson blood ribbon drains back to the caster.
  FX.register('vampiric-touch', {
    palette: BLOOD,
    travel: 170,
    beats: (event, kit, travel) => beat(event, kit, travel, 110, 'hit'),
    end: () => 1410,
    ground(s) {
      const e = s.c.t - k.CAST;
      if (e < 330) return;
      const C = caster(s);
      centered(glow(BLOOD, 19, 19), C.x, C.y, alpha(e, 820, 1110) * 0.75);
      const f = s.pose.base ? k.P(s.pose.base) : C;
      centered(ring(BLOOD, 13, 7, 2), f.x, f.y, alpha(e, 820, 1110));
    },
    air(s) {
      const e = s.c.t - k.CAST;
      if (e < 0) return;
      const H = s.pose.hand ? k.P(s.pose.hand) : caster(s);
      const C = caster(s);
      const t = targets(s)[0];
      if (!t) return;
      const T = k.P(t);
      if (e < 170) ribbon(s, H, T, e * 1.5, 300);
      impact(s, t, BLOOD, 'vampiric', 36);
      ribbon(s, C, T, e - 170, 760, true);
      if (e >= 170) centered(fangs(), T.x, T.y - 7, alpha(e - 170, 420, 650));
      if (e >= 360) {
        const a = alpha(e, 820, 1110);
        centered(ring(BLOOD, 12, 17, 2), C.x, C.y, a);
        sparkles(s, C, BLOOD, e, 6, 16, a);
      }
    },
  });

  // Life Transference: the caster's light drains away along a red life stream into a brilliant heal cross.
  FX.register('life-transference', {
    palette: BLOOD,
    travel: 330,
    beats: (event, kit, travel) => beat(event, kit, travel, 120),
    end: () => 1480,
    ground(s) {
      const e = s.c.t - k.CAST;
      if (e < 0) return;
      const C = caster(s);
      const a = alpha(e, 800, 1180);
      centered(glow(BLOOD, 15, 17), C.x, C.y, a * (e < 330 ? 0.5 : 0.25));
      floor(s, HEAL, k.CAST + 330, 500, 850);
    },
    air(s) {
      const e = s.c.t - k.CAST;
      if (e < 0) return;
      const C = caster(s);
      const t = targets(s)[0];
      if (!t) return;
      const T = k.P(t);
      const a = alpha(e, 820, 1180);
      // A sparse, outlined shadow veil dims the caster without altering its figure or state.
      const shade = image('spent-caster', 23, 31, BLOOD, set => {
        for (let y = 2; y < 29; y++)
          for (let x = 3; x < 20; x++)
            if (Math.hypot((x - 11) / 9, (y - 15) / 14) < 1 && k.dith(x, y) < 0.55) set(x, y, 1);
      });
      centered(shade, C.x, C.y, a * (e >= 250 ? 0.5 : 0.25));
      ribbon(s, C, T, e, 900);
      if (e >= 330) {
        impact(s, t, HEAL, 'life-transfer', 36);
        centered(ring(HEAL, 14, 17, 2), T.x, T.y, a);
        centered(plus(HEAL), T.x, T.y - 5, a);
        sparkles(s, T, HEAL, e - 330, 8, 23, a);
      }
    },
  });

  // Fly: two square-sized white feathered wings unfold, flap once, and lift above a wind ring.
  FX.register('fly', {
    palette: WING,
    travel: 240,
    beats: (event, kit, travel) => beat(event, kit, travel, 100),
    end: () => 1430,
    ground(s) {
      const e = s.c.t - k.CAST;
      const a = alpha(e, 760, 1130);
      if (!a) return;
      targets(s).forEach(t => {
        const f = feet(t);
        centered(glow(WING, 19, 9), f.x, f.y, a * 0.5);
        centered(ring(WING, 17, 7, 2), f.x, f.y + 2, a);
        centered(ring(WING, 11, 4, 2), f.x, f.y + 1, a);
      });
    },
    air(s) {
      const e = s.c.t - k.CAST;
      const a = alpha(e, 760, 1130);
      if (!a) return;
      targets(s).forEach(t => {
        const p = k.P(t);
        impact(s, t, WING, 'fly');
        const unfold = k.ease(k.clamp(e / 240));
        const lift = k.ease(k.clamp((e - 240) / 450)) * 6;
        const frame = e < 430 ? 0 : e < 530 ? 1 : e < 650 ? 2 : e < 760 ? 3 : 0;
        for (const side of [-1, 1]) {
          const wing = featherWing(side, frame, Math.round(unfold * 4));
          const rootX = p.x + side * (3 + unfold * 3);
          k.blit(wing, rootX - (side < 0 ? 20 : 4), p.y - 19 - lift, a);
        }
        // Upward air streaks connect the lifting wings to the feet.
        if (e >= 240)
          for (const side of [-1, 1]) {
            const f = feet(t);
            centered(ring(WING, 3, 8, 2), p.x + side * 9, f.y - 5 - lift, a * 0.5);
          }
        sparkles(s, p, WING, e, 4, 24, a);
      });
    },
  });

  function strideFloor(s, strength, erupting) {
    if (strength <= 0) return;
    const { p, radius } = auraGeometry(s, 5);
    const C = s.pose.base ? k.P(s.pose.base) : p;
    centered(glow(FIRE, radius, radius), p.x, p.y, strength * 0.5);
    centered(ring(FIRE, radius, radius, 3), p.x, p.y, strength);
    for (const side of [-1, 1]) {
      centered(footprint(side), C.x + side * 5, C.y - 2, strength);
      centered(footprint(side), C.x + side * 7, C.y + 11, strength * 0.5);
    }
    const count = erupting ? 10 : 7;
    const phase = Math.floor(s.c.raw / (erupting ? 90 : 240)) % 4;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * k.tau;
      const x = p.x + Math.cos(a) * radius * 0.87;
      const y = p.y + Math.sin(a) * radius * 0.87;
      // All flames stay below figures; the wreath does not need an air linger layer.
      centered(flame((phase + i) % 4), x, y - (erupting ? 5 : 1), strength * (erupting ? 1 : 0.75));
    }
  }

  // Ashardalon's Stride: blazing soles stamp into an orange-white wreath; the footprints keep smouldering.
  FX.register('ashardalons-stride', {
    palette: FIRE,
    travel: 180,
    beats: (event, kit, travel) => beat(event, kit, travel, 100),
    end: () => 1270,
    reach: (event, grid) => ({ r: (event.area?.feet || 5) / (grid.feet || 5) + 1.5, up: 1.5 }),
    ground(s) {
      const e = s.c.t - k.CAST;
      const a = alpha(e, 560, 970);
      if (a) strideFloor(s, a, true);
    },
    air(s) {
      const e = s.c.t - k.CAST - 180;
      const hit = s.hits[0];
      if (e < 0 || !hit) return;
      const C = s.pose.base ? k.P(s.pose.base) : caster(s);
      k.drawHit(k.hitStyle('b52:stride', FIRE, { S: 34, spikes: 7, jag: 0.2 }), C, s.real(hit));
      k.shards(C, s.real(hit), FIRE, s.event.seed || 0, 10, 24);
    },
    linger(s) {
      const fadeIn = k.clamp((s.c.t - k.CAST - 180) / 400);
      strideFloor(s, s.linger * (0.5 + 0.5 * fadeIn), false);
    },
  });

  // Aura of Purity: a substantial blue-white 30-foot perimeter and a luminous pulse at the caster's feet.
  FX.register('aura-of-purity', {
    palette: PURE,
    travel: 260,
    beats: (event, kit, travel) => beat(event, kit, travel, 100),
    end: () => 1300,
    reach: (event, grid) => ({ r: (event.area?.feet || 30) / (grid.feet || 5) + 1, up: 1 }),
    ground(s) {
      const e = s.c.t - k.CAST;
      if (e >= 0) auraFloor(s, PURE, false, alpha(e, 600, 1000), 0.12 + 0.88 * k.ease(k.clamp(e / 260)));
    },
    air: s => auraAir(s, PURE, 'purity'),
    linger(s) {
      auraFloor(s, PURE, false, s.linger);
    },
  });

  // Aura of Life: a bright green-white 30-foot ring, rising leaves, and a strong living pulse at its centre.
  FX.register('aura-of-life', {
    palette: HEAL,
    travel: 260,
    beats: (event, kit, travel) => beat(event, kit, travel, 100),
    end: () => 1300,
    reach: (event, grid) => ({ r: (event.area?.feet || 30) / (grid.feet || 5) + 1, up: 1 }),
    ground(s) {
      const e = s.c.t - k.CAST;
      if (e >= 0) auraFloor(s, HEAL, true, alpha(e, 600, 1000), 0.12 + 0.88 * k.ease(k.clamp(e / 260)));
    },
    air(s) {
      auraAir(s, HEAL, 'life-aura');
      const e = s.c.t - k.CAST;
      if (e >= 260 && e < 1000) {
        const C = caster(s);
        centered(plus(HEAL), C.x, C.y - 7, alpha(e, 600, 1000));
      }
    },
    linger(s) {
      auraFloor(s, HEAL, true, s.linger);
    },
  });

  // Leomund's Secret Chest: a large gold-trimmed coffer snaps shut and sinks, row by row, into violet space.
  FX.register('leomunds-secret-chest', {
    palette: VIOLET,
    travel: 360,
    beats: (event, kit, travel) => beat(event, kit, travel, 120),
    end: () => 1550,
    ground(s) {
      const e = s.c.t - k.CAST;
      if (e < 0 || e >= 1250) return;
      const t = targets(s)[0];
      if (!t) return;
      const f = feet(t);
      const a = alpha(e, 1000, 1250);
      centered(glow(VIOLET, 24, 11), f.x, f.y, a * 0.75);
      centered(ring(VIOLET, 21, 9, 3), f.x, f.y, a);
      centered(ring(VIOLET, 15, 5, 2), f.x, f.y, a);
    },
    air(s) {
      const e = s.c.t - k.CAST;
      if (e < 0 || e >= 1250) return;
      const t = targets(s)[0];
      if (!t) return;
      const f = feet(t);
      const hit = s.hits[0];
      if (hit) {
        k.drawHit(
          k.hitStyle('b52:chest-latch', GOLD, { S: 26, spikes: 4, jag: 0.1 }),
          { x: f.x, y: f.y - 11 },
          s.real(hit),
        );
        k.shards({ x: f.x, y: f.y - 11 }, s.real(hit), GOLD, s.event.seed || 0, 7, 18);
      }
      const sink = Math.floor(k.ease(k.clamp((e - 680) / 420)) * 29);
      const open = e < 360;
      const lift = e < 180 ? 9 * (1 - k.ease(e / 180)) : 0;
      k.blit(chest(open, sink), f.x - 14, f.y - 27 + sink - lift);
      // Foreground half-rim occludes the coffer's lowest row at the portal plane.
      const lip = image('portal-lip', 49, 15, VIOLET, set => {
        for (let x = 3; x < 46; x++) {
          const q = (x - 24) / 21;
          const y = Math.round(Math.sqrt(Math.max(0, 1 - q * q)) * 7) + 2;
          set(x, y, 4);
          set(x, y + 1, 3);
        }
      });
      k.blit(lip, f.x - 24, f.y - 2, alpha(e, 1000, 1250));
      sparkles(s, { x: f.x, y: f.y - 12 }, VIOLET, e, 6, 26, alpha(e, 950, 1250));
    },
  });

  // Death Ward: an enormous gold-white ankh seals onto the body inside a bright protective halo.
  FX.register('death-ward', {
    palette: GOLD,
    travel: 230,
    beats: (event, kit, travel) => beat(event, kit, travel, 120),
    end: () => 1400,
    ground: s => floor(s, GOLD, k.CAST, 720, 1100),
    air(s) {
      const e = s.c.t - k.CAST;
      const a = alpha(e, 720, 1100);
      if (!a) return;
      targets(s).forEach(t => {
        const p = k.P(t);
        impact(s, t, GOLD, 'death-ward', 36);
        const y = p.y - 4 - (e < 230 ? 14 * (1 - k.ease(e / 230)) : 0);
        centered(ring(GOLD, 16, 19, 3), p.x, p.y - 4, a);
        centered(ankh(), p.x, y, a);
        centered(ring(GOLD, 13, 5, 2), p.x, p.y - 24, a);
        sparkles(s, p, GOLD, e, 6, 22, a);
      });
    },
  });

  // Charm Monster: a broad pink spiral embraces the body and crowns a large luminous heart.
  FX.register('charm-monster', {
    palette: PINK,
    travel: 260,
    beats: (event, kit, travel) => beat(event, kit, travel, 100),
    end: () => 1450,
    ground: s => floor(s, PINK, k.CAST, 760, 1150),
    air(s) {
      const e = s.c.t - k.CAST;
      const a = alpha(e, 760, 1150);
      if (!a) return;
      targets(s).forEach(t => {
        const p = k.P(t);
        impact(s, t, PINK, 'charm', 30);
        const reach = k.ease(k.clamp(e / 260));
        const phase = Math.floor((s.c.t / 420 / k.tau) * 16) % 16;
        centered(charmSpiral(phase, Math.ceil(reach * 4)), p.x, p.y, a);
        if (e >= 200) {
          const lift = e < 260 ? 5 * (1 - k.ease((e - 200) / 60)) : 0;
          centered(heart(PINK), p.x, p.y - 12 + lift, a);
          centered(crown(), p.x, p.y - 25 + lift, a);
        }
        sparkles(s, p, PINK, e, 8, 25, a);
      });
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
