import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ExternalLink, LogOut } from 'lucide-react';
import { Header } from '../components/Header';
import { PageShell } from '../components/PageShell';
import { InstallBanner } from '../components/InstallBanner';
import { Button } from '../components/ui';
import { AdminLogin } from '../features/admin/AdminLogin';
import { AdminDashboard } from '../features/admin/AdminDashboard';
import { endSession, hasSession, startSession } from '../lib/auth';
import { useToast } from '../store/Toast';

/** Отдельная страница руководителя: без пароля дальше экрана входа не пускает. */
export function AdminApp() {
  const [authed, setAuthed] = useState(hasSession);
  const toast = useToast();

  const login = (remember: boolean) => {
    startSession(remember);
    setAuthed(true);
    toast('Добро пожаловать в панель руководителя');
  };

  const logout = () => {
    endSession();
    setAuthed(false);
    toast('Вы вышли из панели');
  };

  return (
    <PageShell>
      <Header caption="панель руководителя">
        <a
          href="../"
          target="_blank"
          rel="noopener"
          className="flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-ink/60 transition-colors hover:bg-violet-50 hover:text-violet-700"
        >
          <ExternalLink className="h-4 w-4" />
          <span className="hidden sm:inline">Страница записи</span>
        </a>
        {authed && (
          <Button variant="secondary" onClick={logout} aria-label="Выйти">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Выйти</span>
          </Button>
        )}
      </Header>
      {authed && (
        <InstallBanner
          storageKey="lumiere.admin.install.dismissed"
          icon="../icons/admin-192.png"
          title="Панель на главном экране"
          subtitle="Расписание и выручка всегда под рукой"
        />
      )}
      <AnimatePresence mode="wait">
        <motion.main
          key={authed ? 'panel' : 'login'}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto w-full max-w-6xl flex-1 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-10 sm:px-8 sm:pt-14"
        >
          {authed ? <AdminDashboard /> : <AdminLogin onSuccess={login} />}
        </motion.main>
      </AnimatePresence>
    </PageShell>
  );
}
