/* Emblemas dibujados para las fichas del tablero: uno por clase y uno por tipo de criatura.
   Son trazos sobre una grilla de 24 × 24 (los mismos de theme.css, que los usa como máscaras).
   Sigils.draw(ctx, id, cx, cy, size, color) los pinta en un lienzo. */
(function (root) {
  'use strict';
  const circle = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0`;
  const swords = 'M4.5 4.5 15 15M19.5 4.5 9 15M13 17l4-4M7 13l4 4M5 19l3-3M19 19l-3-3';
  const PATHS = {
    // ---- Clases ----
    wizard:
      'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM18.5 15l.8 1.7 1.7.8-1.7.8-.8 1.7-.8-1.7-1.7-.8 1.7-.8z',
    fighter: swords,
    barbarian: 'M7 21 16 6M13 4c4-1 7 1 8 5-3 0-5 1-6 3z',
    bard: 'M9 17.5a2.5 2.5 0 1 1-2.5-2.5H9V5l10-2v11.5a2.5 2.5 0 1 1-2.5-2.5H19M9 9l10-2',
    cleric:
      circle(12, 12, 4) +
      'M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1',
    druid: 'M5 19c0-9 5-14 14-14 0 9-5 14-14 14zM5 19 14 10M9 15h4M11 13V9',
    monk: 'M19 12a7 7 0 1 1-3-5.7' + circle(12, 12, 1.6),
    paladin: 'M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6zM12 8v8M9 11h6',
    ranger: 'M7 3c9 3 12 9 10 18M7 3l10 18M3 15l18-6M21 9l-4-.5M21 9l-2.5 3.5',
    rogue: 'M12 2l2.5 9h-5zM8 12h8M12 12v7M10.5 21h3',
    sorcerer: 'M12 3c1 4 6 6 6 11a6 6 0 0 1-12 0c0-2 1-3.5 2-4.5.3 2 1.2 3 2.5 3.2C10 9 10.5 6 12 3z',
    warlock: 'M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6zM12 9v6',
    artificer:
      circle(12, 12, 3.2) +
      circle(12, 12, 6.2) +
      'M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.2 2.2M16.2 16.2l2.2 2.2M5.6 18.4l2.2-2.2M16.2 7.8l2.2-2.2',
    // ---- Tipos de criatura ----
    beast:
      circle(7, 9.5, 1.7) +
      circle(11, 6.5, 1.7) +
      circle(15.5, 7.5, 1.7) +
      circle(18, 11.5, 1.6) +
      'M8 17c0-3 2.5-5.5 5-5.5s4.5 2 4.5 4.5-2 4-4.5 4S8 19.5 8 17z',
    undead:
      'M5.5 11a6.5 6.5 0 0 1 13 0c0 2.3-1 3.8-2.5 4.8V19h-8v-3.2C6.5 14.8 5.5 13.3 5.5 11zM10 19v-2M12 19v-2M14 19v-2' +
      circle(9.5, 11, 1.4) +
      circle(14.5, 11, 1.4),
    dragon: 'M3 18c2-6 6-9 11-9l-2-4 5 3 4-2-1 5c1 2 1 4 0 6-2-2-4-2-6-1-3 1-6 1-11 2zM14 12l1 0',
    humanoid: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 21a7.5 7.5 0 0 1 15 0',
    fiend:
      'M6 4c0 3 1 5 3 6M18 4c0 3-1 5-3 6M6.5 13a5.5 5.5 0 0 1 11 0c0 4-2.5 7-5.5 7s-5.5-3-5.5-7zM10 16l2 1.5 2-1.5',
    celestial:
      'M12 7.5a3 1.2 0 1 0 0-.1M12 10v10M12 12c-3-2-6-2-9-1 2 1 3 3 3.5 5 2-1 4-1 5.5 0M12 12c3-2 6-2 9-1-2 1-3 3-3.5 5-2-1-4-1-5.5 0',
    construct: 'M7 9h10v10H7zM9 9V6h6v3M10 13h1M13 13h1M10 16h4M4 12v4M20 12v4M7 13H4M17 13h3',
    elemental: 'M12 3c5 3 7 7 5 11-1.5 3-5 4-8 2.5-2.5-1.3-3-4.5-1-6.5 1.5-1.5 4-1 4.5 1 .4 1.5-1 2.5-2 2',
    fey: 'M12 12c-2-5-6-7-9-6 0 4 3 6 9 6zM12 12c2-5 6-7 9-6 0 4-3 6-9 6zM12 12c-2 2-5 3-7 6 3 1 6-1 7-6zM12 12c2 2 5 3 7 6-3 1-6-1-7-6zM12 8v11',
    giant: 'M6 20l9-9M13 5c3-2 7 0 7 4s-3 6-6 5c-2-.6-3-2.5-3-4.5S11.5 6 13 5z',
    monstrosity: 'M6 4l3 16M11 3l2 18M16 4l1 16M5 9l14-1M5 15l14 1',
    ooze: 'M4 17c0-3 2-4 3-7s2-6 5-6 4 3 5 6 3 4 3 7-4 3-8 3-8 0-8-3zM9 13v1M14 12v1',
    plant: 'M12 21V9M12 9c-4 0-6-2-6-6 4 0 6 2 6 6zM12 13c4 0 6-2 6-6-4 0-6 2-6 6zM12 17c-3 0-5-1.5-5-4 3 0 5 1.5 5 4z',
    aberration:
      'M4 10s3-4 8-4 8 4 8 4-3 4-8 4-8-4-8-4z' + circle(12, 10, 1.8) + 'M7 15c-1 2-1 4 0 6M12 16v5M17 15c1 2 1 4 0 6',
  };
  // Tipo de criatura según el nombre (castellano o inglés); si nada coincide, garras.
  const NAMES = [
    ['dragon', /drag[oó]n|draco|guiverno|wyvern|wyrm|sierpe/i],
    [
      'undead',
      /esqueleto|zombi|espectro|fantasma|vampir|lich|momia|necr[oó]fago|ghoul|ghast|skeleton|wight|wraith|ghost|mummy|sombra|tumulario|banshee|muerto/i,
    ],
    [
      'beast',
      /lobo|\boso\b|ara[ñn]a|rata|serpiente|tigre|le[oó]n|[aá]guila|jabal[ií]|caballo|perro|gato|murci[eé]lago|cocodrilo|tibur[oó]n|pantera|mast[ií]n|cuervo|wolf|bear|spider|\brat\b|snake|boar|bat\b|hawk|panther|lizard\b|lagarto/i,
    ],
    [
      'fiend',
      /demonio|diablo|diablillo|\bimp\b|balor|s[uú]cubo|[ií]ncubo|quasit|fiend|devil|demon|sabueso infernal|hell/i,
    ],
    ['celestial', /[aá]ngel|celestial|deva|planetar|solar|unicornio|pegaso|couatl/i],
    [
      'construct',
      /g[oó]lem|constructo|animad|aut[oó]mata|homúnculo|homunculo|armadura animada|espada voladora|construct|guardián escudo/i,
    ],
    ['elemental', /elemental|mephit|mefit|genio|djinn|efreet|ifrit|salamandra|azer|gárgola|gargola/i],
    ['fey', /hada|duende|s[aá]tiro|dr[ií]ada|pixie|sprite|fe[eé]rico|blink|arp[ií]a verde|saga\b|hag\b/i],
    ['giant', /gigante|ogro|trol|troll|c[ií]clope|ettin|giant|ogre/i],
    ['ooze', /cieno|gelatinos|limo|pud[ií]n|ooze|jalea|cubo gelatinoso|moho/i],
    ['plant', /planta|[aá]rbol|ent\b|treant|enredadera|hongo|mic[oó]nido|shambling|tertre|arbusto|zarza/i],
    [
      'aberration',
      /contemplador|beholder|azotamentes|desollador|illithid|aboleth|aberraci|gibbering|balbuceante|otyugh|capa\b|cloaker/i,
    ],
    [
      'humanoid',
      /goblin|trasgo|orco|bandid|guardia|kobold|hobgoblin|osgo|gnoll|cultista|mago|caballero|humano|elfo|enano|mediano|soldado|asesino|esp[ií]a|sacerdote|noble|plebeyo|explorador|mat[oó]n|veterano|ac[oó]lito|capit[aá]n|hombre lagarto|drow|duergar|bugbear|berserker|gladiador|archimago|druida|pirata/i,
    ],
  ];
  const forName = name => (NAMES.find(([, re]) => re.test(String(name || ''))) || ['monstrosity'])[0];
  const cache = new Map();
  function path(id) {
    if (!PATHS[id] || typeof Path2D === 'undefined') return null;
    if (!cache.has(id)) cache.set(id, new Path2D(PATHS[id]));
    return cache.get(id);
  }
  // Dibuja el emblema centrado en (cx, cy), de `size` px de lado.
  function draw(ctx, id, cx, cy, size, color, alpha = 1) {
    const p = path(id);
    if (!p) return false;
    ctx.save();
    ctx.translate(cx - size / 2, cy - size / 2);
    ctx.scale(size / 24, size / 24);
    ctx.globalAlpha *= alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.7;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke(p);
    ctx.restore();
    return true;
  }
  const api = { PATHS, forName, draw, has: id => Object.hasOwn(PATHS, id) };
  if (typeof module !== 'undefined') module.exports = api;
  root.Sigils = api;
})(typeof window !== 'undefined' ? window : globalThis);
