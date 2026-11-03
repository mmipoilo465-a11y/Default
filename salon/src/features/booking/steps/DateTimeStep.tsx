import { useEffect, useMemo, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarX2, Moon, Sun, Sunrise, Sunset } from 'lucide-react';
import { DAY_PARTS, dayLoad, isHappyHour, type DayLoad } from '../../../lib/scheduling';
import { MONTHS, WEEKDAYS_SHORT, addDays, fmtDateLong, fmtDateShort, fmtTime, parseISODate, relativeDayLabel, todayISO } from '../../../lib/time';
import { cn } from '../../../lib/cn';
import { Button } from '../../../components/ui/Button';
import { useStore } from '../../../store/AppStore';
import { ANY, candidates, nextAvailable, servicesOf, slotsFor, type Draft } from '../draft';

const HORIZON = 21;
const PART_ICON = { morning: Sunrise, day: Sun, evening: Sunset };

const LOAD_DOT: Record<DayLoad, string> = {
  free: 'bg-accent-600',
  busy: 'bg-accent-600/35',
  full: 'bg-slate-300 dark:bg-slate-700',
  off: 'bg-transparent',
};

export function DateTimeStep({ draft, onDate, onSlot }: { draft: Draft; onDate: (d: string) => void; onSlot: (t: number) => void }) {
  const { appointments } = useStore();
  const duration = servicesOf(draft.serviceIds).reduce((s, x) => s + x.duration, 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const group = useMemo(() => candidates(draft), [draft.serviceIds, draft.staffId]);
  const days = useMemo(() => Array.from({ length: HORIZON }, (_, i) => addDays(todayISO(), i)), []);
  const loads = useMemo(() => days.map((d) => dayLoad(appointments, group, d, duration)), [appointments, days, group, duration]);
  const slots = slotsFor(appointments, draft, duration);
  const strip = useRef<HTMLDivElement>(null);

  // Держим выбранный день в зоне видимости ленты
  useEffect(() => {
    // scrollIntoView прокрутил бы и окно — двигаем только саму ленту
    const s = strip.current;
    const el = s?.querySelector<HTMLElement>('[data-active="true"]');
    if (s && el) s.scrollTo({ left: el.offsetLeft - s.clientWidth / 2 + el.clientWidth / 2, behavior: 'smooth' });
  }, [draft.date]);

  const next = slots.size === 0 ? nextAvailable(appointments, group, duration, HORIZON) : null;
  const month = MONTHS[parseISODate(draft.date).getMonth()];

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-3 flex items-end justify-between">
          <p className="text-[15px] font-semibold tracking-tight">{month}</p>
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <i className="h-1.5 w-1.5 rounded-full bg-accent-600" /> свободно
            </span>
            <span className="flex items-center gap-1">
              <i className="h-1.5 w-1.5 rounded-full bg-accent-600/35" /> мало окон
            </span>
            <span className="hidden items-center gap-1 sm:flex">
              <i className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-700" /> занято
            </span>
          </div>
        </div>
        <div
          ref={strip}
          className="no-scrollbar relative -mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 sm:-mx-1 sm:px-1"
          style={{ maskImage: 'linear-gradient(to right, transparent, #000 16px, #000 calc(100% - 24px), transparent)', WebkitMaskImage: 'linear-gradient(to right, transparent, #000 16px, #000 calc(100% - 24px), transparent)' }}
        >
          {days.map((d, i) => {
            const { load } = loads[i];
            const active = d === draft.date;
            const disabled = load === 'off' || load === 'full';
            const date = parseISODate(d);
            const wd = date.getDay();
            return (
              <motion.button
                key={d}
                data-active={active}
                whileTap={disabled ? undefined : { scale: 0.92 }}
                onClick={() => !disabled && onDate(d)}
                disabled={disabled}
                aria-pressed={active}
                aria-label={`${fmtDateLong(d)}${disabled ? ', нет окон' : ''}`}
                className={cn(
                  'relative flex w-[54px] shrink-0 snap-start flex-col items-center gap-1 rounded-2xl py-2.5 transition-colors',
                  active ? 'text-white dark:text-slate-950' : 'hover:bg-slate-100 dark:hover:bg-slate-900',
                  disabled && 'cursor-not-allowed opacity-35 hover:bg-transparent',
                )}
              >
                {active && (
                  <motion.span layoutId="day-pill" className="absolute inset-0 rounded-2xl bg-slate-950 dark:bg-white" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />
                )}
                <span className={cn('relative text-[11px] font-medium uppercase', !active && (wd === 0 || wd === 6) ? 'text-slate-500' : !active && 'text-slate-400')}>
                  {i === 0 ? 'Сег' : WEEKDAYS_SHORT[wd]}
                </span>
                <span className={cn('relative text-lg font-semibold tabular leading-none', disabled && 'line-through decoration-1')}>{date.getDate()}</span>
                <span className={cn('relative h-1.5 w-1.5 rounded-full', active ? 'bg-current opacity-60' : LOAD_DOT[load])} />
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="flex items-baseline justify-between gap-3 border-t border-slate-100 pt-5 dark:border-slate-800/80">
        <p className="text-[15px] font-medium">
          {relativeDayLabel(draft.date) ? `${relativeDayLabel(draft.date)}, ${fmtDateShort(draft.date)}` : fmtDateLong(draft.date)}
        </p>
        <p className="text-[13px] tabular text-slate-400">{slots.size} окон</p>
      </div>

      {[...slots.keys()].some(isHappyHour) && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-accent-600 to-accent-700 px-4 py-3 text-white"
        >
          <Sunrise size={18} className="shrink-0" />
          <p className="text-[13px] leading-snug">
            <span className="font-semibold">Утренний вайб −10%</span>
            <span className="text-white/75"> · на все записи до 11:00</span>
          </p>
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        <motion.div key={draft.date + draft.staffId} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          {slots.size === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-200 px-6 py-10 text-center dark:border-slate-800">
              <CalendarX2 size={28} className="text-slate-300 dark:text-slate-600" />
              <p className="mt-3 font-medium">На этот день свободных окон нет</p>
              <p className="mt-1 text-[13px] text-slate-500">
                {draft.staffId === ANY ? 'Все мастера заняты.' : 'Мастер занят или не работает.'} Попробуйте другую дату.
              </p>
              {next && (
                <Button className="mt-4" size="sm" variant="secondary" onClick={() => onDate(next.date)}>
                  Ближайшее: {relativeDayLabel(next.date) ?? fmtDateShort(next.date)}, {fmtTime(next.start)}
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {DAY_PARTS.map((part) => {
                const list = [...slots.entries()].filter(([t]) => t >= part.from && t < part.to);
                if (!list.length) return null;
                const Icon = PART_ICON[part.id];
                return (
                  <section key={part.id}>
                    <h4 className="mb-2.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.08em] text-slate-400">
                      <Icon size={13} /> {part.label}
                      <span className="font-normal normal-case tracking-normal">· {list.length}</span>
                    </h4>
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                      {list.map(([t, staffIds]) => (
                        <SlotButton key={t} time={t} active={draft.start === t} happy={isHappyHour(t)} masters={draft.staffId === ANY ? staffIds.length : 0} onClick={() => onSlot(t)} />
                      ))}
                    </div>
                  </section>
                );
              })}
              <p className="flex items-center gap-1.5 text-xs text-slate-400">
                <Moon size={12} /> Длительность визита учтена: окна показаны только там, где хватит {duration} мин.
              </p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function SlotButton({ time, active, happy, masters, onClick }: { time: number; active: boolean; happy: boolean; masters: number; onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.9 }}
      animate={active ? { scale: [1, 1.07, 1] } : { scale: 1 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      aria-pressed={active}
      className={cn(
        'relative flex h-12 flex-col items-center justify-center rounded-xl border text-[15px] font-semibold tabular transition-colors duration-150',
        active
          ? 'border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950'
          : 'border-slate-200 hover:border-slate-400 dark:border-slate-800 dark:hover:border-slate-600',
      )}
    >
      {/* тактильная волна при выборе */}
      <AnimatePresence>
        {active && (
          <motion.span
            key="ripple"
            className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-slate-950 dark:ring-white"
            initial={{ opacity: 0.6, scale: 1 }}
            animate={{ opacity: 0, scale: 1.25 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>
      {fmtTime(time)}
      {(happy || masters > 1) && (
        <span className={cn('text-[10px] font-medium leading-none', active ? 'opacity-70' : happy ? 'text-accent-600 dark:text-accent-400' : 'text-slate-400')}>
          {happy ? '−10%' : `${masters} мастера`}
        </span>
      )}
    </motion.button>
  );
}
