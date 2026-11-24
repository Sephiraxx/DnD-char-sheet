/* Figuras originales de sobremesa. La ficha guarda las piezas y sus colores;
   el tablero reutiliza una vista de la misma malla que muestra el editor. */
(function (root) {
  'use strict';
  const parts = {
    race: {
      human: 'Humano',
      elf: 'Elfo',
      halfElf: 'Semielfo',
      dwarf: 'Enano',
      halfling: 'Mediano',
      gnome: 'Gnomo',
      orc: 'Orco',
      halfOrc: 'Semiorco',
      goblin: 'Goblin',
      tiefling: 'Tiefling',
      dragonborn: 'Dracónido',
      warforged: 'Forjado',
      other: 'Otra raza',
    },
    gender: { neutral: 'Sin especificar', woman: 'Femenino', man: 'Masculino', nonbinary: 'No binario' },
    build: { regular: 'Mediana', broad: 'Robusta', slender: 'Esbelta', short: 'Baja' },
    ears: { auto: 'Según la raza', round: 'Redondas', elf: 'Puntiagudas', horns: 'Cuernos' },
    hair: { crop: 'Corto', long: 'Largo', crest: 'Cresta', bald: 'Rapado' },
    outfit: { tunic: 'Túnica corta', armor: 'Armadura', robe: 'Vestiduras', cloak: 'Capa de viaje' },
    gear: {
      lute: 'Laúd',
      shield: 'Escudo',
      staff: 'Bastón',
      book: 'Grimorio',
      sword: 'Espada',
      axe: 'Hacha',
      hammer: 'Martillo',
      bow: 'Arco',
      spear: 'Lanza',
      dagger: 'Daga',
      none: 'Manos libres',
    },
    pose: { ready: 'En guardia', rest: 'De pie' },
  };
  const defaults = {
    race: 'human',
    gender: 'neutral',
    height: 170,
    build: 'regular',
    ears: 'auto',
    hair: 'crop',
    outfit: 'tunic',
    gear: 'none',
    pose: 'rest',
    skin: '#bc866b',
    cloth: '#43777c',
    hairColor: '#513a32',
    accent: '#c79a56',
    facing: 20,
  };
  function clean(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const result = { ...defaults };
    for (const [key, options] of Object.entries(parts)) if (Object.hasOwn(options, raw[key])) result[key] = raw[key];
    for (const key of ['skin', 'cloth', 'hairColor', 'accent'])
      if (typeof raw[key] === 'string' && /^#[0-9a-f]{6}$/i.test(raw[key])) result[key] = raw[key].toLowerCase();
    if (Number.isInteger(raw.height) && raw.height >= 50 && raw.height <= 300) result.height = raw.height;
    if (Number.isInteger(raw.facing)) result.facing = ((raw.facing % 360) + 360) % 360;
    return result;
  }

  function initial(sheet) {
    const raceId = sheet.raceId || '';
    const match = [
      ['half-elf', 'halfElf'],
      ['half-orc', 'halfOrc'],
      ['astral-elf', 'elf'],
      ['sea-elf', 'elf'],
      ['shadar-kai', 'elf'],
      ['eladrin', 'elf'],
      ['duergar', 'dwarf'],
      ['deep-gnome', 'gnome'],
      ...Object.keys(parts.race).map(k => [k, k]),
    ].find(([prefix]) => raceId === prefix || raceId.startsWith(prefix + '-'));
    const race =
      match?.[1] ||
      Object.keys(parts.race).find(k => parts.race[k].toLowerCase() === (sheet.race || '').trim().toLowerCase()) ||
      (sheet.race ? 'other' : 'human');
    const rawHeight = (sheet.persona?.height || '').trim().replace(',', '.');
    const h = /^(\d+(?:\.\d+)?)\s*(cm|m)?$/i.exec(rawHeight);
    const parsed = h
      ? Math.round(Number(h[1]) * (h[2]?.toLowerCase() === 'm' || (!h[2] && Number(h[1]) < 4) ? 100 : 1))
      : null;
    const height =
      parsed >= 50 && parsed <= 300
        ? parsed
        : { halfling: 100, gnome: 105, goblin: 110, dwarf: 135, orc: 190, dragonborn: 195 }[race] || 170;
    return clean({
      ...defaults,
      race,
      height,
      cloth: sheet.sheetColor || defaults.cloth,
      gear: sheet.classId === 'bard' ? 'lute' : 'none',
    });
  }
  function draw(ctx, raw, size) {
    const m = clean(raw);
    if (!m) return;
    const faces = [],
      turn = (m.facing * Math.PI) / 180,
      ct = Math.cos(turn),
      st = Math.sin(turn);
    const pitch = 0.27,
      cp = Math.cos(pitch),
      sp = Math.sin(pitch);
    const width =
      { regular: 1, broad: 1.17, slender: 0.86, short: 1.12 }[m.build] *
      ({ dwarf: 1.16, halfling: 1.1, elf: 0.94, orc: 1.12, dragonborn: 1.1 }[m.race] || 1);
    const height = (m.build === 'short' ? 0.91 : 1) * Math.pow(m.height / 170, 0.38);
    const shoulder = { woman: 0.94, man: 1.07 }[m.gender] || 1;
    const ear =
      m.ears === 'auto'
        ? ['elf', 'halfElf', 'goblin', 'gnome', 'orc', 'halfOrc'].includes(m.race)
          ? 'elf'
          : ['tiefling', 'dragonborn'].includes(m.race)
            ? 'horns'
            : 'round'
        : m.ears;
    const steel = '#9cafb1',
      leather = '#583f32',
      dark = '#313b40',
      gold = m.accent,
      skin = m.skin;
    function camera([x, y, z]) {
      const rx = x * ct + z * st,
        rz = z * ct - x * st;
      return [rx, y * cp - rz * sp, rz * cp + y * sp];
    }
    function polygon(points, color) {
      const p = points.map(camera),
        [a, b, c] = p;
      const u = b.map((v, i) => v - a[i]),
        v = c.map((n, i) => n - a[i]);
      const nx = u[1] * v[2] - u[2] * v[1],
        ny = u[2] * v[0] - u[0] * v[2],
        nz = u[0] * v[1] - u[1] * v[0];
      if (nz <= 0) return;
      const light = 0.74 + 0.43 * Math.max(0, (-0.46 * nx + 0.72 * ny + 0.52 * nz) / (Math.hypot(nx, ny, nz) || 1));
      const rgb = [1, 3, 5].map(i => Math.min(255, Math.round(parseInt(color.slice(i, i + 2), 16) * light)));
      faces.push({ p, z: p.reduce((sum, n) => sum + n[2], 0) / p.length, color: 'rgb(' + rgb.join(',') + ')' });
    }
    // Secciones horizontales [altura, radio X, radio Z, desplazamiento X, desplazamiento Z].
    function form(x, y, z, sections, color, sides = 12) {
      // Las caras largas de dos piezas pueden cruzarse en la proyección. Dividirlas
      // mejora la oclusión del brazo, la empuñadura y el pelo al girar la figura.
      const slices = [sections[0]];
      for (let j = 1; j < sections.length; j++) {
        const a = sections[j - 1],
          b = sections[j],
          count = Math.ceil(Math.abs(b[0] - a[0]) / 0.11) || 1;
        for (let i = 1; i <= count; i++)
          slices.push(Array.from({ length: 5 }, (_, k) => (a[k] || 0) + (((b[k] || 0) - (a[k] || 0)) * i) / count));
      }
      const rings = slices.map(([dy, w, d, dx = 0, dz = 0]) =>
        Array.from({ length: sides }, (_, i) => {
          const a = (2 * Math.PI * i) / sides;
          return [(x + dx + w * Math.cos(a)) * width, (y + dy) * height, z + dz + d * Math.sin(a)];
        }),
      );
      for (let j = 1; j < rings.length; j++)
        for (let i = 0; i < sides; i++) {
          const k = (i + 1) % sides;
          polygon([rings[j - 1][i], rings[j][i], rings[j][k], rings[j - 1][k]], color);
        }
      polygon(rings[0], color);
      polygon(rings.at(-1).slice().reverse(), color);
    }
    function oval(x, y, z, w, h, d, color) {
      form(
        x,
        y,
        z,
        [
          [-h, 0.18 * w, 0.18 * d],
          [-h * 0.62, w * 0.8, d * 0.8],
          [0, w, d],
          [h * 0.65, w * 0.77, d * 0.77],
          [h, 0.2 * w, 0.2 * d],
        ],
        color,
      );
    }
    function limb(a, b, r, tip, color) {
      const [x, y, z] = a;
      form(
        x,
        y,
        z,
        [
          [0, r, r],
          [b[1] - y, tip, tip, b[0] - x, b[2] - z],
        ],
        color,
        10,
      );
    }
    form(
      0,
      0,
      0,
      [
        [0, 0.65, 0.51],
        [0.05, 0.7, 0.55],
        [0.12, 0.7, 0.55],
        [0.16, 0.63, 0.49],
      ],
      '#45515a',
      24,
    );
    form(
      0,
      0.105,
      0,
      [
        [0, 0.703, 0.552],
        [0.025, 0.691, 0.544],
      ],
      gold,
      24,
    );
    const stride = m.pose === 'ready' ? 0.14 : 0.04;
    for (const side of [-1, 1]) {
      const x = side * 0.2,
        z = side * stride;
      oval(x, 0.23, z + 0.05, 0.15, 0.12, 0.22, leather);
      limb([side * 0.19, 0.45, z * 0.8], [side * 0.17, 0.7, z * 0.5], 0.12, 0.14, dark);
      limb([x, 0.28, z], [side * 0.19, 0.48, z * 0.8], 0.145, 0.14, leather);
      limb([side * 0.17, 0.65, z * 0.5], [side * 0.14, 1.1, 0], 0.15, 0.17, dark);
    }
    const armor = m.outfit === 'armor' || m.race === 'warforged',
      robe = m.outfit === 'robe';
    if (m.outfit === 'cloak')
      form(
        0,
        0,
        -0.14,
        [
          [0.43, 0.47, 0.14, 0, -0.13],
          [0.83, 0.48, 0.17],
          [1.43, 0.36, 0.19],
          [1.58, 0.23, 0.13],
        ],
        m.cloth,
      );
    form(
      0,
      0,
      0,
      [
        [robe ? 0.35 : 0.83, robe ? 0.41 : 0.34, robe ? 0.29 : 0.23],
        [1.03, 0.27, 0.2],
        [1.18, 0.25, 0.17],
        [1.47, 0.34 * shoulder, 0.22],
        [1.6, 0.27, 0.15],
      ],
      armor ? steel : m.cloth,
    );
    form(
      0,
      1.075,
      0,
      [
        [0, 0.286, 0.216],
        [0.085, 0.28, 0.208],
      ],
      leather,
    );
    oval(0, 1.12, 0.21, 0.083, 0.054, 0.021, gold);
    form(
      0,
      1.52,
      0,
      [
        [0, 0.18, 0.15],
        [0.21, 0.145, 0.14],
      ],
      skin,
    );
    for (const side of [-1, 1]) {
      const armed = side === 1 && m.gear !== 'none';
      const hand = [side * (armed ? 0.48 : 0.43), armed || m.pose === 'ready' ? 1.08 : 0.87, armed ? 0.23 : 0.1];
      const elbow = [side * 0.43, 1.2, armed ? 0.08 : -0.02];
      limb(elbow, [side * 0.31 * shoulder, 1.48, 0], 0.105, 0.16, m.cloth);
      limb(hand, elbow, 0.083, 0.11, armor ? steel : skin);
      oval(...hand, 0.094, 0.12, 0.09, skin);
      oval(side * 0.31 * shoulder, 1.48, -0.005, 0.166, 0.145, 0.174, armor ? steel : m.cloth);
      if (armor)
        form(
          side * 0.32,
          1.44,
          0,
          [
            [0, 0.167, 0.177],
            [0.035, 0.172, 0.18],
          ],
          gold,
        );
    }
    const head = 1.87;
    form(
      0,
      head,
      0,
      [
        [-0.25, 0.115, 0.14, 0, 0.03],
        [-0.16, 0.223, 0.21],
        [0.02, 0.265, 0.24],
        ...(m.hair === 'bald'
          ? [
              [0.17, 0.24, 0.215],
              [0.24, 0.16, 0.15],
            ]
          : [[0.085, 0.25, 0.224]]),
      ],
      skin,
      14,
    );
    for (const side of [-1, 1]) {
      oval(side * 0.095, head + 0.015, 0.242, 0.037, 0.025, 0.022, '#322f33');
      if (ear === 'elf')
        form(
          side * 0.235,
          head - 0.015,
          0,
          [
            [0, 0.072, 0.05],
            [0.08, 0.076, 0.04, side * 0.018],
            [0.2, 0.012, 0.012, side * 0.14, -0.04],
          ],
          skin,
          8,
        );
      else oval(side * 0.25, head, 0, 0.062, 0.086, 0.048, skin);
      if (ear === 'horns')
        form(
          side * 0.16,
          head + 0.16,
          -0.06,
          [
            [0, 0.105, 0.09],
            [0.16, 0.063, 0.056, side * 0.08, -0.03],
            [0.28, 0.009, 0.009, side * 0.07, -0.08],
          ],
          '#d4b996',
          8,
        );
    }
    oval(0, head - 0.052, 0.23, 0.049, 0.065, 0.059, skin);
    if (['orc', 'halfOrc'].includes(m.race))
      for (const side of [-1, 1])
        form(
          side * 0.13,
          head - 0.15,
          0.17,
          [
            [0, 0.043, 0.04],
            [0.12, 0.009, 0.009, side * 0.015, 0.043],
          ],
          '#e0cda2',
          8,
        );
    if (m.race === 'dragonborn') {
      oval(0, head - 0.1, 0.21, 0.19, 0.105, 0.16, skin);
      for (const side of [-1, 1]) oval(side * 0.09, head - 0.08, 0.347, 0.025, 0.017, 0.013, dark);
    }
    if (m.race === 'warforged')
      form(
        0,
        head + 0.003,
        0.208,
        [
          [0, 0.19, 0.023],
          [0.043, 0.171, 0.033],
        ],
        gold,
        8,
      );
    if (m.hair !== 'bald') {
      form(
        0,
        head + 0.075,
        0,
        [
          [0, 0.282, 0.253],
          [0.115, 0.259, 0.228],
          [0.195, 0.16, 0.14],
        ],
        m.hairColor,
      );
      if (m.hair === 'long')
        form(
          0,
          head - 0.26,
          -0.136,
          [
            [0, 0.25, 0.117],
            [0.18, 0.27, 0.135],
            [0.37, 0.25, 0.13],
          ],
          m.hairColor,
        );
      if (m.hair === 'crest') oval(0, head + 0.24, -0.013, 0.1, 0.16, 0.218, m.hairColor);
      if (m.hair === 'crop') oval(-0.102, head + 0.09, 0.13, 0.143, 0.076, 0.117, m.hairColor);
    }
    if (m.gear === 'staff') {
      form(
        0.49,
        0,
        0.25,
        [
          [0.17, 0.034, 0.034],
          [2.02, 0.042, 0.042],
        ],
        leather,
        8,
      );
      oval(0.49, 2.06, 0.25, 0.095, 0.14, 0.085, gold);
    } else if (m.gear === 'shield') {
      form(
        0.45,
        1.08,
        0.29,
        [
          [-0.31, 0.038, 0.036],
          [-0.16, 0.196, 0.05],
          [0.15, 0.215, 0.06],
          [0.23, 0.15, 0.04],
        ],
        gold,
        10,
      );
      oval(0.45, 1.08, 0.345, 0.145, 0.177, 0.038, m.cloth);
    } else if (m.gear === 'lute') {
      oval(0.32, 0.94, 0.32, 0.195, 0.245, 0.081, '#ba8150');
      oval(0.32, 0.98, 0.398, 0.055, 0.056, 0.012, leather);
      form(
        0.36,
        1.055,
        0.34,
        [
          [0, 0.051, 0.04],
          [0.48, 0.049, 0.04, 0.13],
        ],
        leather,
        8,
      );
      oval(0.505, 1.565, 0.34, 0.071, 0.085, 0.042, gold);
    } else if (m.gear === 'book') {
      form(
        0.45,
        0.98,
        0.28,
        [
          [0, 0.155, 0.072],
          [0.23, 0.155, 0.072],
        ],
        leather,
        4,
      );
      form(
        0.45,
        1.07,
        0.28,
        [
          [0, 0.16, 0.077],
          [0.035, 0.16, 0.077],
        ],
        gold,
        4,
      );
    }
    if (['sword', 'dagger', 'spear', 'axe', 'hammer'].includes(m.gear)) {
      const x = 0.5,
        z = 0.23;
      const pole = m.gear === 'spear';
      form(
        x,
        0,
        z,
        [
          [pole ? 0.25 : 0.94, 0.036, 0.036],
          [pole ? 1.91 : 1.34, 0.036, 0.036],
        ],
        leather,
        8,
      );
      if (m.gear === 'sword' || m.gear === 'dagger') {
        form(
          x,
          1.25,
          z,
          [
            [0, 0.143, 0.036],
            [0.052, 0.126, 0.046],
          ],
          gold,
          8,
        );
        form(
          x,
          1.3,
          z,
          [
            [0, 0.064, 0.035],
            [m.gear === 'sword' ? 0.57 : 0.2, 0.055, 0.027],
            [m.gear === 'sword' ? 0.74 : 0.32, 0.003, 0.003],
          ],
          steel,
          4,
        );
      }
      if (pole)
        form(
          x,
          1.9,
          z,
          [
            [0, 0.033, 0.025],
            [0.11, 0.087, 0.031],
            [0.33, 0.003, 0.003],
          ],
          steel,
          4,
        );
      if (m.gear === 'axe')
        form(
          x,
          1.3,
          z,
          [
            [0, 0.12, 0.045, 0.09],
            [0.1, 0.18, 0.06, 0.11],
            [0.25, 0.15, 0.046, 0.12],
            [0.31, 0.09, 0.035, 0.14],
          ],
          steel,
          8,
        );
      if (m.gear === 'hammer')
        form(
          x,
          1.27,
          z,
          [
            [0, 0.18, 0.08],
            [0.06, 0.22, 0.11],
            [0.18, 0.22, 0.11],
            [0.22, 0.18, 0.08],
          ],
          steel,
          8,
        );
    }
    if (m.gear === 'bow') {
      const bow = [
        [0.44, 0.55, 0.24],
        [0.6, 0.75, 0.27],
        [0.66, 1.07, 0.27],
        [0.6, 1.39, 0.27],
        [0.44, 1.61, 0.24],
      ];
      for (let i = 1; i < bow.length; i++) limb(bow[i - 1], bow[i], 0.027, 0.027, leather);
      limb(bow[0], bow.at(-1), 0.008, 0.008, '#e1d4b4');
    }
    ctx.save();
    // Mantiene a gigantes y armas altas dentro de su casilla sin igualar la estatura de todos.
    const scale = (size * 0.376) / Math.max(1, height / 1.09);
    ctx.translate(size * 0.5, size * 0.89);
    ctx.scale(scale, -scale);
    for (const f of faces.sort((a, b) => a.z - b.z)) {
      ctx.beginPath();
      f.p.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.fillStyle = ctx.strokeStyle = f.color;
      ctx.lineWidth = 0.002;
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }
  const sprites = new Map();
  function sprite(model) {
    const key = JSON.stringify(model);
    if (!sprites.has(key)) {
      if (sprites.size >= 96) sprites.delete(sprites.keys().next().value);
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 192;
      draw(canvas.getContext('2d'), model, 192);
      sprites.set(key, canvas);
    }
    return sprites.get(key);
  }
  root.Miniatures = { parts, defaults, initial, clean, draw, sprite };
})(globalThis);
