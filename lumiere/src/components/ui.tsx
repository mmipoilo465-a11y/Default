import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import type { Master } from '../lib/types';
import { cn } from '../lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const variants: Record<Variant, string> = {
  primary: 'bg-violet-600 text-white shadow-glow hover:bg-violet-700 disabled:bg-violet-200 disabled:shadow-none',
  secondary: 'bg-white text-ink ring-1 ring-ink/10 hover:ring-violet-300 hover:text-violet-700',
  ghost: 'text-ink/70 hover:bg-violet-50 hover:text-violet-700',
  danger: 'bg-rose-50 text-rose-700 hover:bg-rose-100',
};

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: Variant;
  size?: 'md' | 'lg';
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', className, children, disabled, ...rest },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      disabled={disabled}
      className={cn(
        'inline-flex select-none items-center justify-center gap-2 rounded-full font-semibold transition-colors duration-200 disabled:cursor-not-allowed',
        size === 'lg' ? 'h-14 px-8 text-[15px]' : 'h-11 px-5 text-sm',
        variants[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </motion.button>
  );
});

export function IconButton({ className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        'grid h-9 w-9 place-items-center rounded-full text-ink/50 transition hover:bg-violet-50 hover:text-violet-700',
        className,
      )}
      {...rest}
    />
  );
}

export function Avatar({ master, size = 48, className }: { master: Master; size?: number; className?: string }) {
  const initials = master.name
    .split(' ')
    .map((p) => p[0])
    .join('');
  return (
    <span
      className={cn('grid shrink-0 place-items-center rounded-full font-semibold text-white', className)}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.34,
        backgroundImage: `linear-gradient(135deg, ${master.tone[0]}, ${master.tone[1]})`,
      }}
      aria-hidden
    >
      {initials}
    </span>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn('text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-500', className)}>
      {children}
    </p>
  );
}
