const V='zapis-hk9k3rvko9qx';
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(['./','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png'])).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x.startsWith('zapis-')&&x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return;
if(r.mode==='navigate'){e.respondWith(fetch(r).then(x=>{const c=x.clone();caches.open(V).then(k=>k.put('./',c));return x}).catch(()=>caches.match('./')));return}
e.respondWith(caches.match(r).then(h=>h||fetch(r)))});
