import type { Appointment, Service, Staff } from './types';
import { nowMinutes, parseISODate, todayISO } from './time';

export const SLOT_STEP = 30;
/** Счастливые часы: слоты, начинающиеся до 11:00, — скидка 10% */
export const HAPPY_HOUR_END = 11 * 60;
export const HAPPY_DISCOUNT = 0.1;
/** Минимальный запас до начала записи «на сегодня» */
const LEAD_TIME = 30;

export const isHappyHour = (start: number) => start < HAPPY_HOUR_END;

export type DayPart = 'morning' | 'day' | 'evening';
export const DAY_PARTS: Array<{ id: DayPart; label: string; from: number; to: number }> = [
  { id: 'morning', label: 'Утро', from: 0, to: 12 * 60 },
  { id: 'day', label: 'День', from: 12 * 60, to: 17 * 60 },
  { id: 'evening', label: 'Вечер', from: 17 * 60, to: 24 * 60 },
];

export function totals(services: Service[], start: number | null) {
  const base = services.reduce((s, x) => s + x.price, 0);
  const duration = services.reduce((s, x) => s + x.duration, 0);
  const discount = start !== null && isHappyHour(start) ? Math.round(base * HAPPY_DISCOUNT) : 0;
  return { base, duration, discount, total: base - discount };
}

export function staffWorksOn(staff: Staff, date: string): boolean {
  return staff.workDays.includes(parseISODate(date).getDay());
}

/** Мастера, которые умеют выполнить ВСЕ выбранные услуги */
export function eligibleStaff(staff: Staff[], services: Service[]): Staff[] {
  if (!services.length) return staff;
  return staff.filter((s) => services.every((sv) => s.categories.includes(sv.category)));
}

const overlaps = (a1: number, a2: number, b1: number, b2: number) => a1 < b2 && b1 < a2;

function busy(appts: Appointment[], staffId: string, date: string): Array<[number, number]> {
  return appts
    .filter((a) => a.staffId === staffId && a.date === date && a.status !== 'cancelled')
    .map((a) => [a.start, a.start + a.duration]);
}

export function isFree(appts: Appointment[], staff: Staff, date: string, start: number, duration: number): boolean {
  if (!staffWorksOn(staff, date)) return false;
  if (start < staff.start || start + duration > staff.end) return false;
  if (date === todayISO() && start < nowMinutes() + LEAD_TIME) return false;
  if (date < todayISO()) return false;
  return busy(appts, staff.id, date).every(([b1, b2]) => !overlaps(start, start + duration, b1, b2));
}

/** Все свободные старты для мастера на дату */
export function staffSlots(appts: Appointment[], staff: Staff, date: string, duration: number): number[] {
  const out: number[] = [];
  if (!staffWorksOn(staff, date)) return out;
  for (let t = staff.start; t + duration <= staff.end; t += SLOT_STEP) {
    if (isFree(appts, staff, date, t, duration)) out.push(t);
  }
  return out;
}

/** Слоты по группе мастеров: время → id свободных мастеров */
export function groupSlots(appts: Appointment[], staff: Staff[], date: string, duration: number): Map<number, string[]> {
  const map = new Map<number, string[]>();
  for (const s of staff) {
    for (const t of staffSlots(appts, s, date, duration)) {
      const list = map.get(t) ?? [];
      list.push(s.id);
      map.set(t, list);
    }
  }
  return new Map([...map.entries()].sort((a, b) => a[0] - b[0]));
}

export function bookedMinutes(appts: Appointment[], staffId: string, date: string): number {
  return busy(appts, staffId, date).reduce((s, [a, b]) => s + (b - a), 0);
}

/**
 * «Любой мастер»: выбираем свободного мастера с наименьшей загрузкой в этот день —
 * так расписание салона заполняется равномерно.
 */
export function pickStaffForSlot(
  appts: Appointment[],
  candidates: Staff[],
  date: string,
  start: number,
  duration: number,
): Staff | null {
  const free = candidates.filter((s) => isFree(appts, s, date, start, duration));
  if (!free.length) return null;
  return free.sort((a, b) => bookedMinutes(appts, a.id, date) - bookedMinutes(appts, b.id, date))[0];
}

export type DayLoad = 'off' | 'full' | 'busy' | 'free';

/** Индикатор дня в календаре */
export function dayLoad(appts: Appointment[], staff: Staff[], date: string, duration: number): { load: DayLoad; slots: number } {
  const working = staff.filter((s) => staffWorksOn(s, date));
  if (!working.length || date < todayISO()) return { load: 'off', slots: 0 };
  const slots = groupSlots(appts, working, date, Math.max(duration, SLOT_STEP)).size;
  if (!slots) return { load: 'full', slots };
  return { load: slots <= 6 ? 'busy' : 'free', slots };
}

/** Загрузка салона в процентах: занятые минуты / рабочие минуты всех мастеров */
export function occupancy(appts: Appointment[], staff: Staff[], date: string): number {
  let capacity = 0;
  let booked = 0;
  for (const s of staff) {
    if (!staffWorksOn(s, date)) continue;
    capacity += s.end - s.start;
    booked += bookedMinutes(appts, s.id, date);
  }
  return capacity ? Math.min(100, Math.round((booked / capacity) * 100)) : 0;
}
