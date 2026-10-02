const test = require('node:test');
const assert = require('node:assert/strict');
const { load, fixture } = require('./load');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Supabase falso para la tabla de copias: upsert, select, eq, order y delete (cada consulta se puede esperar).
function fakeSupabase(db) {
  const from = table => {
    const q = { op: 'select', rows: null, filters: [] };
    const run = () => {
      const all = (db[table] ||= []);
      const match = r => q.filters.every(([k, v]) => r[k] === v);
      if (q.op === 'upsert') {
        const out = q.rows.map(row => {
          const at = new Date().toISOString(),
            old = all.find(r => r.local_id === row.local_id);
          if (old) Object.assign(old, row, { updated_at: at });
          else all.push({ ...row, updated_at: at });
          return { local_id: row.local_id, updated_at: at };
        });
        return out;
      }
      if (q.op === 'delete') {
        db[table] = all.filter(r => !match(r));
        return null;
      }
      return all.filter(match).map(r => ({ ...r }));
    };
    const api = {
      upsert: rows => ((q.op = 'upsert'), (q.rows = rows), api),
      delete: () => ((q.op = 'delete'), api),
      select: () => api,
      order: () => api,
      eq: (k, v) => (q.filters.push([k, v]), api),
      maybeSingle: async () => ({ data: run()[0] || null, error: null }),
      then: (ok, bad) => Promise.resolve({ data: run(), error: null }).then(ok, bad),
    };
    return api;
  };
  return {
    createClient: () => ({ auth: { getSession: async () => ({ data: { session: { user: { id: 'u1' } } } }) }, from }),
  };
}
function setup(db) {
  const g = load();
  g.CLOUD_CONFIG = { url: 'https://example.supabase.co', key: 'public' };
  g.supabase = fakeSupabase(db);
  g.dispatchEvent = () => {};
  g.CustomEvent = class {};
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'cloud.js'), 'utf8'), g);
  return g;
}

test('sin sesión en el navegador no se copia nada', async () => {
  const db = {},
    g = setup(db);
  g.Cloud.backup('dnd-character-a', { name: 'X' });
  assert.equal(await g.Cloud.flushBackups(), 0);
  assert.equal((db.backups || []).length, 0);
});

test('todas las fichas del dispositivo se copian y se pueden traer a otro', async () => {
  const db = {},
    g = setup(db);
  g.localStorage.setItem('dnd-cloud-auth', '{}');
  const s = g.Rules.validate(fixture('wizard-3.json'));
  const id = g.CharacterStorage.add(s);
  g.CharacterStorage.add({ ...s, name: 'Otra' });
  assert.equal(await g.Cloud.backupAll(), 2);
  assert.equal(db.backups.length, 2);
  assert.ok(g.Cloud.backupTimes()[id], 'recuerda cuándo se copió');

  // Otro dispositivo con la misma cuenta: trae la copia con el mismo id local.
  const h = setup(db);
  h.localStorage.setItem('dnd-cloud-auth', '{}');
  const list = await h.Cloud.backups();
  assert.equal(list.length, 2);
  const back = await h.Cloud.restoreBackup(id);
  assert.equal(back, id);
  assert.equal(JSON.parse(h.localStorage.getItem('dnd-character-' + id)).name, 'Lyra Test');
  // Un cambio después actualiza la misma copia, no crea otra.
  h.Cloud.backup('dnd-character-' + id, { ...s, name: 'Lyra cambiada' });
  await h.Cloud.flushBackups();
  assert.equal(db.backups.length, 2);
  assert.equal(db.backups.find(r => r.local_id === id).name, 'Lyra cambiada');
  await h.Cloud.deleteBackup(id);
  assert.equal(db.backups.length, 1);
});
