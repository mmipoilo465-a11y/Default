/* Service worker Atelier: приложение целиком работает офлайн.
   Версию кэша и список файлов подставляет сборка (vite.config.ts). */
const VERSION = 'atelier-b872c614b9';
const SHELL = ["./","./assets/index-BBbfhOb1.js","./assets/index-CJdqZUTT.css","./manifest.webmanifest","./favicon.svg","./icons/icon-192.png","./icons/icon-512.png","./icons/apple-touch-icon.png"];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('atelier-') && k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Страница: сначала сеть (обновления сразу), без сети — из кэша
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((r) => {
          const copy = r.clone();
          caches.open(VERSION).then((c) => c.put('./', copy));
          return r;
        })
        .catch(() => caches.match('./')),
    );
    return;
  }

  // Файлы приложения и шрифты: из кэша, в фоне обновляем
  const own = url.origin === location.origin && url.pathname.startsWith(new URL('./', self.registration.scope).pathname);
  if (own || url.host.endsWith('fonts.googleapis.com') || url.host.endsWith('fonts.gstatic.com')) {
    e.respondWith(
      caches.open(VERSION).then(async (c) => {
        const hit = await c.match(req);
        const net = fetch(req)
          .then((r) => {
            if (r.ok || r.type === 'opaque') c.put(req, r.clone());
            return r;
          })
          .catch(() => hit);
        return hit || net;
      }),
    );
  }
});
