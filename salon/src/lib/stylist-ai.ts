import type { Service, Staff } from './types';

/**
 * Симуляция AI-стилиста: взвешенное сопоставление намерений по ключевым словам.
 * Интерфейс — как у настоящего LLM-вызова (async), чтобы позже заменить на API без правок UI.
 */
interface Rule {
  keys: RegExp;
  services: string[];
  staff?: string;
  reason: string;
}

const RULES: Rule[] = [
  { keys: /кар[еэ]|боб|каре|графич/i, services: ['cut-bob'], staff: 'alex', reason: 'каре — фирменная техника Алекса' },
  { keys: /ярк|розов|медн|рыж|красн|фиолет|син|цветн|креатив/i, services: ['color-bold'], staff: 'vera', reason: 'яркие пигменты лучше всего держатся у колориста' },
  { keys: /блонд|балаяж|airtouch|шатуш|блик|выгор|мелир|осветл/i, services: ['color-air'], staff: 'vera', reason: 'мягкие переходы — специализация Вероники' },
  { keys: /окраш|покрас|цвет|седин|тон/i, services: ['color-one'], staff: 'vera', reason: 'ровный стойкий цвет без сюрпризов' },
  { keys: /муж|фейд|барбер|бород|коротк/i, services: ['cut-m'], staff: 'daniel', reason: 'Даниил — эксперт по мужским стрижкам' },
  { keys: /стриж|подстри|длин|чёлк|челк|кончик/i, services: ['cut-w'], staff: 'alex', reason: 'форма, которая легко укладывается дома' },
  { keys: /уклад|локон|волн|праздн|вечеринк|выпуск/i, services: ['styling'], reason: 'укладка держится весь вечер' },
  { keys: /сух|ломк|восстан|уход|секущ|блеск/i, services: ['care'], reason: 'вернём волосам плотность и блеск' },
  { keys: /маникюр|ногт|ногот|гель|nail/i, services: ['mani'], staff: 'marina', reason: 'аккуратное покрытие до 3 недель' },
  { keys: /дизайн|френч|арт|рисун/i, services: ['nail-art'], staff: 'marina', reason: 'Марина — nail-артист' },
  { keys: /педикюр|стоп|ног[иа]\b/i, services: ['pedi'], staff: 'marina', reason: 'SPA-педикюр с массажем' },
  { keys: /бров/i, services: ['brows'], staff: 'sofia', reason: 'идеальная форма под черты лица' },
  { keys: /ресниц|взгляд|ламин/i, services: ['lash-lam'], staff: 'sofia', reason: 'выразительный взгляд без туши' },
  { keys: /нарощ|объ[её]м.*ресниц/i, services: ['lash-ext'], staff: 'sofia', reason: 'естественный эффект 2D' },
  { keys: /свадь|невест/i, services: ['mk-wed', 'styling'], staff: 'eva', reason: 'полный свадебный образ с пробой' },
  { keys: /вечер|ужин|концерт|свидан|корпоратив|мероприят/i, services: ['mk-eve'], staff: 'eva', reason: 'стойкий вечерний образ' },
  { keys: /макияж|мейк|образ|визаж/i, services: ['mk-day'], staff: 'eva', reason: 'свежий нюдовый образ' },
  { keys: /обнов|перемен|нов(ый|ого)\s+образ|сменить/i, services: ['cut-w', 'color-one'], staff: 'alex', reason: 'стрижка + цвет — полное перевоплощение' },
];

export interface AiSuggestion {
  services: Service[];
  staff: Staff | null;
  message: string;
}

export async function askStylist(goal: string, services: Service[], staff: Staff[]): Promise<AiSuggestion> {
  await new Promise((r) => setTimeout(r, 900 + Math.random() * 700));
  const hits = RULES.filter((r) => r.keys.test(goal));

  // убираем пересекающиеся рекомендации: «яркий цвет» не должен тянуть ещё и базовое окрашивание
  const colorHit = hits.find((h) => h.services.some((s) => s.startsWith('color-')));
  const filtered = hits.filter((h) => !(h !== colorHit && h.services.every((s) => s.startsWith('color-'))));
  const cutHit = filtered.find((h) => h.services.some((s) => s.startsWith('cut-')));
  const final = filtered.filter((h) => !(h !== cutHit && h.services.every((s) => s.startsWith('cut-')))).slice(0, 3);

  if (!final.length) {
    const fallback = services.filter((s) => s.popular).slice(0, 2);
    return {
      services: fallback,
      staff: null,
      message:
        'Не до конца понял задачу, но вот что чаще всего выбирают гости Atelier. Попробуйте описать результат: «хочу каре и яркий цвет», «маникюр нюд», «образ на свадьбу».',
    };
  }

  const ids = [...new Set(final.flatMap((h) => h.services))];
  // жадно набираем услуги, пока есть мастер, способный выполнить их все за один визит
  const picked: Service[] = [];
  let capable = staff;
  for (const id of ids) {
    const sv = services.find((s) => s.id === id);
    if (!sv) continue;
    const next = capable.filter((s) => s.categories.includes(sv.category));
    if (!next.length) continue;
    picked.push(sv);
    capable = next;
  }
  const staffVotes = final.map((h) => h.staff).filter(Boolean) as string[];
  const voted = capable.find((s) => staffVotes.includes(s.id)) ?? capable[0] ?? null;
  const skipped = ids.length - picked.length;

  const reasons = final.filter((h) => h.services.some((id) => picked.some((p) => p.id === id))).map((h) => h.reason);
  const message = `${picked.map((s) => s.name).join(' + ')}: ${reasons.join(', ')}.${
    voted ? ` Рекомендую мастера ${voted.name.split(' ')[0]} — ${voted.tags[0].toLowerCase()}.` : ''
  }${skipped ? ' Остальное лучше оформить отдельной записью к другому мастеру.' : ''}`;
  return { services: picked, staff: voted, message };
}
