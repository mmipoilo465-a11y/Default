import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';
import { ArrowLeft, Eye, EyeOff, KeyRound, Loader2, LockKeyhole } from 'lucide-react';
import { Button, Eyebrow } from '../../components/ui';
import { LOCK_MS, MAX_ATTEMPTS, canVerify, lockedUntil, setLock, verifyPassword } from '../../lib/auth';
import { cn } from '../../lib/cn';

interface Props {
  onSuccess: (remember: boolean) => void;
  onBack: () => void;
}

export function AdminLogin({ onSuccess, onBack }: Props) {
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [remember, setRemember] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failures, setFailures] = useState(0);
  const [lockEnd, setLockEnd] = useState(lockedUntil);
  const [now, setNow] = useState(Date.now());
  const input = useRef<HTMLInputElement>(null);
  const shake = useAnimationControls();

  const locked = lockEnd > now;
  const secondsLeft = Math.ceil((lockEnd - now) / 1000);

  useEffect(() => {
    input.current?.focus();
  }, []);

  // Тикаем раз в секунду, пока идёт блокировка.
  useEffect(() => {
    if (!locked) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [locked]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (locked || checking || !password) return;
    if (!canVerify()) {
      setError('Вход доступен только по защищённому адресу (https)');
      return;
    }
    setChecking(true);
    setError(null);
    const ok = await verifyPassword(password);
    setChecking(false);

    if (ok) {
      setLock(0);
      onSuccess(remember);
      return;
    }

    const count = failures + 1;
    setPassword('');
    shake.start({ x: [0, -10, 10, -6, 6, 0], transition: { duration: 0.45 } });
    if (count >= MAX_ATTEMPTS) {
      const until = Date.now() + LOCK_MS;
      setLock(until);
      setLockEnd(until);
      setNow(Date.now());
      setFailures(0);
      setError(null);
    } else {
      setFailures(count);
      setError(`Неверный пароль. Осталось попыток: ${MAX_ATTEMPTS - count}`);
      input.current?.focus();
    }
  };

  return (
    <div className="mx-auto max-w-md pt-4 sm:pt-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-[36px] bg-white p-7 shadow-lift ring-1 ring-ink/5 sm:p-10"
      >
        <motion.span
          initial={{ scale: 0.6, rotate: -12 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.1 }}
          className="grid h-14 w-14 place-items-center rounded-2xl bg-violet-600 text-peach-300 shadow-glow"
        >
          <LockKeyhole className="h-6 w-6" />
        </motion.span>

        <Eyebrow className="mt-8">Только для сотрудников</Eyebrow>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight">Вход в панель</h1>
        <p className="mt-2 text-sm text-ink/50">Введите пароль руководителя, чтобы увидеть записи и расписание.</p>

        <form onSubmit={submit} className="mt-8 space-y-5">
          <motion.div animate={shake}>
            <label htmlFor="admin-password" className="sr-only">
              Пароль
            </label>
            <div
              className={cn(
                'flex items-center gap-3 rounded-2xl bg-cream px-5 ring-1 transition-shadow focus-within:ring-2',
                error ? 'ring-rose-300 focus-within:ring-rose-400' : 'ring-ink/10 focus-within:ring-violet-400',
                locked && 'opacity-50',
              )}
            >
              <KeyRound className="h-4 w-4 shrink-0 text-violet-400" />
              <input
                ref={input}
                id="admin-password"
                type={visible ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Пароль"
                value={password}
                disabled={locked}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                className="h-14 w-full bg-transparent outline-none placeholder:text-ink/30"
              />
              <button
                type="button"
                onClick={() => setVisible((v) => !v)}
                aria-label={visible ? 'Скрыть пароль' : 'Показать пароль'}
                className="text-ink/35 transition hover:text-violet-600"
              >
                {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </motion.div>

          <AnimatePresence mode="wait">
            {(error || locked) && (
              <motion.p
                key={locked ? 'lock' : error}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                role="alert"
                className="-mt-2 pl-1 text-xs font-medium text-rose-500"
              >
                {locked ? `Слишком много попыток. Повторите через ${secondsLeft} с` : error}
              </motion.p>
            )}
          </AnimatePresence>

          <label className="flex cursor-pointer select-none items-center gap-3 text-sm text-ink/60">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded accent-violet-600"
            />
            Запомнить на этом устройстве (30 дней)
          </label>

          <Button type="submit" size="lg" className="w-full" disabled={locked || checking || !password}>
            {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Войти'}
          </Button>
        </form>
      </motion.div>

      <div className="mt-6 text-center">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Вернуться к записи
        </Button>
      </div>
    </div>
  );
}
