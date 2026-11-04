/* Service worker Вайб-Трекера: приложение целиком работает офлайн.
   VERSION подставляется сборкой (tools/build_pwa.py) — при каждом изменении файлов
   создаётся новый кэш, старый удаляется. */
const VERSION = 'vt-4bfe7d73b9';
const SHELL = ['./', './index.html', './tailwind.css', './vendor/chart.umd.js', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Соседние приложения Atelier (docs/salon/), Lumière (docs/lumiere/) и Онлайн-запись (docs/zapis/) обслуживают свои service worker
  if (url.origin === location.origin && (url.pathname.includes('/salon/') || url.pathname.includes('/lumiere/') || url.pathname.includes('/zapis/'))) return;
  // Страница: сначала сеть (чтобы обновления приходили сразу), без сети — из кэша.
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put('./index.html', copy)); return r; })
      .catch(() => caches.match('./index.html')));
    return;
  }
  // Свои файлы и шрифты Google: из кэша, в фоне обновляем (stale-while-revalidate).
  if (url.origin === location.origin || url.host.endsWith('fonts.googleapis.com') || url.host.endsWith('fonts.gstatic.com')) {
    e.respondWith(caches.open(VERSION).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(r => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
  }
});
