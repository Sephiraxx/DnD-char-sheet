/* El tablero dentro de la ficha: el jugador mueve su ficha, toca a quién atacar y usa sus ataques,
   conjuros y acciones sin salir del mapa (la vista compacta de combate va al costado).
   Avisa los ataques de oportunidad cuando un enemigo sale de su alcance. */
(function () {
  'use strict';
  const actorId = () => TableUI.link()?.characterId || null;
  const mine = t => !!t?.character_id && t.character_id === actorId();
  // Alcance cuerpo a cuerpo: 10 pies con un arma con la propiedad Alcance.
  function reach() {
    if (!state) return 5;
    try {
      return Attacks.options(state).some(i => !i.unarmed && Attacks.profile(state, i).weapon?.reach) ? 10 : 5;
    } catch {
      return 5;
    }
  }
  function disengaged() {
    const c = Combat.data(state);
    return c.active && c.onTurn && /Destrab/i.test((c.action || '') + ' ' + (c.bonus || ''));
  }
  // Velocidad del turno: la de la ficha (con armadura pesada, forma salvaje…) y el doble si usó Correr.
  function speed() {
    if (!state || typeof combatSpeed !== 'function') return null;
    const c = Combat.data(state),
      dash = c.active && c.onTurn && /Correr/i.test((c.action || '') + ' ' + (c.bonus || ''));
    return combatSpeed() * (dash ? 2 : 1);
  }
  function opportunity({ reactor, mover }) {
    if (!state || !mine(reactor)) return;
    const why = Combat.blocked(state, 'reaction');
    if (why) return toast(`${mover.name} sale de tu alcance, pero no podés reaccionar: ${why}`);
    if (document.getElementById('modal').open)
      return toast(`${mover.name} sale de tu alcance: tenés un ataque de oportunidad (Reacción).`);
    // El objetivo del ataque es quien se va.
    const ctx = Board.context();
    TableUI.setBoardContext({
      ...ctx,
      target: { id: mover.id, name: mover.name, combatantId: mover.combatant_id },
      combatantId: mover.combatant_id || null,
      characterId: null,
      name: mover.name,
      distance: 5,
      flank: false,
      foeAdjacent: false,
    });
    const list = AttackUI.choices('reaction');
    modal(
      'Ataque de oportunidad',
      `<p><b>${esc(mover.name)}</b> sale de tu alcance. Podés usar tu reacción para un ataque cuerpo a cuerpo justo antes de que se vaya.</p>${list ? `<div class="battle-choices cc-list">${list}</div>` : '<p class="muted">No tenés un arma cuerpo a cuerpo lista.</p>'}`,
      null,
    );
    document.getElementById('modal').addEventListener('close', () => TableUI.setBoardContext(Board.context()), {
      once: true,
    });
  }
  const hooks = {
    actorId,
    pick: c => TableUI.setBoardContext(c),
    dock: () => (state && typeof combatCompact === 'function' ? combatCompact() : ''),
    reach: t => (mine(t) ? reach() : null),
    disengaged: t => mine(t) && disengaged(),
    speed: t => (mine(t) ? speed() : null),
    opportunity,
  };
  const scripts = [
    './board-core.js',
    './board-art.js',
    './board-props.js',
    './board-gen.js',
    './sigils.js',
    './board.js',
  ];
  let loading;
  function loadBoard() {
    if (loading) return loading;
    const load = (src, isStyle = false) =>
      new Promise((resolve, reject) => {
        const el = document.createElement(isStyle ? 'link' : 'script');
        if (isStyle) {
          el.rel = 'stylesheet';
          el.href = src;
        } else el.src = src;
        el.onload = resolve;
        el.onerror = () => {
          el.remove();
          reject(Error('No se pudo cargar el tablero. Revisá tu conexión y reintentá.'));
        };
        document.head.append(el);
      });
    loading = (async () => {
      if (!document.querySelector('link[href="./board.css"]')) await load('./board.css', true);
      for (const src of scripts) if (!document.querySelector('script[src="' + src + '"]')) await load(src);
    })().catch(error => {
      loading = null;
      throw error;
    });
    return loading;
  }
  Object.assign(actions, {
    'board-open': e => {
      const l = TableUI.link();
      if (!l) throw Error('Unite a una mesa para usar el tablero.');
      if (e) e.disabled = true;
      loadBoard()
        .then(() => {
          if (TableUI.link()?.campaignId === l.campaignId) Board.open(l.campaignId, hooks);
        })
        .catch(error => toast(error.message))
        .finally(() => {
          if (e) e.disabled = false;
        });
    },
  });
})();
