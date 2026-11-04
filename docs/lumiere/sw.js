/* Service worker Lumière: приложение целиком работает офлайн.
   Версию кэша и список файлов подставляет сборка (vite.config.ts). */
const VERSION = 'lumiere-6535a9f84e';
const SHELL = ["./","./admin/","./assets/admin-BRpGnrHm.js","./assets/shared-DBYV8Ody.js","./assets/styles-DNj_r0d7.css","./assets/vendor-BCZmEQh7.js","./assets/visitor-urXIuCTn.js","./manifest.webmanifest","./admin/manifest.webmanifest","./icons/admin-192.png","./icons/admin-512.png","./icons/admin-maskable-512.png","./icons/admin-apple-touch-icon.png","./favicon.svg","./icons/icon-192.png","./icons/icon-512.png","./icons/icon-maskable-512.png","./icons/apple-touch-icon.png"];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('lumiere-') && k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Страница: сначала сеть (обновления приходят сразу), без сети — из кэша.
  // У записи и панели руководителя свои страницы, поэтому и кэшируются они отдельно.
  if (req.mode === 'navigate') {
    const page = new URL(url.pathname.includes('/admin/') ? './admin/' : './', self.registration.scope).href;
    e.respondWith(
      fetch(req)
        .then((r) => {
          if (r.ok) {
            const copy = r.clone();
            caches.open(VERSION).then((c) => c.put(page, copy));
          }
          return r;
        })
        .catch(() => caches.match(page)),
    );
    return;
  }

  // Файлы приложения и шрифты Google: из кэша, в фоне обновляем
  const scope = new URL('./', self.registration.scope).pathname;
  const own = url.origin === location.origin && url.pathname.startsWith(scope);
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
