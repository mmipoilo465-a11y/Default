import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  /** sheet — боковая панель на десктопе; на мобильных всегда bottom-sheet */
  variant?: 'center' | 'sheet';
  className?: string;
}

export function Modal({ open, onClose, title, children, variant = 'center', className }: ModalProps) {
  const panel = useRef<HTMLDivElement>(null);
  const drag = useDragControls();

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    requestAnimationFrame(() => panel.current?.focus());
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div
          className={cn('fixed inset-0 z-50 flex items-end justify-center', variant === 'sheet' ? 'sm:items-stretch sm:justify-end' : 'sm:items-center sm:p-4')}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            className="absolute inset-0 bg-slate-950/30 backdrop-blur-md dark:bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            ref={panel}
            tabIndex={-1}
            initial={variant === 'sheet' ? { y: '100%', x: 0 } : { y: 24, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, x: 0, opacity: 1, scale: 1 }}
            exit={variant === 'sheet' ? { y: '100%' } : { y: 24, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            dragListener={false}
            dragControls={drag}
            onDragEnd={(_, info) => info.offset.y > 120 && onClose()}
            className={cn(
              'relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] border border-slate-200/70 bg-white shadow-lift outline-none dark:border-slate-800 dark:bg-slate-950',
              'sm:max-h-[86vh] sm:max-w-lg sm:rounded-3xl',
              variant === 'sheet' && 'sm:m-3 sm:max-h-none sm:max-w-md',
              className,
            )}
          >
            {/* «ручка» bottom-sheet: тянем вниз, чтобы закрыть */}
            <div className="touch-none sm:touch-auto" onPointerDown={(e) => window.innerWidth < 640 && drag.start(e)}>
            <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-slate-200 sm:hidden dark:bg-slate-700" />
            <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-3 sm:px-6 sm:pt-5">
              <div className="min-w-0 text-[17px] font-semibold tracking-tight">{title}</div>
              <button
                onClick={onClose}
                className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-500 transition hover:text-slate-900 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-white"
                aria-label="Закрыть"
              >
                <X size={16} />
              </button>
            </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] sm:px-6 sm:pb-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
