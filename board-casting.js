/* Player casting controls. The board owns geometry and the sheet owns spell rules. */
(function (root) {
  'use strict';
  const esc = PartyView.esc;
  const types = { action: 'Acción', bonus: 'Adicional', reaction: 'Reacción', special: 'Especial' };
  const icons = { action: '◆', bonus: '✦', reaction: '↯', special: '◷' };
  const shapes = { circle: '◯', cylinder: '◉', cube: '□', cone: '◁', line: '↗', wall: '━' };
  const filters = [
    ['action', 'Acción'],
    ['bonus', 'Adicional'],
    ['reaction', 'Reacción'],
    ['concentration', 'Concentración'],
    ['ritual', 'Ritual'],
    ['damage', 'Daño'],
    ['heal', 'Curación'],
  ];
  const button = (label, action, data = '', cls = '') =>
    `<button type="button" class="${cls}" data-bc="${action}" ${data}>${label}</button>`;
  const chip = (label, action, value, active) =>
    button(label, action, `data-value="${esc(value)}" aria-pressed="${!!active}"`, 'bc-chip');
  const normalize = s =>
    String(s || '')
      .normalize('NFD')
      .replace(/\p{Mark}/gu, '')
      .toLowerCase();
  const abilityLabel = { str: 'FUE', dex: 'DES', con: 'CON', int: 'INT', wis: 'SAB', cha: 'CAR' };
  const combatBlock = sp => {
    const why = Combat.spellBlock(state, sp);
    if (/no quedan espacios compatibles/i.test(why)) return 'Sin espacios';
    if (/ya usaste tu acci[oó]n/i.test(why)) return 'Acción usada';
    if (/ya usaste tu reacci[oó]n/i.test(why)) return 'Reacción usada';
    return why;
  };
  const slots = sp => {
    const special = Combat.specialCast(state, sp),
      grant = Grants.castingGrant(state, sp);
    const paid = grant?.slotRequired ? Combat.invocationSlots(state, sp) : Combat.availableSlots(state, sp);
    if (!sp.level) return [{ value: 0, level: 0 }];
    if (!special) return paid;
    if (grant?.slotRequired) return paid;
    const free = { value: 0, level: grant?.castLevel || sp.level, free: true, label: grant?.origin || 'Uso del rasgo' };
    return special.startsWith('feat-') || (special.startsWith('grant') && grant?.allowSlots) ? [free, ...paid] : [free];
  };
  function formula(sp, level, type = '', short = false) {
    const info = RollUI.spellInfo(sp, level);
    const d = RollUI.spellStats(sp);
    const ability = Classes.casting(Classes.spellCaster(state, sp.id)).ability;
    const modifier = info.addMod ? d.mods[ability] || 0 : 0;
    const amount = sp.id === 'magic-missile' ? `${BoardSpells.missileCount(level)} × (1d4 + 1)` : info.dice;
    if (!amount) return '';
    return (
      amount +
      (modifier ? ` ${modifier < 0 ? '−' : '+'} ${Math.abs(modifier)}` : '') +
      (short ? '' : (' ' + (info.heal ? 'curación' : type || info.types)).trimEnd())
    );
  }
  function resourcePips(max, spent) {
    return Array.from({ length: max }, (_, i) => (i < max - (spent ?? max) ? '●' : '○')).join('');
  }
  function mount(host, api) {
    let screen = '',
      selection = null,
      result = null,
      detail = null,
      query = '',
      tab = '',
      full = false,
      filter = new Set();
    let gesture = null,
      error = '',
      reaction = null,
      sending = false,
      overflow = false,
      pending = null;
    let recents;
    try {
      recents = JSON.parse(localStorage.getItem('dnd-board-recent-spells') || '[]');
    } catch {
      recents = [];
    }
    if (!Array.isArray(recents)) recents = [];
    const shell = host.closest('.board-shell');
    const byId = id => api.spells().find(sp => sp.id === id);
    const ping = () => api.dirty();
    function close() {
      if (reaction) {
        clearInterval(reaction.timer);
        reaction.pass?.();
        reaction = null;
      }
      screen = '';
      selection = result = detail = null;
      error = '';
      gesture = null;
      overflow = false;
      pending = null;
      render();
    }
    function begin(id, reactionContext) {
      if (sending || pending) return;
      screen = 'picker';
      selection = result = detail = null;
      query = tab = error = '';
      full = overflow = false;
      filter = new Set();
      if (id && byId(id)) {
        choose(id);
        if (selection && reactionContext) {
          selection.reaction = reactionContext;
          selection.enemyLevel = reactionContext.level;
          render();
        }
      } else {
        render();
        requestAnimationFrame(() => api.focus());
      }
    }
    function choose(id) {
      const sp = byId(id);
      if (!sp || combatBlock(sp)) return;
      const available = slots(sp);
      if (!available.length) return;
      const impact = Rules.spellImpact(sp);
      selection = {
        sp,
        slot: available[0],
        selected: [],
        excluded: new Set(),
        included: new Set(),
        aim: null,
        wallEnd: null,
        wallSide: 1,
        ring: false,
        type: impact.choices[0] || '',
        mode: null,
        object: false,
        formula: '',
        physical: '',
        physicalD20: '',
      };
      screen = 'aim';
      detail = null;
      error = '';
      render();
      requestAnimationFrame(() => api.focus(selection?.sp));
    }
    function limit(s) {
      const { sp, slot } = s;
      if (sp.id === 'magic-missile') return BoardSpells.missileCount(slot.level);
      if (sp.id === 'eldritch-blast') return BoardSpells.beamCount(Rules.totalLevel(state));
      if (sp.id === 'scorching-ray') return 3 + Math.max(0, slot.level - sp.level);
      return (
        BoardSpells.wardCount(sp.id, slot.level) ||
        Math.max(
          1,
          Math.min(20, RollUI.targetLimit(sp, slot.level) === Infinity ? 1 : RollUI.targetLimit(sp, slot.level)),
        )
      );
    }
    function plan() {
      if (screen !== 'aim' || !selection) return null;
      const s = selection;
      return api.plan(s, limit(s));
    }
    function pickerList() {
      const s = Rules.stats(state),
        grants = Classes.granted(state),
        favorites = state.favorites || [];
      const norm = normalize(query);
      const rows = api
        .spells()
        .filter(sp => {
          if (tab === 'favorites' && !favorites.includes(sp.id)) return false;
          if (tab === 'recent' && !recents.includes(sp.id)) return false;
          if (norm && !normalize(sp.name + ' ' + (sp.english || '')).includes(norm)) return false;
          const info = RollUI.spellInfo(sp, sp.level);
          const timing = ['action', 'bonus', 'reaction'].filter(id => filter.has(id));
          return (
            (!timing.length || timing.includes(Combat.kind(sp))) &&
            (!filter.has('concentration') || sp.concentration) &&
            (!filter.has('ritual') || sp.ritual) &&
            (!filter.has('heal') || info.heal) &&
            (!filter.has('damage') || info.types)
          );
        })
        .sort(
          (a, b) =>
            a.level - b.level ||
            (tab === 'recent' ? recents.indexOf(a.id) - recents.indexOf(b.id) : a.name.localeCompare(b.name, 'es')),
        );
      const levels = [...new Set(rows.map(sp => sp.level))];
      return (
        levels
          .map(level => {
            const pips = level ? resourcePips(s.slots[level - 1] || 0, state.slotsSpent[level - 1]) : '';
            return `<section class="bc-level"><h3>${level ? 'Nivel ' + level : 'Trucos'} <span aria-label="Espacios disponibles">${pips}</span></h3>${rows
              .filter(sp => sp.level === level)
              .map(sp => {
                const why = combatBlock(sp),
                  kind = Combat.kind(sp);
                const shape = BoardSpells.areaFor(sp, sp.level, Rules.spellImpact(sp).area);
                const info = RollUI.spellInfo(sp, sp.level);
                const brief =
                  [
                    formula(sp, sp.level),
                    shape && `${shapes[shape.kind]} ${shape.feet} pies`,
                    info.save && abilityLabel[info.save],
                  ]
                    .filter(Boolean)
                    .join(' · ') || sp.brief;
                const badge = grants.prepared.includes(sp.id)
                  ? 'Preparado'
                  : grants.known.includes(sp.id)
                    ? 'Concedido'
                    : '';
                return `<div class="bc-spell${why ? ' unavailable' : ''}">${button(`<strong>${esc(sp.name)}</strong><small><span title="${types[kind] || ''}">${icons[kind] || ''}</span> ${esc(sp.range)} ${sp.concentration ? '· Conc.' : ''} ${sp.ritual ? '· Ritual' : ''} ${badge ? `<span class="bc-badge">${badge}</span>` : ''}</small><span class="bc-brief">${esc(why || brief || '')}</span>`, 'choose', `data-value="${esc(sp.id)}" ${why ? 'disabled' : ''}`, 'bc-pick')}${button('ⓘ', 'detail', `data-value="${esc(sp.id)}" aria-label="Detalles de ${esc(sp.name)}"`, 'bc-info')}</div>`;
              })
              .join('')}</section>`;
          })
          .join('') || '<p class="small">No hay conjuros con esos filtros.</p>'
      );
    }
    function picker() {
      const st = Rules.stats(state);
      const quick = [...new Set([...(state.favorites || []), ...recents])]
        .map(byId)
        .filter(sp => sp && !combatBlock(sp))
        .slice(0, 4);
      return `<div class="bc-picker"><div class="bc-head"><h2>Conjuros</h2>${button(full ? '⌄' : '⌃', 'expand', 'aria-label="Cambiar altura"', 'bc-info')}${button('×', 'close', 'aria-label="Cerrar conjuros"', 'bc-info')}</div><div class="bc-search">${chip('★ Favoritos', 'tab', 'favorites', tab === 'favorites')}${chip('Recientes', 'tab', 'recent', tab === 'recent')}<input type="search" placeholder="Buscar" aria-label="Buscar conjuros" value="${esc(query)}"></div><div class="bc-filters">${filters.map(([id, label]) => chip(label, 'filter', id, filter.has(id))).join('')}</div>${st.pact ? `<p class="bc-note">Pacto · nivel ${st.pact.level} ${resourcePips(st.pact.max, state.pactSpent || 0)}</p>` : ''}<div class="bc-quick" ${tab || filter.size || query || !quick.length ? 'hidden' : ''} aria-label="Accesos rápidos">${quick.map(sp => chip(esc(sp.name), 'choose', sp.id, false)).join('')}</div><div class="bc-list">${pickerList()}</div></div>`;
    }
    function aim() {
      const s = selection,
        { sp } = s,
        p = plan(),
        info = RollUI.spellInfo(sp, s.slot.level);
      const impact = Rules.spellImpact(sp, s.slot.level);
      const blocked = combatBlock(sp),
        st = RollUI.spellStats(sp);
      const c = Combat.data(state),
        mode = s.mode ?? RollUI.conditionMods(state, 'attack').mode;
      const message = sp.concentration
        ? state.concentration
          ? 'Termina tu concentración en ' + (spellById(state.concentration)?.name || 'el conjuro activo')
          : 'Requiere concentración'
        : '';
      const text = p?.prompt || '';
      const save = info.save
        ? `Salvación de ${abilityLabel[info.save]} · CD ${st.dc}${RollUI.halfOnSave(sp) ? ' · mitad si la supera' : ''}`
        : '';
      const alternatives = slots(sp);
      const extra = [
        ...impact.choices.map(type => chip(esc(type), 'type', type, s.type === type)),
        ...(sp.id === 'wall-of-fire'
          ? [chip('Línea', 'wall', 'line', !s.ring), chip('Anillo', 'wall', 'ring', s.ring)]
          : []),
        ...(p?.allowObject
          ? [chip('Criatura', 'object', '0', !s.object), chip('Objeto', 'object', '1', s.object)]
          : []),
        ...(sp.id === 'spiritual-weapon'
          ? [
              ['hammer', 'Martillo'],
              ['mace', 'Maza'],
              ['axe', 'Hacha'],
            ].map(([id, label]) => chip(label, 'weapon', id, (s.weapon || 'hammer') === id))
          : []),
      ];
      const zone = BoardSpells.zoneRule(sp.id);
      const delayed = zone && !zone.initial;
      const advanced = info.dice || info.attack;
      const counterLevel = sp.id === 'counter' && s.reaction && s.reaction.level == null;
      return `<div class="bc-aim"><div class="bc-head"><h2>${esc(sp.name)}</h2>${button('ⓘ', 'detail', `data-value="${esc(sp.id)}" aria-label="Detalles"`, 'bc-info')}<span class="bc-economy" aria-label="Economía de acciones">${[
        ['A', c.action],
        ['Ad', c.bonus],
        ['R', state.reactionUsed],
      ]
        .map(
          ([label, used]) =>
            `<span class="${used ? 'spent' : ''}" title="${used ? 'Gastada' : 'Disponible'}">${label}</span>`,
        )
        .join('')}</span></div>
      ${sp.level ? `<div class="bc-slots" aria-label="Nivel de lanzamiento">${alternatives.map(x => chip((x.free ? 'Rasgo' : x.value === 'pact' ? 'Pacto ' + x.level : x.level) + (formula(sp, x.level, '', true) ? ' · ' + formula(sp, x.level, '', true) : ''), 'slot', x.value, x.value === s.slot.value)).join('')}</div>` : ''}
      ${extra.length ? `<div class="bc-options">${extra.join('')}</div>` : ''}${
        info.attack
          ? `<div class="bc-options">${[
              ['', 'Normal'],
              ['adv', 'Ventaja'],
              ['dis', 'Desventaja'],
            ]
              .map(([id, label]) => chip(label, 'mode', id, mode === id))
              .join('')}</div>`
          : ''
      }
      <div class="bc-notes">${formula(sp, s.slot.level, s.type) ? `<b>${esc(formula(sp, s.slot.level, s.type))}</b>` : ''}${save ? `<span>${save}</span>` : ''}${message ? `<span class="bc-warning">${esc(message)}</span>` : ''}${p?.allies?.length ? `<span class="bc-warning">Aliados en el área: ${esc(p.allies.join(', '))}</span>` : ''}${error ? `<span class="bc-warning" role="alert">${esc(error)}</span>` : ''}</div>
      ${advanced ? `<div class="bc-advanced">${info.dice && sp.id !== 'magic-missile' && !zone?.travel ? button('Editar fórmula', 'advanced', 'data-value="formula"', 'bc-link') : ''}${delayed ? '' : button('Uso mis propios dados', 'advanced', 'data-value="physical"', 'bc-link')}</div>` : ''}
      ${overflow === 'formula' ? `<input name="formula" type="text" value="${esc(s.formula || info.dice)}" aria-label="Fórmula manual">` : ''}${overflow === 'physical' ? `<div class="bc-own">${info.attack ? `<label>d20 <input name="physicalD20" type="number" min="1" max="20" value="${esc(s.physicalD20)}"></label>` : ''}${info.dice ? `<label>${sp.id === 'magic-missile' ? 'Un d4 por dardo' : 'Suma de dados'} <input name="physical" inputmode="numeric" value="${esc(s.physical)}"></label>` : ''}</div>` : ''}
      ${counterLevel ? `<label class="bc-own">Nivel revelado por el DM <input type="number" name="enemyLevel" min="0" max="9" value="${esc(s.enemyLevel ?? '')}"></label>` : ''}
      <div class="bc-target-line" role="status">${esc(blocked || text)}${p?.counter ? ` <b>${esc(p.counter)}</b>` : ''}</div><div class="bc-actions">${button('Cancelar', 'close', '', 'button secondary')}${button(sending ? 'Lanzando…' : 'Lanzar', 'confirm', `${!p?.ready || blocked || sending ? 'disabled' : ''}`, 'button bc-launch')}</div></div>`;
    }
    function resultCard() {
      const r = result;
      return `<section class="bc-result" aria-label="Resultado del conjuro"><div class="bc-head"><h2>${esc(r.name)}</h2>${button('×', 'close', 'aria-label="Cerrar resultado"', 'bc-info')}</div>${r.total != null || r.face != null ? `<div class="bc-roll">${RollFX.faceHTML(r.die || 20, r.face ?? '✦')}<strong>${r.total ?? r.face}</strong><small>${esc(r.formula || 'd20')}</small></div>` : ''}${
        r.dice?.length > 1
          ? `<div class="bc-dice">${r.dice
              .slice(0, 12)
              .map(d => RollFX.faceHTML(d.die, d.v, 'roll-mini'))
              .join('')}</div>`
          : ''
      }<ul>${r.rows.map(row => `<li>${esc(row)}</li>`).join('')}${Object.values(r.saves)
        .map(
          save =>
            `<li>${esc(save.name)} · ${save.pending ? 'Salvación pendiente' : save.saved ? 'Supera la salvación' : 'Falla la salvación'}${save.roll != null ? ' · d20 ' + save.roll + ' → ' + save.total : ''}${save.damage != null ? ' · ' + save.damage + ' de daño' : ''}</li>`,
        )
        .join('')}</ul>${button('Cerrar', 'close', '', 'button secondary')}</section>`;
    }
    function details() {
      const sp = byId(detail);
      if (!sp) return '';
      return `<div class="bc-detail"><div class="bc-head"><h2>${esc(sp.name)}</h2>${button('×', 'detail-close', 'aria-label="Cerrar detalles"', 'bc-info')}</div>${spellDetailHTML(sp, selection?.slot.level)}${screen === 'picker' ? button('Elegir', 'choose', `data-value="${esc(sp.id)}" ${combatBlock(sp) ? 'disabled' : ''}`, 'button') : ''}</div>`;
    }
    function top() {
      let html = '';
      if (!api.online()) html += '<span class="bc-connection" role="status">Sin conexión con la mesa</span>';
      if (state.concentration) {
        const sp = spellById(state.concentration),
          duration = Effects.list(state).find(
            e => e.spell === state.concentration || e.concentration === state.concentration,
          );
        html += button(
          esc((sp?.name || 'Concentración') + (duration ? ' · ' + Effects.remaining(duration) : '')),
          'concentration',
          'aria-label="Concentración activa"',
          'bc-chip',
        );
        if (Combat.data(state).checks.length)
          html += button(
            'Tirar salvación · CD ' + Combat.data(state).checks[0],
            'concentration-save',
            '',
            'bc-chip bc-warning',
          );
      }
      api.status(html);
    }
    function render() {
      shell.classList.toggle('bc-active', Boolean(screen || reaction));
      host.hidden = !screen && !reaction;
      host.dataset.screen = detail ? 'detail' : reaction ? 'reaction' : screen;
      host.classList.toggle('bc-full', full);
      const listTop = host.querySelector('.bc-list')?.scrollTop || 0;
      const turn = Combat.data(state);
      const turnTools = `<div class="bc-landscape-tools"><span>${turn.active ? (turn.onTurn ? 'Tu turno · ' + turn.turn : 'Turno ajeno') : 'Fuera de combate'}</span><button type="button" class="bc-chip" data-action="dice">Tirar dados</button></div>`;
      host.innerHTML =
        turnTools +
        (reaction
          ? reactionCard()
          : detail
            ? details()
            : screen === 'picker'
              ? picker()
              : screen === 'aim'
                ? aim()
                : screen === 'result'
                  ? resultCard()
                  : '');
      if (host.querySelector('.bc-list')) host.querySelector('.bc-list').scrollTop = listTop;
      top();
      ping();
    }
    async function confirm() {
      const s = selection,
        p = plan();
      if (!p?.ready || combatBlock(s.sp) || sending) return;
      if (!api.online()) {
        pending = { selection: s, scope: api.scope(), turn: Combat.data(state).turn };
        error = 'Lanzamiento en espera. Se enviará al recuperar la conexión.';
        render();
        return;
      }
      const form = new FormData();
      form.set('espacio', s.slot.value);
      form.set('castType', s.type);
      form.set('spiritForm', s.weapon || 'hammer');
      if (s.formula) form.set('spellDice', s.formula);
      if (s.physical) form.set('myDamage', s.physical);
      if (s.physicalD20) form.set('myD20', s.physicalD20);
      try {
        RollUI.validateBoardRoll(s.sp, s.slot.level, form);
        sending = true;
        error = '';
        render();
        result = await api.cast(s.sp.id, p.placement, {
          ...s,
          max: limit(s),
          form,
          mode: s.mode ?? RollUI.conditionMods(state, 'attack').mode,
        });
        if (result) {
          screen = 'result';
          requestAnimationFrame(() => api.focus(s.sp));
        }
        recents = [s.sp.id, ...recents.filter(id => id !== s.sp.id)].slice(0, 16);
        try {
          localStorage.setItem('dnd-board-recent-spells', JSON.stringify(recents));
        } catch {}
      } catch (e) {
        error = e.message;
        if (combatBlock(s.sp)) {
          screen = 'result';
          result = { name: s.sp.name, rows: [error], saves: {} };
        }
      } finally {
        sending = false;
        render();
      }
    }
    function mapTap(point, held = false) {
      if (screen !== 'aim' || detail || sending || reaction || pending) return;
      if (api.target(selection, point, limit(selection), held)) render();
    }
    function installClick(event) {
      const el = event.target.closest('[data-bc]');
      if (!el || sending) return;
      if (pending && el.dataset.bc !== 'close') return;
      const value = el.dataset.value;
      switch (el.dataset.bc) {
        case 'close':
          return close();
        case 'choose':
          return choose(value);
        case 'confirm':
          return void confirm();
        case 'detail':
          detail = value;
          break;
        case 'detail-close':
          detail = null;
          break;
        case 'expand':
          full = !full;
          break;
        case 'tab':
          tab = tab === value ? '' : value;
          break;
        case 'filter':
          filter.has(value) ? filter.delete(value) : filter.add(value);
          break;
        case 'slot': {
          selection.slot = slots(selection.sp).find(x => String(x.value) === value) || selection.slot;
          selection.selected = selection.selected.slice(0, limit(selection));
          selection.formula = '';
          break;
        }
        case 'type':
          selection.type = value;
          break;
        case 'wall':
          selection.ring = value === 'ring';
          break;
        case 'mode':
          selection.mode = value;
          break;
        case 'object':
          selection.object = value === '1';
          selection.selected = [];
          break;
        case 'weapon':
          selection.weapon = value;
          break;
        case 'advanced':
          overflow = overflow === value ? false : value;
          break;
        default:
          return;
      }
      error = '';
      render();
    }
    host.addEventListener('click', installClick);
    host.addEventListener('input', event => {
      if (event.target.type === 'search') {
        query = event.target.value;
        const quick = host.querySelector('.bc-quick');
        quick.hidden = !quick.childElementCount || Boolean(query || tab || filter.size);
        host.querySelector('.bc-list').innerHTML = pickerList();
        host.querySelector('.bc-list').scrollTop = 0;
      } else if (selection && ['formula', 'physical', 'physicalD20', 'enemyLevel'].includes(event.target.name)) {
        selection[event.target.name] = event.target.value;
      }
    });
    host.addEventListener('pointerdown', e => {
      if (screen === 'picker' && e.target.closest('.bc-head') && !e.target.closest('button')) gesture = e.clientY;
    });
    host.addEventListener('pointerup', e => {
      if (gesture === null) return;
      if (Math.abs(e.clientY - gesture) >= 32) {
        full = e.clientY < gesture;
        render();
      }
      gesture = null;
    });
    function reactionCard() {
      const { label, deadline, duration, body } = reaction;
      const left = Math.max(0, deadline - Date.now());
      return `<section class="bc-reaction"><div class="bc-head"><h2>${esc(label)}</h2><strong data-reaction-time>${Math.ceil(left / 1000)} s</strong></div><progress aria-label="Tiempo restante para reaccionar" max="${duration}" value="${left}"></progress><p>${esc(body)}</p><div class="bc-actions">${button('Pasar', 'reaction-pass', '', 'button secondary')}${button('Usar reacción', 'reaction-use', '', 'button')}</div></section>`;
    }
    host.addEventListener('click', e => {
      const action = e.target.closest('[data-bc]')?.dataset.bc;
      if (!reaction || !['reaction-pass', 'reaction-use'].includes(action)) return;
      const current = reaction;
      reaction = null;
      clearInterval(current.timer);
      render();
      if (action === 'reaction-use') void current.use();
      else current.pass?.();
    });
    function promptReaction(data) {
      if (reaction || sending || pending) return false;
      const duration = data.seconds * 1000;
      const current = { ...data, duration, deadline: Date.now() + duration };
      reaction = current;
      navigator.vibrate?.(70);
      current.timer = setInterval(() => {
        const left = current.deadline - Date.now();
        if (left <= 0) {
          clearInterval(current.timer);
          reaction = null;
          current.pass?.();
          render();
          return;
        }
        const timer = host.querySelector('[data-reaction-time]');
        if (timer) timer.textContent = `${Math.ceil(left / 1000)} s`;
        const progress = host.querySelector('.bc-reaction progress');
        if (progress) progress.value = left;
      }, 100);
      render();
      return true;
    }
    return {
      begin,
      close,
      render,
      top,
      plan,
      mapTap,
      promptReaction,
      confirm,
      showResult(value) {
        result = value;
        screen = 'result';
        detail = null;
        render();
      },
      connectionChanged() {
        if (pending?.selection === selection && api.online()) {
          const queued = pending;
          pending = null;
          if (
            queued.scope === api.scope() &&
            queued.turn === Combat.data(state).turn &&
            plan()?.ready &&
            !combatBlock(selection.sp)
          )
            void confirm();
          else {
            error = 'Cambió el turno o el tablero. Revisá el lanzamiento.';
            render();
          }
        } else top();
      },
      active: () => Boolean(screen || reaction),
      aim: () => (screen === 'aim' && !detail && !sending && !reaction ? selection : null),
      updateSave(castId, token, saved, details = {}) {
        if (result?.castId !== castId || !result.saves[token]) return;
        Object.assign(result.saves[token], { ...details, saved, pending: false });
        render();
      },
    };
  }
  root.BoardCasting = { mount };
})(globalThis);
