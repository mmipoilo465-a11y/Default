// Иконка приложения без логотипа: инициалы студии на фоне фирменного цвета.
// Свой растеризатор контуров шрифта + PNG-кодер на zlib — без внешних зависимостей.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { ROOT } from './paths.js';

const FONT = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'glyphs.json'), 'utf8'));

function crc32(buf) {
  if (zlib.crc32) return zlib.crc32(buf) >>> 0;
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) { c = (crc ^ buf[n]) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
export function encodePng(w, h, rgb) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3); }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

/** Контуры текста → список многоугольников в пиксельных координатах. */
function textPolys(text, size, cx, cy, capPx) {
  const scale = capPx / FONT.ascent;
  const glyphs = [...text].map((ch) => FONT.glyphs[ch]).filter(Boolean);
  const tracking = -0.02 * FONT.upm;
  const width = glyphs.reduce((s, g) => s + g.adv + tracking, -tracking) * scale;
  let x0 = cx - width / 2;
  const baseY = cy + capPx / 2;
  const polys = [];
  for (const g of glyphs) {
    let cur = null, poly = null;
    const P = ([x, y]) => [x0 + x * scale, baseY - y * scale];
    for (const [op, ...pts] of g.cmds) {
      if (op === 'moveTo') { poly = [P(pts[0])]; cur = pts[0]; polys.push(poly); }
      else if (op === 'lineTo') { poly.push(P(pts[0])); cur = pts[0]; }
      else if (op === 'curveTo') {
        const [p1, p2, p3] = pts;
        for (let i = 1; i <= 12; i++) {
          const t = i / 12, u = 1 - t;
          poly.push(P([u * u * u * cur[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * cur[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]));
        }
        cur = p3;
      } else if (op === 'qCurveTo') {
        const on = pts.at(-1), offs = pts.slice(0, -1);
        let start = cur;
        for (let k = 0; k < offs.length; k++) {
          const c = offs[k];
          const end = k === offs.length - 1 ? on : [(c[0] + offs[k + 1][0]) / 2, (c[1] + offs[k + 1][1]) / 2];
          for (let i = 1; i <= 8; i++) { const t = i / 8, u = 1 - t; poly.push(P([u * u * start[0] + 2 * u * t * c[0] + t * t * end[0], u * u * start[1] + 2 * u * t * c[1] + t * t * end[1]])); }
          start = end;
        }
        cur = on;
      }
    }
    x0 += (g.adv + tracking) * scale;
  }
  return polys;
}

/** Заливка по правилу nonzero с суперсэмплингом 4×4 → маска покрытия 0..16. */
function rasterize(polys, size) {
  const SS = 4, W = size * SS;
  const mask = new Uint8Array(size * size);
  const edges = [];
  for (const p of polys) for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length];
    if (a[1] === b[1]) continue;
    edges.push(a[1] < b[1] ? [a[0] * SS, a[1] * SS, b[0] * SS, b[1] * SS, 1] : [b[0] * SS, b[1] * SS, a[0] * SS, a[1] * SS, -1]);
  }
  const xs = [];
  for (let sy = 0; sy < W; sy++) {
    const y = sy + 0.5;
    xs.length = 0;
    for (const [x1, y1, x2, y2, d] of edges) if (y >= y1 && y < y2) xs.push([x1 + (y - y1) * (x2 - x1) / (y2 - y1), d]);
    if (!xs.length) continue;
    xs.sort((a, b) => a[0] - b[0]);
    let wind = 0;
    const row = (sy / SS | 0) * size;
    for (let i = 0; i < xs.length - 1; i++) {
      wind += xs[i][1];
      if (wind !== 0) {
        const from = Math.max(0, Math.ceil(xs[i][0] - 0.5)), to = Math.min(W - 1, Math.floor(xs[i + 1][0] - 0.5));
        for (let sx = from; sx <= to; sx++) mask[row + (sx / SS | 0)]++;
      }
    }
  }
  return mask;
}

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lum = ([r, g, b]) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

export function initials(name) {
  const ws = String(name || '').replace(/[«»"']/g, '').split(/[\s\-]+/).filter((w) => /[A-Za-zА-Яа-яЁё0-9]/.test(w));
  let s = ws.slice(0, 2).map((w) => w.match(/[A-Za-zА-Яа-яЁё0-9]/)[0].toUpperCase()).join('');
  s = [...s].filter((c) => FONT.glyphs[c]).join('');
  return s || '+';
}

const memo = new Map();
/** PNG-иконка size×size: фон — фирменный цвет, буквы — тёмные (или светлые на тёмном фоне). */
export function makeIcon(name, accent = '#C8FF2E', size = 512) {
  const key = `${name}|${accent}|${size}`;
  if (memo.has(key)) return memo.get(key);
  const bg = hex(/^#[0-9a-f]{6}$/i.test(accent) ? accent : '#C8FF2E');
  const fg = lum(bg) > 0.5 ? [10, 11, 13] : [245, 246, 248];
  const text = initials(name);
  const cap = size * (text.length > 1 ? 0.27 : 0.34);
  const mask = rasterize(textPolys(text, size, size / 2, size * 0.5, cap), size);
  const rgb = Buffer.alloc(size * size * 3);
  for (let i = 0; i < size * size; i++) {
    const a = Math.min(16, mask[i]) / 16;
    for (let c = 0; c < 3; c++) rgb[i * 3 + c] = Math.round(bg[c] * (1 - a) + fg[c] * a);
  }
  const png = encodePng(size, size, rgb);
  if (memo.size > 200) memo.clear();
  memo.set(key, png);
  return png;
}
