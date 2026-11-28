/* Pixel spells, batch 65: cube fallback, grease, earthquake, animate-dead, wristpocket, seeming. */
(function (root) {
  'use strict';
  const FX = root.BoardPixelFX;
  if (!FX) return;
  const k = FX.kit;

  const GREASE = ['#0c0906', '#22180c', '#4a3314', '#8f641e', '#e8c458', '#fff8cc'];
  const QUAKE = ['#140e0a', '#2b1e14', '#6b4c32', '#b88f5c', '#e8cc98', '#fff4d6'];
  const NECRO = ['#09160d', '#153a1e', '#267838', '#4fd462', '#a8ff9e', '#ffffff'];
  const SKEL_PAL = ['#0d0c10', '#4a4642', '#9b9588', '#dcd7c8', '#f7f4ea', '#ffffff', '#267838', '#5cff72', '#c8ffbe'];
  const POCKET = ['#120520', '#3d1469', '#7b35d6', '#be70ff', '#ecc4ff', '#ffffff'];
  const RELIC = ['#140c1e', '#6e4a1c', '#c48d2b', '#ffd052', '#fff0a8', '#ffffff'];
  const SEEMING = ['#180b29', '#4f2a80', '#8f64d4', '#cbb2ff', '#efe3ff', '#ffffff'];
  const TINT_CYAN = ['#180b29', '#326882', '#6ec4e8', '#c6f2ff', '#f0fcff', '#ffffff'];
  const TINT_GOLD = ['#221408', '#8a621c', '#d8a63c', '#ffe28a', '#fff7d4', '#ffffff'];

  // Shared helper: get the four cube corners in grid cells and side length in cells.
  function cubeGeom(s, defaultFeet) {
    const gridFeet = s.grid?.feet || 5;
    const feet = s.area?.feet || defaultFeet;
    const cells = Math.max(1, feet / gridFeet);
    let corners = s.area ? k.outline(s.area, s.grid) : [];
    if (!corners || corners.length < 4) {
      const ref = s.targets?.[0] || s.pose?.target || s.pose?.base;
      const cx = ref ? (ref.baseX ?? ref.x) : (s.grid?.cols || 13) / 2;
      const cy = ref ? (ref.baseY ?? ref.y) : (s.grid?.rows || 8) / 2;
      const h = cells / 2;
      corners = [
        [cx - h, cy - h],
        [cx + h, cy - h],
        [cx + h, cy + h],
        [cx - h, cy + h],
      ];
    }
    const pts = corners.slice(0, 4).map(([x, y]) => k.P({ x, y }));
    const angle = Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x);
    return { cells, pts, angle };
  }

  // Draw a closed 2 px outline along all four sides of a quad (dark outer border + bright inner stroke).
  function drawQuadOutline(pts, dark, light, thick, alphaStep) {
    if (alphaStep <= 0) return;
    const w = Math.max(1, thick);
    for (let pass = 0; pass < 2; pass++) {
      const col = pass === 0 ? dark : light;
      const sz = pass === 0 ? w + 2 : w;
      for (let side = 0; side < 4; side++) {
        const a = pts[side],
          b = pts[(side + 1) % 4];
        const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        const step = Math.max(2, Math.ceil(len / 44));
        const count = Math.max(1, Math.ceil(len / step));
        for (let i = 0; i <= count; i++) {
          if (alphaStep < 1 && i % 2 === 1) continue;
          const u = i / count;
          k.dot(k.mix(a.x, b.x, u), k.mix(a.y, b.y, u), col, sz);
        }
      }
    }
  }

  // Cached bright tile sprite for cube fallback (16x16 per cell, dark outline + pale luminous core).
  function cubeTileSprite(ramp, px, stage) {
    const key = `cube-tile:${ramp[0]}:${ramp[3]}:${ramp[4]}:${px}:${stage}`;
    const pal = [ramp[0], ramp[1], ramp[2], ramp[3], ramp[4], k.WHITE];
    return k.sprite(
      key,
      px,
      px,
      pal,
      set => {
        const inset = stage === 0 ? 1 : stage === 1 ? 2 : 3;
        const lo = inset,
          hi = px - 1 - inset;
        for (let y = lo; y <= hi; y++) {
          for (let x = lo; x <= hi; x++) {
            const edge = x === lo || x === hi || y === lo || y === hi;
            const inner = x === lo + 1 || x === hi - 1 || y === lo + 1 || y === hi - 1;
            if (edge) set(x, y, stage === 0 ? 3 : 2);
            else if (inner) set(x, y, 4);
            else if (x - lo <= 3 && y - lo <= 3) set(x, y, 5);
            else set(x, y, k.dith(x, y) > 0.65 ? 5 : 4);
          }
        }
      },
      true,
    );
  }

  // kind:cube: full closed 2 px pale outline around the entire cube, bright lit tile and rising mote in every cell, fading inward.
  FX.register('kind:cube', {
    travel: 80,
    reach(event, grid) {
      const cells = (event.area?.feet || 10) / (grid.feet || 5);
      return { r: cells * 1.3 + 1.2, up: cells * 0.6 + 1.5 };
    },
    beats(event, kit, travel) {
      const ids = event.targets?.length ? event.targets : [null];
      return ids.map(target => ({
        at: kit.CAST + travel,
        stop: 80,
        target,
        kind: 'hit',
        power: 0.05,
      }));
    },
    end: (event, travel) => k.CAST + travel + 920,
    ground(s) {
      const { c, ramp } = s;
      const e = c.t - k.CAST;
      if (e < 0) return;
      const { cells, pts, angle } = cubeGeom(s, 10);
      const n = Math.max(1, Math.round(cells));
      const ux = (pts[1].x - pts[0].x) / n,
        uy = (pts[1].y - pts[0].y) / n;
      const vx = (pts[3].x - pts[0].x) / n,
        vy = (pts[3].y - pts[0].y) / n;
      const cellPx = Math.max(10, Math.round(Math.hypot(ux, uy)));
      const rotated = Math.abs(Math.sin(angle)) > 0.05 || Math.cos(angle) < 0;
      const flash = e >= 60 && e < 140;

      // Every cell inside the cube is lit as a bright tile; tiles fade from the outer edges inward.
      const tileFull = cubeTileSprite(ramp, cellPx, 0);
      const tileMid = cubeTileSprite(ramp, cellPx, 1);
      const tileSmall = cubeTileSprite(ramp, cellPx, 2);
      for (let iy = 0; iy < n; iy++) {
        for (let ix = 0; ix < n; ix++) {
          const cx = pts[0].x + ux * (ix + 0.5) + vx * (iy + 0.5);
          const cy = pts[0].y + uy * (ix + 0.5) + vy * (iy + 0.5);
          // Distance from cube center normalized 0 (center) .. 1 (outermost ring).
          const dEdge =
            n === 1 ? 0 : Math.max(Math.abs((ix + 0.5) / n - 0.5), Math.abs((iy + 0.5) / n - 0.5)) / (0.5 - 0.5 / n);
          // Outer cells start fading at 460 ms, inner cells hold until 640 ms.
          const fadeStart = k.mix(640, 440, dEdge);
          const fadeDur = 240;
          let alpha = e < 70 ? k.clamp((e + 20) / 70) : 1 - k.clamp((e - fadeStart) / fadeDur);
          if (alpha <= 0.05) continue;
          const img = alpha > 0.68 ? tileFull : alpha > 0.38 ? tileMid : tileSmall;
          if (rotated) k.blitRotated(img, cx, cy, angle, 0.5, 0.5);
          else k.blit(img, cx - img.width / 2, cy - img.height / 2, alpha);
        }
      }

      // Full closed 2 px pale outline along all four sides holds past the tiles, then fades cleanly.
      const outlineAlpha = e < 820 ? 1 : e < 960 ? 0.5 : 0;
      const lineColor = flash ? k.WHITE : ramp[4];
      drawQuadOutline(pts, ramp[0], lineColor, 2, outlineAlpha);
      if (outlineAlpha > 0) {
        for (let i = 0; i < 4; i++) {
          k.dot(pts[i].x, pts[i].y, ramp[0], 5);
          k.dot(pts[i].x, pts[i].y, flash ? k.WHITE : ramp[5] || k.WHITE, 3);
        }
      }
    },
    air(s) {
      const { c, ramp, targets, hits, event } = s;
      const e = c.t - k.CAST;
      if (e < 0) return;
      const seed = event.seed || 3;
      const { cells, pts } = cubeGeom(s, 10);
      const n = Math.max(1, Math.round(cells));
      const ux = (pts[1].x - pts[0].x) / n,
        uy = (pts[1].y - pts[0].y) / n;
      const vx = (pts[3].x - pts[0].x) / n,
        vy = (pts[3].y - pts[0].y) / n;

      // Rising bright mote in every cell inside the cube.
      if (e >= 40 && e < 860) {
        const stride = n > 5 ? 2 : 1;
        for (let iy = 0; iy < n; iy += stride) {
          for (let ix = 0; ix < n; ix += stride) {
            const idx = iy * n + ix;
            const dEdge =
              n === 1 ? 0 : Math.max(Math.abs((ix + 0.5) / n - 0.5), Math.abs((iy + 0.5) / n - 0.5)) / (0.5 - 0.5 / n);
            const life = k.clamp((e - 40 - k.hash(idx, seed, 1) * 90) / (680 - dEdge * 140));
            if (life <= 0 || life >= 1) continue;
            const bx = pts[0].x + ux * (ix + 0.5) + vx * (iy + 0.5) + (k.hash(idx, seed, 2) - 0.5) * 6;
            const by = pts[0].y + uy * (ix + 0.5) + vy * (iy + 0.5) + (k.hash(idx, seed, 3) - 0.5) * 4;
            const rise = k.ease(life) * 16;
            const mx = bx + Math.sin(life * 5 + idx) * 1.5;
            const my = by - rise;
            const sz = life < 0.72 ? 2 : 1;
            k.dot(mx, my, ramp[0], sz + 2);
            k.dot(mx, my, life < 0.45 ? k.WHITE : ramp[4], sz);
          }
        }
      }

      // One crisp hit beat on each target.
      const style = k.hitStyle(`cube:${ramp[0]}:${ramp[3]}`, ramp, { S: 34, spikes: 6, jag: 0.25 });
      hits.forEach((hit, i) => {
        const target = targets.find(t => t.id === hit.id) || targets[i];
        if (!target || !hit.freeze) return;
        const T = k.P(target);
        const real = s.real(hit);
        k.drawHit(style, T, real);
        k.shards(T, real, ramp, seed + i * 7, 6, 18);
      });
    },
  });

  // Cached full-square glossy grease slick sprite (covers cells x cells edge to edge with drips & shine streaks).
  function greaseSprite(sidePx, frame, seed) {
    const pad = 4;
    const W = sidePx + pad * 2;
    const key = `grease:${sidePx}:${frame}:${seed % 3}`;
    return k.sprite(
      key,
      W,
      W,
      GREASE,
      set => {
        const x0 = pad,
          y0 = pad,
          x1 = pad + sidePx - 1,
          y1 = pad + sidePx - 1;
        // 1. Edge-to-edge square slick (tiny 1 px corner nip so it reads as wet liquid, still clearly square).
        for (let y = y0; y <= y1; y++) {
          for (let x = x0; x <= x1; x++) {
            const cx = x === x0 || x === x1;
            const cy = y === y0 || y === y1;
            if (cx && cy) continue;
            const edgeDist = Math.min(x - x0, x1 - x, y - y0, y1 - y);
            const n = k.noise((x - x0) / 7, (y - y0) / 7, seed + 11);
            let idx = n > 0.62 ? 2 : 1;
            // Raised glossy amber rim along the square border so the full footprint pops on dark maps.
            if (edgeDist === 0) idx = x - x0 < sidePx * 0.7 && y - y0 < sidePx * 0.7 ? 3 : 2;
            else if (edgeDist === 1 && (y === y0 + 1 || x === x0 + 1)) idx = 4;
            else if (edgeDist === 1) idx = 2;
            set(x, y, idx);
          }
        }
        // 2. Glossy oozing drips protruding along all four sides of the square.
        const dripsPerSide = Math.max(3, Math.round(sidePx / 8));
        for (let side = 0; side < 4; side++) {
          for (let i = 0; i < dripsPerSide; i++) {
            const u = (i + 0.3 + k.hash(i, side, seed) * 0.45) / dripsPerSide;
            const pos = Math.round(pad + 2 + u * (sidePx - 5));
            const len = 2 + (k.hash(i, side, seed + 5) > 0.45 ? 1 : 0);
            const w = k.hash(i, side, seed + 9) > 0.5 ? 2 : 1;
            for (let d = 1; d <= len; d++) {
              for (let t = 0; t < w; t++) {
                const dx = side === 0 ? pos + t : side === 1 ? x1 + d : side === 2 ? pos + t : x0 - d;
                const dy = side === 0 ? y0 - d : side === 1 ? pos + t : side === 2 ? y1 + d : pos + t;
                set(dx, dy, d === len ? 4 : d === 1 ? 2 : 3);
              }
            }
          }
        }
        // 3. Bold diagonal yellow-white shine streaks across every cell of the square.
        const shift = frame === 1 ? 1 : frame === 2 ? -1 : 0;
        const streaks = Math.max(3, Math.round(sidePx / 8));
        for (let i = 0; i < streaks; i++) {
          const sx = x0 + 3 + Math.round(((i + 0.2) / streaks) * (sidePx - 9)) + shift;
          const sy = y0 + 3 + Math.round(k.hash(i, seed, 21) * (sidePx - 12));
          const slen = Math.max(7, Math.round(sidePx * (0.28 + k.hash(i, seed, 22) * 0.16)));
          for (let j = 0; j < slen; j++) {
            const px = sx + j;
            const py = sy + Math.round(j * 0.6);
            if (px <= x0 + 1 || px >= x1 - 1 || py <= y0 + 1 || py >= y1 - 1) continue;
            const bright = j > 0 && j < slen - 1;
            set(px, py, bright ? 5 : 4);
            if (bright && py + 1 < y1 - 1) set(px, py + 1, j > 1 && j < slen - 2 ? 4 : 3);
            if (j > 1 && j < slen - 2 && py + 2 < y1 - 1) set(px, py + 2, 3);
          }
        }
        // 4. Secondary specular glint patches near opposite corners so the whole square gleams.
        for (let i = 0; i < 4; i++) {
          const gx = x0 + Math.round((0.2 + (i % 2) * 0.58) * sidePx) + shift;
          const gy = y0 + Math.round((0.22 + Math.floor(i / 2) * 0.55) * sidePx);
          set(gx, gy, 5);
          set(gx + 1, gy, 4);
          set(gx, gy + 1, 4);
        }
      },
      true,
    );
  }

  function drawGreaseSlick(s, alpha, expand) {
    if (alpha <= 0) return;
    const { cells, pts, angle } = cubeGeom(s, 10);
    const cx = (pts[0].x + pts[1].x + pts[2].x + pts[3].x) * 0.25;
    const cy = (pts[0].y + pts[1].y + pts[2].y + pts[3].y) * 0.25;
    const fullSide = Math.max(16, Math.round(cells * k.PX));
    const sidePx = Math.max(12, Math.round(fullSide * expand));
    const seed = s.event.seed || 7;
    const frame = Math.floor(s.c.raw / 520) % 3;
    const img = greaseSprite(sidePx, frame, seed);
    const rotated = Math.abs(Math.sin(angle)) > 0.05 || Math.cos(angle) < 0;
    if (rotated) k.blitRotated(img, cx, cy, angle, 0.5, 0.5);
    else k.blit(img, cx - img.width / 2, cy - img.height / 2, alpha);

    // Calm yellow-white ripple rings slowly expanding across quadrants of the square.
    if (expand >= 0.9 && alpha >= 0.25) {
      const cycle = (s.c.raw / 2200) % 1;
      for (let i = 0; i < 2; i++) {
        const q = (cycle + i * 0.5) % 1;
        const rx = fullSide * (0.1 + q * 0.22);
        const ry = rx * 0.65;
        const ox = (i === 0 ? -0.22 : 0.22) * fullSide;
        const oy = (i === 0 ? -0.18 : 0.18) * fullSide;
        const col = q < 0.45 ? GREASE[5] : GREASE[4];
        k.ellipse(cx + ox, cy + oy, rx, ry, GREASE[0], 2, q > 0.55 ? 6 : 0);
        k.ellipse(cx + ox, cy + oy, rx, ry, col, 1, q > 0.55 ? 6 : 0);
      }
    }
  }

  // Grease: edge-to-edge 2x2 glossy black-amber square slick with yellow-white shine streaks, edge drips, ripple rings and slip sparks.
  FX.register('grease', {
    palette: GREASE,
    travel: 160,
    reach(event, grid) {
      const cells = (event.area?.feet || 10) / (grid.feet || 5);
      return { r: cells * 1.3 + 1.2, up: 1.4 };
    },
    beats(event, kit, travel) {
      const ids = event.targets?.length ? event.targets : [null];
      return ids.map(target => ({
        at: kit.CAST + travel,
        stop: 60,
        target,
        kind: 'soft',
        power: 0.04,
      }));
    },
    end: (event, travel) => k.CAST + travel + 780,
    ground(s) {
      const { c, hits, targets, plan } = s;
      const hitAt = k.CAST + plan.travel;
      if (c.t < hitAt) return;
      const e = c.t - hitAt;
      const expand = 0.55 + 0.45 * k.ease(k.clamp(e / 110));
      if (!(s.pose.linger > 0)) {
        const fade = 1 - k.clamp((e - 580) / 200);
        drawGreaseSlick(s, fade, expand);
      }
      // Impact splash ripple + slip spark right under each target's feet.
      const { cells, pts } = cubeGeom(s, 10);
      const cx = (pts[0].x + pts[1].x + pts[2].x + pts[3].x) * 0.25;
      const cy = (pts[0].y + pts[1].y + pts[2].y + pts[3].y) * 0.25;
      if (e < 260) {
        const q = e / 260;
        const r = cells * k.PX * (0.28 + 0.32 * k.ease(q));
        k.ellipse(cx, cy, r, r * 0.72, GREASE[0], 3, q > 0.5 ? 8 : 0);
        k.ellipse(cx, cy, r, r * 0.72, q < 0.35 ? GREASE[5] : GREASE[4], 1, q > 0.5 ? 8 : 0);
      }
      hits.forEach((hit, i) => {
        const target = targets.find(t => t.id === hit.id) || targets[i];
        if (!target || !hit.freeze) return;
        const real = s.real(hit);
        if (real < 0 || real > 380) return;
        const F = k.P({ x: target.baseX ?? target.x, y: target.baseY ?? target.y });
        const q = real / 380;
        const r = 4 + k.ease(q) * 9;
        // Slip spark: crisp yellow-white star & skidding ring under the target's boots.
        k.ellipse(F.x, F.y, r, r * 0.52, GREASE[0], 3, q > 0.55 ? 6 : 0);
        k.ellipse(F.x, F.y, r, r * 0.52, q < 0.4 ? GREASE[5] : GREASE[4], 1, q > 0.55 ? 6 : 0);
        if (q < 0.65) {
          const sp = 5 + Math.round(q * 6);
          for (const [dx, dy] of [
            [1, 0],
            [-1, 0],
            [0.7, 0.45],
            [-0.7, -0.45],
          ]) {
            k.dot(F.x + dx * sp, F.y + dy * sp, GREASE[0], 4);
            k.dot(F.x + dx * sp, F.y + dy * sp, GREASE[5], 2);
          }
        }
      });
    },
    air(s) {
      const { pose, c, hits, targets, plan } = s;
      const hitAt = k.CAST + plan.travel;
      const { pts } = cubeGeom(s, 10);
      const C = {
        x: (pts[0].x + pts[1].x + pts[2].x + pts[3].x) * 0.25,
        y: (pts[0].y + pts[1].y + pts[2].y + pts[3].y) * 0.25,
      };
      // Glossy amber glob arcs from caster's hand to the center of the grease patch.
      if (c.t >= k.CAST && c.t < hitAt && pose.hand) {
        const H = k.P(pose.hand);
        const q = (c.t - k.CAST) / (hitAt - k.CAST);
        const at = u => ({ x: k.mix(H.x, C.x, u), y: k.mix(H.y, C.y, u) - Math.sin(u * Math.PI) * 14 });
        for (let i = 6; i >= 1; i--) {
          const u = q - i * 0.04;
          if (u <= 0) continue;
          const p = at(u);
          k.dot(p.x, p.y, GREASE[0], i < 3 ? 5 : 4);
          k.dot(p.x, p.y, i < 3 ? GREASE[4] : GREASE[2], i < 3 ? 3 : 2);
        }
        const p = at(q);
        k.disc(p.x, p.y, 4.5, GREASE[0]);
        k.disc(p.x, p.y, 3.5, GREASE[2]);
        k.dot(p.x - 1, p.y - 1, GREASE[5], 2);
      }
      // Slip spark star & amber droplets kicking up right at each target's boots on impact.
      hits.forEach((hit, i) => {
        const target = targets.find(t => t.id === hit.id) || targets[i];
        if (!target || !hit.freeze) return;
        const real = s.real(hit);
        const F = k.P({ x: target.baseX ?? target.x, y: target.baseY ?? target.y });
        if (real >= 0 && real < 280) {
          const q = real / 280;
          const sp = 4 + Math.round(k.ease(q) * 7);
          for (const [dx, dy] of [
            [1, 0],
            [-1, 0],
            [0.6, -0.5],
            [-0.6, -0.5],
          ]) {
            k.dot(F.x + dx * sp, F.y + dy * sp, GREASE[0], 4);
            k.dot(F.x + dx * sp, F.y + dy * sp, q < 0.5 ? GREASE[5] : GREASE[4], 2);
          }
        }
        k.shards(F, real, GREASE, (s.event.seed || 5) + i * 11, 5, 14);
      });
    },
    linger(s) {
      const hitAt = k.CAST + s.plan.travel;
      const e = Math.max(0, s.c.t - hitAt);
      const expand = 0.55 + 0.45 * k.ease(k.clamp(e / 110));
      drawGreaseSlick(s, s.linger, expand);
    },
  });

  // Earthquake fissure network: 10 long branching cracks reaching all the way to the circle edge, 2 px dark with bright tan edges.
  function quakeRays(seed) {
    const count = 10;
    const rays = [];
    for (let i = 0; i < count; i++) {
      const a = (i / count) * k.tau + (k.hash(i, seed, 1) - 0.5) * 0.34;
      rays.push({
        a,
        lenFrac: 0.94 + k.hash(i, seed, 2) * 0.06,
        bend: (k.hash(i, seed, 3) - 0.5) * 0.24,
        branches: [
          { at: 0.26 + k.hash(i, seed, 4) * 0.1, dir: i % 2 ? 1 : -1, len: 0.3 + k.hash(i, seed, 5) * 0.14 },
          { at: 0.54 + k.hash(i, seed, 6) * 0.12, dir: i % 2 ? -1 : 1, len: 0.28 + k.hash(i, seed, 7) * 0.14 },
          { at: 0.78 + k.hash(i, seed, 8) * 0.08, dir: i % 2 ? 1 : -1, len: 0.18 + k.hash(i, seed, 9) * 0.08 },
        ],
      });
    }
    return rays;
  }

  function earthquakeSprite(R, stage, seed) {
    R = Math.max(24, Math.min(360, Math.round(R)));
    const W = R * 2 + 8;
    const cx = W / 2,
      cy = W / 2;
    const reachFrac = stage === 0 ? 0.42 : stage === 1 ? 0.74 : 1;
    const key = `quake:${R}:${stage}:${seed % 3}`;
    return k.sprite(
      key,
      W,
      W,
      QUAKE,
      set => {
        const rays = quakeRays(seed % 3);
        const segs = [];
        // Build polyline segments for all 10 main fissures and their branches.
        rays.forEach((ray, ri) => {
          const maxL = R * ray.lenFrac * reachFrac;
          const steps = Math.max(8, Math.round(maxL / 10));
          let x = cx,
            y = cy,
            ang = ray.a;
          const pts = [[x, y]];
          for (let s = 1; s <= steps; s++) {
            const u = s / steps;
            const jag = (k.hash(ri * 31 + s, seed % 3, 13) - 0.5) * 0.46;
            ang = ray.a + ray.bend * Math.sin(u * Math.PI) + jag;
            const stepL = maxL / steps;
            x += Math.cos(ang) * stepL;
            y += Math.sin(ang) * stepL;
            pts.push([x, y]);
          }
          for (let s = 0; s < pts.length - 1; s++)
            segs.push({ x0: pts[s][0], y0: pts[s][1], x1: pts[s + 1][0], y1: pts[s + 1][1], main: true, u: s / steps });

          // Branching fissures off each main crack (clamped inside circle R).
          ray.branches.forEach((br, bi) => {
            if (reachFrac < br.at + 0.08) return;
            const idx = Math.min(pts.length - 2, Math.max(1, Math.floor((br.at / reachFrac) * (pts.length - 1))));
            let bx = pts[idx][0],
              by = pts[idx][1];
            const bLen = R * br.len * k.clamp((reachFrac - br.at) / 0.3);
            const bSteps = Math.max(4, Math.round(bLen / 10));
            const baseA = ray.a + br.dir * (0.48 + k.hash(ri, bi, seed % 3) * 0.35);
            for (let s = 1; s <= bSteps; s++) {
              const j = (k.hash(ri * 17 + bi * 7 + s, seed % 3, 19) - 0.5) * 0.42;
              const nx = bx + Math.cos(baseA + j) * (bLen / bSteps);
              const ny = by + Math.sin(baseA + j) * (bLen / bSteps);
              if (Math.hypot(nx - cx, ny - cy) > R) break;
              segs.push({ x0: bx, y0: by, x1: nx, y1: ny, main: false, u: s / bSteps });
              bx = nx;
              by = ny;
            }
          });
        });

        const stroke = (seg, pass) => {
          const d = Math.hypot(seg.x1 - seg.x0, seg.y1 - seg.y0) || 1;
          const n = Math.ceil(d);
          for (let i = 0; i <= n; i++) {
            const t = i / n;
            const ix = Math.round(seg.x0 + (seg.x1 - seg.x0) * t);
            const iy = Math.round(seg.y0 + (seg.y1 - seg.y0) * t);
            const wide = seg.main && seg.u < 0.88;
            if (pass === 0) {
              // Thin 1 px bright tan edge hugging both sides of the 2 px dark fissure.
              if (wide) {
                set(ix - 1, iy - 1, 5);
                set(ix, iy - 1, 5);
                set(ix + 1, iy - 1, 4);
                set(ix - 1, iy, 5);
                set(ix + 2, iy, 4);
                set(ix - 1, iy + 1, 4);
                set(ix + 2, iy + 1, 4);
                set(ix, iy + 2, 4);
                set(ix + 1, iy + 2, 4);
              } else {
                set(ix - 1, iy, 5);
                set(ix, iy - 1, 5);
                set(ix + 1, iy, 4);
                set(ix, iy + 1, 4);
              }
            } else {
              // Crisp 2 px dark fissure core (1 px at outer tips and thin branches).
              set(ix, iy, 0);
              if (wide) {
                set(ix + 1, iy, 0);
                set(ix, iy + 1, 0);
                set(ix + 1, iy + 1, 0);
              }
            }
          }
        };
        // Pass 1: bright tan lips; Pass 2: crisp 2 px dark crack cores (never a dark fill).
        for (const seg of segs) stroke(seg, 0);
        for (const seg of segs) stroke(seg, 1);
      },
      false,
    );
  }

  function quakeCenter(s) {
    if (s.area) return { x: s.area.x, y: s.area.y };
    const ref = s.targets?.[0] || s.pose?.target;
    if (ref) return { x: ref.baseX ?? ref.x, y: ref.baseY ?? ref.y };
    return { x: (s.grid?.cols || 13) / 2, y: (s.grid?.rows || 8) / 2 };
  }

  function drawEarthquakeCracks(s, alpha, stage) {
    if (alpha <= 0) return;
    const cells = (s.area?.feet || 100) / (s.grid?.feet || 5);
    const R = cells * k.PX;
    const C = k.P(quakeCenter(s));
    const seed = s.event.seed || 5;
    const img = earthquakeSprite(R, stage, seed);
    k.blit(img, C.x - img.width / 2, C.y - img.height / 2, alpha);
  }

  // Earthquake: 10 long branching 2 px dark fissures with bright tan edges reaching the full circle edge, dust puffs and quake shake.
  FX.register('earthquake', {
    palette: QUAKE,
    travel: 100,
    reach(event, grid) {
      const r = (event.area?.feet || 100) / (grid.feet || 5);
      return { r: r + 1.5, up: 1.5 };
    },
    beats(event, kit, travel) {
      const ids = event.targets?.length ? event.targets : [null];
      const list = ids.map(target => ({
        at: kit.CAST + travel,
        stop: 120,
        target,
        kind: 'blast',
        power: 0.09,
        shake: [540, 6.2, 1, 0.9],
      }));
      list.push({
        at: kit.CAST + travel + 460,
        stop: 60,
        target: null,
        kind: 'hit',
        power: 0.05,
        shake: [360, 3.8, 1, 0.75],
      });
      return list;
    },
    end: (event, travel) => k.CAST + travel + 1180,
    flash: (event, e) =>
      e < 35 ? { color: '#f5e2bc', alpha: 0.2 } : e < 70 ? { color: '#24180c', alpha: 0.16 } : null,
    ground(s) {
      const { c, plan, event } = s;
      const hitAt = k.CAST + plan.travel;
      if (c.t < hitAt) return;
      const e = c.t - hitAt;
      const stage = e < 120 ? 0 : e < 260 ? 1 : 2;
      if (!(s.pose.linger > 0)) {
        const fade = 1 - k.clamp((e - 900) / 280);
        drawEarthquakeCracks(s, fade, stage);
      }
      const cells = (s.area?.feet || 100) / (s.grid?.feet || 5);
      const R = Math.min(360, cells * k.PX);
      const C = k.P(quakeCenter(s));
      const seed = event.seed || 5;

      // Cheap dashed seismic tremor ring expanding outward (capped to ~48 dots so large areas stay fast).
      if (e < 340) {
        const q = e / 340;
        const r = Math.min(180, R * (0.08 + 0.48 * k.ease(q)));
        const steps = 48;
        for (let i = 0; i < steps; i++) {
          if (q > 0.45 && i % 2 === 1) continue;
          const a = (i / steps) * k.tau;
          const px = C.x + Math.cos(a) * r;
          const py = C.y + Math.sin(a) * r * 0.78;
          k.dot(px, py, QUAKE[0], 3);
          k.dot(px, py, q < 0.35 ? QUAKE[5] : QUAKE[4], 1);
        }
      }

      // Light tan dust puffs erupting along the radiating fissure lines across the whole area.
      const rays = quakeRays(seed % 3);
      for (let i = 0; i < 18; i++) {
        const ray = rays[i % rays.length];
        const delay = (i % 4) * 70;
        const life = k.clamp((e - delay) / 680);
        if (life <= 0 || life >= 1) continue;
        const dist = R * (0.08 + 0.56 * k.hash(i, seed, 31));
        const px = C.x + Math.cos(ray.a) * dist;
        const py = C.y + Math.sin(ray.a) * dist - k.ease(life) * 9;
        const r = (3 + k.hash(i, seed, 32) * 2.5) * (1 - life * 0.45);
        if (r < 1) continue;
        k.disc(px, py, r + 1, QUAKE[0]);
        k.disc(px, py, r, life < 0.5 ? QUAKE[5] : QUAKE[4]);
        k.dot(px + 1, py + 1, QUAKE[3], 1);
      }
    },
    air(s) {
      const { hits, targets, event } = s;
      const seed = event.seed || 5;
      // Bouncing pebble shards on targets + center tremor dust on real time.
      const C = k.P(quakeCenter(s));
      if (hits[0]?.freeze) k.shards(C, s.real(hits[0]), QUAKE, seed + 2, 10, 34);
      hits.forEach((hit, i) => {
        if (!hit.id || !hit.freeze) return;
        const target = targets.find(t => t.id === hit.id);
        if (!target) return;
        const F = k.P({ x: target.baseX ?? target.x, y: target.baseY ?? target.y });
        k.shards(F, s.real(hit), QUAKE, seed + 17 + i * 5, 5, 16);
      });
    },
    linger(s) {
      const hitAt = k.CAST + s.plan.travel;
      const e = Math.max(0, s.c.t - hitAt);
      const stage = e < 120 ? 0 : e < 260 ? 1 : 2;
      drawEarthquakeCracks(s, s.linger, stage);
      // Calm settling dust wisps along the fissures while the earthquake lasts.
      if (s.linger < 0.25) return;
      const cells = (s.area?.feet || 100) / (s.grid?.feet || 5);
      const R = Math.min(360, cells * k.PX);
      const C = k.P(quakeCenter(s));
      const seed = s.event.seed || 5;
      const rays = quakeRays(seed % 3);
      const cyc = (s.c.raw / 2400) % 1;
      for (let i = 0; i < 8; i++) {
        const q = (cyc + i / 8) % 1;
        const ray = rays[(i * 3) % rays.length];
        const dist = R * (0.14 + 0.74 * k.hash(i, seed, 41));
        const px = C.x + Math.cos(ray.a) * dist + Math.sin(q * k.tau + i) * 1.5;
        const py = C.y + Math.sin(ray.a) * dist - q * 7;
        const sz = q < 0.55 ? 2 : 1;
        k.dot(px, py, QUAKE[0], sz + 2);
        k.dot(px, py, q < 0.4 ? QUAKE[4] : QUAKE[3], sz);
      }
    },
  });

  // Hand-crafted chunky bone-white skeleton sprites (full standing height = 26 art px = 1.6 squares!).
  const SKEL_CLAW_MAP = [
    '........................',
    '........4555554.........',
    '.......455555554........',
    '.......455555554........',
    '.......417747714........',
    '.......444111444........',
    '........3434343.........',
    '....455444333444554.....',
    '...4543.4555554.3454....',
    '..454...3147413...454...',
    '.5544...4555554...4455..',
    '.4543...3147413...3454..',
    '.443.....34343.....344..',
    '........................',
  ];
  const SKEL_STAND_MAP = [
    '........................',
    '........4555554.........',
    '.......455555554........',
    '.......455555554........',
    '.......417747714........',
    '.......417747714........',
    '.......444111444........',
    '........3434343.........',
    '.........34443..........',
    '....455544444445554.....',
    '...4554.4555554.4554....',
    '..454...3147413...454...',
    '.554....4557554....455..',
    '.4543...3147413...3454..',
    '.443....4555554....344..',
    '........3144413.........',
    '.........34443..........',
    '.......445444544........',
    '......44543334544.......',
    '......443.....344.......',
    '......454.....454.......',
    '......443.....344.......',
    '......454.....454.......',
    '......443.....344.......',
    '.....4554.....4554......',
    '.....3333.....3333......',
  ];
  function skeletonSprite(pose, glowBright) {
    const map = pose === 'claw' ? SKEL_CLAW_MAP : SKEL_STAND_MAP;
    const h = map.length,
      w = map[0].length;
    const key = `skel:${pose}:${glowBright ? 1 : 0}`;
    return k.sprite(
      key,
      w,
      h,
      SKEL_PAL,
      set => {
        for (let y = 0; y < h; y++) {
          const row = map[y];
          for (let x = 0; x < w; x++) {
            const ch = row[x];
            if (ch === '.') continue;
            let idx = Number(ch);
            if (idx === 7 && glowBright) idx = 8;
            set(x, y, idx);
          }
        }
      },
      true,
    );
  }

  // Cached grave opening sprite: a square and a half across (26x14 art px) with bright necrotic green rim light.
  function graveSprite(openFrac, brightRim) {
    const W = 30,
      H = 18;
    const step = openFrac < 0.5 ? 0 : openFrac < 0.85 ? 1 : 2;
    const key = `grave:${step}:${brightRim ? 1 : 0}`;
    const pal = ['#09160d', '#14110f', '#2c221b', '#267838', '#5cff72', '#b8ffae', '#ffffff'];
    return k.sprite(
      key,
      W,
      H,
      pal,
      set => {
        const cx = W / 2,
          cy = H / 2;
        const rx = step === 0 ? 7 : step === 1 ? 10.5 : 12.5;
        const ry = step === 0 ? 3.5 : step === 1 ? 5.2 : 6.4;
        for (let y = 0; y < H; y++) {
          for (let x = 0; x < W; x++) {
            const dx = (x + 0.5 - cx) / rx;
            const dy = (y + 0.5 - cy) / ry;
            const jag = 1 + 0.12 * Math.sin(Math.atan2(dy, dx) * 5 + 0.7);
            const d = Math.hypot(dx, dy) / jag;
            if (d > 1.16) continue;
            if (d < 0.72) set(x, y, d < 0.38 ? 1 : 2);
            else if (d < 0.94) set(x, y, brightRim ? 5 : 4);
            else if (d < 1.06) set(x, y, brightRim ? 6 : 5);
            else set(x, y, 3);
          }
        }
      },
      true,
    );
  }

  // Animate Dead: 1.5-square green-rimmed grave opens on the floor, a 1.5-square bone-white skeleton claws up and stands with rising green soul motes.
  FX.register('animate-dead', {
    palette: NECRO,
    travel: 160,
    reach: () => ({ r: 2.2, up: 2.5 }),
    beats(event, kit, travel) {
      const target = event.targets?.[0] ?? null;
      return [
        { at: kit.CAST + travel, stop: 55, target, kind: 'soft', power: 0.03 },
        { at: kit.CAST + travel + 380, stop: 100, target, kind: 'hit', power: 0.05 },
      ];
    },
    end: (event, travel) => k.CAST + travel + 1280,
    ground(s) {
      const { c, plan, targets, area, pose } = s;
      const hitAt = k.CAST + plan.travel;
      if (c.t < hitAt) return;
      const e = c.t - hitAt;
      const pt = area
        ? { x: area.x, y: area.y }
        : targets[0]
          ? { x: targets[0].baseX ?? targets[0].x, y: targets[0].baseY ?? targets[0].y }
          : pose.target;
      if (!pt) return;
      const P0 = k.P(pt);
      const openFrac = e < 120 ? e / 120 : e > 1060 ? 1 - k.clamp((e - 1060) / 220) : 1;
      if (openFrac <= 0.05) return;
      const brightRim = (e >= 360 && e < 520) || Math.floor(c.raw / 130) % 2 === 0;
      const img = graveSprite(openFrac, brightRim);
      k.blit(img, P0.x - img.width / 2, P0.y - img.height / 2, e > 1120 ? 1 - (e - 1120) / 160 : 1);

      // Floor necrotic green rim ring pulsing around the grave opening.
      if (e < 1050) {
        const pulse = Math.sin(c.raw / 110) * 1.2;
        const rx = 13.5 * openFrac + pulse;
        const ry = 7 * openFrac + pulse * 0.5;
        k.ellipse(P0.x, P0.y, rx, ry, NECRO[0], 3, e > 860 ? 6 : 0);
        k.ellipse(P0.x, P0.y, rx, ry, e > 360 && e < 520 ? k.WHITE : NECRO[4], 1, e > 860 ? 6 : 0);
      }
    },
    air(s) {
      const { pose, c, plan, targets, area, hits, event } = s;
      const hitAt = k.CAST + plan.travel;
      const pt = area
        ? { x: area.x, y: area.y }
        : targets[0]
          ? { x: targets[0].baseX ?? targets[0].x, y: targets[0].baseY ?? targets[0].y }
          : pose.target;
      if (!pt) return;
      const P0 = k.P(pt);
      const seed = event.seed || 9;

      // Cast bolt snapping necrotic green energy from hand to the grave spot.
      if (c.t >= k.CAST && c.t < hitAt && pose.hand) {
        const H = k.P(pose.hand);
        const q = (c.t - k.CAST) / (hitAt - k.CAST);
        for (let i = 6; i >= 0; i--) {
          const u = q - i * 0.04;
          if (u <= 0) continue;
          const x = k.mix(H.x, P0.x, u);
          const y = k.mix(H.y, P0.y, u) - Math.sin(u * Math.PI) * 10;
          k.dot(x, y, NECRO[0], i < 2 ? 5 : 4);
          k.dot(x, y, i < 2 ? NECRO[5] : NECRO[3], i < 2 ? 3 : 2);
        }
        return;
      }
      if (c.t < hitAt) return;
      const e = c.t - hitAt;

      // Act 1 (50..380 ms): Skeleton claws up out of the grave opening.
      // Act 2 (380..940 ms): Full 1.5-square-tall bone-white skeleton stands proudly at peak!
      // Act 3 (940..1240 ms): Clean stepped settle.
      const eyeBright = Math.floor(c.raw / 120) % 2 === 0 || (e >= 370 && e < 520);
      if (e >= 40 && e < 340) {
        const q = k.ease(k.clamp((e - 40) / 280));
        const img = skeletonSprite('claw', eyeBright);
        const yOff = k.mix(3, -10, q);
        k.blit(img, P0.x - img.width / 2, P0.y + yOff - img.height * 0.45);
      } else if (e >= 340 && e < 1240) {
        const rise = k.ease(k.clamp((e - 340) / 110));
        const bob = e > 450 && e < 960 ? Math.round(Math.sin((e - 450) / 110) * 1) : 0;
        const alpha = e < 960 ? 1 : 1 - k.clamp((e - 960) / 280);
        const img = skeletonSprite('stand', eyeBright);
        const feetY = k.mix(P0.y + 6, P0.y + 1, rise) + bob;
        k.blit(img, P0.x - img.width / 2, feetY - img.height, alpha);
      }

      // Rising green soul motes orbiting and drifting upward around the skeleton.
      if (e >= 60 && e < 1220) {
        for (let i = 0; i < 12; i++) {
          const delay = (i % 6) * 110;
          const life = k.clamp((e - 60 - delay) / 680);
          if (life <= 0 || life >= 1) continue;
          const ang = k.hash(i, seed, 2) * k.tau + life * 2.4;
          const rad = 7 + k.hash(i, seed, 3) * 8;
          const mx = P0.x + Math.cos(ang) * rad;
          const my = P0.y - 2 - k.ease(life) * 28;
          const sz = life < 0.65 ? 2 : 1;
          k.dot(mx, my, NECRO[0], sz + 2);
          k.dot(mx, my, life < 0.35 ? k.WHITE : NECRO[4], sz);
        }
      }

      // Necrotic burst hit mark when skeleton rises to full height on Beat 2.
      if (hits[1]?.freeze) {
        const real = s.real(hits[1]);
        const style = k.hitStyle('animate-dead', NECRO, { S: 36, spikes: 6, jag: 0.3 });
        k.drawHit(style, { x: P0.x, y: P0.y - 14 }, real);
      }
    },
  });

  // Cached bright violet pocket portal sprite: a whole square across (20x20 with white rim & dark outline).
  function pocketPortalSprite(r, frame) {
    r = Math.max(4, Math.round(r));
    const S = r * 2 + 6;
    const cx = S / 2,
      cy = S / 2;
    const key = `pocket-portal:${r}:${frame}`;
    return k.sprite(
      key,
      S,
      S,
      POCKET,
      set => {
        for (let y = 0; y < S; y++) {
          for (let x = 0; x < S; x++) {
            const dx = x + 0.5 - cx,
              dy = y + 0.5 - cy;
            const d = Math.hypot(dx, dy);
            if (d > r) continue;
            if (d >= r - 2.1) {
              set(x, y, 5); // bold 2 px white rim
              continue;
            }
            const a = Math.atan2(dy, dx) + frame * 0.9 + (1 - d / r) * 2.2;
            const swirl = Math.sin(a * 3) * 0.5 + 0.5;
            if (d < r * 0.28) set(x, y, 1);
            else if (d < r * 0.55) set(x, y, swirl > 0.45 ? 3 : 2);
            else set(x, y, swirl > 0.4 ? 4 : 3);
          }
        }
      },
      true,
    );
  }

  // Cached outlined object glyph (an ornate golden relic key, a whole square tall = 16 px).
  const RELIC_MAP = [
    '....3443....',
    '...455554...',
    '..454..454..',
    '..45....54..',
    '..454..454..',
    '...455554...',
    '....3443....',
    '..34555543..',
    '....4554....',
    '....3454....',
    '....34543...',
    '....345554..',
    '....3454....',
    '....345554..',
    '....34443...',
    '.....333....',
  ];
  function relicGlyphSprite() {
    const h = RELIC_MAP.length,
      w = RELIC_MAP[0].length;
    return k.sprite(
      'wristpocket-relic',
      w,
      h,
      RELIC,
      set => {
        for (let y = 0; y < h; y++)
          for (let x = 0; x < w; x++) {
            const ch = RELIC_MAP[y][x];
            if (ch !== '.') set(x, y, Number(ch));
          }
      },
      true,
    );
  }

  // Cached held white snap-shut flash star (razor-sharp tapered 4-point starburst, dark outline).
  function snapFlashSprite(pinch) {
    const S = 28,
      c = S / 2;
    const key = `wristpocket-flash:${pinch}`;
    return k.sprite(
      key,
      S,
      S,
      POCKET,
      set => {
        const reach = pinch === 0 ? 12.5 : pinch === 1 ? 9.5 : 5.5;
        const core = pinch === 0 ? 5.2 : pinch === 1 ? 3.4 : 2;
        for (let y = 0; y < S; y++) {
          for (let x = 0; x < S; x++) {
            const dx = Math.abs(x + 0.5 - c),
              dy = Math.abs(y + 0.5 - c);
            const d = Math.hypot(dx, dy);
            const taperX = dx < reach && dy < Math.max(0.7, (1 - dx / reach) * (pinch === 0 ? 3.2 : 2.1));
            const taperY = dy < reach && dx < Math.max(0.7, (1 - dy / reach) * (pinch === 0 ? 3.2 : 2.1));
            const diag = pinch === 0 && Math.abs(dx - dy) < 1.0 && d < reach * 0.58;
            if (d < core) set(x, y, 5);
            else if (taperX || taperY) set(x, y, d < reach * 0.72 ? 5 : 4);
            else if (diag) set(x, y, 4);
          }
        }
      },
      true,
    );
  }

  // Wristpocket: full-square bright violet portal opens beside caster, full-square object glyph spins in, snaps shut in held white flash, small violet ring stays and fades.
  FX.register('wristpocket', {
    palette: POCKET,
    travel: 60,
    reach: () => ({ r: 2.2, up: 1.8 }),
    beats: (event, kit, travel) => [
      { at: kit.CAST + travel, stop: 40, target: null, kind: 'soft', power: 0 },
      { at: kit.CAST + travel + 520, stop: 120, target: null, kind: 'soft', power: 0 },
    ],
    end: (event, travel) => k.CAST + travel + 1080,
    ground(s) {
      const { pose, c, plan } = s;
      const openAt = k.CAST + plan.travel;
      if (c.t < openAt || !pose.base) return;
      const e = c.t - openAt;
      if (e > 980) return;
      // Subtle floor violet glow directly beneath the floating pocket portal beside the caster.
      const base = pose.hand || pose.base;
      const G = k.P({ x: base.x + 0.95, y: pose.base.y });
      const alpha = e < 560 ? 1 : 1 - k.clamp((e - 560) / 380);
      if (alpha < 0.2) return;
      const rx = 8 * (e < 100 ? k.ease(e / 100) : 1);
      k.ellipse(G.x, G.y, rx, rx * 0.45, POCKET[0], 2, alpha < 0.55 ? 6 : 0);
      k.ellipse(G.x, G.y, rx, rx * 0.45, POCKET[3], 1, alpha < 0.55 ? 6 : 0);
    },
    air(s) {
      const { pose, c, plan } = s;
      const openAt = k.CAST + plan.travel;
      if (c.t < openAt) return;
      const anchor = pose.hand || pose.base || pose.target;
      if (!anchor) return;
      const e = c.t - openAt;
      // Portal sits right beside the caster's wrist/hand.
      const P0 = k.P({ x: anchor.x + 0.95, y: anchor.y - 0.12 });

      // Act 1 & 2 (0..520 ms): Full-square bright violet portal (radius 8.5 -> 17-19 px across) opens and swirls while the 16 px object glyph spins into it.
      if (e < 520) {
        const openK = k.ease(k.clamp(e / 85));
        const r = Math.max(4, Math.round(9 * openK));
        const frame = Math.floor(c.raw / 95) % 4;
        const portal = pocketPortalSprite(r, frame);
        k.blit(portal, P0.x - portal.width / 2, P0.y - portal.height / 2);

        // Outlined 16 px object glyph appears just beside/above the portal and spins straight into it.
        if (e >= 40) {
          const spinK = k.clamp((e - 120) / 380);
          const dist = k.mix(15, 0, k.ease(spinK));
          const orbit = k.mix(-0.55, 0.9, spinK);
          const gx = P0.x + Math.cos(orbit) * dist;
          const gy = P0.y + Math.sin(orbit) * dist - (1 - spinK) * 4;
          const angle = spinK * k.tau * 1.5;
          const glyph = relicGlyphSprite();
          if (e < 495) k.blitRotated(glyph, gx, gy, angle, 0.5, 0.5);
        }
        return;
      }

      // Act 3 (520..700 ms + 120 ms hitstop): Portal snaps shut with a held white flash!
      if (e < 710) {
        const pinch = e < 610 ? 0 : e < 665 ? 1 : 2;
        const flashImg = snapFlashSprite(pinch);
        k.blit(flashImg, P0.x - flashImg.width / 2, P0.y - flashImg.height / 2);
        return;
      }

      // Act 4 (710..1080 ms): A small violet ring stays calmly for a moment and fades cleanly. No scattered specks.
      const ringE = e - 710;
      if (ringE < 360) {
        const fade = ringE < 200 ? 0 : (ringE - 200) / 160;
        const r = 6 + fade * 1.5;
        const gap = fade > 0.45 ? 6 : 0;
        k.ellipse(P0.x, P0.y, r, r, POCKET[0], fade > 0.5 ? 2 : 4, gap);
        k.ellipse(P0.x, P0.y, r, r, fade < 0.35 ? POCKET[4] : POCKET[3], fade > 0.5 ? 1 : 2, gap);
      }
    },
  });

  // Cached shimmering veil sprite: a square and a half tall (22x26 art px), flowing silk curtain with rippling white & pale violet bands and dark outline.
  function seemingVeilSprite(frame, palKey, pal) {
    const W = 22,
      H = 26;
    const key = `seeming-veil:${palKey}:${frame}`;
    return k.sprite(
      key,
      W,
      H,
      pal,
      set => {
        const cx = W / 2;
        for (let y = 1; y < H - 1; y++) {
          const u = (y - 1) / (H - 3);
          // Flowing silk shroud: gentle curved mantle at top, softly billowing folds down to a scalloped veil hem.
          const halfW = u < 0.16 ? 5.4 + (u / 0.16) * 2.4 : 7.8 + Math.sin(u * Math.PI) * 1.4 + u * 0.8;
          const sway = Math.sin(u * Math.PI * 1.6 + frame * 1.57) * 0.9;
          for (let x = 1; x < W - 1; x++) {
            const dx = x + 0.5 - (cx + sway);
            if (Math.abs(dx) > halfW) continue;
            const hem = H - 2 - Math.round((Math.sin((dx / halfW) * Math.PI * 3 + frame * 0.9) * 0.5 + 0.5) * 2.5);
            if (y > hem) continue;
            // Rippling diagonal shimmer bands of pure white and pale violet + vertical curtain folds.
            const wave = Math.sin(y * 0.55 - frame * 1.57 + dx * 0.34);
            const fold = Math.abs(Math.sin((dx / halfW) * Math.PI * 2.5));
            let idx = wave > 0.38 ? 5 : wave > -0.2 ? 4 : 3;
            if (fold < 0.15 && idx > 3) idx -= 1;
            else if (Math.abs(dx) > halfW - 1.3 && idx === 3) idx = 2;
            set(x, y, idx);
          }
        }
      },
      true,
    );
  }

  // Cached dithered glamour tint wash over the token body (18x22 art px) so the token visibly changes tint for a moment.
  function glamourTintSprite(palKey, pal) {
    const W = 18,
      H = 22;
    const key = `seeming-tint:${palKey}`;
    return k.sprite(
      key,
      W,
      H,
      pal,
      set => {
        const cx = W / 2;
        for (let y = 1; y < H - 1; y++) {
          const u = (y - 1) / (H - 3);
          const halfW = u < 0.28 ? 4.5 + u * 5 : 6.2 + (1 - u) * 1.2;
          for (let x = 1; x < W - 1; x++) {
            const dx = Math.abs(x + 0.5 - cx);
            if (dx > halfW) continue;
            // Crisp rim all around + ordered dithered interior wash so the token remains visible underneath with a changed tint!
            if (dx > halfW - 1.3 || y <= 2 || y >= H - 3) set(x, y, 4);
            else if ((x + y) % 2 === 0) set(x, y, u < 0.45 ? 4 : 3);
          }
        }
      },
      false,
    );
  }

  // Seeming: 1.5-square-tall shimmering white and pale violet veil drops over each target, ripples at peak, shifts the token's tint, then settles.
  FX.register('seeming', {
    palette: SEEMING,
    travel: 100,
    reach: () => ({ r: 1.8, up: 2.4 }),
    beats(event, kit, travel) {
      const ids = event.targets?.length ? event.targets : [null];
      return ids.map(target => ({
        at: kit.CAST + travel + 160,
        stop: 80,
        target,
        kind: 'soft',
        power: 0.03,
      }));
    },
    end: (event, travel) => k.CAST + travel + 1150,
    ground(s) {
      const { c, plan, targets } = s;
      const start = k.CAST + plan.travel;
      if (c.t < start) return;
      const e = c.t - start;
      const list = targets.length ? targets : s.pose.target ? [s.pose.target] : [];
      for (const target of list) {
        const F = k.P({ x: target.baseX ?? target.x, y: target.baseY ?? target.y });
        const fade = e < 860 ? 1 : 1 - k.clamp((e - 860) / 280);
        if (fade <= 0.1) continue;
        const rx = 10 * (e < 140 ? 0.5 + 0.5 * k.ease(e / 140) : 1);
        const col = e >= 420 && e < 760 ? (e < 590 ? TINT_CYAN[4] : TINT_GOLD[4]) : SEEMING[4];
        k.ellipse(F.x, F.y, rx, rx * 0.52, SEEMING[0], 3, fade < 0.55 ? 6 : 0);
        k.ellipse(F.x, F.y, rx, rx * 0.52, col, 1, fade < 0.55 ? 6 : 0);
      }
    },
    air(s) {
      const { c, plan, targets, hits } = s;
      const start = k.CAST + plan.travel;
      if (c.t < start) return;
      const e = c.t - start;
      const list = targets.length ? targets : s.pose.target ? [s.pose.target] : [];
      const frame = Math.floor(c.raw / 70) % 4;

      list.forEach((target, i) => {
        const F = k.P({ x: target.baseX ?? target.x, y: target.baseY ?? target.y });

        // Act 1 (0..160 ms): Veil drops down over the entire token.
        // Act 2 (160..580 ms): Veil holds full 26 px height over the token while its colours ripple & shift.
        // Act 3 (580..740 ms): Veil lifts and fades to reveal the token's changed tint.
        if (e < 740) {
          const drop = e < 160 ? k.mix(-14, 2, k.ease(e / 160)) : e > 580 ? k.mix(2, -7, (e - 580) / 160) : 2;
          const alpha = e < 580 ? 1 : 1 - k.clamp((e - 580) / 160);
          // Colours ripple from pale violet -> pearlescent cyan -> warm gold during the second half of the peak.
          const palChoice =
            e < 360 ? ['v', SEEMING] : e < 490 ? ['c', TINT_CYAN] : e < 620 ? ['g', TINT_GOLD] : ['v', SEEMING];
          const veil = seemingVeilSprite(frame, palChoice[0], palChoice[1]);
          k.blit(veil, F.x - veil.width / 2, F.y + drop - veil.height, alpha);
        }

        // Token tint change: visible glamour tint wash over the token's body for a moment before settling.
        if (e >= 520 && e < 1040) {
          const tintChoice = e < 690 ? ['c', TINT_CYAN] : e < 860 ? ['g', TINT_GOLD] : ['v', SEEMING];
          const tintAlpha = e < 860 ? 0.75 : 0.75 * (1 - k.clamp((e - 860) / 180));
          const tint = glamourTintSprite(tintChoice[0], tintChoice[1]);
          k.blit(tint, F.x - tint.width / 2, F.y - tint.height + 1, tintAlpha);
        }

        // Delicate shimmering diamond glint at the veil's crown on the beat (no heavy cross bars).
        const hit = hits.find(h => h.id === target.id) || hits[i] || hits[0];
        if (hit?.freeze) {
          const real = s.real(hit);
          if (real >= 0 && real < 260) {
            const q = real / 260;
            const gy = F.y - 24;
            const reach = Math.round(3 + Math.sin(q * Math.PI) * 4);
            k.dot(F.x, gy, SEEMING[0], 5);
            k.dot(F.x, gy, k.WHITE, 3);
            for (let j = 2; j <= reach; j++) {
              const col = j < reach - 1 ? k.WHITE : SEEMING[4];
              k.dot(F.x + j, gy, col, 1);
              k.dot(F.x - j, gy, col, 1);
              k.dot(F.x, gy + j, col, 1);
              k.dot(F.x, gy - j, col, 1);
            }
          }
        }
      });
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
