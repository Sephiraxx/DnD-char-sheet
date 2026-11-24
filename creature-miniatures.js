/* Esculturas originales de criaturas para las fichas públicas del tablero. */
(function (root) {
  'use strict';
  const scales = {
    red: ['#ab3e39', '#e88c66'],
    blue: ['#3866a4', '#90baec'],
    green: ['#437550', '#a4be79'],
    black: ['#414951', '#8b8995'],
    white: ['#c4d9de', '#eef3ee'],
    brass: ['#ae8949', '#f0cc79'],
    bronze: ['#967746', '#92ad89'],
    copper: ['#b66d4e', '#e8a383'],
    gold: ['#c89740', '#ffe3a2'],
    silver: ['#94a7bb', '#e3ecf1'],
  };
  const colors = {
    rojo: 'red',
    azul: 'blue',
    verde: 'green',
    negro: 'black',
    blanco: 'white',
    laton: 'brass',
    bronce: 'bronze',
    cobre: 'copper',
    oro: 'gold',
    plata: 'silver',
  };
  const options = {
    sigil: 'Emblema',
    goblin: 'Goblin',
    skeleton: 'Esqueleto',
    'bull-skeleton': 'Esqueleto de minotauro',
    'horse-skeleton': 'Esqueleto de caballo de guerra',
  };
  const known = new Map();
  for (const name of ['esqueleto', 'skeleton', 'humanoid skeleton']) known.set(name, 'skeleton');
  for (const name of ['esqueleto de minotauro', 'minotaur skeleton']) known.set(name, 'bull-skeleton');
  for (const name of ['esqueleto de caballo de guerra', 'warhorse skeleton']) known.set(name, 'horse-skeleton');
  for (const name of ['goblin', 'trasgo', 'goblin boss', 'jefe goblin', 'jefe trasgo', 'goblin jefe'])
    known.set(name, 'goblin');
  known.set('dragon', 'dragon-red');
  for (const [es, en] of Object.entries(colors)) {
    const key = 'dragon-' + en;
    const metal = ['brass', 'bronze', 'copper', 'gold', 'silver'].includes(en);
    options[key] = 'Dragón ' + (metal ? 'de ' : '') + (es === 'laton' ? 'latón' : es);
    const spanish = 'dragon ' + (metal ? 'de ' : '') + es;
    for (const age of ['', ' joven', ' adulto', ' anciano']) known.set(spanish + age, key);
    known.set('cria de ' + spanish, key);
    for (const age of ['', 'young ', 'adult ', 'ancient ']) known.set(age + en + ' dragon', key);
    known.set(en + ' dragon wyrmling', key);
  }
  function identify(name) {
    return (
      known.get(
        String(name || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim()
          .toLowerCase()
          .replace(/\s+#?\d+$/, '')
          .replace(/\s+/g, ' '),
      ) || null
    );
  }
  const ivory = '#e9d8b1',
    shadow = '#343039',
    bone = '#bcaa88',
    leather = '#644536';
  function chain(mesh, points, radii, color) {
    for (let i = 1; i < points.length; i++) mesh.rod(points[i - 1], points[i], radii[i - 1], radii[i], color);
  }
  function skull(mesh, x, y, z, bull = false) {
    const { oval, rod } = mesh;
    oval(x, y, z, 0.265, 0.262, 0.22, ivory);
    oval(x, y - 0.2, z + 0.085, 0.17, 0.085, 0.12, bone);
    oval(x, y - 0.1, z + 0.15, 0.195, 0.093, 0.09, ivory);
    for (const s of [-1, 1]) {
      oval(x + s * 0.121, y + 0.003, z + 0.181, 0.077, 0.073, 0.037, shadow);
      if (bull)
        chain(
          mesh,
          [
            [x + s * 0.16, y + 0.14, z - 0.035],
            [x + s * 0.36, y + 0.2, z - 0.02],
            [x + s * 0.44, y + 0.38, z + 0.04],
          ],
          [0.096, 0.055, 0.003],
          ivory,
        );
      for (const d of [0.045, 0.125])
        rod([x + s * d, y - 0.11, z + 0.214], [x + s * d, y - 0.191, z + 0.207], 0.025, 0.022, ivory, 5);
    }
    oval(x, y - 0.08, z + 0.232, 0.038, 0.043, 0.019, shadow);
  }
  function skeleton(mesh, bull) {
    const { oval, rod } = mesh;
    const width = bull ? 0.35 : 0.245;
    oval(0, 0.98, 0, width, 0.14, 0.145, bone);
    for (let i = 0; i < 7; i++) oval(0, 1.04 + i * 0.083, -0.046, 0.071, 0.059, 0.079, ivory);
    for (let i = 0; i < 4; i++) {
      const y = 1.17 + i * 0.108,
        w = width * (0.68 + 0.105 * i);
      for (const s of [-1, 1])
        chain(
          mesh,
          [
            [0, y + 0.045, -0.06],
            [s * w, y + 0.06, -0.04],
            [s * (w + 0.025), y - 0.012, 0.065],
            [s * 0.055, y - 0.054, 0.133],
          ],
          [0.039, 0.037, 0.035, 0.025],
          ivory,
        );
    }
    rod([0, 1.25, 0.12], [0, 1.56, 0.114], 0.036, 0.046, bone);
    for (const s of [-1, 1]) {
      const shoulder = [s * (width + 0.045), 1.57, -0.015],
        elbow = [s * (width + 0.13), 1.31, 0.05],
        hand = [s * (width + 0.16), s > 0 ? 1.41 : 1.03, s > 0 ? 0.27 : 0.18];
      chain(mesh, [[0, 1.58, 0], shoulder, elbow, hand], [0.057, 0.076, 0.052, 0.046], ivory);
      oval(...elbow, 0.071, 0.068, 0.067, bone);
      oval(...hand, 0.064, 0.08, 0.059, ivory);
      const hip = [s * 0.145, 0.98, 0],
        knee = [s * (width - 0.015), 0.59, s < 0 ? 0.18 : -0.015],
        heel = [s * width, 0.25, s < 0 ? 0.12 : -0.13];
      rod(hip, knee, 0.074, 0.047, ivory);
      oval(...knee, 0.086, 0.074, 0.074, bone);
      for (const d of [-0.032, 0.032])
        rod([knee[0] + d, knee[1], knee[2]], [heel[0] + d, heel[1], heel[2]], 0.035, 0.025, ivory);
      oval(heel[0], 0.204, heel[2] + 0.07, 0.096, 0.048, 0.152, ivory);
    }
    skull(mesh, 0, 1.9, 0.025, bull);
  }
  function horse(mesh) {
    const { oval, rod } = mesh;
    chain(
      mesh,
      [
        [-0.03, 1.17, -0.62],
        [0, 1.28, -0.2],
        [0, 1.3, 0.35],
        [0, 1.67, 0.55],
        [0, 1.79, 0.7],
      ],
      [0.105, 0.08, 0.105, 0.079, 0.066],
      ivory,
    );
    for (const s of [-1, 1]) {
      for (let i = 0; i < 5; i++) {
        const z = -0.25 + i * 0.13,
          w = 0.21 + Math.sin((i * Math.PI) / 5) * 0.074;
        chain(
          mesh,
          [
            [0, 1.28, z],
            [s * w, 1.21, z],
            [s * w, 1.02, z + 0.02],
            [s * 0.06, 0.9, z + 0.05],
          ],
          [0.043, 0.042, 0.037, 0.032],
          ivory,
        );
      }
      for (const front of [false, true]) {
        const z = front ? 0.37 : -0.49,
          x = s * 0.19,
          step = s * (front ? 0.09 : -0.1);
        const knee = [x, 0.69, z + (front ? 0.065 : 0.22) + step],
          ankle = [x, 0.27, z + step];
        oval(x, 1.12, z, 0.102, 0.17, 0.13, bone);
        chain(mesh, [[x, 1.14, z], knee, ankle], [0.08, 0.048, 0.036], ivory);
        oval(...knee, 0.062, 0.066, 0.062, bone);
        oval(x, 0.21, ankle[2] + 0.035, 0.078, 0.065, 0.097, shadow);
      }
    }
    oval(0, 1.75, 0.72, 0.159, 0.19, 0.21, ivory);
    oval(0, 1.66, 0.91, 0.12, 0.118, 0.216, bone);
    for (const s of [-1, 1]) oval(s * 0.135, 1.775, 0.78, 0.044, 0.064, 0.066, shadow);
    rod([0, 1.14, -0.61], [0.13, 0.76, -0.79], 0.075, 0.026, bone);
  }
  function goblin(mesh) {
    const { oval, rod, form } = mesh,
      hide = '#77964d',
      ear = '#a28c5e',
      coat = '#974e37';
    for (const s of [-1, 1]) {
      const knee = [s * 0.3, 0.52, s < 0 ? 0.22 : 0],
        foot = [s * 0.32, 0.24, s < 0 ? 0.18 : -0.13];
      chain(mesh, [[s * 0.16, 0.82, -0.075], knee, foot], [0.15, 0.108, 0.084], hide);
      oval(foot[0], 0.219, foot[2] + 0.056, 0.127, 0.069, 0.166, leather);
    }
    form(
      0,
      0,
      0,
      [
        [0.7, 0.31, 0.204, 0, -0.075],
        [0.87, 0.23, 0.18],
        [1.1, 0.34, 0.225, 0, 0.045],
        [1.26, 0.26, 0.18, 0, 0.105],
      ],
      coat,
    );
    form(
      0,
      0.855,
      0,
      [
        [0, 0.255, 0.199],
        [0.075, 0.253, 0.2],
      ],
      leather,
    );
    for (const s of [-1, 1]) {
      const shoulder = [s * 0.3, 1.16, 0.06],
        elbow = [s * 0.43, 0.94, s < 0 ? 0.16 : -0.07],
        hand = [s * 0.45, s < 0 ? 1.04 : 0.92, s < 0 ? 0.32 : 0.23];
      chain(mesh, [shoulder, elbow, hand], [0.138, 0.086, 0.066], hide);
      oval(...shoulder, 0.14, 0.105, 0.13, leather);
      oval(...hand, 0.084, 0.075, 0.079, hide);
    }
    rod([0.45, 0.86, 0.23], [0.46, 1.06, 0.25], 0.037, 0.032, leather);
    rod([0.385, 1.035, 0.25], [0.54, 1.035, 0.25], 0.022, 0.024, '#c59759');
    chain(
      mesh,
      [
        [0.46, 1.05, 0.25],
        [0.495, 1.26, 0.27],
        [0.55, 1.44, 0.265],
      ],
      [0.045, 0.068, 0.001],
      '#b9ccca',
    );
    oval(0, 1.48, 0.11, 0.314, 0.268, 0.254, hide);
    oval(0, 1.35, 0.237, 0.228, 0.135, 0.158, hide);
    for (const s of [-1, 1]) {
      const tip = [s * 0.595, 1.69, -0.024];
      chain(mesh, [[s * 0.22, 1.5, 0.07], [s * 0.38, 1.54, 0.042], tip], [0.12, 0.092, 0.003], hide);
      mesh.membrane([s * 0.27, 1.47, 0.154], [s * 0.36, 1.57, 0.136], tip, ear);
      oval(s * 0.128, 1.51, 0.326, 0.069, 0.041, 0.035, '#edc34e');
      oval(s * 0.128, 1.507, 0.355, 0.018, 0.027, 0.013, shadow);
      rod([s * 0.055, 1.548, 0.33], [s * 0.205, 1.585, 0.28], 0.034, 0.041, hide);
      rod([s * 0.123, 1.309, 0.355], [s * 0.14, 1.388, 0.378], 0.032, 0.002, ivory, 6);
    }
    rod([0, 1.56, 0.3], [0, 1.422, 0.447], 0.077, 0.036, hide);
  }
  function dragon(mesh, palette) {
    const { oval, rod, membrane } = mesh,
      [hide, wing] = palette;
    oval(0, 0.8, -0.06, 0.29, 0.31, 0.54, hide);
    oval(0, 0.89, 0.19, 0.29, 0.34, 0.295, hide);
    chain(
      mesh,
      [
        [0, 0.81, -0.41],
        [-0.13, 0.73, -0.68],
        [-0.42, 0.58, -0.85],
        [-0.66, 0.61, -0.82],
        [-0.81, 0.79, -0.65],
      ],
      [0.192, 0.139, 0.085, 0.05, 0.002],
      hide,
    );
    chain(
      mesh,
      [
        [0, 0.98, 0.19],
        [0.005, 1.24, 0.33],
        [0.035, 1.54, 0.35],
        [0.06, 1.66, 0.49],
      ],
      [0.232, 0.16, 0.137, 0.14],
      hide,
    );
    oval(0.06, 1.68, 0.51, 0.183, 0.169, 0.223, hide);
    oval(0.06, 1.57, 0.74, 0.145, 0.069, 0.227, wing);
    oval(0.06, 1.633, 0.748, 0.15, 0.079, 0.229, hide);
    for (const s of [-1, 1]) {
      rod([0.06 + s * 0.113, 1.772, 0.448], [0.06 + s * 0.208, 1.978, 0.27], 0.066, 0.003, ivory);
      oval(0.06 + s * 0.15, 1.699, 0.592, 0.038, 0.034, 0.052, '#f3cf65');
      rod([0.06 + s * 0.16, 1.746, 0.54], [0.06 + s * 0.133, 1.733, 0.68], 0.039, 0.018, hide);
      for (const z of [0.73, 0.84])
        rod([0.06 + s * 0.126, 1.595, z], [0.06 + s * 0.128, 1.537, z + 0.012], 0.024, 0.002, ivory, 5);
      oval(0.06 + s * 0.09, 1.675, 0.92, 0.026, 0.014, 0.024, shadow);
      for (const z of [-0.36, 0.25]) {
        const knee = [s * (z < 0 ? 0.36 : 0.27), 0.48, z + (z < 0 ? 0.2 : 0.05)],
          foot = [s * 0.32, 0.235, z + (s < 0 ? 0.13 : -0.03)];
        oval(s * 0.2, 0.69, z, 0.15, 0.202, 0.173, hide);
        chain(mesh, [[s * 0.19, 0.76, z], knee, foot], [0.138, 0.093, 0.066], hide);
        oval(foot[0], 0.206, foot[2] + 0.045, 0.087, 0.045, 0.116, hide);
        for (const toe of [-0.04, 0.04])
          rod(
            [foot[0] + toe, 0.21, foot[2] + 0.07],
            [foot[0] + toe * 1.4, 0.17, foot[2] + 0.19],
            0.023,
            0.002,
            ivory,
            5,
          );
      }
      const root = [s * 0.19, 1.025, 0.12],
        wrist = [s * 0.62, 1.78, -0.043];
      const edge = [
        [s * 1.06, 2.025, -0.13],
        [s * 0.97, 1.47, -0.38],
        [s * 0.8, 1.04, -0.56],
        [s * 0.45, 0.88, -0.54],
        [s * 0.18, 0.88, -0.28],
      ];
      for (let i = 1; i < edge.length; i++) {
        const a = edge[i - 1],
          b = edge[i],
          notch = [(a[0] + b[0]) * 0.47, (a[1] + b[1]) * 0.5 + 0.09, (a[2] + b[2]) * 0.49];
        membrane(wrist, a, notch, wing);
        membrane(wrist, notch, b, wing);
      }
      membrane(root, wrist, edge.at(-1), hide);
      rod(root, wrist, 0.089, 0.06, hide);
      for (const tip of edge) rod(wrist, tip, 0.04, 0.009, hide, 6);
    }
    for (const [y, z, r] of [
      [1.58, 0.24, 0.07],
      [1.37, 0.14, 0.075],
      [1.2, 0.035, 0.084],
      [1.11, -0.2, 0.078],
      [1.01, -0.4, 0.06],
    ])
      rod([0, y, z], [0, y + 0.14, z - 0.095], r, 0.002, ivory, 6);
  }
  function draw(ctx, key, size) {
    const isDragon = key.startsWith('dragon-'),
      palette = scales[key.slice('dragon-'.length)];
    const facing = key === 'horse-skeleton' ? 54 : isDragon ? 20 : 22;
    const mesh = root.MiniatureMesh.create(facing);
    mesh.base('#bd9b60');
    if (isDragon && palette) dragon(mesh, palette);
    else if (key === 'horse-skeleton') horse(mesh);
    else if (key === 'goblin') goblin(mesh);
    else if (key === 'skeleton' || key === 'bull-skeleton') skeleton(mesh, key === 'bull-skeleton');
    else return;
    mesh.paint(ctx, size, 0.376);
  }
  root.CreatureMiniatures = { options, identify, draw };
})(globalThis);
