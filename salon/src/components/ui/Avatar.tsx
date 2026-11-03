import { cn } from '../../lib/cn';

const TONES = [
  'from-slate-200 to-slate-400 text-slate-800 dark:from-slate-600 dark:to-slate-800 dark:text-white',
  'from-stone-100 to-stone-300 text-stone-800 dark:from-stone-600 dark:to-stone-800 dark:text-white',
  'from-zinc-700 to-zinc-950 text-white dark:from-zinc-300 dark:to-zinc-500 dark:text-zinc-950',
];

export function Avatar({ name, tone = 0, size = 44, className, ring }: { name: string; tone?: number; size?: number; className?: string; ring?: boolean }) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('');
  return (
    <span
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      className={cn(
        'relative inline-grid shrink-0 select-none place-items-center rounded-full bg-gradient-to-br font-semibold tracking-tight',
        TONES[tone % TONES.length],
        ring && 'ring-2 ring-white dark:ring-slate-950',
        className,
      )}
      aria-hidden
    >
      {initials}
    </span>
  );
}
