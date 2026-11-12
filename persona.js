/* Quién es el personaje: alineamiento, personalidad, apariencia e historia; idiomas y herramientas
   anotados aparte de los que conceden raza, trasfondo y dotes; y los saltos según la Fuerza.
   La lógica (validar, calcular) no usa el navegador; las tarjetas y diálogos sí. */
const Persona = (() => {
  'use strict';
  const ALIGNMENTS = [
    'Legal bueno',
    'Neutral bueno',
    'Caótico bueno',
    'Legal neutral',
    'Neutral',
    'Caótico neutral',
    'Legal malvado',
    'Neutral malvado',
    'Caótico malvado',
    'Sin alineamiento',
  ];
  // [clave, etiqueta, largo máximo]
  const SHORT = [
    ['age', 'Edad', 40],
    ['height', 'Altura', 40],
    ['weight', 'Peso', 40],
    ['eyes', 'Ojos', 40],
    ['skin', 'Piel', 40],
    ['hair', 'Pelo', 40],
    ['deity', 'Deidad o fe', 80],
  ];
  const LONG = [
    ['traits', 'Rasgos de personalidad', 1000],
    ['ideals', 'Ideales', 1000],
    ['bonds', 'Vínculos', 1000],
    ['flaws', 'Defectos', 1000],
    ['appearance', 'Apariencia', 2000],
    ['backstory', 'Historia del personaje', 8000],
    ['allies', 'Aliados y organizaciones', 2000],
  ];
  const FIELDS = [...SHORT, ...LONG];
  const KINDS = { language: 'Idiomas', tool: 'Herramientas' };
  const lists = () => globalThis.Grants?.LISTS || { languages: [], tools: [] };
  const pool = kind => (kind === 'language' ? lists().languages : lists().tools);
  const label = x => (globalThis.Campaign ? Campaign.facts(x) : x);
  const cap = t => (t ? t[0].toUpperCase() + t.slice(1) : t);

  function of(s) {
    return s?.persona && typeof s.persona === 'object' ? s.persona : {};
  }
  function clean(raw) {
    const out = {};
    if (ALIGNMENTS.includes(raw?.alignment)) out.alignment = raw.alignment;
    for (const [k, , max] of FIELDS) {
      const v = String(raw?.[k] ?? '')
        .trim()
        .slice(0, max);
      if (v) out[k] = v;
    }
    return out;
  }
  // ---------- Color de la ficha ----------
  // Por defecto sigue a la clase; el jugador puede elegir otro. Se guarda en sheetColor (#rrggbb).
  const COLORS = [
    ['#e8834a', 'Brasa'],
    ['#f0705f', 'Carmesí'],
    ['#e07fb4', 'Rosa'],
    ['#b683f0', 'Violeta'],
    ['#8aa2ff', 'Arcano'],
    ['#a9c8ff', 'Cielo'],
    ['#62c8cc', 'Jade'],
    ['#8cc474', 'Musgo'],
    ['#b3bf63', 'Oliva'],
    ['#ecd583', 'Sol'],
    ['#dba257', 'Cobre'],
    ['#c3ced9', 'Acero'],
  ];
  const isColor = v => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
  // Un color demasiado oscuro no se leería sobre el fondo: se aclara hasta que se distinga.
  function readable(hex) {
    if (!isColor(hex)) return '';
    let [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
    const lum = () => {
      const f = v => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    for (let i = 0; i < 40 && lum() < 0.3; i++) [r, g, b] = [r, g, b].map(v => Math.round(v + (255 - v) * 0.1));
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
  }
  function validate(o) {
    if (o.sheetColor !== undefined && !isColor(o.sheetColor)) throw Error('Color de ficha inválido.');
    if (o.persona !== undefined) {
      const p = o.persona;
      if (!p || typeof p !== 'object' || Array.isArray(p)) throw Error('Datos de personalidad inválidos.');
      if (p.alignment !== undefined && !ALIGNMENTS.includes(p.alignment)) throw Error('Alineamiento inválido.');
      for (const k of Object.keys(p)) {
        if (k === 'alignment') continue;
        const f = FIELDS.find(x => x[0] === k);
        if (!f || typeof p[k] !== 'string' || p[k].length > f[2]) throw Error('Datos de personalidad inválidos.');
      }
    }
    if (o.extraProfs !== undefined) {
      const e = o.extraProfs;
      if (!e || typeof e !== 'object' || Array.isArray(e)) throw Error('Competencias adicionales inválidas.');
      for (const k of Object.keys(e)) {
        if (
          !KINDS[k] ||
          !Array.isArray(e[k]) ||
          e[k].length > 40 ||
          new Set(e[k]).size !== e[k].length ||
          e[k].some(x => typeof x !== 'string' || !x || x.length > 60)
        )
          throw Error('Competencias adicionales inválidas.');
      }
    }
    return o;
  }
  // Saltos del Manual: longitud = Fuerza en pies con carrera de 10 pies; altura = 3 + modificador.
  function jumps(s) {
    const str = (globalThis.Rules?.formScores || globalThis.Rules?.scores)?.(s)?.str ?? s.abilities?.str ?? 10,
      mod = Math.floor((str - 10) / 2),
      high = Math.max(0, 3 + mod);
    return { long: str, longStanding: Math.floor(str / 2), high, highStanding: Math.floor(high / 2) };
  }
  // Lo que ya conceden raza, trasfondo y dotes (sin lo anotado aparte).
  function granted(s, kind) {
    if (!globalThis.Grants) return [];
    return Grants.proficiencies({ ...s, extraProfs: undefined }, kind);
  }
  function setExtra(s, kind, values) {
    const have = new Set(granted(s, kind)),
      list = [...new Set(values.map(x => String(x).trim().toLowerCase()).filter(Boolean))].filter(x => !have.has(x));
    s.extraProfs = { ...(s.extraProfs || {}), [kind]: list.slice(0, 40) };
    if (!s.extraProfs.language?.length && !s.extraProfs.tool?.length) delete s.extraProfs;
    return s;
  }

  // ---------- Pantalla ----------
  const E = v => esc(v ?? '');
  function alignmentSelect(value) {
    return select(
      'Alineamiento',
      'persona.alignment',
      [['', 'Sin elegir'], ...ALIGNMENTS.map(a => [a, a])],
      value || '',
    );
  }
  function fieldsHtml(p, long = LONG) {
    return (
      `<div class="form-grid">${alignmentSelect(p.alignment)}${SHORT.map(([k, l, max]) => field(l, 'persona.' + k, p[k] || '', 'text', `maxlength="${max}" autocomplete="off"`)).join('')}</div>` +
      long
        .map(
          ([k, l, max]) =>
            `<label class="field">${l}<textarea name="persona.${k}" maxlength="${max}" rows="${k === 'backstory' ? 6 : 2}">${E(p[k])}</textarea></label>`,
        )
        .join('')
    );
  }
  function read(fd) {
    const raw = { alignment: String(fd.get('persona.alignment') || '') };
    for (const [k] of FIELDS) raw[k] = fd.get('persona.' + k);
    return clean(raw);
  }
  function chips(kind, chosen, fixed = []) {
    const fixedSet = new Set(fixed),
      known = pool(kind),
      custom = chosen.filter(x => !known.includes(x));
    return (
      `<fieldset class="skill-choice"><legend>${KINDS[kind]}</legend>` +
      (fixed.length
        ? `<p class="small">Ya los tenés por tu raza, trasfondo o dotes: ${E(fixed.map(label).join(', '))}.</p>`
        : '') +
      `<div class="choice-grid persona-chips">${known
        .filter(x => !fixedSet.has(x))
        .map(
          x =>
            `<label class="check"><input type="checkbox" name="extra.${kind}" value="${E(x)}" ${chosen.includes(x) ? 'checked' : ''}>${E(cap(label(x)))}</label>`,
        )
        .join('')}</div>` +
      field(
        kind === 'language' ? 'Otros idiomas (separados por coma)' : 'Otras herramientas (separadas por coma)',
        'extra.' + kind + '.custom',
        custom.join(', '),
        'text',
        'maxlength="300" autocomplete="off"',
      ) +
      '</fieldset>'
    );
  }
  function readExtra(fd, kind) {
    return [
      ...fd.getAll('extra.' + kind).map(String),
      ...String(fd.get('extra.' + kind + '.custom') || '')
        .split(/[,;]/)
        .map(x => x.trim().slice(0, 60)),
    ].filter(Boolean);
  }
  function profsHtml(s) {
    return (
      '<p class="small">Marcá lo que tu personaje sabe además de lo que ya figura. Los idiomas y herramientas que raza, trasfondo y dotes dejan a elección también se pueden completar en Rasgos → Beneficios de tu personaje.</p>' +
      chips('language', s.extraProfs?.language || [], granted(s, 'language')) +
      chips('tool', s.extraProfs?.tool || [], granted(s, 'tool'))
    );
  }
  function card(s) {
    const p = of(s),
      j = jumps(s),
      row = (l, v) => (v ? `<p><b>${l}:</b> ${E(v)}</p>` : ''),
      look = SHORT.filter(([k]) => p[k] && k !== 'deity')
        .map(([k, l]) => `${l.toLowerCase()} ${E(p[k])}`)
        .join(' · '),
      tools = globalThis.Grants ? Grants.proficiencies(s, 'tool') : [],
      empty = !Object.keys(p).length;
    return (
      `<section class="card section-space" id="persona-card"><div class="card-header"><h2>Personalidad e historia</h2><div class="actions">${button('Color de la ficha', 'persona-color')}${button('Idiomas y herramientas', 'persona-profs')}${button('Editar', 'persona-edit')}</div></div>` +
      (empty
        ? '<p class="small muted">Todavía no anotaste alineamiento, personalidad, apariencia ni historia. Tocá «Editar».</p>'
        : `<div class="grid two"><div>${row('Alineamiento', p.alignment)}${row('Deidad o fe', p.deity)}${look ? `<p><b>Apariencia:</b> ${cap(look)}</p>` : ''}${p.appearance ? `<p class="persona-text">${E(p.appearance)}</p>` : ''}</div><div>${LONG.filter(
            ([k]) => ['traits', 'ideals', 'bonds', 'flaws'].includes(k) && p[k],
          )
            .map(([k, l]) => `<p class="persona-text"><b>${l}:</b> ${E(p[k])}</p>`)
            .join(
              '',
            )}</div></div>${p.allies ? `<p class="persona-text"><b>Aliados y organizaciones:</b> ${E(p.allies)}</p>` : ''}${p.backstory ? `<details class="section-space"><summary><b>Historia del personaje</b></summary><p class="persona-text">${E(p.backstory)}</p></details>` : ''}`) +
      `<div class="divider"></div>${tools.length ? `<p><b>Herramientas:</b> ${E(tools.map(label).join(', '))}</p>` : ''}<p><b>Saltos:</b> de longitud ${j.long} pies con carrera (${j.longStanding} sin carrera) · de altura ${j.high} pies con carrera (${j.highStanding} sin carrera).</p><p class="small muted">Con 10 pies de carrera previa; cada pie saltado gasta movimiento. Con los brazos estirados alcanzás tu altura y media más.</p></section>`
    );
  }
  function edit() {
    modal('Personalidad e historia', fieldsHtml(of(state)), fd =>
      commit('Personalidad e historia actualizadas', s => {
        const p = read(fd);
        if (Object.keys(p).length) s.persona = p;
        else delete s.persona;
      }),
    );
  }
  function editProfs() {
    modal('Idiomas y herramientas', profsHtml(state), fd =>
      commit('Idiomas y herramientas actualizados', s => {
        setExtra(s, 'language', readExtra(fd, 'language'));
        setExtra(s, 'tool', readExtra(fd, 'tool'));
      }),
    );
  }
  function editColor() {
    const cur = isColor(state.sheetColor) ? state.sheetColor.toLowerCase() : '',
      preset = COLORS.some(([c]) => c === cur),
      sw = (value, label, color) =>
        `<label class="color-swatch"><input type="radio" name="color" value="${value}" ${cur === value || (value === 'custom' && cur && !preset) ? 'checked' : ''}><span class="color-dot" style="background:${color}"></span>${E(label)}</label>`;
    modal(
      'Color de la ficha',
      `<p class="small">Tiñe la barra lateral, los rótulos y los números de tu ficha, y tu tarjeta en la pantalla del DM. El emblema sigue siendo el de tu clase.</p><div class="color-grid">${sw('', 'El de mi clase', 'conic-gradient(#8aa2ff, #8cc474, #ecd583, #e8834a, #b683f0, #8aa2ff)')}${COLORS.map(([c, n]) => sw(c, n, c)).join('')}${sw('custom', 'Otro', cur && !preset ? cur : '#888888')}</div>${field('Otro color', 'custom', cur && !preset ? cur : '#7fd1c1', 'color')}`,
      fd =>
        commit('Color de la ficha actualizado', s => {
          const pick = String(fd.get('color') || ''),
            color = pick === 'custom' ? readable(String(fd.get('custom') || '')) : pick;
          if (isColor(color)) s.sheetColor = color.toLowerCase();
          else delete s.sheetColor;
        }),
    );
    // Elegir un color en el selector marca «Otro».
    const form = document.getElementById('dialog-form'),
      custom = form?.querySelector('[name=custom]');
    custom?.addEventListener('input', () => {
      const radio = form.querySelector('input[name=color][value=custom]');
      radio.checked = true;
      radio.nextElementSibling.style.background = custom.value;
    });
  }
  // ---------- Creador ----------
  function creatorFields(d) {
    return (
      `<h3 class="section-space">Idiomas y herramientas</h3><p class="small">Elegí los que te da tu clase, raza o trasfondo. Lo que quede sin marcar se puede completar después en la ficha.</p>` +
      chips('language', d.extraProfs?.language || []) +
      chips('tool', d.extraProfs?.tool || []) +
      `<h3 class="section-space">Quién es</h3><p class="small">Opcional: se puede completar o cambiar después en Personaje.</p>` +
      fieldsHtml(
        d.persona || {},
        LONG.filter(([k]) => k !== 'allies'),
      )
    );
  }
  function collectCreator(fd, d) {
    d.persona = read(fd);
    d.extraProfs = {
      language: [...new Set(readExtra(fd, 'language').map(x => x.toLowerCase()))],
      tool: [...new Set(readExtra(fd, 'tool').map(x => x.toLowerCase()))],
    };
  }
  function apply(s, d) {
    const p = clean(d.persona || {});
    if (Object.keys(p).length) s.persona = p;
    if (d.extraProfs) {
      setExtra(s, 'language', d.extraProfs.language || []);
      setExtra(s, 'tool', d.extraProfs.tool || []);
    }
    return s;
  }
  // ---------- Hoja impresa ----------
  function printHtml(s) {
    const p = of(s),
      j = jumps(s),
      line = (l, v) => (v ? `<p class="ps-line"><b>${l}:</b> ${E(v)}</p>` : ''),
      look = SHORT.filter(([k]) => p[k])
        .map(([k, l]) => `${l} ${E(p[k])}`)
        .join(' · ');
    return (
      line('Alineamiento', p.alignment) +
      (look ? `<p class="ps-line">${look}</p>` : '') +
      LONG.map(([k, l]) => line(l, p[k])).join('') +
      `<p class="ps-line"><b>Saltos:</b> longitud ${j.long} pies (${j.longStanding} sin carrera) · altura ${j.high} pies (${j.highStanding} sin carrera)</p>`
    );
  }
  function install() {
    Object.assign(actions, { 'persona-edit': edit, 'persona-profs': editProfs, 'persona-color': editColor });
  }
  return {
    ALIGNMENTS,
    FIELDS,
    COLORS,
    readable,
    of,
    clean,
    validate,
    jumps,
    granted,
    setExtra,
    card,
    creatorFields,
    collectCreator,
    apply,
    printHtml,
    install,
  };
})();
if (typeof globalThis !== 'undefined') globalThis.Persona = Persona;
