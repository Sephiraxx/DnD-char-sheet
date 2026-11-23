const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./load');

const g = load(['dm-initiative.js', 'cloud.js']);
const sequence = values => Array.from(g.DmInitiative.sequence(values));
const base = {
  mode: 'alternating',
  players: ['second', 'representative', 'last'],
  monsters: ['enemy', 'other'],
  roller: 'representative',
  partyTotal: 19,
  dmTotal: 12,
};

test('side initiative alternates from the winning side in each side’s chosen order', () => {
  assert.deepEqual(sequence(base), ['second', 'enemy', 'representative', 'other', 'last']);
  assert.deepEqual(sequence({ ...base, dmTotal: 20 }), ['enemy', 'second', 'other', 'representative', 'last']);
  assert.throws(() => sequence({ ...base, dmTotal: base.partyTotal }), /empate/);
  assert.deepEqual(sequence({ ...base, dmTotal: base.partyTotal, tie: 'dm' }), [
    'enemy',
    'second',
    'other',
    'representative',
    'last',
  ]);
});

test('boss initiative promotes the nominated player only if the party wins', () => {
  const boss = { ...base, mode: 'boss', monsters: ['enemy'] };
  assert.deepEqual(sequence(boss), ['representative', 'enemy', 'second', 'last']);
  assert.deepEqual(sequence({ ...boss, partyTotal: 10 }), ['enemy', 'second', 'representative', 'last']);
  assert.throws(() => sequence({ ...boss, monsters: base.monsters }), /un enemigo/);
});

test('the tracker sorts a saved order separately from the dice totals', () => {
  const list = [
    { id: 'enemy', init: 15, turn_priority: 0.2 },
    { id: 'representative', init: 12, turn_priority: 0.1 },
    { id: 'second', init: 19, turn_priority: 0.3 },
    { id: 'last', init: null },
  ];
  assert.deepEqual(
    Array.from(g.Cloud.order(list), c => c.id),
    ['representative', 'enemy', 'second', 'last'],
  );
  assert.deepEqual(
    Array.from(g.Cloud.order(list.map(c => ({ ...c, turn_priority: null }))), c => c.id),
    ['second', 'enemy', 'representative', 'last'],
  );
});
