/* Usos limitados, reservas de dados, lanzamientos gratuitos, tiradas de curación, PG temporales y CD
   de los rasgos de subclase. Se suman a subclass-fx-data.js (mismo formato: subclase → rasgo).
   use: { max, reset ('long'|'short'), action, text, roll, save, pool, shared, cost }
     · shared: gasta un recurso de clase ('channel', 'ki', 'sorcery', 'wild-shape', 'inspiration',
       'superiority' o la reserva psiónica de la subclase) en vez de usos propios.
     · roll: { dice, flat, kind: 'heal' | 'temp' | 'damage' | 'roll', type } (x.n: dados o puntos gastados).
     · save: { ab, dc } → «CD 8 + competencia + mod» (dc: característica, 'spell' o 'ki').
     · pool: { die, per } → reserva de dados: cada uso gasta hasta `per` dados y los tira.
   cast: { spells, max, each, reset, will, cost: { res, n } } → lanzamientos que la ficha agrega a tus conjuros. */
(function (root) {
  'use strict';
  const pb = x => x.pb,
    min1 = a => x => Math.max(1, x.m[a]),
    // «Elegí: 1 por descanso corto o largo»
    once = (reset, action, text, extra = {}) => ({ max: 1, reset, action, text, ...extra }),
    times = (max, reset, action, text, extra = {}) => ({ max, reset, action, text, ...extra }),
    channel = (action, text, extra = {}) => ({ shared: 'channel', cost: 1, action, text, ...extra }),
    ki = (cost, action, text, extra = {}) => ({ shared: 'ki', cost, action, text, ...extra }),
    sp = (cost, action, text, extra = {}) => ({ shared: 'sorcery', cost, action, text, ...extra }),
    insp = (action, text, extra = {}) => ({ shared: 'inspiration', cost: 1, action, text, ...extra }),
    kiDie = x => (x.l >= 17 ? 10 : x.l >= 11 ? 8 : x.l >= 5 ? 6 : 4),
    psiDie = x => (x.l >= 17 ? 12 : x.l >= 11 ? 10 : x.l >= 5 ? 8 : 6),
    save = (ab, dc) => ({ ab, dc });

  const MORE = {
    'artificer-alchemist': {
      'Experimental Elixir': {
        use: times(
          x => (x.l >= 15 ? 3 : x.l >= 6 ? 2 : 1),
          'long',
          'action',
          'Elixires gratis tras un descanso largo: tirá 1d6 por cada uno (1 curación 2d4 + INT, 2 rapidez +10 pies, 3 resiliencia +1 CA, 4 osadía +1d4, 5 vuelo 10 pies, 6 transformación). Con un espacio de conjuro podés crear otro eligiendo el efecto.',
          { roll: { dice: () => '1d6', kind: 'roll', label: 'Efecto del elixir (1d6)' } },
        ),
      },
      'Restorative Reagents': {
        cast: { spells: ['lesser restoration'], max: min1('int'), reset: 'long' },
        use: {
          name: 'Reactivos: PG temporales del elixir',
          free: true,
          action: 'free',
          text: 'Quien bebe uno de tus elixires gana 2d6 + INT PG temporales.',
          roll: { dice: () => '2d6', flat: x => Math.max(1, x.m.int), kind: 'temp' },
        },
        auto: 'Restablecimiento menor gratis INT veces por descanso largo (en tus conjuros) y la tirada de PG temporales del elixir.',
      },
      'Chemical Mastery': {
        cast: { spells: ['greater restoration', 'heal'], max: 1, each: true, reset: 'long' },
        partial: false,
        table: '',
        auto: 'Resistencia a ácido y veneno, inmunidad a envenenado, y Restablecimiento mayor y Curar gratis una vez cada uno por descanso largo.',
      },
    },
    'artificer-armorer': {
      'Armor Model': {
        use: times(
          pb,
          'long',
          'bonus',
          'Guardián · Campo defensivo: acción adicional para ganar PG temporales iguales a tu nivel de artífice.',
          { roll: { dice: () => '', flat: x => x.l, kind: 'temp' } },
        ),
        partial: true,
      },
      'Perfected Armor': {
        use: times(
          pb,
          'long',
          'reaction',
          'Guardián: cuando una criatura Grande o menor termina su turno a 30 pies, salva FUE o la atraés hasta 25 pies y podés atacarla.',
          { save: save('str', 'int') },
        ),
        partial: true,
      },
    },
    'artificer-battle-smith': {
      'Arcane Jolt': {
        use: times(
          min1('int'),
          'long',
          'free',
          'Al impactar con un arma mágica (o tu defensor), una vez por turno: daño de fuerza extra o curación a una criatura a 30 pies.',
          { roll: { dice: x => (x.l >= 15 ? '4d6' : '2d6'), kind: 'damage', type: 'force', alt: 'heal' } },
        ),
      },
    },
    'barbarian-path-of-the-ancestral-guardian': {
      'Spirit Shield': {
        use: {
          name: 'Escudo espiritual',
          free: true,
          action: 'reaction',
          text: 'Con Rabia, cuando una criatura que ves a 30 pies recibe daño, reducís ese daño.',
          roll: { dice: x => (x.l >= 14 ? '4d6' : x.l >= 10 ? '3d6' : '2d6'), kind: 'roll', label: 'Daño evitado' },
        },
      },
      'Consult the Spirits': {
        cast: { spells: ['augury', 'clairvoyance'], max: 1, reset: 'short', ability: 'wis' },
        auto: 'Augurio o Clarividencia sin espacio, una vez por descanso corto o largo (en tus conjuros).',
      },
    },
    'barbarian-path-of-the-zealot': {
      'Zealous Presence': {
        use: once(
          'long',
          'bonus',
          'Hasta diez criaturas a 60 pies tienen ventaja en ataques y salvaciones hasta el inicio de tu próximo turno.',
        ),
      },
    },
    'barbarian-path-of-the-beast': {
      'Infectious Fury': {
        use: times(
          pb,
          'long',
          'free',
          'Al impactar con un arma natural en Rabia: el objetivo salva SAB o usa su reacción para atacar a otra criatura, o recibe 2d12 psíquico.',
          { save: save('wis', 'con'), roll: { dice: () => '2d12', kind: 'damage', type: 'psychic' } },
        ),
      },
      'Call the Hunt': {
        use: times(
          pb,
          'long',
          'free',
          'Al entrar en Rabia: elegí aliados a 30 pies; una vez por turno suman 1d6 a un ataque. Ganás 5 PG temporales por cada uno.',
          { roll: { dice: () => '', flat: x => 5 * (x.n || 1), kind: 'temp', count: 'Aliados elegidos', max: 10 } },
        ),
      },
    },
    'barbarian-path-of-wild-magic': {
      'Magic Awareness': {
        use: times(
          pb,
          'long',
          'action',
          'Sentís conjuros y objetos mágicos a 60 pies hasta el final de tu próximo turno.',
        ),
      },
      'Bolstering Magic': {
        use: times(
          pb,
          'long',
          'action',
          'Tocás a una criatura: +1d3 a ataques y pruebas durante 10 minutos, o recupera un espacio de nivel 1d3.',
          { roll: { dice: () => '1d3', kind: 'roll' } },
        ),
      },
    },
    'bard-college-of-glamour': {
      'Mantle of Inspiration': {
        use: insp(
          'bonus',
          'Gastás Inspiración: hasta CAR criaturas a 60 pies ganan PG temporales y pueden moverse con su reacción sin provocar ataques de oportunidad.',
          { roll: { dice: () => '', flat: x => (x.l >= 15 ? 14 : x.l >= 10 ? 11 : x.l >= 5 ? 8 : 5), kind: 'temp' } },
        ),
      },
      'Enthralling Performance': {
        use: once(
          'short',
          'manual',
          'Tras actuar un minuto: hasta CAR humanoides que te vieron salvan SAB o quedan hechizados una hora.',
          { save: save('wis', 'spell') },
        ),
      },
      'Mantle of Majesty': {
        cast: { spells: ['command'], max: 1, reset: 'long' },
        use: once(
          'long',
          'bonus',
          'Durante 1 minuto (concentración) lanzás Orden como acción adicional en cada turno sin gastar espacio.',
        ),
      },
      'Unbreakable Majesty': {
        use: once(
          'short',
          'bonus',
          'Durante 1 minuto, quien te ataca salva CAR o elige otro objetivo; si la supera, tiene desventaja contra tus conjuros.',
          { save: save('cha', 'spell') },
        ),
      },
    },
    'bard-college-of-whispers': {
      'Psychic Blades': {
        use: insp('free', 'Al impactar con un arma, una vez por ronda en tu turno: daño psíquico extra.', {
          roll: {
            dice: x => (x.l >= 15 ? '8d6' : x.l >= 10 ? '5d6' : x.l >= 5 ? '3d6' : '2d6'),
            kind: 'damage',
            type: 'psychic',
          },
        }),
      },
      'Words of Terror': {
        use: once('short', 'manual', 'Tras un minuto a solas con un humanoide: salva SAB o queda asustado una hora.', {
          save: save('wis', 'spell'),
        }),
      },
      'Mantle of Whispers': {
        use: once(
          'short',
          'reaction',
          'Cuando muere un humanoide a 30 pies, capturás su sombra para disfrazarte una hora.',
        ),
      },
      'Shadow Lore': {
        use: once('long', 'action', 'Una criatura salva SAB o queda hechizada por 8 horas.', {
          save: save('wis', 'spell'),
        }),
      },
    },
    'bard-college-of-creation': {
      'Performance of Creation': {
        use: once(
          'long',
          'action',
          'Creás un objeto no mágico (tamaño y valor según tu nivel) que dura tu competencia en horas.',
        ),
      },
      'Animating Performance': {
        use: once('long', 'action', 'Animás un objeto Grande o menor como Objeto danzante durante una hora.'),
      },
    },
    'bard-college-of-eloquence': {
      'Universal Speech': {
        use: once('long', 'action', 'Hasta CAR criaturas a 60 pies te entienden durante una hora.'),
      },
      'Infectious Inspiration': {
        use: times(
          min1('cha'),
          'long',
          'reaction',
          'Cuando alguien a 60 pies acierta usando tu Inspiración, otra criatura recibe un dado de Inspiración sin gastar los tuyos.',
        ),
      },
    },
    'bard-college-of-spirits': {
      'Spirit Session': {
        use: once(
          'long',
          'manual',
          'Ritual de una hora para aprender temporalmente un conjuro de adivinación o nigromancia.',
        ),
      },
    },
    'cleric-knowledge-domain': {
      'Channel Divinity: Knowledge of the Ages': {
        use: channel('action', 'Durante 10 minutos tenés competencia con una habilidad o herramienta.'),
      },
      'Channel Divinity: Read Thoughts': {
        use: channel('action', 'Una criatura a 60 pies salva SAB o leés sus pensamientos un minuto.', {
          save: save('wis', 'spell'),
        }),
      },
      'Visions of the Past': {
        use: once(
          'short',
          'manual',
          'Meditás hasta 1 minuto por punto de SAB para ver el pasado de un objeto o lugar.',
        ),
      },
    },
    'cleric-life-domain': {
      'Channel Divinity: Preserve Life': {
        use: channel(
          'action',
          'Repartís esta curación entre criaturas a 30 pies (cada una hasta la mitad de sus PG máximos).',
          {
            roll: { dice: () => '', flat: x => 5 * x.l, kind: 'roll', label: 'PG para repartir' },
          },
        ),
      },
    },
    'cleric-light-domain': {
      'Warding Flare': {
        use: times(min1('wis'), 'long', 'reaction', 'Un atacante a 30 pies que veas tiene desventaja en su ataque.'),
      },
      'Channel Divinity: Radiance of the Dawn': {
        use: channel(
          'action',
          'Disipás la oscuridad mágica a 30 pies; los enemigos salvan CON (mitad si la superan).',
          {
            save: save('con', 'spell'),
            roll: { dice: () => '2d10', flat: x => x.l, kind: 'damage', type: 'radiant' },
          },
        ),
      },
    },
    'cleric-nature-domain': {
      'Channel Divinity: Charm Animals and Plants': {
        use: channel('action', 'Bestias y plantas a 30 pies salvan SAB o quedan hechizadas 1 minuto.', {
          save: save('wis', 'spell'),
        }),
      },
    },
    'cleric-tempest-domain': {
      'Wrath of the Storm': {
        use: times(
          min1('wis'),
          'long',
          'reaction',
          'Quien te impacta a 5 pies salva DES; si falla, recibe el daño completo, y la mitad si la supera.',
          {
            save: save('dex', 'spell'),
            roll: { dice: () => '2d8', kind: 'damage', type: 'lightning' },
          },
        ),
      },
      'Channel Divinity: Destructive Wrath': {
        use: channel('free', 'Al tirar daño de relámpago o trueno, usás el máximo en vez de tirar.'),
      },
    },
    'cleric-trickery-domain': {
      'Channel Divinity: Invoke Duplicity': {
        use: channel('action', 'Creás un duplicado ilusorio durante 1 minuto (concentración).'),
      },
      'Channel Divinity: Cloak of Shadows': {
        use: channel('action', 'Te volvés invisible hasta el final de tu próximo turno.'),
      },
    },
    'cleric-war-domain': {
      'War Priest': {
        use: times(
          min1('wis'),
          'long',
          'bonus',
          'Tras la acción de Atacar, hacés un ataque con arma como acción adicional.',
        ),
      },
      'Channel Divinity: Guided Strike': {
        use: channel('free', 'Sumás +10 a una tirada de ataque tuya, después de verla.'),
      },
      "Channel Divinity: War God's Blessing": {
        use: channel('reaction', 'Una criatura a 30 pies suma +10 a su tirada de ataque.'),
      },
    },
    'cleric-death-domain': {
      'Channel Divinity: Touch of Death': {
        use: channel('free', 'Al impactar cuerpo a cuerpo, daño necrótico extra.', {
          roll: { dice: () => '', flat: x => 5 + 2 * x.l, kind: 'damage', type: 'necrotic' },
        }),
      },
    },
    'cleric-arcana-domain': {
      'Channel Divinity: Arcane Abjuration': {
        use: channel(
          'action',
          'Un celestial, elemental, feérico o infernal a 30 pies salva SAB o queda expulsado 1 minuto.',
          {
            save: save('wis', 'spell'),
          },
        ),
      },
    },
    'cleric-grave-domain': {
      'Eyes of the Grave': {
        use: times(
          min1('wis'),
          'long',
          'action',
          'Sentís muertos vivientes a 60 pies hasta el final de tu próximo turno.',
        ),
      },
      'Channel Divinity: Path to the Grave': {
        use: channel(
          'action',
          'Maldecís a una criatura: el próximo impacto contra ella la vuelve vulnerable a todo ese daño.',
        ),
      },
      "Sentinel at Death's Door": {
        use: times(
          min1('wis'),
          'long',
          'reaction',
          'Un crítico contra una criatura a 30 pies se vuelve un impacto normal.',
        ),
      },
    },
    'cleric-order-domain': {
      "Channel Divinity: Order's Demand": {
        use: channel(
          'action',
          'Las criaturas que elijas a 30 pies salvan SAB o quedan hechizadas hasta tu próximo turno y pueden soltar lo que sostienen.',
          {
            save: save('wis', 'spell'),
          },
        ),
      },
      'Embodiment of the Law': {
        use: times(
          min1('wis'),
          'long',
          'free',
          'Lanzás un encantamiento de nivel 1 o más con espacio como acción adicional.',
        ),
      },
    },
    'cleric-peace-domain': {
      'Emboldening Bond': {
        use: times(
          pb,
          'long',
          'action',
          'Unís hasta tu competencia en criaturas por 10 minutos: una vez por turno suman 1d4 a un ataque, prueba o salvación cerca de otra unida.',
        ),
      },
      'Channel Divinity: Balm of Peace': {
        use: channel(
          'action',
          'Te movés sin provocar ataques de oportunidad y curás a cada criatura que pases a 5 pies.',
          {
            roll: { dice: () => '2d6', flat: x => Math.max(1, x.m.wis), kind: 'heal' },
          },
        ),
      },
    },
    'cleric-twilight-domain': {
      'Vigilant Blessing': {
        use: {
          name: 'Bendición vigilante',
          free: true,
          action: 'action',
          text: 'Una criatura tiene ventaja en su próxima tirada de iniciativa.',
        },
      },
      'Channel Divinity: Twilight Sanctuary': {
        use: channel(
          'action',
          'Esfera de 30 pies durante 1 minuto: al terminar su turno dentro, cada criatura gana PG temporales o termina un hechizo o miedo.',
          {
            roll: { dice: () => '1d6', flat: x => x.l, kind: 'temp' },
          },
        ),
      },
      'Steps of Night': {
        use: times(
          pb,
          'long',
          'bonus',
          'En luz tenue u oscuridad, velocidad de vuelo igual a la de caminar durante 1 minuto.',
        ),
      },
    },
    'druid-circle-of-the-land': {
      'Natural Recovery': {
        use: once(
          'long',
          'manual',
          'Durante un descanso corto recuperás espacios que sumen hasta la mitad de tu nivel (hacia arriba), ninguno de nivel 6 o más.',
          {
            slots: x => Math.ceil(x.l / 2),
          },
        ),
      },
    },
    'druid-circle-of-the-moon': {
      'Combat Wild Shape': {
        use: {
          name: 'Forma salvaje de combate: curarte',
          free: true,
          action: 'bonus',
          slot: true,
          text: 'En forma salvaje, gastás un espacio de conjuro y recuperás 1d8 por nivel del espacio.',
          roll: { dice: x => (x.n || 1) + 'd8', kind: 'heal' },
        },
        partial: true,
      },
      'Thousand Forms': {
        cast: { spells: ['alter self'], will: true },
        auto: 'Alterar el propio a voluntad, en tus conjuros.',
      },
    },
    'druid-circle-of-dreams': {
      'Balm of the Summer Court': {
        use: {
          max: x => x.l,
          reset: 'long',
          action: 'bonus',
          pool: { die: () => 6, per: x => Math.max(1, Math.floor(x.l / 2)) },
          text: 'Reserva de d6 igual a tu nivel: gastás hasta la mitad de tu nivel por uso; una criatura a 120 pies recupera la tirada y gana 1 PG temporal por dado.',
          roll: { dice: x => (x.n || 1) + 'd6', kind: 'heal', temp: x => x.n || 1 },
        },
      },
      'Hidden Paths': {
        use: times(
          min1('wis'),
          'long',
          'bonus',
          'Te teletransportás 60 pies, o con una acción movés 30 pies a una criatura dispuesta que toques.',
        ),
      },
      'Walker in Dreams': {
        cast: { spells: ['dream', 'scrying', 'teleportation circle'], max: 1, reset: 'long' },
        auto: 'Sueño, Escudriñar o Círculo de teletransportación gratis una vez por descanso largo (tras un descanso corto).',
      },
    },
    'druid-circle-of-the-shepherd': {
      'Spirit Totem': {
        use: once(
          'short',
          'bonus',
          'Invocás un espíritu 1 minuto. Oso: PG temporales a los aliados del aura y ventaja en FUE. Halcón: ventaja en ataques. Unicornio: ventaja para detectar y curación extra.',
          {
            roll: { dice: () => '', flat: x => 5 + x.l, kind: 'temp', label: 'Oso: PG temporales' },
          },
        ),
      },
      'Faithful Summons': {
        use: once(
          'long',
          'free',
          'Al caer a 0 PG o quedar incapacitado, cuatro bestias te protegen (como Conjurar animales de nivel 9) durante una hora.',
        ),
      },
    },
    'druid-circle-of-stars': {
      'Star Map': {
        cast: { spells: ['guiding bolt'], max: pb, reset: 'long' },
        auto: 'Rayo guía gratis tu competencia de veces por descanso largo (en tus conjuros).',
      },
      'Cosmic Omen': {
        use: times(
          pb,
          'long',
          'reaction',
          'Tras un descanso largo tirás un dado: par Bienaventuranza (+1d6 a un aliado), impar Infortunio (−1d6 a un enemigo).',
          {
            roll: { dice: () => '1d6', kind: 'roll' },
          },
        ),
      },
    },
    'druid-circle-of-wildfire': {
      'Cauterizing Flames': {
        use: times(
          pb,
          'long',
          'reaction',
          'Cuando una criatura entra en una llama espectral a 30 pies: curás o hacés fuego.',
          {
            roll: { dice: () => '2d10', flat: x => x.m.wis, kind: 'heal', alt: 'damage', type: 'fire' },
          },
        ),
      },
      'Blazing Revival': {
        use: once(
          'long',
          'free',
          'Al caer a 0 PG con tu espíritu a 120 pies, lo sacrificás y recuperás la mitad de tus PG máximos.',
          { roll: { dice: () => '', flat: x => Math.floor(x.max / 2), kind: 'heal' } },
        ),
      },
    },
    'fighter-arcane-archer': {
      'Arcane Shot': {
        use: times(2, 'short', 'free', 'Una vez por turno, al impactar con una flecha, aplicás un Disparo arcano.', {
          save: save('', 'int'),
        }),
        partial: true,
        table: 'El efecto de cada disparo se resuelve en la mesa.',
      },
    },
    'fighter-cavalier': {
      'Warding Maneuver': {
        use: times(
          min1('con'),
          'long',
          'reaction',
          'Una criatura a 5 pies que te vea suma 1d8 a su CA contra un ataque; si igual impacta, tiene resistencia a ese daño.',
          {
            roll: { dice: () => '1d8', kind: 'roll', label: '+CA' },
          },
        ),
      },
    },
    'fighter-samurai': {
      'Fighting Spirit': {
        use: times(3, 'long', 'bonus', 'Ventaja en tus ataques con arma este turno y PG temporales.', {
          roll: { dice: () => '', flat: x => (x.l >= 15 ? 15 : x.l >= 10 ? 10 : 5), kind: 'temp' },
        }),
      },
      'Strength before Death': {
        use: once('long', 'reaction', 'Al caer a 0 PG sin morir, tomás un turno extra inmediatamente.'),
      },
    },
    'fighter-echo-knight': {
      'Unleash Incarnation': {
        use: times(
          min1('con'),
          'long',
          'free',
          'Durante la acción de Atacar, un ataque cuerpo a cuerpo extra desde tu eco.',
        ),
      },
      'Shadow Martyr': {
        use: once('short', 'reaction', 'Tu eco se interpone y recibe un ataque dirigido a otra criatura.'),
      },
      'Reclaim Potential': {
        use: times(min1('con'), 'long', 'free', 'Cuando destruyen tu eco, ganás PG temporales si no tenías.', {
          roll: { dice: () => '2d6', flat: x => x.m.con, kind: 'temp' },
        }),
      },
    },
    'fighter-psi-warrior': {
      'Psionic Power': {
        use: [
          {
            id: 'psi',
            name: 'Dados de energía psiónica',
            max: x => 2 * x.pb,
            reset: 'long',
            action: 'free',
            pool: { die: psiDie, per: () => 1 },
            text: 'Escudo protector (reacción: reducís el daño a una criatura que veas en el dado + INT), Golpe psiónico (al impactar, el dado + INT de fuerza) o Movimiento telequinético.',
            roll: { dice: x => '1d' + psiDie(x), flat: x => x.m.int, kind: 'roll' },
          },
          {
            id: 'psi-recover',
            name: 'Recuperar un dado psiónico',
            max: 1,
            reset: 'short',
            action: 'bonus',
            text: 'Acción adicional: recuperás un dado de energía psiónica.',
            restore: 'psi',
          },
        ],
        partial: true,
      },
      'Telekinetic Adept': {
        use: once(
          'short',
          'bonus',
          'Salto propulsado: vuelo igual al doble de tu velocidad hasta el final del turno (o gastá un dado psiónico).',
        ),
      },
      'Guarded Mind': {
        use: {
          name: 'Mente protegida',
          shared: 'psi',
          cost: 1,
          action: 'free',
          text: 'Al empezar tu turno, gastás un dado psiónico para terminar hechizado o asustado.',
        },
        partial: false,
        table: '',
      },
      'Bulwark of Force': {
        use: once(
          'long',
          'bonus',
          'Hasta INT criaturas a 30 pies tienen media cobertura 1 minuto (o gastá un dado psiónico).',
        ),
      },
    },
    'fighter-rune-knight': {
      "Giant's Might": {
        use: times(
          pb,
          'long',
          'bonus',
          'Durante 1 minuto: Grande, ventaja en pruebas y salvaciones de FUE, y +1d6 a un impacto por turno (1d8 desde 10, 1d10 desde 18).',
        ),
      },
      'Runic Shield': {
        use: times(pb, 'long', 'reaction', 'Cuando un aliado a 60 pies recibe un impacto, el atacante repite el d20.'),
      },
    },
    'fighter-purple-dragon-knight-banneret': {
      'Rallying Cry': {
        use: {
          name: 'Grito de aliento',
          free: true,
          action: 'free',
          text: 'Al usar Segundo aliento, hasta tres aliados a 60 pies recuperan tu nivel de guerrero en PG.',
          roll: { dice: () => '', flat: x => x.l, kind: 'roll', label: 'PG por aliado' },
        },
      },
    },
    'monk-way-of-the-open-hand': {
      'Wholeness of Body': {
        use: once('long', 'action', 'Recuperás tres veces tu nivel de monje en PG.', {
          roll: { dice: () => '', flat: x => 3 * x.l, kind: 'heal' },
        }),
      },
    },
    'monk-way-of-the-long-death': {
      'Mastery of Death': { use: ki(1, 'free', 'Al caer a 0 PG, quedás con 1 PG.') },
      'Touch of the Long Death': {
        use: ki(
          { min: 1, max: 10 },
          'action',
          'Tocás a una criatura: salva CON o recibe 2d10 necrótico por punto de ki (mitad si la supera).',
          {
            save: save('con', 'ki'),
            roll: { dice: x => 2 * (x.n || 1) + 'd10', kind: 'damage', type: 'necrotic' },
          },
        ),
      },
      'Hour of Reaping': {
        use: {
          name: 'Hora de la cosecha',
          free: true,
          action: 'action',
          text: 'Las criaturas a 30 pies que te vean salvan SAB o quedan asustadas hasta el final de tu próximo turno.',
          save: save('wis', 'ki'),
        },
      },
    },
    'monk-way-of-the-sun-soul': {
      'Searing Arc Strike': {
        covered: true,
        auto: 'Manos ardientes por 2 ki tras la acción de Atacar ya está en tus conjuros.',
      },
      'Searing Sunburst': {
        use: {
          name: 'Explosión solar abrasadora',
          shared: 'ki',
          cost: { min: 0, max: 3 },
          action: 'action',
          text: 'Esfera de 20 pies a 150: salvan CON o reciben 2d6 radiante, +2d6 por cada ki gastado (hasta 3).',
          save: save('con', 'ki'),
          roll: { dice: x => 2 + 2 * (x.n || 0) + 'd6', kind: 'damage', type: 'radiant' },
        },
      },
    },
    'monk-way-of-mercy': {
      'Hand of Healing': {
        use: ki(1, 'action', 'Tocás a una criatura: recupera el dado de artes marciales + SAB.', {
          roll: { dice: x => '1d' + kiDie(x), flat: x => x.m.wis, kind: 'heal' },
        }),
      },
      'Hand of Harm': {
        use: ki(1, 'free', 'Una vez por turno, al impactar sin armas: daño necrótico extra.', {
          roll: { dice: x => '1d' + kiDie(x), flat: x => x.m.wis, kind: 'damage', type: 'necrotic' },
        }),
      },
      'Hand of Ultimate Mercy': {
        use: once('long', 'action', 'Gastás 5 ki: revivís a una criatura muerta hace menos de 24 horas.', {
          extraCost: { res: 'ki', n: 5 },
          roll: { dice: () => '4d10', flat: x => x.m.wis, kind: 'roll', label: 'PG al revivir' },
        }),
      },
    },
    'monk-way-of-the-ascendant-dragon': {
      'Breath of the Dragon': {
        use: times(
          pb,
          'long',
          'free',
          'Reemplazás un ataque por un aliento (cono 20 o línea 30): salvan DES, mitad si la superan. Sin usos, cuesta 2 ki.',
          {
            save: save('dex', 'ki'),
            roll: { dice: x => (x.l >= 17 ? 4 : x.l >= 11 ? 3 : 2) + 'd' + kiDie(x), kind: 'damage' },
          },
        ),
      },
      'Wings Unfurled': {
        use: times(pb, 'long', 'free', 'Al usar Paso del viento, vuelo igual a tu velocidad hasta el final del turno.'),
      },
      'Aspect of the Wyrm': {
        use: once('long', 'bonus', 'Aura de 10 pies durante 1 minuto: asustar o resistencia elemental (o gastá 3 ki).'),
      },
    },
    'paladin-oath-of-devotion': {
      'Turn the Unholy': {
        use: channel('action', 'Infernales y muertos vivientes a 30 pies salvan SAB o quedan expulsados 1 minuto.', {
          save: save('wis', 'spell'),
        }),
      },
      'Holy Nimbus': {
        use: once(
          'long',
          'action',
          'Luz brillante 1 minuto: los enemigos que empiezan su turno a 30 pies reciben 10 radiante.',
        ),
      },
    },
    'paladin-oath-of-the-ancients': {
      "Nature's Wrath": {
        use: channel(
          'action',
          'Una criatura a 10 pies salva FUE o DES o queda apresada (repite al final de cada turno).',
          { save: save('str', 'spell') },
        ),
      },
      'Turn the Faithless': {
        use: channel('action', 'Feéricos e infernales a 30 pies salvan SAB o quedan expulsados 1 minuto.', {
          save: save('wis', 'spell'),
        }),
      },
      'Undying Sentinel': { use: once('long', 'free', 'Al caer a 0 PG sin morir, quedás con 1 PG.') },
    },
    'paladin-oath-of-vengeance': {
      'Abjure Enemy': {
        use: channel(
          'action',
          'Una criatura a 60 pies salva SAB: si falla queda asustada con velocidad 0; si la supera, velocidad a la mitad.',
          {
            save: save('wis', 'spell'),
          },
        ),
      },
      'Vow of Enmity': {
        use: channel('bonus', 'Ventaja en los ataques contra una criatura a 10 pies durante 1 minuto.'),
      },
    },
    'paladin-oathbreaker': {
      'Control Undead': {
        use: channel('action', 'Un muerto viviente a 30 pies salva SAB o obedece tus órdenes 24 horas.', {
          save: save('wis', 'spell'),
        }),
      },
      'Dreadful Aspect': {
        use: channel('action', 'Las criaturas que elijas a 30 pies salvan SAB o quedan asustadas 1 minuto.', {
          save: save('wis', 'spell'),
        }),
      },
    },
    'paladin-oath-of-the-crown': {
      'Champion Challenge': {
        use: channel(
          'bonus',
          'Las criaturas que elijas a 30 pies salvan SAB o no pueden alejarse más de 30 pies de vos.',
          {
            save: save('wis', 'spell'),
          },
        ),
      },
      'Turn the Tide': {
        use: channel('bonus', 'Cada criatura a 30 pies con la mitad de sus PG o menos se cura.', {
          roll: { dice: () => '1d6', flat: x => Math.max(1, x.m.cha), kind: 'heal' },
        }),
      },
    },
    'paladin-oath-of-conquest': {
      'Conquering Presence': {
        use: channel('action', 'Las criaturas que elijas a 30 pies salvan SAB o quedan asustadas 1 minuto.', {
          save: save('wis', 'spell'),
        }),
      },
      'Guided Strike': { use: channel('free', 'Sumás +10 a una tirada de ataque tuya, después de verla.') },
    },
    'paladin-oath-of-redemption': {
      'Emissary of Peace': { use: channel('bonus', '+5 a Persuasión durante 10 minutos.') },
      'Rebuke the Violent': {
        use: channel(
          'reaction',
          'Quien dañó a otra criatura a 30 pies salva SAB o recibe el mismo daño radiante (mitad si la supera).',
          {
            save: save('wis', 'spell'),
          },
        ),
      },
    },
    'paladin-oath-of-glory': {
      'Peerless Athlete': {
        use: channel(
          'bonus',
          'Durante 10 minutos: ventaja en Atletismo y Acrobacias, doble carga y saltos más largos.',
        ),
      },
      'Inspiring Smite': {
        use: channel('bonus', 'Tras un Castigo divino, repartís PG temporales entre criaturas a 30 pies.', {
          roll: { dice: () => '2d8', flat: x => x.l, kind: 'roll', label: 'PG temporales para repartir' },
        }),
      },
      'Glorious Defense': {
        use: times(
          min1('cha'),
          'long',
          'reaction',
          'Una criatura a 10 pies suma tu competencia a su CA contra un ataque; si falla, podés atacar al atacante.',
        ),
      },
    },
    'paladin-oath-of-the-watchers': {
      "Watcher's Will": {
        use: channel(
          'action',
          'Hasta CAR criaturas a 30 pies tienen ventaja en salvaciones de INT, SAB y CAR durante 1 minuto.',
        ),
      },
      'Abjure the Extraplanar': {
        use: channel(
          'action',
          'Aberraciones, celestiales, elementales, feéricos e infernales a 30 pies salvan SAB o quedan expulsados.',
          {
            save: save('wis', 'spell'),
          },
        ),
      },
      'Vigilant Rebuke': {
        use: {
          name: 'Reprimenda vigilante',
          free: true,
          action: 'reaction',
          text: 'Cuando vos o alguien a 30 pies supera una salvación de INT, SAB o CAR, el causante recibe daño de fuerza.',
          roll: { dice: () => '2d8', flat: x => x.m.cha, kind: 'damage', type: 'force' },
        },
      },
    },
    'ranger-monster-slayer': {
      "Hunter's Sense": {
        use: times(
          min1('wis'),
          'long',
          'action',
          'Conocés las inmunidades, resistencias y vulnerabilidades de una criatura a 60 pies.',
        ),
      },
      "Magic-User's Nemesis": {
        use: once('short', 'reaction', 'Una criatura que lanza un conjuro o se teletransporta salva SAB o falla.', {
          save: save('wis', 'spell'),
        }),
      },
    },
    'ranger-horizon-walker': {
      'Detect Portal': {
        use: once('short', 'action', 'Sentís la distancia y dirección del portal planar más cercano a una milla.'),
      },
      'Ethereal Step': {
        cast: { spells: ['etherealness'], max: 1, reset: 'short' },
        auto: 'Forma etérea como acción adicional sin espacio, una vez por descanso corto o largo (en tus conjuros).',
      },
    },
    'ranger-fey-wanderer': {
      'Fey Reinforcements': {
        cast: { spells: ['summon fey'], max: 1, reset: 'long' },
        auto: 'Invocar feérico gratis una vez por descanso largo (en tus conjuros).',
      },
      'Misty Wanderer': {
        cast: { spells: ['misty step'], max: min1('wis'), reset: 'long' },
        auto: 'Paso brumoso gratis SAB veces por descanso largo (en tus conjuros).',
      },
    },
    'ranger-swarmkeeper': {
      'Writhing Tide': { use: times(pb, 'long', 'bonus', 'Vuelo de 10 pies (flotás) durante 1 minuto.') },
      'Swarming Dispersal': {
        use: times(pb, 'long', 'reaction', 'Al recibir daño: resistencia a ese daño y te teletransportás 30 pies.'),
      },
    },
    'ranger-drakewarden': {
      "Drake's Breath": {
        use: once(
          'long',
          'action',
          'Cono de 30 pies del tipo de tu dragón: salvan DES, mitad si la superan (o gastá un espacio de nivel 3+).',
          {
            save: save('dex', 'spell'),
            roll: { dice: x => (x.l >= 15 ? '10d6' : '8d6'), kind: 'damage' },
          },
        ),
      },
      'Perfected Bond': {
        use: times(pb, 'long', 'reaction', 'Vos o tu dragón ganan resistencia a un daño que reciben.'),
      },
    },
    'rogue-inquisitive': {
      'Unerring Eye': {
        use: times(min1('wis'), 'long', 'action', 'Sentís ilusiones, cambiaformas y engaños mágicos a 30 pies.'),
      },
    },
    'rogue-swashbuckler': {
      'Master Duelist': { use: once('short', 'free', 'Cuando fallás un ataque, lo repetís con ventaja.') },
    },
    'rogue-phantom': {
      'Wails from the Grave': {
        use: times(
          pb,
          'long',
          'free',
          'Tras un Ataque furtivo, otra criatura a 30 pies recibe necrótico (la mitad de tus dados de Ataque furtivo).',
          {
            roll: { dice: x => Math.ceil(Math.ceil(x.l / 2) / 2) + 'd6', kind: 'damage', type: 'necrotic' },
          },
        ),
      },
      'Ghost Walk': {
        use: once(
          'long',
          'bonus',
          'Durante 10 minutos: vuelo de 10 pies, los ataques contra vos tienen desventaja y atravesás objetos (o destruí una baratija).',
        ),
      },
    },
    'rogue-soulknife': {
      'Psionic Power': {
        use: [
          {
            id: 'psi',
            name: 'Dados de energía psiónica',
            max: x => 2 * x.pb,
            reset: 'long',
            action: 'free',
            pool: { die: psiDie, per: () => 1 },
            text: 'Sumás el dado a una prueba con competencia que fallaste (solo lo gastás si acertás) o hablás telepáticamente.',
            roll: { dice: x => '1d' + psiDie(x), kind: 'roll' },
          },
          {
            id: 'psi-recover',
            name: 'Recuperar un dado psiónico',
            max: 1,
            reset: 'short',
            action: 'bonus',
            text: 'Acción adicional: recuperás un dado de energía psiónica.',
            restore: 'psi',
          },
        ],
        partial: true,
      },
      'Psychic Veil': { use: once('long', 'action', 'Invisible hasta una hora (o gastá un dado psiónico).') },
      'Rend Mind': {
        use: once(
          'long',
          'free',
          'Con Ataque furtivo de cuchilla psíquica: salva SAB o queda aturdido 1 minuto (o gastá 3 dados).',
          { save: save('wis', 'dex') },
        ),
      },
    },
    'rogue-arcane-trickster': {
      'Spell Thief': {
        use: once(
          'long',
          'reaction',
          'El lanzador salva con su característica contra tu CD: si falla, el conjuro no te afecta y lo aprendés 8 horas.',
          { save: save('', 'spell') },
        ),
      },
    },
    'sorcerer-wild-magic': {
      'Tides of Chaos': { use: once('long', 'free', 'Ventaja en una tirada de ataque, prueba o salvación.') },
      'Bend Luck': {
        use: sp(2, 'reaction', 'Sumás o restás 1d4 a la tirada de otra criatura que veas.', {
          roll: { dice: () => '1d4', kind: 'roll' },
        }),
      },
    },
    'sorcerer-divine-soul': {
      'Favored by the Gods': {
        use: once('short', 'free', 'Sumás 2d4 a una tirada de ataque o salvación fallida.', {
          roll: { dice: () => '2d4', kind: 'roll' },
        }),
      },
      'Unearthly Recovery': {
        use: once('long', 'bonus', 'Con menos de la mitad de tus PG, recuperás la mitad de tus PG máximos.', {
          roll: { dice: () => '', flat: x => Math.floor(x.max / 2), kind: 'heal' },
        }),
      },
    },
    'sorcerer-shadow-magic': {
      'Eyes of the Dark': {
        cast: { spells: ['darkness'], cost: { res: 'sorcery', n: 2 }, minLevel: 3 },
        partial: false,
        table: '',
        auto: 'Visión en la oscuridad de 120 pies y, desde el nivel 3, Oscuridad por 2 puntos de hechicería (en tus conjuros).',
      },
      'Strength of the Grave': {
        use: once(
          'long',
          'free',
          'Al caer a 0 PG (salvo radiante o crítico), salvás CAR contra 5 + el daño: si la superás, quedás con 1 PG.',
        ),
      },
      'Hound of Ill Omen': {
        use: sp(3, 'bonus', 'Invocás un sabueso contra una criatura a 120 pies durante 5 minutos.'),
      },
      'Umbral Form': {
        use: sp(
          6,
          'bonus',
          'Durante 1 minuto: resistencia a todo salvo fuerza y radiante, y atravesás criaturas y objetos.',
        ),
      },
    },
    'sorcerer-storm-sorcery': {
      "Storm's Fury": {
        use: {
          name: 'Furia de la tormenta',
          free: true,
          action: 'reaction',
          text: 'Quien te impacta cuerpo a cuerpo recibe relámpago y salva FUE o lo empujás 20 pies.',
          save: save('str', 'spell'),
          roll: { dice: () => '', flat: x => x.l, kind: 'damage', type: 'lightning' },
        },
      },
      'Wind Soul': {
        use: once(
          'short',
          'action',
          'Reducís tu vuelo a 30 pies y das 30 pies de vuelo a hasta 3 + CAR criaturas durante una hora.',
        ),
      },
    },
    'sorcerer-aberrant-mind': {
      'Warping Implosion': {
        use: once(
          'long',
          'action',
          'Te teletransportás 120 pies; las criaturas a 30 pies del punto de partida salvan FUE o reciben fuerza y son atraídas (o gastá 5 puntos).',
          {
            save: save('str', 'spell'),
            roll: { dice: () => '3d10', kind: 'damage', type: 'force' },
          },
        ),
      },
    },
    'sorcerer-clockwork-soul': {
      'Restore Balance': {
        use: times(pb, 'long', 'reaction', 'Una criatura a 60 pies tira sin ventaja ni desventaja.'),
      },
      'Trance of Order': {
        use: once(
          'long',
          'bonus',
          'Durante 1 minuto nadie tiene ventaja contra vos y tus d20 de 9 o menos cuentan como 10 (o gastá 5 puntos).',
        ),
      },
      'Clockwork Cavalcade': {
        use: once(
          'long',
          'action',
          'Cubo de 30 pies: repartís hasta 100 PG, reparás objetos y terminás conjuros de nivel 6 o menos (o gastá 7 puntos).',
          {
            roll: { dice: () => '', flat: () => 100, kind: 'roll', label: 'PG para repartir' },
          },
        ),
      },
      'Bastion of Law': {
        use: {
          name: 'Bastión de la ley',
          shared: 'sorcery',
          cost: { min: 1, max: 5 },
          action: 'action',
          text: 'Protegés a una criatura con tantos d8 como puntos: al recibir daño tira los que quiera y lo reduce.',
          roll: { dice: x => (x.n || 1) + 'd8', kind: 'roll', label: 'Escudo' },
        },
      },
    },
    'sorcerer-lunar-sorcery': {
      'Lunar Boons': {
        use: times(pb, 'long', 'free', 'La metamagia de un conjuro de la escuela de tu fase cuesta 1 punto menos.'),
      },
    },
    'warlock-the-archfey': {
      'Fey Presence': {
        use: once(
          'short',
          'action',
          'Cubo de 10 pies: salvan SAB o quedan hechizadas o asustadas hasta el final de tu próximo turno.',
          {
            save: save('wis', 'spell'),
          },
        ),
      },
      'Misty Escape': {
        use: once('short', 'reaction', 'Al recibir daño te volvés invisible y te teletransportás 60 pies.'),
      },
      'Dark Delirium': {
        use: once(
          'short',
          'action',
          'Una criatura a 60 pies salva SAB o queda hechizada o asustada en una ilusión 1 minuto.',
          { save: save('wis', 'spell') },
        ),
      },
    },
    'warlock-the-fiend': {
      "Dark One's Own Luck": {
        use: once('short', 'free', 'Sumás 1d10 a una prueba o salvación, después de tirar.', {
          roll: { dice: () => '1d10', kind: 'roll' },
        }),
      },
      'Hurl Through Hell': {
        use: once(
          'long',
          'free',
          'Al impactar, mandás al objetivo a los planos inferiores; al volver recibe psíquico (salvo infernales).',
          {
            roll: { dice: () => '10d10', kind: 'damage', type: 'psychic' },
          },
        ),
      },
    },
    'warlock-the-great-old-one': {
      'Entropic Ward': {
        use: once('short', 'reaction', 'Desventaja al ataque contra vos; si falla, tenés ventaja contra el atacante.'),
      },
    },
    'warlock-the-undying': {
      'Defy Death': {
        use: once(
          'long',
          'free',
          'Al superar una salvación de muerte o estabilizar con Salvar a los moribundos, recuperás PG.',
          {
            roll: { dice: () => '1d8', flat: x => Math.max(1, x.m.con), kind: 'heal' },
          },
        ),
      },
      'Indestructible Life': {
        use: once('short', 'bonus', 'Recuperás PG y podés reinsertar una parte cortada.', {
          roll: { dice: () => '1d8', flat: x => x.l, kind: 'heal' },
        }),
      },
    },
    'warlock-the-celestial': {
      'Healing Light': {
        use: {
          max: x => x.l + 1,
          reset: 'long',
          action: 'bonus',
          pool: { die: () => 6, per: x => Math.max(1, x.m.cha) },
          text: 'Reserva de d6 (nivel + 1): curás a una criatura a 60 pies gastando hasta CAR dados.',
          roll: { dice: x => (x.n || 1) + 'd6', kind: 'heal' },
        },
      },
      'Celestial Resilience': {
        use: {
          name: 'Resiliencia celestial',
          free: true,
          action: 'free',
          text: 'Al terminar un descanso corto o largo ganás PG temporales (y hasta cinco aliados, la mitad de tu nivel + CAR).',
          roll: { dice: () => '', flat: x => x.l + x.m.cha, kind: 'temp' },
        },
      },
      'Searing Vengeance': {
        use: once(
          'long',
          'free',
          'Al tirar una salvación de muerte, te levantás con la mitad de tus PG; los enemigos a 30 pies reciben radiante y quedan cegados.',
          {
            roll: { dice: () => '2d8', flat: x => x.m.cha, kind: 'damage', type: 'radiant' },
          },
        ),
      },
    },
    'warlock-the-hexblade': {
      'Accursed Specter': {
        use: once(
          'long',
          'free',
          'Al matar a un humanoide, se levanta como espectro a tu servicio hasta tu próximo descanso largo.',
        ),
      },
    },
    'warlock-the-fathomless': {
      'Tentacle of the Deeps': {
        use: times(
          pb,
          'long',
          'bonus',
          'Tentáculo espectral 1 minuto: ataque de conjuro a 10 pies, frío y −10 pies de velocidad.',
          {
            roll: { dice: x => (x.l >= 10 ? '2d8' : '1d8'), kind: 'damage', type: 'cold' },
          },
        ),
      },
      'Guardian Coil': {
        use: {
          name: 'Espiral guardiana',
          free: true,
          action: 'reaction',
          text: 'Cuando vos o alguien a 10 pies del tentáculo recibe daño, lo reducís.',
          roll: { dice: x => (x.l >= 10 ? '2d8' : '1d8'), kind: 'roll', label: 'Daño evitado' },
        },
      },
      'Grasping Tentacles': {
        use: {
          name: 'Tentáculos aferradores: PG temporales',
          free: true,
          action: 'free',
          text: 'Al lanzar Tentáculos negros de Evard ganás PG temporales iguales a tu nivel.',
          roll: { dice: () => '', flat: x => x.l, kind: 'temp' },
        },
      },
      'Fathomless Plunge': {
        use: once(
          'short',
          'action',
          'Vos y hasta cinco criaturas a 30 pies se teletransportan a un agua conocida a una milla.',
        ),
      },
    },
    'warlock-the-genie': {
      'Bottled Respite': {
        use: once('long', 'action', 'Entrás en tu recipiente hasta el doble de tu competencia en horas.'),
      },
      'Elemental Gift': { use: times(pb, 'long', 'bonus', 'Vuelo de 30 pies (flotás) durante 10 minutos.') },
    },
    'warlock-the-undead': {
      'Form of Dread': {
        use: times(
          pb,
          'long',
          'bonus',
          'Durante 1 minuto: PG temporales, inmunidad a asustado y una vez por turno, al impactar, salva SAB o queda asustado.',
          {
            save: save('wis', 'spell'),
            roll: { dice: () => '1d10', flat: x => x.l, kind: 'temp' },
          },
        ),
      },
      'Spirit Projection': { use: once('long', 'action', 'Proyectás tu espíritu hasta una hora (concentración).') },
    },
    'wizard-school-of-abjuration': {
      'Arcane Ward': {
        use: {
          name: 'Protección arcana',
          max: x => 2 * x.l + x.m.int,
          reset: 'long',
          action: 'free',
          ward: true,
          text: 'Al lanzar tu primera abjuración de nivel 1+ tras un descanso largo, la protección aparece con estos PG y absorbe el daño que recibís. Cada abjuración posterior le devuelve el doble del nivel del espacio.',
        },
      },
      'Improved Abjuration': {
        partial: false,
        auto: 'Recordatorio: las pruebas de característica de tus abjuraciones (Contrahechizo, Disipar magia) suman tu competencia.',
      },
    },
    'wizard-school-of-conjuration': {
      'Benign Transposition': {
        use: once(
          'long',
          'action',
          'Te teletransportás 30 pies o intercambiás lugar con una criatura dispuesta (vuelve al lanzar una conjuración).',
        ),
      },
    },
    'wizard-school-of-divination': {
      'The Third Eye': {
        use: once(
          'short',
          'action',
          'Elegís visión en la oscuridad, visión etérea, leer idiomas o ver lo invisible hasta tu próximo descanso.',
        ),
      },
    },
    'wizard-school-of-illusion': {
      'Illusory Self': { use: once('short', 'reaction', 'Un ataque contra vos falla automáticamente.') },
    },
    'wizard-school-of-transmutation': {
      Shapechanger: {
        cast: { spells: ['polymorph'], max: 1, reset: 'short' },
        auto: 'Polimorfar sobre vos mismo (bestia de VD 1 o menos) sin espacio, una vez por descanso corto o largo.',
      },
      'Master Transmuter': {
        use: once(
          'long',
          'action',
          'Destruís la piedra del transmutador para una gran transformación, curación, Revivir a los muertos o rejuvenecer.',
        ),
      },
    },
    'wizard-chronurgy-magic': {
      'Chronal Shift': {
        use: times(
          2,
          'long',
          'reaction',
          'Tras ver una tirada de ataque, prueba o salvación a 30 pies, obligás a repetirla.',
        ),
      },
      'Momentary Stasis': {
        use: times(
          min1('int'),
          'long',
          'action',
          'Una criatura Grande o menor a 60 pies salva CON o queda incapacitada con velocidad 0.',
          {
            save: save('con', 'spell'),
          },
        ),
      },
      'Arcane Abeyance': {
        use: once('short', 'manual', 'Guardás un conjuro de nivel 4 o menos en una cuenta durante una hora.'),
      },
    },
    'wizard-graviturgy-magic': {
      'Violent Attraction': {
        use: times(min1('int'), 'long', 'reaction', 'Un impacto con arma a 60 pies suma 1d10, o una caída suma 2d10.', {
          roll: { dice: () => '1d10', kind: 'damage' },
        }),
      },
      'Event Horizon': {
        use: once(
          'long',
          'action',
          'Aura de 30 pies durante 1 minuto (concentración): salvan FUE o reciben fuerza y velocidad 0 (o gastá un espacio de nivel 3+).',
          {
            save: save('str', 'spell'),
            roll: { dice: () => '2d10', kind: 'damage', type: 'force' },
          },
        ),
      },
    },
    'wizard-order-of-scribes': {
      'Awakened Spellbook': {
        use: once('long', 'manual', 'Lanzás un ritual en su tiempo normal, sin los 10 minutos extra.'),
      },
      'One with the Word': {
        use: once(
          'long',
          'reaction',
          'Sacrificás la mente manifestada para evitar todo el daño de una fuente; perdés conjuros de tu libro.',
        ),
      },
    },
  };

  const table = (root.SubclassFXData = root.SubclassFXData || {});
  for (const [sub, feats] of Object.entries(MORE))
    for (const [en, extra] of Object.entries(feats)) {
      const t = (table[sub] = table[sub] || {});
      t[en] = { lv: (root.SubclassFXLevels || {})[sub + ':' + en], ...(t[en] || {}), ...extra };
    }
  root.SubclassFXKi = { kiDie, psiDie };
})(typeof window !== 'undefined' ? window : globalThis);
