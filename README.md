# Tabель — Учёт рабочего времени

Совместное приложение для учёта рабочего времени бригады монтажников. Все
пользователи по ссылке видят общие данные в реальном времени.

Инструкция по деплою на **Timeweb Cloud** — см. [`DEPLOY.md`](./DEPLOY.md).

## Стек

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS v4 + shadcn/ui + recharts + wouter
- API: Express 5 + Orval (OpenAPI codegen) → React Query hooks
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- Build: esbuild (бандл API в один файл `.mjs`), Vite (статика фронтенда)
- В продакшене фронтенд и API — **один процесс**: Express отдаёт статику
  сборки Vite и обрабатывает `/api/*` — так проще всего разворачивать (один
  контейнер, один порт, никакого CORS).

## Локальная разработка

```bash
corepack enable
pnpm install

# терминал 1 — API (порт 3000)
PORT=3000 pnpm --filter @workspace/api-server run dev

# терминал 2 — фронтенд (порт 5173, проксирует /api на localhost:3000)
pnpm --filter @workspace/tabele run dev
```

Откройте http://localhost:5173.

Требуется переменная окружения `DATABASE_URL` (строка подключения к
PostgreSQL) для работы API-сервера.

## Полезные команды

- `pnpm run typecheck` — типы во всём workspace
- `pnpm run build` — типы + сборка всех пакетов
- `pnpm --filter @workspace/api-spec run codegen` — перегенерировать API
  хуки и Zod-схемы из `lib/api-spec/openapi.yaml`
- `pnpm --filter @workspace/db run push` — применить схему БД (dev)

## Где что лежит

- `lib/api-spec/openapi.yaml` — контракт API (источник истины)
- `lib/db/src/schema/` — Drizzle-схема БД (employees, work_objects, entries)
- `lib/api-client-react/src/generated/` — сгенерированные React Query хуки
- `artifacts/api-server/src/routes/` — обработчики Express-роутов
- `artifacts/tabele/src/pages/` — страницы React
- `Dockerfile`, `docker-compose.yml`, `DEPLOY.md` — деплой на Timeweb Cloud

## Продукт

- **Дашборд** — статистика за месяц (часы, дни, топ объектов, график
  активности, последние записи)
- **Заполнить день** — выбор сотрудника + даты, тип дня (работа/отпуск/
  больничный/выходной), тайм-сегменты по объектам; календарь заполненных дней
- **Сотрудники** — карточки CRUD; клик по карточке → полная статистика
  (по месяцам, по объектам, все записи)
- **Объекты** — карточки CRUD со статусом (активен/закрыт) и кодом ЛЗ
- **Отчёты** — фильтр по сотруднику, объекту, диапазону дат; выгрузка в CSV

## Особенности

- Без авторизации — общая ссылка для всей команды
- Язык интерфейса — русский
- Акцентный цвет — `#2c5f8a` (стальной синий)
