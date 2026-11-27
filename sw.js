const PREFIX = 'darien:' + self.registration.scope + ':';
// BUILD es un resumen del contenido de FILES: lo escribe `npm run stamp` y los tests fallan si quedó viejo.
const BUILD = 'f447ff8fe29f';
const CACHE = PREFIX + BUILD;
const FILES = [
  './',
  './index.html',
  './entry.js',
  './landing.css',
  './landing.js',
  './assets/showcase-poster.webp',
  './assets/landing-creator.webp',
  './assets/landing-table.webp',
  './assets/landing-spells.webp',
  './assets/landing-lighting.webp',
  './app.html',
  './recover.html',
  './recover.js',
  './style.css',
  './miniature-mesh.js',
  './campaign-mini-models.js',
  './campaign-miniatures.js',
  './creature-miniatures.js',
  './miniature-ancestries.js',
  './miniature-wardrobe.js',
  './miniatures.js',
  './assets/minis/index.json',
  './assets/minis-pixel/index.json',
  './rules.js',
  './class-data.js',
  './book-content-data.js',
  './book-content.js',
  './official-content-data.js',
  './shared-spell-data.js',
  './shared-reference-data.js',
  './content-index.js',
  './official-content.js',
  './homebrew.js',
  './homebrew-ui.js',
  './library.css',
  './names-es.js',
  './feat-data.js',
  './feats.js',
  './subclass-fx-data.js',
  './subclass-fx-uses.js',
  './subclass-fx-states.js',
  './subclass-fx-choices.js',
  './subclass-fx-companions.js',
  './subclass-fx-reminders.js',
  './subclass-fx.js',
  './magic-items.js',
  './metamagic.js',
  './cannon.js',
  './companions.js',
  './campaign-data.js',
  './traits-es-data.js',
  './campaign.js',
  './grant-data.js',
  './grants.js',
  './grant-ui.js',
  './defenses.js',
  './persona.js',
  './surge.js',
  './spores.js',
  './spores-ui.js',
  './subclass-ui.js',
  './interop.js',
  './interop-ui.js',
  './class-rules.js',
  './party-store.js',
  './equipment-data.js',
  './equipment.js',
  './item-ref.js',
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
  './theme.css',
  './fonts/alegreya-latin-wght-normal.woff2',
  './fonts/alegreya-latin-wght-italic.woff2',
  './creature-fx.css',
  './assets/encounter-seal.png',
  './assets/encounter-ambush.png',
  './assets/encounter-boss.png',
  './assets/encounter-reinforce.png',
  './creator.css',
  './overlay-focus.js',
  './creator.js',
  './levelup.js',
  './fx.js',
  './sound.js',
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
  './friendly-npcs.js',
  './dm-friendly-ui.js',
  './dm-initiative.js',
  './campaign-archive.js',
  './monsters-ui.js',
  './encounters.js',
  './encounter-generator.js',
  './encounter-generator-ui.js',
  './sessions.js',
  './chronicle.js',
  './shop.js',
  './dm-reference.js',
  './dm-tools-ui.js',
  './board-player.js',
  './board-dm.js',
  './library-core.js',
  './library-ui.js',
  './library-text.js',
  './vendor/supabase.js',
];
const OFFLINE_FILES = [
  './compendium.html',
  './compendium.js',
  './official-text-data.js',
  './official-monsters-data.js',
  './monsters-data.js',
  './shared-reference-text.js',
  './encounter-tables-data.js',
  './curated-encounter-data.js',
  './board.html',
  './board.js',
  './board-core.js',
  './board-art.js',
  './board-scene-fx.js',
  './board-spells.js',
  './board-casting.js',
  './board-casting.css',
  './board-ink.js',
  './board-pixel-fx.js',
  './board-pixel-spells-00.js',
  './board-pixel-spells-01.js',
  './board-pixel-spells-02.js',
  './board-figure-motion.js',
  './board-spell-fx.js',
  './assets/spell-ink/sigil.png',
  './assets/spell-ink/flare.png',
  './assets/spell-ink/fire-bolt.png',
  './assets/spell-ink/fire-impact.png',
  './assets/spell-ink/fireball-bead.png',
  './assets/spell-ink/fireball.png',
  './assets/spell-ink/fireball-ground.png',
  './assets/spell-ink/burning-hands.png',
  './assets/spell-ink/sacred-flame.png',
  './assets/spell-ink/radiant-impact.png',
  './assets/spell-ink/fog-cloud.png',
  './assets/spell-ink/magic-missile.png',
  './assets/spell-ink/force-impact.png',
  './assets/spell-ink/lightning-bolt.png',
  './assets/spell-ink/lightning-scorch.png',
  './assets/spell-ink/lightning-impact.png',
  './assets/spell-ink/ray.png',
  './assets/spell-ink/cylinder.png',
  './assets/spell-ink/cube.png',
  './assets/spell-ink/wall.png',
  './assets/spell-ink/aura-instant.png',
  './assets/spell-ink/aura-persistent.png',
  './assets/spell-ink/touch.png',
  './assets/spell-ink/buff.png',
  './assets/spell-ink/debuff.png',
  './assets/spell-ink/healing.png',
  './assets/spell-ink/summon.png',
  './assets/spell-ink/summon-weapon.png',
  './assets/spell-ink/teleport.png',
  './assets/spell-ink/utility.png',
  './assets/spell-ink/strike.png',
  './assets/spell-ink/moonbeam-floor.png',
  './assets/spell-ink/moonbeam.png',
  './assets/spell-ink/disintegrate.png',
  './assets/spell-ink/disintegrate-hit.png',
  './assets/spell-ink/disintegrate-dust.png',
  './assets/spell-ink/thunderwave.png',
  './assets/spell-ink/thunderclap.png',
  './assets/spell-ink/thunder-ripple.png',
  './assets/spell-ink/toll-the-dead.png',
  './assets/spell-ink/healing-word.png',
  './assets/spell-ink/bless-icon.png',
  './assets/spell-ink/bane-icon.png',
  './assets/spell-ink/ward-icon.png',
  './assets/spell-ink/weapon-swing.png',
  './assets/spell-ink/wall-flames.png',
  './assets/spell-ink/wall-embers.png',
  './assets/spell-ink/wall-heat.png',
  './assets/spell-ink/weapon-mace.png',
  './assets/spell-ink/weapon-axe.png',
  './assets/spell-ink/weapon-impact.png',
  './assets/spell-ink/eldritch-bolt.png',
  './assets/spell-ink/eldritch-hit.png',
  './assets/spell-ink/chill-hand.png',
  './assets/spell-ink/chill-grasp.png',
  './assets/spell-ink/guiding-star.png',
  './assets/spell-ink/guiding-mark.png',
  './assets/spell-ink/cure-wounds.png',
  './assets/spell-ink/ward-shield.png',
  './assets/spell-ink/hold-bindings.png',
  './assets/spell-ink/counterspell-sever.png',
  './assets/spell-ink/guardian-forms.png',
  './assets/spell-ink/bardic-notes.png',
  './assets/spell-ink/rage-burst.png',
  './assets/spell-ink/spore-halo.png',
  './assets/spell-ink/symbiotic-growth.png',
  './assets/spell-ink/shillelagh-bark.png',
  './assets/spell-ink/entangle-vines.png',
  './board-props.js',
  './board-gen.js',
  './sigils.js',
  './board.css',
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
  const port = event.ports?.[0];
  if (event.data === 'download-offline' && port) {
    event.waitUntil(
      caches
        .open(CACHE)
        .then(cache => cache.addAll(OFFLINE_FILES.map(f => new Request(f, { cache: 'reload' }))))
        .then(
          () => port.postMessage(true),
          () => port.postMessage(false),
        ),
    );
  }
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
    ? caches.open(CACHE).then(c => c.match(new URL('./app.html', self.registration.scope)))
    : Response.error();

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET' || !request.url.startsWith(self.registration.scope)) return;
  // El video de la portada va directo a la red: pesa y se pide por partes, que la caché no guarda.
  if (request.destination === 'video' || /\.(webm|mp4)$/.test(new URL(request.url).pathname)) return;
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
