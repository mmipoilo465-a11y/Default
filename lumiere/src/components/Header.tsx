import { motion } from 'framer-motion';
import { CalendarHeart, LayoutDashboard } from 'lucide-react';
import type { Mode } from '../lib/types';
import { cn } from '../lib/cn';

const MODES: { id: Mode; label: string; short: string; icon: typeof CalendarHeart }[] = [
  { id: 'client', label: 'Онлайн-запись', short: 'Запись', icon: CalendarHeart },
  { id: 'admin', label: 'Руководитель', short: 'Админ', icon: LayoutDashboard },
];

export function Logo() {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-violet-600 shadow-glow">
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
          <path d="M12 2c.8 4.6 3.4 7.2 8 8-4.6.8-7.2 3.4-8 8-.8-4.6-3.4-7.2-8-8 4.6-.8 7.2-3.4 8-8z" fill="#FFC498" />
        </svg>
      </span>
      <div className="leading-none">
        <p className="font-display text-[26px] font-semibold tracking-tight text-violet-900">Lumière</p>
        <p className="mt-1 hidden whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.28em] text-ink/40 sm:block">beauty atelier</p>
      </div>
    </div>
  );
}

export function Header({ mode, onModeChange }: { mode: Mode; onModeChange: (m: Mode) => void }) {
  return (
    <header className="sticky top-0 z-30 border-b border-ink/5 bg-cream/80 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-4 px-4 sm:px-8">
        <Logo />
        <div role="tablist" aria-label="Режим" className="flex rounded-full bg-white p-1 shadow-soft ring-1 ring-ink/5">
          {MODES.map(({ id, label, short, icon: Icon }) => {
            const active = mode === id;
            return (
              <button
                key={id}
                role="tab"
                aria-selected={active}
                onClick={() => onModeChange(id)}
                className={cn(
                  'relative flex h-10 items-center gap-2 rounded-full px-3.5 text-sm font-semibold transition-colors sm:px-5',
                  active ? 'text-white' : 'text-ink/55 hover:text-violet-700',
                )}
              >
                {active && (
                  <motion.span
                    layoutId="mode-pill"
                    className="absolute inset-0 rounded-full bg-violet-600"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
                <Icon className="relative h-4 w-4" />
                <span className="relative hidden sm:inline">{label}</span>
                <span className="relative sm:hidden">{short}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
