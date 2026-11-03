# Вайб-Трекер Привычек 2.0

Геймифицированный трекер привычек: XP, HP, уровни, магазин наград, аналитика, корреляции и прогнозы.

- `vibe-tracker.html` — единственный исходник (он же публикуется как артефакт Claude).
- `docs/` — собранная PWA-версия, которую можно установить на главный экран телефона и использовать офлайн.

## Установка на телефон

Приложение раздаётся через GitHub Pages: **https://mmipoilo465-a11y.github.io/Default/**

- **iPhone (Safari):** открыть ссылку → «Поделиться» → «На экран „Домой“».
- **Android (Chrome):** открыть ссылку → меню ⋮ → «Установить приложение» / «Добавить на главный экран».

Данные хранятся в браузере телефона (LocalStorage). Перенос между устройствами — через «Данные → Экспорт / Импорт JSON».

## Включить GitHub Pages (один раз)

Settings → Pages → Build and deployment → Source: **Deploy from a branch** →
ветка `claude/habit-tracker-gamified-km2bhh`, папка **/docs** → Save.

## Пересборка после изменений

```bash
npm install
npm run build:pwa   # обновит docs/ и версию кэша service worker
```

## Atelier — запись в салон

В `docs/salon/` лежит собранное PWA онлайн-записи в салон красоты (исходники — ветка `claude/salon-booking-app`, папка `salon/`):
**https://mmipoilo465-a11y.github.io/Default/salon/**

## Lumière — запись в салон (фиолетово-персиковая версия)

Исходники в папке `lumiere/` (React + Tailwind + Lucide, локальное состояние). Запуск: `cd lumiere && npm install && npm run dev`. Подробности — в `lumiere/README.md`.
