/* Sesiones de juego para el DM: empezar y terminar, repartir experiencia o habilitar la subida de nivel
   y avisar a los jugadores (a quien no guardó su acceso se le pide que lo guarde). */
const Sessions = (() => {
  'use strict';
  const settings = () => Cloud.cleanSettings(party?.campaign.settings || {});
  const minutesSince = iso => Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  const duration = min => (min >= 60 ? Math.floor(min / 60) + ' h ' + (min % 60) + ' min' : min + ' min');
  const when = iso =>
    new Date(iso).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  function card() {
    const st = settings(),
      cur = st.session,
      last = st.log.slice(-5).reverse();
    const head = cur
      ? `<p><b>Sesión ${cur.n} en curso</b> · desde ${esc(when(cur.start))} (${duration(minutesSince(cur.start))})</p><div class="actions">${button('Terminar sesión', 'session-end', '')}</div>`
      : `<p class="small muted">Al terminar, repartís experiencia o habilitás la subida de nivel, y cada jugador ve un resumen.</p><div class="actions">${button('Empezar sesión ' + ((st.log.at(-1)?.n || 0) + 1), 'session-start', '')}</div>`;
    const log = last.length
      ? `<details class="battle-rule"><summary>Sesiones anteriores (${st.log.length})</summary>${last
          .map(
            e =>
              `<div class="list-row"><span><b>Sesión ${e.n}</b> <span class="small muted">· ${esc(when(e.start))} · ${duration(e.minutes)}${e.xp ? ' · ' + e.xp + ' PX' : ''}${e.levelUp ? ' · subida de nivel' : ''}</span>${e.notes ? `<br><span class="small">${esc(e.notes)}</span>` : ''}</span></div>`,
          )
          .join('')}</details>`
      : '';
    return `<section class="card session-card"><div class="card-header"><h2>Sesión</h2></div>${head}${log}</section>`;
  }

  async function saveSettings(patch) {
    party.campaign.settings = await Cloud.updateSettings(current, { ...party.campaign.settings, ...patch });
  }
  async function start() {
    const st = settings();
    if (st.session) throw Error('Ya hay una sesión en curso.');
    const n = (st.log.at(-1)?.n || 0) + 1;
    await saveSettings({ session: { n, start: new Date().toISOString() } });
    await send('session-start', { n });
    toast('Empezó la sesión ' + n + '.');
    draw();
  }
  // Experiencia sugerida: criaturas del SRD derrotadas en la iniciativa, repartidas entre la party.
  function suggestedXp() {
    const pcs = party?.characters.length || 0,
      down = tracker().entries.filter(e => e.monsterId && e.status === 'derrotado');
    if (!pcs || !down.length || typeof MonsterUI === 'undefined') return null;
    const total = down.reduce((a, e) => a + MonsterUI.xp(e.monsterId), 0);
    return total ? { total, each: Math.floor(total / pcs), count: down.length } : null;
  }
  async function end() {
    const cur = settings().session;
    if (!cur) throw Error('No hay una sesión en curso.');
    if (typeof MonsterUI !== 'undefined') await MonsterUI.load();
    const min = minutesSince(cur.start),
      hint = suggestedXp();
    modal(
      'Terminar sesión ' + cur.n,
      `<p>Duración: <b>${duration(min)}</b>.</p>${field('Experiencia para cada personaje (PX)', 'xp', hint?.each || 0, 'number', 'min="0" max="1000000" inputmode="numeric"')}${hint ? `<p class="small">Sugerido: ${hint.count} criatura(s) derrotada(s) en la iniciativa dan ${hint.total} PX, ${hint.each} por personaje. Sumá los PX por objetivos o rol si los das.</p>` : '<p class="small">Dejalo en 0 si juegan por hitos.</p>'}<label class="check"><input type="checkbox" name="levelUp">Habilitar la subida de nivel para todos</label><label class="field">Notas de la sesión (opcional, las ven los jugadores)<textarea name="notes" maxlength="1000" placeholder="Llegaron a Phandalin y rescataron a Sildar."></textarea></label><p class="small">Cada jugador ve un resumen. A quien no guardó su acceso con email se le pide que lo guarde para no perder su ficha. Quien no esté conectado recibe la experiencia al abrir su ficha.</p>`,
      async fd => {
        const xp = int(fd, 'xp', 0, 1000000),
          levelUp = fd.has('levelUp'),
          notes = String(fd.get('notes') || '')
            .trim()
            .slice(0, 1000);
        for (const c of party.characters) {
          if (xp) await send('xp', { amount: xp, session: cur.n }, c.id);
          if (levelUp) await send('level', { session: cur.n }, c.id);
        }
        await send('session-end', { n: cur.n, minutes: min, xp, levelUp, notes });
        await saveSettings({
          session: null,
          log: [
            ...settings().log,
            { n: cur.n, start: cur.start, end: new Date().toISOString(), minutes: min, xp, levelUp, notes },
          ],
        });
        toast(`Terminó la sesión ${cur.n}.`);
        draw();
      },
      'Terminar sesión',
    );
  }
  Object.assign(actions, { 'session-start': start, 'session-end': end });
  return { card };
})();
