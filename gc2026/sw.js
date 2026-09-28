// Offline copy of the (encrypted) pages: network first, cached copy when there is no signal.
const C = 'gc26-v2';
const PAGES = /\/(index\.html|map\.html)?$/;
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || !PAGES.test(u.pathname)) return;
  const key = u.origin + (u.pathname.endsWith('/') ? u.pathname + 'index.html' : u.pathname);
  e.respondWith(fetch(u.origin + u.pathname + u.search, { cache: 'no-cache', credentials: 'same-origin' }).then(r => {
    if (r.ok) { const copy = r.clone(); caches.open(C).then(c => c.put(key, copy)); }
    return r;
  }).catch(() => caches.match(key)));
});
