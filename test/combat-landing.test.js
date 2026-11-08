// Combate en el celular: arranca compacto sin preferencia guardada, y lo pendiente se dice con nombre.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const { load, fixture } = require('./load');

function combat({ phone = false, saved = null } = {}) {
  const g = load();
  const store = saved === null ? {} : { 'dnd-combat-compact': saved };
  g.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => (store[k] = v) };
  g.matchMedia = () => ({ matches: phone });
  g.R = g.Rules;
  g.esc = x => String(x ?? '');
  g.button = (label, action) => `[${label}|${action}]`;
  g.state = g.Rules.validate(fixture('wizard-3.json'));
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../combat-ui.js'), 'utf8'), g);
  return g;
}

test('sin preferencia, compacto en el celular y completo en la computadora; la preferencia guardada manda', () => {
  assert.equal(vm.runInContext('combatCompactOn()', combat({ phone: true })), true);
  assert.equal(vm.runInContext('combatCompactOn()', combat({ phone: false })), false);
  assert.equal(vm.runInContext('combatCompactOn()', combat({ phone: true, saved: '0' })), false);
  assert.equal(vm.runInContext('combatCompactOn()', combat({ phone: false, saved: '1' })), true);
});

test('las elecciones pendientes se nombran, no un aviso genérico', () => {
  const g = combat();
  const html = vm.runInContext('pendingBanner()', g);
  assert.match(html, /Faltan 3 elecciones:/);
  assert.match(html, /Elegí 3 truco\(s\)/);
  assert.doesNotMatch(html, /Revisá los conjuros y rasgos/);
  assert.match(vm.runInContext('pendingBanner(true)', g), /cc-pending/);
});

test('un guerrero sin conjuros no ve CD ni secciones de conjuros', () => {
  const g = combat();
  const noMagic = { slots: [0, 0, 0], pact: null };
  assert.equal(vm.runInContext('combatHasMagic', g)(noMagic, []), false);
  assert.equal(vm.runInContext('combatHasMagic', g)({ slots: [2], pact: null }, []), true);
  assert.equal(vm.runInContext('combatHasMagic', g)(noMagic, [{ id: 'x' }]), true);
  const src = fs.readFileSync(path.join(__dirname, '../combat-ui.js'), 'utf8');
  assert.match(src, /magic\s*\?\s*`<h3 class="section-space">Tus conjuros<\/h3>/);
});
