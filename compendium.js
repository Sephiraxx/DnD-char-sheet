'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const esc = value =>
    String(value ?? '').replace(
      /[&<>"']/g,
      c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const canon = value =>
    String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  const labels = {
    class: 'Clase',
    subclass: 'Subclase',
    spell: 'Conjuro',
    creature: 'Criatura',
    race: 'Raza / variante',
    background: 'Trasfondo',
    feat: 'Dote',
  };
  const bundled = BookContentData.monsters;
  const sources = {
    ...CampaignData.sources,
    SRD: 'SRD 5.1',
    ...Object.fromEntries(BookContentData.books.filter(b => b.creatures).map(b => [b.id, b.title])),
  };
  const rows = [
    ...Object.values(ClassData.classes).map(x => ({ ...x, kind: 'class' })),
    ...ClassData.subclasses.map(x => ({ ...x, kind: 'subclass' })),
    ...Catalog.spells.map(x => ({ ...x, kind: 'spell' })),
    ...[...MonsterData, ...bundled].map(x => ({ ...x, sourceKey: x.bookId || 'SRD', kind: 'creature' })),
    ...CampaignData.races.map(x => ({ ...x, kind: 'race' })),
    ...CampaignData.backgrounds.map(x => ({ ...x, kind: 'background' })),
    ...Catalog.feats.map(x => ({ ...x, kind: 'feat' })),
  ];
  const rowSources = x => x.sources || [x.sourceKey || x.source];
  const sourceLabel = x =>
    rowSources(x)
      .map(s => sources[s] || s)
      .join(' / ');
  const params = new URLSearchParams(location.search);
  $('compendium-q').value = (params.get('q') || '').slice(0, 200);
  $('compendium-source').innerHTML += Object.entries(sources)
    .map(([key, label]) => `<option value="${esc(key)}">${esc(label)}</option>`)
    .join('');
  if (sources[params.get('book')]) $('compendium-source').value = params.get('book');
  if (labels[params.get('kind')]) $('compendium-kind').value = params.get('kind');
  $('compendium-counts').textContent =
    `${Object.keys(ClassData.classes).length} clases · ${ClassData.subclasses.length} subclases · ${Catalog.spells.length} conjuros · ${MonsterData.length + bundled.length} entradas de criaturas`;
  $('compendium-coverage').textContent =
    `Se revisaron ${BookContentData.coverage.scannedBooks} PDFs. Esta conversión añade ${bundled.length} entradas de criaturas, una subclase y dos conjuros al catálogo base. ${BookContentData.coverage.noTextBooks} PDFs no tienen texto extraíble. Inventariar un PDF no significa que todas sus reglas estén convertidas: las clases nuevas de homebrew, otras opciones y las reglas revisadas siguen pendientes.`;
  $('compendium-books').innerHTML = BookContentData.books
    .map(b => {
      const compatible = b.edition === '2014';
      const sourceRows =
        compatible && b.sourceKey ? rows.filter(x => x.kind !== 'creature' && rowSources(x).includes(b.sourceKey)) : [];
      const status = !compatible
        ? 'Otra edición: sin reglas incorporadas a la ficha de 2014'
        : b.id === '94b03db20e9c61a6'
          ? 'Mar Abierto y dos conjuros incorporados; las otras opciones siguen pendientes'
          : sourceRows.length
            ? `${sourceRows.length} opciones de esta fuente en el catálogo; cobertura parcial del libro`
            : 'Sin opciones de personaje convertidas';
      return `<div class="feature"><b>${esc(b.title)}</b><p class="small">Edición: ${esc(b.edition)} · ${esc(status)}${b.creatures ? ` · ${b.creatures} entradas de criaturas con estadísticas básicas` : ''}${b.status === 'needs-ocr' ? ' · PDF sin texto extraíble' : b.status === 'partial' ? ' · Extracción de texto parcial' : ''}</p></div>`;
    })
    .join('');
  let shown = [];
  const summary = x =>
    x.kind === 'creature'
      ? `VD ${x.cr} · CA ${x.ac} · ${x.hp} PG${x.bundled ? ` · ${x.actions.length} ataques con daño base` : ''}`
      : x.kind === 'spell'
        ? `${x.level ? 'Nivel ' + x.level : 'Truco'} · ${x.time} · ${x.range}`
        : x.kind === 'subclass'
          ? ClassData.classes[x.classId].name
          : x.kind === 'class'
            ? `Dado de golpe d${x.die}`
            : x.prerequisite || '';
  function draw() {
    const query = canon($('compendium-q').value.trim());
    const source = $('compendium-source').value;
    const kind = $('compendium-kind').value;
    const filtered = rows.filter(
      x =>
        (!kind || x.kind === kind) &&
        (!source || rowSources(x).includes(source)) &&
        (!query ||
          canon(x.name + ' ' + (x.english || '') + ' ' + (x.features || []).map(f => f.name).join(' ')).includes(
            query,
          )),
    );
    shown = filtered.sort((a, b) => a.name.localeCompare(b.name, 'es')).slice(0, 80);
    $('compendium-status').textContent =
      `${filtered.length} coincidencia(s)${filtered.length > 80 ? ' · se muestran las primeras 80' : ''}`;
    $('compendium-results').innerHTML =
      shown
        .map(
          (x, i) =>
            `<article class="card library-result"><span class="eyebrow">${esc(labels[x.kind])}</span><h2>${esc(x.name)}</h2><p class="small">${esc(summary(x))}</p><p class="small muted">${esc(sourceLabel(x))}</p><button class="button secondary" type="button" data-detail="${i}">Ver detalles</button></article>`,
        )
        .join('') ||
      '<div class="card library-empty"><h2>Sin coincidencias en el catálogo</h2><p>Puede que esa opción siga pendiente de conversión. Consultá la cobertura de los libros al pie de esta página.</p></div>';
  }
  $('compendium-form').addEventListener('submit', e => {
    e.preventDefault();
    draw();
  });
  for (const name of ['kind', 'source']) $('compendium-' + name).addEventListener('change', draw);
  $('compendium-results').addEventListener('click', e => {
    const button = e.target.closest('[data-detail]');
    if (!button) return;
    const x = shown[Number(button.dataset.detail)];
    $('compendium-detail-title').textContent = x.name;
    const features = (x.features || [])
      .map(
        f =>
          `<div class="feature"><h3>Nivel ${f.level} · ${esc(f.name)}</h3><p>${esc(f.es || 'Consultá los detalles y requisitos en el libro.')}</p></div>`,
      )
      .join('');
    const creature =
      x.kind === 'creature'
        ? `<p><b>CA ${x.ac} · PG ${x.hp} (${esc(x.hd)}) · VD ${x.cr}</b></p><p>${esc(x.speed)}</p><p>FUE ${x.ab[0]} · DES ${x.ab[1]} · CON ${x.ab[2]} · INT ${x.ab[3]} · SAB ${x.ab[4]} · CAR ${x.ab[5]}</p><p>Salvaciones: ${esc(x.saves || 'Modificadores de característica')}</p>${x.actions.map(a => `<div class="feature"><h3>${esc(a.n)}</h3><p>${esc(a.d)}</p></div>`).join('')}<p class="small">${x.bundled ? 'Los demás poderes, alcances y efectos requieren consultar el libro. Estas entradas están disponibles en Agregar criaturas del DM.' : 'Entrada del bestiario base.'}</p>`
        : '';
    const spell =
      x.kind === 'spell'
        ? `<p>${esc(x.text || x.brief || '')}</p><p class="small">${esc(x.components)} · ${esc(x.duration)}${x.materialEs ? ' · ' + esc(x.materialEs) : ''}</p><p class="small">Disponible en el selector de conjuros de las clases y libros correspondientes, o como Extra del DM.</p>`
        : '';
    $('compendium-detail-body').innerHTML =
      `<p class="small muted">${esc(sourceLabel(x))}${x.page || x.pdfPage ? ' · PDF p. ' + (x.page || x.pdfPage) : ''}</p>${spell}${creature}${features}${!spell && !creature && !features ? '<p>Esta opción está incluida en el creador al habilitar su fuente.</p>' : ''}`;
    $('compendium-detail').showModal();
  });
  $('compendium-close').addEventListener('click', () => $('compendium-detail').close());
  draw();
})();
