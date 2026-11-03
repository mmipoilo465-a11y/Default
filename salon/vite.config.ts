import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Генерирует sw.js при сборке: список всех файлов приложения для офлайн-кэша
 * и версия кэша = хэш содержимого (телефоны получают обновления автоматически).
 */
function serviceWorker(): Plugin {
  return {
    name: 'atelier-sw',
    apply: 'build',
    generateBundle(_, bundle) {
      const files = Object.keys(bundle).filter((f) => !f.endsWith('.map'));
      const statics = ['manifest.webmanifest', 'favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];
      const hash = createHash('sha256');
      for (const f of files.sort()) {
        const item = bundle[f];
        hash.update(f).update(item.type === 'chunk' ? item.code : item.source);
      }
      const template = readFileSync(new URL('./src/sw.template.js', import.meta.url), 'utf-8');
      const shell = ['./', ...[...files, ...statics].map((f) => `./${f}`)];
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: template.replace('__VERSION__', `atelier-${hash.digest('hex').slice(0, 10)}`).replace('__SHELL__', JSON.stringify(shell)),
      });
    },
  };
}

// base: './' — сборку можно открыть из любой подпапки (GitHub Pages, S3, file server)
export default defineConfig({
  base: './',
  plugins: [react(), serviceWorker()],
});
