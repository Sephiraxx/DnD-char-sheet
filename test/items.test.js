const test = require('node:test');
const assert = require('node:assert/strict');
const { load, fixture } = require('./load');

const g = load([...require('./load').LOGIC, 'item-ref.js']);
const M = g.MagicItems,
  R = g.ItemRef;
const wizard = () => g.Rules.validate(fixture('wizard-3.json'));
const official = name => M.ITEMS.find(i => i.id.startsWith('official-') && i.name === name);

test('los objetos de los libros traen los bonos que la ficha sabe aplicar', () => {
  assert.equal(official('Despedazadora').weapon, 1, 'OCR «+1 alas tiradas de ataque»');
  assert.equal(official('Despedazadora').base, 'weapon');
  assert.equal(official('Guanteletes de la fuerza del ogro').set.str, 19);
  assert.equal(official('Bastón de poder').ac, 2);
  assert.equal(official('Bastón de poder').spellAttack, 2);
  assert.deepEqual([...official('Hierro de escarcha').resist], ['fire']);
  assert.equal(official('Espada vorpal').resist, undefined, 'ignora la resistencia: no la da');
  const potion = official('Poción de fuerza de gigante');
  assert.ok(potion.consumable);
  assert.equal(potion.set, undefined, 'una poción no cambia la ficha para siempre');
  assert.ok(
    M.ITEMS.filter(i => i.id.startsWith('official-') && (i.weapon || i.armor || i.ac || i.set || i.resist)).length > 80,
  );
});

test('el arma base sale del libro cuando nombra una sola', () => {
  assert.equal(M.baseFor({ base: 'weapon', baseHint: 'espada larga' }), 'longsword');
  assert.equal(M.baseFor({ base: 'weapon', baseHint: 'hacha de guerra' }), 'battleaxe');
  assert.equal(M.baseFor({ base: 'armor', baseHint: 'cota de malla' }), 'chain-mail');
  assert.equal(M.baseFor({ base: 'weapon', baseHint: 'cualquier espada' }), '');
  const row = M.inventoryRow(official('Despedazadora').id, {});
  assert.equal(row.equipmentId, 'longsword');
  assert.equal(row.name, 'Despedazadora (Espada larga)');
  assert.equal(row.attack.magic, 1);
});

test('lo que entrega el DM del catálogo llega con efectos y se puede usar', () => {
  const s = wizard(),
    ac = g.Rules.stats(s).ac;
  const ring = R.rows(R.parse('magic:ring-of-protection'), { uid: () => 'r1' });
  s.inventory.push(...ring);
  ring[0].magic.attuned = true;
  assert.equal(g.Rules.stats(s).ac, ac + 1);
  const potion = R.rows({ kind: 'magic', id: 'potion-of-healing' }, { qty: 3, uid: () => 'p1' })[0];
  assert.equal(potion.magic.heal, '2d4+2');
  assert.equal(potion.qty, 3);
  const sword = R.rows({ kind: 'magic', id: 'weapon-1', base: 'rapier' }, { uid: () => 'w1' })[0];
  assert.equal(sword.equipmentId, 'rapier');
  assert.equal(sword.name, 'Estoque +1');
  s.inventory.push(potion, sword);
  g.Rules.validate(s);
  // Un paquete se abre en sus objetos.
  const pack = Object.values(g.EquipmentData.items).find(x => x.contents);
  assert.ok(R.rows({ kind: 'gear', id: pack.id }).length > 1);
});

test('una referencia de la nube se valida contra el catálogo', () => {
  assert.equal(R.clean({ kind: 'magic', id: 'no-existe' }), null);
  assert.equal(R.clean({ kind: 'magic', id: 'weapon-1', base: 'plate-armor' }).base, undefined);
  assert.equal(R.clean({ kind: 'gear', id: '<script>' }), null);
  assert.equal(R.clean('magic:ring-of-protection'), null);
  assert.equal(R.search('anillo protec')[0].name, 'Anillo de protección');
  assert.ok(R.search('espada larga').some(x => x.ref === 'gear:longsword'));
  assert.match(R.describe({ kind: 'magic', id: 'ring-of-protection' }), /sintonía.*\+1 a la CA/);
});
