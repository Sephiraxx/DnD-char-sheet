/* Full 2014 spell references supplied by the owner, translated into Spanish.
   Kept separate from the PDF extraction audit; existing spell IDs stay unchanged. */
(function (root) {
  'use strict';
  root.SharedSpellData = [
    {
      canonicalId: 'distort-value',
      english: 'Distort Value',
      sourceKey: 'AI',
      book: 'Acquisitions Incorporated',
      level: 1,
      school: 'Ilusión',
      time: '1 minuto',
      range: 'Toque',
      components: 'V',
      materialEs: '',
      duration: '8 horas',
      concentration: false,
      classes: ['bard', 'sorcerer', 'warlock', 'wizard'],
      summary:
        'Durante 8 horas, duplicás o reducís a la mitad el valor aparente de un objeto de hasta 1 pie de lado. Una prueba de Investigación contra tu CD permite examinar el engaño. Con espacios superiores aumenta el tamaño del objeto.',
      text: 'Lanzás este conjuro sobre un objeto que no mida más de 1 pie por lado. Duplicás su valor aparente añadiendo adornos ilusorios, o reducís su valor aparente a la mitad mediante abolladuras y arañazos ilusorios. Cualquiera que examine el objeto debe realizar una prueba de Investigación contra tu CD de salvación de conjuros.',
      higher:
        'Cuando lanzás este conjuro usando un espacio de nivel superior, el tamaño máximo del objeto aumenta en 1 pie por cada nivel del espacio por encima de 1.',
      originalText:
        "You cast this spell on an object no more than 1 foot on a side, doubling the object's perceived value by adding illusionary flourish or reducing its perceived value by half with the help of illusionary dents and scratches. Anyone examining the object must roll an Investigation check against your spell DC.",
      originalHigher:
        'When you cast this spell using a higher spell slot, you increase the size of the object by 1 foot per spell slot over 1st.',
    },
    {
      canonicalId: 'jims-magic-missile',
      english: "Jim's Magic Missile",
      sourceKey: 'AI',
      book: 'Acquisitions Incorporated',
      level: 1,
      school: 'Evocación',
      time: 'Acción',
      range: '120 pies',
      components: 'V, S, M',
      materialEs:
        '1 moneda de oro, que se consume como impuesto por usar el conjuro. El impuesto aumenta en 1 po por cada nivel del espacio por encima de 1.',
      duration: 'Instantáneo',
      concentration: false,
      classes: ['wizard'],
      attackKind: ['ranged'],
      damageTypes: ['fuerza'],
      summary:
        'Creás tres dardos, cada uno con un ataque de conjuro a distancia: 2d4 de fuerza al impactar y 5d4 en un crítico. Un 1 natural en cualquiera de los ataques hace que todos los dardos te golpeen por 1 de fuerza cada uno. Cada nivel de espacio por encima de 1 añade un dardo y 1 po de impuesto.',
      text: 'Creás tres dardos de fuerza mágica que giran y silban, hipoalergénicos y sin gluten. Cada dardo puede apuntar a una criatura que elijas y puedas ver dentro del alcance. Realizá un ataque de conjuro a distancia por cada dardo. Si impacta, el dardo inflige 2d4 de daño de fuerza.\n\nSi la tirada de ataque es un crítico, ese dardo inflige 5d4 de daño de fuerza en lugar de los 4d4 que normalmente causaría un crítico. Si cualquiera de las tiradas de ataque obtiene un 1 natural, todos los dardos se dan la vuelta y golpean al lanzador, infligiéndole 1 de daño de fuerza por dardo.',
      higher:
        'Cuando lanzás este conjuro usando un espacio de nivel 2 o superior, creás un dardo adicional por cada nivel del espacio por encima de 1. El impuesto también aumenta en 1 po por cada nivel del espacio por encima de 1.',
      originalText:
        'You create three twisting, whistling, hypoallergenic, gluten-free darts of magical force. Each dart can target a creature of your choice that you can see within range. Make a ranged spell attack for each missile. On a hit, the missile does 2d4 force damage.\n\nIf the attack roll scores a critical, the missile does 5d4 force damage instead of the 4d4 force that you would normally get on a critical. If any of the attack roll is a natural one, all missiles turn around and hit the caster for 1 force damage per missile.',
      originalHigher:
        'When you cast this spell using a spell slot of 2nd level or higher, the spell creates one more dart for each slot level above 1st. This also increases the tax by 1 gp per spell slot over 1st.',
    },
    {
      canonicalId: 'gift-of-gab',
      english: 'Gift of Gab',
      sourceKey: 'AI',
      book: 'Acquisitions Incorporated',
      level: 2,
      school: 'Encantamiento',
      time: 'Reacción',
      castingTimeEs: '1 reacción, que realizás cuando hablás con otra criatura',
      range: 'Personal',
      components: 'V, S, M',
      materialEs: '2 monedas de oro, que se consumen como impuesto por usar el conjuro.',
      duration: 'Instantáneo',
      concentration: false,
      classes: ['bard', 'wizard'],
      summary:
        'Como reacción al hablar con otra criatura, las criaturas que elijas a 5 pies de vos olvidan lo que dijiste en los últimos 6 segundos. En su lugar recuerdan las palabras que pronunciás como componente verbal. Consume 2 monedas de oro.',
      text: 'Al lanzar este conjuro, remodelás con habilidad los recuerdos de quienes te escuchan en las inmediaciones. Cada criatura que elijas a 5 pies de vos olvida todo lo que dijiste durante los últimos 6 segundos. Esas criaturas recuerdan, en cambio, que dijiste las palabras que pronunciás como componente verbal del conjuro.',
      higher: '',
      originalText:
        'When you cast this spell, you skillfully reshape the memories of listeners in your immediate area, so that each creature of your choice within 5 feet of you forgets everything you said within the last 6 seconds. Those creatures then remember that you actually said the words you speak as the verbal component of the spell.',
      originalHigher: '',
    },
    {
      canonicalId: 'jims-glowing-coin',
      english: "Jim's Glowing Coin",
      sourceKey: 'AI',
      book: 'Acquisitions Incorporated',
      level: 2,
      school: 'Encantamiento',
      time: 'Acción',
      range: '60 pies',
      components: 'S, M',
      materialEs: 'Una moneda, más 2 monedas de oro que se consumen como impuesto por usar el conjuro.',
      duration: '1 minuto',
      concentration: false,
      classes: ['wizard'],
      saveAbility: ['Sabiduría'],
      summary:
        'Arrojás una moneda a un punto a 60 pies; brilla como con Luz. Las criaturas que elijas y veas a 30 pies de la moneda deben superar Sabiduría o tienen desventaja en Sabiduría (Percepción) e iniciativa durante 1 minuto.',
      text: 'Al lanzar el conjuro, arrojás la moneda que sirve como componente material a cualquier punto dentro del alcance. La moneda se ilumina como si estuviera bajo el efecto del conjuro Luz. Cada criatura que elijas y puedas ver a 30 pies de la moneda debe superar una tirada de salvación de Sabiduría o queda distraída durante la duración. Mientras está distraída, una criatura tiene desventaja en las pruebas de Sabiduría (Percepción) y en las tiradas de iniciativa.',
      higher: '',
      originalText:
        "When you cast the spell, you hurl the coin that is the spell's material component to any spot within range. The coin lights up as if under the effect of a light spell. Each creature of your choice that you can see within 30 feet of the coin must succeed on a Wisdom saving throw or be distracted for the duration. While distracted, a creature has disadvantage on Wisdom (Perception) checks and initiative rolls.",
      originalHigher: '',
    },
    {
      canonicalId: 'fast-friends',
      english: 'Fast Friends',
      sourceKey: 'AI',
      book: 'Acquisitions Incorporated',
      level: 3,
      school: 'Encantamiento',
      time: 'Acción',
      range: '30 pies',
      components: 'V',
      materialEs: '',
      duration: 'Concentración, hasta 1 hora',
      concentration: true,
      classes: ['bard', 'cleric', 'wizard'],
      saveAbility: ['Sabiduría'],
      summary:
        'Un humanoide que te vea, oiga y entienda debe superar Sabiduría o queda hechizado y realiza las tareas que le pidas amistosamente. Las tareas dañinas o contrarias a sus deseos permiten repetir la salvación; una muerte segura termina el conjuro. Cada nivel de espacio por encima de 3 añade un objetivo.',
      text: 'Al lanzar este conjuro, elegí un humanoide dentro del alcance que pueda verte y oírte, y que pueda entenderte. La criatura debe superar una tirada de salvación de Sabiduría o queda hechizada por vos durante la duración. Mientras está hechizada de esta manera, se compromete a realizar cualquier servicio o actividad que le pidas de manera amistosa, lo mejor que pueda.\n\nPodés asignarle nuevas tareas cuando termina la anterior o si decidís dar por terminada la tarea actual. Si el servicio o la actividad pudiera hacerle daño, o entra en conflicto con sus actividades y deseos normales, la criatura puede realizar otra tirada de salvación de Sabiduría para intentar terminar el efecto. Realiza esta salvación con ventaja si vos o tus compañeros están combatiendo contra ella. Si la actividad provocaría su muerte segura, el conjuro termina.\n\nCuando el conjuro termina, la criatura sabe que fue hechizada por vos.',
      higher:
        'Cuando lanzás este conjuro usando un espacio de nivel 4 o superior, podés elegir una criatura adicional por cada nivel del espacio por encima de 3.',
      originalText:
        "When you cast this spell, choose one humanoid within range that can see and hear you, and that can understand you. The creature must succeed on a Wisdom saving throw or become charmed by you for the duration. While the creature is charmed in this way, it undertakes to perform any services or activities you ask of it in a friendly manner, to the best of its ability.\n\nYou can set the creature new tasks when a previous task is completed, or if you decide to end its current task. If the service or activity might cause harm to the creature, or if it conflicts with the creature's normal activities and desires, the creature can make another Wisdom saving throw to try to end the effect. This save is made with advantage if you or your companions are fighting the creature. If the activity would result in certain death for the creature, the spell ends.\n\nWhen the spell ends, the creature knows it was charmed by you.",
      originalHigher:
        'When you cast this spell using a spell slot of 4th level or higher, you can target one additional creature for each slot level above 3rd.',
    },
    {
      canonicalId: 'incite-greed',
      english: 'Incite Greed',
      sourceKey: 'AI',
      book: 'Acquisitions Incorporated',
      level: 3,
      school: 'Encantamiento',
      time: 'Acción',
      range: '30 pies',
      components: 'V, S, M',
      materialEs: 'Una gema que valga al menos 50 po; el conjuro no la consume.',
      duration: 'Concentración, hasta 1 minuto',
      concentration: true,
      classes: ['cleric', 'sorcerer', 'warlock', 'wizard'],
      saveAbility: ['Sabiduría'],
      summary:
        'Mostrás una gema de al menos 50 po a las criaturas que elijas dentro del alcance y que puedan verte. Si fallan Sabiduría, quedan hechizadas y solo pueden acercarse de forma segura; a 5 pies de vos se detienen a mirar la gema. Repiten la salvación al final de cada turno y el daño termina el efecto.',
      text: 'Al lanzar este conjuro, presentás la gema usada como componente material y elegís cualquier cantidad de criaturas dentro del alcance que puedan verte. Cada objetivo debe superar una tirada de salvación de Sabiduría o queda hechizado por vos hasta que el conjuro termine, o hasta que vos o tus compañeros le hagan algo dañino. Mientras está hechizada de esta manera, una criatura no puede hacer otra cosa que usar su movimiento para acercarse a vos de forma segura. Mientras una criatura afectada esté a 5 pies de vos, no puede moverse y se limita a mirar con codicia la gema que presentás.\n\nAl final de cada uno de sus turnos, un objetivo afectado puede realizar una tirada de salvación de Sabiduría. Si la supera, el efecto termina para ese objetivo.',
      higher: '',
      originalText:
        'When you cast this spell, you present the gem used as the material component and choose any number of creatures within range that can see you. Each target must succeed on a Wisdom saving throw or be charmed by you until the spell ends, or until you or your companions do anything harmful to it. While charmed in this way, a creature can do nothing but use its movement to approach you in a safe manner. While an affected creature is within 5 feet of you, it cannot move, but simply stares greedily at the gem you present.\n\nAt the end of each of its turns, an affected target can make a Wisdom saving throw. If it succeeds, this effect ends for that target.',
      originalHigher: '',
    },
    {
      canonicalId: 'motivational-speech',
      english: 'Motivational Speech',
      sourceKey: 'AI',
      book: 'Acquisitions Incorporated',
      level: 3,
      school: 'Encantamiento',
      time: '1 minuto',
      range: '60 pies',
      components: 'V',
      materialEs: '',
      duration: '1 hora',
      concentration: false,
      classes: ['bard', 'cleric'],
      summary:
        'Hasta cinco criaturas que puedan oírte reciben 5 PG temporales y ventaja en salvaciones de Sabiduría durante 1 hora. Si un ataque las impacta, tienen ventaja en su próxima tirada de ataque. El efecto termina para cada una al perder esos PG temporales. Cada nivel de espacio por encima de 3 añade 5 PG temporales.',
      text: 'Elegí hasta cinco criaturas dentro del alcance que puedan oírte. Durante la duración, cada criatura afectada obtiene 5 puntos de golpe temporales y tiene ventaja en las tiradas de salvación de Sabiduría. Si una criatura afectada recibe el impacto de un ataque, tiene ventaja en la siguiente tirada de ataque que realice. En cuanto una criatura afectada pierde los puntos de golpe temporales otorgados por este conjuro, el conjuro termina para esa criatura.',
      higher:
        'Cuando lanzás este conjuro usando un espacio de nivel 4 o superior, los puntos de golpe temporales aumentan en 5 por cada nivel del espacio por encima de 3.',
      originalText:
        'Choose up to five creatures within range that can hear you. For the duration, each affected creature gains 5 temporary hit points and has advantage on Wisdom saving throws. If an affected creature is hit by an attack, it has advantage on the next attack roll it makes. Once an affected creature loses the temporary hit points granted by this spell, the spell ends for that creature.',
      originalHigher:
        'When you cast this spell using a spell slot of 4th level or higher, the temporary hit points increase by 5 for each slot level above 3rd.',
    },
    {
      canonicalId: 'spray-of-cards',
      english: 'Spray of Cards',
      sourceKey: 'BMT',
      book: 'The Book of Many Things',
      level: 2,
      school: 'Conjuración',
      time: 'Acción',
      range: 'Personal (cono de 15 pies)',
      components: 'V, S, M',
      materialEs: 'Una baraja de cartas.',
      duration: 'Instantáneo',
      concentration: false,
      classes: ['bard', 'sorcerer', 'warlock', 'wizard'],
      saveAbility: ['Destreza'],
      damageTypes: ['fuerza'],
      summary:
        'Cada criatura en un cono de 15 pies debe realizar una salvación de Destreza. Si falla, recibe 2d10 de fuerza y queda cegada hasta el final de su siguiente turno; si la supera, solo recibe la mitad del daño. Cada nivel de espacio por encima de 2 añade 1d10.',
      text: 'Rociás un cono de 15 pies con cartas espectrales. Cada criatura en esa área debe realizar una tirada de salvación de Destreza. Si falla, recibe 2d10 de daño de fuerza y tiene el estado cegado hasta el final de su siguiente turno. Si la supera, solo recibe la mitad del daño.',
      higher:
        'Cuando lanzás este conjuro usando un espacio de nivel 3 o superior, el daño aumenta en 1d10 por cada nivel del espacio por encima de 2.',
      originalText:
        'You spray a 15-foot cone of spectral cards. Each creature in that area must make a Dexterity saving throw. On a failed save, a creature takes 2d10 force damage and has the blinded condition until the end of its next turn. On a successful save, a creature takes half as much damage only.',
      originalHigher:
        'When you cast this spell using a spell slot of 3rd level or higher, the damage increases by 1d10 for each slot level above 2nd.',
    },
    {
      canonicalId: 'antagonize',
      english: 'Antagonize',
      sourceKey: 'BMT',
      book: 'The Book of Many Things',
      level: 3,
      school: 'Encantamiento',
      time: 'Acción',
      range: '30 pies',
      components: 'V, S, M',
      materialEs: 'Un naipe que represente a un pícaro.',
      duration: 'Instantáneo',
      concentration: false,
      classes: ['bard', 'sorcerer', 'warlock', 'wizard'],
      saveAbility: ['Sabiduría'],
      damageTypes: ['psíquico'],
      summary:
        'Una criatura dentro del alcance realiza una salvación de Sabiduría: si falla, recibe 4d4 psíquico y usa inmediatamente su reacción para atacar cuerpo a cuerpo a otra criatura que elijas y veas. Si no puede atacar, tiene desventaja en su próxima tirada de ataque antes de tu siguiente turno. Si supera la salvación, solo recibe la mitad del daño.',
      text: 'Susurrás palabras mágicas que provocan a una criatura que elijas dentro del alcance. El objetivo debe realizar una tirada de salvación de Sabiduría. Si falla, recibe 4d4 de daño psíquico y debe usar inmediatamente su reacción para realizar un ataque cuerpo a cuerpo contra otra criatura que elijas y puedas ver. Si el objetivo no puede realizar este ataque —por ejemplo, porque no tiene a nadie a su alcance o porque su reacción no está disponible—, en su lugar tiene desventaja en la siguiente tirada de ataque que realice antes del comienzo de tu próximo turno. Si supera la salvación, solo recibe la mitad del daño.',
      higher:
        'Cuando lanzás este conjuro usando un espacio de nivel 4 o superior, el daño aumenta en 1d4 por cada nivel del espacio por encima de 3.',
      originalText:
        'You whisper magical words that antagonize one creature of your choice within range. The target must make a Wisdom saving throw. On a failed save, the target takes 4d4 psychic damage and must immediately use its reaction to make a melee attack against another creature of your choice that you can see. If the target can’t make this attack (for example, because there is no one within its reach or because its reaction is unavailable), the target instead has disadvantage on the next attack roll it makes before the start of your next turn. On a successful save, the target takes half as much damage only.',
      originalHigher:
        'When you cast this spell using a spell slot of 4th level or higher, the damage increases by 1d4 for each slot level above 3rd.',
    },
    {
      canonicalId: 'spirit-of-death',
      english: 'Spirit of Death',
      sourceKey: 'BMT',
      book: 'The Book of Many Things',
      level: 4,
      school: 'Nigromancia',
      time: 'Acción',
      range: '60 pies',
      components: 'V, S, M',
      materialEs:
        'Un naipe dorado que valga al menos 400 po y represente a un avatar de la muerte; el conjuro no lo consume.',
      duration: 'Concentración, hasta 1 hora',
      concentration: true,
      classes: ['sorcerer', 'warlock', 'wizard'],
      summary:
        'Invocás un espíritu segador en un espacio libre que veas dentro del alcance. Comparte tu iniciativa y toma su turno inmediatamente después del tuyo; obedece órdenes verbales sin que gastes una acción. Su bloque completo está incluido en las reglas del libro y escala con el espacio usado.',
      text: 'Invocás un espíritu que encarna la muerte. Se manifiesta en un espacio desocupado que puedas ver dentro del alcance y usa el bloque de estadísticas del espíritu segador. Desaparece cuando sus puntos de golpe se reducen a 0 o cuando el conjuro termina.\n\nEl espíritu es un aliado tuyo y de tus compañeros. En combate, comparte tu valor de iniciativa y toma su turno inmediatamente después del tuyo. Obedece tus órdenes verbales, que no requieren ninguna acción de tu parte. Si no le das órdenes, realiza la acción Esquivar y usa su movimiento para evitar el peligro.\n\nESPÍRITU SEGADOR\nMuerto viviente Mediano, neutral.\nClase de Armadura: 11 + el nivel del conjuro (armadura natural).\nPuntos de golpe: 40 + 10 por cada nivel del conjuro por encima de 4.\nVelocidad: 30 pies; vuelo 30 pies (flotar).\nFUE 16 (+3) · DES 16 (+3) · CON 16 (+3) · INT 16 (+3) · SAB 16 (+3) · CAR 16 (+3).\nInmunidades al daño: necrótico, veneno.\nInmunidades a estados: hechizado, cansancio, asustado, paralizado, envenenado.\nSentidos: visión en la oscuridad 60 pies; Percepción pasiva 13.\nIdiomas: entiende los idiomas que hablás.\nDesafío: —. Bonificador por competencia: igual al tuyo.\n\nMovimiento incorpóreo. El segador puede moverse a través de otras criaturas y objetos como si fueran terreno difícil. Si termina su turno dentro de un objeto, es expulsado al espacio desocupado más cercano y recibe 1d10 de daño de fuerza por cada 5 pies recorridos.\n\nAcciones\nAtaque múltiple. El espíritu realiza una cantidad de ataques con Guadaña segadora igual a la mitad del nivel del conjuro, redondeando hacia abajo.\nGuadaña segadora. Ataque de arma cuerpo a cuerpo: tu modificador de ataque de conjuro para impactar (con ventaja), alcance 5 pies, un objetivo. Impacto: 1d8 + 3 + el nivel del conjuro de daño necrótico.\n\nAcciones adicionales\nAcechar criatura. El espíritu elige una criatura que pueda ver a 10 pies de sí mismo y comienza a acecharla. Mientras el objetivo esté acechado, vos y el espíritu perciben la dirección y la distancia hasta él si está en el mismo plano de existencia que vos. Además, si el objetivo comienza su turno a 10 pies del espíritu, debe superar una tirada de salvación de Sabiduría contra tu CD de salvación de conjuros o tiene el estado asustado hasta el comienzo de su siguiente turno. El objetivo sigue acechado hasta que muere, el espíritu desaparece o el espíritu vuelve a usar esta acción.',
      higher:
        'Cuando lanzás este conjuro usando un espacio de nivel 5 o superior, usá ese nivel superior en cada lugar donde aparezca el nivel del conjuro en el bloque de estadísticas del espíritu segador.',
      originalText:
        'You call forth a spirit that embodies death. The spirit manifests in an unoccupied space you can see within range and uses the reaper spirit stat block. The spirit disappears when it is reduced to 0 hit points or when the spell ends.\n\nThe spirit is an ally to you and your companions. In combat, the spirit shares your initiative count and takes its turn immediately after yours. It obeys your verbal commands (no action required by you). If you don’t issue the spirit any commands, it takes the Dodge action and uses its movement to avoid danger.\n\nREAPER SPIRIT\nMedium Undead, Neutral.\nArmor Class: 11 + the level of the spell (natural armor).\nHit Points: 40 + 10 for each level of the spell above 4th.\nSpeed: 30 ft., fly 30 ft. (hover).\nSTR 16 (+3) · DEX 16 (+3) · CON 16 (+3) · INT 16 (+3) · WIS 16 (+3) · CHA 16 (+3).\nDamage Immunities: necrotic, poison.\nCondition Immunities: charmed, exhaustion, frightened, paralyzed, poisoned.\nSenses: darkvision 60 ft., passive Perception 13.\nLanguages: understands the languages you speak.\nChallenge: —. Proficiency Bonus: equals your bonus.\n\nIncorporeal Movement. The reaper can move through other creatures and objects as if they were difficult terrain. If it ends its turn inside an object, it is shunted to the nearest unoccupied space and takes 1d10 force damage for every 5 feet traveled.\n\nActions\nMultiattack. The spirit makes a number of Reaping Scythe attacks equal to half the level of the spell (rounded down).\nReaping Scythe. Melee Weapon Attack: your spell attack modifier to hit (with advantage), reach 5 ft., one target. Hit: 1d8 + 3 + the spell’s level necrotic damage.\n\nBonus Actions\nHaunt Creature. The spirit targets a creature it can see within 10 feet of itself and begins haunting it. While the target is haunted, you and the spirit sense the direction and distance to the target if it is on the same plane of existence as you. Additionally, if the target starts its turn within 10 feet of the spirit, the target must succeed on a Wisdom saving throw against your spell save DC or have the frightened condition until the start of the target’s next turn. The target remains haunted until it dies, the spirit disappears, or the spirit uses this action again.',
      originalHigher:
        'When you cast this spell using a spell slot of 5th level or higher, use the higher level wherever the spell’s level appears in the reaper spirit stat block.',
    },
  ];
})(typeof window !== 'undefined' ? window : globalThis);
