import { Phone } from 'lucide-react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { PageShell } from '../components/PageShell';
import { InstallBanner } from '../components/InstallBanner';
import { BookingPage } from '../features/booking/BookingPage';
import { SALON } from '../data/catalog';

/** Страница посетителя: только онлайн-запись. */
export function VisitorApp() {
  return (
    <PageShell>
      <Header>
        <a
          href={`tel:${SALON.phone.replace(/[^\d+]/g, '')}`}
          className="flex h-11 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-ink/70 shadow-soft ring-1 ring-ink/5 transition-colors hover:text-violet-700"
        >
          <Phone className="h-4 w-4 text-violet-500" />
          <span className="hidden sm:inline">{SALON.phone}</span>
          <span className="sm:hidden">Позвонить</span>
        </a>
      </Header>
      <InstallBanner
        storageKey="lumiere.install.dismissed"
        icon="./icons/icon-192.png"
        title="Приложение Lumière"
        subtitle="Иконка на экране и работа офлайн"
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-10 sm:px-8 sm:pt-16">
        <BookingPage />
      </main>
      <Footer />
    </PageShell>
  );
}
