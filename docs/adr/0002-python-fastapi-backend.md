# ADR-0002 — Python + FastAPI for Backend

**Status:** Accepted — 2026-05-27

## Context

Backend language and framework drive every later choice (ORM, testing, hiring, deployment). Two ecosystems were credible: Python and TypeScript/Node. Within Python: FastAPI vs Litestar vs Django. Within TypeScript: NestJS, Express + Prisma, Hono.

Two project constraints filtered hard:
1. SQLite (dev/CI) + Postgres (prod) dual-DB support — see ADR-0004.
2. Real-DB integration tests as first-class — see ADR-0011.

The first researcher recommended Litestar over FastAPI citing native SQLAlchemy repository integration. A pushback recheck against primary sources found that `advanced-alchemy[fastapi]` exposes the identical repository pattern to FastAPI, collapsing Litestar's main technical edge.

## Decision

**Python 3.12 with FastAPI** and `advanced-alchemy[fastapi]` for repository/service scaffolding.

## Consequences

- Strong async story, strict typing via Pydantic v2 + mypy strict, auto-generated OpenAPI for frontend codegen.
- Largest hiring pool in the Python web ecosystem; broad tutorial and Stack Overflow coverage.
- TypeScript ORMs (Prisma, Drizzle) rejected — both bind to a single DB dialect at compile time, breaking the dual-DB requirement.
- Litestar rejected — smaller ecosystem; its repository-pattern advantage disappears with `advanced-alchemy[fastapi]`.
- Django rejected — couples ORM to the web framework, hostile to the hexagonal-lite layering this project relies on.
- We commit to `uv` for dependency management and Ruff + mypy `--strict` for discipline (config-level, not ADR-level).
