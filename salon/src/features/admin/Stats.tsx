import { motion } from 'framer-motion';
import { Bell, CalendarCheck2, CircleDot, RefreshCw, Wallet } from 'lucide-react';
import type { ActivityEvent, Appointment, Client } from '../../lib/types';
import { SERVICES, STAFF } from '../../data/mock';
import { Avatar } from '../../components/ui/Avatar';
import { StatusBadge } from '../../components/ui/Badge';
import { fmtPrice, fmtTime, nowMinutes, timeAgo } from '../../lib/time';
import { cn } from '../../lib/cn';
import { Card } from '../../components/ui/Card';
import { AnimatedPrice } from '../booking/Summary';

export function StatsRow({ appts, occupancy, isToday }: { appts: Appointment[]; occupancy: number; isToday: boolean }) {
  const active = appts.filter((a) => a.status !== 'cancelled');
  const revenue = active.reduce((s, a) => s + a.price, 0);
  const earned = appts.filter((a) => a.status === 'completed').reduce((s, a) => s + a.price, 0);
  const pending = appts.filter((a) => a.status === 'pending').length;
  const done = appts.filter((a) => a.status === 'completed').length;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Card className="p-4 sm:p-5">
        <p className="flex items-center gap-1.5 text-[13px] text-slate-500">
          <Wallet size={14} /> Выручка {isToday ? 'за сегодня' : 'за день'}
        </p>
        <AnimatedPrice value={revenue} className="mt-3 block text-[26px] font-semibold leading-none tracking-tight tabular sm:text-3xl" />
        <p className="mt-2 text-xs tabular text-slate-400">{fmtPrice(earned)} уже получено</p>
      </Card>

      <Card className="p-4 sm:p-5">
        <p className="flex items-center gap-1.5 text-[13px] text-slate-500">
          <CalendarCheck2 size={14} /> Записей
        </p>
        <p className="mt-3 text-[26px] font-semibold leading-none tracking-tight tabular sm:text-3xl">{active.length}</p>
        <p className="mt-2 text-xs tabular text-slate-400">
          {done} завершено · {appts.length - active.length} отмен
        </p>
      </Card>

      <Card className="col-span-2 p-4 sm:p-5">
        <div className="flex items-start justify-between">
          <p className="flex items-center gap-1.5 text-[13px] text-slate-500">
            <CircleDot size={14} /> Загруженность салона
          </p>
          {pending > 0 && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium tabular text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {pending} ждут подтверждения
            </span>
          )}
        </div>
        <p className="mt-3 text-[26px] font-semibold leading-none tracking-tight sm:text-3xl">
          <span className="tabular">{occupancy}%</span>
          <span className="ml-2 text-base font-normal text-slate-400">заполнено {isToday ? 'сегодня' : ''}</span>
        </p>
        <div className="mt-4 flex h-2 gap-[3px]">
          {Array.from({ length: 40 }, (_, i) => (
            <motion.span
              key={i}
              initial={{ scaleY: 0.3, opacity: 0 }}
              animate={{ scaleY: 1, opacity: 1 }}
              transition={{ delay: i * 0.012 }}
              className={cn('flex-1 rounded-full', i < Math.round(occupancy / 2.5) ? 'bg-accent-600' : 'bg-slate-100 dark:bg-slate-800')}
            />
          ))}
        </div>
      </Card>
    </div>
  );
}

const EVENT_ICON = { booking: CalendarCheck2, status: RefreshCw, notify: Bell };

export function LiveFeed({ events }: { events: ActivityEvent[] }) {
  return (
    <Card className="flex flex-col p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <p className="text-[15px] font-semibold tracking-tight">Живая лента</p>
        <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-accent-700 dark:text-accent-400">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-500 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-600" />
          </span>
          Live
        </span>
      </div>
      <ul className="mt-4 space-y-3.5">
        {events.slice(0, 5).map((e) => {
          const Icon = EVENT_ICON[e.kind];
          return (
            <motion.li key={e.id} layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
              <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <Icon size={13} />
              </span>
              <div className="min-w-0">
                <p className="text-[13px] leading-snug">{e.text}</p>
                <p className="mt-0.5 text-[11px] text-slate-400">{timeAgo(e.at)}</p>
              </div>
            </motion.li>
          );
        })}
      </ul>
    </Card>
  );
}

/** Ближайшие визиты — быстрый доступ к карточкам */
export function Upcoming({ appts, clients, isToday, onOpen }: { appts: Appointment[]; clients: Client[]; isToday: boolean; onOpen: (a: Appointment) => void }) {
  const now = nowMinutes();
  const list = appts
    .filter((a) => a.status !== 'cancelled' && a.status !== 'completed' && (!isToday || a.start + a.duration > now))
    .sort((a, b) => a.start - b.start)
    .slice(0, 4);

  return (
    <Card className="p-4 sm:p-5">
      <p className="text-[15px] font-semibold tracking-tight">{isToday ? 'Ближайшие визиты' : 'Первые визиты дня'}</p>
      {list.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">На этот день активных записей больше нет.</p>
      ) : (
        <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:px-0 lg:grid-cols-4">
          {list.map((a) => {
            const staff = STAFF.find((s) => s.id === a.staffId);
            const client = clients.find((c) => c.id === a.clientId);
            return (
              <motion.button
                key={a.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => onOpen(a)}
                className="w-[220px] shrink-0 rounded-xl border border-slate-100 p-3 text-left transition hover:border-slate-300 sm:w-auto dark:border-slate-800 dark:hover:border-slate-600"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xl font-semibold tracking-tight tabular">{fmtTime(a.start)}</span>
                  <StatusBadge status={a.status} />
                </div>
                <p className="mt-2 truncate text-[13px] font-medium">{client?.name ?? 'Гость'}</p>
                <p className="truncate text-xs text-slate-500">{SERVICES.find((s) => s.id === a.serviceIds[0])?.name}</p>
                {staff && (
                  <span className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                    <Avatar name={staff.name} tone={staff.tone} size={18} /> {staff.name.split(' ')[0]}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      )}
    </Card>
  );
}
