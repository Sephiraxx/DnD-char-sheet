/* Una clave por ficha. Solo se listan personajes que existen en el dispositivo. */
(function (root) {
  'use strict';
  const INDEX = 'dnd-party-index-v1',
    ACTIVE = 'dnd-party-active-v1',
    LEGACY = 'darien-voss-2014-v1';
  function list() {
    const raw = localStorage.getItem(INDEX);
    let entries = [];
    if (raw) {
      entries = JSON.parse(raw);
      if (
        !Array.isArray(entries) ||
        entries.length > 100 ||
        entries.some(
          x =>
            !x ||
            typeof x.id !== 'string' ||
            typeof x.name !== 'string' ||
            !(x.key === LEGACY || /^dnd-character-[a-zA-Z0-9-]+$/.test(x.key)),
        )
      )
        throw Error('No se pudo leer la lista de personajes. Exportá tu ficha antes de continuar.');
    }
    entries = entries.filter(x => localStorage.getItem(x.key) !== null);
    const legacy = localStorage.getItem(LEGACY);
    if (legacy !== null && !entries.some(x => x.key === LEGACY)) {
      let name = 'Ficha guardada';
      try {
        name = JSON.parse(legacy)?.name || name;
      } catch {}
      entries.unshift({ id: 'darien', key: LEGACY, name });
    }
    return entries;
  }
  const controlledId = () => (location.search ? new URLSearchParams(location.search).get('aliado') : null);
  function controlledKey(entries, id) {
    const key = entries.find(x => x.id === id)?.key;
    const sheet = key ? JSON.parse(localStorage.getItem(key)) : null;
    return sheet?.friendlyNpc === true || sheet?.enemyNpc === true ? key : null;
  }
  function activeKey() {
    try {
      const entries = list();
      const controlled = controlledId();
      if (controlled !== null) return controlledKey(entries, controlled);
      const id = localStorage.getItem(ACTIVE);
      return entries.find(x => x.id === id)?.key || entries[0]?.key || null;
    } catch {
      try {
        return localStorage.getItem(LEGACY) !== null ? LEGACY : null;
      } catch {
        return null;
      }
    }
  }
  function addMany(sheets, wanted) {
    const entries = list();
    if (!Array.isArray(sheets) || !sheets.length) throw Error('La copia no contiene fichas.');
    if (entries.length + sheets.length > 100) throw Error('Exportá o eliminá una ficha antes de agregar más.');
    const validated = sheets.map(s => root.Rules.validate(s));
    const added = [];
    try {
      for (const sheet of validated) {
        const id =
          wanted && validated.length === 1 && /^[a-zA-Z0-9-]{1,80}$/.test(wanted) && !entries.some(x => x.id === wanted)
            ? wanted
            : crypto.randomUUID();
        const key = 'dnd-character-' + id;
        localStorage.setItem(key, JSON.stringify(sheet));
        added.push({ id, key, name: sheet.name });
      }
      localStorage.setItem(INDEX, JSON.stringify([...entries, ...added]));
    } catch (e) {
      for (const item of added) localStorage.removeItem(item.key);
      throw e;
    }
    return added.map(item => item.id);
  }
  function add(s, wanted) {
    return addMany([s], wanted)[0];
  }
  function activate(id) {
    const entries = list();
    if (!entries.some(x => x.id === id)) throw Error('Personaje no encontrado.');
    if (controlledId() !== null) {
      location.replace('./index.html?aliado=' + encodeURIComponent(id) + '#combat');
      return;
    }
    localStorage.setItem(ACTIVE, id);
    location.reload();
  }
  function remove(id) {
    const entries = list(),
      item = entries.find(x => x.id === id);
    if (!item) throw Error('Personaje no encontrado.');
    if (item.key === activeKey()) throw Error('Cambiá de personaje antes de eliminar esta ficha.');
    localStorage.setItem(INDEX, JSON.stringify(entries.filter(x => x.id !== id)));
    localStorage.removeItem(item.key);
    localStorage.removeItem(item.key + '-previous');
    localStorage.removeItem(item.key + '-level-draft');
  }
  // Reemplaza los datos de una ficha (por ejemplo, con su copia más nueva de la nube).
  function replace(id, s) {
    const entries = list(),
      item = entries.find(x => x.id === id);
    if (!item) throw Error('Personaje no encontrado.');
    const data = root.Rules.validate(s);
    localStorage.setItem(item.key, JSON.stringify(data));
    if (data.name && data.name !== item.name)
      localStorage.setItem(INDEX, JSON.stringify(entries.map(x => (x.id === id ? { ...x, name: data.name } : x))));
  }
  // Borra el personaje abierto y abre otro (o la portada si no queda ninguno).
  function removeActive() {
    if (controlledId() !== null) throw Error('Quitá a este PNJ desde la pantalla del DM.');
    const entries = list(),
      key = activeKey(),
      item = entries.find(x => x.key === key);
    if (!item) throw Error('Personaje no encontrado.');
    const rest = entries.filter(x => x.id !== item.id);
    localStorage.setItem(INDEX, JSON.stringify(rest));
    for (const suffix of ['', '-previous', '-level-draft', '-cloud']) localStorage.removeItem(item.key + suffix);
    if (rest.length) localStorage.setItem(ACTIVE, rest[0].id);
    else localStorage.removeItem(ACTIVE);
    location.reload();
  }
  root.CharacterStorage = { list, activeKey, add, addMany, activate, remove, removeActive, replace };
})(typeof window !== 'undefined' ? window : globalThis);
