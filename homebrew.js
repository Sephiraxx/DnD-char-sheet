/* Homebrew: clases, subclases, conjuros y criaturas propias.
   Se guardan en la cuenta, en colecciones (libros de la biblioteca marcados como homebrew, migración 015),
   y una colección se puede compartir con una mesa: sus jugadores ven las clases, subclases y conjuros
   (las criaturas quedan solo para quien las creó, como en la biblioteca).
   Este archivo valida los datos, los suma al catálogo de la página (ClassData, Catalog, MonsterData) y
   guarda una copia local para que estén disponibles al abrir, antes de que conteste el servidor. */
(function (root) {
  'use strict';
  const CACHE = 'dnd-homebrew-cache-v1';
  // Tipo de la interfaz → tipo en library_entries.
  const DB_KIND = { class: 'class', subclass: 'subclass', spell: 'spell', creature: 'monster' };
  const UI_KIND = { class: 'class', subclass: 'subclass', spell: 'spell', monster: 'creature' };
  const KINDS = Object.keys(DB_KIND);
  const LABEL = { class: 'Clase', subclass: 'Subclase', spell: 'Conjuro', creature: 'Criatura' };
  const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  const ABILITY_ES = {
    str: 'Fuerza',
    dex: 'Destreza',
    con: 'Constitución',
    int: 'Inteligencia',
    wis: 'Sabiduría',
    cha: 'Carisma',
  };
  const SKILLS = [
    'acrobatics',
    'animal handling',
    'arcana',
    'athletics',
    'deception',
    'history',
    'insight',
    'intimidation',
    'investigation',
    'medicine',
    'nature',
    'perception',
    'performance',
    'persuasion',
    'religion',
    'sleight of hand',
    'stealth',
    'survival',
  ];
  const ARMOR = ['light', 'medium', 'heavy', 'shield'];
  const WEAPONS = ['simple', 'martial'];
  // Cómo lanza conjuros una clase homebrew: copia la progresión de una clase oficial.
  const CASTERS = {
    '': { label: 'No lanza conjuros' },
    full: { label: 'Completo (como el mago o el clérigo)' },
    '1/2': { label: 'Medio (como el paladín o el explorador)' },
    '1/3': { label: 'Un tercio (como el caballero arcano)' },
    pact: { label: 'Magia de pacto (como el brujo)' },
  };
  const SCHOOLS = [
    'Abjuración',
    'Adivinación',
    'Conjuración',
    'Encantamiento',
    'Evocación',
    'Ilusión',
    'Nigromancia',
    'Transmutación',
  ];
  const TIMES = ['Acción', 'Adicional', 'Reacción', 'Especial'];
  const SIZES = ['Diminuto', 'Pequeño', 'Mediano', 'Grande', 'Enorme', 'Gargantuesco'];
  const CR_XP = {
    0: 10,
    0.125: 25,
    0.25: 50,
    0.5: 100,
    1: 200,
    2: 450,
    3: 700,
    4: 1100,
    5: 1800,
    6: 2300,
    7: 2900,
    8: 3900,
    9: 5000,
    10: 5900,
    11: 7200,
    12: 8400,
    13: 10000,
    14: 11500,
    15: 13000,
    16: 15000,
    17: 18000,
    18: 20000,
    19: 22000,
    20: 25000,
    21: 33000,
    22: 41000,
    23: 50000,
    24: 62000,
    25: 75000,
    26: 90000,
    27: 105000,
    28: 120000,
    29: 135000,
    30: 155000,
  };
  const DAMAGE = [
    'ácido',
    'contundente',
    'cortante',
    'frío',
    'fuego',
    'fuerza',
    'necrótico',
    'perforante',
    'psíquico',
    'radiante',
    'relámpago',
    'trueno',
    'veneno',
  ];

  // ---------- Validación ----------
  // Todo lo que entra (del formulario, de un archivo o de la mesa) pasa por acá: tipos, largos y listas
  // conocidas. Lo que no cumple se rechaza con un mensaje que dice qué revisar.
  const bad = msg => {
    throw Error(msg);
  };
  const text = (v, max, label, { empty = true } = {}) => {
    const s = String(v ?? '').trim();
    if (!empty && !s) bad(`Completá ${label}.`);
    if (s.length > max) bad(`${label[0].toUpperCase() + label.slice(1)}: hasta ${max} caracteres.`);
    return s;
  };
  const int = (v, min, max, label) => {
    const n = Number(v);
    if (!Number.isInteger(n) || n < min || n > max) bad(`${label}: un número entero de ${min} a ${max}.`);
    return n;
  };
  const oneOf = (v, list, label) => (list.includes(v) ? v : bad(`Elegí ${label}.`));
  const subset = (v, list) => [...new Set((Array.isArray(v) ? v : []).filter(x => list.includes(x)))];
  const rows = (v, max, label, each) => {
    const a = Array.isArray(v) ? v : [];
    if (a.length > max) bad(`${label}: hasta ${max}.`);
    return a.map(each).filter(Boolean);
  };
  const DICE = /^\d{1,2}d(4|6|8|10|12|20)( ?[+-] ?\d{1,3})?$/;
  const dice = (v, label) => {
    const s = text(v, 20, label).replace(/\s+/g, '');
    if (s && !DICE.test(s)) bad(`${label}: escribí dados como 2d6 o 1d8+3.`);
    return s;
  };
  // Prefijo por tipo: un id de clase nunca se confunde con uno de criatura.
  const PREFIX = { class: 'cl', subclass: 'sc', spell: 'sp', creature: 'cr' };
  const isId = (id, kind) =>
    /^hb-(cl|sc|sp|cr)-[a-z0-9]{6,20}$/.test(String(id || '')) && (!kind || id.slice(3, 5) === PREFIX[kind]);
  const newId = kind =>
    'hb-' +
    PREFIX[kind] +
    '-' +
    (root.crypto?.randomUUID?.().replace(/-/g, '').slice(0, 12) ||
      Math.random().toString(36).slice(2, 14).padEnd(12, '0'));
  const feature = (f, i) => {
    if (!f || (!String(f.name || '').trim() && !String(f.text || '').trim())) return null;
    return {
      level: int(f.level, 1, 20, `Nivel del rasgo ${i + 1}`),
      name: text(f.name, 120, `el nombre del rasgo ${i + 1}`, { empty: false }),
      text: text(f.text, 6000, `la descripción del rasgo ${i + 1}`),
    };
  };
  const byLevel = list => list.sort((a, b) => a.level - b.level);

  function cleanClass(d) {
    const caster = d.caster && CASTERS[d.caster] ? d.caster : '';
    const ability = caster ? oneOf(d.ability, ABILITIES, 'la característica para lanzar conjuros') : null;
    const saves = subset(d.saves, ABILITIES);
    if (saves.length !== 2) bad('Elegí dos tiradas de salvación.');
    const skills = subset(d.skills?.from, SKILLS);
    return {
      id: d.id,
      name: text(d.name, 80, 'el nombre de la clase', { empty: false }),
      summary: text(d.summary, 2000, 'la descripción'),
      die: oneOf(Number(d.die), [6, 8, 10, 12], 'el dado de golpe'),
      saves,
      armor: subset(d.armor, ARMOR),
      weapons: subset(d.weapons, WEAPONS),
      weaponsOther: text(d.weaponsOther, 300, 'las otras armas'),
      tools: text(d.tools, 300, 'las herramientas'),
      skills: { count: int(d.skills?.count ?? 2, 0, 6, 'Habilidades a elegir'), from: skills.length ? skills : SKILLS },
      caster,
      ability,
      // Conjuros que puede aprender: la lista de una clase oficial o solo los homebrew que la marquen.
      spellList: caster ? text(d.spellList, 40, 'la lista de conjuros') || 'own' : '',
      subclassLevel: int(d.subclassLevel ?? 3, 1, 20, 'Nivel de la subclase'),
      subclassTitle: text(d.subclassTitle, 60, 'el nombre de las subclases'),
      features: byLevel(rows(d.features, 80, 'Rasgos', feature)),
    };
  }
  function cleanSubclass(d) {
    return {
      id: d.id,
      classId: text(d.classId, 60, 'la clase', { empty: false }),
      name: text(d.name, 80, 'el nombre de la subclase', { empty: false }),
      summary: text(d.summary, 2000, 'la descripción'),
      features: byLevel(rows(d.features, 60, 'Rasgos', feature)),
      // Conjuros siempre preparados que da la subclase, por nivel de clase.
      prepared: byLevel(
        rows(d.prepared, 40, 'Conjuros de la subclase', (p, i) =>
          p?.spell
            ? { level: int(p.level, 1, 20, `Nivel del conjuro ${i + 1}`), spell: text(p.spell, 80, 'el conjuro') }
            : null,
        ),
      ),
    };
  }
  function cleanSpell(d) {
    const level = int(d.level, 0, 9, 'Nivel del conjuro');
    const components = subset(d.components, ['V', 'S', 'M']);
    const roll = ['', 'melee', 'ranged', 'save', 'heal'].includes(d.roll) ? d.roll : '';
    const save = roll === 'save' ? oneOf(d.save, ABILITIES, 'la característica de la salvación') : '';
    const damage = dice(d.damage, 'Daño');
    const damageType = damage && roll !== 'heal' ? (DAMAGE.includes(d.damageType) ? d.damageType : '') : '';
    return {
      id: d.id,
      name: text(d.name, 120, 'el nombre del conjuro', { empty: false }),
      level,
      school: oneOf(d.school, SCHOOLS, 'la escuela'),
      time: oneOf(d.time, TIMES, 'el tiempo de lanzamiento'),
      castingTimeEs: text(d.castingTimeEs, 80, 'el tiempo de lanzamiento'),
      range: text(d.range, 80, 'el alcance', { empty: false }),
      components,
      material: components.includes('M') ? text(d.material, 300, 'los materiales') : '',
      duration: text(d.duration, 80, 'la duración', { empty: false }),
      concentration: Boolean(d.concentration),
      ritual: Boolean(d.ritual),
      classes: [...new Set((Array.isArray(d.classes) ? d.classes : []).map(String).filter(x => x.length <= 60))].slice(
        0,
        30,
      ),
      text: text(d.text, 8000, 'la descripción', { empty: false }),
      higher: text(d.higher, 2000, 'el texto a niveles superiores'),
      roll,
      save,
      damage,
      damageType,
      // Dados extra por cada nivel de espacio por encima del mínimo (conjuros) o por nivel del lanzador (trucos).
      scale: dice(d.scale, 'Aumento'),
    };
  }
  // Acepta tanto lo que llega del formulario (dmg: «2d6», type) como lo ya guardado (dmg: [[«2d6», tipo]]).
  const flat = a =>
    a && Array.isArray(a.dmg) ? { ...a, dmg: a.dmg[0]?.[0] || '', type: a.type || a.dmg[0]?.[1] || '' } : a;
  const named = (label, max) => (raw, i) => {
    const a = flat(raw);
    return a && (String(a.n || '').trim() || String(a.d || '').trim())
      ? {
          n: text(a.n, 120, `el nombre de ${label} ${i + 1}`, { empty: false }),
          d: text(a.d, 3000, `la descripción de ${label} ${i + 1}`),
          ...(a.atk !== undefined && a.atk !== '' && a.atk !== null
            ? { atk: int(a.atk, -5, 30, `Bonificador de ${label} ${i + 1}`) }
            : {}),
          ...(a.dmg
            ? (() => {
                const v = dice(a.dmg, `Daño de ${label} ${i + 1}`);
                return v ? { dmg: [[v, DAMAGE.includes(a.type) ? a.type : '']] } : {};
              })()
            : {}),
        }
      : null;
  };
  function cleanCreature(d) {
    const cr = Number(d.cr);
    if (!(cr in CR_XP)) bad('Elegí el valor de desafío.');
    const ab = ABILITIES.map((k, i) => int(d.ab?.[i] ?? 10, 1, 30, ABILITY_ES[k]));
    const action = named('la acción', 20);
    return {
      id: d.id,
      name: text(d.name, 120, 'el nombre de la criatura', { empty: false }),
      size: oneOf(d.size, SIZES, 'el tamaño'),
      type: text(d.type, 60, 'el tipo', { empty: false }).toLowerCase(),
      align: text(d.align, 60, 'el alineamiento') || 'sin alineamiento',
      ac: int(d.ac, 1, 40, 'CA'),
      hp: int(d.hp, 1, 2000, 'Puntos de golpe'),
      hd: dice(d.hd, 'Dados de golpe') || '',
      speed: text(d.speed, 120, 'la velocidad') || '30 pies',
      ab,
      saves: text(d.saves, 200, 'las salvaciones'),
      skills: text(d.skills, 300, 'las habilidades'),
      vuln: text(d.vuln, 200, 'las vulnerabilidades'),
      res: text(d.res, 300, 'las resistencias'),
      imm: text(d.imm, 300, 'las inmunidades'),
      cimm: text(d.cimm, 300, 'las inmunidades a estados'),
      senses: text(d.senses, 200, 'los sentidos'),
      lang: text(d.lang, 200, 'los idiomas') || '—',
      cr,
      xp: CR_XP[cr],
      traits: rows(d.traits, 20, 'Rasgos', (t, i) => {
        const pair = Array.isArray(t) ? { n: t[0], d: t[1] } : t;
        const x = named('el rasgo', 20)(pair, i);
        return x ? [x.n, x.d] : null;
      }),
      actions: rows(d.actions, 20, 'Acciones', action),
      bonus: rows(d.bonus, 10, 'Acciones adicionales', named('la acción adicional', 10)),
      reactions: rows(d.reactions, 10, 'Reacciones', named('la reacción', 10)),
      legendary: rows(d.legendary, 10, 'Acciones legendarias', named('la acción legendaria', 10)),
    };
  }
  const CLEAN = { class: cleanClass, subclass: cleanSubclass, spell: cleanSpell, creature: cleanCreature };
  function clean(kind, data) {
    if (!CLEAN[kind]) bad('Tipo de homebrew desconocido.');
    const d = data && typeof data === 'object' ? data : {};
    const out = CLEAN[kind]({ ...d, id: isId(d.id, kind) ? d.id : newId(kind) });
    out.homebrew = true;
    if (JSON.stringify(out).length > 100000) bad('Es demasiado largo para guardarlo: acortá las descripciones.');
    return out;
  }

  // ---------- Al catálogo de la página ----------
  // Forma que usan el resto de los módulos (ClassData, Catalog, MonsterData), sin perder los datos originales.
  const lines = list => list.join('\n');
  function asClass(x, book) {
    return {
      id: x.id,
      name: x.name,
      english: '',
      source: 'HB',
      die: x.die,
      saves: x.saves,
      ability: x.ability,
      caster: x.caster || null,
      prepared: null,
      cantrips: null,
      known: null,
      features: x.features.map(f => ({ ...f, source: 'HB', optional: false, children: [], english: '' })),
      choices: [],
      skills: { count: x.skills.count, from: x.skills.from },
      armor: lines(x.armor),
      weapons: lines([...x.weapons, ...(x.weaponsOther ? [x.weaponsOther] : [])]),
      tools: x.tools,
      subclassLevel: x.subclassLevel,
      homebrew: { book, data: x },
    };
  }
  function asSubclass(x, book) {
    return {
      id: x.id,
      classId: x.classId,
      name: x.name,
      source: 'HB',
      english: '',
      features: x.features.map(f => ({ ...f, source: 'HB', children: [], english: '' })),
      caster: null,
      ability: null,
      cantrips: null,
      known: null,
      choices: [],
      spells: [],
      homebrew: { book, data: x },
    };
  }
  const SAVE_ES = Object.fromEntries(ABILITIES.map(k => [k, ABILITY_ES[k]]));
  function asSpell(x, book) {
    const dmg = x.damage && x.roll !== 'heal' ? [[x.damage, x.damageType]] : null;
    const diceInfo = dmg
      ? { dmg, ...(x.scale ? (x.level ? { up: [x.scale] } : {}) : {}) }
      : x.roll === 'heal' && x.damage
        ? { heal: [x.damage, 1], ...(x.scale && x.level ? { up: [x.scale] } : {}) }
        : null;
    if (diceInfo && !x.level && x.scale && dmg) {
      // Truco: el daño sube a los niveles 5, 11 y 17.
      const [n, die] = x.damage.split('d');
      diceInfo.tiers = [1, 2, 3, 4].map(k => `${Number(n) * k}d${die.split(/[+-]/)[0]}`);
    }
    return {
      id: x.id,
      name: x.name,
      english: '',
      level: x.level,
      time: x.time,
      castingTimeEs: x.castingTimeEs || x.time,
      range: x.range,
      components: x.components.join(', ') || '—',
      materialEs: x.material,
      duration: x.duration,
      concentration: x.concentration,
      ritual: x.ritual,
      school: x.school,
      brief: x.text.slice(0, 300),
      text: x.text,
      higher: x.higher,
      higherLevels: Boolean(x.higher),
      source: 'Homebrew',
      sourceKey: 'HB',
      sources: ['HB'],
      bard: x.classes.includes('bard'),
      optionalBard: false,
      referenceOnly: false,
      classes: x.classes,
      saveAbility: x.save ? [SAVE_ES[x.save]] : [],
      attackKind: x.roll === 'melee' ? ['M'] : x.roll === 'ranged' ? ['R'] : [],
      damageTypes: x.damageType ? [x.damageType] : [],
      ...(diceInfo ? { dice: diceInfo } : {}),
      homebrew: { book, data: x },
    };
  }
  function asCreature(x, book) {
    return {
      ...x,
      book: book.title,
      sourceKey: 'HB',
      homebrew: { book, data: x },
    };
  }
  const AS = { class: asClass, subclass: asSubclass, spell: asSpell, creature: asCreature };

  // Lo registrado la última vez, para poder sacarlo antes de volver a sumar (al editar o borrar).
  let registered = [];
  function unregister(target) {
    const ids = new Set(registered);
    const D = target.ClassData,
      C = target.Catalog;
    if (D) {
      for (const id of ids) {
        if (D.classes[id]?.homebrew) delete D.classes[id];
        if (D.spellClasses?.[id]) delete D.spellClasses[id];
      }
      D.subclasses = D.subclasses.filter(s => !ids.has(s.id));
    }
    if (C) C.spells = C.spells.filter(s => !ids.has(s.id));
    if (target.MonsterData) target.MonsterData = target.MonsterData.filter(m => !ids.has(m.id));
    registered = [];
  }
  // entries: [{ kind, data, book: {id, title, mine, shared} }]
  function register(entries, target = root) {
    unregister(target);
    const D = target.ClassData,
      C = target.Catalog;
    const out = { class: [], subclass: [], spell: [], creature: [] };
    for (const e of entries) {
      let x;
      try {
        x = AS[e.kind](clean(e.kind, e.data), e.book);
      } catch {
        continue; // un dato roto (de otra versión o editado a mano) no rompe la página
      }
      if (e.kind === 'class' && D && !D.classes[x.id]) D.classes[x.id] = x;
      else if (e.kind === 'subclass' && D) {
        if (!D.classes[x.classId]) continue; // su clase no está disponible acá
        D.subclasses.push(x);
      } else if (e.kind === 'spell' && C) {
        if (C.spells.some(s => s.id === x.id)) continue;
        C.spells.push(x);
        if (D?.spellClasses) D.spellClasses[x.id] = [...x.classes];
      } else if (e.kind === 'creature' && target.MonsterData && !target.MonsterData.some(m => m.id === x.id))
        target.MonsterData.push(x);
      registered.push(x.id);
      out[e.kind].push(x);
    }
    state.registered = out;
    return out;
  }

  // ---------- Copia local ----------
  const store = () => {
    try {
      return root.localStorage;
    } catch {
      return null;
    }
  };
  function readCache() {
    try {
      const v = JSON.parse(store()?.getItem(CACHE) || 'null');
      return v && Array.isArray(v.entries) && Array.isArray(v.books) ? v : null;
    } catch {
      return null;
    }
  }
  function writeCache(v) {
    try {
      store()?.setItem(CACHE, JSON.stringify(v));
    } catch {
      // sin lugar en el navegador: queda lo del servidor
    }
  }

  // ---------- Cuenta ----------
  const state = { books: [], entries: [], me: null, tables: [], loaded: false, error: '', registered: null };
  const HINT = 'Falta ejecutar supabase/migrations/015_homebrew.sql en Supabase (SQL Editor).';
  const friendly = e =>
    /homebrew|kind_check|check constraint|column|PGRST20[04]/i.test(e?.message || '') ? Error(HINT) : e;
  const bookOf = (b, me) => ({
    id: b.id,
    title: b.title,
    mine: !me || b.owner_id === me,
    shared: b.shared_with || null,
    counts: b.counts || {},
  });
  function emit() {
    if (typeof root.dispatchEvent === 'function' && typeof Event === 'function')
      root.dispatchEvent(new Event('homebrew-change'));
  }
  function apply(v, target = root) {
    state.books = v.books;
    state.entries = v.entries;
    const books = new Map(v.books.map(b => [b.id, b]));
    register(
      v.entries.filter(e => books.has(e.bookId)).map(e => ({ ...e, book: books.get(e.bookId) })),
      target,
    );
  }
  // Lo que hay en la cuenta: colecciones propias y compartidas, con sus entradas.
  async function load() {
    const Cloud = root.Cloud;
    if (!Cloud?.enabled || !Cloud.hasSession()) {
      state.loaded = true;
      return state;
    }
    try {
      const me = (await Cloud.user()).id;
      const all = await Cloud.libraryBooks();
      const books = all.filter(b => b.homebrew).map(b => bookOf(b, me));
      const ids = new Set(books.map(b => b.id));
      const entries = [];
      for (const kind of KINDS) {
        // Las criaturas de otros no llegan (permisos de la biblioteca): solo las propias.
        const got = await Cloud.libraryEntries(DB_KIND[kind]);
        for (const r of got) if (ids.has(r.book_id)) entries.push({ kind, bookId: r.book_id, data: r.data });
      }
      state.me = me;
      state.error = '';
      apply({ books, entries });
      writeCache({ me, books, entries });
    } catch (e) {
      state.error = friendly(e).message;
    }
    state.loaded = true;
    emit();
    return state;
  }
  async function tables() {
    try {
      state.tables = await root.Cloud.myTables();
    } catch {
      state.tables = [];
    }
    return state.tables;
  }
  const countsOf = bookId =>
    Object.fromEntries(KINDS.map(k => [k, state.entries.filter(e => e.bookId === bookId && e.kind === k).length]));
  async function touchCounts(bookId) {
    const counts = countsOf(bookId);
    await root.Cloud.updateLibraryBook(bookId, { counts });
    const b = state.books.find(x => x.id === bookId);
    if (b) b.counts = counts;
  }
  function commit() {
    apply({ books: state.books, entries: state.entries });
    writeCache({ me: state.me, books: state.books, entries: state.entries });
    emit();
  }
  async function createBook(title) {
    const t = text(title, 120, 'el nombre de la colección', { empty: false });
    try {
      const row = await root.Cloud.saveLibraryBook({ title: t, lang: 'es', counts: {}, homebrew: true });
      state.books.push(bookOf(row, state.me || row.owner_id));
      commit();
      return state.books.at(-1);
    } catch (e) {
      throw friendly(e);
    }
  }
  async function updateBook(id, patch) {
    const p = {};
    if ('title' in patch) p.title = text(patch.title, 120, 'el nombre de la colección', { empty: false });
    if ('shared' in patch) p.shared_with = patch.shared || null;
    const row = await root.Cloud.updateLibraryBook(id, p);
    const b = state.books.find(x => x.id === id);
    if (b) Object.assign(b, { title: row.title, shared: row.shared_with || null });
    commit();
  }
  async function deleteBook(id) {
    await root.Cloud.deleteLibraryBook(id);
    state.books = state.books.filter(b => b.id !== id);
    state.entries = state.entries.filter(e => e.bookId !== id);
    commit();
  }
  async function save(bookId, kind, data) {
    const book = state.books.find(b => b.id === bookId && b.mine);
    if (!book) bad('Elegí una colección tuya.');
    const x = clean(kind, data);
    try {
      await root.Cloud.addLibraryEntries(bookId, [{ kind: DB_KIND[kind], data: x }]);
    } catch (e) {
      throw friendly(e);
    }
    // Si se cambió de colección, la copia anterior se borra.
    const moved = state.entries.filter(e => e.kind === kind && e.data.id === x.id && e.bookId !== bookId);
    state.entries = state.entries.filter(e => !(e.kind === kind && e.data.id === x.id));
    state.entries.push({ kind, bookId, data: x });
    for (const e of moved) {
      await root.Cloud.deleteLibraryEntry(e.bookId, DB_KIND[kind], x.id);
      await touchCounts(e.bookId);
    }
    await touchCounts(bookId);
    commit();
    return x;
  }
  async function remove(bookId, kind, id, { quiet = false } = {}) {
    await root.Cloud.deleteLibraryEntry(bookId, DB_KIND[kind], id);
    state.entries = state.entries.filter(e => !(e.bookId === bookId && e.kind === kind && e.data.id === id));
    if (!quiet) {
      await touchCounts(bookId);
      commit();
    }
  }
  // Una subclase o un conjuro que usa una clase homebrew: avisar antes de borrarla.
  const dependents = classId =>
    state.entries.filter(
      e =>
        (e.kind === 'subclass' && e.data.classId === classId) ||
        (e.kind === 'spell' && (e.data.classes || []).includes(classId)),
    );

  // ---------- Archivos ----------
  const FORMAT = 'dnd-homebrew';
  function exportBook(bookId) {
    const book = state.books.find(b => b.id === bookId);
    if (!book) bad('No se encontró la colección.');
    return JSON.stringify(
      {
        format: FORMAT,
        version: 1,
        title: book.title,
        exported: new Date().toISOString(),
        entries: state.entries.filter(e => e.bookId === bookId).map(e => ({ kind: e.kind, data: e.data })),
      },
      null,
      2,
    );
  }
  // Lee un archivo exportado. Cada entrada se valida; los ids se conservan para que una reimportación
  // actualice en vez de duplicar. Devuelve { title, entries, skipped }.
  function parseFile(raw) {
    let v;
    try {
      v = JSON.parse(raw);
    } catch {
      bad('El archivo no es un JSON válido.');
    }
    if (!v || v.format !== FORMAT || !Array.isArray(v.entries)) bad('Ese archivo no es una colección de homebrew.');
    if (v.entries.length > 500) bad('El archivo tiene más de 500 entradas.');
    const entries = [],
      skipped = [];
    for (const e of v.entries) {
      try {
        entries.push({ kind: e.kind, data: clean(e.kind, e.data) });
      } catch (err) {
        skipped.push(`${e?.data?.name || 'Sin nombre'}: ${err.message}`);
      }
    }
    return { title: text(v.title, 120, 'el título') || 'Homebrew importado', entries, skipped };
  }
  async function importInto(bookId, entries, onProgress) {
    if (!state.books.some(b => b.id === bookId && b.mine)) bad('Elegí una colección tuya.');
    try {
      await root.Cloud.addLibraryEntries(
        bookId,
        entries.map(e => ({ kind: DB_KIND[e.kind], data: e.data })),
        onProgress,
      );
    } catch (e) {
      throw friendly(e);
    }
    const ids = new Set(entries.map(e => e.data.id));
    state.entries = [
      ...state.entries.filter(e => !(e.bookId === bookId && ids.has(e.data.id))),
      ...entries.map(e => ({ ...e, bookId })),
    ];
    await touchCounts(bookId);
    commit();
  }

  const cached = readCache();
  if (cached && root.ClassData) apply(cached);
  if (cached) state.me = cached.me || null;

  root.Homebrew = {
    KINDS,
    DB_KIND,
    UI_KIND,
    LABEL,
    ABILITIES,
    ABILITY_ES,
    SKILLS,
    ARMOR,
    WEAPONS,
    CASTERS,
    SCHOOLS,
    TIMES,
    SIZES,
    CR_XP,
    DAMAGE,
    HINT,
    state,
    clean,
    newId,
    isId,
    register,
    load,
    tables,
    createBook,
    updateBook,
    deleteBook,
    save,
    remove,
    dependents,
    exportBook,
    parseFile,
    importInto,
    entry: id => state.entries.find(e => e.data.id === id) || null,
    book: id => state.books.find(b => b.id === id) || null,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.Homebrew;
})(typeof window !== 'undefined' ? window : globalThis);
