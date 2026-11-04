import { SALON } from '../data/catalog';

export function Footer() {
  return (
    <footer className="border-t border-ink/5">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-8 text-xs text-ink/40 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p>
          © {new Date().getFullYear()} {SALON.name} · {SALON.address}
        </p>
        <p>Ежедневно 10:00 — 20:00 · {SALON.phone}</p>
      </div>
    </footer>
  );
}
