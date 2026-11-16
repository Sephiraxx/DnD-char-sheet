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
          .filter(([l, max]) => max && state.slotsSpent[l - 1] !== null && state.slotsSpent[l - 1] < max);
      if (!slots.length) throw Error('No quedan espacios de conjuro.');
      body += select(
        'Espacio a gastar',
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
        let result = '';
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
            if (s.slotsSpent[slot - 1] === null || s.slotsSpent[slot - 1] >= R.stats(s).slots[slot - 1])
              throw Error('No queda ese espacio.');
            s.slotsSpent[slot - 1]++;
          }
          if (u.restore) {
            const target = 'sfx:' + r.e.sub.id + '-' + u.restore;
            s.classSpent = { ...(s.classSpent || {}), [target]: Math.max(0, (s.classSpent?.[target] || 0) - 1) };
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
        toast(r.name + (result ? ': ' + result + '.' : '.'));
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
  function install() {
    actions['sfx-use'] = e => open(e.dataset.id);
  }
  return { open, combat, panel, install };
})();
if (typeof globalThis !== 'undefined') globalThis.SubclassUI = SubclassUI;
