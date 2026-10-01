/* Monstruos del SRD para el DM: elegir, sumar a la iniciativa, atacar a la party y medir la dificultad.
   Usa las utilidades de dm.js (modal, field, select, button, toast, send, tracker…). */
const MonsterUI = (() => {
  'use strict';
  const ABIL = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  const ABIL_ES = {
    str: 'Fuerza',
    dex: 'Destreza',
    con: 'Constitución',
    int: 'Inteligencia',
    wis: 'Sabiduría',
    cha: 'Carisma',
  };
  const mod = n => Math.floor((n - 10) / 2);
  const crText = cr => (cr === 0.125 ? '1/8' : cr === 0.25 ? '1/4' : cr === 0.5 ? '1/2' : String(cr));
  let loading = null,
    query = '',
    crMax = '',
    panel = null; // ataque abierto: { entryId, action, last }

  function load() {
    if (window.MonsterData) return Promise.resolve();
    return (loading ||= new Promise((ok, fail) => {
      const s = document.createElement('script');
      s.src = './monsters-data.js';
      s.onload = ok;
      s.onerror = () => {
        loading = null;
        fail(Error('No se pudieron cargar los monstruos. Revisá tu conexión.'));
      };
      document.head.append(s);
    }));
  }
  const byId = id => window.MonsterData?.find(m => m.id === id);
  function rollDice(expr) {
    const m = /^(\d+)d(\d+)([+-]\d+)?$/.exec(String(expr).replace(/\s/g, ''));
    if (!m) return { rolls: [], total: Number(expr) || 0, mod: 0 };
    const rolls = Array.from({ length: Number(m[1]) }, () => {
      const a = new Uint32Array(1),
        sides = Number(m[2]),
        lim = Math.floor(4294967296 / sides) * sides;
      let x;
      do x = crypto.getRandomValues(a)[0];
      while (x >= lim);
      return (x % sides) + 1;
    });
    const k = Number(m[3] || 0);
    return { rolls, mod: k, total: rolls.reduce((a, b) => a + b, 0) + k, n: Number(m[1]), sides: Number(m[2]) };
  }

  // ---------- Dificultad del encuentro (DMG 2014, p. 82) ----------
  const THRESHOLDS = [
    [25, 50, 75, 100],
    [50, 100, 150, 200],
    [75, 150, 225, 400],
    [125, 250, 375, 500],
    [250, 500, 750, 1100],
    [300, 600, 900, 1400],
    [350, 750, 1100, 1700],
    [450, 900, 1400, 2100],
    [550, 1100, 1600, 2400],
    [600, 1200, 1900, 2800],
    [800, 1600, 2400, 3600],
    [1000, 2000, 3000, 4500],
    [1100, 2200, 3400, 5100],
    [1250, 2500, 3800, 5700],
    [1400, 2800, 4300, 6400],
    [1600, 3200, 4800, 7200],
    [2000, 3900, 5900, 8800],
    [2100, 4200, 6300, 9500],
    [2400, 4900, 7300, 10900],
    [2800, 5700, 8500, 12700],
  ];
  const LADDER = [0.5, 1, 1.5, 2, 2.5, 3, 4, 5];
  function difficulty(t) {
    const monsters = t.entries
      .filter(e => e.monsterId && e.hp !== 0)
      .map(e => byId(e.monsterId))
      .filter(Boolean);
    const levels = (party?.characters || []).map(c => PV.summarize(c.data).level || 1);
    if (!monsters.length || !levels.length) return null;
    const xp = monsters.reduce((a, m) => a + (m.xp || 0), 0),
      n = monsters.length;
    let step = n === 1 ? 1 : n === 2 ? 2 : n <= 6 ? 3 : n <= 10 ? 4 : n <= 14 ? 5 : 6;
    if (levels.length < 3) step++;
    if (levels.length >= 6) step--;
    const adjusted = Math.round(xp * LADDER[Math.max(0, Math.min(7, step))]);
    const sums = [0, 1, 2, 3].map(i => levels.reduce((a, l) => a + THRESHOLDS[Math.min(20, l) - 1][i], 0));
    const label =
      adjusted >= sums[3]
        ? 'Mortal'
        : adjusted >= sums[2]
          ? 'Difícil'
          : adjusted >= sums[1]
            ? 'Mediano'
            : adjusted >= sums[0]
              ? 'Fácil'
              : 'Trivial';
    return { label, xp, adjusted, each: Math.floor(xp / levels.length), sums };
  }
  function difficultyLine(t) {
    if (!window.MonsterData) return '';
    const d = difficulty(t);
    return d
      ? `<p class="small difficulty ${esc(d.label.toLowerCase())}"><b>Dificultad: ${d.label}</b> · ${d.adjusted} XP ajustado (${d.xp} XP, ${d.each} por personaje). Umbrales: ${d.sums.join(' / ')}.</p>`
      : '';
  }

  // ---------- Elegir monstruos ----------
  // target: id de un encuentro preparado (las criaturas se guardan ahí y no van a la iniciativa).
  let target = null;
  async function picker(prepId = null) {
    await load();
    target = prepId;
    modal(
      prepId ? 'Agregar a «' + (Encounters.get(prepId)?.name || 'encuentro') + '»' : 'Agregar criaturas',
      `<div class="form-grid">${field('Buscar', 'q', query, 'search', 'id="monster-q" placeholder="goblin, dragon, zombie…" autocomplete="off"')}${select(
        'Desafío hasta',
        'cr',
        [['', 'Cualquiera'], ...[0.25, 0.5, 1, 2, 3, 4, 5, 8, 10, 15, 20, 30].map(c => [c, 'VD ' + crText(c)])],
        crMax,
      )}</div><div id="monster-results" class="party-list monster-results"></div><details class="battle-rule"><summary>Criatura propia (sin estadísticas del SRD)</summary><p class="small">Usá «Criatura propia» en la iniciativa.</p></details>`,
      null,
    );
    drawResults();
  }
  function drawResults() {
    const box = document.getElementById('monster-results');
    if (!box) return;
    const q = query.trim().toLowerCase();
    const list = MonsterData.filter(
      m => (!q || m.name.toLowerCase().includes(q) || m.type.includes(q)) && (crMax === '' || m.cr <= Number(crMax)),
    )
      .sort((a, b) => a.cr - b.cr || a.name.localeCompare(b.name))
      .slice(0, 40);
    box.innerHTML = list.length
      ? list
          .map(
            m =>
              `<div class="list-row"><div><b>${esc(m.name)}</b><p class="small muted">VD ${crText(m.cr)} · ${esc(m.size)} ${esc(m.type)} · CA ${m.ac} · ${m.hp} PG</p></div><div class="actions">${button('Ver', 'monster-view', 'text-btn', `data-id="${m.id}"`)}${button('Agregar', 'monster-add', '', `data-id="${m.id}"`)}</div></div>`,
          )
          .join('')
      : '<p class="muted">Sin resultados.</p>';
  }
  function add(id) {
    const m = byId(id);
    modal(
      'Agregar ' + m.name,
      `<div class="form-grid">${field('Cantidad', 'count', 1, 'number', 'min="1" max="20" required')}${select(
        'PG',
        'hpMode',
        [
          ['avg', 'Promedio (' + m.hp + ')'],
          ['roll', 'Tirar ' + m.hd],
        ],
        'avg',
      )}</div>${
        target
          ? '<p class="small">Se guardan en el encuentro preparado; nadie las ve hasta que lo lanzás.</p>'
          : `<label class="check"><input type="checkbox" name="hidden">Agregarlas ocultas (los jugadores no las ven hasta que las reveles)</label><p class="small">La iniciativa se tira para cada una (d20 ${sign(mod(m.ab[1]))}); podés corregirla con «Init».</p>`
      }`,
      async fd => {
        const n = int(fd, 'count', 1, 20),
          saves = saveBonuses(m),
          hps = Array.from({ length: n }, () =>
            fd.get('hpMode') === 'roll' ? Math.max(1, rollDice(m.hd).total) : m.hp,
          );
        if (target) {
          Encounters.addMonsters(
            target,
            hps.map(hp => ({ name: m.name, monsterId: m.id, hp, ac: m.ac, saves, initMod: mod(m.ab[1]) })),
          );
          toast(`${n} × ${m.name} en «${Encounters.get(target)?.name}».`);
          return;
        }
        const names = await claimNames(m.name, n);
        for (let i = 0; i < n; i++)
          await Cloud.addCombatant(
            current,
            {
              kind: 'monster',
              name: names[i],
              init: d20() + mod(m.ab[1]),
              tiebreak: mod(m.ab[1]),
              hidden: fd.has('hidden'),
            },
            { hp: hps[i], max_hp: hps[i], ac: m.ac, saves, monster_id: m.id },
          );
        await refresh();
        toast(`${n} × ${m.name} en la iniciativa${fd.has('hidden') ? ' (ocultas)' : ''}.`);
      },
      'Agregar',
    );
  }

  // Numeración continua: si ya hay «Goblin», pasa a «Goblin 1» y los nuevos siguen desde ahí.
  async function claimNames(base, n) {
    const number = name =>
        name === base
          ? 0
          : name.startsWith(base + ' ') && /^\d+$/.test(name.slice(base.length + 1))
            ? Number(name.slice(base.length + 1))
            : -1,
      taken = tracker().entries.filter(e => e.kind === 'monster' && number(e.name) >= 0),
      plain = taken.filter(e => e.name === base);
    let next = Math.max(0, ...taken.map(e => number(e.name))) + 1;
    if (taken.length + n <= 1) return [base];
    for (const e of plain) await Cloud.updateCombatant(e.id, { name: `${base} ${next++}` });
    return Array.from({ length: n }, () => `${base} ${next++}`);
  }
  function saveBonuses(m) {
    const out = Object.fromEntries(ABIL.map((a, i) => [a, mod(m.ab[i])]));
    const names = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' };
    for (const part of String(m.saves || '').split(',')) {
      const x = /([A-Z]{3})\s*\+(\d+)/i.exec(part.trim());
      if (!x) continue;
      const key = Object.keys(names).find(k => names[k] === x[1].toUpperCase());
      if (key) out[key] = Number(x[2]);
    }
    return out;
  }

  // ---------- Bloque de estadísticas ----------
  function statBlock(m, entry = null) {
    const line = (k, v) => (v ? `<p class="small"><b>${k}</b> ${esc(v)}</p>` : '');
    const act = (a, kind) =>
      `<div class="feature monster-action"><p><b>${esc(a.n)}.</b> ${esc(a.d)}</p>${
        entry && (a.atk !== undefined || a.dc || a.dmg)
          ? `<div class="actions">${a.atk !== undefined ? button('Atacar', 'monster-attack', '', `data-entry="${entry.id}" data-kind="${kind}" data-name="${esc(a.n)}"`) : ''}${a.dc ? button('Pedir salvación', 'monster-save', 'secondary', `data-entry="${entry.id}" data-kind="${kind}" data-name="${esc(a.n)}"`) : ''}${a.atk === undefined && a.dmg ? button('Tirar daño', 'monster-attack', 'secondary', `data-entry="${entry.id}" data-kind="${kind}" data-name="${esc(a.n)}" data-noattack="1"`) : ''}</div>`
          : ''
      }</div>`;
    return `<p class="small muted">${esc(m.size)} ${esc(m.type)}, ${esc(m.align)} · VD ${crText(m.cr)} (${m.xp} XP)</p>
      <p><b>CA</b> ${m.ac} · <b>PG</b> ${entry ? (entry.hp ?? '—') + ' / ' + entry.max : m.hp + ' (' + esc(m.hd) + ')'} · <b>Velocidad</b> ${esc(m.speed)}</p>
      <dl class="party-stats monster-abilities">${ABIL.map((a, i) => `<div><dt>${a.toUpperCase()}</dt><dd>${m.ab[i]} (${sign(mod(m.ab[i]))})</dd></div>`).join('')}</dl>
      ${line('Salvaciones', m.saves)}${line('Habilidades', m.skills)}${line('Vulnerable a', m.vuln)}${line('Resistencias', m.res)}${line('Inmunidades', m.imm)}${line('Inmune a estados', m.cimm)}${line('Sentidos', m.senses)}${line('Idiomas', m.lang)}
      ${m.traits.map(([n, d]) => `<div class="feature"><p><b>${esc(n)}.</b> ${esc(d)}</p></div>`).join('')}
      ${m.actions.length ? '<h3 class="section-space">Acciones</h3>' + m.actions.map(a => act(a, 'actions')).join('') : ''}
      ${m.reactions.length ? '<h3 class="section-space">Reacciones</h3>' + m.reactions.map(a => act(a, 'reactions')).join('') : ''}
      ${m.legendary.length ? '<h3 class="section-space">Acciones legendarias</h3>' + m.legendary.map(a => act(a, 'legendary')).join('') : ''}
      <p class="small muted section-space">Texto del SRD 5.1 en inglés (CC-BY-4.0).</p>`;
  }
  async function view(id) {
    await load();
    const m = byId(id);
    modal(m.name, statBlock(m), null);
  }
  async function open(entryId) {
    await load();
    const e = tracker().entries.find(x => x.id === entryId),
      m = e && byId(e.monsterId);
    if (!m) throw Error('Criatura sin estadísticas del SRD.');
    modal(e.name, statBlock(m, e), null);
  }

  // ---------- Atacar a la party ----------
  const targets = () => (party?.characters || []).map(c => ({ id: c.id, name: c.name, x: PV.summarize(c.data) }));
  function findAction(entryId, kind, name) {
    const e = tracker().entries.find(x => x.id === entryId),
      m = byId(e?.monsterId);
    const a = m?.[kind]?.find(x => x.n === name);
    if (!a) throw Error('Acción no encontrada.');
    return { e, m, a };
  }
  function attack(entryId, kind, name, noAttack = false) {
    const { e, a } = findAction(entryId, kind, name),
      ts = targets();
    panel = { entryId, kind, name, last: null, noAttack };
    const dmgText = (a.dmg || []).map(([d, t]) => `${d} ${t}`).join(' + ') || '—';
    modal(
      `${e.name}: ${a.n}`,
      `<p class="small">${esc(a.d)}</p>${
        ts.length
          ? select(
              'Objetivo',
              'target',
              ts.map(t => [t.id, `${t.name} · CA ${t.x.ac} · ${t.x.hp ?? '—'}/${t.x.maxHP} PG`]),
            )
          : '<p class="muted">No hay fichas en la mesa.</p>'
      }
      ${noAttack ? '' : `<fieldset class="attack-adv"><legend>Ataque ${sign(a.atk)}</legend><label class="check"><input type="radio" name="adv" value="" checked>Normal</label><label class="check"><input type="radio" name="adv" value="adv">Ventaja</label><label class="check"><input type="radio" name="adv" value="dis">Desventaja</label></fieldset>`}
      <p class="small">Daño: <b>${esc(dmgText)}</b></p>
      <details class="physical-dice"><summary>Uso mis propios dados</summary><div class="form-grid">${noAttack ? '' : field('Mi d20', 'myD20', '', 'number', 'min="1" max="20"')}${field('Suma del daño', 'myDamage', '', 'number', 'min="0" max="999"')}</div></details>
      <div class="actions">${noAttack ? '' : button('Tirar ataque', 'monster-roll-attack', '')}${button('Tirar daño', 'monster-roll-damage', noAttack ? '' : 'secondary')}</div>
      <div class="attack-log" id="attack-log"></div>
      <div class="form-grid apply-damage">${field('Daño a aplicar (podés ajustarlo)', 'applyAmount', '', 'number', 'min="0" max="9999" id="monster-amount" inputmode="numeric"')}<label class="check"><input type="checkbox" name="half">Mitad (salvación superada)</label></div><div class="actions">${button('Aplicar daño al objetivo', 'monster-apply', 'secondary', 'disabled id="monster-apply"')}</div><p class="small muted">Las tiradas del monstruo solo se ven en tu pantalla; la party ve el daño que aplicás.</p>`,
      null,
    );
  }
  const formData = () => new FormData(document.getElementById('dialog-form'));
  function logLine(html, cls = '') {
    document.getElementById('attack-log')?.insertAdjacentHTML('afterbegin', `<p class="${cls}">${html}</p>`);
  }
  function rollAttack() {
    const { e, a } = findAction(panel.entryId, panel.kind, panel.name),
      fd = formData(),
      t = targets().find(x => x.id === fd.get('target'));
    let rolls,
      kept,
      physical = false;
    const own = fd.get('myD20');
    if (own) {
      kept = Number(own);
      if (!Number.isInteger(kept) || kept < 1 || kept > 20) throw Error('El d20 va de 1 a 20.');
      rolls = [kept];
      physical = true;
      document.querySelector('#dialog-form [name=myD20]').value = '';
    } else {
      const mode = fd.get('adv');
      rolls = mode ? [d20(), d20()] : [d20()];
      kept = mode === 'adv' ? Math.max(...rolls) : mode === 'dis' ? Math.min(...rolls) : rolls[0];
    }
    const total = kept + a.atk,
      crit = kept === 20,
      hit = crit || (kept !== 1 && t && total >= t.x.ac);
    panel.last = { crit, hit };
    RollFX.show({
      label: e.name + ' · ' + a.n,
      total,
      face: kept,
      detail: t ? (hit ? 'impacta a ' + t.name : 'falla contra ' + t.name) : '',
      crit,
      fumble: kept === 1,
    }).then(() =>
      logLine(
        `<b>${esc(e.name)} → ${esc(t?.name || '¿?')}:</b> d20 ${rolls.join(' / ')}${physical ? ' (físico)' : ''} ${sign(a.atk)} = <b>${total}</b> ${t ? (hit ? (crit ? '· <b>¡Crítico!</b>' : '· impacta (CA ' + t.x.ac + ')') : '· falla (CA ' + t.x.ac + ')') : ''}`,
        crit ? 'crit' : hit ? '' : 'fumble',
      ),
    );
  }
  function rollDamage() {
    const { a } = findAction(panel.entryId, panel.kind, panel.name),
      fd = formData(),
      crit = panel.last?.crit;
    let total, text;
    const own = fd.get('myDamage');
    if (own) {
      total = Number(own);
      if (!Number.isInteger(total) || total < 0) throw Error('Revisá la suma del daño.');
      text = 'dados físicos ' + total;
      document.querySelector('#dialog-form [name=myDamage]').value = '';
    } else {
      const parts = (a.dmg || []).map(([d, type]) => {
        const r = rollDice(d);
        const extra = crit && r.n ? rollDice(r.n + 'd' + r.sides) : { rolls: [], total: 0 };
        return { type, mod: r.mod, rolls: [...r.rolls, ...extra.rolls], total: r.total + extra.total };
      });
      total = parts.reduce((s, p) => s + p.total, 0);
      text = parts.map(p => `${p.rolls.join('+') || '—'}${p.mod ? ' ' + sign(p.mod) : ''} ${p.type}`).join(' · ');
    }
    panel.damage = total;
    RollFX.show({ label: 'Daño · ' + panel.name, total, face: '⚔', detail: text, crit: Boolean(crit) }).then(() => {
      const amountField = document.getElementById('monster-amount');
      if (amountField) amountField.value = total;
      logLine(`<b>Daño${crit ? ' crítico' : ''}:</b> ${esc(text)} = <b>${total}</b>`, 'damage');
      const btn = document.getElementById('monster-apply');
      if (btn) btn.disabled = false;
    });
  }
  async function apply() {
    const fd = formData(),
      target = fd.get('target'),
      t = targets().find(x => x.id === target);
    const typed = fd.get('applyAmount');
    const base = typed === null || typed === '' ? panel.damage : Number(typed);
    if (!t) throw Error('Elegí un objetivo.');
    if (!Number.isInteger(base) || base < 0 || base > 9999) throw Error('Revisá el daño a aplicar.');
    if (!base && !panel.damage) throw Error('Tirá el daño o escribí cuánto aplicar.');
    const amount = fd.has('half') ? Math.floor(base / 2) : base;
    if (amount > 0)
      await send(
        'damage',
        { amount, source: tracker().entries.find(x => x.id === panel.entryId)?.name + ': ' + panel.name },
        target,
      );
    logLine(`Aplicado: ${amount} de daño a ${esc(t.name)}.`);
    document.getElementById('monster-apply').disabled = true;
    document.getElementById('monster-amount').value = '';
    panel.damage = 0;
  }
  // Salvación de la party (aliento, aura…): el daño se tira acá y cada ficha alcanzada salva y lo aplica.
  async function askSave(entryId, kind, name) {
    const { e, a } = findAction(entryId, kind, name);
    const [ability, dc, success] = a.dc;
    const parts = (a.dmg || []).map(([d, type]) => ({ type, ...rollDice(d) })),
      rolled = parts.reduce((t, p) => t + p.total, 0),
      text = parts.map(p => `${p.rolls.join('+') || '—'}${p.mod ? ' ' + sign(p.mod) : ''} ${p.type}`).join(' · ');
    const ts = targets();
    modal(
      `${e.name}: ${a.n}`,
      `<p class="small">${esc(a.d)}</p><p>Salvación de <b>${ABIL_ES[ability] || ability}</b> · CD <b>${dc}</b>${success === 'half' ? ' · mitad si la superan' : ''}</p>
      ${ts.length ? `<fieldset class="target-list"><legend>Quiénes quedan en el área</legend>${ts.map(t => `<label class="check"><input type="checkbox" name="who" value="${esc(t.id)}" checked>${esc(t.name)}</label>`).join('')}</fieldset>` : '<p class="muted">No hay fichas en la mesa.</p>'}
      ${parts.length ? `<p class="small">Daño tirado: ${esc(text)} = <b>${rolled}</b></p>${field('Daño (cambialo si tiraste dados físicos o querés bajarlo)', 'damage', rolled, 'number', 'min="0" max="9999" inputmode="numeric"')}` : ''}
      <p class="small">${parts.length ? 'Cada jugador tira su salvación y su ficha se aplica el daño completo o la mitad. Los resultados llegan a «En la mesa».' : 'Las respuestas llegan a «En la mesa» con éxito o fallo.'}</p>`,
      async fd => {
        const who = fd.getAll('who');
        if (!who.length) throw Error('Elegí al menos una ficha.');
        if (!parts.length) {
          for (const id of who)
            await send(
              'roll-request',
              {
                type: 'save',
                id: ability,
                label: `Salvación de ${ABIL_ES[ability]} (${a.n})`,
                dc,
                showDc: true,
                secret: false,
              },
              id,
            );
          return;
        }
        const damage = Number(fd.get('damage'));
        if (!Number.isInteger(damage) || damage < 0 || damage > 9999) throw Error('Revisá el daño.');
        for (const id of who)
          await send(
            'area-save',
            {
              caster: e.name,
              spell: a.n,
              ability,
              abilityName: ABIL_ES[ability] || ability,
              dc,
              half: success === 'half',
              damage,
              types: parts.map(p => p.type).join(', '),
            },
            id,
          );
        toast(`${a.n}: ${who.length} ${who.length === 1 ? 'ficha tira' : 'fichas tiran'} su salvación.`);
      },
      'Pedir salvaciones',
    );
  }

  Object.assign(actions, {
    'init-monster-srd': () => picker(),
    'monster-view': e => view(e.dataset.id),
    'monster-add': e => add(e.dataset.id),
    'monster-open': e => open(e.dataset.entry),
    'monster-attack': e => attack(e.dataset.entry, e.dataset.kind, e.dataset.name, Boolean(e.dataset.noattack)),
    'monster-roll-attack': rollAttack,
    'monster-roll-damage': rollDamage,
    'monster-apply': apply,
    'monster-save': e => askSave(e.dataset.entry, e.dataset.kind, e.dataset.name),
  });
  document.addEventListener('input', e => {
    if (e.target.id === 'monster-amount') {
      const btn = document.getElementById('monster-apply');
      if (btn) btn.disabled = e.target.value === '';
    }
    if (e.target.id === 'monster-q') {
      query = e.target.value;
      drawResults();
    }
  });
  document.addEventListener('change', e => {
    if (e.target.name === 'cr' && document.getElementById('monster-results')) {
      crMax = e.target.value;
      drawResults();
    }
  });
  // Si ya hay criaturas del SRD en la iniciativa, se cargan los datos para la dificultad.
  if (
    Object.keys(localStorage).some(
      k => k.startsWith('dnd-dm-initiative-') && localStorage.getItem(k).includes('monsterId'),
    )
  )
    load().then(() => typeof draw === 'function' && draw());
  return { load, difficulty, difficultyLine, crText, picker, claimNames };
})();
