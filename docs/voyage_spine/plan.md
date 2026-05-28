# Block 3 — Voyage Spine · Terminal Prompts

**Total terminals:** M0 + 2 milestone terminals.
M0 is the coordinator — no code, stays open the whole time.
M1 and M2 are each a fresh coding terminal.
Working directory for all terminals: `ERP_Operations/`.

## Milestone split rationale

Block 3 has two natural halves:

- **M1 owns the Voyage Spine API.** Backend-only. Mirrors Block 2's vertical-slice pattern (model → repo → service → API → tests) for `Voyage` + `ItineraryLine`. Establishes the second backend module under Tach. Confirms `orderinglist` works under TDD.
- **M2 births the frontend project.** No feature UI. Vite + TS strict + router + OpenAPI codegen + auth context shell + lint chain + test runner + CI integration. The shell every later UI block plugs into.

Splitting differently would either (a) bloat M1 with frontend scope it has no business carrying, or (b) split M1 across two terminals over what is a single proven vertical-slice pattern. Two milestones is the right shape. ([ADR-0012])

---

## M0 — Coordinator. Paste this first. Keep this terminal open forever.

```
You are the project coordinator for Block 3 — Voyage Spine of the Vessel & Voyage Operations Control System. You do not write code. Your only job is to guide me through building this block one milestone at a time.

Read these files now, in order:
- CLAUDE.md
- PROJECT_CONTEXT.md
- docs/architecture/locked_summary.md
- docs/adr/0001-modular-monolith.md
- docs/adr/0002-python-fastapi-backend.md
- docs/adr/0003-sqlalchemy-alembic-orm.md
- docs/adr/0004-dual-database-sqlite-postgres.md
- docs/adr/0005-react-vite-typescript-frontend.md
- docs/adr/0007-session-based-auth.md
- docs/adr/0010-tach-boundary-enforcement.md
- docs/adr/0011-real-db-integration-tests.md
- docs/adr/0012-per-block-four-doc-workflow.md
- docs/adr/0013-apscheduler-supersedes-huey.md
- docs/adr/0014-openai-sdk-supersedes-instructor.md
- docs/adr/0015-caddy-reverse-proxy.md
- OPEN_DECISIONS.md
- docs/master_data/runbook.md
- docs/voyage_spine/project_description.md
- docs/voyage_spine/architecture.md
- docs/voyage_spine/specifications.md
- docs/voyage_spine/locked_decisions.md
- docs/voyage_spine/plan.md

These are the full spec and your coordination map. When you are done, tell me you have read everything and ask me to confirm before we start.

Then guide me through M1 → M2 in sequence:
- Tell me which milestone is next
- Give me the exact prompt to paste into a new terminal
- Wait for me to tell you it is done and all tests pass
- Only then move to the next milestone

If I report a problem or blocker in any terminal, help me diagnose it. Do not move forward until the current milestone's done condition is fully met.

TDD rule for every milestone: test first (RED) → minimum code to pass (GREEN) → refactor only if clarity improves. No production code without a failing test first.

Real-DB tests only on the backend. No mocked persistence. No fakes. No in-memory stubs for SQLAlchemy.

Do not write code. Do not suggest code. Coordinate only.

When M2 is green, remind me to write docs/voyage_spine/runbook.md before declaring the block done (per [ADR-0012]).
```

---

## M1 — Voyage Spine API (backend vertical slice)

```
Read these files in full, in order:
- CLAUDE.md
- docs/architecture/locked_summary.md
- docs/adr/0001-modular-monolith.md
- docs/adr/0002-python-fastapi-backend.md
- docs/adr/0003-sqlalchemy-alembic-orm.md
- docs/adr/0004-dual-database-sqlite-postgres.md
- docs/adr/0007-session-based-auth.md
- docs/adr/0010-tach-boundary-enforcement.md
- docs/adr/0011-real-db-integration-tests.md
- docs/master_data/runbook.md
- docs/voyage_spine/project_description.md
- docs/voyage_spine/architecture.md
- docs/voyage_spine/specifications.md
- docs/voyage_spine/locked_decisions.md

Block 2 is shipped and green. Reuse its vertical-slice pattern verbatim (model → repository → service → API → tests). The Vessel implementation under `src/modules/master_data/` is your reference.

Implement M1 — Voyage Spine API.

## 1. Module scaffold

Create `src/modules/voyage_spine/` with subpackages: `api/`, `services/`, `repositories/`, `models/`, plus `exceptions.py` and `__init__.py`. Mirror Block 2 layout exactly.

Update `tach.toml`: declare `src.modules.voyage_spine` as a module. Forbid external imports of `voyage_spine.repositories.*` and `voyage_spine.models.*`. Allow `voyage_spine` to import only from `src.modules.master_data` (public surface — never repositories or models).

## 2. Voyage model and migration

- `models/voyage.py` — SQLAlchemy 2.0 declarative `Voyage` per architecture §4.1. UUIDv4 PK app-side. `voyage_no` UNIQUE. Enums (`status`, `cp_type`) as String + CheckConstraint. FK to `vessels.id` required, FK to `counterparties.id` nullable, self-FK on `previous_voyage_ref` nullable. Audit columns via `TimestampMixin`. Flat `terms_*` columns (D-LOCK-2). `expected_completing_manual_override` bool, defaults False.
- `models/itinerary_line.py` — `ItineraryLine` per architecture §4.2. FK to `voyages.id` with `ondelete='CASCADE'`. `port_function` enum as String + CheckConstraint. `UNIQUE (voyage_id, sequence_no)` constraint. CheckConstraint `planned_etd >= planned_eta`.
- On `Voyage`, declare the relationship `itinerary_lines` using `sqlalchemy.ext.orderinglist.ordering_list("sequence_no")` as `collection_class`, `order_by="ItineraryLine.sequence_no"`, `cascade="all, delete-orphan"` (D-LOCK-1).
- Generate the Alembic migration: `voyages` + `itinerary_lines` tables with all FKs, uniques, and check constraints. Verify it runs cleanly on SQLite (batch mode) and Postgres.

## 3. Repositories

- `repositories/voyage_repository.py` — `VoyageRepository(SQLAlchemyAsyncRepository[Voyage])`.
- `repositories/itinerary_line_repository.py` — `ItineraryLineRepository(SQLAlchemyAsyncRepository[ItineraryLine])`.

## 4. Service layer

`services/voyage_service.py` — `VoyageService` with: `create`, `get`, `list` (with filters), `update`, `transition_status`, `insert_itinerary_line`, `update_itinerary_line`, `delete_itinerary_line`, `list_itinerary`.

Invariants enforced:
- Unique `voyage_no`.
- `vessel_ref` exists and is Active (call into `master_data` public surface).
- `charterer_ref`, if set, exists and is Active.
- `previous_voyage_ref`, if set, exists.
- `port_ref` on every itinerary line exists and is Active.
- `port_function` and `cp_type` and `status` membership.
- Status transition matrix (D-LOCK-4): Scheduled → {Commenced, Cancelled}; Commenced → {Completed, Cancelled}; Completed → {Closed}; Closed/Cancelled terminal.
- On status transition, set the matching `*_at` timestamp.
- `expected_completing_datetime` recomputed after every itinerary CRUD operation as `max(planned_etd)` across lines (D-LOCK-3), unless `expected_completing_manual_override` is True.
- `D-10` itinerary line cap per voyage.

Raises typed domain exceptions: `DuplicateVoyageNumberError`, `MissingMasterDataReferenceError`, `IllegalVoyageStatusTransitionError`, `InvalidPortFunctionError`, `InvalidCpTypeError`, `ItineraryLineCapExceededError`.

## 5. API layer

`api/voyages.py` — FastAPI router under `/api/v1/voyages`. Endpoints per specifications §1 API surface. Pydantic v2 DTOs: `VoyageCreateDTO`, `VoyageUpdateDTO`, `VoyageResponseDTO`, `ItineraryLineCreateDTO`, `ItineraryLineUpdateDTO`, `ItineraryLineResponseDTO`, `VoyageStatusTransitionDTO`. `VoyageResponseDTO` nests the four `terms_*` columns under `terms`; the create/update DTOs accept the same nested shape.

All endpoints depend on `get_current_user` (Block 2 stub via `src/dependencies.py`).

`exceptions.py` — module-local domain exceptions and their HTTP mappings (409 for duplicates and illegal transitions, 422 for invalid enum/format, 404 for missing entities, 400 for cross-module reference failures).

`__init__.py` — re-export the router and the public types other modules will need (`VoyageStatus`, `PortFunction`).

## 6. Tests

Under `tests/modules/voyage_spine/`:
- `conftest.py` — FactoryBoy `VoyageFactory`, `ItineraryLineFactory`. Uses `VesselFactory` and `PortFactory` from `tests/modules/master_data/conftest.py`.
- `test_voyage_service.py` — service tests against real SQLite. Cover all invariants and the status transition matrix.
- `test_itinerary_ordering.py` — focused tests on the `orderinglist` behavior: insert-at-start, insert-mid, insert-end, reorder via sequence_no update, delete-and-renumber, cascade delete on voyage.
- `test_expected_completing_recompute.py` — recompute on every itinerary mutation; suppress when manual override True.
- `test_voyage_api.py` — API integration tests via TestClient. 201/200/404/409/422 paths for every endpoint.
- `test_cross_module_refs.py` — voyage rejection when vessel/port/counterparty refs don't exist or are Inactive.

Real SQLite engine only. No persistence mocking.

## 7. CI

Update `.github/workflows/ci.yml`: existing jobs (lint+typecheck+tach, pytest, Postgres migration smoke) now cover `voyage_spine` automatically. Verify the `get_current_user_stub` grep gate still passes (the new module must use the `get_current_user` alias).

## 8. TDD discipline

RED → GREEN → REFACTOR. Commit at each GREEN. Real-DB tests only.

## Done when

- All voyage and itinerary endpoints work end-to-end via curl/HTTPie against a running dev server.
- `make test` runs the full pytest suite under 30s (D-1), all green.
- `make lint`, `make typecheck`, `tach check` pass with zero issues.
- Coverage on `src/modules/voyage_spine/` ≥95% line (D-2).
- CI green on all three jobs.
- Alembic migration creates `voyages` and `itinerary_lines` with all constraints.
- OpenAPI schema regenerated at `/openapi.json` and committed to `openapi/openapi.json`.

Ask me before making any decision not covered by the specs.
```

---

## M2 — Frontend Scaffold

```
Read these files in full, in order:
- CLAUDE.md
- docs/architecture/locked_summary.md
- docs/adr/0005-react-vite-typescript-frontend.md
- docs/adr/0007-session-based-auth.md
- docs/adr/0011-real-db-integration-tests.md
- OPEN_DECISIONS.md (especially §13, §15, §16)
- docs/voyage_spine/project_description.md
- docs/voyage_spine/architecture.md
- docs/voyage_spine/specifications.md

M1 is complete: the backend ships voyage and itinerary endpoints; OpenAPI schema is at `openapi/openapi.json`.

Implement M2 — Frontend Scaffold.

**Hard scope line: zero feature pages.** The deliverable is a project shell. A placeholder root route ("Vessel & Voyage Operations Control System — scaffold OK") is the only UI artefact. Block 4 owns the first real feature.

## 1. Project setup

Create `frontend/` at the repo root.

- `package.json` — pnpm, type: "module".
- Dependencies (current stable as of 2026, per OPEN_DECISIONS §15 / recheck):
  - `react` 19.x, `react-dom` 19.x
  - `vite` 8.x, `@vitejs/plugin-react` current
  - `typescript` 6.x
  - `@tanstack/react-router` current (lock exact version)
  - `@tanstack/react-query` current
  - `openapi-typescript` and `openapi-fetch` current
- Dev dependencies: `vitest`, `@testing-library/react`, `@playwright/test`, `eslint`, `typescript-eslint`, `prettier`, `eslint-plugin-boundaries`.
- `tsconfig.json` — `"strict": true`, `"noUncheckedIndexedAccess": true`, `target: "ES2022"`, `moduleResolution: "bundler"`, `jsx: "react-jsx"`.
- `vite.config.ts` — React plugin, dev server on port 5173 (D-14), proxy `/api` → `http://localhost:8000` for dev parity.
- `.eslintrc.cjs` — typescript-eslint recommended-strict, Prettier integration, `eslint-plugin-boundaries` configured with a module-list scaffold even though only one "module" exists today.
- `.prettierrc` — minimal config; tabs vs spaces follow project convention.
- `pnpm-lock.yaml` committed.

## 2. OpenAPI codegen pipeline

- npm script `codegen`: runs `openapi-typescript ../openapi/openapi.json -o src/api/schema.ts`.
- `src/api/client.ts` — thin wrapper around `openapi-fetch` bound to `paths` from `schema.ts`, base URL from `import.meta.env.VITE_API_BASE_URL`.
- npm script `typecheck`: `tsc --noEmit`. Codegen + typecheck run in CI; if backend OpenAPI changes break frontend types, CI fails.

## 3. Routing

- TanStack Router with file-based or code-based routing — engineer's choice, document the choice in `frontend/README.md`.
- Routes:
  - `/` — placeholder root route. Renders the string "Vessel & Voyage Operations Control System — scaffold OK". Imports `useCurrentUser()` to prove the auth context is wired.
  - `/_authenticated` — layout route wrapping any future feature routes; guarded by `<RequireAuth>`.
- No other routes.

## 4. Auth context shell

- `src/auth/AuthContext.tsx` — React context exposing `{ currentUser, loading, signIn, signOut }`. For Block 3, `signIn` and `signOut` are stubs that resolve immediately; `currentUser` is hydrated from a placeholder value matching the backend stub identity.
- `src/auth/RequireAuth.tsx` — route guard that redirects to a placeholder login page (out of scope; just renders a "Login (stub)" message for now).
- Block 3.5 will replace only the network calls inside this context. Public interface is frozen.

## 5. Query client + error boundary

- `src/lib/queryClient.ts` — TanStack Query client with sensible defaults (30s stale, no refetchOnWindowFocus).
- `src/lib/ErrorBoundary.tsx` — application-wide error boundary; logs to console (structlog parity comes later).
- Wire both into `src/main.tsx`.

## 6. Tests

- `src/__tests__/scaffold.test.tsx` — renders the root route, asserts the scaffold string is on screen, asserts auth context initialized.
- `e2e/scaffold.spec.ts` — Playwright: boots Vite dev, navigates to `/`, asserts the scaffold string is visible.
- `vitest.config.ts` configured with jsdom environment.

## 7. CI

Add a frontend job to `.github/workflows/ci.yml`:
- `pnpm install --frozen-lockfile`
- `pnpm run codegen` (requires `openapi/openapi.json` from the backend — Vite job depends on backend tests passing first)
- `pnpm run typecheck`
- `pnpm run lint`
- `pnpm run test` (Vitest)
- `pnpm exec playwright install --with-deps` then `pnpm run test:e2e` against a backend running via `make dev` in a background step
- `pnpm audit --audit-level=high` (residual mitigation from the TanStack supply-chain incident — OPEN_DECISIONS §15).

## 8. TDD discipline

Frontend tests describe behavior, not implementation. Vitest + RTL for components, Playwright for the one boot-and-render smoke. Add tests *before* the component they verify.

## Done when

- `pnpm run dev` boots Vite on port 5173 and serves the scaffold string.
- `pnpm run build` produces a clean production bundle.
- `pnpm run typecheck`, `pnpm run lint`, `pnpm run test`, `pnpm run test:e2e`, `pnpm audit --audit-level=high` all pass.
- Backend OpenAPI changes break the frontend type check (verified by deliberately introducing a contract break, watching CI fail, reverting).
- CI runs the new frontend job end-to-end green.
- `frontend/README.md` documents: how to boot, how to regenerate types, the routing approach choice, and the freeze on adding feature pages until Block 4.

Ask me before making any decision not covered by the specs.
```

---

## After M2 green

Per [ADR-0012], write `docs/voyage_spine/runbook.md` before declaring Block 3 done. The runbook should cover:

- How to run backend + frontend locally (`make dev` + `pnpm run dev`).
- Seeding minimal test data: a vessel, a port, a counterparty, a voyage, a couple of itinerary lines (curl examples).
- How to inspect the OpenAPI schema and regenerate frontend types.
- How to add a backend migration (mirrors Block 2 runbook; cross-reference).
- Common failure modes: itinerary sequence integrity violations, illegal status transitions, missing master-data refs, OpenAPI codegen drift, TanStack Router lockfile drift.
- Operational notes: still no real auth (Block 3.5 next); still no production deploy posture (deployment milestone at Block 10).
- Useful URLs (backend Swagger, OpenAPI JSON, Vite dev server, committed OpenAPI reference).

Then I (the orchestrator) audit the block, verify diffs, verify CI evidence for the exact commit, and update `PROJECT_CONTEXT.md` to "Block 3 complete, Block 3.5 next."
