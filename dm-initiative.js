/* Configuración de iniciativa de la mesa. Las tiradas y la posición se conservan por separado. */
(function (root) {
  'use strict';

  const labels = {
    individual: 'Individual',
    alternating: 'Alternada por bandos',
    boss: 'Jefe único',
  };

  function sequence({ mode, players, monsters, roller, partyTotal, dmTotal, tie }) {
    if (mode === 'individual') return [];
    if (!players.length || !monsters.length) throw Error('Agregá aliados y enemigos a la iniciativa.');
    if (!players.includes(roller)) throw Error('Elegí quién tira por la party.');
    if (!Number.isInteger(partyTotal) || !Number.isInteger(dmTotal))
      throw Error('Anotá los dos resultados de iniciativa.');
    if (partyTotal === dmTotal && !['party', 'dm'].includes(tie))
      throw Error('Elegí qué bando empieza en caso de empate.');
    const partyFirst = partyTotal > dmTotal || (partyTotal === dmTotal && tie === 'party');
    if (mode === 'boss') {
      if (monsters.length !== 1) throw Error('El modo Jefe único requiere un enemigo y un representante de la party.');
      return partyFirst ? [roller, monsters[0], ...players.filter(id => id !== roller)] : [...monsters, ...players];
    }
    const [first, second] = partyFirst ? [players, monsters] : [monsters, players];
    return Array.from({ length: Math.max(first.length, second.length) }, (_, i) => [first[i], second[i]])
      .flat()
      .filter(Boolean);
  }

  let receive = null;
  function setup(preferred) {
    if (party?.encounter?.active) throw Error('Terminá el combate antes de cambiar la iniciativa.');
    const campaignId = current;
    const entries = tracker().entries.filter(e => !e.boardOnly && !(e.kind === 'monster' && e.status === 'derrotado'));
    const sides = {
      party: entries.filter(e => e.kind === 'pc'),
      dm: entries.filter(e => e.kind === 'monster'),
    };
    const reps = sides.party.filter(e => {
      const row = characterById(e.characterId);
      return row && !FriendlyNPC.ownedByDM(row, party.campaign);
    });
    let request = null;
    modal(
      'Modo de iniciativa',
      select('Regla de este combate', 'mode', Object.entries(labels), preferred || party?.encounter?.initiative_mode) +
        '<div id="initiative-settings"></div>',
      async fd => {
        const mode = fd.get('mode');
        const ids = sequence(read(fd));
        await encounterChange(() => Cloud.setInitiativeOrder(campaignId, mode, ids));
        toast('Iniciativa guardada.');
      },
      'Guardar iniciativa',
    );
    const form = $('#dialog-form'),
      pane = $('#initiative-settings');
    const selected = name => form.elements.namedItem(name)?.value || '';
    function read(fd = new FormData(form)) {
      const rep = reps.find(e => e.id === fd.get('roller'));
      return {
        mode: fd.get('mode'),
        players: sides.party.map(e => e.id),
        monsters: sides.dm.map(e => e.id),
        roller: rep?.id,
        partyTotal: fd.get('party-total') ? int(fd, 'party-total', -100, 100) : null,
        dmTotal: fd.get('dm-total') ? int(fd, 'dm-total', -100, 100) : null,
        tie: fd.get('tie'),
      };
    }
    function preview() {
      const dest = pane.querySelector('[data-init-preview]');
      if (!dest) return;
      try {
        const values = read();
        const ids = sequence(values);
        dest.textContent = ids.map(id => entries.find(e => e.id === id).name).join(' → ');
      } catch (err) {
        dest.textContent = err.message;
      }
    }
    function drawOrders() {
      const dest = pane.querySelector('[data-init-orders]');
      dest.innerHTML = Object.entries(sides)
        .map(
          ([side, list]) =>
            `<fieldset><legend>${side === 'party' ? 'Orden de la party' : 'Orden de los enemigos'}</legend><ol class="init-side-order">${list
              .map(
                (e, i) =>
                  `<li><span>${esc(e.name)}</span><div class="actions">${[-1, 1].map(delta => `<button type="button" class="icon-btn" data-init-tool="move" data-side="${side}" data-id="${esc(e.id)}" data-delta="${delta}" aria-label="${delta < 0 ? 'Subir ' : 'Bajar '}${esc(e.name)}" ${i + delta < 0 || i + delta >= list.length ? 'disabled' : ''}>${delta < 0 ? '↑' : '↓'}</button>`).join('')}</div></li>`,
              )
              .join('')}</ol></fieldset>`,
        )
        .join('');
    }
    function render() {
      const mode = selected('mode');
      request = null;
      if (mode === 'individual') {
        pane.innerHTML =
          '<p class="small muted">Cada participante tira su propia iniciativa. Los resultados ordenan los turnos.</p>';
        return;
      }
      pane.innerHTML = `<p class="small muted">${mode === 'boss' ? 'Si gana la party, su representante actúa primero, luego el jefe y después los demás.' : 'Empieza el bando que gana la tirada. Alterná un turno de cada bando y dejá los turnos sobrantes al final.'}</p>
        <div class="form-grid">${select('Representante de la party', 'roller', [['', 'Elegí quién tira'], ...reps.map(e => [e.id, e.name])])}
        ${select(
          'Quién tira por el DM',
          'monster-roller',
          sides.dm.map(e => [e.id, e.name + ' (' + sign(e.dex) + ')']),
        )}</div>
        <div class="actions"><button type="button" class="button secondary" data-init-tool="request">Pedir tirada al representante</button>
        <button type="button" class="button secondary" data-init-tool="roll">Tirar por el DM</button></div>
        <p class="small" data-init-status role="status"></p>
        <div class="form-grid">${field('Total de la party', 'party-total', '', 'number', 'min="-100" max="100" required')}
        ${field('Total del DM', 'dm-total', '', 'number', 'min="-100" max="100" required')}
        ${select('Si hay empate', 'tie', [
          ['', 'Elegí quién empieza'],
          ['party', 'Empieza la party'],
          ['dm', 'Empiezan los enemigos'],
        ])}</div>
        <div class="grid two section-space" data-init-orders></div><p><b>Orden:</b> <span data-init-preview aria-live="polite"></span></p>`;
      drawOrders();
      preview();
    }
    const status = message => {
      const dest = pane.querySelector('[data-init-status]');
      if (dest) dest.textContent = message;
    };
    receive = events => {
      if (!form.isConnected || !$('#modal').open || !request) return;
      const reply = events.find(
        e =>
          e.kind === 'roll-response' &&
          e.author_id === request.owner &&
          e.payload?.requestId === request.id &&
          e.payload.characterId === request.characterId &&
          Number.isInteger(e.payload.total) &&
          e.payload.total >= -100 &&
          e.payload.total <= 100,
      );
      if (!reply) return;
      form.elements.namedItem('party-total').value = reply.payload.total;
      request = null;
      status('Tirada del representante recibida.');
      preview();
    };
    form.addEventListener('change', e => {
      if (e.target.name === 'mode') render();
      else {
        if (e.target.name === 'roller') {
          request = null;
          form.elements.namedItem('party-total').value = '';
          status('');
        }
        preview();
      }
    });
    form.addEventListener('input', preview);
    pane.addEventListener('click', async e => {
      const tool = e.target.closest('[data-init-tool]');
      if (!tool) return;
      try {
        if (tool.dataset.initTool === 'move') {
          const list = sides[tool.dataset.side];
          const i = list.findIndex(x => x.id === tool.dataset.id);
          const j = i + Number(tool.dataset.delta);
          if (i < 0 || j < 0 || j >= list.length) return;
          [list[i], list[j]] = [list[j], list[i]];
          drawOrders();
          const controls = pane.querySelectorAll('[data-init-tool="move"]');
          [...controls]
            .find(b => b.dataset.id === tool.dataset.id && b.dataset.delta === tool.dataset.delta && !b.disabled)
            ?.focus();
        } else if (tool.dataset.initTool === 'roll') {
          const monster = sides.dm.find(x => x.id === selected('monster-roller'));
          if (!monster) throw Error('Agregá un enemigo a la iniciativa.');
          form.elements.namedItem('dm-total').value = d20() + monster.dex;
        } else {
          const rep = reps.find(x => x.id === selected('roller'));
          if (!rep) throw Error('Elegí quién tira por la party.');
          tool.disabled = true;
          const owner = characterById(rep.characterId).owner_id;
          const ev = await send(
            'roll-request',
            { type: 'initiative', id: '', label: 'Iniciativa de la party', groupInitiative: true },
            rep.characterId,
            'target',
          );
          if (form.isConnected && tool.isConnected && selected('roller') === rep.id) {
            request = { id: ev.id, characterId: rep.characterId, owner };
            status('Pedido enviado a ' + rep.name + '.');
            receive(feed);
          }
        }
        preview();
      } catch (err) {
        status(err.message);
      } finally {
        if (tool.dataset.initTool === 'request') tool.disabled = false;
      }
    });
    render();
  }

  root.DmInitiative = { labels, sequence, setup, onFeed: events => receive?.(events) };
})(typeof window !== 'undefined' ? window : globalThis);
