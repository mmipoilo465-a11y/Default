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
const html = `<title>Блеск — онлайн-запись</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="theme-color" content="#0A0B0D">
<style>${css}</style>
<div id="app"></div>
<script>window.__MEDIA__ = ${JSON.stringify(media)};</script>
<script type="module">${js.replace(/<\/script/gi, '<\\/script')}</script>
`;
fs.mkdirSync(D('dist'), { recursive: true });
fs.writeFileSync(D('dist/index.html'), html);
console.log('demo/dist/index.html', (html.length / 1024).toFixed(0), 'KB');
