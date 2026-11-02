/* El tablero dentro de la pantalla del DM: tocá una criatura para ver sus acciones al costado,
   tocá a un personaje para elegirlo como objetivo y atacá sin salir del mapa.
   Cuando un personaje sale del alcance de una criatura, pregunta si hace el ataque de oportunidad. */
(function () {
  'use strict';
  const entryOf = t => (t?.combatant_id ? tracker().entries.find(e => e.id === t.combatant_id) : null);
  let loading = false;
  function monsterOf(entry) {
    if (!entry?.monsterId) return null;
    if (!window.MonsterData && !loading) {
      loading = true;
      MonsterUI.load()
        .then(() => Board.refresh())
        .catch(() => {})
        .finally(() => (loading = false));
    }
    return MonsterUI.byId(entry.monsterId) || null;
  }
  const melee = a => /cuerpo a cuerpo/i.test(a.d || '');
  function reach(t) {
    const m = monsterOf(entryOf(t));
    return m ? BoardCore.reachFromText(m.actions.filter(melee).map(a => a.d)) : null;
  }
  const actionButtons = (entry, a, kind) =>
    `${a.atk !== undefined ? button('Atacar', 'monster-attack', '', `data-entry="${entry.id}" data-kind="${kind}" data-name="${esc(a.n)}"`) : ''}${a.dc ? button('Pedir salvación', 'monster-save', 'secondary', `data-entry="${entry.id}" data-kind="${kind}" data-name="${esc(a.n)}"`) : ''}${a.atk === undefined && a.dmg ? button('Tirar daño', 'monster-attack', 'secondary', `data-entry="${entry.id}" data-kind="${kind}" data-name="${esc(a.n)}" data-noattack="1"`) : ''}`;
  const short = s => (s.length > 150 ? s.slice(0, 147) + '…' : s);
  function dock(c) {
    const t = tracker(),
      turn = t.turn >= 0 ? t.entries[t.turn] : null,
      next = t.entries.length
        ? `<div class="actions">${button(t.turn < 0 ? 'Empezar combate' : 'Siguiente turno', 'init-next', '')}</div>`
        : '';
    const head = turn ? `<p class="small muted">Ronda ${t.round} · turno de <b>${esc(turn.name)}</b></p>` : '';
    const entry = c.actor?.combatantId ? t.entries.find(e => e.id === c.actor.combatantId) : null;
    if (!entry) {
      if (c.actor?.characterId) {
        const row = party?.characters.find(x => x.id === c.actor.characterId),
          x = row && PV.summarize(row.data);
        return `${head}<p><b>${esc(c.actor.name)}</b>${x && !x.broken ? ` · ${x.hp ?? '—'}/${x.maxHP} PG · CA ${x.ac}` : ''}</p><p class="small muted">Los jugadores atacan desde su ficha. Tocá una criatura para sus acciones.</p>${next}`;
      }
      return `${head}<p class="small muted">Tocá una criatura del mapa para ver sus acciones. Después tocá a un personaje para elegirlo como objetivo: la ventana de ataque ya lo trae elegido, con ventaja si lo flanquean.</p><p class="small muted">Al mover una ficha en combate, quien sale del alcance de un enemigo provoca un ataque de oportunidad (Mayúsculas al soltar: movimiento libre).</p>${next}`;
    }
    const m = monsterOf(entry);
    const stats = `<div class="dm-dock-stats"><span><b>${esc(entry.name)}</b></span><span>PG ${entry.hp ?? '—'}/${entry.max ?? '—'}</span>${entry.ac ? `<span>CA ${entry.ac}</span>` : ''}${m ? `<span>${esc(m.speed)}</span>` : ''}${entry.conditions.length ? `<span>${esc(entry.conditions.join(', '))}</span>` : ''}</div>`;
    if (!m)
      return `${head}${stats}<p class="small muted">${entry.monsterId ? 'Cargando sus acciones…' : 'Criatura sin estadísticas del SRD: resolvé sus ataques a mano.'}</p>${next}`;
    const list = (arr, kind, title) =>
      arr.length
        ? `<h3 class="small eyebrow section-space">${title}</h3>${arr.map(a => `<div class="dm-dock-action"><p class="small"><b>${esc(a.n)}.</b> ${esc(short(a.d || ''))}</p>${actionButtons(entry, a, kind) ? `<div class="actions">${actionButtons(entry, a, kind)}</div>` : ''}</div>`).join('')}`
        : '';
    return `${head}${stats}${list(m.actions, 'actions', 'Acciones')}${list(m.reactions, 'reactions', 'Reacciones')}${list(m.legendary, 'legendary', 'Legendarias')}<div class="actions section-space">${button('Bloque completo', 'monster-open', 'secondary', `data-entry="${entry.id}"`)}</div>${next}`;
  }
  function pick(c) {
    window.boardPick = c.actor?.combatantId
      ? {
          entryId: c.actor.combatantId,
          characterId: c.characterId || null,
          name: c.name || '',
          distance: c.distance ?? 0,
          flank: !!c.flank,
          flankWith: c.flankWith || '',
          foeAdjacent: !!c.foeAdjacent,
        }
      : null;
  }
  function opportunity({ reactor, mover }) {
    const entry = entryOf(reactor);
    if (!entry || entry.status === 'derrotado') return;
    const m = monsterOf(entry),
      acts = (m?.actions || []).filter(a => melee(a) && a.atk !== undefined);
    if (document.getElementById('modal').open || !acts.length)
      return toast(`${mover.name} sale del alcance de ${entry.name}: ataque de oportunidad.`);
    window.boardPick = {
      entryId: entry.id,
      characterId: mover.character_id || null,
      name: mover.name,
      distance: 5,
      flank: false,
      flankWith: '',
      foeAdjacent: false,
    };
    modal(
      'Ataque de oportunidad',
      `<p><b>${esc(mover.name)}</b> sale del alcance de <b>${esc(entry.name)}</b>. Con su reacción puede hacer un ataque cuerpo a cuerpo (una reacción por ronda).</p>${acts.map(a => `<div class="dm-dock-action"><p class="small"><b>${esc(a.n)}.</b> ${esc(short(a.d || ''))}</p><div class="actions">${actionButtons(entry, a, 'actions')}</div></div>`).join('')}`,
      null,
    );
    document.getElementById('modal').addEventListener('close', () => pick(Board.context()), { once: true });
  }
  const hooks = { pick, dock, reach, opportunity };
  Object.assign(actions, {
    'board-open': () => {
      if (!current) throw Error('Abrí una mesa primero.');
      MonsterUI.load()
        .then(() => Board.refresh())
        .catch(() => {});
      Board.open(current, hooks);
    },
  });
})();
