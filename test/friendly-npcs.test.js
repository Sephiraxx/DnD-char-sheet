const test = require('node:test');
const assert = require('node:assert/strict');
const { load, LOGIC, fixture } = require('./load');

const input = { name: 'Tizne', classId: 'wizard', level: 3, raceId: 'kobold-base-MPMM', campaignSources: ['PHB'] };

test('a friendly NPC starts with a usable sheet, equipment and prepared spells', () => {
  const g = load([...LOGIC, 'friendly-npcs.js', 'party-view.js']);
  const s = g.FriendlyNPC.create(input, ['magic-missile']);
  assert.equal(s.friendlyNpc, true);
  assert.equal(s.race, 'Kobold');
  assert.equal(s.hp, g.Rules.stats(s).maxHP);
  assert.ok(s.inventory.some(item => g.Equipment.item(item.equipmentId)?.weapon));
  assert.equal(g.PartyView.summarize(s).friendlyNpc, true);
  const spell = g.Rules.allSpells(s).find(sp => sp.id === 'magic-missile');
  assert.ok(g.Classes.usable(s).includes(spell.id));
  g.Combat.cast(s, spell, 1);
  assert.equal(s.slotsSpent[0], 1);
  assert.throws(() => g.FriendlyNPC.create({ ...input, level: 1 }, ['fireball']), /Revisá los conjuros/);
  const fighter = g.FriendlyNPC.create({ ...input, classId: 'fighter', raceId: 'dwarf-mountain-PHB' }, []);
  assert.equal(fighter.abilities.str, 17);
  assert.equal(fighter.abilities.con, 16);
});

test('a DM control URL selects only its NPC and preserves the active player sheet', () => {
  const g = load([...LOGIC, 'friendly-npcs.js']);
  g.URLSearchParams = URLSearchParams;
  const pcs = g.CharacterStorage;
  const pc = pcs.add(fixture('wizard-3.json'));
  pcs.activate(pc);
  const npc = pcs.add(g.FriendlyNPC.create(input, []));
  g.location.search = '?aliado=' + npc;
  assert.equal(pcs.activeKey(), 'dnd-character-' + npc);
  assert.equal(g.localStorage.getItem('dnd-party-active-v1'), pc);
  g.location.search = '?aliado=' + pc;
  assert.equal(pcs.activeKey(), null);
  g.location.search = '';
  assert.equal(pcs.activeKey(), 'dnd-character-' + pc);
});
