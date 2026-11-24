/* Figuras de campaña. Los parientes comparten una anatomía, y cada familia conserva su silueta. */
(function (root) {
  'use strict';
  const bone = '#e4d3aa',
    dark = '#302d33',
    steel = '#a3b7b7',
    leather = '#694633',
    amber = '#f0bd62';
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
    bandit: ['regular', 'cloak', 'dagger', '#805547', 'crop'],
    scout: ['slender', 'cloak', 'bow', '#586c45', 'long'],
    guard: ['broad', 'armor', 'shield', '#546b82', 'crop'],
    cultist: ['slender', 'robe', 'dagger', '#843954', 'bald'],
    druid: ['regular', 'cloak', 'staff', '#73884b', 'long'],
    mage: ['slender', 'robe', 'staff', '#62539a', 'bald'],
    priest: ['heavy', 'robe', 'book', '#c39c68', 'crop'],
    berserker: ['athletic', 'tunic', 'axe', '#865c3a', 'long'],
    orc: ['broad', 'tunic', 'axe', '#704d3c', 'crest'],
    hobgoblin: ['athletic', 'armor', 'spear', '#934439', 'crest'],
  };
  function person(ctx, id, size) {
    const [build, outfit, gear, cloth, hair] = uniforms[id];
    const race = id === 'orc' ? 'orc' : id === 'hobgoblin' ? 'goblin' : 'human';
    const skin = id === 'orc' ? '#78955d' : id === 'hobgoblin' ? '#b56447' : '#bf9174';
    root.Miniatures.draw(
      ctx,
      { build, outfit, gear, cloth, hair, race, skin, pose: 'ready', facing: 22 },
      size,
      (m, head) => {
        if (id === 'bandit')
          m.form(
            0,
            head - 0.13,
            0.014,
            [
              [0, 0.189, 0.203],
              [0.104, 0.261, 0.238],
              [0.123, 0.26, 0.237],
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
            steel,
          );
          for (const side of [-1, 1]) m.oval(side * 0.232, head - 0.032, 0.052, 0.047, 0.114, 0.067, steel);
        }
        if (id === 'cultist') {
          m.oval(0, head + 0.035, -0.025, 0.3, 0.3, 0.246, cloth);
          for (const side of [-1, 1]) m.oval(side * 0.21, head + 0.017, 0.113, 0.082, 0.21, 0.095, cloth);
          m.membrane([-0.178, head + 0.139, 0.204], [0.18, head + 0.139, 0.204], [0, head + 0.046, 0.278], cloth);
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
        if (id === 'druid')
          for (const side of [-1, 1]) {
            const fork = [side * 0.236, head + 0.286, -0.024];
            trail(
              m,
              [[side * 0.18, head + 0.147, -0.02], fork, [side * 0.31, head + 0.358, -0.067]],
              [0.043, 0.031, 0.004],
              leather,
            );
            spike(m, fork, [side * 0.223, head + 0.396, 0.013], 0.025, leather);
          }
      },
    );
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
    ghoul: '#8790a4',
    wight: '#839690',
    mummy: '#b6a17d',
    vampire: '#c8b7b0',
    minotaur: '#885b3d',
    'hill-giant': '#ad896b',
    ettin: '#a88c74',
  };
  function brute(m, id) {
    const hide = bruteColors[id],
      small = id.includes('kobold'),
      large = ['cyclops', 'ogre', 'ogre-zombie', 'troll', 'bugbear', 'minotaur', 'hill-giant', 'ettin'].includes(id);
    const reptile = small || ['lizardfolk', 'sahuagin'].includes(id),
      fanged = id === 'gnoll' || id === 'bugbear';
    const dead = ['zombie', 'ogre-zombie', 'ghoul', 'mummy', 'wight', 'vampire'].includes(id);
    const width = large ? 0.415 : small ? 0.225 : 0.29,
      chest = small ? 1.07 : id === 'ghoul' ? 1.16 : large ? 1.39 : 1.31,
      head = chest + (small ? 0.29 : 0.36);
    const coat =
      id === 'vampire' ? '#593044' : id === 'wight' ? '#53616a' : id === 'mummy' ? hide : dead ? '#65545d' : '#755037';
    const clawed = id === 'ghoul' || id === 'troll' || reptile;
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
      const foot = [s * width * 0.83, 0.255, s < 0 ? 0.19 : -0.13],
        knee = [s * width * 0.9, 0.55, foot[2] + 0.11],
        hip = [s * width * 0.58, chest - 0.44, -0.045];
      trail(m, [hip, knee, foot], [width * 0.49, width * 0.33, width * 0.265], id === 'vampire' ? dark : hide);
      m.oval(foot[0], 0.225, foot[2] + 0.065, width * 0.36, 0.078, 0.17, dead && !clawed ? coat : hide);
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
      id === 'wight' ? steel : id === 'vampire' ? dark : hide,
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
        elbow = [s * (width + 0.13), chest - 0.22, s < 0 ? 0.04 : -0.09];
      const hand = [
        s * (width + 0.19),
        chest - (clawed && !reptile ? (s > 0 ? 0.28 : 0.59) : dead && s > 0 ? 0.13 : 0.44),
        dead ? 0.29 : 0.15,
      ];
      trail(m, [shoulder, elbow, hand], [width * 0.45, width * 0.32, width * 0.23], hide);
      m.oval(...shoulder, width * 0.48, 0.14, width * 0.48, id === 'wight' || id === 'bugbear' ? coat : hide);
      m.oval(...hand, 0.082, 0.093, 0.08, hide);
      if (clawed || dead)
        for (const dx of [-0.042, 0.028])
          spike(
            m,
            [hand[0] + dx, hand[1] - 0.026, hand[2] + 0.04],
            [hand[0] + dx, hand[1] - 0.137, hand[2] + 0.11],
            0.025,
            bone,
          );
      if (s === 1 && (id === 'wight' || id === 'minotaur')) {
        m.rod(hand, [hand[0] + 0.035, hand[1] + 0.24, hand[2]], 0.032, 0.04, leather);
        if (id === 'wight') {
          const base = [hand[0] + 0.03, hand[1] + 0.17, hand[2]];
          m.rod([base[0] - 0.12, base[1], base[2]], [base[0] + 0.12, base[1], base[2]], 0.03, 0.026, amber);
          spike(m, base, [base[0] + 0.085, base[1] + 0.61, base[2]], 0.068, steel);
        } else {
          m.form(
            hand[0] + 0.085,
            hand[1] + 0.215,
            hand[2],
            [
              [0, 0.076, 0.05],
              [0.06, 0.175, 0.052, 0.048],
              [0.192, 0.184, 0.05, 0.05],
              [0.24, 0.087, 0.047],
            ],
            steel,
          );
        }
      }
      if (s === 1 && ['ogre', 'cyclops', 'bugbear', 'hill-giant', 'ettin'].includes(id)) {
        const end = [hand[0] + 0.18, hand[1] + 0.63, hand[2] + 0.06];
        m.rod(hand, end, 0.046, 0.129, leather);
        m.oval(...end, 0.135, 0.17, 0.12, leather);
      }
    }
    m.oval(0, head - 0.19, 0.064, width * 0.52, 0.2, 0.15, hide);
    m.oval(0, head, 0.109, width * 0.76, small ? 0.195 : 0.237, width * 0.68, hide);
    const face = 0.11 + width * 0.57;
    if (reptile || fanged || id === 'troll')
      m.oval(0, head - 0.06, face, width * 0.55, 0.091, reptile ? 0.186 : 0.133, hide);
    if (id === 'cyclops') {
      m.oval(0, head + 0.027, face, 0.101, 0.078, 0.06, bone);
      m.oval(0, head + 0.027, face + 0.053, 0.04, 0.042, 0.02, dark);
    } else eyes(m, 0, head + 0.027, face, width * 0.37, 0.035, dead ? '#e4ca7f' : amber);
    for (const s of [-1, 1]) {
      if (reptile || fanged || id === 'troll')
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
    }
    if (id === 'minotaur') {
      m.oval(0, head - 0.07, face, 0.23, 0.125, 0.155, hide);
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
      m.oval(-0.32, head - 0.01, 0.1, 0.208, 0.224, 0.19, hide);
      eyes(m, -0.32, head + 0.011, 0.263, 0.079, 0.034, amber);
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
        const joint = [s * 0.48, 1.48, -0.15];
        for (const tip of [
          [s * 0.78, 1.59, -0.26],
          [s * 0.74, 1.22, -0.3],
          [s * 0.59, 1.08, -0.32],
        ]) {
          m.membrane([s * 0.11, 1.01, -0.09], joint, tip, '#d69a6b');
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
    if (id === 'gnoll' || id === 'bugbear')
      for (let i = -2; i <= 2; i++)
        spike(
          m,
          [i * 0.068, chest + 0.13, -0.11],
          [i * 0.093, chest + 0.37 - Math.abs(i) * 0.035, -0.17],
          0.09,
          '#533f36',
        );
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
    if (id === 'zombie' || id === 'ogre-zombie')
      m.oval(-width * 0.31, chest - 0.13, 0.184, 0.081, 0.106, 0.061, '#814843');
  }
  function spirit(m, id) {
    const mist = id === 'wraith' ? '#5b6278' : '#a8d3cb',
      shade = id === 'wraith' ? '#343647' : '#628f96';
    if (id === 'wisp') {
      m.oval(0, 0.94, 0, 0.26, 0.26, 0.26, '#9be4d8');
      m.oval(0, 0.95, 0.16, 0.145, 0.165, 0.135, '#fff4c4');
      for (let i = 0; i < 5; i++) {
        const a = i * 1.25;
        trail(
          m,
          [
            [0, 0.82, 0],
            [0.32 * Math.cos(a), 1.13, 0.3 * Math.sin(a)],
            [0.22 * Math.cos(a + 0.8), 1.54 + i * 0.045, 0.23 * Math.sin(a + 0.8)],
          ],
          [0.09, 0.073, 0.001],
          '#7bbebe',
        );
      }
      return;
    }
    m.form(
      0,
      0,
      0,
      [
        [0.18, 0.043, 0.04, -0.26, -0.13],
        [0.42, 0.19, 0.15, -0.18],
        [0.78, 0.34, 0.21, 0.055],
        [1.29, 0.36, 0.23],
        [1.5, 0.235, 0.166],
      ],
      mist,
    );
    m.oval(0, 1.64, 0, 0.264, 0.31, 0.221, mist);
    m.oval(0, 1.63, 0.15, 0.19, 0.205, 0.104, shade);
    eyes(m, 0, 1.65, 0.247, 0.076, 0.031, '#e6f2d2');
    for (const s of [-1, 1]) {
      trail(
        m,
        [
          [s * 0.24, 1.35, 0],
          [s * 0.47, 1.21, 0.055],
          [s * 0.65, 1.42, 0.23],
        ],
        [0.14, 0.096, 0.044],
        mist,
      );
      spike(m, [s * 0.45, 1.2, 0.04], [s * 0.51, 0.75, 0.015], 0.087, shade);
      for (const dx of [-0.034, 0.034]) spike(m, [s * 0.65 + dx, 1.43, 0.23], [s * 0.69 + dx, 1.51, 0.3], 0.022, mist);
    }
  }
  // Ancho y largo del tronco, altura de la cruz, altura del cráneo y largo del hocico.
  const beasts = {
    wolf: [0.24, 0.55, 0.82, 1.13, 0.23, '#767a82'],
    hyena: [0.27, 0.52, 0.85, 1.06, 0.23, '#ba945f'],
    bear: [0.4, 0.55, 0.9, 1.08, 0.145, '#895f46'],
    boar: [0.32, 0.49, 0.72, 0.88, 0.235, '#825e45'],
    rat: [0.262, 0.39, 0.56, 0.73, 0.15, '#967d73'],
    cat: [0.235, 0.57, 0.72, 1.03, 0.1, '#bd9357'],
    elk: [0.245, 0.53, 0.95, 1.44, 0.22, '#987152'],
    goat: [0.23, 0.42, 0.77, 1.16, 0.14, '#bbad96'],
    horse: [0.245, 0.54, 0.95, 1.44, 0.22, '#a07c53'],
    'griffon-body': [0.26, 0.55, 0.82, 1.13, 0.1, '#a58354'],
    owlbear: [0.39, 0.56, 1.0, 1.23, 0.1, '#93704c'],
    lizard: [0.245, 0.54, 0.49, 0.59, 0.26, '#72965a'],
    crocodile: [0.28, 0.63, 0.46, 0.5, 0.37, '#617e56'],
    toad: [0.37, 0.38, 0.5, 0.66, 0.19, '#899553'],
  };
  function beast(m, id) {
    const [w, long, withers, headY, snout, fur] = beasts[id],
      rat = id === 'rat',
      low = ['lizard', 'crocodile', 'toad'].includes(id);
    const faceZ = long * 0.97,
      headWidth = id === 'owlbear' ? w * 0.98 : id === 'toad' ? w : w * 0.75;
    m.oval(0, withers - 0.06, -0.02, w, low ? w * 0.7 : w * 0.99, long, fur);
    m.oval(0, withers, long * 0.57, w * 0.9, w * 1.08, w, fur);
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
        const hip = [x, withers - 0.055, z],
          knee = [s * w * (low ? 1.55 : 1), 0.34 + (withers - 0.48) * 0.43, z + (front < 0 ? 0.14 : -0.045) + step];
        const paw = [s * w * (low ? 1.56 : 1.02), 0.233, z + step];
        trail(m, [hip, knee, paw], [w * (front < 0 ? 0.56 : 0.41), w * 0.28, w * 0.22], fur);
        m.oval(paw[0], 0.211, paw[2] + 0.046, w * 0.32, 0.054, w * 0.47, fur);
      }
    m.oval(0, headY, faceZ, headWidth, headWidth * (low ? 0.65 : 0.91), headWidth * 0.91, fur);
    if (id === 'owlbear') {
      for (const s of [-1, 1]) {
        m.oval(s * 0.138, headY + 0.046, faceZ + 0.19, 0.148, 0.126, 0.063, '#c7ad78');
        spike(m, [s * 0.205, headY + 0.15, faceZ], [s * 0.31, headY + 0.39, faceZ - 0.11], 0.104, fur);
      }
      eyes(m, 0, headY + 0.056, faceZ + 0.25, 0.145, 0.051, dark);
      spike(m, [0, headY + 0.028, faceZ + 0.25], [0, headY - 0.092, faceZ + 0.39], 0.08, amber);
    } else {
      const muzzle = faceZ + headWidth * 0.53;
      m.oval(0, headY - 0.048, muzzle + snout * 0.53, headWidth * 0.69, headWidth * (low ? 0.31 : 0.47), snout, fur);
      eyes(m, 0, headY + (low ? 0.063 : 0.047), faceZ + headWidth * 0.61, headWidth * 0.63, 0.034, dark);
      if (!low) m.oval(0, headY - 0.023, muzzle + snout * 1.39, headWidth * 0.34, 0.035, 0.043, rat ? '#c38d83' : dark);
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
          const mid = [s * 0.27, headY + 0.35, faceZ - 0.13];
          trail(
            m,
            [
              [s * 0.12, headY + 0.1, faceZ - 0.05],
              mid,
              [s * (id === 'elk' ? 0.43 : 0.28), headY + (id === 'elk' ? 0.55 : 0.4), faceZ - 0.34],
            ],
            [0.069, 0.043, 0.004],
            bone,
          );
          if (id === 'elk') spike(m, mid, [s * 0.35, headY + 0.56, faceZ - 0.08], 0.041);
        }
      }
    }
    if (id === 'toad')
      for (const s of [-1, 1]) {
        m.oval(s * 0.24, headY + 0.14, faceZ, 0.112, 0.105, 0.092, fur);
        eyes(m, 0, headY + 0.16, faceZ + 0.077, 0.24, 0.041, amber);
      }
    else if (['wolf', 'hyena', 'rat', 'cat', 'lizard', 'crocodile'].includes(id)) {
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
        [low ? 0.15 : bushy ? 0.113 : 0.047, bushy ? 0.13 : 0.062, bushy ? 0.091 : 0.036, 0.009],
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
  }
  function serpent(m) {
    const pts = [];
    for (let i = 0; i <= 21; i++) {
      const a = i * 0.41;
      pts.push([Math.sin(a) * (0.47 - i * 0.008), 0.251 + i * 0.014, Math.cos(a) * (0.44 - i * 0.009)]);
    }
    const tail = pts.map((_, i) => 0.028 + Math.min(i, 7) * 0.014);
    pts.push([0.18, 0.81, -0.12], [-0.12, 1.09, 0.09], [-0.19, 1.19, 0.31]);
    tail.push(0.126, 0.096, 0.079);
    trail(m, pts, tail, '#658356');
    m.oval(-0.19, 1.18, 0.37, 0.136, 0.09, 0.16, '#7f9c61');
    eyes(m, -0.19, 1.21, 0.459, 0.091, 0.027, amber);
    spike(m, [-0.19, 1.16, 0.51], [-0.17, 1.135, 0.67], 0.018, '#b66a63');
  }
  function arthropod(m, id) {
    const spider = id.includes('spider'),
      scorpion = id === 'scorpion',
      rust = id === 'rust-monster',
      many = id === 'centipede';
    const shell =
      id === 'phase-spider' ? '#98a7d2' : rust ? '#ac6740' : scorpion ? '#b28a5d' : many ? '#ad5944' : '#574a51';
    const y = 0.54,
      count = many ? 9 : rust ? 2 : 4;
    if (many)
      for (let i = 0; i < count; i++)
        m.oval(0.09 * Math.sin(i * 0.5), y - 0.09, -0.53 + i * 0.13, 0.23, 0.15, 0.15, shell);
    else {
      m.oval(0, y, -0.2, spider ? 0.33 : 0.27, 0.21, spider ? 0.38 : 0.35, shell);
      m.oval(0, y + 0.01, 0.244, 0.236, 0.168, 0.243, shell);
    }
    for (const s of [-1, 1])
      for (let i = 0; i < count; i++) {
        const z = many ? -0.53 + i * 0.13 : -0.28 + i * (rust ? 0.53 : 0.17),
          reach = many ? 0.45 : 0.76 - Math.abs(i - 1.5) * 0.045;
        trail(
          m,
          [
            [s * 0.14, y - 0.04, z],
            [s * reach * 0.7, y + (spider ? 0.19 : 0.06), z + (i - count / 2) * 0.055],
            [s * reach, 0.179, z + (i - count / 2) * 0.126],
          ],
          [many ? 0.036 : 0.055, many ? 0.024 : 0.035, 0.008],
          shell,
        );
      }
    const face = many ? 0.61 : 0.42;
    eyes(m, 0, y + 0.068, face, 0.112, 0.038, rust ? dark : amber);
    for (const s of [-1, 1]) {
      if (spider) spike(m, [s * 0.103, y - 0.015, face], [s * 0.085, y - 0.122, face + 0.115], 0.043);
      if (scorpion) {
        const claw = [s * 0.435, 0.55, 0.666];
        m.rod([s * 0.164, y, 0.325], claw, 0.093, 0.067, shell);
        m.oval(...claw, 0.129, 0.082, 0.143, shell);
        for (const d of [-1, 1])
          spike(m, [claw[0] + d * 0.067, 0.55, 0.72], [claw[0] + d * 0.041, 0.56, 0.902], 0.05, shell);
      }
      if (many || rust)
        trail(
          m,
          [
            [s * 0.115, y + 0.051, face],
            [s * 0.22, y + 0.28, face + 0.14],
            [s * 0.34, y + 0.38, face + 0.26],
          ],
          [rust ? 0.047 : 0.029, 0.024, 0.006],
          rust ? '#d59a60' : shell,
        );
    }
    if (scorpion || rust)
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
    if (id === 'phase-spider')
      for (let i = 0; i < 3; i++) m.oval(0, 0.742, -0.34 + i * 0.11, 0.087, 0.019, 0.032, '#d0ceea');
  }
  function winged(m, id) {
    const bat = id === 'bat',
      insect = id === 'stirge' || id === 'wasp',
      owl = id === 'owl',
      body = bat ? '#58495e' : owl ? '#957957' : insect ? (id === 'wasp' ? '#c59943' : '#96574c') : '#735b48';
    const y = 0.99;
    m.oval(0, y, 0, insect ? 0.115 : 0.16, 0.2, insect ? 0.31 : 0.23, body);
    m.oval(0, y + 0.171, 0.118, owl ? 0.222 : 0.144, owl ? 0.18 : 0.143, 0.147, body);
    for (const s of [-1, 1]) {
      const wrist = [s * 0.43, 1.34, -0.02],
        shoulder = [s * 0.1, 1.08, 0],
        tips = [
          [s * 0.98, 1.49, -0.09],
          [s * 0.9, 1.24, -0.24],
          [s * 0.7, 1.08, -0.32],
          [s * 0.46, 0.99, -0.32],
          [s * 0.17, 0.94, -0.19],
        ];
      const membrane = insect ? '#b4c8b8' : bat ? '#947581' : '#b2926d';
      for (let i = 1; i < tips.length; i++) {
        const a = tips[i - 1],
          b = tips[i],
          notch = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + (bat ? 0.077 : 0), (a[2] + b[2]) / 2];
        m.membrane(wrist, a, notch, membrane);
        m.membrane(wrist, notch, b, membrane);
        m.rod(wrist, a, 0.025, 0.006, body);
      }
      m.membrane(shoulder, wrist, tips.at(-1), body);
      m.rod(shoulder, wrist, 0.054, 0.034, body);
      if (bat || owl) spike(m, [s * 0.093, 1.237, 0.074], [s * 0.159, 1.43, 0.014], 0.071, body);
      if (!insect) {
        spike(m, [s * 0.073, 0.9, 0.02], [s * 0.099, 0.77, 0.078], 0.033, amber);
      }
    }
    eyes(m, 0, 1.205, 0.224, owl ? 0.111 : 0.077, owl ? 0.055 : 0.033, owl ? amber : dark);
    if (!bat)
      spike(
        m,
        [0, 1.14, 0.226],
        [0, id === 'stirge' ? 0.934 : 1.085, id === 'stirge' ? 0.53 : 0.345],
        0.061,
        insect ? dark : amber,
      );
    if (id === 'wasp') {
      for (const z of [-0.09, -0.21]) m.oval(0, y, z, 0.119, 0.191, 0.055, dark);
      spike(m, [0, y, -0.25], [0, y - 0.048, -0.451], 0.063, dark);
    }
    if (!insect && !bat)
      for (const s of [-1, 0, 1]) spike(m, [s * 0.062, 0.955, -0.11], [s * 0.13, 0.85, -0.51], 0.08, body);
  }
  function swarm(m, id) {
    const rats = id === 'rat-swarm',
      beetles = id === 'insect-swarm',
      birds = id === 'raven-swarm';
    const hide = rats ? '#96766a' : beetles ? '#679281' : birds ? '#49546a' : '#806576';
    for (let i = 0; i < 8; i++) {
      const angle = i * 2.4,
        x = Math.cos(angle) * (0.19 + 0.047 * i),
        z = Math.sin(angle) * 0.41;
      const y = rats || beetles ? 0.285 + (i % 3) * 0.035 : 0.61 + (i % 4) * 0.247;
      m.oval(x, y, z, rats ? 0.101 : 0.077, 0.077, 0.145, hide);
      m.oval(x, y + 0.052, z + 0.119, 0.065, 0.061, 0.075, hide);
      if (rats) {
        m.rod([x, y, z - 0.1], [x - 0.11, y - 0.034, z - 0.31], 0.021, 0.008, '#c18d80');
        for (const s of [-1, 1]) m.oval(x + s * 0.044, y + 0.106, z + 0.105, 0.033, 0.042, 0.019, hide);
      } else
        for (const s of [-1, 1]) {
          if (beetles) {
            for (const d of [-0.05, 0.041])
              m.rod([x + s * 0.046, y, z + d], [x + s * 0.127, y - 0.06, z + d + 0.031], 0.017, 0.008, dark);
          } else {
            m.membrane([x, y, z], [x + s * 0.2, y + 0.14, z - 0.04], [x + s * 0.125, y + 0.012, z - 0.1], hide);
            m.membrane([x, y, z], [x + s * 0.125, y + 0.012, z - 0.1], [x, y - 0.039, z - 0.096], hide);
          }
        }
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
    beast(m, cat ? 'cat' : hippo ? 'horse' : 'griffon-body');
    // Pico ganchudo delante del hocico y alas plegadas sobre el lomo.
    const headY = hippo ? 1.44 : 1.13;
    if (!cat) {
      m.oval(0, headY, 0.59, 0.199, 0.201, 0.194, bone);
      spike(m, [0, headY - 0.026, 0.735], [0, headY - 0.162, 0.956], 0.094, amber);
      eyes(m, 0, headY + 0.045, 0.719, 0.12, 0.037, dark);
    }
    for (const s of [-1, 1]) {
      const shoulder = [s * 0.16, 0.88, 0.17],
        wrist = [s * 0.49, 1.55, -0.09];
      const tips = [
        [s * 0.94, 1.72, -0.29],
        [s * 0.84, 1.33, -0.47],
        [s * 0.7, 1.1, -0.55],
        [s * 0.31, 0.81, -0.5],
      ];
      for (let i = 1; i < tips.length; i++) {
        m.membrane(wrist, tips[i - 1], tips[i], cat ? '#ad7465' : '#c8ae82');
        m.rod(wrist, tips[i - 1], 0.037, 0.008, cat ? leather : '#917a5b');
      }
      m.membrane(shoulder, wrist, tips.at(-1), cat ? leather : '#997e54');
      m.rod(shoulder, wrist, 0.082, 0.048, cat ? leather : '#ad916b');
    }
    if (cat)
      for (let i = 0; i < 4; i++) spike(m, [-0.47 + i * 0.028, 0.72, -0.77], [-0.5 + i * 0.035, 0.96, -0.89], 0.034);
  }
  function dungeon(m, id) {
    if (id === 'beholder') {
      m.oval(0, 1.09, 0, 0.43, 0.395, 0.355, '#987274');
      m.oval(0, 1.13, 0.324, 0.204, 0.184, 0.071, '#e6d4a3');
      m.oval(0, 1.13, 0.384, 0.083, 0.109, 0.035, '#773f48');
      m.oval(0, 0.89, 0.292, 0.175, 0.071, 0.059, dark);
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
        lich ? '#55475d' : '#4c506d',
      );
      m.oval(0, 1.69, 0.022, 0.233, lich ? 0.232 : 0.3, 0.218, skin);
      eyes(m, 0, 1.7, 0.207, 0.101, 0.055, lich ? '#7edbc6' : '#e3dac6');
      for (const s of [-1, 1]) {
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
        if (lich) spike(m, [s * 0.13, 1.856, 0.04], [s * 0.187, 2.09, -0.02], 0.057, amber);
        else
          for (const d of [0.056, 0.126])
            trail(
              m,
              [
                [s * d, 1.58, 0.187],
                [s * d * 1.26, 1.41, 0.275],
                [s * (d + 0.044), 1.28, 0.32],
                [s * (d + 0.085), 1.32, 0.38],
              ],
              [0.046, 0.041, 0.026, 0.006],
              skin,
            );
      }
      if (lich) {
        m.rod([0.48, 0.22, 0.17], [0.48, 1.78, 0.17], 0.032, 0.041, leather);
        m.oval(0.48, 1.84, 0.17, 0.089, 0.109, 0.077, '#73bba8');
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
        box(m, s * 0.29, 0.48, 0.323, 0.037, 0.27, 0.016, steel);
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
      box(m, 0, 0.76, 0, 0.465, 0.57, 0.445, '#66aa93');
      // Fragmentos atrapados junto a la superficie del cubo.
      m.oval(-0.17, 0.84, 0.455, 0.116, 0.131, 0.047, '#91bdae');
      eyes(m, -0.17, 0.865, 0.493, 0.047, 0.024, '#4e8075');
      m.rod([0.062, 0.48, 0.448], [0.293, 0.705, 0.452], 0.033, 0.042, '#a6c8b0');
      for (const [x, y, r] of [
        [-0.31, 0.47, 0.041],
        [0.26, 1.12, 0.074],
        [0.16, 0.998, 0.03],
      ])
        m.oval(x, y, 0.449, r, r, 0.014, '#8ac3ae');
      return;
    }
    if (id === 'ooze') {
      for (const [x, z, w, h] of [
        [-0.29, 0.11, 0.32, 0.21],
        [0.24, -0.09, 0.39, 0.24],
        [0.092, 0.29, 0.27, 0.14],
        [-0.12, -0.1, 0.37, 0.38],
      ])
        m.oval(x, 0.21 + h * 0.4, z, w, h, w * 0.82, '#869893');
      trail(
        m,
        [
          [-0.14, 0.37, 0],
          [-0.31, 0.72, -0.09],
          [-0.28, 0.94, 0.029],
          [-0.16, 0.9, 0.09],
        ],
        [0.152, 0.094, 0.061, 0.018],
        '#9baca0',
      );
      return;
    }
    if (id === 'flying-sword') {
      const hilt = [-0.21, 0.74, 0],
        guard = [-0.13, 0.978, 0.038],
        tip = [0.25, 1.947, 0.182];
      m.rod(hilt, guard, 0.05, 0.052, leather);
      m.oval(...hilt, 0.086, 0.068, 0.071, amber);
      m.rod([-0.34, 1.04, 0.04], [0.07, 0.926, 0.04], 0.031, 0.04, amber);
      const a = [-0.197, 1.04, 0.05],
        b = [-0.031, 0.99, 0.05],
        ridge = [0.083, 1.55, 0.161];
      m.membrane(a, b, ridge, steel);
      m.membrane(a, tip, ridge, '#c5dadd');
      m.membrane(b, ridge, tip, '#81989f');
      return;
    }
    if (id === 'armor') {
      brute(m, 'wight');
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
        steel,
      );
      m.rod([-0.133, 1.69, 0.308], [0.133, 1.69, 0.308], 0.034, 0.034, dark);
      box(m, -0.41, 0.998, 0.16, 0.176, 0.251, 0.063, '#727f89');
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
            [x * 1.38, 0.65, z + 0.108],
            [x * 1.56, 0.5, z + 0.236],
            [x * 1.63, 0.212, z + 0.26],
          ],
          [0.063, 0.055, 0.04, 0.011],
          '#beac91',
        );
      }
      m.rod([0, 0.47, -0.106], [-0.085, 0.58, -0.35], 0.136, 0.122, '#98796a');
      return;
    }
    if (id === 'nothic') {
      brute(m, 'ghoul');
      m.oval(0, 1.713, 0.293, 0.176, 0.14, 0.105, '#bed391');
      m.oval(0, 1.716, 0.384, 0.077, 0.094, 0.034, '#66567b');
      for (const s of [-1, 1]) spike(m, [s * 0.2, 1.38, -0.09], [s * 0.34, 1.65, -0.18], 0.082, '#6e7862');
      return;
    }
    if (id === 'grick') {
      trail(
        m,
        [
          [0.51, 0.25, -0.45],
          [0.2, 0.34, -0.45],
          [-0.18, 0.53, -0.29],
          [-0.22, 0.84, -0.13],
          [-0.07, 1.09, 0.08],
          [0, 1.14, 0.22],
        ],
        [0.045, 0.142, 0.192, 0.174, 0.157, 0.153],
        '#827965',
      );
      spike(m, [0, 1.14, 0.28], [0, 1.08, 0.54], 0.1, amber);
      for (const s of [-1, 1])
        for (const v of [-1, 1])
          trail(
            m,
            [
              [s * 0.08, 1.14 + v * 0.049, 0.24],
              [s * 0.22, 1.14 + v * 0.166, 0.35],
              [s * 0.27, 1.14 + v * 0.241, 0.57],
              [s * 0.19, 1.14 + v * 0.29, 0.65],
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
  function draw(ctx, model, size) {
    if (model.shape === 'person') return person(ctx, model.id, size);
    const mesh = root.MiniatureMesh.create(facing[model.shape]);
    mesh.base('#bd9b60');
    shapes[model.shape](mesh, model.id);
    mesh.paint(ctx, size, 0.376);
  }
  root.CampaignMiniatures = { draw };
})(globalThis);
