/* Pixel spells, batch 02: palette-driven auras, contact magic and supporting archetypes. */
(function (root) {
  'use strict';
  const FX = root.BoardPixelFX;
  if (!FX) return;
  const k = FX.kit;

  const seed = s => s.event.seed || 0;
  const colors = ramp => ramp.join(',');
  const radius = s => Math.max(8, ((s.area?.feet || 5) / (s.grid.feet || 5)) * k.PX);
  const caster = s => s.pose.base || s.pose.hand;
  const destination = s => s.pose.target || s.area || s.targets[0] || caster(s);
  const targetFor = (s, hit) => s.targets.find(t => t.id === hit.id);
  const body = (s, hit) => {
    const target = targetFor(s, hit);
    return target ? k.contact(target, s.pose.hand || target) : destination(s);
  };
  const feet = (s, hit) => {
    const target = targetFor(s, hit);
    return target ? { x: target.baseX ?? target.x, y: target.baseY ?? target.y } : destination(s);
  };
  const beats = (event, travel, kind = 'hit', stop = 80, power = 0.055) =>
    (event.targets?.length ? event.targets : [null]).map(target => ({
      at: k.CAST + travel,
      stop,
      target,
      kind,
      power,
    }));

  function mote(p, ramp, index = 4, size = 1) {
    k.dot(p.x, p.y, ramp[0], size + 2);
    k.dot(p.x, p.y, ramp[index], size);
  }
  function orb(p, r, ramp, index = 3) {
    k.disc(p.x, p.y, r + 1, ramp[0]);
    k.disc(p.x, p.y, r, ramp[index]);
    if (r >= 3) k.disc(p.x - 1, p.y - 1, Math.max(1, r - 2), ramp[4]);
  }
  function mark(s, hit, at, key, size = 30, count = 6, reach = 20) {
    const e = s.real(hit);
    k.drawHit(k.hitStyle(`02:${key}:${colors(s.ramp)}`, s.ramp, { S: size, spikes: 6, jag: 0.3 }), at, e);
    k.shards(at, e, s.ramp, seed(s) + s.hits.indexOf(hit) * 19, count, reach);
  }

  // Raster rings and sigils are cached in local coordinates, independent of the board buffer origin.
  function ring(at, rx, ry, ramp, index = 3, broken = false, alpha = 1) {
    rx = Math.max(2, Math.round(rx));
    ry = Math.max(2, Math.round(ry));
    const w = rx * 2 + 7,
      h = ry * 2 + 7;
    const image = k.sprite(`02:ring:${rx}:${ry}:${index}:${broken}:${colors(ramp)}`, w, h, ramp, set => {
      const steps = Math.max(16, Math.ceil(k.tau * Math.max(rx, ry) * 1.5));
      for (let i = 0; i < steps; i++) {
        if (broken && Math.floor((i / steps) * 24) % 3 === 0) continue;
        const a = (i / steps) * k.tau;
        set(w / 2 + Math.cos(a) * rx, h / 2 + Math.sin(a) * ry, index);
      }
    });
    k.blit(image, at.x - w / 2, at.y - h / 2, alpha);
  }
  function rune(at, r, ramp, phase = 0, alpha = 1) {
    r = Math.max(4, Math.round(r));
    const w = r * 2 + 9,
      h = Math.ceil(r * 1.2) + 9;
    const image = k.sprite(`02:rune:${r}:${phase}:${colors(ramp)}`, w, h, ramp, set => {
      const cx = Math.floor(w / 2),
        cy = Math.floor(h / 2),
        index = phase === 0 ? 4 : phase === 1 ? 3 : 2;
      const put = (x, y, color = index) => set(cx + Math.round(x), cy + Math.round(y), color);
      const steps = Math.ceil(k.tau * r * 1.5);
      for (let i = 0; i < steps; i++) {
        const a = (i / steps) * k.tau;
        if (phase === 2 && Math.floor((i / steps) * 16) % 2) continue;
        put(Math.cos(a) * r, Math.sin(a) * r * 0.55);
        if (r > 7 && i % 3 !== 0) put(Math.cos(a) * (r - 4), Math.sin(a) * (r - 4) * 0.55, 2);
      }
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * k.tau;
        const x = Math.cos(a) * r,
          y = Math.sin(a) * r * 0.55;
        for (let j = -2; j <= 2; j++) {
          put(x + j, y - 2, index);
          put(x, y + j, index);
        }
      }
      // An open diamond reads as a seal without filling the space beneath the figure.
      for (let i = 0; i < 4; i++) {
        put(i, 3 - i, index);
        put(-i, 3 - i, index);
        put(i, i - 3, index);
        put(-i, i - 3, index);
      }
    });
    k.blit(image, at.x - w / 2, at.y - h / 2, alpha);
  }
  function sparkle(at, e, ramp, plus = false, size = 4, duration = 300) {
    if (e < 0 || e >= duration) return;
    const arm = Math.max(1, size - Math.floor((e / duration) * size));
    const w = size * 2 + 5;
    const index = e < 70 ? 5 : e < duration * 0.65 ? 4 : 3;
    const image = k.sprite(`02:spark:${plus}:${size}:${arm}:${index}:${colors(ramp)}`, w, w, ramp, set => {
      const c = Math.floor(w / 2);
      for (let i = -arm; i <= arm; i++) {
        set(c + i, c, index);
        set(c, c + i, index);
        if (plus && Math.abs(i) < arm) {
          set(c + i, c - 1, index);
          set(c + i, c + 1, index);
          set(c - 1, c + i, index);
          set(c + 1, c + i, index);
        }
      }
    });
    k.blit(image, at.x - w / 2, at.y - w / 2);
  }
  function puff(at, e, ramp, salt, reach = 14) {
    if (e < 0 || e >= 380) return;
    const q = Math.floor(e / 38) / 10;
    for (let i = 0; i < 6; i++) {
      if (q > 0.7 && i % 2) continue;
      const a = (i / 6) * k.tau + k.hash(i, salt) * 0.35;
      const d = reach * k.ease(k.clamp(q * 1.5));
      const p = { x: at.x + Math.cos(a) * d, y: at.y + Math.sin(a) * d * 0.4 - q * 8 };
      const r = Math.max(1, Math.round(q < 0.2 ? 3 + q * 10 : 5 * (1 - q)));
      orb(p, r, ramp, q < 0.2 ? 4 : q < 0.55 ? 2 : 1);
    }
  }
  function pillar(at, e, ramp, width) {
    if (e < 0 || e >= 280) return;
    const frame = Math.floor(e / 40),
      w = width + 6,
      h = 38;
    const image = k.sprite(`02:pillar:${width}:${frame}:${colors(ramp)}`, w, h, ramp, set => {
      for (let y = 3; y < h - 3; y++) {
        const half = Math.max(2, Math.round((width / 2) * (0.65 + (y / h) * 0.35)));
        for (let x = -half; x <= half; x++) {
          if (frame > 3 && (Math.abs(x) % 4 < 2 || y > h - 3 - (frame - 3) * 7)) continue;
          const band = Math.abs(x) / half;
          set(Math.floor(w / 2) + x, y, band < 0.3 ? 5 : band < 0.7 ? 4 : 2);
        }
      }
    });
    k.blit(image, at.x - w / 2, at.y - h + 3);
  }

  function auraLoop(s, active) {
    const point = caster(s);
    const e = s.c.raw - k.CAST;
    if (!point || e < 0 || (!active && e >= 600) || (active && s.linger <= 0)) return;
    const C = k.P(point),
      R = radius(s),
      life = active ? k.clamp(s.linger) : 1 - k.clamp((e - 350) / 250);
    ring(C, R, R, s.ramp, 2, true, life);
    const count = Math.ceil(12 * life);
    for (let i = 0; i < count; i++) {
      const a = (i / 12) * k.tau + s.c.raw / 800 + k.hash(0, seed(s)) * k.tau;
      const p = { x: C.x + Math.cos(a) * R, y: C.y + Math.sin(a) * R - 2 };
      mote(p, s.ramp, i % 3 === 0 ? 4 : 3, i % 3 === 0 ? 2 : 1);
      mote({ x: p.x + Math.sin(a) * 3, y: p.y - Math.cos(a) * 3 }, s.ramp, 2);
    }
  }
  function supportGround(s, healing) {
    for (const hit of s.hits) {
      const point = feet(s, hit),
        e = s.real(hit);
      if (!point || e < 0 || e >= 640) continue;
      const target = targetFor(s, hit),
        r = Math.max(9, Math.min(20, (target?.span || 1) * 11));
      if (healing) ring(k.P(point), r, r * 0.5, s.ramp, e < 90 ? 4 : 2, e > 400);
      else rune(k.P(point), r, s.ramp, e < 90 ? 0 : e < 400 ? 1 : 2);
    }
  }
  function supportAir(s, healing) {
    for (const hit of s.hits) {
      const point = feet(s, hit),
        e = s.real(hit);
      if (!point || e < 0 || e >= 650) continue;
      const C = k.P(point),
        target = targetFor(s, hit),
        r = Math.max(5, Math.min(12, (target?.span || 1) * 7));
      for (let i = 0; i < (healing ? 12 : 8); i++) {
        const q = (e - k.hash(i, seed(s), 2) * 100) / 520;
        if (q < 0 || q >= 1) continue;
        const a = (i / (healing ? 6 : 8)) * k.tau + q * (healing ? k.tau * 1.5 : 0.5);
        const p = { x: C.x + Math.cos(a) * r, y: C.y - q * 26 + Math.sin(a) * r * 0.4 };
        mote(p, s.ramp, i % 3 === 0 ? 4 : i % 3 === 1 ? 3 : 2, q > 0.8 ? 1 : 2);
      }
      const B = body(s, hit);
      if (B) {
        const at = k.P(B);
        sparkle(
          { x: at.x, y: at.y - (healing ? 7 : 4) - Math.floor(e / 120) },
          e - 100,
          s.ramp,
          healing,
          healing ? 5 : 3,
          380,
        );
      }
    }
  }
  const entries = event => (event.darts?.length ? event.darts : event.rays?.length ? event.rays : event.targets || []);
  const multiEnd = (event, travel) => k.CAST + travel + Math.max(0, entries(event).length - 1) * 80 + 320;

  // Aura instant: one caster-centred shock front reaches the radius, fractures, and cracks every target.
  FX.register('kind:aura-instant', {
    travel: 180,
    beats: (event, kit, travel) =>
      (event.targets || []).map(target => ({ at: kit.CAST + travel, stop: 110, target, kind: 'blast', power: 0.075 })),
    end: (event, travel) => k.CAST + travel + 400,
    ground(s) {
      const point = caster(s),
        e = s.c.raw - k.CAST;
      if (!point || e < 0 || e >= 430) return;
      const q = Math.min(1, Math.floor(e / 15) / 12),
        R = radius(s) * (0.12 + 0.88 * k.ease(q));
      ring(k.P(point), R, R, s.ramp, e < 80 ? 5 : e < 220 ? 3 : 2, e >= 240);
    },
    air(s) {
      for (const hit of s.hits) {
        const point = body(s, hit);
        if (point) mark(s, hit, k.P(point), 'aura', 34, 7, 22);
      }
      const point = caster(s),
        e = s.c.raw - k.CAST;
      if (!point || e < 0 || e >= 340) return;
      const C = k.P(point),
        r = radius(s) * (0.12 + 0.88 * k.ease(k.clamp(e / 180)));
      for (let i = 0; i < 12; i++) {
        if (e > 250 && i % 2) continue;
        const a = (i / 12) * k.tau + k.hash(0, seed(s)) * k.tau;
        mote(
          { x: C.x + Math.cos(a) * r, y: C.y + Math.sin(a) * r - Math.sin((e / 340) * Math.PI) * 4 },
          s.ramp,
          e < 100 ? 4 : 2,
        );
      }
    },
  });

  // Aura persistent: a cast-time air pulse establishes an orbit of outlined motes that loops while active.
  FX.register('kind:aura-persistent', {
    travel: 0,
    beats: () => [],
    end: () => k.CAST + 600,
    ground(s) {
      if (!(s.pose.linger > 0)) auraLoop(s, false);
    },
    air(s) {
      const point = caster(s),
        e = s.c.raw - k.CAST;
      if (!point || e < 0 || e >= 280) return;
      const C = k.P(point),
        q = Math.floor(e / 20) / 14,
        r = radius(s) * (0.15 + 0.85 * k.ease(q));
      ring({ x: C.x, y: C.y - 5 }, r, r * 0.55, s.ramp, e < 60 ? 5 : 3, e > 160);
    },
    linger: s => auraLoop(s, true),
  });

  // Touch: an instant hand-to-body lunge spark, a compact contact star and chips through the hitstop.
  FX.register('kind:touch', {
    travel: 0,
    beats: (event, kit, travel) => beats(event, travel, 'hit', 85),
    end: () => k.CAST + 400,
    air(s) {
      for (const hit of s.hits) {
        const point = body(s, hit);
        if (!point) continue;
        const T = k.P(point),
          e = s.real(hit);
        if (s.pose.hand && e >= 0 && e < 95) {
          const H = k.P(s.pose.hand),
            dx = T.x - H.x,
            dy = T.y - H.y,
            length = Math.hypot(dx, dy) || 1,
            steps = Math.max(1, Math.min(48, Math.ceil(length / 2)));
          for (const [index, size] of [
            [0, 5],
            [4, 3],
          ]) {
            for (let i = 0; i <= steps; i++) {
              const q = i / steps,
                jog = Math.sin(q * Math.PI) * (e < 40 ? 3 : -2);
              k.dot(
                k.mix(H.x, T.x, q) - (dy / length) * jog,
                k.mix(H.y, T.y, q) + (dx / length) * jog,
                s.ramp[index],
                size,
              );
            }
          }
          sparkle(H, e, s.ramp, false, 3, 95);
        }
        mark(s, hit, T, 'touch', 32, 8, 18);
      }
    },
  });

  // Teleport: the departure seal pinches shut in mist; a displaced arrival seal bursts into sharp stars.
  FX.register('kind:teleport', {
    travel: 160,
    beats: () => [],
    end: () => k.CAST + 700,
    ground(s) {
      const from = s.event.teleport?.from || caster(s),
        to = s.event.teleport?.to || destination(s),
        e = s.c.raw - k.CAST;
      if (from && e >= 0 && e < 180) {
        const r = 13 * (1 - Math.floor(e / 30) / 6);
        ring(k.P(from), r, r * 0.55, s.ramp, e < 60 ? 4 : 2, e > 100);
      }
      const arrival = e - 160;
      if (to && arrival >= 0 && arrival < 340) {
        const r = 5 + 13 * k.ease(Math.floor(arrival / 34) / 10);
        ring(k.P(to), r, r * 0.55, s.ramp, arrival < 75 ? 5 : 3, arrival > 150);
      }
    },
    air(s) {
      const from = s.event.teleport?.from || caster(s),
        to = s.event.teleport?.to || destination(s),
        e = s.c.raw - k.CAST;
      if (from) puff(k.P(from), e, s.ramp, seed(s));
      if (!to) return;
      const T = k.P(to),
        arrival = e - 160;
      k.drawHit(
        k.hitStyle(`02:arrival:${colors(s.ramp)}`, s.ramp, { S: 32, spikes: 4, minor: 4, jag: 0.1 }),
        { x: T.x, y: T.y - 8 },
        arrival,
      );
      k.shards(T, arrival, s.ramp, seed(s) + 41, 8, 20);
      puff(T, arrival - 65, s.ramp, seed(s) + 17, 17);
    },
  });

  // Multi: bright dartheads fan off the hand, bend back to their marks and land as separate 80 ms beats.
  FX.register('kind:multi', {
    travel: 240,
    beats: (event, kit, travel) =>
      entries(event).map((target, i) => ({
        at: kit.CAST + travel + i * 80,
        stop: 55,
        target,
        kind: 'dart',
        power: 0.04,
      })),
    end: multiEnd,
    air(s) {
      s.hits.forEach((hit, i) => {
        const point = body(s, hit);
        if (!point) return;
        const T = k.P(point),
          launch = k.CAST + i * 14;
        if (s.pose.hand && s.c.t >= launch && s.c.t < hit.at) {
          const H = k.P(s.pose.hand),
            dx = T.x - H.x,
            dy = T.y - H.y,
            length = Math.hypot(dx, dy) || 1,
            fan = (i - (s.hits.length - 1) / 2) * 5 || -7,
            q = (s.c.t - launch) / (hit.at - launch);
          const path = u => {
            const bend = Math.sin(u * Math.PI) * Math.max(-20, Math.min(20, fan));
            return {
              x: k.mix(H.x, T.x, u) - (dy / length) * bend,
              y: k.mix(H.y, T.y, u) + (dx / length) * bend - Math.sin(u * Math.PI) * 5,
            };
          };
          const u = q * 0.65 + q * q * 0.35;
          for (let j = 8; j >= 1; j--) {
            const tail = u - j * 0.03;
            if (tail < 0) continue;
            mote(path(tail), s.ramp, j < 3 ? 4 : j < 6 ? 3 : 2, j < 3 ? 2 : 1);
          }
          const head = k.sprite(`02:dart:${colors(s.ramp)}`, 13, 9, s.ramp, set => {
            for (let x = 2; x <= 10; x++) {
              const half = Math.min(2, Math.floor((10 - x) / 2));
              for (let y = -half; y <= half; y++) set(x, 4 + y, y === 0 && x >= 5 ? 5 : y < 0 ? 4 : 3);
            }
          });
          const at = path(u),
            prev = path(Math.max(0, u - 0.02));
          k.blitRotated(head, at.x, at.y, Math.atan2(at.y - prev.y, at.x - prev.x), 0.8);
        }
        mark(s, hit, T, 'multi', 26, 5, 16);
      });
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
