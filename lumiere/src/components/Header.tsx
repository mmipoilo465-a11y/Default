import type { ReactNode } from 'react';

export function Logo({ caption = 'beauty atelier' }: { caption?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-violet-600 shadow-glow">
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
          <path d="M12 2c.8 4.6 3.4 7.2 8 8-4.6.8-7.2 3.4-8 8-.8-4.6-3.4-7.2-8-8 4.6-.8 7.2-3.4 8-8z" fill="#FFC498" />
        </svg>
      </span>
      <div className="leading-none">
        <p className="font-display text-[26px] font-semibold tracking-tight text-violet-900">Lumière</p>
        <p className="mt-1 hidden whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.28em] text-ink/40 sm:block">
          {caption}
        </p>
      </div>
    </div>
  );
}

/** Шапка: логотип слева, действия страницы справа. */
export function Header({ caption, children }: { caption?: string; children?: ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-b border-ink/5 bg-cream/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-4 px-4 sm:px-8">
        <Logo caption={caption} />
        <div className="flex items-center gap-2">{children}</div>
      </div>
    </header>
  );
}
