// Мини-набор HTTP-утилит без зависимостей.
import fs from 'node:fs';
import path from 'node:path';

export const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.ics': 'text/calendar; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
};

export class HttpError extends Error {
  constructor(status, message, extra) { super(message); this.status = status; this.extra = extra; }
}

export function send(res, status, body, headers = {}) {
  if (res.headersSent) return;
  res.writeHead(status, headers);
  res.end(body);
}

export function json(res, status, data, headers = {}) {
  send(res, status, JSON.stringify(data), { 'Content-Type': MIME['.json'], 'Cache-Control': 'no-store', ...headers });
}

export async function readBody(req, limit = 12 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new HttpError(413, 'Слишком большой файл')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export async function readJson(req, limit) {
  const buf = await readBody(req, limit);
  if (!buf.length) return {};
  try { return JSON.parse(buf.toString('utf8')); } catch { throw new HttpError(400, 'Некорректный запрос'); }
}

export function parseCookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

// Заголовкам X-Forwarded-* верим, только если перед приложением стоит наш прокси (TRUST_PROXY=1).
const TRUST = process.env.TRUST_PROXY === '1';
export const fwdHost = (req) => (TRUST && req.headers['x-forwarded-host']) || req.headers.host || 'localhost';
export const isHttps = (req) => (TRUST && req.headers['x-forwarded-proto'] === 'https') || !!req.socket.encrypted;

export function originOf(req) {
  const proto = isHttps(req) ? 'https' : 'http';
  return `${proto}://${fwdHost(req)}`;
}

/** Отдать файл из каталога root (без выхода за его пределы). */
export function serveFile(req, res, root, rel, { maxAge = 3600, immutable = false } = {}) {
  const full = path.normalize(path.join(root, rel));
  if (!full.startsWith(path.normalize(root) + path.sep)) return false;
  let st;
  try { st = fs.statSync(full); } catch { return false; }
  if (!st.isFile()) return false;
  const etag = `"${st.size.toString(36)}-${Math.floor(st.mtimeMs).toString(36)}"`;
  const headers = {
    'Content-Type': MIME[path.extname(full).toLowerCase()] || 'application/octet-stream',
    'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : `public, max-age=${maxAge}`,
    ETag: etag,
  };
  if (req.headers['if-none-match'] === etag) { send(res, 304, '', headers); return true; }
  headers['Content-Length'] = st.size;
  res.writeHead(200, headers);
  if (req.method === 'HEAD') { res.end(); return true; }
  fs.createReadStream(full).pipe(res);
  return true;
}

/** Простое ограничение частоты запросов по ключу. */
const buckets = new Map();
export function rateLimit(key, limit, windowMs) {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || b.reset < now) { b = { n: 0, reset: now + windowMs }; buckets.set(key, b); }
  b.n++;
  if (buckets.size > 5000) for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
  if (b.n > limit) throw new HttpError(429, 'Слишком много попыток. Подождите немного.');
}

export const clientIp = (req) => (TRUST && req.headers['x-forwarded-for'] ? String(req.headers['x-forwarded-for']).split(',').at(-1).trim() : req.socket.remoteAddress || '');

export const escHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
