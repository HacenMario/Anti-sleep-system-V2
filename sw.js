const CACHE_NAME = 'anti-sleep-v2-platform-v2';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './i18n.js',
  './platform.js',
  './sw.js'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Do not use cache.addAll(): one missing optional asset would reject the
    // whole install. Cache each known file independently.
    await Promise.all(APP_SHELL.map(async url => {
      try { await cache.add(url); } catch (err) { console.warn('[SW] cache skipped:', url); }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.pathname.startsWith('/api/')) return;
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cached = await caches.match(req);
    try {
      const response = await fetch(req);
      if (response && response.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, response.clone()).catch(() => {});
      }
      return response;
    } catch (_) {
      return cached || new Response('', { status: 503, statusText: 'Offline' });
    }
  })());
});
