/* Pixel spells, batch 61: second-pass readability rebuilds for five archetype fallbacks and six iconic spells. */
(function (root) {
  'use strict';
  const FX = root.BoardPixelFX;
  if (!FX) return;
  const k = FX.kit;

  // High-contrast 6-step ramps: [outline, deep, mid, bright, pale, white]
  const GOLD = ['#2a1a06', '#8a5a12', '#e0a02a', '#ffd76a', '#fff6cf', '#ffffff'];
  const THUNDER = ['#101a2a', '#2e4e7a', '#5f94cc', '#a8d6f8', '#e6f5ff', '#ffffff'];
  const GREASE = ['#0e0a04', '#23190a', '#4a3412', '#8f651e', '#e8c45a', '#fff6cc'];
  const NECRO = ['#0c1a0e', '#265c2e', '#4ea848', '#9be868', '#e0ffbe', '#ffffff'];
  const WARD = ['#121d2e', '#2e5580', '#5c9ad6', '#a8dbff', '#e8f7ff', '#ffffff'];

  function steps(ramp) {
    const r = ramp && ramp.length >= 5 ? ramp : GOLD;
    return {
      o: r[0],
      d: r[1],
      m: r[2],
      b: r[3],
      p: r[r.length - 2] || r[4],
      w: r[r.length - 1] || k.WHITE,
      key: r[0] + r[3],
      pal: [r[0], r[1], r[2], r[3], r[r.length - 2] || r[4], r[r.length - 1] || k.WHITE],
    };
  }

  function unitTargets(s) {
    if (s.targets && s.targets.length) return s.targets;
    if (s.pose?.target)
      return [{ ...s.pose.target, baseX: s.pose.target.x, baseY: s.pose.target.y, span: 1, id: null }];
    if (s.pose?.base)
      return [
        {
          x: s.pose.base.x,
          y: s.pose.base.y - 0.62,
          baseX: s.pose.base.x,
          baseY: s.pose.base.y,
          span: s.pose.base.span || 1,
          id: null,
        },
      ];
    return [];
  }

  function footOf(t) {
    return { x: t.baseX ?? t.x, y: t.baseY ?? t.y + 0.62 };
  }

  function drawLine(x0, y0, x1, y1, color, size = 1, step = 1) {
    const dx = x1 - x0,
      dy = y1 - y0;
    const n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / step));
    for (let i = 0; i <= n; i++) {
      const q = i / n;
      k.dot(x0 + dx * q, y0 + dy * q, color, size);
    }
  }

  function outlinedLine(x0, y0, x1, y1, outline, fill, size = 2, step = 1.5) {
    drawLine(x0, y0, x1, y1, outline, size + 2, step);
    drawLine(x0, y0, x1, y1, fill, size, step);
  }

  function footRing(basePt, span, rxMul, col, alpha) {
    if (alpha <= 0) return;
    const c = k.P(basePt);
    const rx = Math.max(9, (span || 1) * 10.5) * rxMul;
    const ry = rx * 0.54;
    const gap = alpha < 0.45 ? 10 : alpha < 0.75 ? 16 : 0;
    k.ellipse(c.x, c.y + 1, rx, ry, col.o, 3, gap);
    k.ellipse(c.x, c.y, rx, ry, alpha > 0.65 ? col.p : col.b, alpha > 0.5 ? 2 : 1, gap);
  }

  function sparkle(x, y, col, r = 2, white = true) {
    k.dot(x, y, col.o, 3);
    if (r >= 2) {
      k.dot(x - r, y, col.o, 2);
      k.dot(x + r, y, col.o, 2);
      k.dot(x, y - r, col.o, 2);
      k.dot(x, y + r, col.o, 2);
    }
    k.dot(x, y, white ? col.w : col.p, 1);
    if (r >= 2) {
      k.dot(x - 1, y, col.p, 1);
      k.dot(x + 1, y, col.p, 1);
      k.dot(x, y - 1, col.p, 1);
      k.dot(x, y + 1, col.p, 1);
    }
  }

  // Cube geometry from kit.outline(area, grid), with a safe fallback square if s.area is absent.
  function cubeGeom(s, fallbackCells = 3) {
    const gridFeet = s.grid?.feet || 5;
    let pts = s.area ? k.outline(s.area, s.grid) : [];
    let cells = s.area ? Math.max(1, Math.round((s.area.feet || fallbackCells * gridFeet) / gridFeet)) : fallbackCells;
    let p0, p1, p2, p3;
    if (pts && pts.length === 4) {
      p0 = { x: pts[0][0], y: pts[0][1] };
      p1 = { x: pts[1][0], y: pts[1][1] };
      p2 = { x: pts[2][0], y: pts[2][1] };
      p3 = { x: pts[3][0], y: pts[3][1] };
      const len = Math.hypot(p1.x - p0.x, p1.y - p0.y);
      if (len > 0.5) cells = Math.max(1, Math.round(len));
    } else {
      const ref = s.pose?.target || (s.targets?.[0] ? footOf(s.targets[0]) : s.pose?.base) || { x: 6, y: 4 };
      const h = cells / 2;
      p0 = { x: ref.x - h, y: ref.y - h };
      p1 = { x: ref.x + h, y: ref.y - h };
      p2 = { x: ref.x + h, y: ref.y + h };
      p3 = { x: ref.x - h, y: ref.y + h };
    }
    const gridAt = (u, v) => ({
      x: p0.x + (p1.x - p0.x) * u + (p3.x - p0.x) * v,
      y: p0.y + (p1.y - p0.y) * u + (p3.y - p0.y) * v,
    });
    const pxAt = (u, v) => k.P(gridAt(u, v));
    const corners = [k.P(p0), k.P(p1), k.P(p2), k.P(p3)];
    const center = pxAt(0.5, 0.5);
    const dir = Math.atan2(p1.y - p0.y, p1.x - p0.x);
    return { cells, p0, p1, p2, p3, corners, center, dir, gridAt, pxAt };
  }

  // ---------------------------------------------------------------- cached iconic sprites

  function buffGlyphSprite(col, flash) {
    const S = 20;
    return k.sprite(`b61:buff:${col.key}:${flash ? 1 : 0}`, S, S, col.pal, set => {
      const c = 9.5;
      // Bold 16 px diamond chevron crest with bright white core
      for (let y = 2; y < S - 2; y++)
        for (let x = 2; x < S - 2; x++) {
          const dx = Math.abs(x - c),
            dy = Math.abs(y - c);
          const m = dx + dy;
          if (m <= 7.6 && m >= 4.4) set(x, y, flash ? 5 : m < 5.6 ? 5 : 4);
          else if (m < 4.4) set(x, y, m < 2.3 ? 5 : flash ? 5 : 3);
        }
      // Upward empowerment chevron inside
      for (let i = -3; i <= 3; i++) {
        const y = Math.round(7 + Math.abs(i));
        set(Math.round(c + i), y, 5);
        set(Math.round(c + i), y + 1, 5);
      }
      // Four cardinal star tips
      for (let d = 7; d <= 8; d++) {
        set(9, 9 - d, 5);
        set(10, 9 - d, 5);
        set(9, 10 + d, 4);
        set(10, 10 + d, 4);
        set(9 - d, 9, 4);
        set(9 - d, 10, 4);
        set(10 + d, 9, 4);
        set(10 + d, 10, 4);
      }
    });
  }

  function healPlusSprite(col, flash) {
    const S = 20;
    return k.sprite(`b61:plus:${col.key}:${flash ? 1 : 0}`, S, S, col.pal, set => {
      // Whole-square (16x16 painted + 1px outline = 18x18 inside 20x20) bold plus sign
      for (let y = 2; y <= 17; y++)
        for (let x = 2; x <= 17; x++) {
          const inV = x >= 7 && x <= 12;
          const inH = y >= 7 && y <= 12;
          if (!inV && !inH) continue;
          const coreV = x >= 8 && x <= 11 && y >= 4 && y <= 15;
          const coreH = y >= 8 && y <= 11 && x >= 4 && x <= 15;
          const edge =
            x === 2 ||
            x === 17 ||
            y === 2 ||
            y === 17 ||
            (!inV && (y === 7 || y === 12)) ||
            (!inH && (x === 7 || x === 12));
          if (flash) set(x, y, 5);
          else if (coreV || coreH) set(x, y, 5);
          else if (edge) set(x, y, 3);
          else set(x, y, 4);
        }
    });
  }

  function healColumnSprite(col) {
    const W = 20,
      H = 30;
    return k.sprite(`b61:hcol:${col.key}`, W, H, col.pal, set => {
      for (let y = 2; y < H - 2; y++) {
        const ny = (y - 2) / (H - 4);
        for (let x = 2; x < W - 2; x++) {
          const dx = Math.abs(x + 0.5 - W / 2) / 8;
          if (dx > 1) continue;
          if (ny < 0.14 && k.dith(x, y) > ny / 0.14) continue;
          if (dx < 0.25) set(x, y, 5);
          else if (dx < 0.65) set(x, y, 4);
          else if (dx < 0.9 || (x + y) % 2 === 0) set(x, y, 3);
        }
      }
    });
  }

  function summonCreatureSprite(col, flash) {
    const W = 24,
      H = 24;
    return k.sprite(`b61:sum:${col.key}:${flash ? 1 : 0}`, W, H, col.pal, set => {
      const fill = (x0, y0, x1, y1, idx) => {
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, idx);
      };
      const body = flash ? 5 : 4;
      const shade = flash ? 4 : 3;
      // Horned spectral guardian / beast silhouette, a whole square+ tall (19 px tall)
      // Horns
      set(8, 3, 5);
      set(8, 4, 5);
      set(9, 4, body);
      set(15, 3, 5);
      set(15, 4, 5);
      set(14, 4, body);
      // Head
      fill(9, 5, 14, 9, body);
      fill(10, 5, 13, 6, 5);
      // Outstretched spectral wings / pauldrons
      fill(3, 8, 8, 12, body);
      fill(15, 8, 20, 12, body);
      fill(2, 9, 4, 14, shade);
      fill(19, 9, 21, 14, shade);
      set(3, 8, 5);
      set(4, 8, 5);
      set(19, 8, 5);
      set(20, 8, 5);
      // Torso
      fill(8, 10, 15, 16, body);
      fill(10, 10, 13, 14, 5);
      fill(8, 14, 15, 16, shade);
      // Legs / claws / wispy tail base
      fill(8, 17, 10, 21, shade);
      fill(13, 17, 15, 21, shade);
      set(9, 17, body);
      set(14, 17, body);
      // Glowing eyes framed by dark sockets so the face reads clearly
      if (!flash) {
        set(10, 6, 1);
        set(13, 6, 1);
        set(10, 7, 5);
        set(13, 7, 5);
        set(10, 8, 1);
        set(13, 8, 1);
      }
    });
  }

  function runeSprite(col, size, flash) {
    const S = size;
    return k.sprite(`b61:rune:${col.key}:${S}:${flash ? 1 : 0}`, S, S, col.pal, set => {
      const c = (S - 1) / 2;
      const r = S / 2 - 2.2;
      for (let y = 1; y < S - 1; y++)
        for (let x = 1; x < S - 1; x++) {
          const dx = Math.abs(x - c),
            dy = Math.abs(y - c);
          const d = dx + dy;
          const ring = Math.abs(d - r) <= 1.25;
          const barV = dx <= 0.8 && dy <= r;
          const barH = dy <= 0.8 && dx <= r * 0.72;
          if (ring || barV || barH) set(x, y, flash || (dx <= 1.5 && dy <= 1.5) ? 5 : ring ? 4 : 5);
        }
    });
  }

  function cubeTileSprite(col, bright) {
    const S = 18;
    return k.sprite(`b61:tile:${col.key}:${bright ? 1 : 0}`, S, S, col.pal, set => {
      for (let y = 1; y < S - 1; y++)
        for (let x = 1; x < S - 1; x++) {
          const edge = x === 1 || x === S - 2 || y === 1 || y === S - 2;
          const inner = x === 2 || x === S - 3 || y === 2 || y === S - 3;
          const diag = Math.abs(x - y) <= 1 && x >= 5 && x <= S - 6;
          if (edge) set(x, y, bright ? 5 : 4);
          else if (inner) set(x, y, bright ? 5 : 3);
          else if (diag) set(x, y, 5);
          else set(x, y, bright ? 4 : (x + y) % 2 === 0 ? 4 : 3);
        }
    });
  }

  function clockSprite(flash) {
    const S = 24;
    return k.sprite(`b61:clock:${flash ? 1 : 0}`, S, S, GOLD, set => {
      const c = 11.5;
      for (let y = 1; y < S - 1; y++)
        for (let x = 1; x < S - 1; x++) {
          const d = Math.hypot(x - c, y - c);
          if (d > 10.4) continue;
          if (d >= 8.3)
            set(x, y, 5); // bold 2 px white rim
          else if (d >= 7.1)
            set(x, y, 3); // gold inner bezel
          else if (d <= 1.7)
            set(x, y, 5); // bright center boss
          else set(x, y, flash ? 5 : d < 5.6 ? 4 : 3);
        }
      // 12, 3, 6, 9 o'clock cardinal markers
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2;
        set(Math.round(c + Math.cos(a) * 6.5), Math.round(c + Math.sin(a) * 6.5), 1);
        set(Math.round(c + Math.cos(a) * 5.5), Math.round(c + Math.sin(a) * 5.5), 5);
      }
    });
  }

  function afterimageSprite() {
    const W = 14,
      H = 20;
    return k.sprite('b61:hasteGhost', W, H, GOLD, set => {
      const fill = (x0, y0, x1, y1, idx) => {
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, idx);
      };
      // Running figure silhouette leaning forward (rightward)
      fill(6, 2, 10, 6, 4);
      fill(8, 2, 10, 4, 5);
      fill(4, 7, 10, 13, 4);
      fill(8, 7, 10, 12, 5);
      fill(2, 14, 6, 17, 3);
      fill(7, 14, 11, 17, 4);
      set(10, 14, 5);
      set(11, 15, 5);
    });
  }

  function greasePuddleSprite(W, H, stage, seed) {
    // stage 0..3 grows the glossy puddle organically to fill the full cube
    const scale = [0.42, 0.7, 0.92, 1.0][stage] || 1;
    return k.sprite(`b61:grease:${W}:${H}:${stage}:${seed % 4}`, W, H, GREASE, set => {
      const cx = W / 2,
        cy = H / 2;
      const rx = (W / 2 - 3) * scale,
        ry = (H / 2 - 3) * scale;
      for (let y = 2; y < H - 2; y++)
        for (let x = 2; x < W - 2; x++) {
          const nx = (x + 0.5 - cx) / Math.max(1, rx);
          const ny = (y + 0.5 - cy) / Math.max(1, ry);
          // Rounded-square (superellipse) with organic wet ripples so it fills the cube yet looks like liquid
          const sq = (Math.abs(nx) ** 3.2 + Math.abs(ny) ** 3.2) ** (1 / 3.2);
          const wobble = (k.noise(x / 6, y / 6, seed + 3) - 0.5) * 0.22;
          const d = sq + wobble;
          if (d > 1.0) continue;
          // Glossy black-amber oil bands
          const streak1 = Math.abs(nx * 0.7 + ny * 0.8 + 0.35);
          const streak2 = Math.abs(nx * 0.65 + ny * 0.75 - 0.38);
          const ring = Math.abs(d - 0.82);
          if (streak1 < 0.09 && d < 0.76)
            set(x, y, 5); // bold yellow-white specular highlight
          else if (streak1 < 0.16 && d < 0.82) set(x, y, 4);
          else if (streak2 < 0.06 && d < 0.68) set(x, y, 5);
          else if (streak2 < 0.12 && d < 0.74) set(x, y, 4);
          else if (ring < 0.07)
            set(x, y, nx + ny < 0 ? 4 : 3); // glossy wet rim reflection
          else if (d < 0.45 && k.noise(x / 5, y / 5, seed + 9) > 0.6) set(x, y, 3);
          else if (d < 0.72) set(x, y, 2);
          else set(x, y, 1);
        }
      // Small spilled oil beads near corners on full stages
      if (stage >= 2) {
        const beads = [
          [4, 4],
          [W - 5, 5],
          [5, H - 5],
          [W - 4, H - 4],
        ];
        for (const [bx, by] of beads) {
          set(bx, by, 4);
          set(bx + 1, by, 2);
          set(bx, by + 1, 2);
        }
      }
    });
  }

  function necroHandSprite(flash) {
    const S = 22;
    return k.sprite(`b61:hand:${flash ? 1 : 0}`, S, S, NECRO, set => {
      const fill = (x0, y0, x1, y1, idx) => {
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, idx);
      };
      const main = flash ? 5 : 4;
      const hi = 5;
      const edge = flash ? 4 : 3;
      // Whole-square splayed necrotic claw hand (18 px tall, 16 px wide)
      // Wrist & palm
      fill(7, 15, 14, 19, edge);
      fill(8, 15, 13, 18, main);
      fill(6, 9, 15, 15, main);
      fill(8, 10, 13, 14, hi); // glowing pale-white palm core
      // Thumb (left)
      fill(3, 11, 5, 14, main);
      set(3, 10, hi);
      set(4, 10, hi);
      // Four splayed fingers with sharp white claws
      // Index
      fill(5, 4, 6, 9, main);
      set(5, 3, hi);
      set(6, 4, hi);
      // Middle
      fill(8, 2, 10, 9, main);
      fill(9, 2, 9, 7, hi);
      // Ring
      fill(12, 3, 13, 9, main);
      set(12, 2, hi);
      set(13, 3, hi);
      // Pinky
      fill(15, 5, 17, 10, main);
      set(16, 4, hi);
      set(17, 5, hi);
      // Knuckle highlights
      set(6, 9, hi);
      set(9, 9, hi);
      set(12, 9, hi);
      set(15, 10, hi);
    });
  }

  function divineBladeSprite(flash) {
    const S = 24;
    return k.sprite(`b61:blade:${flash ? 1 : 0}`, S, S, GOLD, set => {
      // Whole-square+ diagonal radiant sword (top-right tip to bottom-left pommel)
      for (let i = 0; i <= 16; i++) {
        const x = 4 + i;
        const y = 19 - i;
        if (i >= 4) {
          // Broad glowing blade (3-4 px wide with bright white core)
          const tip = i >= 15;
          set(x, y, 5);
          if (!tip) {
            set(x - 1, y, flash ? 5 : 4);
            set(x, y + 1, flash ? 5 : 4);
            set(x + 1, y, flash ? 5 : 3);
            set(x, y - 1, flash ? 5 : 4);
          } else {
            set(x - 1, y, 5);
            set(x, y + 1, 5);
          }
        } else {
          // Hilt & pommel
          set(x, y, i === 0 ? 5 : 3);
          set(x + 1, y, 2);
          set(x, y - 1, 4);
        }
      }
      // Crossguard perpendicular at i=4 (x=8, y=15)
      for (let d = -4; d <= 4; d++) {
        const gx = 8 + d,
          gy = 15 + d;
        set(gx, gy, Math.abs(d) <= 1 ? 5 : 4);
        set(gx + 1, gy, 3);
        set(gx, gy - 1, flash ? 5 : 4);
      }
    });
  }

  function shieldGlyphSprite(flash) {
    const W = 20,
      H = 22;
    return k.sprite(`b61:shield:${flash ? 1 : 0}`, W, H, WARD, set => {
      // Whole-square kite/heater shield (16 wide x 18 tall + 1 px outline)
      const cx = 9.5;
      for (let y = 2; y <= 19; y++) {
        const ny = (y - 2) / 17;
        const half = ny < 0.45 ? 7.5 : 7.5 * (1 - ((ny - 0.45) / 0.55) ** 1.45);
        const minX = Math.ceil(cx - half);
        const maxX = Math.floor(cx + half);
        for (let x = minX; x <= maxX; x++) {
          const rim = y <= 3 || x <= minX + 1 || x >= maxX - 1 || y >= 18;
          const cross = Math.abs(x - cx) <= 1.1 || (y >= 7 && y <= 9 && Math.abs(x - cx) <= half - 2);
          if (flash) set(x, y, 5);
          else if (rim)
            set(x, y, 5); // crisp 2 px white rim
          else if (cross) set(x, y, 5);
          else if (ny < 0.5) set(x, y, 4);
          else set(x, y, 3);
        }
      }
    });
  }

  // ---------------------------------------------------------------- 1. kind:buff
  // Buff fallback: a pale 2 px light band rises up the figure, a whole-square glyph holds above the head, sparkles orbit, ring settles at feet.
  FX.register('kind:buff', {
    travel: 140,
    beats(event, kit, travel) {
      const list = event.targets?.length ? event.targets : [null];
      return list.map(target => ({ at: kit.CAST + travel, stop: 50, target, kind: 'soft', power: 0 }));
    },
    end: (event, travel) => k.CAST + travel + 900,
    ground(s) {
      const t = s.c.t - k.CAST;
      if (t < 0) return;
      const col = steps(s.ramp);
      const list = unitTargets(s);
      const alpha = t < 140 ? t / 140 : t < 780 ? 1 : k.clamp(1 - (t - 780) / 260);
      const pulse = t >= 140 && t < 320 ? 1 + 0.16 * Math.sin(((t - 140) / 180) * Math.PI) : 1;
      for (const trg of list) footRing(footOf(trg), trg.span || 1, pulse, col, alpha);
    },
    air(s) {
      const t = s.c.t - k.CAST;
      if (t < 0) return;
      const col = steps(s.ramp);
      const list = unitTargets(s);
      const hit = s.hits[0];
      const real = hit ? s.real(hit) : t - 140;
      for (let ti = 0; ti < list.length; ti++) {
        const trg = list[ti];
        const span = trg.span || 1;
        const F = k.P(footOf(trg));
        const B = k.P(trg);
        const headY = F.y - 22 * span;
        // Act 1: bright pale 2 px outlined band rises strictly up the body from feet to head
        if (t < 320) {
          const q = k.ease(k.clamp(t / 260));
          const by = k.mix(F.y, headY + 4, q);
          const halfW = 7.5 * span;
          outlinedLine(B.x - halfW, by, B.x + halfW, by, col.o, q < 0.8 ? col.w : col.p, 2, 1.5);
          k.dot(B.x - halfW, by, col.p, 2);
          k.dot(B.x + halfW, by, col.p, 2);
        }
        // Act 2 & 3: big whole-square glyph flashes just above the head and holds
        if (t >= 120) {
          const pop = k.clamp((t - 120) / 110);
          const fade = t < 680 ? 1 : k.clamp(1 - (t - 680) / 320);
          if (fade > 0) {
            const flash = real >= 0 && real < 90;
            const img = buffGlyphSprite(col, flash);
            const gy = headY - 6 - (1 - k.back(pop)) * 4;
            k.blit(img, B.x - img.width / 2, gy - img.height / 2, fade);
          }
        }
        // 5 sparkles orbiting strictly around the token (nothing drifts away)
        if (t >= 100 && t < 960) {
          const fade = t < 720 ? 1 : k.clamp(1 - (t - 720) / 240);
          const n = 5;
          for (let i = 0; i < n; i++) {
            if (fade < 0.5 && i % 2) continue;
            const a = (i / n) * k.tau + s.c.raw / 240 + ti * 1.1;
            const rx = (9.5 + (i % 2) * 1.5) * span;
            const ry = 6.5 * span;
            const sx = B.x + Math.cos(a) * rx;
            const sy = B.y + Math.sin(a) * ry + Math.sin(a * 2) * 2;
            sparkle(sx, sy, col, i % 2 === 0 ? 2 : 1, Math.floor(s.c.raw / 90 + i) % 2 === 0);
          }
        }
      }
    },
  });

  // ---------------------------------------------------------------- 2. kind:heal
  // Heal fallback: a square-wide green-gold column wraps each target, a whole-square outlined plus pops above the head and holds, motes rise, ring settles at feet.
  FX.register('kind:heal', {
    travel: 120,
    beats(event, kit, travel) {
      const list = event.targets?.length ? event.targets : [null];
      return list.map(target => ({ at: kit.CAST + travel, stop: 55, target, kind: 'soft', power: 0 }));
    },
    end: (event, travel) => k.CAST + travel + 940,
    ground(s) {
      const t = s.c.t - k.CAST;
      if (t < 0) return;
      const col = steps(s.ramp);
      const list = unitTargets(s);
      const colImg = healColumnSprite(col);
      for (const trg of list) {
        const span = trg.span || 1;
        const F = k.P(footOf(trg));
        const ringAlpha = t < 120 ? t / 120 : t < 780 ? 1 : k.clamp(1 - (t - 780) / 260);
        const pulse = t >= 120 && t < 380 ? 1 + 0.22 * Math.sin(((t - 120) / 260) * Math.PI) : 1;
        footRing(footOf(trg), span, pulse, col, ringAlpha);
        // Bright green-gold light column wrapping from feet to head
        const colAlpha = t < 120 ? k.ease(t / 120) : t < 640 ? 1 : k.clamp(1 - (t - 640) / 260);
        if (colAlpha > 0) k.blit(colImg, F.x - colImg.width / 2, F.y - colImg.height + 2, colAlpha * 0.75);
      }
    },
    air(s) {
      const t = s.c.t - k.CAST;
      if (t < 0) return;
      const col = steps(s.ramp);
      const list = unitTargets(s);
      const hit = s.hits[0];
      const real = hit ? s.real(hit) : t - 120;
      const seed = s.event.seed || 1;
      for (let ti = 0; ti < list.length; ti++) {
        const trg = list[ti];
        const span = trg.span || 1;
        const F = k.P(footOf(trg));
        const B = k.P(trg);
        const headY = F.y - 24 * span;
        // Front vertical wrap bars so the column visibly wraps the figure
        if (t < 720) {
          const a = t < 120 ? t / 120 : t < 520 ? 1 : k.clamp(1 - (t - 520) / 200);
          const scroll = (s.c.raw / 35) % 10;
          for (let side = -1; side <= 1; side += 2) {
            const x = B.x + side * 7 * span;
            for (let y = F.y - 2; y > F.y - 24 * span; y -= 5) {
              if (a < 0.5 && (y | 0) % 2) continue;
              const py = y - scroll * 0.4;
              k.dot(x, py, col.o, 3);
              k.dot(x, py, col.p, 1);
            }
          }
        }
        // Big outlined plus sign (whole square) pops above the head and holds
        if (t >= 90) {
          const pop = k.clamp((t - 90) / 110);
          const fade = t < 720 ? 1 : k.clamp(1 - (t - 720) / 300);
          if (fade > 0) {
            const flash = real >= 0 && real < 90;
            const img = healPlusSprite(col, flash);
            const py = headY - 4 - (1 - k.back(pop)) * 5;
            k.blit(img, B.x - img.width / 2, py - img.height / 2, fade);
          }
        }
        // Rising sparkle motes inside the column
        if (t < 960) {
          for (let i = 0; i < 7; i++) {
            const phase = (t / 650 + k.hash(i, seed + ti, 2)) % 1;
            if (t > 700 && phase < (t - 700) / 260) continue;
            const mx = B.x + (k.hash(i, seed + ti, 3) - 0.5) * 15 * span;
            const my = F.y - 2 - phase * 26 * span;
            sparkle(mx, my, col, i % 3 === 0 ? 2 : 1, i % 2 === 0);
          }
        }
      }
    },
  });

  // ---------------------------------------------------------------- 3. kind:summon
  // Summon fallback: two-square summoning circle with runes, white light pillar burst, smoke clears to a whole-square pale creature silhouette.
  FX.register('kind:summon', {
    travel: 220,
    beats: (event, kit, travel) => [
      { at: kit.CAST + travel, stop: 80, target: event.targets?.[0] ?? null, kind: 'soft', power: 0 },
    ],
    end: (event, travel) => k.CAST + travel + 1040,
    reach: () => ({ r: 2.3, up: 3.2 }),
    ground(s) {
      const t = s.c.t - k.CAST;
      if (t < 0) return;
      const col = steps(s.ramp);
      const pt = s.pose?.target || (s.targets?.[0] ? footOf(s.targets[0]) : s.pose?.base);
      if (!pt) return;
      const C = k.P(pt);
      const fade = t < 960 ? 1 : k.clamp(1 - (t - 960) / 300);
      if (fade <= 0) return;
      const grow = t < 160 ? 0.5 + 0.5 * k.ease(t / 160) : 1;
      // Bright summoning circle ~2 squares across (diameter 32 art px -> rx = 16)
      const rx = 16.5 * grow;
      const ry = 10 * grow;
      const spin = s.c.raw / 320;
      const gap = fade < 0.5 ? 10 : 0;
      // 2 px outlined outer ring
      k.ellipse(C.x, C.y + 1, rx, ry, col.o, 4, gap);
      k.ellipse(C.x, C.y, rx, ry, t >= 200 && t < 340 ? col.w : col.p, 2, gap);
      // Inner dashed arcane circle
      k.ellipse(C.x, C.y, rx * 0.72, ry * 0.72, col.o, 3, 8, spin);
      k.ellipse(C.x, C.y, rx * 0.72, ry * 0.72, col.b, 1, 8, spin);
      // 6 glowing rune pips around the rim
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * k.tau + spin * 0.35;
        const x = C.x + Math.cos(a) * rx * 0.86;
        const y = C.y + Math.sin(a) * ry * 0.86;
        k.dot(x, y, col.o, 4);
        k.dot(x, y, col.w, 2);
      }
      // Burst floor flash
      if (t >= 200 && t < 340) {
        k.disc(C.x, C.y, 11 * (1 - (t - 200) / 140), col.w);
      }
    },
    air(s) {
      const t = s.c.t - k.CAST;
      if (t < 180) return;
      const col = steps(s.ramp);
      const SMOKE = k.palettes?.SMOKE || ['#141011', '#2a2122', '#43383a', '#5f5250', '#80716a'];
      const pt = s.pose?.target || (s.targets?.[0] ? footOf(s.targets[0]) : s.pose?.base);
      if (!pt) return;
      const C = k.P(pt);
      const seed = s.event.seed || 5;
      // Act 2a: Pillar of white light bursts up from the circle
      if (t >= 180 && t < 540) {
        const q = (t - 180) / 360;
        const h = q < 0.2 ? k.ease(q / 0.2) * 44 : 44;
        const w = q < 0.25 ? 14 : Math.max(2, Math.round(14 * (1 - (q - 0.25) / 0.75)));
        for (let y = 0; y < h; y += 2) {
          k.dot(C.x, C.y - y, col.o, w + 4);
        }
        for (let y = 0; y < h; y += 2) {
          k.dot(C.x, C.y - y, col.p, w + 1);
          if (w >= 4) k.dot(C.x, C.y - y, col.w, Math.max(2, w - 3));
        }
      }
      // Act 2b: Big outlined creature silhouette (whole square+ tall) emerges and holds
      if (t >= 380) {
        const pop = k.clamp((t - 380) / 110);
        const fade = t < 960 ? 1 : k.clamp(1 - (t - 960) / 280);
        if (fade > 0) {
          const img = summonCreatureSprite(col, t < 470);
          const sy = C.y - img.height + 3 - (1 - k.back(pop)) * 5;
          k.blit(img, C.x - img.width / 2, sy, fade);
        }
      }
      // Act 2c: Smoke puff clears outward around the summoned silhouette
      if (t >= 300 && t < 740) {
        const q = (t - 300) / 440;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * k.tau + k.hash(i, seed, 1) * 0.4;
          const r = 4 + k.ease(q) * (14 + k.hash(i, seed, 2) * 6);
          const px = C.x + Math.cos(a) * r;
          const py = C.y - 8 + Math.sin(a) * r * 0.55 - q * 5;
          const rad = Math.max(1, (1 - q) * 4.5 + 1);
          if (q > 0.72 && i % 2) continue;
          k.disc(px, py, rad + 1, SMOKE[0]);
          k.disc(px, py, rad, i % 2 ? col.p : SMOKE[4]);
        }
      }
    },
  });

  // ---------------------------------------------------------------- 4. kind:utility
  // Utility fallback: half-square rune flares at caster, bright mote arcs to destination, whole-square sparkle ring + rune blooms and holds in place.
  FX.register('kind:utility', {
    travel: 260,
    beats: (event, kit, travel) => [
      { at: kit.CAST + travel, stop: 55, target: event.targets?.[0] ?? null, kind: 'soft', power: 0 },
    ],
    end: (event, travel) => k.CAST + travel + 860,
    ground(s) {
      const t = s.c.t - k.CAST;
      if (t < 240) return;
      const col = steps(s.ramp);
      const dest = s.targets?.[0] ? footOf(s.targets[0]) : s.pose?.target || s.pose?.base;
      if (!dest) return;
      const e = t - 240;
      const alpha = e < 100 ? e / 100 : e < 620 ? 1 : k.clamp(1 - (e - 620) / 260);
      footRing(dest, s.targets?.[0]?.span || 1, 0.95 + 0.1 * k.ease(k.clamp(e / 160)), col, alpha);
    },
    air(s) {
      const t = s.c.t - k.CAST;
      if (t < 0) return;
      const col = steps(s.ramp);
      const from = s.pose?.hand || (s.pose?.base ? { x: s.pose.base.x, y: s.pose.base.y - 0.7 } : null);
      const dest = s.targets?.[0]
        ? { x: s.targets[0].x, y: s.targets[0].y }
        : s.pose?.target || (s.pose?.base ? { x: s.pose.base.x, y: s.pose.base.y - 0.65 } : null);
      if (!dest) return;
      const H = from ? k.P(from) : k.P(dest);
      const D = k.P(dest);
      const arrive = 260;

      // Act 1a: Half-square (10x10) rune glyph flares at the caster
      if (from && t < 320) {
        const fade = t < 200 ? 1 : k.clamp(1 - (t - 200) / 120);
        const rImg = runeSprite(col, 10, t < 70);
        k.blit(rImg, H.x - rImg.width / 2, H.y - rImg.height / 2, fade);
      }

      // Act 1b: Bright mote arcs from caster to destination
      if (from && t < arrive) {
        const q = t / arrive;
        const at = u => ({
          x: k.mix(H.x, D.x, u),
          y: k.mix(H.y, D.y, u) - Math.sin(u * Math.PI) * 14,
        });
        for (let i = 7; i >= 1; i--) {
          const u = q - i * 0.04;
          if (u <= 0) continue;
          const p = at(u);
          k.dot(p.x, p.y, col.o, i < 4 ? 4 : 3);
          k.dot(p.x, p.y, i < 3 ? col.w : col.p, i < 4 ? 2 : 1);
        }
        const p = at(q);
        k.disc(p.x, p.y, 4, col.o);
        k.disc(p.x, p.y, 3, col.p);
        k.disc(p.x, p.y, 1.5, col.w);
        sparkle(p.x, p.y, col, 3, true);
      }

      // Act 2 & 3: Whole-square outlined sparkle ring + rune blooms at destination and holds in place
      if (t >= arrive - 10) {
        const e = Math.max(0, t - arrive);
        const pop = k.back(k.clamp(e / 100));
        const fade = e < 560 ? 1 : k.clamp(1 - (e - 560) / 290);
        if (fade > 0) {
          const rad = 9.5 * Math.min(1.12, pop); // diameter ~19 art px (> 1 whole square)
          const gap = fade < 0.45 ? 8 : 0;
          k.ellipse(D.x, D.y, rad, rad, col.o, 4, gap);
          k.ellipse(D.x, D.y, rad, rad, e < 90 ? col.w : col.p, 2, gap);
          // 4 orbiting/cardinal sparkles anchored on the ring in place
          const rot = s.c.raw / 360;
          for (let i = 0; i < 4; i++) {
            const a = (i / 4) * k.tau + rot;
            sparkle(D.x + Math.cos(a) * rad, D.y + Math.sin(a) * rad, col, 2, true);
          }
          // Rune in its middle holds in place
          const bigRune = runeSprite(col, 14, e < 90);
          k.blit(bigRune, D.x - bigRune.width / 2, D.y - bigRune.height / 2, fade);
        }
      }
    },
  });

  // ---------------------------------------------------------------- 5. kind:cube
  // Cube fallback: draws the whole cube from kit.outline, lights every cell as a pale outlined tile with rising motes, beats on targets, fades edges inward leaving the outline.
  FX.register('kind:cube', {
    travel: 140,
    beats(event, kit, travel) {
      const list = event.targets?.length ? event.targets : [null];
      return list.map(target => ({ at: kit.CAST + travel, stop: 85, target, kind: 'hit', power: 0.06 }));
    },
    end: (event, travel) => k.CAST + travel + 1080,
    reach(event, grid) {
      const r = (event.area?.feet || 20) / (grid.feet || 5);
      return { r: r * 1.25 + 1, up: 1.8 };
    },
    ground(s) {
      const t = s.c.t - k.CAST;
      if (t < 0) return;
      const col = steps(s.ramp);
      const g = cubeGeom(s, 3);
      const hit = s.hits[0];
      const real = hit ? s.real(hit) : t - 140;
      const flash = real >= 0 && real < 90;
      const tileImg = cubeTileSprite(col, flash);
      const maxLayer = Math.max(0, Math.floor((g.cells - 1) / 2));

      // Draw every square in the cube as a bright outlined tile; fade from edges inward in Act 3
      for (let cy = 0; cy < g.cells; cy++) {
        for (let cx = 0; cx < g.cells; cx++) {
          const edgeDist = Math.min(cx, cy, g.cells - 1 - cx, g.cells - 1 - cy);
          const appear = ((cx + cy) / Math.max(1, g.cells * 2 - 2)) * 110;
          if (t < appear) continue;
          // Edges fade first (t = 620..880), inner cells hold longer (t = 760..1020)
          const fadeStart = 600 + (maxLayer > 0 ? (edgeDist / maxLayer) * 180 : 0);
          const alpha = t < fadeStart ? 1 : k.clamp(1 - (t - fadeStart) / 220);
          if (alpha <= 0) continue;
          const c = g.pxAt((cx + 0.5) / g.cells, (cy + 0.5) / g.cells);
          k.blit(tileImg, c.x - tileImg.width / 2, c.y - tileImg.height / 2, alpha);
        }
      }

      // Crisp cube outline stays for a moment after the tiles fade
      const outFade = t < 940 ? 1 : k.clamp(1 - (t - 940) / 260);
      if (outFade > 0) {
        const cs = g.corners;
        const fill = flash ? col.w : outFade > 0.5 ? col.p : col.b;
        for (let i = 0; i < 4; i++) {
          const a = cs[i],
            b = cs[(i + 1) % 4];
          outlinedLine(a.x, a.y, b.x, b.y, col.o, fill, 2, 2);
        }
      }
    },
    air(s) {
      const t = s.c.t - k.CAST;
      if (t < 80) return;
      const col = steps(s.ramp);
      const g = cubeGeom(s, 3);
      const seed = s.event.seed || 7;
      // Rising pulse of bright motes/shards in every cell of the cube
      if (t < 860) {
        const q = k.clamp((t - 80) / 740);
        const perCell = g.cells > 4 ? 1 : 2;
        for (let cy = 0; cy < g.cells; cy++) {
          for (let cx = 0; cx < g.cells; cx++) {
            for (let m = 0; m < perCell; m++) {
              const id = (cy * g.cells + cx) * 3 + m;
              const delay = k.hash(id, seed, 1) * 0.25;
              const u = k.clamp((q - delay) / 0.72);
              if (u <= 0 || u >= 1) continue;
              const px = g.pxAt(
                (cx + 0.25 + k.hash(id, seed, 2) * 0.5) / g.cells,
                (cy + 0.25 + k.hash(id, seed, 3) * 0.5) / g.cells,
              );
              const rise = k.ease(u) * 16;
              k.dot(px.x, px.y - rise, col.o, 4);
              k.dot(px.x, px.y - rise, u < 0.45 ? col.w : col.p, 2);
            }
          }
        }
      }
      // One hit beat on each target
      const style = k.hitStyle('b61:cube:' + col.key, col.pal, { S: 34, spikes: 6, jag: 0.35 });
      for (const hit of s.hits) {
        const trg = s.targets.find(x => x.id === hit.id);
        if (!trg) continue;
        const T = k.P(trg);
        const real = s.real(hit);
        k.drawHit(style, T, real);
        k.shards(T, real, col.pal, seed + 13, 6, 18);
      }
    },
  });

  // ---------------------------------------------------------------- 6. haste
  // Haste: big gold-white clock behind the figure with fast-spinning hands, pale afterimages trailing, bright speed lines streaking past, sparks at feet.
  FX.register('haste', {
    palette: GOLD,
    travel: 100,
    beats(event, kit, travel) {
      const list = event.targets?.length ? event.targets : [null];
      return list.map(target => ({ at: kit.CAST + travel, stop: 65, target, kind: 'soft', power: 0 }));
    },
    end: (event, travel) => k.CAST + travel + 1060,
    ground(s) {
      const t = s.c.t - k.CAST;
      if (t < 0) return;
      const col = steps(GOLD);
      const list = unitTargets(s);
      const hit = s.hits[0];
      const real = hit ? s.real(hit) : t - 100;
      const ghost = afterimageSprite();

      for (const trg of list) {
        const span = trg.span || 1;
        const B = k.P(trg);
        const F = k.P(footOf(trg));
        // Soft gold ring at feet
        const rAlpha = t < 100 ? t / 100 : t < 840 ? 1 : k.clamp(1 - (t - 840) / 280);
        footRing(footOf(trg), span, 1.05, col, rAlpha);

        // Big gold-white clock face (24x24, > 1 whole square) behind the figure
        const cFade = t < 820 ? 1 : k.clamp(1 - (t - 820) / 300);
        if (cFade > 0) {
          const flash = real >= 0 && real < 80;
          const img = clockSprite(flash);
          const cy = B.y - 2;
          k.blit(img, B.x - img.width / 2, cy - img.height / 2, cFade);
          // Hands spinning fast!
          const aMin = s.c.raw / 22;
          const aHr = s.c.raw / 85;
          outlinedLine(B.x, cy, B.x + Math.cos(aHr) * 5.5, cy + Math.sin(aHr) * 5.5, GOLD[0], GOLD[4], 2, 1);
          outlinedLine(B.x, cy, B.x + Math.cos(aMin) * 8.5, cy + Math.sin(aMin) * 8.5, GOLD[0], k.WHITE, 2, 1);
          k.dot(B.x, cy, k.WHITE, 2);
        }

        // 3 pale afterimages of the token trailing to one side
        if (t >= 70 && t < 960) {
          const gFade = t < 720 ? 1 : k.clamp(1 - (t - 720) / 240);
          const jitter = Math.sin(s.c.raw / 26) * 1.5;
          for (let i = 3; i >= 1; i--) {
            const ox = -i * 7 - jitter * i * 0.4;
            const alpha = gFade * (0.85 - i * 0.22);
            k.blit(ghost, B.x + ox - ghost.width / 2, F.y - ghost.height + 1, alpha);
          }
        }
      }
    },
    air(s) {
      const t = s.c.t - k.CAST;
      if (t < 60) return;
      const col = steps(GOLD);
      const list = unitTargets(s);
      const seed = s.event.seed || 3;
      const fade = t < 780 ? 1 : k.clamp(1 - (t - 780) / 260);
      if (fade <= 0) return;

      for (let ti = 0; ti < list.length; ti++) {
        const trg = list[ti];
        const B = k.P(trg);
        const F = k.P(footOf(trg));
        // Bright speed lines streaking rapidly past the token
        for (let i = 0; i < 7; i++) {
          if (fade < 0.5 && i % 2) continue;
          const phase = (s.c.raw / 150 + k.hash(i, seed + ti, 1)) % 1;
          const len = 10 + (i % 3) * 5;
          const sy = B.y - 11 + i * 3.6;
          const sx = B.x - 18 + phase * 34;
          outlinedLine(sx - len, sy, sx, sy, GOLD[0], i % 2 ? k.WHITE : GOLD[4], 2, 2);
        }
        // Sparks kicking off at the feet
        for (let i = 0; i < 6; i++) {
          const ph = (s.c.raw / 180 + k.hash(i, seed + ti, 4)) % 1;
          const px = F.x - 2 - ph * 16 - k.hash(i, seed, 5) * 4;
          const py = F.y - Math.sin(ph * Math.PI) * (5 + (i % 3) * 2);
          sparkle(px, py, col, i % 2 ? 2 : 1, true);
        }
      }
    },
  });

  // ---------------------------------------------------------------- 7. thunderwave
  // Thunderwave: fills the 15 ft cube from caster with 3 thick pale-blue pressure walls, white thunderclap flash at caster, dust & pebbles blowing across, blast beats on targets.
  FX.register('thunderwave', {
    palette: THUNDER,
    travel: 90,
    beats(event, kit, travel) {
      const list = event.targets?.length ? event.targets : [null];
      return list.map(target => ({ at: kit.CAST + travel, stop: 120, target, kind: 'blast', power: 0.085 }));
    },
    end: (event, travel) => k.CAST + travel + 920,
    flash: (event, e) =>
      e < 35 ? { color: '#eef8ff', alpha: 0.28 } : e < 70 ? { color: '#0d1522', alpha: 0.2 } : null,
    reach(event, grid) {
      const r = (event.area?.feet || 15) / (grid.feet || 5);
      return { r: r * 1.3 + 1, up: 1.5 };
    },
    ground(s) {
      const t = s.c.t - k.CAST;
      if (t < 0) return;
      const col = steps(THUNDER);
      const g = cubeGeom(s, 3);
      const tileImg = cubeTileSprite(col, t < 150);
      // Fill the cube floor behind the leading pressure wave
      const waveU = k.ease(k.clamp(t / 240));
      const floorFade = t < 480 ? 1 : k.clamp(1 - (t - 480) / 340);
      if (floorFade > 0) {
        for (let cy = 0; cy < g.cells; cy++) {
          for (let cx = 0; cx < g.cells; cx++) {
            const u = (cx + 0.5) / g.cells;
            if (u > waveU + 0.15) continue;
            const c = g.pxAt(u, (cy + 0.5) / g.cells);
            k.blit(tileImg, c.x - tileImg.width / 2, c.y - tileImg.height / 2, floorFade * 0.75);
          }
        }
      }
      // Cube edge from kit.outline
      const edgeFade = t < 680 ? 1 : k.clamp(1 - (t - 680) / 280);
      if (edgeFade > 0) {
        const cs = g.corners;
        for (let i = 0; i < 4; i++) {
          const a = cs[i],
            b = cs[(i + 1) % 4];
          outlinedLine(a.x, a.y, b.x, b.y, THUNDER[0], t < 200 ? k.WHITE : THUNDER[4], 2, 2);
        }
      }
    },
    air(s) {
      const t = s.c.t - k.CAST;
      if (t < 0) return;
      const g = cubeGeom(s, 3);
      const DUST = k.palettes?.DUST || ['#3b2c20', '#8a7154', '#d8c49a'];
      const seed = s.event.seed || 9;

      // White thunderclap flash at the caster's cube origin (u=0, v=0.5)
      if (t < 180) {
        const C = g.pxAt(0.02, 0.5);
        const inv = Math.floor(s.c.raw / 30) % 2 === 1;
        const r = 13 * (1 - t / 210);
        k.disc(C.x, C.y, r + 2, inv ? k.WHITE : THUNDER[0]);
        k.disc(C.x, C.y, r, inv ? THUNDER[0] : k.WHITE);
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * k.tau + 0.2;
          const L = r + 7;
          outlinedLine(C.x, C.y, C.x + Math.cos(a) * L, C.y + Math.sin(a) * L, THUNDER[0], k.WHITE, 2, 2.5);
        }
      }

      // 3 thick pale-blue pressure walls (3 px with outline, as wide as the cube) slamming across one after another
      const starts = [0, 125, 250];
      const dur = 310;
      const segs = Math.max(12, g.cells * 5);
      for (let w = 0; w < 3; w++) {
        const e = t - starts[w];
        if (e < 0 || e > dur) continue;
        const q = k.ease(e / dur);
        const uBase = 0.04 + q * 0.94;
        const bow = 0.09 * (1 - q * 0.4);
        const pts = [];
        for (let i = 0; i <= segs; i++) {
          const v = i / segs;
          const u = Math.min(1.02, uBase + Math.sin(v * Math.PI) * bow);
          pts.push(g.pxAt(u, v));
        }
        // Outline pass (5 px), pale-blue body (3 px), white leading ridge (2 px)
        for (const p of pts) k.dot(p.x, p.y, THUNDER[0], 5);
        for (const p of pts) k.dot(p.x, p.y, w === 0 ? THUNDER[4] : THUNDER[3], 3);
        for (let i = 1; i < pts.length - 1; i++) k.dot(pts[i].x, pts[i].y, k.WHITE, 2);
      }

      // Dust and pebbles blown across the cube to the far side
      if (t < 860) {
        const q = t / 860;
        for (let i = 0; i < 18; i++) {
          const delay = k.hash(i, seed, 1) * 0.18;
          const u = k.clamp((q - delay) / 0.78);
          if (u <= 0) continue;
          const along = 0.08 + k.ease(u) * (0.94 + k.hash(i, seed, 2) * 0.16);
          const across = 0.06 + k.hash(i, seed, 3) * 0.88;
          const p = g.pxAt(along, across);
          const hop = Math.sin(u * Math.PI) * (5 + k.hash(i, seed, 4) * 7);
          if (u > 0.82 && i % 2) continue;
          const isPebble = i % 3 === 0;
          k.dot(p.x, p.y - hop, DUST[0], isPebble ? 4 : 5);
          k.dot(p.x, p.y - hop, isPebble ? DUST[1] : DUST[2], isPebble ? 2 : 3);
        }
      }

      // Blast beat on each target
      const style = k.hitStyle('b61:thunderwave', THUNDER, { S: 42, spikes: 7, jag: 0.35 });
      for (const hit of s.hits) {
        const trg = s.targets.find(x => x.id === hit.id);
        if (!trg) continue;
        const T = k.P(trg);
        const real = s.real(hit);
        k.drawHit(style, T, real);
        k.shards(T, real, THUNDER, seed + 21, 9, 26);
      }
    },
  });

  // ---------------------------------------------------------------- 8. grease (Lasting)
  // Grease: ground-only glossy black-amber oil puddle filling the cube with yellow-white shine streaks & ripple rings, edge drips, slip sparks under feet; calm linger loop.
  function drawGreaseSlick(s, stage, alpha) {
    if (alpha <= 0) return;
    const g = cubeGeom(s, 2);
    const W = Math.max(24, g.cells * 16 + 8);
    const H = Math.max(24, g.cells * 16 + 8);
    const seed = s.event.seed || 4;
    const img = greasePuddleSprite(W, H, stage, seed);
    k.blit(img, g.center.x - W / 2, g.center.y - H / 2, alpha);

    // Animated glossy yellow-white ripple rings and travelling shine glints on the puddle (very cheap)
    if (stage >= 2 && alpha > 0.25) {
      const cyc = (s.c.raw / 2400) % 1;
      for (let i = 0; i < 2; i++) {
        const ph = (cyc + i * 0.5) % 1;
        const rx = 3 + k.ease(ph) * Math.min(11, g.cells * 4.5);
        const ry = rx * 0.62;
        const u = 0.3 + k.hash(i, seed, 5) * 0.4;
        const v = 0.3 + k.hash(i, seed, 6) * 0.4;
        const c = g.pxAt(u, v);
        if (ph < 0.82) {
          const gap = ph > 0.35 ? 8 : 0;
          k.ellipse(c.x, c.y, rx, ry, GREASE[0], 2, gap);
          k.ellipse(c.x, c.y, rx, ry, ph < 0.4 ? GREASE[5] : GREASE[4], 1, gap);
        }
      }
      // Subtle twinkling oil-slick shine flecks
      for (let i = 0; i < 4; i++) {
        const on = Math.floor(s.c.raw / 260 + i * 3) % 3 === 0;
        if (!on) continue;
        const p = g.pxAt(0.18 + k.hash(i, seed, 8) * 0.64, 0.18 + k.hash(i, seed, 9) * 0.64);
        k.dot(p.x, p.y, GREASE[0], 3);
        k.dot(p.x, p.y, GREASE[5], 1);
      }
    }
  }

  FX.register('grease', {
    palette: GREASE,
    travel: 160,
    beats(event, kit, travel) {
      const list = event.targets?.length ? event.targets : [null];
      return list.map(target => ({ at: kit.CAST + travel, stop: 55, target, kind: 'soft', power: 0 }));
    },
    end: (event, travel) => k.CAST + travel + 820,
    reach(event, grid) {
      const r = (event.area?.feet || 10) / (grid.feet || 5);
      return { r: r * 1.25 + 1.2, up: 1.0 };
    },
    ground(s) {
      const t = s.c.t - k.CAST;
      if (t < 0) return;
      const g = cubeGeom(s, 2);
      const seed = s.event.seed || 4;
      const lasting = s.pose?.linger > 0 && s.c.t >= k.CAST + 160;

      // Cast spread (stages 0..2), plus full puddle if linger isn't active
      if (!lasting) {
        const stage = t < 60 ? 0 : t < 120 ? 1 : t < 180 ? 2 : 3;
        const alpha = t < 760 ? 1 : k.clamp(1 - (t - 760) / 220);
        drawGreaseSlick(s, stage, alpha);
      } else if (t < 160) {
        const stage = t < 60 ? 0 : t < 120 ? 1 : 2;
        drawGreaseSlick(s, stage, 1);
      }

      // Drips splash at the edges of the cube
      if (t >= 70 && t < 620) {
        const q = (t - 70) / 550;
        for (let i = 0; i < 12; i++) {
          const edge = i % 4;
          const along = 0.1 + k.hash(i, seed, 1) * 0.8;
          const u = edge === 0 ? along : edge === 1 ? 1.03 : edge === 2 ? along : -0.03;
          const v = edge === 0 ? -0.03 : edge === 1 ? along : edge === 2 ? 1.03 : along;
          const p = g.pxAt(u, v);
          const hop = Math.sin(k.clamp(q * 1.3 - k.hash(i, seed, 2) * 0.25) * Math.PI) * 6;
          if (q > 0.78 && i % 2) continue;
          k.dot(p.x, p.y - hop, GREASE[0], 4);
          k.dot(p.x, p.y - hop, i % 2 ? GREASE[4] : GREASE[5], 2);
        }
      }

      // Slip spark under each target's feet (ground layer, never over figures)
      if (t >= 140 && t < 680) {
        const q = (t - 140) / 540;
        const col = steps(GREASE);
        for (let ti = 0; ti < s.targets.length; ti++) {
          const F = k.P(footOf(s.targets[ti]));
          const skid = k.ease(k.clamp(q * 1.5)) * 10;
          if (q < 0.7) {
            outlinedLine(F.x - skid, F.y + 1, F.x + skid * 0.5, F.y - 1, GREASE[0], GREASE[5], 2, 2);
          }
          for (let j = 0; j < 4; j++) {
            const a = (j / 4) * k.tau + 0.4 + ti;
            const r = 4 + k.ease(q) * 9;
            if (q > 0.75 && j % 2) continue;
            sparkle(F.x + Math.cos(a) * r, F.y + Math.sin(a) * r * 0.5, col, 1, true);
          }
        }
      }
    },
    linger(s) {
      // Calm, cheap loop keeping the glossy oil puddle visible while Grease lasts
      drawGreaseSlick(s, 3, s.linger);
    },
  });

  // ---------------------------------------------------------------- 9. inflict-wounds
  // Inflict Wounds: sickly bright green-white whole-square hand slams onto target, figure flashes pale, bright necrotic cracks spread, burst of pale green motes.
  FX.register('inflict-wounds', {
    palette: NECRO,
    travel: 110,
    beats: (event, kit, travel) => [
      { at: kit.CAST + travel, stop: 115, target: event.targets?.[0] ?? null, kind: 'hit', power: 0.085 },
    ],
    end: (event, travel) => k.CAST + travel + 880,
    flash: (event, e) =>
      e < 32 ? { color: '#ecffd6', alpha: 0.24 } : e < 64 ? { color: '#0c1a0e', alpha: 0.2 } : null,
    ground(s) {
      const t = s.c.t - k.CAST;
      if (t < 100) return;
      const col = steps(NECRO);
      const trg = unitTargets(s)[0];
      if (!trg) return;
      const e = t - 100;
      const fade = e < 520 ? 1 : k.clamp(1 - (e - 520) / 300);
      footRing(footOf(trg), trg.span || 1, 1 + 0.18 * k.ease(k.clamp(e / 180)), col, fade);
    },
    air(s) {
      const t = s.c.t - k.CAST;
      if (t < 0) return;
      const hit = s.hits[0];
      const trg = s.targets.find(x => x.id === hit?.id) || unitTargets(s)[0];
      if (!trg) return;
      const T = k.P(trg);
      const H = s.pose?.hand ? k.P(s.pose.hand) : { x: T.x - 16, y: T.y };
      const arrive = 110;
      const real = hit ? s.real(hit) : t - arrive;
      const seed = s.event.seed || 13;

      // Figure flashes pale right on impact (underneath the slammed hand glyph)
      if (real >= 0 && real < 160) {
        const blink = Math.floor(real / 35) % 2 === 0;
        k.disc(T.x, T.y, 9, blink ? NECRO[0] : k.WHITE);
        k.disc(T.x, T.y, 8, blink ? k.WHITE : NECRO[4]);
      }

      // Act 1 -> Act 2: Whole-square sickly bright green-white hand glyph lunges and slams onto target
      if (t < 640) {
        const q = k.clamp(t / arrive);
        const hx = t < arrive ? k.mix(H.x, T.x, k.ease(q)) : T.x;
        const hy = t < arrive ? k.mix(H.y, T.y, k.ease(q)) - Math.sin(q * Math.PI) * 5 : T.y;
        const fade = t < 440 ? 1 : k.clamp(1 - (t - 440) / 200);
        const isFlash = real >= 0 && real < 90;
        const img = necroHandSprite(isFlash);
        k.blit(img, hx - img.width / 2, hy - img.height / 2, fade);
      }

      // Bright necrotic cracks spreading over the token (pale & white over dark outline)
      if (t >= arrive && t < 840) {
        const e = t - arrive;
        const grow = k.ease(k.clamp(e / 160));
        const fade = e < 520 ? 1 : k.clamp(1 - (e - 520) / 210);
        if (fade > 0) {
          const fill = e < 120 ? k.WHITE : NECRO[4];
          const dirs = [
            [-1, -1],
            [1, -0.8],
            [-1, 0.7],
            [0.9, 1],
            [0.1, -1.1],
          ];
          for (let i = 0; i < dirs.length; i++) {
            if (fade < 0.5 && i % 2) continue;
            const [dx, dy] = dirs[i];
            const mx = T.x + dx * 5 * grow + (i % 2 ? 2 : -2);
            const my = T.y + dy * 5 * grow;
            const ex = T.x + dx * 11 * grow;
            const ey = T.y + dy * 10 * grow;
            outlinedLine(T.x, T.y, mx, my, NECRO[0], fill, 2, 1.5);
            outlinedLine(mx, my, ex, ey, NECRO[0], NECRO[3], 2, 1.5);
          }
        }
      }

      // Hit mark + burst of pale green motes on real time
      const style = k.hitStyle('b61:inflict', NECRO, { S: 38, spikes: 6, jag: 0.45 });
      k.drawHit(style, T, real);
      k.shards(T, real, NECRO, seed + 5, 10, 24);
      if (real >= 0 && real < 480) {
        const q = real / 480;
        for (let i = 0; i < 12; i++) {
          const a = k.hash(i, seed, 2) * k.tau;
          const r = 3 + k.ease(q) * (14 + k.hash(i, seed, 3) * 10);
          const mx = T.x + Math.cos(a) * r;
          const my = T.y + Math.sin(a) * r * 0.85 - q * 8;
          if (q > 0.72 && i % 2) continue;
          k.dot(mx, my, NECRO[0], 4);
          k.dot(mx, my, i % 2 ? k.WHITE : NECRO[4], 2);
        }
      }
    },
  });

  // ---------------------------------------------------------------- 10. divine-favor
  // Divine Favor: big whole-square gold-white blade flashes over the token, holy rays fan out from it, gold ring settles at feet.
  FX.register('divine-favor', {
    palette: GOLD,
    travel: 120,
    beats(event, kit, travel) {
      const list = event.targets?.length ? event.targets : [null];
      return list.map(target => ({ at: kit.CAST + travel, stop: 65, target, kind: 'soft', power: 0 }));
    },
    end: (event, travel) => k.CAST + travel + 940,
    ground(s) {
      const t = s.c.t - k.CAST;
      if (t < 0) return;
      const col = steps(GOLD);
      const list = unitTargets(s);
      const alpha = t < 120 ? t / 120 : t < 780 ? 1 : k.clamp(1 - (t - 780) / 260);
      const pulse = t >= 120 && t < 340 ? 1 + 0.18 * Math.sin(((t - 120) / 220) * Math.PI) : 1;
      for (const trg of list) footRing(footOf(trg), trg.span || 1, pulse, col, alpha);
    },
    air(s) {
      const t = s.c.t - k.CAST;
      if (t < 0) return;
      const col = steps(GOLD);
      const list = unitTargets(s);
      const hit = s.hits[0];
      const real = hit ? s.real(hit) : t - 120;

      for (const trg of list) {
        const B = k.P(trg);
        const F = k.P(footOf(trg));
        const cx = B.x,
          cy = B.y - 3;

        // Holy rays fanning out from the glowing blade
        if (t >= 100 && t < 760) {
          const e = t - 100;
          const grow = k.ease(k.clamp(e / 120));
          const fade = e < 460 ? 1 : k.clamp(1 - (e - 460) / 200);
          if (fade > 0) {
            const rays = 8;
            for (let i = 0; i < rays; i++) {
              if (fade < 0.5 && i % 2) continue;
              const a = (i / rays) * k.tau + 0.2;
              const r0 = 5;
              const r1 = (i % 2 === 0 ? 19 : 14) * grow;
              outlinedLine(
                cx + Math.cos(a) * r0,
                cy + Math.sin(a) * r0,
                cx + Math.cos(a) * r1,
                cy + Math.sin(a) * r1,
                GOLD[0],
                i % 2 === 0 ? k.WHITE : GOLD[4],
                2,
                2,
              );
            }
          }
        }

        // Big whole-square gold-white blade shape flashing over the token and holding
        const pop = k.back(k.clamp(t / 130));
        const bFade = t < 740 ? 1 : k.clamp(1 - (t - 740) / 280);
        if (bFade > 0) {
          const isFlash = real >= 0 && real < 95;
          const img = divineBladeSprite(isFlash);
          const by = cy - (1 - Math.min(1.08, pop)) * 6;
          k.blit(img, cx - img.width / 2, by - img.height / 2, bFade);
          // Travelling white glint along the blade edge during the held peak
          if (t >= 200 && t < 680) {
            const gq = ((t - 200) % 240) / 240;
            const gx = cx - 4 + gq * 12;
            const gy = by + 4 - gq * 12;
            sparkle(gx, gy, col, 2, true);
          }
        }

        // Small golden motes rising from feet
        if (t >= 120 && t < 940) {
          for (let i = 0; i < 5; i++) {
            const ph = ((t - 120) / 720 + i * 0.2) % 1;
            const mx = cx + (k.hash(i, 7, 1) - 0.5) * 16;
            const my = F.y - ph * 22;
            k.dot(mx, my, GOLD[0], 3);
            k.dot(mx, my, i % 2 ? k.WHITE : GOLD[4], 1);
          }
        }
      }
    },
  });

  // ---------------------------------------------------------------- 11. resistance
  // Resistance: big pale whole-square shield glyph with white rim forms in front of target and holds for the peak, bright shimmer runs over token, soft ring settles at feet.
  FX.register('resistance', {
    palette: WARD,
    travel: 130,
    beats(event, kit, travel) {
      const list = event.targets?.length ? event.targets : [null];
      return list.map(target => ({ at: kit.CAST + travel, stop: 60, target, kind: 'soft', power: 0 }));
    },
    end: (event, travel) => k.CAST + travel + 1020,
    ground(s) {
      const t = s.c.t - k.CAST;
      if (t < 0) return;
      const col = steps(WARD);
      const list = unitTargets(s);
      const alpha = t < 130 ? t / 130 : t < 860 ? 1 : k.clamp(1 - (t - 860) / 280);
      const pulse = t >= 130 && t < 320 ? 1 + 0.14 * Math.sin(((t - 130) / 190) * Math.PI) : 1;
      for (const trg of list) footRing(footOf(trg), trg.span || 1, pulse, col, alpha);
    },
    air(s) {
      const t = s.c.t - k.CAST;
      if (t < 0) return;
      const col = steps(WARD);
      const list = unitTargets(s);
      const hit = s.hits[0];
      const real = hit ? s.real(hit) : t - 130;

      for (const trg of list) {
        const B = k.P(trg);
        const pop = k.back(k.clamp(t / 150));
        const fade = t < 840 ? 1 : k.clamp(1 - (t - 840) / 300);
        if (fade <= 0) continue;

        // Big pale shield glyph (whole square, crisp 2 px white rim) forms in front of target and holds
        const flash = real >= 0 && real < 90;
        const img = shieldGlyphSprite(flash);
        const sy = B.y - 1 + (1 - Math.min(1.06, pop)) * 5;
        k.blit(img, B.x - img.width / 2, sy - img.height / 2, fade);

        // Bright diagonal shimmer sweeping twice over the shield and token
        if (t >= 150 && t < 820) {
          const cyc = ((t - 150) % 330) / 330;
          if (cyc < 0.65) {
            const q = cyc / 0.65;
            const sx = B.x - 9 + q * 18;
            const y0 = sy - 7 + q * 4;
            const y1 = sy + 6 - (1 - q) * 3;
            outlinedLine(sx - 3, y0, sx + 3, y1, WARD[0], k.WHITE, 2, 1.5);
          }
        }

        // Glint sparkles on the shield rim corners during the held peak
        if (t >= 130 && t < 840) {
          const tick = Math.floor(s.c.raw / 120);
          const pts = [
            [B.x - 7, sy - 7],
            [B.x + 7, sy - 7],
            [B.x, sy + 9],
            [B.x, sy - 8],
          ];
          for (let i = 0; i < pts.length; i++) {
            if ((tick + i) % 2) continue;
            sparkle(pts[i][0], pts[i][1], col, 2, true);
          }
        }
      }
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
