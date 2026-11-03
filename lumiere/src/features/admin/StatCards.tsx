import { motion } from 'framer-motion';
import { CalendarCheck2, Gauge, Hourglass, Wallet, type LucideIcon } from 'lucide-react';
import { MASTERS } from '../../data/catalog';
import type { Appointment } from '../../lib/types';
import { appointmentsOn, dayLoad, isUpcoming } from '../../lib/schedule';
import { formatPrice, toKey } from '../../lib/time';
import { cn } from '../../lib/cn';

export function StatCards({ appointments, now }: { appointments: Appointment[]; now: Date }) {
  const today = toKey(now);
  const todays = appointmentsOn(appointments, today);
  const load = dayLoad(appointments, MASTERS, today, now);
  const upcoming = appointments.filter((a) => isUpcoming(a, now));
  const online = upcoming.filter((a) => a.source === 'online').length;

  const cards: { label: string; value: string; hint: string; icon: LucideIcon; accent?: boolean }[] = [
    { label: 'Записей сегодня', value: String(todays.length), hint: `${todays.filter((a) => isUpcoming(a, now)).length} ещё впереди`, icon: CalendarCheck2, accent: true },
    { label: 'Выручка за день', value: formatPrice(todays.reduce((s, a) => s + a.price, 0)), hint: 'по подтверждённым записям', icon: Wallet },
    { label: 'Загрузка сегодня', value: `${load.total ? Math.round((load.busy / load.total) * 100) : 0}%`, hint: `${load.free} свободных окон по 30 мин`, icon: Gauge },
    { label: 'Предстоящих', value: String(upcoming.length), hint: online ? `${online} новых онлайн` : 'на 7 дней вперёд', icon: Hourglass },
  ];

  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
      {cards.map(({ label, value, hint, icon: Icon, accent }, i) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            'rounded-[28px] p-5 sm:p-7',
            accent ? 'bg-gradient-to-br from-violet-600 to-violet-800 text-white shadow-glow' : 'bg-white shadow-soft ring-1 ring-ink/5',
          )}
        >
          <span
            className={cn(
              'grid h-10 w-10 place-items-center rounded-2xl',
              accent ? 'bg-white/15 text-peach-300' : 'bg-peach-100 text-violet-700',
            )}
          >
            <Icon className="h-5 w-5" />
          </span>
          <p className={cn('mt-6 text-xs font-medium sm:text-sm', accent ? 'text-white/70' : 'text-ink/50')}>{label}</p>
          <p className="mt-1 font-display text-3xl font-semibold tracking-tight sm:text-4xl">{value}</p>
          <p className={cn('mt-2 text-xs', accent ? 'text-white/60' : 'text-ink/40')}>{hint}</p>
        </motion.div>
      ))}
    </section>
  );
}
