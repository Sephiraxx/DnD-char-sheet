/* Tarjeta con el resultado de una tirada: el número «rueda» un instante y se asienta. Tocala para cerrarla. */
const RollFX = (() => {
  'use strict';
  let timer, ticker, settle;
  const esc = v =>
    String(v ?? '').replace(
      /[&<>"']/g,
      c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Contorno de un d20 visto de frente: hexágono con el triángulo central.
  const D20 =
    '<svg viewBox="0 0 56 56" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M28 3 51 16v24L28 53 5 40V16Z"/><path d="M28 13 44 39H12Z"/><path d="M28 3v10M5 16l7 23M51 16l-7 23M12 39l16 14 16-14"/></g></svg>';

  function hide(box) {
    const card = box.firstElementChild;
    if (!card) return;
    card.classList.add('leaving');
    setTimeout(() => card.remove(), 200);
  }
  // face: d20 que quedó (número) o un símbolo; total: resultado final.
  // Devuelve una promesa que se cumple cuando el número queda fijo (para mostrar el resultado en otros lados).
  function show({ label, total, face = '', detail = '', crit = false, fumble = false }) {
    const host = document.querySelector('dialog[open]') || document.body;
    let box = document.getElementById('roll-fx');
    if (!box || box.parentElement !== host) {
      box?.remove();
      box = document.createElement('div');
      box.id = 'roll-fx';
      box.setAttribute('role', 'status');
      box.setAttribute('aria-live', 'polite');
      box.addEventListener('click', () => hide(box));
      host.append(box);
    }
    clearTimeout(timer);
    clearTimeout(ticker);
    settle?.();
    let done;
    const landed = new Promise(r => (done = r));
    settle = done;
    const tag = crit ? '¡Crítico!' : fumble ? 'Pifia' : '';
    box.innerHTML = `<button type="button" class="roll-card ${crit ? 'crit' : fumble ? 'fumble' : ''}" aria-label="${esc(label)}: ${esc(total)}. Tocá para cerrar."><span class="roll-icon">${D20}<b>${esc(face)}</b></span><span class="roll-label">${esc(label)}${tag ? `<span class="roll-tag">${tag}</span>` : ''}</span><span class="roll-total">${esc(total)}</span>${detail ? `<span class="roll-detail">${esc(detail)}</span>` : ''}</button>`;
    const card = box.firstElementChild,
      out = card.querySelector('.roll-total'),
      dieOut = card.querySelector('.roll-icon b'),
      final = Number(total),
      faceNum = Number(face);
    // Números al azar que se frenan de a poco hasta quedar en el resultado real.
    if (!calm() && Number.isFinite(final)) {
      const steps = [45, 45, 50, 55, 65, 75, 90, 110, 135, 165];
      const spread = Math.max(8, Math.abs(final));
      card.classList.add('rolling');
      let i = 0;
      const tick = () => {
        if (i >= steps.length) {
          out.textContent = total;
          if (dieOut) dieOut.textContent = face;
          card.classList.remove('rolling');
          card.classList.add('settled');
          settle = null;
          done();
          return;
        }
        out.textContent = Math.max(0, Math.round(final + (Math.random() - 0.5) * spread));
        if (dieOut && Number.isInteger(faceNum)) dieOut.textContent = 1 + Math.floor(Math.random() * 20);
        ticker = setTimeout(tick, steps[i++]);
      };
      tick();
    } else {
      card.classList.add('settled');
      settle = null;
      done();
    }
    timer = setTimeout(() => hide(box), 4000);
    return landed;
  }
  return { show };
})();

/* Aviso de combate a pantalla completa (encuentro lanzado o refuerzos): destello, temblor y un grito que cae. */
const EncounterFX = (() => {
  'use strict';
  const esc = v =>
    String(v ?? '').replace(
      /[&<>"']/g,
      c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  let timer;
  function show({ style = 'battle', cry = '¡Combate!', count = 0 } = {}) {
    document.getElementById('encounter-fx')?.remove();
    clearTimeout(timer);
    const box = document.createElement('div');
    box.id = 'encounter-fx';
    box.className = 'enc-fx enc-' + (['battle', 'ambush', 'boss', 'reinforce'].includes(style) ? style : 'battle');
    box.setAttribute('role', 'alert');
    box.innerHTML = `<div class="enc-flash"></div><div class="enc-text"><span class="enc-swords" aria-hidden="true">⚔</span><strong>${esc(cry)}</strong>${count ? `<small>${count} ${count === 1 ? 'enemigo' : 'enemigos'}</small>` : ''}</div>`;
    box.addEventListener('click', () => box.remove());
    (document.querySelector('dialog[open]') || document.body).append(box);
    document.body.classList.remove('enc-shake');
    void document.body.offsetWidth;
    document.body.classList.add('enc-shake');
    navigator.vibrate?.([120, 60, 220]);
    timer = setTimeout(() => {
      box.remove();
      document.body.classList.remove('enc-shake');
    }, 2800);
  }
  return { show };
})();
