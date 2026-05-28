# Block 3.5 — Prompt B: Full Stack Verification (Auth + RBAC)

## Role

You are a senior technical architect and independent security reviewer.

Your job is to propose and verify the complete, production-ready stack for Block 3.5 — Auth + RBAC — of this project. You are an external researcher. You have no prior knowledge of what was decided. You start from the requirements, not from conclusions.

No hallucination is allowed. Every recommendation must be real, actively maintained, and verifiable by URL.

If any prior decision in the "Preliminary Decisions" section is wrong, outdated, or suboptimal, say so explicitly. Do not rubber-stamp existing choices.

---

## Project Context

A production-grade modular monolith ERP for the Operations Department of a ship-management company. Shore-based operators only. Single-tenant. On-prem deployable in Docker. No SaaS services.

Backend: Python 3.12 + FastAPI + SQLAlchemy 2.0 async + Pydantic v2 + Alembic (batch mode). SQLite for dev/CI, Postgres 18 for production.

Frontend: React 19.x + Vite 8.x + TypeScript 6.x strict + TanStack Router + TanStack Query + openapi-typescript + openapi-fetch. Auth context shell already exists (stub, Block 3) — Block 3.5 wires it to real endpoints.

Tach enforces module boundaries. pytest + real-DB tests only (no mocked persistence). TDD. mypy --strict.

---

## What Block 3.5 Must Deliver

1. User creation/seeding (admin endpoint or seed script, no self-service registration in V1).
2. `POST /api/v1/auth/login` — username + password → validate with Argon2id → create server-side session → set HttpOnly Secure SameSite=Strict cookie.
3. `GET /api/v1/auth/me` — read session cookie → look up session in DB → return user + roles.
4. `POST /api/v1/auth/logout` — delete session row → clear cookie.
5. `get_current_user` FastAPI dependency — reads session cookie, validates, returns authenticated user. Replaces existing stub with the **same function signature** — zero changes to existing routers.
6. `require_role(role: str)` dependency factory — wraps `get_current_user`; raises 403 if user lacks the role.
7. Single-tenant role catalogue: `Admin`, `Operations`, `Viewer`. Roles are the access control unit in V1. No dynamic permission bitmask.
8. Data model: `users`, `roles`, `permissions` (empty in V1, placeholder for V2), `user_roles`, `sessions` tables. SQLAlchemy 2.0 declarative, async-compatible.
9. Frontend: `signIn` → POST /login, `signOut` → POST /logout, `currentUser` hydrated from GET /me. The public interface (`{ currentUser, loading, signIn, signOut }`) does not change — only the stub network calls inside `AuthContext.tsx` are replaced.
10. CI: remove the `get_current_user_stub` grep gate once the stub is fully replaced. All tests that previously accepted the stub now require a real session cookie.
11. All tests: real-DB (SQLite for unit tests, ephemeral Postgres via Testcontainers for CI migration smoke).

No password reset flows, no MFA, no SSO, no email verification in V1.

---

## Preliminary Decisions (challenge these if wrong)

These decisions came from prior research. Verify each one independently. If any is incorrect, outdated, or has a better alternative in 2026, flag it and explain why.

| # | Decision | Claimed Rationale |
|---|---|---|
| 1 | **Password hashing: argon2-cffi** (Argon2id algorithm) | MIT license, actively maintained, OWASP-recommended algorithm for new systems as of 2025 |
| 2 | **No fastapi-users** | fastapi-users officially entered maintenance mode Oct 25 2025 — security/dependency-only updates, no new features. Maintainer announcement confirmed. |
| 3 | **First-party DB-backed sessions** (not JWT, not third-party auth library) | Single-tenant, on-prem, no JWTs for V1. Direct session table avoids token revocation complexity. |
| 4 | **HttpOnly + Secure + SameSite=Strict cookies** | Standard hardened session cookie posture per OWASP. |
| 5 | **Opaque server-side session IDs** (not signed cookies, not JWTs) | Session ID is a random token; all state lives server-side. No JWT decode surface. |
| 6 | **Alembic migration** for auth tables (same as all other tables in this project) | Consistent with [ADR-0003]. No ORM-managed `create_all`. |
| 7 | **No Redis for session store** | Single-tenant, low concurrency (5–20 operators). SQL session store is sufficient; avoids operational Redis dependency. |
| 8 | **starlette-session or custom middleware** for reading the session cookie | FastAPI has no built-in session middleware. starlette-session or a thin custom dependency is the standard approach. |

---

## Required Verification Layers

For each layer, verify the preliminary decision (if any), confirm or override it, and give a recommendation with version guidance current as of 2026.

### Layer 1 — Password hashing
Verify argon2-cffi. Confirm Argon2id is still OWASP-recommended. Check if any newer or better alternative exists (e.g., bcrypt, scrypt, passlib with argon2 backend). Recommend exact package + version guidance.

### Layer 2 — Session management middleware
Verify: what is the correct approach for reading/writing an HttpOnly session cookie in FastAPI + Starlette in 2026? Options: starlette-session, itsdangerous-based signed cookie, custom dependency that reads `request.cookies`. Which is simplest and most secure? Check starlette-session maintenance status.

### Layer 3 — Session store (DB-backed)
Verify: SQLAlchemy async session table is correct approach for single-tenant, ≤20 concurrent users. Any reason to prefer Redis even at this scale? Confirm no operational overhead concern.

### Layer 4 — RBAC approach
Verify: simple role-string check via `require_role(role: str)` dependency factory is sufficient for V1 single-tenant role catalogue (`Admin`, `Operations`, `Viewer`). Any lightweight RBAC library worth considering (casbin, fastapi-permissions, sqlalchemy-oso)? Or is rolling 10 lines of code the right call?

### Layer 5 — Data model
Verify: `users / roles / permissions / user_roles / sessions` five-table schema is correct. Is `permissions` table useful even empty in V1 (forward-look value vs dead weight)? Is the schema compatible with SQLAlchemy 2.0 async + Alembic batch mode on both SQLite and Postgres 18?

### Layer 6 — Frontend auth wiring
Verify: replacing only the network calls inside `AuthContext.tsx` (keeping the public interface frozen) is architecturally sound. Any concern with SameSite=Strict cookies and the Vite dev proxy (`/api` → `http://localhost:8000`)? Cookie domain/path issues to anticipate?

### Layer 7 — Testing strategy
Verify: real-DB-only auth tests (no mocked sessions, no mocked password checks) are achievable within a 30s test ceiling. Any test-speed concern with argon2-cffi (Argon2id has intentional cost — may slow tests). Is there a standard approach for lowering Argon2 parameters in the test environment without compromising production security?

### Layer 8 — Security posture (V1 scope)
Verify the proposed posture is sufficient for a V1 MLP with shore-based operators only:
- No password reset → is this acceptable for a production ship-management system?
- No MFA → what is the residual risk?
- Session expiry policy: what is the correct default session TTL for this use case?
- Brute-force protection: is rate limiting needed at V1, or deferred?
- CSRF protection: is SameSite=Strict sufficient, or is a CSRF token also needed?

---

## Required Output Format

### A) Layer-by-Layer Verdict

For each of the 8 layers:
- **Preliminary decision**: confirm or override
- **Recommendation**: tool + version (if applicable)
- **Why this over alternatives**: name alternatives and rejection reason
- **Testing approach**
- **Any security or operational concern**

### B) Full Stack Table

One table: layer → tool/approach → version → one-line justification → any flag.

### C) Decision Gates

List any decision that requires founder approval before build starts (e.g., session TTL policy, brute-force rate-limiting scope).

### D) Risk Flags

Explicit list: security risks, scale risks, migration risks, test-speed risks, and any decision that may need to be revisited before Block 4 or by V2.

### E) Prompt A Result Appendix

**[Fill in after Prompt A is run]**

Prompt A result for Block 3.5:
- Decision: [RECOMMEND / NO_FIT]
- Candidate: [name or NONE]
- Gap list: [paste]

This section is filled by the engineer after Prompt A completes. It is included so the stack design accounts for whether a baseline repo was found or the entire auth layer is built from scratch.
