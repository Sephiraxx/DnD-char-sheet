const test = require('node:test');
const assert = require('node:assert/strict');
const { load, fixture } = require('./load');

const g = load();
const M = g.MagicItems;
const wizard = () => g.Rules.validate(fixture('wizard-3.json'));
let n = 0;
function give(s, id, extra = {}, picks = {}) {
  const row = { id: 'm' + ++n, name: id, qty: 1, category: 'Tesoro', notes: '', location: '', weight: null, ...extra };
  row.magic = { ...M.fromCatalog(id, picks), ...(extra.magic || {}) };
  s.inventory.push(row);
  return row;
}

test('el Anillo de protección solo cuenta sintonizado: +1 CA y salvaciones', () => {
  const s = wizard(),
    ac = g.Rules.stats(s).ac,
    save = g.Rules.saveBonus(s, 'dex');
  const ring = give(s, 'ring-of-protection');
  assert.equal(g.Rules.stats(s).ac, ac);
  ring.magic.attuned = true;
  assert.equal(g.Rules.stats(s).ac, ac + 1);
  assert.equal(g.Rules.saveBonus(s, 'dex'), save + 1);
  g.Rules.validate(s);
});

test('no se pueden sintonizar más de tres objetos', () => {
  const s = wizard();
  for (const id of ['ring-of-protection', 'cloak-of-protection', 'amulet-of-health', 'headband-of-intellect'])
    give(s, id).magic.attuned = true;
  assert.throws(() => g.Rules.validate(s), /3 objetos/);
});

test('el Amuleto de salud fija CON 19: PG, salvación y pruebas', () => {
  const s = wizard(),
    hp = g.Rules.stats(s).maxHP,
    con = s.abilities.con;
  give(s, 'amulet-of-health').magic.attuned = true;
  assert.equal(g.Rules.scores(s).con, 19);
  assert.equal(s.abilities.con, con, 'la puntuación anotada no cambia');
  const diff = 4 - Math.floor((con - 10) / 2);
  assert.equal(g.Rules.stats(s).maxHP, hp + diff * g.Rules.totalLevel(s));
});

test('un foco +2 suma a la CD y al ataque de conjuros; la varita del mago de guerra solo al ataque', () => {
  const s = wizard(),
    st = g.Rules.stats(s);
  give(s, 'arcane-grimoire-2').magic.attuned = true;
  assert.equal(g.Rules.stats(s).dc, st.dc + 2);
  assert.equal(g.Rules.stats(s).attack, st.attack + 2);
  const t = wizard();
  give(t, 'wand-of-the-war-mage-1').magic.attuned = true;
  assert.equal(g.Rules.stats(t).dc, st.dc);
  assert.equal(g.Rules.stats(t).attack, st.attack + 1);
});

test('la armadura +1 suma solo equipada y el anillo de resistencia aplica al daño', () => {
  const s = wizard();
  const mail = give(s, 'armor-1', { equipmentId: 'chain-mail', weight: 55 });
  s.equipmentDefense = { armorId: 'other' };
  const off = g.Equipment.defense(s).total;
  s.equipmentDefense = { armorId: mail.id };
  assert.equal(g.Equipment.defense(s).total, 16 + 1);
  assert.ok(off < 17);
  give(s, 'ring-of-resistance', {}, { resist: 'fire' }).magic.attuned = true;
  assert.equal(g.Defenses.apply(s, [{ amount: 10, type: 'fire' }]).total, 5);
});

test('al amanecer las varitas recuperan sus cargas sin pasar el máximo', () => {
  const s = wizard(),
    wand = give(s, 'wand-of-magic-missiles');
  wand.magic.charges.spent = 5;
  const notes = M.dawn(s, () => [3]);
  assert.equal(wand.magic.charges.spent, 1);
  assert.equal(notes.length, 1);
  M.dawn(s, () => [6]);
  assert.equal(wand.magic.charges.spent, 0);
  wand.magic.charges.spent = 9;
  assert.throws(() => g.Rules.validate(s));
});

test('los objetos que piden elegir resistencia no se crean sin elegirla', () => {
  assert.throws(() => M.fromCatalog('ring-of-resistance'), /resistencia/);
  assert.ok(M.effects(M.fromCatalog('cloak-of-protection')).some(x => /CA/.test(x)));
});
