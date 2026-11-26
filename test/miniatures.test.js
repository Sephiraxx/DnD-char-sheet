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

test('cada raza tiene su túnica base y conserva las variantes elegidas al guardarse', () => {
  const presets = Object.keys(M.parts.race).map(raceId => M.initial({ raceId }));
  assert.equal(new Set(presets.map(m => m.cloth)).size, presets.length);
  for (const race of ['halfling', 'gnome', 'goblin', 'kobold', 'autognome', 'fairy', 'grung', 'kender', 'verdan'])
    assert.equal(M.initial({ raceId: race }).size, 'small', race);
  for (const race of ['harengon', 'owlin', 'hadozee']) {
    assert.equal(M.clean({ race, size: 'small' }).size, 'small', race);
    assert.equal(M.clean({ race, size: 'medium' }).size, 'medium', race);
  }
  assert.equal(M.initial({ raceId: 'dwarf' }).beard, 'braided');
  assert.equal(M.clean({ race: 'goliath', hair: 'crop' }).hair, 'bald');
  assert.equal(M.clean({ race: 'tabaxi', feature: 'spots' }).feature, 'spots');
  assert.equal(M.clean({ race: 'warforged', feature: 'stone' }).feature, 'stone');
  assert.equal(M.clean({ race: 'dragonborn', ancestry: 'silver' }).skin, '#a1a1a1');
  assert.equal(M.clean({ race: 'elf', hair: 'bob', cloth: '#2a3b4c' }).cloth, '#2a3b4c');
});

function capture(draw, colors) {
  const polys = [];
  const ctx = {
    save() {},
    restore() {},
    translate() {},
    scale() {},
    closePath() {},
    stroke() {},
    fill() {
      if (colors) colors.push(this.fillStyle);
    },
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
test('la ropa y el rostro de una miniatura se conservan al guardar y compartir la ficha', () => {
  const ctx = load();
  require('vm').runInContext(
    require('fs').readFileSync(require('path').join(__dirname, '../party-view.js'), 'utf8'),
    ctx,
  );
  const Mini = ctx.Miniatures,
    old = Mini.clean({ hair: 'crest', outfit: 'armor', gear: 'shield' });
  for (const key of ['headwear', 'neck', 'belt', 'eyewear', 'scar', 'beard']) assert.equal(old[key], 'none');
  assert.equal(old.hair, 'crest');
  assert.equal(old.gear, 'shield');
  assert.equal(old.offhand, 'none');
  const raw = {
    ...old,
    outfit: 'vestments',
    headwear: 'cowl',
    headColor: '#20242A',
    neck: 'skull',
    belt: 'vials',
    hair: 'braid',
    eyewear: 'round',
    scar: 'claw',
    beard: 'short',
    race: 'tortle',
    gear: 'sword',
    offhand: 'shield',
  };
  const sheet = ctx.Rules.validate({ ...fixture('wizard-3.json'), miniature: raw });
  const expected = Mini.clean(raw);
  assert.deepEqual(ctx.PartyView.rowSummary({ summary: ctx.PartyView.summarize(sheet) }).miniature, expected);
  assert.equal(expected.headColor, '#20242a');
  assert.equal(Mini.clean({ ...raw, headwear: 'bad', headColor: 'bad' }).headwear, 'none');
  assert.equal(Mini.clean({ ...raw, headColor: 'bad' }).headColor, Mini.defaults.headColor);
});
test('cada opción de vestuario, pelo y rostro cambia la figura renderizada', () => {
  const digest = model => {
    const colors = [];
    const geometry = capture(ctx => M.draw(ctx, model, 128), colors);
    return require('crypto')
      .createHash('sha256')
      .update(JSON.stringify([geometry, colors]))
      .digest('hex');
  };
  for (const key of ['outfit', 'hair', 'headwear', 'eyewear', 'scar', 'beard', 'neck', 'belt']) {
    const hashes = Object.keys(M.parts[key]).map(value => digest({ [key]: value }));
    assert.equal(new Set(hashes).size, hashes.length, key);
  }
});
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
    ['Hobgoblin', 'hobgoblin'],
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
    assert.ok(
      faces.some(face => face.some(([, y]) => y > 0.42)),
      key,
    );
    const ctx = {
      canvas: {},
      miniBoard: true,
      createImageData: (width, height) => ({ width, height, data: new Uint8ClampedArray(width * height * 4) }),
      putImageData({ width, height, data }) {
        for (let x = 0; x < width; x++)
          assert.equal(data[(x + 1) * 4 - 1] + data[((height - 1) * width + x + 1) * 4 - 1], 0, key);
        for (let y = 0; y < height; y++)
          assert.equal(data[(y * width + 1) * 4 - 1] + data[(y + 1) * width * 4 - 1], 0, key);
      },
    };
    const { size } = C.metadata(key);
    C.draw(ctx, key, 64 * C.footprints[size]);
    assert.ok(ctx.canvas.anchor.x > 0 && ctx.canvas.anchor.y > 0, key);
  }
});

test('la edad y las variantes cambian el tamaño del modelo y se infieren del nombre para colocarlo', () => {
  const C = g.CreatureMiniatures;
  for (const [name, size] of [
    ['Cría de dragón de latón #2', 'medium'],
    ['Dragón rojo', 'large'],
    ['Adult Silver Dragon', 'huge'],
    ['Dragón negro anciano', 'gargantuan'],
    ['Oso negro', 'medium'],
    ['Rata gigante', 'small'],
    ['Araña', 'tiny'],
    ['Murciélago gigante', 'large'],
  ]) {
    const form = C.resolve(name);
    assert.equal(C.metadata(form.id, form).size, size, name);
  }
  assert.equal(C.metadata('dragon-red', { footprint: 4 }).age, 'ancient');
  assert.equal(C.metadata('cyclops').size, 'huge');
  assert.equal(C.metadata('bat').size, 'tiny');
  assert.equal(C.metadata('skeleton').size, 'medium');
});

test('el catálogo de miniaturas y la migración admiten las mismas elecciones públicas', () => {
  const C = g.CreatureMiniatures;
  const keys = Object.keys(C.options);
  assert.deepEqual(
    Object.values(C.groups).flat().sort().join(','),
    keys
      .filter(k => k !== 'sigil')
      .sort()
      .join(','),
  );
  for (const model of g.CampaignMiniModels)
    for (const name of [model.label, ...model.aliases]) assert.equal(C.identify(name + ' #3'), model.id, name);
  const sql = require('fs').readFileSync(
    require('path').join(__dirname, '../supabase/migrations/026_campaign_miniatures.sql'),
    'utf8',
  );
  const list = sql.split('and creature_model in (')[1].split(')')[0];
  assert.deepEqual([...list.matchAll(/'([^']+)'/g)].map(m => m[1]).sort(), keys.sort());
  for (const name of ['Caballero dragón', 'Bandit Hunter', 'El hombre de la capa'])
    assert.equal(C.identify(name), null);
});
test('las tablas iniciales de mazmorras y muertos vivientes reconocen cada nombre del encuentro', () => {
  const data = load(['encounter-tables-data.js', 'curated-encounter-data.js']);
  const entries = tables =>
    tables.filter(t => t.minLevel === 1).flatMap(t => t.rows.flatMap(r => r.parts.filter(p => p.type === 'creature')));
  const curated = entries(data.CuratedEncounterData.tables);
  assert.ok(curated.length);
  for (const creature of curated) assert.ok(g.CreatureMiniatures.identify(creature.name), creature.name);
  const wilderness = entries(data.EncounterTablesData.tables.filter(t => t.source === 'XGE'));
  assert.ok(wilderness.filter(p => g.CreatureMiniatures.identify(p.name)).length > wilderness.length / 2);
});

test('toda raza del catálogo tiene una opción elegible y conserva el identificador de la especie', () => {
  const { CampaignData } = load(['campaign-data.js']);
  for (const r of CampaignData.races) {
    const m = M.initial({ raceId: r.id, race: r.name });
    assert.notEqual(m.race, 'other', r.id);
    assert.ok(Object.hasOwn(M.parts.race, m.race), r.id);
  }
  for (const key of ['warforged', 'tabaxi', 'owlin', 'thri-kreen', 'genasi-fire', 'custom-lineage'])
    assert.equal(M.initial({ raceId: key + '-base' }).race, key);
  assert.equal(M.initial({ race: 'Raza casera' }).race, 'other');
});
test('la mano secundaria empuña cada objeto al otro lado de la miniatura', () => {
  const blank = capture(ctx => M.draw(ctx, { facing: 0 }, 128)).flat();
  const bounds = points => [Math.min(...points.map(p => p[0])), Math.max(...points.map(p => p[0]))];
  const [left, right] = bounds(blank.filter(p => p[1] > 0.4));
  for (const item of Object.keys(M.parts.offhand).filter(k => k !== 'none')) {
    const points = model =>
      capture(ctx => M.draw(ctx, { ...model, facing: 0 }, 128))
        .flat()
        .filter(p => p[1] > 0.4);
    const main = bounds(points({ gear: item })),
      off = bounds(points({ offhand: item }));
    assert.ok(main[1] > right && off[0] < left, item);
    assert.ok(Math.abs(main[1] + off[0]) < 0.002, item);
  }
  assert.equal(M.clean({ offhand: 'invalid' }).offhand, 'none');
  assert.equal(M.clean({ gear: 'greataxe' }).gear, 'greataxe');
  assert.equal(M.clean({ offhand: 'greataxe' }).offhand, 'none');
});

test('el forjado conserva el color anterior del hierro y guarda la madera en la ficha pública', () => {
  const previous = M.clean({ race: 'warforged', skin: '#8899AA' });
  assert.equal(previous.skin, '#8899aa');
  assert.equal(previous.woodColor, M.defaults.woodColor);
  assert.equal(M.clean({ ...previous, woodColor: 'invalid' }).woodColor, M.defaults.woodColor);
  const miniature = { ...previous, woodColor: '#845137', gear: 'sword', offhand: 'shield' };
  const ctx = load();
  require('vm').runInContext(
    require('fs').readFileSync(require('path').join(__dirname, '../party-view.js'), 'utf8'),
    ctx,
  );
  const sheet = ctx.Rules.validate({ ...fixture('wizard-3.json'), miniature });
  const shared = ctx.PartyView.rowSummary({ summary: ctx.PartyView.summarize(sheet) }).miniature;
  assert.equal(shared.skin, previous.skin);
  assert.equal(shared.woodColor, miniature.woodColor);
  function palette(model) {
    const colors = [];
    capture(ctx => M.draw(ctx, model, 96), colors);
    return colors.join();
  }
  assert.notEqual(palette(miniature), palette({ ...miniature, woodColor: '#a27355' }));
  assert.notEqual(palette(miniature), palette({ ...miniature, skin: '#464c50' }));
  assert.equal(palette({ race: 'human' }), palette({ race: 'human', woodColor: '#ffffff' }));
});
test('todo hierro usa cables metálicos recoloreables y conserva el color de los ojos', () => {
  const iron = { race: 'warforged', feature: 'iron', cableColor: '#99AABB', eyeColor: '#66EEFF' };
  assert.equal(M.clean(iron).cableColor, '#99aabb');
  assert.equal(M.clean(iron).eyeColor, '#66eeff');
  const colors = model => {
    const result = [];
    capture(ctx => M.draw(ctx, model, 96), result);
    return result.join();
  };
  assert.equal(colors(iron), colors({ ...iron, woodColor: '#ff00ff' }));
  assert.notEqual(colors(iron), colors({ ...iron, cableColor: '#403c3c' }));
  assert.notEqual(colors(iron), colors({ ...iron, eyeColor: '#ff7700' }));
  assert.equal(M.boardAppearance({ race: 'goliath', height: 170, build: 'regular' }).build, 'powerful');
  assert.equal(M.boardAppearance({ race: 'dwarf', height: 135 }).height, 137);
  assert.equal(M.boardAppearance({ race: 'dwarf', height: 135, heightMode: 'custom' }).height, 135);
  assert.equal(M.boardAppearance({ race: 'harengon', size: 'small' }).build, 'small');
});
test('la variante explícita gana al nombre y un modelo base puede volver a su huella original', () => {
  const C = g.CreatureMiniatures;
  assert.equal(C.selection('Rata gigante', null, '').size, 'tiny');
  assert.equal(C.selection('Rata', null, 'giant').size, 'small');
  assert.equal(C.selection('Dragón rojo joven', null, 'ancient').size, 'gargantuan');
  assert.equal(C.selection('Serpiente venenosa', null, 'constrictor').size, 'large');
  assert.equal(C.selection('Pudín negro', null, 'black-pudding').variant, 'black-pudding');
});
test('las variantes forjadas separan materiales y los rasgos faciales siguen la raza', () => {
  const A = g.MiniatureAncestries;
  const colors = [];
  assert.equal(A.faceOptions('warforged').hair, false);
  assert.equal(A.faceOptions('warforged').beard, false);
  assert.ok(A.faceOptions('tiefling').horns.swept);
  assert.equal(M.clean({ race: 'warforged', hair: 'braid', beard: 'braided' }).beard, 'none');
  assert.equal(M.clean({ race: 'warforged', feature: 'stone', woodColor: '#4e5156' }).stoneColor, '#4e5156');
  for (const [feature, key, color] of [
    ['stone', 'stoneColor', '#927366'],
    ['mithralBronze', 'bronzeColor', '#af762e'],
    ['darkwood', 'darkwoodColor', '#49342a'],
  ]) {
    const model = M.clean({ race: 'warforged', feature, [key]: color, crest: 'blade' });
    assert.equal(model[key], color);
    assert.equal(model.feature, feature);
    const palette = [];
    capture(ctx => M.draw(ctx, model, 96), palette);
    colors.push(palette.join());
  }
  assert.equal(new Set(colors).size, 3);
  assert.equal(M.clean({ race: 'tiefling', hornStyle: 'short' }).hornStyle, 'short');
});
test('la altura queda dentro del rango de su raza y tamaño sin cambiar su huella', () => {
  const A = g.MiniatureAncestries;
  for (const [race, min, max] of [
    ['halfling', 90, 110],
    ['human', 150, 195],
    ['goliath', 210, 245],
  ]) {
    assert.equal(A.heightRange(race).min, min);
    assert.equal(A.heightRange(race).max, max);
    assert.equal(M.boardAppearance({ race, height: 300 }).height, max);
    assert.equal(M.clean({ race, height: 70, heightMode: 'custom' }).height, min);
  }
  const small = M.boardAppearance({ race: 'harengon', size: 'small', height: 166 });
  assert.equal(small.height, 100);
  assert.equal(small.size, 'small');
  assert.equal(M.boardAppearance({ race: 'harengon', size: 'medium', height: 100 }).size, 'medium');
});
test('la vista de tablero reutiliza una sola imagen estática por modelo, con fondo transparente', () => {
  const canvases = [];
  g.document = {
    createElement() {
      const canvas = {
        getContext() {
          return {
            canvas,
            createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
            putImageData: image => (canvas.pixels = image.data),
          };
        },
      };
      canvases.push(canvas);
      return canvas;
    },
  };
  const model = { race: 'warforged', gear: 'sword', offhand: 'shield', pose: 'ready' };
  const sword = M.sprite(model);
  assert.equal(sword, M.sprite({ ...model }));
  const lowered = M.sprite({ ...model, pose: 'rest' });
  assert.notDeepEqual(sword.pixels, lowered.pixels);
  const dragon = M.creatureSprite('dragon-red');
  assert.equal(dragon, M.creatureSprite('dragon-red'));
  assert.equal(canvases.length, 3);
  for (const { pixels } of canvases) {
    assert.equal(pixels[3], 0);
    assert.ok(pixels.some((alpha, i) => i % 4 === 3 && alpha === 255));
  }
  const board = M.sprite(model, 1);
  assert.ok(board.anchor.x > 0 && board.anchor.x < board.width);
  assert.ok(board.anchor.y > 0 && board.anchor.y < board.height);
  const large = M.creatureSprite('dragon-red', 2);
  assert.ok(large.width > M.boardCell * 2, 'las alas sobrepasan la huella de dos casillas');
  assert.equal(g.CreatureMiniatures.metadata('dragon-red').size, 'large');
  assert.equal(g.CreatureMiniatures.metadata('goblin').size, 'small');
  assert.equal(M.appearanceKey(model), M.appearanceKey({ ...model, facing: 90 }));
});
