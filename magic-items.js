/* Objetos mágicos (reglas 2014): catálogo de los más comunes y sus efectos en la ficha.
   Un objeto mágico es una fila del inventario con `magic`: se copian los datos del catálogo al agregarlo,
   así un objeto propio del DM funciona igual. Solo cuenta si está en el inventario (cantidad > 0) y,
   si pide sintonía, sintonizado (máximo 3). Los textos son resúmenes propios de la mecánica. */
(function (root) {
  'use strict';
  const C = 'común',
    U = 'poco común',
    R = 'raro',
    V = 'muy raro',
    L = 'legendario';
  const plus = (id, name, english, key, rarities, extra = {}) =>
    [1, 2, 3].map(n => ({
      id: `${id}-${n}`,
      name: `${name} +${n}`,
      english: `${english} +${n}`,
      rarity: rarities[n - 1],
      [key]: n,
      ...extra,
    }));
  const focus = (id, name, english, who, extra = {}) =>
    plus(id, name, english, 'spellAttack', [U, R, V], {
      attune: who,
      spellsOf: who,
      note: `+N a las tiradas de ataque de conjuro${extra.dc === false ? '' : ' y a la CD de salvación'} de tus conjuros.`,
      ...extra,
    }).map(x => (extra.dc === false ? x : { ...x, spellDC: x.spellAttack }));
  const belt = (id, name, english, str, rarity) => ({ id, name, english, rarity, attune: true, set: { str } });

  const ITEMS = [
    // Defensa
    {
      id: 'ring-of-protection',
      name: 'Anillo de protección',
      english: 'Ring of Protection',
      rarity: R,
      attune: true,
      ac: 1,
      save: 1,
    },
    {
      id: 'cloak-of-protection',
      name: 'Capa de protección',
      english: 'Cloak of Protection',
      rarity: U,
      attune: true,
      ac: 1,
      save: 1,
    },
    {
      id: 'bracers-of-defense',
      name: 'Brazales de defensa',
      english: 'Bracers of Defense',
      rarity: R,
      attune: true,
      acUnarmored: 2,
      note: 'Solo sin armadura ni escudo.',
    },
    {
      id: 'ioun-stone-protection',
      name: 'Piedra Ioun de protección',
      english: 'Ioun Stone (Protection)',
      rarity: R,
      attune: true,
      ac: 1,
    },
    {
      id: 'stone-of-good-luck',
      name: 'Piedra de la buena suerte',
      english: 'Stone of Good Luck (Luckstone)',
      rarity: U,
      attune: true,
      check: 1,
      save: 1,
    },
    {
      id: 'robe-of-the-archmagi',
      name: 'Túnica del archimago',
      english: 'Robe of the Archmagi',
      rarity: L,
      attune: 'hechicero, brujo o mago',
      unarmoredBase: 15,
      spellAttack: 2,
      spellDC: 2,
      note: 'Sin armadura, CA 15 + DES. Ventaja en salvaciones contra conjuros y efectos mágicos.',
    },
    {
      id: 'sentinel-shield',
      name: 'Escudo centinela',
      english: 'Sentinel Shield',
      rarity: U,
      note: 'Ventaja en iniciativa y en Percepción (Sabiduría).',
    },
    ...plus('armor', 'Armadura', 'Armor', 'armor', [R, V, L], { base: 'armor' }),
    ...plus('shield', 'Escudo', 'Shield', 'shield', [U, R, V], { base: 'shield' }),
    {
      id: 'mithral-armor',
      name: 'Armadura de mithral',
      english: 'Mithral Armor',
      rarity: U,
      base: 'armor',
      note: 'Sin desventaja en Sigilo ni requisito de Fuerza.',
    },
    {
      id: 'adamantine-armor',
      name: 'Armadura de adamantina',
      english: 'Adamantine Armor',
      rarity: U,
      base: 'armor',
      note: 'Los críticos contra vos son golpes normales.',
    },
    {
      id: 'dragon-scale-mail',
      name: 'Cota de escamas de dragón',
      english: 'Dragon Scale Mail',
      rarity: V,
      attune: true,
      base: 'armor',
      armor: 1,
      resist: 'choose',
      note: 'Ventaja en salvaciones contra el aliento de dragones.',
    },
    {
      id: 'armor-of-resistance',
      name: 'Armadura de resistencia',
      english: 'Armor of Resistance',
      rarity: R,
      attune: true,
      base: 'armor',
      resist: 'choose',
    },
    {
      id: 'ring-of-resistance',
      name: 'Anillo de resistencia',
      english: 'Ring of Resistance',
      rarity: R,
      attune: true,
      resist: 'choose',
    },
    {
      id: 'brooch-of-shielding',
      name: 'Broche de escudo',
      english: 'Brooch of Shielding',
      rarity: U,
      attune: true,
      resist: ['force'],
      note: 'Inmune a Proyectil mágico.',
    },
    {
      id: 'ring-of-warmth',
      name: 'Anillo de calor',
      english: 'Ring of Warmth',
      rarity: U,
      attune: true,
      resist: ['cold'],
    },
    {
      id: 'periapt-of-proof-against-poison',
      name: 'Amuleto contra veneno',
      english: 'Periapt of Proof against Poison',
      rarity: R,
      immune: ['poison'],
      conditionImmune: ['Envenenado'],
    },
    {
      id: 'periapt-of-wound-closure',
      name: 'Amuleto de cierre de heridas',
      english: 'Periapt of Wound Closure',
      rarity: U,
      attune: true,
      note: 'Te estabilizás solo a 0 PG; al gastar Dados de Golpe curás el doble.',
    },
    {
      id: 'cloak-of-displacement',
      name: 'Capa de desplazamiento',
      english: 'Cloak of Displacement',
      rarity: R,
      attune: true,
      note: 'Los ataques contra vos tienen desventaja hasta que te impacten; se renueva en tu turno.',
    },
    {
      id: 'cloak-of-elvenkind',
      name: 'Capa élfica',
      english: 'Cloak of Elvenkind',
      rarity: U,
      attune: true,
      note: 'Ventaja en Sigilo; desventaja para verte.',
    },
    {
      id: 'boots-of-elvenkind',
      name: 'Botas élficas',
      english: 'Boots of Elvenkind',
      rarity: U,
      note: 'Pasos silenciosos: ventaja en Sigilo para moverte en silencio.',
    },
    {
      id: 'mantle-of-spell-resistance',
      name: 'Manto de resistencia a conjuros',
      english: 'Mantle of Spell Resistance',
      rarity: R,
      attune: true,
      note: 'Ventaja en salvaciones contra conjuros.',
    },
    {
      id: 'ring-of-evasion',
      name: 'Anillo de evasión',
      english: 'Ring of Evasion',
      rarity: R,
      attune: true,
      charges: { max: 3, regain: '1d3' },
      note: 'Reacción: una carga para superar una salvación de DES fallada.',
    },
    // Características
    {
      id: 'amulet-of-health',
      name: 'Amuleto de salud',
      english: 'Amulet of Health',
      rarity: R,
      attune: true,
      set: { con: 19 },
    },
    {
      id: 'gauntlets-of-ogre-power',
      name: 'Guanteletes de fuerza de ogro',
      english: 'Gauntlets of Ogre Power',
      rarity: U,
      attune: true,
      set: { str: 19 },
    },
    {
      id: 'headband-of-intellect',
      name: 'Diadema del intelecto',
      english: 'Headband of Intellect',
      rarity: U,
      attune: true,
      set: { int: 19 },
    },
    belt(
      'belt-of-hill-giant-strength',
      'Cinturón de fuerza de gigante de las colinas',
      'Belt of Hill Giant Strength',
      21,
      R,
    ),
    belt(
      'belt-of-stone-giant-strength',
      'Cinturón de fuerza de gigante de piedra',
      'Belt of Stone Giant Strength',
      23,
      V,
    ),
    belt(
      'belt-of-frost-giant-strength',
      'Cinturón de fuerza de gigante de escarcha',
      'Belt of Frost Giant Strength',
      23,
      V,
    ),
    belt('belt-of-fire-giant-strength', 'Cinturón de fuerza de gigante de fuego', 'Belt of Fire Giant Strength', 25, V),
    belt(
      'belt-of-cloud-giant-strength',
      'Cinturón de fuerza de gigante de las nubes',
      'Belt of Cloud Giant Strength',
      27,
      L,
    ),
    belt(
      'belt-of-storm-giant-strength',
      'Cinturón de fuerza de gigante de las tormentas',
      'Belt of Storm Giant Strength',
      29,
      L,
    ),
    // Armas
    ...plus('weapon', 'Arma', 'Weapon', 'weapon', [U, R, V], { base: 'weapon' }),
    {
      id: 'flame-tongue',
      name: 'Lengua de fuego',
      english: 'Flame Tongue',
      rarity: R,
      attune: true,
      base: 'weapon',
      extra: '2d6 fuego',
      note: 'Acción adicional para encender o apagar la hoja; el daño extra solo encendida.',
    },
    {
      id: 'frost-brand',
      name: 'Marca de escarcha',
      english: 'Frost Brand',
      rarity: V,
      attune: true,
      base: 'weapon',
      extra: '1d6 frío',
      resist: ['fire'],
    },
    {
      id: 'sun-blade',
      name: 'Hoja solar',
      english: 'Sun Blade',
      rarity: R,
      attune: true,
      base: 'weapon',
      weapon: 2,
      extra: '1d8 radiante (no muertos)',
      note: 'Hoja de luz: daño radiante, sutil.',
    },
    {
      id: 'dragon-slayer',
      name: 'Matadragones',
      english: 'Dragon Slayer',
      rarity: R,
      base: 'weapon',
      weapon: 1,
      extra: '3d6 (dragones)',
    },
    {
      id: 'giant-slayer',
      name: 'Matagigantes',
      english: 'Giant Slayer',
      rarity: R,
      base: 'weapon',
      weapon: 1,
      extra: '2d6 (gigantes)',
    },
    {
      id: 'vicious-weapon',
      name: 'Arma despiadada',
      english: 'Vicious Weapon',
      rarity: R,
      base: 'weapon',
      note: 'Con un 20 natural, +7 al daño.',
    },
    {
      id: 'javelin-of-lightning',
      name: 'Jabalina del relámpago',
      english: 'Javelin of Lightning',
      rarity: U,
      base: 'weapon',
      note: 'Una vez por amanecer: rayo de 120 pies, 4d6 relámpago (DES CD 13, mitad).',
    },
    {
      id: 'dagger-of-venom',
      name: 'Daga de veneno',
      english: 'Dagger of Venom',
      rarity: R,
      base: 'weapon',
      weapon: 1,
      note: 'Una vez por amanecer: 2d10 veneno y envenenado (CON CD 15).',
    },
    // Focos de lanzamiento
    ...focus('rod-of-the-pact-keeper', 'Vara del guardián del pacto', 'Rod of the Pact Keeper', 'brujo'),
    ...focus('wand-of-the-war-mage', 'Varita del mago de guerra', 'Wand of the War Mage', 'lanzador de conjuros', {
      dc: false,
    }),
    ...focus('amulet-of-the-devout', 'Amuleto del devoto', 'Amulet of the Devout', 'clérigo o paladín'),
    ...focus('arcane-grimoire', 'Grimorio arcano', 'Arcane Grimoire', 'mago'),
    ...focus('bloodwell-vial', 'Vial de sangre', 'Bloodwell Vial', 'hechicero'),
    ...focus('moon-sickle', 'Hoz lunar', 'Moon Sickle', 'druida o explorador'),
    ...focus('all-purpose-tool', 'Herramienta multiuso', 'All-Purpose Tool', 'artífice'),
    ...focus('rhythm-makers-drum', 'Tambor del ritmo', "Rhythm-Maker's Drum", 'bardo'),
    // Cargas
    {
      id: 'wand-of-magic-missiles',
      name: 'Varita de proyectiles mágicos',
      english: 'Wand of Magic Missiles',
      rarity: U,
      charges: { max: 7, regain: '1d6+1' },
      note: 'Una carga: Proyectil mágico de nivel 1; +1 nivel por carga extra.',
    },
    {
      id: 'wand-of-web',
      name: 'Varita de telaraña',
      english: 'Wand of Web',
      rarity: U,
      attune: 'lanzador de conjuros',
      charges: { max: 7, regain: '1d6+1' },
      note: 'Una carga: Telaraña (CD 15).',
    },
    {
      id: 'wand-of-fireballs',
      name: 'Varita de bolas de fuego',
      english: 'Wand of Fireballs',
      rarity: R,
      attune: 'lanzador de conjuros',
      charges: { max: 7, regain: '1d6+1' },
      note: 'Una carga: Bola de fuego de nivel 3 (CD 15); +1 nivel por carga extra.',
    },
    {
      id: 'wand-of-lightning-bolts',
      name: 'Varita de relámpagos',
      english: 'Wand of Lightning Bolts',
      rarity: R,
      attune: 'lanzador de conjuros',
      charges: { max: 7, regain: '1d6+1' },
      note: 'Una carga: Relámpago de nivel 3 (CD 15); +1 nivel por carga extra.',
    },
    {
      id: 'staff-of-healing',
      name: 'Bastón de curación',
      english: 'Staff of Healing',
      rarity: R,
      attune: 'bardo, clérigo o druida',
      charges: { max: 10, regain: '1d6+4' },
      note: 'Curar heridas (1 carga por nivel), Restablecimiento menor (2), Sanación masiva (5).',
    },
    {
      id: 'staff-of-the-woodlands',
      name: 'Bastón de los bosques',
      english: 'Staff of the Woodlands',
      rarity: R,
      attune: 'druida',
      spellAttack: 2,
      charges: { max: 10, regain: '1d6+4' },
      note: '+2 al ataque de conjuro. Amistad animal, Hablar con animales, Piel robliza y más con cargas.',
    },
    {
      id: 'staff-of-fire',
      name: 'Bastón de fuego',
      english: 'Staff of Fire',
      rarity: V,
      attune: 'druida, hechicero, brujo o mago',
      resist: ['fire'],
      charges: { max: 10, regain: '1d6+4' },
      note: 'Manos ardientes (1), Bola de fuego (3), Muro de fuego (4).',
    },
    {
      id: 'pearl-of-power',
      name: 'Perla de poder',
      english: 'Pearl of Power',
      rarity: U,
      attune: 'lanzador de conjuros',
      charges: { max: 1, regain: '1' },
      note: 'Acción: recuperás un espacio gastado de nivel 3 o menor.',
    },
    {
      id: 'cape-of-the-mountebank',
      name: 'Capa del charlatán',
      english: 'Cape of the Mountebank',
      rarity: R,
      charges: { max: 1, regain: '1' },
      note: 'Una vez por día: Puerta dimensional como acción.',
    },
    {
      id: 'necklace-of-fireballs',
      name: 'Collar de bolas de fuego',
      english: 'Necklace of Fireballs',
      rarity: R,
      charges: { max: 6, regain: '0' },
      note: 'Cada cuenta: Bola de fuego de nivel 3 (CD 15); no se recuperan.',
    },
    {
      id: 'boots-of-speed',
      name: 'Botas de velocidad',
      english: 'Boots of Speed',
      rarity: R,
      attune: true,
      note: 'Acción adicional: velocidad doble y ataques de oportunidad con desventaja, 10 minutos por día.',
    },
    {
      id: 'winged-boots',
      name: 'Botas aladas',
      english: 'Winged Boots',
      rarity: U,
      attune: true,
      note: 'Velocidad de vuelo igual a la de caminar, hasta 4 horas por día.',
    },
    // Utilidad
    {
      id: 'bag-of-holding',
      name: 'Bolsa de contención',
      english: 'Bag of Holding',
      rarity: U,
      note: 'Hasta 500 libras o 64 pies cúbicos; pesa 15 libras.',
    },
    {
      id: 'immovable-rod',
      name: 'Vara inamovible',
      english: 'Immovable Rod',
      rarity: U,
      note: 'Con un botón queda fija en el aire; aguanta 8.000 libras.',
    },
    {
      id: 'goggles-of-night',
      name: 'Gafas de visión nocturna',
      english: 'Goggles of Night',
      rarity: U,
      note: 'Visión en la oscuridad 60 pies (o +60 si ya tenés).',
    },
    {
      id: 'eyes-of-the-eagle',
      name: 'Ojos de águila',
      english: 'Eyes of the Eagle',
      rarity: U,
      attune: true,
      note: 'Ventaja en Percepción por la vista.',
    },
    {
      id: 'gloves-of-thievery',
      name: 'Guantes del ladrón',
      english: 'Gloves of Thievery',
      rarity: U,
      note: '+5 a Juego de manos y a abrir cerraduras.',
    },
    {
      id: 'hat-of-disguise',
      name: 'Sombrero del disfraz',
      english: 'Hat of Disguise',
      rarity: U,
      attune: true,
      note: 'Disfrazarse a voluntad.',
    },
    {
      id: 'helm-of-comprehending-languages',
      name: 'Yelmo de comprensión de idiomas',
      english: 'Helm of Comprehending Languages',
      rarity: U,
      note: 'Comprensión idiomática a voluntad.',
    },
    {
      id: 'driftglobe',
      name: 'Globo flotante',
      english: 'Driftglobe',
      rarity: U,
      note: 'Luz o Luz del día (una vez por amanecer); flota cerca tuyo.',
    },
    {
      id: 'decanter-of-endless-water',
      name: 'Jarra de agua infinita',
      english: 'Decanter of Endless Water',
      rarity: U,
      note: 'Arroyo, fuente o géiser de agua a voluntad.',
    },
    // Pociones
    {
      id: 'potion-of-healing',
      name: 'Poción de curación',
      english: 'Potion of Healing',
      rarity: C,
      heal: '2d4+2',
      consumable: true,
    },
    {
      id: 'potion-of-greater-healing',
      name: 'Poción de curación mayor',
      english: 'Potion of Greater Healing',
      rarity: U,
      heal: '4d4+4',
      consumable: true,
    },
    {
      id: 'potion-of-superior-healing',
      name: 'Poción de curación superior',
      english: 'Potion of Superior Healing',
      rarity: R,
      heal: '8d4+8',
      consumable: true,
    },
    {
      id: 'potion-of-supreme-healing',
      name: 'Poción de curación suprema',
      english: 'Potion of Supreme Healing',
      rarity: V,
      heal: '10d4+20',
      consumable: true,
    },
  ];

  const ABIL = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  const NUM = [
    'ac',
    'acUnarmored',
    'unarmoredBase',
    'save',
    'check',
    'spellAttack',
    'spellDC',
    'weapon',
    'armor',
    'shield',
  ];
  const byId = id => ITEMS.find(x => x.id === id);
  const rows = s => (s.inventory || []).filter(x => x.magic && x.qty > 0);
  // Activo: en el inventario y, si pide sintonía, sintonizado.
  const active = s => rows(s).filter(x => !x.magic.attune || x.magic.attuned);
  const sum = (s, k) => active(s).reduce((a, x) => a + (Number(x.magic[k]) || 0), 0);
  const attunedCount = s => (s.inventory || []).filter(x => x.magic?.attune && x.magic.attuned).length;

  // Datos que se copian a la fila del inventario.
  function fromCatalog(id, picks = {}) {
    const it = byId(id);
    if (!it) throw Error('Objeto mágico desconocido.');
    const m = { id: it.id, rarity: it.rarity, attune: it.attune || false, attuned: false };
    for (const k of NUM) if (it[k]) m[k] = it[k];
    if (it.set) m.set = { ...it.set };
    if (it.resist === 'choose') {
      if (!picks.resist) throw Error('Elegí el tipo de daño de la resistencia.');
      m.resist = [picks.resist];
    } else if (it.resist) m.resist = it.resist.slice();
    if (it.immune) m.immune = it.immune.slice();
    if (it.conditionImmune) m.conditionImmune = it.conditionImmune.slice();
    if (it.charges) m.charges = { ...it.charges, spent: 0 };
    if (it.heal) m.heal = it.heal;
    if (it.consumable) m.consumable = true;
    if (it.note) m.note = it.note;
    if (it.extra) m.extra = it.extra;
    return m;
  }

  // ---------- Efectos en la ficha ----------
  function setScores(s) {
    const out = {};
    for (const x of active(s))
      for (const [k, v] of Object.entries(x.magic.set || {})) out[k] = Math.max(out[k] || 0, v);
    return out;
  }
  // Bonos de CA. En modo de equipo, la armadura y el escudo mágicos solo cuentan si están equipados.
  function acBonuses(s, { worn = false, shield = false, armorId = '', shieldId = '' } = {}) {
    const out = [];
    for (const x of active(s)) {
      const m = x.magic;
      if (m.ac) out.push({ label: x.name, value: m.ac });
      if (m.acUnarmored && !worn && !shield) out.push({ label: x.name, value: m.acUnarmored });
      if (m.armor && x.id === armorId) out.push({ label: x.name, value: m.armor });
      if (m.shield && x.id === shieldId) out.push({ label: x.name, value: m.shield });
    }
    return out;
  }
  const unarmoredBase = s => active(s).reduce((a, x) => Math.max(a, x.magic.unarmoredBase || 0), 0);
  const save = s => sum(s, 'save');
  const check = s => sum(s, 'check');
  const spellAttack = s => sum(s, 'spellAttack');
  const spellDC = s => sum(s, 'spellDC');
  function defenses(s) {
    const out = { resist: [], immune: [], conditions: [] };
    for (const x of active(s)) {
      for (const t of x.magic.resist || []) out.resist.push([t, x.name]);
      for (const t of x.magic.immune || []) out.immune.push([t, x.name]);
      for (const c of x.magic.conditionImmune || []) out.conditions.push(c);
    }
    return out;
  }

  // Lo que hace el objeto, en una línea.
  function effects(m) {
    const sg = n => (n >= 0 ? '+' : '') + n,
      out = [];
    if (m.weapon) out.push(`${sg(m.weapon)} al ataque y al daño`);
    if (m.armor) out.push(`${sg(m.armor)} a la CA (equipada)`);
    if (m.shield) out.push(`${sg(m.shield)} a la CA (equipado)`);
    if (m.ac) out.push(`${sg(m.ac)} a la CA`);
    if (m.acUnarmored) out.push(`${sg(m.acUnarmored)} a la CA sin armadura ni escudo`);
    if (m.unarmoredBase) out.push(`CA ${m.unarmoredBase} + DES sin armadura`);
    if (m.save) out.push(`${sg(m.save)} a las salvaciones`);
    if (m.check) out.push(`${sg(m.check)} a las pruebas de característica`);
    if (m.spellAttack && m.spellDC) out.push(`${sg(m.spellAttack)} al ataque y a la CD de conjuros`);
    else if (m.spellAttack) out.push(`${sg(m.spellAttack)} al ataque de conjuros`);
    for (const [k, v] of Object.entries(m.set || {})) out.push(`${(root.Rules?.attrs || {})[k] || k} ${v}`);
    for (const t of m.resist || []) out.push('resistencia a ' + (root.Defenses?.label(t) || t));
    for (const t of m.immune || []) out.push('inmunidad a ' + (root.Defenses?.label(t) || t));
    if (m.extra) out.push('+' + m.extra);
    if (m.charges)
      out.push(
        `${m.charges.max} cargas${m.charges.regain !== '0' ? ', recupera ' + m.charges.regain + ' al amanecer' : ''}`,
      );
    if (m.heal) out.push('cura ' + m.heal);
    return out;
  }

  // Descanso largo («al amanecer»): cada objeto con cargas recupera las suyas. Devuelve notas para el registro.
  function dawn(s, roll = (n, d) => Array.from({ length: n }, () => 1 + Math.floor(Math.random() * d))) {
    const notes = [];
    for (const x of s.inventory || []) {
      const c = x.magic?.charges;
      if (!c || !c.spent) continue;
      const m = /^(\d+)(?:d(\d+))?(?:\+(\d+))?$/.exec(String(c.regain));
      if (!m) continue;
      const got = m[2] ? roll(Number(m[1]), Number(m[2])).reduce((a, b) => a + b, 0) + Number(m[3] || 0) : Number(m[1]);
      if (!got) continue;
      const before = c.spent;
      c.spent = Math.max(0, c.spent - got);
      notes.push(`${x.name}: +${before - c.spent} carga(s)`);
    }
    return notes;
  }

  function validate(s) {
    const bad = () => {
      throw Error('Hay un objeto mágico con datos inválidos.');
    };
    const int = (v, a, b) => Number.isInteger(v) && v >= a && v <= b;
    const txt = (v, n) => typeof v === 'string' && v.length <= n;
    for (const x of s.inventory || []) {
      const m = x.magic;
      if (m === undefined) continue;
      if (!m || typeof m !== 'object' || Array.isArray(m)) bad();
      if (m.id !== undefined && !txt(m.id, 100)) bad();
      if (!txt(m.rarity || '', 40)) bad();
      if (!(m.attune === false || m.attune === true || txt(m.attune, 80))) bad();
      if (typeof m.attuned !== 'boolean') bad();
      for (const k of NUM) if (m[k] !== undefined && !int(m[k], -5, 30)) bad();
      if (
        m.set !== undefined &&
        (typeof m.set !== 'object' || Object.entries(m.set).some(([k, v]) => !ABIL.includes(k) || !int(v, 1, 30)))
      )
        bad();
      for (const k of ['resist', 'immune', 'conditionImmune'])
        if (m[k] !== undefined && (!Array.isArray(m[k]) || m[k].length > 13 || m[k].some(v => !txt(v, 40)))) bad();
      if (m.charges !== undefined) {
        const c = m.charges;
        if (!c || !int(c.max, 1, 100) || !int(c.spent, 0, c.max) || !/^\d+(d\d+)?(\+\d+)?$/.test(String(c.regain)))
          bad();
      }
      for (const k of ['heal', 'note', 'extra']) if (m[k] !== undefined && !txt(m[k], k === 'note' ? 500 : 60)) bad();
      if (m.consumable !== undefined && typeof m.consumable !== 'boolean') bad();
    }
    if (attunedCount(s) > 3) throw Error('Solo podés tener 3 objetos sintonizados.');
  }

  root.MagicItems = {
    ITEMS,
    byId,
    fromCatalog,
    rows,
    active,
    attunedCount,
    setScores,
    acBonuses,
    unarmoredBase,
    save,
    check,
    spellAttack,
    spellDC,
    defenses,
    effects,
    dawn,
    validate,
  };
})(typeof window !== 'undefined' ? window : globalThis);
