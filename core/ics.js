import { toMin, localToUtcMs } from './time.js';

const z = (ms) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const esc = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

export function eventData(cfg, b) {
  const start = localToUtcMs(toMin(b.start), cfg.timezone);
  // в календарь — момент сдачи машины (длинные работы — без растягивания на дни)
  const end = b.end && toMin(b.end) - toMin(b.start) <= 12 * 60 ? localToUtcMs(toMin(b.end), cfg.timezone) : start + 60 * 60000;
  return {
    title: `${b.serviceName} — ${cfg.name}`,
    location: [cfg.city, cfg.address].filter(Boolean).join(', '),
    details: [`Запись ${b.code}`, cfg.phone ? `Телефон: ${cfg.phone}` : '', cfg.howToFind || ''].filter(Boolean).join('\n'),
    start, end,
  };
}

export function buildIcs(cfg, b) {
  const e = eventData(cfg, b);
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//studio-booking//RU', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${b.id}@${cfg.slug}`,
    `DTSTAMP:${z(Date.now())}`,
    `DTSTART:${z(e.start)}`,
    `DTEND:${z(e.end)}`,
    `SUMMARY:${esc(e.title)}`,
    `LOCATION:${esc(e.location)}`,
    `DESCRIPTION:${esc(e.details)}`,
    'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', `DESCRIPTION:${esc('Завтра: ' + e.title)}`, 'END:VALARM',
    'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', `DESCRIPTION:${esc('Через 2 часа: ' + e.title)}`, 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR', '',
  ].join('\r\n');
}

export function googleCalUrl(cfg, b) {
  const e = eventData(cfg, b);
  const p = new URLSearchParams({ action: 'TEMPLATE', text: e.title, dates: `${z(e.start)}/${z(e.end)}`, details: e.details, location: e.location });
  return `https://calendar.google.com/calendar/render?${p}`;
}
