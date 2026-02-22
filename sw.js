/* Mat's Forge - Service Worker v27 */
const CACHE = 'matsforge-v27';
const HTML_FILE = 'matsforge_v27-1.html';

/* On met en cache la page principale lors de l'installation */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll([
      './',
      './' + HTML_FILE
    ])).catch(() => {
      /* Si l'URL exacte n'est pas trouvée, on cache juste ./ */
      return caches.open(CACHE).then(c => c.add('./'));
    })
  );
  self.skipWaiting();
});

/* Nettoyage des anciens caches */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/* Stratégie : Cache-First avec fallback réseau */
self.addEventListener('fetch', e => {
  /* Ignorer les requêtes non-GET */
  if (e.request.method !== 'GET') return;
  /* Ignorer les requêtes chrome-extension et autres schémas non-http */
  if (!e.request.url.startsWith('http')) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        /* Mettre en cache les nouvelles ressources valides */
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE).then(c => c.put(e.request, responseClone));
        }
        return response;
      }).catch(() => {
        /* Fallback vers la page principale si offline */
        return caches.match('./') || caches.match('./' + HTML_FILE);
      });
    })
  );
});
