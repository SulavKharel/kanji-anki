// Service worker: makes the drill installable and fully usable offline.
// Strategy: stale-while-revalidate. The cached copy is served immediately
// (so the quiz opens instantly and works with no signal) while a fresh copy
// is fetched in the background for next time.
//
// Bump CACHE when shipping a change you want users to pick up promptly.
const CACHE = 'n1kq-v4';

// Relative so this works at a site root and under a /repo-name/ subpath.
// data/ai-cache.json is deliberately absent — it is machine-managed and may
// not exist; the app treats it as optional.
const ASSETS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'icon.svg',
  'data/bank.json',
  'data/custom.json'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Individually, so one missing optional file cannot fail the whole install.
    await Promise.allSettled(ASSETS.map(a => cache.add(a)));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(n => n !== CACHE).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isFont = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!sameOrigin && !isFont) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);

    const network = fetch(req).then(res => {
      if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
      return res;
    }).catch(() => null);

    if (cached) return cached;

    const fresh = await network;
    if (fresh) return fresh;

    // Offline with nothing cached for this exact request: for a page load,
    // fall back to the app shell so the quiz still starts.
    if (req.mode === 'navigate') {
      return (await cache.match('index.html')) || (await cache.match('./')) ||
        new Response('Offline', { status: 503, statusText: 'Offline' });
    }
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  })());
});
