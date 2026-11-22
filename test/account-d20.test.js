const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');

const app = readFileSync(join(__dirname, '../app.js'), 'utf8');
const diceFunctions = app.slice(app.indexOf('function roll(sides'), app.indexOf('function number(fd'));

test('the character profile affects d20 checks and the base roller still uses one sample', () => {
  let rate = 0;
  const draws = [3, 0, 0, 8, 2, 5, 2];
  const context = vm.createContext({
    KEY: 'sheet',
    window: { Cloud: { checkDiceRate: () => rate } },
    crypto: { getRandomValues: () => [draws.shift()] },
  });
  vm.runInContext(diceFunctions, context);
  assert.equal(context.rollD20()[0], 4);
  rate = 1;
  assert.equal(context.rollD20()[0], 9);
  assert.equal(context.rollD20()[0], 3);
  assert.equal(context.roll(20)[0], 3);
  assert.equal(draws.length, 0);
});
