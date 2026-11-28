/* Pixel spells, batch 51: rebuilt for readable silhouettes and held peaks. */
(function (root) {
  'use strict';
  const FX = root.BoardPixelFX;
  if (!FX) return;
  const k = FX.kit;
  const VEIL = ['#211d32', '#4b435e', '#827a98', '#b8afce', '#e6dff3', '#ffffff'];
  const VIOLET = ['#211231', '#51317d', '#9560db', '#c99aff', '#f1dfff', '#ffffff'];
  const LEAF = ['#13251a', '#285135', '#419757', '#8de868', '#e6ffab', '#ffffff'];
  const GOLD = ['#302116', '#795023', '#c59835', '#ffdb68', '#fff3b2', '#ffffff'];
  const HEAL = ['#142b24', '#317450', '#6bc87a', '#b7f58b', '#ffed99', '#ffffff'];
  const SPIRIT = ['#172935', '#3c6277', '#6b9eaf', '#afe5df', '#e4fff4', '#ffffff'];
  const TIME = ['#18293c', '#355778', '#649abe', '#a9dcf5', '#e3f8ff', '#ffffff'];
  const CHAIN = ['#22182d', '#493451', '#705571', '#a58aa7', '#debed8', '#ffffff'];
  const PRISM = ['#291832', '#b393ff', '#ff78df', '#68e8fa', '#ffe78a', '#fff6ff'];
  const elapsed = s => s.c.t - k.CAST;
  const tail = (e, hold, end) => 1 - k.clamp((e - hold) / (end - hold));
  const base = s => s.pose.base || s.pose.hand || s.pose.target || { x: 0, y: 0 };
  const caster = s => {
    const b = base(s);
    return { x: b.x, y: b.y - 0.62 * (b.span || 1), span: b.span || 1 };
  };
  const recipients = s => (s.targets.length ? s.targets : [s.pose.target || caster(s)]);
  const feet = t => ({ x: t.baseX ?? t.x, y: t.baseY ?? t.y + 0.62 * (t.span || 1) });
  function beats(event, kit, travel) {
    return (event.targets?.length ? event.targets : [null]).map(target => ({
      at: kit.CAST + travel,
      stop: 85,
      target,
      kind: 'soft',
      power: 0.04,
    }));
  }
  const selfBeat = (event, kit, travel) => [
    { at: kit.CAST + travel, stop: 90, target: event.caster ?? null, kind: 'soft', power: 0.04 },
  ];
  function image(img, p, alpha = 1) {
    k.blit(img, p.x - img.width / 2, p.y - img.height / 2, alpha);
  }
  function stroke(a, b, ramp, width = 2, index = 4) {
    const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 2));
    for (const [color, size] of [
      [ramp[0], width + 2],
      [ramp[index], width],
    ])
      for (let j = 0; j <= steps; j++) k.dot(k.mix(a.x, b.x, j / steps), k.mix(a.y, b.y, j / steps), color, size);
  }
  function ring(p, rx, ry, ramp, index = 4, width = 2) {
    k.ellipse(p.x, p.y, rx, ry, ramp[0], width + 2);
    k.ellipse(p.x, p.y, rx, ry, ramp[index], width);
  }
  function spark(p, ramp, size = 3) {
    k.dot(p.x, p.y, ramp[0], size + 4);
    k.dot(p.x, p.y, ramp[4], size + 2);
    k.dot(p.x, p.y, ramp[5], size);
  }
  function impact(s, ramp, key, self = false) {
    s.hits.forEach((hit, i) => {
      const t = self ? caster(s) : s.targets.find(t => t.id === hit.id) || recipients(s)[i % recipients(s).length];
      const p = k.P(t),
        e = s.real(hit);
      k.drawHit(k.hitStyle('b51:' + key + ':' + ramp.join(''), ramp, { S: 24, spikes: 4, jag: 0.12 }), p, e);
      k.shards(p, e, ramp, (s.event.seed || 0) + i * 17, 6, 15);
    });
  }
  function motes(s, p, ramp, n, radius) {
    for (let i = 0; i < n; i++) {
      const a = (i * k.tau) / n + s.c.raw / 720;
      spark({ x: p.x + Math.cos(a) * radius, y: p.y + Math.sin(a) * radius * 0.7 }, ramp, 1);
    }
  }

  // Cached icons use two-pixel structural strokes; the kit adds their dark outer silhouette.
  function icon(name, ramp, frame = 0) {
    const sizes = {
      eye: [26, 18],
      bubble: [28, 24],
      banner: [32, 30],
      chevron: [16, 14],
      spirit: [14, 18],
      plus: [22, 22],
      clock: [24, 26],
      envelope: [26, 26],
      flower: [24, 30],
      word: [28, 16],
      ghost: [28, 36],
      element: [24, 28],
    };
    const [w, h] = sizes[name];
    return k.sprite('b51:icon:' + name + ':' + frame + ':' + ramp.join(''), w, h, ramp, set => {
      const rect = (x, y, rw, rh, c) => {
        for (let yy = y; yy < y + rh; yy++) for (let xx = x; xx < x + rw; xx++) set(xx, yy, c);
      };
      const line = (x, y, xx, yy, c, width = 2) => {
        const n = Math.max(1, Math.ceil(Math.hypot(xx - x, yy - y)));
        for (let j = 0; j <= n; j++)
          rect(Math.round(k.mix(x, xx, j / n)), Math.round(k.mix(y, yy, j / n)), width, width, c);
      };
      const oval = (cx, cy, rx, ry, c) => {
        for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
          for (let x = Math.floor(cx - rx); x <= cx + rx; x++)
            if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) set(x, y, c);
      };
      if (name === 'eye') {
        const opening = [6, 4, 2, 0][frame % 4];
        for (let x = 3; x <= 22; x++) {
          const d = Math.round(Math.sin(((x - 3) / 19) * Math.PI) * opening);
          line(x, 8 - d, x, 8 + d, 4, 1);
          rect(x, 7 - d, 1, 2, 3);
          rect(x, 8 + d, 1, 2, 3);
        }
        if (opening > 2) {
          oval(13, 8, 4, opening - 1, 2);
          rect(12, 5, 2, 7, 1);
          rect(14, 5, 2, 2, 5);
        } else for (let i = 0; i < 3; i++) line(6 + i * 6, 10, 4 + i * 6, 13, 3);
      } else if (name === 'bubble') {
        rect(4, 2, 20, 16, 4);
        rect(2, 5, 24, 10, 4);
        line(8, 17, 5, 21, 4, 3);
        rect(5, 3, 17, 2, 5);
        const runes = [
          [
            [0, 6, 2, 0],
            [2, 0, 4, 6],
            [1, 4, 4, 4],
          ],
          [
            [0, 0, 4, 0],
            [2, 0, 2, 6],
            [0, 6, 4, 6],
          ],
          [
            [0, 0, 0, 6],
            [0, 0, 4, 3],
            [4, 3, 0, 6],
          ],
          [
            [0, 0, 4, 0],
            [4, 0, 0, 6],
            [0, 6, 4, 6],
          ],
        ];
        for (let i = 0; i < 3; i++)
          for (const l of runes[(frame + i) % 4]) line(5 + i * 6 + l[0], 7 + l[1], 5 + i * 6 + l[2], 7 + l[3], 1, 1);
      } else if (name === 'banner') {
        rect(4, 3, 2, 25, 4);
        oval(5, 3, 3, 2, 5);
        for (let x = 7; x < 28; x++) {
          const wave = Math.round(Math.sin((x - 7) / 7 + frame) * 2);
          rect(x, 5 + wave, 1, 15 - (x > 23 ? x - 23 : 0), 3);
          rect(x, 5 + wave, 1, 2, 5);
        }
        line(15, 15, 19, 9, 5, 3);
        line(19, 9, 23, 15, 5, 3);
        rect(18, 11, 3, 8, 4);
        line(2, 27, 9, 27, 3);
      } else if (name === 'chevron') {
        for (let i = 0; i < 2; i++) {
          line(3, 6 + i * 5, 7, 2 + i * 5, 4);
          line(7, 2 + i * 5, 11, 6 + i * 5, 4);
        }
      } else if (name === 'spirit') {
        oval(6, 6, 4, 5, 3);
        oval(5, 5, 3, 3, 4);
        for (let y = 8; y < 16; y++) {
          const x = 3 + Math.round(Math.sin(y * 0.6 + frame) * 2);
          rect(x, y, Math.max(2, 9 - y / 2), 1, y < 12 ? 3 : 2);
        }
        rect(4, 5, 2, 2, 1);
        rect(8, 5, 2, 2, 1);
        rect(6, 8, 2, 3, 1);
      } else if (name === 'plus') {
        rect(8, 2, 6, 18, 3);
        rect(2, 8, 18, 6, 3);
        rect(9, 3, 3, 16, 5);
        rect(3, 9, 16, 3, 4);
      } else if (name === 'clock') {
        oval(11, 14, 10, 10, 3);
        oval(11, 14, 8, 8, 4);
        oval(11, 14, 6, 6, 2);
        rect(9, 1, 5, 3, 4);
        rect(10, 3, 3, 3, 3);
        for (let j = 0; j < 4; j++) {
          const a = (j * Math.PI) / 2;
          rect(Math.round(11 + Math.cos(a) * 7), Math.round(14 + Math.sin(a) * 7), 2, 2, 5);
        }
        line(11, 14, 11, 8, 5);
        line(11, 14, 16, 16 - frame, 5);
        rect(10, 13, 3, 3, 4);
      } else if (name === 'envelope') {
        rect(3, 10, 20, 13, 3);
        rect(4, 11, 18, 11, 4);
        if (frame === 0) {
          line(4, 11, 12, 17, 2);
          line(12, 17, 21, 11, 2);
        } else {
          const top = frame === 1 ? 8 : 2;
          for (let y = top; y < 12; y++) {
            const half = Math.round(((y - top) / (12 - top)) * 9);
            rect(12 - half, y, half * 2 + 1, 1, 3);
          }
          rect(7, frame === 1 ? 10 : 6, 12, 12, 5);
          rect(9, frame === 1 ? 11 : 8, 8, 2, 2);
          rect(9, frame === 1 ? 14 : 12, 6, 2, 3);
        }
        line(4, 21, 10, 17, 3);
        line(15, 17, 21, 21, 3);
      } else if (name === 'flower') {
        rect(11, 14, 3, 14, 3);
        oval(7, 23, 5, 3, 3);
        oval(17, 20, 5, 3, 3);
        for (let i = 0; i < 6; i++) {
          const a = (i * k.tau) / 6;
          oval(12 + Math.cos(a) * 6, 10 + Math.sin(a) * 6, 4, 4, 4);
        }
        oval(12, 10, 5, 5, 3);
        rect(9, 8, 2, 2, 1);
        rect(14, 8, 2, 2, 1);
        rect(10, 12, 5, 2, 1);
        rect(11, 13, 3, 2, 5);
      } else if (name === 'word') {
        line(3, 3, 6, 12, 4);
        line(6, 12, 9, 3, 5);
        rect(13, 3, 3, 10, 5);
        rect(12, 2, 5, 2, 4);
        rect(12, 12, 5, 2, 4);
        rect(19, 2, 7, 3, 4);
        rect(21, 4, 3, 10, 5);
      } else if (name === 'ghost') {
        // An opaque ethereal shutter covers the painted figure; the pale double dissolves inside it.
        for (let y = 2; y < 34; y++) {
          const half = Math.round(12 * Math.sqrt(Math.max(0, 1 - ((y - 18) / 17) ** 2)));
          rect(14 - half, y, half * 2 + 1, 1, 1);
        }
        oval(14, 10, 4, 4, 4);
        for (let y = 14; y < 31; y++) {
          const half = Math.min(7, 3 + Math.floor((y - 14) / 3));
          for (let x = 14 - half; x <= 14 + half; x++) if (frame === 0 || k.dith(x, y) > 0.5) set(x, y, x < 13 ? 4 : 3);
        }
        rect(11, 9, 2, 2, 2);
        rect(16, 9, 2, 2, 2);
      } else if (name === 'element') {
        if (frame === 1) {
          line(12, 4, 12, 23, 4);
          line(4, 8, 20, 20, 4);
          line(4, 20, 20, 8, 4);
          rect(10, 11, 5, 5, 5);
        } else if (frame === 2) {
          for (let y = 3; y < 24; y++) {
            const x = y < 13 ? 15 - (y - 3) * 0.7 : 16 - (y - 13) * 0.65;
            rect(Math.round(x), y, y < 13 ? 5 : 4, 1, 5);
          }
        } else if (frame === 3) {
          oval(12, 13, 8, 9, 3);
          rect(5, 16, 15, 8, 1);
          oval(12, 12, 6, 6, 4);
          oval(8, 11, 2, 3, 1);
          oval(16, 11, 2, 3, 1);
          rect(8, 17, 2, 4, 4);
          rect(12, 17, 2, 4, 4);
          rect(16, 17, 2, 4, 4);
        } else if (frame === 4) {
          for (let y = 4; y < 23; y++) {
            const half = Math.round(Math.sin((((y - 4) / 19) * Math.PI) / 2) * 7);
            rect(12 - half, y, half * 2 + 1, 1, y < 15 ? 4 : 3);
          }
          rect(8, 16, 3, 4, 5);
        } else if (frame === 5) {
          for (let j = 0; j < 3; j++) {
            const x = 4 + j * 6;
            line(x, 5 + j, x + 3, 10, 4);
            line(x + 3, 10, x + 3, 17, 5);
            line(x + 3, 17, x, 22 - j, 4);
          }
        } else if (frame === 6) {
          line(12, 3, 21, 13, 4);
          line(21, 13, 12, 24, 3);
          line(12, 24, 3, 13, 3);
          line(3, 13, 12, 3, 4);
          rect(11, 8, 3, 12, 5);
          rect(7, 12, 11, 3, 5);
        } else {
          for (let y = 3; y < 24; y++) {
            const half = Math.round(Math.sin(((y - 3) / 21) * Math.PI) * 8);
            const shift = Math.round(Math.sin(y / 4) * 2);
            rect(12 + shift - half, y, half * 2 + 1, 1, y < 13 ? 3 : 4);
          }
          oval(12, 18, 3, 5, 5);
        }
      }
    });
  }

  function floorSprite(rx, ry, ramp) {
    rx = Math.max(2, Math.round(rx));
    ry = Math.max(2, Math.round(ry));
    return k.sprite('b51:floor:' + rx + ':' + ry + ':' + ramp.join(''), rx * 2 + 8, ry * 2 + 8, ramp, set => {
      for (let y = 2; y < ry * 2 + 6; y++)
        for (let x = 2; x < rx * 2 + 6; x++) {
          const d = Math.hypot((x - rx - 4) / rx, (y - ry - 4) / ry);
          if (d > 1.04) continue;
          if (d > 0.86) set(x, y, d > 0.97 ? 3 : 4);
          else if (d > 0.72 && k.dith(x, y) < 0.55) set(x, y, 3);
          else if (d < 0.7 && k.dith(x, y) < 0.22) set(x, y, 2);
        }
    });
  }
  function veilSprite(frame) {
    return k.sprite('b51:veil:' + frame, 30, 36, VEIL, set => {
      for (let y = 2; y < 34; y++)
        for (let x = 2; x < 28; x++) {
          const dx = (x - 15) / 12,
            dy = (y - 19) / 16;
          const d = Math.hypot(dx, dy);
          if (d > 1) continue;
          if (d > 0.79) set(x, y, d > 0.93 ? 3 : 4);
          else {
            const fold = Math.sin(x * 0.45 + y * 0.22 + frame * 0.6);
            if (fold > 0.35 && k.dith(x, y) < 0.5) set(x, y, fold > 0.85 ? 4 : 3);
          }
        }
    });
  }
  function leaf(p, angle, alpha = 1) {
    const img = k.sprite('b51:leaf', 12, 10, LEAF, set => {
      for (let y = 2; y <= 7; y++)
        for (let x = 2; x <= 9; x++) if (Math.abs(x - 5.5) / 4 + Math.abs(y - 4.5) / 3 < 1.1) set(x, y, y < 4 ? 4 : 3);
      for (let x = 3; x <= 8; x++) set(x, 5, 2);
    });
    // Rotated sprites cannot fade; a final unrotated leaf retains the stepped settle.
    if (alpha < 1) image(img, p, alpha);
    else k.blitRotated(img, p.x, p.y, angle);
  }
  function spiritPositions(s) {
    const b = base(s),
      p = k.P(b);
    const radius = Math.min(2, (s.area?.feet || 10) / (s.grid.feet || 5)) * 12;
    return Array.from({ length: 3 }, (_, i) => {
      const a = s.c.raw / 1150 + (i * k.tau) / 3;
      return { x: p.x + Math.cos(a) * radius, y: p.y - 10 + Math.sin(a) * radius * 0.48, front: Math.sin(a) >= 0 };
    });
  }
  function spiritFloor(s, alpha) {
    const p = k.P(base(s)),
      r = Math.min(2, (s.area?.feet || 10) / (s.grid.feet || 5)) * 16;
    image(floorSprite(r, r * 0.57, SPIRIT), p, alpha);
  }
  function spirits(s, front, alpha) {
    const f = Math.floor(s.c.raw / 340) % 3;
    spiritPositions(s)
      .filter(p => p.front === front)
      .forEach(p => image(icon('spirit', SPIRIT, f), p, alpha));
  }

  // Rasterise the supplied cube's actual corners, including its direction; never guess its centre.
  function cube(s, mode, frame, residue = false) {
    // A compact preview also reads when the caller has no template. A supplied area always wins.
    const aim = s.pose.target || recipients(s)[0];
    const area = s.area || { kind: 'cube', feet: (s.grid.feet || 5) * 3, x: aim.x - 1.5, y: aim.y + 0.5, dir: 0 };
    const corners = k.outline(area, s.grid).map(p => k.P({ x: p[0], y: p[1] }));
    if (corners.length < 4) return;
    const lift = mode === 'prism' ? (s.area ? 24 : 16) : 0;
    const build = Math.min(2, Math.floor(elapsed(s) / 100));
    const minX = Math.floor(Math.min(...corners.map(p => p.x))) - 3;
    const minY = Math.floor(Math.min(...corners.map(p => p.y))) - lift - 3;
    const w = Math.ceil(Math.max(...corners.map(p => p.x))) - minX + 4;
    const h = Math.ceil(Math.max(...corners.map(p => p.y))) - minY + 4;
    const pts = corners.map(p => ({ x: Math.round(p.x - minX), y: Math.round(p.y - minY) }));
    const ramp = mode === 'prism' ? PRISM : TIME;
    const key = ['b51:cube', mode, frame, residue, build, w, h, ...pts.flatMap(p => [p.x, p.y])].join(':');
    const img = k.sprite(key, w, h, ramp, set => {
      const edge = (a, b, c, width = 2) => {
        const n = Math.max(1, Math.ceil(Math.hypot(a.x - b.x, a.y - b.y)));
        for (let j = 0; j <= n; j++)
          for (let dy = 0; dy < width; dy++)
            for (let dx = 0; dx < width; dx++) set(k.mix(a.x, b.x, j / n) + dx, k.mix(a.y, b.y, j / n) + dy, c);
      };
      const face = (o, a, b, top = false) => {
        const det = a.x * b.y - a.y * b.x;
        if (Math.abs(det) < 0.01) return;
        for (let y = 1; y < h - 1; y++)
          for (let x = 1; x < w - 1; x++) {
            const dx = x - o.x,
              dy = y - o.y;
            const u = (dx * b.y - dy * b.x) / det,
              v = (dy * a.x - dx * a.y) / det;
            if (u < 0 || u > 1 || v < 0 || v > 1) continue;
            const r = Math.hypot(u - 0.5, v - 0.5),
              a0 = Math.atan2(v - 0.5, u - 0.5);
            if (mode === 'prism') {
              const z = r * 11 - a0 * 1.3 - frame / 2;
              const band = Math.floor(z),
                frac = z - band;
              const color = 1 + (((band % 4) + 4) % 4);
              if (residue && (frac > 0.18 || r < 0.2)) continue;
              if (top && k.dith(x, y) > 0.48) continue;
              set(x, y, frac < 0.12 && k.dith(x, y) < 0.5 ? 5 : color);
            } else {
              const phase = (r * 5 - frame / 36 + 10) % 1;
              if (residue && phase > 0.14) continue;
              if (phase < 0.12) set(x, y, 5);
              else if (phase < 0.25) set(x, y, 3);
              else if (!residue && phase < 0.35 && k.dith(x, y) < 0.5) set(x, y, 3);
            }
          }
      };
      const a = { x: pts[1].x - pts[0].x, y: pts[1].y - pts[0].y };
      const b = { x: pts[3].x - pts[0].x, y: pts[3].y - pts[0].y };
      if (build >= 1) face(pts[0], a, b);
      if (lift && !residue && build >= 2) {
        for (let j = 0; j < 4; j++) {
          const p = pts[j],
            q = pts[(j + 1) % 4];
          face({ x: p.x, y: p.y - lift }, { x: q.x - p.x, y: q.y - p.y }, { x: 0, y: lift }, true);
        }
        face({ x: pts[0].x, y: pts[0].y - lift }, a, b, true);
      }
      for (let j = 0; j < 4; j++) {
        const p = pts[j],
          q = pts[(j + 1) % 4];
        edge(p, q, mode === 'prism' ? 4 : 3);
        if (lift && !residue && build >= 2) {
          edge({ x: p.x, y: p.y - lift }, { x: q.x, y: q.y - lift }, 3);
          edge(p, { x: p.x, y: p.y - lift }, 4);
        }
      }
    });
    k.blit(img, minX, minY, residue ? 0.5 : 1);
  }

  // Nondetection: a folded grey-violet veil wraps the body as a large watchful eye closes.
  FX.register('nondetection', {
    palette: VEIL,
    travel: 220,
    beats,
    end: () => 1320,
    ground(s) {
      const e = elapsed(s);
      if (e < 0) return;
      recipients(s).forEach(t => image(floorSprite(12, 5, VEIL), k.P(feet(t)), tail(e, 650, 1020) * 0.75));
    },
    air(s) {
      const e = elapsed(s);
      if (e < 0) return;
      impact(s, VEIL, 'veil');
      recipients(s).forEach(t => {
        const p = k.P(t),
          q = k.clamp(e / 220),
          alpha = tail(e, 650, 1020);
        image(veilSprite(Math.floor(s.c.raw / 110) % 6), { x: p.x, y: p.y + 15 * (1 - k.ease(q)) }, alpha * 0.75);
        if (e >= 100 && e < 790) {
          const f = Math.min(3, Math.floor(Math.max(0, e - 390) / 90));
          image(icon('eye', VEIL, f), { x: p.x, y: p.y - 6 }, tail(e, 640, 790));
        }
        if (e > 650) motes(s, { x: p.x, y: p.y + 2 }, VEIL, 3, 10);
      });
    },
  });

  // Blink: a violet-white shutter swallows the caster, leaves a ghost double, then snaps open.
  FX.register('blink', {
    palette: VIOLET,
    travel: 90,
    beats: (event, kit) => [
      { at: kit.CAST + 90, stop: 80, target: event.caster ?? null, kind: 'soft' },
      { at: kit.CAST + 690, stop: 90, target: event.caster ?? null, kind: 'soft' },
    ],
    end: () => 1370,
    ground(s) {
      const e = elapsed(s);
      if (e < 0) return;
      image(floorSprite(15, 6, VIOLET), k.P(base(s)), tail(e, 790, 1070));
    },
    air(s) {
      const e = elapsed(s);
      if (e < 0) return;
      const p = k.P(caster(s));
      if (e >= 60 && e < 690) {
        image(icon('ghost', VIOLET, e > 230 ? 1 : 0), { x: p.x, y: p.y - 2 });
        if (e < 180 || (e > 570 && Math.floor(e / 35) % 2 === 0)) {
          k.disc(p.x, p.y - 2, 16, VIOLET[0]);
          k.disc(p.x, p.y - 2, 14, VIOLET[4]);
          k.disc(p.x, p.y - 2, 11, VIOLET[5]);
        }
      }
      s.hits.forEach((hit, i) => {
        const real = s.real(hit);
        k.drawHit(k.hitStyle('b51:blink', VIOLET, { S: 40, spikes: 4, jag: 0.1 }), p, real);
        k.shards(p, real, VIOLET, (s.event.seed || 0) + i, 12, 28);
      });
      if (e >= 690) {
        const q = k.clamp((e - 690) / 300);
        ring(p, 12 + q * 8, 16 - q * 7, VIOLET, q < 0.4 ? 5 : 3);
      }
    },
  });

  // Speak With Plants: bright leafy vines unfurl into a smiling flower answering in a speech bubble.
  FX.register('speak-with-plants', {
    palette: LEAF,
    travel: 280,
    beats: selfBeat,
    end: () => 1510,
    ground(s) {
      const e = elapsed(s);
      if (e < 0) return;
      const p = k.P(base(s));
      image(floorSprite(19, 8, LEAF), p, tail(e, 800, 1210) * 0.75);
    },
    air(s) {
      const e = elapsed(s);
      if (e < 0) return;
      const p = k.P(base(s)),
        grow = k.ease(k.clamp(e / 280)),
        alpha = tail(e, 860, 1210);
      impact(s, LEAF, 'plants', true);
      if (e < 1040)
        for (const side of [-1, 1]) {
          let prev = { x: p.x + side * 7, y: p.y };
          for (let i = 1; i <= 5; i++) {
            const next = { x: p.x + side * (9 + Math.sin(i * 0.8) * 8), y: p.y - i * 5 * grow };
            stroke(prev, next, LEAF, 2, 3);
            prev = next;
            if (i % 2 && grow > i / 7) leaf({ x: next.x + side * 4, y: next.y }, side * 0.5, alpha);
          }
        }
      if (e >= 150) image(icon('flower', LEAF), { x: p.x, y: p.y - 15 + (1 - grow) * 14 }, alpha);
      if (e >= 280 && e < 1050)
        image(icon('bubble', LEAF, Math.floor(e / 160) % 4), { x: p.x + 14, y: p.y - 37 }, tail(e, 820, 1050));
    },
  });

  // Tongues: a full-square speech bubble crowns the target, cycling bright runic alphabets.
  FX.register('tongues', {
    palette: VIOLET,
    travel: 180,
    beats,
    end: () => 1390,
    ground(s) {
      const e = elapsed(s);
      if (e < 0) return;
      recipients(s).forEach(t => image(floorSprite(12, 5, VIOLET), k.P(feet(t)), tail(e, 750, 1090) * 0.75));
    },
    air(s) {
      const e = elapsed(s);
      if (e < 0) return;
      impact(s, VIOLET, 'tongues');
      recipients(s).forEach(t => {
        const p = k.P(t),
          q = k.ease(k.clamp(e / 180));
        const at = { x: p.x, y: p.y - 20 * q };
        image(icon('bubble', VIOLET, Math.floor(e / 170) % 4), at, tail(e, 780, 1090));
        if (e < 900) motes(s, at, GOLD, 4, 19);
      });
    },
  });

  // Motivational Speech: a rousing gold standard rises, sending rays into bold victory chevrons.
  FX.register('motivational-speech', {
    palette: GOLD,
    travel: 300,
    beats,
    end: () => 1510,
    ground(s) {
      const e = elapsed(s);
      if (e < 0) return;
      recipients(s).forEach(t => image(floorSprite(12, 5, GOLD), k.P(feet(t)), tail(e, 800, 1210) * 0.75));
    },
    air(s) {
      const e = elapsed(s);
      if (e < 0) return;
      const p = k.P(caster(s)),
        top = { x: p.x, y: p.y - 18 };
      image(
        icon('banner', GOLD, Math.floor(s.c.raw / 130) % 3),
        { x: top.x, y: top.y + 12 * (1 - k.ease(k.clamp(e / 180))) },
        tail(e, 800, 1110),
      );
      if (e < 580)
        recipients(s).forEach(t => {
          const t0 = k.P(t),
            end = { x: t0.x, y: t0.y - 14 };
          const q = k.clamp(e / 300),
            from = k.clamp((e - 220) / 300);
          stroke(
            { x: k.mix(top.x, end.x, from), y: k.mix(top.y, end.y, from) },
            { x: k.mix(top.x, end.x, q), y: k.mix(top.y, end.y, q) },
            GOLD,
            2,
            4,
          );
        });
      impact(s, GOLD, 'speech');
      if (e >= 300)
        recipients(s).forEach(t => {
          const p = k.P(t);
          image(icon('chevron', GOLD), { x: p.x, y: p.y - 17 - Math.min(3, (e - 300) / 120) }, tail(e, 930, 1210));
        });
    },
  });

  // Spirit Shroud: three large faced wisps circle close to the caster above a bright mist floor.
  FX.register('spirit-shroud', {
    palette: SPIRIT,
    travel: 240,
    beats: selfBeat,
    end: () => 1380,
    ground(s) {
      const e = elapsed(s);
      if (e < 0 || (s.pose.linger > 0 && e >= 240)) return;
      spiritFloor(s, tail(e, 760, 1080));
      spirits(s, false, tail(e, 760, 1080));
    },
    air(s) {
      const e = elapsed(s);
      if (e < 0) return;
      impact(s, SPIRIT, 'shroud', true);
      if (!(s.pose.linger > 0 && e >= 240)) spirits(s, true, tail(e, 760, 1080));
    },
    linger(s) {
      spiritFloor(s, s.linger * 0.75);
      spirits(s, false, s.linger);
    },
    lingerAir(s) {
      spirits(s, true, s.linger);
    },
  });

  // Mass Healing Word: a green-gold word fans into every ally, blooming into broad healing crosses.
  FX.register('mass-healing-word', {
    palette: HEAL,
    travel: 360,
    beats,
    end: () => 1470,
    ground(s) {
      const e = elapsed(s);
      if (e < 360) return;
      recipients(s).forEach(t => image(floorSprite(16, 7, HEAL), k.P(feet(t)), tail(e, 820, 1170)));
    },
    air(s) {
      const e = elapsed(s);
      if (e < 0) return;
      const h = k.P(s.pose.hand || caster(s));
      if (e < 170) image(icon('word', HEAL), { x: h.x, y: h.y - 7 }, 1);
      if (e >= 100 && e < 360)
        recipients(s).forEach((t, i) => {
          const p = k.P(t),
            q = (e - 100) / 260;
          const at = u => ({
            x: k.mix(h.x, p.x, u),
            y: k.mix(h.y, p.y, u) - Math.sin(u * Math.PI) * (12 + (i % 3) * 3),
          });
          for (let j = 5; j >= 1; j--) {
            const u = q - j * 0.045;
            if (u < 0) continue;
            const a = at(u);
            k.dot(a.x, a.y, HEAL[0], 5);
            k.dot(a.x, a.y, j < 3 ? HEAL[4] : HEAL[3], 3);
          }
          image(icon('word', HEAL), at(q));
        });
      impact(s, HEAL, 'healing-word');
      if (e >= 360)
        recipients(s).forEach(t => {
          const p = k.P(t);
          image(icon('plus', HEAL), { x: p.x, y: p.y - Math.min(7, (e - 360) / 60) }, tail(e, 850, 1170));
          if (e < 850) motes(s, p, GOLD, 3, 17);
        });
    },
  });

  // Hypnotic Pattern: a luminous magenta-cyan-gold cube swirls over its entire footprint and enchants eyes.
  FX.register('hypnotic', {
    palette: PRISM,
    travel: 200,
    beats,
    end: () => 1530,
    ground(s) {
      const e = elapsed(s);
      if (e < 0) return;
      cube(s, 'prism', Math.floor(s.c.raw / 95) % 12, e > 960);
    },
    air(s) {
      const e = elapsed(s);
      if (e < 0) return;
      impact(s, PRISM, 'hypnotic');
      if (e < 200 || e > 1050) return;
      recipients(s).forEach(t => {
        const p = k.P(t);
        for (const side of [-1, 1]) {
          const img = k.sprite('b51:spiral:' + (Math.floor(s.c.raw / 140) % 6), 12, 12, PRISM, set => {
            for (let j = 0; j <= 38; j++) {
              const a = (j / 38) * Math.PI * 3.5 + (Math.floor(s.c.raw / 140) % 6);
              const r = 0.4 + (j / 38) * 4;
              const x = Math.round(5 + Math.cos(a) * r),
                y = Math.round(5 + Math.sin(a) * r);
              set(x, y, 4);
              set(x + 1, y, 4);
            }
          });
          image(img, { x: p.x + side * 5, y: p.y - 7 }, tail(e, 850, 1050));
        }
      });
    },
  });

  // Protection From Energy: a faceted elemental shell locks around the body with a large element seal.
  FX.register('protection-from-energy', {
    palette: event => k.paletteFor(event),
    travel: 240,
    beats,
    end: () => 1390,
    ground(s) {
      const e = elapsed(s);
      if (e < 0) return;
      recipients(s).forEach(t => image(floorSprite(15, 6, s.ramp), k.P(feet(t)), tail(e, 760, 1090)));
    },
    air(s) {
      const e = elapsed(s);
      if (e < 0) return;
      impact(s, s.ramp, 'energy');
      const el = s.event.element || '';
      const type =
        el === 'frost' || el === 'cold'
          ? 1
          : el === 'lightning'
            ? 2
            : el === 'veneno' || el === 'poison'
              ? 3
              : el === '\u00e1cido' || el === 'acid'
                ? 4
                : el === 'trueno' || el === 'thunder'
                  ? 5
                  : el === 'fire'
                    ? 0
                    : 6;
      recipients(s).forEach(t => {
        const p = k.P(t),
          f = Math.min(3, Math.floor(e / 80));
        const shell = k.sprite('b51:shell:' + f + ':' + s.ramp.join(''), 38, 42, s.ramp, set => {
          for (let y = 2; y < 40; y++)
            for (let x = 2; x < 36; x++) {
              const d = Math.hypot((x - 19) / (11 + f * 1.6), (y - 21) / (14 + f * 1.5));
              if (d < 1 && d > 0.78) set(x, y, x + y < 34 ? 5 : 3);
              else if (d < 0.78 && d > 0.64 && k.dith(x, y) < 0.35) set(x, y, 3);
            }
        });
        image(shell, p, tail(e, 800, 1090));
        if (e >= 160) image(icon('element', s.ramp, type), p, tail(e, 720, 980));
      });
    },
  });

  // Slow: broad pale-blue time waves crawl over the cube beneath large arrested clocks and drag marks.
  FX.register('slow', {
    palette: TIME,
    travel: 260,
    beats,
    end: () => 1600,
    ground(s) {
      const e = elapsed(s);
      if (e < 0) return;
      cube(s, 'time', Math.floor(s.c.raw / 150) % 36, e > 1040);
    },
    air(s) {
      const e = elapsed(s);
      if (e < 0) return;
      impact(s, TIME, 'slow');
      recipients(s).forEach(t => {
        const p = k.P(t),
          q = k.clamp(e / 260);
        if (e < 1120)
          image(
            icon('clock', TIME, Math.floor(s.c.raw / 550) % 2),
            { x: p.x, y: p.y - 12 * k.ease(q) },
            tail(e, 940, 1120),
          );
        if (e >= 260 && e < 1150)
          for (let i = 0; i < 3; i++) {
            const y = p.y + 4 + i * 4;
            stroke({ x: p.x - 16 - i * 2, y }, { x: p.x - 5, y }, TIME, 2, i === 1 ? 4 : 3);
          }
      });
    },
  });

  // Sending: a half-square message star shoots out on a bright trail and flips into an open letter.
  FX.register('sending', {
    palette: TIME,
    travel: 390,
    beats: selfBeat,
    end: () => 1480,
    air(s) {
      const e = elapsed(s);
      if (e < 0) return;
      const h = k.P(s.pose.hand || caster(s));
      const dest = { x: h.x + 18, y: h.y - 17 };
      if (e < 390) {
        const q = e / 390;
        const at = u => ({ x: k.mix(h.x, dest.x, u), y: k.mix(h.y, dest.y, u) - Math.sin(u * Math.PI) * 10 });
        for (let j = 8; j >= 1; j--) {
          const u = q - j * 0.055;
          if (u < 0) continue;
          const p = at(u);
          k.dot(p.x, p.y, TIME[0], 6);
          k.dot(p.x, p.y, j < 4 ? TIME[4] : TIME[3], 4);
        }
        const p = at(q);
        k.disc(p.x, p.y, 6, TIME[0]);
        k.disc(p.x, p.y, 5, TIME[3]);
        k.disc(p.x - 1, p.y - 1, 3, TIME[5]);
      } else {
        const f = Math.min(2, Math.floor((e - 560) / 110) + 1);
        image(icon('envelope', TIME, Math.max(0, f)), dest, tail(e, 900, 1180));
        if (e < 1000) motes(s, dest, GOLD, 4, 19);
      }
      const hit = s.hits[0];
      if (hit) {
        const real = s.real(hit);
        k.drawHit(k.hitStyle('b51:sending', TIME, { S: 28, spikes: 4, jag: 0.1 }), dest, real);
        k.shards(dest, real, TIME, s.event.seed || 0, 8, 20);
      }
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
