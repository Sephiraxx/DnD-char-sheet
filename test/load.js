// Carga los scripts del navegador en un contexto de Node, en el mismo orden que index.html.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const LOGIC = [
  'catalog.js',
  'class-data.js',
  'names-es.js',
  'campaign-data.js',
  'equipment-data.js',
  'equipment.js',
  'class-rules.js',
  'party-store.js',
  'combat-engine.js',
  'effects.js',
  'rules.js',
  'attacks.js',
  'campaign.js',
  'creation-skills.js',
];

function load(files = LOGIC) {
  const store = new Map();
  const context = {
    console,
    crypto: require('crypto').webcrypto,
    structuredClone,
    setTimeout,
    clearTimeout,
    localStorage: {
      getItem: k => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: k => store.delete(k),
      clear: () => store.clear(),
    },
    location: { reload() {} },
  };
  context.globalThis = context;
  vm.createContext(context);
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), context, { filename: f });
  return context;
}

const fixture = name => JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf8'));

module.exports = { load, fixture };
