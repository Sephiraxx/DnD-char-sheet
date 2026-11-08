/* «Tu ficha al día»: lo que la ficha calcula sola, lo que te falta elegir y lo que conviene recordar en la mesa. */
const SheetStatus = (() => {
  'use strict';
  const R = Rules;

  // Conjuros fijos de la raza que todavía no están en la ficha.
  function missingRaceSpells(s) {
    if (globalThis.Grants) return [];
    const have = new Set([...(s.known || []), ...(s.extras || [])]);
    return Campaign.raceSpells(s).spells.filter(x => !have.has(x.id));
  }
  function addRaceSpells(s) {
    const add = missingRaceSpells(s).map(x => x.id);
    s.extras = [...new Set([...(s.extras || []), ...add])];
    return add.length;
  }

  function automatic(s) {
    const d = R.stats(s),
      race = Campaign.race(s),
      def = Defenses.of(s),
      out = [];
    out.push([
      'Clase',
      `PG máximos ${d.maxHP}, competencia ${sign(d.prof)}, salvaciones${d.slots.some(Boolean) || d.pact ? ', espacios de conjuro' : ''}, recursos y descansos.`,
    ]);
    // Cada defensa bajo lo que la da: la raza, o «Anotadas a mano» (Defensas de la ficha).
    const from = (kind, why) =>
      [...def[kind]]
        .filter(([, w]) => w === why)
        .map(([t]) => Defenses.label(t))
        .join(', ');
    const bits = why =>
      [
        from('resist', why) ? 'resistencia a ' + from('resist', why) : '',
        from('immune', why) ? 'inmunidad a ' + from('immune', why) : '',
        from('vulnerable', why) ? 'vulnerabilidad a ' + from('vulnerable', why) : '',
      ].filter(Boolean);
    const raceBits = [
      `velocidad ${d.speed} pies`,
      race?.darkvision ? `visión en la oscuridad ${race.darkvision} pies` : '',
      ...(race ? bits(race.name) : []),
    ].filter(Boolean);
    if (race) out.push([race.name, raceBits.join(' · ') + '.']);
    if (bits('anotada').length) out.push(['Anotadas a mano', bits('anotada').join(' · ') + '.']);
    const rs = globalThis.Grants
      ? Grants.spells(s)
          .filter(g => g.grantType === 'race' && g.mode !== 'expanded')
          .map(g => ({
            name: Grants.lookup(g.id)?.name || g.id,
            uses: g.ritualOnly
              ? 'solo ritual'
              : g.freeResource
                ? (g.max || 1) + ' por descanso ' + (g.reset === 'short' ? 'corto o largo' : 'largo')
                : g.unlimited
                  ? 'sin espacio'
                  : '',
          }))
      : Campaign.raceSpells(s).spells.filter(x => (s.extras || []).includes(x.id) || (s.known || []).includes(x.id));
    if (rs.length)
      out.push([
        'Magia de linaje',
        rs.map(x => x.name + (x.uses ? ` (${x.uses})` : '')).join(', ') + ' en tus conjuros.',
      ]);
    for (const f of FeatFX.report(s)) if (f.auto.length) out.push([f.name, f.auto.join(' · ') + '.']);
    if (s.equipmentDefense) out.push(['Equipo', 'La CA se calcula con la armadura y el escudo equipados.']);
    for (const x of MagicItems.active(s)) {
      const fx = MagicItems.effects(x.magic).filter(t => !/cargas|cura /.test(t));
      if (fx.length) out.push([x.name, fx.join(' · ') + '.']);
    }
    return out;
  }
  function pending(s) {
    const out = [];
    // Clases secundarias: conjuros y opciones que faltan elegir, con su botón.
    for (const v of Classes.views(s).slice(1))
      for (const t of Classes.taskDetails(v).filter(t => t.action !== 'class-config'))
        out.push({
          text: Classes.info(v).name + ': ' + t.text,
          action: button(
            'Elegir',
            t.action === 'spell-manage' ? 'mc-spells' : 'mc-options',
            '',
            'data-id="' + v.classId + '"',
          ),
        });
    // Extras de fichas viejas que repiten la elección de la raza o el trasfondo.
    if (globalThis.Grants?.repeatedExtras)
      for (const r of Grants.repeatedExtras(s).filter(r => r.kind === 'choice')) {
        const name = id => R.allSpells(s).find(x => x.id === id)?.name || id;
        out.push({
          text: `${name(r.id)} está como extra y ${r.origin} ya te da ${r.picked.map(name).join(', ')}. Si era el mismo conjuro agregado a mano, quedate con uno.`,
          action:
            button(`Usar ${name(r.id)}`, 'status-extra-adopt', '', `data-id="${esc(r.id)}"`) +
            button(`Quitar ${name(r.id)}`, 'status-extra-drop', 'secondary', `data-id="${esc(r.id)}"`) +
            button('Son dos distintos', 'status-extra-keep', 'secondary', `data-id="${esc(r.id)}"`),
        });
      }
    const miss = missingRaceSpells(s);
    if (miss.length)
      out.push({
        text: `Tu raza te da ${miss.map(x => x.name).join(', ')}.`,
        action: button('Agregar', 'status-race-spells', ''),
      });
    for (const c of globalThis.Grants ? [] : Campaign.raceSpells(s).choices)
      out.push({
        text: `Por tu raza elegís ${Campaign.choiceText(c.text)}: agregalo como extra.`,
        action: button('Conjuros', 'spell-manage'),
      });
    if (typeof GrantUI !== 'undefined')
      for (const p of Grants.plans(s).filter(p => p.source.id !== 'strixhaven-initiate' && GrantUI.pending(s, p)))
        out.push({
          text: p.source.name + ': falta completar sus beneficios.',
          action: button('Elegir', 'grant-config', '', 'data-key="' + esc(p.source.key) + '"'),
        });
    return out;
  }
  function reminders(s) {
    const out = [];
    for (const x of globalThis.Grants ? [] : Campaign.raceSpells(s).spells)
      if (x.uses && x.uses !== 'según el rasgo') out.push([x.name, `${x.uses}, sin gastar espacio (magia de linaje).`]);
    for (const f of FeatFX.report(s)) for (const m of f.manual) out.push([f.name, m]);
    return out;
  }

  function card() {
    const s = state,
      auto = automatic(s),
      todo = pending(s),
      notes = reminders(s),
      open = todo.length + Classes.taskDetails(s).length;
    const rows = list => list.map(([t, txt]) => `<li><b>${esc(t)}:</b> ${esc(txt)}</li>`).join('');
    return `<section class="card section-space sheet-status"><div class="card-header"><h2>Tu ficha al día</h2>${open ? `<span class="tag">${open} por completar</span>` : '<span class="tag">Completa</span>'}</div><div class="grid two"><div><h3>Se calcula solo</h3><ul class="status-list ok">${rows(auto)}</ul></div><div>${
      todo.length
        ? `<h3>Te falta</h3><div class="pending-list">${todo.map(t => `<div class="pending-row"><span>${esc(t.text)}</span>${t.action}</div>`).join('')}</div>`
        : ''
    }${notes.length ? `<h3>${todo.length ? 'Recordá en la mesa' : 'A cargo tuyo en la mesa'}</h3><ul class="status-list manual">${rows(notes)}</ul>` : todo.length ? '' : '<p class="small">No hay nada pendiente fuera de las elecciones de clase.</p>'}</div></div></section>`;
  }

  // Bendición de la forja: un arma sencilla o marcial, o una armadura, que no sea mágica.
  function blessable(s) {
    return (s.inventory || []).filter(x => {
      const e = EquipmentData.items[x.equipmentId];
      return x.qty > 0 && !x.magic && e && (e.weapon || (e.armor && e.armor.type !== 'shield'));
    });
  }
  function install() {
    Object.assign(actions, {
      'trait-hp-included': () => {
        const n = Classes.traitHp(state).value;
        commit('PG de rasgos: ya incluidos', s => {
          s.hpAuto = true;
          s.hpBase -= n;
        });
        toast('Listo: tus PG máximos no cambian y el bono sube solo con cada nivel.');
      },
      'trait-hp-add': () => {
        const n = Classes.traitHp(state).value;
        commit(`PG de rasgos: +${n}`, s => {
          s.hpAuto = true;
          if (s.hp !== null) s.hp += n;
        });
        toast(`Tus PG máximos suben ${n}.`);
      },
      'forge-bless': () => {
        const list = blessable(state);
        if (!list.length)
          throw Error(
            'Necesitás un arma sencilla o marcial, o una armadura, que no sea mágica, en tu inventario (agregala del catálogo).',
          );
        modal(
          'Bendición de la forja',
          `<p class="small">Al terminar un descanso largo tocás un arma o una armadura no mágica: hasta tu siguiente descanso largo es +1 (al ataque y al daño, o a la CA mientras la llevás puesta).</p>${select(
            'Objeto',
            'row',
            list.map(x => [x.id, x.name]),
            state.forgeBlessing || list[0].id,
          )}`,
          fd => {
            const row = list.find(x => x.id === fd.get('row'));
            if (!row) throw Error('Elegí un objeto.');
            commit('Bendición de la forja: ' + row.name, s => (s.forgeBlessing = row.id));
            toast(`${row.name} es +1 hasta tu siguiente descanso largo.`);
          },
          'Bendecir',
        );
      },
      'trait-channel': e => {
        const what = e.dataset.what,
          dc = Rules.stats(state).dc;
        const res = Classes.resources(state).find(r => r.id === 'channel');
        if (!res) throw Error('No tenés Canalizar divinidad.');
        if (res.max - (Classes.spent(state, res) || 0) <= 0) throw Error('No te quedan usos de Canalizar divinidad.');
        const name = what === 'turn' ? 'Expulsar muertos vivientes' : 'Bendición del artesano';
        commit(name + ' (Canalizar divinidad)', s => {
          if (what === 'turn') Combat.use(s, 'action', name);
          Classes.spend(s, 'channel', 1);
        });
        toast(
          what === 'turn'
            ? `Expulsar: cada muerto viviente a 30 pies que te vea u oiga salva SAB contra CD ${dc}.`
            : 'Bendición del artesano: ritual de 1 hora; creá el objeto metálico y agregalo al inventario.',
        );
      },
      'status-extra-adopt': e => {
        const r = Grants.repeatedExtras(state).find(r => r.id === e.dataset.id && r.kind === 'choice');
        if (!r) return;
        commit('Conjuro de raza elegido', s => Grants.adoptExtra(s, r.key, r.node, r.id));
        toast('Listo: ahora es el conjuro de tu ' + (r.key.startsWith('race:') ? 'raza' : 'trasfondo') + '.');
      },
      'status-extra-drop': e =>
        commit('Extra repetido quitado', s => {
          s.extras = s.extras.filter(x => x !== e.dataset.id);
          if (s.spellModes) delete s.spellModes[e.dataset.id];
        }),
      'status-extra-keep': e =>
        commit('Extra confirmado', s => {
          s.extrasConfirmed = [...new Set([...(s.extrasConfirmed || []), e.dataset.id])];
        }),
      'status-race-spells': () => {
        let n = 0;
        commit('Conjuros de raza agregados', s => (n = addRaceSpells(s)));
        toast(n ? `Agregado(s) ${n} conjuro(s) de tu raza como extras.` : 'Ya estaban en tu ficha.');
      },
    });
  }
  return { card, missingRaceSpells, addRaceSpells, automatic, pending, reminders, install };
})();
