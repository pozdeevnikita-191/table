# Tabель — Учёт рабочего времени

Совместное приложение для учёта рабочего времени бригады монтажников. Все пользователи по ссылке видят общие данные в реальном времени.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS v4 + shadcn/ui + recharts + wouter
- API: Express 5 + Orval (OpenAPI codegen) → React Query hooks
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/db/src/schema/` — Drizzle DB schema (employees, work_objects, entries)
- `lib/api-client-react/src/generated/` — auto-generated React Query hooks + Zod schemas
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/tabele/src/pages/` — React page components
- `artifacts/tabele/src/components/Layout.tsx` — sidebar + header layout

## Architecture decisions

- Contract-first: OpenAPI spec → Orval codegen → React Query hooks. Never write API client code by hand.
- Entry upsert: POST `/api/entries` upserts by (employeeId + date) — saves re-checking existence on client.
- Segments JSON: a single entry row stores multiple time segments (objectId, start, end, note) as JSONB.
- Shared PostgreSQL: all users see live data — no auth, intended for team-internal use.

## Product

- **Дашборд** — monthly stats (hours, days, top objects, activity chart, recent entries)
- **Заполнить день** — select employee + date, pick day type (work/vacation/sick/off), add time segments per object; calendar view shows filled days
- **Сотрудники** — CRUD cards; click card → full stats page (by month, by object, all entries)
- **Объекты** — CRUD cards with status (active/closed) and ЛЗ code
- **Отчёты** — filter by employee, object, date range; download CSV export

## User preferences

- Language: Russian (all UI text in Russian)
- Accent color: `#2c5f8a` (steel blue)
- No authentication — shared link for the whole team

## Gotchas

- Run `pnpm --filter @workspace/api-spec run codegen` after any OpenAPI spec changes
- Run `pnpm --filter @workspace/db run push` after schema changes (dev only)
- Vite builds needs `PORT` and `BASE_PATH` from workflow env — use `typecheck` not `build` to verify

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
