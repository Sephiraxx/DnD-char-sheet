/* Pixel spells, batch 12: bindings, blessings, illusions and small arcane workings. */
(function (root) {
  'use strict';
  const FX = root.BoardPixelFX;
  if (!FX) return;
  const k = FX.kit;
  const GOLD = ['#291b14', '#755024', '#bd8735', '#edbe54', '#fff0af', '#ffffff'];
  const ARCANE = ['#190f30', '#463279', '#8361c3', '#bda0ee', '#ece0ff', '#ffffff'];
  const VEIL = ['#101d32', '#324976', '#607cc0', '#91c9e9', '#d5f5ff', '#ffffff'];
  const CALM = ['#112a2b', '#32655e', '#59a399', '#9cd3bf', '#e0f4d6', '#ffffff'];
  const MIND = ['#291329', '#70335e', '#b66393', '#ed9ebd', '#ffe1e8', '#ffffff'];
  const HEAT = ['#291116', '#67242a', '#b53b28', '#ed722d', '#ffc770', '#fff5d5'];
  const INK = ['#12101e', '#292335', '#52425f', '#887699', '#c7b5dc', '#f8f1ff'];

  // Short sampled strokes keep long bindings and large rings inexpensive and square-edged.
  function pixel(x, y, p, color = 3, size = 1) {
    k.dot(x, y, p[0], size + 2);
    k.dot(x, y, p[color], size);
  }
  function stroke(a, b, p, color = 3, size = 1) {
    const n = Math.max(1, Math.min(30, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y))));
    for (const [c, w] of [
      [p[0], size + 2],
      [p[color], size],
    ]) {
      for (let i = 0; i <= n; i++) k.dot(k.mix(a.x, b.x, i / n), k.mix(a.y, b.y, i / n), c, w);
    }
  }
  function ring(at, rx, ry, p, color = 3, gap = 0, spin = 0) {
    const n = Math.max(16, Math.min(64, Math.ceil(k.tau * Math.max(rx, ry))));
    for (const [c, w] of [
      [p[0], 3],
      [p[color], 1],
    ]) {
      for (let i = 0; i < n; i++) {
        if (gap && Math.floor((i / n) * gap * 2 + spin) % 2) continue;
        const a = (i / n) * k.tau;
        k.dot(at.x + Math.cos(a) * rx, at.y + Math.sin(a) * ry, c, w);
      }
    }
  }
  const art = {
    mouth: [
      '....2222222....',
      '..22333333322..',
      '.2334444444332.',
      '234111111111432',
      '.2331555551332.',
      '..22333333322..',
      '....2222222....',
    ],
    lock: [
      '....33333....',
      '...3444443...',
      '..34.....43..',
      '..34.....43..',
      '..34.....43..',
      '.22222222222.',
      '.23333333332.',
      '.23444444432.',
      '.23441544432.',
      '.23341143332.',
      '.22222222222.',
    ],
    book: [
      '.22222.22222.',
      '2344442444432',
      '2343342433432',
      '2344442444432',
      '2343342433432',
      '2344442444432',
      '2343342433432',
      '2344442444432',
      '2344442444432',
      '.22222522222.',
    ],
    mask: [
      '.33333333333.',
      '2344444444432',
      '2341144411432',
      '2341144411432',
      '.23444444432.',
      '..234414432..',
      '...2344432...',
      '....23332....',
    ],
    eye: [
      '....33333....',
      '..334444433..',
      '.34441114443.',
      '3444115114443',
      '.34441114443.',
      '..334444433..',
      '....33333....',
    ],
    ear: [
      '...33333...',
      '..3444443..',
      '.344111443.',
      '.341334143.',
      '.341343143.',
      '..11343143.',
      '....34143..',
      '...34143...',
      '...3443....',
      '....33.....',
    ],
    heart: ['.333.333.', '344434443', '344444443', '.3444443.', '..34443..', '...343...', '....3....'],
    sword: [
      '.....5.....',
      '....454....',
      '....454....',
      '....454....',
      '....454....',
      '....454....',
      '....454....',
      '....454....',
      '..3333333..',
      '....232....',
      '....232....',
      '....333....',
    ],
    bone: ['.44.....44.', '45544444554', '.444444444.', '45544444554', '.44.....44.'],
    sun: [
      '....4....',
      '.4..4..4.',
      '..33333..',
      '..34443..',
      '443454344',
      '..34443..',
      '..33333..',
      '.4..4..4.',
      '....4....',
    ],
    moon: ['...333...', '..344....', '.344.....', '.34......', '.34......', '.344.....', '..344....', '...333...'],
  };
  function image(name, p) {
    const rows = art[name];
    return k.sprite('b12:' + name + ':' + p.join(''), rows[0].length + 2, rows.length + 2, p, set => {
      rows.forEach((row, y) =>
        [...row].forEach((ch, x) => {
          if (ch !== '.') set(x + 1, y + 1, Number(ch));
        }),
      );
    });
  }
  function icon(name, at, p, angle) {
    const img = image(name, p);
    if (angle == null) k.blit(img, at.x - img.width / 2, at.y - img.height / 2);
    else k.blitRotated(img, at.x, at.y, angle);
  }
  function soft(event, kit, travel) {
    return (event.targets?.length ? event.targets : [null]).map(target => ({
      at: kit.CAST + travel,
      stop: 65,
      target,
      kind: 'soft',
      power: 0.03,
    }));
  }
  function single(event, kit, travel) {
    return [{ at: kit.CAST + travel, stop: 80, target: event.targets?.[0] ?? null, kind: 'soft', power: 0.03 }];
  }
  function subjects(s) {
    if (s.targets.length) return s.targets;
    if (s.pose.target) return [s.pose.target];
    const b = s.pose.base || s.pose.hand;
    return b ? [{ ...b, baseX: b.x, baseY: b.y, y: b.y - 0.6 }] : [];
  }
  function anchor(s) {
    return s.pose.target || s.targets[0] || s.pose.hand || s.pose.base;
  }
  function body(t) {
    return k.P(t);
  }
  function feet(t) {
    return k.P({ x: t.baseX ?? t.x, y: t.baseY ?? t.y + 0.6 });
  }
  function beat(s, i = 0) {
    return s.hits[i] || s.hits[0];
  }
  function spark(s, h, at, p, size = 22, count = 5) {
    const e = s.real(h);
    k.drawHit(k.hitStyle('b12:' + s.event.id, p, { S: size, spikes: 4, minor: 2, jag: 0.18 }), at, e);
    k.shards(at, e, p, (s.event.seed || 0) + (h.id == null ? 0 : h.at), count, size * 0.65);
  }
  function packet(s, dest, p, arc = 0) {
    if (!s.pose.hand || s.c.t < k.CAST || s.c.t >= beat(s).at) return;
    const H = k.P(s.pose.hand),
      T = k.P(dest),
      q = (s.c.t - k.CAST) / (beat(s).at - k.CAST);
    for (let i = 4; i >= 0; i--) {
      const u = q - i * 0.06;
      if (u < 0) continue;
      pixel(k.mix(H.x, T.x, u), k.mix(H.y, T.y, u) - Math.sin(u * Math.PI) * arc, p, i ? 3 : 5, i ? 1 : 3);
    }
  }
  function blessingGround(s, p) {
    subjects(s).forEach((t, i) => {
      const e = s.c.t - beat(s, i).at;
      if (e < 0 || e > 650) return;
      ring(feet(t), 10 + k.ease(k.clamp(e / 210)) * 4, 5, p, 3, e > 440 ? 6 : 0);
    });
  }

  // Augury: engraved ivory casting bones tumble into a reading, revealing paired sun and shadow omens.
  FX.register('augury', {
    palette: GOLD,
    travel: 360,
    beats: single,
    end: () => 1420,
    ground(s) {
      if (s.c.t < k.CAST || s.c.t > 1310 || !anchor(s)) return;
      const C = k.P(anchor(s)),
        e = s.c.t - k.CAST;
      ring(C, 19, 11, GOLD, 2, 8, 0);
      for (let i = 0; i < 4; i++) {
        const a = (i * k.tau) / 4 + (s.event.seed || 0) * 0.1;
        const q = k.ease(k.clamp(e / 360));
        const T = { x: C.x + Math.cos(a) * (6 + q * 6), y: C.y + Math.sin(a) * 6 - (1 - q) * 10 };
        icon('bone', T, GOLD, i * 0.8 + (1 - q) * 5);
      }
    },
    air(s) {
      if (!anchor(s)) return;
      const C = k.P(anchor(s)),
        e = s.c.t - beat(s).at;
      spark(s, beat(s), C, GOLD, 20, 4);
      if (e < 0 || e > 650) return;
      const y = C.y - 18 - Math.min(5, e / 65);
      icon('sun', { x: C.x - 10, y }, GOLD);
      icon('moon', { x: C.x + 10, y }, INK);
      if (e > 490) pixel(C.x, C.y - 5, GOLD, 5, 2);
    },
  });

  // Aid: warm golden motes fan to allies; upright shields rise with bright hearts and a firm blessing ring.
  FX.register('aid', {
    palette: GOLD,
    travel: 260,
    beats: soft,
    end: () => 1260,
    ground(s) {
      blessingGround(s, GOLD);
    },
    air(s) {
      subjects(s).forEach((t, i) => {
        packet(s, t, GOLD, 9 + i * 2);
        const C = body(t),
          e = s.c.t - beat(s, i).at;
        spark(s, beat(s, i), C, GOLD, 24, 5);
        if (e < 0 || e > 610) return;
        const q = k.ease(k.clamp(e / 180)),
          A = { x: C.x, y: C.y - 8 - q * 5 };
        const img = k.sprite('b12:aid-shield', 21, 25, GOLD, set => {
          for (let y = 2; y < 23; y++)
            for (let x = 2; x < 19; x++) {
              const half = y < 15 ? 8 : 8 - (y - 15);
              if (Math.abs(x - 10) <= half) set(x, y, Math.abs(x - 10) > half - 2 || y < 4 ? 4 : 1);
            }
        });
        k.blit(img, A.x - 10, A.y - 12);
        icon('heart', { x: A.x, y: A.y - 2 }, GOLD);
        if (e < 400) for (let j = 0; j < 3; j++) pixel(A.x + (j - 1) * 8, A.y - 16, GOLD, 5);
      });
    },
  });

  // Magic Mouth: rose-coloured lips appear on the chosen object, open around ivory teeth and speak square sound arcs.
  FX.register('magic-mouth', {
    palette: MIND,
    travel: 180,
    beats: single,
    end: () => 1370,
    air(s) {
      if (!anchor(s)) return;
      const C = k.P(anchor(s)),
        e = s.c.t - beat(s).at;
      packet(s, anchor(s), MIND, 3);
      spark(s, beat(s), C, MIND, 18, 4);
      if (e < 0 || e > 760) return;
      const speaking = Math.floor(e / 100) % 3 !== 2;
      icon('mouth', C, MIND);
      if (!speaking) stroke({ x: C.x - 5, y: C.y }, { x: C.x + 5, y: C.y }, MIND, 2);
      if (e > 80 && e < 640)
        for (let j = 0; j < 3; j++) {
          const r = 9 + ((e - 80 + j * 130) % 390) / 25;
          for (const side of [-1, 1]) {
            stroke({ x: C.x + side * r, y: C.y - 4 }, { x: C.x + side * (r + 2), y: C.y }, MIND, 4);
            stroke({ x: C.x + side * (r + 2), y: C.y }, { x: C.x + side * r, y: C.y + 4 }, MIND, 3);
          }
        }
    },
  });

  // Branding Smite: a radiant weapon slash lands in a white-gold star, leaving an unmistakable luminous brand.
  FX.register('branding-smite', {
    palette: GOLD,
    travel: 150,
    beats: (event, kit, travel) => [
      { at: kit.CAST + travel, stop: 125, target: event.targets?.[0] ?? null, kind: 'hit', power: 0.085 },
    ],
    end: () => 1210,
    flash: (event, e) =>
      e >= 0 && e < 30 ? { color: GOLD[4], alpha: 0.18 } : e < 65 && e >= 30 ? { color: GOLD[0], alpha: 0.1 } : null,
    air(s) {
      const t = subjects(s)[0];
      if (!t || s.c.t < k.CAST) return;
      const C = k.P(k.contact(t, s.pose.hand || t)),
        e = s.c.t - beat(s).at;
      if (e < 0) {
        const q = (s.c.t - k.CAST) / 150;
        icon('sword', { x: C.x - 12 + q * 22, y: C.y - 12 + q * 20 }, GOLD, -0.8);
      }
      spark(s, beat(s), C, GOLD, 44, 10);
      const real = s.real(beat(s));
      if (real >= 0 && real < 170)
        stroke({ x: C.x - 11, y: C.y - 13 }, { x: C.x + 11, y: C.y + 13 }, GOLD, real < 45 ? 5 : 3, 2);
      if (e >= 90 && e < 660) {
        ring(C, 6, 6, GOLD, 4);
        stroke({ x: C.x, y: C.y - 9 }, { x: C.x, y: C.y + 9 }, GOLD, 5);
        stroke({ x: C.x - 8, y: C.y }, { x: C.x + 8, y: C.y }, GOLD, 4);
      }
    },
  });

  // Arcane Lock: violet jamb runes clamp inward; a gold padlock clicks shut and the final key-spark vanishes.
  FX.register('arcane-lock', {
    palette: ARCANE,
    travel: 290,
    beats: single,
    end: () => 1280,
    air(s) {
      if (!anchor(s) || s.c.t < k.CAST) return;
      const C = k.P(anchor(s)),
        e = s.c.t - beat(s).at,
        t = s.c.t - k.CAST;
      if (e > 600) return;
      const w = 8 + 7 * (1 - k.ease(k.clamp(t / 290)));
      for (const side of [-1, 1]) {
        stroke({ x: C.x + side * w, y: C.y - 14 }, { x: C.x + side * w, y: C.y + 13 }, ARCANE, 3, 2);
        for (let j = 0; j < 3; j++) pixel(C.x + side * (w + 3), C.y - 9 + j * 9, ARCANE, j % 2 ? 4 : 3, 2);
      }
      icon('lock', C, e < 0 ? ARCANE : GOLD);
      spark(s, beat(s), C, GOLD, 28, 7);
      if (e >= 0 && e < 260) {
        const x = C.x + 8 * (1 - k.ease(k.clamp(e / 160)));
        pixel(x, C.y + 1, GOLD, 5, 2);
      }
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
