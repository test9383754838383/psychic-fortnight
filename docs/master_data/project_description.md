# Block 2 — Master Data

Foundational data layer of the V1 modular monolith. Built first; every later block depends on it.

## What Is The Project?

Block 2 delivers the three master-data entities every other domain block references: `Vessel`, `Port`, and `Counterparty` (with its `CounterpartyRole` join).

The block ships:

- Typed domain models for each entity, persisted via SQLAlchemy 2.0 against SQLite (dev/CI) and Postgres (prod). [ADR-0003], [ADR-0004]
- Alembic migrations creating the three entity tables, the `CounterpartyRole` join, and the supporting enum columns. [ADR-0003]
- FastAPI CRUD endpoints scaffolded via `advanced-alchemy[fastapi]` repositories and services. [ADR-0002]
- Integration tests against a real SQLite database for every endpoint and every domain invariant. No mocks. [ADR-0011]
- The first cut of the modular-monolith directory layout under `src/modules/master_data/`, with Tach enforcing the boundary from day one. [ADR-0001], [ADR-0010]

No UI. The block is complete when the master-data REST API is callable, fully tested, and the migrations run cleanly on both SQLite and Postgres.

**User entry point:** authenticated HTTP requests to `/api/v1/vessels`, `/api/v1/ports`, `/api/v1/counterparties`. Auth itself ships as a stub (`get_current_user_stub`) per [ADR-0007]; the real auth layer is its own block.

**Validation gate:** Pydantic v2 DTOs enforce request shape; the service layer enforces domain invariants (UNLOCODE format, enum membership, uniqueness on `Vessel.code` and `Port.unlocode`). All invariants are covered by real-DB tests.

**Output behaviour:** JSON responses + auto-generated OpenAPI schema committed to `openapi/openapi.json`, ready for frontend codegen in later blocks.

## Why?

Every higher V1 block — Voyage Spine, Vessel Schedule, Port Call, Forms, Tasks, Alerts — references `Vessel`, `Port`, or `Counterparty`. Failure costs being addressed:

- **Foundation rework.** A loose `Vessel.code` uniqueness contract or an under-typed `Port.unlocode` breaks every downstream join. Fixing this at Block 5 is 10× the cost of fixing it now.
- **Boundary decay.** Without Tach locked in at Block 2 [ADR-0010], the monolith degrades into a ball of mud by Block 5. Cheap to set now, expensive to retrofit.
- **Migration drift.** [ADR-0004] commits us to dual-DB. Proving Alembic batch mode works end-to-end against the first table set hardens the pattern before later blocks inherit it.
- **Counterparty role anti-pattern.** The multi-role design (one entity + joined roles) is non-obvious. Getting it right here prevents the "one row per role" bloat every ERP we've seen falls into.

## What This Project Is Not

- **Not a UI block.** No React, no Bryntum. API + DB only.
- **Not an auth block.** Auth/RBAC lands in its own block before production [ADR-0007].
- **Not a Voyage or Port Call block.** Downstream entities reference master data but are built later.
- **Not bulk import.** No CSV / Excel paste / external sync. Deferred (see OPEN_DECISIONS §4).
- **Not a Counterparty CRM.** Contacts are an embedded list. No interaction history, no notes timeline.
- **Not a routing/distance engine.** `Port.distance_table_ref` exists; the table and routing logic are out of scope (OPEN_DECISIONS §6).

## Success Criteria

1. All three entities CRUD-complete via REST. Create / read / update / soft-delete (status → `Inactive`) plus role attach/detach for `Counterparty`.
2. 100% of production code paths covered by real-DB integration tests. The full Block 2 suite finishes under 30s against in-memory SQLite. [ADR-0011]
3. Alembic migrations run cleanly on both SQLite and Postgres. CI replays the full history against an ephemeral Postgres container on every PR. [ADR-0004]
4. Tach reports zero boundary violations against the configured `tach.toml`. [ADR-0010]
5. OpenAPI schema generated and committed at `openapi/openapi.json`.
6. All domain invariants enforced and tested: unique Vessel code, unique Port UNLOCODE, valid `CounterpartyRole` enum, country derived from UNLOCODE prefix, status enum constrained, Agent-role conditional fields enforced.
7. `runbook.md` written and committed before declaring the block done. [ADR-0012]

## Core Constraints

- TDD, RED → GREEN → REFACTOR. No production code without a failing test first. (CLAUDE.md)
- Real-DB tests only. No mocked persistence. [ADR-0011]
- Strict typing: Python 3.12 + mypy `--strict` + Pydantic v2 + SQLAlchemy 2.0 typed declarative models.
- Module boundary: all Block 2 code under `src/modules/master_data/`; Tach enforces. [ADR-0010]
- Local-first: one command boots FastAPI + SQLite; zero external dependencies for dev.
- 12-Factor: all config via env vars; logs to stdout; stateless processes.
- Simplicity-first, delete-first. No future-proofing.
- No LLM, no background jobs in Block 2.
