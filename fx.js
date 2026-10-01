/* Tarjeta animada con el resultado de una tirada. Se ve sobre la página o sobre el diálogo abierto. */
const RollFX = (() => {
  'use strict';
  let timer;
  const esc = v =>
    String(v ?? '').replace(
      /[&<>"']/g,
      c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  // face: lo que va dentro del dado (el d20 que quedó o un símbolo); total: el resultado final.
  function show({ label, total, face = '', detail = '', crit = false, fumble = false }) {
    const host = document.querySelector('dialog[open]') || document.body;
    let box = document.getElementById('roll-fx');
    if (!box || box.parentElement !== host) {
      box?.remove();
      box = document.createElement('div');
      box.id = 'roll-fx';
      box.setAttribute('role', 'status');
      box.setAttribute('aria-live', 'polite');
      host.append(box);
    }
    clearTimeout(timer);
    box.innerHTML = `<div class="roll-card ${crit ? 'crit' : fumble ? 'fumble' : ''}"><span class="roll-die" aria-hidden="true">${esc(face || '✦')}</span><span class="roll-label">${esc(label)}${crit ? ' · ¡Crítico!' : fumble ? ' · Pifia' : ''}</span><span class="roll-total">${esc(total)}</span>${detail ? `<span class="roll-detail">${esc(detail)}</span>` : ''}</div>`;
    timer = setTimeout(() => {
      const card = box.firstElementChild;
      if (!card) return;
      card.classList.add('leaving');
      setTimeout(() => card.remove(), 300);
    }, 3200);
  }
  return { show };
})();
