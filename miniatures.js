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
      ...root.MiniatureAncestries.names,
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
      small: 'Pequeña',
      stocky: 'Rechoncha',
      powerful: 'Alta y robusta',
      massive: 'Maciza',
      longlimbed: 'Brazos largos',
      lanky: 'Alta y delgada',
    },
    ears: { auto: 'Según la raza', round: 'Redondas', elf: 'Puntiagudas', horns: 'Cuernos' },
    hair: {
      crop: 'Corto',
      long: 'Largo',
      crest: 'Cresta',
      bald: 'Rapado',
      curls: 'Rizos',
      bun: 'Rodete',
      braid: 'Trenza lateral',
      ponytail: 'Cola alta',
      bob: 'Melena corta',
      locs: 'Rastas',
      swept: 'Peinado de lado',
      shorn: 'Al ras',
      topknot: 'Moño alto',
      wild: 'Despeinado',
      mane: 'Melena',
    },
    outfit: {
      tunic: 'Túnica corta',
      armor: 'Armadura',
      robe: 'Vestiduras',
      cloak: 'Capa de viaje',
      vestments: 'Vestiduras con estola',
      doublet: 'Jubón',
      coat: 'Abrigo largo',
      tabard: 'Tabardo',
      leathers: 'Cuero de explorador',
    },
    headwear: {
      none: 'Sin cubrir',
      hood: 'Capucha de viaje',
      cowl: 'Capucha profunda',
      hat: 'Sombrero de ala ancha',
      circlet: 'Diadema',
    },
    eyewear: {
      none: 'Ninguno',
      round: 'Anteojos redondos',
      square: 'Anteojos rectangulares',
      monocle: 'Monóculo',
      patch: 'Parche',
    },
    scar: { none: 'Ninguna', brow: 'Sobre la ceja', cheek: 'En la mejilla', claw: 'Tres marcas de garra' },
    beard: { none: 'Ninguna', short: 'Barba corta', braided: 'Barba trenzada', moustache: 'Bigote' },
    neck: {
      none: 'Ninguno',
      scarf: 'Bufanda',
      pendant: 'Medallón',
      skull: 'Símbolo de calavera',
      holy: 'Símbolo solar',
    },
    belt: { none: 'Ninguno', pouch: 'Bolsa de monedas', satchel: 'Morral cruzado', vials: 'Frascos de alquimia' },
    gear: {
      lute: 'Laúd',
      shield: 'Escudo',
      staff: 'Bastón',
      book: 'Grimorio',
      sword: 'Espada',
      axe: 'Hacha',
      greataxe: 'Hacha a dos manos',
      hammer: 'Martillo',
      bow: 'Arco',
      spear: 'Lanza',
      dagger: 'Daga',
      none: 'Manos libres',
    },
    pose: { ready: 'En guardia', rest: 'De pie' },
  };
  const { greataxe, ...oneHandGear } = parts.gear;
  parts.offhand = oneHandGear;
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
    headwear: 'none',
    eyewear: 'none',
    scar: 'none',
    beard: 'none',
    neck: 'none',
    belt: 'none',
    headColor: '#30303d',
    hair: 'swept',
    outfit: 'tunic',
    gear: 'none',
    offhand: 'none',
    pose: 'rest',
    skin: '#bc866b',
    woodColor: '#96633e',
    cloth: '#855844',
    hairColor: '#513a32',
    accent: '#c79a56',
    facing: 20,
  };
  const forgedColors = {
    cableColor: '#8e9da6',
    stoneColor: '#757d82',
    bronzeColor: '#967049',
    darkwoodColor: '#362d2a',
    eyeColor: '#ffc35b',
  };
  const forgedMaterials = {
    woodIron: { core: 'woodColor', label: 'Madera', plates: 'Placas de hierro o acero' },
    iron: { core: 'cableColor', label: 'Cables metálicos', plates: 'Placas de hierro o acero', metal: true },
    stone: { core: 'stoneColor', label: 'Piedra', plates: 'Placas de hierro o acero' },
    mithralBronze: {
      core: 'bronzeColor',
      label: 'Bronce',
      plates: 'Placas de mithral',
      metal: true,
      plateColor: '#adbecd',
    },
    darkwood: { core: 'darkwoodColor', label: 'Madera oscura', plates: 'Placas de hierro o acero' },
  };
  const crestOptions = { ridged: 'Acanalada', blade: 'Hoja central', segmented: 'Segmentada' };
  Object.assign(bodies, {
    small: { ...bodies.short, hip: 0.27, waist: 0.23, chest: 0.3, bulk: 0.108, knee: 0.49, pelvis: 0.83, stance: 0.19 },
    stocky: {
      ...bodies.broad,
      hip: 0.37,
      waist: 0.34,
      chest: 0.49,
      bulk: 0.177,
      knee: 0.56,
      pelvis: 0.96,
      stance: 0.27,
    },
    powerful: { ...bodies.broad, hip: 0.36, chest: 0.46, bulk: 0.176, knee: 0.68, pelvis: 1.08, stance: 0.27 },
    massive: {
      ...bodies.heavy,
      hip: 0.43,
      waist: 0.43,
      chest: 0.53,
      bulk: 0.191,
      knee: 0.63,
      pelvis: 1.06,
      stance: 0.305,
    },
    longlimbed: {
      ...bodies.broad,
      hip: 0.28,
      chest: 0.42,
      bulk: 0.145,
      knee: 0.68,
      pelvis: 1.045,
      stance: 0.25,
      reach: 0.24,
    },
    lanky: { ...bodies.slender, hip: 0.222, chest: 0.28, bulk: 0.091, knee: 0.8, pelvis: 1.19, reach: 0.065 },
  });
  function clean(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const race = Object.hasOwn(parts.race, raw.race) ? raw.race : 'human';
    const A = root.MiniatureAncestries;
    const profile = A.appearance(race);
    const result = { ...defaults, ...profile, race };
    for (const [key, options] of Object.entries(parts))
      if (typeof raw[key] === 'string' && Object.hasOwn(options, raw[key])) result[key] = raw[key];
    if (!Object.hasOwn(A.hairOptions(race, parts.hair), result.hair)) result.hair = profile.hair;
    const face = A.faceOptions(race);
    if (!face.beard) result.beard = 'none';
    if (!face.scar) result.scar = 'none';
    if (face.horns && raw.hornStyle !== 'natural' && Object.hasOwn(face.horns, raw.hornStyle)) {
      result.hornStyle = raw.hornStyle;
      result.ears = 'auto';
    }
    if (A.sizeOptions(race) && raw.size === 'small') result.size = 'small';
    if (A.features[race] && Object.hasOwn(A.features[race], raw.feature)) result.feature = raw.feature;
    if (race === 'dragonborn') {
      if (Object.hasOwn(A.ancestries, raw.ancestry)) result.ancestry = raw.ancestry;
      result.skin = A.ancestries[result.ancestry][0];
    }
    for (const key of ['skin', 'woodColor', 'cloth', 'hairColor', 'accent', 'headColor'])
      if (typeof raw[key] === 'string' && /^#[0-9a-f]{6}$/i.test(raw[key])) result[key] = raw[key].toLowerCase();
    if (race === 'warforged') {
      for (const [key, fallback] of Object.entries(forgedColors)) {
        const value = raw[key];
        if (typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) && value.toLowerCase() !== fallback)
          result[key] = value.toLowerCase();
      }
      if (raw.crest !== 'ridged' && Object.hasOwn(crestOptions, raw.crest)) result.crest = raw.crest;
      if (result.feature === 'stone' && !result.stoneColor)
        result.stoneColor =
          raw.stoneColor == null && result.woodColor !== defaults.woodColor
            ? result.woodColor
            : forgedColors.stoneColor;
      const plates = forgedMaterials[result.feature].plateColor;
      if (plates && !/^#[0-9a-f]{6}$/i.test(raw.skin || '')) result.skin = plates;
    }
    if (Number.isInteger(raw.height) && raw.height >= 50 && raw.height <= 300) result.height = raw.height;
    if (raw.heightMode === 'custom') {
      result.heightMode = 'custom';
      const { min, max } = A.heightRange(race, result.size);
      result.height = Math.min(max, Math.max(min, result.height));
    }
    if (Number.isInteger(raw.facing)) result.facing = ((raw.facing % 360) + 360) % 360;
    return result;
  }

  function initial(sheet) {
    const name = String(sheet.race || '')
      .trim()
      .toLowerCase();
    const catalogRace = root.CampaignData?.races?.find(
      r =>
        r.id === sheet.raceId ||
        (!sheet.raceId && name && [r.name, r.english].some(label => label?.toLowerCase() === name)),
    );
    const raceId = catalogRace?.id || sheet.raceId || '';

    const match = [
      ['gith-githyanki', 'githyanki'],
      ['gith-githzerai', 'githzerai'],
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
      Object.keys(parts.race).find(k => k.toLowerCase() === name || parts.race[k].toLowerCase() === name) ||
      (sheet.race ? 'other' : 'human');
    const rawHeight = (sheet.persona?.height || '').trim().replace(',', '.');
    const h = /^(\d+(?:\.\d+)?)\s*(cm|m)?$/i.exec(rawHeight);
    const parsed = h
      ? Math.round(Number(h[1]) * (h[2]?.toLowerCase() === 'm' || (!h[2] && Number(h[1]) < 4) ? 100 : 1))
      : null;
    const profile = root.MiniatureAncestries.appearance(race);
    return clean({
      ...profile,
      race,
      height: parsed >= 50 && parsed <= 300 ? parsed : profile.height,
      ...(parsed >= 50 && parsed <= 300 && parsed !== profile.height && { heightMode: 'custom' }),
      gear: sheet.classId === 'bard' ? 'lute' : 'none',
    });
  }
  function draw(ctx, raw, size, headwear, closeUp = false) {
    const m = clean(raw);
    if (!m) return;
    const { create, metal } = root.MiniatureMesh;
    const mesh = create(m.facing, ctx);
    const { form, oval, limb, rod } = mesh;
    const A = root.MiniatureAncestries;
    const profile = A.appearance(m.race);
    const statureRange = A.heightRange(m.race, m.size);
    const height = Math.pow(
      Math.min(statureRange.max, Math.max(statureRange.min, m.height)) / statureRange.standard,
      0.45,
    );
    const raceWidth =
      {
        dwarf: 1.22,
        warforged: 1.28,
        halfling: 1.05,
        elf: 0.96,
        orc: 1.08,
        dragonborn: 1.08,
        goliath: 1.2,
        firbolg: 1.07,
        bugbear: 1.05,
        minotaur: 1.06,
        giff: 1.04,
        tabaxi: 0.93,
      }[m.race] || 1;
    const shoulder = { woman: 0.94, man: 1.07 }[m.gender] || 1;
    const ear =
      m.ears === 'auto'
        ? [
            'elf',
            'halfElf',
            'goblin',
            'gnome',
            'orc',
            'halfOrc',
            'githyanki',
            'githzerai',
            'hobgoblin',
            'kender',
            'verdan',
            'fairy',
            'hexblood',
            'firbolg',
          ].includes(m.race)
          ? 'elf'
          : ['tiefling', 'dragonborn'].includes(m.race)
            ? 'horns'
            : root.MiniatureAncestries.animalHead(m.race)
              ? 'sculpted'
              : 'round'
        : m.ears;
    const material = m.race === 'warforged' ? forgedMaterials[m.feature] : null,
      forged = !!material || m.race === 'autognome',
      wood = material && ['woodIron', 'darkwood'].includes(m.feature),
      scales = m.race === 'dragonborn' && A.ancestries[m.ancestry],
      ooze = m.race === 'plasmoid',
      steel = metal(forged ? m.skin : '#9cafb1'),
      skin = scales?.[1] ? metal(m.skin, 0.86, 0.27) : A.skin(m),
      coreColor = material && (m[material.core] || forgedColors[material.core]),
      core = material ? (material.metal ? metal(coreColor, 0.88, 0.36) : coreColor) : forged ? steel : skin,
      fiberAccent = m.feature === 'darkwood' ? '#65584e' : material && !wood ? core : '#c79556',
      rivetMetal = material && !wood ? steel : metal('#986241'),
      leather = '#583f32',
      dark = '#313b40',
      gold = m.accent;
    mesh.base(gold, m.race === 'centaur' ? 1.4 : 1);
    const formScale =
      profile.size === 'small'
        ? 0.76
        : m.size === 'small'
          ? 0.75
          : ['powerful', 'massive', 'longlimbed', 'lanky'].includes(profile.build)
            ? 1.12
            : 1;
    // Race stature scales the sculpt around its feet, leaving the one-square plinth intact.
    const raceStature =
      {
        dwarf: 0.915,
        goliath: 1.21,
        firbolg: 1.13,
        bugbear: 1.12,
        minotaur: 1.11,
        giff: 1.15,
        loxodon: 1.07,
      }[m.race] || 1;
    mesh.figureScale(Math.max(0.76, Math.min(1.18, height)) * formScale * raceStature);
    const stature = bodies[m.build] || bodies.regular;
    const b =
      m.race === 'dwarf'
        ? { ...stature, pelvis: stature.pelvis - 0.12, knee: stature.knee - 0.09, stance: stature.stance + 0.024 }
        : stature;
    const hip = b.hip * raceWidth,
      chest = b.chest * shoulder * raceWidth;
    const waist = b.waist * raceWidth,
      ready = m.pose === 'ready';
    const stride = ready ? 0.19 : 0.065;
    const lift = (b.pelvis - 0.99) * 0.78 - (ready ? 0.04 : 0);
    const chestY = 1.48 + lift,
      shoulderZ = b.lean + (ready ? 0.075 : 0.015);
    const armor = m.outfit === 'armor',
      mantis = m.race === 'thri-kreen',
      robe = m.race !== 'centaur' && ['robe', 'vestments', 'coat'].includes(m.outfit);
    const cloth = ooze ? { color: m.cloth, alpha: 0.32, layered: true } : m.cloth;
    A.body(mesh, m, { hipY: b.pelvis, chestY, shoulderZ });
    if (m.race !== 'centaur')
      for (const side of [-1, 1]) {
        const forward = side === -1;
        const foot = [side * b.stance, 0.26, forward ? stride : -stride];
        const knee = [
          side * (b.stance + 0.012),
          b.knee - (ready && forward ? 0.045 : 0),
          foot[2] + (forward ? 0.105 : 0.025),
        ];
        const thigh = [side * hip * 0.56, b.pelvis + 0.03, -0.025];
        if (A.leg(mesh, m, foot, knee, thigh, b.bulk, skin)) continue;
        oval(foot[0], 0.235, foot[2] + 0.06, 0.11 + b.bulk * 0.22, 0.09, 0.205, forged ? steel : leather);
        limb(foot, knee, b.bulk * 0.75, b.bulk * 0.81, forged ? core : leather);
        oval(
          (foot[0] + knee[0]) / 2,
          (foot[1] + knee[1]) / 2 + 0.028,
          (foot[2] + knee[2]) / 2 - 0.015,
          b.bulk * 0.92,
          (knee[1] - foot[1]) * 0.38,
          b.bulk * 0.95,
          forged ? core : leather,
        );
        limb(knee, thigh, b.bulk * 0.78, b.bulk * 1.3, forged ? core : dark);
        oval(knee[0], knee[1], knee[2] + 0.02, b.bulk * 0.84, 0.09, b.bulk * 0.88, armor ? steel : dark);
        if (forged) {
          for (const stripe of [-1, 1]) {
            const x = stripe * 0.044;
            rod(
              [knee[0] + x, knee[1] + 0.045, knee[2] + b.bulk * 0.66],
              [thigh[0] + x, thigh[1] - 0.04, thigh[2] + b.bulk],
              0.021,
              0.024,
              material?.metal ? core : m.accent,
              5,
            );
          }
          oval(knee[0], knee[1], knee[2] + 0.085, 0.075, 0.079, 0.054, steel);
          oval(knee[0] + side * 0.082, knee[1], knee[2] + 0.036, 0.041, 0.049, 0.05, rivetMetal);
        }
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
    if (!mantis || m.outfit !== 'tunic')
      form(
        0,
        0,
        0,
        [
          ...(m.race !== 'centaur' && ['vestments', 'coat'].includes(m.outfit)
            ? [
                [0.31, hip + 0.164, 0.36, -0.014, 0.018],
                [b.knee, hip + 0.146, 0.34, -0.01, 0.04 + stride * 0.2],
                [b.pelvis - 0.1, hip + 0.068, 0.263, 0, 0.027],
              ]
            : [
                [
                  m.race === 'centaur' ? b.pelvis - 0.035 : robe ? 0.34 : b.pelvis - 0.17,
                  hip + (robe ? 0.14 : 0.055),
                  robe ? 0.31 : 0.22,
                  -0.018,
                  robe ? -0.055 : 0,
                ],
              ]),
          [b.pelvis, hip, 0.2 + (b.hip - 0.28) * 0.55],
          [beltY, waist, b.belly, 0, bellyZ],
          [beltY + 0.075, (waist * 2 + chest) / 3, b.belly * 1.04, 0, bellyZ],
          [chestY - 0.06, chest, 0.19 + b.bulk * 0.3, 0.012, shoulderZ],
          [chestY + 0.045, chest * 0.95, 0.19, 0.012, shoulderZ],
          [chestY + 0.12, 0.18, 0.13, 0, shoulderZ],
        ],
        forged ? (m.outfit === 'armor' ? core : m.cloth) : armor ? steel : cloth,
      );
    if (forged) {
      // Las placas dejan a la vista el material del núcleo en el esternón.
      for (const side of [-1, 1]) {
        form(
          side * chest * 0.45,
          chestY,
          shoulderZ + 0.12,
          [
            [-0.19, chest * 0.22, 0.064, 0, 0.015],
            [-0.06, chest * 0.49, 0.119],
            [0.035, chest * 0.46, 0.115],
            [0.09, chest * 0.28, 0.077],
          ],
          steel,
          8,
        );
        rod(
          [side * 0.04, chestY - 0.16, shoulderZ + 0.192],
          [side * 0.055, chestY + 0.065, shoulderZ + 0.209],
          0.025,
          0.02,
          core,
        );
        for (const strip of [0, 1, 2]) {
          const x = side * (0.03 + 0.034 * strip);
          rod(
            [x, beltY - 0.15, bellyZ + b.belly + 0.021],
            [x, chestY - 0.15, shoulderZ + 0.218],
            0.025,
            0.021,
            strip === 1 ? core : fiberAccent,
            5,
          );
        }
        oval(side * chest * 0.63, chestY - 0.07, shoulderZ + 0.234, 0.028, 0.029, 0.014, metal(gold));
      }
    } else if (armor) {
      // El peto tiene una cresta y faldones separados sobre la tela.
      for (const side of [-1, 1]) {
        const rivet = [side * chest * 0.66, chestY - 0.055, shoulderZ + 0.204];
        mesh.membrane(
          [0, chestY + 0.042, shoulderZ + 0.198],
          rivet,
          [0, beltY + 0.068, bellyZ + b.belly + 0.055],
          steel,
        );
        oval(...rivet, 0.032, 0.032, 0.027, metal(gold));
        for (const row of [0, 1]) {
          const y = beltY - 0.095 - row * 0.059;
          rod(
            [side * 0.06, y, bellyZ + b.belly],
            [side * hip * 0.82, y + 0.05, bellyZ + b.belly * 0.78],
            0.036,
            0.049,
            steel,
            6,
          );
        }
      }
    } else if (robe) {
      // Pliegues amplios para que la silueta y los contrastes sobrevivan al tamaño de ficha.
      for (const side of [-1, 1]) {
        const hem = m.outfit === 'robe' ? 0.35 : 0.31;
        form(
          side * hip * 0.66,
          0,
          0,
          [
            [hem, 0.058, 0.056, side * 0.067, m.outfit === 'robe' ? 0.19 : 0.29],
            [0.68, 0.06, 0.045, side * 0.016, 0.275],
            [beltY - 0.09, 0.025, 0.022, 0, bellyZ + b.belly * 0.78],
          ],
          m.cloth,
          8,
          true,
        );
      }
    }
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
    root.MiniatureWardrobe.clothing(mesh, m, { chest, chestY, shoulderZ, hip, waist, beltY, belly: b.belly, bellyZ });
    limb([0, chestY + 0.07, shoulderZ], [0, chestY + 0.24, shoulderZ], 0.14, 0.125, core);
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
    const twoHand = m.gear === 'greataxe';
    const gripX = Math.max(0.46, chest + 0.16),
      gripZ = 0.24 + shoulderZ;
    for (const side of [-1, 1]) {
      const item = side === 1 ? m.gear : twoHand ? 'none' : m.offhand;
      const sword = item === 'sword',
        armed = item !== 'none';
      const shoulderAt = [side * chest * 0.92, chestY + (side === 1 ? 0.012 : -0.013), shoulderZ];
      const elbow = [side * (chest + 0.085 + (ready ? 0.04 : 0)), chestY - 0.26, shoulderZ + (armed ? 0.02 : -0.045)];
      const hand = [
        side * (armed ? gripX : chest + 0.065),
        (armed ? 1.08 : ready ? 1.0 : 0.86) + lift - (armed ? 0 : b.reach || 0),
        armed ? gripZ : shoulderZ + (ready ? 0.28 : 0.1),
      ];
      if (m.race === 'hadozee' && !armed) {
        elbow[0] += side * 0.14;
        elbow[2] -= 0.13;
        hand[0] += side * 0.27;
        hand[1] += 0.12;
        hand[2] -= 0.18;
      }
      if (mantis && !armed) {
        elbow[0] += side * 0.17;
        elbow[2] += 0.085;
        hand[0] += side * 0.23;
        hand[1] += 0.42;
        hand[2] += 0.26;
      }
      if (twoHand) {
        hand[0] = side === 1 ? 0.17 : -0.19;
        hand[1] = (side === 1 ? 1.22 : 1.01) + lift;
        hand[2] = gripZ + 0.19;
        elbow[2] += 0.12;
      }
      if (sword) {
        elbow[0] += side * (ready ? 0.075 : 0.035);
        elbow[2] -= ready ? 0.005 : 0.07;
        hand[0] += side * (ready ? 0.04 : 0.075);
        hand[1] += ready ? 0.16 : -0.08;
        hand[2] += ready ? 0.115 : 0.025;
      }
      const arm = A.arm(mesh, m, shoulderAt, elbow, hand, b.bulk, skin);
      rod(shoulderAt, elbow, b.bulk * 1.08, b.bulk * 0.78, forged ? core : mantis ? skin : cloth);
      oval(...shoulderAt, b.bulk * 1.18, b.bulk * 0.98, b.bulk * 1.25, armor ? steel : mantis ? skin : cloth);
      if (armor) {
        const pad = [side * (chest + 0.028), chestY - 0.064, shoulderZ + 0.016];
        oval(...pad, b.bulk * 1.24, b.bulk * 0.51, b.bulk * 1.14, steel);
        oval(pad[0], pad[1], pad[2] + b.bulk * 1.02, 0.026, 0.027, 0.02, metal(gold));
      }
      if (!arm) rod(elbow, hand, b.bulk * 0.85, 0.064, forged ? core : armor ? steel : skin);
      if (forged) {
        oval(...elbow, b.bulk * 0.86, 0.078, b.bulk * 0.86, steel);
        oval(elbow[0] + side * 0.096, elbow[1], elbow[2] + 0.045, 0.054, 0.061, 0.049, rivetMetal);
        oval(
          shoulderAt[0] + side * b.bulk * 0.83,
          shoulderAt[1] + 0.013,
          shoulderAt[2] + 0.028,
          0.067,
          0.105,
          0.101,
          steel,
        );
        for (const stripe of wood || material?.metal ? [-1, 1] : []) {
          const dx = stripe * 0.037;
          rod(
            [shoulderAt[0] + dx, shoulderAt[1] - 0.052, shoulderAt[2] + b.bulk * 0.65],
            [elbow[0] + dx, elbow[1] + 0.046, elbow[2] + b.bulk * 0.64],
            0.018,
            0.02,
            fiberAccent,
            5,
          );
        }
        const cuff = hand.map((v, i) => v + (elbow[i] - v) * 0.34);
        rod(cuff, hand, 0.095, 0.076, steel);
      }
      if (sword) {
        // Mano, pomo, cruz y hoja comparten el eje de la muñeca.
        mesh.offset(...hand, side, ready ? 0.55 : 1.89, ready ? 0.28 : 0.25);
        drawSword(mesh, gold, core);
        mesh.offset(0, 0, 0);
      } else {
        oval(...hand, 0.084, 0.099, 0.081, core);
        A.hand(mesh, m, hand, side, skin);
      }
    }
    const head = 1.87 + lift;
    mesh.offset(0, 0, shoulderZ);
    const skull = A.skull(m.race);
    if (!forged)
      form(
        0,
        head,
        0,
        (ooze
          ? [
              [-0.23, 0.14, 0.138, 0.023],
              [-0.12, 0.218, 0.214, 0.041],
              [0.045, 0.257, 0.211, 0.032],
              [0.17, 0.226, 0.199, -0.041],
              [0.26, 0.108, 0.109, -0.081],
            ]
          : [
              [-0.25, 0.115, 0.14, 0, 0.03],
              [-0.16, 0.223, 0.21],
              [0.02, 0.265, 0.24],
              [0.17, 0.24, 0.215],
              [0.24, 0.16, 0.15],
            ]
        ).map(([y, x, z, dx, dz]) => [y * skull[0], x * skull[1], z, dx, dz]),
        skin,
        m.race === 'goliath' || m.race === 'dragonborn' || m.race === 'elf' ? 10 : 14,
      );
    for (const side of forged ? [] : [-1, 1]) {
      if (!A.sculptedEyes(m.race)) oval(side * 0.095, head + 0.015, 0.242, 0.044, 0.026, 0.027, A.eye(m.race, side));
      if (!A.animalHead(m.race) && !ooze)
        rod(
          [side * 0.058, head + 0.056, 0.232],
          [side * 0.148, head + 0.065, 0.207],
          0.012,
          m.race === 'orc' ? 0.037 : 0.018,
          m.hairColor,
          6,
        );
      if (ear === 'elf') {
        const [spread, rise, sweep] = A.ear(m.race);
        form(
          side * 0.222 * skull[1],
          head - 0.015,
          0,
          [
            [0, 0.072, 0.05, 0, 0.057],
            [rise * 0.33, 0.078, 0.044, side * spread * 0.28, 0.049],
            [rise, 0.009, 0.01, side * spread, sweep],
          ],
          skin,
          8,
        );
      } else if (ear !== 'sculpted') oval(side * 0.25, head, 0, 0.062, 0.086, 0.048, skin);
      if (ear === 'horns') {
        const { rise, sweep } = A.hornShape(m.hornStyle);
        form(
          side * 0.16,
          head + 0.16,
          -0.06,
          [
            [0, 0.105, 0.09],
            [0.16 * rise, 0.063, 0.056, side * 0.08, -0.03 * sweep],
            [0.28 * rise, 0.009, 0.009, side * 0.07, -0.08 * sweep],
          ],
          '#d4b996',
          8,
        );
      }
    }
    A.face(mesh, m, head, skin);
    if (
      !forged &&
      !A.animalHead(m.race) &&
      !ooze &&
      !['dragonborn', 'goblin', 'gnome', 'githyanki', 'githzerai', 'yuan-ti'].includes(m.race)
    )
      oval(0, head - 0.052, 0.23, 0.049, 0.065, 0.059, skin);
    if (['orc', 'halfOrc'].includes(m.race))
      for (const side of [-1, 1])
        form(
          side * 0.13,
          head - 0.15,
          0.17,
          [
            [0, m.race === 'orc' ? 0.061 : 0.031, 0.04],
            [m.race === 'orc' ? 0.193 : 0.095, 0.009, 0.009, side * 0.015, 0.043],
          ],
          '#e0cda2',
          8,
        );
    if (forged) {
      form(
        0,
        head,
        0,
        [
          [-0.245, 0.119, 0.145, 0, 0.062],
          [-0.163, 0.229, 0.222],
          [0.067, 0.247, 0.23],
          [0.177, 0.206, 0.182],
          [0.21, 0.129, 0.135],
        ],
        steel,
        8,
      );
      const amber = { color: m.race === 'autognome' ? '#81e1cb' : m.eyeColor || forgedColors.eyeColor, emission: 1.35 };
      for (const side of [-1, 1]) {
        rod([side * 0.041, head + 0.016, 0.206], [side * 0.176, head + 0.049, 0.153], 0.044, 0.039, '#181d23', 5);
        rod([side * 0.059, head + 0.02, 0.239], [side * 0.17, head + 0.046, 0.181], 0.015, 0.012, amber, 5);
        if (m.race === 'autognome') {
          oval(side * 0.11, head + 0.024, 0.209, 0.089, 0.077, 0.043, metal('#8e7961'));
          oval(side * 0.11, head + 0.024, 0.252, 0.057, 0.054, 0.022, amber);
          oval(side * 0.117, head + 0.035, 0.272, 0.018, 0.019, 0.006, '#e0fff0');
        }
        oval(side * 0.2, head + 0.086, 0.134, 0.025, 0.024, 0.019, material && !wood ? steel : metal('#9b6949'));
        rod([side * 0.208, head - 0.052, 0.151], [side * 0.115, head - 0.186, 0.204], 0.045, 0.032, core);
        mesh.membrane(
          [side * 0.196, head - 0.025, 0.177],
          [side * 0.117, head - 0.14, 0.219],
          [side * 0.07, head - 0.058, 0.249],
          steel,
        );
      }
      form(
        0,
        head + 0.061,
        0.2,
        [
          [0, 0.187, 0.047],
          [0.059, 0.135, 0.032],
        ],
        steel,
        6,
      );
      if (m.crest === 'blade') {
        form(
          0,
          head + 0.16,
          -0.045,
          [
            [0, 0.054, 0.227],
            [0.094, 0.043, 0.185],
            [0.208, 0.009, 0.04, 0, -0.075],
          ],
          steel,
          6,
        );
      } else if (m.crest === 'segmented') {
        for (let i = 0; i < 4; i++) {
          const z = 0.136 - i * 0.097;
          form(
            0,
            head + 0.158 + i * 0.012,
            z,
            [
              [0, 0.089, 0.044],
              [0.074 + i * 0.01, 0.066, 0.04],
              [0.103 + i * 0.01, 0.031, 0.035],
            ],
            steel,
            6,
          );
        }
      } else {
        for (const x of [-0.062, 0, 0.062])
          rod([x, head + 0.174, 0.161], [x, head + 0.267, -0.157], 0.029, 0.018, steel, 5);
      }
    }
    const covered = ['hood', 'cowl', 'hat'].includes(m.headwear);
    if (!forged && m.hair !== 'bald' && !covered) {
      A.hair(mesh, m, head);
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
    }
    if (!covered) A.crown(mesh, m, head, skin);
    root.MiniatureWardrobe.face(mesh, m, head, covered);
    headwear?.(mesh, head);
    for (const [side, item] of [
      [1, m.gear],
      [-1, twoHand ? 'none' : m.offhand],
    ]) {
      if (item === 'none' || item === 'sword') continue;
      if (twoHand && item === 'greataxe') {
        mesh.offset(0.17, 1.22 + lift, gripZ + 0.19, 1, 1.04);
        drawGreataxe(mesh);
        continue;
      }
      mesh.offset(side * (gripX - 0.48), lift, gripZ - 0.23, side);
      drawItem(mesh, item, m.cloth, gold);
    }
    mesh.offset(0, 0, 0);
    if (closeUp) mesh.paint(ctx, size, 1.04, [0, head, shoulderZ]);
    else mesh.paint(ctx, size, 0.376);
  }
  function drawSword(mesh, gold, handColor) {
    const { rod, oval, form } = mesh;
    rod([0, -0.134, 0], [0, 0.14, 0], 0.034, 0.032, '#583f32');
    const { metal } = root.MiniatureMesh;
    oval(0, -0.144, 0, 0.053, 0.046, 0.051, metal(gold));
    for (const side of [-1, 1]) rod([0, 0.14, 0], [side * 0.17, 0.112, 0], 0.033, 0.022, metal(gold));
    form(
      0,
      0.153,
      0,
      [
        [0, 0.082, 0.033],
        [0.095, 0.073, 0.036],
        [0.65, 0.051, 0.022],
        [0.85, 0.002, 0.002],
      ],
      metal('#b8c7cf'),
      4,
    );
    oval(-0.029, 0, -0.015, 0.081, 0.088, 0.067, handColor);
    for (const y of [-0.049, -0.007, 0.035]) rod([-0.052, y, 0.038], [0.03, y + 0.008, 0.035], 0.023, 0.022, handColor);
    rod([0.037, 0.058, -0.02], [0.043, 0.018, 0.031], 0.03, 0.024, handColor);
  }
  function drawGreataxe(mesh) {
    const { rod, membrane } = mesh;
    const steel = root.MiniatureMesh.metal('#aeb6b6', 0.83);
    rod([0, -0.66, 0], [0, 0.65, 0], 0.034, 0.037, '#5e4230', 7);
    const hub = [0, 0.45, 0.028];
    for (const s of [-1, 1]) {
      const lower = [s * 0.27, 0.25, 0.02],
        edge = [s * 0.4, 0.46, 0.02],
        tip = [s * 0.37, 0.71, 0.02];
      membrane(hub, lower, edge, steel);
      membrane(hub, edge, tip, steel);
      rod(lower, edge, 0.012, 0.011, root.MiniatureMesh.metal('#dee1db'), 5);
      rod(edge, tip, 0.011, 0.008, root.MiniatureMesh.metal('#dee1db'), 5);
    }
  }
  function drawItem(mesh, gear, cloth, gold) {
    const { form, oval, limb } = mesh,
      leather = '#583f32',
      steel = '#9cafb1';
    if (gear === 'staff') {
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
    } else if (gear === 'shield') {
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
        root.MiniatureMesh.metal(gold),
        10,
      );
      oval(0.45, 1.08, 0.346, 0.164, 0.197, 0.036, cloth);
      oval(0.45, 1.095, 0.381, 0.055, 0.058, 0.027, root.MiniatureMesh.metal(gold));
      for (const side of [-1, 1])
        oval(0.45 + side * 0.165, 1.19, 0.328, 0.02, 0.023, 0.019, root.MiniatureMesh.metal(gold));
    } else if (gear === 'lute') {
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
    } else if (gear === 'book') {
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
    if (['dagger', 'spear', 'axe', 'hammer'].includes(gear)) {
      const x = 0.5,
        z = 0.23;
      const pole = gear === 'spear';
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
      if (gear === 'dagger') {
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
            [0.2, 0.055, 0.027],
            [0.32, 0.003, 0.003],
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
      if (gear === 'axe')
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
      if (gear === 'hammer') {
        form(
          x,
          1.27,
          z,
          [
            [0, 0.18, 0.08],
            [0.05, 0.263, 0.126],
            [0.18, 0.263, 0.126],
            [0.22, 0.18, 0.08],
          ],
          root.MiniatureMesh.metal(steel),
          8,
        );
        for (const side of [-1, 1])
          oval(x + side * 0.15, 1.387, z + 0.087, 0.052, 0.054, 0.035, root.MiniatureMesh.metal(gold));
      }
    }
    if (gear === 'bow') {
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
  }
  function drawFace(ctx, raw, size) {
    draw(ctx, raw, size, null, true);
  }
  const sprites = new Map();
  // Pixel style: board figures are rasterised at `pixelDensity` art pixels per square, then blown up
  // to the board's 64 px per square with nearest-neighbour sampling. 0 keeps the smooth renderer.
  let pixelDensity = 0;
  function setPixelStyle(density) {
    const next = [16, 32].includes(density) ? density : 0;
    if (next === pixelDensity) return;
    pixelDensity = next;
    sprites.clear();
    boardPacks.clear();
  }
  function blowUp(canvas) {
    const f = Math.round(pixelsPerSquare / pixelDensity);
    const big = document.createElement('canvas');
    big.width = canvas.width * f;
    big.height = canvas.height * f;
    const g = big.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(canvas, 0, 0, big.width, big.height);
    if (canvas.anchor) big.anchor = { x: canvas.anchor.x * f, y: canvas.anchor.y * f };
    return big;
  }
  function cachedSprite(key, model, render, footprint, descriptor) {
    if (!sprites.has(key)) {
      if (sprites.size >= 96) sprites.delete(sprites.keys().next().value);
      let canvas = document.createElement('canvas');
      canvas.width = canvas.height = 256;
      const ctx = canvas.getContext('2d');
      ctx.miniBoard = Boolean(footprint);
      ctx.miniRotation = descriptor?.rotation || 0;
      ctx.miniLayer = descriptor?.layer;
      if (footprint && pixelDensity) ctx.miniPixel = pixelDensity;
      render(ctx, model, footprint ? pixelsPerSquare * footprint : 256, descriptor);
      if (footprint && pixelDensity) canvas = blowUp(canvas);
      sprites.set(key, canvas);
    }
    return sprites.get(key);
  }
  function sprite(model, footprint) {
    return cachedSprite(JSON.stringify(model) + ':' + (footprint || ''), model, draw, footprint);
  }
  function creatureSprite(key, footprint, descriptor = { footprint }) {
    return cachedSprite(
      JSON.stringify([key, footprint, descriptor.age, descriptor.variant, descriptor.rotation, descriptor.layer]),
      key,
      root.CreatureMiniatures.draw,
      footprint,
      descriptor,
    );
  }
  function appearanceKey(model) {
    const { facing, heightMode, ...appearance } = clean(model);
    return JSON.stringify(appearance);
  }
  const previousHeights = {
    dwarf: [135, 136],
    goliath: [170, 224],
    firbolg: [170, 211],
    bugbear: [170, 200],
    minotaur: [197, 204],
    giff: [170, 215],
    loxodon: [205],
  };
  function boardAppearance(raw) {
    const model = clean(raw);
    if (!model) return null;
    const baseline = root.MiniatureAncestries.appearance(model.race);
    const legacy = !model.heightMode && previousHeights[model.race]?.includes(model.height);
    if (legacy) {
      model.height = baseline.height;
      if (['regular', 'broad', 'short'].includes(model.build)) model.build = baseline.build;
    }
    if (model.size === 'small') {
      model.build = 'small';
      if (!model.heightMode && model.height === defaults.height && baseline.size === 'small')
        model.height = baseline.height;
    }
    const { min, max, standard } = root.MiniatureAncestries.heightRange(model.race, model.size);
    if (!model.heightMode && baseline.size !== model.size && model.height === baseline.height) model.height = standard;
    model.height = Math.min(max, Math.max(min, model.height));
    return model;
  }
  const { pixelsPerSquare } = root.MiniatureMesh;
  const boardAngles = [0, 45, 90, 135, 180, 225, 270, 315];
  let terrainLoad;
  function loadTerrainArt() {
    if (root.BoardArt) return Promise.resolve(root.BoardArt);
    terrainLoad ||= new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = './board-art.js';
      script.onload = () => resolve(root.BoardArt);
      script.onerror = () => {
        script.remove();
        reject(Error('No se pudo cargar el terreno del tablero.'));
      };
      document.head.append(script);
    }).catch(error => {
      terrainLoad = null;
      throw error;
    });
    return terrainLoad;
  }
  const linear = Array.from({ length: 256 }, (_, n) => {
    const value = n / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const luminance = (r, g, b) => 0.2126 * linear[r] + 0.7152 * linear[g] + 0.0722 * linear[b];
  const backgrounds = [
    [83, 88, 97],
    [86, 123, 63],
    [101, 98, 93],
  ].map(rgb => luminance(...rgb));
  function needsRim(ctx, figure) {
    const height = Math.floor(figure.anchor.y - pixelsPerSquare * 0.37);
    if (height < 1) return false;
    const { data } = ctx.getImageData(0, 0, figure.width, height);
    const matches = backgrounds.map(() => 0);
    let solid = 0;
    for (let i = 0; i < data.length; i += 16) {
      if (data[i + 3] < 128) continue;
      const value = luminance(data[i], data[i + 1], data[i + 2]);
      solid++;
      for (let j = 0; j < backgrounds.length; j++) {
        const surface = backgrounds[j];
        if (value < 0.035 || (Math.max(value, surface) + 0.05) / (Math.min(value, surface) + 0.05) < 1.6) matches[j]++;
      }
    }
    return solid > 0 && matches.some(n => n / solid >= 0.55);
  }
  function withContactShadow(figure) {
    const radius = pixelsPerSquare * 0.63;
    const dx = pixelsPerSquare * 0.055,
      dy = pixelsPerSquare * 0.06;
    const { x, y } = figure.anchor;
    const left = Math.min(-x, Math.floor(dx - radius)),
      top = Math.min(-y, Math.floor(dy - radius * 0.65));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(figure.width - x, Math.ceil(dx + radius)) - left;
    canvas.height = Math.max(figure.height - y, Math.ceil(dy + radius * 0.65)) - top;
    const ctx = canvas.getContext('2d');
    if (pixelDensity) {
      // Hard-edged two-step shadow on the art-pixel grid.
      const f = Math.round(pixelsPerSquare / pixelDensity);
      const cx = dx - left,
        cy = dy - top;
      for (const [r, alpha] of [
        [radius * 0.92, 0.18],
        [radius * 0.62, 0.16],
      ]) {
        ctx.fillStyle = `rgba(0,0,0,${alpha})`;
        for (let row = -r * 0.65; row <= r * 0.65; row += f) {
          const half = Math.floor((r * Math.sqrt(Math.max(0, 1 - (row / (r * 0.65)) ** 2))) / f) * f;
          ctx.fillRect(Math.round((cx - half) / f) * f, Math.round((cy + row) / f) * f, half * 2, f);
        }
      }
      ctx.drawImage(figure, -x - left, -y - top);
      return { image: canvas, anchor: { x: -left, y: -top }, sculpt: figure };
    }
    ctx.save();
    ctx.translate(dx - left, dy - top);
    ctx.scale(1, 0.65);
    const shadow = ctx.createRadialGradient(0, 0, radius * 0.15, 0, 0, radius);
    shadow.addColorStop(0, 'rgba(0,0,0,0.35)');
    shadow.addColorStop(0.65, 'rgba(0,0,0,0.24)');
    shadow.addColorStop(1, 'transparent');
    ctx.fillStyle = shadow;
    ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
    ctx.restore();
    ctx.drawImage(figure, -x - left, -y - top);
    return { image: canvas, anchor: { x: -left, y: -top }, sculpt: figure };
  }
  const boardPacks = new Map();
  function boardPack(raw) {
    const model = boardAppearance(raw);
    if (!model) return null;
    const key = JSON.stringify(model) + ':' + pixelDensity;
    if (boardPacks.has(key)) return boardPacks.get(key);
    if (boardPacks.size >= 64) boardPacks.delete(boardPacks.keys().next().value);
    let guarded;
    const render = angle => {
      const figure = document.createElement('canvas');
      const ctx = figure.getContext('2d', { willReadFrequently: true });
      ctx.miniBoard = true;
      ctx.miniRotation = angle;
      if (pixelDensity) {
        // The pixel renderer outlines every figure, so it never needs the rim boost.
        ctx.miniPixel = pixelDensity;
        draw(ctx, model, pixelsPerSquare);
        return withContactShadow(blowUp(figure));
      }
      if (guarded) ctx.miniRim = 104;
      draw(ctx, model, pixelsPerSquare);
      if (guarded === undefined) {
        guarded = needsRim(ctx, figure);
        if (guarded) {
          ctx.miniRim = 104;
          draw(ctx, model, pixelsPerSquare);
        }
      }
      return withContactShadow(figure);
    };
    const front = render(0);
    const rotations = {};
    for (const angle of boardAngles) {
      let frame = angle === 0 ? front : null;
      Object.defineProperty(rotations, String(angle).padStart(3, '0'), {
        enumerable: true,
        get: () => (frame ||= render(angle)),
      });
    }
    const pack = { ...front, size: model.size, pixelsPerSquare, shadow: true, rotations, rimBoosted: guarded };
    boardPacks.set(key, pack);
    return pack;
  }
  root.Miniatures = {
    parts,
    defaults,
    forgedColors,
    forgedMaterials,
    crestOptions,
    boardCell: pixelsPerSquare,
    loadTerrainArt,
    initial,
    clean,
    draw,
    drawFace,
    drawGreataxe,
    sprite,
    creatureSprite,
    appearanceKey,
    boardAppearance,
    boardPack,
    setPixelStyle,
    get pixelDensity() {
      return pixelDensity;
    },
  };
})(globalThis);
