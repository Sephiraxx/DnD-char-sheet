const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('vm');
const fs = require('fs');
const path = require('path');
const { load, fixture } = require('./load');

function ui() {
  const g = load();
  g.R = g.Rules;
  g.state = g.R.validate(fixture('wizard-3.json'));
  g.spellById = id => g.R.allSpells(g.state).find(sp => sp.id === id);
  for (const file of ['party-ui.js', 'rolls-ui.js'])
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), g);
  return g;
}
for (const classId of ['wizard', 'cleric', 'druid', 'bard', 'sorcerer']) {
  test('QA J-02/J-03/J-04: spell manager enforces ' + classId + ' repertoire limits', () => {
    const g = ui();
    const s = g.R.validate({ ...g.R.initial(), classId, classSubclass: '', level: 3 });
    s.known = [];
    s.prepared = [];
    s.secretKnown = [];
    g.state = structuredClone(s);
    const stats = g.R.stats(s),
      mode = g.Classes.casting(s).type;
    const limit = mode === 'known' ? stats.known : stats.prepared;
    const choices = g.Catalog.spells.filter(sp => sp.level === 1 && sp.sourceKey === 'PHB' && g.Classes.member(sp, s));
    assert.ok(choices.length > limit);
    s.known = choices.slice(0, limit).map(sp => sp.id);
    if (mode !== 'known') s.prepared = s.known.slice();
    assert.doesNotThrow(() => vm.runInContext('PartyUI.validateRepertoire(draft)', Object.assign(g, { draft: s })));
    s.known.push(choices[limit].id);
    if (mode !== 'known') s.prepared.push(choices[limit].id);
    assert.throws(() => vm.runInContext('PartyUI.validateRepertoire(draft)', g), /Superás (tus|los) conjuros/);
  });
}
test('QA G-03/G-04: upcast Magic Missile and level-five Eldritch Blast show correct darts and beams', () => {
  const g = ui();
  g.state.level = 5;
  const info = vm.runInContext('RollUI.spellInfo', g);
  const missile = info(
    g.Catalog.spells.find(sp => sp.english === 'Magic Missile'),
    3,
  );
  assert.equal(missile.dice, '5d4+5');
  assert.match(missile.notes.join(' '), /5 dardos de 1d4 \+ 1/);
  const blast = info(
    g.Catalog.spells.find(sp => sp.english === 'Eldritch Blast'),
    0,
  );
  assert.equal(blast.dice, '1d10');
  assert.match(blast.notes.join(' '), /2 rayo/);
});
test('QA L-05: wizard eight / cleric one gets the ninth-level multiclass slot table', () => {
  const g = load();
  const s = g.Rules.validate(fixture('wizard-3.json'));
  s.level = 8;
  s.multiclass = [{ classId: 'cleric', level: 1, subclass: 'cleric-life-domain', spells: [], prepared: [] }];
  assert.deepEqual([...g.Rules.stats(s).slots], [4, 3, 3, 3, 1]);
});
test('QA K-05: ASI supports both distributions and rejects scores over twenty', () => {
  const g = load();
  const s = g.Rules.validate(fixture('wizard-3.json'));
  s.classId = 'fighter';
  s.classSubclass = 'fighter-champion';
  s.abilities.str = 18;
  const choice = { hpMethod: 'fixed', asi: 'scores', a1: 'str', a2: 'str' };
  assert.equal(g.Classes.levelUp(s, choice).abilities.str, 20);
  assert.equal(g.Classes.levelUp(s, { ...choice, a2: 'dex' }).abilities.str, 19);
  s.abilities.str = 19;
  assert.throws(() => g.Classes.levelUp(s, choice), /superar 20/);
});

test('QA G-07: a second concentration spell replaces the first and removes its linked local effect', () => {
  const g = load();
  const s = g.Rules.validate(fixture('wizard-3.json'));
  const first = g.Catalog.spells.find(sp => sp.english === 'Detect Magic');
  const second = g.Catalog.spells.find(sp => sp.english === 'Hold Person');
  s.extras.push(first.id, second.id);
  g.Combat.cast(s, first, 1);
  g.Effects.fromSpell(s, first);
  g.Combat.cast(s, second, 2);
  g.Effects.sync(s);
  assert.equal(s.concentration, second.id);
  assert.ok(!g.Effects.list(s).some(e => e.concentration === first.id));
});
test('QA G-09: the 2014 bonus-action spell restriction is enforced in both casting orders', () => {
  const g = load();
  const s = g.Rules.validate(fixture('wizard-3.json'));
  const bonus = g.Catalog.spells.find(sp => sp.english === 'Healing Word');
  const leveled = g.Catalog.spells.find(sp => sp.english === 'Magic Missile');
  const cantrip = g.Catalog.spells.find(sp => sp.english === 'Fire Bolt');
  s.extras.push(bonus.id, leveled.id, cantrip.id);
  g.Combat.start(s);
  g.Combat.cast(s, bonus, 1);
  assert.match(g.Combat.spellBlock(s, leveled), /solo podés lanzar.*truco/);
  assert.equal(g.Combat.spellBlock(s, cantrip), '');
  g.Combat.cast(s, cantrip, 0);
  g.Combat.start(s);
  g.Combat.cast(s, leveled, 1);
  assert.match(g.Combat.spellBlock(s, bonus), /impide lanzar/);
});
test('QA J-03: Life domain spells remain usable and do not consume the prepared limit', () => {
  const g = load();
  const s = g.Rules.validate({
    ...g.Rules.initial(),
    classId: 'cleric',
    classSubclass: 'cleric-life-domain',
    level: 3,
  });
  const domain = g.Classes.granted(s).prepared;
  assert.ok(domain.length >= 4);
  s.prepared = domain.slice();
  assert.equal(g.Classes.spellCounts(s).prepared, 0);
  for (const id of domain) assert.ok(g.Classes.usable(s).includes(id));
});
test('QA K-11: War Caster selects advantage in the actual concentration dialog', () => {
  const g = ui();
  g.state.progression.learnedFeats.push('war-caster');
  g.state.concentration = 'detect-magic';
  g.Combat.data(g.state).checks = [10];
  g.actions = {};
  g.sign = String;
  g.esc = String;
  g.field = () => '';
  g.modal = (title, html) => {
    g.dialog = { title, html };
  };
  vm.runInContext('RollUI.install()', g);
  g.actions['concentration-roll']();
  assert.match(g.dialog.html, /name="adv" value="adv" checked/);
});
