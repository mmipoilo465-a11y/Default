// Настройки студий: один JSON-файл на студию в data/studios/<slug>.json.
// Файл можно править руками — изменения подхватываются без перезапуска.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { STUDIOS_DIR, EXAMPLES } from './paths.js';
import { hashPassword, genPassword } from './auth.js';
import { WD_ORDER, isTime, isDate } from '../core/time.js';

const cache = new Map(); // slug -> { mtime, cfg }
export const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,40}$/;
const fileOf = (slug) => path.join(STUDIOS_DIR, `${slug}.json`);

/** При первом запуске копируем примеры, чтобы было что открыть. */
export function seedExamples({ randomPasswords = false } = {}) {
  const have = fs.readdirSync(STUDIOS_DIR).filter((f) => f.endsWith('.json'));
  if (have.length) return;
  const dir = path.join(EXAMPLES, 'examples');
  if (!fs.existsSync(dir)) return;
  const lines = [];
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    const cfg = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    // В рабочей установке демо-пароли из примеров публичны — заменяем на случайные.
    if (randomPasswords) { const pw = genPassword(); cfg.owner = { email: cfg.owner.email, password: pw, mustChange: true }; lines.push(`/${f.slice(0, -5)}/admin  ${cfg.owner.email}  ${pw}`); }
    fs.writeFileSync(path.join(STUDIOS_DIR, f), JSON.stringify(cfg, null, 2) + '\n');
  }
  if (lines.length) {
    const file = path.join(path.dirname(STUDIOS_DIR), 'initial-passwords.txt');
    fs.writeFileSync(file, lines.join('\n') + '\n', { mode: 0o600 });
    console.log(`Пароли примеров записаны в ${file}`);
  }
}

export function listStudios() {
  return fs.readdirSync(STUDIOS_DIR).filter((f) => f.endsWith('.json') && !f.startsWith('_')).map((f) => f.slice(0, -5)).filter((s) => SLUG_RE.test(s));
}

export const newId = (p = '') => p + crypto.randomBytes(4).toString('hex');

/** Приводим конфиг к единому виду: недостающие поля получают значения по умолчанию. */
export function normalize(cfg, slug) {
  const c = { ...cfg };
  c.slug = slug;
  c.name = String(c.name || slug);
  c.kind = c.kind ?? 'Детейлинг-студия';
  c.timezone = c.timezone || 'Europe/Moscow';
  c.currency = c.currency || '₽';
  c.theme = { accent: '#C8FF2E', ...(c.theme || {}) };
  c.cards = Array.isArray(c.cards) ? c.cards.slice(0, 3) : [];
  while (c.cards.length < 3) c.cards.push({ title: '', text: '' });
  c.gallery = (Array.isArray(c.gallery) ? c.gallery : []).map((g) => ({ id: g.id || newId('w'), image: g.image || '', caption: g.caption || '' }));
  c.schedule = c.schedule || {};
  for (const k of WD_ORDER) if (!(k in c.schedule)) c.schedule[k] = null;
  c.daysOff = Array.isArray(c.daysOff) ? c.daysOff.filter(isDate).sort() : [];
  c.specialDays = c.specialDays && typeof c.specialDays === 'object' ? c.specialDays : {};
  c.boxes = (Array.isArray(c.boxes) && c.boxes.length ? c.boxes : [{ id: 'b1', name: 'Бокс 1' }]).map((b) => ({ id: b.id || newId('b'), name: b.name || 'Бокс', active: b.active !== false }));
  c.services = (Array.isArray(c.services) ? c.services : []).map((s) => ({
    id: s.id || newId('s'),
    name: String(s.name || 'Услуга'),
    category: s.category || '',
    price: Math.max(0, Number(s.price) || 0),
    priceFrom: !!s.priceFrom,
    durationMin: s.days ? undefined : Math.max(10, Number(s.durationMin) || 60),
    days: s.days ? Math.max(1, Math.round(Number(s.days))) : undefined,
    boxes: Array.isArray(s.boxes) ? s.boxes : [],
    description: s.description || '',
    keywords: Array.isArray(s.keywords) ? s.keywords : (s.keywords ? String(s.keywords).split(',').map((x) => x.trim()).filter(Boolean) : []),
    popular: !!s.popular,
    hidden: !!s.hidden,
  }));
  c.booking = { bufferMinutes: 30, stepMinutes: 30, minLeadMinutes: 60, horizonDays: 30, ...(c.booking || {}) };
  c.assistant = { examples: [], ...(c.assistant || {}) };
  c.legal = { operator: '', inn: '', email: '', ...(c.legal || {}) };
  c.privacy = { retentionDays: 365, ...(c.privacy || {}) };
  c.owner = c.owner || {};
  return c;
}

/** Получить конфиг студии (с кэшем и автоперечитыванием при изменении файла). */
export function getStudio(slug) {
  if (!SLUG_RE.test(slug)) return null;
  const file = fileOf(slug);
  let st;
  try { st = fs.statSync(file); } catch { cache.delete(slug); return null; }
  const hit = cache.get(slug);
  if (hit && hit.mtime === st.mtimeMs) return hit.cfg;
  let raw;
  try { raw = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) {
    console.error(`[studio ${slug}] ошибка в JSON: ${e.message}`);
    return hit ? hit.cfg : null;
  }
  // Пароль, записанный открытым текстом, сразу заменяем на хэш.
  if (raw.owner && raw.owner.password) {
    raw.owner.passwordHash = hashPassword(String(raw.owner.password));
    delete raw.owner.password;
    writeRaw(slug, raw);
    st = fs.statSync(file);
  }
  const cfg = normalize(raw, slug);
  cache.set(slug, { mtime: st.mtimeMs, cfg });
  return cfg;
}

function writeRaw(slug, obj) {
  const file = fileOf(slug);
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2) + '\n');
  fs.renameSync(tmp, file);
}

/** Сохранить конфиг (атомарно). Служебные поля не пишем. */
export function saveStudio(slug, cfg) {
  const { slug: _s, ...rest } = cfg;
  // Не засоряем файл пустыми полями
  rest.services = rest.services.map((s) => {
    const o = { ...s };
    if (o.days) delete o.durationMin; else delete o.days;
    if (!o.boxes?.length) delete o.boxes;
    if (!o.keywords?.length) delete o.keywords;
    if (!o.popular) delete o.popular;
    if (!o.hidden) delete o.hidden;
    if (!o.priceFrom) delete o.priceFrom;
    return o;
  });
  writeRaw(slug, rest);
  cache.delete(slug);
  return getStudio(slug);
}

export function createStudio(slug, data) {
  if (!SLUG_RE.test(slug)) throw new Error('Адрес студии: латиница, цифры и дефис, 2–40 символов');
  if (fs.existsSync(fileOf(slug))) throw new Error(`Студия «${slug}» уже существует`);
  writeRaw(slug, data);
  return getStudio(slug);
}

/** То, что видит клиент: без владельца и служебных данных. */
export function publicView(cfg) {
  const { owner, iconFile, ...rest } = cfg;
  return { ...rest, services: cfg.services.filter((s) => !s.hidden) };
}

// ——— Проверка данных из кабинета ———
const str = (v, max = 500) => String(v ?? '').trim().slice(0, max);
const hours = (w) => (Array.isArray(w) && isTime(w[0]) && isTime(w[1]) && w[0] < w[1] ? [w[0], w[1]] : null);

export function applyPatch(cfg, patch, { futureBoxIds = new Set() } = {}) {
  const c = structuredClone(cfg);
  const text = { name: 80, kind: 60, tagline: 160, city: 80, address: 200, howToFind: 600, mapUrl: 500, phone: 40, telegram: 80, whatsapp: 40, paymentInfo: 300, email: 120 };
  for (const [k, max] of Object.entries(text)) if (k in patch) c[k] = str(patch[k], max);
  if (patch.theme?.accent && /^#[0-9a-f]{6}$/i.test(patch.theme.accent)) c.theme.accent = patch.theme.accent;
  if (Array.isArray(patch.cards)) c.cards = [0, 1, 2].map((i) => ({ title: str(patch.cards[i]?.title, 60), text: str(patch.cards[i]?.text, 240) }));
  if (patch.schedule) for (const k of WD_ORDER) if (k in patch.schedule) c.schedule[k] = hours(patch.schedule[k]);
  if (Array.isArray(patch.daysOff)) c.daysOff = [...new Set(patch.daysOff.filter(isDate))].sort();
  if (patch.specialDays && typeof patch.specialDays === 'object') {
    c.specialDays = {};
    for (const [d, w] of Object.entries(patch.specialDays)) if (isDate(d)) c.specialDays[d] = hours(w);
  }
  if (patch.booking) {
    const b = patch.booking, n = (v, lo, hi, def) => Math.min(hi, Math.max(lo, Math.round(Number(v)))) || def;
    if ('bufferMinutes' in b) c.booking.bufferMinutes = Math.min(240, Math.max(0, Math.round(Number(b.bufferMinutes) || 0)));
    if ('stepMinutes' in b) c.booking.stepMinutes = n(b.stepMinutes, 10, 120, 30);
    if ('minLeadMinutes' in b) c.booking.minLeadMinutes = Math.min(2880, Math.max(0, Math.round(Number(b.minLeadMinutes) || 0)));
    if ('horizonDays' in b) c.booking.horizonDays = n(b.horizonDays, 3, 120, 30);
  }
  if (Array.isArray(patch.boxes)) {
    const boxes = patch.boxes.slice(0, 30).map((b) => ({ id: /^[\w-]{1,40}$/.test(b.id || '') ? b.id : newId('b'), name: str(b.name, 40) || 'Бокс', active: b.active !== false }));
    if (!boxes.some((b) => b.active)) throw Object.assign(new Error('Нужен хотя бы один рабочий бокс'), { status: 400 });
    const ids = new Set(boxes.map((b) => b.id));
    for (const id of futureBoxIds) if (!ids.has(id)) {
      const name = cfg.boxes.find((b) => b.id === id)?.name || id;
      throw Object.assign(new Error(`В «${name}» есть будущие записи. Перенесите их или просто отключите бокс.`), { status: 400 });
    }
    c.boxes = boxes;
  }
  if (Array.isArray(patch.services)) {
    const boxIds = new Set(c.boxes.map((b) => b.id));
    c.services = patch.services.slice(0, 200).map((s) => {
      const days = s.days ? Math.min(60, Math.max(1, Math.round(Number(s.days)))) : undefined;
      return {
        id: /^[\w-]{1,40}$/.test(s.id || '') ? s.id : newId('s'),
        name: str(s.name, 80) || 'Услуга',
        category: str(s.category, 40),
        price: Math.max(0, Math.round(Number(s.price) || 0)),
        priceFrom: !!s.priceFrom,
        durationMin: days ? undefined : Math.min(24 * 60 * 10, Math.max(10, Math.round(Number(s.durationMin) || 60))),
        days,
        boxes: (Array.isArray(s.boxes) ? s.boxes : []).filter((id) => boxIds.has(id)),
        description: str(s.description, 400),
        keywords: (Array.isArray(s.keywords) ? s.keywords : String(s.keywords || '').split(',')).map((x) => str(x, 30)).filter(Boolean).slice(0, 20),
        popular: !!s.popular,
        hidden: !!s.hidden,
      };
    });
  }
  if (patch.legal && typeof patch.legal === 'object') c.legal = { operator: str(patch.legal.operator, 160), inn: str(patch.legal.inn, 20), email: str(patch.legal.email, 120) };
  if (patch.privacy && 'retentionDays' in patch.privacy) c.privacy.retentionDays = Math.min(1095, Math.max(30, Math.round(Number(patch.privacy.retentionDays) || 365)));
  if (patch.assistant && Array.isArray(patch.assistant.examples)) c.assistant.examples = patch.assistant.examples.map((x) => str(x, 60)).filter(Boolean).slice(0, 4);
  return c;
}
