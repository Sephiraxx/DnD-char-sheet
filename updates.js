/* Versiones nuevas de la app: el service worker sirve todo desde caché, así que acá se instala y se avisa. */
(() => {
  'use strict';
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  const sw = navigator.serviceWorker,
    opened = Date.now(),
    hadController = !!sw.controller;
  let reloading = false;
  // La primera instalación toma la página sin recargar; después, cada cambio de versión recarga una sola vez.
  sw.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return;
    reloading = true;
    location.reload();
  });
  function offer(worker) {
    if (!sw.controller) return;
    // Recién abierta todavía no hiciste nada: se actualiza sola. Con la app en uso, se pregunta.
    if (Date.now() - opened < 10000) return worker.postMessage('skip-waiting');
    if (document.getElementById('update-banner')) return;
    const bar = document.createElement('div');
    bar.id = 'update-banner';
    bar.setAttribute('role', 'status');
    bar.innerHTML =
      '<span>Hay una versión nueva de la app.</span><button type="button" data-update="now">Actualizar</button><button type="button" class="secondary" data-update="later">Después</button>';
    bar.addEventListener('click', e => {
      const kind = e.target.closest('[data-update]')?.dataset.update;
      if (kind === 'now') worker.postMessage('skip-waiting');
      if (kind) bar.remove();
    });
    document.body.append(bar);
  }
  // Lo usa la mesa cuando el DM manda algo que esta versión no conoce: busca la nueva y la ofrece ya.
  let registration = null;
  globalThis.AppUpdates = {
    check() {
      if (!registration) return;
      if (registration.waiting) return offer(registration.waiting);
      registration.update().catch(() => {});
    },
  };
  sw.register('./sw.js')
    .then(reg => {
      registration = reg;
      const download = document.getElementById('offline-download');
      if (download) {
        download.hidden = false;
        download.addEventListener('click', async () => {
          const status = document.getElementById('offline-status');
          const worker = sw.controller || reg.active;
          if (!worker) {
            status.textContent = 'El guardado sin conexión todavía se está preparando.';
            return;
          }
          download.disabled = true;
          status.textContent = 'Descargando catálogo y tablero…';
          const channel = new MessageChannel();
          const finish = ok => {
            clearTimeout(timeout);
            channel.port1.close();
            download.disabled = false;
            status.textContent = ok
              ? 'Catálogo y archivos del tablero guardados en este dispositivo.'
              : 'No se pudo completar la descarga. Revisá tu conexión y reintentá.';
          };
          const timeout = setTimeout(() => finish(false), 120000);
          channel.port1.onmessage = event => finish(event.data === true);
          try {
            worker.postMessage('download-offline', [channel.port2]);
          } catch {
            finish(false);
          }
        });
      }
      if (reg.waiting) offer(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const worker = reg.installing;
        worker?.addEventListener('statechange', () => worker.state === 'installed' && offer(worker));
      });
      // El navegador solo busca versiones al navegar: en el celular la app queda abierta días.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update().catch(() => {});
      });
    })
    .catch(() => {});
})();
