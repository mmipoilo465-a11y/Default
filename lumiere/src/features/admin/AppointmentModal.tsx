import { useEffect, useState, type ReactNode } from 'react';
import { CalendarDays, Clock, MessageSquareText, Phone, Scissors, Trash2 } from 'lucide-react';
import { masterById, serviceById } from '../../data/catalog';
import type { Appointment } from '../../lib/types';
import { formatPrice, hhmm, relativeDay } from '../../lib/time';
import { isUpcoming } from '../../lib/schedule';
import { Modal } from '../../components/Modal';
import { Avatar, Button } from '../../components/ui';

interface Props {
  appointment: Appointment | null;
  now: Date;
  onClose: () => void;
  onCancel: (a: Appointment) => void;
}

export function AppointmentModal({ appointment, now, onClose, onCancel }: Props) {
  const [confirming, setConfirming] = useState(false);
  // держим последнюю запись, чтобы содержимое не пропадало во время анимации закрытия
  const [shown, setShown] = useState<Appointment | null>(appointment);

  useEffect(() => {
    if (appointment) setShown(appointment);
    setConfirming(false);
  }, [appointment]);

  const a = shown;
  const service = a && serviceById(a.serviceId);
  const master = a && masterById(a.masterId);

  return (
    <Modal open={Boolean(appointment)} onClose={onClose} title={a?.client.name ?? ''}>
      {a && service && master && (
        <>
          <dl className="space-y-4">
            <Item icon={<Scissors className="h-4 w-4" />} label="Услуга" value={`${service.name} · ${formatPrice(a.price)}`} />
            <Item icon={<CalendarDays className="h-4 w-4" />} label="Дата" value={relativeDay(a.date, now)} />
            <Item icon={<Clock className="h-4 w-4" />} label="Время" value={`${hhmm(a.start)} — ${hhmm(a.start + a.duration)}`} />
            <Item icon={<Avatar master={master} size={36} />} label="Мастер" value={master.name} bare />
            <Item
              icon={<Phone className="h-4 w-4" />}
              label="Телефон"
              value={
                <a href={`tel:${a.client.phone.replace(/[^\d+]/g, '')}`} className="text-violet-700 hover:underline">
                  {a.client.phone}
                </a>
              }
            />
            {a.client.comment && <Item icon={<MessageSquareText className="h-4 w-4" />} label="Пожелания" value={a.client.comment} />}
          </dl>

          {isUpcoming(a, now) && (
            <div className="mt-8">
              {confirming ? (
                <div className="flex gap-3">
                  <Button variant="secondary" className="flex-1" onClick={() => setConfirming(false)}>
                    Оставить
                  </Button>
                  <Button className="flex-1 !bg-rose-600 !shadow-none hover:!bg-rose-700" onClick={() => onCancel(a)}>
                    Да, отменить
                  </Button>
                </div>
              ) : (
                <Button variant="danger" className="w-full" onClick={() => setConfirming(true)}>
                  <Trash2 className="h-4 w-4" />
                  Отменить запись
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </Modal>
  );
}

function Item({ icon, label, value, bare }: { icon: ReactNode; label: string; value: ReactNode; bare?: boolean }) {
  return (
    <div className="flex items-center gap-4">
      {bare ? icon : <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-violet-50 text-violet-600">{icon}</span>}
      <div className="min-w-0">
        <dt className="text-xs text-ink/40">{label}</dt>
        <dd className="font-semibold">{value}</dd>
      </div>
    </div>
  );
}
