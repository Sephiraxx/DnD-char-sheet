const test = require('node:test');
const assert = require('node:assert/strict');
const { load, fixture } = require('./load');
const g = load(),
  M = g.Miniatures;
test('la miniatura parte de la ficha y viaja en la hoja y su resumen público', () => {
  require('vm').runInContext(
    require('fs').readFileSync(require('path').join(__dirname, '../party-view.js'), 'utf8'),
    g,
  );
  const s = g.Rules.validate(fixture('wizard-3.json'));
  assert.equal(g.PartyView.summarize(s).miniature, null);
  const m = M.initial({ ...s, raceId: 'elf-high-PHB', classId: 'bard', persona: { height: '1,82 m' } });
  assert.deepEqual([m.race, m.height, m.gear], ['elf', 182, 'lute']);
  s.miniature = { ...m, race: 'orc', gender: 'woman', gear: 'axe', facing: 360 };
  const pc = g.Rules.validate(JSON.parse(JSON.stringify(s)));
  const summary = g.PartyView.summarize(pc);
  assert.equal(g.PartyView.rowSummary({ name: s.name, summary }).miniature.gear, 'axe');
  assert.equal(g.PartyView.rowSummary({ data: pc }).miniature.gender, 'woman');
  assert.equal(summary.miniature.height, 182);
  assert.equal(summary.miniature.facing, 0);
  assert.equal(M.clean({ gear: 'unknown', height: -1 }).gear, 'none');
});
test('todas las razas y armas se dibujan con geometría finita', () => {
  const ctx = {
    save() {},
    restore() {},
    translate() {},
    scale() {},
    beginPath() {},
    closePath() {},
    fill() {},
    stroke() {},
    moveTo(x, y) {
      assert.ok(Number.isFinite(x + y));
    },
    lineTo(x, y) {
      this.moveTo(x, y);
    },
  };
  for (const race of Object.keys(M.parts.race))
    for (const gear of Object.keys(M.parts.gear)) M.draw(ctx, { race, gear, facing: 130 }, 128);
});
