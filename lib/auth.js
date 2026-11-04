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

export function genPassword() {
  const abc = 'abcdefghjkmnpqrstuvwxyz23456789';
  const b = crypto.randomBytes(10);
  let s = '';
  for (let i = 0; i < 10; i++) s += abc[b[i] % abc.length];
  return s.slice(0, 5) + '-' + s.slice(5);
}
