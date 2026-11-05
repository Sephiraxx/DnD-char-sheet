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
    panel = null; // ataque abierto: { entryId, action, last }

  // Bestiario del SRD y, si hay, las criaturas importadas de la biblioteca del DM.
  function load() {
    const lib = () => (typeof LibraryUI !== 'undefined' ? LibraryUI.attach() : null);
    if (window.MonsterData) return Promise.resolve(lib());
    return (loading ||= new Promise((ok, fail) => {
      const s = document.createElement('script');
      s.src = './monsters-data.js';
      s.onload = ok;
      s.onerror = () => {
        loading = null;
        fail(Error('No se pudieron cargar los monstruos. Revisá tu conexión.'));
      };
      document.head.append(s);
    })).then(lib);
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
    if (!window.MonsterData) {
      // Después de recargar, el bestiario todavía no está: se carga y se vuelve a dibujar con la dificultad.
      if (t.entries.some(e => e.monsterId))
        load()
          .then(() => typeof draw === 'function' && draw())
          .catch(() => {});
      return '';
    }
    const d = difficulty(t);
    return d
      ? `<p class="small difficulty ${esc(d.label.toLowerCase())}"><b>Dificultad: ${d.label}</b> · ${d.adjusted} XP ajustado (${d.xp} XP, ${d.each} por personaje). Umbrales: ${d.sums.join(' / ')}.</p>`
      : '';
  }

  // ---------- Bestiario: elegir criaturas (tarjetas, filtros y una bandeja con la dificultad) ----------
  // target: id de un encuentro preparado (las criaturas se guardan ahí y no van a la iniciativa).
  let target = null;
  const TYPE_GROUPS = [
    ['humanoide', 'Humanoides'],
    ['bestia', 'Bestias'],
    ['muerto viviente', 'Muertos vivientes'],
    ['monstruosidad', 'Monstruosidades'],
    ['dragón', 'Dragones'],
    ['infernal', 'Infernales'],
    ['gigante', 'Gigantes'],
    ['elemental', 'Elementales'],
    ['aberración', 'Aberraciones'],
    ['constructo', 'Constructos'],
    ['feérico', 'Feéricos'],
    ['celestial', 'Celestiales'],
    ['planta', 'Plantas'],
    ['cieno', 'Cienos'],
    ['enjambre', 'Enjambres'],
  ];
  const CR_RANGES = [
    ['', 'Todos'],
    ['party', 'Para tu party'],
    ['0-0.5', 'VD 0 a 1/2'],
    ['1-4', 'VD 1 a 4'],
    ['5-10', 'VD 5 a 10'],
    ['11-16', 'VD 11 a 16'],
    ['17-30', 'VD 17+'],
  ];
  const TAGS = [
    ['fly', '🪽 Vuela'],
    ['swim', '🌊 Nada'],
    ['spells', '✦ Conjuros'],
    ['legendary', '♛ Legendaria'],
    ['ranged', '🏹 A distancia'],
  ];
  const baseType = m => m.type.split(' (')[0];
  const has = {
    fly: m => /vuel|volar|fly/i.test(m.speed),
    swim: m => /nad|swim/i.test(m.speed),
    spells: m => m.traits.some(([n]) => /conjuros/i.test(n)),
    legendary: m => m.legendary.length > 0,
    ranged: m => m.actions.some(a => /a distancia/i.test(a.d || '')),
  };
  const RECENT_KEY = 'dnd-dm-recent-monsters';
  const recent = () => {
    try {
      const v = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
      return Array.isArray(v) ? v.filter(byId) : [];
    } catch {
      return [];
    }
  };
  const pick = {
    book: '', // '' todos, 'srd' o el nombre de un libro de la biblioteca
    type: '',
    cr: '',
    tags: new Set(),
    tray: new Map(), // id → cantidad
    open: null, // tarjeta con el bloque de estadísticas abierto
    shown: 48,
    hp: 'avg',
    hidden: false,
  };
  const partyLevel = () => {
    const ls = (party?.characters || []).map(c => PV.summarize(c.data).level || 1);
    return ls.length ? Math.round(ls.reduce((a, b) => a + b, 0) / ls.length) : 0;
  };
  function crIn(m, range) {
    if (!range) return true;
    if (range === 'party') {
      const L = partyLevel() || 1;
      return m.cr >= Math.min(L / 4, 1) - 0.01 && m.cr <= L + 1;
    }
    const [a, b] = range.split('-').map(Number);
    return m.cr >= a && m.cr <= b;
  }
  async function picker(prepId = null) {
    await load();
    target = prepId;
    pick.tray = new Map();
    pick.open = null;
    pick.shown = 48;
    modal(
      prepId ? 'Agregar a «' + (Encounters.get(prepId)?.name || 'encuentro') + '»' : 'Agregar criaturas',
      `<div class="bestiary-search">${field('Buscar', 'q', query, 'search', 'id="monster-q" placeholder="goblin, dragón, zombi, lobo…" autocomplete="off"')}</div><div id="bestiary-filters"></div><div id="monster-results" class="bestiary-grid"></div><div id="bestiary-tray" class="bestiary-tray"></div>`,
      null,
    );
    const d = document.getElementById('modal');
    d.classList.add('bestiary-modal');
    d.addEventListener('close', () => d.classList.remove('bestiary-modal'), { once: true });
    drawPicker();
    document.getElementById('monster-q')?.focus();
  }
  const chip = (action, v, label, on, extra = '') =>
    `<button type="button" class="chip ${on ? 'selected' : ''}" data-action="${action}" data-v="${esc(v)}" aria-pressed="${on}" ${extra}>${label}</button>`;
  function drawPicker() {
    drawFilters();
    drawResults();
    drawTray();
  }
  function drawFilters() {
    const box = document.getElementById('bestiary-filters');
    if (!box) return;
    const L = partyLevel();
    const used = new Set(MonsterData.map(baseType));
    const rec = recent();
    // Libros: el SRD y los de la biblioteca del DM (si importó alguno).
    const bookList = [...new Set(MonsterData.map(m => m.book).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, 'es'),
    );
    const booksRow = bookList.length
      ? `<div class="chips bestiary-chips" role="group" aria-label="Libro">${chip('bes-book', '', 'Todos los libros', !pick.book)}${chip('bes-book', 'srd', 'SRD', pick.book === 'srd')}${bookList.map(b => chip('bes-book', b, esc(b), pick.book === b)).join('')}</div>`
      : '';
    box.innerHTML =
      booksRow +
      `<div class="chips bestiary-chips" role="group" aria-label="Tipo">${chip('bes-type', '', 'Todos', !pick.type)}${TYPE_GROUPS.filter(
        ([k]) => used.has(k),
      )
        .map(([k, l]) => chip('bes-type', k, l, pick.type === k))
        .join('')}</div><div class="chips bestiary-chips" role="group" aria-label="Desafío">${CR_RANGES.map(([k, l]) =>
        k === 'party' && !L ? '' : chip('bes-cr', k, k === 'party' ? `${l} (nivel ${L})` : l, pick.cr === k),
      ).join(
        '',
      )}<span class="bestiary-sep"></span>${TAGS.map(([k, l]) => chip('bes-tag', k, l, pick.tags.has(k))).join('')}</div>${
        rec.length && !query.trim()
          ? `<div class="chips bestiary-recent"><span class="small muted">Usadas hace poco:</span>${rec
              .slice(0, 10)
              .map(id => chip('bes-add', id, '+ ' + esc(byId(id).name), false, `data-id="${id}"`))
              .join('')}</div>`
          : ''
      }`;
  }
  function filtered() {
    const q = query.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    return MonsterData.filter(
      m =>
        (!q || norm(m.name + ' ' + (m.english || '') + ' ' + m.type).includes(q)) &&
        (!pick.type || baseType(m) === pick.type) &&
        (!pick.book || (pick.book === 'srd' ? !m.book : m.book === pick.book)) &&
        crIn(m, pick.cr) &&
        [...pick.tags].every(k => has[k](m)),
    ).sort((a, b) => a.cr - b.cr || a.name.localeCompare(b.name, 'es'));
  }
  function card(m) {
    const n = pick.tray.get(m.id) || 0,
      tags = TAGS.filter(([k]) => has[k](m)).map(([, l]) => l.split(' ')[0]);
    const open = pick.open === m.id;
    return `<article class="bestiary-card ${n ? 'picked' : ''} ${open ? 'open' : ''}"><button type="button" class="bestiary-main" data-action="bes-add" data-id="${m.id}" title="Agregar uno"><span class="bestiary-cr">VD ${crText(m.cr)}</span><span class="bestiary-name">${esc(m.name)}</span><span class="bestiary-meta">${esc(cap(m.type.split(' (')[0]))} · ${esc(m.size)}${m.english && m.english !== m.name ? ' · ' + esc(m.english) : ''}${m.book ? ' · ' + esc(m.book.length > 30 ? m.book.slice(0, 28) + '…' : m.book) : ''}${m.issues ? ' · ⚠' : ''}</span><span class="bestiary-stats"><span>CA <b>${m.ac}</b></span><span>PG <b>${m.hp}</b></span><span>${m.xp} XP</span>${tags.length ? `<span class="bestiary-tags">${tags.join(' ')}</span>` : ''}</span></button>${n ? `<span class="bestiary-count">${n}</span>` : ''}<button type="button" class="bestiary-info" data-action="bes-info" data-id="${m.id}" aria-expanded="${open}" aria-label="Ver estadísticas de ${esc(m.name)}" title="Ver estadísticas">${open ? '×' : 'ⓘ'}</button>${open ? `<div class="bestiary-block">${statBlock(m)}</div>` : ''}</article>`;
  }
  function drawResults() {
    const box = document.getElementById('monster-results');
    if (!box) return;
    const list = filtered(),
      shown = list.slice(0, pick.shown);
    box.innerHTML = list.length
      ? `<p class="small muted bestiary-count-line">${list.length} criatura${list.length === 1 ? '' : 's'} · tocá una tarjeta para sumarla, ⓘ para ver su bloque</p>${shown.map(card).join('')}${list.length > shown.length ? `<div class="bestiary-more">${button('Ver ' + Math.min(48, list.length - shown.length) + ' más', 'bes-more', 'secondary')}</div>` : ''}`
      : '<p class="muted">Ninguna criatura coincide. Probá con otro nombre (también en inglés) o quitá filtros.</p>';
  }
  // Bandeja: lo elegido, con cantidades y la dificultad del encuentro tal como quedaría.
  function drawTray() {
    const box = document.getElementById('bestiary-tray');
    if (!box) return;
    const items = [...pick.tray.entries()].filter(([, n]) => n > 0);
    const total = items.reduce((a, [, n]) => a + n, 0);
    if (!total) {
      box.innerHTML = `<p class="small muted">Elegí criaturas para armar ${target ? 'el encuentro' : 'el combate'}. La dificultad se calcula con tu party.</p>`;
      return;
    }
    const before = target
      ? (Encounters.get(target)?.monsters || []).map(x => ({ monsterId: x.monsterId }))
      : tracker()
          .entries.filter(x => x.kind === 'monster')
          .map(x => ({ monsterId: x.monsterId, hp: x.hp }));
    const after = [...before, ...items.flatMap(([id, n]) => Array.from({ length: n }, () => ({ monsterId: id })))];
    const d = difficulty({ entries: after });
    box.innerHTML = `<div class="bestiary-picked">${items
      .map(
        ([id, n]) =>
          `<span class="bestiary-pill"><button type="button" class="text-btn" data-action="bes-dec" data-id="${id}" aria-label="Uno menos">−</button><b>${n} × ${esc(byId(id).name)}</b><button type="button" class="text-btn" data-action="bes-add" data-id="${id}" aria-label="Uno más">+</button></span>`,
      )
      .join(
        '',
      )}</div><div class="bestiary-commit">${d ? `<span class="difficulty-badge ${esc(d.label.toLowerCase())}" title="${d.adjusted} XP ajustado · umbrales ${d.sums.join(' / ')}">${d.label}${before.length ? ' (con las que ya están)' : ''}</span>` : '<span class="small muted">Sin personajes en la mesa: no se calcula la dificultad.</span>'}<label class="field bestiary-hp">PG<select name="bes-hp" data-action="bes-hp"><option value="avg" ${pick.hp === 'avg' ? 'selected' : ''}>Promedio</option><option value="roll" ${pick.hp === 'roll' ? 'selected' : ''}>Tirados</option></select></label>${target ? '' : `<label class="check"><input type="checkbox" name="bes-hidden" ${pick.hidden ? 'checked' : ''}>Ocultas</label>`}${button('Vaciar', 'bes-clear', 'text-btn')}${button(`Agregar ${total} ${target ? 'al encuentro' : 'a la iniciativa'}`, 'bes-commit', '')}</div>`;
  }
  function trayAdd(id, k) {
    const n = Math.max(0, Math.min(20, (pick.tray.get(id) || 0) + k));
    if (n) pick.tray.set(id, n);
    else pick.tray.delete(id);
    drawResults();
    drawTray();
  }
  async function commit() {
    const items = [...pick.tray.entries()].filter(([, n]) => n > 0);
    if (!items.length) throw Error('Elegí al menos una criatura.');
    const hpOf = m => (pick.hp === 'roll' ? Math.max(1, rollDice(m.hd).total) : m.hp);
    let total = 0;
    for (const [id, n] of items) {
      const m = byId(id),
        saves = saveBonuses(m);
      total += n;
      if (target)
        Encounters.addMonsters(
          target,
          Array.from({ length: n }, () => ({
            name: m.name,
            monsterId: m.id,
            hp: hpOf(m),
            ac: m.ac,
            saves,
            initMod: mod(m.ab[1]),
          })),
        );
      else {
        const names = await claimNames(m.name, n);
        for (let i = 0; i < n; i++) {
          const hp = hpOf(m);
          await Cloud.addCombatant(
            current,
            {
              kind: 'monster',
              name: names[i],
              init: d20() + mod(m.ab[1]),
              tiebreak: mod(m.ab[1]),
              hidden: pick.hidden,
            },
            { hp, max_hp: hp, ac: m.ac, saves, monster_id: m.id },
          );
        }
      }
    }
    try {
      const ids = items.map(([id]) => id);
      localStorage.setItem(
        RECENT_KEY,
        JSON.stringify([...ids, ...recent().filter(x => !ids.includes(x))].slice(0, 20)),
      );
    } catch {}
    document.getElementById('modal').close();
    if (!target) await refresh();
    toast(
      `${total} criatura${total === 1 ? '' : 's'} ${target ? 'en «' + (Encounters.get(target)?.name || 'el encuentro') + '»' : 'en la iniciativa' + (pick.hidden ? ' (ocultas)' : '')}.`,
    );
    pick.tray = new Map();
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
    // Abreviaturas en inglés (datos viejos) o en español (FUE, DES, CON, INT, SAB, CAR).
    const names = {
      str: ['STR', 'FUE'],
      dex: ['DEX', 'DES'],
      con: ['CON'],
      int: ['INT'],
      wis: ['WIS', 'SAB'],
      cha: ['CHA', 'CAR'],
    };
    for (const part of String(m.saves || '').split(',')) {
      const x = /([A-Z]{3})\s*\+(\d+)/i.exec(part.trim());
      if (!x) continue;
      const key = Object.keys(names).find(k => names[k].includes(x[1].toUpperCase()));
      if (key) out[key] = Number(x[2]);
    }
    return out;
  }

  // ---------- Bloque de estadísticas ----------
  const SHORT_ES = { str: 'FUE', dex: 'DES', con: 'CON', int: 'INT', wis: 'SAB', cha: 'CAR' };
  const cap = t =>
    String(t || '')
      .charAt(0)
      .toUpperCase() + String(t || '').slice(1);
  function statBlock(m, entry = null) {
    const line = (k, v) => (v ? `<p class="small"><b>${k}</b> ${esc(v)}</p>` : '');
    const act = (a, kind) =>
      `<div class="feature monster-action"><p><b>${esc(a.n)}.</b> ${esc(a.d)}</p>${
        entry && (a.atk !== undefined || a.dc || a.dmg)
          ? `<div class="actions">${a.atk !== undefined ? button('Atacar', 'monster-attack', '', `data-entry="${entry.id}" data-kind="${kind}" data-name="${esc(a.n)}"`) : ''}${a.dc ? button('Pedir salvación', 'monster-save', 'secondary', `data-entry="${entry.id}" data-kind="${kind}" data-name="${esc(a.n)}"`) : ''}${a.atk === undefined && a.dmg ? button('Tirar daño', 'monster-attack', 'secondary', `data-entry="${entry.id}" data-kind="${kind}" data-name="${esc(a.n)}" data-noattack="1"`) : ''}</div>`
          : ''
      }</div>`;
    return `<p class="small muted">${esc(cap(m.type))} ${esc(m.size.toLowerCase())}, ${esc(m.align)} · VD ${crText(m.cr)} (${m.xp} XP)</p>
      <p><b>CA</b> ${m.ac} · <b>PG</b> ${entry ? (entry.hp ?? '—') + ' / ' + entry.max : m.hp + ' (' + esc(m.hd) + ')'} · <b>Velocidad</b> ${esc(m.speed)}</p>
      <dl class="party-stats monster-abilities">${ABIL.map((a, i) => `<div><dt>${SHORT_ES[a]}</dt><dd>${m.ab[i]} (${sign(mod(m.ab[i]))})</dd></div>`).join('')}</dl>
      ${line('Salvaciones', m.saves)}${line('Habilidades', m.skills)}${line('Vulnerable a', m.vuln)}${line('Resistencias', m.res)}${line('Inmunidades', m.imm)}${line('Inmune a estados', m.cimm)}${line('Sentidos', m.senses)}${line('Idiomas', m.lang)}
      ${m.traits.map(([n, d]) => `<div class="feature"><p class="monster-feature-text"><b>${esc(n)}.</b> ${esc(d)}</p></div>`).join('')}
      ${m.actions.length ? '<h3 class="section-space">Acciones</h3>' + m.actions.map(a => act(a, 'actions')).join('') : ''}
      ${m.reactions.length ? '<h3 class="section-space">Reacciones</h3>' + m.reactions.map(a => act(a, 'reactions')).join('') : ''}
      ${m.legendary.length ? '<h3 class="section-space">Acciones legendarias</h3>' + m.legendary.map(a => act(a, 'legendary')).join('') : ''}
      <p class="small muted section-space">${m.book ? `De tu biblioteca: ${esc(m.book)}${m.page ? ', pág. ' + m.page : ''}.${m.issues ? ' Datos incompletos: ' + esc(m.issues.join(', ')) + '.' : ''}` : 'Basado en el SRD 5.1 (CC-BY-4.0), traducido al español.'}</p>`;
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
    // Desde el tablero: objetivo tocado, flanqueo (ventaja cuerpo a cuerpo) y enemigo al lado (desventaja a distancia).
    const bp = window.boardPick?.entryId === entryId ? window.boardPick : null,
      reach = window.BoardCore ? BoardCore.reachFromText([a.d]) : 5,
      melee = /cuerpo a cuerpo/i.test(a.d),
      ranged = /a distancia/i.test(a.d) && (!melee || (bp?.distance || 0) > reach),
      adv = bp && !ranged && melee && bp.flank,
      dis = bp && ranged && bp.foeAdjacent,
      mode = adv && !dis ? 'adv' : dis && !adv ? 'dis' : '',
      notes = [
        adv ? 'Flanqueo con ' + bp.flankWith + ': ventaja' : '',
        dis ? 'Enemigo a 5 pies (ataque a distancia): desventaja' : '',
        bp && melee && !ranged && bp.distance > reach
          ? `${bp.name} está a ${bp.distance} pies: fuera del alcance de ${reach}`
          : '',
      ].filter(Boolean);
    modal(
      `${e.name}: ${a.n}`,
      `<p class="small">${esc(a.d)}</p>${
        ts.length
          ? select(
              'Objetivo',
              'target',
              ts.map(t => [t.id, `${t.name} · CA ${t.x.ac} · ${t.x.hp ?? '—'}/${t.x.maxHP} PG`]),
              bp?.characterId || '',
            )
          : '<p class="muted">No hay fichas en la mesa.</p>'
      }
      ${notes.length && !noAttack ? `<p class="small condition-note">${esc(notes.join(' · '))}</p>` : ''}
      ${
        noAttack
          ? ''
          : `<fieldset class="attack-adv"><legend>Ataque ${sign(a.atk)}</legend>${[
              ['', 'Normal'],
              ['adv', 'Ventaja'],
              ['dis', 'Desventaja'],
            ]
              .map(
                ([v, l]) =>
                  `<label class="check"><input type="radio" name="adv" value="${v}" ${mode === v ? 'checked' : ''}>${l}</label>`,
              )
              .join('')}</fieldset>`
      }
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
    let total,
      text,
      parts = null;
    const own = fd.get('myDamage');
    if (own) {
      total = Number(own);
      if (!Number.isInteger(total) || total < 0) throw Error('Revisá la suma del daño.');
      text = 'dados físicos ' + total;
      document.querySelector('#dialog-form [name=myDamage]').value = '';
    } else {
      parts = (a.dmg || []).map(([d, type]) => {
        const r = rollDice(d);
        const extra = crit && r.n ? rollDice(r.n + 'd' + r.sides) : { rolls: [], total: 0 };
        return { type, mod: r.mod, rolls: [...r.rolls, ...extra.rolls], total: r.total + extra.total };
      });
      total = parts.reduce((s, p) => s + p.total, 0);
      text = parts.map(p => `${p.rolls.join('+') || '—'}${p.mod ? ' ' + sign(p.mod) : ''} ${p.type}`).join(' · ');
    }
    panel.damage = total;
    panel.parts = parts && parts.map(p => ({ amount: p.total, type: p.type }));
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
    const amount = fd.has('half') ? Math.floor(base / 2) : base,
      { a } = findAction(panel.entryId, panel.kind, panel.name),
      untouched = panel.parts && base === panel.damage,
      parts = untouched
        ? panel.parts.map(p => ({ amount: fd.has('half') ? Math.floor(p.amount / 2) : p.amount, type: p.type }))
        : null;
    if (amount > 0)
      await send(
        'damage',
        {
          amount,
          ...(parts ? { parts } : { type: a.dmg?.[0]?.[1] || '' }),
          source: tracker().entries.find(x => x.id === panel.entryId)?.name + ': ' + panel.name,
        },
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
    const ts = targets(),
      // Otras criaturas de la iniciativa (aliadas del monstruo o no): sus salvaciones las tira la pantalla del DM.
      creatures = tracker().entries.filter(x => x.kind === 'monster' && x.id !== entryId && x.hp !== 0);
    modal(
      `${e.name}: ${a.n}`,
      `<p class="small">${esc(a.d)}</p><p>Salvación de <b>${ABIL_ES[ability] || ability}</b> · CD <b>${dc}</b>${success === 'half' ? ' · mitad si la superan' : ''}</p>
      ${ts.length ? `<fieldset class="target-list"><legend>Quiénes quedan en el área</legend>${ts.map(t => `<label class="check"><input type="checkbox" name="who" value="${esc(t.id)}" checked>${esc(t.name)}</label>`).join('')}</fieldset>` : '<p class="muted">No hay fichas en la mesa.</p>'}
      ${creatures.length && (a.dmg || []).length ? `<fieldset class="target-list"><legend>Otras criaturas en el área (fuego amigo)</legend>${creatures.map(c => `<label class="check"><input type="checkbox" name="foe" value="${esc(c.id)}">${esc(c.name)}</label>`).join('')}<p class="small">Sus salvaciones quedan en «Salvaciones pendientes» para tirarlas con su bono.</p></fieldset>` : ''}
      ${parts.length ? `<p class="small">Daño tirado: ${esc(text)} = <b>${rolled}</b></p>${field('Daño (cambialo si tiraste dados físicos o querés bajarlo)', 'damage', rolled, 'number', 'min="0" max="9999" inputmode="numeric"')}` : ''}
      <p class="small">${parts.length ? 'Cada jugador tira su salvación y su ficha se aplica el daño completo o la mitad. Los resultados llegan a «En la mesa».' : 'Las respuestas llegan a «En la mesa» con éxito o fallo.'}</p>`,
      async fd => {
        const who = fd.getAll('who'),
          foes = fd.getAll('foe');
        if (!who.length && !foes.length) throw Error('Elegí al menos una ficha o criatura.');
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
        const request = {
          caster: e.name,
          spell: a.n,
          ability,
          abilityName: ABIL_ES[ability] || ability,
          dc,
          half: success === 'half',
          damage,
          types: parts.map(p => p.type).join(', '),
        };
        for (const id of who) await send('area-save', request, id);
        if (foes.length)
          await send('creature-save', {
            ...request,
            targets: foes
              .map(id => tracker().entries.find(x => x.id === id))
              .filter(Boolean)
              .map(c => ({ id: c.id, name: c.name })),
          });
        toast(
          `${a.n}: ${[who.length ? who.length + (who.length === 1 ? ' ficha tira' : ' fichas tiran') + ' su salvación' : '', foes.length ? foes.length + ' criatura(s) en «Salvaciones pendientes»' : ''].filter(Boolean).join(' · ')}.`,
        );
      },
      'Pedir salvaciones',
    );
  }

  Object.assign(actions, {
    'init-monster-srd': () => picker(),
    'monster-view': e => view(e.dataset.id),
    'bes-type': e => {
      pick.type = e.dataset.v;
      pick.shown = 48;
      drawPicker();
    },
    'bes-cr': e => {
      pick.cr = e.dataset.v;
      pick.shown = 48;
      drawPicker();
    },
    'bes-book': e => {
      pick.book = e.dataset.v;
      pick.shown = 48;
      drawPicker();
    },
    'bes-tag': e => {
      pick.tags.has(e.dataset.v) ? pick.tags.delete(e.dataset.v) : pick.tags.add(e.dataset.v);
      pick.shown = 48;
      drawPicker();
    },
    'bes-add': e => trayAdd(e.dataset.id, 1),
    'bes-dec': e => trayAdd(e.dataset.id, -1),
    'bes-info': e => {
      pick.open = pick.open === e.dataset.id ? null : e.dataset.id;
      drawResults();
    },
    'bes-more': () => {
      pick.shown += 48;
      drawResults();
    },
    'bes-clear': () => {
      pick.tray = new Map();
      drawResults();
      drawTray();
    },
    'bes-commit': commit,
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
      pick.shown = 48;
      drawFilters();
      drawResults();
    }
  });
  document.addEventListener('change', e => {
    if (e.target.name === 'bes-hp') pick.hp = e.target.value === 'roll' ? 'roll' : 'avg';
    if (e.target.name === 'bes-hidden') pick.hidden = e.target.checked;
  });
  // Si ya hay criaturas del SRD en la iniciativa, se cargan los datos para la dificultad.
  if (
    Object.keys(localStorage).some(
      k => k.startsWith('dnd-dm-initiative-') && localStorage.getItem(k).includes('monsterId'),
    )
  )
    load().then(() => typeof draw === 'function' && draw());
  // Animación de entrada según el tipo de criatura (y versiones propias para las más comunes).
  const TYPE_THEME = {
    'muerto viviente': 'undead',
    dragón: 'dragon',
    gigante: 'giant',
    infernal: 'fiend',
    aberración: 'aberration',
    bestia: 'beast',
    monstruosidad: 'monstrosity',
    enjambre: 'swarm',
    humanoide: 'humanoid',
    elemental: 'elemental',
    constructo: 'construct',
    planta: 'plant',
    cieno: 'ooze',
    feérico: 'fey',
    celestial: 'celestial',
  };
  function themeOf(id) {
    const m = byId(id);
    if (!m) return null;
    const [type, sub = ''] = m.type.split(' (');
    let theme = TYPE_THEME[type] || 'humanoid',
      variant = '';
    if (/spider/.test(m.id)) theme = 'web';
    else if (m.id === 'lich') theme = 'necro';
    else if (/^(arch)?mage$/.test(m.id)) theme = 'arcane';
    else if (/^cult/.test(m.id)) theme = 'cult';
    else if (theme === 'humanoid' && /goblinoid|orc|kobold|gnoll/.test(sub)) theme = 'warband';
    if (theme === 'dragon')
      variant = /white|silver/.test(m.id)
        ? 'ice'
        : /blue|bronze/.test(m.id)
          ? 'lightning'
          : /green/.test(m.id)
            ? 'poison'
            : /black|copper/.test(m.id)
              ? 'acid'
              : 'fire';
    return { theme, variant, cr: m.cr };
  }
  // La criatura más peligrosa marca el tono; si todas son propias, el tema que más se repite.
  function encounterTheme(list) {
    const known = list.map(x => (x.monsterId ? themeOf(x.monsterId) : null)).filter(Boolean);
    if (known.length) {
      const top = known.reduce((a, b) => (b.cr > a.cr ? b : a));
      return { theme: top.theme, variant: top.variant };
    }
    const counts = {};
    for (const x of list) if (x.theme) counts[x.theme] = (counts[x.theme] || 0) + 1;
    const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
    const [theme, variant = ''] = best.split('/');
    return { theme, variant };
  }
  return {
    load,
    difficulty,
    difficultyLine,
    crText,
    picker,
    claimNames,
    themeOf,
    encounterTheme,
    xp: id => byId(id)?.xp || 0,
    byId,
  };
})();
