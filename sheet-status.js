/* «Tu ficha al día»: lo que la ficha calcula sola, lo que te falta elegir y lo que conviene recordar en la mesa. */
const SheetStatus = (() => {
  'use strict';
  const R = Rules;

  // Conjuros fijos de la raza que todavía no están en la ficha.
  function missingRaceSpells(s) {
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
    const raceBits = [
      `velocidad ${d.speed} pies`,
      race?.darkvision ? `visión en la oscuridad ${race.darkvision} pies` : '',
      def.resist.size ? 'resistencia a ' + [...def.resist.keys()].map(Defenses.label).join(', ') : '',
      def.immune.size ? 'inmunidad a ' + [...def.immune.keys()].map(Defenses.label).join(', ') : '',
    ].filter(Boolean);
    if (race) out.push([race.name, raceBits.join(' · ') + '.']);
    const rs = Campaign.raceSpells(s).spells.filter(
      x => (s.extras || []).includes(x.id) || (s.known || []).includes(x.id),
    );
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
    const miss = missingRaceSpells(s);
    if (miss.length)
      out.push({
        text: `Tu raza te da ${miss.map(x => x.name).join(', ')}.`,
        action: button('Agregar', 'status-race-spells', ''),
      });
    for (const c of Campaign.raceSpells(s).choices)
      out.push({
        text: `Por tu raza elegís ${Campaign.choiceText(c.text)}: agregalo como extra.`,
        action: button('Conjuros', 'spell-manage'),
      });
    return out;
  }
  function reminders(s) {
    const out = [];
    for (const x of Campaign.raceSpells(s).spells)
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

  function install() {
    Object.assign(actions, {
      'status-race-spells': () => {
        let n = 0;
        commit('Conjuros de raza agregados', s => (n = addRaceSpells(s)));
        toast(n ? `Agregado(s) ${n} conjuro(s) de tu raza como extras.` : 'Ya estaban en tu ficha.');
      },
    });
  }
  return { card, missingRaceSpells, addRaceSpells, automatic, pending, reminders, install };
})();
