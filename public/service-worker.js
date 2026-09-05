// public/service-worker.js
//
// Minimal PWA offline support. Strategy:
// - App shell (HTML/CSS/JS/icons): cache-first, so the UI loads instantly
//   and works offline once visited.
// - API calls: network-first, falling back to cache only if the network
//   is unavailable — data should always be fresh when online, but a
//   previously-loaded page shouldn't go fully blank the moment the
//   connection drops.
// - Audio/video and any Range request: NEVER intercepted. Service workers
//   handling byte-range ("Range") requests for streaming media is a known
//   source of broken/failed playback after a few tracks on mobile browsers
//   (the SW's cached/response handling doesn't correctly support partial
//   content), so those requests must always go straight to the network.

const CACHE_NAME = 'dj-gajon-shell-v3';
const SHELL_ASSETS = [
  '/',
  '/design.css',
  '/app.js',
  '/theme-extra.js',
  '/manifest.json',
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

  // Never touch audio/video or partial-content (Range) requests — let the
  // browser talk to the network (Cloudinary, etc.) directly. Intercepting
  // these is what breaks streaming playback after a few tracks.
  if (
    request.destination === 'audio' ||
    request.destination === 'video' ||
    request.headers.has('range')
  ) {
    return;
  }

  const url = new URL(request.url);

  // Cross-origin requests (Cloudinary media, fonts, etc.) — pass through.
  if (url.origin !== self.location.origin) return;

  const isApi = url.pathname.startsWith('/api/');

  if (isApi) {
    // Network-first: always try to get fresh data; cache as a fallback.
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
