# Block 3.5 — Prompt A: Baseline Repository Selection

## Role

You are a senior technical researcher.

Your job is to find 1-2 existing, proven repositories or documented solutions that best match the authentication and RBAC flow described below.

No hallucination is allowed. Every recommendation must include real, verifiable links.

If no candidate passes hard filters, return `NO_FIT`.

## Project Context

A production-grade modular monolith ERP for the Operations Department of a ship-management company.

Backend: Python 3.12 + FastAPI + SQLAlchemy 2.0 async + Pydantic v2. Single-tenant. On-prem deployable in Docker. No SaaS services.

The project already has a `get_current_user_stub` in place (Block 2 + 3). Block 3.5 replaces that stub with a real session-based auth system. Every module from Block 4 onward inherits real auth from day one with no consumer-side changes.

## Workflow Context — What Block 3.5 Must Deliver

Step-by-step:

1. **User registration/seed** — admin creates users via a management endpoint or seed script. No self-service registration in V1.
2. **Login** — `POST /api/v1/auth/login`. Body: `{username, password}`. Verify password with argon2-cffi (Argon2id). On success: create an opaque server-side session, persist to `sessions` table, set HttpOnly Secure SameSite=Strict cookie.
3. **Current user** — `GET /api/v1/auth/me`. Read session cookie, look up session in DB, return user + roles.
4. **Logout** — `POST /api/v1/auth/logout`. Delete server-side session row. Clear cookie.
5. **`get_current_user` dependency** — FastAPI dependency that reads the session cookie, validates the session, and returns the authenticated user. Replaces the existing stub with the same function signature so every router that already depends on it requires zero changes.
6. **RBAC enforcement** — a `require_role(role: str)` dependency factory. Routers that need a specific role wrap their dependency. Single-tenant role catalogue: `Admin`, `Operations`, `Viewer`. No dynamic permission bitmask in V1 — roles are the access control unit.
7. **Data model** — five tables: `users`, `roles`, `permissions` (for future extension, empty in V1), `user_roles`, `sessions`. SQLAlchemy 2.0 declarative, async-compatible.
8. **Frontend wiring** — the React auth context shell (Block 3 M2) exposes `{ currentUser, loading, signIn, signOut }`. Block 3.5 replaces only the stub network calls inside that context; the public interface is frozen. `signIn` → POST /login, `signOut` → POST /logout.
9. **CI cleanup** — the existing grep gate (`get_current_user_stub` must appear only in `src/dependencies.py`) is removed once the stub is fully replaced and all modules point to the real dependency.
10. **Tests** — all tests remain real-DB (SQLite for unit, ephemeral Postgres in CI). No mocked auth. Every endpoint that previously accepted the stub now requires a real session cookie.

## Scope

In scope:
- FastAPI session-based auth (not JWT) with argon2-cffi password hashing
- Server-side session storage in a SQL database (not Redis)
- Simple role-based access control on FastAPI routers
- Production-usable reference implementations or minimal frameworks

Out of scope:
- fastapi-users (entered maintenance mode Oct 25 2025 — official maintainer announcement; security/dependency-only updates, no new features)
- JWT-only libraries
- OAuth/OIDC/SSO implementations
- Libraries requiring Redis or a separate broker
- Full identity platforms (Keycloak, Auth0, Cognito)

## Hard Constraints

1. Must be actively maintained as of 2026.
2. Must have a permissive license for commercial on-prem use (MIT, Apache-2.0, BSD).
3. Must show test evidence.
4. Must show production-grade signals (issue hygiene, release activity, adoption indicators, documentation quality).
5. Must not require Redis, a separate broker, or any cloud service.
6. Must be compatible with FastAPI + SQLAlchemy 2.0 async + Pydantic v2.
7. Must NOT be fastapi-users (explicitly excluded above).

If any candidate fails hard constraints, reject it.

## Evaluation Criteria (priority order)

1. Simplicity (few concepts, thin surface area)
2. Functionality (covers all 10 workflow steps above)
3. Test maturity
4. Production readiness
5. Budget flexibility (tiebreaker)

## Research Instructions

1. Search broadly: Python web auth libraries, FastAPI session middleware, SQLAlchemy session store patterns.
2. Use primary sources first (repository, official docs, release notes, PyPI).
3. Do not recommend partial matches without explicit fit percentage.
4. Prefer concise decision rationale, not hidden reasoning.
5. If no OSS repo covers this pattern cleanly, return `NO_FIT` and state exactly which steps would require custom code.

## Required Output Format

### A) Candidate Table

For each candidate:
- Name
- URL
- License
- Last active signal (date)
- Fit percentage to the 10-step workflow above
- Coverage map (which steps are native vs missing)
- Test evidence summary
- Production evidence summary
- Complexity risk notes

### B) Scoring

Score each candidate (1-10) on:
- Simplicity
- Functionality
- Test maturity
- Production readiness
- Budget flexibility

### C) Gap-to-Build List

For each candidate, list exactly which of the 10 steps must be built on top.

### D) Final Decision

Return one of:
1. `RECOMMEND: <candidate>` with brief rationale
2. `NO_FIT` with closest alternatives and exact failure reasons per hard constraint
