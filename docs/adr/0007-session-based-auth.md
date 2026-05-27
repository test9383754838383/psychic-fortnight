# ADR-0007 — Session-Based Authentication (Single-Tenant)

**Status:** Accepted — 2026-05-27

## Context

V1 serves a single ship-management company with multiple shore-based operators, each with role-based permissions. Two auth patterns were considered: stateful sessions (server-side store + signed cookie) and stateless JWTs.

JWT is the modern default in tutorials but was designed for cross-service authentication in distributed systems. In a single-tenant modular monolith (ADR-0001), the JWT revocation problem — needing a stateful denylist to invalidate compromised tokens — defeats the point of statelessness.

## Decision

**Session-based authentication.** Cryptographically signed session ID stored in an HttpOnly SameSite cookie; session payload (user, roles, expiry) lives in the database. Revocation = delete the row.

Block 2 ships a `get_current_user_stub()` dependency so endpoints can be tested before the real session middleware exists. The full implementation lands in a dedicated auth block before any production cutover.

## Consequences

- Instant revocation: delete the session record.
- Simpler reasoning; no token rotation, no asymmetric key management.
- No external identity provider required for local-first dev.
- The auth block must replace the stub via a single-file change in `src/dependencies.py`. CI grep forbids `get_current_user_stub` references outside `tests/` and that one file.
- Multi-tenancy is explicitly out of V1 scope (tracked in OPEN_DECISIONS). If we add tenancy later, the session payload extends with a tenant claim — no architectural rewrite.
