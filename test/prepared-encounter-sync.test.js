const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { load } = require('./load');

test('drafts import from the original browser once without overwriting edits or reviving deletions', async () => {
  const server = new Map([
    ['edited', { data: { id: 'edited', name: 'Nueva versión', monsters: [] }, revision: 2 }],
    ['deleted', { data: null, revision: 2 }],
  ]);
  let available = false;
  function device() {
    const g = load([]);
    g.CLOUD_CONFIG = { url: 'https://example.invalid', key: 'test' };
    g.supabase = {
      createClient: () => ({
        from(table) {
          assert.equal(table, 'prepared_encounters');
          const q = {
            upsert: async (rows, { onConflict, ignoreDuplicates }) => {
              if (!available) return { error: { code: 'PGRST205' } };
              assert.equal(onConflict, 'campaign_id,id');
              assert.equal(ignoreDuplicates, true);
              for (const row of rows) {
                assert.equal(row.campaign_id, 'camp');
                if (!server.has(row.id)) server.set(row.id, { data: row.data, revision: 1 });
              }
              return { data: null };
            },
            select: () => q,
            eq: () => q,
            not: () => q,
            order: () => q,
            range: async () => ({ data: [...server.values()].filter(row => row.data) }),
          };
          return q;
        },
      }),
    };
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../cloud.js'), 'utf8'), g);
    return g;
  }

  const original = device();
  const key = 'dnd-dm-prepared-camp';
  const raw = JSON.stringify([
    { id: 'edited', name: 'Versión local', monsters: [] },
    { id: 'deleted', name: 'Encuentro eliminado', monsters: [] },
    { id: 'legacy', name: 'Guarida', monsters: [{ uid: 'staged-uid', name: 'Kobold' }, { name: 'Lobo' }] },
  ]);
  original.localStorage.setItem(key, raw);
  await assert.rejects(original.Cloud.preparedEncounters('camp'), /migración 024/);
  assert.equal(original.localStorage.getItem(key), raw);
  available = true;
  await original.Cloud.preparedEncounters('camp');
  assert.equal(original.localStorage.getItem(key), null);

  const another = device();
  const result = await another.Cloud.preparedEncounters('camp');
  assert.deepEqual(
    Array.from(result, row => row.data.name),
    ['Nueva versión', 'Guarida'],
  );
  assert.deepEqual(
    Array.from(result[1].data.monsters, monster => monster.uid),
    ['staged-uid', 'legacy-1'],
  );
  assert.equal(result[0].revision, 2);
});
