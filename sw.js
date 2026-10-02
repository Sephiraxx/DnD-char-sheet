const PREFIX = 'darien:' + self.registration.scope + ':';
// BUILD es un resumen del contenido de FILES: lo escribe `npm run stamp` y los tests fallan si quedó viejo.
const BUILD = '0916f4fbddd8';
const CACHE = PREFIX + BUILD;
const FILES = [
  './',
  './index.html',
  './style.css',
  './rules.js',
  './class-data.js',
  './names-es.js',
  './feat-data.js',
  './feats.js',
  './magic-items.js',
  './companions.js',
  './campaign-data.js',
  './campaign.js',
  './defenses.js',
  './class-rules.js',
  './party-store.js',
  './equipment-data.js',
  './equipment.js',
  './equipment-ui.js',
  './creation-skills.js',
  './party-ui.js',
  './portrait.js',
  './combat-engine.js',
  './effects.js',
  './combat-ui.js',
  './magic-ui.js',
  './companions-ui.js',
  './print-sheet.js',
  './sheet-status.js',
  './app.js',
  './catalog.js',
  './manifest.webmanifest',
  './assets/icon.svg',
  './party.css',
  './polish.css',
  './creature-fx.css',
  './creator.css',
  './creator.js',
  './levelup.js',
  './fx.js',
  './config.js',
  './cloud.js',
  './party-view.js',
  './table-extras.js',
  './account.js',
  './table-ui.js',
  './attacks.js',
  './attack-ui.js',
  './multiclass-ui.js',
  './rolls-ui.js',
  './updates.js',
  './dm.html',
  './dm.js',
  './monsters-ui.js',
  './encounters.js',
  './sessions.js',
  './vendor/supabase.js',
];
// En la compu de desarrollo se sigue pidiendo todo a la red para ver los cambios al recargar.
const DEV = /^(localhost|127\.|\[::1\]$)/.test(self.location.hostname) || self.location.hostname.endsWith('.localhost');

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(CACHE)
      // cache: 'reload' saltea la caché HTTP: la versión nueva se guarda entera y con archivos frescos.
      .then(cache => cache.addAll(FILES.map(f => new Request(f, { cache: 'reload' }))))
      // La primera vez se activa enseguida; si ya había una versión, espera a que la página lo pida.
      .then(() => (!self.registration.active || DEV ? self.skipWaiting() : undefined)),
  );
});
self.addEventListener('message', event => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith(PREFIX) && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const offline = request =>
  request.mode === 'navigate'
    ? caches.open(CACHE).then(c => c.match(new URL('./index.html', self.registration.scope)))
    : Response.error();

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET' || !request.url.startsWith(self.registration.scope)) return;
  if (DEV) {
    const fresh =
      request.mode === 'navigate'
        ? new Request(request.url, { cache: 'no-cache', credentials: 'same-origin' })
        : new Request(request, { cache: 'no-cache' });
    return event.respondWith(fetch(fresh).catch(async () => (await caches.match(request)) || offline(request)));
  }
  // Todo sale de la caché de esta versión: abre al instante y nunca mezcla archivos de dos versiones.
  event.respondWith(
    caches.open(CACHE).then(async cache => {
      const hit = await cache.match(request, { ignoreSearch: request.mode === 'navigate' });
      if (hit) return hit;
      try {
        const response = await fetch(request);
        if (response.ok) event.waitUntil(cache.put(request, response.clone()));
        return response;
      } catch {
        return offline(request);
      }
    }),
  );
});
