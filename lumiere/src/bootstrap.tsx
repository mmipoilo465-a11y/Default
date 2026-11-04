import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'framer-motion';
import { AppStoreProvider } from './store/AppStore';
import { ToastProvider } from './store/Toast';
import './index.css';

/**
 * Общий запуск обеих страниц: провайдеры состояния и регистрация service worker.
 * swUrl — путь к sw.js относительно страницы (у админки он на уровень выше).
 */
export function bootstrap(app: ReactNode, swUrl: string) {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <MotionConfig reducedMotion="user">
        <AppStoreProvider>
          <ToastProvider>{app}</ToastProvider>
        </AppStoreProvider>
      </MotionConfig>
    </StrictMode>,
  );

  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register(swUrl, { scope: new URL('./', new URL(swUrl, location.href)).pathname }).catch(() => {});
    });
  }
}
