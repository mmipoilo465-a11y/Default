import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'framer-motion';
import App from './App';
import { AppStoreProvider } from './store/AppStore';
import { ToastProvider } from './store/Toast';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <AppStoreProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AppStoreProvider>
    </MotionConfig>
  </StrictMode>,
);

// PWA: офлайн-режим и установка на главный экран (только в production-сборке)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {});
  });
}
