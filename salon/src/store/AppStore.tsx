import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import type { ActivityEvent, Appointment, AppointmentStatus, Client } from '../lib/types';
import { SEED_CLIENTS, SERVICES, STAFF, generateAppointments } from '../data/mock';
import { fmtDateShort, fmtTime, normalizePhone, todayISO, uid } from '../lib/time';

const STORAGE_KEY = 'atelier.state.v1';

interface State {
  appointments: Appointment[];
  clients: Client[];
  events: ActivityEvent[];
  seededOn: string;
}

type Action =
  | { type: 'add'; appointment: Appointment; client: Client | null; event: ActivityEvent }
  | { type: 'status'; id: string; status: AppointmentStatus; event: ActivityEvent }
  | { type: 'event'; event: ActivityEvent }
  | { type: 'reset'; state: State };

function seedState(): State {
  return {
    appointments: generateAppointments(),
    clients: SEED_CLIENTS,
    events: seedEvents(),
    seededOn: todayISO(),
  };
}

function seedEvents(): ActivityEvent[] {
  const now = Date.now();
  return [
    { id: 'e1', at: now - 4 * 60000, kind: 'booking', text: 'Анна С. записалась на «Сложное окрашивание»' },
    { id: 'e2', at: now - 17 * 60000, kind: 'status', text: 'Мария В. подтвердила визит к Алексу' },
    { id: 'e3', at: now - 41 * 60000, kind: 'notify', text: 'Марине отправлено напоминание о 15:30' },
    { id: 'e4', at: now - 95 * 60000, kind: 'booking', text: 'Иван П. записался на «Мужская стрижка»' },
  ];
}

function load(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedState();
    const parsed = JSON.parse(raw) as State;
    if (!Array.isArray(parsed.appointments) || !Array.isArray(parsed.clients)) return seedState();
    // Демо остаётся «живым»: если сид устарел, перегенерируем фон, но сохраняем реальные записи пользователя
    if (parsed.seededOn !== todayISO()) {
      const own = parsed.appointments.filter((a) => a.source !== 'seed');
      return { ...parsed, appointments: [...generateAppointments(), ...own], seededOn: todayISO() };
    }
    return parsed;
  } catch {
    return seedState();
  }
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'add':
      return {
        ...state,
        appointments: [...state.appointments, action.appointment],
        clients: action.client ? [...state.clients, action.client] : state.clients,
        events: [action.event, ...state.events].slice(0, 30),
      };
    case 'status':
      return {
        ...state,
        appointments: state.appointments.map((a) => (a.id === action.id ? { ...a, status: action.status } : a)),
        events: [action.event, ...state.events].slice(0, 30),
      };
    case 'event':
      return { ...state, events: [action.event, ...state.events].slice(0, 30) };
    case 'reset':
      return action.state;
  }
}

const STATUS_PAST: Record<AppointmentStatus, string> = {
  pending: 'возвращён в ожидание',
  confirmed: 'подтверждён',
  in_progress: 'начат',
  completed: 'завершён',
  cancelled: 'отменён',
};

export interface NewBooking {
  staffId: string;
  serviceIds: string[];
  date: string;
  start: number;
  duration: number;
  price: number;
  discount: number;
  note?: string;
  tags: string[];
  clientName: string;
  clientPhone: string;
}

interface Store extends State {
  book: (b: NewBooking) => Appointment;
  setStatus: (id: string, status: AppointmentStatus) => void;
  logEvent: (kind: ActivityEvent['kind'], text: string) => void;
  reset: () => void;
}

const Ctx = createContext<Store | null>(null);

const shortName = (name: string) => {
  const [first, last] = name.split(' ');
  return last ? `${first} ${last[0]}.` : first;
};

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* приватный режим / переполнение — работаем в памяти */
    }
  }, [state]);

  // Синхронизация между вкладками: клиент записался — админка обновилась
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      try {
        dispatch({ type: 'reset', state: JSON.parse(e.newValue) as State });
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const book = useCallback(
    (b: NewBooking) => {
      const phone = normalizePhone(b.clientPhone);
      const existing = state.clients.find((c) => normalizePhone(c.phone) === phone);
      const client: Client = existing ?? {
        id: uid('c'),
        name: b.clientName.trim(),
        phone: b.clientPhone,
        preferences: [],
        since: String(new Date().getFullYear()),
      };
      const appointment: Appointment = {
        id: uid('a'),
        staffId: b.staffId,
        clientId: client.id,
        serviceIds: b.serviceIds,
        date: b.date,
        start: b.start,
        duration: b.duration,
        price: b.price,
        discount: b.discount,
        status: 'pending',
        note: b.note?.trim() || undefined,
        tags: b.tags,
        createdAt: Date.now(),
        source: 'online',
      };
      const svc = SERVICES.find((s) => s.id === b.serviceIds[0]);
      dispatch({
        type: 'add',
        appointment,
        client: existing ? null : client,
        event: {
          id: uid('e'),
          at: Date.now(),
          kind: 'booking',
          text: `Онлайн-запись: ${shortName(client.name)} — «${svc?.name ?? 'услуга'}», ${fmtDateShort(b.date)} в ${fmtTime(b.start)}`,
        },
      });
      return appointment;
    },
    [state.clients],
  );

  const setStatus = useCallback(
    (id: string, status: AppointmentStatus) => {
      const a = state.appointments.find((x) => x.id === id);
      const client = state.clients.find((c) => c.id === a?.clientId);
      const staff = STAFF.find((s) => s.id === a?.staffId);
      dispatch({
        type: 'status',
        id,
        status,
        event: {
          id: uid('e'),
          at: Date.now(),
          kind: 'status',
          text: `${client ? `${shortName(client.name)}: в` : 'В'}изит${staff ? ` к ${staff.dative}` : ''} ${STATUS_PAST[status]}`,
        },
      });
    },
    [state.appointments, state.clients],
  );

  const logEvent = useCallback((kind: ActivityEvent['kind'], text: string) => {
    dispatch({ type: 'event', event: { id: uid('e'), at: Date.now(), kind, text } });
  }, []);

  const reset = useCallback(() => dispatch({ type: 'reset', state: seedState() }), []);

  const value = useMemo(() => ({ ...state, book, setStatus, logEvent, reset }), [state, book, setStatus, logEvent, reset]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useStore must be used inside <AppStoreProvider>');
  return ctx;
}
