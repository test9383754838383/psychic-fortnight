# Block 3.5 — Auth + RBAC · Project Description

## What this block is

Block 3.5 replaces the `get_current_user_stub` that has been in place since Block 2 with a production-grade session-based authentication and role-based access control system. It is a surgical, well-bounded block with one purpose: ensure every block from 4 onward inherits real auth from day one without any consumer-side changes.

This is not a feature block. No new domain data. No new UI pages. The deliverable is a working authentication layer that the existing codebase slots into.

## Why it exists as its own block

Auth is cross-cutting. It rewrites the `get_current_user` dependency that every single FastAPI router in the system already depends on. Doing this mid-feature-block (e.g., alongside Block 4's Vessel Schedule) guarantees churn — any new router coded against the stub would need rework immediately. Carving auth into its own block means it lands clean, verified, and inherited atomically.

## What it delivers

- **Login / logout / current-user endpoints** under `/api/v1/auth/`.
- **`get_current_user` real implementation** replacing the stub. Same function signature. Zero changes to existing routers.
- **`require_role(role: str)` dependency factory** for endpoint-level RBAC. Three roles: `Admin`, `Operations`, `Viewer`.
- **Five-table data model**: `users`, `roles`, `permissions` (empty V1), `user_roles`, `sessions`.
- **Frontend wiring**: replaces stub network calls inside `AuthContext.tsx`. Public interface frozen.
- **CI cleanup**: removes the `get_current_user_stub` grep gate.

## What it is NOT

- No self-service user registration. Admin creates users only.
- No password reset flow (admin workaround; V2 requirement).
- No MFA, no TOTP, no SSO.
- No multi-tenancy (single-tenant for all of V1).
- No fine-grained resource-level permissions (Casbin deferred to V2 if needed).
- No new feature UI. The frontend change is two files: `AuthContext.tsx` (network calls) and one Playwright smoke test.

## Success criteria

- Login with valid credentials → session cookie set, stored in DB.
- Login with invalid credentials → 401, constant-time response (no username enumeration).
- `GET /api/v1/auth/me` with valid session → returns user + roles.
- All existing voyages/vessels/ports endpoints continue to work with a real session cookie.
- `require_role("Admin")` on a protected endpoint → 200 for Admin, 403 for Operations/Viewer, 401 for unauthenticated.
- Logout → session row deleted, cookie cleared, subsequent /me returns 401.
- `make test` green in under 30s. `make lint`, `make typecheck`, `tach check` pass.
- CI green: lint, tests, Postgres migration smoke, frontend check.
- No remaining reference to `get_current_user_stub` in any non-stub file.

## Constraints inherited from the project

- TDD. Real-DB tests only (no mocked sessions, no mocked password verification). [ADR-0011]
- mypy `--strict`. [ADR-0002]
- Tach boundary enforcement. [ADR-0010]
- 12-Factor: session TTL and Argon2 parameters must come from environment/config, not be hardcoded. [CLAUDE.md]
