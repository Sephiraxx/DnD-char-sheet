/* Homebrew en el catálogo: colecciones de la cuenta, editor de clases, subclases, conjuros y criaturas,
   compartir con una mesa y exportar o importar archivos. Los datos los valida y guarda homebrew.js. */
const HomebrewUI = (() => {
  'use strict';
  const H = Homebrew;
  const $ = id => document.getElementById(id);
  const esc = value =>
    String(value ?? '').replace(
      /[&<>"']/g,
      c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const SKILL_ES = {
    acrobatics: 'Acrobacias',
    'animal handling': 'Trato con animales',
    arcana: 'Conocimiento arcano',
    athletics: 'Atletismo',
    deception: 'Engaño',
    history: 'Historia',
    insight: 'Perspicacia',
    intimidation: 'Intimidación',
    investigation: 'Investigación',
    medicine: 'Medicina',
    nature: 'Naturaleza',
    perception: 'Percepción',
    performance: 'Interpretación',
    persuasion: 'Persuasión',
    religion: 'Religión',
    'sleight of hand': 'Juego de manos',
    stealth: 'Sigilo',
    survival: 'Supervivencia',
  };
  const ARMOR_ES = { light: 'Ligera', medium: 'Intermedia', heavy: 'Pesada', shield: 'Escudos' };
  const WEAPON_ES = { simple: 'Sencillas', martial: 'Marciales' };
  const crText = cr => (cr === 0.125 ? '1/8' : cr === 0.25 ? '1/4' : cr === 0.5 ? '1/2' : String(cr));
  let busy = false,
    editing = null; // { kind, id, bookId }

  // ---------- Estado de la cuenta ----------
  const session = () => (typeof Cloud !== 'undefined' && Cloud.enabled ? Cloud.copyState?.('') : null);
  const signedIn = () => typeof Cloud !== 'undefined' && Cloud.enabled && Cloud.hasSession();
  const mine = () => H.state.books.filter(b => b.mine);
  const tableName = id => H.state.tables.find(t => t.id === id)?.name || 'una mesa';
  function say(msg, kind = '') {
    const el = $('homebrew-status');
    if (!el) return;
    el.textContent = msg;
    el.dataset.kind = kind;
  }

  // ---------- Panel ----------
  function panel() {
    const box = $('homebrew-panel');
    if (!box) return;
    if (typeof Cloud === 'undefined' || !Cloud.enabled) {
      box.innerHTML = `<h2>Homebrew</h2><p class="small muted">Esta copia de la aplicación no tiene cuentas configuradas, así que no se puede guardar homebrew.</p>`;
      return;
    }
    if (!signedIn()) {
      box.innerHTML = `<h2>Homebrew</h2><p>Creá clases, subclases, conjuros y criaturas propias. Se guardan en tu cuenta y las podés compartir con una mesa.</p><p class="small">Para empezar, entrá o creá tu cuenta en <a href="./">Crear / abrir ficha</a> → «¿Ya tenés una cuenta?» y volvé a esta página.</p>`;
      return;
    }
    const anon = session()?.account === 'browser';
    const books = mine();
    const shared = H.state.books.filter(b => !b.mine);
    const count = b =>
      [
        ['class', 'clase', 'clases'],
        ['subclass', 'subclase', 'subclases'],
        ['spell', 'conjuro', 'conjuros'],
        ['creature', 'criatura', 'criaturas'],
      ]
        .map(([k, one, many]) => (b.counts?.[k] ? `${b.counts[k]} ${b.counts[k] === 1 ? one : many}` : ''))
        .filter(Boolean)
        .join(' · ') || 'vacía';
    const tables = H.state.tables;
    box.innerHTML = `<div class="card-header"><h2>Homebrew</h2><div class="actions">${['class', 'subclass', 'spell', 'creature'].map(k => `<button type="button" class="button${k === 'class' ? '' : ' secondary'}" data-hb="new" data-kind="${k}" ${books.length ? '' : 'disabled'}>${k === 'creature' ? 'Nueva' : k === 'subclass' ? 'Nueva' : k === 'spell' ? 'Nuevo' : 'Nueva'} ${H.LABEL[k].toLowerCase()}</button>`).join('')}</div></div>
      <p class="small muted">Lo que crees se guarda en tu cuenta. Compartí una colección con una mesa para que sus jugadores vean las clases, subclases y conjuros; las criaturas quedan solo para vos. En el catálogo, elegí «Homebrew» en Libro / fuente para ver solo lo tuyo.</p>
      ${anon ? '<p class="small"><b>Tu acceso es solo de este navegador.</b> Creá una cuenta con email en <a href="./">Personajes → Tu cuenta</a> para no perder tu homebrew si se borran los datos del navegador.</p>' : ''}
      ${H.state.error ? `<p class="small hb-error">${esc(H.state.error)}</p>` : ''}
      ${
        !H.state.loaded
          ? '<p class="small muted">Cargando tu homebrew…</p>'
          : books.length
            ? `<div class="library-books">${books
                .map(
                  b =>
                    `<div class="library-book"><div><b>${esc(b.title)}</b><p class="small muted">${esc(count(b))}${b.shared ? ' · compartida con ' + esc(tableName(b.shared)) : ''}</p></div><div class="actions"><label class="field hb-share">Compartir con<select data-hb="share" data-id="${b.id}"><option value="">Nadie</option>${tables.map(t => `<option value="${t.id}" ${t.id === b.shared ? 'selected' : ''}>${esc(t.name)}${t.role === 'dm' ? ' (DM)' : ''}</option>`).join('')}${b.shared && !tables.some(t => t.id === b.shared) ? `<option value="${b.shared}" selected>Otra mesa</option>` : ''}</select></label><button type="button" class="text-btn" data-hb="export" data-id="${b.id}">Exportar</button><button type="button" class="text-btn" data-hb="rename" data-id="${b.id}">Renombrar</button><button type="button" class="text-btn danger-text" data-hb="delete-book" data-id="${b.id}">Eliminar</button></div></div>`,
                )
                .join('')}</div>`
            : '<p class="small">Todavía no tenés colecciones: creá la primera para empezar.</p>'
      }
      ${shared.length ? `<p class="small muted section-space">Compartido con vos: ${shared.map(b => esc(b.title)).join(', ')}</p>` : ''}
      <div class="actions section-space"><button type="button" class="button secondary" data-hb="new-book">Nueva colección</button><label class="button secondary hb-file">Importar archivo<input type="file" accept="application/json,.json" data-hb="import" hidden /></label></div>
      <p class="small" id="homebrew-status" role="status" aria-live="polite"></p>`;
  }

  // ---------- Editor ----------
  const input = (name, value, attrs = '') => `<input name="${name}" value="${esc(value ?? '')}" ${attrs} />`;
  const field = (label, html, cls = '') => `<label class="field ${cls}">${label}${html}</label>`;
  const area = (name, value, rows = 4, max = 6000) =>
    `<textarea name="${name}" rows="${rows}" maxlength="${max}">${esc(value ?? '')}</textarea>`;
  const select = (name, options, value) =>
    `<select name="${name}">${options.map(([v, t]) => `<option value="${esc(v)}" ${String(v) === String(value ?? '') ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>`;
  const checks = (name, options, values = []) =>
    `<div class="hb-checks">${options.map(([v, t]) => `<label class="check"><input type="checkbox" name="${name}" value="${esc(v)}" ${values.includes(v) ? 'checked' : ''} /> ${esc(t)}</label>`).join('')}</div>`;
  const levels = Array.from({ length: 20 }, (_, i) => [String(i + 1), 'Nivel ' + (i + 1)]);
  // Filas que se repiten (rasgos, acciones…): cada una con sus campos y un botón para quitarla.
  const ROWS = {
    features: {
      add: 'Agregar rasgo',
      fields: r =>
        `<div class="form-grid hb-row-head">${field('Nivel', select('level', levels, r.level || 1))}${field('Nombre', input('name', r.name, 'maxlength="120"'))}</div>${field('Descripción', area('text', r.text, 3))}`,
    },
    prepared: {
      add: 'Agregar conjuro',
      fields: r =>
        `<div class="form-grid hb-row-head">${field('Nivel de clase', select('level', levels, r.level || 3))}${field('Conjuro', `<input name="spell" list="hb-spells" value="${esc(spellName(r.spell))}" maxlength="120" />`)}</div>`,
    },
    traits: {
      add: 'Agregar rasgo',
      fields: r =>
        `${field('Nombre', input('n', r.n, 'maxlength="120"'))}${field('Descripción', area('d', r.d, 2, 3000))}`,
    },
    actions: { add: 'Agregar acción', fields: r => actionFields(r) },
    bonus: { add: 'Agregar acción adicional', fields: r => actionFields(r) },
    reactions: { add: 'Agregar reacción', fields: r => actionFields(r) },
    legendary: { add: 'Agregar acción legendaria', fields: r => actionFields(r) },
  };
  function actionFields(r) {
    const dmg = r.dmg?.[0] || [];
    return `${field('Nombre', input('n', r.n, 'maxlength="120"'))}${field('Descripción', area('d', r.d, 2, 3000))}<div class="form-grid">${field('Bonificador de ataque <span class="muted">(opcional)</span>', input('atk', r.atk ?? '', 'type="number" min="-5" max="30"'))}${field('Daño <span class="muted">(opcional)</span>', input('dmg', dmg[0] || '', 'placeholder="2d6+3" maxlength="20"'))}${field('Tipo de daño', select('type', [['', '—'], ...H.DAMAGE.map(d => [d, d])], dmg[1] || ''))}</div>`;
  }
  const row = (list, r = {}) =>
    `<div class="hb-row" data-list="${list}">${ROWS[list].fields(r)}<button type="button" class="text-btn danger-text" data-hb="row-remove">Quitar</button></div>`;
  const rowsBlock = (list, title, values = [], hint = '') =>
    `<fieldset class="hb-rows" data-rows="${list}"><legend>${title}</legend>${hint ? `<p class="small muted">${hint}</p>` : ''}<div class="hb-row-list">${values.map(v => row(list, v)).join('')}</div><button type="button" class="button secondary" data-hb="row-add" data-list="${list}">${ROWS[list].add}</button></fieldset>`;
  const spellName = id => Catalog.spells.find(s => s.id === id)?.name || id || '';
  const classOptions = () =>
    Object.values(ClassData.classes)
      .map(c => [c.id, c.name + (c.homebrew ? ' (homebrew)' : '')])
      .sort((a, b) => a[1].localeCompare(b[1], 'es'));

  function classForm(d) {
    const officialCasters = Object.values(ClassData.classes)
      .filter(c => c.caster && !c.homebrew)
      .map(c => [c.id, 'Lista de ' + c.name]);
    return `${field('Nombre', input('name', d.name, 'maxlength="80" required'))}
      ${field('Descripción breve', area('summary', d.summary, 2, 2000))}
      <div class="form-grid">${field(
        'Dado de golpe',
        select(
          'die',
          [6, 8, 10, 12].map(n => [n, 'd' + n]),
          d.die || 8,
        ),
      )}${field('Nivel en que elige subclase', select('subclassLevel', levels, d.subclassLevel || 3))}${field('Nombre de las subclases <span class="muted">(opcional)</span>', input('subclassTitle', d.subclassTitle, 'maxlength="60" placeholder="Juramento, Círculo, Tradición…"'))}</div>
      <fieldset><legend>Tiradas de salvación (elegí dos)</legend>${checks(
        'saves',
        H.ABILITIES.map(k => [k, H.ABILITY_ES[k]]),
        d.saves || [],
      )}</fieldset>
      <fieldset><legend>Habilidades</legend>${field('Cuántas elige', input('skillCount', d.skills?.count ?? 2, 'type="number" min="0" max="6"'))}<p class="small muted">De cuáles (sin marcar ninguna: cualquiera).</p>${checks(
        'skills',
        H.SKILLS.map(k => [k, SKILL_ES[k]]),
        d.skills?.from?.length === H.SKILLS.length ? [] : d.skills?.from || [],
      )}</fieldset>
      <fieldset><legend>Competencias</legend><p class="small">Armadura</p>${checks(
        'armor',
        H.ARMOR.map(k => [k, ARMOR_ES[k]]),
        d.armor || [],
      )}<p class="small">Armas</p>${checks(
        'weapons',
        H.WEAPONS.map(k => [k, WEAPON_ES[k]]),
        d.weapons || [],
      )}${field('Otras armas', input('weaponsOther', d.weaponsOther, 'maxlength="300" placeholder="Látigos, cimitarras…"'))}${field('Herramientas', input('tools', d.tools, 'maxlength="300"'))}</fieldset>
      <fieldset><legend>Conjuros</legend><div class="form-grid">${field(
        'Lanzamiento',
        select(
          'caster',
          Object.entries(H.CASTERS).map(([k, v]) => [k, v.label]),
          d.caster || '',
        ),
      )}${field('Característica', select('ability', [['', '—'], ...H.ABILITIES.map(k => [k, H.ABILITY_ES[k]])], d.ability || ''))}${field('Qué conjuros puede aprender', select('spellList', [['own', 'Solo los homebrew que marquen esta clase'], ...officialCasters], d.spellList || 'own'))}</div></fieldset>
      ${rowsBlock('features', 'Rasgos de clase', d.features || [], 'Cada rasgo con el nivel en que se obtiene. Los efectos se aplican en la mesa: la ficha muestra el texto.')}`;
  }
  function subclassForm(d) {
    return `<div class="form-grid">${field('Clase', select('classId', classOptions(), d.classId || 'fighter'))}${field('Nombre', input('name', d.name, 'maxlength="80" required'))}</div>
      ${field('Descripción breve', area('summary', d.summary, 2, 2000))}
      ${rowsBlock('features', 'Rasgos de subclase', d.features || [])}
      ${rowsBlock('prepared', 'Conjuros siempre preparados <span class="muted">(opcional)</span>', d.prepared || [], 'Como los de un dominio o un juramento: se suman a los de la clase al llegar a ese nivel.')}`;
  }
  function spellForm(d) {
    const roll = d.roll || '';
    return `${field('Nombre', input('name', d.name, 'maxlength="120" required'))}
      <div class="form-grid">${field('Nivel', select('level', [['0', 'Truco'], ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => [n, 'Nivel ' + n])], d.level ?? 1))}${field(
        'Escuela',
        select(
          'school',
          H.SCHOOLS.map(s => [s, s]),
          d.school || 'Evocación',
        ),
      )}${field(
        'Tiempo de lanzamiento',
        select(
          'time',
          [
            ['Acción', '1 acción'],
            ['Adicional', '1 acción adicional'],
            ['Reacción', '1 reacción'],
            ['Especial', 'Otro (escribilo abajo)'],
          ],
          d.time || 'Acción',
        ),
      )}</div>
      <div class="form-grid">${field('Tiempo, como se lee <span class="muted">(opcional)</span>', input('castingTimeEs', d.castingTimeEs, 'maxlength="80" placeholder="1 minuto, 1 reacción cuando…"'))}${field('Alcance', input('range', d.range || '60 pies', 'maxlength="80" required'))}${field('Duración', input('duration', d.duration || 'Instantáneo', 'maxlength="80" required'))}</div>
      <fieldset><legend>Componentes</legend>${checks(
        'components',
        [
          ['V', 'Verbal'],
          ['S', 'Somático'],
          ['M', 'Material'],
        ],
        d.components || ['V', 'S'],
      )}${field('Materiales', input('material', d.material, 'maxlength="300"'))}${checks(
        'flags',
        [
          ['concentration', 'Concentración'],
          ['ritual', 'Ritual'],
        ],
        [d.concentration && 'concentration', d.ritual && 'ritual'].filter(Boolean),
      )}</fieldset>
      <fieldset><legend>Clases que lo pueden aprender</legend>${checks('classes', classOptions(), d.classes || [])}</fieldset>
      ${field('Descripción', area('text', d.text, 6, 8000))}
      ${field('A niveles superiores <span class="muted">(opcional)</span>', area('higher', d.higher, 2, 2000))}
      <fieldset><legend>Tirada en combate <span class="muted">(opcional)</span></legend><p class="small muted">Si la completás, la ficha ofrece la tirada al lanzarlo.</p><div class="form-grid">${field(
        'Resolución',
        select(
          'roll',
          [
            ['', 'Sin tirada'],
            ['melee', 'Ataque de conjuro cuerpo a cuerpo'],
            ['ranged', 'Ataque de conjuro a distancia'],
            ['save', 'Tirada de salvación'],
            ['heal', 'Curación'],
          ],
          roll,
        ),
      )}${field('Salvación de', select('save', [['', '—'], ...H.ABILITIES.map(k => [k, H.ABILITY_ES[k]])], d.save || ''))}${field('Dados', input('damage', d.damage, 'maxlength="20" placeholder="3d6"'))}${field('Tipo de daño', select('damageType', [['', '—'], ...H.DAMAGE.map(x => [x, x])], d.damageType || ''))}${field('Aumento <span class="muted">(por nivel de espacio; en trucos, a los niveles 5, 11 y 17)</span>', input('scale', d.scale, 'maxlength="20" placeholder="1d6"'))}</div></fieldset>`;
  }
  function creatureForm(d) {
    const ab = d.ab || [10, 10, 10, 10, 10, 10];
    const crs = Object.keys(H.CR_XP)
      .map(Number)
      .sort((a, b) => a - b)
      .map(c => [c, `VD ${crText(c)} (${H.CR_XP[c]} PX)`]);
    return `${field('Nombre', input('name', d.name, 'maxlength="120" required'))}
      <div class="form-grid">${field(
        'Tamaño',
        select(
          'size',
          H.SIZES.map(s => [s, s]),
          d.size || 'Mediano',
        ),
      )}${field('Tipo', input('type', d.type || 'humanoide', 'maxlength="60" list="hb-types" required'))}${field('Alineamiento', input('align', d.align, 'maxlength="60" placeholder="neutral"'))}</div>
      <div class="form-grid">${field('CA', input('ac', d.ac ?? 12, 'type="number" min="1" max="40" required'))}${field('Puntos de golpe', input('hp', d.hp ?? 10, 'type="number" min="1" max="2000" required'))}${field('Dados de golpe', input('hd', d.hd, 'maxlength="20" placeholder="3d8+3"'))}${field('Valor de desafío', select('cr', crs, d.cr ?? 1))}</div>
      ${field('Velocidad', input('speed', d.speed || '30 pies', 'maxlength="120"'))}
      <fieldset><legend>Características</legend><div class="hb-abilities">${H.ABILITIES.map((k, i) => field(H.ABILITY_ES[k].slice(0, 3).toUpperCase(), input('ab' + i, ab[i], 'type="number" min="1" max="30" required'))).join('')}</div></fieldset>
      <div class="form-grid">${field('Salvaciones', input('saves', d.saves, 'maxlength="200" placeholder="Des +4, Sab +2"'))}${field('Habilidades', input('skills', d.skills, 'maxlength="300" placeholder="Percepción +4, Sigilo +5"'))}</div>
      <div class="form-grid">${field('Vulnerabilidades', input('vuln', d.vuln, 'maxlength="200"'))}${field('Resistencias', input('res', d.res, 'maxlength="300"'))}${field('Inmunidades', input('imm', d.imm, 'maxlength="300"'))}${field('Inmunidades a estados', input('cimm', d.cimm, 'maxlength="300"'))}</div>
      <div class="form-grid">${field('Sentidos', input('senses', d.senses, 'maxlength="200" placeholder="Visión en la oscuridad 60 pies, Percepción pasiva 12"'))}${field('Idiomas', input('lang', d.lang, 'maxlength="200"'))}</div>
      ${rowsBlock(
        'traits',
        'Rasgos',
        (d.traits || []).map(t => (Array.isArray(t) ? { n: t[0], d: t[1] } : t)),
      )}
      ${rowsBlock('actions', 'Acciones', d.actions || [], 'Con bonificador y daño, la pantalla del DM tira el ataque en combate.')}
      ${rowsBlock('bonus', 'Acciones adicionales', d.bonus || [])}
      ${rowsBlock('reactions', 'Reacciones', d.reactions || [])}
      ${rowsBlock('legendary', 'Acciones legendarias', d.legendary || [])}`;
  }
  const FORMS = { class: classForm, subclass: subclassForm, spell: spellForm, creature: creatureForm };

  function open(kind, data = {}, { bookId, copy = false } = {}) {
    const books = mine();
    if (!books.length) return say('Creá una colección primero.', 'error');
    const entry = data.id ? H.entry(data.id) : null;
    editing = { kind, id: copy ? '' : data.id || '', bookId: bookId || entry?.bookId || books[0].id };
    const d = copy ? { ...data, id: '', name: data.name + ' (copia)' } : data;
    $('homebrew-editor-title').textContent =
      `${editing.id ? 'Editar' : 'Nueva'} ${H.LABEL[kind].toLowerCase()}`.replace(/^Nueva (conjuro)/, 'Nuevo $1');
    $('homebrew-editor-body').innerHTML = `${
      books.length > 1
        ? field(
            'Colección',
            select(
              'bookId',
              books.map(b => [b.id, b.title]),
              editing.bookId,
            ),
          )
        : ''
    }${FORMS[kind](d)}
      <datalist id="hb-spells">${Catalog.spells
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, 'es'))
        .map(s => `<option value="${esc(s.name)}"></option>`)
        .join('')}</datalist>
      <datalist id="hb-types">${['aberración', 'bestia', 'celestial', 'constructo', 'dragón', 'elemental', 'feérico', 'infernal', 'gigante', 'humanoide', 'monstruosidad', 'cieno', 'planta', 'muerto viviente'].map(t => `<option value="${t}"></option>`).join('')}</datalist>
      <p class="small hb-error" id="homebrew-editor-error" role="alert"></p>`;
    $('homebrew-editor').showModal();
    $('homebrew-editor-body').querySelector('input[name="name"]')?.focus();
  }

  // Lee el formulario y arma el objeto que valida homebrew.js.
  function read(kind) {
    const form = $('homebrew-editor-form');
    const all = name => [...form.querySelectorAll(`[name="${name}"]:checked`)].map(x => x.value);
    const val = name => {
      // Solo los campos que no están dentro de una fila repetida.
      const el = [...form.querySelectorAll(`[name="${name}"]`)].find(x => !x.closest('.hb-row'));
      return el ? el.value : '';
    };
    const list = name =>
      [...form.querySelectorAll(`.hb-row[data-list="${name}"]`)].map(r =>
        Object.fromEntries([...r.querySelectorAll('[name]')].map(i => [i.name, i.value])),
      );
    const d = { id: editing.id };
    if (kind === 'class')
      Object.assign(d, {
        name: val('name'),
        summary: val('summary'),
        die: Number(val('die')),
        subclassLevel: Number(val('subclassLevel')),
        subclassTitle: val('subclassTitle'),
        saves: all('saves'),
        skills: { count: Number(val('skillCount')), from: all('skills') },
        armor: all('armor'),
        weapons: all('weapons'),
        weaponsOther: val('weaponsOther'),
        tools: val('tools'),
        caster: val('caster'),
        ability: val('ability'),
        spellList: val('spellList'),
        features: list('features'),
      });
    if (kind === 'subclass') {
      const byName = new Map(Catalog.spells.map(s => [s.name.toLowerCase(), s.id]));
      Object.assign(d, {
        classId: val('classId'),
        name: val('name'),
        summary: val('summary'),
        features: list('features'),
        prepared: list('prepared').map(p => {
          const id = byName.get(String(p.spell).trim().toLowerCase());
          if (p.spell && !id) throw Error(`No encontré el conjuro «${p.spell}»: elegilo de la lista.`);
          return { level: p.level, spell: id || '' };
        }),
      });
    }
    if (kind === 'spell') {
      const flags = all('flags');
      Object.assign(d, {
        name: val('name'),
        level: Number(val('level')),
        school: val('school'),
        time: val('time'),
        castingTimeEs: val('castingTimeEs'),
        range: val('range'),
        duration: val('duration'),
        components: all('components'),
        material: val('material'),
        concentration: flags.includes('concentration'),
        ritual: flags.includes('ritual'),
        classes: all('classes'),
        text: val('text'),
        higher: val('higher'),
        roll: val('roll'),
        save: val('save'),
        damage: val('damage'),
        damageType: val('damageType'),
        scale: val('scale'),
      });
    }
    if (kind === 'creature') {
      const acts = name =>
        list(name).map(a => ({
          n: a.n,
          d: a.d,
          atk: a.atk === '' ? undefined : Number(a.atk),
          dmg: a.dmg,
          type: a.type,
        }));
      Object.assign(d, {
        name: val('name'),
        size: val('size'),
        type: val('type'),
        align: val('align'),
        ac: Number(val('ac')),
        hp: Number(val('hp')),
        hd: val('hd'),
        cr: Number(val('cr')),
        speed: val('speed'),
        ab: [0, 1, 2, 3, 4, 5].map(i => Number(val('ab' + i))),
        saves: val('saves'),
        skills: val('skills'),
        vuln: val('vuln'),
        res: val('res'),
        imm: val('imm'),
        cimm: val('cimm'),
        senses: val('senses'),
        lang: val('lang'),
        traits: list('traits').map(t => ({ n: t.n, d: t.d })),
        actions: acts('actions'),
        bonus: acts('bonus'),
        reactions: acts('reactions'),
        legendary: acts('legendary'),
      });
    }
    return { data: d, bookId: val('bookId') || editing.bookId };
  }

  async function submit(e) {
    e.preventDefault();
    if (busy || !editing) return;
    const err = $('homebrew-editor-error');
    err.textContent = '';
    let out;
    try {
      out = read(editing.kind);
      H.clean(editing.kind, out.data); // valida antes de enviar: el mensaje queda en el formulario
    } catch (x) {
      err.textContent = x.message;
      return;
    }
    busy = true;
    const btn = $('homebrew-editor-save');
    btn.disabled = true;
    btn.textContent = 'Guardando…';
    try {
      const saved = await H.save(out.bookId, editing.kind, out.data);
      $('homebrew-editor').close();
      say(`«${saved.name}» quedó guardado en tu homebrew.`);
      document.dispatchEvent(new CustomEvent('homebrew-saved', { detail: { kind: editing.kind, id: saved.id } }));
    } catch (x) {
      err.textContent = x.message;
    } finally {
      busy = false;
      btn.disabled = false;
      btn.textContent = 'Guardar';
    }
  }

  // ---------- Acciones del panel y del detalle ----------
  function download(name, content) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
    a.download = name;
    document.body.append(a);
    a.click();
    setTimeout(() => (URL.revokeObjectURL(a.href), a.remove()), 1000);
  }
  const slug = s =>
    String(s)
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'homebrew';
  async function run(fn, done) {
    if (busy) return;
    busy = true;
    try {
      await fn();
      if (done) say(done);
    } catch (x) {
      say(x.message, 'error');
    } finally {
      busy = false;
      panel();
      if (done) {
        const el = $('homebrew-status');
        if (el) el.textContent = done;
      }
    }
  }
  async function act(el) {
    const what = el.dataset.hb,
      id = el.dataset.id;
    if (what === 'new') return open(el.dataset.kind);
    if (what === 'new-book') {
      const title = prompt('Nombre de la colección', mine().length ? 'Homebrew ' + (mine().length + 1) : 'Mi homebrew');
      if (title === null) return;
      return run(() => H.createBook(title), 'Colección creada.');
    }
    if (what === 'rename') {
      const b = H.book(id);
      const title = prompt('Nuevo nombre de la colección', b?.title || '');
      if (title === null) return;
      return run(() => H.updateBook(id, { title }), 'Nombre cambiado.');
    }
    if (what === 'delete-book') {
      const b = H.book(id);
      const n = H.state.entries.filter(e => e.bookId === id).length;
      if (
        !confirm(
          `¿Eliminar «${b?.title}» y sus ${n} entradas? No se puede deshacer. Exportala antes si querés una copia.`,
        )
      )
        return;
      return run(() => H.deleteBook(id), 'Colección eliminada.');
    }
    if (what === 'export') {
      const b = H.book(id);
      download(slug(b.title) + '.json', H.exportBook(id));
      return say('Archivo descargado.');
    }
    if (what === 'row-add') {
      const box = el.closest('.hb-rows').querySelector('.hb-row-list');
      box.insertAdjacentHTML('beforeend', row(el.dataset.list));
      box.lastElementChild.querySelector('input, textarea')?.focus();
      return;
    }
    if (what === 'row-remove') return el.closest('.hb-row').remove();
    const entry = H.entry(id);
    if (!entry) return;
    if (what === 'edit') return ($('compendium-detail')?.close(), open(entry.kind, entry.data));
    if (what === 'copy') return ($('compendium-detail')?.close(), open(entry.kind, entry.data, { copy: true }));
    if (what === 'delete') {
      const deps = entry.kind === 'class' ? H.dependents(id) : [];
      const warn = deps.length
        ? `\n\nTambién la usan: ${deps.map(d => d.data.name).join(', ')}. Esas entradas quedan guardadas pero no se muestran sin la clase.`
        : '';
      if (!confirm(`¿Eliminar «${entry.data.name}»? No se puede deshacer.${warn}`)) return;
      $('compendium-detail')?.close();
      return run(() => H.remove(entry.bookId, entry.kind, id), `«${entry.data.name}» eliminado.`);
    }
  }
  async function importFile(input) {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (file.size > 3e6) return say('El archivo pesa más de 3 MB.', 'error');
    let parsed;
    try {
      parsed = H.parseFile(await file.text());
    } catch (x) {
      return say(x.message, 'error');
    }
    if (!parsed.entries.length) return say('El archivo no tiene entradas válidas.', 'error');
    run(
      async () => {
        const book = mine().find(b => b.title === parsed.title) || (await H.createBook(parsed.title));
        await H.importInto(book.id, parsed.entries, (n, total) => say(`Importando ${n} de ${total}…`));
      },
      `Importadas ${parsed.entries.length} entradas en «${parsed.title}».${parsed.skipped.length ? ` ${parsed.skipped.length} no se pudieron leer: ${parsed.skipped.slice(0, 3).join('; ')}` : ''}`,
    );
  }
  // Botones del detalle de una entrada homebrew (solo si es tuya).
  function detailActions(x) {
    if (!x.homebrew) return '';
    const { book } = x.homebrew;
    const owner = book?.mine;
    const note = owner
      ? book?.shared
        ? 'Colección compartida con ' + tableName(book.shared) + '.'
        : ''
      : 'Compartido por otra persona de tu mesa.';
    return `${note ? `<p class="small muted">${esc(note)}</p>` : ''}${
      owner
        ? `<div class="actions section-space"><button type="button" class="button" data-hb="edit" data-id="${x.id}">Editar</button><button type="button" class="button secondary" data-hb="copy" data-id="${x.id}">Duplicar</button><button type="button" class="button secondary danger-text" data-hb="delete" data-id="${x.id}">Eliminar</button></div>`
        : ''
    }`;
  }

  function init() {
    document.addEventListener('click', e => {
      const el = e.target.closest('[data-hb]');
      if (!el || el.tagName === 'SELECT' || el.type === 'file') return;
      act(el);
    });
    document.addEventListener('change', e => {
      const el = e.target;
      if (el.dataset?.hb === 'share') {
        const to = el.value || null;
        run(
          () => H.updateBook(el.dataset.id, { shared: to }),
          to ? `Compartida con ${tableName(to)}.` : 'Ya no se comparte.',
        );
      }
      if (el.dataset?.hb === 'import') importFile(el);
    });
    $('homebrew-editor-form').addEventListener('submit', submit);
    $('homebrew-editor-cancel').addEventListener('click', () => $('homebrew-editor').close());
    addEventListener('homebrew-change', panel);
    panel();
    if (signedIn()) Promise.all([H.load(), H.tables()]).then(panel, () => panel());
    else H.state.loaded = true;
  }
  return { init, panel, open, detailActions };
})();
