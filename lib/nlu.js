// Разбор русских фраз: даты, периоды, время суток, поиск услуги по словам.
import { addDays, weekday, startOfWeek, startOfMonth, endOfMonth, pad, MONTHS_GEN } from '../core/time.js';

// В JS \b не считает кириллицу буквами — делаем свою границу слова.
const UB = '(?:(?<![\\p{L}\\d])(?=[\\p{L}\\d])|(?<=[\\p{L}\\d])(?![\\p{L}\\d]))';
export const ub = (re) => new RegExp(re.source.replaceAll('\\b', UB), re.flags.includes('u') ? re.flags : re.flags + 'u');

export function norm(s) {
  return String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/(\d)[.](\d)/g, '$1/$2').replace(/(\d):(\d)/g, '$1\u2236$2').replace(/[«»"“”„!?.,;:()\[\]{}…—–]/g, ' ').replace(/\u2236/g, ':').replace(/\s+/g, ' ').trim();
}
export const words = (s) => norm(s).split(' ').filter(Boolean);

/** Грубый стеммер: отрезаем окончание. Хватает для сравнения форм слова. */
export function stem(w) {
  w = norm(w);
  if (w.length <= 4) return w;
  const cut = w.replace(/(ами|ями|ого|его|ому|ему|ыми|ими|ией|ой|ей|ий|ый|ая|яя|ое|ее|ые|ие|ую|юю|ам|ям|ах|ях|ом|ем|ов|ев|ию|ия|ье|ья|а|я|ы|и|у|ю|е|о|ь)$/, '');
  return cut.length >= 4 ? cut : w.slice(0, 4);
}

const WD_STEMS = [
  ['воскрес', 0], ['понедел', 1], ['вторн', 2], ['сред', 3], ['четвер', 4], ['пятниц', 5], ['суббот', 6],
];
const WD_ABBR = { 'пн': 1, 'вт': 2, 'ср': 3, 'чт': 4, 'пт': 5, 'сб': 6, 'вс': 0 };
const MONTH_STEMS = ['январ', 'феврал', 'март', 'апрел', 'ма', 'июн', 'июл', 'август', 'сентябр', 'октябр', 'ноябр', 'декабр'];

/** Найти в тексте конкретный день. Возвращает 'YYYY-MM-DD' или null. */
export function parseDate(text, today) {
  const t = norm(text);
  if (ub(/\bпослезавтра\b/).test(t)) return addDays(today, 2);
  if (ub(/\bзавтра\b/).test(t)) return addDays(today, 1);
  if (ub(/\bсегодня\b|\bсейчас\b/).test(t)) return today;
  if (ub(/\bвчера\b/).test(t)) return addDays(today, -1);
  // 05.11 / 5.11.2026 / 5/11
  let m = t.match(ub(/\b(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?\b/));
  if (m) {
    const d = +m[1], mo = +m[2];
    if (d >= 1 && d <= 31 && mo >= 1 && mo <= 12) {
      let y = m[3] ? +m[3] : +today.slice(0, 4);
      if (y < 100) y += 2000;
      let ds = `${y}-${pad(mo)}-${pad(d)}`;
      if (!m[3] && ds < addDays(today, -60)) ds = `${y + 1}-${pad(mo)}-${pad(d)}`;
      return ds;
    }
  }
  // 5 ноября
  m = t.match(ub(/\b(\d{1,2})\s+(январ|феврал|март|апрел|ма[яй]|июн|июл|август|сентябр|октябр|ноябр|декабр)[а-я]*/));
  if (m) {
    const mo = MONTH_STEMS.findIndex((s) => m[2].startsWith(s)) + 1;
    let y = +today.slice(0, 4);
    let ds = `${y}-${pad(mo)}-${pad(+m[1])}`;
    if (ds < addDays(today, -60)) ds = `${y + 1}-${pad(mo)}-${pad(+m[1])}`;
    return ds;
  }
  // «5-го», «на 12 число»
  m = t.match(ub(/\b(\d{1,2})(?:-?го| числа| число)\b/));
  if (m) {
    const d = +m[1];
    let ds = `${today.slice(0, 7)}-${pad(d)}`;
    if (ds < today) { const nm = addDays(endOfMonth(today), 1); ds = `${nm.slice(0, 7)}-${pad(d)}`; }
    return ds;
  }
  // день недели: ближайший такой день (сегодня — тоже подходит)
  let wd = null;
  for (const w of t.split(' ')) {
    const hit = WD_STEMS.find(([s]) => w.startsWith(s));
    if (hit) { wd = hit[1]; break; }
    if (w in WD_ABBR) { wd = WD_ABBR[w]; break; }
  }
  if (ub(/\bвыходны[ех]\b/).test(t) && wd === null) wd = 6;
  if (wd !== null) {
    const next = /следующ/.test(t);
    let diff = (wd - weekday(today) + 7) % 7;
    if (next && diff < 7) diff += diff === 0 ? 7 : 0;
    if (next && ub(/\bнедел/).test(t)) { const sow = addDays(startOfWeek(today), 7); return addDays(sow, (wd + 6) % 7); }
    return addDays(today, diff);
  }
  return null;
}

/** Период для отчётов владельца. {from,to,label} или null. */
export function parsePeriod(text, today) {
  const t = norm(text);
  const sow = startOfWeek(today);
  if (ub(/\b(прошл[а-я]*|предыдущ[а-я]*) недел/).test(t)) return { from: addDays(sow, -7), to: addDays(sow, -1), label: 'прошлую неделю', kind: 'week' };
  if (ub(/\b(следующ[а-я]*|будущ[а-я]*) недел/).test(t)) return { from: addDays(sow, 7), to: addDays(sow, 13), label: 'следующую неделю', kind: 'week' };
  if (ub(/\bнедел/).test(t)) return { from: sow, to: addDays(sow, 6), label: 'эту неделю', kind: 'week' };
  if (/прошл[а-я]* месяц|предыдущ[а-я]* месяц/.test(t)) { const e = addDays(startOfMonth(today), -1); return { from: startOfMonth(e), to: e, label: 'прошлый месяц', kind: 'month' }; }
  if (/месяц/.test(t)) return { from: startOfMonth(today), to: endOfMonth(today), label: 'этот месяц', kind: 'month' };
  let m = t.match(/(?:за|последни[ех])\s+(\d{1,3})\s+(?:дн|день)/);
  if (m) return { from: addDays(today, -(+m[1] - 1)), to: today, label: `последние ${m[1]} дн.`, kind: 'days' };
  m = t.match(ub(/\bв\s+(январ|феврал|март|апрел|ма[ея]|июн|июл|август|сентябр|октябр|ноябр|декабр)[а-я]*/));
  if (m) {
    const mo = MONTH_STEMS.findIndex((s) => m[1].startsWith(s)) + 1;
    let y = +today.slice(0, 4); if (mo > +today.slice(5, 7)) y--;
    const from = `${y}-${pad(mo)}-01`;
    return { from, to: endOfMonth(from), label: MONTHS_GEN[mo - 1].replace(/я$/, 'ь').replace(/а$/, ''), kind: 'month' };
  }
  if (ub(/\bгод/).test(t)) return { from: today.slice(0, 4) + '-01-01', to: today.slice(0, 4) + '-12-31', label: 'этот год', kind: 'year' };
  const d = parseDate(t, today);
  if (d) return { from: d, to: d, label: null, kind: 'day' };
  return null;
}

/** Пожелание по времени: {from,to} в минутах от начала дня, или точное время. */
export function parseTimePref(text) {
  const t = norm(text);
  let m = t.match(ub(/\b(?:в|к|на|около)\s*(\d{1,2})(?::(\d{2}))?(?![\d/])\s*(?:час|ч\b|утра|дня|вечера)?/));
  if (m && +m[1] <= 23 && !/\d\s*(?:январ|феврал|март|апрел|ма|июн|июл|август|сентябр|октябр|ноябр|декабр|числ)/.test(t.slice(m.index, m.index + 14))) {
    let h = +m[1];
    if (/вечера|дня/.test(t) && h < 12) h += 12;
    if (h >= 6) return { exact: h * 60 + (+m[2] || 0) };
  }
  m = t.match(/после\s*(\d{1,2})/); if (m) return { from: +m[1] * 60, to: 24 * 60 };
  m = t.match(/до\s*(\d{1,2})(?!\s*(?:январ|феврал|март|апрел|ма|июн|июл|август|сентябр|октябр|ноябр|декабр))/); if (m && !/до\s*скольк/.test(t)) return { from: 0, to: +m[1] * 60 };
  if (/утр/.test(t)) return { from: 0, to: 12 * 60 };
  if (/после обеда|днем|днём/.test(t)) return { from: 12 * 60, to: 17 * 60 };
  if (/вечер/.test(t)) return { from: 17 * 60, to: 24 * 60 };
  return null;
}

// Слова, которые не помогают отличить одну услугу от другой.
const STOP = new Set(['сколько', 'стоит', 'стоимость', 'цена', 'цены', 'цену', 'когда', 'можно', 'нужно', 'надо', 'хочу', 'хотел', 'хотела', 'записаться', 'запись',
  'запишите', 'ближайшее', 'ближайшая', 'окно', 'окна', 'свободно', 'свободное', 'время', 'машину', 'машина', 'машины', 'авто', 'автомобиль', 'автомобиля',
  'услуга', 'услуги', 'услугу', 'сделать', 'делаете', 'есть', 'будет', 'сегодня', 'завтра', 'послезавтра', 'пожалуйста', 'подскажите', 'скажите', 'какая', 'какой',
  'какие', 'полная', 'полный', 'полное', 'комплекс', 'комплексная', 'работа', 'работы', 'студия', 'студию', 'сервис', 'около', 'утром', 'вечером', 'неделе', 'неделю']);

function svcTokens(svc) {
  const base = [svc.name, svc.category].join(' ');
  const toks = words(base).filter((w) => w.length >= 3 && !STOP.has(w)).map(stem);
  const kw = (svc.keywords || []).map((k) => words(k).map(stem)).flat();
  return { name: [...new Set(toks)], kw: [...new Set(kw)] };
}
const same = (a, b) => a === b || (a.length >= 5 && b.length >= 5 && (a.startsWith(b) || b.startsWith(a)));

/**
 * Найти услугу в тексте. Возвращает { best, matches } — matches отсортированы,
 * если лучших несколько с близким счётом, это повод уточнить.
 */
export function matchServices(text, services) {
  const ws = words(text).filter((w) => w.length >= 3 && !STOP.has(w)).map(stem);
  if (!ws.length) return { best: null, matches: [] };
  const exact = services.find((s) => norm(s.name) === norm(text));
  if (exact) return { best: exact, matches: [exact], exact: true };
  const scored = [];
  for (const s of services) {
    const { name, kw } = svcTokens(s);
    let score = 0, hit = 0;
    for (const w of ws) {
      if (kw.some((k) => same(k, w))) { score += 3; hit++; continue; }
      if (name.some((n) => same(n, w))) { score += 2; hit++; }
    }
    if (score) {
      score += hit / Math.max(1, name.length) // полнее совпадение — выше
        + (s.popular ? 0.15 : 0);
      scored.push({ s, score });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  if (!scored.length) return { best: null, matches: [] };
  const top = scored[0].score;
  const close = scored.filter((x) => x.score >= top - 0.6 && Math.floor(x.score) === Math.floor(top));
  return { best: close.length === 1 ? close[0].s : null, matches: close.map((x) => x.s), all: scored.map((x) => x.s) };
}

/** Короткое название услуги для примеров («полировка» из «Полировка кузова»). */
export function shortName(svc) {
  return norm(svc.name).split(' ')[0];
}
