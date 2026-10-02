/* Sección Mesa del jugador: unirse con un código, ver la party en vivo, tiradas compartidas y órdenes del DM. */
const TableUI = (() => {
  'use strict';
  const PV = PartyView;
  const CONDITIONS = [
    'Derribado',
    'Asustado',
    'Hechizado',
    'Envenenado',
    'Incapacitado',
    'Inconsciente',
    'Agarrado',
    'Restringido',
    'Cegado',
    'Ensordecido',
    'Paralizado',
    'Aturdido',
    'Invisible',
    'Petrificado',
  ];
  let party = null,
    feed = [],
    loading = false,
    error = '',
    unsubscribe = null,
    online = [],
    booted = false;
  const link = () => Cloud.link(KEY);

  // Ids de órdenes ya aplicadas en este dispositivo, para no aplicarlas dos veces.
  const appliedKey = () => KEY + '-cloud-applied';
  function appliedIds() {
    try {
      return new Set(JSON.parse(localStorage.getItem(appliedKey()) || '[]'));
    } catch {
      return new Set();
    }
  }
  function rememberApplied(ids) {
    const all = [...appliedIds(), ...ids].slice(-500);
    try {
      localStorage.setItem(appliedKey(), JSON.stringify(all));
    } catch {}
  }

  const STATUS = {
    idle: '',
    pending: 'Mesa: cambios por subir',
    syncing: 'Mesa: sincronizando…',
    synced: 'Mesa: sincronizada',
    offline: 'Mesa: sin conexión, se subirá luego',
    removed: 'Mesa: la ficha ya no está en la mesa',
  };
  function showStatus(s = Cloud.status()) {
    let el = document.getElementById('cloud-status');
    if (!link() && s !== 'removed') {
      el?.remove();
      return;
    }
    if (!el) {
      el = document.createElement('a');
      el.id = 'cloud-status';
      el.href = '#table';
      el.className = 'cloud-status';
      document.getElementById('save-status').after(el);
    }
    el.textContent = STATUS[s] || STATUS.synced;
    el.title = el.textContent;
    el.setAttribute('aria-label', el.textContent);
    el.dataset.state = s;
  }

  function memberName(userId) {
    return party?.members.find(m => m.user_id === userId)?.display_name || '';
  }
  // Pedidos de tirada del DM que este personaje todavía no respondió.
  function openRequests() {
    const l = link();
    if (!l) return [];
    const answered = new Set(
      feed
        .filter(e => e.kind === 'roll-response' && e.payload?.characterId === l.characterId)
        .map(e => e.payload.requestId),
    );
    const recent = Date.now() - 3 * 60 * 60 * 1000;
    return feed.filter(
      e =>
        (e.kind === 'roll-request' || (e.kind === 'area-save' && e.target_character === l.characterId)) &&
        !answered.has(e.id) &&
        (!e.target_character || e.target_character === l.characterId) &&
        new Date(e.created_at).getTime() > recent,
    );
  }
  function requestBanner() {
    return openRequests()
      .map(r =>
        r.kind === 'area-save'
          ? `<section class="banner request"><p><b>${PV.esc(r.payload.spell)}</b> de ${PV.esc(r.payload.caster)}: salvación de ${PV.esc(r.payload.abilityName || r.payload.ability)} CD ${PV.esc(r.payload.dc)} · ${PV.esc(r.payload.damage)} de daño${r.payload.half ? ' (mitad si salvás)' : ''}</p>${button('Responder', 'table-answer', '', `data-id="${r.id}"`)}</section>`
          : `<section class="banner request"><p><b>El DM pide:</b> ${PV.esc(r.payload.label)}${r.payload.dc && r.payload.showDc ? ' · CD ' + PV.esc(r.payload.dc) : ''}</p>${button('Responder', 'table-answer', '', `data-id="${r.id}"`)}</section>`,
      )
      .join('');
  }
  // ---------- Encuentro compartido (migración 004) ----------
  const CREATURE_STATUS = {
    ileso: 'Ileso',
    herido: 'Herido',
    malherido: 'Malherido',
    'a punto de caer': 'A punto de caer',
    derrotado: 'Derrotado',
  };
  function encounter() {
    const enc = party?.encounter;
    const entries = Cloud.order(party?.combatants || []).map(c => ({
      id: c.id,
      kind: c.kind,
      name: c.name,
      init: c.init,
      status: c.status,
      conditions: c.conditions || [],
      characterId: c.character_id,
      current: Boolean(enc?.active && enc.current_id === c.id),
    }));
    return { active: Boolean(enc?.active), round: enc?.round || 0, entries };
  }
  const isMyTurn = () => {
    const l = link();
    return Boolean(l && encounter().entries.some(e => e.current && e.characterId === l.characterId));
  };
  // Objetivos posibles: criaturas visibles en pie, aliados de la mesa y vos.
  function targets() {
    const l = link();
    return {
      monsters: encounter().entries.filter(e => e.kind === 'monster' && e.status !== 'derrotado'),
      allies: (party?.characters || [])
        .filter(c => c.id !== l?.characterId)
        .map(c => ({ characterId: c.id, name: c.name })),
      selfId: l?.characterId || null,
    };
  }
  // Curaciones, efectos y dados para otro jugador: su ficha los aplica al recibirlos.
  function sendTo(characterId, kind, payload) {
    const l = link();
    if (!l) throw Error('Unite a una mesa para afectar a otros personajes.');
    return Cloud.post(l.campaignId, kind, { ...payload, from: state.name }, { target: characterId, visibility: 'all' });
  }
  function encounterStrip() {
    const e = encounter();
    if (!e.entries.length) return '';
    const mine = link()?.characterId;
    return `<div class="initiative-strip">${e.active ? `<b>Ronda ${e.round}</b>` : '<b>Iniciativa</b>'}${e.entries
      .map(
        x =>
          `<span class="chip ${x.current ? 'current' : ''} ${x.status === 'derrotado' ? 'defeated' : ''}">${x.init ?? '—'} · ${PV.esc(x.name)}${x.characterId && x.characterId === mine ? ' (vos)' : ''}${x.kind === 'monster' ? ` <em class="status-${x.status.replace(/ /g, '-')}">${CREATURE_STATUS[x.status] || x.status}</em>` : ''}${x.conditions.length ? ` <em class="chip-conds">${PV.esc(x.conditions.join(', '))}</em>` : ''}</span>`,
      )
      .join('')}</div>`;
  }
  // Barra de iniciativa para la pantalla de combate.
  function initiativeBanner() {
    const strip = encounterStrip();
    if (!strip) return '';
    return `<section class="banner initiative-banner">${strip}${isMyTurn() ? '<p class="small"><b>Es tu turno.</b> Al tocar «Terminar turno» pasa al siguiente.</p>' : ''}</section>`;
  }

  // Pantalla inicial: unirse a una mesa antes de tener personaje.
  function welcomeCard() {
    const t = Cloud.pendingTable();
    if (t)
      return `<section class="card path-card path-ready"><span class="path-icon" aria-hidden="true">⚔</span><h2>Mesa «${PV.esc(t.name)}»</h2><p>Ya estás en la mesa. Creá tu personaje: el creador usa los libros que eligió el DM (${PV.esc(t.settings.sources.join(', '))}) y empieza en nivel ${t.settings.startLevel}. Al terminar, la ficha se comparte con la mesa.</p>${t.settings.rules ? `<p class="small"><b>Reglas de la casa:</b> ${PV.esc(t.settings.rules)}</p>` : ''}<div class="actions">${button('Crear personaje para esta mesa', 'party-create', '')}${button('Cancelar', 'table-pending-cancel')}</div></section>`;
    return `<section class="card path-card"><span class="path-icon" aria-hidden="true">⚔</span><h2>Unite a una mesa</h2><p>¿Tu DM ya creó la mesa? Escribí su código y creá tu personaje con sus reglas.</p><form id="table-prejoin-form" class="stack">${field('Código de la mesa', 'code', '', 'text', 'required minlength="6" maxlength="6" autocomplete="off" autocapitalize="characters" style="text-transform:uppercase;letter-spacing:.2em"')}${field('Tu nombre (jugador)', 'display', '', 'text', 'maxlength="100" placeholder="Opcional"')}<div class="actions"><button class="button" type="submit">Unirme a la mesa</button></div><p class="form-error" id="table-prejoin-error" role="alert"></p></form></section>`;
  }
  // Libros y reglas de la mesa aplicados a una ficha que se une.
  function applySettings(settings) {
    if (!settings?.sources?.length) return;
    commit('Libros de la mesa aplicados', s => {
      s.campaignSources = settings.sources.slice();
      s.progression.sources = settings.sources.slice();
    });
  }

  function page() {
    const intro = header('Tu mesa.', 'La party en vivo, las tiradas compartidas y las órdenes del DM.');
    if (!Cloud.enabled)
      return (
        intro +
        `<section class="card"><h2>Mesa compartida no configurada</h2><p>Esta copia de la aplicación todavía no tiene un servidor para compartir la party. Quien la publica puede configurarlo siguiendo «Mesa compartida» en el README.</p><p class="small muted">Mientras tanto, tu ficha sigue funcionando en este dispositivo.</p></section>`
      );
    const l = link();
    if (!l)
      return (
        intro +
        `<div class="columns"><section class="card"><h2>Unirse a una mesa</h2><p>Pedile el código de 6 letras a tu DM. Tu ficha se comparte con la mesa: la party y el DM ven tus PG, CA, estados y espacios. Solo vos podés editarla.</p><form id="table-join-form" class="stack">${field('Código de la mesa', 'code', '', 'text', 'required minlength="6" maxlength="6" autocomplete="off" autocapitalize="characters" style="text-transform:uppercase;letter-spacing:.2em"')}${field('Tu nombre (jugador)', 'display', '', 'text', 'maxlength="100" placeholder="Opcional"')}<div class="actions"><button class="button" type="submit">Unirme con ${PV.esc(state.name)}</button></div><p class="form-error" id="table-join-error" role="alert">${PV.esc(error)}</p></form><p class="small muted">Tu ficha sigue guardándose en este dispositivo y funciona sin conexión; los cambios se suben al volver.</p></section>${AccountUI.card('restore')}</div><div class="columns"><section class="card"><h2>¿Sos el DM?</h2><p>Creá una mesa, compartí el código y seguí a la party desde tu pantalla: PG, iniciativa, daño, estados, pedidos de tirada y botín.</p><div class="actions"><a class="button secondary" href="./dm.html">Abrir pantalla del DM</a></div></section></div>`
      );
    if (!party && !loading) refresh();
    const mine = l.characterId;
    const cards = party
      ? party.characters
          .map(c =>
            PV.card(PV.summarize(c.data), {
              owner: memberName(c.owner_id),
              mine: c.id === mine,
              online: online.some(p => p.characterId === c.id),
            }),
          )
          .join('')
      : `<p class="muted">${loading ? 'Cargando la mesa…' : PV.esc(error || 'Sin datos todavía.')}</p>`;
    const dm = party?.members.find(m => m.role === 'dm');
    return (
      header(
        PV.esc(l.campaignName),
        `Código <b class="table-code">${PV.esc(l.code)}</b>${dm ? ' · DM: ' + PV.esc(dm.display_name || 'sin nombre') + (online.some(p => p.role === 'dm') ? ' <span class="online-dot" title="Conectado"></span>' : '') : ''}${party ? '<br><span class="small">Libros de la mesa: ' + PV.esc(Cloud.cleanSettings(party.campaign.settings).sources.join(', ')) + (party.campaign.settings?.rules ? ' · Reglas de la casa: ' + PV.esc(party.campaign.settings.rules) : '') + '</span>' : ''}`,
        button('Actualizar', 'table-refresh') + button('Salir de la mesa', 'table-leave'),
      ) +
      (error && party ? `<div class="banner"><p>${PV.esc(error)}</p></div>` : '') +
      requestBanner() +
      (encounterStrip() ? `<section class="card section-space"><h2>Iniciativa</h2>${encounterStrip()}</section>` : '') +
      `<div class="party-grid">${cards}</div>${party ? TableExtras.playerHtml(party, mine) : ''}<section class="card section-space"><div class="card-header"><h2>En la mesa</h2>${button('Tirar dados', 'dice')}</div><div class="log table-feed">${
        feed.length
          ? feed
              .filter(e => e.kind !== 'initiative' && e.kind !== 'encounter-sync')
              .slice(0, 40)
              .map(
                e =>
                  `<div class="log-item"><time>${PV.esc(new Date(e.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }))}</time><p>${PV.eventText(e, party)}</p></div>`,
              )
              .join('')
          : '<p class="muted">Las tiradas y los avisos del DM aparecerán acá.</p>'
      }</div></section>${AccountUI.card('account')}`
    );
  }

  function redraw() {
    showStatus();
    if (view === 'table' && !document.getElementById('modal').open) render();
    else if (view === 'combat') {
      const slot = document.getElementById('table-requests');
      if (slot) slot.innerHTML = initiativeBanner() + requestBanner();
    }
  }

  async function refresh() {
    const l = link();
    if (!l) return;
    loading = true;
    try {
      const [p, ev] = await Promise.all([Cloud.party(l.campaignId), Cloud.events(l.campaignId)]);
      party = p;
      feed = ev;
      error = '';
      setTimeout(sessionSummary, 600);
    } catch (e) {
      error = e.message;
    }
    loading = false;
    redraw();
  }

  function applyCommand(ev) {
    const p = ev.payload || {};
    const n = v => Math.max(0, Math.min(9999, Math.floor(Number(v) || 0)));
    switch (ev.kind) {
      case 'damage': {
        if (state.hp === null) return 'Daño del DM pendiente: confirmá tus PG actuales.';
        const parts = Defenses.partsOf(p),
          raw = parts.reduce((t, x) => t + n(x.amount), 0),
          adj = Defenses.apply(state, parts),
          amount = n(adj.total),
          why = adj.notes.length ? ' (' + adj.notes.join('; ') + ')' : '';
        if (!raw) return '';
        if (!amount) return `No recibís daño${why}.`;
        const conc = state.concentration;
        commit((p.from || 'DM') + ': daño recibido ' + amount + (p.source ? ' (' + p.source + ')' : ''), s => {
          const absorbed = Math.min(s.temp, amount);
          s.temp -= absorbed;
          s.hp = Math.max(0, s.hp - (amount - absorbed));
          if (s.hp === 0) {
            s.concentration = null;
            Combat.data(s).checks = [];
            for (const c of ['Inconsciente', 'Derribado']) if (!s.conditions.includes(c)) s.conditions.push(c);
          } else if (conc) Combat.data(s).checks.push(Math.max(10, Math.floor(amount / 2)));
        });
        return (
          `${p.from ? p.from + ' te hizo' : 'El DM te aplicó'} ${amount} de daño${why}.` +
          (conc && state.hp > 0 ? ' Tirá la salvación de concentración.' : '')
        );
      }
      case 'heal': {
        const amount = n(p.amount);
        if (!amount || state.hp === null) return 'Curación del DM pendiente: confirmá tus PG actuales.';
        commit((p.from || 'DM') + ': curación ' + amount, s => {
          s.hp = Math.min(R.stats(s).maxHP, s.hp + amount);
          if (s.hp > 0) {
            s.death = { success: 0, failure: 0 };
            s.conditions = s.conditions.filter(x => x !== 'Inconsciente');
          }
        });
        return `${p.from || 'El DM'} te curó ${amount} PG${p.source ? ' (' + p.source + ')' : ''}.`;
      }
      case 'temp':
        commit('DM: PG temporales ' + n(p.amount), s => (s.temp = Math.max(s.temp, n(p.amount))));
        return `El DM te dio ${n(p.amount)} PG temporales.`;
      case 'condition': {
        if (!CONDITIONS.includes(p.name)) return '';
        commit(`DM: ${p.on ? 'estado' : 'fin de estado'} ${p.name}`, s => {
          s.conditions = s.conditions.filter(x => x !== p.name);
          if (p.on) s.conditions.push(p.name);
        });
        return `El DM ${p.on ? 'te aplicó' : 'te quitó'}: ${p.name}.`;
      }
      case 'gold':
        commit('DM: monedas recibidas ' + PV.goldText(p), s => {
          for (const k of ['cp', 'sp', 'ep', 'gp', 'pp']) s.gold[k] = Math.min(9999999, s.gold[k] + n(p[k]));
        });
        return 'El DM te dio ' + PV.goldText(p) + '.';
      case 'gold-remove': {
        const cost = Object.fromEntries(['cp', 'sp', 'ep', 'gp', 'pp'].map(k => [k, n(p[k])]));
        const next = PV.pay(state.gold, cost);
        if (!next) return 'El DM te cobró ' + PV.goldText(cost) + ', pero no te alcanza. Arreglalo con el DM.';
        commit('DM: pagaste ' + PV.goldText(cost), s => (s.gold = next));
        return 'Pagaste ' + PV.goldText(cost) + '.';
      }
      case 'item': {
        const name = String(p.name || '')
          .trim()
          .slice(0, 150);
        if (!name) return '';
        commit('DM: objeto recibido ' + name, s =>
          s.inventory.push({
            id: uid(),
            name,
            qty: Math.max(1, n(p.qty) || 1),
            category: 'Equipo',
            weight: null,
            location: 'Con el personaje',
            notes: String(p.notes || '').slice(0, 2000) || 'Entregado por el DM',
          }),
        );
        return `El DM te entregó ${name}.`;
      }
      case 'rest':
        setTimeout(() => actions[p.type === 'long' ? 'long-rest' : 'short-rest']?.(), 50);
        return `El DM anunció un descanso ${p.type === 'long' ? 'largo' : 'corto'}. Confirmá cómo lo resolvés.`;
      case 'level':
        return 'El DM te habilitó a subir de nivel. Usá «Subir de nivel» en Clase.';
      case 'xp': {
        const amount = n(p.amount);
        if (!amount) return '';
        const before = Number(state.xp) || 0;
        commit('DM: experiencia +' + amount + ' PX' + (p.session ? ' (sesión ' + p.session + ')' : ''), s => {
          s.xp = before + amount;
        });
        const next = R.xpNext?.(state);
        return (
          `Recibiste ${amount} PX (total ${state.xp}).` +
          (next && state.xp >= next ? ' ¡Te alcanza para subir de nivel!' : '')
        );
      }
      case 'bonus-die': {
        const die = [4, 6, 8, 10, 12].includes(Number(p.die)) ? Number(p.die) : 0;
        if (!die) return '';
        const kind = ['any', 'check', 'attack', 'save'].includes(p.kind) ? p.kind : 'any';
        const skills = kind === 'check' ? (p.skills || []).filter(k => R.skills.some(x => x[0] === k)) : [];
        commit('DM: dado de bonificación d' + die, s => {
          s.bonusDice = [
            ...(s.bonusDice || []),
            { id: uid(), die, reason: String(p.reason || '').slice(0, 200), kind, skills },
          ].slice(-20);
        });
        return `${p.from || 'El DM'} te dio un d${die}${p.reason ? ' (' + p.reason + ')' : ''} para ${RollUI.bonusScope({ kind, skills })}.`;
      }
      case 'effect': {
        const name = String(p.name || '')
          .trim()
          .slice(0, 100);
        if (!name) return '';
        // Fin de un efecto ajeno: el que lo lanzó perdió la concentración.
        if (p.end) {
          if (!p.link || !Effects.list(state).some(x => x.link === p.link)) return '';
          commit((p.from || 'DM') + ': termina ' + name, s => {
            s.timedEffects = Effects.list(s).filter(x => x.link !== p.link);
          });
          return `Terminó ${name}: ${p.from || 'el DM'} perdió la concentración.`;
        }
        const rounds = Number.isInteger(p.rounds) && p.rounds > 0 ? Math.min(100000, p.rounds) : null;
        commit((p.from || 'DM') + ': efecto ' + name, s =>
          Effects.add(s, { name, rounds, from: 'dm', link: typeof p.link === 'string' ? p.link : null }),
        );
        return `${p.from || 'El DM'} te aplicó: ${name}${rounds ? ' (' + Effects.remaining({ rounds }) + ')' : ''}.`;
      }
      case 'inspiration':
        commit(p.on === false ? 'DM: Inspiración retirada' : 'DM: Inspiración recibida', s => {
          s.heroicInspiration = p.on !== false;
        });
        return p.on === false ? 'El DM retiró tu Inspiración.' : '★ El DM te dio Inspiración: ventaja en una tirada.';
    }
    return '';
  }
  async function applyCommands(list) {
    const done = appliedIds(),
      fresh = list.filter(e => !done.has(e.id) && Cloud.COMMANDS.includes(e.kind));
    const messages = [],
      ids = [];
    for (const ev of fresh) {
      try {
        const msg = applyCommand(ev);
        if (typeof msg === 'string' && !msg.includes('pendiente')) ids.push(ev.id);
        if (msg) messages.push(msg);
      } catch (e) {
        messages.push('No se pudo aplicar una orden del DM: ' + e.message);
        ids.push(ev.id);
      }
    }
    rememberApplied(ids);
    if (messages.length) toast(messages.join(' '));
    if (ids.length) Cloud.markApplied(ids).catch(() => {});
  }

  function onTurn(ev) {
    const l = link(),
      p = ev.payload || {};
    if (!l) return;
    if (ev.kind === 'combat-end') {
      if (state.combatState?.active) commit('Fin del combate indicado por el DM', s => Combat.finish(s));
      return;
    }
    if (p.characterId === l.characterId) {
      let ended = [];
      // Igual que «Mi turno»: la pantalla de combate vuelve a la pestaña de acción.
      combatTab = 'action';
      combatLevel = 'all';
      commit('Turno indicado por el DM (ronda ' + (p.round || 1) + ')', s => {
        Combat.start(s);
        ended = Effects.tick(s);
      });
      navigator.vibrate?.(200);
      toast('¡Es tu turno!' + (ended.length ? ' Terminó: ' + ended.join(', ') + '.' : ''));
    } else if (state.combatState?.onTurn || !state.combatState?.active) {
      if (state.combatState?.onTurn) combatTab = 'reaction';
      commit('Turno de ' + (p.name || 'otro integrante'), s => {
        Combat.end(s);
        Combat.data(s).active = true;
      });
    }
  }

  function onChange(table, payload) {
    const l = link();
    if (!l) return;
    if (table === 'presence') {
      online = payload;
      redraw();
      return;
    }
    if (table === 'events' && payload.eventType === 'INSERT') {
      const ev = payload.new;
      feed = [ev, ...feed.filter(x => x.id !== ev.id)].slice(0, 100);
      if (ev.target_character === l.characterId && Cloud.COMMANDS.includes(ev.kind)) applyCommands([ev]);
      else if (ev.kind === 'encounter-sync') refresh();
      else if (ev.kind === 'session-start') toast('Empezó la sesión ' + ev.payload.n + '. ¡A jugar!');
      else if (ev.kind === 'session-end') setTimeout(sessionSummary, 1500);
      else if (ev.kind === 'encounter-start') {
        EncounterFX.show(ev.payload);
        refresh();
      } else if (ev.kind === 'turn' || ev.kind === 'combat-end') {
        onTurn(ev);
        refresh();
      } else if (ev.kind === 'roll-request' && (!ev.target_character || ev.target_character === l.characterId))
        toast('El DM pide: ' + ev.payload.label);
      else if (ev.kind === 'note' && ev.target_character === l.characterId) toast('Mensaje del DM: ' + ev.payload.text);
      else if (ev.kind === 'area-save' && ev.target_character === l.characterId)
        toast(ev.payload.spell + ' de ' + ev.payload.caster + ': tirá tu salvación.');
      redraw();
      return;
    }
    if (table === 'characters' && party) {
      if (payload.eventType === 'DELETE') {
        party.characters = party.characters.filter(c => c.id !== payload.old.id);
        if (payload.old.id === l.characterId) {
          Cloud.setLink(KEY, null);
          toast('El DM quitó tu ficha de la mesa. Tu copia local se conserva.');
          party = null;
        }
      } else {
        const row = payload.new;
        party.characters = [...party.characters.filter(c => c.id !== row.id), row].sort((a, b) =>
          a.name.localeCompare(b.name, 'es'),
        );
      }
      redraw();
      return;
    }
    refresh();
  }

  async function connect() {
    const l = link();
    if (!l) return;
    unsubscribe?.();
    unsubscribe = null;
    try {
      const r = await Cloud.reconcile(KEY);
      if (r.action === 'removed') {
        toast('Tu ficha ya no está en la mesa «' + r.link.campaignName + '». Podés volver a unirte.');
        showStatus('removed');
        return;
      }
      if (r.action === 'pull') {
        const next = R.validate(r.remote);
        const before = clone(state);
        history.push(before);
        state = next;
        persist(before);
        Cloud.acceptRemote(KEY, r.updatedAt);
        render();
        toast('Ficha actualizada con la versión de la mesa.');
      } else if (r.action === 'conflict') conflict(r);
      else if (r.action === 'push') Cloud.changed(KEY, state);
      else Cloud.acceptRemote(KEY, link().syncedAt);
      unsubscribe = await Cloud.subscribe(l.campaignId, onChange, { characterId: l.characterId });
      await refresh();
      applyCommands(await Cloud.pendingCommands(l.characterId));
    } catch (e) {
      error = e.message;
      showStatus('offline');
    }
  }
  function conflict(r) {
    modal(
      'Dos versiones de tu ficha',
      `<p>La ficha cambió en la mesa (por ejemplo, desde otro dispositivo) y también en este sin sincronizar.</p><label class="check"><input type="radio" name="keep" value="local" checked>Conservar la de este dispositivo y subirla</label><label class="check"><input type="radio" name="keep" value="remote">Usar la de la mesa (${PV.esc(new Date(r.updatedAt).toLocaleString('es-AR'))})</label><p class="small">La versión descartada queda como «copia anterior» en Mi ficha.</p>`,
      fd => {
        if (fd.get('keep') === 'remote') {
          const before = clone(state);
          history.push(before);
          state = R.validate(r.remote);
          persist(before);
          Cloud.acceptRemote(KEY, r.updatedAt);
          render();
        } else {
          Cloud.acceptRemote(KEY, r.updatedAt);
          Cloud.changed(KEY, state);
        }
      },
      'Continuar',
    );
  }

  // Fin de sesión: un resumen por sesión (también al abrir la ficha más tarde). A quien no guardó su
  // acceso con email se le pide que lo guarde para no perder la ficha si se borran los datos del navegador.
  async function sessionSummary() {
    const l = link();
    if (!l || document.getElementById('modal').open || document.getElementById('creator')?.hidden === false) return;
    const ev = feed.find(e => e.kind === 'session-end'),
      seenKey = 'dnd-session-seen-' + l.campaignId;
    if (!ev || ev.id <= Number(localStorage.getItem(seenKey) || 0)) return;
    if (Date.now() - Date.parse(ev.created_at) > 14 * 864e5) return;
    localStorage.setItem(seenKey, String(ev.id));
    const p = ev.payload || {},
      me = await Cloud.currentUser().catch(() => null),
      exposed = !me || me.is_anonymous,
      min = Number(p.minutes) || 0;
    modal(
      'Fin de la sesión ' + (p.n || ''),
      `<p>Jugaron ${min >= 60 ? Math.floor(min / 60) + ' h ' + (min % 60) + ' min' : min + ' min'}.${p.xp ? ' Cada personaje recibe <b>' + PV.esc(p.xp) + ' PX</b>.' : ''}${p.levelUp ? ' <b>El DM habilitó la subida de nivel:</b> usá «Subir de nivel» en Clase.' : ''}</p>${p.notes ? `<blockquote class="session-notes">${PV.esc(p.notes)}</blockquote>` : ''}${
        exposed
          ? `<div class="banner"><p><b>Guardá tu acceso.</b> Tu ficha en la mesa vive solo en este navegador: si se borran sus datos o cambiás de celular, la perdés. Con un email y una contraseña la recuperás en cualquier dispositivo.</p>${button('Guardar mi acceso ahora', 'session-save-access', '')}</div>`
          : '<p class="small">Tu acceso está guardado: tu ficha está a salvo.</p>'
      }<div class="actions">${button('Descargar copia de mi ficha', 'backup', 'secondary')}</div>`,
    );
  }

  // Ficha recién creada para una mesa a la que el jugador se unió antes.
  async function attachPending() {
    const t = Cloud.pendingTable(),
      id = localStorage.getItem('dnd-pending-attach-v1');
    if (!t || !id || KEY !== 'dnd-character-' + id || link()) return;
    localStorage.removeItem('dnd-pending-attach-v1');
    try {
      await Cloud.attach(KEY, state, t);
      Cloud.clearPending();
      toast('Tu ficha ya está en la mesa «' + t.name + '».');
      connect();
      render();
    } catch (e) {
      toast('No se pudo subir la ficha a la mesa: ' + e.message + ' Probá unirte desde Mesa.');
    }
  }
  function boot() {
    if (!state || !Cloud.enabled) return;
    attachPending();
    if (!booted) {
      Cloud.onStatus(showStatus);
      // Un celular con la pantalla bloqueada pierde la conexión en vivo: al volver, se pone al día.
      document.addEventListener('visibilitychange', () => {
        const l = link();
        if (document.hidden || !l) return;
        refresh();
        // Si la ficha cambió en otro dispositivo, se baja antes de aplicar órdenes pendientes.
        Cloud.reconcile(KEY)
          .then(r => {
            if (r.action === 'pull' && !document.getElementById('modal').open) {
              const before = clone(state);
              history.push(before);
              state = R.validate(r.remote);
              persist(before);
              Cloud.acceptRemote(KEY, r.updatedAt);
              render();
              toast('Ficha actualizada con los cambios de otro dispositivo.');
            } else if (r.action === 'conflict') conflict(r);
            else if (r.action === 'push') Cloud.changed(KEY, state);
          })
          .catch(() => {})
          .then(() => Cloud.pendingCommands(l.characterId))
          .then(cmds => cmds && applyCommands(cmds))
          .catch(() => {});
      });
    }
    booted = true;
    showStatus();
    if (link()) connect();
  }

  // Tiradas de la ficha que se comparten con la mesa cuando está vinculada.
  function shareRoll(payload, visibility = 'all') {
    const l = link();
    if (!l) return;
    Cloud.post(l.campaignId, 'roll', { character: state.name, characterId: l.characterId, ...payload }, { visibility })
      .then(ev => {
        feed = [ev, ...feed.filter(x => x.id !== ev.id)];
      })
      .catch(() => toast('La tirada no se compartió con la mesa (sin conexión).'));
  }

  // Responder un pedido del DM con el diálogo de tiradas (ventaja, Inspiración, dado físico).
  function answer(id) {
    const l = link(),
      req = feed.find(e => e.id === Number(id));
    if (!l || !req) throw Error('Ese pedido ya no está disponible.');
    if (req.kind === 'area-save') return areaSave(req);
    const p = req.payload;
    let bonus = 0,
      kind = 'check';
    if (p.type === 'skill') bonus = R.skillBonus(state, p.id);
    else if (p.type === 'save') {
      bonus = R.saveBonus(state, p.id);
      kind = 'save';
    } else if (p.type === 'ability') bonus = Math.floor((state.abilities[p.id] - 10) / 2);
    else if (p.type === 'initiative') bonus = R.stats(state).initiative;
    RollUI.d20({
      title: 'El DM pide: ' + p.label,
      label: p.label + ' (pedido del DM)',
      bonus,
      kind,
      ability: p.type === 'save' ? p.id : '',
      share: false,
      onDone: r =>
        Cloud.post(
          l.campaignId,
          'roll-response',
          {
            character: state.name,
            characterId: l.characterId,
            requestId: req.id,
            label: p.label,
            rolls: r.rolls,
            bonus,
            total: r.total,
            physical: r.physical,
          },
          { visibility: p.secret ? 'dm' : 'all' },
        )
          .then(ev => {
            feed = [ev, ...feed];
            redraw();
          })
          .catch(e => toast(e.message)),
    });
  }

  // Salvación de área (Bola de fuego de un aliado, aliento de un dragón…): tirás y la ficha aplica el daño.
  function areaSave(req, local = false) {
    const l = link(),
      p = req.payload,
      bonus = R.saveBonus(state, p.ability);
    RollUI.d20({
      title: `${p.spell} · salvación de ${p.abilityName || p.ability} CD ${p.dc}`,
      label: 'Salvación contra ' + p.spell,
      bonus,
      kind: 'save',
      ability: p.ability,
      share: false,
      onDone: r =>
        setTimeout(() => {
          // Paralizado, aturdido, inconsciente o petrificado: falla sola las salvaciones de FUE y DES.
          const out = RollUI.conditionMods(state, 'save', p.ability).autoFail;
          const success = !out && r.kept !== 1 && (r.kept === 20 || r.total >= Number(p.dc));
          const amount = success ? (p.half ? Math.floor(Number(p.damage) / 2) : 0) : Number(p.damage) || 0;
          const conc = state.concentration;
          if (amount)
            applyCommand({ kind: 'damage', payload: { amount, type: p.types, source: p.spell, from: p.caster } });
          toast(
            `${success ? 'Salvaste' : 'Fallaste'}: ${amount ? amount + ' de daño' : 'sin daño'} (${p.spell}).` +
              (amount && conc && state.hp > 0 ? ' Tirá la salvación de concentración.' : ''),
          );
          if (local || !l) return;
          Cloud.post(
            l.campaignId,
            'roll-response',
            {
              character: state.name,
              characterId: l.characterId,
              requestId: req.id,
              saved: success,
              damage: amount,
              label: `Salvación contra ${p.spell} (${success ? 'salva' : 'falla'} · ${amount} de daño)`,
              rolls: r.rolls,
              bonus,
              total: r.total,
              physical: r.physical,
            },
            { visibility: 'all' },
          )
            .then(ev => {
              feed = [ev, ...feed];
              redraw();
            })
            .catch(e => toast(e.message));
        }),
    });
  }

  // Después de cada cambio: si terminó la concentración de un conjuro compartido, los aliados lo pierden.
  function watch(before, after) {
    const shared = before.sharedConcentration,
      l = link();
    if (!l || !shared || before.concentration !== shared.spell || after.concentration === shared.spell) return;
    for (const id of shared.targets || [])
      sendTo(id, 'effect', {
        name: shared.name,
        end: true,
        link: l.characterId + ':' + shared.spell,
        from: after.name,
      }).catch(e => toast(e.message));
  }

  function install() {
    const endTurn = actions['combat-end'];
    actions['combat-end'] = e => {
      const mine = isMyTurn(),
        l = link();
      endTurn(e);
      if (mine && l)
        Cloud.advanceTurn(l.campaignId)
          .then(n => toast('Turno de ' + n.name + '.'))
          .catch(err => toast(err.message));
    };
    TableExtras.install({
      refresh: () => refresh(),
      campaignId: () => link()?.campaignId,
      characterId: () => link()?.characterId,
    });
    Object.assign(actions, {
      // Desde el resumen de fin de sesión: lleva a «Tu acceso» en Mesa.
      'session-save-access': () => {
        document.getElementById('modal').close();
        location.hash = 'table';
        setTimeout(
          () => document.getElementById('account-account')?.scrollIntoView({ block: 'center', behavior: 'smooth' }),
          400,
        );
      },
      'table-refresh': () => refresh(),
      'table-leave': () =>
        confirmAction(
          'Salir de la mesa',
          'Tu ficha se quita de la mesa y deja de compartirse. La copia de este dispositivo se conserva.',
          () => {
            Cloud.leave(KEY)
              .then(() => {
                unsubscribe?.();
                party = null;
                feed = [];
                showStatus();
                render();
                toast('Saliste de la mesa.');
              })
              .catch(e => toast(e.message));
          },
          'Salir',
        ),
      'table-answer': e => answer(e.dataset.id),
      'table-pending-cancel': () => {
        Cloud.clearPending();
        render();
      },
    });
    document.addEventListener('submit', e => {
      if (e.target.id !== 'table-prejoin-form') return;
      e.preventDefault();
      const fd = new FormData(e.target),
        out = document.getElementById('table-prejoin-error'),
        code = String(fd.get('code')).trim().toUpperCase();
      if (!/^[A-Z0-9]{6}$/.test(code)) {
        out.textContent = 'El código tiene 6 letras o números.';
        return;
      }
      out.textContent = 'Conectando…';
      Cloud.joinOnly(code, String(fd.get('display')).trim())
        .then(() => render())
        .catch(err => (out.textContent = err.message));
    });
    document.addEventListener('submit', e => {
      if (e.target.id !== 'table-join-form') return;
      e.preventDefault();
      const fd = new FormData(e.target),
        btn = e.target.querySelector('button[type=submit]'),
        out = document.getElementById('table-join-error');
      const code = String(fd.get('code')).trim().toUpperCase();
      if (!/^[A-Z0-9]{6}$/.test(code)) {
        out.textContent = 'El código tiene 6 letras o números.';
        return;
      }
      btn.disabled = true;
      out.textContent = 'Conectando…';
      Cloud.joinCampaign(code, String(fd.get('display')).trim(), KEY, state)
        .then(c => {
          error = '';
          applySettings(c.settings);
          toast('Te uniste a «' + c.name + '».');
          boot();
          render();
        })
        .catch(err => {
          btn.disabled = false;
          out.textContent = err.message;
        });
    });
  }

  return {
    page,
    boot,
    install,
    welcomeCard,
    initiativeBanner,
    encounter,
    targets,
    sendTo,
    isMyTurn,
    link,
    statusLabel: st => CREATURE_STATUS[st] || st,
    areaSave,
    watch,
    shareRoll,
    requestBanner,
    showStatus,
  };
})();
