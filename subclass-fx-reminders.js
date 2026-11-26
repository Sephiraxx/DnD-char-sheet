/* Últimos rasgos de subclase: los que se resuelven en la mesa (la ficha los recuerda en la tarjeta del rasgo
   y en «Tu ficha al día»), algunos usos más, y lo que pasa al tirar iniciativa (onInit: recuperar un uso si
   no te queda ninguno, o un recordatorio). Mismo formato que subclass-fx-data.js. */
(function (root) {
  'use strict';
  const pb = x => x.pb,
    r = table => ({ table }),
    free = (name, action, text, extra = {}) => ({ use: { name, free: true, action, text, ...extra } }),
    BPS = ['bludgeoning', 'piercing', 'slashing'],
    insDie = x => (x.l >= 15 ? 12 : x.l >= 10 ? 10 : x.l >= 5 ? 8 : 6),
    starry = x => Object.keys(x.s.subclassStates || {}).some(k => k.startsWith('druid-circle-of-stars:Starry Form'));

  const MORE = {
    'artificer-armorer': {
      'Armor Modifications': r(
        'Tu armadura arcana cuenta como piezas separadas (peto, botas, casco y arma) para infusiones, y podés infundir dos objetos más mientras sean partes de ella.',
      ),
    },
    'barbarian-path-of-the-battlerager': {
      'Battlerager Armor': {
        ...free(
          'Pinchos de la armadura',
          'bonus',
          'En Furia, con armadura de pinchos: un ataque con los pinchos como acción adicional; al apresar, el objetivo recibe 3 perforante.',
          {
            roll: { dice: () => '1d4', flat: x => x.m.str, kind: 'damage', type: 'piercing' },
          },
        ),
        when: x => !!x.s.raging,
      },
      'Reckless Abandon': {
        ...free(
          'Desenfreno temerario',
          'free',
          'En Furia, al atacar temerariamente ganás PG temporales iguales a tu CON (mínimo 1).',
          {
            roll: { dice: () => '', flat: x => Math.max(1, x.m.con), kind: 'temp' },
          },
        ),
        when: x => !!x.s.raging,
      },
      'Battlerager Charge': r('En Furia, Correr es una acción adicional.'),
      'Spiked Retribution': {
        ...free(
          'Represalia con pinchos',
          'free',
          'En Furia, quien te impacta cuerpo a cuerpo a 5 pies recibe 3 perforante.',
          {
            roll: { dice: () => '', flat: () => 3, kind: 'damage', type: 'piercing' },
          },
        ),
        when: x => !!x.s.raging,
      },
    },
    'barbarian-path-of-the-ancestral-guardian': {
      'Ancestral Protectors': r(
        'En Furia, la primera criatura que impactás en tu turno tiene desventaja al atacar a otros, y los demás tienen resistencia a su daño, hasta tu próximo turno.',
      ),
      'Vengeful Ancestors': r('Con Escudo espiritual, el atacante recibe de fuerza el daño que evitaste.'),
    },
    'barbarian-path-of-the-zealot': {
      'Fanatical Focus': {
        use: {
          name: 'Concentración fanática',
          max: 1,
          reset: 'long',
          action: 'free',
          text: 'Una vez por Furia, repetís una salvación fallida (se recupera al entrar otra vez en Furia).',
        },
      },
      'Rage beyond Death': r(
        'En Furia, caer a 0 PG no te deja inconsciente; morís solo si al terminar la Furia seguís en 0 PG.',
      ),
    },
    'barbarian-path-of-the-beast': {
      'Form of the Beast': {
        ...free(
          'Mordisco: curarte',
          'free',
          'Una vez por turno, si impactás con el mordisco teniendo menos de la mitad de tus PG, recuperás tu competencia.',
          {
            roll: { dice: () => '', flat: pb, kind: 'heal' },
          },
        ),
        table:
          'En Furia elegís mordisco (1d8, cura), garras (1d6, un ataque extra) o cola (1d8, alcance 10 y reacción +1d8 a la CA).',
      },
      'Bestial Soul': r(
        'Tus armas naturales son mágicas; tras un descanso elegís nado y respirar bajo el agua, trepar o saltar más lejos.',
      ),
    },
    'barbarian-path-of-wild-magic': {
      'Wild Surge': { covered: true, auto: 'Botón en la tarjeta del rasgo para tirar la tabla de magia salvaje (d8).' },
      'Unstable Backlash': r(
        'Al recibir daño o fallar una salvación en Furia, con tu reacción tirás de nuevo en la tabla de magia salvaje.',
      ),
      'Controlled Surge': r('Al tirar en la tabla, tirás dos veces y elegís; con dobles, elegís cualquier efecto.'),
    },
    'barbarian-path-of-the-giant': {
      "Giant's Havoc": r(
        'En Furia, +5 pies de alcance con armas cuerpo a cuerpo y sin armas; podés ser Grande si hay lugar. Las armas arrojadizas suman el daño de Furia.',
      ),
      'Mighty Impel': free(
        'Impulso poderoso',
        'bonus',
        'En Furia, lanzás a una criatura Mediana o menor a 5 pies hasta 30 pies (salva FUE si no es voluntaria).',
      ),
      'Demiurgic Colossus': r(
        'El alcance de Estragos del gigante sube a 10 pies, podés ser Enorme y el Hendedor elemental hace 2d6.',
      ),
    },
    'bard-college-of-eloquence': {
      'Unfailing Inspiration': r('Si quien usa tu Inspiración falla igual, conserva el dado.'),
    },
    'bard-college-of-spirits': {
      'Tales from Beyond': {
        use: {
          name: 'Relatos del más allá',
          shared: 'inspiration',
          cost: 1,
          action: 'bonus',
          text: 'Tirás tu dado de Inspiración en la tabla de relatos espirituales; guardás el relato hasta que lo cuentes.',
          roll: { dice: x => '1d' + insDie(x), kind: 'roll', label: 'Relato' },
        },
      },
      'Mystical Connection': r('Al contar un relato, tirás dos veces el dado y elegís cuál usar.'),
    },
    'cleric-light-domain': { 'Improved Flare': r('Destello protector también protege a otras criaturas a 30 pies.') },
    'cleric-nature-domain': {
      'Dampen Elements': free(
        'Amortiguar elementos',
        'reaction',
        'Cuando vos o alguien a 30 pies recibe ácido, frío, fuego, relámpago o trueno, le das resistencia a ese daño.',
      ),
      'Master of Nature': r('Con un hechizo de animales y plantas activo, das órdenes con tu acción adicional.'),
    },
    'cleric-tempest-domain': {
      'Thunderbolt Strike': r('Al hacer daño de relámpago a una criatura Grande o menor, podés empujarla 10 pies.'),
    },
    'cleric-trickery-domain': {
      'Blessing of the Trickster': free(
        'Bendición del embaucador',
        'action',
        'Otra criatura dispuesta tiene ventaja en Sigilo durante una hora.',
      ),
      'Improved Duplicity': r('Invocar duplicidad crea hasta cuatro duplicados.'),
    },
    'cleric-death-domain': {
      Reaper: r('Tus trucos de nigromancia de un objetivo pueden apuntar a dos criaturas a 5 pies entre sí.'),
      'Inescapable Destruction': r('Tu daño necrótico ignora la resistencia necrótica.'),
      'Improved Reaper': r(
        'Tus conjuros de nigromancia de nivel 1 a 5 de un objetivo pueden apuntar a dos criaturas a 5 pies entre sí.',
      ),
    },
    'cleric-arcana-domain': {
      'Spell Breaker': r(
        'Al curar a un aliado con un espacio, terminás un conjuro sobre él de nivel no mayor al espacio.',
      ),
    },
    'cleric-grave-domain': {
      'Keeper of Souls': free(
        'Guardián de almas',
        'free',
        'Una vez por ronda, cuando muere un enemigo a 60 pies, vos o un aliado recupera PG iguales a sus Dados de Golpe.',
      ),
    },
    'cleric-order-domain': {
      'Voice of Authority': r(
        'Al lanzar un conjuro con espacio sobre un aliado, ese aliado puede atacar con su reacción.',
      ),
      "Order's Wrath": {
        rider: {
          dice: () => '2d8',
          type: 'psychic',
          label: 'Ira del orden (maldice al objetivo)',
          once: true,
          checked: false,
        },
      },
    },
    'cleric-peace-domain': {
      'Protective Bond': r(
        'Una criatura unida puede usar su reacción para teletransportarse junto a otra y recibir su daño.',
      ),
      'Expansive Bond': r('El vínculo llega a 60 pies, y quien recibe el daño por otro tiene resistencia.'),
    },
    'cleric-twilight-domain': {
      'Twilight Shroud': r('Vos y tus aliados en el Santuario del ocaso tienen media cobertura.'),
    },
    'druid-circle-of-the-land': {
      "Land's Stride": r(
        'El terreno difícil no mágico no te cuesta movimiento ni te daña; ventaja contra plantas mágicas que impiden el paso.',
      ),
      "Nature's Sanctuary": {
        use: {
          name: 'Santuario de la naturaleza',
          free: true,
          action: 'free',
          text: 'Bestias y plantas que te atacan salvan SAB o eligen otro objetivo.',
          save: { ab: 'wis', dc: 'spell' },
        },
      },
    },
    'druid-circle-of-the-moon': {
      'Primal Strike': r('Tus ataques en forma de bestia cuentan como mágicos.'),
      'Elemental Wild Shape': {
        use: {
          name: 'Forma salvaje elemental',
          shared: 'wild-shape',
          cost: 2,
          action: 'bonus',
          text: 'Gastás dos usos de Forma salvaje para convertirte en un elemental de aire, tierra, fuego o agua.',
        },
      },
    },
    'druid-circle-of-dreams': {
      'Hearth of Moonlight and Shadow': r(
        'Durante un descanso, una esfera de 30 pies da +5 a Sigilo y Percepción y oculta la luz.',
      ),
    },
    'druid-circle-of-the-shepherd': {
      'Mighty Summoner': r(
        'Las bestias y feéricos que invocás ganan 2 PG por Dado de Golpe y sus armas naturales son mágicas.',
      ),
      'Guardian Spirit': r(
        'Tus criaturas invocadas que terminan su turno en el aura del tótem recuperan la mitad de tu nivel de druida.',
      ),
    },
    'druid-circle-of-spores': {
      'Spreading Spores': r(
        'Con el Halo simbiótico activo, una nube de esporas a 30 pies reemplaza al halo: 1d4 de daño (más con el nivel) a quien entra o empieza su turno ahí.',
      ),
    },
    'druid-circle-of-stars': {
      'Full of Stars': {
        when: starry,
        resist: BPS,
        auto: 'En Forma estelar: resistencia a contundente, perforante y cortante.',
      },
    },
    'fighter-champion': {
      'Additional Fighting Style': r('Elegí un segundo estilo de combate en Competencias (no repetido).'),
    },
    'fighter-eldritch-knight': {
      'Weapon Bond': r(
        'Ritual de una hora con hasta dos armas: no te las pueden quitar y la llamás a tu mano con una acción adicional.',
      ),
      'War Magic': r('Tras lanzar un truco con tu acción, un ataque con arma como acción adicional.'),
      'Eldritch Strike': r(
        'Al impactar con un arma, el objetivo tiene desventaja en su próxima salvación contra tus conjuros antes de tu próximo turno.',
      ),
      'Arcane Charge': r('Con Oleada de acción, te teletransportás 30 pies.'),
      'Improved War Magic': r(
        'Tras lanzar un conjuro (no solo un truco) con tu acción, un ataque con arma como acción adicional.',
      ),
    },
    'fighter-cavalier': {
      'Born to the Saddle': r(
        'Ventaja para no caer de la montura; caés de pie al fallar por 10 pies o menos; montar o desmontar cuesta 5 pies.',
      ),
      'Ferocious Charger': r(
        'Una vez por turno, tras moverte 10 pies en línea recta e impactar, el objetivo salva FUE o cae derribado.',
      ),
    },
    'fighter-psi-warrior': {
      'Telekinetic Master': {
        covered: true,
        auto: 'Telequinesis ya está en tus conjuros; mientras te concentrás, un ataque con arma como acción adicional.',
      },
    },
    'monk-way-of-shadow': {
      'Shadow Step': free(
        'Paso de sombra',
        'bonus',
        'De luz tenue u oscuridad a otra a 60 pies; ventaja en tu primer ataque cuerpo a cuerpo antes de terminar el turno.',
      ),
      'Cloak of Shadows': {
        state: {
          dur: null,
          name: 'Manto de sombras',
          text: 'Invisible en luz tenue u oscuridad hasta que ataques, lances un conjuro o estés en luz brillante.',
        },
        auto: 'Botón «Activar» (acción) en Rasgos de subclase.',
      },
      Opportunist: r('Cuando alguien impacta a una criatura a 5 pies de vos, la atacás con tu reacción.'),
    },
    'monk-way-of-the-four-elements': {
      'Disciple of the Elements': r(
        'Tus disciplinas elementales cuestan ki y lanzan sus conjuros con tu CD de ki; la mayoría están en tus conjuros como lanzamientos por ki.',
      ),
    },
    'monk-way-of-the-long-death': {
      'Touch of Death': free(
        'Toque de la muerte',
        'free',
        'Al reducir a 0 PG a una criatura a 5 pies, ganás PG temporales.',
        {
          roll: { dice: () => '', flat: x => Math.max(1, x.m.wis + x.l), kind: 'temp' },
        },
      ),
    },
    'monk-way-of-the-drunken-master': {
      'Drunken Technique': r('Con Ráfaga de golpes ganás Retirarse y +10 pies este turno.'),
      'Tipsy Sway': r(
        'Levantarte cuesta 5 pies; con tu reacción, un ataque fallido contra vos impacta a otra criatura a 5 pies.',
      ),
      "Drunkard's Luck": {
        use: {
          name: 'Suerte del borracho',
          shared: 'ki',
          cost: 2,
          action: 'free',
          text: 'Cancelás la desventaja de una prueba, ataque o salvación.',
        },
      },
      'Intoxicated Frenzy': r(
        'Con Ráfaga de golpes, hasta tres ataques más si cada uno es contra un objetivo distinto.',
      ),
    },
    'monk-way-of-the-astral-self': {
      'Visage of the Astral Self': r(
        'Por 1 ki, 10 minutos: visión en la oscuridad mágica a 120 pies, ventaja en Perspicacia e Intimidación y voz a 600 pies.',
      ),
    },
    'monk-way-of-the-ascendant-dragon': {
      'Draconic Disciple': r(
        'Cambiás el tipo de daño de tus golpes sin armas a ácido, frío, fuego, relámpago o veneno; una vez por descanso largo repetís una prueba de CAR fallida.',
      ),
      'Ascendant Aspect': r(
        'Vista ciega de 10 pies; tu aura dracónica hace 1d10 al entrar en ella con tu reacción, una vez por turno.',
      ),
    },
    'paladin-oath-of-vengeance': {
      'Relentless Avenger': r(
        'Al impactar con un ataque de oportunidad, te movés la mitad de tu velocidad sin provocar ataques.',
      ),
      'Soul of Vengeance': r('Cuando la criatura de tu Voto de enemistad ataca, la atacás con tu reacción.'),
    },
    'paladin-oath-of-the-crown': {
      'Divine Allegiance': free(
        'Lealtad divina',
        'reaction',
        'Recibís el daño que iba a recibir otra criatura a 5 pies (sin resistencias).',
      ),
    },
    'paladin-oath-of-conquest': {
      'Aura of Conquest': free(
        'Aura de conquista',
        'free',
        'Las criaturas asustadas por vos a 10 pies tienen velocidad 0 y reciben psíquico al empezar su turno.',
        {
          roll: { dice: () => '', flat: x => Math.floor(x.l / 2), kind: 'damage', type: 'psychic' },
        },
      ),
      'Scornful Rebuke': free('Reprimenda desdeñosa', 'free', 'Quien te impacta recibe psíquico si estás consciente.', {
        roll: { dice: () => '', flat: x => Math.max(1, x.m.cha), kind: 'damage', type: 'psychic' },
      }),
    },
    'paladin-oath-of-redemption': {
      'Aura of the Guardian': free(
        'Aura del guardián',
        'reaction',
        'Recibís el daño que iba a recibir otra criatura a 10 pies (sin resistencias).',
      ),
      'Emissary of Redemption': {
        resistIf: { types: 'all', why: 'Emisario de la redención', note: 'contra el daño de criaturas' },
        auto: 'Resistencia al daño de criaturas (al recibir daño te lo recuerda).',
        table:
          'Quien te daña recibe la mitad como radiante; perdés el beneficio contra quien atacás o dañás hasta un descanso largo.',
      },
    },
    'rogue-arcane-trickster': {
      'Mage Hand Legerdemain': r(
        'Tu Mano de mago es invisible y puede guardar o sacar objetos, abrir cerraduras y desarmar trampas a distancia (acción adicional con Acción astuta).',
      ),
      'Magical Ambush': r('Escondido, tus conjuros imponen desventaja a la salvación.'),
      'Versatile Trickster': r(
        'Con tu acción adicional, la Mano de mago te da ventaja contra una criatura a 5 pies de ella.',
      ),
    },
    'rogue-assassin': {
      Assassinate: r('Ventaja contra quien no actuó todavía; tus impactos contra criaturas sorprendidas son críticos.'),
      Impostor: r(
        'Tras estudiar a alguien 3 horas, imitás su habla, escritura y conducta (ventaja para no ser descubierto).',
      ),
      'Death Strike': free(
        'Golpe mortal',
        'free',
        'Al impactar a una criatura sorprendida: salva CON o recibe el doble de daño.',
        { save: { ab: 'con', dc: 'dex' } },
      ),
    },
    'rogue-thief': {
      'Second-Story Work': r('Trepar no cuesta movimiento extra; el salto largo con carrera suma tu DES.'),
      'Fast Hands': r('Acción astuta también para Juego de manos, herramientas de ladrón o Usar un objeto.'),
      'Supreme Sneak': r('Ventaja en Sigilo si no te movés más de la mitad de tu velocidad.'),
      "Thief's Reflexes": {
        auto: 'Al tirar iniciativa la ficha te lo recuerda.',
        onInit: {
          note: 'Reflejos de ladrón: en la primera ronda tenés dos turnos (el segundo con tu iniciativa − 10).',
        },
      },
    },
    'rogue-inquisitive': {
      'Ear for Deceit': r('Al descubrir mentiras con Perspicacia, un 7 o menos en el d20 cuenta como 8.'),
      'Insightful Fighting': free(
        'Lucha perspicaz',
        'bonus',
        'Perspicacia contra el Engaño de una criatura: si ganás, Ataque furtivo sin ventaja contra ella durante 1 minuto.',
      ),
      'Steady Eye': r('Ventaja en Percepción e Investigación si no te movés más de la mitad de tu velocidad.'),
      'Eye for Weakness': r('Contra el objetivo de Lucha perspicaz, el Ataque furtivo suma 3d6.'),
    },
    'rogue-mastermind': {
      Misdirection: free('Desvío', 'reaction', 'Un ataque contra vos pasa a una criatura que te cubre a 5 pies.'),
    },
    'rogue-scout': {
      Skirmisher: r(
        'Con tu reacción te movés la mitad de tu velocidad cuando un enemigo termina su turno a 5 pies, sin provocar ataques.',
      ),
      'Ambush Master': {
        auto: 'Al tirar iniciativa la ficha te lo recuerda.',
        onInit: {
          note: 'Maestro de la emboscada: ventaja en la iniciativa; el primer objetivo que impactes queda marcado para tus aliados.',
        },
      },
      'Sudden Strike': r(
        'Tras la acción de Atacar, otro ataque como acción adicional (puede llevar Ataque furtivo contra otro objetivo).',
      ),
    },
    'rogue-swashbuckler': {
      'Fancy Footwork': r('Quien atacás cuerpo a cuerpo no puede hacerte ataques de oportunidad ese turno.'),
      Panache: free(
        'Desparpajo',
        'action',
        'Persuasión contra Perspicacia: un enemigo tiene desventaja contra otros, o uno no hostil queda hechizado.',
      ),
      'Elegant Maneuver': free(
        'Maniobra elegante',
        'bonus',
        'Ventaja en tu próxima prueba de Acrobacias o Atletismo este turno.',
      ),
    },
    'rogue-phantom': {
      'Whispers of the Dead': r('Tras un descanso, elegís una competencia de habilidad o herramienta.'),
      'Tokens of the Departed': {
        use: {
          name: 'Recuerdos de los difuntos',
          max: pb,
          reset: 'long',
          action: 'free',
          text: 'Hasta tu competencia en baratijas del alma: ventaja en salvaciones de CON y muerte, Lamentos del sepulcro sin gastar usos, o hacer una pregunta al alma.',
        },
      },
      "Death's Friend": r(
        'Lamentos del sepulcro hace el daño también al objetivo; al terminar un descanso largo sin baratijas, aparece una.',
      ),
    },
    'rogue-soulknife': {
      'Psychic Blades': free(
        'Hojas psíquicas',
        'action',
        'Ataque con una hoja psíquica (DES o FUE): 1d6 psíquico; la segunda, como acción adicional, 1d4.',
        {
          roll: { dice: () => '1d6', flat: x => Math.max(x.m.dex, x.m.str), kind: 'damage', type: 'psychic' },
        },
      ),
      'Soul Blades': {
        use: {
          name: 'Golpes buscadores',
          shared: 'psi',
          cost: 1,
          action: 'free',
          text: 'Al fallar con una hoja psíquica, sumás el dado psiónico al ataque (solo se gasta si impactás).',
        },
      },
    },
    'sorcerer-draconic-bloodline': {
      'Draconic Presence': {
        use: {
          name: 'Presencia dracónica',
          shared: 'sorcery',
          cost: 5,
          action: 'action',
          text: 'Aura de 60 pies durante 1 minuto (concentración): cada criatura hostil que empieza su turno ahí salva SAB o queda hechizada o asustada.',
          save: { ab: 'wis', dc: 'spell' },
        },
      },
    },
    'sorcerer-wild-magic': {
      'Wild Magic Surge': {
        covered: true,
        auto: 'Botón en la tarjeta del rasgo para tirar la tabla de oleadas (d100).',
      },
      'Controlled Chaos': r('Al tirar en la tabla de oleadas, tirás dos veces y elegís.'),
      'Spell Bombardment': r('Una vez por turno, si un dado de daño saca el máximo, tirás otro y lo sumás.'),
    },
    'sorcerer-shadow-magic': {
      'Shadow Walk': free('Caminar entre sombras', 'bonus', 'De luz tenue u oscuridad a otra a 120 pies.'),
    },
    'sorcerer-storm-sorcery': {
      'Storm Guide': r('Detenés la lluvia a 20 pies o cambiás la dirección del viento a 100 pies.'),
    },
    'sorcerer-aberrant-mind': {
      'Telepathic Speech': r('Conexión telepática con una criatura a 30 pies durante tu nivel en minutos.'),
      'Psionic Sorcery': r(
        'Tus conjuros psiónicos pueden lanzarse con puntos de hechicería igual a su nivel, sin componentes verbales ni somáticos.',
      ),
    },
    'sorcerer-lunar-sorcery': {
      'Waxing and Waning': r('Cambiás de fase con una acción adicional gastando 1 punto de hechicería.'),
      'Lunar Empowerment': r(
        'Según tu fase: luna llena, luz brillante; luna nueva, ventaja en Sigilo; creciente, resistencia necrótica y radiante.',
      ),
      'Lunar Phenomenon': r(
        'Al cambiar de fase, un efecto de área según la fase (una vez por descanso largo o con 5 puntos).',
      ),
    },
    'warlock-the-great-old-one': {
      'Create Thrall': r(
        'Tocás a un humanoide incapacitado: queda hechizado hasta que se rompa el vínculo, y te comunicás telepáticamente.',
      ),
    },
    'warlock-the-genie': {
      'Sanctuary Vessel': r(
        'Al entrar en tu recipiente podés llevar hasta cinco criaturas; un descanso corto de 10 minutos ahí recupera PG extra.',
      ),
      'Limited Wish': {
        use: {
          name: 'Deseo limitado',
          max: 1,
          reset: 'long',
          action: 'action',
          text: 'Lanzás un conjuro de nivel 6 o menor de cualquier lista; no podés repetirlo hasta 1d4 descansos largos.',
        },
      },
    },
    'wizard-school-of-abjuration': {
      'Projected Ward': free(
        'Protección proyectada',
        'reaction',
        'Tu Protección arcana absorbe el daño de una criatura a 30 pies.',
      ),
    },
    'wizard-school-of-conjuration': {
      'Minor Conjuration': free(
        'Conjuración menor',
        'action',
        'Creás un objeto no mágico de hasta 3 pies y 10 libras que dura una hora.',
      ),
      'Focused Conjuration': r('El daño no rompe tu concentración en conjuros de conjuración.'),
      'Durable Summons': r('Las criaturas que invocás con conjuración ganan 30 PG temporales.'),
    },
    'wizard-school-of-enchantment': {
      'Hypnotic Gaze': {
        use: {
          name: 'Mirada hipnótica',
          free: true,
          action: 'action',
          text: 'Una criatura a 5 pies salva SAB o queda hechizada e incapacitada hasta el final de tu próximo turno.',
          save: { ab: 'wis', dc: 'spell' },
        },
      },
      'Instinctive Charm': free(
        'Encanto instintivo',
        'reaction',
        'Un atacante a 30 pies salva SAB o ataca a otra criatura.',
        { save: { ab: 'wis', dc: 'spell' } },
      ),
      'Split Enchantment': r('Tus encantamientos de un objetivo pueden apuntar a una segunda criatura.'),
      'Alter Memories': r('Quien hechizaste no sabe que lo estuvo; podés borrarle horas de memoria (salva INT).'),
    },
    'wizard-school-of-evocation': {
      'Sculpt Spells': r(
        'En tus evocaciones, hasta 1 + nivel del conjuro criaturas superan la salvación sola y no reciben daño.',
      ),
      Overchannel: {
        use: {
          name: 'Sobrecanalizar',
          max: 1,
          reset: 'long',
          action: 'free',
          text: 'Un conjuro de nivel 1 a 5 hace el daño máximo; repetirlo antes del descanso cuesta 2d12 necrótico por nivel (que crece).',
        },
      },
    },
    'wizard-school-of-illusion': {
      'Malleable Illusions': r('Con una acción cambiás tus ilusiones activas de 1 minuto o más.'),
      'Illusory Reality': r('Con una acción adicional, una parte de tu ilusión de nivel 1+ se vuelve real 1 minuto.'),
    },
    'wizard-school-of-necromancy': {
      'Undead Thralls': r(
        'Animar a los muertos crea un muerto viviente más; tus muertos vivientes suman tu nivel a sus PG y tu competencia al daño.',
      ),
      'Command Undead': {
        use: {
          name: 'Comandar muertos vivientes',
          free: true,
          action: 'action',
          text: 'Un muerto viviente a 60 pies salva CAR o queda bajo tu control.',
          save: { ab: 'cha', dc: 'spell' },
        },
      },
    },
    'wizard-school-of-transmutation': {
      'Minor Alchemy': r(
        'Ritual de 10 minutos: transformás un material en otro (madera, piedra, hierro, cobre, plata) durante una hora.',
      ),
    },
    'wizard-chronurgy-magic': {
      'Convergent Future': free(
        'Futuro convergente',
        'reaction',
        'Una tirada a 60 pies tiene éxito o falla a tu elección; ganás un nivel de agotamiento.',
      ),
    },
    'wizard-graviturgy-magic': {
      'Adjust Density': free(
        'Ajustar densidad',
        'action',
        'Duplicás o reducís a la mitad el peso de una criatura u objeto Grande o menor durante 1 minuto (concentración).',
      ),
      'Gravity Well': r('Al lanzar un conjuro sobre una criatura, podés moverla 5 pies.'),
    },
    'wizard-order-of-scribes': {
      'Manifest Mind': {
        use: {
          name: 'Mente manifiesta',
          max: pb,
          reset: 'long',
          action: 'free',
          text: 'Lanzás un conjuro como si estuvieras en el espacio de tu mente manifestada.',
        },
      },
      'Master Scrivener': r(
        'Tras un descanso largo creás un pergamino de un conjuro de nivel 1 o 2 de tu libro, lanzado un nivel más alto.',
      ),
    },
    // Al tirar iniciativa sin usos, recuperás uno.
    'fighter-battle-master': { Relentless: { onInit: { restore: 'superiority' } } },
    'fighter-samurai': { 'Tireless Spirit': { onInit: { restore: 'sfx:fighter-samurai-fighting-spirit' } } },
    'fighter-arcane-archer': { 'Ever-Ready Shot': { onInit: { restore: 'sfx:fighter-arcane-archer-arcane-shot' } } },
    'fighter-echo-knight': { 'Legion of One': { onInit: { restore: 'sfx:fighter-echo-knight-unleash-incarnation' } } },
    'ranger-gloom-stalker': {
      'Dread Ambusher': {
        onInit: { note: 'Emboscador temible: en tu primer turno, +10 pies y un ataque extra con +1d8.' },
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
