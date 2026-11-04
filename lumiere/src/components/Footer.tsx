import { LockKeyhole } from 'lucide-react';
import { SALON } from '../data/catalog';

/** Подвал клиентской страницы с неприметным входом для сотрудников. */
export function Footer({ onStaffLogin }: { onStaffLogin: () => void }) {
  return (
    <footer className="border-t border-ink/5">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-8 text-xs text-ink/40 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p>
          © {new Date().getFullYear()} {SALON.name} · {SALON.address}
        </p>
        <button
          type="button"
          onClick={onStaffLogin}
          className="inline-flex items-center gap-1.5 self-start transition-colors hover:text-violet-600 sm:self-auto"
        >
          <LockKeyhole className="h-3.5 w-3.5" />
          Вход для сотрудников
        </button>
      </div>
    </footer>
  );
}
