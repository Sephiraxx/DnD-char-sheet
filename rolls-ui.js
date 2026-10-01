/* Tiradas de la ficha: d20 con ventaja por condiciones, Inspiración del DM, dados físicos y conjuros. */
const RollUI = (() => {
  'use strict';
  const ABILITY_ES = {
    Fuerza: 'str',
    Destreza: 'dex',
    Constitución: 'con',
    Inteligencia: 'int',
    Sabiduría: 'wis',
    Carisma: 'cha',
  };

  // Efecto de las condiciones (reglas 2014) sobre una tirada. kind: 'attack' | 'check' | 'save'.
  function conditionMods(s, kind, ability = '') {
    const has = c => s.conditions.includes(c),
      adv = [],
      dis = [];
    let autoFail = '';
    if (kind === 'attack') {
      for (const c of ['Envenenado', 'Asustado', 'Derribado', 'Cegado', 'Restringido']) if (has(c)) dis.push(c);
      if (has('Invisible')) adv.push('Invisible');
    }
    if (kind === 'check') for (const c of ['Envenenado', 'Asustado']) if (has(c)) dis.push(c);
    if (kind === 'save') {
      if (ability === 'dex' && has('Restringido')) dis.push('Restringido');
      const out = ['Paralizado', 'Aturdido', 'Inconsciente', 'Petrificado'].find(has);
      if (out && ['str', 'dex'].includes(ability)) autoFail = out;
    }
    const mode = adv.length && !dis.length ? 'adv' : dis.length && !adv.length ? 'dis' : '';
    const notes = [
      ...adv.map(c => c + ': ventaja'),
      ...dis.map(c => c + ': desventaja'),
      adv.length && dis.length ? 'Ventaja y desventaja se anulan' : '',
      autoFail ? autoFail + ': falla automáticamente las salvaciones de FUE y DES' : '',
    ].filter(Boolean);
    return { mode, notes, autoFail };
  }

  // ---------- Dados de bonificación que da el DM (d4, d6…) ----------
  const KIND_LABEL = {
    any: 'cualquier tirada',
    check: 'pruebas de característica',
    attack: 'ataques',
    save: 'salvaciones',
  };
  function bonusScope(b) {
    if (b.kind === 'check' && b.skills?.length)
      return b.skills.map(id => R.skills.find(x => x[0] === id)?.[1] || id).join(', ');
    return KIND_LABEL[b.kind] || KIND_LABEL.any;
  }
  // Dados que sirven para esta tirada. kind: 'check' | 'save' | 'attack'; skill: id de habilidad si aplica.
  function bonusOptions(kind, skill = '') {
    return (state.bonusDice || []).filter(
      b =>
        b.kind === 'any' ||
        (b.kind === kind && (kind !== 'check' || !b.skills?.length || (skill && b.skills.includes(skill)))),
    );
  }
  function bonusFields(kind, skill) {
    const list = bonusOptions(kind, skill);
    return list.length
      ? `<fieldset class="bonus-dice"><legend>Dados del DM</legend>${list
          .map(
            b =>
              `<div class="bonus-die"><label class="check"><input type="checkbox" name="bonusDie" value="${esc(b.id)}">Sumar d${b.die}${b.reason ? ' · ' + esc(b.reason) : ''}</label><label class="physical-die"><span class="visually-hidden">Mi d${b.die}</span><input type="number" name="bonusOwn-${esc(b.id)}" min="1" max="${b.die}" inputmode="numeric" placeholder="d${b.die}" title="Si lo tiraste en la mesa"></label></div>`,
          )
          .join('')}<p class="small">Se gasta al usarlo. Si tiraste el dado en la mesa, anotalo al lado.</p></fieldset>`
      : '';
  }
  // Suma los dados del DM marcados. Devuelve { total, text, ids }.
  function readBonus(fd) {
    const ids = fd.getAll('bonusDie'),
      parts = [];
    for (const id of ids) {
      const b = (state.bonusDice || []).find(x => x.id === id);
      if (!b) continue;
      const own = fd.get('bonusOwn-' + id);
      let v;
      if (own !== null && own !== '') {
        v = Number(own);
        if (!Number.isInteger(v) || v < 1 || v > b.die) throw Error(`Tu d${b.die} va de 1 a ${b.die}.`);
      } else v = roll(b.die)[0];
      parts.push({ die: b.die, value: v });
    }
    return {
      total: parts.reduce((a, p) => a + p.value, 0),
      text: parts.map(p => ` + d${p.die} (${p.value})`).join(''),
      ids,
    };
  }
  const spendBonus = (s, ids) => {
    if (ids?.length) s.bonusDice = (s.bonusDice || []).filter(b => !ids.includes(b.id));
  };

  // Bloque reutilizable: ventaja, Inspiración del DM, dados del DM y dado físico.
  function d20Fields(mods, extra = '', ctx = {}) {
    return `${mods.notes.length ? `<p class="small condition-note">${esc(mods.notes.join(' · '))}</p>` : ''}<fieldset class="attack-adv"><legend>Tirada</legend>${[
      ['', 'Normal'],
      ['adv', 'Con ventaja'],
      ['dis', 'Con desventaja'],
    ]
      .map(
        ([v, l]) =>
          `<label class="check"><input type="radio" name="adv" value="${v}" ${mods.mode === v ? 'checked' : ''}>${l}</label>`,
      )
      .join(
        '',
      )}</fieldset>${state.heroicInspiration ? '<label class="check"><input type="checkbox" name="heroic">Usar mi Inspiración del DM (ventaja; se gasta)</label>' : ''}${ctx.kind ? bonusFields(ctx.kind, ctx.skill) : ''}${extra}<details class="physical-dice"><summary>Uso mis propios dados</summary><p class="small">Anotá el d20 que quedó (con ventaja o desventaja, el que conservás). La ficha suma tus bonos.</p>${field('Mi d20', 'myD20', '', 'number', 'min="1" max="20" inputmode="numeric"')}</details>`;
  }
  // Resuelve el d20 según el formulario. Devuelve { rolls, kept, physical, heroic }.
  function readD20(fd) {
    const own = fd.get('myD20');
    const heroic = fd.has('heroic');
    if (own !== null && own !== '') {
      const n = Number(own);
      if (!Number.isInteger(n) || n < 1 || n > 20) throw Error('Tu d20 va de 1 a 20.');
      return { rolls: [n], kept: n, physical: true, heroic };
    }
    let mode = fd.get('adv') || '';
    if (heroic) mode = mode === 'dis' ? '' : 'adv';
    const a = roll(20)[0],
      b = mode ? roll(20)[0] : null;
    return {
      rolls: b === null ? [a] : [a, b],
      kept: mode === 'adv' ? Math.max(a, b) : mode === 'dis' ? Math.min(a, b) : a,
      physical: false,
      heroic,
    };
  }
  const diceText = r =>
    (r.rolls.length > 1 ? `d20 ${r.rolls.join(' / ')} → ${r.kept}` : `d20 ${r.kept}`) +
    (r.physical ? ' (dado físico)' : '') +
    (r.heroic ? ' (Inspiración)' : '');

  // Diálogo de d20: pruebas, salvaciones, iniciativa, pedidos del DM.
  function d20({ title, label, bonus, kind = 'check', ability = '', skill = '', share = true, min = 0, onDone }) {
    const mods = conditionMods(state, kind, ability);
    modal(
      title,
      `<p>Bono: <b>${sign(bonus)}</b>${min ? ` · Lengua de plata: un d20 menor que ${min} cuenta como ${min}` : ''}</p>${d20Fields(mods, '', { kind: kind === 'death' ? '' : kind, skill })}${mods.autoFail ? '<p class="small">Podés registrar la falla sin tirar.</p>' : ''}`,
      fd => {
        const r = readD20(fd),
          extra = readBonus(fd);
        if (min && r.kept < min) r.kept = min;
        const total = r.kept + bonus + extra.total;
        commit(`${label}: ${diceText(r)} ${sign(bonus)}${extra.text} = ${total}`, s => {
          if (r.heroic) s.heroicInspiration = false;
          spendBonus(s, extra.ids);
        });
        if (share)
          TableUI.shareRoll({
            label: label + extra.text,
            rolls: r.rolls,
            bonus: bonus + extra.total,
            total,
            physical: r.physical,
            inspiration: r.heroic,
          });
        setTimeout(() =>
          RollFX.show({
            label,
            total,
            face: r.kept,
            detail: `${diceText(r)} ${sign(bonus)}${extra.text}`,
            crit: r.kept === 20,
            fumble: r.kept === 1,
          }),
        );
        onDone?.({ ...r, total });
      },
      'Tirar',
    );
  }

  function concentration() {
    const c = Combat.data(state),
      dc = c.checks[0];
    if (!state.concentration || !dc) throw Error('No hay una salvación de concentración pendiente.');
    d20({
      title: 'Salvación de concentración · CD ' + dc,
      label: 'Concentración (CD ' + dc + ')',
      bonus: R.saveBonus(state, 'con'),
      kind: 'save',
      ability: 'con',
      onDone: r =>
        setTimeout(() => {
          if (r.total >= dc) {
            commit('Salvación de concentración superada', s => Combat.data(s).checks.shift());
            toast('Mantenés la concentración (' + r.total + ').');
          } else {
            commit('Concentración perdida', s => {
              s.concentration = null;
              Combat.data(s).checks = [];
            });
            toast('Perdiste la concentración (' + r.total + ').');
          }
        }),
    });
  }

  function deathSave() {
    if (state.hp !== 0) throw Error('Las salvaciones de muerte se tiran a 0 PG.');
    d20({
      title: 'Salvación de muerte',
      label: 'Salvación de muerte',
      bonus: 0,
      kind: 'death',
      onDone: r =>
        setTimeout(() => {
          let msg;
          commit('Salvación de muerte: ' + r.kept, s => {
            if (r.kept === 20) {
              s.hp = 1;
              s.death = { success: 0, failure: 0 };
              s.conditions = s.conditions.filter(x => x !== 'Inconsciente');
              msg = '¡20 natural! Recuperás 1 PG y volvés en ti.';
            } else if (r.kept >= 10) {
              s.death.success = Math.min(3, s.death.success + 1);
              msg = s.death.success >= 3 ? 'Tres éxitos: estás estable.' : 'Éxito (' + s.death.success + '/3).';
            } else {
              s.death.failure = Math.min(3, s.death.failure + (r.kept === 1 ? 2 : 1));
              msg =
                s.death.failure >= 3
                  ? 'Tres fallos: tu personaje muere. Avisale al DM.'
                  : (r.kept === 1 ? '1 natural: dos fallos' : 'Fallo') + ' (' + s.death.failure + '/3).';
            }
          });
          toast(msg);
        }),
    });
  }

  // ---------- Conjuros: ataque, salvación y daño o curación ----------
  function spellInfo(sp, slot) {
    const all = [sp.brief, sp.text, sp.srdOriginal].filter(Boolean).join('\n');
    const m =
      /(\d+)d(\d+)/.exec(sp.brief || '') ||
      /(\d+)d(\d+)/.exec(sp.text || '') ||
      /(\d+)d(\d+)/.exec(sp.srdOriginal || '');
    const heal = /recupera|regains?/i.test(sp.brief || sp.text || '') && !(sp.damageTypes || []).length;
    let count = m ? Number(m[1]) : 0,
      notes = [];
    const sides = m ? Number(m[2]) : 0;
    const total = R.totalLevel ? R.totalLevel(state) : state.level;
    if (sp.level === 0 && m) {
      const tier = 1 + (total >= 5) + (total >= 11) + (total >= 17);
      if (/rayo|beam/i.test(all)) notes.push(`Nivel ${total}: ${tier} rayo(s), cada uno con su propio ataque.`);
      else if (tier > 1) {
        count *= tier;
        notes.push(`Truco escalado por nivel de personaje ${total}.`);
      }
    }
    const up = /increases by (\d+)d(\d+) for each slot level above/i.exec(sp.srdOriginal || '');
    if (up && slot > sp.level && Number(up[2]) === sides) {
      count += Number(up[1]) * (slot - sp.level);
      notes.push(`Espacio de nivel ${slot}: +${Number(up[1]) * (slot - sp.level)}d${sides}.`);
    }
    return {
      attack: (sp.attackKind || []).length > 0,
      save: ABILITY_ES[(sp.saveAbility || [])[0]] || '',
      saveName: (sp.saveAbility || [])[0] || '',
      dice: m ? count + 'd' + sides : '',
      heal,
      addMod: /modificador de lanzamiento|spellcasting ability modifier/i.test(all),
      types: (sp.damageTypes || []).join(', '),
      notes,
    };
  }
  const rollable = sp => {
    const i = spellInfo(sp, sp.level);
    return i.attack || i.save || i.dice;
  };

  let spellSession = null;
  function spell(sp, slot = sp.level) {
    const info = spellInfo(sp, slot),
      st = R.stats(state),
      ability = Classes.casting(state).ability,
      mod = st.mods[ability];
    spellSession = { sp, info, crit: false };
    const mods = conditionMods(state, 'attack');
    modal(
      sp.name + (slot > sp.level ? ' · nivel ' + slot : ''),
      `${info.attack ? `<h3>Ataque de conjuro ${sign(st.attack)}</h3>${d20Fields(mods, '', { kind: 'attack' })}<div class="actions">${button('Tirar ataque', 'spell-roll-attack', '')}</div>` : ''}
      ${info.save ? `<p class="banner">Cada objetivo tira una salvación de <b>${esc(info.saveName)}</b> contra tu CD <b>${st.dc}</b>.${/mitad|half/i.test(sp.text || sp.srdOriginal || '') ? ' Si la supera, suele recibir la mitad.' : ''}</p>` : ''}
      ${
        info.dice || info.attack || info.save
          ? `<h3 class="section-space">${info.heal ? 'Curación' : 'Daño'}${info.types ? ' · ' + esc(info.types) : ''}</h3><div class="form-grid">${field('Dados', 'spellDice', info.dice, 'text', 'maxlength="20" placeholder="2d8"')}<label class="check"><input type="checkbox" name="spellMod" ${info.addMod ? 'checked' : ''}>Sumar modificador de lanzamiento (${sign(mod)})</label></div>${info.notes.length ? `<p class="small">${esc(info.notes.join(' '))}</p>` : ''}<details class="physical-dice"><summary>Uso mis propios dados</summary>${field('Suma de mis dados', 'myDamage', '', 'number', 'min="0" max="999" inputmode="numeric"')}</details><div class="actions">${button(info.heal ? 'Tirar curación' : 'Tirar daño', 'spell-roll-damage', info.attack ? 'secondary' : '')}</div>`
          : ''
      }
      <div class="attack-log" id="attack-log" aria-live="polite"><p class="small muted">Revisá los dados: salen del texto del conjuro y podés corregirlos.</p></div>`,
      null,
    );
  }
  function logLine(html, cls = '') {
    const el = document.getElementById('attack-log');
    if (!el) return;
    if (el.querySelector('.muted')) el.innerHTML = '';
    el.insertAdjacentHTML('afterbegin', `<p class="${cls}">${html}</p>`);
  }
  function spellAttack() {
    const { sp } = spellSession,
      st = R.stats(state),
      fd = new FormData(document.getElementById('dialog-form')),
      r = readD20(fd),
      extra = readBonus(fd),
      total = r.kept + st.attack + extra.total;
    spellSession.crit = r.kept === 20;
    const own = document.querySelector('#dialog-form [name=myD20]');
    if (own) own.value = '';
    const crit = r.kept === 20,
      miss = r.kept === 1;
    logLine(
      `<b>Ataque:</b> ${diceText(r)} ${sign(st.attack)}${extra.text} = <b>${total}</b>${crit ? ' · <b>¡Crítico!</b> (el daño duplica dados)' : miss ? ' · Pifia: falla' : ''}`,
      crit ? 'crit' : miss ? 'fumble' : '',
    );
    RollFX.show({
      label: 'Ataque · ' + sp.name,
      total,
      face: r.kept,
      detail: diceText(r) + ' ' + sign(st.attack) + extra.text,
      crit,
      fumble: miss,
    });
    commit(`${sp.name}: ataque ${diceText(r)} ${sign(st.attack)}${extra.text} = ${total}`, s => {
      if (r.heroic) s.heroicInspiration = false;
      spendBonus(s, extra.ids);
    });
    document.querySelectorAll('#dialog-form [name=bonusDie]:checked').forEach(x => x.closest('.bonus-die').remove());
    TableUI.shareRoll({
      label: 'Ataque con ' + sp.name + (crit ? ' (crítico)' : ''),
      rolls: r.rolls,
      bonus: st.attack,
      total,
      physical: r.physical,
    });
  }
  function spellDamage() {
    const { sp, info } = spellSession,
      fd = new FormData(document.getElementById('dialog-form')),
      st = R.stats(state),
      mod = fd.has('spellMod') ? st.mods[Classes.casting(state).ability] : 0;
    const own = fd.get('myDamage');
    let rolls = [],
      sum;
    if (own !== null && own !== '') {
      sum = Number(own);
      if (!Number.isInteger(sum) || sum < 0 || sum > 999) throw Error('Revisá la suma de tus dados.');
      document.querySelector('#dialog-form [name=myDamage]').value = '';
    } else {
      const m = /^\s*(\d+)d(\d+)\s*$/.exec(String(fd.get('spellDice') || ''));
      if (!m) throw Error('Escribí los dados como «2d8».');
      const n = Number(m[1]) * (spellSession.crit ? 2 : 1);
      if (n > 60) throw Error('Demasiados dados.');
      rolls = roll(Number(m[2]), n);
      sum = rolls.reduce((a, b) => a + b, 0);
    }
    const total = Math.max(0, sum + mod),
      what = info.heal ? 'Curación' : 'Daño';
    logLine(
      `<b>${what}${spellSession.crit ? ' crítico' : ''}:</b> ${rolls.length ? rolls.join('+') : 'dados físicos ' + sum}${mod ? ' ' + sign(mod) : ''} = <b>${total}</b>${info.types ? ' ' + esc(info.types) : ''}`,
      'damage',
    );
    RollFX.show({
      label: what + ' · ' + sp.name,
      total,
      face: info.heal ? '✚' : '✦',
      detail: rolls.length ? rolls.join(' + ') + (mod ? ' ' + sign(mod) : '') : 'dados físicos',
      crit: spellSession.crit,
    });
    commit(`${sp.name}: ${what.toLowerCase()} ${total}${rolls.length ? '' : ' (dados físicos)'}`, () => {});
    TableUI.shareRoll({
      label: what + ' de ' + sp.name + (spellSession.crit ? ' (crítico)' : ''),
      rolls,
      bonus: mod,
      total,
      physical: !rolls.length,
    });
    spellSession.crit = false;
  }

  function install() {
    Object.assign(actions, {
      roll: e => {
        if (
          e.dataset.label === 'Iniciativa' &&
          state.level >= 20 &&
          state.inspirationSpent === R.stats(state).inspirationMax
        )
          commit('Inspiración superior: recuperada una Inspiración al tirar iniciativa', s => s.inspirationSpent--);
        d20({
          title: e.dataset.label,
          label: e.dataset.label,
          bonus: Number(e.dataset.bonus),
          kind: e.dataset.label === 'Iniciativa' ? 'check' : e.dataset.kind || 'check',
          ability: e.dataset.ability || '',
        });
      },
      'skill-roll': e => {
        const id = e.dataset.id,
          name = R.skills.find(x => x[0] === id)[1];
        const silver = state.level >= 3 && state.subclass === 'eloquence' && ['persuasion', 'deception'].includes(id);
        d20({
          title: name,
          label: name,
          bonus: R.skillBonus(state, id),
          kind: 'check',
          skill: id,
          min: silver ? 10 : 0,
        });
      },
      'roll-save': e =>
        d20({
          title: 'Salvación de ' + R.attrs[e.dataset.ability],
          label: 'Salvación de ' + R.attrs[e.dataset.ability],
          bonus: R.saveBonus(state, e.dataset.ability),
          kind: 'save',
          ability: e.dataset.ability,
        }),
      'concentration-roll': concentration,
      'death-roll': deathSave,
      'bonus-discard': e =>
        commit('Dado del DM descartado', s => {
          s.bonusDice = (s.bonusDice || []).filter(b => b.id !== e.dataset.id);
        }),
      'heroic-toggle': () =>
        commit(state.heroicInspiration ? 'Inspiración del DM usada' : 'Inspiración del DM anotada', s => {
          s.heroicInspiration = !s.heroicInspiration;
        }),
      'spell-roll': e => spell(spellById(e.dataset.id)),
      'spell-roll-attack': spellAttack,
      'spell-roll-damage': spellDamage,
    });
  }
  return {
    conditionMods,
    d20,
    d20Fields,
    readD20,
    readBonus,
    spendBonus,
    bonusScope,
    diceText,
    spell,
    spellInfo,
    rollable,
    install,
  };
})();
