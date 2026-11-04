import { useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ChartColumn, Table2 } from 'lucide-react';
import { CATEGORIES, MASTERS, SERVICES } from '../../data/catalog';
import type { Appointment } from '../../lib/types';
import { appointmentsOn } from '../../lib/schedule';
import { dayNumber, formatPrice, monthShort, relativeDay, toKey, weekdayShort } from '../../lib/time';
import { cn } from '../../lib/cn';

interface Props {
  appointments: Appointment[];
  days: string[];
  now: Date;
}

const sum = (list: Appointment[]) => list.reduce((s, a) => s + a.price, 0);
const ease = [0.22, 1, 0.36, 1] as const;

/**
 * Выручка за 7 дней в четырёх разрезах. Каждый график — одна серия,
 * поэтому один цвет бренда и без легенды: что изображено, говорит заголовок.
 */
export function RevenueCharts({ appointments, days, now }: Props) {
  const week = days.flatMap((d) => appointmentsOn(appointments, d));

  const byDay = days.map((d) => {
    const list = appointmentsOn(appointments, d);
    return { key: d, revenue: sum(list), count: list.length };
  });

  const ranked = <T extends { id: string }>(items: T[], pick: (a: Appointment, item: T) => boolean, label: (item: T) => string) =>
    items
      .map((item) => {
        const list = week.filter((a) => pick(a, item));
        return { id: item.id, label: label(item), value: sum(list), count: list.length };
      })
      .filter((r) => r.value > 0)
      .sort((a, b) => b.value - a.value);

  const byCategory = ranked(CATEGORIES, (a, c) => SERVICES.find((s) => s.id === a.serviceId)?.category === c.id, (c) => c.name);
  const byMaster = ranked(MASTERS, (a, m) => a.masterId === m.id, (m) => m.name);
  const topServices = ranked(SERVICES, (a, s) => a.serviceId === s.id, (s) => s.name).slice(0, 5);

  return (
    <section className="grid gap-5 lg:grid-cols-3">
      <DayRevenueCard className="lg:col-span-2" data={byDay} now={now} />
      <Card title="По направлениям" subtitle="Выручка за 7 дней">
        <RankedBars rows={byCategory} />
      </Card>
      <Card className="lg:col-span-2" title="По мастерам" subtitle="Выручка и число записей за 7 дней">
        <RankedBars rows={byMaster} />
      </Card>
      <Card title="Топ-5 услуг" subtitle="Выручка за 7 дней">
        <RankedBars rows={topServices} />
      </Card>
    </section>
  );
}

function Card({ title, subtitle, action, className, children }: { title: string; subtitle: string; action?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <div className={cn('rounded-[32px] bg-white p-6 shadow-soft ring-1 ring-ink/5 sm:p-8', className)}>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-2xl font-semibold tracking-tight">{title}</h3>
          <p className="mt-1 text-sm text-ink/45">{subtitle}</p>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

// ---------- Выручка по дням: столбцы ----------

interface DayPoint {
  key: string;
  revenue: number;
  count: number;
}

/** Красивая верхняя граница шкалы, делящаяся на 4 ровных шага. */
function niceMax(value: number): number {
  if (value <= 0) return 10_000;
  const raw = value / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((s) => s * mag).find((s) => s >= raw)!;
  return step * 4;
}

const tickLabel = (v: number) => (v === 0 ? '0' : v >= 1000 ? `${(v / 1000).toLocaleString('ru-RU')} тыс` : String(v));

function DayRevenueCard({ data, now, className }: { data: DayPoint[]; now: Date; className?: string }) {
  const [asTable, setAsTable] = useState(false);
  const total = data.reduce((s, d) => s + d.revenue, 0);

  return (
    <Card
      className={className}
      title="Выручка по дням"
      subtitle={`План по подтверждённым записям · всего ${formatPrice(total)}`}
      action={
        <button
          type="button"
          onClick={() => setAsTable((v) => !v)}
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-ink/55 ring-1 ring-ink/10 transition hover:text-violet-700 hover:ring-violet-300"
        >
          {asTable ? <ChartColumn className="h-3.5 w-3.5" /> : <Table2 className="h-3.5 w-3.5" />}
          {asTable ? 'График' : 'Таблица'}
        </button>
      }
    >
      {asTable ? <DayTable data={data} now={now} /> : <DayColumns data={data} now={now} />}
    </Card>
  );
}

function DayColumns({ data, now }: { data: DayPoint[]; now: Date }) {
  const max = niceMax(Math.max(...data.map((d) => d.revenue)));
  const ticks = [0, 1, 2, 3, 4].map((i) => (max / 4) * i);
  const peak = data.reduce((best, d) => (d.revenue > best.revenue ? d : best), data[0]);
  const today = toKey(now);

  return (
    <div className="flex gap-3">
      {/* ось Y */}
      <div className="relative h-56 w-12 shrink-0 text-right text-[11px] tabular-nums text-ink/40">
        {ticks.map((t) => (
          <span key={t} className="absolute right-0 -translate-y-1/2 whitespace-nowrap" style={{ bottom: `${(t / max) * 100}%` }}>
            {tickLabel(t)}
          </span>
        ))}
      </div>

      <div className="min-w-0 flex-1">
        <div className="relative h-56">
          {ticks.map((t) => (
            <div
              key={t}
              className={cn('absolute inset-x-0 h-px', t === 0 ? 'bg-ink/15' : 'bg-ink/[0.06]')}
              style={{ bottom: `${(t / max) * 100}%` }}
            />
          ))}

          <div className="absolute inset-0 grid grid-cols-7">
            {data.map((d, i) => {
              const pct = (d.revenue / max) * 100;
              return (
                <div
                  key={d.key}
                  tabIndex={0}
                  aria-label={`${relativeDay(d.key, now)}: ${formatPrice(d.revenue)}, записей ${d.count}`}
                  className="group relative flex h-full items-end justify-center outline-none"
                >
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${pct}%` }}
                    transition={{ duration: 0.8, delay: i * 0.05, ease }}
                    className="w-1/2 max-w-[24px] rounded-t-[4px] bg-violet-600 transition-colors group-hover:bg-violet-700 group-focus-visible:bg-violet-700"
                  />

                  {/* подпись только у пикового дня — остальные значения в подсказке и таблице */}
                  {d.key === peak.key && d.revenue > 0 && (
                    <span
                      className="pointer-events-none absolute whitespace-nowrap text-[11px] font-semibold tabular-nums text-ink/70 transition-opacity group-hover:opacity-0"
                      style={{ bottom: `calc(${pct}% + 6px)` }}
                    >
                      {tickLabel(d.revenue)}
                    </span>
                  )}

                  <div
                    role="tooltip"
                    className="pointer-events-none absolute z-10 w-max -translate-y-1 rounded-2xl bg-ink px-3.5 py-2.5 text-xs text-white opacity-0 shadow-lift transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100"
                    style={{ bottom: `calc(${pct}% + 10px)` }}
                  >
                    <p className="text-white/60">{relativeDay(d.key, now)}</p>
                    <p className="mt-0.5 text-sm font-semibold tabular-nums">{formatPrice(d.revenue)}</p>
                    <p className="text-white/60">{d.count} записей</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ось X */}
        <div className="mt-3 grid grid-cols-7 text-center">
          {data.map((d) => (
            <div key={d.key} className="leading-tight">
              <p className={cn('text-[11px] font-semibold', d.key === today ? 'text-violet-700' : 'text-ink/55')}>
                {d.key === today ? 'Сег.' : weekdayShort(d.key)}
              </p>
              <p className="text-[11px] text-ink/35">
                {dayNumber(d.key)} {monthShort(d.key)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DayTable({ data, now }: { data: DayPoint[]; now: Date }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-ink/40">
          <th className="pb-3 font-medium">День</th>
          <th className="pb-3 text-right font-medium">Записей</th>
          <th className="pb-3 text-right font-medium">Выручка</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-ink/5">
        {data.map((d) => (
          <tr key={d.key}>
            <td className="py-2.5">{relativeDay(d.key, now)}</td>
            <td className="py-2.5 text-right tabular-nums text-ink/60">{d.count}</td>
            <td className="py-2.5 text-right font-semibold tabular-nums">{formatPrice(d.revenue)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ---------- Ранжированные горизонтальные бары ----------

interface RankedRow {
  id: string;
  label: string;
  value: number;
  count: number;
}

function RankedBars({ rows }: { rows: RankedRow[] }) {
  if (!rows.length) return <p className="text-sm text-ink/40">Пока нет записей</p>;
  const max = rows[0].value;
  return (
    <ul className="space-y-5">
      {rows.map((r, i) => (
        <li key={r.id}>
          <div className="mb-2 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-medium">{r.label}</span>
            <span className="shrink-0 text-xs text-ink/40">{r.count} зап.</span>
          </div>
          <div className="flex items-center gap-3">
            {/* бар занимает максимум 72% ширины — справа остаётся место под значение */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(r.value / max) * 72}%` }}
              transition={{ duration: 0.8, delay: i * 0.06, ease }}
              className="h-2.5 min-w-[4px] rounded-r-[4px] bg-violet-600"
            />
            <span className="whitespace-nowrap text-sm font-semibold tabular-nums">{formatPrice(r.value)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
