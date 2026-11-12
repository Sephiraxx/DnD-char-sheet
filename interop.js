/* Entrada y salida hacia otras herramientas.
   - fromDDB: lee el JSON de un personaje de D&D Beyond y arma un borrador para el creador
     (clase, raza, trasfondo, características, personalidad) más la lista de lo que hay que completar a mano.
   - toFoundry: actor del sistema dnd5e de Foundry VTT (para «Import Data»).
   - toRoll20: personaje en el formato de la extensión VTT Enhancement Suite, para la hoja «D&D 5E by Roll20».
   Lógica sin navegador; los datos de la app llegan por parámetro. */
(function (root) {
  'use strict';
  const norm = t =>
    String(t || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  const words = t => norm(t).split(' ').filter(Boolean);
  const text = (v, max) =>
    String(v ?? '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/[ \t]+/g, ' ')
      .trim()
      .slice(0, max);
  const ABIL = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  const ALIGN = [
    '',
    'Legal bueno',
    'Neutral bueno',
    'Caótico bueno',
    'Legal neutral',
    'Neutral',
    'Caótico neutral',
    'Legal malvado',
    'Neutral malvado',
    'Caótico malvado',
  ];
  // Habilidades: clave de la app → nombre en D&D Beyond, Foundry y Roll20.
  const SKILLS = {
    acrobatics: ['acrobatics', 'acr', 'acrobatics'],
    animal: ['animal-handling', 'ani', 'animal_handling'],
    arcana: ['arcana', 'arc', 'arcana'],
    athletics: ['athletics', 'ath', 'athletics'],
    deception: ['deception', 'dec', 'deception'],
    history: ['history', 'his', 'history'],
    insight: ['insight', 'ins', 'insight'],
    intimidation: ['intimidation', 'itm', 'intimidation'],
    investigation: ['investigation', 'inv', 'investigation'],
    medicine: ['medicine', 'med', 'medicine'],
    nature: ['nature', 'nat', 'nature'],
    perception: ['perception', 'prc', 'perception'],
    performance: ['performance', 'prf', 'performance'],
    persuasion: ['persuasion', 'per', 'persuasion'],
    religion: ['religion', 'rel', 'religion'],
    sleight: ['sleight-of-hand', 'slt', 'sleight_of_hand'],
    stealth: ['stealth', 'ste', 'stealth'],
    survival: ['survival', 'sur', 'survival'],
  };

  // ---------- D&D Beyond → borrador del creador ----------
  // data: { classes: { id: { english, name } }, races: [{ id, english, name, source }], backgrounds: [...], sources?: [claves habilitadas] }
  function fromDDB(json, data) {
    const c = json?.data?.classes ? json.data : json;
    if (!c || typeof c !== 'object' || !Array.isArray(c.classes) || !Array.isArray(c.stats))
      throw Error('Ese archivo no parece un personaje de D&D Beyond.');
    const matched = [],
      missing = [],
      draft = { name: text(c.name, 100) || 'Personaje importado', method: 'manual', applyRacial: true };
    if (draft.name) matched.push('Nombre: ' + draft.name);

    // Clase: la de más nivel. El creador arma una sola clase; el resto se sube después.
    const classes = c.classes
        .map(x => ({
          name: x?.definition?.name || '',
          sub: x?.subclassDefinition?.name || '',
          level: Number(x?.level) || 0,
        }))
        .filter(x => x.name)
        .sort((a, b) => b.level - a.level),
      total = classes.reduce((a, x) => a + x.level, 0),
      main = classes[0],
      cls = main && Object.entries(data.classes || {}).find(([, v]) => norm(v.english || v.name) === norm(main.name));
    if (cls) {
      draft.classId = cls[0];
      matched.push(`Clase: ${cls[1].name || main.name}`);
    } else if (main) missing.push(`Clase «${main.name}»: elegila a mano.`);
    draft.level = Math.max(1, Math.min(20, total || 1));
    if (classes.length > 1)
      missing.push(
        `Multiclase (${classes.map(x => `${x.name} ${x.level}`).join(' / ')}): el creador arma ${main.name}; sumá las otras clases desde «Clase» al terminar.`,
      );
    if (main?.sub) missing.push(`Subclase «${main.sub}»: elegila en el paso de clase o al subir de nivel.`);

    // Raza: «High Elf» ↔ «Elf (High)». Coinciden si usan las mismas palabras; si hay varias, gana la del Manual.
    const raceName =
        c.race?.fullName ||
        [c.race?.subRaceShortName, c.race?.baseName || c.race?.baseRaceName].filter(Boolean).join(' '),
      want = words(raceName).sort().join(' '),
      enabled = r => !data.sources || data.sources.includes(r.source),
      races = (data.races || []).filter(r => words(r.english).sort().join(' ') === want),
      race = races.find(r => r.source === 'PHB' && enabled(r)) || races.find(enabled) || races[0];
    if (race) {
      draft.raceId = race.id;
      matched.push(`Raza: ${race.name}`);
    } else if (raceName) missing.push(`Raza «${raceName}»: elegila a mano.`);

    const bgName = c.background?.definition?.name || '',
      bgs = (data.backgrounds || []).filter(b => norm(b.english) === norm(bgName)),
      bg = bgs.find(b => /PHB/.test(b.id)) || bgs[0];
    if (bg) {
      draft.backgroundId = bg.id;
      matched.push(`Trasfondo: ${bg.name}`);
    } else if (bgName) missing.push(`Trasfondo «${bgName}»: elegilo a mano o usá uno personalizado.`);

    // Características base (antes de los bonos de raza, que el creador vuelve a aplicar).
    const base = {};
    ABIL.forEach((k, i) => {
      const over = (c.overrideStats || []).find(s => s.id === i + 1)?.value,
        v = Number(over ?? (c.stats || []).find(s => s.id === i + 1)?.value);
      base[k] = Number.isFinite(v) && v > 0 ? Math.max(1, Math.min(20, Math.round(v))) : 10;
    });
    draft.base = base;
    matched.push('Características base: ' + ABIL.map(k => base[k]).join(', '));

    // Competencias e idiomas: se listan para marcarlas en su paso.
    const mods = Object.values(c.modifiers || {})
        .flat()
        .filter(Boolean),
      skillOf = sub => Object.keys(SKILLS).find(k => SKILLS[k][0] === sub),
      skills = [
        ...new Set(mods.filter(m => m.type === 'proficiency' && skillOf(m.subType)).map(m => skillOf(m.subType))),
      ],
      expertise = [
        ...new Set(mods.filter(m => m.type === 'expertise' && skillOf(m.subType)).map(m => skillOf(m.subType))),
      ],
      languages = [
        ...new Set(mods.filter(m => m.type === 'language').map(m => text(m.friendlySubtypeName || m.subType, 40))),
      ].filter(Boolean);
    if (languages.length) {
      draft.languages = languages.join(', ').slice(0, 300);
      matched.push('Idiomas: ' + draft.languages);
    }

    // Personalidad, apariencia e historia.
    const p = {},
      put = (k, v, max) => {
        const t = text(v, max);
        if (t) p[k] = t;
      };
    if (ALIGN[c.alignmentId]) p.alignment = ALIGN[c.alignmentId];
    put('traits', c.traits?.personalityTraits, 1000);
    put('ideals', c.traits?.ideals, 1000);
    put('bonds', c.traits?.bonds, 1000);
    put('flaws', c.traits?.flaws, 1000);
    put('appearance', c.traits?.appearance, 2000);
    put('backstory', c.notes?.backstory, 8000);
    put('allies', c.notes?.allies, 2000);
    put('age', c.age, 40);
    put('height', c.height, 40);
    put('weight', c.weight, 40);
    put('eyes', c.eyes, 40);
    put('hair', c.hair, 40);
    put('skin', c.skin, 40);
    put('deity', c.faith, 80);
    if (Object.keys(p).length) {
      draft.persona = p;
      matched.push('Personalidad, apariencia e historia');
    }

    // Lo que el creador decide con sus propias reglas: se informa para copiarlo.
    const spells = [
        ...new Set(
          [...(c.classSpells || []).flatMap(x => x.spells || []), ...Object.values(c.spells || {}).flat()]
            .map(s => s?.definition?.name)
            .filter(Boolean),
        ),
      ],
      items = (c.inventory || [])
        .map(i => `${i?.definition?.name || '?'}${i.quantity > 1 ? ' ×' + i.quantity : ''}`)
        .filter(x => x !== '?'),
      cur = c.currencies || {},
      gp =
        Math.round(
          ((cur.cp || 0) / 100 + (cur.sp || 0) / 10 + (cur.ep || 0) / 2 + (cur.gp || 0) + (cur.pp || 0) * 10) * 100,
        ) / 100,
      hp = Number(c.overrideHitPoints) || (Number(c.baseHitPoints) || 0) + (Number(c.bonusHitPoints) || 0);
    if (skills.length) {
      const label = key => data.skillNames?.[key] || key;
      missing.push(
        'Habilidades en D&D Beyond: ' +
          skills.map(label).join(', ') +
          (expertise.length ? ` (pericia: ${expertise.map(label).join(', ')})` : '') +
          '.',
      );
    }
    if (spells.length)
      missing.push(`Conjuros (${spells.length}): ${spells.slice(0, 40).join(', ')}${spells.length > 40 ? '…' : ''}.`);
    if (items.length)
      missing.push(`Equipo (${items.length}): ${items.slice(0, 40).join(', ')}${items.length > 40 ? '…' : ''}.`);
    if (gp) missing.push(`Monedas: ${gp} po en total.`);
    if (hp) missing.push(`Puntos de golpe en D&D Beyond: ${hp} (sin el modificador de Constitución).`);
    return { draft, matched, missing, skills, expertise, spells, items };
  }

  // ---------- Datos comunes para exportar ----------
  // view: lo que calculan las reglas de la app sobre la ficha (lo arma interop-ui.js).
  //   { name, classes: [{ id, english, level, sub }], race, background, scores, saves: [abil], skills: { key: 0|1|2 },
  //     hp, maxHp, temp, ac, speed, prof, gold, languages: [], persona, spells: [{ name, level, prepared }], items: [{ name, qty, weight, notes }] }
  const mod = v => Math.floor((v - 10) / 2);
  const bio = v =>
    [
      v.persona?.backstory,
      v.persona?.appearance && 'Apariencia: ' + v.persona.appearance,
      v.persona?.allies && 'Aliados: ' + v.persona.allies,
    ]
      .filter(Boolean)
      .join('\n\n');

  // ---------- Foundry VTT (sistema dnd5e) ----------
  function toFoundry(v) {
    const esc = t => String(t || '').replace(/[&<>]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[ch]),
      html = t =>
        t
          ? esc(t)
              .split(/\n{2,}/)
              .map(par => `<p>${par.replace(/\n/g, '<br>')}</p>`)
              .join('')
          : '';
    const abilities = {};
    for (const k of ABIL) abilities[k] = { value: v.scores[k], proficient: v.saves.includes(k) ? 1 : 0 };
    const skills = {};
    for (const [key, [, f]] of Object.entries(SKILLS)) skills[f] = { value: v.skills[key] || 0 };
    const items = [
      ...v.classes.map(c => ({
        name: c.english || c.id,
        type: 'class',
        system: {
          identifier: norm(c.english || c.id).replace(/ /g, '-'),
          levels: c.level,
          description: { value: c.sub ? `<p>${esc(c.sub)}</p>` : '' },
        },
      })),
      ...v.spells.map(s => ({
        name: s.name,
        type: 'spell',
        system: {
          level: s.level,
          preparation: { mode: s.level ? 'prepared' : 'always', prepared: !!s.prepared },
          description: { value: '' },
        },
      })),
      ...v.items.map(i => ({
        name: i.name,
        type: 'loot',
        system: {
          quantity: i.qty || 1,
          description: { value: html([i.notes, i.weight ? `Peso: ${i.weight} lb` : ''].filter(Boolean).join('\n')) },
        },
      })),
    ];
    return {
      name: v.name,
      type: 'character',
      system: {
        abilities,
        attributes: {
          hp: { value: v.hp, max: v.maxHp, temp: v.temp || 0 },
          movement: { walk: v.speed, units: 'ft' },
          prof: v.prof,
        },
        details: {
          biography: { value: html(bio(v)) },
          alignment: v.persona?.alignment || '',
          race: v.race || '',
          background: v.background || '',
          appearance: v.persona?.appearance || '',
          trait: v.persona?.traits || '',
          ideal: v.persona?.ideals || '',
          bond: v.persona?.bonds || '',
          flaw: v.persona?.flaws || '',
        },
        skills,
        currency: {
          pp: v.gold.pp || 0,
          gp: v.gold.gp || 0,
          ep: v.gold.ep || 0,
          sp: v.gold.sp || 0,
          cp: v.gold.cp || 0,
        },
        traits: { languages: { value: [], custom: v.languages.join('; ') } },
      },
      items,
      flags: { 'cuaderno-de-aventura': { exported: true, ac: v.ac } },
    };
  }

  // ---------- Roll20 (hoja «D&D 5E by Roll20», formato de VTT Enhancement Suite) ----------
  function toRoll20(v) {
    const attribs = [],
      add = (name, current, max = '') =>
        attribs.push({ name, current: String(current ?? ''), max: String(max ?? ''), id: '' }),
      FULL = {
        str: 'strength',
        dex: 'dexterity',
        con: 'constitution',
        int: 'intelligence',
        wis: 'wisdom',
        cha: 'charisma',
      },
      main = v.classes[0] || {},
      level = v.classes.reduce((a, c) => a + c.level, 0);
    add('npc', 0);
    add('class', main.english || main.id || '');
    add('subclass', main.sub || '');
    add('base_level', main.level || level);
    add('level', level);
    add('class_display', v.classes.map(c => `${c.english || c.id} ${c.level}`).join(' / '));
    add('race', v.race || '');
    add('race_display', v.race || '');
    add('background', v.background || '');
    add('alignment', v.persona?.alignment || '');
    add('pb', v.prof);
    for (const k of ABIL) {
      add(FULL[k], v.scores[k]);
      add(FULL[k] + '_base', v.scores[k]);
      add(FULL[k] + '_mod', mod(v.scores[k]));
      if (v.saves.includes(k)) add(FULL[k] + '_save_prof', '(@{pb})');
    }
    for (const [key, [, , r]] of Object.entries(SKILLS)) {
      if (v.skills[key]) add(r + '_prof', `(@{pb}*@{${r}_type})`);
      add(r + '_type', v.skills[key] === 2 ? 2 : 1);
    }
    add('hp', v.hp, v.maxHp);
    add('hp_temp', v.temp || 0);
    add('ac', v.ac);
    add('speed', v.speed);
    for (const k of ['cp', 'sp', 'ep', 'gp', 'pp']) add(k, v.gold[k] || 0);
    add('personality_traits', v.persona?.traits || '');
    add('ideals', v.persona?.ideals || '');
    add('bonds', v.persona?.bonds || '');
    add('flaws', v.persona?.flaws || '');
    add('character_appearance', v.persona?.appearance || '');
    add('character_backstory', v.persona?.backstory || '');
    add('allies_and_organizations', v.persona?.allies || '');
    add('age', v.persona?.age || '');
    add('height', v.persona?.height || '');
    add('weight', v.persona?.weight || '');
    add('eyes', v.persona?.eyes || '');
    add('hair', v.persona?.hair || '');
    add('skin', v.persona?.skin || '');
    add('other_proficiencies_and_languages', v.languages.join(', '));
    // Equipo y conjuros como texto: las listas repetibles de la hoja necesitan identificadores que crea Roll20.
    add(
      'treasure',
      [
        v.items.length && 'Equipo: ' + v.items.map(i => i.name + (i.qty > 1 ? ' ×' + i.qty : '')).join(', '),
        v.spells.length && 'Conjuros: ' + v.spells.map(s => s.name).join(', '),
      ]
        .filter(Boolean)
        .join('\n\n'),
    );
    return {
      schema_version: 2,
      name: v.name,
      avatar: '',
      bio: bio(v),
      gmnotes: '',
      defaulttoken: '',
      tags: '[]',
      controlledby: '',
      inplayerjournals: '',
      attribs,
      abilities: [],
    };
  }
  const api = { SKILLS, ALIGN, fromDDB, toFoundry, toRoll20 };
  if (typeof module !== 'undefined') module.exports = api;
  root.Interop = api;
})(typeof window !== 'undefined' ? window : globalThis);
