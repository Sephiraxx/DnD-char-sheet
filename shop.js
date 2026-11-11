/* Precios y tesoro para el DM.
   Shop: lista de precios del equipo (en piezas de oro) y precio orientativo de objetos mágicos por rareza.
   Treasure: monedas por valor de desafío según las tablas de la Guía del Dungeon Master; las gemas, obras de arte
   y objetos mágicos salen de una tabla propia y simplificada, con objetos del catálogo de la app. */
(function (root) {
  'use strict';
  // Precio en po de cada objeto de equipment-data.js (0,01 = 1 pc; 0,1 = 1 pp).
  const PRICES = {
    club: 0.1,
    dagger: 2,
    greatclub: 0.2,
    handaxe: 5,
    javelin: 0.5,
    'light-hammer': 2,
    mace: 5,
    quarterstaff: 0.2,
    sickle: 1,
    spear: 1,
    'crossbow-light': 25,
    dart: 0.05,
    shortbow: 25,
    sling: 0.1,
    battleaxe: 10,
    flail: 10,
    glaive: 20,
    greataxe: 30,
    greatsword: 50,
    halberd: 20,
    lance: 10,
    longsword: 15,
    maul: 10,
    morningstar: 15,
    pike: 5,
    rapier: 25,
    scimitar: 25,
    shortsword: 10,
    trident: 5,
    'war-pick': 5,
    warhammer: 15,
    whip: 2,
    blowgun: 10,
    'crossbow-hand': 75,
    'crossbow-heavy': 50,
    longbow: 50,
    net: 1,
    'padded-armor': 5,
    'leather-armor': 10,
    'studded-leather-armor': 45,
    'hide-armor': 10,
    'chain-shirt': 50,
    'scale-mail': 50,
    breastplate: 400,
    'half-plate-armor': 750,
    'ring-mail': 30,
    'chain-mail': 75,
    'splint-armor': 200,
    'plate-armor': 1500,
    shield: 10,
    'wooden-shield': 10,
    abacus: 2,
    'acid-vial': 25,
    arrow: 0.05,
    'crossbow-bolt': 0.05,
    amulet: 5,
    crystal: 10,
    orb: 20,
    rod: 10,
    staff: 5,
    wand: 10,
    backpack: 2,
    'ball-bearings-bag-of-1000': 1,
    bedroll: 1,
    bell: 1,
    blanket: 0.5,
    'block-and-tackle': 1,
    book: 25,
    candle: 0.01,
    'case-map-or-scroll': 1,
    chest: 5,
    'clothes-common': 0.5,
    'clothes-costume': 5,
    'clothes-fine': 15,
    'clothes-travelers': 2,
    'component-pouch': 25,
    crowbar: 2,
    'sprig-of-mistletoe': 1,
    totem: 1,
    'wooden-staff': 5,
    'yew-wand': 10,
    emblem: 5,
    hammer: 1,
    'hunting-trap': 5,
    'ink-1-ounce-bottle': 10,
    'ink-pen': 0.02,
    'disguise-kit': 25,
    'herbalism-kit': 5,
    'healers-kit': 5,
    'mess-kit': 0.2,
    'poisoners-kit': 50,
    lamp: 0.5,
    'lantern-hooded': 5,
    manacles: 2,
    'oil-flask': 0.1,
    'paper-one-sheet': 0.2,
    'parchment-one-sheet': 0.1,
    'perfume-vial': 5,
    piton: 0.05,
    'pot-iron': 2,
    pouch: 0.5,
    quiver: 1,
    'rations-1-day': 0.5,
    reliquary: 5,
    robes: 1,
    'rope-hempen-50-feet': 1,
    'rope-silk-50-feet': 10,
    'sealing-wax': 0.5,
    shovel: 2,
    'signet-ring': 5,
    soap: 0.02,
    spellbook: 50,
    tinderbox: 0.5,
    torch: 0.01,
    waterskin: 0.2,
    'alchemists-supplies': 50,
    'brewers-supplies': 20,
    'calligraphers-supplies': 10,
    'carpenters-tools': 8,
    'cartographers-tools': 15,
    'cobblers-tools': 5,
    'cooks-utensils': 1,
    'glassblowers-tools': 30,
    'jewelers-tools': 25,
    'leatherworkers-tools': 5,
    'masons-tools': 10,
    'painters-supplies': 10,
    'potters-tools': 10,
    'smiths-tools': 20,
    'tinkers-tools': 50,
    'weavers-tools': 1,
    'woodcarvers-tools': 1,
    'dice-set': 0.1,
    'playing-card-set': 0.5,
    bagpipes: 30,
    drum: 6,
    dulcimer: 25,
    flute: 2,
    lute: 35,
    lyre: 30,
    horn: 3,
    'pan-flute': 12,
    shawm: 2,
    viol: 30,
    'navigators-tools': 25,
    'thieves-tools': 25,
    'holy-symbol': 5,
    'burglars-pack': 16,
    'diplomats-pack': 39,
    'dungeoneers-pack': 12,
    'entertainers-pack': 40,
    'explorers-pack': 10,
    'priests-pack': 19,
    'scholars-pack': 40,
    mule: 8,
    cart: 15,
  };
  // Lo que se compra seguido y no es un objeto de la ficha: [nombre, po, categoría].
  const SERVICES = [
    ['Poción de curación', 50, 'Alquimia'],
    ['Antitoxina (vial)', 50, 'Alquimia'],
    ['Agua bendita (frasco)', 25, 'Alquimia'],
    ['Fuego de alquimista (frasco)', 50, 'Alquimia'],
    ['Veneno básico (vial)', 100, 'Alquimia'],
    ['Posada modesta (por día)', 0.5, 'Servicios'],
    ['Posada cómoda (por día)', 0.8, 'Servicios'],
    ['Posada lujosa (por día)', 2, 'Servicios'],
    ['Comida modesta (por día)', 0.3, 'Servicios'],
    ['Jarra de cerveza', 0.04, 'Servicios'],
    ['Establo (por día)', 0.5, 'Servicios'],
    ['Mensajero (por milla)', 0.02, 'Servicios'],
    ['Pasaje en barco (por milla)', 0.1, 'Servicios'],
    ['Carruaje entre ciudades (por milla)', 0.03, 'Servicios'],
    ['Mercenario sin oficio (por día)', 0.2, 'Servicios'],
    ['Mercenario con oficio (por día)', 2, 'Servicios'],
    ['Caballo de monta', 75, 'Monturas'],
    ['Caballo de guerra', 400, 'Monturas'],
    ['Caballo de tiro', 50, 'Monturas'],
    ['Poni', 30, 'Monturas'],
    ['Mastín', 25, 'Monturas'],
    ['Camello', 50, 'Monturas'],
    ['Elefante', 200, 'Monturas'],
    ['Silla de montar', 10, 'Monturas'],
    ['Alforjas', 4, 'Monturas'],
    ['Carro', 35, 'Monturas'],
    ['Carruaje', 100, 'Monturas'],
    ['Bote de remos', 50, 'Monturas'],
  ];
  // Rango de precio orientativo por rareza (po).
  const MAGIC = {
    común: [50, 100],
    infrecuente: [101, 500],
    'poco común': [101, 500],
    raro: [501, 5000],
    'muy raro': [5001, 50000],
    legendario: [50001, 200000],
  };
  // 12,5 po → { gp: 12, sp: 5 }
  function coins(gp) {
    const cp = Math.round(gp * 100);
    return { gp: Math.floor(cp / 100), sp: Math.floor((cp % 100) / 10), cp: cp % 10 };
  }
  function text(gp) {
    const c = coins(gp);
    return (
      [c.gp && c.gp.toLocaleString('es-AR') + ' po', c.sp && c.sp + ' pp', c.cp && c.cp + ' pc']
        .filter(Boolean)
        .join(' ') || 'gratis'
    );
  }
  function magicPrice(item) {
    const r = MAGIC[item?.rarity];
    return r ? { min: r[0], max: r[1], suggested: Number(Math.sqrt(r[0] * r[1]).toPrecision(2)) } : null;
  }
  // Catálogo de la tienda: equipo con precio, servicios y objetos mágicos con rango.
  function catalog() {
    const out = [];
    for (const it of Object.values(root.EquipmentData?.items || {}))
      if (PRICES[it.id] !== undefined)
        out.push({
          ref: 'gear:' + it.id,
          name: it.name,
          category: it.category,
          gp: PRICES[it.id],
          weight: it.weight ?? null,
        });
    for (const [name, gp, category] of SERVICES) out.push({ ref: '', name, category, gp });
    for (const it of root.MagicItems?.ITEMS || []) {
      const p = magicPrice(it);
      if (p)
        out.push({
          ref: 'magic:' + it.id,
          name: it.name,
          category: 'Mágico · ' + it.rarity,
          gp: p.suggested,
          range: p,
        });
    }
    return out;
  }
  const norm = t =>
    String(t || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase();
  function search(q, limit = 40) {
    const n = norm(q).trim();
    return catalog()
      .filter(x => !n || norm(x.name + ' ' + x.category).includes(n))
      .slice(0, limit);
  }
  root.Shop = { PRICES, SERVICES, MAGIC, coins, text, magicPrice, catalog, search };

  // ---------- Tesoro ----------
  const TIERS = [
    { id: '0-4', label: 'VD 0 a 4', max: 4 },
    { id: '5-10', label: 'VD 5 a 10', max: 10 },
    { id: '11-16', label: 'VD 11 a 16', max: 16 },
    { id: '17+', label: 'VD 17 o más', max: 99 },
  ];
  // Monedas individuales: [hasta d100, { moneda: [dados, multiplicador] }]
  const INDIVIDUAL = {
    '0-4': [
      [30, { cp: [5, 1] }],
      [60, { sp: [4, 1] }],
      [70, { ep: [3, 1] }],
      [95, { gp: [3, 1] }],
      [100, { pp: [1, 1] }],
    ],
    '5-10': [
      [30, { cp: [4, 100], ep: [1, 10] }],
      [60, { sp: [6, 10], gp: [2, 10] }],
      [70, { ep: [3, 10], gp: [2, 10] }],
      [95, { gp: [4, 10] }],
      [100, { gp: [2, 10], pp: [3, 1] }],
    ],
    '11-16': [
      [20, { sp: [4, 100], gp: [1, 100] }],
      [35, { ep: [1, 100], gp: [1, 100] }],
      [75, { gp: [2, 100], pp: [1, 10] }],
      [100, { gp: [2, 100], pp: [2, 10] }],
    ],
    '17+': [
      [15, { ep: [2, 1000], gp: [8, 100] }],
      [55, { gp: [1, 1000], pp: [1, 100] }],
      [100, { gp: [1, 1000], pp: [2, 100] }],
    ],
  };
  const HOARD = {
    '0-4': { cp: [6, 100], sp: [3, 100], gp: [2, 10] },
    '5-10': { cp: [2, 100], sp: [2, 1000], gp: [6, 100], pp: [3, 10] },
    '11-16': { gp: [4, 1000], pp: [5, 100] },
    '17+': { gp: [12, 1000], pp: [8, 1000] },
  };
  // Tabla propia: valores de gemas y arte, y cuántos objetos mágicos de qué rareza (pesos).
  const EXTRAS = {
    '0-4': {
      valuables: [
        ['gema', 10],
        ['arte', 25],
        ['gema', 50],
      ],
      count: [2, 6],
      magic: [0, 0, 1, 1, 2],
      rarity: { común: 5, infrecuente: 4, raro: 1 },
    },
    '5-10': {
      valuables: [
        ['arte', 25],
        ['gema', 50],
        ['gema', 100],
        ['arte', 250],
      ],
      count: [2, 6],
      magic: [0, 1, 1, 2, 3],
      rarity: { común: 2, infrecuente: 5, raro: 3 },
    },
    '11-16': {
      valuables: [
        ['arte', 250],
        ['gema', 500],
        ['arte', 750],
        ['gema', 1000],
      ],
      count: [1, 6],
      magic: [1, 1, 2, 3, 4],
      rarity: { infrecuente: 3, raro: 5, 'muy raro': 2 },
    },
    '17+': {
      valuables: [
        ['gema', 1000],
        ['arte', 2500],
        ['gema', 5000],
        ['arte', 7500],
      ],
      count: [1, 8],
      magic: [1, 2, 3, 4, 5],
      rarity: { raro: 3, 'muy raro': 5, legendario: 2 },
    },
  };
  const GEMS = [
    'ágata',
    'cuarzo',
    'turquesa',
    'ónice',
    'jaspe',
    'amatista',
    'granate',
    'perla',
    'topacio',
    'zafiro',
    'esmeralda',
    'ópalo',
    'rubí',
    'diamante',
  ];
  const ART = [
    'estatuilla tallada',
    'cáliz de plata',
    'brazalete de oro',
    'tapiz bordado',
    'espejo con marco labrado',
    'anillo con sello',
    'collar de cuentas',
    'máscara ceremonial',
    'cofre taraceado',
    'corona pequeña',
  ];
  const random = () => {
    const a = new Uint32Array(1);
    (root.crypto || require('crypto').webcrypto).getRandomValues(a);
    return a[0] / 4294967296;
  };
  const die = (sides, rng) => 1 + Math.floor(rng() * sides);
  const dice = (n, sides, rng) => Array.from({ length: n }, () => die(sides, rng)).reduce((a, b) => a + b, 0);
  const tierOf = cr => TIERS.find(t => cr <= t.max) || TIERS.at(-1);
  function rollCoins(spec, rng) {
    const out = {};
    for (const [k, [n, mult]] of Object.entries(spec)) out[k] = dice(n, 6, rng) * mult;
    return out;
  }
  function weighted(weights, rng) {
    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    let x = rng() * total;
    for (const [k, w] of Object.entries(weights)) if ((x -= w) < 0) return k;
    return Object.keys(weights)[0];
  }
  // Tesoro individual: lo que lleva encima una criatura (multiplicable por la cantidad).
  function individual(tier, count = 1, rng = random) {
    const total = {};
    for (let i = 0; i < count; i++) {
      const d = die(100, rng),
        row = INDIVIDUAL[tier].find(r => d <= r[0])[1];
      for (const [k, v] of Object.entries(rollCoins(row, rng))) total[k] = (total[k] || 0) + v;
    }
    return { kind: 'individual', tier, coins: total, valuables: [], items: [] };
  }
  // Tesoro de guarida: monedas de la Guía más gemas, arte y objetos mágicos del catálogo.
  function hoard(tier, rng = random) {
    const x = EXTRAS[tier],
      out = { kind: 'hoard', tier, coins: rollCoins(HOARD[tier], rng), valuables: [], items: [] };
    if (rng() < 0.75) {
      const [type, value] = x.valuables[Math.floor(rng() * x.valuables.length)],
        qty = x.count[0] + Math.floor(rng() * (x.count[1] - x.count[0] + 1)),
        names = type === 'gema' ? GEMS : ART;
      out.valuables.push({ type, value, qty, name: names[Math.floor(rng() * names.length)] });
    }
    const n = x.magic[Math.floor(rng() * x.magic.length)],
      pool = (root.MagicItems?.ITEMS || []).filter(
        it => !it.sourceKey || root.OfficialContent?.selectableSource?.(it.sourceKey) !== false,
      );
    for (let i = 0; i < n; i++) {
      const rarity = weighted(x.rarity, rng),
        list = pool.filter(it => it.rarity === rarity || (rarity === 'infrecuente' && it.rarity === 'poco común'));
      if (!list.length) continue;
      const it = list[Math.floor(rng() * list.length)];
      if (!out.items.some(y => y.id === it.id))
        out.items.push({ id: it.id, name: it.name, rarity: it.rarity, attune: !!it.attune });
    }
    return out;
  }
  // Valor total en po (sin objetos mágicos).
  function value(t) {
    const c = t.coins,
      coinsGp = (c.cp || 0) / 100 + (c.sp || 0) / 10 + (c.ep || 0) / 2 + (c.gp || 0) + (c.pp || 0) * 10;
    return Math.round(coinsGp + t.valuables.reduce((a, v) => a + v.value * v.qty, 0));
  }
  root.Treasure = { TIERS, tierOf, individual, hoard, value };
})(typeof window !== 'undefined' ? window : globalThis);
