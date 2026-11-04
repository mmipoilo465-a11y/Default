// Сервер записи в автосервис / детейлинг. Без внешних зависимостей: Node ≥ 22.5.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { PUBLIC, CORE, MEDIA_DIR, ROOT } from './lib/paths.js';
import { json, send, readJson, parseCookies, serveFile, HttpError, rateLimit, clientIp, isHttps, originOf, escHtml, fwdHost } from './lib/http.js';
import { getStudio, saveStudio, publicView, applyPatch, listStudios, seedExamples, newId } from './lib/studios.js';
import * as DB from './lib/db.js';
import * as B from './lib/bookings.js';
import { verifyPassword, hashPassword, token as newToken } from './lib/auth.js';
import { answerClient, exampleQuestions } from './lib/assistant-client.js';
import { answerOwner } from './lib/assistant-owner.js';
import { vapidKeys } from './lib/webpush.js';
import { startReminders } from './lib/reminders.js';
import { makeIcon } from './lib/icon.js';
import { buildIcs, googleCalUrl } from './core/ics.js';
import { privacyHtml } from './lib/privacy.js';
import { startMaintenance } from './lib/maintenance.js';
import { openStatus, scheduleLines, mapLinks } from './core/info.js';
import { summarize, overlapping } from './core/stats.js';
import { dateOf, addDays, isDate, fromMin, fmtPrice } from './core/time.js';

const PORT = Number(process.env.PORT || 3000);
const PROD = process.env.NODE_ENV === 'production';
// Примеры с демо-паролями в рабочей установке не создаём (только по явному SEED_EXAMPLES=1).
if (!PROD || process.env.SEED_EXAMPLES === '1') seedExamples({ randomPasswords: PROD });

// ——— HTML-шаблоны ———
const tpl = (name) => fs.readFileSync(path.join(PUBLIC, name), 'utf8');
const TEMPLATES = { app: tpl('app.html'), admin: tpl('admin.html') };
const DEV = process.env.NODE_ENV !== 'production';
const template = (name) => (DEV ? tpl(`${name}.html`) : TEMPLATES[name]);

const ASSET_V = (() => {
  // версия статики — для сброса кэша после обновления кода
  const h = crypto.createHash('sha1');
  for (const dir of ['js', 'css']) for (const f of fs.readdirSync(path.join(PUBLIC, dir))) h.update(fs.readFileSync(path.join(PUBLIC, dir, f)));
  for (const f of fs.readdirSync(CORE)) h.update(fs.readFileSync(path.join(CORE, f)));
  h.update(fs.readFileSync(path.join(PUBLIC, 'sw.js')));
  return h.digest('hex').slice(0, 10);
})();

function iconVersion(cfg) {
  return crypto.createHash('sha1').update(`${cfg.name}|${cfg.theme.accent}|${cfg.iconFile || ''}`).digest('hex').slice(0, 8);
}

function studioPayload(cfg) {
  const now = B.nowOf(cfg);
  return {
    ...publicView(cfg),
    now: fromMin(now), today: dateOf(now),
    status: openStatus(cfg, now),
    scheduleLines: scheduleLines(cfg),
    links: mapLinks(cfg),
    examples: exampleQuestions(cfg),
    vapidKey: vapidKeys().publicKey,
    iconV: iconVersion(cfg),
  };
}

function renderPage(req, res, cfg, which) {
  const nonce = crypto.randomBytes(16).toString('base64');
  const origin = originOf(req);
  const hero = cfg.hero ? (cfg.hero.startsWith('http') ? cfg.hero : origin + cfg.hero) : '';
  const minPrice = Math.min(...cfg.services.filter((s) => !s.hidden && s.price > 0).map((s) => s.price));
  const desc = cfg.tagline || `${cfg.kind}. Онлайн-запись${Number.isFinite(minPrice) ? `, цены от ${minPrice.toLocaleString('ru-RU')} ${cfg.currency}` : ''}.`;
  const v = iconVersion(cfg);
  const boot = which === 'app' ? studioPayload(cfg) : { slug: cfg.slug, name: cfg.name, accent: cfg.theme.accent };
  const html = template(which)
    .replaceAll('{{TITLE}}', escHtml(which === 'admin' ? `Кабинет · ${cfg.name}` : `${cfg.name} — ${cfg.kind}`.replace(/ — $/, '')))
    .replaceAll('{{NAME}}', escHtml(cfg.name))
    .replaceAll('{{DESC}}', escHtml(desc))
    .replaceAll('{{OG_IMAGE}}', escHtml(hero))
    .replaceAll('{{URL}}', escHtml(`${origin}/${cfg.slug}/`))
    .replaceAll('{{ACCENT}}', escHtml(cfg.theme.accent))
    .replaceAll('{{SLUG}}', escHtml(cfg.slug))
    .replaceAll('{{V}}', ASSET_V)
    .replaceAll('{{NONCE}}', nonce)
    .replaceAll('{{ICON_V}}', v)
    .replaceAll('{{MANIFEST}}', `/${cfg.slug}/${which === 'admin' ? 'admin.webmanifest' : 'manifest.webmanifest'}?v=${v}`)
    .replace('{{BOOT}}', JSON.stringify(boot).replace(/</g, '\\u003c'));
  send(res, 200, html, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache', 'Content-Security-Policy': csp(nonce), ...(which === 'admin' ? { 'X-Robots-Tag': 'noindex, nofollow' } : {}) });
}

function csp(nonce) {
  return ["default-src 'self'", `script-src 'self' 'nonce-${nonce}'`, `style-src 'self' 'unsafe-inline'`, "img-src 'self' data: blob:", "font-src 'self'",
    "connect-src 'self'", "manifest-src 'self'", "worker-src 'self'", "object-src 'none'", "base-uri 'none'", "form-action 'self'", "frame-ancestors 'none'"].join('; ');
}

function manifest(cfg, admin) {
  const v = iconVersion(cfg);
  const base = `/${cfg.slug}/`;
  return {
    id: admin ? `${base}admin` : base,
    name: admin ? `Кабинет · ${cfg.name}` : cfg.name,
    short_name: (admin ? 'Кабинет' : cfg.name).slice(0, 12),
    description: cfg.tagline || cfg.kind,
    start_url: admin ? `${base}admin` : base,
    scope: base,
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0A0B0D',
    theme_color: '#0A0B0D',
    lang: 'ru',
    icons: [
      { src: `${base}icon-192.png?v=${v}`, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: `${base}icon-512.png?v=${v}`, sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: `${base}icon-512.png?v=${v}`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}

function sendIcon(res, cfg, size) {
  if (cfg.iconFile) {
    const f = path.join(MEDIA_DIR, cfg.slug, `${cfg.iconFile}-${size >= 512 ? 512 : 192}.png`);
    if (fs.existsSync(f)) { send(res, 200, fs.readFileSync(f), { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' }); return; }
  }
  send(res, 200, makeIcon(cfg.name, cfg.theme.accent, size), { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' });
}

// ——— Медиа владельца ———
function saveDataUrl(slug, dataUrl, prefix) {
  const m = /^data:image\/(jpeg|png|webp);base64,(.+)$/.exec(String(dataUrl || ''));
  if (!m) throw new HttpError(400, 'Нужна картинка JPG, PNG или WebP');
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > 8 * 1024 * 1024) throw new HttpError(413, 'Фото больше 8 МБ — уменьшите его');
  const sig = buf.subarray(0, 12);
  const ok = (m[1] === 'jpeg' && sig[0] === 0xff && sig[1] === 0xd8) || (m[1] === 'png' && sig.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])))
    || (m[1] === 'webp' && sig.subarray(0, 4).toString() === 'RIFF' && sig.subarray(8, 12).toString() === 'WEBP');
  if (!ok) throw new HttpError(400, 'Файл не похож на изображение');
  const dir = path.join(MEDIA_DIR, slug);
  fs.mkdirSync(dir, { recursive: true });
  const name = `${prefix}-${Date.now().toString(36)}${crypto.randomBytes(2).toString('hex')}.${m[1] === 'jpeg' ? 'jpg' : m[1]}`;
  fs.writeFileSync(path.join(dir, name), buf);
  return `/media/${slug}/${name}`;
}
function removeMedia(slug, url) {
  if (!url || !url.startsWith(`/media/${slug}/`)) return; // общие картинки не трогаем
  const f = path.join(MEDIA_DIR, slug, path.basename(url));
  fs.rm(f, { force: true }, () => {});
}

// ——— Авторизация владельца ———
const COOKIE = 'sb_owner';
function ownerOf(req, slug) {
  const t = parseCookies(req)[`${COOKIE}_${slug}`];
  return DB.sessionStudio(t) === slug ? t : null;
}
const cookie = (req, slug, val, maxAge) => `${COOKIE}_${slug}=${val}; Path=/${slug}/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${isHttps(req) ? '; Secure' : ''}`;

function adminConfig(cfg) {
  const { owner, ...rest } = cfg;
  return { ...rest, ownerEmail: owner.email || '' };
}

function withSummary(cfg, from, to) {
  const list = DB.bookingsInRange(cfg.slug, from + 'T00:00', addDays(to, 1) + 'T00:00');
  return { bookings: overlapping(list, from, to), summary: summarize(list, from, to) };
}

// ——— Маршруты API студии ———
async function studioApi(req, res, cfg, parts) {
  const [a, b, c] = parts;
  const M = req.method;
  const slug = cfg.slug;

  // Защита от подделки запросов с чужих сайтов: изменения — только JSON и только со своего адреса.
  if (M !== 'GET' && M !== 'HEAD') {
    if (!String(req.headers['content-type'] || '').startsWith('application/json')) throw new HttpError(415, 'Неверный формат запроса');
    const origin = req.headers.origin;
    if (origin && new URL(origin).host !== fwdHost(req)) throw new HttpError(403, 'Запрос с чужого сайта отклонён');
  }

  // Публичная часть
  if (a === 'studio' && M === 'GET') return json(res, 200, studioPayload(cfg));
  if (a === 'slots' && M === 'GET') {
    const u = new URL(req.url, 'http://x');
    return json(res, 200, { days: B.slotsFor(cfg, u.searchParams.get('service'), u.searchParams.get('from'), u.searchParams.get('days')) });
  }
  if (a === 'assistant' && M === 'POST') {
    rateLimit(`as:${clientIp(req)}`, 40, 60_000);
    const body = await readJson(req, 20_000);
    return json(res, 200, await answerClient(cfg, body.message, body.context || {}));
  }
  if (a === 'bookings' && !b && M === 'POST') {
    rateLimit(`bk:${slug}:${clientIp(req)}`, 8, 10 * 60_000);
    const body = await readJson(req, 20_000);
    const bk = B.createBooking(cfg, body);
    return json(res, 201, { booking: B.publicBooking(cfg, bk), calendar: { google: googleCalUrl(cfg, bk), ics: `/${slug}/api/bookings/${bk.token}/ics` } });
  }
  if (a === 'bookings' && b) {
    const bk = DB.getByToken(slug, b);
    if (!bk) throw new HttpError(404, 'Запись не найдена');
    if (!c && M === 'GET') return json(res, 200, { booking: B.publicBooking(cfg, bk), calendar: { google: googleCalUrl(cfg, bk), ics: `/${slug}/api/bookings/${bk.token}/ics` } });
    if (c === 'ics' && M === 'GET') {
      return send(res, 200, buildIcs(cfg, bk), { 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': `inline; filename="zapis-${bk.code}.ics"`, 'Cache-Control': 'no-store' });
    }
    if (c === 'cancel' && M === 'POST') {
      if (bk.status !== 'booked') throw new HttpError(400, bk.status === 'cancelled' ? 'Запись уже отменена' : 'Машина уже в работе — позвоните нам');
      const upd = B.setStatus(cfg, bk.id, 'cancelled');
      return json(res, 200, { booking: B.publicBooking(cfg, upd) });
    }
    if (c === 'forget' && M === 'POST') {
      // Клиент сам удаляет свои данные из отменённой или прошедшей записи.
      if (bk.status === 'booked' && bk.end > B.nowStr(cfg)) throw new HttpError(400, 'Сначала отмените запись');
      DB.anonymizeBooking(slug, bk.id, B.nowStr(cfg));
      return json(res, 200, { ok: true });
    }
    if (c === 'reminder' && M === 'POST') {
      const body = await readJson(req, 10_000);
      const sub = body.subscription;
      if (body.off) DB.setPushSub(slug, bk.id, null);
      else {
        if (!sub?.endpoint || !/^https:\/\//.test(sub.endpoint) || !sub.keys?.p256dh || !sub.keys?.auth) throw new HttpError(400, 'Не удалось включить уведомления');
        DB.setPushSub(slug, bk.id, { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } });
      }
      return json(res, 200, { ok: true });
    }
  }

  // Кабинет владельца
  if (a === 'admin') {
    if (b === 'login' && M === 'POST') {
      rateLimit(`login:${slug}:${clientIp(req)}`, 10, 15 * 60_000);
      rateLimit(`login-acct:${slug}`, 40, 60 * 60_000);
      const body = await readJson(req, 10_000);
      const ok = String(body.email || '').trim().toLowerCase() === String(cfg.owner.email || '').toLowerCase() && verifyPassword(body.password, cfg.owner.passwordHash);
      if (!ok) throw new HttpError(401, 'Неверная почта или пароль');
      const t = newToken();
      DB.createSession(t, slug);
      return json(res, 200, { ok: true }, { 'Set-Cookie': cookie(req, slug, t, 60 * 86400) });
    }
    const session = ownerOf(req, slug);
    if (!session) throw new HttpError(401, 'Войдите в кабинет');
    if (b === 'logout' && M === 'POST') { DB.dropSession(session); return json(res, 200, { ok: true }, { 'Set-Cookie': cookie(req, slug, '', 0) }); }
    if (b === 'config' && M === 'GET') return json(res, 200, { config: adminConfig(cfg), today: dateOf(B.nowOf(cfg)), now: B.nowStr(cfg) });
    if (b === 'config' && M === 'PUT') {
      const patch = await readJson(req, 200_000);
      const today = dateOf(B.nowOf(cfg));
      const futureBoxIds = new Set(DB.activeBookings(slug, today + 'T00:00').map((x) => x.boxId));
      const next = applyPatch(cfg, patch, { futureBoxIds });
      return json(res, 200, { config: adminConfig(saveStudio(slug, next)) });
    }
    if (b === 'password' && M === 'POST') {
      const body = await readJson(req, 10_000);
      if (!verifyPassword(body.old, cfg.owner.passwordHash)) throw new HttpError(400, 'Текущий пароль неверный');
      if (String(body.password || '').length < 6) throw new HttpError(400, 'Новый пароль — минимум 6 символов');
      const next = structuredClone(cfg);
      next.owner = { ...next.owner, passwordHash: hashPassword(String(body.password)) };
      if (body.email && /^\S+@\S+\.\S+$/.test(body.email)) next.owner.email = String(body.email).trim();
      saveStudio(slug, next);
      DB.dropStudioSessions(slug, session);
      return json(res, 200, { ok: true });
    }
    if (b === 'media' && M === 'POST') {
      const body = await readJson(req, 16 * 1024 * 1024);
      const next = structuredClone(cfg);
      if (body.kind === 'hero') { removeMedia(slug, cfg.hero); next.hero = saveDataUrl(slug, body.dataUrl, 'hero'); }
      else if (body.kind === 'logo') {
        if (body.remove) { removeMedia(slug, cfg.logo); next.logo = null; next.iconFile = null; }
        else {
          removeMedia(slug, cfg.logo);
          next.logo = saveDataUrl(slug, body.dataUrl, 'logo');
          if (body.icon512 && body.icon192) {
            const id = 'icon' + Date.now().toString(36);
            const dir = path.join(MEDIA_DIR, slug);
            for (const [k, s] of [['icon512', 512], ['icon192', 192]]) {
              const m = /^data:image\/png;base64,(.+)$/.exec(body[k]);
              if (m) fs.writeFileSync(path.join(dir, `${id}-${s}.png`), Buffer.from(m[1], 'base64'));
            }
            if (cfg.iconFile) for (const s of [512, 192]) fs.rm(path.join(dir, `${cfg.iconFile}-${s}.png`), { force: true }, () => {});
            next.iconFile = id;
          }
        }
      } else if (body.kind === 'gallery-new') {
        next.gallery.push({ id: newId('w'), image: saveDataUrl(slug, body.dataUrl, 'work'), caption: String(body.caption || '').slice(0, 140) });
      } else if (body.kind === 'gallery-replace') {
        const item = next.gallery.find((g) => g.id === body.id);
        if (!item) throw new HttpError(404, 'Карточка не найдена');
        removeMedia(slug, item.image);
        item.image = saveDataUrl(slug, body.dataUrl, 'work');
      } else throw new HttpError(400, 'Неизвестное действие');
      return json(res, 200, { config: adminConfig(saveStudio(slug, next)) });
    }
    if (b === 'gallery' && c) {
      const next = structuredClone(cfg);
      const i = next.gallery.findIndex((g) => g.id === c);
      if (i < 0) throw new HttpError(404, 'Карточка не найдена');
      if (M === 'PATCH') {
        const body = await readJson(req, 10_000);
        if ('caption' in body) next.gallery[i].caption = String(body.caption || '').trim().slice(0, 140);
        if (body.move) { const j = i + (body.move < 0 ? -1 : 1); if (j >= 0 && j < next.gallery.length) [next.gallery[i], next.gallery[j]] = [next.gallery[j], next.gallery[i]]; }
      } else if (M === 'DELETE') { removeMedia(slug, next.gallery[i].image); next.gallery.splice(i, 1); }
      return json(res, 200, { config: adminConfig(saveStudio(slug, next)) });
    }
    if (b === 'bookings' && !c && M === 'GET') {
      const u = new URL(req.url, 'http://x');
      const today = dateOf(B.nowOf(cfg));
      const from = isDate(u.searchParams.get('from')) ? u.searchParams.get('from') : today;
      const to = isDate(u.searchParams.get('to')) ? u.searchParams.get('to') : from;
      return json(res, 200, { ...withSummary(cfg, from, to), today, now: B.nowStr(cfg) });
    }
    if (b === 'bookings' && !c && M === 'POST') {
      const body = await readJson(req, 20_000);
      return json(res, 201, { booking: B.createBooking(cfg, body, { owner: true }) });
    }
    if (b === 'bookings' && c) {
      const action = parts[3];
      if (!action && M === 'GET') { const bk = DB.getBooking(slug, c); if (!bk) throw new HttpError(404, 'Запись не найдена'); return json(res, 200, { booking: bk }); }
      if (!action && M === 'PATCH') {
        const body = await readJson(req, 20_000);
        let bk;
        if (body.date || body.time) bk = B.rescheduleBooking(cfg, c, body);
        if (body.status) bk = B.setStatus(cfg, c, body.status);
        if (['clientName', 'clientPhone', 'car', 'comment', 'price'].some((k) => k in body)) bk = B.editDetails(cfg, c, body);
        return json(res, 200, { booking: bk || DB.getBooking(slug, c) });
      }
      if (action === 'anonymize' && M === 'POST') {
        DB.anonymizeBooking(slug, c, B.nowStr(cfg));
        return json(res, 200, { booking: DB.getBooking(slug, c) });
      }
      if (action === 'payments' && M === 'POST') {
        const body = await readJson(req, 10_000);
        return json(res, 201, { booking: B.addPayment(cfg, c, body) });
      }
      if (action === 'payments' && parts[4] && M === 'DELETE') {
        DB.deletePayment(slug, c, parts[4]);
        return json(res, 200, { booking: DB.getBooking(slug, c) });
      }
    }
    if (b === 'privacy' && c === 'find' && M === 'POST') {
      const body = await readJson(req, 10_000);
      const digits = String(body.phone || '').replace(/\D/g, '');
      if (digits.length < 10) throw new HttpError(400, 'Введите номер телефона полностью');
      return json(res, 200, { bookings: DB.bookingsByPhone(slug, digits) });
    }
    if (b === 'privacy' && c === 'forget' && M === 'POST') {
      const body = await readJson(req, 10_000);
      const digits = String(body.phone || '').replace(/\D/g, '');
      if (digits.length < 10) throw new HttpError(400, 'Введите номер телефона полностью');
      let n = 0;
      for (const bk of DB.bookingsByPhone(slug, digits)) n += DB.anonymizeBooking(slug, bk.id, B.nowStr(cfg));
      return json(res, 200, { anonymized: n });
    }
    if (b === 'export' && M === 'GET') {
      const rows = DB.allBookings(slug);
      const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const head = ['Код', 'Начало', 'Окончание', 'Услуга', 'Бокс', 'Статус', 'Цена', 'Оплачено', 'Клиент', 'Телефон', 'Автомобиль', 'Комментарий', 'Источник', 'Создана'];
      const lines = rows.map((r) => [r.code, r.start, r.end, r.serviceName, cfg.boxes.find((x) => x.id === r.boxId)?.name || r.boxId, r.status, r.price, r.payments.reduce((s, p) => s + (p.kind === 'refund' ? -p.amount : p.amount), 0), r.clientName, r.clientPhone, r.car, r.comment, r.source, r.createdAt].map(q).join(';'));
      return send(res, 200, '\ufeff' + [head.map(q).join(';'), ...lines].join('\r\n'), { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="zapisi-${slug}.csv"`, 'Cache-Control': 'no-store' });
    }
    if (b === 'slots' && M === 'GET') {
      const u = new URL(req.url, 'http://x');
      return json(res, 200, { days: B.slotsFor(cfg, u.searchParams.get('service'), u.searchParams.get('from'), u.searchParams.get('days'), { owner: true, excludeId: u.searchParams.get('exclude') || undefined }) });
    }
    if (b === 'assistant' && M === 'POST') {
      const body = await readJson(req, 20_000);
      return json(res, 200, await answerOwner(cfg, body.message));
    }
  }
  throw new HttpError(404, 'Не найдено');
}

// ——— Главный обработчик ———
async function handle(req, res) {
  const url = new URL(req.url, 'http://x');
  const p = decodeURIComponent(url.pathname);

  if (p.startsWith('/assets/')) {
    const rel = p.slice('/assets/'.length);
    if (serveFile(req, res, PUBLIC, rel, { immutable: url.searchParams.has('v') || rel.startsWith('fonts/'), maxAge: 3600 })) return;
    return send(res, 404, 'Not found');
  }
  if (p.startsWith('/core/')) {
    if (serveFile(req, res, CORE, p.slice(6), { immutable: url.searchParams.has('v'), maxAge: 600 })) return;
    return send(res, 404, 'Not found');
  }
  if (p.startsWith('/media/')) {
    const rel = p.slice('/media/'.length);
    if (rel.startsWith('defaults/') && serveFile(req, res, path.join(PUBLIC, 'media'), rel, { maxAge: 86400 })) return;
    if (serveFile(req, res, MEDIA_DIR, rel, { immutable: true })) return;
    return send(res, 404, 'Not found');
  }
  if (p === '/' || p === '') {
    if (process.env.SHOW_INDEX === '1') {
      const items = listStudios().map((s) => getStudio(s)).filter(Boolean).map((c) => `<li><a href="/${c.slug}/">${escHtml(c.name)}</a> · <a href="/${c.slug}/admin">кабинет</a></li>`).join('');
      return send(res, 200, `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width"><title>Студии</title><body style="font:16px system-ui;background:#0a0b0d;color:#eee;padding:24px"><h1>Студии</h1><ul>${items}</ul>`, { 'Content-Type': 'text/html; charset=utf-8' });
    }
    return send(res, 200, '<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width"><title>Онлайн-запись</title><body style="font:16px system-ui;background:#0a0b0d;color:#888;display:grid;place-items:center;height:90vh">Онлайн-запись', { 'Content-Type': 'text/html; charset=utf-8' });
  }
  if (p === '/robots.txt') return send(res, 200, 'User-agent: *\nDisallow: /*/admin\nDisallow: /*/api/\n', { 'Content-Type': 'text/plain' });
  if (p === '/healthz') return send(res, 200, 'ok');

  const parts = p.split('/').filter(Boolean);
  const cfg = getStudio(parts[0]);
  if (!cfg) return send(res, 404, '<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width"><body style="font:16px system-ui;background:#0a0b0d;color:#888;display:grid;place-items:center;height:90vh">Студия не найдена', { 'Content-Type': 'text/html; charset=utf-8' });
  const rest = parts.slice(1);
  if (!rest.length && !p.endsWith('/')) { res.writeHead(301, { Location: `/${cfg.slug}/${url.search}` }); return res.end(); }

  switch (rest[0]) {
    case undefined: return renderPage(req, res, cfg, 'app');
    case 'admin': if (rest.length === 1) return renderPage(req, res, cfg, 'admin'); break;
    case 'privacy': { const n = crypto.randomBytes(16).toString('base64'); return send(res, 200, privacyHtml(cfg, n), { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': csp(n) }); }
    case 'manifest.webmanifest': return json(res, 200, manifest(cfg, false), { 'Content-Type': 'application/manifest+json; charset=utf-8', 'Cache-Control': 'no-cache' });
    case 'admin.webmanifest': return json(res, 200, manifest(cfg, true), { 'Content-Type': 'application/manifest+json; charset=utf-8', 'Cache-Control': 'no-cache' });
    case 'sw.js': return send(res, 200, fs.readFileSync(path.join(PUBLIC, 'sw.js'), 'utf8').replace('{{V}}', ASSET_V).replaceAll('{{SLUG}}', cfg.slug), { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-cache' });
    case 'icon-192.png': return sendIcon(res, cfg, 192);
    case 'icon-512.png': return sendIcon(res, cfg, 512);
    case 'apple-touch-icon.png': return sendIcon(res, cfg, 512);
    case 'api': return studioApi(req, res, cfg, rest.slice(1));
  }
  send(res, 404, 'Not found');
}

const BASE_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
};
const server = http.createServer(async (req, res) => {
  for (const [k, v] of Object.entries(BASE_HEADERS)) res.setHeader(k, v);
  if (isHttps(req)) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  if (req.url.includes('/api/')) res.setHeader('X-Robots-Tag', 'noindex');
  try {
    await handle(req, res);
  } catch (e) {
    const status = e.status || 500;
    if (status >= 500) console.error(e);
    json(res, status, { error: status >= 500 ? 'Что-то пошло не так. Попробуйте ещё раз.' : e.message, ...(e.extra || {}) });
  }
});

server.listen(PORT, () => {
  startReminders();
  startMaintenance();
  const list = listStudios();
  console.log(`Готово: http://localhost:${PORT}`);
  for (const s of list) console.log(`  /${s}/   кабинет: /${s}/admin`);
});

export { server };
