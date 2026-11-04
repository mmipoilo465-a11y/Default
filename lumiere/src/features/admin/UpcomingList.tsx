import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronRight, Inbox, Search } from 'lucide-react';
import { MASTERS, masterById, serviceById } from '../../data/catalog';
import type { Appointment } from '../../lib/types';
import { isUpcoming } from '../../lib/schedule';
import { formatPrice, hhmm, relativeDay } from '../../lib/time';
import { Avatar } from '../../components/ui';
import { cn } from '../../lib/cn';

/** Сколько записей дня показывать до раскрытия. */
const PREVIEW = 5;
/** Сколько ближайших дней показывать до кнопки «Показать все дни». */
const DAYS_PREVIEW = 3;

interface Props {
  appointments: Appointment[];
  now: Date;
  onOpen: (a: Appointment) => void;
}

export function UpcomingList({ appointments, now, onOpen }: Props) {
  const [query, setQuery] = useState('');
  const [masterId, setMasterId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [allDays, setAllDays] = useState(false);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const digits = q.replace(/\D/g, '');
    const list = appointments
      .filter((a) => isUpcoming(a, now))
      .filter((a) => !masterId || a.masterId === masterId)
      .filter(
        (a) =>
          !q ||
          a.client.name.toLowerCase().includes(q) ||
          (digits.length > 0 && a.client.phone.replace(/\D/g, '').includes(digits)) ||
          (serviceById(a.serviceId)?.name.toLowerCase().includes(q) ?? false),
      )
      .sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start);

    const byDay = new Map<string, Appointment[]>();
    for (const a of list) byDay.set(a.date, [...(byDay.get(a.date) ?? []), a]);
    return [...byDay.entries()];
  }, [appointments, now, query, masterId]);

  const total = groups.reduce((s, [, list]) => s + list.length, 0);
  // Без поиска и фильтра показываем ближайшие дни, остальные — по кнопке.
  const filtered = Boolean(query.trim() || masterId);
  const visibleGroups = allDays || filtered ? groups : groups.slice(0, DAYS_PREVIEW);

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="font-display text-3xl font-semibold tracking-tight">Все предстоящие записи</h2>
          <p className="mt-1 text-sm text-ink/50">{total} записей · нажмите, чтобы открыть детали</p>
        </div>
        <label className="flex h-12 items-center gap-3 rounded-full bg-white px-5 ring-1 ring-ink/10 transition focus-within:ring-2 focus-within:ring-violet-400 sm:w-72">
          <Search className="h-4 w-4 text-ink/35" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Клиент, телефон, услуга"
            className="w-full bg-transparent text-sm outline-none placeholder:text-ink/35"
          />
        </label>
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:flex-wrap sm:px-0">
        {[{ id: null, name: 'Все мастера' }, ...MASTERS].map((m) => {
          const active = masterId === m.id;
          return (
            <button
              key={m.id ?? 'all'}
              onClick={() => setMasterId(m.id)}
              className={cn(
                'relative h-10 shrink-0 rounded-full px-4 text-sm font-medium transition-colors',
                active ? 'text-white' : 'bg-white text-ink/60 ring-1 ring-ink/10 hover:text-violet-700',
              )}
            >
              {active && (
                <motion.span layoutId="master-filter" className="absolute inset-0 rounded-full bg-ink" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />
              )}
              <span className="relative">{m.id ? m.name.split(' ')[0] : m.name}</span>
            </button>
          );
        })}
      </div>

      {groups.length === 0 ? (
        <div className="flex flex-col items-center rounded-[32px] bg-white py-16 text-center ring-1 ring-ink/5">
          <Inbox className="h-8 w-8 text-violet-300" />
          <p className="mt-4 font-semibold">Ничего не найдено</p>
          <p className="mt-1 text-sm text-ink/50">Измените фильтр или поисковый запрос</p>
        </div>
      ) : (
        <div className="space-y-10">
          {visibleGroups.map(([date, list]) => (
            <div key={date}>
              <h3 className="mb-3 flex items-baseline gap-3 px-1">
                <span className="font-semibold">{relativeDay(date, now)}</span>
                <span className="text-sm text-ink/40">
                  {list.length} · {formatPrice(list.reduce((s, a) => s + a.price, 0))}
                </span>
              </h3>
              <ul className="overflow-hidden rounded-[28px] bg-white shadow-soft ring-1 ring-ink/5">
                <AnimatePresence initial={false}>
                  {(expanded.has(date) || query ? list : list.slice(0, PREVIEW)).map((a) => (
                    <AppointmentRow key={a.id} appointment={a} onOpen={onOpen} />
                  ))}
                </AnimatePresence>
                {list.length > PREVIEW && !query && (
                  <li>
                    <button
                      type="button"
                      onClick={() =>
                        setExpanded((set) => {
                          const next = new Set(set);
                          if (next.has(date)) next.delete(date);
                          else next.add(date);
                          return next;
                        })
                      }
                      className="flex w-full items-center justify-center gap-2 py-4 text-sm font-semibold text-violet-700 transition-colors hover:bg-violet-50/50"
                    >
                      {expanded.has(date) ? 'Свернуть' : `Показать все ${list.length}`}
                      <ChevronDown className={cn('h-4 w-4 transition-transform duration-300', expanded.has(date) && 'rotate-180')} />
                    </button>
                  </li>
                )}
              </ul>
            </div>
          ))}
          {visibleGroups.length < groups.length && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => setAllDays(true)}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-violet-700 shadow-soft ring-1 ring-ink/5 transition hover:ring-violet-300"
              >
                Показать все дни · ещё {groups.length - visibleGroups.length}
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export function AppointmentRow({ appointment: a, onOpen }: { appointment: Appointment; onOpen: (a: Appointment) => void }) {
  const service = serviceById(a.serviceId);
  const master = masterById(a.masterId);
  return (
    <motion.li
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="border-b border-ink/5 last:border-0"
    >
      <button
        type="button"
        onClick={() => onOpen(a)}
        className="group flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-violet-50/50 sm:gap-6 sm:px-7"
      >
        <span className="w-14 shrink-0">
          <span className="block text-lg font-semibold tabular-nums">{hhmm(a.start)}</span>
          <span className="block text-xs tabular-nums text-ink/40">{hhmm(a.start + a.duration)}</span>
        </span>
        <span className="h-10 w-px shrink-0 bg-ink/10" />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate font-semibold">{a.client.name}</span>
            {a.source === 'online' && (
              <span className="shrink-0 rounded-full bg-peach-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-peach-600">
                онлайн
              </span>
            )}
          </span>
          <span className="mt-0.5 block truncate text-sm text-ink/50">{service?.name}</span>
        </span>
        {master && (
          <span className="hidden items-center gap-2.5 md:flex md:w-44">
            <Avatar master={master} size={28} />
            <span className="truncate text-sm text-ink/60">{master.name}</span>
          </span>
        )}
        <span className="hidden w-24 text-right text-sm font-semibold text-violet-800 sm:block">{formatPrice(a.price)}</span>
        <ChevronRight className="h-4 w-4 shrink-0 text-ink/25 transition group-hover:translate-x-0.5 group-hover:text-violet-500" />
      </button>
    </motion.li>
  );
}
