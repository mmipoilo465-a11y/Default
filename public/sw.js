// Service worker студии: офлайн-оболочка и напоминания.
const V = '{{V}}';
const SLUG = '{{SLUG}}';
const CACHE = `sb-${SLUG}-${V}`;
const SHELL = [`/${SLUG}/`, '/assets/css/base.css?v=' + V, '/assets/css/app.css?v=' + V, '/assets/js/app.js?v=' + V, '/assets/js/ui.js', '/core/time.js', '/core/slots.js', '/core/info.js',
  '/assets/fonts/inter-400.woff', '/assets/fonts/inter-600.woff', '/assets/fonts/display-900.woff', '/assets/fonts/display-800.woff'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith(`sb-${SLUG}-`) && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || url.pathname.includes('/api/')) return;
  // Страницы — сначала сеть (свежие цены и график), при отсутствии сети — кэш.
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return r; }).catch(() => caches.match(req).then((r) => r || caches.match(`/${SLUG}/`))));
    return;
  }
  // Статика — из кэша, обновляем в фоне.
  e.respondWith(caches.match(req).then((hit) => {
    const net = fetch(req).then((r) => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return r; }).catch(() => hit);
    return hit || net;
  }));
});

self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data.json(); } catch { d = { title: 'Напоминание', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Напоминание о записи', {
    body: d.body || '', tag: d.tag, data: { url: d.url || `/${SLUG}/` },
    icon: `/${SLUG}/icon-192.png`, badge: `/${SLUG}/icon-192.png`, renotify: true,
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = e.notification.data?.url || `/${SLUG}/`;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) if (c.url.includes(`/${SLUG}/`) && 'focus' in c) { c.navigate(url); return c.focus(); }
    return self.clients.openWindow(url);
  }));
});
