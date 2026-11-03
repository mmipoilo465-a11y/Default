import { Palette, Scissors, Wind, type LucideIcon } from 'lucide-react';
import type { Category, Master, Service } from '../lib/types';

export interface CategoryInfo {
  id: Category;
  name: string;
  tagline: string;
  icon: LucideIcon;
}

export const CATEGORIES: CategoryInfo[] = [
  { id: 'haircut', name: 'Стрижка', tagline: 'Форма, которая держится неделями', icon: Scissors },
  { id: 'styling', name: 'Укладка', tagline: 'Объём и блеск к любому поводу', icon: Wind },
  { id: 'coloring', name: 'Окрашивание', tagline: 'Глубокий цвет без компромиссов', icon: Palette },
];

export const SERVICES: Service[] = [
  { id: 'cut-women', category: 'haircut', name: 'Женская стрижка', description: 'Консультация, уходовое мытьё, стрижка и лёгкая укладка', duration: 60, price: 2800 },
  { id: 'cut-men', category: 'haircut', name: 'Мужская стрижка', description: 'Машинка и ножницы, мытьё головы, стайлинг', duration: 30, price: 1800 },
  { id: 'cut-kids', category: 'haircut', name: 'Детская стрижка', description: 'Для детей до 12 лет — быстро и бережно', duration: 30, price: 1200 },
  { id: 'style-daily', category: 'styling', name: 'Повседневная укладка', description: 'Мытьё, термозащита и укладка феном с брашингом', duration: 60, price: 1900 },
  { id: 'style-waves', category: 'styling', name: 'Голливудские локоны', description: 'Мягкие стойкие волны на плойку или утюжок', duration: 60, price: 3200 },
  { id: 'style-evening', category: 'styling', name: 'Вечерняя причёска', description: 'Собранная или полусобранная причёска к событию', duration: 90, price: 4200 },
  { id: 'color-tone', category: 'coloring', name: 'Тонирование', description: 'Обновление оттенка и блеска, уход Olaplex', duration: 90, price: 4500 },
  { id: 'color-solid', category: 'coloring', name: 'Однотонное окрашивание', description: 'Окрашивание корней или по всей длине', duration: 120, price: 5900 },
  { id: 'color-balayage', category: 'coloring', name: 'Балаяж / AirTouch', description: 'Сложное окрашивание с мягкими переходами', duration: 180, price: 11500 },
];

export const MASTERS: Master[] = [
  { id: 'alina', name: 'Алина Соколова', role: 'Арт-директор, колорист', categories: ['haircut', 'styling', 'coloring'], rating: 5.0, experience: 12, daysOff: [1], tone: ['#5B3FA8', '#9175D1'] },
  { id: 'maria', name: 'Мария Ветрова', role: 'Стилист-парикмахер', categories: ['haircut', 'styling'], rating: 4.9, experience: 8, daysOff: [0], tone: ['#FBA870', '#FFC498'] },
  { id: 'daniil', name: 'Даниил Орлов', role: 'Барбер-стилист', categories: ['haircut'], rating: 4.9, experience: 6, daysOff: [3], tone: ['#3C2A6F', '#7454BD'] },
  { id: 'eva', name: 'Ева Лебедева', role: 'Колорист', categories: ['coloring', 'styling'], rating: 4.8, experience: 7, daysOff: [2], tone: ['#7454BD', '#FFC498'] },
  { id: 'sofia', name: 'София Крылова', role: 'Стилист по укладкам', categories: ['styling', 'haircut'], rating: 4.9, experience: 5, daysOff: [4], tone: ['#F08A4B', '#B7A3E3'] },
];

export const serviceById = (id: string) => SERVICES.find((s) => s.id === id);
export const masterById = (id: string) => MASTERS.find((m) => m.id === id);
export const categoryById = (id: Category) => CATEGORIES.find((c) => c.id === id)!;
export const mastersFor = (category: Category) => MASTERS.filter((m) => m.categories.includes(category));

export const SALON = {
  name: 'Lumière',
  address: 'Москва, ул. Пречистенка, 12',
  phone: '+7 (495) 120-45-67',
};
