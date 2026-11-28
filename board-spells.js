// Spell visuals for the 2014 catalog. Rules and cast resolution remain in the character sheet.
(function (root) {
  'use strict';
  const archetypes = Object.create(null);
  const classify = (kind, ids) => {
    for (const id of ids.split(' ')) archetypes[id] = kind;
  };
  classify('aura-instant', 'arms-of-hadar earth-tremor sword-burst thunderclap word-of-radiance');
  classify(
    'aura-persistent',
    'antilife-shell antimagic-field ashardalons-stride aura-of-life aura-of-purity aura-of-vitality circle-of-power crusaders-mantle globe-of-invulnerability holy-aura spirit-guardians spirit-shroud warding-wind',
  );
  classify('beam', 'disintegrate enervation lightning-lure ray-of-enfeeblement scorching-ray witch-bolt');
  classify(
    'buff',
    'absorb-elements aid air-bubble alter-self animal-friendship animal-shapes armor-of-agathys awaken bane barkskin beacon-of-hope beast-bond beast-sense bestow-curse blade-ward bless blindness-deafness blur borrowed-knowledge catnap cause-fear charm-monster charm-person command compelled-duel compulsion contingency crown-of-madness darkvision death-ward disguise-self dispel-evil-and-good divine-favor divine-word dominate-beast dominate-monster dominate-person draconic-transformation dragons-breath dream earthbind elemental-bane elemental-weapon enemies-abound enhance-ability enlarge-reduce enthrall expeditious-retreat eyebite false-life fast-friends feather feign-death fire-shield fizbans-platinum-shield flame-arrows flame-blade flesh-to-stone fly foresight fortunes-favor freedom-of-movement friends gaseous-form geas gentle-repose gift-of-alacrity glibness greaterinvis guardian-of-nature guidance haste heat-metal heroes-feast heroism hex hold hold-monster holy-weapon hunters-mark imprisonment incite-greed intellect-fortress investiture-of-flame investiture-of-ice investiture-of-stone investiture-of-wind invisibility invulnerability jump kinetic-jaunt laughter levitate longstrider mage-armor magic-jar magic-weapon mass-polymorph mass-suggestion mental-prison mind-blank mirror-image mislead modify-memory motivational-speech nondetection nystuls-magic-aura ottos-irresistible-dance pass-without-trace planar-binding polymorph power-word-kill power-word-pain power-word-stun primordial-ward protection-from-energy protection-from-evil-and-good protection-from-poison rarys-telepathic-bond reality-break resistance sanctuary see-invisibility seeming sequester shadow-blade shadow-of-moil shapechange shield shield-of-faith shillelagh silvery skill-empowerment soul-cage spider-climb stoneskin suggestion swift-quiver tashas-otherworldly-guise telekinesis telepathy tensers-transformation tether-essence time-stop tongues true-polymorph true-seeing true-strike warding-bond water-breathing water-walk wind-walk',
  );
  classify(
    'column',
    'bones-of-the-earth call-lightning conjure-volley dawn flame-strike freedom-of-the-waves ice-storm maelstrom magic-circle moonbeam reverse-gravity sleet-storm storm-of-vengeance whirlwind',
  );
  classify(
    'cone',
    'burning-hands color-spray cone-of-cold conjure-barrage fear frost-fingers prismatic-spray pulse-wave rimes-binding-ice spray-of-cards',
  );
  classify(
    'cube',
    'abi-dalzims-horrid-wilting alarm antipathy-sympathy cloud-of-daggers control-flames control-water control-winds create-bonfire create-or-destroy-water creation druid-grove druidcraft dust-devil entangle erupting-earth evards-black-tentacles fabricate faeriefire fire-storm forbiddance forcecage gate-seal grease guards-and-wards hallucinatory-terrain hypnotic illusion major-image maximillians-earthen-grasp mold-earth mordenkainens-private-sanctum move-earth nathairs-mischief phantasmal-force programmed-illusion shape-water silent-image slow thunderwave transmute-rock web wrath-of-nature',
  );
  classify(
    'heal',
    'cure greater-restoration heal healing-spirit healingword lesser-restoration life-transference mass-cure-wounds mass-heal mass-healing-word power-word-heal prayer-of-healing raise-dead regenerate reincarnate remove-curse resurrection revivify spare-the-dying true-resurrection',
  );
  classify(
    'line',
    'aganazzars-scorcher gravity-fissure gust-of-wind lightning-bolt sunbeam tashas-caustic-brew tidal-wave',
  );
  classify(
    'multi',
    'chain-lightning crown-of-stars eldritch-blast jims-magic-missile magic-missile melfs-minute-meteors',
  );
  classify(
    'on-hit',
    'banishing-smite blinding-smite branding-smite ensnaring-strike hail-of-thorns lightning-arrow searing-smite staggering-smite thunderous-smite wrathful-smite zephyr-strike',
  );
  classify(
    'projectile',
    'acid-splash catapult chaos-bolt chill-touch chromatic-orb fire-bolt guiding-bolt magic-stone melfs-acid-arrow poison-spray produce-flame raulothims-psychic-lance ray-of-frost ray-of-sickness thorn-whip',
  );
  classify(
    'sphere',
    'calm-emotions circle-of-death cloudkill confusion control-weather dark-star darkness daylight delayed-blast-fireball destructive-wave earthquake fireball flaming-sphere fog-cloud glyph-of-warding gravity-sinkhole hallow hunger-of-hadar ice-knife incendiary-cloud insect-plague leomunds-tiny-hut maddening-darkness magnify-gravity meteor-swarm otilukes-freezing-sphere otilukes-resilient-sphere plant-growth pyrotechnics ravenous-void shatter sickening-radiance silence sleep snare snillocs-snowball-swarm spike-growth stinking-cloud storm-sphere sunburst symbol synaptic-static vitriolic-sphere watery-sphere weird wither-and-bloom zone-of-truth',
  );
  classify(
    'strike',
    'antagonize blight dissonant-whispers feeblemind finger-of-death frostbite harm hellish-rebuke immolation infestation mind-sliver mind-spike mockery negative-energy-flood phantasmal-killer psychic-scream sacred-flame sapping-sting tashas-mind-whip time-ravage toll-the-dead',
  );
  classify(
    'summon',
    'animate-dead animate-objects bigbys-hand blade-of-disaster clone conjure-animals conjure-celestial conjure-elemental conjure-fey conjure-minor-elementals conjure-woodland-beings create-homunculus create-magen create-undead danse-macabre find-familiar find-greater-steed find-steed flock-of-familiars galders-speedy-courier galders-tower giant-insect grasping-vine guardian-of-faith illusory-dragon infernal-calling mighty-fortress mordenkainens-faithful-hound mordenkainens-magnificent-mansion mordenkainens-sword phantom-steed planar-ally simulacrum spirit-of-death spiritual-weapon summon-aberration summon-beast summon-celestial summon-construct summon-draconic-spirit summon-elemental summon-fey summon-fiend summon-greater-demon summon-lesser-demons summon-shadowspawn summon-undead temple-of-the-gods tiny-servant unseen-servant',
  );
  classify(
    'teleport',
    'arcane-gate astral-projection banishment blink demiplane dimension dream-of-the-blue-veil etherealness far-step freedom-of-the-winds gate leomunds-secret-chest maze misty-step plane-shift scatter steel-wind-strike teleport teleportation-circle temporal-shunt thunder-step transport-via-plants tree-stride vortex-warp word-of-recall',
  );
  classify(
    'touch',
    'booming-blade contagion green-flame-blade inflict-wounds primal-savagery shocking-grasp vampiric-touch',
  );
  classify(
    'utility',
    'animal-messenger arcane-eye arcane-lock augury ceremony clairvoyance commune commune-with-nature comprehend-languages contact-other-plane continual-flame cordon-of-arrows counter create-food-and-water create-spelljamming-helm dancing-lights detect-evil-and-good detect-poison-and-disease detect-thoughts detectmagic dispel distort-value divination drawmijs-instant-summons encode-thoughts find-the-path find-traps gift-of-gab goodberry gust identify illusory-script immovable-object jims-glowing-coin knock legend-lore light locate-animals-or-plants locate-creature locate-object magehand magic-mouth meld-into-stone mending message mirage-arcane passwall prestidigitation project-image purify-food-and-drink rope-trick scrying sending skywrite speak-with-animals speak-with-dead speak-with-plants stone-shape tensers-floating-disk thaumaturgy warp-sense wish wristpocket',
  );
  classify(
    'wall',
    'blade-barrier prismatic-wall tsunami wall-of-fire wall-of-force wall-of-ice wall-of-light wall-of-sand wall-of-stone wall-of-thorns wall-of-water wind-wall',
  );
  classify('buff', 'bardic-inspiration barbarian-rage symbiotic-entity');
  classify('strike', 'halo-of-spores');
  classify('utility', 'counterspell');

  const shapes = Object.create(null);
  function area(kind, feet, width, self, ids) {
    for (const id of ids.split(' ')) shapes[id] = { kind, feet, width, self };
  }
  area('circle', 5, 0, false, 'ice-knife snillocs-snowball-swarm watery-sphere');
  area('circle', 5, 0, true, 'ashardalons-stride sword-burst thunderclap word-of-radiance');
  area('circle', 10, 0, false, 'confusion magnify-gravity shatter');
  area(
    'circle',
    10,
    0,
    true,
    'antilife-shell antimagic-field arms-of-hadar earth-tremor globe-of-invulnerability warding-wind',
  );
  area('circle', 15, 0, false, 'darkness zone-of-truth');
  area('circle', 15, 0, true, 'spirit-guardians');
  area(
    'circle',
    20,
    0,
    false,
    'calm-emotions cloudkill delayed-blast-fireball fireball fog-cloud gravity-sinkhole hunger-of-hadar incendiary-cloud insect-plague silence sleep spike-growth stinking-cloud storm-sphere synaptic-static vitriolic-sphere',
  );
  area('circle', 30, 0, false, 'incite-greed sickening-radiance weird');
  area(
    'circle',
    30,
    0,
    true,
    'aura-of-life aura-of-purity aura-of-vitality circle-of-power crusaders-mantle destructive-wave holy-aura',
  );
  area('circle', 60, 0, false, 'circle-of-death daylight maddening-darkness sunburst');
  area('circle', 40, 0, false, 'dark-star');
  area('circle', 2.5, 0, false, 'flaming-sphere');
  area('cone', 15, 0, true, 'burning-hands color-spray frost-fingers spray-of-cards');
  area('cone', 30, 0, true, 'fear pulse-wave rimes-binding-ice');
  area('cone', 60, 0, true, 'cone-of-cold conjure-barrage prismatic-spray');
  area('cube', 20, 0, false, 'evards-black-tentacles');
  area('line', 30, 5, true, 'aganazzars-scorcher');
  area('line', 30, 5, true, 'tashas-caustic-brew');
  area('line', 30, 10, false, 'tidal-wave');
  area('line', 60, 5, true, 'sunbeam');
  area('line', 60, 10, true, 'gust-of-wind');
  area('line', 100, 5, true, 'gravity-fissure lightning-bolt');

  for (const [id, feet, height] of [
    ['call-lightning', 5, 10],
    ['dawn', 30, 40],
    ['flame-strike', 10, 40],
    ['ice-storm', 20, 40],
    ['freedom-of-the-waves', 15, 10],
    ['magic-circle', 10, 20],
    ['moonbeam', 5, 40],
    ['reverse-gravity', 50, 100],
    ['sleet-storm', 40, 20],
    ['whirlwind', 10, 30],
  ])
    shapes[id] = { kind: 'cylinder', feet, height, self: false };
  area('cube', 15, 0, true, 'thunderwave');
  area('cube', 5, 0, false, 'cloud-of-daggers create-bonfire');
  area('cube', 20, 0, false, 'entangle faeriefire web');
  for (const [id, feet, width, height] of [
    ['blade-barrier', 100, 5, 20],
    ['wall-of-fire', 60, 1, 20],
    ['wall-of-light', 60, 5, 10],
    ['wall-of-sand', 30, 10, 10],
    ['wall-of-water', 30, 1, 10],
    ['wind-wall', 50, 1, 15],
  ])
    shapes[id] = { kind: 'wall', feet, width, height, self: false };

  const EPS = 1e-8;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const kindFor = id => archetypes[id] || 'utility';
  const effectArchetypes = new Set([
    'projectile',
    'sphere',
    'cone',
    'strike',
    'aura-instant',
    'aura-persistent',
    'beam',
    'column',
    'cube',
    'wall',
    'touch',
    'buff',
    'heal',
    'summon',
    'teleport',
    'on-hit',
    'line',
    'multi',
    'utility',
  ]);
  const implemented = id => Object.hasOwn(archetypes, id) && effectArchetypes.has(kindFor(id));
  const markedCast = kind => ['buff', 'summon', 'multi', 'on-hit', 'teleport'].includes(kind);
  const missileCount = slot => 2 + clamp(Math.trunc(Number(slot)) || 1, 1, 9);
  const beamCount = level => 1 + Number(level >= 5) + Number(level >= 11) + Number(level >= 17);
  const chainCount = slot => 4 + clamp(Math.trunc(Number(slot)) || 6, 6, 9) - 6;
  const repeatable = Object.freeze({
    sunbeam: { kind: 'action', range: 0 },
    'melfs-minute-meteors': { kind: 'bonus', range: 120, amount: slot => 6 + 2 * Math.max(0, slot - 3) },
    'crown-of-stars': { kind: 'bonus', range: 120, amount: slot => 7 + 2 * Math.max(0, slot - 7) },
    'freedom-of-the-winds': { kind: 'reaction', range: 60 },
  });
  const weaponForm = value => (['mace', 'axe'].includes(value) ? value : 'hammer');
  const destinationRange = id => ({ 'misty-step': 30, 'far-step': 60 })[id] || 0;
  const forcedMoves = Object.freeze({
    thunderwave: { move: 'push', feet: 10, on: 'save', from: 'caster' },
    'thorn-whip': { move: 'pull', feet: 10, on: 'hit', from: 'caster' },
    'lightning-lure': { move: 'pull', feet: 10, on: 'save', from: 'caster' },
    'grasping-vine': { move: 'pull', feet: 20, on: 'save', from: 'point' },
    'thunderous-smite': { move: 'push', feet: 10, on: 'save', from: 'caster' },
    gust: { move: 'push', feet: 5, on: 'save', from: 'caster' },
    'gust-of-wind': { move: 'push', feet: 15, on: 'save', from: 'line' },
    'dust-devil': { move: 'push', feet: 10, on: 'save', from: 'point' },
    'pulse-wave': { move: 'push', feet: 15, on: 'save', from: 'caster' },
    'gravity-sinkhole': { move: 'pull', feet: 5, on: 'save', from: 'point' },
    'gravity-fissure': { move: 'pull', feet: 10, on: 'save', from: 'line' },
  });
  const forcedMove = id => (Object.hasOwn(forcedMoves, id) ? forcedMoves[id] : null);
  const zoneRules = Object.freeze({
    'spirit-guardians': { enter: true, start: true, hostile: true },
    moonbeam: { enter: true, start: true },
    'cloud-of-daggers': { enter: true, start: true, noSave: true },
    'spike-growth': { travel: true, noSave: true },
    'wall-of-fire': { initial: true, enter: true, end: true, hot: true, noSave: true },
    'blade-barrier': { enter: true, start: true },
    cloudkill: { enter: true, start: true, spreads: true },
    'evards-black-tentacles': { enter: true, start: true },
    'create-bonfire': { initial: true, enter: true, end: true },
    'sickening-radiance': { enter: true, start: true },
    'incendiary-cloud': { initial: true, enter: true, end: true, spreads: true },
    'flaming-sphere': { end: true, adjacent: 5 },
    'insect-plague': { initial: true, enter: true, end: true, spreads: true },
    'maddening-darkness': { start: true, spreads: true },
    'dark-star': { enter: true, start: true },
    'hunger-of-hadar': {
      start: true,
      end: true,
      rolls: {
        start: { formula: '2d6', types: 'frío', ability: '', half: false },
        end: { formula: '2d6', types: 'ácido', ability: 'dex', half: false },
      },
    },
  });
  const zoneRule = id => zoneRules[id] || null;
  const wardCount = (id, level) => {
    if (id === 'bless' || id === 'bane') return Math.max(3, Math.min(11, 2 + Number(level)));
    if (id === 'hold' || id === 'hold-monster') return Math.max(1, Number(level) - (id === 'hold' ? 1 : 4));
    return 0;
  };
  // Visual geometry: return the first boundary intersection if the beam exits the map.
  function clipRay(grid, from, to) {
    const dx = to.x - from.x,
      dy = to.y - from.y;
    const tx = dx > 0 ? (grid.cols - from.x) / dx : dx < 0 ? -from.x / dx : Infinity;
    const ty = dy > 0 ? (grid.rows - from.y) / dy : dy < 0 ? -from.y / dy : Infinity;
    const t = clamp(Math.min(1, tx, ty), 0, 1);
    return { x: from.x + dx * t, y: from.y + dy * t };
  }
  const debuff = id =>
    [
      'bane',
      'hold',
      'hold-monster',
      'hex',
      'slow',
      'bestow-curse',
      'blindness-deafness',
      'laughter',
      'ensnaring-strike',
      'ray-of-enfeeblement',
      'cause-fear',
      'charm-person',
      'banishment',
      'command',
      'earthbind',
      'power-word-stun',
      'power-word-pain',
      'tether-essence',
    ].includes(id);

  function areaFor(spell, slot = spell.level, legacyArea = null) {
    const entry = shapes[spell.id];
    if (!entry) return legacyArea;
    const growth = { 'fog-cloud': 20, confusion: 5 }[spell.id] || 0;
    return { ...entry, feet: entry.feet + growth * Math.max(0, slot - spell.level) };
  }

  function rangeFor(value) {
    const text = String(value || '');
    if (/^(self|personal)\b/i.test(text)) return 0;
    if (/^(touch|toque)\b/i.test(text)) return 5;
    const number = /([\d,.]+)\s*(pies|feet|foot|ft|millas?|miles?)\b/i.exec(text);
    if (!number) return Infinity;
    return Number(number[1].replace(/[,.]/g, '')) * (/^(milla|mile)/i.test(number[2]) ? 5280 : 1);
  }

  function footprint(token) {
    if (!token) return null;
    const span = Number(token.size) || 1;
    return { x: token.x, y: token.y, right: token.x + span, bottom: token.y + span };
  }

  function footprintCells(token) {
    const f = footprint(token);
    const result = [];
    for (let y = Math.floor(f.y); y < f.bottom; y++)
      for (let x = Math.floor(f.x); x < f.right; x++) result.push([x, y]);
    return result;
  }

  function distance(source, target, point, feetPerSquare) {
    const a = footprint(source);
    const b = footprint(target);
    if (!a || source === target) return 0;
    const dx = b ? Math.max(b.x - a.right + 1, a.x - b.right + 1, 0) : Math.max(a.x - point.x, point.x - a.right, 0);
    const dy = b ? Math.max(b.y - a.bottom + 1, a.y - b.bottom + 1, 0) : Math.max(a.y - point.y, point.y - a.bottom, 0);
    const height = Math.abs((source.elev || 0) - (target?.elev || 0));
    return Math.max(Math.ceil(Math.max(dx, dy) - EPS) * feetPerSquare, height);
  }

  function snapIntersection(point, grid) {
    return { x: clamp(Math.round(point.x), 0, grid.cols), y: clamp(Math.round(point.y), 0, grid.rows) };
  }

  function makeTemplate(grid, shape, caster, aim) {
    if (!shape) return null;
    const f = footprint(caster);
    const span = f ? f.right - f.x : 0;
    const center = f ? { x: f.x + span / 2, y: f.y + span / 2 } : null;
    if (shape.self && !center) return null;
    const directional =
      shape.kind === 'cone' || shape.kind === 'line' || shape.kind === 'wall' || (shape.kind === 'cube' && shape.self);
    let point = snapIntersection(aim, grid);
    let dir = center ? Math.atan2(aim.y - center.y, aim.x - center.x) : 0;
    if (shape.kind === 'wall' || (shape.kind === 'cube' && shape.self)) {
      dir = Math.round(dir / (Math.PI / 2)) * (Math.PI / 2) || 0;
      if (shape.kind === 'cube') {
        const x = Math.round(Math.cos(dir));
        const y = Math.round(Math.sin(dir));
        point = { x: center.x + (x * span) / 2, y: center.y + (y * span) / 2 };
      }
      return { ...shape, ...point, dir, origin: point };
    }
    if (shape.self && directional) {
      const vx = Math.cos(dir),
        vy = Math.sin(dir);
      const edges = (lo, hi) =>
        Array.from({ length: Math.max(1, Math.round(hi) - Math.round(lo) + 1) }, (_, i) => Math.round(lo) + i);
      const xs = edges(f.x, f.right),
        ys = edges(f.y, f.bottom);
      const candidates = xs.flatMap(x =>
        ys
          .filter((y, i) => x === xs[0] || x === xs[xs.length - 1] || i === 0 || i === ys.length - 1)
          .map(y => snapIntersection({ x, y }, grid)),
      );
      const score = p =>
        (p.x - center.x) * vx + (p.y - center.y) * vy - Math.abs((p.x - center.x) * vy - (p.y - center.y) * vx);
      point = candidates.reduce((a, b) => (score(b) > score(a) ? b : a));
      if (aim.x !== point.x || aim.y !== point.y) dir = Math.atan2(aim.y - point.y, aim.x - point.x);
    } else if (shape.self) point = center;
    if (!directional) dir = 0;
    if (shape.kind === 'cube' && !shape.self) {
      const half = shape.feet / grid.feet / 2;
      if (shape.feet === grid.feet) {
        const x = clamp(Math.floor(aim.x), 0, grid.cols - 1),
          y = clamp(Math.floor(aim.y), 0, grid.rows - 1);
        return { ...shape, x, y: y + half, dir, origin: { x: x + half, y: y + half } };
      }
      return { ...shape, x: point.x - half, y: point.y, dir, origin: point };
    }
    return { ...shape, ...point, dir, origin: point };
  }

  function outline(grid, area) {
    const r = area.feet / grid.feet;
    if (area.kind === 'circle' || area.kind === 'cylinder' || area.ring) {
      return Array.from({ length: 48 }, (_, i) => {
        const angle = (i * Math.PI) / 24;
        return [area.x + r * Math.cos(angle), area.y + r * Math.sin(angle)];
      });
    }
    const dx = Math.cos(area.dir),
      dy = Math.sin(area.dir);
    const at = (along, side) => [area.x + along * dx - side * dy, area.y + along * dy + side * dx];
    if (area.kind === 'cone') return [at(0, 0), at(r, -r / 2), at(r, r / 2)];
    const half = area.kind === 'cube' ? r / 2 : (area.width || 5) / grid.feet / 2;
    return [at(0, -half), at(r, -half), at(r, half), at(0, half)];
  }

  function clipPolygon(points, axis, value, sign) {
    if (!points.length) return points;
    const clipped = [];
    let a = points[points.length - 1];
    for (const b of points) {
      const insideA = (a[axis] - value) * sign >= -EPS;
      const insideB = (b[axis] - value) * sign >= -EPS;
      if (insideA !== insideB) {
        const t = (value - a[axis]) / (b[axis] - a[axis]);
        clipped.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      }
      if (insideB) clipped.push(b);
      a = b;
    }
    return clipped;
  }

  function coversCell(poly, x, y) {
    let cell = clipPolygon(poly, 0, x, 1);
    cell = clipPolygon(cell, 0, x + 1, -1);
    cell = clipPolygon(cell, 1, y, 1);
    cell = clipPolygon(cell, 1, y + 1, -1);
    let twice = 0;
    for (let i = 0; i < cell.length; i++) {
      const a = cell[i],
        b = cell[(i + 1) % cell.length];
      twice += a[0] * b[1] - a[1] * b[0];
    }
    return Math.abs(twice) > EPS;
  }

  function coversHalfCircle(area, radius, x, y) {
    const nearest = Math.hypot(clamp(area.x, x, x + 1) - area.x, clamp(area.y, y, y + 1) - area.y);
    if (nearest >= radius) return false;
    const furthest = Math.hypot(
      Math.max(Math.abs(x - area.x), Math.abs(x + 1 - area.x)),
      Math.max(Math.abs(y - area.y), Math.abs(y + 1 - area.y)),
    );
    if (furthest <= radius) return true;
    const steps = 64;
    let coverage = 0;
    for (let i = 0; i < steps; i++) {
      const px = x + (i + 0.5) / steps - area.x;
      const half = Math.sqrt(Math.max(0, radius * radius - px * px));
      coverage += Math.max(0, Math.min(y + 1, area.y + half) - Math.max(y, area.y - half));
    }
    return coverage >= steps / 2;
  }

  function unobstructed(from, to, walls) {
    const rx = to.x - from.x,
      ry = to.y - from.y;
    return !walls.some(([ax, ay, bx, by]) => {
      const sx = bx - ax,
        sy = by - ay;
      const cross = rx * sy - ry * sx;
      if (Math.abs(cross) < EPS) return false;
      const qx = ax - from.x,
        qy = ay - from.y;
      const ray = (qx * sy - qy * sx) / cross;
      const wall = (qx * ry - qy * rx) / cross;
      return ray > EPS && ray < 1 - EPS && wall >= -EPS && wall <= 1 + EPS;
    });
  }

  function affectedCells(grid, area, walls = [], spreadsAroundCorners = false) {
    const polygon = outline(grid, area);
    const radius = area.feet / grid.feet;
    const circular = area.kind === 'circle' || area.kind === 'cylinder';
    const x0 = Math.max(0, Math.floor(Math.min(...polygon.map(p => p[0]))));
    const x1 = Math.min(grid.cols, Math.ceil(Math.max(...polygon.map(p => p[0]))));
    const y0 = Math.max(0, Math.floor(Math.min(...polygon.map(p => p[1]))));
    const y1 = Math.min(grid.rows, Math.ceil(Math.max(...polygon.map(p => p[1]))));
    const cells = [];
    for (let y = y0; y < y1; y++)
      for (let x = x0; x < x1; x++) {
        const distance = Math.hypot(x + 0.5 - area.x, y + 0.5 - area.y);
        const covered = area.ring
          ? Math.abs(distance - radius) <= 0.71 + area.width / grid.feet / 2
          : circular
            ? coversHalfCircle(area, radius, x, y)
            : coversCell(polygon, x, y);
        if (covered && (spreadsAroundCorners || unobstructed(area.origin || area, { x: x + 0.5, y: y + 0.5 }, walls)))
          cells.push([x, y]);
      }
    return cells;
  }

  function affectedTokens(cells, tokens) {
    const keys = new Set(cells.map(p => p.join(',')));
    return tokens.filter(token => footprintCells(token).some(cell => keys.has(cell.join(','))));
  }

  function zoneContains(
    grid,
    area,
    token,
    { hot = false, wallSide = 1, adjacent = 0, ground = false, walls = [], spreads = false } = {},
  ) {
    const f = footprint(token);
    const elevation = (Number(token.elev) || 0) - (Number(area.elev) || 0);
    if (
      !f ||
      (ground && elevation !== 0) ||
      (area.self ? Math.abs(elevation) : elevation) >= (area.height || area.feet || grid.feet)
    )
      return false;
    if (area.kind === 'wall') {
      const r = area.feet / grid.feet,
        thickness = (area.width || 1) / grid.feet / 2,
        reach = 10 / grid.feet;
      if (area.ring) {
        const min = Math.hypot(
          Math.max(f.x - area.x, 0, area.x - f.right),
          Math.max(f.y - area.y, 0, area.y - f.bottom),
        );
        const max = Math.max(
          ...[f.x, f.right].flatMap(x => [f.y, f.bottom].map(y => Math.hypot(x - area.x, y - area.y))),
        );
        return (
          max > r - (hot && wallSide < 0 ? reach : thickness) && min < r + (hot && wallSide > 0 ? reach : thickness)
        );
      }
      const dx = Math.cos(area.dir),
        dy = Math.sin(area.dir);
      const along = [],
        across = [];
      for (const x of [f.x, f.right])
        for (const y of [f.y, f.bottom]) {
          along.push((x - area.x) * dx + (y - area.y) * dy);
          across.push(((y - area.y) * dx - (x - area.x) * dy) * wallSide);
        }
      return (
        Math.max(...along) > 0 &&
        Math.min(...along) < r &&
        Math.max(...across) > -thickness &&
        Math.min(...across) < (hot ? reach : thickness)
      );
    }
    return (
      affectedTokens(affectedCells(grid, adjacent ? { ...area, feet: area.feet + adjacent } : area, walls, spreads), [
        token,
      ]).length > 0
    );
  }
  function zoneMovement(grid, area, token, path, rule) {
    let enters = false,
      feet = 0;
    let inside = zoneContains(grid, area, { ...token, ...path[0] }, { ...rule, hot: false, ground: rule.travel });
    for (let i = 1; i < path.length; i++) {
      const next = zoneContains(grid, area, { ...token, ...path[i] }, { ...rule, hot: false, ground: rule.travel });
      if (next && !inside) enters = true;
      if (rule.travel && next)
        feet += Math.max(Math.abs(path[i].x - path[i - 1].x), Math.abs(path[i].y - path[i - 1].y)) * grid.feet;
      inside = next;
    }
    return { enters, feet };
  }

  // An explicit direction is the travel angle in radians; otherwise push radially away from `from`.
  function pushDestination(grid, from, target, fits, feet = 10, dir) {
    const f = footprint(target);
    const dx = target.x + (f.right - f.x) / 2 - from.x;
    const dy = target.y + (f.bottom - f.y) / 2 - from.y;
    if (!Number.isFinite(dir) && Math.hypot(dx, dy) < EPS) return null;
    const angle = Math.round((Number.isFinite(dir) ? dir : Math.atan2(dy, dx)) / (Math.PI / 4)) * (Math.PI / 4);
    const vx = Math.round(Math.cos(angle));
    const vy = Math.round(Math.sin(angle));
    let last = null;
    for (let step = 1; step <= feet / grid.feet; step++) {
      const next = { ...target, x: target.x + vx * step, y: target.y + vy * step };
      if (!fits(next, last || target)) break;
      last = next;
    }
    return last;
  }

  // Straight toward a point, stopping where the next step no longer fits (a creature or a wall).
  function pullDestination(grid, toward, target, fits, feet = 10, dir) {
    const f = footprint(target);
    const dx = toward.x - (target.x + (f.right - f.x) / 2);
    const dy = toward.y - (target.y + (f.bottom - f.y) / 2);
    if (!Number.isFinite(dir) && Math.hypot(dx, dy) < EPS) return null;
    return pushDestination(
      grid,
      { x: target.x + (f.right - f.x) / 2 - dx, y: target.y + (f.bottom - f.y) / 2 - dy },
      target,
      fits,
      feet,
      dir,
    );
  }

  function nearestPointOnSegment(point, start, end) {
    const dx = end.x - start.x,
      dy = end.y - start.y;
    const length2 = dx * dx + dy * dy;
    const t = length2 ? clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / length2, 0, 1) : 0;
    return { x: start.x + dx * t, y: start.y + dy * t };
  }

  function forcedDestination(grid, id, meta, target, fits) {
    const rule = forcedMove(id);
    const point = p => Number.isFinite(p?.x) && Number.isFinite(p?.y);
    if (!rule || !point(meta?.origin)) return null;
    let from = meta.origin,
      dir;
    if (rule.from === 'point' && point(meta.point)) from = meta.point;
    if (rule.from === 'line' && Number.isFinite(meta.dir)) {
      if (rule.move === 'push') dir = meta.dir;
      else {
        const f = footprint(target);
        const length = (Number.isFinite(meta.length) && meta.length > 0 ? meta.length : shapes[id].feet) / grid.feet;
        from = nearestPointOnSegment({ x: (f.x + f.right) / 2, y: (f.y + f.bottom) / 2 }, meta.origin, {
          x: meta.origin.x + Math.cos(meta.dir) * length,
          y: meta.origin.y + Math.sin(meta.dir) * length,
        });
      }
    }
    const move = rule.move === 'pull' ? pullDestination : pushDestination;
    // Point/line pulls must stop at their destination, even when no creature occupies it.
    // Caster pulls retain the original Thorn Whip path and collision checks.
    const offset = t => {
      const f = footprint(t);
      return { x: (f.x + f.right) / 2 - from.x, y: (f.y + f.bottom) / 2 - from.y };
    };
    const start = offset(target);
    const approaches = (next, prior) => {
      const a = offset(next),
        b = offset(prior);
      return a.x * start.x + a.y * start.y >= -EPS && a.x ** 2 + a.y ** 2 < b.x ** 2 + b.y ** 2 - EPS;
    };
    return move(
      grid,
      from,
      target,
      (next, prior) => (rule.move !== 'pull' || rule.from === 'caster' || approaches(next, prior)) && fits(next, prior),
      rule.feet,
      dir,
    );
  }

  const api = {
    kindFor,
    pullDestination,
    implemented,
    markedCast,
    missileCount,
    beamCount,
    chainCount,
    repeatable,
    weaponForm,
    destinationRange,
    forcedMove,
    forcedDestination,
    nearestPointOnSegment,
    wardCount,
    pushDestination,
    clipRay,
    debuff,
    areaFor,
    rangeFor,
    footprintCells,
    distance,
    makeTemplate,
    snapIntersection,
    outline,
    affectedCells,
    affectedTokens,
    zoneRule,
    zoneContains,
    zoneMovement,
    unobstructed,
  };
  root.BoardSpells = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
