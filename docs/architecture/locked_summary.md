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
- SQLite in dev/CI; PostgreSQL 18 in production. [ADR-0004] — version target bumped from 16 → 18 on 2026-05-28 per recheck-verified current-stable status.
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

- APScheduler, in-process, SQLAlchemy-backed job store (same DB as the app). [ADR-0013] supersedes [ADR-0008]
- No broker, no Redis. Single-process scheduler suffices at V1 scale.
- Not provisioned until Block 7 or Block 10 demands it.
- No WebSockets / SSE in V1. HTTP polling for cross-operator state freshness.

## LLM Integration (Block 7 only)

- OpenAI SDK + Pydantic v2 directly, using native Structured Outputs (`response_format` with `json_schema`, `strict: true`). [ADR-0014] supersedes [ADR-0009]
- OpenAI `gpt-4o-mini` (or current cost-equivalent) in cloud production; Ollama with JSON-Schema structured outputs for local/offline. [ADR-0014]
- Provider boundary isolated behind a `FormParserService` interface. Domain code never imports the LLM SDK directly. [ADR-0014]

## Discipline & Testing

- TDD: RED → GREEN → REFACTOR. No production code without a failing test. (CLAUDE.md)
- Real-DB integration tests only. No mocked persistence anywhere, ever. [ADR-0011]
- External systems mocked via recorded fixtures, not in-process mocks. [ADR-0011]
- Module boundaries enforced by Tach in CI. [ADR-0010]

## Deployment

- Docker Compose for the production topology: app, postgres, caddy. [ADR-0015]
- Caddy 2.x as reverse proxy with automatic HTTPS via Let's Encrypt. Customer-supplied TLS supported for air-gapped installs. [ADR-0015]
- Dev does not use Caddy: `uvicorn` on `localhost:8000` and Vite on `localhost:5173`.

## Observability

- structlog JSON logs to stdout. [OPEN_DECISIONS §11 — promote to ADR before first production deploy]
- Vector for on-prem log shipping (MPL-2.0).
- GlitchTip optional for Sentry-compatible error tracking.
- No metrics, no distributed tracing in V1.

## Workflow

- Per-block five-doc spec set in `docs/<module>/`: project_description, architecture, specifications, plan, runbook. [ADR-0012]
- M0 coordinator + 1–3 milestone terminals per block. Hard cap. [ADR-0012]
