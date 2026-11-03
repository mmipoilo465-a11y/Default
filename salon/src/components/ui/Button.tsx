import { forwardRef } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';

type Variant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'outline';
type Size = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends HTMLMotionProps<'button'> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 shadow-[inset_0_1px_0_rgb(255_255_255/0.12)]',
  accent: 'bg-accent-600 text-white hover:bg-accent-700 shadow-[inset_0_1px_0_rgb(255_255_255/0.18)]',
  secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200/80 dark:bg-slate-800/80 dark:text-slate-100 dark:hover:bg-slate-800',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-white',
  outline:
    'border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-xl',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-[15px] gap-2 rounded-2xl',
  icon: 'h-9 w-9 rounded-xl',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, disabled, className, children, ...rest },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      whileTap={disabled || loading ? undefined : { scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      disabled={disabled || loading}
      className={cn(
        'inline-flex select-none items-center justify-center whitespace-nowrap font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-40',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children as React.ReactNode}
    </motion.button>
  );
});
