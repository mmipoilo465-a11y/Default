import { AnimatePresence, motion } from 'framer-motion';
import { MASTERS, serviceById } from '../../data/catalog';
import type { Appointment } from '../../lib/types';
import { isFree, worksOn } from '../../lib/schedule';
import { CLOSE, OPEN, STEP, formatDuration, hhmm, minutesOf, relativeDay, toKey } from '../../lib/time';
import { Avatar } from '../../components/ui';
import { cn } from '../../lib/cn';

const SPAN = CLOSE - OPEN;
const CELLS = Array.from({ length: SPAN / STEP }, (_, i) => OPEN + i * STEP);
const HOURS = Array.from({ length: SPAN / 60 }, (_, i) => OPEN + i * 60);
const pct = (min: number) => `${((min - OPEN) / SPAN) * 100}%`;

interface Props {
  date: string;
  appointments: Appointment[];
  now: Date;
  onOpen: (a: Appointment) => void;
}

export function ScheduleBoard({ date, appointments, now, onOpen }: Props) {
  const today = toKey(now);
  const nowMin = minutesOf(now);
  const isPast = (t: number) => date < today || (date === today && t + STEP <= nowMin);
  const showNow = date === today && nowMin > OPEN && nowMin < CLOSE;

  return (
    <div className="overflow-hidden rounded-[32px] bg-white shadow-soft ring-1 ring-ink/5">
      <div className="flex flex-col gap-4 border-b border-ink/5 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p className="font-semibold">{relativeDay(date, now)}</p>
        <Legend />
      </div>

      <div className="overflow-x-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={date}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="min-w-[880px] px-4 pb-6 pt-4 sm:min-w-[920px] sm:px-6"
          >
            {/* шкала часов */}
            <div className="flex">
              <div className="w-40 shrink-0 sm:w-52" />
              <div className="relative h-6 flex-1">
                {HOURS.map((h) => (
                  <span key={h} className="absolute -translate-x-1/2 text-[11px] font-medium tabular-nums text-ink/35" style={{ left: pct(h) }}>
                    {hhmm(h)}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              {MASTERS.map((m) => {
                const working = worksOn(m, date);
                const booked = appointments
                  .filter((a) => a.status === 'booked' && a.masterId === m.id && a.date === date)
                  .sort((a, b) => a.start - b.start);
                const freeCells = working ? CELLS.filter((t) => isFree(appointments, m, date, t, STEP, now)).length : 0;
                const dayOver = CELLS.every(isPast);
                const status = !working
                  ? 'выходной'
                  : freeCells
                    ? `свободно ${formatDuration(freeCells * STEP)}`
                    : dayOver
                      ? 'смена завершена'
                      : 'всё занято';

                return (
                  <div key={m.id} className="flex items-center">
                    <div className="sticky left-0 z-20 flex w-40 shrink-0 items-center gap-3 self-stretch bg-white pr-3 sm:w-52 sm:pr-4">
                      <Avatar master={m} size={36} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{m.name}</p>
                        <p className="text-xs text-ink/40">{status}</p>
                      </div>
                    </div>

                    <div className="relative h-14 flex-1">
                      {working ? (
                        <div className="absolute inset-0 grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${CELLS.length}, minmax(0, 1fr))` }}>
                          {CELLS.map((t) => (
                            <div
                              key={t}
                              title={isPast(t) ? undefined : `Свободно ${hhmm(t)}`}
                              className={cn(
                                'rounded-lg',
                                isPast(t) ? 'bg-hatch bg-ink/[0.02]' : 'bg-peach-50 ring-1 ring-inset ring-peach-200/70',
                              )}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="bg-hatch absolute inset-0 grid place-items-center rounded-xl text-xs font-medium text-ink/35">
                          Выходной
                        </div>
                      )}

                      {booked.map((a, i) => {
                        const service = serviceById(a.serviceId);
                        const past = isPast(a.start + a.duration - STEP);
                        const compact = a.duration <= STEP;
                        const initials = a.client.name.split(' ').map((w) => w[0]).join('');
                        return (
                          <motion.button
                            key={a.id}
                            type="button"
                            onClick={() => onOpen(a)}
                            initial={{ opacity: 0, scaleX: 0.85 }}
                            animate={{ opacity: 1, scaleX: 1 }}
                            transition={{ delay: i * 0.03, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                            whileHover={{ y: -2 }}
                            style={{ left: pct(a.start), width: `calc(${(a.duration / SPAN) * 100}% - 3px)` }}
                            title={`${hhmm(a.start)} · ${a.client.name} · ${service?.name ?? ''}`}
                            className={cn(
                              'absolute inset-y-0 origin-left overflow-hidden rounded-lg text-white transition-shadow hover:shadow-glow',
                              compact ? 'grid place-items-center' : 'px-2.5 text-left',
                              past ? 'bg-violet-300' : 'bg-violet-600',
                              a.source === 'online' && 'ring-2 ring-inset ring-peach-300',
                            )}
                          >
                            {compact ? (
                              <span className="text-[11px] font-semibold">{initials}</span>
                            ) : (
                              <>
                                <span className="block truncate text-[11px] font-semibold tabular-nums text-white/75">{hhmm(a.start)}</span>
                                <span className="block truncate text-xs font-semibold">{a.client.name}</span>
                              </>
                            )}
                            <span className="sr-only">{service?.name}</span>
                          </motion.button>
                        );
                      })}

                      {showNow && (
                        <div className="pointer-events-none absolute -inset-y-1 z-10 w-px bg-peach-500" style={{ left: pct(nowMin) }}>
                          <span className="absolute -left-[3px] -top-1 h-[7px] w-[7px] rounded-full bg-peach-500" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function Legend() {
  const items = [
    { label: 'Свободно', cls: 'bg-peach-50 ring-1 ring-inset ring-peach-200' },
    { label: 'Занято', cls: 'bg-violet-600' },
    { label: 'Онлайн-запись', cls: 'bg-violet-600 ring-2 ring-inset ring-peach-300' },
    { label: 'Прошло / выходной', cls: 'bg-hatch ring-1 ring-inset ring-ink/10' },
  ];
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink/55">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-2">
          <span className={cn('h-3.5 w-3.5 rounded', i.cls)} />
          {i.label}
        </li>
      ))}
    </ul>
  );
}
