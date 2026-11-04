// Раз в минуту отправляем напоминания за сутки до визита.
import { listStudios, getStudio } from './studios.js';
import * as DB from './db.js';
import { sendPush } from './webpush.js';
import { localNow, fromMin, timeOf, toMin } from '../core/time.js';

async function tick() {
  for (const slug of listStudios()) {
    const cfg = getStudio(slug);
    if (!cfg) continue;
    const now = localNow(cfg.timezone);
    const due = DB.dueReminders(slug, fromMin(now), fromMin(now + 24 * 60));
    for (const b of due) {
      DB.markReminded(slug, b.id, 1);
      try {
        const sub = JSON.parse(b.push_sub);
        const hours = Math.round((toMin(b.start) - now) / 60);
        const when = hours >= 20 ? `Завтра в ${timeOf(toMin(b.start))}` : `Сегодня в ${timeOf(toMin(b.start))}`;
        const status = await sendPush(sub, {
          title: `${cfg.name}: ${when}`,
          body: `${b.service_name}. ${[cfg.address].filter(Boolean).join('')}`.trim(),
          url: `/${slug}/?booking=${b.token}`,
          tag: `booking-${b.id}`,
        });
        if (status === 404 || status === 410) DB.dropPushSub(slug, b.id);
        else if (status >= 400) { console.warn(`[push ${slug}] статус ${status}`); }
      } catch (e) {
        console.warn(`[push ${slug}] ${e.message}`);
        DB.markReminded(slug, b.id, 2); // ошибка — больше не пытаемся
      }
    }
  }
}

export function startReminders() {
  setTimeout(() => tick().catch(() => {}), 5000).unref();
  setInterval(() => tick().catch((e) => console.warn('[reminders]', e.message)), 60_000).unref();
}
