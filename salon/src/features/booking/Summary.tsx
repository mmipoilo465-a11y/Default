import { useEffect } from 'react';
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { ArrowLeft, ArrowRight, Clock, Sunrise } from 'lucide-react';
import { totals } from '../../lib/scheduling';
import { fmtDateShort, fmtDuration, fmtPrice, fmtTime, relativeDayLabel } from '../../lib/time';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { ANY, servicesOf, staffById, type Draft } from './draft';

/** Плавно «докручивающееся» число */
export function AnimatedPrice({ value, className }: { value: number; className?: string }) {
  const mv = useMotionValue(value);
  const text = useTransform(mv, (v) => fmtPrice(v));
  useEffect(() => {
    const c = animate(mv, value, { duration: 0.5, ease: [0.32, 0.72, 0, 1] });
    return c.stop;
  }, [mv, value]);
  return <motion.span className={className}>{text}</motion.span>;
}

interface NavProps {
  canNext: boolean;
  isFirst: boolean;
  isLast: boolean;
  submitting: boolean;
  onNext: () => void;
  onBack: () => void;
  nextLabel: string;
}

export function SummaryCard({ draft, nav }: { draft: Draft; nav: NavProps }) {
  const services = servicesOf(draft.serviceIds);
  const t = totals(services, draft.start);
  const staff = draft.staffId === ANY ? null : staffById(draft.staffId);

  return (
    <Card className="p-5">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-400">Ваш визит</p>

      <div className="mt-4 min-h-[64px] space-y-2">
        <AnimatePresence initial={false}>
          {services.length === 0 && (
            <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm text-slate-400">
              Выберите хотя бы одну услугу
            </motion.p>
          )}
          {services.map((s) => (
            <motion.div
              key={s.id}
              layout
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              className="flex items-baseline justify-between gap-3 text-sm"
            >
              <span className="truncate">{s.name}</span>
              <span className="shrink-0 tabular text-slate-500">{fmtPrice(s.price)}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {(draft.staffId || draft.start !== null) && (
        <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm dark:border-slate-800">
          {draft.staffId && (
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              {staff ? <Avatar name={staff.name} tone={staff.tone} size={20} /> : <span className="h-5 w-5 rounded-full bg-gradient-to-br from-accent-500 to-accent-700" />}
              {staff?.name ?? 'Любой мастер'}
            </div>
          )}
          {draft.start !== null && (
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <Clock size={16} className="text-slate-400" />
              {relativeDayLabel(draft.date) ?? fmtDateShort(draft.date)}, {fmtTime(draft.start)}–{fmtTime(draft.start + t.duration)}
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {t.discount > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="mt-4 flex items-center justify-between rounded-xl bg-accent-50 px-3 py-2 text-[13px] text-accent-700 dark:bg-accent-500/10 dark:text-accent-300">
              <span className="flex items-center gap-1.5">
                <Sunrise size={14} /> Утренний вайб −10%
              </span>
              <span className="tabular font-medium">−{fmtPrice(t.discount)}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-5 flex items-end justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
        <div>
          <p className="text-xs text-slate-400">Итого · {t.duration ? fmtDuration(t.duration) : '0 мин'}</p>
          {t.discount > 0 && <p className="text-sm tabular text-slate-400 line-through">{fmtPrice(t.base)}</p>}
        </div>
        <AnimatedPrice value={t.total} className="text-[28px] font-semibold leading-none tracking-tight tabular" />
      </div>

      <div className="mt-5 flex gap-2">
        {!nav.isFirst && (
          <Button variant="secondary" size="lg" className="px-4" onClick={nav.onBack} aria-label="Назад">
            <ArrowLeft size={18} />
          </Button>
        )}
        <Button size="lg" className="flex-1" variant={nav.isLast ? 'accent' : 'primary'} disabled={!nav.canNext} loading={nav.submitting} onClick={nav.onNext}>
          {nav.nextLabel}
          {!nav.isLast && !nav.submitting && <ArrowRight size={18} />}
        </Button>
      </div>
    </Card>
  );
}

/** Нижняя панель на мобильных — как в нативных приложениях */
export function MobileBar({ draft, nav }: { draft: Draft; nav: NavProps }) {
  const services = servicesOf(draft.serviceIds);
  const t = totals(services, draft.start);
  return (
    <div className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/70 bg-white/85 px-4 pt-3 backdrop-blur-xl lg:hidden dark:border-slate-800 dark:bg-slate-950/85">
      <div className="mx-auto flex max-w-xl items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <AnimatedPrice value={t.total} className="text-xl font-semibold tracking-tight tabular" />
            {t.discount > 0 && <span className="text-xs tabular text-slate-400 line-through">{fmtPrice(t.base)}</span>}
          </div>
          <p className="truncate text-xs text-slate-500">
            {services.length ? `${services.length} усл. · ${fmtDuration(t.duration)}` : 'Услуги не выбраны'}
            {draft.start !== null && ` · ${fmtTime(draft.start)}`}
          </p>
        </div>
        {!nav.isFirst && (
          <Button variant="secondary" size="lg" className="w-12 px-0" onClick={nav.onBack} aria-label="Назад">
            <ArrowLeft size={18} />
          </Button>
        )}
        <Button size="lg" variant={nav.isLast ? 'accent' : 'primary'} disabled={!nav.canNext} loading={nav.submitting} onClick={nav.onNext}>
          {nav.nextLabel}
        </Button>
      </div>
    </div>
  );
}
