import { useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarX2, Moon, Sun, Sunrise } from 'lucide-react';
import type { Appointment, Master } from '../../../lib/types';
import { daySlots } from '../../../lib/schedule';
import { dayNumber, hhmm, monthShort, nextDays, weekdayShort, toKey } from '../../../lib/time';
import { cn } from '../../../lib/cn';
import { StepTitle } from './ServiceStep';

interface Props {
  masters: Master[];
  duration: number;
  date: string | null;
  start: number | null;
  appointments: Appointment[];
  now: Date;
  onDate: (d: string) => void;
  onStart: (t: number) => void;
}

const PERIODS = [
  { title: 'Утро', icon: Sunrise, from: 0, to: 12 * 60 },
  { title: 'День', icon: Sun, from: 12 * 60, to: 17 * 60 },
  { title: 'Вечер', icon: Moon, from: 17 * 60, to: 24 * 60 },
];

export function DateTimeStep({ masters, duration, date, start, appointments, now, onDate, onStart }: Props) {
  const days = useMemo(() => {
    return nextDays(14, now).map((key) => {
      const slots = daySlots(appointments, masters, key, duration, now);
      return { key, slots, freeCount: slots.filter((s) => s.free.length).length };
    });
  }, [appointments, masters, duration, now]);

  // Автоматически выбираем первый день, где есть свободные окна.
  useEffect(() => {
    if (date && days.some((d) => d.key === date)) return;
    const first = days.find((d) => d.freeCount > 0);
    if (first) onDate(first.key);
  }, [date, days, onDate]);

  const current = days.find((d) => d.key === date);
  const todayKey = toKey(now);

  return (
    <div>
      <StepTitle title="Дата и время" hint="Показаны только окна, когда мастер действительно свободен" />

      <div className="-mx-4 -mb-8 -mt-4 overflow-x-auto px-4 pb-8 pt-4 scrollbar-none sm:-mx-3 sm:px-3">
        <div className="flex gap-2">
          {days.map(({ key, freeCount }) => {
            const active = key === date;
            const disabled = freeCount === 0;
            return (
              <motion.button
                key={key}
                type="button"
                disabled={disabled}
                whileTap={disabled ? undefined : { scale: 0.95 }}
                onClick={() => onDate(key)}
                className={cn(
                  'relative flex w-[68px] shrink-0 flex-col items-center gap-1 rounded-2xl py-4 transition-colors duration-300',
                  active ? 'text-white' : 'bg-white ring-1 ring-ink/5',
                  !active && !disabled && 'hover:ring-violet-300',
                  disabled && 'opacity-40',
                )}
              >
                {active && (
                  <motion.span
                    layoutId="date-pill"
                    className="absolute inset-0 rounded-2xl bg-violet-600 shadow-glow"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  />
                )}
                <span className={cn('relative text-[11px] font-semibold uppercase tracking-wider', active ? 'text-white/70' : 'text-ink/40')}>
                  {key === todayKey ? 'Сегодня' : weekdayShort(key)}
                </span>
                <span className="relative text-xl font-semibold">{dayNumber(key)}</span>
                <span className={cn('relative text-[11px]', active ? 'text-peach-200' : 'text-ink/45')}>
                  {disabled ? 'нет окон' : monthShort(key)}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={date ?? 'none'}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="mt-8 space-y-8"
        >
          {!current || current.freeCount === 0 ? (
            <div className="flex flex-col items-center rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-ink/5">
              <CalendarX2 className="h-8 w-8 text-violet-300" />
              <p className="mt-4 font-semibold">Свободных окон нет</p>
              <p className="mt-1 text-sm text-ink/50">Попробуйте другой день или выберите другого мастера</p>
            </div>
          ) : (
            PERIODS.map(({ title, icon: Icon, from, to }) => {
              const slots = current.slots.filter((s) => s.start >= from && s.start < to);
              if (!slots.length) return null;
              return (
                <section key={title}>
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink/60">
                    <Icon className="h-4 w-4 text-peach-500" />
                    {title}
                  </h3>
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                    {slots.map((s) => {
                      const available = s.free.length > 0;
                      const active = s.start === start;
                      return (
                        <motion.button
                          key={s.start}
                          type="button"
                          disabled={!available}
                          whileTap={available ? { scale: 0.94 } : undefined}
                          onClick={() => onStart(s.start)}
                          className={cn(
                            'h-12 rounded-2xl text-sm font-semibold tabular-nums transition-all duration-200',
                            active && 'bg-violet-600 text-white shadow-glow',
                            !active && available && 'bg-white ring-1 ring-ink/10 hover:bg-peach-50 hover:ring-peach-300',
                            !available && 'cursor-not-allowed bg-transparent text-ink/20 line-through',
                          )}
                        >
                          {hhmm(s.start)}
                        </motion.button>
                      );
                    })}
                  </div>
                </section>
              );
            })
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
