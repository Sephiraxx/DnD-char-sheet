/* Oleadas de magia salvaje: tira en la tabla del libro que ya trae la app (hechicero de Magia salvaje, d100;
   bárbaro de la Senda de la magia salvaje, d8). La tabla se lee del texto del rasgo; acá no se copia. */
const Surge = (() => {
  'use strict';
  const TABLES = {
    sorcerer: { key: 'sub:sorcerer-wild-magic:Wild Magic', sides: 100, name: 'Oleada de magia salvaje' },
    barbarian: { key: 'sub:barbarian-path-of-wild-magic:Path of Wild Magic', sides: 8, name: 'Magia salvaje' },
  };
  // Filas «01-02 | efecto» o «3 | efecto» del texto del rasgo.
  function parse(text) {
    const rows = [];
    for (const m of String(text || '').matchAll(/^(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?\s*\|\s*(.+)$/gm)) {
      const from = Number(m[1]),
        to = m[2] === undefined ? from : Number(m[2]) || 100;
      rows.push({ from, to: m[2] === '00' ? 100 : to, text: m[3].trim() });
    }
    return rows;
  }
  function rows(id) {
    const t = TABLES[id];
    return t ? parse(globalThis.OfficialContent?.ruleTexts.get(t.key)?.text) : [];
  }
  const pick = (list, n) => list.find(r => n >= r.from && n <= r.to) || null;
  // Qué tablas le corresponden a esta ficha.
  function available(s) {
    if (!globalThis.Classes) return [];
    const subs = Classes.views(s).map(v => Classes.sub(v)?.id);
    return [
      ...(subs.includes('sorcerer-wild-magic') ? ['sorcerer'] : []),
      ...(subs.includes('barbarian-path-of-wild-magic') ? ['barbarian'] : []),
    ];
  }
  async function roll(e) {
    const id = e?.dataset?.table || available(state)[0],
      t = TABLES[id];
    if (!t) throw Error('Tu personaje no tiene magia salvaje.');
    if (globalThis.OfficialContent?.ready) await OfficialContent.ready();
    const list = rows(id);
    if (!list.length) throw Error('No se pudo leer la tabla del libro. Revisá tu conexión y probá de nuevo.');
    const n = roll1(t.sides),
      row = pick(list, n);
    if (!row) throw Error('La tabla del libro no tiene esa fila.');
    const label = `${t.name} (d${t.sides})`;
    if (globalThis.TableUI) TableUI.shareRoll({ label, rolls: [n], bonus: 0, total: n, note: row.text.slice(0, 600) });
    modal(
      t.name,
      `<p class="eyebrow">d${t.sides} → ${n}</p><p class="library-text" lang="en">${esc(row.text)}</p><p class="small muted">Texto del libro en inglés. Aplicá el efecto con tu DM.</p>`,
      null,
    );
  }
  const roll1 = sides =>
    typeof globalThis.roll === 'function' ? globalThis.roll(sides)[0] : 1 + Math.floor(Math.random() * sides);
  function install() {
    actions['wild-surge'] = el => roll(el).catch(err => toast(err.message));
  }
  return { TABLES, parse, rows, pick, available, install };
})();
if (typeof globalThis !== 'undefined') globalThis.Surge = Surge;
