import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, MapPin, Star } from 'lucide-react';
import { SALON, STAFF } from '../../data/mock';
import type { Appointment } from '../../lib/types';
import { eligibleStaff, isFree, pickStaffForSlot, staffSlots, totals } from '../../lib/scheduling';
import type { AiSuggestion } from '../../lib/stylist-ai';
import { cn } from '../../lib/cn';
import { StepSkeleton } from '../../components/ui/Skeleton';
import { useStore } from '../../store/AppStore';
import { useToast } from '../../store/Toast';
import { ANY, STEPS, canProceed, candidates, emptyDraft, nextAvailable, servicesOf, staffById, type Draft } from './draft';
import { ServicesStep } from './steps/ServicesStep';
import { StaffStep } from './steps/StaffStep';
import { DateTimeStep } from './steps/DateTimeStep';
import { NotesStep } from './steps/NotesStep';
import { ConfirmStep } from './steps/ConfirmStep';
import { MobileBar, SummaryCard } from './Summary';
import { Success } from './Success';

const SKELETON_MS = 380;

export function BookingWizard() {
  const { appointments, book } = useStore();
  const toast = useToast();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<Appointment | null>(null);
  const top = useRef<HTMLDivElement>(null);

  const current = STEPS[step];
  const duration = servicesOf(draft.serviceIds).reduce((s, x) => s + x.duration, 0);

  const patch = useCallback((p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p })), []);

  /** Ghost loading между шагами */
  const go = useCallback((to: number) => {
    setDir(to > step ? 1 : -1);
    setLoading(true);
    setStep(to);
    const y = (top.current?.getBoundingClientRect().top ?? 0) + window.scrollY - 80;
    if (window.scrollY > y) window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    window.setTimeout(() => setLoading(false), SKELETON_MS);
  }, [step]);

  // Если выбранный слот стал недоступен (длительность изменилась / кто-то занял) — сбрасываем
  useEffect(() => {
    if (draft.start === null) return;
    const ok = candidates(draft).some((s) => isFree(appointments, s, draft.date, draft.start!, duration));
    if (!ok) patch({ start: null });
  }, [appointments, draft, duration, patch]);

  // При входе на шаг «Время» — перейти на ближайший день, где есть окна
  useEffect(() => {
    if (current.id !== 'time' || draft.start !== null) return;
    const group = candidates(draft);
    const hasToday = group.some((s) => staffSlots(appointments, s, draft.date, duration).length > 0);
    if (!hasToday) {
      const n = nextAvailable(appointments, group, duration);
      if (n && n.date !== draft.date) patch({ date: n.date });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current.id]);

  function toggleService(id: string) {
    setDraft((d) => {
      const serviceIds = d.serviceIds.includes(id) ? d.serviceIds.filter((x) => x !== id) : [...d.serviceIds, id];
      const elig = eligibleStaff(STAFF, servicesOf(serviceIds));
      const staffOk = d.staffId === ANY || elig.some((s) => s.id === d.staffId);
      return { ...d, serviceIds, staffId: staffOk ? d.staffId : null };
    });
  }

  function applyAi(s: AiSuggestion) {
    setDraft((d) => ({ ...d, serviceIds: s.services.map((x) => x.id), staffId: s.staff?.id ?? ANY, start: null }));
    toast.show({
      tone: 'success',
      title: 'Подборка применена',
      description: `${s.services.length} ${s.services.length === 1 ? 'услуга' : 'услуги'}${s.staff ? ` · мастер ${s.staff.name.split(' ')[0]}` : ''}`,
    });
    window.setTimeout(() => go(2), 450);
  }

  async function submit() {
    if (draft.start === null || !draft.staffId) return;
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 900));
    const services = servicesOf(draft.serviceIds);
    const t = totals(services, draft.start);
    const staff = draft.staffId === ANY ? pickStaffForSlot(appointments, candidates(draft), draft.date, draft.start, t.duration) : staffById(draft.staffId);
    if (!staff || !isFree(appointments, staff, draft.date, draft.start, t.duration)) {
      setSubmitting(false);
      toast.show({ title: 'Это время только что заняли', description: 'Выберите, пожалуйста, другое окно.' });
      patch({ start: null });
      go(2);
      return;
    }
    const appt = book({
      staffId: staff.id,
      serviceIds: draft.serviceIds,
      date: draft.date,
      start: draft.start,
      duration: t.duration,
      price: t.total,
      discount: t.discount,
      note: draft.note,
      tags: draft.tags,
      clientName: draft.name,
      clientPhone: draft.phone,
    });
    setSubmitting(false);
    setDone(appt);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function restart() {
    setDraft(emptyDraft());
    setDone(null);
    setStep(0);
  }

  const isLast = step === STEPS.length - 1;
  const nav = {
    canNext: canProceed(current.id, draft),
    isFirst: step === 0,
    isLast,
    submitting,
    onBack: () => go(step - 1),
    onNext: () => (isLast ? submit() : go(step + 1)),
    nextLabel: isLast ? 'Записаться' : current.id === 'notes' && !draft.note && !draft.tags.length ? 'Пропустить' : 'Далее',
  };

  if (done) return <Success appointment={done} onRestart={restart} />;

  return (
    <div className="mx-auto max-w-6xl overflow-x-clip px-4 pb-40 pt-6 sm:px-6 lg:pb-16 lg:pt-10">
      {/* Hero */}
      <div className="mb-8 lg:mb-10">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-slate-500">
          <span className="inline-flex items-center gap-1">
            <Star size={13} className="fill-current text-slate-900 dark:text-white" /> 4.97 · 1 657 отзывов
          </span>
          <span className="inline-flex items-center gap-1">
            <MapPin size={13} /> {SALON.address.split(', ').slice(1, 2)}
          </span>
        </div>
        <h1 className="mt-2 text-[34px] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-5xl">
          Запись онлайн
          <span className="text-slate-300 dark:text-slate-600"> — 30 секунд.</span>
        </h1>
      </div>

      {/* Progress */}
      <div ref={top} className="mb-8">
        <div className="flex items-center gap-1.5 sm:gap-2">
          {STEPS.map((s, i) => {
            const reached = i <= step;
            const clickable = i < step;
            return (
              <button
                key={s.id}
                onClick={() => clickable && go(i)}
                disabled={!clickable}
                className={cn('group flex flex-1 flex-col gap-2 text-left', clickable && 'cursor-pointer')}
                aria-current={i === step ? 'step' : undefined}
              >
                <span className="relative h-1 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <motion.span
                    className="absolute inset-y-0 left-0 rounded-full bg-slate-950 dark:bg-white"
                    initial={false}
                    animate={{ width: reached ? '100%' : '0%' }}
                    transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
                  />
                </span>
                <span
                  className={cn(
                    'hidden items-center gap-1.5 text-[13px] font-medium transition-colors sm:flex',
                    i === step ? 'text-slate-950 dark:text-white' : reached ? 'text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white' : 'text-slate-300 dark:text-slate-600',
                  )}
                >
                  {i < step ? <Check size={13} strokeWidth={2.5} /> : <span className="tabular">{i + 1}</span>}
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-[13px] text-slate-400 sm:hidden">
          Шаг {step + 1} из {STEPS.length} · {current.label}
        </p>
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <motion.div
              key={loading ? 'skeleton' : current.id}
              custom={dir}
              initial={{ opacity: 0, x: dir * 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -24 }}
              transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            >
              {loading ? (
                <StepSkeleton />
              ) : (
                <>
                  <div className="mb-6">
                    <h2 className="text-2xl font-semibold tracking-tight">{current.title}</h2>
                    <p className="mt-1 text-[15px] text-slate-500 dark:text-slate-400">{current.subtitle}</p>
                  </div>
                  {current.id === 'services' && <ServicesStep draft={draft} onToggle={toggleService} onApplyAi={applyAi} />}
                  {current.id === 'staff' && (
                    <StaffStep
                      draft={draft}
                      onSelect={(id) => {
                        patch({ staffId: id });
                        window.setTimeout(() => go(step + 1), 260);
                      }}
                    />
                  )}
                  {current.id === 'time' && <DateTimeStep draft={draft} onDate={(date) => patch({ date, start: null })} onSlot={(start) => patch({ start })} />}
                  {current.id === 'notes' && (
                    <NotesStep
                      draft={draft}
                      onNote={(note) => patch({ note })}
                      onToggleTag={(tag) => setDraft((d) => ({ ...d, tags: d.tags.includes(tag) ? d.tags.filter((x) => x !== tag) : [...d.tags, tag] }))}
                    />
                  )}
                  {current.id === 'confirm' && <ConfirmStep draft={draft} onName={(name) => patch({ name })} onPhone={(phone) => patch({ phone })} />}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <SummaryCard draft={draft} nav={nav} />
          </div>
        </aside>
      </div>

      <MobileBar draft={draft} nav={nav} />
    </div>
  );
}
