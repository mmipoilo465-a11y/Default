import type { Appointment, Master } from './types';
import { CLOSE, OPEN, STEP, fromKey, minutesOf, nextDays, toKey } from './time';

export function worksOn(master: Master, date: string): boolean {
  return !master.daysOff.includes(fromKey(date).getDay());
}

function bookedFor(appts: Appointment[], masterId: string, date: string): Appointment[] {
  return appts.filter((a) => a.status === 'booked' && a.masterId === masterId && a.date === date);
}

const overlaps = (s1: number, e1: number, s2: number, e2: number) => s1 < e2 && s2 < e1;

/** Свободен ли мастер на интервале [start, start + duration). */
export function isFree(
  appts: Appointment[],
  master: Master,
  date: string,
  start: number,
  duration: number,
  now: Date = new Date(),
): boolean {
  const today = toKey(now);
  if (date < today) return false;
  if (date === today && start <= minutesOf(now)) return false;
  if (!worksOn(master, date)) return false;
  if (start < OPEN || start + duration > CLOSE) return false;
  return !bookedFor(appts, master.id, date).some((a) =>
    overlaps(start, start + duration, a.start, a.start + a.duration),
  );
}

export interface Slot {
  start: number;
  /** Мастера, свободные в это время. */
  free: string[];
}

export function daySlots(
  appts: Appointment[],
  masters: Master[],
  date: string,
  duration: number,
  now: Date = new Date(),
): Slot[] {
  const slots: Slot[] = [];
  for (let t = OPEN; t + duration <= CLOSE; t += STEP) {
    slots.push({
      start: t,
      free: masters.filter((m) => isFree(appts, m, date, t, duration, now)).map((m) => m.id),
    });
  }
  return slots;
}

export function nearestSlot(
  appts: Appointment[],
  masters: Master[],
  duration: number,
  now: Date = new Date(),
  horizon = 14,
): { date: string; start: number } | null {
  for (const date of nextDays(horizon, now)) {
    const slot = daySlots(appts, masters, date, duration, now).find((s) => s.free.length);
    if (slot) return { date, start: slot.start };
  }
  return null;
}

/** Из подходящих мастеров выбирает наименее загруженного в этот день. */
export function leastLoaded(appts: Appointment[], masters: Master[], date: string): Master {
  const load = (m: Master) => bookedFor(appts, m.id, date).reduce((sum, a) => sum + a.duration, 0);
  return [...masters].sort((a, b) => load(a) - load(b))[0];
}

export interface DayLoad {
  busy: number;
  free: number;
  total: number;
}

/** Загрузка дня в 30-минутных окнах по всем работающим мастерам. */
export function dayLoad(appts: Appointment[], masters: Master[], date: string, now: Date = new Date()): DayLoad {
  let busy = 0;
  let free = 0;
  let total = 0;
  for (const m of masters) {
    if (!worksOn(m, date)) continue;
    const booked = bookedFor(appts, m.id, date);
    for (let t = OPEN; t < CLOSE; t += STEP) {
      total++;
      if (booked.some((a) => overlaps(t, t + STEP, a.start, a.start + a.duration))) busy++;
      else if (isFree(appts, m, date, t, STEP, now)) free++;
    }
  }
  return { busy, free, total };
}

export function appointmentsOn(appts: Appointment[], date: string): Appointment[] {
  return appts.filter((a) => a.status === 'booked' && a.date === date).sort((a, b) => a.start - b.start);
}

export function isUpcoming(a: Appointment, now: Date = new Date()): boolean {
  if (a.status !== 'booked') return false;
  const today = toKey(now);
  return a.date > today || (a.date === today && a.start + a.duration > minutesOf(now));
}
