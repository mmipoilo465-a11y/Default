import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' — сборку можно открыть из любой папки (GitHub Pages, локальный сервер).
export default defineConfig({
  base: './',
  plugins: [react()],
});
