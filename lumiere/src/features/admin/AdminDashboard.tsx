import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarClock, ChartColumn, RotateCcw } from 'lucide-react';
import { MASTERS } from '../../data/catalog';
import type { Appointment } from '../../lib/types';
import { longDate, nextDays, toKey } from '../../lib/time';
import { useNow } from '../../lib/useNow';
import { cn } from '../../lib/cn';
import { useAppStore } from '../../store/AppStore';
import { useToast } from '../../store/Toast';
import { Button, Eyebrow } from '../../components/ui';
import { StatCards } from './StatCards';
import { RevenueCharts } from './RevenueCharts';
import { WeekOverview } from './WeekOverview';
import { ScheduleBoard } from './ScheduleBoard';
import { DayAgenda } from './DayAgenda';
import { UpcomingList } from './UpcomingList';
import { AppointmentModal } from './AppointmentModal';

type Tab = 'overview' | 'schedule';

const TABS: { id: Tab; label: string; short: string; icon: typeof ChartColumn }[] = [
  { id: 'overview', label: 'Данные и выручка', short: 'Данные', icon: ChartColumn },
  { id: 'schedule', label: 'Расписание на день', short: 'Расписание', icon: CalendarClock },
];

const tabFromHash = (): Tab => (window.location.hash === '#schedule' ? 'schedule' : 'overview');

function greeting(now: Date): string {
  const h = now.getHours();
  if (h >= 5 && h < 12) return 'Доброе утро';
  if (h >= 12 && h < 18) return 'Добрый день';
  if (h >= 18 && h < 23) return 'Добрый вечер';
  return 'Доброй ночи';
}

export function AdminDashboard() {
  const { appointments, cancelAppointment, resetDemo } = useAppStore();
  const toast = useToast();
  const now = useNow();
  const days = useMemo(() => nextDays(7, now), [now]);
  const [tab, setTab] = useState<Tab>(tabFromHash);
  const [day, setDay] = useState(() => toKey(new Date()));
  const [openedId, setOpenedId] = useState<string | null>(null);

  // Вкладка хранится в адресе: после обновления страницы остаёмся там же.
  useEffect(() => {
    history.replaceState(null, '', tab === 'schedule' ? '#schedule' : location.pathname);
  }, [tab]);

  const opened = appointments.find((a) => a.id === openedId) ?? null;
  const open = (a: Appointment) => setOpenedId(a.id);

  const cancel = (a: Appointment) => {
    cancelAppointment(a.id);
    setOpenedId(null);
    toast(`Запись ${a.client.name} отменена — окно снова свободно`);
  };

  return (
    <div className="space-y-10">
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
        <Button
          variant="ghost"
          onClick={() => {
            resetDemo();
            toast('Демо-данные пересозданы');
          }}
        >
          <RotateCcw className="h-4 w-4" />
          Сбросить демо-данные
        </Button>
      </section>

      <div role="tablist" aria-label="Разделы панели" className="flex w-full rounded-full bg-white p-1 shadow-soft ring-1 ring-ink/5 sm:inline-flex sm:w-auto">
        {TABS.map(({ id, label, short, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              role="tab"
              id={`tab-${id}`}
              aria-selected={active}
              aria-controls={`panel-${id}`}
              onClick={() => setTab(id)}
              className={cn(
                'relative flex h-11 flex-1 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors sm:flex-none sm:px-6',
                active ? 'text-white' : 'text-ink/55 hover:text-violet-700',
              )}
            >
              {active && (
                <motion.span
                  layoutId="admin-tab"
                  className="absolute inset-0 rounded-full bg-violet-600"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <Icon className="relative h-4 w-4 shrink-0" />
              <span className="relative hidden sm:inline">{label}</span>
              <span className="relative sm:hidden">{short}</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          role="tabpanel"
          id={`panel-${tab}`}
          aria-labelledby={`tab-${tab}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-14"
        >
          {tab === 'overview' ? (
            <>
              <StatCards appointments={appointments} days={days} now={now} />
              <RevenueCharts appointments={appointments} days={days} now={now} />
              <UpcomingList appointments={appointments} now={now} onOpen={open} />
            </>
          ) : (
            <>
              <section className="space-y-6">
                <div>
                  <h2 className="font-display text-3xl font-semibold tracking-tight">Свободные и занятые окна</h2>
                  <p className="mt-1 text-sm text-ink/50">Выберите день, чтобы увидеть расписание каждого мастера</p>
                </div>
                <WeekOverview days={days} selected={day} onSelect={setDay} appointments={appointments} now={now} />
                <ScheduleBoard date={day} appointments={appointments} now={now} onOpen={open} />
              </section>
              <DayAgenda date={day} appointments={appointments} now={now} onOpen={open} />
            </>
          )}
        </motion.div>
      </AnimatePresence>

      <AppointmentModal appointment={opened} now={now} onClose={() => setOpenedId(null)} onCancel={cancel} />
    </div>
  );
}
