import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Header } from './components/Header';
import { BookingPage } from './features/booking/BookingPage';
import { AdminPanel } from './features/admin/AdminPanel';
import type { Mode } from './lib/types';

const initialMode = (): Mode => (window.location.hash === '#admin' ? 'admin' : 'client');

export default function App() {
  const [mode, setMode] = useState<Mode>(initialMode);

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

      <AnimatePresence mode="wait">
        <motion.main
          key={mode}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-8 sm:pt-16"
        >
          {mode === 'client' ? <BookingPage /> : <AdminPanel />}
        </motion.main>
      </AnimatePresence>
    </div>
  );
}
