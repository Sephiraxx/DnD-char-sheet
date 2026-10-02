const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { translate, name, text } = require('../tools/monsters-es.js');

const ctx = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'monsters-data.js'), 'utf8'), { window: ctx });
const M = ctx.MonsterData;

test('los monstruos están en español y conservan el nombre en inglés', () => {
  assert.ok(
    M.every(m => m.english),
    'todos tienen english',
  );
  const by = id => M.find(m => m.id === id);
  assert.equal(by('wolf').name, 'Lobo');
  assert.equal(by('adult-red-dragon').name, 'Dragón rojo adulto');
  assert.equal(by('giant-spider').name, 'Araña gigante');
  assert.equal(by('swarm-of-rats').name, 'Enjambre de ratas');
  assert.equal(by('wolf').speed, '40 pies');
  assert.match(by('adult-red-dragon').saves, /DES \+6/);
});

test('las fórmulas de ataque se traducen sin perder los números', () => {
  const t = text(
    'Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 7 (2d4 + 2) piercing damage plus 3 (1d6) fire damage.',
  );
  assert.equal(
    t,
    'Ataque con arma cuerpo a cuerpo: +4 al ataque, alcance 5 pies, un objetivo. Impacto: 7 (2d4 + 2) de daño perforante más 3 (1d6) de daño de fuego.',
  );
  assert.equal(name('Werewolf, Hybrid Form'), 'Hombre lobo (forma híbrida)');
  assert.equal(name('Copper Dragon Wyrmling'), 'Cría de dragón de cobre');
});

test('traducir dos veces no cambia nada (los datos estructurados quedan iguales)', () => {
  const m = M.find(x => x.id === 'goblin');
  assert.equal(translate(m), m);
  assert.ok(m.actions.every(a => Array.isArray(a.dmg) || a.dmg === undefined));
});
