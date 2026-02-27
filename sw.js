/* ══════════════════════════════════════
   MAT'S FORGE — Service Worker v1.0
   Stratégie : Cache First pour assets
   statiques, Network First pour la page
══════════════════════════════════════ */

const CACHE_NAME     = 'matsforge-v1';
const FONT_CACHE     = 'matsforge-fonts-v1';
const OFFLINE_PAGE   = './matsforge.html';

/* Ressources à précacher au moment de l'install */
const PRECACHE_URLS = [
  './matsforge.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

/* Origines de polices à mettre en cache */
const FONT_ORIGINS = [
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com',
];

/* ── INSTALL ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

/* ── ACTIVATE ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== FONT_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* ── FETCH ── */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  /* 1. Polices Google → Cache First (très stable) */
  if (FONT_ORIGINS.some(o => request.url.startsWith(o))) {
    event.respondWith(cacheFirst(request, FONT_CACHE));
    return;
  }

  /* 2. Requêtes non-GET → réseau direct */
  if (request.method !== 'GET') return;

  /* 3. Page principale → Network First avec fallback cache */
  if (url.pathname.endsWith('matsforge.html') || url.pathname === '/') {
    event.respondWith(networkFirst(request, CACHE_NAME));
    return;
  }

  /* 4. Autres assets locaux → Cache First */
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(request, CACHE_NAME));
    return;
  }
});

/* ══════════════
   STRATEGIES
══════════════ */

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (_) {
    return new Response('Hors ligne — ressource indisponible', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (_) {
    const cached = await caches.match(request);
    if (cached) return cached;
    /* Fallback ultime : page offline depuis le cache */
    const offlineFallback = await caches.match(OFFLINE_PAGE);
    return offlineFallback || new Response(
      `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
       <title>Mat's Forge — Hors ligne</title></head><body style="font-family:sans-serif;text-align:center;padding:40px">
       <h1>Hors ligne</h1><p>Mat's Forge sera disponible dès le retour de la connexion.</p>
       </body></html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}

/* ── MESSAGE : forcer la mise à jour ── */
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
