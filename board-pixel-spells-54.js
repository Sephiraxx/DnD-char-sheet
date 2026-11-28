/* Pixel spells, batch 54: rebuilt silhouettes, held peaks and real-time impact debris. */
(function (root) {
  'use strict';
  const FX = root.BoardPixelFX;
  if (!FX) return;
  const k = FX.kit;
  const VIOLET = ['#190e2d', '#49306b', '#8955c4', '#c79aff', '#f1daff', '#ffffff'];
  const LIFE = ['#11291d', '#286343', '#5ebf53', '#b4ef76', '#ffe49a', '#ffffec'];
  const BONE = ['#17231d', '#40594b', '#8eaa85', '#d5dbb3', '#f6f0d5', '#ffffff'];
  const GREEN = ['#142817', '#37603a', '#63a83d', '#b5ed67', '#e6ffae', '#fffde1'];
  const GOLD = ['#29172f', '#604076', '#af79cd', '#f4c454', '#fff1ad', '#ffffff'];
  const DRAIN = ['#1a102d', '#4e296a', '#8a50c4', '#b9ed79', '#e9ffba', '#ffffff'];
  const HOLY = ['#302218', '#806039', '#d5a849', '#ffe281', '#fff7c6', '#ffffff'];
  const MEMORY = ['#29142d', '#69416f', '#b766af', '#f49bdf', '#ffe0f5', '#ffffff'];
  const EARTH = ['#241d14', '#604732', '#94764e', '#c0aa77', '#e6d5a7', '#fff3d2'];
  const PI = Math.PI;

  // Small indexed painters are used only inside cached sprites; all live art uses the kit.
  function image(key, w, h, palette, paint) {
    return k.sprite('b54:' + key, w, h, palette, set => {
      const box = (x, y, width, height, ink) => {
        for (let j = 0; j < height; j++) for (let i = 0; i < width; i++) set(x + i, y + j, ink);
      };
      const line = (x, y, X, Y, ink, width = 2) => {
        const n = Math.max(1, Math.ceil(Math.hypot(X - x, Y - y)));
        for (let i = 0; i <= n; i++) {
          box(
            Math.round(k.mix(x, X, i / n) - (width - 1) / 2),
            Math.round(k.mix(y, Y, i / n) - (width - 1) / 2),
            width,
            width,
            ink,
          );
        }
      };
      const oval = (x, y, rx, ry, ink, stroke = 0) => {
        for (let Y = Math.floor(y - ry); Y <= y + ry; Y++) {
          for (let X = Math.floor(x - rx); X <= x + rx; X++) {
            const d = ((X - x) / rx) ** 2 + ((Y - y) / ry) ** 2;
            const inner =
              stroke &&
              rx > stroke &&
              ry > stroke &&
              ((X - x) / (rx - stroke)) ** 2 + ((Y - y) / (ry - stroke)) ** 2 < 1;
            if (d <= 1 && !inner) set(X, Y, ink);
          }
        }
      };
      paint({ set, box, line, oval });
    });
  }
  function stamp(img, p, alpha = 1) {
    k.blit(img, p.x - img.width / 2, p.y - img.height / 2, alpha);
  }
  function bead(p, palette, size = 3, ink = 4) {
    k.dot(p.x, p.y, palette[0], size + 2);
    k.dot(p.x, p.y, palette[ink], size);
  }
  function ring(p, rx, ry, palette, key, alpha = 1) {
    rx = Math.max(3, Math.round(rx));
    ry = Math.max(3, Math.round(ry));
    const img = image('ring:' + key + ':' + rx + ':' + ry, rx * 2 + 8, ry * 2 + 8, palette, a =>
      a.oval(rx + 4, ry + 4, rx, ry, 4, 2),
    );
    stamp(img, p, alpha);
  }
  function caster(s) {
    const p = s.pose.base || s.pose.hand || s.pose.target || { x: 0, y: 0 };
    return { x: p.x, y: p.y - (s.pose.base ? 0.55 * (p.span || 1) : 0), span: p.span || 1 };
  }
  function people(s) {
    return s.targets.length ? s.targets : [s.pose.target || caster(s)];
  }
  function feet(t) {
    return k.P({ x: t.baseX ?? t.x, y: t.baseY ?? t.y + (t.span || 1) * 0.5 });
  }
  function beats(event, travel, kind = 'soft', stop = 90) {
    return (event.targets?.length ? event.targets : [null]).map(target => ({
      at: k.CAST + travel,
      stop,
      target,
      kind,
      power: kind === 'soft' ? 0 : 0.065,
    }));
  }
  function impact(s, p, palette, key, size = 25, hit = s.hits[0]) {
    if (!hit) return;
    const real = s.real(hit);
    k.drawHit(k.hitStyle('b54:' + key, palette, { S: size, spikes: 4, minor: 4, jag: 0.12 }), p, real);
    k.shards(p, real, palette, (s.event.seed || 0) + hit.at, 7, size * 0.6);
  }
  function leaf(flip = 0) {
    return image('leaf:' + flip, 9, 7, GREEN, a => {
      a.line(2, flip ? 4 : 2, 6, flip ? 2 : 4, 3, 3);
      a.line(2, 3, 6, 3, 4, 1);
    });
  }
  function leaves(s, p, count, radius, e, life = 650) {
    if (e < 0 || e > life) return;
    const q = e / life;
    for (let i = 0; i < count; i++) {
      const angle = (i * k.tau) / count + q * 2.7 + k.hash(i, s.event.seed) * 0.5;
      stamp(
        leaf(i % 2),
        {
          x: p.x + Math.cos(angle) * radius * (0.45 + 0.55 * k.ease(q)),
          y: p.y + Math.sin(angle) * radius * 0.55 + q * q * 9,
        },
        q > 0.85 ? 0.5 : 1,
      );
    }
  }
  function eye(open, palette, key) {
    return image('eye:' + key + ':' + open, 27, 19, palette, a => {
      const height = [1, 3, 6, 7][open];
      // An angular, closed almond reads as an eyelid before its pupil is revealed.
      a.line(3, 9, 12, 9 - height, 4, 2);
      a.line(12, 9 - height, 23, 9, 4, 2);
      a.line(3, 9, 12, 9 + height, 3, 2);
      a.line(12, 9 + height, 23, 9, 3, 2);
      if (open > 1) {
        a.oval(13, 9, 4, height - 1, 5);
        a.box(12, 6, 3, 7, 1);
        a.box(13, 6, 1, 2, 5);
      }
    });
  }
  function plus() {
    return image('healing-plus', 21, 21, LIFE, a => {
      a.box(8, 2, 5, 17, 3);
      a.box(2, 8, 17, 5, 3);
      a.box(9, 3, 3, 14, 4);
      a.box(3, 9, 14, 3, 4);
      a.box(9, 4, 2, 7, 5);
      a.box(4, 9, 7, 2, 5);
    });
  }
  // Local cube coordinates come from the actual template corners, including rotated/self cubes.
  function cube(s) {
    const corners = s.area ? k.outline(s.area, s.grid) : [];
    if (corners.length >= 4) {
      const p = corners.map(v => k.P({ x: v[0], y: v[1] }));
      return {
        at: (u, v) => ({
          x: p[0].x + (p[1].x - p[0].x) * u + (p[3].x - p[0].x) * v,
          y: p[0].y + (p[1].y - p[0].y) * u + (p[3].y - p[0].y) * v,
        }),
        size: Math.max(16, Math.hypot(p[1].x - p[0].x, p[1].y - p[0].y)),
      };
    }
    const p = k.P(s.area || s.pose.target || caster(s));
    return { at: (u, v) => ({ x: p.x + (u - 0.5) * 32, y: p.y + (v - 0.5) * 32 }), size: 32 };
  }

  // Creation: violet-white pixels assemble a solid, outlined, square-sized conjured crate.
  FX.register('creation', {
    palette: VIOLET,
    travel: 380,
    beats: (event, kit, travel) => [{ at: kit.CAST + travel, stop: 100, target: null, kind: 'soft', power: 0 }],
    end: () => 1500,
    ground(s) {
      const t = s.c.t - k.CAST;
      if (t < 0) return;
      const p = cube(s).at(0.5, 0.5);
      ring({ x: p.x, y: p.y + 7 }, 14, 7, VIOLET, 'creation', t > 950 ? 0.5 : 1);
    },
    air(s) {
      const t = s.c.t - k.CAST;
      if (t < 0) return;
      const p = cube(s).at(0.5, 0.5);
      const stage = Math.min(8, Math.floor(t / 45));
      const img = image('crate:' + stage, 25, 26, VIOLET, a => {
        for (let y = 4; y <= 22; y++)
          for (let x = 3; x <= 21; x++) {
            const cell = Math.floor((x - 3) / 3) + Math.floor((22 - y) / 3);
            if (stage < 8 && cell > stage + 1) continue;
            const rim = x < 5 || x > 19 || y < 6 || y > 20;
            let ink = rim ? 4 : x > 16 ? 2 : 3;
            if (y === 10 || y === 16) ink = 2;
            if (Math.abs(x - 4 - (y - 5)) < 2) ink = 4;
            if (stage < 8 && cell === stage + 1) ink = 5;
            a.set(x, y, ink);
          }
        if (stage === 8) {
          a.line(4, 5, 20, 5, 5, 1);
          a.line(4, 5, 4, 20, 4, 1);
        }
      });
      impact(s, p, VIOLET, 'creation', 31);
      stamp(img, { x: p.x, y: p.y - 3 });
      if (t < 380)
        for (let i = 0; i < 14; i++) {
          const q = k.clamp(t / 380 + k.hash(i, s.event.seed) * 0.35);
          const angle = i * 2.4;
          bead(
            { x: p.x + Math.cos(angle) * (1 - q) * 25, y: p.y + Math.sin(angle) * (1 - q) * 22 - 3 },
            VIOLET,
            2,
            i % 2 ? 4 : 5,
          );
        }
      if (t >= 380 && t < 760) {
        const y = p.y - 13 + Math.floor((t - 380) / 25);
        for (let i = -7; i <= 7; i += 3) bead({ x: p.x + i, y }, VIOLET, 1, 5);
      }
    },
  });

  // Mass Cure Wounds: broad green-gold downpours, a giant plus on every body and bright foot rings.
  FX.register('mass-cure-wounds', {
    palette: LIFE,
    travel: 260,
    beats: (event, kit, travel) => beats(event, travel),
    end: () => 1320,
    ground(s) {
      const t = s.c.t - k.CAST;
      if (t < 0) return;
      people(s).forEach(target => {
        const e = t - 260;
        ring(feet(target), e < 0 ? 5 + 8 * k.clamp(t / 260) : e < 430 ? 13 : 9, 6, LIFE, 'cure');
      });
    },
    air(s) {
      const t = s.c.t - k.CAST;
      if (t < 0) return;
      people(s).forEach((target, i) => {
        const p = k.P(target),
          hit = s.hits.find(h => h.id === target.id) || s.hits[0];
        if (t < 530) {
          const step = Math.min(5, Math.floor(t / 55));
          const column = image('heal-column:' + step, 23, 42, LIFE, a => {
            const bottom = Math.min(39, 8 + step * 7);
            a.box(5, 2, 13, bottom - 1, 2);
            a.box(7, 2, 9, bottom - 1, 3);
            a.box(10, 2, 3, bottom - 1, 4);
            a.line(7, bottom, 15, bottom, 5, 3);
            for (let j = 0; j < 3; j++) a.box(6 + j * 4, 4 + ((step * 5 + j * 9) % 23), 2, 4, 5);
          });
          stamp(column, { x: p.x, y: p.y - 17 }, t > 440 ? 0.5 : 0.75);
        }
        impact(s, p, LIFE, 'cure', 29, hit);
        if (t >= 230 && t < 760) stamp(plus(), { x: p.x, y: p.y - (t > 600 ? 4 : 0) });
        else if (t >= 760) {
          const f = feet(target);
          for (let j = 0; j < 3; j++) bead({ x: f.x + (j - 1) * 6, y: f.y - 3 - j * 3 }, LIFE, 2, 4);
        }
        if (hit) leaves(s, p, 5, 18, s.real(hit) - i * 5, 550);
      });
    },
  });

  function skeleton(stage, step) {
    return image('skeleton:' + stage + ':' + step, 17, 21, BONE, a => {
      const shift = stage < 3 ? (3 - stage) * 4 : 0;
      const point = (x, y, X, Y, ink, width = 2) => {
        // Emerging bones are cut off at their grave, rather than hovering above it.
        const n = Math.max(1, Math.ceil(Math.hypot(X - x, Y - y)));
        for (let j = 0; j <= n; j++) {
          const yy = Math.round(k.mix(y, Y, j / n)) + shift;
          if (yy < 19) a.box(Math.round(k.mix(x, X, j / n)), yy, width, width, ink);
        }
      };
      for (let y = 2; y <= 6; y++) if (y + shift < 19) a.box(y === 2 ? 6 : 5, y + shift, y === 2 ? 5 : 7, 1, 4);
      if (5 + shift < 19) {
        a.box(6, 4 + shift, 2, 2, 1);
        a.box(9, 4 + shift, 2, 2, 1);
      }
      point(7, 7, 7, 13, 5);
      point(4, 9, 11, 9, 4);
      point(5, 11, 10, 11, 3);
      point(4, 8, 2, 12 - step, 4);
      point(11, 8, 13, 11 + step, 4);
      point(6, 13, 9, 13, 4);
      point(6, 14, 4, 18, 4);
      point(9, 14, 11, 18, 5);
      point(3, 18, 5, 18, 3);
      point(10, 18, 12, 18, 4);
    });
  }
  function gravePositions(s) {
    const p = k.P(s.pose.target || people(s)[0] || caster(s));
    return Array.from({ length: 5 }, (_, i) => {
      const angle = (i * k.tau) / 5 - PI / 2;
      return { x: p.x + Math.cos(angle) * 26, y: p.y + Math.sin(angle) * 17 + 7 };
    }).sort((a, b) => a.y - b.y);
  }
  // Danse Macabre: five full bone-white skeletons climb out of green graves in a ritual ring.
  FX.register('danse-macabre', {
    palette: BONE,
    travel: 400,
    beats: (event, kit, travel) => [{ at: kit.CAST + travel, stop: 110, target: null, kind: 'soft', power: 0 }],
    end: () => 1620,
    reach: () => ({ r: 3, up: 2 }),
    ground(s) {
      const t = s.c.t - k.CAST;
      if (t < 0) return;
      gravePositions(s).forEach(p => ring(p, 9, 4, GREEN, 'grave', t > 1030 ? 0.5 : 1));
    },
    air(s) {
      const t = s.c.t - k.CAST;
      if (t < 0) return;
      gravePositions(s).forEach((p, i) => {
        const stage = Math.min(3, Math.floor(Math.max(0, t - i * 23) / 100));
        if (t >= i * 23)
          stamp(
            skeleton(stage, t < 450 ? 0 : Math.floor(s.c.raw / 200 + i) % 2),
            { x: p.x, y: p.y - 9 },
            t > 1080 ? 0.75 : 1,
          );
        if (s.hits[0]) {
          const real = s.real(s.hits[0]);
          k.shards(p, real, BONE, (s.event.seed || 0) + i * 5, 4, 11);
        }
        for (let j = 0; j < 2; j++) {
          const q = (s.c.raw / 700 + i * 0.19 + j * 0.5) % 1;
          bead({ x: p.x + Math.sin(q * 6 + i) * 9, y: p.y - q * 20 }, GREEN, 2, j ? 3 : 4);
        }
      });
      impact(s, k.P(s.pose.target || people(s)[0]), GREEN, 'danse', 32);
    },
  });

  function tree() {
    return image('tree-glyph', 35, 38, GREEN, a => {
      a.line(17, 31, 17, 11, 3, 5);
      a.line(17, 24, 8, 16, 4, 3);
      a.line(17, 21, 26, 13, 4, 3);
      a.line(17, 12, 13, 5, 4, 3);
      a.line(17, 11, 22, 5, 4, 3);
      [
        [9, 14],
        [8, 8],
        [16, 6],
        [25, 9],
        [28, 16],
      ].forEach(([x, y]) => {
        a.oval(x, y, 5, 4, 3);
        a.line(x - 2, y - 1, x + 2, y - 1, 4, 2);
      });
      a.line(17, 28, 8, 33, 4, 3);
      a.line(17, 28, 26, 33, 4, 3);
      a.line(17, 30, 17, 34, 5, 2);
      a.line(16, 16, 16, 27, 5, 1);
    });
  }
  function rootCircle(radius, phase) {
    const r = Math.round(radius),
      w = r * 2 + 10,
      h = Math.round(r * 1.25) + 12;
    return image('root-circle:' + r + ':' + phase, w, h, GREEN, a => {
      const x = w / 2,
        y = h / 2;
      a.oval(x, y, r, r * 0.57, 3, 2);
      for (let i = 0; i < 10; i++) {
        const angle = (i * k.tau) / 10;
        const X = x + Math.cos(angle) * r,
          Y = y + Math.sin(angle) * r * 0.57;
        const mx = k.mix(x, X, 0.55) + (i % 2 ? 3 : -3),
          my = k.mix(y, Y, 0.6);
        a.line(x, y, mx, my, 3, 3);
        a.line(mx, my, X, Y, 4, 2);
        a.line(mx, my, X - Math.sin(angle) * 6, Y + Math.cos(angle) * 4, 3, 2);
        a.oval(X, Y - (phase % 2), 4, 2, 4);
      }
    });
  }
  // Commune With Nature: thick living roots flood a broad circle beneath a rising luminous tree.
  FX.register('commune-with-nature', {
    palette: GREEN,
    travel: 350,
    beats: (event, kit, travel) => [{ at: kit.CAST + travel, stop: 100, target: null, kind: 'soft', power: 0 }],
    end: () => 1550,
    ground(s) {
      const t = s.c.t - k.CAST;
      if (t < 0) return;
      const p = feet(caster(s));
      const radius = 12 + 26 * k.ease(k.clamp(t / 350));
      stamp(rootCircle(Math.round(radius / 2) * 2, 0), p, t > 900 ? 0.5 : 1);
    },
    air(s) {
      const t = s.c.t - k.CAST;
      if (t < 0) return;
      const p = k.P(caster(s));
      impact(s, p, GREEN, 'commune', 33);
      if (t < 900) stamp(tree(), { x: p.x, y: p.y - 5 - k.ease(k.clamp(t / 350)) * 12 });
      if (s.hits[0]) leaves(s, p, 10, 32, s.real(s.hits[0]), 850);
    },
  });

  function rift(frame, size) {
    return image('rift:' + frame + ':' + size, 45, 49, VIOLET, a => {
      const rx = size,
        ry = size * 1.12;
      a.oval(22, 24, rx, ry, 1);
      a.oval(22, 24, rx, ry, 3, 3);
      a.oval(22, 24, rx - 3, ry - 3, 2, 2);
      for (let i = 0; i < 3; i++) {
        const angle = (frame * PI) / 4 + (i * k.tau) / 3;
        const x = 22 + Math.cos(angle) * (rx - 1),
          y = 24 + Math.sin(angle) * (ry - 1);
        a.line(x, y, x - Math.sin(angle) * 5, y + Math.cos(angle) * 5, 5, 2);
      }
      if (size >= 14)
        [
          [16, 18],
          [29, 24],
          [18, 32],
        ].forEach(([x, y], i) => {
          a.line(x - 4, y, x, y - 2, 4, 2);
          a.line(x, y - 2, x + 4, y, 4, 2);
          a.line(x - 3, y + 1, x + 3, y + 1, 3, 2);
          a.box(x + ((frame + i) % 3) - 1, y - 1, 2, 4, 5);
        });
    });
  }
  // Contact Other Plane: a broad violet whirlpool tears open above the caster, full of watching eyes.
  FX.register('contact-other-plane', {
    palette: VIOLET,
    travel: 300,
    beats: (event, kit, travel) => [{ at: kit.CAST + travel, stop: 100, target: null, kind: 'soft', power: 0 }],
    end: () => 1470,
    air(s) {
      const t = s.c.t - k.CAST;
      if (t < 0) return;
      const p = k.P(caster(s)),
        q = { x: p.x, y: p.y - 16 };
      const size =
        t < 300 ? 5 + Math.floor(k.ease(t / 300) * 13) : t < 800 ? 18 : Math.max(3, 18 - Math.floor((t - 800) / 20));
      impact(s, q, VIOLET, 'plane', 39);
      stamp(rift(Math.floor(s.c.raw / 80) % 8, size), q);
      if (t > 880) ring({ x: p.x, y: p.y - 6 }, 10, 4, VIOLET, 'plane-residue', 0.75);
    },
  });

  function chain(rx, ry, phase, key) {
    return image('chain:' + key + ':' + rx + ':' + ry + ':' + phase, rx * 2 + 12, ry * 2 + 12, GOLD, a => {
      const cx = rx + 6,
        cy = ry + 6;
      a.oval(cx, cy, rx, ry, key === 'hold' ? 2 : 3, key === 'hold' ? 3 : 2);
      if (key === 'hold') a.oval(cx, cy, rx + 1, ry + 1, 3, 1);
      for (let i = 0; i < 10; i++) {
        const angle = ((i + phase * 0.25) * k.tau) / 10;
        a.oval(cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry, i % 2 ? 2 : 3, i % 2 ? 3 : 2, 4, 1);
      }
      // Four squared runes break the silhouette of the chain.
      [
        [cx - rx, cy],
        [cx + rx, cy],
        [cx, cy - ry],
        [cx, cy + ry],
      ].forEach(([x, y]) => {
        a.line(x - 2, y - 2, x + 2, y - 2, 5, 2);
        a.line(x, y - 2, x, y + 2, 4, 2);
      });
    });
  }
  function scroll(sealed) {
    return image('scroll:' + sealed, 25, 27, GOLD, a => {
      a.box(5, 3, 15, 20, 4);
      a.box(6, 4, 12, 17, 5);
      a.box(3, 2, 18, 4, 3);
      a.box(4, 3, 16, 2, 4);
      a.box(4, 21, 18, 4, 3);
      a.box(5, 22, 15, 2, 4);
      a.line(9, 9, 16, 9, 2, 2);
      a.line(9, 13, 14, 13, 2, 2);
      if (sealed) {
        a.line(14, 18, 12, 24, 2, 2);
        a.line(16, 18, 18, 24, 2, 2);
        a.oval(15, 18, 4, 4, 2);
        a.oval(15, 17, 2, 2, 3);
        a.set(15, 16, 5);
      }
    });
  }
  // Geas: a gold chain of runes clasps the head and an oversized sealed command scroll stamps down.
  FX.register('geas', {
    palette: GOLD,
    travel: 330,
    beats: (event, kit, travel) => beats(event, travel, 'soft', 110),
    end: () => 1430,
    ground(s) {
      if (s.c.t < k.CAST + 220) return;
      people(s).forEach(target => ring(feet(target), 11, 5, GOLD, 'geas', 0.75));
    },
    air(s) {
      const t = s.c.t - k.CAST;
      if (t < 0) return;
      people(s).forEach(target => {
        const p = k.P(target),
          head = { x: p.x, y: p.y - 5 };
        const hit = s.hits.find(h => h.id === target.id) || s.hits[0];
        impact(s, head, GOLD, 'geas', 31, hit);
        const rx = t < 330 ? 22 - Math.floor(k.ease(t / 330) * 10) : 12;
        stamp(chain(rx, 6, t < 330 ? Math.floor(t / 65) % 4 : 0, 'geas'), head);
        if (t >= 180 && t < 880) {
          const drop = t < 330 ? (1 - k.ease((t - 180) / 150)) * 14 : 0;
          stamp(scroll(t >= 330 ? 1 : 0), { x: p.x, y: p.y - 14 - drop });
        }
      });
    },
  });

  // Enervation: a thick white-cored violet tether carries bright green stolen life back to the hand.
  FX.register('enervation', {
    palette: DRAIN,
    travel: 80,
    beats: (event, kit, travel) => beats(event, travel, 'beam', 115),
    end: () => 1170,
    air(s) {
      if (!s.pose.hand || s.c.t < k.CAST) return;
      const t = s.c.t - k.CAST,
        H = k.P(s.pose.hand),
        target = people(s)[0],
        T = k.P(k.contact(target, s.pose.hand));
      const dx = H.x - T.x,
        dy = H.y - T.y,
        length = Math.hypot(dx, dy) || 1;
      const nx = -dy / length,
        ny = dx / length;
      const age = t - 80;
      if (t < 680) {
        const width = t < 450 ? 8 : Math.max(2, 8 - Math.floor((t - 450) / 40));
        const points = Math.min(90, Math.max(12, Math.ceil(length / 2)));
        for (const [ink, size] of [
          [0, width + 2],
          [2, width],
          [3, Math.max(2, width - 3)],
          [5, Math.max(1, width - 6)],
        ]) {
          for (let j = 0; j <= points; j++) {
            const q = j / points;
            if (t > 560 && j % 5 < 2) continue;
            const bend = Math.sin(q * PI) * Math.sin(q * 15 - s.c.raw / 70) * 2;
            k.dot(k.mix(T.x, H.x, q) + nx * bend, k.mix(T.y, H.y, q) + ny * bend, DRAIN[ink], size);
          }
        }
        for (let j = 0; j < 8; j++) {
          const q = (s.c.raw / 470 + j / 8) % 1;
          const bend = Math.sin(q * PI) * Math.sin(q * 15 - s.c.raw / 70) * 2;
          const p = { x: k.mix(T.x, H.x, q) + nx * bend, y: k.mix(T.y, H.y, q) + ny * bend };
          bead(p, DRAIN, j % 2 ? 3 : 4, j % 2 ? 4 : 5);
          bead({ x: p.x - (dx / length) * 4, y: p.y - (dy / length) * 4 }, DRAIN, 2, 3);
        }
        ring(T, 11, 12, VIOLET, 'drain-target');
        k.disc(H.x, H.y, 6, DRAIN[0]);
        k.disc(H.x, H.y, 4, DRAIN[3]);
        k.disc(H.x, H.y, 2, DRAIN[5]);
      } else ring(H, 7, 4, DRAIN, 'drain-residue', 0.75);
      impact(s, T, DRAIN, 'enervation', 35);
      if (age >= 0 && s.hits[0]) k.shards(H, s.real(s.hits[0]) - 180, DRAIN, s.event.seed || 0, 6, 13);
    },
  });

  function shell(frame) {
    return image('holy-shell:' + frame, 43, 47, HOLY, a => {
      a.oval(21, 23, 18, 21, 3, frame === 0 ? 4 : 3);
      a.oval(21, 23, 15, 18, 4, 2);
      a.line(9, 10, 14, 5, 5, 3);
      a.line(6, 16, 6, 23, 5, 2);
      a.line(29, 35, 34, 29, 5, 2);
      // The open centre preserves the caster; the heavy faceted rim is the shell.
      if (frame === 0)
        for (let i = 0; i < 8; i++) {
          const angle = (i * k.tau) / 8;
          a.line(
            21 + Math.cos(angle) * 16,
            23 + Math.sin(angle) * 18,
            21 + Math.cos(angle) * 20,
            23 + Math.sin(angle) * 22,
            5,
            2,
          );
        }
    });
  }
  function wisp(frame) {
    return image('dark-wisp:' + frame, 15, 15, VIOLET, a => {
      a.oval(6, 6, 4, 4, 1);
      a.line(6, 8, 10, 11, 2, 3);
      a.line(10, 11, frame ? 12 : 9, 12, 3, 2);
      a.box(4, 4, 2, 2, 4);
    });
  }
  // Dispel Evil and Good: a thick white-gold holy shell snaps around the caster and expels dark spirits.
  FX.register('dispel-evil-and-good', {
    palette: HOLY,
    travel: 260,
    beats: (event, kit, travel) => [{ at: kit.CAST + travel, stop: 110, target: null, kind: 'soft', power: 0 }],
    end: () => 1400,
    ground(s) {
      const t = s.c.t - k.CAST;
      if (t < 0) return;
      const p = feet(caster(s));
      ring(p, t < 260 ? 9 + Math.floor(t / 30) : t < 600 ? 24 : 16, 8, HOLY, 'holy-floor');
    },
    air(s) {
      const t = s.c.t - k.CAST;
      if (t < 0) return;
      const p = k.P(caster(s));
      impact(s, p, HOLY, 'dispel', 43);
      if (t < 870) stamp(shell(t >= 260 && t < 520 ? 0 : 1), { x: p.x, y: p.y - 2 });
      const hit = s.hits[0];
      if (hit) {
        const real = s.real(hit);
        if (real >= 0 && real < 630)
          for (let i = 0; i < 6; i++) {
            const angle = (i * k.tau) / 6;
            const r = 17 + k.ease(real / 630) * 25;
            stamp(
              wisp(Math.floor(real / 100) % 2),
              { x: p.x + Math.cos(angle) * r, y: p.y + Math.sin(angle) * r * 0.75 },
              real > 470 ? 0.5 : 1,
            );
          }
      }
    },
  });

  function lock(closed) {
    return image('padlock:' + closed, 23, 26, GOLD, a => {
      a.oval(closed ? 11 : 14, 9, 6, 7, 4, 3);
      if (!closed) a.box(5, 7, 4, 6, 1);
      a.box(3, 11, 17, 12, 3);
      a.box(4, 12, 15, 3, 4);
      a.box(5, 15, 3, 6, 4);
      a.oval(12, 17, 2, 2, 1);
      a.box(11, 18, 3, 3, 1);
      a.box(5, 12, 3, 2, 5);
    });
  }
  // Hold Monster: wide golden-violet bands clamp around the whole monster under a snapping padlock.
  FX.register('hold-monster', {
    palette: GOLD,
    travel: 300,
    beats: (event, kit, travel) => beats(event, travel, 'soft', 120),
    end: () => 1400,
    ground(s) {
      if (s.c.t < k.CAST) return;
      people(s).forEach(target => ring(feet(target), 13 + Math.floor((target.span || 1) * 2), 6, GOLD, 'hold-floor'));
    },
    air(s) {
      const t = s.c.t - k.CAST;
      if (t < 0) return;
      people(s).forEach(target => {
        const p = k.P(target),
          span = Math.min(2.5, target.span || 1);
        const hit = s.hits.find(h => h.id === target.id) || s.hits[0];
        impact(s, p, GOLD, 'hold', 35, hit);
        const radius = Math.round(10 + span * 3 + (t < 300 ? 13 * (1 - k.ease(t / 300)) : 0));
        const gap = 5 * span;
        for (let j = -1; j <= 1; j++) {
          const offset = t < 300 ? j * (1 - k.ease(t / 300)) * 10 : 0;
          stamp(chain(radius, 4, 0, 'hold'), { x: p.x + offset, y: p.y + j * gap });
        }
        if (t > 150 && t < 850) stamp(lock(t >= 300 ? 1 : 0), { x: p.x, y: p.y - 12 * span - 5 });
      });
    },
  });

  function natureTile(phase, calm) {
    return image('nature-tile:' + phase + ':' + calm, 24, 28, GREEN, a => {
      const sway = calm ? phase % 2 : phase - 1;
      // Interwoven, pale-edged roots and a tall hooked vine, not isolated hairlines.
      a.line(2, 22, 9, 17, 2, 4);
      a.line(9, 17, 21, 21, 3, 4);
      a.line(3, 21, 9, 16, 4, 2);
      a.line(10, 17, 20, 20, 4, 2);
      a.line(10, 19, 13 + sway, 10, 3, 4);
      a.line(13 + sway, 10, 9 + sway, 4, 3, 3);
      a.line(9 + sway, 4, 4 + sway, 6, 4, 2);
      a.line(12 + sway, 11, 11 + sway, 7, 5, 1);
      a.oval(17, 13, 4, 2, 3);
      a.line(15, 12, 19, 12, 4, 1);
      a.oval(6, 16, 3, 2, 4);
      if (!calm) a.line(18, 22, 21, 15, 4, 3);
    });
  }
  function rock() {
    return image('rock', 12, 11, EARTH, a => {
      a.line(3, 7, 5, 3, 3, 4);
      a.box(4, 4, 5, 4, 3);
      a.line(4, 3, 7, 3, 4, 2);
      a.box(3, 5, 2, 2, 5);
      a.line(5, 8, 9, 8, 2, 2);
    });
  }
  function natureGround(s, lasting) {
    const t = s.c.t - k.CAST;
    if (t < 0 || (!lasting && t >= 1050)) return;
    const area = cube(s),
      cells = Math.max(1, Math.min(24, Math.ceil(area.size / 16)));
    const alpha = lasting ? s.linger : 1;
    const growth = lasting ? 1 : k.clamp(t / 380);
    const phase = lasting ? Math.floor(s.c.raw / 900) % 2 : Math.floor(s.c.t / 90) % 3;
    // Grid-spanning bed: one cached tile per cell, all of it underneath figures.
    for (let y = 0; y < cells; y++)
      for (let x = 0; x < cells; x++) {
        const u = (x + 0.5) / cells,
          v = (y + 0.5) / cells;
        const distance = Math.max(Math.abs(u - 0.5), Math.abs(v - 0.5)) * 2;
        if (growth + 0.15 < distance) continue;
        const p = area.at(u, v);
        stamp(natureTile((phase + x + y) % (lasting ? 2 : 3), lasting ? 1 : 0), { x: p.x, y: p.y - 4 }, alpha);
        if ((x + y) % 3 === 0) stamp(rock(), { x: p.x + 4, y: p.y + 4 }, alpha);
      }
    // A continuous rooted border makes the actual cube footprint clear, even at low zoom.
    const segments = Math.max(2, Math.ceil(area.size / 12));
    const border = vertical =>
      image('root-border:' + vertical, vertical ? 9 : 17, vertical ? 17 : 9, GREEN, a => {
        if (vertical) {
          a.line(5, 2, 4, 14, 3, 3);
          a.line(4, 2, 3, 14, 4, 1);
          a.line(4, 6, 2, 9, 4, 2);
        } else {
          a.line(2, 5, 14, 4, 3, 3);
          a.line(2, 4, 14, 3, 4, 1);
          a.line(6, 4, 9, 2, 4, 2);
        }
      });
    if (growth > 0.8)
      for (let i = 0; i <= segments; i++) {
        const q = i / segments;
        const vertical = Math.abs(Math.sin(s.area?.dir || 0)) > 0.7;
        stamp(border(vertical), area.at(q, 0), alpha);
        stamp(border(vertical), area.at(q, 1), alpha);
        stamp(border(!vertical), area.at(0, q), alpha);
        stamp(border(!vertical), area.at(1, q), alpha);
      }
  }
  // Wrath Of Nature: the whole cube erupts in thick whipping vines, roots, flying rocks and leaf storm.
  FX.register('wrath-of-nature', {
    palette: GREEN,
    travel: 380,
    beats: (event, kit, travel) => beats(event, travel, 'blast', 150),
    end: () => 1670,
    ground(s) {
      natureGround(s, false);
    },
    air(s) {
      const t = s.c.t - k.CAST;
      if (t < 0) return;
      const area = cube(s),
        center = area.at(0.5, 0.5),
        hit = s.hits[0];
      if (!hit) return;
      const real = s.real(hit);
      s.hits.forEach((h, i) => {
        const target = s.targets.find(p => p.id === h.id);
        impact(s, target ? k.P(target) : center, GREEN, 'wrath', 36, h);
        if (i < 4) k.shards(target ? feet(target) : center, s.real(h), EARTH, (s.event.seed || 0) + i, 7, 23);
      });
      if (real >= 0 && real < 800) {
        const q = real / 800;
        for (let i = 0; i < 16; i++) {
          const u = 0.08 + k.hash(i, s.event.seed, 1) * 0.84,
            v = 0.08 + k.hash(i, s.event.seed, 2) * 0.84;
          const p = area.at(u, v);
          stamp(
            rock(),
            { x: p.x + (u - 0.5) * k.ease(q) * 14, y: p.y - Math.sin(q * PI) * (13 + k.hash(i, s.event.seed, 3) * 19) },
            q > 0.85 ? 0.5 : 1,
          );
        }
      }
      if (real >= 0) leaves(s, center, 24, area.size * 0.55, real, 1000);
    },
    linger(s) {
      // Let the eruption finish before handing the same footprint to its calm lasting bed.
      if (s.c.t >= k.CAST + 1050) natureGround(s, true);
    },
  });

  function memoryFrame(scene, bright) {
    return image('memory-frame:' + scene + ':' + bright, 17, 19, MEMORY, a => {
      a.box(2, 2, 13, 15, bright ? 4 : 3);
      a.box(4, 5, 9, 9, 1);
      for (let i = 0; i < 3; i++) {
        a.box(3 + i * 4, 2, 2, 2, 5);
        a.box(3 + i * 4, 15, 2, 2, 5);
      }
      if (scene === 0) {
        a.oval(8, 8, 2, 2, 4);
        a.line(6, 12, 10, 12, 3, 3);
      } else if (scene === 1) {
        a.line(5, 9, 8, 6, 4, 2);
        a.line(8, 6, 11, 9, 4, 2);
        a.box(6, 10, 5, 3, 3);
      } else {
        a.line(6, 7, 10, 11, 4, 2);
        a.line(10, 7, 6, 11, 4, 2);
        a.box(8, 6, 1, 7, 5);
      }
    });
  }
  // Modify Memory: a pink-violet perforated film strip wraps the head, exchanges scenes, then clicks shut.
  FX.register('modify-memory', {
    palette: MEMORY,
    travel: 360,
    beats: (event, kit, travel) => beats(event, travel, 'soft', 85),
    end: () => 1470,
    flash: (event, e) => (e >= 0 && e < 45 ? { color: MEMORY[4], alpha: 0.1 } : null),
    ground(s) {
      if (s.c.t < k.CAST + 200) return;
      people(s).forEach(target => ring(feet(target), 10, 4, MEMORY, 'memory', 0.75));
    },
    air(s) {
      const t = s.c.t - k.CAST;
      if (t < 0) return;
      people(s).forEach(target => {
        const p = k.P(target),
          head = { x: p.x, y: p.y - 6 };
        const hit = s.hits.find(h => h.id === target.id) || s.hits[0];
        impact(s, head, MEMORY, 'memory', 27, hit);
        if (t < 850) {
          const angle = t < 360 ? (t / 360) * 1.6 : 1.6 + Math.min(1, (t - 360) / 340) * 1.7;
          ring(head, 22, 9, MEMORY, 'film-track');
          const frames = Array.from({ length: 3 }, (_, i) => {
            const a = angle + (i * k.tau) / 3;
            return { x: head.x + Math.cos(a) * 19, y: head.y + Math.sin(a) * 7, i };
          }).sort((a, b) => a.y - b.y);
          frames.forEach(f => {
            const scene = (f.i + (t >= 360 ? 1 : 0) + (t >= 610 ? 1 : 0)) % 3;
            stamp(memoryFrame(scene, t >= 360 && t < 550 ? 1 : 0), f);
          });
        } else stamp(memoryFrame(1, 1), { x: head.x, y: head.y - 1 }, t > 1030 ? 0.5 : 1);
      });
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
