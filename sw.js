// Trigger Tails offline helper. Bump VERSION when you upload a new index.html.
const VERSION = 'trigger-tails-v11';
const PAGE = ['./', './index.html'];
const ASSETS = [
  './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png',
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
  'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => Promise.all(
    PAGE.concat(ASSETS).map(u => {
      const remote = u.startsWith('http');
      // cache: 'reload' skips the browser's own cache, so we never store an old copy
      return fetch(new Request(u, { mode: remote ? 'no-cors' : 'same-origin', cache: 'reload' }))
        .then(r => (r.ok || r.type === 'opaque') ? c.put(u, r) : null).catch(() => {});
    })
  )).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isPage = req.mode === 'navigate' || (url.origin === self.location.origin && /\/(index\.html)?$/.test(url.pathname));
  if (isPage) {
    // the game page: always try the network first, fall back to the saved copy when offline
    e.respondWith(fetch(req, { cache: 'no-cache' }).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put('./index.html', copy)); }
      return res;
    }).catch(() => caches.match('./index.html').then(r => r || caches.match('./'))));
    return;
  }
  const isLib = url.href.includes('three.min.js') || url.href.includes('peerjs.min.js');
  if (url.origin !== self.location.origin && !isLib) return;   // co-op traffic always goes to the network
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(cached => {
    const fresh = fetch(req).then(res => {
      if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => cached);
    return cached || fresh;
  }));
});
