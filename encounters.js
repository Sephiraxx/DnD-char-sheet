/* Encuentros preparados del DM: se arman antes (solo en este dispositivo, nadie los ve) y se lanzan con un botón.
   Al lanzar: entra la party, entran todas las criaturas, se pide iniciativa y cada pantalla muestra la animación. */
const Encounters = (() => {
  'use strict';
  const STYLES = {
    battle: ['¡Combate!', 'Pelea'],
    ambush: ['¡Emboscada!', 'Emboscada'],
    boss: ['¡Peligro!', 'Enemigo poderoso'],
    reinforce: ['¡Refuerzos!', 'Refuerzos'],
  };
  // Animaciones de entrada por tipo de criatura (valor «tema/variante»).
  const THEMES = [
    ['undead', 'Muertos vivientes'],
    ['necro', 'Nigromante'],
    ['arcane', 'Mago o hechicero'],
    ['cult', 'Culto oscuro'],
    ['dragon/fire', 'Dragón de fuego'],
    ['dragon/ice', 'Dragón de hielo'],
    ['dragon/lightning', 'Dragón del rayo'],
    ['dragon/poison', 'Dragón venenoso'],
    ['dragon/acid', 'Dragón de ácido'],
    ['giant', 'Gigante, trol u ogro'],
    ['fiend', 'Demonio o diablo'],
    ['aberration', 'Aberración'],
    ['beast', 'Bestia'],
    ['monstrosity', 'Monstruosidad'],
    ['swarm', 'Enjambre'],
    ['warband', 'Banda de guerra (goblins, orcos, kobolds)'],
    ['humanoid', 'Humanoides (bandidos, soldados)'],
    ['web', 'Arañas'],
    ['elemental', 'Elemental'],
    ['construct', 'Constructo'],
    ['plant', 'Plantas'],
    ['ooze', 'Cieno'],
    ['fey', 'Feérico'],
    ['celestial', 'Celestial'],
  ];
  const key = () => 'dnd-dm-prepared-' + current;
  // Cada criatura tiene un id propio: el tablero la coloca en el mapa antes de lanzar el encuentro.
  const uid = () => 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  function list() {
    try {
      const v = JSON.parse(localStorage.getItem(key()) || '[]');
      if (!Array.isArray(v)) return [];
      let changed = false;
      for (const enc of v)
        for (const m of enc.monsters || [])
          if (!m.uid) {
            m.uid = uid();
            changed = true;
          }
      if (changed) localStorage.setItem(key(), JSON.stringify(v));
      return v;
    } catch {
      return [];
    }
  }
  function save(items) {
    localStorage.setItem(key(), JSON.stringify(items));
    draw();
  }
  const get = id => list().find(x => x.id === id);
  function update(id, fn) {
    const items = list(),
      enc = items.find(x => x.id === id);
    if (!enc) throw Error('Ese encuentro ya no está.');
    fn(enc);
    save(items);
  }
  function addMonsters(id, rows) {
    update(id, enc => enc.monsters.push(...rows.map(m => ({ ...m, uid: m.uid || uid() }))));
  }
  function addGenerated(campaignId, target, draft) {
    if (!current || !party || campaignId !== current) throw Error('Abrí la mesa donde querés guardar el encuentro.');
    const notes = String(draft.notes || '').trim(),
      name = String(draft.name || '').trim();
    if (
      !name ||
      name.length > 80 ||
      notes.length > 16000 ||
      !Array.isArray(draft.monsters) ||
      draft.monsters.length > 100
    )
      throw Error('Revisá el nombre, las notas y la cantidad de criaturas.');
    const monsters = draft.monsters.map(m => ({ ...m, uid: uid() }));
    if (target) {
      update(target, enc => {
        if ([enc.notes, notes].filter(Boolean).join('\n\n').length > 16000)
          throw Error('Las notas del encuentro admiten hasta 16000 caracteres.');
        enc.monsters.push(...monsters);
        enc.notes = [enc.notes, notes].filter(Boolean).join('\n\n');
      });
      return target;
    }
    const id = 'enc-' + uid();
    setOpen(id, true);
    save([...list(), { id, name, notes, style: 'battle', cry: '', theme: '', monsters, launched: false }]);
    return id;
  }

  // Encuentros plegados: se abren tocando el nombre. Cuáles quedaron abiertos se recuerda en este dispositivo.
  const OPEN_KEY = 'dnd-dm-prepared-open';
  let opened = new Set();
  try {
    opened = new Set(JSON.parse(localStorage.getItem(OPEN_KEY) || '[]'));
  } catch {
    /* sin almacenamiento: todos plegados */
  }
  function setOpen(id, on) {
    if (on) opened.add(id);
    else opened.delete(id);
    try {
      localStorage.setItem(OPEN_KEY, JSON.stringify([...opened]));
    } catch {
      /* queda en memoria */
    }
  }
  if (typeof document !== 'undefined')
    document.addEventListener(
      'toggle',
      e => e.target?.matches?.('details.prepared') && setOpen(e.target.dataset.id, e.target.open),
      true,
    );
  function card() {
    const items = list();
    return `<section class="card prepared-card"><div class="card-header"><h2>Encuentros preparados</h2><div class="actions">${button('Preparar encuentro', 'prep-new')}${typeof EncounterGeneratorUI !== 'undefined' ? button('Generar encuentro', 'encgen-open') : ''}</div></div><p class="small muted">Armalos antes de la sesión: se guardan en este dispositivo y los jugadores no ven nada hasta que tocás «¡Lanzar!».</p>${
      items.length
        ? items
            .map(enc => {
              const groups = new Map();
              for (const m of enc.monsters) groups.set(m.name, [...(groups.get(m.name) || []), m]);
              const rows = [...groups.entries()]
                .map(
                  ([name, ms]) =>
                    `<div class="list-row"><span>${ms.length > 1 ? ms.length + ' × ' : ''}<b>${esc(name)}</b> <span class="small muted">· PG ${esc(ms.map(m => m.hp).join(', '))} · CA ${esc(ms[0].ac)}</span></span>${button('×', 'prep-remove', 'text-btn', `data-id="${enc.id}" data-name="${esc(name)}" aria-label="Quitar ${esc(name)}"`)}</div>`,
                )
                .join('');
              const diff =
                typeof MonsterUI !== 'undefined'
                  ? MonsterUI.difficultyLine({ entries: enc.monsters.map(m => ({ monsterId: m.monsterId })) })
                  : '';
              // Resumen visible con el encuentro plegado: cuántas criaturas y qué tan difícil.
              const d =
                typeof MonsterUI !== 'undefined' && window.MonsterData && enc.monsters.length
                  ? MonsterUI.difficulty({ entries: enc.monsters.map(m => ({ monsterId: m.monsterId })) })
                  : null;
              const n = enc.monsters.length;
              const sum = [n ? `${n} ${n === 1 ? 'criatura' : 'criaturas'}` : 'sin criaturas', d?.label]
                .filter(Boolean)
                .join(' · ');
              return `<details class="prepared" data-id="${enc.id}"${opened.has(enc.id) ? ' open' : ''}><summary class="prepared-head"><span class="prepared-title"><b>${esc(enc.name)}</b> <span class="tag">${esc(STYLES[enc.style]?.[1] || '')}</span>${enc.launched ? ' <span class="tag">Ya lanzado</span>' : ''}<span class="small muted prepared-sum${d ? ' difficulty ' + esc(d.label.toLowerCase()) : ''}">${esc(sum)}</span></span></summary><div class="prepared-body">${rows || '<p class="small muted">Sin criaturas todavía.</p>'}${enc.notes ? `<details class="section-space"><summary>Notas privadas del encuentro</summary><p class="encounter-notes">${esc(enc.notes)}</p></details>` : ''}${diff}<div class="actions">${button('Criatura del catálogo', 'prep-srd', 'secondary', `data-id="${enc.id}"`)}${typeof EncounterGeneratorUI !== 'undefined' ? button('Generar desde tablas', 'encgen-open', 'secondary', `data-id="${enc.id}"`) : ''}${button('Criatura propia', 'prep-custom', 'secondary', `data-id="${enc.id}"`)}${button('Ver animación', 'prep-preview', 'secondary', `data-id="${enc.id}"`)}${button('Editar', 'prep-edit', 'secondary', `data-id="${enc.id}"`)}${button('Eliminar', 'prep-delete', 'secondary', `data-id="${enc.id}"`)}${button(enc.launched ? 'Lanzar otra vez' : '¡Lanzar!', 'prep-launch', '', `data-id="${enc.id}" ${enc.monsters.length ? '' : 'disabled'}`)}</div></div></details>`;
            })
            .join('')
        : '<p class="muted">Todavía no preparaste encuentros.</p>'
    }</section>`;
  }

  function form(enc = {}) {
    return `${field('Nombre (solo lo ves vos)', 'name', enc.name || '', 'text', 'required maxlength="80" placeholder="Emboscada en el camino"')}${select(
      'Tipo',
      'style',
      Object.entries(STYLES)
        .filter(([k]) => k !== 'reinforce')
        .map(([k, v]) => [k, v[1] + ' · «' + v[0] + '»']),
      enc.style || 'battle',
    )}${field('Texto que ven los jugadores (opcional)', 'cry', enc.cry || '', 'text', 'maxlength="40" placeholder="Usa el del tipo: ¡Emboscada!"')}${select('Animación', 'theme', [['', 'Automática (según la criatura más peligrosa)'], ...THEMES], enc.theme || '')}<label class="field">Notas privadas del encuentro<textarea name="notes" maxlength="16000">${esc(enc.notes || '')}</textarea></label>`;
  }
  const read = fd => ({
    name: String(fd.get('name')).trim(),
    style: STYLES[fd.get('style')] ? String(fd.get('style')) : 'battle',
    cry: String(fd.get('cry') || '').trim(),
    theme: THEMES.some(([k]) => k === fd.get('theme')) ? String(fd.get('theme')) : '',
    notes: String(fd.get('notes') || '').trim(),
  });
  // Tema de la animación: el elegido por el DM o el de la criatura más peligrosa.
  async function themeFor(enc) {
    if (enc.theme) {
      const [theme, variant = ''] = enc.theme.split('/');
      return { theme, variant };
    }
    await MonsterUI.load();
    return MonsterUI.encounterTheme(enc.monsters);
  }

  const initials = n =>
    typeof BoardCore !== 'undefined' ? BoardCore.initials(n) : String(n).slice(0, 2).toUpperCase();
  // Si el DM dejó el encuentro colocado en un mapa, las criaturas aparecen ahí (y se ofrece mostrar ese mapa).
  async function placeOnBoard(enc, links) {
    let staged;
    try {
      staged = await Cloud.stagedTokens(current, enc.id);
    } catch {
      return; // Sin tablero (migraciones 008/010): el encuentro se lanza igual.
    }
    if (!staged.length) return;
    await Cloud.linkStaged(
      current,
      links.filter(l => staged.some(s => s.stage === l.stage)),
    );
    const maps = [...new Set(staged.map(s => s.map_id))];
    try {
      const b = await Cloud.board(current);
      const name = b.maps.find(m => m.id === maps[0])?.name || 'su mapa';
      if (
        maps.length === 1 &&
        b.board?.map_id !== maps[0] &&
        confirm(`«${enc.name}» está colocado en «${name}». ¿Mostrar ese mapa en la mesa?`)
      )
        await Cloud.setBoardMap(current, maps[0]);
    } catch (e) {
      toast(e.message);
    }
  }
  async function launch(id) {
    const enc = get(id);
    if (!enc?.monsters.length) throw Error('Agregá criaturas al encuentro primero.');
    const links = [];
    await actions['init-party']();
    await encounterChange(async () => {
      const groups = new Map();
      for (const m of enc.monsters) groups.set(m.name, [...(groups.get(m.name) || []), m]);
      for (const [name, ms] of groups) {
        const names = await MonsterUI.claimNames(name, ms.length);
        for (let i = 0; i < ms.length; i++) {
          const m = ms[i];
          const added = await Cloud.addCombatant(
            current,
            { kind: 'monster', name: names[i], init: d20() + (m.initMod || 0), tiebreak: m.initMod || 0 },
            { hp: m.hp, max_hp: m.hp, ac: m.ac, saves: m.saves || {}, monster_id: m.monsterId || null },
          );
          links.push({
            stage: 'enc:' + enc.id + ':' + m.uid,
            combatantId: added.id,
            name: names[i],
            label: initials(names[i]),
          });
        }
      }
    });
    await placeOnBoard(enc, links);
    await announce(enc.style, enc.cry, enc.monsters.length, await themeFor(enc));
    await send('roll-request', { type: 'initiative', id: '', label: 'Iniciativa' });
    update(id, e => (e.launched = true));
    toast(`«${enc.name}» en juego: ${enc.monsters.length} criatura(s). Se pidió iniciativa.`);
  }
  // Aviso con animación en todas las pantallas (jugadores y DM).
  async function announce(style, cry, count, look = {}) {
    const payload = {
      style,
      cry: cry || STYLES[style]?.[0] || '¡Combate!',
      count,
      theme: look.theme || '',
      variant: look.variant || '',
    };
    await send('encounter-start', payload);
    EncounterFX.show(payload);
  }
  async function revealHidden() {
    const hidden = tracker().entries.filter(e => e.hidden);
    if (!hidden.length) throw Error('No hay criaturas ocultas.');
    await encounterChange(async () => {
      for (const e of hidden) await Cloud.updateCombatant(e.id, { hidden: false });
    });
    await MonsterUI.load();
    await announce(
      'reinforce',
      '',
      hidden.length,
      MonsterUI.encounterTheme(hidden.map(e => ({ monsterId: e.monsterId }))),
    );
  }

  function install() {
    Object.assign(actions, {
      'prep-new': () =>
        modal(
          'Preparar encuentro',
          form() + '<p class="small">Después agregá las criaturas. Su iniciativa se tira al lanzarlo.</p>',
          fd => {
            const v = read(fd);
            if (!v.name) throw Error('Ponele un nombre.');
            const id = 'enc-' + Date.now().toString(36);
            setOpen(id, true);
            save([...list(), { id, ...v, monsters: [], launched: false }]);
          },
          'Crear',
        ),
      'prep-edit': e => {
        const enc = get(e.dataset.id);
        modal('Editar encuentro', form(enc), fd => update(enc.id, x => Object.assign(x, read(fd))), 'Guardar');
      },
      'prep-delete': e => {
        if (!confirm('¿Eliminar este encuentro preparado?')) return;
        save(list().filter(x => x.id !== e.dataset.id));
      },
      'prep-srd': e => MonsterUI.picker(e.dataset.id),
      'prep-custom': e =>
        modal(
          'Criatura propia',
          `${field('Nombre', 'name', '', 'text', 'required maxlength="80" placeholder="Bandido"')}<div class="form-grid">${field('Cantidad', 'count', 1, 'number', 'min="1" max="20" required')}${field('Mod. de iniciativa', 'mod', 0, 'number', 'min="-10" max="20" required')}${field('PG', 'hp', 10, 'number', 'min="1" max="99999" required')}${field('CA', 'ac', 12, 'number', 'min="1" max="40" required')}</div>${select('Animación de esta criatura', 'theme', THEMES, 'humanoid')}`,
          fd => {
            const n = int(fd, 'count', 1, 20),
              name = String(fd.get('name')).trim();
            if (!name) throw Error('Ponele un nombre.');
            addMonsters(
              e.dataset.id,
              Array.from({ length: n }, () => ({
                name,
                monsterId: null,
                hp: int(fd, 'hp', 1, 99999),
                ac: int(fd, 'ac', 1, 40),
                saves: {},
                initMod: int(fd, 'mod', -10, 20),
                theme: THEMES.some(([k]) => k === fd.get('theme')) ? String(fd.get('theme')) : 'humanoid',
              })),
            );
          },
          'Agregar',
        ),
      'prep-remove': e => update(e.dataset.id, x => (x.monsters = x.monsters.filter(m => m.name !== e.dataset.name))),
      'prep-launch': e => launch(e.dataset.id),
      // Solo en esta pantalla: no avisa a los jugadores.
      'prep-preview': async e => {
        const enc = get(e.dataset.id);
        EncounterFX.show({
          style: enc.style,
          cry: enc.cry || STYLES[enc.style]?.[0],
          count: enc.monsters.length,
          ...(await themeFor(enc)),
        });
      },
      'init-reveal': () => revealHidden(),
    });
  }
  install();
  return { card, get, addMonsters, addGenerated, STYLES };
})();
