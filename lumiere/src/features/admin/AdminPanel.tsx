import { useMemo, useState } from 'react';
import { LogOut, RotateCcw } from 'lucide-react';
import { MASTERS } from '../../data/catalog';
import type { Appointment } from '../../lib/types';
import { longDate, nextDays, toKey } from '../../lib/time';
import { useNow } from '../../lib/useNow';
import { useAppStore } from '../../store/AppStore';
import { useToast } from '../../store/Toast';
import { Button, Eyebrow } from '../../components/ui';
import { StatCards } from './StatCards';
import { WeekOverview } from './WeekOverview';
import { ScheduleBoard } from './ScheduleBoard';
import { UpcomingList } from './UpcomingList';
import { AppointmentModal } from './AppointmentModal';

function greeting(now: Date): string {
  const h = now.getHours();
  if (h >= 5 && h < 12) return 'Доброе утро';
  if (h >= 12 && h < 18) return 'Добрый день';
  if (h >= 18 && h < 23) return 'Добрый вечер';
  return 'Доброй ночи';
}

export function AdminPanel({ onLogout }: { onLogout: () => void }) {
  const { appointments, cancelAppointment, resetDemo } = useAppStore();
  const toast = useToast();
  const now = useNow();
  const days = useMemo(() => nextDays(7, now), [now]);
  const [day, setDay] = useState(() => toKey(new Date()));
  const [openedId, setOpenedId] = useState<string | null>(null);

  const opened = appointments.find((a) => a.id === openedId) ?? null;

  const cancel = (a: Appointment) => {
    cancelAppointment(a.id);
    setOpenedId(null);
    toast(`Запись ${a.client.name} отменена — окно снова свободно`);
  };

  return (
    <div className="space-y-14">
      <section className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
        <div>
          <Eyebrow>Панель руководителя</Eyebrow>
          <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight sm:text-6xl">
            {greeting(now)}
            <span className="text-peach-400">.</span>
          </h1>
          <p className="mt-3 text-ink/50">
            {longDate(toKey(now))} · {MASTERS.length} мастеров в команде
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            onClick={() => {
              resetDemo();
              toast('Демо-данные пересозданы');
            }}
          >
            <RotateCcw className="h-4 w-4" />
            Сбросить демо-данные
          </Button>
          <Button variant="ghost" onClick={onLogout}>
            <LogOut className="h-4 w-4" />
            Выйти
          </Button>
        </div>
      </section>

      <StatCards appointments={appointments} now={now} />

      <section className="space-y-6">
        <div>
          <h2 className="font-display text-3xl font-semibold tracking-tight">Свободные и занятые окна</h2>
          <p className="mt-1 text-sm text-ink/50">Выберите день, чтобы увидеть расписание каждого мастера</p>
        </div>
        <WeekOverview days={days} selected={day} onSelect={setDay} appointments={appointments} now={now} />
        <ScheduleBoard date={day} appointments={appointments} now={now} onOpen={(a) => setOpenedId(a.id)} />
      </section>

      <UpcomingList appointments={appointments} now={now} onOpen={(a) => setOpenedId(a.id)} />

      <AppointmentModal appointment={opened} now={now} onClose={() => setOpenedId(null)} onCancel={cancel} />
    </div>
  );
}
