const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { load, fixture } = require('./load');
const g = load();
g.esc = v =>
  String(v ?? '').replace(
    /[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
g.MulticlassUI = { label: (s, verbose) => g.Classes.label(s, verbose) };
vm.runInContext(fs.readFileSync(path.join(__dirname, '../print-sheet.js'), 'utf8'), g);
const print = () => vm.runInContext('PrintSheet.html()', g);

test('QA: printable sheets render all 13 classes with attacks, skills, resources and gear', () => {
  for (const [id, c] of Object.entries(g.ClassData.classes)) {
    g.state = g.Rules.validate(fixture('wizard-3.json'));
    Object.assign(g.state, {
      classId: id,
      level: 3,
      classSubclass: '',
      known: [],
      prepared: [],
      classChoices: {},
      classSpent: {},
      hpBase: c.die + 2 * (c.die / 2 + 1),
    });
    const html = print();
    for (const label of [
      'Características',
      'Habilidades',
      'Combate',
      'Ataques',
      'Competencias',
      'Rasgos y dotes',
      'Equipo',
    ])
      assert.ok(html.includes(label), id + ': ' + label);
    assert.ok(!/NaN|undefined/.test(html), id);
    assert.ok(html.includes(String(g.Rules.stats(g.state).maxHP)), id);
  }
});

test('QA: imported character names and notes are escaped in the printable sheet', () => {
  g.state = g.Rules.validate(fixture('wizard-3.json'));
  g.state.name = '<img src=x onerror=alert(1)>';
  g.state.notes = '<script>alert(1)</script>';
  const html = print();
  assert.ok(!html.includes('<img src=x'));
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
});
