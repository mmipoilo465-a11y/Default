import { mode, resetDemo, privacyPage } from './shim.js';

function bar() {
  const el = document.createElement('div');
  el.className = 'demo-bar';
  el.innerHTML = `<span class="demo-tag">Демо</span><span class="demo-note">записи сохраняются только на этом устройстве</span>
    <nav><a href="#client" class="${mode === 'client' ? 'on' : ''}">Клиент</a><a href="#admin" class="${mode === 'admin' ? 'on' : ''}">Кабинет</a><button type="button" id="demoReset">Сбросить</button></nav>`;
  document.body.prepend(el);
  document.body.classList.add('demo');
  el.querySelector('#demoReset').onclick = (e) => {
    if (!e.currentTarget.dataset.sure) { e.currentTarget.dataset.sure = 1; e.currentTarget.textContent = 'Точно?'; return; }
    resetDemo(); location.hash = 'client'; location.reload();
  };
}
addEventListener('hashchange', () => {
  const next = ({ admin: 'admin', privacy: 'privacy' })[location.hash.slice(1)] || 'client';
  if (next !== mode) location.reload();
});

bar();
if (mode === 'admin') await import('../public/js/admin.js');
else if (mode === 'privacy') {
  const html = privacyPage();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const app = document.getElementById('app');
  app.innerHTML = doc.querySelector('main').outerHTML;
  app.querySelector('main a').setAttribute('href', '#client');
  app.classList.add('privacy');
} else await import('../public/js/app.js');
