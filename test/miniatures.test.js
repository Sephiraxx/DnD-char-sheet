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

function capture(draw) {
  const polys = [];
  const ctx = {
    save() {},
    restore() {},
    translate() {},
    scale() {},
    closePath() {},
    stroke() {},
    fill() {},
    beginPath() {
      polys.push([]);
    },
    moveTo(x, y) {
      assert.ok(Number.isFinite(x) && Number.isFinite(y));
      polys.at(-1).push([x, y]);
    },
    lineTo(x, y) {
      this.moveTo(x, y);
    },
  };
  draw(ctx);
  return polys;
}
test('la complexión cambia la silueta en cada vista y conserva la forma del cráneo', () => {
  for (const facing of [0, 90, 180]) {
    const outlines = new Set();
    for (const build of Object.keys(M.parts.build)) {
      assert.equal(M.clean({ build }).build, build);
      const faces = capture(ctx => M.draw(ctx, { build, facing }, 96));
      const pts = faces.flat();
      const span = points => Math.max(...points.map(p => p[0])) - Math.min(...points.map(p => p[0]));
      const top = Math.max(...pts.map(p => p[1]));
      const crown = span(pts.filter(p => p[1] > top - 0.12));
      const reference = capture(ctx => M.draw(ctx, { build: 'regular', facing }, 96)).flat();
      const refTop = Math.max(...reference.map(p => p[1]));
      assert.ok(Math.abs(crown - span(reference.filter(p => p[1] > refTop - 0.12))) < 0.025);
      outlines.add(
        [0.47, 0.8, 1.1, 1.38].map(y => span(pts.filter(p => Math.abs(p[1] - y) < 0.06)).toFixed(2)).join(','),
      );
    }
    assert.equal(outlines.size, Object.keys(M.parts.build).length);
  }
});
test('modelos públicos del catálogo y nombres numerados, sin confundir otras criaturas', () => {
  const C = g.CreatureMiniatures;
  for (const [name, model] of [
    ['Goblin 2', 'goblin'],
    ['Trasgo #3', 'goblin'],
    ['Esqueleto', 'skeleton'],
    ['Minotaur Skeleton', 'bull-skeleton'],
    ['Esqueleto de caballo de guerra', 'horse-skeleton'],
    ['Cría de dragón de latón', 'dragon-brass'],
    ['Ancient Red Dragon', 'dragon-red'],
    ['Tortuga dragón', null],
    ['Veterano semidragón rojo', null],
    ['Hobgoblin', null],
    ['Goblin Hunter', null],
    ['Figura encapuchada', null],
  ])
    assert.equal(C.identify(name), model);
  const src = load(['monsters-data.js']).MonsterData;
  const dragons = src.filter(m => /^(adult|ancient|young)-.+-dragon$|dragon-wyrmling$/.test(m.id));
  assert.equal(dragons.length, 40);
  for (const m of dragons) assert.ok(C.identify(m.name)?.startsWith('dragon-'), m.name);
  for (const key of Object.keys(C.options).filter(k => k !== 'sigil')) {
    const faces = capture(ctx => C.draw(ctx, key, 64));
    assert.ok(faces.length > 250, key);
    for (const [x, y] of faces.flat()) {
      assert.ok(Math.abs(x * 0.376) < 0.5 && 0.89 - y * 0.376 >= 0 && 0.89 - y * 0.376 <= 1, key);
    }
  }
});
