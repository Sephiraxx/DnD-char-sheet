/* Ficha completa para imprimir o guardar como PDF: características, combate, ataques, rasgos,
   conjuros, equipo, objetos mágicos y compañeros, en hojas claras. Se arma al momento y usa el
   diálogo de impresión del navegador («Guardar como PDF»). */
const PrintSheet = (() => {
  'use strict';
  const R = Rules,
    C = Classes;
  const e = v => esc(v ?? '');
  const sg = n => (n >= 0 ? '+' : '') + n;
  const box = (label, value, sub = '') =>
    `<div class="ps-box"><span>${e(label)}</span><b>${value}</b>${sub ? `<small>${sub}</small>` : ''}</div>`;
  const section = (title, body) => (body ? `<section class="ps-sec"><h2>${e(title)}</h2>${body}</section>` : '');

  function header(s, d) {
    return `<header class="ps-head"><div><h1>${e(s.name)}</h1><p>${e(MulticlassUI.label(s, true))} · ${e(s.race || 'Raza por registrar')} · ${e(s.background || 'Trasfondo por registrar')}</p></div><div class="ps-meta"><span>Nivel de personaje <b>${R.totalLevel(s)}</b></span>${s.xp ? `<span>PX <b>${s.xp}</b></span>` : ''}<span>Competencia <b>${sg(d.prof)}</b></span><span>D&amp;D 5e · reglas 2014</span></div></header>`;
  }
  function abilities(s) {
    const sc = R.scores(s),
      saves = new Set([...(C.info(s).saves || []), ...(FeatFX?.saves(s) || [])]);
    return `<div class="ps-abilities">${Object.entries(R.attrs)
      .map(([k, label]) => {
        const mod = Math.floor((sc[k] - 10) / 2);
        return `<div class="ps-ability"><span>${e(label)}</span><b>${sg(mod)}</b><small>${sc[k]}${sc[k] !== s.abilities[k] ? ' (objeto)' : ''}</small><em>${saves.has(k) ? '●' : '○'} Salvación ${sg(R.saveBonus(s, k))}</em></div>`;
      })
      .join('')}</div>`;
  }
  function skills(s) {
    return `<ul class="ps-skills">${R.skills
      .map(([id, label, ab]) => {
        const mark = s.expertise.includes(id) ? '◆' : s.proficiencies.includes(id) ? '●' : '○';
        return `<li>${mark} <span>${e(label)}</span> <small>(${e(String(R.attrs[ab]).slice(0, 3))})</small><b>${sg(R.skillBonus(s, id))}</b></li>`;
      })
      .join('')}</ul><p class="ps-note">● competencia · ◆ pericia</p>`;
  }
  function combat(s, d) {
    const def = Defenses.of(s),
      passive = 10 + R.skillBonus(s, 'perception') + (FeatFX?.passive(s, 'perception') || 0),
      list = (m, w) => [...m.keys()].map(t => Defenses.label(t)).join(', ') || w;
    return `<div class="ps-boxes">${box('CA', d.ac)}${box('Iniciativa', sg(d.initiative))}${box('Velocidad', d.speed, 'pies')}${box('PG máximos', d.maxHP, `actuales ${s.hp ?? '—'}${s.temp ? ' · temp ' + s.temp : ''}`)}${box('Dados de Golpe', d.hitDiceSet.map(x => x.count + 'd' + x.die).join(' + '))}${box('Percepción pasiva', passive)}</div><p class="ps-line"><b>Salvaciones de muerte:</b> éxitos ○○○ · fallos ○○○${def.resist.size ? ` · <b>Resistencias:</b> ${e(list(def.resist))}` : ''}${def.immune.size ? ` · <b>Inmunidades:</b> ${e(list(def.immune))}` : ''}${def.conditions.length ? ` · <b>Inmune a:</b> ${e(def.conditions.join(', '))}` : ''}</p>`;
  }
  function attacks(s) {
    const rows = Attacks.options(s)
      .map(item => Attacks.profile(s, item))
      .filter(Boolean);
    if (!rows.length) return '';
    return `<table class="ps-table"><thead><tr><th>Ataque</th><th>Bono</th><th>Daño</th><th>Notas</th></tr></thead><tbody>${rows
      .map(
        p =>
          `<tr><td>${e(p.name)}</td><td>${sg(p.toHit)}</td><td>${e(p.dice)}${p.dmgMod ? ' ' + sg(p.dmgMod) : ''} ${e(p.type || '')}${p.extra ? ' + ' + e(p.extra) : ''}</td><td>${e([p.weapon?.range ? p.weapon.range + ' pies' : '', ...(p.weapon?.props || [])].filter(Boolean).join(', '))}</td></tr>`,
      )
      .join('')}</tbody></table>`;
  }
  function proficiencies(s) {
    const p = Campaign.proficiencyText?.(s);
    return `<p class="ps-line">${p ? `<b>Armaduras:</b> ${e(p.armor)} · <b>Armas:</b> ${e(p.weapons)}<br>` : ''}<b>Idiomas:</b> ${e(s.languages || '—')}</p>`;
  }
  function features(s) {
    const blocks = C.views(s).map(v => {
      const list = C.features(v).filter(f => !/^(Ability Score Improvement|Mejora de caracter)/i.test(f.name));
      return `<div><h3>${e(C.info(v).name)} ${v.level}${C.sub(v) ? ' · ' + e(C.sub(v).name) : ''}</h3><p>${list.map(f => e(f.name)).join(' · ') || '—'}</p></div>`;
    });
    const choices = C.views(s)
      .flatMap(v => Object.entries(v.classChoices || {}))
      .filter(([, ids]) => ids.length)
      .map(
        ([g, ids]) =>
          `<b>${e(NamesEs.choice(g))}:</b> ${e(ids.map(id => ClassData.options.find(o => o.id === id)?.name || id).join(', '))}`,
      );
    const feats = (FeatFX?.report(s) || []).map(
      f => `<b>${e(f.name)}</b>${f.auto.length ? ': ' + e(f.auto.join(' · ')) : ''}`,
    );
    const race = Campaign.race(s);
    return `<div class="ps-cols">${blocks.join('')}${race?.traits?.length ? `<div><h3>${e(race.name)}</h3><p>${e(race.traits.join(' · '))}</p></div>` : ''}</div>${choices.length ? `<p class="ps-line">${choices.join('<br>')}</p>` : ''}${feats.length ? `<h3>Dotes</h3><p class="ps-line">${feats.join('<br>')}</p>` : ''}${(s.features || []).length ? `<p class="ps-line">${s.features.map(f => `<b>${e(f.name)}</b>${f.text ? ': ' + e(f.text) : ''}`).join('<br>')}</p>` : ''}`;
  }
  function spells(s) {
    const casters = C.views(s).filter(v => C.casting(v).caster);
    const usable = new Set(C.usable(s)),
      all = [
        ...new Set([
          ...usable,
          ...(s.known || []),
          ...C.views(s)
            .slice(1)
            .flatMap(v => v.known || []),
        ]),
      ]
        .map(id => R.allSpells(s).find(x => x.id === id))
        .filter(Boolean)
        .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, 'es'));
    if (!casters.length && !all.length) return '';
    const d = R.stats(s);
    const head = casters
      .map(v => {
        const st = R.stats(v),
          cast = C.casting(v);
        return `<span><b>${e(C.info(v).name)}:</b> ${e(R.attrs[cast.ability])} · CD ${st.dc} · ataque ${sg(st.attack)}</span>`;
      })
      .join('');
    const slots = d.slots.map((max, i) => (max ? `<span>Nv ${i + 1}: ${'○'.repeat(max)}</span>` : '')).join('');
    const byLevel = {};
    for (const sp of all) (byLevel[sp.level] ||= []).push(sp);
    return `<p class="ps-line ps-casting">${head}</p>${slots || d.pact ? `<p class="ps-line ps-slots">${slots}${d.pact ? `<span>Pacto (nv ${d.pact.level}): ${'○'.repeat(d.pact.max)}</span>` : ''}</p>` : ''}<div class="ps-spells">${Object.entries(
      byLevel,
    )
      .map(
        ([lv, list]) =>
          `<div><h3>${lv === '0' ? 'Trucos' : 'Nivel ' + lv}</h3><ul>${list
            .map(
              sp =>
                `<li>${usable.has(sp.id) ? '●' : '○'} <b>${e(sp.name)}</b> <small>${e(sp.time)} · ${e(sp.range)}${sp.concentration ? ' · C' : ''}${sp.ritual ? ' · R' : ''}</small></li>`,
            )
            .join('')}</ul></div>`,
      )
      .join('')}</div><p class="ps-note">● preparado o siempre disponible · C concentración · R ritual</p>`;
  }
  function gear(s) {
    const items = (s.inventory || []).filter(x => x.qty > 0);
    const coins = [
      ['pc', 'cp'],
      ['pp', 'sp'],
      ['pe', 'ep'],
      ['po', 'gp'],
      ['ppt', 'pp'],
    ]
      .map(([l, k]) => `${s.gold[k]} ${l}`)
      .join(' · ');
    const magic = MagicItems.rows(s);
    return `${items.length ? `<ul class="ps-items">${items.map(x => `<li>${x.magic?.attuned ? '★ ' : ''}${e(x.name)}${x.qty > 1 ? ' ×' + x.qty : ''}${x.location ? ` <small>(${e(x.location)})</small>` : ''}</li>`).join('')}</ul>` : '<p class="ps-line">—</p>'}<p class="ps-line"><b>Monedas:</b> ${coins}</p>${
      magic.length
        ? `<h3>Objetos mágicos (★ sintonizado ${MagicItems.attunedCount(s)}/3)</h3><p class="ps-line">${magic
            .map(
              x =>
                `<b>${e(x.name)}</b>: ${e(MagicItems.effects(x.magic).join(' · ') || x.magic.note || '')}${x.magic.charges ? ` · cargas ${'○'.repeat(Math.min(20, x.magic.charges.max))}` : ''}`,
            )
            .join('<br>')}</p>`
        : ''
    }`;
  }
  function companions(s) {
    const list = s.companions || [];
    if (!list.length && !s.companion?.notes) return '';
    return `${list.map(c => `<p class="ps-line"><b>${e(c.name)}</b> (${e(Companions.KINDS[c.kind] || '')}) · CA ${c.ac} · PG ${c.maxHp} · ${e(c.speed || '')}${c.attacks.length ? '<br>' + c.attacks.map(a => `${e(a.name)} ${sg(a.bonus)}, ${e(a.damage)}`).join(' · ') : ''}</p>`).join('')}${s.companion?.notes ? `<p class="ps-line">${e(s.companion.notes)}</p>` : ''}`;
  }

  function html() {
    const s = state,
      d = R.stats(s);
    return `<div class="ps-page">${header(s, d)}<div class="ps-grid"><div>${section('Características', abilities(s))}${section('Habilidades', skills(s))}</div><div>${section('Combate', combat(s, d))}${section('Ataques', attacks(s))}${section('Competencias', proficiencies(s))}${section('Rasgos y dotes', features(s))}</div></div></div>${
      spells(s) ? `<div class="ps-page">${section('Conjuros', spells(s))}</div>` : ''
    }<div class="ps-page">${section('Equipo', gear(s))}${section('Compañeros', companions(s))}${s.notes ? section('Notas', `<p class="ps-line ps-notes">${e(s.notes)}</p>`) : ''}<p class="ps-note">Cuaderno de aventura · ${e(new Date().toLocaleDateString('es-AR'))}</p></div>`;
  }
  function open() {
    let el = document.getElementById('print-sheet');
    if (!el) {
      el = document.createElement('div');
      el.id = 'print-sheet';
      document.body.append(el);
    }
    el.innerHTML = html();
    document.body.classList.add('printing');
    const done = () => {
      document.body.classList.remove('printing');
      removeEventListener('afterprint', done);
    };
    addEventListener('afterprint', done);
    document.getElementById('modal')?.open && document.getElementById('modal').close();
    setTimeout(() => window.print(), 50);
  }
  function install() {
    Object.assign(actions, { 'print-sheet': open });
  }
  return { html, open, install };
})();
