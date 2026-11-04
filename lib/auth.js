import crypto from 'node:crypto';

export function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(pw, salt, 32, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString('base64url')}$${key.toString('base64url')}`;
}

export function verifyPassword(pw, stored) {
  if (!stored || !String(stored).startsWith('scrypt$')) return false;
  const [, s, k] = stored.split('$');
  const key = crypto.scryptSync(String(pw), Buffer.from(s, 'base64url'), 32, { N: 16384, r: 8, p: 1 });
  const want = Buffer.from(k, 'base64url');
  return want.length === key.length && crypto.timingSafeEqual(want, key);
}

export const token = (bytes = 24) => crypto.randomBytes(bytes).toString('base64url');

/** Код восстановления доступа: 16 символов группами по 4 (без похожих букв). */
export function genRecoveryCode() {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const b = crypto.randomBytes(16);
  return [...b].map((x) => abc[x % abc.length]).join('').match(/.{4}/g).join('-');
}
export const normCode = (c) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
export const passwordProblem = (pw) => {
  pw = String(pw || '');
  if (pw.length < 8) return 'Пароль — минимум 8 символов';
  if (!/\d/.test(pw) || !/[^\d]/.test(pw)) return 'В пароле нужны и буквы, и цифры';
  if (/^(start-2026|password1?|12345678|qwerty123)$/i.test(pw)) return 'Этот пароль слишком простой — придумайте свой';
  return null;
};

export function genPassword() {
  const abc = 'abcdefghjkmnpqrstuvwxyz23456789';
  const b = crypto.randomBytes(10);
  let s = '';
  for (let i = 0; i < 10; i++) s += abc[b[i] % abc.length];
  return s.slice(0, 5) + '-' + s.slice(5);
}
