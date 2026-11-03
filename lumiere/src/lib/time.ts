/** Рабочие часы салона и шаг сетки записи. */
export const OPEN = 10 * 60;
export const CLOSE = 20 * 60;
export const STEP = 30;

const pad = (n: number) => String(n).padStart(2, '0');

export function toKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}

export function nextDays(count: number, from: Date = new Date()): string[] {
  return Array.from({ length: count }, (_, i) => toKey(addDays(from, i)));
}

export function minutesOf(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

export function hhmm(min: number): string {
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('ru-RU', o);

export const weekdayShort = (key: string) => capitalize(fmt({ weekday: 'short' }).format(fromKey(key)));
export const dayNumber = (key: string) => fromKey(key).getDate();
export const monthShort = (key: string) => fmt({ month: 'short' }).format(fromKey(key)).replace('.', '');
export const dayMonth = (key: string) => fmt({ day: 'numeric', month: 'long' }).format(fromKey(key));
export const longDate = (key: string) =>
  capitalize(fmt({ weekday: 'long', day: 'numeric', month: 'long' }).format(fromKey(key)));

/** «Сегодня», «Завтра» или «Чт, 5 ноября». */
export function relativeDay(key: string, now: Date = new Date()): string {
  if (key === toKey(now)) return 'Сегодня';
  if (key === toKey(addDays(now, 1))) return 'Завтра';
  return `${weekdayShort(key)}, ${dayMonth(key)}`;
}

export function formatPrice(n: number): string {
  return `${new Intl.NumberFormat('ru-RU').format(n)} ₽`;
}

export function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m} мин`;
  return m ? `${h} ч ${m} мин` : `${h} ч`;
}
