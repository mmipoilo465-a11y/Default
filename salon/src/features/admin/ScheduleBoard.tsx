import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { BellRing, Coffee, Sunrise } from 'lucide-react';
import { SALON, SERVICES, STAFF } from '../../data/mock';
import type { Appointment, AppointmentStatus, Client } from '../../lib/types';
import { bookedMinutes, staffWorksOn } from '../../lib/scheduling';
import { fmtTime, nowMinutes } from '../../lib/time';
import { cn } from '../../lib/cn';
import { Avatar } from '../../components/ui/Avatar';
import { STATUS_META } from '../../components/ui/Badge';

const HOUR = 88; // px на час
const px = (min: number) => ((min - SALON.open) / 60) * HOUR;

const BLOCK: Record<AppointmentStatus, string> = {
  pending: 'border border-dashed border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900',
  confirmed: 'border border-slate-200 border-l-[3px] border-l-accent-600 bg-white shadow-soft dark:border-slate-700 dark:border-l-accent-500 dark:bg-slate-900',
  in_progress: 'border border-accent-700 bg-accent-600 text-white shadow-[0_8px_24px_-12px_rgb(9_121_105/0.7)]',
  completed: 'border border-slate-100 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400',
  cancelled: 'border border-slate-100 bg-transparent text-slate-400 opacity-60 dark:border-slate-800',
};

interface Props {
  date: string;
  isToday: boolean;
  appointments: Appointment[];
  clients: Client[];
  filter: AppointmentStatus | 'all';
  onOpen: (a: Appointment) => void;
  onNotify: (a: Appointment) => void;
}

export function ScheduleBoard({ date, isToday, appointments, clients, filter, onOpen, onNotify }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(nowMinutes);
  const hours = Array.from({ length: (SALON.close - SALON.open) / 60 + 1 }, (_, i) => SALON.open + i * 60);
  const height = px(SALON.close);

  useEffect(() => {
    const id = window.setInterval(() => setNow(nowMinutes()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  // Автоскролл к текущему времени
  useEffect(() => {
    if (!isToday || !scroller.current) return;
    scroller.current.scrollTo({ top: Math.max(0, px(nowMinutes()) - 120), behavior: 'smooth' });
  }, [isToday, date]);

  const showNow = isToday && now >= SALON.open && now <= SALON.close;
  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? 'Гость';

  return (
    <div ref={scroller} className="relative max-h-[72vh] overflow-auto overscroll-contain rounded-2xl border border-slate-200/70 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="grid min-w-max" style={{ gridTemplateColumns: `56px repeat(${STAFF.length}, minmax(176px, 1fr))` }}>
        {/* Шапка колонок */}
        <div className="sticky left-0 top-0 z-30 border-b border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-950" />
        {STAFF.map((s) => {
          const works = staffWorksOn(s, date);
          const load = works ? Math.round((bookedMinutes(appointments, s.id, date) / (s.end - s.start)) * 100) : 0;
          return (
            <div key={s.id} className="sticky top-0 z-20 flex items-center gap-2.5 border-b border-l border-slate-100 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-950">
              <Avatar name={s.name} tone={s.tone} size={32} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold">{s.name.split(' ')[0]}</p>
                <p className="truncate text-[11px] text-slate-400">{works ? `${fmtTime(s.start)}–${fmtTime(s.end)} · ${load}%` : 'Выходной'}</p>
              </div>
            </div>
          );
        })}

        {/* Шкала времени */}
        <div className="sticky left-0 z-10 bg-white dark:bg-slate-950" style={{ height }}>
          {hours.map((h) => (
            <span key={h} className="absolute right-2 -translate-y-1/2 text-[11px] tabular text-slate-400" style={{ top: px(h) }}>
              {h === SALON.open ? '' : fmtTime(h)}
            </span>
          ))}
          {showNow && (
            <span className="absolute right-1 z-10 -translate-y-1/2 rounded-md bg-accent-600 px-1.5 py-0.5 text-[10px] font-semibold tabular text-white" style={{ top: px(now) }}>
              {fmtTime(now)}
            </span>
          )}
        </div>

        {/* Колонки мастеров */}
        {STAFF.map((s) => {
          const works = staffWorksOn(s, date);
          const items = appointments
            .filter((a) => a.staffId === s.id && a.date === date)
            .sort((a, b) => a.start - b.start);
          return (
            <div key={s.id} className="relative border-l border-slate-100 dark:border-slate-800" style={{ height }}>
              {/* сетка */}
              {hours.map((h) => (
                <div key={h} className="absolute inset-x-0 border-t border-slate-100 dark:border-slate-800/70" style={{ top: px(h) }} />
              ))}
              {hours.slice(0, -1).map((h) => (
                <div key={`h${h}`} className="absolute inset-x-0 border-t border-dashed border-slate-100/70 dark:border-slate-800/40" style={{ top: px(h + 30) }} />
              ))}
              {/* счастливые часы */}
              {works && s.start < 11 * 60 && (
                <div className="absolute inset-x-0 bg-accent-50/40 dark:bg-accent-500/[0.04]" style={{ top: px(s.start), height: px(11 * 60) - px(s.start) }}>
                  <Sunrise size={11} className="absolute right-2 top-1.5 text-accent-600/50" />
                </div>
              )}
              {/* нерабочее время */}
              {!works ? (
                <div className="hatch absolute inset-0 grid place-items-center">
                  <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs text-slate-400 dark:bg-slate-950">
                    <Coffee size={12} /> Выходной
                  </span>
                </div>
              ) : (
                <>
                  {s.start > SALON.open && <div className="hatch absolute inset-x-0 top-0" style={{ height: px(s.start) }} />}
                  {s.end < SALON.close && <div className="hatch absolute inset-x-0 bottom-0" style={{ top: px(s.end) }} />}
                </>
              )}

              {showNow && <div className="pointer-events-none absolute inset-x-0 z-10 h-px bg-accent-600" style={{ top: px(now) }} />}
              {items.map((a) => {
                const dim = filter !== 'all' && a.status !== filter;
                const svc = a.serviceIds.map((id) => SERVICES.find((x) => x.id === id)?.name).filter(Boolean).join(' + ');
                const h = (a.duration / 60) * HOUR - 4;
                const compact = h < 80;
                return (
                  <motion.div
                    key={a.id}
                    layout
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: dim ? 0.18 : 1, scale: 1 }}
                    whileHover={{ y: -1 }}
                    onClick={() => onOpen(a)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onOpen(a))}
                    className={cn('group absolute inset-x-1.5 cursor-pointer overflow-hidden rounded-xl px-2.5 py-1.5 text-left transition-shadow', BLOCK[a.status])}
                    style={{ top: px(a.start) + 2, height: h }}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0">
                        <p className={cn('truncate text-[12px] font-semibold leading-tight', a.status === 'cancelled' && 'line-through')}>{clientName(a.clientId)}</p>
                        <p className={cn('truncate text-[11px] leading-tight', a.status === 'in_progress' ? 'text-white/75' : 'text-slate-500 dark:text-slate-400')}>
                          {fmtTime(a.start)}–{fmtTime(a.start + a.duration)}
                          {compact && ` · ${svc}`}
                        </p>
                      </div>
                      {a.status !== 'cancelled' && a.status !== 'completed' && (
                        <motion.button
                          whileTap={{ scale: 0.85 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onNotify(a);
                          }}
                          title="Уведомить мастера"
                          aria-label="Уведомить мастера"
                          className={cn(
                            'grid h-6 w-6 shrink-0 place-items-center rounded-lg transition sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100',
                            a.status === 'in_progress' ? 'bg-white/15 hover:bg-white/25' : 'bg-slate-100 text-slate-600 hover:bg-slate-950 hover:text-white dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-white dark:hover:text-slate-950',
                          )}
                        >
                          <BellRing size={12} />
                        </motion.button>
                      )}
                    </div>
                    {!compact && (
                      <>
                        <p className={cn('mt-1 text-[11px] leading-snug', h < 120 ? 'line-clamp-1' : 'line-clamp-2', a.status === 'in_progress' ? 'text-white/90' : 'text-slate-600 dark:text-slate-300')}>{svc}</p>
                        <span className="absolute bottom-1.5 left-2.5 flex items-center gap-1 text-[10px] font-medium">
                          <span className={cn('h-1.5 w-1.5 rounded-full', a.status === 'in_progress' ? 'bg-white' : STATUS_META[a.status].dot)} />
                          <span className={a.status === 'in_progress' ? 'text-white/85' : 'text-slate-400'}>{STATUS_META[a.status].label}</span>
                        </span>
                        {a.source === 'online' && (
                          <span className="absolute bottom-1.5 right-2 rounded bg-slate-950 px-1 text-[9px] font-semibold uppercase tracking-wider text-white dark:bg-white dark:text-slate-950">new</span>
                        )}
                      </>
                    )}
                  </motion.div>
                );
              })}
            </div>
          );
        })}
      </div>

    </div>
  );
}
