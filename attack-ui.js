/* Ataques en la pantalla de combate: tarjetas por arma, tirada de ataque y daño, y ajustes por arma. */
const AttackUI = (() => {
  'use strict';
  const A = Attacks;
  const MODES = {
    action: 'Acción · Atacar',
    bonus: 'Acción adicional · otra mano',
    reaction: 'Reacción · oportunidad',
  };
  let session = null; // ataque abierto: { itemId, mode, attacks, last }

  const rnd = sides => roll(sides)[0];
  const itemById = id => A.options(state).find(x => x.id === id);
  const dmgText = p =>
    `${/d/.test(p.dice) ? p.dice + (p.dmgMod ? ' ' + sign(p.dmgMod) : '') : Math.max(0, Number(p.dice) + p.dmgMod)} ${esc(p.type)}${p.extra ? ' + ' + esc(p.extra) : ''}`;

  const dmgDice = p =>
    /d/.test(p.dice) ? p.dice + (p.dmgMod ? ' ' + sign(p.dmgMod) : '') : String(Math.max(0, Number(p.dice) + p.dmgMod));

  function eligible(item, mode) {
    const w = item.unarmed ? item.weapon : A.weaponOf(item);
    if (mode === 'bonus') return !item.unarmed && w.light && !w.ranged;
    if (mode === 'reaction') return !w.ranged;
    return true;
  }
  function reason(mode) {
    const c = Combat.data(state);
    if (mode === 'action' && c.active && c.onTurn && c.action?.startsWith('Atacar')) return '';
    return Combat.blocked(state, mode);
  }

  function choices(tab) {
    if (!state.classId) return '';
    const n = A.attacksPerAction(state),
      why = reason(tab);
    return A.options(state)
      .filter(x => eligible(x, tab))
      .map(item => {
        const p = A.profile(state, item, { mode: tab });
        const w = p.weapon;
        const meta = [
          w.range ? (w.ranged ? 'Distancia ' : 'Arrojadiza ') + w.range + ' pies' : w.reach ? 'Alcance 10 pies' : '',
          w.versatile ? 'Versátil ' + w.versatile : '',
          ...(w.props || []).filter(x => !['Versátil', 'Arrojadiza', 'Alcance'].includes(x) && x),
        ].filter(Boolean);
        return `<article class="battle-choice attack-choice"><div><span class="eyebrow">${MODES[tab]}${tab === 'action' && n > 1 ? ' · ' + n + ' ataques' : ''}</span><h3>${esc(item.name)}</h3><div class="attack-stats"><span><small>Impacto</small><b>${sign(p.toHit)}</b></span><span><small>Daño</small><b>${dmgDice(p)}</b><em>${esc(p.type)}${p.extra ? ' + ' + esc(p.extra) : ''}</em></span></div>${meta.length ? `<p class="small">${esc(meta.join(' · '))}</p>` : ''}${p.notes.length ? `<p class="small muted">${esc(p.notes.join(' · '))}</p>` : ''}</div><div class="choice-bottom">${why ? `<p class="choice-reason">${esc(why)}</p>` : ''}<div class="actions">${item.unarmed ? '' : button('Ajustes', 'attack-settings', 'secondary', `data-id="${esc(item.id)}"`)}${button('Atacar', 'attack-open', '', `data-id="${esc(item.id)}" data-mode="${tab}" ${why ? 'disabled' : ''}`)}</div></div></article>`;
      })
      .join('');
  }

  function current() {
    const item = itemById(session.itemId);
    if (!item) throw Error('Esa arma ya no está en tu inventario.');
    const twoHands = Boolean(document.querySelector('#dialog-form [name=twoHands]')?.checked);
    return { item, p: A.profile(state, item, { mode: session.mode, twoHands }) };
  }
  function drawLog() {
    const el = document.getElementById('attack-log');
    if (!el) return;
    el.innerHTML = session.log.length
      ? session.log.map(x => `<p class="${x.cls || ''}">${x.html}</p>`).join('')
      : '<p class="small muted">Tirá el ataque y después el daño si impacta.</p>';
    const dmg = document.querySelector('[data-action=attack-damage]');
    if (dmg) {
      dmg.disabled = !session.last;
      dmg.textContent = session.last?.crit ? 'Tirar daño crítico' : 'Tirar daño';
    }
  }

  // Registra el uso de acción, adicional o reacción la primera vez en este turno.
  function spendAction(name) {
    const c = Combat.data(state);
    if (session.spent || !c.active) return;
    if (session.mode === 'action') {
      if (c.action?.startsWith('Atacar')) return (session.spent = true);
      commit('Acción: Atacar con ' + name, s => Combat.use(s, 'action', 'Atacar'));
    } else if (session.mode === 'bonus')
      commit('Adicional: ataque con ' + name, s => Combat.use(s, 'bonus', 'Ataque con ' + name));
    else commit('Reacción: ataque de oportunidad con ' + name, s => Combat.use(s, 'reaction', 'Ataque de oportunidad'));
    session.spent = true;
  }

  function open(id, mode) {
    const item = itemById(id);
    if (!item) throw Error('Arma no encontrada.');
    const why = reason(mode);
    if (why) throw Error(why);
    session = { itemId: id, mode, attacks: 0, last: null, log: [], spent: false };
    const p = A.profile(state, item, { mode }),
      w = p.weapon,
      n = mode === 'action' ? A.attacksPerAction(state) : 1;
    modal(
      (mode === 'reaction' ? 'Ataque de oportunidad con ' : 'Atacar con ') + item.name,
      `<p>${mode === 'action' && n > 1 ? `Tu acción de Atacar permite <b>${n} ataques</b>; podés repartirlos entre objetivos y moverte entre ellos.` : mode === 'bonus' ? 'Ataque con la otra mano: requiere haber atacado con un arma ligera en la otra mano en este turno.' : mode === 'reaction' ? 'Cuando un enemigo sale de tu alcance usando su movimiento.' : 'Un ataque con tu acción de Atacar.'}</p>
      ${RollUI.d20Fields(RollUI.conditionMods(state, 'attack'), '', { kind: 'attack' }).replace(/<details class="physical-dice">[\s\S]*<\/details>$/, '')}
      ${w.versatile && mode !== 'bonus' ? `<label class="check"><input type="checkbox" name="twoHands">A dos manos (${esc(w.versatile)})</label>` : ''}
      <details class="physical-dice"><summary>Uso mis propios dados</summary><p class="small">Escribí lo que salió en la mesa y la ficha suma tus bonos. Con ventaja o desventaja, anotá el d20 que conservás. En un crítico, sumá todos los dados duplicados.</p><div class="form-grid">${field('Mi d20', 'myD20', '', 'number', 'min="1" max="20" inputmode="numeric"')}${field('Suma de mis dados de daño', 'myDamage', '', 'number', 'min="0" max="999" inputmode="numeric"')}</div></details>
      <div class="attack-log" id="attack-log" aria-live="polite"></div>
      <div class="actions">${button('Tirar daño', 'attack-damage', 'secondary', 'disabled')}</div>`,
      () => {
        attack();
        return false;
      },
      'Tirar ataque',
    );
    drawLog();
  }

  function attack() {
    const { item, p } = current();
    const heroic = Boolean(document.querySelector('#dialog-form [name=heroic]')?.checked);
    let adv = document.querySelector('#dialog-form [name=adv]:checked')?.value || '';
    if (heroic) adv = adv === 'dis' ? '' : 'adv';
    const extra = RollUI.readBonus(new FormData(document.getElementById('dialog-form')));
    const mine = takeInput('myD20', 1, 20);
    spendAction(item.name);
    const r =
        mine === null
          ? A.rollAttack(p, adv, rnd)
          : { rolls: [mine], kept: mine, total: mine + p.toHit, crit: mine === 20, fumble: mine === 1, physical: true },
      n = session.mode === 'action' ? A.attacksPerAction(state) : 1;
    r.total += extra.total;
    session.attacks++;
    session.last = r.fumble ? null : { crit: r.crit, profile: p };
    const label = `Ataque ${session.attacks}${n > 1 ? ' de ' + n : ''}`;
    const dice =
      (r.rolls.length > 1 ? `d20 ${r.rolls.join(' / ')} → ${r.kept}` : `d20 ${r.kept}`) +
      (r.physical ? ' (dado físico)' : '') +
      extra.text;
    RollFX.show({
      label: label + ' · ' + item.name,
      total: r.total,
      face: r.kept,
      detail: dice + ' ' + sign(p.toHit),
      crit: r.crit,
      fumble: r.fumble,
    });
    session.log.unshift({
      html: `<b>${label}:</b> ${dice} ${sign(p.toHit)} = <b>${r.total}</b>${r.crit ? ' · <b>¡Crítico!</b>' : r.fumble ? ' · Pifia: falla automáticamente' : ''}${session.attacks > n ? ' <span class="muted">(más ataques que los de tu acción: confirmalo con el DM)</span>' : ''}`,
      cls: r.crit ? 'crit' : r.fumble ? 'fumble' : '',
    });
    commit(
      `${item.name}: ataque ${dice} ${sign(p.toHit)} = ${r.total}${r.crit ? ' (crítico)' : ''}${heroic ? ' (Inspiración)' : ''}`,
      s => {
        if (heroic) s.heroicInspiration = false;
        RollUI.spendBonus(s, extra.ids);
      },
    );
    document.querySelectorAll('#dialog-form [name=bonusDie]:checked').forEach(x => x.closest('.bonus-die').remove());
    const box = document.querySelector('#dialog-form [name=heroic]');
    if (heroic && box) box.closest('label').remove();
    TableUI.shareRoll({
      label: 'Ataque con ' + item.name + (r.crit ? ' (crítico)' : ''),
      rolls: r.rolls,
      bonus: p.toHit,
      total: r.total,
      physical: Boolean(r.physical),
    });
    drawLog();
  }

  function damage() {
    if (!session?.last) throw Error('Tirá primero un ataque que no sea pifia.');
    const { item, p } = current();
    const crit = session.last.crit,
      mine = takeInput('myDamage', 0, 999),
      dmg =
        mine === null
          ? A.rollDamage(p, crit, rnd)
          : { parts: [{ rolls: [], sum: mine }], total: Math.max(0, mine + p.dmgMod), physical: true };
    const parts = dmg.physical
      ? 'dados físicos ' + mine
      : dmg.parts
          .filter(x => x.rolls.length)
          .map(x => `${x.rolls.join('+')} ${esc(x.label)}`)
          .join(' · ');
    RollFX.show({ label: 'Daño · ' + item.name, total: dmg.total, face: '⚔', detail: parts || 'fijo', crit });
    session.log.unshift({
      html: `<b>Daño${crit ? ' crítico' : ''}:</b> ${parts || 'fijo'}${p.dmgMod ? ' ' + sign(p.dmgMod) : ''} = <b>${dmg.total}</b>`,
      cls: 'damage',
    });
    session.last = null;
    commit(`${item.name}: daño ${dmg.total}${crit ? ' (crítico)' : ''}`, () => {});
    TableUI.shareRoll({
      label: 'Daño con ' + item.name + (crit ? ' (crítico)' : ''),
      rolls: dmg.parts.flatMap(x => x.rolls),
      bonus: p.dmgMod,
      total: dmg.total,
      physical: Boolean(dmg.physical),
    });
    drawLog();
  }

  // Lee y vacía un campo de dado físico; null si quedó vacío.
  function takeInput(name, min, max) {
    const el = document.querySelector(`#dialog-form [name=${name}]`);
    if (!el || el.value === '') return null;
    const n = Number(el.value);
    if (!Number.isInteger(n) || n < min || n > max) throw Error(`Revisá tu dado: entre ${min} y ${max}.`);
    el.value = '';
    return n;
  }

  function settingsModal(id) {
    const item = state.inventory.find(x => x.id === id);
    if (!item) throw Error('Arma no encontrada.');
    const cfg = A.settings(item),
      auto = A.profile(state, { ...item, attack: undefined });
    modal(
      'Ajustes de ' + item.name,
      `<p class="small">Automático: ${esc(Rules.attrs[auto.ability])}, ${auto.proficient ? 'con' : 'sin'} competencia. Cambialo si un rasgo, dote u objeto lo modifica (por ejemplo, Pacto del filo con CAR).</p>${select(
        'Característica',
        'ability',
        [['auto', 'Automática'], ...Object.entries(Rules.attrs)],
        cfg.ability,
      )}${select(
        'Competencia',
        'proficient',
        [
          ['auto', 'Automática'],
          ['yes', 'Sí'],
          ['no', 'No'],
        ],
        cfg.proficient === 'auto' ? 'auto' : cfg.proficient ? 'yes' : 'no',
      )}<div class="form-grid">${field('Bono mágico (+1, +2, +3)', 'magic', cfg.magic, 'number', 'min="-5" max="10" required')}${field('Daño extra', 'extra', cfg.extra, 'text', 'maxlength="60" placeholder="1d6 fuego"')}</div>`,
      fd => {
        const extra = String(fd.get('extra')).trim();
        if (extra && !/^\+?\s*\d+d\d+(\s+\S.*)?$/.test(extra))
          throw Error('El daño extra se escribe como «1d6 fuego».');
        const p = fd.get('proficient');
        commit('Ajustes de ataque: ' + item.name, s => {
          const x = s.inventory.find(i => i.id === id);
          x.attack = {
            ability: fd.get('ability'),
            proficient: p === 'auto' ? 'auto' : p === 'yes',
            magic: number(fd, 'magic', -5, 10),
            extra,
          };
        });
      },
    );
  }

  function install() {
    Object.assign(actions, {
      'attack-open': e => open(e.dataset.id, e.dataset.mode),
      'attack-damage': () => damage(),
      'attack-settings': e => settingsModal(e.dataset.id),
    });
  }
  return { choices, install };
})();
