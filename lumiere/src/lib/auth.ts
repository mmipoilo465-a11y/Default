import { ADMIN_AUTH } from '../config/admin';

/**
 * Вход руководителя без сервера.
 *
 * Пароль проверяется в браузере по хэшу PBKDF2 (src/config/admin.ts), поэтому
 * в опубликованном коде нет самого пароля. В сессии хранится отпечаток текущего
 * хэша: после смены пароля и новой публикации все прежние входы сбрасываются.
 */

const SESSION_KEY = 'lumiere.admin.session';
const LOCK_KEY = 'lumiere.admin.lock';
const HOUR = 60 * 60 * 1000;
const REMEMBER_TTL = 30 * 24 * HOUR;
const SESSION_TTL = 12 * HOUR;

export const MAX_ATTEMPTS = 5;
export const LOCK_MS = 30_000;

interface Session {
  v: string;
  exp: number;
}

const toHex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const fromHex = (hex: string) => new Uint8Array(hex.match(/../g)!.map((h) => parseInt(h, 16)));
const fingerprint = () => ADMIN_AUTH.hash.slice(0, 16);

/** Сравнение без ранней остановки, чтобы время ответа не подсказывало совпадения. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const canVerify = () => typeof crypto !== 'undefined' && Boolean(crypto.subtle);

export async function verifyPassword(password: string): Promise<boolean> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: fromHex(ADMIN_AUTH.salt), iterations: ADMIN_AUTH.iterations },
    key,
    256,
  );
  return safeEqual(toHex(bits), ADMIN_AUTH.hash);
}

function read(storage: Storage): Session | null {
  try {
    const raw = storage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function hasSession(): boolean {
  const valid = (s: Session | null) => s !== null && s.v === fingerprint() && s.exp > Date.now();
  try {
    return valid(read(localStorage)) || valid(read(sessionStorage));
  } catch {
    return false;
  }
}

/** remember = true — вход сохраняется на устройстве на 30 дней, иначе до закрытия вкладки. */
export function startSession(remember: boolean): void {
  const session: Session = { v: fingerprint(), exp: Date.now() + (remember ? REMEMBER_TTL : SESSION_TTL) };
  try {
    (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* хранилище недоступно — вход действует, пока открыта страница */
  }
}

export function endSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* нечего очищать */
  }
}

/** Блокировка после серии неверных попыток переживает перезагрузку страницы. */
export function lockedUntil(): number {
  try {
    return Number(localStorage.getItem(LOCK_KEY)) || 0;
  } catch {
    return 0;
  }
}

export function setLock(until: number): void {
  try {
    if (until) localStorage.setItem(LOCK_KEY, String(until));
    else localStorage.removeItem(LOCK_KEY);
  } catch {
    /* не критично */
  }
}
