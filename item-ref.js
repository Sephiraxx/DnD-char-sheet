/* Objetos de verdad para el botín y lo que entrega el DM: un buscador de objetos mágicos (catálogo y
   libros) y de equipo, y la fila que recibe la ficha del jugador con sus efectos, su arma o armadura base
   y sus cargas. Lo que no está en el catálogo se sigue entregando como texto libre.
   La referencia viaja como { kind: 'magic' | 'gear', id, base?, resist? }. */
(function (root) {
  'use strict';
  const fold = s =>
    String(s || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9+]+/g, ' ')
      .trim();
  const esc = s =>
    String(s ?? '').replace(
      /[&<>"']/g,
      c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const M = () => root.MagicItems;
  const gear = id => root.EquipmentData?.items[id];

  let index = null;
  function all() {
    if (index) return index;
    const magic = (M()?.ITEMS || []).map(it => ({
      ref: 'magic:' + it.id,
      name: it.name,
      q: fold(it.name + ' ' + (it.english || '')),
      sub: [it.rarity, it.attune ? 'sintonía' : '', it.source || ''].filter(Boolean).join(' · '),
      magic: true,
    }));
    const mundane = Object.values(root.EquipmentData?.items || {})
      .filter(x => !x.id.startsWith('origin-'))
      .map(x => ({
        ref: 'gear:' + x.id,
        name: x.name,
        q: fold(x.name + ' ' + x.id.replace(/-/g, ' ')),
        sub: x.category,
      }));
    return (index = [...magic, ...mundane]);
  }
  function search(text, limit = 12) {
    const q = fold(text);
    if (q.length < 2) return [];
    const words = q.split(' ');
    const hits = all().filter(x => words.every(w => x.q.includes(w)));
    const score = x => (x.q.startsWith(q) ? 0 : x.q.includes(' ' + q) ? 1 : 2) + (x.magic ? 0 : 0.5);
    return hits.sort((a, b) => score(a) - score(b) || a.name.localeCompare(b.name, 'es')).slice(0, limit);
  }

  // Referencia segura: lo que llega de la nube se valida contra el catálogo de esta copia.
  function clean(ref) {
    if (!ref || typeof ref !== 'object') return null;
    const id = typeof ref.id === 'string' ? ref.id.slice(0, 100) : '';
    if (ref.kind === 'magic') {
      const it = M()?.byId(id);
      if (!it) return null;
      const out = { kind: 'magic', id: it.id };
      if (
        it.base &&
        typeof ref.base === 'string' &&
        M()
          .bases(it.base)
          .some(b => b.id === ref.base)
      )
        out.base = ref.base;
      if (it.resist === 'choose' && typeof ref.resist === 'string' && /^[a-z]{3,20}$/.test(ref.resist))
        out.resist = ref.resist;
      return out;
    }
    if (ref.kind === 'gear' && gear(id)) return { kind: 'gear', id };
    return null;
  }
  function parse(value) {
    const [kind, ...rest] = String(value || '').split(':');
    return clean({ kind, id: rest.join(':') });
  }

  // Qué es y qué hace, en una línea (para el DM y para la tarjeta del botín).
  function describe(ref) {
    const r = clean(ref);
    if (!r) return '';
    if (r.kind === 'gear') {
      const x = gear(r.id);
      return [x.category, x.notes].filter(Boolean).join(' · ');
    }
    const it = M().byId(r.id);
    const fx = M().effects(M().fromCatalog(it.id, { resist: r.resist || 'fire' }));
    const base = it.base ? gear(r.base || M().baseFor(it))?.name : '';
    return [it.rarity, it.attune ? 'requiere sintonía' : '', base, ...fx.slice(0, 3)].filter(Boolean).join(' · ');
  }
  function name(ref, fallback = '') {
    const r = clean(ref);
    if (!r) return fallback;
    if (r.kind === 'gear') return gear(r.id).name;
    return M().inventoryRow(r.id, { base: r.base, resist: r.resist }).name;
  }

  // Filas para el inventario. Los paquetes se abren en sus objetos, como en «Añadir del catálogo».
  function rows(ref, { qty = 1, notes = '', uid } = {}) {
    const r = clean(ref);
    if (!r) return null;
    const n = Math.max(1, Math.min(9999, Math.trunc(Number(qty)) || 1));
    const id = () => (uid ? uid() : 'item-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6));
    if (r.kind === 'magic') {
      const out = [];
      // El inventario mágico admite hasta 99 por fila.
      for (let left = n; left > 0; left -= 99)
        out.push(M().inventoryRow(r.id, { base: r.base, resist: r.resist, qty: Math.min(99, left), uid: id(), notes }));
      return out;
    }
    const out = [];
    const add = (gid, k) => {
      const x = gear(gid);
      if (!x) return;
      if (x.contents) return x.contents.forEach(t => add(t.item, t.qty * k));
      out.push({
        id: id(),
        equipmentId: gid,
        name: x.name,
        qty: k,
        category: x.category,
        weight: x.weight ?? null,
        location: 'Con el personaje',
        notes: notes || x.notes || '',
      });
    };
    add(r.id, n);
    return out;
  }

  // ---------- Buscador dentro de un formulario ----------
  // Va dentro de modal(): un campo de texto que busca, la lista de resultados y, al elegir, el arma o
  // armadura base y el tipo de resistencia cuando el objeto los pide.
  function picker(field = 'name', value = '') {
    return `<div class="item-ref"><label class="field">Objeto<input name="${field}" class="item-ref-q" type="search" autocomplete="off" required maxlength="150" value="${esc(value)}" placeholder="Buscá en el catálogo o escribí uno propio" aria-describedby="item-ref-help"></label><input type="hidden" name="ref" value=""><div class="item-ref-results" role="listbox" aria-label="Objetos del catálogo"></div><div class="item-ref-extra"></div><p class="small muted" id="item-ref-help">Elegí uno de la lista para que llegue con sus efectos (bonos, cargas, curación) y se pueda equipar o sintonizar. Si no está, queda como texto.</p></div>`;
  }
  function extraHtml(r) {
    if (!r) return '';
    let html = `<p class="small item-ref-chosen">✓ ${esc(describe(r) || 'Del catálogo')}</p>`;
    if (r.kind !== 'magic') return html;
    const it = M().byId(r.id);
    const sel = (label, name, opts, v) =>
      `<label class="field">${label}<select name="${name}">${opts.map(([k, t]) => `<option value="${esc(k)}" ${k === v ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`;
    if (it.base)
      html += sel(
        it.base === 'weapon' ? 'Arma' : it.base === 'shield' ? 'Escudo' : 'Armadura',
        'refBase',
        M()
          .bases(it.base)
          .map(x => [x.id, x.name]),
        M().baseFor(it),
      );
    if (it.resist === 'choose' && root.Defenses)
      html += sel(
        'Resistencia a',
        'refResist',
        root.Defenses.TYPES.map(([k, l]) => [k, l]),
        'fire',
      );
    return html;
  }
  function choose(el) {
    const box = el.closest('.item-ref');
    const r = parse(el.dataset.ref);
    if (!box || !r) return;
    box.querySelector('.item-ref-q').value = name(r, el.dataset.name || '');
    box.querySelector('[name=ref]').value = el.dataset.ref;
    box.querySelector('.item-ref-results').innerHTML = '';
    box.querySelector('.item-ref-extra').innerHTML = extraHtml(r);
  }
  // Lo elegido en el formulario, o null si es texto libre.
  function fromForm(fd) {
    const r = parse(fd.get('ref'));
    if (!r) return null;
    if (r.kind === 'magic') {
      const it = M().byId(r.id);
      if (it.base && fd.get('refBase')) r.base = String(fd.get('refBase'));
      if (it.resist === 'choose') r.resist = String(fd.get('refResist') || 'fire');
    }
    return clean(r);
  }
  let installed = false;
  function install(actions) {
    if (actions) actions['item-ref-pick'] = choose;
    if (installed || typeof document === 'undefined') return;
    installed = true;
    document.addEventListener('input', e => {
      if (!e.target.classList?.contains('item-ref-q')) return;
      const box = e.target.closest('.item-ref');
      box.querySelector('[name=ref]').value = '';
      box.querySelector('.item-ref-extra').innerHTML = '';
      box.querySelector('.item-ref-results').innerHTML = search(e.target.value)
        .map(
          x =>
            `<button type="button" class="item-ref-pick" role="option" data-action="item-ref-pick" data-ref="${esc(x.ref)}" data-name="${esc(x.name)}"><b>${esc(x.name)}</b><span class="small muted">${esc(x.sub)}</span></button>`,
        )
        .join('');
    });
  }

  root.ItemRef = { search, clean, parse, describe, name, rows, picker, fromForm, install };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.ItemRef;
})(typeof window !== 'undefined' ? window : globalThis);
