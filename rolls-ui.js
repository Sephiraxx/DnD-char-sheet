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
  // sp.srd: pistas sacadas del texto SRD en inglés al generar el catálogo (dados, mejora por espacio, dardos…).
  const halfOnSave = sp => /mitad|half/i.test(sp.text || '') || !!sp.srd?.half;
  function spellInfo(sp, slot) {
    const all = [sp.brief, sp.text].filter(Boolean).join('\n'),
      hint = sp.srd || {};
    // «1d4 + 1»: el bono fijo acompaña a los dados (no confundir con «+ 4d8» ni «+ tu modificador»).
    const DICE = /(\d+)d(\d+)(?:\s*\+\s*(\d+)(?![\dd]))?/;
    const m = DICE.exec(sp.brief || '') || DICE.exec(sp.text || '') || DICE.exec(hint.dice || '');
    const heal = /recupera|regains?/i.test(sp.brief || sp.text || '') && !(sp.damageTypes || []).length;
    let count = m ? Number(m[1]) : 0,
      notes = [];
    const sides = m ? Number(m[2]) : 0;
    let flat = m ? Number(m[3] || 0) : 0;
    const total = R.totalLevel ? R.totalLevel(state) : state.level;
    if (sp.level === 0 && m) {
      const tier = 1 + (total >= 5) + (total >= 11) + (total >= 17);
      if (/rayo|beam/i.test(all) || hint.beam)
        notes.push(`Nivel ${total}: ${tier} rayo(s), cada uno con su propio ataque.`);
      else if (tier > 1) {
        count *= tier;
        notes.push(`Truco escalado por nivel de personaje ${total}.`);
      }
    }
    // Proyectil mágico: tres dardos y uno más por cada nivel de espacio superior.
    if (m && hint.darts) {
      const darts = 3 + Math.max(0, slot - sp.level);
      count *= darts;
      flat *= darts;
      notes.push(
        `${darts} dardos de 1d${sides}${m[3] ? ' + ' + m[3] : ''} (todos al mismo objetivo; si los repartís, ajustá el daño).`,
      );
    }
    const up = hint.up;
    if (up && slot > sp.level && up[1] === sides) {
      count += up[0] * (slot - sp.level);
      notes.push(`Espacio de nivel ${slot}: +${up[0] * (slot - sp.level)}d${sides}.`);
    }
    return {
      attack: (sp.attackKind || []).length > 0,
      save: ABILITY_ES[(sp.saveAbility || [])[0]] || '',
      saveName: (sp.saveAbility || [])[0] || '',
      // Solo cuentan como daño los dados de conjuros con tipo de daño (o curación): el 1d4 de Bendecir es un bono.
      dice: m && (heal || (sp.damageTypes || []).length) ? count + 'd' + sides + (flat ? '+' + flat : '') : '',
      heal,
      addMod: /modificador de lanzamiento|spellcasting ability modifier/i.test(all) || !!hint.mod,
      types: (sp.damageTypes || []).join(', '),
      notes,
    };
  }
  const isBuff = sp => {
    const rounds = Effects.roundsFrom(sp.duration);
    return (
      (rounds === null || rounds > 1) &&
      /criatura|aliad|creature|ally|willing|dispuest/i.test(sp.text || sp.brief || '')
    );
  };
  const rollable = sp => {
    const i = spellInfo(sp, sp.level);
    return Boolean(i.attack || i.save || i.dice || (TableUI.link() && isBuff(sp)));
  };
  // Objetivos del conjuro: criaturas del encuentro, aliados y vos.
  function targetFields(info, sp) {
    const t = TableUI.targets(),
      who = (value, label, checked = false) =>
        `<label class="check"><input type="checkbox" name="who" value="${esc(value)}" ${checked ? 'checked' : ''}>${esc(label)}</label>`;
    if (info.attack && t.monsters.length)
      return select(
        'Objetivo',
        'target',
        [
          ...t.monsters.map(m => [m.id, m.name + ' · ' + TableUI.statusLabel(m.status)]),
          ['', 'Otro objetivo (lo resuelve la mesa)'],
        ],
        t.monsters[0].id,
      );
    // Conjuros de salvación (también de área): criaturas, y aliados o vos si quedan dentro.
    if (info.save && (t.monsters.length || t.allies.length))
      return `${t.monsters.length ? `<fieldset class="target-list"><legend>Criaturas (el DM tira sus salvaciones)</legend>${t.monsters.map(m => who('mon:' + m.id, m.name + ' · ' + TableUI.statusLabel(m.status))).join('')}</fieldset>` : ''}<fieldset class="target-list"><legend>También en el área (cada uno tira su salvación)</legend>${who('self', 'Vos (' + state.name + ')')}${t.allies.map(a => who('pc:' + a.characterId, a.name)).join('')}</fieldset>`;
    // Daño automático (Proyectil mágico…): se elige la criatura que lo recibe.
    if (info.dice && !info.heal && !info.attack && !info.save && t.monsters.length)
      return select(
        'Objetivo del daño',
        'target',
        [
          ...t.monsters.map(m => [m.id, m.name + ' · ' + TableUI.statusLabel(m.status)]),
          ['', 'Otro objetivo (lo resuelve la mesa)'],
        ],
        t.monsters[0].id,
      );
    if (info.heal || (!info.attack && !info.save && TableUI.link() && isBuff(sp)))
      return `<fieldset class="target-list"><legend>${info.heal ? 'A quién curás' : 'A quién afecta'}</legend>${who('self', 'Vos (' + state.name + ')', true)}${t.allies.map(a => who('pc:' + a.characterId, a.name)).join('')}</fieldset>`;
    return '';
  }
  const chosen = fd => fd.getAll('who');

  let spellSession = null;
  function spell(sp, slot = sp.level) {
    const info = spellInfo(sp, slot),
      st = R.stats(state),
      ability = Classes.casting(state).ability,
      mod = st.mods[ability];
    spellSession = { sp, info, crit: false, hitTarget: null, slot };
    const mods = conditionMods(state, 'attack');
    modal(
      sp.name + (slot > sp.level ? ' · nivel ' + slot : ''),
      `${targetFields(info, sp)}${!info.dice && !info.attack && !info.save ? `<p class="small">${esc(sp.brief || '')}</p><div class="actions">${button('Aplicar efecto', 'spell-apply-effect', '')}</div>` : ''}${info.attack ? `<h3>Ataque de conjuro ${sign(st.attack)}</h3>${d20Fields(mods, '', { kind: 'attack' })}<div class="actions">${button('Tirar ataque', 'spell-roll-attack', '')}</div>` : ''}
      ${info.save ? `<p class="banner">Cada objetivo tira una salvación de <b>${esc(info.saveName)}</b> contra tu CD <b>${st.dc}</b>.${halfOnSave(sp) ? ' Si la supera, suele recibir la mitad.' : ''}</p>` : ''}
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
    let line = `<b>Ataque:</b> ${diceText(r)} ${sign(st.attack)}${extra.text} = <b>${total}</b>${crit ? ' · <b>¡Crítico!</b> (el daño duplica dados)' : miss ? ' · Pifia: falla' : ''}`;
    const target = fd.get('target') || '';
    spellSession.hitTarget = null;
    const verdict = target
      ? Cloud.resolveAttack(target, total, r.kept, 'Ataque con ' + sp.name, state.name).catch(err => {
          toast(err.message);
          return null;
        })
      : Promise.resolve(null);
    const landedAttack = RollFX.show({
      label: 'Ataque · ' + sp.name,
      total,
      face: r.kept,
      detail: diceText(r) + ' ' + sign(st.attack) + extra.text,
      crit,
      fumble: miss,
    });
    Promise.all([landedAttack, verdict]).then(([, out]) => {
      if (out) {
        line += out.hit ? ` → <b>impacta a ${esc(out.name)}</b>` : ` → <b>falla contra ${esc(out.name)}</b>`;
        spellSession.hitTarget = out.hit ? target : null;
      }
      logLine(line, crit ? 'crit' : miss || (out && !out.hit) ? 'fumble' : '');
    });
    commit(`${sp.name}: ataque ${diceText(r)} ${sign(st.attack)}${extra.text} = ${total}`, s => {
      if (r.heroic) s.heroicInspiration = false;
      spendBonus(s, extra.ids);
    });
    document.querySelectorAll('#dialog-form [name=bonusDie]:checked').forEach(x => x.closest('.bonus-die').remove());
    if (!target)
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
    const own = fd.get('myDamage'),
      m = /^\s*(\d+)d(\d+)\s*(?:\+\s*(\d+))?\s*$/.exec(String(fd.get('spellDice') || ''));
    // El bono fijo de los dados («3d4+3») también se suma a los dados físicos.
    const flat = Number(m?.[3] || 0);
    let rolls = [],
      sum;
    if (own !== null && own !== '') {
      sum = Number(own);
      if (!Number.isInteger(sum) || sum < 0 || sum > 999) throw Error('Revisá la suma de tus dados.');
      document.querySelector('#dialog-form [name=myDamage]').value = '';
    } else {
      if (!m) throw Error('Escribí los dados como «2d8» o «3d4+3».');
      const n = Number(m[1]) * (spellSession.crit ? 2 : 1);
      if (n > 60) throw Error('Demasiados dados.');
      rolls = roll(Number(m[2]), n);
      sum = rolls.reduce((a, b) => a + b, 0);
    }
    const dice = (rolls.length ? rolls.join('+') : 'dados físicos ' + sum) + (flat ? ' + ' + flat : '');
    sum += flat;
    const total = Math.max(0, sum + mod),
      what = info.heal ? 'Curación' : 'Daño';
    let line = `<b>${what}${spellSession.crit ? ' crítico' : ''}:</b> ${dice}${mod ? ' ' + sign(mod) : ''} = <b>${total}</b>${info.types ? ' ' + esc(info.types) : ''}`;
    const landedDamage = RollFX.show({
      label: what + ' · ' + sp.name,
      total,
      face: info.heal ? '✚' : '✦',
      detail: dice + (mod ? ' ' + sign(mod) : ''),
      crit: spellSession.crit,
    });
    const applied = applySpellResult(fd, total).catch(err => {
      toast(err.message);
      return '';
    });
    Promise.all([landedDamage, applied]).then(([, note]) => logLine(line + (note || ''), 'damage'));
    commit(`${sp.name}: ${what.toLowerCase()} ${total}${rolls.length ? '' : ' (dados físicos)'}`, () => {});
    TableUI.shareRoll({
      label: what + ' de ' + sp.name + (spellSession.crit ? ' (crítico)' : ''),
      rolls,
      bonus: mod + flat,
      total,
      physical: !rolls.length,
    });
    spellSession.crit = false;
  }

  // Aplica el resultado del conjuro: curación a aliados, daño a la criatura impactada o salvaciones al DM.
  async function applySpellResult(fd, total) {
    const { sp, info } = spellSession,
      st = R.stats(state),
      who = chosen(fd),
      t = TableUI.targets();
    if (info.heal && who.length) {
      const names = [];
      for (const w of who) {
        if (w === 'self') {
          commit('Curación propia: ' + sp.name + ' +' + total, s => {
            s.hp = Math.min(R.stats(s).maxHP, (s.hp ?? 0) + total);
            if (s.hp > 0) {
              s.death = { success: 0, failure: 0 };
              s.conditions = s.conditions.filter(x => x !== 'Inconsciente');
            }
          });
          names.push('vos');
        } else {
          const id = w.slice(3);
          await TableUI.sendTo(id, 'heal', { amount: total, source: sp.name });
          names.push(t.allies.find(a => a.characterId === id)?.name || 'aliado');
        }
      }
      return ` → curaste a ${esc(names.join(', '))}`;
    }
    const autoTarget = !info.attack && !info.save && !info.heal ? fd.get('target') : '';
    if (spellSession.hitTarget || autoTarget) {
      const out = await Cloud.damageCombatant(
        spellSession.hitTarget || autoTarget,
        total,
        'Daño con ' + sp.name,
        state.name,
      );
      spellSession.hitTarget = null;
      return ` → ${esc(out.name)}: <b>${esc(TableUI.statusLabel(out.status))}</b>`;
    }
    const foes = who
      .filter(w => w.startsWith('mon:'))
      .map(w => t.monsters.find(m => m.id === w.slice(4)))
      .filter(Boolean);
    const allies = who
      .filter(w => w.startsWith('pc:'))
      .map(w => t.allies.find(a => a.characterId === w.slice(3)))
      .filter(Boolean);
    if (info.save && (foes.length || allies.length || who.includes('self'))) {
      const l = TableUI.link();
      const request = {
        caster: state.name,
        spell: sp.name,
        ability: info.save,
        abilityName: info.saveName,
        dc: st.dc,
        half: halfOnSave(sp),
        damage: total,
        types: info.types,
      };
      const notes = [];
      if (foes.length) {
        await Cloud.post(l.campaignId, 'creature-save', {
          ...request,
          characterId: l.characterId,
          targets: foes.map(f => ({ id: f.id, name: f.name })),
        });
        notes.push('el DM tira las salvaciones de ' + foes.map(f => f.name).join(', '));
      }
      // Aliados alcanzados: cada ficha recibe el pedido y aplica su propio daño.
      if (allies.length) {
        try {
          for (const a of allies) await TableUI.sendTo(a.characterId, 'area-save', request);
          notes.push(allies.map(a => a.name).join(', ') + ' tiran su salvación');
        } catch (err) {
          notes.push('no se pudo avisar a los aliados (' + err.message + ')');
        }
      }
      // Vos dentro del área: tu propia salvación al cerrar el registro.
      if (who.includes('self')) {
        setTimeout(() => TableUI.areaSave({ id: 0, payload: request }, true), 900);
        notes.push('vos también salvás');
      }
      return ' → ' + esc(notes.join(' · '));
    }
    return '';
  }
  // Conjuros sin dados (Bendición…): efecto con duración para cada objetivo elegido.
  async function applyEffect() {
    const { sp } = spellSession,
      fd = new FormData(document.getElementById('dialog-form')),
      who = chosen(fd),
      t = TableUI.targets(),
      rounds = Effects.roundsFrom(sp.duration);
    if (!who.length) throw Error('Elegí al menos un objetivo.');
    const names = [],
      l = TableUI.link(),
      // Con concentración, el efecto de los aliados queda ligado a la tuya.
      link = l && sp.concentration ? l.characterId + ':' + sp.id : null,
      allies = who.filter(w => w !== 'self').map(w => w.slice(3));
    if (link && allies.length && state.concentration === sp.id)
      commit('Concentración compartida: ' + sp.name, s => {
        s.sharedConcentration = { spell: sp.id, name: sp.name + ' (de ' + state.name + ')', targets: allies };
      });
    for (const w of who)
      if (w === 'self') {
        commit('Efecto: ' + sp.name, s =>
          Effects.add(s, { name: sp.name, rounds: rounds || null, concentration: sp.concentration ? sp.id : null }),
        );
        names.push('vos');
      } else {
        const id = w.slice(3);
        await TableUI.sendTo(id, 'effect', {
          name: sp.name + ' (de ' + state.name + ')',
          rounds: rounds || null,
          from: state.name,
          ...(link ? { link } : {}),
        });
        names.push(t.allies.find(a => a.characterId === id)?.name || 'aliado');
      }
    logLine(
      `<b>${esc(sp.name)}</b> aplicado a ${esc(names.join(', '))}${rounds ? ' · ' + esc(Effects.remaining({ rounds })) : ''}.`,
      'damage',
    );
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
      'spell-apply-effect': () => applyEffect().catch(err => toast(err.message)),
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
