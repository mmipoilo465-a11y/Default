#!/usr/bin/env node
/**
 * Задаёт пароль руководителя: npm run admin:password -- "новый-пароль"
 *
 * В код попадает только хэш PBKDF2-SHA256 со случайной солью — сам пароль
 * нигде не сохраняется. После смены пароля пересоберите и опубликуйте
 * приложение (npm run publish): все прежние входы станут недействительны.
 */
import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';

const password = process.argv[2];
if (!password || password.length < 8) {
  console.error('Укажите пароль не короче 8 символов: npm run admin:password -- "мой-пароль"');
  process.exit(1);
}

const iterations = 210_000;
const salt = randomBytes(16).toString('hex');
const hash = pbkdf2Sync(password, Buffer.from(salt, 'hex'), iterations, 32, 'sha256').toString('hex');

const file = new URL('../src/config/admin.ts', import.meta.url);
writeFileSync(
  file,
  `/**
 * Хэш пароля руководителя (PBKDF2-SHA256). Сам пароль здесь не хранится.
 * Сменить пароль: npm run admin:password -- "новый-пароль"
 */
export const ADMIN_AUTH = {
  salt: '${salt}',
  iterations: ${iterations},
  hash: '${hash}',
} as const;
`,
);
console.log('Пароль обновлён: src/config/admin.ts. Пересоберите приложение — npm run publish');
