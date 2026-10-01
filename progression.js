/* Reglas de elección de bardo 2014. Sin mutaciones hasta confirmar. */
(function (root) {
  'use strict';
  const R = root.Rules;
  const ASI = [4, 8, 12, 16, 19],
    SECRETS = [10, 14, 18];
  function config(s) {
    if (root.Campaign) return { ...s.progression, sources: root.Campaign.selected(s) };
    return (
      s.progression || {
        sources: ['PHB'],
        expanded: false,
        versatility: false,
        magical: false,
        feats: false,
        learnedFeats: [],
      }
    );
  }
  function secret(s) {
    return s.secretKnown || [];
  }
  function spellCount(s) {
    return s.known.filter(id => R.allSpells(s).find(x => x.id === id)?.level > 0 || secret(s).includes(id)).length;
  }
  function cantripCount(s) {
    return s.known.filter(id => R.allSpells(s).find(x => x.id === id)?.level === 0 && !secret(s).includes(id)).length;
  }
  function plan(s) {
    const next = s.level + 1;
    if (next > 20) throw Error('Darien ya llegó a bardo 20.');
    const d = R.stats(s),
      n = R.stats({
        ...s,
        level: next,
        hpBase: s.hpBase + Math.max(1, 5 + R.mod(s.abilities.con)) - R.mod(s.abilities.con),
      }),
      sg = SECRETS.includes(next) ? 2 : 0;
    return {
      next,
      before: d,
      after: n,
      secrets: sg,
      spells: n.known - d.known - sg,
      cantrips: n.cantrips - d.cantrips,
      pending: Math.max(0, d.known - spellCount(s)),
      pendingCantrips: Math.max(0, d.cantrips - cantripCount(s)),
      expertise: [3, 10].includes(next) ? 2 : 0,
      asi: ASI.includes(next),
      college: next === 3,
    };
  }
  function enabled(sp, c) {
    return !sp.sourceKey || sp.sourceKey === 'DM' || (sp.sources || [sp.sourceKey]).some(k => c.sources.includes(k));
  }
  function bard(sp, c) {
    return sp.bard && (!sp.optionalBard || c.expanded);
  }
  function available(s, c, level, kind = 'bard') {
    return R.allSpells(s).filter(
      x => enabled(x, c) && x.level <= R.slots[level].length && (kind === 'any' || bard(x, c)),
    );
  }
  function draft(s) {
    let p = plan(s);
    return {
      from: s.level,
      config: JSON.parse(JSON.stringify(config(s))),
      hpMethod: 'fixed',
      hpRoll: 5,
      college: s.subclass,
      expertise: [],
      asi: 'scores',
      a1: 'dex',
      a2: 'cha',
      feat: '',
      featNotes: '',
      featConfirmed: false,
      pending: [],
      cantrips: [],
      spells: [],
      secrets: [],
      replaceOut: '',
      replaceIn: '',
      versatility: 'none',
      cantripOut: '',
      cantripIn: '',
      expertiseOut: '',
      expertiseIn: '',
      reviewed: false,
    };
  }
  function validSelections(s, d) {
    const p = plan(s),
      known = new Set([...s.known, ...s.extras]);
    let all = new Set();
    const pick = (ids, count, lvl, kind, zero) => {
      if (ids.length !== count) throw Error('Faltan elecciones: necesitás ' + count + ' en esta sección.');
      for (const id of ids) {
        const sp = R.allSpells(s).find(x => x.id === id);
        if (
          !sp ||
          !available(s, d.config, lvl, kind).some(x => x.id === id) ||
          (zero ? sp.level !== 0 : sp.level === 0)
        )
          throw Error('Conjuro no disponible para esta elección.');
        if (known.has(id) || all.has(id)) throw Error('No podés aprender dos veces el mismo conjuro.');
        all.add(id);
      }
    };
    pick(d.pending, p.pending, s.level, 'bard', false);
    pick(d.cantrips, p.cantrips + p.pendingCantrips, p.next, 'bard', true);
    pick(d.spells, p.spells, p.next, 'bard', false);
    if (d.secrets.length !== p.secrets) throw Error('Elegí ' + p.secrets + ' Secretos mágicos.');
    for (const id of d.secrets) {
      if (known.has(id) || all.has(id) || !available(s, d.config, p.next, 'any').some(x => x.id === id))
        throw Error('Secreto mágico no disponible o repetido.');
      all.add(id);
    }
    if (d.replaceOut) {
      const old = R.allSpells(s).find(x => x.id === d.replaceOut);
      if (!s.known.includes(d.replaceOut) || !old || old.level === 0)
        throw Error('Solo podés reemplazar un conjuro de nivel 1+ que ya conocías.');
      if (
        !d.replaceIn ||
        known.has(d.replaceIn) ||
        all.has(d.replaceIn) ||
        !available(s, d.config, p.next).some(x => x.id === d.replaceIn && x.level > 0)
      )
        throw Error('Elegí un reemplazo válido de la lista de bardo.');
      all.add(d.replaceIn);
    } else if (d.replaceIn) throw Error('Elegí primero qué conjuro reemplazar.');
    if (d.versatility !== 'none') {
      if (!p.asi || !d.config.versatility) throw Error('Versatilidad no está habilitada para este nivel.');
      if (d.versatility === 'cantrip') {
        if (
          !s.known.includes(d.cantripOut) ||
          secret(s).includes(d.cantripOut) ||
          !R.allSpells(s).some(x => x.id === d.cantripOut && x.level === 0)
        )
          throw Error('Elegí un truco de bardo que ya conozcas.');
        if (
          known.has(d.cantripIn) ||
          all.has(d.cantripIn) ||
          !available(s, d.config, p.next).some(x => x.id === d.cantripIn && x.level === 0)
        )
          throw Error('Elegí un nuevo truco válido.');
      } else if (d.versatility === 'expertise') {
        if (
          !s.expertise.includes(d.expertiseOut) ||
          !s.proficiencies.includes(d.expertiseIn) ||
          s.expertise.includes(d.expertiseIn) ||
          d.expertise.includes(d.expertiseIn)
        )
          throw Error('Elegí una Pericia actual y otra habilidad con competencia sin Pericia.');
      } else throw Error('Opción de Versatilidad inválida.');
    }
    return p;
  }
  function apply(s, d) {
    if (d.from !== s.level) throw Error('El nivel cambió desde que abriste la guía. Volvé a abrirla.');
    const p = validSelections(s, d),
      n = JSON.parse(JSON.stringify(s));
    if (
      p.expertise &&
      (d.expertise.length !== 2 ||
        new Set(d.expertise).size !== 2 ||
        d.expertise.some(x => !s.proficiencies.includes(x) || s.expertise.includes(x)))
    )
      throw Error('Elegí dos habilidades distintas con competencia y sin Pericia.');
    if (p.college && !['eloquence', 'manual'].includes(d.college)) throw Error('Elegí un colegio.');
    if (d.hpMethod !== 'fixed' && d.hpMethod !== 'rolled') throw Error('Elegí cómo aumentar los PG.');
    let raw = d.hpMethod === 'fixed' ? 5 : Number(d.hpRoll);
    if (!Number.isInteger(raw) || raw < 1 || raw > 8) throw Error('El d8 debe ser de 1 a 8.');
    let feat = null;
    if (p.asi) {
      if (d.asi === 'scores') {
        if (!Object.hasOwn(R.attrs, d.a1) || !Object.hasOwn(R.attrs, d.a2)) throw Error('Elegí las características.');
        n.abilities[d.a1]++;
        n.abilities[d.a2]++;
        if (n.abilities[d.a1] > 20 || n.abilities[d.a2] > 20) throw Error('La mejora no puede superar 20.');
      } else if (d.asi === 'feat') {
        if (!d.config.feats) throw Error('Habilitá las dotes con tu DM.');
        feat = root.Catalog.feats.find(x => x.id === d.feat);
        if (!feat || !enabled(feat, d.config)) throw Error('Elegí una dote de una fuente habilitada.');
        if (config(s).learnedFeats.includes(d.feat) && !feat.repeatable) throw Error('Ya tenés esta dote.');
        if (!d.featConfirmed || !d.featNotes.trim())
          throw Error('Revisá requisitos y anotá las elecciones y ajustes de la dote.');
      } else throw Error('Elegí mejora o dote.');
    }
    n.level = p.next;
    n.subclass = p.college ? d.college : n.subclass;
    n.hpBase += Math.max(1, raw + R.mod(n.abilities.con)) - R.mod(n.abilities.con);
    n.known = [...n.known, ...d.pending, ...d.cantrips, ...d.spells, ...d.secrets];
    n.secretKnown = [...secret(n), ...d.secrets];
    if (d.replaceOut) {
      n.known = n.known.filter(x => x !== d.replaceOut).concat(d.replaceIn);
      n.secretKnown = n.secretKnown.filter(x => x !== d.replaceOut);
    }
    n.expertise.push(...d.expertise);
    if (d.versatility === 'cantrip') n.known = n.known.filter(x => x !== d.cantripOut).concat(d.cantripIn);
    if (d.versatility === 'expertise')
      n.expertise = n.expertise.filter(x => x !== d.expertiseOut).concat(d.expertiseIn);
    n.progression = JSON.parse(JSON.stringify(d.config));
    if (root.Campaign) n.campaignSources = d.config.sources.slice();
    if (feat) {
      n.progression.learnedFeats.push(feat.id);
      n.features.push({ name: feat.name, text: 'Dote — ' + feat.source + '. ' + d.featNotes });
    }
    const nd = R.stats(n);
    if (n.hp !== null) n.hp = Math.min(n.hp, nd.maxHP);
    R.slots[p.next].forEach((v, i) => {
      if (!p.before.slots[i]) n.slotsSpent[i] = 0;
    });
    if (n.concentration && !n.known.includes(n.concentration) && !n.extras.includes(n.concentration))
      n.concentration = null;
    if (spellCount(n) !== nd.known || cantripCount(n) !== nd.cantrips)
      throw Error(
        'El repertorio previo necesita revisión antes de subir. Revisá conocidos y Secretos mágicos en Conjuros.',
      );
    const names = ids => ids.map(id => R.allSpells(n).find(x => x.id === id)?.name).join(', ');
    let notes = ['PG máximos ' + p.before.maxHP + ' → ' + nd.maxHP];
    if (d.pending.length) notes.push('Pendientes: ' + names(d.pending));
    if (d.cantrips.length) notes.push('Trucos: ' + names(d.cantrips));
    if (d.spells.length) notes.push('Conjuros: ' + names(d.spells));
    if (d.secrets.length) notes.push('Secretos: ' + names(d.secrets));
    if (d.replaceOut) notes.push('Reemplazo: ' + names([d.replaceOut]) + ' → ' + names([d.replaceIn]));
    if (d.expertise.length)
      notes.push('Pericia: ' + d.expertise.map(id => R.skills.find(x => x[0] === id)[1]).join(', '));
    if (p.asi) notes.push(feat ? 'Dote: ' + feat.name : R.attrs[d.a1] + ' +1, ' + R.attrs[d.a2] + ' +1');
    n.levelHistory.push({ level: p.next, note: notes.join(' · ').slice(0, 1000) });
    return R.validate(n);
  }
  root.Progression = {
    config,
    secret,
    spellCount,
    cantripCount,
    plan,
    enabled,
    bard,
    available,
    draft,
    validSelections,
    apply,
  };
  if (typeof module !== 'undefined') module.exports = root.Progression;
})(typeof window !== 'undefined' ? window : globalThis);
