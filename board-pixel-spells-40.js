/* Pixel spells, batch 40: lasting clouds, voids and a quiet ward. */
(function (root) {
  'use strict';
  const FX = root.BoardPixelFX;
  if (!FX) return;
  const k = FX.kit;
  const FOG = ['#263541', '#536675', '#7e94a3', '#abbec8', '#d9e5e8', '#f4faf9'];
  const DARK = ['#0b0915', '#100f20', '#1c1732', '#342447', '#66517d', '#c1b5d6'];
  const HADAR = ['#080b17', '#0c1220', '#1b243b', '#435772', '#a6d1da', '#edfaff'];
  const STINK = ['#292b0e', '#55591e', '#899333', '#b9c447', '#e1e990', '#fbffd9'];
  const POISON = ['#102318', '#23452d', '#3e6839', '#70964b', '#bad185', '#eff5ce'];
  const QUIET = ['#263b50', '#455e74', '#6d8da6', '#a3c9db', '#d6edf1', '#f7ffff'];

  function zone(s) {
    if (!s.area) return null;
    return { C: k.P(s.area), R: Math.max(4, Math.round((s.area.feet / (s.grid.feet || 5)) * k.PX)) };
  }

  function stamp(img, x, y, alpha) {
    k.blit(img, x - img.width / 2, y - img.height / 2, k.clamp(alpha));
  }

  function growing(s, duration) {
    const q = k.clamp((s.c.t - k.CAST) / duration);
    return (2 + Math.round(k.ease(q) * 6)) / 8;
  }

  // The area footprint stays circular; only individual billows are flattened.
  // Dither belongs to the silhouette and shade boundaries, never the cloud's interior.
  function cloudBody(key, R, ramp, seed, heavy, frame = 0) {
    const W = R * 2 + 8;
    const variant = Math.abs(seed || 0) % 5;
    return k.sprite(`b40:cloud:${key}:${R}:${variant}:${frame}`, W, W, ramp, set => {
      const C = W / 2;
      const lobes = [{ x: 0, y: 0, r: R * 0.72 }];
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * k.tau + variant * 0.2;
        const drift = Math.min(3, R * 0.04);
        const phase = (frame / 8) * k.tau;
        lobes.push({
          x: Math.cos(a) * R * 0.62 + Math.sin(phase + i) * drift,
          y: Math.sin(a) * R * 0.62 + Math.cos(phase + i) * drift,
          r: R * 0.39,
        });
      }
      for (let y = 2; y < W - 2; y++) {
        for (let x = 2; x < W - 2; x++) {
          const dx = x - C,
            dy = y - C;
          const d = Math.hypot(dx, dy) / R;
          if (d > 1.025) continue;
          let best = 2,
            light = 0;
          for (const b of lobes) {
            const lx = (dx - b.x) / b.r,
              ly = (dy - b.y) / b.r;
            const v = Math.hypot(lx, ly);
            if (v < best) {
              best = v;
              light = 0.6 - lx * 0.17 - ly * 0.25 - v * 0.17;
            }
          }
          if (best > 1 || (d > 0.94 && k.dith(x, y) > (1.025 - d) / 0.085)) continue;
          set(x, y, 1 + k.band(k.clamp(light - (heavy ? 0.13 : 0)), 4, x, y));
        }
      }
    });
  }

  function puff(key, rx, ry, ramp, variant) {
    rx = Math.max(3, Math.round(rx));
    ry = Math.max(3, Math.round(ry));
    const W = rx * 2 + 6,
      H = ry * 2 + 6;
    return k.sprite(`b40:puff:${key}:${rx}:${ry}:${variant}`, W, H, ramp, set => {
      for (let y = 2; y < H - 2; y++) {
        for (let x = 2; x < W - 2; x++) {
          const dx = (x - W / 2) / rx,
            dy = (y - H / 2) / ry;
          const a = Math.atan2(dy, dx);
          const d = Math.hypot(dx, dy) / (0.9 + 0.08 * Math.cos(a * 3 + variant));
          if (d > 1) continue;
          if (d > 0.85 && k.dith(x, y) > (1 - d) / 0.15) continue;
          const light = k.clamp(0.68 - dx * 0.18 - dy * 0.26 - d * 0.15);
          set(x, y, 1 + k.band(light, 4, x, y));
        }
      }
    });
  }

  function driftingCloud(s, key, ramp, alpha, heavy) {
    const z = zone(s);
    if (!z || alpha <= 0) return;
    const { C, R } = z;
    stamp(cloudBody(key, R, ramp, s.event.seed, heavy), C.x, C.y, alpha);
    const phase = (s.c.raw / (heavy ? 5200 : 4200)) * k.tau;
    // Ten cached billows, with bounded drift so they never slide away from the area.
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * k.tau + k.hash(i, s.event.seed || 0) * 0.2;
      const d = R * (i % 3 ? 0.64 : 0.32);
      const x = C.x + Math.cos(a) * d + Math.sin(phase + i) * Math.min(3, R * 0.04);
      const y = C.y + Math.sin(a) * d + Math.cos(phase + i * 1.4) * 2;
      const rx = R * (heavy ? 0.27 : 0.25);
      const ry = R * (heavy ? 0.1 : 0.18);
      stamp(puff(key, rx, ry, ramp, i % 3), x, y, alpha * (heavy ? 0.65 : 0.85));
    }
  }

  function rollOut(s, key, ramp) {
    const z = zone(s),
      e = s.c.t - k.CAST;
    if (!z || e < 0 || e >= 550) return;
    const { C, R } = z;
    const q = e / 550;
    const distance = R * (0.12 + 0.66 * k.ease(q));
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * k.tau;
      const size = R * (0.12 + Math.floor(q * 3) * 0.035);
      stamp(
        puff(key, size, size * 0.6, ramp, i % 3),
        C.x + Math.cos(a) * distance,
        C.y + Math.sin(a) * distance - Math.sin(q * Math.PI) * 5,
        (1 - k.clamp((q - 0.45) / 0.55)) * 0.75,
      );
    }
  }

  function voidBody(key, R, ramp, hadar) {
    const W = R * 2 + 8;
    return k.sprite(`b40:void:${key}:${R}`, W, W, ramp, set => {
      const C = W / 2;
      for (let y = 2; y < W - 2; y++) {
        for (let x = 2; x < W - 2; x++) {
          const dx = (x - C) / R,
            dy = (y - C) / R;
          const d = Math.hypot(dx, dy);
          if (d > 1) continue;
          // A dark bowl, with a stepped violet/icy lip and a darker front band.
          const rim = d > 0.94;
          set(x, y, rim ? (dy < 0 ? 3 : 2) : d > 0.83 ? 2 : 1);
          if (!hadar && dy < -0.28 && d > 0.68 && d < 0.72 && dx < 0.35 && dx > -0.65) set(x, y, 2);
        }
      }
    });
  }

  function mote(key, ramp, bright) {
    return k.sprite(`b40:mote:${key}:${bright}`, 7, 7, ramp, set => {
      set(3, 3, bright ? 5 : 3);
      if (bright) {
        set(2, 3, 3);
        set(4, 3, 3);
        set(3, 2, 3);
        set(3, 4, 3);
      }
    });
  }

  function voidLoop(s, key, ramp, hadar) {
    const z = zone(s);
    if (!z || s.linger <= 0) return;
    const { C } = z;
    const R = Math.max(4, Math.round(z.R * growing(s, 420)));
    stamp(voidBody(key, R, ramp, hadar), C.x, C.y, s.linger * 0.9);
    const seed = s.event.seed || 0;
    for (let i = 0; i < (hadar ? 23 : 6); i++) {
      const a = k.hash(i, seed, 3) * k.tau + s.c.raw / (hadar ? 24000 : 18000);
      const d = Math.sqrt(k.hash(i, seed, 4)) * R * 0.77;
      const x = C.x + Math.cos(a) * d;
      const y = C.y + Math.sin(a) * d;
      const pulse = 0.5 + 0.25 * Math.sin(s.c.raw / 850 + i * 2);
      stamp(mote(key, ramp, hadar && i % 7 === 0), x, y, s.linger * pulse);
    }
    if (hadar) {
      const frame = Math.floor(s.c.raw / 360) % 8;
      const img = tendrils(R, frame, seed);
      stamp(img, C.x, C.y, s.linger * 0.75);
    }
  }

  function tendrils(R, frame, seed) {
    const W = R * 2 + 12;
    const variant = Math.abs(seed) % 5;
    return k.sprite(`b40:tendrils:${R}:${frame}:${variant}`, W, W, HADAR, set => {
      const C = W / 2,
        paths = [];
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * k.tau + k.hash(i, variant) * 0.25;
        const points = [];
        for (let j = 0; j < 16; j++) {
          const q = j / 15;
          const d = R * (0.98 - q * 0.24);
          const bend = Math.sin(q * 4 + (frame / 8) * k.tau + i) * R * 0.045 * q;
          points.push({
            x: Math.round(C + Math.cos(a) * d - Math.sin(a) * bend),
            y: Math.round(C + Math.sin(a) * d + Math.cos(a) * bend),
            q,
          });
        }
        paths.push(points);
      }
      // Explicit two-pixel larger outline, then a narrow cold tendril.
      for (const points of paths)
        for (const p of points) for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) set(p.x + x, p.y + y, 0);
      for (const points of paths)
        for (const p of points) {
          set(p.x, p.y, p.q > 0.8 ? 4 : 3);
          if (p.q < 0.55) set(p.x + 1, p.y, 2);
        }
    });
  }

  function bubble(frame) {
    return k.sprite(`b40:bubble:${frame}`, 13, 13, STINK, set => {
      const r = frame === 3 ? 4 : 2 + frame * 0.5;
      for (let y = 1; y < 12; y++)
        for (let x = 1; x < 12; x++) {
          const d = Math.hypot(x - 6, y - 6);
          if (frame === 3) {
            if (Math.abs(d - r) < 0.6 && (x === 6 || y === 6)) set(x, y, 4);
          } else if (Math.abs(d - r) < 0.65) set(x, y, y < 6 ? 4 : 2);
        }
    });
  }

  function poisonSwirl(R, frame) {
    const W = R * 2 + 8;
    return k.sprite(`b40:swirl:${R}:${frame}`, W, W, POISON, set => {
      const C = W / 2;
      for (let i = 0; i < 5; i++) {
        const cx = C + (i % 2 ? -0.36 : 0.34) * R;
        const cy = C + (i - 2) * R * 0.27;
        for (let j = 0; j < 44; j++) {
          const q = j / 43,
            a = q * k.tau * 0.85 + (frame / 8) * k.tau;
          const r = R * (0.04 + q * 0.2);
          const x = Math.round(cx + Math.cos(a) * r),
            y = Math.round(cy + Math.sin(a) * r * 0.3);
          // The heavy coils are dark, recessed furrows rather than bright poison sparks.
          set(x, y - 1, 0);
          set(x, y, 1);
          set(x, y + 1, 2);
        }
      }
    });
  }

  function quietRing(R, ripple) {
    const W = R * 2 + 8;
    return k.sprite(`b40:quiet:${R}:${ripple}`, W, W, QUIET, set => {
      const C = W / 2;
      for (let y = 2; y < W - 2; y++)
        for (let x = 2; x < W - 2; x++) {
          const dx = x - C,
            dy = y - C,
            d = Math.hypot(dx, dy);
          const a = Math.atan2(dy, dx) + Math.PI;
          if (Math.abs(d - R) > 0.55 || Math.floor((a / k.tau) * 48) % 2) continue;
          set(x, y, ripple ? 3 : 4);
        }
    });
  }

  // Fog Cloud: grey-blue scalloped mist rolls out, then drifts in the board's obscuring layer.
  FX.register('fog-cloud', {
    palette: FOG,
    travel: 0,
    beats: () => [],
    end: () => k.CAST + 600,
    air: s => rollOut(s, 'fog', FOG),
    fog(s) {
      const z = zone(s);
      if (!z || !(s.fogAlpha > 0)) return;
      const frame = Math.floor(s.c.raw / 600) % 8;
      // One blit applies the obscuring alpha once, including the DM's transparency.
      stamp(
        cloudBody('fog', z.R, FOG, s.event.seed, false, frame),
        z.C.x,
        z.C.y,
        k.clamp(s.fogAlpha) * (s.dm ? 0.6 : 1),
      );
    },
  });

  // Darkness: a near-black bowl with a restrained violet lip and six slowly orbiting motes.
  FX.register('darkness', {
    palette: DARK,
    cast: false,
    travel: 0,
    beats: () => [],
    end: () => k.CAST + 550,
    ground(s) {
      if (!(s.pose.linger > 0) && s.c.t >= k.CAST)
        voidLoop({ ...s, linger: 1 - k.clamp((s.c.t - k.CAST - 350) / 200) }, 'dark', DARK, false);
    },
    linger: s => voidLoop(s, 'dark', DARK, false),
  });

  // Hunger of Hadar: cold stars in a black void, with pale grasping tentacles curling inward at its rim.
  FX.register('hunger-of-hadar', {
    palette: HADAR,
    travel: 0,
    beats: () => [],
    end: () => k.CAST + 650,
    ground(s) {
      if (!(s.pose.linger > 0) && s.c.t >= k.CAST)
        voidLoop({ ...s, linger: 1 - k.clamp((s.c.t - k.CAST - 450) / 200) }, 'hadar', HADAR, true);
    },
    linger: s => voidLoop(s, 'hadar', HADAR, true),
  });

  // Stinking Cloud: yellow-green billows tumble lazily around small rising, popping gas bubbles.
  FX.register('stinking-cloud', {
    palette: STINK,
    travel: 0,
    beats: () => [],
    end: () => k.CAST + 650,
    air: s => rollOut(s, 'stink', STINK),
    linger(s) {
      const z = zone(s);
      if (!z || s.linger <= 0) return;
      driftingCloud(s, 'stink', STINK, s.linger * 0.75, false);
      for (let i = 0; i < 6; i++) {
        const q = (s.c.raw / 2600 + k.hash(i, s.event.seed || 0)) % 1;
        const a = k.hash(i, s.event.seed || 0, 2) * k.tau;
        const d = z.R * (0.2 + k.hash(i, s.event.seed || 0, 3) * 0.5);
        stamp(
          bubble(Math.min(3, Math.floor(q * 4))),
          z.C.x + Math.cos(a) * d,
          z.C.y + Math.sin(a) * d - q * 7,
          s.linger * (q > 0.95 ? 0 : 0.75),
        );
      }
    },
  });

  // Cloudkill: dense low poison-green banks, crossed by darker flattened coils of rolling gas.
  FX.register('cloudkill', {
    palette: POISON,
    travel: 0,
    beats: () => [],
    end: () => k.CAST + 700,
    ground(s) {
      const z = zone(s),
        e = s.c.t - k.CAST;
      if (!z || e < 0 || e >= 500) return;
      const R = Math.max(4, Math.round(z.R * growing(s, 400)));
      stamp(cloudBody('kill', R, POISON, s.event.seed, true), z.C.x, z.C.y, (1 - k.clamp((e - 300) / 200)) * 0.5);
    },
    linger(s) {
      const z = zone(s);
      if (!z || s.linger <= 0) return;
      driftingCloud(s, 'kill', POISON, s.linger * 0.85, true);
      stamp(poisonSwirl(z.R, Math.floor(s.c.raw / 600) % 8), z.C.x, z.C.y, s.linger * 0.5);
    },
  });

  // Silence: a barely visible dashed pale-blue bubble, with two slow inward ripples and no impact.
  FX.register('silence', {
    palette: QUIET,
    cast: false,
    travel: 0,
    beats: () => [],
    end: () => k.CAST + 500,
    ground(s) {
      const z = zone(s),
        e = s.c.t - k.CAST;
      if (!z || e < 0 || e >= 400) return;
      const R = Math.max(4, Math.round(z.R * growing(s, 360)));
      stamp(quietRing(R, false), z.C.x, z.C.y, 0.5 * (1 - e / 400));
    },
    linger(s) {
      const z = zone(s);
      if (!z || s.linger <= 0) return;
      stamp(quietRing(z.R, false), z.C.x, z.C.y, s.linger * 0.5);
      for (let i = 0; i < 2; i++) {
        const q = (s.c.raw / 4800 + i / 2) % 1;
        // Eight radii keep a minutes-long loop bounded in the shared sprite cache.
        const R = Math.max(4, Math.round(z.R * (0.48 + (Math.round(q * 7) / 7) * 0.43)));
        stamp(quietRing(R, true), z.C.x, z.C.y, s.linger * 0.25 * Math.sin(q * Math.PI));
      }
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
