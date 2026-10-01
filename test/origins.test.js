const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('vm');
const { load, fixture } = require('./load');

const g = load();
const E = vm.runInContext('Equipment', g);
const D = g.CampaignData;
const wizard = () => g.Rules.validate(fixture('wizard-3.json'));

test('libros 2014 hasta The Book of Many Things, iguales en el catálogo y en las mesas', () => {
  const books = Object.keys(D.sources);
  for (const k of ['VGM', 'MPMM', 'EEPC', 'MOT', 'VRGR', 'FTD', 'AAG', 'DSotDQ', 'BGG', 'SatO', 'BMT'])
    assert.ok(books.includes(k), k);
  assert.ok(!books.includes('XPHB'));
  assert.deepEqual([...g.Catalog.sources.map(([k]) => k)].sort(), [...books].sort());
});

test('razas y trasfondos sin ids repetidos y con fuente habilitable', () => {
  const ids = new Set();
  for (const x of [...D.races, ...D.backgrounds]) {
    assert.ok(!ids.has(x.id), 'repetido: ' + x.id);
    ids.add(x.id);
    assert.ok(D.sources[x.source], x.id + ' sin libro ' + x.source);
  }
  assert.ok(D.races.some(r => r.id === 'tabaxi-base-MPMM'));
  assert.ok(D.backgrounds.some(b => b.id === 'rune-carver-BGG'));
});

test('las marcas de dragón quitan el rasgo que reemplazan', () => {
  const storm = D.races.find(r => r.id === 'half-elf-variant-mark-of-storm-ERLW');
  assert.equal(storm.skillProficiencies, undefined);
  const winged = D.races.find(r => r.id === 'tiefling-variant-winged-SCAG');
  assert.equal(winged.additionalSpells, undefined);
});

test('armadura natural de los linajes nuevos', () => {
  const s = wizard();
  s.abilities.dex = 14;
  s.raceId = 'lizardfolk-base-MPMM';
  assert.equal(E.defense(s).total, 15);
  s.raceId = 'tortle-base-TTP';
  assert.equal(E.defense(s).total, 17);
});
