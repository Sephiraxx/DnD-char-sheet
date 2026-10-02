const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const { load, fixture } = require('./load');

function renderer() {
  const g = load();
  g.R = g.Rules;
  g.state = g.Rules.validate(fixture('wizard-3.json'));
  g.esc = x =>
    String(x ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
  g.sign = n => (n >= 0 ? '+' : '') + n;
  g.header = () => '';
  g.button = () => '';
  g.Portrait = { card: () => '' };
  g.MulticlassUI = { label: s => g.Classes.label(s) };
  g.EquipmentUI = { panel: () => '' };
  g.Campaign.sheetOrigins = () => '';
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../party-ui.js'), 'utf8'), g);
  return g;
}

test('QA M-09: character card shows effective magic score and preserves the written ability', () => {
  const g = renderer();
  const written = g.state.abilities.con;
  const item = {
    id: 'qa-amulet',
    name: 'Amuleto de salud',
    qty: 1,
    magic: g.MagicItems.fromCatalog('amulet-of-health'),
  };
  item.magic.attuned = true;
  g.state.inventory.push(item);
  const html = vm.runInContext('PartyUI.character()', g);
  assert.match(html, /Constitución<\/span><strong>\+4<\/strong><span>Puntuación 19 \(objeto\)/);
  assert.equal(g.state.abilities.con, written);
});

test('QA N-07: physical ability cards match active beast checks; mental abilities and original HP remain', () => {
  const g = renderer();
  g.state.classId = 'druid';
  g.state.classSubclass = 'druid-circle-of-the-moon';
  const hp = g.Rules.stats(g.state).maxHP;
  g.Companions.startWildShape(g.state, {
    id: 'wolf',
    name: 'Lobo',
    type: 'bestia',
    cr: 0.25,
    ac: 13,
    hp: 11,
    speed: '40 pies',
    ab: [12, 15, 12, 3, 12, 6],
    actions: [],
  });
  const html = vm.runInContext('PartyUI.character()', g);
  assert.match(html, /Fuerza<\/span><strong>\+1<\/strong><span>Puntuación 12 \(bestia\)/);
  assert.match(html, /Constitución<\/span><strong>\+1<\/strong><span>Puntuación 12 \(bestia\)/);
  assert.match(html, /Inteligencia<\/span><strong>\+3<\/strong><span>Puntuación 17/);
  assert.equal(g.Rules.stats(g.state).maxHP, hp);
});

test('QA K-03/L-03: minimum HP gain uses effective Constitution for both main and secondary classes', () => {
  const g = load();
  const s = g.Rules.validate(fixture('wizard-3.json'));
  s.level = 2;
  s.abilities.con = 3;
  s.hp = 1;
  const magic = g.MagicItems.fromCatalog('amulet-of-health');
  magic.attuned = true;
  s.inventory.push({
    id: 'qa-health',
    name: 'Amuleto de salud',
    qty: 1,
    category: 'Tesoro',
    notes: '',
    location: '',
    weight: null,
    magic,
  });
  const before = g.Rules.stats(s).maxHP;
  const primary = g.Classes.levelUp(s, { hpMethod: 'rolled', hpRoll: 1 });
  const secondary = g.Classes.levelUpSecondary(s, { classId: 'fighter', hpMethod: 'rolled', hpRoll: 1 });
  assert.equal(g.Rules.stats(primary).maxHP - before, 5, '1 rolled HP + effective CON +4');
  assert.equal(g.Rules.stats(secondary).maxHP - before, 5, 'same effective CON when adding another class');
  assert.equal(primary.abilities.con, 3);
});
