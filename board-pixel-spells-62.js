/* Pixel spells, batch 62: second pass for 11 readability-rebuilt spells (see docs/pixel-spells/BRIEF.md). */
(function (root) {
  'use strict';
  const FX = root.BoardPixelFX;
  if (!FX) return;
  const k = FX.kit;

  const HEAL = k.palettes.heal;
  const RADIANT = k.palettes.radiante;
  const FORCE = k.palettes.FORCE;
  const FROST = k.palettes.frost;
  const CURSE_CHAIN = ['#18082b', '#6a2fb8', '#a86bff', '#dfa8ff', '#f7e6ff', '#ffffff'];
  const DARK_SPECK = ['#0c0612', '#2f153b', '#5d2f7a', '#8c54ad'];
  const DARKVISION_PAL = ['#091c0d', '#1c6b2c', '#3ec954', '#98ff7a', '#e6ffd6', '#ffffff'];
  const NECRO_RIM = ['#08140b', '#1b4724', '#39a34c', '#8af776', '#e0ffd6', '#ffffff'];
  const BONE = ['#141018', '#5e5866', '#9e97a3', '#dcd6ce', '#f7f3e8', '#ffffff'];
  const POT_PAL = ['#24120c', '#8a4a2b', '#c97b4b', '#f2b880', '#ffebd1', '#ffffff', '#ffd76a', '#fff6cf'];
  const CLOCK_PAL = ['#241504', '#8f5b10', '#e5a424', '#ffdc6b', '#fff6cc', '#ffffff'];
  const MASK_PAL = ['#180d29', '#5a3a9c', '#9874e6', '#d4c2ff', '#f5f0ff', '#ffffff'];
  const PREST_COLORS = [
    ['#2a1a06', '#ffd76a', '#fff6cf'],
    ['#1c0618', '#ff88ce', '#ffe2f7'],
    ['#0b1a2e', '#8fd4ff', '#e3f8ff'],
    ['#0b1f14', '#a6f3a9', '#f6ffd6'],
  ];

  // ---------------------------------------------------------------- shared helpers
  function anchorOf(pt) {
    return { x: pt.baseX ?? pt.x, y: pt.baseY ?? pt.y };
  }
  function firstTarget(s) {
    return s.targets[0] || s.pose.target || s.pose.base || s.pose.hand || null;
  }
  function casterBase(s) {
    if (s.pose.base) return { x: s.pose.base.x, y: s.pose.base.y };
    if (s.pose.hand) return anchorOf(s.pose.hand);
    return firstTarget(s) ? anchorOf(firstTarget(s)) : null;
  }
  function drawLine(x0, y0, x1, y1, color, size) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy)));
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      k.dot(x0 + dx * u, y0 + dy * u, color, size);
    }
  }
  function drawStarGlint(x, y, r, outline, color) {
    for (let i = -r; i <= r; i++) {
      k.dot(x + i, y, outline, 3);
      k.dot(x, y + i, outline, 3);
    }
    for (let i = -r; i <= r; i++) {
      k.dot(x + i, y, Math.abs(i) < 2 ? k.WHITE : color, 1);
      k.dot(x, y + i, Math.abs(i) < 2 ? k.WHITE : color, 1);
    }
  }

  // Big outlined plus (18x18 px, whole square) used by healing spells.
  function bigPlusSprite(key, pal) {
    return k.sprite(key, 18, 18, pal, set => {
      for (let y = 1; y < 17; y++) {
        for (let x = 1; x < 17; x++) {
          const inV = x >= 6 && x <= 11;
          const inH = y >= 6 && y <= 11;
          if (!inV && !inH) continue;
          const core = (x >= 8 && x <= 9 && y >= 3 && y <= 14) || (y >= 8 && y <= 9 && x >= 3 && x <= 14);
          const inner = (x >= 7 && x <= 10 && y >= 2 && y <= 15) || (y >= 7 && y <= 10 && x >= 2 && x <= 15);
          set(x, y, core ? 5 : inner ? 4 : 3);
        }
      }
    });
  }

  // Full-size spectral beast/wisp spirit (20x22 px, 2 gentle animation frames).
  function healingSpiritSprite(frame) {
    return k.sprite(`b62:hspirit:${frame}`, 20, 22, HEAL, set => {
      const sway = frame ? 1 : -1;
      // Glowing curved spirit antlers/ears
      const antlers = [
        [6, 1],
        [5, 2],
        [6, 3],
        [7, 4],
        [4, 3],
        [5, 4],
        [13, 1],
        [14, 2],
        [13, 3],
        [12, 4],
        [15, 3],
        [14, 4],
      ];
      for (const [ax, ay] of antlers) set(ax, ay, ay <= 2 ? 5 : 4);
      // Spectral head and torso (rounded luminous wisp-fox silhouette)
      for (let y = 4; y <= 16; y++) {
        for (let x = 3; x <= 16; x++) {
          const dHead = Math.hypot((x - 9.5) / 4.2, (y - 7.2) / 3.4);
          const dBody = Math.hypot((x - 9.5 - (y > 11 ? sway * 0.4 : 0)) / 5.2, (y - 12.2) / 4.8);
          if (dHead < 1 || dBody < 1) {
            const dCore = Math.min(dHead, dBody);
            const col = dCore < 0.48 ? 5 : dCore < 0.78 ? 4 : 3;
            set(x, y, col);
          }
        }
      }
      // Tapered ethereal tail curling at the base
      for (let y = 15; y <= 20; y++) {
        const u = (y - 15) / 5;
        const cx = 9.5 + Math.sin(u * 2.4 + sway * 0.8) * 2.2;
        const hw = Math.max(0.6, 3.2 * (1 - u * 0.78));
        for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
          set(x, y, u < 0.4 ? 4 : u < 0.75 ? 3 : 2);
        }
      }
      // Crisp dark-outlined glowing eyes
      set(7, 7, 0);
      set(8, 7, 0);
      set(11, 7, 0);
      set(12, 7, 0);
      set(7, 6, 5);
      set(12, 6, 5);
      // Chest spirit sigil spark
      set(9, 11, 5);
      set(10, 11, 5);
      set(9, 12, 5);
      set(10, 12, 5);
    });
  }

  function drawHealingSpiritLinger(s, center, alpha, riseOffset) {
    const C = k.P(center);
    const bob = Math.sin(s.c.raw / 360) * 2.2;
    const frame = Math.floor(s.c.raw / 260) % 2;
    const spr = healingSpiritSprite(frame);
    const sy = C.y - 19 + bob + riseOffset;
    // Soft halo sparkles orbiting the spirit
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * k.tau + s.c.raw / 700;
      const mx = C.x + Math.cos(a) * 11;
      const my = sy + 9 + Math.sin(a) * 5;
      if (alpha < 0.5 && i % 2) continue;
      k.dot(mx, my, HEAL[0], 3);
      k.dot(mx, my, i % 2 ? HEAL[5] : HEAL[4], 1);
    }
    k.blit(spr, C.x - spr.width / 2, sy, alpha);
  }

  function spiritSpot(s) {
    if (s.area) return { x: s.area.x, y: s.area.y };
    const tgt = s.targets[0];
    if (s.pose.target && (!tgt || Math.hypot(s.pose.target.x - tgt.x, s.pose.target.y - tgt.y) > 0.3)) {
      return { x: s.pose.target.x, y: s.pose.target.y };
    }
    if (tgt) {
      const a = anchorOf(tgt);
      return { x: a.x - 0.65, y: a.y - 0.1 };
    }
    return casterBase(s);
  }

  // Healing Spirit: a full-square luminous green-white spectral spirit rises and hovers, showering heal motes and a big plus onto a creature.
  FX.register('healing-spirit', {
    palette: HEAL,
    travel: 140,
    beats: (event, kit, travel) => [
      { at: kit.CAST + travel, stop: 60, target: event.targets?.[0] ?? null, kind: 'soft', power: 0 },
    ],
    end: (event, travel) => k.CAST + travel + 780,
    ground(s) {
      const spot = spiritSpot(s);
      if (!spot) return;
      const e = s.c.t - k.CAST;
      if (e < 0) return;
      const C = k.P(spot);
      const grow = k.ease(k.clamp(e / 160));
      const fade = e > 720 ? 1 - k.clamp((e - 720) / 200) : 1;
      if (fade > 0 && !(s.pose.linger > 0 && e >= 140)) {
        const r = 11 * grow;
        k.ellipse(C.x, C.y + 1, r, r * 0.52, HEAL[0], 3);
        k.ellipse(C.x, C.y, r, r * 0.52, HEAL[4], 2);
      }
      // Bright healing ring under the creature receiving the heal
      const tgt = firstTarget(s);
      if (tgt && e >= 130) {
        const he = e - 130;
        const life = 1 - k.clamp((he - 480) / 260);
        if (life > 0) {
          const T = k.P(anchorOf(tgt));
          const r = 10 + k.ease(k.clamp(he / 160)) * 3;
          k.ellipse(T.x, T.y + 1, r, r * 0.52, HEAL[0], 3, life < 0.5 ? 6 : 0);
          k.ellipse(T.x, T.y, r, r * 0.52, he < 180 ? k.WHITE : HEAL[4], 2, life < 0.5 ? 6 : 0);
        }
      }
    },
    air(s) {
      const spot = spiritSpot(s);
      const tgt = firstTarget(s);
      if (!spot) return;
      const e = s.c.t - k.CAST;
      if (e < 0) return;
      const C = k.P(spot);
      const hit = s.hits[0];
      const real = hit ? s.real(hit) : e - 140;
      if (real >= 0 && real < 360) {
        k.drawHit(
          k.hitStyle('b62-hspirit', HEAL, { S: 34, spikes: 6, minor: 4, jag: 0.12 }),
          { x: C.x, y: C.y - 10 },
          real,
        );
      }
      // Rising phase before linger kicks in (or full spirit if non-lasting)
      if (e < 140) {
        const u = k.ease(e / 140);
        drawHealingSpiritLinger(s, spot, 1, (1 - u) * 14);
      } else if (!(s.pose.linger > 0)) {
        const fade = e > 680 ? 1 - k.clamp((e - 680) / 240) : 1;
        if (fade > 0) drawHealingSpiritLinger(s, spot, fade, 0);
      }
      // Heal motes and big outlined plus falling onto the target creature
      if (tgt && e >= 120) {
        const he = e - 120;
        const T = k.P(anchorOf(tgt));
        for (let i = 0; i < 10; i++) {
          const delay = (i % 5) * 35;
          const u = (he - delay) / 480;
          if (u < 0 || u > 1) continue;
          const ox = (k.hash(i, s.event.seed, 2) - 0.5) * 18;
          const px = k.mix(C.x, T.x + ox, k.ease(k.clamp(u * 1.4)));
          const py = k.mix(C.y - 18, T.y - 2, u) - Math.sin(u * Math.PI) * 10;
          k.dot(px, py, HEAL[0], 4);
          k.dot(px, py, i % 2 ? k.WHITE : HEAL[4], 2);
        }
        // Big 18x18 outlined plus popping and holding over the creature
        if (he >= 20 && he < 700) {
          const plus = bigPlusSprite('b62:plus:heal', HEAL);
          const pop = he < 120 ? (1 - k.back(he / 120)) * 8 : 0;
          const drift = he > 440 ? -((he - 440) / 260) * 6 : 0;
          const alpha = he > 480 ? 1 - k.clamp((he - 480) / 220) : 1;
          k.blit(plus, T.x - plus.width / 2, T.y - 28 + pop + drift, alpha);
        }
      }
    },
    linger(s) {
      const spot = spiritSpot(s);
      if (!spot || s.linger <= 0) return;
      const C = k.P(spot);
      const pulse = 10.5 + Math.sin(s.c.raw / 420) * 1.2;
      const spin = s.c.raw / 550;
      const gap = s.linger < 0.5 ? 8 : 0;
      k.ellipse(C.x, C.y + 1, pulse, pulse * 0.52, HEAL[0], 3, gap, spin);
      k.ellipse(C.x, C.y, pulse, pulse * 0.52, HEAL[4], 2, gap, spin);
      k.ellipse(C.x, C.y, pulse * 0.65, pulse * 0.34, HEAL[3], 1, 5, -spin);
    },
    lingerAir(s) {
      const spot = spiritSpot(s);
      if (!spot || s.linger <= 0) return;
      drawHealingSpiritLinger(s, spot, s.linger, 0);
    },
  });

  // Smooth luminous white-green cleansing wash band (22x12 px) for Lesser Restoration.
  function washCurtainSprite() {
    return k.sprite('b62:wash', 22, 12, HEAL, set => {
      for (let y = 1; y <= 10; y++) {
        for (let x = 2; x <= 19; x++) {
          const arch = Math.abs(x - 10.5) > 7.5 ? 1 : 0;
          if (y <= 2 + arch && (x + y) % 2) continue;
          if (y >= 8) set(x, y, y === 9 ? 5 : 4);
          else if (y >= 5) set(x, y, (x + y) % 3 === 0 ? 5 : 4);
          else set(x, y, 3);
        }
      }
    });
  }

  // Lesser Restoration: white-green light washes down the target, a big outlined plus holds above the head, and dark affliction specks shake off.
  FX.register('lesser-restoration', {
    palette: HEAL,
    travel: 170,
    beats: (event, kit, travel) => [
      { at: kit.CAST + travel, stop: 70, target: event.targets?.[0] ?? null, kind: 'soft', power: 0 },
    ],
    end: (event, travel) => k.CAST + travel + 720,
    ground(s) {
      const tgt = firstTarget(s);
      if (!tgt) return;
      const e = s.c.t - k.CAST;
      if (e < 60) return;
      const T = k.P(anchorOf(tgt));
      const grow = k.ease(k.clamp((e - 60) / 140));
      const fade = e > 640 ? 1 - k.clamp((e - 640) / 240) : 1;
      if (fade <= 0) return;
      const r = 13 * grow;
      k.ellipse(T.x, T.y + 1, r, r * 0.55, HEAL[0], 3, fade < 0.5 ? 7 : 0);
      k.ellipse(T.x, T.y, r, r * 0.55, e < 260 ? k.WHITE : HEAL[4], 2, fade < 0.5 ? 7 : 0);
      if (e >= 170 && fade > 0.4) {
        k.ellipse(T.x, T.y, r * 0.65, r * 0.35, HEAL[3], 1, 6, s.c.raw / 220);
      }
    },
    air(s) {
      const tgt = firstTarget(s);
      if (!tgt) return;
      const e = s.c.t - k.CAST;
      if (e < 0) return;
      const T = k.P(anchorOf(tgt));
      // Act 1: bright white-green light curtain washing down from head to feet
      if (e < 260) {
        const u = k.ease(k.clamp(e / 200));
        const wy = k.mix(T.y - 26, T.y + 2, u);
        const wash = washCurtainSprite();
        const alpha = e > 200 ? 1 - k.clamp((e - 200) / 60) : 1;
        k.blit(wash, T.x - wash.width / 2, wy - wash.height + 2, alpha);
      }
      // Act 2 & 3: big outlined plus pops above the head and holds; dark specks shake off on real time
      const hit = s.hits[0];
      const real = hit ? s.real(hit) : e - 170;
      if (real >= 0 && real < 460) {
        const kOut = real / 460;
        k.drawHit(
          k.hitStyle('b62-lrest', HEAL, { S: 30, spikes: 4, minor: 4, jag: 0.1 }),
          { x: T.x, y: T.y - 12 },
          real,
        );
        // Dark affliction specks shaken off the token and fading out
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * k.tau + (k.hash(i, s.event.seed, 3) - 0.5) * 0.4;
          const dist = 4 + k.ease(kOut) * (15 + k.hash(i, s.event.seed, 4) * 10);
          const sx = T.x + Math.cos(a) * dist;
          const sy = T.y - 10 + Math.sin(a) * dist * 0.75 + kOut * kOut * 8;
          if (kOut > 0.65 && (i + Math.floor(s.c.raw / 55)) % 2) continue;
          k.dot(sx, sy, DARK_SPECK[0], 4);
          k.dot(sx, sy, i % 2 ? DARK_SPECK[2] : DARK_SPECK[3], 2);
        }
      }
      if (e >= 150) {
        const pe = e - 150;
        const plus = bigPlusSprite('b62:plus:lrest', HEAL);
        const pop = pe < 110 ? (1 - k.back(pe / 110)) * 7 : 0;
        const drift = pe > 440 ? -((pe - 440) / 280) * 5 : 0;
        const alpha = pe > 480 ? 1 - k.clamp((pe - 480) / 240) : 1;
        if (alpha > 0) {
          k.blit(plus, T.x - plus.width / 2, T.y - 31 + pop + drift, alpha);
          if (pe < 420) {
            const gPhase = Math.floor(s.c.raw / 80) % 2;
            drawStarGlint(T.x + (gPhase ? 9 : -9), T.y - 25 + drift, 2, HEAL[0], HEAL[4]);
          }
        }
      }
    },
  });

  // Criss-crossing bright violet-white chains sprite (24x24 px).
  function curseChainsSprite() {
    return k.sprite('b62:chains', 24, 24, CURSE_CHAIN, set => {
      const link = (cx, cy, horiz) => {
        const rx = horiz ? 2.6 : 1.7;
        const ry = horiz ? 1.7 : 2.6;
        for (let dy = -3; dy <= 3; dy++) {
          for (let dx = -3; dx <= 3; dx++) {
            const d = Math.hypot(dx / rx, dy / ry);
            if (d <= 1.05 && d >= 0.35) {
              set(Math.round(cx + dx), Math.round(cy + dy), dy < 0 ? 5 : d < 0.72 ? 4 : 3);
            }
          }
        }
      };
      for (let i = 0; i < 6; i++) {
        const u = i / 5;
        link(3 + u * 18, 3 + u * 18, i % 2 === 0);
        link(21 - u * 18, 3 + u * 18, i % 2 === 1);
      }
      // Central bright clasp
      for (let y = 10; y <= 13; y++) {
        for (let x = 10; x <= 13; x++) {
          set(x, y, x === 11 || y === 11 ? 5 : 4);
        }
      }
    });
  }

  // Big gold-white ring (28x28 px, a square and a half) with cardinal diamond glints.
  function goldHaloRingSprite() {
    return k.sprite('b62:goldring', 28, 28, RADIANT, set => {
      const c = 13.5;
      for (let y = 1; y < 27; y++) {
        for (let x = 1; x < 27; x++) {
          const d = Math.hypot(x - c, y - c);
          if (d >= 9.2 && d <= 12.2) {
            const col = d >= 10.2 && d <= 11.2 ? 5 : d > 11.2 ? 3 : 4;
            set(x, y, col);
          }
        }
      }
      // Four cardinal diamond flares
      for (const [fx, fy] of [
        [13.5, 2],
        [13.5, 25],
        [2, 13.5],
        [25, 13.5],
      ]) {
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            if (Math.abs(dx) + Math.abs(dy) <= 2) {
              set(Math.round(fx + dx), Math.round(fy + dy), Math.abs(dx) + Math.abs(dy) <= 1 ? 5 : 4);
            }
          }
        }
      }
    });
  }

  // Remove Curse: bright violet-white chains wrap the target and shatter into pale shards as a huge gold-white ring flashes and holds.
  FX.register('remove-curse', {
    palette: RADIANT,
    travel: 200,
    beats: (event, kit, travel) => [
      { at: kit.CAST + travel, stop: 90, target: event.targets?.[0] ?? null, kind: 'hit', power: 0.04 },
    ],
    end: (event, travel) => k.CAST + travel + 720,
    flash: (event, e) =>
      e < 32 ? { color: '#fff6cf', alpha: 0.24 } : e < 64 ? { color: '#18082b', alpha: 0.18 } : null,
    ground(s) {
      const tgt = firstTarget(s);
      if (!tgt) return;
      const e = s.c.t - k.CAST;
      if (e < 0) return;
      const T = k.P(anchorOf(tgt));
      if (e < 200) {
        const r = 12 * (1 - 0.15 * k.ease(e / 200));
        k.ellipse(T.x, T.y + 1, r, r * 0.55, CURSE_CHAIN[0], 3);
        k.ellipse(T.x, T.y, r, r * 0.55, CURSE_CHAIN[4], 2);
      } else {
        const pe = e - 200;
        const fade = pe > 440 ? 1 - k.clamp((pe - 440) / 260) : 1;
        if (fade > 0) {
          const r = 14 + k.ease(k.clamp(pe / 150)) * 3;
          k.ellipse(T.x, T.y + 1, r, r * 0.56, RADIANT[0], 3, fade < 0.5 ? 8 : 0);
          k.ellipse(T.x, T.y, r, r * 0.56, pe < 140 ? k.WHITE : RADIANT[4], 2, fade < 0.5 ? 8 : 0);
        }
      }
    },
    air(s) {
      const tgt = firstTarget(s);
      if (!tgt) return;
      const e = s.c.t - k.CAST;
      if (e < 0) return;
      const T = k.P(anchorOf(tgt));
      const cy = T.y - 10;
      // Act 1: bright violet-white chains wrap tightly around the target
      if (e < 200) {
        const chains = curseChainsSprite();
        const shake = e > 110 ? (Math.floor(s.c.raw / 28) % 2 ? 1 : -1) : 0;
        k.blit(chains, T.x - chains.width / 2 + shake, cy - chains.height / 2);
        if (e > 100) {
          const r = 2 + k.ease((e - 100) / 100) * 3;
          k.disc(T.x, cy, r + 1.5, RADIANT[0]);
          k.disc(T.x, cy, r, k.WHITE);
        }
      }
      // Act 2: chains shatter outward in pale shards + hit star on real time
      const hit = s.hits[0];
      const real = hit ? s.real(hit) : e - 200;
      if (real >= 0 && real < 440) {
        const u = real / 440;
        for (let i = 0; i < 14; i++) {
          const a = (i / 14) * k.tau + k.hash(i, s.event.seed, 1) * 0.3;
          const dist = 4 + k.ease(u) * (18 + k.hash(i, s.event.seed, 2) * 12);
          const sx = T.x + Math.cos(a) * dist;
          const sy = cy + Math.sin(a) * dist * 0.85 + u * u * 10;
          if (u > 0.72 && i % 2) continue;
          k.dot(sx, sy, CURSE_CHAIN[0], 5);
          k.dot(sx, sy, i % 3 === 0 ? k.WHITE : CURSE_CHAIN[4], 3);
        }
        k.drawHit(k.hitStyle('b62-rcurse', RADIANT, { S: 36, spikes: 6, minor: 4, jag: 0.2 }), { x: T.x, y: cy }, real);
      }
      // Big gold-white ring (1.5 squares) flashes around the token and holds
      if (e >= 195) {
        const pe = e - 195;
        const fade = pe > 440 ? 1 - k.clamp((pe - 440) / 260) : 1;
        if (fade > 0) {
          const ring = goldHaloRingSprite();
          k.blit(ring, T.x - ring.width / 2, cy - ring.height / 2, fade);
          if (pe < 420) {
            const a = s.c.raw / 180;
            drawStarGlint(T.x + Math.cos(a) * 12, cy + Math.sin(a) * 12, 2, RADIANT[0], RADIANT[4]);
          }
        }
      }
    },
  });

  // Big eye glyph (22x16 px, whole square+ wide) with open stages 0..3.
  function eyeGlyphSprite(key, pal, stage, verticalPupil) {
    return k.sprite(`${key}:${stage}`, 22, 16, pal, set => {
      const cx = 10.5;
      const cy = 7.5;
      const openH = stage === 0 ? 1.4 : stage === 1 ? 3.5 : 5.6;
      // Decorative lashes/rays on wide-open stages
      if (stage >= 2) {
        for (const [rx, ry] of [
          [10, 0],
          [11, 0],
          [5, 1],
          [16, 1],
          [10, 15],
          [11, 15],
        ])
          set(rx, ry, 4);
      }
      for (let y = 1; y < 15; y++) {
        for (let x = 1; x < 21; x++) {
          const nx = (x - cx) / 9.2;
          if (Math.abs(nx) >= 1) continue;
          const arch = Math.cos(nx * Math.PI * 0.5) * openH;
          const dy = Math.abs(y - cy);
          if (dy > arch) continue;
          const edge = dy > arch - 1.1;
          set(x, y, edge ? 3 : 4);
          if (!edge && dy < arch - 1.3 && Math.abs(x - cx) < 7) set(x, y, 5);
        }
      }
      // Iris & pupil
      if (stage >= 1) {
        const irisR = stage === 1 ? 2.6 : 3.7;
        for (let y = 2; y < 14; y++) {
          for (let x = 5; x < 17; x++) {
            const d = Math.hypot(x - cx, y - cy);
            if (d <= irisR) {
              const glow = stage === 3;
              set(x, y, glow ? (d < 2.2 ? 5 : 3) : d < 2.5 ? 2 : 3);
            }
          }
        }
        // Pupil
        if (verticalPupil) {
          for (let y = 5; y <= 10; y++) set(10, y, 0);
          if (stage >= 2) set(11, 7, 0);
        } else {
          for (let y = 6; y <= 9; y++) for (let x = 9; x <= 12; x++) if (Math.hypot(x - cx, y - cy) < 1.9) set(x, y, 0);
        }
        // White catchlight
        set(9, 6, 5);
        if (stage === 3) {
          set(10, 7, 5);
          set(11, 7, 5);
          set(10, 8, 5);
        }
      }
    });
  }

  // Faint outlined spectral silhouettes revealed by See Invisibility (12x16 px).
  function ghostSilhouetteSprite(variant) {
    return k.sprite(`b62:ghost:${variant}`, 12, 16, FROST, set => {
      // Head
      for (let y = 1; y <= 5; y++) {
        for (let x = 4; x <= 7; x++) {
          if (Math.hypot(x - 5.5, y - 3) <= 2.3) set(x, y, (x + y) % 2 ? 4 : 5);
        }
      }
      // Shoulders and cloaked body
      for (let y = 6; y <= 14; y++) {
        const hw = variant === 0 ? (y < 10 ? 3.5 : 4.2) : y < 11 ? 4.2 : 2.8;
        for (let x = Math.round(5.5 - hw); x <= Math.round(5.5 + hw); x++) {
          const edge = Math.abs(x - 5.5) >= hw - 1.1 || y === 6 || y === 14;
          if (edge) set(x, y, 4);
          else if ((x + y) % 2 === 0) set(x, y, 3);
        }
      }
      // Glowing eyes
      set(5, 3, 5);
      set(7, 3, 5);
    });
  }

  // See Invisibility: a big pale-blue eye opens over the caster, a bright cone sweeps out, and faint outlined shapes shimmer into view.
  FX.register('see-invisibility', {
    palette: FROST,
    travel: 160,
    beats: (event, kit, travel) => [{ at: kit.CAST + travel, stop: 60, target: null, kind: 'soft', power: 0 }],
    end: (event, travel) => k.CAST + travel + 820,
    ground(s) {
      const base = casterBase(s);
      if (!base) return;
      const e = s.c.t - k.CAST;
      if (e < 100) return;
      const C = k.P(base);
      const tgt = s.targets[0] || s.pose.target;
      const aim =
        tgt && Math.hypot(tgt.x - base.x, tgt.y - base.y) > 0.3 ? Math.atan2(tgt.y - base.y, tgt.x - base.x) : 0;
      const se = e - 100;
      const sweep = k.clamp(se / 520);
      const fade = e > 740 ? 1 - k.clamp((e - 740) / 240) : 1;
      if (fade <= 0) return;
      const len = 34 * k.ease(k.clamp(se / 140));
      const halfArc = 0.56;
      const a0 = aim - halfArc;
      const aNow = a0 + halfArc * 2 * k.ease(sweep);
      // Swept pale-blue light wedge (luminous pale interior, crisp outlined edges)
      const rays = 9;
      for (let i = 0; i <= rays; i++) {
        const a = k.mix(a0, aNow, i / rays);
        const edge = i === 0 || i === rays;
        const step = edge ? 2 : 3;
        for (let r = 6; r <= len; r += step) {
          if (!edge && fade < 0.6 && (i + r) % 2) continue;
          const px = C.x + Math.cos(a) * r;
          const py = C.y + Math.sin(a) * r;
          if (i === rays) {
            k.dot(px, py, FROST[0], 4);
            k.dot(px, py, k.WHITE, 2);
          } else if (i === 0) {
            k.dot(px, py, FROST[0], 3);
            k.dot(px, py, FROST[4], 1);
          } else {
            k.dot(px, py, r > len * 0.6 ? FROST[4] : FROST[3], 2);
          }
        }
      }
      // Outer bright scan arc
      const arcSteps = 12;
      for (let i = 0; i <= arcSteps; i++) {
        const a = k.mix(a0, aNow, i / arcSteps);
        const px = C.x + Math.cos(a) * len;
        const py = C.y + Math.sin(a) * len;
        k.dot(px, py, FROST[0], 4);
        k.dot(px, py, FROST[4], 2);
      }
    },
    air(s) {
      const base = casterBase(s);
      if (!base) return;
      const e = s.c.t - k.CAST;
      if (e < 0) return;
      const C = k.P(base);
      const tgt = s.targets[0] || s.pose.target;
      const aim =
        tgt && Math.hypot(tgt.x - base.x, tgt.y - base.y) > 0.3 ? Math.atan2(tgt.y - base.y, tgt.x - base.x) : 0;
      const hit = s.hits[0];
      const real = hit ? s.real(hit) : e - 160;
      if (real >= 0 && real < 300) {
        k.drawHit(
          k.hitStyle('b62-seeinvis', FROST, { S: 28, spikes: 4, minor: 4, jag: 0.1 }),
          { x: C.x, y: C.y - 23 },
          real,
        );
      }
      // Big pale-blue eye opening over the caster and holding
      const stage = e < 65 ? 0 : e < 130 ? 1 : e > 860 ? 1 : e > 920 ? 0 : 2;
      const alpha = e > 820 ? 1 - k.clamp((e - 820) / 160) : 1;
      if (alpha > 0) {
        const eye = eyeGlyphSprite('b62:blueeye', FROST, stage, false);
        k.blit(eye, C.x - eye.width / 2, C.y - 31, alpha);
      }
      // Faint outlined shapes shimmering into view where the sweeping cone passes
      if (e >= 140) {
        const se = e - 140;
        const sweep = k.ease(k.clamp(se / 480));
        const spots = [
          { f: 0.2, ang: -0.38, dist: 21, v: 0 },
          { f: 0.52, ang: 0.04, dist: 29, v: 1 },
          { f: 0.8, ang: 0.36, dist: 23, v: 0 },
        ];
        for (let i = 0; i < spots.length; i++) {
          const sp = spots[i];
          if (sweep < sp.f) continue;
          const fadeOut = e > 740 ? 1 - k.clamp((e - 740) / 220) : 1;
          const flick = Math.floor(s.c.raw / 95 + i) % 2 ? 0.75 : 0.5;
          const shAlpha = flick * fadeOut;
          if (shAlpha <= 0) continue;
          const gx = C.x + Math.cos(aim + sp.ang) * sp.dist;
          const gy = C.y + Math.sin(aim + sp.ang) * sp.dist;
          const ghost = ghostSilhouetteSprite(sp.v);
          k.blit(ghost, gx - ghost.width / 2, gy - ghost.height + 2, shAlpha);
          drawStarGlint(gx, gy - 10, 2, FROST[0], FROST[4]);
        }
      }
    },
  });

  // Darkvision: a big green-white eye opens over the target with a glowing iris as a bright 2-square green sight cone fans out and holds.
  FX.register('darkvision', {
    palette: DARKVISION_PAL,
    travel: 160,
    beats: (event, kit, travel) => [
      { at: kit.CAST + travel, stop: 60, target: event.targets?.[0] ?? null, kind: 'soft', power: 0 },
    ],
    end: (event, travel) => k.CAST + travel + 820,
    ground(s) {
      const tgt = firstTarget(s);
      if (!tgt) return;
      const e = s.c.t - k.CAST;
      if (e < 0) return;
      const T = k.P(anchorOf(tgt));
      const base = casterBase(s);
      const aim =
        base && Math.hypot(base.x - (tgt.baseX ?? tgt.x), base.y - (tgt.baseY ?? tgt.y)) > 0.4
          ? Math.atan2(base.y - (tgt.baseY ?? tgt.y), base.x - (tgt.baseX ?? tgt.x))
          : 0;
      const fade = e > 740 ? 1 - k.clamp((e - 740) / 240) : 1;
      if (fade <= 0) return;
      // Base glow ring under the target
      const br = 11 * k.ease(k.clamp(e / 140));
      k.ellipse(T.x, T.y + 1, br, br * 0.54, DARKVISION_PAL[0], 3, fade < 0.5 ? 6 : 0);
      k.ellipse(T.x, T.y, br, br * 0.54, DARKVISION_PAL[4], 2, fade < 0.5 ? 6 : 0);
      // 2-square (32 art px) bright green sight cone fanning out and holding
      if (e >= 140) {
        const ce = e - 140;
        const fan = k.ease(k.clamp(ce / 150));
        const len = 32 * fan;
        const halfArc = 0.44 * fan;
        const aL = aim - halfArc;
        const aR = aim + halfArc;
        // Bright dithered interior + crisp outlined range arcs
        for (let r = 8; r <= len; r += 4) {
          const isOuter = r >= len - 3;
          const isMid = r === 16;
          const steps = Math.max(4, Math.round(r * halfArc * 0.9));
          for (let i = 0; i <= steps; i++) {
            const a = k.mix(aL, aR, i / steps);
            if (!isOuter && !isMid && fade < 0.65 && (i + r) % 2) continue;
            const px = T.x + Math.cos(a) * r;
            const py = T.y + Math.sin(a) * r;
            if (isOuter) {
              k.dot(px, py, DARKVISION_PAL[0], 4);
              k.dot(px, py, DARKVISION_PAL[4], 2);
            } else if (isMid) {
              k.dot(px, py, DARKVISION_PAL[4], 2);
            } else {
              k.dot(px, py, DARKVISION_PAL[3], 2);
            }
          }
        }
        // Crisp outlined side rays of the sight cone
        const lx = T.x + Math.cos(aL) * len;
        const ly = T.y + Math.sin(aL) * len;
        const rx = T.x + Math.cos(aR) * len;
        const ry = T.y + Math.sin(aR) * len;
        drawLine(T.x, T.y, lx, ly, DARKVISION_PAL[0], 4);
        drawLine(T.x, T.y, rx, ry, DARKVISION_PAL[0], 4);
        drawLine(T.x, T.y, lx, ly, DARKVISION_PAL[4], 2);
        drawLine(T.x, T.y, rx, ry, DARKVISION_PAL[4], 2);
      }
    },
    air(s) {
      const tgt = firstTarget(s);
      if (!tgt) return;
      const e = s.c.t - k.CAST;
      if (e < 0) return;
      const T = k.P(anchorOf(tgt));
      const hit = s.hits[0];
      const real = hit ? s.real(hit) : e - 160;
      if (real >= 0 && real < 300) {
        k.drawHit(
          k.hitStyle('b62-darkvis', DARKVISION_PAL, { S: 30, spikes: 4, minor: 4, jag: 0.12 }),
          { x: T.x, y: T.y - 23 },
          real,
        );
      }
      const stage = e < 60 ? 0 : e < 130 ? 1 : e < 680 ? 3 : e < 820 ? 2 : e < 900 ? 1 : 0;
      const alpha = e > 820 ? 1 - k.clamp((e - 820) / 160) : 1;
      if (alpha > 0) {
        const eye = eyeGlyphSprite('b62:greeneye', DARKVISION_PAL, stage, true);
        k.blit(eye, T.x - eye.width / 2, T.y - 31, alpha);
        if (stage === 3 && Math.floor(s.c.raw / 120) % 2) {
          drawStarGlint(T.x + 8, T.y - 27, 2, DARKVISION_PAL[0], DARKVISION_PAL[4]);
        }
      }
    },
  });

  // Dark grave pit with vivid bright-green rim light (28x16 px).
  function gravePitSprite() {
    const pal = ['#08060b', '#140f1a', '#2b1f18', '#39a34c', '#8af776', '#e0ffd6', '#ffffff'];
    return k.sprite('b62:grave', 28, 16, pal, set => {
      const cx = 13.5;
      const cy = 7.5;
      for (let y = 1; y < 15; y++) {
        for (let x = 1; x < 27; x++) {
          const ang = Math.atan2(y - cy, x - cx);
          const jag = 1 + 0.1 * Math.sin(ang * 5) + 0.06 * Math.cos(ang * 7);
          const d = Math.hypot((x - cx) / 11.5, (y - cy) / 5.5) * jag;
          if (d < 0.72) set(x, y, 1);
          else if (d < 0.92) set(x, y, y < cy ? 5 : 4);
          else if (d < 1.08) set(x, y, (x + y) % 3 === 0 ? 6 : 3);
        }
      }
    });
  }

  // Bone-white skeleton (18x22 px, whole square+ tall): pose 0 = clawing out, pose 1 = standing tall.
  function skeletonSprite(pose) {
    const pal = [BONE[0], BONE[1], BONE[2], BONE[3], BONE[4], BONE[5], NECRO_RIM[3], NECRO_RIM[4]];
    return k.sprite(`b62:skel:${pose}`, 18, 22, pal, set => {
      const fillRect = (x0, y0, x1, y1, col) => {
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, col);
      };
      if (pose === 0) {
        // Emerging skull and two bony hands clawing over the grave lip
        fillRect(6, 7, 11, 12, 4);
        fillRect(7, 6, 10, 7, 5);
        set(7, 9, 6);
        set(10, 9, 6);
        set(8, 11, 0);
        set(9, 11, 0);
        // Left & right grasping claws
        fillRect(2, 10, 4, 14, 4);
        set(2, 9, 5);
        set(4, 9, 5);
        fillRect(13, 10, 15, 14, 4);
        set(13, 9, 5);
        set(15, 9, 5);
        // Upper ribs emerging
        fillRect(6, 14, 11, 16, 3);
        set(8, 15, 0);
        set(9, 15, 0);
        return;
      }
      // Standing full-height bone-white skeleton (y: 1..20)
      // Skull
      fillRect(6, 2, 11, 7, 4);
      fillRect(7, 1, 10, 3, 5);
      // Glowing green eye sockets & nose/teeth
      set(7, 4, 6);
      set(10, 4, 6);
      set(8, 5, 0);
      set(9, 5, 0);
      set(7, 7, 0);
      set(9, 7, 0);
      set(11, 7, 0);
      // Neck & shoulders
      fillRect(8, 8, 9, 8, 3);
      fillRect(4, 9, 13, 10, 5);
      // Ribcage with dark rib gaps
      fillRect(6, 10, 11, 14, 4);
      for (const ry of [11, 13]) {
        set(7, ry, 0);
        set(10, ry, 0);
      }
      set(8, 11, 5);
      set(9, 11, 5);
      // Spine & pelvis
      fillRect(8, 14, 9, 15, 3);
      fillRect(6, 15, 11, 16, 4);
      // Bony arms raised outward
      fillRect(3, 10, 4, 14, 4);
      set(2, 14, 5);
      set(3, 15, 5);
      fillRect(13, 10, 14, 14, 4);
      set(15, 14, 5);
      set(14, 15, 5);
      // Legs planted on the ground
      fillRect(6, 17, 7, 20, 4);
      fillRect(10, 17, 11, 20, 4);
      set(5, 20, 5);
      set(12, 20, 5);
    });
  }

  // Glowing faceted pebble sprite (9x8 px, ~1/3 square painted + outline).
  function magicPebbleSprite(flashed) {
    return k.sprite(`b62:pebble:${flashed}`, 9, 8, FORCE, set => {
      for (let y = 1; y < 7; y++) {
        for (let x = 1; x < 8; x++) {
          const d = Math.hypot((x - 4) / 3.1, (y - 3.6) / 2.5);
          if (d <= 1) {
            if (flashed) set(x, y, d < 0.72 ? 5 : 4);
            else set(x, y, y <= 2 && x <= 4 ? 5 : d < 0.65 ? 4 : 3);
          }
        }
      }
    });
  }

  // Magic Stone: three chunky outlined pebbles in the caster's hand glow bright blue-white with halos and flash together at the peak.
  FX.register('magic-stone', {
    palette: FORCE,
    travel: 220,
    beats: (event, kit, travel) => [{ at: kit.CAST + travel, stop: 75, target: null, kind: 'soft', power: 0 }],
    end: (event, travel) => k.CAST + travel + 700,
    flash: (event, e) => (e < 35 ? { color: '#e6f6ff', alpha: 0.16 } : null),
    ground(s) {
      const base = casterBase(s);
      if (!base) return;
      const e = s.c.t - k.CAST;
      if (e < 0) return;
      const C = k.P(base);
      const fade = e > 640 ? 1 - k.clamp((e - 640) / 260) : 1;
      if (fade <= 0) return;
      const r = 11 + (e >= 220 ? 2 : 0);
      k.ellipse(C.x, C.y + 1, r, r * 0.52, FORCE[0], 3, fade < 0.5 ? 6 : 0);
      k.ellipse(C.x, C.y, r, r * 0.52, e >= 220 && e < 340 ? k.WHITE : FORCE[4], 2, fade < 0.5 ? 6 : 0);
    },
    air(s) {
      const hand = s.pose.hand || s.pose.base;
      if (!hand) return;
      const e = s.c.t - k.CAST;
      if (e < 0) return;
      const H = k.P(hand);
      const cx = H.x;
      const cy = H.y - 8;
      const spread = k.ease(k.clamp(e / 160));
      const fade = e > 660 ? 1 - k.clamp((e - 660) / 260) : 1;
      if (fade <= 0) return;
      const peak = e >= 200 && e < 360;
      const flashed = e >= 210 && e < 320;
      const spin = e * 0.004;
      // Peak flash star behind the three pebbles so every pebble stays crisp at peak
      const hit = s.hits[0];
      const real = hit ? s.real(hit) : e - 220;
      if (real >= 0 && real < 340) {
        k.drawHit(k.hitStyle('b62-mstone', FORCE, { S: 38, spikes: 6, minor: 4, jag: 0.12 }), { x: cx, y: cy }, real);
        k.shards({ x: cx, y: cy }, real, FORCE, (s.event.seed || 0) + 19, 8, 20);
      }
      // Combined halo ring around the trio at and after the peak
      if (e >= 190) {
        const he = e - 190;
        const r = 13 + k.ease(k.clamp(he / 180)) * 3;
        k.ellipse(cx, cy, r, r, FORCE[0], 3, fade < 0.5 ? 8 : 0);
        k.ellipse(cx, cy, r, r, peak ? k.WHITE : FORCE[4], 2, fade < 0.5 ? 8 : 0);
      }
      // Three distinct outlined pebbles (~1/3 square each) with individual glowing halos
      const pebble = magicPebbleSprite(flashed ? 1 : 0);
      for (let i = 0; i < 3; i++) {
        const a = -Math.PI / 2 + (i / 3) * k.tau + spin;
        const dist = 8.5 * spread;
        const px = cx + Math.cos(a) * dist;
        const py = cy + Math.sin(a) * dist * 0.85;
        // Individual blue-white halo around each pebble
        k.ellipse(px, py, 6.2, 5.5, FORCE[0], 2);
        k.ellipse(px, py, 5.4, 4.8, peak ? k.WHITE : FORCE[4], 1);
        k.blit(pebble, px - pebble.width / 2, py - pebble.height / 2, fade);
        if (peak) drawStarGlint(px, py - 5, 2, FORCE[0], FORCE[4]);
      }
    },
  });

  // Bright scalloped magic puff cloud (22x20 px) for Prestidigitation.
  function magicPuffSprite() {
    const pal = ['#160b24', '#c6b5fa', '#e3f8ff', '#ffe2f7', '#fff6cf', '#ffffff'];
    return k.sprite('b62:puff', 22, 20, pal, set => {
      const lobes = [
        [10.5, 9.5, 6.2],
        [6, 10, 4.2],
        [15, 10, 4.2],
        [8, 6, 4.0],
        [13, 6, 4.0],
        [10.5, 13.5, 4.2],
      ];
      for (let y = 1; y < 19; y++) {
        for (let x = 1; x < 21; x++) {
          let best = 0;
          for (const [lx, ly, r] of lobes) {
            const c = 1 - Math.hypot(x - lx, y - ly) / r;
            if (c > best) best = c;
          }
          if (best > 0) set(x, y, best > 0.55 ? 5 : best > 0.25 ? 4 : x < 11 ? 3 : 2);
        }
      }
    });
  }

  // Little outlined 4-point pixel star (7x7 px) in 4 festive colours.
  function prestStarSprite(ci) {
    const c = PREST_COLORS[ci % PREST_COLORS.length];
    return k.sprite(`b62:pstar:${ci}`, 7, 7, [c[0], c[1], c[2], k.WHITE], set => {
      for (let i = 1; i <= 5; i++) {
        set(3, i, i === 3 ? 3 : i === 2 || i === 4 ? 2 : 1);
        set(i, 3, i === 3 ? 3 : i === 2 || i === 4 ? 2 : 1);
      }
      set(2, 2, 1);
      set(4, 2, 1);
      set(2, 4, 1);
      set(4, 4, 1);
    });
  }

  // Prestidigitation: a playful puff of multi-coloured sparkles and little stars pops like a tiny firework over the caster and rains confetti.
  FX.register('prestidigitation', {
    palette: RADIANT,
    travel: 120,
    beats: (event, kit, travel) => [{ at: kit.CAST + travel, stop: 60, target: null, kind: 'soft', power: 0 }],
    end: (event, travel) => k.CAST + travel + 780,
    ground(s) {
      const base = casterBase(s);
      if (!base) return;
      const e = s.c.t - k.CAST;
      if (e < 110) return;
      const C = k.P(base);
      const fade = e > 640 ? 1 - k.clamp((e - 640) / 260) : 1;
      if (fade <= 0) return;
      const r = 10 + k.ease(k.clamp((e - 110) / 180)) * 4;
      k.ellipse(C.x, C.y + 1, r, r * 0.52, '#160b24', 3, 6, s.c.raw / 180);
      k.ellipse(C.x, C.y, r, r * 0.52, RADIANT[4], 2, 6, s.c.raw / 180);
    },
    air(s) {
      const base = casterBase(s);
      if (!base) return;
      const e = s.c.t - k.CAST;
      if (e < 0) return;
      const C = k.P(base);
      const popX = C.x;
      const popY = C.y - 16;
      // Act 1: playful spark zips up from caster to pop point
      if (e < 125) {
        const u = e / 125;
        const sx = C.x + Math.sin(u * Math.PI * 2) * 4;
        const sy = k.mix(C.y - 4, popY, u);
        k.dot(sx, sy, '#160b24', 5);
        k.dot(sx, sy, k.WHITE, 3);
      }
      // Act 2: big playful puff + firework pop + whole-square cloud of bright coloured stars
      if (e >= 115) {
        const pe = e - 115;
        if (pe < 430) {
          const puff = magicPuffSprite();
          const pAlpha = pe > 260 ? 1 - k.clamp((pe - 260) / 170) : 1;
          k.blit(puff, popX - puff.width / 2, popY - puff.height / 2, pAlpha);
        }
        // Tiny firework burst rays
        if (pe < 290) {
          const u = k.ease(pe / 290);
          for (let i = 0; i < 10; i++) {
            const a = (i / 10) * k.tau + 0.2;
            const r0 = 3 + u * 5;
            const r1 = 7 + u * 14;
            const pal = PREST_COLORS[i % PREST_COLORS.length];
            drawLine(
              popX + Math.cos(a) * r0,
              popY + Math.sin(a) * r0,
              popX + Math.cos(a) * r1,
              popY + Math.sin(a) * r1,
              pal[0],
              3,
            );
            drawLine(
              popX + Math.cos(a) * r0,
              popY + Math.sin(a) * r0,
              popX + Math.cos(a) * r1,
              popY + Math.sin(a) * r1,
              pe < 95 ? k.WHITE : pal[1],
              1,
            );
          }
        }
        // Ring of bright multi-coloured little stars covering a whole square+ and holding
        if (pe < 680) {
          const sFade = pe > 460 ? 1 - k.clamp((pe - 460) / 220) : 1;
          const expand = k.ease(k.clamp(pe / 170));
          for (let i = 0; i < 9; i++) {
            const a = (i / 9) * k.tau + 0.35;
            const dist = (i === 0 ? 0 : 9.5 + (i % 2) * 4) * expand;
            const sx = popX + Math.cos(a) * dist;
            const sy = popY + Math.sin(a) * dist * 0.85;
            const star = prestStarSprite(i + Math.floor(s.c.raw / 150));
            k.blit(star, sx - star.width / 2, sy - star.height / 2, sFade);
          }
        }
        // Confetti fluttering downward across the caster's square
        if (pe >= 30 && pe < 760) {
          const cu = (pe - 30) / 730;
          for (let i = 0; i < 14; i++) {
            const pal = PREST_COLORS[i % PREST_COLORS.length];
            const ox = (k.hash(i, s.event.seed, 11) - 0.5) * 26;
            const cx = popX + ox * k.ease(k.clamp(cu * 2.2)) + Math.sin(cu * 10 + i * 1.3) * 3;
            const cy = popY - 4 + cu * (22 + k.hash(i, s.event.seed, 12) * 10);
            if (cu > 0.72 && (i + Math.floor(s.c.raw / 65)) % 2) continue;
            k.dot(cx, cy, pal[0], 4);
            k.dot(cx, cy, i % 3 === 0 ? pal[2] : pal[1], 2);
          }
        }
      }
      const hit = s.hits[0];
      const real = hit ? s.real(hit) : e - 120;
      if (real >= 0 && real < 300) {
        k.drawHit(
          k.hitStyle('b62-prest', RADIANT, { S: 32, spikes: 6, minor: 4, jag: 0.15 }),
          { x: popX, y: popY },
          real,
        );
      }
    },
  });

  // Ceramic pot sprites (18x18 px, whole square): 'L' left half, 'R' right half, 'seam' golden kintsugi seam, 'whole' gleaming whole pot.
  function potSprite(mode) {
    return k.sprite(`b62:pot:${mode}`, 18, 18, POT_PAL, set => {
      const crackX = y => 8.5 + (y < 6 ? 1 : y < 10 ? -1 : y < 14 ? 1 : 0);
      for (let y = 2; y <= 15; y++) {
        // Classic amphora silhouette: flared rim (2..3), neck (4..5), rounded belly (6..14), flat base (15)
        const hw =
          y <= 3 ? 4.5 : y <= 5 ? 3.1 : y <= 13 ? 3.5 + Math.sin(((y - 5) / 9) * Math.PI) * 4.1 : y === 14 ? 5.2 : 4.2;
        for (let x = Math.round(8.5 - hw); x <= Math.round(8.5 + hw); x++) {
          const cx = crackX(y);
          const onCrack = Math.abs(x - cx) < 0.9;
          if (mode === 'L' && x > cx) continue;
          if (mode === 'R' && x < cx) continue;
          // Bright terracotta shading with strong pale highlight so it reads on grass
          let col = x < 7 ? 4 : x < 11 ? 3 : 2;
          if (y === 2 || (x === 5 && y >= 7 && y <= 11)) col = 5;
          if (mode === 'seam' && onCrack) col = y % 2 === 0 ? 5 : 6;
          if (mode === 'whole' && Math.abs(x - 4 - (y - 3)) <= 1) col = 7;
          set(x, y, col);
        }
      }
      // Small side handles
      if (mode !== 'R') {
        set(3, 6, 4);
        set(2, 7, 4);
        set(2, 8, 3);
        set(3, 9, 3);
      }
      if (mode !== 'L') {
        set(14, 6, 3);
        set(15, 7, 3);
        set(15, 8, 2);
        set(14, 9, 2);
      }
    });
  }

  // Mending: a big cracked pot floats over the target, bright gold seams knit the pieces together, and it flashes whole.
  FX.register('mending', {
    palette: RADIANT,
    travel: 260,
    beats: (event, kit, travel) => [
      { at: kit.CAST + travel, stop: 75, target: event.targets?.[0] ?? null, kind: 'soft', power: 0 },
    ],
    end: (event, travel) => k.CAST + travel + 700,
    ground(s) {
      const tgt = firstTarget(s) || casterBase(s);
      if (!tgt) return;
      const e = s.c.t - k.CAST;
      if (e < 0) return;
      const T = k.P(anchorOf(tgt));
      const fade = e > 700 ? 1 - k.clamp((e - 700) / 240) : 1;
      if (fade <= 0) return;
      const r = 11 * k.ease(k.clamp(e / 160));
      k.ellipse(T.x, T.y + 1, r, r * 0.52, RADIANT[0], 3, fade < 0.5 ? 6 : 0);
      k.ellipse(T.x, T.y, r, r * 0.52, e >= 260 && e < 440 ? k.WHITE : RADIANT[4], 2, fade < 0.5 ? 6 : 0);
    },
    air(s) {
      const tgt = firstTarget(s) || casterBase(s);
      if (!tgt) return;
      const e = s.c.t - k.CAST;
      if (e < 0) return;
      const T = k.P(anchorOf(tgt));
      const py = T.y - 26;
      const fade = e > 720 ? 1 - k.clamp((e - 720) / 220) : 1;
      if (fade <= 0) return;
      const hit = s.hits[0];
      const real = hit ? s.real(hit) : e - 260;
      if (real >= 0 && real < 320) {
        k.drawHit(
          k.hitStyle('b62-mend', RADIANT, { S: 36, spikes: 4, minor: 4, jag: 0.1 }),
          { x: T.x, y: py + 9 },
          real,
        );
      }
      // Act 1: cracked pot halves drift together with stitching gold sparks
      if (e < 255) {
        const pull = k.ease(k.clamp((e - 70) / 185));
        const sep = (1 - pull) * 3.5;
        const left = potSprite('L');
        const right = potSprite('R');
        k.blit(left, T.x - left.width / 2 - sep, py - sep * 0.3);
        k.blit(right, T.x - right.width / 2 + sep, py + sep * 0.3);
        // Gold stitching sparks inside the crack
        if (e > 60) {
          for (let i = 0; i < 4; i++) {
            const sy = py + 3 + i * 3.5;
            k.dot(T.x, sy, RADIANT[0], 4);
            k.dot(T.x, sy, (i + Math.floor(s.c.raw / 50)) % 2 ? k.WHITE : RADIANT[3], 2);
          }
        }
      } else if (e < 450) {
        // Act 2a: bright gold kintsugi seam blazing along the knitted crack
        const seam = potSprite('seam');
        k.blit(seam, T.x - seam.width / 2, py);
        drawStarGlint(T.x, py + 8, 2, RADIANT[0], RADIANT[4]);
      } else {
        // Act 2b & 3: gleaming whole repaired pot holds proudly
        const whole = potSprite('whole');
        const lift = e > 680 ? -((e - 680) / 260) * 4 : 0;
        k.blit(whole, T.x - whole.width / 2, py + lift, fade);
        if (e < 700) {
          const g = Math.floor(s.c.raw / 90) % 2;
          drawStarGlint(T.x + (g ? 9 : -9), py + (g ? 3 : 12), 2, RADIANT[0], RADIANT[4]);
          drawStarGlint(T.x + (g ? -8 : 8), py + (g ? 13 : 4), 2, RADIANT[0], RADIANT[3]);
        }
      }
    },
  });

  // Big gold clock face with crisp white rim (20x20 px, whole square+).
  function clockFaceSprite() {
    return k.sprite('b62:clock', 20, 20, CLOCK_PAL, set => {
      const c = 9.5;
      // Top pocket-watch crown nub
      set(9, 1, 3);
      set(10, 1, 3);
      for (let y = 2; y <= 18; y++) {
        for (let x = 2; x <= 17; x++) {
          const d = Math.hypot(x - c, y - 10);
          if (d <= 8.1) {
            if (d >= 6.8)
              set(x, y, 5); // white rim
            else if (d >= 5.7)
              set(x, y, 3); // gold inner bezel
            else set(x, y, 4); // bright pale-gold dial
          }
        }
      }
      // 12, 3, 6, 9 dial ticks
      set(9, 4, 1);
      set(10, 4, 1);
      set(9, 16, 1);
      set(10, 16, 1);
      set(4, 10, 1);
      set(15, 10, 1);
    });
  }

  // Gift of Alacrity: a big white-rimmed gold clock face appears over the target, its hands race forward, and speed lines streak past.
  FX.register('gift-of-alacrity', {
    palette: CLOCK_PAL,
    travel: 150,
    beats: (event, kit, travel) => [
      { at: kit.CAST + travel, stop: 60, target: event.targets?.[0] ?? null, kind: 'soft', power: 0 },
    ],
    end: (event, travel) => k.CAST + travel + 810,
    ground(s) {
      const tgt = firstTarget(s);
      if (!tgt) return;
      const e = s.c.t - k.CAST;
      if (e < 0) return;
      const T = k.P(anchorOf(tgt));
      const fade = e > 700 ? 1 - k.clamp((e - 700) / 240) : 1;
      if (fade <= 0) return;
      const r = 12 * k.ease(k.clamp(e / 140));
      k.ellipse(T.x, T.y + 1, r, r * 0.54, CLOCK_PAL[0], 3, fade < 0.5 ? 6 : 0);
      k.ellipse(T.x, T.y, r, r * 0.54, CLOCK_PAL[4], 2, fade < 0.5 ? 6 : 0);
    },
    air(s) {
      const tgt = firstTarget(s);
      if (!tgt) return;
      const e = s.c.t - k.CAST;
      if (e < 0) return;
      const T = k.P(anchorOf(tgt));
      const cx = T.x;
      const cy = T.y - 22;
      const fade = e > 720 ? 1 - k.clamp((e - 720) / 240) : 1;
      // Speed lines streaking briskly past the token across its full height
      if (e >= 120 && e < 860) {
        for (let i = 0; i < 8; i++) {
          const lane = (e / 230 + k.hash(i, s.event.seed, 21)) % 1;
          const sy = T.y - 22 + i * 3.1;
          const len = 8 + (i % 3) * 4;
          const sx = T.x - 16 + lane * 32;
          const col = i % 3 === 0 ? k.WHITE : i % 3 === 1 ? CLOCK_PAL[4] : FROST[3];
          drawLine(sx - len * 0.5, sy, sx + len * 0.5, sy, CLOCK_PAL[0], 4);
          drawLine(sx - len * 0.5, sy, sx + len * 0.5, sy, col, 2);
        }
      }
      const hit = s.hits[0];
      const real = hit ? s.real(hit) : e - 150;
      if (real >= 0 && real < 300) {
        k.drawHit(k.hitStyle('b62-alac', CLOCK_PAL, { S: 34, spikes: 4, minor: 4, jag: 0.1 }), { x: cx, y: cy }, real);
      }
      // Big gold clock face with white rim holding over the target, hands racing forward
      if (fade > 0) {
        const face = clockFaceSprite();
        const pop = e < 120 ? (1 - k.back(e / 120)) * 7 : 0;
        const fy = cy + pop;
        k.blit(face, cx - face.width / 2, fy - face.height / 2, fade);
        // Racing hands drawn directly on the dial
        const spinT = k.clamp((e - 100) / 620);
        const minA = -Math.PI / 2 + k.ease(spinT) * k.tau * 3.25;
        const hrA = -Math.PI / 2 + k.ease(spinT) * k.tau * 0.75;
        drawLine(cx, fy, cx + Math.cos(hrA) * 4.2, fy + Math.sin(hrA) * 4.2, CLOCK_PAL[0], 2);
        drawLine(cx, fy, cx + Math.cos(minA) * 6.4, fy + Math.sin(minA) * 6.4, CLOCK_PAL[0], 2);
        k.dot(cx, fy, k.WHITE, 2);
        if (e >= 150 && e < 720) {
          const tickA = -Math.PI / 2 + Math.floor(s.c.raw / 70) * (Math.PI / 2);
          k.dot(cx + Math.cos(tickA) * 9, fy + Math.sin(tickA) * 9, k.WHITE, 2);
        }
      }
    },
  });

  // Big pale theatrical mask glyph (20x20 px, whole square+, flared masquerade temples).
  function maskGlyphSprite() {
    return k.sprite('b62:mask', 20, 20, MASK_PAL, set => {
      const cx = 9.5;
      for (let y = 2; y <= 17; y++) {
        const ny = (y - 9.5) / 7.8;
        const flare = y >= 5 && y <= 9 ? 1.5 : 0;
        const taper = y > 10 ? 1 - (y - 10) * 0.075 : 1;
        const hw = Math.sqrt(Math.max(0, 1 - ny * ny)) * 7.2 * taper + flare;
        for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
          const edge = Math.abs(x - cx) >= hw - 1.2 || y <= 3 || y >= 16;
          set(x, y, edge ? 3 : x < 10 ? 5 : 4);
        }
      }
      // Decorative brow jewel & temple wings
      set(9, 3, 5);
      set(10, 3, 5);
      set(9, 4, 2);
      set(10, 4, 2);
      // Expressive dark almond eye cutouts
      for (const [ex, ey] of [
        [5, 8],
        [6, 8],
        [7, 8],
        [6, 9],
        [12, 8],
        [13, 8],
        [14, 8],
        [13, 9],
      ])
        set(ex, ey, 0);
      // Curved theatrical smile
      for (const [mx, my] of [
        [7, 13],
        [8, 14],
        [9, 14],
        [10, 14],
        [11, 14],
        [12, 13],
      ])
        set(mx, my, 0);
    });
  }

  // Iridescent dithered disguise-tint silhouette (16x22 px) for the figure colour flicker.
  function disguiseTintSprite(variant) {
    const pal =
      variant === 0 ? ['#0b242e', '#3ac7e8', '#a8f0ff', '#ffffff'] : ['#2b121c', '#e868a8', '#ffc2e2', '#fff4b8'];
    return k.sprite(`b62:dtint:${variant}`, 16, 22, pal, set => {
      for (let y = 1; y <= 20; y++) {
        const hw =
          y <= 6
            ? Math.sqrt(Math.max(0, 1 - ((y - 3.5) / 2.8) ** 2)) * 3.5
            : y <= 16
              ? 5.5 - Math.abs(y - 11) * 0.15
              : 4.2;
        for (let x = Math.round(7.5 - hw); x <= Math.round(7.5 + hw); x++) {
          const edge = Math.abs(x - 7.5) >= hw - 1.1 || y === 1 || y === 20;
          if (edge) set(x, y, 2);
          else if ((x + y) % 2 === 0) set(x, y, (x + y * 3) % 4 === 0 ? 3 : 1);
        }
      }
    });
  }

  // Disguise Self: a big pale mask sweeps down over the caster while a bright shimmer ripples over the token and flickers its tint.
  FX.register('disguise-self', {
    palette: MASK_PAL,
    travel: 180,
    beats: (event, kit, travel) => [{ at: kit.CAST + travel, stop: 60, target: null, kind: 'soft', power: 0 }],
    end: (event, travel) => k.CAST + travel + 760,
    ground(s) {
      const base = casterBase(s);
      if (!base) return;
      const e = s.c.t - k.CAST;
      if (e < 0) return;
      const C = k.P(base);
      const fade = e > 700 ? 1 - k.clamp((e - 700) / 240) : 1;
      if (fade <= 0) return;
      const r = 12 * k.ease(k.clamp(e / 150));
      k.ellipse(C.x, C.y + 1, r, r * 0.54, MASK_PAL[0], 3, fade < 0.5 ? 6 : 0);
      k.ellipse(C.x, C.y, r, r * 0.54, e >= 180 && e < 380 ? k.WHITE : MASK_PAL[4], 2, fade < 0.5 ? 6 : 0);
    },
    air(s) {
      const base = casterBase(s);
      if (!base) return;
      const e = s.c.t - k.CAST;
      if (e < 0) return;
      const C = k.P(base);
      // Figure flickers to an alternate illusory tint as the shimmer passes
      if (e >= 220 && e < 720) {
        const tick = Math.floor(s.c.raw / 85);
        const variant = tick % 2;
        const tint = disguiseTintSprite(variant);
        const tAlpha = e > 580 ? 0.5 : 0.75;
        k.blit(tint, C.x - tint.width / 2, C.y - 22, tAlpha);
      }
      // Shimmer waves rippling across the whole caster token
      for (const [start, dur, dir] of [
        [150, 320, 1],
        [380, 300, -1],
      ]) {
        const we = e - start;
        if (we < 0 || we > dur) continue;
        const u = we / dur;
        const wy = dir > 0 ? k.mix(C.y - 24, C.y + 2, u) : k.mix(C.y + 2, C.y - 24, u);
        drawLine(C.x - 10, wy, C.x + 10, wy, MASK_PAL[0], 5);
        drawLine(C.x - 10, wy, C.x + 10, wy, dir > 0 ? '#a8f0ff' : '#ffc2e2', 3);
        drawLine(C.x - 8, wy, C.x + 8, wy, k.WHITE, 1);
      }
      const hit = s.hits[0];
      const real = hit ? s.real(hit) : e - 180;
      if (real >= 0 && real < 300) {
        k.drawHit(
          k.hitStyle('b62-disg', MASK_PAL, { S: 34, spikes: 6, minor: 0, jag: 0.15 }),
          { x: C.x, y: C.y - 12 },
          real,
        );
      }
      // Big pale mask glyph sweeping down over the caster and holding
      const maskFade = e > 640 ? 1 - k.clamp((e - 640) / 240) : 1;
      if (maskFade > 0) {
        const mask = maskGlyphSprite();
        const sweep = k.ease(k.clamp(e / 180));
        const my = k.mix(C.y - 34, C.y - 20, sweep) - (e > 640 ? ((e - 640) / 240) * 5 : 0);
        k.blit(mask, C.x - mask.width / 2, my, maskFade);
      }
      // Iridescent prism sparkles drifting off the caster
      if (e >= 180 && e < 860) {
        for (let i = 0; i < 6; i++) {
          const u = ((e - 180) / 680 + i * 0.15) % 1;
          const sx = C.x + Math.sin(u * 6 + i * 2) * 11;
          const sy = C.y - 4 - u * 22;
          k.dot(sx, sy, MASK_PAL[0], 3);
          k.dot(sx, sy, i % 2 ? k.WHITE : MASK_PAL[4], 1);
        }
      }
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
