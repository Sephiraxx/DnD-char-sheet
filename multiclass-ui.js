/* Multiclase en la ficha: elegir en qué clase subir, sumar una clase nueva y ver sus rasgos. */
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
        else secondary(t === 'new' ? fd.get('newClass') : t);
        return false;
      },
      'Continuar',
    );
  }

  function secondary(classId) {
    const c = ClassData.classes[classId],
      mc = (state.multiclass || []).find(x => x.classId === classId),
      next = (mc?.level || 0) + 1,
      needsSub = next >= c.subclassLevel && !mc?.subclass,
      warn = [
        !C.meetsPrereq(state, classId) ? `${c.name} pide ${prereqText(classId)}.` : '',
        !mc && !C.meetsPrereq(state, state.classId)
          ? `Tu clase principal pide ${prereqText(state.classId)} para multiclasear.`
          : '',
      ].filter(Boolean);
    modal(
      (mc ? 'Subir a ' : 'Sumar ') + c.name + ' ' + next,
      `${warn.length ? `<div class="banner"><p><b>Requisitos:</b> ${esc(warn.join(' '))} Seguí solo si tu mesa lo permite.</p></div>` : ''}
      ${mc ? '' : `<p><b>Competencias que ganás:</b> ${esc(GAINS[classId])}</p>`}
      <div class="form-grid">${select(
        'Aumento de PG',
        'hpMethod',
        [
          ['fixed', 'Fijo: ' + (c.die / 2 + 1) + ' + CON'],
          ['rolled', 'Tirada de d' + c.die + ' + CON'],
        ],
        'fixed',
      )}${field('Resultado del dado (si tiraste)', 'hpRoll', c.die / 2 + 1, 'number', `min="1" max="${c.die}" required`)}</div>
      ${needsSub ? select('Subclase', 'subclass', [['', 'Elegir…'], ...ClassData.subclasses.filter(x => x.classId === classId).map(x => [x.id, x.name + ' · ' + x.source])]) : ''}
      <p class="small">Los rasgos y recursos de ${esc(c.name)} se suman a la ficha. Los espacios de conjuro usan la tabla de multiclase; el pacto mágico del brujo va aparte. Agregá los conjuros de esta clase desde <b>Conjuros → Todo el catálogo</b>. Si este nivel da Mejora de características, ajustala en Características.</p>`,
      fd => {
        const result = C.levelUpSecondary(state, {
          classId,
          hpMethod: fd.get('hpMethod'),
          hpRoll: Number(fd.get('hpRoll')),
          subclass: fd.get('subclass') || '',
        });
        commit(`Subida de nivel: ${c.name} ${next} (personaje ${C.totalLevel(result)})`, s => {
          for (const k of Object.keys(s)) delete s[k];
          Object.assign(s, result);
        });
        toast(`${c.name} ${next}. Revisá los rasgos nuevos en Clase.`);
      },
      'Subir de nivel',
    );
  }

  // Tarjetas de clases secundarias para la pestaña Clase.
  function section() {
    const list = C.views(state).slice(1);
    if (!state.classId) return '';
    const st = Rules.stats(state);
    return `<section class="card section-space"><div class="card-header"><h2>Multiclase</h2>${button('Subir de nivel', 'levelup', '')}</div>
      <p>Nivel de personaje <b>${C.totalLevel(state)}</b> · Competencia ${sign(st.prof)} · Dados de Golpe ${st.hitDiceSet.map(x => x.count + 'd' + x.die).join(' + ')}${st.pact ? ` · Pacto mágico: ${st.pact.max} espacio(s) de nivel ${st.pact.level}` : ''}</p>
      ${
        list.length
          ? list
              .map(v => {
                const sc = C.sub(v),
                  feats = C.features(v);
                return `<details class="battle-rule"><summary><b>${esc(C.info(v).name)} ${v.level}</b>${sc ? ' · ' + esc(sc.name) : ''}</summary><div class="section-space">${feats.map(f => `<div class="feature"><h3>${esc(f.name)} <span class="small muted">· nivel ${f.level}</span></h3></div>`).join('') || '<p class="muted">Sin rasgos registrados.</p>'}</div></details>`;
              })
              .join('')
          : '<p class="small muted">Una sola clase. Con «Subir de nivel» podés sumar otra clase (multiclase).</p>'
      }</section>`;
  }

  function install() {
    Object.assign(actions, {
      levelup: () => (state.classId ? chooser() : PartyUI.levelup()),
    });
  }
  return { label, section, install };
})();
