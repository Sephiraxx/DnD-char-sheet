/* Pixel spells, batch 63: second-pass readability rebuild (11 spells). */
(function (root) {
  'use strict';
  const FX = root.BoardPixelFX;
  if (!FX) return;
  const k = FX.kit;

  // High-contrast 6-step ramps: [outline, deep, mid, bright, pale, white]
  const VIOLET = ['#140624', '#461a7a', '#8c3ee0', '#cf86ff', '#f3dcff', '#ffffff'];
  const PSYCHIC = ['#1c0618', '#6a1a5e', '#b23a91', '#ff88ce', '#ffe2f7', '#ffffff'];
  const GOLD = ['#261404', '#7a4a0c', '#d8961e', '#ffd44c', '#fff4b8', '#ffffff'];
  const BIRD = ['#141a26', '#4a5c78', '#8ba6c9', '#cce2f7', '#f0f8ff', '#ffffff'];
  const SILVER = ['#121820', '#3d4d5e', '#7c96ad', '#c2d8ea', '#edf6fc', '#ffffff'];
  const WATER = ['#0a1d30', '#18548a', '#3594d8', '#8ad6ff', '#e4f8ff', '#ffffff'];
  const ILLUSION = ['#1a0b2e', '#4b2a85', '#8c62d8', '#cca8ff', '#f2e8ff', '#ffffff'];
  const WIND = ['#101d2c', '#2c5273', '#6196bd', '#a9d7f2', '#e8f7ff', '#ffffff'];
  const AWAKEN = ['#101e0a', '#2d5c18', '#66a82a', '#b6e64e', '#f2ffa8', '#ffffff'];
  const BLOOD = ['#24060a', '#78101c', '#cc2233', '#ff5a66', '#ffb8be', '#ffffff'];
  const CLAY = ['#1e120c', '#6e452e', '#b87e58', '#ebba8e', '#fff0d6', '#ffffff'];
  const PUFF = ['#1c1820', '#544d5c', '#918899', '#d2ccd8', '#f5f2f7', '#ffffff'];
  const DUST_PAL = ['#2e2218', '#6e5840', '#b09674', '#e3d0ad', '#f7ecd6', '#ffffff'];

  // Shared pixel helpers
  function sparkle(x, y, r, color, outline, core) {
    if (r < 1) return;
    const n = Math.round(r);
    k.dot(x, y, outline, 3);
    for (let i = 1; i <= n; i++) {
      k.dot(x + i, y, outline, 3);
      k.dot(x - i, y, outline, 3);
      k.dot(x, y + i, outline, 3);
      k.dot(x, y - i, outline, 3);
    }
    for (let i = 1; i <= n; i++) {
      k.dot(x + i, y, color, 1);
      k.dot(x - i, y, color, 1);
      k.dot(x, y + i, color, 1);
      k.dot(x, y - i, color, 1);
    }
    k.dot(x, y, core || k.WHITE, 2);
  }

  function strokeLine(x0, y0, x1, y1, color, size, step = 1, dash = 0, phase = 0) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const L = Math.hypot(dx, dy);
    if (L < 0.5) return;
    const n = Math.max(1, Math.ceil(L / step));
    for (let i = 0; i <= n; i++) {
      if (dash && Math.floor((i * step) / dash + phase) % 2) continue;
      const u = i / n;
      k.dot(x0 + dx * u, y0 + dy * u, color, size);
    }
  }

  function targetFeet(t) {
    return { x: t.baseX ?? t.x, y: t.baseY ?? t.y };
  }

  function buffTargets(s) {
    if (s.targets?.length) return s.targets;
    if (s.pose?.base)
      return [
        {
          id: null,
          x: s.pose.base.x,
          y: s.pose.base.y - 0.35,
          baseX: s.pose.base.x,
          baseY: s.pose.base.y,
          span: s.pose.base.span || 1,
        },
      ];
    return [];
  }

  // Cached sprite builders
  function portalSprite(frame) {
    // 22x26 bright violet pocket portal with crisp 2 px white rim and swirling inner vortex
    const ph = (frame % 4) * (Math.PI / 2);
    return k.sprite(`b63:portal:${frame % 4}`, 22, 26, VIOLET, set => {
      const cx = 11;
      const cy = 13;
      const rx = 8.5;
      const ry = 10.5;
      for (let y = 1; y < 25; y++) {
        for (let x = 1; x < 21; x++) {
          const nx = (x - cx) / rx;
          const ny = (y - cy) / ry;
          const d = Math.hypot(nx, ny);
          if (d > 1) continue;
          if (d > 0.78) {
            set(x, y, 5); // crisp white rim
            continue;
          }
          if (d < 0.24) {
            set(x, y, 1); // deep pocket core
            continue;
          }
          const ang = Math.atan2(ny, nx) + ph;
          const swirl = Math.sin(ang * 3 + d * 6.5);
          set(x, y, swirl > 0.35 ? 4 : swirl > -0.25 ? 3 : 2);
        }
      }
    });
  }

  function relicSprite(f) {
    // 14x14 bright gold/white outlined ornate chalice/relic glyph
    const art = [
      '....wwwwww....',
      '...wppppppw...',
      '..wppbbbbppw..',
      '..wppwwwwppw..',
      '...wppbbppw...',
      '....wppppw....',
      '.....wbbw.....',
      '.....wppw.....',
      '....wppppw....',
      '...wppbbppw...',
      '..wwwwwwwwww..',
      '..............',
    ];
    const flip = f % 2 === 1;
    return k.sprite(`b63:relic:${f % 2}`, 16, 16, GOLD, set => {
      const map = { b: 3, p: 4, w: 5 };
      for (let y = 0; y < art.length; y++) {
        for (let x = 0; x < art[y].length; x++) {
          const ch = art[y][x];
          if (ch === '.') continue;
          const px = flip ? 14 - x : x + 1;
          set(px, y + 2, map[ch]);
        }
      }
    });
  }

  function thoughtBubbleSprite(sym) {
    // 26x20 puffy white thought cloud with bright psychic symbol inside
    const pal = [PSYCHIC[0], PSYCHIC[2], PSYCHIC[3], PSYCHIC[4], k.WHITE, PSYCHIC[1]];
    return k.sprite(`b63:thought:${sym}`, 26, 20, pal, set => {
      const puffs = [
        [7, 9, 5.2],
        [13, 6, 5.6],
        [19, 9, 5.2],
        [10, 12, 4.8],
        [16, 12, 4.8],
        [13, 10, 5.2],
      ];
      for (let y = 1; y < 19; y++) {
        for (let x = 1; x < 25; x++) {
          let inside = false;
          for (const [cx, cy, r] of puffs) {
            if (Math.hypot(x - cx, y - cy) <= r) {
              inside = true;
              break;
            }
          }
          if (!inside) continue;
          set(x, y, y > 13 ? 3 : 4);
        }
      }
      if (sym === 0) {
        // Psychic eye
        for (let dx = -5; dx <= 5; dx++) {
          const h = Math.round((1 - (dx / 5.5) ** 2) * 3);
          set(13 + dx, 10 - h, 1);
          set(13 + dx, 10 + h, 1);
          for (let dy = -h + 1; dy < h; dy++) set(13 + dx, 10 + dy, 2);
        }
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) set(13 + dx, 10 + dy, 5);
        set(12, 9, 4);
      } else if (sym === 1) {
        // Psychic wave/pulse
        for (let dx = -6; dx <= 6; dx++) {
          const wy = Math.round(Math.sin(dx * 0.85) * 2.5);
          set(13 + dx, 10 + wy, 1);
          set(13 + dx, 11 + wy, 2);
          set(13 + dx, 9 + wy, 2);
        }
      } else {
        // Bold '?' glyph
        const q = ['..1111..', '.122221.', '.12..12.', '....121.', '...121..', '...12...', '........', '...12...'];
        for (let y = 0; y < q.length; y++)
          for (let x = 0; x < q[y].length; x++) {
            const ch = q[y][x];
            if (ch === '1') set(9 + x, 6 + y, 1);
            else if (ch === '2') set(9 + x, 6 + y, 2);
          }
      }
    });
  }

  function coinSprite(frame) {
    // 22x22 big gold coin across 4 spin widths + bold white shine
    const widths = [9.4, 7.0, 4.6, 7.0];
    const rx = widths[frame % 4];
    const ry = 9.4;
    return k.sprite(`b63:coin2:${frame % 4}`, 22, 22, GOLD, set => {
      const cx = 11;
      const cy = 11;
      for (let y = 1; y < 21; y++) {
        for (let x = 1; x < 21; x++) {
          const nx = (x - cx) / rx;
          const ny = (y - cy) / ry;
          const d = Math.hypot(nx, ny);
          if (d > 1) continue;
          let idx = 3;
          if (d > 0.78) idx = nx + ny < 0 ? 5 : 2;
          else if (nx + ny < -0.3) idx = 4;
          else if (nx + ny > 0.55) idx = 2;
          const diag = x - cx + (y - cy);
          if (Math.abs(diag + 3 - (frame % 4) * 1.3) <= 1.5 && d < 0.88) idx = 5;
          set(x, y, idx);
        }
      }
      if (rx >= 6.5) {
        for (let i = -4; i <= 4; i++) {
          set(cx + Math.round(i * (rx / 9.4)), cy, 5);
          set(cx, cy + i, 5);
        }
        set(cx - 1, cy - 1, 5);
        set(cx + 1, cy + 1, 2);
      }
    });
  }

  function speechBubbleSprite(frame) {
    // 26x22 big white speech bubble with tail + animated bright golden squiggle
    const pal = [GOLD[0], GOLD[1], GOLD[2], GOLD[3], GOLD[4], k.WHITE];
    return k.sprite(`b63:speech:${frame % 3}`, 26, 22, pal, set => {
      for (let y = 2; y <= 15; y++) {
        for (let x = 2; x <= 23; x++) {
          const corner = (x <= 3 || x >= 22) && (y <= 3 || y >= 14) && (x === 2 || x === 23) && (y === 2 || y === 15);
          if (corner) continue;
          set(x, y, y >= 14 ? 4 : 5);
        }
      }
      for (let ty = 0; ty < 5; ty++) {
        const w = 4 - ty;
        for (let tx = 0; tx < w; tx++) set(10 + tx, 16 + ty, ty >= 3 ? 4 : 5);
      }
      const shift = (frame % 3) * 1.1;
      for (let x = 5; x <= 20; x++) {
        const wy = Math.round(8.5 + Math.sin(x * 0.72 + shift) * 2.4);
        set(x, wy - 1, 3);
        set(x, wy, 2);
        set(x, wy + 1, 3);
      }
      set(21, 7, 2);
      set(21, 8, 3);
      set(21, 10, 2);
    });
  }

  function birdSprite(wingFrame, flipX) {
    // 28x18 bright white bird a whole square+ across, wide spread wings
    const frames = [
      // 0: wings swept high & wide
      [
        '.wwwwww..........wwwwww.',
        'wppppwww........wwwppppw',
        'wbbpppwww......wwwpppbbw',
        '.wbbpppwww....wwwpppbbw.',
        '..wbbpppwwwwwwwwpppbbw..',
        '...wwppppwwwwwwppppww...',
        '....wwppwwwwwwwwppww....',
        '.....wwwwwwwwwwwwwwwg...',
        '....wppwwwwwwwwwwppwgg..',
        '...wbbppwwwwwwwwppw.....',
        '..wbbpwwwwbbbbwwww......',
        '.wwwww...wwwwww.........',
      ],
      // 1: wings wide horizontal
      [
        '........................',
        '.wwwwwww........wwwwwww.',
        'wppppppww......wwppppppw',
        'wbbpppppwwwwwwwwpppppbbw',
        'wbbpppppwwwwwwwwpppppbbw',
        '.wwbbpppwwwwwwwwpppbbww.',
        '...wwwppwwwwwwwwppwwwg..',
        '.....wwwwwwwwwwwwwwwgg..',
        '....wppwwppppppwwppw....',
        '...wbbwwwwbbbbwwww......',
        '..wwwww..wwwwww.........',
        '........................',
      ],
      // 2: wings swept gracefully down & wide
      [
        '........................',
        '.......wwwwwwwwww.......',
        '.....wwppppppppppww.....',
        '....wwppwwwwwwwwppwwg...',
        '...wppwwwwwwwwwwwwppgg..',
        '..wppwwwppwwwwppwwwppw..',
        '.wppwwwpppwwwwpppwwwppw.',
        'wbbwwwppbbwwwwbbppwwwbbw',
        'wbbwwwpbb......bbpwwwbbw',
        '.wwww.ww........ww.wwww.',
        '........................',
        '........................',
      ],
    ];
    const pal = [BIRD[0], BIRD[2], BIRD[3], BIRD[4], k.WHITE, GOLD[3]];
    const map = { b: 2, p: 3, w: 4, g: 5 };
    const art = frames[wingFrame % 3];
    return k.sprite(`b63:bird2:${wingFrame % 3}:${flipX ? 1 : 0}`, 26, 16, pal, set => {
      for (let y = 0; y < art.length; y++) {
        for (let x = 0; x < art[y].length; x++) {
          const ch = art[y][x];
          if (ch === '.') continue;
          const px = flipX ? 24 - x : x + 1;
          set(px, y + 2, map[ch]);
        }
      }
    });
  }

  function mistPuffSprite(variant) {
    // 11x11 cached pale silver mist puff with dark outline (keeps Pass Without Trace super cheap)
    const r = variant === 0 ? 4.4 : 3.6;
    return k.sprite(`b63:mpuff:${variant}`, 11, 11, SILVER, set => {
      for (let y = 1; y < 10; y++) {
        for (let x = 1; x < 10; x++) {
          const d = Math.hypot(x - 5, y - 5);
          if (d > r) continue;
          set(x, y, y < 5 ? 5 : d < r * 0.7 ? 4 : 3);
        }
      }
    });
  }

  function footprintSprite() {
    // 7x8 crisp outlined silver footprint pair on the ground
    const art = ['.ww...', 'wppw..', '.pp...', '..ww..', '..wppw', '...pp.'];
    return k.sprite('b63:fprint', 8, 8, SILVER, set => {
      for (let y = 0; y < art.length; y++) {
        for (let x = 0; x < art[y].length; x++) {
          const ch = art[y][x];
          if (ch === 'w') set(x + 1, y + 1, 5);
          else if (ch === 'p') set(x + 1, y + 1, 4);
        }
      }
    });
  }

  function waterDiscSprite(frame) {
    // 30x20 glowing blue-white water disc holding under the token
    return k.sprite(`b63:wdisc2:${frame % 4}`, 30, 20, WATER, set => {
      const cx = 15;
      const cy = 10;
      const rx = 13;
      const ry = 8.2;
      for (let y = 1; y < 19; y++) {
        for (let x = 1; x < 29; x++) {
          const d = Math.hypot((x - cx) / rx, (y - cy) / ry);
          if (d > 1) continue;
          let idx = d > 0.76 ? 4 : d > 0.45 ? 3 : 2;
          if (d > 0.87) idx = 5;
          const wave = Math.sin((x - cx) * 0.5 + (y - cy) * 0.8 + frame * 1.57);
          if (wave > 0.7 && d < 0.84) idx = 5;
          else if (wave > 0.32 && d < 0.78) idx = 4;
          set(x, y, idx);
        }
      }
    });
  }

  function veilSprite(frame) {
    // 24x26 big pale shimmering veil (over a whole square) with rippling folds
    const pal = [ILLUSION[0], ILLUSION[2], ILLUSION[3], ILLUSION[4], k.WHITE, '#9cf6ff', '#fface8'];
    return k.sprite(`b63:veil2:${frame % 4}`, 24, 26, pal, set => {
      const ph = (frame % 4) * 1.57;
      for (let y = 2; y <= 23; y++) {
        const u = (y - 2) / 21;
        const sway = Math.sin(u * 4.4 + ph) * 1.6;
        const half = 7.4 + u * 2.4;
        for (let x = 2; x <= 21; x++) {
          const dx = x - (11.5 + sway);
          if (Math.abs(dx) > half) continue;
          if (y >= 22 && Math.abs(Math.sin((dx + 6) * 1.3 + ph)) < 0.45) continue;
          const fold = Math.sin(dx * 0.8 + u * 3 + ph);
          let idx = fold > 0.4 ? 4 : fold > -0.25 ? 3 : 2;
          if (Math.abs(dx) > half - 1.3 || y <= 3) idx = 4;
          const band = y - 6 - (frame % 4) * 4 + dx * 0.35;
          if (Math.abs(band) < 1.3) idx = 5;
          else if (Math.abs(band + 6) < 1.1) idx = 6;
          set(x, y, idx);
        }
      }
    });
  }

  function tintWashSprite(colorIdx) {
    // 18x20 translucent colour-tint silhouette flash over the token (magenta, aqua, gold)
    const pal = [ILLUSION[0], '#ff7ce0', '#7af4ff', '#ffe86b'];
    const ci = (colorIdx % 3) + 1;
    return k.sprite(
      `b63:tint:${ci}`,
      18,
      20,
      pal,
      set => {
        for (let y = 1; y < 19; y++) {
          for (let x = 1; x < 17; x++) {
            const d = Math.hypot((x - 8.5) / 7.2, (y - 9.5) / 8.5);
            if (d > 1) continue;
            if ((x + y) % 2 === 0 || d > 0.72) set(x, y, ci);
          }
        }
      },
      false,
    );
  }

  function windBandsSprite(size, frame) {
    // Cached swirling 2 px outlined pale-blue wind bands filling the whole cube (zero dot cost in linger!)
    const S = Math.max(36, Math.min(96, Math.round(size / 4) * 4));
    const ph = (frame % 4) * (Math.PI / 2);
    return k.sprite(`b63:wbands:${S}:${frame % 4}`, S, S, WIND, set => {
      const cx = S / 2;
      const cy = S / 2;
      const drawArc = (rx, ry, a0, a1, idx) => {
        const steps = Math.max(16, Math.ceil((rx + ry) * 1.4));
        for (let i = 0; i <= steps; i++) {
          const u = i / steps;
          const a = a0 + (a1 - a0) * u;
          const wob = Math.sin(u * Math.PI) * 2.2;
          const px = Math.round(cx + Math.cos(a) * (rx + wob));
          const py = Math.round(cy + Math.sin(a) * (ry + wob * 0.8));
          for (let oy = 0; oy < 2; oy++) for (let ox = 0; ox < 2; ox++) set(px + ox, py + oy, idx);
        }
      };
      // Outer, mid and inner thick pale-blue & white swirling wind bands
      for (let i = 0; i < 4; i++) {
        const a = ph + (i / 4) * k.tau;
        drawArc(S * 0.41, S * 0.41, a, a + 1.18, i % 2 === 0 ? 5 : 4);
      }
      for (let i = 0; i < 3; i++) {
        const a = -ph * 1.2 + (i / 3) * k.tau + 0.5;
        drawArc(S * 0.28, S * 0.28, a, a + 1.35, i % 2 === 0 ? 4 : 3);
      }
      for (let i = 0; i < 2; i++) {
        const a = ph + i * Math.PI + 0.9;
        drawArc(S * 0.16, S * 0.15, a, a + 1.6, 5);
      }
    });
  }

  function funnelSprite(frame) {
    // 30x32 spinning wind funnel, over a square and a half tall (28 px body + outline)
    return k.sprite(`b63:funnel2:${frame % 4}`, 30, 32, WIND, set => {
      const ph = (frame % 4) * 1.57;
      for (let y = 2; y <= 29; y++) {
        const u = (y - 2) / 27;
        const sway = Math.sin(u * 5.2 + ph) * (2.4 * (1 - u * 0.45));
        const half = k.mix(11.5, 2.5, Math.pow(u, 0.82));
        const cx = 15 + sway;
        for (let x = 2; x <= 27; x++) {
          const dx = x - cx;
          if (Math.abs(dx) > half) continue;
          const nx = dx / Math.max(1, half);
          const bandVal = Math.sin(u * 13 + nx * 2.4 - ph);
          let idx = 3;
          if (bandVal > 0.45) idx = 5;
          else if (bandVal > -0.1) idx = 4;
          else if (bandVal < -0.58) idx = 2;
          if (Math.abs(nx) > 0.78 && bandVal > -0.3) idx = 5;
          if (y <= 4 && Math.abs(nx) < 0.84) idx = y === 2 ? 5 : 4;
          set(x, y, idx);
        }
      }
    });
  }

  function awakenTreeSprite(eyesOpen, gleam) {
    // 22x24 glowing green-gold tree glyph with two bold glowing eyes opening on it
    const pal = [AWAKEN[0], AWAKEN[1], AWAKEN[2], AWAKEN[3], AWAKEN[4], k.WHITE, GOLD[3], GOLD[0]];
    return k.sprite(`b63:tree2:${eyesOpen ? 1 : 0}:${gleam ? 1 : 0}`, 22, 24, pal, set => {
      const puffs = [
        [11, 7, 5.5],
        [7, 10, 4.5],
        [15, 10, 4.5],
        [11, 11, 5.3],
      ];
      for (let y = 1; y <= 15; y++) {
        for (let x = 2; x <= 19; x++) {
          let inside = false;
          for (const [cx, cy, r] of puffs) {
            if (Math.hypot(x - cx, y - cy) <= r) {
              inside = true;
              break;
            }
          }
          if (!inside) continue;
          set(x, y, y < 8 ? 4 : y < 12 ? 3 : 2);
          if (y <= 3 || (y <= 6 && (x === 7 || x === 15))) set(x, y, 5);
        }
      }
      for (let y = 14; y <= 21; y++) {
        const w = y >= 19 ? 4 + (y - 19) * 1.5 : 3;
        for (let dx = -Math.floor(w); dx <= Math.floor(w); dx++) {
          if (y >= 20 && Math.abs(dx) === 1) continue;
          set(11 + dx, y, Math.abs(dx) <= 1 ? 4 : 3);
        }
      }
      // Two big gleaming eyes (each 5x4 px)
      for (const ex of [7, 15]) {
        if (!eyesOpen) {
          for (let dx = -2; dx <= 2; dx++) {
            set(ex + dx, 10, 7);
            set(ex + dx, 11, 6);
          }
        } else {
          for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
              if (Math.abs(dx) === 2 && Math.abs(dy) === 2) continue;
              const edge = Math.abs(dx) === 2 || Math.abs(dy) === 2;
              set(ex + dx, 10 + dy, edge ? 7 : 6);
            }
          }
          set(ex, 10, 5);
          set(ex - 1, 9, 5);
          set(ex + 1, 10, 5);
          if (gleam) {
            set(ex, 9, 5);
            set(ex, 11, 5);
          }
        }
      }
    });
  }

  function bloodDropSprite() {
    // 11x14 big outlined crimson blood drop
    return k.sprite('b63:blood', 11, 14, BLOOD, set => {
      for (let y = 1; y <= 12; y++) {
        const u = (y - 1) / 11;
        const half = u < 0.55 ? u * 6.5 : Math.sqrt(Math.max(0, 1 - ((u - 0.62) / 0.38) ** 2)) * 3.8;
        for (let x = 1; x <= 9; x++) {
          const dx = x - 5;
          if (Math.abs(dx) > half) continue;
          let idx = 2;
          if (dx < 0 && u > 0.45 && u < 0.82) idx = 4;
          else if (u > 0.35 && dx <= 0.5) idx = 3;
          set(x, y, idx);
        }
      }
      set(4, 8, 5);
      set(4, 9, 5);
    });
  }

  function homunculusSprite(flap) {
    // 20x14 bright outlined winged creature (body half a square, wings spread to a full square)
    const pal = [CLAY[0], CLAY[1], CLAY[2], CLAY[3], CLAY[4], k.WHITE, BLOOD[3]];
    const art = flap
      ? [
          '.ww............ww.',
          'wppw...p..p...wppw',
          'wbbpw..pppp..wpbbw',
          '.wbbpwppppppwpbbw.',
          '..wbbppprprppbbw..',
          '...wwppppppppww...',
          '.....wppppppw.....',
          '.....wbbppbbw.....',
          '.....wpp..ppw.....',
          '....wwp....pww....',
        ]
      : [
          '.......p..p.......',
          '.......pppp.......',
          '......pppppp......',
          '.....ppprprpp.....',
          '...wwppppppppww...',
          '..wppwppppppwppw..',
          '.wbbpwwbppbwwpbbw.',
          'wbbpw..wppw..wpbbw',
          'wppw...p..p...wppw',
          '.ww...ww..ww...ww.',
        ];
    const map = { b: 3, p: 4, w: 5, r: 6 };
    return k.sprite(`b63:homunc:${flap ? 1 : 0}`, 20, 14, pal, set => {
      for (let y = 0; y < art.length; y++) {
        for (let x = 0; x < art[y].length; x++) {
          const ch = art[y][x];
          if (ch === '.') continue;
          set(x + 1, y + 2, map[ch]);
        }
      }
    });
  }

  // Cube geometry helper for Control Winds (uses s.area or falls back to 3x3 cube around target)
  function windCube(s) {
    if (s.area) {
      const raw = k.outline(s.area, s.grid);
      if (raw && raw.length >= 4) {
        const pts = raw.slice(0, 4).map(c => k.P({ x: c[0], y: c[1] }));
        const cx = (pts[0].x + pts[1].x + pts[2].x + pts[3].x) / 4;
        const cy = (pts[0].y + pts[1].y + pts[2].y + pts[3].y) / 4;
        const e1x = pts[1].x - pts[0].x;
        const e1y = pts[1].y - pts[0].y;
        const e2x = pts[3].x - pts[0].x;
        const e2y = pts[3].y - pts[0].y;
        const W = Math.hypot(e1x, e1y) || 48;
        const H = Math.hypot(e2x, e2y) || 48;
        return { pts, cx, cy, W, H, ux: e1x / W, uy: e1y / W, vx: e2x / H, vy: e2y / H };
      }
    }
    const anchor = s.targets?.[0] || s.pose?.target || s.pose?.base;
    if (!anchor) return null;
    const C = k.P(anchor);
    const half = 24;
    const pts = [
      { x: C.x - half, y: C.y - half },
      { x: C.x + half, y: C.y - half },
      { x: C.x + half, y: C.y + half },
      { x: C.x - half, y: C.y + half },
    ];
    return { pts, cx: C.x, cy: C.y, W: half * 2, H: half * 2, ux: 1, uy: 0, vx: 0, vy: 1 };
  }

  function drawWindCubeGround(cube, rawMs, seed, alpha) {
    if (!cube || alpha <= 0.05) return;
    const { pts, cx, cy, W, H, ux, uy, vx, vy } = cube;
    const pt = (lx, ly) => ({ x: cx + ux * lx + vx * ly, y: cy + uy * lx + vy * ly });
    const phase = (rawMs / 1800) % 1;
    const aStep = Math.round(alpha * 4) / 4;
    if (aStep <= 0) return;

    // 1. Thick pale-blue wind bands filling the entire cube (cached 4-frame sprite: 0 dot cost!)
    const bandsImg = windBandsSprite(Math.min(W, H), Math.floor(rawMs / 110));
    k.blit(bandsImg, cx - bandsImg.width / 2, cy - bandsImg.height / 2, alpha);

    // 2. Crisp dashed cube outline (2 px pale-blue/white over 4 px dark outline) + bright corners
    for (let i = 0; i < 4; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % 4];
      strokeLine(a.x, a.y, b.x, b.y, WIND[0], 4, 4, 8, phase * 4);
      strokeLine(a.x, a.y, b.x, b.y, aStep > 0.5 ? WIND[4] : WIND[3], 2, 4, 8, phase * 4);
    }
    for (let i = 0; i < 4; i++) {
      const p = pts[i];
      k.dot(p.x, p.y, WIND[0], 5);
      k.dot(p.x, p.y, k.WHITE, 3);
    }

    // 3. Dust puffs and bright green leaves racing across the whole cube
    const leafCount = aStep < 0.75 ? 6 : 10;
    for (let i = 0; i < leafCount; i++) {
      const sp = 0.75 + k.hash(i, seed, 2) * 0.6;
      const ang = phase * k.tau * sp + k.hash(i, seed, 1) * k.tau;
      const rad = 0.16 + k.hash(i, seed, 3) * 0.32;
      const p = pt(Math.cos(ang) * W * rad, Math.sin(ang) * H * rad);
      if (i % 2 === 0) {
        k.dot(p.x, p.y, AWAKEN[0], 4);
        k.dot(p.x, p.y, AWAKEN[3], 2);
        k.dot(p.x - 1, p.y, AWAKEN[4], 1);
      } else {
        k.dot(p.x, p.y, DUST_PAL[0], 4);
        k.dot(p.x, p.y, DUST_PAL[3], 2);
      }
    }
  }

  // ---------------------------------------------------------------- Batch 63 spells

  // Detect Thoughts: big white outlined thought bubbles rise from the target with bright symbols, linked to the caster by a pale psychic line.
  FX.register('detect-thoughts', {
    palette: PSYCHIC,
    travel: 180,
    beats: (event, kit, travel) => [
      { at: kit.CAST + travel, stop: 80, target: event.targets?.[0] ?? null, kind: 'soft', power: 0 },
    ],
    end: (event, travel) => k.CAST + travel + 900,
    air(s) {
      const { pose, c, targets, hits, event } = s;
      const hit = hits[0];
      const target = targets.find(t => t.id === hit.id) || targets[0];
      const caster = pose.hand || (pose.base && { x: pose.base.x, y: pose.base.y - 0.55 });
      if (!target || !caster) return;
      const H = k.P(caster);
      const T = k.P(target);
      const t = c.t - k.CAST;
      if (t < 0) return;

      const bubblePos = {
        x: T.x,
        y: T.y - 16 - (t > 760 ? (t - 760) * 0.025 : Math.sin(c.raw / 150) * 1.5),
      };

      // Smooth continuous pale psychic link line connecting caster to the target's thought bubble
      const linkReach = k.clamp(t / 180);
      const linkFade = t < 780 ? 0 : k.clamp((t - 780) / 260);
      if (linkFade < 1) {
        const dist = Math.hypot(bubblePos.x - H.x, bubblePos.y - H.y);
        const steps = Math.max(24, Math.min(72, Math.ceil(dist / 2.2)));
        const maxI = Math.floor(steps * linkReach);
        const mx = (H.x + bubblePos.x) / 2;
        const my = (H.y + bubblePos.y) / 2 - 12;
        const bez = u => ({
          x: (1 - u) * (1 - u) * H.x + 2 * (1 - u) * u * mx + u * u * bubblePos.x,
          y: (1 - u) * (1 - u) * H.y + 2 * (1 - u) * u * my + u * u * bubblePos.y,
        });
        for (let pass = 0; pass < 2; pass++) {
          const col = pass === 0 ? PSYCHIC[0] : PSYCHIC[4];
          const sz = pass === 0 ? 4 : 2;
          for (let i = 0; i <= maxI; i++) {
            if (linkFade > 0 && Math.floor(i / 3) % 3 < linkFade * 3) continue;
            const p = bez(i / steps);
            k.dot(p.x, p.y, col, sz);
          }
        }
        if (t >= 160 && linkFade < 0.7) {
          for (let b = 0; b < 3; b++) {
            const u = 1 - ((c.raw / 520 + b / 3) % 1);
            const p = bez(u);
            k.disc(p.x, p.y, 2.8, PSYCHIC[0]);
            k.disc(p.x, p.y, 1.8, k.WHITE);
          }
        }
      }

      // Trailing lead-in bubbles connecting target's head to main thought bubble
      const pop = k.clamp((t - 110) / 140);
      const vanish = t > 860 ? k.clamp((t - 860) / 200) : 0;
      if (pop > 0 && vanish < 0.85) {
        if (pop > 0.15) {
          k.disc(T.x - 2, T.y - 3, 3, PSYCHIC[0]);
          k.disc(T.x - 2, T.y - 3, 2, k.WHITE);
        }
        if (pop > 0.45) {
          k.disc(T.x - 1, T.y - 7, 4, PSYCHIC[0]);
          k.disc(T.x - 1, T.y - 7, 3, k.WHITE);
        }
      }

      // Main big thought bubble (26x20) with cycling bright psychic symbols
      if (t >= 160 && vanish < 1) {
        const sym = Math.floor((t - 160) / 220) % 3;
        const img = thoughtBubbleSprite(sym);
        const alpha = vanish > 0 ? 1 - vanish : 1;
        k.blit(img, bubblePos.x - img.width / 2, bubblePos.y - img.height / 2, alpha);
        if (t > 280 && vanish < 0.6) {
          const sx = bubblePos.x + 14;
          const sy = bubblePos.y - 7 - Math.sin(c.raw / 130) * 1.5;
          k.disc(sx, sy, 4.5, PSYCHIC[0]);
          k.disc(sx, sy, 3.5, k.WHITE);
          k.dot(sx, sy, PSYCHIC[3], 2);
        }
      }

      const real = s.real(hit);
      if (real >= 0) {
        k.drawHit(k.hitStyle('detect-thoughts', PSYCHIC, { S: 32, spikes: 6, jag: 0.2 }), bubblePos, real);
        k.shards(bubblePos, real, PSYCHIC, (event.seed || 3) + 11, 6, 18);
      }
      if (vanish > 0.35) {
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * k.tau + 0.4;
          const r = 6 + (vanish - 0.35) * 18;
          k.dot(bubblePos.x + Math.cos(a) * r, bubblePos.y + Math.sin(a) * r * 0.7, PSYCHIC[0], 3);
          k.dot(bubblePos.x + Math.cos(a) * r, bubblePos.y + Math.sin(a) * r * 0.7, k.WHITE, 1);
        }
      }
    },
  });

  // Fortunes Favor: a big spinning gold coin flips over the target, lands with a bright flash, and lucky sparkles orbit the token.
  FX.register('fortunes-favor', {
    palette: GOLD,
    travel: 400,
    beats: (event, kit, travel) =>
      (event.targets?.length ? event.targets : [null]).map(target => ({
        at: kit.CAST + travel,
        stop: 90,
        target,
        kind: 'soft',
        power: 0,
      })),
    end: (event, travel) => k.CAST + travel + 660,
    flash: (event, e) => (e < 35 ? { color: '#fff4b8', alpha: 0.2 } : null),
    ground(s) {
      const { c, hits } = s;
      const t = c.t - k.CAST;
      if (t < 0) return;
      const landAt = hits[0].at - k.CAST;
      for (const target of buffTargets(s)) {
        const F = k.P(targetFeet(target));
        const fade = t < landAt + 420 ? 1 : 1 - k.clamp((t - (landAt + 420)) / 240);
        if (fade <= 0) continue;
        const r = t < landAt ? k.mix(7, 14, k.ease(t / landAt)) : 14 + (t - landAt) * 0.008;
        k.ellipse(F.x, F.y + 1, r, r * 0.58, GOLD[0], 4, fade < 0.6 ? 6 : 0);
        k.ellipse(F.x, F.y, r, r * 0.58, t >= landAt && t < landAt + 140 ? k.WHITE : GOLD[4], 2, fade < 0.6 ? 6 : 0);
        if (t >= landAt && t < landAt + 240) {
          const p = (t - landAt) / 240;
          const wr = 11 + k.ease(p) * 14;
          k.ellipse(F.x, F.y, wr, wr * 0.58, GOLD[0], 3, 8);
          k.ellipse(F.x, F.y, wr, wr * 0.58, GOLD[3], 1, 8);
        }
      }
    },
    air(s) {
      const { c, hits, event } = s;
      const hit = hits[0];
      const t = c.t - k.CAST;
      if (t < 0) return;
      const landAt = hit.at - k.CAST;
      const list = buffTargets(s);

      for (let ti = 0; ti < list.length; ti++) {
        const target = list[ti];
        const T = k.P(target);

        if (t < landAt) {
          const u = t / landAt;
          const arcY = T.y - 5 - Math.sin(u * Math.PI) * 26;
          for (let j = 1; j <= 5; j++) {
            const pu = Math.max(0, u - j * 0.05);
            const py = T.y - 5 - Math.sin(pu * Math.PI) * 26;
            k.dot(T.x, py, GOLD[0], 4);
            k.dot(T.x, py, j < 3 ? k.WHITE : GOLD[4], 2);
          }
          const frame = Math.floor(t / 55) % 4;
          const img = coinSprite(frame);
          k.blit(img, T.x - img.width / 2, arcY - img.height / 2);
        } else {
          const after = t - landAt;
          const coinFade = after < 360 ? 1 : 1 - k.clamp((after - 360) / 180);
          if (coinFade > 0) {
            const bob = Math.sin(after / 70) * 1.5;
            const frame = after < 250 ? 0 : Math.floor((after - 250) / 65) % 4;
            const img = coinSprite(frame);
            k.blit(img, T.x - img.width / 2, T.y - 9 + bob - img.height / 2, coinFade);
          }
          const orbitFade = after < 460 ? 1 : 1 - k.clamp((after - 460) / 200);
          if (orbitFade > 0) {
            const count = 6;
            for (let i = 0; i < count; i++) {
              if (orbitFade < 0.5 && i % 2 === 1) continue;
              const a = (i / count) * k.tau + after / 155 + ti;
              const rx = 15 * (0.85 + 0.15 * Math.sin(after / 110));
              const ry = 10.5;
              const sx = T.x + Math.cos(a) * rx;
              const sy = T.y - 2 + Math.sin(a) * ry;
              const big = (i + Math.floor(c.raw / 90)) % 2 === 0;
              sparkle(sx, sy, big ? 3 : 2, GOLD[4], GOLD[0], k.WHITE);
            }
          }
        }

        const real = s.real(hit);
        if (real >= 0) {
          const hitAt = { x: T.x, y: T.y - 4 };
          k.drawHit(k.hitStyle('fortunes-favor', GOLD, { S: 40, spikes: 4, minor: 4, jag: 0.1 }), hitAt, real);
          k.shards(hitAt, real, GOLD, (event.seed || 5) + ti * 7, 9, 24);
        }
      }
    },
  });

  // Gift Of Gab: a big white outlined speech bubble pops over the caster with a bright golden squiggle inside as sparkles burst out.
  FX.register('gift-of-gab', {
    palette: GOLD,
    travel: 100,
    beats: (event, kit, travel) => [{ at: kit.CAST + travel, stop: 85, target: null, kind: 'soft', power: 0 }],
    end: (event, travel) => k.CAST + travel + 880,
    flash: (event, e) => (e < 30 ? { color: '#fff4b8', alpha: 0.16 } : null),
    ground(s) {
      const { pose, c } = s;
      if (!pose.base) return;
      const t = c.t - k.CAST;
      if (t < 0 || t > 820) return;
      const B = k.P(pose.base);
      const fade = t < 560 ? 1 : 1 - k.clamp((t - 560) / 260);
      const r = 10 + k.ease(k.clamp(t / 220)) * 5;
      k.ellipse(B.x, B.y + 1, r, r * 0.55, GOLD[0], 3, fade < 0.6 ? 6 : 0);
      k.ellipse(B.x, B.y, r, r * 0.55, GOLD[4], 1, fade < 0.6 ? 6 : 0);
    },
    air(s) {
      const { pose, c, hits, event } = s;
      const hit = hits[0];
      const base = pose.base || pose.hand;
      if (!base) return;
      const B = k.P(base);
      const center = { x: B.x + 2, y: B.y - 22 };
      const t = c.t - k.CAST;
      if (t < 0) return;
      const popAt = hit.at - k.CAST;
      const seed = event.seed || 9;

      if (t < popAt) {
        const u = k.ease(t / popAt);
        const rx = Math.max(3, 11 * u);
        const ry = Math.max(2, 7 * u);
        k.ellipse(center.x, center.y, rx + 1, ry + 1, GOLD[0], 3);
        k.ellipse(center.x, center.y, rx, ry, k.WHITE, 2);
      } else {
        const after = t - popAt;
        const fade = after < 620 ? 1 : 1 - k.clamp((after - 620) / 240);
        if (fade > 0) {
          const bounce = after < 100 ? (1 - k.back(after / 100)) * 4 : Math.sin(after / 110) * 1.2;
          const img = speechBubbleSprite(Math.floor(after / 120));
          k.blit(img, center.x - img.width / 2, center.y + bounce - img.height / 2, fade);
        }
        const spFade = after < 660 ? 1 : 1 - k.clamp((after - 660) / 220);
        if (spFade > 0) {
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * k.tau + k.hash(i, seed, 2) * 0.4;
            const dist = 12 + k.ease(k.clamp(after / 420)) * (10 + k.hash(i, seed, 3) * 8);
            const sx = center.x + Math.cos(a) * dist;
            const sy = center.y + Math.sin(a) * dist * 0.78 - after * 0.008;
            if (spFade < 0.6 && (i + Math.floor(c.raw / 80)) % 2) continue;
            sparkle(sx, sy, i % 2 === 0 ? 3 : 2, i % 2 ? GOLD[3] : GOLD[4], GOLD[0], k.WHITE);
          }
        }
      }

      const real = s.real(hit);
      if (real >= 0) {
        k.drawHit(k.hitStyle('gift-of-gab', GOLD, { S: 36, spikes: 6, minor: 4, jag: 0.15 }), center, real);
        k.shards(center, real, GOLD, seed + 17, 10, 24);
      }
    },
  });

  // Animal Messenger: a bright white outlined bird a whole square across lifts off the caster's hand with a flash and flies away trailing pale sparkles.
  FX.register('animal-messenger', {
    palette: BIRD,
    travel: 110,
    beats: (event, kit, travel) => [{ at: kit.CAST + travel, stop: 80, target: null, kind: 'soft', power: 0 }],
    end: (event, travel) => k.CAST + travel + 1020,
    flash: (event, e) => (e < 30 ? { color: '#f0f8ff', alpha: 0.18 } : null),
    air(s) {
      const { pose, c, targets, hits, event } = s;
      const hit = hits[0];
      const hand = pose.hand || (pose.base && { x: pose.base.x, y: pose.base.y - 0.5 });
      if (!hand) return;
      const H = k.P(hand);
      const aim = targets?.[0] || pose.target;
      const dest = aim
        ? (() => {
            const A = k.P(aim);
            return { x: k.mix(H.x, A.x, 0.88), y: k.mix(H.y, A.y, 0.88) - 18 };
          })()
        : { x: H.x + 42, y: H.y - 24 };
      const flipX = dest.x < H.x;
      const t = c.t - k.CAST;
      if (t < 0) return;
      const liftAt = hit.at - k.CAST;
      const seed = event.seed || 13;

      if (t < liftAt + 80) {
        const u = k.clamp(t / (liftAt + 80));
        const r = 4 + k.ease(u) * 10;
        k.ellipse(H.x, H.y, r, r * 0.7, BIRD[0], 3);
        k.ellipse(H.x, H.y, r, r * 0.7, k.WHITE, 2);
      }

      const flightDur = 1000;
      const posAt = ft => {
        const q = k.clamp(ft / flightDur);
        const move = q < 0.25 ? k.ease(q / 0.25) * 0.16 : 0.16 + Math.pow((q - 0.25) / 0.75, 1.25) * 0.84;
        return {
          x: k.mix(H.x, dest.x, move),
          y: k.mix(H.y, dest.y, move) - Math.sin(q * Math.PI) * 18 - (q < 0.25 ? (q / 0.25) * 6 : 6),
        };
      };

      if (t >= liftAt - 20) {
        const ft = Math.max(0, t - liftAt);
        const q = k.clamp(ft / flightDur);
        for (let i = 1; i <= 14; i++) {
          const pt = ft - i * 42;
          if (pt < 0) continue;
          const p = posAt(pt);
          const jx = (k.hash(i, seed, 1) - 0.5) * 6;
          const jy = (k.hash(i, seed, 2) - 0.5) * 6 + i * 0.35;
          if (i % 3 === 0) {
            sparkle(p.x + jx, p.y + jy, i < 8 ? 2 : 1, BIRD[4], BIRD[0], k.WHITE);
          } else {
            k.dot(p.x + jx, p.y + jy, BIRD[0], i < 6 ? 4 : 3);
            k.dot(p.x + jx, p.y + jy, i < 5 ? k.WHITE : BIRD[3], i < 6 ? 2 : 1);
          }
        }
        const alpha = q < 0.82 ? 1 : 1 - (q - 0.82) / 0.18;
        if (alpha > 0) {
          const p = posAt(ft);
          const flap = Math.floor(c.raw / 95) % 3;
          const img = birdSprite(flap, flipX);
          k.blit(img, p.x - img.width / 2, p.y - img.height / 2, alpha);
        }
      }

      const real = s.real(hit);
      if (real >= 0) {
        k.drawHit(k.hitStyle('animal-messenger', BIRD, { S: 36, spikes: 6, minor: 4, jag: 0.15 }), H, real);
        k.shards(H, real, BIRD, seed + 3, 8, 22);
      }
    },
  });

  // Pass Without Trace: a wide pale silver mist ring two squares across settles around the caster and allies as footprints fade out and figures shimmer.
  FX.register('pass-without-trace', {
    palette: SILVER,
    travel: 160,
    beats: (event, kit, travel) => [
      { at: kit.CAST + travel, stop: 75, target: event.targets?.[0] ?? null, kind: 'soft', power: 0 },
    ],
    end: (event, travel) => k.CAST + travel + 980,
    ground(s) {
      const { pose, c, targets, event } = s;
      const t = c.t - k.CAST;
      if (t < 0) return;
      const seed = event.seed || 21;
      const expand = k.ease(k.clamp(t / 180));
      const fade = t < 780 ? 1 : 1 - k.clamp((t - 780) / 340);
      if (fade <= 0) return;

      const puffBig = mistPuffSprite(0);
      const puffSm = mistPuffSprite(1);
      const fpImg = footprintSprite();

      const drawMistRing = (center, rxMax, ryMax, puffs) => {
        const rx = rxMax * expand;
        const ry = ryMax * expand;
        const spin = c.raw / 1500;
        // Cached mist puffs around the wide pale-silver ring (fast & bright!)
        for (let i = 0; i < puffs; i++) {
          if (fade < 0.5 && i % 2 === 1) continue;
          const a = (i / puffs) * k.tau + spin * (i % 2 ? 0.8 : -0.6);
          const px = center.x + Math.cos(a) * rx;
          const py = center.y + Math.sin(a) * ry;
          const img = i % 2 === 0 ? puffBig : puffSm;
          k.blit(img, px - img.width / 2, py - img.height / 2, fade);
        }
        // Fading silver footprints on the ground around the ring
        const fpCount = 5;
        for (let i = 0; i < fpCount; i++) {
          const vanishAt = 280 + i * 115;
          if (t > vanishAt + 180) continue;
          const fpAlpha = t <= vanishAt ? 1 : 1 - (t - vanishAt) / 180;
          const a = (i / fpCount) * k.tau + 0.35 + k.hash(i, seed) * 0.25;
          const dist = 0.58 + (i % 2) * 0.16;
          const fx = center.x + Math.cos(a) * rxMax * dist;
          const fy = center.y + Math.sin(a) * ryMax * dist;
          k.blit(fpImg, fx - fpImg.width / 2, fy - fpImg.height / 2, fpAlpha * fade);
        }
      };

      if (pose.base) drawMistRing(k.P(pose.base), 22, 14, 14);
      for (const target of targets || []) drawMistRing(k.P(targetFeet(target)), 15, 10, 10);
    },
    air(s) {
      const { pose, c, targets, hits } = s;
      const t = c.t - k.CAST;
      if (t < 0) return;
      const fade = t < 780 ? 1 : 1 - k.clamp((t - 780) / 340);

      const drawShimmer = pt => {
        if (fade <= 0) return;
        const tick = Math.floor(c.raw / 75);
        for (let i = -1; i <= 1; i++) {
          if (fade < 0.5 && i !== 0) continue;
          const sx = pt.x + i * 5;
          const sy = pt.y - 4 + Math.sin(c.raw / 130 + i * 1.9) * 3;
          const h = 6 + ((tick + i + 3) % 3);
          strokeLine(sx, sy - h, sx, sy + h, SILVER[0], 3, 3, 3, tick * 0.5);
          strokeLine(sx, sy - h, sx, sy + h, i === 0 ? k.WHITE : SILVER[4], 1, 3, 3, tick * 0.5);
        }
        const sa = c.raw / 220;
        sparkle(pt.x + Math.cos(sa) * 9, pt.y - 6 + Math.sin(sa) * 5, 2, SILVER[4], SILVER[0], k.WHITE);
        sparkle(pt.x - Math.cos(sa) * 9, pt.y - 2 - Math.sin(sa) * 5, 2, SILVER[3], SILVER[0], k.WHITE);
      };

      if (pose.base) {
        const C = k.P({ x: pose.base.x, y: pose.base.y - 0.35 });
        drawShimmer(C);
        const real = s.real(hits[0]);
        if (real >= 0 && real < 260) {
          const u = real / 260;
          const r = 8 + k.ease(u) * 20;
          k.ellipse(C.x, C.y + 4, r, r * 0.62, SILVER[0], 4, u > 0.5 ? 8 : 0);
          k.ellipse(C.x, C.y + 4, r, r * 0.62, k.WHITE, 2, u > 0.5 ? 8 : 0);
        }
      }
      for (const target of targets || []) drawShimmer(k.P(target));
    },
  });

  // Water Walk: bright 2 px blue-white ripple rings spread a whole square under each target's feet over a glowing water disc with edge splashes.
  FX.register('water-walk', {
    palette: WATER,
    travel: 150,
    beats: (event, kit, travel) =>
      (event.targets?.length ? event.targets : [null]).map(target => ({
        at: kit.CAST + travel,
        stop: 75,
        target,
        kind: 'soft',
        power: 0,
      })),
    end: (event, travel) => k.CAST + travel + 960,
    ground(s) {
      const { c } = s;
      const t = c.t - k.CAST;
      if (t < 0) return;
      const fade = t < 780 ? 1 : 1 - k.clamp((t - 780) / 300);
      if (fade <= 0) return;
      const grow = k.ease(k.clamp(t / 150));

      for (const target of buffTargets(s)) {
        const F = k.P(targetFeet(target));
        if (grow > 0.2) {
          const img = waterDiscSprite(Math.floor(c.raw / 120));
          k.blit(img, F.x - img.width / 2, F.y - img.height / 2, fade);
        }
        // Bright blue-white 2 px ripple rings spreading over a whole square wide
        for (let r = 0; r < 2; r++) {
          const cycle = ((t + r * 260) % 520) / 520;
          const rx = k.mix(8, 20, k.ease(cycle)) * grow;
          const ry = rx * 0.62;
          const dashed = cycle > 0.68 || fade < 0.6 ? 7 : 0;
          k.ellipse(F.x, F.y + 1, rx, ry, WATER[0], 4, dashed);
          k.ellipse(F.x, F.y, rx, ry, cycle < 0.4 ? k.WHITE : WATER[4], 2, dashed);
        }
      }
    },
    air(s) {
      const { c, hits, event } = s;
      const hit = hits[0];
      const t = c.t - k.CAST;
      if (t < 0) return;
      const fade = t < 780 ? 1 : 1 - k.clamp((t - 780) / 300);
      const seed = event.seed || 29;
      const list = buffTargets(s);

      for (let ti = 0; ti < list.length; ti++) {
        const F = k.P(targetFeet(list[ti]));
        if (fade > 0) {
          for (let i = 0; i < 8; i++) {
            const p = ((t + i * 95) % 440) / 440;
            const ang = (i / 8) * k.tau + k.hash(i, seed + ti) * 0.35;
            const rx = 12 + p * 6;
            const ry = 7.5 + p * 3.5;
            const sx = F.x + Math.cos(ang) * rx;
            const sy = F.y + Math.sin(ang) * ry - Math.sin(p * Math.PI) * 11;
            if (fade < 0.55 && i % 2) continue;
            k.dot(sx, sy, WATER[0], 5);
            k.dot(sx, sy, p < 0.5 ? k.WHITE : WATER[4], 3);
          }
        }
        const real = s.real(hit);
        if (real >= 0) {
          k.drawHit(k.hitStyle('water-walk', WATER, { S: 34, spikes: 6, minor: 4, jag: 0.2 }), F, real);
          k.shards(F, real, WATER, seed + ti * 5, 8, 22);
        }
      }
    },
  });

  // Control Winds: thick outlined pale-blue wind bands fill the whole cube with a big spinning funnel in the middle, racing dust and leaves, and a calm lasting loop.
  FX.register('control-winds', {
    palette: WIND,
    travel: 150,
    beats: (event, kit, travel) =>
      (event.targets?.length ? event.targets : [null]).map(target => ({
        at: kit.CAST + travel,
        stop: 95,
        target,
        kind: 'hit',
        power: 0.05,
      })),
    end: (event, travel) => k.CAST + travel + 920,
    reach: (event, grid) => {
      const cells = event.area?.feet ? event.area.feet / (grid.feet || 5) : 3;
      return { r: cells + 1.4, up: cells + 1.4 };
    },
    flash: (event, e) => (e < 30 ? { color: '#e8f7ff', alpha: 0.16 } : null),
    ground(s) {
      const { c, pose, hits, event } = s;
      const t = c.t - k.CAST;
      if (t < 0) return;
      const cube = windCube(s);
      if (!cube) return;
      const hitAt = hits[0].at - k.CAST;
      const seed = event.seed || 41;

      if (t < hitAt) {
        const u = k.ease(t / hitAt);
        for (let i = 0; i < 4; i++) {
          const a = cube.pts[i];
          const b = cube.pts[(i + 1) % 4];
          strokeLine(a.x, a.y, k.mix(a.x, b.x, u), k.mix(a.y, b.y, u), WIND[0], 4, 4);
          strokeLine(a.x, a.y, k.mix(a.x, b.x, u), k.mix(a.y, b.y, u), k.WHITE, 2, 4);
        }
        return;
      }

      if (!(pose.linger > 0)) {
        const fade = t < hitAt + 680 ? 1 : 1 - k.clamp((t - (hitAt + 680)) / 240);
        drawWindCubeGround(cube, c.raw, seed, fade);
      }

      const e = t - hitAt;
      if (e >= 0 && e < 300) {
        const p = e / 300;
        const r = Math.min(cube.W, cube.H) * (0.2 + 0.34 * k.ease(p));
        k.ellipse(cube.cx, cube.cy, r, r * 0.72, WIND[0], 4, p > 0.5 ? 8 : 0);
        k.ellipse(cube.cx, cube.cy, r, r * 0.72, k.WHITE, 2, p > 0.5 ? 8 : 0);
      }
    },
    air(s) {
      const { c, pose, hits, event } = s;
      const hit = hits[0];
      const t = c.t - k.CAST;
      if (t < 0) return;
      const cube = windCube(s);
      if (!cube) return;
      const hitAt = hit.at - k.CAST;
      const center = { x: cube.cx, y: cube.cy };

      if (t >= hitAt && !(pose.linger > 0)) {
        const fade = t < hitAt + 680 ? 1 : 1 - k.clamp((t - (hitAt + 680)) / 240);
        const img = funnelSprite(Math.floor(c.raw / 85));
        k.blit(img, cube.cx - img.width / 2, cube.cy - img.height + 6, fade);
      }

      const real = s.real(hit);
      if (real >= 0) {
        k.drawHit(k.hitStyle('control-winds', WIND, { S: 40, spikes: 6, jag: 0.3 }), center, real);
        k.shards(center, real, WIND, (event.seed || 41) + 5, 10, 28);
      }
    },
    linger(s) {
      const cube = windCube(s);
      if (!cube) return;
      drawWindCubeGround(cube, s.c.raw, s.event.seed || 41, s.linger);
    },
    lingerAir(s) {
      const cube = windCube(s);
      if (!cube || s.linger <= 0.05) return;
      // Big funnel a square and a half tall spinning steadily in the middle of the cube
      const img = funnelSprite(Math.floor(s.c.raw / 95));
      k.blit(img, cube.cx - img.width / 2, cube.cy - img.height + 6, s.linger);
      const ph = (s.c.raw / 1200) % 1;
      if (s.linger > 0.25) {
        for (let i = 0; i < 4; i++) {
          const a = ph * k.tau * 1.4 + (i / 4) * k.tau;
          const lx = cube.cx + Math.cos(a) * 14;
          const ly = cube.cy - 17 + Math.sin(a) * 5;
          k.dot(lx, ly, AWAKEN[0], 4);
          k.dot(lx, ly, AWAKEN[4], 2);
        }
      }
    },
  });

  // Awaken: a glowing green-gold tree glyph a whole square tall rises over the target, two big golden eyes snap open with a flash, and leaves and sparkles burst out.
  FX.register('awaken', {
    palette: AWAKEN,
    travel: 240,
    beats: (event, kit, travel) =>
      (event.targets?.length ? event.targets : [null]).map(target => ({
        at: kit.CAST + travel,
        stop: 100,
        target,
        kind: 'soft',
        power: 0,
      })),
    end: (event, travel) => k.CAST + travel + 920,
    flash: (event, e) => (e < 35 ? { color: '#f2ffa8', alpha: 0.2 } : null),
    ground(s) {
      const { c } = s;
      const t = c.t - k.CAST;
      if (t < 0) return;
      const fade = t < 840 ? 1 : 1 - k.clamp((t - 840) / 300);
      if (fade <= 0) return;
      const r = 8 + k.ease(k.clamp(t / 240)) * 7;
      for (const target of buffTargets(s)) {
        const F = k.P(targetFeet(target));
        k.ellipse(F.x, F.y + 1, r, r * 0.58, AWAKEN[0], 4, fade < 0.6 ? 6 : 0);
        k.ellipse(F.x, F.y, r, r * 0.58, AWAKEN[4], 2, fade < 0.6 ? 6 : 0);
      }
    },
    air(s) {
      const { c, hits, event } = s;
      const hit = hits[0];
      const t = c.t - k.CAST;
      if (t < 0) return;
      const openAt = hit.at - k.CAST;
      const seed = event.seed || 53;
      const list = buffTargets(s);

      for (let ti = 0; ti < list.length; ti++) {
        const T = k.P(list[ti]);
        const eyesOpen = t >= openAt;
        const after = Math.max(0, t - openAt);
        const fade = after < 620 ? 1 : 1 - k.clamp((after - 620) / 280);
        const rise = t < openAt ? (1 - k.ease(t / openAt)) * 8 : -(1 - fade) * 8;
        const treeY = T.y - 14 + rise;

        if (fade > 0) {
          const gleam = eyesOpen && Math.floor(c.raw / 110) % 2 === 0;
          const img = awakenTreeSprite(eyesOpen, gleam);
          k.blit(img, T.x - img.width / 2, treeY, fade);
        }

        if (eyesOpen && after < 780) {
          const p = after / 780;
          for (let i = 0; i < 10; i++) {
            const a = (i / 10) * k.tau + k.hash(i, seed + ti) * 0.4;
            const dist = 7 + k.ease(k.clamp(p * 1.4)) * (13 + k.hash(i, seed, 2) * 8);
            const lx = T.x + Math.cos(a) * dist + Math.sin(p * 8 + i) * 2;
            const ly = T.y - 4 + Math.sin(a) * dist * 0.72 + p * p * 10;
            if (p > 0.75 && i % 2) continue;
            if (i % 2 === 0) {
              k.dot(lx, ly, AWAKEN[0], 4);
              k.dot(lx, ly, AWAKEN[3], 2);
              k.dot(lx - 1, ly - 1, AWAKEN[4], 1);
            } else {
              sparkle(lx, ly, p < 0.5 ? 2 : 1, GOLD[4], GOLD[0], k.WHITE);
            }
          }
        }

        const real = s.real(hit);
        if (real >= 0) {
          const eyePt = { x: T.x, y: T.y - 4 };
          k.drawHit(k.hitStyle('awaken', GOLD, { S: 38, spikes: 6, minor: 4, jag: 0.15 }), eyePt, real);
          k.shards(eyePt, real, AWAKEN, seed + ti * 7, 8, 22);
        }
      }
    },
  });

  // Create Homunculus: a drop of blood hits a gold summoning circle a whole square across, a puff of smoke pops, and a bright outlined winged creature hops up and flaps.
  FX.register('create-homunculus', {
    palette: GOLD,
    travel: 240,
    beats: (event, kit, travel) => [{ at: kit.CAST + travel, stop: 95, target: null, kind: 'soft', power: 0 }],
    end: (event, travel) => k.CAST + travel + 1020,
    flash: (event, e) => (e < 30 ? { color: '#fff0d6', alpha: 0.16 } : null),
    ground(s) {
      const { pose, targets, c, hits } = s;
      const anchor = pose.target || (targets?.[0] ? targetFeet(targets[0]) : pose.base);
      if (!anchor) return;
      const C = k.P(anchor);
      const t = c.t - k.CAST;
      if (t < 0) return;
      const hitAt = hits[0].at - k.CAST;
      const fade = t < hitAt + 760 ? 1 : 1 - k.clamp((t - (hitAt + 760)) / 260);
      if (fade <= 0) return;

      const grow = k.ease(k.clamp(t / 120));
      const rx = 13 * grow;
      const ry = 8.5 * grow;
      const spin = c.raw / 520;

      k.ellipse(C.x, C.y + 1, rx, ry, GOLD[0], 4, fade < 0.55 ? 6 : 0);
      k.ellipse(C.x, C.y, rx, ry, t >= hitAt && t < hitAt + 140 ? k.WHITE : GOLD[4], 2, fade < 0.55 ? 6 : 0);
      k.ellipse(C.x, C.y, rx * 0.65, ry * 0.65, GOLD[3], 1, 5, spin);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * k.tau + spin * 0.6;
        const px = C.x + Math.cos(a) * rx;
        const py = C.y + Math.sin(a) * ry;
        k.dot(px, py, GOLD[0], 4);
        k.dot(px, py, k.WHITE, 2);
      }
      if (t >= hitAt && t < hitAt + 280) {
        const u = (t - hitAt) / 280;
        const br = 3 + k.ease(u) * 8;
        k.ellipse(C.x, C.y, br, br * 0.62, BLOOD[0], 3, u > 0.5 ? 6 : 0);
        k.ellipse(C.x, C.y, br, br * 0.62, BLOOD[3], 2, u > 0.5 ? 6 : 0);
      }
    },
    air(s) {
      const { pose, targets, c, hits, event } = s;
      const hit = hits[0];
      const anchor = pose.target || (targets?.[0] ? targetFeet(targets[0]) : pose.base);
      if (!anchor) return;
      const C = k.P(anchor);
      const t = c.t - k.CAST;
      if (t < 0) return;
      const hitAt = hit.at - k.CAST;
      const seed = event.seed || 67;

      if (t < hitAt) {
        const u = t / hitAt;
        const dy = k.mix(C.y - 26, C.y - 4, u * u);
        const drop = bloodDropSprite();
        k.blit(drop, C.x - drop.width / 2, dy - drop.height / 2);
        if (u > 0.25) {
          k.dot(C.x, dy - 8, BLOOD[0], 3);
          k.dot(C.x, dy - 8, BLOOD[4], 1);
        }
      } else {
        const after = t - hitAt;
        if (after < 310) {
          const p = after / 310;
          const puffs = [
            [-6, -4, 6.2],
            [6, -4, 6.2],
            [0, -9, 6.8],
            [-4, -10, 5.2],
            [5, -9, 5.2],
            [0, -3, 6.0],
          ];
          const shrink = p < 0.45 ? 0.55 + 0.45 * k.ease(p / 0.45) : 1 - (p - 0.45) / 0.55;
          for (let pass = 0; pass < 2; pass++) {
            for (let i = 0; i < puffs.length; i++) {
              const [ox, oy, r] = puffs[i];
              const pr = r * shrink;
              if (pr < 1) continue;
              const px = C.x + ox * (0.7 + p * 0.7);
              const py = C.y + oy * (0.7 + p * 0.6) - p * 6;
              if (pass === 0) k.disc(px, py, pr + 1.4, PUFF[0]);
              else k.disc(px, py, pr, i % 2 === 0 ? PUFF[4] : PUFF[3]);
            }
          }
        }
        if (after >= 80) {
          const ht = after - 80;
          const fade = ht < 740 ? 1 : 1 - k.clamp((ht - 740) / 200);
          if (fade > 0) {
            const hopPhase = (ht / 280) % 1;
            const hopY = Math.sin(hopPhase * Math.PI) * 11;
            const hopX = Math.sin((ht / 280) * Math.PI) * 3;
            const flap = Math.floor(c.raw / 85) % 2 === 0;
            const img = homunculusSprite(flap);
            k.blit(img, C.x + hopX - img.width / 2, C.y - 10 - hopY - img.height / 2, fade);
            if (fade > 0.4) {
              for (let i = 0; i < 3; i++) {
                const a = (i / 3) * k.tau + ht / 180;
                sparkle(
                  C.x + Math.cos(a) * 13,
                  C.y - 11 - hopY * 0.4 + Math.sin(a) * 6,
                  2,
                  i === 0 ? BLOOD[4] : GOLD[4],
                  GOLD[0],
                  k.WHITE,
                );
              }
            }
          }
        }
      }

      const real = s.real(hit);
      if (real >= 0) {
        k.drawHit(k.hitStyle('create-homunculus', GOLD, { S: 34, spikes: 6, jag: 0.25 }), C, real);
        k.shards(C, real, BLOOD, seed + 9, 6, 18);
        k.shards(C, real, GOLD, seed + 19, 6, 22);
      }
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
