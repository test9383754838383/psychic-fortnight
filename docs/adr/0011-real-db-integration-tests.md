# ADR-0011 — Real-DB Integration Tests Only

**Status:** Accepted — 2026-05-27

## Context

The persistence layer is the part of the system most likely to break in production: dialect quirks, transaction edge cases, migration drift, constraint violations. Mocking the database hides every one of those failure modes until a customer hits them.

`CLAUDE.md` already mandates "no mocks/fakes/demo tests; integration tests against real DB only." This ADR locks the *operational shape* of that mandate so it survives team changes and AI-coder churn.

## Decision

Every test that touches persistence runs against a **real SQLAlchemy engine bound to a real SQLite database** (in-memory for speed, file-based when needed). No `unittest.mock.patch` on persistence code. No fake repositories. No in-memory dict stand-ins.

CI additionally replays the full Alembic migration history against an **ephemeral Postgres 16 container** on every PR to catch dialect drift before merge.

## Consequences

- Tests catch real bugs: constraint violations, cascade behavior, dialect-specific SQL errors.
- The pytest harness must support transactional rollback per test (so 1000+ tests run in seconds).
- Test speed depends on schema build cost. Acceptable target: <30s for a full module suite against in-memory SQLite.
- External-service calls (LLM SDKs, email servers, future HTTP APIs) follow the same principle but use **recorded fixtures**: capture a real response once, replay deterministically. Never mock systems we don't own.
- This rule extends to every block, every test, forever. Violations fail review.
