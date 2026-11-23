/* El DM crea y juega los PNJ aliados desde la mesa. */
const DmFriendlyUI = (() => {
  'use strict';

  function card(list, entries) {
    return `<section class="card"><div class="card-header"><h2>PNJ aliados</h2>${button('Nuevo aliado', 'npc-new', '')}</div>${
      list
        .map(({ row, x }) => {
          const data = `data-id="${esc(row.id)}"`;
          return `<div class="dm-ally-row"><div><strong>${esc(row.name)}</strong><p class="small muted">${esc(x.line)} · ${esc(x.race)} · ${x.hp ?? '—'}/${x.maxHP ?? '—'} PG</p></div><div class="actions">${button('Controlar', 'npc-control', '', data)}${
            entries.some(e => e.characterId === row.id)
              ? '<span class="small muted">En iniciativa</span>'
              : button('Sumar a iniciativa', 'npc-init', 'secondary', data)
          }${button('Quitar', 'kick', 'text-btn', data)}</div></div>`;
        })
        .join('') || '<p class="small muted">Creá aliados con su ficha de combate, conjuros y recursos de clase.</p>'
    }</section>`;
  }

  async function create() {
    const campaign = party.campaign;
    await OfficialContent.ready();
    const { classes, races } = FriendlyNPC.choices();
    let selected = [];
    const read = fd => ({
      name: String(fd.get('name') || ''),
      classId: fd.get('class'),
      level: Number(fd.get('level')),
      raceId: fd.get('race'),
      campaignSources: Cloud.cleanSettings(campaign.settings).sources,
    });
    modal(
      'Nuevo PNJ aliado',
      `${field('Nombre', 'name', '', 'text', 'maxlength="100" required')}
      <div class="form-grid">${select(
        'Clase',
        'class',
        classes.map(c => [c.id, c.name]),
        'fighter',
      )}
      ${field('Nivel', 'level', 1, 'number', 'min="1" max="20" required')}
      ${select('Raza', 'race', [['', 'Elegí una raza'], ...races.map(r => [r.id, r.name + ' · ' + r.source])])}</div>
      <div id="dm-ally-spells"></div>`,
      async fd => {
        const s = FriendlyNPC.create(read(fd), selected);
        await Cloud.createFriendlyNpc(campaign, s);
        if (current === campaign.id) await refresh();
        toast('PNJ aliado guardado en la mesa.');
      },
      'Crear aliado',
    );
    const form = $('#dialog-form');
    const pane = $('#dm-ally-spells');
    function renderSpells(adding = '') {
      const input = read(new FormData(form));
      if (!input.raceId || !Number.isInteger(input.level) || input.level < 1 || input.level > 20) {
        pane.innerHTML = '';
        return;
      }
      const { limit, pool } = FriendlyNPC.spellOptions(FriendlyNPC.baseSheet(input));
      const counts = { cantrip: 0, spell: 0 };
      const group = sp => (sp.level ? 'spell' : 'cantrip');
      const byId = new Map(pool.map(sp => [sp.id, sp]));
      selected = [...new Set([...selected, ...(adding ? [adding] : [])])].filter(id => {
        const sp = byId.get(id);
        return sp && counts[group(sp)]++ < limit[group(sp)];
      });
      counts.cantrip = selected.filter(id => byId.get(id).level === 0).length;
      counts.spell = selected.length - counts.cantrip;
      const remaining = pool.filter(sp => !selected.includes(sp.id) && counts[group(sp)] < limit[group(sp)]);
      pane.innerHTML = pool.length
        ? `<fieldset><legend>Conjuros</legend><p class="small muted">${counts.cantrip}/${limit.cantrip} trucos · ${counts.spell}/${limit.spell} conjuros</p>${
            remaining.length
              ? select('Añadir conjuro', 'spell-add', [
                  ['', 'Elegí un conjuro'],
                  ...remaining.map(sp => [sp.id, `${sp.level ? 'Nivel ' + sp.level : 'Truco'} · ${sp.name}`]),
                ])
              : ''
          }<div class="actions">${selected.map(id => `<button type="button" class="button secondary" data-ally-spell="${esc(id)}" aria-label="Quitar ${esc(byId.get(id).name)}">${esc(byId.get(id).name)} ×</button>`).join('')}</div></fieldset>`
        : '';
    }
    form.addEventListener('change', e => {
      if (['class', 'level', 'race', 'spell-add'].includes(e.target.name))
        renderSpells(e.target.name === 'spell-add' ? e.target.value : '');
    });
    pane.addEventListener('click', e => {
      const item = e.target.closest('[data-ally-spell]');
      if (!item) return;
      selected = selected.filter(id => id !== item.dataset.allySpell);
      renderSpells();
      pane.querySelector('select')?.focus();
    });
    renderSpells();
  }

  function rowFor(id) {
    const row = characterById(id);
    if (!row || !FriendlyNPC.ownedByDM(row, party.campaign)) throw Error('Ese PNJ aliado ya no está en la mesa.');
    return row;
  }

  // Mantener la ficha montada al cerrar permite que termine el guardado y reciba curaciones.
  async function control(id) {
    const row = rowFor(id);
    const camp = party.campaign;
    const localId = Cloud.restore({ ...row, campaign_id: camp.id, campaigns: camp });
    const panel = $('#dm-ally-control');
    const frame = panel.querySelector('iframe');
    if (frame.dataset.ally !== id) {
      if (frame.contentWindow?.Cloud) await frame.contentWindow.Cloud.flush();
      frame.dataset.ally = id;
      frame.src = './index.html?aliado=' + encodeURIComponent(localId) + '#combat';
    }
    panel.querySelector('h2').textContent = row.name;
    frame.title = 'Ficha de ' + row.name;
    panel.showModal();
  }

  async function initiative(id) {
    const row = rowFor(id);
    if (tracker().entries.some(e => e.characterId === id)) return;
    const modifier = PV.summarize(row.data).initiative;
    await encounterChange(() =>
      Cloud.addCombatant(current, {
        id,
        kind: 'pc',
        character_id: id,
        name: row.name,
        tiebreak: modifier,
        init: d20() + modifier,
      }),
    );
  }

  return { card, create, control, initiative };
})();
