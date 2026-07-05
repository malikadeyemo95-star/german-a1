const CACHE = 'deutschweg-v22';
const DAY_FILES = Array.from({ length: 30 }, (_, index) => `./content/day-${String(index + 1).padStart(2, '0')}.json`);
const APP_FILES = [
  './','./index.html','./manifest.json','./icon.png','./icon512.png',
  './assets/app.css','./assets/app.js','./assets/state.js','./assets/audio.js','./assets/srs.js','./assets/speaking.js',
  './content/manifest.json','./content/cards.json','./content/quizzes.json','./content/tests.json','./content/reference.json',
  ...DAY_FILES,
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_FILES)));
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put('./index.html', copy));
          return response;
        })
        .catch(() => caches.match('./index.html')),
    );
    return;
  }
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok) caches.open(CACHE).then((cache) => cache.put(event.request, response.clone()));
        return response;
      });
    }),
  );
});
