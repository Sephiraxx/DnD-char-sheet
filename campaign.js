/* Fuentes de campaña y ayuda de lectura. Versiones de libros 2014. */
const Campaign = (() => {
  'use strict';
  const D = CampaignData;
  const selected = s => s?.campaignSources || D.defaults;
  const enabled = (s, x) =>
    (!x.sourceKey && !x.sources && !Catalog.sources.some(([id]) => id === x.source)) ||
    x.sourceKey === 'DM' ||
    (x.sources || [x.sourceKey || x.source]).some(k => selected(s).includes(k));
  const race = s => D.races.find(x => x.id === s.raceId),
    background = s => D.backgrounds.find(x => x.id === s.backgroundId);
  function expanded(s) {
    return [...new Set([...(race(s)?.expanded || []), ...(background(s)?.expanded || [])])];
  }
  function options(kind, s, id = '') {
    return D[kind]
      .filter(x => enabled(s, x) || x.id === id)
      .sort((a, b) => a.name.localeCompare(b.name, 'es'))
      .map(x => [x.id, x.name + ' · ' + x.sources.join(' / ') + (enabled(s, x) ? '' : ' · selección previa')]);
  }
  function sourceFields(s) {
    return `<fieldset class="campaign-sources"><legend>Libros habilitados para esta ficha</legend><p class="small">Estos ocho están habilitados por defecto. Desmarcar una fuente filtra nuevas elecciones y conserva lo que ya elegiste.</p><div class="source-grid">${Object.entries(
      D.sources,
    )
      .map(
        ([id, n]) =>
          `<label class="check"><input type="checkbox" name="campaignSource" value="${id}" ${selected(s).includes(id) ? 'checked' : ''}>${esc(n)}</label>`,
      )
      .join('')}</div></fieldset>`;
  }
  function identityFields(s) {
    return `${select('Raza y variante habilitada', 'raceId', [['', 'Personalizada / por elegir'], ...options('races', s, s.raceId)], s.raceId || '')}${field('Nombre de raza (editable si elegís personalizada)', 'race', s.race || '', 'text', `required maxlength="150" ${s.raceId ? 'readonly' : ''}`)}<div id="race-preview" class="origin-preview">${originInfo(race(s), 'race')}</div>${select('Trasfondo habilitado', 'backgroundId', [['', 'Personalizado / por elegir'], ...options('backgrounds', s, s.backgroundId)], s.backgroundId || '')}${field('Nombre del trasfondo (editable si elegís personalizado)', 'background', s.background || '', 'text', `maxlength="200" ${s.backgroundId ? 'readonly' : ''}`)}<div id="background-preview" class="origin-preview">${originInfo(background(s), 'background')}</div>`;
  }
  const words = {
    str: 'Fuerza',
    dex: 'Destreza',
    con: 'Constitución',
    int: 'Inteligencia',
    wis: 'Sabiduría',
    cha: 'Carisma',
    common: 'Común',
    elvish: 'Élfico',
    dwarvish: 'Enano',
    gnomish: 'Gnómico',
    goblin: 'Goblin',
    halfling: 'Mediano',
    orc: 'Orco',
    draconic: 'Dracónico',
    infernal: 'Infernal',
    celestial: 'Celestial',
    abyssal: 'Abisal',
    primordial: 'Primordial',
    sylvan: 'Silvano',
    undercommon: 'Infracomún',
    quori: 'Quori',
    any: 'a elección',
    anyStandard: 'idioma estándar a elección',
    anyExotic: 'idioma exótico a elección',
    anyArtisansTool: 'herramienta de artesano a elección',
    anyMusicalInstrument: 'instrumento a elección',
    anyGamingSet: 'juego a elección',
    poison: 'veneno',
    fire: 'fuego',
    cold: 'frío',
    necrotic: 'necrótico',
    psychic: 'psíquico',
    disease: 'enfermedad',
    charmed: 'hechizado',
    M: 'Mediano',
    S: 'Pequeño',
  };
  function term(k) {
    if (k === 'strixhaven initiate|scc') return 'Iniciado de Strixhaven (elegí tu facultad)';
    const skill = Rules.skills.find(
      x => x[0] === ({ 'animal handling': 'animal', 'sleight of hand': 'sleight' }[k] || k),
    );
    return skill?.[1] || words[k] || k.replaceAll('|phb', '');
  }
  function facts(value) {
    if (value === null || value === undefined) return '';
    if (Array.isArray(value)) return value.map(facts).filter(Boolean).join('; ');
    if (typeof value !== 'object') return term(String(value));
    return Object.entries(value)
      .map(([k, v]) => {
        if (k === 'choose')
          return (
            'Elegí ' +
            (v.count || 1) +
            ' entre ' +
            (v.from || []).map(term).join(', ') +
            (v.amount ? ' (+' + v.amount + ')' : '')
          );
        if (k === 'weighted') return 'Distribuí los aumentos indicados por tu linaje';
        if (k === 'from') return v.map(term).join(', ');
        if (v === true) return term(k);
        return term(k) + ': ' + facts(v);
      })
      .join(', ');
  }
  const raceTips = {
    Warforged:
      'Protección integrada: +1 a la CA. Resistencia al veneno, ventaja contra envenenado e inmunidad a enfermedades. No necesita comer, beber ni respirar; no duerme y la magia no lo duerme. Su reposo inmóvil conserva los sentidos. Elegí una habilidad y una herramienta. El cálculo por equipo suma su +1 de CA automáticamente. Si usás CA manual, registralo una sola vez.',
    Owlin:
      'Puede volar si no lleva armadura media ni pesada. Elegí tamaño Pequeño o Mediano según esta versión. Tiene Sigilo y visión en la oscuridad.',
    Changeling:
      'Puede cambiar su apariencia corporal según su rasgo. No cambia su equipo ni copia automáticamente capacidades de otra criatura.',
    Kalashtar:
      'Posee capacidades mentales, comunicación telepática y defensas psíquicas. Revisá alcance y restricciones de sus rasgos.',
    Shifter:
      'La transformación temporal depende de la variante elegida. Registrá sus usos y PG temporales por separado.',
    'Custom Lineage':
      'Elegís tamaño, un aumento de +2, una dote y el rasgo variable indicado. No concede automáticamente todos los rasgos de otra raza.',
    'Simic Hybrid':
      'Elegí las adaptaciones de los niveles 1 y 5. Algunas opciones afectan movimiento o defensa; anotá cuáles elegiste.',
  };
  function lineageMagic(x) {
    const clean = v =>
      String(v)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
    const name = v => {
      const text = String(v).split('|')[0];
      return Rules.spells.find(sp => clean(sp.english || sp.name) === clean(text))?.name || text;
    };
    const render = v => {
      if (Array.isArray(v)) return v.map(render).filter(Boolean).join(', ');
      if (typeof v === 'string') return esc(name(v));
      if (!v || typeof v !== 'object') return '';
      if (v.choose) {
        const q = typeof v.choose === 'string' ? v.choose : '';
        const cls = (q.match(/class=([^|]+)/i) || [])[1];
        return (
          'Elegí ' +
          (v.count || 1) +
          (q.includes('level=0') ? ' truco(s)' : ' conjuro(s)') +
          (cls ? ' de ' + esc(ClassData.classes[cls.toLowerCase()]?.name || cls) : ' según el rasgo')
        );
      }
      return Object.entries(v)
        .map(
          ([k, val]) =>
            (['daily', 'rest', 'will', 'ritual'].includes(k)
              ? {
                  daily: 'Usos limitados según el rasgo: ',
                  rest: 'Por descanso, según el rasgo: ',
                  will: 'A voluntad: ',
                  ritual: 'Como ritual: ',
                }[k]
              : k === '_'
                ? ''
                : /^\d+$/.test(k)
                  ? k + ' uso(s): '
                  : '') + render(val),
        )
        .join('; ');
    };
    return (x.additionalSpells || [])
      .map(g => {
        const rows = ['known', 'innate'].flatMap(mode =>
          Object.entries(g[mode] || {}).map(([lv, val]) => '<li>Desde nivel ' + esc(lv) + ': ' + render(val) + '</li>'),
        );
        return rows.length
          ? '<p>Característica: ' + esc(facts(g.ability) || 'según el rasgo') + '.</p><ul>' + rows.join('') + '</ul>'
          : '';
      })
      .join('');
  }
  function originInfo(x, kind) {
    if (!x) return '<p class="small">Elegí una entrada para ver su fuente y lo que tenés que completar.</p>';
    const line = (label, val) => (val ? `<p><b>${label}:</b> ${esc(val)}</p>` : '');
    let out = `<p class="eyebrow">${esc(x.english)} · ${esc(x.sources.join(' / '))}${x.page ? ' · pág. ' + x.page : ''}</p>`;
    if (kind === 'race') {
      const speed =
        typeof x.speed === 'number'
          ? x.speed + ' pies'
          : Object.entries(x.speed || {})
              .map(
                ([k, v]) =>
                  (({ walk: 'Caminar', fly: 'Volar', swim: 'Nadar', climb: 'Trepar' })[k] || k) +
                  ': ' +
                  (v === true
                    ? 'según tu velocidad base'
                    : typeof v === 'number'
                      ? v + ' pies'
                      : 'ver condiciones del rasgo'),
              )
              .join(' · ');
      out +=
        line('Tamaño', facts(x.size)) +
        line('Velocidad de referencia', speed) +
        line('Aumentos de referencia', facts(x.ability)) +
        line('Visión en la oscuridad', x.darkvision ? x.darkvision + ' pies' : '') +
        line('Resistencia al daño', facts(x.resist)) +
        line('Inmunidades de referencia', facts(x.conditionImmune));
      const tip = raceTips[x.english.split(' (')[0]];
      if (tip) out += `<p>${esc(tip)}</p>`;
    }
    out +=
      line('Habilidades', facts(x.skillProficiencies)) +
      line('Herramientas', facts(x.toolProficiencies)) +
      line('Idiomas', facts(x.languageProficiencies));
    if (x.feats?.length)
      out +=
        '<p><b>Dote o elección adicional:</b> ' +
        esc(facts(x.feats)) +
        '. Registrala y aplicá sus decisiones con el DM.</p>';
    if (x.expanded?.length)
      out += `<details><summary>Conjuros que amplían tu lista</summary><p>${x.expanded.map(id => esc(Rules.spells.find(s => s.id === id)?.name || id)).join(', ')}.</p><p class="small">Aparecen como opciones de tu clase cuando tengas acceso a ese nivel. No se aprenden ni preparan automáticamente y no conceden espacios extra.</p></details>`;
    if (kind === 'race' && x.additionalSpells?.some(g => g.innate || g.known))
      out +=
        '<details><summary>Magia de linaje y nivel necesario</summary>' +
        lineageMagic(x) +
        '</details><p><b>Magia de linaje:</b> este linaje concede magia propia. Elegí los conjuros y registralos como extras según su rasgo; revisá nivel, característica de lanzamiento y usos por descanso. La lista ampliada es un beneficio distinto.</p>';
    out +=
      '<p class="small">Al crear una ficha, las habilidades fijas se agregan automáticamente y las que requieren elección se completan aparte. En fichas existentes, revisá las competencias desde Personaje. El creador agrega el equipo físico del paquete elegido. Los aumentos, competencias con herramientas, idiomas, otros rasgos y dotes se registran por separado. Las puntuaciones que ingresás ya deben ser las finales.</p>';
    return out;
  }
  function identity() {
    modal(
      'Raza, trasfondo e identidad',
      field('Nombre', 'name', state.name, 'text', 'required maxlength="100"') +
        identityFields(state) +
        field('Idiomas', 'languages', state.languages || '', 'text', 'maxlength="500"'),
      fd =>
        commit('Identidad actualizada', s => {
          s.name = String(fd.get('name')).trim();
          s.raceId = String(fd.get('raceId') || '');
          s.backgroundId = String(fd.get('backgroundId') || '');
          s.race = race(s)?.name || String(fd.get('race')).trim();
          s.background = background(s)?.name || String(fd.get('background')).trim();
          s.languages = String(fd.get('languages')).trim();
        }),
    );
  }
  function sourceDialog() {
    modal(
      'Libros habilitados',
      sourceFields(state) +
        `<p class="small">Otras fuentes del catálogo siguen disponibles como Extra del DM. Podés configurar también las opciones de bardo desde su guía de subida.</p>`,
      fd => {
        const list = fd.getAll('campaignSource');
        if (!list.includes('PHB')) throw Error('Mantené habilitado el Manual del Jugador 2014.');
        commit('Libros de campaña actualizados', s => {
          s.campaignSources = list;
          s.progression.sources = list;
        });
      },
    );
  }
  function sheetOrigins() {
    return `<section class="card section-space"><div class="card-header"><h2>Raza y trasfondo</h2>${button('Elegir / cambiar', 'party-identity')}${button('Libros habilitados', 'campaign-sources')}</div><div class="grid two"><div><h3>${esc(state.race || 'Raza por registrar')}</h3>${originInfo(race(state), 'race')}</div><div><h3>${esc(state.background || 'Trasfondo por registrar')}</h3>${originInfo(background(state), 'background')}</div></div></section>`;
  }
  function glossary() {
    const d = Rules.stats(state),
      a = Classes.casting(state).ability,
      m = d.mods[a];
    modal(
      'Dados y términos, sin abreviaturas',
      `<dl class="rules-glossary"><dt>1d4 + CAR</dt><dd>Tirá un dado de cuatro caras y sumá el <b>modificador de Carisma</b>, no la puntuación de Carisma. Con CAR ${state.abilities.cha}, tu modificador es ${sign(d.mods.cha)}: la fórmula sería 1d4 ${sign(d.mods.cha)}.</dd><dt>Modificador</dt><dd>Se calcula como (puntuación − 10) dividido por 2, redondeando hacia abajo. Una puntuación de 17 da +3.</dd><dt>2d6</dt><dd>Tirá dos dados de seis caras y sumá sus resultados. No significa tirar un dado y multiplicarlo por dos.</dd><dt>Tu característica de lanzamiento</dt><dd>En esta ficha es ${Rules.attrs[a]}: ${state.abilities[a]} de puntuación y ${sign(m)} de modificador. Un conjuro de raza, dote u objeto puede usar otra; comprobá el rasgo.</dd><dt>Ataque de conjuro</dt><dd>Tirá 1d20 ${sign(d.attack)} y comparalo con la CA del objetivo. El daño se tira aparte. Solo sumás el modificador al daño si el efecto lo dice.</dd><dt>Salvación contra tu CD ${d.dc}</dt><dd>La tira el objetivo: 1d20 + su bono de la característica indicada. Si iguala o supera ${d.dc}, la supera. No usás vos el d20 por él.</dd><dt>FUE / DES / CON / INT / SAB / CAR</dt><dd>Fuerza, Destreza, Constitución, Inteligencia, Sabiduría y Carisma.</dd><dt>Ventaja y desventaja</dt><dd>Tirá dos d20: con ventaja conservá el mayor; con desventaja, el menor. No duplica los dados de daño.</dd><dt>PG, CA y po</dt><dd>Puntos de Golpe, Clase de Armadura y piezas de oro.</dd><dt>Concentración</dt><dd>Solo mantenés un efecto de concentración a la vez. Recibir daño exige Constitución contra CD 10 o la mitad del daño, lo que sea mayor. Quedar incapacitado la termina.</dd><dt>V, S y M</dt><dd>V: palabras audibles. S: gestos con una mano. M: componente material. Un foco válido o bolsa puede sustituir materiales solo si no tienen costo indicado ni se consumen.</dd><dt>Truco y espacio de conjuro</dt><dd>Un truco es de nivel 0 y no gasta espacio. Los demás normalmente gastan un espacio de su nivel o mayor; no todos mejoran al usar uno mayor.</dd></dl>`,
    );
  }
  function spellHelp(sp) {
    const d = Rules.stats(state),
      a = Classes.casting(state).ability;
    let body = `<p>${esc(sp.text)}</p><div class="spell-facts">${sp.saveAbility?.length ? `<p><b>Quién tira:</b> el objetivo hace una salvación de ${esc(sp.saveAbility.join(' o '))} contra tu CD ${d.dc}. Algunos efectos tienen más de una salvación: seguí el resumen y la fuente.</p>` : ''}${sp.attackKind?.length ? `<p><b>Tu ataque de conjuro:</b> 1d20 ${sign(d.attack)} contra la CA del objetivo; el daño se tira aparte.</p>` : ''}${['healingword', 'cure', 'mass-healing-word', 'mass-cure-wounds', 'spiritual-weapon', 'prayer-of-healing'].includes(sp.id) ? `<p><b>En tu ficha:</b> donde dice «modificador de lanzamiento», sumás ${sign(d.mods[a])} por ${Rules.attrs[a]}. No sumes la puntuación ${state.abilities[a]}.</p>` : ''}<p><b>Lanzamiento:</b> ${esc(sp.castingTimeEs || sp.time)} · <b>Alcance:</b> ${esc(sp.range)}.</p><p><b>Componentes:</b> ${esc(sp.components)}${sp.materialEs ? '. ' + esc(sp.materialEs) : ''}</p><p><b>Duración:</b> ${esc(sp.duration)}${sp.concentration ? ' · requiere concentración' : ''}.</p>${sp.higherLevels ? '<p>Este conjuro tiene una mejora con espacios mayores. Revisá qué aumenta: daño, objetivos o duración; no siempre son más dados.</p>' : ''}</div><p class="small">Resumen de mesa, no texto íntegro. Fuente: ${esc(sp.source)}${sp.sourcePage ? ', pág. ' + sp.sourcePage : ''}. Revisá allí excepciones, formas invocadas y tablas.</p>${button('¿Qué significan los dados y siglas?', 'rules-help')}`;
    return body;
  }
  function validate(s) {
    if (
      s.campaignSources !== undefined &&
      (!Array.isArray(s.campaignSources) ||
        s.campaignSources.length > 60 ||
        s.campaignSources.some(k => !Catalog.sources.some(([id]) => id === k)))
    )
      throw Error('Fuentes de campaña inválidas.');
    for (const [key, list] of [
      ['raceId', D.races],
      ['backgroundId', D.backgrounds],
    ])
      if (s[key] !== undefined && (typeof s[key] !== 'string' || (s[key] && !list.some(x => x.id === s[key]))))
        throw Error('Selección de raza o trasfondo inválida.');
  }
  function install() {
    Object.assign(actions, {
      'campaign-sources': sourceDialog,
      'party-identity': identity,
      'rules-help': glossary,
      'spell-help': e => {
        const sp = spellById(e.dataset.id);
        if (sp) modal(sp.name, spellHelp(sp));
      },
    });
    document.addEventListener('change', e => {
      if (!['raceId', 'backgroundId'].includes(e.target.name)) return;
      const isRace = e.target.name === 'raceId',
        row = D[isRace ? 'races' : 'backgrounds'].find(x => x.id === e.target.value),
        input = document.querySelector(`[name="${isRace ? 'race' : 'background'}"]`),
        preview = document.getElementById(isRace ? 'race-preview' : 'background-preview');
      if (input) {
        input.readOnly = !!row;
        if (row) input.value = row.name;
      }
      if (preview) preview.innerHTML = originInfo(row, isRace ? 'race' : 'background');
    });
  }
  return {
    selected,
    enabled,
    race,
    background,
    expanded,
    options,
    identityFields,
    sourceFields,
    originInfo,
    sheetOrigins,
    spellHelp,
    validate,
    install,
  };
})();
if (typeof globalThis !== 'undefined') globalThis.Campaign = Campaign;
