import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const STATIC_FILES = [
  'manifest.webmanifest',
  'favicon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
];

/**
 * Генерирует sw.js при сборке: список файлов приложения для офлайн-кэша
 * и версию кэша = хэш содержимого (установленное приложение обновляется само).
 */
function serviceWorker(): Plugin {
  return {
    name: 'lumiere-sw',
    apply: 'build',
    generateBundle(_, bundle) {
      const files = Object.keys(bundle).filter((f) => !f.endsWith('.map')).sort();
      const hash = createHash('sha256');
      for (const f of files) {
        const item = bundle[f];
        hash.update(f).update(item.type === 'chunk' ? item.code : item.source);
      }
      const shell = ['./', ...[...files, ...STATIC_FILES].map((f) => `./${f}`)];
      const template = readFileSync(new URL('./src/sw.template.js', import.meta.url), 'utf-8');
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: template
          .replace('__VERSION__', `lumiere-${hash.digest('hex').slice(0, 10)}`)
          .replace('__SHELL__', JSON.stringify(shell)),
      });
    },
  };
}

// base: './' — сборку можно открыть из любой папки (GitHub Pages, локальный сервер).
export default defineConfig({
  base: './',
  plugins: [react(), serviceWorker()],
});
