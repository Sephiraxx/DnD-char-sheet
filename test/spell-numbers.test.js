// Números de los conjuros (campo «dice» del catálogo), orden de habilidades y valores pasivos.
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('vm');
const fs = require('fs');
const path = require('path');
const { load, fixture } = require('./load');

const g = load();
const R = g.Rules;
const sp = id => R.spells.find(x => x.id === id);
const dice = (id, opts) => R.spellDice(sp(id), opts);

test('cada conjuro con números menciona sus dados principales en el texto', () => {
  const missing = [];
  for (const s of R.spells) {
    const D = s.dice;
    if (!D) continue;
    const text = s.brief + ' ' + s.text;
    const main = [...(D.dmg || []).map(r => r[0]), ...(D.heal ? [D.heal[0]] : []), ...(D.temp ? [D.temp] : [])]
      .filter(x => /d/.test(x))
      .map(x => x.split('+')[0]);
    for (const d of main) if (!new RegExp('(^|\\D)' + d + '(?!\\d)').test(text)) missing.push(s.id + ' ' + d);
  }
  assert.deepEqual(missing, []);
});

test('los textos no remiten al libro para los números', () => {
  const vague = R.spells.filter(s =>
    /aumenta con tu nivel|según el conjuro|indicad[oa] por el conjuro|reglas especiales|un espacio mayor aumenta/i.test(
      s.text + ' ' + s.brief,
    ),
  );
  assert.deepEqual(
    Array.from(vague, s => s.id),
    [],
  );
});

test('trucos: los dados suben en los niveles 5, 11 y 17', () => {
  assert.equal(dice('fire-bolt', { level: 1 }).rows[0].dice, '1d10');
  assert.equal(dice('fire-bolt', { level: 5 }).rows[0].dice, '2d10');
  assert.equal(dice('fire-bolt', { level: 11 }).rows[0].dice, '3d10');
  assert.equal(dice('fire-bolt', { level: 20 }).rows[0].dice, '4d10');
  // Doblar por los muertos: d8, o d12 si está herido; ambos suben.
  const toll = Array.from(dice('toll-the-dead', { level: 11 }).rows, r => r.dice);
  assert.deepEqual(toll, ['3d8', '3d12']);
  // Burla dañina (identificador antiguo de la ficha de bardo).
  assert.equal(dice('mockery', { level: 17 }).rows[0].dice, '4d4');
});

test('hojas: daño extra al impactar y daño secundario por nivel', () => {
  const b1 = dice('booming-blade', { level: 1 }),
    b5 = dice('booming-blade', { level: 5 });
  assert.equal(b1.extra, null);
  assert.equal(b1.rows[0].dice, '1d8');
  assert.equal(b5.extra.n, 1);
  assert.equal(b5.rows[0].dice, '2d8');
  const lines = R.spellNumbers(sp('green-flame-blade'), { level: 11, mod: 4 });
  assert.match(lines[0], /2d8 de daño de fuego extra/);
  assert.match(lines[1], /2d8 \+ 4 de daño de fuego/);
});

test('espacio superior: dados por nivel, cada dos niveles y con tope', () => {
  assert.equal(dice('fireball', { slot: 3 }).rows[0].dice, '8d6');
  assert.equal(dice('fireball', { slot: 5 }).rows[0].dice, '10d6');
  assert.equal(dice('cure', { slot: 3 }).heal.dice, '3d8');
  // Arma espiritual: +1d8 cada dos niveles por encima de 2.
  assert.equal(dice('spiritual-weapon', { slot: 3 }).rows[0].dice, '1d8');
  assert.equal(dice('spiritual-weapon', { slot: 4 }).rows[0].dice, '2d8');
  // Lluvia de espinas: como máximo 6d10.
  assert.equal(dice('hail-of-thorns', { slot: 9 }).rows[0].dice, '6d10');
  // Cuchillo de hielo: la mejora es para el frío, no para el perforante.
  assert.deepEqual(
    Array.from(dice('ice-knife', { slot: 3 }).rows, r => r.dice),
    ['1d10', '4d6'],
  );
  // Espíritus guardianes: radiante o necrótico, la mejora vale para ambos.
  assert.deepEqual(
    Array.from(dice('spirit-guardians', { slot: 5 }).rows, r => r.dice),
    ['5d8', '5d8'],
  );
  // Brazos de Hadar sube 1d6 (no 2d6) por nivel.
  assert.equal(dice('arms-of-hadar', { slot: 2 }).rows[0].dice, '3d6');
});

test('proyectiles: dardos y rayos por espacio o por nivel', () => {
  assert.equal(dice('magic-missile', { slot: 1 }).count, 3);
  assert.equal(dice('magic-missile', { slot: 4 }).count, 6);
  assert.equal(dice('scorching-ray', { slot: 3 }).count, 4);
  assert.equal(dice('eldritch-blast', { level: 11 }).count, 3);
});

test('las frases evitan confundir el daño de fuerza con la característica', () => {
  const line = R.spellNumbers(sp('spiritual-weapon'), { slot: 2, mod: 3 })[0];
  assert.equal(line, '1d8 + 3 de daño de fuerza.');
  assert.equal(R.spellNumbers(sp('fireball'), { slot: 4 })[0], 'Con espacio de nivel 4: 9d6 de daño de fuego.');
});

test('la tirada de conjuro usa los números del catálogo', () => {
  g.R = R;
  g.state = R.validate(fixture('wizard-3.json'));
  g.state.level = 5;
  g.spellById = id => R.allSpells(g.state).find(x => x.id === id);
  for (const file of ['party-ui.js', 'rolls-ui.js'])
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), g);
  const info = vm.runInContext('RollUI.spellInfo', g);
  assert.equal(info(sp('fire-bolt'), 0).dice, '2d10');
  assert.equal(info(sp('burning-hands'), 3).dice, '5d6');
  // Las filas que se suman se tiran juntas.
  assert.equal(info(sp('ice-storm'), 4).dice, '2d8+4d6');
  assert.equal(info(sp('cure'), 2).dice, '2d8');
  assert.equal(info(sp('cure'), 2).addMod, true);
});

test('habilidades en orden alfabético, como en la hoja', () => {
  const names = Array.from(R.skills, x => x[1]);
  assert.deepEqual(
    names,
    [...names].sort((a, b) => a.localeCompare(b, 'es')),
  );
  assert.equal(names[0], 'Acrobacias');
  assert.equal(names.at(-1), 'Trato con animales');
});

test('percepción pasiva: 10 + bono, y +5 con Observador', () => {
  const s = R.validate(fixture('wizard-3.json'));
  const base = 10 + R.skillBonus(s, 'perception');
  assert.equal(R.passive(s, 'perception'), base);
  s.progression.learnedFeats.push('observant');
  g.FeatFX.onGain(s, 'observant', { ability: 'int' });
  assert.equal(R.passive(R.validate(s), 'perception'), base + 5);
  assert.equal(R.passive(s, 'insight'), 10 + R.skillBonus(s, 'insight'));
});
