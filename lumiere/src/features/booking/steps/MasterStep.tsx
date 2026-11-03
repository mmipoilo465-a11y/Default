import { motion } from 'framer-motion';
import { Shuffle, Star } from 'lucide-react';
import { mastersFor } from '../../../data/catalog';
import type { Appointment, Category } from '../../../lib/types';
import { ANY_MASTER } from '../../../lib/types';
import { nearestSlot } from '../../../lib/schedule';
import { hhmm, relativeDay } from '../../../lib/time';
import { Avatar } from '../../../components/ui';
import { cn } from '../../../lib/cn';
import { SelectDot, StepTitle } from './ServiceStep';

interface Props {
  category: Category;
  duration: number;
  masterId: string | null;
  appointments: Appointment[];
  now: Date;
  onSelect: (id: string) => void;
}

export function MasterStep({ category, duration, masterId, appointments, now, onSelect }: Props) {
  const masters = mastersFor(category);

  const nearestLabel = (ids: string[]) => {
    const slot = nearestSlot(appointments, masters.filter((m) => ids.includes(m.id)), duration, now);
    return slot ? `${relativeDay(slot.date, now)}, ${hhmm(slot.start)}` : 'Нет окон на 2 недели';
  };

  const options = [
    {
      id: ANY_MASTER,
      title: 'Любой мастер',
      subtitle: 'Подберём свободного специалиста',
      nearest: nearestLabel(masters.map((m) => m.id)),
      master: null,
    },
    ...masters.map((m) => ({
      id: m.id,
      title: m.name,
      subtitle: m.role,
      nearest: nearestLabel([m.id]),
      master: m,
    })),
  ];

  return (
    <div>
      <StepTitle title="Выберите мастера" hint="Все мастера — с опытом от 5 лет и рейтингом выше 4.8" />
      <motion.ul
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.06 } } }}
        className="grid gap-3 sm:grid-cols-2"
      >
        {options.map((o) => {
          const selected = o.id === masterId;
          return (
            <motion.li
              key={o.id}
              variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <button
                type="button"
                onClick={() => onSelect(o.id)}
                aria-pressed={selected}
                className={cn(
                  'group flex h-full w-full items-start gap-4 rounded-3xl bg-white p-5 text-left transition-all duration-300 sm:p-6',
                  selected ? 'shadow-lift ring-2 ring-violet-500' : 'ring-1 ring-ink/5 hover:shadow-soft hover:ring-violet-200',
                )}
              >
                {o.master ? (
                  <Avatar master={o.master} size={56} />
                ) : (
                  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-peach-100 text-violet-700">
                    <Shuffle className="h-6 w-6" />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{o.title}</span>
                  <span className="mt-0.5 block text-sm text-ink/50">{o.subtitle}</span>
                  {o.master && (
                    <span className="mt-3 flex items-center gap-3 text-xs font-medium text-ink/55">
                      <span className="inline-flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-peach-400 text-peach-400" />
                        {o.master.rating.toFixed(1)}
                      </span>
                      <span className="h-1 w-1 rounded-full bg-ink/20" />
                      <span>Опыт {o.master.experience} лет</span>
                    </span>
                  )}
                  <span className="mt-3 inline-flex rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
                    Ближайшее: {o.nearest}
                  </span>
                </span>
                <SelectDot selected={selected} />
              </button>
            </motion.li>
          );
        })}
      </motion.ul>
    </div>
  );
}
