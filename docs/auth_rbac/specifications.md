# Block 3.5 — Auth + RBAC · Specifications

ADR-linked. Stack-level decisions in `docs/architecture/locked_summary.md`. Implementation decisions in `docs/auth_rbac/locked_decisions.md`. This file owns the block-specific surface: API contract, D-entries, testing strategy, risks.

## 0. Context and Constraints

Block 3.5 is a surgical cross-cutting block. It delivers real auth before any feature work resumes. It introduces no new domain data; it modifies no existing business logic.

**Non-negotiables (unchanged from prior blocks):** TDD, real-DB tests [ADR-0011], mypy `--strict`, Tach boundaries [ADR-0010], 12-Factor (config via env, not hardcoded constants), simplicity-first.

## 1. Stack

**Backend (additions/changes):**
- `argon2-cffi>=25.1.0` — password hashing (Argon2id). [ADR-0016]
- `slowapi>=0.1.9` — login endpoint rate limiting. [ADR-0016]
- Custom `get_current_user` FastAPI dependency (no session library). [ADR-0016 D-LOCK-1]
- Five new SQLAlchemy 2.0 models + one Alembic migration. [ADR-0016]
- APScheduler session purge task (APScheduler already provisioned per [ADR-0013]).

**Frontend (minimal):**
- `AuthContext.tsx` internal network calls replaced. Public interface frozen.
- `credentials: "include"` on all `openapi-fetch` calls.

### API surface (Block 3.5 additions)

| Method | Path | Auth required | Purpose |
|---|---|---|---|
| `POST` | `/api/v1/auth/login` | No | Authenticate; set session cookie |
| `GET` | `/api/v1/auth/me` | Yes | Return current user + roles |
| `POST` | `/api/v1/auth/logout` | Yes | Delete session; clear cookie |
| `POST` | `/api/v1/admin/users` | Yes (`Admin`) | Create a user (admin only) |
| `PATCH` | `/api/v1/admin/users/{id}` | Yes (`Admin`) | Update user (incl. password reset by admin, set is_active) |
| `GET` | `/api/v1/admin/users` | Yes (`Admin`) | List all users |

No self-service registration endpoint. Admin user creation only.

### Schema rationale

- `users.username` lowercase-normalized, unique constraint.
- `roles` seeded at migration time (not created via API in V1).
- `permissions` table present but empty — FK anchor for V2.
- `sessions.session_id` is a random hex string, not a UUID (no structure to decode, no format to spoof).
- `sessions.expires_at` indexed — used by purge task's WHERE clause.
- Hybrid TTL: `last_seen_at + IDLE` and `created_at + ABSOLUTE`. Both enforced in `get_current_user`.

## 2. D-entries

Inherit D-1 through D-15 from Block 2 and Block 3 unchanged. New for Block 3.5:

| Key | Default | Where | Why |
|---|---|---|---|
| `D-16` Session idle timeout | 30 minutes | `SESSION_IDLE_TIMEOUT_MINUTES` env var | OWASP office-worker profile; operator away-from-desk usability |
| `D-17` Session absolute timeout | 8 hours | `SESSION_ABSOLUTE_TIMEOUT_HOURS` env var | One full operator shift; OWASP Cheat Sheet direct recommendation |
| `D-18` Session purge interval | 6 hours | APScheduler task config | Keeps sessions table bounded; runs overnight without impacting daytime ops |
| `D-19` Login rate limit | 5 req/min/IP | `LOGIN_RATE_LIMIT` env var | Stops automated brute-force; trivial false-positive risk for legitimate operators |
| `D-20` Argon2 time_cost (prod) | 2 | `ARGON2_TIME_COST` env var | OWASP minimum (m=19456, t=2, p=1) |
| `D-21` Argon2 memory_cost (prod) | 19456 KiB | `ARGON2_MEMORY_COST` env var | OWASP minimum |
| `D-22` Argon2 time_cost (test) | 1 | conftest.py fixture override | Keeps test suite under 30s ceiling (D-LOCK-2) |
| `D-23` Argon2 memory_cost (test) | 256 KiB | conftest.py fixture override | Same |

## 3. Authentication and Authorization

This block *is* the auth implementation. No stub. All endpoints in all modules require a real session cookie via `get_current_user`. Endpoints that need a specific role also depend on `require_role(role)`.

Existing routers (master_data, voyage_spine) require zero changes — `get_current_user` signature is preserved.

## 4. Testing Strategy

**Backend (same discipline as prior blocks):**
- pytest, real-DB SQLite for unit tests, ephemeral Postgres (Testcontainers) for CI migration smoke.
- No mocked sessions, no mocked password verification. All auth tests hit a real DB.
- Argon2 parameter override via `conftest.py` session fixture (D-LOCK-2, D-22/D-23).

**Required test coverage:**

`test_auth_service.py`:
- Login correct credentials → session row created, cookie returned.
- Login wrong password → 401, timing-constant (no enumeration).
- Login nonexistent user → 401, same error as wrong password.
- Login inactive user → 401.
- get_current_user valid session → returns user + roles.
- get_current_user expired (idle) → 401, row deleted.
- get_current_user expired (absolute) → 401, row deleted.
- get_current_user unknown token → 401.
- Logout → row deleted, cookie cleared.
- new session on every login (session fixation test).

`test_auth_api.py`:
- POST /login 200 + cookie path.
- POST /login 401 paths (wrong pw, missing user, inactive).
- GET /me 200 with valid session.
- GET /me 401 with no cookie.
- POST /logout 200, subsequent /me returns 401.
- POST /admin/users 201 (Admin), 403 (Operations), 401 (none).

`test_rbac.py`:
- `require_role("Admin")` — correct role → 200, wrong role → 403, no auth → 401.
- Same for `Operations` and `Viewer`.

`test_regression_existing_endpoints.py`:
- One test per existing module (vessel, port, counterparty, voyage): confirm they work with a real session cookie and fail with no cookie. Verifies the stub replacement is seamless.

`test_session_purge.py`:
- APScheduler task deletes only expired rows.
- Non-expired rows untouched.

`test_argon2_production_params.py`:
- Single test: instantiate PasswordHasher with production params, hash and verify a password, confirm timing > threshold.

Frontend:
- `AuthContext.test.tsx` — sign in, sign out, currentUser hydration with MSW mocking the three endpoints.
- `e2e/auth.spec.ts` — Playwright: login → /me → protected route works → logout → protected route 401.

**Forbidden (unchanged from prior blocks):** mocked sessions, mocked password hasher in auth path tests, skipping the database.

## 5. Deployment and Infra

No new services. APScheduler is already in-process per [ADR-0013]. The session purge task is registered at app startup alongside any existing scheduled tasks.

12-Factor compliance: All D-entries (TTL, Argon2 params, rate limit) come from environment variables with safe defaults. Never hardcoded.

## 6. Rejected Alternatives

| Item | Rejected | Reason |
|---|---|---|
| fastapi-users | Maintenance mode since Oct 25 2025 | No new features; security-only updates confirmed by maintainer |
| starlette-session | Inactive (>12 months no release) | Prompt B verified; Snyk rates as Inactive |
| starlette-session-middleware | Beta, no production track record | Prompt B verified |
| Casbin RBAC | Heavyweight policy engine | 3 flat roles, no resource-scoped checks; 15 LOC closure is the correct call for V1 |
| AuthTuna | Forces multi-tenant hierarchy | Single-tenant 5-table model is incompatible |
| JWT sessions | Cannot immediately revoke | Stolen token remains valid until expiry; unacceptable for on-prem operator tooling |

## 7. Risks

| Risk | Confidence | Impact | Mitigation |
|---|---|---|---|
| Argon2 blocking event loop | High (will happen without mitigation) | High (server freezes under load) | `run_in_threadpool` on verify/hash; mandatory — see D-LOCK-1 |
| Argon2 test timeout (30s ceiling) | High (will happen without mitigation) | Medium (flaky CI) | D-LOCK-2 param override; mandatory from test suite start |
| Session fixation | Low (if D-LOCK-6 is followed) | High | New row on every login; never update session_id |
| SameSite=Strict blocks deep-link navigations | Low impact (internal tool) | Low | Documented in dev runbook; acceptable for V1 |
| No brute-force protection if slowapi misconfigured | Low | Medium | slowapi added in V1 (D-LOCK-3); integration test verifies 429 on 6th request |
| Alembic FK constraints on future auth table migrations | Medium | Medium | Documented in migration authoring guide; affects only future migrations, not initial |
| No password reset in V1 | Operational risk only | Low | Admin workaround documented in runbook |
