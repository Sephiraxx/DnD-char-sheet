const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../library-core.js');

// Página de prueba: cada línea es [texto, x, y, tamaño, fuente]; varios tramos de una línea van en un arreglo.
function page(lines, w = 600, h = 800) {
  const items = [];
  for (const [parts, x, y, size = 8] of lines) {
    let cx = x;
    for (const [s, f] of Array.isArray(parts) ? parts : [[parts, 'body']]) {
      const width = s.length * size * 0.45;
      items.push({ s, x: cx, y, w: width, h: size, f });
      cx += width + size * 0.3;
    }
  }
  return { w, h, items };
}

const BLOCK_ES = [
  ['GOBLIN DE PRUEBA', 40, 100, 12, 'title'],
  [[['Humanoide Pequeño (goblinoide), neutral malvado', 'type']], 40, 114],
  [
    [
      ['Clase de Armadura:', 'label'],
      ['15 (armadura de cuero, escudo)', 'body'],
    ],
    40,
    126,
  ],
  [
    [
      ['Puntos de golpe:', 'label'],
      ['7 (2d6)', 'body'],
    ],
    40,
    136,
  ],
  [
    [
      ['Velocidad:', 'label'],
      ['30 pies', 'body'],
    ],
    40,
    146,
  ],
  [[['FUE DES CON INT SAB CAR', 'label']], 40, 158],
  [[['8 (-1) 14 (+2) 10 (+0) 10 (+0) 8 (-1) 8 (-1)', 'body']], 40, 168],
  [
    [
      ['Habilidades:', 'label'],
      ['Sigilo +6', 'body'],
    ],
    40,
    180,
  ],
  [
    [
      ['Sentidos:', 'label'],
      ['visión en la oscuridad 60 pies', 'body'],
    ],
    40,
    190,
  ],
  [
    [
      ['Idiomas:', 'label'],
      ['común, goblin', 'body'],
    ],
    40,
    200,
  ],
  [
    [
      ['Desafío:', 'label'],
      ['1/4 (50 PX)', 'body'],
    ],
    40,
    210,
  ],
  [
    [
      ['Huida ágil.', 'name'],
      ['El goblin puede usar Destrabarse', 'body'],
    ],
    40,
    222,
  ],
  [[['o Esconderse como acción adicional.', 'body']], 40, 232],
  [[['ACCIONES', 'label']], 40, 246],
  [
    [
      ['Cimitarra.', 'name'],
      ['Ataque con arma cuerpo a cuerpo: +4 al', 'body'],
    ],
    40,
    258,
  ],
  // La acción sigue en la columna derecha, después del número de página.
  [[['42', 'title']], 40, 780, 12],
  [[['ataque, alcance 5 pies, un objetivo. Impacto: 5 (1d6 + 2)', 'body']], 320, 100],
  [[['de daño cortante.', 'body']], 320, 110],
  [
    [
      ['Arco corto.', 'name'],
      ['Ataque con arma a distancia: +4 al ataque,', 'body'],
    ],
    320,
    122,
  ],
  [[['alcance 80/320 pies. Impacto: 5 (1d6 + 2) de daño perforante.', 'body']], 320, 132],
  // Ambientación de otra criatura (otro tamaño): no es parte del bloque.
  ['Los goblins viven en cuevas oscuras y odian a los enanos.', 320, 200, 10, 'lore'],
];

test('lee un bloque en español que sigue en la otra columna', () => {
  const lines = L.readLines([page(BLOCK_ES)]);
  const [m, ...rest] = L.monsters(lines, { prefix: 'libro' });
  assert.equal(rest.length, 0);
  assert.equal(m.name, 'Goblin de prueba');
  assert.equal(m.id, 'libro:goblin-de-prueba');
  assert.equal(m.size, 'Pequeño');
  assert.equal(m.type, 'humanoide (goblinoide)');
  assert.equal(m.ac, 15);
  assert.equal(m.hp, 7);
  assert.equal(m.hd, '2d6');
  assert.deepEqual(m.ab, [8, 14, 10, 10, 8, 8]);
  assert.equal(m.cr, 0.25);
  assert.equal(m.xp, 50);
  assert.equal(m.traits[0][0], 'Huida ágil');
  assert.match(m.traits[0][1], /acción adicional\.$/);
  assert.equal(m.actions.length, 2);
  assert.equal(m.actions[0].n, 'Cimitarra');
  assert.equal(m.actions[0].atk, 4);
  assert.deepEqual(m.actions[0].dmg, [['1d6+2', 'cortante']]);
  assert.deepEqual(m.actions[1].dmg, [['1d6+2', 'perforante']]);
  assert.ok(!m.actions.some(a => /cuevas/.test(a.d)), 'la ambientación no entra');
  assert.equal(m.issues, undefined);
});

test('lee un bloque en inglés con salvación y acciones legendarias', () => {
  const lines = L.readLines([
    page([
      ['Test Drake', 40, 100, 14, 'title'],
      [[['Large dragon, chaotic evil', 'type']], 40, 116],
      [
        [
          ['Armor Class', 'label'],
          ['17 (natural armor)', 'body'],
        ],
        40,
        128,
      ],
      [
        [
          ['Hit Points', 'label'],
          ['110 (13d10 + 39)', 'body'],
        ],
        40,
        138,
      ],
      [
        [
          ['Speed', 'label'],
          ['40 ft., fly 80 ft.', 'body'],
        ],
        40,
        148,
      ],
      [[['STR DEX CON INT WIS CHA', 'label']], 40, 160],
      [[['19 (+4) 10 (+0) 17 (+3) 12 (+1) 11 (+0) 15 (+2)', 'body']], 40, 170],
      [
        [
          ['Saving Throws', 'label'],
          ['Dex +3, Wis +3', 'body'],
        ],
        40,
        182,
      ],
      [
        [
          ['Challenge', 'label'],
          ['7 (2,900 XP)', 'body'],
        ],
        40,
        192,
      ],
      [[['Actions', 'label']], 40, 206],
      [
        [
          ['Bite.', 'name'],
          ['Melee Weapon Attack: +7 to hit, reach 10 ft., one target.', 'body'],
        ],
        40,
        218,
      ],
      [[['Hit: 15 (2d10 + 4) piercing damage plus 4 (1d8) fire damage.', 'body']], 40, 228],
      [
        [
          ['Fire Breath (Recharge 5-6).', 'name'],
          ['Each creature in a 30-foot cone must make a DC 14', 'body'],
        ],
        40,
        240,
      ],
      [
        [
          [
            'Dexterity saving throw, taking 35 (10d6) fire damage on a failed save, or half as much on a success.',
            'body',
          ],
        ],
        40,
        250,
      ],
      [[['Legendary Actions', 'label']], 40, 264],
      [[['The drake can take 3 legendary actions.', 'body']], 40, 276],
      [
        [
          ['Tail.', 'name'],
          ['The drake makes a tail attack.', 'body'],
        ],
        40,
        288,
      ],
    ]),
  ]);
  const [m] = L.monsters(lines);
  assert.equal(m.name, 'Test Drake');
  assert.equal(m.size, 'Grande');
  assert.equal(m.type, 'dragón');
  assert.equal(m.speed, '40 pies, fly 80 pies');
  assert.equal(m.saves, 'DES +3, SAB +3');
  assert.equal(m.xp, 2900);
  assert.deepEqual(m.actions[0].dmg, [
    ['2d10+4', 'perforante'],
    ['1d8', 'fuego'],
  ]);
  assert.deepEqual(m.actions[1].dc, ['dex', 14, 'half']);
  assert.equal(m.legendary.length, 1);
  assert.equal(m.legendary[0].n, 'Tail');
});

test('arregla errores del reconocimiento de texto en números', () => {
  assert.deepEqual(L.parseAbilities(['1 6 (+3) 1 O (+O) 12 (+1) S (-3) 17 (+3) l2 (+1)']), [16, 10, 12, 5, 17, 12]);
  assert.deepEqual(L.parseCR('1 7 (18 000 PX)'), { cr: 17, xp: 18000 });
  assert.deepEqual(L.parseAction('Mordisco', 'Impacto: 8 (1d1 O + 3) de daño cortante.').dmg, [['1d10+3', 'cortante']]);
});

test('conjuros: encabezado, nivel, escuela y niveles superiores', () => {
  const lines = L.readLines([
    page([
      ['BOLA DE PRUEBA', 40, 100, 10, 'title'],
      [[['Evocación de nivel 3', 'school']], 40, 112],
      [
        [
          ['Tiempo de lanzamiento:', 'label'],
          ['1 acción', 'body'],
        ],
        40,
        124,
      ],
      [
        [
          ['Alcance:', 'label'],
          ['150 pies', 'body'],
        ],
        40,
        134,
      ],
      [
        [
          ['Componentes:', 'label'],
          ['V, S, M (guano)', 'body'],
        ],
        40,
        144,
      ],
      [
        [
          ['Duración:', 'label'],
          ['Concentración, hasta 1 minuto', 'body'],
        ],
        40,
        154,
      ],
      [[['Una esfera de luz estalla. Cada criatura hace una salvación de Destreza.', 'body']], 40, 166],
      [
        [
          ['A niveles superiores.', 'name'],
          ['El daño aumenta 1d6 por nivel.', 'body'],
        ],
        40,
        176,
      ],
      ['SUSURRO DE PRUEBA', 40, 200, 10, 'title'],
      [[['Truco de encantamiento', 'school']], 40, 212],
      [
        [
          ['Tie mpo de lanzam iento:', 'label'],
          ['1 acción', 'body'],
        ],
        40,
        224,
      ],
      [
        [
          ['Alcance:', 'label'],
          ['60 pies', 'body'],
        ],
        40,
        234,
      ],
      [
        [
          ['Componentes:', 'label'],
          ['V', 'body'],
        ],
        40,
        244,
      ],
      [
        [
          ['Duración:', 'label'],
          ['Instantáneo', 'body'],
        ],
        40,
        254,
      ],
      [[['Le susurrás algo a una criatura.', 'body']], 40, 266],
    ]),
  ]);
  const [a, b] = L.spells(lines, { prefix: 'p' });
  assert.equal(a.name, 'Bola de prueba');
  assert.equal(a.level, 3);
  assert.equal(a.school, 'Evocación');
  assert.equal(a.range, '150 pies');
  assert.ok(a.concentration);
  assert.match(a.text, /^Una esfera/);
  assert.match(a.higher, /1d6 por nivel/);
  assert.equal(b.level, 0, 'truco con etiqueta partida por el reconocimiento');
  assert.equal(b.school, 'Encantamiento');
});

test('objetos mágicos: rareza y sintonización', () => {
  const lines = L.readLines([
    page([
      ['ANILLO DE PRUEBA', 40, 100, 10, 'title'],
      [[['Anillo, raro (requiere sintonización)', 'type']], 40, 112],
      [[['Mientras lo llevás puesto, ganás +1 a la CA.', 'body']], 40, 124],
      ['Wand of Testing', 40, 150, 10, 'title'],
      [[['Wand, very rare', 'type']], 40, 162],
      [[['This wand has 7 charges.', 'body']], 40, 174],
    ]),
  ]);
  const [a, b] = L.items(lines);
  assert.equal(a.name, 'Anillo de prueba');
  assert.equal(a.rarity, 'raro');
  assert.ok(a.attunement);
  assert.equal(b.rarity, 'muy raro');
  assert.ok(!b.attunement);
});

test('vocabulario: une palabras partidas y corrige nombres conocidos', () => {
  const v = L.vocabulary(['Luces danzantes instantáneo criaturas acción'], ['Luces danzantes', 'Alosaurio']);
  assert.equal(
    L.mergeSplits('Luce s da nzantes, 1ns ta ntá neo; 1 acción a 60 pies', v),
    'Luces danzantes, instantáneo; 1 acción a 60 pies',
  );
  const lines = L.readLines([
    page([
      ['ALO SAURIO', 40, 100, 12, 'title'],
      [[['Bestia Grande, sin alineamiento', 'type']], 40, 114],
      [
        [
          ['Clase de Armadura:', 'label'],
          ['13', 'body'],
        ],
        40,
        126,
      ],
      [
        [
          ['Puntos de golpe:', 'label'],
          ['51 (6d10 + 18)', 'body'],
        ],
        40,
        136,
      ],
      [[['FUE DES CON INT SAB CAR', 'label']], 40, 148],
      [[['19 (+4) 13 (+1) 17 (+3) 2 (-4) 12 (+1) 5 (-3)', 'body']], 40, 158],
      [
        [
          ['Desafío:', 'label'],
          ['2 (450 PX)', 'body'],
        ],
        40,
        170,
      ],
      [[['ACCIONES', 'label']], 40, 182],
      [
        [
          ['Mordisco.', 'name'],
          ['Ataque con arma cuerpo a cuerpo: +6 al ataque. Impacto: 15 (2d10 + 4) de daño perforante.', 'body'],
        ],
        40,
        194,
      ],
    ]),
  ]);
  assert.equal(L.monsters(lines, { vocab: v })[0].name, 'Alosaurio');
});

test('reglas 2024 (en y es): CA con iniciativa, filas MOD/SALV, inmunidades juntas, VD con PX', () => {
  const en = [
    ['SPARK HOUND', 40, 100, 12, 'title'],
    ['Medium Elemental, Neutral', 40, 114],
    [
      [
        ['AC', 'label'],
        ['14 Initiative +3 (13)', 'body'],
      ],
      40,
      126,
    ],
    [
      [
        ['HP', 'label'],
        ['33 (6d8 + 6)', 'body'],
      ],
      40,
      136,
    ],
    [
      [
        ['Speed', 'label'],
        ['40 ft., Fly 30 ft. (hover)', 'body'],
      ],
      40,
      146,
    ],
    ['MOD SAVE MOD SAVE', 40, 156],
    ['Str 12 +1 +1 Int 6 -2 -2', 40, 166],
    ['Dex 16 +3 +5 Wis 12 +1 +1', 40, 176],
    ['Con 13 +1 +1 Cha 8 -1 -1', 40, 186],
    [
      [
        ['Immunities', 'label'],
        ['Lightning, Poison; Poisoned', 'body'],
      ],
      40,
      196,
    ],
    [
      [
        ['CR', 'label'],
        ['2 (XP 450; PB +2)', 'body'],
      ],
      40,
      206,
    ],
    ['TRAITS', 40, 218, 10, 'title'],
    [
      [
        ['Flicker.', 'name'],
        ['The hound sheds dim light in a 10-foot radius.', 'body'],
      ],
      40,
      230,
    ],
    ['ACTIONS', 40, 242, 10, 'title'],
    [
      [
        ['Shock Bite.', 'name'],
        ['Melee Attack Roll: +5, reach 5 ft. Hit: 8 (2d4 + 3) Lightning damage.', 'body'],
      ],
      40,
      254,
    ],
    [
      [
        ['Crackle.', 'name'],
        ['Dexterity Saving Throw: DC 12, each creature in a 10-foot Emanation. Failure: 7 (2d6) Thunder', 'body'],
      ],
      40,
      266,
    ],
    ['damage. Success: Half damage.', 40, 276],
  ];
  const [m] = L.monsters(L.readLines([page(en)]), { prefix: 't' });
  assert.equal(m.name, 'Spark hound');
  assert.equal(m.ac, 14);
  assert.equal(m.hp, 33);
  assert.deepEqual(m.ab, [12, 16, 13, 6, 12, 8]);
  assert.equal(m.saves, 'DES +5');
  assert.equal(m.imm, 'Lightning, Poison');
  assert.equal(m.cimm, 'Poisoned');
  assert.equal(m.cr, 2);
  assert.equal(m.xp, 450);
  assert.equal(m.speed, '40 pies, Fly 30 pies (hover)');
  assert.deepEqual(
    m.traits.map(t => t[0]),
    ['Flicker'],
  );
  const bite = m.actions.find(a => a.n === 'Shock Bite');
  assert.equal(bite.atk, 5);
  assert.deepEqual(bite.dmg, [['2d4+3', 'relámpago']]);
  assert.deepEqual(m.actions.find(a => a.n === 'Crackle').dc, ['dex', 12, 'half']);

  // Español 2024 en metros, mal reconocido («Con1l», «Inr 2-4»).
  const es = [
    ['LOBO DE PRUEBA', 40, 100, 12, 'title'],
    ['Bestia Mediana, sin alineamiento', 40, 114],
    ['CA: 13 Iniciativa: +2 (12)', 40, 126],
    ['PG: 11 (2d8 + 2)', 40, 136],
    ['Velocidad: 12 m', 40, 146],
    ['MOD. SALV. MOD. SALV. MOD. SALV.', 40, 156],
    ['Fue 12 +1 +1 Des15 +2 +2 Con1l +0 +0', 40, 166],
    ['Inr 3-4 -4 Sab 12 +1 +1 Car 6 -2 -2', 40, 176],
    ['VD: 1/4 (50 PX; BC +2)', 40, 186],
    ['ACCIONES', 40, 198, 10, 'title'],
    [
      [
        ['Mordisco.', 'name'],
        ['Tirada de ataque cuerpo a cuerpo: +4, alcance 1,5 m. Impacto: 5 (1d6 + 2) de daño perforante.', 'body'],
      ],
      40,
      210,
    ],
  ];
  const [w] = L.monsters(L.readLines([page(es)]), { prefix: 't' });
  assert.equal(w.speed, '40 pies');
  assert.deepEqual(w.ab, [12, 15, 11, 3, 12, 6]);
  assert.equal(w.cr, 0.25);
  assert.equal(w.actions[0].atk, 4);
  assert.match(w.actions[0].d, /alcance 5 pies/);
});

test('reconocimiento de texto: desafío desde los PX, PG desde los dados, nombres con letras sueltas', () => {
  assert.deepEqual(L.parseCR('S (1.800 PX)'), { cr: 5, xp: 1800 });
  assert.equal(L.fixDigits('ll (2d8 + 2)'), '11 (2d8 + 2)');
  const lines = [
    ['Los lagartos son rápidos. Un lagarto trepa.', 40, 60],
    ['L a g a r t o v e r d o s o', 40, 100, 12, 'title'],
    ['Monstruosidad Mediana, legal malvado', 40, 114],
    ['Clase de Armadura: l5 (armadura natural)', 40, 126],
    ['Puntos d e golpe: 40 (9d8)', 40, 136],
    ['Velocidad: 30 pies', 40, 146],
    ['FUE DES CON INT SAB CAR', 40, 158],
    ['14 (+2) 10 (+0) 11 (+0) 1a $0) 10 (+0) 14 (+2)', 40, 168],
    ['Desafío: S (1.800 PX)', 40, 180],
    ['ACCIONES', 40, 192, 10, 'title'],
    [
      [
        ['Garra.', 'name'],
        [
          'Ataque con arma cuerpo a cuerpo: +4 a impactar, alcance 5 pies. Impacto: 5 (1d6 + 2) de daño cortante.',
          'body',
        ],
      ],
      40,
      204,
    ],
  ];
  const [m] = L.monsters(L.readLines([page(lines), page(lines)]), { prefix: 't' });
  assert.equal(m.name, 'Lagarto verdoso');
  assert.equal(m.ac, 15);
  assert.equal(m.hp, 40);
  assert.deepEqual([...m.ab], [14, 10, 11, 10, 10, 14]);
  assert.ok(m.issues.includes('Características aproximadas'));
  assert.equal(m.cr, 5);
});

test('negrita con letras repetidas y PDF sin espacios', () => {
  const lines = L.readLines([
    page([
      [
        [
          ['PePerrrroo ddeell bboossqquuee..', 'name'],
          ['Tiene ventaja.', 'body'],
        ],
        40,
        100,
      ],
    ]),
  ]);
  assert.equal(lines[0].t, 'Perro del bosque. Tiene ventaja.');
  const words = Array.from(
    { length: 60 },
    () => 'ArmorClass16(chainmail) HitPoints27(5d8+5) MediumHumanoid(Human),NeutralGood',
  );
  const glued = L.readLines([page(words.map((t, i) => [t, 40, 40 + i * 10]))]);
  assert.equal(glued[0].t, 'Armor Class 16 (chainmail) Hit Points 27 (5d8+5) Medium Humanoid (Human), Neutral Good');
});

test('páginas con la fuente sin letras: se avisan; las tablas de números no', () => {
  const garbled = {
    w: 600,
    h: 800,
    items: Array.from({ length: 80 }, (_, i) => ({ s: 'á í ó ñ é', x: 40, y: i * 9, w: 50, h: 8 })),
  };
  const table = {
    w: 600,
    h: 800,
    items: Array.from({ length: 80 }, (_, i) => ({ s: '1/4 (50) 2 450', x: 40, y: i * 9, w: 50, h: 8 })),
  };
  assert.deepEqual(L.unreadablePages([table, garbled]), [2]);
});

// Datos del sitio inventados para probar el lector de rasgos (nombres del sitio ≠ nombres del libro).
const CLASSES = {
  classes: {
    bard: {
      id: 'bard',
      name: 'Bardo',
      english: 'Bard',
      source: 'PHB',
      features: [{ name: 'Inspiración bárdica', english: 'Bardic Inspiration', level: 1, source: 'PHB', children: [] }],
    },
  },
  subclasses: [
    {
      id: 'bard-college-of-tests',
      classId: 'bard',
      name: 'Colegio de las Pruebas',
      english: 'College of Tests',
      source: 'PHB',
      features: [
        { name: 'Colegio de las Pruebas', english: 'College of Tests', level: 3, source: 'PHB', children: [] },
        { name: 'Voz firme', english: 'Steady Voice', level: 6, source: 'PHB', children: [] },
        { name: 'Canto final', english: 'Final Song', level: 14, source: 'PHB', children: [] },
      ],
    },
  ],
  options: [
    { id: 'opt-a', name: 'Mirada lejana', english: 'Far Gaze', source: 'PHB', types: ['EI'] },
    { id: 'opt-b', name: 'Paso de sombra', english: 'Shadow Step', source: 'PHB', types: ['EI'] },
    { id: 'opt-c', name: 'Voz del abismo profundo', english: 'Voice of the Deep', source: 'PHB', types: ['EI'] },
  ],
};
const FEATS = { feats: [{ id: 'alert', name: 'Alerta', english: 'Alert', sourceKey: 'PHB' }] };
const BODY = 'Este es un texto corrido de prueba que ocupa toda la línea del libro.';

test('rasgos de subclase por sección y nivel, opciones y dotes por nombre', () => {
  const rows = [];
  let y = 40;
  const add = (t, size = 8, f = 'B') => {
    rows.push([[[t, f]], 40, y, size]);
    y += size + 3;
  };
  add('BARDO', 24, 'T');
  for (let i = 0; i < 6; i++) add(BODY);
  add('INSPIRACIÓN BÁRDICA', 9, 'S');
  add('Podés inspirar a otros con tus palabras y tu música durante el combate.');
  add('COLEGIO DE LAS PRUEBAS', 12, 'T');
  add('Los bardos de este colegio ponen todo a prueba antes de creerlo cierto.');
  add('OÍDO ATENTO', 9, 'S');
  add('Cuando te unes a este colegio en el nivel 3, ganas competencia en Perspicacia.');
  add('VOZ INQUEBRANTABLE', 9, 'S'); // el sitio la llama «Voz firme»
  add('A partir del nivel 6, tu voz no puede ser silenciada por la magia de nadie.');
  add('ÚLTIMA CANCIÓN', 9, 'S');
  add('Al llegar al nivel 1 4, tu canto final cura a todos los aliados que te oigan.');
  const page1 = page(rows);
  y = 40;
  rows.length = 0;
  add('INVOCACIONES', 12, 'T');
  for (let i = 0; i < 3; i++) add(BODY);
  add('MIRADA LEJANA', 9, 'S');
  add('Requisitos: nivel 5. Podés ver a través de los ojos de un aliado cercano.');
  add('PASO DE SOMBRA', 9, 'S');
  add('Requisitos: nivel 7. Te teletransportás entre sombras hasta 30 pies.');
  add('VOZ DEL ABISMO', 9, 'S'); // el sitio: «Voz del abismo profundo»
  add('Requisitos: nivel 9. Hablás con las criaturas del fondo del mar.');
  add('DOTES', 12, 'T');
  add('ALERTA', 9, 'S');
  add('Siempre atento al peligro: +5 a la iniciativa y no te sorprenden.');
  const lines = L.readLines([page1, page(rows)]);
  const targets = L.ruleTargets(CLASSES, FEATS);
  const r = L.rules(lines, targets, {});
  const by = Object.fromEntries(r.map(x => [x.key, x.data]));
  assert.match(by['sub:bard-college-of-tests:College of Tests'].text, /competencia en Perspicacia/);
  assert.match(by['sub:bard-college-of-tests:Steady Voice'].text, /no puede ser silenciada/);
  assert.match(by['sub:bard-college-of-tests:Final Song'].text, /cura a todos/);
  assert.match(by['class:bard:Bardic Inspiration'].text, /inspirar a otros/);
  assert.match(by['opt:opt-a'].text, /^Requisitos: nivel 5/);
  assert.match(by['opt:opt-c'].text, /fondo del mar/);
  assert.match(by['feat:alert'].text, /iniciativa/);
  assert.equal(by['feat:alert'].id, 'feat:alert');
  assert.equal(r.find(x => x.key === 'feat:alert').kind, 'feat');
});

test('rasgos con «Rasgo de … de nivel N» (como Tasha)', () => {
  const rows = [];
  let y = 40;
  const add = (t, size = 8, f = 'B') => {
    rows.push([[[t, f]], 40, y, size]);
    y += size + 3;
  };
  add('BARDO', 24, 'T');
  for (let i = 0; i < 4; i++) add(BODY);
  add('COLEGIO DE LAS PRUEBAS', 12, 'T');
  add(BODY);
  add('OÍDO ATENTO', 10, 'S');
  add('Rasgo del colegio de las pruebas de nivel 3', 9, 'L');
  add('Ganás competencia en Perspicacia y en una herramienta a tu elección.');
  add('VOZ INQUEBRANTABLE', 10, 'S');
  add('Rasgo del colegio de las pruebas de nivel 6', 9, 'L');
  add('Tu voz no puede ser silenciada por la magia de nadie mientras cantes.');
  add('ÚLTIMA CANCIÓN', 10, 'S');
  add('Rasgo del colegio de las pruebas de nivel 14', 9, 'L');
  add('Tu canto final cura a todos los aliados que te oigan cuando caés.');
  const r = L.rules(L.readLines([page(rows)]), L.ruleTargets(CLASSES, FEATS), {});
  const by = Object.fromEntries(r.map(x => [x.key, x.data.text]));
  assert.match(by['sub:bard-college-of-tests:College of Tests'], /Perspicacia/);
  assert.match(by['sub:bard-college-of-tests:Steady Voice'], /silenciada/);
  assert.match(by['sub:bard-college-of-tests:Final Song'], /cura a todos/);
  assert.ok(!/Rasgo del colegio/.test(by['sub:bard-college-of-tests:Steady Voice']));
});

test('conjuro cuyo nombre cae arriba de la página (y desafío 0 mal leído)', () => {
  const p1 = page([
    ['BOLA DE PRUEBA', 40, 300, 10, 'title'],
    ['Evocación de nivel 3', 40, 314],
    ['Tiempo de lanzamiento: 1 acción', 40, 326],
    ['Alcance: 150 pies', 40, 336],
    ['Componentes: V, S, M', 40, 346],
    ['Duración: instantáneo', 40, 356],
    ['Una bola de prueba estalla y cada criatura en el área hace una salvación.', 40, 368],
    ['Si la falla, recibe 8d6 de daño de fuego, o la mitad si la supera.', 40, 378],
  ]);
  const p2 = page([
    ['RAYO DE PRUEBA', 40, 40, 10, 'title'], // arriba de la página: queda marcado como borde
    ['Evocación de nivel 3', 40, 60],
    ['Tiempo de lanzamiento: 1 acción', 40, 72],
    ['Alcance: Personal (línea de 100 pies)', 40, 82],
    ['Componentes: V, S, M', 40, 92],
    ['Duración: instantáneo', 40, 102],
    ['Un rayo de prueba sale de vos en una línea y daña a todo lo que toca.', 40, 114],
  ]);
  const sp = L.spells(L.readLines([p1, p2]), {});
  assert.deepEqual(
    sp.map(s => s.name),
    ['Bola de prueba', 'Rayo de prueba'],
  );
  assert.ok(!sp[1].issues);
  assert.deepEqual(L.parseCR('O (1 O PX)'), { cr: 0, xp: 10 });
});

test('criaturas invocadas (Tasha): «Desafío: —» y PG que dependen del nivel no son un error', () => {
  const lines = L.readLines([
    page([
      ['ESPÍRITU DE PRUEBA', 40, 100, 14, 'title'],
      ['Bestia Pequeíia', 40, 116],
      ['Clase de Armadura: 11 + el nivel del conjuro (armadura natural)', 40, 128],
      ['Puntos de golpe: 2O + 5 por cada nivel de conjuro superior al 2', 40, 138],
      ['Velocidad: 30 pies', 40, 148],
      ['FUE DES CON INT SAB CAR', 40, 160],
      ['18 (+4) 11 (+0) 16 (+3) 4 (-3) 14 (+2) 5 (-3)', 40, 170],
      ['Desafío: - Bonificador por competencia: igual a tu bonificador', 40, 182],
      [
        [
          ['Golpe.', 'name'],
          [
            'Ataque con arma cuerpo a cuerpo: +4 a impactar, alcance 5 pies. Impacto: 6 (1d8 + 2) de daño contundente.',
            'body',
          ],
        ],
        40,
        194,
      ],
    ]),
  ]);
  const [m] = L.monsters(lines, { prefix: 't' });
  assert.equal(m.name, 'Espíritu de prueba');
  assert.equal(m.size, 'Pequeño');
  assert.equal(m.summon, true);
  assert.equal(m.hp, 20);
  assert.match(m.hpNote, /por cada nivel de conjuro/);
  assert.match(m.acNote, /nivel del conjuro/);
  assert.equal(m.issues, undefined);
});
