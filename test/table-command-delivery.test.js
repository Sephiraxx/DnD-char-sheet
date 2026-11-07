const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { load, fixture } = require('./load');

async function setup(saved) {
  const g = load();
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../party-view.js'), 'utf8'), g);
  g.R = g.Rules;
  g.state = g.Rules.validate(saved || fixture('wizard-3.json'));
  g.KEY = 'delivery-test';
  g.view = 'character';
  g.history = [];
  g.clone = structuredClone;
  g.navigator = {};
  g.toast = () => {};
  g.setTimeout = () => 0;
  g.render = () => {};
  g.document = { getElementById: () => ({ open: false, dataset: {}, setAttribute() {} }), addEventListener() {} };
  const control = { pending: [], calls: [], failCommit: false, upload: true, receive: null };
  g.commit = (label, fn) => {
    if (control.failCommit) throw Error('temporary write failure');
    const next = structuredClone(g.state);
    fn(next);
    g.state = g.R.validate(next);
    control.calls.push('commit');
  };
  g.Cloud = {
    enabled: true,
    COMMANDS: ['damage', 'heal'],
    pendingTable: () => null,
    link: () => ({ campaignId: 'table', characterId: 'player' }),
    status: () => 'synced',
    onStatus() {},
    reconcile: async () => ({ action: 'none' }),
    acceptRemote() {},
    subscribe: async (id, fn) => {
      control.receive = fn;
      return () => {};
    },
    party: async () => ({ characters: [], members: [] }),
    events: async () => [],
    pendingCommands: async () => control.pending,
    flush: async () => {
      control.calls.push('flush');
      return control.upload;
    },
    markApplied: async ids => {
      control.calls.push('ack:' + ids.join(','));
    },
  };
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../table-ui.js'), 'utf8'), g);
  vm.runInContext('TableUI.boot()', g);
  await new Promise(resolve => setImmediate(resolve));
  return { g, control, sync: () => control.receive('resync', {}) };
}
const damage = (id = 1, payload = { amount: 6 }) => ({ id, kind: 'damage', target_character: 'player', payload });

test('the uploaded character retains the command receipt if a new device catches an unacknowledged delivery', async () => {
  const first = await setup(),
    start = first.g.state.hp;
  first.control.pending = [damage()];
  await first.sync();
  const second = await setup(JSON.parse(JSON.stringify(first.g.state)));
  second.control.pending = [damage(), damage()];
  await second.sync();
  assert.equal(second.g.state.hp, start - 6);
  assert.ok(second.control.calls.includes('ack:1,1'));
  assert.ok(!second.control.calls.includes('commit'));
});

test('missed realtime damage catches up without reloading and duplicate deliveries apply once', async () => {
  const { g, control, sync } = await setup(),
    start = g.state.hp;
  control.pending = [damage()];
  await sync();
  assert.equal(g.state.hp, start - 6);
  assert.deepEqual(control.calls.slice(0, 3), ['commit', 'flush', 'ack:1']);
  await sync();
  await control.receive('events', { eventType: 'INSERT', new: damage() });
  assert.equal(g.state.hp, start - 6);
});

test('a failed command remains pending for recovery instead of being acknowledged and lost', async () => {
  const { g, control, sync } = await setup(),
    start = g.state.hp;
  control.pending = [damage()];
  control.failCommit = true;
  await sync();
  assert.equal(g.state.hp, start);
  assert.ok(!control.calls.some(x => x.startsWith('ack:')));
  control.failCommit = false;
  await sync();
  assert.equal(g.state.hp, start - 6);
  assert.ok(control.calls.includes('ack:1'));
});

test('an interrupted HP upload retries acknowledgement without subtracting damage again', async () => {
  const { g, control, sync } = await setup(),
    start = g.state.hp;
  control.pending = [damage()];
  control.upload = false;
  await sync();
  assert.equal(g.state.hp, start - 6);
  assert.ok(!control.calls.some(x => x.startsWith('ack:')));
  control.upload = true;
  await sync();
  assert.equal(g.state.hp, start - 6);
  assert.ok(control.calls.includes('ack:1'));
});

test('unconfirmed HP retains pending damage, and typed resistance plus temporary HP apply on recovery', async () => {
  const { g, control, sync } = await setup(),
    start = g.state.hp;
  g.state.hp = null;
  g.state.raceId = 'dwarf-hill-PHB';
  g.state.temp = 3;
  control.pending = [damage(2, { amount: 10, type: 'poison' })];
  await sync();
  assert.ok(!control.calls.some(x => x.startsWith('ack:')));
  g.state.hp = start;
  await sync();
  assert.equal(g.state.hp, start - 2);
  assert.equal(g.state.temp, 0);
});
