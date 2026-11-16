/* Elecciones de rasgos de subclase y efectos que se deciden al tirar: espíritus tótem, presas del cazador,
   maniobras, runas, disparos arcanos, florituras, Presagio… Mismo formato que subclass-fx-data.js.
   choice: { count, label, rest, options: { id: { name, text, lv, fx } } } — las opciones elegidas cuentan
   como un rasgo más. rider.cost: { res, n } → el daño extra gasta ese recurso al tirarlo. */
(function (root) {
  'use strict';
  const pb = x => x.pb,
    min1 = a => x => Math.max(1, x.m[a]),
    supDie = x => (x.l >= 18 ? 12 : x.l >= 10 ? 10 : 8),
    insDie = x => (x.l >= 15 ? 12 : x.l >= 10 ? 10 : x.l >= 5 ? 8 : 6),
    martial = x => '1d' + root.SubclassFXKi.kiDie(x),
    raging = x => !!x.s.raging,
    TYPES = [
      'acid',
      'bludgeoning',
      'cold',
      'fire',
      'force',
      'lightning',
      'necrotic',
      'piercing',
      'poison',
      'psychic',
      'radiant',
      'slashing',
      'thunder',
    ],
    es = t => root.Defenses?.label(t) || t,
    storm = x => x.s.subclassChoices?.['barbarian-path-of-the-storm-herald:Storm Aura']?.[0];

  // ---------- Maniobras del Maestro de batalla ----------
  const sdc = x => 8 + x.pb + Math.max(x.m.str, x.m.dex);
  const hit = (name, text, extra = {}) => ({
    name,
    text,
    fx: {
      rider: {
        dice: x => '1d' + supDie(x),
        type: '',
        label: x => (/salva/.test(text) ? `${name} (CD ${sdc(x)})` : name),
        cost: { res: 'superiority', n: 1 },
        checked: false,
        ...extra,
      },
    },
  });
  const act = (id, name, text, roll, extra = {}) => ({
    name,
    text,
    fx: {
      use: {
        id: 'mnv-' + id,
        name: 'Maniobra: ' + name,
        shared: 'superiority',
        cost: 1,
        action: extra.action || 'free',
        text,
        ...(roll ? { roll } : {}),
        ...(extra.save ? { save: extra.save } : {}),
      },
    },
  });
  const MANEUVERS = {
    commanders: act(
      'commanders',
      'Golpe del comandante',
      'Renunciás a un ataque: un aliado usa su reacción para atacar y suma el dado al daño.',
      { dice: x => '1d' + supDie(x), kind: 'roll', label: 'Suma al daño del aliado' },
    ),
    disarming: hit('Ataque desarmante', 'Suma el dado al daño; el objetivo salva FUE o suelta lo que sostiene.'),
    distracting: hit(
      'Golpe distractor',
      'Suma el dado al daño; el próximo ataque de otro contra el objetivo tiene ventaja.',
    ),
    evasive: act('evasive', 'Juego de pies evasivo', 'Al moverte, sumás el dado a tu CA hasta que dejes de moverte.', {
      dice: x => '1d' + supDie(x),
      kind: 'roll',
      label: '+CA',
    }),
    feinting: hit(
      'Ataque fingido',
      'Acción adicional: ventaja en el próximo ataque contra la criatura; si impacta, suma el dado.',
    ),
    goading: hit('Ataque provocador', 'Suma el dado al daño; el objetivo salva SAB o tiene desventaja contra otros.'),
    lunging: hit('Ataque arremetido', '+5 pies de alcance para este ataque; si impacta, suma el dado.'),
    maneuvering: hit(
      'Ataque de maniobra',
      'Suma el dado al daño; un aliado se mueve la mitad de su velocidad sin provocar ataques.',
    ),
    menacing: hit(
      'Ataque amenazador',
      'Suma el dado al daño; el objetivo salva SAB o queda asustado hasta tu próximo turno.',
    ),
    parry: act(
      'parry',
      'Parada',
      'Reacción al recibir daño cuerpo a cuerpo: reducís el daño en el dado + DES.',
      { dice: x => '1d' + supDie(x), flat: x => x.m.dex, kind: 'roll', label: 'Daño evitado' },
      { action: 'reaction' },
    ),
    precision: act('precision', 'Ataque preciso', 'Sumás el dado a una tirada de ataque, antes o después de tirarla.', {
      dice: x => '1d' + supDie(x),
      kind: 'roll',
      label: '+al ataque',
    }),
    pushing: hit('Ataque de empuje', 'Suma el dado al daño; si es Grande o menor, salva FUE o lo empujás 15 pies.'),
    rally: act(
      'rally',
      'Reagrupar',
      'Acción adicional: un aliado que te oiga gana PG temporales iguales al dado + CAR.',
      { dice: x => '1d' + supDie(x), flat: x => x.m.cha, kind: 'temp' },
      { action: 'bonus' },
    ),
    riposte: hit(
      'Contraataque',
      'Reacción cuando una criatura falla un ataque cuerpo a cuerpo contra vos: la atacás y sumás el dado.',
    ),
    sweeping: hit(
      'Ataque de barrido',
      'Si impactás, otra criatura a 5 pies recibe el dado de daño si tu tirada la alcanza.',
    ),
    trip: hit('Derribo', 'Suma el dado al daño; si es Grande o menor, salva FUE o cae derribado.'),
    ambush: act('ambush', 'Emboscada', 'Sumás el dado a una prueba de Sigilo o a tu iniciativa.', {
      dice: x => '1d' + supDie(x),
      kind: 'roll',
    }),
    bait: act(
      'bait',
      'Cebo y cambio',
      'Intercambiás lugar con un aliado a 5 pies; uno de los dos suma el dado a la CA hasta tu próximo turno.',
      { dice: x => '1d' + supDie(x), kind: 'roll', label: '+CA' },
    ),
    brace: hit('Prepararse', 'Reacción cuando una criatura entra en tu alcance: la atacás y sumás el dado.'),
    presence: act('presence', 'Presencia imponente', 'Sumás el dado a Intimidación, Interpretación o Persuasión.', {
      dice: x => '1d' + supDie(x),
      kind: 'roll',
    }),
    grappling: act(
      'grappling',
      'Golpe de presa',
      'Tras impactar, acción adicional para apresar sumando el dado a Atletismo.',
      { dice: x => '1d' + supDie(x), kind: 'roll' },
      { action: 'bonus' },
    ),
    toss: hit('Lanzamiento rápido', 'Acción adicional: lanzás un arma arrojadiza y sumás el dado al daño.'),
    tactical: act('tactical', 'Evaluación táctica', 'Sumás el dado a Historia, Perspicacia o Investigación.', {
      dice: x => '1d' + supDie(x),
      kind: 'roll',
    }),
  };

  // ---------- Runas del Caballero rúnico ----------
  const rune = (name, passive, invoke, fx = {}) => ({
    name,
    text: passive + ' Invocarla: ' + invoke,
    fx: {
      ...fx,
      use: {
        id: 'rune-' + name.toLowerCase().replace(/[^a-z]+/g, '-'),
        name: 'Invocar ' + name,
        max: x => (x.l >= 15 ? 2 : 1),
        reset: 'short',
        action: fx.action || 'bonus',
        text: invoke,
        save: { ab: fx.ab || '', dc: 'con' },
      },
    },
  });
  const RUNES = {
    cloud: rune(
      'Runa de las nubes',
      'Ventaja en Juego de manos y Engaño.',
      'reacción: un ataque contra vos o un aliado a 30 pies pasa a otra criatura a 30 pies del atacante.',
      { action: 'reaction' },
    ),
    fire: rune(
      'Runa del fuego',
      'Duplicás tu competencia con herramientas.',
      'al impactar, 2d6 de fuego y el objetivo salva FUE o queda apresado 1 minuto.',
      { action: 'free', ab: 'str' },
    ),
    frost: rune(
      'Runa de la escarcha',
      'Ventaja en Trato con animales e Intimidación.',
      '+2 a pruebas y salvaciones de FUE y CON durante 10 minutos.',
    ),
    stone: rune(
      'Runa de la piedra',
      'Ventaja en Perspicacia y visión en la oscuridad de 120 pies.',
      'reacción: una criatura que termina su turno a 30 pies salva SAB o queda hechizada 1 minuto.',
      { action: 'reaction', ab: 'wis', darkvision: { base: 120 } },
    ),
    hill: rune(
      'Runa de la colina',
      'Ventaja contra veneno y resistencia al veneno.',
      'resistencia a contundente, perforante y cortante durante 1 minuto.',
      { resist: ['poison'], advSave: 'Runa de la colina: ventaja en salvaciones contra veneno.' },
    ),
    storm: rune(
      'Runa de la tormenta',
      'Ventaja en Arcanos y no te pueden sorprender.',
      'durante 1 minuto, con tu reacción das ventaja o desventaja a una tirada a 60 pies.',
    ),
  };

  // ---------- Disparos arcanos ----------
  const shot = (name, text, dice, type, lv7 = '', extra = {}) => ({
    name,
    text,
    fx: {
      rider: {
        dice: x => (x.l >= 18 && lv7 ? lv7 : dice),
        type,
        label: 'Disparo arcano: ' + name,
        cost: { res: 'sfx:fighter-arcane-archer-arcane-shot', n: 1, name: 'Disparo arcano' },
        checked: false,
        once: true,
        melee: false,
        ...extra,
      },
    },
  });

  const MORE = {
    'fighter-battle-master': {
      'Combat Superiority': {
        choice: {
          count: x => (x.l >= 15 ? 9 : x.l >= 10 ? 7 : x.l >= 7 ? 5 : 3),
          label: 'Maniobras conocidas',
          options: MANEUVERS,
        },
        auto: 'Dados de superioridad en Recursos. Elegí tus maniobras: las de daño aparecen al atacar y las demás como botones; todas gastan el dado y muestran la CD.',
        table: '',
        partial: false,
      },
      Relentless: {
        covered: true,
        auto: 'Recordatorio al tirar iniciativa: si no te quedan dados de superioridad, recuperás uno (ajustalo en Recursos).',
      },
    },
    'fighter-arcane-archer': {
      'Arcane Shot': {
        choice: {
          count: x => (x.l >= 18 ? 6 : x.l >= 15 ? 5 : x.l >= 10 ? 4 : x.l >= 7 ? 3 : 2),
          label: 'Opciones de Disparo arcano',
          options: {
            banishing: shot(
              'Desterrador',
              'El objetivo salva CAR o queda desterrado hasta tu próximo turno (desde el 18, +2d6 fuerza).',
              '',
              'force',
              '2d6',
            ),
            beguiling: shot(
              'Seductor',
              '2d6 psíquico; salva SAB o queda hechizado por un aliado.',
              '2d6',
              'psychic',
              '4d6',
            ),
            bursting: shot('Estallido', '2d6 de fuerza a las criaturas a 10 pies del objetivo.', '2d6', 'force', '4d6'),
            enfeebling: shot(
              'Debilitador',
              '2d6 necrótico; salva CON o su daño con armas se reduce a la mitad.',
              '2d6',
              'necrotic',
              '4d6',
            ),
            grasping: shot(
              'Atrapador',
              '2d6 veneno; salva FUE o queda ralentizado y recibe 2d6 cortante al moverse.',
              '2d6',
              'poison',
              '4d6',
            ),
            piercing: shot(
              'Perforante',
              'La flecha atraviesa una línea de 30 pies: salvan DES; daño normal +1d6 perforante.',
              '1d6',
              'piercing',
              '2d6',
            ),
            seeking: shot(
              'Rastreador',
              'Ataque contra una criatura que viste en el último minuto, ignorando cobertura: salva DES o 1d6 de fuerza.',
              '1d6',
              'force',
              '2d6',
            ),
            shadow: shot(
              'Sombrío',
              '2d6 psíquico; salva SAB o queda cegado hasta tu próximo turno.',
              '2d6',
              'psychic',
              '4d6',
            ),
          },
        },
        auto: 'Dos usos por descanso corto (en Recursos). Elegí tus disparos: al atacar a distancia aparecen como daño extra y gastan un uso.',
        partial: false,
        table: '',
      },
      'Curving Shot': {
        use: {
          name: 'Disparo curvo',
          free: true,
          action: 'bonus',
          text: 'Al fallar con una flecha mágica, la redirigís a otro objetivo a 60 pies.',
        },
      },
      'Magic Arrow': {
        auto: 'Recordatorio: tus flechas cuentan como mágicas para superar resistencias e inmunidades.',
        covered: true,
      },
      'Ever-Ready Shot': {
        covered: true,
        auto: 'Recordatorio: al tirar iniciativa sin Disparos arcanos, recuperás uno (ajustalo en Recursos).',
      },
    },
    'barbarian-path-of-the-totem-warrior': {
      'Totem Spirit': {
        choice: {
          label: 'Espíritu tótem',
          options: {
            bear: {
              name: 'Oso',
              text: 'En Rabia, resistencia a todo salvo psíquico.',
              fx: { when: raging, resist: TYPES.filter(t => t !== 'psychic') },
            },
            eagle: {
              name: 'Águila',
              text: 'En Rabia, los ataques de oportunidad contra vos tienen desventaja y Correr es acción adicional.',
            },
            wolf: { name: 'Lobo', text: 'En Rabia, tus aliados tienen ventaja contra enemigos a 5 pies de vos.' },
            elk: {
              name: 'Alce',
              text: 'En Rabia y sin armadura pesada, +15 pies.',
              fx: { when: x => x.s.raging && !x.heavy, speed: 15 },
            },
            tiger: { name: 'Tigre', text: 'En Rabia, +10 pies al salto largo y +3 al alto.' },
          },
        },
        auto: 'Elegí tu tótem: el Oso suma sus resistencias y el Alce su velocidad mientras dura la Rabia.',
      },
      'Aspect of the Beast': {
        choice: {
          label: 'Aspecto de la bestia',
          options: {
            bear: {
              name: 'Oso',
              text: 'Doble capacidad de carga y ventaja en pruebas de FUE para empujar, levantar o romper.',
            },
            eagle: {
              name: 'Águila',
              text: 'Ves a una milla con claridad y la luz tenue no te da desventaja en Percepción.',
            },
            wolf: { name: 'Lobo', text: 'Rastreás a paso rápido y avanzás con sigilo a paso normal.' },
            elk: { name: 'Alce', text: 'Vos y diez compañeros viajan al doble de velocidad.' },
            tiger: {
              name: 'Tigre',
              text: 'Competencia en dos de Atletismo, Acrobacias, Sigilo o Supervivencia (anotalas).',
            },
          },
        },
      },
      'Totemic Attunement': {
        choice: {
          label: 'Sintonía totémica',
          options: {
            bear: { name: 'Oso', text: 'En Rabia, los enemigos a 5 pies tienen desventaja al atacar a otros.' },
            eagle: {
              name: 'Águila',
              text: 'En Rabia, vuelo igual a tu velocidad (caés al final del turno).',
              fx: { when: raging, fly: 'walk', flyNote: 'en Rabia, caés al final del turno' },
            },
            wolf: { name: 'Lobo', text: 'En Rabia, al impactar cuerpo a cuerpo, acción adicional para derribar.' },
            elk: {
              name: 'Alce',
              text: 'En Rabia, acción adicional para atravesar a una criatura: salva FUE o cae y recibe 1d12 + FUE.',
            },
            tiger: {
              name: 'Tigre',
              text: 'En Rabia, tras moverte 20 pies en línea recta, un ataque cuerpo a cuerpo como acción adicional.',
            },
          },
        },
      },
    },
    'barbarian-path-of-the-storm-herald': {
      'Storm Aura': {
        choice: {
          label: 'Entorno de la tormenta',
          options: {
            desert: {
              name: 'Desierto',
              text: 'Al activar el aura, cada otra criatura a 10 pies recibe fuego.',
              fx: {
                use: {
                  id: 'aura-desert',
                  name: 'Aura: desierto',
                  free: true,
                  action: 'bonus',
                  text: 'Cada otra criatura a 10 pies recibe fuego.',
                  roll: { dice: () => '', flat: x => Math.floor(x.l / 5) + 2, kind: 'damage', type: 'fire' },
                },
              },
            },
            sea: {
              name: 'Mar',
              text: 'Al activar el aura, una criatura a 10 pies salva DES o recibe relámpago (mitad si la supera).',
              fx: {
                use: {
                  id: 'aura-sea',
                  name: 'Aura: mar',
                  free: true,
                  action: 'bonus',
                  text: 'Una criatura a 10 pies salva DES.',
                  save: { ab: 'dex', dc: 'con' },
                  roll: { dice: x => Math.floor(x.l / 5) + 1 + 'd6', kind: 'damage', type: 'lightning' },
                },
              },
            },
            tundra: {
              name: 'Tundra',
              text: 'Al activar el aura, cada criatura que elijas a 10 pies gana PG temporales.',
              fx: {
                use: {
                  id: 'aura-tundra',
                  name: 'Aura: tundra',
                  free: true,
                  action: 'bonus',
                  text: 'Cada criatura que elijas a 10 pies gana PG temporales.',
                  roll: { dice: () => '', flat: x => Math.floor(x.l / 5) + 2, kind: 'temp' },
                },
              },
            },
          },
        },
        auto: 'Elegí el entorno: el aura aparece como botón (acción adicional en Rabia) con su daño, CD o PG temporales.',
      },
      'Storm Soul': {
        resist: x => ({ desert: ['fire'], sea: ['lightning'], tundra: ['cold'] })[storm(x)] || [],
        swim: x => (storm(x) === 'sea' ? 30 : 0),
        auto: 'Según el entorno de tu aura: desierto, resistencia al fuego; mar, al relámpago y nado de 30 pies; tundra, al frío.',
      },
      'Shielding Storm': {
        auto: 'Tus aliados en el aura ganan la resistencia de tu Alma de la tormenta.',
        covered: true,
      },
      'Raging Storm': {
        use: {
          name: 'Tormenta furiosa',
          free: true,
          action: 'reaction',
          text: 'Desierto: quien te impacta recibe la mitad de tu nivel en fuego (salva DES). Mar: derribás a quien impactás (salva FUE). Tundra: una criatura del aura salva FUE o queda con velocidad 0.',
          save: { ab: '', dc: 'con' },
        },
      },
    },
    'ranger-hunter': {
      "Hunter's Prey": {
        choice: {
          label: 'Presa del cazador',
          options: {
            colossus: {
              name: 'Asesino de colosos',
              text: 'Una vez por turno, +1d8 contra una criatura que ya no tiene todos sus PG.',
              fx: {
                rider: {
                  dice: () => '1d8',
                  type: '',
                  label: 'Asesino de colosos (objetivo herido)',
                  once: true,
                  checked: false,
                },
              },
            },
            giant: {
              name: 'Matagigantes',
              text: 'Reacción: atacás a una criatura Grande o mayor a 5 pies que te atacó.',
            },
            horde: {
              name: 'Rompehordas',
              text: 'Una vez por turno, un ataque extra contra otra criatura a 5 pies del objetivo.',
            },
          },
        },
      },
      'Defensive Tactics': {
        choice: {
          label: 'Tácticas defensivas',
          options: {
            escape: { name: 'Escapar de la horda', text: 'Los ataques de oportunidad contra vos tienen desventaja.' },
            multi: {
              name: 'Defensa contra ataques múltiples',
              text: 'Tras recibir un impacto, +4 a la CA contra esa criatura este turno.',
            },
            steel: {
              name: 'Voluntad de acero',
              text: 'Ventaja en salvaciones contra asustado.',
              fx: { advSave: 'Voluntad de acero: ventaja en salvaciones contra asustado.' },
            },
          },
        },
      },
      Multiattack: {
        choice: {
          label: 'Ataque múltiple',
          options: {
            volley: {
              name: 'Andanada',
              text: 'Acción: un ataque a distancia contra cada criatura en un radio de 10 pies.',
            },
            whirlwind: {
              name: 'Ataque giratorio',
              text: 'Acción: un ataque cuerpo a cuerpo contra cada criatura a 5 pies.',
            },
          },
        },
      },
      "Superior Hunter's Defense": {
        choice: {
          label: 'Defensa superior del cazador',
          options: {
            evasion: {
              name: 'Evasión',
              text: 'En salvaciones de DES de mitad de daño: nada si la superás, la mitad si fallás.',
            },
            tide: {
              name: 'Resistir la marea',
              text: 'Reacción: un ataque cuerpo a cuerpo fallido contra vos impacta a otra criatura.',
            },
            dodge: { name: 'Esquiva asombrosa', text: 'Reacción: reducís a la mitad el daño de un ataque que ves.' },
          },
        },
      },
    },
    'ranger-swarmkeeper': {
      'Gathered Swarm': {
        choice: {
          label: 'Efecto del enjambre al impactar',
          options: {
            damage: {
              name: 'Daño perforante',
              text: 'Una vez por turno, +1d6 perforante (1d8 desde el nivel 11).',
              fx: {
                rider: {
                  dice: x => (x.l >= 11 ? '1d8' : '1d6'),
                  type: 'piercing',
                  label: 'Enjambre reunido',
                  once: true,
                },
              },
            },
            push: {
              name: 'Empujar',
              text: 'El objetivo salva FUE o lo movés 15 pies (y queda derribado desde el 11).',
            },
            move: { name: 'Moverte', text: 'Te movés 5 pies sin provocar ataques (y medio cobertura desde el 11).' },
          },
        },
      },
      'Mighty Swarm': { covered: true, auto: 'El daño del enjambre pasa a 1d8 y sus efectos mejoran.' },
    },
    'ranger-monster-slayer': {
      "Slayer's Prey": {
        use: {
          name: 'Presa del cazador de monstruos',
          free: true,
          action: 'bonus',
          text: 'Marcás a una criatura a 60 pies hasta un descanso o hasta marcar otra: +1d6 la primera vez que la impactás cada turno.',
        },
        state: {
          dur: null,
          text: 'Una vez por turno, +1d6 al impactar al objetivo marcado.',
          fx: { rider: { dice: () => '1d6', type: '', label: 'Presa del cazador de monstruos', once: true } },
        },
      },
      'Supernatural Defense': {
        auto: 'Recordatorio: contra el objetivo marcado sumás 1d6 a salvaciones y pruebas para escapar de su presa.',
        covered: true,
      },
      "Slayer's Counter": {
        use: {
          name: 'Contragolpe del cazador',
          free: true,
          action: 'reaction',
          text: 'Cuando el objetivo marcado te obliga a salvar, lo atacás; si impactás, superás la salvación.',
        },
      },
    },
    'ranger-horizon-walker': {
      'Planar Warrior': {
        use: {
          name: 'Guerrero planar',
          free: true,
          action: 'bonus',
          text: 'Elegís una criatura a 30 pies: tu próximo impacto este turno hace daño de fuerza extra.',
        },
        state: {
          dur: 'turn',
          text: 'El próximo impacto suma daño de fuerza.',
          fx: {
            rider: { dice: x => (x.l >= 11 ? '2d8' : '1d8'), type: 'force', label: 'Guerrero planar', once: true },
          },
        },
      },
      'Distant Strike': {
        auto: 'Recordatorio: con la acción de Atacar te teletransportás 10 pies antes de cada ataque; si atacás a dos criaturas, un ataque más contra una tercera.',
        covered: true,
      },
      'Spectral Defense': {
        use: {
          name: 'Defensa espectral',
          free: true,
          action: 'reaction',
          text: 'Al recibir daño de un ataque, resistencia a ese daño.',
        },
      },
    },
    'ranger-gloom-stalker': {
      'Dread Ambusher': {
        rider: {
          dice: () => '1d8',
          type: '',
          label: 'Emboscador temible (ataque extra del primer turno)',
          checked: false,
          once: true,
        },
        partial: false,
        table: '',
        auto: 'Iniciativa +SAB; en el primer turno, +10 pies y en Atacar aparece el +1d8 del ataque extra.',
      },
      "Stalker's Flurry": {
        auto: 'Recordatorio: una vez por turno, si fallás un ataque con arma, hacés otro.',
        covered: true,
      },
      'Shadowy Dodge': {
        use: {
          name: 'Esquiva sombría',
          free: true,
          action: 'reaction',
          text: 'Un ataque contra vos sin ventaja tiene desventaja.',
        },
      },
    },
    'fighter-cavalier': {
      'Unwavering Mark': {
        use: {
          max: min1('str'),
          reset: 'long',
          action: 'bonus',
          text: 'Si la criatura marcada daña a otro, la atacás con ventaja y sumás la mitad de tu nivel al daño.',
          roll: { dice: () => '', flat: x => Math.floor(x.l / 2), kind: 'roll', label: 'Daño extra' },
        },
      },
      'Hold the Line': {
        auto: 'Recordatorio: quien se mueve 5 pies o más dentro de tu alcance provoca un ataque de oportunidad; si impactás, su velocidad es 0.',
        covered: true,
      },
      'Vigilant Defender': {
        auto: 'Recordatorio: una reacción especial por turno de cada otra criatura, solo para ataques de oportunidad.',
        covered: true,
      },
    },
    'fighter-purple-dragon-knight-banneret': {
      'Inspiring Surge': {
        use: {
          name: 'Oleada inspiradora',
          free: true,
          action: 'free',
          text: 'Al usar Oleada de acción, una criatura aliada a 60 pies (dos desde el 18) usa su reacción para atacar.',
        },
      },
      Bulwark: {
        use: {
          name: 'Baluarte',
          free: true,
          action: 'free',
          text: 'Al usar Mente indomable en una salvación de INT, SAB o CAR, un aliado a 60 pies que falló la misma salvación la repite.',
        },
      },
    },
    'fighter-samurai': {
      'Tireless Spirit': {
        covered: true,
        auto: 'Recordatorio: al tirar iniciativa sin usos de Espíritu de lucha, recuperás uno (ajustalo en Recursos).',
      },
      'Rapid Strike': {
        auto: 'Recordatorio: una vez por turno, si tenés ventaja contra un objetivo, renunciás a ella para un ataque extra.',
        covered: true,
      },
    },
    'fighter-rune-knight': {
      'Rune Carver': {
        choice: {
          count: x => (x.l >= 15 ? 5 : x.l >= 10 ? 4 : x.l >= 7 ? 3 : 2),
          label: 'Runas conocidas',
          options: RUNES,
        },
        auto: 'Elegí tus runas: suman su efecto pasivo y un botón para invocarlas (con su CD), una vez por descanso corto (dos desde el 15).',
      },
      'Master of Runes': { covered: true, auto: 'Cada runa se invoca dos veces por descanso corto.' },
      'Great Stature': { covered: true, auto: 'El daño de Poder del gigante pasa a 1d8.' },
      'Runic Juggernaut': { covered: true, auto: 'El daño de Poder del gigante pasa a 1d10 y podés ser Enorme.' },
    },
    'bard-college-of-lore': {
      'Cutting Words': {
        use: {
          name: 'Palabras cortantes',
          shared: 'inspiration',
          cost: 1,
          action: 'reaction',
          text: 'Restás el dado de una tirada de ataque, prueba o daño de una criatura a 60 pies que te oiga.',
          roll: { dice: x => '1d' + insDie(x), kind: 'roll', label: 'Restás' },
        },
      },
      'Peerless Skill': {
        use: {
          name: 'Habilidad sin igual',
          shared: 'inspiration',
          cost: 1,
          action: 'free',
          text: 'Sumás tu dado de Inspiración a una prueba de característica.',
          roll: { dice: x => '1d' + insDie(x), kind: 'roll' },
        },
      },
    },
    'bard-college-of-valor': {
      'Combat Inspiration': {
        covered: true,
        auto: 'Recordatorio: quien tiene tu Inspiración puede sumarla al daño o, con su reacción, a su CA.',
      },
      'Battle Magic': {
        auto: 'Recordatorio: tras lanzar un conjuro con tu acción, un ataque con arma como acción adicional.',
        covered: true,
      },
    },
    'bard-college-of-swords': {
      'Blade Flourish': {
        choice: {
          label: 'Florituras de espada conocidas',
          count: 3,
          options: {
            defensive: {
              name: 'Floritura defensiva',
              text: 'Sumás el dado al daño y a tu CA hasta tu próximo turno.',
              fx: {
                rider: {
                  dice: x => '1d' + insDie(x),
                  type: '',
                  label: 'Floritura defensiva (+CA igual)',
                  cost: { res: 'inspiration', n: 1 },
                  checked: false,
                  once: true,
                },
              },
            },
            slashing: {
              name: 'Floritura cortante',
              text: 'Sumás el dado al daño del objetivo y de otra criatura a 5 pies.',
              fx: {
                rider: {
                  dice: x => '1d' + insDie(x),
                  type: '',
                  label: 'Floritura cortante (también a otra a 5 pies)',
                  cost: { res: 'inspiration', n: 1 },
                  checked: false,
                  once: true,
                },
              },
            },
            mobile: {
              name: 'Floritura móvil',
              text: 'Sumás el dado al daño y empujás al objetivo 5 pies más el resultado.',
              fx: {
                rider: {
                  dice: x => '1d' + insDie(x),
                  type: '',
                  label: 'Floritura móvil (empujás 5 + el dado)',
                  cost: { res: 'inspiration', n: 1 },
                  checked: false,
                  once: true,
                },
              },
            },
          },
        },
        auto: 'Las florituras aparecen al atacar y gastan Inspiración. Recordatorio: +10 pies el turno que atacás.',
      },
      "Master's Flourish": {
        covered: true,
        auto: 'Recordatorio: podés usar una floritura con 1d6 en vez de gastar Inspiración.',
      },
    },
    'warlock-the-genie': {
      "Genie's Vessel": {
        choice: {
          label: 'Tipo de genio',
          options: {
            dao: {
              name: 'Dao (tierra)',
              fx: {
                rider: { dice: () => '', flat: pb, type: 'bludgeoning', label: 'Ira del genio', once: true },
                resist: x => (x.l >= 6 ? ['bludgeoning'] : []),
              },
            },
            djinni: {
              name: 'Djinni (aire)',
              fx: {
                rider: { dice: () => '', flat: pb, type: 'thunder', label: 'Ira del genio', once: true },
                resist: x => (x.l >= 6 ? ['thunder'] : []),
              },
            },
            efreeti: {
              name: 'Efreeti (fuego)',
              fx: {
                rider: { dice: () => '', flat: pb, type: 'fire', label: 'Ira del genio', once: true },
                resist: x => (x.l >= 6 ? ['fire'] : []),
              },
            },
            marid: {
              name: 'Marid (agua)',
              fx: {
                rider: { dice: () => '', flat: pb, type: 'cold', label: 'Ira del genio', once: true },
                resist: x => (x.l >= 6 ? ['cold'] : []),
              },
            },
          },
        },
        auto: 'Elegí tu genio: Ira del genio suma el daño de su tipo una vez por turno y, desde el nivel 6, tenés resistencia a ese tipo.',
      },
      "Genie's Wrath": {
        covered: true,
        auto: 'Una vez por turno, al impactar, +competencia de daño del tipo de tu genio (en Atacar).',
      },
    },
    'warlock-the-fiend': {
      "Dark One's Blessing": {
        use: {
          name: 'Bendición del oscuro',
          free: true,
          action: 'free',
          text: 'Al reducir a 0 PG a un enemigo, ganás PG temporales.',
          roll: { dice: () => '', flat: x => Math.max(1, x.m.cha + x.l), kind: 'temp' },
        },
      },
      'Fiendish Resilience': {
        choice: {
          label: 'Tipo de daño (cambia tras un descanso)',
          rest: 'short',
          options: () =>
            Object.fromEntries(
              TYPES.map(t => [t, { name: es(t)[0].toUpperCase() + es(t).slice(1), fx: { resist: [t] } }]),
            ),
        },
        auto: 'Resistencia al tipo elegido (no contra armas mágicas o de plata). Cambialo tras cada descanso.',
      },
    },
    'warlock-the-hexblade': {
      'Hex Warrior': {
        choice: {
          label: 'Arma con la que usás CAR (cambia tras un descanso largo)',
          rest: 'long',
          options: x =>
            Object.fromEntries(
              (x.s.inventory || [])
                .filter(
                  it =>
                    it.qty > 0 &&
                    root.EquipmentData?.items?.[it.equipmentId]?.weapon &&
                    !root.EquipmentData.items[it.equipmentId].weapon.twoHanded,
                )
                .map(it => [it.id, { name: it.name, fx: { chaWeapon: it.id } }]),
            ),
        },
        auto: 'Elegí el arma: al atacar usa CAR si es mejor. Ya tenés competencia con armadura media, escudos y armas marciales.',
      },
      "Hexblade's Curse": {
        state: {
          dur: 'minute',
          text: 'Contra el objetivo maldito: +competencia al daño y crítico con 19–20.',
          fx: {
            rider: {
              dice: () => '',
              flat: pb,
              type: '',
              label: 'Maldición (solo contra el objetivo maldito)',
              checked: true,
            },
            crit: 19,
            use: [
              {
                id: 'curse-kill',
                name: 'Muere el objetivo maldito',
                free: true,
                action: 'free',
                text: 'Cuando muere el objetivo maldito recuperás PG.',
                roll: { dice: () => '', flat: x => Math.max(1, x.l + x.m.cha), kind: 'heal' },
              },
              {
                id: 'armor-of-hexes',
                name: 'Armadura de maleficios',
                free: true,
                action: 'reaction',
                text: 'Si el maldito te impacta, tirá 1d6: con 4 o más, falla.',
                roll: { dice: () => '1d6', kind: 'roll', label: '4 o más: falla' },
              },
            ],
          },
        },
      },
      'Armor of Hexes': {
        covered: true,
        auto: 'Con la maldición activa aparece «Armadura de maleficios» (1d6, falla con 4+).',
      },
      'Master of Hexes': {
        covered: true,
        auto: 'Recordatorio: al morir el maldito podés pasar la maldición a otra criatura a 30 pies sin gastar el uso (sin la curación).',
      },
    },
    'wizard-school-of-transmutation': {
      "Transmuter's Stone": {
        choice: {
          label: 'Beneficio de la piedra (cambia al lanzar una transmutación)',
          options: {
            dark: { name: 'Visión en la oscuridad 60 pies', fx: { darkvision: { base: 60 } } },
            speed: { name: '+10 pies de velocidad', fx: { speed: 10 } },
            con: { name: 'Competencia en salvaciones de CON', fx: { saveProf: ['con'] } },
            acid: { name: 'Resistencia al ácido', fx: { resist: ['acid'] } },
            cold: { name: 'Resistencia al frío', fx: { resist: ['cold'] } },
            fire: { name: 'Resistencia al fuego', fx: { resist: ['fire'] } },
            lightning: { name: 'Resistencia al relámpago', fx: { resist: ['lightning'] } },
            thunder: { name: 'Resistencia al trueno', fx: { resist: ['thunder'] } },
          },
        },
        auto: 'Elegí el beneficio de la piedra (si la llevás vos): la ficha lo suma.',
      },
    },
    'wizard-school-of-divination': {
      Portent: {
        use: {
          name: 'Presagio: tirar los d20',
          max: 1,
          reset: 'long',
          action: 'manual',
          portent: x => (x.l >= 14 ? 3 : 2),
          text: 'Tras un descanso largo tirás los d20 de Presagio; la ficha los guarda para reemplazar tiradas.',
        },
        auto: 'Botón en Recursos para tirar los d20 tras el descanso largo; quedan en «Rasgos de subclase» para usarlos.',
      },
      'Greater Portent': { covered: true, auto: 'Presagio tira tres d20.' },
      'Expert Divination': {
        auto: 'Recordatorio: al lanzar una adivinación de nivel 2+, recuperás un espacio de nivel menor (máximo 5).',
        covered: true,
      },
    },
    'wizard-war-magic': {
      'Arcane Deflection': {
        use: {
          name: 'Desvío arcano',
          free: true,
          action: 'reaction',
          text: 'Al ser impactado: +2 a la CA contra ese ataque; o +4 a una salvación fallida. Hasta tu próximo turno solo podés lanzar trucos.',
        },
      },
      'Power Surge': {
        use: {
          max: min1('int'),
          reset: 'long',
          action: 'free',
          text: 'Una vez por turno, al dañar con un conjuro de mago, sumás daño de fuerza igual a la mitad de tu nivel.',
          roll: { dice: () => '', flat: x => Math.floor(x.l / 2), kind: 'damage', type: 'force' },
        },
        partial: true,
        table: 'Ganás una sobrecarga al disipar o contrarrestar un conjuro.',
      },
      'Deflecting Shroud': {
        use: {
          name: 'Manto desviador',
          free: true,
          action: 'free',
          text: 'Al usar Desvío arcano, hasta tres criaturas a 60 pies reciben fuerza.',
          roll: { dice: () => '', flat: x => Math.floor(x.l / 2), kind: 'damage', type: 'force' },
        },
      },
    },
    'wizard-school-of-necromancy': {
      'Grim Harvest': {
        use: {
          name: 'Cosecha macabra',
          free: true,
          action: 'free',
          slot: true,
          text: 'Al matar con un conjuro de nivel 1+, recuperás el doble del nivel del espacio (el triple si es de nigromancia). No gasta el espacio de nuevo: elegí el nivel usado.',
          roll: { dice: () => '', flat: x => 2 * (x.n || 1), kind: 'heal' },
          noSpend: true,
        },
      },
    },
    'cleric-life-domain': {
      'Blessed Healer': {
        use: {
          name: 'Sanador bendito',
          free: true,
          action: 'free',
          slot: true,
          noSpend: true,
          text: 'Al curar a otra criatura con un conjuro de nivel 1+, vos recuperás 2 + el nivel del espacio (elegí el nivel usado).',
          roll: { dice: () => '', flat: x => 2 + (x.n || 1), kind: 'heal' },
        },
      },
    },
    'sorcerer-divine-soul': {
      'Empowered Healing': {
        use: {
          name: 'Curación potenciada',
          shared: 'sorcery',
          cost: 1,
          action: 'free',
          text: 'Repetís dados de curación de un conjuro tuyo o de un aliado a 5 pies.',
        },
      },
      'Otherworldly Wings': {
        state: { dur: null, name: 'Alas de otro mundo', text: 'Vuelo de 30 pies.', fx: { fly: 30 } },
        auto: 'Botón «Activar»: vuelo de 30 pies hasta que las guardes.',
      },
    },
    'warlock-the-undead': {
      'Grave Touched': {
        rider: {
          dice: x => '1d' + 6,
          type: 'necrotic',
          label: 'Toque de la tumba (en Forma del pavor: un dado más)',
          once: true,
          checked: false,
        },
        auto: 'Recordatorio: podés volver necrótico el daño de un ataque; en Forma del pavor, una vez por turno suma un dado de daño (en Atacar).',
      },
    },
    'monk-way-of-the-kensei': {
      'Path of the Kensei': {
        auto: 'Recordatorio: armas del kensei con competencia y como armas de monje; tras atacar sin armas, +2 a la CA hasta tu próximo turno; con arma a distancia, acción adicional para +1d4 al daño.',
        covered: true,
      },
      'One with the Blade': {
        rider: {
          dice: martial,
          type: '',
          label: 'Golpe diestro (1 ki)',
          cost: { res: 'ki', n: 1 },
          checked: false,
          once: true,
        },
        auto: 'Tus armas del kensei son mágicas; en Atacar aparece «Golpe diestro» (1 ki, +dado de artes marciales, una vez por turno).',
      },
      'Sharpen the Blade': {
        use: {
          name: 'Afilar la hoja',
          shared: 'ki',
          cost: { min: 1, max: 3 },
          action: 'bonus',
          text: 'Durante 1 minuto, tu arma suma +1 por ki gastado al ataque y al daño (máximo +3).',
        },
        state: {
          dur: 'minute',
          text: 'Bonificador al ataque y al daño del arma (ajustá la magia del arma si gastaste más de 1 ki).',
          fx: { hit: 1, dmgMod: { value: 1, label: 'Afilar la hoja' } },
        },
      },
      'Unerring Accuracy': {
        auto: 'Recordatorio: una vez por turno, si fallás con un arma de monje, repetís el ataque.',
        covered: true,
      },
    },
    'monk-way-of-the-open-hand': {
      'Open Hand Technique': {
        use: {
          name: 'Técnica de la mano abierta',
          free: true,
          action: 'free',
          text: 'Al impactar con Ráfaga de golpes: el objetivo salva DES o cae derribado, salva FUE o lo empujás 15 pies, o no puede reaccionar.',
          save: { ab: '', dc: 'ki' },
        },
      },
      Tranquility: { covered: true, auto: 'Santuario tras un descanso largo, con tu CD de ki (en tus conjuros).' },
      'Quivering Palm': {
        use: {
          name: 'Palma temblorosa',
          shared: 'ki',
          cost: 3,
          action: 'free',
          text: 'Vibraciones letales: con una acción, el objetivo salva CON o cae a 0 PG; si la supera, recibe 10d10 necrótico.',
          save: { ab: 'con', dc: 'ki' },
          roll: { dice: () => '10d10', kind: 'damage', type: 'necrotic' },
        },
      },
    },
    'monk-way-of-the-sun-soul': {
      'Radiant Sun Bolt': {
        use: {
          name: 'Rayo de sol radiante',
          free: true,
          action: 'action',
          text: 'Ataque a distancia de 30 pies (DES + competencia): dado de artes marciales + DES radiante. Tras la acción de Atacar, 1 ki para dos más como acción adicional.',
          roll: { dice: martial, flat: x => x.m.dex, kind: 'damage', type: 'radiant' },
        },
      },
      'Sun Shield': {
        state: {
          dur: null,
          name: 'Escudo solar',
          text: 'Luz brillante de 30 pies; quien te impacta cuerpo a cuerpo recibe 5 + SAB radiante (reacción).',
          fx: {
            use: {
              id: 'sun-shield',
              name: 'Escudo solar: respuesta',
              free: true,
              action: 'reaction',
              text: 'Quien te impacta cuerpo a cuerpo recibe radiante.',
              roll: { dice: () => '', flat: x => 5 + x.m.wis, kind: 'damage', type: 'radiant' },
            },
          },
        },
      },
    },
    'monk-way-of-mercy': {
      "Physician's Touch": {
        auto: 'Recordatorio: Mano sanadora también termina una enfermedad o condición; Mano dañina deja envenenado al objetivo.',
        covered: true,
      },
      'Flurry of Healing and Harm': {
        auto: 'Recordatorio: en Ráfaga de golpes, Mano sanadora en vez de golpes, y Mano dañina gratis una vez por turno.',
        covered: true,
      },
    },
    'sorcerer-lunar-sorcery': {
      'Lunar Embodiment': {
        choice: {
          label: 'Fase de la luna (cambia tras un descanso largo)',
          rest: 'long',
          options: {
            full: {
              name: 'Luna llena',
              text: 'Escudo, Encontrar el camino, Espíritus guardianes… de abjuración y adivinación.',
            },
            new: { name: 'Luna nueva', text: 'Rayo de debilidad, Oscuridad, Toque vampírico… de nigromancia.' },
            crescent: {
              name: 'Luna creciente',
              text: 'Saltar, Paso brumoso, Disipar magia… de encantamiento y transmutación.',
            },
          },
        },
        use: {
          name: 'Encarnación lunar: conjuro gratis',
          max: 1,
          reset: 'long',
          action: 'manual',
          text: 'Una vez por descanso largo, un conjuro de nivel 1 de tu fase sin espacio.',
        },
      },
      'Moon Fire': {
        covered: true,
        auto: 'Llama sagrada como truco de hechicero; puede apuntar a dos criaturas a 5 pies entre sí.',
      },
    },
    'sorcerer-storm-sorcery': {
      'Tempestuous Magic': {
        use: {
          name: 'Magia tempestuosa',
          free: true,
          action: 'bonus',
          text: 'Tras lanzar un conjuro de nivel 1+, volás 10 pies sin provocar ataques de oportunidad.',
        },
      },
    },
    'barbarian-path-of-the-giant': {
      'Elemental Cleaver': {
        use: {
          name: 'Hendedor elemental',
          free: true,
          action: 'bonus',
          text: 'Al entrar en Rabia, tu arma hace ácido, frío, fuego, trueno o relámpago y suma daño; podés lanzarla y vuelve.',
        },
        state: {
          dur: 'rage',
          name: 'Hendedor elemental',
          text: 'Tu arma suma 1d6 del tipo elegido (2d6 desde el 14).',
          fx: { rider: { dice: x => (x.l >= 14 ? '2d6' : '1d6'), type: '', label: 'Hendedor elemental' } },
        },
      },
    },
    'barbarian-path-of-the-berserker': {
      Frenzy: {
        state: {
          dur: 'rage',
          name: 'Frenesí',
          text: 'Un ataque cuerpo a cuerpo como acción adicional en cada turno; al terminar la Rabia, un nivel de agotamiento.',
        },
        auto: 'Botón «Activar» en Rabia: recuerda el ataque adicional y el agotamiento al terminar.',
        when: raging,
      },
      'Intimidating Presence': {
        use: {
          name: 'Presencia intimidante',
          free: true,
          action: 'action',
          text: 'Una criatura a 30 pies salva SAB o queda asustada hasta el final de tu próximo turno.',
          save: { ab: 'wis', dc: 'cha' },
        },
      },
      Retaliation: {
        use: {
          name: 'Represalia',
          free: true,
          action: 'reaction',
          text: 'Al recibir daño de una criatura a 5 pies, la atacás cuerpo a cuerpo.',
        },
      },
    },
  };

  const table = (root.SubclassFXData = root.SubclassFXData || {});
  for (const [sub, feats] of Object.entries(MORE))
    for (const [en, extra] of Object.entries(feats)) {
      const t = (table[sub] = table[sub] || {});
      t[en] = { lv: (root.SubclassFXLevels || {})[sub + ':' + en], ...(t[en] || {}), ...extra };
    }
})(typeof window !== 'undefined' ? window : globalThis);
