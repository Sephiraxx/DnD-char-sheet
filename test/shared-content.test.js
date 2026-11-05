const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { load, fixture } = require('./load');
const { attacks } = require('../tools/build-shared-content.js');

function paladin(g, level) {
  const s = fixture('wizard-3.json');
  Object.assign(s, {
    classId: 'paladin',
    level,
    classSubclass: 'paladin-oath-of-the-open-sea',
    abilities: { str: 16, dex: 10, con: 14, int: 10, wis: 10, cha: 16 },
    campaignSources: ['PHB', 'TDCSR'],
    known: [],
    prepared: [],
    extras: [],
  });
  return g.Rules.validate(s);
}

test('fresh users receive shared native content without browser storage or a personal import', () => {
  const g = load();
  assert.equal(typeof g.indexedDB, 'undefined');
  assert.equal(typeof g.LibraryStore, 'undefined');
  assert.equal(g.Catalog.spells.length, 526);
  assert.equal(g.ClassData.subclasses.length, 119);
  assert.equal(g.BookContentData.monsters.length, 561);
  assert.equal(g.BookContentData.monsters.filter(m => m.actions.length).length, 315);
  assert.ok(g.Catalog.spells.some(s => s.id === 'freedom-of-the-waves'));
  assert.ok(g.BookContentData.monsters.some(m => m.name === 'Azotamentes'));
});

test('Open Sea is a character-builder subclass and grants its spells at the right class levels', () => {
  const g = load();
  for (const [level, count] of [
    [3, 2],
    [5, 4],
    [9, 6],
    [13, 8],
    [17, 10],
  ]) {
    const s = paladin(g, level);
    const grant = g.Classes.granted(s);
    assert.equal(grant.prepared.length, count, `level ${level}`);
    assert.equal(grant.prepared.includes('freedom-of-the-waves'), level >= 9);
    assert.equal(grant.prepared.includes('freedom-of-the-winds'), level >= 17);
    assert.equal(g.Classes.spellCounts(s).prepared, 0, 'oath spells do not consume normal prepared choices');
    assert.ok(g.Classes.features(s).length);
    assert.ok(g.Rules.stats(s).maxHP > 0);
  }
});

test('DM book settings can enable the new source while existing tables retain their allowed books', () => {
  const g = load();
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'cloud.js'), 'utf8'), g);
  assert.ok(g.CampaignData.defaults.includes('VGM'));
  assert.ok(g.CampaignData.defaults.includes('MPMM'));
  assert.ok(!g.CampaignData.defaults.includes('TDCSR'), 'third-party content requires DM selection');
  assert.ok(g.Cloud.cleanSettings({ sources: ['PHB', 'TDCSR'] }).sources.includes('TDCSR'));
  assert.deepEqual(Array.from(g.Cloud.cleanSettings({ sources: ['PHB'] }).sources), ['PHB']);
  const subclass = g.ClassData.subclasses.find(s => s.id === 'paladin-oath-of-the-open-sea');
  assert.equal(g.Campaign.enabled({ campaignSources: ['PHB'] }, subclass), false);
  assert.equal(g.Campaign.enabled({ campaignSources: ['PHB', 'TDCSR'] }, subclass), true);
});

test('new spells use the normal class lists, spellcasting ability, dice and concentration rules', () => {
  const g = load();
  const waves = g.Catalog.spells.find(s => s.id === 'freedom-of-the-waves');
  const winds = g.Catalog.spells.find(s => s.id === 'freedom-of-the-winds');
  assert.equal(g.Classes.member(waves, { classId: 'sorcerer', level: 5 }), true);
  assert.equal(g.Classes.member(waves, { classId: 'wizard', level: 5 }), false);
  assert.deepEqual(Array.from(waves.dice.dmg[0]), ['2d8', 'contundente']);
  assert.equal(winds.concentration, true);
  assert.equal(winds.level, 5);
  assert.equal(g.Classes.stats(paladin(g, 9)).dc, 15);
});

test('attack conversion verifies numbers and publishes generated damage summaries instead of book prose', () => {
  const page = `AZOTAMENTES\nAberración Mediana\nClase de Armadura: 15\nPuntos de golpe: 71\nVelocidad: 30 pies\nFUE DES CON INT SAB CAR\nACCIONES\nTentáculos. Ataque con arma cuerpo a cuerpo: +7 a impactar, alcance 5 pies, un objetivo. Impacto: 15 (2d10 + 4) de daño psíquico. Si el objetivo es Mediano, queda agarrado.`;
  const [attack] = attacks({ name: 'Azotamentes' }, page);
  assert.equal(attack.atk, 7);
  assert.deepEqual(attack.dmg, [['2d10+4', 'psíquico']]);
  assert.ok(!attack.d.includes('queda agarrado'));
  assert.match(attack.d, /efectos adicionales/);
  assert.equal(attacks({ name: 'Azotamentes' }, page.replace('15 (2d10', '150 (2d10')).length, 0);
});

test('the published bundle contains game entries and metadata, never PDF pages or full book text', () => {
  const g = load();
  assert.ok(g.BookContentData.books.every(b => !('pages' in b) && !('text' in b) && !('relativePath' in b)));
  assert.ok(g.BookContentData.monsters.every(m => m.bundled && !('raw' in m) && !('text' in m)));
  assert.ok(g.BookContentData.books.filter(b => b.edition !== '2014').every(b => !b.sourceKey));
  assert.ok(g.BookContentData.monsters.every(m => m.edition === '2014'));
  const before = g.Catalog.spells.length;
  g.BookContent.apply();
  assert.equal(g.Catalog.spells.length, before, 'loading the bundle twice cannot duplicate entries');
});

test('a fresh DM can select a bundled creature and prepare an encounter without importing files', async () => {
  const g = load();
  let html = '',
    save,
    prepared;
  const listeners = {};
  const box = { innerHTML: '' };
  Object.assign(g, {
    actions: {},
    party: null,
    esc: value => String(value),
    field: () => '',
    select: () => '',
    button: label => label,
    modal: (title, body, submit) => {
      html = body;
      save = submit;
    },
    toast() {},
    int: fd => Number(fd.get('count')),
    document: {
      addEventListener: (type, fn) => (listeners[type] = fn),
      getElementById: id =>
        id === 'monster-results'
          ? box
          : { innerHTML: '', focus() {}, close() {}, classList: { add() {}, remove() {} }, addEventListener() {} },
    },
    addEventListener() {},
    Encounters: { get: () => ({ name: 'Prueba' }), addMonsters: (id, entries) => (prepared = entries) },
  });
  g.window = g;
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'monsters-data.js'), 'utf8'), g);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'monsters-ui.js'), 'utf8'), g);
  await vm.runInContext('MonsterUI.picker("prepared")', g);
  listeners.input({ target: { id: 'monster-q', value: 'azotamentes' } });
  assert.match(html, /bestiary-grid/);
  assert.match(box.innerHTML, /Azotamentes/);
  const m = g.BookContentData.monsters.find(m => m.name === 'Azotamentes');
  g.actions['bes-add']({ dataset: { id: m.id } });
  await g.actions['bes-commit']();
  assert.equal(prepared[0].hp, 71);
  assert.equal(prepared[0].ac, 15);
  assert.equal(prepared[0].saves.int, 7);
  assert.ok(m.actions.some(a => a.atk === 7 && a.dmg[0][0] === '2d10+4'));
});

test('refreshing the private library preserves shared creatures and removes only account imports', async () => {
  const g = load();
  Object.assign(g, {
    LibraryCore: {},
    actions: {},
    Cloud: { enabled: false },
    document: { addEventListener() {} },
    MonsterData: [
      { id: 'srd-wolf' },
      { id: 'bundled', book: 'Manual', bundled: true },
      { id: 'private', book: 'Personal' },
    ],
  });
  g.window = g;
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'library-ui.js'), 'utf8'), g);
  await vm.runInContext('LibraryUI.refresh()', g);
  assert.deepEqual(
    Array.from(g.MonsterData, m => m.id),
    ['srd-wolf', 'bundled'],
  );
});
