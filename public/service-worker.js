// public/service-worker.js
//
// Minimal PWA offline support. Strategy:
// - App shell (HTML/CSS/JS/icons): cache-first, so the UI loads instantly
//   and works offline once visited.
// - API calls and uploaded media: network-first, falling back to cache only
//   if the network is unavailable — song data and audio should always be
//   fresh when online, but a previously-loaded page shouldn't go fully
//   blank the moment the connection drops.

const CACHE_NAME = 'wave-shell-v1';
const SHELL_ASSETS = [
  '/',
  '/css/style.css',
  '/js/i18n.js',
  '/js/script-detect.js',
  '/js/radio-dj.js',
  '/js/app.js',
  '/js/admin.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isApiOrMedia = url.pathname.startsWith('/api/') || url.pathname.startsWith('/uploads/');

  if (isApiOrMedia) {
    // Network-first: always try to get fresh data/audio; cache as a fallback.
    event.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Cache-first for the app shell.
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});
