const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const { load, fixture } = require('./load');

function wizard() {
  const g = load();
  g.state = g.Rules.validate(fixture('wizard-3.json'));
  g.state.slotsSpent[0] = 2;
  g.clone = structuredClone;
  g.toast = () => {};
  g.select = () => '';
  g.field = () => '';
  const error = { textContent: '' },
    listeners = {};
  const host = {
    hidden: true,
    innerHTML: '',
    setAttribute() {},
    addEventListener: (name, fn) => {
      listeners[name] = fn;
    },
    querySelector: name => (name === '#levelup-error' ? error : null),
  };
  g.document = {
    createElement: () => host,
    getElementById: () => null,
    body: { append() {}, classList: { add() {}, remove() {} } },
  };
  g.commit = (label, fn) => {
    const next = structuredClone(g.state);
    fn(next);
    g.state = g.Rules.validate(next);
  };
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../levelup.js'), 'utf8'), g);
  const click = (lv, extra = {}) => listeners.click({ target: { closest: () => ({ dataset: { lv, ...extra } }) } });
  return { g, host, error, click };
}

test('QA L-03: secondary-class wizard confirms a new martial class, matching HP review and preserving spent slots', () => {
  const { g, host, error, click } = wizard();
  const hp = g.Rules.stats(g.state).maxHP;
  vm.runInContext("LevelUp.startFor('barbarian')", g);
  click('next');
  click('next');
  assert.match(host.innerHTML, new RegExp(`PG máximos ${hp} → <b>${hp + 7 + g.Rules.stats(g.state).mods.con}</b>`));
  click('next');
  assert.equal(error.textContent, '');
  assert.equal(host.hidden, true);
  assert.equal(g.state.multiclass[0].classId, 'barbarian');
  assert.equal(g.state.multiclass[0].level, 1);
  assert.equal(g.Rules.stats(g.state).maxHP, hp + 7 + g.Rules.stats(g.state).mods.con);
  assert.equal(g.state.slotsSpent[0], 2);
  assert.equal(g.state.level, 3);
});

test('QA L-09: secondary fighter fourth level offers and applies an ASI independently of primary level', () => {
  const { g, host, error, click } = wizard();
  g.state.multiclass = [{ classId: 'fighter', level: 3, subclass: 'fighter-champion', notes: '' }];
  const str = g.state.abilities.str,
    hp = g.Rules.stats(g.state).maxHP;
  vm.runInContext("LevelUp.startFor('fighter')", g);
  click('next');
  click('next');
  assert.match(host.innerHTML, /Mejora o dote/);
  // The real form's selected values are collected through FormData.
  g.FormData = class {
    has(k) {
      return ['a1', 'a2'].includes(k);
    }
    get() {
      return 'str';
    }
  };
  const original = host.querySelector;
  host.querySelector = name => (name === '#levelup-form' ? {} : original(name));
  click('next');
  click('next');
  if (!host.hidden) click('next');
  assert.equal(error.textContent, '');
  assert.equal(host.hidden, true);
  assert.equal(g.state.multiclass[0].level, 4);
  assert.equal(g.state.abilities.str, str + 2);
  assert.equal(g.Rules.stats(g.state).maxHP, hp + 6 + g.Rules.stats(g.state).mods.con);
  assert.equal(g.state.slotsSpent[0], 2);
});
