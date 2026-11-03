import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import type { AppointmentStatus } from '../../lib/types';

type Tone = 'neutral' | 'accent' | 'solid' | 'outline' | 'muted';
const TONES: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  accent: 'bg-accent-50 text-accent-700 ring-1 ring-inset ring-accent-600/15 dark:bg-accent-500/10 dark:text-accent-300 dark:ring-accent-400/20',
  solid: 'bg-slate-950 text-white dark:bg-white dark:text-slate-950',
  outline: 'ring-1 ring-inset ring-slate-200 text-slate-600 dark:ring-slate-700 dark:text-slate-300',
  muted: 'bg-transparent text-slate-400 dark:text-slate-500',
};

export function Badge({ tone = 'neutral', className, children, icon }: { tone?: Tone; className?: string; children: ReactNode; icon?: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium leading-5', TONES[tone], className)}>
      {icon}
      {children}
    </span>
  );
}

export const STATUS_META: Record<AppointmentStatus, { label: string; dot: string; badge: string }> = {
  pending: {
    label: 'В ожидании',
    dot: 'bg-transparent ring-[1.5px] ring-inset ring-slate-400',
    badge: 'bg-white text-slate-600 ring-1 ring-inset ring-dashed ring-slate-300 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-600',
  },
  confirmed: {
    label: 'Подтверждено',
    dot: 'bg-accent-600',
    badge: 'bg-accent-50 text-accent-700 ring-1 ring-inset ring-accent-600/20 dark:bg-accent-500/10 dark:text-accent-300 dark:ring-accent-400/25',
  },
  in_progress: {
    label: 'В процессе',
    dot: 'bg-accent-600 animate-pulse',
    badge: 'bg-accent-600 text-white',
  },
  completed: {
    label: 'Завершено',
    dot: 'bg-slate-900 dark:bg-slate-200',
    badge: 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900',
  },
  cancelled: {
    label: 'Отменено',
    dot: 'bg-slate-300 dark:bg-slate-600',
    badge: 'bg-slate-100 text-slate-400 line-through dark:bg-slate-800/60 dark:text-slate-500',
  },
};

export function StatusBadge({ status, className }: { status: AppointmentStatus; className?: string }) {
  const m = STATUS_META[status];
  return <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium leading-5', m.badge, className)}>{m.label}</span>;
}
