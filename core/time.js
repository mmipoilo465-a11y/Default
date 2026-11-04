// Время студии. Всё считается в «настенном» времени студии: минуты от эпохи,
// где локальная дата/время записаны как UTC. Это убирает путаницу с часовыми поясами.

export const pad = (n) => String(n).padStart(2, '0');
export const WD = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
export const WD_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
export const WD_SHORT = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
export const WD_FULL = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
export const WD_ACC = ['воскресенье', 'понедельник', 'вторник', 'среду', 'четверг', 'пятницу', 'субботу'];
export const WD_NAME = { mon: 'Понедельник', tue: 'Вторник', wed: 'Среда', thu: 'Четверг', fri: 'Пятница', sat: 'Суббота', sun: 'Воскресенье' };
export const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
export const MONTHS_NOM = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
export const MONTHS_PREP = ['январе', 'феврале', 'марте', 'апреле', 'мае', 'июне', 'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре'];
export const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

export function dateToMin(d) {
  const [y, m, dd] = String(d).split('-').map(Number);
  return Date.UTC(y, m - 1, dd) / 60000;
}
export function toMin(dt) {
  const [d, t] = String(dt).split('T');
  let m = dateToMin(d);
  if (t) { const [h, mi] = t.split(':').map(Number); m += h * 60 + (mi || 0); }
  return m;
}
export function fromMin(min) {
  const x = new Date(min * 60000);
  return `${x.getUTCFullYear()}-${pad(x.getUTCMonth() + 1)}-${pad(x.getUTCDate())}T${pad(x.getUTCHours())}:${pad(x.getUTCMinutes())}`;
}
export const dateOf = (m) => fromMin(m).slice(0, 10);
export const timeOf = (m) => fromMin(m).slice(11, 16);
export const hm = (s) => { const [h, m] = String(s).split(':').map(Number); return h * 60 + (m || 0); };
export const addDays = (d, n) => dateOf(dateToMin(d) + n * 1440);
export const weekday = (d) => new Date(dateToMin(d) * 60000).getUTCDay();
export const startOfWeek = (d) => addDays(d, -((weekday(d) + 6) % 7));
export const startOfMonth = (d) => d.slice(0, 8) + '01';
export function endOfMonth(d) { const [y, m] = d.split('-').map(Number); return dateOf(Date.UTC(y, m, 0) / 60000); }
export const daysBetween = (a, b) => Math.round((dateToMin(b) - dateToMin(a)) / 1440);
export const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));
export const isTime = (s) => /^([01]\d|2[0-4]):[0-5]\d$/.test(String(s || ''));

function partsIn(tz, date) {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const g = (t) => p.find((x) => x.type === t)?.value;
  let h = g('hour'); if (h === '24') h = '00';
  return toMin(`${g('year')}-${g('month')}-${g('day')}T${h}:${g('minute')}`);
}
/** Текущее локальное время студии в минутах. */
export function localNow(tz, date = new Date()) {
  try { return partsIn(tz || 'Europe/Moscow', date); } catch { return partsIn('Europe/Moscow', date); }
}
/** Локальные минуты студии → реальный момент (мс UTC). */
export function localToUtcMs(min, tz) {
  let guess = min * 60000;
  for (let i = 0; i < 3; i++) {
    const off = localNow(tz, new Date(guess)) - Math.floor(guess / 60000);
    guess = (min - off) * 60000;
  }
  return guess;
}

// ——— Форматирование по-русски ———
export function fmtDay(d, { wd = true } = {}) {
  const [, m, dd] = d.split('-').map(Number);
  return `${dd} ${MONTHS_GEN[m - 1]}` + (wd ? `, ${WD_SHORT[weekday(d)]}` : '');
}
export function relDay(d, today) {
  const diff = daysBetween(today, d);
  return { 0: 'сегодня', 1: 'завтра', 2: 'послезавтра', '-1': 'вчера' }[diff] || null;
}
export function fmtDayRel(d, today) {
  const r = relDay(d, today);
  return r ? `${r}, ${fmtDay(d, { wd: false })}` : fmtDay(d);
}
export function fmtRange(from, to) {
  if (from === to) return fmtDay(from, { wd: false });
  const [, m1, d1] = from.split('-').map(Number);
  const [, m2, d2] = to.split('-').map(Number);
  return m1 === m2 ? `${d1}–${d2} ${MONTHS_GEN[m2 - 1]}` : `${d1} ${MONTHS_SHORT[m1 - 1]} – ${d2} ${MONTHS_SHORT[m2 - 1]}`;
}
export function fmtMoney(n, cur = '₽') {
  return `${Math.round(Number(n) || 0).toLocaleString('ru-RU')} ${cur}`;
}
export function plural(n, [one, few, many]) {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
}
export function fmtMinutes(m) {
  const h = Math.floor(m / 60), mm = m % 60;
  return [h ? `${h} ч` : '', mm ? `${mm} мин` : ''].filter(Boolean).join(' ') || '0 мин';
}
export function fmtDuration(svc) {
  if (svc.days) return `${svc.days} ${plural(svc.days, ['день', 'дня', 'дней'])}`;
  return fmtMinutes(svc.durationMin || 60);
}
export function fmtPrice(svc, cur) {
  return (svc.priceFrom ? 'от ' : '') + fmtMoney(svc.price, cur);
}
