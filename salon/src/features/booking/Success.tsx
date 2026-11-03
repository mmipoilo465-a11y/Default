import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CalendarPlus, MapPin, RotateCcw } from 'lucide-react';
import { SALON } from '../../data/mock';
import type { Appointment } from '../../lib/types';
import { fmtDateLong, fmtDuration, fmtPrice, fmtTime, parseISODate } from '../../lib/time';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { servicesOf, staffById } from './draft';

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 46 }, (_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 520,
        y: -(160 + Math.random() * 220),
        r: Math.random() * 540 - 270,
        s: 0.6 + Math.random() * 0.8,
        c: ['bg-accent-600', 'bg-slate-950 dark:bg-white', 'bg-slate-300 dark:bg-slate-600', 'bg-accent-300'][i % 4],
        round: i % 3 === 0,
        delay: Math.random() * 0.12,
      })),
    [],
  );
  return (
    <div className="pointer-events-none absolute left-1/2 top-24 h-0 w-0" aria-hidden>
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className={`absolute block h-2.5 w-1.5 ${p.round ? 'rounded-full' : 'rounded-[2px]'} ${p.c}`}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: p.s }}
          animate={{ x: p.x, y: [0, p.y, p.y + 520], opacity: [1, 1, 0], rotate: p.r }}
          transition={{ duration: 2.2, delay: 0.25 + p.delay, ease: [0.15, 0.6, 0.4, 1], times: [0, 0.35, 1] }}
        />
      ))}
    </div>
  );
}

function downloadIcs(a: Appointment, title: string) {
  const d = parseISODate(a.date);
  const stamp = (min: number) => {
    const x = new Date(d);
    x.setHours(Math.floor(min / 60), min % 60, 0, 0);
    return x.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Atelier//Booking//RU',
    'BEGIN:VEVENT',
    `UID:${a.id}@atelier`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`,
    `DTSTART:${stamp(a.start)}`,
    `DTEND:${stamp(a.start + a.duration)}`,
    `SUMMARY:${title}`,
    `LOCATION:${SALON.address}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'atelier.ics';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function Success({ appointment, onRestart }: { appointment: Appointment; onRestart: () => void }) {
  const staff = staffById(appointment.staffId);
  const services = servicesOf(appointment.serviceIds);
  const title = `Atelier: ${services.map((s) => s.name).join(', ')}`;

  return (
    <div className="relative mx-auto flex max-w-md flex-col items-center px-4 pb-16 pt-10 text-center sm:pt-16">
      <Confetti />
      <motion.div
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        className="relative grid h-24 w-24 place-items-center rounded-full bg-accent-600 text-white shadow-[0_20px_60px_-15px_rgb(9_121_105/0.6)]"
      >
        <motion.span
          className="absolute inset-0 rounded-full border-2 border-accent-600"
          initial={{ scale: 1, opacity: 0.6 }}
          animate={{ scale: 1.6, opacity: 0 }}
          transition={{ duration: 1.4, repeat: 2, ease: 'easeOut' }}
        />
        <svg viewBox="0 0 24 24" className="h-11 w-11" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
          <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.25, duration: 0.45, ease: 'easeOut' }} />
        </svg>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
        <h2 className="mt-8 text-3xl font-semibold tracking-tight">Вы записаны</h2>
        <p className="mt-2 text-[15px] text-slate-500 dark:text-slate-400">Подтверждение придёт в SMS. Напомним за 2 часа до визита.</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-8 w-full rounded-3xl border border-slate-200/80 bg-white p-5 text-left shadow-soft dark:border-slate-800 dark:bg-slate-900/60"
      >
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm text-slate-500">{fmtDateLong(appointment.date)}</p>
            <p className="mt-1 text-[40px] font-semibold leading-none tracking-tight tabular">{fmtTime(appointment.start)}</p>
          </div>
          <p className="text-sm tabular text-slate-400">{fmtDuration(appointment.duration)}</p>
        </div>
        <div className="mt-5 space-y-1.5 border-t border-slate-100 pt-4 text-sm dark:border-slate-800">
          {services.map((s) => (
            <p key={s.id}>{s.name}</p>
          ))}
        </div>
        {staff && (
          <div className="mt-4 flex items-center gap-3">
            <Avatar name={staff.name} tone={staff.tone} size={36} />
            <div className="text-sm">
              <p className="font-medium">{staff.name}</p>
              <p className="text-slate-500">{staff.tags[0]}</p>
            </div>
          </div>
        )}
        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
          <span className="flex items-center gap-1.5 text-[13px] text-slate-500">
            <MapPin size={14} /> {SALON.address.split(', ').slice(1).join(', ')}
          </span>
          <span className="text-lg font-semibold tabular">{fmtPrice(appointment.price)}</span>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="mt-6 grid w-full grid-cols-2 gap-2">
        <Button variant="outline" size="lg" onClick={() => downloadIcs(appointment, title)}>
          <CalendarPlus size={17} /> В календарь
        </Button>
        <Button size="lg" onClick={onRestart}>
          <RotateCcw size={16} /> Новая запись
        </Button>
      </motion.div>
    </div>
  );
}
