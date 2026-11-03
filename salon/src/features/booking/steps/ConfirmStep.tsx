import { CalendarDays, Clock, MessageSquareText, Scissors, User } from 'lucide-react';
import { fmtDateLong, fmtDuration, fmtPrice, fmtTime, formatPhoneInput } from '../../../lib/time';
import { totals } from '../../../lib/scheduling';
import { Avatar } from '../../../components/ui/Avatar';
import { ANY, servicesOf, staffById, type Draft } from '../draft';

function Field({ id, label, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; id: string }) {
  return (
    <label htmlFor={id} className="block rounded-2xl border border-slate-200 bg-slate-50/50 px-4 pb-2.5 pt-2 transition focus-within:border-slate-400 focus-within:bg-white dark:border-slate-800 dark:bg-slate-900/40 dark:focus-within:border-slate-600 dark:focus-within:bg-slate-900">
      <span className="block text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400">{label}</span>
      <input id={id} className="mt-0.5 block w-full bg-transparent text-[16px] font-medium outline-none placeholder:font-normal placeholder:text-slate-300 dark:placeholder:text-slate-600" {...rest} />
    </label>
  );
}

function Row({ icon: Icon, children }: { icon: typeof Clock; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <Icon size={16} className="mt-0.5 shrink-0 text-slate-400" />
      <div className="min-w-0 flex-1 text-sm">{children}</div>
    </div>
  );
}

export function ConfirmStep({ draft, onName, onPhone }: { draft: Draft; onName: (v: string) => void; onPhone: (v: string) => void }) {
  const services = servicesOf(draft.serviceIds);
  const t = totals(services, draft.start);
  const staff = draft.staffId === ANY ? null : staffById(draft.staffId);

  return (
    <div className="space-y-6">
      <div className="grid gap-2.5 sm:grid-cols-2">
        <Field id="name" label="Имя" autoComplete="name" placeholder="Как к вам обращаться" value={draft.name} onChange={(e) => onName(e.target.value)} maxLength={40} />
        <Field
          id="phone"
          label="Телефон"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+7 900 000-00-00"
          value={draft.phone}
          onChange={(e) => onPhone(formatPhoneInput(e.target.value))}
        />
      </div>

      <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200/80 px-4 dark:divide-slate-800 dark:border-slate-800">
        <Row icon={Scissors}>
          {services.map((s) => (
            <div key={s.id} className="flex justify-between gap-3 py-0.5">
              <span className="truncate">{s.name}</span>
              <span className="shrink-0 tabular text-slate-500">{fmtPrice(s.price)}</span>
            </div>
          ))}
        </Row>
        <Row icon={User}>
          {staff ? (
            <span className="flex items-center gap-2">
              <Avatar name={staff.name} tone={staff.tone} size={22} /> {staff.name}
            </span>
          ) : (
            <span>Любой свободный мастер <span className="text-slate-400">— назначим при подтверждении</span></span>
          )}
        </Row>
        <Row icon={CalendarDays}>
          {fmtDateLong(draft.date)}, <span className="font-semibold tabular">{draft.start !== null ? fmtTime(draft.start) : '—'}</span>
        </Row>
        <Row icon={Clock}>
          {fmtDuration(t.duration)}
          {draft.start !== null && <span className="text-slate-400"> · до {fmtTime(draft.start + t.duration)}</span>}
        </Row>
        {(draft.tags.length > 0 || draft.note) && (
          <Row icon={MessageSquareText}>
            {draft.tags.length > 0 && <p>{draft.tags.join(' · ')}</p>}
            {draft.note && <p className="mt-1 text-slate-500 dark:text-slate-400">«{draft.note}»</p>}
          </Row>
        )}
      </div>

      <p className="text-xs leading-relaxed text-slate-400">
        Нажимая «Записаться», вы соглашаетесь на обработку персональных данных. Бесплатная отмена — за 12 часов до визита.
      </p>
    </div>
  );
}
