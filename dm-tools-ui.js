/* Herramientas de campaña en la pantalla del DM: crónica (calendario, misiones, tiempo entre aventuras),
   tesoro y tienda, y la referencia rápida. La lógica vive en chronicle.js, shop.js y dm-reference.js. */
const DmTools = (() => {
  'use strict';
  const C = Chronicle;
  const settings = () => Cloud.cleanSettings(party?.campaign.settings || {});
  async function save(patch) {
    party.campaign.settings = await Cloud.updateSettings(current, { ...party.campaign.settings, ...patch });
    draw();
  }
  const area = (label, name, value = '', max = 800, rows = 3) =>
    `<label class="field">${label}<textarea name="${name}" maxlength="${max}" rows="${rows}">${esc(value)}</textarea></label>`;
  const str = (fd, k) => String(fd.get(k) || '').trim();
  const money = gp => PV.goldText(Shop.coins(gp));

  // ---------- Calendario ----------
  function calendarHtml(st) {
    const c = st.calendar;
    if (!c)
      return `<p class="small muted">Llevá la fecha del mundo: avanza con los descansos y los viajes, y la party la ve en su Mesa.</p><div class="actions">${button('Empezar calendario', 'cal-setup', '')}</div>`;
    const today = c.notes.filter(n => n.year === c.year && n.day === c.day),
      next = c.notes
        .filter(n => n.year > c.year || (n.year === c.year && n.day > c.day))
        .sort((a, b) => a.year - b.year || a.day - b.day)
        .slice(0, 3);
    return `<p class="chron-date"><b>${esc(C.dateText(c))}</b></p>${today.map(n => `<p class="small">📌 ${esc(n.text)}</p>`).join('')}${next.map(n => `<p class="small muted">${esc(C.dateText(c, n.day, n.year))}: ${esc(n.text)}</p>`).join('')}<div class="actions">${button('+1 día', 'cal-advance', 'secondary', 'data-days="1"')}${button('+1 semana', 'cal-advance', 'secondary', `data-days="${c.week}"`)}${button('Avanzar…', 'cal-jump', 'text-btn')}${button('Anotar fecha', 'cal-note', 'text-btn')}${button('Configurar', 'cal-setup', 'text-btn')}</div>`;
  }
  async function advance(days) {
    const st = settings();
    if (!st.calendar) throw Error('Primero empezá el calendario.');
    const calendar = C.advance(st.calendar, days),
      running = st.downtime.some(d => d.done < d.days);
    await save({ calendar, ...(running && days > 0 ? { downtime: C.progress(st.downtime, days) } : {}) });
    toast('Fecha: ' + C.dateText(calendar) + (running && days > 0 ? ' · avanzaron las actividades en curso' : ''));
  }
  function setup() {
    const c = settings().calendar || C.cleanCalendar({}),
      d = C.date(c);
    modal(
      'Calendario del mundo',
      `<p class="small">Un mes por línea: <b>nombre, días</b>. Podés usar el calendario de tu ambientación.</p>${area('Meses', 'months', c.months.map(m => `${m.name}, ${m.days}`).join('\n'), 1200, 8)}<div class="form-grid">${field('Días por semana', 'week', c.week, 'number', 'min="1" max="20" required')}${field('Año actual', 'year', c.year, 'number', 'min="-100000" max="100000" required')}${field('Mes actual (número)', 'month', d.month + 1, 'number', 'min="1" max="24" required')}${field('Día del mes', 'dom', d.dayOfMonth, 'number', 'min="1" max="100" required')}</div>`,
      async fd => {
        const months = str(fd, 'months')
          .split('\n')
          .map(l => {
            const m = /^(.*?)[,;]\s*(\d+)\s*$/.exec(l.trim());
            return m ? { name: m[1].trim(), days: Number(m[2]) } : { name: l.trim(), days: 30 };
          })
          .filter(m => m.name);
        if (!months.length) throw Error('Escribí al menos un mes.');
        const base = C.cleanCalendar({ ...c, months, week: int(fd, 'week', 1, 20), day: 0 });
        await save({
          calendar: C.setDate(
            base,
            int(fd, 'year', -100000, 100000),
            int(fd, 'month', 1, 24) - 1,
            int(fd, 'dom', 1, 100),
          ),
        });
      },
      'Guardar',
    );
  }
  function jump() {
    modal(
      'Avanzar el calendario',
      `${field('Días (negativo para retroceder)', 'days', 10, 'number', 'min="-3650" max="3650" required')}<p class="small">Las actividades entre aventuras en curso avanzan los mismos días.</p>`,
      fd => advance(int(fd, 'days', -3650, 3650)),
      'Avanzar',
    );
  }
  function note() {
    const c = settings().calendar;
    if (!c) throw Error('Primero empezá el calendario.');
    modal(
      'Anotar una fecha',
      `${field('Dentro de cuántos días (0 = hoy)', 'in', 0, 'number', 'min="0" max="3650" required')}${field('Qué pasa', 'text', '', 'text', 'required maxlength="200" placeholder="Llega la caravana a Aguasprofundas"')}<p class="small">La party ve las notas de la fecha de hoy.</p>`,
      async fd => {
        const when = C.advance(c, int(fd, 'in', 0, 3650));
        await save({
          calendar: { ...c, notes: [...c.notes, { year: when.year, day: when.day, text: str(fd, 'text') }] },
        });
      },
      'Anotar',
    );
  }

  // ---------- Misiones ----------
  function questsHtml(st) {
    const order = { active: 0, done: 1, failed: 2 },
      list = st.quests.slice().sort((a, b) => order[a.status] - order[b.status]);
    return `<div class="card-header chron-sub"><h3>Misiones</h3>${button('Agregar', 'quest-edit', 'text-btn')}</div>${
      list.length
        ? `<div class="party-list">${list
            .map(
              q =>
                `<div class="list-row quest ${q.status}"><div><b>${esc(q.title)}</b> <span class="chip ${q.status === 'active' ? 'selected' : ''}">${C.STATUS[q.status]}</span>${q.shared ? '' : ' <span class="chip warn">Solo DM</span>'}${q.giver ? `<p class="small muted">Encargo de ${esc(q.giver)}</p>` : ''}${q.text ? `<p class="small">${esc(q.text)}</p>` : ''}${q.reward ? `<p class="small"><b>Recompensa:</b> ${esc(q.reward)}</p>` : ''}</div><div class="actions">${q.status === 'active' ? button('✓', 'quest-status', 'text-btn', `data-id="${esc(q.id)}" data-status="done" title="Marcar cumplida" aria-label="Marcar cumplida"`) : button('↺', 'quest-status', 'text-btn', `data-id="${esc(q.id)}" data-status="active" title="Reabrir" aria-label="Reabrir"`)}${button('Editar', 'quest-edit', 'text-btn', `data-id="${esc(q.id)}"`)}</div></div>`,
            )
            .join('')}</div>`
        : '<p class="small muted">Sin misiones anotadas. Las que compartas aparecen en la Mesa de cada jugador.</p>'
    }`;
  }
  function questEdit(id) {
    const st = settings(),
      q = st.quests.find(x => x.id === id);
    modal(
      q ? 'Editar misión' : 'Nueva misión',
      `${field('Título', 'title', q?.title || '', 'text', 'required maxlength="120"')}${area('Descripción', 'text', q?.text || '')}<div class="form-grid">${field('Quién la encarga', 'giver', q?.giver || '', 'text', 'maxlength="120"')}${field('Recompensa', 'reward', q?.reward || '', 'text', 'maxlength="300"')}${select('Estado', 'status', Object.entries(C.STATUS), q?.status || 'active')}</div><label class="check"><input type="checkbox" name="shared" ${q?.shared === false ? '' : 'checked'}>Mostrar a la party</label>${q ? `<label class="check"><input type="checkbox" name="remove">Eliminar esta misión</label>` : ''}<p class="small muted">«Solo DM» la oculta en la pantalla de los jugadores, pero viaja con los ajustes de la mesa: no la uses para secretos que no deban filtrarse.</p>`,
      async fd => {
        const next = C.cleanQuest({
          id: q?.id,
          title: str(fd, 'title'),
          text: str(fd, 'text'),
          giver: str(fd, 'giver'),
          reward: str(fd, 'reward'),
          status: str(fd, 'status'),
          shared: fd.has('shared'),
        });
        if (!next) throw Error('Escribí un título.');
        const rest = st.quests.filter(x => x.id !== q?.id);
        await save({
          quests: fd.has('remove') ? rest : q ? st.quests.map(x => (x.id === q.id ? next : x)) : [...rest, next],
        });
        if (!q && next.shared) await send('note', { text: 'Nueva misión: ' + next.title });
      },
      'Guardar',
    );
  }
  async function questStatus(el) {
    const st = settings(),
      q = st.quests.find(x => x.id === el.dataset.id);
    if (!q) return;
    await save({ quests: st.quests.map(x => (x.id === q.id ? { ...x, status: el.dataset.status } : x)) });
  }

  // ---------- Tiempo entre aventuras ----------
  function downtimeHtml(st) {
    return `<div class="card-header chron-sub"><h3>Entre aventuras</h3><div class="actions">${button('Calcular fabricación', 'craft-calc', 'text-btn')}${button('Agregar', 'downtime-edit', 'text-btn')}</div></div>${
      st.downtime.length
        ? `<div class="party-list">${st.downtime
            .map(
              d =>
                `<div class="list-row"><div><b>${esc(d.who)}</b> · ${esc(C.ACTIVITIES[d.activity][0])}${d.goal ? ': ' + esc(d.goal) : ''}<p class="small ${d.done >= d.days ? '' : 'muted'}">${d.done >= d.days ? '✓ Terminado' : `${d.done} de ${d.days} días`}</p><progress max="${d.days}" value="${d.done}" aria-label="Avance"></progress>${d.notes ? `<p class="small">${esc(d.notes)}</p>` : ''}</div><div class="actions">${button('Editar', 'downtime-edit', 'text-btn', `data-id="${esc(d.id)}"`)}</div></div>`,
            )
            .join('')}</div>`
        : '<p class="small muted">Fabricar, entrenar, investigar o recuperarse: anotá la actividad y avanza sola con el calendario.</p>'
    }`;
  }
  function downtimeEdit(id) {
    const st = settings(),
      d = st.downtime.find(x => x.id === id),
      names = (party?.characters || []).map(c => c.name);
    modal(
      d ? 'Editar actividad' : 'Actividad entre aventuras',
      `<div class="form-grid">${field('Personaje', 'who', d?.who || names[0] || '', 'text', 'required maxlength="100" list="dt-who"')}${select(
        'Actividad',
        'activity',
        Object.entries(C.ACTIVITIES).map(([k, v]) => [k, v[0]]),
        d?.activity || 'craft',
      )}${field('Días necesarios', 'days', d?.days ?? 5, 'number', 'min="1" max="100000" required')}${field('Días hechos', 'done', d?.done ?? 0, 'number', 'min="0" max="100000" required')}</div><datalist id="dt-who">${names.map(n => `<option value="${esc(n)}">`).join('')}</datalist>${field('Qué hace', 'goal', d?.goal || '', 'text', 'maxlength="200" placeholder="Armadura de placas"')}${area('Notas', 'notes', d?.notes || '', 300, 2)}<details class="battle-rule"><summary>Cómo funciona cada actividad</summary>${Object.values(
        C.ACTIVITIES,
      )
        .filter(a => a[1])
        .map(a => `<p class="small"><b>${a[0]}:</b> ${a[1]}</p>`)
        .join(
          '',
        )}</details>${d ? `<label class="check"><input type="checkbox" name="remove">Eliminar esta actividad</label>` : ''}`,
      async fd => {
        const days = int(fd, 'days', 1, 100000),
          next = C.cleanDowntime({
            id: d?.id,
            who: str(fd, 'who'),
            activity: str(fd, 'activity'),
            goal: str(fd, 'goal'),
            days,
            done: Math.min(days, int(fd, 'done', 0, 100000)),
            notes: str(fd, 'notes'),
          });
        if (!next) throw Error('Indicá el personaje.');
        const rest = st.downtime.filter(x => x.id !== d?.id);
        await save({
          downtime: fd.has('remove') ? rest : d ? st.downtime.map(x => (x.id === d.id ? next : x)) : [...rest, next],
        });
      },
      'Guardar',
    );
  }
  function craftCalc() {
    modal(
      'Calcular fabricación',
      `<div class="form-grid">${field('Precio del objeto (po)', 'price', 50, 'number', 'min="0" max="10000000" step="0.01"')}${field('Artesanos trabajando', 'workers', 1, 'number', 'min="1" max="50"')}${select('O un objeto mágico', 'rarity', [['', 'No es mágico'], ...Object.keys(C.MAGIC_CRAFT).map(r => [r, r])], '')}</div><div id="craft-out" class="banner" role="status"></div><p class="small muted">Objetos comunes: 5 po de avance por día y por artesano, la mitad del precio en materiales (Manual del Jugador). Mágicos: 25 po por día (Guía del Dungeon Master).</p>`,
      null,
    );
    const form = $('#dialog-form'),
      out = () => {
        const fd = new FormData(form),
          w = Number(fd.get('workers')) || 1,
          rarity = String(fd.get('rarity')),
          m = C.craftMagic(rarity, w),
          r = C.craft(fd.get('price'), w);
        $('#craft-out').innerHTML = m
          ? `<p><b>${m.days.toLocaleString('es-AR')} días</b> · ${m.cost.toLocaleString('es-AR')} po · creador de nivel ${m.minLevel} o más.</p>`
          : `<p><b>${r.days.toLocaleString('es-AR')} día${r.days === 1 ? '' : 's'}</b> · ${esc(money(r.materials))} en materiales.</p>`;
      };
    form.addEventListener('input', out);
    out();
  }

  // ---------- Tesoro ----------
  let lastTreasure = null;
  const coinsText = c => PV.goldText({ cp: 0, sp: 0, ep: 0, gp: 0, pp: 0, ...c });
  function treasureHtml(t) {
    return `<div class="banner treasure-out"><p><b>Monedas:</b> ${esc(coinsText(t.coins))}</p>${t.valuables.map(v => `<p><b>${v.qty} × ${esc(v.name)}</b> (${v.type}) de ${v.value.toLocaleString('es-AR')} po c/u</p>`).join('')}${t.items.map(i => `<p>✦ <b>${esc(i.name)}</b> <span class="small muted">${esc(i.rarity)}${i.attune ? ' · requiere sintonización' : ''}</span></p>`).join('')}<p class="small muted">Valor sin objetos mágicos: ${Treasure.value(t).toLocaleString('es-AR')} po.</p></div>`;
  }
  function treasure() {
    modal(
      'Generar tesoro',
      `<div class="form-grid">${select(
        'Desafío',
        'tier',
        Treasure.TIERS.map(t => [t.id, t.label]),
        lastTreasure?.tier || '0-4',
      )}${select(
        'Tipo',
        'kind',
        [
          ['individual', 'Individual (lo que lleva cada criatura)'],
          ['hoard', 'Guarida o tesoro grande'],
        ],
        lastTreasure?.kind || 'individual',
      )}${field('Criaturas (individual)', 'count', 1, 'number', 'min="1" max="50"')}</div><div class="actions">${button('Tirar', 'treasure-roll', '')}</div><div id="treasure-out">${lastTreasure ? treasureHtml(lastTreasure) : ''}</div><div class="actions">${button('Pasar al botín de la mesa', 'treasure-loot', 'secondary')}${button('Repartir las monedas', 'treasure-split', 'secondary')}</div><p class="small muted">Monedas según las tablas por valor de desafío. Gemas, arte y objetos mágicos salen de una tabla simplificada con el catálogo de la app: ajustalos a tu gusto.</p>`,
      null,
    );
  }
  function treasureRoll() {
    const fd = new FormData($('#dialog-form')),
      tier = String(fd.get('tier'));
    lastTreasure =
      fd.get('kind') === 'hoard'
        ? Treasure.hoard(tier)
        : Treasure.individual(tier, Math.max(1, Math.min(50, Number(fd.get('count')) || 1)));
    $('#treasure-out').innerHTML = treasureHtml(lastTreasure);
  }
  async function treasureLoot() {
    const t = lastTreasure;
    if (!t) throw Error('Primero tirá un tesoro.');
    const rows = [
      ...(Object.values(t.coins).some(Boolean) ? [{ name: 'Monedas: ' + coinsText(t.coins), qty: 1, notes: '' }] : []),
      ...t.valuables.map(v => ({ name: `${v.name} (${v.type}, ${v.value} po)`, qty: v.qty, notes: '' })),
      ...t.items.map(i => ({ name: i.name, qty: 1, notes: '', data: { ref: ItemRef.parse('magic:' + i.id) } })),
    ];
    for (const r of rows) await Cloud.addLoot(current, r);
    $('#modal').close();
    toast(`${rows.length} entrada(s) agregadas al botín.`);
    await refresh();
  }
  async function treasureSplit() {
    const t = lastTreasure,
      chars = party?.characters || [];
    if (!t) throw Error('Primero tirá un tesoro.');
    if (!chars.length) throw Error('Todavía no hay fichas en la mesa.');
    const each = {},
      rest = [];
    for (const k of ['pp', 'gp', 'ep', 'sp', 'cp']) {
      const total = t.coins[k] || 0;
      each[k] = Math.floor(total / chars.length);
      if (total % chars.length) rest.push(`${total % chars.length} ${k}`);
    }
    if (!Object.values(each).some(Boolean)) throw Error('No alcanza para repartir entre todos.');
    for (const c of chars) await send('gold', each, c.id);
    $('#modal').close();
    toast(`Cada ficha recibió ${coinsText(each)}.${rest.length ? ' Sobró: ' + rest.join(', ') + '.' : ''}`);
  }

  // ---------- Tienda ----------
  function shopRows(q) {
    const rows = Shop.search(q, 30);
    return rows.length
      ? rows
          .map(
            (x, i) =>
              `<div class="list-row"><div><b>${esc(x.name)}</b><p class="small muted">${esc(x.category)}${x.range ? ` · entre ${x.range.min.toLocaleString('es-AR')} y ${x.range.max.toLocaleString('es-AR')} po` : ''}</p></div><div class="actions"><span class="shop-price">${esc(money(x.gp))}</span>${button('Vender', 'shop-sell', 'text-btn', `data-i="${i}"`)}</div></div>`,
          )
          .join('')
      : '<p class="muted">Nada con ese nombre.</p>';
  }
  let shopQuery = '';
  function shop() {
    modal(
      'Tienda y precios',
      `${field('Buscar', 'q', shopQuery, 'search', 'autocomplete="off" placeholder="Cuerda, laúd, poción, anillo…"')}<div id="shop-list" class="party-list shop-list">${shopRows(shopQuery)}</div><p class="small muted">Precios del Manual del Jugador. Los objetos mágicos muestran un precio sugerido dentro del rango de su rareza; al vender podés cambiarlo.</p>`,
      null,
    );
    const input = $('#dialog-form [name=q]');
    input.addEventListener('input', () => {
      shopQuery = input.value;
      $('#shop-list').innerHTML = shopRows(shopQuery);
    });
  }
  function sell(el) {
    const x = Shop.search(shopQuery, 30)[Number(el.dataset.i)],
      chars = party?.characters || [];
    if (!x) return;
    if (!chars.length) throw Error('Todavía no hay fichas en la mesa.');
    modal(
      'Vender: ' + x.name,
      `<div class="form-grid">${select(
        'Comprador',
        'who',
        chars.map(c => [c.id, `${c.name} · ${PV.goldText(PV.summarize(c.data).gold)}`]),
      )}${field('Cantidad', 'qty', 1, 'number', 'min="1" max="999" required')}${field('Precio por unidad (po)', 'price', x.gp, 'number', 'min="0" max="10000000" step="0.01" required')}</div><p class="small">Se le cobra al personaje y el objeto llega a su ficha.</p>`,
      async fd => {
        const id = str(fd, 'who'),
          row = characterById(id),
          qty = int(fd, 'qty', 1, 999),
          price = Math.max(0, Number(fd.get('price')) || 0),
          cost = Shop.coins(price * qty);
        if (!row) throw Error('Elegí una ficha de la mesa.');
        const pay = { pp: 0, gp: cost.gp, ep: 0, sp: cost.sp, cp: cost.cp },
          any = Object.values(pay).some(Boolean);
        if (any && !PV.pay(PV.summarize(row.data).gold, pay))
          throw Error(`No le alcanza: cuesta ${PV.goldText(pay)} y tiene ${PV.goldText(PV.summarize(row.data).gold)}.`);
        if (any) await send('gold-remove', pay, id);
        const ref = x.ref && typeof ItemRef !== 'undefined' ? ItemRef.parse?.(x.ref) : null;
        await send(
          'item',
          { name: x.name, qty, notes: 'Comprado' + (any ? ' por ' + PV.goldText(pay) : ''), ...(ref ? { ref } : {}) },
          id,
        );
        toast(`${row.name} compró ${qty > 1 ? qty + ' × ' : ''}${x.name}.`);
      },
      'Vender',
    );
  }

  // ---------- Referencia ----------
  const R = DmReference;
  const table = (head, rows) =>
    `<div class="table-scroll"><table class="ref-table"><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const REFS = {
    traps: () =>
      `<p>${R.TRAPS.intro}</p><h3>CD y bono de ataque</h3>${table(['Gravedad', 'Salvación', 'Ataque'], R.TRAPS.severity)}<h3>Daño por nivel de los personajes</h3>${table(['Nivel', 'Contratiempo', 'Peligrosa', 'Mortal'], R.TRAPS.damage)}<h3>Trampas de ejemplo</h3>${R.TRAPS.samples.map(([n, t]) => `<details class="battle-rule"><summary>${n}</summary><p class="small">${t}</p></details>`).join('')}`,
    diseases: () => R.DISEASES.map(([n, t]) => `<h3>${n}</h3><p class="small">${t}</p>`).join(''),
    poisons: () =>
      `<p class="small">Tipos: <b>contacto</b> (al tocar la piel), <b>ingerido</b> (dosis completa), <b>inhalado</b> (cubo de 5 pies) y <b>herida</b> (en un arma, dura hasta impactar o lavarse). La salvación es de Constitución.</p>${table(
        ['Veneno', 'Precio', 'Vía', 'CD', 'Efecto si falla'],
        R.POISONS.map(([n, p, via, dc, fx]) => [n, p.toLocaleString('es-AR') + ' po', via, dc, fx]),
      )}`,
    madness: () =>
      `<p>${R.MADNESS.intro}</p>${Object.entries(R.MADNESS.kinds)
        .map(
          ([k, m]) =>
            `<div class="card-header chron-sub"><h3>${m.name} <span class="small muted">· ${m.length}</span></h3>${button('Tirar', 'madness-roll', 'text-btn', `data-kind="${k}"`)}</div><p class="small" id="madness-${k}" role="status"></p><details class="battle-rule"><summary>Ver todos los efectos</summary><ol class="small">${m.effects.map(e => `<li>${esc(e)}</li>`).join('')}</ol></details>`,
        )
        .join('')}`,
    vehicles: () =>
      `<p class="small">${R.VEHICLE_NOTES}</p><h3>Naves</h3>${table(
        ['Nave', 'Precio', 'Velocidad', 'Tripulación', 'Pasajeros', 'Carga (t)', 'CA', 'PG', 'Umbral'],
        R.VEHICLES.map(([n, p, ...rest]) => [n, p.toLocaleString('es-AR') + ' po', ...rest]),
      )}<h3>Vehículos terrestres</h3>${table(
        ['Vehículo', 'Precio'],
        R.LAND.map(([n, p]) => [n, p + ' po']),
      )}`,
  };
  const REF_TITLES = {
    traps: 'Trampas',
    diseases: 'Enfermedades',
    poisons: 'Venenos',
    madness: 'Locura',
    vehicles: 'Vehículos',
  };
  function madnessRoll(el) {
    const m = R.MADNESS.kinds[el.dataset.kind],
      a = new Uint32Array(1);
    crypto.getRandomValues(a);
    document.getElementById('madness-' + el.dataset.kind).innerHTML =
      `<b>${esc(m.effects[a[0] % m.effects.length])}</b> <span class="muted">(${m.length})</span>`;
  }

  function card() {
    const st = settings();
    return `<section class="card chronicle-card"><div class="card-header"><h2>Crónica</h2></div>${calendarHtml(st)}${questsHtml(st)}${downtimeHtml(st)}</section>
    <section class="card"><div class="card-header"><h2>Tesoro y tienda</h2></div><div class="actions">${button('Generar tesoro', 'treasure', '')}${button('Tienda y precios', 'shop')}</div></section>
    <section class="card"><div class="card-header"><h2>Referencia rápida</h2></div><div class="actions">${Object.entries(
      REF_TITLES,
    )
      .map(([k, t]) => button(t, 'dm-ref', 'secondary', `data-ref="${k}"`))
      .join('')}</div></section>`;
  }
  Object.assign(actions, {
    'cal-setup': setup,
    'cal-advance': el => advance(Number(el.dataset.days) || 1),
    'cal-jump': jump,
    'cal-note': note,
    'quest-edit': el => questEdit(el.dataset.id || ''),
    'quest-status': questStatus,
    'downtime-edit': el => downtimeEdit(el.dataset.id || ''),
    'craft-calc': craftCalc,
    treasure,
    'treasure-roll': treasureRoll,
    'treasure-loot': treasureLoot,
    'treasure-split': treasureSplit,
    shop,
    'shop-sell': sell,
    'dm-ref': el => modal(REF_TITLES[el.dataset.ref], REFS[el.dataset.ref](), null),
    'madness-roll': madnessRoll,
  });
  return { card };
})();
