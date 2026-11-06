const test = require('node:test');
const assert = require('node:assert/strict');
const { load, fixture } = require('./load');

const g = load();
const MM = g.Metamagic;
const spell = id => g.Catalog.spells.find(x => x.id === id);
function sorcerer(extra = {}) {
  const s = fixture('wizard-3.json');
  Object.assign(s, {
    classId: 'sorcerer',
    classSubclass: 'sorcerer-draconic-bloodline',
    level: 5,
    hpBase: 30,
    hp: 20,
    abilities: { ...s.abilities, cha: 16 },
    known: ['fireball', 'haste', 'fire-bolt', 'chromatic-orb'],
    classChoices: { Metamagic: ['quickened-spell-PHB', 'twinned-spell-PHB', 'transmuted-spell-TCE'] },
    slotsSpent: Array(9).fill(0),
    classSpent: {},
    ...extra,
  });
  return g.Rules.validate(s);
}
function cleric(extra = {}) {
  return g.Rules.validate({
    ...g.Rules.initial(),
    name: 'Forja',
    classId: 'cleric',
    classSubclass: 'cleric-forge-domain',
    level: 3,
    raceId: 'dwarf-hill-PHB',
    abilities: { str: 14, dex: 10, con: 14, int: 10, wis: 16, cha: 8 },
    proficiencies: ['medicine', 'athletics', 'religion', 'persuasion'],
    campaignSources: ['PHB', 'XGE'],
    prepared: [],
    ...extra,
  });
}

test('metamagia: solo las opciones aprendidas, una por lanzamiento, y cobra los puntos', () => {
  const s = sorcerer();
  assert.deepEqual([...MM.known(s)].sort(), ['quickened', 'transmuted', 'twinned']);
  assert.equal(MM.points(s), 5);
  assert.throws(() => MM.plan(s, spell('fireball'), ['extended']), /No conocés/);
  assert.throws(() => MM.plan(s, spell('fireball'), ['quickened', 'twinned']), /una opción/);
  // Acelerado: pasa a acción adicional y queda registrado así en el turno.
  const q = MM.plan(s, spell('fireball'), ['quickened'], { slot: 3 });
  assert.equal(q.cost, 2);
  assert.equal(q.sp.time, 'Adicional');
  g.Combat.start(s);
  g.Combat.cast(s, q.sp, 3);
  MM.pay(s, q.cost);
  assert.equal(g.Combat.data(s).bonus, 'Bola de fuego');
  assert.equal(g.Combat.data(s).action, null);
  assert.equal(s.classSpent.sorcery, 2);
  // Duplicado cuesta el nivel del espacio; transmutado cambia el tipo de daño.
  assert.equal(MM.plan(s, spell('haste'), ['twinned'], { slot: 3 }).cost, 3);
  const t = MM.plan(s, spell('fireball'), ['transmuted'], { damageType: 'cold' });
  assert.deepEqual([...t.sp.damageTypes], ['frío']);
  assert.throws(() => MM.plan(s, spell('haste'), ['transmuted'], { damageType: 'cold' }), /solo daño/);
  assert.throws(() => MM.pay(s, 9), /necesitás 9/);
});

test('metamagia: alcance y duración cambian para ese lanzamiento', () => {
  const s = sorcerer({ classChoices: { Metamagic: ['distant-spell-PHB', 'extended-spell-PHB'] } });
  assert.equal(MM.plan(s, spell('fireball'), ['distant']).sp.range, '300 pies');
  assert.equal(MM.plan(s, { ...spell('fireball'), range: 'Toque' }, ['distant']).sp.range, '30 pies');
  assert.equal(MM.plan(s, spell('haste'), ['extended']).sp.duration, 'Hasta 2 minutos');
  assert.throws(() => MM.plan(s, spell('fireball'), ['extended']), /1 minuto o más/);
});

test('fuente de magia: puntos ↔ espacios, con mínimos de nivel y espacios extra hasta el descanso largo', () => {
  const s = sorcerer();
  s.slotsSpent[0] = 1;
  MM.createSlot(s, 1); // recupera el gastado
  assert.equal(s.slotsSpent[0], 0);
  MM.createSlot(s, 1); // uno de más
  assert.equal(s.fontSlots[0], 1);
  assert.equal(g.Combat.availableSlots(s, { level: 1 })[0].left, 5);
  g.Rules.validate(s);
  assert.throws(() => MM.createSlot(s, 4), /nivel 7/);
  const before = s.classSpent.sorcery;
  MM.convertSlot(s, 1); // el de más se convierte primero
  assert.equal(s.fontSlots[0], 0);
  assert.equal(s.classSpent.sorcery, before - 1);
  s.fontSlots[2] = 1;
  g.Classes.reset(s, 'long');
  assert.equal(s.fontSlots, undefined);
});

test('pergamino de conjuro: CD y ataque del pergamino según el nivel', () => {
  const row = g.MagicItems.inventoryRow('spell-scroll', { spell: 'fireball' });
  assert.equal(row.name, 'Pergamino de conjuro: Bola de fuego');
  assert.equal(row.magic.spellLevel, 3);
  assert.equal(row.magic.rarity, 'poco común');
  assert.deepEqual({ ...g.MagicItems.scroll(3) }, { rarity: 'poco común', dc: 15, attack: 7 });
  assert.match(g.MagicItems.effects(row.magic).join(' '), /lanza Bola de fuego · CD 15, ataque \+7/);
  assert.throws(() => g.MagicItems.inventoryRow('spell-scroll', {}), /Elegí el conjuro/);
  const s = sorcerer();
  s.inventory.push(row);
  g.Rules.validate(s);
});

test('Dureza enana: se suma sola en fichas nuevas; las viejas eligen una vez', () => {
  const old = cleric({ hpBase: 10 });
  const base = g.Rules.stats(old).maxHP;
  assert.equal(g.Classes.traitHp(old).value, 3);
  // «Ya estaba incluido»: el máximo no cambia, pero sube solo con el nivel.
  const kept = cleric({ hpBase: 10 - 3, hpAuto: true });
  assert.equal(g.Rules.stats(kept).maxHP, base);
  const added = cleric({ hpBase: 10, hpAuto: true });
  assert.equal(g.Rules.stats(added).maxHP, base + 3);
  assert.match(g.Campaign.characterTraits(added).find(r => r.name === 'Dureza enana').note, /Ya está sumado/);
});

test('Bendición de la forja: +1 al arma o a la armadura elegida, hasta el descanso largo', () => {
  const s = cleric({ hpAuto: true });
  s.inventory.push(
    { id: 'mace', equipmentId: 'mace', name: 'Maza', qty: 1, category: 'Armas', weight: 4, location: '', notes: '' },
    {
      id: 'mail',
      equipmentId: 'chain-mail',
      name: 'Cota de mallas',
      qty: 1,
      category: 'Armaduras',
      weight: 55,
      location: '',
      notes: '',
    },
  );
  s.equipmentDefense = {
    formula: 'auto',
    bonus: 0,
    simicCarapace: false,
    proficiencyOverride: false,
    shieldId: '',
    armorId: 'mail',
  };
  const ac = g.Equipment.defense(s).total;
  s.forgeBlessing = 'mail';
  assert.equal(g.Equipment.defense(s).total, ac + 1);
  const hit = g.Attacks.profile(s, s.inventory[0]).toHit;
  s.forgeBlessing = 'mace';
  assert.equal(g.Attacks.profile(s, s.inventory[0]).toHit, hit + 1);
  g.Classes.reset(s, 'long');
  assert.equal(s.forgeBlessing, undefined);
});
