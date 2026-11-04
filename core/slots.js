// Расчёт свободного времени: настоящий график, боксы, длительность услуги
// и время на подготовку между машинами. Многодневные работы держат бокс
// непрерывно — включая ночь, пока машина стоит внутри.
import { WD, dateOf, dateToMin, addDays, weekday, hm, toMin, fromMin, timeOf } from './time.js';

/** Рабочее окно дня [открытие, закрытие] в минутах или null, если выходной. */
export function dayWindow(cfg, date) {
  if ((cfg.daysOff || []).includes(date)) return null;
  const special = cfg.specialDays && cfg.specialDays[date];
  const w = special !== undefined ? special : cfg.schedule && cfg.schedule[WD[weekday(date)]];
  if (!w || !w[0] || !w[1]) return null;
  const base = dateToMin(date);
  const o = hm(w[0]), c = hm(w[1]);
  if (c <= o) return null;
  return [base + o, base + c];
}

/** Прибавить рабочие минуты: время вне графика пропускается. */
export function addWork(cfg, start, minutes) {
  let cur = start, rem = minutes;
  if (rem <= 0) return start;
  for (let i = 0; i < 800; i++) {
    const d = dateOf(cur);
    const w = dayWindow(cfg, d);
    if (w) {
      if (cur < w[0]) cur = w[0];
      if (cur < w[1]) {
        const avail = w[1] - cur;
        if (rem <= avail) return cur + rem;
        rem -= avail;
      }
    }
    cur = dateToMin(addDays(d, 1));
  }
  return cur + rem;
}

export const bufferOf = (cfg) => Math.max(0, Number(cfg.booking?.bufferMinutes ?? 30));

/** Интервал занятости бокса: начало, окончание работ, бокс свободен с busyUntil. */
export function spanFor(cfg, svc, start) {
  let end;
  if (svc.days) {
    let d = dateOf(start), count = 0;
    for (let g = 0; g < 500; g++) {
      const w = dayWindow(cfg, d);
      if (w) { count++; if (count >= svc.days) { end = w[1]; break; } }
      d = addDays(d, 1);
    }
    if (end === undefined) end = start + svc.days * 1440;
  } else {
    end = addWork(cfg, start, svc.durationMin || 60);
  }
  const buf = bufferOf(cfg);
  const busyUntil = buf > 0 ? addWork(cfg, end, buf) : end;
  return { start, end, busyUntil };
}

export function eligibleBoxes(cfg, svc) {
  const all = (cfg.boxes || []).filter((b) => b.active !== false);
  if (svc.boxes && svc.boxes.length) {
    const list = all.filter((b) => svc.boxes.includes(b.id));
    return list.length ? list : all;
  }
  return all;
}

export const isActive = (b) => b.status !== 'cancelled';
const overlaps = (a, b) => a.start < b.busyUntil && b.start < a.busyUntil;

function busyList(bookings, excludeId) {
  return bookings
    .filter((b) => isActive(b) && b.id !== excludeId)
    .map((b) => ({ box: b.boxId, start: toMin(b.start), busyUntil: toMin(b.busyUntil || b.end) }));
}

/** Найти свободный бокс для услуги со старта start. null — все заняты. */
export function findBox(cfg, bookings, svc, start, { excludeId, boxId, busy } = {}) {
  const span = spanFor(cfg, svc, start);
  const list = busy || busyList(bookings, excludeId);
  let boxes = eligibleBoxes(cfg, svc);
  if (boxId) boxes = (cfg.boxes || []).filter((b) => b.id === boxId);
  for (const box of boxes) {
    if (!list.some((a) => a.box === box.id && overlaps(a, span))) return { boxId: box.id, ...span };
  }
  return null;
}

/** Возможные начала услуги в этот день (без учёта занятости). */
export function startsForDay(cfg, svc, date, now) {
  const w = dayWindow(cfg, date);
  if (!w) return [];
  const step = Math.max(10, Number(cfg.booking?.stepMinutes || 30));
  const lead = Number(cfg.booking?.minLeadMinutes ?? 60);
  const res = [];
  if (svc.days) {
    if (w[0] >= now + lead) res.push(w[0]);
    return res;
  }
  const dur = svc.durationMin || 60;
  const len = w[1] - w[0];
  for (let t = w[0]; t < w[1]; t += step) {
    if (t < now + lead) continue;
    if (dur <= len && t + dur > w[1]) break; // короткая работа должна закончиться в тот же день
    res.push(t);
  }
  return res;
}

export function horizonEnd(cfg, now) {
  return addDays(dateOf(now), Number(cfg.booking?.horizonDays || 30));
}

/** Свободные слоты по дням. */
export function getSlots(cfg, bookings, svc, from, days, now, { excludeId } = {}) {
  const today = dateOf(now);
  const last = horizonEnd(cfg, now);
  const busy = busyList(bookings, excludeId);
  const out = [];
  for (let i = 0; i < days; i++) {
    const d = addDays(from, i);
    if (d < today) continue;
    if (d > last) break;
    const open = !!dayWindow(cfg, d);
    const times = startsForDay(cfg, svc, d, now)
      .filter((t) => findBox(cfg, bookings, svc, t, { busy }))
      .map(timeOf);
    out.push({ date: d, open, times });
  }
  return out;
}

/** Ближайшие окна: до perDay на день, всего limit. */
export function nearestSlots(cfg, bookings, svc, now, limit = 4, perDay = 2) {
  const today = dateOf(now);
  const res = [];
  const days = getSlots(cfg, bookings, svc, today, Number(cfg.booking?.horizonDays || 30) + 1, now);
  for (const d of days) {
    for (const t of d.times.slice(0, perDay)) { res.push({ date: d.date, time: t }); if (res.length >= limit) return res; }
  }
  return res;
}

/** Свободные промежутки по боксам на день (для владельца). */
export function freeIntervals(cfg, bookings, date) {
  const w = dayWindow(cfg, date);
  if (!w) return null;
  const busy = busyList(bookings);
  return (cfg.boxes || []).filter((b) => b.active !== false).map((box) => {
    const list = busy.filter((b) => b.box === box.id && b.start < w[1] && b.busyUntil > w[0]).sort((a, b) => a.start - b.start);
    const gaps = [];
    let cur = w[0];
    for (const b of list) { if (b.start > cur) gaps.push([cur, b.start]); cur = Math.max(cur, b.busyUntil); }
    if (cur < w[1]) gaps.push([cur, w[1]]);
    return { box, gaps: gaps.filter(([a, b]) => b - a >= 30).map(([a, b]) => [timeOf(a), timeOf(b)]) };
  });
}

export { fromMin };
