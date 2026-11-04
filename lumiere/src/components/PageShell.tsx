import { useEffect, type ReactNode } from 'react';
import { useToast } from '../store/Toast';

/** Общий фон страниц и уведомления о пропаже сети. */
export function PageShell({ children }: { children: ReactNode }) {
  const toast = useToast();

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

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[640px] overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-violet-200/40 blur-3xl" />
        <div className="absolute -right-32 top-20 h-[420px] w-[420px] rounded-full bg-peach-200/50 blur-3xl" />
      </div>
      {children}
    </div>
  );
}
