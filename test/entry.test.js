const test = require('node:test');
const assert = require('node:assert/strict');
const { Entry } = { Entry: (require('../entry.js'), globalThis.Entry) };

const storage = (data = {}) => ({ getItem: k => (k in data ? data[k] : null) });
const at = path => 'https://ejemplo.github.io/DnD-char-sheet/' + path;

test('portada: quien llega por primera vez la ve', () => {
  assert.equal(Entry.decide(at(''), storage()), null);
  assert.equal(Entry.decide(at('index.html'), storage()), null);
  assert.equal(
    Entry.decide(at('?utm_source=reddit&fbclid=x'), storage()),
    null,
    'los parámetros de campañas no cuentan',
  );
});

test('portada: quien ya usa la app va al inicio', () => {
  for (const data of [
    { 'dnd-entered-v1': '1' },
    { 'dnd-cloud-auth': '{"access_token":"x"}' },
    { 'dnd-party-index-v1': '[{"id":"a","key":"dnd-character-a"}]' },
    { 'dnd-cloud-dm-v1': '[{"id":"m"}]' },
    { 'dnd-pending-table-v1': '{"campaignId":"m"}' },
    { 'darien-voss-2014-v1': '{}' },
  ])
    assert.equal(Entry.decide(at(''), storage(data)), './app.html', JSON.stringify(data));
  assert.equal(Entry.decide(at(''), storage({ 'dnd-party-index-v1': '[]', 'dnd-cloud-dm-v1': 'roto' })), null);
  assert.equal(Entry.decide(at('?portada'), storage({ 'dnd-entered-v1': '1' })), null, '«?portada» la muestra igual');
});

test('portada: los enlaces a la app van directo a la ficha, conservando todo', () => {
  assert.equal(Entry.decide(at('#journal'), storage()), './app.html#journal');
  assert.equal(Entry.decide(at('index.html?abrir#combat'), storage()), './app.html?abrir#combat');
  assert.equal(
    Entry.decide(at('?aliado=abc#combat'), storage({ 'dnd-entered-v1': '1' })),
    './app.html?aliado=abc#combat',
  );
  assert.equal(Entry.decide(at('?cuenta=crear'), storage()), './app.html?cuenta=crear');
  assert.equal(Entry.decide(at('#'), storage()), null, 'un # vacío no es un enlace');
  assert.equal(Entry.decide(at('#funciones'), storage()), null, 'los anclas de la portada se quedan');
  assert.equal(Entry.decide(at('#access_token=x&type=recovery'), storage()), './app.html#access_token=x&type=recovery');
});

test('portada: sin acceso al almacenamiento, se ve la portada', () => {
  const broken = {
    getItem: () => {
      throw Error('bloqueado');
    },
  };
  assert.equal(Entry.knownVisitor(broken), false);
  assert.equal(Entry.decide(at(''), broken), null);
});
