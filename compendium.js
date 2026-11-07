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
    option: 'Opción de clase',
    item: 'Objeto mágico',
  };
  const bundled = BookContentData.monsters;
  const sources = {
    ...CampaignData.sources,
    SRD: 'SRD 5.1',
    DMG: 'Guía del Dungeon Master',
  };
  const bookSources = new Map(
    [...BookContentData.books, ...OfficialContentData.books].map(b => [b.id, b.sourceKey || 'WOTC-' + b.id]),
  );
  const rows = [
    ...Object.values(ClassData.classes).map(x => ({ ...x, kind: 'class' })),
    ...ClassData.subclasses.map(x => ({ ...x, kind: 'subclass' })),
    ...Catalog.spells.map(x => ({ ...x, kind: 'spell' })),
    ...[...MonsterData, ...bundled].map(x => ({
      ...x,
      sourceKey: x.sourceKey || bookSources.get(x.bookId) || 'SRD',
      kind: 'creature',
    })),
    ...CampaignData.races.map(x => ({ ...x, kind: 'race' })),
    ...CampaignData.backgrounds.map(x => ({ ...x, kind: 'background' })),
    ...Catalog.feats.map(x => ({ ...x, kind: 'feat' })),
    ...ClassData.options.map(x => ({ ...x, kind: 'option' })),
    ...MagicItems.ITEMS.map(x => ({ ...x, sourceKey: x.sourceKey || 'DMG', kind: 'item' })),
  ];
  const rowSources = x => ContentIndex.sources(x);
  const dedupe = items =>
    [...new Set(items.map(x => x.kind))].flatMap(kind =>
      ContentIndex.list(
        kind,
        items.filter(x => x.kind === kind),
      ),
    );
  const sourceLabel = x =>
    [...new Set(rowSources(x).map(ContentIndex.canonicalSource))].map(s => sources[s] || s).join(' / ');
  const params = new URLSearchParams(location.search);
  $('compendium-q').value = (params.get('q') || '').slice(0, 200);
  $('compendium-source').innerHTML += Object.entries(sources)
    .filter(([key]) => OfficialContent.selectableSource(key))
    .map(([key, label]) => `<option value="${esc(key)}">${esc(label)}</option>`)
    .join('');
  const requestedSource = ContentIndex.canonicalSource(bookSources.get(params.get('book')) || params.get('book'));
  if (sources[requestedSource]) $('compendium-source').value = requestedSource;
  if (labels[params.get('kind')]) $('compendium-kind').value = params.get('kind');
  const counts = dedupe(rows).reduce((a, x) => ((a[x.kind] = (a[x.kind] || 0) + 1), a), {});
  $('compendium-counts').textContent =
    `${counts.class} clases · ${counts.subclass} subclases · ${counts.spell} conjuros · ${counts.item} objetos mágicos · ${counts.creature} entradas únicas de criaturas`;
  $('compendium-coverage').textContent =
    `Esta ampliación revisó ${OfficialContentData.books.length} libros oficiales de las reglas de 2014, incluidos los PDFs escaneados. Añade ${BookContentData.official.rules} textos de rasgos, dotes y opciones de clase, ${BookContentData.official.spellDescriptions} descripciones de conjuros, ${BookContentData.official.itemDescriptions} descripciones de objetos y ${OfficialContentData.monsters.length} bloques de criaturas. Se excluyen homebrew y las demás ediciones. Los bloques que no superaron la validación no se publican como criaturas nuevas.`;
  $('compendium-books').innerHTML = OfficialContentData.books
    .map(b => {
      const c = b.counts;
      return `<div class="feature"><b>${esc(b.title)}</b><p class="small">${c.monsters} criaturas · ${c.spells} conjuros · ${c.items} objetos · ${c.rules} textos de personaje${c.rejected ? ` · ${c.rejected} bloques pendientes de revisión` : ''}${b.ocrPages ? ` · ${b.ocrPages} páginas con reconocimiento de texto` : ''}</p>${b.coverageNote ? '<p class="small">' + esc(b.coverageNote) + '</p>' : ''}</div>`;
    })
    .join('');
  let shown = [];
  const crText = cr => (cr === 0.125 ? '1/8' : cr === 0.25 ? '1/4' : cr === 0.5 ? '1/2' : String(cr));
  const summary = x =>
    x.kind === 'creature'
      ? `${x.unrated ? 'Sin VD' : 'VD ' + crText(x.cr)} · CA ${x.acNote ? 'variable' : x.ac} · ${x.hpNote ? 'PG variables' : x.hp + ' PG'}`
      : x.kind === 'spell'
        ? `${x.level ? 'Nivel ' + x.level : 'Truco'} · ${x.time} · ${x.range}`
        : x.kind === 'subclass'
          ? ClassData.classes[x.classId].name
          : x.kind === 'class'
            ? `Dado de golpe d${x.die}`
            : x.kind === 'item'
              ? `${x.rarity}${x.attune ? ' · Requiere sintonización' : ''}`
              : x.prerequisite
                ? TraitsEs.prereq(x.prerequisite)
                : '';
  function draw() {
    const query = canon($('compendium-q').value.trim());
    const source = $('compendium-source').value;
    const kind = $('compendium-kind').value;
    const filtered = dedupe(
      rows.filter(
        x =>
          (!kind || x.kind === kind) &&
          (!source || rowSources(x).includes(source)) &&
          (!query ||
            canon(
              x.name +
                ' ' +
                (x.english || '') +
                ' ' +
                (x.searchNames || []).join(' ') +
                ' ' +
                (x.features || []).map(f => f.name).join(' '),
            ).includes(query)),
      ),
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
    const fullEntry = ['race', 'background', 'class', 'subclass'].includes(x.kind)
      ? OfficialContent.entryHtml(x.kind, x.id)
      : '';
    const features = (fullEntry ? [] : x.features || [])
      .map(
        f =>
          `<div class="feature"><h3>Nivel ${f.level} · ${esc(f.name)}</h3><p>${esc(f.es || f.text || '')}</p>${OfficialContent.html(OfficialContent.ruleTexts.get(`${x.kind === 'class' ? 'class' : 'sub'}:${x.id}:${f.english || f.name}`))}</div>`,
      )
      .join('');
    const creature =
      x.kind === 'creature'
        ? `<p><b>CA ${esc(x.acNote || x.ac)} · PG ${esc(x.hpNote || x.hp + ' (' + x.hd + ')')} · ${x.unrated ? 'Sin VD' : 'VD ' + crText(x.cr)}</b></p>${x.variantNote ? '<p>' + esc(x.variantNote) + '</p>' : ''}<p>${esc(x.size)} · ${esc(x.type)} · ${esc(x.align)}</p><p>${esc(x.speed)}</p><p>FUE ${x.ab[0]} · DES ${x.ab[1]} · CON ${x.ab[2]} · INT ${x.ab[3]} · SAB ${x.ab[4]} · CAR ${x.ab[5]}</p>${[
            ['Salvaciones', x.saves],
            ['Armadura', x.acDetails],
            ['Habilidades', x.skills],
            ['Resistencias', x.res],
            ['Inmunidades', x.imm],
            ['Inmunidades a estados', x.cimm],
            ['Sentidos', x.senses],
            ['Idiomas', x.lang],
            ['Acciones legendarias', x.legendaryNote],
          ]
            .filter(([, v]) => v)
            .map(([k, v]) => `<p><b>${k}:</b> ${esc(v)}</p>`)
            .join(
              '',
            )}${(x.traits || []).map(([n, d]) => `<div class="feature"><h3>${esc(n)}</h3><p class="library-text">${esc(d)}</p></div>`).join('')}${[
            ['Acciones', x.actions],
            ['Acciones adicionales', x.bonus],
            ['Reacciones', x.reactions],
            ['Acciones legendarias', x.legendary],
            ['Acciones míticas', x.mythic],
          ]
            .filter(([, v]) => v?.length)
            .map(
              ([k, v]) =>
                `<h3>${k}</h3>${v.map(a => `<div class="feature"><h3>${esc(a.n)}</h3><p class="library-text">${esc(a.d)}</p></div>`).join('')}`,
            )
            .join(
              '',
            )}${x.rulesLanguage === 'en' ? '<p class="small">Las reglas especiales conservan su texto de referencia en inglés.</p>' : ''}<p class="small">Disponible en Agregar criaturas del DM. ${x.referenceOnlyActions ? 'Esta entrada anterior incluye estadísticas básicas; los efectos adicionales requieren consultar el libro.' : 'Los dados y ataques compatibles se resuelven en combate; los demás efectos se consultan en el bloque.'}</p>`
        : '';
    const spell =
      x.kind === 'spell'
        ? `<p>${esc(x.text || x.brief || '')}</p><p class="small">${esc(x.components)} · ${esc(x.duration)}${x.materialEs ? ' · ' + esc(x.materialEs) : ''}</p>${OfficialContent.spellHtml(x.id)}<p class="small">Disponible en el selector de conjuros de las clases y libros correspondientes, o como Extra del DM.</p>`
        : '';
    const rule =
      x.kind === 'feat' || x.kind === 'option'
        ? (x.kind === 'feat' ? TraitsEs.brief('feat:' + x.id) : TraitsEs.option(x)).replace(
            /^(.+)$/,
            s => `<p>${esc(s)}</p>`,
          ) + OfficialContent.html(OfficialContent.ruleTexts.get(`${x.kind === 'feat' ? 'feat' : 'opt'}:${x.id}`))
        : '';
    const item =
      x.kind === 'item'
        ? `<p>${esc(x.note || '')}</p>${OfficialContent.itemHtml(x.id)}<p class="small">Disponible en Equipo → Objetos mágicos. Los efectos especiales se aplican en la mesa.</p>`
        : '';
    $('compendium-detail-body').innerHTML =
      `<p class="small muted">${esc(sourceLabel(x))}${x.page || x.pdfPage ? (x.pdfPage || ['creature', 'item'].includes(x.kind) ? ' · PDF p. ' : ' · ed. inglesa p. ') + (x.pdfPage || x.page) : ''}</p>${spell}${creature}${features}${fullEntry}${rule}${item}${!spell && !creature && !features && !fullEntry && !rule && !item ? '<p>Esta opción está incluida en el creador al habilitar su fuente.</p>' : ''}`;
    $('compendium-detail').showModal();
  });
  $('compendium-close').addEventListener('click', () => $('compendium-detail').close());
  draw();
})();
