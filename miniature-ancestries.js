/* Anatomías de las miniaturas de personajes. El equipo y el vestuario se dibujan en la misma malla. */
(function (root) {
  'use strict';
  const names = {
    tabaxi: 'Tabaxi',
    leonin: 'Leonino',
    harengon: 'Harengon',
    aarakocra: 'Aarakocra',
    kenku: 'Kenku',
    owlin: 'Búho humanoide (Owlin)',
    tortle: 'Tortuguino',
    loxodon: 'Loxodón',
    kobold: 'Kobold',
    lizardfolk: 'Hombre lagarto',
    minotaur: 'Minotauro',
    bugbear: 'Osgo',
    centaur: 'Centauro',
    changeling: 'Cambiante',
    'custom-lineage': 'Linaje personalizado',
    githyanki: 'Githyanki',
    githzerai: 'Githzerai',
    hobgoblin: 'Hobgoblin',
    kalashtar: 'Kalashtar',
    shifter: 'Cambiapieles',
    'simic-hybrid': 'Híbrido simic',
    vedalken: 'Vedalken',
    aasimar: 'Aasimar',
    autognome: 'Autognomo',
    dhampir: 'Dhampir',
    fairy: 'Hada',
    firbolg: 'Firbolg',
    'genasi-air': 'Genasi · aire',
    'genasi-earth': 'Genasi · tierra',
    'genasi-fire': 'Genasi · fuego',
    'genasi-water': 'Genasi · agua',
    giff: 'Giff',
    goliath: 'Goliat',
    grung: 'Grung',
    hadozee: 'Hadozee',
    hexblood: 'Sangre bruja',
    kender: 'Kender',
    locathah: 'Locathah',
    plasmoid: 'Plasmoide',
    reborn: 'Renacido',
    satyr: 'Sátiro',
    'thri-kreen': 'Thri-kreen',
    triton: 'Tritón',
    verdan: 'Verdan',
    'yuan-ti': 'Yuan-ti',
  };
  const skins = {
    warforged: '#869a9d',
    tabaxi: '#bf995f',
    leonin: '#c59d68',
    harengon: '#b89985',
    aarakocra: '#b59771',
    kenku: '#48545f',
    owlin: '#baa68a',
    tortle: '#87995e',
    loxodon: '#979798',
    kobold: '#bf714f',
    lizardfolk: '#81994d',
    minotaur: '#916c53',
    bugbear: '#91704e',
    changeling: '#c9c9c9',
    githyanki: '#b3aa65',
    githzerai: '#a7a069',
    hobgoblin: '#b86951',
    shifter: '#a89479',
    'simic-hybrid': '#65a899',
    vedalken: '#71a4bd',
    autognome: '#b39570',
    firbolg: '#91a4a6',
    'genasi-air': '#a0bbca',
    'genasi-earth': '#948977',
    'genasi-fire': '#b76551',
    'genasi-water': '#76a4b8',
    giff: '#908987',
    grung: '#68a167',
    hadozee: '#96775b',
    locathah: '#bca06a',
    plasmoid: '#82bdb0',
    'thri-kreen': '#97994d',
    triton: '#72aaa9',
    verdan: '#83a166',
    'yuan-ti': '#8caa74',
  };
  const animalHeads = new Set(
    'tabaxi leonin harengon aarakocra kenku owlin tortle loxodon kobold lizardfolk minotaur giff grung locathah thri-kreen'.split(
      ' ',
    ),
  );
  const bare = new Set(
    'warforged harengon aarakocra kenku owlin tortle loxodon kobold lizardfolk minotaur autognome grung locathah plasmoid thri-kreen giff'.split(
      ' ',
    ),
  );
  function appearance(race) {
    return { ...(skins[race] ? { skin: skins[race] } : {}), ...(bare.has(race) ? { hair: 'bald' } : {}) };
  }
  const ivory = '#e7d6af',
    ink = '#3b3638';
  function shade(hex, factor) {
    return (
      '#' +
      [1, 3, 5]
        .map(i =>
          Math.min(255, Math.round(parseInt(hex.slice(i, i + 2), 16) * factor))
            .toString(16)
            .padStart(2, '0'),
        )
        .join('')
    );
  }
  function chain(mesh, points, radii, color) {
    for (let i = 1; i < points.length; i++) mesh.rod(points[i - 1], points[i], radii[i - 1], radii[i], color);
  }
  function spike(mesh, a, b, r, color) {
    mesh.rod(a, b, r, 0.004, color, 7);
  }
  function feather(mesh, a, b, width, color) {
    const middle = a.map((n, i) => n + (b[i] - n) * 0.45);
    const left = [middle[0] - width, middle[1], middle[2] + 0.018],
      right = [middle[0] + width, middle[1], middle[2] - 0.018];
    mesh.membrane(a, left, b, color);
    mesh.membrane(a, b, right, color);
    mesh.rod(a, b, width * 0.22, 0.006, shade(color, 0.9));
  }
  function wings(mesh, y, skin, fairy) {
    for (const s of [-1, 1]) {
      const root = [s * 0.19, y - 0.035, -0.14],
        wrist = [s * 0.54, y + 0.27, -0.24];
      if (fairy) {
        const upper = [s * 0.88, y + 0.49, -0.3],
          lower = [s * 0.67, y - 0.41, -0.37];
        for (const [tip, corner] of [
          [upper, [s * 0.82, y + 0.06, -0.31]],
          [lower, [s * 0.77, y - 0.19, -0.37]],
        ]) {
          mesh.membrane(root, tip, corner, '#a5cec8');
          mesh.membrane(root, corner, [s * 0.3, y - 0.19, -0.28], '#87adae');
          mesh.rod(root, tip, 0.022, 0.009, skin);
        }
      } else {
        for (let i = 0; i < 7; i++) {
          const t = i / 6,
            base = [s * (0.26 + 0.31 * t), y + 0.19 * t, -0.19 - 0.05 * t],
            tip = [s * (0.36 + 0.59 * t), y - 0.59 + 0.8 * t, -0.34 - 0.085 * t];
          feather(mesh, base, tip, 0.098, shade(skin, 0.72 + t * 0.25));
        }
        mesh.membrane(root, wrist, [s * 0.37, y - 0.37, -0.3], skin);
        chain(mesh, [root, wrist, [s * 0.81, y + 0.25, -0.29]], [0.095, 0.071, 0.013], skin);
      }
    }
  }
  function body(mesh, m, { hipY, chestY, shoulderZ }) {
    const { oval, rod } = mesh,
      r = m.race,
      c = m.skin;
    if (['aarakocra', 'owlin', 'fairy'].includes(r)) wings(mesh, chestY, c, r === 'fairy');
    if (r === 'tortle') {
      const y = chestY - 0.22;
      oval(0, y, -0.23, 0.46, 0.56, 0.26, '#a79368');
      oval(0, y, -0.285, 0.432, 0.525, 0.275, '#596f50');
      for (const [x, dy, z, w] of [
        [0, 0.04, -0.53, 0.18],
        [0, 0.32, -0.459, 0.129],
        [0, -0.26, -0.48, 0.15],
        [-0.24, 0.13, -0.46, 0.13],
        [0.24, 0.13, -0.46, 0.13],
        [-0.23, -0.15, -0.46, 0.13],
        [0.23, -0.15, -0.46, 0.13],
      ])
        oval(x, y + dy, z, w, 0.145, 0.036, '#73825b');
    }
    if (['tabaxi', 'leonin', 'kobold', 'lizardfolk', 'minotaur', 'satyr', 'harengon', 'tiefling'].includes(r)) {
      const reptile = ['lizardfolk', 'kobold'].includes(r);
      if (r === 'harengon') oval(0, hipY - 0.09, -0.229, 0.125, 0.121, 0.126, shade(c, 1.12));
      else if (r === 'satyr') oval(0, hipY - 0.07, -0.218, 0.072, 0.105, 0.099, c);
      else {
        const tail = [
          [0, hipY - 0.04, -0.13],
          [-0.095, hipY - 0.23, -0.415],
          [-0.31, hipY - 0.42, -0.54],
          [-0.49, hipY - 0.37, -0.56],
          [-0.61, hipY - 0.21, -0.52],
        ];
        chain(mesh, tail, reptile ? [0.17, 0.132, 0.097, 0.054, 0.006] : [0.073, 0.065, 0.053, 0.042, 0.025], c);
        if (['leonin', 'minotaur'].includes(r)) oval(...tail.at(-1), 0.062, 0.092, 0.062, m.hairColor);
      }
    }
    if (r === 'centaur') {
      const y = hipY - 0.27;
      oval(0, y, -0.31, 0.31, 0.247, 0.56, c);
      oval(0, y - 0.01, -0.61, 0.31, 0.26, 0.31, c);
      for (const s of [-1, 1])
        for (const z of [0.015, -0.61]) {
          const x = s * 0.197,
            step = s * (z < 0 ? 0.08 : -0.06);
          const foot = [x, 0.222, z + step];
          chain(mesh, [[x, y, z], [x * 0.99, 0.49, z + (z < 0 ? 0.14 : 0.02) + step], foot], [0.137, 0.079, 0.054], c);
          oval(x, 0.204, foot[2] + 0.024, 0.086, 0.068, 0.103, ink);
        }
      chain(
        mesh,
        [
          [0, y + 0.08, -0.82],
          [0, y - 0.02, -0.985],
          [0.09, 0.37, -1.02],
          [0.13, 0.263, -0.98],
        ],
        [0.083, 0.091, 0.066, 0.013],
        m.hairColor,
      );
    }
    if (r === 'thri-kreen')
      for (const s of [-1, 1])
        chain(
          mesh,
          [
            [s * 0.21, chestY - 0.24, -0.06],
            [s * 0.49, chestY - 0.33, -0.14],
            [s * 0.54, chestY - 0.41, 0.028],
            [s * 0.46, chestY - 0.34, 0.181],
          ],
          [0.083, 0.067, 0.041, 0.015],
          c,
        );
    if (r === 'hadozee')
      for (const s of [-1, 1])
        mesh.membrane(
          [s * 0.39, chestY - 0.14, -0.018],
          [s * 0.21, hipY + 0.01, -0.12],
          [s * 0.21, chestY - 0.03, -0.13],
          shade(c, 0.82),
        );
    if (r === 'simic-hybrid')
      for (const s of [-1, 1])
        chain(
          mesh,
          [
            [s * 0.2, chestY - 0.09, -0.126],
            [s * 0.42, chestY + 0.04, -0.175],
            [s * 0.54, chestY + 0.27, -0.19],
            [s * 0.49, chestY + 0.39, -0.13],
          ],
          [0.079, 0.066, 0.047, 0.009],
          c,
        );
    if (r === 'plasmoid')
      for (const s of [-1, 1]) oval(s * 0.24, chestY + 0.035, shoulderZ, 0.13, 0.115, 0.152, shade(c, 1.14));
  }
  function face(mesh, m, h) {
    const r = m.race,
      c = m.skin,
      { oval, rod } = mesh,
      auto = m.ears === 'auto',
      light = shade(c, 1.16),
      dark = shade(c, 0.72);
    if (['tabaxi', 'leonin', 'shifter', 'bugbear'].includes(r)) {
      for (const s of [-1, 1]) {
        oval(s * 0.067, h - 0.073, 0.222, 0.098, 0.071, 0.101, light);
        if (auto) spike(mesh, [s * 0.178, h + 0.155, -0.017], [s * 0.26, h + 0.328, -0.068], 0.091, c);
        if (r === 'leonin' || r === 'bugbear')
          for (let i = 0; i < 4; i++) {
            const a = [s * (0.191 + 0.018 * Math.sin(i)), h + 0.139 - i * 0.087, -0.048];
            spike(mesh, a, [s * (0.353 - i * 0.018), a[1] - 0.136, -0.014], 0.122, m.hairColor);
          }
      }
      oval(0, h - 0.042, 0.324, 0.057, 0.034, 0.034, ink);
    }
    if (r === 'harengon') {
      for (const s of [-1, 1]) {
        if (auto) {
          mesh.form(
            s * 0.115,
            h + 0.13,
            -0.03,
            [
              [0, 0.07, 0.074],
              [0.17, 0.092, 0.056, s * 0.04],
              [0.31, 0.064, 0.041, s * 0.075],
              [0.413, 0.012, 0.014, s * 0.105, -0.04],
            ],
            c,
          );
          mesh.form(
            s * 0.115,
            h + 0.22,
            0.017,
            [
              [0, 0.024, 0.013, s * 0.022],
              [0.12, 0.044, 0.018, s * 0.052],
              [0.238, 0.009, 0.009, s * 0.087, -0.002],
            ],
            '#c78e89',
          );
        }
        oval(s * 0.054, h - 0.082, 0.236, 0.073, 0.063, 0.075, light);
      }
      oval(0, h - 0.053, 0.304, 0.038, 0.024, 0.023, '#b98781');
    }
    if (['aarakocra', 'kenku', 'owlin'].includes(r)) {
      const owl = r === 'owlin',
        crow = r === 'kenku',
        beak = crow ? '#393943' : '#c69e64';
      if (owl)
        for (const s of [-1, 1]) {
          oval(s * 0.125, h + 0.028, 0.163, 0.138, 0.133, 0.088, light);
          oval(s * 0.115, h + 0.042, 0.248, 0.051, 0.053, 0.027, '#c79f52');
          oval(s * 0.115, h + 0.047, 0.273, 0.029, 0.033, 0.013, ink);
          spike(mesh, [s * 0.17, h + 0.131, -0.019], [s * 0.25, h + 0.3, -0.074], 0.074, c);
        }
      chain(
        mesh,
        [
          [0, h - 0.026, 0.203],
          [0, h - 0.051, owl ? 0.311 : 0.355],
          [0, h - (crow ? 0.115 : 0.155), owl ? 0.335 : crow ? 0.5 : 0.406],
        ],
        [owl ? 0.073 : 0.1, 0.065, 0.004],
        beak,
      );
    }
    if (r === 'loxodon') {
      if (auto) for (const s of [-1, 1]) oval(s * 0.279, h - 0.026, -0.022, 0.153, 0.215, 0.067, c);
      chain(
        mesh,
        [
          [0, h - 0.035, 0.207],
          [0, h - 0.153, 0.31],
          [0.015, h - 0.32, 0.315],
          [0.069, h - 0.405, 0.363],
          [0.13, h - 0.354, 0.405],
        ],
        [0.103, 0.084, 0.067, 0.052, 0.039],
        c,
      );
      for (const s of [-1, 1]) spike(mesh, [s * 0.115, h - 0.115, 0.211], [s * 0.123, h - 0.245, 0.369], 0.046, ivory);
    }
    if (['kobold', 'lizardfolk', 'tortle', 'giff', 'minotaur', 'firbolg', 'hadozee'].includes(r)) {
      const wide = ['giff', 'minotaur'].includes(r);
      oval(0, h - 0.096, 0.21, wide ? 0.205 : 0.151, 0.103, r === 'kobold' ? 0.185 : 0.144, c);
      for (const s of [-1, 1])
        oval(s * (wide ? 0.099 : 0.067), h - 0.07, r === 'kobold' ? 0.37 : 0.327, 0.022, 0.016, 0.012, dark);
      if (auto && (r === 'minotaur' || r === 'kobold'))
        for (const s of [-1, 1])
          chain(
            mesh,
            [
              [s * 0.172, h + 0.127, -0.021],
              [s * (wide ? 0.332 : 0.241), h + 0.18, -0.076],
              [s * (wide ? 0.405 : 0.274), h + (wide ? 0.303 : 0.264), -0.01],
            ],
            [wide ? 0.091 : 0.058, 0.044, 0.004],
            ivory,
          );
      if (r === 'lizardfolk')
        for (let i = 0; i < 4; i++)
          spike(mesh, [0, h + 0.16 - i * 0.079, -0.144], [0, h + 0.32 - i * 0.101, -0.3], 0.068, dark);
      if (r === 'giff') for (const s of [-1, 1]) oval(s * 0.183, h + 0.167, -0.043, 0.069, 0.07, 0.047, c);
    }
    if (r === 'satyr' && auto)
      for (const s of [-1, 1])
        chain(
          mesh,
          [
            [s * 0.144, h + 0.15, -0.045],
            [s * 0.23, h + 0.274, -0.085],
            [s * 0.29, h + 0.25, -0.183],
            [s * 0.26, h + 0.167, -0.209],
          ],
          [0.09, 0.073, 0.044, 0.008],
          ivory,
        );
    if (['triton', 'locathah', 'genasi-water', 'simic-hybrid'].includes(r))
      for (const s of [-1, 1]) {
        const tip = [s * 0.388, h + 0.083, -0.045],
          a = [s * 0.204, h + 0.095, 0.01],
          b = [s * 0.215, h - 0.116, 0.032];
        mesh.membrane(a, tip, b, light);
        rod(a, tip, 0.027, 0.008, dark);
        rod(b, tip, 0.019, 0.005, dark);
      }
    if (r === 'thri-kreen' || r === 'grung')
      for (const s of [-1, 1]) {
        const x = s * (r === 'grung' ? 0.177 : 0.148);
        oval(x, h + 0.088, 0.132, 0.106, 0.111, 0.096, c);
        oval(x, h + 0.089, 0.207, 0.069, 0.072, 0.046, '#b9a456');
        oval(x, h + 0.09, 0.247, 0.037, 0.044, 0.016, ink);
        if (r === 'thri-kreen') {
          chain(
            mesh,
            [
              [s * 0.122, h + 0.197, -0.04],
              [s * 0.217, h + 0.316, -0.009],
              [s * 0.237, h + 0.382, 0.09],
            ],
            [0.027, 0.019, 0.006],
            dark,
          );
          spike(mesh, [s * 0.125, h - 0.12, 0.198], [s * 0.068, h - 0.162, 0.321], 0.045, ivory);
        }
      }
    if (r === 'hexblood')
      for (const s of [-1, 1])
        chain(
          mesh,
          [
            [s * 0.16, h + 0.14, -0.065],
            [s * 0.202, h + 0.29, -0.076],
            [s * 0.284, h + 0.33, -0.033],
          ],
          [0.045, 0.033, 0.006],
          dark,
        );
    if (r === 'autognome')
      for (const s of [-1, 1]) {
        oval(s * 0.106, h + 0.031, 0.207, 0.086, 0.078, 0.048, m.accent);
        oval(s * 0.106, h + 0.032, 0.248, 0.041, 0.045, 0.015, '#a9d6d0');
        oval(s * 0.245, h - 0.01, -0.024, 0.079, 0.084, 0.064, m.accent);
      }
    if (r === 'dhampir' || r === 'yuan-ti')
      for (const s of [-1, 1]) spike(mesh, [s * 0.083, h - 0.114, 0.215], [s * 0.073, h - 0.166, 0.236], 0.021, ivory);
    if (r === 'plasmoid' || r === 'changeling' || r === 'kalashtar' || r === 'aasimar')
      for (const s of [-1, 1])
        oval(
          s * 0.096,
          h + 0.017,
          0.246,
          0.039,
          0.028,
          0.017,
          r === 'aasimar' ? '#f5d590' : r === 'kalashtar' ? '#99c7bb' : '#d1e3df',
        );
    if (['genasi-fire', 'genasi-air', 'genasi-earth', 'goliath', 'reborn', 'yuan-ti'].includes(r)) {
      const color = {
        'genasi-fire': '#d28b55',
        'genasi-air': '#c9dfdc',
        'genasi-earth': '#806b56',
        goliath: '#596778',
        reborn: '#88766b',
        'yuan-ti': '#5c7650',
      }[r];
      for (const s of [-1, 1])
        for (let i = 0; i < 3; i++)
          rod(
            [s * (0.165 - i * 0.023), h - 0.013 - i * 0.038, 0.201 + i * 0.012],
            [s * (0.202 - i * 0.025), h + 0.007 - i * 0.038, 0.156 + i * 0.021],
            0.012,
            0.015,
            color,
            6,
          );
    }
  }
  root.MiniatureAncestries = { names, appearance, body, face, animalHead: race => animalHeads.has(race) };
})(globalThis);
