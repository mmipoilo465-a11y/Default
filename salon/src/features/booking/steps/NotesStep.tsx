import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { NOTE_TAGS } from '../../../data/mock';
import { cn } from '../../../lib/cn';
import type { Draft } from '../draft';

const MAX = 300;

export function NotesStep({ draft, onToggleTag, onNote }: { draft: Draft; onToggleTag: (label: string) => void; onNote: (v: string) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.08em] text-slate-400">Быстрые пожелания</p>
        <div className="flex flex-wrap gap-2">
          {NOTE_TAGS.map((t) => {
            const on = draft.tags.includes(t.label);
            return (
              <motion.button
                key={t.id}
                whileTap={{ scale: 0.94 }}
                onClick={() => onToggleTag(t.label)}
                aria-pressed={on}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-medium transition-all duration-200',
                  on
                    ? 'border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950'
                    : 'border-slate-200 text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:text-slate-300 dark:hover:border-slate-700',
                )}
              >
                <motion.span initial={false} animate={{ width: on ? 14 : 0, opacity: on ? 1 : 0 }} className="inline-flex overflow-hidden">
                  <Check size={14} strokeWidth={2.5} />
                </motion.span>
                {t.label}
                {t.hint && <span className={cn('font-normal', on ? 'opacity-60' : 'text-slate-400')}>— {t.hint}</span>}
              </motion.button>
            );
          })}
        </div>
      </div>

      <div>
        <label htmlFor="note" className="mb-3 block text-xs font-medium uppercase tracking-[0.08em] text-slate-400">
          Комментарий для мастера
        </label>
        <div className="group relative rounded-2xl border border-slate-200 bg-slate-50/50 transition focus-within:border-slate-400 focus-within:bg-white dark:border-slate-800 dark:bg-slate-900/40 dark:focus-within:border-slate-600 dark:focus-within:bg-slate-900">
          <textarea
            id="note"
            value={draft.note}
            onChange={(e) => onNote(e.target.value.slice(0, MAX))}
            rows={5}
            placeholder="Например: приложу референс в мессенджер, хочу сохранить длину, чувствительная кожа головы…"
            className="block w-full resize-none bg-transparent p-4 text-[16px] leading-relaxed outline-none placeholder:text-slate-400 sm:text-sm"
          />
          <span className={cn('absolute bottom-3 right-4 text-[11px] tabular', draft.note.length > MAX * 0.9 ? 'text-accent-600' : 'text-slate-400')}>
            {draft.note.length}/{MAX}
          </span>
        </div>
        <p className="mt-2 text-xs text-slate-400">Необязательно. Мастер увидит комментарий в карточке записи.</p>
      </div>
    </div>
  );
}
