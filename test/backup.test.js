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
      if (q.op === 'update') {
        const found = all.filter(match);
        for (const row of found) Object.assign(row, q.patch, { updated_at: new Date().toISOString() });
        return found.map(row => ({ ...row }));
      }
      if (q.op === 'upsert') {
        const out = q.rows.flatMap(row => {
          const at = new Date().toISOString(),
            old = all.find(r => r.local_id === row.local_id);
          if (old && q.ignoreDuplicates) return [];
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
      upsert: (rows, opts) => ((q.op = 'upsert'), (q.rows = rows), (q.ignoreDuplicates = opts.ignoreDuplicates), api),
      update: patch => ((q.op = 'update'), (q.patch = patch), api),
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

const tick = () => new Promise(r => setTimeout(r, 5));
test('«Subir ficha» sube lo cambiado acá, trae lo cambiado en otro dispositivo y pregunta si cambió en los dos', async () => {
  const db = {},
    a = setup(db);
  a.localStorage.setItem('dnd-cloud-auth', '{}');
  const s = a.Rules.validate(fixture('wizard-3.json'));
  const id = a.CharacterStorage.add(s);
  const other = a.CharacterStorage.add({ ...s, name: 'Otra' });
  // Primera vez: no están en la nube, se suben las dos.
  let r = await a.Cloud.syncBackups();
  assert.equal(r.up.length, 2);
  assert.equal(db.backups.length, 2);
  // Sin cambios: nada que hacer.
  r = await a.Cloud.syncBackups();
  assert.deepEqual([r.up.length, r.down.length, r.conflicts.length, r.same], [0, 0, 0, 2]);

  // Otro dispositivo trae la ficha y la cambia.
  await tick();
  const b = setup(db);
  b.localStorage.setItem('dnd-cloud-auth', '{}');
  await b.Cloud.restoreBackup(id);
  b.Cloud.backup('dnd-character-' + id, { ...s, name: 'Lyra en el teléfono', hp: 3 });
  await b.Cloud.flushBackups();

  // En el primero, sin cambios propios: se trae la versión nueva.
  r = await a.Cloud.syncBackups(id);
  assert.deepEqual([...r.down], ['Lyra en el teléfono']);
  assert.equal(JSON.parse(a.localStorage.getItem('dnd-character-' + id)).hp, 3);
  assert.equal(a.CharacterStorage.list().find(x => x.id === id).name, 'Lyra en el teléfono');

  // Cambio acá (sin conexión, no llegó a subirse): «Subir ficha» lo sube.
  await tick();
  a.localStorage.setItem('dnd-character-' + other, JSON.stringify({ ...s, name: 'Otra', hp: 7 }));
  a.Cloud.backup('dnd-character-' + other, { ...s, name: 'Otra', hp: 7 });
  r = await a.Cloud.syncBackups(other);
  assert.deepEqual([...r.up], ['Otra']);
  assert.equal(db.backups.find(x => x.local_id === other).data.hp, 7);

  // Cambió en los dos lados: conflicto; se resuelve quedándose con la de la nube.
  await tick();
  b.Cloud.backup('dnd-character-' + id, { ...s, name: 'Lyra en el teléfono', hp: 1 });
  await b.Cloud.flushBackups();
  a.localStorage.setItem('dnd-character-' + id, JSON.stringify({ ...s, name: 'Lyra en el teléfono', hp: 9 }));
  a.Cloud.backup('dnd-character-' + id, { ...s, name: 'Lyra en el teléfono', hp: 9 });
  assert.equal(await a.Cloud.flushBackups(), 0, 'la copia automática respeta revisiones');
  assert.equal(a.Cloud.copyState('dnd-character-' + id).pending, true);
  r = await a.Cloud.syncBackups();
  assert.equal(r.conflicts.length, 1);
  assert.equal(r.conflicts[0].id, id);
  assert.equal(db.backups.find(x => x.local_id === id).data.hp, 1, 'no pisa la nube sin preguntar');
  await a.Cloud.resolveBackup(id, 'cloud');
  assert.equal(JSON.parse(a.localStorage.getItem('dnd-character-' + id)).hp, 1);
  r = await a.Cloud.syncBackups();
  assert.equal(r.conflicts.length, 0);
});

test('al reabrir se encolan cambios pendientes aunque ya exista una copia', async () => {
  const s = load().Rules.validate(fixture('wizard-3.json'));
  const at = '2026-01-01T00:00:00Z';
  const db = { backups: [{ local_id: 'one', name: s.name, data: s, updated_at: at }] };
  const g = setup(db);
  g.localStorage.setItem('dnd-cloud-auth', '{}');
  g.localStorage.setItem('dnd-backup-at-v1', JSON.stringify({ one: at }));
  g.localStorage.setItem('dnd-backup-dirty-v1', JSON.stringify({ one: true }));
  g.CharacterStorage.add({ ...s, hp: 5 }, 'one');
  g.Cloud.backupMissing();
  assert.equal(await g.Cloud.flushBackups(), 1);
  assert.equal(db.backups[0].data.hp, 5);
  assert.equal(g.Cloud.copyState('dnd-character-one').pending, false);
});
