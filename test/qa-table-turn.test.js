const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { load, fixture } = require('./load');

test('QA O-08: a subscribed own-turn event opens Combat and resets action tokens; other turns preserve the page', async () => {
  const g = load();
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../party-view.js'), 'utf8'), g);
  g.R = g.Rules;
  g.state = g.Rules.validate(fixture('wizard-3.json'));
  g.KEY = 'qa-turn-character';
  g.clone = structuredClone;
  g.view = 'character';
  g.combatTab = 'reaction';
  g.combatLevel = 'all';
  g.location.hash = 'character';
  g.navigator = {};
  g.toast = () => {};
  g.setTimeout = () => 0;
  g.commit = (label, fn) => fn(g.state);
  const status = { dataset: {}, setAttribute() {} };
  g.document = { getElementById: () => status, addEventListener() {} };
  let receive;
  g.Cloud = {
    enabled: true,
    COMMANDS: [],
    pendingTable: () => null,
    link: () => ({ campaignId: 'qa-table', characterId: 'qa-player' }),
    status: () => 'synced',
    onStatus() {},
    reconcile: async () => ({ action: 'none' }),
    acceptRemote() {},
    subscribe: async (id, callback) => {
      receive = callback;
      return () => {};
    },
    party: async () => ({ characters: [], members: [] }),
    events: async () => [],
    pendingCommands: async () => [],
  };
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../table-ui.js'), 'utf8'), g);
  vm.runInContext('TableUI.boot()', g);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(typeof receive, 'function');
  receive('events', {
    eventType: 'INSERT',
    new: { id: 'qa-my-turn', kind: 'turn', payload: { characterId: 'qa-player', round: 2 } },
  });
  assert.equal(g.location.hash, 'combat');
  assert.equal(g.state.combatState.onTurn, true);
  assert.equal(g.state.combatState.action, null);
  assert.equal(g.combatTab, 'action');
  g.location.hash = 'journal';
  receive('events', {
    eventType: 'INSERT',
    new: { id: 'qa-other-turn', kind: 'turn', payload: { characterId: 'qa-other', name: 'Other' } },
  });
  assert.equal(g.location.hash, 'journal');
  assert.equal(g.state.combatState.onTurn, false);
});
