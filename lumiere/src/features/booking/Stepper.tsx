import { motion } from 'framer-motion';
import { CalendarDays, Check, Phone, Sparkles, UserRound } from 'lucide-react';
import { cn } from '../../lib/cn';

export const STEPS = [
  { title: 'Услуга', icon: Sparkles },
  { title: 'Мастер', icon: UserRound },
  { title: 'Дата и время', icon: CalendarDays },
  { title: 'Контакты', icon: Phone },
];

interface StepperProps {
  step: number;
  /** Можно ли перейти на шаг i (все предыдущие заполнены). */
  canJump: (i: number) => boolean;
  onJump: (i: number) => void;
}

export function Stepper({ step, canJump, onJump }: StepperProps) {
  return (
    <nav aria-label="Шаги записи" className="relative">
      <div className="absolute left-5 right-5 top-5 h-px bg-ink/10 sm:left-6 sm:right-6 sm:top-6" />
      <motion.div
        className="absolute left-5 right-5 top-5 h-px origin-left bg-violet-500 sm:left-6 sm:right-6 sm:top-6"
        initial={false}
        animate={{ scaleX: step / (STEPS.length - 1) }}
        transition={{ type: 'spring', stiffness: 120, damping: 22 }}
      />
      <ol className="relative flex justify-between">
        {STEPS.map(({ title, icon: Icon }, i) => {
          const done = i < step;
          const active = i === step;
          const clickable = !active && canJump(i);
          return (
            <li key={title} className="flex flex-col items-center">
              <button
                type="button"
                disabled={!clickable}
                onClick={() => onJump(i)}
                aria-current={active ? 'step' : undefined}
                className="group flex flex-col items-center gap-3 disabled:cursor-default"
              >
                <motion.span
                  initial={false}
                  animate={{ scale: active ? 1.08 : 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 24 }}
                  className={cn(
                    'relative grid h-10 w-10 place-items-center rounded-full transition-colors duration-300 sm:h-12 sm:w-12',
                    active && 'bg-violet-600 text-white shadow-glow',
                    done && 'bg-peach-300 text-violet-900',
                    !active && !done && 'bg-white text-ink/35 ring-1 ring-ink/10',
                    clickable && 'group-hover:ring-2 group-hover:ring-violet-300',
                  )}
                >
                  {done ? <Check className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2.5} /> : <Icon className="h-4 w-4 sm:h-5 sm:w-5" />}
                </motion.span>
                <span
                  className={cn(
                    'hidden text-xs font-semibold transition-colors sm:block',
                    active ? 'text-violet-700' : done ? 'text-ink/70' : 'text-ink/35',
                  )}
                >
                  {title}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
