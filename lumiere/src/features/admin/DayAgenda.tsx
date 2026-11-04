import { CalendarX2 } from 'lucide-react';
import type { Appointment } from '../../lib/types';
import { appointmentsOn } from '../../lib/schedule';
import { formatPrice, relativeDay } from '../../lib/time';
import { AppointmentRow } from './UpcomingList';

interface Props {
  date: string;
  appointments: Appointment[];
  now: Date;
  onOpen: (a: Appointment) => void;
}

/** Все записи выбранного дня по порядку, с итогом выручки. */
export function DayAgenda({ date, appointments, now, onOpen }: Props) {
  const list = appointmentsOn(appointments, date);
  const total = list.reduce((s, a) => s + a.price, 0);

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <div>
          <h2 className="font-display text-3xl font-semibold tracking-tight">Записи: {relativeDay(date, now).toLowerCase()}</h2>
          <p className="mt-1 text-sm text-ink/50">Нажмите на запись, чтобы позвонить клиенту или отменить визит</p>
        </div>
        <p className="text-sm text-ink/50">
          {list.length} {plural(list.length)} · <span className="font-semibold text-ink">{formatPrice(total)}</span>
        </p>
      </div>
      {list.length ? (
        <ul className="overflow-hidden rounded-[28px] bg-white shadow-soft ring-1 ring-ink/5">
          {list.map((a) => (
            <AppointmentRow key={a.id} appointment={a} onOpen={onOpen} />
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center rounded-[32px] bg-white py-16 text-center ring-1 ring-ink/5">
          <CalendarX2 className="h-8 w-8 text-violet-300" />
          <p className="mt-4 font-semibold">На этот день записей нет</p>
        </div>
      )}
    </section>
  );
}

function plural(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return 'запись';
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'записи';
  return 'записей';
}
