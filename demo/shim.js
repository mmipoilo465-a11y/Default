// Демо-режим: тот же интерфейс и та же логика, что на сервере, но вместо сервера — этот модуль.
// Он перехватывает запросы интерфейса к /<студия>/api/… и отвечает, используя общий код (lib/, core/).
import EXAMPLE from '../studios/examples/blesk.json';
import { normalize, publicView, applyPatch, newId } from '../lib/studios.js';
import * as B from '../lib/bookings.js';
import * as DB from './db.js';
import { answerClient, exampleQuestions } from '../lib/assistant-client.js';
import { answerOwner } from '../lib/assistant-owner.js';
import { summarize, overlapping } from '../core/stats.js';
import { openStatus, scheduleLines, mapLinks } from '../core/info.js';
import { googleCalUrl } from '../core/ics.js';
import { privacyHtml } from '../lib/privacy.js';
import { dateOf, addDays, fromMin, toMin, isDate } from '../core/time.js';
import { startsForDay, findBox } from '../core/slots.js';

const SLUG = 'blesk';
window.__SLUG__ = SLUG;
window.__DEMO__ = true;
window.__NO_PUSH__ = true;
window.__LINKS__ = { admin: '#admin', privacy: '#privacy', site: '#client' };
const PASSWORD = 'demo';
const CFG_KEY = `demo:${SLUG}:cfg`;

function loadCfg() {
  try { const saved = JSON.parse(localStorage.getItem(CFG_KEY)); if (saved) return normalize(saved, SLUG); } catch {}
  const c = structuredClone(EXAMPLE);
  c.owner = { email: c.owner.email, passwordHash: 'demo$' + PASSWORD };
  for (const [k, v] of Object.entries(window.__MEDIA__ || {})) {
    if (c.hero === k) c.hero = v;
    for (const g of c.gallery) if (g.image === k) g.image = v;
  }
  return normalize(c, SLUG);
}
let cfg = loadCfg();
const saveCfg = (next) => { cfg = normalize(next, SLUG); try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch { throw Object.assign(new Error('В демо закончилось место для фото — удалите лишние'), { status: 413 }); } return cfg; };
window.__DEMO_LOGIN__ = { email: cfg.owner.email, password: PASSWORD };

// ——— Демо-записи, чтобы кабинет не был пустым ———
function seed() {
  if (!DB.isEmpty() || localStorage.getItem(`demo:${SLUG}:seeded`)) return;
  const names = ['Алексей', 'Марина', 'Дмитрий', 'Ольга', 'Сергей', 'Анна', 'Игорь', 'Екатерина', 'Павел', 'Наталья'];
  const cars = ['Kia Rio, белый', 'BMW X5, чёрный', 'Toyota Camry', 'VW Tiguan', 'Hyundai Solaris', 'Mercedes GLE', 'Skoda Octavia', 'Audi Q7', 'Mazda CX-5'];
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const today = dateOf(B.nowOf(cfg));
  const from = addDays(today, -9), to = addDays(today, 6);
  const svcs = cfg.services.filter((s) => !s.hidden);
  for (let d = from; d <= to; d = addDays(d, 1)) {
    for (let k = 0, n = 2 + Math.floor(Math.random() * 3); k < n; k++) {
      const svc = pick(svcs.filter((s) => !s.days || Math.random() < 0.25));
      const starts = startsForDay({ ...cfg, booking: { ...cfg.booking, minLeadMinutes: 0 } }, svc, d, toMin(d + 'T00:00'));
      const busy = DB.activeBookings(SLUG, from + 'T00:00');
      const free = starts.filter((t) => findBox(cfg, busy, svc, t));
      if (!free.length) continue;
      const t = free[Math.floor(Math.random() * Math.min(free.length, 6))];
      try {
        const b = B.createBooking(cfg, { serviceId: svc.id, date: d, time: fromMin(t).slice(11), clientName: pick(names), clientPhone: '+7916' + String(1000000 + Math.floor(Math.random() * 8999999)), car: pick(cars) }, { owner: true });
        if (d < today || (d === today && Math.random() < 0.5)) {
          if (Math.random() < 0.07) { B.setStatus(cfg, b.id, 'cancelled'); continue; }
          B.setStatus(cfg, b.id, d < today || Math.random() < 0.5 ? 'ready' : 'accepted');
          if (d < today && Math.random() < 0.9) { B.addPayment(cfg, b.id, { kind: 'payment', amount: b.price, method: pick(['Карта', 'Наличные', 'Перевод']) }); DB.setPaymentDate(b.id, b.end.slice(0, 10) <= today ? b.end : `${d}T18:00`); }
        }
      } catch {}
    }
  }
  try { localStorage.setItem(`demo:${SLUG}:seeded`, '1'); } catch {}
}

export function resetDemo() {
  try { for (const k of Object.keys(localStorage)) if (k.startsWith('demo:') || k.startsWith(SLUG + ':')) localStorage.removeItem(k); sessionStorage.clear(); } catch {}
}

function studioPayload() {
  const now = B.nowOf(cfg);
  return { ...publicView(cfg), now: fromMin(now), today: dateOf(now), status: openStatus(cfg, now), scheduleLines: scheduleLines(cfg), links: mapLinks(cfg), examples: exampleQuestions(cfg), vapidKey: '', iconV: '1' };
}
const adminConfig = () => { const { owner, ...rest } = cfg; return { ...rest, ownerEmail: owner.email || '' }; };
const calendar = (bk) => ({ google: googleCalUrl(cfg, bk), ics: null });
const err = (status, message, extra) => { throw Object.assign(new Error(message), { status, extra }); };
let loggedIn = (() => { try { return sessionStorage.getItem('demo:admin') === '1'; } catch { return false; } })();

async function route(method, path, query, body) {
  const [a, b, c, d] = path;
  if (a === 'studio') return studioPayload();
  if (a === 'slots') return { days: B.slotsFor(cfg, query.get('service'), query.get('from'), query.get('days')) };
  if (a === 'assistant') return answerClient(cfg, body.message, body.context || {});
  if (a === 'bookings' && !b && method === 'POST') { const bk = B.createBooking(cfg, body); return { booking: B.publicBooking(cfg, bk), calendar: calendar(bk) }; }
  if (a === 'bookings' && b) {
    const bk = DB.getByToken(SLUG, b); if (!bk) err(404, 'Запись не найдена');
    if (!c) return { booking: B.publicBooking(cfg, bk), calendar: calendar(bk) };
    if (c === 'cancel') { if (bk.status !== 'booked') err(400, 'Запись уже отменена'); return { booking: B.publicBooking(cfg, B.setStatus(cfg, bk.id, 'cancelled')) }; }
    if (c === 'forget') { if (bk.status === 'booked' && bk.end > B.nowStr(cfg)) err(400, 'Сначала отмените запись'); DB.anonymizeBooking(SLUG, bk.id, B.nowStr(cfg)); return { ok: true }; }
    if (c === 'reminder') return { ok: true };
  }
  if (a === 'admin') {
    if (b === 'login') {
      if (String(body.email || '').trim().toLowerCase() !== cfg.owner.email.toLowerCase() || body.password !== PASSWORD) err(401, 'Неверная почта или пароль');
      loggedIn = true; try { sessionStorage.setItem('demo:admin', '1'); } catch {}
      return { ok: true };
    }
    if (!loggedIn) err(401, 'Войдите в кабинет');
    if (b === 'logout') { loggedIn = false; try { sessionStorage.removeItem('demo:admin'); } catch {} return { ok: true }; }
    if (b === 'config' && method === 'GET') return { config: adminConfig(), today: dateOf(B.nowOf(cfg)), now: B.nowStr(cfg) };
    if (b === 'config' && method === 'PUT') {
      const futureBoxIds = new Set(DB.activeBookings(SLUG, dateOf(B.nowOf(cfg)) + 'T00:00').map((x) => x.boxId));
      saveCfg(applyPatch(cfg, body, { futureBoxIds })); return { config: adminConfig() };
    }
    if (b === 'password') err(400, 'В демо пароль не меняется');
    if (b === 'media') {
      const next = structuredClone(cfg);
      if (body.kind === 'hero') next.hero = body.dataUrl;
      else if (body.kind === 'logo') next.logo = body.remove ? null : body.dataUrl;
      else if (body.kind === 'gallery-new') next.gallery.push({ id: newId('w'), image: body.dataUrl, caption: String(body.caption || '').slice(0, 140) });
      else if (body.kind === 'gallery-replace') { const g = next.gallery.find((x) => x.id === body.id); if (!g) err(404, 'Карточка не найдена'); g.image = body.dataUrl; }
      saveCfg(next); return { config: adminConfig() };
    }
    if (b === 'gallery' && c) {
      const next = structuredClone(cfg); const i = next.gallery.findIndex((g) => g.id === c); if (i < 0) err(404, 'Карточка не найдена');
      if (method === 'PATCH') {
        if ('caption' in body) next.gallery[i].caption = String(body.caption || '').trim().slice(0, 140);
        if (body.move) { const j = i + (body.move < 0 ? -1 : 1); if (j >= 0 && j < next.gallery.length) [next.gallery[i], next.gallery[j]] = [next.gallery[j], next.gallery[i]]; }
      } else next.gallery.splice(i, 1);
      saveCfg(next); return { config: adminConfig() };
    }
    if (b === 'bookings' && !c && method === 'GET') {
      const today = dateOf(B.nowOf(cfg));
      const from = isDate(query.get('from')) ? query.get('from') : today, to = isDate(query.get('to')) ? query.get('to') : from;
      const list = DB.bookingsInRange(SLUG, from + 'T00:00', addDays(to, 1) + 'T00:00');
      return { bookings: overlapping(list, from, to), summary: summarize(list, from, to), today, now: B.nowStr(cfg) };
    }
    if (b === 'bookings' && !c && method === 'POST') return { booking: B.createBooking(cfg, body, { owner: true }) };
    if (b === 'bookings' && c) {
      if (!d && method === 'GET') { const bk = DB.getBooking(SLUG, c); if (!bk) err(404, 'Запись не найдена'); return { booking: bk }; }
      if (!d && method === 'PATCH') {
        let bk;
        if (body.date || body.time) bk = B.rescheduleBooking(cfg, c, body);
        if (body.status) bk = B.setStatus(cfg, c, body.status);
        if (['clientName', 'clientPhone', 'car', 'comment', 'price'].some((k) => k in body)) bk = B.editDetails(cfg, c, body);
        return { booking: bk || DB.getBooking(SLUG, c) };
      }
      if (d === 'anonymize') { DB.anonymizeBooking(SLUG, c, B.nowStr(cfg)); return { booking: DB.getBooking(SLUG, c) }; }
      if (d === 'payments' && method === 'POST') return { booking: B.addPayment(cfg, c, body) };
      if (d === 'payments' && method === 'DELETE') { DB.deletePayment(SLUG, c, path[4]); return { booking: DB.getBooking(SLUG, c) }; }
    }
    if (b === 'slots') return { days: B.slotsFor(cfg, query.get('service'), query.get('from'), query.get('days'), { owner: true, excludeId: query.get('exclude') || undefined }) };
    if (b === 'assistant') return answerOwner(cfg, body.message);
    if (b === 'privacy') {
      const digits = String(body.phone || '').replace(/\D/g, ''); if (digits.length < 10) err(400, 'Введите номер телефона полностью');
      const list = DB.bookingsByPhone(SLUG, digits);
      if (c === 'find') return { bookings: list };
      let n = 0; for (const bk of list) n += DB.anonymizeBooking(SLUG, bk.id, B.nowStr(cfg)); return { anonymized: n };
    }
  }
  err(404, 'Не найдено');
}

// Перехват запросов интерфейса
const realFetch = window.fetch.bind(window);
window.fetch = async (input, init = {}) => {
  const url = new URL(typeof input === 'string' ? input : input.url, location.href);
  const prefix = `/${SLUG}/api/`;
  const i = url.pathname.indexOf(prefix);
  if (i < 0) return realFetch(input, init);
  const path = url.pathname.slice(i + prefix.length).split('/').filter(Boolean);
  const method = (init.method || 'GET').toUpperCase();
  let body = {};
  try { body = init.body ? JSON.parse(init.body) : {}; } catch {}
  try {
    const data = await route(method, path, url.searchParams, body);
    return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    const status = e.status || 500;
    if (status >= 500) console.error(e);
    return new Response(JSON.stringify({ error: status >= 500 ? 'Что-то пошло не так' : e.message, ...(e.extra || {}) }), { status, headers: { 'Content-Type': 'application/json' } });
  }
};

seed();
export const mode = ({ admin: 'admin', privacy: 'privacy' })[location.hash.slice(1)] || 'client';
window.__BOOT__ = mode === 'admin' ? { slug: SLUG, name: cfg.name, accent: cfg.theme.accent } : studioPayload();
document.documentElement.style.setProperty('--accent', cfg.theme.accent);
export const privacyPage = () => privacyHtml(cfg, '');
