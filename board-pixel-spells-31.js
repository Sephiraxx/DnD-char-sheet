/* Pixel spells, batch 31 (see docs/pixel-spells/BRIEF.md). */
(function (root) {
  'use strict';
  const FX = root.BoardPixelFX;
  if (!FX) return;
  const k = FX.kit;
  const C = k.CAST;
  const FEY = ['#151329', '#30334b', '#348861', '#80d887', '#dfefae', '#fffde7'];
  const ROSE = ['#271027', '#60224e', '#b54c91', '#f18acb', '#ffd6ec', '#fff5fc'];
  const GOLD = ['#291c16', '#684528', '#af7c38', '#e9ba61', '#fff0b2', '#fffdf0'];
  const CLAY = ['#261721', '#61323b', '#a55d59', '#d89679', '#f3c6a0', '#fff0d5'];
  const BLOOD = ['#260f20', '#5c152f', '#a62e49', '#e66373', '#ffb9b5', '#fff1dc'];
  const GRAVE = ['#10151c', '#273039', '#455a54', '#81a77c', '#d0dbab', '#f6f5db'];
  const DEATH = ['#160d21', '#35233f', '#64416c', '#aa70aa', '#dfbbd5', '#fdf0e6'];
  const STONE = ['#1b1c28', '#3b3e50', '#656b7c', '#9da5ae', '#d7d9ce', '#fbf8e8'];
  const GREEN = ['#102218', '#24502d', '#46974b', '#9ae95c', '#defba4', '#f8ffe9'];
  const ARCANE = ['#161531', '#393262', '#6c62a0', '#a9a0df', '#e4dfff', '#fff8ff'];
  const PLATINUM = ['#192234', '#3d5367', '#8197a5', '#c7dde0', '#f0f9e9', '#ffffff'];
  const ICE = ['#101f35', '#294d75', '#528fbb', '#9dd9ed', '#dff9fa', '#ffffff'];
  const FIRE = ['#291315', '#772a26', '#c55429', '#f19338', '#ffdc8b', '#fff5d1'];
  const ACID = ['#1c2511', '#455c22', '#7e9e31', '#bdd85c', '#edf5b8', '#ffffec'];
  const BOLT = ['#171b39', '#334775', '#6189c6', '#a5d7f7', '#e6f7ff', '#ffffff'];
  const THUNDER = ['#1d1d30', '#454461', '#7d7f9e', '#bcbfdb', '#ebebf8', '#ffffff'];
  const ids = e => (e.targets?.length ? [...new Set(e.targets)] : [null]);
  const beat = (at, stop, target = null, kind = 'soft', power = 0.04) => ({ at, stop, target, kind, power });
  const seed = s => s.event.seed || 0;
  const live = (s, end) => s.c.t >= C && s.c.t < end;
  const add = (p, x, y) => ({ x: p.x + x, y: p.y + y });
  function target(s, h) {
    return s.targets.find(t => t.id === h?.id) || s.targets[0] || s.pose.target || s.pose.base || s.pose.hand;
  }
  function centre(s) {
    return k.P(s.area || s.pose.target || target(s));
  }
  function feet(p) {
    return k.P({ x: p.baseX ?? p.x, y: p.baseY ?? p.y });
  }
  function pixel(p, ramp, index = 4, size = 1) {
    k.dot(p.x, p.y, ramp[0], size + 2);
    k.dot(p.x, p.y, ramp[index], size);
  }
  function orb(p, r, ramp, index = 3) {
    k.disc(p.x, p.y, r + 1, ramp[0]);
    k.disc(p.x, p.y, r, ramp[index]);
    if (r >= 3) k.disc(p.x - 1, p.y - 1, r * 0.4, ramp[4]);
  }
  function icon(key, ramp, rows) {
    return k.sprite(`b31:${key}:${ramp[1]}`, rows[0].length + 2, rows.length + 2, ramp, set => {
      rows.forEach((row, y) =>
        [...row].forEach((v, x) => {
          if (v !== '.') set(x + 1, y + 1, Number(v));
        }),
      );
    });
  }
  function stamp(img, p) {
    k.blit(img, p.x - img.width / 2, p.y - img.height / 2);
  }
  // Cached pixel rings keep even a sixty-foot blast well below the per-frame drawing budget.
  function ring(p, rx, ry, ramp, index = 3, gap = 0, phase = 0) {
    rx = Math.max(2, Math.round(rx));
    ry = Math.max(2, Math.round(ry));
    const f = Math.floor(phase) % 8;
    const img = k.sprite(`b31:ring:${rx}:${ry}:${ramp[1]}:${index}:${gap}:${f}`, rx * 2 + 5, ry * 2 + 5, ramp, set => {
      for (let y = -ry; y <= ry; y++)
        for (let x = -rx; x <= rx; x++) {
          const d = Math.hypot(x / rx, y / ry);
          if (Math.abs(d - 1) * Math.min(rx, ry) > 0.6) continue;
          if (gap && Math.floor(((Math.atan2(y, x) + Math.PI) / k.tau) * gap * 2 + f / 2) % 2) continue;
          set(x + rx + 2, y + ry + 2, index);
        }
    });
    stamp(img, p);
  }
  function stroke(a, b, ramp, width = 1, index = 3) {
    const dx = Math.round(b.x - a.x),
      dy = Math.round(b.y - a.y);
    const pad = width + 2,
      ox = pad - Math.min(0, dx),
      oy = pad - Math.min(0, dy);
    const img = k.sprite(
      `b31:stroke:${dx}:${dy}:${ramp[1]}:${width}:${index}`,
      Math.abs(dx) + pad * 2 + 1,
      Math.abs(dy) + pad * 2 + 1,
      ramp,
      set => {
        const n = Math.max(1, Math.ceil(Math.hypot(dx, dy)));
        for (let i = 0; i <= n; i++)
          for (let y = 0; y < width; y++)
            for (let x = 0; x < width; x++)
              set(
                Math.round(ox + (dx * i) / n + x - (width - 1) / 2),
                Math.round(oy + (dy * i) / n + y - (width - 1) / 2),
                index,
              );
      },
    );
    k.blit(img, a.x - ox, a.y - oy);
  }
  function impact(s, h, p, ramp, key, size = 28, n = 7) {
    const e = s.real(h);
    k.drawHit(k.hitStyle(`b31:${key}`, ramp, { S: size, spikes: 5, minor: 3, jag: 0.3 }), p, e);
    k.shards(p, e, ramp, seed(s) + h.at, n, size * 0.65);
  }
  function ray(a, b, broken) {
    const dx = Math.round(b.x - a.x),
      dy = Math.round(b.y - a.y);
    const ox = 4 - Math.min(0, dx),
      oy = 4 - Math.min(0, dy);
    const img = k.sprite(
      `b31:green-ray:${dx}:${dy}:${broken ? 1 : 0}`,
      Math.abs(dx) + 9,
      Math.abs(dy) + 9,
      GREEN,
      set => {
        const n = Math.max(1, Math.ceil(Math.hypot(dx, dy)));
        for (const [index, size] of [
          [3, 3],
          [5, 1],
        ])
          for (let i = 0; i <= n; i++) {
            if (broken && Math.floor(i / 6) % 3 === 0) continue;
            for (let y = 0; y < size; y++)
              for (let x = 0; x < size; x++)
                set(
                  Math.round(ox + (dx * i) / n + x - (size - 1) / 2),
                  Math.round(oy + (dy * i) / n + y - (size - 1) / 2),
                  index,
                );
          }
      },
    );
    k.blit(img, a.x - ox, a.y - oy);
  }
  function pulse(s, h, p, ramp, r = 22) {
    const e = s.real(h);
    if (e < 0 || e >= 440) return;
    const q = k.ease(e / 440);
    ring(p, 4 + q * r, 2 + q * r * 0.5, ramp, e < 70 ? 5 : 3, e > 260 ? 8 : 0);
  }
  function motes(s, p, ramp, e, n = 10, r = 22, rise = 18) {
    if (e < 0 || e >= 640) return;
    const q = e / 640;
    for (let i = 0; i < n; i++) {
      if (q > 0.75 && i % 2) continue;
      const a = k.hash(i, seed(s), 31) * k.tau;
      pixel(add(p, Math.cos(a) * (3 + k.ease(q) * r), Math.sin(a) * r * 0.5 - q * rise), ramp, i % 2 ? 3 : 4);
    }
  }
  function sigil(p, ramp, t, r = 18) {
    ring(p, r, r * 0.5, ramp, 3, 6, t / 90);
    ring(p, r * 0.7, r * 0.35, ramp, 2);
    for (let i = 0; i < 5; i++) {
      const a = (i * k.tau) / 5 - Math.PI / 2;
      pixel(add(p, Math.cos(a) * r, Math.sin(a) * r * 0.5), ramp, 4, 2);
    }
  }
  function person(p, ramp, frame = 0) {
    const rows = [
      '...333...',
      '..34443..',
      '..34343..',
      '...333...',
      '..23332..',
      '.2333332.',
      '23.333.32',
      '2..333..2',
      '...333...',
      '..32.23..',
      '..3...3..',
      '.33...33.',
    ];
    stamp(icon(`person:${frame}`, ramp, rows), p);
  }
  const shieldRows = [
    '.444444444.',
    '43333333334',
    '43233333234',
    '43223332234',
    '.432333234.',
    '.433333334.',
    '..4333334..',
    '...43334...',
    '....434....',
    '.....4.....',
  ];
  const skullRows = ['..44444..', '.4333334.', '434343434', '433333334', '.4434344.', '..43434..', '..3.3.3..'];
  const flash = (event, e) =>
    e < 30 ? { color: '#eef8ed', alpha: 0.19 } : e < 70 ? { color: '#161225', alpha: 0.15 } : null;

  function scatterPair(s, h, i) {
    const from = s.event.teleport?.from || target(s, h);
    let aim = s.event.teleport?.to || s.pose.target || s.area || s.pose.base || from;
    if (!s.event.teleport?.to && Math.hypot(aim.x - from.x, aim.y - from.y) < 0.5)
      aim = s.pose.base || { x: from.x + 1.25, y: from.y };
    const count = s.hits.length / 2;
    // Explicit from/to is the board's teleport contract; otherwise distribute arrivals around the aimed point.
    const a = (i / Math.max(1, count)) * k.tau + seed(s);
    return { from: k.P(from), to: add(k.P(aim), count > 1 ? Math.cos(a) * 14 : 0, count > 1 ? Math.sin(a) * 10 : 0) };
  }

  // Find the Path: a golden compass spins into alignment and a clear chain of forward arrows reveals the route.
  FX.register('find-the-path', {
    palette: GOLD,
    travel: 260,
    beats: () => [beat(C + 260, 70)],
    end: () => 1550,
    ground(s) {
      if (!live(s, 1550)) return;
      const from = feet(s.pose.base || target(s)),
        to = centre(s),
        t = s.c.t - C;
      const angle = Math.atan2(to.y - from.y, to.x - from.x);
      const arrow = icon('path-arrow', GOLD, ['...4...', '...44..', '344444.', '...44..', '...4...']);
      const n = Math.max(3, Math.min(20, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / 12)));
      for (let i = 1; i <= n; i++) {
        if (t < (i / n) * 260 || (t > 980 && i < ((t - 980) / 220) * n)) continue;
        const q = i / n;
        k.blitRotated(arrow, k.mix(from.x, to.x, q), k.mix(from.y, to.y, q), angle);
      }
      if (t >= 260 && t < 1130) ring(to, 12, 6, GOLD, 4, 4);
      pulse(s, s.hits[0], from, GOLD, 16);
    },
    air(s) {
      if (!live(s, 1550)) return;
      const p = add(feet(s.pose.base || target(s)), 0, -14),
        t = s.c.t - C;
      if (t < 1010) {
        ring(p, 11, 11, GOLD, 3);
        const needle = icon('compass-needle', GOLD, [
          '...5...',
          '..454..',
          '.44544.',
          '4445444',
          '.22322.',
          '..232..',
          '...2...',
        ]);
        const goal = centre(s),
          origin = feet(s.pose.base || target(s));
        const a = Math.atan2(goal.y - origin.y, goal.x - origin.x) + Math.PI / 2;
        k.blitRotated(needle, p.x, p.y, t < 260 ? a + (1 - t / 260) * k.tau : a);
      }
      impact(s, s.hits[0], p, GOLD, 'path', 22, 5);
    },
  });

  function iceRadius(s) {
    return Math.max(8, Math.round(((s.area?.feet ?? 60) / (s.grid.feet || 5)) * 16));
  }
  function frozenBlast(s) {
    if (!live(s, 1770)) return;
    const h = s.hits[0],
      e = s.real(h);
    if (e < 0 || e >= 1160) return;
    const p = centre(s),
      r = iceRadius(s);
    const f = Math.min(10, Math.floor(e / 95)),
      size = r * 2 + 7;
    const img = k.sprite(`b31:freezing-sphere:${r}:${f}`, size, size, ICE, set => {
      const grow = f < 3 ? 0.25 + f * 0.375 : 1;
      for (let y = 2; y < size - 2; y++)
        for (let x = 2; x < size - 2; x++) {
          const dx = x - r - 3,
            dy = y - r - 3,
            d = Math.hypot(dx, dy) / r;
          if (d > grow) continue;
          const a = Math.atan2(dy, dx),
            spoke = Math.abs(Math.sin(a * 6));
          if (f < 2) set(x, y, d < grow * 0.7 ? (f ? 1 : 5) : 4);
          else if (f < 6) {
            const band = Math.floor((d / grow) * 6);
            set(x, y, d > grow - 0.035 ? 4 : spoke < 0.035 && d > 0.15 ? 4 : Math.max(1, 4 - Math.floor(band / 2)));
          } else if (f < 9 && d > 0.9 && Math.floor(a * 15) % 3 !== 0) set(x, y, 3);
          else if (spoke < 0.018 && d > 0.25 && d < 0.95 && Math.floor(d * 24 + f) % 3) set(x, y, f < 9 ? 3 : 2);
        }
    });
    stamp(img, p);
  }
})(typeof window !== 'undefined' ? window : globalThis);
