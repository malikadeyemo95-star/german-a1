// German A1 in 30 Days — offline service worker.
// Bump CACHE version whenever index.html changes to push updates to installed users.
const CACHE = 'ga1-v9';
const ASSETS = ['./', './index.html', './manifest.json', './icon.png', './icon512.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Stale-while-revalidate: serve from cache instantly, refresh the cache in the
// background so the next visit gets updates — and everything works fully offline.
self.addEventListener('fetch', e => {
  // dev: never serve from cache on localhost
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') return;
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(CACHE).then(async cache => {
      const hit = await cache.match(e.request, { ignoreSearch: true });
      const net = fetch(e.request)
        .then(res => { if (res && res.ok) cache.put(e.request, res.clone()); return res; })
        .catch(() => null);
      return hit || net.then(r => r || new Response('Offline', { status: 503 }));
    })
  );
});
