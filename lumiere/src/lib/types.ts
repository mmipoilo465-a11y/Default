export type Category = 'haircut' | 'styling' | 'coloring';
export type Mode = 'client' | 'admin';

export interface Service {
  id: string;
  category: Category;
  name: string;
  description: string;
  /** Длительность в минутах (кратна шагу сетки — 30 мин). */
  duration: number;
  price: number;
}

export interface Master {
  id: string;
  name: string;
  role: string;
  categories: Category[];
  rating: number;
  experience: number;
  /** Выходные дни недели: 0 — воскресенье … 6 — суббота. */
  daysOff: number[];
  /** Пара цветов для градиентного аватара. */
  tone: [string, string];
}

export interface Client {
  name: string;
  phone: string;
  comment?: string;
}

export interface Appointment {
  id: string;
  serviceId: string;
  masterId: string;
  /** Дата в формате YYYY-MM-DD (локальное время). */
  date: string;
  /** Начало в минутах от полуночи. */
  start: number;
  duration: number;
  price: number;
  client: Client;
  status: 'booked' | 'cancelled';
  source: 'seed' | 'online';
  createdAt: number;
}

/** Специальное значение «любой свободный мастер». */
export const ANY_MASTER = 'any';
