import { useEffect, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { Header, type Route } from './components/Header';
import { BookingWizard } from './features/booking/BookingWizard';
import { AdminPanel } from './features/admin/AdminPanel';
import { AppStoreProvider } from './store/AppStore';
import { ThemeProvider } from './store/Theme';
import { ToastProvider } from './store/Toast';

const routeFromHash = (): Route => (window.location.hash.startsWith('#/admin') ? 'admin' : 'booking');

export default function App() {
  const [route, setRoute] = useState<Route>(routeFromHash);

  useEffect(() => {
    const onHash = () => {
      setRoute(routeFromHash());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    document.title = route === 'admin' ? 'Atelier — панель управления' : 'Atelier — онлайн-запись';
  }, [route]);

  return (
    <MotionConfig reducedMotion="user">
      <ThemeProvider>
        <ToastProvider>
          <AppStoreProvider>
            <div className="relative min-h-[100dvh]">
              {/* тонкий фоновой градиент */}
              <div
                aria-hidden
                className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(60%_60%_at_50%_0%,rgb(9_121_105/0.07),transparent)] dark:bg-[radial-gradient(60%_60%_at_50%_0%,rgb(9_121_105/0.14),transparent)]"
              />
              <Header route={route} onRoute={setRoute} />
              <AnimatePresence mode="wait">
                <motion.main key={route} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                  {route === 'admin' ? <AdminPanel /> : <BookingWizard />}
                </motion.main>
              </AnimatePresence>
            </div>
          </AppStoreProvider>
        </ToastProvider>
      </ThemeProvider>
    </MotionConfig>
  );
}
