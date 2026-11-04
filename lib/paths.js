import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DATA = path.resolve(process.env.DATA_DIR || path.join(ROOT, 'data'));
export const STUDIOS_DIR = path.join(DATA, 'studios');
export const MEDIA_DIR = path.join(DATA, 'media');
export const PUBLIC = path.join(ROOT, 'public');
export const CORE = path.join(ROOT, 'core');
export const EXAMPLES = path.join(ROOT, 'studios');

for (const d of [DATA, STUDIOS_DIR, MEDIA_DIR]) fs.mkdirSync(d, { recursive: true });
