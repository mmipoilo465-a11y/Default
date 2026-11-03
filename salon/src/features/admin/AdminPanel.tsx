import { useCallback, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { SERVICES, STAFF } from '../../data/mock';
import type { Appointment, AppointmentStatus } from '../../lib/types';
import { occupancy } from '../../lib/scheduling';
import { addDays, fmtDateLong, fmtTime, relativeDayLabel, todayISO } from '../../lib/time';
import { cn } from '../../lib/cn';
import { Button } from '../../components/ui/Button';
import { STATUS_META } from '../../components/ui/Badge';
import { useStore } from '../../store/AppStore';
import { useToast } from '../../store/Toast';
import { LiveFeed, StatsRow, Upcoming } from './Stats';
import { ScheduleBoard } from './ScheduleBoard';
import { AppointmentDrawer } from './AppointmentDrawer';

const FILTERS: Array<AppointmentStatus | 'all'> = ['all', 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled'];

export function AdminPanel() {
  const { appointments, clients, events, setStatus, logEvent, reset } = useStore();
  const toast = useToast();
  const [date, setDate] = useState(todayISO);
  const [filter, setFilter] = useState<AppointmentStatus | 'all'>('all');
  const [open, setOpen] = useState<Appointment | null>(null);

  const isToday = date === todayISO();
  const closeDrawer = useCallback(() => setOpen(null), []);
  const dayAppts = useMemo(() => appointments.filter((a) => a.date === date), [appointments, date]);
  const occ = useMemo(() => occupancy(appointments, STAFF, date), [appointments, date]);
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: dayAppts.length };
    for (const a of dayAppts) c[a.status] = (c[a.status] ?? 0) + 1;
    return c;
  }, [dayAppts]);

  /** Симуляция отправки: SMS → Telegram → готово */
  const notify = useCallback(
    (a: Appointment) => {
      const staff = STAFF.find((s) => s.id === a.staffId);
      const svc = SERVICES.find((s) => s.id === a.serviceIds[0]);
      if (!staff) return;
      const when = a.date === todayISO() ? fmtTime(a.start) : `${relativeDayLabel(a.date)?.toLowerCase() ?? a.date.slice(5).split('-').reverse().join('.')} ${fmtTime(a.start)}`;
      const id = toast.show({ tone: 'loading', title: `Отправляем SMS мастеру ${staff.dative}…` });
      window.setTimeout(() => toast.update(id, { tone: 'loading', title: 'SMS доставлено · отправляем в Telegram…' }), 700);
      window.setTimeout(() => {
        const label = `${svc?.notifyLabel ?? 'Новая запись'} на ${when}`;
        toast.update(id, { tone: 'success', title: `SMS и Telegram отправлены мастеру ${staff.dative}`, description: label, duration: 5000 });
        logEvent('notify', `${staff.dative} отправлено: ${label}`);
      }, 1500);
    },
    [toast, logEvent],
  );

  const changeStatus = useCallback(
    (id: string, s: AppointmentStatus) => {
      setStatus(id, s);
      toast.show({ tone: 'success', title: `Статус: ${STATUS_META[s].label}`, duration: 2200 });
    },
    [setStatus, toast],
  );

  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-16 pt-6 sm:px-6 lg:pt-10">
      {/* Заголовок + навигация по датам */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[13px] font-medium text-slate-400">Центр управления</p>
          <h1 className="mt-1 text-[30px] font-semibold leading-tight tracking-[-0.03em] sm:text-4xl">
            {relativeDayLabel(date) ?? fmtDateLong(date).split(',')[0]}
            <span className="text-slate-300 dark:text-slate-600"> · {fmtDateLong(date).split(', ')[1]}</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl border border-slate-200 p-0.5 dark:border-slate-800">
            <Button variant="ghost" size="icon" onClick={() => setDate((d) => addDays(d, -1))} aria-label="Предыдущий день">
              <ChevronLeft size={18} />
            </Button>
            <Button variant="ghost" size="sm" className={cn('px-3', isToday && 'text-slate-950 dark:text-white')} onClick={() => setDate(todayISO())}>
              Сегодня
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setDate((d) => addDays(d, 1))} aria-label="Следующий день">
              <ChevronRight size={18} />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            title="Сбросить демо-данные"
            aria-label="Сбросить демо-данные"
            onClick={() => {
              if (window.confirm('Сбросить демо-данные? Ваши записи будут удалены.')) {
                reset();
                toast.show({ tone: 'success', title: 'Демо-данные восстановлены' });
              }
            }}
          >
            <RotateCcw size={16} />
          </Button>
        </div>
      </div>

      <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-3">
          <StatsRow appts={dayAppts} occupancy={occ} isToday={isToday} />
          <Upcoming appts={dayAppts} clients={clients} isToday={isToday} onOpen={setOpen} />
        </div>
        <div className="xl:row-span-1">
          <LiveFeed events={events} />
        </div>
      </div>

      {/* Фильтры статусов */}
      <div className="no-scrollbar -mx-4 mb-3 mt-8 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {FILTERS.map((f) => {
          const active = filter === f;
          return (
            <motion.button
              key={f}
              whileTap={{ scale: 0.95 }}
              onClick={() => setFilter(f)}
              className={cn(
                'relative flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors',
                active ? 'text-white dark:text-slate-950' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white',
              )}
            >
              {active && <motion.span layoutId="status-filter" className="absolute inset-0 rounded-full bg-slate-950 dark:bg-white" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
              {f !== 'all' && <span className={cn('relative h-2 w-2 rounded-full', active ? 'bg-current' : STATUS_META[f].dot)} />}
              <span className="relative">{f === 'all' ? 'Все' : STATUS_META[f].label}</span>
              <span className={cn('relative tabular', active ? 'opacity-60' : 'text-slate-400')}>{counts[f] ?? 0}</span>
            </motion.button>
          );
        })}
      </div>

      <ScheduleBoard date={date} isToday={isToday} appointments={appointments} clients={clients} filter={filter} onOpen={setOpen} onNotify={notify} />
      <p className="mt-3 text-xs text-slate-400">Нажмите на запись, чтобы открыть карточку клиента. Колокольчик — отправить уведомление мастеру.</p>

      <AppointmentDrawer appointment={open} appointments={appointments} clients={clients} onClose={closeDrawer} onStatus={changeStatus} onNotify={notify} />
    </div>
  );
}
