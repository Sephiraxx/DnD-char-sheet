const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./load.js');

test('tienda: todos los precios son de objetos que existen y se buscan sin acentos', () => {
  const c = load();
  for (const id of Object.keys(c.Shop.PRICES)) assert.ok(c.EquipmentData.items[id], id);
  assert.deepEqual({ ...c.Shop.coins(12.53) }, { gp: 12, sp: 5, cp: 3 });
  const lute = c.Shop.search('laud').find(x => x.ref === 'gear:lute');
  assert.equal(lute.gp, 35);
  const magic = c.Shop.catalog().find(x => x.range);
  assert.ok(magic.gp >= magic.range.min && magic.gp <= magic.range.max);
});

test('tesoro: monedas dentro de los rangos de cada desafío y objetos del catálogo', () => {
  const c = load();
  for (let i = 0; i < 40; i++) {
    const t = c.Treasure.hoard('5-10');
    assert.ok(t.coins.gp >= 600 && t.coins.gp <= 3600);
    assert.ok(t.coins.pp >= 30 && t.coins.pp <= 180);
    for (const it of t.items) assert.ok(c.MagicItems.byId(it.id), it.id);
    assert.ok(c.Treasure.value(t) > 0);
  }
  const lo = c.Treasure.individual('0-4', 3, () => 0),
    hi = c.Treasure.individual('17+', 1, () => 0.999999);
  assert.deepEqual({ ...lo.coins }, { cp: 15 });
  assert.deepEqual({ ...hi.coins }, { gp: 6000, pp: 1200 });
  assert.equal(c.Treasure.tierOf(7).id, '5-10');
});

test('crónica: calendario, misiones y fabricación', () => {
  const c = load(),
    C = c.Chronicle;
  let cal = C.cleanCalendar({
    months: [
      { name: 'Hammer', days: 30 },
      { name: 'Alturiak', days: 28 },
    ],
    year: 1490,
  });
  assert.equal(C.yearDays(cal), 58);
  cal = C.advance(cal, 31);
  assert.equal(C.dateText(cal), '2 de Alturiak, año 1490');
  cal = C.advance(cal, 30);
  assert.equal(C.dateText(cal), '4 de Hammer, año 1491');
  assert.equal(C.dateText(C.advance(cal, -4)), '28 de Alturiak, año 1490');
  assert.equal(C.dateText(C.setDate(cal, 1500, 1, 99)), '28 de Alturiak, año 1500');
  const st = C.clean({
    quests: [{ title: ' Rescate ', status: 'x' }, { text: 'sin título' }],
    downtime: [{ who: 'Mira', activity: 'craft', days: 10, done: 99 }],
    calendar: {},
  });
  assert.equal(st.quests.length, 1);
  assert.equal(st.quests[0].title, 'Rescate');
  assert.equal(st.quests[0].status, 'active');
  assert.equal(st.downtime[0].done, 0);
  assert.equal(C.progress(st.downtime, 25)[0].done, 10);
  assert.equal(st.calendar.months.length, 12);
  assert.deepEqual({ ...C.craft(1500, 2) }, { days: 150, materials: 750 });
  assert.equal(C.craftMagic('raro').days, 200);
});

test('referencia del DM: tablas completas', () => {
  const R = load().DmReference;
  assert.equal(R.TRAPS.damage.length, 4);
  assert.equal(R.POISONS.length, 15);
  assert.ok(R.POISONS.every(p => p.length === 5 && Number.isInteger(p[3])));
  assert.ok(R.VEHICLES.every(v => v.length === 9));
  assert.ok(Object.values(R.MADNESS.kinds).every(k => k.effects.length >= 10));
});
