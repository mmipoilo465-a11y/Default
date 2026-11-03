import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-2xl border border-slate-200/70 bg-white shadow-soft dark:border-slate-800/80 dark:bg-slate-900/60 dark:shadow-none', className)}
      {...rest}
    />
  );
}

export function CardHeader({ title, subtitle, action, className }: { title: React.ReactNode; subtitle?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold tracking-tight">{title}</h3>
        {subtitle && <p className="mt-0.5 text-[13px] text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
