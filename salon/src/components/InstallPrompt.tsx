import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Download, Share, SquarePlus, X } from 'lucide-react';
import { Button } from './ui/Button';

const KEY = 'atelier.install.dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

function wasDismissed() {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

/** Ненавязчивое предложение добавить приложение на главный экран */
export function InstallPrompt() {
  const [mode, setMode] = useState<'android' | 'ios' | null>(null);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandalone() || wasDismissed()) return;
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setMode('android');
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    // В Safari на iOS нет системного события — показываем инструкцию
    const t = isIos() ? window.setTimeout(() => setMode('ios'), 2500) : undefined;
    const onInstalled = () => setMode(null);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      window.clearTimeout(t);
    };
  }, []);

  function dismiss() {
    setMode(null);
    try {
      localStorage.setItem(KEY, '1');
    } catch {
      /* ignore */
    }
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    if (outcome === 'accepted') setMode(null);
    else dismiss();
  }

  return (
    <AnimatePresence>
      {mode && (
        <motion.div
          initial={{ opacity: 0, y: -12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          className="fixed inset-x-3 top-[calc(env(safe-area-inset-top)+4rem)] z-50 mx-auto max-w-md rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-lift backdrop-blur-xl sm:inset-x-auto sm:right-6 dark:border-slate-800 dark:bg-slate-900/90"
          role="dialog"
          aria-label="Установить приложение"
        >
          <div className="flex items-start gap-3">
            <img src="./icons/icon-192.png" alt="" className="h-11 w-11 shrink-0 rounded-[12px]" />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold tracking-tight">Atelier на главном экране</p>
              {mode === 'android' ? (
                <p className="mt-0.5 text-[13px] text-slate-500 dark:text-slate-400">Запись в один тап, работает даже без интернета.</p>
              ) : (
                <p className="mt-0.5 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
                  Нажмите <Share size={13} className="mx-0.5 inline -translate-y-px" /> «Поделиться», затем
                  <SquarePlus size={13} className="mx-0.5 inline -translate-y-px" /> «На экран „Домой“».
                </p>
              )}
            </div>
            <button onClick={dismiss} className="-mr-1 -mt-1 rounded-lg p-1.5 text-slate-400 transition hover:text-slate-700 dark:hover:text-slate-200" aria-label="Не сейчас">
              <X size={16} />
            </button>
          </div>
          {mode === 'android' && (
            <div className="mt-3 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={dismiss}>
                Не сейчас
              </Button>
              <Button variant="accent" size="sm" onClick={install}>
                <Download size={14} /> Установить
              </Button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
