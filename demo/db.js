// Демо-хранилище: тот же набор функций, что lib/db.js, но данные — в браузере (localStorage).
const KEY = () => 'demo:blesk:db';
let S = load();
function load() { try { return JSON.parse(localStorage.getItem(KEY())) || { b: [], p: [] }; } catch { return { b: [], p: [] }; } }
function save() { try { localStorage.setItem(KEY(), JSON.stringify(S)); } catch {} }
const full = (b) => b && ({ ...b, reminder: !!b.pushSub, payments: S.p.filter((p) => p.bookingId === b.id).sort((x, y) => x.at.localeCompare(y.at)).map((p) => ({ ...p })) });
const byStart = (a, b) => a.start.localeCompare(b.start);

export const activeBookings = (studio, since) => S.b.filter((b) => b.status !== 'cancelled' && b.busyUntil > since).sort(byStart).map(full);
export function bookingsInRange(studio, from, to) {
  const rows = S.b.filter((b) => b.start < to && b.busyUntil > from);
  const ids = new Set(rows.map((b) => b.id));
  for (const p of S.p) if (p.at >= from && p.at < to && !ids.has(p.bookingId)) { const b = S.b.find((x) => x.id === p.bookingId); if (b) { rows.push(b); ids.add(b.id); } }
  return rows.sort(byStart).map(full);
}
export const getBooking = (studio, id) => full(S.b.find((b) => b.id === id)) || null;
export const getByToken = (studio, t) => full(S.b.find((b) => b.token === t)) || null;
export function insertBooking(b) {
  S.b.push({ ...b, status: b.status || 'booked', updatedAt: b.createdAt, acceptedAt: null, readyAt: null, cancelledAt: null, pushSub: null, reminderSent: false, consentAt: b.consentAt || null, anonymized: false });
  save(); return getBooking(b.studio, b.id);
}
export function updateBooking(studio, id, fields, now) {
  const b = S.b.find((x) => x.id === id); if (!b) return null;
  Object.assign(b, fields, { updatedAt: now }); save(); return full(b);
}
export function setPushSub(studio, id, sub) { const b = S.b.find((x) => x.id === id); if (b) { b.pushSub = sub; save(); } }
export function addPayment(studio, bookingId, { kind, amount, method, note, at }) {
  const id = crypto.randomUUID(); S.p.push({ id, bookingId, kind, amount, method: method || '', note: note || '', at }); save(); return id;
}
export function deletePayment(studio, bookingId, id) { const n = S.p.length; S.p = S.p.filter((p) => !(p.id === id && p.bookingId === bookingId)); save(); return n - S.p.length; }
export function anonymizeBooking(studio, id, now) {
  const b = S.b.find((x) => x.id === id && !x.anonymized); if (!b) return 0;
  Object.assign(b, { clientName: '', clientPhone: '', car: '', comment: '', pushSub: null, anonymized: true, updatedAt: now }); save(); return 1;
}
export const bookingsByPhone = (studio, digits) => S.b.filter((b) => !b.anonymized && String(b.clientPhone).replace(/\D/g, '').endsWith(digits.slice(-10))).map(full);
export const allBookings = () => [...S.b].sort(byStart).map(full);
export function deleteBookings() { const n = S.b.length; S = { b: [], p: [] }; save(); return n; }
export const isEmpty = () => !S.b.length;
export const conn = () => ({ prepare: () => ({ run() {} }) });
export function setPaymentDate(bookingId, at) { for (const p of S.p) if (p.bookingId === bookingId) p.at = at; save(); }
