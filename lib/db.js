// Хранилище. У КАЖДОЙ студии свой файл базы: data/db/<студия>.db.
// Записи и платежи разных студий физически лежат в разных файлах и не могут перемешаться.
// Общий файл data/system.db хранит только служебное: сессии владельцев (в виде хэшей) и ключи уведомлений.
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DATA } from './paths.js';

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,40}$/;
const DB_DIR = path.join(DATA, 'db');
fs.mkdirSync(DB_DIR, { recursive: true });

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA secure_delete = ON;
CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  studio TEXT NOT NULL,
  code TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  service_id TEXT, service_name TEXT NOT NULL,
  price INTEGER NOT NULL DEFAULT 0,
  start TEXT NOT NULL, "end" TEXT NOT NULL, busy_until TEXT NOT NULL,
  box_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'booked',
  client_name TEXT, client_phone TEXT, car TEXT, comment TEXT,
  source TEXT NOT NULL DEFAULT 'online',
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  accepted_at TEXT, ready_at TEXT, cancelled_at TEXT,
  push_sub TEXT, reminder_sent INTEGER NOT NULL DEFAULT 0,
  consent_at TEXT, anonymized_at TEXT
);
CREATE INDEX IF NOT EXISTS bookings_start ON bookings(start);
CREATE INDEX IF NOT EXISTS bookings_busy ON bookings(busy_until);
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  studio TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('payment','refund')),
  amount INTEGER NOT NULL,
  method TEXT, note TEXT,
  at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS payments_at ON payments(at);
`;

export const system = new DatabaseSync(path.join(DATA, 'system.db'));
system.exec(`
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, studio TEXT NOT NULL, expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL);
`);

const conns = new Map();
/** Соединение с базой конкретной студии. */
export function conn(studio) {
  if (!SLUG_RE.test(studio)) throw new Error('bad studio id');
  let c = conns.get(studio);
  if (c) return c.db;
  const db = new DatabaseSync(path.join(DB_DIR, `${studio}.db`));
  db.exec(SCHEMA);
  for (const col of ['consent_at TEXT', 'anonymized_at TEXT']) { try { db.exec(`ALTER TABLE bookings ADD COLUMN ${col}`); } catch {} }
  const st = (sql) => db.prepare(sql);
  c = {
    db,
    active: st(`SELECT * FROM bookings WHERE studio = ? AND status != 'cancelled' AND busy_until > ? ORDER BY start`),
    range: st(`SELECT * FROM bookings WHERE studio = ? AND start < ? AND busy_until > ? ORDER BY start`),
    byId: st(`SELECT * FROM bookings WHERE studio = ? AND id = ?`),
    byToken: st(`SELECT * FROM bookings WHERE studio = ? AND token = ?`),
    payRange: st(`SELECT booking_id FROM payments WHERE studio = ? AND at >= ? AND at < ?`),
  };
  conns.set(studio, c);
  return db;
}
const Q = (studio) => { conn(studio); return conns.get(studio); };

const rowToBooking = (r, payments = []) => r && ({
  id: r.id, studio: r.studio, code: r.code, token: r.token,
  serviceId: r.service_id, serviceName: r.service_name, price: r.price,
  start: r.start, end: r.end, busyUntil: r.busy_until, boxId: r.box_id,
  status: r.status, clientName: r.client_name || '', clientPhone: r.client_phone || '', car: r.car || '', comment: r.comment || '',
  source: r.source, createdAt: r.created_at, updatedAt: r.updated_at,
  acceptedAt: r.accepted_at, readyAt: r.ready_at, cancelledAt: r.cancelled_at,
  reminder: !!r.push_sub, reminderSent: !!r.reminder_sent,
  consentAt: r.consent_at || null, anonymized: !!r.anonymized_at,
  payments,
});
const rowToPayment = (p) => ({ id: p.id, bookingId: p.booking_id, kind: p.kind, amount: p.amount, method: p.method || '', note: p.note || '', at: p.at });

function attachPayments(studio, rows) {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const pays = conn(studio).prepare(`SELECT * FROM payments WHERE studio = ? AND booking_id IN (${ids.map(() => '?').join(',')}) ORDER BY at`).all(studio, ...ids);
  const by = new Map();
  for (const p of pays) { if (!by.has(p.booking_id)) by.set(p.booking_id, []); by.get(p.booking_id).push(rowToPayment(p)); }
  return rows.map((r) => rowToBooking(r, by.get(r.id) || []));
}

/** Активные записи, которые ещё занимают боксы после момента since (для расчёта слотов). */
export const activeBookings = (studio, since) => attachPayments(studio, Q(studio).active.all(studio, since));

/** Все записи (включая отменённые), пересекающие [from, to), плюс записи с платежами в этот период. */
export function bookingsInRange(studio, from, to) {
  const q = Q(studio);
  const rows = q.range.all(studio, to, from);
  const have = new Set(rows.map((r) => r.id));
  const extra = [...new Set(q.payRange.all(studio, from, to).map((p) => p.booking_id))].filter((id) => !have.has(id));
  for (const id of extra) { const r = q.byId.get(studio, id); if (r) rows.push(r); }
  return attachPayments(studio, rows);
}

export const getBooking = (studio, id) => { const r = Q(studio).byId.get(studio, String(id)); return r ? attachPayments(studio, [r])[0] : null; };
export const getByToken = (studio, t) => { const r = Q(studio).byToken.get(studio, String(t)); return r ? attachPayments(studio, [r])[0] : null; };

export function insertBooking(b) {
  conn(b.studio).prepare(`INSERT INTO bookings (id, studio, code, token, service_id, service_name, price, start, "end", busy_until, box_id, status,
    client_name, client_phone, car, comment, source, created_at, updated_at, consent_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    b.id, b.studio, b.code, b.token, b.serviceId, b.serviceName, b.price, b.start, b.end, b.busyUntil, b.boxId, b.status || 'booked',
    b.clientName || '', b.clientPhone || '', b.car || '', b.comment || '', b.source || 'online', b.createdAt, b.createdAt, b.consentAt || null);
  return getBooking(b.studio, b.id);
}

const COLS = { serviceId: 'service_id', serviceName: 'service_name', price: 'price', start: 'start', end: '"end"', busyUntil: 'busy_until', boxId: 'box_id', status: 'status',
  clientName: 'client_name', clientPhone: 'client_phone', car: 'car', comment: 'comment', acceptedAt: 'accepted_at', readyAt: 'ready_at', cancelledAt: 'cancelled_at', reminderSent: 'reminder_sent' };

export function updateBooking(studio, id, fields, now) {
  const sets = [], vals = [];
  for (const [k, v] of Object.entries(fields)) if (COLS[k]) { sets.push(`${COLS[k]} = ?`); vals.push(typeof v === 'boolean' ? Number(v) : v); }
  if (!sets.length) return getBooking(studio, id);
  sets.push('updated_at = ?'); vals.push(now);
  conn(studio).prepare(`UPDATE bookings SET ${sets.join(', ')} WHERE studio = ? AND id = ?`).run(...vals, studio, id);
  return getBooking(studio, id);
}

export function setPushSub(studio, id, sub) {
  conn(studio).prepare(`UPDATE bookings SET push_sub = ?, reminder_sent = 0 WHERE studio = ? AND id = ?`).run(sub ? JSON.stringify(sub) : null, studio, id);
}
export const dueReminders = (studio, nowLocal, untilLocal) =>
  conn(studio).prepare(`SELECT id, push_sub, start, service_name, token FROM bookings WHERE studio = ? AND status = 'booked' AND push_sub IS NOT NULL
    AND reminder_sent = 0 AND start > ? AND start <= ?`).all(studio, nowLocal, untilLocal);
export const markReminded = (studio, id, v = 1) => conn(studio).prepare(`UPDATE bookings SET reminder_sent = ? WHERE studio = ? AND id = ?`).run(v, studio, id);
export const dropPushSub = (studio, id) => conn(studio).prepare(`UPDATE bookings SET push_sub = NULL WHERE studio = ? AND id = ?`).run(studio, id);

export function addPayment(studio, bookingId, { kind, amount, method, note, at }) {
  const id = crypto.randomUUID();
  conn(studio).prepare(`INSERT INTO payments (id, booking_id, studio, kind, amount, method, note, at) VALUES (?,?,?,?,?,?,?,?)`)
    .run(id, bookingId, studio, kind, amount, method || '', note || '', at);
  return id;
}
export const deletePayment = (studio, bookingId, id) => conn(studio).prepare(`DELETE FROM payments WHERE studio = ? AND booking_id = ? AND id = ?`).run(studio, bookingId, id).changes;
export const deleteBookings = (studio) => conn(studio).prepare(`DELETE FROM bookings WHERE studio = ?`).run(studio).changes;

// ——— Персональные данные ———
/** Стереть данные клиента в записи. Остаются услуга, время и суммы — для статистики. */
export function anonymizeBooking(studio, id, now) {
  return conn(studio).prepare(`UPDATE bookings SET client_name = '', client_phone = '', car = '', comment = '', push_sub = NULL, anonymized_at = ?, updated_at = ?
    WHERE studio = ? AND id = ? AND anonymized_at IS NULL`).run(now, now, studio, id).changes;
}
/** Обезличить все записи, визит по которым закончился раньше before. */
export function anonymizeOlderThan(studio, before, now) {
  return conn(studio).prepare(`UPDATE bookings SET client_name = '', client_phone = '', car = '', comment = '', push_sub = NULL, anonymized_at = ?
    WHERE studio = ? AND anonymized_at IS NULL AND "end" < ?`).run(now, studio, before).changes;
}
/** Подписки на уведомления не нужны после визита. */
export const dropOldPushSubs = (studio, before) => conn(studio).prepare(`UPDATE bookings SET push_sub = NULL WHERE studio = ? AND push_sub IS NOT NULL AND start < ?`).run(studio, before).changes;
/** Найти записи клиента по телефону (для запроса «удалите мои данные»). */
export function bookingsByPhone(studio, digits) {
  const rows = conn(studio).prepare(`SELECT * FROM bookings WHERE studio = ? AND anonymized_at IS NULL AND replace(replace(client_phone, '+', ''), ' ', '') LIKE ?`).all(studio, `%${digits.slice(-10)}`);
  return attachPayments(studio, rows);
}
export const allBookings = (studio) => attachPayments(studio, conn(studio).prepare(`SELECT * FROM bookings WHERE studio = ? ORDER BY start`).all(studio));

/** Резервная копия базы студии (консистентная, через VACUUM INTO). */
export function backupStudio(studio, file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.rmSync(file, { force: true });
  conn(studio).exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`);
}

/** Полностью удалить данные студии (файл базы). */
export function dropStudioDb(studio) {
  const c = conns.get(studio);
  if (c) { c.db.close(); conns.delete(studio); }
  for (const ext of ['', '-wal', '-shm']) fs.rmSync(path.join(DB_DIR, `${studio}.db${ext}`), { force: true });
}

// ——— Сессии владельца: в базе только хэш токена ———
const h = (t) => crypto.createHash('sha256').update(String(t)).digest('hex');
export function createSession(t, studio, days = 30) {
  system.prepare(`INSERT INTO sessions (token_hash, studio, expires) VALUES (?,?,?)`).run(h(t), studio, Date.now() + days * 864e5);
}
export function sessionStudio(t) {
  if (!t) return null;
  const r = system.prepare(`SELECT studio, expires FROM sessions WHERE token_hash = ?`).get(h(t));
  if (!r || r.expires < Date.now()) return null;
  return r.studio;
}
export const dropSession = (t) => system.prepare(`DELETE FROM sessions WHERE token_hash = ?`).run(h(t));
export const dropStudioSessions = (studio, exceptToken) => system.prepare(`DELETE FROM sessions WHERE studio = ? AND token_hash != ?`).run(studio, exceptToken ? h(exceptToken) : '');
setInterval(() => system.prepare(`DELETE FROM sessions WHERE expires < ?`).run(Date.now()), 3600e3).unref();

export const kvGet = (k) => system.prepare(`SELECT v FROM kv WHERE k = ?`).get(k)?.v;
export const kvSet = (k, v) => system.prepare(`INSERT INTO kv (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v`).run(k, v);
