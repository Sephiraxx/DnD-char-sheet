/* Círculo de las Esporas en la ficha: tarjeta de combate con el Halo, la Entidad simbiótica y las Esporas propagadas. */
const SporesUI = (() => {
  'use strict';
  const S = () => globalThis.Spores;
  function card() {
    if (!S()?.is(state)) return '';
    const on = S().active(state),
      spread = S().spread(state),
      die = S().haloDie(state.level),
      dc = R.stats(state).dc,
      halo = `${on ? 2 : 1}d${die}`;
    return `<section class="card spores ${on ? 'on' : ''}"><div class="card-header"><div><p class="eyebrow">CÍRCULO DE LAS ESPORAS</p><h2>${on ? 'Entidad simbiótica activa' : 'Esporas'}</h2></div><div class="actions">${
      on ? button('Terminar', 'spores-end', 'secondary') : button('Entidad simbiótica', 'spores-start', 'primary')
    }</div></div>${
      on
        ? `<ul class="plain-list small"><li><b>${state.temp}</b> PG temporales: si los perdés todos, la entidad termina.</li><li>Halo de esporas: <b>${halo}</b> necrótico (el dado se tira dos veces).</li><li>Ataques cuerpo a cuerpo con arma: <b>+1d6 necrótico</b>, ya sumado al tirar el daño.</li></ul>`
        : `<p class="small">Acción y un uso de Forma salvaje: ganás <b>${S().tempFor(state)} PG temporales</b>; durante 10 minutos el Halo tira el dado dos veces y tus ataques cuerpo a cuerpo suman 1d6 necrótico.</p>`
    }<div class="actions section-space">${button(`Halo de esporas · ${halo}`, 'spores-halo', 'secondary')}${
      state.level >= 10 && on
        ? button(
            spread ? 'Disipar esporas propagadas' : 'Esporas propagadas',
            spread ? 'spores-spread-end' : 'spores-spread',
            'secondary',
          )
        : ''
    }</div><p class="small muted">Halo: reacción cuando una criatura que ves se mueve a 10 pies de vos o empieza ahí su turno. Salvación de Constitución CD ${dc} o recibe el daño.${
      spread
        ? ' Las esporas propagadas ocupan un cubo de 10 pies a 30 pies de vos durante 1 minuto: quien entre o empiece ahí su turno salva o recibe el daño del Halo. Mientras existan, no podés usar el Halo.'
        : ''
    }</p></section>`;
  }
  function rollHalo() {
    let r;
    commit('Halo de esporas', s => (r = Spores.useHalo(s)));
    const text = `Halo de esporas: <b>${r.total}</b> necrótico [${r.rolls.join(', ')}] · salvación de CON CD ${r.dc}`;
    if (typeof RollFX !== 'undefined')
      RollFX.show({
        label: 'Halo de esporas',
        total: r.total,
        face: r.rolls[0],
        detail: `${r.rolls.length}d${r.die} necrótico · CON CD ${r.dc}`,
        die: r.die,
        dice: r.rolls.map(v => ({ die: r.die, v })),
      });
    const log = document.getElementById('attack-log');
    if (log) {
      if (log.querySelector('.muted')) log.innerHTML = '';
      log.insertAdjacentHTML('afterbegin', `<p>${text}</p>`);
    } else toast(`Halo de esporas: ${r.total} necrótico. Salvación de CON CD ${r.dc}.`);
  }
  function install() {
    Object.assign(actions, {
      'spores-start': () =>
        modal(
          'Entidad simbiótica',
          `<p>Usás tu acción y un uso de Forma salvaje. Ganás <b>${Spores.tempFor(state)} PG temporales</b>${
            state.temp ? ` (ahora tenés ${state.temp}; no se suman, te quedás con el número más alto)` : ''
          }.</p><p class="small">Dura 10 minutos, hasta que pierdas esos PG temporales o hasta que vuelvas a usar Forma salvaje.</p>`,
          () => commit('Entidad simbiótica', s => Spores.start(s)),
          'Activar',
        ),
      'spores-end': () => commit('Entidad simbiótica terminada', s => Spores.end(s)),
      'spores-halo': rollHalo,
      'spores-spread': () => commit('Esporas propagadas', s => Spores.startSpread(s)),
      'spores-spread-end': () => commit('Esporas propagadas disipadas', s => Spores.endSpread(s)),
    });
  }
  return { card, install };
})();
