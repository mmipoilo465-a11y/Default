export type CategoryId = 'hair' | 'nails' | 'brows' | 'makeup';

export interface Category {
  id: CategoryId;
  name: string;
  short: string;
}

export interface Service {
  id: string;
  category: CategoryId;
  name: string;
  /** Краткое имя в винительном падеже для уведомлений: «Новое окрашивание» */
  notifyLabel: string;
  description: string;
  price: number;
  /** минуты */
  duration: number;
  popular?: boolean;
}

export interface Staff {
  id: string;
  name: string;
  /** Имя в дательном падеже для уведомлений: «мастеру Алексу» */
  dative: string;
  role: string;
  tags: string[];
  categories: CategoryId[];
  rating: number;
  reviews: number;
  /** 0 — воскресенье … 6 — суббота */
  workDays: number[];
  /** минуты от полуночи */
  start: number;
  end: number;
  /** градиент аватара (монохром) */
  tone: 0 | 1 | 2;
}

export type AppointmentStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

export interface Appointment {
  id: string;
  staffId: string;
  clientId: string;
  serviceIds: string[];
  /** YYYY-MM-DD (локальная дата) */
  date: string;
  /** минуты от полуночи */
  start: number;
  duration: number;
  price: number;
  discount: number;
  status: AppointmentStatus;
  note?: string;
  tags: string[];
  createdAt: number;
  source: 'online' | 'admin' | 'seed';
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  preferences: string[];
  since: string;
}

export interface ActivityEvent {
  id: string;
  at: number;
  kind: 'booking' | 'status' | 'notify';
  text: string;
}
