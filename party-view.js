/* Resumen de fichas de la mesa. Lo usan la sección Mesa de cada jugador y la pantalla del DM. */
(function (root) {
  'use strict';
  const esc = v =>
    String(v ?? '').replace(
      /[&<>"']/g,
      c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const sign = n => (n >= 0 ? '+' : '') + n;

  function spellName(s, id) {
    if (!id) return '';
    const sp = root.Rules.allSpells(s).find(x => x.id === id) || root.Catalog?.spells?.find(x => x.id === id);
    return sp?.name || 'Conjuro';
  }
  function classLine(s) {
    if (!s.classId) return 'Bardo ' + s.level;
    return root.Classes.label(s, true);
  }
  // Datos que la mesa necesita ver de un vistazo, calculados con las mismas reglas de la ficha.
  function summarize(data) {
    let s;
    try {
      s = root.Rules.validate(data);
    } catch {
      return { broken: true, name: data?.name || 'Ficha' };
    }
    const st = root.Rules.stats(s);
    const slots = st.slots
      .map((max, i) => ({ level: i + 1, max, left: s.slotsSpent[i] === null ? null : max - s.slotsSpent[i] }))
      .filter(x => x.max);
    const c = s.combatState || {};
    return {
      name: s.name,
      line: classLine(s),
      race: s.race || '',
      level: s.level,
      hp: s.hp,
      maxHP: st.maxHP,
      temp: s.temp || 0,
      ac: st.ac,
      initiative: st.initiative,
      speed: s.speed || 30,
      passive: {
        perception: 10 + root.Rules.skillBonus(s, 'perception'),
        insight: 10 + root.Rules.skillBonus(s, 'insight'),
        investigation: 10 + root.Rules.skillBonus(s, 'investigation'),
      },
      saves: Object.keys(root.Rules.attrs).map(a => [a, root.Rules.saveBonus(s, a)]),
      dc: st.dc,
      slots,
      conditions: s.conditions || [],
      concentration: spellName(s, s.concentration),
      death: s.death,
      onTurn: Boolean(c.active && c.onTurn),
      heroic: Boolean(s.heroicInspiration),
      bonusDice: (s.bonusDice || []).map(b => 'd' + b.die + (b.reason ? ' · ' + b.reason : '')),
      inCombat: Boolean(c.active),
      gold: s.gold,
    };
  }

  function hpClass(x) {
    if (x.hp === null || x.hp === undefined) return '';
    if (x.hp === 0) return 'down';
    return x.hp <= x.maxHP / 2 ? 'hurt' : '';
  }

  // Tarjeta de un integrante. `actions` es HTML extra (botones del DM).
  function card(x, { actions = '', owner = '', mine = false, online = false } = {}) {
    if (x.broken)
      return `<article class="card party-card"><h3>${esc(x.name)}</h3><p class="muted">No se pudo leer esta ficha.</p>${actions}</article>`;
    const hpKnown = x.hp !== null && x.hp !== undefined;
    const pct = hpKnown ? Math.max(0, Math.min(100, Math.round((x.hp / x.maxHP) * 100))) : 0;
    const chips = [
      ...x.conditions.map(c => `<span class="chip warn">${esc(c)}</span>`),
      x.concentration ? `<span class="chip">Concentración: ${esc(x.concentration)}</span>` : '',
      x.heroic ? '<span class="chip selected">★ Inspiración</span>' : '',
      ...(x.bonusDice || []).map(b => `<span class="chip selected">+${esc(b)}</span>`),
      x.hp === 0 ? `<span class="chip warn">Salvaciones: ${x.death.success}✓ ${x.death.failure}✗</span>` : '',
    ].join('');
    return `<article class="card party-card ${hpClass(x)} ${x.onTurn ? 'on-turn' : ''} ${mine ? 'mine' : ''}">
      <div class="party-card-head"><div><h3>${online ? '<span class="online-dot" title="Con la aplicación abierta"></span>' : ''}${esc(x.name)}${x.onTurn ? ' <span class="chip turn">En turno</span>' : ''}</h3><p class="small muted">${esc(x.line)}${x.race ? ' · ' + esc(x.race) : ''}${owner ? ' · ' + esc(owner) : ''}</p></div>
      <div class="party-ac" title="Clase de armadura"><b>${x.ac}</b><span>CA</span></div></div>
      <div class="party-hp"><div class="meter" aria-hidden="true"><span style="width:${pct}%"></span></div><p><b>${hpKnown ? x.hp : '—'}</b> / ${x.maxHP} PG${x.temp ? ` · +${x.temp} temp.` : ''}</p></div>
      <dl class="party-stats"><div><dt>Iniciativa</dt><dd>${sign(x.initiative)}</dd></div><div><dt>Percepción pasiva</dt><dd>${x.passive.perception}</dd></div><div><dt>Perspicacia pasiva</dt><dd>${x.passive.insight}</dd></div><div><dt>CD</dt><dd>${x.dc}</dd></div></dl>
      ${x.slots.length ? `<p class="small party-slots">Espacios: ${x.slots.map(s => `<span title="Nivel ${s.level}">${s.level}º ${s.left ?? '?'}/${s.max}</span>`).join(' · ')}</p>` : ''}
      ${chips ? `<div class="chips">${chips}</div>` : ''}
      ${actions}
    </article>`;
  }

  function rollText(p) {
    const parts = (p.rolls || []).join(', ');
    return `${esc(p.label || 'Tirada')}: <b>${esc(p.total)}</b>${parts ? ` <span class="muted">(${esc(parts)}${p.bonus ? ' ' + sign(p.bonus) : ''})</span>` : ''}${p.physical ? ' <span class="muted small">· dado físico</span>' : ''}`;
  }

  function eventText(ev, party) {
    const memberName = id => party?.members.find(m => m.user_id === id)?.display_name || '';
    const p = ev.payload || {},
      who = p.character || memberName(ev.author_id) || 'Alguien',
      target = party?.characters.find(c => c.id === ev.target_character)?.name || p.targetName || '';
    switch (ev.kind) {
      case 'roll':
        return `<b>${esc(who)}</b> · ${rollText(p)}`;
      case 'roll-request':
        return `<b>DM</b> pide ${esc(p.label)}${target ? ' a ' + esc(target) : ' a todos'}${p.dc && p.showDc ? ' · CD ' + esc(p.dc) : ''}`;
      case 'roll-response':
        return `<b>${esc(who)}</b> responde · ${rollText(p)}`;
      case 'note':
        return `<b>${esc(ev.author_id === party?.campaign.dm_id ? 'DM' : who)}</b>${target ? ' → ' + esc(target) : ''}: ${esc(p.text)}`;
      case 'damage':
        return `<b>DM</b>: ${esc(target)} recibe ${esc(p.amount)} de daño${p.source ? ' (' + esc(p.source) + ')' : ''}`;
      case 'heal':
        return `<b>DM</b>: ${esc(target)} recupera ${esc(p.amount)} PG`;
      case 'temp':
        return `<b>DM</b>: ${esc(target)} obtiene ${esc(p.amount)} PG temporales`;
      case 'condition':
        return `<b>DM</b>: ${esc(target)} ${p.on ? 'queda' : 'deja de estar'} ${esc(p.name)}`;
      case 'rest':
        return `<b>DM</b>: descanso ${p.type === 'long' ? 'largo' : 'corto'}${target ? ' para ' + esc(target) : ''}`;
      case 'gold':
        return `<b>DM</b>: ${esc(target)} recibe ${esc(goldText(p))}`;
      case 'item':
        return `<b>DM</b>: ${esc(target)} recibe ${esc(p.qty > 1 ? p.qty + ' × ' : '')}${esc(p.name)}`;
      case 'bonus-die':
        return `<b>DM</b>: ${esc(target)} recibe un d${esc(p.die)}${p.reason ? ' (' + esc(p.reason) + ')' : ''}`;
      case 'inspiration':
        return `<b>DM</b>: ${esc(target)} ${p.on === false ? 'pierde' : 'recibe'} Inspiración`;
      case 'level':
        return `<b>DM</b>: ${esc(target)} puede subir a nivel ${esc(p.level || '')}`;
      case 'turn':
        return `<b>Iniciativa</b> · ronda ${esc(p.round || 1)}: turno de ${esc(p.name)}`;
      case 'combat-end':
        return '<b>Iniciativa</b> · fin del combate';
      default:
        return esc(ev.kind);
    }
  }
  function goldText(p) {
    return (
      ['pp', 'gp', 'ep', 'sp', 'cp']
        .filter(k => p[k])
        .map(k => p[k] + ' ' + { pp: 'ppt', gp: 'po', ep: 'pe', sp: 'pp', cp: 'pc' }[k])
        .join(', ') || '0 po'
    );
  }

  // Orden de iniciativa publicado por el DM (el último, si el combate sigue).
  function initiative(feed) {
    const last = feed.find(e => e.kind === 'initiative' || e.kind === 'combat-end');
    return last?.kind === 'initiative' && last.payload?.entries?.length ? last.payload : null;
  }
  function initiativeStrip(order, mineId = '') {
    if (!order) return '';
    return `<div class="initiative-strip"><b>Ronda ${esc(order.round || 1)}</b>${order.entries
      .map(
        (e, i) =>
          `<span class="chip ${i === order.turn ? 'current' : ''}">${e.init ?? '—'} · ${esc(e.name)}${e.characterId && e.characterId === mineId ? ' (vos)' : ''}</span>`,
      )
      .join('')}</div>`;
  }
  root.PartyView = {
    initiative,
    initiativeStrip,
    esc,
    summarize,
    card,
    rollText,
    eventText,
    goldText,
  };
})(typeof window !== 'undefined' ? window : globalThis);
