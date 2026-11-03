import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Header } from './components/Header';
import { InstallBanner } from './components/InstallBanner';
import { useToast } from './store/Toast';
import { BookingPage } from './features/booking/BookingPage';
import { AdminPanel } from './features/admin/AdminPanel';
import type { Mode } from './lib/types';

const initialMode = (): Mode => (window.location.hash === '#admin' ? 'admin' : 'client');

export default function App() {
  const [mode, setMode] = useState<Mode>(initialMode);
  const toast = useToast();

  // Подсказка о работе без сети: данные и так локальные, приложение продолжает работать.
  useEffect(() => {
    const offline = () => toast('Нет сети — приложение работает офлайн', 'error');
    const online = () => toast('Соединение восстановлено');
    window.addEventListener('offline', offline);
    window.addEventListener('online', online);
    return () => {
      window.removeEventListener('offline', offline);
      window.removeEventListener('online', online);
    };
  }, [toast]);

  useEffect(() => {
    history.replaceState(null, '', mode === 'admin' ? '#admin' : window.location.pathname + window.location.search);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [mode]);

  return (
    <div className="relative min-h-screen overflow-x-clip">
      {/* мягкие цветовые пятна на фоне */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[640px] overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-violet-200/40 blur-3xl" />
        <div className="absolute -right-32 top-20 h-[420px] w-[420px] rounded-full bg-peach-200/50 blur-3xl" />
      </div>

      <Header mode={mode} onModeChange={setMode} />
      <InstallBanner />

      <AnimatePresence mode="wait">
        <motion.main
          key={mode}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-6xl px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-10 sm:px-8 sm:pt-16"
        >
          {mode === 'client' ? <BookingPage /> : <AdminPanel />}
        </motion.main>
      </AnimatePresence>
    </div>
  );
}
