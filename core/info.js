import { WD, WD_ORDER, WD_SHORT, dateOf, addDays, timeOf, relDay, fmtDay, weekday } from './time.js';
import { dayWindow } from './slots.js';

/** «Открыто до 21:00» / «Закрыто · откроемся завтра в 09:00». */
export function openStatus(cfg, now) {
  const today = dateOf(now);
  const w = dayWindow(cfg, today);
  if (w && now >= w[0] && now < w[1]) return { open: true, text: `Открыто до ${timeOf(w[1])}` };
  for (let i = 0; i < 14; i++) {
    const d = addDays(today, i);
    const ww = dayWindow(cfg, d);
    if (ww && ww[0] > now) {
      const r = relDay(d, today);
      const when = r || `в ${['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'][weekday(d)]}, ${fmtDay(d, { wd: false })}`;
      return { open: false, text: `Закрыто · откроемся ${when} в ${timeOf(ww[0])}` };
    }
  }
  return { open: false, text: 'Сейчас закрыто' };
}

/** Сгруппированный график: [{days:'пн–пт', hours:'09:00–21:00'}]. */
export function scheduleLines(cfg) {
  const idx = { mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 0 };
  const val = (k) => { const w = cfg.schedule?.[k]; return w && w[0] && w[1] ? `${w[0]}–${w[1]}` : 'выходной'; };
  const groups = [];
  for (const k of WD_ORDER) {
    const v = val(k);
    const last = groups[groups.length - 1];
    if (last && last.hours === v) last.keys.push(k); else groups.push({ hours: v, keys: [k] });
  }
  return groups.map((g) => ({
    days: g.keys.length > 1 ? `${WD_SHORT[idx[g.keys[0]]]}–${WD_SHORT[idx[g.keys[g.keys.length - 1]]]}` : WD_SHORT[idx[g.keys[0]]],
    hours: g.hours,
  }));
}

export function mapLinks(cfg) {
  const q = encodeURIComponent([cfg.city, cfg.address].filter(Boolean).join(', '));
  return {
    yandex: cfg.mapUrl || `https://yandex.ru/maps/?text=${q}`,
    gis: `https://2gis.ru/search/${q}`,
    google: `https://www.google.com/maps/search/?api=1&query=${q}`,
  };
}

export const phoneHref = (p) => 'tel:' + String(p || '').replace(/[^\d+]/g, '');
export const tgHref = (t) => t ? (String(t).startsWith('http') ? t : `https://t.me/${String(t).replace(/^@/, '')}`) : null;
export const waHref = (w) => w ? `https://wa.me/${String(w).replace(/\D/g, '')}` : null;
export { WD };
