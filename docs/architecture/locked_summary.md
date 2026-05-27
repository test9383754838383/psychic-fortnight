# Locked Architecture — Vessel & Voyage Operations Control System

Authoritative snapshot of the architectural baseline. Every bullet cites the ADR it traces to. If you want to change one, write a superseding ADR — don't edit this file's bullets in isolation.

## Topology

- Modular monolith. One codebase, one process, one database. [ADR-0001]
- On-prem deployable via Docker Compose. No K8s, no service mesh, no microservices at launch. [ADR-0001]
- Local-first: `make dev` boots the full stack on a developer laptop, offline. [ADR-0004]
- 12-Factor App across the whole codebase; 12-Factor Agent at LLM integration points only. [ADR-0009]

## Backend

- Python 3.12 + FastAPI. [ADR-0002]
- `advanced-alchemy[fastapi]` for repository/service scaffolding. [ADR-0002]
- Pydantic v2 for DTOs and LLM schemas. [ADR-0002], [ADR-0009]
- Strict typing (mypy `--strict`), Ruff for lint+format, `uv` for deps. [ADR-0002]
- Hexagonal-lite layering per module: `api → services → repositories → models`. [ADR-0001]

## Persistence

- SQLAlchemy 2.0 declarative + Alembic with batch mode. [ADR-0003]
- SQLite in dev/CI; PostgreSQL 16 in production. [ADR-0004]
- Domain code restricted to portable ANSI-SQL features. JSON columns read/written whole. UUIDv4 app-side. Enums = String + CheckConstraint. [ADR-0004]
- CI replays the full Alembic history against an ephemeral Postgres container on every PR. [ADR-0004], [ADR-0011]

## Frontend

- React + Vite + TypeScript in strict mode. [ADR-0005]
- Per-module directory layout mirroring backend domains; boundary enforcement via ESLint rules (specific tool a D-entry). [ADR-0005]
- OpenAPI → TypeScript client codegen from FastAPI's generated schema. [ADR-0002], [ADR-0005]
- Bryntum Scheduler for the Vessel Schedule Gantt (Block 4). [ADR-0006]

## Identity & Authorization

- Session-based auth, single-tenant, server-side session store in the DB. [ADR-0007]
- Block 2 ships a `get_current_user_stub` dependency; full auth + RBAC lands in its own block before production. [ADR-0007]

## Async & Background Work

- Huey task queue. SQLite broker in dev/CI; Redis broker in production. [ADR-0008]
- Not provisioned until Block 7 demands it.
- No WebSockets / SSE in V1. HTTP polling for cross-operator state freshness.

## LLM Integration (Block 7 only)

- Instructor + Pydantic for structured extraction. [ADR-0009]
- OpenAI `gpt-4o-mini` in cloud production; Ollama + `phi4` for local/offline. [ADR-0009]
- Provider boundary isolated behind a `FormParserService` interface. Domain code never imports the LLM SDK directly. [ADR-0009]

## Discipline & Testing

- TDD: RED → GREEN → REFACTOR. No production code without a failing test. (CLAUDE.md)
- Real-DB integration tests only. No mocked persistence anywhere, ever. [ADR-0011]
- External systems mocked via recorded fixtures, not in-process mocks. [ADR-0011]
- Module boundaries enforced by Tach in CI. [ADR-0010]

## Workflow

- Per-block five-doc spec set in `docs/<module>/`: project_description, architecture, specifications, plan, runbook. [ADR-0012]
- M0 coordinator + 1–3 milestone terminals per block. Hard cap. [ADR-0012]
