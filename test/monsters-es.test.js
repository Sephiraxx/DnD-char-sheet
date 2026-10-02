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

test('el bestiario no tiene texto en inglés en nombres ni descripciones', () => {
  const ENG = /\b(the|and|its|creature|target|saving throw|damage|hit points|feet)\b/;
  const left = [];
  for (const m of M) {
    for (const [n, d] of m.traits) if (ENG.test(n + ' ' + d)) left.push(m.id + ' · ' + n);
    for (const k of ['actions', 'legendary', 'reactions'])
      for (const a of m[k]) if (ENG.test(a.n + ' ' + a.d)) left.push(m.id + ' · ' + a.n);
  }
  assert.equal(left.length, 0, left.slice(0, 5).join('\n'));
  const lich = M.find(x => x.id === 'lich').traits.find(t => /lanzador/.test(t[1]))[1];
  assert.match(lich, /proyectil mágico/, 'las listas de conjuros usan los nombres del catálogo');
});

test('las líneas de estadísticas (velocidad, sentidos, idiomas, defensas, alineamiento) están en español', () => {
  const ENG = /\b(the|and|plus|any|understands|but|can't|speak|knew|from|aren't|wielded|hover|or|while|ft)\b/i;
  const left = [];
  for (const m of M)
    for (const k of ['speed', 'senses', 'lang', 'res', 'imm', 'vuln', 'cimm', 'align', 'skills', 'saves'])
      if (ENG.test(m[k] || '')) left.push(`${m.id}.${k}: ${m[k]}`);
  assert.equal(left.length, 0, left.slice(0, 5).join('\n'));
});
