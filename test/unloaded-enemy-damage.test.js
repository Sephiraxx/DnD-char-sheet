const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { load, fixture, LOGIC } = require('./load');

test('damage to an unloaded hostile sheet saves a durable receipt and acknowledges only after saving', async () => {
  const g = load([...LOGIC, 'party-view.js']);
  const sheet = {
    ...g.Rules.validate(fixture('wizard-3.json')),
    enemyNpc: true,
    hp: 9,
    temp: 2,
    defenses: { resist: ['fire'] },
  };
  const rows = {
    characters: [{ id: 'enemy', campaign_id: 'camp', updated_at: 'old', data: sheet }],
    events: [
      {
        id: 15,
        campaign_id: 'camp',
        kind: 'damage',
        target_character: 'enemy',
        applied_at: null,
        created_at: '2026-01-01T00:00:00Z',
        payload: { amount: 10, type: 'fire' },
      },
    ],
  };
  let conflict = true;
  let failAck = true;
  g.CLOUD_CONFIG = { url: 'https://example.invalid', key: 'test' };
  g.supabase = {
    createClient: () => ({
      from(table) {
        const filters = [];
        let patch;
        const run = () => {
          const found = rows[table].filter(row => filters.every(fn => fn(row)));
          if (patch && table === 'characters' && conflict) {
            conflict = false;
            rows.characters[0].updated_at = 'newer';
            return { data: [] };
          }
          if (patch && table === 'events' && failAck) {
            failAck = false;
            return { error: { message: 'ACK failed' } };
          }
          if (patch) for (const row of found) Object.assign(row, patch, { updated_at: 'saved' });
          return { data: found.map(r => structuredClone(r)) };
        };
        const q = {
          select: () => q,
          order: () => q,
          eq: (k, v) => (filters.push(r => r[k] === v), q),
          is: (k, v) => q.eq(k, v),
          in: (k, values) => (filters.push(r => values.includes(r[k])), q),
          update: v => ((patch = v), q),
          maybeSingle: async () => ({ data: run().data?.[0] || null }),
          then: resolve => resolve(run()),
        };
        return q;
      },
    }),
  };
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../cloud.js'), 'utf8'), g);
  await assert.rejects(g.Cloud.applyUnloadedEnemyDamage('camp', ['enemy']), /ACK failed/);
  assert.equal(rows.characters[0].data.hp, 6);
  assert.equal(rows.characters[0].data.temp, 0);
  assert.equal(rows.characters[0].data.dmCommandsApplied[0], 15);
  await g.Cloud.applyUnloadedEnemyDamage('camp', ['enemy']);
  assert.equal(rows.characters[0].data.hp, 6);
  assert.ok(rows.events[0].applied_at);
});
