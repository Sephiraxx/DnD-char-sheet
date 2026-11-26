/* Esculturas originales de criaturas para las fichas públicas del tablero. */
(function (root) {
  'use strict';
  const scales = {
    red: ['#ac433c', '#5d252a', '#773633'],
    blue: ['#3866a4', '#90baec'],
    green: ['#437550', '#a4be79'],
    black: ['#343b46', '#515969', '#70777a'],
    white: ['#d9ecf4', '#b2cddc', '#ecf5f9'],
    brass: ['#aaa365', '#dad18f', '#c7c680'],
    bronze: ['#8d693e', '#96a180', '#a4ae87'],
    copper: ['#b66d4e', '#e8a383'],
    gold: ['#d49824', '#e7b142', '#f1bc4d'],
    silver: ['#868686', '#a7a7a7', '#cccccc'],
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
  const namedForms = new Map();
  const sizes = {
    tiny: 'wisp rat cat lizard bat hawk owl stirge claw',
    small: 'goblin kobold winged-kobold centipede flying-sword',
    large:
      'bull-skeleton horse-skeleton ogre troll minotaur ettin ogre-zombie bear elk owlbear crocodile toad spider phase-spider scorpion cube beholder griffon hippogriff manticore',
    huge: 'cyclops hill-giant',
  };
  const footprints = Object.freeze({ tiny: 0.5, small: 1, medium: 1, large: 2, huge: 3, gargantuan: 4 });
  // Tiny figures can overhang the plinth. Only the plinth defines the half-square footprint.
  const tinyFigureScale = {
    wisp: 3.74,
    rat: 1.52,
    cat: 1.48,
    lizard: 1.27,
    toad: 1.46,
    snake: 1.93,
    spider: 1.56,
    bat: 1.25,
    hawk: 1.06,
    owl: 1.36,
    stirge: 1.25,
    claw: 2.16,
  };
  const sizeById = new Map(Object.entries(sizes).flatMap(([size, keys]) => keys.split(' ').map(id => [id, size])));
  const dragonAges = {
    wyrmling: { label: 'Cría', size: 'medium', figureScale: 0.81 },
    young: { label: 'Joven', size: 'large', figureScale: 1 },
    adult: { label: 'Adulto', size: 'huge', figureScale: 1.04 },
    ancient: { label: 'Anciano', size: 'gargantuan', figureScale: 1.09 },
  };
  const variants = {
    hyena: { giant: ['Hiena gigante', 'large', 'giant hyena'] },
    bear: { black: ['Oso negro', 'medium', 'black bear'] },
    rat: { giant: ['Rata gigante', 'small', 'giant rat'] },
    lizard: { giant: ['Lagarto gigante', 'large', 'giant lizard', 'lagartija gigante'] },
    toad: { frog: ['Rana', 'tiny', 'frog'] },
    snake: {
      poisonous: ['Serpiente venenosa', 'tiny', 'poisonous snake'],
      constrictor: ['Serpiente constrictora', 'large', 'constrictor snake'],
    },
    spider: { normal: ['Araña', 'tiny', 'spider'] },
    bat: { giant: ['Murciélago gigante', 'large', 'giant bat'] },
    ooze: { 'black-pudding': ['Pudín negro', 'large', 'black pudding', 'pudín negro gigante'] },
  };
  for (const name of ['esqueleto', 'skeleton', 'humanoid skeleton']) known.set(name, 'skeleton');
  for (const name of ['esqueleto de minotauro', 'minotaur skeleton']) known.set(name, 'bull-skeleton');
  for (const name of ['esqueleto de caballo de guerra', 'warhorse skeleton']) known.set(name, 'horse-skeleton');
  for (const name of [
    'goblin',
    'trasgo',
    'goblin boss',
    'jefe goblin',
    'jefe trasgo',
    'goblin jefe',
    'goblin gang member',
  ])
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
    for (const [age, esName, enName] of [
      ['wyrmling', 'cria', 'wyrmling'],
      ['young', 'joven', 'young'],
      ['adult', 'adulto', 'adult'],
      ['ancient', 'anciano', 'ancient'],
    ]) {
      const choice = { id: key, age };
      namedForms.set(spanish + ' ' + esName, choice);
      namedForms.set(esName + ' de ' + spanish, choice);
      namedForms.set(enName + ' ' + en + ' dragon', choice);
      namedForms.set(en + ' dragon ' + enName, choice);
    }
  }
  function normalize(name) {
    return String(name || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase()
      .replace(/\s+#?\d+$/, '')
      .replace(/\s+/g, ' ');
  }
  const campaign = new Map();
  const groups = {
    'Goblins y esqueletos': Object.keys(options).filter(key => key !== 'sigil' && !key.startsWith('dragon-')),
    Dragones: Object.keys(options).filter(key => key.startsWith('dragon-')),
  };
  for (const model of root.CampaignMiniModels) {
    campaign.set(model.id, model);
    options[model.id] = model.label;
    (groups[model.group] ??= []).push(model.id);
    for (const name of [model.label, ...model.aliases]) known.set(normalize(name), model.id);
  }
  options.spider = 'Araña gigante';
  options.toad = 'Sapo gigante';
  for (const [id, forms] of Object.entries(variants))
    for (const [variant, [name, , ...aliases]] of Object.entries(forms))
      for (const alias of [name, ...aliases]) namedForms.set(normalize(alias), { id, variant });

  function resolve(name) {
    const key = normalize(name);
    const form = namedForms.get(key);
    if (form) return { ...form };
    const id = known.get(key);
    return id ? { id } : null;
  }
  function identify(name) {
    return resolve(name)?.id || null;
  }
  function forms(id) {
    if (id.startsWith('dragon-'))
      return Object.entries(dragonAges).map(([age, { label, size }]) => ({ age, label, size }));
    return Object.entries(variants[id] || {}).map(([variant, [label, size]]) => ({ variant, label, size }));
  }
  function metadata(id, { age, variant, footprint, base = false } = {}) {
    const dragon = id.startsWith('dragon-');
    if (dragon) {
      age = Object.hasOwn(dragonAges, age)
        ? age
        : forms(id).find(form => footprints[form.size] === footprint)?.age || 'young';
      return { id, name: options[id], size: dragonAges[age].size, faction: 'enemy', age };
    }
    const baseSize = sizeById.get(id) || campaign.get(id)?.size || 'medium';
    const form =
      !base &&
      forms(id).find(form =>
        variant ? form.variant === variant : footprint !== footprints[baseSize] && footprints[form.size] === footprint,
      );
    const size = form?.size || baseSize;
    return {
      id,
      name: form?.label || options[id] || id,
      size,
      faction: 'enemy',
      ...(form && { variant: form.variant }),
    };
  }
  function selection(name, model, form, footprint) {
    const named = resolve(name),
      explicit = Object.hasOwn(options, model);
    const id = explicit ? model : named?.id;
    if (!id || id === 'sigil') return null;
    if (form != null) return metadata(id, { age: form, variant: form, base: form === '' });
    return metadata(id, { footprint, ...(named?.id === id && named) });
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
    oval(x, y + 0.04, z, 0.251, 0.231, 0.215, ivory);
    oval(x, y - 0.195, z + 0.106, 0.147, 0.067, 0.119, bone);
    oval(x, y - 0.106, z + 0.162, 0.17, 0.075, 0.089, ivory);
    for (const s of [-1, 1]) {
      oval(x + s * 0.111, y + 0.014, z + 0.191, 0.076, 0.067, 0.041, shadow);
      rod([x + s * 0.068, y + 0.078, z + 0.198], [x + s * 0.179, y + 0.093, z + 0.157], 0.025, 0.035, ivory);
      rod([x + s * 0.207, y - 0.041, z + 0.096], [x + s * 0.164, y - 0.096, z + 0.189], 0.04, 0.03, bone);
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
      for (const d of [0.032, 0.077, 0.12])
        rod(
          [x + s * d, y - 0.13, z + 0.235 - d * 0.2],
          [x + s * d, y - 0.192, z + 0.231 - d * 0.2],
          0.017,
          0.014,
          ivory,
          5,
        );
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
        hand = [s * (width + 0.16), s > 0 ? 1.37 : 1.03, s > 0 ? 0.33 : 0.18];
      chain(mesh, [[0, 1.58, 0], shoulder, elbow, hand], [0.057, 0.076, 0.052, 0.046], ivory);
      oval(...elbow, 0.071, 0.068, 0.067, bone);
      oval(...hand, 0.064, 0.08, 0.059, ivory);
      if (s > 0 && !bull) {
        const [x, y, z] = hand;
        rod([x - 0.037, y - 0.08, z], [x + 0.035, y + 0.142, z + 0.04], 0.027, 0.025, leather, 6);
        rod([x - 0.057, y + 0.142, z + 0.041], [x + 0.144, y + 0.097, z + 0.041], 0.024, 0.018, '#9d6840', 5);
        mesh.membrane(
          [x - 0.007, y + 0.143, z + 0.041],
          [x + 0.116, y + 0.12, z + 0.04],
          [x + 0.204, y + 0.69, z + 0.092],
          '#a4633f',
        );
        mesh.membrane(
          [x + 0.043, y + 0.147, z + 0.066],
          [x + 0.116, y + 0.12, z + 0.04],
          [x + 0.204, y + 0.69, z + 0.092],
          '#b5a390',
        );
      }
      const hip = [s * 0.145, 0.98, 0],
        knee = [s * (width - 0.015), 0.59, s < 0 ? 0.18 : -0.015],
        heel = [s * width, 0.25, s < 0 ? 0.12 : -0.13];
      rod(hip, knee, 0.074, 0.047, ivory);
      oval(...knee, 0.086, 0.074, 0.074, bone);
      for (const d of [-0.032, 0.032])
        rod([knee[0] + d, knee[1], knee[2]], [heel[0] + d, heel[1], heel[2]], 0.035, 0.025, ivory);
      oval(heel[0], 0.204, heel[2] + 0.07, 0.096, 0.048, 0.152, ivory);
    }
    if (!bull) rod([0, 1.56, -0.045], [0, 1.69, 0.15], 0.067, 0.079, bone);
    skull(mesh, 0, bull ? 1.9 : 1.82, bull ? 0.025 : 0.183, bull);
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
    oval(0, 1.39, 0.218, 0.314, 0.268, 0.254, hide);
    oval(0, 1.26, 0.325, 0.228, 0.135, 0.158, hide);
    mesh.offset(0, -0.09, 0.102);
    for (const s of [-1, 1]) {
      const tip = [s * 0.745, 1.72, -0.006];
      chain(mesh, [[s * 0.22, 1.5, 0.07], [s * 0.38, 1.54, 0.042], tip], [0.12, 0.092, 0.003], hide);
      mesh.membrane([s * 0.27, 1.47, 0.154], [s * 0.36, 1.57, 0.136], tip, ear);
      oval(s * 0.128, 1.51, 0.326, 0.069, 0.041, 0.035, '#edc34e');
      oval(s * 0.128, 1.507, 0.355, 0.018, 0.027, 0.013, shadow);
      rod([s * 0.055, 1.548, 0.33], [s * 0.205, 1.585, 0.28], 0.034, 0.041, hide);
      rod([s * 0.123, 1.309, 0.355], [s * 0.14, 1.388, 0.378], 0.032, 0.002, ivory, 6);
    }
    rod([0, 1.56, 0.3], [0, 1.422, 0.447], 0.077, 0.036, hide);
  }
  function dragonHead(mesh, color, hide, frill) {
    const { oval, rod, membrane } = mesh;
    const horns = {
      red: [
        [0.16, 2.1, 0.42],
        [0.22, 2.25, 0.17],
        [0.3, 2.34, -0.08],
      ],
      black: [
        [0.18, 2.06, 0.43],
        [0.36, 2.13, 0.57],
        [0.46, 2.24, 0.82],
        [0.38, 2.32, 1.06],
      ],
      copper: [
        [0.16, 2.1, 0.45],
        [0.28, 2.16, 0.29],
        [0.46, 2.19, 0.11],
        [0.55, 2.28, -0.08],
      ],
    };
    if (color === 'blue') {
      chain(
        mesh,
        [
          [0, 2.012, 0.86],
          [0, 2.26, 1.04],
          [0, 2.55, 1.07],
        ],
        [0.104, 0.061, 0.003],
        ivory,
      );
    }
    if (color === 'brass') {
      const nose = [0, 2.09, 0.63],
        centre = [0, 2.13, 0.35],
        tail = [0, 2.18, 0.05];
      for (const s of [-1, 1]) {
        const shoulder = [s * 0.19, 2.17, 0.57],
          point = [s * 0.36, 2.19, 0.15],
          edge = [s * 0.19, 2.19, 0.04];
        membrane(nose, centre, shoulder, hide);
        membrane(centre, shoulder, point, frill);
        membrane(centre, point, edge, hide);
        membrane(centre, edge, tail, frill);
        rod(nose, point, 0.029, 0.013, hide);
      }
    }
    const crest = {
      blue: [
        [2.04, 0.59, 2.31],
        [2.08, 0.36, 2.33],
        [1.96, 0.14, 2.14],
      ],
      white: [
        [2.07, 0.56, 2.26],
        [2.04, 0.29, 2.36],
        [1.85, 0.03, 2.25],
      ],
      gold: [
        [2.05, 0.63, 2.28],
        [2.1, 0.38, 2.4],
        [1.97, 0.22, 2.32],
        [1.67, 0.06, 2.09],
      ],
    }[color];
    if (crest)
      for (let i = 1; i < crest.length; i++) {
        const [y0, z0, peak0] = crest[i - 1],
          [y1, z1, peak1] = crest[i];
        membrane([0, y0, z0], [0, peak0, z0 - 0.09], [0, y1, z1], frill);
        membrane([0, peak0, z0 - 0.09], [0, y1, z1], [0, peak1, z1 - 0.13], i % 2 && color === 'blue' ? hide : frill);
        rod([0, y0, z0], [0, peak0, z0 - 0.09], 0.022, 0.005, hide, 5);
      }
    for (const s of [-1, 1]) {
      if (color === 'green') {
        const roots = [
          [0, 2.08, 0.49],
          [0, 2.08, 0.31],
          [0, 1.9, 0.33],
          [0, 1.65, 0.24],
          [0, 1.41, 0.14],
          [0, 1.19, 0.02],
        ];
        for (let i = 1; i < roots.length; i++) {
          const [a, b] = roots.slice(i - 1, i + 1);
          const fan = [s * (0.18 - 0.018 * i), (a[1] + b[1]) / 2 + 0.15, (a[2] + b[2]) / 2 - 0.2];
          membrane(a, fan, b, frill);
          rod(a, fan, 0.023, 0.003, hide, 5);
        }
      }
      if (horns[color]) {
        const curve = horns[color].map(([x, y, z]) => [x * s, y, z]);
        chain(mesh, curve, [0.081, 0.061, curve.length === 3 ? 0.004 : 0.038, 0.004], ivory);
        if (color === 'copper')
          for (let i = 0; i < curve.length - 1; i++)
            for (const t of [0.12, 0.52]) {
              const joint = curve[i].map((n, axis) => n + (curve[i + 1][axis] - n) * t);
              const width = [0.087, 0.066, 0.043][i] * (1 - t * 0.24);
              oval(...joint, width, width * 0.77, width * 0.72, frill);
            }
      }
      if (['red', 'bronze', 'silver'].includes(color)) {
        const a = [s * 0.151, 2.02, 0.55],
          b = [s * 0.17, 1.78, 0.58];
        const outline = {
          red: [
            [0.31, 2.14, 0.28],
            [0.27, 1.98, 0.32],
            [0.4, 1.98, 0.22],
            [0.31, 1.87, 0.32],
            [0.39, 1.75, 0.24],
          ],
          bronze: [
            [0.27, 1.95, 0.3],
            [0.46, 1.86, 0.31],
            [0.5, 1.72, 0.3],
            [0.25, 1.68, 0.4],
          ],
          silver: [
            [0.24, 2.13, 0.43],
            [0.43, 2.2, 0.36],
            [0.54, 2.09, 0.23],
            [0.42, 1.88, 0.28],
            [0.24, 1.81, 0.37],
          ],
        }[color].map(([x, y, z]) => [s * x, y, z]);
        const centre = [s * 0.22, 1.92, 0.49];
        const edge = [a, ...outline, b];
        for (let i = 1; i < edge.length; i++) {
          membrane(centre, edge[i - 1], edge[i], frill);
          if (color !== 'silver') rod(centre, edge[i], 0.027, 0.005, hide, 5);
        }
      }
      if (color === 'gold')
        chain(
          mesh,
          [
            [s * 0.12, 1.946, 0.98],
            [s * 0.27, 1.86, 1.04],
            [s * 0.41, 1.9, 1],
            [s * 0.49, 2.03, 0.89],
          ],
          [0.037, 0.028, 0.016, 0.003],
          frill,
        );
      if (color === 'black') oval(s * 0.118, 1.898, 0.767, 0.085, 0.075, 0.145, '#8c8c83');
    }
  }
  function dragon(mesh, color, palette) {
    const { oval, rod, membrane } = mesh,
      [skin, wingColor, bellyColor = wingColor] = palette;
    const metallic = ['brass', 'bronze', 'copper', 'gold', 'silver'].includes(color);
    const metal = root.MiniatureMesh.metal;
    const matte = color => ({ color, shine: 0 });
    const hide = metallic ? metal(skin, color === 'gold' ? 0.94 : 0.85, 0.22) : matte(skin);
    const frill = metallic ? metal(wingColor, 0.72, 0.24) : matte(wingColor);
    const wing = matte(color === 'bronze' ? '#688070' : wingColor);
    const belly = metallic ? metal(bellyColor, 0.7, 0.34) : matte(bellyColor);
    const wingTips = {
      blue: [
        [1.5, 2.04, 0.26],
        [1.21, 1.49, -0.36],
      ],
      black: [
        [1.44, 1.9, 0.3],
        [1.34, 1.32, -0.22],
        [1.17, 1.08, -0.63],
      ],
      white: [
        [1.36, 2.09, 0.1],
        [1.17, 1.54, -0.37],
        [0.82, 1.37, -0.61],
      ],
      bronze: [
        [1.45, 1.94, 0.43],
        [1.23, 1.54, -0.08],
        [1.06, 1.05, -0.82],
      ],
      silver: [
        [1.39, 2.06, 0.15],
        [1.37, 1.52, -0.45],
        [1.1, 1.2, -0.78],
        [0.66, 1.04, -0.85],
      ],
    }[color];
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
        [0, 1.26, 0.32],
        [0, 1.61, 0.36],
        [0, 1.9, 0.5],
      ],
      [0.232, 0.16, 0.137, 0.14],
      hide,
    );
    const chestPlates = [
      [0.77, 0.47, 0.18],
      [0.91, 0.48, 0.19],
      [1.05, 0.48, 0.168],
      [1.19, 0.495, 0.145],
      [1.33, 0.51, 0.123],
      [1.47, 0.535, 0.113],
      [1.61, 0.55, 0.104],
      [1.75, 0.607, 0.096],
      [1.84, 0.65, 0.091],
    ];
    for (let i = 1; i < chestPlates.length; i++) {
      const [y, z, w] = chestPlates[i - 1],
        [upper, nextZ, nextW] = chestPlates[i];
      const lowerEdge = [0, y - 0.026, z + 0.027],
        upperEdge = [0, upper + 0.008, nextZ];
      for (const s of [-1, 1]) {
        const corner = [s * w, y + 0.022, z - 0.063];
        const shoulder = [s * nextW, upper, nextZ - 0.057];
        membrane(lowerEdge, corner, upperEdge, belly);
        membrane(corner, shoulder, upperEdge, belly);
      }
    }
    const sleek = color === 'white';
    oval(0, 1.953, 0.516, sleek ? 0.179 : 0.218, 0.169, 0.23, hide);
    oval(0, 1.836, 0.733, 0.139, 0.051, 0.234, belly);
    oval(0, 1.878, 0.771, 0.137, 0.036, 0.222, shadow);
    oval(0, 1.953, 0.766, sleek ? 0.111 : 0.149, 0.085, sleek ? 0.27 : 0.233, hide);
    dragonHead(mesh, color, hide, frill);
    for (const s of [-1, 1]) {
      const eye = sleek ? 0.134 : 0.166;
      oval(s * eye, 2.002, 0.671, 0.065, 0.054, 0.048, shadow);
      oval(s * (eye + 0.016), 2.008, 0.701, 0.039, 0.027, 0.028, sleek ? '#8fdef9' : '#f3cf65');
      oval(s * (eye + 0.025), 2.013, 0.722, 0.01, 0.025, 0.015, shadow);
      rod([s * (eye + 0.038), 2.054, 0.573], [s * (eye - 0.026), 2.034, 0.749], 0.053, 0.019, hide);
      for (const z of [0.73, 0.84]) rod([s * 0.124, 1.927, z], [s * 0.128, 1.852, z + 0.018], 0.023, 0.002, ivory, 5);
      oval(s * 0.08, 1.99, 0.932, 0.031, 0.016, 0.026, shadow);
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
      const root = [s * 0.15, 1.24, -0.18],
        wrist = [s * 0.49, 1.87, -0.3];
      const edge = [
        [1.46, 1.91, 0.22],
        [1.25, 1.41, -0.27],
        [0.94, 1.17, -0.66],
        [0.58, 0.98, -0.72],
        [0.18, 0.98, -0.44],
      ].map(([x, y, z], i) => {
        const [px, py, pz] = wingTips?.[i] || [x, y, z];
        const outer = i === 0;
        const lowered = [0, 0.19, 0.24, 0.16, 0.04][i];
        return [s * px * 0.62, py + 0.22 - lowered + (s > 0 && outer ? 0.09 : 0), pz * 0.76 - 0.49];
      });
      for (let i = 1; i < edge.length; i++) {
        const a = edge[i - 1],
          b = edge[i];
        const notch = a.map((n, axis) => (n + b[axis]) * 0.5 * 0.88 + wrist[axis] * 0.12);
        const ridge = a.map((n, axis) => (n + b[axis] + wrist[axis]) / 3 + (axis === 2 ? 0.085 : 0));
        membrane(wrist, a, ridge, wing);
        membrane(a, notch, ridge, wing);
        membrane(notch, b, ridge, wing);
        membrane(b, wrist, ridge, wing);
      }
      const inner = [s * 0.29, 1.17, -0.55];
      membrane(root, wrist, inner, wing);
      membrane(inner, wrist, edge.at(-1), wing);
      membrane(inner, edge.at(-1), edge.at(-2), wing);
      rod(root, wrist, 0.089, 0.06, hide);
      for (const tip of edge) rod(wrist, tip, 0.04, 0.009, hide, 6);
      rod(wrist, [s * 0.53, 2.05, -0.15], 0.045, 0.003, ivory, 6);
    }
    if (color === 'green' || color === 'white') return;
    for (const [y, z, r] of [
      [1.58, 0.24, 0.07],
      [1.37, 0.14, 0.075],
      [1.2, 0.035, 0.084],
      [1.11, -0.2, 0.078],
      [1.01, -0.4, 0.06],
    ])
      rod([0, y, z], [0, y + 0.14, z - 0.095], r, 0.002, ivory, 6);
  }
  function draw(ctx, key, size, descriptor) {
    const record = metadata(key, descriptor);
    const color = key.startsWith('dragon-') ? key.slice('dragon-'.length) : '';
    ctx.miniFigureScale = color
      ? dragonAges[record.age].figureScale
      : record.size === 'small'
        ? 0.74
        : record.size === 'tiny'
          ? (tinyFigureScale[key] ?? 1)
          : ({ bugbear: 1.36, gnoll: 1.4, cyclops: 1.045 }[key] ?? 1);
    ctx.miniRim = ['dragon-black', 'wraith', 'spider', 'raven-swarm', 'ooze'].includes(key) ? 65 : 31;
    const model = campaign.get(key);
    if (model) return root.CampaignMiniatures.draw(ctx, model, size, record.variant);
    const palette = scales[color];
    const facing = key === 'horse-skeleton' ? 54 : palette ? (ctx.miniBoard ? 14 : 11) : 22;
    const mesh = root.MiniatureMesh.create(facing, ctx);
    mesh.base('#bd9b60');
    if (palette) dragon(mesh, color, palette);
    else if (key === 'horse-skeleton') horse(mesh);
    else if (key === 'goblin') goblin(mesh);
    else if (key === 'skeleton' || key === 'bull-skeleton') skeleton(mesh, key === 'bull-skeleton');
    else return;
    mesh.paint(ctx, size, 0.376);
  }
  root.CreatureMiniatures = { options, groups, resolve, identify, metadata, forms, footprints, selection, draw };
})(globalThis);
