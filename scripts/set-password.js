// Сменить пароль владельца:  npm run set-password -- <студия> [новый-пароль] [--email новая@почта]
import fs from 'node:fs';
import path from 'node:path';
import { STUDIOS_DIR } from '../lib/paths.js';
import { genPassword, hashPassword } from '../lib/auth.js';
import { system } from '../lib/db.js';

const args = process.argv.slice(2);
const ei = args.indexOf('--email');
const email = ei >= 0 ? args.splice(ei, 2)[1] : undefined;
const [slug, pw] = args;
if (!slug) { console.log('Использование: npm run set-password -- <студия> [пароль] [--email почта]'); process.exit(1); }
const file = path.join(STUDIOS_DIR, `${slug}.json`);
if (!fs.existsSync(file)) { console.error('Нет такой студии:', file); process.exit(1); }
const cfg = JSON.parse(fs.readFileSync(file, 'utf8'));
const password = pw || genPassword();
cfg.owner = { ...(cfg.owner || {}), passwordHash: hashPassword(password) };
delete cfg.owner.password;
if (email) cfg.owner.email = email;
fs.writeFileSync(file, JSON.stringify(cfg, null, 2) + '\n');
system.prepare('DELETE FROM sessions WHERE studio = ?').run(slug);
console.log(`Почта: ${cfg.owner.email}\nПароль: ${password}`);
