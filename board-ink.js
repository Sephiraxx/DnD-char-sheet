/* Cel dimensions shared by Ink's exporter and the tablero player. */
(function (root) {
  'use strict';
  const cols = 8;
  const specs = {
    sigil: [96, 80, 12],
    flare: [72, 72, 12],
    'fire-bolt': [96, 72, 16],
    'fire-impact': [128, 128, 20],
    'fireball-bead': [80, 72, 16],
    fireball: [192, 192, 32],
    'fireball-ground': [144, 144, 24],
    'burning-hands': [192, 128, 24],
    'sacred-flame': [88, 192, 24],
    'radiant-impact': [128, 128, 24],
    'fog-cloud': [160, 160, 36],
    'magic-missile': [88, 72, 16],
    'force-impact': [112, 112, 20],
    'lightning-bolt': [240, 72, 24],
    'lightning-scorch': [240, 64, 12],
    'lightning-impact': [112, 112, 16],
    ray: [216, 64, 22],
    cylinder: [96, 152, 28],
    cube: [144, 144, 24],
    wall: [224, 86, 28],
    'aura-instant': [128, 128, 22],
    'aura-persistent': [144, 144, 28],
    touch: [100, 100, 22],
    buff: [96, 96, 25],
    debuff: [96, 96, 25],
    healing: [124, 124, 24],
    summon: [128, 128, 24],
    'summon-weapon': [98, 100, 22],
    teleport: [128, 128, 24],
    utility: [100, 100, 22],
    strike: [112, 112, 22],
    'moonbeam-floor': [112, 112, 24],
    moonbeam: [104, 220, 30],
    disintegrate: [236, 80, 24],
    'disintegrate-hit': [128, 128, 24],
    'disintegrate-dust': [128, 128, 24],
    thunderwave: [176, 176, 26],
    thunderclap: [144, 144, 24],
    'thunder-ripple': [104, 104, 16],
    'toll-the-dead': [120, 144, 26],
    'healing-word': [112, 144, 30],
    'bless-icon': [48, 48, 2],
    'bane-icon': [48, 48, 2],
    'ward-icon': [48, 48, 2],
    'weapon-swing': [112, 112, 22],
    'wall-flames': [88, 152, 30],
    'wall-embers': [144, 52, 24],
    'wall-heat': [112, 70, 24],
    'weapon-mace': [100, 112, 24],
    'weapon-axe': [100, 112, 24],
    'weapon-impact': [112, 112, 20],
    'eldritch-bolt': [108, 76, 20],
    'eldritch-hit': [128, 128, 22],
    'chill-hand': [108, 82, 20],
    'chill-grasp': [110, 116, 23],
    'guiding-star': [104, 82, 18],
    'guiding-mark': [112, 112, 26],
    'cure-wounds': [110, 122, 29],
    'ward-shield': [114, 126, 26],
    'hold-bindings': [120, 142, 28],
    'counterspell-sever': [128, 128, 28],
    'guardian-forms': [168, 168, 28],
    'bardic-notes': [136, 114, 26],
    'rage-burst': [116, 140, 27],
    'spore-halo': [142, 130, 26],
    'symbiotic-growth': [112, 134, 28],
    'shillelagh-bark': [108, 132, 27],
    'entangle-vines': [148, 148, 28],
  };
  if (typeof module !== 'undefined') {
    module.exports = { cols, specs };
    return;
  }
  const images = {};
  function load(id) {
    if (!Object.hasOwn(specs, id)) return null;
    if (!images[id]) {
      const image = new Image();
      image.src = './assets/spell-ink/' + id + '.png';
      images[id] = image;
    }
    return images[id];
  }
  const signatures = {
    'fire-bolt': ['fire-bolt', 'fire-impact'],
    fireball: ['fireball', 'fireball-bead', 'fireball-ground'],
    'burning-hands': ['burning-hands'],
    'sacred-flame': ['sacred-flame', 'radiant-impact'],
    'fog-cloud': ['fog-cloud'],
    'magic-missile': ['magic-missile', 'force-impact'],
    'lightning-bolt': ['lightning-bolt', 'lightning-impact', 'lightning-scorch'],
    moonbeam: ['moonbeam-floor', 'moonbeam'],
    disintegrate: ['disintegrate', 'disintegrate-hit', 'disintegrate-dust'],
    thunderwave: ['thunderwave', 'thunder-ripple'],
    thunderclap: ['thunderclap', 'thunder-ripple'],
    'toll-the-dead': ['toll-the-dead'],
    healingword: ['healing-word'],
    'healing-word': ['healing-word'],
    'wall-of-fire': ['wall-flames', 'wall-embers', 'wall-heat'],
    'spiritual-weapon': ['summon', 'summon-weapon', 'weapon-mace', 'weapon-axe', 'weapon-swing', 'weapon-impact'],
    'eldritch-blast': ['eldritch-bolt', 'eldritch-hit'],
    'chill-touch': ['chill-hand', 'chill-grasp'],
    'guiding-bolt': ['guiding-star', 'guiding-mark'],
    cure: ['cure-wounds'],
    shield: ['ward-shield'],
    hold: ['hold-bindings'],
    counterspell: ['counterspell-sever'],
    counter: ['counterspell-sever'],
    'spirit-guardians': ['guardian-forms'],
    'bardic-inspiration': ['bardic-notes'],
    'barbarian-rage': ['rage-burst'],
    'halo-of-spores': ['spore-halo'],
    'symbiotic-entity': ['symbiotic-growth'],
    shillelagh: ['shillelagh-bark'],
    entangle: ['entangle-vines'],
  };
  function prepare(id, kind) {
    const family = { heal: 'healing', beam: 'ray', column: 'cylinder' }[kind] || kind;
    const cels = signatures[id] || [family];
    if (kind === 'buff') ['buff', 'debuff', 'bless-icon', 'bane-icon', 'ward-icon'].forEach(load);
    cels.forEach(load);
  }
  load('sigil');
  load('flare');
  function draw(ctx, id, t, x, y, width, height, options = {}) {
    const image = load(id);
    if (!image?.complete || !image.naturalWidth) return false;
    const [w, h, count] = specs[id];
    const cel = Math.min(count - 1, Math.max(0, t * (count - 1)));
    const from = Math.floor(cel);
    const blend = cel - from;
    const alpha = ctx.globalAlpha * (options.opacity ?? 1);
    const left = -(options.anchorX ?? 0.5) * width;
    const top = -(options.anchorY ?? 0.5) * height;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(options.angle || 0);
    ctx.globalAlpha = alpha;
    const paint = frame =>
      ctx.drawImage(image, (frame % cols) * w, Math.floor(frame / cols) * h, w, h, left, top, width, height);
    paint(from);
    if (blend > 0.05) {
      ctx.globalAlpha = alpha * blend;
      paint(from + 1);
    }
    ctx.restore();
    return true;
  }
  function ready() {
    return Object.keys(specs)
      .map(load)
      .every(image => image.complete && image.naturalWidth > 0);
  }
  root.BoardInk = { draw, ready, prepare };
})(typeof window !== 'undefined' ? window : globalThis);
