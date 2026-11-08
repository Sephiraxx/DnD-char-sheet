/* Pantallas que tapan la ficha (crear personaje, subir de nivel): el teclado queda adentro.
   Al abrir: lo de atrás queda inerte (ni foco ni lector de pantalla) y el foco pasa al título.
   Al redibujar: si el foco se perdió, vuelve al título. Al cerrar: todo vuelve y el foco regresa al
   botón que abrió la pantalla. Los diálogos (<dialog>) quedan fuera para que sigan funcionando. */
(function (root) {
  'use strict';
  const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function title(host) {
    const h = host.querySelector('h1, h2');
    if (!h) return host.querySelector(FOCUSABLE);
    if (!h.hasAttribute('tabindex')) h.setAttribute('tabindex', '-1');
    return h;
  }
  // Devuelve el foco al título si quedó fuera de la pantalla (por ejemplo, al reemplazar su contenido).
  function keep(host) {
    if (!host || host.hidden) return;
    const a = root.document.activeElement;
    // Un diálogo abierto encima (confirmar, elegir) conserva su foco.
    if (a?.closest?.('dialog[open]')) return;
    if (!a || a === root.document.body || !host.contains(a)) title(host)?.focus({ preventScroll: true });
  }
  function open(host) {
    const doc = root.document;
    if (!host.dataset.focusTrap) {
      host.dataset.focusTrap = '1';
      // Cada paso reemplaza el contenido: cuando termina de dibujarse, el foco sigue adentro.
      if (root.MutationObserver) new root.MutationObserver(() => keep(host)).observe(host, { childList: true });
      // Respaldo para navegadores sin «inert»: Tab y Mayús+Tab giran dentro de la pantalla.
      host.addEventListener('keydown', e => {
        if (e.key !== 'Tab') return;
        const all = [...host.querySelectorAll(FOCUSABLE)].filter(
          x => x.offsetParent !== null || x === doc.activeElement,
        );
        if (!all.length) return;
        const first = all[0],
          last = all[all.length - 1];
        if (e.shiftKey && (doc.activeElement === first || !host.contains(doc.activeElement))) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && (doc.activeElement === last || !host.contains(doc.activeElement))) {
          e.preventDefault();
          first.focus();
        }
      });
    }
    if (!host.returnFocus) host.returnFocus = doc.activeElement;
    for (const el of doc.body.children)
      if (el !== host && el.tagName !== 'DIALOG' && el.tagName !== 'SCRIPT' && !el.inert) {
        el.inert = true;
        el.dataset.overlayInert = '1';
      }
    keep(host);
  }
  function close(host) {
    const doc = root.document;
    for (const el of doc.querySelectorAll('[data-overlay-inert]')) {
      el.inert = false;
      delete el.dataset.overlayInert;
    }
    const back = host.returnFocus;
    host.returnFocus = null;
    if (back && doc.contains(back)) back.focus({ preventScroll: true });
  }
  root.OverlayFocus = { open, close, keep };
})(typeof globalThis !== 'undefined' ? globalThis : this);
