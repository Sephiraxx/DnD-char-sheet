/* Estados de subclase con duración: se activan al usar el rasgo (o con «Activar») y, mientras duran,
   sus efectos cuentan como un rasgo más (CA, velocidad, vuelo, resistencias, daño extra…).
   state: { dur ('turn' | 'minute' | '10min' | 'hour' | 'rage' | null), name, text, fx }.
   Un minuto son 10 turnos propios en combate; fuera de combate dura hasta que lo termines o descanses. */
(function (root) {
  'use strict';
  const pb = x => x.pb,
    once = (reset, action, text, extra = {}) => ({ max: 1, reset, action, text, ...extra }),
    st = (dur, text, fx = {}, name) => ({ dur, text, fx, ...(name ? { name } : {}) }),
    BPS = ['bludgeoning', 'piercing', 'slashing'],
    ALL = [
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
    ];

  const MORE = {
    'wizard-bladesinging': {
      Bladesong: {
        use: {
          max: pb,
          reset: 'long',
          action: 'bonus',
          text: 'Durante 1 minuto (sin armadura media ni pesada, ni escudo): +INT a la CA, +10 pies, ventaja en Acrobacias y +INT a las salvaciones de concentración.',
        },
        state: st('minute', 'CA +INT, +10 pies, ventaja en Acrobacias y +INT para mantener concentración.', {
          ac: x => Math.max(1, x.m.int),
          speed: 10,
          advSave:
            'Canto del filo: sumás INT a las salvaciones de CON para mantener la concentración y tenés ventaja en Acrobacias.',
          dmgMod: { melee: true, value: x => (x.l >= 14 ? Math.max(1, x.m.int) : 0), label: 'Canción de la victoria' },
          use: {
            id: 'song-of-defense',
            name: 'Canción de defensa',
            free: true,
            action: 'reaction',
            slot: true,
            text: 'Al recibir daño, gastás un espacio: reducís el daño en 5 por nivel del espacio.',
            roll: { dice: () => '', flat: x => 5 * (x.n || 1), kind: 'roll', label: 'Daño evitado' },
          },
        }),
        auto: 'Botón en Recursos (competencia por descanso largo): mientras dura suma INT a la CA, +10 pies y, desde el nivel 10 y 14, Canción de defensa y de la victoria.',
      },
      'Song of Defense': {
        covered: true,
        auto: 'Con Canto del filo activo aparece «Canción de defensa»: gasta el espacio y te dice cuánto daño evitás.',
      },
      'Song of Victory': {
        covered: true,
        auto: 'Con Canto del filo activo, tus ataques cuerpo a cuerpo suman INT al daño.',
      },
    },
    'warlock-the-undead': {
      'Form of Dread': {
        state: st(
          'minute',
          'PG temporales, inmune a asustado; una vez por turno, al impactar, el objetivo salva SAB o queda asustado.',
          {
            conditions: ['Asustado'],
            immune: x => (x.l >= 10 ? ['necrotic'] : []),
          },
        ),
      },
      'Necrotic Husk': {
        partial: true,
        table: 'La reacción al caer a 0 PG.',
        auto: 'Resistencia necrótica; en Forma del pavor, inmunidad.',
      },
    },
    'warlock-the-hexblade': {
      "Hexblade's Curse": {
        use: once(
          'short',
          'bonus',
          'Maldecís a una criatura a 30 pies durante 1 minuto: +competencia al daño contra ella, crítico con 19–20, y al morir recuperás nivel + CAR PG.',
        ),
        state: st('minute', 'Contra el objetivo maldito: +competencia al daño y crítico con 19–20.', {
          rider: {
            dice: () => '',
            flat: pb,
            type: '',
            label: 'Maldición (solo contra el objetivo maldito)',
            checked: true,
          },
          crit: 19,
          use: {
            id: 'curse-kill',
            name: 'Muere el objetivo maldito',
            free: true,
            action: 'free',
            text: 'Cuando muere el objetivo maldito recuperás PG.',
            roll: { dice: () => '', flat: x => Math.max(1, x.l + x.m.cha), kind: 'heal' },
          },
        }),
      },
    },
    'fighter-rune-knight': {
      "Giant's Might": {
        state: st('minute', 'Tamaño Grande, ventaja en pruebas y salvaciones de FUE y daño extra una vez por turno.', {
          rider: {
            dice: x => (x.l >= 18 ? '1d10' : x.l >= 10 ? '1d8' : '1d6'),
            type: '',
            label: 'Poder del gigante',
            once: true,
          },
          advSave: 'Poder del gigante: ventaja en pruebas y salvaciones de Fuerza.',
        }),
      },
    },
    'rogue-phantom': {
      'Ghost Walk': {
        state: st(
          '10min',
          'Vuelo de 10 pies (flotás); los ataques contra vos tienen desventaja; atravesás criaturas y objetos.',
          { fly: 10 },
        ),
      },
    },
    'rogue-soulknife': {
      'Psychic Veil': { state: st('hour', 'Invisible; termina si dañás a una criatura u obligás a una salvación.') },
    },
    'ranger-swarmkeeper': {
      'Writhing Tide': { state: st('minute', 'Vuelo de 10 pies (flotás).', { fly: 10 }) },
    },
    'cleric-twilight-domain': {
      'Steps of Night': {
        state: st('minute', 'Vuelo igual a tu velocidad en luz tenue u oscuridad.', {
          fly: 'walk',
          flyNote: 'en luz tenue u oscuridad',
        }),
      },
      'Channel Divinity: Twilight Sanctuary': {
        state: st(
          'minute',
          'Al terminar cada turno dentro de la esfera: PG temporales o terminar hechizado o asustado.',
          {
            turnEnd: x => ({ dice: 'd6', temp: x.l, why: 'Santuario del ocaso' }),
          },
        ),
      },
    },
    'cleric-light-domain': {
      'Corona of Light': {
        use: {
          name: 'Corona de luz',
          free: true,
          action: 'action',
          text: 'Durante 1 minuto emitís luz brillante 60 pies; los enemigos en ella tienen desventaja contra conjuros de fuego o radiante.',
        },
        state: st(
          'minute',
          'Luz brillante 60 pies: desventaja de los enemigos contra tus conjuros de fuego y radiante.',
        ),
      },
    },
    'cleric-peace-domain': {
      'Emboldening Bond': {
        state: st(
          '10min',
          'Una vez por turno, cerca de otra criatura unida, suma 1d4 a un ataque, prueba o salvación.',
        ),
      },
    },
    'warlock-the-genie': {
      'Elemental Gift': { state: st('10min', 'Vuelo de 30 pies (flotás).', { fly: 30 }) },
    },
    'sorcerer-draconic-bloodline': {
      'Dragon Wings': {
        state: st(
          null,
          'Alas: vuelo igual a tu velocidad (no con armadura que no las deje salir).',
          { fly: 'walk' },
          'Alas de dragón',
        ),
        auto: 'Botón «Activar» en Estados: vuelo igual a tu velocidad hasta que las guardes.',
      },
    },
    'sorcerer-shadow-magic': {
      'Umbral Form': {
        state: st('minute', 'Resistencia a todo salvo fuerza y radiante; atravesás criaturas y objetos.', {
          resist: ALL.filter(t => t !== 'force' && t !== 'radiant'),
        }),
      },
    },
    'sorcerer-aberrant-mind': {
      'Revelation in Flesh': {
        use: {
          name: 'Revelación en la carne',
          shared: 'sorcery',
          cost: { min: 1, max: 4 },
          action: 'bonus',
          text: 'Por cada punto, un beneficio durante 10 minutos: ver lo invisible, vuelo igual a tu velocidad, nado al doble y respirar bajo el agua, o atravesar espacios de una pulgada.',
        },
        state: st('10min', 'Los beneficios elegidos (vuelo igual a tu velocidad si lo elegiste).', {
          fly: 'walk',
          flyNote: 'si lo elegiste',
        }),
      },
    },
    'sorcerer-clockwork-soul': {
      'Trance of Order': {
        state: st('minute', 'Nadie tiene ventaja contra vos; tus d20 de 9 o menos cuentan como 10.'),
      },
    },
    'bard-college-of-glamour': {
      'Mantle of Majesty': { state: st('minute', 'Orden como acción adicional en cada turno (concentración).') },
      'Unbreakable Majesty': { state: st('minute', 'Quien te ataca salva CAR o elige otro objetivo.') },
    },
    'druid-circle-of-stars': {
      'Starry Form': {
        use: [
          {
            id: 'archer',
            name: 'Forma estelar: Arquero',
            shared: 'wild-shape',
            cost: 1,
            action: 'bonus',
            state: 'archer',
            text: 'Durante 10 minutos, como acción adicional, una flecha luminosa a 60 pies: ataque de conjuro, radiante.',
            roll: { dice: x => (x.l >= 10 ? '2d8' : '1d8'), flat: x => x.m.wis, kind: 'damage', type: 'radiant' },
          },
          {
            id: 'chalice',
            name: 'Forma estelar: Cáliz',
            shared: 'wild-shape',
            cost: 1,
            action: 'bonus',
            state: 'chalice',
            text: 'Durante 10 minutos, al curar con un espacio, vos u otra criatura a 30 pies recupera más.',
          },
          {
            id: 'dragon',
            name: 'Forma estelar: Dragón',
            shared: 'wild-shape',
            cost: 1,
            action: 'bonus',
            state: 'dragon',
            text: 'Durante 10 minutos, en pruebas de INT y SAB y salvaciones de concentración, un 9 o menos cuenta como 10.',
          },
        ],
        states: {
          archer: st('10min', 'Arquero: flecha luminosa como acción adicional.', {}, 'Forma estelar: Arquero'),
          chalice: st(
            '10min',
            'Cáliz: curación extra al lanzar con espacio.',
            {
              spell: {
                heal: true,
                minLevel: 1,
                dice: '1d8',
                value: x => x.m.wis,
                label: 'Cáliz: otra criatura recupera 1d8 + SAB',
              },
            },
            'Forma estelar: Cáliz',
          ),
          dragon: st(
            '10min',
            'Dragón: 9 o menos cuenta como 10 en INT, SAB y concentración.',
            {
              advSave:
                'Forma estelar (Dragón): en pruebas de INT o SAB y salvaciones de concentración, un 9 o menos cuenta como 10.',
              fly: x => (x.l >= 10 ? 20 : 0),
            },
            'Forma estelar: Dragón',
          ),
        },
        auto: 'Tres botones que gastan Forma salvaje y activan la constelación con sus efectos.',
      },
      'Twinkling Constellations': {
        covered: true,
        auto: 'Desde el nivel 10 el Arquero y el Cáliz tiran 2d8, y el Dragón te da vuelo de 20 pies.',
      },
    },
    'monk-way-of-the-astral-self': {
      'Arms of the Astral Self': {
        use: {
          name: 'Brazos del yo astral',
          shared: 'ki',
          cost: 1,
          action: 'bonus',
          text: 'Durante 10 minutos: SAB para golpes sin armas y pruebas y salvaciones de FUE, alcance +5 pies y daño de fuerza. Al invocarlos, las criaturas a 10 pies salvan DES o reciben dos dados de artes marciales de fuerza.',
          save: { ab: 'dex', dc: 'ki' },
          roll: { dice: x => '2d' + root.SubclassFXKi.kiDie(x), kind: 'damage', type: 'force' },
        },
        state: st('10min', 'Golpes sin armas con SAB, alcance +5 pies, daño de fuerza.', { unarmedAbility: 'wis' }),
      },
      'Body of the Astral Self': {
        use: {
          name: 'Cuerpo del yo astral',
          free: true,
          action: 'reaction',
          text: 'Con brazos y rostro astrales: reducís un daño de ácido, frío, fuego, fuerza, relámpago o trueno.',
          roll: { dice: x => '1d10', flat: x => x.m.wis, kind: 'roll', label: 'Daño evitado' },
        },
        partial: true,
        table: 'Brazo potenciado: una vez por turno, +1 dado de artes marciales al impactar.',
      },
      'Awakened Astral Self': {
        use: {
          name: 'Yo astral despierto',
          shared: 'ki',
          cost: 5,
          action: 'bonus',
          text: 'Brazos, rostro y cuerpo astrales a la vez durante 10 minutos: +2 a la CA y tres ataques con la acción de Atacar.',
        },
        state: st('10min', '+2 CA y tres ataques por acción.', { ac: 2, attacks: 3, unarmedAbility: 'wis' }),
      },
    },
    'paladin-oath-of-devotion': {
      'Sacred Weapon': {
        use: {
          name: 'Arma sagrada',
          shared: 'channel',
          cost: 1,
          action: 'action',
          text: 'Durante 1 minuto tu arma brilla y suma CAR (mínimo +1) a las tiradas de ataque.',
        },
        state: st('minute', 'Suma CAR a las tiradas de ataque con el arma.', {
          hit: x => Math.max(1, x.m.cha),
          label: 'Arma sagrada',
        }),
      },
      'Holy Nimbus': {
        state: st(
          'minute',
          'Los enemigos que empiezan su turno a 30 pies reciben 10 radiante; ventaja contra conjuros de infernales y muertos vivientes.',
          {
            advSave: 'Halo sagrado: ventaja en salvaciones contra conjuros de infernales y muertos vivientes.',
          },
        ),
      },
    },
    'paladin-oath-of-vengeance': {
      'Vow of Enmity': { state: st('minute', 'Ventaja en tus ataques contra la criatura elegida.') },
      'Avenging Angel': {
        use: once('long', 'action', 'Durante 1 hora: alas con vuelo de 60 pies y aura de miedo de 30 pies.'),
        state: st('hour', 'Vuelo de 60 pies; los enemigos que entran al aura salvan SAB o quedan asustados.', {
          fly: 60,
        }),
      },
    },
    'paladin-oath-of-the-ancients': {
      'Elder Champion': {
        use: once(
          'long',
          'action',
          'Durante 1 minuto: recuperás 10 PG al empezar cada turno, lanzás conjuros de paladín de 1 acción como acción adicional y los enemigos a 10 pies tienen desventaja contra tus conjuros y Canalizar divinidad.',
        ),
        state: st('minute', 'Recuperás 10 PG al empezar cada turno.', {
          turnStart: x => (x.s.hp > 0 ? { heal: 10, why: 'Campeón antiguo' } : null),
        }),
      },
    },
    'paladin-oathbreaker': {
      'Dread Lord': {
        use: once(
          'long',
          'action',
          'Durante 1 minuto: aura de oscuridad de 30 pies; los asustados que empiezan su turno ahí reciben 4d10 psíquico; ataque de sombras como acción adicional.',
        ),
        state: st(
          'minute',
          'Aura de oscuridad: 4d10 psíquico a los asustados al empezar su turno; ataque de sombras (3d10 necrótico) como acción adicional.',
          {
            use: {
              id: 'shadow-strike',
              name: 'Ataque de sombras',
              free: true,
              action: 'bonus',
              text: 'Ataque de conjuro cuerpo a cuerpo contra una criatura del aura.',
              roll: { dice: () => '3d10', flat: x => x.m.cha, kind: 'damage', type: 'necrotic' },
            },
          },
        ),
      },
    },
    'paladin-oath-of-the-crown': {
      'Exalted Champion': {
        use: once(
          'long',
          'action',
          'Durante 1 hora: resistencia a armas no mágicas, ventaja de tus aliados en salvaciones de muerte y ventaja en salvaciones de SAB.',
        ),
        state: st(
          'hour',
          'Resistencia a contundente, perforante y cortante no mágicos; ventaja en salvaciones de SAB.',
          {
            resistIf: { types: BPS, why: 'Campeón exaltado', note: 'solo contra armas no mágicas' },
            advSave:
              'Campeón exaltado: ventaja en salvaciones de SAB, y tus aliados a 30 pies en salvaciones de muerte.',
          },
        ),
      },
    },
    'paladin-oath-of-conquest': {
      'Invincible Conqueror': {
        use: once(
          'long',
          'action',
          'Durante 1 minuto: resistencia a todo el daño, un ataque más con la acción de Atacar y críticos con 19–20.',
        ),
        state: st('minute', 'Resistencia a todo el daño, un ataque extra y crítico con 19–20.', {
          resist: ALL,
          attacks: x => (x.l >= 5 ? 3 : 2),
          crit: 19,
        }),
      },
    },
    'paladin-oath-of-glory': {
      'Peerless Athlete': { state: st('10min', 'Ventaja en Atletismo y Acrobacias; doble carga; saltos +10 pies.') },
      'Living Legend': {
        use: once(
          'long',
          'bonus',
          'Durante 1 minuto: ventaja en pruebas de CAR, una vez por turno un fallo de ataque se vuelve impacto, y repetís una salvación fallida con tu reacción.',
        ),
        state: st('minute', 'Ventaja en CAR; un fallo por turno se vuelve impacto; repetís una salvación fallida.'),
      },
    },
    'paladin-oath-of-the-watchers': {
      "Watcher's Will": {
        state: st('minute', 'Ventaja en salvaciones de INT, SAB y CAR para vos y hasta CAR criaturas.', {
          advSave: 'Voluntad del vigía: ventaja en salvaciones de INT, SAB y CAR.',
        }),
      },
      'Mortal Bulwark': {
        use: once(
          'long',
          'bonus',
          'Durante 1 minuto: visión verdadera de 120 pies, ventaja contra aberraciones, celestiales, elementales, feéricos e infernales, y al impactar podés expulsarlos.',
        ),
        state: st('minute', 'Visión verdadera 120 pies y ventaja contra criaturas de otros planos.'),
      },
    },
    'paladin-oath-of-redemption': {
      'Emissary of Peace': {
        state: st('10min', '+5 a Persuasión.', {
          check: { skills: ['persuasion'], value: 5, label: 'Emisario de la paz' },
        }),
      },
    },
    'fighter-samurai': {
      'Fighting Spirit': { state: st('turn', 'Ventaja en tus ataques con arma este turno.') },
    },
    'fighter-psi-warrior': {
      'Telekinetic Adept': {
        state: st('turn', 'Vuelo igual al doble de tu velocidad hasta el final del turno.', {
          fly: x => 2 * (x.s.speed ?? 30),
        }),
      },
    },
    'monk-way-of-the-ascendant-dragon': {
      'Wings Unfurled': { state: st('turn', 'Vuelo igual a tu velocidad hasta el final del turno.', { fly: 'walk' }) },
      'Aspect of the Wyrm': { state: st('minute', 'Aura de 10 pies: asustar o resistencia a un tipo elemental.') },
    },
    'barbarian-path-of-the-zealot': {
      'Zealous Presence': { state: st('turn', 'Ventaja en ataques y salvaciones para hasta diez aliados.') },
    },
  };

  const table = (root.SubclassFXData = root.SubclassFXData || {});
  for (const [sub, feats] of Object.entries(MORE))
    for (const [en, extra] of Object.entries(feats)) {
      const t = (table[sub] = table[sub] || {});
      t[en] = { lv: (root.SubclassFXLevels || {})[sub + ':' + en], ...(t[en] || {}), ...extra };
    }
})(typeof window !== 'undefined' ? window : globalThis);
