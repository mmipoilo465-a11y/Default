// Демо-записи, чтобы кабинет не был пустым при показе владельцу.
//   npm run demo-data -- <студия>          — заполнить прошлую и текущую неделю
//   npm run demo-data -- <студия> --clear  — удалить ВСЕ записи студии
import { getStudio } from '../lib/studios.js';
import * as DB from '../lib/db.js';
import { createBooking, setStatus, addPayment, nowOf } from '../lib/bookings.js';
import { dateOf, addDays, fromMin, toMin } from '../core/time.js';
import { startsForDay, findBox } from '../core/slots.js';

const [slug, flag] = process.argv.slice(2);
const cfg = getStudio(slug || '');
if (!cfg) { console.log('Использование: npm run demo-data -- <студия> [--clear]'); process.exit(1); }
if (flag === '--clear') { console.log(`Удалено записей: ${DB.deleteBookings(slug)}`); process.exit(0); }

const names = ['Алексей', 'Марина', 'Дмитрий', 'Ольга', 'Сергей', 'Анна', 'Игорь', 'Екатерина', 'Павел', 'Наталья', 'Артём', 'Юлия'];
const cars = ['Kia Rio, белый', 'BMW X5, чёрный', 'Toyota Camry', 'VW Tiguan', 'Hyundai Solaris', 'Mercedes GLE', 'Skoda Octavia', 'Lada Vesta', 'Audi Q7', 'Haval Jolion', 'Geely Monjaro', 'Mazda CX-5'];
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const today = dateOf(nowOf(cfg));
const from = addDays(today, -9), to = addDays(today, 6);
const services = cfg.services.filter((s) => !s.hidden);
let made = 0;

// Создаём записи «задним числом»: временно подменяем «сейчас» на начало периода.
for (let d = from; d <= to; d = addDays(d, 1)) {
  const perDay = 2 + Math.floor(Math.random() * 3);
  for (let k = 0; k < perDay; k++) {
    const svc = pick(services.filter((s) => !s.days || Math.random() < 0.25));
    const starts = startsForDay({ ...cfg, booking: { ...cfg.booking, minLeadMinutes: 0 } }, svc, d, toMin(d + 'T00:00'));
    const busy = DB.activeBookings(slug, from + 'T00:00');
    const free = starts.filter((t) => findBox(cfg, busy, svc, t));
    if (!free.length) continue;
    const t = free[Math.floor(Math.random() * Math.min(free.length, 6))];
    try {
      const b = createBooking(cfg, { serviceId: svc.id, date: d, time: fromMin(t).slice(11), clientName: pick(names), clientPhone: '+7916' + String(1000000 + Math.floor(Math.random() * 8999999)), car: pick(cars) }, { owner: true });
      made++;
      if (d < today || (d === today && Math.random() < 0.5)) {
        if (Math.random() < 0.07) { setStatus(cfg, b.id, 'cancelled'); continue; }
        setStatus(cfg, b.id, d < today || Math.random() < 0.5 ? 'ready' : 'accepted');
        if (d < today && Math.random() < 0.9) {
          addPayment(cfg, b.id, { kind: 'payment', amount: b.price, method: pick(['Карта', 'Наличные', 'Перевод']) });
          // платёж датируем днём работы
          DB.conn(slug).prepare('UPDATE payments SET at = ? WHERE booking_id = ?').run(b.end.slice(0, 10) <= today ? b.end : `${d}T18:00`, b.id);
        }
      }
    } catch { /* время занято — пропускаем */ }
  }
}
console.log(`Создано демо-записей: ${made} (${from} — ${to})`);
