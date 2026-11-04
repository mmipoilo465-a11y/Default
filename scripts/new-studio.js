// Новая студия за минуту:
//   npm run new-studio -- <адрес-латиницей> "Название" owner@mail.ru [--from garage77] [--kind "Автосервис"] [--phone "+7..."]
// Создаёт data/studios/<адрес>.json из шаблона (или копию другой студии) и печатает пароль владельца.
import fs from 'node:fs';
import path from 'node:path';
import { EXAMPLES, STUDIOS_DIR } from '../lib/paths.js';
import { SLUG_RE } from '../lib/studios.js';
import { genPassword, hashPassword, genRecoveryCode, normCode } from '../lib/auth.js';

const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(`--${k}`); if (i < 0) return undefined; const v = args[i + 1]; args.splice(i, 2); return v; };
const from = opt('from'), kind = opt('kind'), phone = opt('phone'), city = opt('city'), address = opt('address'), accent = opt('accent');
const [slug, name, email] = args;

if (!slug || !name || !email) {
  console.log('Использование: npm run new-studio -- <адрес> "Название" owner@mail.ru [--from <студия>] [--kind "Автосервис"] [--phone "+7…"] [--city "…"] [--address "…"] [--accent "#FF6B2C"]');
  process.exit(1);
}
if (!SLUG_RE.test(slug)) { console.error('Адрес: латиница в нижнем регистре, цифры и дефис (например, shine-msk)'); process.exit(1); }
const target = path.join(STUDIOS_DIR, `${slug}.json`);
if (fs.existsSync(target)) { console.error(`Студия ${slug} уже есть: ${target}`); process.exit(1); }

const src = from ? path.join(STUDIOS_DIR, `${from}.json`) : path.join(EXAMPLES, '_template.json');
if (!fs.existsSync(src)) { console.error(`Не найден источник: ${src}`); process.exit(1); }
const cfg = JSON.parse(fs.readFileSync(src, 'utf8'));
// Фото и логотип чужой студии не копируем — ставим заглушки.
cfg.logo = null; delete cfg.iconFile;
cfg.hero = '/media/defaults/hero.jpg';
cfg.gallery = (cfg.gallery || []).map((g, i) => ({ ...g, image: g.image?.startsWith('/media/defaults/') ? g.image : `/media/defaults/work-${(i % 6) + 1}.jpg` }));
Object.assign(cfg, { name }, kind && { kind }, phone && { phone }, city && { city }, address && { address });
if (accent) cfg.theme = { ...(cfg.theme || {}), accent };
const password = genPassword();
const recovery = genRecoveryCode();
cfg.owner = { email, passwordHash: hashPassword(password), mustChange: true, recoveryHash: hashPassword(normCode(recovery)) };
fs.writeFileSync(target, JSON.stringify(cfg, null, 2) + '\n');

console.log(`\nГотово: ${target}`);
console.log(`  Страница:  /${slug}/`);
console.log(`  Кабинет:   /${slug}/admin`);
console.log(`  Вход:      ${email}`);
console.log(`  Пароль:    ${password}   (при первом входе кабинет попросит придумать свой)`);
console.log(`  Код восстановления: ${recovery}   (если владелец забудет пароль)\n`);
console.log('Остальное (цены, адрес, график, карточки) — правьте в этом файле или в кабинете.');
