/* Pixel spells, batch 64: second-pass high-readability rebuilds (level 6–8). */
(function (root) {
  'use strict';
  const FX = root.BoardPixelFX;
  if (!FX) return;
  const k = FX.kit;

  // High-contrast 6-step ramps: [outline, deep, mid, bright, pale, white]
  const FEY = ['#0c1c12', '#266b3a', '#52b862', '#9ef08a', '#e0ffbe', '#ffffff'];
  const BLOOM = ['#24101e', '#9e2c62', '#e85da0', '#ffa6d4', '#ffe2f2', '#ffffff'];
  const STONE = ['#14161a', '#525864', '#8e96a6', '#c6cddb', '#edf1f8', '#ffffff'];
  const ARMOR = ['#1a1612', '#6e6050', '#a8967c', '#d6c8b2', '#f2ece0', '#ffffff'];
  const JAR = ['#0e182e', '#28568f', '#5aa6e8', '#a8dcff', '#e4f6ff', '#ffffff'];
  const STAR = ['#2a1804', '#9e5e10', '#e8a224', '#ffd859', '#fff4b8', '#ffffff'];
  const SWORD = ['#160828', '#522296', '#8d52e8', '#caa2ff', '#f0e2ff', '#ffffff'];
  const REGEN = ['#0b2012', '#1d7540', '#48cf6e', '#a8f798', '#f2ffd0', '#ffffff'];
  const QUAKE = ['#18110c', '#4a3524', '#8f6f4c', '#d9bc8c', '#f5e4be', '#ffffff'];

  function casterOf(s) {
    const base = s.pose.base || s.pose.hand || s.targets[0] || { x: 0, y: 0, span: 1 };
    const span = base.span || 1;
    return { x: base.x, y: base.y - 0.62 * span, baseX: base.x, baseY: base.y, span };
  }

  function targetOf(s) {
    const t = s.targets[0] || s.pose.target || s.pose.base;
    if (!t) return null;
    const span = t.span || 1;
    const baseX = t.baseX ?? t.x;
    const baseY = t.baseY ?? t.y;
    const y = t.baseY != null ? t.y : baseY - 0.62 * span;
    return { id: t.id ?? null, x: t.x, y, baseX, baseY, span };
  }

  function stroke(x0, y0, x1, y1, color, size = 1) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy)));
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      k.dot(x0 + dx * u, y0 + dy * u, color, size);
    }
  }

  function outlinedStroke(x0, y0, x1, y1, outColor, fillColor, size = 2) {
    stroke(x0, y0, x1, y1, outColor, size + 2);
    stroke(x0, y0, x1, y1, fillColor, size);
  }

  // ---------------------------------------------------------------- sprites
  function feySprite(flap) {
    const pal = [FEY[0], FEY[2], FEY[3], FEY[4], FEY[5], STAR[3], STAR[4], BLOOM[3]];
    const rows = flap
      ? [
          '....5.....5....',
          '...56.333.65...',
          '....5344435....',
          '.443..444..344.',
          '44323.343.32344',
          '432223444322234',
          '.3223244423223.',
          '..33.23432.33..',
          '...732343237...',
          '..32223432223..',
          '..32.23432.23..',
          '.....23432.....',
          '....2344432....',
          '....2334332....',
          '....1234321....',
          '....123.321....',
          '.....23.32.....',
          '.....2...2.....',
        ]
      : [
          '....5.....5....',
          '...56.333.65...',
          '....5344435....',
          '..33..444..33..',
          '.4432.343.2344.',
          '443223444322344',
          '432232444232234',
          '.323.23432.323.',
          '...732343237...',
          '...322343223...',
          '....2234322....',
          '.....23432.....',
          '....2344432....',
          '....2334332....',
          '....1234321....',
          '....123.321....',
          '.....23.32.....',
          '.....2...2.....',
        ];
    return k.sprite(`b64:fey:${flap}`, 17, 20, pal, set => {
      rows.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
          const ch = row[x];
          if (ch !== '.') set(x + 1, y + 1, Number(ch));
        }
      });
    });
  }

  function mushroomSprite(kind) {
    // 0 = bright pink spotted toadstool, 1 = golden blossom
    const pal = kind
      ? [FEY[0], FEY[2], STAR[2], STAR[3], STAR[4], k.WHITE]
      : [BLOOM[0], BLOOM[2], BLOOM[3], BLOOM[4], FEY[4], k.WHITE];
    const rows = kind
      ? ['..343..', '.34543.', '..343..', '...1...', '..111..']
      : ['.12221.', '1252251', '2222222', '..454..', '..444..'];
    return k.sprite(`b64:mush:${kind}`, 9, 7, pal, set => {
      rows.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
          const ch = row[x];
          if (ch !== '.') set(x + 1, y + 1, Number(ch));
        }
      });
    });
  }

  const STATUE_ROWS = [
    '......45554......',
    '.....4555543.....',
    '.....4554432.....',
    '......45432......',
    '...45554443322...',
    '..4555444333221..',
    '..4554345432321..',
    '..4443245432221..',
    '..3443.4543.221..',
    '...33..4443..2...',
    '......45433......',
    '.....4554332.....',
    '.....4544332.....',
    '.....4443322.....',
    '.....444.332.....',
    '.....443.322.....',
    '.....443.222.....',
    '.....432.221.....',
    '...44443332221...',
    '..5554443332211..',
    '..4433332222111..',
  ];

  function statueSprite(revealStep, cracks) {
    // revealStep: 1..6 (bottom-up petrification along the real statue silhouette), cracks: 0..2
    const pal = [STONE[0], STONE[1], STONE[2], STONE[3], STONE[4], STONE[5]];
    const totalH = STATUE_ROWS.length;
    const minRow = revealStep >= 6 ? 0 : Math.max(0, Math.round(totalH * (1 - revealStep / 6)));
    return k.sprite(`b64:statue:${revealStep}:${cracks}`, 19, 23, pal, set => {
      for (let y = minRow; y < totalH; y++) {
        const row = STATUE_ROWS[y];
        const wave = revealStep < 6 && y <= minRow + 1;
        for (let x = 0; x < row.length; x++) {
          const ch = row[x];
          if (ch !== '.') set(x + 1, y + 1, wave ? 5 : Number(ch));
        }
      }
      if (cracks >= 1 && revealStep >= 6) {
        // Wide dark primary fissure with white chipped edge across chest and shoulder
        const pts1 = [
          [6, 6],
          [7, 7],
          [8, 8],
          [9, 8],
          [10, 9],
          [10, 10],
          [11, 11],
          [10, 12],
          [9, 13],
        ];
        for (const [cx, cy] of pts1) {
          set(cx, cy, 0);
          set(cx + 1, cy, 0);
          set(cx - 1, cy, 5);
        }
      }
      if (cracks >= 2 && revealStep >= 6) {
        // Secondary wide cracks across crown, legs and plinth
        const pts2 = [
          [10, 2],
          [9, 3],
          [8, 4],
          [7, 14],
          [8, 15],
          [7, 16],
          [11, 16],
          [12, 17],
          [6, 19],
          [7, 20],
        ];
        for (const [cx, cy] of pts2) {
          set(cx, cy, 0);
          set(cx + 1, cy, 0);
          set(cx, cy - 1, 5);
        }
      }
    });
  }

  function stoneArmorSprite(glint) {
    // 20x22 heavy pale stone & warm tan full-body armor plates
    const pal = [ARMOR[0], ARMOR[2], ARMOR[3], ARMOR[4], STONE[3], STONE[4], k.WHITE];
    const rows = [
      '......5665......',
      '.....566554.....',
      '.....455442.....',
      '.56654554423322.',
      '5666556654233221',
      '5655456544233211',
      '.45424554222211.',
      '.442.45542.2211.',
      '..2..34432..11..',
      '....2344321.....',
      '....3454321.....',
      '...345543221....',
      '...344333221....',
      '...2332.2211....',
      '...2332.2211....',
      '...2321.2211....',
      '..34321.22111...',
      '..22211.11111...',
    ];
    return k.sprite(`b64:armor:${glint}`, 18, 20, pal, set => {
      rows.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
          const ch = row[x];
          if (ch !== '.') set(x + 1, y + 1, Number(ch));
        }
      });
      // Plate seam & luminous chest keystone
      for (let x = 5; x <= 12; x++) set(x, 10, 0);
      set(8, 5, 0);
      set(9, 5, 0);
      set(8, 6, 6);
      set(9, 6, 6);
      if (glint) {
        for (let i = 0; i < 11; i++) {
          const gx = 3 + i;
          const gy = 14 - i;
          if (gx > 1 && gx < 16 && gy > 1 && gy < 17) set(gx, gy, 6);
        }
      }
    });
  }

  function stonePlateSprite(variant) {
    const pal =
      variant % 2
        ? [STONE[0], STONE[2], STONE[3], STONE[4], k.WHITE]
        : [ARMOR[0], ARMOR[2], ARMOR[3], ARMOR[4], k.WHITE];
    const rows = ['..344443..', '.34443321.', '3443332211', '4433322211', '.33322211.', '..222211..'];
    return k.sprite(`b64:plate:${variant}`, 12, 8, pal, set => {
      rows.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
          const ch = row[x];
          if (ch !== '.') set(x + 1, y + 1, Number(ch));
        }
      });
    });
  }

  function rockBurstSprite(variant) {
    const pal = [ARMOR[0], ARMOR[1], ARMOR[2], ARMOR[3], STONE[4]];
    const rows = variant ? ['..4..', '.342.', '34321', '23211'] : ['.34..', '3432.', '23211'];
    return k.sprite(`b64:rock:${variant}`, 7, 6, pal, set => {
      rows.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
          const ch = row[x];
          if (ch !== '.') set(x + 1, y + 1, Number(ch));
        }
      });
    });
  }

  function magicJarSprite(state) {
    // Full-square (18x21) glowing pale-blue glass jar with crisp white shine & gold stopper
    // state: 0 = uncapped open mouth, 1 = sealed glowing soul, 2 = white seal flash
    const pal = [JAR[0], JAR[1], JAR[2], JAR[3], JAR[4], k.WHITE, STAR[2], STAR[3], STAR[4]];
    const rows = [
      '......7887......',
      '.....678876.....',
      '......6776......',
      '.....345543.....',
      '....35544432....',
      '...3554444332...',
      '..355444444321..',
      '.35544444443321.',
      '.35544444443321.',
      '.35444444443321.',
      '.35444444443321.',
      '.35444444443321.',
      '.34444444443221.',
      '..344444443321..',
      '..234444433221..',
      '...2334433221...',
      '....22332211....',
      '.....222211.....',
    ];
    return k.sprite(`b64:jar:${state}`, 18, 20, pal, set => {
      rows.forEach((row, y) => {
        if (state === 0 && y < 2) return;
        for (let x = 0; x < row.length; x++) {
          const ch = row[x];
          if (ch !== '.') set(x + 1, y + 1, state === 2 && Number(ch) < 6 ? 5 : Number(ch));
        }
      });
      if (state === 0) {
        for (let x = 6; x <= 11; x++) set(x, 3, 5);
        for (let x = 7; x <= 10; x++) set(x, 4, 4);
      }
      if (state === 1) {
        // Luminous white soul core pulsing inside the glass belly
        for (let dy = -3; dy <= 3; dy++) {
          for (let dx = -3; dx <= 3; dx++) {
            const d = Math.hypot(dx, dy);
            if (d <= 2.1) set(9 + dx, 11 + dy, 5);
            else if (d <= 3.1) set(9 + dx, 11 + dy, 4);
          }
        }
      }
      // Crisp 2 px curved white specular shine on the glass
      if (state !== 2) {
        for (let y = 8; y <= 12; y++) {
          set(3, y, 5);
          set(4, y, 5);
        }
        set(4, 7, 5);
        set(5, 6, 5);
      }
    });
  }

  function starMoteSprite(bright) {
    // 9x9 outlined 4-point star (~third of a square): white core + gold halo
    const pal = [STAR[0], STAR[2], STAR[3], STAR[4], k.WHITE];
    const rows = bright
      ? ['...3...', '...4...', '..242..', '3444443', '..242..', '...4...', '...3...']
      : ['...2...', '...3...', '..242..', '2344432', '..242..', '...3...', '...2...'];
    return k.sprite(`b64:star:${bright}`, 9, 9, pal, set => {
      rows.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
          const ch = row[x];
          if (ch !== '.') set(x + 1, y + 1, Number(ch));
        }
      });
    });
  }

  function spectralSwordSprite(gleam) {
    // 30x13 big spectral greatsword (~1.85 squares long), pointing right
    const pal = [SWORD[0], SWORD[1], SWORD[2], SWORD[3], SWORD[4], k.WHITE];
    return k.sprite(`b64:sword:${gleam}`, 30, 13, pal, set => {
      // Pommel
      set(1, 6, 4);
      set(2, 5, 3);
      set(2, 6, 5);
      set(2, 7, 3);
      // Grip
      for (let x = 3; x <= 6; x++) {
        set(x, 6, 2);
        set(x, 5, 1);
      }
      // Wide ornate crossguard (11 px tall)
      for (let y = 1; y <= 11; y++) {
        set(7, y, Math.abs(y - 6) <= 1 ? 5 : 3);
        set(8, y, Math.abs(y - 6) <= 2 ? 4 : 2);
      }
      // Big bright white-violet blade (20 px long, 2 px white core + violet bevels)
      for (let x = 9; x <= 26; x++) {
        const w = x < 22 ? 2 : x < 26 ? 1 : 0;
        for (let dy = -w; dy <= w; dy++) {
          const abs = Math.abs(dy);
          let col = abs === 0 ? 5 : abs === 1 ? (gleam ? 5 : 4) : 3;
          if (gleam && Math.abs(x - 17) <= 3) col = 5;
          set(x, 6 + dy, col);
        }
      }
      set(27, 6, 5);
      set(28, 6, 4);
    });
  }

  function healPlusSprite(pulse) {
    // Big bold outlined healing plus (18x18 normal, 20x20 heartbeat pulse)
    const S = pulse ? 20 : 18;
    const pal = [REGEN[0], REGEN[2], REGEN[3], REGEN[4], STAR[3], k.WHITE];
    return k.sprite(`b64:plus:${pulse}`, S, S, pal, set => {
      const c = (S - 1) / 2;
      const halfLen = pulse ? 8 : 7;
      const halfW = pulse ? 3.2 : 2.7;
      for (let y = 1; y < S - 1; y++) {
        for (let x = 1; x < S - 1; x++) {
          const dx = Math.abs(x - c);
          const dy = Math.abs(y - c);
          const inV = dx <= halfW && dy <= halfLen;
          const inH = dy <= halfW && dx <= halfLen;
          if (!inV && !inH) continue;
          const edge =
            (inV && (dx > halfW - 1.1 || dy > halfLen - 1.1)) || (inH && (dy > halfW - 1.1 || dx > halfLen - 1.1));
          const topLeft = x < c && y < c;
          let col = pulse ? 5 : 5;
          if (edge) col = pulse ? 4 : 3;
          else if (!topLeft && !pulse) col = 3;
          set(x, y, col);
        }
      }
      // Crisp heartbeat line pulsing across the horizontal bar
      const midY = Math.round(c);
      const wave = [0, 0, -1, -3, 2, -2, 0, 0];
      for (let i = 0; i < wave.length; i++) {
        const wx = Math.round(c - 4 + i);
        const wy = midY + wave[i];
        set(wx, wy, pulse ? 4 : 2);
        set(wx, wy - 1, 5);
      }
    });
  }

  function quakeCracksSprite(R, stage, seed) {
    // Thinner 2 px dark fissures with bright tan raised lips on the ground layer
    R = Math.max(32, Math.round(R));
    const W = R * 2 + 12;
    const H = Math.ceil(R * 1.4) + 12;
    const cx = Math.floor(W / 2);
    const cy = Math.floor(H / 2);
    const reachFrac = [0.32, 0.62, 0.86, 1][stage] ?? 1;
    const pal = [QUAKE[0], QUAKE[1], QUAKE[2], QUAKE[3], QUAKE[4]];
    return k.sprite(
      `b64:quake:${R}:${stage}:${seed % 5}`,
      W,
      H,
      pal,
      set => {
        function crackSeg(x0, y0, x1, y1, thick) {
          const dx = x1 - x0;
          const dy = y1 - y0;
          const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) * 1.3));
          for (let i = 0; i <= steps; i++) {
            const u = i / steps;
            const px = Math.round(x0 + dx * u);
            const py = Math.round(y0 + dy * u);
            // Bright tan raised edge along both sides of the fissure
            set(px, py - 1, 4);
            set(px - 1, py, 3);
            set(px + (thick ? 2 : 1), py, 3);
            set(px, py + (thick ? 2 : 1), 3);
          }
          for (let i = 0; i <= steps; i++) {
            const u = i / steps;
            const px = Math.round(x0 + dx * u);
            const py = Math.round(y0 + dy * u);
            // Thin 2 px dark fissure core
            set(px, py, 0);
            set(px + 1, py, 0);
            if (thick) set(px, py + 1, 1);
          }
        }
        const hubR = Math.max(3, Math.round(R * 0.08 * reachFrac));
        for (let dy = -hubR - 1; dy <= hubR + 1; dy++) {
          for (let dx = -hubR - 1; dx <= hubR + 1; dx++) {
            const d = Math.hypot(dx, dy / 0.68);
            if (d <= hubR) set(cx + dx, cy + dy, 0);
            else if (d <= hubR + 1.2) set(cx + dx, cy + dy, dy < 0 ? 4 : 3);
          }
        }
        const rays = 8;
        for (let i = 0; i < rays; i++) {
          const baseAng = (i / rays) * k.tau + (k.hash(i, seed, 1) - 0.5) * 0.42;
          const maxLen = R * (0.76 + k.hash(i, seed, 2) * 0.22) * reachFrac;
          const segs = 4;
          let px = cx;
          let py = cy;
          let ang = baseAng;
          for (let s = 1; s <= segs; s++) {
            ang += (k.hash(i * 11 + s, seed, 3) - 0.5) * 0.62;
            const stepLen = maxLen / segs;
            const nx = px + Math.cos(ang) * stepLen;
            const ny = py + Math.sin(ang) * stepLen * 0.66;
            crackSeg(px, py, nx, ny, s <= 2);
            if (s === 2 && reachFrac > 0.55) {
              const side = k.hash(i, seed, 5) > 0.5 ? 1 : -1;
              const fang = ang + side * (0.52 + k.hash(i, seed, 6) * 0.35);
              const flen = maxLen * 0.32;
              crackSeg(nx, ny, nx + Math.cos(fang) * flen, ny + Math.sin(fang) * flen * 0.66, false);
            }
            px = nx;
            py = ny;
          }
        }
      },
      false,
    );
  }

  // ---------------------------------------------------------------- 1. Conjure Fey
  // Conjure Fey: a two-square fairy ring of bright mushrooms and flowers erupts with green-white light and a tall outlined fey steps out and holds.
  FX.register('conjure-fey', {
    palette: FEY,
    travel: 220,
    beats: (event, kit, travel) => [
      { at: kit.CAST + travel, stop: 80, target: event.targets?.[0] ?? null, kind: 'soft', power: 0 },
    ],
    end: (event, travel) => k.CAST + travel + 1040,
    ground(s) {
      const t = s.area ? { x: s.area.x, y: s.area.y } : targetOf(s);
      if (!t) return;
      const e = s.c.t - k.CAST;
      if (e < 0) return;
      const C = k.P({ x: t.baseX ?? t.x, y: t.baseY ?? t.y });
      const grow = k.back(k.clamp(e / 200));
      const fade = 1 - k.clamp((e - 1020) / 240);
      if (fade <= 0) return;
      const rx = 16 * grow;
      const ry = 10 * grow;
      k.ellipse(C.x, C.y + 1, rx, ry, FEY[0], 3);
      k.ellipse(C.x, C.y, rx, ry, e < 340 ? k.WHITE : FEY[4], 2);
      k.ellipse(C.x, C.y, rx * 0.78, ry * 0.78, FEY[3], 1, 6, s.c.raw / 120);
      const count = 10;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * k.tau + 0.25;
        if (Math.sin(a) >= 0) continue;
        const pop = k.back(k.clamp((e - i * 14) / 140));
        if (pop <= 0.1) continue;
        const mx = C.x + Math.cos(a) * rx;
        const my = C.y + Math.sin(a) * ry - 3 * pop;
        const img = mushroomSprite(i % 2);
        k.blit(img, mx - img.width / 2, my - img.height / 2, fade);
      }
    },
    air(s) {
      const t = s.area ? { x: s.area.x, y: s.area.y } : targetOf(s);
      if (!t) return;
      const e = s.c.t - k.CAST;
      if (e < 0) return;
      const C = k.P({ x: t.baseX ?? t.x, y: t.baseY ?? t.y });
      const grow = k.back(k.clamp(e / 200));
      const fade = 1 - k.clamp((e - 1020) / 240);
      const rx = 16 * grow;
      const ry = 10 * grow;

      // Green-white light burst from the fairy ring
      const real = s.real(s.hits[0]);
      if (real >= 0 && real < 360) {
        const u = real / 360;
        const pillarH = 26 * k.ease(Math.min(1, u * 2.2));
        const pillarW = Math.round(14 * (1 - u * 0.7));
        if (pillarW >= 2) {
          for (let y = 0; y < pillarH; y += 2) {
            k.dot(C.x, C.y - y, FEY[0], pillarW + 2);
            k.dot(C.x, C.y - y, u < 0.35 ? k.WHITE : FEY[4], pillarW);
          }
        }
        k.drawHit(
          k.hitStyle('conjure-fey', FEY, { S: 44, spikes: 6, minor: 6, jag: 0.15 }),
          { x: C.x, y: C.y - 10 },
          real,
        );
        k.shards({ x: C.x, y: C.y - 8 }, real, FEY, (s.event.seed || 1) + 5, 10, 26);
      }

      // Outlined fey creature stepping out and holding
      if (e >= 190 && fade > 0) {
        const emerge = k.back(k.clamp((e - 190) / 170));
        const bob = Math.sin(s.c.raw / 150) * 1.4;
        const flap = Math.floor(s.c.raw / 110) % 2;
        const fey = feySprite(flap);
        const fy = C.y - 10 * emerge + bob - fey.height * 0.55;
        k.blit(fey, C.x - fey.width / 2, fy, fade);
      }

      // Front half of mushrooms & flowers framing the fey
      if (fade > 0) {
        const count = 10;
        for (let i = 0; i < count; i++) {
          const a = (i / count) * k.tau + 0.25;
          if (Math.sin(a) < 0) continue;
          const pop = k.back(k.clamp((e - i * 14) / 140));
          if (pop <= 0.1) continue;
          const mx = C.x + Math.cos(a) * rx;
          const my = C.y + Math.sin(a) * ry - 2 * pop;
          const img = mushroomSprite(i % 2);
          k.blit(img, mx - img.width / 2, my - img.height / 2, fade);
        }
      }

      // Rising golden-green firefly motes
      if (e >= 180) {
        for (let i = 0; i < 8; i++) {
          const u = ((e - 180) / 880 + k.hash(i, s.event.seed, 2) * 0.6) % 1;
          if (e > 980 && u > 0.7) continue;
          const ang = k.hash(i, s.event.seed, 3) * k.tau + u * 2.5;
          const mr = 8 + k.hash(i, s.event.seed, 4) * 10;
          const mx = C.x + Math.cos(ang) * mr;
          const my = C.y - u * 26;
          k.dot(mx, my, FEY[0], 3);
          k.dot(mx, my, i % 2 ? k.WHITE : STAR[3], 1);
        }
      }
    },
  });

  // ---------------------------------------------------------------- 2. Flesh To Stone
  // Flesh To Stone: pale outlined stone creeps up the whole token from the feet, wide cracks spread across it, and a clear marble statue holds.
  FX.register('flesh-to-stone', {
    palette: STONE,
    travel: 160,
    beats: (event, kit, travel) => {
      const tid = event.targets?.[0] ?? null;
      return [
        { at: kit.CAST + travel, stop: 60, target: tid, kind: 'soft', power: 0 },
        { at: kit.CAST + 560, stop: 110, target: tid, kind: 'hit', power: 0.05 },
      ];
    },
    end: () => k.CAST + 1240,
    ground(s) {
      const t = targetOf(s);
      if (!t) return;
      const e = s.c.t - k.CAST;
      if (e < 0) return;
      const F = k.P({ x: t.baseX, y: t.baseY });
      const grow = k.ease(k.clamp(e / 180));
      const fade = 1 - k.clamp((e - 1040) / 200);
      if (fade <= 0) return;
      k.ellipse(F.x, F.y + 1, 12 * grow, 6.5 * grow, STONE[0], 3);
      k.ellipse(F.x, F.y, 11 * grow, 6 * grow, STONE[4], 2);
      k.ellipse(F.x, F.y, 8 * grow, 4 * grow, STONE[5], 1, 4);
    },
    air(s) {
      const t = targetOf(s);
      if (!t) return;
      const e = s.c.t - k.CAST;
      if (e < 0) return;
      const F = k.P({ x: t.baseX, y: t.baseY });
      const B = k.P({ x: t.x, y: t.y });
      const fade = 1 - k.clamp((e - 1040) / 200);
      const creep = k.clamp(e / 520);
      const revealStep = Math.max(1, Math.min(6, Math.ceil(creep * 6)));
      const crackStage = e < 560 ? 0 : e < 700 ? 1 : 2;
      const img = statueSprite(revealStep, crackStage);
      const x0 = Math.round(F.x - img.width / 2);
      const y0 = Math.round(F.y - img.height + 3);

      if (fade > 0) {
        k.blit(img, x0, y0, fade);
        // Bright advancing stone dust sparks along the petrification front while creeping up
        if (revealStep < 6) {
          const frontY = y0 + Math.round(img.height * (1 - revealStep / 6));
          for (let i = 0; i < 4; i++) {
            const sx = F.x + (k.hash(i, Math.floor(s.c.raw / 55), s.event.seed) - 0.5) * 14;
            k.dot(sx, frontY - 1 - (i % 2), STONE[0], 3);
            k.dot(sx, frontY - 1 - (i % 2), STONE[5], 1);
          }
        }
      }

      // Beat 2: petrification snap flash + flying marble chips on real time
      const hit2 = s.hits[1];
      if (hit2) {
        const real = s.real(hit2);
        k.drawHit(k.hitStyle('flesh-stone', STONE, { S: 36, spikes: 6, jag: 0.35 }), B, real);
        k.shards(B, real, STONE, (s.event.seed || 2) + 9, 10, 22);
      }

      // Settling pale stone dust around the base
      if (e > 560 && e < 1160) {
        const u = (e - 560) / 600;
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * k.tau + 0.4;
          const r = 7 + k.ease(u) * 11;
          const dx = F.x + Math.cos(a) * r;
          const dy = F.y + Math.sin(a) * r * 0.45 - u * 4;
          if (u > 0.7 && i % 2) continue;
          k.dot(dx, dy, STONE[0], 4);
          k.dot(dx, dy, u < 0.4 ? STONE[5] : STONE[3], 2);
        }
      }
    },
  });

  // ---------------------------------------------------------------- 3. Investiture Of Stone
  // Investiture Of Stone: big pale grey and tan stone plates slam onto the caster into full-height armor while rocks erupt around the feet and a dust ring settles.
  FX.register('investiture-of-stone', {
    palette: ARMOR,
    travel: 280,
    beats: (event, kit, travel) => [{ at: kit.CAST + travel, stop: 120, target: null, kind: 'hit', power: 0.06 }],
    end: (event, travel) => k.CAST + travel + 960,
    ground(s) {
      const C = casterOf(s);
      const e = s.c.t - k.CAST;
      if (e < 0) return;
      const F = k.P({ x: C.baseX, y: C.baseY });
      const slamAt = 280;
      if (e < slamAt) return;
      const u = k.clamp((e - slamAt) / 680);
      const fade = 1 - k.clamp((e - 1040) / 200);
      if (fade <= 0) return;
      // Expanding & settling pale tan dust ring
      const rx = 12 + k.ease(u) * 14;
      const ry = rx * 0.54;
      k.ellipse(F.x, F.y + 1, rx, ry, ARMOR[0], u < 0.4 ? 3 : 2, u > 0.5 ? 7 : 0);
      k.ellipse(F.x, F.y, rx, ry, u < 0.25 ? k.WHITE : ARMOR[4], u < 0.4 ? 2 : 1, u > 0.5 ? 7 : 0);
      // Chunky rocks bursting outward behind the caster's feet
      for (let i = 0; i < 4; i++) {
        const a = Math.PI + ((i + 0.5) / 4) * Math.PI;
        const pop = k.back(k.clamp((e - slamAt) / 140));
        const rock = rockBurstSprite(i % 2);
        const bx = F.x + Math.cos(a) * (13 + 4 * pop);
        const by = F.y + Math.sin(a) * 6 - 2 * pop;
        k.blit(rock, bx - rock.width / 2, by - rock.height / 2, fade);
      }
    },
    air(s) {
      const C = casterOf(s);
      const e = s.c.t - k.CAST;
      if (e < 0) return;
      const F = k.P({ x: C.baseX, y: C.baseY });
      const B = k.P({ x: C.x, y: C.y });
      const slamAt = 280;
      const fade = 1 - k.clamp((e - 1040) / 200);

      // Act 1: 4 big pale grey & tan stone plates converging onto the caster
      if (e < slamAt) {
        const q = e / slamAt;
        const kIn = q * q * 0.65 + q * 0.35;
        const offsets = [
          [-24, -8],
          [24, -8],
          [0, -24],
          [0, 14],
        ];
        offsets.forEach(([ox, oy], i) => {
          const px = k.mix(B.x + ox, B.x, kIn);
          const py = k.mix(B.y + oy, B.y, kIn);
          const plate = stonePlateSprite(i);
          k.blit(plate, px - plate.width / 2, py - plate.height / 2);
        });
        return;
      }

      // Act 2 & 3: clear full-height pale stone armor holding on the caster
      if (fade > 0) {
        const glint = e > slamAt + 220 && e < slamAt + 360 ? 1 : 0;
        const armor = stoneArmorSprite(glint);
        const pop = k.back(k.clamp((e - slamAt) / 110));
        k.blit(armor, F.x - armor.width / 2, F.y - armor.height + 3 - (pop - 1) * 3, fade);

        // Wide ring of chunky bursting rocks around the feet (kept clear of the armor torso)
        for (let i = 0; i < 4; i++) {
          const a = 0.25 + (i / 3) * (Math.PI - 0.5);
          const rpop = k.back(k.clamp((e - slamAt - i * 15) / 130));
          const rock = rockBurstSprite(i % 2);
          const bx = F.x + Math.cos(a) * (14 + 3 * rpop);
          const by = F.y + Math.sin(a) * 6 + 1;
          k.blit(rock, bx - rock.width / 2, by - rock.height / 2, fade);
        }
      }

      // Slam flash + flying pale stone shards on real time
      const real = s.real(s.hits[0]);
      k.drawHit(k.hitStyle('invest-stone', ARMOR, { S: 38, spikes: 6, jag: 0.35 }), B, real);
      k.shards(B, real, STONE, (s.event.seed || 3) + 7, 10, 24);
    },
  });

  // ---------------------------------------------------------------- 4. Magic Jar
  // Magic Jar: a big glowing pale-blue glass jar appears at the caster, the caster's bright white soul streams into it, and it flashes and holds.
  FX.register('magic-jar', {
    palette: JAR,
    travel: 480,
    beats: (event, kit, travel) => [{ at: kit.CAST + travel, stop: 100, target: null, kind: 'soft', power: 0 }],
    end: (event, travel) => k.CAST + travel + 820,
    ground(s) {
      const C = casterOf(s);
      const e = s.c.t - k.CAST;
      if (e < 0) return;
      const F = k.P({ x: C.baseX, y: C.baseY });
      const fade = 1 - k.clamp((e - 1100) / 200);
      if (fade <= 0) return;
      const pulse = 1 + 0.08 * Math.sin(s.c.raw / 90);
      k.ellipse(F.x, F.y + 1, 13 * pulse, 7 * pulse, JAR[0], 2);
      k.ellipse(F.x, F.y, 13 * pulse, 7 * pulse, e > 460 && e < 600 ? k.WHITE : JAR[4], 1, 5, s.c.raw / 100);
    },
    air(s) {
      const C = casterOf(s);
      const e = s.c.t - k.CAST;
      if (e < 0) return;
      const B = k.P({ x: C.x, y: C.y });
      const J = { x: B.x + 14, y: B.y - 5 };
      const sealAt = 480;
      const fade = 1 - k.clamp((e - 1100) / 200);
      if (fade <= 0) return;

      const bob = Math.sin(s.c.raw / 150) * 1.4;
      const appear = k.back(k.clamp(e / 130));
      const jarState = e < sealAt ? 0 : e < sealAt + 95 ? 2 : 1;
      const jar = magicJarSprite(jarState);
      const jy = J.y + bob - (1 - appear) * 6;

      // Glowing pale-blue halo behind the sealed jar
      if (e >= sealAt) {
        const haloR = 11.5 + Math.sin(s.c.raw / 110) * 1.4;
        k.ellipse(J.x, jy, haloR, haloR * 1.05, JAR[0], 2, 6, s.c.raw / 120);
        k.ellipse(J.x, jy, haloR, haloR * 1.05, JAR[4], 1, 6, s.c.raw / 120);
      }
      k.blit(jar, J.x - jar.width / 2, jy - jar.height / 2, fade);

      // Act 1: Caster's soul (bright white wisp) streaming cleanly into the open jar mouth
      if (e >= 30 && e < sealAt + 20) {
        const q = k.clamp((e - 30) / (sealAt - 30));
        const mouth = { x: J.x, y: jy - 7 };
        const wispAt = u => {
          const arc = Math.sin(u * Math.PI) * 12;
          return {
            x: k.mix(B.x - 1, mouth.x, u),
            y: k.mix(B.y, mouth.y, u) - arc,
          };
        };
        for (let i = 12; i >= 1; i--) {
          const u = q - i * 0.042;
          if (u <= 0) continue;
          const p = wispAt(u);
          const sz = i < 4 ? 4 : i < 8 ? 3 : 2;
          k.dot(p.x, p.y, JAR[0], sz + 2);
          k.dot(p.x, p.y, i < 5 ? k.WHITE : i < 9 ? JAR[4] : JAR[3], sz);
        }
        const head = wispAt(q);
        k.disc(head.x, head.y, 4.5, JAR[0]);
        k.disc(head.x, head.y, 3.5, JAR[4]);
        k.disc(head.x, head.y, 2.2, k.WHITE);
      }

      // Act 2: Seal flash + starburst on real time
      const real = s.real(s.hits[0]);
      if (real >= 0 && real < 360) {
        const u = real / 360;
        const r = 7 + k.ease(u) * 15;
        k.ellipse(J.x, jy, r, r, JAR[0], 3, u > 0.5 ? 8 : 0);
        k.ellipse(J.x, jy, r, r, u < 0.35 ? k.WHITE : JAR[4], 1, u > 0.5 ? 8 : 0);
      }
      k.drawHit(k.hitStyle('magic-jar', JAR, { S: 40, spikes: 4, minor: 4, jag: 0.1 }), { x: J.x, y: jy }, real);
      k.shards({ x: J.x, y: jy }, real, JAR, (s.event.seed || 4) + 3, 8, 20);
    },
  });

  // ---------------------------------------------------------------- 5. Crown Of Stars
  // Crown Of Stars: a halo of 7 bright white-gold stars circles above the caster's head and holds while one star streaks off to burst on the target.
  FX.register('crown-of-stars', {
    palette: STAR,
    travel: 560,
    beats: (event, kit, travel) => [
      { at: kit.CAST + travel, stop: 95, target: event.targets?.[0] ?? null, kind: 'hit', power: 0.07 },
    ],
    end: (event, travel) => k.CAST + travel + 640,
    flash: (event, e) => (e < 30 ? { color: '#fff4c8', alpha: 0.16 } : null),
    air(s) {
      const C = casterOf(s);
      const t = targetOf(s);
      const e = s.c.t - k.CAST;
      if (e < 0) return;
      const head = k.P({ x: C.baseX, y: C.baseY - 1.25 * C.span });
      const fade = 1 - k.clamp((e - 1020) / 180);
      const launchAt = 300;
      const arriveAt = 560;
      const expand = k.back(k.clamp(e / 140));
      const rx = 14 * expand;
      const ry = 4.8 * expand;
      const spin = s.c.raw / 420;

      if (fade > 0) {
        k.ellipse(head.x, head.y, rx, ry, STAR[0], 2, 7, spin * 2);
        k.ellipse(head.x, head.y, rx, ry, STAR[3], 1, 7, spin * 2);
      }

      const stars = [];
      for (let i = 0; i < 7; i++) {
        if (i === 0 && e >= launchAt) continue;
        const a = (i / 7) * k.tau + spin;
        stars.push({
          i,
          x: head.x + Math.cos(a) * rx,
          y: head.y + Math.sin(a) * ry,
          z: Math.sin(a),
        });
      }
      stars.sort((a, b) => a.z - b.z);
      if (fade > 0) {
        for (const st of stars) {
          const twinkle = (Math.floor(s.c.raw / 95) + st.i) % 2;
          const img = starMoteSprite(twinkle);
          k.blit(img, st.x - img.width / 2, st.y - img.height / 2, fade);
        }
      }

      if (t) {
        const T = k.P(k.contact(t, s.pose.hand || C));
        const startA = launchAt / 420;
        const S0 = { x: head.x + Math.cos(startA) * 14, y: head.y + Math.sin(startA) * 4.8 };
        if (e >= launchAt && e < arriveAt) {
          const q = (e - launchAt) / (arriveAt - launchAt);
          const u = q * q * 0.4 + q * 0.6;
          const at = v => ({
            x: k.mix(S0.x, T.x, v),
            y: k.mix(S0.y, T.y, v) - Math.sin(v * Math.PI) * 12,
          });
          for (let j = 11; j >= 1; j--) {
            const v = u - j * 0.032;
            if (v <= 0) continue;
            const p = at(v);
            const sz = j < 4 ? 4 : j < 8 ? 3 : 2;
            k.dot(p.x, p.y, STAR[0], sz + 2);
            k.dot(p.x, p.y, j < 4 ? k.WHITE : j < 8 ? STAR[4] : STAR[3], sz);
          }
          const headP = at(u);
          const img = starMoteSprite(1);
          k.blit(img, headP.x - img.width / 2, headP.y - img.height / 2);
        }

        const real = s.real(s.hits[0]);
        if (real >= 0 && real < 340) {
          const ru = real / 340;
          const rr = 6 + k.ease(ru) * 18;
          k.ellipse(T.x, T.y, rr, rr * 0.85, STAR[0], 3, ru > 0.45 ? 8 : 0);
          k.ellipse(T.x, T.y, rr, rr * 0.85, ru < 0.3 ? k.WHITE : STAR[4], 1, ru > 0.45 ? 8 : 0);
        }
        k.drawHit(k.hitStyle('crown-star', STAR, { S: 44, spikes: 4, minor: 4, jag: 0.12 }), T, real);
        k.shards(T, real, STAR, (s.event.seed || 5) + 11, 10, 26);
      }
    },
  });

  // ---------------------------------------------------------------- 6. Mordenkainen's Sword
  // Mordenkainen's Sword: a huge white-violet spectral greatsword appears beside the target, whips through a wide glowing arc and strikes with a slash flash.
  FX.register('mordenkainens-sword', {
    palette: SWORD,
    travel: 360,
    beats: (event, kit, travel) => [
      { at: kit.CAST + travel, stop: 120, target: event.targets?.[0] ?? null, kind: 'hit', power: 0.08 },
    ],
    end: (event, travel) => k.CAST + travel + 780,
    flash: (event, e) =>
      e < 32 ? { color: '#f4e6ff', alpha: 0.22 } : e < 64 ? { color: '#140624', alpha: 0.18 } : null,
    ground(s) {
      const t = targetOf(s);
      if (!t) return;
      const e = s.c.t - k.CAST;
      if (e < 0 || e > 420) return;
      const F = k.P({ x: t.baseX - 0.85, y: t.baseY });
      const u = e / 420;
      const r = 10 * k.ease(Math.min(1, u * 3));
      k.ellipse(F.x, F.y + 1, r, r * 0.55, SWORD[0], 2, u > 0.6 ? 6 : 0);
      k.ellipse(F.x, F.y, r, r * 0.55, u < 0.35 ? k.WHITE : SWORD[4], 1, u > 0.6 ? 6 : 0);
    },
    air(s) {
      const t = targetOf(s);
      if (!t) return;
      const e = s.c.t - k.CAST;
      if (e < 0) return;
      const T = k.P({ x: t.x, y: t.y });
      const pivot = { x: T.x - 15, y: T.y - 4 };
      const windEnd = 240;
      const strikeAt = 360;
      const fade = 1 - k.clamp((e - 940) / 200);

      // Wide sweeping white-violet slash crescent arc
      if (e >= windEnd && e < strikeAt + 240) {
        const u = k.clamp((e - windEnd) / (strikeAt - windEnd));
        const arcFade = e <= strikeAt ? 1 : 1 - (e - strikeAt) / 240;
        const a0 = -2.1;
        const a1 = k.mix(a0, 0.78, k.ease(u));
        const tailA = Math.max(a0, a1 - 1.75 * arcFade);
        const steps = 24;
        for (const [col, w, rOff] of [
          [SWORD[0], 7, 0],
          [SWORD[3], 5, -1],
          [SWORD[4], 3, 0],
          [k.WHITE, 2, 1],
        ]) {
          for (let i = 0; i <= steps; i++) {
            const ang = k.mix(tailA, a1, i / steps);
            const r = 23 + rOff;
            k.dot(pivot.x + Math.cos(ang) * r, pivot.y + Math.sin(ang) * r, col, w);
          }
        }
      }

      // Huge 30 px spectral greatsword: wind-up -> wide swing -> held follow-through
      if (fade > 0) {
        let angle;
        let ox = 0;
        let oy = 0;
        if (e < windEnd) {
          const u = k.ease(e / windEnd);
          angle = k.mix(-1.55, -2.18, u);
          oy = -(1 - u) * 5;
        } else if (e < strikeAt) {
          const u = k.ease((e - windEnd) / (strikeAt - windEnd));
          angle = k.mix(-2.18, 0.72, u);
          ox = Math.sin(u * Math.PI) * 3;
        } else {
          const u = k.clamp((e - strikeAt) / 220);
          angle = k.mix(0.72, 0.42, k.ease(u));
          oy = Math.sin(s.c.raw / 160) * 1.5;
        }
        const gleam = e > 80 && e < 210 ? 1 : e >= strikeAt && e < strikeAt + 140 ? 1 : 0;
        const sword = spectralSwordSprite(gleam);
        if (fade >= 0.75 || Math.floor(s.c.raw / 55) % 2 === 0) {
          k.blitRotated(sword, pivot.x + ox, pivot.y + oy, angle, 0.22, 0.5);
        }
      }

      // Diagonal slash flash + hit star + sparks on real time
      const real = s.real(s.hits[0]);
      if (real >= 0 && real < 220) {
        const su = real / 220;
        const len = 15 * (1 - su * 0.45);
        const w = su < 0.35 ? 3 : 2;
        outlinedStroke(
          T.x - len,
          T.y - len * 0.7,
          T.x + len,
          T.y + len * 0.7,
          SWORD[0],
          su < 0.45 ? k.WHITE : SWORD[4],
          w,
        );
      }
      k.drawHit(k.hitStyle('mord-sword', SWORD, { S: 46, spikes: 4, minor: 4, jag: 0.2 }), T, real);
      k.shards(T, real, SWORD, (s.event.seed || 6) + 13, 10, 26);
    },
  });

  // ---------------------------------------------------------------- 7. Regenerate
  // Regenerate: bright green-gold light spirals up the target's whole body while a big outlined healing plus pulses on the token and leaves and motes rise.
  FX.register('regenerate', {
    palette: REGEN,
    travel: 200,
    beats: (event, kit, travel) => {
      const tid = event.targets?.[0] ?? null;
      return [
        { at: kit.CAST + travel, stop: 65, target: tid, kind: 'soft', power: 0 },
        { at: kit.CAST + 560, stop: 55, target: tid, kind: 'soft', power: 0 },
      ];
    },
    end: () => k.CAST + 1220,
    ground(s) {
      const t = targetOf(s);
      if (!t) return;
      const e = s.c.t - k.CAST;
      if (e < 0) return;
      const F = k.P({ x: t.baseX, y: t.baseY });
      const grow = k.ease(k.clamp(e / 180));
      const fade = 1 - k.clamp((e - 1020) / 200);
      if (fade <= 0) return;
      const pulse = 1 + 0.08 * Math.sin(s.c.raw / 100);
      k.ellipse(F.x, F.y + 1, 14 * grow * pulse, 8 * grow * pulse, REGEN[0], 3);
      k.ellipse(F.x, F.y, 14 * grow * pulse, 8 * grow * pulse, REGEN[4], 2);
      k.ellipse(F.x, F.y, 10 * grow, 5.5 * grow, STAR[3], 1, 6, s.c.raw / 110);
    },
    air(s) {
      const t = targetOf(s);
      if (!t) return;
      const e = s.c.t - k.CAST;
      if (e < 0) return;
      const F = k.P({ x: t.baseX, y: t.baseY });
      const B = k.P({ x: t.x, y: t.y });
      const fade = 1 - k.clamp((e - 1020) / 200);

      // Twin bright green-gold ribbons spiraling up the target's whole body
      if (fade > 0) {
        const climb = k.ease(k.clamp(e / 240));
        const height = 24 * climb;
        const spin = s.c.raw / 130;
        for (let strand = 0; strand < 2; strand++) {
          const fillCol = strand ? STAR[3] : REGEN[4];
          const hiCol = strand ? STAR[4] : k.WHITE;
          for (let h = 0; h <= height; h += 1.5) {
            const ang = h * 0.34 + spin + strand * Math.PI;
            const r = 10.5 * (1 - (h / 28) * 0.25);
            const sx = F.x + Math.cos(ang) * r;
            const sy = F.y + 2 - h;
            k.dot(sx, sy, REGEN[0], 4);
            k.dot(sx, sy, Math.sin(ang) > 0 ? hiCol : fillCol, 2);
          }
        }
      }

      // Big outlined healing plus pulsing like a heartbeat over the token and holding
      if (e >= 180 && fade > 0) {
        const pop = k.back(k.clamp((e - 180) / 110));
        const beat1 = e >= 180 && e < 330;
        const beat2 = e >= 550 && e < 720;
        const pulsing = beat1 || beat2 ? 1 : 0;
        const plus = healPlusSprite(pulsing);
        const py = B.y - 2 - (1 - pop) * 5;
        k.blit(plus, B.x - plus.width / 2, py - plus.height / 2, fade);

        for (const hit of s.hits) {
          const real = s.real(hit);
          if (real >= 0 && real < 300) {
            const u = real / 300;
            const rr = 8 + k.ease(u) * 14;
            k.ellipse(B.x, B.y - 2, rr, rr, REGEN[0], 3, u > 0.5 ? 8 : 0);
            k.ellipse(B.x, B.y - 2, rr, rr, u < 0.35 ? k.WHITE : STAR[3], 1, u > 0.5 ? 8 : 0);
          }
        }
      }

      // Rising bright green leaves and golden motes
      for (let i = 0; i < 10; i++) {
        const u = (e / 960 + k.hash(i, s.event.seed, 1) * 0.75) % 1;
        if (e > 960 && u > 0.65) continue;
        const side = (k.hash(i, s.event.seed, 2) - 0.5) * 24;
        const sway = Math.sin(u * 8 + i) * 3;
        const lx = F.x + side + sway;
        const ly = F.y + 1 - u * 28;
        if (i % 2 === 0) {
          k.dot(lx, ly, REGEN[0], 4);
          k.dot(lx, ly, REGEN[3], 2);
          k.dot(lx - 0.5, ly - 0.5, REGEN[4], 1);
        } else {
          k.dot(lx, ly, STAR[0], 3);
          k.dot(lx, ly, i % 3 === 1 ? k.WHITE : STAR[3], 1);
        }
      }
    },
  });

  // ---------------------------------------------------------------- 8. Earthquake (Lasting)
  // Earthquake: thinner 2 px dark fissures with bright tan edges spread on the ground under figures with light dust puffs and shaking; calm cracks linger.
  function quakeZone(s) {
    if (s.area) {
      const rCells = Math.min(8, Math.max(2.2, (s.area.feet || 20) / (s.grid.feet || 5)));
      return { x: s.area.x, y: s.area.y, r: Math.round(rCells * k.PX) };
    }
    const t = s.targets[0] || s.pose.target || s.pose.base;
    return { x: t.baseX ?? t.x, y: t.baseY ?? t.y, r: 44 };
  }
})(typeof window !== 'undefined' ? window : globalThis);
