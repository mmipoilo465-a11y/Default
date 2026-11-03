import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Clock, Flame } from 'lucide-react';
import { CATEGORIES, SERVICES, STAFF } from '../../../data/mock';
import type { CategoryId, Service } from '../../../lib/types';
import { eligibleStaff } from '../../../lib/scheduling';
import { fmtDuration, fmtPrice } from '../../../lib/time';
import { cn } from '../../../lib/cn';
import { Segmented } from '../../../components/ui/Segmented';
import { AiStylist } from '../AiStylist';
import { servicesOf, type Draft } from '../draft';
import type { AiSuggestion } from '../../../lib/stylist-ai';

export function ServicesStep({ draft, onToggle, onApplyAi }: { draft: Draft; onToggle: (id: string) => void; onApplyAi: (s: AiSuggestion) => void }) {
  const firstSelected = servicesOf(draft.serviceIds)[0];
  const [cat, setCat] = useState<CategoryId>(firstSelected?.category ?? 'hair');
  const selected = servicesOf(draft.serviceIds);
  const list = SERVICES.filter((s) => s.category === cat);

  const compatible = (s: Service) => draft.serviceIds.includes(s.id) || eligibleStaff(STAFF, [...selected, s]).length > 0;

  return (
    <div className="space-y-5">
      <AiStylist onApply={onApplyAi} />

      <div className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <Segmented
          value={cat}
          onChange={setCat}
          className="min-w-full sm:min-w-0"
          options={CATEGORIES.map((c) => {
            const n = selected.filter((s) => s.category === c.id).length;
            return {
              value: c.id,
              label: (
                <>
                  {c.short}
                  {n > 0 && <span className="grid h-4 min-w-4 place-items-center rounded-full bg-accent-600 px-1 text-[10px] font-semibold text-white">{n}</span>}
                </>
              ),
            };
          })}
        />
      </div>

      <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-400">{CATEGORIES.find((c) => c.id === cat)?.name}</p>

      <motion.ul key={cat} initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.035 } } }} className="space-y-2.5">
        {list.map((s) => {
          const on = draft.serviceIds.includes(s.id);
          const ok = compatible(s);
          return (
            <motion.li key={s.id} variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}>
              <motion.button
                whileTap={ok ? { scale: 0.985 } : undefined}
                onClick={() => ok && onToggle(s.id)}
                aria-pressed={on}
                aria-disabled={!ok}
                className={cn(
                  'group flex w-full items-start gap-3.5 rounded-2xl border p-4 text-left transition-all duration-200',
                  on
                    ? 'border-slate-950 bg-slate-50/80 shadow-soft dark:border-white/80 dark:bg-slate-900'
                    : 'border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50 dark:border-slate-800 dark:hover:border-slate-700 dark:hover:bg-slate-900/40',
                  !ok && 'cursor-not-allowed opacity-45 hover:border-slate-200/80 hover:bg-transparent',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-all duration-200',
                    on ? 'border-transparent bg-slate-950 text-white dark:bg-white dark:text-slate-950' : 'border-slate-300 dark:border-slate-600',
                  )}
                >
                  <motion.span initial={false} animate={{ scale: on ? 1 : 0 }} transition={{ type: 'spring', stiffness: 600, damping: 25 }}>
                    <Check size={12} strokeWidth={3} />
                  </motion.span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-[15px] font-medium tracking-tight">{s.name}</span>
                    {s.popular && (
                      <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-accent-700 dark:text-accent-300">
                        <Flame size={11} /> Хит
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block text-[13px] leading-snug text-slate-500 dark:text-slate-400">{s.description}</span>
                  <span className="mt-2 inline-flex items-center gap-1 text-xs text-slate-400">
                    <Clock size={12} /> {fmtDuration(s.duration)}
                    {!ok && <span className="ml-2 text-slate-500">· отдельной записью</span>}
                  </span>
                </span>
                <span className="shrink-0 text-[17px] font-semibold tracking-tight tabular">{fmtPrice(s.price)}</span>
              </motion.button>
            </motion.li>
          );
        })}
      </motion.ul>
    </div>
  );
}
