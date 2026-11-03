import { motion } from 'framer-motion';
import { Check, Sparkles, Star } from 'lucide-react';
import { STAFF } from '../../../data/mock';
import { eligibleStaff } from '../../../lib/scheduling';
import { fmtTime, relativeDayLabel, fmtDateShort } from '../../../lib/time';
import { cn } from '../../../lib/cn';
import { Avatar } from '../../../components/ui/Avatar';
import { Badge } from '../../../components/ui/Badge';
import { useStore } from '../../../store/AppStore';
import { ANY, nextAvailable, servicesOf, type Draft } from '../draft';

function windowLabel(n: { date: string; start: number } | null) {
  if (!n) return 'Нет окон в ближайшие 3 недели';
  return `${relativeDayLabel(n.date) ?? fmtDateShort(n.date)}, ${fmtTime(n.start)}`;
}

function Option({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <motion.button
      variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        'relative flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-200',
        on
          ? 'border-slate-950 bg-slate-50/80 shadow-soft dark:border-white/80 dark:bg-slate-900'
          : 'border-slate-200/80 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700',
      )}
    >
      {children}
      <span
        className={cn(
          'grid h-6 w-6 shrink-0 place-items-center rounded-full transition-all',
          on ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950' : 'border border-slate-300 text-transparent dark:border-slate-600',
        )}
      >
        <Check size={13} strokeWidth={3} />
      </span>
    </motion.button>
  );
}

export function StaffStep({ draft, onSelect }: { draft: Draft; onSelect: (id: string) => void }) {
  const { appointments } = useStore();
  const services = servicesOf(draft.serviceIds);
  const duration = services.reduce((s, x) => s + x.duration, 0);
  const list = eligibleStaff(STAFF, services);
  const anyNext = nextAvailable(appointments, list, duration);

  return (
    <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.05 } } }} className="space-y-2.5">
      <Option on={draft.staffId === ANY} onClick={() => onSelect(ANY)}>
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-accent-500 to-accent-700 text-white">
          <Sparkles size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold tracking-tight">Любой мастер</span>
          <span className="mt-0.5 block text-[13px] text-slate-500 dark:text-slate-400">Назначим первого свободного — больше окон и ближайшее время</span>
          <span className="mt-2 inline-flex">
            <Badge tone="accent">Ближайшее: {windowLabel(anyNext)}</Badge>
          </span>
        </span>
      </Option>

      <p className="px-1 pt-3 text-xs font-medium uppercase tracking-[0.08em] text-slate-400">
        {list.length} {list.length === 1 ? 'мастер' : list.length < 5 ? 'мастера' : 'мастеров'} для выбранных услуг
      </p>

      {list.map((s) => {
        const n = nextAvailable(appointments, [s], duration);
        return (
          <Option key={s.id} on={draft.staffId === s.id} onClick={() => onSelect(s.id)}>
            <Avatar name={s.name} tone={s.tone} size={48} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="truncate text-[15px] font-semibold tracking-tight">{s.name}</span>
                <span className="inline-flex shrink-0 items-center gap-0.5 text-xs font-medium tabular text-slate-600 dark:text-slate-300">
                  <Star size={11} className="fill-current" /> {s.rating.toFixed(2)}
                  <span className="font-normal text-slate-400">({s.reviews})</span>
                </span>
              </span>
              <span className="mt-0.5 block text-[13px] text-slate-500 dark:text-slate-400">{s.role}</span>
              <span className="mt-2 flex flex-wrap gap-1.5">
                {s.tags.map((t, i) => (
                  <Badge key={t} tone={i === 0 ? 'solid' : 'neutral'}>
                    {t}
                  </Badge>
                ))}
                <Badge tone="outline">{windowLabel(n)}</Badge>
              </span>
            </span>
          </Option>
        );
      })}
    </motion.div>
  );
}
