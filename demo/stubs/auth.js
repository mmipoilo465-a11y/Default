import { randomBytes } from './node-crypto.js';
export const token = (bytes = 24) => randomBytes(bytes).toString('base64url');
export const hashPassword = (pw) => 'demo$' + pw;
export const verifyPassword = (pw, stored) => stored === 'demo$' + pw;
export const genPassword = () => randomBytes(5).toString('hex');
export function genRecoveryCode() {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const b = randomBytes(16);
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
