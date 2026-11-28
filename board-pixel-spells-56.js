/* Pixel spells, batch 56: rebuilt silhouettes, held peaks, real-time impacts. */
(function (root) {
  'use strict';
  const FX = root.BoardPixelFX;
  if (!FX) return;
  const k = FX.kit;
  const STONE = ['#252632', '#555663', '#8e929d', '#c5cbd0', '#eee6ce', '#ffffff'];
  const GREEN = ['#10271c', '#186b38', '#39ba47', '#83ff64', '#dcffd9', '#ffffff'];
  const VIOLET = ['#230e36', '#542775', '#9051cf', '#c18aff', '#efd8ff', '#ffffff'];
  const SILVER = ['#17283e', '#425e80', '#779ec3', '#bbdfee', '#e8f4ff', '#ffffff'];
  const ICE = ['#122b42', '#23577e', '#4d9ccb', '#9cddf3', '#e0faff', '#ffffff'];
  const GOLD = ['#38220f', '#835019', '#c59230', '#ffd261', '#fff0bc', '#ffffff'];
  const DREAD = ['#260d30', '#5a205c', '#a23585', '#eb588f', '#ffb8d7', '#ffffff'];
  const ids = e => (e.targets?.length ? e.targets : [null]);
  const beats = (e, travel, kind = 'soft', stop = 85) =>
    ids(e).map(target => ({
      at: k.CAST + travel,
      stop,
      target,
      kind,
      power: kind === 'soft' ? 0 : 0.08,
    }));
  const feet = t => ({ x: t.baseX ?? t.x, y: t.baseY ?? t.y + 0.62 });
  const subjects = s => (s.targets.length ? s.targets : [{ ...(s.pose.target || s.pose.base), span: 1 }]);
  const caster = s => ({ ...s.pose.base, baseX: s.pose.base.x, baseY: s.pose.base.y, y: s.pose.base.y - 0.62 });
  const center = s => k.P(s.area || s.pose.target || subjects(s)[0]);
  const age = s => s.c.t - k.CAST;
  function dot(x, y, size, pal, tone = 4) {
    k.dot(x, y, pal[0], size + 2);
    k.dot(x, y, pal[tone], size);
  }
  function orb(p, r, pal) {
    k.disc(p.x, p.y, r + 1, pal[0]);
    k.disc(p.x, p.y, r, pal[3]);
    k.disc(p.x - 1, p.y - 1, Math.max(1, r - 2), pal[4]);
    k.dot(p.x - 2, p.y - 2, pal[5], 2);
  }
  function ring(p, rx, ry, pal, tone = 4) {
    rx = Math.round(rx);
    ry = Math.round(ry);
    const img = picture(
      'ring:' + pal[0] + ':' + tone + ':' + rx + ':' + ry,
      rx * 2 + 8,
      ry * 2 + 8,
      pal,
      (set, rect) => {
        const n = Math.ceil(k.tau * Math.max(rx, ry));
        for (let i = 0; i < n; i++) {
          const a = (i / n) * k.tau;
          rect(Math.round(rx + 3 + Math.cos(a) * rx), Math.round(ry + 3 + Math.sin(a) * ry), 2, 2, tone);
        }
      },
    );
    k.blit(img, p.x - rx - 3, p.y - ry - 3);
  }
  function stroke(a, b, width, pal, tone = 4) {
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 2));
    for (const [col, w] of [
      [pal[0], width + 2],
      [pal[tone], width],
    ])
      for (let i = 0; i <= n; i++) k.dot(k.mix(a.x, b.x, i / n), k.mix(a.y, b.y, i / n), col, w);
  }
  function impact(s, pal, name, size = 28, count = 7) {
    for (const h of s.hits) {
      const t = s.targets.find(t => t.id === h.id) || subjects(s)[0];
      const p = k.P(t),
        e = s.real(h);
      k.drawHit(k.hitStyle('56:' + name, pal, { S: size, spikes: 6, jag: 0.3 }), p, e);
      k.shards(p, e, pal, (s.event.seed || 0) + s.hits.indexOf(h), count, size * 0.8);
    }
  }
  function sparkles(s, p, pal, n = 7, radius = 16) {
    for (let i = 0; i < n; i++) {
      const q = (s.c.raw / 850 + k.hash(i, s.event.seed)) % 1;
      const x = p.x + (k.hash(i, s.event.seed, 1) - 0.5) * radius * 2;
      const y = p.y + 7 - q * 26;
      dot(x, y, q < 0.7 ? 2 : 1, pal, i % 2 ? 4 : 5);
    }
  }
  // Cached image painter; every image gets the kit's automatic dark silhouette.
  function picture(name, w, h, pal, paint) {
    return k.sprite('56:' + name, w, h, pal, set => {
      const rect = (x, y, rw, rh, c) => {
        for (let j = y; j < y + rh; j++) for (let i = x; i < x + rw; i++) set(i, j, c);
      };
      const line = (x, y, xx, yy, c, width = 1) => {
        const n = Math.max(1, Math.ceil(Math.hypot(xx - x, yy - y)));
        for (let i = 0; i <= n; i++)
          rect(Math.round(k.mix(x, xx, i / n)), Math.round(k.mix(y, yy, i / n)), width, width, c);
      };
      paint(set, rect, line);
    });
  }
  function statue(stage, armor = false) {
    return picture('stone:' + stage + ':' + armor, 24, 32, STONE, (set, rect, line) => {
      const cutoff = 30 - stage * 3;
      for (let y = Math.max(2, cutoff); y < 30; y++)
        for (let x = 2; x < 22; x++) {
          const head = y < 9 && Math.abs(x - 12) <= (y < 4 ? 3 : 4);
          const body = y >= 10 && y < 21 && Math.abs(x - 12) <= (y < 15 ? 8 : 5);
          const legs = y >= 21 && y < 29 && ((x >= 6 && x <= 10) || (x >= 14 && x <= 18));
          if (head || body || legs) set(x, y, x < 10 ? 4 : x < 16 ? 3 : 2);
        }
      // Seams branch only through the stone already grown from the feet.
      for (let j = 0; j < 5; j++) {
        const y = 26 - j * 5;
        if (y < cutoff + 2) continue;
        line(9, y + 2, 12, y, 1);
        line(12, y, 10, y - 2, 1);
        line(12, y, 16, y + 1, 1);
        if (armor) {
          line(5, y - 1, 9, y - 1, 4, 2);
          line(15, y - 1, 19, y - 1, 4, 2);
        }
      }
      if (stage >= 9) {
        rect(8, 5, 2, 1, 1);
        rect(14, 5, 2, 1, 1);
      }
    });
  }
  function cracks(p, pal, scale = 1) {
    const img = picture('cracks:' + pal[0] + ':' + scale, 48, 24, pal, (set, rect, line) => {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * k.tau,
          x = 24 + Math.cos(a) * 17,
          y = 12 + Math.sin(a) * 8;
        line(24, 12, x, y, 1, 2);
        line(x, y, x + Math.cos(a + 0.8) * 5, y + Math.sin(a + 0.8) * 3, 3);
      }
    });
    k.blit(img, p.x - 24, p.y - 12);
  }

  // Flesh To Stone: pale stone climbs the feet, seals a full statue, and branches into dark cracks.
  FX.register('flesh-to-stone', {
    palette: STONE,
    travel: 600,
    beats: (e, kit, t) => beats(e, t, 'soft', 120),
    end: () => 1680,
    ground(s) {
      if (age(s) >= 0) for (const t of subjects(s)) cracks(k.P(feet(t)), STONE);
    },
    air(s) {
      const e = age(s);
      if (e < 0) return;
      for (const t of subjects(s)) {
        const b = k.P(feet(t)),
          stage = Math.min(10, 1 + Math.floor(e / 60));
        k.blit(statue(stage), b.x - 12, b.y - 29, e > 1150 ? 0.75 : 1);
        if (e < 620) {
          const y = b.y - Math.min(28, e / 22);
          dot(b.x - 9, y, 3, STONE);
          dot(b.x + 9, y, 3, STONE, 5);
        }
      }
      impact(s, STONE, 'petrify', 24, 8);
    },
  });

  // Disintegrate: a thick green-white ray pulverises a body-shaped shell into windblown dust billows.
  FX.register('disintegrate', {
    palette: GREEN,
    travel: 70,
    beats: (e, kit, t) => beats(e, t, 'beam', 200),
    end: () => 1380,
    flash: (e, t) => (t < 40 ? { color: '#edffe7', alpha: 0.28 } : t < 85 ? { color: GREEN[0], alpha: 0.2 } : null),
    air(s) {
      const e = age(s);
      if (e < 0 || !s.pose.hand) return;
      const H = k.P(s.pose.hand),
        t = subjects(s)[0],
        T = k.P(t),
        b = k.P(feet(t));
      const hit = s.hits[0],
        real = s.real(hit);
      if (e < 370) {
        stroke(H, T, e < 260 ? 10 : 6, GREEN, 2);
        stroke(H, T, e < 260 ? 7 : 3, GREEN, 3);
        stroke(H, T, 3, GREEN, 5);
        orb(H, 6, GREEN);
      }
      if (real >= 0 && real < 980) {
        const f = Math.min(10, Math.floor(real / 80));
        const img = picture('dissolve:' + f + ':' + (s.event.seed || 0), 82, 64, GREEN, (set, rect) => {
          // Large connected chunks first, broad banded dust clouds second.
          for (let y = 4; y < 60; y++)
            for (let x = 2; x < 80; x++) {
              const drift = f * 2;
              let best = 0;
              for (let i = 0; i < 7; i++) {
                const px = 23 + drift + (k.hash(i, s.event.seed) - 0.5) * (10 + f * 1.5);
                const py = 34 - i * 3 - f * 0.7 + Math.sin(i * 2) * f;
                const r = ((i % 3) + 5) * (f < 6 ? 1 + f * 0.12 : 1.7 - (f - 6) * 0.18);
                best = Math.max(best, 1 - Math.hypot((x - px) * 0.8, y - py) / r);
              }
              if (best > 0 && (f < 8 || (x + y * 3) % 7 > f - 8)) set(x, y, best > 0.6 ? 5 : best > 0.3 ? 4 : 3);
            }
          if (f < 3) {
            rect(19, 15 + f * 5, 7, 8, 5);
            rect(15, 24 + f * 5, 15, 8, 4);
          }
        });
        k.blit(img, b.x - 23, b.y - 47);
      }
      impact(s, GREEN, 'disintegrate', 46, 14);
    },
  });

  // Scatter: violet body flashes collapse at each origin and pop into nearby swirling arrival rings.
  FX.register('scatter', {
    palette: VIOLET,
    travel: 200,
    beats: (e, kit, t) => [...beats(e, t, 'soft', 75), ...beats(e, t + 360, 'soft', 90)],
    end: () => 1500,
    air(s) {
      const e = age(s);
      if (e < 0) return;
      subjects(s).forEach((t, i) => {
        const B = k.P(feet(t));
        const a = (i % 2 ? -1 : 1) * 0.8;
        const dest = { x: B.x + Math.cos(a) * 27, y: B.y + Math.sin(a) * 23 };
        if (e < 430) {
          const q = k.clamp(e / 200),
            h = Math.max(3, 26 * (1 - k.clamp((e - 200) / 210)));
          const img = picture('scatter:flash:' + Math.round(h), 30, 34, VIOLET, (set, rect) => {
            rect(13, 30 - Math.round(h), 5, Math.round(h), 5);
            rect(5, 17, 22, 5, 4);
            rect(10, 9, 12, 20, 3);
            rect(13, 5, 5, 24, 5);
          });
          k.blit(img, B.x - 15, B.y - 30, e > 350 ? 0.5 : 1);
          ring(B, 11 + q * 5, 5 + q * 2, VIOLET);
        }
        if (e >= 480) {
          const q = k.clamp((e - 480) / 200),
            life = e > 1010 ? 0.5 : 1;
          const ghost = picture('scatter:arrival', 22, 31, VIOLET, (set, rect) => {
            rect(8, 2, 7, 7, 5);
            rect(5, 11, 13, 10, 4);
            rect(6, 21, 5, 8, 3);
            rect(13, 21, 5, 8, 3);
          });
          k.blit(ghost, dest.x - 11, dest.y - 29, life);
          // Two broad winding arcs around the arriving silhouette.
          for (let j = 0; j < 16; j++) {
            const angle = (j / 16) * k.tau + s.c.raw / 130;
            dot(
              dest.x + Math.cos(angle) * (9 + q * 5),
              dest.y - 9 + Math.sin(angle) * 6 - j * 0.5,
              2,
              VIOLET,
              j % 3 ? 4 : 5,
            );
          }
          const swirl = picture('scatter:ring', 36, 18, VIOLET, (set, rect) => {
            for (let j = 0; j < 60; j++) {
              const a = (j / 60) * k.tau;
              rect(Math.round(17 + Math.cos(a) * 15), Math.round(8 + Math.sin(a) * 6), 2, 2, 4);
            }
          });
          k.blit(swirl, dest.x - 17, dest.y - 8);
          const h = s.hits[ids(s.event).length + i];
          if (h) {
            k.drawHit(k.hitStyle('56:scatter', VIOLET, { S: 32, spikes: 4 }), { x: dest.x, y: dest.y - 12 }, s.real(h));
            k.shards(dest, s.real(h), VIOLET, s.event.seed + i, 6, 20);
          }
        }
      });
      impact({ ...s, hits: s.hits.slice(0, ids(s.event).length) }, VIOLET, 'scatter-out', 32, 5);
    },
  });

  // Fizban's Platinum Shield: a broad silver-white kite shield, blue facets, and a travelling gleam.
  FX.register('fizbans-platinum-shield', {
    palette: SILVER,
    travel: 240,
    beats: (e, kit, t) => beats(e, t),
    end: () => 1400,
    air(s) {
      const e = age(s);
      if (e < 0) return;
      const img = picture('platinum-shield', 29, 34, SILVER, (set, rect, line) => {
        for (let y = 3; y < 31; y++)
          for (let x = 3; x < 26; x++) {
            const half = y < 18 ? 11 : Math.max(1, 11 - (y - 18) * 0.8);
            if (Math.abs(x - 14) <= half) set(x, y, Math.abs(x - 14) > half - 2 || y < 5 ? 5 : x < 14 ? 4 : 3);
          }
        line(14, 7, 14, 24, 5, 2);
        line(8, 12, 20, 12, 5, 2);
        line(7, 7, 7, 15, 2, 2);
        line(19, 17, 15, 25, 2, 2);
      });
      for (const t of subjects(s)) {
        const p = k.P(t),
          y = p.y - 15 - (1 - k.ease(k.clamp(e / 240))) * 12;
        k.blit(img, p.x - 14, y, e > 900 ? 0.75 : 1);
        if (e >= 240 && e < 850) {
          const q = ((e - 240) % 390) / 390;
          dot(p.x - 9 + q * 18, y + 8 + q * 9, 4, SILVER, 5);
        }
        if (e > 200) sparkles(s, p, SILVER, 5);
      }
      impact(s, SILVER, 'platinum', 28, 6);
    },
  });

  // Otiluke's Freezing Sphere: a hand-launched frost orb detonates into a vast crystal field and icy shrapnel.
  FX.register('otilukes-freezing-sphere', {
    palette: ICE,
    travel: 380,
    beats: (e, kit, t) => beats(e, t, 'blast', 210),
    end: () => 1740,
    flash: (e, t) => (t < 40 ? { color: ICE[5], alpha: 0.28 } : t < 85 ? { color: ICE[0], alpha: 0.18 } : null),
    reach: (e, grid) => ({ r: (e.area?.feet || 60) / (grid.feet || 5) + 1, up: 3 }),
    ground(s) {
      const e = s.c.t - 680;
      if (e < 0) return;
      const C = center(s),
        R = Math.round(((s.area?.feet || 60) / (s.grid.feet || 5)) * 16);
      const f = Math.min(7, Math.floor(e / 90)),
        radius = Math.round(R * (0.25 + 0.75 * k.ease(k.clamp(e / 260))));
      const img = picture(
        'frost-field:' + R + ':' + (f < 3 ? f : 'settled'),
        R * 2 + 8,
        R * 2 + 32,
        ICE,
        (set, rect, line) => {
          const cx = R + 4,
            cy = R + 16;
          const plates = Array.from({ length: 31 }, (_, i) => {
            const a = i * 2.4,
              r = radius * Math.sqrt(i / 33) * 0.94;
            return {
              x: Math.cos(a) * r,
              y: Math.sin(a) * r,
              size: Math.max(10, radius * (0.075 + (i % 4) * 0.013)),
              spin: i,
            };
          });
          for (let y = -radius; y <= radius; y++)
            for (let x = -radius; x <= radius; x++) {
              const d = Math.hypot(x, y) / radius;
              if (d > 1) continue;
              // A ragged, radial ice front gives way to separate angular frost sheets.
              if (f < 3) {
                const front = 0.74 + Math.abs(Math.cos(Math.atan2(y, x) * 9)) * 0.23;
                if (d < front && d > front - 0.23) set(cx + x, cy + y, d > front - 0.06 ? 5 : 3);
              }
              let plate = 0;
              for (const p of plates) {
                const dx = x - p.x,
                  dy = y - p.y;
                if (Math.abs(dx) > p.size || Math.abs(dy) > p.size) continue;
                const edge = 0.42 + 0.58 * Math.abs(Math.cos(Math.atan2(dy, dx) * 3 + p.spin)) ** 8;
                plate = Math.max(plate, 1 - Math.hypot(dx, dy) / (p.size * edge));
              }
              if (plate > 0) set(cx + x, cy + y, plate < 0.18 ? 4 : plate > 0.75 ? 5 : 3);
            }
          // Faceted spikes distributed across the whole actual template.
          for (let i = 0; i < 28; i++) {
            const a = i * 2.4,
              r = radius * Math.sqrt((i + 1) / 30) * 0.9;
            const x = cx + Math.cos(a) * r,
              y = cy + Math.sin(a) * r,
              h = 17 + (i % 4) * 5;
            for (let dy = 0; dy < h; dy++) {
              const w = Math.floor(((h - dy) / h) * 5);
              for (let dx = -w; dx <= w; dx++) set(x + dx, y - dy, dx < 0 ? 5 : dx < 2 ? 4 : 3);
            }
            line(x - 4, y - 3, x - 9, y - 10, 4, 2);
            // Six branching crystal arms break the flat ground silhouette.
            if (i % 3 === 0)
              for (let arm = 0; arm < 6; arm++) {
                const angle = (arm * k.tau) / 6,
                  dx = Math.cos(angle),
                  dy = Math.sin(angle);
                line(x, y, x + dx * 13, y + dy * 13, 4, 2);
                line(x + dx * 8, y + dy * 8, x + dx * 7 - dy * 4, y + dy * 7 + dx * 4, 5);
              }
          }
        },
      );
      k.blit(img, C.x - R - 4, C.y - R - 16, e > 850 ? 0.75 : 1);
    },
    air(s) {
      const e = age(s);
      if (e < 0) return;
      const C = center(s),
        H = k.P(s.pose.hand || s.pose.base);
      if (e < 380) {
        const q = e / 380;
        for (let j = 6; j >= 1; j--) {
          const u = Math.max(0, q - j * 0.035);
          dot(k.mix(H.x, C.x, u), k.mix(H.y, C.y, u) - Math.sin(u * Math.PI) * 12, 4, ICE, 3);
        }
        orb({ x: k.mix(H.x, C.x, q), y: k.mix(H.y, C.y, q) - Math.sin(q * Math.PI) * 12 }, 7, ICE);
      }
      const real = s.real(s.hits[0]);
      k.drawHit(k.hitStyle('56:freezing', ICE, { S: 66, spikes: 8 }), C, real);
      const R = ((s.area?.feet || 60) / (s.grid.feet || 5)) * 16;
      if (real >= 0 && real < 700)
        for (let i = 0; i < 26; i++) {
          const q = real / 700,
            a = (i / 26) * k.tau,
            r = k.ease(q) * R * (0.7 + k.hash(i, s.event.seed) * 0.35);
          const p = { x: C.x + Math.cos(a) * r, y: C.y + Math.sin(a) * r - Math.sin(q * Math.PI) * 18 };
          stroke(p, { x: p.x + Math.cos(a) * 7, y: p.y + Math.sin(a) * 7 - 4 }, 3, ICE, i % 2 ? 4 : 5);
        }
      impact(s, ICE, 'ice-target', 30, 6);
    },
  });

  // Heroes Feast: a long laden banquet materialises beneath a gold arch, blessing the gathered guests.
  FX.register('heroes-feast', {
    palette: GOLD,
    travel: 360,
    beats: (e, kit, t) => beats(e, t, 'soft', 100),
    end: () => 1750,
    ground(s) {
      const e = age(s);
      if (e < 0) return;
      const C = center(s),
        img = picture('banquet', 100, 45, GOLD, (set, rect, line) => {
          rect(8, 30, 5, 11, 1);
          rect(85, 30, 5, 11, 1);
          rect(4, 13, 92, 18, 2);
          rect(5, 11, 90, 16, 3);
          rect(8, 12, 84, 11, 4);
          rect(44, 12, 12, 18, 5);
          for (let i = 0; i < 6; i++) {
            const x = 13 + i * 14;
            rect(x - 4, 16, 11, 6, 2);
            rect(x - 3, 15, 9, 5, 5);
            rect(x - 2, 14, 7, 4, 3);
            rect(x, 12, 4, 4, i % 2 ? 2 : 4);
            rect(x + 5, 8, 2, 6, 5);
            rect(x + 4, 7, 4, 2, 3);
          }
          line(6, 26, 93, 26, 5, 2);
        });
      k.blit(img, C.x - 50, C.y - 18 - (1 - k.ease(k.clamp(e / 360))) * 8, e > 1150 ? 0.75 : 1);
    },
    air(s) {
      const e = age(s);
      if (e < 0) return;
      const C = center(s);
      if (e < 1000)
        for (let i = 0; i < 18; i++) {
          const a = Math.PI + (i / 17) * Math.PI;
          dot(C.x + Math.cos(a) * 49, C.y + Math.sin(a) * 25 - 2, 2, GOLD, i % 3 ? 3 : 5);
        }
      if (e > 180) {
        sparkles(s, C, GOLD, 12, 45);
        for (const t of subjects(s)) {
          ring(k.P(feet(t)), 11, 5, GOLD);
          sparkles(s, k.P(t), GOLD, 5, 10);
        }
      }
      impact(s, GOLD, 'feast', 24, 4);
    },
  });

  // Gravity Fissure: a thick black-violet fault races down the full line, white edges pulling stones inward.
  FX.register('gravity-fissure', {
    palette: VIOLET,
    travel: 260,
    beats: (e, kit, t) => beats(e, t, 'pull', 170),
    end: () => 1640,
    ground(s) {
      const e = age(s);
      if (e < 0) return;
      const A = s.area || { ...s.pose.base, dir: 0, feet: 100 };
      const L = Math.round((A.feet / (s.grid.feet || 5)) * 16),
        C = k.P(A);
      const stage = Math.min(4, Math.floor(e / 65));
      const img = picture('gravity:' + L + ':' + stage, L + 8, 35, VIOLET, (set, rect) => {
        for (let x = 3; x < L * Math.min(1, (stage + 1) / 4); x++) {
          const y = 17 + Math.round(Math.sin(x / 13) * 2 + Math.sin(x / 5) * 1.5);
          const w = 6 + Math.floor(2 * Math.abs(Math.sin(x / 19)));
          for (let dy = -w; dy <= w; dy++) set(x, y + dy, Math.abs(dy) >= w - 1 ? 5 : Math.abs(dy) >= w - 3 ? 3 : 1);
          if (x % 23 < 3) for (let j = 0; j < 7; j++) set(x + j, y + w + j, j < 5 ? 3 : 4);
        }
      });
      k.blitRotated(img, C.x, C.y, A.dir || 0, 3 / img.width, 0.5);
    },
    air(s) {
      const e = age(s);
      if (e < 200) return;
      const A = s.area || { ...s.pose.base, dir: 0, feet: 100 },
        C = k.P(A);
      const ux = Math.cos(A.dir || 0),
        uy = Math.sin(A.dir || 0),
        L = (A.feet / (s.grid.feet || 5)) * 16;
      const real = s.real(s.hits[0]);
      for (let i = 0; i < 19; i++) {
        const q = (Math.max(0, real) / 820 + k.hash(i, s.event.seed)) % 1;
        const along = ((i + 0.5) / 19) * L,
          side = (i % 2 ? -1 : 1) * (22 * (1 - q) + 3);
        const x = C.x + ux * along - uy * side,
          y = C.y + uy * along + ux * side - q * 13;
        dot(x, y, 4 - Math.floor(q * 2), STONE, i % 2 ? 3 : 4);
        if (q > 0.5) dot(x, y + 4, 2, VIOLET, 4);
      }
      impact(s, VIOLET, 'fissure', 35, 9);
    },
  });

  // Investiture Of Stone: broad pale stone plates clad the caster while orbiting boulders crack the floor.
  FX.register('investiture-of-stone', {
    palette: STONE,
    travel: 400,
    beats: (e, kit, t) => [{ at: k.CAST + t, stop: 120, target: null, kind: 'soft', power: 0 }],
    end: () => 1500,
    ground(s) {
      if (age(s) >= 0 && s.pose.base) cracks(k.P(s.pose.base), STONE, 2);
    },
    air(s) {
      const e = age(s);
      if (e < 0 || !s.pose.base) return;
      const t = caster(s),
        B = k.P(feet(t));
      k.blit(statue(Math.min(10, 2 + Math.floor(e / 45)), true), B.x - 12, B.y - 29, e > 1000 ? 0.75 : 1);
      for (let i = 0; i < 5; i++) {
        const a = s.c.raw / 380 + (i / 5) * k.tau;
        const x = B.x + Math.cos(a) * 21,
          y = B.y - 12 + Math.sin(a) * 9;
        const rock = picture('orbit-rock:' + (i % 2), 12, 12, STONE, (set, rect, line) => {
          rect(3, 2, 6, 8, 3);
          rect(2, 4, 8, 4, 3);
          rect(3, 3, 4, 3, 4);
          line(7, 6, 8, 8, 1, 2);
        });
        k.blit(rock, x - 6, y - 6);
      }
      const real = s.real(s.hits[0]);
      k.drawHit(k.hitStyle('56:stone-armor', STONE, { S: 32, spikes: 5 }), k.P(t), real);
      k.shards(B, real, STONE, s.event.seed, 10, 26);
    },
  });

  // Investiture Of Wind: a broad white-cyan tornado winds around a lifted spectral silhouette.
  FX.register('investiture-of-wind', {
    palette: ICE,
    travel: 280,
    beats: (e, kit, t) => [{ at: k.CAST + t, stop: 95, target: null, kind: 'soft', power: 0 }],
    end: () => 1550,
    ground(s) {
      if (age(s) >= 0 && s.pose.base) ring(k.P(s.pose.base), 20, 8, ICE, 3);
    },
    air(s) {
      const e = age(s);
      if (e < 0 || !s.pose.base) return;
      const B = k.P(s.pose.base),
        f = Math.floor(s.c.raw / 85) % 6;
      const img = picture('tornado:' + f, 58, 56, ICE, (set, rect, line) => {
        // Broad diagonal wind sheets sweep across a funnel, tapering to a narrow foot.
        for (let y = 4; y < 49; y++) {
          const rx = Math.round(6 + (49 - y) * 0.4);
          for (let x = -rx; x <= rx; x++) {
            const wave = Math.sin(y / 2.9 + (x / rx) * 1.4 + (f * k.tau) / 6);
            if (wave > -0.15) set(29 + x, y, wave > 0.82 ? 5 : wave > 0.4 ? 4 : 3);
          }
        }
        for (let j = 0; j < 44; j++) {
          const a = (j / 44) * k.tau;
          rect(Math.round(29 + Math.cos(a) * 24), Math.round(7 + Math.sin(a) * 5), 3, 2, 4);
        }
        line(10, 10, 7, 28, 3, 2);
        line(47, 13, 51, 25, 5, 2);
      });
      // A lifted outline echoes the body; the board keeps authority over the real figure.
      if (e >= 200 && e < 950) {
        const ghost = picture('wind-lift', 18, 29, ICE, (set, rect) => {
          rect(6, 2, 6, 6, 4);
          rect(4, 10, 10, 9, 3);
          rect(4, 20, 4, 7, 4);
          rect(11, 20, 4, 7, 4);
        });
        k.blit(ghost, B.x - 9, B.y - 35 - Math.sin(s.c.raw / 160) * 2, 0.5);
      }
      k.blit(img, B.x - 29, B.y - 49, e > 1050 ? 0.5 : 1);
      const real = s.real(s.hits[0]);
      k.drawHit(k.hitStyle('56:wind', ICE, { S: 34, spikes: 4 }), { x: B.x, y: B.y - 15 }, real);
      k.shards(B, real, ICE, s.event.seed, 7, 28);
    },
  });

  // Drawmij's Instant Summons: a gold hand sigil opens a violet spiral and ejects a substantial golden relic.
  FX.register('drawmijs-instant-summons', {
    palette: VIOLET,
    travel: 480,
    beats: (e, kit, t) => [{ at: k.CAST + t, stop: 100, target: null, kind: 'soft', power: 0 }],
    end: () => 1550,
    air(s) {
      const e = age(s);
      if (e < 0 || !s.pose.hand) return;
      const H = k.P(s.pose.hand),
        P = { x: H.x, y: H.y - 15 };
      if (e < 1020) {
        ring(H, 14, 6, GOLD);
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * k.tau;
          dot(H.x + Math.cos(a) * 14, H.y + Math.sin(a) * 6, 3, GOLD, 5);
        }
      }
      if (e >= 120 && e < 950) {
        const f = Math.floor(s.c.raw / 90) % 6;
        const img = picture('summon-portal:' + f, 38, 30, VIOLET, (set, rect) => {
          for (let y = 2; y < 28; y++)
            for (let x = 2; x < 36; x++) {
              const dx = (x - 19) / 16,
                dy = (y - 15) / 12,
                r = Math.hypot(dx, dy);
              if (r > 1) continue;
              const a = Math.atan2(dy, dx) + r * 7 - (f * k.tau) / 6;
              set(x, y, r > 0.8 ? 4 : Math.sin(a * 2) > 0.3 ? 3 : 1);
            }
        });
        k.blit(img, P.x - 19, P.y - 15, e > 800 ? 0.5 : 1);
      }
      if (e >= 480) {
        const q = k.clamp((e - 480) / 200);
        const item = picture('summoned-relic', 21, 22, GOLD, (set, rect, line) => {
          rect(3, 5, 15, 13, 2);
          rect(4, 4, 13, 5, 3);
          rect(4, 10, 13, 7, 4);
          rect(8, 8, 5, 6, 5);
          rect(9, 9, 3, 4, 2);
          line(3, 18, 17, 18, 3, 2);
        });
        k.blit(item, H.x - 10, P.y - 12 + q * 12 - Math.sin(q * Math.PI) * 9, e > 1100 ? 0.75 : 1);
        sparkles(s, H, GOLD, 6, 15);
      }
      const real = s.real(s.hits[0]);
      k.drawHit(k.hitStyle('56:summon', GOLD, { S: 34, spikes: 4 }), P, real);
      k.shards(P, real, VIOLET, s.event.seed, 8, 22);
    },
  });

  // Soul Cage: a bright soul is reeled into a large barred spectral lantern and held behind silver ribs.
  FX.register('soul-cage', {
    palette: SILVER,
    travel: 500,
    beats: (e, kit, t) => beats(e, t, 'soft', 130),
    end: () => 1560,
    air(s) {
      const e = age(s);
      if (e < 0 || !s.pose.hand) return;
      const H = k.P(s.pose.hand),
        C = { x: H.x, y: H.y - 13 },
        T = k.P(subjects(s)[0]);
      const q = k.ease(k.clamp((e - 100) / 400));
      const W = { x: k.mix(T.x, C.x, q), y: k.mix(T.y, C.y, q) - Math.sin(q * Math.PI) * 18 };
      if (e >= 100 && e < 510) {
        for (let i = 1; i < 7; i++) {
          const u = k.clamp(q - i * 0.045);
          dot(k.mix(T.x, C.x, u), k.mix(T.y, C.y, u) - Math.sin(u * Math.PI) * 18, 4 - Math.floor(i / 3), SILVER);
        }
        orb(W, 5, SILVER);
        dot(W.x - 2, W.y - 1, 1, SILVER, 1);
        dot(W.x + 2, W.y - 1, 1, SILVER, 1);
      }
      const img = picture('soul-lantern:' + (e >= 500), 27, 36, SILVER, (set, rect, line) => {
        rect(9, 2, 9, 2, 4);
        rect(8, 4, 2, 5, 3);
        rect(17, 4, 2, 5, 3);
        line(13, 7, 3, 13, 4, 2);
        line(13, 7, 23, 13, 5, 2);
        if (e >= 500) {
          rect(10, 16, 8, 10, 4);
          rect(12, 13, 5, 10, 5);
          rect(9, 25, 7, 4, 3);
        }
        rect(3, 12, 22, 3, 4);
        rect(3, 29, 22, 3, 4);
        for (let i = 0; i < 4; i++) rect(4 + i * 6, 15, 2, 14, i % 2 ? 3 : 5);
        rect(7, 33, 14, 2, 3);
      });
      k.blit(img, C.x - 13, C.y - 18, e > 1100 ? 0.75 : 1);
      if (e > 500) sparkles(s, C, SILVER, 6, 16);
      const real = s.real(s.hits[0]);
      k.drawHit(k.hitStyle('56:cage', SILVER, { S: 30, spikes: 5 }), C, real);
      k.shards(C, real, SILVER, s.event.seed, 7, 20);
    },
  });

  // Eyebite: an enormous crimson-violet eye opens over the caster and fixes its victim with a dread ray.
  FX.register('eyebite', {
    palette: DREAD,
    travel: 360,
    beats: (e, kit, t) => beats(e, t, 'beam', 135),
    end: () => 1530,
    air(s) {
      const e = age(s);
      if (e < 0 || !s.pose.base) return;
      const B = k.P(s.pose.base),
        E = { x: B.x, y: B.y - 28 },
        T = k.P(subjects(s)[0]);
      if (e >= 280 && e < 820) {
        stroke(E, T, 6, DREAD, 2);
        stroke(E, T, 3, DREAD, 4);
      }
      const open = Math.min(4, Math.floor(e / 55)),
        pulse = Math.floor(s.c.raw / 120) % 2;
      const img = picture('dread-eye:' + open + ':' + pulse, 39, 27, DREAD, (set, rect, line) => {
        const height = 1 + open * 2;
        for (let y = 2; y < 25; y++)
          for (let x = 2; x < 37; x++) {
            const dx = Math.abs(x - 19) / 17,
              dy = Math.abs(y - 13);
            if (dy > height * (1 - dx * dx)) continue;
            const d = Math.hypot(x - 19, y - 13);
            set(x, y, dy > height * (1 - dx * dx) - 2 ? 3 : d < 6 + pulse ? 2 : 4);
            if (Math.abs(x - 19) < 2 && dy < height - 1) set(x, y, 1);
          }
        if (open >= 3) {
          rect(15, 8, 3, 3, 5);
          line(6, 6, 3, 2, 3, 2);
          line(32, 6, 35, 2, 3, 2);
        }
      });
      k.blit(img, E.x - 19, E.y - 13, e > 1000 ? 0.75 : 1);
      if (e >= 360) {
        const t = subjects(s)[0],
          F = k.P(feet(t));
        ring(F, 13, 6, DREAD, 3);
        for (let i = 0; i < 3; i++) {
          const a = s.c.raw / 180 + (i * k.tau) / 3;
          dot(T.x + Math.cos(a) * 10, T.y - 10 + Math.sin(a) * 5, 3, DREAD, 4);
        }
      }
      impact(s, DREAD, 'eyebite', 34, 8);
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
