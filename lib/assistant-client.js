// Помощник для клиента: отвечает только по данным своей студии.
import { norm, parseDate, parseTimePref, matchServices, shortName, ub } from './nlu.js';
import { nowOf, busyBookings } from './bookings.js';
import { getSlots, nearestSlots, spanFor, dayWindow } from '../core/slots.js';
import { dateOf, toMin, fmtDayRel, fmtDuration, fmtPrice, timeOf, hm, WD_SHORT, weekday, addDays, fmtDay } from '../core/time.js';
import { scheduleLines, mapLinks, phoneHref, tgHref, waHref, openStatus } from '../core/info.js';
import { askLlm, llmEnabled } from './llm.js';

const INTENTS = [
  ['greet', ub(/^(привет|здравств|добр(ый|ое|ого)|хай|салют|hello|hi)\b/)],
  ['thanks', ub(/^(спасибо|благодар|ок\b|окей|понятно|супер|отлично)/)],
  ['cancel', /отмен|перенест|перенос|не смогу|не успею|опоздаю/],
  ['location', /адрес|где (вы|наход|это)|как (вас |к вам |до вас )?(найти|добрат|доехат|проехат|попаст)|куда (ехать|подъехать)|маршрут|карт[аеу]|парковк|въезд|находитесь|найти студию|найти вас/],
  ['contact', /телефон|позвонит|номер|связат|телеграм|whatsapp|ватсап|написать вам|менеджер|оператор|живой/],
  ['hours', /график|часы работы|режим работы|до скольк|во сколько (вы )?(открыв|закрыв|начина|работ)|работаете|открыты|выходн[ыо]е? (у вас|дни)|когда (вы )?открыв/],
  ['slots', /окн[оа]|окошк|свобод|записат|запиши|запись|ближайш|когда (можно|сможете|приехать|примете|получится)|есть (ли )?(время|место|места)|успеете|принять|приехать|забронир|место на/],
  ['price', /сколько стои|стоимост|цен[аыу]|прайс|почем|по чем|сколько (будет|выйдет|денег)|руб|бюджет|дорого|дешев/],
  ['duration', /сколько (по )?времени|как долго|долго ли|длит|сколько (часов|дней|делаете|займет)|за сколько|быстро/],
  ['services', /какие (у вас )?услуг|что (вы )?(делаете|умеете)|список услуг|чем занимает|что есть|ассортимент|все услуги|услуги/],
  ['payment', /оплат|картой|наличн|перевод|предоплат|рассрочк|чек/],
];

function detect(t) {
  for (const [name, re] of INTENTS) if (re.test(t)) return name;
  return null;
}

const svcLine = (cfg, s) => `**${s.name}** — ${fmtPrice(s, cfg.currency)}, ${fmtDuration(s)}`;
const bookChip = (s, slot, label) => ({ label: label || `${slot.time}`, book: { serviceId: s.id, date: slot.date, time: slot.time } });

function popular(cfg, n = 6) {
  const list = cfg.services.filter((s) => !s.hidden);
  return [...list.filter((s) => s.popular), ...list.filter((s) => !s.popular)].slice(0, n);
}

export function exampleQuestions(cfg) {
  if (cfg.assistant?.examples?.length) return cfg.assistant.examples;
  const s = cfg.services.find((x) => /полиров/i.test(x.name)) || popular(cfg, 1)[0];
  const isDetailing = /детейл|детейлинг|мойк|полиров/i.test(cfg.kind || '');
  return ['Когда ближайшее окно?', s ? `Сколько стоит ${shortName(s)}?` : 'Сколько это стоит?', isDetailing ? 'Как найти студию?' : 'Как вас найти?'];
}

function askWhichService(cfg, intent, list, extra = {}) {
  const opts = (list && list.length ? list : popular(cfg)).slice(0, 8);
  const q = intent === 'price' ? 'Цену какой услуги подсказать?' : intent === 'duration' ? 'Для какой услуги?' : 'Для какой услуги подобрать время?';
  const lead = list && list.length > 1 ? `Нашёл несколько похожих услуг. ${q}` : q;
  return {
    text: lead,
    chips: opts.map((s) => ({ label: s.name, send: s.name })),
    context: { intent, awaiting: 'service', ...extra },
  };
}

function filterPref(times, pref) {
  if (!pref) return times;
  if (pref.exact !== undefined) {
    const sorted = [...times].sort((a, b) => Math.abs(hm(a) - pref.exact) - Math.abs(hm(b) - pref.exact));
    return sorted.filter((t) => Math.abs(hm(t) - pref.exact) <= 180).slice(0, 4).sort();
  }
  return times.filter((t) => hm(t) >= pref.from && hm(t) < pref.to);
}

function describeSpan(cfg, s, date, time) {
  const sp = spanFor(cfg, s, toMin(`${date}T${time}`));
  const endDate = dateOf(sp.end);
  if (endDate === date) return `Машина будет готова примерно к ${timeOf(sp.end)}.`;
  return `Работа занимает ${fmtDuration(s)}: машина останется у нас до ${fmtDay(endDate, { wd: false })}, ${timeOf(sp.end)}.`;
}

function slotsAnswer(cfg, s, text, ctx) {
  const now = nowOf(cfg);
  const today = dateOf(now);
  const date = parseDate(text, today) || ctx?.date || null;
  const pref = parseTimePref(text) || ctx?.pref || null;
  const bookings = busyBookings(cfg);
  const chipsMore = [{ label: 'Другая дата', book: { serviceId: s.id } }, { label: `Цена: ${fmtPrice(s, cfg.currency)}`, send: `Сколько стоит ${s.name}?` }];

  if (date) {
    if (date < today) return { text: 'Эта дата уже прошла. Подобрать ближайшее время?', chips: [{ label: 'Ближайшее окно', send: `Ближайшее окно на ${s.name}` }], context: { intent: 'slots', serviceId: s.id } };
    const day = getSlots(cfg, bookings, s, date, 1, now)[0];
    const label = fmtDayRel(date, today);
    if (!day) return { text: `На ${label} запись ещё не открыта — можно записаться максимум на ${cfg.booking.horizonDays} дней вперёд.`, chips: [{ label: 'Ближайшее окно', send: `Ближайшее окно на ${s.name}` }], context: { intent: 'slots', serviceId: s.id } };
    let times = filterPref(day.times, pref);
    if (times.length) {
      const shown = times.slice(0, 8);
      const focus = pref?.exact !== undefined ? [...shown].sort((a, b) => Math.abs(hm(a) - pref.exact) - Math.abs(hm(b) - pref.exact))[0] : shown[0];
      const exactHit = pref?.exact !== undefined && hm(focus) === pref.exact;
      return {
        text: `${s.name}, ${label}: ${exactHit ? `в ${focus} свободно.` : `свободно ${shown.length === 1 ? 'в ' + shown[0] : shown.slice(0, -1).join(', ') + ' и ' + shown.at(-1)}.`} ${describeSpan(cfg, s, date, focus).replace('Машина будет готова', exactHit ? 'Машина будет готова' : `Если начать в ${focus}, машина будет готова`)}\nНажмите на время, чтобы записаться.`,
        chips: [...shown.map((t) => bookChip(s, { date, time: t })), ...chipsMore],
        context: { intent: 'slots', serviceId: s.id, date },
      };
    }
    const why = !day.open ? `${label[0].toUpperCase() + label.slice(1)} у нас выходной.` : day.times.length ? `${label[0].toUpperCase() + label.slice(1)} в это время всё занято.` : `${label[0].toUpperCase() + label.slice(1)} свободного времени уже нет.`;
    const near = nearestSlots(cfg, bookings, s, Math.max(now, toMin(date + 'T00:00')), 4, 2);
    if (!near.length) return { text: `${why} Ближайших окон не нашёл — позвоните, подберём вручную.`, chips: contactChips(cfg), context: { intent: 'slots', serviceId: s.id } };
    return {
      text: `${why} Ближайшее свободное: ${groupNear(near, today)}.`,
      chips: [...near.map((x) => bookChip(s, x, `${shortDay(x.date, today)} ${x.time}`)), ...chipsMore],
      context: { intent: 'slots', serviceId: s.id },
    };
  }

  let near = nearestSlots(cfg, bookings, s, now, pref ? 40 : 4, pref ? 6 : 2);
  if (pref) near = groupFilter(near, pref).slice(0, 4);
  if (!near.length) return { text: `На ближайшие ${cfg.booking.horizonDays} дней по «${s.name}» свободного времени нет. Позвоните — постараемся найти окно.`, chips: contactChips(cfg), context: { intent: 'slots', serviceId: s.id } };
  const first = near[0];
  return {
    text: `Ближайшее окно на «${s.name}» — **${fmtDayRel(first.date, today)} в ${first.time}**.${near.length > 1 ? ` Ещё есть: ${near.slice(1).map((x) => `${shortDay(x.date, today)} ${x.time}`).join(', ')}.` : ''}\n${describeSpan(cfg, s, first.date, first.time)}`,
    chips: [...near.map((x) => bookChip(s, x, `${shortDay(x.date, today)} ${x.time}`)), ...chipsMore],
    context: { intent: 'slots', serviceId: s.id },
  };
}

function groupNear(list, today) {
  const by = new Map();
  for (const x of list) { if (!by.has(x.date)) by.set(x.date, []); by.get(x.date).push(x.time); }
  return [...by].slice(0, 2).map(([d, ts]) => `${fmtDayRel(d, today)} — ${ts.join(', ')}`).join('; ');
}

function groupFilter(list, pref) {
  if (pref.exact !== undefined) return list.filter((x) => Math.abs(hm(x.time) - pref.exact) <= 90);
  return list.filter((x) => hm(x.time) >= pref.from && hm(x.time) < pref.to);
}

function shortDay(d, today) {
  const diff = Math.round((toMin(d + 'T00:00') - toMin(today + 'T00:00')) / 1440);
  if (diff === 0) return 'Сегодня';
  if (diff === 1) return 'Завтра';
  const wd = WD_SHORT[weekday(d)];
  return `${wd[0].toUpperCase() + wd.slice(1)} ${+d.slice(8, 10)}.${d.slice(5, 7)}`;
}

function contactChips(cfg) {
  const c = [];
  if (cfg.phone) c.push({ label: `Позвонить`, href: phoneHref(cfg.phone) });
  if (cfg.telegram) c.push({ label: 'Telegram', href: tgHref(cfg.telegram) });
  if (cfg.whatsapp) c.push({ label: 'WhatsApp', href: waHref(cfg.whatsapp) });
  return c;
}

function priceAnswer(cfg, s) {
  return {
    text: `${svcLine(cfg, s)}.${s.description ? '\n' + s.description : ''}${s.priceFrom ? '\nТочная цена зависит от размера и состояния машины — мастер назовёт её на осмотре.' : ''}`,
    chips: [{ label: 'Ближайшее окно', send: `Когда ближайшее окно на ${s.name}?` }, { label: 'Записаться', book: { serviceId: s.id } }],
    context: { intent: 'price', serviceId: s.id },
  };
}

function hoursAnswer(cfg, t) {
  const now = nowOf(cfg), today = dateOf(now);
  const st = openStatus(cfg, now);
  const asked = parseDate(t, today);
  if (asked) {
    const w = dayWindow(cfg, asked);
    const label = fmtDayRel(asked, today);
    return { text: w ? `${cap(label)} работаем с ${timeOf(w[0])} до ${timeOf(w[1])}.` : `${cap(label)} — выходной.`, chips: [{ label: 'Свободное время', send: `Когда ближайшее окно${w ? ' ' + (asked === today ? 'сегодня' : 'на ' + fmtDay(asked, { wd: false })) : ''}?` }], context: { intent: 'hours' } };
  }
  const lines = scheduleLines(cfg).map((l) => `${l.days}: ${l.hours}`).join('\n');
  const off = (cfg.daysOff || []).filter((d) => d >= today && d <= addDays(today, 30));
  return {
    text: `${st.text}.\n\n${lines}${off.length ? `\n\nНе работаем: ${off.map((d) => fmtDay(d, { wd: false })).join(', ')}.` : ''}`,
    chips: [{ label: 'Когда ближайшее окно?', send: 'Когда ближайшее окно?' }, { label: 'Как вас найти?', send: 'Как найти студию?' }],
    context: { intent: 'hours' },
  };
}
const cap = (s) => s[0].toUpperCase() + s.slice(1);

function locationAnswer(cfg) {
  const links = mapLinks(cfg);
  return {
    text: `📍 ${[cfg.city, cfg.address].filter(Boolean).join(', ') || 'Адрес уточните по телефону'}.${cfg.howToFind ? '\n' + cfg.howToFind : ''}`,
    chips: [{ label: 'Яндекс Карты', href: links.yandex }, { label: '2ГИС', href: links.gis }, ...contactChips(cfg).slice(0, 1)],
    context: { intent: 'location' },
  };
}

function servicesAnswer(cfg) {
  const list = cfg.services.filter((s) => !s.hidden);
  const groups = new Map();
  for (const s of list) { const g = s.category || 'Услуги'; if (!groups.has(g)) groups.set(g, []); groups.get(g).push(s); }
  const text = [...groups].map(([g, ss]) => `${groups.size > 1 ? `**${g}**\n` : ''}${ss.map((s) => `• ${s.name} — ${fmtPrice(s, cfg.currency)}`).join('\n')}`).join('\n\n');
  return { text: `${text}\n\nО какой услуге рассказать подробнее?`, chips: popular(cfg, 5).map((s) => ({ label: s.name, send: `Расскажите про ${s.name}` })), context: { intent: 'services' } };
}

/**
 * Главная функция. ctx — контекст прошлого ответа, который клиент присылает обратно.
 */
export async function answerClient(cfg, message, ctx = {}) {
  const raw = String(message || '').slice(0, 500);
  const t = norm(raw);
  if (!t) return { text: 'Напишите вопрос — например, про цену или свободное время.', chips: exampleQuestions(cfg).map((q) => ({ label: q, send: q })) };
  const services = cfg.services.filter((s) => !s.hidden);
  let intent = detect(t);
  const m = matchServices(raw, services);
  let svc = m.best;
  // «а на завтра?», «а сколько стоит?» — продолжаем прошлую тему
  if (!svc && ctx.serviceId && !m.matches.length) svc = services.find((s) => s.id === ctx.serviceId) || null;
  const hasWhen = parseDate(t, dateOf(nowOf(cfg))) || parseTimePref(t);
  if (!intent && hasWhen && (svc || ctx.serviceId)) { intent = 'slots'; svc = svc || services.find((s) => s.id === ctx.serviceId) || null; }
  if (!intent && ['slots', 'price', 'duration', 'services'].includes(ctx.intent) && (m.matches.length || parseDate(t, dateOf(nowOf(cfg))) || parseTimePref(t))) intent = ctx.intent === 'services' ? 'price' : ctx.intent;
  if (!intent && (parseDate(t, dateOf(nowOf(cfg))) || /^(а )?(в|на|к) /.test(t)) && svc) intent = 'slots';
  if (services.length === 1 && !svc) svc = services[0];

  switch (intent) {
    case 'greet': return { text: `Здравствуйте! Я помощник «${cfg.name}». Подскажу цены, свободное время и как нас найти.`, chips: exampleQuestions(cfg).map((q) => ({ label: q, send: q })) };
    case 'thanks': return { text: 'Обращайтесь! Если захотите записаться — я подберу время.', chips: [{ label: 'Записаться', book: {} }] };
    case 'location': return locationAnswer(cfg);
    case 'contact': return { text: [cfg.phone && `Телефон: ${cfg.phone}`, cfg.telegram && `Telegram: ${cfg.telegram}`, cfg.whatsapp && `WhatsApp: ${cfg.whatsapp}`].filter(Boolean).join('\n') || 'Контакты пока не указаны.', chips: contactChips(cfg), context: {} };
    case 'hours': return hoursAnswer(cfg, t);
    case 'services': if (!svc) return servicesAnswer(cfg); return priceAnswer(cfg, svc);
    case 'payment': return { text: cfg.paymentInfo || 'Оплата после выполнения работ — наличными, картой или переводом. Если нужно что-то особенное, уточните у мастера.', chips: contactChips(cfg).slice(0, 1) };
    case 'cancel': return { text: 'Отменить запись можно в разделе «Мои записи» — кнопка вверху экрана. Чтобы перенести, отмените и выберите новое время или позвоните нам.', chips: [{ label: 'Мои записи', action: 'my' }, ...contactChips(cfg).slice(0, 1)] };
    case 'slots':
      if (!svc) return askWhichService(cfg, 'slots', m.matches, { date: parseDate(t, dateOf(nowOf(cfg))) || undefined, pref: parseTimePref(t) || undefined });
      return slotsAnswer(cfg, svc, raw, ctx.awaiting ? ctx : {});
    case 'price':
      if (!svc) {
        if (m.matches.length > 1) return { text: `Цены:\n${m.matches.slice(0, 6).map((s) => '• ' + svcLine(cfg, s)).join('\n')}\n\nКакая из них нужна?`, chips: m.matches.slice(0, 6).map((s) => ({ label: s.name, send: s.name })), context: { intent: 'price', awaiting: 'service' } };
        return askWhichService(cfg, 'price', null);
      }
      return priceAnswer(cfg, svc);
    case 'duration':
      if (!svc) return askWhichService(cfg, 'duration', m.matches);
      return { text: `«${svc.name}» занимает ${fmtDuration(svc)}${svc.days ? ' — машина остаётся у нас на это время' : ''}.`, chips: [{ label: 'Ближайшее окно', send: `Ближайшее окно на ${svc.name}` }], context: { intent: 'duration', serviceId: svc.id } };
  }

  // Назвали только услугу
  if (svc && (m.best || ctx.awaiting)) {
    if (ctx.awaiting && ctx.intent === 'slots') return slotsAnswer(cfg, svc, raw, ctx);
    if (ctx.awaiting && ctx.intent === 'duration') return answerClient(cfg, `сколько времени ${svc.name}`, {});
    return priceAnswer(cfg, svc);
  }
  if (m.matches.length > 1) return { text: 'Уточните, какая услуга имеется в виду:', chips: m.matches.slice(0, 6).map((s) => ({ label: s.name, send: s.name })), context: { intent: ctx.intent || 'price', awaiting: 'service' } };

  // Не поняли — спрашиваем у модели (если подключена), иначе уточняем.
  if (llmEnabled()) {
    const text = await askLlm(clientFacts(cfg), raw, 'client').catch(() => null);
    if (text) return { text, chips: exampleQuestions(cfg).map((q) => ({ label: q, send: q })) };
  }
  return {
    text: 'Не уверен, что правильно понял. Я отвечаю на вопросы о ценах, свободном времени, адресе и графике. Что именно вас интересует?',
    chips: [...exampleQuestions(cfg).map((q) => ({ label: q, send: q })), { label: 'Все услуги и цены', send: 'Какие у вас услуги?' }],
  };
}

/** Сводка фактов о студии для языковой модели (если подключена). */
function clientFacts(cfg) {
  const now = nowOf(cfg), today = dateOf(now), bookings = busyBookings(cfg);
  const svc = cfg.services.filter((s) => !s.hidden).map((s) => {
    const near = nearestSlots(cfg, bookings, s, now, 3, 1).map((x) => `${fmtDayRel(x.date, today)} ${x.time}`).join('; ');
    return `- ${s.name}${s.category ? ' [' + s.category + ']' : ''}: ${fmtPrice(s, cfg.currency)}, ${fmtDuration(s)}. ${s.description || ''} Ближайшие окна: ${near || 'нет'}`;
  }).join('\n');
  return `Студия «${cfg.name}» (${cfg.kind}). Сегодня ${fmtDay(today)}, сейчас ${timeOf(now)}. ${openStatus(cfg, now).text}.
Адрес: ${[cfg.city, cfg.address].filter(Boolean).join(', ')}. ${cfg.howToFind || ''}
Телефон: ${cfg.phone || '—'}. График: ${scheduleLines(cfg).map((l) => `${l.days} ${l.hours}`).join(', ')}.
Информация: ${cfg.cards.map((c) => `${c.title} — ${c.text}`).join('; ')}
${cfg.paymentInfo ? 'Оплата: ' + cfg.paymentInfo : ''}
Услуги:
${svc}`;
}

