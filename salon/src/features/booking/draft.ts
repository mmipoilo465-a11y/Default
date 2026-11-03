import { SERVICES, STAFF } from '../../data/mock';
import type { Appointment, Service, Staff } from '../../lib/types';
import { addDays, todayISO } from '../../lib/time';
import { eligibleStaff, groupSlots, staffSlots } from '../../lib/scheduling';

export type StepId = 'services' | 'staff' | 'time' | 'notes' | 'confirm';
export const STEPS: Array<{ id: StepId; label: string; title: string; subtitle: string }> = [
  { id: 'services', label: 'Услуги', title: 'Выберите услуги', subtitle: 'Можно несколько — посчитаем время и стоимость сразу.' },
  { id: 'staff', label: 'Мастер', title: 'Кто будет работать', subtitle: 'Выберите мастера или доверьтесь нам.' },
  { id: 'time', label: 'Время', title: 'Когда удобно', subtitle: 'Показываем только реально свободные окна.' },
  { id: 'notes', label: 'Пожелания', title: 'Пожелания', subtitle: 'Сделаем визит именно таким, как вы любите.' },
  { id: 'confirm', label: 'Готово', title: 'Почти готово', subtitle: 'Проверьте детали и оставьте контакт.' },
];

export const ANY = 'any' as const;

export interface Draft {
  serviceIds: string[];
  staffId: string | typeof ANY | null;
  date: string;
  start: number | null;
  note: string;
  tags: string[];
  name: string;
  phone: string;
}

export const emptyDraft = (): Draft => ({
  serviceIds: [],
  staffId: null,
  date: todayISO(),
  start: null,
  note: '',
  tags: [],
  name: '',
  phone: '',
});

export const servicesOf = (ids: string[]): Service[] => ids.map((id) => SERVICES.find((s) => s.id === id)).filter((s): s is Service => !!s);

export const staffById = (id: string | null | undefined): Staff | undefined => STAFF.find((s) => s.id === id);

/** Мастера-кандидаты для текущего черновика */
export function candidates(d: Draft): Staff[] {
  const elig = eligibleStaff(STAFF, servicesOf(d.serviceIds));
  if (d.staffId && d.staffId !== ANY) return elig.filter((s) => s.id === d.staffId);
  return elig;
}

/** Ближайшее свободное окно для мастера (или группы) в пределах горизонта */
export function nextAvailable(appts: Appointment[], staff: Staff[], duration: number, horizon = 21): { date: string; start: number } | null {
  const today = todayISO();
  for (let i = 0; i < horizon; i++) {
    const date = addDays(today, i);
    let best: number | null = null;
    for (const s of staff) {
      const first = staffSlots(appts, s, date, duration)[0];
      if (first !== undefined && (best === null || first < best)) best = first;
    }
    if (best !== null) return { date, start: best };
  }
  return null;
}

export function slotsFor(appts: Appointment[], d: Draft, duration: number) {
  return groupSlots(appts, candidates(d), d.date, duration);
}

export function canProceed(step: StepId, d: Draft): boolean {
  switch (step) {
    case 'services':
      return d.serviceIds.length > 0;
    case 'staff':
      return d.staffId !== null;
    case 'time':
      return d.start !== null;
    case 'notes':
      return true;
    case 'confirm':
      return d.name.trim().length >= 2 && d.phone.replace(/\D/g, '').length === 11;
  }
}
