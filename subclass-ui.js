/* Usar un rasgo de subclase desde la ficha: gasta su uso (o Canalizar divinidad, ki, puntos de hechicería,
   Inspiración, un espacio…), muestra la CD y tira los dados de curación, PG temporales o daño.
   Los datos vienen de SubclassFX (subclass-fx-data.js y subclass-fx-uses.js). */
const SubclassUI = (() => {
  'use strict';
  const F = () => globalThis.SubclassFX;
  const ACTIONS = [
    ['manual', 'Solo el uso / se resuelve en la mesa'],
    ['action', 'Acción'],
    ['bonus', 'Acción adicional'],
    ['reaction', 'Reacción'],
    ['free', 'Sin acción'],
  ];
  const SHARED = {
    channel: 'Canalizar divinidad',
    ki: 'ki',
    sorcery: 'puntos de hechicería',
    'wild-shape': 'Forma salvaje',
    superiority: 'dados de superioridad',
    inspiration: 'Inspiración bárdica',
  };
  // Cuánto queda del recurso que gasta un uso (propio o compartido).
  function left(s, r) {
    if (r.u.shared === 'inspiration')
      return s.inspirationSpent === null ? null : R.stats(s).inspirationMax - s.inspirationSpent;
    const id = r.own ? r.id : r.u.shared ? F().sharedId(r.e, r.u) : null;
    if (!id) return Infinity;
    const res = Classes.resources(s).find(x => x.id === id);
    if (!res) return 0;
    const used = Classes.spent(s, res);
    return used === null ? null : res.max - used;
  }
  const sharedName = r => (r.u.shared === 'psi' ? 'dados psiónicos' : SHARED[r.u.shared] || r.u.shared || 'usos');
  const costOf = u => (typeof u.cost === 'object' ? u.cost : { min: u.cost || 1, max: u.cost || 1 });
  // Dados de la tirada para n dados o puntos gastados.
  const expr = (r, n) => {
    const x = { ...r.x, n },
      dice = r.u.roll.dice(x) || '',
      flat = typeof r.u.roll.flat === 'function' ? r.u.roll.flat(x) : r.u.roll.flat || 0;
    return { dice, flat };
  };
  const show = (dice, flat) => (dice ? dice + (flat ? ' ' + sign(flat) : '') : String(flat));
  const KIND = { heal: 'Curación', temp: 'PG temporales', damage: 'Daño', roll: 'Resultado' };

  function open(id) {
    const r = F()?.find(state, id);
    if (!r) throw Error('Ese rasgo no está disponible en tu nivel.');
    const u = r.u,
      have = left(state, r),
      dc = F().dc(r);
    if (have === null) throw Error('Confirmá primero cuántos usos te quedan en Recursos.');
    let body = `<p>${esc(u.text)}</p>`;
    if (dc)
      body += `<p class="banner">Salvación${u.save.ab ? ' de ' + esc(Rules.attrs[u.save.ab]) : ''} contra tu CD <b>${dc}</b>.</p>`;
    if (u.pool) {
      const per = Math.min(u.pool.per(r.x), have);
      if (per < 1) throw Error('No quedan dados en la reserva.');
      body += field(
        `Dados a gastar (d${u.pool.die(r.x)}, hasta ${per})`,
        'n',
        1,
        'number',
        `min="1" max="${per}" required`,
      );
    } else if (u.shared) {
      const c = costOf(u);
      if (have < c.min) throw Error(`No te alcanzan los ${sharedName(r)} (quedan ${have}).`);
      body +=
        c.max > c.min
          ? field(
              `${sharedName(r)[0].toUpperCase() + sharedName(r).slice(1)} a gastar (te quedan ${have})`,
              'n',
              c.min,
              'number',
              `min="${c.min}" max="${Math.min(c.max, have)}" required`,
            )
          : `<p class="small">Gasta ${c.min} de ${esc(sharedName(r))} (te quedan ${have}).</p>`;
    } else if (r.own && have < 1) throw Error('No quedan usos de ' + r.name + '.');
    if (u.extraCost)
      body += `<p class="small">Además gasta ${u.extraCost.n} ${esc(SHARED[u.extraCost.res] || u.extraCost.res)}.</p>`;
    if (u.slot) {
      const d = R.stats(state),
        slots = d.slots
          .map((max, i) => [i + 1, max])
          .filter(
            ([l, max]) => max && (u.noSpend || (state.slotsSpent[l - 1] !== null && state.slotsSpent[l - 1] < max)),
          );
      if (!slots.length) throw Error('No quedan espacios de conjuro.');
      body += select(
        u.noSpend ? 'Nivel del espacio que usaste' : 'Espacio a gastar',
        'slot',
        slots.map(([l]) => [l, 'Nivel ' + l]),
        slots[0][0],
      );
    }
    if (u.roll?.count) body += field(u.roll.count, 'n', 1, 'number', `min="0" max="${u.roll.max || 10}" required`);
    if (u.roll) {
      const e = expr(r, 1);
      const kinds = [u.roll.kind, u.roll.alt].filter(Boolean);
      body += `<p class="small"><b>${esc(u.roll.label || KIND[u.roll.kind])}:</b> ${esc(show(e.dice, e.flat))}${u.pool || u.slot || (u.shared && costOf(u).max > costOf(u).min) ? ' (con 1; crece con lo que gastes)' : ''}${u.roll.type ? ' ' + esc(Defenses.label(u.roll.type)) : ''}.</p>`;
      if (kinds.length > 1)
        body += select(
          'Qué hacés',
          'mode',
          kinds.map(k => [k, k === 'heal' ? 'Curar' : k === 'damage' ? 'Hacer daño' : KIND[k]]),
          kinds[0],
        );
      if (kinds.some(k => k === 'heal' || k === 'temp'))
        body += select(
          'A quién',
          'target',
          [
            ['self', 'A mí (se suma a mis PG)'],
            ['other', 'A otra criatura (lo anota ella)'],
          ],
          u.roll.kind === 'temp' && u.shared === 'inspiration' ? 'other' : 'self',
        );
    }
    body += select('Qué consume en este uso', 'action', ACTIONS, u.action || 'manual');
    modal(
      r.name,
      body,
      fd => {
        let result = '',
          started = false;
        commit('Usado: ' + r.name, s => {
          const k = fd.get('action'),
            again = F().find(s, id);
          if (!again) throw Error('Ese rasgo ya no está disponible.');
          const n = fd.has('n') ? number(fd, 'n', 0, 999) : u.shared ? costOf(u).min : 1;
          if (['action', 'bonus', 'reaction'].includes(k)) Combat.use(s, k, r.name);
          if (u.shared === 'inspiration') {
            if (s.inspirationSpent === null || s.inspirationSpent >= R.stats(s).inspirationMax)
              throw Error('No quedan usos de Inspiración.');
            s.inspirationSpent++;
          } else if (u.shared) {
            if (n > 0) Classes.spend(s, F().sharedId(r.e, u), n);
          } else if (again.own) Classes.spend(s, id, u.pool ? Math.max(1, n) : 1);
          if (u.extraCost) Classes.spend(s, u.extraCost.res, u.extraCost.n);
          let slot = 0;
          if (u.slot) {
            slot = number(fd, 'slot', 1, 9);
            if ((!u.noSpend && s.slotsSpent[slot - 1] === null) || s.slotsSpent[slot - 1] >= R.stats(s).slots[slot - 1])
              throw Error('No queda ese espacio.');
            if (!u.noSpend) s.slotsSpent[slot - 1]++;
          }
          // Si el rasgo activa un estado (Canto del filo, Forma estelar…), empieza a contar su duración.
          const stateKey = again.e.base
            ? ''
            : u.state
              ? again.e.key + '/' + u.state
              : again.e.spec.state
                ? again.e.key
                : '';
          if (stateKey) {
            F().startState(s, stateKey);
            started = true;
          }
          if (u.restore) {
            const target = 'sfx:' + r.e.sub.id + '-' + u.restore;
            s.classSpent = { ...(s.classSpent || {}), [target]: Math.max(0, (s.classSpent?.[target] || 0) - 1) };
          }
          // Rasgos que invocan un compañero (Espíritu del fuego salvaje, Objeto danzante, zombi…).
          if (u.companion) {
            const c = F().makeCompanion(s, u.companion);
            s.companions = [...(s.companions || []).filter(x => x.sfx !== u.companion), c];
            result = (result ? result + ' · ' : '') + c.name + ' en Compañeros';
          }
          if (u.portent) {
            s.portent = roll(20, u.portent(again.x));
            result = 'tus d20 de Presagio: ' + s.portent.join(', ');
          }
          if (u.slots) result = `recuperás espacios que sumen hasta ${u.slots(r.x)} niveles (ajustalos en Recursos)`;
          if (!u.roll) return;
          const e = expr(again, u.slot ? slot : u.pool || u.shared || u.roll.count ? n : 1),
            m = /^(\d+)d(\d+)$/.exec(e.dice || ''),
            rolls = m ? roll(Number(m[2]), Number(m[1])) : [],
            total = Math.max(0, rolls.reduce((a, b) => a + b, 0) + e.flat),
            mode = fd.get('mode') || u.roll.kind,
            self = fd.get('target') !== 'other';
          const detail =
            (rolls.length ? `${e.dice} [${rolls.join(', ')}]` : '') +
            (e.flat ? (rolls.length ? ' ' + sign(e.flat) : String(e.flat)) : '');
          result =
            mode === 'temp' && !u.roll.label
              ? `${total} PG temporales${detail && detail !== String(total) ? ' (' + detail + ')' : ''}`
              : `${u.roll.label || KIND[mode]} ${total}${detail && detail !== String(total) ? ' (' + detail + ')' : ''}${mode === 'damage' && u.roll.type ? ' ' + Defenses.label(u.roll.type) : ''}`;
          if (mode === 'heal' && self) {
            if (s.hp === null) throw Error('Confirmá tus PG actuales.');
            const before = s.hp;
            s.hp = Math.min(R.stats(s).maxHP, s.hp + total);
            result += ` → +${s.hp - before} PG`;
          }
          const temp = mode === 'temp' ? total : u.roll.temp ? u.roll.temp({ ...again.x, n }) : 0;
          if (temp && self) {
            const before = s.temp || 0;
            s.temp = Math.max(before, temp);
            if (mode !== 'temp') result += ` · ${temp} PG temporales`;
            if (before > temp) result += ' (te quedás con los que ya tenías)';
          } else if (temp && mode !== 'temp') result += ` · ${temp} PG temporales`;
        });
        toast(r.name + (result ? ': ' + result + '.' : '.') + (started ? ' Activo.' : ''));
        if (result && typeof TableUI !== 'undefined' && TableUI.link?.())
          TableUI.shareRoll?.({
            label: r.name,
            rolls: [],
            bonus: 0,
            total: Number(/\d+/.exec(result)?.[0]) || 0,
            physical: false,
          });
      },
      'Usar',
    );
  }

  // Rasgos sin contador propio: en la pestaña de combate que corresponde y en Recursos.
  function cardOf(r) {
    const dc = F().dc(r);
    return `<article class="battle-choice"><h3>${esc(r.name)}</h3><p>${esc(r.u.text)}${dc ? ' CD ' + dc + '.' : ''}</p><p class="small muted">${r.u.shared ? 'Gasta ' + esc(sharedName(r)) : 'Sin límite de usos'}.</p>${button('Usar rasgo', 'sfx-use', 'secondary', `data-id="${esc(r.id)}"`)}</article>`;
  }
  function combat(kind) {
    if (!F()) return '';
    return F()
      .actions(state)
      .filter(
        r =>
          (r.u.action || 'manual') === kind ||
          (kind === 'action' && ['free', 'manual'].includes(r.u.action || 'manual')),
      )
      .map(cardOf)
      .join('');
  }
  function panel() {
    const list = F()?.actions(state) || [];
    if (!list.length) return '';
    return `<div class="pool-row"><div class="pool-head"><b>Rasgos de subclase</b></div><p class="small">Gastan otro recurso o no tienen límite: la ficha descuenta lo que corresponda y tira los dados.</p><div class="battle-choices">${list.map(cardOf).join('')}</div></div>`;
  }
  // Elegir las opciones de un rasgo (Espíritu tótem, maniobras, runas…).
  function choose(key) {
    const c = F()
      ?.choices(state)
      .find(x => x.key === key);
    if (!c) throw Error('Esa elección no está disponible.');
    const one = c.count === 1;
    modal(
      c.name,
      `<p class="small">${esc(c.label)}${one ? '' : ` (hasta ${c.count})`}.${c.rest ? ' Podés cambiarla tras un descanso ' + (c.rest === 'short' ? 'corto o largo' : 'largo') + '.' : ''}</p><div class="choice-list">${c.options
        .map(
          o =>
            `<label class="check sfx-option"><input type="${one ? 'radio' : 'checkbox'}" name="pick" value="${esc(o.id)}" ${c.picked.includes(o.id) ? 'checked' : ''}><span><b>${esc(o.name)}</b>${o.text ? `<br><span class="small">${esc(o.text)}</span>` : ''}</span></label>`,
        )
        .join('')}</div>`,
      fd => {
        const ids = fd.getAll('pick');
        commit(`${c.name}: ${ids.map(id => c.options.find(o => o.id === id)?.name).join(', ') || 'sin elegir'}`, s =>
          F().setChoice(s, key, ids),
        );
      },
      'Guardar',
    );
    if (!one)
      document.querySelector('#dialog-form').addEventListener('change', () => {
        const boxes = [...document.querySelectorAll('#dialog-form [name=pick]')],
          full = boxes.filter(b => b.checked).length >= c.count;
        for (const b of boxes) b.disabled = full && !b.checked;
      });
  }
  // Estados activos con su duración, y los que se activan sin gastar nada.
  function statesCard() {
    if (!F()) return '';
    const on = F().states(state),
      off = F().toggles(state),
      todo = F().pending(state),
      portent = state.portent || [];
    if (!on.length && !off.length && !todo.length && !portent.length) return '';
    const left = x =>
      x.left === null
        ? 'hasta que lo termines o descanses'
        : x.left === 1
          ? 'termina al empezar tu próximo turno'
          : `quedan ${x.left} turnos tuyos`;
    return `<section class="card sfx-states"><div class="card-header"><div><p class="eyebrow">SUBCLASE</p><h2>${on.length ? 'Rasgos activos' : 'Rasgos de subclase'}</h2></div></div>${on
      .map(
        x =>
          `<div class="feature"><h3>${esc(x.name)}</h3><p class="small">${esc(x.text)}</p><p class="small muted">${esc(left(x))}.</p><div class="actions">${button('Terminar', 'sfx-state-end', 'secondary', `data-key="${esc(x.key)}"`)}</div></div>`,
      )
      .join('')}${off
      .map(
        x =>
          `<div class="feature"><h3>${esc(x.name)}</h3><p class="small">${esc(x.text)}</p><div class="actions">${button('Activar', 'sfx-state-start', 'secondary', `data-key="${esc(x.key)}"`)}</div></div>`,
      )
      .join('')}${
      portent.length
        ? `<div class="feature"><h3>Presagio</h3><p class="small">Reemplazá una tirada de ataque, salvación o prueba que veas por uno de estos valores, antes de saber el resultado.</p><div class="actions">${portent.map((n, i) => button('Usar ' + n, 'sfx-portent', 'secondary', `data-i="${i}"`)).join('')}</div></div>`
        : ''
    }${todo
      .map(
        c =>
          `<div class="feature"><h3>${esc(c.name)}</h3><p class="small">Falta elegir (${c.picked.length}/${c.count}).</p><div class="actions">${button('Elegir', 'sfx-choose', 'secondary', `data-key="${esc(c.key)}"`)}</div></div>`,
      )
      .join('')}</section>`;
  }
  // Compañeros de subclase: crear, elegir la bestia o actualizar sus estadísticas a tu nivel.
  function companionsCard() {
    if (!F()) return '';
    const mine = state.companions || [],
      rows = [];
    const seen = new Set();
    for (const d of F().companionDefs(state)) {
      const have = mine.filter(c => c.sfx === d.id || c.sfx?.startsWith(d.key + '/') || c.sfx === d.key);
      for (const c of have.filter(c => c.sfx === d.id))
        if (F().staleCompanion(state, c))
          rows.push(
            `<div class="feature"><h3>${esc(c.name)}</h3><p class="small">Sus estadísticas cambiaron con tu nivel o tus características.</p><div class="actions">${button('Actualizar a tu nivel', 'sfx-companion-sync', 'secondary', `data-id="${esc(c.id)}"`)}</div></div>`,
          );
      if (have.length || d.via === 'use' || seen.has(d.key)) continue;
      if (d.variant) {
        seen.add(d.key);
        const all = F()
          .companionDefs(state)
          .filter(x => x.key === d.key);
        rows.push(
          `<div class="feature"><h3>${esc(
            F()
              .report(state)
              .find(r => r.key === d.key)?.name || d.name,
          )}</h3><div class="actions">${all.map(x => button('Crear: ' + x.name, 'sfx-companion', 'secondary', `data-id="${esc(x.id)}"`)).join('')}</div></div>`,
        );
      } else
        rows.push(
          `<div class="feature"><h3>${esc(d.name)}</h3><div class="actions">${d.beast ? button('Elegir bestia', 'sfx-beast', 'secondary', `data-id="${esc(d.id)}"`) : button('Crear', 'sfx-companion', 'secondary', `data-id="${esc(d.id)}"`)}</div></div>`,
        );
    }
    return rows.length ? `<div class="sfx-companions section-space">${rows.join('')}</div>` : '';
  }
  function addCompanion(id, monster = null) {
    commit('Compañero de subclase', s => {
      const c = F().makeCompanion(s, id, monster);
      s.companions = [...(s.companions || []), c];
    });
    toast('Compañero creado: está en Compañeros.');
  }
  async function beastPicker(id) {
    await CompanionsUI.loadMonsters();
    const d = F()
      .companionDefs(state)
      .find(x => x.id === id);
    const list = MonsterData.filter(
      m => m.cr <= d.beast.cr && d.beast.sizes.includes(m.size) && /beast|bestia/i.test(String(m.type || '')),
    ).sort((a, b) => a.cr - b.cr || a.name.localeCompare(b.name));
    modal(
      'Elegí tu bestia',
      `<p class="small">Bestias Medianas o menores de VD 1/4 o menos. La ficha suma tu competencia a su CA, ataques y daño, y le da ${4 * d.x.l} PG si tiene menos.</p><div class="magic-pick-list">${list
        .map(
          m =>
            `<button type="button" class="magic-pick" data-action="sfx-beast-pick" data-id="${esc(id)}" data-m="${esc(m.id)}"><b>${esc(m.name)}</b><span class="small muted">CA ${m.ac} · PG ${m.hp} · ${esc(Companions.speedEs(m.speed))}</span></button>`,
        )
        .join('')}</div>`,
    );
  }
  function install() {
    actions['sfx-companion'] = e => addCompanion(e.dataset.id);
    actions['sfx-beast'] = e => beastPicker(e.dataset.id);
    actions['sfx-beast-pick'] = e => {
      document.querySelector('dialog[open]')?.close();
      addCompanion(
        e.dataset.id,
        MonsterData.find(m => m.id === e.dataset.m),
      );
    };
    actions['sfx-companion-sync'] = e => {
      let name = '';
      commit('Compañero actualizado a tu nivel', s => (name = F().syncCompanion(s, e.dataset.id).name));
      toast(name + ': estadísticas actualizadas.');
    };
    actions['sfx-choose'] = e => choose(e.dataset.key);
    actions['sfx-portent'] = e => {
      const i = Number(e.dataset.i),
        n = state.portent?.[i];
      if (!n) return;
      commit('Presagio: ' + n, s => {
        s.portent = s.portent.filter((_, j) => j !== i);
        if (!s.portent.length) delete s.portent;
      });
      toast(`Presagio: la tirada es ${n}.`);
    };
    actions['sfx-use'] = e => open(e.dataset.id);
    actions['sfx-state-start'] = e => {
      const name =
        F()
          .toggles(state)
          .find(x => x.key === e.dataset.key)?.name || 'Estado';
      commit('Activado: ' + name, s => F().startState(s, e.dataset.key));
      render();
    };
    actions['sfx-state-end'] = e => {
      const name =
        F()
          .states(state)
          .find(x => x.key === e.dataset.key)?.name || 'Estado';
      commit('Terminó: ' + name, s => F().endState(s, e.dataset.key));
      render();
    };
  }
  return { open, choose, combat, panel, statesCard, companionsCard, install };
})();
if (typeof globalThis !== 'undefined') globalThis.SubclassUI = SubclassUI;
