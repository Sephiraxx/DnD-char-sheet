/* Muebles y objetos de escena del tablero: mesas, camas, barriles, altares, carros, pozos…
   Cada pieza ocupa un rectángulo de casillas, se puede girar de a 90° y se dibuja vista desde arriba.
   Se guardan en el mapa como [x, y, id, giro]. Algunas dan luz (hogar, brasero, farol). */
(function (root) {
  'use strict';
  const TAU = Math.PI * 2;
  const GROUPS = [
    ['inn', 'Taberna y casa'],
    ['store', 'Depósito y taller'],
    ['temple', 'Mazmorra y templo'],
    ['out', 'Exterior'],
    ['ship', 'Barco'],
  ];

  // ---------- Pinceles comunes ----------
  const rr = (c, x, y, w, h, r) => {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  };
  const disc = (c, x, y, r) => {
    c.beginPath();
    c.arc(x, y, r, 0, TAU);
  };
  // Sombra que cae hacia abajo a la derecha: le da cuerpo a la pieza sobre el piso.
  const lift = (c, u, k = 1) => {
    c.shadowColor = 'rgba(0,0,0,0.5)';
    c.shadowBlur = u * 0.12 * k;
    c.shadowOffsetX = u * 0.03 * k;
    c.shadowOffsetY = u * 0.05 * k;
  };
  const flat = c => {
    c.shadowColor = 'transparent';
    c.shadowBlur = 0;
    c.shadowOffsetX = 0;
    c.shadowOffsetY = 0;
  };
  const edge = (c, u, color = 'rgba(30,16,6,0.75)', k = 0.022) => {
    flat(c);
    c.strokeStyle = color;
    c.lineWidth = Math.max(1, u * k);
    c.stroke();
  };
  const WOOD = ['#a8763f', '#8a5a2c', '#6e4520'],
    PALE = ['#c79c63', '#a97c45', '#86602f'],
    DARK = ['#6b4526', '#52331a', '#3b2410'],
    STONE = ['#a9a498', '#87827a', '#615d56'],
    IRON = ['#6e7278', '#4b4f55', '#2e3136'];
  const grad = (c, x, y, w, h, [a, b, d]) => {
    const g = c.createLinearGradient(x, y, x + w * 0.6, y + h);
    g.addColorStop(0, a);
    g.addColorStop(0.6, b);
    g.addColorStop(1, d);
    return g;
  };
  // Tabla o tablero: rectángulo redondeado con vetas a lo largo.
  function plank(c, u, x, y, w, h, tones = WOOD, r = 0.05) {
    lift(c, u);
    c.fillStyle = grad(c, x, y, w, h, tones);
    rr(c, x, y, w, h, u * r);
    c.fill();
    edge(c, u);
    c.strokeStyle = 'rgba(40,20,5,0.28)';
    c.lineWidth = Math.max(1, u * 0.012);
    c.beginPath();
    const along = w >= h,
      n = Math.max(1, Math.round((along ? h : w) / (u * 0.18)));
    for (let i = 1; i < n; i++) {
      const t = i / n;
      if (along) {
        c.moveTo(x + u * 0.04, y + h * t);
        c.lineTo(x + w - u * 0.04, y + h * t);
      } else {
        c.moveTo(x + w * t, y + u * 0.04);
        c.lineTo(x + w * t, y + h - u * 0.04);
      }
    }
    c.stroke();
  }
  function round(c, u, x, y, r, tones = WOOD) {
    lift(c, u);
    c.fillStyle = grad(c, x - r, y - r, r * 2, r * 2, tones);
    disc(c, x, y, r);
    c.fill();
    edge(c, u);
  }
  function block(c, u, x, y, w, h, tones = STONE, r = 0.04) {
    lift(c, u);
    c.fillStyle = grad(c, x, y, w, h, tones);
    rr(c, x, y, w, h, u * r);
    c.fill();
    edge(c, u, 'rgba(20,18,16,0.7)');
  }
  // Barril visto de arriba: duelas, aro de hierro y tapa.
  function barrel(c, u, x, y, r) {
    round(c, u, x, y, r, WOOD);
    c.strokeStyle = '#3a3a3c';
    c.lineWidth = u * 0.035;
    disc(c, x, y, r * 0.86);
    c.stroke();
    c.fillStyle = grad(c, x - r, y - r, r * 2, r * 2, PALE);
    disc(c, x, y, r * 0.7);
    c.fill();
    c.strokeStyle = 'rgba(40,20,5,0.35)';
    c.lineWidth = Math.max(1, u * 0.012);
    c.beginPath();
    for (const k of [-0.3, 0, 0.3]) {
      const half = Math.sqrt(Math.max(0, 0.49 - k * k)) * r;
      c.moveTo(x + k * r, y - half);
      c.lineTo(x + k * r, y + half);
    }
    c.stroke();
  }
  function crate(c, u, x, y, s) {
    plank(c, u, x, y, s, s, PALE, 0.03);
    c.strokeStyle = 'rgba(60,34,10,0.75)';
    c.lineWidth = u * 0.03;
    c.strokeRect(x + s * 0.1, y + s * 0.1, s * 0.8, s * 0.8);
    c.beginPath();
    c.moveTo(x + s * 0.1, y + s * 0.1);
    c.lineTo(x + s * 0.9, y + s * 0.9);
    c.stroke();
  }
  // Llama: brillo cálido y lenguas de fuego.
  function flame(c, u, x, y, r) {
    flat(c);
    const g = c.createRadialGradient(x, y, 0, x, y, r * 2.2);
    g.addColorStop(0, 'rgba(255,190,90,0.55)');
    g.addColorStop(1, 'rgba(255,150,40,0)');
    c.fillStyle = g;
    disc(c, x, y, r * 2.2);
    c.fill();
    for (const [k, col] of [
      [1, '#e2531b'],
      [0.68, '#f59b23'],
      [0.36, '#ffe08a'],
    ]) {
      c.fillStyle = col;
      c.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU,
          rad = r * k * (i % 2 ? 0.62 : 1);
        c.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
      }
      c.closePath();
      c.fill();
    }
  }
  function cloth(c, u, x, y, w, h, color, r = 0.06) {
    c.fillStyle = color;
    rr(c, x, y, w, h, u * r);
    c.fill();
  }
  function bed(c, u, W, H, cover) {
    plank(c, u, u * 0.08, u * 0.04, W - u * 0.16, H - u * 0.08, DARK, 0.06);
    cloth(c, u, u * 0.13, u * 0.12, W - u * 0.26, H - u * 0.22, '#e9e2d0');
    cloth(c, u, u * 0.13, u * 0.62, W - u * 0.26, H - u * 0.72, cover);
    c.fillStyle = 'rgba(255,255,255,0.14)';
    c.fillRect(u * 0.13, u * 0.62, W - u * 0.26, u * 0.09);
    const n = W > u * 1.5 ? 2 : 1,
      pw = (W - u * 0.36) / n;
    for (let i = 0; i < n; i++) {
      lift(c, u, 0.5);
      cloth(c, u, u * 0.18 + i * pw + u * 0.03, u * 0.19, pw - u * 0.06, u * 0.3, '#fbf7ea', 0.1);
      flat(c);
    }
  }
  function rug(c, u, x, y, w, h, main, trim) {
    flat(c);
    cloth(c, u, x, y, w, h, trim, 0.04);
    cloth(c, u, x + u * 0.08, y + u * 0.08, w - u * 0.16, h - u * 0.16, main, 0.03);
    c.strokeStyle = trim;
    c.lineWidth = u * 0.03;
    c.strokeRect(x + u * 0.2, y + u * 0.2, w - u * 0.4, h - u * 0.4);
    c.fillStyle = trim;
    c.beginPath();
    c.moveTo(x + w / 2, y + h * 0.3);
    c.lineTo(x + w * 0.62, y + h / 2);
    c.lineTo(x + w / 2, y + h * 0.7);
    c.lineTo(x + w * 0.38, y + h / 2);
    c.closePath();
    c.fill();
  }

  // ---------- Catálogo ----------
  // [id, nombre, grupo, ancho, alto, dibujo(c, u, W, H), opciones]. u = tamaño de una casilla en píxeles.
  // Opciones: light = pies de luz; flat = va pegado al piso (se dibuja debajo del resto).
  const LIST = [
    [
      'table',
      'Mesa redonda',
      'inn',
      1,
      1,
      (c, u) => {
        round(c, u, u / 2, u / 2, u * 0.38);
        c.strokeStyle = 'rgba(40,20,5,0.3)';
        c.lineWidth = Math.max(1, u * 0.012);
        disc(c, u / 2, u / 2, u * 0.24);
        c.stroke();
      },
    ],
    ['table2', 'Mesa larga', 'inn', 2, 1, (c, u, W, H) => plank(c, u, u * 0.1, u * 0.16, W - u * 0.2, H - u * 0.32)],
    [
      'table4',
      'Mesa grande',
      'inn',
      2,
      2,
      (c, u, W) => {
        round(c, u, W / 2, W / 2, u * 0.78);
        c.strokeStyle = 'rgba(40,20,5,0.3)';
        c.lineWidth = Math.max(1, u * 0.014);
        for (const r of [0.55, 0.3]) {
          disc(c, W / 2, W / 2, u * r);
          c.stroke();
        }
      },
    ],
    [
      'chair',
      'Silla',
      'inn',
      1,
      1,
      (c, u) => {
        plank(c, u, u * 0.28, u * 0.3, u * 0.44, u * 0.42, PALE, 0.08);
        plank(c, u, u * 0.25, u * 0.2, u * 0.5, u * 0.13, DARK, 0.05);
      },
    ],
    ['stool', 'Banqueta', 'inn', 1, 1, (c, u) => round(c, u, u / 2, u / 2, u * 0.2, PALE)],
    ['bench', 'Banco', 'inn', 2, 1, (c, u, W) => plank(c, u, u * 0.12, u * 0.34, W - u * 0.24, u * 0.32, PALE)],
    [
      'bar',
      'Barra',
      'inn',
      1,
      1,
      (c, u) => {
        plank(c, u, 0, u * 0.18, u, u * 0.64, DARK, 0.02);
        c.fillStyle = 'rgba(255,220,160,0.12)';
        c.fillRect(0, u * 0.22, u, u * 0.1);
      },
    ],
    ['bed', 'Cama', 'inn', 1, 2, (c, u, W, H) => bed(c, u, W, H, '#8c3b2e')],
    ['bed2', 'Cama doble', 'inn', 2, 2, (c, u, W, H) => bed(c, u, W, H, '#3d5a80')],
    [
      'wardrobe',
      'Ropero',
      'inn',
      2,
      1,
      (c, u, W) => {
        plank(c, u, u * 0.08, u * 0.1, W - u * 0.16, u * 0.72, DARK, 0.04);
        c.strokeStyle = 'rgba(20,10,2,0.7)';
        c.lineWidth = u * 0.025;
        c.beginPath();
        c.moveTo(W / 2, u * 0.12);
        c.lineTo(W / 2, u * 0.8);
        c.stroke();
        c.fillStyle = '#d8b25c';
        for (const dx of [-0.08, 0.08]) {
          disc(c, W / 2 + u * dx, u * 0.7, u * 0.03);
          c.fill();
        }
      },
    ],
    [
      'bookshelf',
      'Biblioteca',
      'inn',
      2,
      1,
      (c, u, W) => {
        plank(c, u, u * 0.06, u * 0.08, W - u * 0.12, u * 0.5, DARK, 0.03);
        const cols = ['#8c3b2e', '#3d5a80', '#5b7a3a', '#c9a24b', '#6b4a7a', '#a4532a'];
        let x = u * 0.12,
          i = 0;
        while (x < W - u * 0.2) {
          const w = u * (0.07 + ((i * 37) % 5) * 0.012);
          c.fillStyle = cols[(i * 5) % cols.length];
          c.fillRect(x, u * 0.14, w, u * 0.38);
          x += w + u * 0.012;
          i++;
        }
      },
    ],
    [
      'desk',
      'Escritorio',
      'inn',
      2,
      1,
      (c, u, W) => {
        plank(c, u, u * 0.1, u * 0.12, W - u * 0.2, u * 0.66);
        lift(c, u, 0.4);
        c.fillStyle = '#efe6cf';
        c.fillRect(u * 0.35, u * 0.28, u * 0.42, u * 0.32);
        flat(c);
        c.fillStyle = '#2a2622';
        disc(c, W - u * 0.4, u * 0.36, u * 0.07);
        c.fill();
        c.strokeStyle = '#efe6cf';
        c.lineWidth = u * 0.02;
        c.beginPath();
        c.moveTo(W - u * 0.4, u * 0.36);
        c.lineTo(W - u * 0.28, u * 0.2);
        c.stroke();
      },
    ],
    [
      'rug',
      'Alfombra',
      'inn',
      3,
      2,
      (c, u, W, H) => rug(c, u, u * 0.1, u * 0.1, W - u * 0.2, H - u * 0.2, '#7d2e2a', '#d2a95a'),
      { flat: true },
    ],
    [
      'rug2',
      'Alfombra redonda',
      'inn',
      2,
      2,
      (c, u, W) => {
        flat(c);
        for (const [r, col] of [
          [0.9, '#d2a95a'],
          [0.8, '#2f4f6b'],
          [0.5, '#d2a95a'],
          [0.42, '#3d6a8c'],
        ]) {
          c.fillStyle = col;
          disc(c, W / 2, W / 2, u * r);
          c.fill();
        }
      },
      { flat: true },
    ],
    [
      'hearth',
      'Hogar',
      'inn',
      2,
      1,
      (c, u, W) => {
        block(c, u, u * 0.04, u * 0.04, W - u * 0.08, u * 0.62);
        c.fillStyle = '#16110d';
        rr(c, u * 0.3, u * 0.2, W - u * 0.6, u * 0.46, u * 0.05);
        c.fill();
        flame(c, u, W / 2, u * 0.46, u * 0.2);
        c.fillStyle = '#4a3320';
        c.fillRect(W / 2 - u * 0.3, u * 0.5, u * 0.6, u * 0.07);
      },
      { light: 30 },
    ],
    [
      'stove',
      'Cocina',
      'inn',
      1,
      1,
      (c, u) => {
        block(c, u, u * 0.1, u * 0.1, u * 0.8, u * 0.8, IRON, 0.05);
        for (const [x, y] of [
          [0.34, 0.36],
          [0.66, 0.36],
          [0.34, 0.66],
          [0.66, 0.66],
        ]) {
          c.fillStyle = '#1c1d20';
          disc(c, u * x, u * y, u * 0.11);
          c.fill();
          c.strokeStyle = '#b5521c';
          c.lineWidth = u * 0.02;
          disc(c, u * x, u * y, u * 0.06);
          c.stroke();
        }
      },
    ],
    [
      'cauldron',
      'Caldero',
      'inn',
      1,
      1,
      (c, u) => {
        round(c, u, u / 2, u / 2, u * 0.33, IRON);
        c.fillStyle = '#5d7a2e';
        disc(c, u / 2, u / 2, u * 0.24);
        c.fill();
        c.fillStyle = 'rgba(220,240,160,0.5)';
        for (const [x, y, r] of [
          [0.42, 0.44, 0.04],
          [0.58, 0.55, 0.03],
          [0.5, 0.36, 0.025],
        ]) {
          disc(c, u * x, u * y, u * r);
          c.fill();
        }
      },
    ],
    [
      'tub',
      'Tina',
      'inn',
      1,
      2,
      (c, u, W, H) => {
        plank(c, u, u * 0.14, u * 0.12, W - u * 0.28, H - u * 0.24, PALE, 0.3);
        c.fillStyle = '#6fa7c4';
        rr(c, u * 0.22, u * 0.2, W - u * 0.44, H - u * 0.4, u * 0.24);
        c.fill();
      },
    ],

    ['barrel', 'Barril', 'store', 1, 1, (c, u) => barrel(c, u, u / 2, u / 2, u * 0.34)],
    [
      'barrels',
      'Barriles',
      'store',
      2,
      1,
      (c, u, W) => {
        barrel(c, u, u * 0.36, u * 0.42, u * 0.3);
        barrel(c, u, W - u * 0.4, u * 0.56, u * 0.32);
        barrel(c, u, W / 2, u * 0.34, u * 0.24);
      },
    ],
    [
      'keg',
      'Tonel acostado',
      'store',
      2,
      1,
      (c, u, W) => {
        plank(c, u, u * 0.14, u * 0.12, W - u * 0.28, u * 0.76, WOOD, 0.3);
        c.strokeStyle = '#3a3a3c';
        c.lineWidth = u * 0.05;
        for (const k of [0.3, 0.7]) {
          c.beginPath();
          c.moveTo(W * k, u * 0.13);
          c.lineTo(W * k, u * 0.87);
          c.stroke();
        }
        c.fillStyle = '#d8b25c';
        disc(c, W - u * 0.16, u / 2, u * 0.05);
        c.fill();
      },
    ],
    ['crate', 'Cajón', 'store', 1, 1, (c, u) => crate(c, u, u * 0.16, u * 0.16, u * 0.68)],
    [
      'crates',
      'Cajones apilados',
      'store',
      2,
      1,
      (c, u, W) => {
        crate(c, u, u * 0.08, u * 0.2, u * 0.7);
        crate(c, u, W - u * 0.82, u * 0.1, u * 0.74);
        crate(c, u, W / 2 - u * 0.25, u * 0.3, u * 0.5);
      },
    ],
    [
      'chest',
      'Cofre',
      'store',
      1,
      1,
      (c, u) => {
        plank(c, u, u * 0.14, u * 0.24, u * 0.72, u * 0.52, WOOD, 0.08);
        c.fillStyle = '#3a3a3c';
        for (const k of [0.26, 0.68]) c.fillRect(u * k, u * 0.24, u * 0.06, u * 0.52);
        c.fillStyle = '#d8b25c';
        c.fillRect(u * 0.45, u * 0.42, u * 0.1, u * 0.14);
      },
    ],
    [
      'sacks',
      'Bolsas',
      'store',
      1,
      1,
      (c, u) => {
        for (const [x, y, r] of [
          [0.36, 0.4, 0.22],
          [0.64, 0.46, 0.2],
          [0.48, 0.68, 0.2],
        ]) {
          round(c, u, u * x, u * y, u * r, ['#cdb890', '#a8946c', '#84724f']);
          c.fillStyle = '#6b5a3c';
          disc(c, u * x, u * (y - r * 0.5), u * 0.035);
          c.fill();
        }
      },
    ],
    [
      'shelf',
      'Estante',
      'store',
      2,
      1,
      (c, u, W) => {
        plank(c, u, u * 0.06, u * 0.06, W - u * 0.12, u * 0.36, PALE, 0.03);
        const stuff = ['#8c3b2e', '#c9a24b', '#5b7a3a', '#3d5a80', '#d9d2c0'];
        for (let i = 0; i < 6; i++) {
          c.fillStyle = stuff[i % stuff.length];
          disc(c, u * (0.24 + i * 0.3), u * 0.24, u * (0.07 + (i % 3) * 0.015));
          c.fill();
        }
      },
    ],
    [
      'anvil',
      'Yunque',
      'store',
      1,
      1,
      (c, u) => {
        round(c, u, u / 2, u / 2, u * 0.3, PALE);
        block(c, u, u * 0.26, u * 0.38, u * 0.5, u * 0.24, IRON, 0.03);
        c.fillStyle = '#4b4f55';
        c.beginPath();
        c.moveTo(u * 0.26, u * 0.4);
        c.lineTo(u * 0.12, u * 0.5);
        c.lineTo(u * 0.26, u * 0.6);
        c.fill();
      },
    ],
    [
      'forge',
      'Fragua',
      'store',
      2,
      1,
      (c, u, W) => {
        block(c, u, u * 0.06, u * 0.08, W - u * 0.12, u * 0.8);
        c.fillStyle = '#16110d';
        rr(c, u * 0.22, u * 0.22, W - u * 0.44, u * 0.52, u * 0.06);
        c.fill();
        flame(c, u, W / 2, u * 0.48, u * 0.2);
        c.fillStyle = '#2a2622';
        for (let i = 0; i < 7; i++) {
          disc(c, W / 2 + u * (Math.cos(i * 2.3) * 0.42), u * (0.48 + Math.sin(i * 1.7) * 0.16), u * 0.05);
          c.fill();
        }
      },
      { light: 20 },
    ],
    [
      'rack',
      'Armero',
      'store',
      2,
      1,
      (c, u, W) => {
        plank(c, u, u * 0.08, u * 0.1, W - u * 0.16, u * 0.2, DARK, 0.03);
        for (let i = 0; i < 5; i++) {
          const x = u * (0.26 + i * 0.37);
          c.strokeStyle = i % 2 ? '#c8ccd2' : '#8a5a2c';
          c.lineWidth = u * 0.045;
          c.lineCap = 'round';
          c.beginPath();
          c.moveTo(x, u * 0.16);
          c.lineTo(x, u * 0.82);
          c.stroke();
          if (i % 2) {
            c.strokeStyle = '#d8b25c';
            c.beginPath();
            c.moveTo(x - u * 0.08, u * 0.3);
            c.lineTo(x + u * 0.08, u * 0.3);
            c.stroke();
          }
        }
        c.lineCap = 'butt';
      },
    ],
    [
      'woodpile',
      'Leña',
      'store',
      1,
      1,
      (c, u) => {
        for (let r = 0; r < 3; r++)
          for (let i = 0; i < 3 - (r % 2); i++) {
            const x = u * (0.26 + i * 0.24 + (r % 2) * 0.12),
              y = u * (0.3 + r * 0.2);
            round(c, u, x, y, u * 0.12, PALE);
            c.strokeStyle = 'rgba(60,34,10,0.6)';
            c.lineWidth = Math.max(1, u * 0.012);
            disc(c, x, y, u * 0.06);
            c.stroke();
          }
      },
    ],

    [
      'pillar',
      'Columna',
      'temple',
      1,
      1,
      (c, u) => {
        block(c, u, u * 0.14, u * 0.14, u * 0.72, u * 0.72, STONE, 0.04);
        round(c, u, u / 2, u / 2, u * 0.26, ['#c4bfb2', '#9d988d', '#77736b']);
      },
    ],
    [
      'statue',
      'Estatua',
      'temple',
      1,
      1,
      (c, u) => {
        block(c, u, u * 0.16, u * 0.16, u * 0.68, u * 0.68, STONE, 0.06);
        round(c, u, u / 2, u * 0.54, u * 0.2, ['#cfcabd', '#a6a196', '#7c7870']);
        round(c, u, u / 2, u * 0.4, u * 0.11, ['#dcd7ca', '#b3aea2', '#8a867d']);
        c.strokeStyle = '#7c7870';
        c.lineWidth = u * 0.05;
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(u * 0.32, u * 0.56);
        c.lineTo(u * 0.24, u * 0.36);
        c.moveTo(u * 0.68, u * 0.56);
        c.lineTo(u * 0.76, u * 0.7);
        c.stroke();
        c.lineCap = 'butt';
      },
    ],
    [
      'altar',
      'Altar',
      'temple',
      2,
      1,
      (c, u, W) => {
        block(c, u, u * 0.08, u * 0.14, W - u * 0.16, u * 0.72);
        cloth(c, u, W / 2 - u * 0.3, u * 0.14, u * 0.6, u * 0.72, '#7d2e2a', 0.01);
        c.fillStyle = '#d8b25c';
        c.fillRect(W / 2 - u * 0.03, u * 0.3, u * 0.06, u * 0.4);
        c.fillRect(W / 2 - u * 0.13, u * 0.4, u * 0.26, u * 0.06);
        for (const x of [u * 0.3, W - u * 0.3]) {
          c.fillStyle = '#efe6cf';
          disc(c, x, u / 2, u * 0.06);
          c.fill();
          c.fillStyle = '#ffb347';
          disc(c, x, u / 2, u * 0.03);
          c.fill();
        }
      },
    ],
    [
      'throne',
      'Trono',
      'temple',
      1,
      1,
      (c, u) => {
        block(c, u, u * 0.14, u * 0.1, u * 0.72, u * 0.26, ['#d8b25c', '#b08a3c', '#7d5f22'], 0.06);
        plank(c, u, u * 0.18, u * 0.3, u * 0.64, u * 0.56, DARK, 0.06);
        cloth(c, u, u * 0.26, u * 0.38, u * 0.48, u * 0.42, '#7d2e2a', 0.05);
        for (const x of [0.14, 0.76])
          block(c, u, u * x, u * 0.34, u * 0.1, u * 0.5, ['#d8b25c', '#b08a3c', '#7d5f22'], 0.03);
      },
    ],
    [
      'coffin',
      'Sarcófago',
      'temple',
      1,
      2,
      (c, u, W, H) => {
        block(c, u, u * 0.14, u * 0.1, W - u * 0.28, H - u * 0.2);
        block(c, u, u * 0.22, u * 0.2, W - u * 0.44, H - u * 0.4, ['#c4bfb2', '#9d988d', '#77736b'], 0.14);
        c.strokeStyle = 'rgba(30,28,25,0.5)';
        c.lineWidth = u * 0.03;
        c.beginPath();
        c.moveTo(W / 2, u * 0.4);
        c.lineTo(W / 2, H - u * 0.5);
        c.moveTo(W / 2 - u * 0.12, u * 0.62);
        c.lineTo(W / 2 + u * 0.12, u * 0.62);
        c.stroke();
      },
    ],
    [
      'brazier',
      'Brasero',
      'temple',
      1,
      1,
      (c, u) => {
        round(c, u, u / 2, u / 2, u * 0.28, IRON);
        c.fillStyle = '#1c1512';
        disc(c, u / 2, u / 2, u * 0.2);
        c.fill();
        flame(c, u, u / 2, u / 2, u * 0.17);
      },
      { light: 20 },
    ],
    [
      'candles',
      'Candelabro',
      'temple',
      1,
      1,
      (c, u) => {
        round(c, u, u / 2, u / 2, u * 0.1, ['#d8b25c', '#b08a3c', '#7d5f22']);
        c.strokeStyle = '#b08a3c';
        c.lineWidth = u * 0.03;
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * TAU - Math.PI / 2,
            x = u / 2 + Math.cos(a) * u * 0.2,
            y = u / 2 + Math.sin(a) * u * 0.2;
          c.beginPath();
          c.moveTo(u / 2, u / 2);
          c.lineTo(x, y);
          c.stroke();
          c.fillStyle = '#efe6cf';
          disc(c, x, y, u * 0.06);
          c.fill();
          flame(c, u, x, y, u * 0.045);
        }
      },
      { light: 10 },
    ],
    [
      'cage',
      'Jaula',
      'temple',
      1,
      1,
      (c, u) => {
        block(c, u, u * 0.12, u * 0.12, u * 0.76, u * 0.76, ['#3b3d42', '#2a2c30', '#1b1c1f'], 0.04);
        c.strokeStyle = '#8a8e96';
        c.lineWidth = u * 0.035;
        c.beginPath();
        for (let i = 0; i <= 4; i++) {
          const k = u * (0.16 + i * 0.17);
          c.moveTo(k, u * 0.14);
          c.lineTo(k, u * 0.86);
        }
        c.stroke();
        c.strokeRect(u * 0.14, u * 0.14, u * 0.72, u * 0.72);
      },
    ],
    [
      'bones',
      'Huesos',
      'temple',
      1,
      1,
      (c, u) => {
        flat(c);
        c.strokeStyle = '#e4dcc6';
        c.lineCap = 'round';
        c.lineWidth = u * 0.045;
        c.beginPath();
        for (const [a, b, d, e] of [
          [0.24, 0.62, 0.6, 0.74],
          [0.36, 0.8, 0.7, 0.56],
          [0.5, 0.5, 0.78, 0.4],
        ]) {
          c.moveTo(u * a, u * b);
          c.lineTo(u * d, u * e);
        }
        c.stroke();
        c.lineCap = 'butt';
        c.fillStyle = '#ece5d0';
        disc(c, u * 0.38, u * 0.36, u * 0.13);
        c.fill();
        c.fillStyle = '#2a2622';
        for (const x of [0.33, 0.43]) {
          disc(c, u * x, u * 0.35, u * 0.03);
          c.fill();
        }
      },
      { flat: true },
    ],
    [
      'web',
      'Telaraña',
      'temple',
      1,
      1,
      (c, u) => {
        flat(c);
        c.strokeStyle = 'rgba(235,235,235,0.6)';
        c.lineWidth = Math.max(1, u * 0.014);
        c.beginPath();
        for (let i = 0; i <= 4; i++) {
          const a = (i / 4) * (Math.PI / 2);
          c.moveTo(u * 0.04, u * 0.04);
          c.lineTo(u * 0.04 + Math.cos(a) * u * 0.9, u * 0.04 + Math.sin(a) * u * 0.9);
        }
        for (const r of [0.3, 0.55, 0.8]) {
          c.moveTo(u * 0.04 + u * r, u * 0.04);
          c.arc(u * 0.04, u * 0.04, u * r, 0, Math.PI / 2);
        }
        c.stroke();
      },
      { flat: true },
    ],

    [
      'well',
      'Pozo',
      'out',
      1,
      1,
      (c, u) => {
        round(c, u, u / 2, u / 2, u * 0.4, STONE);
        c.fillStyle = '#16303c';
        disc(c, u / 2, u / 2, u * 0.26);
        c.fill();
        c.fillStyle = 'rgba(120,180,210,0.5)';
        disc(c, u * 0.46, u * 0.46, u * 0.1);
        c.fill();
        plank(c, u, u * 0.08, u * 0.46, u * 0.84, u * 0.08, DARK, 0.02);
      },
    ],
    [
      'fountain',
      'Fuente',
      'out',
      2,
      2,
      (c, u, W) => {
        round(c, u, W / 2, W / 2, u * 0.9, STONE);
        c.fillStyle = '#3f79a8';
        disc(c, W / 2, W / 2, u * 0.74);
        c.fill();
        c.strokeStyle = 'rgba(255,255,255,0.35)';
        c.lineWidth = u * 0.02;
        for (const r of [0.6, 0.42]) {
          disc(c, W / 2, W / 2, u * r);
          c.stroke();
        }
        round(c, u, W / 2, W / 2, u * 0.24, ['#c4bfb2', '#9d988d', '#77736b']);
        c.fillStyle = '#bfe1ee';
        disc(c, W / 2, W / 2, u * 0.1);
        c.fill();
      },
    ],
    [
      'cart',
      'Carro',
      'out',
      2,
      1,
      (c, u, W) => {
        c.fillStyle = '#2a2622';
        for (const x of [u * 0.36, W - u * 0.5])
          for (const y of [u * 0.06, u * 0.82]) {
            rr(c, x, y, u * 0.34, u * 0.12, u * 0.04);
            c.fill();
          }
        plank(c, u, u * 0.2, u * 0.18, W - u * 0.56, u * 0.64, PALE, 0.03);
        c.strokeStyle = '#6e4520';
        c.lineWidth = u * 0.05;
        c.beginPath();
        c.moveTo(W - u * 0.36, u * 0.34);
        c.lineTo(W - u * 0.04, u * 0.34);
        c.moveTo(W - u * 0.36, u * 0.66);
        c.lineTo(W - u * 0.04, u * 0.66);
        c.stroke();
        crate(c, u, u * 0.3, u * 0.28, u * 0.4);
      },
    ],
    [
      'stall',
      'Puesto de feria',
      'out',
      2,
      1,
      (c, u, W) => {
        plank(c, u, u * 0.08, u * 0.5, W - u * 0.16, u * 0.36, PALE, 0.03);
        lift(c, u);
        const n = 6,
          w = (W - u * 0.08) / n;
        for (let i = 0; i < n; i++) {
          c.fillStyle = i % 2 ? '#e9e2d0' : '#b23a2e';
          c.fillRect(u * 0.04 + i * w, u * 0.06, w, u * 0.5);
        }
        flat(c);
        for (let i = 0; i < 5; i++) {
          c.fillStyle = ['#c9a24b', '#8c3b2e', '#5b7a3a'][i % 3];
          disc(c, u * (0.3 + i * 0.35), u * 0.7, u * 0.07);
          c.fill();
        }
      },
    ],
    [
      'tent',
      'Carpa',
      'out',
      2,
      2,
      (c, u, W) => {
        lift(c, u, 1.4);
        c.fillStyle = '#b9a67c';
        rr(c, u * 0.14, u * 0.14, W - u * 0.28, W - u * 0.28, u * 0.06);
        c.fill();
        flat(c);
        c.fillStyle = 'rgba(0,0,0,0.16)';
        c.beginPath();
        c.moveTo(W / 2, u * 0.14);
        c.lineTo(W - u * 0.14, u * 0.14);
        c.lineTo(W - u * 0.14, W - u * 0.14);
        c.lineTo(W / 2, W - u * 0.14);
        c.fill();
        c.strokeStyle = '#6b5a3c';
        c.lineWidth = u * 0.04;
        c.beginPath();
        c.moveTo(W / 2, u * 0.14);
        c.lineTo(W / 2, W - u * 0.14);
        c.stroke();
        c.fillStyle = '#2a2219';
        c.beginPath();
        c.moveTo(W / 2, W - u * 0.7);
        c.lineTo(W / 2 + u * 0.24, W - u * 0.14);
        c.lineTo(W / 2 - u * 0.24, W - u * 0.14);
        c.fill();
      },
    ],
    [
      'campfire',
      'Fogata',
      'out',
      1,
      1,
      (c, u) => {
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * TAU;
          round(c, u, u / 2 + Math.cos(a) * u * 0.3, u / 2 + Math.sin(a) * u * 0.3, u * 0.08, STONE);
        }
        c.strokeStyle = '#5a3a1c';
        c.lineWidth = u * 0.07;
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(u * 0.34, u * 0.36);
        c.lineTo(u * 0.66, u * 0.64);
        c.moveTo(u * 0.66, u * 0.36);
        c.lineTo(u * 0.34, u * 0.64);
        c.stroke();
        c.lineCap = 'butt';
        flame(c, u, u / 2, u / 2, u * 0.17);
      },
      { light: 40 },
    ],
    [
      'lamp',
      'Farol de calle',
      'out',
      1,
      1,
      (c, u) => {
        round(c, u, u / 2, u / 2, u * 0.13, IRON);
        flame(c, u, u / 2, u / 2, u * 0.08);
      },
      { light: 30 },
    ],
    [
      'fence',
      'Cerca',
      'out',
      1,
      1,
      (c, u) => {
        plank(c, u, 0, u * 0.42, u, u * 0.07, PALE, 0.01);
        plank(c, u, 0, u * 0.54, u, u * 0.07, PALE, 0.01);
        for (const x of [0.06, 0.46, 0.86]) round(c, u, u * (x + 0.04), u / 2, u * 0.07, DARK);
      },
    ],
    [
      'hay',
      'Fardo de heno',
      'out',
      1,
      1,
      (c, u) => {
        lift(c, u);
        c.fillStyle = grad(c, 0, 0, u, u, ['#e2c56a', '#c9a646', '#9c7e2e']);
        rr(c, u * 0.14, u * 0.2, u * 0.72, u * 0.6, u * 0.08);
        c.fill();
        edge(c, u, 'rgba(90,66,14,0.7)');
        c.strokeStyle = 'rgba(110,80,20,0.6)';
        c.lineWidth = u * 0.02;
        c.beginPath();
        for (const k of [0.34, 0.66]) {
          c.moveTo(u * k, u * 0.2);
          c.lineTo(u * k, u * 0.8);
        }
        c.stroke();
      },
    ],
    [
      'log',
      'Tronco caído',
      'out',
      2,
      1,
      (c, u, W) => {
        plank(c, u, u * 0.1, u * 0.3, W - u * 0.2, u * 0.4, DARK, 0.2);
        round(c, u, W - u * 0.2, u / 2, u * 0.19, PALE);
        c.strokeStyle = 'rgba(60,34,10,0.6)';
        c.lineWidth = Math.max(1, u * 0.014);
        disc(c, W - u * 0.2, u / 2, u * 0.1);
        c.stroke();
      },
    ],
    [
      'stump',
      'Tocón',
      'out',
      1,
      1,
      (c, u) => {
        round(c, u, u / 2, u / 2, u * 0.3, DARK);
        round(c, u, u / 2, u / 2, u * 0.23, PALE);
        c.strokeStyle = 'rgba(60,34,10,0.5)';
        c.lineWidth = Math.max(1, u * 0.014);
        for (const r of [0.15, 0.08]) {
          disc(c, u / 2, u / 2, u * r);
          c.stroke();
        }
      },
    ],
    [
      'boulder',
      'Piedra grande',
      'out',
      1,
      1,
      (c, u) => {
        lift(c, u);
        c.fillStyle = grad(c, 0, 0, u, u, STONE);
        c.beginPath();
        for (const [x, y] of [
          [0.2, 0.5],
          [0.32, 0.22],
          [0.62, 0.16],
          [0.84, 0.4],
          [0.78, 0.74],
          [0.46, 0.86],
          [0.24, 0.72],
        ])
          c.lineTo(u * x, u * y);
        c.closePath();
        c.fill();
        edge(c, u, 'rgba(20,18,16,0.7)');
        c.strokeStyle = 'rgba(255,255,255,0.18)';
        c.beginPath();
        c.moveTo(u * 0.36, u * 0.3);
        c.lineTo(u * 0.6, u * 0.26);
        c.stroke();
      },
    ],
    [
      'bush',
      'Arbusto',
      'out',
      1,
      1,
      (c, u) => {
        for (const [x, y, r, col] of [
          [0.4, 0.42, 0.26, '#3f6b33'],
          [0.62, 0.5, 0.24, '#4d7f3d'],
          [0.46, 0.64, 0.22, '#5a8f47'],
        ]) {
          lift(c, u, 0.7);
          c.fillStyle = col;
          disc(c, u * x, u * y, u * r);
          c.fill();
        }
        flat(c);
        c.fillStyle = '#c8473c';
        for (const [x, y] of [
          [0.36, 0.4],
          [0.6, 0.44],
          [0.5, 0.66],
          [0.68, 0.58],
        ]) {
          disc(c, u * x, u * y, u * 0.03);
          c.fill();
        }
      },
    ],
    [
      'sign',
      'Cartel',
      'out',
      1,
      1,
      (c, u) => {
        round(c, u, u / 2, u * 0.7, u * 0.07, DARK);
        plank(c, u, u * 0.16, u * 0.26, u * 0.68, u * 0.3, PALE, 0.04);
        c.fillStyle = 'rgba(60,34,10,0.7)';
        c.fillRect(u * 0.26, u * 0.35, u * 0.48, u * 0.03);
        c.fillRect(u * 0.26, u * 0.43, u * 0.34, u * 0.03);
      },
    ],
    [
      'grave',
      'Lápida',
      'out',
      1,
      1,
      (c, u) => {
        flat(c);
        c.fillStyle = 'rgba(60,45,25,0.5)';
        rr(c, u * 0.26, u * 0.4, u * 0.48, u * 0.5, u * 0.1);
        c.fill();
        block(c, u, u * 0.26, u * 0.12, u * 0.48, u * 0.3, STONE, 0.14);
        c.strokeStyle = 'rgba(30,28,25,0.5)';
        c.lineWidth = u * 0.025;
        c.beginPath();
        c.moveTo(u / 2, u * 0.18);
        c.lineTo(u / 2, u * 0.36);
        c.moveTo(u * 0.42, u * 0.25);
        c.lineTo(u * 0.58, u * 0.25);
        c.stroke();
      },
    ],
    [
      'trough',
      'Bebedero',
      'out',
      2,
      1,
      (c, u, W) => {
        plank(c, u, u * 0.14, u * 0.26, W - u * 0.28, u * 0.48, DARK, 0.06);
        c.fillStyle = '#4b88ad';
        rr(c, u * 0.22, u * 0.34, W - u * 0.44, u * 0.32, u * 0.04);
        c.fill();
      },
    ],
    [
      'crops',
      'Huerta',
      'out',
      2,
      2,
      (c, u, W) => {
        flat(c);
        c.fillStyle = '#5d4326';
        rr(c, u * 0.06, u * 0.06, W - u * 0.12, W - u * 0.12, u * 0.05);
        c.fill();
        for (let r = 0; r < 4; r++) {
          c.fillStyle = '#4a341c';
          c.fillRect(u * 0.12, u * (0.2 + r * 0.46), W - u * 0.24, u * 0.12);
          for (let i = 0; i < 6; i++) {
            c.fillStyle = (r + i) % 3 ? '#5a8f47' : '#7fae4e';
            disc(c, u * (0.25 + i * 0.3), u * (0.26 + r * 0.46), u * 0.08);
            c.fill();
          }
        }
      },
      { flat: true },
    ],

    [
      'mast',
      'Mástil',
      'ship',
      1,
      1,
      (c, u) => {
        round(c, u, u / 2, u / 2, u * 0.3, DARK);
        round(c, u, u / 2, u / 2, u * 0.2, PALE);
        c.strokeStyle = '#c9b98f';
        c.lineWidth = u * 0.03;
        disc(c, u / 2, u / 2, u * 0.25);
        c.stroke();
      },
    ],
    [
      'helm',
      'Timón',
      'ship',
      1,
      1,
      (c, u) => {
        lift(c, u);
        c.strokeStyle = '#6e4520';
        c.lineWidth = u * 0.07;
        disc(c, u / 2, u / 2, u * 0.26);
        c.stroke();
        flat(c);
        c.lineWidth = u * 0.04;
        c.beginPath();
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI;
          c.moveTo(u / 2 - Math.cos(a) * u * 0.38, u / 2 - Math.sin(a) * u * 0.38);
          c.lineTo(u / 2 + Math.cos(a) * u * 0.38, u / 2 + Math.sin(a) * u * 0.38);
        }
        c.stroke();
        round(c, u, u / 2, u / 2, u * 0.08, ['#d8b25c', '#b08a3c', '#7d5f22']);
      },
    ],
    [
      'cannon',
      'Cañón',
      'ship',
      1,
      2,
      (c, u, W, H) => {
        plank(c, u, u * 0.2, H - u * 0.9, u * 0.6, u * 0.76, DARK, 0.05);
        c.fillStyle = '#2a2622';
        for (const x of [0.1, 0.78])
          for (const y of [H - u * 0.8, H - u * 0.36]) {
            rr(c, u * x, y, u * 0.12, u * 0.22, u * 0.03);
            c.fill();
          }
        block(c, u, u * 0.36, u * 0.12, u * 0.28, H - u * 0.5, IRON, 0.12);
        c.fillStyle = '#16110d';
        disc(c, u / 2, u * 0.18, u * 0.08);
        c.fill();
      },
    ],
    [
      'rope',
      'Rollo de soga',
      'ship',
      1,
      1,
      (c, u) => {
        lift(c, u, 0.6);
        c.strokeStyle = '#c9b98f';
        c.lineWidth = u * 0.06;
        for (const r of [0.28, 0.19, 0.1]) {
          disc(c, u / 2, u / 2, u * r);
          c.stroke();
        }
        flat(c);
        c.strokeStyle = 'rgba(90,70,30,0.5)';
        c.lineWidth = Math.max(1, u * 0.012);
        for (const r of [0.31, 0.235, 0.145]) {
          disc(c, u / 2, u / 2, u * r);
          c.stroke();
        }
      },
    ],
    [
      'boat',
      'Bote',
      'ship',
      1,
      2,
      (c, u, W, H) => {
        lift(c, u);
        c.fillStyle = grad(c, 0, 0, W, H, WOOD);
        c.beginPath();
        c.moveTo(W / 2, u * 0.06);
        c.quadraticCurveTo(W - u * 0.08, u * 0.5, W - u * 0.16, H - u * 0.14);
        c.lineTo(u * 0.16, H - u * 0.14);
        c.quadraticCurveTo(u * 0.08, u * 0.5, W / 2, u * 0.06);
        c.fill();
        edge(c, u);
        c.fillStyle = 'rgba(30,16,6,0.35)';
        c.beginPath();
        c.moveTo(W / 2, u * 0.26);
        c.quadraticCurveTo(W - u * 0.22, u * 0.6, W - u * 0.26, H - u * 0.24);
        c.lineTo(u * 0.26, H - u * 0.24);
        c.quadraticCurveTo(u * 0.22, u * 0.6, W / 2, u * 0.26);
        c.fill();
        for (const y of [u * 0.8, H - u * 0.56]) plank(c, u, u * 0.2, y, W - u * 0.4, u * 0.12, PALE, 0.02);
      },
    ],
    [
      'hammock',
      'Hamaca',
      'ship',
      1,
      2,
      (c, u, W, H) => {
        for (const y of [u * 0.1, H - u * 0.1]) round(c, u, W / 2, y, u * 0.06, DARK);
        lift(c, u, 0.6);
        c.fillStyle = '#cdb890';
        c.beginPath();
        c.moveTo(W / 2, u * 0.12);
        c.quadraticCurveTo(W - u * 0.1, H / 2, W / 2, H - u * 0.12);
        c.quadraticCurveTo(u * 0.1, H / 2, W / 2, u * 0.12);
        c.fill();
        flat(c);
        c.strokeStyle = 'rgba(110,90,50,0.6)';
        c.lineWidth = Math.max(1, u * 0.014);
        c.beginPath();
        for (const k of [0.35, 0.5, 0.65]) {
          c.moveTo(u * 0.28, H * k);
          c.lineTo(W - u * 0.28, H * k);
        }
        c.stroke();
      },
    ],
  ];
  const CATALOG = LIST.map(([id, name, group, w, h, draw, opt = {}]) => ({
    id,
    name,
    group,
    w,
    h,
    draw,
    light: opt.light || 0,
    flat: Boolean(opt.flat),
  }));
  const BY_ID = Object.fromEntries(CATALOG.map(p => [p.id, p]));
  const MAX = 600;
  const get = id => BY_ID[id] || null;
  // Casillas que ocupa una pieza según el giro (0–3, de a 90° en sentido horario).
  const footprint = (id, rot = 0) => {
    const p = BY_ID[id];
    return !p ? [1, 1] : rot % 2 ? [p.h, p.w] : [p.w, p.h];
  };
  // Lista limpia a partir de lo guardado: piezas conocidas, dentro del mapa, sin repetir.
  function norm(grid, raw) {
    const out = [],
      seen = new Set();
    if (!Array.isArray(raw)) return out;
    for (const it of raw) {
      if (!Array.isArray(it) || out.length >= MAX) continue;
      const x = Math.trunc(Number(it[0])),
        y = Math.trunc(Number(it[1])),
        id = String(it[2] ?? ''),
        rot = (Math.trunc(Number(it[3])) || 0) & 3;
      if (!BY_ID[id] || !Number.isFinite(x) || !Number.isFinite(y)) continue;
      const [w, h] = footprint(id, rot);
      if (x < 0 || y < 0 || x + w > grid.cols || y + h > grid.rows) continue;
      const key = x + ',' + y + ',' + id + ',' + rot;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push([x, y, id, rot]);
    }
    return out;
  }
  // La pieza de más arriba que pisa esa casilla (índice en la lista), o -1.
  function at(props, x, y) {
    let hit = -1,
      hitFlat = -1;
    props.forEach(([px, py, id, rot], i) => {
      const [w, h] = footprint(id, rot);
      if (x < px || y < py || x >= px + w || y >= py + h) return;
      if (BY_ID[id].flat) hitFlat = i;
      else hit = i;
    });
    return hit >= 0 ? hit : hitFlat;
  }
  // Una pieza entra si queda dentro del mapa (se pueden superponer: una silla bajo la mesa, algo sobre la alfombra).
  const fits = (grid, x, y, id, rot = 0) => {
    const [w, h] = footprint(id, rot);
    return Boolean(BY_ID[id]) && x >= 0 && y >= 0 && x + w <= grid.cols && y + h <= grid.rows;
  };
  // Centros de las piezas que dan luz, con su alcance en pies.
  const lights = props =>
    props
      .filter(p => BY_ID[p[2]]?.light)
      .map(([x, y, id, rot]) => {
        const [w, h] = footprint(id, rot);
        return { x: x + w / 2, y: y + h / 2, feet: BY_ID[id].light };
      });
  // Espeja la lista junto con el mapa (horizontal = izquierda↔derecha).
  function mirror(props, cols, rows, horizontal) {
    return props.map(([x, y, id, rot]) => {
      const [w, h] = footprint(id, rot);
      return horizontal
        ? [cols - x - w, y, id, rot % 2 ? (rot + 2) & 3 : rot]
        : [x, rows - y - h, id, rot % 2 ? rot : (rot + 2) & 3];
    });
  }
  function drawOne(ctx, T, [x, y, id, rot]) {
    const p = BY_ID[id];
    if (!p) return;
    const [w, h] = footprint(id, rot);
    ctx.save();
    ctx.translate((x + w / 2) * T, (y + h / 2) * T);
    ctx.rotate((rot * Math.PI) / 2);
    ctx.translate((-p.w * T) / 2, (-p.h * T) / 2);
    p.draw(ctx, T, p.w * T, p.h * T);
    ctx.restore();
  }
  // Dibuja todas las piezas: primero las que van pegadas al piso (alfombras, huesos), después el resto.
  function paint(ctx, props, T) {
    for (const flatPass of [true, false])
      for (const it of props) if (Boolean(BY_ID[it[2]]?.flat) === flatPass) drawOne(ctx, T, it);
  }
  // Miniatura para el catálogo.
  function thumb(canvas, id, size = 44) {
    const p = BY_ID[id];
    if (!p || !canvas.getContext) return;
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1,
      T = Math.floor((size * dpr) / Math.max(p.w, p.h));
    canvas.width = canvas.height = Math.round(size * dpr);
    canvas.style.width = canvas.style.height = size + 'px';
    const c = canvas.getContext('2d');
    c.translate((canvas.width - p.w * T) / 2, (canvas.height - p.h * T) / 2);
    p.draw(c, T, p.w * T, p.h * T);
  }
  const api = { GROUPS, CATALOG, MAX, get, footprint, norm, at, fits, lights, mirror, paint, drawOne, thumb };
  if (typeof module !== 'undefined') module.exports = api;
  root.BoardProps = api;
})(typeof window !== 'undefined' ? window : globalThis);
