const CACHE = 'court-minutes-v2';
const BASE_PATH = new URL('./', self.location).pathname;
const INDEX_URL = `${BASE_PATH}index.html`;
const PRECACHE_URLS = [BASE_PATH, INDEX_URL, `${BASE_PATH}manifest.webmanifest`];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PRECACHE_URLS)));
  self.skipWaiting();
});

self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE).then(cache => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match(INDEX_URL))));
});
