// Libros de cada ficha: con cuáles se creó, cuáles tiene ahora y cada cambio, para verlos en el Diario.
const test = require('node:test');
const assert = require('node:assert/strict');
const { load, fixture } = require('./load');

test('cada cambio de libros queda registrado con lo que se agregó y lo que se quitó', () => {
  const g = load();
  const s = g.Rules.validate(fixture('wizard-3.json'));
  const before = g.Campaign.selected(s).slice();
  s.campaignSources = ['PHB', 'XGE', 'MPMM'];
  const text = g.Campaign.recordBooks(s, before, 'ficha');
  assert.match(text, /\+ Mordenkainen Presents/);
  assert.match(text, /− El caldero de Tasha/);
  assert.equal(s.booksHistory.length, 1);
  assert.equal(s.booksHistory[0].by, 'ficha');
  assert.equal(g.Campaign.recordBooks(s, g.Campaign.selected(s).slice(), 'ficha'), '', 'sin cambios no se registra');
  s.createdWith = { date: new Date().toISOString(), sources: before, level: 3, table: 'Los Halcones' };
  const ok = g.Rules.validate(s);
  assert.equal(ok.createdWith.table, 'Los Halcones');
  assert.throws(() => g.Rules.validate({ ...s, createdWith: { sources: 'PHB' } }), /creación inválido/);
  assert.throws(
    () => g.Rules.validate({ ...s, booksHistory: [{ date: 'x', added: [], removed: [], by: 'otro' }] }),
    /libros inválido/,
  );
});

test('la tarjeta del Diario muestra creación, libros actuales, diferencias y lo que habilita cada libro', () => {
  const g = load();
  g.button = (label, action) => `[${label}|${action}]`;
  g.esc = v => String(v ?? '');
  const s = g.Rules.validate(fixture('wizard-3.json'));
  s.createdWith = { date: '2026-11-01T12:00:00.000Z', sources: ['PHB', 'XGE'], level: 1 };
  s.campaignSources = ['PHB', 'TCE'];
  const html = g.Campaign.booksCard(s);
  assert.match(html, /Creada/);
  assert.match(html, /con 2 libro\(s\):.*Manual del Jugador 2014.*Guía de Xanathar para todo/);
  assert.match(html, /Habilitados ahora<\/b> \(2\)/);
  assert.match(html, /agregados desde entonces: El caldero de Tasha/);
  assert.match(html, /quitados: Guía de Xanathar/);
  assert.match(html, /\[Cambiar libros\|campaign-sources\]/);
  const tasha = g.Campaign.allowedByBook(s).find(b => b.id === 'TCE');
  const subs = tasha.kinds.find(k => k.label === 'Subclases de tu clase');
  assert.ok(subs.names.some(n => /Bladesinging|Canto de la espada|Hoja/i.test(n)) || subs.names.length > 0);
  const old = g.Campaign.booksCard({ ...s, createdWith: undefined });
  assert.match(old, /se creó antes de que se guardara/);
});
