const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { load, fixture } = require('./load');
const BC = require('../board-core.js');
const Spells = require('../board-spells.js');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));

function setup() {
  const g = load();
  const events = [],
    messages = [];
  Object.assign(g, {
    R: g.Rules,
    state: g.Rules.validate(fixture('wizard-3.json')),
    BoardCore: BC,
    BoardSpells: Spells,
    BoardSceneFX: { colors: { magic: '#fff' }, typeKey: () => 'magic' },
    PartyView: { esc: String },
    URLSearchParams,
    FormData,
    performance: { now: () => 1000 },
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    addEventListener() {},
    document: { body: { classList: { contains: () => false } }, addEventListener() {}, querySelector: () => ({}) },
    actions: {},
    cast() {},
    esc: String,
    sign: n => String(n),
    toast() {},
    commit: (label, fn) => fn(g.state),
    roll: (sides, count = 1) => Array(count).fill(sides),
    Cloud: {
      post: async (...args) => {
        events.push(args);
      },
    },
    TableUI: {
      link: () => ({ campaignId: 'campaign', characterId: 'caster' }),
      targets: () => ({
        selfId: 'caster',
        monsters: [{ id: 'enemy', name: 'Enemigo' }],
        allies: [{ characterId: 'ally', name: 'Aliado' }],
      }),
      sendTo: async (...args) => {
        messages.push(args);
      },
      shareRoll() {},
    },
  });
  g.window = g;
  g.location.search = '';
  g.spellById = id => g.Rules.allSpells(g.state).find(sp => sp.id === id);
  vm.runInContext(read('rolls-ui.js'), g);
  g.RollUI = vm.runInContext('RollUI', g);
  // Expose private geometry/turn entry points only inside this test VM, leaving production API unchanged.
  vm.runInContext(
    read('board.js').replace(
      'window.Board = {',
      `window.Board = {
    test: { configure(h) { H = h; shown = true; }, compactPlan, compactTarget, spellBoardMeta,
      checkZoneTurn, rememberSpellZone },`,
    ),
    g,
  );
  const board = g.Board,
    s = board._state();
  Object.assign(s, {
    id: 'campaign',
    mapId: 'map',
    board: { map_id: 'map' },
    isDM: true,
    sel: 'caster-token',
    grid: BC.normGrid({ cols: 30, rows: 20, feet: 5 }),
    party: { characters: [], combatants: [], encounter: { active: false } },
    channel: {
      send: m => {
        messages.push(m);
      },
    },
    tokens: [
      { id: 'caster-token', character_id: 'caster', map_id: 'map', kind: 'pc', x: 2, y: 5, size: 1 },
      {
        id: 'enemy-token',
        combatant_id: 'enemy',
        map_id: 'map',
        kind: 'monster',
        x: 5,
        y: 5,
        size: 1,
        name: 'Enemigo',
      },
    ],
  });
  s.terrain = BC.cells(s.grid, '');
  const hooks = { actorId: () => 'caster', cast() {}, compactCast: true, spiritualTurn: () => 1 };
  board.test.configure(hooks);
  const selection = id => ({
    sp: g.spellById(id),
    slot: { level: g.spellById(id).level },
    selected: [],
    aim: null,
    object: false,
    excluded: new Set(),
    included: new Set(),
  });
  const tap = (sel, x, y) =>
    board.test.compactTarget(sel, { w: { x: x * g.Miniatures.boardCell, y: y * g.Miniatures.boardCell } }, 1, false);
  return { g, board, s, hooks, selection, tap, events, messages };
}

test('Lightning Lure picks another creature within 15 ft and posts its normal Strength save', async () => {
  const { g, board, s, selection, tap, events } = setup();
  const sel = selection('lightning-lure');
  assert.equal(tap(sel, 2.5, 5.5), false);
  assert.equal(tap(sel, 5.5, 5.5), true);
  const plan = board.test.compactPlan(sel, 1);
  assert.equal(plan.ready, true);
  assert.deepEqual(plain(plan.placement.tokens), ['enemy-token']);
  s.tokens[1].x = 6;
  assert.equal(board.test.compactPlan(sel, 1).ready, false);
  s.tokens[1].x = 5;
  const boardCast = board.test.spellBoardMeta(
    { castId: 'lure', point: plan.placement.point },
    plan.placement.casterBase,
  );
  const form = new FormData();
  form.set('myDamage', '8');
  await g.RollUI.resolveBoardCast(sel.sp, 0, { placement: plan.placement, boardCast, form });
  const request = events.find(e => e[1] === 'creature-save')[2];
  assert.equal(request.ability, 'str');
  assert.equal(request.damage, 8);
  assert.deepEqual(plain(request.targets), [{ id: 'enemy', name: 'Enemigo' }]);
  assert.equal(request.board.origin.x, 2.5);
});

test('Grasping Vine places first, optionally selects within 30 ft of the vine, and lashes again', async () => {
  const { g, board, s, selection, tap, events } = setup();
  const sel = selection('grasping-vine');
  assert.equal(board.test.compactPlan(sel, 1).ready, false);
  assert.equal(tap(sel, 5.5, 5.5), false); // occupied
  assert.equal(tap(sel, 7.5, 5.5), true);
  let p = board.test.compactPlan(sel, 1);
  assert.equal(p.ready, true);
  assert.deepEqual(plain(p.placement.hits), []); // optional
  const empty = await g.RollUI.resolveBoardCast(sel.sp, 4, { placement: p.placement, form: new FormData() });
  assert.match(empty.rows[0], /Enredadera invocada/);
  assert.equal(events.length, 0);
  s.tokens[1].x = 13; // 30 ft from vine, outside caster's 30 ft
  assert.equal(tap(sel, 13.5, 5.5), true);
  p = board.test.compactPlan(sel, 1);
  assert.equal(p.ready, true);
  assert.equal(p.placement.hits[0].combatant, 'enemy');
  assert.deepEqual(plain(p.placement.point), { x: 7.5, y: 5.5 });
  assert.equal(tap(sel, 13.5, 5.5), true); // deselect
  assert.deepEqual(plain(board.test.compactPlan(sel, 1).placement.hits), []);
  s.tokens[1].x = 14;
  assert.equal(tap(sel, 14.5, 5.5), false);
  s.tokens[1].x = 13;
  g.state.concentration = 'grasping-vine';
  s.spellCasts.push({
    id: 'grasping-vine',
    castId: 'vine',
    caster: 'caster-token',
    point: p.placement.point,
    slot: 4,
    until: 10000,
    summonedTurn: 1,
  });
  const uses = [];
  let strike = board.lashGraspingVine('enemy-token', 'vine', hit => uses.push(hit.first));
  assert.equal(strike.first, true);
  s.tokens[0].x = 1; // caster moves; vine does not
  strike = board.lashGraspingVine('enemy-token', 'vine', hit => uses.push(hit.first));
  assert.deepEqual(uses, [true, false]);
  assert.deepEqual(plain(strike.boardCast.point), { x: 7.5, y: 5.5 });
  assert.equal(strike.boardCast.origin.x, 1.5);
  await g.RollUI.resolveBoardCast(sel.sp, 4, {
    placement: { hits: strike.hits },
    boardCast: strike.boardCast,
    form: new FormData(),
  });
  const request = events.find(e => e[1] === 'creature-save')[2];
  assert.equal(request.ability, 'dex');
  assert.equal(request.damage, 0);
  assert.equal(request.board.point.x, 7.5);
  g.state.concentration = null;
  assert.throws(() => board.lashGraspingVine('enemy-token', 'vine'), /activa/);
});

test('Thunderous Smite arms without saving against the caster, consumes once, and uses current caster origin', async () => {
  const { g, board, s, events } = setup();
  const sp = g.spellById('thunderous-smite');
  await g.RollUI.resolveBoardCast(sp, 1, { placement: { hits: [{ character: 'caster' }] }, form: new FormData() });
  assert.equal(events.length, 0);
  g.state.concentration = 'thunderous-smite';
  s.spellCasts.push({ id: sp.id, castId: 'smite', caster: 'caster-token', point: { x: 2.5, y: 5.5 }, until: 10000 });
  vm.runInContext(read('board-player.js'), g);
  await g.BoardPlayer.weaponHit('enemy', { melee: false });
  assert.equal(events.length, 0);
  assert.equal(g.state.concentration, sp.id);
  await g.BoardPlayer.weaponHit('enemy', { melee: true }); // thrown beyond melee reach
  assert.equal(events.length, 0);
  assert.equal(g.state.concentration, sp.id);
  s.tokens[0].x = 4;
  await g.BoardPlayer.weaponHit('enemy', { melee: true });
  const request = events.find(e => e[1] === 'creature-save')[2];
  assert.equal(request.ability, 'str');
  assert.equal(request.dc, g.RollUI.spellStats(sp).dc);
  assert.equal(request.damage, 0); // extra weapon damage is separate
  assert.deepEqual(plain(request.board.origin), { x: 4.5, y: 5.5 });
  assert.equal(g.state.concentration, null);
  await g.BoardPlayer.weaponHit('enemy', { melee: true });
  assert.equal(events.length, 1);
  assert.equal(board.smiteStrike('enemy'), null);
});

test('the weapon attack UI reports confirmed hits and melee reach, leaving misses alone', async () => {
  const { g } = setup();
  const calls = [];
  g.BoardPlayer = { weaponHit: async (...args) => calls.push(args) };
  let hit = true;
  g.TableUI.resolveTarget = async () => ({ hit, name: 'Enemigo' });
  g.RollFX = { show: async () => {} };
  g.characterD20 = () => 15;
  g.FormData = class extends FormData {
    constructor() {
      super();
      this.set('target', 'enemy');
    }
  };
  g.document.querySelector = () => null;
  g.document.querySelectorAll = () => [];
  g.document.getElementById = () => null;
  vm.runInContext(
    read('attack-ui.js').replace(
      'return { choices, install };',
      `return { choices, install, attack,
    reset() { session = { itemId: state.inventory[0].id, mode: 'action', attacks: 0, log: [] }; } };`,
    ),
    g,
  );
  const ui = vm.runInContext('AttackUI', g);
  ui.reset();
  ui.attack();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(plain(calls), [['enemy', { melee: true, reach: 5 }]]);
  hit = false;
  ui.attack();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls.length, 1);
});

test('Vine board lashes include the cast lash and spend only one bonus action on later turns', () => {
  const { g, board, s } = setup();
  g.state.concentration = 'grasping-vine';
  const combat = g.Combat.data(g.state);
  Object.assign(combat, { active: true, onTurn: true, turn: 3, bonus: 'Enredadera' });
  vm.runInContext(
    read('board-player.js').replace('window.BoardPlayer = {', 'window.BoardPlayer = { testHooks: hooks,'),
    g,
  );
  board.test.configure(g.BoardPlayer.testHooks);
  s.spellCasts.push({
    id: 'grasping-vine',
    castId: 'vine',
    caster: 'caster-token',
    point: { x: 7.5, y: 5.5 },
    slot: 4,
    until: 10000,
    summonedTurn: 3,
  });
  const prepare = g.BoardPlayer.testHooks.prepareVineLash;
  assert.equal(board.lashGraspingVine('enemy-token', 'vine', prepare).first, true);
  assert.throws(() => board.lashGraspingVine('enemy-token', 'vine', prepare), /Ya usaste/);
  Object.assign(combat, { turn: 4, bonus: null });
  assert.equal(board.lashGraspingVine('enemy-token', 'vine', prepare).first, false);
  assert.equal(combat.bonus, 'Enredadera');
  assert.throws(() => board.lashGraspingVine('enemy-token', 'vine', prepare), /Ya usaste/);
});

test('Dust Devil requires a free square, waits for turn end, and posts its save from the zone centre once', async () => {
  const { g, board, s, selection, tap, events } = setup();
  const sel = selection('dust-devil');
  assert.equal(board.test.compactPlan(sel, 1).ready, false);
  assert.equal(tap(sel, 5.5, 5.5), false);
  assert.equal(tap(sel, 6.5, 5.5), true);
  const p = board.test.compactPlan(sel, 1).placement;
  assert.deepEqual(plain(p.tokens), []);
  assert.deepEqual(plain(p.area.origin), { x: 6.5, y: 5.5 });
  const zone = g.RollUI.zoneRoll(sel.sp, 2);
  assert.equal(zone.formula, '1d8');
  assert.equal(zone.ability, 'str');
  assert.equal(zone.half, true);
  assert.equal(zone.types, 'contundente');
  const cast = {
    id: sel.sp.id,
    name: sel.sp.name,
    castId: 'dust',
    caster: p.caster,
    point: p.point,
    area: p.area,
    concentration: true,
    zone: { ...zone, rounds: 10, expiry: Date.now() + 60000, excluded: [], included: [] },
  };
  board.test.rememberSpellZone(cast);
  g.state.concentration = 'dust-devil';
  const result = await g.RollUI.resolveBoardCast(sel.sp, 2, {
    placement: p,
    boardCast: { zone: true },
    form: new FormData(),
  });
  assert.match(result.rows[0], /Zona activa/);
  assert.equal(events.length, 0);
  board.test.checkZoneTurn(s.tokens[1], 'start', 'turn');
  assert.equal(events.length, 0);
  board.test.checkZoneTurn(s.tokens[1], 'end', 'turn');
  board.test.checkZoneTurn(s.tokens[1], 'end', 'turn');
  assert.equal(events.length, 1);
  const request = events[0][2];
  assert.equal(events[0][1], 'spell-zone-trigger');
  assert.deepEqual(plain(request.board.point), { x: 6.5, y: 5.5 });
  assert.equal(request.ability, 'str');
  assert.equal(request.half, true);
  assert.equal(request.formula, '1d8');
});

test('failed movement saves reach forcedDestination; successes leave the token where it is', async () => {
  for (const [id, point, expectedX] of [
    ['lightning-lure', { x: 5.5, y: 5.5 }, 3],
    ['grasping-vine', { x: 10.5, y: 5.5 }, 9],
    ['thunderous-smite', { x: 2.5, y: 5.5 }, 7],
    ['dust-devil', { x: 6.5, y: 5.5 }, 3],
  ]) {
    const { g, board, s } = setup();
    const poses = [];
    g.Cloud.board = async () => ({ board: s.board, maps: [{ id: 'map', grid: s.grid }], tokens: s.tokens });
    g.Cloud.poseTokens = async (...args) => {
      poses.push(args);
    };
    const request = { spellId: id, board: { map: 'map', castId: id, origin: { x: 2.5, y: 5.5 }, point } };
    await board.resolveSpellSave('other-view', request, { combatant: 'enemy' }, { saved: true });
    assert.equal(poses.length, 0, id);
    await board.resolveSpellSave('other-view', request, { combatant: 'enemy' }, { saved: false });
    assert.equal(poses.length, 1, id);
    assert.equal(poses[0][2][0].patch.x, expectedX, id);
  }
});

test('resolved Smite saves add prone to characters and combatants only on failure, preserving existing conditions', async () => {
  const { g } = setup();
  const request = { spellId: 'thunderous-smite', spell: 'Castigo atronador', ability: 'str', dc: 15, damage: 0 };
  Object.assign(g, {
    link: () => null,
    applyCommand() {},
    tracker: () => ({ entries: [{ id: 'enemy', hp: 20, max: 20, saves: { str: 0 }, conditions: ['Envenenado'] }] }),
    send: async () => {},
  });
  const table = read('table-ui.js');
  vm.runInContext(table.slice(table.indexOf('function resolveAreaSave('), table.indexOf('function areaSave(')), g);
  g.state.conditions = ['Envenenado'];
  let out = g.resolveAreaSave(request, { roll: { kept: 20, total: 20 }, silent: true });
  assert.equal(out.success, true);
  assert.deepEqual(plain(g.state.conditions), ['Envenenado']);
  out = g.resolveAreaSave(request, { roll: { kept: 2, total: 2 }, silent: true });
  assert.equal(out.success, false);
  assert.deepEqual(plain(g.state.conditions), ['Envenenado', 'Derribado']);
  const patches = [];
  g.Cloud.updateCombatant = async (id, patch) => patches.push({ id, patch });
  const dm = read('dm.js');
  vm.runInContext(dm.slice(dm.indexOf('async function resolveSave('), dm.indexOf('const STATUS_LABEL')), g);
  const req = { id: 'request', payload: { ...request, targets: [{ id: 'enemy', name: 'Enemigo' }] } };
  await g.resolveSave(req, 'enemy', 20);
  assert.equal(patches.length, 0);
  await g.resolveSave(req, 'enemy', 2);
  assert.deepEqual(plain(patches), [{ id: 'enemy', patch: { conditions: ['Envenenado', 'Derribado'] } }]);
});

test('Dust Devil save resolution halves damage on success and reports failure to the board', async () => {
  const { g } = setup();
  const boardResults = [];
  Object.assign(g, {
    link: () => ({ campaignId: 'campaign', characterId: 'caster' }),
    applyCommand: ({ payload }) => {
      g.state.hp -= payload.amount;
    },
    BoardPlayer: {
      resolveSpellSave: async (...args) => {
        boardResults.push(args);
      },
    },
  });
  const table = read('table-ui.js');
  vm.runInContext(table.slice(table.indexOf('function resolveAreaSave('), table.indexOf('function areaSave(')), g);
  const p = {
    spellId: 'dust-devil',
    spell: 'Diablo de polvo',
    ability: 'str',
    dc: 15,
    damage: 8,
    types: 'contundente',
    half: true,
    board: { point: { x: 6.5, y: 5.5 } },
  };
  const start = g.state.hp;
  let out = g.resolveAreaSave(p, { roll: { kept: 20, total: 20 }, silent: true });
  await out.done;
  assert.equal(g.state.hp, start - 4);
  assert.equal(boardResults[0][3].saved, true);
  g.state.hp = start;
  out = g.resolveAreaSave(p, { roll: { kept: 2, total: 2 }, silent: true });
  await out.done;
  assert.equal(g.state.hp, start - 8);
  assert.equal(boardResults[1][3].saved, false);
});
