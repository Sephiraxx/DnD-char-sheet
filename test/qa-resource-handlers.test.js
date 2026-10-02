const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('vm');
const fs = require('fs');
const path = require('path');
const { load } = require('./load');

function handlers(classId) {
  const g = load();
  g.R = g.Rules;
  g.state = g.R.validate({ ...g.R.initial(), classId, classSubclass: '', level: 5, classResourcesConfirmed: true });
  g.state.hp = 1;
  g.state.hpBase = 50;
  g.actions = {};
  for (const k of ['field', 'select', 'button', 'area']) g[k] = () => '';
  g.esc = String;
  g.sign = n => (n >= 0 ? '+' : '') + n;
  g.number = (fd, key, min, max) => {
    const n = Number(fd.get(key));
    if (!Number.isInteger(n) || n < min || n > max) throw Error('Invalid field ' + key);
    return n;
  };
  g.modal = (title, html, save) => {
    g.dialog = { title, html, save };
  };
  g.commit = (label, edit) => {
    const s = structuredClone(g.state);
    edit(s);
    g.state = g.R.validate(s);
  };
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../party-ui.js'), 'utf8'), g);
  vm.runInContext('PartyUI.install()', g);
  g.Combat.start(g.state);
  return g;
}
test('QA I-01: Bardic Inspiration spends a use and a bonus action, then returns on a short rest at level five', () => {
  const g = handlers('bard');
  g.state.abilities.cha = 16;
  g.state.inspirationSpent = 0;
  g.state.proficiencies = [];
  g.state.expertise = [];
  assert.equal(
    g.R.skillBonus(g.state, 'stealth'),
    g.R.mod(g.R.scores(g.state).dex) + 1,
    'Jack of All Trades adds half of proficiency +3, rounded down',
  );
  g.Combat.inspiration(g.state, 'inspired', 'QA ally', 0);
  assert.equal(g.state.inspirationSpent, 1);
  assert.ok(g.state.combatState.bonus);
  assert.throws(() => g.Combat.inspiration(g.state, 'inspired', 'QA other ally', 0), /Ya usaste/);
  g.Classes.reset(g.state, 'short');
  assert.equal(g.state.inspirationSpent, 0);
});
const form = values => ({ get: key => values[key] ?? null });
for (const [classId, id, action] of [
  ['barbarian', 'rage', 'bonus'],
  ['fighter', 'second-wind', 'bonus'],
  ['fighter', 'action-surge', 'free'],
  ['monk', 'ki', 'bonus'],
  ['sorcerer', 'sorcery', 'bonus'],
  ['cleric', 'channel', 'action'],
]) {
  test('QA I-01: actual resource handler spends ' + id + ' and its chosen action', () => {
    const g = handlers(classId);
    if (id === 'action-surge') g.Combat.use(g.state, 'action', 'Atacar');
    g.actions['class-resource']({ dataset: { id } });
    g.dialog.save(form({ cost: 1, action, roll: 5 }));
    assert.equal(g.state.classSpent[id], 1);
    if (action !== 'free') assert.ok(g.state.combatState[action]);
    if (id === 'rage') assert.equal(g.state.raging, true);
    if (id === 'second-wind') assert.equal(g.state.hp, 11);
    if (id === 'action-surge') {
      assert.equal(g.state.combatState.action, null);
      assert.equal(g.state.combatState.surgeUsed, true);
      g.Combat.use(g.state, 'action', 'Second attack');
      assert.throws(() => g.Combat.use(g.state, 'action', 'Third attack'), /Ya usaste/);
    }
    const r = g.Classes.resources(g.state).find(x => x.id === id);
    g.Classes.reset(g.state, r.reset);
    assert.equal(g.state.classSpent[id], 0);
  });
}
