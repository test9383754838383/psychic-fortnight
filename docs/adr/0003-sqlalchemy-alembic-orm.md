# ADR-0003 — SQLAlchemy 2.0 + Alembic for ORM and Migrations

**Status:** Accepted — 2026-05-27

## Context

The dual-DB requirement (ADR-0004) demands an ORM that compiles the same domain queries into SQLite during dev/test and Postgres in prod, with migration tooling that survives SQLite's lack of full `ALTER TABLE` support.

Alternatives surveyed: Django ORM, Tortoise, Pony, Peewee, SQLModel (a SQLAlchemy wrapper), and the TypeScript-only Prisma/Drizzle (already rejected upstream).

## Decision

**SQLAlchemy 2.0 (declarative, async)** with **Alembic** for migrations. `render_as_batch=True` in `alembic/env.py` so SQLite migrations execute via the table-rewrite pattern automatically.

## Consequences

- The most mature dialect abstraction in the Python ecosystem. Same model classes drive both dialects.
- Alembic batch mode handles SQLite `ALTER TABLE` limitations transparently (create-temp / copy / swap).
- CI must replay the full Alembic history against an ephemeral Postgres container on every PR to catch dialect drift early (see ADR-0011 implications).
- Domain code must avoid Postgres-only features (JSONB operators, array types, custom enums) unless wrapped behind dialect-aware compilation. JSON columns are read whole / written whole; never queried inside.
- SQLModel rejected — adds Pydantic-conflation tax for little gain over plain SQLAlchemy 2.0 + Pydantic DTOs at the boundary.
- Django ORM, Tortoise, Pony, Peewee rejected — weaker async/typing story, smaller community, less battle-tested migration tooling.
