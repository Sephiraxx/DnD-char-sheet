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
  // Se vuelve a armar cuando cambia el homebrew (crear, editar, borrar o llegar de la cuenta).
  const buildRows = () => [
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
  let rows = buildRows();
  // El homebrew no se mezcla con las ediciones oficiales: su fuente es «Homebrew» y su colección.
  const rowSources = x => (x.homebrew ? ['homebrew', 'hb:' + x.homebrew.book?.id] : ContentIndex.sources(x));
  const dedupe = items =>
    [...new Set(items.filter(x => !x.homebrew).map(x => x.kind))]
      .flatMap(kind =>
        ContentIndex.list(
          kind,
          items.filter(x => x.kind === kind && !x.homebrew),
        ),
      )
      .concat(items.filter(x => x.homebrew));
  const sourceLabel = x =>
    x.homebrew
      ? 'Homebrew · ' + (x.homebrew.book?.title || '')
      : [...new Set(rowSources(x).map(ContentIndex.canonicalSource))].map(s => sources[s] || s).join(' / ');
  const params = new URLSearchParams(location.search);
  $('compendium-q').value = (params.get('q') || '').slice(0, 200);
  $('compendium-source').innerHTML += Object.entries(sources)
    .filter(([key]) => OfficialContent.selectableSource(key))
    .map(([key, label]) => `<option value="${esc(key)}">${esc(label)}</option>`)
    .join('');
  const requestedSource = ContentIndex.canonicalSource(bookSources.get(params.get('book')) || params.get('book'));
  if (sources[requestedSource]) $('compendium-source').value = requestedSource;
  // Colecciones de homebrew como fuentes: «Homebrew» (todo) y cada colección.
  function homebrewSources() {
    const select = $('compendium-source');
    const keep = select.value || params.get('book') || '';
    select.querySelector('optgroup[data-homebrew]')?.remove();
    const books = Homebrew.state.books;
    if (books.length)
      select
        .querySelector('option[value="homebrew"]')
        .insertAdjacentHTML(
          'afterend',
          `<optgroup label="Colecciones de homebrew" data-homebrew>${books.map(b => `<option value="hb:${esc(b.id)}">${esc(b.title)}</option>`).join('')}</optgroup>`,
        );
    if (keep === 'homebrew' || select.querySelector(`option[value="${CSS.escape(keep)}"]`)) select.value = keep;
  }
  homebrewSources();
  if (labels[params.get('kind')]) $('compendium-kind').value = params.get('kind');
  // ---------- Filtros por tipo ----------
  // Conjuros: nivel y clase. Criaturas: VD y tipo. Objetos: rareza. Todo queda en la dirección.
  const classNames = () => Object.fromEntries(Object.values(ClassData.classes).map(c => [c.id, c.name]));
  const spellToken = t =>
    String(t)
      .split(/[|#]/)[0]
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  const spellLists = new Map(Object.entries(ClassData.spellClasses || {}).map(([k, v]) => [spellToken(k), v]));
  const classesOf = sp => [
    ...(sp.classes || ClassData.spellClasses?.[sp.id] || spellLists.get(spellToken(sp.id)) || []),
    ...(sp.bard ? ['bard'] : []),
  ];
  // «humanoide (elfo)» y «humanoide» son el mismo tipo; el paréntesis es la etiqueta.
  const typeOf = x =>
    String(x.type || '')
      .split('(')[0]
      .trim()
      .toLowerCase() || 'otro';
  const rarityOf = x => ({ infrecuente: 'poco común' })[x.rarity] || x.rarity;
  const CRS = [0, 0.125, 0.25, 0.5, ...Array.from({ length: 30 }, (_, i) => i + 1)];
  const filters = {
    level: params.get('nivel') || '',
    cls: params.get('clase') || '',
    crMin: params.get('vdmin') || '',
    crMax: params.get('vdmax') || '',
    type: params.get('tipo') || '',
    rarity: params.get('rareza') || '',
  };
  const pick = (label, key, options) =>
    `<label class="field">${label}<select data-filter="${key}"><option value="">Todos</option>${options
      .map(
        ([v, t]) =>
          `<option value="${esc(v)}" ${String(filters[key]) === String(v) ? 'selected' : ''}>${esc(t)}</option>`,
      )
      .join('')}</select></label>`;
  function extraFilters(kind) {
    if (kind === 'spell')
      return (
        pick('Nivel', 'level', [['0', 'Trucos'], ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => [String(n), 'Nivel ' + n])]) +
        pick(
          'Clase',
          'cls',
          Object.entries(classNames())
            .filter(([id]) => rows.some(x => x.kind === 'spell' && classesOf(x).includes(id)))
            .sort((a, b) => a[1].localeCompare(b[1], 'es')),
        )
      );
    if (kind === 'creature') {
      const types = [...new Set(rows.filter(x => x.kind === 'creature').map(typeOf))].sort();
      const crs = CRS.map(c => [String(c), crText(c)]);
      return (
        pick('VD desde', 'crMin', crs) +
        pick('VD hasta', 'crMax', crs) +
        pick(
          'Tipo de criatura',
          'type',
          types.sort((a, b) => a.localeCompare(b, 'es')).map(t => [t, t[0].toUpperCase() + t.slice(1)]),
        )
      );
    }
    if (kind === 'item') {
      const order = ['común', 'poco común', 'raro', 'muy raro', 'legendario', 'artefacto'];
      const rar = [
        ...new Set(
          rows
            .filter(x => x.kind === 'item')
            .map(rarityOf)
            .filter(Boolean),
        ),
      ].sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99));
      return pick(
        'Rareza',
        'rarity',
        rar.map(r => [r, r[0].toUpperCase() + r.slice(1)]),
      );
    }
    return '';
  }
  const passes = x => {
    if (x.kind === 'spell') {
      if (filters.level !== '' && String(x.level) !== filters.level) return false;
      if (filters.cls && !classesOf(x).includes(filters.cls)) return false;
    }
    if (x.kind === 'creature') {
      if (filters.crMin !== '' && (x.unrated || x.cr < Number(filters.crMin))) return false;
      if (filters.crMax !== '' && (x.unrated || x.cr > Number(filters.crMax))) return false;
      if (filters.type && typeOf(x) !== filters.type) return false;
    }
    if (x.kind === 'item' && filters.rarity && rarityOf(x) !== filters.rarity) return false;
    return true;
  };
  // La búsqueda y los filtros quedan en la dirección: se puede volver o compartir el mismo resultado.
  function remember() {
    const q = new URLSearchParams();
    const set = (k, v) => v !== '' && v !== undefined && v !== null && q.set(k, v);
    set('q', $('compendium-q').value.trim());
    set('kind', $('compendium-kind').value);
    set('book', $('compendium-source').value);
    const kind = $('compendium-kind').value;
    if (kind === 'spell') (set('nivel', filters.level), set('clase', filters.cls));
    if (kind === 'creature') (set('vdmin', filters.crMin), set('vdmax', filters.crMax), set('tipo', filters.type));
    if (kind === 'item') set('rareza', filters.rarity);
    const url = location.pathname + (q.toString() ? '?' + q : '');
    if (url !== location.pathname + location.search) history.replaceState(null, '', url);
  }
  const counts = dedupe(rows.filter(x => !x.homebrew)).reduce((a, x) => ((a[x.kind] = (a[x.kind] || 0) + 1), a), {});
  $('compendium-counts').textContent =
    `${counts.class} clases · ${counts.subclass} subclases · ${counts.spell} conjuros · ${counts.item} objetos mágicos · ${counts.creature} entradas únicas de criaturas`;
  $('compendium-coverage').textContent =
    `Esta ampliación revisó ${OfficialContentData.books.length} libros oficiales de las reglas de 2014, incluidos los PDFs escaneados. Añade ${BookContentData.official.rules} textos de rasgos, dotes y opciones de clase, ${BookContentData.official.spellDescriptions} descripciones de conjuros, ${BookContentData.official.itemDescriptions} descripciones de objetos y ${OfficialContentData.monsters.length} bloques de criaturas. El homebrew de cada cuenta aparece aparte, con la fuente «Homebrew». Se excluyen las demás ediciones. Los bloques que no superaron la validación no se publican como criaturas nuevas.`;
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
          ? ClassData.classes[x.classId]?.name || 'Clase no disponible'
          : x.kind === 'class'
            ? `Dado de golpe d${x.die}`
            : x.kind === 'item'
              ? `${x.rarity}${x.attune ? ' · Requiere sintonización' : ''}`
              : TraitsEs.prereqText(x.prerequisite)
                ? 'Requisito: ' + TraitsEs.prereqText(x.prerequisite)
                : '';
  // Lo propio de una clase, subclase o conjuro homebrew (lo oficial lo muestra el texto del libro).
  const ABIL = {
    str: 'Fuerza',
    dex: 'Destreza',
    con: 'Constitución',
    int: 'Inteligencia',
    wis: 'Sabiduría',
    cha: 'Carisma',
  };
  function homebrewDetail(x) {
    const d = x.homebrew.data;
    const p = (label, value) => (value ? `<p><b>${label}:</b> ${esc(value)}</p>` : '');
    if (x.kind === 'class') {
      const list = d.spellList && d.spellList !== 'own' ? ClassData.classes[d.spellList]?.name : '';
      return `${d.summary ? '<p>' + esc(d.summary) + '</p>' : ''}${p('Dado de golpe', 'd' + d.die)}${p('Salvaciones', d.saves.map(k => ABIL[k]).join(' y '))}${p(
        'Habilidades',
        `elige ${d.skills.count}${d.skills.from.length < 18 ? ' entre ' + d.skills.from.length + ' opciones' : ' (cualquiera)'}`,
      )}${p('Armadura', d.armor.map(a => ({ light: 'ligera', medium: 'intermedia', heavy: 'pesada', shield: 'escudos' })[a]).join(', '))}${p(
        'Armas',
        [...d.weapons.map(w => (w === 'simple' ? 'sencillas' : 'marciales')), d.weaponsOther]
          .filter(Boolean)
          .join(', '),
      )}${p('Herramientas', d.tools)}${p(
        'Conjuros',
        d.caster
          ? `${Homebrew.CASTERS[d.caster]?.label}; usa ${ABIL[d.ability]}; ${d.progression === 'known' ? 'conoce una cantidad fija' : 'prepara cada día'}; ${list ? 'aprende de la lista de ' + list : 'aprende los conjuros homebrew que la marquen'}`
          : '',
      )}${p('Subclase', `al nivel ${d.subclassLevel}${d.subclassTitle ? ' (' + d.subclassTitle + ')' : ''}`)}<p class="small">Disponible en Crear personaje, al subir de nivel y al multiclasear (requisito: 13 en ${ABIL[d.ability || d.saves[0]]}).</p>`;
    }
    if (x.kind === 'subclass')
      return `${d.summary ? '<p>' + esc(d.summary) + '</p>' : ''}<p class="small">Se elige al subir de nivel con ${esc(ClassData.classes[d.classId]?.name || 'su clase')}.</p>${
        d.prepared.length
          ? `<p><b>Conjuros siempre preparados:</b> ${d.prepared
              .map(r => `nivel ${r.level}: ${esc(Catalog.spells.find(s => s.id === r.spell)?.name || r.spell)}`)
              .join(' · ')}</p>`
          : ''
      }`;
    if (x.kind === 'feat') {
      const ab = k => ABIL[k];
      const auto = [
        d.abilityFixed && '+1 ' + ab(d.abilityFixed),
        d.abilityChoice.length && '+1 a ' + d.abilityChoice.map(ab).join(' o '),
        d.saveProf && 'competencia en esa salvación',
        d.hp && `+${d.hp} PG por nivel`,
        d.init && `+${d.init} iniciativa`,
        d.speed && `+${d.speed} pies de velocidad`,
        d.passive && `+${d.passive} a las pasivas`,
        d.armor.length && 'armadura: ' + d.armor.length + ' tipo(s)',
        d.resist.length && 'resistencia a ' + d.resist.length + ' tipo(s) de daño',
        d.concentration && 'ventaja en concentración',
        d.skillsFixed.length && d.skillsFixed.length + ' habilidad(es) fija(s)',
        d.skillsChoose && `elige ${d.skillsChoose} habilidad(es)`,
        d.expertise && `${d.expertise} pericia(s)`,
        d.resource &&
          `${d.resource.name}: ${d.resource.uses === 'prof' ? 'bono de competencia' : d.resource.uses} uso(s)`,
        d.spells.length &&
          'conjuros: ' + d.spells.map(r => Catalog.spells.find(sp => sp.id === r.spell)?.name || r.spell).join(', '),
      ].filter(Boolean);
      return `<p class="library-text">${esc(d.text)}</p>${d.prerequisite ? '<p><b>Requisito:</b> ' + esc(d.prerequisite) + '</p>' : ''}${auto.length ? '<p><b>Se aplica solo:</b> ' + esc(auto.join(' · ')) + '.</p>' : ''}<p class="small">Disponible al subir de nivel («Mejora o dote») y en Rasgos → Agregar dote.</p>`;
    }
    if (x.kind === 'spell')
      return `<p class="small">${esc(x.level ? 'Nivel ' + x.level : 'Truco')} · ${esc(x.school)}${x.ritual ? ' · ritual' : ''}${x.concentration ? ' · concentración' : ''}${
        d.classes.length
          ? ' · ' +
            esc(
              d.classes
                .map(c => ClassData.classes[c]?.name)
                .filter(Boolean)
                .join(', '),
            )
          : ''
      }</p>`;
    return '';
  }
  const PAGE = 60;
  let limit = PAGE;
  function draw(more = false) {
    limit = more ? limit + PAGE : PAGE;
    const query = canon($('compendium-q').value.trim());
    const source = $('compendium-source').value;
    const kind = $('compendium-kind').value;
    const extra = $('compendium-extra');
    if (extra.dataset.kind !== kind) {
      extra.dataset.kind = kind;
      extra.innerHTML = extraFilters(kind);
    }
    remember();
    const filtered = dedupe(
      rows.filter(
        x =>
          (!kind || x.kind === kind) &&
          passes(x) &&
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
    shown = filtered.sort((a, b) => a.name.localeCompare(b.name, 'es')).slice(0, limit);
    $('compendium-status').textContent =
      `${filtered.length} coincidencia(s)${filtered.length > shown.length ? ` · se muestran ${shown.length}` : ''}`;
    const rest = filtered.length - shown.length;
    $('compendium-more').hidden = rest <= 0;
    $('compendium-more').textContent = `Ver ${Math.min(PAGE, rest)} más (quedan ${rest})`;
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
  for (const name of ['kind', 'source']) $('compendium-' + name).addEventListener('change', () => draw());
  $('compendium-extra').addEventListener('change', e => {
    const key = e.target.dataset.filter;
    if (!key) return;
    filters[key] = e.target.value;
    draw();
  });
  // «Ver más» suma la página siguiente y deja el foco en la primera tarjeta nueva.
  $('compendium-more').addEventListener('click', () => {
    const before = shown.length;
    draw(true);
    $('compendium-results').querySelector(`[data-detail="${before}"]`)?.focus();
  });
  $('compendium-results').addEventListener('click', e => {
    const button = e.target.closest('[data-detail]');
    if (!button) return;
    const x = shown[Number(button.dataset.detail)];
    $('compendium-detail-title').textContent = x.name;
    const fullEntry = ['race', 'background', 'class', 'subclass'].includes(x.kind)
      ? OfficialContent.entryHtml(x.kind, x.id)
      : '';
    // Rasgos agrupados por nivel en bloques plegables (con las mecánicas homebrew de ese nivel).
    const featureHtml = f =>
      `<div class="feature"><h3>${esc(f.name)}</h3><p>${esc(f.es || f.text || '')}</p>${OfficialContent.html(OfficialContent.ruleTexts.get(`${x.kind === 'class' ? 'class' : 'sub'}:${x.id}:${f.english || f.name}`))}</div>`;
    const hb = x.homebrew?.data;
    const mech = l =>
      hb
        ? [
            ...(hb.unarmed || []).filter(r => r.level === l).map(r => `Golpe sin armas: ${r.dice}`),
            ...(hb.prepared || [])
              .filter(r => r.level === l)
              .map(r => `Siempre preparado: ${Catalog.spells.find(sp => sp.id === r.spell)?.name || r.spell}`),
            ...(hb.slots || []).filter(r => r.level === l).map(r => `+${r.count} espacio(s) de nivel ${r.slot}`),
          ]
        : [];
    const levelsWith = [
      ...new Set([
        ...(fullEntry ? [] : x.features || []).map(f => f.level),
        ...(hb ? [...(hb.unarmed || []), ...(hb.prepared || []), ...(hb.slots || [])].map(r => r.level) : []),
      ]),
    ].sort((a, b) => a - b);
    const features = levelsWith
      .map((l, i) => {
        const fs = (fullEntry ? [] : x.features || []).filter(f => f.level === l);
        const m = mech(l);
        return `<details class="feature-level" ${i === 0 ? 'open' : ''}><summary>Nivel ${l}<span class="small muted"> · ${[fs.length && fs.map(f => f.name).join(', '), m.length && m.join(' · ')].filter(Boolean).map(esc).join(' · ')}</span></summary>${m.length ? `<p class="small"><b>${esc(m.join(' · '))}</b></p>` : ''}${fs.map(featureHtml).join('')}</details>`;
      })
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
            )}${x.rulesLanguage === 'en' ? '<p class="small">Las reglas especiales conservan su texto de referencia en inglés.</p>' : ''}${x.homebrew ? '' : `<p class="small">Disponible en Agregar criaturas del DM. ${x.referenceOnlyActions ? 'Esta entrada anterior incluye estadísticas básicas; los efectos adicionales requieren consultar el libro.' : 'Los dados y ataques compatibles se resuelven en combate; los demás efectos se consultan en el bloque.'}</p>`}`
        : '';
    const spell =
      x.kind === 'spell'
        ? `<p>${esc(x.text || x.brief || '')}</p><p class="small">${esc(x.components)} · ${esc(x.duration)}${x.materialEs ? ' · ' + esc(x.materialEs) : ''}</p>${x.higher ? '<p><b>A niveles superiores.</b> ' + esc(x.higher) + '</p>' : ''}${x.homebrew ? '' : OfficialContent.spellHtml(x.id) + '<p class="small">Disponible en el selector de conjuros de las clases y libros correspondientes, o como Extra del DM.</p>'}`
        : '';
    const rule =
      (x.kind === 'feat' && !x.homebrew) || x.kind === 'option'
        ? (x.kind === 'feat' ? TraitsEs.brief('feat:' + x.id) : TraitsEs.option(x)).replace(
            /^(.+)$/,
            s => `<p>${esc(s)}</p>`,
          ) + OfficialContent.html(OfficialContent.ruleTexts.get(`${x.kind === 'feat' ? 'feat' : 'opt'}:${x.id}`))
        : '';
    const item =
      x.kind === 'item'
        ? `<p>${esc(x.note || '')}</p>${OfficialContent.itemHtml(x.id)}<p class="small">Disponible en Equipo → Objetos mágicos. Los efectos especiales se aplican en la mesa.</p>`
        : '';
    const homebrew = x.homebrew ? homebrewDetail(x) : '';
    $('compendium-detail-body').innerHTML =
      `${homebrew}<p class="small muted">${esc(sourceLabel(x))}${x.page || x.pdfPage ? (x.pdfPage || ['creature', 'item'].includes(x.kind) ? ' · PDF p. ' : ' · ed. inglesa p. ') + (x.pdfPage || x.page) : ''}</p>${spell}${creature}${features}${fullEntry}${rule}${item}${x.homebrew ? HomebrewUI.detailActions(x) : ''}${!homebrew && !spell && !creature && !features && !fullEntry && !rule && !item ? '<p>Esta opción está incluida en el creador al habilitar su fuente.</p>' : ''}`;
    $('compendium-detail').showModal();
  });
  $('compendium-close').addEventListener('click', () => $('compendium-detail').close());
  addEventListener('homebrew-change', () => {
    rows = buildRows();
    homebrewSources();
    $('compendium-extra').dataset.kind = '';
    draw();
  });
  // Al guardar algo nuevo, el catálogo muestra el homebrew de ese tipo para encontrarlo enseguida.
  document.addEventListener('homebrew-saved', e => {
    $('compendium-kind').value = e.detail.kind;
    $('compendium-source').value = 'homebrew';
    $('compendium-q').value = '';
    draw();
  });
  HomebrewUI.init();
  draw();
})();
