const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { load, fixture } = require('./load');

test('journal drafts survive a failed save and a failed snapshot cannot block a later save', () => {
  const g = load([]);
  const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const initial = { notes: 'old', log: [] };
  const header = {},
    status = {},
    draft = 'dnd-draft-v1:sheet:notes';
  Object.assign(g, {
    KEY: 'sheet',
    BACKUP: 'sheet-previous',
    state: initial,
    rawBroken: null,
    storageIssue: '',
    history: [],
    clone: structuredClone,
    $: () => header,
    toast() {},
    render() {},
    Cloud: { changed() {}, backup() {} },
    TableUI: { watch() {} },
    Effects: { sync() {} },
    R: { validate() {} },
    document: { querySelector: () => status },
  });
  const store = g.localStorage;
  store.setItem('sheet', JSON.stringify(initial));
  store.setItem(draft, 'new');
  let failKey = 'sheet';
  g.localStorage = {
    ...store,
    setItem(key, value) {
      if (key === failKey) throw new DOMException('quota', 'QuotaExceededError');
      store.setItem(key, value);
    },
  };
  vm.runInContext(app.slice(app.indexOf('function persist('), app.indexOf('function download(')), g);
  vm.runInContext(app.slice(app.indexOf('const AUTOSAVE'), app.indexOf('function journal(')), g);
  g.flushNotes();
  assert.equal(JSON.parse(store.getItem('sheet')).notes, 'old');
  assert.equal(store.getItem(draft), 'new');
  assert.match(status.textContent, /No se pudo guardar/);
  failKey = 'sheet-previous';
  g.flushNotes();
  assert.equal(JSON.parse(store.getItem('sheet')).notes, 'new');
  assert.equal(store.getItem(draft), null);
  assert.equal(status.textContent, 'Guardado.');
});

test('bulk import adds copies and rolls back if a local write fails', () => {
  const g = load();
  const sheet = g.Rules.validate(fixture('wizard-3.json'));
  const existing = g.CharacterStorage.add(sheet);
  const imported = g.CharacterStorage.addMany([sheet, { ...sheet, name: 'Rin' }]);
  assert.equal(new Set([existing, ...imported]).size, 3);
  assert.equal(g.CharacterStorage.list().length, 3);

  const store = g.localStorage;
  let added = '';
  g.localStorage = {
    ...store,
    setItem(key, value) {
      if (added) throw new DOMException('quota', 'QuotaExceededError');
      added = key;
      store.setItem(key, value);
    },
  };
  assert.throws(() => g.CharacterStorage.addMany([sheet, sheet]), /quota/);
  assert.equal(g.CharacterStorage.list().length, 3);
  assert.equal(store.getItem(added), null);
});
