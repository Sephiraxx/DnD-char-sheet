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
    build: {
      regular: 'Mediana',
      broad: 'Robusta',
      slender: 'Esbelta',
      short: 'Baja',
      athletic: 'Atlética',
      heavy: 'Corpulenta',
    },
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
  // Medidas locales de cada escultura. La cabeza, las manos y el equipo conservan su volumen.
  const bodies = {
    regular: {
      hip: 0.28,
      waist: 0.24,
      chest: 0.34,
      belly: 0.18,
      bulk: 0.13,
      knee: 0.61,
      pelvis: 0.99,
      stance: 0.2,
      lean: 0.015,
    },
    broad: {
      hip: 0.34,
      waist: 0.31,
      chest: 0.41,
      belly: 0.22,
      bulk: 0.16,
      knee: 0.58,
      pelvis: 0.96,
      stance: 0.25,
      lean: 0.025,
    },
    slender: {
      hip: 0.25,
      waist: 0.19,
      chest: 0.29,
      belly: 0.145,
      bulk: 0.096,
      knee: 0.71,
      pelvis: 1.09,
      stance: 0.16,
      lean: -0.018,
    },
    short: {
      hip: 0.32,
      waist: 0.29,
      chest: 0.355,
      belly: 0.22,
      bulk: 0.14,
      knee: 0.46,
      pelvis: 0.78,
      stance: 0.23,
      lean: 0.01,
    },
    athletic: {
      hip: 0.28,
      waist: 0.215,
      chest: 0.42,
      belly: 0.165,
      bulk: 0.167,
      knee: 0.65,
      pelvis: 1.01,
      stance: 0.26,
      lean: 0.04,
    },
    heavy: {
      hip: 0.4,
      waist: 0.405,
      chest: 0.38,
      belly: 0.31,
      bulk: 0.174,
      knee: 0.55,
      pelvis: 0.92,
      stance: 0.29,
      lean: -0.035,
    },
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
    const mesh = root.MiniatureMesh.create(m.facing);
    const { form, oval, limb, rod } = mesh;
    const height = Math.pow(m.height / 170, 0.38);
    const raceWidth = { dwarf: 1.12, halfling: 1.05, elf: 0.96, orc: 1.08, dragonborn: 1.08 }[m.race] || 1;
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
    mesh.base(gold);
    mesh.figureScale(Math.min(1.06, height));
    const b = bodies[m.build];
    const hip = b.hip * raceWidth,
      chest = b.chest * shoulder * raceWidth;
    const waist = b.waist * raceWidth,
      ready = m.pose === 'ready';
    const stride = ready ? 0.19 : 0.065;
    const lift = (b.pelvis - 0.99) * 0.78 - (ready ? 0.04 : 0);
    const chestY = 1.48 + lift,
      shoulderZ = b.lean + (ready ? 0.075 : 0.015);
    const armor = m.outfit === 'armor' || m.race === 'warforged',
      robe = m.outfit === 'robe';
    for (const side of [-1, 1]) {
      const forward = side === -1;
      const foot = [side * b.stance, 0.26, forward ? stride : -stride];
      const knee = [
        side * (b.stance + 0.012),
        b.knee - (ready && forward ? 0.045 : 0),
        foot[2] + (forward ? 0.105 : 0.025),
      ];
      const thigh = [side * hip * 0.56, b.pelvis + 0.03, -0.025];
      oval(foot[0], 0.235, foot[2] + 0.06, 0.11 + b.bulk * 0.22, 0.09, 0.205, leather);
      limb(foot, knee, b.bulk * 0.75, b.bulk * 0.81, leather);
      oval(
        (foot[0] + knee[0]) / 2,
        (foot[1] + knee[1]) / 2 + 0.028,
        (foot[2] + knee[2]) / 2 - 0.015,
        b.bulk * 0.92,
        (knee[1] - foot[1]) * 0.38,
        b.bulk * 0.95,
        leather,
      );
      limb(knee, thigh, b.bulk * 0.78, b.bulk * 1.3, dark);
      oval(knee[0], knee[1], knee[2] + 0.02, b.bulk * 0.84, 0.09, b.bulk * 0.88, armor ? steel : dark);
    }
    if (m.outfit === 'cloak')
      form(
        0,
        0,
        -0.13,
        [
          [0.41, hip + 0.16, 0.14, -0.055, -0.12 - stride],
          [b.pelvis, hip + 0.13, 0.17, -0.035, -0.09],
          [chestY - 0.05, chest + 0.04, 0.19, 0, shoulderZ],
          [chestY + 0.1, 0.21, 0.14, 0, shoulderZ],
        ],
        m.cloth,
      );
    const beltY = b.pelvis + 0.13,
      bellyZ = b.belly * 0.28;
    form(
      0,
      0,
      0,
      [
        [robe ? 0.34 : b.pelvis - 0.17, hip + (robe ? 0.14 : 0.055), robe ? 0.31 : 0.22, -0.018, robe ? -0.055 : 0],
        [b.pelvis, hip, 0.2 + (b.hip - 0.28) * 0.55],
        [beltY, waist, b.belly, 0, bellyZ],
        [beltY + 0.075, (waist * 2 + chest) / 3, b.belly * 1.04, 0, bellyZ],
        [chestY - 0.06, chest, 0.19 + b.bulk * 0.3, 0.012, shoulderZ],
        [chestY + 0.045, chest * 0.95, 0.19, 0.012, shoulderZ],
        [chestY + 0.12, 0.18, 0.13, 0, shoulderZ],
      ],
      armor ? steel : m.cloth,
    );
    form(
      0,
      beltY,
      bellyZ,
      [
        [0, waist + 0.016, b.belly + 0.012],
        [0.055, (waist * 3 + chest) / 4 + 0.012, b.belly + 0.018],
      ],
      leather,
    );
    oval(0, beltY + 0.025, bellyZ + b.belly + 0.013, 0.057, 0.042, 0.018, gold);
    limb([0, chestY + 0.07, shoulderZ], [0, chestY + 0.24, shoulderZ], 0.14, 0.125, skin);
    // Broche del cuello y costura de los hombros, visibles por encima del cinturón.
    for (const side of [-1, 1]) {
      rod(
        [side * 0.136, chestY + 0.102, shoulderZ + 0.092],
        [side * 0.066, chestY + 0.025, shoulderZ + 0.193],
        0.018,
        0.023,
        armor ? steel : leather,
      );
    }
    oval(0, chestY + 0.017, shoulderZ + 0.199, 0.034, 0.034, 0.019, gold);
    // El equipo se desplaza con la mano que lo sostiene.
    const gripX = Math.max(0.46, chest + 0.16),
      gripZ = 0.24 + shoulderZ;
    for (const side of [-1, 1]) {
      const armed = side === 1 && m.gear !== 'none';
      const shoulderAt = [side * chest * 0.92, chestY + (side === 1 ? 0.012 : -0.013), shoulderZ];
      const elbow = [side * (chest + 0.085 + (ready ? 0.04 : 0)), chestY - 0.26, shoulderZ + (armed ? 0.02 : -0.045)];
      const hand = [
        side * (armed ? gripX : chest + 0.065),
        (armed ? 1.08 : ready ? 1.0 : 0.86) + lift,
        armed ? gripZ : shoulderZ + (ready ? 0.28 : 0.1),
      ];
      rod(shoulderAt, elbow, b.bulk * 1.08, b.bulk * 0.78, m.cloth);
      oval(...shoulderAt, b.bulk * 1.18, b.bulk * 0.98, b.bulk * 1.25, armor ? steel : m.cloth);
      rod(elbow, hand, b.bulk * 0.85, 0.064, armor ? steel : skin);
      oval(...hand, 0.084, 0.099, 0.081, skin);
    }
    const head = 1.87 + lift;
    mesh.offset(0, 0, shoulderZ);
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
      rod([side * 0.058, head + 0.056, 0.232], [side * 0.148, head + 0.065, 0.207], 0.012, 0.018, m.hairColor, 6);
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
    mesh.offset(gripX - 0.48, lift, gripZ - 0.23);
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
    mesh.paint(ctx, size, 0.376);
  }
  const sprites = new Map();
  function cachedSprite(key, model, render) {
    if (!sprites.has(key)) {
      if (sprites.size >= 96) sprites.delete(sprites.keys().next().value);
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 192;
      render(canvas.getContext('2d'), model, 192);
      sprites.set(key, canvas);
    }
    return sprites.get(key);
  }
  function sprite(model) {
    return cachedSprite(JSON.stringify(model), model, draw);
  }
  function creatureSprite(key) {
    return cachedSprite(key, key, root.CreatureMiniatures.draw);
  }
  root.Miniatures = { parts, defaults, initial, clean, draw, sprite, creatureSprite };
})(globalThis);
