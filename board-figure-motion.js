/* Figure motion on the board: the sprites don't animate, so poses are made by squashing, leaning and
 * tinting the whole figure around its feet for a fraction of a second.
 *
 *  - cast: wind-up snaps in on the first frame (squash + lean back), release stretches and lunges
 *    toward the target in ~1 frame, then settles;
 *  - hit: one light frame and one dark frame, an exaggerated squash held through the spell's hitstop,
 *    then a springy recovery, scaled by how hard the hit was;
 *  - healing and buffs: a small hop instead;
 *  - defeat: a long freeze with a flash, the figure topples with a bounce and stays down (dust burst for
 *    creatures, a softer fall for player characters).
 * With reduced effects only the defeat topple remains, without flashes.
 */
(function (root) {
  'use strict';
  const CAST = 300;
  const clamp = t => Math.max(0, Math.min(1, t));
  const ease = t => 1 - (1 - t) ** 3;
  const spring = (k, amp) => amp * Math.exp(-k * 4.2) * Math.cos(k * 10);
  const rest = () => ({ sx: 1, sy: 1, angle: 0, dx: 0, dy: 0, flash: null, alpha: 1, dust: null });
  const kindPower = {
    blast: 1,
    beam: 0.75,
    whip: 0.6,
    dart: 0.35,
  };
  const friendly = new Set(['heal', 'buff']);

  /* Hit moments for one target: [{at (ms after cast start, real time), stop, power, sign}] */
  function hitsFor(event, id) {
    const px = root.BoardPixelFX;
    if (px?.handles(event)) {
      const plan = event._px;
      if (!plan) return [];
      return plan.hits
        .filter(h => h.id === id)
        .map(h => ({ at: h.freeze.raw, stop: h.stop, power: kindPower[h.kind] ?? 0.5 }));
    }
    const fx = root.BoardSpellFX;
    if (!fx || !(event.targets || []).includes(id)) return [];
    const p = fx.phase(event, event.started, false);
    // Spells without a pixel version: one hit when the impact starts, sized by spell level.
    const travel = -p.elapsed - CAST;
    return [{ at: CAST + Math.max(0, travel), stop: 60, power: 0.35 + Math.min(0.4, (event.level || 0) * 0.07) }];
  }

  /* Direction from caster to target in screen terms (x only matters for leaning). */
  function side(from, to) {
    return to && from ? Math.sign(to.x - from.x) || 1 : 1;
  }

  /**
   * @param events  active spell events
   * @param token   { id, x, y } in any consistent units (only used for directions)
   * @param where   id → { x, y } lookup for other tokens
   * @param death   { at, pc } when this token was seen going down, or null
   */
  function pose(events, token, where, now, reduced, death) {
    const m = rest();
    for (const event of events) {
      const age = now - event.started;
      if (age < 0 || age > 4000) continue;
      // ---- caster
      if (event.caster === token.id && !reduced) {
        const aim = where(event.targets?.[0]) || event.point || event.area;
        const s = side(token, aim);
        if (age < CAST) {
          // Snap: the pose is there on the first frame, no easing in.
          const hold = 1 - clamp((age - CAST + 60) / 60) * 0.3;
          m.sy *= 1 - 0.08 * hold;
          m.sx *= 1 + 0.06 * hold;
          m.angle += -s * 0.09 * hold;
        } else if (age < CAST + 420) {
          const k = (age - CAST) / 420;
          const pop = age - CAST < 40 ? 1 : spring(k, 1);
          m.sy *= 1 + 0.1 * pop;
          m.sx *= 1 - 0.07 * pop;
          m.angle += s * 0.07 * pop;
          m.dx += s * 0.1 * Math.max(0, pop);
        }
      }
      // ---- targets
      const ids = new Set([...(event.targets || []), ...(event.darts || []), ...(event.rays || [])]);
      if (!ids.has(token.id) || event.caster === token.id) continue;
      if (friendly.has(event.kind)) {
        if (reduced) continue;
        const e = age - CAST - 120;
        if (e > 0 && e < 520) {
          const k = e / 520;
          m.dy -= Math.sin(k * Math.PI) * 0.12;
          m.sy *= 1 + Math.sin(k * Math.PI * 2) * 0.05;
          m.sx *= 1 - Math.sin(k * Math.PI * 2) * 0.04;
        }
        continue;
      }
      const from = where(event.caster) || event.area || event.point;
      const s = -side(from, token); // lean away from the source
      for (const hit of hitsFor(event, token.id)) {
        const e = age - hit.at;
        if (e < 0 || e > hit.stop + 520) continue;
        const p = hit.power;
        if (!reduced && e < 33) m.flash = 'light';
        else if (!reduced && e < 66) m.flash = 'dark';
        if (reduced) continue;
        if (e < hit.stop) {
          // Held, exaggerated hit pose: wide, short, tipped away.
          m.sx *= 1 + 0.2 * p;
          m.sy *= 1 - 0.17 * p;
          m.angle += s * 0.16 * p;
        } else {
          const k = (e - hit.stop) / 520;
          const b = spring(k, 1);
          m.sx *= 1 + 0.2 * p * b;
          m.sy *= 1 - 0.17 * p * b;
          m.angle += s * 0.16 * p * Math.max(0, b);
        }
      }
    }
    if (death) {
      const e = now - death.at;
      const freeze = 250;
      const s = death.side || 1;
      if (reduced) {
        m.angle = s * 1.25 * ease(clamp(e / 400));
        m.alpha = 1 - 0.25 * clamp(e / 400);
        return m;
      }
      if (e < freeze) {
        m.flash = Math.floor(e / 45) % 2 ? 'dark' : 'light';
        m.sx *= 1.12;
        m.sy *= 0.9;
      } else {
        const k = clamp((e - freeze) / 320);
        // Topple with a small bounce at the end, then stay down.
        const fall = k < 1 ? ease(k) : 1;
        const bounce = k >= 1 ? Math.max(0, Math.sin(clamp((e - freeze - 320) / 220) * Math.PI)) * 0.12 : 0;
        m.angle = s * (1.25 * fall - bounce);
        m.sy *= 1 - 0.06 * fall;
        m.alpha = 1 - 0.25 * clamp((e - freeze - 320) / 300);
        if (!death.pc && e - freeze < 700) m.dust = clamp((e - freeze - 200) / 500);
      }
    }
    return m;
  }

  /* Wraps a draw call so the figure is posed around its feet (fx, fy). */
  function apply(ctx, fx, fy, m) {
    if (m.sx === 1 && m.sy === 1 && !m.angle && !m.dx && !m.dy) return;
    ctx.translate(fx, fy);
    ctx.rotate(m.angle);
    ctx.scale(m.sx, m.sy);
    ctx.translate(-fx, -fy);
  }

  let scratch = null;
  /* Paints the figure's silhouette in one colour on top of it (light or dark hit frame). */
  function flash(ctx, image, x, y, w, h, kind, mirror = false) {
    if (!kind || !image) return;
    const W = Math.max(1, Math.ceil(w)),
      H = Math.max(1, Math.ceil(h));
    if (!scratch) scratch = document.createElement('canvas');
    if (scratch.width < W || scratch.height < H) {
      scratch.width = Math.max(W, scratch.width);
      scratch.height = Math.max(H, scratch.height);
    }
    const g = scratch.getContext('2d');
    g.save();
    g.clearRect(0, 0, scratch.width, scratch.height);
    g.imageSmoothingEnabled = false;
    if (mirror) {
      g.translate(W, 0);
      g.scale(-1, 1);
    }
    g.drawImage(image, 0, 0, W, H);
    g.restore();
    g.save();
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = kind === 'light' ? '#fff8e8' : '#1a1020';
    g.fillRect(0, 0, W, H);
    g.restore();
    ctx.save();
    ctx.globalAlpha *= kind === 'light' ? 0.9 : 0.55;
    ctx.drawImage(scratch, 0, 0, W, H, x, y, w, h);
    ctx.restore();
  }

  /* Pixel dust bursting off a defeated creature. size = one art pixel on screen. */
  function dust(ctx, fx, fy, k, size, seed = 1) {
    if (k == null || k <= 0 || k >= 1) return;
    const colors = ['#2a2122', '#5f5250', '#a5947f', '#e3d6b8'];
    for (let i = 0; i < 16; i++) {
      const h = Math.sin((i + 1) * 91.7 + seed * 13.1) * 43758.5;
      const r = h - Math.floor(h);
      const a = r * Math.PI * 2;
      const dist = ease(k) * size * (14 + r * 18);
      const x = fx + Math.cos(a) * dist,
        y = fy - size * 6 + Math.sin(a) * dist * 0.6 - Math.sin(k * Math.PI) * size * 6 + k * k * size * 8;
      if (k > 0.7 && i % 2) continue;
      const s = size * (i % 3 ? 2 : 3);
      ctx.fillStyle = colors[0];
      ctx.fillRect(Math.round(x - s / 2 - size / 2), Math.round(y - s / 2 - size / 2), s + size, s + size);
      ctx.fillStyle = colors[1 + (i % 3)];
      ctx.fillRect(Math.round(x - s / 2), Math.round(y - s / 2), s, s);
    }
  }

  root.BoardFigureMotion = { pose, apply, flash, dust };
})(typeof window !== 'undefined' ? window : globalThis);
