// Проверки изоляции студий, конфиденциальности и защиты. Запускает сервер на временной папке.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'sb-iso-'));
const PORT = 3900 + Math.floor(Math.random() * 90);
const U = `http://127.0.0.1:${PORT}`;
let proc;

before(async () => {
  proc = spawn(process.execPath, ['--no-warnings', 'server.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), DATA_DIR: DATA, NODE_ENV: 'test' }, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) { try { if ((await fetch(U + '/healthz')).ok) return; } catch {} await new Promise((r) => setTimeout(r, 100)); }
  throw new Error('server did not start');
});
after(() => proc.kill());

const J = (body, cookie, extra = {}) => ({ method: 'POST', headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}), ...extra }, body: JSON.stringify(body) });
async function login(slug, email, password) {
  const r = await fetch(`${U}/${slug}/api/admin/login`, J({ email, password }));
  assert.equal(r.status, 200);
  return r.headers.get('set-cookie').split(';')[0];
}
async function slot(slug, service) {
  const r = await (await fetch(`${U}/${slug}/api/slots?service=${service}&days=14`)).json();
  const d = r.days.find((x) => x.times.length);
  return { date: d.date, time: d.times[0] };
}

test('владелец одной студии не видит и не меняет данные другой', async () => {
  const blesk = await login('blesk', 'owner@blesk.ru', 'demo-blesk');
  const s = await slot('garage77', 'oil');
  const created = await (await fetch(`${U}/garage77/api/bookings`, J({ serviceId: 'oil', ...s, name: 'Клиент Гаража', phone: '+7 921 111-22-33', consent: true }))).json();
  const gToken = created.booking.token;

  // Сессия «Блеска», подставленная под имя cookie «Гаража», не пускает в кабинет «Гаража»
  const forged = blesk.replace('sb_owner_blesk', 'sb_owner_garage77');
  assert.equal((await fetch(`${U}/garage77/api/admin/bookings`, { headers: { cookie: forged } })).status, 401);
  assert.equal((await fetch(`${U}/garage77/api/admin/config`, { headers: { cookie: blesk } })).status, 401);

  // Токен записи «Гаража» не работает в «Блеске»
  assert.equal((await fetch(`${U}/blesk/api/bookings/${gToken}`)).status, 404);

  // id записи «Гаража» недоступен из кабинета «Блеска»
  const garage = await login('garage77', 'owner@garage77.ru', 'demo-garage');
  const list = await (await fetch(`${U}/garage77/api/admin/bookings?from=${s.date}&to=${s.date}`, { headers: { cookie: garage } })).json();
  const id = list.bookings.find((b) => b.token === gToken).id;
  assert.equal((await fetch(`${U}/blesk/api/admin/bookings/${id}`, { headers: { cookie: blesk } })).status, 404);
  const p = await fetch(`${U}/blesk/api/admin/bookings/${id}`, { ...J({ status: 'cancelled' }, blesk), method: 'PATCH' });
  assert.equal(p.status, 404);

  // В выгрузке и списке «Блеска» нет клиентов «Гаража»
  const csv = await (await fetch(`${U}/blesk/api/admin/export`, { headers: { cookie: blesk } })).text();
  assert.ok(!csv.includes('Клиент Гаража'));
  const found = await (await fetch(`${U}/blesk/api/admin/privacy/find`, J({ phone: '+79211112233' }, blesk))).json();
  assert.equal(found.bookings.length, 0);

  // Базы лежат в разных файлах
  assert.ok(fs.existsSync(path.join(DATA, 'db', 'garage77.db')));
  assert.ok(fs.existsSync(path.join(DATA, 'db', 'blesk.db')));
});

test('без согласия на обработку данных онлайн-запись не создаётся', async () => {
  const s = await slot('blesk', 'wash');
  const r = await fetch(`${U}/blesk/api/bookings`, J({ serviceId: 'wash', ...s, name: 'Иван', phone: '+79160000000' }));
  assert.equal(r.status, 400);
});

test('клиент может удалить свои данные из отменённой записи', async () => {
  const s = await slot('blesk', 'wash');
  const { booking } = await (await fetch(`${U}/blesk/api/bookings`, J({ serviceId: 'wash', ...s, name: 'Анна', phone: '+79160000001', car: 'Kia', consent: true }))).json();
  assert.equal((await fetch(`${U}/blesk/api/bookings/${booking.token}/forget`, J({}))).status, 400); // активную — нельзя
  await fetch(`${U}/blesk/api/bookings/${booking.token}/cancel`, J({}));
  assert.equal((await fetch(`${U}/blesk/api/bookings/${booking.token}/forget`, J({}))).status, 200);
  const after = await (await fetch(`${U}/blesk/api/bookings/${booking.token}`)).json();
  assert.equal(after.booking.clientName, '');
  assert.equal(after.booking.car, '');
});

test('запросы с чужих сайтов и не-JSON отклоняются', async () => {
  const s = await slot('blesk', 'wash');
  const body = JSON.stringify({ serviceId: 'wash', ...s, name: 'X', phone: '+79160000002', consent: true });
  assert.equal((await fetch(`${U}/blesk/api/bookings`, { method: 'POST', headers: { 'content-type': 'text/plain' }, body })).status, 415);
  assert.equal((await fetch(`${U}/blesk/api/bookings`, { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://evil.example' }, body })).status, 403);
});

test('страницы отдают защитные заголовки, кабинет не индексируется', async () => {
  const r = await fetch(`${U}/blesk/`);
  const csp = r.headers.get('content-security-policy');
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /script-src 'self' 'nonce-/);
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(r.headers.get('x-frame-options'), 'DENY');
  const html = await r.text();
  assert.ok(!html.includes('passwordHash') && !html.includes('owner@blesk.ru'), 'данные владельца не попадают на страницу');
  const a = await fetch(`${U}/blesk/admin`);
  assert.match(a.headers.get('x-robots-tag'), /noindex/);
  const studio = await (await fetch(`${U}/blesk/api/studio`)).text();
  assert.ok(!studio.includes('passwordHash') && !studio.includes('"owner"'));
});

test('cookie кабинета: HttpOnly, SameSite=Strict, только для своей студии', async () => {
  const r = await fetch(`${U}/blesk/api/admin/login`, J({ email: 'owner@blesk.ru', password: 'demo-blesk' }));
  const c = r.headers.get('set-cookie');
  assert.match(c, /HttpOnly/);
  assert.match(c, /SameSite=Strict/);
  assert.match(c, /Path=\/blesk\//);
});

test('загрузка «картинки», которая не является картинкой, отклоняется', async () => {
  const cookie = await login('blesk', 'owner@blesk.ru', 'demo-blesk');
  const fake = 'data:image/png;base64,' + Buffer.from('<script>alert(1)</script>').toString('base64');
  const r = await fetch(`${U}/blesk/api/admin/media`, J({ kind: 'gallery-new', dataUrl: fake }, cookie));
  assert.equal(r.status, 400);
});

test('сессии хранятся только в виде хэша', async () => {
  const cookie = await login('blesk', 'owner@blesk.ru', 'demo-blesk');
  const tokenValue = cookie.split('=')[1];
  const raw = fs.readFileSync(path.join(DATA, 'system.db'));
  assert.ok(!raw.includes(Buffer.from(tokenValue)));
});

test('страница политики конфиденциальности есть у каждой студии', async () => {
  for (const slug of ['blesk', 'garage77']) {
    const r = await fetch(`${U}/${slug}/privacy`);
    assert.equal(r.status, 200);
    assert.match(await r.text(), /Политика обработки персональных данных/);
  }
});
