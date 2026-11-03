import type { Appointment } from '../lib/types';
import { CLOSE, OPEN, STEP, nextDays } from '../lib/time';
import { worksOn } from '../lib/schedule';
import { MASTERS, SERVICES } from './catalog';

const CLIENTS = [
  'Анна Морозова', 'Екатерина Белова', 'Ольга Никитина', 'Дарья Ковалёва', 'Ирина Фёдорова',
  'Полина Зайцева', 'Ксения Гусева', 'Виктория Романова', 'Алексей Смирнов', 'Михаил Попов',
  'Юлия Павлова', 'Наталья Егорова', 'Татьяна Волкова', 'Елена Соловьёва', 'Артём Козлов',
  'Вероника Титова', 'Марина Андреева', 'Светлана Макарова', 'Игорь Лебедев', 'Алиса Комарова',
];

/** Детерминированный ГПСЧ: одинаковые демо-данные при каждой загрузке в течение дня. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hash = (s: string) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7);

function phoneFrom(rand: () => number): string {
  const d = () => Math.floor(rand() * 10);
  return `+7 (9${d()}${d()}) ${d()}${d()}${d()}-${d()}${d()}-${d()}${d()}`;
}

/** Генерирует занятость салона на неделю вперёд. */
export function generateSeed(now: Date = new Date()): Appointment[] {
  const days = nextDays(7, now);
  const out: Appointment[] = [];

  days.forEach((date, dayIndex) => {
    const rand = mulberry32(hash(date));
    const density = 0.42 - dayIndex * 0.04; // ближайшие дни заполнены плотнее

    for (const master of MASTERS) {
      if (!worksOn(master, date)) continue;
      const services = SERVICES.filter((s) => master.categories.includes(s.category));
      let t = OPEN;
      while (t < CLOSE) {
        const service = services[Math.floor(rand() * services.length)];
        if (rand() < density && t + service.duration <= CLOSE) {
          out.push({
            id: `seed-${date}-${master.id}-${t}`,
            serviceId: service.id,
            masterId: master.id,
            date,
            start: t,
            duration: service.duration,
            price: service.price,
            client: { name: CLIENTS[Math.floor(rand() * CLIENTS.length)], phone: phoneFrom(rand) },
            status: 'booked',
            source: 'seed',
            createdAt: now.getTime(),
          });
          t += service.duration;
        } else {
          t += STEP * (1 + Math.floor(rand() * 4)); // пауза 30–120 мин
        }
      }
    }
  });

  return out;
}
