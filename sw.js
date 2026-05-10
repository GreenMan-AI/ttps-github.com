// SoundPulse Service Worker v4
// Šis fails tiek pārsūtīts ar servera /sw.js maršrutu — skatīt server.js

const CACHE = 'soundpulse-v4';
const ASSETS = [
  '/',
  '/index.html',
  '/design.css',
  '/manifest.json',
  '/logo192.png'
];

// Instalēšana
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Aktivizēšana — iztīra vecos kešus
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — Network first ar kešu kā rezervi
self.addEventListener('fetch', (e) => {
  if (!e.request.url.startsWith(self.location.origin)) return;
  if (e.request.url.includes('/api/')) return;
  if (/\.(mp3|wav|ogg|flac|m4a|aac)$/i.test(e.request.url)) return;

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res && res.status === 200 && e.request.method === 'GET') {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() =>
        caches.match(e.request).then((cached) => cached || caches.match('/index.html'))
      )
  );
});
