# Block 4 — Vessel Schedule · Project Description

## What this block is

Block 4 builds the home screen of the application: the **Vessel Schedule** — a read-only Gantt showing every active vessel and its voyages on a timeline. It also builds the **Voyage Workspace** — a detail view for a single voyage, reached by clicking any bar on the schedule.

This is the first feature block. Real auth is in place (Block 3.5). Vessel, port, counterparty, and voyage data exist in the database (Blocks 2 + 3). Block 4 is the first time an operator can open a browser, log in, and see something meaningful.

## What it delivers

- **`GET /api/v1/schedule`** — schedule aggregation endpoint. Temporal overlap query across all active vessels and their voyages within a date window. Filterable by vessel, status, voyage search.
- **`GET /api/v1/voyages/{id}/workspace`** — full voyage detail endpoint for the workspace view.
- **Vessel Schedule page** — the app home screen. ECharts custom-series Gantt: rows = vessels, bars = voyages, color by status, tooltip, date pan/zoom, filter bar, click → Voyage Workspace.
- **Voyage Workspace page** — voyage header, ordered itinerary table, instructions/notes. Read-only.
- **Navigation** — schedule → workspace → back, with filter state preserved in the URL.

## What it is NOT

- No editing. Voyage editing comes in a later block.
- No drag-to-reschedule. The Gantt is read-only.
- No port call data on the schedule (Block 5 owns port calls).
- No real alert/task dots (the dot renders dormant on bars; Block 10 activates it).
- No new domain entities. This block is a read projection of existing data.

## Success criteria

- Operator logs in → lands on Vessel Schedule → sees all active vessels with voyage bars.
- Date range, vessel filter, status filter, search input all narrow the displayed bars correctly.
- Hovering a bar shows charterer, port sequence, ETA/ETD in a tooltip.
- Clicking a bar navigates to the Voyage Workspace for that voyage.
- Workspace shows voyage header, ordered itinerary, instructions/notes.
- Back button returns to the schedule with the same filters intact.
- `make test` green under 30s. `make lint`, `make typecheck`, `tach check` pass.
- Frontend `pnpm run test`, `pnpm run typecheck`, `pnpm run lint`, `pnpm run test:e2e` pass.
- Playwright e2e covers: login → schedule → filter → click bar → workspace → back.
- CI green on all jobs.

## Constraints

- TDD. Real-DB backend tests. [ADR-0011]
- ECharts only for charting. [ADR-0017]
- No commercial UI libraries.
- All routes behind `<RequireAuth>`. Session cookie on all API calls.
- mypy `--strict`, Tach boundaries, 12-Factor (config via env).
