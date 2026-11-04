// Ежедневное обслуживание: срок хранения персональных данных и резервные копии.
import fs from 'node:fs';
import path from 'node:path';
import { DATA, STUDIOS_DIR } from './paths.js';
import { listStudios, getStudio } from './studios.js';
import * as DB from './db.js';
import { localNow, fromMin, dateOf, addDays } from '../core/time.js';

const BACKUPS = path.join(DATA, 'backups');
const KEEP_DAYS = Number(process.env.BACKUP_KEEP_DAYS || 14);

/** Обезличить записи старше срока хранения и убрать ненужные подписки на уведомления. */
export function applyRetention() {
  let total = 0;
  for (const slug of listStudios()) {
    const cfg = getStudio(slug);
    if (!cfg) continue;
    const now = localNow(cfg.timezone);
    const before = addDays(dateOf(now), -cfg.privacy.retentionDays) + 'T00:00';
    total += DB.anonymizeOlderThan(slug, before, fromMin(now));
    DB.dropOldPushSubs(slug, fromMin(now - 24 * 60));
  }
  if (total) console.log(`[privacy] обезличено старых записей: ${total}`);
  return total;
}

/** Копия базы и настроек каждой студии — отдельными файлами. */
export function backupAll() {
  const day = new Date().toISOString().slice(0, 10);
  const dir = path.join(BACKUPS, day);
  for (const slug of listStudios()) {
    try {
      DB.backupStudio(slug, path.join(dir, `${slug}.db`));
      fs.copyFileSync(path.join(STUDIOS_DIR, `${slug}.json`), path.join(dir, `${slug}.json`));
    } catch (e) { console.warn(`[backup ${slug}] ${e.message}`); }
  }
  // Старые копии удаляем
  if (fs.existsSync(BACKUPS)) {
    const limit = new Date(Date.now() - KEEP_DAYS * 864e5).toISOString().slice(0, 10);
    for (const d of fs.readdirSync(BACKUPS)) if (/^\d{4}-\d{2}-\d{2}$/.test(d) && d < limit) fs.rmSync(path.join(BACKUPS, d), { recursive: true, force: true });
  }
}

export function startMaintenance() {
  const run = () => { try { applyRetention(); backupAll(); } catch (e) { console.warn('[maintenance]', e.message); } };
  setTimeout(run, 30_000).unref();
  setInterval(run, 24 * 3600e3).unref();
}
