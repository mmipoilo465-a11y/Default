import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, Clock, MapPin, Shuffle } from 'lucide-react';
import { SALON, masterById } from '../../data/catalog';
import type { Service } from '../../lib/types';
import { ANY_MASTER } from '../../lib/types';
import { formatDuration, formatPrice, hhmm, relativeDay } from '../../lib/time';
import { Avatar, Eyebrow } from '../../components/ui';
import type { Draft } from './draft';

export function Summary({ draft, service, now }: { draft: Draft; service?: Service; now: Date }) {
  const master = draft.masterId && draft.masterId !== ANY_MASTER ? masterById(draft.masterId) : undefined;

  return (
    <div className="rounded-[32px] bg-white p-7 shadow-soft ring-1 ring-ink/5">
      <Eyebrow>Ваша запись</Eyebrow>

      <dl className="mt-6 space-y-5">
        <Row label="Услуга" value={service?.name}>
          {service && (
            <span className="mt-1 flex items-center gap-1.5 text-xs text-ink/45">
              <Clock className="h-3.5 w-3.5" />
              {formatDuration(service.duration)}
            </span>
          )}
        </Row>

        <Row
          label="Мастер"
          value={master?.name ?? (draft.masterId === ANY_MASTER ? 'Любой свободный' : undefined)}
          leading={
            master ? (
              <Avatar master={master} size={32} />
            ) : draft.masterId === ANY_MASTER ? (
              <span className="grid h-8 w-8 place-items-center rounded-full bg-peach-100 text-violet-700">
                <Shuffle className="h-4 w-4" />
              </span>
            ) : undefined
          }
        />

        <Row
          label="Когда"
          value={draft.date && draft.start != null ? `${relativeDay(draft.date, now)}, ${hhmm(draft.start)}` : undefined}
          leading={
            draft.date && draft.start != null ? (
              <span className="grid h-8 w-8 place-items-center rounded-full bg-violet-50 text-violet-600">
                <CalendarDays className="h-4 w-4" />
              </span>
            ) : undefined
          }
        />
      </dl>

      <div className="my-6 h-px bg-ink/5" />

      <div className="flex items-end justify-between">
        <span className="text-sm text-ink/50">Итого</span>
        <AnimatePresence mode="popLayout">
          <motion.span
            key={service?.price ?? 0}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="font-display text-3xl font-semibold text-violet-800"
          >
            {service ? formatPrice(service.price) : '—'}
          </motion.span>
        </AnimatePresence>
      </div>

      <p className="mt-6 flex items-start gap-2 rounded-2xl bg-peach-50 p-4 text-xs leading-relaxed text-ink/60">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-peach-500" />
        {SALON.address}. Ежедневно с 10:00 до 20:00. Оплата в салоне.
      </p>
    </div>
  );
}

function Row({ label, value, leading, children }: { label: string; value?: string; leading?: ReactNode; children?: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-ink/40">{label}</dt>
      <dd className="mt-1.5">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={value ?? 'empty'}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 6 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-3"
          >
            {leading}
            <div>
              <p className={value ? 'font-semibold' : 'text-ink/25'}>{value ?? 'Не выбрано'}</p>
              {children}
            </div>
          </motion.div>
        </AnimatePresence>
      </dd>
    </div>
  );
}
