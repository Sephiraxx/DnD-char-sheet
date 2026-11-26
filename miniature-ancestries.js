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
    orc: '#68804f',
    halfOrc: '#85927b',
    goblin: '#7e984e',
    dragonborn: '#a24f3d',
    githyanki: '#b3aa65',
    goliath: '#8d9398',
    dhampir: '#d7bcb8',
    reborn: '#a9aba0',
    hexblood: '#a29288',
    kalashtar: '#9d725c',
    aasimar: '#b68264',
    warforged: '#515c61',
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
    'dragonborn warforged lizardfolk kobold tortle loxodon giff goliath vedalken plasmoid thri-kreen yuan-ti grung locathah autognome harengon aarakocra kenku owlin leonin tabaxi shifter bugbear hadozee genasi-fire genasi-earth genasi-water genasi-air'.split(
      ' ',
    ),
  );
  const profiles = {
    human: ['regular', 170, 'swept', '#855844'],
    elf: ['slender', 178, 'long', '#567157', { hairColor: '#c7a56c' }],
    halfElf: ['athletic', 173, 'braid', '#735f91', { hairColor: '#774936' }],
    dwarf: ['stocky', 137, 'crest', '#925139', { beard: 'braided', hairColor: '#975133' }],
    halfling: ['small', 100, 'curls', '#8d7346'],
    gnome: ['small', 106, 'wild', '#516e98', { hairColor: '#c78b4d' }],
    orc: ['powerful', 195, 'crest', '#4c5742'],
    halfOrc: ['broad', 182, 'bob', '#76585a', { hairColor: '#302f33' }],
    goblin: ['small', 104, 'bald', '#80663c'],
    tiefling: ['slender', 174, 'locs', '#a17770', { skin: '#a66a76', hairColor: '#442c43' }],
    dragonborn: ['powerful', 190, 'bald', '#604835'],
    warforged: ['broad', 193, 'bald', '#5c586c'],
    tabaxi: ['slender', 173, 'bald', '#a27782'],
    leonin: ['powerful', 191, 'bald', '#735333', { hairColor: '#7e4f34' }],
    harengon: ['athletic', 166, 'bald', '#837e4b'],
    aarakocra: ['athletic', 161, 'bald', '#8c5d46'],
    kenku: ['slender', 157, 'bald', '#655377'],
    owlin: ['broad', 163, 'bald', '#777291'],
    tortle: ['broad', 164, 'bald', '#9e7759'],
    loxodon: ['massive', 219, 'bald', '#845f72'],
    kobold: ['small', 97, 'bald', '#666854'],
    lizardfolk: ['athletic', 177, 'bald', '#7d6047'],
    minotaur: ['powerful', 213, 'mane', '#845052', { facing: 31 }],
    bugbear: ['longlimbed', 213, 'bald', '#646442'],
    centaur: ['athletic', 181, 'braid', '#866e3f', { hairColor: '#684532', facing: 48 }],
    changeling: ['slender', 169, 'bob', '#5a647c', { hairColor: '#ddd8dd' }],
    'custom-lineage': ['regular', 172, 'bun', '#727c64'],
    githyanki: ['slender', 183, 'topknot', '#a38254', { hairColor: '#382e2b' }],
    githzerai: ['slender', 178, 'bald', '#b07f4b', { beard: 'braided', hairColor: '#4f3e31' }],
    hobgoblin: ['broad', 185, 'crest', '#853e3c'],
    kalashtar: ['slender', 176, 'braid', '#74769b', { hairColor: '#322e3e' }],
    shifter: ['athletic', 177, 'bald', '#79674f'],
    'simic-hybrid': ['athletic', 174, 'swept', '#54606f', { hairColor: '#325657' }],
    vedalken: ['lanky', 204, 'bald', '#96754f'],
    aasimar: ['regular', 175, 'long', '#a18e60', { hairColor: '#cfb47c' }],
    autognome: ['small', 96, 'bald', '#625864'],
    dhampir: ['slender', 178, 'swept', '#713c56', { hairColor: '#393039' }],
    fairy: ['small', 94, 'bun', '#907c9a', { hairColor: '#cead75' }],
    firbolg: ['powerful', 229, 'wild', '#616c52', { skin: '#889da3', hairColor: '#89674c', beard: 'braided' }],
    'genasi-air': ['slender', 177, 'bald', '#707795'],
    'genasi-earth': ['broad', 172, 'bald', '#76604b'],
    'genasi-fire': ['athletic', 175, 'bald', '#6c373d'],
    'genasi-water': ['regular', 173, 'bald', '#4e667f'],
    giff: ['massive', 213, 'bald', '#655656', { facing: 30 }],
    goliath: ['powerful', 229, 'bald', '#6f4d56'],
    grung: ['small', 97, 'bald', '#875d48'],
    hadozee: ['longlimbed', 166, 'bald', '#6b7253'],
    hexblood: ['slender', 174, 'bob', '#74516d', { hairColor: '#78646b' }],
    kender: ['small', 103, 'topknot', '#9b643b', { belt: 'pouch', hairColor: '#a66437' }],
    locathah: ['regular', 165, 'bald', '#75655c'],
    plasmoid: ['slender', 164, 'bald', '#617a75'],
    reborn: ['regular', 173, 'shorn', '#74696b', { hairColor: '#514c50' }],
    satyr: ['athletic', 169, 'curls', '#8f6e5c'],
    'thri-kreen': ['lanky', 187, 'bald', '#775d4a'],
    triton: ['athletic', 170, 'swept', '#735f82', { hairColor: '#326077' }],
    verdan: ['small', 105, 'shorn', '#7f6c58'],
    'yuan-ti': ['slender', 178, 'bald', '#605747'],
    other: ['regular', 170, 'bald', '#6d6575'],
  };
  const flexible = new Set(['harengon', 'owlin', 'hadozee']);
  const ancestries = {
    red: ['#a24f3d'],
    blue: ['#4f73b2'],
    green: ['#55764a'],
    black: ['#44444a'],
    white: ['#d2e0e2'],
    brass: ['#aca25e', true],
    bronze: ['#847049', true],
    copper: ['#b87153', true],
    gold: ['#ca9650', true],
    silver: ['#a1a1a1', true],
  };
  const palettes = {
    tiefling: ['#a66a76', '#a84e46', '#765686', '#5e78a4', '#b98568', '#795244'],
    grung: ['#68a167', '#bb633e', '#d8b451', '#598dc1', '#aa739e', '#d46d75'],
  };
  const features = {
    warforged: {
      woodIron: 'Madera y hierro',
      iron: 'Todo hierro o acero',
      stone: 'Piedra y hierro',
      mithralBronze: 'Mithral y bronce',
      darkwood: 'Madera oscura y hierro',
    },
    tabaxi: { plain: 'Pelaje liso', spots: 'Manchas', stripes: 'Rayas' },
    minotaur: { hooves: 'Pezuñas', ring: 'Pezuñas y aro nasal', boots: 'Botas', bootsRing: 'Botas y aro nasal' },
    'simic-hybrid': { fins: 'Aletas manta', carapace: 'Caparazón', tentacles: 'Tentáculos' },
    kalashtar: { eyes: 'Ojos psiónicos', aura: 'Aura psiónica' },
    aasimar: { radiance: 'Resplandor', halo: 'Halo', wings: 'Alas espectrales' },
    'yuan-ti': { scales: 'Escamas', hood: 'Capucha de cobra' },
  };
  function appearance(race) {
    const [build, height, hair, cloth, extras] = profiles[race] || profiles.human;
    return {
      build,
      height,
      hair,
      cloth,
      ...(skins[race] && { skin: skins[race] }),
      ...extras,
      ...(features[race] && { feature: Object.keys(features[race])[0] }),
      size: build === 'small' ? 'small' : 'medium',
      ...(race === 'dragonborn' && { ancestry: 'red' }),
    };
  }
  const hairOptions = (race, styles) =>
    bare.has(race)
      ? { bald: styles.bald }
      : race === 'minotaur'
        ? { mane: styles.mane, braid: styles.braid, bald: styles.bald }
        : styles;
  const sizeOptions = race => (flexible.has(race) ? { small: 'Pequeño', medium: 'Mediano' } : null);
  const sculptedHorns = new Set(['tiefling', 'dragonborn', 'minotaur', 'kobold', 'satyr']);
  const hornOptions = { natural: 'Naturales', short: 'Cortos', swept: 'Hacia atrás' };
  function faceOptions(race) {
    const hair = !bare.has(race);
    return {
      hair,
      beard: hair && !animalHeads.has(race),
      hairColor: hair || race === 'leonin',
      ears: !bare.has(race) && !sculptedHorns.has(race) && !animalHeads.has(race) && race !== 'triton',
      horns: sculptedHorns.has(race) ? hornOptions : null,
      scar: !['warforged', 'autognome', 'plasmoid', 'thri-kreen'].includes(race),
    };
  }
  const heightRanges = { human: [150, 195], halfling: [90, 110], goliath: [210, 245] };
  function heightRange(race, size) {
    if (flexible.has(race) && size === 'small') return { min: 90, max: 110, standard: 100 };
    const { height: standard, size: base } = appearance(race);
    const difference = base === 'small' ? 10 : standard < 150 ? 12 : 18;
    const [min, max] = heightRanges[race] || [standard - difference, standard + difference];
    return { min, max, standard };
  }
  function hornShape(style) {
    if (style === 'short') return { rise: 0.58, sweep: 0.8 };
    if (style === 'swept') return { rise: 0.86, sweep: 1.85 };
    return { rise: 1, sweep: 1 };
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
  const glow = (color, emission = 0.75) => ({ color, emission });
  const clear = (color, alpha = 0.58) => ({ color, alpha, layered: true, shine: 46, roughness: 0.23 });
  const skin = m => (m.race === 'plasmoid' ? clear(m.skin, 0.56) : m.skin);
  const heads = {
    tabaxi: [1.045, 0.85],
    leonin: [0.99, 1.09],
    shifter: [1.035, 0.96],
    'yuan-ti': [1.06, 0.89],
    elf: [1.05, 0.88],
    halfElf: [1, 0.96],
    dwarf: [0.94, 1.16],
    halfling: [1.08, 1.14],
    gnome: [1.16, 1.18],
    goblin: [0.91, 1.23],
    vedalken: [1.33, 0.82],
    githyanki: [1.09, 0.91],
    githzerai: [1.21, 0.92],
    orc: [1.03, 1.18],
    halfOrc: [1, 1.06],
    kobold: [0.89, 1.04],
    dragonborn: [0.92, 1.08],
    owlin: [0.9, 1.14],
    tortle: [0.79, 1.145],
    loxodon: [1.11, 1.22],
    giff: [1.04, 1.32],
    firbolg: [1.13, 1.16],
    grung: [0.92, 1.36],
    verdan: [1.18, 1.11],
    'thri-kreen': [1.18, 0.93],
    kalashtar: [1.12, 0.95],
    aasimar: [1, 1.02],
    dhampir: [1.07, 0.88],
    reborn: [0.96, 1.04],
  };
  const ears = {
    elf: [0.265, 0.236, -0.19],
    halfElf: [0.111, 0.104, -0.055],
    gnome: [0.137, 0.13, -0.093],
    goblin: [0.31, 0.112, 0.078],
    githyanki: [0.17, 0.17, -0.188],
    githzerai: [0.126, 0.21, -0.15],
    kender: [0.065, 0.135, 0.012],
    verdan: [0.172, 0.228, -0.033],
    fairy: [0.16, 0.27, -0.08],
    orc: [0.126, 0.194, -0.1],
    halfOrc: [0.093, 0.103, -0.035],
    firbolg: [0.18, -0.115, 0.027],
    hobgoblin: [0.195, 0.18, 0.054],
  };
  const eyes = {
    tiefling: '#e3bf86',
    changeling: '#e4e6eb',
    dhampir: '#a12f42',
    githyanki: '#4f3b2b',
    githzerai: '#665438',
    kalashtar: glow('#a9dedc', 0.9),
    aasimar: glow('#f9e4a7', 1.06),
    hexblood: glow('#a9e1a0', 0.83),
    shifter: '#d79d48',
  };
  const eye = (race, side) => (race === 'reborn' && side > 0 ? glow('#b7ebd8', 0.87) : eyes[race] || ink);
  const sculptedEyes = race =>
    ['owlin', 'dragonborn', 'thri-kreen', 'grung', 'locathah', 'yuan-ti', 'gnome'].includes(race);

  function leg(mesh, m, foot, knee, thigh, bulk, color) {
    const r = m.race,
      { oval, rod, form } = mesh;
    const bird = ['aarakocra', 'kenku', 'owlin'].includes(r);
    const hooves = r === 'satyr' || (r === 'minotaur' && ['ring', 'hooves'].includes(m.feature));
    const bareFoot = ['halfling', 'harengon', 'grung', 'tortle'].includes(r);
    if (r === 'thri-kreen') {
      const s = Math.sign(foot[0]),
        kneeJoint = [s * 0.302, knee[1] - 0.064, knee[2] + 0.141];
      const hock = [s * 0.287, 0.411, foot[2] - 0.262],
        pad = [s * 0.311, 0.22, foot[2] + 0.056];
      const shell = shade(m.skin, 0.68);
      chain(mesh, [thigh, kneeJoint, hock, pad], [0.102, 0.079, 0.044, 0.022], shell);
      oval(...kneeJoint, 0.091, 0.071, 0.078, shade(m.skin, 1.04));
      rod(hock, [s * 0.351, 0.34, hock[2] - 0.077], 0.038, 0.005, shell, 5);
      for (const x of [-0.054, 0.034, 0.068])
        spike(mesh, pad, [pad[0] + x, 0.19, pad[2] + 0.106 - x * 0.09], 0.025, shell);
      return true;
    }
    if (bird || hooves) {
      const hock = [foot[0], 0.42, foot[2] - 0.14];
      const bone = bird ? '#ad895b' : '#806755';
      chain(mesh, [thigh, knee, hock, foot], [bulk * 1.08, bulk * 0.76, bulk * 0.61, bulk * 0.53], bone);
      if (hooves) {
        form(
          foot[0],
          0.184,
          foot[2] + 0.044,
          [
            [0, 0.109, 0.133],
            [0.112, 0.077, 0.094],
          ],
          '#393032',
          8,
        );
        rod([foot[0], 0.234, foot[2] + 0.13], [foot[0], 0.184, foot[2] + 0.157], 0.01, 0.01, '#6c5a53', 5);
      } else {
        for (const x of [-0.059, 0.01, 0.07]) {
          const tip = [foot[0] + x, 0.205, foot[2] + 0.176 - Math.abs(x) * 0.4];
          rod([foot[0], 0.241, foot[2]], tip, 0.027, 0.017, bone, 5);
          spike(mesh, tip, [tip[0], 0.187, tip[2] + 0.046], 0.02, '#423730');
        }
      }
      return true;
    }
    if (bareFoot || r === 'plasmoid') {
      const footLength = r === 'harengon' ? 0.26 : r === 'halfling' ? 0.22 : 0.13;
      chain(mesh, [thigh, knee, foot], [bulk * 1.05, bulk * 0.78, bulk * 0.61], color);
      oval(foot[0], 0.229, foot[2] + footLength * 0.34, bulk * 1.12, 0.063, footLength, color);
      if (r !== 'plasmoid')
        for (const x of [-0.052, 0.003, 0.051])
          oval(foot[0] + x, 0.22, foot[2] + footLength * 1.13, 0.034, 0.034, 0.057, color);
      return true;
    }
    if (r === 'triton') mesh.membrane(knee, [knee[0] * 1.9, knee[1] - 0.1, knee[2] - 0.13], foot, shade(m.skin, 1.27));
    return false;
  }
  function arm(mesh, m, shoulder, elbow, hand, bulk, color) {
    const r = m.race,
      sign = Math.sign(shoulder[0]);
    if (r === 'hadozee') {
      const rib = [shoulder[0] * 0.64, shoulder[1] - 0.58, shoulder[2] - 0.065];
      const wrist = [hand[0] - sign * 0.048, hand[1] + 0.041, hand[2] - 0.03];
      const lower = [(wrist[0] + rib[0]) * 0.51, Math.min(wrist[1], rib[1]) - 0.185, (wrist[2] + rib[2]) * 0.5 - 0.1];
      const fan = [(elbow[0] + rib[0]) * 0.52, (elbow[1] + rib[1]) * 0.5, elbow[2] - 0.052];
      mesh.membrane(shoulder, elbow, fan, '#9e7d6b');
      mesh.membrane(shoulder, fan, rib, '#b08b75');
      mesh.membrane(elbow, wrist, fan, '#bf9c81');
      mesh.membrane(fan, wrist, lower, '#b48e76');
      mesh.membrane(fan, lower, rib, '#a3826e');
      chain(mesh, [rib, lower, wrist], [0.025, 0.021, 0.009], '#816454');
    }
    if (['kenku', 'aarakocra', 'owlin', 'bugbear', 'hadozee'].includes(r))
      for (let i = 0; i < 4; i++) {
        const a = shoulder.map((n, k) => n + (elbow[k] - n) * i * 0.21);
        spike(mesh, a, [a[0] + sign * 0.126, a[1] - 0.21, a[2] - 0.125], bulk * 0.69, shade(m.skin, 0.82 + i * 0.05));
      }
    if (['triton', 'locathah'].includes(r))
      mesh.membrane(elbow, [elbow[0] * 1.29, elbow[1] - 0.1, elbow[2] - 0.22], hand, shade(m.skin, 1.24));
    if (r === 'yuan-ti') {
      for (let i = 0; i < 5; i++) {
        const a = elbow.map((n, k) => n + (hand[k] - n) * (0.13 + i * 0.157));
        for (const offset of [-0.038, 0, 0.038]) {
          const scale = [a[0] + offset, a[1], a[2] + bulk * 0.72 + Math.abs(offset) * -0.34];
          mesh.oval(...scale, 0.029, 0.035, 0.019, i % 2 ? '#aab57e' : '#557657');
        }
      }
    }
    if (['locathah', 'dragonborn', 'lizardfolk', 'kobold', 'goliath', 'reborn'].includes(r))
      for (let i = 1; i <= 3; i++) {
        const a = elbow.map((n, k) => n + ((hand[k] - n) * i) / 4);
        mesh.oval(
          a[0] + sign * 0.021,
          a[1],
          a[2] + bulk * 0.52,
          0.041,
          0.045,
          0.025,
          shade(m.skin, i % 2 ? 0.79 : 0.9),
        );
      }
    if (r === 'thri-kreen') {
      const forearm = elbow.map((v, i) => v + (hand[i] - v) * 0.58);
      chain(mesh, [elbow, forearm, hand], [bulk * 1.01, 0.064, 0.027], shade(m.skin, 0.74));
      chain(
        mesh,
        [forearm, [forearm[0] + sign * 0.072, forearm[1] + 0.094, forearm[2] + 0.024], hand],
        [0.049, 0.05, 0.003],
        shade(m.skin, 1.2),
      );
      mesh.oval(...elbow, 0.085, 0.071, 0.074, color);
      return true;
    }
    return false;
  }
  function hand(mesh, m, grip, side, color) {
    if (!['triton', 'locathah', 'thri-kreen'].includes(m.race)) return;
    const [x, y, z] = grip;
    const claw = m.race === 'thri-kreen';
    const points = [-1, 0, 1].map((n, i) => [
      x + side * 0.055 * n,
      y - 0.13 + Math.abs(n) * 0.028,
      z + 0.031 + i * 0.018,
    ]);
    for (const p of points) spike(mesh, grip, p, 0.028, claw ? shade(m.skin, 0.7) : color);
    if (!claw) mesh.membrane(grip, points[0], points[2], shade(m.skin, 1.18));
  }
  function hair(mesh, m, h) {
    const c = m.hairColor;
    const { oval, rod } = mesh;
    const [rise, width] = heads[m.race] || [1, 1];
    const y = h + 0.17 * rise;
    if (m.hair === 'shorn') {
      for (const [x, z] of [
        [-0.07, 0.03],
        [0, 0.01],
        [0.065, -0.026],
      ])
        oval(x * width, y + 0.036, z, 0.102, 0.037, 0.142, c);
      return;
    }
    if (m.hair === 'swept' || m.hair === 'crop' || m.hair === 'bob') {
      const sweep = m.hair === 'crop' ? 0.36 : 1;
      for (let i = 0; i < 5; i++)
        rod(
          [-0.17 * width + i * 0.058, y + 0.065 + (i % 2) * 0.04 * sweep, 0.115 - i * 0.025],
          [-0.135 * width + i * 0.077 * sweep, y - 0.011, -0.169],
          0.092,
          m.hair === 'bob' ? 0.077 : 0.05,
          shade(c, 0.86 + i * 0.061),
          7,
        );
      return;
    }
    if (m.hair === 'wild' || m.hair === 'mane' || m.hair === 'crest') {
      if (m.race === 'minotaur') {
        for (const x of [-0.056, 0, 0.056])
          chain(
            mesh,
            [
              [x, h + 0.221, -0.083],
              [x, h + 0.181, -0.25],
              [x, h - 0.009, -0.28],
            ],
            [0.078, 0.067, 0.019],
            c,
          );
        return;
      }
      const spread = m.hair === 'crest' ? 0.11 : (m.hair === 'mane' ? 0.36 : 0.29) * width;
      if (m.hair === 'mane') oval(0, h + 0.075, -0.138, 0.253 * width, 0.175, 0.176, c);
      for (let i = 0; i < 7; i++) {
        const a = (i - 3) * 0.45;
        const crest = m.race === 'dwarf' && m.hair === 'crest' ? 0.073 + (i % 3) * 0.008 : 0.14 + ((i * 5) % 3) * 0.044;
        rod(
          [spread * Math.sin(a), y, 0.24 * Math.cos(a) - 0.14],
          [spread * 1.3 * Math.sin(a), y + crest, -0.14 + 0.12 * Math.cos(a)],
          0.079,
          0.006,
          shade(c, 0.89 + (i % 3) * 0.085),
          6,
        );
      }
      return;
    }
    oval(0, y + 0.031, -0.031, 0.212 * width, 0.083, 0.205, c);
    if (m.hair === 'topknot') {
      const kender = m.race === 'kender';
      oval(0, y + (kender ? 0.224 : 0.16), -0.089, kender ? 0.115 : 0.078, 0.102, 0.091, c);
      chain(
        mesh,
        [
          [0, y + 0.094, -0.061],
          [0, y + 0.197, -0.142],
          [kender ? -0.13 : 0.08, y + 0.2, -0.245],
          [kender ? -0.21 : 0.11, y + 0.02, -0.28],
        ],
        [0.073, 0.076, 0.05, 0.013],
        c,
      );
    }
  }
  function crown(mesh, m, h, surface) {
    const r = m.race,
      c = m.skin,
      { oval, rod, membrane, form } = mesh;
    if (r.startsWith('genasi-')) {
      const kind = r.slice(7);
      for (let i = 0; i < 5; i++) {
        const x = (i - 2) * 0.087,
          rise = 0.27 + 0.12 * (1 - Math.abs(i - 2) / 2) + (i % 2) * 0.062;
        if (kind === 'fire') {
          const a = [x, h + 0.15, -0.02],
            b = [x + 0.035, h + rise, -0.08];
          chain(
            mesh,
            [a, [x - 0.03, h + rise * 0.81, 0.01], b],
            [0.097, 0.055, 0.004],
            glow(i % 2 ? '#e8753f' : '#f3b04d', 1.12),
          );
        } else if (kind === 'earth') {
          form(
            x,
            h + 0.13,
            -0.045 + (i % 2) * 0.103,
            [
              [0, 0.09, 0.081],
              [0.124, 0.073, 0.069, x * 0.15],
              [rise - 0.12, 0.02, 0.028, x * 0.43],
            ],
            i % 2 ? '#a2ac9e' : '#797f73',
            5,
          );
        } else {
          const water = kind === 'water';
          const material = water ? clear(i % 2 ? '#7cc1c6' : '#558eac', 0.58) : clear('#c6dbe0', 0.56);
          const start = [x, h + 0.172, 0.08],
            mid = [x - 0.045, h + rise * 0.83, -0.07],
            tip = [x + (water ? 0.09 : 0.17), h + (water ? 0.075 : rise), -0.27 - (i % 2) * 0.085];
          if (water) {
            const end = [tip[0] + 0.08, h - 0.249 - (i % 2) * 0.086, tip[2] + 0.025];
            chain(mesh, [start, mid, tip, end], [0.062, 0.062, 0.045, 0.006], material);
            membrane(mid, [mid[0] + 0.079, mid[1] - 0.096, mid[2] - 0.135], end, material);
          } else chain(mesh, [start, mid, tip], [0.079, 0.069, 0.015], material);
        }
      }
    }
    if (r === 'dragonborn') {
      for (let i = 0; i < 4; i++) {
        const z = 0.14 - i * 0.098;
        spike(mesh, [0, h + 0.21, z], [0, h + 0.31 + i * 0.016, z - 0.12], 0.063, surface);
      }
      for (const s of [-1, 1])
        membrane([s * 0.17, h + 0.17, -0.04], [s * 0.39, h + 0.26, -0.27], [s * 0.19, h - 0.05, -0.14], surface);
    }
    if (['leonin', 'tabaxi', 'bugbear', 'shifter', 'hadozee'].includes(r)) {
      const mane = r === 'leonin';
      const fur = mane ? m.hairColor : shade(c, r === 'tabaxi' ? 0.85 : 0.71);
      if (mane) oval(0, h + 0.036, -0.078, 0.315, 0.292, 0.244, fur);
      for (const s of [-1, 1])
        for (let i = 0; i < (mane ? 6 : 3); i++) {
          const base = [s * (0.09 + i * 0.035), h + 0.236 - i * 0.041, -0.092 - (i % 2) * 0.038];
          spike(
            mesh,
            base,
            [base[0] + s * (mane ? 0.125 : 0.05), base[1] + (i < 2 ? 0.08 : -0.11), base[2] - 0.068],
            mane ? 0.125 : 0.071,
            fur,
          );
        }
    }
    if (r === 'hexblood') {
      for (const s of [-1, 1]) {
        const branch = [s * 0.24, h + 0.32, -0.11];
        chain(
          mesh,
          [[s * 0.103, h + 0.166, 0.044], branch, [s * 0.31, h + 0.49, -0.19]],
          [0.051, 0.038, 0.005],
          '#6e5b48',
        );
        spike(mesh, branch, [s * 0.373, h + 0.41, -0.13], 0.028, '#6e5b48');
      }
    }
    if (r === 'kalashtar' && m.feature === 'aura') {
      const material = { ...clear('#a6e2e2', 0.27), emission: 0.57 };
      for (const s of [-1, 1])
        chain(
          mesh,
          [
            [s * 0.2, h - 0.2, -0.12],
            [s * 0.36, h + 0.04, -0.13],
            [s * 0.17, h + 0.34, -0.029],
          ],
          [0.026, 0.034, 0.005],
          material,
        );
    }
    if (r === 'aasimar' && m.feature === 'halo') {
      const halo = glow('#e5c983', 1.12);
      const points = Array.from({ length: 17 }, (_, i) => [
        0.258 * Math.cos((i * Math.PI) / 8),
        h + 0.38,
        -0.078 + 0.159 * Math.sin((i * Math.PI) / 8),
      ]);
      chain(
        mesh,
        points,
        points.map(() => 0.016),
        halo,
      );
    }
    if (r === 'goliath') {
      for (const [x, y, z] of [
        [-0.1, 0.225, 0.112],
        [0.08, 0.229, -0.041],
        [0.148, 0.136, 0.13],
      ])
        oval(x, h + y, z, 0.073, 0.041, 0.069, '#59616d');
    }
  }
  function cobraHood(mesh, h, skin) {
    const { membrane, rod } = mesh;
    // Fan the ribs outward and back. The backswept hood stays visible at the board camera angle.
    const ribs = [
      [0.255, 0.224, -0.135, -0.16],
      [0.16, 0.486, -0.169, -0.28],
      [-0.024, 0.635, -0.199, -0.42],
      [-0.229, 0.592, -0.223, -0.53],
      [-0.435, 0.425, -0.219, -0.51],
      [-0.59, 0.186, -0.126, -0.25],
    ];
    for (const side of [-1, 1]) {
      const at = (v, u, depth = 0) => {
        const i = Math.min(ribs.length - 2, Math.floor(v)),
          t = v - i;
        const [height, width, center, edge] = ribs[i].map((n, j) => n + (ribs[i + 1][j] - n) * t);
        return [side * width * u, h + height + Math.sin(u * Math.PI) * 0.073, center + (edge - center) * u * u + depth];
      };
      const bands = [shade(skin, 0.81), '#607049', '#788051', '#8f8957', '#b49b61'];
      for (let row = 0; row < ribs.length - 1; row++) {
        for (let col = 0; col < bands.length; col++) {
          const u = col / bands.length,
            v = (col + 1) / bands.length;
          const a = at(row, u),
            b = at(row, v),
            c = at(row + 1, v),
            d = at(row + 1, u);
          membrane(a, b, c, bands[col]);
          membrane(a, c, d, bands[col]);
        }
        rod(at(row, 1), at(row + 1, 1), 0.025, 0.025, '#484c36', 6);
      }
      const diamond = (v, u, dv, du, depth, color) => {
        const a = at(v - dv, u, depth),
          b = at(v, u + du, depth),
          c = at(v + dv, u, depth),
          d = at(v, u - du, depth);
        membrane(a, b, c, color);
        membrane(a, c, d, color);
      };
      for (const depth of [-0.014, 0.014]) {
        for (let row = 0; row < 5; row++) {
          for (const u of [0.32, 0.55, 0.79])
            diamond(row + 0.5, u, 0.26, 0.089, depth, row % 2 ? '#acad71' : '#758451');
        }
      }
      // Ocelli on both sides catch the light in the gallery and overhead views.
      for (const sideOfHood of [-1, 1]) {
        diamond(2.24, 0.68, 0.88, 0.248, sideOfHood * 0.028, '#434b34');
        diamond(2.24, 0.68, 0.64, 0.174, sideOfHood * 0.042, '#d1ae66');
        diamond(2.24, 0.68, 0.34, 0.09, sideOfHood * 0.057, '#706246');
      }
    }
  }
  function wings(mesh, y, skin, fairy) {
    for (const s of [-1, 1]) {
      const root = [s * 0.18, y + 0.035, -0.21],
        wrist = [s * 0.43, y + 0.33, -0.37];
      if (fairy) {
        const upper = [s * 0.67, y + 0.56, -0.35],
          lower = [s * 0.52, y - 0.27, -0.5];
        for (const [tip, corner] of [
          [upper, [s * 0.63, y + 0.12, -0.45]],
          [lower, [s * 0.56, y - 0.13, -0.47]],
        ]) {
          mesh.membrane(root, tip, corner, { ...clear('#a6d7ce', 0.48), emission: 0.33 });
          mesh.membrane(root, corner, [s * 0.3, y - 0.19, -0.28], clear('#87adae', 0.43));
          mesh.rod(root, tip, 0.022, 0.009, skin);
        }
      } else {
        for (let i = 0; i < 7; i++) {
          const t = i / 6,
            base = [s * (0.22 + 0.23 * t), y + 0.08 + 0.2 * t, -0.28 - 0.07 * t],
            tip = [s * (0.31 + 0.41 * t), y - 0.49 + 0.83 * t, -0.39 - 0.11 * t];
          feather(mesh, base, tip, 0.098, shade(skin, 0.72 + t * 0.25));
        }
        mesh.membrane(root, wrist, [s * 0.37, y - 0.37, -0.3], skin);
        chain(mesh, [root, wrist, [s * 0.68, y + 0.32, -0.42]], [0.095, 0.071, 0.013], skin);
      }
    }
  }
  function body(mesh, m, { hipY, chestY, shoulderZ }) {
    const { oval, rod } = mesh,
      r = m.race,
      c = m.skin;
    if (['aarakocra', 'owlin', 'fairy'].includes(r)) wings(mesh, chestY, c, r === 'fairy');
    if (r === 'aasimar' && m.feature === 'wings') wings(mesh, chestY + 0.08, '#e6c98e', true);
    if (r === 'tortle') {
      const y = chestY - 0.22;
      oval(0, y - 0.033, -0.34, 0.57, 0.61, 0.329, '#a79368');
      oval(0, y, -0.365, 0.551, 0.582, 0.333, '#596f50');
      for (const [x, dy, z, w] of [
        [0, 0.04, -0.53, 0.18],
        [0, 0.32, -0.459, 0.129],
        [0, -0.26, -0.48, 0.15],
        [-0.24, 0.13, -0.46, 0.13],
        [0.24, 0.13, -0.46, 0.13],
        [-0.23, -0.15, -0.46, 0.13],
        [0.23, -0.15, -0.46, 0.13],
      ])
        oval(x * 1.24, y + dy, z - 0.13, w * 1.12, 0.157, 0.072, '#73825b');
    }
    if (['tabaxi', 'leonin', 'kobold', 'lizardfolk', 'minotaur', 'satyr', 'harengon', 'tiefling'].includes(r)) {
      const reptile = ['lizardfolk', 'kobold'].includes(r);
      if (r === 'harengon') oval(0, hipY - 0.09, -0.229, 0.125, 0.121, 0.126, shade(c, 1.12));
      else if (r === 'satyr') oval(0, hipY - 0.07, -0.218, 0.072, 0.105, 0.099, c);
      else {
        const tail = [
          [0, hipY - 0.16, -0.15],
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
      const y = hipY - 0.215;
      const coat = '#8e644a';
      oval(0, y, -0.49, 0.39, 0.299, 0.77, coat);
      oval(0, y - 0.01, -0.89, 0.404, 0.32, 0.39, coat);
      oval(0, y + 0.079, 0.051, 0.278, 0.298, 0.292, coat);
      for (const s of [-1, 1])
        for (const z of [0.084, -0.89]) {
          const x = s * 0.243,
            step = s * (z < 0 ? 0.08 : -0.06);
          const foot = [x, 0.222, z + step];
          chain(
            mesh,
            [[x, y, z], [x * 0.99, 0.49, z + (z < 0 ? 0.19 : 0.02) + step], foot],
            [0.151, 0.082, 0.056],
            coat,
          );
          oval(x, 0.204, foot[2] + 0.024, 0.086, 0.068, 0.103, ink);
        }
      chain(
        mesh,
        [
          [0, y + 0.08, -1.08],
          [0, y - 0.02, -1.265],
          [0.09, 0.37, -1.32],
          [0.13, 0.263, -1.28],
        ],
        [0.083, 0.091, 0.066, 0.013],
        m.hairColor,
      );
    }
    if (r === 'thri-kreen') {
      const shell = shade(c, 0.88),
        seam = shade(c, 0.55);
      mesh.form(
        0,
        chestY,
        shoulderZ,
        [
          [-0.47, 0.124, 0.11, 0, -0.089],
          [-0.31, 0.142, 0.112, 0, -0.048],
          [-0.105, 0.185, 0.129],
          [0.083, 0.192, 0.164],
          [0.21, 0.087, 0.091],
        ],
        shell,
        8,
      );
      for (const [i, [y, z, w]] of [
        [chestY - 0.065, 0.025, 0.181],
        [chestY - 0.24, -0.03, 0.144],
        [chestY - 0.401, -0.068, 0.124],
        [hipY - 0.005, -0.19, 0.165],
        [hipY - 0.151, -0.251, 0.169],
        [hipY - 0.269, -0.339, 0.143],
        [hipY - 0.354, -0.4, 0.102],
      ].entries()) {
        oval(0, y, z, w, 0.102, 0.153, i % 2 ? shell : shade(c, 1.08));
        if (i < 3)
          mesh.membrane(
            [-w * 0.8, y - 0.038, z + 0.083],
            [0, y - 0.098, z + 0.158],
            [w * 0.8, y - 0.038, z + 0.083],
            seam,
          );
      }
      for (const s of [-1, 1])
        chain(
          mesh,
          [
            [s * 0.151, chestY + 0.082, shoulderZ - 0.07],
            [s * 0.116, chestY - 0.101, shoulderZ + 0.152],
            [s * 0.073, chestY - 0.404, shoulderZ + 0.122],
          ],
          [0.031, 0.028, 0.021],
          '#76664b',
        );
      for (const s of [-1, 1]) {
        const claw = [s * 0.55, chestY - 0.48, 0.31];
        chain(
          mesh,
          [
            [s * 0.118, chestY - 0.244, -0.047],
            [s * 0.45, chestY - 0.369, -0.137],
            [s * 0.655, chestY - 0.534, 0.02],
            claw,
          ],
          [0.057, 0.062, 0.047, 0.023],
          shade(c, 1.12),
        );
        spike(mesh, claw, [claw[0] - s * 0.08, claw[1] - 0.05, claw[2] + 0.065], 0.035, shade(c, 0.72));
        spike(mesh, claw, [claw[0] + s * 0.028, claw[1] + 0.03, claw[2] + 0.075], 0.03, shade(c, 0.72));
      }
    }
    if (r === 'simic-hybrid')
      for (const s of [-1, 1])
        if (m.feature === 'fins') {
          const root = [s * 0.2, chestY - 0.08, -0.13],
            tip = [s * 0.59, chestY + 0.32, -0.27];
          mesh.membrane(root, tip, [s * 0.51, chestY - 0.19, -0.34], shade(c, 0.81));
          rod(root, tip, 0.073, 0.008, c);
        } else if (m.feature === 'carapace') {
          oval(s * 0.21, chestY - 0.2, -0.245, 0.25, 0.39, 0.147, '#6d6b52');
        } else
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
    if (r === 'plasmoid') {
      mesh.form(
        0,
        0,
        0,
        [
          [0.18, 0.241, 0.2],
          [hipY * 0.71, 0.274, 0.216, -0.05],
          [hipY, 0.282, 0.23, 0.032],
          [chestY, 0.255, 0.21, 0.04],
          [chestY + 0.17, 0.146, 0.131, 0.019],
        ],
        skin(m),
        9,
      );
      oval(-0.087, chestY - 0.29, 0.052, 0.079, 0.078, 0.044, root.MiniatureMesh.metal('#ac8a54'));
      rod([0.091, chestY - 0.61, 0.02], [0.152, chestY - 0.4, 0.04], 0.043, 0.027, '#ded0a7', 5);
      oval(0.103, chestY - 0.52, -0.023, 0.051, 0.054, 0.035, '#61526f');
    }
  }
  function animalMuzzle(mesh, m, h) {
    const { oval, form, rod } = mesh;
    const r = m.race,
      cat = r === 'tabaxi',
      lion = r === 'leonin';
    const fur = m.skin,
      mask = shade(fur, cat ? 1.3 : 1.16);
    const noseZ = cat ? 0.355 : lion ? 0.497 : 0.514;
    const width = cat ? 0.099 : lion ? 0.166 : 0.108;
    rod([0, h - 0.038, 0.185], [0, h - 0.05, noseZ - 0.042], width * 0.84, width * 0.57, mask, 8);
    form(
      0,
      h - 0.137,
      0.213,
      [
        [-0.036, width * 0.71, 0.071, 0, 0.023],
        [0.02, width, 0.105, 0, (noseZ - 0.29) * 0.59],
        [lion ? 0.098 : 0.128, width * 0.77, lion ? 0.107 : 0.074, 0, noseZ - 0.274],
      ],
      mask,
      8,
    );
    oval(0, h - 0.112, noseZ - 0.039, width * 0.62, 0.028, 0.057, shade(fur, 0.58));
    const nose = lion ? '#423335' : '#4d3b3b';
    mesh.membrane(
      [-width * 0.61, h - 0.035, noseZ],
      [width * 0.61, h - 0.035, noseZ],
      [0, h - 0.097, noseZ + 0.017],
      nose,
    );
    oval(0, h - 0.043, noseZ - 0.002, width * 0.53, 0.021, 0.026, nose);
    for (const s of [-1, 1]) {
      mesh.membrane(
        [s * 0.175, h + 0.036, 0.199],
        [s * (width + 0.024), h - 0.085, 0.309],
        [s * 0.084, h - 0.188, 0.239],
        mask,
      );
      if (cat)
        for (const [i, dy] of [-0.036, -0.005, 0.025].entries())
          rod(
            [s * 0.076, h - 0.091, noseZ - 0.016],
            [s * (0.229 + i * 0.028), h - 0.084 + dy, noseZ - 0.048],
            0.009,
            0.002,
            '#eee0c0',
            5,
          );
      if (m.ears === 'auto') {
        if (lion) oval(s * 0.231, h + 0.181, -0.035, 0.092, 0.087, 0.062, fur);
        else {
          const a = [s * 0.095, h + 0.114, 0.021],
            b = [s * 0.224, h + 0.108, -0.033],
            tip = [s * (cat ? 0.258 : 0.274), h + (cat ? 0.385 : 0.318), -0.088];
          mesh.membrane(a, b, tip, fur);
          mesh.membrane(
            [s * 0.138, h + 0.135, 0.031],
            [s * 0.201, h + 0.142, -0.012],
            [tip[0] - 0.008 * s, tip[1] - 0.063, tip[2] + 0.015],
            shade(fur, 0.75),
          );
          rod(a, tip, 0.052, 0.004, fur, 5);
        }
      }
    }
  }
  function face(mesh, m, h, surface) {
    const r = m.race,
      c = m.skin,
      { oval, rod } = mesh,
      auto = m.ears === 'auto',
      light = shade(c, 1.16),
      dark = shade(c, 0.72);
    if (['tabaxi', 'leonin', 'shifter'].includes(r)) animalMuzzle(mesh, m, h);
    if (r === 'bugbear') {
      const bear = r === 'bugbear',
        lion = r === 'leonin';
      for (const s of [-1, 1]) {
        oval(
          s * (lion ? 0.084 : 0.067),
          h - 0.073,
          lion || bear ? 0.275 : 0.246,
          lion ? 0.122 : 0.098,
          0.071,
          lion ? 0.14 : 0.115,
          light,
        );
        if (auto) {
          if (bear || lion) oval(s * 0.216, h + 0.191, -0.027, 0.096, 0.104, 0.051, c);
          else spike(mesh, [s * 0.178, h + 0.155, -0.017], [s * 0.26, h + 0.328, -0.068], 0.091, c);
        }
        if (lion || bear)
          for (let i = 0; i < 4; i++) {
            const a = [s * (0.191 + 0.018 * Math.sin(i)), h + 0.139 - i * 0.087, -0.048];
            spike(mesh, a, [s * (0.353 - i * 0.018), a[1] - 0.136, -0.014], 0.122, m.hairColor);
          }
      }
      oval(0, h - 0.042, lion || bear ? 0.384 : 0.335, lion ? 0.085 : 0.057, 0.034, 0.034, ink);
    }
    if (r === 'tabaxi' && m.feature !== 'plain')
      for (const s of [-1, 1])
        for (let i = 0; i < 4; i++) {
          if (m.feature === 'spots')
            oval(s * (0.12 + 0.043 * (i % 2)), h + 0.105 + i * 0.027, 0.2 - 0.017 * i, 0.027, 0.019, 0.018, dark);
          else
            rod(
              [s * (0.188 + i * 0.011), h + 0.12 + i * 0.025, 0.076],
              [s * (0.115 + i * 0.009), h + 0.097 + i * 0.031, 0.211 - 0.016 * i],
              0.017,
              0.01,
              dark,
              5,
            );
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
      if (auto) for (const s of [-1, 1]) oval(s * 0.326, h + 0.008, -0.022, 0.206, 0.221, 0.076, c);
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
      if (r !== 'minotaur')
        oval(
          0,
          h - 0.096,
          r === 'lizardfolk' ? 0.27 : 0.21,
          wide ? 0.205 : 0.151,
          0.103,
          r === 'kobold' || r === 'lizardfolk' ? 0.185 : 0.144,
          c,
        );
      if (r !== 'minotaur')
        for (const s of [-1, 1])
          oval(s * (wide ? 0.099 : 0.067), h - 0.07, r === 'kobold' ? 0.37 : 0.327, 0.022, 0.016, 0.012, dark);
      if (auto && (r === 'minotaur' || r === 'kobold')) {
        const { rise, sweep } = hornShape(m.hornStyle);
        for (const s of [-1, 1])
          chain(
            mesh,
            [
              [s * 0.172, h + 0.127, -0.021],
              [s * (wide ? 0.332 : 0.241), h + 0.127 + 0.053 * rise, -0.076 * sweep],
              [s * (wide ? 0.405 : 0.274), h + 0.127 + (wide ? 0.176 : 0.137) * rise, -0.01 - 0.16 * (sweep - 1)],
            ],
            [wide ? 0.091 : 0.058, 0.044, 0.004],
            ivory,
          );
      }
      if (r === 'lizardfolk')
        for (let i = 0; i < 4; i++)
          spike(mesh, [0, h + 0.16 - i * 0.079, -0.144], [0, h + 0.32 - i * 0.101, -0.3], 0.068, dark);
      if (r === 'giff') for (const s of [-1, 1]) oval(s * 0.183, h + 0.167, -0.043, 0.069, 0.07, 0.047, c);
      if (r === 'firbolg') oval(0, h - 0.064, 0.354, 0.107, 0.061, 0.044, '#bd8987');
      if (r === 'hadozee') {
        oval(0, h - 0.029, 0.205, 0.194, 0.153, 0.076, '#b99174');
        oval(0, h - 0.116, 0.276, 0.146, 0.081, 0.09, '#936750');
        rod([-0.105, h - 0.137, 0.324], [0.105, h - 0.137, 0.324], 0.018, 0.016, '#5e4439', 7);
        for (const s of [-1, 1]) {
          oval(s * 0.26, h + 0.02, -0.005, 0.092, 0.108, 0.061, '#a88068');
          oval(s * 0.276, h + 0.018, 0.046, 0.054, 0.069, 0.027, '#77564a');
          oval(s * 0.081, h + 0.009, 0.261, 0.059, 0.045, 0.022, '#6b5347');
          oval(s * 0.083, h + 0.009, 0.281, 0.025, 0.026, 0.017, '#30292b');
        }
      }
      if (r === 'minotaur') {
        rod([0, h - 0.033, 0.183], [0, h - 0.073, 0.482], 0.133, 0.102, c, 8);
        mesh.form(
          0,
          h - 0.128,
          0.3,
          [
            [-0.062, 0.133, 0.117, 0, 0.064],
            [0.023, 0.188, 0.181, 0, 0.09],
            [0.106, 0.151, 0.104, 0, 0.138],
          ],
          c,
          8,
        );
        oval(0, h - 0.073, 0.514, 0.148, 0.068, 0.063, '#9a7762');
        for (const s of [-1, 1]) oval(s * 0.079, h - 0.057, 0.564, 0.045, 0.024, 0.023, '#433130');
      }
      if (r === 'minotaur' && ['ring', 'bootsRing'].includes(m.feature))
        chain(
          mesh,
          [
            [-0.054, h - 0.077, 0.55],
            [-0.052, h - 0.147, 0.582],
            [0, h - 0.18, 0.592],
            [0.052, h - 0.147, 0.582],
            [0.054, h - 0.077, 0.55],
          ],
          [0.017, 0.017, 0.017, 0.017, 0.017],
          root.MiniatureMesh.metal('#bd9c51'),
        );
      if (r === 'tortle') spike(mesh, [0, h - 0.066, 0.302], [0, h - 0.143, 0.417], 0.11, '#9e8d5e');
      if (r === 'kobold' || r === 'lizardfolk')
        for (const s of [-1, 1])
          for (let i = 0; i < 3; i++)
            oval(s * (0.121 + i * 0.033), h + 0.077 + i * 0.016, 0.217 - i * 0.037, 0.041, 0.029, 0.022, light);
    }
    if (r === 'dragonborn') {
      oval(0, h - 0.095, 0.28, 0.182, 0.075, 0.226, surface);
      oval(0, h - 0.154, 0.267, 0.159, 0.045, 0.205, surface);
      for (const s of [-1, 1]) {
        oval(s * 0.111, h - 0.061, 0.453, 0.034, 0.018, 0.012, ink);
        oval(s * 0.14, h + 0.035, 0.258, 0.061, 0.043, 0.028, '#cfb26b');
        rod([s * 0.152, h + 0.065, 0.28], [s * 0.153, h + 0.009, 0.28], 0.011, 0.009, ink, 6);
        for (let i = 0; i < 4; i++)
          oval(s * (0.087 + i * 0.042), h + 0.141 - i * 0.015, 0.162 - i * 0.031, 0.055, 0.043, 0.029, surface);
      }
    }
    if (r === 'gnome' || r === 'goblin') {
      const goblin = r === 'goblin';
      oval(0, h - 0.067, 0.267, goblin ? 0.082 : 0.077, goblin ? 0.095 : 0.072, 0.123, c);
      if (!goblin)
        for (const s of [-1, 1]) {
          oval(s * 0.117, h + 0.025, 0.236, 0.061, 0.048, 0.029, '#efe2c7');
          oval(s * 0.117, h + 0.025, 0.261, 0.029, 0.031, 0.012, '#616e81');
        }
      else {
        oval(0, h - 0.153, 0.213, 0.141, 0.047, 0.052, ink);
        for (const x of [-0.079, -0.038, 0.039, 0.079])
          spike(mesh, [x, h - 0.128, 0.247], [x, h - 0.177, 0.27], 0.017, ivory);
      }
    }
    if (r === 'githyanki' || r === 'githzerai') {
      oval(0, h - 0.055, 0.226, 0.034, 0.047, 0.023, c);
      for (const s of [-1, 1])
        oval(s * 0.104, h + 0.026, 0.223, 0.063, 0.04, 0.019, r === 'githyanki' ? '#736441' : '#8c875a');
    }
    if (r === 'locathah') {
      oval(0, h - 0.11, 0.245, 0.196, 0.104, 0.13, light);
      oval(0, h - 0.093, 0.35, 0.132, 0.055, 0.039, ink);
      for (const s of [-1, 1]) {
        oval(s * 0.167, h + 0.072, 0.226, 0.067, 0.06, 0.035, '#dec171');
        oval(s * 0.172, h + 0.068, 0.251, 0.031, 0.039, 0.017, ink);
        for (let i = 0; i < 3; i++)
          rod(
            [s * (0.207 + i * 0.019), h - 0.03, 0.16 - i * 0.041],
            [s * (0.186 + i * 0.025), h - 0.125, 0.174 - i * 0.038],
            0.012,
            0.009,
            dark,
            5,
          );
      }
      mesh.membrane([0, h + 0.197, 0.103], [0, h + 0.386, -0.17], [0, h + 0.075, -0.222], '#ca996e');
    }
    if (r === 'yuan-ti') {
      if (m.feature === 'hood') cobraHood(mesh, h, c);
      mesh.form(
        0,
        h - 0.132,
        0.207,
        [
          [-0.047, 0.108, 0.089],
          [0.041, 0.142, 0.148, 0, 0.025],
          [0.107, 0.087, 0.068, 0, 0.06],
        ],
        shade(c, 1.12),
        8,
      );
      for (const s of [-1, 1]) {
        oval(s * 0.104, h + 0.03, 0.235, 0.069, 0.044, 0.034, '#d7bd5a');
        rod([s * 0.104, h - 0.001, 0.26], [s * 0.104, h + 0.065, 0.263], 0.014, 0.009, ink, 5);
        for (const [i, [x, y, z]] of [
          [0.05, 0.18, 0.183],
          [0.128, 0.174, 0.148],
          [0.177, 0.126, 0.134],
          [0.169, 0.085, 0.199],
          [0.197, 0.022, 0.176],
          [0.157, -0.058, 0.25],
          [0.129, -0.116, 0.276],
        ].entries())
          oval(s * x, h + y, z, 0.043, 0.034, 0.025, i % 2 ? '#a8b47c' : '#5f7850');
      }
    }
    if (r === 'reborn') {
      const seam = [
        [-0.138, h + 0.137, 0.174],
        [-0.106, h + 0.065, 0.225],
        [-0.133, h - 0.126, 0.184],
      ];
      chain(mesh, seam, [0.01, 0.012, 0.009], '#675451');
      oval(-0.176, h - 0.068, 0.169, 0.081, 0.094, 0.047, '#b6998e');
      for (let i = 0; i < 4; i++)
        rod([-0.154, h - 0.073 + i * 0.046, 0.207], [-0.087, h - 0.085 + i * 0.046, 0.226], 0.009, 0.009, '#735950', 5);
    }
    if (r === 'satyr' && auto) {
      const { rise, sweep } = hornShape(m.hornStyle);
      for (const s of [-1, 1])
        chain(
          mesh,
          [
            [s * 0.144, h + 0.15, -0.045],
            [s * 0.23, h + 0.15 + 0.124 * rise, -0.085 * sweep],
            [s * 0.29, h + 0.15 + 0.1 * rise, -0.183 * sweep],
            [s * 0.26, h + 0.15 + 0.017 * rise, -0.209 * sweep],
          ],
          [0.09, 0.073, 0.044, 0.008],
          ivory,
        );
    }
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
    if (r === 'dhampir')
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
          r === 'aasimar' ? glow('#f5d590', 0.98) : r === 'kalashtar' ? glow('#99c7bb', 0.9) : '#d1e3df',
        );
    if (['genasi-fire', 'genasi-air', 'genasi-earth', 'goliath', 'reborn', 'yuan-ti'].includes(r)) {
      const color = {
        'genasi-fire': glow('#ed9b59', 1.04),
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
    if (r === 'genasi-water')
      for (const s of [-1, 1])
        for (let i = 0; i < 3; i++)
          rod(
            [s * 0.16, h - 0.045 - i * 0.038, 0.231 - i * 0.012],
            [s * 0.208, h - 0.022 - i * 0.038, 0.169 - i * 0.012],
            0.013,
            0.01,
            '#4e8695',
            5,
          );
  }
  root.MiniatureAncestries = {
    names,
    appearance,
    hairOptions,
    sizeOptions,
    faceOptions,
    heightRange,
    hornShape,
    ancestries,
    palettes,
    features,
    skin,
    body,
    face,
    leg,
    arm,
    hand,
    hair,
    crown,
    eye,
    sculptedEyes,
    skull: race => heads[race] || [1, 1],
    ear: race => ears[race] || [0.19, 0.235, 0.025],
    animalHead: race => animalHeads.has(race),
  };
})(globalThis);
