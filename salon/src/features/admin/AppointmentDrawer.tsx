import { motion } from 'framer-motion';
import { BellRing, CalendarDays, Coffee, Crown, Heart, Phone, Sparkles, StickyNote } from 'lucide-react';
import { SERVICES, STAFF } from '../../data/mock';
import type { Appointment, AppointmentStatus, Client } from '../../lib/types';
import { fmtDateShort, fmtDuration, fmtPrice, fmtTime, plural } from '../../lib/time';
import { cn } from '../../lib/cn';
import { Modal } from '../../components/ui/Modal';
import { Avatar } from '../../components/ui/Avatar';
import { Badge, STATUS_META, StatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

const FLOW: AppointmentStatus[] = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'];

interface Props {
  appointment: Appointment | null;
  appointments: Appointment[];
  clients: Client[];
  onClose: () => void;
  onStatus: (id: string, s: AppointmentStatus) => void;
  onNotify: (a: Appointment) => void;
}

const ts = (a: Appointment) => `${a.date}T${String(a.start).padStart(4, '0')}`;

export function AppointmentDrawer({ appointment, appointments, clients, onClose, onStatus, onNotify }: Props) {
  // берём «живую» версию записи — статус мог поменяться
  const a = appointment ? appointments.find((x) => x.id === appointment.id) ?? appointment : null;
  const client = a ? clients.find((c) => c.id === a.clientId) : undefined;

  return (
    <Modal open={!!a} onClose={onClose} variant="sheet" title="Карточка записи">
      {a && client && <DrawerBody a={a} client={client} appointments={appointments} onStatus={onStatus} onNotify={onNotify} />}
    </Modal>
  );
}

function DrawerBody({
  a,
  client,
  appointments,
  onStatus,
  onNotify,
}: {
  a: Appointment;
  client: Client;
  appointments: Appointment[];
  onStatus: Props['onStatus'];
  onNotify: Props['onNotify'];
}) {
  const staff = STAFF.find((s) => s.id === a.staffId);
  const services = a.serviceIds.map((id) => SERVICES.find((s) => s.id === id)).filter(Boolean);

  // CRM-аналитика
  const history = appointments.filter((x) => x.clientId === client.id && x.status !== 'cancelled').sort((x, y) => (ts(x) < ts(y) ? 1 : -1));
  const visitNo = history.filter((x) => ts(x) <= ts(a)).length;
  const completed = history.filter((x) => x.status === 'completed');
  const ltv = completed.reduce((s, x) => s + x.price, 0);
  const avg = completed.length ? ltv / completed.length : 0;
  const favStaffId = Object.entries(
    history.reduce<Record<string, number>>((acc, x) => ((acc[x.staffId] = (acc[x.staffId] ?? 0) + 1), acc), {}),
  ).sort((x, y) => y[1] - x[1])[0]?.[0];
  const fav = STAFF.find((s) => s.id === favStaffId);
  const cancels = appointments.filter((x) => x.clientId === client.id && x.status === 'cancelled').length;
  const loyal = visitNo >= 3;
  const past = history.filter((x) => x.id !== a.id && ts(x) < ts(a)).slice(0, 5);
  const prefs = [...new Set([...client.preferences, ...a.tags])];

  return (
    <div className="space-y-6 pt-2">
      {/* Клиент */}
      <div className="flex items-center gap-4">
        <Avatar name={client.name} tone={loyal ? 2 : 0} size={56} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold tracking-tight">{client.name}</p>
          <a href={`tel:${client.phone.replace(/[^\d+]/g, '')}`} className="mt-0.5 inline-flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-slate-900 dark:hover:text-white">
            <Phone size={12} /> {client.phone}
          </a>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {loyal ? (
              <Badge tone="accent" icon={<Crown size={11} />}>
                Лояльный клиент: {visitNo}-й визит
              </Badge>
            ) : visitNo <= 1 ? (
              <Badge tone="solid" icon={<Sparkles size={11} />}>
                Первый визит
              </Badge>
            ) : (
              <Badge tone="neutral">{visitNo}-й визит</Badge>
            )}
            <Badge tone="outline">С нами с {client.since}</Badge>
          </div>
        </div>
      </div>

      {/* Метрики */}
      <div className="grid grid-cols-3 divide-x divide-slate-100 rounded-2xl border border-slate-200/70 py-3 dark:divide-slate-800 dark:border-slate-800">
        {[
          { label: 'Визитов', value: String(completed.length) },
          { label: 'LTV', value: fmtPrice(ltv) },
          { label: 'Ср. чек', value: avg ? fmtPrice(avg) : '—' },
        ].map((m) => (
          <div key={m.label} className="px-3 text-center">
            <p className="text-[17px] font-semibold tracking-tight tabular">{m.value}</p>
            <p className="mt-0.5 text-[11px] text-slate-400">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Предпочтения */}
      {(prefs.length > 0 || fav) && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-400">Предпочтения</p>
          <div className="space-y-1.5">
            {prefs.map((p) => (
              <p key={p} className="flex items-start gap-2 text-sm">
                <Coffee size={14} className="mt-0.5 shrink-0 text-slate-400" /> {p}
              </p>
            ))}
            {fav && (
              <p className="flex items-start gap-2 text-sm">
                <Heart size={14} className="mt-0.5 shrink-0 text-slate-400" /> Любимый мастер — {fav.name}
              </p>
            )}
            {cancels > 0 && (
              <p className="flex items-start gap-2 text-sm text-slate-500">
                <StickyNote size={14} className="mt-0.5 shrink-0 text-slate-400" /> {cancels} {plural(cancels, ['отмена', 'отмены', 'отмен'])} в истории
              </p>
            )}
          </div>
        </div>
      )}

      {/* Запись */}
      <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/70">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-[13px] text-slate-500">
              <CalendarDays size={13} /> {fmtDateShort(a.date)}
            </p>
            <p className="mt-1 text-[28px] font-semibold leading-none tracking-tight tabular">
              {fmtTime(a.start)}
              <span className="text-lg text-slate-400">–{fmtTime(a.start + a.duration)}</span>
            </p>
          </div>
          <StatusBadge status={a.status} />
        </div>
        <div className="mt-4 space-y-1">
          {services.map((s) => (
            <div key={s!.id} className="flex justify-between gap-3 text-sm">
              <span className="truncate">{s!.name}</span>
              <span className="shrink-0 tabular text-slate-500">{fmtDuration(s!.duration)}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-slate-200/70 pt-3 dark:border-slate-800">
          {staff && (
            <span className="flex items-center gap-2 text-sm">
              <Avatar name={staff.name} tone={staff.tone} size={22} /> {staff.name}
            </span>
          )}
          <span className="text-right">
            {a.discount > 0 && <span className="mr-1.5 text-[11px] text-accent-700 dark:text-accent-400">−10% утро</span>}
            <span className="text-[17px] font-semibold tabular">{fmtPrice(a.price)}</span>
          </span>
        </div>
        {a.note && <p className="mt-3 rounded-xl bg-white p-3 text-[13px] italic text-slate-600 dark:bg-slate-950 dark:text-slate-300">«{a.note}»</p>}
      </div>

      {/* Статус */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.08em] text-slate-400">Статус</p>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {FLOW.map((s) => (
            <motion.button
              key={s}
              whileTap={{ scale: 0.95 }}
              onClick={() => s !== a.status && onStatus(a.id, s)}
              className={cn(
                'flex items-center gap-2 whitespace-nowrap rounded-xl border px-3 py-2 text-[13px] font-medium transition',
                s === a.status
                  ? 'border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950'
                  : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700',
              )}
            >
              <span className={cn('h-2 w-2 shrink-0 rounded-full', s === a.status ? 'bg-current' : STATUS_META[s].dot)} />
              {STATUS_META[s].label}
            </motion.button>
          ))}
        </div>
      </div>

      {a.status !== 'cancelled' && a.status !== 'completed' && (
        <Button variant="accent" size="lg" className="w-full" onClick={() => onNotify(a)}>
          <BellRing size={17} /> Уведомить мастера
        </Button>
      )}

      {/* История */}
      {past.length > 0 && (
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.08em] text-slate-400">История визитов</p>
          <ol className="relative space-y-4 border-l border-slate-200 pl-5 dark:border-slate-800">
            {past.map((x) => (
              <li key={x.id} className="relative">
                <span className="absolute -left-[25px] top-1.5 h-2 w-2 rounded-full bg-slate-300 ring-4 ring-white dark:bg-slate-600 dark:ring-slate-950" />
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate text-sm font-medium">{x.serviceIds.map((id) => SERVICES.find((s) => s.id === id)?.name).join(' + ')}</p>
                  <p className="shrink-0 text-[13px] tabular text-slate-500">{fmtPrice(x.price)}</p>
                </div>
                <p className="text-[12px] text-slate-400">
                  {fmtDateShort(x.date)} · {STAFF.find((s) => s.id === x.staffId)?.name.split(' ')[0]}
                </p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
