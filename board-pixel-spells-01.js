/* Pixel spells, batch 01: damage-palette fallbacks for the ten attack archetypes. */
(function (root) {
  'use strict';
  const FX = root.BoardPixelFX;
  if (!FX) return;
  const k = FX.kit;

  const seed = s => s.event.seed || 0;
  const level = event => Math.max(0, Math.min(9, Number(event.level) || 0));
  const colors = ramp => ramp.join(',');
  const ids = event => (event.targets?.length ? event.targets : [null]);
  // Equal timestamps share a freeze, even when an area catches many figures.
  const beats = (event, travel, kind = 'hit', stop = 90, power = 0.06) =>
    ids(event).map(target => ({ at: k.CAST + travel, stop, target, kind, power }));
  const end = (event, travel) => k.CAST + travel + 460;
  const center = s => s.area || s.pose.target || s.targets[0] || s.pose.hand;
  const units = s => k.PX / (s.grid.feet || 5);
  const radius = s => Math.max(3, (s.area?.feet || 5) * units(s));
  const aim = (s, hit) => {
    const target = s.targets.find(t => t.id === hit.id) || s.targets[0];
    return target ? k.contact(target, s.pose.hand || target) : s.pose.target || s.area;
  };
  const mark = (s, hit, point, key, size = 32, count = 7, reach = 24) => {
    if (!point) return;
    const e = s.real(hit);
    k.drawHit(k.hitStyle(`01:${key}:${colors(s.ramp)}`, s.ramp, { S: size, spikes: 6, jag: 0.32 }), point, e);
    k.shards(point, e, s.ramp, seed(s) + s.hits.indexOf(hit) * 17, count, reach);
  };
  function targetMarks(s, key, size = 30) {
    for (const hit of s.hits) {
      const point = aim(s, hit);
      if (point) mark(s, hit, k.P(point), key, size);
    }
  }
  function flash(event, e) {
    if (e < 0) return null;
    const ramp = k.paletteFor(event);
    return e < 32 ? { color: ramp[5], alpha: 0.22 } : e < 68 ? { color: ramp[0], alpha: 0.18 } : null;
  }
  function stroke(A, B, ramp, width = 3, index = 3) {
    const steps = Math.max(1, Math.ceil(Math.hypot(B.x - A.x, B.y - A.y) / 2));
    for (const [color, size] of [
      [ramp[0], width + 2],
      [ramp[index], width],
    ])
      for (let i = 0; i <= steps; i++) {
        const q = i / steps;
        k.dot(k.mix(A.x, B.x, q), k.mix(A.y, B.y, q), color, size);
      }
  }
  // Rings are cached raster shapes: their cost stays constant for very large templates.
  function ring(C, rx, ry, ramp, index = 3, broken = false) {
    rx = Math.max(2, Math.round(rx));
    ry = Math.max(2, Math.round(ry));
    const w = rx * 2 + 6,
      h = ry * 2 + 6;
    const image = k.sprite(`01:ring:${rx}:${ry}:${index}:${broken}:${colors(ramp)}`, w, h, ramp, set => {
      for (let y = 1; y < h - 1; y++)
        for (let x = 1; x < w - 1; x++) {
          const dx = x - w / 2,
            dy = y - h / 2;
          const d = Math.hypot(dx / rx, dy / ry);
          if (Math.abs(d - 1) * Math.min(rx, ry) > 0.85) continue;
          if (broken && Math.floor((Math.atan2(dy / ry, dx / rx) + Math.PI) * 8) % 3 === 0) continue;
          set(x, y, index);
        }
    });
    k.blit(image, C.x - w / 2, C.y - h / 2);
  }
  function areaRing(s, duration = 380) {
    const C = center(s),
      hit = s.hits[0];
    if (!C || !hit) return;
    const e = s.real(hit);
    if (e < 0 || e >= duration) return;
    const q = e / duration,
      r = radius(s) * (0.25 + 0.8 * k.ease(q));
    ring(k.P(C), r, r, s.ramp, q < 0.22 ? 5 : q < 0.6 ? 3 : 2, q > 0.45);
  }
  function polygon(s) {
    if (!s.area) return [];
    return k.outline(s.area, s.grid).map(p => k.P(Array.isArray(p) ? { x: p[0], y: p[1] } : p));
  }
  function inside(x, y, points) {
    let yes = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const a = points[i],
        b = points[j];
      if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) yes = !yes;
    }
    return yes;
  }
  // Geometry is relative to the sprite, so moving the drawing buffer cannot poison the cache.
  function panel(points, height, phase, ramp, wall = false) {
    if (points.length < 3) return;
    const x0 = Math.floor(Math.min(...points.map(p => p.x))) - 2;
    const y0 = Math.floor(Math.min(...points.map(p => p.y)) - height) - 2;
    const w = Math.ceil(Math.max(...points.map(p => p.x)) - x0) + 3;
    const h = Math.ceil(Math.max(...points.map(p => p.y)) - y0) + 3;
    const p = points.map(p => ({ x: Math.round(p.x - x0), y: Math.round(p.y - y0) }));
    const geometry = p.map(p => `${p.x},${p.y}`).join(';');
    const image = k.sprite(`01:panel:${wall}:${geometry}:${height}:${phase}:${colors(ramp)}`, w, h, ramp, set => {
      const faces = wall
        ? p.map((a, i) => {
            const b = p[(i + 1) % p.length];
            return [a, b, { x: b.x, y: b.y - height }, { x: a.x, y: a.y - height }];
          })
        : [p];
      for (let y = 1; y < h - 1; y++)
        for (let x = 1; x < w - 1; x++) {
          if (!faces.some(face => inside(x + 0.5, y + 0.5, face))) continue;
          const edge = faces.some(
            face =>
              inside(x + 0.5, y + 0.5, face) &&
              (!inside(x + 2.5, y + 0.5, face) ||
                !inside(x - 1.5, y + 0.5, face) ||
                !inside(x + 0.5, y - 1.5, face) ||
                !inside(x + 0.5, y + 2.5, face)),
          );
          const stripe = wall ? (x + y + phase * 2) % 12 < 3 : (Math.floor(x / 5) + Math.floor(y / 5)) % 2 === 0;
          if (phase === 3 && !edge && (Math.floor(x / 6) + Math.floor(y / 6)) % 3 !== 0) continue;
          set(x, y, edge ? (phase === 1 ? 5 : 3) : stripe ? (phase === 1 ? 4 : 2) : 1);
        }
    });
    k.blit(image, x0, y0);
  }
  function areaReach(event, grid) {
    const a = event.area;
    return { r: ((a?.feet || 5) / (grid.feet || 5)) * 1.4 + 2, up: ((a?.height || 15) * 2) / (grid.feet || 5) + 2 };
  }
  function wall(s, active) {
    if (!s.area) return;
    const t = s.c.t - k.CAST;
    if (t < 0 || (active && s.linger <= 0)) return;
    const q = active ? s.linger : t < 280 ? k.ease(k.clamp(t / 180)) : 1 - k.clamp((t - 280) / 380);
    const height = Math.max(2, Math.round(((s.area.height || 10) * units(s) * q) / 3) * 3);
    const phase = active ? Math.floor(s.c.raw / 160) % 3 : t < 230 ? 1 : 2;
    panel(polygon(s), height, phase, s.ramp, true);
  }

  // Projectile: a snapped-off bolt with an arcing outlined tail, a sharp star and flying chips.
  FX.register('kind:projectile', {
    travel: 240,
    beats: (event, kit, travel) => beats(event, travel, 'hit', 80),
    end,
    air(s) {
      for (const hit of s.hits) {
        const point = aim(s, hit);
        if (!s.pose.hand || !point) continue;
        const H = k.P(s.pose.hand),
          T = k.P(point),
          t = s.c.t - k.CAST;
        if (t >= 0 && s.c.t < hit.at) {
          const q = t / (hit.at - k.CAST);
          const at = u => ({ x: k.mix(H.x, T.x, u), y: k.mix(H.y, T.y, u) - Math.sin(u * Math.PI) * 6 });
          for (let i = 10; i >= 1; i--) {
            const u = q - i * 0.035;
            if (u < 0) continue;
            const p = at(u),
              size = i < 4 ? 3 : 2;
            k.dot(p.x, p.y, s.ramp[0], size + 2);
            k.dot(p.x, p.y, s.ramp[i < 4 ? 4 : i < 8 ? 3 : 2], size);
          }
          const p = at(q);
          k.disc(p.x, p.y, 4.5, s.ramp[0]);
          k.disc(p.x, p.y, 3.5, s.ramp[3]);
          k.disc(p.x, p.y, 1.5, s.ramp[5]);
        }
        mark(s, hit, T, 'bolt', 34, 8, 24);
      }
    },
  });

  // Beam: simultaneous sustained rays, bright travelling collars and a crack on each target.
  FX.register('kind:beam', {
    travel: 40,
    beats: (event, kit, travel) => beats(event, travel, 'beam', 90, 0.07),
    end,
    air(s) {
      if (!s.pose.hand) return;
      const H = k.P(s.pose.hand),
        e = s.c.t - k.CAST;
      s.hits.forEach((hit, i) => {
        const point = aim(s, hit);
        if (!point) return;
        const T = k.P(point);
        if (e >= 0) k.beam(H, T, e, seed(s) + i * 13, s.ramp);
        mark(s, hit, T, 'beam', 36, 8, 26);
      });
    },
  });

  // Line: a bright front races down an outlined strip, which cools and splits into short dashes.
  FX.register('kind:line', {
    travel: 150,
    beats: (event, kit, travel) => beats(event, travel, 'beam', 105, 0.07),
    end,
    air(s) {
      const t = s.c.t - k.CAST;
      if (s.area && t >= 0) {
        const A = k.P(s.area),
          L = s.area.feet * units(s),
          dir = s.area.dir || 0;
        const dx = Math.cos(dir),
          dy = Math.sin(dir),
          width = Math.max(2, (s.area.width || 5) * units(s));
        const hit = s.hits[0],
          e = hit ? s.real(hit) : t - 150;
        // The front and trail share one raster, so the leading edge never detaches from its wake.
        const sweep = Math.min(15, Math.floor(t / 10)),
          phase = Math.max(0, Math.floor((e - 70) / 20));
        const corners = [
          [0, -width / 2],
          [L, -width / 2],
          [L, width / 2],
          [0, width / 2],
        ].map(([along, side]) => ({ x: dx * along - dy * side, y: dy * along + dx * side }));
        const x0 = Math.floor(Math.min(...corners.map(p => p.x))) - 2,
          y0 = Math.floor(Math.min(...corners.map(p => p.y))) - 2;
        const w = Math.ceil(Math.max(...corners.map(p => p.x)) - x0) + 3,
          h = Math.ceil(Math.max(...corners.map(p => p.y)) - y0) + 3;
        if (L > 0 && e < 400) {
          const image = k.sprite(
            `01:line:${L}:${dir}:${width}:${sweep}:${phase}:${seed(s)}:${colors(s.ramp)}`,
            w,
            h,
            s.ramp,
            set => {
              const reach = Math.min(L, Math.max(2, (L * sweep) / 15)),
                breakup = k.clamp(phase / 16),
                half = (width / 2) * (1 - breakup * 0.65),
                spacing = Math.max(10, width * 1.25);
              for (let y = 1; y < h - 1; y++)
                for (let x = 1; x < w - 1; x++) {
                  const px = x + x0,
                    py = y + y0;
                  const along = px * dx + py * dy,
                    across = Math.abs(-px * dy + py * dx);
                  if (along < 0 || along > reach || across > half) continue;
                  const dash = Math.floor(along / spacing),
                    local = along / spacing - dash;
                  if (
                    breakup > 0 &&
                    (Math.abs(local - 0.5) > 0.5 - breakup * 0.3 ||
                      k.hash(dash, seed(s)) < Math.max(0, (breakup - 0.5) * 2))
                  )
                    continue;
                  const hot = phase === 0 && reach - along < Math.max(4, width * 0.45);
                  set(
                    x,
                    y,
                    hot
                      ? across < half * 0.65
                        ? 5
                        : 4
                      : Math.max(1, (across < half * 0.3 ? 4 : across < half * 0.7 ? 3 : 2) - Math.floor(breakup * 2)),
                  );
                }
            },
          );
          k.blit(image, A.x + x0, A.y + y0);
        }
      }
      targetMarks(s, 'line');
    },
  });

  // Cone: a solid four-band fan sweeps across the template, then shatters into drifting pixels.
  FX.register('kind:cone', {
    travel: 200,
    beats: (event, kit, travel) => beats(event, travel, 'hit', 110, 0.07),
    end,
    ground(s) {
      if (!s.area) return;
      const t = s.c.t - k.CAST;
      if (t < 0) return;
      const A = k.P(s.area),
        dir = s.area.dir || 0,
        dx = Math.cos(dir),
        dy = Math.sin(dir);
      // Use the board's full 53-degree triangle, including both far corners, rather than an arc.
      const points = k.outline(s.area, s.grid).map(p => {
        const P = k.P(Array.isArray(p) ? { x: p[0], y: p[1] } : p);
        return { x: P.x - A.x, y: P.y - A.y };
      });
      if (points.length !== 3) return;
      const L = Math.max(...points.map(p => p.x * dx + p.y * dy));
      if (L <= 0) return;
      const hit = s.hits[0],
        e = hit ? s.real(hit) : t - 200;
      if (e >= 250) return;
      const sweep = Math.min(10, Math.floor(t / 20)),
        phase = Math.max(0, Math.floor((e - 70) / 20));
      const x0 = Math.floor(Math.min(...points.map(p => p.x))) - 2,
        y0 = Math.floor(Math.min(...points.map(p => p.y))) - 2;
      const w = Math.ceil(Math.max(...points.map(p => p.x)) - x0) + 3,
        h = Math.ceil(Math.max(...points.map(p => p.y)) - y0) + 3;
      const geometry = points.map(p => `${p.x.toFixed(4)},${p.y.toFixed(4)}`).join(';');
      const image = k.sprite(`01:cone:${geometry}:${sweep}:${phase}:${colors(s.ramp)}`, w, h, s.ramp, set => {
        const reach = Math.min(L, Math.max(2, (L * sweep) / 10)),
          breakup = k.clamp(phase / 9);
        for (let y = 1; y < h - 1; y++)
          for (let x = 1; x < w - 1; x++) {
            const px = x + x0,
              py = y + y0,
              along = px * dx + py * dy;
            if (along > reach || !inside(px, py, points)) continue;
            // Whole tiles shrink into separate chips; the cached sprite outlines every fragment.
            if (
              breakup > 0 &&
              (Math.abs((x % 8) - 3.5) > 3.5 * (1 - breakup) || Math.abs((y % 8) - 3.5) > 3.5 * (1 - breakup))
            )
              continue;
            set(x, y, 1 + Math.min(3, Math.floor(k.clamp(along / reach) * 4)));
          }
      });
      k.blit(image, A.x + x0, A.y + y0);
    },
    air(s) {
      const hit = s.hits[0],
        e = hit ? s.real(hit) - 70 : -1;
      if (s.area && e >= 0 && e < 340) {
        const points = polygon(s);
        if (points.length === 3) {
          const q = e / 340,
            dir = s.area.dir || 0;
          // Barycentric samples cover the whole fan; debris advances on real time through hitstop.
          for (let i = 0; i < 40; i++) {
            if (q > 0.6 + k.hash(i, seed(s), 3) * 0.4) continue;
            const u = Math.sqrt(k.hash(i, seed(s), 1)),
              v = k.hash(i, seed(s), 2),
              drift = k.ease(q) * (5 + k.hash(i, seed(s), 4) * 12);
            const x = (1 - u) * points[0].x + u * ((1 - v) * points[1].x + v * points[2].x) + Math.cos(dir) * drift,
              y =
                (1 - u) * points[0].y +
                u * ((1 - v) * points[1].y + v * points[2].y) +
                Math.sin(dir) * drift -
                Math.sin(q * Math.PI) * 7;
            const size = q < 0.3 ? 3 : q < 0.7 ? 2 : 1;
            k.dot(x, y, s.ramp[0], size + 2);
            k.dot(x, y, s.ramp[Math.max(1, 1 + Math.min(3, Math.floor(u * 4)) - Math.floor(q * 2))], size);
          }
        }
      }
      targetMarks(s, 'cone');
    },
  });

  // Column: a cylinder drops from its stated height, slams into a ground ring and shears apart.
  FX.register('kind:column', {
    travel: 180,
    beats: (event, kit, travel) => beats(event, travel, 'blast', 140, 0.08),
    end,
    reach: areaReach,
    ground(s) {
      const point = center(s);
      if (!point) return;
      const t = s.c.t - k.CAST;
      if (t < 0 || t >= 540) return;
      const C = k.P(point),
        R = Math.round(radius(s)),
        H = Math.round((s.area?.height || 15) * units(s));
      const drop = H * (1 - k.clamp(t / 180));
      const f = Math.floor(Math.max(0, t - 180) / 55);
      const w = R * 2 + 8,
        h = H + R * 2 + 8,
        cx = w / 2,
        cy = H + R + 3;
      const image = k.sprite(`01:column:${R}:${H}:${f}:${colors(s.ramp)}`, w, h, s.ramp, set => {
        for (let y = 1; y < h - 1; y++)
          for (let x = 1; x < w - 1; x++) {
            const dx = (x - cx) / R;
            if (Math.abs(dx) >= 1) continue;
            const cap = Math.sqrt(1 - dx * dx) * R * 0.42;
            if (y < cy - H - cap || y > cy + cap) continue;
            if (f > 1 && (Math.floor(y / 8) + Math.floor(x / 6)) % 5 < f - 1) continue;
            const band = Math.abs(dx) > 0.8 ? 1 : Math.abs(dx) > 0.5 ? 2 : Math.abs(dx) > 0.22 ? 3 : 4;
            set(x, y, y > cy - 5 && f === 0 ? 5 : band);
          }
      });
      k.blit(image, C.x - cx, C.y - cy - drop);
      areaRing(s);
    },
    air(s) {
      targetMarks(s, 'column', 36);
    },
  });

  // Wall: outlined striped faces rise around the area perimeter, with a slow active shimmer loop.
  FX.register('kind:wall', {
    travel: 180,
    beats: (event, kit, travel) => beats(event, travel, 'hit', 95),
    end: (event, travel) => k.CAST + travel + 500,
    reach: areaReach,
    ground(s) {
      if (!(s.pose.linger > 0) || s.c.t < k.CAST + 180) wall(s, false);
    },
    air(s) {
      targetMarks(s, 'wall');
    },
    linger(s) {
      wall(s, true);
    },
  });

  // Strike: a suspended diamond sigil snaps into a descending spike directly over each victim.
  FX.register('kind:strike', {
    travel: 180,
    beats: (event, kit, travel) => beats(event, travel, 'hit', 110, 0.08),
    end,
    air(s) {
      for (const hit of s.hits) {
        const point = aim(s, hit);
        if (!point) continue;
        const T = k.P(point),
          t = s.c.t - k.CAST;
        if (t >= 0 && t < 180) {
          const S = { x: T.x, y: T.y - 16 };
          const image = k.sprite(`01:sigil:${colors(s.ramp)}`, 19, 19, s.ramp, set => {
            for (let y = 2; y < 17; y++)
              for (let x = 2; x < 17; x++) {
                const d = Math.abs(x - 9) + Math.abs(y - 9);
                if (d >= 6 && d <= 7) set(x, y, 4);
                else if (x === 9 && Math.abs(y - 9) < 4) set(x, y, 3);
              }
          });
          k.blit(image, S.x - 9, S.y - 9);
          if (t >= 105) {
            const q = k.clamp((t - 105) / 75);
            stroke({ x: T.x, y: T.y - 22 }, { x: T.x, y: k.mix(T.y - 22, T.y, q) }, s.ramp, 5, 5);
          }
        }
        const e = s.real(hit);
        if (e >= 0 && e < 100) stroke({ x: T.x, y: T.y - 20 }, T, s.ramp, e < 40 ? 5 : 2, 4);
        mark(s, hit, T, 'strike', 38, 9, 25);
      }
    },
  });

  // On-hit: the weapon hand flashes, followed by a heavy diagonal cut and splintering impact.
  FX.register('kind:on-hit', {
    travel: 100,
    beats: (event, kit, travel) => beats(event, travel, 'hit', 125, 0.08),
    end,
    air(s) {
      const t = s.c.t - k.CAST;
      if (s.pose.hand && t >= 0 && t < 90) {
        const H = k.P(s.pose.hand);
        k.disc(H.x, H.y, t < 35 ? 7 : 5, s.ramp[0]);
        k.disc(H.x, H.y, t < 35 ? 6 : 4, s.ramp[t < 35 ? 5 : 2]);
        stroke({ x: H.x - 7, y: H.y + 5 }, { x: H.x + 7, y: H.y - 5 }, s.ramp, 2, 4);
      }
      for (const hit of s.hits) {
        const point = aim(s, hit);
        if (!point) continue;
        const T = k.P(point),
          e = s.real(hit);
        if (e >= 0 && e < 250) {
          const q = e / 250,
            length = 17 * (1 - q * 0.45);
          const direction = s.pose.hand && s.pose.hand.x > point.x ? -1 : 1;
          stroke(
            { x: T.x - length * direction, y: T.y + length * 0.7 },
            { x: T.x + length * direction, y: T.y - length * 0.7 },
            s.ramp,
            e < 60 ? 6 : 3,
            e < 60 ? 5 : 3,
          );
          if (e < 140)
            stroke(
              { x: T.x - length * direction + 5, y: T.y + length * 0.7 },
              { x: T.x + length * direction + 3, y: T.y - length * 0.7 + 5 },
              s.ramp,
              1,
              4,
            );
        }
        mark(s, hit, T, 'smite', 30, 9, 28);
      }
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
