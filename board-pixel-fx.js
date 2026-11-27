/* Pixel-art spell animations for the board (prototype set: fireball, magic missile, eldritch blast, thorn whip).
 *
 * Everything is painted into a low-resolution buffer (16 art pixels per 5 ft cell) and blown up with
 * nearest-neighbour sampling, so beams, sprites and particles share one chunky pixel grid at any angle.
 *
 * Feel rules (after Sakurai's "making games" notes):
 *  - snap the wind-up in on the first frame, release in ~1 frame;
 *  - hitstop on every hit: the spell's own clock freezes, the target vibrates (large → small),
 *    hit marks keep animating through the stop;
 *  - flashes alternate light/dark instead of a flat white add, and every effect carries a dark outline
 *    so it reads on bright maps as well as dark ones;
 *  - explosions are staged flash → fireball → black smoke → settle;
 *  - screen shake pattern changes with size (small hits shake vertically only).
 */
(function (root) {
  'use strict';
  const PX = 16;
  const tau = Math.PI * 2;
  const clamp = t => Math.max(0, Math.min(1, t));
  const mix = (a, b, t) => a + (b - a) * t;
  const ease = t => 1 - (1 - t) ** 3;
  const back = t => 1 + 2.4 * (t - 1) ** 3 + 1.4 * (t - 1) ** 2;
  const CAST = 300;

  // ---------------------------------------------------------------- palettes (index 0 is the outline)
  const FIRE = ['#2a0d0c', '#6e1a12', '#b8321a', '#ec6a1c', '#ffb53a', '#ffe9a0', '#ffffff'];
  const SMOKE = ['#141011', '#2a2122', '#43383a', '#5f5250', '#80716a'];
  const FORCE = ['#0e1036', '#2534a0', '#3f6dff', '#8cc6ff', '#e6f6ff', '#ffffff'];
  const ELDRITCH = ['#10041c', '#3a0f5e', '#7425c4', '#b956ff', '#efc2ff', '#ffffff'];
  const VINE = ['#0f1c0b', '#28501a', '#4d8a26', '#8cc84a', '#d2f08a', '#fffbe0'];
  const THORN = ['#2b1a0e', '#c9b98a', '#f4ead0'];
  const DUST = ['#3b2c20', '#8a7154', '#d8c49a'];
  const WHITE = '#ffffff';

  // ---------------------------------------------------------------- deterministic noise
  const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
  const dith = (x, y) => bayer[(y & 3) * 4 + (x & 3)];
  function hash(a, b = 0, c = 0) {
    const v = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;
    return v - Math.floor(v);
  }
  function noise(x, y, s = 0) {
    const xi = Math.floor(x),
      yi = Math.floor(y),
      xf = x - xi,
      yf = y - yi;
    const u = xf * xf * (3 - 2 * xf),
      v = yf * yf * (3 - 2 * yf);
    return mix(mix(hash(xi, yi, s), hash(xi + 1, yi, s), u), mix(hash(xi, yi + 1, s), hash(xi + 1, yi + 1, s), u), v);
  }

  // ---------------------------------------------------------------- canvases
  function canvas(w, h) {
    if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }
  const rgba = hex => {
    const n = parseInt(hex.slice(1), 16);
    return (0xff << 24) | ((n & 0xff) << 16) | (n & 0xff00) | ((n >> 16) & 0xff);
  };
  const sprites = new Map();
  /* Paints a cached sprite. paint(set) writes palette indices (1..n); index 0 is reserved for the
     outline, which is added automatically around every painted pixel (4-neighbourhood). */
  function sprite(key, w, h, palette, paint, outline = true) {
    let hit = sprites.get(key);
    if (hit) return hit;
    w = Math.max(1, w | 0);
    h = Math.max(1, h | 0);
    const cells = new Int8Array(w * h).fill(-1);
    paint((x, y, i) => {
      x |= 0;
      y |= 0;
      if (x >= 0 && y >= 0 && x < w && y < h) cells[y * w + x] = i;
    });
    const c = canvas(w, h);
    const g = c.getContext('2d');
    const img = g.createImageData(w, h);
    const data = new Uint32Array(img.data.buffer);
    const colors = palette.map(rgba);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = cells[y * w + x];
        if (i >= 0) data[y * w + x] = colors[i];
        else if (
          outline &&
          ((x > 0 && cells[y * w + x - 1] > 0) ||
            (x < w - 1 && cells[y * w + x + 1] > 0) ||
            (y > 0 && cells[(y - 1) * w + x] > 0) ||
            (y < h - 1 && cells[(y + 1) * w + x] > 0))
        )
          data[y * w + x] = colors[0];
      }
    g.putImageData(img, 0, 0);
    if (sprites.size > 600) sprites.delete(sprites.keys().next().value);
    sprites.set(key, c);
    return c;
  }

  // ---------------------------------------------------------------- the shared low-res buffer
  let buf = null,
    g = null,
    origin = { x: 0, y: 0 };
  function begin(box) {
    const x0 = Math.floor(box[0]) - 1,
      y0 = Math.floor(box[1]) - 1;
    const w = Math.min(4096, (Math.ceil(box[2]) + 1 - x0) * PX),
      h = Math.min(4096, (Math.ceil(box[3]) + 1 - y0) * PX);
    if (!buf || buf.width < w || buf.height < h) {
      buf = canvas(Math.max(w, buf?.width || 0), Math.max(h, buf?.height || 0));
      g = buf.getContext('2d');
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, w, h);
    origin = { x: x0, y: y0, w, h };
  }
  function end(ctx) {
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(buf, 0, 0, origin.w, origin.h, origin.x, origin.y, origin.w / PX, origin.h / PX);
    ctx.restore();
  }
  const P = pt => ({ x: (pt.x - origin.x) * PX, y: (pt.y - origin.y) * PX });
  function boxOf(points, pad = 1) {
    const box = [Infinity, Infinity, -Infinity, -Infinity];
    for (const p of points) {
      if (!p) continue;
      const r = (p.r || 0) + pad;
      box[0] = Math.min(box[0], p.x - r);
      box[1] = Math.min(box[1], p.y - r - (p.up || 0));
      box[2] = Math.max(box[2], p.x + r);
      box[3] = Math.max(box[3], p.y + r);
    }
    return box;
  }
  function dot(x, y, color, s = 1) {
    g.fillStyle = color;
    g.fillRect(Math.round(x - (s - 1) / 2), Math.round(y - (s - 1) / 2), s, s);
  }
  function disc(x, y, r, color) {
    g.fillStyle = color;
    const cx = Math.round(x),
      cy = Math.round(y);
    for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++) {
      const half = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)) + 0.35);
      if (half > 0 || Math.abs(dy) <= r) g.fillRect(cx - half, cy + dy, half * 2 + 1, 1);
    }
  }
  const band = (v, n, x, y) => Math.max(0, Math.min(n - 1, Math.floor(v * n + (dith(x, y) - 0.5) * 0.55)));
  function blit(img, x, y, alpha = 1) {
    if (alpha <= 0) return;
    g.globalAlpha = Math.round(alpha * 4) / 4; // stepped fades keep the retro look
    g.drawImage(img, Math.round(x), Math.round(y));
    g.globalAlpha = 1;
  }
  function blitRotated(img, x, y, angle, ax = 0.5, ay = 0.5) {
    g.save();
    g.translate(Math.round(x), Math.round(y));
    g.rotate(Math.round(angle / (Math.PI / 8)) * (Math.PI / 8)); // 16 headings, like a sprite sheet
    g.drawImage(img, -Math.round(img.width * ax), -Math.round(img.height * ay));
    g.restore();
  }
  function ellipse(cx, cy, rx, ry, color, s = 1, gap = 0, spin = 0) {
    const steps = Math.max(12, Math.ceil(tau * Math.max(rx, ry)));
    for (let i = 0; i < steps; i++) {
      if (gap && Math.floor((i / steps) * gap * 2 + spin) % 2) continue;
      const a = (i / steps) * tau;
      dot(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, color, s);
    }
  }

  // ---------------------------------------------------------------- timing, hitstop and the per-spell plan
  const ids = new Set(['fireball', 'magic-missile', 'eldritch-blast', 'thorn-whip']);
  const missiles = level => root.BoardSpells?.missileCount?.(level) ?? 2 + Math.max(1, Math.min(9, level || 1));
  function targetList(event, list) {
    return Array.isArray(list) && list.length ? list : event.targets || [];
  }
  /* Design-time beats (ms from cast start, before any hitstop) and the stop each one earns. */
  function plan(event) {
    if (event._px) return event._px;
    const hits = [];
    const add = (at, stop, id, kind, power) => hits.push({ at, stop, id, kind, power });
    let end = 0,
      travel = 0;
    if (event.id === 'fireball') {
      travel = 420;
      const stop = Math.min(230, 150 + Math.max(0, (event.level || 3) - 3) * 12);
      const at = CAST + travel;
      for (const id of event.targets || []) add(at, stop, id, 'blast', 0.09);
      if (!hits.length) add(at, stop, null, 'blast', 0);
      end = at + FIREBALL_FRAMES * FIREBALL_MS;
    } else if (event.id === 'magic-missile') {
      travel = 520;
      const count = missiles(event.level);
      const list = event.darts?.length ? event.darts : event.targets || [];
      for (let i = 0; i < count; i++)
        add(CAST + travel + i * 90, 55, list.length ? list[i % list.length] : null, 'dart', 0.04);
      end = CAST + travel + (count - 1) * 90 + 360;
    } else if (event.id === 'eldritch-blast') {
      travel = 40;
      const beats = Math.max(1, event.beats || 1);
      const list = targetList(event, event.rays);
      for (let i = 0; i < beats; i++)
        add(CAST + travel + i * 170, 85, list.length ? list[i % list.length] : null, 'beam', 0.07);
      end = CAST + travel + (beats - 1) * 170 + 340;
    } else if (event.id === 'thorn-whip') {
      travel = 150;
      const id = (event.targets || [])[0] ?? null;
      add(CAST + travel, 90, id, 'whip', 0.06);
      end = CAST + 650;
    }
    // One freeze per distinct beat; simultaneous hits (a fireball's whole blast) share it.
    const freezes = [];
    for (const hit of hits) {
      let f = freezes.find(item => item.at === hit.at);
      if (!f) freezes.push((f = { at: hit.at, stop: hit.stop }));
      f.stop = Math.max(f.stop, hit.stop);
    }
    freezes.sort((a, b) => a.at - b.at);
    let acc = 0;
    for (const f of freezes) {
      f.raw = f.at + acc;
      acc += f.stop;
    }
    for (const hit of hits) hit.freeze = freezes.find(f => f.at === hit.at);
    event._px = { hits, freezes, end, travel, total: end + acc, dirs: new Map() };
    return event._px;
  }
  /* The spell's own clock: real time minus every hitstop already reached. */
  function clock(event, now) {
    const { freezes } = plan(event);
    const raw = now - event.started;
    let acc = 0;
    for (const f of freezes) {
      if (raw < f.raw) break;
      if (raw < f.raw + f.stop) return { t: f.at, raw, frozen: f, into: raw - f.raw };
      acc += f.stop;
    }
    return { t: raw - acc, raw, frozen: null, into: 0 };
  }
  function timing(event) {
    const p = plan(event);
    return {
      travel: p.travel,
      impact: Math.max(1, p.total - CAST - p.travel),
      decal: event.id === 'fireball' ? 3600 : 0,
    };
  }

  // ---------------------------------------------------------------- cast: snap-in circle and hand charge
  const tint = {
    fireball: FIRE,
    'magic-missile': FORCE,
    'eldritch-blast': ELDRITCH,
    'thorn-whip': VINE,
  };
  function castCircle(base, t, ramp) {
    // Full size and full brightness on the very first frame (no fade-in); pops outward on release.
    if (!base || t >= CAST + 160) return;
    const c = P(base);
    const pop = t > CAST ? (t - CAST) / 160 : 0;
    const rx = Math.max(9, base.span * 11) * (1 + pop * 0.5),
      ry = rx * 0.55;
    const spin = t / 90;
    if (pop > 0.66) return;
    ellipse(c.x, c.y + 1, rx, ry, ramp[0], 2);
    ellipse(c.x, c.y, rx, ry, ramp[pop ? 4 : 3], 1, pop ? 6 : 0);
    if (!pop) {
      ellipse(c.x, c.y, rx * 0.7, ry * 0.7, ramp[2], 1, 5, spin);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * tau + spin * 0.4;
        dot(c.x + Math.cos(a) * rx, c.y + Math.sin(a) * ry, ramp[0], 3);
        dot(c.x + Math.cos(a) * rx, c.y + Math.sin(a) * ry, ramp[5] || WHITE, 1);
      }
    }
  }
  function handCharge(hand, t, ramp, seed) {
    if (!hand || t >= CAST + 60) return;
    const h = P(hand);
    if (t < CAST) {
      const k = t / CAST;
      for (let i = 0; i < 8; i++) {
        const a = hash(i, seed) * tau + k * 2.2;
        const r = (1 - ease(clamp(k * 1.15 - hash(i, seed, 1) * 0.15))) * 18 + 2;
        dot(h.x + Math.cos(a) * r, h.y + Math.sin(a) * r * 0.8, ramp[0], 3);
        dot(h.x + Math.cos(a) * r, h.y + Math.sin(a) * r * 0.8, ramp[i % 2 ? 3 : 4], i % 3 ? 1 : 2);
      }
      const orb = 1 + Math.floor(k * 3);
      disc(h.x, h.y, orb + 1.5, ramp[0]);
      disc(h.x, h.y, orb + 0.5, ramp[3]);
      disc(h.x, h.y, Math.max(0.5, orb - 0.5), ramp[5] || WHITE);
    } else {
      // Release: one light frame, one dark frame.
      const light = t - CAST < 30;
      disc(h.x, h.y, 6.5, light ? ramp[0] : WHITE);
      disc(h.x, h.y, 5.5, light ? WHITE : ramp[0]);
      if (light)
        for (let i = 0; i < 4; i++) {
          const [dx, dy] = [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ][i];
          for (let j = 7; j < 12; j++) dot(h.x + dx * j, h.y + dy * j, j < 11 ? WHITE : ramp[0], 1);
        }
    }
  }

  // ---------------------------------------------------------------- hit marks (cached 8-frame stars)
  const HIT_FRAMES = 8,
    HIT_MS = 42;
  function hitMark(kind, f) {
    const cfg = {
      force: { S: 30, ramp: FORCE, spikes: 4, minor: 4, jag: 0.15 },
      eldritch: { S: 46, ramp: ELDRITCH, spikes: 7, minor: 0, jag: 0.45, void: true },
      thorn: { S: 36, ramp: VINE, spikes: 5, minor: 0, jag: 0.35 },
    }[kind];
    const { S, ramp, spikes, minor, jag } = cfg;
    const pal = [ramp[0], ramp[1], ramp[2], ramp[3], ramp[4], WHITE];
    return sprite(`hit:${kind}:${f}`, S, S, pal, set => {
      const c = S / 2;
      const rays = [];
      for (let j = 0; j < spikes; j++)
        rays.push({ a: (j / spikes) * tau + 0.3 + hash(j, 9) * jag, L: 0.5 - hash(j, 3) * jag * 0.45, p: 30 });
      for (let j = 0; j < minor; j++) rays.push({ a: ((j + 0.5) / minor) * tau + 0.3, L: 0.26, p: 60 });
      const k = f < 2 ? 0 : (f - 2) / (HIT_FRAMES - 3);
      for (let y = 0; y < S; y++)
        for (let x = 0; x < S; x++) {
          const dx = x + 0.5 - c,
            dy = y + 0.5 - c,
            d = Math.hypot(dx, dy) / S,
            a = Math.atan2(dy, dx);
          let reach = 0;
          for (const r of rays) {
            const cos = Math.cos(a - r.a);
            if (cos > 0) reach = Math.max(reach, r.L * cos ** (r.p * (1 + k * 2)));
          }
          if (f === 0) {
            if (d < 0.14) set(x, y, 5);
            else if (d < reach) set(x, y, 4);
          } else if (f === 1) {
            if (d < 0.1) set(x, y, 1);
            else if (d < 0.16) set(x, y, 5);
            else if (d < reach * 1.05) set(x, y, 5);
          } else {
            const ringR = 0.18 + 0.28 * k;
            const len = reach * (1 - k * 0.75);
            if (cfg.void && k < 0.5 && d < 0.13 * (1 - k * 2)) set(x, y, 1);
            else if (d > 0.08 + k * 0.2 && d < len) set(x, y, k < 0.4 ? 4 : 3);
            else if (Math.abs(d - ringR) < 0.03 && (k < 0.5 || Math.floor(((a + tau) / tau) * 16) % 2))
              set(x, y, k < 0.5 ? 3 : 2);
          }
        }
    });
  }
  function drawHit(kind, at, e) {
    if (e < 0) return;
    const f = Math.floor(e / HIT_MS);
    if (f >= HIT_FRAMES) return;
    const img = hitMark(kind, f);
    blit(img, at.x - img.width / 2, at.y - img.height / 2);
  }
  /* Where a hit lands: on the body, nudged toward the source (where the hitboxes overlap). */
  function contact(target, from) {
    const dx = from.x - target.x,
      dy = from.y - target.y,
      d = Math.hypot(dx, dy) || 1;
    const lean = Math.min(0.28, 0.22 * (target.span || 1));
    return { x: target.x + (dx / d) * lean, y: target.y + (dy / d) * lean };
  }
  function shards(at, e, ramp, seed, n = 7, reach = 22) {
    if (e < 0 || e > 360) return;
    const k = e / 360;
    for (let i = 0; i < n; i++) {
      const a = hash(i, seed, 4) * tau;
      const r = ease(k) * reach * (0.5 + hash(i, seed, 5) * 0.7);
      const x = at.x + Math.cos(a) * r,
        y = at.y + Math.sin(a) * r * 0.8 + k * k * 10;
      if (k > 0.75 && i % 2) continue;
      dot(x, y, ramp[0], 3);
      dot(x, y, i % 3 ? ramp[3] : ramp[4], 1);
    }
  }

  // ---------------------------------------------------------------- fireball
  const FIREBALL_FRAMES = 18,
    FIREBALL_MS = 55;
  function fireballFrame(R, f, seed) {
    R = Math.max(14, Math.round(R));
    const W = Math.ceil(R * 2.5),
      H = Math.ceil(R * 3.2);
    const cx = W / 2,
      cy = H - R * 1.2;
    // palette: 0 outline, 1-6 fire ramp, 7-10 smoke ramp, 11 white
    const pal = [
      FIRE[0],
      FIRE[1],
      FIRE[2],
      FIRE[3],
      FIRE[4],
      FIRE[5],
      FIRE[6],
      SMOKE[1],
      SMOKE[2],
      SMOKE[3],
      SMOKE[4],
      WHITE,
    ];
    const img = sprite(`fb:${R}:${f}:${seed % 3}`, W, H, pal, set => {
      if (f < 2) {
        // Flash pair: light core with dark-rimmed rays, then the inverse.
        const inv = f === 1;
        for (let y = 0; y < H; y++)
          for (let x = 0; x < W; x++) {
            const dx = x + 0.5 - cx,
              dy = y + 0.5 - cy,
              d = Math.hypot(dx, dy) / R;
            const a = Math.atan2(dy, dx);
            const spike = Math.abs(Math.cos(4 * a + seed)) ** 14 * (0.75 + 0.25 * hash(Math.round(a * 4), seed));
            const core = inv ? 0.26 : 0.34;
            if (d < core - 0.06) set(x, y, inv ? 1 : 11);
            else if (d < core) set(x, y, inv ? 11 : 4);
            else if (d < core + (0.85 - core) * spike) set(x, y, inv ? 11 : 5);
          }
        return;
      }
      if (f < 12) {
        // Fireball: a cluster of top-lit billows around a white-hot core; billows hand over to
        // black smoke one at a time as it cools.
        const grow = f <= 6 ? 0.42 + 0.58 * ease((f - 2) / 4) : 1 - 0.035 * (f - 6);
        const Rt = R * grow;
        const cool = f <= 6 ? 0 : (f - 6) / 6;
        const oy = cy - (f - 2) * R * 0.025;
        const billows = [{ x: cx, y: oy, r: Rt * 0.68, i: 0 }];
        for (let i = 1; i <= 12; i++) {
          const a = (i / 12) * tau + seed + hash(i, seed) * 0.4;
          const d = Rt * (0.64 + 0.1 * hash(i, seed, 1));
          billows.push({
            x: cx + Math.cos(a) * d,
            y: oy + Math.sin(a) * d * 0.9,
            r: Rt * (0.27 + 0.1 * hash(i, seed, 2)) * (1 + 0.05 * Math.sin(f * 1.7 + i)),
            i,
          });
        }
        for (let y = 0; y < H; y++)
          for (let x = 0; x < W; x++) {
            let best = null,
              m = 0;
            for (const b of billows) {
              const c = 1 - Math.hypot(x + 0.5 - b.x, y + 0.5 - b.y) / b.r;
              if (c > m) {
                m = c;
                best = b;
              }
            }
            if (!best) continue;
            const dc = Math.hypot(x + 0.5 - cx, y + 0.5 - oy) / Rt;
            const lx = (x + 0.5 - best.x) / best.r,
              ly = (y + 0.5 - best.y) / best.r;
            const light = clamp(0.55 - lx * 0.3 - ly * 0.55);
            if (cool > 0 && best.i && hash(best.i, seed, 9) * 0.55 + (1 - dc) * 0.55 < cool) {
              set(x, y, 7 + band(light * 0.9, 4, x, y));
              continue;
            }
            const v = (1 - dc) * 0.8 + light * 0.5 - 0.12 + (f < 4 ? 0.3 : 0) - cool * 0.7;
            set(x, y, 1 + band(v, 6, x, y));
          }
        return;
      }
      // Smoke: puffs rise and swell, then dither away; last embers wink out.
      const k = (f - 12) / (FIREBALL_FRAMES - 13);
      const puffs = [];
      for (let i = 0; i < 8; i++) {
        const a = hash(i, seed) * tau,
          rr = R * 0.5 * hash(i, seed, 1);
        puffs.push({
          x: cx + Math.cos(a) * rr,
          y: cy + Math.sin(a) * rr * 0.6 - R * (0.25 + 0.95 * k) * (0.6 + 0.6 * hash(i, seed, 2)),
          r: R * (0.24 + 0.14 * hash(i, seed, 3)) * (1 + 0.4 * k),
        });
      }
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
          let best = null,
            m = 0;
          for (const p of puffs) {
            const c = 1 - Math.hypot(x + 0.5 - p.x, y + 0.5 - p.y) / p.r;
            if (c > m) {
              m = c;
              best = p;
            }
          }
          if (!best) continue;
          const n = noise(x / 5, y / 5, seed + f);
          if (dith(x, y) * 0.85 + n * 0.35 < k * 1.2 - 0.2) continue;
          const lv = clamp(0.5 - ((y - best.y) / best.r) * 0.5 - ((x - best.x) / best.r) * 0.2);
          set(x, y, 7 + band(lv, 4, x, y));
        }
      if (k < 0.8)
        for (let i = 0; i < 12; i++) {
          if (hash(i, f, seed) < 0.35) continue;
          set(
            cx + (hash(i, seed, 6) - 0.5) * R * 1.6,
            cy - R * (0.2 + hash(i, seed, 7) * 0.9) - k * R * 0.5,
            i % 3 ? 5 : 6,
          );
        }
    });
    return { img, cx, cy };
  }
  function scorch(R, seed) {
    R = Math.max(14, Math.round(R));
    const W = Math.ceil(R * 2.2),
      H = Math.ceil(R * 1.3);
    return sprite(
      `scorch:${R}:${seed % 3}`,
      W,
      H,
      [SMOKE[0], SMOKE[0], SMOKE[1], FIRE[1]],
      set => {
        for (let y = 0; y < H; y++)
          for (let x = 0; x < W; x++) {
            const dx = (x + 0.5 - W / 2) / (R * 1.0),
              dy = (y + 0.5 - H / 2) / (R * 0.56);
            const d = Math.hypot(dx, dy) * (1 + 0.18 * (noise(x / 6, y / 6, seed) - 0.5));
            if (d < 0.35 && dith(x, y) > 0.85) set(x, y, 3);
            else if (d < 0.55) set(x, y, d < 0.3 ? 1 : 2);
            else if (d < 1 && dith(x, y) < (1 - d) * 2.2 - 0.1) set(x, y, 2);
          }
      },
      false,
    );
  }
  function fireballAir(event, pose, c, grid) {
    const a = pose.area;
    const hand = pose.hand,
      center = a ? { x: a.x, y: a.y } : pose.target;
    if (!center) return;
    const R = ((a?.feet || 20) / (grid.feet || 5)) * PX;
    const hitAt = CAST + plan(event).travel;
    const C = P(center);
    // Bead in flight: flickering core, long ember trail.
    if (c.t >= CAST && c.t < hitAt && hand) {
      const k = (c.t - CAST) / (hitAt - CAST);
      const H = P(hand);
      const at = q => {
        const e = q * q * (3 - 2 * q) * 0.25 + q * 0.75;
        return { x: mix(H.x, C.x, e), y: mix(H.y, C.y - R * 0.2, e) - Math.sin(q * Math.PI) * 14 };
      };
      for (let i = 12; i >= 1; i--) {
        const q = k - i * 0.03;
        if (q <= 0) continue;
        const p = at(q);
        const jx = (hash(i, Math.floor(c.raw / 40)) - 0.5) * 3;
        const s = i < 4 ? 4 : i < 8 ? 3 : 2;
        dot(p.x + jx, p.y, i < 6 ? FIRE[0] : SMOKE[0], s + 2);
        dot(p.x + jx, p.y, i < 3 ? FIRE[4] : i < 6 ? FIRE[3] : i < 9 ? FIRE[2] : SMOKE[2], s);
      }
      const p = at(k);
      const flick = Math.floor(c.raw / 50) % 2;
      disc(p.x, p.y, 5, FIRE[0]);
      disc(p.x, p.y, 4, FIRE[3]);
      disc(p.x, p.y, 3 - flick, FIRE[5]);
      dot(p.x - 1, p.y - 1, WHITE, 2);
    }
    if (c.t < hitAt) return;
    // The flash pair alternates over everything during the hitstop; the fireball body itself is
    // painted on the ground layer so the figures stay readable in front of it.
    if (c.frozen) {
      const { img, cx, cy } = fireballFrame(R, Math.floor(c.into / 33) % 2, event.seed || 0);
      blit(img, C.x - cx, C.y - R * 0.2 - cy);
      return;
    }
    const f = Math.floor((c.t - hitAt) / FIREBALL_MS) + 2;
    // Debris kicked outward with the fireball, in front of the figures.
    if (f >= 2 && f < 9) {
      const k = (f - 2) / 7;
      for (let i = 0; i < 14; i++) {
        const ang = hash(i, event.seed, 8) * tau;
        const r = R * (0.5 + ease(k) * (0.7 + hash(i, 2) * 0.5));
        const x = C.x + Math.cos(ang) * r,
          y = C.y + Math.sin(ang) * r * 0.55 - Math.sin(k * Math.PI) * R * 0.5 * hash(i, 4);
        dot(x, y, FIRE[0], 3);
        dot(x, y, i % 2 ? FIRE[4] : FIRE[5], 1);
      }
    }
  }
  function fireballGround(event, pose, c, grid) {
    const a = pose.area;
    if (!a) return;
    const R = (a.feet / (grid.feet || 5)) * PX;
    const hitAt = CAST + plan(event).travel;
    const C = P(a);
    if (c.t < hitAt) return;
    const e = c.t - hitAt;
    // Scorch decal lingers and steps out.
    const life = 1 - clamp((e - 1300) / 1800);
    if (e > 80 && life > 0) {
      const s = scorch(R, event.seed || 0);
      blit(s, C.x - s.width / 2, C.y - s.height / 2, Math.min(1, e / 200) * life);
      if (life > 0.4)
        for (let i = 0; i < 10; i++)
          if (hash(i, Math.floor(c.raw / 120), event.seed) > 0.45)
            dot(C.x + (hash(i, 1) - 0.5) * R * 1.4, C.y + (hash(i, 2) - 0.5) * R * 0.7, i % 2 ? FIRE[4] : FIRE[3], 1);
    }
    // Shockwave ring of dust, quick and flat.
    if (e < 320) {
      const k = e / 320;
      const r = R * (0.3 + 0.85 * ease(k));
      ellipse(C.x, C.y + 1, r, r * 0.55, DUST[0], 3, k > 0.45 ? 9 : 0);
      ellipse(C.x, C.y, r, r * 0.55, k < 0.3 ? WHITE : DUST[2], k < 0.5 ? 2 : 1, k > 0.45 ? 9 : 0);
    }
    const f = c.frozen ? -1 : Math.floor(e / FIREBALL_MS) + 2;
    if (f >= 2 && f < FIREBALL_FRAMES) {
      const { img, cx, cy } = fireballFrame(R, f, event.seed || 0);
      blit(img, C.x - cx, C.y - R * 0.2 - cy);
    }
  }

  // ---------------------------------------------------------------- magic missile
  const DART = [
    '......oo....',
    '...ooolwo...',
    'oobbllwwwo..',
    'obbllwwwwwoo',
    'oobbllwwwo..',
    '...ooolwo...',
    '......oo....',
  ];
  function dartSprite(v) {
    const key = { o: 0, b: 2, l: 3, w: v ? 4 : 5 };
    return sprite(
      `dart:${v}`,
      12,
      7,
      [FORCE[0], FORCE[1], FORCE[2], FORCE[3], FORCE[4], WHITE],
      set => {
        DART.forEach((row, y) => [...row].forEach((ch, x) => ch !== '.' && set(x, y, key[ch])));
      },
      false,
    );
  }
  function missileAir(event, pose, c, targets) {
    const hand = pose.hand;
    if (!hand) return;
    const { hits } = plan(event);
    const H = P(hand);
    hits.forEach((hit, i) => {
      const target = targets.find(t => t.id === hit.id) || targets[i % Math.max(1, targets.length)];
      if (!target) return;
      const T = P(contact(target, hand));
      const launch = CAST + i * 22;
      const arrive = hit.at;
      const count = hits.length;
      const fan = (i - (count - 1) / 2) * 9 || -8;
      const path = q => {
        const dx = T.x - H.x,
          dy = T.y - H.y,
          len = Math.hypot(dx, dy) || 1;
        const bow = Math.sin(q * Math.PI) * (fan + Math.sign(fan) * len * 0.07);
        return {
          x: mix(H.x, T.x, q) - (dy / len) * bow,
          y: mix(H.y, T.y, q) + (dx / len) * bow - Math.sin(q * Math.PI) * 8,
        };
      };
      if (c.t >= launch && c.t < arrive) {
        const q = (c.t - launch) / (arrive - launch);
        const k = q * q * 0.35 + q * 0.65; // accelerates into the target
        // Afterimages and a pixel trail that zig-zags.
        for (let j = 8; j >= 1; j--) {
          const qq = k - j * 0.028;
          if (qq <= 0) continue;
          const p = path(qq);
          const z = j % 2 ? 1 : -1;
          dot(p.x, p.y + z, FORCE[0], j < 4 ? 3 : 2);
          dot(p.x, p.y + z, j < 3 ? FORCE[4] : j < 6 ? FORCE[3] : FORCE[2], 1);
        }
        const p = path(k),
          prev = path(Math.max(0, k - 0.02));
        blitRotated(dartSprite(Math.floor(c.raw / 45 + i) % 2), p.x, p.y, Math.atan2(p.y - prev.y, p.x - prev.x), 0.8);
      }
      // Hit mark runs on real time, so it keeps moving through the hitstop.
      const real = c.raw - hit.freeze.raw;
      drawHit('force', T, real);
      shards(T, real - 20, FORCE, i * 7 + 3, 5, 16);
    });
  }

  // ---------------------------------------------------------------- eldritch blast
  function beam(H, T, e, seed) {
    // e: ms since release. Fires in ~1 frame, holds, then breaks into dashes.
    const dx = T.x - H.x,
      dy = T.y - H.y,
      L = Math.hypot(dx, dy) || 1;
    const ux = dx / L,
      uy = dy / L,
      nx = -uy,
      ny = ux;
    const reach = clamp(e / 34);
    const fade = e < 170 ? 0 : clamp((e - 170) / 130);
    if (fade >= 1) return;
    const width = Math.max(1, Math.round(e < 60 ? 7 : mix(7, 3, clamp((e - 60) / 140))));
    const tick = Math.floor(e / 45);
    const off = s => {
      const env = Math.sin((s / L) * Math.PI);
      return (noise(s / 9, tick, seed) - 0.5) * 6 * env;
    };
    const passes = [
      [ELDRITCH[0], width + 2],
      [ELDRITCH[2], width],
      [ELDRITCH[3], Math.max(1, width - 2)],
      [WHITE, Math.max(1, width - 4)],
    ];
    for (const [color, w] of passes)
      for (let s = 0; s <= L * reach; s += 1) {
        if (fade && Math.floor(s / 6) % 3 < fade * 3) continue;
        const o = off(s);
        dot(H.x + ux * s + nx * o, H.y + uy * s + ny * o, color, w);
      }
    // Edge-on rings riding the beam toward the target.
    if (fade < 0.5)
      for (let r = 0; r < 3; r++) {
        const s = ((e / 220 + r / 3) % 1) * L * reach;
        const o = off(s);
        const cx = H.x + ux * s + nx * o,
          cy = H.y + uy * s + ny * o;
        for (const [color, w] of [
          [ELDRITCH[0], 3],
          [ELDRITCH[4], 1],
        ])
          for (let i = 0; i < 16; i++) {
            const a = (i / 16) * tau;
            const px = Math.cos(a) * 2.5,
              py = Math.sin(a) * 7;
            dot(cx + ux * px + nx * py, cy + uy * px + ny * py, color, w);
          }
      }
  }
  function eldritchAir(event, pose, c, targets) {
    const hand = pose.hand;
    if (!hand) return;
    const H = P(hand);
    plan(event).hits.forEach((hit, i) => {
      const target = targets.find(t => t.id === hit.id) || targets[i % Math.max(1, targets.length)];
      if (!target) return;
      const T = P(contact(target, hand));
      const release = hit.at - plan(event).travel;
      const e = c.t - release;
      if (e >= 0) beam(H, T, e, (event.seed || 0) + i * 13);
      const real = c.raw - hit.freeze.raw;
      drawHit('eldritch', T, real);
      shards(T, real, ELDRITCH, i * 5 + 1, 8, 26);
      // muzzle crackle at the hand while the beam holds
      if (e >= 0 && e < 160) {
        const flick = Math.floor(c.raw / 33) % 2;
        disc(H.x, H.y, 4.5, flick ? ELDRITCH[0] : WHITE);
        disc(H.x, H.y, 2.5, flick ? ELDRITCH[4] : ELDRITCH[0]);
      }
    });
  }

  // ---------------------------------------------------------------- thorn whip
  function thornAir(event, pose, c, targets) {
    const hand = pose.hand;
    if (!hand) return;
    const hit = plan(event).hits[0];
    const target = targets.find(t => t.id === hit.id) || targets[0];
    if (!target) return;
    const H = P(hand);
    const pull = reaction(event, target.id, c.now);
    const T0 = contact(target, hand);
    const T = P({ x: T0.x + pull.x, y: T0.y + pull.y });
    const t = c.t - CAST;
    if (t < 0) return;
    const lash = 150;
    const dx = T.x - H.x,
      dy = T.y - H.y,
      L = Math.hypot(dx, dy) || 1;
    const ux = dx / L,
      uy = dy / L,
      nx = -uy,
      ny = ux;
    // grow → snap taut → yank → retract
    let reach, amp;
    if (t < lash) {
      reach = ease(t / lash);
      amp = 9 * (1 - reach * 0.4);
    } else if (t < 450) {
      reach = 1;
      amp = 9 * 0.6 * Math.exp(-(t - lash) / 45);
    } else {
      reach = 1 - ease(clamp((t - 450) / 200));
      amp = 3 * (1 - reach);
    }
    if (reach <= 0.01) return;
    const from = t >= 450 ? L * (1 - reach) : 0; // retracts from the target back into the hand
    const to = t >= 450 ? L : L * reach;
    const wave = s => amp * Math.sin((s / L) * Math.PI * 3 - t / 22) * (s / L) ** 0.9;
    const at = s => {
      const o = wave(s);
      // retracting: the vine slides back toward the hand
      const shift = t >= 450 ? -from : 0;
      return { x: H.x + ux * (s + shift) + nx * o, y: H.y + uy * (s + shift) + ny * o };
    };
    const thick = s => (s / L < 0.45 ? 4 : s / L < 0.8 ? 3 : 2);
    for (const [color, grow] of [
      [VINE[0], 2],
      [VINE[2], 0],
    ])
      for (let s = from; s <= to; s += 1) {
        const p = at(s);
        dot(p.x, p.y, color, thick(s) + grow);
      }
    for (let s = from; s <= to; s += 2) {
      const p = at(s);
      if (thick(s) > 1) dot(p.x, p.y - 1, VINE[3], 1);
    }
    // thorns raked back toward the caster, leaves every so often
    for (let s = from + 5, k = 0; s <= to - 2; s += 7, k++) {
      const p = at(s);
      const side = k % 2 ? 1 : -1;
      const w = thick(s);
      const bx = p.x + nx * side * (w / 2 + 1),
        by = p.y + ny * side * (w / 2 + 1);
      const tx = bx + nx * side * 2 - ux * 1.5,
        ty = by + ny * side * 2 - uy * 1.5;
      dot(bx, by, THORN[0], 3);
      dot(tx, ty, THORN[0], 2);
      dot(bx, by, THORN[1], 1);
      dot(tx, ty, THORN[2], 1);
      if (k % 3 === 1) {
        const lx = p.x - nx * side * (w / 2 + 3),
          ly = p.y - ny * side * (w / 2 + 3);
        dot(lx, ly, VINE[0], 4);
        dot(lx, ly, VINE[3], 3);
        dot(lx - 0.5, ly - 0.5, VINE[4], 1);
      }
    }
    // tip
    const tip = at(to);
    dot(tip.x, tip.y, VINE[0], 4);
    dot(tip.x, tip.y, t < lash ? VINE[4] : VINE[3], 2);
    const real = c.raw - hit.freeze.raw;
    drawHit('thorn', T, real);
    // leaves torn off on contact and drifting down
    if (real >= 0 && real < 700)
      for (let i = 0; i < 7; i++) {
        const k = real / 700;
        const a = hash(i, 31) * tau;
        const x = T.x + Math.cos(a) * ease(clamp(k * 2.5)) * 18 + Math.sin(k * 9 + i) * 3;
        const y = T.y + Math.sin(a) * ease(clamp(k * 2.5)) * 10 + k * k * 22;
        if (k > 0.7 && (i + Math.floor(c.raw / 60)) % 2) continue;
        dot(x, y, VINE[0], 3);
        dot(x, y, i % 2 ? VINE[3] : VINE[4], 2);
      }
  }

  // ---------------------------------------------------------------- reactions, shake, flash
  /* Offset (grid cells) for a token caught by one of these spells: hitstop vibration, then knockback
     (or the thorn whip's yank toward the caster). */
  function reaction(event, id, now, reduced = false) {
    if (!ids.has(event.id)) return { x: 0, y: 0 };
    const p = plan(event);
    const dir = p.dirs.get(id);
    let x = 0,
      y = 0;
    for (const hit of p.hits) {
      if (hit.id !== id) continue;
      const e = now - event.started - hit.freeze.raw;
      if (e < 0) continue;
      if (e < hit.stop) {
        if (reduced) continue;
        const amp = hit.power * (1 - e / hit.stop);
        x += (Math.floor(e / 30) % 2 ? 1 : -1) * amp; // ground hit: horizontal shake, big → small
        continue;
      }
      if (!dir) continue;
      const k = e - hit.stop;
      let push = 0;
      if (hit.kind === 'whip') {
        const t = k - 40; // the vine goes taut, then yanks
        push = t < 0 ? 0 : t < 180 ? -0.6 * back(t / 180) : -0.6 * Math.max(0, 1 - (t - 180) / 360);
      } else {
        const size = { blast: 0.3, beam: 0.2, dart: 0.07 }[hit.kind] || 0.1;
        push = k < 80 ? size * ease(k / 80) : size * Math.max(0, 1 - (k - 80) / 300);
      }
      x += dir.x * push;
      y += dir.y * push;
    }
    return { x, y };
  }
  function shake(event, now) {
    if (!ids.has(event.id)) return null;
    const p = plan(event);
    let x = 0,
      y = 0;
    const raw = now - event.started;
    for (const f of p.freezes) {
      const e = raw - f.raw;
      const kind = p.hits.find(h => h.freeze === f)?.kind;
      const spec = {
        blast: [340, 5 + Math.max(0, (event.level || 3) - 3), 1, 0.8],
        beam: [130, 2.6, 1, 0.3],
        dart: [70, 1.6, 0, 1],
        whip: [100, 1.8, 0.2, 1],
      }[kind];
      if (!spec || e < 0 || e >= spec[0]) continue;
      const [dur, amp, ax, ay] = spec;
      const decay = (1 - e / dur) ** 2;
      const step = Math.floor(e / 32);
      x += (hash(step, f.at, 1) - 0.5) * 2 * amp * ax * decay;
      y += (hash(step, f.at, 2) - 0.5) * 2 * amp * ay * decay;
    }
    return { x, y };
  }
  function flash(event, now) {
    if (!ids.has(event.id)) return null;
    const p = plan(event);
    const raw = now - event.started;
    for (const f of p.freezes) {
      const e = raw - f.raw;
      if (e < 0) continue;
      if (event.id === 'fireball') {
        if (e < 35) return { color: '#fff3d6', alpha: 0.3 };
        if (e < 75) return { color: '#1a0705', alpha: 0.26 };
      } else if (event.id === 'eldritch-blast' && e < 30) return { color: '#f0d0ff', alpha: 0.12 };
    }
    return null;
  }

  // ---------------------------------------------------------------- entry points used by BoardSpellFX
  function remember(event, pose) {
    const p = plan(event);
    for (const t of pose.targets || []) {
      if (p.dirs.has(t.id)) continue;
      const from = event.id === 'fireball' && pose.area ? pose.area : pose.hand;
      if (!from) continue;
      const dx = (t.baseX ?? t.x) - from.x,
        dy = (t.baseY ?? t.y) - from.y,
        d = Math.hypot(dx, dy) || 1;
      p.dirs.set(t.id, { x: dx / d, y: dy / d });
    }
  }
  function frame(event, pose, now, grid, layer) {
    const c = clock(event, now);
    c.now = now;
    const ramp = tint[event.id];
    const targets = pose.targets?.length ? pose.targets : pose.target ? [{ ...pose.target, span: 1, id: null }] : [];
    const R = event.id === 'fireball' && pose.area ? pose.area.feet / (grid.feet || 5) : 0;
    const box = boxOf([
      pose.hand && { ...pose.hand, r: 1.4 },
      pose.base && { ...pose.base, r: (pose.base.span || 1) * 0.8 },
      ...targets.map(t => ({ x: t.x, y: t.y, r: Math.max(1.4, t.span || 1) })),
      pose.area && { x: pose.area.x, y: pose.area.y, r: R * 1.3 + 0.5, up: R * 1.6 },
    ]);
    if (!Number.isFinite(box[0])) return false;
    begin(box);
    if (layer === 'ground') {
      castCircle(pose.base, c.t, ramp);
      if (event.id === 'fireball') fireballGround(event, pose, c, grid);
    } else {
      remember(event, pose);
      handCharge(pose.hand, c.t, ramp, event.seed || 0);
      if (event.id === 'fireball') fireballAir(event, pose, c, grid);
      else if (event.id === 'magic-missile') missileAir(event, pose, c, targets);
      else if (event.id === 'eldritch-blast') eldritchAir(event, pose, c, targets);
      else if (event.id === 'thorn-whip') thornAir(event, pose, c, targets);
    }
    return true;
  }
  const api = {
    enabled: true,
    PX,
    handles: event => api.enabled && !!event && ids.has(event.id),
    ids: [...ids],
    timing,
    clock,
    reaction,
    shake,
    flash,
    drawGround(ctx, event, pose, now, grid) {
      if (frame(event, pose, now, grid, 'ground')) end(ctx);
    },
    drawAir(ctx, event, pose, now, grid) {
      if (frame(event, pose, now, grid, 'air')) end(ctx);
    },
  };
  root.BoardPixelFX = api;
})(typeof window !== 'undefined' ? window : globalThis);
