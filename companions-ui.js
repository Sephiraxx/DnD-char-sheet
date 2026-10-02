/* Compañeros en la ficha: tarjetas con PG, CA y ataques; Forma salvaje del druida en combate. */
const CompanionsUI = (() => {
  'use strict';
  const K = Companions;
  let loading = null;
  // El bestiario pesa: se carga solo al elegir una criatura.
  function loadMonsters() {
    if (window.MonsterData) return Promise.resolve();
    return (loading ||= new Promise((ok, fail) => {
      const s = document.createElement('script');
      s.src = './monsters-data.js';
      s.onload = ok;
      s.onerror = () => {
        loading = null;
        fail(Error('No se pudo cargar el bestiario. Revisá tu conexión.'));
      };
      document.head.append(s);
    }));
  }
  const crText = cr => (cr === 0.125 ? '1/8' : cr === 0.25 ? '1/4' : cr === 0.5 ? '1/2' : String(cr));

  // Tira «2d4+2 perforante + 1d6 fuego»: cada grupo de dados con su bono.
  function rollDamage(label, expr) {
    const parts = [...String(expr).matchAll(/(\d+)d(\d+)(?:\s*([+-])\s*(\d+))?/g)];
    if (!parts.length) {
      // Daño fijo (las garras de un búho hacen 1): no hay nada que tirar.
      const flat = /\d+/.exec(String(expr));
      if (!flat) throw Error('Ese daño no tiene dados para tirar.');
      return toast(`${label}: ${expr}.`);
    }
    let total = 0;
    const text = parts.map(([, n, d, sg, k]) => {
      const r = window.roll(Number(d), Number(n)),
        bonus = k ? (sg === '-' ? -1 : 1) * Number(k) : 0;
      total += r.reduce((a, b) => a + b, 0) + bonus;
      return `[${r.join(', ')}]${bonus ? (bonus > 0 ? ' + ' : ' − ') + Math.abs(bonus) : ''}`;
    });
    total = Math.max(0, total);
    if (typeof RollFX !== 'undefined') RollFX.show({ label: label + ' · daño', total, face: total });
    toast(`${label}: ${expr} → ${text.join(' + ')} = ${total}`);
  }

  function attackButtons(prefix, id, attacks) {
    return attacks
      .map(
        (a, i) =>
          `<div class="cmp-attack"><span><b>${esc(a.name)}</b> ${sign(a.bonus)} · ${esc(a.damage)}</span><span class="actions"><button type="button" class="button secondary" data-action="roll" data-bonus="${a.bonus}" data-label="${esc(a.name)}">Ataque</button><button type="button" class="button secondary" data-action="${prefix}-damage" data-id="${esc(id)}" data-i="${i}">Daño</button></span></div>`,
      )
      .join('');
  }
  function block(c, { combat = false } = {}) {
    return `<article class="cmp ${c.hp === 0 ? 'down' : ''}"><div class="cmp-head"><div><p class="eyebrow">${esc(K.KINDS[c.kind] || 'Compañero')}</p><h3>${esc(c.name)}</h3></div><div class="cmp-stats"><button type="button" class="cc-stat cmp-hp" data-action="cmp-hp" data-id="${esc(c.id)}"><b>${c.hp}<small>/${c.maxHp}</small></b><span>PG</span></button><div class="cc-stat"><b>${c.ac}</b><span>CA</span></div></div></div>${c.speed ? `<p class="small muted">${esc(c.speed)}</p>` : ''}${attackButtons('cmp', c.id, c.attacks)}${!combat && c.notes ? `<p class="small">${esc(c.notes)}</p>` : ''}${combat ? '' : `<div class="actions">${button('Editar', 'cmp-edit', 'secondary', `data-id="${esc(c.id)}"`)}${button('Quitar', 'cmp-remove', 'secondary', `data-id="${esc(c.id)}"`)}</div>`}</article>`;
  }
  // Tarjeta de Diario.
  function card() {
    const list = state.companions || [];
    return `<section class="card"><div class="card-header"><h2>Compañeros</h2><button class="text-btn" data-action="cmp-add">Añadir</button></div>${list.length ? `<div class="cmp-list">${list.map(c => block(c)).join('')}</div>` : '<p class="muted">Familiares, invocaciones, monturas y mascotas con sus PG, CA y ataques. Elegilos del bestiario o anotalos a mano.</p>'}${state.companion.name || state.companion.notes ? `<details class="section-space"><summary>Notas de compañeros</summary><h3>${esc(state.companion.name)}</h3><p>${esc(state.companion.notes)}</p></details>` : ''}<p class="small section-space"><button class="text-btn" data-action="companion">Notas libres de compañeros y PNJ</button></p></section>`;
  }
  // Combate: forma salvaje activa (o el botón para entrar) y compañeros.
  function combat() {
    const ws = state.wildShape,
      list = (state.companions || []).filter(c => c.hp > 0);
    let out = '';
    if (ws)
      out += `<section class="card wild-shape"><div class="card-header"><div><p class="eyebrow">FORMA SALVAJE</p><h2>${esc(ws.name)}</h2></div><div class="actions">${button('Volver a tu forma', 'ws-end', 'secondary')}</div></div><div class="cmp-stats"><button type="button" class="cc-stat cmp-hp" data-action="ws-hp"><b>${ws.hp}<small>/${ws.maxHp}</small></b><span>PG bestia</span></button><div class="cc-stat"><b>${ws.ac}</b><span>CA</span></div><div class="cc-stat"><b>${state.hp ?? '—'}</b><span>Tus PG</span></div></div>${ws.speed ? `<p class="small muted">${esc(ws.speed)}</p>` : ''}${attackButtons('ws', 'ws', ws.attacks)}<p class="small">El daño baja primero los PG de la bestia; si llegan a 0, volvés a tu forma y el exceso te lo llevás vos. No podés lanzar conjuros en esta forma.</p></section>`;
    else if (K.isDruid(state))
      out += `<div class="actions section-space">${button('Forma salvaje', 'ws-start', 'secondary')}</div>`;
    if (list.length)
      out += `<section class="card section-space"><div class="card-header"><h2>Compañeros</h2></div><div class="cmp-list">${list.map(c => block(c, { combat: true })).join('')}</div></section>`;
    return out;
  }

  // ---------- Elegir criatura ----------
  async function picker(mode) {
    await loadMonsters();
    const wild = mode === 'wild',
      lim = wild ? K.limits(state) : null;
    const list = MonsterData.filter(m => (wild ? !K.canBecome(state, m) : true)).sort(
      (a, b) => a.cr - b.cr || a.name.localeCompare(b.name),
    );
    modal(
      wild ? 'Forma salvaje' : 'Añadir compañero',
      `${
        wild
          ? `<p class="small">Druida nivel ${lim.level}: bestias de VD ${crText(lim.cr)} o menos${lim.fly ? '' : ', sin vuelo'}${lim.swim ? '' : ', sin nado'}. Gasta un uso de Forma salvaje.</p>${
              Classes.views(state).some(v => v.classId === 'druid' && v.classSubclass === 'druid-circle-of-the-moon')
                ? select(
                    'Acción de transformación',
                    'wildAction',
                    [
                      ['action', 'Acción'],
                      ['bonus', 'Acción adicional (Círculo de la Luna)'],
                    ],
                    'bonus',
                  )
                : ''
            }`
          : select('Tipo', 'kind', Object.entries(K.KINDS), 'familiar')
      }<input class="control" id="cmp-search" type="search" placeholder="Buscar criatura (español o inglés)" aria-label="Buscar criatura"><div class="magic-pick-list">${list
        .slice(0, 400)
        .map(
          m =>
            `<button type="button" class="magic-pick cmp-pick" data-action="${wild ? 'ws-pick' : 'cmp-pick'}" data-id="${esc(m.id)}" data-q="${esc((m.name + ' ' + (m.english || '')).toLowerCase())}"><b>${esc(m.name)}</b><span class="small muted">VD ${crText(m.cr)} · CA ${m.ac} · PG ${m.hp} · ${esc(K.speedEs(m.speed))}</span></button>`,
        )
        .join(
          '',
        )}</div>${wild ? '' : `<div class="actions section-space">${button('Compañero propio', 'cmp-custom')}</div>`}`,
    );
  }
  function addFromMonster(id) {
    const m = MonsterData.find(x => x.id === id),
      kind = document.querySelector('#dialog-form [name=kind]')?.value || 'familiar';
    if ((state.companions || []).length >= 12) throw Error('Hasta 12 compañeros por ficha.');
    commit('Compañero: ' + m.name, s => {
      s.companions = [...(s.companions || []), K.fromMonster(m, kind)];
    });
    $('#modal').close();
    toast(`${m.name} se sumó a tus compañeros.`);
  }
  function startWild(id) {
    const m = MonsterData.find(x => x.id === id);
    const action = document.querySelector('#dialog-form [name=wildAction]')?.value || 'action';
    commit('Forma salvaje: ' + m.name, s => {
      K.transform(s, m, action);
    });
    $('#modal').close();
    toast(`Te transformás en ${m.name}.`);
  }
  // Compañero propio o edición.
  function edit(id) {
    const c = (state.companions || []).find(x => x.id === id);
    const atk = c?.attacks?.[0];
    modal(
      c ? 'Editar compañero' : 'Compañero propio',
      `${field('Nombre', 'name', c?.name || '', 'text', 'required maxlength="100"')}<div class="form-grid">${select('Tipo', 'kind', Object.entries(K.KINDS), c?.kind || 'familiar')}${field('CA', 'ac', c?.ac ?? 12, 'number', 'min="0" max="40" required')}${field('PG máximos', 'maxHp', c?.maxHp ?? 5, 'number', 'min="1" max="9999" required')}${field('Velocidad', 'speed', c?.speed || '30 pies', 'text', 'maxlength="100"')}${field('Ataque principal', 'atkName', atk?.name || '', 'text', 'maxlength="60" placeholder="Mordisco"')}${field('Bono de ataque', 'atkBonus', atk?.bonus ?? 4, 'number', 'min="-10" max="30"')}${field('Daño', 'atkDamage', atk?.damage || '', 'text', 'maxlength="60" placeholder="1d6+2 perforante"')}</div><label class="field">Notas<textarea name="notes" maxlength="2000">${esc(c?.notes || '')}</textarea></label>`,
      fd => {
        const num = (k, a, b) => Math.max(a, Math.min(b, Math.trunc(Number(fd.get(k)) || 0)));
        const name = String(fd.get('name')).trim(),
          maxHp = num('maxHp', 1, 9999);
        if (!name) throw Error('Escribí un nombre.');
        const attack = String(fd.get('atkName')).trim()
          ? [
              {
                name: String(fd.get('atkName')).trim(),
                bonus: num('atkBonus', -10, 30),
                damage: String(fd.get('atkDamage')).trim(),
              },
            ]
          : [];
        const next = {
          ...(c || { id: K.uid() }),
          name,
          kind: String(fd.get('kind')),
          ac: num('ac', 0, 40),
          maxHp,
          hp: Math.min(c ? c.hp : maxHp, maxHp),
          speed: String(fd.get('speed')).trim(),
          attacks: c ? [...attack, ...c.attacks.slice(1)] : attack,
          notes: String(fd.get('notes') || '').trim(),
        };
        commit((c ? 'Compañero editado: ' : 'Compañero: ') + name, s => {
          s.companions = c ? s.companions.map(x => (x.id === c.id ? next : x)) : [...(s.companions || []), next];
        });
      },
      'Guardar',
    );
  }
  function hp(id) {
    const ws = id === 'ws',
      c = ws ? state.wildShape : state.companions.find(x => x.id === id);
    modal(
      `${c.name}: puntos de golpe`,
      `<p>Actuales: <b>${c.hp} / ${c.maxHp}</b></p><div class="hp-controls"><input class="control" name="amount" type="number" min="1" max="9999" value="1" aria-label="Cantidad">${button('Daño', 'cmp-hp-apply', 'danger', `data-id="${esc(id)}" data-sign="-1"`)}${button('Curar', 'cmp-hp-apply', '', `data-id="${esc(id)}" data-sign="1"`)}</div>${ws ? '<p class="small">El daño que te haga el DM ya baja solo los PG de la bestia; esto es para ajustes a mano.</p>' : ''}`,
    );
  }
  function hpApply(e) {
    const id = e.dataset.id,
      n = Math.trunc(Number(document.querySelector('#dialog-form [name=amount]').value)) * Number(e.dataset.sign);
    if (!n) throw Error('Usá una cantidad válida.');
    let msg = '';
    commit('PG de compañero', s => {
      if (id === 'ws') {
        if (n < 0) {
          const r = K.absorb(s, -n);
          if (r.toCharacter) s.hp = Math.max(0, s.hp - r.toCharacter);
          msg = r.reverted
            ? `La forma salvaje cae: volvés a tu forma${r.toCharacter ? ' y recibís ' + r.toCharacter + ' de daño' : ''}.`
            : '';
        } else s.wildShape.hp = Math.min(s.wildShape.maxHp, s.wildShape.hp + n);
      } else {
        const c = s.companions.find(x => x.id === id);
        c.hp = Math.max(0, Math.min(c.maxHp, c.hp + n));
      }
    });
    $('#modal').close();
    if (msg) toast(msg);
  }

  function install() {
    Object.assign(actions, {
      'cmp-add': () => picker('companion'),
      'cmp-pick': e => addFromMonster(e.dataset.id),
      'cmp-custom': () => edit(''),
      'cmp-edit': e => edit(e.dataset.id),
      'cmp-remove': e => {
        const c = state.companions.find(x => x.id === e.dataset.id);
        commit('Compañero quitado: ' + c.name, s => (s.companions = s.companions.filter(x => x.id !== c.id)));
      },
      'cmp-hp': e => hp(e.dataset.id),
      'ws-hp': () => hp('ws'),
      'cmp-hp-apply': hpApply,
      'cmp-damage': e => {
        const c = state.companions.find(x => x.id === e.dataset.id),
          a = c.attacks[Number(e.dataset.i)];
        rollDamage(`${c.name} · ${a.name}`, a.damage);
      },
      'ws-damage': e => {
        const a = state.wildShape.attacks[Number(e.dataset.i)];
        rollDamage(`${state.wildShape.name} · ${a.name}`, a.damage);
      },
      'ws-start': () => picker('wild'),
      'ws-pick': e => startWild(e.dataset.id),
      'ws-end': () => {
        commit('Fin de la forma salvaje', s => {
          Combat.use(s, 'bonus', 'Volver a tu forma');
          K.endWildShape(s);
        });
        toast('Volvés a tu forma.');
      },
    });
    document.addEventListener('input', e => {
      if (e.target.id !== 'cmp-search') return;
      const q = e.target.value.trim().toLowerCase();
      for (const b of document.querySelectorAll('.cmp-pick')) b.hidden = q && !b.dataset.q.includes(q);
    });
  }
  return { card, combat, install, rollDamage };
})();
