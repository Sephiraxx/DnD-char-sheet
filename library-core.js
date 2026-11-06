/* Biblioteca: lee el texto de un PDF (fragmentos con posición y fuente, como los da pdf.js) y encuentra
   bloques de estadísticas de criaturas, en español o en inglés. No guarda nada: devuelve datos con el
   mismo formato que monsters-data.js para que la pantalla del DM los use igual que los del SRD.
   Lo usa library-ui.js en el navegador (con los libros de cada uno, en su dispositivo) y los tests en Node. */
(function (root) {
  'use strict';

  // ---------- Texto en orden de lectura ----------
  const clean = s =>
    String(s || '')
      .replace(/[−–—]/g, '-')
      .replace(/ﬁ/g, 'fi')
      .replace(/ﬂ/g, 'fl')
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/\u00a0/g, ' ')
      // Errores típicos del reconocimiento de texto en PDF escaneados: «{27d8 + 81)».
      .replace(/\{(?=[\d+\-])/g, '(')
      .replace(/(?<=\d)\}/g, ')');

  // Negrita falsa que repite cada letra («PePerrrroo ddeell bboossqquuee..») → «Perro del bosque.».
  function undouble(s) {
    if (s.length < 6) return s;
    let t = s;
    if (/^(..)\1/.test(t)) t = t.slice(2);
    let pairs = 0,
      n = 0;
    for (let i = 0; i + 1 < t.length;) {
      if (t[i] === ' ') {
        i++;
        continue;
      }
      n++;
      if (t[i] === t[i + 1]) {
        pairs++;
        i += 2;
      } else i++;
    }
    return n >= 4 && pairs / n >= 0.85 ? t.replace(/(.)\1/g, '$1') : s;
  }
  // Junta los fragmentos de una línea: con espacio si hay hueco entre ellos.
  function joinRuns(items) {
    items.sort((a, b) => a.x - b.x);
    const runs = [];
    let text = '',
      end = null;
    // Letras espaciadas («L a g a r t o»): una letra por fragmento. Entre palabras el hueco es
    // mayor que entre letras.
    const solid = items.filter(it => it.s.trim());
    let wordGap = 0;
    if (solid.length >= 4 && solid.filter(it => it.s.trim().length === 1).length / solid.length >= 0.6) {
      const gaps = solid
        .slice(1)
        .map((it, k) => it.x - (solid[k].x + solid[k].w))
        .sort((a, b) => a - b);
      const med = gaps[Math.floor(gaps.length / 2)],
        h = solid[0].h || 8;
      // Solo si entre letras hay aire de verdad (si no, es texto normal partido letra por letra).
      if (med >= h * 0.12) wordGap = Math.max(med * 1.8, h * 0.3);
    }
    for (const it of items) {
      const s = clean(wordGap ? it.s.trim() : it.s);
      if (!s) continue;
      const gap = end === null ? 0 : it.x - end;
      const sep =
        end !== null && gap > (wordGap || Math.max(1, it.h * 0.18)) && !/\s$/.test(text) && !/^\s/.test(s) ? ' ' : '';
      text += sep + s;
      end = it.x + it.w;
      if (s.trim()) {
        const last = runs[runs.length - 1];
        if (last && last.f === it.f) last.t += sep + s;
        else runs.push({ t: (sep ? ' ' : '') + s, f: it.f, h: it.h });
      } else if (runs.length) runs[runs.length - 1].t += s;
    }
    let changed = false;
    for (const r of runs) {
      const u = undouble(r.t);
      if (u !== r.t) [r.t, changed] = [u, true];
    }
    if (changed) text = runs.map(r => r.t).join('');
    return { text: text.replace(/\s+/g, ' ').trim(), runs };
  }

  // Una página → líneas en orden de lectura: arriba hacia abajo y, en páginas a dos columnas, primero la
  // izquierda. Una línea que cruza el centro (títulos anchos) separa tramos.
  function pageLines(page, pageIndex = 0) {
    const W = page.w || 600,
      mid = W / 2;
    // Algunos PDF repiten cada fragmento dos veces en el mismo lugar (texto con sombra): uno solo.
    const seen = new Set();
    const items = (page.items || []).filter(it => {
      if (!it || typeof it.s !== 'string' || !it.s.length) return false;
      const k = it.s + '|' + Math.round(it.x * 2) + '|' + Math.round(it.y * 2);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    // Margen izquierdo de la columna derecha: la x más repetida cerca del centro. Si la columna
    // izquierda llega casi hasta ahí, sus líneas largas siguen siendo de la izquierda.
    const starts = new Map();
    for (const it of items)
      if (it.s.trim() && it.x >= mid - W * 0.03 && it.x <= mid + W * 0.15) {
        const k = Math.round(it.x / 2) * 2;
        starts.set(k, (starts.get(k) || 0) + 1);
      }
    const [gx, gn] = [...starts].sort((a, b) => b[1] - a[1])[0] || [0, 0];
    const leftEdge = gn >= 6 && gx > mid + W * 0.02 ? gx - 3 : mid + W * 0.02;
    const col = it => {
      if (it.w > W * 0.55) return 'full';
      if (it.x + it.w <= leftEdge) return 'L';
      if (it.x >= mid - W * 0.02) return 'R';
      return 'full';
    };
    // Agrupar por columna y altura.
    const groups = [];
    for (const it of items.slice().sort((a, b) => a.y - b.y || a.x - b.x)) {
      const c = col(it);
      if (!it.s.trim() && it.w === 0) continue;
      const g = groups.find(
        g =>
          (g.c === c || (c !== 'full' && g.c !== 'full' && false)) &&
          Math.abs(g.y - it.y) <= Math.max(1.5, Math.min(g.h, it.h || g.h) * 0.45),
      );
      if (g) {
        g.items.push(it);
        g.h = Math.max(g.h, it.h || 0);
      } else groups.push({ c, y: it.y, h: it.h || 0, items: [it] });
    }
    // Una línea «full» que en realidad es de una columna (texto corto) vuelve a su columna.
    for (const g of groups)
      if (g.c === 'full') {
        const x0 = Math.min(...g.items.map(i => i.x)),
          x1 = Math.max(...g.items.map(i => i.x + i.w));
        if (x1 <= leftEdge) g.c = 'L';
        else if (x0 >= mid - W * 0.02) g.c = 'R';
      }
    groups.sort((a, b) => a.y - b.y);
    const out = [];
    let L = [],
      R = [];
    const flush = () => {
      out.push(...L, ...R);
      L = [];
      R = [];
    };
    for (const g of groups) {
      const { text, runs } = joinRuns(g.items);
      if (!text) continue;
      const yr = page.h ? g.y / page.h : 0.5;
      // Encabezados y pies de página (título del libro, número, marca de agua): no cortan un bloque.
      const edge = yr < 0.065 || yr > 0.935;
      // Tamaño del texto de la línea: el del tramo más largo (un nombre en negrita puede ser más grande).
      const main = runs.reduce((a, r) => (r.t.trim().length > (a?.t.trim().length || 0) ? r : a), null);
      const line = {
        t: text,
        runs,
        bh: +(main?.h || g.h).toFixed(1),
        h: +g.h.toFixed(1),
        y: g.y,
        x: Math.min(...g.items.map(i => i.x)),
        page: pageIndex,
        c: g.c,
        edge,
      };
      if (g.c === 'full') {
        flush();
        out.push(line);
      } else (g.c === 'L' ? L : R).push(line);
    }
    flush();
    return out;
  }
  // Algunos PDF no traen los espacios («ArmorClass16(chainmail)»): si pasa en todo el libro, se separan
  // las palabras pegadas donde se nota (mayúscula después de minúscula, números, puntuación).
  function glued(pages) {
    let long = 0,
      total = 0;
    for (const p of pages)
      for (const it of p.items || [])
        for (const w of String(it.s || '').split(/\s+/)) {
          if (!w) continue;
          total++;
          if (/[A-Za-z]{19,}/.test(w) || /[a-z][A-Z][a-z]/.test(w)) long++;
        }
    return total > 150 && long / total > 0.025;
  }
  const unglue = s =>
    s
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/([A-Za-z]{2})(?=[\d+(])/g, '$1 ')
      .replace(/(\d)(?=\()/g, '$1 ')
      .replace(/\)(?=[A-Za-z])/g, ') ')
      .replace(/([,;:])(?=[A-Za-z(+\-\d])/g, '$1 ')
      .replace(/\.(?=[A-Z])/g, '. ')
      .replace(/(\d)(ft\.?)(?=[\s,.]|$)/g, '$1 $2');
  const readLines = pages => {
    if (glued(pages))
      pages = pages.map(p => ({ ...p, items: (p.items || []).map(it => ({ ...it, s: unglue(it.s) })) }));
    return pages.flatMap((p, i) => pageLines(p, i));
  };

  // ---------- Vocabulario ----------
  const SIZE = {
    diminuto: 'Diminuto',
    diminuta: 'Diminuto',
    pequeño: 'Pequeño',
    pequeña: 'Pequeño',
    mediano: 'Mediano',
    mediana: 'Mediano',
    grande: 'Grande',
    enorme: 'Enorme',
    gargantuesco: 'Gargantuesco',
    gargantuesca: 'Gargantuesco',
    tiny: 'Diminuto',
    small: 'Pequeño',
    medium: 'Mediano',
    large: 'Grande',
    huge: 'Enorme',
    gargantuan: 'Gargantuesco',
  };
  const TYPE = [
    [/aberra/i, 'aberración'],
    [/bestia|beast/i, 'bestia'],
    [/celestial/i, 'celestial'],
    [/constru/i, 'constructo'],
    [/drag[oó]n/i, 'dragón'],
    [/elemental/i, 'elemental'],
    [/fe[ée]ric|fey/i, 'feérico'],
    [/infernal|fiend|demonio|diablo|demon|devil/i, 'infernal'],
    [/gigante|giant/i, 'gigante'],
    [/humanoide|humanoid/i, 'humanoide'],
    [/monstruo|monstrosity/i, 'monstruosidad'],
    [/cieno|limo|ooze/i, 'cieno'],
    [/planta|plant/i, 'planta'],
    [/muerto|no muerto|undead/i, 'muerto viviente'],
  ];
  const ABIL_WORDS = [
    ['FUE', /^(fue|fuerza|str|strength)/i],
    ['DES', /^(des|destreza|dex|dexterity)/i],
    ['CON', /^(con|constituci[oó]n|constitution)/i],
    ['INT', /^(int|lnt|1nt|inteligencia|intelligence)/i],
    ['SAB', /^(sab|sabidur[ií]a|wis|wisdom)/i],
    ['CAR', /^(car|carisma|cha|charisma)/i],
  ];
  const ABIL_KEY = { FUE: 'str', DES: 'dex', CON: 'con', INT: 'int', SAB: 'wis', CAR: 'cha' };
  const abilityOf = word => ABIL_WORDS.find(([, re]) => re.test(String(word || '').trim()))?.[0] || null;

  const LABELS = [
    ['ac', /^(clase de armadura|armor class)\s*:?\s*/i],
    ['hp', /^(puntos de golpe|hit points)\s*:?\s*/i],
    // Reglas 2024 (en mayúsculas, sin «i»: «Acólito» no es una CA).
    ['ac', /^(AC|CA|Ac)\s*:?\s*(?=[\dlIO])/],
    ['hp', /^(HP|PG)\s*:?\s*(?=[\dlIO])/],
    ['speed', /^(velocidad|speed)\s*:?\s*/i],
    ['saves', /^(tiradas? de salvaci[oó]n|salvaciones|saving throws)\s*:?\s*/i],
    ['skills', /^(habilidades|skills)\s*:?\s*/i],
    ['vuln', /^(vulnerabilidad(es)? (al|a) daño|vulnerabilidades al da[ñn]o|damage vulnerabilities)\s*:?\s*/i],
    ['res', /^(resistencias? (al|a) da[ñn]o|resistencias? de da[ñn]o|damage resistances)\s*:?\s*/i],
    ['imm', /^(inmunidad(es)? (al|a) da[ñn]o|inmunidad(es)? de da[ñn]o|damage immunities)\s*:?\s*/i],
    ['cimm', /^(inmunidad(es)? (a|al|a los) (estados?|condici[oó]n(es)?)|condition immunities)\s*:?\s*/i],
    // Reglas 2024: «Resistencias», «Inmunidades» (daño y estados juntos, separados por «;»), «VD».
    ['vuln', /^(vulnerabilities|vulnerabilidades)\s*:?\s*/i],
    ['res', /^(resistances|resistencias)\s*:?\s*/i],
    ['imm24', /^([il1]mmunities|inmunidades)\s*:?\s*/i],
    ['senses', /^(sentidos|senses)\s*:?\s*/i],
    ['lang', /^(idiomas|lenguajes|languages)\s*:?\s*/i],
    ['cr', /^(desaf\S{1,2}o|valor de desaf\S{1,2}o|challenge)\s*:?\s*/i],
    ['cr', /^(CR|VD)\s*:?\s*(?=[\dlI½¼⅛])/],
    ['pb', /^(bonificador (por|de) competencia|proficiency bonus)\s*:?\s*/i],
    ['gear', /^(equipo|gear)\s*:?\s*/i],
  ];
  // Etiquetas con letras separadas por el reconocimiento de texto («Puntos d e golpe: 4»).
  const LABEL_SQ = [
    ['ac', 'clasedearmadura'],
    ['hp', 'puntosdegolpe'],
    ['speed', 'velocidad'],
    ['saves', 'tiradasdesalvacion'],
    ['skills', 'habilidades'],
    ['senses', 'sentidos'],
    ['lang', 'idiomas'],
    ['cr', 'desafio'],
    ['ac', 'armorclass'],
    ['hp', 'hitpoints'],
    ['saves', 'savingthrows'],
    ['senses', 'senses'],
    ['lang', 'languages'],
    ['cr', 'challenge'],
  ];
  function splitLabel(t) {
    if (!/^\S{1,8} \S/.test(t)) return null;
    const sq = key(t.slice(0, 40));
    const hit = LABEL_SQ.find(([, w]) => sq.startsWith(key(w)));
    if (!hit) return null;
    // Se consume del texto original la misma cantidad de letras que tiene la etiqueta.
    let n = 0,
      k = 0;
    while (k < t.length && n < hit[1].length) {
      if (/[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(t[k])) n++;
      k++;
    }
    const head = t.slice(0, k);
    return [hit[0], new RegExp('^' + head.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*:?\\s*')];
  }
  // Encabezados de sección del bloque, comparados sin espacios ni tildes («ACC I O N E S» también vale).
  const SECTION_WORDS = [
    ['traits', ['rasgos', 'atributos', 'traits']],
    ['actions', ['acciones', 'actions']],
    ['bonus', ['acciones adicionales', 'acciones bonus', 'bonus actions']],
    ['reactions', ['reacciones', 'reactions']],
    ['legendary', ['acciones legendarias', 'legendary actions']],
    [
      'stop',
      [
        'acciones de guarida',
        'acciones de cubil',
        'acciones miticas',
        'efectos regionales',
        'lair actions',
        'mythic actions',
        'regional effects',
      ],
    ],
  ];
  const SECTION = SECTION_WORDS.map(([k, words]) => {
    const keys = new Set(
      words.map(w =>
        w
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[1l|]/g, 'i')
          .replace(/0/g, 'o')
          .replace(/[^a-z]/g, ''),
      ),
    );
    return [k, { test: t => t.length < 40 && keys.has(key(t)) }];
  });
  // Títulos de sección mal reconocidos en PDF escaneados («AcrroNs», «TnRrrs»): se comparan con las
  // letras que el reconocimiento suele confundir agrupadas (t/r/i/l/f → r, n/u/h → n).
  const ocrShape = w => w.replace(/[trilf1j]/g, 'r').replace(/[nuh]/g, 'n');
  const lev = (x, y) => {
    const d = [...Array(y.length + 1).keys()];
    for (let i = 1; i <= x.length; i++) {
      let p = d[0];
      d[0] = i;
      for (let j = 1; j <= y.length; j++) {
        const t = d[j];
        d[j] = Math.min(d[j] + 1, d[j - 1] + 1, p + (x[i - 1] === y[j - 1] ? 0 : 1));
        p = t;
      }
    }
    return d[y.length];
  };
  const SECTION_SHAPES = SECTION_WORDS.flatMap(([k, words]) =>
    words.map(w => [
      k,
      ocrShape(
        w
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z]/g, ''),
      ),
    ]),
  );
  function fuzzySection(t) {
    if (t.length > 28 || /[.\d:]/.test(t) || t.split(/\s+/).length > 3) return null;
    const k = ocrShape(key(t));
    if (k.length < 5) return null;
    let best = null,
      bd = 99,
      tie = false;
    for (const [sec, w] of SECTION_SHAPES) {
      const d = lev(k, w);
      if (d < bd) [best, bd, tie] = [sec, d, false];
      else if (d === bd && sec !== best) tie = true;
    }
    return !tie && bd <= Math.max(1, Math.floor(k.length * 0.2)) ? best : null;
  }
  // «Clase de Armadura: 15» (con número: el título de una explicación de reglas no cuenta).
  const isAnchor = t =>
    (m => !!m && /^(\d|[lIO][\dlIO]?(?![A-Za-z]))/.test(t.slice(m[0].length)))(
      /^(clase de armadura|armor class)\s*:?\s*/i.exec(t),
    ) || /^(AC|CA)\s*:?\s*[\dlI]{1,2}\b.{0,6}([il1]n[il1]t[il1]at[il1]ve|iniciativa)/i.test(t);
  const isAbilHeader = t => {
    const w = t.toUpperCase().replace(/[^A-Z ]/g, ' ');
    return (/\bFUE\b/.test(w) || /\bSTR\b/.test(w)) && (/\bDES\b/.test(w) || /\bDEX\b/.test(w)) && /\bCON\b/.test(w);
  };
  const SIZE_RE = new RegExp('\\b(' + Object.keys(SIZE).join('|') + ')\\b', 'i');

  // «1/4 (50 PX)» → { cr: 0.25, xp: 50 }
  function parseCR(text) {
    text = fixDigits(String(text || ''))
      .replace(/\b(\d) (\d)(?=\s*\()/g, '$1$2')
      .replace(/^\s*[Il](?=\s*\()/, '1')
      .replace(/^\s*[Oo](?=\s*\()/, '0');
    const m = /^\s*(\d+\s*\/\s*\d+|\d+|½|¼|⅛)/.exec(text || '');
    if (!m) {
      // Número ilegible («S (1.800 PX)»): el desafío sale de los PX.
      const px = /\(\s*([\d.,\s]+)\s*(px|xp|pe)/i.exec(text) || /\(\s*(?:px|xp|pe)\s*([\d.,]+(?:\s\d{3})*)/i.exec(text);
      const xp = px && Number(px[1].replace(/[.,\s]/g, ''));
      const cr = xp && Object.keys(XP_BY_CR).find(k => XP_BY_CR[k] === xp);
      return cr !== undefined && cr !== null && xp ? { cr: Number(cr), xp } : null;
    }
    const raw = m[1].replace(/\s/g, '');
    const cr =
      { '½': 0.5, '¼': 0.25, '⅛': 0.125 }[raw] ??
      (raw.includes('/') ? Number(raw.split('/')[0]) / Number(raw.split('/')[1]) : Number(raw));
    const xp = /\(\s*([\d.,\s]+)\s*(px|xp|pe)/i.exec(text) || /\(\s*(?:px|xp|pe)\s*([\d.,]+(?:\s\d{3})*)/i.exec(text);
    return { cr, xp: xp ? Number(xp[1].replace(/[.,\s]/g, '')) || null : null };
  }
  const XP_BY_CR = {
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

  // «Infernal Mediano (diablo), por lo general legal malvado» / «Large Construct, Typically Neutral»
  function parseTypeLine(text) {
    const t = text.replace(/\s+/g, ' ').trim();
    const m = SIZE_RE.exec(t);
    if (!m) return ocrTypeLine(t);
    // Alineamiento: después de la primera coma fuera de paréntesis.
    let depth = 0,
      cut = -1;
    for (let i = 0; i < t.length; i++) {
      if (t[i] === '(') depth++;
      else if (t[i] === ')') depth--;
      else if (t[i] === ',' && depth === 0) {
        cut = i;
        break;
      }
    }
    const head = cut >= 0 ? t.slice(0, cut) : t,
      align = cut >= 0 ? t.slice(cut + 1).trim() : '';
    const size = SIZE[m[1].toLowerCase()];
    const typeRaw = head.replace(SIZE_RE, ' ').replace(/\s+/g, ' ').trim();
    const base = TYPE.find(([re]) => re.test(typeRaw))?.[1] || (/enjambre|swarm/i.test(typeRaw) ? 'enjambre' : '');
    const sub = /\(([^)]*)\)/.exec(typeRaw)?.[1];
    const type = /enjambre|swarm/i.test(typeRaw)
      ? 'enjambre'
      : (base || typeRaw.toLowerCase()) + (sub ? ' (' + sub + ')' : '');
    return { size, type, align };
  }
  // Velocidad: solo las partes con distancia («30 pies, volar 60 pies (levitar)»); lo demás es ruido.
  function cleanSpeed(t) {
    const parts = String(t)
      .split(/[,;]/)
      .map(p => /^\s*([A-Za-zÁÉÍÓÚÑáéíóúñ]+\s+)?\d+\s*(pies|ft\.?|m)\b(\s*\([^)]{1,30}\))?/.exec(p)?.[0].trim())
      .filter(Boolean);
    if (parts.length) return parts.join(', ');
    const n = /^\s*(\d+)/.exec(String(t));
    return n ? n[1] + ' pies' : String(t).trim();
  }
  // Línea de tipo con letras separadas por el reconocimiento de texto («La rge Co nstru ct, U n a I igned»).
  function ocrTypeLine(t) {
    if (t.length > 90) return null;
    const cut = t.indexOf(','),
      head = (cut >= 0 ? t.slice(0, cut) : t).toLowerCase().replace(/[^a-záéíóúñ()]/g, '');
    if (head.length > 40) return null;
    const sz =
      /^(tiny|small|medium|large|huge|[gc]arg[ao]ntuan)/.exec(head) ||
      /(diminut[oa]|pequeñ[oa]|median[oa]|grande|enorme|gargantues[co]a?)$/.exec(head);
    // Tamaño mal leído («Pequeíia»): la última palabra se parece a uno.
    if (!sz) {
      const words = (cut >= 0 ? t.slice(0, cut) : t).trim().split(/\s+/);
      const last = key(words.pop() || '');
      const hit = [
        'diminuto',
        'diminuta',
        'pequeno',
        'pequena',
        'mediano',
        'mediana',
        'grande',
        'enorme',
        'gargantuesco',
      ].find(w => last.length >= 5 && lev(w, last) <= 2);
      if (!hit) return null;
      const base = TYPE.find(([re]) => re.test(words.join(' ')))?.[1];
      const size = SIZE[hit.replace('pequeno', 'pequeño').replace('pequena', 'pequeña')] || 'Mediano';
      return base ? { size, type: base, align: cut >= 0 ? t.slice(cut + 1).trim() : '' } : null;
    }
    const rest = head.replace(sz[0], '');
    const base = TYPE.find(([re]) => re.test(rest))?.[1];
    if (!base) return null;
    const size = SIZE[sz[0]] || SIZE[sz[0].replace(/^c/, 'g').replace('gargontuan', 'gargantuan')] || 'Mediano';
    return { size, type: base, align: cut >= 0 ? t.slice(cut + 1).trim() : '' };
  }
  // Separa en palabras conocidas un texto sin espacios («lagartoverdoso» → «lagarto verdoso»).
  const SHORT_WORDS = new Set(['de', 'dei', 'ia', 'ias', 'ei', 'ios', 'y', 'o', 'en', 'con', 'sin', 'of', 'the']);
  function spaced(t, words) {
    if (!words || t.length > 40) return t;
    const k = key(t);
    if (k.length !== t.length) return t;
    // Menor costo: palabra conocida 1; el último tramo puede ser desconocido (un nombre propio), más caro.
    const best = [{ cost: 0, cut: [] }];
    for (let i = 1; i <= k.length; i++)
      for (let j = Math.max(0, i - 16); j < i; j++) {
        if (!best[j]) continue;
        const w = k.slice(j, i);
        const c =
          (w.length >= 3 && words.has(w)) || SHORT_WORDS.has(w)
            ? 1
            : i === k.length && w.length >= 3
              ? 2 + w.length * 0.2
              : 0;
        if (c && (!best[i] || best[j].cost + c < best[i].cost))
          best[i] = { cost: best[j].cost + c, cut: [...best[j].cut, [j, i]] };
      }
    const cut = best[k.length]?.cut;
    return cut && cut.length > 1 ? cut.map(([a, b]) => t.slice(a, b)).join(' ') : t;
  }
  // Nombres en mayúsculas («CIENO GRIS») → «Cieno gris».
  function niceName(s) {
    const t = s.replace(/\s+/g, ' ').trim();
    if (t.length > 3 && t === t.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(t)) return t.charAt(0) + t.slice(1).toLowerCase();
    // Mayúsculas sueltas dentro de las palabras (versalitas mal reconocidas: «LoBo GrIs») → «Lobo Gris».
    if (/[a-záéíóúñ][A-ZÁÉÍÓÚÑ]/.test(t))
      return t
        .toLowerCase()
        .replace(/(^|\s)(\S)/g, (x, sp, c) => sp + c.toUpperCase())
        .replace(/^./, c => c.toUpperCase());
    return t;
  }
  const slug = s =>
    String(s)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60);

  // Arreglos del reconocimiento de texto en números: «1d1 O» → «1d10», «+ S» → «+ 5», «1 O» → «10».
  const fixDigits = s =>
    String(s)
      // Dentro de paréntesis cortos («(7d l 0 + 1 4)», «(+l )», «(ldG + 2)»): letras que son números.
      .replace(/\(([^()]{1,30})\)?/g, (all, inner) => {
        if (!/\d/.test(inner) && !/^\s*[+\-]\s*[lIOoS]\s*$/.test(inner)) return all;
        let x = inner
          .replace(/(?<=[\dlIO])\s+(?=[\dlIO])/g, '')
          .replace(/\b[lI](?=[\dOd/ ]|$)/g, '1')
          .replace(/(?<=\d)[lI]/g, '1')
          .replace(/(?<=[\d+\-]\s?)[Oo](?=\b|\d)/g, '0')
          .replace(/(?<=\d)[Oo]/g, '0')
          .replace(/(?<=[+\-]\s?)[Ss]\b/g, '5')
          .replace(/(?<=\dd)G\b/g, '6')
          .replace(/\s+(?=\))/g, '');
        return '(' + x + (all.endsWith(')') ? ')' : '');
      })
      .replace(/(\d) ?[Oo](?=[\s)+\-.,]|$)/g, '$10')
      .replace(/([+\-]) ?[Oo](?=\))/g, '$10')
      .replace(/\b[Ss](?= ?\([+\-])/g, '5')
      .replace(/(\d) ?[Ss](?=[\s.,)]|$)/g, '$15')
      .replace(/\b[lI][O0](?=\s*\(|\b)/g, '10')
      .replace(/\b[lI](?=\d|\s*\/\s*\d)/g, '1')
      .replace(/(\d)[lI](?=[\s)+\-])/g, '$11')
      .replace(/\b(\d) (\d)(?= ?\()/g, '$1$2')
      // «ll (2d8 + 2)», «lS (2d8 + 6)»: dos caracteres justo antes de los dados.
      .replace(/(?<![\wÁÉÍÓÚÑáéíóúñ])([lIOS\d]{2})(?=\s?\(\s?\d+\s?d\s?\d)/g, x =>
        /[lIOS]/.test(x) ? x.replace(/[lI]/g, '1').replace(/O/g, '0').replace(/S/g, '5') : x,
      );
  // Seis puntuaciones «12 (+1)» a partir de la línea con FUE/DES/CON (o STR/DEX/CON).
  function parseAbilities(texts, strict = false) {
    const all = fixDigits(texts.join(' ')).replace(/(\d{1,2})[.,:]\s*(?=\()/g, '$1 ');
    const out = [];
    const re = /(\d{1,2})\s*\(\s*([+\-]?\s*\d{1,2})(?!\d|\s*d\s*\d)\s*\)?/g;
    let m;
    while ((m = re.exec(all)) && out.length < 6) out.push(Number(m[1]));
    if (out.length === 6) return out;
    // En tablas escaneadas «14 (+2)» puede quedar «14.42)». Solo se acepta la
    // fila completa si las seis puntuaciones concuerdan con sus modificadores.
    const cells = [...all.matchAll(/(?<!\d)(\d{1,2})\s*[.($]\s*([+\-\dIlOSo .:*~]{1,7})\)/g)];
    if (
      cells.length === 6 &&
      cells.every(([, score, raw]) => {
        const n = Number(score),
          mod = Math.floor((n - 10) / 2),
          digits = raw.replace(/[Il]/g, '1').replace(/[Oo]/g, '0').replace(/S/g, '5').replace(/\D/g, '');
        return (
          n >= 1 &&
          n <= 30 &&
          digits.endsWith(String(Math.abs(mod))) &&
          !(raw.includes('+') && mod < 0) &&
          !(raw.includes('-') && mod > 0)
        );
      })
    )
      return cells.map(c => Number(c[1]));
    if (strict) return null;
    const fm = fromMods(texts);
    if (fm && !fm.approx) return fm;
    // Mal leído («19 (+a) 1a $2)»): cada «puntuación (modificador)»; si la puntuación no se lee, sale
    // del modificador (10 + 2 × mod).
    const loose = [];
    let approx = false;
    for (const x of all.matchAll(/(?<!\S)(\S{1,2})\s*[($]\s*([+\-−–]?\s*[^\s()]{1,2})\s*\)/g)) {
      const dig = v =>
        v
          .replace(/[_'’`.,:;]/g, '')
          .replace(/[lI\]|]/g, '1')
          .replace(/[Oo]/g, '0')
          .replace(/[sS]/g, '5');
      const sc = dig(x[1]),
        md = dig(x[2]);
      const score = /^\d{1,2}$/.test(sc) ? Number(sc) : null,
        mod = /^[+\-−–]?\s*\d{1,2}$/.test(md) ? Number(md.replace(/[−–]/, '-').replace(/\s/g, '')) : null;
      if (score !== null && score >= 1 && score <= 30) loose.push(score);
      else if (mod !== null && Math.abs(mod) <= 10) {
        loose.push(10 + 2 * mod);
        approx = true;
      } else return fm || null;
      if (loose.length === 6) break;
    }
    if (loose.length !== 6) return fm || null;
    loose.approx = approx;
    return loose;
  }
  // Último recurso: los seis modificadores con signo de la fila de números («26 (+8) l s (+2) 22 (+61 …»).
  // La puntuación leída vale si coincide con su modificador; si no, sale de él (10 + 2 × mod).
  function fromMods(texts) {
    const k = texts.findIndex(isAbilHeader);
    const rows = texts.slice(k + 1, k + 3).filter((t, n) => n === 0 || !/[A-Za-z]{3}/.test(t));
    const t = rows.join(' ').replace(/[−–]/g, '-');
    const dig = v =>
      v
        .replace(/[lI\]|!]/g, '1')
        .replace(/[Oo]/g, '0')
        .replace(/[sS§]/g, '5');
    const out = [];
    let approx = false,
      last = 0;
    for (const m of t.matchAll(/([+\-])\s*([\dlIOS])([\dlIOS])?/g)) {
      const two = m[3] ? Number(dig(m[2] + m[3])) : NaN;
      const mod = (m[1] === '-' ? -1 : 1) * (two <= 10 ? two : Number(dig(m[2])));
      const seg = dig(t.slice(last, m.index).replace(/[^\dlIOSs§!\]| ]/g, ' '))
        .replace(/(\d) (?=\d\b)/g, '$1')
        .match(/\d{1,2}(?!.*\d)/);
      last = m.index + m[0].length;
      const score = seg ? Number(seg[0]) : NaN;
      if (score >= 1 && score <= 30 && Math.floor((score - 10) / 2) === mod) out.push(score);
      else {
        out.push(10 + 2 * mod);
        approx = true;
      }
      if (out.length === 6) break;
    }
    if (out.length !== 6 || out.some(x => !(x >= 1 && x <= 30))) return null;
    out.approx = approx;
    return out;
  }
  // Tabla de características partida en columnas (páginas impresas de D&D Beyond): «STR DEX» con sus
  // valores, después «CON» con el suyo en otra columna… Se asigna cada valor a su encabezado.
  const ABIL_TOKEN = /^(fue|fuerza|str|des|dex|con|int|sab|wis|car|cha)$/i;
  function abilitiesByHeader(texts) {
    const out = {};
    for (let i = 0; i < texts.length && Object.keys(out).length < 6; i++) {
      const toks = texts[i].split(/\s+/).filter(Boolean);
      if (!toks.length || !toks.every(w => ABIL_TOKEN.test(w))) continue;
      const keys = toks.map(abilityOf);
      const vals = [];
      for (let j = i + 1; j < Math.min(texts.length, i + 3) && vals.length < keys.length; j++) {
        if (texts[j].split(/\s+/).every(w => ABIL_TOKEN.test(w))) break;
        // Encabezado completo (las seis): sus números van en la línea siguiente, no más abajo.
        if (keys.length === 6 && j > i + 1) break;
        const re = /(\d{1,2})\s*\(\s*[+\-]?\s*\d{1,2}/g;
        let m;
        while ((m = re.exec(fixDigits(texts[j]))) && vals.length < keys.length) vals.push(Number(m[1]));
      }
      keys.forEach((k, n) => vals[n] !== undefined && out[k] === undefined && (out[k] = vals[n]));
    }
    const order = ['FUE', 'DES', 'CON', 'INT', 'SAB', 'CAR'];
    return order.every(k => out[k] !== undefined) ? order.map(k => out[k]) : null;
  }
  // Reglas 2024: filas «Str 17 +3 +3 Dex 16 +3 +5 …» (puntuación, modificador, salvación). Una salvación
  // distinta del modificador es una salvación con competencia.
  const ROW24 =
    /(?:^|\s)([A-Za-z][A-Za-z'’]{1,3})\.?\s*([\dlI\]O]{1,2})\s*([+\-−–]\s?[\dlIO]{1,2})\.?\s+([+\-−–]\s?[\dlIO]{1,2})\.?(?=\s|$)/g;
  /(?:^|\s)([A-Za-z][A-Za-z'’]{1,3})\.?\s+([\dlI\]O]{1,2})\s+([+\-−–]\s?[\dlIO]{1,2})\s+([+\-−–]\s?[\dlIO]{1,2})(?=\s|$)/g;
  const isAbilRow24 = t => new RegExp('^' + ROW24.source.replace('(?:^|\\s)', '\\s*')).test(t);
  const num24 = x =>
    Number(
      String(x)
        .replace(/[lI\]]/g, '1')
        .replace(/[Oo]/g, '0')
        .replace(/[−–]/g, '-')
        .replace(/\s/g, ''),
    );
  const ab24 = w => {
    const x = w.toLowerCase().replace(/[^a-z]/g, '');
    if (/^f/.test(x)) return 0;
    if (/^d/.test(x)) return 1;
    if (/^co/.test(x)) return 2;
    if (/^[il]/.test(x)) return 3;
    if (/^(w|sa)/.test(x)) return 4;
    if (/^c/.test(x)) return 5;
    if (/^s/.test(x)) return 0;
    return -1;
  };
  function abilities24(rows) {
    const found = [];
    for (const t of rows) for (const m of t.matchAll(ROW24)) found.push(m);
    if (found.length !== 6) {
      // Modificadores ilegibles: alcanza con el nombre y la puntuación de cada característica.
      const ab = [];
      for (const t of rows)
        for (const m of t.matchAll(/(?:^|\s)([A-Za-z][A-Za-z'’]{1,3})\.?\s*([\dlI\]O]{1,2})(?=[\s+\-−–=.,%]|$)/g)) {
          const k = ab24(m[1]),
            v = num24(m[2]);
          if (k >= 0 && ab[k] === undefined && v >= 1 && v <= 30) ab[k] = v;
        }
      let n = ab.filter(x => x !== undefined).length;
      // Por posición: cada fila trae tres puntuaciones (los números sin signo), en el orden de la tabla.
      if (n < 6) {
        const pos = [];
        for (const t of rows) {
          const sc = t
            .replace(/(?<=[A-Za-z.'’])(?=\d)/g, ' ')
            .split(/\s+/)
            .filter(tk => /^['’\]]?[\dlIO]{1,2}$/.test(tk) && /[\dlI]/.test(tk))
            .map(tk => num24(tk.replace(/^['’]/, '')));
          if (sc.length === 3) pos.push(...sc);
          else if (sc.length) {
            pos.length = 99;
            break;
          }
        }
        if (pos.length === 6 && pos.every((v, k) => v >= 1 && v <= 30 && (ab[k] === undefined || ab[k] === v))) {
          pos.forEach((v, k) => (ab[k] = v));
          n = 6;
        }
      }
      if (n < 4) return null;
      return { ab: [0, 1, 2, 3, 4, 5].map(k => ab[k] ?? 10), saves: '', partial: n < 6 };
    }
    let idx = found.map(m => ab24(m[1]));
    if (new Set(idx).size !== 6 || idx.includes(-1)) idx = [0, 1, 2, 3, 4, 5];
    const ab = [],
      saves = [];
    const names = ['FUE', 'DES', 'CON', 'INT', 'SAB', 'CAR'];
    found.forEach((m, n) => {
      const k = idx[n],
        score = num24(m[2]),
        mod = num24(m[3]),
        save = num24(m[4]);
      ab[k] = score;
      if (save !== mod && !Number.isNaN(save)) saves[k] = names[k] + ' ' + (save >= 0 ? '+' : '') + save;
    });
    if (ab.some(x => !(x >= 1 && x <= 30))) return null;
    return { ab, saves: saves.filter(Boolean).join(', ') };
  }
  const CONDITION_RE =
    /^(blinded|charmed|deafened|exhaustion|frightened|grappled|incapacitated|invisible|paralyzed|petrified|poisoned|prone|restrained|stunned|unconscious|cegad|hechizad|ensordecid|agotamiento|asustad|aterrad|agarrad|apresad|incapacitad|invisible|paralizad|petrificad|envenenad|derribad|tumbad|neutralizad|aturdid|inconsciente)/i;

  // «Destreza +6, Sabiduría +4» → «DES +6, SAB +4» (como el SRD; la pantalla del DM lo lee así).
  function shortSaves(text) {
    return String(text || '')
      .split(/[,;]/)
      .map(part => {
        const m = /^\s*([^\s+\-]+)\s*([+\-]\s*\d+)/.exec(part);
        const k = m && abilityOf(m[1]);
        return k ? k + ' ' + m[2].replace(/\s/g, '') : part.trim();
      })
      .filter(Boolean)
      .join(', ');
  }
  const DMG_TYPES = {
    acid: 'ácido',
    bludgeoning: 'contundente',
    cold: 'frío',
    fire: 'fuego',
    force: 'fuerza',
    lightning: 'relámpago',
    necrotic: 'necrótico',
    piercing: 'perforante',
    poison: 'veneno',
    psychic: 'psíquico',
    radiant: 'radiante',
    slashing: 'cortante',
    thunder: 'trueno',
  };
  // Una acción: bonificador de ataque, daño y salvación (si la tiene).
  function parseAction(n, d) {
    const a = { n, d };
    // «+S a impactar», «+l0 a impactar»: letras que son números después de un signo.
    d = fixDigits(d).replace(/([+\-]\s?)([SslIO]{1,2}|\d[SslIO]|[SslIO]\d)(?=\s)/g, (x, sg, v) =>
      /[A-Za-z]/.test(v) ? sg + v.replace(/[Ss]/g, '5').replace(/[lI]/g, '1').replace(/O/g, '0') : x,
    );
    const atk =
      /([+\-]\s*\d+)\s*(a\s*l\s*a\s*t\s*a\s*q\s*u\s*e|a\s*i\s*m\s*p\s*a\s*c\s*t\s*a\s*r|para\s*impactar|para\s*golpear|al\s*impacto|to\s*hit)/i.exec(
        d,
      );
    const atk24 = !atk && /(?:attack roll|tirada de ataque[^:]{0,40})\s*:\s*([+\-]\s*\d+)/i.exec(d);
    if (atk) a.atk = Number(atk[1].replace(/\s/g, ''));
    else if (atk24) a.atk = Number(atk24[1].replace(/\s/g, ''));
    const dmg = [];
    const re =
      /\d+\s*\(\s*(\d+\s*d\s*\d+(?:\s*[+\-]\s*\d+)?)\s*\)\s*(?:puntos\s+)?(?:de\s+)?(?:da[ñn]o\s+)?(?:de\s+)?([a-záéíóúñ]+)/gi;
    let m;
    while ((m = re.exec(d))) {
      let type = m[2].toLowerCase().replace(/(damage|da[ñn]o)$/, '');
      if (DMG_TYPES[type]) type = DMG_TYPES[type];
      else if (type.length > 9) {
        // Palabras pegadas («thunderdamageand…»): el tipo es el comienzo.
        const k = Object.keys(DMG_TYPES).find(w => type.startsWith(w));
        const es = Object.values(DMG_TYPES).find(w => type.startsWith(w));
        if (k || es) type = k ? DMG_TYPES[k] : es;
      }
      if (/^(damage|da[ñn]o|de|puntos)$/.test(type)) type = '';
      // Tipo partido por el reconocimiento de texto («de d a f'i o contu n d e»): se busca en lo que sigue.
      const known = Object.values(DMG_TYPES).concat(Object.keys(DMG_TYPES));
      if (!known.includes(type)) {
        const after = d
          .slice(m.index + m[0].length - m[2].length, m.index + m[0].length + 40)
          .toLowerCase()
          .replace(/[^a-záéíóúñ]/g, '');
        const hit = known.find(w => after.includes(w.normalize('NFC')));
        if (hit) type = DMG_TYPES[hit] || hit;
      }
      dmg.push([m[1].replace(/\s/g, ''), type]);
    }
    if (dmg.length) a.dmg = dmg;
    const dcm = /(?:CD|DC)\s*(\d)(?: ?(\d))?/.exec(d),
      dc = dcm && [dcm[0], dcm[1] + (dcm[2] || '')];
    if (dc) {
      const ab =
        /salvaci[oó]n de (fuerza|destreza|constituci[oó]n|inteligencia|sabidur[ií]a|carisma)/i.exec(d)?.[1] ||
        /(strength|dexterity|constitution|intelligence|wisdom|charisma) saving throw/i.exec(d)?.[1] ||
        /(fuerza|destreza|constituci[oó]n|inteligencia|sabidur[ií]a|carisma)\s*CD/i.exec(d)?.[1];
      const k = ab && ABIL_KEY[abilityOf(ab)];
      if (k && a.atk === undefined) a.dc = [k, Number(dc[1]), /mitad|half/i.test(d) ? 'half' : 'none'];
    }
    return a;
  }

  // ---------- Criaturas ----------
  // Recorre las líneas, encuentra cada «Clase de Armadura» / «Armor Class» y arma el bloque alrededor.
  function monsters(lines, opts = {}) {
    const out = [];
    const anchors = [];
    for (let i = 0; i < lines.length; i++) if (isAnchor(lines[i].t)) anchors.push(i);
    // Palabras del propio libro (para separar nombres escritos con letras sueltas).
    const counts = new Map();
    for (const l of lines)
      for (const w of l.t.split(/[^A-Za-zÁÉÍÓÚÑáéíóúñÜü]+/))
        if (w.length >= 2) counts.set(key(w), (counts.get(key(w)) || 0) + 1);
    opts = { ...opts, bookWords: new Set([...counts].filter(([, n]) => n >= 2).map(([w]) => w)) };
    for (let k = 0; k < anchors.length; k++) {
      const a = anchors[k];
      const m = block(lines, a, k + 1 < anchors.length ? anchors[k + 1] : lines.length, opts);
      // Sin tipo de criatura ni características: es un barco, un vehículo o un objeto, no una criatura.
      // Sin PG, desafío ni características: es la explicación de un bloque (un ejemplo), no una criatura.
      const has = x => m?.issues?.includes(x);
      if (
        m &&
        !(has('Sin línea de tamaño y tipo') && has('Sin puntuaciones de característica')) &&
        !(has('Sin PG') && has('Sin desafío') && has('Sin puntuaciones de característica')) &&
        !(has('Sin desafío') && has('Sin acciones') && has('Sin puntuaciones de característica'))
      )
        out.push(m);
    }
    // Ids únicos dentro del libro.
    const seen = new Map();
    for (const m of out) {
      const base = (opts.prefix || 'lib') + ':' + slug(m.name || 'criatura');
      const n = (seen.get(base) || 0) + 1;
      seen.set(base, n);
      m.id = n > 1 ? base + '-' + n : base;
    }
    return out;
  }

  function block(lines, a, nextAnchor, opts) {
    const issues = [];
    // Nombre y tipo: hasta 5 líneas antes del ancla.
    let typeAt = -1;
    for (let i = a - 1; i >= Math.max(0, a - 5); i--) {
      if (parseTypeLine(lines[i].t) && lines[i].t.length < 140) {
        typeAt = i;
        break;
      }
    }
    let name = '',
      kind = null,
      pageTitle = () => '';
    if (typeAt >= 0) {
      kind = parseTypeLine(lines[typeAt].t);
      // Nombre: un título justo arriba (más grande que la línea del tipo, en mayúsculas o corto). Si no
      // está ahí (otra columna), el título grande más cercano en la página.
      const tbh = lines[typeAt].bh ?? lines[typeAt].h;
      const titleish = (l, t) => {
        if (/cap[ií]tulo|chapter|\btypically\b|por lo general/i.test(t)) return false;
        if (t.length < 2 || t.length > 60 || !/[A-Za-zÁÉÍÓÚÑáéíóúñ]{2}/.test(t) || /[.:;,-]$/.test(t)) return false;
        if (/^[^:]{2,30}:\s/.test(t) && (l.bh ?? l.h) < tbh + 1) return false; // «Duración: 8 horas»
        const letters = t.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, '');
        const caps = letters.replace(/[^A-ZÁÉÍÓÚÑ]/g, '').length >= letters.length * 0.7;
        return (
          (l.bh ?? l.h) >= tbh + 1 || caps || (t.length <= 40 && t.split(/\s+/).length <= 6 && !/^[a-záéíóúñ]/.test(t))
        );
      };
      const nameOf = i => {
        let t = lines[i].t.trim();
        // «L a g a r t o v e r d o s o»: letras sueltas, se juntan (y se separan con el vocabulario).
        if (/^(\S ){3,}\S$/.test(t)) t = spaced(t.replace(/ /g, ''), opts.bookWords);
        return titleish(lines[i], t) ? t : '';
      };
      for (let i = typeAt - 1; i >= Math.max(0, typeAt - 3) && !name; i--) {
        if (lines[i].c !== lines[typeAt].c && lines[i].c !== 'full') continue;
        if (!nameOf(i)) continue;
        name = niceName(nameOf(i));
        const previous = lines[i - 1];
        if (
          previous &&
          previous.page === lines[i].page &&
          previous.c === lines[i].c &&
          Math.abs((previous.bh ?? previous.h) - (lines[i].bh ?? lines[i].h)) < 0.6 &&
          lines[i].y - previous.y > 0 &&
          lines[i].y - previous.y < lines[i].h * 1.8 &&
          nameOf(i - 1) &&
          (nameOf(i - 1) + ' ' + nameOf(i)).length <= 80
        )
          name = niceName(nameOf(i - 1) + ' ' + nameOf(i));
      }
      pageTitle = () => {
        const candidates = [];
        for (let i = typeAt - 4; i >= Math.max(0, typeAt - 200) && lines[i].page === lines[typeAt].page; i--)
          if ((lines[i].bh ?? lines[i].h) >= tbh + 1.5 && nameOf(i)) candidates.push(i);
        const biggest = Math.max(0, ...candidates.map(i => lines[i].bh ?? lines[i].h));
        const i = candidates.find(i => (lines[i].bh ?? lines[i].h) >= biggest * 0.8);
        if (i !== undefined) {
          const previous = lines[i - 1];
          const wrapped =
            previous &&
            previous.page === lines[i].page &&
            previous.c === lines[i].c &&
            Math.abs((previous.bh ?? previous.h) - (lines[i].bh ?? lines[i].h)) < 0.6 &&
            lines[i].y - previous.y > 0 &&
            lines[i].y - previous.y < lines[i].h * 1.8 &&
            nameOf(i - 1);
          return niceName((wrapped ? nameOf(i - 1) + ' ' : '') + nameOf(i));
        }
        return '';
      };
    } else issues.push('Sin línea de tamaño y tipo');
    // Sin título propio y dentro de la descripción de un conjuro («Siervo diminuto»): es la criatura que
    // crea ese conjuro; se llama como el conjuro.
    let fromSpell = false;
    if (!name)
      for (let i = (typeAt >= 0 ? typeAt : a) - 1; i >= Math.max(0, a - 90); i--) {
        if (isAnchor(lines[i].t)) break; // otra criatura antes: no es la de un conjuro
        if (!/^(tiempo de lanzamiento|casting time)/i.test(lines[i].t)) continue;
        for (let j = i - 1; j >= Math.max(0, i - 3); j--)
          if (parseSchoolLine(lines[j].t) && j > 0) {
            const t = lines[j - 1].t.trim();
            if (t.length >= 3 && t.length <= 60 && !/[.,;:]$/.test(t)) {
              name = niceName(t);
              fromSpell = true;
            }
            break;
          }
        break;
      }
    if (!name) name = pageTitle();
    if (!name) issues.push('Sin nombre');
    const startY = lines[a];
    // Cuerpo hasta el desafío: etiquetas y continuaciones.
    const f = {};
    let i = a,
      last = null,
      abil = null;
    const bodyH = lines[a].h;
    const rows24 = [];
    let after24 = 0; // líneas que siguen al encabezado «MOD SALV»: filas de características aunque estén mal leídas
    for (; i < nextAnchor && i < a + 40; i++) {
      const t = lines[i].t;
      if (/\bm[o0]d\b.{0,16}\bsa[vl]/i.test(t)) {
        after24 = 3;
        last = null;
        continue;
      }
      if (isAbilRow24(t) || (after24 > 0 && /\d/.test(t) && !LABELS.some(([, re]) => re.test(t)))) {
        rows24.push(t);
        after24--;
        last = null;
        continue;
      }
      after24 = 0;
      if (isAbilHeader(t)) {
        abil = parseAbilities(lines.slice(i, i + 4).map(l => l.t));
        // Se saltan las líneas de números.
        while (i + 1 < nextAnchor && /^[\s\d()+\-]+$/.test(lines[i + 1].t)) i++;
        last = null;
        continue;
      }
      let lab = LABELS.find(([, re]) => re.test(t)) || splitLabel(t);
      // Desafío mal reconocido («Oesafro: 18 (20 000 PX)»): la línea con «(… PX)» o «(… XP)».
      if (!lab && /\(\s*[\d][\d\s.,]*\s*(PX|XP)\s*\)/i.test(t) && /^[^:]{3,14}:?\s*[\d½¼⅛]/.test(t))
        lab = ['cr', /^[^:\d]{3,14}:?\s*/];
      if (lab) {
        f[lab[0]] = t.replace(lab[1], '').trim();
        if (['ac', 'hp', 'cr', 'speed'].includes(lab[0]))
          f[lab[0]] = fixDigits(f[lab[0]])
            .replace(/(?<=\d)\s+(?=\d)/g, '')
            .replace(/(?<![A-Za-zÁÉÍÓÚÑáéíóúñ])([lIOS\d]{1,3})(?=\s?(pies|ft)\b)/g, x =>
              x.replace(/[lI]/g, '1').replace(/O/g, '0').replace(/S/g, '5'),
            );
        last = lab[0];
        if (lab[0] === 'cr') {
          // Algunas líneas traen también el bonificador por competencia.
          f.cr = f.cr.replace(/(bonificador|proficiency).*/i, '').trim();
          i++;
          break;
        }
        continue;
      }
      if (SECTION.some(([, re]) => re.test(t))) break;
      if (last && !abil && last !== 'cr') f[last] += ' ' + t;
      else if (last && abil && !['ac', 'hp', 'speed'].includes(last)) f[last] += ' ' + t;
    }
    if (!abil && rows24.length) {
      const r = abilities24(rows24);
      if (r) {
        abil = r.ab;
        if (r.partial) issues.push('Características incompletas');
        if (!f.saves && r.saves) f.saves = r.saves;
      }
    }
    // «Inmunidades Fuego, Veneno; Envenenado»: daño antes del «;», estados después.
    if (f.imm24) {
      const [d, c] = f.imm24.split(';');
      if (c !== undefined) {
        f.imm = f.imm || d.trim();
        f.cimm = f.cimm || c.trim();
      } else if (d.split(',').every(x => CONDITION_RE.test(x.trim()))) f.cimm = f.cimm || d.trim();
      else f.imm = f.imm || d.trim();
    }
    if (!abil || abil.approx) {
      const near = lines
        .slice(a, Math.min(nextAnchor, a + 40))
        .filter(l => !l.edge && !LABELS.some(([, re]) => re.test(l.t)));
      const wide = lines
        .slice(a, Math.min(nextAnchor, a + 12))
        .filter(l => !LABELS.some(([, re]) => re.test(l.t)) && !splitLabel(l.t))
        .map(l => l.t);
      abil = abilitiesByHeader(near.map(l => l.t)) || parseAbilities(wide, true) || abil || parseAbilities(wide);
      if (!abil) issues.push('Sin puntuaciones de característica');
    }
    if (abil?.approx) issues.push('Características aproximadas');
    // Rasgos y acciones hasta el próximo bloque o hasta que cambie el texto (tamaño o fuente).
    const body = lines.slice(a, i);
    const fonts = new Set(body.flatMap(l => l.runs.map(r => r.f)));
    // Fuente del texto corrido de rasgos y acciones: la más usada después del desafío. Los nombres
    // («Mordisco.») van en otra (negrita o cursiva).
    const valueFont = (() => {
      const count = {};
      for (const l of lines.slice(i, Math.min(nextAnchor, i + 40)))
        for (const r of l.runs) count[r.f] = (count[r.f] || 0) + r.t.trim().length;
      const best = Object.entries(count).sort((x, y) => y[1] - x[1])[0];
      if (best) return best[0];
      const hpLine = body.find(l => /^(puntos de golpe|hit points)/i.test(l.t));
      return hpLine?.runs[hpLine.runs.length - 1]?.f || body[0]?.runs[0]?.f;
    })();
    const lists = { traits: [], actions: [], bonus: [], reactions: [], legendary: [] };
    let section = 'traits',
      cur = null,
      stopAt = nextAnchor;
    // El próximo bloque empieza en su nombre (dos líneas antes de su «Clase de Armadura»).
    if (nextAnchor < lines.length) {
      for (let j = nextAnchor - 1; j >= Math.max(i, nextAnchor - 5); j--)
        if (parseTypeLine(lines[j].t)) {
          stopAt = Math.max(i, j - 1);
          break;
        }
    }
    let nameFont = null; // fuente de los nombres de rasgos y acciones de este bloque
    let single = null;
    // Casi todo en una fuente (PDF escaneado con reconocimiento de texto): no hay negritas para los nombres.
    const singleFont = () => {
      if (single !== null) return single;
      const count = {};
      let total = 0;
      for (const l of lines.slice(i, Math.min(stopAt, i + 40)))
        for (const r of l.runs) {
          const n = r.t.trim().length;
          count[r.f] = (count[r.f] || 0) + n;
          total += n;
        }
      return (single = Object.values(count).filter(n => n > 3).length <= 1);
    };
    const nameStart = l => {
      // Nombre del rasgo: el primer tramo en otra fuente que termina en punto, o «Nombre (algo).» al inicio.
      const r0 = l.runs[0];
      const multi = /^(Multiattack|Multiataque|Ataque m[uú]ltiple)[,.]\s+(.+)$/i.exec(l.t);
      if (multi) return { n: multi[1], rest: multi[2] };
      // Todo en una sola fuente (PDF escaneado con reconocimiento de texto): «Nombre. Texto» al empezar
      // un párrafo (la línea anterior terminó la frase).
      if (singleFont() && (!cur || /[.)]$/.test(cur.d.trim()))) {
        const m = /^([A-ZÁÉÍÓÚÑ][^.:;\d]{1,45}?(?:\s*\([^)]{1,30}\))?)\.\s*(.*)$/.exec(l.t);
        if (m && m[1].split(/\s+/).length <= 6 && (!m[2] || /^[A-ZÁÉÍÓÚÑ«"(\d]/.test(m[2])))
          return { n: m[1].trim(), rest: m[2].trim() };
      }
      // «Cimitarra. Ataque con arma cuerpo a cuerpo: …» aunque el nombre no esté en negrita.
      const atkLine =
        /^([A-ZÁÉÍÓÚÑ][^.:;\d]{1,40})\.\s+((?:melee|ranged|ataque con|ataque de|tirada de ataque)\b.*)$/i.exec(l.t);
      if (atkLine && section !== 'traits' && (!cur || /[.)]$/.test(cur.d.trim())))
        return { n: atkLine[1].trim(), rest: atkLine[2] };
      if (!r0 || !/^[A-ZÁÉÍÓÚÑ¡¿]/.test(r0.t.trim()) || r0.t.trim().split(/\s+/).length > 9) return null;
      if (nameFont && r0.f !== nameFont && !(cur && /[.:)]$/.test(cur.d.trim()) && r0.t.trim().length <= 40))
        return null;
      if (r0 && r0.f !== valueFont && /^[^.]{2,70}\.\s*$/.test(r0.t.trim()))
        return {
          n: r0.t.trim().replace(/\.$/, ''),
          rest: l.runs
            .slice(1)
            .map(r => r.t)
            .join('')
            .trim(),
        };
      // «Toque. Ataque con arma cuerpo a cuerpo:» todo en la misma fuente (negrita cursiva).
      const atk = /^([^.]{2,60})\.\s+((?:melee|ranged|ataque|attaque)\b[^.]*:?)$/i.exec(r0.t.trim());
      if (atk && r0.f !== valueFont)
        return {
          n: atk[1],
          rest: (
            atk[2] +
            ' ' +
            l.runs
              .slice(1)
              .map(r => r.t)
              .join('')
          )
            .replace(/\s+/g, ' ')
            .trim(),
        };
      if (r0 && r0.f !== valueFont && l.runs[1] && /^\s*\.\s*/.test(l.runs[1].t) && r0.t.trim().length <= 70)
        return {
          n: r0.t.trim(),
          rest: l.runs
            .slice(1)
            .map(r => r.t)
            .join('')
            .replace(/^\s*\.\s*/, '')
            .trim(),
        };
      return null;
    };
    // Texto que no es del bloque (encabezados, número de página, ambientación en otra columna):
    // se saltea si es poco o si después sigue el bloque (una sección como «Acciones»); si no, termina.
    // Tamaños de letra del bloque: los de las etiquetas y los de las primeras líneas de rasgos.
    const size = l => l.bh ?? l.h;
    const sizes = [...body, ...lines.slice(i, Math.min(stopAt, i + 6)).filter(l => !l.edge)].map(size);
    const refH = sizes.length ? sizes.slice().sort((x, y) => x - y)[Math.floor(sizes.length / 2)] : bodyH;
    const ocrFont = body.some(l => l.runs.some(r => r.f === 'OCR'));
    const tol = Math.max(0.45, refH * (ocrFont ? 0.35 : 0.06));
    const foreign = l => l.edge || /^\d{1,3}$/.test(l.t) || !sizes.some(s => Math.abs(size(l) - s) <= tol);
    const isSec = l => SECTION.some(([, re]) => re.test(l.t));
    let j = i;
    for (; j < stopAt && j < i + 200; j++) {
      const l = lines[j],
        t = l.t;
      // Un recuadro de variante no cambia las acciones de la criatura base.
      if (/^(?:variante?|variantes?)\s*:/i.test(t.trim())) break;
      let sec = SECTION.find(([, re]) => re.test(t));
      if (!sec && singleFont()) {
        const fz = fuzzySection(t);
        if (fz) sec = [fz];
        // Ruido del reconocimiento de texto (ilustraciones leídas como letras sueltas): se ignora.
        else if (!/[A-Za-zÁÉÍÓÚÑáéíóúñ]{3}/.test(t)) continue;
      }
      // Un nombre de acción en otro tamaño («Toque relampagueante.» en negrita más grande) sigue siendo del bloque.
      if (foreign(l) && !sec && !(!l.edge && section !== 'traits' && nameStart(l) && !foreign(lines[j + 1] || l))) {
        let k = j;
        while (k < stopAt && foreign(lines[k]) && !isSec(lines[k])) k++;
        if (k - j <= 3) {
          j = k - 1;
          continue;
        }
        // Mucho texto ajeno: el bloque sigue solo si más adelante aparece una sección del mismo tamaño.
        let resume = -1;
        for (let q = k; q < Math.min(stopAt, k + 80); q++)
          if (isSec(lines[q]) && sizes.some(s => Math.abs(size(lines[q]) - s) <= Math.max(tol * 1.6, s * 0.2))) {
            resume = q;
            break;
          }
        if (resume < 0) break;
        j = resume - 1;
        cur = null;
        continue;
      }
      if (sec) {
        if (sec[0] === 'stop') break;
        section = sec[0];
        cur = null;
        continue;
      }
      const ns = nameStart(l);
      // Cambio de columna o de página: sigue el bloque si la frase venía cortada o si son más rasgos;
      // un párrafo nuevo después de las acciones suele ser la ambientación de la criatura.
      const prev = lines[j - 1];
      if (prev && (prev.page !== l.page || prev.c !== l.c) && cur) {
        const cut = !/[.:)»"]$/.test(cur.d.trim());
        // Frase completa y la columna nueva empieza a mitad de otra frase: es texto de otra cosa.
        if (!cut && /^[a-záéíóúñ]/.test(t)) break;
      }
      if (ns) {
        nameFont = nameFont || l.runs[0].f;
        cur = { n: ns.n, d: ns.rest, f: l.runs[0].f };
        fonts.add(l.runs[0].f);
        lists[section].push(cur);
      } else if (cur) {
        // Palabra cortada al final de la línea («tar-» + «get»): se une sin el guion.
        if (/[a-záéíóúñ]-$/i.test(cur.d) && /^[a-záéíóúñ]/.test(t)) cur.d = cur.d.slice(0, -1) + t;
        else cur.d += (cur.d ? ' ' : '') + t;
      } else if (section === 'legendary' && !lists.legendary.length)
        continue; // texto introductorio
      else if (t.length > 2) {
        // Línea suelta antes del primer rasgo: si parece «Nombre. texto», se usa así.
        const m = /^([A-ZÁÉÍÓÚÑ][^.]{1,60})\.\s+(.+)$/.exec(t);
        if (m && m[1].split(' ').length <= 8) {
          cur = { n: m[1], d: m[2], f: l.runs[0]?.f };
          lists[section].push(cur);
        }
      }
    }
    // Libros en metros («1,5 m», «18 m»): a pies, como el resto del sitio (1,5 m = 5 pies).
    const metric = /\d\s*m(?=$|[\s,.;:)])/.test(f.speed || '') && !/pies|ft/i.test(f.speed || '');
    const toFeet = s =>
      metric
        ? String(s).replace(
            /(\d+(?:[.,]\d+)?)\s*m(?=$|[\s,.;:)])/g,
            (x, n) => Math.round(Number(n.replace(',', '.')) / 1.5) * 5 + ' pies',
          )
        : String(s);
    const tidy = s =>
      mergeSplits(
        toFeet(s)
          .replace(/(\w)- (\w)/g, '$1$2')
          .replace(/\bCD\s+([12]\d)0\b(?=\s+[a-záéíóúñ])/g, 'CD $1 o')
          .replace(/\s+/g, ' ')
          .trim(),
        opts.vocab,
      );
    const acts = list => list.map(x => parseAction(tidy(x.n), tidy(x.d)));
    // Sin el título «Acciones» (no se leyó bien): desde el primer Multiataque o ataque, son acciones.
    if (!lists.actions.length && !lists.bonus.length) {
      const k = lists.traits.findIndex(
        x =>
          /^(multiataque|multiattack)/.test(key(x.n)) ||
          /(weapon attack|spell attack|attack roll|ataque (con|de) (arma|conjuro)|tirada de ataque)[^:.]{0,40}:/i.test(
            x.d.replace(/\s+/g, ' '),
          ),
      );
      if (k >= 0) lists.actions = lists.traits.splice(k);
    }
    const crv = parseCR(f.cr || '');
    // Criaturas invocadas o compañeros (Tasha, Xanathar): «Desafío: —» y PG o CA que dependen de tu
    // nivel o del nivel del conjuro. No es un error: se guarda la fórmula para leerla en la mesa.
    const summon =
      fromSpell ||
      /^\s*[-—–]/.test(f.cr || '') ||
      /(tu nivel|nivel de(l)? conjuro|nivel del? (explorador|art[ií]fice|druida|guerrero|mago|clérigo)|your level|spell'?s? level|\bBC\b|\bPB\b)/i.test(
        (f.hp || '') + ' ' + (f.ac || ''),
      );
    if (!crv && !summon) issues.push('Sin desafío');
    f.hp = (f.hp || '').replace(/^\s*([\dlIOSO\s'’]{1,12})(?=\()/, prefix =>
      prefix
        .replace(/[lI]/g, '1')
        .replace(/O/g, '0')
        .replace(/S/g, '5')
        .replace(/[\s'’]/g, ''),
    );
    const ac = /\d+/.exec(
      (f.ac || '').replace(/^\s*([lIO\d]{1,2})(?![A-Za-z])/, x => x.replace(/[lI]/g, '1').replace(/O/g, '0')),
    );
    let hp =
      /(?<![A-Za-z'’])(\d+)\s*\(([^)]*)\)/.exec(f.hp || '') || /(?<![A-Za-z'’\d(])(\d+)(?![\dd])/.exec(f.hp || '');
    // Número ilegible pero dados legibles («HP r4 (4d6)»): el promedio de los dados con la Constitución.
    if (!hp) {
      const d = /(\d+)\s*d\s*(\d+)/.exec(fixDigits(f.hp || ''));
      if (d && abil && Number(d[1]) <= 60 && [4, 6, 8, 10, 12, 20].includes(Number(d[2]))) {
        const n = Number(d[1]),
          con = Math.floor((abil[2] - 10) / 2);
        hp = [
          null,
          String(Math.max(1, Math.floor((n * (Number(d[2]) + 1)) / 2) + n * con)),
          n + 'd' + d[2] + (con ? (con > 0 ? ' + ' : ' - ') + Math.abs(n * con) : ''),
        ];
        issues.push('PG calculados con los dados');
      }
    }
    if (summon && !hp) {
      const base = /^\s*([\dlISO]{1,3})(?=\s*(\+|\(|o\b|$))/.exec(f.hp || '');
      if (base) hp = [null, base[1].replace(/[lI]/g, '1').replace(/S/g, '5').replace(/O/g, '0')];
    }
    if (!ac) issues.push('Sin CA');
    if (!hp) issues.push('Sin PG');
    const traits = lists.traits.map(x => [tidy(x.n), tidy(x.d)]);
    const actions = [...acts(lists.actions), ...acts(lists.bonus).map(x => ({ ...x, n: x.n + ' (adicional)' }))];
    if (!actions.length) issues.push('Sin acciones');
    const english = /armor class|[il1]n[il1]t[il1]at[il1]ve/i.test(lines[a].t);
    const feet = s => toFeet(english ? String(s || '').replace(/(\d+)\s*ft\.?/gi, '$1 pies') : String(s || ''));
    const v = opts.vocab;
    const m = {
      name: fixName(name, v) || 'Criatura sin nombre',
      size: kind?.size || 'Mediano',
      type: kind?.type || 'monstruosidad',
      align: kind?.align || '',
      ac: ac ? Number(ac[0]) : 10,
      hp: hp ? Number(hp[1]) : 1,
      hd: (() => {
        const d =
          hp &&
          hp[2] &&
          /(\d+)\s*d\s*(\d+)\s*(?:([+\-])[\s+\-]*(\d+))?/.exec(
            fixDigits(hp[2]).replace(/(\d)[Ss]|[Ss](\d)/g, (x, a, b) => (a ? a + '5' : '5' + b)),
          );
        const sign = d && /\+/.test(d[0]) ? '+' : '-';
        return d ? d[1] + 'd' + d[2] + (d[4] ? sign + d[4] : '') : '';
      })(),
      speed: cleanSpeed(feet(f.speed || '')),
      ab: abil || [10, 10, 10, 10, 10, 10],
      saves: shortSaves(f.saves),
      skills: f.skills || '',
      vuln: f.vuln || '',
      res: f.res || '',
      imm: f.imm || '',
      cimm: f.cimm || '',
      senses: feet(f.senses || ''),
      lang: f.lang || '',
      cr: crv ? crv.cr : 0,
      xp: crv ? (crv.xp ?? XP_BY_CR[crv.cr] ?? 0) : 0,
      traits,
      actions,
      reactions: acts(lists.reactions),
      legendary: acts(lists.legendary),
      page: lines[a].page + 1,
    };
    if (english) m.lang_book = 'en';
    if (summon) {
      m.summon = true;
      const note = s =>
        feet(
          String(s || '')
            .replace(/\s+/g, ' ')
            .trim(),
        ).slice(0, 300);
      if (/[a-z]{3}/i.test((f.hp || '').replace(/^[^(]*\(\s*\d+d\d+[^)]*\)/, ''))) m.hpNote = note(f.hp);
      if (/\+\s*(BC|PB|el nivel|the level|tu|your)/i.test(f.ac || '')) m.acNote = note(f.ac);
    }
    if (issues.length) m.issues = issues;
    void startY;
    return m;
  }

  // ---------- Arreglos con vocabulario conocido ----------
  // Clave para comparar sin tildes, espacios ni confusiones típicas del reconocimiento (l/I/1, O/0).
  const key = s =>
    String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[1l|]/g, 'i')
      .replace(/0/g, 'o')
      .replace(/[^a-z]/g, '');
  // Vocabulario: palabras y nombres correctos (los del sitio: conjuros, monstruos, objetos del SRD).
  function vocabulary(texts = [], names = []) {
    const words = new Map(); // clave → palabra bien escrita
    for (const t of texts)
      for (const w of String(t || '')
        .toLowerCase()
        .split(/[^a-záéíóúüñ]+/))
        if (w.length > 2 && !words.has(key(w))) words.set(key(w), w);
    const byKey = new Map();
    for (const n of names) if (n) byKey.set(key(n), n);
    return { words, byKey };
  }
  // «Luce s da nzantes» → «Luces danzantes», «1ns ta ntá neo» → «instantáneo»: une pedazos de palabra
  // si juntos forman una conocida (y no eran ya palabras conocidas cada uno).
  function mergeSplits(text, vocab) {
    if (!vocab?.words?.size) return text;
    const toks = String(text).split(' ');
    const out = [];
    const letters = p => /[a-záéíóúüñ]/i.test(p) && !/^\d+$/.test(p);
    const isWord = p => vocab.words.has(key(p)) && key(p).length > 2;
    for (let i = 0; i < toks.length; i++) {
      let merged = null;
      for (let n = 4; n >= 2 && !merged; n--) {
        if (i + n > toks.length) continue;
        const parts = toks.slice(i, i + n);
        if (!parts.every(letters)) continue;
        const lead = /^[^a-záéíóúüñ0-9]*/i.exec(parts[0])[0],
          tail = /[^a-záéíóúüñ0-9]*$/i.exec(parts[n - 1])[0];
        if (parts.slice(0, -1).some(p => /[^a-záéíóúüñ0-9]$/i.test(p))) continue; // puntuación en el medio: son palabras distintas
        const k = key(parts.join(''));
        const word = k.length > 3 && vocab.words.get(k);
        if (word && !parts.every(isWord)) {
          const raw = parts.join('').slice(lead.length, parts.join('').length - tail.length);
          const fixed = /^[A-ZÁÉÍÓÚÑ]/.test(raw) ? word.charAt(0).toUpperCase() + word.slice(1) : word;
          merged = lead + fixed + tail;
          i += n - 1;
        }
      }
      out.push(merged || toks[i]);
    }
    return out.join(' ');
  }
  const fixName = (name, vocab) => (name ? vocab?.byKey?.get(key(name)) || mergeSplits(name, vocab) : name);

  // ---------- Conjuros ----------
  const SCHOOLS = [
    [/abjura/i, 'Abjuración'],
    [/conjura/i, 'Conjuración'],
    [/adivina|divination/i, 'Adivinación'],
    [/encanta|enchant/i, 'Encantamiento'],
    [/evoca/i, 'Evocación'],
    [/ilusi|illusion/i, 'Ilusión'],
    [/nigroman|necroman/i, 'Nigromancia'],
    [/transmuta/i, 'Transmutación'],
  ];
  // Etiquetas tolerantes a espacios sueltos del reconocimiento de texto («Tie mpo de lanzam iento»).
  const fuzzy = (...words) =>
    new RegExp(
      '^(' +
        words
          .map(w =>
            w
              .split(' ')
              .map(part =>
                [...part]
                  .map(ch =>
                    ch === 'í' || ch === 'i'
                      ? '[ií1l]'
                      : ch === 'ó' || ch === 'o'
                        ? '[oó0]'
                        : ch === 'l'
                          ? '[l1IJ]'
                          : ch,
                  )
                  .join('\\s?'),
              )
              .join('\\s+'),
          )
          .join('|') +
        ')\\s*:?\\s*',
      'i',
    );
  const SPELL_LABELS = [
    ['time', fuzzy('tiempo de lanzamiento', 'casting time')],
    ['range', fuzzy('alcance', 'range')],
    ['components', fuzzy('componentes', 'components')],
    ['duration', fuzzy('duración', 'duracion', 'duration')],
  ];
  const isSpellAnchor = t => SPELL_LABELS[0][1].test(t) && /:/.test(t.slice(0, 40));
  // «Evocación de nivel 3», «Transmutación nivel 6», «Truco de conjuración», «3rd-level evocation (ritual)»
  function parseSchoolLine(t) {
    const school = SCHOOLS.find(([re]) => re.test(t))?.[1];
    if (!school || t.length > 80) return null;
    const lv = /(?:nivel|level)\s*([0-9lIS])|(\d)(?:st|nd|rd|th)?-level/i.exec(t);
    const level = /truco|cantrip/i.test(t)
      ? 0
      : lv
        ? Number(
            String(lv[1] || lv[2])
              .replace(/[lI]/, '1')
              .replace('S', '5'),
          )
        : null;
    if (level === null) return null;
    return { school, level, ritual: /ritual/i.test(t) };
  }
  function spells(lines, opts = {}) {
    const anchors = [];
    for (let i = 0; i < lines.length; i++) if (isSpellAnchor(lines[i].t)) anchors.push(i);
    const out = [];
    for (let k = 0; k < anchors.length; k++) {
      const a = anchors[k],
        next = k + 1 < anchors.length ? anchors[k + 1] : lines.length;
      let schoolAt = -1;
      for (let i = a - 1; i >= Math.max(0, a - 3); i--)
        if (parseSchoolLine(lines[i].t)) {
          schoolAt = i;
          break;
        }
      if (schoolAt < 0) continue;
      const sl = parseSchoolLine(lines[schoolAt].t);
      // Nombre: la línea de arriba que no es texto corrido ni cabecera de página. Un nombre arriba de
      // la página queda marcado como borde, pero sigue siendo el nombre.
      const header = l =>
        /^\d{1,3}$/.test(l.t) || (l.edge && (/\d/.test(l.t) || /cap.{0,3}tulo|chapter|p.?ltulo/i.test(l.t)));
      let nameAt = schoolAt - 1;
      while (
        nameAt > schoolAt - 4 &&
        nameAt >= 0 &&
        (header(lines[nameAt]) || lines[nameAt].t.length < 2 || /[.,;]$/.test(lines[nameAt].t.trim()))
      )
        nameAt--;
      const nameLine = nameAt >= 0 ? lines[nameAt] : null;
      const name = nameLine && !header(nameLine) && !/[.,;]$/.test(nameLine.t.trim()) ? niceName(nameLine.t) : '';
      const f = {};
      let i = a,
        last = null;
      for (; i < next && i < a + 12; i++) {
        const lab = SPELL_LABELS.find(([, re]) => re.test(lines[i].t));
        if (lab) {
          f[lab[0]] = lines[i].t.replace(lab[1], '').trim();
          last = lab[0];
        } else if (last && last !== 'duration') f[last] += ' ' + lines[i].t;
        else break;
        if (lab && lab[0] === 'duration') {
          i++;
          break;
        }
      }
      // Descripción: hasta el nombre del siguiente conjuro o hasta que cambie el texto.
      let stop = next;
      if (next < lines.length) {
        for (let q = next - 1; q >= Math.max(i, next - 3); q--)
          if (parseSchoolLine(lines[q].t)) {
            stop = Math.max(i, q - 1);
            break;
          }
      }
      const bodyLines = lines.slice(i, stop).filter(l => !l.edge && !/^\d{1,3}$/.test(l.t));
      const sizes = bodyLines.slice(0, 4).map(l => l.bh ?? l.h);
      const ref = sizes.length ? sizes.sort((x, y) => x - y)[Math.floor(sizes.length / 2)] : 0;
      const text = [];
      for (const l of bodyLines) {
        if (Math.abs((l.bh ?? l.h) - ref) > Math.max(1, ref * 0.25) && text.length) break;
        text.push(l.t);
      }
      let body = text
        .join(' ')
        .replace(/(\w)- (\w)/g, '$1$2')
        .replace(/\s+/g, ' ')
        .trim();
      let higher = '';
      const hm = /(A niveles superiores|At Higher Levels)\s*\.?\s*/i.exec(body);
      if (hm) {
        higher = body.slice(hm.index + hm[0].length).trim();
        body = body.slice(0, hm.index).trim();
      }
      const issues = [];
      if (!name) issues.push('Sin nombre');
      if (!f.range || !f.components || !f.duration) issues.push('Faltan datos del encabezado');
      if (body.length < 20) issues.push('Sin descripción');
      const v = opts.vocab,
        fx = s =>
          mergeSplits(
            String(s || '')
              .replace(/\s+/g, ' ')
              .trim(),
            v,
          ),
        known = name && v?.byKey?.get(key(name));
      if (name && /:|\.$/.test(name) && !known) issues.push('Nombre dudoso');
      out.push({
        name: known || fixName(name, v) || 'Conjuro sin nombre',
        level: sl.level,
        school: sl.school,
        ritual: sl.ritual || /ritual/i.test(f.time || ''),
        time: fx(f.time),
        range: fx(f.range),
        components: fx(f.components),
        duration: fx(f.duration),
        concentration: /concentra/i.test(key(f.duration || '')),
        text: fx(body),
        higher: fx(higher),
        ...(known ? { known: true } : {}),
        page: lines[a].page + 1,
        ...(issues.length ? { issues } : {}),
      });
    }
    const seen = new Map();
    for (const s of out) {
      const base = (opts.prefix || 'lib') + ':' + slug(s.name);
      const n = (seen.get(base) || 0) + 1;
      seen.set(base, n);
      s.id = n > 1 ? base + '-' + n : base;
    }
    return out;
  }

  // ---------- Objetos mágicos ----------
  const ITEM_RE =
    /^(objeto maravilloso|arma|armadura|anillo|varita|vara|bast[oó]n|poci[oó]n|pergamino|escudo|wondrous item|weapon|armor|ring|wand|rod|staff|potion|scroll|shield)\b(.{0,90}?)\b(com[uú]n|infrecuente|poco com[uú]n|muy rar[oa]|rar[oa]|legendari[oa]|artefacto|rareza variable|common|uncommon|very rare|rare|legendary|artifact|rarity varies)\b/i;
  const RARITY = [
    [/muy rar|very rare/i, 'muy raro'],
    [/poco com|infrecuente|uncommon/i, 'infrecuente'],
    [/legendari|legendary/i, 'legendario'],
    [/artefacto|artifact/i, 'artefacto'],
    [/variable|varies/i, 'variable'],
    [/rar[oa]\b|\brare/i, 'raro'],
    [/com[uú]n|common/i, 'común'],
  ];
  function items(lines, opts = {}) {
    const anchors = [];
    for (let i = 0; i < lines.length; i++) if (lines[i].t.length < 160 && ITEM_RE.test(lines[i].t)) anchors.push(i);
    const out = [];
    for (let k = 0; k < anchors.length; k++) {
      const a = anchors[k],
        next = k + 1 < anchors.length ? anchors[k + 1] : lines.length;
      let nameAt = a - 1;
      while (nameAt > a - 3 && nameAt >= 0 && (lines[nameAt].edge || lines[nameAt].t.length < 2)) nameAt--;
      if (nameAt < 0) continue;
      const nameLine = lines[nameAt];
      // El nombre va en una fuente o tamaño propio (título): si es texto corrido, no es un objeto.
      if (/[.,;]$/.test(nameLine.t) || nameLine.t.length > 70) continue;
      const head = lines[a].t;
      const m = ITEM_RE.exec(head);
      const stop = next < lines.length ? Math.max(a + 1, next - 1) : lines.length;
      const bodyLines = lines.slice(a + 1, stop).filter(l => !l.edge && !/^\d{1,3}$/.test(l.t));
      const sizes = bodyLines.slice(0, 4).map(l => l.bh ?? l.h);
      const ref = sizes.length ? sizes.sort((x, y) => x - y)[Math.floor(sizes.length / 2)] : 0;
      const text = [];
      for (const l of bodyLines.slice(0, 120)) {
        if (Math.abs((l.bh ?? l.h) - ref) > Math.max(1, ref * 0.25) && text.length) break;
        text.push(l.t);
      }
      const body = text
        .join(' ')
        .replace(/(\w)- (\w)/g, '$1$2')
        .replace(/\s+/g, ' ')
        .trim();
      const issues = body.length < 15 ? ['Sin descripción'] : [];
      const v = opts.vocab;
      out.push({
        name: fixName(niceName(nameLine.t), v),
        kind: m[1].toLowerCase(),
        detail: head.trim(),
        rarity: RARITY.find(([re]) => re.test(m[3]))?.[1] || '',
        attunement:
          /sintoniz|attunement/i.test(head) ||
          bodyLines
            .slice(0, 2)
            .some(l => /^\(?\s*(requiere|requires)\b/i.test(l.t) && /sintoniz|attunement/i.test(l.t)),
        text: mergeSplits(body, v),
        page: lines[a].page + 1,
        ...(issues.length ? { issues } : {}),
      });
    }
    const seen = new Map();
    for (const s of out) {
      const base = (opts.prefix || 'lib') + ':' + slug(s.name);
      const n = (seen.get(base) || 0) + 1;
      seen.set(base, n);
      s.id = n > 1 ? base + '-' + n : base;
    }
    return out;
  }

  // ---------- Rasgos de clase y subclase, opciones de clase y dotes ----------
  // El sitio ya conoce los nombres (en castellano y en inglés), los niveles y el libro de cada rasgo:
  // acá se busca su título en el PDF y se toma el texto hasta el título siguiente.
  function ruleTargets(D, Cat) {
    const out = [];
    const feats = list =>
      (list || []).map(f => ({
        en: f.english || f.name,
        names: [f.name, f.english],
        level: f.level,
        children: f.children || [],
        source: f.source,
      }));
    for (const c of Object.values(D?.classes || {}))
      out.push({ kind: 'class', id: c.id, source: c.source, names: [c.name, c.english], features: feats(c.features) });
    for (const sc of D?.subclasses || [])
      out.push({
        kind: 'subclass',
        id: sc.id,
        classId: sc.classId,
        source: sc.source,
        names: [sc.name, sc.english],
        features: feats(sc.features),
      });
    for (const o of D?.options || [])
      out.push({
        kind: 'option',
        id: o.id,
        source: o.source,
        group: String(o.types?.[0] || '').split(':')[0],
        names: [o.name, o.english],
      });
    for (const f of Cat?.feats || [])
      out.push({ kind: 'feat', id: f.id, source: f.sourceKey, group: 'feat', names: [f.name, f.english] });
    return out;
  }
  const nameKeys = names => [
    ...new Set(
      names
        .filter(Boolean)
        .map(n => key(n))
        .filter(k => k.length >= 3),
    ),
  ];
  function rules(lines, targets, opts = {}) {
    const body = (() => {
      const count = new Map();
      for (const l of lines) if (!l.edge && l.t.length > 40) count.set(l.bh, (count.get(l.bh) || 0) + l.t.length);
      return [...count].sort((a, b) => b[1] - a[1])[0]?.[0] || 9;
    })();
    // Tamaño del texto corrido de cada página (algunos PDF cambian la escala de página a página).
    const pageBody = new Map();
    {
      const count = new Map();
      for (const l of lines)
        if (!l.edge && l.t.length > 30) {
          const k = l.page + '|' + l.bh;
          count.set(k, (count.get(k) || 0) + l.t.length);
        }
      for (const [k, n] of count) {
        const pg = Number(k.slice(0, k.indexOf('|'))),
          bh = Number(k.slice(k.indexOf('|') + 1));
        if (!pageBody.has(pg) || n > pageBody.get(pg)[1]) pageBody.set(pg, [bh, n]);
      }
    }
    const bodyAt = l => pageBody.get(l.page)?.[0] ?? body;
    // Cabeceras que se repiten en muchas páginas («CAPÍTULO 1: OPCIONES DE PERSONAJE»): no son títulos.
    const repeated = new Set();
    {
      // Misma línea en muchas páginas y siempre a la misma altura: una cabecera, no un título.
      const pagesOf = new Map();
      for (const l of lines)
        if (l.t.length <= 60) {
          const k = key(l.t);
          if (k.length < 6) continue;
          if (!pagesOf.has(k)) pagesOf.set(k, { pages: new Set(), ys: [] });
          pagesOf.get(k).pages.add(l.page);
          pagesOf.get(k).ys.push(l.y);
        }
      for (const [k, { pages, ys }] of pagesOf) {
        if (pages.size < 6) continue;
        const mean = ys.reduce((a, b) => a + b, 0) / ys.length;
        const sd = Math.sqrt(ys.reduce((a, b) => a + (b - mean) ** 2, 0) / ys.length);
        if (sd < 25) repeated.add(k);
      }
    }
    // Fuente del texto corrido de cada página (los PDF numeran las fuentes por página).
    const pageFont = new Map();
    {
      const count = new Map();
      for (const l of lines)
        for (const r of l.runs) {
          const k = l.page + '|' + r.f;
          count.set(k, (count.get(k) || 0) + r.t.length);
        }
      for (const [k, n] of count) {
        const [pg, f] = [Number(k.slice(0, k.indexOf('|'))), k.slice(k.indexOf('|') + 1)];
        if (!pageFont.has(pg) || n > pageFont.get(pg)[1]) pageFont.set(pg, [f, n]);
      }
    }
    const bodyOf = l => pageFont.get(l.page)?.[0];
    // Títulos: una línea corta sola (más grande o en otra fuente), o «Nombre.» al empezar un párrafo.
    const keyAt = lines.map(l => (l.t.length <= 90 ? key(l.t) : ''));
    const inlineAt = lines.map(l => {
      const r0 = l.runs[0];
      const m = /^([^.:]{3,70}?)\s*[.:]\s+\S/.exec(l.t);
      return m && r0 && r0.f !== bodyOf(l) && r0.t.trim().length <= m[1].length + 3 ? key(m[1]) : '';
    });
    const LEVEL_LINE =
      /^(rasgo (de|del) .{2,40} (de|del) nive[l1/I|]\s*\d|\d{1,2}(st|nd|rd|th)[\s-]+level .{2,40} feature|nivel \d{1,2}\s*:)/i;
    // Cabecera o pie de página de verdad (no un título que cae arriba de la página).
    const noise = l =>
      /^\d{1,3}$/.test(l.t) ||
      (l.edge && (repeated.has(key(l.t)) || /\d/.test(l.t) || /cap[ií]tulo|chapter/i.test(l.t) || l.t.length < 4));
    const isTitle = i => {
      const l = lines[i];
      if (!l || noise(l) || l.t.length > 90 || /[.,;]$/.test(l.t) || !/[A-Za-zÁÉÍÓÚÑáéíóúñ]{3}/.test(l.t)) return false;
      // «Rasgo de alquimista de nivel 3» (Tasha) dice el nivel del rasgo de arriba: no es un título.
      if (LEVEL_LINE.test(l.t)) return false;
      if (/�/.test(l.t) || (l.t.match(/[A-Za-zÁÉÍÓÚÑáéíóúñ ]/g) || []).length < l.t.length * 0.75) return false;
      if (repeated.has(key(l.t))) return false;
      if (l.bh >= bodyAt(l) + 0.5) return true;
      if (l.t.length > 60) return false;
      return l.runs.every(r => r.f !== bodyOf(l)) || (l.t === l.t.toUpperCase() && /[A-ZÁÉÍÓÚÑ]{3}/.test(l.t));
    };
    const style = i => (lines[i].runs[0]?.f || '') + '|' + Math.round(lines[i].bh * 2);
    // Dónde aparece un nombre como título (línea completa) o como nombre de párrafo.
    const index = new Map();
    lines.forEach((l, i) => {
      if (keyAt[i] && isTitle(i)) (index.get(keyAt[i]) || index.set(keyAt[i], []).get(keyAt[i])).push([i, 'title']);
      // Títulos partidos en dos líneas («Canalizar divinidad:» / «Santuario del ocaso»).
      if (keyAt[i] && isTitle(i) && i + 1 < lines.length && isTitle(i + 1) && Math.abs(lines[i + 1].bh - l.bh) < 0.3) {
        const k2 = keyAt[i] + keyAt[i + 1];
        (index.get(k2) || index.set(k2, []).get(k2)).push([i, 'title2']);
      }
      if (inlineAt[i]) (index.get(inlineAt[i]) || index.set(inlineAt[i], []).get(inlineAt[i])).push([i, 'inline']);
    });
    const find = (names, from = 0, to = lines.length) =>
      nameKeys(names)
        .flatMap(k => index.get(k) || [])
        .filter(([i]) => i >= from && i < to)
        .sort((a, b) => a[0] - b[0]);
    // Texto desde un título hasta el próximo del mismo estilo (o uno mayor), o hasta `stop`.
    // Palabras partidas por el reconocimiento de texto («esc uelas», «deta ll adas»): se juntan si juntas
    // forman una palabra que el libro usa y alguna de las partes no lo es.
    const bookWords = new Map();
    for (const l of lines)
      for (const w of l.t.split(/[^A-Za-zÁÉÍÓÚÑáéíóúñü]+/))
        if (w.length >= 3) bookWords.set(key(w), (bookWords.get(key(w)) || 0) + 1);
    const known = w => (bookWords.get(key(w)) || 0) >= 2;
    function rejoin(run) {
      const ws = run.split(' ');
      for (let pass = 0; pass < 2; pass++)
        for (let i = 0; i + 1 < ws.length; i++) {
          const a = ws[i],
            b = ws[i + 1];
          if ((a.length <= 5 || b.length <= 5) && known(a + b) && (!known(a) || !known(b))) {
            ws.splice(i, 2, a + b);
            i--;
          }
        }
      return ws.join(' ');
    }
    // `until`: en vez del estilo del título, se corta solo en un título de ese tamaño o mayor (así entran
    // las tablas que van dentro del rasgo, como «Conjuros adicionales del Insondable»).
    function textFrom(at, how, stop, until) {
      const st = style(at),
        big = lines[at].bh;
      const start = how === 'inline' ? at : at + (how === 'title2' ? 2 : 1);
      const parts = [];
      if (how === 'inline') parts.push(lines[at].t.replace(/^[^.:]{3,70}?\s*[.:]\s+/, ''));
      let end = Math.min(stop ?? lines.length, start + 160);
      for (let j = how === 'inline' ? at + 1 : start; j < end; j++) {
        const l = lines[j];
        if (noise(l)) continue;
        if (isTitle(j) && (until ? l.bh >= until - 0.3 : style(j) === st || l.bh > big + 0.4)) break;
        if (how === 'inline' && inlineAt[j] && l.runs[0]?.f === lines[at].runs[0]?.f) break;
        // Títulos de tabla y filas («1 dormir, fuego feérico»): cada una en su renglón.
        const row = isTitle(j) || /^(\d{1,2}\s|\d{1,2}$|d\d+\b|nivel de\b|level\b)/i.test(l.t);
        parts.push(row ? '¶' + l.t + (isTitle(j) ? '¶' : '') : l.t);
      }
      return mergeSplits(
        parts
          .join(' ')
          .replace(/([a-záéíóúñ])- ([a-záéíóúñ])/gi, '$1$2')
          .replace(/\s+/g, ' ')
          .trim(),
        opts.vocab,
      )
        .replace(/[A-Za-zÁÉÍÓÚÑáéíóúñü]+(?: [A-Za-zÁÉÍÓÚÑáéíóúñü]+)+/g, rejoin)
        .replace(/\s*(¶\s*)+/g, '\n')
        .trim()
        .slice(0, 8000);
    }
    const found = [];
    const add = (t, key, name, at, how, stop, extra = {}) => {
      const text = textFrom(at, how, stop);
      if (text.length >= 20)
        found.push({
          kind: t.kind === 'feat' ? 'feat' : 'feature',
          key,
          source: t.source,
          data: { target: t.kind, ref: t.id, name, text, page: lines[at].page + 1, ...extra },
        });
    };
    // Clases y subclases. El libro se parte en capítulos de clase (el título más grande con el nombre
    // de la clase); dentro, cada subclase es un título con subtítulos (sus rasgos). Los nombres del sitio
    // no siempre son los del libro: la subclase se reconoce por el parecido del nombre y por los niveles
    // de sus rasgos, y cada subtítulo se asigna por nombre o por el nivel que dice su texto.
    // Nombres parecidos: iguales, o el del libro empieza con el del sitio («Habilidad sin par» → «… sin parangón»).
    const close = (a, b) =>
      a === b || (a.length >= 6 && b.startsWith(a)) || (b.length >= 12 && a.startsWith(b) && a.length - b.length <= 4);
    const nameHit = (names, k) => !!k && nameKeys(names).some(n => close(n, k));
    const LEVEL_RE =
      /(?:nive[l1/I|]|level)\s*(1\s?\d|\d{1,2})\b|(\d{1,2})\s*\.?\s*[ºo°]?\s*nivel\b|(\d{1,2})(?:st|nd|rd|th)[\s-]+level/i;
    const levelOf = t => {
      const m = LEVEL_RE.exec(t.slice(0, 260));
      const n = m ? Number(String(m[1] || m[2] || m[3]).replace(/\s/g, '')) : null;
      return n >= 1 && n <= 20 ? n : null;
    };
    const tableLike = l => /nivel de|level|bonificador|\d+\s+\d+\s+\d+/i.test(l.t) && /\d/.test(l.t);
    const nice = t => (t === t.toUpperCase() ? t.charAt(0) + t.slice(1).toLowerCase() : t).replace(/\s+/g, ' ').trim();
    // Palabras que comparten todas las subclases de una clase («Dominio», «Círculo»…): no distinguen.
    const STOP = new Set(
      'de dei deia ia ei ios ias of the y and camino way dominio domain circuio circle coiegio coiiege senda path juramento oath escueia school tradicion tradition arquetipo archetype patron'.split(
        ' ',
      ),
    );
    const words = t =>
      String(t)
        .split(/[^A-Za-zÁÉÍÓÚÑáéíóúñÜü]+/)
        .map(key)
        .filter(w => w.length >= 3 && !STOP.has(w));
    const sim = (names, t) => {
      const tw = words(t),
        tk = key(t);
      let best = 0;
      for (const n of names.filter(Boolean)) {
        const nk = key(n),
          nw = words(n);
        if (close(nk, tk)) return 1;
        const common = nw.filter(w => tw.some(x => close(w, x) || (w.length >= 5 && lev(w, x) <= 1))).length;
        best = Math.max(best, nw.length ? common / Math.max(nw.length, tw.length) : 0);
        // Parecido letra a letra, sin las palabras genéricas («Colegio de los…»), que no distinguen.
        const a = nw.join(''),
          b = tw.join('');
        if (a.length >= 5 && b.length >= 5) best = Math.max(best, 1 - lev(a, b) / Math.max(a.length, b.length) - 0.15);
      }
      return Math.max(0, best);
    };
    const titles = [];
    for (let i = 0; i < lines.length; i++) if (isTitle(i)) titles.push(i);
    // Capítulos de clase: el título más grande con el nombre de la clase.
    const classT = targets.filter(x => x.kind === 'class');
    const chapterHits = [];
    for (const i of titles)
      for (const c of classT)
        if (nameKeys(c.names).some(n => keyAt[i] === n)) chapterHits.push({ i, c, bh: lines[i].bh });
    const chapters = [];
    if (chapterHits.length) {
      const top = Math.max(...chapterHits.map(h => h.bh));
      const big = chapterHits.filter(h => h.bh >= top * 0.85 && h.bh >= body * 1.4).sort((a, b) => a.i - b.i);
      for (const h of big) if (!chapters.some(c => c.c === h.c)) chapters.push({ c: h.c, start: h.i });
      chapters.forEach((c, n) => (c.end = chapters[n + 1]?.start ?? Math.min(lines.length, c.start + 6000)));
    }
    // Secciones candidatas: un título y sus subtítulos (con el nivel de cada uno según su texto).
    // Subtítulo de un rasgo: en mayúsculas o más grande que el texto, sin números (no es una fila de tabla).
    const upper = t => {
      const letters = t.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, '');
      return letters.length >= 3 && letters.replace(/[^A-ZÁÉÍÓÚÑ]/g, '').length >= letters.length * 0.7;
    };
    const subLike = i => {
      const l = lines[i];
      if (!isTitle(i) || tableLike(l) || l.t.length > 70 || !/^[A-Za-zÁÉÍÓÚÑ¡¿]/.test(l.t)) return false;
      if (/\d/.test(l.t.replace(/\(d\d+\)|d\d+/g, ''))) return false;
      if (!upper(l.t) && l.bh < bodyAt(l) + 0.8) return false;
      const next = lines.slice(i + 1, i + 3).find(x => !x.edge);
      return !(next && /^n\s*ivel/i.test(next.t));
    };
    // Mismo estilo de título: mismo tamaño y misma fuente (en otra página la fuente puede tener otro número).
    // Si el PDF numera las fuentes para todo el libro, la fuente decide; si las numera por página
    // (escaneos con texto), solo se puede comparar el tamaño (con margen: varía un poco).
    const fontSet = new Set(lines.flatMap(l => l.runs.map(r => r.f)));
    const pagesN = new Set(lines.map(l => l.page)).size;
    const globalFonts = fontSet.size < pagesN * 1.5;
    const sameStyle = (a, b) => {
      const A = lines[a],
        B = lines[b];
      if (Math.abs(A.bh - B.bh) > Math.max(0.45, A.bh * 0.04) || upper(A.t) !== upper(B.t)) return false;
      const sf = A.runs[0]?.f === B.runs[0]?.f;
      return globalFonts ? sf : sf || A.page !== B.page || Math.abs(A.bh - B.bh) <= 0.25;
    };
    function section(h, limit) {
      const big = lines[h].bh;
      let end = h + 1;
      const max = Math.min(limit ?? lines.length, h + 420);
      while (
        end < max &&
        !(isTitle(end) && (sameStyle(end, h) || lines[end].bh >= big + 2.5) && !tableLike(lines[end]))
      )
        end++;
      const subs = [];
      for (let i = h + 1; i < end; i++) if (!sameStyle(i, h) && subLike(i)) subs.push(i);
      const parts = subs.map((i, n) => {
        const text = textFrom(i, 'title', subs[n + 1] ?? end);
        return { i, text, level: levelOf(text), k: keyAt[i] };
      });
      return { h, end, parts, levels: new Set(parts.map(p => p.level).filter(Boolean)) };
    }
    const regionOf = classId => chapters.find(c => c.c.id === classId);
    const subT = targets.filter(x => x.kind === 'subclass');
    const pairs = [];
    const cands = new Map(); // título → sección
    for (const ch of chapters) {
      const mine = subT.filter(t => t.classId === ch.c.id);
      const sizes = titles.filter(i => i > ch.start && i < ch.end).map(i => lines[i].bh);
      for (const i of titles) {
        if (i <= ch.start || i >= ch.end || lines[i].bh < bodyAt(lines[i]) + 0.8 || /^\d/.test(lines[i].t)) continue;
        const sec = cands.get(i) || section(i, ch.end);
        cands.set(i, sec);
        if (sec.parts.length < 2) continue;
        for (const t of mine) {
          const lv = new Set(t.features.map(f => f.level));
          const inter = [...lv].filter(x => sec.levels.has(x)).length;
          const lvScore = inter / new Set([...lv, ...sec.levels]).size;
          const named = sec.parts.filter(p => t.features.some(f => nameHit(f.names, p.k))).length / t.features.length;
          const sn = sim(t.names, lines[i].t);
          const score = sn * 4 + (sn === 1 ? 3 : 0) + lvScore * 2 + named * 3;
          if (score >= 2.6) pairs.push({ t, i, score, lvScore, sn });
        }
      }
      void sizes;
    }
    const emit = (t, prefix, sec, first) => {
      const feats = t.features;
      const assigned = new Map(feats.map(f => [f, []]));
      let prev = first;
      for (const p of sec.parts) {
        let f = feats.find(x => nameHit(x.names, p.k) || x.children.some(c => nameHit([c], p.k)));
        if (!f && p.level !== null) {
          const same = feats.filter(x => x.level === p.level);
          const title = p.title || lines[p.i].t;
          const ranked = same
            .map((x, n) => ({ x, sc: sim(x.names, title) * 2 + (assigned.get(x).length ? 0 : 1) - n * 0.01 }))
            .sort((a, b) => b.sc - a.sc);
          f = ranked[0]?.x || null;
          if (!f && first && p.level <= first.level) f = first;
          if (!f) f = prev; // nivel que el sitio no lista por separado: va con el rasgo anterior
        } else if (!f) f = prev;
        if (!f) continue;
        const child = f.children.find(c => nameHit([c], p.k));
        assigned.get(f).push({ ...p, title: nice(p.title || lines[p.i].t), child });
        prev = f;
      }
      for (const f of feats) {
        const parts = assigned.get(f);
        if (!parts.length) continue;
        const text =
          parts.length === 1 && nameHit(f.names, parts[0].k)
            ? parts[0].text
            : parts.map(p => p.title + '. ' + p.text).join('\n\n');
        if (text.length < 20) continue;
        found.push({
          kind: 'feature',
          key: prefix + t.id + ':' + f.en,
          source: f.source || t.source,
          data: {
            target: t.kind,
            ref: t.id,
            name: f.names[0],
            feature: f.en,
            level: f.level,
            text,
            page: lines[parts[0].i].page + 1,
          },
        });
        for (const p of parts.filter(x => x.child))
          found.push({
            kind: 'feature',
            key: prefix + t.id + ':' + f.en + '/' + p.child,
            source: f.source || t.source,
            data: {
              target: t.kind,
              ref: t.id,
              name: p.child,
              feature: f.en,
              child: p.child,
              level: f.level,
              text: p.text,
              page: lines[p.i].page + 1,
            },
          });
      }
    };
    // Asignación: primero las parejas más seguras; un título y una subclase se usan una sola vez.
    const usedT = new Set(),
      usedI = new Set(),
      chosen = [];
    // Libros como el de Tasha: cada rasgo lleva debajo «Rasgo de alquimista de nivel 3», que dice de
    // quién es y su nivel. Se agrupan por ese nombre.
    const LV2 =
      /^rasgo (?:de|del) (.{2,60}?) (?:de|del) nive[l1/I|]\s*([\dlI]{1,2})\b|^(\d{1,2})(?:st|nd|rd|th)[\s-]+level (.{2,60}?) feature/i;
    const groups = new Map();
    const lvLines = [];
    lines.forEach((l, i) => {
      const m = LV2.exec(l.t);
      if (!m || l.t.length > 90) return;
      let at = i - 1;
      while (at > i - 4 && at >= 0 && (lines[at].edge || !lines[at].t.trim())) at--;
      if (at < 0 || lines[at].edge) return;
      // Título en dos líneas («CANALIZAR DIVINIDAD:» / «SANTUARIO DEL CREPÚSCULO»).
      let t0 = at;
      if (
        at > 0 &&
        isTitle(at - 1) &&
        Math.abs(lines[at - 1].bh - lines[at].bh) < 0.3 &&
        /[:,]$|^[A-ZÁÉÍÓÚÑ ]+$/.test(lines[at - 1].t)
      )
        t0 = at - 1;
      const title = lines
        .slice(t0, at + 1)
        .map(x => x.t)
        .join(' ');
      const level = Number(String(m[2] || m[3]).replace(/[lI]/g, '1'));
      const who = (m[1] || m[4]).trim();
      lvLines.push({ i, t0, title, level, who, k: key(title) });
    });
    lvLines.forEach((x, n) => {
      const stop = lvLines[n + 1]?.t0 ?? Math.min(lines.length, x.i + 120);
      x.text = textFrom(x.i, 'title', stop, lines[x.t0].bh);
      const g = key(x.who);
      if (!groups.has(g)) groups.set(g, { who: x.who, parts: [] });
      groups.get(g).parts.push(x);
    });
    const classByKey = new Map(classT.flatMap(c => nameKeys(c.names).map(k => [k, c])));
    // Cada grupo de subclase pertenece a la última clase que apareció antes en el libro.
    let lastClass = null;
    const subGroups = [];
    for (const [g, gr] of groups) {
      const cls = classByKey.get(g) || [...classByKey].find(([k]) => k.length >= 5 && lev(k, g) <= 1)?.[1];
      if (cls) {
        lastClass = cls;
        if (!usedT.has(cls)) {
          usedT.add(cls);
          emit(cls, 'class:', { parts: gr.parts }, null);
        }
        continue;
      }
      subGroups.push({ g, gr, cls: lastClass });
    }
    const groupScore = (t, gr) => {
      const lv = new Set(t.features.map(f => f.level)),
        glv = new Set(gr.parts.map(p => p.level));
      const lvScore = [...lv].filter(x => glv.has(x)).length / new Set([...lv, ...glv]).size;
      const named =
        gr.parts.filter(p => t.features.some(f => nameHit(f.names, p.k))).length / Math.max(1, t.features.length);
      return { sc: sim(t.names, gr.who), lvScore, named };
    };
    const usedG = new Set();
    const assignGroups = (minSim, srcs) => {
      const opts3 = [];
      for (const sg of subGroups) {
        if (usedG.has(sg.g)) continue;
        for (const t of subT) {
          if (usedT.has(t) || (sg.cls && t.classId !== sg.cls.id) || (srcs && !srcs.has(t.source))) continue;
          const { sc, lvScore, named } = groupScore(t, sg.gr);
          if (sc >= minSim || (srcs && lvScore >= 0.6)) opts3.push({ t, sg, score: sc * 4 + lvScore * 2 + named * 3 });
        }
      }
      for (const p of opts3.sort((a, b) => b.score - a.score)) {
        if (usedT.has(p.t) || usedG.has(p.sg.g)) continue;
        usedT.add(p.t);
        usedG.add(p.sg.g);
        emit(p.t, 'sub:', { parts: p.sg.gr.parts }, p.t.features[0]);
        assignGroups.got[p.t.source] = (assignGroups.got[p.t.source] || 0) + 1;
      }
    };
    assignGroups.got = {};
    assignGroups(0.5, null);
    // Segunda vuelta: lo que quedó, solo con subclases de los libros que este PDF ya mostró ser.
    assignGroups(9, new Set(Object.keys(assignGroups.got).filter(k => assignGroups.got[k] >= 2)));
    for (const p of pairs.sort((a, b) => b.score - a.score)) {
      if (usedT.has(p.t) || usedI.has(p.i)) continue;
      // Un título dentro de la sección de otra subclase ya elegida es un subtítulo, no otra subclase.
      // (Salvo que tenga justo el nombre de la subclase: entonces la otra sección termina ahí.)
      if (p.sn < 1 && chosen.some(c => p.i > c.i && p.i < cands.get(c.i).end)) continue;
      usedT.add(p.t);
      usedI.add(p.i);
      chosen.push(p);
    }
    // Libros sin capítulos por clase (Ravenloft, Dragonlance…): un título con el nombre exacto de la
    // subclase, con subtítulos y niveles que corresponden.
    for (const t of subT) {
      if (usedT.has(t)) continue;
      let best = null;
      for (const i of titles) {
        if (usedI.has(i) || lines[i].bh < bodyAt(lines[i]) + 0.8) continue;
        // «BARDO: COLEGIO DE LOS ESPÍRITUS»: la clase antes de los dos puntos.
        const [pre, post] = lines[i].t.includes(':') ? lines[i].t.split(/:(.*)/s) : ['', lines[i].t];
        const cls = classT.find(c => c.id === t.classId);
        const named =
          nameKeys(t.names).some(n => close(n, keyAt[i]) || close(n, key(post))) ||
          (pre && cls && nameKeys(cls.names).includes(key(pre)) && sim(t.names, post) >= 0.5);
        if (!named) continue;
        if (chosen.some(c => i > c.i && i < cands.get(c.i).end)) continue;
        const sec = cands.get(i) || section(i);
        cands.set(i, sec);
        const lv = new Set(t.features.map(f => f.level));
        const lvScore = [...lv].filter(x => sec.levels.has(x)).length / new Set([...lv, ...sec.levels]).size;
        if (sec.parts.length >= 2 && lvScore >= 0.5 && (!best || lvScore > best.lvScore))
          best = { t, i, lvScore, sn: 1 };
      }
      if (best) {
        usedT.add(t);
        usedI.add(best.i);
        chosen.push(best);
      }
    }
    // Nombres que no se parecen («Ocaso» / «Crepúsculo»): en cada capítulo, los títulos con el mismo estilo
    // que las subclases ya reconocidas y los niveles que corresponden, para las subclases de este libro.
    {
      const per = {};
      for (const p of chosen) per[p.t.source] = (per[p.t.source] || 0) + 1;
      const bookSrc = new Set(Object.keys(per).filter(k => per[k] >= 2));
      for (const ch of chapters) {
        const refs = chosen.filter(p => p.i > ch.start && p.i < ch.end).map(p => p.i);
        if (!refs.length) continue;
        const rest = subT.filter(t => t.classId === ch.c.id && !usedT.has(t) && bookSrc.has(t.source));
        const free = [...cands.keys()].filter(
          i =>
            i > ch.start &&
            i < ch.end &&
            !usedI.has(i) &&
            cands.get(i).parts.length >= 2 &&
            refs.some(r => sameStyle(r, i)) &&
            !chosen.some(c => i > c.i && i < cands.get(c.i).end),
        );
        const opts2 = [];
        for (const t of rest)
          for (const i of free) {
            const sec = cands.get(i),
              lv = new Set(t.features.map(f => f.level));
            const lvScore = [...lv].filter(x => sec.levels.has(x)).length / new Set([...lv, ...sec.levels]).size;
            if (lvScore >= 0.6) opts2.push({ t, i, score: lvScore * 2 + sim(t.names, lines[i].t) * 4 });
          }
        for (const p of opts2.sort((a, b) => b.score - a.score)) {
          if (usedT.has(p.t) || usedI.has(p.i)) continue;
          usedT.add(p.t);
          usedI.add(p.i);
          chosen.push(p);
        }
      }
    }
    // Una sección termina donde empieza la de otra subclase elegida.
    const starts = chosen.map(p => p.i).sort((a, b) => a - b);
    for (const p of chosen) {
      const sec = cands.get(p.i);
      const limit = starts.find(x => x > p.i) ?? Infinity;
      const parts = sec.parts.filter(x => x.i < limit);
      if (parts.length && limit < sec.end) {
        const last = parts[parts.length - 1];
        parts[parts.length - 1] = { ...last, text: textFrom(last.i, 'title', limit) };
      }
      emit(p.t, 'sub:', { ...sec, parts }, p.t.features[0]);
    }
    // Rasgos de la clase: en su capítulo, antes de la primera subclase.
    for (const ch of chapters) {
      const firstSub = Math.min(ch.end, ...chosen.filter(p => p.i > ch.start && p.i < ch.end).map(p => p.i));
      const parts = [];
      const subs = titles.filter(
        i => i > ch.start && i < firstSub && lines[i].bh < lines[ch.start].bh - 0.3 && !tableLike(lines[i]),
      );
      subs.forEach((i, n) => {
        const text = textFrom(i, 'title', subs[n + 1] ?? firstSub);
        parts.push({ i, text, level: levelOf(text), k: keyAt[i] });
      });
      if (usedT.has(ch.c)) continue;
      // Solo los subtítulos con el nombre de un rasgo (en la introducción de la clase hay de todo).
      emit(
        { ...ch.c, features: ch.c.features },
        'class:',
        {
          parts: parts.filter(p =>
            ch.c.features.some(f => nameHit(f.names, p.k) || f.children.some(c => nameHit([c], p.k))),
          ),
        },
        null,
      );
    }
    void regionOf;
    // Opciones (invocaciones, maniobras, infusiones…) y dotes: el nombre como título o párrafo.
    const optT = targets.filter(x => x.kind === 'option' || x.kind === 'feat');
    const hitOf = new Map();
    const usedAt = new Set();
    for (const t of optT) {
      const hits = find(t.names);
      if (!hits.length) continue;
      // Si aparece varias veces, el que trae un requisito o el texto más largo.
      let best = null;
      for (const [i, how] of hits.slice(0, 12)) {
        const text = textFrom(i, how);
        const score = text.length + (/^(prerrequisito|requisito|prerequisite)/i.test(text) ? 5000 : 0);
        if (!best || score > best.score) best = { i, how, score };
      }
      hitOf.set(t, best);
      usedAt.add(best.i);
    }
    // Las que no coinciden: la lista del libro donde están sus compañeras (mismo tipo y libro), con el
    // mismo estilo, y el nombre más parecido.
    const groupsO = new Map();
    for (const t of optT) {
      const g = t.kind + '|' + t.source + '|' + t.group;
      if (!groupsO.has(g)) groupsO.set(g, []);
      groupsO.get(g).push(t);
    }
    const entryName = (i, how) =>
      how === 'inline' ? /^([^.:]{3,70}?)\s*[.:]\s+/.exec(lines[i].t)?.[1] || '' : lines[i].t;
    for (const list of groupsO.values()) {
      const anchors = list.map(t => hitOf.get(t)).filter(Boolean);
      const rest = list.filter(t => !hitOf.has(t));
      if (anchors.length < 2 || !rest.length) continue;
      const how = anchors.filter(a => a.how === 'inline').length > anchors.length / 2 ? 'inline' : 'title';
      const ref = anchors.find(a => (a.how === 'inline') === (how === 'inline'));
      const idx = anchors.map(a => a.i).sort((a, b) => a - b);
      const from = Math.max(0, idx[0] - 80),
        to = Math.min(lines.length, idx[idx.length - 1] + 200);
      const entries = [];
      for (let i = from; i < to; i++) {
        if (usedAt.has(i)) continue;
        if (
          how === 'inline'
            ? inlineAt[i] && lines[i].runs[0]?.f === lines[ref.i].runs[0]?.f
            : isTitle(i) && sameStyle(i, ref.i)
        )
          entries.push(i);
      }
      const opts4 = [];
      for (const t of rest)
        for (const i of entries) {
          const sc = sim(t.names, entryName(i, how));
          // Un nombre de una sola palabra necesita parecerse mucho («Cargador» no es «Escurridizo»).
          if (sc >= (words(t.names[0]).length <= 1 ? 0.7 : 0.5)) opts4.push({ t, i, sc });
        }
      for (const p of opts4.sort((a, b) => b.sc - a.sc)) {
        if (hitOf.has(p.t) || usedAt.has(p.i)) continue;
        hitOf.set(p.t, { i: p.i, how });
        usedAt.add(p.i);
      }
    }
    for (const [t, best] of hitOf)
      add(
        t,
        (t.kind === 'feat' ? 'feat:' : 'opt:') + t.id,
        t.names[0],
        best.i,
        best.how,
        undefined,
        t.group ? { group: t.group } : {},
      );
    // Solo los libros que este PDF es: un libro cuenta si se encontró una buena parte de lo suyo.
    const total = {},
      got = {};
    for (const t of targets) total[t.source] = (total[t.source] || 0) + 1 + (t.features?.length || 0);
    for (const f of found) got[f.source] = (got[f.source] || 0) + 1;
    const sources = Object.keys(got).filter(k => got[k] >= 4 && got[k] >= total[k] * 0.15);
    // Rasgos de subclase (comprobados por sección y niveles) valen con menos; opciones y dotes sueltas no.
    const subGot = {};
    for (const f of found) if (f.data.target === 'subclass') subGot[f.source] = (subGot[f.source] || 0) + 1;
    const ok = f => sources.includes(f.source) || (f.data.target === 'subclass' && subGot[f.source] >= 2);
    const seen = new Set();
    return found
      .filter(f => ok(f) && !seen.has(f.key) && seen.add(f.key))
      .map(f => ({ ...f, data: { ...f.data, id: f.key.slice(0, 160), source: f.source } }));
  }

  const detectLang = lines => {
    let es = 0,
      en = 0;
    for (const l of lines.slice(0, 4000)) {
      if (/clase de armadura|tiempo de lanzamiento|puntos de golpe/i.test(l.t)) es++;
      if (/armor class|casting time|hit points/i.test(l.t)) en++;
    }
    return en > es ? 'en' : 'es';
  };
  // Páginas con texto que no se puede leer: la fuente del PDF no trae sus letras (solo salen tildes
  // y signos sueltos). Pasa en algunas copias; esas páginas necesitan otra copia o reconocimiento de texto.
  const unreadablePages = pages => {
    const out = [];
    pages.forEach((p, i) => {
      const s = (p.items || []).map(it => it.s || '').join('');
      const chars = s.replace(/\s/g, '').length;
      if (chars < 150) return;
      const letters = (s.match(/[a-z0-9]/gi) || []).length;
      if (letters / chars < 0.3) out.push(i + 1);
    });
    return out;
  };

  const api = {
    clean,
    key,
    vocabulary,
    mergeSplits,
    pageLines,
    readLines,
    parseTypeLine,
    parseCR,
    parseAbilities,
    parseAction,
    shortSaves,
    monsters,
    spells,
    items,
    ruleTargets,
    rules,
    parseSchoolLine,
    detectLang,
    unreadablePages,
    fixDigits,
    niceName,
    slug,
  };
  if (typeof module !== 'undefined') module.exports = api;
  root.LibraryCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
