import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp, ChevronDown, Plus, Sparkles, WandSparkles } from 'lucide-react';
import { SERVICES, STAFF } from '../../data/mock';
import { askStylist, type AiSuggestion } from '../../lib/stylist-ai';
import { fmtDuration, fmtPrice } from '../../lib/time';
import { cn } from '../../lib/cn';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';

const PROMPTS = ['Хочу каре и яркий цвет', 'Маникюр нюд к выходным', 'Образ на свадьбу подруги', 'Мягкий блонд с бликами'];

export function AiStylist({ onApply }: { onApply: (s: AiSuggestion) => void }) {
  const [open, setOpen] = useState(false);
  const [goal, setGoal] = useState('');
  const [asked, setAsked] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiSuggestion | null>(null);

  async function submit(text = goal) {
    const q = text.trim();
    if (!q || loading) return;
    setAsked(q);
    setGoal('');
    setLoading(true);
    setResult(null);
    try {
      setResult(await askStylist(q, SERVICES, STAFF));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-gradient-to-br from-white via-white to-accent-50/60 dark:border-slate-800 dark:from-slate-900/70 dark:via-slate-900/40 dark:to-accent-900/20">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 p-4 text-left" aria-expanded={open}>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
          <WandSparkles size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
            AI-стилист
            <span className="rounded-full bg-accent-600/10 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wider text-accent-700 dark:text-accent-300">beta</span>
          </span>
          <span className="block truncate text-[13px] text-slate-500 dark:text-slate-400">Опишите желаемый результат — подберём услугу и мастера</span>
        </span>
        <ChevronDown size={18} className={cn('shrink-0 text-slate-400 transition-transform duration-300', open && 'rotate-180')} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-3 px-4 pb-4">
              {asked && (
                <div className="flex justify-end">
                  <p className="max-w-[85%] rounded-2xl rounded-br-md bg-slate-950 px-3.5 py-2 text-sm text-white dark:bg-white dark:text-slate-950">{asked}</p>
                </div>
              )}

              {loading && (
                <div className="flex items-center gap-2 text-sm text-slate-500" aria-live="polite">
                  <Sparkles size={15} className="text-accent-600" />
                  <span>Анализирую запрос</span>
                  <span className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="h-1 w-1 rounded-full bg-slate-400"
                        animate={{ opacity: [0.2, 1, 0.2] }}
                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                      />
                    ))}
                  </span>
                </div>
              )}

              {result && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 rounded-2xl rounded-bl-md border border-slate-200/70 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-950/60">
                  <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{result.message}</p>
                  {result.services.length > 0 && (
                    <div className="space-y-1.5">
                      {result.services.map((s) => (
                        <div key={s.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm dark:bg-slate-900">
                          <span className="truncate font-medium">{s.name}</span>
                          <span className="shrink-0 tabular text-slate-500">
                            {fmtDuration(s.duration)} · {fmtPrice(s.price)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-3">
                    {result.staff ? (
                      <span className="flex min-w-0 items-center gap-2 text-[13px] text-slate-500">
                        <Avatar name={result.staff.name} tone={result.staff.tone} size={24} />
                        <span className="truncate">{result.staff.name}</span>
                      </span>
                    ) : (
                      <span />
                    )}
                    {result.services.length > 0 && (
                      <Button size="sm" variant="accent" onClick={() => onApply(result)}>
                        <Plus size={14} /> Применить
                      </Button>
                    )}
                  </div>
                </motion.div>
              )}

              {!asked && (
                <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
                  {PROMPTS.map((p) => (
                    <button
                      key={p}
                      onClick={() => submit(p)}
                      className="shrink-0 rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-[13px] text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:text-white"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submit();
                }}
                className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 pl-3.5 transition focus-within:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:focus-within:border-slate-500"
              >
                <input
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="Например: хочу каре и яркий цвет"
                  className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-slate-400 sm:text-sm"
                  maxLength={160}
                />
                <button
                  type="submit"
                  disabled={!goal.trim() || loading}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-slate-950 text-white transition disabled:opacity-30 dark:bg-white dark:text-slate-950"
                  aria-label="Спросить"
                >
                  <ArrowUp size={16} />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
