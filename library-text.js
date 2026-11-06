/* Textos de tus libros en la ficha: rasgos de clase y subclase, opciones de clase y dotes que el DM
   importó en la Biblioteca (los suyos, y los de libros que compartió con tu mesa). Se guardan en este
   navegador para verlos sin conexión. Las claves son las del lector (library-core.js):
   «sub:<subclase>:<rasgo en inglés>», «class:<clase>:<rasgo>», «opt:<opción>», «feat:<dote>». */
const LibraryText = (() => {
  'use strict';
  const STORE = 'dnd-library-text-v1';
  const shared = () => new Map(typeof OfficialContent === 'undefined' ? [] : OfficialContent.ruleTexts);
  let map = shared(),
    loading = null,
    stamp = '';
  try {
    const saved = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (saved?.rows) for (const [key, row] of saved.rows) if (!map.has(key) || !row.bundled) map.set(key, row);
  } catch {
    /* sin almacenamiento: se carga de la nube */
  }
  const signature = () => [...map.keys()].length + '|' + [...map.values()].reduce((a, x) => a + x.text.length, 0);
  stamp = signature();

  async function refresh() {
    if (loading || typeof Cloud === 'undefined') return loading;
    return (loading = (async () => {
      try {
        if (!(await Cloud.currentUser())) return;
        const rows = [...(await Cloud.libraryEntries('feature')), ...(await Cloud.libraryEntries('feat'))];
        const next = shared();
        for (const r of rows) {
          const d = r.data || {};
          if (typeof d.text !== 'string' || !d.text) continue;
          const prev = next.get(r.key);
          // El mismo rasgo en dos libros: el texto más completo.
          if (!prev || d.text.length > prev.text.length)
            next.set(r.key, {
              name: d.name || r.name,
              text: d.text.slice(0, 8000),
              page: d.page || null,
              book: d.book || '',
            });
        }
        map = next;
        try {
          localStorage.setItem(STORE, JSON.stringify({ rows: [...map] }));
        } catch {
          /* lleno o bloqueado: queda en memoria */
        }
        const now = signature();
        if (now !== stamp) {
          stamp = now;
          if (typeof render === 'function' && typeof state !== 'undefined' && state) render();
        }
      } catch {
        /* sin la migración 012, sin conexión o sin sesión: se usa lo guardado */
      } finally {
        loading = null;
      }
    })());
  }
  const get = k => map.get(k) || null;
  const api = {
    refresh,
    size: () => map.size,
    feature: (scope, id, en, child) => get(scope + ':' + id + ':' + en + (child ? '/' + child : '')),
    option: id => get('opt:' + id),
    feat: id => get('feat:' + id),
    // Bloque desplegable con el texto y de dónde sale.
    html(x, open = false) {
      if (!x) return '';
      const e = s =>
        String(s).replace(
          /[&<>"']/g,
          c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
        );
      const where = [
        x.book ? '«' + x.book + '»' : 'tu biblioteca',
        x.page ? 'PDF pág. ' + x.page : x.sourcePage ? 'ed. inglesa pág. ' + x.sourcePage : '',
        x.rulesLanguage === 'en' ? 'texto en inglés' : '',
      ]
        .filter(Boolean)
        .join(', ');
      return `<details class="library-feature"${open ? ' open' : ''}><summary>Texto del libro (${e(where)})</summary><p class="small library-text">${e(x.text)}</p></details>`;
    },
  };
  if (typeof document !== 'undefined') {
    const go = () => setTimeout(refresh, 1500);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
    else go();
    document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && refresh());
  }
  return api;
})();
if (typeof window !== 'undefined') window.LibraryText = LibraryText; // class-rules.js la busca en window
if (typeof module !== 'undefined') module.exports = LibraryText;
