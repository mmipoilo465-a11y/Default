// Запуск: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'sb-test-'));
const { getSlots, spanFor, findBox, nearestSlots } = await import('../core/slots.js');
const { toMin, fromMin } = await import('../core/time.js');
const nlu = await import('../lib/nlu.js');
const { encrypt } = await import('../lib/webpush.js');
const { makeIcon } = await import('../lib/icon.js');

const cfg = {
  timezone: 'Europe/Moscow',
  schedule: { mon: ['09:00', '21:00'], tue: ['09:00', '21:00'], wed: ['09:00', '21:00'], thu: ['09:00', '21:00'], fri: ['09:00', '21:00'], sat: ['10:00', '19:00'], sun: null },
  daysOff: ['2026-11-11'], specialDays: {},
  boxes: [{ id: 'b1', name: 'Бокс 1' }, { id: 'b2', name: 'Бокс 2' }],
  booking: { bufferMinutes: 30, stepMinutes: 30, minLeadMinutes: 60, horizonDays: 30 },
};
const ceramic = { id: 'ceramic', days: 2 };
const polish = { id: 'polish', durationMin: 480 };
const wash = { id: 'wash', durationMin: 90 };
const NOW = toMin('2026-11-04T08:00'); // среда, до открытия

const book = (svc, start, boxId) => {
  const sp = spanFor(cfg, svc, toMin(start));
  return { id: crypto.randomUUID(), status: 'booked', boxId, start: fromMin(sp.start), end: fromMin(sp.end), busyUntil: fromMin(sp.busyUntil) };
};

test('двухдневная работа держит бокс оба дня, включая ночь', () => {
  const b = book(ceramic, '2026-11-05T09:00', 'b1');
  assert.equal(b.end, '2026-11-06T21:00');
  assert.equal(b.busyUntil, '2026-11-07T10:30'); // подготовка переносится на утро следующего рабочего дня
  const bookings = [b, book(ceramic, '2026-11-05T09:00', 'b2')];
  const days = getSlots(cfg, bookings, polish, '2026-11-05', 3, NOW);
  assert.deepEqual(days[0].times, []);
  assert.deepEqual(days[1].times, []);
  assert.equal(days[2].times[0], '10:30');
});

test('выходной между рабочими днями не считается днём работы', () => {
  const b = book(ceramic, '2026-11-07T10:00', 'b1'); // сб + (вс выходной) + пн
  assert.equal(b.end, '2026-11-09T21:00');
  const b2 = book(ceramic, '2026-11-10T09:00', 'b1'); // вт + (ср 11.11 — праздник) + чт
  assert.equal(b2.end, '2026-11-12T21:00');
});

test('подготовка между машинами учитывается', () => {
  const one = { ...cfg, boxes: [{ id: 'b1' }] };
  const b = book(wash, '2026-11-05T09:00', 'b1'); // 09:00–10:30, бокс свободен с 11:00
  const day = getSlots(one, [b], wash, '2026-11-05', 1, NOW)[0];
  assert.ok(!day.times.includes('10:30'));
  assert.equal(day.times[0], '11:00');
});

test('короткая работа заканчивается в тот же день, отменённые записи не занимают бокс', () => {
  const day = getSlots(cfg, [], polish, '2026-11-07', 1, NOW)[0]; // сб 10–19, 8 ч
  assert.deepEqual(day.times, ['10:00', '10:30', '11:00']);
  const cancelled = { ...book(polish, '2026-11-07T10:00', 'b1'), status: 'cancelled' };
  assert.ok(findBox(cfg, [cancelled], polish, toMin('2026-11-07T10:00'), { boxId: 'b1' }));
});

test('выходные и праздники закрыты, ближайшие окна ищутся вперёд', () => {
  assert.equal(getSlots(cfg, [], wash, '2026-11-08', 1, NOW)[0].open, false);
  assert.equal(getSlots(cfg, [], wash, '2026-11-11', 1, NOW)[0].open, false);
  const near = nearestSlots(cfg, [], wash, toMin('2026-11-07T20:00'), 2, 1);
  assert.deepEqual(near.map((x) => x.date), ['2026-11-09', '2026-11-10']);
});

test('разбор дат и периодов', () => {
  const t = '2026-11-04';
  assert.equal(nlu.parseDate('можно завтра вечером?', t), '2026-11-05');
  assert.equal(nlu.parseDate('в субботу', t), '2026-11-07');
  assert.equal(nlu.parseDate('на 12.11', t), '2026-11-12');
  assert.equal(nlu.parseDate('5 ноября', t), '2026-11-05');
  assert.deepEqual(nlu.parseTimePref('в пятницу в 15'), { exact: 900 });
  assert.equal(nlu.parsePeriod('сколько машин было на неделе', t).from, '2026-11-02');
  assert.equal(nlu.parsePeriod('что на понедельник', t).from, '2026-11-09');
  assert.equal(nlu.parsePeriod('за прошлый месяц', t).from, '2026-10-01');
});

test('поиск услуги по словам и уточнение при неоднозначности', () => {
  const services = [
    { id: 'polish', name: 'Полировка кузова', keywords: ['полировка'] },
    { id: 'head', name: 'Полировка фар' },
    { id: 'ceramic', name: 'Керамическое покрытие', keywords: ['керамика'] },
  ];
  assert.equal(nlu.matchServices('Сколько стоит полировка?', services).best.id, 'polish');
  assert.equal(nlu.matchServices('полировку фар', services).best.id, 'head');
  assert.equal(nlu.matchServices('керамику нанести', services).best.id, 'ceramic');
  const noKw = services.map(({ keywords, ...s }) => s);
  assert.equal(nlu.matchServices('полировка', noKw).best, null);
  assert.equal(nlu.matchServices('полировка', noKw).matches.length, 2);
});

test('web push: шифрование aes128gcm расшифровывается по RFC 8291', () => {
  const ua = crypto.createECDH('prime256v1'); ua.generateKeys();
  const auth = crypto.randomBytes(16);
  const sub = { keys: { p256dh: ua.getPublicKey().toString('base64url'), auth: auth.toString('base64url') } };
  const msg = JSON.stringify({ title: 'Завтра в 10:00', body: 'Полировка' });
  const body = encrypt(sub, msg);
  const salt = body.subarray(0, 16), idlen = body[20], asPub = body.subarray(21, 21 + idlen), ct = body.subarray(21 + idlen);
  const shared = ua.computeSecret(asPub);
  const ikm = Buffer.from(crypto.hkdfSync('sha256', shared, auth, Buffer.concat([Buffer.from('WebPush: info\0'), ua.getPublicKey(), asPub]), 32));
  const cek = Buffer.from(crypto.hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: aes128gcm\0'), 16));
  const nonce = Buffer.from(crypto.hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: nonce\0'), 12));
  const d = crypto.createDecipheriv('aes-128-gcm', cek, nonce);
  d.setAuthTag(ct.subarray(ct.length - 16));
  const plain = Buffer.concat([d.update(ct.subarray(0, ct.length - 16)), d.final()]);
  assert.equal(plain[plain.length - 1], 2);
  assert.equal(plain.subarray(0, -1).toString(), msg);
});

test('иконка без логотипа — корректный PNG', () => {
  const png = makeIcon('Ваша студия', '#C8FF2E', 192);
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  assert.equal(png.readUInt32BE(16), 192);
});
