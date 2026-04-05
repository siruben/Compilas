const CACHE = 'compilas-v1';
const ASSETS = [
  '.',
  'index.html',
  'style.css',
  'game.js',
  'manifest.json',
  'Icont.png',
  'logotetris.png',
  'tetris.mp3',
  'intretis.mp3',
  'inttetris.mp3',
  'gameover.mp3'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
