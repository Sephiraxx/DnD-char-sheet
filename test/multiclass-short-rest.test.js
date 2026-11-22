const test = require('node:test');
const assert = require('node:assert/strict');
const { load, fixture, LOGIC } = require('./load');

test('one short rest spends two types of Hit Dice and applies Song of Rest and time once', () => {
  const g = load([...LOGIC, 'party-ui.js']);
  g.state = g.Rules.validate({
    ...fixture('wizard-3.json'),
    hp: 1,
    hdSpent: 0,
    multiclass: [{ classId: 'fighter', level: 1, subclass: '', notes: '' }],
  });
  g.Effects.add(g.state, { name: 'Efecto', rounds: 900 });
  g.sign = String;
  g.field = (label, key) => key;
  g.button = () => '';
  g.R = g.Rules;
  g.number = (fd, key, min, max) => {
    const n = Number(fd.get(key));
    assert.ok(Number.isInteger(n) && n >= min && n <= max);
    return n;
  };
  g.commit = (label, fn) => fn(g.state);
  g.modal = (title, html, submit) => {
    assert.match(html, /count-6/);
    assert.match(html, /count-10/);
    submit(
      new Map([
        ['count-6', '1'],
        ['rolls-6', '2'],
        ['count-10', '1'],
        ['rolls-10', '3'],
        ['song', '4'],
      ]),
    );
  };
  const con = g.Rules.stats(g.state).mods.con;
  require('vm').runInContext('PartyUI.shortRest()', g);
  assert.equal(g.state.hdSpent, 2);
  assert.equal(g.state.hdSpentByDie[6], 1);
  assert.equal(g.state.hdSpentByDie[10], 1);
  assert.equal(g.state.hp, 1 + Math.max(0, 2 + con) + Math.max(0, 3 + con) + 4);
  assert.equal(g.Effects.list(g.state)[0].rounds, 300);
});
