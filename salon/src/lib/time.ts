const pad = (n: number) => String(n).padStart(2, '0');

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, days: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export const todayISO = () => toISODate(new Date());

export function nowMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

export function fmtTime(min: number): string {
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
}

export function fmtDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m} мин`;
  if (!m) return `${h} ч`;
  return `${h} ч ${m} мин`;
}

const priceFmt = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
export const fmtPrice = (n: number) => `${priceFmt.format(Math.round(n))} ₽`;

export const WEEKDAYS_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
export const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

export function fmtDateLong(iso: string): string {
  const d = parseISODate(iso);
  const wd = d.toLocaleDateString('ru-RU', { weekday: 'long' });
  return `${wd[0].toUpperCase()}${wd.slice(1)}, ${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`;
}

export function fmtDateShort(iso: string): string {
  const d = parseISODate(iso);
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`;
}

export function relativeDayLabel(iso: string): string | null {
  const t = todayISO();
  if (iso === t) return 'Сегодня';
  if (iso === addDays(t, 1)) return 'Завтра';
  if (iso === addDays(t, -1)) return 'Вчера';
  return null;
}

export function timeAgo(ts: number): string {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 45) return 'только что';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} мин назад`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} ч назад`;
  return `${Math.round(h / 24)} дн назад`;
}

/** Склонение: plural(5, ['визит','визита','визитов']) */
export function plural(n: number, forms: [string, string, string]): string {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return forms[2];
  if (b > 1 && b < 5) return forms[1];
  if (b === 1) return forms[0];
  return forms[2];
}

export const uid = (p = 'id') => `${p}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;

export const normalizePhone = (p: string) => p.replace(/\D/g, '').replace(/^8/, '7');

export function formatPhoneInput(raw: string): string {
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('8')) d = '7' + d.slice(1);
  if (d && !d.startsWith('7')) d = '7' + d;
  d = d.slice(0, 11);
  const p = d.slice(1);
  let out = '+7';
  if (p.length) out += ' ' + p.slice(0, 3);
  if (p.length > 3) out += ' ' + p.slice(3, 6);
  if (p.length > 6) out += '-' + p.slice(6, 8);
  if (p.length > 8) out += '-' + p.slice(8, 10);
  return d ? out : '';
}
