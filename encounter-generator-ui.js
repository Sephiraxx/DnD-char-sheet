/* DM-only preview. Saving prepares a local encounter; launching remains a separate action. */
const EncounterGeneratorUI = (() => {
  'use strict';
  const G = EncounterGenerator;
  // Las tablas pesan 740 KB: se piden recién al abrir el generador (primero las oficiales, después las propias).
  let D = globalThis.EncounterTablesData || null,
    loading = null;
  const script = src =>
    new Promise((ok, fail) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = ok;
      s.onerror = () => fail(Error('No se pudieron cargar las tablas de encuentros. Revisá tu conexión.'));
      document.head.append(s);
    });
  function loadTables() {
    if (D) return Promise.resolve();
    loading ||= script('./encounter-tables-data.js')
      .then(() => script('./curated-encounter-data.js'))
      .then(() => {
        D = globalThis.EncounterTablesData;
      })
      .catch(err => {
        loading = null;
        throw err;
      });
    return loading;
  }
  let session = null;
  const el = id => document.getElementById(id);
  const table = () => D.tables.find(t => t.id === session?.tableId);
  const group = () => D.groups.find(g => g.id === table()?.group);
  const range = r => (r.min === r.max ? String(r.min) : `${r.min}–${r.max}`);
  const fieldValue = name => document.getElementById('dialog-form')?.elements.namedItem(name)?.value || '';
  const bodyText = row =>
    row.parts.map(p => (p.type === 'text' ? p.text : p.type === 'dice' ? p.expression : p.display)).join('');
  const sourceText = t =>
    `${D.groups.find(g => g.id === t.group)?.book || t.source}${t.page ? ' · ed. inglesa p. ' + t.page : ''}`;
  const language = t => (t.language === 'es' ? 'castellano' : 'inglés');
  const levels = () => (party?.characters || []).map(c => PV.summarize(c.data).level || 1);
  function defaultTable(groupId) {
    const choices = D.tables.filter(t => t.group === groupId),
      ls = levels();
    const level = ls.length ? Math.round(ls.reduce((a, b) => a + b, 0) / ls.length) : 1;
    return (choices.find(t => t.minLevel <= level && t.maxLevel >= level) || choices[0]).id;
  }
  function card() {
    return `<section class="card section-space"><div class="card-header"><h2>Generador de encuentros</h2>${button('Generar encuentro', 'encgen-open')}</div><p>Elegí un entorno y tirá en las tablas publicadas o en las tablas propias con criaturas oficiales de 2014. Podés consultar y copiar los resultados sin abrir una mesa.</p></section>`;
  }
  async function open(target = null) {
    await loadTables();
    await MonsterUI.load({ sharedOnly: true });
    if (target && !Encounters.get(target)) throw Error('Ese encuentro ya no está.');
    let groupId = 'XGE-forest';
    try {
      const previous = localStorage.getItem('dnd-encounter-table');
      if (D.tables.some(t => t.id === previous)) groupId = D.tables.find(t => t.id === previous).group;
    } catch {}
    session = { target, campaignId: current, tableId: defaultTable(groupId), result: null };
    modal(
      'Generador de encuentros',
      `<div class="encgen"><p class="small">Encuentros aleatorios para las reglas de 2014. Las tablas creadas para la herramienta se identifican como «tabla propia». Pueden incluir combate, aliados o sucesos de exploración. Revisá la dificultad y el contexto antes de usarlos.</p><div class="form-grid">${select(
        'Entorno / contexto',
        'encgen-group',
        D.groups
          .slice()
          .sort((a, b) => a.name.localeCompare(b.name, 'es'))
          .map(g => [g.id, `${g.name} · ${g.curated ? 'tabla propia' : g.source}`]),
        groupId,
      )}<div id="encgen-table-select"></div></div><p class="small muted" id="encgen-source"></p><div class="encgen-roll actions">${button('Tirar encuentro', 'encgen-roll', '')}<label class="field">Tirada manual<input name="encgen-manual" type="number" step="1" inputmode="numeric" placeholder="Número de tu dado"></label>${button('Usar tirada', 'encgen-manual', 'secondary')}</div><p class="small" id="encgen-dice-help"></p><div id="encgen-table-view"></div><p id="encgen-error" class="form-error" role="alert"></p><section id="encgen-result" aria-live="polite"></section></div>`,
      null,
    );
    const dialog = el('modal');
    dialog.classList.add('encgen-modal');
    dialog.addEventListener(
      'close',
      () => {
        dialog.classList.remove('encgen-modal');
        session = null;
      },
      { once: true },
    );
    drawTable();
  }
  function drawTable() {
    const t = table();
    if (!t || !el('encgen-result')) return;
    el('encgen-table-select').innerHTML = select(
      'Tabla / niveles',
      'encgen-table',
      D.tables.filter(x => x.group === t.group).map(x => [x.id, x.name]),
      t.id,
    );
    el('encgen-source').textContent = sourceText(t) + ' · texto en ' + language(t);
    el('encgen-dice-help').textContent =
      `Se tira ${t.dice}${t.dice === 'd100' ? '; 00 equivale a 100' : ''}. El nivel indica la tabla de origen; no garantiza un combate equilibrado.`;
    el('encgen-table-view').innerHTML =
      `<details class="encgen-table"><summary>Ver tabla completa (${t.rows.length} resultados)</summary><div class="encgen-table-scroll" tabindex="0" role="region" aria-label="Tabla de encuentros"><table><caption>${esc(group().name)} · ${esc(t.name)}</caption><thead><tr><th scope="col">${esc(t.dice)}</th><th scope="col">Encuentro (${language(t)})</th><th scope="col">Elegir</th></tr></thead><tbody>${t.rows.map((r, i) => `<tr><th scope="row">${range(r)}</th><td>${esc(bodyText(r))}${r.attitude ? `<br><small>Actitud: ${esc(r.attitude)}</small>` : ''}</td><td>${button('Usar', 'encgen-pick', 'text-btn', `data-index="${i}" aria-label="Usar resultado ${range(r)}"`)}</td></tr>`).join('')}</tbody></table></div>${t.footnotes.map(n => `<p class="small">${esc(n)}</p>`).join('')}</details>`;
    el('encgen-result').innerHTML =
      '<p class="muted section-space">Tirá los dados, ingresá una tirada o elegí una fila de la tabla.</p>';
    el('encgen-error').textContent = '';
    const input = document.getElementById('dialog-form').elements.namedItem('encgen-manual'),
      b = G.bounds(t.dice);
    input.min = t.dice === 'd100' ? 0 : b.min;
    input.max = b.max;
    input.value = '';
    try {
      localStorage.setItem('dnd-encounter-table', t.id);
    } catch {}
  }
  function notesFor(result) {
    const t = table(),
      row = t.rows[result.index];
    return `${group().name} · ${t.name}\n${sourceText(t)}\n${result.total === null ? 'Fila elegida: ' + range(row) : `${t.dice}: ${result.total}`}\n\n${result.text}${result.attitude ? `\n\nTirada de actitud: ${result.attitude.total} (${result.attitude.expression})` : ''}`;
  }
  function generate(options = {}) {
    if (!session) return;
    session.result = G.generate(table(), options);
    const r = session.result,
      t = table();
    const rows = r.candidates
      .map((c, i) => {
        const m = c.monsterId && MonsterUI.byId(c.monsterId),
          valid = m && !m.unrated && !m.summon && m.hp > 0;
        const suggested = c.suggested,
          initial = suggested ? Math.min(20, suggested) : 1;
        return `<div class="encgen-creature"><label class="check"><input type="checkbox" name="encgen-pick" value="${i}" ${valid ? '' : 'disabled'}><span><b>${esc(c.name)}</b><span class="small muted">${m ? ` · VD ${MonsterUI.crText(m.cr)} · CA ${m.ac} · ${m.hp} PG` : ' · Sin bloque disponible'}${suggested ? ` · Cantidad sugerida: ${suggested}` : ' · Cantidad a elegir'}</span></span></label><label class="field">Cantidad de ${esc(c.name)}<input type="number" name="encgen-count-${i}" min="1" max="20" step="1" value="${initial}" ${valid ? '' : 'disabled'}></label><a class="small" href="./compendium.html?kind=creature&amp;book=${encodeURIComponent(c.source)}&amp;q=${encodeURIComponent(c.english)}" target="_blank" rel="noopener">Consultar catálogo</a>${!valid ? '<p class="small muted">Se conserva en las notas; no se agregará como combatiente.</p>' : ''}</div>`;
      })
      .join('');
    el('encgen-result').innerHTML =
      `<div class="encgen-result-head"><h3>${r.total === null ? 'Resultado elegido' : `Resultado: ${r.total}`}</h3><span class="tag">${esc(group().name)} · ${esc(t.name)}</span></div><p class="encounter-notes encgen-reference">${esc(r.text)}</p>${r.dice.length ? `<p class="small muted">Dados del resultado: ${r.dice.map(d => `${esc(d.expression)} → ${d.total}`).join(' · ')}</p>` : ''}${r.attitude ? `<p>Tirada de actitud: <b>${r.attitude.total}</b> (${esc(r.attitude.expression)}). Consultá su interpretación en la fuente.</p>` : ''}${rows ? `<h3>Elegí qué criaturas incluir</h3><p class="small">Marcá las que querés preparar. Puede haber aliados o alternativas: ninguna se agrega automáticamente. Para grupos grandes, elegí hasta 20 integrantes por bloque; el total del relato queda en las notas.</p><div id="encgen-creatures">${rows}</div><div id="encgen-difficulty" aria-live="polite"></div>` : '<p class="small">Este resultado es narrativo. Podés conservarlo como notas privadas del encuentro.</p>'}${session.target ? `<p>Se agregará a <b>${esc(Encounters.get(session.target)?.name || '')}</b>.</p>` : field('Nombre del encuentro', 'encgen-name', `${group().name} · ${t.name}`.slice(0, 80), 'text', 'maxlength="80"')}<label class="field">Notas privadas (editables)<textarea name="encgen-notes" maxlength="16000" rows="5">${esc(notesFor(r))}</textarea></label><div class="actions">${button('Volver a tirar', 'encgen-roll', 'secondary')}${button('Copiar resultado', 'encgen-copy', 'secondary')}${button(session.target ? 'Agregar al encuentro' : 'Guardar encuentro preparado', 'encgen-save', '', current && party ? '' : 'disabled')}</div><p class="small muted">${current && party ? 'Se guarda solo para vos en este dispositivo. Los jugadores no ven nada hasta que lances el encuentro.' : 'Abrí una mesa para guardar encuentros preparados. Podés copiar este resultado mientras tanto.'}</p>`;
    el('encgen-error').textContent = '';
    drawDifficulty();
  }
  function chosen() {
    const fd = new FormData(document.getElementById('dialog-form'));
    return G.selection(
      session.result.candidates,
      fd.getAll('encgen-pick').map(i => ({ index: Number(i), count: fd.get('encgen-count-' + i) })),
      MonsterUI.byId,
    );
  }
  function drawDifficulty() {
    const box = el('encgen-difficulty');
    if (!box || !session?.result) return;
    try {
      const groups = chosen();
      const before = session.target ? Encounters.get(session.target)?.monsters || [] : [];
      const entries = [
        ...before,
        ...groups.flatMap(g => Array.from({ length: g.count }, () => ({ monsterId: g.monster.id }))),
      ];
      box.innerHTML = groups.length
        ? MonsterUI.difficultyLine({ entries }) ||
          '<p class="small muted">Sin personajes en la mesa: no se calcula la dificultad.</p>'
        : '<p class="small muted">Sin criaturas seleccionadas: se guardarán las notas.</p>';
      el('encgen-error').textContent = '';
    } catch (err) {
      box.textContent = err.message;
    }
  }
  async function saveResult() {
    if (!session?.result) throw Error('Generá un resultado primero.');
    if (session.campaignId !== current) throw Error('La mesa cambió. Volvé a abrir el generador.');
    const groups = chosen();
    const id = Encounters.addGenerated(session.campaignId, session.target, {
      name: session.target ? Encounters.get(session.target)?.name : fieldValue('encgen-name'),
      notes: fieldValue('encgen-notes'),
      monsters: MonsterUI.preparedRows(groups.map(g => [g.monster.id, g.count])),
    });
    document.getElementById('modal').close();
    toast(`«${Encounters.get(id).name}» guardado para preparar. Todavía no se lanzó.`);
  }
  const safe = fn => async e => {
    try {
      await fn(e);
    } catch (err) {
      if (el('encgen-error')) el('encgen-error').textContent = err.message;
      else toast(err.message);
    }
  };
  Object.assign(actions, {
    'encgen-open': e => open(e?.dataset.id || null),
    'encgen-roll': safe(() => generate()),
    'encgen-manual': safe(() => generate({ roll: fieldValue('encgen-manual') })),
    'encgen-pick': safe(e => generate({ index: Number(e.dataset.index) })),
    'encgen-save': safe(saveResult),
    'encgen-copy': safe(async () => {
      await navigator.clipboard.writeText(fieldValue('encgen-notes'));
      toast('Resultado copiado.');
    }),
  });
  document.addEventListener('change', e => {
    if (!session || !el('encgen-result')) return;
    if (e.target.name === 'encgen-group') {
      session.tableId = defaultTable(e.target.value);
      session.result = null;
      drawTable();
    } else if (e.target.name === 'encgen-table') {
      session.tableId = e.target.value;
      session.result = null;
      drawTable();
    } else if (/^encgen-(pick|count-)/.test(e.target.name)) drawDifficulty();
  });
  document.addEventListener('input', e => {
    if (session && /^encgen-count-/.test(e.target.name)) drawDifficulty();
  });
  return { card, open };
})();
