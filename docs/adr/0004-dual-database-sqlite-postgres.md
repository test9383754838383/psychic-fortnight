# ADR-0004 — Dual Database: SQLite (dev/CI) + PostgreSQL (prod)

**Status:** Accepted — 2026-05-27

## Context

Two competing forces:
- The local-first mandate (ORCHESTRA §2) says one command must boot the whole app on a developer laptop, offline, with no external services.
- Production targets on-prem Docker Compose with concurrent users, durable storage, and operator-grade reliability.

A single-database choice can't satisfy both ends. Pure Postgres locally means every developer pays the Docker container tax for every test run; pure SQLite in production means a single-writer bottleneck and no real replication story.

## Decision

**SQLite for development and test; PostgreSQL 16 for production.** Same SQLAlchemy models compile to both. Alembic batch mode handles SQLite migration limits. CI runs the full test suite against in-memory SQLite *and* replays the full migration history against an ephemeral Postgres container on every PR.

## Consequences

- Tests are fast (in-memory SQLite, <30s for the full Block 2 suite).
- Developers can work offline on a plane.
- The application must stay on ANSI-SQL features the ORM can portably compile. PostgreSQL-only features (JSONB operators, `CREATE TYPE` enums, array columns) are forbidden in domain code.
- Enums stored as String + CheckConstraint (portable). UUIDs generated app-side (no DB-side UUID extensions).
- JSON columns are read whole and written whole; never filtered or queried inside.
- The CI Postgres migration smoke test is non-negotiable — without it, dialect drift escapes to production.
- Decision is revisitable if a domain block genuinely needs Postgres-only features; the cost is writing dialect-aware compilation and is bounded.
