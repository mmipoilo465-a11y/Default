// Помощник владельца: «Что у меня завтра?», «Сколько машин было на неделе?», «Сколько денег получено?»
// Все ответы считаются из базы.
import { norm, parsePeriod, parseDate, ub } from './nlu.js';
import { nowOf, busyBookings } from './bookings.js';
import * as DB from './db.js';
import { summarize, overlapping, paidOf, dueOf, STATUS } from '../core/stats.js';
import { freeIntervals } from '../core/slots.js';
import { dateOf, addDays, fmtDayRel, fmtRange, fmtMoney, plural, timeOf, toMin, fmtDay } from '../core/time.js';
import { askLlm, llmEnabled } from './llm.js';

const RX = {
  unpaid: /не ?оплат|неоплач|долг|должн|задолж|не заплат|кто не/,
  money: /деньг|денег|получ|выручк|заработ|касс|оплат|доход|прибыл|собрал|возврат|сколько (мы )?(взял|сделал)|оборот|чек/,
  cancelled: /отмен/,
  free: /свобод|окн[ао]|пуст|есть (ли )?место|загруз|влезет|успеем/,
  next: /следующ|кто (дальше|первый|первым)|ближайш[а-я]* (запис|клиент|машин)/,
  count: /сколько (было |будет |всего )?(машин|заезд|запис|клиент|авто)|количеств|заездов|машин было|сколько приехал/,
  top: /популяр|топ|чаще всего|какие услуги/,
  ready: /готов[ыо]? (к выдаче|забрать)|кого (выдать|отдать)|готовые/,
  schedule: /что (у меня|у нас|по записям|там)|запис|расписан|кто (сегодня|завтра|приедет|будет)|план|какие машины|кто записан/,
  help: /помощь|что (ты )?умеешь|помоги|команды/,
};

const SAMPLES = ['Что у меня завтра?', 'Сколько машин было на неделе?', 'Сколько денег получено?', 'Есть окна сегодня?'];
const chips = (list) => list.map((q) => ({ label: q, send: q }));

function load(cfg, from, to) {
  return DB.bookingsInRange(cfg.slug, from + 'T00:00', addDays(to, 1) + 'T00:00');
}
const plabel = (p, today) => p.kind === 'day' ? fmtDayRel(p.from, today) : `${p.label ? p.label.replace(/^эту/, 'этой').replace(/^прошлую/, 'прошлой').replace(/^следующую/, 'следующей').replace(/неделю$/, 'неделе') : ''} (${fmtRange(p.from, p.to)})`;
const prefix = (p, today) => p.kind === 'day' ? cap(fmtDayRel(p.from, today)) : p.kind === 'week' ? `На ${plabel(p, today)}` : `За ${p.label} (${fmtRange(p.from, p.to)})`;
const cap = (s) => s[0].toUpperCase() + s.slice(1);

function bookingLine(cfg, b, day) {
  const box = cfg.boxes.find((x) => x.id === b.boxId)?.name || '';
  const sameDay = b.start.slice(0, 10) === day;
  const multi = b.end.slice(0, 10) !== b.start.slice(0, 10);
  const time = sameDay ? b.start.slice(11) : 'продолжается';
  const tail = multi && sameDay ? ` (до ${fmtDay(b.end.slice(0, 10), { wd: false })})` : '';
  const due = dueOf(b);
  return `• **${time}** ${b.serviceName}${tail} — ${[b.car, b.clientName].filter(Boolean).join(', ') || 'без данных'}${box ? ` · ${box}` : ''} · ${STATUS[b.status]}${b.status !== 'cancelled' && due && b.price ? ` · к оплате ${fmtMoney(due, cfg.currency)}` : ''}`;
}

function dayAnswer(cfg, day, today) {
  const list = overlapping(load(cfg, day, day), day, day).filter((b) => b.status !== 'cancelled');
  const label = cap(fmtDayRel(day, today));
  if (!list.length) {
    const free = freeIntervals(cfg, busyBookings(cfg), day);
    return { text: `${label} записей нет.${free ? ' Все боксы свободны.' : ' Это выходной по графику.'}`, chips: chips(['Сколько машин было на неделе?', 'Сколько денег получено?']), open: { date: day, view: 'day' } };
  }
  const sum = list.reduce((s, b) => s + (b.start.slice(0, 10) === day ? b.price : 0), 0);
  const starts = list.filter((b) => b.start.slice(0, 10) === day).length;
  return {
    text: `${label}: ${starts} ${plural(starts, ['запись', 'записи', 'записей'])}${list.length > starts ? ` и ещё ${list.length - starts} в работе с прошлых дней` : ''}, по прайсу ${fmtMoney(sum, cfg.currency)}.\n\n${list.map((b) => bookingLine(cfg, b, day)).join('\n')}`,
    chips: chips(day === today ? ['Что у меня завтра?', 'Есть окна сегодня?'] : ['Что у меня сегодня?', 'Сколько денег получено?']),
    open: { date: day, view: 'day' },
  };
}

export async function answerOwner(cfg, message) {
  const t = norm(message);
  const now = nowOf(cfg), today = dateOf(now);
  if (!t || RX.help.test(t)) return { text: 'Спросите про записи, машины, деньги или свободное время — за любой день, неделю или месяц.', chips: chips(SAMPLES) };
  const period = parsePeriod(t, today);
  const intent = Object.keys(RX).find((k) => k !== 'schedule' && k !== 'help' && RX[k].test(t)) || (RX.schedule.test(t) || period ? 'schedule' : null);

  if (intent === 'unpaid') {
    const p = period || { from: addDays(today, -30), to: today, label: 'последние 30 дней', kind: 'days' };
    const list = load(cfg, p.from, addDays(today, 14)).filter((b) => b.status !== 'cancelled' && b.price > 0 && dueOf(b) > 0 && b.start.slice(0, 10) >= p.from)
      .filter((b) => b.status === 'ready' || b.status === 'accepted' || b.start.slice(0, 10) < today);
    if (!list.length) return { text: `Долгов нет: все машины за ${p.kind === 'day' ? fmtDayRel(p.from, today) : p.label} оплачены.`, chips: chips(['Сколько денег получено?']) };
    const total = list.reduce((s, b) => s + dueOf(b), 0);
    return { text: `Не оплачено ${list.length} ${plural(list.length, ['запись', 'записи', 'записей'])} на ${fmtMoney(total, cfg.currency)}:\n\n${list.map((b) => `• ${fmtDay(b.start.slice(0, 10), { wd: false })} ${b.start.slice(11)} — ${b.serviceName}, ${[b.car, b.clientName].filter(Boolean).join(', ')} · долг ${fmtMoney(dueOf(b), cfg.currency)}`).join('\n')}`, chips: chips(['Сколько денег получено?']) };
  }

  if (intent === 'money') {
    const p = period || { from: today, to: today, kind: 'day' };
    const s = summarize(load(cfg, p.from, p.to), p.from, p.to);
    let text = `${prefix(p, today)} получено **${fmtMoney(s.received, cfg.currency)}**`;
    text += s.payments ? ` — ${s.payments} ${plural(s.payments, ['оплата', 'оплаты', 'оплат'])}` : ' — оплат не было';
    if (s.refunds) text += `, возвраты ${fmtMoney(s.refunds, cfg.currency)} (до возвратов ${fmtMoney(s.gross, cfg.currency)})`;
    text += '.';
    if (s.total) text += `\nПо записям этого периода по прайсу: ${fmtMoney(s.expected, cfg.currency)}.`;
    const more = p.kind === 'day' && !period ? ['За неделю', 'За месяц'] : ['Кто не оплатил?'];
    return { text, chips: more.map((q) => ({ label: q, send: `Сколько денег получено ${q.toLowerCase()}?` })), open: { date: p.from, view: p.kind === 'day' ? 'day' : 'week' } };
  }

  if (intent === 'count' || intent === 'cancelled') {
    const p = period || { from: today, to: today, kind: 'day' };
    const s = summarize(load(cfg, p.from, p.to), p.from, p.to);
    if (intent === 'cancelled') return { text: `${prefix(p, today)}: ${s.cancelled} ${plural(s.cancelled, ['отмена', 'отмены', 'отмен'])}.`, chips: chips(['Сколько машин было на неделе?']) };
    const past = p.to < today, fut = p.from > today;
    let text = `${prefix(p, today)} ${fut ? 'записано' : past ? 'было' : 'всего'} **${s.total} ${plural(s.total, ['машина', 'машины', 'машин'])}**.`;
    if (!fut) text += `\nПринято ${s.arrived}, готово ${s.done}${s.waiting ? `, ещё ожидаем ${s.waiting}` : ''}${s.cancelled ? `, отмен ${s.cancelled}` : ''}.`;
    if (s.received) text += `\nПолучено ${fmtMoney(s.received, cfg.currency)}.`;
    return { text, chips: chips(p.kind === 'day' ? ['Сколько машин было на неделе?', 'Сколько денег получено?'] : ['Сколько денег получено за неделю?', 'Что у меня завтра?']), open: { date: p.from, view: p.kind === 'day' ? 'day' : 'week' } };
  }

  if (intent === 'free') {
    const day = (period && period.kind === 'day' ? period.from : parseDate(t, today)) || today;
    const fi = freeIntervals(cfg, busyBookings(cfg), day);
    const label = cap(fmtDayRel(day, today));
    if (!fi) return { text: `${label} выходной по графику.`, chips: chips(['Что у меня завтра?']) };
    const nowT = day === today ? timeOf(now) : '00:00';
    const lines = fi.map(({ box, gaps }) => {
      const g = gaps.map(([a, b]) => [a < nowT ? nowT : a, b]).filter(([a, b]) => a < b && toMin(`${day}T${b}`) - toMin(`${day}T${a}`) >= 30);
      return `• ${box.name}: ${g.length ? g.map(([a, b]) => `${a}–${b}`).join(', ') : 'занят'}`;
    });
    return { text: `${label} свободно:\n${lines.join('\n')}`, chips: chips([day === today ? 'Что у меня завтра?' : 'Что у меня сегодня?']), open: { date: day, view: 'day' } };
  }

  if (intent === 'next') {
    const list = load(cfg, today, addDays(today, 14)).filter((b) => b.status === 'booked' && b.start >= `${today}T${timeOf(now)}`).sort((a, b) => a.start.localeCompare(b.start));
    if (!list.length) return { text: 'Ближайших записей нет.', chips: chips(['Сколько машин было на неделе?']) };
    const b = list[0];
    return { text: `Следующая запись — ${fmtDayRel(b.start.slice(0, 10), today)} в ${b.start.slice(11)}: ${b.serviceName}, ${[b.car, b.clientName, b.clientPhone].filter(Boolean).join(', ')}.`, chips: chips(['Что у меня сегодня?', 'Что у меня завтра?']) };
  }

  if (intent === 'ready') {
    const list = load(cfg, addDays(today, -14), today).filter((b) => b.status === 'ready' && b.readyAt && b.readyAt.slice(0, 10) >= addDays(today, -3));
    if (!list.length) return { text: 'Готовых машин за последние дни нет.', chips: chips(['Что у меня сегодня?']) };
    return { text: `Готовы:\n${list.map((b) => `• ${b.serviceName} — ${[b.car, b.clientName, b.clientPhone].filter(Boolean).join(', ')}${dueOf(b) ? ` · к оплате ${fmtMoney(dueOf(b), cfg.currency)}` : ' · оплачено'}`).join('\n')}` };
  }

  if (intent === 'top') {
    const p = period || parsePeriod('месяц', today);
    const list = load(cfg, p.from, p.to).filter((b) => b.status !== 'cancelled' && b.start.slice(0, 10) >= p.from && b.start.slice(0, 10) <= p.to);
    if (!list.length) return { text: `За ${p.label || fmtRange(p.from, p.to)} записей не было.` };
    const by = new Map();
    for (const b of list) { const x = by.get(b.serviceName) || { n: 0, sum: 0 }; x.n++; x.sum += paidOf(b); by.set(b.serviceName, x); }
    const top = [...by].sort((a, b) => b[1].n - a[1].n).slice(0, 5);
    return { text: `Популярные услуги за ${p.label || fmtRange(p.from, p.to)}:\n${top.map(([n, x], i) => `${i + 1}. ${n} — ${x.n} ${plural(x.n, ['раз', 'раза', 'раз'])}, получено ${fmtMoney(x.sum, cfg.currency)}`).join('\n')}` };
  }

  if (intent === 'schedule') {
    const p = period || { from: today, to: today, kind: 'day' };
    if (p.kind === 'day') return dayAnswer(cfg, p.from, today);
    const list = load(cfg, p.from, p.to).filter((b) => b.status !== 'cancelled' && b.start.slice(0, 10) >= p.from && b.start.slice(0, 10) <= p.to);
    const byDay = new Map();
    for (const b of list) { const d = b.start.slice(0, 10); byDay.set(d, (byDay.get(d) || 0) + 1); }
    const lines = [...byDay].sort().map(([d, n]) => `• ${fmtDay(d)} — ${n} ${plural(n, ['запись', 'записи', 'записей'])}`);
    return { text: `${prefix(p, today)}: ${list.length} ${plural(list.length, ['запись', 'записи', 'записей'])}.${lines.length ? '\n\n' + lines.join('\n') : ''}`, chips: chips(['Что у меня завтра?', 'Сколько денег получено за неделю?']), open: { date: p.from, view: 'week' } };
  }

  if (llmEnabled()) {
    const p = parsePeriod('месяц', today);
    const list = load(cfg, addDays(today, -31), addDays(today, 14));
    const facts = `Сегодня ${fmtDay(today)}. Боксы: ${cfg.boxes.map((b) => b.name).join(', ')}.\nЗаписи (дата, услуга, статус, цена, оплачено):\n` +
      list.map((b) => `${b.start} ${b.serviceName} ${STATUS[b.status]} ${b.price} ${paidOf(b)}`).join('\n') /* без имён и телефонов клиентов */ +
      `\nСводка за месяц: ${JSON.stringify(summarize(list, p.from, p.to))}`;
    const text = await askLlm(facts, message, 'owner').catch(() => null);
    if (text) return { text, chips: chips(SAMPLES) };
  }
  return { text: 'Не понял вопрос. Я отвечаю про записи, машины, деньги и свободное время. Уточните, что и за какой период посмотреть?', chips: chips(SAMPLES) };
}
