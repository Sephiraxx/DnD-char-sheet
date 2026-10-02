/* Objetos mágicos en Equipo: agregar del catálogo o propios, sintonizar (máximo 3), cargas y pociones. */
const MagicUI = (() => {
  'use strict';
  const M = MagicItems;
  const BASES = {
    weapon: x => x.weapon,
    armor: x => x.armor && x.armor.type !== 'shield',
    shield: x => x.armor?.type === 'shield',
  };
  const baseItems = kind =>
    Object.values(EquipmentData.items)
      .filter(BASES[kind])
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  const uid = () => 'magic-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  // Tarjeta de Equipo.
  function panel() {
    const list = M.rows(state).concat((state.inventory || []).filter(x => x.magic && x.qty === 0));
    const n = M.attunedCount(state);
    return `<section class="card section-space magic-card"><div class="card-header"><h2>Objetos mágicos</h2><div class="actions"><span class="tag ${n >= 3 ? 'warn' : ''}">Sintonía ${n}/3</span>${button('Añadir objeto mágico', 'magic-add', '')}</div></div>${
      list.length
        ? `<div class="magic-list">${list.map(row).join('')}</div>`
        : '<p class="small">Anillos, capas, varitas, armas +1, pociones… Al agregarlos, sus bonos se aplican solos a la CA, salvaciones, conjuros, características y resistencias.</p>'
    }</section>`;
  }
  function row(x) {
    const m = x.magic,
      on = !m.attune || m.attuned,
      fx = M.effects(m),
      c = m.charges;
    const attune = m.attune
      ? button(
          m.attuned ? 'Quitar sintonía' : 'Sintonizar',
          'magic-attune',
          m.attuned ? 'secondary' : '',
          `data-id="${esc(x.id)}"`,
        )
      : '';
    const charges = c
      ? `<div class="pool-row"><div class="pool-head"><span>Cargas</span><button class="text-btn" data-action="magic-charges" data-id="${esc(x.id)}"><strong>${c.max - c.spent} / ${c.max}</strong></button></div><div class="pips">${Array.from(
          { length: c.max },
          (_, i) =>
            `<button class="pip ${i < c.spent ? 'spent' : ''}" data-action="magic-pip" data-id="${esc(x.id)}" data-pip="${i}" aria-label="${i < c.spent ? 'Recuperar una carga' : 'Gastar una carga'}">${i < c.spent ? '−' : '✦'}</button>`,
        ).join('')}</div></div>`
      : '';
    return `<article class="magic-item ${on ? '' : 'inactive'} ${x.qty ? '' : 'empty'}"><div class="magic-head"><div><h3>${esc(x.name)}${x.qty > 1 ? ' ×' + x.qty : ''}</h3><p class="eyebrow">${esc(m.rarity || 'mágico')}${m.attune ? ' · requiere sintonía' + (typeof m.attune === 'string' ? ' (' + esc(m.attune) + ')' : '') : ''}</p></div><div class="actions">${attune}${m.heal && x.qty ? button('Tomar', 'magic-drink', '', `data-id="${esc(x.id)}"`) : ''}${button('Editar', 'item-edit', 'secondary', `data-id="${esc(x.id)}"`)}</div></div>${fx.length ? `<p class="small">${on ? '✓ ' : 'Sin sintonizar: '}${esc(fx.join(' · '))}</p>` : ''}${m.note ? `<p class="small muted">${esc(m.note)}</p>` : ''}${charges}</article>`;
  }

  // Selector del catálogo.
  function add() {
    const items = M.ITEMS.slice().sort((a, b) => a.name.localeCompare(b.name, 'es'));
    modal(
      'Añadir objeto mágico',
      `<input class="control" id="magic-search" type="search" placeholder="Buscar (español o inglés)" aria-label="Buscar objeto mágico"><div class="magic-pick-list">${items
        .map(
          it =>
            `<button type="button" class="magic-pick" data-action="magic-pick" data-id="${it.id}" data-q="${esc((it.name + ' ' + it.english).toLowerCase())}"><b>${esc(it.name)}</b><span class="small muted">${esc(it.rarity)}${it.attune ? ' · sintonía' : ''} · ${esc(
              M.effects(M.fromCatalog(it.id, { resist: 'fire' }))
                .slice(0, 2)
                .join(' · ') || (it.note || '').slice(0, 60),
            )}</span></button>`,
        )
        .join('')}</div><div class="actions section-space">${button('Objeto mágico propio', 'magic-custom')}</div>`,
    );
  }
  function pick(id) {
    const it = M.byId(id);
    const base = it.base
      ? select(
          it.base === 'weapon' ? 'Arma' : it.base === 'shield' ? 'Escudo' : 'Armadura',
          'base',
          baseItems(it.base).map(x => [x.id, x.name]),
        )
      : '';
    const resist =
      it.resist === 'choose'
        ? select(
            'Resistencia a',
            'resist',
            Defenses.TYPES.map(([k, l]) => [k, l]),
          )
        : '';
    modal(
      it.name,
      `<p class="small">${esc(M.effects(M.fromCatalog(it.id, { resist: 'fire' })).join(' · '))}</p>${it.note ? `<p class="small muted">${esc(it.note)}</p>` : ''}<div class="form-grid">${base}${resist}${field('Cantidad', 'qty', 1, 'number', 'min="1" max="99" required')}</div>`,
      fd => {
        const m = M.fromCatalog(id, { resist: fd.get('resist') });
        const b = it.base ? EquipmentData.items[fd.get('base')] : null;
        const n = it.weapon || it.armor || it.shield,
          name = !b ? it.name : n && /\+\d$/.test(it.name) ? `${b.name} +${n}` : `${it.name} (${b.name})`;
        const qty = Math.max(1, Math.min(99, Number(fd.get('qty')) || 1));
        commit('Objeto mágico: ' + name, s => {
          const rowData = {
            id: uid(),
            name,
            qty,
            category: b ? b.category : it.heal ? 'Consumibles' : 'Tesoro',
            notes: '',
            location: 'Encima',
            weight: b ? b.weight : null,
            magic: m,
          };
          if (b) rowData.equipmentId = b.id;
          if (it.base === 'weapon')
            rowData.attack = { ability: 'auto', proficient: 'auto', magic: m.weapon || 0, extra: m.extra || '' };
          s.inventory.push(rowData);
        });
        toast(it.attune ? `${it.name} agregado. Sintonizalo para que funcione.` : `${it.name} agregado.`);
      },
      'Agregar',
    );
  }
  function custom() {
    modal(
      'Objeto mágico propio',
      `${field('Nombre', 'name', '', 'text', 'required maxlength="200"')}<div class="form-grid">${select(
        'Rareza',
        'rarity',
        ['común', 'poco común', 'raro', 'muy raro', 'legendario', 'artefacto'].map(x => [x, x]),
        'poco común',
      )}${select(
        'Sintonía',
        'attune',
        [
          ['no', 'No requiere'],
          ['yes', 'Requiere sintonía'],
        ],
        'no',
      )}${field('Bono a la CA', 'ac', 0, 'number', 'min="-5" max="10"')}${field('Bono a salvaciones', 'save', 0, 'number', 'min="-5" max="10"')}${field('Bono a ataque de conjuro', 'spellAttack', 0, 'number', 'min="-5" max="10"')}${field('Bono a CD de conjuros', 'spellDC', 0, 'number', 'min="-5" max="10"')}${field('Cargas máximas (0 = sin cargas)', 'charges', 0, 'number', 'min="0" max="100"')}${field('Recupera al amanecer (ej. 1d6+1)', 'regain', '1d6+1', 'text', 'maxlength="12"')}</div><label class="field">Qué hace<textarea name="note" maxlength="500"></textarea></label>`,
      fd => {
        const num = k => Math.max(-5, Math.min(10, Math.trunc(Number(fd.get(k)) || 0)));
        const m = { rarity: String(fd.get('rarity')), attune: fd.get('attune') === 'yes', attuned: false };
        for (const k of ['ac', 'save', 'spellAttack', 'spellDC']) if (num(k)) m[k] = num(k);
        const ch = Math.max(0, Math.min(100, Math.trunc(Number(fd.get('charges')) || 0)));
        if (ch) {
          const regain = String(fd.get('regain') || '0').replace(/\s/g, '');
          if (!/^\d+(d\d+)?(\+\d+)?$/.test(regain)) throw Error('Recuperación: usá un número o dados como 1d6+1.');
          m.charges = { max: ch, regain, spent: 0 };
        }
        const note = String(fd.get('note') || '').trim();
        if (note) m.note = note;
        const name = String(fd.get('name')).trim();
        commit('Objeto mágico: ' + name, s => {
          s.inventory.push({
            id: uid(),
            name,
            qty: 1,
            category: 'Tesoro',
            notes: '',
            location: 'Encima',
            weight: null,
            magic: m,
          });
        });
      },
      'Agregar',
    );
  }

  function find(id) {
    const x = state.inventory.find(r => r.id === id && r.magic);
    if (!x) throw Error('Ese objeto ya no está en tu inventario.');
    return x;
  }
  function attune(id) {
    const x = find(id),
      on = !x.magic.attuned;
    if (on && M.attunedCount(state) >= 3)
      throw Error('Ya tenés 3 objetos sintonizados. Quitá la sintonía de otro primero.');
    commit((on ? 'Sintonía: ' : 'Sin sintonía: ') + x.name, s => {
      s.inventory.find(r => r.id === id).magic.attuned = on;
    });
    toast(
      on ? `${x.name} sintonizado (requiere un descanso corto con el objeto).` : `${x.name} ya no está sintonizado.`,
    );
  }
  function pip(id, i) {
    const x = find(id),
      c = x.magic.charges;
    commit(`${x.name}: cargas`, s => {
      const cc = s.inventory.find(r => r.id === id).magic.charges;
      cc.spent = i < c.spent ? i : i + 1;
    });
  }
  function charges(id) {
    const x = find(id),
      c = x.magic.charges;
    modal(
      x.name + ' · cargas',
      `<p>Quedan <b>${c.max - c.spent}</b> de ${c.max}.${c.regain !== '0' ? ' Recupera ' + esc(c.regain) + ' con el descanso largo (al amanecer).' : ''}</p><div class="form-grid">${field('Cargas restantes', 'left', c.max - c.spent, 'number', `min="0" max="${c.max}" required`)}</div>`,
      fd => {
        const left = Math.max(0, Math.min(c.max, Math.trunc(Number(fd.get('left')))));
        commit(`${x.name}: ${left}/${c.max} cargas`, s => {
          s.inventory.find(r => r.id === id).magic.charges.spent = c.max - left;
        });
      },
      'Guardar',
    );
  }
  // Poción: tirada de curación, se aplica a la ficha y se descuenta una.
  function drink(id) {
    const x = find(id),
      m = /^(\d+)d(\d+)\+(\d+)$/.exec(x.magic.heal);
    if (!m) throw Error('Esta poción no tiene una curación reconocible.');
    const rolls = window.roll(Number(m[2]), Number(m[1])),
      total = rolls.reduce((a, b) => a + b, 0) + Number(m[3]),
      max = R.stats(state).maxHP;
    commit(`${x.name}: +${total} PG`, s => {
      const r = s.inventory.find(y => y.id === id);
      r.qty = Math.max(0, r.qty - 1);
      s.hp = Math.min(max, (s.hp ?? 0) + total);
      if (s.hp > 0) {
        s.death = { success: 0, failure: 0 };
        s.conditions = s.conditions.filter(c => c !== 'Inconsciente');
      }
    });
    if (typeof RollFX !== 'undefined') RollFX.show({ label: x.name, total, face: rolls[0] });
    toast(`${x.name}: ${x.magic.heal} → ${rolls.join(' + ')} + ${m[3]} = ${total} PG.`);
  }

  // Cargas como fichas en la vista compacta de combate.
  function pills() {
    return M.active(state)
      .filter(x => x.magic.charges)
      .map(
        x =>
          `<button type="button" class="cc-pill ${x.magic.charges.spent >= x.magic.charges.max ? 'empty' : ''}" data-action="magic-charges" data-id="${esc(x.id)}"><span>${esc(x.name)}</span><b>${x.magic.charges.max - x.magic.charges.spent}/${x.magic.charges.max}</b></button>`,
      )
      .join('');
  }

  function install() {
    Object.assign(actions, {
      'magic-add': add,
      'magic-pick': e => pick(e.dataset.id),
      'magic-custom': custom,
      'magic-attune': e => attune(e.dataset.id),
      'magic-pip': e => pip(e.dataset.id, Number(e.dataset.pip)),
      'magic-charges': e => charges(e.dataset.id),
      'magic-drink': e => drink(e.dataset.id),
    });
    document.addEventListener('input', e => {
      if (e.target.id !== 'magic-search') return;
      const q = e.target.value.trim().toLowerCase();
      for (const b of document.querySelectorAll('.magic-pick')) b.hidden = q && !b.dataset.q.includes(q);
    });
  }
  return { panel, pills, install };
})();
