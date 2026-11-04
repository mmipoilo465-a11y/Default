// Общие помощники интерфейса для клиентской части и кабинета.
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (sel, el = document) => el.querySelector(sel);
export const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

const P = {
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
  map: '<path d="M12 22s-7-6.1-7-12a7 7 0 0 1 14 0c0 5.9-7 12-7 12z"/><circle cx="12" cy="10" r="2.6"/>',
  chat: '<path d="M21 12a8.5 8.5 0 0 1-12.4 7.6L3 21l1.5-5.2A8.5 8.5 0 1 1 21 12z"/>',
  spark: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  cal: '<rect x="3" y="4.5" width="18" height="17" rx="3"/><path d="M3 10h18M8 2.5v4M16 2.5v4"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  back: '<path d="M19 12H5M11 18l-6-6 6-6"/>',
  left: '<path d="m15 18-6-6 6-6"/>',
  right: '<path d="m9 18 6-6-6-6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  up: '<path d="m18 15-6-6-6 6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  car: '<path d="M5 17h14M3 13l2-6a2 2 0 0 1 1.9-1.4h10.2A2 2 0 0 1 19 7l2 6v4a1 1 0 0 1-1 1h-1M3 13v4a1 1 0 0 0 1 1h1M3 13h18"/><circle cx="7.5" cy="17" r="1.8"/><circle cx="16.5" cy="17" r="1.8"/>',
  send: '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  img: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.8"/><path d="m21 15-5-5L5 21"/>',
  trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
  money: '<rect x="2" y="6" width="20" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.6"/><path d="M6 12h.01M18 12h.01"/>',
  refund: '<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-15-6.7L3 13"/>',
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  out: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  ext: '<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  install: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
  share: '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/>',
  box: '<path d="M3 21V9l9-6 9 6v12"/><path d="M7 21v-8h10v8"/>',
  tg: '<path d="m21.5 3.5-19 7.4c-.9.4-.9 1.6.1 1.9l4.7 1.5 1.8 5.6c.2.7 1.1.9 1.6.4l2.6-2.4 4.8 3.5c.6.4 1.4.1 1.6-.6L22.9 4.8c.2-.9-.6-1.6-1.4-1.3z"/><path d="m8.5 14.5 9-7.5"/>',
  drag: '<path d="M9 5h.01M9 12h.01M9 19h.01M15 5h.01M15 12h.01M15 19h.01"/>',
};
export const icon = (n, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ''}</svg>`;

export async function api(path, { method = 'GET', body, base } = {}) {
  const r = await fetch((base || '') + path, {
    method, credentials: 'same-origin',
    headers: method !== 'GET' ? { 'Content-Type': 'application/json' } : {},
    body: method !== 'GET' ? JSON.stringify(body ?? {}) : undefined,
  });
  let data = {};
  try { data = await r.json(); } catch {}
  if (!r.ok) { const e = new Error(data.error || 'Нет связи с сервером'); e.status = r.status; e.data = data; throw e; }
  return data;
}

let toastBox;
export function toast(text, { error = false, ms = 2800 } = {}) {
  if (!toastBox) { toastBox = document.createElement('div'); toastBox.className = 'toasts'; document.body.append(toastBox); }
  const t = document.createElement('div');
  t.className = 'toast' + (error ? ' err' : '');
  t.textContent = text;
  toastBox.append(t);
  setTimeout(() => { t.style.transition = 'opacity .3s'; t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, ms);
}

/** Шторка снизу на телефоне и окно по центру на компьютере. Закрывается кнопкой «Назад». */
const stack = [];
export function sheet({ title = '', body = '', foot = '', cls = '', onClose } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'sheet-wrap';
  wrap.innerHTML = `<div class="sheet-bg"></div><div class="sheet ${cls}" role="dialog" aria-modal="true"><div class="sheet-grab"></div>
    <div class="sheet-head"><h3></h3><button class="x-btn" data-close aria-label="Закрыть">${icon('x')}</button></div>
    <div class="sheet-body"></div><div class="sheet-foot hidden"></div></div>`;
  const s = { wrap, el: wrap.querySelector('.sheet'), head: wrap.querySelector('.sheet-head h3'), body: wrap.querySelector('.sheet-body'), foot: wrap.querySelector('.sheet-foot'), closed: false };
  s.setTitle = (t) => { s.head.innerHTML = t; };
  s.setBody = (h) => { if (typeof h === 'string') s.body.innerHTML = h; else { s.body.replaceChildren(h); } s.body.scrollTop = 0; };
  s.setFoot = (h) => { s.foot.classList.toggle('hidden', !h); if (typeof h === 'string') s.foot.innerHTML = h; else if (h) s.foot.replaceChildren(h); };
  s.close = (fromPop) => {
    if (s.closed) return; s.closed = true;
    const i = stack.indexOf(s); if (i >= 0) stack.splice(i, 1);
    wrap.remove();
    if (!stack.length) document.body.style.overflow = '';
    onClose && onClose();
  };
  s.setTitle(title); s.setBody(body); s.setFoot(foot);
  wrap.addEventListener('click', (e) => { if (e.target.classList.contains('sheet-bg') || e.target.closest('[data-close]')) s.close(); });
  document.body.append(wrap);
  document.body.style.overflow = 'hidden';
  stack.push(s);
  // Кнопка «Назад» на телефоне закрывает шторку, а не уходит со страницы.
  if (!(history.state && history.state.sheet)) history.pushState({ sheet: 1 }, '');
  return s;
}
window.addEventListener('popstate', () => {
  const top = stack[stack.length - 1];
  if (!top) return;
  top.close(true);
  if (stack.length) history.pushState({ sheet: 1 }, '');
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && stack.length) stack[stack.length - 1].close(); });
export const closeAllSheets = () => { while (stack.length) stack[stack.length - 1].close(); };

/** Упрощённый markdown для ответов помощника: **жирный**, переносы, ссылки. */
export function richText(s) {
  return esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener" style="text-decoration:underline">$1</a>').replace(/\n/g, '<br>');
}

/** Уменьшить фото перед отправкой. */
export function resizeImage(file, max = 1600, type = 'image/jpeg', quality = 0.85) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      const ctx = c.getContext('2d');
      if (type === 'image/jpeg') { ctx.fillStyle = '#0A0B0D'; ctx.fillRect(0, 0, c.width, c.height); }
      ctx.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL(type, quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Не удалось открыть изображение')); };
    img.src = url;
  });
}

/** Квадратная иконка приложения из логотипа: логотип по центру на тёмном фоне. */
export function iconFromLogo(dataUrl, size) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = c.height = size;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#0A0B0D'; ctx.fillRect(0, 0, size, size);
      const box = size * 0.62, k = Math.min(box / img.width, box / img.height);
      const w = img.width * k, h = img.height * k;
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      resolve(c.toDataURL('image/png'));
    };
    img.src = dataUrl;
  });
}

export function pickFile(accept = 'image/*') {
  return new Promise((resolve) => {
    const i = document.createElement('input');
    i.type = 'file'; i.accept = accept;
    i.onchange = () => resolve(i.files[0] || null);
    i.click();
  });
}

export function formatPhone(v) {
  let d = String(v).replace(/\D/g, '');
  if (!d) return '';
  if (d[0] === '8') d = '7' + d.slice(1);
  if (d[0] === '9') d = '7' + d;
  if (d[0] !== '7') return '+' + d.slice(0, 15);
  d = d.slice(0, 11);
  let s = '+7';
  if (d.length > 1) s += ' ' + d.slice(1, 4);
  if (d.length > 4) s += ' ' + d.slice(4, 7);
  if (d.length > 7) s += '-' + d.slice(7, 9);
  if (d.length > 9) s += '-' + d.slice(9, 11);
  return s;
}

/** Цвет текста на фирменном фоне: тёмный на светлом, светлый на тёмном. */
export function applyAccent(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return;
  const n = parseInt(m[1], 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  document.documentElement.style.setProperty('--accent', '#' + m[1]);
  document.documentElement.style.setProperty('--accent-ink', l > 0.5 ? '#0A0B0D' : '#FFFFFF');
}

export const busy = (btn, on = true) => {
  if (!btn) return;
  if (on) { btn.dataset.html = btn.innerHTML; btn.innerHTML = '<span class="spin"></span>'; btn.disabled = true; }
  else { if (btn.dataset.html) btn.innerHTML = btn.dataset.html; btn.disabled = false; }
};
