const PREFIX = 'darien:' + self.registration.scope + ':';
const CACHE = PREFIX + 'v18-table-tools';
const FILES = [
  './',
  './index.html',
  './style.css',
  './rules.js',
  './class-data.js',
  './campaign-data.js',
  './campaign.js',
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
  './app.js',
  './catalog.js',
  './progression.js',
  './wizard.js',
  './manifest.webmanifest',
  './assets/icon.svg',
  './party.css',
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
  './dm.html',
  './dm.js',
  './vendor/supabase.js',
];
self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then(cache => cache.addAll(FILES))
      .then(() => self.skipWaiting()),
  );
});
self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith(PREFIX) && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.registration.scope)) return;
  // Siempre revalida con el servidor: GitHub Pages permite reusar archivos 10 minutos y, tras una
  // actualización, el navegador podía mezclar scripts nuevos y viejos. Un 304 cuesta casi nada.
  const fresh =
    event.request.mode === 'navigate'
      ? new Request(event.request.url, { cache: 'no-cache', credentials: 'same-origin' })
      : new Request(event.request, { cache: 'no-cache' });
  event.respondWith(
    fetch(fresh)
      .then(response => {
        if (response.ok) {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE).then(c => c.put(event.request, copy)));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        if (event.request.mode === 'navigate') return caches.match(new URL('./index.html', self.registration.scope));
        return Response.error();
      }),
  );
});
