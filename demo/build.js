// Сборка демо в один HTML-файл: bun run demo/build.js
import path from 'node:path';
import fs from 'node:fs';
const ROOT = path.resolve(import.meta.dir, '..');
const D = (p) => path.join(ROOT, 'demo', p);
const MAP = {
  './db.js': D('db.js'), './http.js': D('stubs/http.js'), './auth.js': D('stubs/auth.js'), './paths.js': D('stubs/paths.js'), './llm.js': D('stubs/llm.js'),
  'node:fs': D('stubs/empty.js'), 'node:path': D('stubs/empty.js'), 'node:url': D('stubs/empty.js'), 'node:zlib': D('stubs/empty.js'), 'node:crypto': D('stubs/node-crypto.js'),
};
const plugin = {
  name: 'demo-redirect',
  setup(build) {
    build.onResolve({ filter: /.*/ }, (args) => {
      if (args.path.startsWith('/core/')) return { path: path.join(ROOT, args.path) };
      const fromLib = args.importer && args.importer.startsWith(path.join(ROOT, 'lib') + path.sep);
      if (MAP[args.path] && (args.path.startsWith('node:') || fromLib)) return { path: MAP[args.path] };
      return undefined;
    });
  },
};
const out = await Bun.build({ entrypoints: [D('entry.js')], target: 'browser', format: 'esm', minify: true, plugins: [plugin] });
if (!out.success) { console.error(out.logs); process.exit(1); }
if (out.outputs.length !== 1) { console.error('ожидался один файл, получено', out.outputs.length); process.exit(1); }
let js = await out.outputs[0].text();

const b64 = (f) => fs.readFileSync(path.join(ROOT, f)).toString('base64');
const media = {};
for (const f of ['hero.jpg', 'work-1.jpg', 'work-2.jpg', 'work-3.jpg', 'work-4.jpg']) media[`/media/defaults/${f}`] = `data:image/jpeg;base64,${b64('public/media/defaults/' + f)}`;
let css = ['base.css', 'app.css', 'admin.css'].map((f) => fs.readFileSync(path.join(ROOT, 'public/css', f), 'utf8')).join('\n');
css = css.replace(/url\('\/assets\/fonts\/([\w-]+)\.woff'\)/g, (m, n) => `url(data:font/woff;base64,${b64('public/fonts/' + n + '.woff')})`);
// Кабинет и клиент в одном файле: стили кабинета, которые совпадают по имени с клиентскими, не пересекаются (разные классы).
css += `
body.demo { padding-top: 36px; }
body.demo .top { top: 36px; }
@media (min-width: 960px) { body.demo .side { top: 36px; height: calc(100dvh - 36px); } }
.demo-bar { position: fixed; top: 0; left: 0; right: 0; z-index: 90; height: 36px; display: flex; align-items: center; gap: 10px; padding: 0 max(12px, env(safe-area-inset-right, 0px)) 0 max(12px, env(safe-area-inset-left, 0px)); background: #000; border-bottom: 1px solid var(--line); font-size: 13px; }
.demo-tag { background: var(--accent); color: var(--accent-ink); font-weight: 700; padding: 2px 8px; border-radius: 6px; font-size: 12px; }
.demo-note { color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; min-width: 0; }
.demo-bar nav { display: flex; gap: 4px; flex: none; }
.demo-bar nav a, .demo-bar nav button { padding: 4px 10px; border-radius: 99px; color: var(--muted); font-weight: 600; font-size: 13px; }
.demo-bar nav a.on { background: var(--card-3); color: var(--text); }
@media (max-width: 420px) { .demo-note { display: none; } }
#app.privacy main { max-width: 720px; margin: 0 auto; padding: 32px 16px 80px; display: grid; gap: 18px; }
#app.privacy h1 { font-size: clamp(30px, 6vw, 46px); }
#app.privacy h2 { font-size: 21px; font-weight: 800; letter-spacing: -.02em; margin-top: 14px; }
#app.privacy p, #app.privacy li { color: #C9CDD3; line-height: 1.6; margin: 0; }
#app.privacy ul { margin: 0; padding-left: 20px; display: grid; gap: 6px; }
`;
const html = `<title>Онлайн-запись в студию</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="theme-color" content="#0A0B0D">
<style>${css}</style>
<div id="app"></div>
<script>window.__MEDIA__ = ${JSON.stringify(media)};</script>
<script type="module">${js.replace(/<\/script/gi, '<\\/script')}</script>
`;
fs.mkdirSync(D('dist'), { recursive: true });
fs.writeFileSync(D('dist/index.html'), html);

// ——— Версия для GitHub Pages: устанавливается на телефон (манифест, иконки, офлайн) ———
const { makeIcon } = await import('../lib/icon.js');
const P = D('dist/pages');
fs.rmSync(P, { recursive: true, force: true });
fs.mkdirSync(P, { recursive: true });
const accent = JSON.parse(fs.readFileSync(path.join(ROOT, 'studios/examples/studio.json'), 'utf8')).theme.accent;
fs.writeFileSync(path.join(P, 'icon-192.png'), makeIcon('Ваша студия', accent, 192));
fs.writeFileSync(path.join(P, 'icon-512.png'), makeIcon('Ваша студия', accent, 512));
fs.writeFileSync(path.join(P, 'manifest.webmanifest'), JSON.stringify({
  name: 'Онлайн-запись', short_name: 'Запись', start_url: './', scope: './', display: 'standalone', orientation: 'portrait',
  background_color: '#0A0B0D', theme_color: '#0A0B0D', lang: 'ru',
  icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }],
}, null, 2));
const ver = Bun.hash(html).toString(36);
fs.writeFileSync(path.join(P, 'sw.js'), `const V='zapis-${ver}';
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(['./','./manifest.webmanifest','./icon-192.png','./icon-512.png'])).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x.startsWith('zapis-')&&x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return;
if(r.mode==='navigate'){e.respondWith(fetch(r).then(x=>{const c=x.clone();caches.open(V).then(k=>k.put('./',c));return x}).catch(()=>caches.match('./')));return}
e.respondWith(caches.match(r).then(h=>h||fetch(r)))});
`);
const pageHead = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Онлайн-запись в студию</title>
<meta name="description" content="Запись на детейлинг и автосервис онлайн: свободное время, цены и помощник.">
<meta name="theme-color" content="#0A0B0D">
<meta name="color-scheme" content="dark">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" href="icon-192.png">
<link rel="apple-touch-icon" href="icon-512.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Запись">
<meta property="og:title" content="Онлайн-запись в студию">
<meta property="og:description" content="Свободное время, цены и запись за минуту — без регистрации.">
<style>${css}</style>
</head>
<body>
<div id="app"></div>
<script>window.__MEDIA__ = ${JSON.stringify(media)}; window.__CAN_INSTALL__ = true;
if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('sw.js', { scope: './' }).catch(() => {}));</script>
<script type="module">${js.replace(/<\/script/gi, '<\\/script')}</script>
</body>
</html>
`;
fs.writeFileSync(path.join(P, 'index.html'), pageHead);
// Страница ошибки (нужна Yandex Object Storage): просто ведёт на главную.
fs.writeFileSync(path.join(P, 'error.html'), '<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=./"><title>Онлайн-запись</title><a href="./">Открыть онлайн-запись</a>\n');
console.log('demo/dist/pages/', fs.readdirSync(P).join(', '));
console.log('demo/dist/index.html', (html.length / 1024).toFixed(0), 'KB');
