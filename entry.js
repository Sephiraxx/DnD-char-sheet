/* Portada (index.html): antes de dibujar nada, decide a dónde va cada visita.
   - Un enlace a la app (#combat, ?abrir, ?aliado=…, ?cuenta=…, el regreso de la cuenta) va directo a la ficha:
     no pasa por la portada ni por el inicio.
   - Quien ya usa la app en este navegador (cuenta, fichas, mesas, o entró alguna vez) va al inicio de la app.
   - El resto ve la portada. «?portada» la muestra siempre (el enlace «Qué es» del inicio).
   Lo usan la portada en el navegador y los tests en Node. */
(function (root) {
  'use strict';
  // Parámetros de campañas, redes y de la propia portada: no son enlaces a la app.
  const LANDING_PARAMS = /^(utm_[a-z]+|fbclid|gclid|msclkid|ref|portada)$/i;
  // Secciones de la ficha, y respuestas de acceso de la cuenta (#access_token=…, #error=…). Otro # (como
  // #funciones, de la propia portada) se queda acá.
  const APP_HASH = /^#(combat|spells|gear|character|traits|class|journal|table)$|=/;
  const list = (storage, key) => {
    const value = JSON.parse(storage.getItem(key) || '[]');
    return Array.isArray(value) && value.length > 0;
  };
  // ¿Este navegador ya usa la app? Lo que guardan la cuenta, las fichas y las mesas.
  function knownVisitor(storage) {
    try {
      return Boolean(
        storage.getItem('dnd-entered-v1') ||
        storage.getItem('dnd-cloud-auth') ||
        storage.getItem('darien-voss-2014-v1') ||
        storage.getItem('dnd-pending-table-v1') ||
        list(storage, 'dnd-party-index-v1') ||
        list(storage, 'dnd-cloud-dm-v1'),
      );
    } catch {
      return false;
    }
  }
  // Devuelve la dirección (relativa) a la que ir, o null para quedarse en la portada.
  function decide(href, storage) {
    const url = new URL(href);
    const keys = [...url.searchParams.keys()];
    if (APP_HASH.test(url.hash) || keys.some(k => !LANDING_PARAMS.test(k))) return './app.html' + url.search + url.hash;
    if (url.searchParams.has('portada')) return null;
    return knownVisitor(storage) ? './app.html' : null;
  }
  root.Entry = { decide, knownVisitor };
  if (root.document && root.location) {
    let to = null;
    try {
      to = decide(root.location.href, root.localStorage);
    } catch {
      to = null;
    }
    if (to) root.location.replace(to);
  }
})(typeof window !== 'undefined' ? window : globalThis);
