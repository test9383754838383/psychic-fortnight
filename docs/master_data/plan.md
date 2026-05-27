# Block 2 — Master Data · Terminal Prompts

**Total terminals:** M0 + 2 milestone terminals.
M0 is the coordinator — no code, stays open the whole time.
M1 and M2 are each a fresh coding terminal.
Working directory for all terminals: `ERP_Operations/` (CLAUDE.md auto-loads).

## Milestone split rationale

Block 2 is the foundational data layer: three entities + one join, no UI, no LLM, no jobs. The work splits naturally in two:

- **M1 owns the scaffold and the first vertical slice (`Vessel`).** Every pattern every later block reuses is established here: project layout, FastAPI factory, advanced-alchemy repositories, Alembic with batch mode, Tach config, real-DB test harness, auth stub, CI migration gate. `Vessel` is the reference end-to-end implementation.
- **M2 replicates the proven pattern across `Port`, `Counterparty`, and `CounterpartyRole`.** No new scaffolding decisions; repeat the M1 vertical slice three more times with each entity's invariants (UNLOCODE format, country derivation, role attach/detach, agent-role conditional fields).

Splitting further would mean cold-starting a terminal for one entity at a time — pure context tax. ([ADR-0012])

---

## M0 — Coordinator. Paste this first. Keep this terminal open forever.

```
You are the project coordinator for Block 2 — Master Data of the Vessel & Voyage Operations Control System. You do not write code. Your only job is to guide me through building this block one milestone at a time.

Read these files now, in order:
- CLAUDE.md
- PROJECT_CONTEXT.md
- docs/architecture/locked_summary.md
- docs/adr/0001-modular-monolith.md
- docs/adr/0002-python-fastapi-backend.md
- docs/adr/0003-sqlalchemy-alembic-orm.md
- docs/adr/0004-dual-database-sqlite-postgres.md
- docs/adr/0007-session-based-auth.md
- docs/adr/0010-tach-boundary-enforcement.md
- docs/adr/0011-real-db-integration-tests.md
- docs/adr/0012-per-block-four-doc-workflow.md
- OPEN_DECISIONS.md
- docs/master_data/project_description.md
- docs/master_data/architecture.md
- docs/master_data/specifications.md
- docs/master_data/plan.md

These are the full spec and your coordination map. When you are done, tell me you have read everything and ask me to confirm before we start.

Then guide me through M1 → M2 in sequence:
- Tell me which milestone is next
- Give me the exact prompt to paste into a new terminal
- Wait for me to tell you it is done and all tests pass
- Only then move to the next milestone

If I report a problem or blocker in any terminal, help me diagnose it. Do not move forward until the current milestone's done condition is fully met.

TDD rule for every milestone: test first (RED) → minimum code to pass (GREEN) → refactor only if clarity improves. No production code without a failing test first.

Real-DB tests only. No mocked persistence. No fakes. No in-memory stubs for SQLAlchemy.

Do not write code. Do not suggest code. Coordinate only.

When M2 is green, remind me to write docs/master_data/runbook.md before declaring the block done (per [ADR-0012]).
```

---

## M1 — Scaffold + Vessel End-to-End

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
- docs/master_data/project_description.md
- docs/master_data/architecture.md
- docs/master_data/specifications.md
- docs/master_data/plan.md

This is the first milestone of Block 2. The repo currently has no application code. You are establishing every pattern the rest of V1 will reuse.

Implement M1 — Scaffold + Vessel End-to-End.

## 1. Project scaffold

Create:
- `pyproject.toml` with: fastapi, uvicorn[standard], sqlalchemy>=2.0, advanced-alchemy[fastapi], alembic, pydantic>=2, pydantic-settings, aiosqlite, asyncpg. Dev deps: pytest, pytest-asyncio, pytest-xdist, httpx, factory-boy, ruff, mypy, tach.
- Use `uv` for dependency management. Commit `uv.lock`.
- `Makefile` with targets: `dev`, `test`, `lint`, `typecheck`, `migrate`, `migration`.
- `.env.example` with all required env vars (DATABASE_URL, SESSION_SECRET).
- `src/app.py` — FastAPI factory `create_app() -> FastAPI`. Registers the master_data router. Mounts global exception handlers.
- `src/config.py` — pydantic-settings `Settings` class. Loads from env.
- `src/dependencies.py` — `get_db_session()` and `get_current_user_stub()` factories.
- `src/exceptions.py` — base `DomainError` and a FastAPI exception handler mapping domain errors to 4xx responses.
- `tach.toml` at repo root. Declare `src.modules.master_data` as a module. Forbid external code from importing `src.modules.master_data.repositories.*` or `src.modules.master_data.models.*`; only `src.modules.master_data` (the package's public surface) is importable.

## 2. Database + migrations

- `alembic/` initialised. `alembic/env.py` reads `DATABASE_URL` from env, supports both SQLite (with `render_as_batch=True`) and Postgres.
- Generate the initial migration after the Vessel model exists.
- `docker-compose.yml` with a `postgres` service (Postgres 16, mounted volume). App container is deferred — local dev runs uvicorn directly.

## 3. Vessel vertical slice

Under `src/modules/master_data/`:

- `models/vessel.py` — SQLAlchemy 2.0 declarative model. Fields per architecture §4.1. UUIDv4 PK app-side. `code` UNIQUE. Enums as String + CheckConstraint. `created_at` / `updated_at` via `TimestampMixin`. `owner_ref`, `technical_manager_ref`, `ops_manager_user_id` are nullable strings (real FK targets land in M2 / auth block).
- `repositories/vessel_repository.py` — `VesselRepository(SQLAlchemyAsyncRepository[Vessel])`.
- `services/vessel_service.py` — `VesselService` with `create`, `get`, `list`, `update`, `deactivate`. Enforces domain invariants: unique code, valid IMO format (7 digits — see D-5), valid status enum, valid vessel_type enum. Raises typed domain exceptions (`DuplicateVesselCodeError`, `InvalidIMOError`, etc.).
- `api/vessels.py` — FastAPI router under `/api/v1/vessels`. Endpoints per specifications §1. Pydantic v2 DTOs: `VesselCreateDTO`, `VesselUpdateDTO`, `VesselResponseDTO`. All endpoints depend on `get_current_user_stub`.
- `exceptions.py` — module-local domain exceptions and their HTTP mappings.
- `__init__.py` — re-exports the router and any types other modules will need.

## 4. Test harness

Under `tests/`:

- `conftest.py` (root) — fixtures for: async in-memory SQLite engine, Alembic migrations applied per session, transactional rollback session per test, `TestClient` / `AsyncClient` against the FastAPI app with the DB dependency overridden.
- `tests/modules/master_data/conftest.py` — FactoryBoy `VesselFactory`.
- `tests/modules/master_data/test_vessel_service.py` — service-layer tests against real SQLite. Cover: create happy path, duplicate code rejection, invalid IMO rejection, get/list/update, deactivate flips status.
- `tests/modules/master_data/test_vessel_api.py` — API integration tests via TestClient. Cover: 201 on create, 422 on bad payload, 409 on duplicate code, 200 on get/list/update, 200 on deactivate, 404 on missing id.
- Real SQLite engine only. No `unittest.mock.patch` on persistence. No fake repositories.

## 5. CI

- `.github/workflows/ci.yml` (or equivalent) with three jobs:
  1. lint + typecheck + tach
  2. pytest against in-memory SQLite
  3. migration smoke test against an ephemeral Postgres 16 container — `alembic upgrade head` → `alembic downgrade base` → `alembic upgrade head`, all clean.
- A grep job that fails the build if `get_current_user_stub` appears outside `tests/` or `src/dependencies.py`.

## 6. TDD discipline

For every piece of production code in this milestone:
- Write the failing test first (RED).
- Write the minimum code to pass (GREEN).
- Refactor only if clarity improves.
- Commit at each GREEN.

Real-DB tests only. No mocked persistence anywhere.

## Done when

- `make dev` boots FastAPI on localhost against a local SQLite file.
- `make test` runs the full pytest suite against in-memory SQLite, finishes under 30s (D-1), all green.
- `make lint` (ruff), `make typecheck` (mypy `--strict`), and `tach check` all pass with zero issues.
- All Vessel endpoints work end-to-end via `curl`/HTTPie against a running dev server.
- Coverage on `src/modules/master_data/` is ≥95% line (D-2).
- CI is green on all three jobs, including the Postgres migration smoke test.
- The Alembic initial migration creates the `vessels` table with all constraints.
- OpenAPI schema generated at `/openapi.json` and committed to `openapi/openapi.json`.

Ask me before making any decision not covered by the specs.
```

---

## M2 — Port, Counterparty, CounterpartyRole

```
Read these files in full, in order:
- CLAUDE.md
- docs/architecture/locked_summary.md
- docs/master_data/project_description.md
- docs/master_data/architecture.md
- docs/master_data/specifications.md
- docs/master_data/plan.md

M1 is complete. The repo has: the full project scaffold, FastAPI factory, Alembic with batch mode, Tach config, test harness, auth stub, CI with migration smoke, and the complete Vessel vertical slice (model → repo → service → API → tests) under `src/modules/master_data/`. The Vessel implementation is your reference pattern — reuse its structure verbatim.

Implement M2 — Port, Counterparty, CounterpartyRole.

## 1. Port vertical slice

- `models/port.py` — fields per architecture §4.2. `unlocode` UNIQUE. `latitude` / `longitude` range-validated. `country` is **derived from UNLOCODE prefix at write time** and stored, never accepted as input.
- `repositories/port_repository.py`, `services/port_service.py`, `api/ports.py` — mirror the Vessel pattern.
- Vendor the UN/LOCODE country-prefix lookup at `src/modules/master_data/reference/unlocode_country.py` as a static Python dict (~250 entries, ISO-3166 alpha-2 keys). Out-of-prefix UNLOCODEs raise `InvalidUnlocodeError`. Annual review noted in docstring (D-7).
- Service invariants: unique UNLOCODE, valid UNLOCODE format (D-6: 5 chars, `[A-Z]{2}[A-Z0-9]{3}`), country auto-derived, lat/lon in range, status enum.

## 2. Counterparty vertical slice

- `models/counterparty.py` — fields per architecture §4.3. `code` UNIQUE. `contacts` stored as SQLAlchemy `JSON` column. Per spec, JSON is read whole / written whole — no inside-JSON queries.
- `repositories/counterparty_repository.py`, `services/counterparty_service.py`, `api/counterparties.py` — mirror the Vessel pattern.
- Service invariants: unique code, status enum, contacts list shape validated via Pydantic on input.

## 3. CounterpartyRole join

- `models/counterparty_role.py` — fields per architecture §4.4. UNIQUE (`counterparty_id`, `role`). FK to Counterparty with `ondelete='CASCADE'`. `ports_serviced` as JSON list of UNLOCODE strings (soft list, no FK — see OPEN_DECISIONS §7).
- Service methods on `CounterpartyService`: `attach_role(counterparty_id, role, agent_fields=None)` and `detach_role(counterparty_id, role)`.
- API endpoints: `POST /api/v1/counterparties/{id}/roles` and `DELETE /api/v1/counterparties/{id}/roles/{role}`.
- Invariant: when `role == "Agent"`, both `ports_serviced` (non-empty list) and `nomination_contact_email` are required. For other roles they must be null. Enforced in service; tested.

## 4. Alembic migration

- Single new revision adding `ports`, `counterparties`, `counterparty_roles` tables with all constraints.
- Must run cleanly on both SQLite (batch mode) and Postgres.

## 5. Tests

For each new entity, mirror the Vessel test pattern:
- `tests/modules/master_data/test_port_service.py`, `test_port_api.py`
- `tests/modules/master_data/test_counterparty_service.py`, `test_counterparty_api.py`
- `tests/modules/master_data/test_counterparty_role_service.py`, `test_counterparty_role_api.py`

Coverage must cover:
- Port: valid create, duplicate UNLOCODE rejection, invalid UNLOCODE format rejection, out-of-prefix UNLOCODE rejection, country auto-derivation correctness, lat/lon range rejection, get/list/update/deactivate.
- Counterparty: valid create, duplicate code rejection, contacts JSON round-trip, get/list/update/deactivate.
- CounterpartyRole: attach happy path, attach with Agent role requiring agent fields, attach with non-Agent role rejecting agent fields, detach, attach-duplicate-role rejection (UNIQUE constraint), cascade delete when parent Counterparty is hard-deleted (DB invariant only; soft-delete is the preferred path).

FactoryBoy factories for Port, Counterparty, CounterpartyRole.

Real-DB tests only.

## 6. TDD discipline

Same as M1: RED → GREEN → REFACTOR. Commit at each GREEN.

## Done when

- All three entities have full CRUD + (for Counterparty) role attach/detach via REST, end-to-end working.
- `make test` is green; the full Block 2 suite finishes under 30s (D-1).
- `make lint`, `make typecheck`, `tach check` all pass.
- Coverage on `src/modules/master_data/` remains ≥95% line (D-2).
- CI is green, including the Postgres migration smoke test against the new revision.
- OpenAPI schema regenerated and re-committed at `openapi/openapi.json`.
- All domain invariants for all three entities are enforced and tested.

After this milestone passes: write `docs/master_data/runbook.md` per [ADR-0012] before declaring Block 2 done.

Ask me before making any decision not covered by the specs.
```
