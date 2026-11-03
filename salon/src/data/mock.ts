import type { Appointment, AppointmentStatus, Category, Client, Service, Staff } from '../lib/types';
import { addDays, nowMinutes, parseISODate, todayISO } from '../lib/time';

export const SALON = {
  name: 'Atelier',
  tagline: 'beauty studio',
  address: 'Москва, Патриаршие пруды, Малая Бронная, 24',
  open: 9 * 60,
  close: 21 * 60,
};

export const CATEGORIES: Category[] = [
  { id: 'hair', name: 'Стрижки и волосы', short: 'Волосы' },
  { id: 'nails', name: 'Ногти', short: 'Ногти' },
  { id: 'brows', name: 'Брови и ресницы', short: 'Брови' },
  { id: 'makeup', name: 'Макияж', short: 'Макияж' },
];

export const SERVICES: Service[] = [
  // — Волосы
  { id: 'cut-w', category: 'hair', name: 'Женская стрижка', notifyLabel: 'Новая женская стрижка', description: 'Консультация, мытьё, стрижка и лёгкая укладка.', price: 3200, duration: 60, popular: true },
  { id: 'cut-bob', category: 'hair', name: 'Каре и боб', notifyLabel: 'Новое каре', description: 'Геометрия, графичный срез, подбор длины под овал лица.', price: 3600, duration: 75 },
  { id: 'cut-m', category: 'hair', name: 'Мужская стрижка', notifyLabel: 'Новая мужская стрижка', description: 'Машинка и ножницы, мытьё, стайлинг.', price: 2200, duration: 45 },
  { id: 'color-one', category: 'hair', name: 'Окрашивание в один тон', notifyLabel: 'Новое окрашивание', description: 'Стойкий цвет, тонирование и уход после окрашивания.', price: 6400, duration: 120 },
  { id: 'color-air', category: 'hair', name: 'Сложное окрашивание', notifyLabel: 'Новое сложное окрашивание', description: 'Балаяж, AirTouch, шатуш — мягкие переходы и блики.', price: 11900, duration: 210, popular: true },
  { id: 'color-bold', category: 'hair', name: 'Яркое окрашивание', notifyLabel: 'Новое яркое окрашивание', description: 'Пигменты прямого действия: медь, розовый, графит.', price: 7800, duration: 150 },
  { id: 'styling', category: 'hair', name: 'Укладка', notifyLabel: 'Новая укладка', description: 'Брашинг, локоны или голливудская волна.', price: 2000, duration: 45 },
  { id: 'care', category: 'hair', name: 'Восстанавливающий уход', notifyLabel: 'Новый уход для волос', description: 'Глубокое увлажнение и запечатывание кутикулы.', price: 3500, duration: 45 },
  // — Ногти
  { id: 'mani', category: 'nails', name: 'Маникюр с покрытием', notifyLabel: 'Новый маникюр', description: 'Аппаратный или комбинированный, покрытие гель-лаком.', price: 2800, duration: 90, popular: true },
  { id: 'mani-ex', category: 'nails', name: 'Экспресс-маникюр', notifyLabel: 'Новый экспресс-маникюр', description: 'Форма, кутикула, уход без покрытия.', price: 1500, duration: 45 },
  { id: 'pedi', category: 'nails', name: 'SPA-педикюр', notifyLabel: 'Новый педикюр', description: 'Ванночка, пилинг, массаж стоп и покрытие.', price: 3600, duration: 90 },
  { id: 'nail-art', category: 'nails', name: 'Дизайн ногтей', notifyLabel: 'Новый дизайн ногтей', description: 'Френч, минимализм, втирка — до 10 ногтей.', price: 900, duration: 30 },
  // — Брови и ресницы
  { id: 'brows', category: 'brows', name: 'Архитектура бровей', notifyLabel: 'Новая архитектура бровей', description: 'Коррекция формы и окрашивание хной или краской.', price: 1800, duration: 45, popular: true },
  { id: 'brow-lam', category: 'brows', name: 'Ламинирование бровей', notifyLabel: 'Новое ламинирование бровей', description: 'Фиксация направления волосков до 6 недель.', price: 2600, duration: 60 },
  { id: 'lash-lam', category: 'brows', name: 'Ламинирование ресниц', notifyLabel: 'Новое ламинирование ресниц', description: 'Изгиб, питание и окрашивание натуральных ресниц.', price: 2900, duration: 60 },
  { id: 'lash-ext', category: 'brows', name: 'Наращивание ресниц', notifyLabel: 'Новое наращивание ресниц', description: 'Классика или 2D, лёгкий естественный эффект.', price: 3900, duration: 120 },
  // — Макияж
  { id: 'mk-day', category: 'makeup', name: 'Дневной макияж', notifyLabel: 'Новый дневной макияж', description: 'Свежий нюдовый образ для работы и встреч.', price: 3200, duration: 60 },
  { id: 'mk-eve', category: 'makeup', name: 'Вечерний образ', notifyLabel: 'Новый вечерний образ', description: 'Акцент на глаза или губы, стойкость до утра.', price: 4800, duration: 75, popular: true },
  { id: 'mk-wed', category: 'makeup', name: 'Свадебный макияж', notifyLabel: 'Новый свадебный образ', description: 'Пробный образ, финальный макияж и бьюти-кейс с собой.', price: 9500, duration: 120 },
];

export const STAFF: Staff[] = [
  { id: 'alex', name: 'Алекс Морозов', dative: 'Алексу', role: 'Арт-директор', tags: ['Топ-стилист', 'Каре и боб'], categories: ['hair'], rating: 4.98, reviews: 412, workDays: [1, 2, 3, 4, 5, 6], start: 10 * 60, end: 20 * 60, tone: 0 },
  { id: 'vera', name: 'Вероника Лис', dative: 'Веронике', role: 'Колорист', tags: ['Эксперт по окрашиванию', 'Блонд'], categories: ['hair'], rating: 4.96, reviews: 287, workDays: [0, 2, 3, 4, 5, 6], start: 9 * 60, end: 19 * 60, tone: 1 },
  { id: 'daniel', name: 'Даниил Орлов', dative: 'Даниилу', role: 'Стилист-барбер', tags: ['Мужские стрижки', 'Укладки'], categories: ['hair'], rating: 4.91, reviews: 198, workDays: [0, 1, 3, 4, 5, 6], start: 11 * 60, end: 21 * 60, tone: 2 },
  { id: 'marina', name: 'Марина Ким', dative: 'Марине', role: 'Nail-мастер', tags: ['Nail-арт', 'Аппаратный маникюр'], categories: ['nails'], rating: 4.97, reviews: 356, workDays: [0, 1, 2, 3, 5, 6], start: 9 * 60, end: 20 * 60, tone: 1 },
  { id: 'sofia', name: 'София Белова', dative: 'Софии', role: 'Brow & lash', tags: ['Brow-архитектор', 'Ламинирование'], categories: ['brows'], rating: 4.95, reviews: 241, workDays: [1, 2, 3, 4, 5, 6], start: 10 * 60, end: 20 * 60, tone: 0 },
  { id: 'eva', name: 'Ева Романова', dative: 'Еве', role: 'Визажист', tags: ['Свадебные образы', 'Вечерний макияж'], categories: ['makeup', 'brows'], rating: 4.99, reviews: 163, workDays: [0, 2, 4, 5, 6], start: 10 * 60, end: 21 * 60, tone: 2 },
];

export const NOTE_TAGS = [
  { id: 'silence', label: 'Режим тишины', hint: 'хочу отдохнуть' },
  { id: 'wifi', label: 'Нужен Wi-Fi', hint: 'поработаю' },
  { id: 'espresso', label: 'Приготовьте эспрессо', hint: '' },
  { id: 'matcha', label: 'Матча-латте', hint: 'на овсяном' },
  { id: 'allergy', label: 'Есть аллергия', hint: 'расскажу мастеру' },
  { id: 'kids', label: 'Буду с ребёнком', hint: '' },
];

const CLIENT_SEED: Array<[string, string, string[]]> = [
  ['Анна Соколова', '+7 916 204-18-33', ['Предпочитает латте на овсяном молоке', 'Любит тихую музыку']],
  ['Мария Воронцова', '+7 903 771-42-10', ['Чувствительная кожа головы', 'Эспрессо без сахара']],
  ['Екатерина Лебедева', '+7 925 118-90-64', ['Всегда опаздывает на 5–10 минут']],
  ['Ольга Миронова', '+7 915 300-27-81', ['Режим тишины', 'Аллергия на аммиак']],
  ['Дарья Кузнецова', '+7 977 456-12-09', ['Приводит дочь на детские стрижки']],
  ['Полина Федорова', '+7 926 845-66-17', ['Матча-латте', 'Работает с ноутбуком — нужен Wi-Fi']],
  ['Алиса Новикова', '+7 999 210-55-40', ['Холодный блонд, тонирует каждые 6 недель']],
  ['Виктория Павлова', '+7 905 632-08-72', ['Любит обсуждать путешествия']],
  ['Ксения Морозова', '+7 916 777-31-25', ['Предпочитает натуральные материалы']],
  ['Софья Егорова', '+7 985 401-93-58', ['Зелёный чай с жасмином']],
  ['Иван Петров', '+7 903 115-74-26', ['Короткий фейд, раз в 3 недели']],
  ['Михаил Смирнов', '+7 926 980-40-11', ['Американо, без разговоров']],
  ['Артём Волков', '+7 915 562-28-90', ['Борода — только контур']],
  ['Елена Белякова', '+7 964 203-11-47', ['Свадьба в декабре — пробный образ']],
  ['Наталья Зайцева', '+7 977 640-85-02', ['Предпочитает латте на овсяном молоке']],
  ['Юлия Орлова', '+7 925 377-19-63', ['Короткие ногти, нюд']],
  ['Татьяна Комарова', '+7 999 812-60-34', ['Капучино на кокосовом']],
  ['Алина Романова', '+7 916 459-02-78', ['Рыжий медный — освежает тон']],
  ['Кристина Козлова', '+7 903 284-73-15', ['Ламинирование каждые 6 недель']],
  ['Вероника Степанова', '+7 926 118-49-90', []],
  ['Диана Гусева', '+7 985 733-25-61', ['Вечерний образ на мероприятия']],
  ['Лев Соловьёв', '+7 915 908-37-42', ['Классическая стрижка, без укладки']],
];

const F_FIRST = ['Алёна', 'Василиса', 'Злата', 'Ева', 'Милана', 'Арина', 'Ульяна', 'Вера', 'Лиана', 'Таисия', 'Яна', 'Майя', 'Камила', 'Ирина', 'Олеся', 'Нина'];
const F_LAST = ['Андреева', 'Ершова', 'Тихонова', 'Громова', 'Савельева', 'Максимова', 'Фролова', 'Данилова', 'Журавлёва', 'Никитина'];
const M_FIRST = ['Глеб', 'Марк', 'Тимур', 'Роман', 'Кирилл', 'Егор'];
const M_LAST = ['Андреев', 'Ершов', 'Тихонов', 'Громов', 'Савельев'];

const named: Client[] = CLIENT_SEED.map(([name, phone, preferences], i) => ({
  id: `c${i + 1}`,
  name,
  phone,
  preferences,
  since: `20${21 + (i % 5)}`,
}));

/** Широкая база: постоянные гости (с предпочтениями) + новые лица */
const extra: Client[] = Array.from({ length: 70 }, (_, i) => {
  const male = i % 7 === 3;
  const name = male
    ? `${M_FIRST[i % M_FIRST.length]} ${M_LAST[(i * 3) % M_LAST.length]}`
    : `${F_FIRST[i % F_FIRST.length]} ${F_LAST[(i * 7) % F_LAST.length]}`;
  const n = String(1000000 + ((i * 7919) % 8999999)).padStart(7, '0');
  return {
    id: `x${i + 1}`,
    name,
    phone: `+7 9${String(10 + (i % 89)).padStart(2, '0')} ${n.slice(0, 3)}-${n.slice(3, 5)}-${n.slice(5, 7)}`,
    preferences: [],
    since: '2026',
  };
});

export const SEED_CLIENTS: Client[] = [...named, ...extra];

/** Детерминированный PRNG — демо-данные одинаковы при каждом сбросе */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MALE_CLIENTS = new Set(['c11', 'c12', 'c13', 'c22', ...extra.filter((_, i) => i % 7 === 3).map((c) => c.id)]);

/**
 * Генерирует «живое» расписание: прошлые 21 день (история для CRM),
 * сегодня (плотно) и 14 дней вперёд (чем дальше — тем свободнее).
 */
export function generateAppointments(): Appointment[] {
  const rand = mulberry32(20261103);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
  const today = todayISO();
  const now = nowMinutes();
  const out: Appointment[] = [];

  for (let offset = -21; offset <= 14; offset++) {
    const date = addDays(today, offset);
    const weekday = parseISODate(date).getDay();
    // плотность: сегодня и ближайшие дни загружены сильнее
    const density = offset < 0 ? 0.7 : offset === 0 ? 0.78 : offset <= 3 ? 0.52 : offset <= 7 ? 0.36 : 0.2;

    for (const staff of STAFF) {
      if (!staff.workDays.includes(weekday)) continue;
      const pool = SERVICES.filter((s) => staff.categories.includes(s.category));
      let t = staff.start;
      while (t < staff.end) {
        if (rand() > density) {
          t += 30 * (1 + Math.floor(rand() * 2));
          continue;
        }
        let services = [pick(pool)];
        if (rand() < 0.22) {
          const extra = pick(pool);
          if (extra.id !== services[0].id) services.push(extra);
        }
        let duration = services.reduce((s, x) => s + x.duration, 0);
        if (t + duration > staff.end) {
          services = [services[0]];
          duration = services[0].duration;
          if (t + duration > staff.end) break;
        }
        const male = services.some((s) => s.id === 'cut-m');
        const clientPool = SEED_CLIENTS.filter((c) => (male ? MALE_CLIENTS.has(c.id) : !MALE_CLIENTS.has(c.id)));
        // перекос к постоянным гостям: первые в списке приходят чаще
        const client = clientPool[Math.floor(Math.pow(rand(), 1.8) * clientPool.length)];
        const base = services.reduce((s, x) => s + x.price, 0);
        const discount = t < 11 * 60 ? Math.round(base * 0.1) : 0;

        let status: AppointmentStatus;
        if (offset < 0) status = rand() < 0.06 ? 'cancelled' : 'completed';
        else if (offset === 0) {
          if (t + duration <= now) status = rand() < 0.05 ? 'cancelled' : 'completed';
          else if (t <= now) status = 'in_progress';
          else status = rand() < 0.25 ? 'pending' : 'confirmed';
        } else status = rand() < 0.35 ? 'pending' : rand() < 0.05 ? 'cancelled' : 'confirmed';

        const tags: string[] = [];
        if (rand() < 0.18) tags.push(pick(['Режим тишины', 'Приготовьте эспрессо', 'Нужен Wi-Fi', 'Матча-латте']));

        out.push({
          id: `a_${date}_${staff.id}_${t}`,
          staffId: staff.id,
          clientId: client.id,
          serviceIds: services.map((s) => s.id),
          date,
          start: t,
          duration,
          price: base - discount,
          discount,
          status,
          tags,
          createdAt: Date.now() - (30 - offset) * 86400000,
          source: 'seed',
        });
        // буфер на уборку рабочего места
        t += Math.ceil(duration / 30) * 30 + (rand() < 0.3 ? 30 : 0);
      }
    }
  }
  return out;
}
