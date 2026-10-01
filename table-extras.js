/* Botín compartido y homebrew de la mesa. Se usa en la sección Mesa (jugador) y en la pantalla del DM.
   Ambas páginas definen modal(), field(), select(), button(), toast() y el objeto actions. */
const TableExtras = (() => {
  'use strict';
  const esc = PartyView.esc;
  const COINS = [
    ['pp', 'Platino'],
    ['gp', 'Oro'],
    ['ep', 'Electro'],
    ['sp', 'Plata'],
    ['cp', 'Cobre'],
  ];
  const TIMES = ['Acción', 'Adicional', 'Reacción', 'Especial'];
  const SAVES = ['', 'Fuerza', 'Destreza', 'Constitución', 'Inteligencia', 'Sabiduría', 'Carisma'];
  let ctx = { party: null, campaignId: '', refresh: () => {} };

  // ---------- Jugador ----------
  function playerHtml(party, characterId) {
    ctx = { ...ctx, party };
    const loot = party.loot || [],
      free = loot.filter(x => !x.claimed_character),
      taken = loot.filter(x => x.claimed_character),
      rules = (party.homebrew || []).filter(x => x.kind === 'rule'),
      items = (party.homebrew || []).filter(x => x.kind === 'item'),
      spells = (party.homebrew || []).filter(x => x.kind === 'spell');
    const lootCard = loot.length
      ? `<section class="card section-space"><h2>Botín de la party</h2>${
          free.length
            ? `<div class="party-list">${free
                .map(
                  x =>
                    `<div class="list-row"><div><b>${x.qty > 1 ? x.qty + ' × ' : ''}${esc(x.name)}</b>${x.notes ? `<p class="small muted">${esc(x.notes)}</p>` : ''}</div>${button('Tomar', 'loot-claim', '', `data-id="${esc(x.id)}"`)}</div>`,
                )
                .join('')}</div>`
            : '<p class="muted">No queda nada por repartir.</p>'
        }${taken.length ? `<p class="small section-space">${taken.map(x => `${esc(x.claimed_name || 'Alguien')} tomó ${esc(x.name)}`).join(' · ')}</p>` : ''}</section>`
      : '';
    const hb = rules.length || items.length || spells.length;
    const hbCard = hb
      ? `<section class="card section-space"><h2>Homebrew de la mesa</h2>${rules
          .map(
            r =>
              `<details class="battle-rule"><summary>${esc(r.name)}</summary><p>${esc(r.data.text || '')}</p></details>`,
          )
          .join(
            '',
          )}${items.length ? `<h3 class="section-space">Objetos</h3>${items.map(x => hbRow(x, 'Agregar a mi inventario')).join('')}` : ''}${spells.length ? `<h3 class="section-space">Conjuros</h3>${spells.map(x => hbRow(x, 'Agregar a mi ficha', characterId)).join('')}` : ''}</section>`
      : '';
    return lootCard + hbCard;
  }
  function hbRow(x, label) {
    const d = x.data || {};
    const meta =
      x.kind === 'spell'
        ? `${d.level ? 'Nivel ' + d.level : 'Truco'} · ${esc(d.time || 'Acción')} · ${esc(d.range || '')} · ${esc(d.duration || '')}`
        : `${esc(d.category || 'Equipo')}${d.weight ? ' · ' + esc(d.weight) + ' lb' : ''}`;
    const have =
      x.kind === 'spell'
        ? (state.customSpells || []).some(s => s.id === 'hb-' + x.id)
        : state.inventory.some(i => i.homebrewId === x.id);
    return `<div class="list-row"><div><b>${esc(x.name)}</b><p class="small muted">${meta}</p>${d.text ? `<p class="small">${esc(d.text)}</p>` : ''}</div>${have ? '<span class="tag">En tu ficha</span>' : button(label, 'homebrew-take', 'secondary', `data-id="${esc(x.id)}"`)}</div>`;
  }
  function claim(id, characterId) {
    const item = ctx.party?.loot.find(x => x.id === id);
    if (!item) throw Error('Ese objeto ya no está.');
    return Cloud.claimLoot(id, characterId, state.name).then(() => {
      commit('Botín: ' + item.name, s =>
        s.inventory.push({
          id: uid(),
          name: item.name,
          qty: item.qty,
          category: 'Equipo',
          weight: null,
          location: 'Con el personaje',
          notes: item.notes || 'Botín de la party',
        }),
      );
      toast('Tomaste ' + item.name + '.');
      ctx.refresh();
    });
  }
  function take(id) {
    const x = ctx.party?.homebrew.find(h => h.id === id);
    if (!x) throw Error('No encontrado.');
    const d = x.data || {};
    if (x.kind === 'item')
      return commit('Homebrew: ' + x.name, s =>
        s.inventory.push({
          id: uid(),
          homebrewId: x.id,
          name: x.name,
          qty: 1,
          category: d.category || 'Equipo',
          weight: Number.isFinite(d.weight) ? d.weight : null,
          location: 'Con el personaje',
          notes: (d.text || '').slice(0, 2000) || 'Objeto de la mesa',
        }),
      );
    commit('Homebrew: conjuro ' + x.name, s => {
      const sp = {
        id: 'hb-' + x.id,
        name: x.name,
        level: Number(d.level) || 0,
        time: TIMES.includes(d.time) ? d.time : 'Acción',
        range: String(d.range || '—').slice(0, 100),
        components: String(d.components || '—').slice(0, 500),
        duration: String(d.duration || 'Instantáneo').slice(0, 100),
        text: String(d.text || '').slice(0, 12000),
        brief: String(d.brief || d.text || '').slice(0, 1000),
        source: 'Mesa: ' + (ctx.party?.campaign.name || 'homebrew'),
        bard: false,
        concentration: Boolean(d.concentration),
        ritual: Boolean(d.ritual),
        attackKind: d.attack ? ['R'] : [],
        saveAbility: d.save ? [d.save] : [],
      };
      s.customSpells = [...s.customSpells.filter(c => c.id !== sp.id), sp];
      if (!s.extras.includes(sp.id)) s.extras.push(sp.id);
    });
    toast(x.name + ' quedó en tus conjuros (Extra del DM).');
  }

  // ---------- DM ----------
  function dmHtml(party) {
    ctx = { ...ctx, party };
    const loot = party.loot || [],
      hb = party.homebrew || [];
    const kindName = { item: 'Objeto', spell: 'Conjuro', rule: 'Regla' };
    return `<section class="card"><div class="card-header"><h2>Botín</h2><div class="actions">${button('Agregar', 'loot-add', 'text-btn')}${button('Repartir monedas', 'coins-split', 'text-btn')}</div></div>${
      loot.length
        ? `<div class="party-list">${loot
            .map(
              x =>
                `<div class="list-row"><div><b>${x.qty > 1 ? x.qty + ' × ' : ''}${esc(x.name)}</b><p class="small muted">${x.claimed_character ? 'Lo tomó ' + esc(x.claimed_name || 'alguien') : 'Sin reclamar'}</p></div>${button('×', 'loot-remove', 'text-btn', `data-id="${esc(x.id)}" aria-label="Quitar ${esc(x.name)}"`)}</div>`,
            )
            .join('')}</div>`
        : '<p class="small muted">Los objetos que agregues aparecen en la Mesa de cada jugador para que los tomen.</p>'
    }</section>
    <section class="card"><div class="card-header"><h2>Homebrew</h2>${button('Agregar', 'homebrew-new', 'text-btn')}</div>${
      hb.length
        ? `<div class="party-list">${hb
            .map(
              x =>
                `<div class="list-row"><div><b>${esc(x.name)}</b><p class="small muted">${kindName[x.kind]}</p></div><div class="actions">${button('Editar', 'homebrew-edit', 'text-btn', `data-id="${esc(x.id)}"`)}${button('×', 'homebrew-remove', 'text-btn', `data-id="${esc(x.id)}" aria-label="Quitar ${esc(x.name)}"`)}</div></div>`,
            )
            .join('')}</div>`
        : '<p class="small muted">Objetos, conjuros y reglas propias de tu mesa. Los jugadores los agregan a su ficha desde Mesa.</p>'
    }</section>`;
  }
  const n = (fd, k, min, max, def = 0) => {
    const raw = fd.get(k);
    if (raw === null || raw === '') return def;
    const v = Number(raw);
    if (!Number.isInteger(v) || v < min || v > max) throw Error(`Revisá «${k}».`);
    return v;
  };
  function lootAdd() {
    modal(
      'Agregar al botín',
      `${field('Objeto', 'name', '', 'text', 'required maxlength="150" placeholder="Anillo de protección"')}<div class="form-grid">${field('Cantidad', 'qty', 1, 'number', 'min="1" max="9999" required')}</div><label class="field">Notas<textarea name="notes" maxlength="2000"></textarea></label>`,
      async fd => {
        await Cloud.addLoot(ctx.campaignId, {
          name: String(fd.get('name')).trim(),
          qty: n(fd, 'qty', 1, 9999, 1),
          notes: String(fd.get('notes')).trim(),
        });
        ctx.refresh();
      },
      'Agregar',
    );
  }
  // Reparte monedas en partes iguales; lo que no divide exacto queda anotado para el DM.
  function coinsSplit() {
    const chars = ctx.party?.characters || [];
    if (!chars.length) throw Error('Todavía no hay fichas en la mesa.');
    modal(
      'Repartir monedas',
      `<div class="form-grid">${COINS.map(([k, l]) => field(l, k, '', 'number', 'min="0" max="9999999"')).join('')}</div><fieldset class="campaign-sources"><legend>Entre</legend><div class="source-grid">${chars.map(c => `<label class="check"><input type="checkbox" name="who" value="${esc(c.id)}" checked>${esc(c.name)}</label>`).join('')}</div></fieldset>`,
      async fd => {
        const who = fd.getAll('who');
        if (!who.length) throw Error('Elegí al menos una ficha.');
        const each = {},
          rest = [];
        for (const [k, l] of COINS) {
          const total = n(fd, k, 0, 9999999);
          each[k] = Math.floor(total / who.length);
          if (total % who.length) rest.push(`${total % who.length} ${l.toLowerCase()}`);
        }
        if (!Object.values(each).some(Boolean)) throw Error('No alcanza para repartir.');
        for (const id of who) await Cloud.post(ctx.campaignId, 'gold', each, { target: id });
        toast('Monedas repartidas.' + (rest.length ? ' Sobra: ' + rest.join(', ') + '.' : ''));
        ctx.refresh();
      },
      'Repartir',
    );
  }
  function homebrewForm(x = null) {
    const d = x?.data || {},
      kind = x?.kind || 'item';
    modal(
      x ? 'Editar ' + x.name : 'Nuevo homebrew',
      `${select(
        'Tipo',
        'kind',
        [
          ['item', 'Objeto'],
          ['spell', 'Conjuro'],
          ['rule', 'Regla de la casa'],
        ],
        kind,
      )}${field('Nombre', 'name', x?.name || '', 'text', 'required maxlength="150"')}<label class="field">Descripción<textarea name="text" maxlength="5000">${esc(d.text || '')}</textarea></label>
      <details class="battle-rule" ${kind === 'item' ? 'open' : ''}><summary>Si es objeto</summary><div class="form-grid">${field('Categoría', 'category', d.category || 'Equipo', 'text', 'maxlength="100"')}${field('Peso (lb)', 'weight', d.weight ?? '', 'number', 'min="0" max="9999" step="0.1"')}</div></details>
      <details class="battle-rule" ${kind === 'spell' ? 'open' : ''}><summary>Si es conjuro</summary><div class="form-grid">${field('Nivel (0 = truco)', 'level', d.level ?? 1, 'number', 'min="0" max="9"')}${select(
        'Tiempo',
        'time',
        TIMES.map(t => [t, t]),
        d.time || 'Acción',
      )}${field('Alcance', 'range', d.range || '', 'text', 'maxlength="100" placeholder="60 pies"')}${field('Componentes', 'components', d.components || '', 'text', 'maxlength="200" placeholder="V, S"')}${field('Duración', 'duration', d.duration || '', 'text', 'maxlength="100" placeholder="Concentración, hasta 1 minuto"')}${field('Dados (para la tirada)', 'dice', d.dice || '', 'text', 'maxlength="20" placeholder="2d8"')}${select(
        'Salvación',
        'save',
        SAVES.map(s => [s, s || 'Ninguna']),
        d.save || '',
      )}</div><label class="check"><input type="checkbox" name="attack" ${d.attack ? 'checked' : ''}>Usa tirada de ataque de conjuro</label><label class="check"><input type="checkbox" name="concentration" ${d.concentration ? 'checked' : ''}>Concentración</label><label class="check"><input type="checkbox" name="ritual" ${d.ritual ? 'checked' : ''}>Ritual</label></details>`,
      async fd => {
        const k = fd.get('kind'),
          text = String(fd.get('text')).trim(),
          dice = String(fd.get('dice') || '').trim();
        if (dice && !/^\d+d\d+$/.test(dice)) throw Error('Los dados se escriben como «2d8».');
        const data =
          k === 'item'
            ? {
                text,
                category: String(fd.get('category')).trim() || 'Equipo',
                weight: fd.get('weight') === '' ? null : Number(fd.get('weight')),
              }
            : k === 'spell'
              ? {
                  text,
                  brief: (dice ? dice + '. ' : '') + text.slice(0, 900),
                  level: n(fd, 'level', 0, 9, 1),
                  time: fd.get('time'),
                  range: String(fd.get('range')).trim(),
                  components: String(fd.get('components')).trim(),
                  duration: String(fd.get('duration')).trim() || 'Instantáneo',
                  dice,
                  save: fd.get('save'),
                  attack: fd.has('attack'),
                  concentration: fd.has('concentration'),
                  ritual: fd.has('ritual'),
                }
              : { text };
        await Cloud.saveHomebrew(ctx.campaignId, { kind: k, name: String(fd.get('name')).trim(), data }, x?.id || null);
        ctx.refresh();
      },
      'Guardar',
    );
  }

  // Ambas páginas llaman a install con su forma de refrescar y la mesa actual.
  function install({ refresh, campaignId, characterId }) {
    ctx.refresh = refresh;
    Object.assign(actions, {
      'loot-claim': e => claim(e.dataset.id, characterId()).catch(err => toast(err.message)),
      'homebrew-take': e => take(e.dataset.id),
      'loot-add': () => {
        ctx.campaignId = campaignId();
        lootAdd();
      },
      'loot-remove': e => Cloud.removeLoot(e.dataset.id).then(ctx.refresh),
      'coins-split': () => {
        ctx.campaignId = campaignId();
        coinsSplit();
      },
      'homebrew-new': () => {
        ctx.campaignId = campaignId();
        homebrewForm();
      },
      'homebrew-edit': e => {
        ctx.campaignId = campaignId();
        homebrewForm(ctx.party?.homebrew.find(x => x.id === e.dataset.id));
      },
      'homebrew-remove': e => {
        if (confirm('¿Quitar este homebrew de la mesa? Las fichas que ya lo agregaron lo conservan.'))
          Cloud.removeHomebrew(e.dataset.id).then(ctx.refresh);
      },
    });
  }
  return { playerHtml, dmHtml, install };
})();
