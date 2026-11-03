import { motion } from 'framer-motion';
import { useId } from 'react';
import { cn } from '../../lib/cn';

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: React.ReactNode }>;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn('inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-900', className)} role="tablist">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'relative flex-1 whitespace-nowrap rounded-[10px] px-3 py-1.5 text-[13px] font-medium transition-colors',
              active ? 'text-slate-950 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200',
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-[10px] bg-white shadow-sm dark:bg-slate-800"
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              />
            )}
            <span className="relative z-10 inline-flex items-center gap-1.5">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
