// Создание, перенос, статусы и оплаты записей.
import crypto from 'node:crypto';
import * as DB from './db.js';
import { HttpError } from './http.js';
import { token } from './auth.js';
import { localNow, fromMin, toMin, dateOf, dateToMin, isDate, isTime } from '../core/time.js';
import { findBox, startsForDay, getSlots, nearestSlots, horizonEnd, spanFor } from '../core/slots.js';

export const nowOf = (cfg) => localNow(cfg.timezone);
export const nowStr = (cfg) => fromMin(nowOf(cfg));

/** Записи, которые занимают боксы начиная с сегодняшнего утра. */
export function busyBookings(cfg) {
  const today = dateOf(nowOf(cfg));
  return DB.activeBookings(cfg.slug, today + 'T00:00');
}

export function serviceOf(cfg, id) {
  const s = cfg.services.find((x) => x.id === id);
  if (!s) throw new HttpError(400, 'Услуга не найдена — обновите страницу');
  return s;
}

/** Для владельца: можно записывать на любое время сегодняшнего дня, без минимального запаса. */
const ownerCfg = (cfg) => ({ ...cfg, booking: { ...cfg.booking, minLeadMinutes: 0, horizonDays: Math.max(120, cfg.booking.horizonDays) } });
const ownerNow = (cfg) => dateToMin(dateOf(nowOf(cfg)));

export function slotsFor(cfg, serviceId, from, days, { owner = false, excludeId } = {}) {
  const svc = serviceOf(cfg, serviceId);
  const c = owner ? ownerCfg(cfg) : cfg;
  const now = owner ? ownerNow(cfg) : nowOf(cfg);
  const start = isDate(from) ? from : dateOf(nowOf(cfg));
  return getSlots(c, busyBookings(cfg), svc, start, Math.min(62, Math.max(1, Number(days) || 14)), now, { excludeId });
}

export function nearestFor(cfg, serviceId, limit = 4, perDay = 2) {
  const svc = serviceOf(cfg, serviceId);
  return nearestSlots(cfg, busyBookings(cfg), svc, nowOf(cfg), limit, perDay);
}

const cleanPhone = (p) => String(p || '').replace(/[^\d+]/g, '').slice(0, 16);
const clip = (s, n) => String(s ?? '').trim().slice(0, n);

function genCode() {
  const abc = 'ABCEHKMPTX23456789';
  const b = crypto.randomBytes(4);
  return [...b].map((x) => abc[x % abc.length]).join('');
}

/** Проверить, можно ли поставить услугу на это время; вернуть {boxId,start,end,busyUntil}. */
function placeOrFail(cfg, svc, date, time, { owner, boxId, force, excludeId }) {
  if (!isDate(date) || !isTime(time)) throw new HttpError(400, 'Выберите дату и время');
  const start = toMin(`${date}T${time}`);
  const bookings = busyBookings(cfg);
  if (!owner) {
    const now = nowOf(cfg);
    if (date > horizonEnd(cfg, now)) throw new HttpError(400, 'На эту дату запись пока не открыта');
    const allowed = startsForDay(cfg, svc, date, now);
    if (!allowed.includes(start)) throw new HttpError(409, 'Это время уже недоступно — выберите другое');
  }
  const place = findBox(cfg, bookings, svc, start, { excludeId, boxId });
  if (place) return place;
  if (owner && force) {
    const box = boxId || (cfg.boxes.find((b) => b.active) || cfg.boxes[0]).id;
    return { boxId: box, ...spanFor(cfg, svc, start) };
  }
  throw new HttpError(409, owner ? 'В это время бокс занят' : 'Это время только что заняли — выберите другое', { conflict: true });
}

export function createBooking(cfg, input, { owner = false } = {}) {
  const svc = serviceOf(cfg, input.serviceId);
  const name = clip(input.name ?? input.clientName, 80), phone = cleanPhone(input.phone ?? input.clientPhone);
  if (!owner) {
    if (name.length < 2) throw new HttpError(400, 'Как к вам обращаться?');
    if (phone.replace(/\D/g, '').length < 10) throw new HttpError(400, 'Проверьте номер телефона');
    if (input.consent !== true) throw new HttpError(400, 'Нужно согласие на обработку персональных данных');
  }
  const place = placeOrFail(cfg, svc, input.date, input.time, { owner, boxId: owner ? input.boxId : undefined, force: owner && input.force });
  const now = nowStr(cfg);
  return DB.insertBooking({
    id: crypto.randomUUID(), studio: cfg.slug, code: genCode(), token: token(18),
    serviceId: svc.id, serviceName: svc.name,
    price: owner && input.price !== undefined && input.price !== '' ? Math.max(0, Math.round(Number(input.price) || 0)) : svc.price,
    start: fromMin(place.start), end: fromMin(place.end), busyUntil: fromMin(place.busyUntil), boxId: place.boxId,
    status: 'booked', clientName: name, clientPhone: phone, car: clip(input.car, 80), comment: clip(input.comment, 500),
    source: owner ? 'manual' : 'online', createdAt: now, consentAt: owner ? null : now,
  });
}

export function rescheduleBooking(cfg, id, { date, time, boxId, force, serviceId }) {
  const b = DB.getBooking(cfg.slug, id);
  if (!b) throw new HttpError(404, 'Запись не найдена');
  if (b.status === 'cancelled') throw new HttpError(400, 'Запись отменена');
  const svc = serviceId ? serviceOf(cfg, serviceId) : (cfg.services.find((s) => s.id === b.serviceId) || { id: b.serviceId, name: b.serviceName, durationMin: Math.max(30, toMin(b.end) - toMin(b.start)) });
  const place = placeOrFail(cfg, svc, date, time, { owner: true, boxId, force, excludeId: id });
  const fields = { start: fromMin(place.start), end: fromMin(place.end), busyUntil: fromMin(place.busyUntil), boxId: place.boxId, reminderSent: false };
  if (serviceId && serviceId !== b.serviceId) Object.assign(fields, { serviceId: svc.id, serviceName: svc.name, price: svc.price });
  return DB.updateBooking(cfg.slug, id, fields, nowStr(cfg));
}

export const STATUSES = ['booked', 'accepted', 'ready', 'cancelled'];

export function setStatus(cfg, id, status) {
  if (!STATUSES.includes(status)) throw new HttpError(400, 'Неизвестный статус');
  const b = DB.getBooking(cfg.slug, id);
  if (!b) throw new HttpError(404, 'Запись не найдена');
  const now = nowStr(cfg);
  const f = { status };
  if (status === 'accepted') f.acceptedAt = b.acceptedAt || now;
  if (status === 'ready') { f.readyAt = now; f.acceptedAt = b.acceptedAt || now; }
  if (status === 'cancelled') f.cancelledAt = now;
  if (status === 'booked') { f.acceptedAt = null; f.readyAt = null; f.cancelledAt = null; }
  // Отмена освобождает бокс; восстановление — только если время ещё свободно.
  if (b.status === 'cancelled' && status !== 'cancelled') {
    const svc = cfg.services.find((s) => s.id === b.serviceId);
    if (svc && !findBox(cfg, busyBookings(cfg), svc, toMin(b.start), { excludeId: id, boxId: b.boxId })) {
      throw new HttpError(409, 'Это время уже занято другой записью — перенесите запись');
    }
  }
  return DB.updateBooking(cfg.slug, id, f, now);
}

export function editDetails(cfg, id, input) {
  const f = {};
  if ('clientName' in input) f.clientName = clip(input.clientName, 80);
  if ('clientPhone' in input) f.clientPhone = cleanPhone(input.clientPhone);
  if ('car' in input) f.car = clip(input.car, 80);
  if ('comment' in input) f.comment = clip(input.comment, 500);
  if ('price' in input) f.price = Math.max(0, Math.round(Number(input.price) || 0));
  if (!DB.getBooking(cfg.slug, id)) throw new HttpError(404, 'Запись не найдена');
  return DB.updateBooking(cfg.slug, id, f, nowStr(cfg));
}

export function addPayment(cfg, id, { kind, amount, method, note }) {
  const b = DB.getBooking(cfg.slug, id);
  if (!b) throw new HttpError(404, 'Запись не найдена');
  const a = Math.round(Number(String(amount).replace(/\s/g, '').replace(',', '.')));
  if (!(a > 0)) throw new HttpError(400, 'Введите сумму');
  if (!['payment', 'refund'].includes(kind)) throw new HttpError(400, 'Тип операции?');
  if (kind === 'refund') {
    const paid = b.payments.reduce((s, p) => s + (p.kind === 'refund' ? -p.amount : p.amount), 0);
    if (a > paid) throw new HttpError(400, `Вернуть можно не больше полученного: ${paid.toLocaleString('ru-RU')} ${cfg.currency}`);
  }
  DB.addPayment(cfg.slug, id, { kind, amount: a, method: clip(method, 30), note: clip(note, 200), at: nowStr(cfg) });
  return DB.getBooking(cfg.slug, id);
}

/** Публичная часть записи — то, что видит клиент. */
export function publicBooking(cfg, b) {
  const box = cfg.boxes.find((x) => x.id === b.boxId);
  return {
    token: b.token, code: b.code, serviceId: b.serviceId, serviceName: b.serviceName, price: b.price,
    start: b.start, end: b.end, status: b.status, boxName: box?.name || '', clientName: b.clientName, car: b.car,
    reminder: b.reminder,
  };
}

