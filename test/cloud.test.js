const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./load');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Cliente falso de Supabase: solo lo que usa cloud.js para leer y actualizar una ficha.
function fakeSupabase(db) {
  const query = table => {
    const q = { filters: [], patch: null };
    const rows = () => (db[table] || []).filter(r => q.filters.every(([k, v]) => r[k] === v));
    const api = {
      select: () => api,
      update: patch => ((q.patch = patch), api),
      eq: (k, v) => (q.filters.push([k, v]), api),
      maybeSingle: async () => {
        const r = rows()[0];
        if (r && q.patch) Object.assign(r, q.patch, { updated_at: new Date(Date.now() + 1000).toISOString() });
        return { data: r ? { ...r } : null, error: null };
      },
    };
    return api;
  };
  return {
    createClient: () => ({
      auth: {
        getSession: async () => ({ data: { session: { user: { id: 'u1' } } } }),
      },
      from: query,
    }),
  };
}

function setup(db) {
  const g = load(['party-store.js']);
  g.CLOUD_CONFIG = { url: 'https://example.supabase.co', key: 'public' };
  g.supabase = fakeSupabase(db);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'cloud.js'), 'utf8'), g);
  return g;
}

const T0 = '2026-01-01T00:00:00.000Z',
  T1 = '2026-01-02T00:00:00.000Z';
const linkTo = (g, extra = {}) =>
  g.Cloud.setLink('k', {
    campaignId: 'c',
    campaignName: 'Mesa',
    code: 'ABC123',
    characterId: 'ch',
    syncedAt: T0,
    dirty: false,
    ...extra,
  });

test('sin cambios en ningún lado no hace nada', async () => {
  const g = setup({ characters: [{ id: 'ch', data: { name: 'A' }, updated_at: T0 }] });
  linkTo(g);
  assert.equal((await g.Cloud.reconcile('k')).action, 'none');
});

test('si la mesa es más nueva y no hay cambios locales, baja la versión de la mesa', async () => {
  const g = setup({ characters: [{ id: 'ch', data: { name: 'Remota' }, updated_at: T1 }] });
  linkTo(g);
  const r = await g.Cloud.reconcile('k');
  assert.equal(r.action, 'pull');
  assert.equal(r.remote.name, 'Remota');
});

test('cambios en ambos lados piden elegir', async () => {
  const g = setup({ characters: [{ id: 'ch', data: { name: 'Remota' }, updated_at: T1 }] });
  linkTo(g, { dirty: true });
  assert.equal((await g.Cloud.reconcile('k')).action, 'conflict');
});

test('cambios solo locales se suben', async () => {
  const g = setup({ characters: [{ id: 'ch', data: { name: 'A' }, updated_at: T0 }] });
  linkTo(g, { dirty: true });
  assert.equal((await g.Cloud.reconcile('k')).action, 'push');
});

test('si el DM quitó la ficha, se desvincula', async () => {
  const g = setup({ characters: [] });
  linkTo(g);
  assert.equal((await g.Cloud.reconcile('k')).action, 'removed');
  assert.equal(g.Cloud.link('k'), null);
});

test('subir marca la ficha como sincronizada', async () => {
  const db = { characters: [{ id: 'ch', data: { name: 'A' }, updated_at: T0 }] };
  const g = setup(db);
  linkTo(g);
  g.Cloud.changed('k', { name: 'Nueva' });
  assert.equal(g.Cloud.link('k').dirty, true);
  await g.Cloud.flush();
  assert.equal(db.characters[0].data.name, 'Nueva');
  assert.equal(g.Cloud.link('k').dirty, false);
  assert.equal(g.Cloud.status(), 'synced');
});
