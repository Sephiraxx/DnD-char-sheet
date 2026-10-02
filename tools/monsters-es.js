// Traduce al español los monstruos del SRD de monsters-data.js: nombres, nombres de acciones y rasgos,
// y las fórmulas de las reglas (ataques, daño, salvaciones, velocidad, sentidos, habilidades, idiomas).
// Los textos especiales que no siguen una fórmula quedan en inglés. Conserva el nombre original en `english`.
// Uso: node tools/monsters-es.js   (traduce monsters-data.js en el lugar; se puede repetir sin problema)
// tools/build-monsters.js también lo aplica al generar el archivo.
'use strict';

const COLOR = {
  Black: 'negro',
  Blue: 'azul',
  Green: 'verde',
  Red: 'rojo',
  White: 'blanco',
  Brass: 'de latón',
  Bronze: 'de bronce',
  Copper: 'de cobre',
  Gold: 'de oro',
  Silver: 'de plata',
};
const AGE = { Adult: 'adulto', Ancient: 'anciano', Young: 'joven' };
// Animales y criaturas que también aparecen como «gigante» o en «enjambre».
const BASE = {
  Ape: 'Simio',
  Badger: 'Tejón',
  Bat: 'Murciélago',
  Boar: 'Jabalí',
  Centipede: 'Ciempiés',
  'Constrictor Snake': 'Serpiente constrictora',
  Crab: 'Cangrejo',
  Crocodile: 'Cocodrilo',
  Eagle: 'Águila',
  Elk: 'Alce',
  'Fire Beetle': 'Escarabajo de fuego',
  Frog: 'Rana',
  Goat: 'Cabra',
  Hyena: 'Hiena',
  Lizard: 'Lagarto',
  Octopus: 'Pulpo',
  Owl: 'Búho',
  'Poisonous Snake': 'Serpiente venenosa',
  Rat: 'Rata',
  'Rat (Diseased)': 'Rata (enferma)',
  Scorpion: 'Escorpión',
  'Sea Horse': 'Caballito de mar',
  Shark: 'Tiburón',
  Spider: 'Araña',
  Toad: 'Sapo',
  Vulture: 'Buitre',
  Wasp: 'Avispa',
  Weasel: 'Comadreja',
  'Wolf Spider': 'Araña lobo',
};
const SWARM = {
  Bats: 'murciélagos',
  Beetles: 'escarabajos',
  Centipedes: 'ciempiés',
  Insects: 'insectos',
  'Poisonous Snakes': 'serpientes venenosas',
  Quippers: 'pirañas',
  Rats: 'ratas',
  Ravens: 'cuervos',
  Spiders: 'arañas',
  Wasps: 'avispas',
};
const WERE = {
  Werebear: 'Hombre oso',
  Wereboar: 'Hombre jabalí',
  Wererat: 'Hombre rata',
  Weretiger: 'Hombre tigre',
  Werewolf: 'Hombre lobo',
};
const FORM = {
  'Human Form': 'forma humana',
  'Hybrid Form': 'forma híbrida',
  'Bear Form': 'forma de oso',
  'Boar Form': 'forma de jabalí',
  'Rat Form': 'forma de rata',
  'Tiger Form': 'forma de tigre',
  'Wolf Form': 'forma de lobo',
  'Vampire Form': 'forma de vampiro',
  'Bat Form': 'forma de murciélago',
  'Mist Form': 'forma de niebla',
};
const NAMES = {
  Aboleth: 'Aboleth',
  Acolyte: 'Acólito',
  'Air Elemental': 'Elemental de aire',
  Androsphinx: 'Androesfinge',
  'Animated Armor': 'Armadura animada',
  Ankheg: 'Ankheg',
  Archmage: 'Archimago',
  Assassin: 'Asesino',
  'Awakened Shrub': 'Arbusto despertado',
  'Awakened Tree': 'Árbol despertado',
  'Axe Beak': 'Picohacha',
  Azer: 'Azer',
  Baboon: 'Babuino',
  Balor: 'Balor',
  Bandit: 'Bandido',
  'Bandit Captain': 'Capitán bandido',
  'Barbed Devil': 'Diablo espinoso',
  Basilisk: 'Basilisco',
  'Bearded Devil': 'Diablo barbado',
  Behir: 'Behir',
  Berserker: 'Berserker',
  'Black Bear': 'Oso negro',
  'Black Pudding': 'Pudin negro',
  'Blink Dog': 'Perro intermitente',
  'Blood Hawk': 'Halcón sangriento',
  'Bone Devil': 'Diablo óseo',
  'Brown Bear': 'Oso pardo',
  Bugbear: 'Osgo',
  Bulette: 'Bulette',
  Camel: 'Camello',
  Cat: 'Gato',
  Centaur: 'Centauro',
  'Chain Devil': 'Diablo de las cadenas',
  Chimera: 'Quimera',
  Chuul: 'Chuul',
  'Clay Golem': 'Gólem de arcilla',
  Cloaker: 'Mantoscuro',
  'Cloud Giant': 'Gigante de las nubes',
  Cockatrice: 'Cocatriz',
  Commoner: 'Plebeyo',
  Couatl: 'Couatl',
  'Cult Fanatic': 'Fanático de culto',
  Cultist: 'Sectario',
  Darkmantle: 'Mantonegro',
  'Death Dog': 'Perro de la muerte',
  'Deep Gnome (Svirfneblin)': 'Gnomo de las profundidades (svirfneblin)',
  Deer: 'Ciervo',
  Deva: 'Deva',
  'Dire Wolf': 'Lobo terrible',
  Djinni: 'Djinni',
  Doppelganger: 'Doppelganger',
  'Draft Horse': 'Caballo de tiro',
  'Dragon Turtle': 'Tortuga dragón',
  Dretch: 'Dretch',
  Drider: 'Drider',
  Drow: 'Drow',
  Druid: 'Druida',
  Dryad: 'Dríade',
  Duergar: 'Duergar',
  'Dust Mephit': 'Mefit de polvo',
  'Earth Elemental': 'Elemental de tierra',
  Efreeti: 'Efreeti',
  Elephant: 'Elefante',
  Erinyes: 'Erinia',
  Ettercap: 'Ettercap',
  Ettin: 'Ettin',
  'Fire Elemental': 'Elemental de fuego',
  'Fire Giant': 'Gigante de fuego',
  'Flesh Golem': 'Gólem de carne',
  'Flying Snake': 'Serpiente voladora',
  'Flying Sword': 'Espada voladora',
  'Frost Giant': 'Gigante de escarcha',
  Gargoyle: 'Gárgola',
  'Gelatinous Cube': 'Cubo gelatinoso',
  Ghast: 'Ghast',
  Ghost: 'Fantasma',
  Ghoul: 'Necrófago',
  'Giant Shark': 'Tiburón gigante',
  'Gibbering Mouther': 'Farfullador',
  Glabrezu: 'Glabrezu',
  Gladiator: 'Gladiador',
  Gnoll: 'Gnoll',
  Goblin: 'Goblin',
  Gorgon: 'Gorgona',
  'Gray Ooze': 'Cieno gris',
  'Green Hag': 'Saga verde',
  Grick: 'Grick',
  Griffon: 'Grifo',
  Grimlock: 'Grimlock',
  Guard: 'Guardia',
  'Guardian Naga': 'Naga guardiana',
  Gynosphinx: 'Ginoesfinge',
  'Half-Red Dragon Veteran': 'Veterano semidragón rojo',
  Harpy: 'Arpía',
  Hawk: 'Halcón',
  'Hell Hound': 'Perro infernal',
  Hezrou: 'Hezrou',
  'Hill Giant': 'Gigante de las colinas',
  Hippogriff: 'Hipogrifo',
  Hobgoblin: 'Hobgoblin',
  Homunculus: 'Homúnculo',
  'Horned Devil': 'Diablo astado',
  'Hunter Shark': 'Tiburón cazador',
  Hydra: 'Hidra',
  'Ice Devil': 'Diablo del hielo',
  'Ice Mephit': 'Mefit de hielo',
  Imp: 'Diablillo',
  'Invisible Stalker': 'Acechador invisible',
  'Iron Golem': 'Gólem de hierro',
  Jackal: 'Chacal',
  'Killer Whale': 'Orca',
  Knight: 'Caballero',
  Kobold: 'Kobold',
  Kraken: 'Kraken',
  Lamia: 'Lamia',
  Lemure: 'Lémur',
  Lich: 'Liche',
  Lion: 'León',
  Lizardfolk: 'Hombre lagarto',
  Mage: 'Mago',
  'Magma Mephit': 'Mefit de magma',
  Magmin: 'Magmin',
  Mammoth: 'Mamut',
  Manticore: 'Mantícora',
  Marilith: 'Marilith',
  Mastiff: 'Mastín',
  Medusa: 'Medusa',
  Merfolk: 'Tritón',
  Merrow: 'Merrow',
  Mimic: 'Mimeto',
  Minotaur: 'Minotauro',
  'Minotaur Skeleton': 'Esqueleto de minotauro',
  Mule: 'Mula',
  Mummy: 'Momia',
  'Mummy Lord': 'Señor momia',
  Nalfeshnee: 'Nalfeshnee',
  'Night Hag': 'Saga nocturna',
  Nightmare: 'Pesadilla',
  Noble: 'Noble',
  'Ochre Jelly': 'Jalea ocre',
  Ogre: 'Ogro',
  'Ogre Zombie': 'Zombi ogro',
  Oni: 'Oni',
  Orc: 'Orco',
  Otyugh: 'Otyugh',
  Owlbear: 'Osolechuza',
  Panther: 'Pantera',
  Pegasus: 'Pegaso',
  'Phase Spider': 'Araña de fase',
  'Pit Fiend': 'Diablo de la sima',
  Planetar: 'Planetar',
  Plesiosaurus: 'Plesiosaurio',
  'Polar Bear': 'Oso polar',
  Pony: 'Poni',
  Priest: 'Sacerdote',
  Pseudodragon: 'Pseudodragón',
  'Purple Worm': 'Gusano púrpura',
  Quasit: 'Quasit',
  Quipper: 'Piraña',
  Rakshasa: 'Rakshasa',
  Raven: 'Cuervo',
  'Reef Shark': 'Tiburón de arrecife',
  Remorhaz: 'Remorhaz',
  Rhinoceros: 'Rinoceronte',
  'Riding Horse': 'Caballo de monta',
  Roc: 'Roc',
  Roper: 'Acechador cavernario',
  'Rug of Smothering': 'Alfombra asfixiante',
  'Rust Monster': 'Monstruo corrosivo',
  'Saber-Toothed Tiger': 'Tigre dientes de sable',
  Sahuagin: 'Sahuagin',
  Salamander: 'Salamandra',
  Satyr: 'Sátiro',
  Scout: 'Explorador',
  'Sea Hag': 'Saga marina',
  Shadow: 'Sombra',
  'Shambling Mound': 'Montículo errante',
  'Shield Guardian': 'Guardián escudo',
  Shrieker: 'Chillón',
  Skeleton: 'Esqueleto',
  Solar: 'Solar',
  Specter: 'Espectro',
  'Spirit Naga': 'Naga espiritual',
  Sprite: 'Duendecillo',
  Spy: 'Espía',
  'Steam Mephit': 'Mefit de vapor',
  Stirge: 'Estirge',
  'Stone Giant': 'Gigante de piedra',
  'Stone Golem': 'Gólem de piedra',
  'Storm Giant': 'Gigante de las tormentas',
  'Succubus/Incubus': 'Súcubo/Íncubo',
  Tarrasque: 'Tarrasca',
  Thug: 'Matón',
  Tiger: 'Tigre',
  Treant: 'Ent',
  'Tribal Warrior': 'Guerrero tribal',
  Triceratops: 'Triceratops',
  Troll: 'Trol',
  'Tyrannosaurus Rex': 'Tiranosaurio rex',
  Unicorn: 'Unicornio',
  'Vampire Spawn': 'Engendro vampírico',
  Veteran: 'Veterano',
  'Violet Fungus': 'Hongo violeta',
  Vrock: 'Vrock',
  Warhorse: 'Caballo de guerra',
  'Warhorse Skeleton': 'Esqueleto de caballo de guerra',
  'Water Elemental': 'Elemental de agua',
  Wight: 'Tumulario',
  "Will-o'-Wisp": 'Fuego fatuo',
  'Winter Wolf': 'Lobo invernal',
  Wolf: 'Lobo',
  Worg: 'Huargo',
  Wraith: 'Espectro mayor',
  Wyvern: 'Guiverno',
  Xorn: 'Xorn',
  Zombie: 'Zombi',
  ...BASE,
};

function name(n) {
  if (NAMES[n]) return NAMES[n];
  let m = /^(Adult|Ancient|Young) (\w+) Dragon$/.exec(n);
  if (m) return `Dragón ${COLOR[m[2]]} ${AGE[m[1]]}`;
  if ((m = /^(\w+) Dragon Wyrmling$/.exec(n))) return `Cría de dragón ${COLOR[m[1]]}`;
  if ((m = /^Giant (.+)$/.exec(n)) && BASE[m[1]]) {
    const b = BASE[m[1]];
    return /\(/.test(b) ? b.replace(' (', ' gigante (') : b + ' gigante';
  }
  if ((m = /^Swarm of (.+)$/.exec(n)) && SWARM[m[1]]) return 'Enjambre de ' + SWARM[m[1]];
  if ((m = /^(Were\w+), (.+)$/.exec(n)) && WERE[m[1]]) return `${WERE[m[1]]} (${FORM[m[2]] || m[2]})`;
  if ((m = /^Vampire, (.+)$/.exec(n))) return `Vampiro (${FORM[m[1]] || m[1]})`;
  return n;
}

// Nombres de acciones y rasgos frecuentes.
const ACT = {
  Multiattack: 'Ataque múltiple',
  Bite: 'Mordisco',
  Claw: 'Garra',
  Claws: 'Garras',
  Tail: 'Cola',
  Slam: 'Golpe',
  Fist: 'Puño',
  Gore: 'Cornada',
  Hooves: 'Cascos',
  Hoof: 'Casco',
  Horn: 'Cuerno',
  Tentacle: 'Tentáculo',
  Tentacles: 'Tentáculos',
  Sting: 'Aguijón',
  Talons: 'Garras',
  Beak: 'Pico',
  Tusk: 'Colmillo',
  Tusks: 'Colmillos',
  Ram: 'Embestida',
  Stomp: 'Pisotón',
  Touch: 'Toque',
  Wing: 'Ala',
  Wings: 'Alas',
  Longsword: 'Espada larga',
  Shortsword: 'Espada corta',
  Scimitar: 'Cimitarra',
  Dagger: 'Daga',
  Club: 'Garrote',
  Greatclub: 'Gran garrote',
  Greataxe: 'Gran hacha',
  Greatsword: 'Mandoble',
  Handaxe: 'Hacha de mano',
  Javelin: 'Jabalina',
  Spear: 'Lanza',
  Longbow: 'Arco largo',
  Shortbow: 'Arco corto',
  'Light Crossbow': 'Ballesta ligera',
  'Heavy Crossbow': 'Ballesta pesada',
  'Hand Crossbow': 'Ballesta de mano',
  Mace: 'Maza',
  Morningstar: 'Lucero del alba',
  Warhammer: 'Martillo de guerra',
  Battleaxe: 'Hacha de batalla',
  Maul: 'Mazo',
  Flail: 'Mangual',
  Glaive: 'Guja',
  Halberd: 'Alabarda',
  Pike: 'Pica',
  Lance: 'Lanza de caballería',
  Trident: 'Tridente',
  Whip: 'Látigo',
  Sling: 'Honda',
  Rock: 'Roca',
  Quarterstaff: 'Bastón',
  Rapier: 'Estoque',
  'War Pick': 'Pico de guerra',
  Constrict: 'Constreñir',
  Swallow: 'Tragar',
  Engulf: 'Engullir',
  Pseudopod: 'Seudópodo',
  'Frightful Presence': 'Presencia aterradora',
  'Fire Breath': 'Aliento de fuego',
  'Cold Breath': 'Aliento de frío',
  'Lightning Breath': 'Aliento de relámpago',
  'Acid Breath': 'Aliento de ácido',
  'Poison Breath': 'Aliento venenoso',
  'Breath Weapons': 'Armas de aliento',
  'Change Shape': 'Cambiar de forma',
  'Wing Attack': 'Ataque con alas',
  'Tail Attack': 'Ataque con la cola',
  Detect: 'Detectar',
  Spellcasting: 'Lanzamiento de conjuros',
  'Innate Spellcasting': 'Lanzamiento de conjuros innato',
  Amphibious: 'Anfibio',
  'Keen Smell': 'Olfato agudo',
  'Keen Sight': 'Vista aguda',
  'Keen Hearing': 'Oído agudo',
  'Keen Hearing and Smell': 'Oído y olfato agudos',
  'Keen Hearing and Sight': 'Oído y vista agudos',
  'Keen Sight and Smell': 'Vista y olfato agudos',
  'Pack Tactics': 'Tácticas de manada',
  'Magic Resistance': 'Resistencia mágica',
  'Magic Weapons': 'Armas mágicas',
  'Sunlight Sensitivity': 'Sensibilidad a la luz solar',
  Charge: 'Carga',
  Pounce: 'Abalanzarse',
  Regeneration: 'Regeneración',
  'Undead Fortitude': 'Fortaleza de muerto viviente',
  'Spider Climb': 'Trepar cual arácnido',
  'Web Sense': 'Sentir telarañas',
  'Web Walker': 'Caminar por telarañas',
  'Nimble Escape': 'Huida ágil',
  Parry: 'Parada',
  Brute: 'Bruto',
  Aggressive: 'Agresivo',
  Rampage: 'Arrasar',
  Reckless: 'Temerario',
  'Hold Breath': 'Contener el aliento',
  'Water Breathing': 'Respirar bajo el agua',
  Flyby: 'Vuelo rasante',
  Echolocation: 'Ecolocalización',
  Shapechanger: 'Cambiaformas',
  'False Appearance': 'Apariencia falsa',
  'Incorporeal Movement': 'Movimiento incorpóreo',
  'Turn Immunity': 'Inmunidad a expulsar',
  'Turn Defiance': 'Desafío a expulsar',
  'Life Drain': 'Drenar vida',
  'Petrifying Gaze': 'Mirada petrificante',
  'Siege Monster': 'Monstruo de asedio',
  'Trampling Charge': 'Carga arrolladora',
  Stench: 'Hedor',
  "Devil's Sight": 'Vista del diablo',
  'Heated Body': 'Cuerpo ardiente',
  Illumination: 'Iluminación',
  'Death Burst': 'Estallido al morir',
  Mimicry: 'Imitación',
  'Standing Leap': 'Salto sin carrerilla',
  'Running Leap': 'Salto con carrerilla',
  'Sure-Footed': 'Paso firme',
  'Mountain Born': 'Nacido en la montaña',
  'Sneak Attack (1/Turn)': 'Ataque furtivo (1/turno)',
  'Sneak Attack': 'Ataque furtivo',
  'Martial Advantage': 'Ventaja marcial',
  'Surprise Attack': 'Ataque sorpresa',
  'Dark Devotion': 'Devoción oscura',
  'Blood Frenzy': 'Frenesí sanguinario',
  'Water Susceptibility': 'Vulnerabilidad al agua',
  'Fey Ancestry': 'Ascendencia feérica',
  'Shadow Stealth': 'Sigilo en las sombras',
  'Sunlight Weakness': 'Debilidad a la luz solar',
  'Legendary Resistance (3/Day)': 'Resistencia legendaria (3/día)',
  'Legendary Resistance': 'Resistencia legendaria',
  'Leadership (Recharges after a Short or Long Rest)': 'Liderazgo (se recupera tras un descanso corto o largo)',
  'Read Thoughts': 'Leer pensamientos',
  Invisibility: 'Invisibilidad',
  Teleport: 'Teletransporte',
  'Healing Touch (3/Day)': 'Toque sanador (3/día)',
  Etherealness: 'Forma etérea',
  'Horrifying Visage': 'Rostro aterrador',
  'Possession (Recharge 6)': 'Posesión (Recarga 6)',
  'Ethereal Sight': 'Visión etérea',
  'Web (Recharge 5–6)': 'Telaraña (Recarga 5–6)',
  'Enlarge (Recharges after a Short or Long Rest)': 'Agrandarse (se recupera tras un descanso corto o largo)',
  'Invisibility (Recharges after a Short or Long Rest)': 'Invisibilidad (se recupera tras un descanso corto o largo)',
  Antimagic: 'Antimagia',
  Avoidance: 'Evasión',
  'Damage Transfer': 'Transferencia de daño',
  Grappler: 'Apresador',
  'Ooze Cube': 'Cubo de cieno',
  Transparent: 'Transparente',
  Corrode: 'Corroer',
  'Corrode Metal': 'Corroer metal',
  'Acid Spray (Recharge 6)': 'Rocío de ácido (Recarga 6)',
  'Rust Metal': 'Oxidar metal',
  'Iron Scent': 'Olfato para el hierro',
  Antennae: 'Antenas',
  'Heated Weapons': 'Armas ardientes',
  'Ignited Illumination': 'Luz ígnea',
  'Elemental Demise': 'Destrucción elemental',
  'Innate Spellcasting (1/Day)': 'Lanzamiento de conjuros innato (1/día)',
  'Unusual Nature': 'Naturaleza inusual',
  'Earth Glide': 'Deslizarse por la tierra',
  'Air Form': 'Forma de aire',
  'Water Form': 'Forma de agua',
  'Fire Form': 'Forma de fuego',
  Whirlwind: 'Torbellino',
  'Whirlwind (Recharge 4–6)': 'Torbellino (Recarga 4–6)',
  'Whelm (Recharge 4–6)': 'Arrollar (Recarga 4–6)',
  Freeze: 'Congelarse',
  'Immutable Form': 'Forma inmutable',
  Berserk: 'Enloquecido',
  'Aversion of Fire': 'Aversión al fuego',
  'Lightning Absorption': 'Absorción de relámpagos',
  'Fire Absorption': 'Absorción de fuego',
  'Acid Absorption': 'Absorción de ácido',
  'Slow (Recharge 5–6)': 'Ralentizar (Recarga 5–6)',
  'Haste (Recharge 5–6)': 'Acelerar (Recarga 5–6)',
  'Two Heads': 'Dos cabezas',
  Wakeful: 'Siempre alerta',
  'Multiple Heads': 'Varias cabezas',
  'Reactive Heads': 'Cabezas reactivas',
  'Labyrinthine Recall': 'Memoria laberíntica',
  'Mucous Cloud': 'Nube mucosa',
  'Probing Telepathy': 'Telepatía invasiva',
  Enslave: 'Esclavizar',
  'Psychic Drain (Costs 2 Actions)': 'Drenaje psíquico (cuesta 2 acciones)',
  'Spell-Like Abilities': 'Habilidades sortílegas',
  Rejuvenation: 'Rejuvenecimiento',
  'Vampire Weaknesses': 'Debilidades vampíricas',
  'Misty Escape': 'Escape brumoso',
  'Children of the Night (1/Day)': 'Hijos de la noche (1/día)',
  Charm: 'Hechizar',
  'Unarmed Strike': 'Golpe sin armas',
  'Spiked Shield': 'Escudo con pinchos',
  Bites: 'Mordiscos',
  Swarm: 'Enjambre',
  Relentless: 'Implacable',
  'Stone Camouflage': 'Camuflaje pétreo',
  'Underwater Camouflage': 'Camuflaje subacuático',
  Amorphous: 'Amorfo',
  'Healing Touch': 'Toque sanador',
  Move: 'Moverse',
  Attack: 'Atacar',
  'Ice Walk': 'Caminar sobre hielo',
  'Antimagic Susceptibility': 'Vulnerable a la antimagia',
  'Hurl Flame': 'Arrojar llamas',
  'Angelic Weapons': 'Armas angélicas',
  'Hellish Weapons': 'Armas infernales',
  'Claw Attack': 'Ataque con garra',
  'Cast a Spell': 'Lanzar un conjuro',
  Inscrutable: 'Inescrutable',
  Split: 'Dividirse',
  Horns: 'Cuernos',
  Pincer: 'Pinza',
  'Steam Breath': 'Aliento de vapor',
  Web: 'Telaraña',
  'Ink Cloud': 'Nube de tinta',
  Brave: 'Valiente',
  'Illusory Appearance': 'Apariencia ilusoria',
  'Telepathic Bond': 'Vínculo telepático',
  'Limited Telepathy': 'Telepatía limitada',
  'Rotting Fist': 'Puño putrefacto',
  'Dreadful Glare': 'Mirada aterradora',
  'Divine Awareness': 'Conciencia divina',
  'Children of the Night': 'Hijos de la noche',
  'Tail Swipe': 'Coletazo',
  Roar: 'Rugido',
  'Acid Spray': 'Rocío de ácido',
  Assassinate: 'Asesinar',
  Evasion: 'Evasión',
  Rake: 'Zarpazo',
  'Death Throes': 'Estertores',
  'Fire Aura': 'Aura de fuego',
  'Barbed Hide': 'Piel espinosa',
  Beard: 'Barba',
  Steadfast: 'Inquebrantable',
  'Corrosive Form': 'Forma corrosiva',
  'Deadly Leap': 'Salto mortal',
  Chain: 'Cadena',
  'Animate Chains': 'Animar cadenas',
  'Unnerving Mask': 'Máscara inquietante',
  'Sense Magic': 'Sentir magia',
  Haste: 'Acelerar',
  Moan: 'Gemido',
  Phantasms: 'Fantasmas',
  'Light Sensitivity': 'Sensibilidad a la luz',
  'Shielded Mind': 'Mente protegida',
  Crush: 'Aplastar',
  'Darkness Aura': 'Aura de oscuridad',
  'Two-Headed': 'Bicéfalo',
  'Poisoned Dart': 'Dardo envenenado',
  'Gnome Cunning': 'Astucia gnoma',
  'Create Whirlwind': 'Crear torbellino',
  Ambusher: 'Emboscador',
  'Fetid Cloud': 'Nube fétida',
  'Fey Charm': 'Encanto feérico',
  'Speak with Beasts and Plants': 'Hablar con animales y plantas',
  'Tree Stride': 'Zancada arbórea',
  Enlarge: 'Agrandarse',
  'Duergar Resilience': 'Resiliencia duergar',
  'Blinding Breath': 'Aliento cegador',
  'Withering Touch': 'Toque marchitador',
  Possession: 'Posesión',
  'Blinding Spittle': 'Escupitajo cegador',
  'Aberrant Ground': 'Suelo aberrante',
  Gibbering: 'Farfulleo',
  'Shield Bash': 'Golpe con escudo',
  'Petrifying Breath': 'Aliento petrificante',
  'Sleep Breath': 'Aliento de sueño',
  'Weakening Breath': 'Aliento debilitante',
  'Repulsion Breath': 'Aliento de repulsión',
  'Paralyzing Breath': 'Aliento paralizante',
  'Slowing Breath': 'Aliento ralentizador',
  'Lightning Storm': 'Tormenta de relámpagos',
  'Tail Sweep': 'Barrido de cola',
  Lightning: 'Relámpago',
  'Frost Breath': 'Aliento de escarcha',
  Sword: 'Espada',
  'Heavy Club': 'Garrote pesado',
  Shield: 'Escudo',
  'Tentacle Slam': 'Golpe de tentáculo',
  'Tail Spike': 'Púa de la cola',
  'Snake Hair': 'Cabellera de serpientes',
  Harpoon: 'Arpón',
  Shriek: 'Chillido',
  Scare: 'Asustar',
  'Strength Drain': 'Drenar fuerza',
  Fling: 'Arrojar',
  'Spit Poison': 'Escupir veneno',
  'Wall of Ice': 'Muro de hielo',
  Leadership: 'Liderazgo',
  'Paralyzing Touch': 'Toque paralizante',
  'Frightening Gaze': 'Mirada aterradora',
  'Disrupt Life': 'Perturbar la vida',
  'Blinding Dust': 'Polvo cegador',
  'Death Glare': 'Mirada mortal',
  Smother: 'Asfixiar',
  Tendril: 'Zarcillo',
  Reel: 'Atraer',
  'Tail Stinger': 'Aguijón de la cola',
  'Flying Sword': 'Espada voladora',
  'Slaying Longbow': 'Arco largo asesino',
  'Ethereal Stride': 'Paso etéreo',
};
// «(Boar or Hybrid Form Only)» → «(solo en forma de jabalí o híbrida)».
const FORMWORD = {
  Bear: 'de oso',
  Boar: 'de jabalí',
  Rat: 'de rata',
  Tiger: 'de tigre',
  Wolf: 'de lobo',
  Human: 'humana',
  Hybrid: 'híbrida',
  Vampire: 'de vampiro',
  Bat: 'de murciélago',
  Mist: 'de niebla',
};
// Acciones con recarga o usos: «Fire Breath (Recharge 5–6)» → «Aliento de fuego (Recarga 5–6)».
function action(n) {
  if (ACT[n]) return ACT[n];
  let m = /^(.*?) \((.+)\)$/.exec(n);
  if (m && ACT[m[1]]) return `${ACT[m[1]]} (${paren(m[2])})`;
  if ((m = /^(.*?) \(Costs (\d) Actions\)$/.exec(n)) && ACT[m[1]]) return `${ACT[m[1]]} (cuesta ${m[2]} acciones)`;
  return n;
}
const paren = t =>
  t
    .replace(/^(\w+)(?: or (\w+))? Form Only$/, (m, a, b) =>
      `solo en forma ${[a, b]
        .filter(Boolean)
        .map(w => FORMWORD[w] || w)
        .join(' o ')}`.replace('forma de ', 'forma de '),
    )
    .replace(/^Recharge /, 'Recarga ')
    .replace(/(\d+)\/Day/g, '$1/día')
    .replace(/Recharges after a Short or Long Rest/, 'se recupera tras un descanso corto o largo')
    .replace(/Costs (\d) Actions/, 'cuesta $1 acciones');

const DMG = {
  acid: 'ácido',
  bludgeoning: 'contundente',
  cold: 'frío',
  fire: 'fuego',
  force: 'fuerza',
  lightning: 'relámpago',
  necrotic: 'necrótico',
  piercing: 'perforante',
  poison: 'veneno',
  psychic: 'psíquico',
  radiant: 'radiante',
  slashing: 'cortante',
  thunder: 'trueno',
};
const ABIL = {
  Strength: 'Fuerza',
  Dexterity: 'Destreza',
  Constitution: 'Constitución',
  Intelligence: 'Inteligencia',
  Wisdom: 'Sabiduría',
  Charisma: 'Carisma',
};
const COND = {
  blinded: 'cegado',
  charmed: 'hechizado',
  deafened: 'ensordecido',
  exhaustion: 'agotamiento',
  frightened: 'asustado',
  grappled: 'agarrado',
  incapacitated: 'incapacitado',
  invisible: 'invisible',
  paralyzed: 'paralizado',
  petrified: 'petrificado',
  poisoned: 'envenenado',
  prone: 'derribado',
  restrained: 'restringido',
  stunned: 'aturdido',
  unconscious: 'inconsciente',
};
// «daño perforante» (adjetivo) pero «daño de fuego» (sustantivo).
const NOUN = new Set(['acid', 'cold', 'fire', 'force', 'lightning', 'poison', 'thunder']);
const dmgWord = w => (NOUN.has(w.toLowerCase()) ? 'de ' : '') + (DMG[w.toLowerCase()] || w);
const NUM = { one: 'uno', two: 'dos', three: 'tres', four: 'cuatro', five: 'cinco', six: 'seis' };
const NUMF = { two: 'dos', three: 'tres', four: 'cuatro', five: 'cinco', six: 'seis' };
const cap = w => w.charAt(0).toUpperCase() + w.slice(1);
const weapon = w => (ACT[cap(w)] || ACT[cap(w) + 's'] || w).toLowerCase();
// «one with its bite and two with its claws» → «uno con su mordisco y dos con sus garras».
const attackParts = p =>
  p
    .replace(
      /\b(one|two|three|four|five) with its ([a-z][a-z ]*?)(?=,| and|\.|$)/g,
      (m, n, w) => `${NUM[n]} con ${n === 'one' && !weapon(w).endsWith('s') ? 'su' : 'sus'} ${weapon(w)}`,
    )
    .replace(/, and /g, ' y ')
    .replace(/ and /g, ' y ');
const condWord = w => COND[w] || w;
// Fórmulas de reglas dentro de las descripciones.
function text(t) {
  return String(t || '')
    .replace(
      /^The [\w\s'-]+? can use its Frightful Presence\. It then makes (two|three|four|five|six) attacks: (.+)$/,
      (m, n, p) => `Puede usar su Presencia aterradora. Luego hace ${NUMF[n]} ataques: ${attackParts(p)}`,
    )
    .replace(
      /^The [\w\s'-]+? makes (two|three|four|five|six) (melee |ranged |weapon )?attacks: (.+)$/,
      (m, n, k, p) =>
        `Hace ${NUMF[n]} ataques${k === 'melee ' ? ' cuerpo a cuerpo' : k === 'ranged ' ? ' a distancia' : ''}: ${attackParts(p)}`,
    )
    .replace(
      /^The [\w\s'-]+? makes (two|three|four|five|six) (melee |ranged |weapon )?attacks\.$/,
      (m, n, k) =>
        `Hace ${NUMF[n]} ataques${k === 'melee ' ? ' cuerpo a cuerpo' : k === 'ranged ' ? ' a distancia' : ''}.`,
    )
    .replace(/, and the target must/g, ', y the target must')
    .replace(
      /^The [\w\s'-]+? exhales (fire|frost|cold|acid|lightning|poisonous gas|sleep gas|repulsion energy|paralyzing gas|gas) in an? /,
      (m, w) =>
        `Exhala ${{ fire: 'fuego', frost: 'escarcha', cold: 'frío', acid: 'ácido', lightning: 'relámpagos', 'poisonous gas': 'gas venenoso', 'sleep gas': 'gas somnífero', 'repulsion energy': 'energía de repulsión', 'paralyzing gas': 'gas paralizante', gas: 'gas' }[w]} en un `,
    )
    .replace(/If the target is a creature, it must succeed on a /g, 'Si el objetivo es una criatura, debe superar una ')
    .replace(/[Tt]he target must succeed on a /g, 'el objetivo debe superar una ')
    .replace(/[Tt]he target must make a /g, 'el objetivo debe hacer una ')
    .replace(/Each creature in (that|the) area must make a /g, 'Cada criatura en esa área debe hacer una ')
    .replace(/[Ee]ach creature in (that|the) area must succeed on a /g, 'Cada criatura en esa área debe superar una ')
    .replace(
      /, taking (.+?) on a failed save, or half as much damage on a successful one/g,
      ': si falla recibe $1, y la mitad si la supera',
    )
    .replace(/, taking (.+?) on a failed save/g, ': si falla recibe $1')
    .replace(/ on a failed save\b/g, ' si falla')
    .replace(/ on a successful one\b/g, ' si la supera')
    .replace(
      /\bor be (blinded|charmed|deafened|frightened|grappled|incapacitated|paralyzed|petrified|poisoned|restrained|stunned|knocked prone)\b/g,
      (m, c) => 'o quedar ' + (c === 'knocked prone' ? 'derribado' : condWord(c)),
    )
    .replace(
      /\b(is|becomes) (blinded|charmed|deafened|frightened|grappled|incapacitated|paralyzed|petrified|poisoned|restrained|stunned|unconscious)\b/g,
      (m, v, c) => 'queda ' + condWord(c),
    )
    .replace(/\bThe target queda/g, 'El objetivo queda')
    .replace(/\buntil the end of its next turn\b/g, 'hasta el final de su siguiente turno')
    .replace(/\bfor 1 minute\b/g, 'durante 1 minuto')
    .replace(/\bfor 1 hour\b/g, 'durante 1 hora')
    .replace(/Melee or Ranged Weapon Attack:/g, 'Ataque con arma cuerpo a cuerpo o a distancia:')
    .replace(/Melee Weapon Attack:/g, 'Ataque con arma cuerpo a cuerpo:')
    .replace(/Ranged Weapon Attack:/g, 'Ataque con arma a distancia:')
    .replace(/Melee or Ranged Spell Attack:/g, 'Ataque de conjuro cuerpo a cuerpo o a distancia:')
    .replace(/Melee Spell Attack:/g, 'Ataque de conjuro cuerpo a cuerpo:')
    .replace(/Ranged Spell Attack:/g, 'Ataque de conjuro a distancia:')
    .replace(/([+-]\d+) to hit/g, '$1 al ataque')
    .replace(/reach (\d+) ft\./g, 'alcance $1 pies')
    .replace(/range (\d+)\/(\d+) ft\./g, 'distancia $1/$2 pies')
    .replace(/range (\d+) ft\./g, 'distancia $1 pies')
    .replace(/\bone target\b/g, 'un objetivo')
    .replace(/\bone creature\b/g, 'una criatura')
    .replace(/Hit: /g, 'Impacto: ')
    .replace(/(\d+ \([^)]*\)|\b\d+\b) (\w+) damage/g, (m, n, w) =>
      DMG[w.toLowerCase()] ? `${n} de daño ${dmgWord(w)}` : m,
    )
    .replace(/, plus /g, ', más ')
    .replace(/ plus (\d+ \()/g, ' más $1')
    .replace(/\bin melee\b/g, 'cuerpo a cuerpo')
    .replace(
      /DC (\d+) (Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) saving throw/g,
      (m, dc, a) => `salvación de ${ABIL[a]} CD ${dc}`,
    )
    .replace(
      /(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) saving throw/g,
      (m, a) => `salvación de ${ABIL[a]}`,
    )
    .replace(/half as much damage on a successful one/g, 'la mitad del daño si la supera')
    .replace(/or half as much damage/g, 'o la mitad del daño')
    .replace(/(\d+)[- ]foot[- ]radius/g, 'radio de $1 pies')
    .replace(/(\d+)[- ]foot cone/g, 'cono de $1 pies')
    .replace(/(\d+)[- ]foot line/g, 'línea de $1 pies')
    .replace(/(\d+) feet/g, '$1 pies')
    .replace(/(\d+) ft\./g, '$1 pies')
    .replace(/\bknocked prone\b/g, 'derribado')
    .replace(/\bthe target is grappled \(escape DC (\d+)\)/g, 'el objetivo queda agarrado (escapar CD $1)')
    .replace(/\(escape DC (\d+)\)/g, '(escapar CD $1)')
    .replace(/\bRecharge (\d)/g, 'Recarga $1');
}
const SPEED = t =>
  String(t || '')
    .replace(/(\d+)\s*ft\./g, '$1 pies')
    .replace(/\bfly\b/g, 'vuelo')
    .replace(/\bswim\b/g, 'nado')
    .replace(/\bclimb\b/g, 'trepar')
    .replace(/\bburrow\b/g, 'excavar')
    .replace(/\(hover\)/g, '(flotar)');
const SENSES = t =>
  SPEED(t)
    .replace(/\bdarkvision\b/g, 'visión en la oscuridad')
    .replace(/\bblindsight\b/g, 'vista ciega')
    .replace(/\btremorsense\b/g, 'sentido de la vibración')
    .replace(/\btruesight\b/g, 'visión verdadera')
    .replace(/\(blind beyond this radius\)/g, '(ciego más allá de este radio)')
    .replace(/passive [Pp]erception/g, 'Percepción pasiva');
const SKILL = {
  Acrobatics: 'Acrobacias',
  'Animal Handling': 'Trato con animales',
  Arcana: 'Arcanos',
  Athletics: 'Atletismo',
  Deception: 'Engaño',
  History: 'Historia',
  Insight: 'Perspicacia',
  Intimidation: 'Intimidación',
  Investigation: 'Investigación',
  Medicine: 'Medicina',
  Nature: 'Naturaleza',
  Perception: 'Percepción',
  Performance: 'Interpretación',
  Persuasion: 'Persuasión',
  Religion: 'Religión',
  'Sleight of Hand': 'Juego de manos',
  Stealth: 'Sigilo',
  Survival: 'Supervivencia',
};
const SKILLS = t =>
  String(t || '').replace(/([A-Z][a-z]+(?: [a-z]+ [A-Z][a-z]+| [A-Z][a-z]+)?)(?= [+-]\d)/g, m => SKILL[m] || m);
const SAVES_ES = { STR: 'FUE', DEX: 'DES', CON: 'CON', INT: 'INT', WIS: 'SAB', CHA: 'CAR' };
const SAVES = t => String(t || '').replace(/\b(STR|DEX|CON|INT|WIS|CHA)\b/g, m => SAVES_ES[m]);
const LANG = {
  Common: 'Común',
  Draconic: 'Dracónico',
  Elvish: 'Élfico',
  Dwarvish: 'Enano',
  Giant: 'Gigante',
  Gnomish: 'Gnomo',
  Goblin: 'Goblin',
  Halfling: 'Mediano',
  Orc: 'Orco',
  Abyssal: 'Abisal',
  Celestial: 'Celestial',
  'Deep Speech': 'Habla profunda',
  Infernal: 'Infernal',
  Primordial: 'Primordial',
  Sylvan: 'Silvano',
  Undercommon: 'Infracomún',
  Auran: 'Aurano',
  Aquan: 'Acuano',
  Ignan: 'Ignano',
  Terran: 'Terrano',
  telepathy: 'telepatía',
  'all languages': 'todos los idiomas',
  'any one language (usually Common)': 'un idioma cualquiera (normalmente Común)',
  understands: 'entiende',
  "but can't speak": 'pero no puede hablar',
  'any two languages': 'dos idiomas cualesquiera',
  'any four languages': 'cuatro idiomas cualesquiera',
  'any six languages': 'seis idiomas cualesquiera',
  'plus up to five other languages': 'y hasta cinco idiomas más',
  'plus up to six other languages': 'y hasta seis idiomas más',
  'the languages it knew in life': 'los idiomas que conocía en vida',
  'the languages of its creator': 'los idiomas de su creador',
  'but speaks only through the use of its Mimicry trait': 'pero solo habla con su rasgo Imitación',
  "but can't speak, telepathy": 'pero no puede hablar, telepatía',
};
const LANGS = t => {
  let out = SPEED(t);
  for (const [en, es] of Object.entries(LANG).sort((a, b) => b[0].length - a[0].length))
    out = out.replace(new RegExp('\\b' + en.replace(/[()]/g, '\\$&') + '\\b', 'g'), es);
  return out;
};
const DEFS = t =>
  String(t || '')
    .replace(
      /\b(acid|bludgeoning|cold|fire|force|lightning|necrotic|piercing|poison|psychic|radiant|slashing|thunder)\b/g,
      m => DMG[m],
    )
    .replace(/from nonmagical attacks that aren't (\w+)ed/g, 'de ataques no mágicos que no sean de $1')
    .replace(/from nonmagical attacks/g, 'de ataques no mágicos')
    .replace(/from nonmagical weapons/g, 'de armas no mágicas')
    .replace(/that aren't silvered/g, 'que no sean de plata')
    .replace(/that aren't adamantine/g, 'que no sean de adamantina')
    .replace(/\bdamage from spells\b/g, 'daño de conjuros')
    .replace(/from magic weapons/g, 'de armas mágicas')
    .replace(/\band\b/g, 'y');
const CONDS = t =>
  String(t || '').replace(/\b[A-Za-z]+\b/g, w => (COND[w.toLowerCase()] ? cap(COND[w.toLowerCase()]) : w));
const ALIGN = t =>
  String(t || '')
    .replace(/^unaligned$/, 'sin alineamiento')
    .replace(/^any alignment$/, 'cualquier alineamiento')
    .replace(/^any non-good alignment$/, 'cualquier alineamiento no bueno')
    .replace(/^any non-lawful alignment$/, 'cualquier alineamiento no legal')
    .replace(/^any chaotic alignment$/, 'cualquier alineamiento caótico')
    .replace(/^any evil alignment$/, 'cualquier alineamiento malvado')
    .replace(/lawful/, 'legal')
    .replace(/chaotic/, 'caótico')
    .replace(/neutral good/, 'neutral bueno')
    .replace(/neutral evil/, 'neutral malvado')
    .replace(/\bgood\b/, 'bueno')
    .replace(/\bevil\b/, 'malvado');

// Rasgos frecuentes, oración por oración («The wolf has advantage…» → «Tiene ventaja…»).
// Se aplican después de text(), así que las distancias ya dicen «pies».
const S = "[A-Za-z][\\w'’-]*(?: [A-Za-z][\\w'’-]*){0,3}";
const SENSE = {
  sight: 'de la vista',
  hearing: 'del oído',
  smell: 'del olfato',
  'hearing or smell': 'del oído o del olfato',
  'sight or smell': 'de la vista o del olfato',
  'hearing and smell': 'del oído y del olfato',
  'sight or hearing': 'de la vista o del oído',
};
const SIZE = { Tiny: 'diminuta', Small: 'pequeña', Medium: 'mediana', Large: 'grande' };
const TRAITS = [
  [
    new RegExp(`If the ${S} fails a saving throw, it can choose to succeed instead\\.`, 'g'),
    'Si falla una tirada de salvación, puede elegir superarla.',
  ],
  [new RegExp(`The ${S} can breathe air and water\\.`, 'g'), 'Puede respirar aire y agua.'],
  [new RegExp(`The ${S} can breathe only underwater\\.`, 'g'), 'Solo puede respirar bajo el agua.'],
  [
    new RegExp(`The ${S} has advantage on saving throws against spells and other magical effects\\.`, 'g'),
    'Tiene ventaja en las tiradas de salvación contra conjuros y otros efectos mágicos.',
  ],
  [
    new RegExp(`Magical darkness doesn't impede the ${S}'s darkvision\\.`, 'g'),
    'La oscuridad mágica no le impide ver con su visión en la oscuridad.',
  ],
  [new RegExp(`The ${S}'s weapon attacks are magical\\.`, 'g'), 'Sus ataques con arma son mágicos.'],
  [
    new RegExp(`The ${S} is immune to any spell or effect that would alter its form\\.`, 'g'),
    'Es inmune a cualquier conjuro o efecto que altere su forma.',
  ],
  [
    new RegExp(
      `The ${S} can climb difficult surfaces, including upside down on ceilings, without needing to make an ability check\\.`,
      'g',
    ),
    'Puede trepar superficies difíciles, incluso cabeza abajo por el techo, sin hacer una prueba de característica.',
  ],
  [
    new RegExp(`The ${S} ignores movement restrictions caused by webbing\\.`, 'g'),
    'Ignora las restricciones de movimiento causadas por telarañas.',
  ],
  [
    new RegExp(
      `While in contact with a web, the ${S} knows the exact location of any other creature in contact with the same web\\.`,
      'g',
    ),
    'Mientras toca una telaraña, sabe dónde está exactamente cualquier otra criatura que toque la misma telaraña.',
  ],
  [
    new RegExp(
      `The ${S} has advantage on Wisdom \\(Perception\\) checks that rely on (sight or hearing|hearing or smell|sight or smell|hearing and smell|sight|hearing|smell)\\.`,
      'g',
    ),
    (m, sense) => `Tiene ventaja en las pruebas de Sabiduría (Percepción) que dependen ${SENSE[sense]}.`,
  ],
  [
    new RegExp(
      `The ${S} has advantage on an attack roll against a creature if at least one of the ${S}'s allies is within (\\d+) pies of the creature and the ally isn't incapacitated\\.`,
      'g',
    ),
    (m, d) =>
      `Tiene ventaja en una tirada de ataque contra una criatura si al menos un aliado suyo está a ${d} pies o menos de ella y ese aliado no está incapacitado.`,
  ],
  [
    /The swarm can occupy another creature's space and vice versa, and the swarm can move through any opening large enough for an? (Tiny|Small|Medium|Large) [\w ]+?\. The swarm can't regain hit points or gain temporary hit points\./g,
    (m, size) =>
      `El enjambre puede ocupar el espacio de otra criatura y viceversa, y puede pasar por cualquier abertura lo bastante grande para una criatura ${SIZE[size]}. No puede recuperar puntos de golpe ni obtener puntos de golpe temporales.`,
  ],
  [
    new RegExp(
      `If the ${S} takes (\\d+) damage or less that would reduce it to 0 hit points, it is reduced to 1 hit point instead\\.`,
      'g',
    ),
    (m, n) => `Si recibe ${n} de daño o menos que lo dejaría a 0 puntos de golpe, queda con 1 punto de golpe.`,
  ],
  [
    new RegExp(
      `If damage reduces the ${S} to 0 hit points, it must make a salvación de Constitución with a DC of 5 ?\\+ ?the damage taken, unless the damage is radiant or from a critical hit\\. On a success, the ${S} drops to 1 hit point instead\\.`,
      'g',
    ),
    'Si el daño lo deja a 0 puntos de golpe, hace una salvación de Constitución con CD 5 + el daño recibido, salvo que el daño sea radiante o de un crítico. Si la supera, queda con 1 punto de golpe.',
  ],
  [
    new RegExp(
      `While in sunlight, the ${S} has disadvantage on attack rolls, as well as on Wisdom \\(Perception\\) checks that rely on sight\\.`,
      'g',
    ),
    'Bajo la luz del sol tiene desventaja en las tiradas de ataque y en las pruebas de Sabiduría (Percepción) que dependen de la vista.',
  ],
  [
    new RegExp(`The ${S} can hold its breath for (\\d+) (minutes|hour|hours)\\.`, 'g'),
    (m, n, u) =>
      `Puede contener la respiración durante ${n} ${u === 'minutes' ? 'minutos' : u === 'hour' ? 'hora' : 'horas'}.`,
  ],
  [
    new RegExp(`The ${S} can't use its blindsight while deafened\\.`, 'g'),
    'No puede usar su vista ciega mientras está ensordecido.',
  ],
  [
    new RegExp(`The ${S} doesn't provoke opportunity attacks when it flies out of an enemy's reach\\.`, 'g'),
    'No provoca ataques de oportunidad cuando sale volando del alcance de un enemigo.',
  ],
  [
    new RegExp(`The ${S} has advantage on attack rolls against any creature it has surprised\\.`, 'g'),
    'Tiene ventaja en las tiradas de ataque contra cualquier criatura a la que haya sorprendido.',
  ],
  [
    new RegExp(`The ${S} can take the Disengage or Hide action as a bonus action on each of its turns\\.`, 'g'),
    'Puede Destrabarse o Esconderse como acción adicional en cada uno de sus turnos.',
  ],
  [
    new RegExp(
      `The ${S} has advantage on saving throws against being charmed, and magic can't put the ${S} to sleep\\.`,
      'g',
    ),
    'Tiene ventaja en las salvaciones contra ser hechizado, y la magia no puede dormirlo.',
  ],
  [
    new RegExp(`The ${S} has advantage on saving throws against being frightened\\.`, 'g'),
    'Tiene ventaja en las salvaciones contra ser asustado.',
  ],
  [
    new RegExp(`Its statistics, other than its AC, are the same in each form\\.`, 'g'),
    'Sus estadísticas, salvo la CA, son las mismas en cada forma.',
  ],
  [
    new RegExp(`Its statistics, other than its size and AC, are the same in each form\\.`, 'g'),
    'Sus estadísticas, salvo el tamaño y la CA, son las mismas en cada forma.',
  ],
  [
    /Any equipment it is wearing or carrying isn't transformed\./g,
    'El equipo que lleva puesto o carga no se transforma.',
  ],
  [/It reverts to its true form if it dies\./g, 'Si muere, vuelve a su forma verdadera.'],
  [new RegExp(`The ${S} can use its action to polymorph into `, 'g'), 'Puede usar su acción para transformarse en '],
  [
    new RegExp(`The ${S} deals double damage to objects and structures\\.`, 'g'),
    'Hace el doble de daño a objetos y estructuras.',
  ],
  [
    new RegExp(`The ${S} regains (\\d+) hit points at the start of its turn\\.`, 'g'),
    (m, n) => `Recupera ${n} puntos de golpe al comienzo de su turno.`,
  ],
  [
    new RegExp(`While the ${S} remains motionless, it is indistinguishable from `, 'g'),
    'Mientras permanece inmóvil, no se distingue de ',
  ],
];
const trait = t => TRAITS.reduce((out, [re, to]) => out.replace(re, to), t);

function translate(m) {
  if (m.english) return m; // ya traducido
  const actions = list => (list || []).map(a => ({ ...a, english: a.n, n: action(a.n), d: text(a.d) }));
  return {
    ...m,
    english: m.name,
    name: name(m.name),
    align: ALIGN(m.align),
    speed: SPEED(m.speed),
    senses: SENSES(m.senses),
    skills: SKILLS(m.skills),
    saves: SAVES(m.saves),
    lang: LANGS(m.lang),
    vuln: DEFS(m.vuln),
    res: DEFS(m.res),
    imm: DEFS(m.imm),
    cimm: CONDS(m.cimm),
    traits: (m.traits || []).map(([n, d]) => [action(n), trait(text(d))]),
    actions: actions(m.actions),
    legendary: actions(m.legendary),
    reactions: actions(m.reactions),
  };
}

if (require.main === module) {
  const fs = require('fs'),
    path = require('path'),
    vm = require('vm');
  const file = path.join(__dirname, '..', 'monsters-data.js');
  const ctx = {};
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), { window: ctx });
  const list = ctx.MonsterData.map(translate);
  const first = fs.readFileSync(file, 'utf8').split('\n')[0],
    head = /^(\/\/|\/\*)/.test(first) ? first + '\n' : '';
  fs.writeFileSync(
    file,
    head +
      '(function(r){r.MonsterData=' +
      JSON.stringify(list) +
      ';})(typeof window!=="undefined"?window:globalThis);\n',
  );
  const left = list.filter(x => x.name === x.english && !/^[A-Z][a-z]+$/.test(x.name));
  console.log('monstruos:', list.length, '· sin traducir:', left.map(x => x.name).join(', ') || 'ninguno');
}
module.exports = { translate, name, action, text };
