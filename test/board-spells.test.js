const { test } = require('node:test');
const assert = require('node:assert/strict');
const spells = require('../board-spells.js');

const grid = { cols: 20, rows: 15, feet: 5 };
const includes = (cells, x, y) => cells.some(([cx, cy]) => cx === x && cy === y);

test('Lightning Lure overrides only its Personal range; placed spells use free squares', () => {
  assert.equal(spells.targetRange({ id: 'lightning-lure', range: 'Personal · radio de 15 pies' }), 15);
  for (const [id, range, expected] of [
    ['thunderous-smite', 'Personal', 0],
    ['thunderwave', 'Personal', 0],
    ['thorn-whip', '30 pies', 30],
    ['grasping-vine', '30 pies', 30],
    ['dust-devil', '60 pies', 60],
  ])
    assert.equal(spells.targetRange({ id, range }), expected);
  assert.equal(spells.placedSquare('grasping-vine'), true);
  assert.equal(spells.placedSquare('dust-devil'), true);
  assert.equal(spells.placedSquare('flaming-sphere'), false);
});

test('Dust Devil occupies one cube and triggers at turn end in all adjacent squares', () => {
  const rule = spells.zoneRule('dust-devil');
  assert.deepEqual(rule, { end: true, adjacent: 5 });
  const area = spells.makeTemplate(grid, spells.areaFor({ id: 'dust-devil', level: 2 }), null, { x: 6.5, y: 5.5 });
  assert.deepEqual(area.origin, { x: 6.5, y: 5.5 });
  assert.deepEqual(spells.affectedCells(grid, area), [[6, 5]]);
  for (const x of [5, 6, 7])
    for (const y of [4, 5, 6])
      assert.equal(spells.zoneContains(grid, area, { x, y, size: 1 }, rule), true, `${x},${y}`);
  for (const [x, y] of [
    [4, 5],
    [8, 5],
    [6, 3],
    [6, 7],
  ])
    assert.equal(spells.zoneContains(grid, area, { x, y, size: 1 }, rule), false);
  assert.deepEqual(spells.zoneRule('flaming-sphere'), { end: true, adjacent: 5 });
});

test('persistent zones distinguish start, entry, end, and damage on cast', () => {
  for (const id of ['spirit-guardians', 'moonbeam', 'cloud-of-daggers']) {
    const rule = spells.zoneRule(id);
    assert.equal(Boolean(rule.initial), false);
    assert.equal(rule.enter, true);
    assert.equal(rule.start, true);
    assert.equal(Boolean(rule.end), false);
  }
  assert.equal(spells.zoneRule('spike-growth').travel, true);
  const wall = spells.zoneRule('wall-of-fire');
  assert.equal(wall.initial && wall.enter && wall.end && wall.noSave, true);
  assert.equal(Boolean(wall.start), false);
});

test('moving through a zone detects entry even when the creature finishes outside', () => {
  const shape = spells.areaFor({ id: 'cloud-of-daggers', level: 2 });
  const area = spells.makeTemplate(grid, shape, null, { x: 5.4, y: 4.7 });
  const movement = [
    { x: 4, y: 4 },
    { x: 5, y: 4 },
    { x: 6, y: 4 },
  ];
  const rule = spells.zoneRule('cloud-of-daggers');
  assert.equal(spells.zoneMovement(grid, area, { size: 1 }, movement, rule).enters, true);
  assert.equal(spells.zoneMovement(grid, area, { size: 1 }, movement.slice(1), rule).enters, false);
});

test('Spike Growth uses ground travel and counts Tiny token half-square moves', () => {
  const area = { kind: 'circle', x: 5, y: 5, feet: 20, origin: { x: 5, y: 5 } };
  const path = [
    { x: 5, y: 5 },
    { x: 5.5, y: 5 },
    { x: 6, y: 5 },
    { x: 6.5, y: 5 },
  ];
  const rule = spells.zoneRule('spike-growth');
  assert.equal(spells.zoneMovement(grid, area, { size: 0.5 }, path, rule).feet, 7.5);
  assert.equal(spells.zoneMovement(grid, area, { size: 0.5, elev: 5 }, path, rule).feet, 0);
});

test('Wall of Fire checks entry in the wall and end of turn on the selected hot side', () => {
  const area = { kind: 'wall', x: 2, y: 6, dir: 0, feet: 30, width: 1, height: 20 };
  const hot = { x: 4, y: 7, size: 1 },
    cold = { ...hot, y: 4 };
  assert.equal(spells.zoneContains(grid, area, hot, { hot: true }), true);
  assert.equal(spells.zoneContains(grid, area, cold, { hot: true }), false);
  assert.equal(spells.zoneContains(grid, area, cold, { hot: true, wallSide: -1 }), true);
  assert.equal(spells.zoneContains(grid, area, hot), false);
  assert.equal(spells.zoneContains(grid, area, { ...hot, elev: 20 }, { hot: true }), false);
});

test('2014 spell data separates ranged attacks, direct strikes and self-centered aura modes', () => {
  assert.equal(spells.kindFor('chill-touch'), 'projectile');
  assert.equal(spells.kindFor('sacred-flame'), 'strike');
  assert.equal(spells.kindFor('psychic-scream'), 'strike');
  assert.equal(spells.kindFor('earth-tremor'), 'aura-instant');
  assert.equal(spells.kindFor('spirit-guardians'), 'aura-persistent');
  assert.equal(spells.kindFor('zephyr-strike'), 'on-hit');
  assert.equal(spells.rangeFor('60ft'), 60);
  assert.equal(spells.rangeFor('1,000 pies'), 1000);
  assert.equal(spells.rangeFor('Personal (cono de 15 pies)'), 0);
});

test('spherical spell volumes snap to intersections and include half covered squares', () => {
  const fireball = spells.areaFor({ id: 'fireball', level: 3 });
  const blast = spells.makeTemplate(grid, fireball, null, { x: 6.83, y: 6.15 });
  assert.deepEqual(blast.origin, { x: 7, y: 6 });
  const cells = spells.affectedCells(grid, blast);
  assert.equal(includes(cells, 10, 6), true);
  assert.equal(includes(cells, 10, 8), false);
  assert.equal(spells.areaFor({ id: 'fog-cloud', level: 1 }, 3).feet, 60);
});

test('creatures are picked by occupied grid cells, including all Tiny corners', () => {
  const rats = [
    [0, 0],
    [0.5, 0],
    [0, 0.5],
    [0.5, 0.5],
  ].map(([x, y], id) => ({ id, x: 4 + x, y: 3 + y, size: 0.5 }));
  const giant = { id: 'giant', x: 5, y: 3, size: 3 };
  assert.deepEqual(spells.affectedTokens([[4, 3]], [...rats, giant]), rats);
  assert.deepEqual(spells.affectedTokens([[7, 5]], [...rats, giant]), [giant]);
});

test('cones use the caster side, Earth Tremor uses the center, and walls block outgoing effects', () => {
  const caster = { x: 2, y: 2, size: 2 };
  const cone = spells.makeTemplate(grid, spells.areaFor({ id: 'burning-hands', level: 1 }), caster, { x: 12, y: 3 });
  assert.equal(cone.x, 4);
  const blocked = spells.affectedCells(grid, cone, [[5, 0, 5, 7]]);
  assert.equal(includes(blocked, 5, 3), false);
  assert.equal(includes(spells.affectedCells(grid, cone), 5, 3), true);
  const tremor = spells.makeTemplate(grid, spells.areaFor({ id: 'earth-tremor', level: 1 }), caster, { x: 14, y: 12 });
  assert.deepEqual(tremor.origin, { x: 3, y: 3 });
  assert.equal(spells.distance(caster, { x: 5, y: 2, size: 1, elev: 30 }, null, 5), 30);
});

test('visual families keep cylinder, cube and wall geometry distinct', () => {
  const moonbeam = spells.areaFor({ id: 'moonbeam', level: 2 });
  assert.deepEqual(moonbeam, { kind: 'cylinder', feet: 5, height: 40, self: false });
  assert.equal(spells.areaFor({ id: 'thunderwave', level: 1 }).feet, 15);
  const wall = spells.areaFor({ id: 'wall-of-fire', level: 4 });
  assert.deepEqual(wall, { kind: 'wall', feet: 60, width: 1, height: 20, self: false });
  const from = { x: 11, y: 3 },
    to = { x: 31, y: 5 };
  assert.deepEqual(spells.clipRay(grid, from, to), { x: 20, y: 3.9 });
  assert.deepEqual(spells.clipRay(grid, { x: 5, y: 2 }, { x: 7, y: -8 }), { x: 5.4, y: 0 });
  assert.equal(spells.missileCount(1), 3);
  assert.equal(spells.missileCount(2), 4);
  assert.equal(spells.missileCount(9), 11);
});

test('supported archetypes are registered with expiry or area rules where applicable', () => {
  const ids = [
    'disintegrate',
    'moonbeam',
    'thunderwave',
    'wall-of-fire',
    'thunderclap',
    'spirit-guardians',
    'shocking-grasp',
    'bless',
    'bane',
    'healingword',
    'spiritual-weapon',
    'misty-step',
    'prestidigitation',
    'toll-the-dead',
  ];
  assert.ok(ids.every(spells.implemented));
  assert.equal(spells.implemented('freedom-of-the-waves'), true);
  assert.equal(spells.markedCast(spells.kindFor('bless')), true);
  assert.equal(spells.debuff('bane'), true);
  assert.equal(spells.debuff('bless'), false);
  assert.equal(spells.destinationRange('misty-step'), 30);
});

test('party effects use board archetypes, and Eldritch Blast scales by character level', () => {
  assert.equal(spells.kindFor('halo-of-spores'), 'strike');
  assert.equal(spells.kindFor('barbarian-rage'), 'buff');
  assert.equal(spells.kindFor('symbiotic-entity'), 'buff');
  assert.equal(spells.kindFor('bardic-inspiration'), 'buff');
  assert.ok(spells.implemented('eldritch-blast'));
  assert.deepEqual([1, 4, 5, 10, 11, 16, 17, 20].map(spells.beamCount), [1, 1, 2, 2, 3, 3, 4, 4]);
  assert.equal(spells.areaFor({ id: 'entangle', level: 1 }).feet, 20);
  assert.deepEqual([undefined, 'unknown', 'mace', 'axe'].map(spells.weaponForm), ['hammer', 'hammer', 'mace', 'axe']);
});

test('fire walls snap to grid lines, cover both neighboring rows and stop at the map edge', () => {
  const caster = { x: 2, y: 4, size: 1 };
  const area = spells.makeTemplate(grid, spells.areaFor({ id: 'wall-of-fire', level: 4 }), caster, { x: 14.7, y: 5.2 });
  assert.deepEqual(area.origin, { x: 15, y: 5 });
  assert.equal(area.dir, 0);
  const cells = spells.affectedCells(grid, area);
  assert.ok(includes(cells, 19, 4) && includes(cells, 19, 5));
  assert.ok(!includes(cells, 19, 6) && !includes(cells, 20, 5));
});

test('Thunderwave has a three-by-three area flush with the casting side and pushes up to 10 feet', () => {
  const caster = { x: 3, y: 3, size: 1 };
  const spell = spells.areaFor({ id: 'thunderwave', level: 1 });
  const area = spells.makeTemplate(grid, spell, caster, { x: 10.2, y: 4 });
  assert.deepEqual(area.origin, { x: 4, y: 3.5 });
  const cells = spells.affectedCells(grid, area);
  assert.deepEqual(
    cells,
    [2, 3, 4].flatMap(y => [4, 5, 6].map(x => [x, y])),
  );
  const victim = { x: 4, y: 3, size: 1 };
  assert.equal(spells.pushDestination(grid, { x: 3.5, y: 3.5 }, victim, () => true).x, 6);
  assert.equal(spells.pushDestination(grid, { x: 3.5, y: 3.5 }, victim, at => at.x < 6).x, 5);
  assert.equal(
    spells.pushDestination(grid, { x: 3.5, y: 3.5 }, victim, () => false),
    null,
  );
});

test('el látigo de espinas acerca al objetivo hasta 10 pies hacia quien lanza, sin atravesarlo', () => {
  const grid = { cols: 20, rows: 10, feet: 5 };
  // Caster centred at (2.5, 4.5); target five squares to the east.
  const target = { x: 7, y: 4, size: 1 };
  assert.deepEqual((({ x, y }) => ({ x, y }))(spells.pullDestination(grid, { x: 2.5, y: 4.5 }, target, () => true)), {
    x: 5,
    y: 4,
  });
  // Stops next to the caster: the square the caster stands on does not fit.
  const near = { x: 4, y: 4, size: 1 };
  assert.equal(spells.pullDestination(grid, { x: 2.5, y: 4.5 }, near, at => at.x > 2).x, 3);
  assert.equal(
    spells.pullDestination(grid, { x: 2.5, y: 4.5 }, target, () => false),
    null,
  );
});

test('forced movement rules specify the trigger, source, direction and distance for each spell', () => {
  for (const [id, move, feet, on, from] of [
    ['thunderwave', 'push', 10, 'save', 'caster'],
    ['thorn-whip', 'pull', 10, 'hit', 'caster'],
    ['lightning-lure', 'pull', 10, 'save', 'caster'],
    ['grasping-vine', 'pull', 20, 'save', 'point'],
    ['thunderous-smite', 'push', 10, 'save', 'caster'],
    ['gust', 'push', 5, 'save', 'caster'],
    ['gust-of-wind', 'push', 15, 'save', 'line'],
    ['dust-devil', 'push', 10, 'save', 'point'],
    ['pulse-wave', 'push', 15, 'save', 'caster'],
    ['gravity-sinkhole', 'pull', 5, 'save', 'point'],
    ['gravity-fissure', 'pull', 10, 'save', 'line'],
  ])
    assert.deepEqual(spells.forcedMove(id), { move, feet, on, from }, id);
  for (const id of ['fireball', 'eldritch-blast', 'disintegrate', 'bane', 'toString', ''])
    assert.equal(spells.forcedMove(id), null, id);
});

test('pushes and pulls use 5, 15 and 20 feet on a 5-foot grid', () => {
  const target = { x: 8, y: 4, size: 1 };
  for (const feet of [5, 15, 20]) {
    const pushed = spells.pushDestination(grid, { x: 2.5, y: 4.5 }, target, () => true, feet);
    const pulled = spells.pullDestination(grid, { x: 2.5, y: 4.5 }, target, () => true, feet);
    assert.deepEqual(pushed, { ...target, x: 8 + feet / 5 });
    assert.deepEqual(pulled, { ...target, x: 8 - feet / 5 });
  }
  assert.equal(
    spells.pushDestination(grid, { x: 2.5, y: 4.5 }, target, () => true, 0),
    null,
  );
});

test('Gust of Wind pushes along the line direction rather than radially, snapping to eight directions', () => {
  const target = { x: 7, y: 8, size: 1 };
  const meta = { origin: { x: 2.5, y: 4.5 }, dir: 0, length: 60 };
  assert.deepEqual(
    spells.forcedDestination(grid, 'gust-of-wind', meta, target, () => true),
    {
      ...target,
      x: 10,
    },
  );
  assert.deepEqual(
    spells.forcedDestination(grid, 'gust-of-wind', { ...meta, dir: Math.PI / 3 }, target, () => true),
    {
      ...target,
      x: 10,
      y: 11,
    },
  );
  // A direction also works when the token is centred on the origin.
  assert.equal(spells.pushDestination(grid, { x: 7.5, y: 8.5 }, target, () => true, 15, 0).x, 10);
  assert.equal(spells.pullDestination(grid, { x: 7.5, y: 8.5 }, target, () => true, 5, Math.PI).x, 6);
});

test('point movement uses the vine or area centre and pulls stop before crossing it', () => {
  const target = { x: 5, y: 4, size: 1 };
  const meta = { origin: { x: 1.5, y: 4.5 }, point: { x: 12.5, y: 4.5 } };
  assert.deepEqual(
    spells.forcedDestination(grid, 'grasping-vine', meta, target, () => true),
    { ...target, x: 9 },
  );
  assert.deepEqual(
    spells.forcedDestination(grid, 'gravity-sinkhole', meta, target, () => true),
    { ...target, x: 6 },
  );
  assert.deepEqual(
    spells.forcedDestination(grid, 'dust-devil', meta, target, () => true),
    { ...target, x: 3 },
  );
  const near = { ...meta, point: { x: 6.1, y: 4.5 } };
  assert.equal(
    spells.forcedDestination(grid, 'grasping-vine', near, target, () => true),
    null,
  );
  assert.deepEqual(
    spells.forcedDestination(grid, 'grasping-vine', { ...meta, point: { x: 6.5, y: 4.5 } }, target, () => true),
    { ...target, x: 6 },
  );
  assert.equal(
    spells.forcedDestination(grid, 'gravity-sinkhole', meta, { ...target, x: 12 }, () => true),
    null,
  );
});

test('Gravity Fissure pulls toward the nearest point on its finite line and stops at it', () => {
  const meta = { origin: { x: 2.5, y: 4.5 }, dir: 0, length: 50 };
  const target = { x: 7, y: 8, size: 1 };
  assert.deepEqual(
    spells.forcedDestination(grid, 'gravity-fissure', meta, target, () => true),
    { ...target, y: 6 },
  );
  assert.deepEqual(
    spells.forcedDestination(grid, 'gravity-fissure', meta, { ...target, y: 5 }, () => true),
    {
      ...target,
      y: 4,
    },
  );
  assert.equal(
    spells.forcedDestination(grid, 'gravity-fissure', meta, { ...target, y: 4 }, () => true),
    null,
  );
  // Beyond the end, pull toward the endpoint, rather than the infinite line.
  assert.deepEqual(
    spells.forcedDestination(grid, 'gravity-fissure', meta, { ...target, x: 15, y: 7 }, () => true),
    {
      ...target,
      x: 13,
      y: 5,
    },
  );
  const vertical = { ...meta, dir: Math.PI / 2 };
  assert.deepEqual(
    spells.forcedDestination(grid, 'gravity-fissure', vertical, target, () => true),
    {
      ...target,
      x: 5,
    },
  );
});

test('nearest point on a segment handles diagonal projections, endpoints and a zero-length segment', () => {
  const start = { x: 2, y: 2 },
    end = { x: 6, y: 6 };
  assert.deepEqual(spells.nearestPointOnSegment({ x: 2, y: 6 }, start, end), { x: 4, y: 4 });
  assert.deepEqual(spells.nearestPointOnSegment({ x: 0, y: 0 }, start, end), start);
  assert.deepEqual(spells.nearestPointOnSegment({ x: 8, y: 8 }, start, end), end);
  assert.deepEqual(spells.nearestPointOnSegment({ x: 8, y: 8 }, start, start), start);
});

test('legacy movement metadata falls back to the caster and leaves other spells alone', () => {
  const meta = { origin: { x: 2.5, y: 4.5 } };
  const target = { x: 8, y: 4, size: 1 };
  for (const id of ['thunderwave', 'thorn-whip', 'grasping-vine', 'dust-devil', 'gust-of-wind', 'gravity-fissure']) {
    const rule = spells.forcedMove(id);
    const move = rule.move === 'pull' ? spells.pullDestination : spells.pushDestination;
    assert.deepEqual(
      spells.forcedDestination(grid, id, meta, target, () => true),
      move(grid, meta.origin, target, () => true, rule.feet),
      id,
    );
  }
  assert.equal(
    spells.forcedDestination(grid, 'fireball', meta, target, () => true),
    null,
  );
  assert.equal(
    spells.forcedDestination(grid, 'gust', {}, target, () => true),
    null,
  );
});

test('longer movement checks each step and stops at creatures, map edges and walls', () => {
  const bc = require('../board-core.js');
  const target = { x: 5, y: 4, size: 1 };
  const terrain = bc.cells(grid, '');
  const other = { x: 8, y: 4, size: 1 };
  const fits = at => bc.roomFor(grid, terrain, at, [other]);
  assert.equal(spells.pushDestination(grid, { x: 2.5, y: 4.5 }, target, fits, 20).x, 7);
  assert.equal(spells.pullDestination(grid, { x: 12.5, y: 4.5 }, target, fits, 20).x, 7);
  assert.equal(spells.pushDestination(grid, { x: 2.5, y: 4.5 }, { ...target, x: 18 }, fits, 20).x, 19);
  const walls = [[7, 3, 7, 6]];
  const clear = (at, prior) =>
    spells.unobstructed({ x: prior.x + 0.5, y: prior.y + 0.5 }, { x: at.x + 0.5, y: at.y + 0.5 }, walls);
  assert.equal(spells.pushDestination(grid, { x: 2.5, y: 4.5 }, target, clear, 20).x, 6);
  assert.equal(spells.pullDestination(grid, { x: 12.5, y: 4.5 }, target, clear, 20).x, 6);
  assert.equal(
    spells.forcedDestination(
      grid,
      'grasping-vine',
      { origin: { x: 2, y: 2 }, point: { x: 12.5, y: 4.5 } },
      target,
      clear,
    ).x,
    6,
  );
});
