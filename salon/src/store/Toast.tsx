import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Loader2, Info, X } from 'lucide-react';
import { cn } from '../lib/cn';

export type ToastTone = 'loading' | 'success' | 'info';
export interface ToastInput {
  title: string;
  description?: string;
  tone?: ToastTone;
  /** мс; 0 — не закрывать автоматически */
  duration?: number;
}
interface ToastItem extends Required<Omit<ToastInput, 'description'>> {
  id: number;
  description?: string;
}

interface ToastApi {
  show: (t: ToastInput) => number;
  update: (id: number, t: ToastInput) => void;
  dismiss: (id: number) => void;
}

const Ctx = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<number, number>());
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => {
    window.clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setItems((xs) => xs.filter((x) => x.id !== id));
  }, []);

  const schedule = useCallback(
    (id: number, duration: number) => {
      window.clearTimeout(timers.current.get(id));
      if (duration > 0) timers.current.set(id, window.setTimeout(() => dismiss(id), duration));
    },
    [dismiss],
  );

  const show = useCallback(
    (t: ToastInput) => {
      const id = ++seq.current;
      const item: ToastItem = { id, title: t.title, description: t.description, tone: t.tone ?? 'info', duration: t.duration ?? 4200 };
      setItems((xs) => [...xs.slice(-3), item]);
      schedule(id, item.tone === 'loading' ? 0 : item.duration);
      return id;
    },
    [schedule],
  );

  const update = useCallback(
    (id: number, t: ToastInput) => {
      const tone = t.tone ?? 'info';
      setItems((xs) => xs.map((x) => (x.id === id ? { ...x, title: t.title, description: t.description, tone, duration: t.duration ?? 4200 } : x)));
      schedule(id, tone === 'loading' ? 0 : t.duration ?? 4200);
    },
    [schedule],
  );

  return (
    <Ctx.Provider value={{ show, update, dismiss }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex flex-col items-center gap-2 px-4 pt-[max(env(safe-area-inset-top),1rem)] sm:bottom-6 sm:left-auto sm:right-6 sm:top-auto sm:items-end sm:pt-0"
      >
        <AnimatePresence initial={false}>
          {items.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: -16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-slate-200/70 bg-white/90 p-3.5 pr-2 shadow-lift backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90"
            >
              <span
                className={cn(
                  'mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full',
                  t.tone === 'success' && 'bg-accent-600 text-white',
                  t.tone === 'loading' && 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
                  t.tone === 'info' && 'bg-slate-900 text-white dark:bg-white dark:text-slate-900',
                )}
              >
                {t.tone === 'success' ? <Check size={15} strokeWidth={2.5} /> : t.tone === 'loading' ? <Loader2 size={15} className="animate-spin" /> : <Info size={15} />}
              </span>
              <div className="min-w-0 flex-1 py-0.5">
                <p className="text-sm font-medium leading-snug">{t.title}</p>
                {t.description && <p className="mt-0.5 text-[13px] leading-snug text-slate-500 dark:text-slate-400">{t.description}</p>}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Закрыть"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
