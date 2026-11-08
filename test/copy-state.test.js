// Dónde está guardada cada ficha: las mismas palabras en Personajes, Mi ficha, la portada y el pie.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
function world(store, cloud) {
  const localStorage = {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => (store[k] = String(v)),
    removeItem: k => delete store[k],
  };
  const ctx = vm.createContext({
    localStorage,
    console,
    Date,
    JSON,
    setTimeout,
    addEventListener() {},
    document: { addEventListener() {} },
  });
  ctx.PartyView = { esc: s => String(s) };
  ctx.CharacterStorage = { list: () => [] };
  ctx.Cloud = cloud;
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'account.js'), 'utf8') + ';this.AccountUI = AccountUI;', ctx);
  return ctx.AccountUI;
}
const state = s => ({ copyState: () => ({ table: '', account: '', at: '', pending: false, ...s }) });

test('cada ficha dice si está solo acá, en la cuenta o en una mesa', () => {
  const two = new Date(Date.now() - 120000).toISOString();
  assert.equal(world({}, state({})).copyLabel('k').text, 'Solo en este dispositivo');
  assert.equal(world({}, state({ account: 'email', at: two })).copyLabel('k').text, 'Copia en tu cuenta · hace 2 min');
  assert.equal(
    world({}, state({ account: 'email', at: two, pending: true })).copyLabel('k').text,
    'Copia en tu cuenta · cambios por subir',
  );
  assert.equal(world({}, state({ table: 'Halcones' })).copyLabel('k').text, 'En la mesa «Halcones»');
  assert.match(world({}, state({ account: 'browser' })).copyLabel('k').text, /creá una cuenta/);
});

test('la cuenta se ofrece fuera de Mesa y sin hablar de «ficha en una mesa»', () => {
  const account = fs.readFileSync(path.join(ROOT, 'account.js'), 'utf8');
  assert.doesNotMatch(account, /¿Ya tenés una ficha en una mesa\?/);
  assert.match(account, /¿Ya tenés una cuenta\?/);
  const party = fs.readFileSync(path.join(ROOT, 'party-ui.js'), 'utf8');
  assert.match(party, /data-action="account"/);
  assert.doesNotMatch(party, /Las demás quedan en este navegador/);
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.match(html, /id="copy-footer"/);
});
