import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Appointment } from '../lib/types';
import { generateSeed } from '../data/seed';
import { toKey } from '../lib/time';

const STORAGE_KEY = 'lumiere.bookings.v1';

interface Persisted {
  seededOn: string;
  appointments: Appointment[];
}

/**
 * Всё состояние живёт в памяти браузера. LocalStorage используется только
 * чтобы записи не терялись при перезагрузке страницы во время теста.
 * Демо-занятость пересоздаётся каждый день; онлайн-записи клиентов сохраняются.
 */
function load(): Appointment[] {
  const today = toKey(new Date());
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Persisted;
      if (saved.seededOn === today) return saved.appointments;
      const online = saved.appointments.filter((a) => a.source === 'online' && a.date >= today);
      return [...generateSeed(), ...online];
    }
  } catch {
    /* хранилище недоступно — работаем только в памяти */
  }
  return generateSeed();
}

interface AppStore {
  appointments: Appointment[];
  addAppointment: (a: Appointment) => void;
  cancelAppointment: (id: string) => void;
  resetDemo: () => void;
}

const Ctx = createContext<AppStore | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [appointments, setAppointments] = useState<Appointment[]>(load);

  useEffect(() => {
    try {
      const data: Persisted = { seededOn: toKey(new Date()), appointments };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* игнорируем: приватный режим или заблокированное хранилище */
    }
  }, [appointments]);

  // Страница записи и панель — разные вкладки: подхватываем изменения друг друга.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      try {
        setAppointments((JSON.parse(e.newValue) as Persisted).appointments);
      } catch {
        /* повреждённые данные игнорируем */
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const addAppointment = useCallback((a: Appointment) => setAppointments((list) => [...list, a]), []);
  const cancelAppointment = useCallback(
    (id: string) =>
      setAppointments((list) => list.map((a) => (a.id === id ? { ...a, status: 'cancelled' as const } : a))),
    [],
  );
  const resetDemo = useCallback(() => setAppointments(generateSeed()), []);

  const value = useMemo(
    () => ({ appointments, addAppointment, cancelAppointment, resetDemo }),
    [appointments, addAppointment, cancelAppointment, resetDemo],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppStore(): AppStore {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAppStore must be used inside AppStoreProvider');
  return ctx;
}
