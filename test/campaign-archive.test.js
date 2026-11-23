const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./load');

test('campaign restore preserves map links, copies the image, and cleans up on failure', async () => {
  const g = load(['campaign-archive.js']);
  Object.assign(g, { atob, Blob });
  const map = { name: 'Mapa', grid: {}, fog: {}, sort: 0 };
  const archive = {
    format: 'dnd-campaign-archive',
    version: 1,
    name: 'La posada',
    settings: { quests: [{ title: 'Secreta', shared: false }] },
    maps: [
      { ...map, id: 'upstairs', terrain: { links: { '0,0': 'cellar' } }, image: 'data:image/png;base64,AA==' },
      { ...map, id: 'cellar', terrain: {} },
    ],
    active: 'upstairs',
    tokens: [
      {
        map_id: 'cellar',
        kind: 'npc',
        name: 'Tabernero',
        label: 'T',
        color: '',
        x: 0,
        y: 1,
        size: 1,
        hidden: true,
        elev: 0,
      },
    ],
    homebrew: [],
    prepared: [{ id: 'enc-1', name: 'En el sótano', launched: true, monsters: [] }],
  };
  const campaign = { id: 'new-table' };
  const image = 'new-table/image.png';
  const cleanup = [];
  let restored, prepared;
  g.Cloud = {
    createCampaign: async () => campaign,
    cleanSettings: settings => settings,
    uploadMapImage: async (id, blob) => {
      assert.equal(id, campaign.id);
      assert.equal(blob.type, 'image/png');
      assert.equal(blob.size, 1);
      return image;
    },
    restoreCampaignArchive: async (id, data) => {
      assert.equal(id, campaign.id);
      restored = data;
    },
    importPreparedEncounters: async (id, rows) => (prepared = rows),
    removeMapImages: async paths => cleanup.push(...paths),
    deleteCampaign: async id => cleanup.push(id),
  };

  await g.CampaignArchive.restore(archive, 'Copia');
  assert.notEqual(restored.maps[0].id, 'upstairs');
  assert.equal(restored.active, restored.maps[0].id);
  assert.equal(restored.maps[0].image_path, image);
  assert.equal(restored.maps[0].terrain.links['0,0'], restored.maps[1].id);
  assert.equal(restored.tokens[0].map_id, restored.maps[1].id);
  assert.equal(restored.settings.quests[0].shared, false);
  assert.equal(prepared[0].launched, false);

  g.Cloud.restoreCampaignArchive = async () => {
    throw Error('Import interrupted');
  };
  await assert.rejects(g.CampaignArchive.restore(archive, 'Copia'), /Import interrupted/);
  assert.deepEqual(cleanup, [image, campaign.id]);
});

test('campaign backup restores both NPC sides and remaps prepared encounters', async () => {
  const { LOGIC, fixture } = require('./load');
  const g = load([...LOGIC, 'campaign-archive.js']);
  const sheet = g.Rules.validate(fixture('wizard-3.json'));
  const ally = { id: 'old-ally', owner_id: 'dm', data: { ...sheet, friendlyNpc: true } };
  const enemy = { id: 'old-enemy', owner_id: 'dm', data: { ...sheet, enemyNpc: true, dmCommandsApplied: [3] } };
  const saved = [];
  let restored;
  g.Cloud = {
    party: async () => ({
      campaign: { name: 'Posada', dm_id: 'dm', settings: {} },
      viewerIsDM: true,
      characters: [ally, { id: 'ordinary-pc', owner_id: 'player', data: sheet }],
      enemyNpcs: [enemy],
      homebrew: [],
    }),
    board: async () => ({ maps: [], tokens: [] }),
    preparedEncounters: async () => [{ data: prep, revision: 1 }],
    importPreparedEncounters: async (id, drafts) => ([restored] = drafts),
    createCampaign: async () => ({ id: 'restored-table' }),
    cleanSettings: settings => settings,
    restoreCampaignArchive: async () => {},
    createFriendlyNpc: async (table, data) => {
      saved.push(data);
      return { id: 'new-ally' };
    },
    createEnemyNpc: async (table, data) => {
      saved.push(data);
      return 'new-enemy';
    },
  };
  const prep = {
    id: 'enc',
    name: 'Batalla',
    monsters: [
      { uid: 'a', name: 'A', npcId: ally.id },
      { uid: 'b', name: 'B', npcId: enemy.id },
    ],
  };
  const archive = await g.CampaignArchive.build('table');
  assert.deepEqual(
    Array.from(archive.npcs, row => row.id),
    ['old-ally', 'old-enemy'],
  );
  await g.CampaignArchive.restore(archive, 'Copia');
  assert.equal(saved[0].friendlyNpc, true);
  assert.equal(saved[1].enemyNpc, true);
  assert.equal(saved[1].dmCommandsApplied, undefined);
  assert.equal(saved[0].hp, sheet.hp);
  assert.deepEqual(
    Array.from(restored.monsters, m => m.npcId),
    ['new-ally', 'new-enemy'],
  );
});
