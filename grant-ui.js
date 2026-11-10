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
  // Una dote como una elección de clase: qué hace, qué aplica la ficha y qué queda para la mesa.
  function featInfo(s, id) {
    const d = FeatFX.describe(id, s);
    const origin = (s.progression?.bonusFeats || []).includes(id)
      ? 'Dote adicional'
      : (s.progression?.learnedFeats || []).includes(id)
        ? 'Elegida al subir de nivel'
        : 'De tu origen';
    return `<p class="small muted">${esc(origin)}${d.prereq ? ' · Requisito: ' + esc(d.prereq) : ''}${d.homebrew ? ' · Homebrew' : ''}</p>${d.brief ? `<p>${esc(d.brief)}</p>` : ''}${d.auto.length ? `<p class="small"><b>La ficha lo aplica sola:</b> ${esc(d.auto.join(' · '))}.</p>` : ''}${d.manual.length ? `<p class="small"><b>En la mesa:</b> ${esc(d.manual.join(' '))}</p>` : ''}${typeof OfficialContent !== 'undefined' ? OfficialContent.html(OfficialContent.ruleTexts.get('feat:' + id)) : ''}${typeof LibraryText !== 'undefined' ? LibraryText.html(LibraryText.feat(id)) : ''}`;
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
        return `<details class="section-space" ${status ? 'open' : ''}><summary><b>${esc(p.source.name)}</b> · ${status ? 'Faltan elecciones' : p.source.kind === 'feat' ? 'Qué hace' : 'Ver beneficios'}</summary><div class="section-space">${p.source.kind === 'feat' ? featInfo(s, p.source.id) : ''}${p.featPlan?.selected.length ? `<p><b>Dotes:</b> ${p.featPlan.selected.map(id => esc(featName(id))).join(', ')}.</p>` : ''}${list.length ? `<p><b>Conjuros:</b> ${[...new Set(list.map(g => spellName(g.id)))].map(esc).join(', ')}.</p>` : ''}${[
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
          )}${button(status ? 'Completar elecciones' : 'Revisar elecciones', 'grant-config', 'secondary', `data-key="${esc(p.source.key)}"`)}${p.source.kind === 'feat' && (s.progression?.bonusFeats || []).includes(p.source.id) ? button('Quitar dote adicional', 'feat-remove', 'secondary danger-text', `data-id="${esc(p.source.id)}"`) : ''}</div></details>`;
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
  // ---------- Dotes adicionales (fuera de una mejora de característica) ----------
  // Una dote que da el DM, una recompensa o un rasgo homebrew: se elige de la lista (oficiales y homebrew),
  // se aplican sus efectos como al subir de nivel y queda marcada como adicional para poder quitarla.
  const SKILL = id => Rules.skills.find(x => x[0] === id)?.[1] || id;
  // Pantalla completa con tarjetas, como el selector de conjuros: cada dote dice qué hace antes de elegirla.
  let featHost = null,
    featQuery = '',
    featScope = 'available',
    featOpen = '';
  const canonText = v =>
    String(v || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase();
  const originOf = (s, id) =>
    (s.progression?.bonusFeats || []).includes(id)
      ? 'Dote adicional'
      : (s.progression?.learnedFeats || []).includes(id)
        ? 'Elegida al subir de nivel'
        : Grants.originFeats(s).includes(id)
          ? 'De tu origen'
          : '';
  function addFeat() {
    featQuery = '';
    featScope = 'available';
    featOpen = '';
    if (!featHost) {
      featHost = document.createElement('div');
      featHost.id = 'featbook';
      featHost.className = 'creator-host';
      featHost.setAttribute('role', 'dialog');
      featHost.setAttribute('aria-modal', 'true');
      featHost.setAttribute('aria-label', 'Dotes');
      document.body.append(featHost);
      featHost.addEventListener('click', featClick);
      featHost.addEventListener('input', e => {
        if (e.target.name !== 'fq') return;
        featQuery = e.target.value;
        const pos = e.target.selectionStart;
        drawFeats();
        const q = featHost.querySelector('[name=fq]');
        q?.focus();
        q?.setSelectionRange(pos, pos);
      });
      featHost.addEventListener('keydown', e => e.key === 'Escape' && closeFeats());
    }
    document.getElementById('modal')?.open && document.getElementById('modal').close();
    featHost.hidden = false;
    document.body.classList.add('creator-open');
    drawFeats();
    globalThis.OverlayFocus?.open(featHost);
  }
  function closeFeats() {
    if (!featHost) return;
    featHost.hidden = true;
    document.body.classList.remove('creator-open');
    globalThis.OverlayFocus?.close(featHost);
  }
  function drawFeats() {
    const s = state,
      have = new Set(Grants.feats(s)),
      top = featHost.querySelector('.creator-body')?.scrollTop || 0;
    const list = Catalog.feats
      .filter(f => {
        if (featScope === 'mine') return have.has(f.id);
        if (featScope === 'homebrew') return f.homebrew;
        return Campaign.enabled(s, f) || have.has(f.id);
      })
      .filter(f => {
        if (!featQuery) return true;
        const d = FeatFX.describe(f.id, s);
        return canonText(f.name + ' ' + (f.english || '') + ' ' + d.brief).includes(canonText(featQuery));
      })
      .sort((a, b) => Number(have.has(b.id)) - Number(have.has(a.id)) || a.name.localeCompare(b.name, 'es'));
    const count = label => [...have].filter(id => originOf(s, id) === label).length;
    const meters = [
      ['Elegidas al subir de nivel', count('Elegida al subir de nivel')],
      ['Adicionales', count('Dote adicional')],
      ['De tu origen', count('De tu origen')],
    ]
      .filter(([, n]) => n)
      .map(([l, n]) => `<span class="tag">${l} <b>${n}</b></span>`)
      .join('');
    const chip = (v, label) =>
      `<button type="button" class="chip ${featScope === v ? 'selected' : ''}" data-fb="scope" data-v="${v}" aria-pressed="${featScope === v}">${label}</button>`;
    const card = f => {
      const d = FeatFX.describe(f.id, s),
        mine = have.has(f.id),
        origin = mine ? originOf(s, f.id) : '',
        open = featOpen === f.id;
      const head = `<span class="creator-card-title">${esc(f.name)}</span><span class="creator-meta">${esc(f.homebrew ? 'Homebrew' : f.sourceKey || '')}${d.prereq ? ' · Requisito: ' + esc(d.prereq) : ''}${f.repeatable ? ' · Repetible' : ''}</span>${origin ? `<span class="tag spell-status">${esc(origin)}</span>` : ''}`;
      const brief = d.brief || d.auto.join(' · ');
      if (!open)
        return `<button type="button" class="creator-card ${mine ? 'selected' : ''}" data-fb="open" data-id="${esc(f.id)}" aria-expanded="false">${head}<span class="creator-brief">${esc(brief.length > 220 ? brief.slice(0, 219) + '…' : brief)}</span></button>`;
      const can = (!mine || f.repeatable) && Campaign.enabled(s, f);
      return `<div class="creator-card selected spell-open"><button type="button" class="spell-open-head" data-fb="open" data-id="${esc(f.id)}" aria-expanded="true">${head}</button>${featInfo(s, f.id).replace(/^<p class="small muted">[^<]*<\/p>/, '')}${can ? picksForm(f.id) : ''}${
        (s.progression?.bonusFeats || []).includes(f.id)
          ? `<div class="actions"><button type="button" class="button secondary danger-text" data-fb="remove" data-id="${esc(f.id)}">Quitar dote adicional</button></div>`
          : ''
      }</div>`;
    };
    featHost.innerHTML = `<div class="creator-shell"><header class="creator-head"><div><p class="eyebrow">DOTES · ${esc(Classes.label(s)).toUpperCase()}</p><h1>Tus dotes</h1></div><div class="actions"><button type="button" class="button secondary" data-fb="close">Cerrar</button></div></header><div class="creator-rail spell-meters">${meters || '<span class="small muted">Todavía no tenés dotes.</span>'}</div><div class="creator-body"><div id="featbook-error" class="creator-error" role="alert"></div><div class="creator-search"><input type="search" name="fq" value="${esc(featQuery)}" placeholder="Buscar por nombre o por lo que hace" aria-label="Buscar dote"></div><div class="chips spell-filter">${chip('available', 'Libros habilitados')}${chip('mine', 'Mis dotes')}${Catalog.feats.some(f => f.homebrew) ? chip('homebrew', 'Homebrew') : ''}</div><p class="small">${list.length} dotes. Tocá una para ver qué hace. Al subir de nivel, la dote se elige en «Mejora o dote»; acá podés sumar una adicional (la que da el DM, una recompensa o un rasgo).</p><div class="creator-grid small-cards">${list.map(card).join('') || '<p class="muted">Ninguna dote coincide.</p>'}</div></div><footer class="creator-foot"><p class="creator-summary">${esc(s.name)}: revisá los requisitos con tu DM.</p><div class="actions"><button type="button" class="button" data-fb="close">Listo</button></div></footer></div>`;
    const b = featHost.querySelector('.creator-body');
    if (b) b.scrollTop = top;
  }
  // Lo que hay que elegir al sumarla (característica, habilidades, pericia) y un motivo, dentro de la tarjeta.
  function picksForm(id) {
    const nd = FeatFX.needs(id, state),
      prof = new Set(state.proficiencies || []);
    return `<form class="feat-picks" data-feat="${esc(id)}">${
      nd.ability
        ? `<label class="field">Característica que sube +1<select name="ability"><option value="">Elegí…</option>${nd.ability.map(k => `<option value="${k}">${esc(Rules.attrs[k])} (${state.abilities[k]})</option>`).join('')}</select></label>`
        : ''
    }${
      nd.skills
        ? `<fieldset><legend>Elegí ${nd.skills.n} habilidad(es)</legend><div class="hb-checks">${nd.skills.from.map(k => `<label class="check"><input type="checkbox" name="skills" value="${k}" /> ${esc(SKILL(k))}</label>`).join('')}</div></fieldset>`
        : ''
    }${
      nd.expertise
        ? `<label class="field">Pericia en<select name="expertise"><option value="">Elegí…</option>${Rules.skills
            .filter(([k]) => !(state.expertise || []).includes(k))
            .map(
              ([k, n]) =>
                `<option value="${k}">${esc(n)}${prof.has(k) ? '' : ' (con la competencia que elijas arriba)'}</option>`,
            )
            .join('')}</select></label>`
        : ''
    }<label class="field">Motivo <span class="muted">(opcional)</span><input name="note" maxlength="200" placeholder="Recompensa del DM, rasgo de la campaña…" /></label><div class="actions"><button type="button" class="button" data-fb="add" data-id="${esc(id)}">Agregar como dote adicional</button></div></form>`;
  }
  function featClick(e) {
    const t = e.target.closest('[data-fb]');
    if (!t || t.disabled) return;
    const a = t.dataset.fb,
      err = featHost.querySelector('#featbook-error');
    try {
      if (a === 'close') return closeFeats();
      if (a === 'scope') featScope = t.dataset.v;
      if (a === 'open') featOpen = featOpen === t.dataset.id ? '' : t.dataset.id;
      if (a === 'add') {
        const form = t.closest('form');
        const fd = new FormData(form);
        applyFeat(
          t.dataset.id,
          {
            ability: String(fd.get('ability') || '') || undefined,
            skills: fd.getAll('skills').map(String),
            expertise: fd.get('expertise') ? [String(fd.get('expertise'))] : [],
          },
          String(fd.get('note') || '').trim(),
        );
      }
      if (a === 'remove') return removeFeat(t.dataset.id, () => !featHost.hidden && drawFeats());
      drawFeats();
    } catch (x) {
      if (err) {
        err.textContent = x.message;
        err.scrollIntoView({ block: 'nearest' });
      }
    }
  }
  function applyFeat(id, picks, note) {
    const f = Catalog.feats.find(x => x.id === id);
    FeatFX.checkPicks(id, state, picks);
    commit('Dote adicional: ' + f.name, s => {
      s.progression.learnedFeats.push(id);
      s.progression.bonusFeats = [...(s.progression.bonusFeats || []), id];
      FeatFX.onGain(s, id, picks);
      s.features.push({ name: f.name, text: 'Dote: adicional' + (note ? ' · ' + note : '') });
    });
    toast(`Agregaste ${f.name}.`);
  }
  // Quitar una dote adicional: deshace lo que aplicó al ganarla (características, habilidades y pericias).
  function removeFeat(id, after) {
    const f = Catalog.feats.find(x => x.id === id);
    const name = f?.name || id;
    confirmAction(
      'Quitar dote adicional',
      `Se quita ${name} y lo que sumó al ganarla (características, habilidades y pericias que eligió). Revisá después tus competencias si alguna venía también de otro lado.`,
      () =>
        commit('Dote adicional quitada: ' + name, s => {
          const drop = (arr, v) => {
            const i = arr.lastIndexOf(v);
            if (i >= 0) arr.splice(i, 1);
          };
          drop(s.progression.learnedFeats, id);
          drop(s.progression.bonusFeats, id);
          if (!s.progression.bonusFeats.length) delete s.progression.bonusFeats;
          const e = FeatData[id] || {},
            pick = s.progression.featChoices?.[id] || {};
          if (!s.progression.learnedFeats.includes(id)) {
            for (const [k, v] of Object.entries(e.ability?.fixed || {}))
              s.abilities[k] = Math.max(1, s.abilities[k] - v);
            if (pick.ability) s.abilities[pick.ability] = Math.max(1, s.abilities[pick.ability] - 1);
            const sk = new Set([...(e.skills?.fixed || []), ...(pick.skills || [])]);
            s.proficiencies = (s.proficiencies || []).filter(k => !sk.has(k));
            s.expertise = (s.expertise || []).filter(k => !(pick.expertise || []).includes(k) && !sk.has(k));
            if (s.progression.featChoices) delete s.progression.featChoices[id];
          }
          const i = s.features.findIndex(x => x.name === name && /^Dote: adicional/.test(x.text || ''));
          if (i >= 0) s.features.splice(i, 1);
          setTimeout(() => after?.(), 0);
        }),
      'Quitar',
    );
  }
  function install() {
    Object.assign(actions, {
      'feat-add': addFeat,
      'feat-remove': el => removeFeat(el.dataset.id),
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
  return { card, configure, install, pending, featInfo };
})();
