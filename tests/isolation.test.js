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
  const own = await login('studio', 'owner@studio.ru', 'Start-2026');
  const s = await slot('garage77', 'oil');
  const created = await (await fetch(`${U}/garage77/api/bookings`, J({ serviceId: 'oil', ...s, name: 'Клиент Гаража', phone: '+7 921 111-22-33', consent: true }))).json();
  const gToken = created.booking.token;

  // Сессия «Студии», подставленная под имя cookie «Гаража», не пускает в кабинет «Гаража»
  const forged = own.replace('sb_owner_studio', 'sb_owner_garage77');
  assert.equal((await fetch(`${U}/garage77/api/admin/bookings`, { headers: { cookie: forged } })).status, 401);
  assert.equal((await fetch(`${U}/garage77/api/admin/config`, { headers: { cookie: own } })).status, 401);

  // Токен записи «Гаража» не работает в «Студии»
  assert.equal((await fetch(`${U}/studio/api/bookings/${gToken}`)).status, 404);

  // id записи «Гаража» недоступен из кабинета «Студии»
  const garage = await login('garage77', 'owner@garage77.ru', 'Start-2026');
  const list = await (await fetch(`${U}/garage77/api/admin/bookings?from=${s.date}&to=${s.date}`, { headers: { cookie: garage } })).json();
  const id = list.bookings.find((b) => b.token === gToken).id;
  assert.equal((await fetch(`${U}/studio/api/admin/bookings/${id}`, { headers: { cookie: own } })).status, 404);
  const p = await fetch(`${U}/studio/api/admin/bookings/${id}`, { ...J({ status: 'cancelled' }, own), method: 'PATCH' });
  assert.equal(p.status, 404);

  // В выгрузке и списке «Студии» нет клиентов «Гаража»
  const csv = await (await fetch(`${U}/studio/api/admin/export`, { headers: { cookie: own } })).text();
  assert.ok(!csv.includes('Клиент Гаража'));
  const found = await (await fetch(`${U}/studio/api/admin/privacy/find`, J({ phone: '+79211112233' }, own))).json();
  assert.equal(found.bookings.length, 0);

  // Базы лежат в разных файлах
  assert.ok(fs.existsSync(path.join(DATA, 'db', 'garage77.db')));
  assert.ok(fs.existsSync(path.join(DATA, 'db', 'studio.db')));
});

test('без согласия на обработку данных онлайн-запись не создаётся', async () => {
  const s = await slot('studio', 'wash');
  const r = await fetch(`${U}/studio/api/bookings`, J({ serviceId: 'wash', ...s, name: 'Иван', phone: '+79160000000' }));
  assert.equal(r.status, 400);
});

test('клиент может удалить свои данные из отменённой записи', async () => {
  const s = await slot('studio', 'wash');
  const { booking } = await (await fetch(`${U}/studio/api/bookings`, J({ serviceId: 'wash', ...s, name: 'Анна', phone: '+79160000001', car: 'Kia', consent: true }))).json();
  assert.equal((await fetch(`${U}/studio/api/bookings/${booking.token}/forget`, J({}))).status, 400); // активную — нельзя
  await fetch(`${U}/studio/api/bookings/${booking.token}/cancel`, J({}));
  assert.equal((await fetch(`${U}/studio/api/bookings/${booking.token}/forget`, J({}))).status, 200);
  const after = await (await fetch(`${U}/studio/api/bookings/${booking.token}`)).json();
  assert.equal(after.booking.clientName, '');
  assert.equal(after.booking.car, '');
});

test('запросы с чужих сайтов и не-JSON отклоняются', async () => {
  const s = await slot('studio', 'wash');
  const body = JSON.stringify({ serviceId: 'wash', ...s, name: 'X', phone: '+79160000002', consent: true });
  assert.equal((await fetch(`${U}/studio/api/bookings`, { method: 'POST', headers: { 'content-type': 'text/plain' }, body })).status, 415);
  assert.equal((await fetch(`${U}/studio/api/bookings`, { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://evil.example' }, body })).status, 403);
});

test('страницы отдают защитные заголовки, кабинет не индексируется', async () => {
  const r = await fetch(`${U}/studio/`);
  const csp = r.headers.get('content-security-policy');
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /script-src 'self' 'nonce-/);
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(r.headers.get('x-frame-options'), 'DENY');
  const html = await r.text();
  assert.ok(!html.includes('passwordHash') && !html.includes('owner@studio.ru'), 'данные владельца не попадают на страницу');
  const a = await fetch(`${U}/studio/admin`);
  assert.match(a.headers.get('x-robots-tag'), /noindex/);
  const studio = await (await fetch(`${U}/studio/api/studio`)).text();
  assert.ok(!studio.includes('passwordHash') && !studio.includes('"owner"'));
});

test('cookie кабинета: HttpOnly, SameSite=Strict, только для своей студии', async () => {
  const r = await fetch(`${U}/studio/api/admin/login`, J({ email: 'owner@studio.ru', password: 'Start-2026' }));
  const c = r.headers.get('set-cookie');
  assert.match(c, /HttpOnly/);
  assert.match(c, /SameSite=Strict/);
  assert.match(c, /Path=\/studio\//);
});

test('загрузка «картинки», которая не является картинкой, отклоняется', async () => {
  const cookie = await login('studio', 'owner@studio.ru', 'Start-2026');
  const fake = 'data:image/png;base64,' + Buffer.from('<script>alert(1)</script>').toString('base64');
  const r = await fetch(`${U}/studio/api/admin/media`, J({ kind: 'gallery-new', dataUrl: fake }, cookie));
  assert.equal(r.status, 400);
});

test('сессии хранятся только в виде хэша', async () => {
  const cookie = await login('studio', 'owner@studio.ru', 'Start-2026');
  const tokenValue = cookie.split('=')[1];
  const raw = fs.readFileSync(path.join(DATA, 'system.db'));
  assert.ok(!raw.includes(Buffer.from(tokenValue)));
});

test('страница политики конфиденциальности есть у каждой студии', async () => {
  for (const slug of ['studio', 'garage77']) {
    const r = await fetch(`${U}/${slug}/privacy`);
    assert.equal(r.status, 200);
    assert.match(await r.text(), /Политика обработки персональных данных/);
  }
});

test('стартовый пароль, смена пароля, код восстановления', async () => {
  const s1 = await login('garage77', 'owner@garage77.ru', 'Start-2026');
  let cfg = (await (await fetch(`${U}/garage77/api/admin/config`, { headers: { cookie: s1 } })).json()).config;
  assert.equal(cfg.ownerMustChange, true);
  // слабый и неверный
  assert.equal((await fetch(`${U}/garage77/api/admin/password`, J({ old: 'Start-2026', password: '123' }, s1))).status, 400);
  assert.equal((await fetch(`${U}/garage77/api/admin/password`, J({ old: 'wrong', password: 'Garage-77-ok' }, s1))).status, 400);
  // вторая сессия, затем смена пароля: вторая выходит, текущая остаётся
  const s2 = await login('garage77', 'owner@garage77.ru', 'Start-2026');
  assert.equal((await fetch(`${U}/garage77/api/admin/password`, J({ old: 'Start-2026', password: 'Garage-77-ok' }, s1))).status, 200);
  assert.equal((await fetch(`${U}/garage77/api/admin/config`, { headers: { cookie: s2 } })).status, 401);
  cfg = (await (await fetch(`${U}/garage77/api/admin/config`, { headers: { cookie: s1 } })).json()).config;
  assert.equal(cfg.ownerMustChange, false);
  assert.equal((await fetch(`${U}/garage77/api/admin/login`, J({ email: 'owner@garage77.ru', password: 'Start-2026' }))).status, 401);
  // код восстановления: одноразовый
  const { code } = await (await fetch(`${U}/garage77/api/admin/recovery-code`, J({ password: 'Garage-77-ok' }, s1))).json();
  assert.match(code, /^[A-Z0-9]{4}(-[A-Z0-9]{4}){3}$/);
  assert.equal((await fetch(`${U}/garage77/api/admin/recover`, J({ email: 'owner@garage77.ru', code: 'AAAA-BBBB-CCCC-DDDD', password: 'New-pass-1' }))).status, 401);
  assert.equal((await fetch(`${U}/garage77/api/admin/recover`, J({ email: 'owner@garage77.ru', code: code.toLowerCase(), password: 'New-pass-1' }))).status, 200);
  assert.equal((await fetch(`${U}/garage77/api/admin/recover`, J({ email: 'owner@garage77.ru', code, password: 'New-pass-2' }))).status, 401);
  assert.equal((await fetch(`${U}/garage77/api/admin/config`, { headers: { cookie: s1 } })).status, 401); // старые сессии сброшены
  await login('garage77', 'owner@garage77.ru', 'New-pass-1');
  // смена почты требует пароль
  const s3 = await login('garage77', 'owner@garage77.ru', 'New-pass-1');
  assert.equal((await fetch(`${U}/garage77/api/admin/email`, J({ email: 'new@garage.ru', password: 'x' }, s3))).status, 400);
  assert.equal((await fetch(`${U}/garage77/api/admin/email`, J({ email: 'new@garage.ru', password: 'New-pass-1' }, s3))).status, 200);
  await login('garage77', 'new@garage.ru', 'New-pass-1');
});
