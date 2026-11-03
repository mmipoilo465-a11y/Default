import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { CalendarPlus, CalendarDays, Clock, MapPin, Plus, Sparkles } from 'lucide-react';
import { SALON, masterById, serviceById } from '../../data/catalog';
import type { Appointment } from '../../lib/types';
import { formatPrice, hhmm, longDate } from '../../lib/time';
import { Avatar, Button, Eyebrow } from '../../components/ui';

export function Success({ appointment, onNew }: { appointment: Appointment; onNew: () => void }) {
  const service = serviceById(appointment.serviceId)!;
  const master = masterById(appointment.masterId)!;
  const end = appointment.start + appointment.duration;
  const code = appointment.id.slice(-6).toUpperCase();

  return (
    <div className="mx-auto max-w-xl text-center">
      <AnimatedCheck />

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5 }}>
        <Eyebrow className="mt-8">Запись подтверждена · № {code}</Eyebrow>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          До встречи, <span className="italic text-violet-600">{appointment.client.name.trim().split(' ')[0]}</span>
        </h1>
        <p className="mt-3 text-ink/50">Мы отправили детали на {appointment.client.phone}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mt-10 overflow-hidden rounded-[32px] bg-white text-left shadow-lift ring-1 ring-ink/5"
      >
        <div className="flex items-center gap-4 bg-gradient-to-br from-violet-600 to-violet-800 p-6 text-white sm:p-7">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15">
            <Sparkles className="h-5 w-5 text-peach-300" />
          </span>
          <div className="flex-1">
            <p className="text-lg font-semibold">{service.name}</p>
            <p className="text-sm text-white/65">{service.description}</p>
          </div>
        </div>
        <dl className="divide-y divide-ink/5 px-6 sm:px-7">
          <Line icon={<Avatar master={master} size={36} />} label="Мастер" value={master.name} />
          <Line icon={<IconBox><CalendarDays className="h-4 w-4" /></IconBox>} label="Дата" value={longDate(appointment.date)} />
          <Line icon={<IconBox><Clock className="h-4 w-4" /></IconBox>} label="Время" value={`${hhmm(appointment.start)} — ${hhmm(end)}`} />
          <Line icon={<IconBox><MapPin className="h-4 w-4" /></IconBox>} label="Адрес" value={SALON.address} />
        </dl>
        <div className="flex items-center justify-between bg-peach-50 px-6 py-5 sm:px-7">
          <span className="text-sm text-ink/55">К оплате в салоне</span>
          <span className="font-display text-2xl font-semibold text-violet-800">{formatPrice(appointment.price)}</span>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"
      >
        <Button variant="secondary" size="lg" onClick={() => downloadIcs(appointment)}>
          <CalendarPlus className="h-4 w-4" />В календарь
        </Button>
        <Button size="lg" onClick={onNew}>
          <Plus className="h-4 w-4" />
          Новая запись
        </Button>
      </motion.div>
    </div>
  );
}

function AnimatedCheck() {
  return (
    <motion.div
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 18 }}
      className="relative mx-auto grid h-24 w-24 place-items-center"
    >
      <motion.span
        className="absolute inset-0 rounded-full bg-peach-300"
        initial={{ scale: 1, opacity: 0.6 }}
        animate={{ scale: 1.7, opacity: 0 }}
        transition={{ duration: 1.4, delay: 0.3, ease: 'easeOut' }}
      />
      <span className="absolute inset-0 rounded-full bg-violet-600 shadow-glow" />
      <svg viewBox="0 0 24 24" className="relative h-11 w-11" fill="none">
        <motion.path
          d="M5 12.5l4.5 4.5L19 7.5"
          stroke="#FFC498"
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, delay: 0.25, ease: 'easeOut' }}
        />
      </svg>
    </motion.div>
  );
}

function IconBox({ children }: { children: ReactNode }) {
  return <span className="grid h-9 w-9 place-items-center rounded-full bg-violet-50 text-violet-600">{children}</span>;
}

function Line({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-4 py-4">
      {icon}
      <dt className="sr-only">{label}</dt>
      <dd className="flex-1">
        <p className="text-xs text-ink/40">{label}</p>
        <p className="font-semibold">{value}</p>
      </dd>
    </div>
  );
}

/** Скачивает .ics-файл, чтобы добавить визит в календарь телефона. */
function downloadIcs(a: Appointment) {
  const service = serviceById(a.serviceId)!;
  const master = masterById(a.masterId)!;
  const stamp = (min: number) => `${a.date.replace(/-/g, '')}T${hhmm(min).replace(':', '')}00`;
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Lumiere//Booking//RU',
    'BEGIN:VEVENT',
    `UID:${a.id}@lumiere`,
    `DTSTART:${stamp(a.start)}`,
    `DTEND:${stamp(a.start + a.duration)}`,
    `SUMMARY:${service.name} — ${SALON.name}`,
    `DESCRIPTION:Мастер: ${master.name}`,
    `LOCATION:${SALON.address}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'lumiere-zapis.ics';
  link.click();
  URL.revokeObjectURL(url);
}
