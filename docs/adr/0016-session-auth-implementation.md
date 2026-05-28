# ADR-0016 — Session Auth Implementation (Block 3.5)

**Status:** Accepted — 2026-05-28  
**Implements:** [ADR-0007] (replaces `get_current_user_stub` with real auth)  
**Informed by:** OPEN_DECISIONS §13 (argon2-cffi + first-party sessions), Prompt A NO_FIT result, Prompt B full-stack verification.

## Context

Block 3.5 replaces the `get_current_user_stub` dependency that has been in use since Block 2. Every FastAPI router already depends on `get_current_user`; Block 3.5 must replace the implementation without changing the function signature. Every block from 4 onward inherits real auth.

Prompt A confirmed NO_FIT — no OSS repo implements flat-RBAC + single-tenant + DB-backed async sessions without forcing multi-tenancy (AuthTuna), being functionally incomplete (starsessions — inactive), or coupling to Casbin + admin UI (fastapi-user-auth). Custom implementation is the correct path.

## Decisions

### 1. Password hashing: argon2-cffi, Argon2id

`argon2-cffi>=25.1.0`, `PasswordHasher(time_cost=2, memory_cost=19456, parallelism=1)`. OWASP first-choice algorithm. MIT license. Active maintenance confirmed (25.1.0, November 2025). Production parameters set explicitly in code, not relying on library defaults.

### 2. Session management: custom FastAPI dependency, no library

`starlette-session` is inactive (last release >12 months). `starlette-session-middleware` is Beta with no production track record. Starlette's own `SessionMiddleware` is client-side signed cookies — wrong model. The correct approach is a thin custom dependency that reads `request.cookies.get("session_id")` and queries the `sessions` table. Zero extra dependencies. Auditable in 20 lines.

### 3. Session store: SQLAlchemy async `sessions` table, no Redis

Single-tenant, ≤20 concurrent operators. A single indexed primary-key lookup is sub-millisecond. Redis adds an operational service dependency with no benefit at this scale.

### 4. Session ID: `secrets.token_hex(32)`

256-bit cryptographically random opaque token. No JWT decode surface. Immediately revocable by deleting the row. New row created on every login (session fixation prevention). Never update an existing session ID.

### 5. Session TTL: hybrid 30-minute idle, 8-hour absolute

- `created_at`: set on login; hard cutoff at `created_at + 8h` (one full operator shift).
- `last_seen_at`: updated on every authenticated request; idle cutoff at `last_seen_at + 30min`.
- `get_current_user` enforces both checks. Both values are configuration constants, not hardcoded.

### 6. RBAC: custom `require_role()` dependency factory, no casbin

Three flat roles: `Admin`, `Operations`, `Viewer`. A 15-line Python closure factory is the entire RBAC implementation. casbin is deferred to V2 if fine-grained resource-level permissions are ever needed.

### 7. Brute-force protection: `slowapi`, 5 attempts/minute/IP on login

`slowapi>=0.1.9`, in-memory rate limit store (no Redis). Applied to `POST /api/v1/auth/login` only. 5 lines of code. Removed the last open attack surface without adding operational complexity.

### 8. Username: case-insensitive (normalize to lowercase)

`users.username` stored as lowercase. Login query uses lowercase comparison. Avoids operator confusion from case mismatches (`Admin` vs `admin`).

### 9. CSRF: SameSite=Strict is sufficient, no additional CSRF token

HttpOnly + Secure + SameSite=Strict is full CSRF mitigation per OWASP. No dual-submit cookie needed.

### 10. Argon2 test parameter override

Test suite overrides `time_cost=1, memory_cost=256` via a session-scoped pytest fixture. Without this, 30+ auth tests exceed the 30-second ceiling. Production parameters tested by a single dedicated test.

## Data Model

Five tables: `users`, `roles`, `permissions` (empty V1, V2 forward-look), `user_roles`, `sessions`.  
`sessions` has: `session_id UUID PK`, `user_id FK → users.id CASCADE`, `created_at`, `last_seen_at`, `expires_at` (indexed). Expired rows purged by an APScheduler task every 6 hours.

## Deferred to V2

- Password reset flow (admin workaround covers V1)
- MFA (TOTP/FIDO2)
- casbin / fine-grained resource permissions
- slowapi Redis backend (only if multi-instance deployment)
