/* Shared grants: official origins, feats, selected class options and subclass spell choices. */
(function (root) {
  'use strict';
  const norm = x =>
      String(x || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, ''),
    unique = x => [...new Set(x)],
    pick = (s, key) => s.grantChoices?.[key] || {},
    allSpells = () => root.Catalog.spells,
    lookup = name =>
      allSpells().find(
        sp =>
          norm(sp.english || sp.name) === norm(String(name).split(/[|#]/)[0]) ||
          norm(sp.id) === norm(String(name).split(/[|#]/)[0]),
      ),
    featId = name => root.Catalog.feats.find(f => norm(f.english || f.name) === norm(String(name).split('|')[0]))?.id,
    manualFeats = s => s.progression?.learnedFeats || [],
    originRows = s =>
      [
        ['race', root.CampaignData.races.find(r => r.id === s.raceId)],
        ['background', root.CampaignData.backgrounds.find(b => b.id === s.backgroundId)],
      ].filter(([, r]) => r),
    choicesKey = (kind, row) => kind + ':' + row.id;
  function featPlan(s, kind, row) {
    const rows = row.feats || [],
      options = unique(
        rows
          .flatMap(r =>
            Object.keys(r)
              .filter(k => r[k] === true)
              .map(featId),
          )
          .filter(Boolean),
      ),
      any = rows.some(r => r.any),
      count = Math.max(1, ...rows.map(r => Number(r.any) || 0)),
      fixed = rows.length === 1 && !any ? options : [],
      allowed = any
        ? root.Catalog.feats
            .filter(
              f =>
                !root.Campaign ||
                root.Campaign.enabled(s, f) ||
                (pick(s, choicesKey(kind, row)).feats || []).includes(f.id),
            )
            .map(f => f.id)
        : options,
      selected = fixed.length
        ? fixed
        : (pick(s, choicesKey(kind, row)).feats || []).filter(id => allowed.includes(id)).slice(0, count);
    return { fixed, allowed, count, selected, needed: rows.length > 0 && selected.length < (fixed.length || count) };
  }
  const originFeats = s => unique(originRows(s).flatMap(([kind, row]) => featPlan(s, kind, row).selected)),
    feats = s => unique([...manualFeats(s), ...originFeats(s)]);
  function optionPlan(s, source) {
    const types = { 'eldritch-adept': 'EI', 'fighting-initiate': 'FS:F', 'martial-adept': 'MV:B' },
      type = types[source.id];
    if (!type) return null;
    const count = source.id === 'martial-adept' ? 2 : 1,
      warlock = root.Classes.views(s).some(v => v.classId === 'warlock'),
      allowed = root.ClassData.options
        .filter(
          o =>
            o.types.includes(type) &&
            o.level <= root.Rules.totalLevel(s) &&
            (!root.Campaign || root.Campaign.enabled(s, o)) &&
            (type !== 'EI' || !o.prerequisite?.length || warlock),
        )
        .map(o => o.id),
      selected = (pick(s, source.key).options || []).filter(id => allowed.includes(id)).slice(0, count);
    return { allowed, selected, count, needed: selected.length < count };
  }
  const optionIds = s => feats(s).flatMap(id => optionPlan(s, { id, key: 'feat:' + id })?.selected || []);
  // Benefits embedded in prose rather than the reference's structured grant fields.
  const subclassProficiencies = {
    'bard-college-of-lore': [3, { skillProficiencies: [{ any: 3 }] }],
    'cleric-arcana-domain': [1, { skillProficiencies: [{ arcana: true }] }],
    'cleric-knowledge-domain': [
      1,
      {
        skillProficiencies: [{ choose: { from: ['arcana', 'history', 'nature', 'religion'], count: 2 } }],
        languageProficiencies: [{ any: 2 }],
        expertiseFromSkills: true,
      },
    ],
    'cleric-nature-domain': [
      1,
      {
        skillProficiencies: [{ choose: { from: ['animal handling', 'nature', 'survival'] } }],
        armorProficiencies: [{ heavy: true }],
      },
    ],
    'cleric-death-domain': [1, { weaponProficiencies: [{ martial: true }] }],
    'cleric-order-domain': [
      1,
      {
        skillProficiencies: [{ choose: { from: ['intimidation', 'persuasion'] } }],
        armorProficiencies: [{ heavy: true }],
      },
    ],
    'fighter-rune-knight': [
      3,
      { toolProficiencies: [{ "smith's tools": true }], languageProficiencies: [{ giant: true }] },
    ],
    'fighter-cavalier': [
      3,
      {
        skillToolLanguageProficiencies: [
          {
            choose: [
              {
                from: [
                  'skill:animal',
                  'skill:history',
                  'skill:insight',
                  'skill:performance',
                  'skill:persuasion',
                  'anyLanguage',
                ],
              },
            ],
          },
        ],
      },
    ],
    'fighter-samurai': [
      3,
      {
        skillToolLanguageProficiencies: [
          {
            choose: [
              { from: ['skill:history', 'skill:insight', 'skill:performance', 'skill:persuasion', 'anyLanguage'] },
            ],
          },
        ],
      },
    ],
    'monk-way-of-mercy': [
      3,
      { skillProficiencies: [{ insight: true, medicine: true }], toolProficiencies: [{ 'herbalism kit': true }] },
    ],
    'monk-way-of-the-drunken-master': [
      3,
      { skillProficiencies: [{ performance: true }], toolProficiencies: [{ "brewer's supplies": true }] },
    ],
    'monk-way-of-the-kensei': [
      3,
      { toolProficiencies: [{ choose: { from: ["calligrapher's supplies", "painter's supplies"] } }] },
    ],
    'ranger-fey-wanderer': [
      3,
      { skillProficiencies: [{ choose: { from: ['deception', 'performance', 'persuasion'] } }] },
    ],
    'rogue-scout': [
      3,
      { skillProficiencies: [{ nature: true, survival: true }], expertise: [{ nature: true, survival: true }] },
    ],
    'rogue-mastermind': [
      3,
      {
        toolProficiencies: [{ 'disguise kit': true, 'forgery kit': true, anyGamingSet: 1 }],
        languageProficiencies: [{ any: 2 }],
      },
    ],
    'rogue-assassin': [3, { toolProficiencies: [{ 'disguise kit': true, "poisoner's kit": true }] }],
    'rogue-phantom': [3, { skillToolLanguageProficiencies: [{ choose: [{ from: ['anySkill', 'anyTool'] }] }] }],
    'sorcerer-storm-sorcery': [1, { languageProficiencies: [{ primordial: true }] }],
    'sorcerer-draconic-bloodline': [1, { languageProficiencies: [{ draconic: true }] }],
    'wizard-bladesinging': [2, { skillProficiencies: [{ performance: true }], armorProficiencies: [{ light: true }] }],
    'artificer-alchemist': [3, { toolProficiencies: [{ "alchemist's supplies": true }] }],
    'artificer-armorer': [3, { toolProficiencies: [{ "smith's tools": true }] }],
    'artificer-artillerist': [3, { toolProficiencies: [{ "woodcarver's tools": true }] }],
    'artificer-battle-smith': [3, { toolProficiencies: [{ "smith's tools": true }] }],
  };
  function sources(s) {
    const out = originRows(s).map(([kind, row]) => ({
      key: choicesKey(kind, row),
      kind,
      id: row.id,
      name: row.name,
      source: row.source,
      data: { ...row, ...(kind === 'race' ? root.GrantData?.races[row.id] : {}) },
      ref: root.OfficialContent?.entryTexts.get(kind + ':' + row.id),
      level: root.Rules.totalLevel(s),
    }));
    for (const id of feats(s)) {
      const f = root.Catalog.feats.find(f => f.id === id),
        data = root.GrantData?.feats[id] || {};
      if (f)
        out.push({
          key: 'feat:' + id,
          kind: 'feat',
          id,
          name: f.name,
          source: f.sourceKey,
          data,
          ref: root.OfficialContent?.ruleTexts.get('feat:' + id),
          level: root.Rules.totalLevel(s),
        });
    }
    for (const id of optionIds(s)) {
      const o = root.ClassData.options.find(o => o.id === id),
        data = root.GrantData.options[id] || {};
      out.push({
        key: 'feat-option:' + id,
        kind: 'option',
        id,
        name: o.name,
        source: o.source,
        data,
        ref: root.OfficialContent?.ruleTexts.get('opt:' + id),
        level: root.Rules.totalLevel(s),
        ability: 'cha',
      });
    }
    for (const v of root.Classes.views(s)) {
      const classTools = root.GrantData.classes?.[v.classId]?.[v === s && !s._total ? 'start' : 'multiclass'];
      if (classTools?.length)
        out.push({
          key: 'class:' + v.classId + ':tools',
          kind: 'training',
          id: v.classId + '-tools',
          name: root.Classes.info(v).name + ' · Herramientas',
          source: root.Classes.info(v).source,
          data: { toolProficiencies: classTools },
          classId: v.classId,
          level: v.level,
        });
      if (v.classId === 'rogue')
        out.push({
          key: 'class:rogue:language',
          kind: 'training',
          id: 'thieves-cant',
          name: 'Jerga de ladrones',
          source: 'PHB',
          data: { languageProficiencies: [{ "thieves' cant": true }] },
          classId: v.classId,
          level: v.level,
        });
      for (const c of root.Classes.choices(v))
        for (const id of v.classChoices?.[c.name] || []) {
          const o = c.options.find(o => o.id === id),
            data = root.GrantData?.options[id];
          if (o && data)
            out.push({
              key: 'option:' + v.classId + ':' + id,
              kind: 'option',
              id,
              name: o.name,
              source: o.source,
              data,
              ref: root.OfficialContent?.ruleTexts.get('opt:' + id),
              level: v.level,
              classId: v.classId,
              ability: root.Classes.casting(v).ability,
            });
        }
      const sub = root.Classes.sub(v);
      const training = subclassProficiencies[sub?.id];
      if (training && v.level >= training[0])
        out.push({
          key: 'training:' + sub.id,
          kind: 'training',
          id: sub.id,
          name: sub.name + ' · Competencias',
          source: sub.source,
          data: training[1],
          level: v.level,
          classId: v.classId,
        });
      if (v.classId === 'druid')
        out.push({
          key: 'class:druid:language',
          kind: 'training',
          id: 'druidic',
          name: 'Druídico',
          source: 'PHB',
          data: { languageProficiencies: [{ druidic: true }] },
          level: v.level,
        });
      if (v.classId === 'bard' || v.classId === 'rogue')
        for (const level of v.classId === 'bard' ? [3, 10] : [1, 6])
          if (v.level >= level)
            out.push({
              key: 'class:' + v.classId + ':expertise:' + level,
              kind: 'training',
              id: v.classId + '-expertise-' + level,
              name: 'Pericia · ' + root.Classes.info(v).name + ' ' + level,
              source: 'PHB',
              level: v.level,
              data:
                v.classId === 'rogue'
                  ? { expertise: [{ anyProficientSkill: 2 }], expertiseTools: true }
                  : { expertise: [{ anyProficientSkill: 2 }] },
            });
      if (sub && v.level >= root.Classes.info(v).subclassLevel && sub.spells?.length)
        out.push({
          key: 'sub:' + sub.id,
          kind: 'sub',
          id: sub.id,
          name: sub.name,
          source: sub.source,
          data: {
            additionalSpells: sub.spells.map((block, i) => ({
              ...block,
              ability: block.ability || root.Classes.casting(v).ability,
              name:
                block.name ||
                Object.values(block.known || block.innate || {})
                  .flat()
                  .filter(x => typeof x === 'string')
                  .map(x => lookup(x)?.name || x)
                  .join(', ') ||
                'Opción ' + (i + 1),
            })),
          },
          level: v.level,
          classId: v.classId,
          ability: root.Classes.casting(v).ability,
        });
    }
    const race = root.Campaign?.race(s),
      trance =
        race?.id === 'astral-elf-base-AAG'
          ? 1
          : ['eladrin-base-MPMM', 'sea-elf-base-MPMM', 'shadar-kai-base-MPMM'].includes(race?.id)
            ? 2
            : 0;
    if (trance)
      out.push({
        key: 'training:' + race.id + ':trance',
        kind: 'training',
        id: race.id + '-trance',
        name: race.name + ' · Trance',
        source: race.source,
        level: root.Rules.totalLevel(s),
        data: {
          ...(trance === 1 ? { skillProficiencies: [{ any: 1 }] } : {}),
          skillToolLanguageProficiencies: [{ choose: [{ from: ['anyWeapon', 'anyTool'], count: trance }] }],
        },
      });
    return out.filter(
      (r, i, a) =>
        (!s._total || (['sub', 'option', 'training'].includes(r.kind) && r.key.indexOf('feat-option:') !== 0)) &&
        a.findIndex(x => x.key === r.key) === i,
    );
  }
  const classTokens = new Map(Object.entries(root.ClassData.spellClasses).map(([id, list]) => [norm(id), list]));
  const spellClasses = sp => sp.classes || root.ClassData.spellClasses[sp.id] || classTokens.get(norm(sp.id)) || [];
  const school = {
    Abjuración: 'A',
    Conjuración: 'C',
    Adivinación: 'D',
    Encantamiento: 'E',
    Evocación: 'V',
    Ilusión: 'I',
    Nigromancia: 'N',
    Transmutación: 'T',
  };
  function matches(sp, query) {
    return String(query)
      .split('|')
      .every(part => {
        const [raw, value = ''] = part.split('='),
          key = norm(raw),
          values = value.toLowerCase().split(';');
        if (key === 'level') return values.includes(String(sp.level));
        if (key === 'class') return values.some(id => spellClasses(sp).includes(id));
        if (key === 'school') return values.includes((school[sp.school] || sp.srd?.school || '').toLowerCase());
        if (key === 'componentsmiscellaneous') return values.includes('ritual') && sp.ritual;
        if (key === 'spellattack') return Boolean(sp.attackKind?.length || sp.srd?.attack);
        return false;
      });
  }
  const prof = s => 2 + Math.floor((root.Rules.totalLevel(s) - 1) / 4);
  function profile(s, source) {
    const saved = pick(s, source.key),
      groups = source.data.additionalSpells || [],
      forced =
        source.id === 'magic-initiate' && s.backgroundId === 'astral-drifter-AAG'
          ? groups.findIndex(g => /Cleric/i.test(g.name))
          : -1,
      index = forced >= 0 ? forced : Number.isInteger(saved.variant) ? saved.variant : groups.length === 1 ? 0 : -1,
      data = source.blocks
        ? { ability: source.ability }
        : source.id === 'rune-shaper' && groups[index]
          ? { ...groups[index], ability: { choose: ['int', 'wis', 'cha'] } }
          : groups[index],
      values = typeof data?.ability === 'object' ? data.ability.choose : [],
      inherit = source.kind === 'feat' ? s.progression?.featChoices?.[source.id]?.ability || saved.featAbility : null,
      ability =
        typeof data?.ability === 'string' && data.ability !== 'inherit'
          ? data.ability
          : data?.ability === 'inherit'
            ? inherit || saved.ability
            : values?.includes(saved.ability)
              ? saved.ability
              : values?.length === 1
                ? values[0]
                : source.ability || saved.ability;
    return {
      saved,
      groups,
      index,
      data,
      forced,
      abilities: values?.length ? values : data?.ability === 'inherit' ? ['int', 'wis', 'cha'] : [],
      ability,
    };
  }
  function spellPlan(s, source) {
    if (source.id === 'strixhaven-initiate') return { nodes: [], profile: profile(s, source) };
    const p = profile(s, source),
      nodes = [],
      text = source.ref?.text || '',
      slotPolicy = source.kind === 'sub' || /also cast[\s\S]{0,100}(?:spell slots|slots you have)/i.test(text),
      short =
        /short or long rest|short rest/i.test(text) &&
        ['fey-teleportation', 'aberrant-dragonmark', 'firbolg-base-VGM'].includes(source.id),
      isRitual = source.id === 'ritual-caster' || source.id === 'book-of-ancient-secrets-PHB';
    if (!p.data) return { nodes, profile: p };
    const add = (value, ctx, path) => {
      const chosen = typeof value === 'object' && value.choose,
        candidates = chosen
          ? typeof value.choose === 'string'
            ? allSpells().filter(sp => matches(sp, value.choose))
            : (value.choose.from || []).map(lookup).filter(Boolean)
          : [lookup(value)].filter(Boolean),
        count = chosen ? Number(value.count || value.choose.count || 1) : 1;
      let list = candidates;
      if (isRitual && chosen)
        list = allSpells().filter(
          sp =>
            sp.ritual &&
            sp.level <= Math.ceil((source.kind === 'option' ? source.level : root.Rules.totalLevel(s)) / 2) &&
            (!p.data.name ||
              !/Spells$/.test(p.data.name) ||
              spellClasses(sp).includes(p.data.name.split(' ')[0].toLowerCase())),
        );
      const id = path.join('.'),
        saved = p.saved.spells?.[id] || [];
      if (chosen) list = list.filter(sp => !root.Campaign || root.Campaign.enabled(s, sp) || saved.includes(sp.id));
      const selected = chosen
          ? saved.filter(v => list.some(sp => sp.id === v)).slice(0, isRitual ? 50 : count)
          : list.map(sp => sp.id),
        need = chosen && selected.length < count;
      nodes.push({
        id,
        chosen,
        count,
        candidates: list,
        selected,
        need,
        ...ctx,
        ritual: isRitual || ctx.ritual,
        source: source.key,
        allowSlots: slotPolicy || source.id === 'pact-of-the-chain-PHB',
        missing: !chosen && !list.length ? String(value) : null,
      });
    };
    const walk = (value, ctx, path = []) => {
      if (typeof value === 'string')
        return add(value, { ...ctx, castLevel: /#\d/.test(value) ? Number(value.split('#')[1]) : undefined }, path);
      if (Array.isArray(value)) return value.forEach((v, i) => walk(v, ctx, [...path, i]));
      if (!value || typeof value !== 'object') return;
      if (value.choose) return add(value, ctx, path);
      for (const [key, v] of Object.entries(value)) {
        if (['ability', 'name', 'resourceName'].includes(key)) continue;
        if (['known', 'innate', 'prepared', 'expanded'].includes(key)) walk(v, { ...ctx, mode: key }, [...path, key]);
        else if (key === 'daily' || key === 'rest')
          walk(v, { ...ctx, reset: key === 'rest' ? 'short' : 'long' }, [...path, key]);
        else if (key === 'will') walk(v, { ...ctx, unlimited: true }, [...path, key]);
        else if (key === 'ritual') walk(v, { ...ctx, ritual: true }, [...path, key]);
        else if (key === 'resource')
          walk(v, { ...ctx, costResource: (p.data.resourceName || 'Ki').toLowerCase() }, [...path, key]);
        else if (/^\d+e?$/.test(key)) {
          if (ctx.reset) walk(v, { ...ctx, max: parseInt(key), independent: key.endsWith('e') }, [...path, key]);
          else if (ctx.costResource) walk(v, { ...ctx, cost: parseInt(key) }, [...path, key]);
          else if (parseInt(key) <= source.level) walk(v, ctx, [...path, key]);
        } else if (key === '_' || key.startsWith('block') || /^s\d+$/.test(key)) walk(v, ctx, [...path, key]);
      }
    };
    if (source.blocks) source.blocks.forEach((b, i) => walk(b, { mode: 'known' }, ['sub', i]));
    else walk(p.data, { mode: 'known' }, []);
    for (const node of nodes) {
      if (source.id === 'chains-of-carceri-PHB') {
        node.unlimited = true;
        delete node.reset;
        node.note =
          'Solo celestiales, infernales o elementales. Un lanzamiento por criatura entre descansos largos; controlá el objetivo en mesa.';
      }
      if (source.kind === 'option' && /using a warlock spell slot/i.test(text)) node.slotRequired = true;
      if (node.mode === 'expanded' || node.ritual || node.costResource) continue;
      const leveled = node.candidates.some(sp => sp.level > 0);
      if (!leveled) continue;
      if (
        source.kind === 'race' &&
        ['yuan-ti-base-MPMM', 'yuan-ti-pureblood-base-VGM'].includes(source.id) &&
        node.candidates.some(sp => sp.english === 'Animal Friendship')
      )
        node.unlimited = true;
      if (source.kind === 'option' && !node.reset) node.unlimited = true;
      if (!node.unlimited && !node.reset && source.kind !== 'sub') node.reset = short ? 'short' : 'long';
      if (short && node.reset) node.reset = 'short';
      node.max ||= 1;
    }
    if (source.id === 'rune-shaper') {
      const runes = nodes.filter(n => !n.candidates.some(sp => sp.english === 'Comprehend Languages')),
        candidates = runes.flatMap(n => n.candidates),
        selected = (p.saved.runes || [])
          .filter(id => candidates.some(sp => sp.id === id))
          .slice(0, Math.floor(prof(s) / 2));
      for (const n of runes) n.selected = n.selected.filter(id => selected.includes(id));
      nodes.push({
        id: 'runes',
        chosen: true,
        candidates,
        selected,
        count: Math.floor(prof(s) / 2),
        need: selected.length < Math.floor(prof(s) / 2),
        runeSelector: true,
        source: source.key,
      });
    }
    return { nodes, profile: p };
  }
  function spells(s) {
    const out = [];
    for (const source of sources(s)) {
      const { nodes, profile: p } = spellPlan(s, source);
      if (!p.data || (p.abilities.length && !p.ability)) continue;
      for (const node of nodes) {
        if (node.runeSelector) continue;
        for (const id of node.selected) {
          const sp = allSpells().find(sp => sp.id === id);
          if (!sp) continue;
          const resource =
              node.reset && sp.level > 0
                ? 'grant:' + norm(source.key) + ':' + (node.independent ? norm(id) : norm(node.id))
                : null,
            fixedLevel = node.castLevel || sp.level;
          out.push({
            id,
            mode: node.mode === 'prepared' ? 'prepared' : node.mode === 'expanded' ? 'expanded' : 'known',
            grantType: source.kind,
            origin: source.name,
            source: source.source,
            ability: p.ability || source.ability || root.Classes.casting(s).ability,
            sourceKey: source.key,
            classId: source.classId,
            allowSlots: node.allowSlots,
            ritualOnly: Boolean(node.ritual) && source.id !== 'pact-of-the-chain-PHB',
            ritual: Boolean(node.ritual),
            slotRequired: Boolean(node.slotRequired),
            unlimited: !sp.level || Boolean(node.unlimited),
            castLevel: fixedLevel,
            ...(resource ? { freeResource: resource, max: node.max || 1, reset: node.reset } : {}),
            ...(node.costResource ? { costResource: node.costResource, cost: node.cost } : {}),
            note:
              node.note ||
              (source.kind === 'race' && sp.english === 'Animal Friendship'
                ? 'Esta versión solo permite elegir serpientes.'
                : ''),
          });
        }
      }
    }
    return out;
  }
  function resources(s) {
    const out = [];
    for (const grant of spells(s))
      if (grant.freeResource && !out.some(r => r.id === grant.freeResource))
        out.push({
          id: grant.freeResource,
          name: grant.origin + ' · ' + (allSpells().find(sp => sp.id === grant.id)?.name || grant.id),
          max: grant.max,
          reset: grant.reset,
          text:
            'Lanzamiento concedido por este rasgo. ' +
            (grant.allowSlots ? 'También permite gastar espacios.' : 'No concede espacios de clase.'),
          action: 'manual',
        });
    return [...out, ...racialResources(s)];
  }
  function racialResources(s) {
    const race = root.Campaign?.race(s),
      text = root.OfficialContent?.entryTexts.get('race:' + race?.id)?.text || '',
      out = [];
    const limited = new Set([
      'Breath Weapon',
      'Eladrin',
      'Shadar-kai',
      'Fury of the Small',
      'Saving Face',
      'Vigilant Guardian',
      'Partially Amphibious',
      'Healing Hands',
      'Celestial Revelation',
      'Necrotic Shroud',
      'Radiant Soul',
      'Radiant Consumption',
      'Starlight Step',
      'Built for Success',
      'Svirfneblin Camouflage',
      'Vampiric Bite',
      'Forceful Presence',
      'Vengeful Assault',
      'Chromatic Warding',
      'Gem Flight',
      'Metallic Breath Weapon',
      'Fey Step',
      'Hidden Step',
      'Astral Spark',
      "Stone's Endurance",
      'Hadozee Dodge',
      'Rabbit Hop',
      'Fey Gift',
      'Fortune from the Many',
      'Taunt',
      'Kenku Recall',
      'Draconic Cry',
      'Grovel, Cower, and Beg',
      'Daunting Roar',
      'Hungry Jaws',
      'Adrenaline Rush',
      'Relentless Endurance',
      'Knowledge from a Past Life',
      'Blessing of the Raven Queen',
      'Shifting',
    ]);
    for (const name of race?.traits || []) {
      if (!limited.has(name)) continue;
      const start = text.indexOf(name + '\n');
      if (start < 0) continue;
      const end =
          (race.traits || [])
            .filter(n => n !== name)
            .map(n => text.indexOf('\n' + n + '\n', start + name.length))
            .filter(i => i >= 0)
            .sort((a, b) => a - b)[0] ?? text.length,
        section = text.slice(start + name.length, end).trim();
      if (
        !/(?:short|long) rest/i.test(section) ||
        !/(?:use this (?:trait|ability|bonus action)|regain (?:all )?(?:expended uses|the ability to)|can.t use (?:it|this trait) again)/i.test(
          section,
        )
      )
        continue;
      if (/cast/i.test(section) && !/use this (?:trait|ability|bonus action)/i.test(section)) continue;
      const max = /number of times equal to your proficiency bonus/i.test(section)
          ? prof(s)
          : /use this trait twice/i.test(section)
            ? 2
            : 1,
        reset = /short (?:or long )?rest/i.test(section) ? 'short' : 'long',
        action = /as a bonus action/i.test(section)
          ? 'bonus'
          : /use your reaction/i.test(section)
            ? 'reaction'
            : /as an action/i.test(section)
              ? 'action'
              : 'manual';
      if (/Chromatic Warding/i.test(name) && root.Rules.totalLevel(s) < 5) continue;
      if (/Gem Flight/i.test(name) && root.Rules.totalLevel(s) < 5) continue;
      if (name === 'Metallic Breath Weapon' && root.Rules.totalLevel(s) < 5) continue;
      if (
        ['Celestial Revelation', 'Necrotic Shroud', 'Radiant Soul', 'Radiant Consumption'].includes(name) &&
        root.Rules.totalLevel(s) < 3
      )
        continue;
      const es = root.TraitsEs?.get('race:' + race.id + ':' + name);
      out.push({
        id: 'racial:' + race.id + ':' + norm(name),
        name: race.name + ' · ' + (es?.name || name),
        max,
        reset,
        action,
        text:
          (es?.text || section) +
          '\nEste contador registra el uso. Resolvé el efecto, sus requisitos y objetivos en mesa.',
      });
    }
    if (race?.traits.includes('Relentless Endurance') && !out.some(r => r.id.endsWith(':relentlessendurance')))
      out.push({
        id: 'racial:' + race.id + ':relentlessendurance',
        name: 'Aguante incansable',
        max: 1,
        reset: 'long',
        action: 'manual',
        text: 'Cuando te reducen a 0 PG y no morís en el acto, podés quedar a 1 PG. Un uso por descanso largo. Ajustá los PG al resolver el efecto.',
      });
    return out;
  }
  const grantFor = (s, id) => spells(s).find(g => g.id === id && g.mode !== 'expanded') || null;
  function normalSpell(s, sp) {
    return (
      root.Classes.views(s).some(v => {
        const type = root.Classes.casting(v).type;
        if (
          (v.known || []).includes(sp.id) &&
          (sp.level === 0 || !['prepared', 'book'].includes(type) || (v.prepared || []).includes(sp.id))
        )
          return true;
        return (root.Classes.sub(v)?.spells || []).some(block =>
          Object.entries(block.prepared || block.known || {}).some(
            ([level, list]) =>
              (level.startsWith('s')
                ? Number(level.slice(1)) <= root.Classes.slots(v).length
                : Number(level) <= v.level) &&
              (Array.isArray(list) ? list : []).some(x => typeof x === 'string' && lookup(x)?.id === sp.id),
          ),
        );
      }) ||
      ((s.extras || []).includes(sp.id) && (!grantFor(s, sp.id) || Boolean(s.spellModes?.[sp.id])))
    );
  }
  function slotAllowed(s, sp) {
    const list = spells(s).filter(g => g.id === sp.id && g.mode !== 'expanded');
    if (!list.length || normalSpell(s, sp)) return true;
    if (
      list.some(
        g =>
          g.slotRequired &&
          root.Classes.resources(s).some(
            r => r.id === g.freeResource && root.Classes.spent(s, r) !== null && root.Classes.spent(s, r) < r.max,
          ),
      )
    )
      return true;
    return list.some(
      g =>
        g.allowSlots ||
        (g.sourceKey === 'feat:magic-initiate' &&
          root.Classes.views(s).some(v => {
            const src = sources(s).find(x => x.key === g.sourceKey),
              p = profile(s, src),
              type = root.Classes.casting(v).type;
            return (
              p.data?.name?.split(' ')[0].toLowerCase() === v.classId && !['prepared', 'book', 'none'].includes(type)
            );
          })),
    );
  }
  function castingGrant(s, sp) {
    const list = spells(s).filter(g => g.id === sp.id && g.mode !== 'expanded' && !g.ritualOnly),
      resources = root.Classes.resources(s);
    const ready = list.find(
      g =>
        g.unlimited ||
        (g.freeResource &&
          resources.some(
            r => r.id === g.freeResource && root.Classes.spent(s, r) !== null && root.Classes.spent(s, r) < r.max,
          )) ||
        (g.costResource &&
          resources.some(
            r =>
              r.id === g.costResource &&
              root.Classes.spent(s, r) !== null &&
              r.max - root.Classes.spent(s, r) >= g.cost,
          )),
    );
    return ready || null;
  }
  const SKILLS = () => root.Rules.skills.map(([id]) => 'skill:' + id),
    artisan = [
      "alchemist's supplies",
      "brewer's supplies",
      "calligrapher's supplies",
      "carpenter's tools",
      "cartographer's tools",
      "cobbler's tools",
      "cook's utensils",
      "glassblower's tools",
      "jeweler's tools",
      "leatherworker's tools",
      "mason's tools",
      "painter's supplies",
      "potter's tools",
      "smith's tools",
      "tinker's tools",
      "weaver's tools",
      "woodcarver's tools",
    ],
    instruments = ['bagpipes', 'drum', 'dulcimer', 'flute', 'lute', 'lyre', 'horn', 'pan flute', 'shawm', 'viol'],
    games = ['dice set', 'dragonchess set', 'playing card set', 'three-dragon ante set'],
    tools = [
      ...artisan,
      ...instruments,
      ...games,
      'disguise kit',
      'forgery kit',
      'herbalism kit',
      "navigator's tools",
      "poisoner's kit",
      "thieves' tools",
      'vehicles (land)',
      'vehicles (water)',
    ],
    standard = ['common', 'dwarvish', 'elvish', 'giant', 'gnomish', 'goblin', 'halfling', 'orc'],
    languages = [
      ...standard,
      'abyssal',
      'celestial',
      'draconic',
      'deep speech',
      'infernal',
      'primordial',
      'sylvan',
      'undercommon',
      'aquan',
      'auran',
      'ignan',
      'terran',
    ];
  const skillId = x => ({ 'animal handling': 'animal', 'sleight of hand': 'sleight' })[x] || x;
  function profPlan(s, source) {
    const otherLanguages = {
        'gith-githyanki-MTF': 'gith',
        'gith-githzerai-MTF': 'gith',
        'kalashtar-base-ERLW': 'quori',
        'loxodon-base-GGR': 'loxodon',
        'minotaur-base-GGR': 'minotaur',
        'minotaur-base-MOT': 'minotaur',
        'simic-hybrid-base-GGR': 'vedalken',
        'vedalken-base-GGR': 'vedalken',
        'aarakocra-base-EEPC': 'aarakocra',
        'grung-base-OGA': 'grung',
        'leonin-base-MOT': 'leonin',
        'boros-legionnaire-GGR': 'minotaur',
        'golgari-agent-GGR': 'kraul',
        'izzet-engineer-GGR': 'vedalken',
        'selesnya-initiate-GGR': 'loxodon',
      },
      language = k => (k === 'other' ? otherLanguages[source.id] || k : k);
    const fixed = [],
      groups = [],
      variants = [],
      saved = pick(s, source.key).proficiencies || {};
    for (const [field, kind] of [
      ['skillProficiencies', 'skill'],
      ['toolProficiencies', 'tool'],
      ['languageProficiencies', 'language'],
      ['weaponProficiencies', 'weapon'],
      ['armorProficiencies', 'armor'],
      ['expertise', 'expertise'],
      ['resist', 'resist'],
    ]) {
      const rows = source.data[field] || [];
      const chosen = rows.length > 1 ? pick(s, source.key).profVariants?.[field] : 0;
      if (rows.length > 1)
        variants.push({
          field,
          rows,
          selected: chosen,
          need: !Number.isInteger(chosen) || chosen < 0 || chosen >= rows.length,
        });
      for (const [i, row] of rows.entries()) {
        if (i !== chosen) continue;
        for (const [key, value] of Object.entries(row)) {
          if (value === true) {
            fixed.push(kind + ':' + (kind === 'skill' ? skillId(key) : kind === 'language' ? language(key) : key));
            continue;
          }
          let from = [],
            count = 1;
          if (key === 'choose') {
            from =
              kind === 'weapon' && value.fromFilter
                ? Object.values(root.EquipmentData.items)
                    .filter(x => x.weapon && (value.fromFilter.includes('mundane weapon') || x.weapon === 'martial'))
                    .map(x => 'weapon:' + x.id)
                : (value.from || []).flatMap(k =>
                    (k === 'anyArtisansTool'
                      ? artisan
                      : k === 'musical instrument' || k === 'anyMusicalInstrument'
                        ? instruments
                        : k === 'anyGamingSet'
                          ? games
                          : [kind === 'skill' ? skillId(k) : kind === 'language' ? language(k) : k]
                    ).map(x => kind + ':' + x),
                  );
            count = value.count || 1;
          } else if (key === 'anyProficientSkill') {
            from = unique([
              ...(s.proficiencies || []),
              ...(s.expertise || []),
              ...sources(s)
                .flatMap(src => Object.values(pick(s, src.key).proficiencies || {}).flat())
                .filter(x => x.startsWith('skill:'))
                .map(x => x.slice(6)),
              ...originRows(s).flatMap(([, r]) =>
                (r.skillProficiencies || []).flatMap(p =>
                  Object.keys(p)
                    .filter(k => p[k] === true)
                    .map(skillId),
                ),
              ),
            ]).map(k => 'expertise:' + k);
            if (source.data.expertiseTools) from.push("expertise:thieves' tools");
            count = value;
          } else if (key.startsWith('any')) {
            const pool =
              kind === 'skill'
                ? root.Rules.skills.map(([id]) => id)
                : kind === 'language'
                  ? key === 'anyStandard'
                    ? standard
                    : languages
                  : /Artisan/i.test(key)
                    ? artisan
                    : /Gaming/i.test(key)
                      ? games
                      : /Musical/i.test(key)
                        ? instruments
                        : tools;
            from = pool.map(x => kind + ':' + x);
            count = Number(value) || 1;
          }
          if (from.length) {
            const id = field + '.' + i + '.' + key,
              selected = (
                saved[id] ||
                (source.kind === 'feat' && ['skill', 'expertise'].includes(kind)
                  ? (s.progression?.featChoices?.[source.id]?.[kind === 'skill' ? 'skills' : 'expertise'] || []).map(
                      x => kind + ':' + x,
                    )
                  : source.kind === 'training' && field === 'expertise'
                    ? (s.expertise || [])
                        .slice(
                          source.id.endsWith('-6') || source.id.endsWith('-10') ? 2 : 0,
                          source.id.endsWith('-6') || source.id.endsWith('-10') ? 4 : 2,
                        )
                        .map(x => 'expertise:' + x)
                    : [])
              )
                .filter(x => from.includes(x))
                .slice(0, count);
            groups.push({ id, kind, count, from, selected, need: selected.length < count });
          }
        }
      }
    }
    for (const [i, row] of (source.data.skillToolLanguageProficiencies || []).entries())
      for (const [j, c] of (row.choose || []).entries()) {
        const from = unique(
          (c.from || []).flatMap(x =>
            x === 'anySkill'
              ? SKILLS()
              : x === 'anyTool'
                ? tools.map(x => 'tool:' + x)
                : x === 'anyLanguage'
                  ? languages.map(x => 'language:' + x)
                  : x === 'anyWeapon'
                    ? Object.values(root.EquipmentData.items)
                        .filter(x => x.weapon)
                        .map(x => 'weapon:' + x.id)
                    : [x],
          ),
        );
        const id = 'mixed.' + i + '.' + j,
          count = c.count || 1,
          selected = (
            saved[id] ||
            (source.kind === 'feat'
              ? (s.progression?.featChoices?.[source.id]?.skills || []).map(x => 'skill:' + x)
              : [])
          )
            .filter(x => from.includes(x))
            .slice(0, count);
        groups.push({ id, kind: 'mixed', count, from, selected, need: selected.length < count });
      }
    if (source.data.expertiseFromSkills)
      fixed.push(
        ...[...fixed, ...groups.flatMap(g => g.selected)]
          .filter(x => x.startsWith('skill:'))
          .map(x => x.replace('skill:', 'expertise:')),
      );
    return { fixed: unique(fixed), groups, variants, selected: unique([...fixed, ...groups.flatMap(g => g.selected)]) };
  }
  function proficiencies(s, kind) {
    return unique(
      sources(s)
        .flatMap(src => profPlan(s, src).selected)
        .filter(x => x.startsWith(kind + ':'))
        .map(x => x.slice(kind.length + 1)),
    );
  }
  function abilityBonuses(s) {
    if (!s.originAuto) return {};
    const out = {};
    for (const id of originFeats(s).filter(id => !manualFeats(s).includes(id))) {
      const data = root.FeatData[id] || {},
        choice = pick(s, 'feat:' + id).featAbility;
      for (const [key, n] of Object.entries(data.ability?.fixed || {})) out[key] = (out[key] || 0) + n;
      if (data.ability?.from?.includes(choice)) out[choice] = (out[choice] || 0) + (data.ability.n || 1);
    }
    return out;
  }
  function toolBonus(s, tool, ability) {
    if (!Object.hasOwn(root.Rules.attrs, ability) || !proficiencies(s, 'tool').includes(tool))
      throw Error('Elegí una herramienta con competencia y una característica.');
    const expert =
      proficiencies(s, 'expertise').includes(tool) ||
      root.Classes.views(s).some(v => v.classId === 'artificer' && v.level >= 6);
    return root.Rules.stats(s).mods[ability] + prof(s) * (expert ? 2 : 1) + (root.MagicItems?.check(s) || 0);
  }
  function plans(s) {
    return sources(s).map(source => ({
      source,
      ...spellPlan(s, source),
      proficiencies: profPlan(s, source),
      featPlan: source.kind === 'race' || source.kind === 'background' ? featPlan(s, source.kind, source.data) : null,
      optionPlan: source.kind === 'feat' ? optionPlan(s, source) : null,
    }));
  }
  function configure(s, key, value) {
    const source = sources(s).find(src => src.key === key);
    if (!source) throw Error('Ese origen o rasgo no pertenece a tu ficha.');
    const next = { ...s, grantChoices: { ...s.grantChoices, [key]: value } },
      p = plans(next).find(p => p.source.key === key);
    validate(next);
    if (p.featPlan?.needed) throw Error('Elegí las dotes concedidas por este origen.');
    if (p.optionPlan?.needed) throw Error('Elegí las opciones concedidas por la dote.');
    if (
      p.optionPlan &&
      ((value.options || []).length !== p.optionPlan.count ||
        new Set(value.options).size !== value.options.length ||
        value.options.some(id => !p.optionPlan.allowed.includes(id)))
    )
      throw Error('La selección de opciones de clase no es válida.');
    if (p.profile.groups.length && (!p.profile.data || (p.profile.abilities.length && !p.profile.ability)))
      throw Error('Elegí la opción del rasgo y su característica de lanzamiento.');
    if (p.nodes.some(n => n.need || n.missing)) throw Error('Completá los conjuros concedidos por este rasgo.');
    for (const node of p.nodes.filter(n => n.chosen)) {
      const chosen = node.runeSelector ? value.runes || [] : value.spells?.[node.id] || [];
      if (
        chosen.length < node.count ||
        (!['ritual-caster', 'book-of-ancient-secrets-PHB'].includes(source.id) && chosen.length > node.count) ||
        new Set(chosen).size !== chosen.length ||
        chosen.some(
          id =>
            !node.candidates.some(sp => sp.id === id) ||
            (root.Campaign &&
              !root.Campaign.enabled(s, lookup(id)) &&
              !(node.runeSelector ? pick(s, key).runes || [] : pick(s, key).spells?.[node.id] || []).includes(id)),
        )
      )
        throw Error('La selección de conjuros no es válida.');
      if (
        ['ritual-caster', 'book-of-ancient-secrets-PHB'].includes(source.id) &&
        chosen.filter(id => lookup(id)?.level === 1).length < 2
      )
        throw Error('El libro empieza con dos rituales de nivel 1. Los otros requieren encontrarlos y copiarlos.');
    }
    if (p.proficiencies.groups.some(g => g.need) || p.proficiencies.variants.some(g => g.need))
      throw Error('Completá las competencias e idiomas concedidos.');
    for (const g of p.proficiencies.groups) {
      const a = value.proficiencies?.[g.id] || [];
      if (a.length !== g.count || new Set(a).size !== a.length || a.some(x => !g.from.includes(x)))
        throw Error('La elección de competencias no es válida.');
    }
    const ability = root.FeatData[source.id]?.ability;
    if (
      source.kind === 'feat' &&
      originFeats(s).includes(source.id) &&
      !manualFeats(s).includes(source.id) &&
      ability?.from &&
      !ability.from.includes(value.featAbility)
    )
      throw Error('Elegí el aumento de característica de la dote.');
    s.grantChoices = { ...s.grantChoices, [key]: structuredClone(value) };
    return s;
  }
  function validate(s) {
    if (s.originAuto !== undefined && typeof s.originAuto !== 'boolean')
      throw Error('Confirmación de bonos de origen inválida.');
    if (
      s.extrasConfirmed !== undefined &&
      (!Array.isArray(s.extrasConfirmed) ||
        s.extrasConfirmed.length > 100 ||
        s.extrasConfirmed.some(id => typeof id !== 'string' || id.length > 120))
    )
      throw Error('Extras confirmados inválidos.');
    if (s.grantChoices === undefined) return;
    if (
      !s.grantChoices ||
      typeof s.grantChoices !== 'object' ||
      Array.isArray(s.grantChoices) ||
      Object.keys(s.grantChoices).length > 200 ||
      JSON.stringify(s.grantChoices).length > 60000
    )
      throw Error('Concesiones de rasgos inválidas.');
    for (const [key, value] of Object.entries(s.grantChoices)) {
      if (key.length > 200 || !value || typeof value !== 'object' || Array.isArray(value))
        throw Error('Elección de rasgo inválida.');
      if (value.variant !== undefined && (!Number.isInteger(value.variant) || value.variant < 0 || value.variant > 30))
        throw Error('Opción de rasgo inválida.');
      if (value.ability !== undefined && !['str', 'dex', 'con', 'int', 'wis', 'cha'].includes(value.ability))
        throw Error('Característica de rasgo inválida.');
      if (value.featAbility !== undefined && !['str', 'dex', 'con', 'int', 'wis', 'cha'].includes(value.featAbility))
        throw Error('Característica de dote inválida.');
      if (
        value.profVariants !== undefined &&
        (!value.profVariants ||
          typeof value.profVariants !== 'object' ||
          Array.isArray(value.profVariants) ||
          Object.values(value.profVariants).some(i => !Number.isInteger(i) || i < 0 || i > 30))
      )
        throw Error('Variante de competencias inválida.');
      for (const group of [value.spells, value.proficiencies])
        if (
          group !== undefined &&
          (!group ||
            typeof group !== 'object' ||
            Array.isArray(group) ||
            Object.values(group).some(
              a =>
                !Array.isArray(a) ||
                a.length > 50 ||
                new Set(a).size !== a.length ||
                a.some(v => typeof v !== 'string' || v.length > 150),
            ))
        )
          throw Error('Lista de concesiones inválida.');
      for (const list of [value.feats, value.runes, value.options])
        if (
          list !== undefined &&
          (!Array.isArray(list) ||
            list.length > 20 ||
            new Set(list).size !== list.length ||
            list.some(v => typeof v !== 'string' || v.length > 150))
        )
          throw Error('Elección de origen inválida.');
    }
  }
  // Fichas de antes de que los rasgos dieran sus conjuros solos: se agregaban como extras a mano.
  // Repetidos: extras que ya da un rasgo, y extras que parecen la elección de la raza o el trasfondo
  // (un truco de mago de alto elfo agregado a mano y otro elegido después en la elección del rasgo).
  function repeatedExtras(s) {
    const extras = s.extras || [],
      out = [];
    if (!extras.length) return out;
    const given = new Map(
      spells(s)
        .filter(g => g.mode !== 'expanded')
        .map(g => [g.id, g]),
    );
    // Un extra con modo propio (por ejemplo, «sin espacio» que dio el DM) es intencional: se respeta.
    for (const id of extras)
      if (given.has(id) && !s.spellModes?.[id]) out.push({ id, kind: 'granted', origin: given.get(id).origin || '' });
    const ok = new Set(s.extrasConfirmed || []);
    for (const p of plans(s).filter(p => ['race', 'background'].includes(p.source.kind)))
      for (const n of p.nodes.filter(n => n.chosen && !n.ritual && n.mode !== 'expanded' && n.count === 1))
        for (const id of extras)
          if (!given.has(id) && !ok.has(id) && !out.some(o => o.id === id) && n.candidates.some(sp => sp.id === id))
            out.push({
              id,
              kind: n.selected.length ? 'choice' : 'adopt',
              key: p.source.key,
              node: n.id,
              origin: p.source.name,
              picked: n.selected,
            });
    return out;
  }
  // Reemplaza la elección del rasgo por el extra repetido y lo saca de los extras.
  function adoptExtra(s, key, node, id) {
    const cur = pick(s, key);
    s.grantChoices = { ...(s.grantChoices || {}), [key]: { ...cur, spells: { ...(cur.spells || {}), [node]: [id] } } };
    s.extras = (s.extras || []).filter(x => x !== id);
  }
  function migrate(s) {
    if ((s.originMagicVersion || 0) >= 2) return;
    if (!s.originMagicVersion) {
      const legacy = new Set((root.Campaign?.raceSpells(s).spells || []).map(x => x.id));
      s.extras = (s.extras || []).filter(id => !legacy.has(id) || s.spellModes?.[id]);
    }
    // v2: los extras que ya da un rasgo se van solos; una elección de raza o trasfondo todavía vacía
    // toma el extra que coincide. Si ya estaba elegida, la ficha lo muestra en «Tu ficha al día».
    try {
      for (const r of repeatedExtras(s))
        if (r.kind === 'granted') s.extras = s.extras.filter(x => x !== r.id);
        else if (
          r.kind === 'adopt' &&
          !pick(s, r.key).spells?.[r.node]?.length &&
          // Un conjuro con modo propio del DM se respeta; en un truco el modo no cambia nada.
          (!s.spellModes?.[r.id] || lookup(r.id)?.level === 0)
        )
          adoptExtra(s, r.key, r.node, r.id);
    } catch {}
    s.originMagicVersion = 2;
  }
  root.Grants = {
    toolBonus,
    migrate,
    repeatedExtras,
    adoptExtra,
    optionPlan,
    optionIds,
    normalSpell,
    slotAllowed,
    castingGrant,
    originFeats,
    feats,
    sources,
    spellPlan,
    spells,
    resources,
    grantFor,
    plans,
    configure,
    validate,
    proficiencies,
    abilityBonuses,
    featPlan,
    profile,
    profPlan,
    pick,
    lookup,
    matches,
  };
})(typeof window !== 'undefined' ? window : globalThis);
