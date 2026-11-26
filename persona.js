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
      `<section class="card section-space" id="persona-card"><div class="card-header"><h2>Personalidad e historia</h2><div class="actions">${button(s.miniature ? 'Editar miniatura' : 'Crear miniatura', 'persona-mini')}${button('Color de la ficha', 'persona-color')}${button('Idiomas y herramientas', 'persona-profs')}${button('Editar', 'persona-edit')}</div></div>` +
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
  function editMiniature() {
    const model = Miniatures.boardAppearance(state.miniature || Miniatures.initial(state));
    const A = MiniatureAncestries;
    const labels = {
      race: 'Raza de la miniatura',
      gender: 'Género',
      build: 'Complexión',
      ears: 'Orejas',
      hair: 'Peinado',
      beard: 'Vello facial',
      scar: 'Cicatriz',
      headwear: 'Prenda de cabeza',
      eyewear: 'Anteojos y parches',
      neck: 'Cuello',
      belt: 'Accesorio de cintura',
      outfit: 'Ropa',
      gear: 'Mano principal',
      offhand: 'Mano secundaria',
      pose: 'Postura',
    };
    const choices = keys =>
      keys.map(key => select(labels[key], key, Object.entries(Miniatures.parts[key]), model[key])).join('');
    const materialSlots = Object.fromEntries(
      Object.values(Miniatures.forgedMaterials).map(({ core, label }) => [core, label]),
    );
    const colors = {
      hairColor: 'Cabello',
      cloth: 'Tela',
      headColor: 'Capucha o sombrero',
      accent: 'Detalles',
    };
    const group = (title, controls) =>
      `<fieldset class="mini-group"><legend>${title}</legend><div class="form-grid">${controls}</div></fieldset>`;
    const body = group(
      'Cuerpo',
      choices(['race']) +
        '<label class="field mini-height"><span>Altura (cm) <output for="mini-height"></output></span><input id="mini-height" type="range" name="height" aria-label="Altura (cm)"></label>' +
        '<div data-mini-size></div><div data-mini-feature></div><div data-mini-lineage></div><div data-mini-plate-slot hidden></div>' +
        Object.entries(materialSlots)
          .map(([key, label]) => field(label, key, model[key] || Miniatures.forgedColors[key], 'color'))
          .join('') +
        choices(['gender', 'build', 'pose']),
    );
    const face = group(
      'Rostro y cabeza',
      '<div data-mini-crown></div>' +
        field('Color de ojos', 'eyeColor', model.eyeColor || Miniatures.forgedColors.eyeColor, 'color') +
        choices(['hair', 'beard', 'ears', 'scar', 'eyewear']),
    );
    const dress = group('Vestuario', choices(['outfit', 'headwear', 'neck', 'belt', 'gear', 'offhand']));
    const palette = group(
      'Colores',
      `<div data-mini-skin-slot>${field('Piel', 'skin', model.skin, 'color')}</div>` +
        Object.entries(colors)
          .map(([key, label]) => field(label, key, model[key] || Miniatures.forgedColors[key], 'color'))
          .join('') +
        '<div data-mini-race-colors></div>',
    );
    const read = fd => {
      const values = Object.fromEntries(fd);
      const range = A.heightRange(values.race, values.size);
      if (values.race === 'warforged')
        for (const key of Object.keys(materialSlots)) values[key] = form.elements[key].value;
      return Miniatures.clean({
        ...values,
        height: Number(values.height),
        facing: Number(values.facing),
        heightMode: Number(values.height) === range.standard ? undefined : 'custom',
      });
    };
    const swatches = [
      ['f', 'Piedra'],
      ['g', 'Pasto'],
    ];
    modal(
      'Miniatura del personaje',
      `<div class="mini-workbench"><div class="mini-stand"><canvas id="mini-preview" width="360" height="360" aria-label="Vista previa de la miniatura"></canvas><div class="mini-board-compare" hidden>${swatches.map(([code, name]) => `<figure><canvas width="116" height="156" data-ground="${code}" aria-label="Miniatura sobre ${name.toLowerCase()}"></canvas><figcaption>${name}</figcaption></figure>`).join('')}<small>${Miniatures.boardCell} px por casilla · zoom 100%</small></div><label class="field">Girar miniatura<input type="range" name="facing" min="0" max="359" value="${model.facing}"></label><div class="mini-view-controls"><button type="button" class="button secondary mini-zoom" data-mini-zoom aria-pressed="false">Acercar al rostro</button><button type="button" class="button secondary mini-zoom" data-mini-board aria-pressed="false">Vista de tablero</button></div></div><div class="mini-parts">${body}${face}${dress}<button type="button" class="button secondary mini-preset" data-mini-hooded>Usar atuendo encapuchado</button>${palette}</div></div>${state.miniature ? button('Quitar miniatura', 'persona-mini-remove', 'secondary') : ''}`,
      fd => {
        const mini = read(fd);
        commit('Miniatura actualizada', s => {
          s.miniature = mini;
        });
      },
      'Guardar miniatura',
    );
    const form = document.getElementById('dialog-form');
    const canvas = form.querySelector('#mini-preview');
    const compare = form.querySelector('.mini-board-compare');
    const zoom = form.querySelector('[data-mini-zoom]');
    const board = form.querySelector('[data-mini-board]');
    const height = form.elements.height;
    const heightValue = form.querySelector('output[for="mini-height"]');
    const enable = (key, enabled) => {
      const control = form.elements.namedItem(key);
      control.disabled = !enabled;
      control.closest('label').hidden = !enabled;
    };
    const relabel = (key, label) => {
      form.elements[key].closest('label').firstChild.textContent = label;
    };
    const raceControl = (target, label, name, options, value) => {
      const slot = form.querySelector(`[data-mini-${target}]`);
      slot.hidden = !options;
      slot.innerHTML = options ? select(label, name, Object.entries(options), value) : '';
      slot.querySelector('select')?.setAttribute('aria-label', label);
    };
    const optionsFor = (key, options, selected) => {
      const control = form.elements[key];
      control.setAttribute('aria-label', labels[key]);
      control.replaceChildren(
        ...Object.entries(options).map(([value, label]) => new Option(label, value, false, value === selected)),
      );
    };
    const updateHeightLabel = () => {
      heightValue.value = `${height.value} cm`;
      height.setAttribute('aria-valuetext', heightValue.value);
    };
    const stature = (race, size, value, build) => {
      const range = A.heightRange(race, size);
      height.min = range.min;
      height.max = range.max;
      height.value = value >= range.min && value <= range.max ? value : range.standard;
      updateHeightLabel();
      const small = (size || A.appearance(race).size) === 'small';
      const allowed = Object.fromEntries(
        Object.entries(Miniatures.parts.build).filter(([key]) => small === (key === 'small')),
      );
      optionsFor('build', allowed, Object.hasOwn(allowed, build) ? build : small ? 'small' : A.appearance(race).build);
      enable('build', !small);
    };
    const surfaceNames = {
      tabaxi: 'Pelaje',
      leonin: 'Pelaje',
      bugbear: 'Pelaje',
      shifter: 'Pelaje',
      hadozee: 'Pelaje',
      harengon: 'Pelaje',
      aarakocra: 'Plumas',
      kenku: 'Plumas',
      owlin: 'Plumas',
      lizardfolk: 'Escamas',
      kobold: 'Escamas',
      'yuan-ti': 'Escamas',
    };
    const materialColors = (race, feature) => {
      const material = race === 'warforged' && Miniatures.forgedMaterials[feature];
      const plates = form.querySelector('[data-mini-plate-slot]');
      const palette = form.querySelector('[data-mini-skin-slot]');
      plates.hidden = !material;
      palette.hidden = !!material || race === 'dragonborn';
      const container = material ? plates : palette;
      const skin = form.elements.skin.closest('label');
      if (skin.parentElement !== container) container.append(skin);
      relabel('skin', material?.plates || surfaceNames[race] || 'Piel');
      enable('skin', race !== 'dragonborn');
      for (const key of Object.keys(materialSlots)) enable(key, key === material?.core);
      enable('eyeColor', !!material);
    };
    let activeRace = model.race;
    let activeMaterial = model.feature;
    const updateRace = (look, hair = look.hair) => {
      const race = look.race,
        valid = A.faceOptions(race);
      raceControl('size', 'Tamaño', 'size', A.sizeOptions(race), look.size);
      raceControl(
        'feature',
        race === 'warforged' ? 'Material del cuerpo' : 'Rasgo de la raza',
        'feature',
        A.features[race],
        look.feature,
      );
      form.querySelector('[data-mini-feature]').classList.toggle('mini-material-select', race === 'warforged');
      raceControl(
        'lineage',
        'Ascendencia dracónica',
        'ancestry',
        race === 'dragonborn' && {
          red: 'Rojo',
          blue: 'Azul',
          green: 'Verde',
          black: 'Negro',
          white: 'Blanco',
          brass: 'Latón',
          bronze: 'Bronce',
          copper: 'Cobre',
          gold: 'Oro',
          silver: 'Plata',
        },
        look.ancestry,
      );
      raceControl(
        'crown',
        race === 'warforged' ? 'Cresta' : 'Cuernos',
        race === 'warforged' ? 'crest' : 'hornStyle',
        race === 'warforged' ? Miniatures.crestOptions : valid.horns,
        race === 'warforged' ? look.crest || 'ridged' : look.hornStyle || 'natural',
      );
      const styles = A.hairOptions(race, Miniatures.parts.hair);
      optionsFor('hair', styles, Object.hasOwn(styles, hair) ? hair : look.hair);
      const { horns, ...ears } = Miniatures.parts.ears;
      optionsFor('ears', ['custom-lineage', 'other'].includes(race) ? Miniatures.parts.ears : ears, look.ears);
      for (const key of ['hair', 'beard', 'ears', 'scar', 'hairColor']) enable(key, valid[key]);
      relabel('hairColor', race === 'leonin' || race === 'minotaur' ? 'Color de melena' : 'Cabello');
      materialColors(race, look.feature);
      const tones = A.palettes[race];
      const paletteSlot = form.querySelector('[data-mini-race-colors]');
      paletteSlot.hidden = !tones;
      paletteSlot.innerHTML = tones
        ? select(
            'Tonos de piel',
            'skin_preset',
            [['', 'Personalizado'], ...tones.map(color => [color, color])],
            tones.includes(look.skin) ? look.skin : '',
          )
        : '';
      stature(race, look.size, look.height, look.build);
    };
    updateRace(model);
    const terrain = new Map();
    function boardPreview(mini) {
      const tile = Miniatures.boardCell;
      const pack = Miniatures.boardPack(mini);
      const scale = tile / pack.pixelsPerSquare;
      const { width, height } = pack.image;
      const half = Math.max(58, Math.ceil(Math.max(pack.anchor.x, width - pack.anchor.x) * scale + 6));
      const y = Math.max(121, Math.ceil(pack.anchor.y * scale + 8));
      const below = Math.max(35, Math.ceil((height - pack.anchor.y) * scale + 4));
      for (const surface of compare.querySelectorAll('canvas')) {
        const code = surface.dataset.ground;
        surface.width = half * 2;
        surface.height = y + below;
        const ctx = surface.getContext('2d');
        const x = half;
        if (!terrain.has(code)) {
          const sample = document.createElement('canvas');
          sample.width = sample.height = tile * 5;
          BoardArt.paint(sample.getContext('2d'), { cols: 5, rows: 5 }, code.repeat(25), tile);
          terrain.set(code, sample);
        }
        const dx = x - 2.5 * tile,
          dy = y - 2.5 * tile;
        ctx.drawImage(terrain.get(code), dx, dy);
        ctx.beginPath();
        for (let i = 1; i < 5; i++) {
          const xx = dx + i * tile + 0.5,
            yy = dy + i * tile + 0.5;
          ctx.moveTo(xx, 0);
          ctx.lineTo(xx, surface.height);
          ctx.moveTo(0, yy);
          ctx.lineTo(surface.width, yy);
        }
        ctx.strokeStyle = 'rgba(17,23,18,0.42)';
        ctx.stroke();
        const radius = tile * 0.525;
        ctx.beginPath();
        ctx.ellipse(x, y, radius, radius * Math.sin((55 * Math.PI) / 180), 0, 0, Math.PI * 2);
        ctx.strokeStyle = '#4ade80b3';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.lineWidth = 1;
        ctx.drawImage(
          pack.image,
          x - pack.anchor.x * scale,
          y - pack.anchor.y * scale,
          pack.image.width * scale,
          pack.image.height * scale,
        );
      }
    }
    let pending = 0;
    const preview = () => {
      if (pending) cancelAnimationFrame(pending);
      pending = requestAnimationFrame(() => {
        if (!form.isConnected) return;
        const mini = read(new FormData(form));
        if (!compare.hidden) return boardPreview(mini);
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        Miniatures.draw(ctx, mini, canvas.width, null, zoom.getAttribute('aria-pressed') === 'true');
      });
    };
    zoom.addEventListener('click', () => {
      zoom.setAttribute('aria-pressed', String(zoom.getAttribute('aria-pressed') !== 'true'));
      preview();
    });
    board.addEventListener('click', async () => {
      const active = compare.hidden;
      if (active) {
        board.disabled = true;
        try {
          await Miniatures.loadTerrainArt();
        } catch (error) {
          toast(error.message);
          return;
        } finally {
          board.disabled = false;
        }
        if (!form.isConnected) return;
      }
      compare.hidden = !active;
      canvas.hidden = zoom.hidden = active;
      board.setAttribute('aria-pressed', String(active));
      form.querySelector('.mini-workbench').classList.toggle('is-board-view', active);
      preview();
    });
    form.querySelector('[data-mini-hooded]').addEventListener('click', () => {
      const vestments = {
        outfit: 'vestments',
        headwear: 'cowl',
        cloth: '#37323f',
        headColor: '#242530',
        accent: '#b6a589',
      };
      for (const [key, value] of Object.entries(vestments)) form.elements[key].value = value;
      preview();
    });
    form.addEventListener('input', event => {
      const { name, value } = event.target;
      if (name === 'race') {
        const previous = Miniatures.clean({ race: activeRace });
        const next = Miniatures.clean({ race: value });
        const hair = form.elements.hair.value === previous.hair ? next.hair : form.elements.hair.value;
        for (const key of ['skin', 'hairColor', 'cloth', 'beard', 'belt']) {
          const control = form.elements[key];
          if (control.disabled || control.value === previous[key]) control.value = next[key];
        }
        activeRace = value;
        activeMaterial = next.feature;
        updateRace({ ...next, skin: form.elements.skin.value }, hair);
      }
      if (name === 'size')
        stature(activeRace, value, A.heightRange(activeRace, value).standard, form.elements.build.value);
      if (name === 'height') updateHeightLabel();
      if (name === 'feature' && activeRace === 'warforged') {
        const defaultSkin = Miniatures.clean({ race: 'warforged' }).skin;
        const plates = feature => Miniatures.forgedMaterials[feature]?.plateColor || defaultSkin;
        if (form.elements.skin.value === plates(activeMaterial)) form.elements.skin.value = plates(value);
        activeMaterial = value;
        materialColors(activeRace, value);
      }
      if (name === 'skin_preset' && value) form.elements.skin.value = value;
      if (name === 'skin' && form.elements.skin_preset)
        form.elements.skin_preset.value = A.palettes[activeRace].includes(value) ? value : '';
      preview();
    });
    preview();
  }
  function removeMiniature() {
    commit('Miniatura retirada', s => {
      delete s.miniature;
    });
    document.getElementById('modal').close();
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
    Object.assign(actions, {
      'persona-mini': editMiniature,
      'persona-mini-remove': removeMiniature,
      'persona-edit': edit,
      'persona-profs': editProfs,
      'persona-color': editColor,
    });
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
