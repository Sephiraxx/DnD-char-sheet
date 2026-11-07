/* Choices granted by official origins and features; saved with the character. */
const GrantUI = (() => {
  'use strict';
  const names = {
      skill: 'Habilidades',
      expertise: 'Pericias',
      tool: 'Herramientas',
      language: 'Idiomas',
      weapon: 'Armas',
      armor: 'Armaduras',
      mixed: 'Competencias',
      resist: 'Resistencia al daño',
    },
    term = x => {
      const [kind, ...parts] = x.split(':'),
        name = parts.join(':');
      return Rules.skills.find(s => s[0] === name)?.[1] || Campaign.facts(name.split('|')[0]);
    },
    spellName = id => Catalog.spells.find(sp => sp.id === id)?.name || id,
    featName = id => Catalog.feats.find(f => f.id === id)?.name || id;
  function groupLabel(g, i) {
    const labels = {
      Arctic: 'Ártico',
      Coast: 'Costa',
      Desert: 'Desierto',
      Forest: 'Bosque',
      Grassland: 'Pradera',
      Mountain: 'Montaña',
      Swamp: 'Pantano',
      Underdark: 'Infraoscuridad',
      Good: 'Bien',
      Evil: 'Mal',
      Law: 'Ley',
      Chaos: 'Caos',
      Neutrality: 'Neutralidad',
      'Chaotic Outer Plane': 'Plano exterior caótico',
      'Evil Outer Plane': 'Plano exterior maligno',
      'Good Outer Plane': 'Plano exterior bueno',
      'Lawful Outer Plane': 'Plano exterior legal',
      'The Outlands': 'Tierras Exteriores',
    };
    if (g.name) {
      const cls = g.name.replace(/ Spells$/, '').toLowerCase();
      return (
        labels[g.name] || (ClassData.classes[cls] ? 'Conjuros de ' + ClassData.classes[cls].name.toLowerCase() : g.name)
      );
    }
    const ids = [],
      walk = x => {
        if (typeof x === 'string') {
          const sp = Grants.lookup(x);
          if (sp) ids.push(sp.id);
        } else if (x && typeof x === 'object') Object.values(x).forEach(walk);
      };
    walk(g.known || g.innate);
    return [...new Set(ids)].slice(0, 3).map(spellName).join(', ') || 'Opción ' + (i + 1);
  }
  const halfAbility = (s, p) =>
    p.source.kind === 'feat' &&
    Grants.originFeats(s).includes(p.source.id) &&
    !(s.progression?.learnedFeats || []).includes(p.source.id)
      ? FeatData[p.source.id]?.ability
      : null;
  function pending(s, p) {
    return Boolean(
      p.featPlan?.needed ||
      p.optionPlan?.needed ||
      (p.profile.groups.length && (!p.profile.data || (p.profile.abilities.length && !p.profile.ability))) ||
      p.nodes.some(n => n.need || n.missing) ||
      p.proficiencies.groups.some(g => g.need) ||
      p.proficiencies.variants.some(g => g.need) ||
      (halfAbility(s, p)?.from && !halfAbility(s, p).from.includes(Grants.pick(s, p.source.key).featAbility)),
    );
  }
  function relevant(p) {
    return (
      p.nodes.length ||
      p.profile.groups.length ||
      p.proficiencies.selected.length ||
      p.proficiencies.groups.length ||
      p.proficiencies.variants.length ||
      p.featPlan?.allowed.length ||
      p.source.kind === 'feat' ||
      p.optionPlan
    );
  }
  function card(s, spellsOnly = false) {
    const plans = Grants.plans(s).filter(
        p => p.source.id !== 'strixhaven-initiate' && relevant(p) && (!spellsOnly || p.profile.groups.length),
      ),
      todo = plans.filter(p => pending(s, p));
    if (!plans.length) return '';
    const tools = Grants.proficiencies(s, 'tool');
    const rows = plans
      .map(p => {
        const status = pending(s, p),
          list = Grants.spells(s).filter(g => g.sourceKey === p.source.key && g.mode !== 'expanded'),
          profs = p.proficiencies.selected;
        return `<details class="section-space" ${status ? 'open' : ''}><summary><b>${esc(p.source.name)}</b> · ${status ? 'Faltan elecciones' : 'Ver beneficios'}</summary><div class="section-space">${p.featPlan?.selected.length ? `<p><b>Dotes:</b> ${p.featPlan.selected.map(id => esc(featName(id))).join(', ')}.</p>` : ''}${list.length ? `<p><b>Conjuros:</b> ${[...new Set(list.map(g => spellName(g.id)))].map(esc).join(', ')}.</p>` : ''}${[
          'skill',
          'expertise',
          'tool',
          'language',
          'weapon',
          'armor',
          'resist',
        ]
          .map(kind => {
            const xs = profs.filter(x => x.startsWith(kind + ':'));
            return xs.length ? `<p><b>${names[kind]}:</b> ${xs.map(x => esc(term(x))).join(', ')}.</p>` : '';
          })
          .join(
            '',
          )}${button(status ? 'Completar elecciones' : 'Revisar elecciones', 'grant-config', 'secondary', `data-key="${esc(p.source.key)}"`)}</div></details>`;
      })
      .join('');
    const bonus = Grants.originFeats(s)
      .filter(id => !(s.progression?.learnedFeats || []).includes(id))
      .some(id => id === 'tough' || FeatData[id]?.ability);
    return `<section class="card section-space"><div class="card-header"><h2>Beneficios de tu personaje</h2>${todo.length ? `<span class="tag warn">${todo.length} por completar</span>` : ''}</div><p class="small">Concedidos por tu raza, trasfondo, dotes y opciones de clase. Las elecciones quedan guardadas en tu ficha; los conjuros y competencias se agregan automáticamente.</p>${!spellsOnly && tools.length ? button('Tirar con herramientas', 'grant-tool', 'secondary') : ''}${rows}${bonus && !s.originAuto ? `<div class="banner"><p>Tu ficha ya existía antes de automatizar las dotes de origen. Confirmá si habías incluido sus aumentos de características o PG.</p>${button('Ya incluí esos bonos', 'grant-bonuses', 'secondary', 'data-included="true"')}${button('Sumar los bonos que faltan', 'grant-bonuses', 'secondary', 'data-included="false"')}</div>` : ''}</section>`;
  }
  function configure(key) {
    let draft = structuredClone(Grants.pick(state, key));
    const many = (label, name, options, selected, count) =>
      `<label class="field"><span>${esc(label)} · elegí ${count}${count === 1 ? '' : ' (varias opciones)'}</span><select class="control" name="${esc(name)}" ${count === 1 ? '' : 'multiple size="6"'}>${count === 1 ? '<option value="">Elegí…</option>' : ''}${options.map(([id, name]) => `<option value="${esc(id)}" ${selected.includes(id) ? 'selected' : ''}>${esc(name)}</option>`).join('')}</select></label>`;
    const draw = () => {
      const next = { ...state, grantChoices: { ...state.grantChoices, [key]: draft } },
        p = Grants.plans(next).find(p => p.source.key === key);
      if (!p) throw Error('Ese rasgo ya no pertenece a tu personaje.');
      const read = fd => {
        const out = { ...draft, spells: {}, proficiencies: {}, profVariants: { ...draft.profVariants } };
        if (p.profile.groups.length > 1 && p.profile.forced < 0) out.variant = Number(fd.get('variant'));
        if (p.profile.abilities.length) out.ability = String(fd.get('ability') || '');
        if (p.featPlan?.allowed.length && !p.featPlan.fixed.length) out.feats = fd.getAll('feats').filter(Boolean);
        if (p.optionPlan) out.options = fd.getAll('options').filter(Boolean);
        for (const n of p.nodes.filter(n => n.chosen)) {
          const ids = fd.getAll('spell:' + n.id).filter(Boolean);
          if (n.runeSelector) out.runes = ids;
          else out.spells[n.id] = ids;
        }
        for (const g of p.proficiencies.groups) out.proficiencies[g.id] = fd.getAll('prof:' + g.id).filter(Boolean);
        for (const v of p.proficiencies.variants) out.profVariants[v.field] = Number(fd.get('variant:' + v.field));
        if (halfAbility(next, p)?.from) out.featAbility = String(fd.get('featAbility') || '');
        return out;
      };
      let html =
        '<p>Elegí los beneficios de este rasgo. Los beneficios fijos ya se aplican solos. Cambiá las elecciones cuando las reglas del rasgo lo permitan (por ejemplo, al subir de nivel o descansar).</p>';
      if (p.optionPlan)
        html += many(
          'Opciones concedidas (revisá sus requisitos)',
          'options',
          p.optionPlan.allowed.map(id => [id, ClassData.options.find(o => o.id === id).name]),
          p.optionPlan.selected,
          p.optionPlan.count,
        );
      if (p.featPlan?.allowed.length)
        html += p.featPlan.fixed.length
          ? `<p><b>Dote concedida:</b> ${p.featPlan.fixed.map(id => esc(featName(id))).join(', ')}. Configurala en su propia tarjeta.</p>`
          : many(
              'Dote de origen',
              'feats',
              p.featPlan.allowed.map(id => [id, featName(id)]),
              p.featPlan.selected,
              p.featPlan.count,
            );
      if (p.profile.groups.length > 1 && p.profile.forced < 0)
        html += select(
          'Opción de magia',
          'variant',
          [[-1, 'Elegí…'], ...p.profile.groups.map((g, i) => [i, groupLabel(g, i)])],
          p.profile.index,
        );
      if (p.profile.abilities.length)
        html += select(
          'Característica de lanzamiento',
          'ability',
          [['', 'Elegí…'], ...p.profile.abilities.map(id => [id, Rules.attrs[id]])],
          p.profile.ability || '',
        );
      for (const n of p.nodes) {
        if (n.missing) {
          html += `<p class="form-error">Referencia sin resolver: ${esc(n.missing)}.</p>`;
          continue;
        }
        if (n.chosen)
          html += many(
            n.runeSelector
              ? 'Runas conocidas (llevá sus objetos marcados)'
              : n.ritual
                ? 'Rituales del libro (los adicionales requieren copia en mesa)'
                : 'Conjuros concedidos',
            'spell:' + n.id,
            n.candidates
              .map(sp => [sp.id, sp.name + ' · ' + (sp.level ? 'nivel ' + sp.level : 'truco')])
              .sort((a, b) => a[1].localeCompare(b[1], 'es')),
            n.selected,
            n.count,
          );
        else if (n.selected.length && n.mode !== 'expanded')
          html += `<p><b>${n.selected.map(id => esc(spellName(id))).join(', ')}:</b> ${n.ritual ? 'ritual' : n.costResource ? n.cost + ' ' + n.costResource : n.slotRequired ? 'un uso por descanso largo y un espacio de brujo' : n.reset ? (n.max || 1) + ' uso(s) por descanso ' + (n.reset === 'short' ? 'corto o largo' : 'largo') : n.candidates.every(sp => !sp.level) || n.unlimited ? 'sin espacio' : 'según tus espacios'}${n.castLevel ? ' · nivel de lanzamiento ' + n.castLevel : ''}.</p>`;
      }
      for (const v of p.proficiencies.variants)
        html += select(
          names[v.field.replace('Proficiencies', '')] || 'Variante de competencias',
          'variant:' + v.field,
          [[-1, 'Elegí…'], ...v.rows.map((r, i) => [i, Campaign.facts(r)])],
          v.selected ?? -1,
        );
      for (const g of p.proficiencies.groups)
        html += many(
          names[g.kind] || 'Competencias',
          'prof:' + g.id,
          g.from.map(id => [id, term(id)]),
          g.selected,
          g.count,
        );
      const ability = halfAbility(next, p);
      if (ability?.from)
        html += select(
          'Aumento de característica de la dote',
          'featAbility',
          [['', 'Elegí…'], ...ability.from.map(id => [id, Rules.attrs[id] + ' +' + (ability.n || 1)])],
          draft.featAbility || '',
        );
      if (p.source.ref?.text)
        html += `<details><summary>Reglas completas del rasgo (inglés)</summary><p class="pre-wrap">${esc(p.source.ref.text)}</p></details>`;
      modal(
        p.source.name,
        html,
        fd => commit('Beneficios de ' + p.source.name + ' actualizados', s => Grants.configure(s, key, read(fd))),
        'Guardar elecciones',
      );
      const form = document.getElementById('dialog-form');
      form.addEventListener('change', e => {
        if (
          e.target.name === 'variant' ||
          e.target.name.startsWith('variant:') ||
          e.target.name === 'featAbility' ||
          (e.target.name.startsWith('prof:') && p.proficiencies.groups.some(g => g.kind === 'expertise'))
        ) {
          draft = read(new FormData(form));
          if (e.target.name === 'variant') draft.spells = {};
          draw();
        }
      });
    };
    draw();
  }
  function install() {
    Object.assign(actions, {
      'grant-tool': () => {
        const tools = Grants.proficiencies(state, 'tool');
        if (!tools.length) throw Error('Completá tus competencias con herramientas.');
        modal(
          'Prueba con herramientas',
          select(
            'Herramienta',
            'tool',
            tools.map(t => [t, term('tool:' + t)]),
            tools[0],
          ) +
            select('Característica (según el DM)', 'ability', Object.entries(Rules.attrs), 'dex') +
            '<p class="small">Se suma tu competencia y, cuando corresponde, tu Pericia o la Especialización en herramientas del artífice.</p>',
          fd => {
            const tool = fd.get('tool'),
              ability = fd.get('ability'),
              bonus = Grants.toolBonus(state, tool, ability);
            setTimeout(
              () =>
                RollUI.d20({
                  title: term('tool:' + tool),
                  label: Rules.attrs[ability] + ' · ' + term('tool:' + tool),
                  bonus,
                  kind: 'check',
                  ability,
                  min: Classes.views(state).some(v => v.classId === 'rogue' && v.level >= 11) ? 10 : 0,
                }),
              0,
            );
          },
          'Continuar',
        );
      },
      'grant-config': el => configure(el.dataset.key),
      'grant-bonuses': el =>
        commit('Bonos de dotes de origen confirmados', s => {
          const before = Rules.stats(s).maxHP;
          s.originAuto = true;
          if (el.dataset.included === 'true') {
            for (const [k, n] of Object.entries(Grants.abilityBonuses(s))) s.abilities[k] -= n;
            const extra = Grants.originFeats(s)
              .filter(id => !(s.progression?.learnedFeats || []).includes(id))
              .reduce((n, id) => n + (id === 'tough' ? 2 : 0), 0);
            s.hpBase -= extra * Rules.totalLevel(s);
          } else if (s.hp !== null) s.hp += Rules.stats(s).maxHP - before;
        }),
    });
  }
  return { card, configure, install, pending };
})();
