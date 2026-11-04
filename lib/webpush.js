// Web Push без внешних библиотек: VAPID (RFC 8292) + шифрование aes128gcm (RFC 8291).
import crypto from 'node:crypto';
import { kvGet, kvSet } from './db.js';

const b64u = (b) => Buffer.from(b).toString('base64url');
const unb64u = (s) => Buffer.from(String(s), 'base64url');

let keys;
/** VAPID-ключи создаются один раз и хранятся в базе. */
export function vapidKeys() {
  if (keys) return keys;
  const saved = kvGet('vapid');
  if (saved) { keys = JSON.parse(saved); return keys; }
  const ecdh = crypto.createECDH('prime256v1');
  ecdh.generateKeys();
  keys = { publicKey: b64u(ecdh.getPublicKey()), privateKey: b64u(ecdh.getPrivateKey()) };
  kvSet('vapid', JSON.stringify(keys));
  return keys;
}

function vapidKeyObject() {
  const { publicKey, privateKey } = vapidKeys();
  const pub = unb64u(publicKey);
  return crypto.createPrivateKey({ key: { kty: 'EC', crv: 'P-256', d: privateKey, x: b64u(pub.subarray(1, 33)), y: b64u(pub.subarray(33, 65)) }, format: 'jwk' });
}

function vapidJwt(audience, subject) {
  const header = b64u(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const payload = b64u(JSON.stringify({ aud: audience, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: subject }));
  const sig = crypto.sign('sha256', Buffer.from(`${header}.${payload}`), { key: vapidKeyObject(), dsaEncoding: 'ieee-p1363' });
  return `${header}.${payload}.${b64u(sig)}`;
}

/** Зашифровать полезную нагрузку для подписки (aes128gcm, одна запись). */
export function encrypt(sub, plaintext) {
  const uaPublic = unb64u(sub.keys.p256dh);
  const authSecret = unb64u(sub.keys.auth);
  const as = crypto.createECDH('prime256v1');
  as.generateKeys();
  const asPublic = as.getPublicKey();
  const shared = as.computeSecret(uaPublic);
  const keyInfo = Buffer.concat([Buffer.from('WebPush: info\0'), uaPublic, asPublic]);
  const ikm = Buffer.from(crypto.hkdfSync('sha256', shared, authSecret, keyInfo, 32));
  const salt = crypto.randomBytes(16);
  const cek = Buffer.from(crypto.hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: aes128gcm\0'), 16));
  const nonce = Buffer.from(crypto.hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: nonce\0'), 12));
  const cipher = crypto.createCipheriv('aes-128-gcm', cek, nonce);
  const body = Buffer.concat([cipher.update(Buffer.concat([Buffer.from(plaintext), Buffer.from([2])])), cipher.final(), cipher.getAuthTag()]);
  const rs = Buffer.alloc(4); rs.writeUInt32BE(4096);
  return Buffer.concat([salt, rs, Buffer.from([asPublic.length]), asPublic, body]);
}

/** Отправить уведомление. Возвращает HTTP-статус push-сервиса (410/404 — подписка умерла). */
export async function sendPush(sub, data, { ttl = 86400, subject } = {}) {
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) return 400;
  const url = new URL(sub.endpoint);
  const jwt = vapidJwt(url.origin, subject || process.env.VAPID_SUBJECT || 'mailto:admin@example.com');
  const body = encrypt(sub, JSON.stringify(data));
  const r = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      TTL: String(ttl), Urgency: 'normal', 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream',
      Authorization: `vapid t=${jwt}, k=${vapidKeys().publicKey}`,
    },
    body,
  });
  return r.status;
}
