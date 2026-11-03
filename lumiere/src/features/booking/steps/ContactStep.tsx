import { useId, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageSquareText, Phone, UserRound } from 'lucide-react';
import { cn } from '../../../lib/cn';
import { formatPhone, isNameValid, isPhoneValid, type Contact } from '../draft';
import { StepTitle } from './ServiceStep';

interface Props {
  contact: Contact;
  showErrors: boolean;
  onChange: (c: Contact) => void;
}

export function ContactStep({ contact, showErrors, onChange }: Props) {
  const [touched, setTouched] = useState({ name: false, phone: false });
  const nameError = (touched.name || showErrors) && !isNameValid(contact.name) ? 'Укажите имя' : null;
  const phoneError = (touched.phone || showErrors) && !isPhoneValid(contact.phone) ? 'Нужен номер из 11 цифр' : null;

  return (
    <div>
      <StepTitle title="Контактные данные" hint="Регистрация не нужна — пришлём подтверждение по SMS" />
      <div className="space-y-5">
        <Field label="Имя" icon={<UserRound className="h-4 w-4" />} error={nameError}>
          {(id) => (
            <input
              id={id}
              autoComplete="name"
              placeholder="Как к вам обращаться"
              value={contact.name}
              onChange={(e) => onChange({ ...contact, name: e.target.value })}
              onBlur={() => setTouched((t) => ({ ...t, name: true }))}
              className="w-full bg-transparent outline-none placeholder:text-ink/30"
            />
          )}
        </Field>
        <Field label="Телефон" icon={<Phone className="h-4 w-4" />} error={phoneError}>
          {(id) => (
            <input
              id={id}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+7 (999) 123-45-67"
              value={contact.phone}
              onChange={(e) => onChange({ ...contact, phone: formatPhone(e.target.value) })}
              onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
              className="w-full bg-transparent tabular-nums outline-none placeholder:text-ink/30"
            />
          )}
        </Field>
        <Field label="Пожелания" optional icon={<MessageSquareText className="h-4 w-4" />}>
          {(id) => (
            <textarea
              id={id}
              rows={3}
              placeholder="Например: длинные волосы, хочу сохранить длину"
              value={contact.comment}
              onChange={(e) => onChange({ ...contact, comment: e.target.value })}
              className="w-full resize-none bg-transparent outline-none placeholder:text-ink/30"
            />
          )}
        </Field>
        <p className="text-xs leading-relaxed text-ink/40">
          Нажимая «Записаться», вы соглашаетесь на обработку персональных данных. Бесплатная отмена — за 3 часа до визита.
        </p>
      </div>
    </div>
  );
}

interface FieldProps {
  label: string;
  icon: ReactNode;
  optional?: boolean;
  error?: string | null;
  children: (id: string) => ReactNode;
}

function Field({ label, icon, optional, error, children }: FieldProps) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-2 flex items-baseline justify-between text-sm font-semibold text-ink/70">
        {label}
        {optional && <span className="text-xs font-normal text-ink/35">необязательно</span>}
      </label>
      <motion.div
        animate={error ? { x: [0, -6, 6, -3, 3, 0] } : { x: 0 }}
        transition={{ duration: 0.4 }}
        className={cn(
          'flex gap-3 rounded-2xl bg-white px-5 py-4 ring-1 transition-shadow duration-200 focus-within:ring-2',
          error ? 'ring-rose-300 focus-within:ring-rose-400' : 'ring-ink/10 focus-within:ring-violet-400',
        )}
      >
        <span className="mt-0.5 text-violet-400">{icon}</span>
        {children(id)}
      </motion.div>
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-1.5 pl-1 text-xs font-medium text-rose-500"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
