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
        e.kind === 'roll-request' &&
        !answered.has(e.id) &&
        (!e.target_character || e.target_character === l.characterId) &&
        new Date(e.created_at).getTime() > recent,
    );
  }
  function requestBanner() {
    return openRequests()
      .map(
        r =>
          `<section class="banner request"><p><b>El DM pide:</b> ${PV.esc(r.payload.label)}${r.payload.dc && r.payload.showDc ? ' · CD ' + PV.esc(r.payload.dc) : ''}</p><div class="actions request-actions">${button('Tirar', 'table-answer', '', `data-id="${r.id}"`)}<label class="physical-die"><span class="visually-hidden">Mi d20</span><input type="number" min="1" max="20" inputmode="numeric" placeholder="d20" id="physical-${r.id}"></label>${button('Usé mi dado', 'table-answer', 'secondary', `data-id="${r.id}" data-physical="1"`)}</div></section>`,
      )
      .join('');
  }

  // Pantalla inicial: unirse a una mesa antes de tener personaje.
  function welcomeCard() {
    const t = Cloud.pendingTable();
    if (t)
      return `<section class="card section-space"><h2>Mesa «${PV.esc(t.name)}»</h2><p>Ya estás en la mesa. Creá tu personaje: el creador usa los libros que eligió el DM (${PV.esc(t.settings.sources.join(', '))}) y empieza en nivel ${t.settings.startLevel}. Al terminar, la ficha se comparte con la mesa.</p>${t.settings.rules ? `<p class="small"><b>Reglas de la casa:</b> ${PV.esc(t.settings.rules)}</p>` : ''}<div class="actions">${button('Crear personaje para esta mesa', 'party-create', '')}${button('Cancelar', 'table-pending-cancel')}</div></section>`;
    return `<section class="card section-space"><h2>¿Tu DM ya creó la mesa?</h2><p>Unite con el código y después creá tu personaje con las reglas de esa mesa.</p><form id="table-prejoin-form" class="stack">${field('Código de la mesa', 'code', '', 'text', 'required minlength="6" maxlength="6" autocomplete="off" autocapitalize="characters" style="text-transform:uppercase;letter-spacing:.2em"')}${field('Tu nombre (jugador)', 'display', '', 'text', 'maxlength="100" placeholder="Opcional"')}<div class="actions"><button class="button" type="submit">Unirme a la mesa</button></div><p class="form-error" id="table-prejoin-error" role="alert"></p></form></section>`;
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
            }),
          )
          .join('')
      : `<p class="muted">${loading ? 'Cargando la mesa…' : PV.esc(error || 'Sin datos todavía.')}</p>`;
    const dm = party?.members.find(m => m.role === 'dm');
    return (
      header(
        PV.esc(l.campaignName),
        `Código <b class="table-code">${PV.esc(l.code)}</b>${dm ? ' · DM: ' + PV.esc(dm.display_name || 'sin nombre') : ''}${party ? '<br><span class="small">Libros de la mesa: ' + PV.esc(Cloud.cleanSettings(party.campaign.settings).sources.join(', ')) + (party.campaign.settings?.rules ? ' · Reglas de la casa: ' + PV.esc(party.campaign.settings.rules) : '') + '</span>' : ''}`,
        button('Actualizar', 'table-refresh') + button('Salir de la mesa', 'table-leave'),
      ) +
      (error && party ? `<div class="banner"><p>${PV.esc(error)}</p></div>` : '') +
      requestBanner() +
      `<div class="party-grid">${cards}</div><section class="card section-space"><div class="card-header"><h2>En la mesa</h2>${button('Tirar dados', 'dice')}</div><div class="log table-feed">${
        feed.length
          ? feed
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
      if (slot) slot.innerHTML = requestBanner();
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
        const amount = n(p.amount);
        if (!amount || state.hp === null) return 'Daño del DM pendiente: confirmá tus PG actuales.';
        const conc = state.concentration;
        commit('DM: daño recibido ' + amount + (p.source ? ' (' + p.source + ')' : ''), s => {
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
          `El DM te aplicó ${amount} de daño.` + (conc && state.hp > 0 ? ' Tirá la salvación de concentración.' : '')
        );
      }
      case 'heal': {
        const amount = n(p.amount);
        if (!amount || state.hp === null) return 'Curación del DM pendiente: confirmá tus PG actuales.';
        commit('DM: curación ' + amount, s => {
          s.hp = Math.min(R.stats(s).maxHP, s.hp + amount);
          if (s.hp > 0) {
            s.death = { success: 0, failure: 0 };
            s.conditions = s.conditions.filter(x => x !== 'Inconsciente');
          }
        });
        return `El DM te curó ${amount} PG.`;
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
        if (msg && !msg.includes('pendiente')) ids.push(ev.id);
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
      commit('Turno indicado por el DM (ronda ' + (p.round || 1) + ')', s => Combat.start(s));
      navigator.vibrate?.(200);
      toast('¡Es tu turno!');
    } else if (state.combatState?.onTurn || !state.combatState?.active)
      commit('Turno de ' + (p.name || 'otro integrante'), s => {
        Combat.end(s);
        Combat.data(s).active = true;
      });
  }

  function onChange(table, payload) {
    const l = link();
    if (!l) return;
    if (table === 'events' && payload.eventType === 'INSERT') {
      const ev = payload.new;
      feed = [ev, ...feed.filter(x => x.id !== ev.id)].slice(0, 100);
      if (ev.target_character === l.characterId && Cloud.COMMANDS.includes(ev.kind)) applyCommands([ev]);
      else if (ev.kind === 'turn' || ev.kind === 'combat-end') onTurn(ev);
      else if (ev.kind === 'roll-request' && (!ev.target_character || ev.target_character === l.characterId))
        toast('El DM pide: ' + ev.payload.label);
      else if (ev.kind === 'note' && ev.target_character === l.characterId) toast('Mensaje del DM: ' + ev.payload.text);
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
      unsubscribe = await Cloud.subscribe(l.campaignId, onChange);
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
    if (!booted) Cloud.onStatus(showStatus);
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

  function answer(id, physical = false) {
    const l = link(),
      req = feed.find(e => e.id === Number(id));
    if (!l || !req) throw Error('Ese pedido ya no está disponible.');
    const p = req.payload;
    let bonus = 0;
    if (p.type === 'skill') bonus = R.skillBonus(state, p.id);
    else if (p.type === 'save') bonus = R.saveBonus(state, p.id);
    else if (p.type === 'ability') bonus = Math.floor((state.abilities[p.id] - 10) / 2);
    else if (p.type === 'initiative') bonus = R.stats(state).initiative;
    let d = roll(20)[0];
    if (physical) {
      d = Number(document.getElementById('physical-' + req.id)?.value);
      if (!Number.isInteger(d) || d < 1 || d > 20) throw Error('Escribí el resultado de tu d20 (1 a 20).');
    }
    const total = d + bonus;
    commit(
      `${p.label} (pedido del DM): d20 ${d} ${sign(bonus)} = ${total}${physical ? ' (dado físico)' : ''}`,
      () => {},
    );
    Cloud.post(
      l.campaignId,
      'roll-response',
      {
        character: state.name,
        characterId: l.characterId,
        requestId: req.id,
        label: p.label,
        rolls: [d],
        bonus,
        total,
        physical,
      },
      { visibility: p.secret ? 'dm' : 'all' },
    )
      .then(ev => {
        feed = [ev, ...feed];
        redraw();
      })
      .catch(e => toast(e.message));
    toast(`${p.label}: ${d} ${sign(bonus)} = ${total}`);
  }

  function install() {
    Object.assign(actions, {
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
      'table-answer': e => answer(e.dataset.id, Boolean(e.dataset.physical)),
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

  return { page, boot, install, welcomeCard, shareRoll, requestBanner, showStatus };
})();
