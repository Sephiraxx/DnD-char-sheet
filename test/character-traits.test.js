const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const { load } = require('./load');

function cleric(g, extra = {}) {
  return g.Rules.validate({
    ...g.Rules.initial(),
    name: 'Clériga de la Forja',
    classId: 'cleric',
    classSubclass: 'cleric-forge-domain',
    level: 3,
    raceId: 'dwarf-hill-PHB',
    backgroundId: 'mercenary-veteran-SCAG',
    abilities: { str: 12, dex: 10, con: 14, int: 12, wis: 16, cha: 10 },
    proficiencies: ['medicine', 'athletics', 'religion', 'persuasion'],
    campaignSources: ['PHB', 'XGE', 'SCAG'],
    prepared: [],
    ...extra,
  });
}

test('hill dwarf Forge cleric has visible class, race and mercenary traits with their actual sources', () => {
  const g = load(),
    s = cleric(g),
    before = JSON.stringify(s);
  const rows = g.Campaign.characterTraits(s);
  for (const name of [
    'Bendición de la forja',
    'Canalizar divinidad',
    'Expulsar muertos vivientes',
    'Canalizar divinidad: bendición del artesano',
    'Resistencia enana',
    'Afinidad con la piedra',
    'Dureza enana',
    'Vida de mercenaria',
  ]) {
    const row = rows.find(r => r.name === name);
    assert.ok(row, name);
    assert.ok(row.book?.text, name + ' missing full book rules');
    assert.ok(row.text.length > 30, name + ' missing visible description');
  }
  assert.equal(new Set(rows.map(r => r.key)).size, rows.length);
  assert.match(rows.find(r => r.name === 'Vida de mercenaria').origin, /SCAG/);
  assert.match(rows.find(r => r.name === 'Vida de mercenaria').text, /estilo de vida cómodo/);
  assert.match(rows.find(r => r.name === 'Bendición de la forja').origin, /XGE/);
  assert.match(rows.find(r => r.name === 'Dureza enana').text, /\+3 PG/);
  // Ficha vieja: pregunta una vez si los PG ya incluían la Dureza enana.
  assert.match(rows.find(r => r.name === 'Dureza enana').note, /ya incluyen este bono/);
  assert.deepEqual(
    [...rows.find(r => r.name === 'Dureza enana').actions.map(a => a[1])],
    ['trait-hp-included', 'trait-hp-add'],
  );
  assert.match(rows.find(r => r.name === 'Bendición de la forja').note, /Sin bendecir/);
  assert.match(rows.find(r => r.name.includes('bendición del artesano')).text, /100 po/);
  assert.equal(JSON.stringify(s), before, 'reading traits must preserve saved HP, AC and choices');
  assert.ok(!rows.some(r => ['Alma de la forja', 'Golpe divino', 'Golpes benditos'].includes(r.name)));
});

test('Stonecunning is a conditional History roll, without granting blanket History expertise', () => {
  const g = load(),
    s = cleric(g);
  assert.equal(g.Campaign.stonecunning(s), 5);
  assert.equal(g.Rules.skillBonus(s, 'history'), 1);
  for (const [id, bonus] of [
    ['medicine', 5],
    ['athletics', 3],
    ['religion', 3],
    ['persuasion', 2],
  ])
    assert.equal(g.Rules.skillBonus(s, id), bonus);
  assert.equal(g.Campaign.stonecunning(cleric(g, { raceId: 'human-base-PHB' })), null);
  assert.equal(g.Campaign.stonecunning(cleric(g, { level: 5 })), 7);
});

test('Forge spell grants, rituals, poison resistance and shared Channel Divinity remain consistent with displayed traits', () => {
  const g = load(),
    s = cleric(g);
  const identify = g.Catalog.spells.find(sp => sp.english === 'Identify');
  assert.ok(g.Classes.granted(s).prepared.includes(identify.id));
  assert.equal(g.Classes.ritualAllowed(s, identify), true);
  assert.equal(g.Classes.spellCounts(s).prepared, 0);
  assert.equal(g.Defenses.apply(s, [{ amount: 11, type: 'poison' }]).total, 5);
  const resource = g.Classes.resources(s).find(r => r.id === 'channel');
  assert.equal(resource.max, 1);
  assert.equal(resource.reset, 'short');
  assert.match(g.Campaign.characterTraits(s).find(r => r.name === 'Canalizar divinidad').text, /1 uso\(s\)/);
  g.Classes.spend(s, 'channel', 1);
  g.Classes.reset(s, 'short');
  assert.equal(g.Classes.spent(s, resource), 0);
});

test('traits follow current identity, class level and multiclass views without relying on library cache', () => {
  const g = load(),
    s = cleric(g, {
      level: 1,
      multiclass: [{ classId: 'wizard', level: 2, subclass: 'wizard-school-of-evocation', spells: [], prepared: [] }],
    });
  let rows = g.Campaign.characterTraits(s);
  assert.ok(rows.some(r => r.key.startsWith('class:wizard:')));
  assert.ok(rows.some(r => r.name === 'Bendición de la forja'));
  assert.ok(!rows.some(r => r.name === 'Canalizar divinidad'));
  s.raceId = 'warforged-base-ERLW';
  s.backgroundId = 'acolyte-PHB';
  s.classSubclass = '';
  rows = g.Campaign.characterTraits(s);
  assert.ok(rows.some(r => r.name === 'Constructed Resilience' && /poison/.test(r.text)));
  assert.ok(rows.some(r => r.key.startsWith('background:acolyte-PHB:')));
  assert.ok(!rows.some(r => ['Dureza enana', 'Vida de mercenaria', 'Bendición de la forja'].includes(r.name)));
});

test('Stonecunning button opens the normal roll dialog with its conditional +5 bonus', () => {
  const g = load();
  g.R = g.Rules;
  g.state = cleric(g);
  g.actions = {};
  g.sign = n => (n >= 0 ? '+' : '') + n;
  g.esc = String;
  g.field = () => '';
  g.modal = (title, html) => (g.dialog = { title, html });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'rolls-ui.js'), 'utf8'), g);
  vm.runInContext('RollUI.install()', g);
  g.actions['stonecunning-roll']();
  assert.equal(g.dialog.title, 'Afinidad con la piedra');
  assert.match(g.dialog.html, /Bono: <b>\+5<\/b>/);
});
