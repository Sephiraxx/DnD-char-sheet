/* Compañeros de subclase con estadísticas que crecen con tu nivel: Defensor de acero, compañeros del
   Señor de las bestias, Dragón del guardián dracónico, Espíritu del fuego salvaje, Eco, Objeto danzante…
   companion: { name, build(x, bestia) → { ac, maxHp, speed, attacks, notes }, variants, beast, via }.
   via: 'use' → lo crea el botón «Usar» del rasgo (gasta lo que corresponda). */
(function (root) {
  'use strict';
  const atk = (x, a) => x.pb + x.m[a],
    sg = n => (n < 0 ? '−' : '+') + Math.abs(n),
    es = t => root.Defenses?.label(t) || t,
    ESSENCES = ['acid', 'cold', 'fire', 'lightning', 'poison'],
    PRIMAL = {
      land: {
        name: 'Bestia de la tierra',
        speed: '40 pies, trepar 40',
        hp: 5,
        attack: 'Zarpazo',
        die: '1d8',
        bonus: 2,
        type: 'cortante',
        note: 'Carga: si se mueve 20 pies en línea recta e impacta, +1d6 y salva FUE o queda derribado.',
      },
      sea: {
        name: 'Bestia del mar',
        speed: '5 pies, nado 60',
        hp: 5,
        attack: 'Golpe atenazante',
        die: '1d6',
        bonus: 2,
        type: 'perforante',
        note: 'Anfibia; al impactar puede apresar (CD de tus conjuros).',
      },
      sky: {
        name: 'Bestia del cielo',
        speed: '10 pies, vuelo 60',
        hp: 4,
        attack: 'Desgarrar',
        die: '1d4',
        bonus: 3,
        type: 'cortante',
        note: 'Sobrevuelo: no provoca ataques de oportunidad al salir del alcance.',
      },
    };

  const MORE = {
    'artificer-battle-smith': {
      'Steel Defender': {
        companion: {
          name: 'Defensor de acero',
          build: x => ({
            ac: 15 + (x.l >= 15 ? 2 : 0),
            maxHp: 2 + x.m.int + 5 * x.l,
            speed: '40 pies',
            attacks: [{ name: 'Desgarro potenciado', bonus: atk(x, 'int'), damage: `1d8${sg(x.pb)} fuerza` }],
            notes:
              'Actúa en tu turno: usá tu acción adicional para darle una orden (si no, Esquiva). Reacción Desviar ataque: desventaja a un ataque contra otra criatura a 5 pies' +
              (x.l >= 15 ? `, y el atacante recibe 1d4${sg(x.m.int)} de fuerza` : '') +
              '. Reparar (3 por día): 2d8 + competencia PG a sí mismo u otro constructo. Remendar lo cura 2d6; si muere, lo revivís en 1 minuto con un espacio.',
          }),
        },
        auto: 'En Compañeros: «Crear» el defensor con CA, PG y ataque según tu nivel e INT; «Actualizar» al subir de nivel.',
      },
      'Improved Defender': {
        covered: true,
        auto: 'El defensor gana +2 de CA, Arcane Jolt hace 4d6 y Desviar ataque devuelve 1d4 + INT.',
      },
    },
    'ranger-beast-master': {
      "Ranger's Companion": {
        companion: {
          name: 'Compañero del explorador',
          beast: { cr: 0.25, sizes: ['Diminuto', 'Pequeño', 'Mediano'] },
          build: (x, m) => ({
            name: m ? m.name : 'Compañero del explorador',
            ac: (m?.ac || 10) + x.pb,
            maxHp: Math.max(m?.hp || 1, 4 * x.l),
            speed: root.Companions.speedEs(m?.speed || ''),
            attacks: root.Companions.attacksOf(m || {}).map(a => ({
              name: a.name,
              bonus: a.bonus + x.pb,
              damage: a.damage.replace(
                /^(\d+d\d+)(\s*[+-]\s*\d+)?/,
                (all, d, k) => d + sg((k ? Number(k.replace(/\s/g, '')) : 0) + x.pb),
              ),
            })),
            notes:
              'Suma tu competencia a CA, ataques, daño, salvaciones y habilidades con competencia. Actúa con tu orden (acción).' +
              (x.l >= 7
                ? ' Entrenamiento excepcional: con tu acción adicional, Correr, Retirarse, Esquivar o Ayudar; sus ataques son mágicos.'
                : '') +
              (x.l >= 11 ? ' Furia bestial: ataca dos veces con la acción de Atacar.' : '') +
              (x.l >= 15 ? ' Compartir conjuros: tus conjuros sobre vos también lo afectan si está a 30 pies.' : ''),
          }),
        },
        auto: 'En Compañeros: «Elegir bestia» (VD 1/4 o menos) y la ficha suma tu competencia a su CA, ataques y daño, y sus PG.',
      },
      'Primal Companion': {
        optional: true,
        companion: {
          variants: Object.fromEntries(
            Object.entries(PRIMAL).map(([id, p]) => [
              id,
              {
                name: p.name,
                build: x => ({
                  ac: 13 + x.m.wis,
                  maxHp: p.hp + p.hp * x.l,
                  speed: p.speed,
                  attacks: [
                    { name: p.attack, bonus: atk(x, 'wis'), damage: `${p.die}${sg(p.bonus + x.pb)} ${p.type}` },
                  ],
                  notes:
                    p.note +
                    ' Actúa en tu turno; con tu acción adicional le ordenás atacar (o usás un ataque tuyo). Si muere, lo revivís con un espacio y 1 minuto.' +
                    (x.l >= 7 ? ' Sus ataques son de fuerza o normales a tu elección.' : '') +
                    (x.l >= 11 ? ' Furia bestial: ataca dos veces o lanza tu marca del cazador.' : ''),
                }),
              },
            ]),
          ),
        },
        auto: 'En Compañeros: «Crear» la bestia de la tierra, del mar o del cielo con sus estadísticas de Tasha según tu nivel y SAB.',
      },
      'Exceptional Training': {
        covered: true,
        auto: 'Se suma a la nota de tu compañero: acción adicional para Correr, Retirarse, Esquivar o Ayudar, y ataques mágicos.',
      },
      'Bestial Fury': { covered: true, auto: 'Se suma a la nota de tu compañero: dos ataques.' },
      'Share Spells': {
        covered: true,
        auto: 'Se suma a la nota de tu compañero: tus conjuros sobre vos lo afectan a 30 pies.',
      },
    },
    'ranger-drakewarden': {
      'Drake Companion': {
        use: {
          name: 'Invocar dragón',
          max: 1,
          reset: 'long',
          action: 'action',
          text: 'Invocás a tu dragón (o gastá un espacio de nivel 1+ para volver a hacerlo).',
        },
        companion: {
          variants: Object.fromEntries(
            ESSENCES.map(t => [
              t,
              {
                name: () => 'Dragón (' + es(t) + ')',
                build: x => ({
                  name: 'Dragón (' + es(t) + ')',
                  ac: 14 + x.m.wis,
                  maxHp: 5 + 5 * x.l,
                  speed: '40 pies' + (x.l >= 7 ? ', vuelo 40' : ''),
                  attacks: [
                    {
                      name: 'Mordisco',
                      bonus: atk(x, 'wis'),
                      damage: `1d6${sg(x.pb)} perforante` + (x.l >= 7 ? ` + 1d6 ${es(t)}` : ''),
                    },
                  ],
                  notes:
                    `Esencia: ${es(t)} (inmune). Golpes infundidos (reacción, competencia veces por descanso largo): cuando una criatura a 30 pies que ve impacta, suma 1d6 de ${es(t)}.` +
                    (x.l >= 7
                      ? ' Vínculo de colmillo y escama: podés montarlo si es Mediano o mayor; tenés resistencia a su tipo.'
                      : '') +
                    (x.l >= 15 ? ' Es Grande y su mordisco suma otro 1d6.' : ''),
                }),
              },
            ]),
          ),
        },
        auto: 'En Compañeros: «Crear» el dragón con la esencia elegida; CA, PG y mordisco crecen con tu nivel.',
      },
      'Bond of Fang and Scale': {
        covered: true,
        auto: 'Se suma al dragón: vuelo, mordisco +1d6 de su esencia y montura.',
      },
    },
    'druid-circle-of-wildfire': {
      'Summon Wildfire Spirit': {
        use: {
          name: 'Invocar espíritu del fuego salvaje',
          shared: 'wild-shape',
          cost: 1,
          action: 'action',
          companion: 'druid-circle-of-wildfire:Summon Wildfire Spirit',
          text: 'Gastás Forma salvaje: el espíritu aparece a 30 pies durante 1 hora y las criaturas a 10 pies salvan DES o reciben 2d6 de fuego.',
          save: { ab: 'dex', dc: 'spell' },
          roll: { dice: () => '2d6', kind: 'damage', type: 'fire' },
        },
        state: {
          dur: 'hour',
          name: 'Espíritu del fuego salvaje',
          text: 'Tu espíritu está invocado.',
          fx: {
            spell: {
              damage: true,
              heal: true,
              types: ['fire'],
              dice: '1d8',
              optional: true,
              checked: true,
              label: 'Vínculo potenciado +1d8 (espíritu a 30 pies)',
              when: x => x.l >= 6,
            },
          },
        },
        companion: {
          name: 'Espíritu del fuego salvaje',
          via: 'use',
          build: x => ({
            ac: 13,
            maxHp: 5 + 5 * x.l,
            speed: '30 pies, vuelo 30 (flotar)',
            attacks: [{ name: 'Semilla de llamas', bonus: atk(x, 'wis'), damage: `1d6${sg(x.pb)} fuego` }],
            notes:
              'Actúa en tu turno con tu acción adicional. Teletransporte ardiente: se teletransporta con vos 15 pies; las criaturas a 5 pies de donde estaban salvan DES o reciben 1d6 + competencia de fuego.',
          }),
        },
        auto: 'Botón «Usar» que gasta Forma salvaje, tira el daño de aparición y crea el espíritu en Compañeros.',
      },
      'Enhanced Bond': {
        covered: true,
        auto: 'Con el espíritu invocado, tus conjuros de fuego o curación muestran «Vínculo potenciado +1d8».',
      },
    },
    'fighter-echo-knight': {
      'Manifest Echo': {
        companion: {
          name: 'Eco',
          build: x => ({
            ac: 14 + x.pb,
            maxHp: 1,
            speed: '30 pies',
            attacks: [],
            notes:
              'Aparece como acción adicional a 15 pies y dura hasta destruirlo o alejarte 30 pies. Podés atacar desde su espacio, intercambiar lugar (15 pies de movimiento) y hacer ataques de oportunidad desde él. Solo recibe daño de ataques y salvaciones fallidas, y cualquier daño lo destruye.',
          }),
        },
        auto: 'En Compañeros: «Crear» tu eco (CA 14 + competencia, 1 PG).',
      },
      'Echo Avatar': {
        use: {
          name: 'Avatar del eco',
          free: true,
          action: 'action',
          text: 'Durante 10 minutos ves y oís a través del eco (estás cegado y ensordecido); puede alejarse 1000 pies.',
        },
      },
      'Legion of One': {
        covered: true,
        auto: 'Recordatorio: podés crear dos ecos; al tirar iniciativa sin usos de Liberar encarnación, recuperás uno.',
      },
    },
    'bard-college-of-creation': {
      'Animating Performance': {
        companion: {
          name: 'Objeto danzante',
          via: 'use',
          build: x => ({
            ac: 16,
            maxHp: 10 + 5 * x.l,
            speed: '30 pies, vuelo 30 (flotar)',
            attacks: [{ name: 'Golpe potenciado', bonus: atk(x, 'cha'), damage: `1d10${sg(x.pb)} fuerza` }],
            notes:
              'Actúa en tu turno con tu acción adicional. Floritura irresistible: cuando una criatura usa tu Inspiración, el objeto puede atacar con su reacción. Dura una hora.',
          }),
        },
        use: {
          max: 1,
          reset: 'long',
          action: 'action',
          companion: 'bard-college-of-creation:Animating Performance',
          text: 'Animás un objeto Grande o menor como Objeto danzante durante una hora (o gastá un espacio de nivel 3+).',
        },
        auto: 'Botón «Usar» que crea el Objeto danzante en Compañeros con sus estadísticas según tu nivel.',
      },
      'Creative Crescendo': {
        covered: true,
        auto: 'Recordatorio: Actuación de la creación crea varios objetos a la vez (hasta tu CAR).',
      },
      'Mote of Potential': {
        covered: true,
        auto: 'Recordatorio: tu Inspiración tiene un efecto extra según se use: prueba (tirada doble), ataque (trueno en área) o salvación (PG temporales).',
      },
    },
    'druid-circle-of-spores': {
      'Fungal Infestation': {
        companion: {
          name: 'Zombi de la infestación',
          via: 'use',
          build: () => ({
            ac: 8,
            maxHp: 1,
            speed: '20 pies',
            attacks: [{ name: 'Golpe', bonus: 3, damage: '1d6+1 contundente' }],
            notes:
              'Se levanta con 1 PG y dura 1 hora. Sigue tus órdenes mentales (acción adicional); solo puede usar la acción de Atacar.',
          }),
        },
        use: {
          name: 'Infestación fúngica',
          shared: 'fungal-infestation',
          cost: 1,
          action: 'reaction',
          companion: 'druid-circle-of-spores:Fungal Infestation',
          text: 'Cuando muere una bestia o humanoide Pequeño o Mediano a 10 pies, se levanta como zombi con 1 PG.',
        },
        auto: 'Botón «Usar» que gasta un uso y crea el zombi en Compañeros.',
      },
    },
    'artificer-artillerist': {
      'Fortified Position': {
        covered: true,
        auto: 'Los cañones ya permiten dos a la vez desde el nivel 15, y medio cobertura a 10 pies.',
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
