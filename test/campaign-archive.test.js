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
  let restored;
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
  const key = 'dnd-dm-prepared-' + campaign.id;
  assert.equal(JSON.parse(g.localStorage.getItem(key))[0].launched, false);

  g.Cloud.restoreCampaignArchive = async () => {
    throw Error('Import interrupted');
  };
  await assert.rejects(g.CampaignArchive.restore(archive, 'Copia'), /Import interrupted/);
  assert.equal(g.localStorage.getItem(key), null);
  assert.deepEqual(cleanup, [image, campaign.id]);
});
