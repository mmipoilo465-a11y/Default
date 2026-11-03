import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' — сборку можно открыть из любой подпапки (GitHub Pages, S3, file server)
export default defineConfig({
  base: './',
  plugins: [react()],
});
