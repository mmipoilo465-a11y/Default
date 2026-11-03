import { motion } from 'framer-motion';
import { Check, Clock } from 'lucide-react';
import { CATEGORIES, SERVICES } from '../../../data/catalog';
import type { Category } from '../../../lib/types';
import { formatDuration, formatPrice } from '../../../lib/time';
import { cn } from '../../../lib/cn';

interface Props {
  category: Category;
  serviceId: string | null;
  onCategory: (c: Category) => void;
  onSelect: (id: string) => void;
}

export function ServiceStep({ category, serviceId, onCategory, onSelect }: Props) {
  const services = SERVICES.filter((s) => s.category === category);

  return (
    <div>
      <StepTitle title="Выберите услугу" hint="Начните с направления — подберём мастера и время" />

      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {CATEGORIES.map(({ id, name, tagline, icon: Icon }) => {
          const active = id === category;
          return (
            <motion.button
              key={id}
              type="button"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onCategory(id)}
              className={cn(
                'relative overflow-hidden rounded-3xl p-4 text-left transition-colors duration-300 sm:p-6',
                active ? 'text-white' : 'bg-white text-ink ring-1 ring-ink/5 hover:ring-violet-200',
              )}
            >
              {active && (
                <motion.span
                  layoutId="category-bg"
                  className="absolute inset-0 bg-gradient-to-br from-violet-600 to-violet-800"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <span className="relative flex flex-col gap-4 sm:gap-8">
                <span
                  className={cn(
                    'grid h-10 w-10 place-items-center rounded-2xl transition-colors sm:h-12 sm:w-12',
                    active ? 'bg-white/15 text-peach-300' : 'bg-peach-100 text-violet-700',
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-semibold sm:text-lg">{name}</span>
                  <span className={cn('mt-1 hidden text-sm sm:block', active ? 'text-white/70' : 'text-ink/50')}>
                    {tagline}
                  </span>
                </span>
              </span>
            </motion.button>
          );
        })}
      </div>

      <motion.ul
        key={category}
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.06 } } }}
        className="mt-8 space-y-3"
      >
        {services.map((s) => {
          const selected = s.id === serviceId;
          return (
            <motion.li
              key={s.id}
              variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <button
                type="button"
                onClick={() => onSelect(s.id)}
                aria-pressed={selected}
                className={cn(
                  'group flex w-full items-center gap-5 rounded-3xl bg-white p-5 text-left transition-all duration-300 sm:p-6',
                  selected ? 'shadow-lift ring-2 ring-violet-500' : 'ring-1 ring-ink/5 hover:shadow-soft hover:ring-violet-200',
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-semibold sm:text-lg">{s.name}</span>
                  <span className="mt-1 block text-sm text-ink/50">{s.description}</span>
                  <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-ink/45">
                    <Clock className="h-3.5 w-3.5" />
                    {formatDuration(s.duration)}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-3">
                  <span className="text-base font-semibold text-violet-800 sm:text-lg">{formatPrice(s.price)}</span>
                  <SelectDot selected={selected} />
                </span>
              </button>
            </motion.li>
          );
        })}
      </motion.ul>
    </div>
  );
}

export function SelectDot({ selected }: { selected: boolean }) {
  return (
    <span
      className={cn(
        'grid h-7 w-7 place-items-center rounded-full transition-colors duration-300',
        selected ? 'bg-violet-600' : 'ring-1 ring-ink/15 group-hover:ring-violet-300',
      )}
    >
      <motion.span initial={false} animate={{ scale: selected ? 1 : 0, opacity: selected ? 1 : 0 }}>
        <Check className="h-4 w-4 text-white" strokeWidth={3} />
      </motion.span>
    </span>
  );
}

export function StepTitle({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="mb-8">
      <h2 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{title}</h2>
      <p className="mt-2 text-ink/50">{hint}</p>
    </div>
  );
}
