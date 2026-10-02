/* Multiclase en la ficha: elegir en qué clase subir, sumar una clase nueva y ver sus rasgos,
   conjuros y opciones. La subida en sí la guía LevelUp, igual que para la clase principal. */
const MulticlassUI = (() => {
  'use strict';
  const C = Classes;
  // Competencias al sumar la clase por multiclase (PHB p. 164; Tasha para el artífice).
  const GAINS = {
    artificer: 'Armadura ligera y media, escudos, herramientas de ladrón y de hojalatero.',
    barbarian: 'Escudos, armas simples y marciales.',
    bard: 'Armadura ligera, una habilidad a elección y un instrumento musical.',
    cleric: 'Armadura ligera y media, escudos.',
    druid: 'Armadura ligera y media, escudos (no de metal).',
    fighter: 'Armadura ligera y media, escudos, armas simples y marciales.',
    monk: 'Armas simples y espadas cortas.',
    paladin: 'Armadura ligera y media, escudos, armas simples y marciales.',
    ranger: 'Armadura ligera y media, escudos, armas simples y marciales, una habilidad de la lista del explorador.',
    rogue: 'Armadura ligera, una habilidad de la lista del pícaro y herramientas de ladrón.',
    sorcerer: 'Ninguna.',
    warlock: 'Armadura ligera y armas simples.',
    wizard: 'Ninguna.',
  };
  const prereqText = cid => C.PREREQ[cid].map(g => g.map(a => Rules.attrs[a] + ' 13').join(' y ')).join(' o ');

  function label(s, withSub = false) {
    return s.classId ? C.label(s, withSub) : 'Bardo ' + s.level;
  }

  // Elegir en qué clase sube el personaje.
  function chooser() {
    if (C.totalLevel(state) >= 20) throw Error('Ya estás en nivel 20 de personaje.');
    const taken = C.views(state).map(v => v.classId);
    const others = Object.entries(ClassData.classes)
      .filter(([id]) => !taken.includes(id))
      .sort((a, b) => a[1].name.localeCompare(b[1].name, 'es'));
    modal(
      'Subir de nivel',
      `<p>Nivel de personaje ${C.totalLevel(state)} → ${C.totalLevel(state) + 1}. Elegí en qué clase ganás el nivel.</p>
      <div class="stack">${C.views(state)
        .map(
          (v, i) =>
            `<label class="check"><input type="radio" name="target" value="${i ? v.classId : 'primary'}" ${i ? '' : 'checked'}>${esc(C.info(v).name)} ${v.level} → ${v.level + 1}${i ? '' : ' (clase principal)'}</label>`,
        )
        .join('')}
      <label class="check"><input type="radio" name="target" value="new">Multiclase: sumar una clase nueva</label>
      ${select(
        'Clase nueva',
        'newClass',
        others.map(([id, c]) => [id, c.name + (C.meetsPrereq(state, id) ? '' : ' · no cumple requisitos')]),
      )}</div>
      <p class="small">Para multiclasear se necesita 13 o más en la característica principal de tu clase actual y de la nueva. La mesa puede hacer excepciones.</p>`,
      fd => {
        const t = fd.get('target');
        if (t === 'primary') PartyUI.levelup();
        else LevelUp.startFor(t === 'new' ? fd.get('newClass') : t);
        return false;
      },
      'Continuar',
    );
  }

  // Aviso del primer paso de la guía: requisitos y, si la clase es nueva, competencias que da.
  function joinNotes(s, classId, isNew) {
    const c = ClassData.classes[classId],
      warn = [
        !C.meetsPrereq(s, classId) ? `${c.name} pide ${prereqText(classId)}.` : '',
        isNew && !C.meetsPrereq(s, s.classId)
          ? `Tu clase principal pide ${prereqText(s.classId)} para multiclasear.`
          : '',
      ].filter(Boolean);
    return `${warn.length ? `<div class="banner"><p><b>Requisitos:</b> ${esc(warn.join(' '))} Seguí solo si tu mesa lo permite.</p></div>` : ''}${isNew ? `<section class="card"><h2>Sumás ${esc(c.name)}</h2><p><b>Competencias que ganás:</b> ${esc(GAINS[classId])}</p><p class="small">Los espacios de conjuro se calculan con la tabla de multiclase; los conjuros que conocés o preparás siguen la tabla de cada clase por separado.</p></section>` : ''}`;
  }

  // Tarjetas de clases secundarias para la pestaña Clase.
  function section() {
    const list = C.views(state).slice(1);
    const st = Rules.stats(state);
    return `<section class="card section-space"><div class="card-header"><h2>Multiclase</h2>${button('Subir de nivel', 'levelup', '')}</div>
      <p>Nivel de personaje <b>${C.totalLevel(state)}</b> · Competencia ${sign(st.prof)} · Dados de Golpe ${st.hitDiceSet.map(x => x.count + 'd' + x.die).join(' + ')}${st.pact ? ` · Pacto mágico: ${st.pact.max} espacio(s) de nivel ${st.pact.level}` : ''}</p>
      ${
        list.length
          ? list
              .map(v => {
                const sc = C.sub(v),
                  feats = C.features(v),
                  cast = C.casting(v),
                  st = Rules.stats(v),
                  spellNames = ids =>
                    ids.map(id => Rules.allSpells(state).find(x => x.id === id)?.name || id).join(', '),
                  usable = (v.known || []).filter(
                    id =>
                      !['prepared', 'book'].includes(cast.type) ||
                      (v.prepared || []).includes(id) ||
                      Rules.allSpells(state).find(x => x.id === id)?.level === 0,
                  ),
                  opts = Object.entries(v.classChoices || {}).filter(([, ids]) => ids.length),
                  pending = C.taskDetails(v).filter(t => t.action !== 'class-config');
                return `<details class="battle-rule" ${pending.length ? 'open' : ''}><summary><b>${esc(C.info(v).name)} ${v.level}</b>${sc ? ' · ' + esc(sc.name) : ''}${pending.length ? ' · <span class="tag">' + pending.length + ' pendiente(s)</span>' : ''}</summary><div class="section-space">${
                  cast.caster
                    ? `<p class="small">Conjuros de ${esc(C.info(v).name)} · CD ${st.dc} · Ataque ${sign(st.attack)} (${esc(Rules.attrs[cast.ability])})</p><p>${usable.length ? esc(spellNames(usable)) : '<span class="muted">Sin conjuros elegidos.</span>'}</p>${C.granted(v).prepared.length + C.granted(v).known.length ? `<p class="small">Siempre preparados por la subclase: ${esc(spellNames([...C.granted(v).prepared, ...C.granted(v).known]))}</p>` : ''}`
                    : ''
                }${opts.map(([g, ids]) => `<p class="small"><b>${esc(NamesEs.choice(g))}:</b> ${esc(ids.map(id => ClassData.options.find(o => o.id === id)?.name || id).join(', '))}</p>`).join('')}${pending.length ? `<ul class="small">${pending.map(t => `<li>${esc(t.text)}</li>`).join('')}</ul>` : ''}<div class="actions">${cast.caster ? button('Conjuros', 'mc-spells', 'secondary', `data-id="${v.classId}"`) : ''}${C.choices(v).length ? button('Opciones', 'mc-options', 'secondary', `data-id="${v.classId}"`) : ''}</div>${feats.map(f => `<div class="feature"><h3>${esc(f.name)} <span class="small muted">· nivel ${f.level}</span></h3></div>`).join('') || '<p class="muted">Sin rasgos registrados.</p>'}</div></details>`;
              })
              .join('')
          : '<p class="small muted">Una sola clase. Con «Subir de nivel» podés sumar otra clase (multiclase).</p>'
      }</section>`;
  }

  function install() {
    Object.assign(actions, {
      levelup: () => chooser(),
      'mc-spells': e => LevelUp.startFor(e.dataset.id, 'spells'),
      'mc-options': e => LevelUp.startFor(e.dataset.id, 'options'),
    });
  }
  return { label, section, joinNotes, install };
})();
