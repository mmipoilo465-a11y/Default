import { toMin, dateToMin } from './time.js';

export const paidOf = (b) => (b.payments || []).reduce((s, p) => s + (p.kind === 'refund' ? -p.amount : p.amount), 0);
export const dueOf = (b) => Math.max(0, (Number(b.price) || 0) - paidOf(b));

/** Записи, пересекающие диапазон дат [from, to] включительно. */
export function overlapping(bookings, from, to) {
  const a = dateToMin(from), z = dateToMin(to) + 1440;
  return bookings.filter((b) => toMin(b.start) < z && toMin(b.end) > a || (toMin(b.start) >= a && toMin(b.start) < z))
    .sort((x, y) => toMin(x.start) - toMin(y.start));
}

/** Сводка: записи по дате начала, деньги — по дате платежа. */
export function summarize(bookings, from, to) {
  const a = dateToMin(from), z = dateToMin(to) + 1440;
  const started = bookings.filter((b) => { const s = toMin(b.start); return s >= a && s < z; });
  const live = started.filter((b) => b.status !== 'cancelled');
  let gross = 0, refunds = 0, payments = 0;
  for (const b of bookings) for (const p of b.payments || []) {
    const t = toMin(p.at);
    if (t >= a && t < z) { if (p.kind === 'refund') refunds += p.amount; else { gross += p.amount; payments++; } }
  }
  return {
    total: live.length,
    arrived: live.filter((b) => b.status === 'accepted' || b.status === 'ready').length,
    done: live.filter((b) => b.status === 'ready').length,
    waiting: live.filter((b) => b.status === 'booked').length,
    cancelled: started.length - live.length,
    received: gross - refunds,
    gross, refunds, payments,
    expected: live.reduce((s, b) => s + (Number(b.price) || 0), 0),
  };
}

export const STATUS = {
  booked: 'Записан',
  accepted: 'Принята',
  ready: 'Готова',
  cancelled: 'Отменена',
};
