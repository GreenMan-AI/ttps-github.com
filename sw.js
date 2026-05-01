const CACHE_NAME = 'soundpulse-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/design.css',
  '/manifest.json' // ja tev tāds ir
];

// Instalēšana - saglabā failus kešatmiņā
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Aktivizēšana - iztīra vecos kešatmiņas failus
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Failu paņemšana (Fetch)
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});