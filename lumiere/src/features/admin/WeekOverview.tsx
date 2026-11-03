import { motion } from 'framer-motion';
import { MASTERS } from '../../data/catalog';
import type { Appointment } from '../../lib/types';
import { dayLoad } from '../../lib/schedule';
import { dayNumber, monthShort, toKey, weekdayShort } from '../../lib/time';
import { cn } from '../../lib/cn';

interface Props {
  days: string[];
  selected: string;
  onSelect: (d: string) => void;
  appointments: Appointment[];
  now: Date;
}

export function WeekOverview({ days, selected, onSelect, appointments, now }: Props) {
  const today = toKey(now);
  return (
    <div className="-mx-4 -mb-8 -mt-4 overflow-x-auto px-4 pb-8 pt-4 scrollbar-none sm:-mx-3 sm:px-3">
      <div className="grid min-w-[760px] grid-cols-7 gap-3">
        {days.map((d) => {
          const load = dayLoad(appointments, MASTERS, d, now);
          const pct = load.total ? load.busy / load.total : 0;
          const active = d === selected;
          return (
            <motion.button
              key={d}
              type="button"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(d)}
              className={cn(
                'relative rounded-3xl p-4 text-left transition-colors duration-300',
                active ? 'text-white' : 'bg-white ring-1 ring-ink/5 hover:ring-violet-200',
              )}
            >
              {active && (
                <motion.span
                  layoutId="week-day"
                  className="absolute inset-0 rounded-3xl bg-violet-600 shadow-glow"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              )}
              <span className="relative block">
                <span className={cn('text-[11px] font-semibold uppercase tracking-wider', active ? 'text-white/70' : 'text-ink/40')}>
                  {d === today ? 'Сегодня' : weekdayShort(d)}
                </span>
                <span className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-2xl font-semibold">{dayNumber(d)}</span>
                  <span className={cn('text-xs', active ? 'text-white/60' : 'text-ink/40')}>{monthShort(d)}</span>
                </span>
                <span className={cn('mt-4 block h-1.5 overflow-hidden rounded-full', active ? 'bg-white/20' : 'bg-violet-50')}>
                  <motion.span
                    className={cn('block h-full rounded-full', active ? 'bg-peach-300' : 'bg-violet-500')}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.round(pct * 100)}%` }}
                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  />
                </span>
                <span className={cn('mt-3 flex flex-wrap justify-between gap-x-2 text-[11px] font-medium', active ? 'text-white/75' : 'text-ink/50')}>
                  <span>Занято {load.busy}</span>
                  <span>Своб. {load.free}</span>
                </span>
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
