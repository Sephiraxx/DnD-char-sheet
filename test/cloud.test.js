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

test('realtime catches up on connection, failure and foreground polling; unsubscribing stops recovery', async () => {
  const g = setup({}),
    timers = new Map(),
    calls = [],
    channels = [];
  let timerId = 0,
    subscription,
    removed = 0,
    release;
  const channel = {
    on: () => channel,
    subscribe: fn => {
      subscription = fn;
      return channel;
    },
    track: () => {},
    presenceState: () => ({}),
  };
  g.setTimeout = (fn, delay) => {
    timers.set(++timerId, { fn, delay });
    return timerId;
  };
  g.clearTimeout = id => timers.delete(id);
  g.document = { hidden: false };
  g.supabase = {
    createClient: () => ({
      auth: { getSession: async () => ({ data: { session: { user: { id: 'u1' } } } }) },
      channel: name => {
        channels.push(name);
        return channel;
      },
      removeChannel: async () => {
        removed++;
      },
    }),
  };
  const stop = await g.Cloud.subscribe('c1', async table => {
    calls.push(table);
    if (release)
      await new Promise(ok => {
        release = ok;
      });
  });
  const settle = () => new Promise(ok => setImmediate(ok));
  subscription('SUBSCRIBED');
  await settle();
  assert.deepEqual(calls, ['resync']);
  subscription('CHANNEL_ERROR');
  await settle();
  assert.equal(calls.length, 2);
  const tick = () => {
    const [id, t] = [...timers].find(([, t]) => t.delay === 10000);
    timers.delete(id);
    t.fn();
  };
  g.document.hidden = true;
  tick();
  await settle();
  assert.equal(calls.length, 2);
  g.document.hidden = false;
  tick();
  await settle();
  assert.equal(calls.length, 3);
  release = true;
  subscription('TIMED_OUT');
  await settle();
  tick();
  await settle();
  assert.equal(calls.length, 4, 'recovery queries never overlap');
  release();
  release = null;
  await settle();
  await stop();
  assert.equal(removed, 1);
  assert.equal(timers.size, 0);
  subscription('CHANNEL_ERROR');
  await settle();
  assert.equal(calls.length, 4);
  assert.deepEqual(channels, ['mesa-c1']);
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

test('overlapping flush calls await the same upload rather than reporting an early success', async () => {
  const db = { characters: [{ id: 'ch', data: { name: 'A' }, updated_at: T0 }] },
    g = setup(db),
    base = fakeSupabase(db).createClient();
  let release, started;
  const gate = new Promise(ok => (release = ok)),
    begin = new Promise(ok => (started = ok));
  g.supabase = {
    createClient: () => ({
      ...base,
      from: table => {
        const q = base.from(table),
          read = q.maybeSingle;
        q.maybeSingle = async () => {
          started();
          await gate;
          return read();
        };
        return q;
      },
    }),
  };
  linkTo(g);
  g.Cloud.changed('k', { name: 'B' });
  const first = g.Cloud.flush();
  await begin;
  const second = g.Cloud.flush();
  assert.equal(first, second);
  assert.equal(g.Cloud.status(), 'syncing');
  release();
  assert.equal(await second, true);
  assert.equal(db.characters[0].data.name, 'B');
});

test('reglas de características de la mesa: valores por defecto y saneado', () => {
  const g = setup({});
  const plain = x => JSON.parse(JSON.stringify(x));
  assert.deepEqual(plain(g.Cloud.cleanSettings({}).abilities), {
    methods: ['manual', 'array', 'pointbuy', 'roll'],
    array: [15, 14, 13, 12, 10, 8],
    points: 27,
    rollMin: 0,
  });
  const a = g.Cloud.cleanSettings({
    abilities: { methods: ['roll', 'hack'], array: [16, 14, 12, 10, 10, 8], points: 99, rollMin: 8 },
  }).abilities;
  assert.deepEqual(plain(a.methods), ['roll']);
  assert.deepEqual(plain(a.array), [16, 14, 12, 10, 10, 8]);
  assert.equal(a.points, 27);
  assert.equal(a.rollMin, 8);
  assert.deepEqual(
    plain(g.Cloud.cleanSettings({ abilities: { array: [30, 1] } }).abilities.array),
    [15, 14, 13, 12, 10, 8],
  );
});
