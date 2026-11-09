(function (root) {
  'use strict';
  const slots = [
    [],
    [2],
    [3],
    [4, 2],
    [4, 3],
    [4, 3, 2],
    [4, 3, 3],
    [4, 3, 3, 1],
    [4, 3, 3, 2],
    [4, 3, 3, 3, 1],
    [4, 3, 3, 3, 2],
    [4, 3, 3, 3, 2, 1],
    [4, 3, 3, 3, 2, 1],
    [4, 3, 3, 3, 2, 1, 1],
    [4, 3, 3, 3, 2, 1, 1],
    [4, 3, 3, 3, 2, 1, 1, 1],
    [4, 3, 3, 3, 2, 1, 1, 1],
    [4, 3, 3, 3, 2, 1, 1, 1, 1],
    [4, 3, 3, 3, 3, 1, 1, 1, 1],
    [4, 3, 3, 3, 3, 2, 1, 1, 1],
    [4, 3, 3, 3, 3, 2, 2, 1, 1],
  ];
  const known = [0, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 15, 16, 18, 19, 19, 20, 22, 22, 22];
  const attrs = {
    str: 'Fuerza',
    dex: 'Destreza',
    con: 'Constitución',
    int: 'Inteligencia',
    wis: 'Sabiduría',
    cha: 'Carisma',
  };
  const skills = [
    ['athletics', 'Atletismo', 'str'],
    ['acrobatics', 'Acrobacias', 'dex'],
    ['sleight', 'Juego de manos', 'dex'],
    ['stealth', 'Sigilo', 'dex'],
    ['arcana', 'Conocimiento arcano', 'int'],
    ['history', 'Historia', 'int'],
    ['investigation', 'Investigación', 'int'],
    ['nature', 'Naturaleza', 'int'],
    ['religion', 'Religión', 'int'],
    ['animal', 'Trato con animales', 'wis'],
    ['insight', 'Perspicacia', 'wis'],
    ['medicine', 'Medicina', 'wis'],
    ['perception', 'Percepción', 'wis'],
    ['survival', 'Supervivencia', 'wis'],
    ['deception', 'Engaño', 'cha'],
    ['intimidation', 'Intimidación', 'cha'],
    ['performance', 'Interpretación', 'cha'],
    ['persuasion', 'Persuasión', 'cha'],
  ].sort((a, b) => a[1].localeCompare(b[1], 'es')); // Orden alfabético, como en la hoja de personaje.
  const mod = x => Math.floor((x - 10) / 2),
    prof = l => 2 + Math.floor((l - 1) / 4),
    die = l => (l >= 15 ? 12 : l >= 10 ? 10 : l >= 5 ? 8 : 6),
    song = l => (l >= 17 ? 12 : l >= 13 ? 10 : l >= 9 ? 8 : 6);
  const S = (
    id,
    name,
    level,
    time,
    range,
    components,
    duration,
    concentration,
    ritual,
    brief,
    text,
    source = 'SRD 5.1',
    bard = true,
  ) => ({ id, name, level, time, range, components, duration, concentration, ritual, brief, text, source, bard });
  const spells = [
    S(
      'mockery',
      'Burla dañina',
      0,
      'Acción',
      '60 pies',
      'V',
      'Instantáneo',
      false,
      false,
      'SAB contra tu CD; daño psíquico y perjudica el próximo ataque.',
      'Una criatura que veas y pueda oírte; no necesita entenderte. Si falla SAB contra tu CD, recibe 1d4 psíquico y desventaja en su próxima tirada de ataque antes de terminar su siguiente turno. Si supera la salvación, ningún efecto. Daño: 2d4 en nivel 5, 3d4 en 11 y 4d4 en 17. No afecta alientos que usen salvaciones.',
    ),
    S(
      'illusion',
      'Ilusión menor',
      0,
      'Acción',
      '30 pies',
      'S, M (lana)',
      '1 minuto',
      false,
      false,
      'Un sonido o la imagen de un objeto de hasta 5 pies.',
      'Elegí sonido o imagen de un objeto, no ambos. Sonido desde susurro hasta grito; puede ser continuo o separado durante la duración. Imagen: cabe en un cubo de 5 pies; no produce sonido, luz, olor ni efectos físicos. No crea criaturas animadas. Contacto físico revela la imagen. Examinar cuesta una acción e Investigación contra tu CD; al reconocerla, se percibe tenue. Termina si volvés a lanzarla o la disipás con una acción. No obliga a distraerse.',
    ),
    S(
      'healingword',
      'Palabra de curación',
      1,
      'Adicional',
      '60 pies',
      'V',
      'Instantáneo',
      false,
      false,
      'Una criatura visible recupera 1d4 + CAR PG.',
      'Una criatura que veas, incluido vos, recupera 1d4 + tu modificador de CAR, hasta su máximo. No afecta a no muertos ni constructos. Un aliado vivo a 0 PG recobra consciencia, pero sigue derribado si lo estaba. Añade 1d4 por nivel de espacio superior a 1. En este mismo turno solo podés lanzar además un truco de una acción. No deja acción adicional para Inspiración.',
    ),
    S(
      'sleep',
      'Dormir',
      1,
      'Acción',
      '90 pies',
      'V, S, M (arena fina, pétalos o grillo)',
      '1 minuto',
      false,
      false,
      '5d8 PG de criaturas dentro de un radio de 20 pies; sin salvación.',
      'Elegí un punto en alcance. Criaturas a 20 pies de él, incluidos aliados y animales: tirá 5d8. Resolvé de menor a mayor PG actuales, ignorando inconscientes. Cada criatura se duerme si sus PG caben completos en el total restante; restalos y seguí. No inflige daño. Despierta al recibir daño, terminar el minuto o si alguien gasta una acción sacudiéndola. No afecta a no muertos ni inmunes a hechizado. +2d8 por nivel de espacio superior a 1. Los obstáculos pueden bloquear el área.',
    ),
    S(
      'faeriefire',
      'Fuego feérico',
      1,
      'Acción',
      '60 pies',
      'V',
      'Hasta 1 minuto',
      true,
      false,
      'Cubo de 20 pies; DES. Ventaja al atacar a los afectados visibles.',
      'Objetos delineados por luz. Criaturas presentes hacen DES contra tu CD; si fallan, también quedan delineadas, incluidos aliados. Emiten luz tenue a 10 pies. Los ataques contra ellas tienen ventaja si el atacante puede verlas; no se benefician de invisibilidad. No anula cobertura ni causa daño. Sin salvaciones periódicas; no afecta a quienes entren después. No mejora con espacios superiores.',
    ),
    S(
      'laughter',
      'Risa horrible de Tasha',
      1,
      'Acción',
      '30 pies',
      'V, S, M (pastelitos y pluma)',
      'Hasta 1 minuto',
      true,
      false,
      'SAB; derribado, incapacitado e incapaz de levantarse.',
      'Una criatura que veas con INT 5 o más: SAB contra tu CD. Si falla, queda derribada e incapacitada y no puede levantarse. Repite la salvación al final de cada turno suyo y cada vez que recibe daño; por daño tiene ventaja. Un éxito termina el conjuro. No requiere entenderte ni produce hechizado. Un volador derribado cae salvo que pueda mantenerse suspendido o lo sostenga magia; daño por caída permite repetir la salvación.',
    ),
    S(
      'detectmagic',
      'Detectar magia',
      1,
      'Acción',
      'Personal · 30 pies',
      'V, S',
      'Hasta 10 minutos',
      true,
      true,
      'Sentís magia; una acción permite ver el aura de objetivos visibles.',
      'Sentís presencia de magia a 30 pies. Si la detectás, una acción permite ver el aura de una criatura u objeto visible y conocer su escuela, si existe. No identifica todas las propiedades. Lo bloquean 1 pie de piedra, 1 pulgada de metal común, una lámina de plomo o 3 pies de madera o tierra. Ritual: 11 minutos, sin gastar espacio; requiere concentración durante el lanzamiento. Lanzarlo como acción normalmente gasta espacio.',
    ),
    S(
      'silvery',
      'Silvery Barbs',
      1,
      'Reacción',
      '60 pies',
      'V',
      'Instantáneo',
      false,
      false,
      'Repite un d20 exitoso y conserva el menor; otra criatura obtiene ventaja.',
      'Cuando una criatura que veas a 60 pies tiene éxito en ataque, prueba o salvación, gastás reacción y espacio: repite el d20 y usa el menor. Puede seguir teniendo éxito. Después, otra criatura que veas a 60 pies, incluido vos, gana ventaja en su próxima prueba, ataque o salvación en 1 minuto. Solo una instancia de este beneficio por criatura. No repite daño ni anula Resistencia Legendaria. Fuente sujeta a las permitidas por tu DM.',
      'Strixhaven',
    ),
    S(
      'suggestion',
      'Sugestión',
      2,
      'Acción',
      '30 pies',
      'V, M (lengua de serpiente y panal o aceite dulce)',
      'Hasta 8 horas',
      true,
      false,
      'SAB; una actividad expresada de forma que parezca razonable.',
      'Una criatura que veas, te oiga y te entienda. Inmunes a hechizado no son afectados. Proponé una actividad en una o dos frases, de manera que parezca razonable; una orden obviamente dañina termina el conjuro. Si falla SAB, la cumple lo mejor posible hasta completarla o terminar la duración. Puede incluir una condición durante ese tiempo. Si vos o tus compañeros la dañan, termina.',
    ),
    S(
      'shatter',
      'Estallar (Shatter)',
      2,
      'Acción',
      '60 pies',
      'V, S, M (mica)',
      'Instantáneo',
      false,
      false,
      'Esfera de 10 pies de radio; CON. 3d8 de trueno; la mitad si supera.',
      'Elegí un punto a 60 pies. Cada criatura en una esfera de 10 pies de radio, incluidos aliados, hace una salvación de Constitución contra tu CD. Recibe 3d8 de trueno si falla, o la mitad si supera. Criaturas de material inorgánico como piedra, cristal o metal tienen desventaja. Objetos no mágicos que nadie lleve o vista también reciben daño. Añade 1d8 por cada nivel de espacio superior a 2. No requiere concentración. El daño de trueno no es daño contundente.',
    ),
    S(
      'invisibility',
      'Invisibilidad',
      2,
      'Acción',
      'Toque',
      'V, S, M (pestaña en goma arábiga)',
      'Hasta 1 hora',
      true,
      false,
      'Una criatura y su equipo se vuelven invisibles.',
      'Una criatura tocada es invisible con lo que lleva o viste. Termina para ella si ataca o lanza un conjuro. No silencia ni esconde automáticamente; ruidos y huellas pueden delatarla. +1 objetivo por nivel de espacio superior a 2.',
    ),
    S(
      'magehand',
      'Mano de mago',
      0,
      'Acción',
      '30 pies',
      'V, S',
      '1 minuto',
      false,
      false,
      'Una mano espectral manipula objetos de hasta 10 lb.',
      'Creás una mano flotante. Con tu acción la controlás y movés hasta 30 pies: manipular objetos, abrir puertas o recipientes sin llave, sacar o guardar cosas de recipientes abiertos o verter un vial. No ataca, activa objetos mágicos ni carga más de 10 lb. Desaparece si se aleja más de 30 pies de vos o volvés a lanzarla; podés disiparla con una acción.',
    ),
    S(
      'hypnotic',
      'Patrón hipnótico',
      3,
      'Acción',
      '120 pies',
      'S, M (incienso encendido o material fosforescente)',
      'Hasta 1 minuto',
      true,
      false,
      'Cubo de 30 pies; SAB. Hechizado, incapacitado y velocidad 0.',
      'El patrón aparece y desaparece. Cada criatura en el área que lo vea hace SAB; si falla, queda hechizada y, mientras lo esté por este conjuro, incapacitada y con velocidad 0. Termina para ella al recibir daño o si alguien usa una acción para sacudirla. No hay salvaciones periódicas. Afecta aliados. Inmunes a hechizado evitan el estado.',
    ),
    S(
      'cure',
      'Curar heridas',
      1,
      'Acción',
      'Toque',
      'V, S',
      'Instantáneo',
      false,
      false,
      'Cura 1d8 + CAR PG.',
      'Una criatura tocada recupera 1d8 + tu modificador de CAR PG, hasta su máximo. No afecta a no muertos ni constructos. +1d8 por nivel de espacio superior a 1.',
    ),
    S(
      'feather',
      'Caída de pluma',
      1,
      'Reacción',
      '60 pies',
      'V, M (pluma o plumón)',
      '1 minuto',
      false,
      false,
      'Cuando vos o una criatura cercana cae, ralentiza hasta cinco caídas.',
      'Reacción cuando vos o una criatura a 60 pies cae. Elegí hasta cinco criaturas que estén cayendo en alcance. Descienden 60 pies por asalto. Si aterrizan antes de terminar, no reciben daño de caída y aterrizan de pie; el conjuro termina para cada una al hacerlo.',
    ),
    S(
      'hold',
      'Inmovilizar persona',
      2,
      'Acción',
      '60 pies',
      'V, S, M (hierro recto)',
      'Hasta 1 minuto',
      true,
      false,
      'Un humanoide visible hace SAB o queda paralizado.',
      'Humanoide que veas: SAB contra tu CD o paralizado. Repite al final de cada turno suyo; éxito termina. +1 humanoide por nivel de espacio superior a 2; deben estar a 30 pies entre sí al elegirlos.',
    ),
    S(
      'dispel',
      'Disipar magia',
      3,
      'Acción',
      '120 pies',
      'V, S',
      'Instantáneo',
      false,
      false,
      'Termina conjuros sobre una criatura, objeto o efecto mágico.',
      'Elegí una criatura, objeto o efecto mágico. Termina los conjuros de nivel 3 o inferior sobre el objetivo. Por cada conjuro superior, prueba de característica de lanzamiento (CAR, más Aprendiz de mucho si corresponde), CD 10 + nivel del conjuro. Un espacio superior termina automáticamente conjuros de nivel igual o menor al espacio usado. No desactiva cualquier objeto mágico ni toda magia no procedente de conjuros.',
    ),
    S(
      'counter',
      'Contraconjuro',
      3,
      'Reacción',
      '60 pies',
      'S',
      'Instantáneo',
      false,
      false,
      'Interrumpe a una criatura visible que esté lanzando un conjuro.',
      'Si el conjuro enemigo es nivel 3 o menos, falla. Si es superior, prueba de característica de lanzamiento, CD 10 + nivel enemigo. Con espacio superior, termina automáticamente conjuros de nivel igual o menor al usado. No pertenece a la lista normal del bardo de 2014: requiere Secretos mágicos u otra concesión.',
      'SRD 5.1',
      false,
    ),
    S(
      'dimension',
      'Puerta dimensional',
      4,
      'Acción',
      '500 pies',
      'V',
      'Instantáneo',
      false,
      false,
      'Te teletransportás y podés llevar un acompañante dispuesto.',
      'Destino visible, visualizable o descrito por distancia y dirección. Podés llevar equipo hasta tu carga y una criatura dispuesta de tu tamaño o menor a 5 pies de vos, con su equipo hasta su carga. Si el destino está ocupado, vos y el acompañante reciben 4d6 de fuerza y el teletransporte falla.',
    ),
    S(
      'greaterinvis',
      'Invisibilidad mayor',
      4,
      'Acción',
      'Toque',
      'V, S',
      'Hasta 1 minuto',
      true,
      false,
      'Invisibilidad que no termina al atacar o lanzar conjuros.',
      'Vos o una criatura tocada se vuelve invisible junto con lo que vista o lleve mientras dure. No termina por atacar ni lanzar conjuros, aunque lanzar otra concentración sí reemplaza este efecto. No oculta automáticamente ruidos ni huellas.',
    ),
  ];
  // Ampliación del catálogo; conserva los identificadores de las fichas anteriores.
  for (const sp of root.Catalog?.spells || []) {
    if (sp.homebrew) continue; // el homebrew se suma en vivo (allSpells): puede llegar después
    const old = spells.find(x => x.id === sp.id);
    if (old) {
      const spanishText = old.text,
        spanishBrief = old.brief;
      Object.assign(old, sp);
      const general = t =>
        t
          .replaceAll('tu modificador de CAR', 'tu modificador de lanzamiento')
          .replaceAll('+ CAR', '+ tu modificador de lanzamiento')
          .replace('No deja acción adicional para Inspiración.', 'Solo tenés una acción adicional por turno.');
      old.text = general(spanishText);
      old.brief = general(spanishBrief);
    } else spells.push(sp);
  }
  function initial() {
    return {
      schema: 1,
      combatState: {
        active: false,
        onTurn: false,
        turn: 0,
        action: null,
        bonus: null,
        spells: [],
        effects: [],
        checks: [],
      },
      secretKnown: [],
      progression: {
        sources: ['PHB'],
        expanded: false,
        versatility: false,
        magical: false,
        feats: false,
        learnedFeats: [],
      },
      name: 'Nuevo personaje',
      classId: 'bard',
      level: 1,
      subclass: 'manual',
      abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      proficiencies: [],
      expertise: [],
      hpBase: 8,
      hpConfirmed: false,
      hp: null,
      temp: 0,
      acBase: 10,
      acBonus: 0,
      slotsSpent: Array(9).fill(null),
      inspirationSpent: null,
      hdSpent: null,
      reactionUsed: false,
      concentration: null,
      conditions: [],
      death: { success: 0, failure: 0 },
      known: [],
      extras: [],
      customSpells: [],
      features: [],
      extraResources: [],
      gold: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
      goldConfirmed: false,
      inventory: [],
      mule: { name: '', hp: null, max: 1, notes: '' },
      notes: '',
      companion: { name: '', notes: '' },
      log: [],
      levelHistory: [],
      universalSpent: 0,
      infectiousSpent: 0,
    };
  }
  // Puntuaciones efectivas: las de la ficha o las que fija un objeto mágico (Amuleto de salud…), la mayor.
  function scores(s) {
    const set = root.MagicItems?.setScores(s) || {},
      bonus = root.Grants?.abilityBonuses(s) || {};
    return Object.fromEntries(
      Object.entries(s.abilities).map(([k, v]) => [
        k,
        Math.max(bonus[k] ? Math.min(20, v + bonus[k]) : v, set[k] || 0),
      ]),
    );
  }
  // En forma salvaje, FUE, DES y CON son las de la bestia para pruebas y salvaciones
  // (se conservan las competencias; los PG máximos siguen usando tu propia CON).
  function formScores(s) {
    const sc = scores(s),
      ab = s.wildShape?.ab;
    if (Array.isArray(ab) && ab.length === 6) [sc.str, sc.dex, sc.con] = ab;
    return sc;
  }
  function stats(s) {
    if (root.Classes) return root.Classes.stats(s);
    let p = prof(s.level),
      m = Object.fromEntries(Object.entries(s.abilities).map(([k, v]) => [k, mod(v)]));
    return {
      prof: p,
      mods: m,
      maxHP: Math.max(1, s.hpBase + s.level * m.con),
      ac: s.acBase + m.dex + s.acBonus,
      dc: 8 + p + m.cha,
      attack: p + m.cha,
      inspirationMax: Math.max(1, m.cha),
      inspirationDie: die(s.level),
      hitDice: s.level,
      slots: slots[s.level],
      known: known[s.level],
      cantrips: s.level >= 10 ? 4 : s.level >= 4 ? 3 : 2,
      initiative: sum(initiativeParts(s)),
      songDie: song(s.level),
    };
  }
  // Nivel de personaje (suma de clases con multiclase).
  const totalLevel = s => (root.Classes?.totalLevel ? root.Classes.totalLevel(s) : s.level);
  // Experiencia necesaria para cada nivel (PHB p. 15); null en nivel 20.
  const XP = [
    0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000,
    265000, 305000, 355000,
  ];
  const xpNext = s => XP[totalLevel(s)] ?? null;
  // Valor pasivo: 10 + bono de la habilidad (+5 de Observador en Percepción e Investigación).
  const passive = (s, id) => 10 + skillBonus(s, id) + (root.FeatFX?.passive(s, id) || 0);
  function skillBonus(s, id) {
    const own = ownSkillBonus(s, id),
      beast = s.wildShape?.skills?.[id];
    return Number.isInteger(beast) ? Math.max(own, beast) : own;
  }
  function ownSkillBonus(s, id) {
    const a = skills.find(x => x[0] === id);
    if (!a) throw Error('Habilidad inválida');
    return sum(checkParts(s, a[2], id));
  }
  const sum = parts => parts.reduce((t, x) => t + x.value, 0);
  const short = ab => attrs[ab].slice(0, 3).toUpperCase();
  // Mitad de la competencia en pruebas sin competencia: Polivalente (bardo 2, hacia abajo) o Atleta
  // excepcional (campeón 7, hacia arriba, solo FUE, DES y CON). No se acumulan: vale la mayor.
  function halfProf(s, ability) {
    const p = prof(totalLevel(s)),
      views = root.Classes?.views ? root.Classes.views(s) : [s],
      out = [];
    if (
      ['str', 'dex', 'con'].includes(ability) &&
      views.some(v => v.classId === 'fighter' && v.classSubclass === 'fighter-champion' && v.level >= 7)
    )
      out.push({ label: 'Atleta excepcional', value: Math.ceil(p / 2) });
    if (views.some(v => (v.classId || 'bard') === 'bard' && v.level >= 2))
      out.push({ label: 'Polivalente', value: Math.floor(p / 2) });
    // A igual valor queda el primero (Atleta excepcional).
    return out.sort((x, y) => y.value - x.value)[0] || null;
  }
  // Desglose de una prueba de característica (con habilidad o sin ella): [{ label, value }].
  function checkParts(s, ability, skill = '') {
    const p = prof(totalLevel(s)),
      parts = [{ label: short(ability), value: mod(formScores(s)[ability]) }];
    if (skill && hasExpertise(s, skill)) parts.push({ label: 'Pericia', value: 2 * p });
    else if (skill && hasSkill(s, skill)) parts.push({ label: 'Competencia', value: p });
    else {
      const half = halfProf(s, ability);
      if (half) parts.push(half);
    }
    const items = root.MagicItems?.check(s) || 0;
    if (items) parts.push({ label: 'Objetos', value: items });
    return parts;
  }
  // ---------- Agotamiento (PHB, apéndice A) ----------
  const EXHAUSTION = [
    '',
    'Desventaja en las pruebas de característica',
    'Velocidad a la mitad',
    'Desventaja en tiradas de ataque y salvaciones',
    'PG máximos a la mitad',
    'Velocidad 0',
    'Muerte',
  ];
  const exhaustion = s => s.exhaustion || 0;
  // Efectos acumulados del nivel actual («1: …», «2: …»).
  const exhaustionEffects = s => EXHAUSTION.slice(1, exhaustion(s) + 1).map((x, i) => `${i + 1}: ${x.toLowerCase()}`);

  // ---------- Carga (PHB, cap. 7) ----------
  // Capacidad: FUE × 15 lb; el doble con Constitución poderosa (o similar) o tamaño Grande, la mitad si es Diminuto.
  // Lo que está en la mula, el carro o el campamento no cuenta. 50 monedas pesan 1 lb.
  const AWAY = /mula|carro|carreta|caballo|montura|campamento|casa|guardad|cofre|almac|banco|barco|depósito/i;
  function carrying(s) {
    const str = formScores(s).str,
      race = root.Campaign?.race?.(s),
      size = [].concat(race?.size || 'M')[0],
      powerful = (race?.traits || []).some(t => /powerful build|constitución poderosa/i.test(t)) || size === 'L',
      factor = (size === 'T' ? 0.5 : 1) * (powerful ? 2 : 1);
    const items = (s.inventory || []).filter(x => !AWAY.test(x.location || '')),
      coins = Object.values(s.gold || {}).reduce((a, n) => a + n, 0),
      gear = items.reduce((a, x) => a + (x.weight || 0) * x.qty, 0),
      weight = Math.round((gear + coins / 50) * 10) / 10,
      capacity = str * 15 * factor,
      unknown = items.filter(x => x.weight === null && x.qty > 0).length;
    // Regla variante: más de FUE × 5 = cargado (−10 pies); más de FUE × 10 = muy cargado (−20 pies y desventaja).
    const variant = !!s.encumbranceVariant,
      level =
        weight > capacity * 2
          ? 'stuck'
          : weight > capacity
            ? 'over'
            : variant && weight > str * 10 * factor
              ? 'heavy'
              : variant && weight > str * 5 * factor
                ? 'light'
                : 'ok';
    return { weight, coins: Math.round((coins / 50) * 10) / 10, capacity, unknown, variant, level, str, factor };
  }
  // Velocidad caminando de este turno: la base (o la de la forma salvaje) con carga y agotamiento.
  function speedInfo(s, base = stats(s).speed) {
    const notes = [],
      c = carrying(s),
      ex = exhaustion(s);
    let v = base;
    if (c.level === 'stuck') ((v = 0), notes.push('Más del doble de tu capacidad: no podés moverte'));
    else if (c.level === 'over') ((v = Math.min(v, 5)), notes.push('Sobre tu capacidad: velocidad 5 pies'));
    else if (c.level === 'heavy') ((v -= 20), notes.push('Muy cargado: −20 pies'));
    else if (c.level === 'light') ((v -= 10), notes.push('Cargado: −10 pies'));
    if (ex >= 5) ((v = 0), notes.push('Agotamiento 5: velocidad 0'));
    else if (ex >= 2) ((v = Math.floor(v / 2)), notes.push(`Agotamiento ${ex}: velocidad a la mitad`));
    return { speed: Math.max(0, v), base, notes };
  }

  // La iniciativa es una prueba de Destreza: Polivalente, Alerta y los objetos también cuentan.
  function initiativeParts(s) {
    const parts = checkParts(s, 'dex'),
      feat = root.FeatFX?.initiative(s) || 0;
    if (feat) parts.push({ label: 'Dotes', value: feat });
    return parts;
  }
  const partsText = parts => parts.map(x => (x.value < 0 ? '−' : '+') + Math.abs(x.value) + ' ' + x.label).join(' ');
  const hasSkill = (s, id) =>
    s.proficiencies.includes(id) || Boolean(root.Grants?.proficiencies(s, 'skill').includes(id));
  const hasExpertise = (s, id) =>
    s.expertise.includes(id) || Boolean(root.Grants?.proficiencies(s, 'expertise').includes(id));
  function saveBonus(s, a) {
    const own = ownSaveBonus(s, a),
      beast = s.wildShape?.saves?.[a];
    return Number.isInteger(beast) ? Math.max(own, beast) : own;
  }
  function ownSaveBonus(s, a) {
    return (
      mod(formScores(s)[a]) +
      (root.MagicItems?.save(s) || 0) +
      ((s.classId === 'monk' && s.level >= 14
        ? Object.keys(attrs)
        : root.Classes
          ? root.Classes.info(s).saves
          : ['dex', 'cha']
      ).includes(a) || (root.FeatFX?.saves(s) || []).includes(a)
        ? prof(totalLevel(s))
        : 0)
    );
  }
  function allSpells(s) {
    return [...spells, ...(root.Catalog?.spells || []).filter(x => x.homebrew), ...s.customSpells];
  }
  function features(s) {
    let l = s.level,
      d = stats(s),
      f = [
        [
          'Inspiración Bárdica',
          `Acción adicional; otra criatura a 60 pies que te oiga recibe 1d${d.inspirationDie}. En 10 minutos puede sumarlo a una prueba, ataque o salvación, después de tirar el d20 pero antes de conocer el resultado. Solo un dado por criatura. No podés inspirarte. ${d.inspirationMax} usos; recupera con descanso ${l >= 5 ? 'corto o largo' : 'largo'}.`,
        ],
        [
          'Ascendencia feérica',
          'Ventaja en salvaciones contra hechizado. La magia no puede dormirte. No tenés Trance.',
        ],
        [
          'Visión en la oscuridad',
          '60 pies: tenue como brillante; oscuridad como tenue, sin colores. No permite ver a través de obstáculos.',
        ],
      ];
    if (l >= 2)
      f.push(
        [
          'Aprendiz de mucho',
          `+${Math.floor(d.prof / 2)} a pruebas de característica sin competencia, incluida Iniciativa. Ya incluido en tus números; no en ataques ni salvaciones.`,
        ],
        [
          'Canción de descanso',
          `Durante un descanso corto, música u oratoria. Vos y los aliados que te oigan y gasten al menos un Dado de Golpe curan 1d${d.songDie} adicional cada uno, una vez por descanso.`,
        ],
      );
    if (l >= 3) {
      f.push(['Pericia', 'Duplicás competencia en las habilidades elegidas. No se suma otra vez al bono mostrado.']);
      if (s.subclass === 'eloquence')
        f.push(
          [
            'Lengua de plata',
            'Un 9 o menos natural en Persuasión o Engaño cuenta como 10. No hace posibles peticiones imposibles.',
          ],
          [
            'Palabras perturbadoras',
            `Acción adicional; gastá una Inspiración y tirá 1d${d.inspirationDie}. Una criatura que veas a 60 pies resta el resultado de su próxima salvación antes del inicio de tu siguiente turno.`,
          ],
        );
    }
    if (l >= 5) f.push(['Fuente de Inspiración', 'Los usos de Inspiración se recuperan con descanso corto o largo.']);
    if (l >= 6) {
      f.push([
        'Contraencantamiento',
        'Acción: interpretación hasta finalizar tu siguiente turno. Vos y aliados a 30 pies que te oigan tienen ventaja en salvaciones contra asustado y hechizado. Termina si quedás incapacitado, silenciado o decidís terminarlo sin acción.',
      ]);
      if (s.subclass === 'eloquence')
        f.push(
          [
            'Inspiración infalible',
            'Si una criatura usa tu dado de Inspiración y la tirada aun así falla, conserva ese dado.',
          ],
          [
            'Discurso universal',
            `Acción: hasta ${Math.max(1, d.mods.cha)} criaturas que veas a 60 pies entienden tu habla durante 1 hora, independientemente de idiomas. Una vez por descanso largo; podés gastar un espacio de conjuro para volver a usarlo.`,
          ],
        );
    }
    if (l >= 10)
      f.push([
        'Secretos mágicos',
        'En niveles 10, 14 y 18 elegís dos conjuros de cualquier clase de un nivel que puedas lanzar, incluidos trucos. Cuentan como conjuros de bardo conocidos. Elegí su procedencia en el registro de magia.',
      ]);
    if (l >= 14 && s.subclass === 'eloquence')
      f.push([
        'Inspiración contagiosa',
        `Cuando una criatura usa tu Inspiración y tiene éxito, reacción: otra criatura que te oiga, distinta de vos, a 60 pies recibe un dado sin gastar usos normales. ${d.inspirationMax} usos por descanso largo.`,
      ]);
    if (l >= 20)
      f.push(['Inspiración superior', 'Al tirar iniciativa, si no te quedan usos de Inspiración, recuperás uno.']);
    if (l >= 2 && s.progression?.magical)
      f.push([
        'Inspiración mágica (opcional)',
        'Quien tenga tu dado de Inspiración puede gastarlo al lanzar un conjuro que cure o inflija daño: suma el dado a los PG recuperados o al daño de un objetivo afectado.',
      ]);
    return f.concat(s.features.map(x => [x.name, x.text]));
  }
  function validate(o) {
    // Fichas de la primera versión (sin clase): pasan a ser de bardo, con Elocuencia si la tenían.
    if (o && typeof o === 'object' && !o.classId && (o.schema === 1 || o.subclass)) {
      o.classId = 'bard';
      if (o.subclass === 'eloquence' && !o.classSubclass) o.classSubclass = 'bard-college-of-eloquence';
      o.race = o.race || 'Semielfo';
      o.background = o.background || 'Comerciante gremial';
      if (o.portrait === undefined) o.legacyPortrait = true;
    }
    if (o && typeof o === 'object') {
      if (o.combatState === undefined)
        o.combatState = {
          active: false,
          onTurn: false,
          turn: 0,
          action: null,
          bonus: null,
          spells: [],
          effects: [],
          checks: [],
        };
      if (o.secretKnown === undefined) o.secretKnown = [];
      if (o.progression === undefined)
        o.progression = {
          sources: ['PHB'],
          expanded: false,
          versatility: false,
          magical: false,
          feats: false,
          learnedFeats: [],
        };
    }
    const fail = () => {
      throw Error('La copia no es una ficha válida o contiene valores fuera de rango.');
    };
    // Homebrew que trae la ficha (clases, subclases y conjuros): se suma antes de validar la clase.
    if (o && typeof o === 'object' && o.homebrew !== undefined) {
      if (root.Homebrew ? !root.Homebrew.checkSheet(o.homebrew) : !o.homebrew || typeof o.homebrew !== 'object') fail();
      root.Homebrew?.adopt(o);
    }
    const int = (v, a, b) => Number.isInteger(v) && v >= a && v <= b;
    const txt = (v, n = 12000) => typeof v === 'string' && v.length <= n;
    const list = (v, n) => Array.isArray(v) && v.length <= n;
    const finite = (v, a, b) => typeof v === 'number' && Number.isFinite(v) && v >= a && v <= b;
    if (!o || o.schema !== 1 || !int(o.level, 1, 20) || !txt(o.name, 100)) fail();
    if (o.portrait !== undefined && o.portrait !== null) {
      const p = o.portrait;
      if (
        !p ||
        typeof p !== 'object' ||
        typeof p.data !== 'string' ||
        p.data.length > 160000 ||
        !/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(p.data) ||
        !int(p.position, 0, 100)
      )
        throw Error('Foto de personaje inválida. Usá una imagen desde Editar foto.');
    }
    if (root.Classes) root.Classes.validate(o);
    if (root.Campaign) root.Campaign.validate(o);
    if (root.Defenses) root.Defenses.validate(o);
    if (root.FeatFX) root.FeatFX.validate(o);
    if (root.Grants) {
      root.Grants.validate(o);
      root.Grants.migrate(o);
    }
    if (root.MagicItems) root.MagicItems.validate(o);
    if (root.Companions) root.Companions.validate(o);
    if (root.Equipment) root.Equipment.validate(o);
    if (root.Metamagic) root.Metamagic.validate(o);
    if (root.Cannon) root.Cannon.validate(o);
    if (
      o.dmCommandsApplied !== undefined &&
      (!Array.isArray(o.dmCommandsApplied) ||
        o.dmCommandsApplied.length > 500 ||
        o.dmCommandsApplied.some(id => !(typeof id === 'string' && id.length <= 150) && !Number.isInteger(id)))
    )
      fail();
    if (o.hpAuto !== undefined && typeof o.hpAuto !== 'boolean') fail();
    if (
      o.forgeBlessing !== undefined &&
      (!txt(o.forgeBlessing, 100) || !o.inventory?.some(x => x.id === o.forgeBlessing))
    )
      delete o.forgeBlessing;
    if (!['eloquence', 'manual'].includes(o.subclass)) fail();
    for (let k in attrs) if (!int(o.abilities?.[k], 1, 30)) fail();
    for (let k of ['proficiencies', 'expertise'])
      if (!list(o[k], 18) || o[k].some(x => !skills.some(y => y[0] === x)) || new Set(o[k]).size !== o[k].length)
        fail();
    if (o.expertise.some(x => !o.proficiencies.includes(x))) fail();
    if (!int(o.hpBase, -500, 2000) || !int(o.temp, 0, 9999) || !int(o.acBase, 0, 40) || !int(o.acBonus, -20, 30))
      fail();
    if (o.exhaustion !== undefined && !int(o.exhaustion, 0, 6)) throw Error('Nivel de agotamiento inválido.');
    if (o.hp !== null && !int(o.hp, 0, stats(o).maxHP)) fail();
    if (
      !list(o.slotsSpent, 9) ||
      o.slotsSpent.length !== 9 ||
      o.slotsSpent.some((v, i) => v !== null && !int(v, 0, stats(o).slots[i] || 0))
    )
      fail();
    if (o.inspirationSpent !== null && !int(o.inspirationSpent, 0, stats(o).inspirationMax)) fail();
    if (o.hdSpent !== null && !int(o.hdSpent, 0, totalLevel(o))) fail();
    if (o.heroicInspiration !== undefined && typeof o.heroicInspiration !== 'boolean') fail();
    if (o.encumbranceVariant !== undefined && typeof o.encumbranceVariant !== 'boolean') fail();
    if (o.ammoUsed !== undefined) {
      if (
        !o.ammoUsed ||
        typeof o.ammoUsed !== 'object' ||
        Array.isArray(o.ammoUsed) ||
        Object.keys(o.ammoUsed).length > 20 ||
        Object.entries(o.ammoUsed).some(([k, n]) => k.length > 100 || !int(n, 0, 9999))
      )
        fail();
    }
    // Juramento roto: el juramento anterior, para poder volver con Expiación.
    if (
      o.oathBroken !== undefined &&
      (!o.oathBroken ||
        typeof o.oathBroken !== 'object' ||
        !txt(o.oathBroken.from, 100) ||
        !txt(o.oathBroken.date, 40) ||
        !txt(o.oathBroken.reason ?? '', 300))
    )
      fail();
    // Conjuros favoritos de la vista compacta de combate.
    if (o.favorites !== undefined && (!list(o.favorites, 60) || o.favorites.some(x => !txt(x, 100)))) fail();
    if (root.Effects && !root.Effects.valid(o)) fail();
    if (
      o.bonusDice !== undefined &&
      (!list(o.bonusDice, 20) ||
        o.bonusDice.some(
          b =>
            !txt(b.id, 100) ||
            ![4, 6, 8, 10, 12].includes(b.die) ||
            !txt(b.reason, 200) ||
            !['any', 'check', 'attack', 'save'].includes(b.kind) ||
            !list(b.skills || [], 18) ||
            (b.skills || []).some(k => !skills.some(x => x[0] === k)),
        ))
    )
      fail();
    for (let k of ['hpConfirmed', 'goldConfirmed', 'reactionUsed']) if (typeof o[k] !== 'boolean') fail();
    if (
      !list(o.conditions, 20) ||
      o.conditions.some(x => !txt(x, 80)) ||
      !int(o.death?.success, 0, 3) ||
      !int(o.death?.failure, 0, 3)
    )
      fail();
    if (!list(o.customSpells, 300)) fail();
    for (let x of o.customSpells) {
      if (
        !x ||
        !txt(x.id, 100) ||
        spells.some(y => y.id === x.id) ||
        !txt(x.name, 150) ||
        !int(x.level, 0, 9) ||
        !['Acción', 'Adicional', 'Reacción', 'Especial'].includes(x.time) ||
        !txt(x.range, 100) ||
        !txt(x.components, 500) ||
        !txt(x.duration, 100) ||
        !txt(x.text) ||
        !txt(x.brief, 1000) ||
        !txt(x.source, 100) ||
        typeof x.bard !== 'boolean' ||
        typeof x.concentration !== 'boolean' ||
        typeof x.ritual !== 'boolean'
      )
        fail();
    }
    let ids = allSpells(o).map(x => x.id);
    if (new Set(ids).size !== ids.length) fail();
    for (let k of ['known', 'extras'])
      if (!list(o[k], 300) || new Set(o[k]).size !== o[k].length || o[k].some(x => !ids.includes(x))) fail();
    if (o.known.some(x => o.extras.includes(x)) || !(o.concentration === null || ids.includes(o.concentration))) fail();
    if (!list(o.inventory, 1000)) fail();
    for (let x of o.inventory)
      if (
        !txt(x.id, 100) ||
        !txt(x.name, 200) ||
        !int(x.qty, 0, 999999) ||
        !txt(x.category, 100) ||
        !txt(x.notes) ||
        !txt(x.location, 200) ||
        (x.weight !== null && !finite(x.weight, 0, 999999)) ||
        (x.attack !== undefined &&
          (!x.attack ||
            !['auto', 'str', 'dex', 'con', 'int', 'wis', 'cha'].includes(x.attack.ability) ||
            !['auto', true, false].includes(x.attack.proficient) ||
            !int(x.attack.magic, -5, 10) ||
            !txt(x.attack.extra, 60)))
      )
        fail();
    if (new Set(o.inventory.map(x => x.id)).size !== o.inventory.length) fail();
    for (let k of ['cp', 'sp', 'ep', 'gp', 'pp']) if (!int(o.gold?.[k], 0, 99999999)) fail();
    if (
      !o.mule ||
      !txt(o.mule.name, 100) ||
      !int(o.mule.max, 1, 9999) ||
      (o.mule.hp !== null && !int(o.mule.hp, 0, o.mule.max)) ||
      !txt(o.mule.notes)
    )
      fail();
    if (!o.companion || !txt(o.companion.name, 100) || !txt(o.companion.notes) || !txt(o.notes, 50000)) fail();
    if (!list(o.features, 100) || o.features.some(x => !txt(x.name, 150) || !txt(x.text))) fail();
    if (
      !list(o.extraResources, 100) ||
      o.extraResources.some(
        x =>
          !txt(x.id, 100) ||
          !txt(x.name, 100) ||
          !int(x.max, 1, 999) ||
          !int(x.spent, 0, x.max) ||
          !['short', 'long', 'manual'].includes(x.reset),
      )
    )
      fail();
    if (!int(o.universalSpent, 0, 1) || !int(o.infectiousSpent, 0, stats(o).inspirationMax)) fail();
    if (!list(o.log, 150) || o.log.some(x => !txt(x.text, 1000) || !txt(x.date, 100))) fail();
    if (!list(o.levelHistory, 20) || o.levelHistory.some(x => !int(x.level, 1, 20) || !txt(x.note, 1000))) fail();
    if (
      !list(o.secretKnown, 8) ||
      new Set(o.secretKnown).size !== o.secretKnown.length ||
      o.secretKnown.some(x => !o.known.includes(x))
    )
      fail();
    const pc = o.progression;
    if (
      !pc ||
      !list(pc.sources, 60) ||
      pc.sources.some(x => !txt(x, 50)) ||
      !list(pc.learnedFeats, 50) ||
      pc.learnedFeats.some(x => !txt(x, 100))
    )
      fail();
    for (const key of ['expanded', 'versatility', 'magical', 'feats']) if (typeof pc[key] !== 'boolean') fail();
    const c = o.combatState;
    if (
      !c ||
      typeof c.active !== 'boolean' ||
      typeof c.onTurn !== 'boolean' ||
      !int(c.turn, 0, 999999) ||
      !['action', 'bonus'].every(k => c[k] === null || txt(c[k], 200)) ||
      !list(c.spells, 20) ||
      c.spells.some(x => !x || !['action', 'bonus', 'reaction', 'special'].includes(x.kind) || !int(x.level, 0, 9)) ||
      !list(c.effects, 100) ||
      c.effects.some(
        x =>
          !x ||
          !txt(x.id, 150) ||
          !['inspired', 'unsettling', 'ready', 'advantage'].includes(x.kind) ||
          !txt(x.target, 100) ||
          !int(x.value, 0, 100),
      ) ||
      !list(c.checks, 100) ||
      c.checks.some(x => !int(x, 10, 5000)) ||
      (c.rolled !== undefined &&
        (!c.rolled ||
          typeof c.rolled !== 'object' ||
          Array.isArray(c.rolled) ||
          Object.keys(c.rolled).length > 200 ||
          Object.entries(c.rolled).some(([k, v]) => !txt(k, 150) || !int(v, 0, 999)))) ||
      (c.extraRolls !== undefined && !int(c.extraRolls, 0, 99))
    )
      fail();
    if (root.Homebrew) {
      const used = root.Homebrew.snapshot(o);
      if (used) o.homebrew = used;
      else delete o.homebrew;
    }
    return JSON.parse(JSON.stringify(o));
  }
  // ---------- Números de cada conjuro (campo «dice» del catálogo) ----------
  // Una sola fuente para los dados: el texto, la tirada y el lanzamiento con espacio superior la usan.
  const parseDice = t => {
    const m = /^(\d+)d(\d+)(?:\+(\d+))?$/.exec(String(t || ''));
    return m ? { n: Number(m[1]), sides: Number(m[2]), flat: Number(m[3] || 0) } : null;
  };
  const diceText = (n, sides, flat = 0) => (n ? n + 'd' + sides : '') + (flat ? (n ? ' + ' : '') + flat : '');
  const tierOf = lvl => (lvl >= 17 ? 3 : lvl >= 11 ? 2 : lvl >= 5 ? 1 : 0);
  // opts: { level: nivel de personaje, slot: nivel del espacio, mod: modificador de lanzamiento }.
  function spellDice(sp, opts = {}) {
    const D = sp?.dice;
    if (!D) return null;
    const slot = Math.max(sp.level, Number(opts.slot) || sp.level),
      tier = sp.level === 0 ? tierOf(Number(opts.level) || 1) : 0,
      notes = [];
    // Niveles de espacio por encima del base que suman dados (con tope y «cada dos niveles»).
    let steps = 0;
    if (D.up && slot > sp.level) {
      const every = D.up[1] || 1,
        top = D.up[2] || 9;
      steps = Math.floor((Math.min(slot, top) - sp.level) / every);
    }
    const up = D.up ? parseDice(D.up[0]) : null;
    let upDone = false;
    const rows = (D.dmg || []).map(([d, type, mod], i) => {
      // «2d8+1d6» (Descarga de caos) se conserva tal cual.
      if (/d\d+\+\d+d/.test(d)) return { dice: d.replace('+', ' + '), type, mod: !!mod, n: 0, sides: 0, flat: 0 };
      const p = parseDice(d) || { n: 0, sides: 0, flat: 0 };
      let n = p.n;
      if (D.tiers && !D.blade) {
        if (i === 0) n = parseDice(D.tiers[tier])?.n ?? n;
        else n = p.n * (tier + 1);
      }
      if (D.blade) n = parseDice(D.tiers[tier])?.n ?? 0;
      if (up && steps && !upDone && up.sides === p.sides) {
        n += up.n * steps;
        upDone = !D.or; // Alternativas (radiante o necrótico): la mejora vale para ambas.
      }
      return { dice: diceText(n, p.sides, p.flat), type, mod: !!mod, n, sides: p.sides, flat: p.flat };
    });
    let heal = null;
    if (D.heal) {
      const p = parseDice(D.heal[0]);
      if (p) {
        let n = p.n;
        if (up && steps && !upDone && up.sides === p.sides) n += up.n * steps;
        heal = { dice: diceText(n, p.sides, p.flat), mod: !!D.heal[1], n, sides: p.sides, flat: p.flat };
      } else heal = { dice: String(D.heal[0]), mod: false, n: 0, sides: 0, flat: Number(D.heal[0]) || 0 };
    }
    // Varios proyectiles con los mismos dados.
    let count = 0;
    if (D.multi) {
      count = D.multi.cantrip ? D.multi.n + tier : D.multi.n + (D.multi.up ? slot - sp.level : 0);
    }
    const extra = D.blade ? parseDice(D.blade[tier]) : null;
    return { rows, heal, temp: D.temp || '', count, unit: D.multi?.unit || '', extra, tier, steps, notes };
  }
  // Frases en castellano con los números ya resueltos para este personaje y espacio.
  function spellNumbers(sp, opts = {}) {
    const D = sp?.dice,
      r = spellDice(sp, opts);
    if (!r) return [];
    const mod = Number.isFinite(opts.mod) ? opts.mod : null,
      modText = m =>
        m ? (mod === null ? ' + tu modificador' : mod ? (mod > 0 ? ' + ' : ' − ') + Math.abs(mod) : '') : '',
      NOUN = /^(ácido|frío|fuego|fuerza|relámpago|trueno|veneno)/,
      typeText = t =>
        !t
          ? ''
          : /^(a elección|según)/.test(t)
            ? ' de daño (tipo ' + t + ')'
            : ' de daño ' + (NOUN.test(t) ? 'de ' : '') + t,
      out = [],
      lvl = Number(opts.level) || 1,
      slot = Math.max(sp.level, Number(opts.slot) || sp.level),
      lead = sp.level === 0 ? `A tu nivel ${lvl}: ` : slot > sp.level ? `Con espacio de nivel ${slot}: ` : '';
    if (D.blade) {
      const type = r.rows[0].type,
        hit = r.extra?.n ? `${r.extra.n}d${r.extra.sides}${typeText(type)} extra` : 'solo el daño del arma';
      out.push(`${lead}al impactar, ${hit}.`);
      out.push(
        sp.id === 'green-flame-blade'
          ? `Fuego que salta a la segunda criatura: ${r.rows[0].dice ? r.rows[0].dice + modText(true) : mod === null ? 'tu modificador' : String(mod)}${typeText(type)}.`
          : `Si se mueve: ${r.rows[0].dice}${typeText(type)}.`,
      );
      out.push('Ambos suben en los niveles 5, 11 y 17.');
      return out;
    }
    if (r.count) {
      const row = r.rows[0];
      out.push(
        `${lead}${r.count} ${r.unit}${r.count > 1 ? 's' : ''} de ${row.dice}${typeText(row.type)} cada uno${D.multi.unit === 'dardo' ? ', sin tirada de ataque' : ', con un ataque por ' + D.multi.unit}.`,
      );
      if (D.multi.cantrip) out.push(`1 ${D.multi.unit} en nivel 1, 2 en nivel 5, 3 en 11 y 4 en 17.`);
      else if (D.multi.up) out.push(`Espacio superior: +1 ${D.multi.unit} por cada nivel por encima de ${sp.level}.`);
      return out;
    }
    if (r.rows.length) {
      // Doblar por los muertos: dos dados alternativos del mismo tipo.
      const alt = r.rows.length === 2 && r.rows[0].type === r.rows[1].type && r.rows[0].sides !== r.rows[1].sides;
      const parts = alt
        ? [`${r.rows[0].dice}${typeText(r.rows[0].type)} (${r.rows[1].dice} si ya le falta algún PG)`]
        : r.rows.map(x => x.dice + modText(x.mod) + typeText(x.type));
      out.push(`${lead}${parts.join(alt || D.or ? ' o ' : D.then ? '; después, ' : ' y ')}.`);
    }
    if (r.heal) out.push(`${lead}${lead ? 'r' : 'R'}ecupera ${r.heal.dice}${modText(r.heal.mod)} PG.`);
    if (r.temp) out.push(`PG temporales: ${r.temp.replace('+', ' + ')}.`);
    if (D.tiers && sp.level === 0) {
      const t = D.tiers.map(x => parseDice(x)),
        second = r.rows.length === 2 && r.rows[1].sides !== r.rows[0].sides ? r.rows[1].sides : 0;
      out.push(
        `Sube con tu nivel: ${[5, 11, 17].map((l, i) => t[i + 1].n + 'd' + t[i + 1].sides + (second ? ' o ' + (i + 2) + 'd' + second : '') + ' en ' + l).join(', ')}.`,
      );
    }
    if (D.up && sp.level > 0) {
      const every = D.up[1] || 1,
        top = D.up[2];
      out.push(
        `Espacio superior: +${D.up[0]} por ${every === 2 ? 'cada dos niveles' : 'cada nivel'} por encima de ${sp.level}${top ? ' (hasta el nivel ' + top + ')' : ''}.`,
      );
    }
    return out;
  }
  // Opciones para un personaje: nivel total y modificador de la clase que lanza ese conjuro.
  function spellOpts(s, sp, slot) {
    const C = root.Classes,
      caster = sp.castAbility ? { ...s, castingAbility: sp.castAbility } : C?.spellCaster ? C.spellCaster(s, sp.id) : s,
      ability = C?.casting ? C.casting(caster).ability : 'cha',
      mod = ability ? stats(caster).mods[ability] : undefined;
    return { level: totalLevel(s), slot, mod };
  }
  const spellNumbersFor = (s, sp, slot) => spellNumbers(sp, spellOpts(s, sp, slot));
  // «Nivel 1: 3d6 · 2: 4d6 · 3: 5d6»: el dado principal en cada espacio que podés gastar.
  function slotTable(s, sp, slots) {
    if (!sp?.dice?.up && !sp?.dice?.multi?.up) return '';
    const parts = slots.map(l => {
      const r = spellDice(sp, spellOpts(s, sp, l)),
        main = r.count ? r.count + ' × ' + r.rows[0].dice : r.rows[0]?.dice || r.heal?.dice;
      return main ? `${l}: ${main}` : '';
    });
    return parts.filter(Boolean).length > 1 ? 'Por espacio · ' + parts.filter(Boolean).join(' · ') : '';
  }
  const api = {
    hasSkill,
    hasExpertise,
    spellDice,
    spellOpts,
    spellNumbersFor,
    slotTable,
    spellNumbers,
    totalLevel,
    slots,
    known,
    attrs,
    skills,
    spells,
    mod,
    prof,
    die,
    song,
    initial,
    stats,
    scores,
    formScores,
    skillBonus,
    exhaustion,
    exhaustionEffects,
    EXHAUSTION,
    carrying,
    speedInfo,
    checkParts,
    halfProf,
    initiativeParts,
    partsText,
    passive,
    saveBonus,
    allSpells,
    features,
    validate,
    xpNext,
  };
  if (typeof module !== 'undefined') module.exports = api;
  root.Rules = api;
})(typeof window !== 'undefined' ? window : globalThis);
