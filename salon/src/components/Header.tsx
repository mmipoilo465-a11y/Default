import { motion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { SALON } from '../data/mock';
import { useTheme } from '../store/Theme';
import { cn } from '../lib/cn';

export type Route = 'booking' | 'admin';

export function Header({ route, onRoute }: { route: Route; onRoute: (r: Route) => void }) {
  const { theme, toggle } = useTheme();
  const tabs: Array<{ id: Route; label: string }> = [
    { id: 'booking', label: 'Запись' },
    { id: 'admin', label: 'Панель' },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/60 bg-white/75 pt-[env(safe-area-inset-top)] backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-950/75">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between gap-3 px-4 sm:px-6">
        <a href="#/" onClick={() => onRoute('booking')} className="flex items-center gap-2.5">
          <span className="relative grid h-8 w-8 place-items-center rounded-[10px] bg-slate-950 text-[15px] font-bold text-white dark:bg-white dark:text-slate-950">
            A<span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-accent-600 ring-2 ring-white dark:ring-slate-950" />
          </span>
          <span className="leading-none">
            <span className="block text-[15px] font-semibold tracking-tight">{SALON.name}</span>
            <span className="hidden text-[11px] text-slate-400 sm:block">{SALON.tagline}</span>
          </span>
        </a>

        <nav className="flex items-center rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
          {tabs.map((t) => (
            <a
              key={t.id}
              href={t.id === 'admin' ? '#/admin' : '#/'}
              className={cn(
                'relative rounded-[10px] px-3.5 py-1.5 text-[13px] font-medium transition-colors',
                route === t.id ? 'text-slate-950 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200',
              )}
            >
              {route === t.id && (
                <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-[10px] bg-white shadow-sm dark:bg-slate-800" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />
              )}
              <span className="relative">{t.label}</span>
            </a>
          ))}
        </nav>

        <button
          onClick={toggle}
          className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
          aria-label={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
        >
          <motion.span key={theme} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} transition={{ duration: 0.3 }}>
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </motion.span>
        </button>
      </div>
    </header>
  );
}
