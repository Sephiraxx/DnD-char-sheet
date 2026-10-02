/* Mesa de combate: opciones de la ficha actual y registro explícito de recursos. */
let combatTab = 'action',
  combatLevel = 'all',
  combatAllSpells = false;
const combatLabels = { action: 'Acción', bonus: 'Acción adicional', reaction: 'Reacción' };
const combatOptions = [
  {
    id: 'rapier',
    kind: 'action',
    name: 'Atacar con estoque',
    text: 'Un ataque cuerpo a cuerpo a 5 pies. Tirás d20 + DES + competencia; si impacta, 1d8 + DES perforante.',
    weapon: 'estoque',
  },
  {
    id: 'dagger',
    kind: 'action',
    name: 'Atacar con daga',
    text: 'Un ataque a 5 pies o arrojado a 20/60 pies. d20 + DES + competencia; daño 1d4 + DES perforante. A más de 20 pies, desventaja.',
    weapon: 'daga',
  },
  {
    id: 'dodge',
    kind: 'action',
    name: 'Esquivar',
    text: 'Hasta tu próximo turno: los ataques de criaturas que puedas ver tienen desventaja y tenés ventaja en salvaciones de DES. Se pierde si quedás incapacitado o tu velocidad baja a 0.',
  },
  {
    id: 'disengage',
    kind: 'action',
    name: 'Destrabarse',
    text: 'Tu movimiento no provoca ataques de oportunidad durante el resto de este turno.',
  },
  {
    id: 'dash',
    kind: 'action',
    name: 'Correr',
    text: 'Ganás movimiento adicional igual a tu velocidad actual durante este turno. Con velocidad 30 pies, añade 30 pies; aplicá terreno y condiciones en mesa.',
  },
  {
    id: 'help',
    kind: 'action',
    name: 'Ayudar',
    text: 'Das ventaja en la próxima prueba de un aliado para la tarea ayudada antes de tu siguiente turno. Para ayudar a atacar, el enemigo debe estar a 5 pies de vos; beneficia el primer ataque de tu aliado contra él antes de tu próximo turno.',
  },
  {
    id: 'hide',
    kind: 'action',
    name: 'Esconderse',
    text: 'Prueba de Sigilo. El DM determina si podés ocultarte según cobertura, visibilidad y circunstancias. Solo puede usarse como acción adicional si un rasgo te lo permite.',
  },
  {
    id: 'ready',
    kind: 'action',
    name: 'Preparar una acción',
    text: 'Elegí un desencadenante perceptible y una acción o movimiento. Antes del inicio de tu próximo turno podés usar tu reacción justo después del desencadenante. Para preparar un conjuro, usá el procedimiento con el DM: se lanza ahora, gasta su espacio y exige concentración.',
  },
  {
    id: 'object',
    kind: 'action',
    name: 'Usar un objeto',
    text: 'Usá esta acción si el objeto lo requiere o si necesitás una segunda interacción. Sacar un arma o abrir una puerta suele entrar en tu interacción gratuita. En 2014 beber una poción normalmente cuesta una acción.',
  },
  {
    id: 'inspired',
    kind: 'bonus',
    name: 'Dar Inspiración bárdica',
    text: 'Otra criatura que te oiga a 60 pies recibe tu dado. Lo suma a una prueba, ataque o salvación después de tirar el d20 y antes de conocer el resultado. Dura 10 minutos; solo un dado de Inspiración por criatura. No te lo podés dar a vos mismo.',
  },
  {
    id: 'unsettling',
    kind: 'bonus',
    name: 'Palabras perturbadoras',
    text: 'Gastás un uso de Inspiración y tirás su dado. Una criatura que veas a 60 pies resta ese resultado de su próxima salvación antes del inicio de tu siguiente turno. Es un rasgo: podés combinarlo con Sugestión u otro conjuro de una acción.',
    eloquence: true,
  },
  {
    id: 'opportunity',
    kind: 'reaction',
    name: 'Ataque de oportunidad',
    text: 'Cuando un enemigo que veas sale de tu alcance usando su movimiento, acción o reacción: un ataque cuerpo a cuerpo justo antes de salir. No se provoca por teletransporte ni por movimiento que no use esos recursos. Destrabarse lo evita.',
  },
  {
    id: 'release',
    kind: 'reaction',
    name: 'Resolver acción preparada',
    text: 'Cuando ocurra el desencadenante que elegiste, usás tu reacción para realizar la respuesta preparada. El registro no lanza automáticamente un conjuro preparado.',
  },
];
function combatOptionAllowed(o) {
  if (['inspired', 'unsettling'].includes(o.id) && Classes.id(state) !== 'bard') return false;
  if (o.weapon && state.classId) return false;
  if (o.eloquence && (state.level < 3 || state.subclass !== 'eloquence')) return false;
  if (o.weapon && !state.inventory.some(x => x.qty > 0 && x.name.toLowerCase().includes(o.weapon))) return false;
  if (o.id === 'release' && !Combat.data(state).effects.some(x => x.kind === 'ready')) return false;
  return true;
}
function combatReason(o) {
  let r = Combat.blocked(state, o.kind);
  if (r) return r;
  if (['inspired', 'unsettling'].includes(o.id)) {
    const d = R.stats(state);
    if (state.inspirationSpent === null) return 'Confirmá cuántos usos de Inspiración te quedan.';
    if (state.inspirationSpent >= d.inspirationMax) return 'No te quedan usos de Inspiración.';
  }
  return '';
}
function combatChoice(o) {
  const reason = combatReason(o),
    d = R.stats(state);
  let meta = combatLabels[o.kind];
  if (['inspired', 'unsettling'].includes(o.id)) meta += ' · 1 uso de Inspiración · d' + d.inspirationDie;
  if (o.weapon) meta += ' · Ataque ' + sign(d.mods.dex + d.prof);
  return `<article class="battle-choice"><div><span class="eyebrow">${meta}</span><h3>${o.name}</h3><p>${o.text}</p></div><div>${reason ? `<p class="choice-reason">${esc(reason)}</p>` : ''}${button('Elegir', 'combat-option', 'secondary', `data-id="${o.id}" ${reason ? 'disabled' : ''}`)}</div></article>`;
}
function combatSpell(sp) {
  const reason = Combat.spellBlock(state, sp),
    d = R.stats(state);
  return `<article class="battle-choice spell-choice"><div><span class="eyebrow">${sp.level ? 'Nivel ' + sp.level : 'Nivel 0 · Truco'}${sp.concentration ? ' · Concentración' : ''}</span><h3>${esc(sp.name)} <button type="button" class="fav-star ${favoriteIds().includes(sp.id) ? 'on' : ''}" data-action="spell-fav" data-id="${esc(sp.id)}" aria-pressed="${favoriteIds().includes(sp.id)}" aria-label="Favorito" title="Favorito para la vista compacta">${favoriteIds().includes(sp.id) ? '★' : '☆'}</button></h3>${PartyUI.automaticSpellNote(state, sp.id)}<p>${esc(sp.brief)}</p><div class="small">${esc(sp.range)} · ${esc(sp.components)}${state.extras.includes(sp.id) ? ' · Extra DM' : ''}</div></div><div class="choice-bottom">${reason ? `<p class="choice-reason">${esc(reason)}</p>` : ''}<div class="actions">${button('Ver detalles', 'combat-spell-info', 'secondary', `data-id="${esc(sp.id)}"`)}${RollUI.rollable(sp) ? button('Solo tirar', 'spell-roll', 'secondary', `data-id="${esc(sp.id)}"`) : ''}${button(sp.level ? 'Lanzar' : 'Usar truco', 'cast', '', `data-id="${esc(sp.id)}" ${reason ? 'disabled' : ''}`)}</div></div></article>`;
}
// Vista compacta: todo lo del turno en una pantalla (preferencia de este dispositivo).
const COMPACT_KEY = 'dnd-combat-compact';
function combatCompactOn() {
  try {
    return localStorage.getItem(COMPACT_KEY) === '1';
  } catch {
    return false;
  }
}
function favoriteIds() {
  return state.favorites || [];
}
function combatSpeed() {
  const pen = state.equipmentDefense ? Equipment.defense(state).speedPenalty : 0;
  return Math.max(0, (state.speed ?? 30) - pen);
}
function combatCompact() {
  const d = R.stats(state),
    c = Combat.data(state),
    on = c.active && c.onTurn;
  const all = [...new Set(Classes.usable(state))].map(spellById).filter(Boolean),
    favs = favoriteIds(),
    ofKind = all.filter(x => Combat.kind(x) === combatTab),
    shown = (favs.length && !combatAllSpells ? ofKind.filter(x => favs.includes(x.id)) : ofKind).sort(
      (a, b) => a.level - b.level || a.name.localeCompare(b.name),
    );
  const left = (max, used) => (used === null ? '—' : max - used);
  const pill = (label, value, action, data = '', cls = '') =>
    `<button type="button" class="cc-pill ${cls}" data-action="${action}" ${data}><span>${label}</span><b>${value}</b></button>`;
  const pills = [
    ...d.slots.map((max, i) =>
      max
        ? pill(
            (Classes.id(state) === 'warlock' ? 'Pacto ' : 'Nv ') + (i + 1),
            left(max, state.slotsSpent[i]) + '/' + max,
            'pool-edit',
            `data-type="slot" data-index="${i}"`,
            state.slotsSpent[i] !== null && state.slotsSpent[i] >= max ? 'empty' : '',
          )
        : '',
    ),
    d.pact
      ? pill(
          'Pacto Nv ' + d.pact.level,
          left(d.pact.max, state.pactSpent ?? 0) + '/' + d.pact.max,
          'pool-edit',
          'data-type="pact"',
        )
      : '',
    Classes.id(state) === 'bard'
      ? pill(
          'Inspiración d' + d.inspirationDie,
          left(d.inspirationMax, state.inspirationSpent) + '/' + d.inspirationMax,
          'pool-edit',
          'data-type="inspiration"',
        )
      : '',
    ...Classes.resources(state).map(r => {
      const used = Classes.spent(state, r);
      return pill(
        esc(r.name),
        used === null ? '—' : r.max === 999 ? '∞' : Math.max(0, r.max - used) + '/' + r.max,
        'class-resource',
        `data-id="${r.id}"`,
        used !== null && r.max !== 999 && used >= r.max ? 'empty' : '',
      );
    }),
    pill(
      'Dados de Golpe',
      left(R.totalLevel(state), state.hdSpent) + '/' + R.totalLevel(state),
      'pool-edit',
      'data-type="hd"',
    ),
    ...state.extraResources.map(x =>
      pill(esc(x.name), left(x.max, x.spent) + '/' + x.max, 'pool-edit', `data-type="extra" data-index="${esc(x.id)}"`),
    ),
  ].join('');
  const options = combatOptions.filter(o => o.kind === combatTab && combatOptionAllowed(o));
  const effects = Effects.list(state);
  return `<div class="cc">
  <div class="cc-bar"><p class="eyebrow">${esc(state.name)} · ${c.active ? (on ? 'ES TU TURNO' : 'TURNO AJENO') : 'COMBATE'}${c.active ? ' · turno ' + c.turn : ''}</p><div class="actions">${button('Tirar dados', 'dice')}${button('Vista completa', 'combat-compact')}</div></div>
  <div class="cc-stats">
    <button type="button" class="cc-stat cc-hp ${state.hp !== null && state.hp <= d.maxHP / 4 ? 'low' : ''}" data-action="combat-hp"><b>${state.hp ?? '—'}<small>/${d.maxHP}</small></b><span>PG${state.temp ? ' · +' + state.temp + ' temp' : ''}</span></button>
    <div class="cc-stat"><b>${d.ac}</b><span>CA</span></div>
    <button type="button" class="cc-stat" data-action="roll" data-bonus="${d.initiative}" data-label="Iniciativa"><b>${sign(d.initiative)}</b><span>Iniciativa</span></button>
    ${all.length ? `<div class="cc-stat"><b>${d.dc}</b><span>CD</span></div>` : ''}
    <div class="cc-stat"><b>${combatSpeed()}</b><span>Pies</span></div>
  </div>
  ${state.hp === 0 ? `<section class="banner"><p><b>A 0 PG.</b> Salvaciones de muerte: ${state.death.success}/3 éxitos · ${state.death.failure}/3 fallos.</p><div class="actions">${button('Tirar salvación de muerte', 'death-roll', '')}${button('Reiniciar', 'death-reset')}</div></section>` : ''}
  ${state.heroicInspiration ? `<button class="text-btn heroic" data-action="heroic-toggle">★ Inspiración del DM</button>` : ''}
  ${state.concentration ? `<div class="cc-focus ${c.checks.length ? 'alert' : ''}"><span><b>${c.checks.length ? '⚠ Salvación de concentración' : 'Concentración'}</b> · ${esc(spellName(state.concentration))}${c.checks.length ? ' · CON ' + sign(R.saveBonus(state, 'con')) + ' vs CD ' + c.checks[0] : ''}</span><div class="actions">${c.checks.length ? button('Tirar', 'concentration-roll', '') + button('Superada', 'combat-concentration-pass') + button('Fallada', 'combat-concentration-fail', 'danger') : button('Terminar', 'concentration-end')}</div></div>` : ''}
  ${state.conditions.length ? `<p class="cc-conditions">${state.conditions.map(x => `<button class="chip selected" data-action="condition" data-condition="${esc(x)}" title="Quitar">${esc(x)} ×</button>`).join('')}</p>` : ''}
  <div class="cc-turn">${[
    ['action', 'Acción', c.action],
    ['bonus', 'Adicional', c.bonus],
    ['reaction', 'Reacción', state.reactionUsed ? 'Gastada' : null],
  ]
    .map(
      ([k, label, used]) =>
        `<button class="turn-token ${used ? 'used' : ''} ${combatTab === k ? 'current' : ''}" data-action="combat-tab" data-tab="${k}" aria-pressed="${combatTab === k}"><span>${label}</span><strong>${used ? esc(used) : 'Libre'}</strong></button>`,
    )
    .join(
      '',
    )}<div class="actions">${button(c.active ? 'Mi turno' : 'Iniciar turno', 'turn', '')}${on ? button('Terminar', 'combat-end') : ''}</div></div>
  <div class="cc-pills" aria-label="Recursos">${pills}</div>
  <div class="battle-choices cc-list">${AttackUI.choices(combatTab)}${PartyUI.combatAbilities(combatTab)}${options
    .filter(o => combatTab !== 'action' || o.weapon)
    .map(combatChoice)
    .join('')}${shown.map(combatSpell).join('')}</div>
  ${ofKind.length ? `<p class="small muted">${!favs.length ? 'Tocá ☆ en un conjuro para dejar solo tus favoritos en esta vista.' : combatAllSpells ? 'Todos tus conjuros de ' + combatLabels[combatTab].toLowerCase() + '.' : shown.length ? 'Solo tus conjuros ★ favoritos.' : 'Ningún favorito usa ' + combatLabels[combatTab].toLowerCase() + '.'} ${favs.length && (combatAllSpells || ofKind.length !== shown.length) ? button(combatAllSpells ? 'Solo favoritos' : 'Ver los ' + ofKind.length, 'combat-all-spells', 'text-btn') : ''}</p>` : ''}
  ${
    combatTab === 'action'
      ? `<details class="battle-rule"><summary>Esquivar, Destrabarse, Ayudar…</summary><div class="battle-choices cc-list section-space">${options
          .filter(o => !o.weapon)
          .map(combatChoice)
          .join('')}</div></details>`
      : ''
  }
  ${effects.length ? `<div class="cc-effects">${effects.map(x => `<span class="tag">${esc(x.name)} · ${esc(Effects.remaining(x))}</span>`).join('')}</div>` : ''}
  <details class="battle-rule"><summary>Condiciones</summary><div class="chips section-space">${CONDITIONS.map(x => `<button class="chip ${state.conditions.includes(x) ? 'selected' : ''}" data-action="condition" data-condition="${x}" aria-pressed="${state.conditions.includes(x)}">${x}</button>`).join('')}</div></details>
  <div class="actions section-space">${button('Descansar', 'rest')}${button('Otra opción del DM', 'combat-custom')}${c.active ? button('Salir de combate', 'combat-finish') : ''}</div>
</div>`;
}
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
function combatView() {
  if (combatCompactOn()) return combatCompact();
  const d = R.stats(state),
    c = Combat.data(state),
    on = c.active && c.onTurn;
  const all = [...new Set(Classes.usable(state))].map(spellById).filter(Boolean),
    spells = all
      .filter(x => Combat.kind(x) === combatTab && (combatLevel === 'all' || x.level === Number(combatLevel)))
      .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
  const options = combatOptions.filter(o => o.kind === combatTab && combatOptionAllowed(o));
  return (
    header(
      'Tu próxima jugada.',
      `${esc(state.name)} · ${MulticlassUI.label(state)}${Classes.id(state) === 'bard' && state.subclass === 'eloquence' && state.level >= 3 ? ' de Elocuencia' : ''} · Reglas 2014`,
      button('Vista compacta', 'combat-compact', '') +
        button('Descansar', 'rest') +
        button('Tirar dados', 'dice') +
        button('Dados y siglas', 'rules-help'),
    ) +
    `${!state.hpConfirmed || state.hp === null || (Classes.id(state) === 'bard' && state.inspirationSpent === null) || d.slots.some((max, i) => max && state.slotsSpent[i] === null) || Classes.resources(state).some(r => Classes.spent(state, r) === null) ? `<div class="banner"><p><b>Recursos sin confirmar.</b> Ingresá lo que te queda después de la pelea.</p>${button('Ajustar recursos', 'resources')}</div>` : ''}` +
    `${state.classId && Classes.tasks(state).length ? `<div class="banner"><p><b>Tu ficha tiene elecciones pendientes.</b> Revisá los conjuros y rasgos de tu nivel.</p>${button('Completar ficha', 'class-open')}</div>` : ''}<section class="turn-console card"><div class="card-header"><div><p class="eyebrow">${c.active ? (on ? 'ES TU TURNO' : 'TURNO AJENO') : 'SEGUIMIENTO DE COMBATE'}</p><h2>${c.active ? 'Turno propio ' + c.turn : '¿Qué vas a hacer?'}</h2></div><div class="actions">${button(c.active ? 'Mi turno' : 'Iniciar mi turno', 'turn', '')}${on ? button('Terminar turno', 'combat-end') : ''}${c.active ? button('Salir de combate', 'combat-finish') : ''}</div></div><p class="small">${c.active ? '«Mi turno» recupera acción, adicional y reacción. Terminar tu turno conserva la reacción gastada.' : 'Activá el seguimiento cuando empiece tu turno. Fuera de combate podés consultar opciones y registrar recursos sin limitar acciones por turno.'}</p><div class="turn-status">${[
      ['action', 'Acción', c.action],
      ['bonus', 'Adicional', c.bonus],
      ['reaction', 'Reacción', state.reactionUsed ? 'Gastada' : null],
    ]
      .map(
        ([k, label, used]) =>
          `<button class="turn-token ${used ? 'used' : ''} ${combatTab === k ? 'current' : ''}" data-action="combat-tab" data-tab="${k}" aria-pressed="${combatTab === k}"><span>${label}</span><strong>${used ? esc(used) : k === 'reaction' ? 'Disponible' : !c.active ? 'Sin seguimiento' : on ? 'Disponible' : 'Esperando turno'}</strong></button>`,
      )
      .join(
        '',
      )}</div><div class="quick-resources" aria-label="Reservas disponibles">${d.slots.map((max, i) => (max ? `<button data-action="pool-edit" data-type="slot" data-index="${i}" title="Ajustar espacios"><span>Espacios Nv. ${i + 1}</span><b>${state.slotsSpent[i] === null ? '—' : max - state.slotsSpent[i]} / ${max}</b></button>` : '')).join('')}${Classes.id(state) === 'bard' ? `<button data-action="combat-help" data-topic="inspiration"><span>Inspiración · d${d.inspirationDie}</span><b>${state.inspirationSpent === null ? '—' : d.inspirationMax - state.inspirationSpent} / ${d.inspirationMax}</b></button>` : ''}</div>${state.concentration ? `<button class="concentration-link" data-action="combat-focus"><b>${c.checks.length ? '⚠ Salvación de concentración pendiente' : 'Concentración'}</b> · ${esc(spellName(state.concentration))}${c.checks.length ? ' · CON CD ' + c.checks[0] : ''} →</button>` : ''}</section>
 <div class="metrics battle-metrics"><div class="metric"><strong>${state.hp ?? '—'}<small> / ${d.maxHP}</small></strong><span>PG actuales ${state.temp ? ' · +' + state.temp + ' temporales' : ''}</span><button class="text-btn" data-action="combat-hp">Daño / curación</button></div><div class="metric"><strong>${d.ac}</strong><span>Clase de armadura</span>${state.heroicInspiration ? `<button class="text-btn heroic" data-action="heroic-toggle" title="Ventaja en una tirada; se gasta al usarla">★ Inspiración del DM</button>` : ''}</div><div class="metric"><strong>${d.dc}</strong><span>CD de tus conjuros</span></div><div class="metric"><strong>${sign(d.initiative)}</strong><span>Iniciativa</span><button class="text-btn" data-action="roll" data-bonus="${d.initiative}" data-label="Iniciativa">Tirar d20</button></div></div>
 ${state.hp === 0 ? `<section class="banner"><p><b>Estás a 0 PG.</b> Registrá las salvaciones de muerte. Tres éxitos estabilizan; tres fallos causan muerte.</p><div class="actions">${button('Tirar salvación de muerte', 'death-roll', '')}${button('Éxitos ' + state.death.success + '/3', 'death', 'secondary', 'data-kind="success"')}${button('Fallos ' + state.death.failure + '/3', 'death', 'danger', 'data-kind="failure"')}${button('Reiniciar', 'death-reset')}</div></section>` : ''}
 <div class="battle-layout"><section class="card battle-actions"><div class="card-header"><h2>Elegí qué hacer</h2><span class="tag">${combatLabels[combatTab]}</span></div><div class="battle-tabs" role="group" aria-label="Tipo de acción">${Object.entries(
   combatLabels,
 )
   .map(
     ([k, l]) =>
       `<button class="chip ${combatTab === k ? 'selected' : ''}" aria-pressed="${combatTab === k}" data-action="combat-tab" data-tab="${k}">${l}</button>`,
   )
   .join('')}</div>
 ${combatTab === 'reaction' ? '<p class="small">Necesitás el desencadenante de cada reacción. Tenés una hasta el inicio de tu próximo turno; no es una acción extra libre.</p>' : combatTab === 'bonus' ? '<p class="small">Elegí una sola acción adicional por turno entre las opciones de tus rasgos y conjuros.</p>' : `<p class="small">Podés moverte antes y después de actuar. Tu velocidad es ${Math.max(0, (state.speed ?? 30) - (state.equipmentDefense ? Equipment.defense(state).speedPenalty : 0))} pies${state.equipmentDefense && Equipment.defense(state).speedPenalty ? ' (penalización por armadura incluida)' : ''}; condiciones y terreno pueden reducirla.</p>`}
 <h3 class="section-space">Tus conjuros</h3><div class="level-filters" role="group" aria-label="Nivel de conjuro">${[['all', 'Todos'], [0, '0 · Trucos'], ...[...new Set([...d.slots.flatMap((max, i) => (max ? [i + 1] : [])), ...all.filter(x => x.level > 0).map(x => x.level)])].sort((a, b) => a - b).map(l => [l, 'Nivel ' + l])].map(([k, l]) => `<button class="chip ${String(k) === combatLevel ? 'selected' : ''}" data-action="combat-level" data-level="${k}" aria-pressed="${String(k) === combatLevel}">${l}</button>`).join('')}</div><p class="small">El filtro indica el nivel del conjuro. Al lanzarlo elegís qué nivel de espacio gastar.</p><div class="battle-choices">${spells.length ? spells.map(combatSpell).join('') : '<p class="empty">No conocés conjuros de este nivel que usen ' + combatLabels[combatTab].toLowerCase() + '.</p>'}</div>
 <details class="battle-rule"><summary>Conjuros de acción adicional · regla de 2014</summary><p>Si lanzás un conjuro de acción adicional, los otros conjuros de ese mismo turno solo pueden ser trucos de una acción. En el turno de otra criatura podés volver a lanzar una reacción si te queda disponible. Inspirar y Palabras perturbadoras son rasgos, no conjuros.</p></details>
 <h3 class="section-space">${combatTab === 'bonus' ? 'Tus habilidades' : combatTab === 'reaction' ? 'Otras reacciones' : 'Armas y otras acciones'}</h3><div class="battle-choices">${AttackUI.choices(combatTab)}${PartyUI.combatAbilities(combatTab)}${options
   .filter(o => combatTab !== 'action' || o.weapon)
   .map(combatChoice)
   .join('')}</div>${
   combatTab === 'action'
     ? `<details class="battle-rule"><summary>Otras acciones: Esquivar, Destrabarse, Ayudar…</summary><div class="battle-choices section-space">${options
         .filter(o => !o.weapon)
         .map(combatChoice)
         .join('')}</div></details>`
     : ''
 }
 <div class="actions section-space">${button('Otra opción del DM', 'combat-custom')}${button('Gestionar conjuros', 'spell-manage')}</div></section>
 <aside class="stack"><section class="card"><div class="card-header"><h2>Tus recursos</h2>${button('Ajustar', 'resources')}</div>${d.slots.map((max, i) => (max ? pool((Classes.id(state) === 'warlock' ? 'Pacto · ' : '') + 'Espacios de nivel ' + (i + 1), 'slot', i) : '')).join('')}<p class="small">Los trucos (nivel 0) no gastan espacios.</p>${Classes.id(state) === 'bard' ? pool('Inspiración bárdica · d' + d.inspirationDie, 'inspiration', '', state.level >= 5 ? 'Recuperás usos con descanso corto o largo.' : 'Recuperás usos con descanso largo.') + `<button class="text-btn" data-action="combat-help" data-topic="inspiration">¿Cómo uso la Inspiración?</button>` : ''}${PartyUI.resourceCards()}${pool('Dados de Golpe · ' + d.hitDiceSet.map(x => x.count + 'd' + x.die).join(' + '), 'hd')}${d.pact ? pool('Pacto mágico · espacios de nivel ' + d.pact.level, 'pact', '', 'Se recuperan con descanso corto o largo.') : ''}<button class="text-btn" data-action="combat-help" data-topic="hd">¿Para qué sirven los Dados de Golpe?</button>${state.level >= 6 && state.subclass === 'eloquence' ? pool('Discurso universal', 'universal') : ''}${state.level >= 14 && state.subclass === 'eloquence' ? pool('Inspiración contagiosa', 'infectious') : ''}${state.extraResources.map(x => pool(esc(x.name), 'extra', x.id)).join('')}<p class="small section-space">Los símbolos ajustan recursos manualmente; no ejecutan acciones. «Elegir» o «Lanzar» registra ambos juntos.</p></section>
 <section class="card" id="combat-ongoing"><h2>En curso</h2><h3>Concentración</h3><p>${state.concentration ? esc(spellName(state.concentration)) : 'Ningún conjuro activo.'}</p>${state.concentration ? button('Terminar concentración', 'concentration-end') : ''}${c.checks.length && state.concentration ? `<div class="concentration-alert"><b>Salvación pendiente: CON ${sign(R.saveBonus(state, 'con'))} contra CD ${c.checks[0]}</b><p class="small">Una salvación por cada fuente de daño. Pendientes: ${c.checks.length}. No gasta reacción.</p>${button('Tirar salvación', 'concentration-roll', '')}${button('La superé', 'combat-concentration-pass', 'secondary')}${button('Fallé', 'combat-concentration-fail', 'danger')}</div>` : ''}${(state.bonusDice || []).length ? `<h3 class="section-space">Dados del DM</h3>${state.bonusDice.map(b => `<div class="effect-note"><b>d${b.die}${b.reason ? ' · ' + esc(b.reason) : ''}</b><p>Para ${esc(RollUI.bonusScope(b))}. Se ofrece al tirar.</p>${button('Descartar', 'bonus-discard', 'secondary', `data-id="${esc(b.id)}"`)}</div>`).join('')}` : ''}<div class="card-header section-space"><h3>Efectos con duración</h3>${button('Agregar', 'effect-new', 'text-btn')}</div>${
   Effects.list(state).length
     ? Effects.list(state)
         .map(
           x =>
             `<div class="effect-note"><b>${esc(x.name)}</b><p>${esc(Effects.remaining(x))}${x.concentration ? ' · concentración' : ''}${x.from === 'dm' ? ' · del DM' : ''}</p>${button('Terminar', 'effect-end', 'secondary', `data-id="${esc(x.id)}"`)}</div>`,
         )
         .join('')
     : '<p class="small">Los conjuros con duración se anotan al lanzarlos y descuentan una ronda al empezar tu turno.</p>'
 }<h3 class="section-space">Efectos que recordar</h3>${c.effects.length ? c.effects.map(x => `<div class="effect-note"><b>${esc(x.target)}</b><p>${x.kind === 'inspired' ? 'Inspiración: d' + x.value + ' · 10 minutos' : x.kind === 'unsettling' ? 'Resta ' + x.value + ' a la próxima salvación · hasta tu próximo turno' : x.kind === 'advantage' ? 'Silvery Barbs: ventaja en la próxima prueba, ataque o salvación · 1 minuto' : 'Acción preparada · hasta tu próximo turno'}</p>${button('Usado / terminado', 'combat-effect-remove', 'secondary', `data-id="${esc(x.id)}"`)}</div>`).join('') : '<p class="small">Al inspirar o usar Palabras perturbadoras, el objetivo aparece acá. Las duraciones en minutos se controlan en mesa.</p>'}
 <details class="battle-rule"><summary>Condiciones ${state.conditions.length ? '(' + state.conditions.length + ')' : ''}</summary><div class="chips section-space">${['Derribado', 'Asustado', 'Hechizado', 'Envenenado', 'Incapacitado', 'Inconsciente', 'Agarrado', 'Restringido', 'Cegado', 'Ensordecido', 'Paralizado', 'Aturdido', 'Invisible', 'Petrificado'].map(c => `<button class="chip ${state.conditions.includes(c) ? 'selected' : ''}" data-action="condition" data-condition="${c}" aria-pressed="${state.conditions.includes(c)}">${c}</button>`).join('')}</div></details>${state.conditions.length ? `<p class="small">${state.conditions.map(esc).join(' · ')}</p>` : ''}</section></aside></div>`
  );
}
function combatHelp(topic) {
  const d = R.stats(state);
  modal(
    topic === 'hd' ? 'Dados de Golpe: curarte al descansar' : 'Inspiración bárdica: ayudar o debilitar',
    topic === 'hd'
      ? `<p>Tu reserva máxima es <b>${state.level}d${Classes.info(state).die}</b>. En un descanso corto podés gastar dados de a uno: cada dado recupera <b>1d${Classes.info(state).die} ${sign(d.mods.con)} PG</b>, mínimo 0 por dado, sin superar tus PG máximos.</p><p>${d.songDie ? 'Tu Canción de descanso añade <b>1d' + d.songDie + '</b>' : 'Si recibís Canción de descanso de un bardo, añade su dado'} una sola vez si gastás al menos un Dado de Golpe y se cumplen sus condiciones. El descanso corto dura al menos una hora.</p><p>Un descanso largo recupera hasta <b>${Math.max(1, Math.floor(state.level / 2))}</b> Dados de Golpe gastados. No son los dados de daño ni se gastan para lanzar conjuros.</p>${button('Registrar descanso corto', 'short-rest', '')}`
      : `<p>Tenés hasta <b>${d.inspirationMax} usos</b> y tu dado es <b>d${d.inspirationDie}</b>. Se recuperan con descanso ${state.level >= 5 ? 'corto o largo' : 'largo'}.</p><p><b>Dar Inspiración:</b> acción adicional; otro aliado a 60 pies que te escuche recibe un dado para una prueba, ataque o salvación en los próximos 10 minutos. Lo tira cuando lo use, no cuando se lo das. Solo puede tener uno a la vez.</p>${state.level >= 3 && state.subclass === 'eloquence' ? '<p><b>Palabras perturbadoras:</b> otra acción adicional posible. Gastás la misma reserva, tirás el dado ahora y un enemigo visible a 60 pies resta el resultado de su próxima salvación antes de tu siguiente turno.</p>' : ''}<p>Esta reserva es distinta de la Inspiración que puede otorgar el DM por interpretar al personaje.</p>`,
  );
}
function combatOption(id) {
  const o = combatOptions.find(x => x.id === id);
  if (!o || !combatOptionAllowed(o)) throw Error('Esa opción no está disponible.');
  const reason = combatReason(o);
  if (reason) throw Error(reason);
  const d = R.stats(state);
  let html = `<p>${o.text}</p>`;
  const allies = TableUI.targets().allies;
  if (['inspired', 'unsettling'].includes(id))
    html +=
      (id === 'inspired' && allies.length
        ? select(
            'Aliado que recibe el dado',
            'objetivo',
            allies.map(a => [a.name, a.name]),
            allies[0].name,
          ) + '<p class="small">El dado le llega a su ficha y lo ve al tirar.</p>'
        : field(
            id === 'inspired' ? 'Aliado que recibe el dado' : 'Enemigo visible',
            'objetivo',
            '',
            'text',
            'required maxlength="100"',
          )) +
      (id === 'unsettling'
        ? field(
            'Resultado de tu d' + d.inspirationDie,
            'dado',
            '',
            'number',
            `min="1" max="${d.inspirationDie}" required`,
          ) + button('Tirar d' + d.inspirationDie, 'combat-inspiration-roll')
        : '<label class="check"><input type="checkbox" required>Es otra criatura a 60 pies que me oye y no tiene ya otro dado de Inspiración bárdica.</label>');
  if (o.weapon)
    html += `<p class="roll-reference">Estoque: ataque ${sign(d.mods.dex + d.prof)} · daño 1d8 ${sign(d.mods.dex)}.<br>Daga: ataque ${sign(d.mods.dex + d.prof)} · daño 1d4 ${sign(d.mods.dex)}.</p><p class="small">Resolvé el d20 y el impacto en mesa. Registrar consume ${id === 'opportunity' ? 'la reacción' : 'la acción'}, aunque falle el ataque.</p>`;
  if (id === 'opportunity' && state.classId)
    html +=
      '<p>Usá el bono, el dado de daño y las propiedades de tu ataque cuerpo a cuerpo. Es un solo ataque; Ataque adicional no se aplica a esta reacción.</p>';
  if (id === 'opportunity')
    html +=
      '<label class="check"><input type="checkbox" required>El enemigo provoca el ataque, puedo verlo y tengo un ataque cuerpo a cuerpo disponible.</label>';
  if (id === 'ready')
    html += field('Desencadenante y respuesta (sin conjuro)', 'objetivo', '', 'text', 'required maxlength="100"');
  if (id === 'release')
    html +=
      '<label class="check"><input type="checkbox" required>Ocurrió el desencadenante antes del inicio de mi próximo turno.</label>';
  modal(
    o.name,
    html,
    fd => {
      commit(o.name + (fd.get('objetivo') ? ' · ' + fd.get('objetivo') : ''), s => {
        if (['inspired', 'unsettling'].includes(id))
          Combat.inspiration(
            s,
            id,
            fd.get('objetivo'),
            id === 'unsettling' ? number(fd, 'dado', 1, d.inspirationDie) : 0,
          );
        else {
          Combat.use(s, o.kind, o.name);
          if (id === 'ready')
            Combat.data(s).effects.push({
              id: uid(),
              kind: 'ready',
              target: String(fd.get('objetivo')).trim(),
              value: 0,
            });
          if (id === 'release') Combat.data(s).effects = Combat.data(s).effects.filter(x => x.kind !== 'ready');
        }
      });
      // En la mesa, el aliado recibe el dado de Inspiración bárdica en su ficha.
      const ally = id === 'inspired' && allies.find(a => a.name === fd.get('objetivo'));
      if (ally)
        TableUI.sendTo(ally.characterId, 'bonus-die', {
          die: d.inspirationDie,
          kind: 'any',
          skills: [],
          reason: 'Inspiración bárdica de ' + state.name,
        }).catch(err => toast(err.message));
      toast('Registrado: ' + o.name + (ally ? '. ' + ally.name + ' recibió el d' + d.inspirationDie + '.' : ''));
    },
    'Registrar uso',
  );
}
function combatHp() {
  modal(
    'Puntos de golpe',
    `<p>Actuales: <b>${state.hp ?? 'sin confirmar'} / ${R.stats(state).maxHP}</b> · Temporales: ${state.temp}</p><div class="hp-controls"><label class="visually-hidden" for="hp-amount">Cantidad</label><input class="control" id="hp-amount" type="number" min="1" max="9999" value="1"><label class="visually-hidden" for="hp-type">Tipo de daño</label><select class="control" id="hp-type"><option value="">Sin tipo</option>${Defenses.TYPES.map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select>${button('Daño', 'damage', 'danger')}${button('Curar', 'heal')}</div><p class="small section-space">Ingresá el daño recibido; si elegís el tipo, se aplican tus resistencias, inmunidades y vulnerabilidades. Los PG temporales se descuentan primero. Si concentrás, se recuerda la salvación.</p><div class="actions">${button('PG temporales', 'temp')}${button('Ajustar todos los recursos', 'resources')}</div>`,
  );
}
function installCombatActions() {
  Object.assign(actions, {
    'combat-tab': e => {
      combatTab = e.dataset.tab;
      combatLevel = 'all';
      render();
    },
    'combat-compact': () => {
      try {
        localStorage.setItem(COMPACT_KEY, combatCompactOn() ? '0' : '1');
      } catch {
        throw Error('Este navegador no permite guardar la preferencia.');
      }
      render();
      window.scrollTo(0, 0);
    },
    'combat-all-spells': () => {
      combatAllSpells = !combatAllSpells;
      render();
    },
    'spell-fav': e => {
      const id = e.dataset.id,
        on = favoriteIds().includes(id);
      commit(on ? 'Quitado de favoritos' : 'Marcado como favorito', s => {
        s.favorites = on ? (s.favorites || []).filter(x => x !== id) : [...(s.favorites || []), id].slice(-60);
      });
    },
    'combat-level': e => {
      combatLevel = e.dataset.level;
      render();
    },
    'combat-option': e => combatOption(e.dataset.id),
    'combat-focus': () =>
      document.getElementById('combat-ongoing').scrollIntoView({ block: 'start', behavior: 'smooth' }),
    'combat-hp': combatHp,
    'combat-help': e => combatHelp(e.dataset.topic),
    'combat-spell-info': e => {
      const sp = spellById(e.dataset.id);
      modal(sp.name, Campaign.spellHelp(sp) + button('Lanzar', 'cast', '', `data-id="${esc(sp.id)}"`));
    },
    turn: () => {
      const start = () => {
        let ended = [];
        commit('Inicio de mi turno: acción, adicional y reacción disponibles', s => {
          Combat.start(s);
          ended = Effects.tick(s);
        });
        combatTab = 'action';
        combatLevel = 'all';
        render();
        toast(
          'Nuevo turno: acción, adicional y reacción disponibles.' +
            (ended.length ? ' Terminó: ' + ended.join(', ') + '.' : ''),
        );
      };
      if (Combat.data(state).active && Combat.data(state).onTurn)
        confirmAction(
          '¿Empezó tu siguiente turno?',
          'Se recuperan acción, adicional y reacción. No recupera espacios ni Inspiración.',
          start,
          'Sí, es mi siguiente turno',
        );
      else start();
    },
    'combat-end': () => {
      commit('Fin de mi turno', s => Combat.end(s));
      combatTab = 'reaction';
      combatLevel = 'all';
      render();
    },
    'combat-finish': () =>
      confirmAction(
        'Salir de combate',
        'Termina el seguimiento de turnos. Los recursos gastados y la concentración se conservan.',
        () => commit('Fin del seguimiento de combate', s => Combat.finish(s)),
      ),
    'combat-inspiration-roll': () => {
      $('#dialog-form').elements.namedItem('dado').value = roll(R.stats(state).inspirationDie)[0];
    },
    'combat-effect-remove': e =>
      commit('Efecto usado o terminado', s => {
        Combat.data(s).effects = Combat.data(s).effects.filter(x => x.id !== e.dataset.id);
      }),
    'effect-end': e =>
      commit('Efecto terminado', s => {
        s.timedEffects = Effects.list(s).filter(x => x.id !== e.dataset.id);
      }),
    'effect-new': () =>
      modal(
        'Efecto con duración',
        `${field('Nombre', 'name', '', 'text', 'required maxlength="100" placeholder="Bendición, Furia, Hechizado…"')}<div class="form-grid">${field('Duración', 'amount', 10, 'number', 'min="1" max="999" required')}${select(
          'Unidad',
          'unit',
          [
            ['1', 'Rondas'],
            ['10', 'Minutos'],
            ['600', 'Horas'],
            ['0', 'Sin duración fija'],
          ],
          '1',
        )}</div>${state.concentration ? `<label class="check"><input type="checkbox" name="conc">Termina si pierdo la concentración en ${esc(spellName(state.concentration))}</label>` : ''}`,
        fd =>
          commit('Efecto agregado: ' + fd.get('name'), s => {
            const unit = Number(fd.get('unit'));
            Effects.add(s, {
              name: String(fd.get('name')).trim(),
              rounds: unit ? number(fd, 'amount', 1, 999) * unit : null,
              concentration: fd.has('conc') ? s.concentration : null,
            });
          }),
      ),
    'combat-concentration-pass': () =>
      commit('Salvación de concentración superada', s => Combat.data(s).checks.shift()),
    'combat-concentration-fail': () =>
      commit('Concentración perdida', s => {
        s.concentration = null;
        Combat.data(s).checks = [];
      }),
    'combat-custom': () =>
      modal(
        'Otra opción del DM',
        `<p class="small">Para rasgos, objetos o decisiones de tu mesa que no figuran arriba. Los recursos especiales se ajustan aparte.</p>${field('Qué hacés', 'nombre', '', 'text', 'required maxlength="150"')}${select('Qué consume', 'tipo', Object.entries(combatLabels), combatTab)}`,
        fd =>
          commit('Acción de mesa: ' + fd.get('nombre'), s =>
            Combat.use(s, fd.get('tipo'), String(fd.get('nombre')).trim()),
          ),
      ),
  });
}
