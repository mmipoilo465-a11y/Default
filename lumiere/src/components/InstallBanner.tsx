import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Share, SquarePlus, X } from 'lucide-react';
import { Button, IconButton } from './ui';
import { Modal } from './Modal';
import { useToast } from '../store/Toast';

/** Событие Chrome/Edge/Android, позволяющее показать системный диалог установки. */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

const isIos = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

function wasDismissed(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

interface InstallBannerProps {
  /** Ключ, под которым запоминается «больше не показывать». */
  storageKey: string;
  icon: string;
  title: string;
  subtitle: string;
}

export function InstallBanner({ storageKey, icon, title, subtitle }: InstallBannerProps) {
  const toast = useToast();
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [ios] = useState(() => isIos() && !isStandalone());
  const [dismissed, setDismissed] = useState(() => isStandalone() || wasDismissed(storageKey));
  const [iosHelp, setIosHelp] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as InstallPromptEvent);
    };
    const onInstalled = () => {
      setPromptEvent(null);
      setDismissed(true);
      toast('Приложение установлено на главный экран');
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, [toast]);

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(storageKey, '1');
    } catch {
      /* не критично */
    }
  };

  const install = async () => {
    if (promptEvent) {
      await promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      setPromptEvent(null);
      if (outcome === 'accepted') setDismissed(true);
    } else if (ios) {
      setIosHelp(true);
    }
  };

  const visible = !dismissed && (promptEvent !== null || ios);

  return (
    <>
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto max-w-6xl overflow-hidden px-4 sm:px-8"
          >
            <div className="mt-4 flex items-center gap-4 rounded-3xl bg-white p-3 pr-2 shadow-soft ring-1 ring-ink/5 sm:p-4">
              <img src={icon} alt="" className="h-12 w-12 shrink-0 rounded-2xl" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{title}</p>
                <p className="truncate text-xs text-ink/50">{subtitle}</p>
              </div>
              <Button onClick={install} className="h-10 shrink-0 px-4">
                Установить
              </Button>
              <IconButton onClick={dismiss} aria-label="Скрыть">
                <X className="h-4 w-4" />
              </IconButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Modal open={iosHelp} onClose={() => setIosHelp(false)} title="Установка на iPhone">
        <ol className="space-y-4">
          <Step n={1} icon={<Share className="h-4 w-4" />}>
            Нажмите «Поделиться» в панели Safari
          </Step>
          <Step n={2} icon={<SquarePlus className="h-4 w-4" />}>
            Выберите «На экран „Домой“»
          </Step>
          <Step n={3}>Нажмите «Добавить» — иконка появится рядом с другими приложениями</Step>
        </ol>
        <Button className="mt-8 w-full" onClick={() => setIosHelp(false)}>
          Понятно
        </Button>
      </Modal>
    </>
  );
}

function Step({ n, icon, children }: { n: number; icon?: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-center gap-4">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-violet-50 text-sm font-semibold text-violet-700">
        {icon ?? n}
      </span>
      <span className="text-sm leading-relaxed text-ink/70">{children}</span>
    </li>
  );
}
