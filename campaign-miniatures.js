/* Figuras de campaña. Los parientes comparten una anatomía, y cada familia conserva su silueta. */
(function (root) {
  'use strict';
  const bone = '#e4d3aa',
    dark = '#302d33',
    steel = '#a3b7b7',
    leather = '#694633',
    amber = '#f0bd62';
  const metal = (...args) => root.MiniatureMesh.metal(...args);
  const glow = (color, emission = 0.92) => ({ color, emission });
  const acrylic = { color: '#b1dadd', alpha: 0.34, shine: 50, roughness: 0.14, layered: true, stand: true };
  function stand(m, top, x = 0, z = 0) {
    m.rod([x, 0.18, z], [x, top, z], 0.04, 0.031, acrylic, 8);
  }
  function trail(m, points, radii, color) {
    for (let i = 1; i < points.length; i++) m.rod(points[i - 1], points[i], radii[i - 1], radii[i], color);
  }
  function spike(m, a, b, r, color = bone) {
    m.rod(a, b, r, 0.004, color, 6);
  }
  function eyes(m, x, y, z, spread, r, color = amber) {
    for (const s of [-1, 1]) m.oval(x + s * spread, y, z, r, r * 0.84, r * 0.6, color);
  }
  const uniforms = {
    bandit: {
      outfit: 'cloak',
      gear: 'dagger',
      cloth: '#805547',
      skin: '#ad795c',
      eyewear: 'patch',
      neck: 'scarf',
      accent: '#4d3e3d',
      facing: 22,
    },
    scout: {
      gender: 'woman',
      build: 'slender',
      outfit: 'cloak',
      headwear: 'hood',
      gear: 'bow',
      cloth: '#596f49',
      headColor: '#485840',
      hair: 'braid',
      skin: '#ba8a71',
      facing: 14,
    },
    guard: {
      height: 188,
      build: 'broad',
      outfit: 'armor',
      gear: 'spear',
      offhand: 'shield',
      cloth: '#546b82',
      hair: 'bald',
      skin: '#86604a',
      accent: '#9fb9ba',
      facing: 23,
    },
    cultist: {
      height: 162,
      build: 'slender',
      outfit: 'robe',
      headwear: 'cowl',
      headColor: '#35293f',
      neck: 'skull',
      gear: 'dagger',
      cloth: '#382c43',
      hair: 'bald',
      skin: '#a88f83',
      accent: '#856d81',
      facing: 18,
    },
    druid: {
      gender: 'woman',
      build: 'regular',
      outfit: 'cloak',
      gear: 'staff',
      cloth: '#6d864a',
      hair: 'locs',
      hairColor: '#4a3428',
      skin: '#89624d',
      facing: 25,
    },
    mage: {
      height: 158,
      build: 'slender',
      outfit: 'robe',
      gear: 'staff',
      offhand: 'book',
      cloth: '#62539a',
      skin: '#b18d7c',
      beard: 'short',
      hair: 'bald',
      hairColor: '#d3c8bd',
      facing: 24,
    },
    priest: {
      height: 166,
      build: 'heavy',
      outfit: 'vestments',
      gear: 'book',
      neck: 'holy',
      cloth: '#9a673e',
      accent: '#f0d79d',
      skin: '#8a604e',
      hair: 'curls',
      hairColor: '#b6a79c',
      facing: 18,
    },
    berserker: {
      height: 194,
      build: 'broad',
      outfit: 'tunic',
      gear: 'greataxe',
      cloth: '#bf8469',
      skin: '#bf8469',
      hair: 'locs',
      beard: 'braided',
      hairColor: '#8b422a',
      scar: 'claw',
      facing: 28,
    },
    orc: {
      race: 'orc',
      height: 192,
      build: 'broad',
      outfit: 'leathers',
      gear: 'greataxe',
      cloth: '#704d3c',
      hair: 'crest',
      skin: '#78955d',
      facing: 25,
    },
    hobgoblin: {
      race: 'hobgoblin',
      height: 180,
      build: 'athletic',
      outfit: 'armor',
      gear: 'sword',
      offhand: 'shield',
      cloth: '#934439',
      accent: '#9f4234',
      hair: 'bald',
      skin: '#b56447',
      facing: 18,
    },
  };
  function person(ctx, id, size) {
    const uniform = uniforms[id];
    const cloth = uniform.cloth;
    root.Miniatures.draw(ctx, { ...uniform, pose: id === 'priest' ? 'rest' : 'ready' }, size, (m, head) => {
      if (id === 'bandit')
        m.form(
          0,
          head - 0.184,
          0.046,
          [
            [0, 0.17, 0.189],
            [0.105, 0.241, 0.249],
            [0.132, 0.245, 0.263],
          ],
          '#4d3e3d',
        );
      if (id === 'guard' || id === 'hobgoblin') {
        m.form(
          0,
          head + 0.045,
          0,
          [
            [0, 0.279, 0.248],
            [0.102, 0.282, 0.247],
            [0.204, 0.182, 0.154],
            [0.22, 0.092, 0.082],
          ],
          metal(id === 'hobgoblin' ? '#626369' : steel),
        );
        for (const side of [-1, 1]) m.oval(side * 0.232, head - 0.032, 0.052, 0.047, 0.114, 0.067, metal(steel));
      }
      if (id === 'scout') {
        m.rod([-0.21, 0.93, -0.23], [0.23, head - 0.16, -0.21], 0.082, 0.092, leather, 8);
        for (const x of [0.2, 0.25, 0.31]) {
          m.rod([x, head - 0.19, -0.22], [x + 0.12, head + 0.18, -0.2], 0.011, 0.011, '#b29763');
          m.membrane(
            [x + 0.077, head + 0.06, -0.2],
            [x + 0.17, head + 0.168, -0.2],
            [x + 0.12, head + 0.18, -0.2],
            bone,
          );
        }
      }
      if (id === 'mage')
        m.form(
          0,
          head + 0.127,
          -0.026,
          [
            [0, 0.333, 0.283],
            [0.033, 0.334, 0.283],
            [0.047, 0.235, 0.21],
            [0.201, 0.143, 0.129, -0.028],
            [0.32, 0.012, 0.015, -0.115, -0.06],
          ],
          cloth,
        );
      if (id === 'druid') {
        for (const side of [-1, 1]) {
          const fork = [side * 0.29, head + 0.4, -0.024];
          trail(
            m,
            [[side * 0.18, head + 0.147, -0.02], fork, [side * 0.47, head + 0.54, -0.12]],
            [0.061, 0.046, 0.004],
            leather,
          );
          spike(m, fork, [side * 0.27, head + 0.59, 0.013], 0.034, bone);
          for (const y of [1.39, 1.52, 1.65])
            m.membrane([side * 0.18, y, 0.16], [side * 0.37, y + 0.09, 0.17], [side * 0.24, y - 0.12, 0.24], '#95a853');
        }
        const tip = [0.49, 2.27, 0.27];
        m.rod([0.49, 1.91, 0.25], tip, 0.049, 0.024, leather);
        for (const s of [-1, 1]) {
          const stem = [0.49 + s * 0.11, 2.2 + s * 0.072, 0.28];
          m.rod([0.49, 2.115, 0.27], stem, 0.017, 0.006, '#6d7f49');
          m.membrane(
            stem,
            [stem[0] + s * 0.093, stem[1] + 0.058, 0.29],
            [stem[0] + s * 0.012, stem[1] + 0.095, 0.34],
            '#8da850',
          );
        }
      }
      if (id === 'berserker') {
        m.form(
          0,
          0.83,
          0.03,
          [
            [0, 0.385, 0.225],
            [0.28, 0.32, 0.24],
          ],
          '#684637',
          8,
        );
        for (const side of [-1, 1])
          m.rod([side * 0.105, head - 0.065, 0.219], [side * 0.196, head + 0.004, 0.178], 0.026, 0.017, '#5e3d37');
      }
    });
  }
  const bruteColors = {
    kobold: '#b75a41',
    'winged-kobold': '#bd6c41',
    gnoll: '#ac8050',
    bugbear: '#896342',
    ogre: '#b78b69',
    troll: '#819a61',
    cyclops: '#af8765',
    lizardfolk: '#689051',
    sahuagin: '#559190',
    zombie: '#809185',
    'ogre-zombie': '#88917a',
    ghoul: '#8d9b88',
    nothic: '#586a47',
    wight: '#839690',
    mummy: '#b6a17d',
    vampire: '#c8b7b0',
    minotaur: '#885b3d',
    'hill-giant': '#ad896b',
    ettin: '#a88c74',
  };
  // Shoulder half-width, chest height, head radius and forward hunch.
  const bruteBuild = {
    gnoll: [0.25, 1.38, 0.195, 0.285],
    bugbear: [0.38, 1.34, 0.263, 0.18],
    ogre: [0.45, 1.27, 0.219, 0.1],
    'ogre-zombie': [0.46, 1.22, 0.218, 0.17],
    troll: [0.279, 1.57, 0.215, 0.23],
    cyclops: [0.47, 1.51, 0.37, 0.075],
    lizardfolk: [0.3, 1.35, 0.222, 0.1],
    sahuagin: [0.34, 1.4, 0.245, 0.17],
    minotaur: [0.42, 1.48, 0.255, 0.13],
    'hill-giant': [0.47, 1.45, 0.286, 0.17],
    ettin: [0.48, 1.43, 0.253, 0.094],
    ghoul: [0.242, 0.98, 0.183, 0.325],
    nothic: [0.24, 1.1, 0.222, 0.34],
    wight: [0.335, 1.38, 0.208, 0.06],
  };
  function brute(m, id) {
    const hide = bruteColors[id],
      small = id.includes('kobold'),
      large = ['cyclops', 'ogre', 'ogre-zombie', 'troll', 'bugbear', 'minotaur', 'hill-giant', 'ettin'].includes(id);
    const reptile = small || id === 'lizardfolk',
      fanged = id === 'gnoll',
      fish = id === 'sahuagin',
      potbelly = ['ogre', 'ogre-zombie', 'hill-giant'].includes(id);
    const dead = ['zombie', 'ogre-zombie', 'ghoul', 'mummy', 'wight', 'vampire'].includes(id);
    const [width, chest, faceWidth, headZ] =
      bruteBuild[id] || (small ? [0.225, 1.07, 0.171, 0.109] : [0.29, 1.31, 0.22, 0.109]);
    const head = chest + (small ? 0.29 : id === 'ghoul' ? 0.265 : 0.36);
    const coat =
      id === 'vampire' ? '#593044' : id === 'wight' ? '#53616a' : id === 'mummy' ? hide : dead ? '#65545d' : '#755037';
    const clawed = ['ghoul', 'troll', 'nothic'].includes(id) || reptile || fish;
    const armLength = { bugbear: 0.72, troll: 0.97, ghoul: 0.62, nothic: 0.67 }[id];
    if (id === 'vampire') {
      m.form(
        0,
        0,
        -0.15,
        [
          [0.31, 0.47, 0.21],
          [1.36, 0.33, 0.21],
          [1.71, 0.37, 0.15],
        ],
        coat,
      );
      for (const s of [-1, 1])
        m.membrane([s * 0.12, 1.52, -0.1], [s * 0.38, 1.74, -0.17], [s * 0.33, 1.26, 0.02], '#a14950');
    }
    for (const s of [-1, 1]) {
      const foot = [s * width * 0.83, 0.255, s < 0 ? 0.19 : id === 'zombie' ? -0.34 : -0.13],
        knee = [s * width * 0.9, 0.55, foot[2] + 0.11],
        hip = [s * width * 0.58, chest - 0.44, -0.045];
      trail(m, [hip, knee, foot], [width * 0.49, width * 0.33, width * 0.265], id === 'vampire' ? dark : hide);
      m.oval(foot[0], 0.225, foot[2] + 0.065, width * 0.36, 0.078, 0.17, dead && !clawed ? coat : hide);
      if (id === 'minotaur')
        m.form(
          foot[0],
          0.18,
          foot[2] + 0.06,
          [
            [0, 0.115, 0.14],
            [0.12, 0.095, 0.109],
          ],
          '#383235',
          8,
        );
    }
    m.form(
      0,
      0,
      0,
      [
        [chest - 0.62, width * 0.75, 0.17],
        [chest - 0.41, width * 0.78, 0.2],
        [chest - 0.1, width * 1.08, large ? 0.3 : 0.205],
        [chest + 0.085, width * 0.78, 0.168, 0, 0.042],
      ],
      id === 'wight' ? metal('#4a5057') : id === 'vampire' ? dark : hide,
    );
    if (potbelly) m.oval(0, chest - 0.29, 0.115, width * 1.08, 0.35, width * 0.75, hide);
    if (['gnoll', 'ghoul', 'nothic'].includes(id))
      for (let i = 0; i < 4; i++)
        m.rod(
          [-width * 0.6, chest - 0.15 - i * 0.082, 0.152],
          [width * 0.58, chest - 0.12 - i * 0.082, 0.17],
          0.017,
          0.013,
          id === 'gnoll' ? '#674a3a' : '#b1ad94',
          6,
        );
    m.form(
      0,
      chest - 0.48,
      0,
      [
        [0, width * 0.92, 0.204],
        [0.095, width * 0.86, 0.211],
      ],
      coat,
    );
    for (const s of [-1, 1]) {
      const shoulder = [s * width * 0.94, chest, 0],
        elbow = [s * (width + 0.13), chest - (armLength ? armLength * 0.43 : 0.22), s < 0 ? 0.04 : -0.09];
      const hand = [
        s * (width + 0.19),
        chest - (armLength ? armLength - (s > 0 ? 0.08 : 0) : dead && s > 0 ? 0.13 : 0.44),
        dead ? 0.29 : 0.15,
      ];
      if (id === 'minotaur') {
        hand[0] = s > 0 ? 0.17 : -0.19;
        hand[1] = chest - (s > 0 ? 0.29 : 0.5);
        hand[2] = 0.485;
      }
      trail(m, [shoulder, elbow, hand], [width * 0.45, width * 0.32, width * 0.23], hide);
      m.oval(
        ...shoulder,
        width * 0.48,
        0.14,
        width * 0.48,
        id === 'wight' ? metal('#5d606a') : id === 'bugbear' ? coat : hide,
      );
      m.oval(...hand, 0.082, 0.093, 0.08, hide);
      if (clawed || dead)
        for (const dx of [-0.042, 0.028])
          spike(
            m,
            [hand[0] + dx, hand[1] - 0.026, hand[2] + 0.04],
            [hand[0] + dx, hand[1] - (armLength ? 0.22 : 0.137), hand[2] + 0.11],
            0.025,
            bone,
          );
      if (s === 1 && id === 'minotaur') {
        m.offset(...hand, 1, 1.04);
        root.Miniatures.drawGreataxe(m);
        m.offset(0, 0, 0);
      }
      if (fish) {
        const [x, y, z] = hand;
        const ends = [-0.06, 0.015, 0.063].map((n, i) => [x + n, y - 0.134 + i * 0.018, z + 0.075]);
        for (const end of ends) spike(m, hand, end, 0.026, hide);
        m.membrane(hand, ends[0], ends[2], '#bf825f');
      }
      if (s === 1 && id === 'wight') {
        m.rod(hand, [hand[0] + 0.035, hand[1] + 0.24, hand[2]], 0.032, 0.04, leather);
        const base = [hand[0] + 0.03, hand[1] + 0.17, hand[2]];
        m.rod([base[0] - 0.12, base[1], base[2]], [base[0] + 0.12, base[1], base[2]], 0.03, 0.026, amber);
        spike(m, base, [base[0] + 0.085, base[1] + 0.61, base[2]], 0.068, metal(steel));
      }
      if ((s === 1 && ['ogre', 'cyclops', 'bugbear', 'hill-giant', 'ettin'].includes(id)) || id === 'ettin') {
        const end = [
          hand[0] + s * (id === 'hill-giant' ? 0.48 : 0.18),
          hand[1] + (id === 'hill-giant' ? 0.91 : 0.63),
          hand[2] + 0.06,
        ];
        m.rod(hand, end, 0.047, id === 'hill-giant' ? 0.233 : 0.098, leather);
        const stone = id === 'cyclops';
        m.oval(
          ...end,
          stone ? 0.245 : 0.14,
          stone ? 0.275 : 0.17,
          stone ? 0.19 : 0.12,
          stone ? '#858783' : id === 'bugbear' ? metal('#64666b') : leather,
        );
        if (id === 'bugbear')
          for (const v of [-1, 1])
            spike(m, end, [end[0] + v * 0.21, end[1] + 0.09, end[2] + 0.015], 0.081, metal(steel));
      }
      if (s === 1 && (id === 'kobold' || id === 'lizardfolk' || fish)) {
        const tip = [hand[0] + 0.12, hand[1] + (small ? 0.83 : 0.96), hand[2] + 0.05];
        m.rod([hand[0] - 0.08, 0.22, hand[2]], tip, 0.034, 0.032, leather, 7);
        for (const x of fish ? [-0.102, 0, 0.102] : [0])
          spike(
            m,
            [tip[0] + x, tip[1], tip[2]],
            [tip[0] + x, tip[1] + (x ? 1 : 1.25) * 0.18, tip[2]],
            0.049,
            metal(steel),
          );
        if (fish) m.rod([tip[0] - 0.102, tip[1], tip[2]], [tip[0] + 0.102, tip[1], tip[2]], 0.028, 0.028, metal(steel));
      }
      if (id === 'lizardfolk' && s < 0) {
        m.oval(hand[0] - 0.1, hand[1] + 0.14, hand[2] + 0.12, 0.245, 0.34, 0.105, '#847851');
        m.oval(hand[0] - 0.1, hand[1] + 0.14, hand[2] + 0.194, 0.18, 0.247, 0.065, '#596e50');
      }
      if (id === 'winged-kobold' && s > 0)
        m.oval(hand[0], hand[1] + 0.07, hand[2] + 0.075, 0.112, 0.113, 0.1, '#858279');
      if (id === 'gnoll' && s > 0) {
        const haft = [hand[0] + 0.13, hand[1] + 0.49, hand[2]];
        m.rod(hand, haft, 0.035, 0.035, leather);
        trail(
          m,
          [haft, [haft[0] + 0.18, haft[1] + 0.03, haft[2]], [haft[0] + 0.27, haft[1] - 0.14, haft[2]]],
          [0.019, 0.019, 0.021],
          metal(steel),
        );
        m.oval(haft[0] + 0.27, haft[1] - 0.18, haft[2], 0.1, 0.11, 0.093, metal('#656b6a'));
      }
    }
    m.oval(0, head - 0.19, headZ * 0.64, width * 0.52, 0.2, 0.15, hide);
    m.oval(id === 'ettin' ? 0.2 : 0, head, headZ, faceWidth, small ? 0.195 : 0.237, width * 0.68, hide);
    const face = headZ + width * 0.57;
    if (reptile || fanged || id === 'troll')
      m.oval(0, head - 0.06, face + (fanged ? 0.069 : 0), width * 0.55, 0.091, reptile || fanged ? 0.186 : 0.133, hide);
    if (id === 'cyclops') {
      m.oval(0, head + 0.027, face, 0.101, 0.078, 0.06, bone);
      m.oval(0, head + 0.027, face + 0.053, 0.04, 0.042, 0.02, dark);
    } else if (id !== 'nothic' && !fish)
      eyes(
        m,
        id === 'ettin' ? 0.2 : 0,
        head + 0.027,
        face,
        width * 0.37,
        0.035,
        id === 'wight' ? glow('#84dce9') : dead ? '#e4ca7f' : amber,
      );
    if (fish) {
      m.oval(0, head - 0.047, face + 0.02, 0.203, 0.142, 0.125, '#427c7e');
      m.oval(0, head - 0.055, face + 0.102, 0.148, 0.078, 0.056, '#432f37');
      eyes(m, 0, head + 0.09, face + 0.075, 0.168, 0.045, '#f2ba68');
      for (const x of [-0.12, -0.065, 0, 0.065, 0.12])
        spike(m, [x, head - 0.013, face + 0.147], [x, head - 0.07, face + 0.154], 0.022, bone);
      for (const s of [-1, 1]) {
        m.membrane(
          [s * 0.13, head + 0.1, headZ],
          [s * 0.42, head + 0.23, headZ - 0.14],
          [s * 0.2, head - 0.11, face],
          '#bf825f',
        );
        m.membrane(
          [s * 0.31, chest - 0.02, 0],
          [s * 0.61, chest + 0.01, -0.15],
          [s * 0.49, chest - 0.31, 0.07],
          '#bf825f',
        );
      }
    }
    if (id === 'bugbear')
      for (const s of [-1, 1]) {
        m.oval(s * 0.195, head + 0.133, headZ - 0.063, 0.077, 0.087, 0.049, '#684937');
        spike(m, [s * 0.17, head - 0.073, face], [s * 0.27, head - 0.216, face - 0.057], 0.085, '#684937');
        m.oval(0, head - 0.064, face + 0.052, 0.14, 0.077, 0.105, '#a78362');
      }
    if (id === 'gnoll') {
      // Broad, sloped hyena muzzle with a short dark nose and raised cheekbones.
      m.oval(0, head - 0.059, face + 0.103, 0.143, 0.101, 0.155, '#76543c');
      m.oval(0, head - 0.094, face + 0.21, 0.098, 0.055, 0.095, '#583e37');
      m.oval(0, head - 0.038, face + 0.253, 0.059, 0.034, 0.028, dark);
      for (let i = 0; i < 8; i++) {
        const y = head + 0.13 - i * 0.107,
          z = headZ - 0.105 - i * 0.03;
        spike(
          m,
          [0, y, z],
          [i % 2 ? 0.039 : -0.032, y + 0.064 + (i === 0 ? 0.05 : 0), z - 0.21],
          0.082 - i * 0.006,
          '#4a352e',
        );
      }
      for (const s of [-1, 1])
        for (const [x, y, z] of [
          [0.093, head + 0.18, headZ + 0.082],
          [0.157, head + 0.139, headZ + 0.031],
          [0.199, head + 0.026, headZ + 0.072],
          [0.178, head - 0.05, headZ + 0.152],
          [0.103, chest + 0.062, 0.184],
          [0.18, chest + 0.026, 0.183],
          [0.222, chest - 0.061, 0.186],
          [0.132, chest - 0.14, 0.218],
          [0.204, chest - 0.23, 0.189],
          [0.27, chest - 0.115, 0.121],
          [0.12, chest - 0.29, 0.192],
          [0.225, chest - 0.039, -0.103],
          [0.186, chest - 0.147, -0.146],
        ])
          m.oval(s * x, y, z, 0.034, 0.026, 0.025, '#604135');
    }
    for (const s of [-1, 1]) {
      if (fanged) {
        m.oval(s * 0.148, head + 0.159, headZ - 0.08, 0.076, 0.114, 0.052, '#9c6d4e');
        m.oval(s * 0.151, head + 0.167, headZ - 0.042, 0.045, 0.073, 0.022, '#634239');
      } else if (reptile || id === 'troll')
        spike(
          m,
          [s * width * 0.58, head + 0.064, 0.042],
          [s * width * (fanged ? 1.0 : 0.87), head + 0.26, -0.062],
          0.082,
          small ? bone : hide,
        );
      if (fanged || id === 'ghoul' || id === 'vampire')
        spike(
          m,
          [s * 0.081, head - 0.053, face + (fanged ? 0.101 : 0)],
          [s * 0.088, head - 0.15, face + (fanged ? 0.118 : 0.035)],
          0.026,
        );
    }
    if (id === 'troll') {
      spike(m, [0, head + 0.025, face + 0.02], [0, head - 0.158, face + 0.159], 0.09, hide);
      for (const s of [-1, 1])
        m.rod([s * 0.077, head + 0.07, face], [s * 0.185, head + 0.09, face - 0.041], 0.047, 0.054, '#607847');
      for (const x of [-0.17, -0.09, 0.02, 0.11, 0.19])
        spike(m, [x, head + 0.148, headZ - 0.115], [x * 1.45, head - 0.2 + Math.abs(x), -0.035], 0.071, '#48543b');
    }
    if (id === 'minotaur') {
      m.oval(0, head - 0.07, face, 0.23, 0.125, 0.155, hide);
      trail(
        m,
        [
          [-0.046, head - 0.08, face + 0.151],
          [-0.047, head - 0.145, face + 0.165],
          [0, head - 0.184, face + 0.17],
          [0.047, head - 0.145, face + 0.165],
          [0.046, head - 0.08, face + 0.151],
        ],
        [0.015, 0.015, 0.015, 0.015, 0.015],
        metal('#b28b45'),
      );
      for (const sign of [-1, 1])
        trail(
          m,
          [
            [sign * 0.19, head + 0.105, 0.02],
            [sign * 0.35, head + 0.145, 0.01],
            [sign * 0.44, head + 0.31, 0.09],
          ],
          [0.097, 0.067, 0.005],
          bone,
        );
    }
    if (id === 'ettin') {
      m.oval(-0.29, head - 0.034, 0.105, 0.208, 0.224, 0.19, hide);
      eyes(m, -0.29, head - 0.004, 0.28, 0.079, 0.034, amber);
      m.form(
        -0.29,
        head + 0.1,
        0.09,
        [
          [0, 0.207, 0.214],
          [0.16, 0.173, 0.154],
          [0.23, 0.079, 0.068],
        ],
        metal('#6f6763'),
        8,
      );
      m.oval(0.2, head - 0.082, face + 0.071, 0.091, 0.04, 0.029, '#5c3c36');
    }
    if (id === 'ghoul') {
      m.oval(0, head - 0.068, face + 0.105, 0.114, 0.05, 0.087, '#453c3c');
      trail(
        m,
        [
          [0, head - 0.09, face + 0.163],
          [-0.051, head - 0.17, face + 0.22],
          [-0.035, head - 0.285, face + 0.19],
        ],
        [0.04, 0.032, 0.005],
        '#ac6e7c',
      );
    }
    if (id === 'wight') {
      const crown = metal('#7b7466');
      m.form(
        0,
        head + 0.088,
        headZ,
        [
          [0, 0.209, 0.208],
          [0.082, 0.215, 0.2],
          [0.155, 0.19, 0.19],
        ],
        metal('#494e56'),
        8,
      );
      for (const x of [-0.16, 0, 0.16]) spike(m, [x, head + 0.122, face - 0.02], [x, head + 0.25, face], 0.049, crown);
    }
    if (reptile)
      trail(
        m,
        [
          [0, chest - 0.43, -0.102],
          [-0.14, 0.48, -0.48],
          [-0.35, 0.3, -0.71],
          [-0.54, 0.35, -0.77],
        ],
        [0.143, 0.09, 0.047, 0.004],
        hide,
      );
    if (id === 'winged-kobold')
      for (const s of [-1, 1]) {
        const joint = [s * 0.38, 1.58, -0.24];
        for (const tip of [
          [s * 0.71, 1.74, -0.33],
          [s * 0.65, 1.36, -0.5],
          [s * 0.47, 1.21, -0.51],
        ]) {
          m.membrane([s * 0.11, 1.09, -0.16], joint, tip, '#d69a6b');
          m.rod(joint, tip, 0.024, 0.006, hide);
        }
      }
    if (id === 'sahuagin' || id === 'lizardfolk')
      for (let i = 0; i < 4; i++)
        spike(
          m,
          [0, head + 0.12 - i * 0.147, -0.032],
          [0, head + 0.23 - i * 0.147, -0.19],
          0.076,
          id === 'sahuagin' ? '#d99975' : amber,
        );
    if (id === 'bugbear')
      for (let i = -2; i <= 2; i++)
        spike(
          m,
          [i * 0.068, chest + 0.13, -0.11],
          [i * 0.093, chest + 0.37 - Math.abs(i) * 0.035, -0.17],
          0.09,
          '#533f36',
        );
    if (potbelly || id === 'zombie' || id === 'ogre-zombie')
      for (const s of [-1, 1]) {
        m.membrane(
          [s * width * 0.76, chest - 0.41, 0.13],
          [s * width * 0.53, chest - 0.78, 0.186],
          [s * width * 0.27, chest - 0.48, 0.35],
          coat,
        );
        m.membrane(
          [s * width * 0.37, chest - 0.41, 0.29],
          [s * width * 0.22, chest - 0.72, 0.29],
          [s * 0.039, chest - 0.5, 0.41],
          '#86614a',
        );
      }
    if (id === 'mummy')
      for (const [y, w, d, z] of [
        [head + 0.09, width * 0.744, 0.2, 0.112],
        [head - 0.075, width * 0.73, 0.19, 0.113],
        [chest - 0.04, width * 1.06, 0.219, 0.016],
        [chest - 0.27, width * 0.92, 0.222, 0.012],
      ])
        m.form(
          0,
          y,
          z,
          [
            [0, w, d],
            [0.047, w * 0.985, d],
          ],
          '#e1cda3',
        );
    if (id === 'mummy') {
      eyes(m, 0, head + 0.027, face + 0.051, 0.107, 0.036, glow('#f4bb6c'));
      for (const s of [-1, 1])
        m.membrane(
          [s * 0.26, chest - 0.29, -0.07],
          [s * 0.52, chest - 0.56, -0.18],
          [s * 0.46, chest - 0.75, -0.23],
          '#dcc599',
        );
    }
    if (id === 'zombie' || id === 'ogre-zombie') {
      m.oval(-width * 0.31, chest - 0.13, 0.184, 0.081, 0.106, 0.061, '#814843');
      if (id === 'ogre-zombie')
        for (const [x, y, z] of [
          [0.23, chest - 0.31, 0.398],
          [-0.15, chest - 0.2, 0.443],
          [0.43, chest - 0.49, 0.19],
        ])
          m.oval(x, y, z, 0.075, 0.105, 0.023, '#786354');
    }
  }
  function spirit(m, id) {
    const ghost = id === 'ghost';
    const mist = ghost ? { color: '#9bced3', alpha: 0.62, emission: 0.32 } : '#5b6278',
      shade = ghost ? { color: '#48858e', alpha: 0.61, emission: 0.18 } : '#343647';
    if (id === 'wisp') {
      stand(m, 0.39, 0, 0.03);
      m.oval(0, 0.478, 0.045, 0.3, 0.253, 0.295, { ...glow('#91e6d8', 0.8), alpha: 0.3, layered: true });
      m.oval(0, 0.478, 0.045, 0.271, 0.224, 0.272, glow('#8cddd2', 1.12));
      m.oval(0, 0.505, 0.201, 0.158, 0.139, 0.135, glow('#fff4c4', 1.35));
      return;
    }
    if (ghost) {
      m.oval(0, 0.189, 0.026, 0.35, 0.006, 0.28, { color: '#5faeaf', alpha: 0.46, emission: 0.55 });
      m.oval(0, 0.197, 0.015, 0.21, 0.006, 0.158, { color: '#9ce3df', alpha: 0.52, emission: 0.72 });
      m.offset(0, 0.135, 0);
    }
    m.form(
      0,
      0,
      0,
      [
        [0.2, 0.015, 0.017, -0.42, -0.11],
        [0.43, 0.107, 0.095, -0.23, 0.01],
        [0.73, 0.219, 0.148, 0.072, -0.018],
        [1.05, 0.26, 0.17, 0.055, -0.045],
        [1.35, 0.325, 0.198, 0, 0.006],
        [1.5, 0.216, 0.136, 0, 0.02],
      ],
      ghost ? { ...mist, fadeBelow: 0.9, fadeFloor: 0.13 } : mist,
    );
    m.form(
      0,
      1.54,
      0.067,
      [
        [-0.12, 0.164, 0.124],
        [0.018, 0.235, 0.206],
        [0.243, 0.251, 0.184, 0, -0.025],
        [0.41, 0.075, 0.089, -0.06, -0.105],
        [0.49, 0.006, 0.007, -0.147, -0.169],
      ],
      mist,
    );
    m.oval(0, 1.677, 0.238, 0.154, 0.17, 0.057, shade);
    eyes(m, 0, 1.68, 0.289, 0.071, 0.035, ghost ? { ...glow('#d4ffff', 1.15), alpha: 0.85 } : glow('#ceefb5'));
    for (const s of [-1, 1]) {
      const hand = [s * (s < 0 ? 0.57 : 0.675), s < 0 ? 1.25 : 1.59, 0.25];
      trail(m, [[s * 0.24, 1.35, 0], [s * 0.47, 1.21, 0.055], hand], [0.14, 0.096, 0.044], mist);
      const sleeve = [s * 0.46, 1.23, 0.13],
        fold = [s * 0.34, 0.95, 0.04];
      m.membrane(sleeve, hand, fold, shade);
      m.membrane(fold, hand, [s * 0.57, s < 0 ? 0.71 : 0.98, 0], mist);
      for (const dx of [-0.035, 0, 0.035])
        spike(m, [hand[0] + dx, hand[1], hand[2]], [hand[0] + dx + s * 0.034, hand[1] + 0.093, 0.32], 0.022, mist);
      const seam = [s * 0.18, 1.38, 0.19],
        waist = [s * 0.13, 1.01, 0.122];
      m.membrane(seam, [s * 0.286, 1.29, 0.12], waist, shade);
      m.membrane(waist, [s * 0.16 + 0.08, 0.74, 0.116], [s * 0.29 - 0.12, 0.43, 0.085], mist);
    }
  }
  // Ancho y largo del tronco, altura de la cruz, altura del cráneo y largo del hocico.
  const beasts = {
    wolf: [0.24, 0.55, 0.82, 1.13, 0.23, '#968371'],
    hyena: [0.27, 0.52, 0.85, 1.06, 0.23, '#ba945f'],
    bear: [0.4, 0.55, 0.9, 1.08, 0.145, '#895f46'],
    boar: [0.32, 0.49, 0.72, 0.88, 0.235, '#825e45'],
    rat: [0.262, 0.39, 0.56, 0.73, 0.15, '#967d73'],
    cat: [0.201, 0.57, 0.72, 1.03, 0.1, '#bd9357'],
    'manticore-body': [0.31, 0.59, 0.85, 1.09, 0.11, '#b0814f'],
    elk: [0.245, 0.53, 0.95, 1.44, 0.22, '#987152'],
    goat: [0.23, 0.42, 0.77, 1.16, 0.14, '#bbad96'],
    horse: [0.245, 0.54, 0.95, 1.44, 0.22, '#a07c53'],
    'griffon-body': [0.26, 0.55, 0.82, 1.13, 0.1, '#a58354'],
    owlbear: [0.39, 0.56, 1.0, 1.43, 0.1, '#93704c'],
    lizard: [0.245, 0.54, 0.49, 0.59, 0.26, '#72965a'],
    crocodile: [0.28, 0.63, 0.46, 0.5, 0.37, '#617e56'],
    toad: [0.37, 0.38, 0.5, 0.66, 0.19, '#899553'],
  };
  function beast(m, id, variant, hybrid = false) {
    const [w, long, withers, headY, snout, baseFur] = beasts[id],
      rat = id === 'rat',
      wolf = id === 'wolf',
      low = ['lizard', 'crocodile', 'toad'].includes(id);
    const fur = id === 'horse' ? '#939095' : variant === 'black' ? '#493c37' : variant === 'frog' ? '#7b9751' : baseFur;
    const cat = id === 'cat';
    const hyena = id === 'hyena';
    const faceZ = long * 0.97,
      headWidth = id === 'owlbear' ? w * 0.98 : id === 'toad' ? w : w * 0.75;
    m.oval(0, withers - (hyena ? 0.15 : 0.06), -0.02, w, low ? w * 0.7 : w * 0.99, long, fur);
    m.oval(0, withers, long * 0.57, w * 0.9, w * 1.08, w, fur);
    if (wolf) {
      m.oval(0, withers + 0.107, 0.215, 0.235, 0.176, 0.354, '#665449');
      m.oval(0, withers + 0.02, 0.427, 0.182, 0.258, 0.154, '#c5b393');
      for (const side of [-1, 1]) {
        const shoulder = [side * 0.15, 0.99, 0.336];
        m.membrane(shoulder, [side * 0.253, 0.88, 0.316], [side * 0.205, 0.767, 0.09], '#665449');
        m.membrane(shoulder, [side * 0.222, 1.04, 0.224], [side * 0.253, 0.88, 0.316], fur);
      }
    }
    trail(
      m,
      [
        [0, withers - 0.02, long * 0.45],
        [0, headY - 0.09, faceZ],
      ],
      [w * 0.8, headWidth * 0.79],
      fur,
    );
    for (const s of [-1, 1])
      for (const front of [-1, 1]) {
        const z = front * long * 0.63,
          step = s * front * 0.09,
          x = s * w * 0.72;
        const hip = [x, withers - (hyena && front < 0 ? 0.22 : 0.055), z],
          knee = [s * w * (low ? 1.55 : 1), 0.34 + (withers - 0.48) * 0.43, z + (front < 0 ? 0.14 : -0.045) + step];
        const paw = [s * w * (low ? 1.56 : 1.02), 0.233, z + step];
        trail(m, [hip, knee, paw], [w * (front < 0 ? 0.56 : 0.41), w * 0.28, w * 0.22], fur);
        m.oval(
          paw[0],
          0.211,
          paw[2] + 0.046,
          w * (id === 'owlbear' ? 0.44 : 0.32),
          0.054,
          w * 0.47,
          wolf ? '#c5b393' : fur,
        );
        if (id === 'horse' && front < 0)
          m.form(
            paw[0],
            0.185,
            paw[2] + 0.055,
            [
              [0, 0.102, 0.15],
              [0.123, 0.082, 0.099],
            ],
            '#47403e',
            8,
          );
        if (id === 'owlbear' || (hybrid && front > 0))
          for (const dx of [-0.071, 0, 0.071])
            spike(m, [paw[0] + dx, 0.228, paw[2] + 0.145], [paw[0] + dx, 0.184, paw[2] + 0.235], 0.025, bone);
        if (wolf)
          for (const dx of [-0.036, 0, 0.036])
            spike(m, [paw[0] + dx, 0.214, paw[2] + 0.135], [paw[0] + dx, 0.198, paw[2] + 0.171], 0.016, dark);
      }
    if (id === 'horse') {
      for (const s of [-1, 1])
        for (const [x, y, z, r] of [
          [0.112, 0.947, -0.396, 0.057],
          [0.161, 0.929, -0.276, 0.042],
          [0.205, 0.875, -0.349, 0.046],
          [0.079, 0.975, -0.181, 0.038],
          [0.21, 0.835, -0.188, 0.046],
          [0.12, 0.941, -0.469, 0.041],
          [0.192, 0.879, -0.068, 0.032],
          [0.142, 0.937, 0.025, 0.036],
        ])
          m.oval(s * x, y, z, r, r * 0.52, r * 0.78, '#bcb7b6');
    }
    if (hybrid) return;
    m.oval(0, headY, faceZ, headWidth, headWidth * (low ? 0.65 : 0.91), headWidth * 0.91, fur);
    if (id === 'owlbear') {
      m.oval(0, headY - 0.02, faceZ + 0.073, 0.426, 0.391, 0.289, '#a48459');
      m.oval(0, headY + 0.026, faceZ + 0.269, 0.363, 0.321, 0.132, '#ddc69c');
      for (const s of [-1, 1]) {
        m.oval(s * 0.156, headY + 0.047, faceZ + 0.359, 0.166, 0.164, 0.071, '#f0dfb6');
        const ear = [s * 0.229, headY + 0.231, faceZ + 0.052];
        spike(m, ear, [s * 0.364, headY + 0.435, faceZ - 0.163], 0.123, '#856240');
        for (let i = 0; i < 5; i++) {
          const a = [s * (0.228 + i * 0.022), headY + 0.267 - i * 0.08, faceZ + 0.198 - i * 0.023];
          flightFeather(m, a, [a[0] + s * 0.151, a[1] - 0.131, a[2] - 0.164], 0.076, i % 2 ? '#b29061' : '#9c784e');
        }
      }
      eyes(m, 0, headY + 0.067, faceZ + 0.42, 0.151, 0.113, '#e6a644');
      eyes(m, 0, headY + 0.076, faceZ + 0.469, 0.151, 0.061, '#2f2628');
      eyes(m, -0.028, headY + 0.115, faceZ + 0.503, 0.151, 0.022, '#f3ddb0');
      trail(
        m,
        [
          [0, headY + 0.022, faceZ + 0.366],
          [0, headY - 0.032, faceZ + 0.545],
          [0, headY - 0.19, faceZ + 0.587],
        ],
        [0.122, 0.092, 0.006],
        '#573d32',
      );
      for (const s of [-1, 1])
        for (const [x, y] of [
          [0.07, 0.98],
          [0.17, 0.94],
          [0.27, 0.9],
          [0.105, 0.81],
        ])
          flightFeather(m, [s * x, y + 0.105, 0.337], [s * (x + 0.11), y - 0.12, 0.479], 0.079, '#c3a171');
      for (const s of [-1, 1])
        for (const [i, z] of [0.41, 0.24, 0.067, -0.104].entries())
          flightFeather(
            m,
            [s * 0.126, 1.244 - i * 0.031, z],
            [s * 0.402, 1.12 - i * 0.048, z - 0.172],
            0.097,
            i % 2 ? '#937050' : '#c39e67',
          );
    } else if (id === 'crocodile') {
      m.form(
        0,
        headY - 0.105,
        faceZ + 0.24,
        [
          [0, 0.125, 0.36],
          [0.068, 0.147, 0.405],
        ],
        '#384b37',
        8,
      );
      m.form(
        0,
        headY,
        faceZ + 0.22,
        [
          [0, 0.115, 0.405],
          [0.08, 0.154, 0.386],
          [0.123, 0.119, 0.346],
        ],
        fur,
        8,
      );
      eyes(m, 0, headY + 0.15, faceZ - 0.051, 0.136, 0.04, amber);
      for (const s of [-1, 1])
        for (let i = 0; i < 6; i++)
          spike(
            m,
            [s * (0.11 + 0.025 * Math.sin(i)), headY + 0.01, faceZ + 0.064 + i * 0.086],
            [s * 0.125, headY - 0.061, faceZ + 0.087 + i * 0.086],
            0.022,
            bone,
          );
    } else {
      const muzzle = faceZ + headWidth * 0.53;
      m.oval(
        0,
        headY - 0.048,
        muzzle + snout * (cat ? 0.29 : 0.53),
        headWidth * (cat ? 0.81 : 0.69),
        headWidth * (low ? 0.31 : 0.47),
        cat ? 0.055 : snout,
        fur,
      );
      eyes(
        m,
        0,
        headY + (low ? 0.063 : 0.047),
        faceZ + headWidth * 0.69,
        headWidth * 0.67,
        wolf ? 0.045 : 0.034,
        wolf ? '#ffe173' : dark,
      );
      if (wolf) {
        m.oval(0, headY - 0.117, muzzle + snout * 0.53, 0.109, 0.044, 0.192, '#c9b396');
        for (const side of [-1, 1]) {
          const jaw = [side * 0.099, headY - 0.085, muzzle + 0.155];
          m.rod([side * 0.12, headY - 0.1, muzzle - 0.012], jaw, 0.021, 0.014, dark);
          spike(m, jaw, [jaw[0], jaw[1] - 0.045, jaw[2] + 0.013], 0.014, bone);
        }
      }
      if (!low)
        m.oval(
          0,
          headY - 0.023,
          muzzle + snout * (cat ? 0.76 : 1.39),
          headWidth * 0.34,
          0.035,
          0.043,
          rat || cat ? '#a96b6b' : dark,
        );
      for (const s of [-1, 1]) {
        if (rat || id === 'bear')
          m.oval(
            s * headWidth * 0.81,
            headY + headWidth * 0.78,
            faceZ - 0.041,
            rat ? 0.105 : 0.081,
            rat ? 0.117 : 0.079,
            0.046,
            rat ? '#c99a91' : fur,
          );
        else if (!low)
          spike(
            m,
            [s * headWidth * 0.64, headY + headWidth * 0.49, faceZ - 0.065],
            [s * headWidth * 0.98, headY + headWidth * 1.37, faceZ - 0.09],
            headWidth * 0.36,
            fur,
          );
        if (id === 'boar')
          spike(m, [s * 0.115, headY - 0.091, muzzle + 0.21], [s * 0.17, headY + 0.06, muzzle + 0.25], 0.038);
        if (id === 'elk' || id === 'goat') {
          const elk = id === 'elk';
          const mid = [s * (elk ? 0.31 : 0.15), headY + (elk ? 0.37 : 0.31), faceZ - (elk ? 0.13 : 0.2)];
          trail(
            m,
            [
              [s * 0.12, headY + 0.1, faceZ - 0.05],
              mid,
              [s * (elk ? 0.53 : 0.18), headY + (elk ? 0.7 : 0.275), faceZ - (elk ? 0.28 : 0.46)],
            ],
            [0.069, 0.043, 0.004],
            bone,
          );
          if (elk) {
            spike(m, mid, [s * 0.33, headY + 0.61, faceZ + 0.025], 0.047);
            spike(m, [s * 0.42, headY + 0.52, faceZ - 0.19], [s * 0.63, headY + 0.65, faceZ - 0.11], 0.043);
          }
        }
      }
    }
    if (cat)
      trail(
        m,
        [
          [0, 0.66, -0.43],
          [-0.045, 0.91, -0.64],
          [-0.16, 1.15, -0.77],
          [-0.265, 1.25, -0.63],
          [-0.27, 1.23, -0.48],
        ],
        [0.068, 0.059, 0.048, 0.038, 0.016],
        fur,
      );
    if (id === 'goat') {
      spike(m, [0, headY - 0.075, faceZ + 0.145], [0, headY - 0.37, faceZ + 0.17], 0.089, '#d1c6a9');
      for (const s of [-1, 1])
        for (const z of [-0.2, -0.01, 0.18])
          m.membrane([s * 0.161, 0.87, z - 0.12], [s * 0.283, 0.49, z + 0.04], [s * 0.243, 0.76, z + 0.16], '#a1927d');
    }
    if (id === 'toad')
      for (const s of [-1, 1]) {
        m.oval(s * 0.24, headY + 0.14, faceZ, 0.112, 0.105, 0.092, fur);
        eyes(m, 0, headY + 0.16, faceZ + 0.077, 0.24, 0.041, amber);
      }
    else if (['wolf', 'hyena', 'rat', 'lizard', 'crocodile'].includes(id)) {
      const bushy = id === 'wolf' || id === 'hyena',
        tailColor = rat ? '#bc8f87' : fur;
      trail(
        m,
        [
          [0, withers - 0.02, -long * 0.78],
          [-0.09, withers - 0.11, -long - 0.17],
          [-0.31, rat ? 0.28 : withers - 0.16, -long - 0.33],
          [-0.54, rat ? 0.29 : withers + 0.01, -long - 0.34],
        ],
        [
          id === 'crocodile' ? 0.222 : low ? 0.15 : bushy ? 0.113 : 0.047,
          id === 'crocodile' ? 0.13 : bushy ? 0.13 : 0.062,
          bushy ? 0.091 : 0.036,
          0.009,
        ],
        tailColor,
      );
    }
    if (['hyena', 'boar', 'crocodile'].includes(id))
      for (let i = 0; i < 6; i++)
        spike(
          m,
          [0, withers + w * 0.7, -long * 0.62 + i * long * 0.22],
          [0, withers + w * 1.01, -long * 0.67 + i * long * 0.22],
          0.06,
          id === 'crocodile' ? '#91a46c' : '#614638',
        );
    if (hyena || id === 'crocodile')
      for (const s of [-1, 1])
        for (let i = 0; i < 5; i++) {
          const z = -long * 0.57 + i * long * 0.24;
          m.oval(
            s * (hyena ? w * (0.72 + (i % 2) * 0.18) : 0.13),
            (hyena ? 0.76 : 0.55) + (i % 2) * 0.045,
            z,
            hyena ? 0.034 : 0.068,
            0.037,
            0.048,
            hyena ? '#6f5340' : '#8fa06c',
          );
        }
  }
  function serpent(m, id, variant) {
    const pts = [];
    for (let i = 0; i <= 21; i++) {
      const a = i * 0.41;
      pts.push([Math.sin(a) * (0.47 - i * 0.008), 0.251 + i * 0.014, Math.cos(a) * (0.44 - i * 0.009)]);
    }
    const tail = pts.map((_, i) => 0.028 + Math.min(i, 7) * 0.014);
    pts.push([0.18, 0.81, -0.12], [-0.12, 1.09, 0.09], [-0.19, 1.19, 0.31]);
    tail.push(0.126, 0.096, 0.079);
    const hide = variant === 'poisonous' ? '#a36c4d' : variant === 'constrictor' ? '#737c48' : '#658356';
    trail(
      m,
      pts,
      tail.map(r => r * (variant === 'constrictor' ? 1.23 : 1)),
      hide,
    );
    m.oval(-0.19, 1.18, 0.37, 0.136, 0.09, 0.16, '#7f9c61');
    eyes(m, -0.19, 1.21, 0.459, 0.091, 0.027, amber);
    spike(m, [-0.19, 1.16, 0.51], [-0.17, 1.135, 0.67], 0.018, '#b66a63');
  }
  function arthropod(m, id) {
    const spider = id.includes('spider'),
      scorpion = id === 'scorpion',
      rust = id === 'rust-monster',
      many = id === 'centipede';
    if (rust) {
      const shell = '#b17448';
      m.oval(0, 0.37, -0.18, 0.268, 0.145, 0.42, '#5c526d');
      for (let i = 0; i < 6; i++)
        m.oval(
          0,
          0.47 - i * 0.017,
          -0.42 + i * 0.122,
          0.24 - Math.abs(i - 2) * 0.024,
          0.145,
          0.089,
          i % 2 ? shell : '#c6874e',
        );
      m.oval(0, 0.4, 0.36, 0.167, 0.133, 0.18, shell);
      eyes(m, 0, 0.447, 0.513, 0.093, 0.033, dark);
      for (const s of [-1, 1]) {
        for (const z of [-0.29, 0.22])
          trail(
            m,
            [
              [s * 0.14, 0.34, z],
              [s * 0.29, 0.28, z + 0.061],
              [s * 0.34, 0.184, z + 0.154],
            ],
            [0.07, 0.054, 0.022],
            '#755365',
          );
        const end = [s * 0.39, 0.59, 0.8];
        trail(m, [[s * 0.071, 0.438, 0.45], [s * 0.23, 0.63, 0.609], end], [0.037, 0.028, 0.017], '#c89a64');
        for (let i = 0; i < 4; i++)
          spike(
            m,
            [end[0] - s * i * 0.035, end[1] + i * 0.013, end[2] - i * 0.044],
            [end[0] + s * (0.09 - i * 0.034), end[1] + 0.05, end[2] - i * 0.031],
            0.025,
            '#e5ba80',
          );
      }
      trail(
        m,
        [
          [0, 0.38, -0.44],
          [-0.1, 0.42, -0.68],
          [-0.26, 0.53, -0.95],
        ],
        [0.094, 0.069, 0.025],
        shell,
      );
      m.oval(-0.27, 0.541, -0.98, 0.18, 0.039, 0.113, '#bba785');
      return;
    }
    const phase = id === 'phase-spider';
    const shell = phase
      ? { ...glow('#8f91ce', 0.46), alpha: 0.6 }
      : scorpion
        ? '#b28a5d'
        : many
          ? '#ad5944'
          : '#574a51';
    const y = 0.54,
      count = many ? 9 : 4;
    if (many)
      for (let i = 0; i < count; i++)
        m.oval(0.09 * Math.sin(i * 0.5), y - 0.09, -0.53 + i * 0.13, 0.23, 0.15, 0.15, shell);
    else {
      m.oval(0, y, -0.2, spider ? 0.33 : 0.27, 0.21, spider ? 0.38 : 0.35, shell);
      m.oval(0, y + 0.01, 0.244, 0.236, 0.168, 0.243, shell);
    }
    for (const s of [-1, 1])
      for (let i = 0; i < count; i++) {
        const z = many ? -0.53 + i * 0.13 : -0.28 + i * 0.17,
          reach = many ? 0.45 : (phase ? 0.82 : 0.76) - Math.abs(i - 1.5) * 0.045;
        trail(
          m,
          [
            [s * 0.14, y - 0.04, z],
            [s * reach * 0.7, y + (phase ? 0.29 - i * 0.021 : spider ? 0.19 : 0.06), z + (i - count / 2) * 0.055],
            [s * reach, 0.179, z + (i - count / 2) * 0.126],
          ],
          [many ? 0.036 : 0.055, many ? 0.024 : 0.035, 0.008],
          shell,
        );
      }
    const face = many ? 0.61 : 0.42;
    eyes(m, 0, y + 0.068, face, 0.112, 0.038, phase ? glow('#cde3fa', 1.08) : amber);
    for (const s of [-1, 1]) {
      if (spider) spike(m, [s * 0.103, y - 0.015, face], [s * 0.085, y - 0.122, face + 0.115], 0.043);
      if (scorpion) {
        const claw = [s * 0.435, 0.55, 0.666];
        m.rod([s * 0.164, y, 0.325], claw, 0.093, 0.067, shell);
        m.oval(...claw, 0.129, 0.082, 0.143, shell);
        for (const d of [-1, 1])
          spike(m, [claw[0] + d * 0.067, 0.55, 0.72], [claw[0] + d * 0.041, 0.56, 0.902], 0.05, shell);
      }
      if (many)
        trail(
          m,
          [
            [s * 0.115, y + 0.051, face],
            [s * 0.22, y + 0.28, face + 0.14],
            [s * 0.34, y + 0.38, face + 0.26],
          ],
          [0.029, 0.024, 0.006],
          shell,
        );
    }
    if (scorpion)
      trail(
        m,
        [
          [0, y, -0.42],
          [0.032, 0.74, -0.66],
          [0.07, 1.06, -0.66],
          [0.09, 1.25, -0.42],
          [0.1, 1.13, -0.27],
        ],
        [0.134, 0.114, 0.086, 0.067, 0.009],
        shell,
      );
    if (phase) {
      const echo = { ...glow('#8da5e5', 0.58), alpha: 0.19, layered: true };
      m.oval(-0.18, 0.57, -0.33, 0.357, 0.235, 0.409, echo);
      for (const s of [-1, 1])
        for (const z of [-0.47, -0.3, -0.13, 0.04])
          trail(
            m,
            [
              [-0.18 + s * 0.14, 0.51, z],
              [-0.18 + s * 0.62, 0.76, z],
              [-0.18 + s * 0.82, 0.2, z + 0.14],
            ],
            [0.042, 0.03, 0.006],
            echo,
          );
      for (let i = 0; i < 3; i++) m.oval(0, 0.742, -0.34 + i * 0.11, 0.087, 0.019, 0.032, glow('#b1c7f1'));
    }
  }
  function featherWing(m, shoulder, wrist, tips, cover, primaries) {
    m.rod(shoulder, wrist, Math.abs(wrist[0] - shoulder[0]) * 0.21, 0.024, cover, 7);
    m.membrane(shoulder, wrist, tips.at(-1), cover);
    m.membrane(shoulder, tips.at(-1), tips.at(-2), cover);
    for (let i = 1; i < tips.length; i++) {
      const a = tips[i - 1],
        b = tips[i];
      const joint = a.map((n, k) => (n + b[k]) * 0.31 + wrist[k] * 0.38);
      const keel = joint.map((n, k) => (k === 1 ? n + 0.042 : n));
      m.membrane(wrist, a, keel, cover);
      m.membrane(wrist, keel, b, cover);
      m.membrane(a, b, keel, primaries[i % primaries.length]);
    }
  }
  // Primaries leave a gap between their exposed tips.
  function flightFeather(m, from, to, width, color) {
    const dx = to[0] - from[0],
      dz = to[2] - from[2];
    const span = Math.hypot(dx, dz);
    const along = from.map((value, i) => value + (to[i] - value) * 0.48);
    const a = [along[0] - (dz / span) * width, along[1], along[2] + (dx / span) * width];
    const b = [along[0] + (dz / span) * width, along[1], along[2] - (dx / span) * width];
    const ridge = [along[0], along[1] + width * 0.42, along[2]];
    m.membrane(from, a, ridge, color);
    m.membrane(from, ridge, b, color);
    m.membrane(to, ridge, a, color);
    m.membrane(to, b, ridge, color);
  }
  function birdWing(m, s, y, owl, colors) {
    const [cover, light, dark] = colors;
    const span = owl ? 0.79 : 1.03;
    m.rod([s * 0.09, y + 0.035, 0.04], [s * span * 0.69, y + 0.19, 0.035], 0.108, 0.072, cover, 7);
    m.oval(s * span * 0.43, y + 0.13, -0.008, span * 0.35, 0.081, 0.153, cover);
    for (const [i, [x, z]] of (owl
      ? [
          [0.91, 0.01],
          [0.98, -0.151],
          [0.93, -0.31],
          [0.78, -0.448],
          [0.56, -0.5],
          [0.34, -0.446],
          [0.14, -0.32],
        ]
      : [
          [1.03, 0.055],
          [0.96, -0.15],
          [0.82, -0.34],
          [0.61, -0.437],
          [0.43, -0.431],
          [0.26, -0.372],
          [0.12, -0.284],
        ]
    ).entries()) {
      const start = [s * span * (0.68 - i * 0.088), y + 0.16 - i * 0.016, 0.051];
      flightFeather(m, start, [s * span * x, y + 0.22 - i * 0.004, z], owl ? 0.071 : 0.058, i % 2 ? light : dark);
    }
  }
  function membraneWing(m, s, y, body, membrane) {
    const shoulder = [s * 0.085, y + 0.04, 0.035],
      wrist = [s * 0.41, y + 0.19, 0.015];
    const fingers = [
      [s * 0.88, y + 0.23, -0.07],
      [s * 0.72, y + 0.16, -0.37],
      [s * 0.42, y + 0.105, -0.45],
      [s * 0.14, y + 0.025, -0.28],
    ];
    for (let i = 1; i < fingers.length; i++) {
      const a = fingers[i - 1],
        b = fingers[i];
      const scallop = a.map((v, k) => (v + b[k]) * 0.36 + wrist[k] * 0.28);
      m.membrane(wrist, a, scallop, membrane);
      m.membrane(wrist, scallop, b, membrane);
      m.rod(wrist, a, 0.022, 0.006, body, 5);
    }
    m.membrane(shoulder, wrist, fingers.at(-1), membrane);
    m.rod(shoulder, wrist, 0.053, 0.034, body, 7);
  }
  function wasp(m) {
    const y = 0.52,
      yellow = '#edbb32',
      black = '#29292e';
    stand(m, y - 0.055);
    m.oval(0, y - 0.015, -0.095, 0.049, 0.046, 0.177, black);
    const abdomen = [
      [-0.17, 0.043],
      [-0.235, 0.112],
      [-0.35, 0.173],
      [-0.43, 0.168],
      [-0.55, 0.15],
      [-0.62, 0.112],
      [-0.71, 0.062],
      [-0.751, 0.024],
    ];
    for (let i = 1; i < abdomen.length; i++) {
      const [a, ra] = abdomen[i - 1],
        [b, rb] = abdomen[i];
      m.rod([0, y - 0.02, a], [0, y - 0.02, b], ra, rb, i % 2 ? black : yellow, 12);
    }
    spike(m, [0, y - 0.02, -0.738], [0, y + 0.013, -1.015], 0.047, black);
    m.oval(0, y, 0.07, 0.116, 0.119, 0.17, '#3c3632');
    m.oval(0, y + 0.055, 0.223, 0.11, 0.096, 0.083, yellow);
    eyes(m, 0, y + 0.074, 0.272, 0.07, 0.034, black);
    const wing = { color: '#b3d7d3', alpha: 0.52, layered: true, shine: 56, roughness: 0.24 };
    for (const s of [-1, 1]) {
      const shoulder = [s * 0.091, y + 0.088, -0.025];
      for (const [x, z] of [
        [0.57, -0.24],
        [0.46, -0.49],
      ]) {
        const tip = [s * x, y + 0.17, z],
          edge = [s * x * 0.71, y + 0.081, z - 0.125];
        m.membrane(shoulder, tip, edge, wing);
        m.rod(shoulder, tip, 0.013, 0.004, '#a0a8a1', 5);
      }
      for (const z of [-0.09, 0.025, 0.13])
        trail(
          m,
          [
            [s * 0.07, y - 0.018, z],
            [s * 0.23, y - 0.15, z - 0.02],
            [s * 0.27, y - 0.29, z + 0.1],
          ],
          [0.023, 0.015, 0.004],
          black,
        );
      trail(
        m,
        [
          [s * 0.048, y + 0.118, 0.264],
          [s * 0.109, y + 0.173, 0.38],
          [s * 0.167, y + 0.129, 0.453],
        ],
        [0.021, 0.014, 0.006],
        black,
      );
    }
  }
  function winged(m, id) {
    if (id === 'wasp') return wasp(m);
    const owl = id === 'owl',
      hawk = id === 'hawk',
      stirge = id === 'stirge';
    const bird = owl || hawk;
    const body = owl ? '#987b58' : hawk ? '#815e42' : stirge ? '#9a574d' : '#63516e';
    const y = 0.36;
    stand(m, y - 0.025);
    m.oval(0, y, -0.046, stirge ? 0.105 : 0.165, 0.127, stirge ? 0.25 : 0.231, body);
    m.oval(0, y + 0.109, 0.148, owl ? 0.218 : 0.126, owl ? 0.15 : 0.105, 0.129, body);
    for (const s of [-1, 1]) {
      if (bird) {
        birdWing(m, s, y, owl, owl ? ['#9e825f', '#e0c39a', '#b19673'] : ['#97724e', '#b8996b', '#5f463b']);
        if (owl) m.oval(s * 0.101, y + 0.119, 0.247, 0.121, 0.12, 0.054, '#e5cc9f');
        for (const x of [0.07, 0.117]) spike(m, [s * x, y - 0.074, 0.072], [s * x, y - 0.148, 0.18], 0.028, amber);
        for (const i of [0, 1]) {
          const start = [s * (0.039 + i * 0.035), y - 0.024, -0.12];
          flightFeather(
            m,
            start,
            [s * (0.08 + i * 0.085), y + 0.01, -(owl ? 0.39 : 0.543) + i * 0.05],
            0.055,
            owl ? '#d4b388' : i % 2 ? '#60483d' : '#a78258',
          );
        }
      } else membraneWing(m, s, y, body, stirge ? '#623a46' : '#94778f');
      if (owl || id === 'bat') spike(m, [s * 0.12, y + 0.156, 0.086], [s * 0.18, y + 0.265, 0.064], 0.061, body);
      if (stirge)
        for (const z of [-0.11, 0.014, 0.103])
          trail(
            m,
            [
              [s * 0.07, y + 0.008, z],
              [s * 0.202, y - 0.068, z],
              [s * 0.235, y - 0.138, z + 0.13],
            ],
            [0.018, 0.011, 0.003],
            '#523745',
          );
    }
    eyes(m, 0, y + 0.134, 0.267, owl ? 0.104 : 0.071, owl ? 0.059 : 0.035, owl ? amber : dark);
    if (owl) eyes(m, 0, y + 0.137, 0.309, 0.104, 0.032, dark);
    if (bird) spike(m, [0, y + 0.056, 0.241], [0, y - 0.013, owl ? 0.384 : 0.452], owl ? 0.045 : 0.064, amber);
    if (stirge) {
      const start = [0, y + 0.07, 0.252],
        tip = [0, y + 0.042, 0.815];
      m.rod(start, tip, 0.034, 0.004, '#422b3b', 7);
      m.rod([0, y + 0.097, 0.278], [0, y + 0.051, 0.77], 0.011, 0.003, '#aa726a', 5);
    }
  }
  function flyingSwarm(m, ravens) {
    const plumage = '#38414e',
      beak = '#7d7f86';
    const body = ravens ? plumage : '#56435c';
    // Three low groups cover the tabletop footprint, leaving gaps between flocks.
    const groups = [
      [-0.34, 0.18],
      [0.28, 0.25],
      [0.05, -0.35],
    ];
    for (const [g, [gx, gz]] of groups.entries()) {
      for (const [i, [dx, dz]] of [
        [-0.1, 0],
        [0.13, 0.035],
        [0.04, -0.136],
      ].entries()) {
        const x = gx + dx,
          z = gz + dz,
          y = 0.303 + ((i + g) % 3) * 0.039;
        m.rod([x, 0.186, z], [x, y - 0.024, z], 0.018, 0.013, acrylic, 5);
        m.oval(x, y, z, 0.06, 0.055, 0.093, body);
        m.oval(x, y + 0.028, z + 0.085, 0.047, 0.046, 0.057, body);
        if (ravens) {
          spike(m, [x, y + 0.031, z + 0.122], [x, y + 0.018, z + 0.216], 0.037, beak);
          flightFeather(m, [x, y + 0.023, z - 0.032], [x + 0.026, y + 0.03, z - 0.201], 0.047, plumage);
        }
        for (const s of [-1, 1]) {
          const shoulder = [x + s * 0.035, y + 0.017, z],
            tip = [x + s * 0.198, y + 0.054 + (i % 2) * 0.026, z - 0.019];
          if (ravens) {
            m.rod(shoulder, [x + s * 0.121, y + 0.068, z - 0.006], 0.032, 0.022, plumage, 5);
            for (let f = 0; f < 4; f++)
              flightFeather(
                m,
                [x + s * (0.084 - f * 0.017), y + 0.041, z + 0.022],
                [tip[0] - s * f * 0.029, tip[1] - f * 0.014, tip[2] - f * 0.036],
                0.019,
                f % 2 ? '#48546b' : '#323b4c',
              );
          } else {
            const finger = [x + s * 0.14, y + 0.017, z - 0.107],
              notch = [x + s * 0.108, y + 0.033, z - 0.07];
            m.membrane(shoulder, tip, notch, '#99798f');
            m.membrane(shoulder, notch, finger, '#806177');
            m.membrane(shoulder, finger, [x + s * 0.055, y - 0.015, z - 0.076], '#99798f');
            spike(m, [x + s * 0.026, y + 0.054, z + 0.076], [x + s * 0.049, y + 0.099, z + 0.066], 0.023, body);
          }
        }
      }
    }
  }
  function swarm(m, id) {
    const rats = id === 'rat-swarm',
      beetles = id === 'insect-swarm';
    if (!rats && !beetles) return flyingSwarm(m, id === 'raven-swarm');
    const hide = rats ? '#96766a' : '#679281';
    for (let i = 0; i < 8; i++) {
      const angle = i * 2.4,
        x = Math.cos(angle) * (0.19 + 0.047 * i),
        z = Math.sin(angle) * 0.41;
      const y = 0.285 + (i % 3) * 0.035;
      m.oval(x, y, z, rats ? 0.101 : 0.077, 0.077, 0.145, hide);
      m.oval(x, y + 0.052, z + 0.119, 0.065, 0.061, 0.075, hide);
      if (rats) {
        m.rod([x, y, z - 0.1], [x - 0.11, y - 0.034, z - 0.31], 0.021, 0.008, '#c18d80');
        for (const s of [-1, 1]) m.oval(x + s * 0.044, y + 0.106, z + 0.105, 0.033, 0.042, 0.019, hide);
      } else {
        for (const s of [-1, 1])
          for (const d of [-0.05, 0.041])
            m.rod([x + s * 0.046, y, z + d], [x + s * 0.127, y - 0.06, z + d + 0.031], 0.017, 0.008, dark);
      }
    }
    if (beetles)
      for (const [x, z] of [
        [-0.26, -0.14],
        [0.22, 0.11],
        [0.01, 0.27],
      ]) {
        m.rod([x, 0.188, z], [x, 0.51, z], 0.018, 0.012, acrylic, 6);
        m.oval(x, 0.52, z, 0.035, 0.032, 0.075, dark);
        for (const s of [-1, 1])
          m.membrane([x, 0.52, z], [x + s * 0.12, 0.585, z - 0.05], [x + s * 0.042, 0.52, z - 0.11], {
            color: '#aed9c4',
            alpha: 0.62,
            layered: true,
          });
      }
  }
  function box(m, x, y, z, w, h, d, color) {
    const corner = (sx, sy, sz) => [x + sx * w, y + sy * h, z + sz * d];
    for (const s of [-1, 1])
      for (const [a, b, c, e] of [
        [corner(s, -1, -1), corner(s, 1, -1), corner(s, 1, 1), corner(s, -1, 1)],
        [corner(-1, s, -1), corner(1, s, -1), corner(1, s, 1), corner(-1, s, 1)],
        [corner(-1, -1, s), corner(1, -1, s), corner(1, 1, s), corner(-1, 1, s)],
      ]) {
        m.membrane(a, b, c, color);
        m.membrane(a, c, e, color);
      }
  }
  function hybrid(m, id) {
    const gryphon = id === 'griffon',
      hippo = id === 'hippogriff',
      cat = !gryphon && !hippo;
    beast(m, cat ? 'manticore-body' : hippo ? 'horse' : 'griffon-body', null, true);
    // Pico ganchudo delante del hocico y alas plegadas sobre el lomo.
    const headY = hippo ? 1.44 : 1.13;
    if (!cat) {
      m.oval(0, headY, 0.59, hippo ? 0.171 : 0.212, 0.201, 0.194, hippo ? '#b9af93' : '#f0dfbc');
      spike(m, [0, headY - 0.026, 0.735], [0, headY - 0.162, 0.956], 0.094, amber);
      eyes(m, 0, headY + 0.045, 0.719, 0.12, 0.037, dark);
      for (const s of [-1, 1])
        for (const i of [0, 1, 2])
          spike(
            m,
            [s * (0.07 + 0.046 * i), headY - 0.085, 0.61 - i * 0.05],
            [s * (0.13 + 0.035 * i), headY - 0.28, 0.62 - i * 0.066],
            0.052,
            bone,
          );
    } else {
      m.oval(0, 1.02, 0.45, 0.27, 0.26, 0.225, '#8f4f37');
      m.oval(0, 1.05, 0.587, 0.16, 0.195, 0.135, '#bb8a67');
      eyes(m, 0, 1.105, 0.709, 0.073, 0.033, amber);
      m.oval(0, 1.02, 0.735, 0.035, 0.047, 0.036, '#a87560');
      m.oval(0, 0.984, 0.705, 0.084, 0.028, 0.027, '#513436');
    }
    const tailEnd = cat ? [-0.47, 1.05, -0.88] : [-0.43, 0.47, -0.94];
    if (hippo) {
      const mane = '#4e4650';
      for (const side of [-1, 1]) {
        for (let i = 0; i < 6; i++) {
          const pos = [side * 0.035, 1.533 - i * 0.093, 0.477 - i * 0.082];
          trail(
            m,
            [
              pos,
              [side * (0.106 + i * 0.009), pos[1] - 0.13, pos[2] - 0.061],
              [side * (0.173 + i * 0.008), pos[1] - 0.234, pos[2] - 0.137],
            ],
            [0.068, 0.061, 0.005],
            i % 2 ? '#69616b' : mane,
          );
        }
        for (const dx of [0, 0.059, 0.111])
          trail(
            m,
            [
              [side * 0.047, 0.8, -0.491],
              [-0.15 + side * dx, 0.723, -0.74],
              [-0.29 + side * dx, 0.552, -0.982],
              [-0.445 + side * dx, 0.327, -1.114],
            ],
            [0.05, 0.062, 0.053, 0.006],
            dx < 0.06 ? mane : '#79737e',
          );
      }
    } else {
      trail(
        m,
        [[0, 0.7, -0.45], [-0.12, cat ? 0.82 : 0.57, -0.68], tailEnd],
        cat ? [0.104, 0.103, 0.074] : [0.072, 0.058, 0.032],
        cat ? '#9e7151' : '#a58354',
      );
      if (!cat) m.oval(...tailEnd, 0.091, 0.059, 0.095, '#806143');
    }
    for (const s of [-1, 1]) {
      const shoulder = [s * 0.16, 0.97, 0.047],
        wrist = [s * 0.45, 1.57 + (hippo ? 0.22 : 0), -0.24];
      const tips = [
        [s * 0.86, 1.84 + (hippo ? 0.25 : 0), -0.34],
        [s * 0.84, 1.28 + (hippo ? 0.15 : 0), -0.57],
        [s * 0.68, 1.02, -0.67],
        [s * 0.29, 0.96, -0.61],
      ];
      if (!cat)
        featherWing(
          m,
          shoulder,
          wrist,
          tips,
          hippo ? '#958474' : '#c7a678',
          hippo ? ['#6e6462', '#bfb1a1'] : ['#987351', '#d8bf93'],
        );
      else {
        for (let i = 1; i < tips.length; i++) {
          const a = tips[i - 1],
            b = tips[i];
          const notch = a.map((n, k) => (n + b[k]) * 0.39 + wrist[k] * 0.22);
          m.membrane(wrist, a, notch, '#9b6051');
          m.membrane(wrist, notch, b, '#b2745e');
          m.rod(wrist, a, 0.037, 0.008, leather);
        }
        m.membrane(shoulder, wrist, tips.at(-1), leather);
        m.rod(shoulder, wrist, 0.082, 0.048, leather);
      }
    }
    if (cat)
      for (const [x, y, z] of [
        [-0.16, 0.15, 0],
        [0.09, 0.22, -0.043],
        [0.12, 0.08, -0.14],
        [-0.091, -0.045, -0.18],
        [-0.17, 0.045, 0.12],
      ])
        spike(m, tailEnd, [tailEnd[0] + x, tailEnd[1] + y, tailEnd[2] + z], 0.045);
  }
  function dungeon(m, id, variant) {
    if (id === 'beholder') {
      stand(m, 0.85, 0, 0.01);
      m.offset(0, -0.21, 0.035);
      m.oval(0, 1.09, 0, 0.43, 0.395, 0.355, '#987274');
      m.oval(0, 1.19, 0.304, 0.275, 0.216, 0.126, '#e6d4a3');
      m.oval(0, 1.211, 0.414, 0.102, 0.125, 0.041, '#863e4d');
      m.oval(0, 1.223, 0.447, 0.042, 0.079, 0.024, dark);
      m.oval(0, 0.879, 0.262, 0.248, 0.103, 0.088, dark);
      for (const x of [-0.17, -0.11, -0.05, 0.05, 0.11, 0.17]) {
        spike(m, [x, 0.945, 0.329], [x, 0.874, 0.342], 0.026);
        spike(m, [x, 0.814, 0.323], [x, 0.855, 0.339], 0.021);
      }
      for (let i = 0; i < 10; i++) {
        const a = (i * Math.PI) / 5,
          x = Math.cos(a),
          z = Math.sin(a),
          tip = [x * (0.49 + 0.12 * (i % 2)), 1.67 + (i % 3) * 0.09, z * 0.39];
        trail(m, [[x * 0.25, 1.31, z * 0.22], [x * 0.5, 1.49, z * 0.32], tip], [0.048, 0.041, 0.035], '#ae8287');
        m.oval(...tip, 0.064, 0.069, 0.064, '#d1ac93');
        m.oval(tip[0], tip[1], tip[2] + 0.05, 0.032, 0.033, 0.021, dark);
      }
      return;
    }
    if (id === 'lich' || id === 'mind-flayer') {
      const lich = id === 'lich',
        skin = lich ? bone : '#a389b4';
      const robe = lich ? '#514059' : '#36334d';
      const trim = root.MiniatureMesh.metal(lich ? '#b19153' : '#9177a2');
      m.form(
        0,
        0,
        0,
        [
          [0.19, 0.39, 0.27, -0.046],
          [0.79, 0.226, 0.18],
          [1.3, 0.32, 0.2],
          [1.49, 0.182, 0.147],
        ],
        robe,
      );
      m.oval(0, 1.69, 0.022, lich ? 0.205 : 0.233, lich ? 0.196 : 0.3, 0.218, skin);
      if (lich) {
        eyes(m, 0, 1.717, 0.215, 0.092, 0.068, '#332b36');
        eyes(m, 0, 1.723, 0.265, 0.092, 0.033, glow('#9cf8db', 1.1));
        m.oval(0, 1.64, 0.227, 0.037, 0.049, 0.024, '#322832');
        m.oval(0, 1.535, 0.13, 0.112, 0.077, 0.107, bone);
        for (const x of [-0.079, -0.04, 0, 0.04, 0.079])
          m.rod([x, 1.598, 0.234], [x, 1.541, 0.244], 0.015, 0.012, bone);
        m.form(
          0,
          1.797,
          0.006,
          [
            [0, 0.211, 0.184],
            [0.076, 0.221, 0.197],
            [0.118, 0.224, 0.199],
          ],
          metal('#be9650'),
          8,
        );
      } else eyes(m, 0, 1.7, 0.207, 0.101, 0.055, '#e3dac6');
      m.oval(0, 1.044, 0.213, 0.064, 0.069, 0.032, trim);
      for (const s of [-1, 1]) {
        const shoulder = [s * 0.245, 1.36, 0.038];
        m.form(
          shoulder[0],
          shoulder[1],
          shoulder[2],
          [
            [-0.1, 0.111, 0.116],
            [0.018, 0.148, 0.148],
            [0.157, 0.028, 0.035, s * 0.092, -0.021],
          ],
          trim,
          6,
        );
        m.rod([s * 0.19, 1.361, 0.154], [s * 0.085, 1.05, 0.22], 0.024, 0.029, trim, 6);
        m.rod([s * 0.085, 1.05, 0.22], [s * 0.237, 0.27, 0.237], 0.029, 0.022, trim, 6);
        trail(
          m,
          [
            [s * 0.24, 1.35, 0],
            [s * 0.39, 1.13, 0.015],
            [s * 0.48, 1.28, 0.17],
          ],
          [0.126, 0.088, 0.051],
          lich ? '#685971' : '#626783',
        );
        m.oval(s * 0.48, 1.28, 0.17, 0.058, 0.075, 0.061, skin);
        if (lich) {
          spike(m, [s * 0.146, 1.864, 0.093], [s * 0.162, 2.012, 0.109], 0.052, trim);
          for (const x of [-0.033, 0, 0.033])
            spike(m, [s * 0.48 + x, 1.275, 0.203], [s * 0.49 + x, 1.22, 0.273], 0.016);
        } else {
          m.rod([s * 0.041, 1.763, 0.219], [s * 0.165, 1.793, 0.168], 0.022, 0.031, '#746185');
          for (const d of [0.056, 0.126])
            trail(
              m,
              [
                [s * d, 1.58, 0.187],
                [s * d * 1.26, 1.41, 0.275],
                [s * (d + 0.044), 1.19 + d, 0.34],
                [s * (d + 0.1), 1.185 + d * 1.35, 0.39],
                [s * (d + 0.13), 1.23 + d * 1.5, s > 0 ? 0.48 : 0.406],
              ],
              [0.061, 0.051, 0.034, 0.022, 0.005],
              skin,
            );
        }
      }
      if (lich) {
        spike(m, [0, 1.869, 0.155], [0, 2.043, 0.164], 0.061, trim);
        box(m, 0, 1.043, 0.243, 0.073, 0.101, 0.04, trim);
        m.oval(0, 1.043, 0.294, 0.032, 0.046, 0.017, glow('#b1e7c6'));
        m.rod([0.48, 0.22, 0.17], [0.48, 1.78, 0.17], 0.032, 0.041, leather);
        m.oval(0.48, 1.84, 0.17, 0.089, 0.109, 0.077, glow('#77cab9', 1.1));
      }
      return;
    }
    if (id === 'mimic') {
      box(m, 0, 0.48, 0, 0.455, 0.28, 0.32, leather);
      box(m, 0, 0.72, 0, 0.469, 0.041, 0.329, '#ab8251');
      m.oval(0, 0.91, -0.095, 0.465, 0.17, 0.301, '#503144');
      m.form(
        0,
        0,
        0,
        [
          [1.0, 0.53, 0.39, 0, -0.065],
          [1.16, 0.52, 0.38, 0, -0.094],
          [1.27, 0.396, 0.27, 0, -0.127],
        ],
        leather,
        8,
      );
      for (const s of [-1, 1]) {
        box(m, s * 0.29, 0.48, 0.323, 0.037, 0.27, 0.016, metal(steel));
        for (const dx of [0.078, 0.245, 0.355]) {
          spike(m, [s * dx, 0.748, 0.254], [s * dx, 0.859, 0.259], 0.038);
          spike(m, [s * dx, 1.055, 0.201], [s * dx, 0.913, 0.231], 0.045);
        }
      }
      trail(
        m,
        [
          [0, 0.82, 0.11],
          [0.02, 0.79, 0.37],
          [0.15, 0.64, 0.51],
          [0.25, 0.7, 0.64],
        ],
        [0.084, 0.082, 0.055, 0.01],
        '#bc6676',
      );
      return;
    }
    if (id === 'cube') {
      box(m, 0, 0.76, 0, 0.465, 0.57, 0.445, { color: '#7ec2ae', alpha: 0.44, layered: true, shine: 46 });
      m.oval(-0.17, 0.84, 0.18, 0.116, 0.131, 0.09, bone);
      m.oval(-0.17, 0.76, 0.206, 0.082, 0.055, 0.049, bone);
      eyes(m, -0.17, 0.865, 0.253, 0.047, 0.027, '#4e5c54');
      m.rod([0.05, 0.5, 0.12], [0.126, 0.65, 0.12], 0.028, 0.034, leather);
      m.rod([0.055, 0.665, 0.12], [0.22, 0.608, 0.12], 0.024, 0.024, metal('#d2a759'));
      spike(m, [0.136, 0.638, 0.12], [0.326, 1.15, 0.112], 0.054, metal(steel));
      for (const [x, z] of [
        [-0.2, 0.14],
        [-0.22, -0.051],
        [0.087, -0.16],
        [0.236, 0.24],
      ])
        m.oval(x, 0.262, z, 0.068, 0.021, 0.062, metal('#c6a152'));
      for (const [x, y, r] of [
        [-0.31, 0.47, 0.041],
        [0.26, 1.12, 0.074],
        [0.16, 0.998, 0.03],
      ])
        m.oval(x, y, 0.38, r, r, 0.03, { color: '#b6dcce', alpha: 0.36, layered: true, shine: 52 });
      return;
    }
    if (id === 'ooze') {
      const black = variant === 'black-pudding';
      const wet = { color: black ? '#2d2b30' : '#68777b', shine: 114, roughness: 0.16 };
      m.form(
        0,
        0,
        0,
        [
          [0.184, 0.62, 0.52],
          [0.24, 0.66, 0.55, -0.032],
          [0.32, 0.55, 0.43, -0.057],
          [0.47, 0.34, 0.29, -0.11],
          [0.64, 0.18, 0.18, -0.18],
          [0.72, 0.055, 0.079, -0.25, 0.08],
        ],
        wet,
        10,
      );
      trail(
        m,
        [
          [-0.18, 0.54, 0.028],
          [-0.32, 0.83, 0.055],
          [-0.25, 0.87, 0.174],
          [-0.19, 0.75, 0.26],
        ],
        [0.12, 0.083, 0.054, 0.009],
        wet,
      );
      for (const [x, y, z, r] of [
        [0.24, 0.321, 0.32, 0.085],
        [-0.014, 0.544, 0.121, 0.054],
        [-0.43, 0.276, 0.283, 0.072],
        [0.21, 0.408, -0.071, 0.05],
      ])
        m.oval(x, y, z, r, r * 0.71, r, { ...wet, color: black ? '#3b3b42' : '#829196' });
      return;
    }
    if (id === 'flying-sword') {
      const hilt = [-0.32, 0.45, 0.21],
        guard = [-0.19, 0.634, 0.121],
        tip = [0.56, 1.25, -0.21];
      stand(m, 0.63, -0.19, 0.12);
      m.rod(hilt, guard, 0.05, 0.052, leather);
      m.oval(...hilt, 0.076, 0.064, 0.071, metal(amber));
      m.rod([-0.29, 0.757, 0.212], [-0.056, 0.534, 0.008], 0.031, 0.04, metal(amber));
      const a = [-0.289, 0.7, 0.018],
        b = [-0.056, 0.702, 0.29],
        ridge = [0.209, 0.989, 0.057];
      m.membrane(a, b, ridge, metal(steel));
      m.membrane(a, tip, ridge, metal('#c5ced0', 0.9, 0.16));
      m.membrane(b, ridge, tip, metal('#81989f'));
      m.rod(a, tip, 0.012, 0.004, glow('#9cdacb', 0.42), 5);
      return;
    }
    if (id === 'armor') {
      m.form(
        0,
        0.9,
        0.02,
        [
          [0, 0.22, 0.166],
          [0.2, 0.274, 0.205],
          [0.42, 0.345, 0.188],
          [0.51, 0.248, 0.145],
        ],
        metal('#768084'),
        10,
      );
      for (const s of [-1, 1]) {
        m.oval(s * 0.31, 1.348, 0.02, 0.176, 0.143, 0.181, metal('#8b9597'));
        m.rod([s * 0.37, 1.27, 0.01], [s * 0.415, 1.09, 0.013], 0.089, 0.082, metal('#707c7c'));
        m.rod([s * 0.42, 1.028, 0.02], [s * 0.47, 0.815, 0.15], 0.083, 0.094, metal('#8d9696'));
        m.rod([s * 0.15, 0.898, 0.02], [s * 0.22, 0.58, 0.04], 0.125, 0.088, metal('#677476'));
        m.rod([s * 0.23, 0.515, 0.069], [s * 0.245, 0.253, 0.115], 0.117, 0.105, metal('#819092'));
        m.oval(s * 0.245, 0.228, 0.181, 0.107, 0.054, 0.136, metal('#727d7e'));
      }
      m.form(
        0,
        1.66,
        0.11,
        [
          [-0.16, 0.239, 0.205],
          [0.045, 0.253, 0.241],
          [0.186, 0.19, 0.181],
          [0.235, 0.075, 0.082],
        ],
        metal(steel),
      );
      m.rod([-0.133, 1.69, 0.308], [0.133, 1.69, 0.308], 0.034, 0.034, dark);
      m.rod([-0.061, 1.692, 0.335], [0.061, 1.692, 0.335], 0.011, 0.011, glow('#b3986a', 0.5), 5);
      box(m, -0.41, 0.998, 0.16, 0.176, 0.251, 0.063, metal('#777d80'));
      m.rod([0.47, 0.75, 0.18], [0.48, 1.0, 0.19], 0.043, 0.045, leather);
      spike(m, [0.48, 0.98, 0.19], [0.61, 1.66, 0.19], 0.078, metal('#b0b9b9'));
      return;
    }
    if (id === 'claw') {
      m.oval(0, 0.48, 0.005, 0.233, 0.127, 0.242, '#ab9688');
      for (let i = 0; i < 5; i++) {
        const x = (i - 2) * 0.097,
          z = 0.22 - Math.abs(i - 2) * 0.043;
        trail(
          m,
          [
            [x, 0.49, z],
            [x * 1.38, 0.74, z + 0.108],
            [x * 1.56, 0.5, z + 0.236],
            [x * 1.63, 0.212, z + 0.26],
          ],
          [0.063, 0.055, 0.04, 0.011],
          '#beac91',
        );
      }
      m.rod([0, 0.49, -0.106], [-0.085, 0.69, -0.35], 0.136, 0.122, '#98796a');
      m.oval(-0.084, 0.693, -0.358, 0.118, 0.104, 0.052, '#833e40');
      return;
    }
    if (id === 'nothic') {
      brute(m, id);
      m.oval(0, 1.464, 0.503, 0.2, 0.163, 0.095, '#b9cd7e');
      m.oval(0, 1.467, 0.587, 0.091, 0.112, 0.039, '#654b67');
      m.oval(0, 1.47, 0.616, 0.024, 0.088, 0.014, dark);
      for (const s of [-1, 1]) spike(m, [s * 0.18, 1.18, -0.09], [s * 0.36, 1.46, -0.19], 0.081, '#6e7862');
      return;
    }
    if (id === 'grick') {
      trail(
        m,
        [
          [0.49, 0.24, -0.09],
          [0.21, 0.28, -0.37],
          [-0.21, 0.41, -0.26],
          [-0.29, 0.65, -0.056],
          [-0.01, 0.92, -0.16],
          [0.12, 1.18, 0.015],
          [0, 1.27, 0.22],
        ],
        [0.037, 0.126, 0.17, 0.167, 0.151, 0.149, 0.154],
        '#827965',
      );
      spike(m, [0, 1.27, 0.28], [0, 1.18, 0.544], 0.107, amber);
      for (const s of [-1, 1])
        for (const v of [-1, 1])
          trail(
            m,
            [
              [s * 0.08, 1.27 + v * 0.049, 0.24],
              [s * 0.24, 1.27 + v * 0.19, 0.35],
              [s * 0.36, 1.27 + v * 0.256, 0.57],
              [s * 0.24, 1.27 + v * 0.3, 0.73],
            ],
            [0.077, 0.058, 0.038, 0.006],
            '#b58979',
          );
      return;
    }
    // Grell: cerebro flotante, pico y corona de tentáculos.
    m.oval(0, 1.49, 0, 0.33, 0.255, 0.34, '#ba858c');
    for (const s of [-1, 1])
      for (let i = 0; i < 4; i++)
        m.oval(s * (0.14 + i * 0.013), 1.62, -0.17 + i * 0.112, 0.146, 0.142, 0.095, '#cf9a9a');
    spike(m, [0, 1.42, 0.24], [0, 1.25, 0.48], 0.117, amber);
    for (let i = 0; i < 10; i++) {
      const a = (2 * Math.PI * i) / 10,
        x = Math.cos(a),
        z = Math.sin(a);
      trail(
        m,
        [
          [x * 0.22, 1.37, z * 0.21],
          [x * 0.31, 0.97, z * 0.29],
          [x * 0.25 - 0.064, 0.66, z * 0.32],
          [x * 0.43 - 0.11, 0.4 + (i % 3) * 0.09, z * 0.34],
        ],
        [0.044, 0.039, 0.026, 0.005],
        '#b68b86',
      );
    }
  }
  const shapes = { brute, spirit, beast, serpent, arthropod, winged, swarm, dungeon, hybrid };
  const facing = {
    brute: 25,
    spirit: 20,
    beast: 54,
    serpent: 28,
    arthropod: 35,
    winged: 15,
    swarm: 20,
    hybrid: 29,
    dungeon: 27,
  };
  function draw(ctx, model, size, variant) {
    if (model.shape === 'person') return person(ctx, model.id, size);
    const mesh = root.MiniatureMesh.create(model.id === 'wolf' ? 32 : facing[model.shape], ctx);
    mesh.base('#bd9b60');
    shapes[model.shape](mesh, model.id, variant);
    mesh.paint(ctx, size, 0.376);
  }
  root.CampaignMiniatures = { draw };
})(globalThis);
