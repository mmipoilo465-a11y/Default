import { useCallback, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Loader2, Star } from 'lucide-react';
import { mastersFor, serviceById } from '../../data/catalog';
import type { Appointment, Category } from '../../lib/types';
import { ANY_MASTER } from '../../lib/types';
import { isFree, leastLoaded } from '../../lib/schedule';
import { formatPrice } from '../../lib/time';
import { useNow } from '../../lib/useNow';
import { useAppStore } from '../../store/AppStore';
import { useToast } from '../../store/Toast';
import { Button, Eyebrow } from '../../components/ui';
import { STEPS, Stepper } from './Stepper';
import { Summary } from './Summary';
import { Success } from './Success';
import { ServiceStep } from './steps/ServiceStep';
import { MasterStep } from './steps/MasterStep';
import { DateTimeStep } from './steps/DateTimeStep';
import { ContactStep } from './steps/ContactStep';
import { emptyContact, emptyDraft, isNameValid, isPhoneValid, type Contact, type Draft } from './draft';

const slide = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 48, filter: 'blur(6px)' }),
  center: { opacity: 1, x: 0, filter: 'blur(0px)' },
  exit: (dir: number) => ({ opacity: 0, x: dir * -48, filter: 'blur(6px)' }),
};

export function BookingPage() {
  const { appointments, addAppointment } = useAppStore();
  const toast = useToast();
  const now = useNow();
  const topRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [contact, setContact] = useState<Contact>(emptyContact);
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [booked, setBooked] = useState<Appointment | null>(null);

  const service = draft.serviceId ? serviceById(draft.serviceId) : undefined;
  const capable = service ? mastersFor(service.category) : [];
  const slotMasters = draft.masterId === ANY_MASTER ? capable : capable.filter((m) => m.id === draft.masterId);

  const completed = [
    Boolean(service),
    Boolean(draft.masterId),
    Boolean(draft.date) && draft.start != null,
    isNameValid(contact.name) && isPhoneValid(contact.phone),
  ];
  const canJump = (i: number) => completed.slice(0, i).every(Boolean);

  const goTo = (i: number) => {
    setDirection(i > step ? 1 : -1);
    setStep(i);
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // --- выбор на шагах; при смене услуги/мастера сбрасываем зависимые поля ---
  const selectCategory = useCallback((category: Category) => setDraft((d) => ({ ...d, category })), []);
  const selectService = useCallback((serviceId: string) => {
    setDraft((d) => {
      const next = serviceById(serviceId)!;
      const masterOk = d.masterId === ANY_MASTER || (d.masterId && mastersFor(next.category).some((m) => m.id === d.masterId));
      return { ...d, serviceId, masterId: masterOk ? d.masterId : null, start: null };
    });
  }, []);
  const selectMaster = useCallback((masterId: string) => setDraft((d) => ({ ...d, masterId, date: null, start: null })), []);
  const selectDate = useCallback((date: string) => setDraft((d) => ({ ...d, date, start: null })), []);
  const selectStart = useCallback((start: number) => setDraft((d) => ({ ...d, start })), []);

  const submit = async () => {
    if (!completed[3]) {
      setShowErrors(true);
      return;
    }
    if (!service || !draft.date || draft.start == null) return;
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 700)); // имитация запроса к серверу

    const free = slotMasters.filter((m) => isFree(appointments, m, draft.date!, draft.start!, service.duration));
    if (!free.length) {
      setSubmitting(false);
      toast('Это время только что заняли — выберите другое', 'error');
      setDraft((d) => ({ ...d, start: null }));
      goTo(2);
      return;
    }

    const master = leastLoaded(appointments, free, draft.date);
    const appointment: Appointment = {
      id: `web-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      serviceId: service.id,
      masterId: master.id,
      date: draft.date,
      start: draft.start,
      duration: service.duration,
      price: service.price,
      client: { name: contact.name.trim(), phone: contact.phone, comment: contact.comment.trim() || undefined },
      status: 'booked',
      source: 'online',
      createdAt: Date.now(),
    };
    addAppointment(appointment);
    setSubmitting(false);
    setBooked(appointment);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const reset = () => {
    setDraft(emptyDraft);
    setContact(emptyContact);
    setShowErrors(false);
    setStep(0);
    setDirection(-1);
    setBooked(null);
  };

  const isLast = step === STEPS.length - 1;
  const nextDisabled = submitting || (!isLast && !completed[step]);

  return (
    <AnimatePresence mode="wait">
      {booked ? (
        <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <Success appointment={booked} onNew={reset} />
        </motion.div>
      ) : (
        <motion.div key="wizard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -12 }}>
          <Hero />

          <div ref={topRef} className="scroll-mt-28" />
          <div className="mt-14 grid gap-10 lg:mt-20 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-14">
            <div className="min-w-0">
              <Stepper step={step} canJump={canJump} onJump={goTo} />

              <div className="relative mt-12 min-h-[420px]">
                <AnimatePresence mode="wait" custom={direction} initial={false}>
                  <motion.div
                    key={step}
                    custom={direction}
                    variants={slide}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {step === 0 && (
                      <ServiceStep
                        category={draft.category}
                        serviceId={draft.serviceId}
                        onCategory={selectCategory}
                        onSelect={selectService}
                      />
                    )}
                    {step === 1 && service && (
                      <MasterStep
                        category={service.category}
                        duration={service.duration}
                        masterId={draft.masterId}
                        appointments={appointments}
                        now={now}
                        onSelect={selectMaster}
                      />
                    )}
                    {step === 2 && service && (
                      <DateTimeStep
                        masters={slotMasters}
                        duration={service.duration}
                        date={draft.date}
                        start={draft.start}
                        appointments={appointments}
                        now={now}
                        onDate={selectDate}
                        onStart={selectStart}
                      />
                    )}
                    {step === 3 && <ContactStep contact={contact} showErrors={showErrors} onChange={setContact} />}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Навигация: прилипает к низу экрана на телефоне */}
              <div className="sticky bottom-[calc(1rem+env(safe-area-inset-bottom))] z-20 mt-10">
                <div className="flex items-center gap-3 rounded-full bg-white/90 p-2 shadow-lift ring-1 ring-ink/5 backdrop-blur-xl">
                  <Button
                    variant="ghost"
                    onClick={() => goTo(step - 1)}
                    disabled={step === 0 || submitting}
                    className="disabled:opacity-0"
                    aria-label="Назад"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Назад</span>
                  </Button>
                  <div className="flex-1 text-center text-sm lg:invisible">
                    {service ? (
                      <span className="font-semibold text-violet-800">{formatPrice(service.price)}</span>
                    ) : (
                      <span className="text-ink/35">
                        Шаг {step + 1} из {STEPS.length}
                      </span>
                    )}
                  </div>
                  <Button onClick={isLast ? submit : () => goTo(step + 1)} disabled={nextDisabled} className="min-w-[148px]">
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isLast ? (
                      'Записаться'
                    ) : (
                      <>
                        Далее
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <aside className="hidden lg:block">
              <div className="sticky top-28">
                <Summary draft={draft} service={service} now={now} />
              </div>
            </aside>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Hero() {
  return (
    <section className="max-w-2xl">
      <Eyebrow>Онлайн-запись · без регистрации</Eyebrow>
      <h1 className="mt-5 font-display text-5xl font-semibold leading-[1.02] tracking-tight text-ink sm:text-7xl">
        Время <span className="italic text-violet-600">для&nbsp;себя</span>
      </h1>
      <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink/55">
        Выберите услугу, мастера и удобное время — запись займёт меньше двух минут.
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-ink/55">
        <span className="inline-flex items-center gap-1.5">
          <Star className="h-4 w-4 fill-peach-400 text-peach-400" />
          <b className="font-semibold text-ink">4.9</b> · 1 200+ отзывов
        </span>
        <span className="hidden h-1 w-1 rounded-full bg-ink/20 sm:block" />
        <span>Ежедневно 10:00 — 20:00</span>
      </div>
    </section>
  );
}
