# Block 3.5 — Auth + RBAC · Terminal Prompts

**Total terminals:** M0 + 1 milestone terminal.  
M0 is the coordinator — no code, stays open the whole time.  
M1 is a single fresh coding terminal: backend auth + frontend wiring together (frontend change is ~5 lines in AuthContext.tsx).  
Working directory for all terminals: `ERP_Operations/`.

## Milestone split rationale

Block 3.5 is a single vertical slice through one module (`auth`), five tables, three endpoints, one dependency replacement, and a trivial frontend wiring update. Splitting this across two terminals would separate work that must be tested together (the frontend e2e test hits real backend auth endpoints). One milestone is the right shape.

---

## M0 — Coordinator. Paste this first. Keep this terminal open forever.

```
You are the project coordinator for Block 3.5 — Auth + RBAC of the Vessel & Voyage Operations Control System. You do not write code. Your only job is to guide me through building this block one milestone at a time.

Read these files now, in order:
- CLAUDE.md
- PROJECT_CONTEXT.md
- docs/architecture/locked_summary.md
- docs/adr/0001-modular-monolith.md
- docs/adr/0002-python-fastapi-backend.md
- docs/adr/0003-sqlalchemy-alembic-orm.md
- docs/adr/0004-dual-database-sqlite-postgres.md
- docs/adr/0005-react-vite-typescript-frontend.md
- docs/adr/0007-session-based-auth.md
- docs/adr/0010-tach-boundary-enforcement.md
- docs/adr/0011-real-db-integration-tests.md
- docs/adr/0012-per-block-four-doc-workflow.md
- docs/adr/0013-apscheduler-supersedes-huey.md
- docs/adr/0016-session-auth-implementation.md
- OPEN_DECISIONS.md
- docs/master_data/runbook.md
- docs/voyage_spine/runbook.md
- docs/auth_rbac/project_description.md
- docs/auth_rbac/architecture.md
- docs/auth_rbac/specifications.md
- docs/auth_rbac/locked_decisions.md
- docs/auth_rbac/plan.md

These are the full spec and your coordination map. When you are done, tell me you have read everything and ask me to confirm before we start.

Then guide me through M1:
- Tell me that M1 is next
- Give me the exact prompt to paste into a new terminal
- Wait for me to tell you it is done and all tests pass
- Only then declare the block ready for runbook

If I report a problem or blocker, help me diagnose it. Do not move forward until M1's done condition is fully met.

TDD rule: test first (RED) → minimum code to pass (GREEN) → refactor only if clarity improves. No production code without a failing test first.

Real-DB tests only on the backend. No mocked sessions. No mocked password verification. No in-memory stubs for SQLAlchemy.

Do not write code. Do not suggest code. Coordinate only.

When M1 is green, remind me to write docs/auth_rbac/runbook.md before declaring the block done (per [ADR-0012]).
```

---

## M1 — Auth + RBAC Implementation

```
Read these files in full, in order:
- CLAUDE.md
- docs/architecture/locked_summary.md
- docs/adr/0001-modular-monolith.md
- docs/adr/0002-python-fastapi-backend.md
- docs/adr/0003-sqlalchemy-alembic-orm.md
- docs/adr/0004-dual-database-sqlite-postgres.md
- docs/adr/0007-session-based-auth.md
- docs/adr/0010-tach-boundary-enforcement.md
- docs/adr/0011-real-db-integration-tests.md
- docs/adr/0013-apscheduler-supersedes-huey.md
- docs/adr/0016-session-auth-implementation.md
- docs/master_data/runbook.md
- docs/voyage_spine/runbook.md
- docs/auth_rbac/project_description.md
- docs/auth_rbac/architecture.md
- docs/auth_rbac/specifications.md
- docs/auth_rbac/locked_decisions.md
- src/dependencies.py
- frontend/src/auth/AuthContext.tsx

Blocks 2 and 3 are shipped and green. The existing codebase has a `get_current_user_stub` in `src/dependencies.py` that every router depends on. This milestone replaces that stub with a real implementation without changing any router.

Implement M1 — Auth + RBAC.

## 1. Module scaffold

Create `src/modules/auth/` with subpackages: `api/`, `services/`, `repositories/`, `models/`, plus `exceptions.py` and `__init__.py`. Mirror Block 2/3 layout exactly.

Update `tach.toml`: declare `src.modules.auth` as a module. No other module may import from `auth` internals — all cross-module access flows through `src/dependencies.py`.

## 2. Models and migration

- `models/user.py` — `User`: id (UUIDv4 PK), username (str UNIQUE, lowercase), hashed_password (str), is_active (bool default True), TimestampMixin.
- `models/role.py` — `Role`: id (UUIDv4 PK), name (str UNIQUE). `Permission`: id (UUIDv4 PK), name (str UNIQUE) — empty table, V2 placeholder.
- `models/session.py` — `Session`: session_id (str PK, 64-char hex), user_id (FK → users.id CASCADE), created_at, last_seen_at, expires_at (indexed).
- `UserRole` join table: (user_id, role_id) composite PK, both FK with CASCADE.
- `User.user_roles` relationship with `selectinload`-compatible eager loading.
- Generate the Alembic migration: all five tables with all FKs, uniques, and indexes. Verify it runs on SQLite (batch mode) and Postgres.
- Seed data in the migration: insert the three roles (`Admin`, `Operations`, `Viewer`).

## 3. Repositories

- `repositories/user_repository.py` — `UserRepository(SQLAlchemyAsyncRepository[User])`.
- `repositories/session_repository.py` — `SessionRepository(SQLAlchemyAsyncRepository[Session])`.

## 4. Service layer

`services/auth_service.py` — `AuthService` with:
- `create_user(username, password, role_names, session)` — normalizes username to lowercase, hashes password with argon2-cffi using production params from config, assigns roles.
- `authenticate(username, password, session)` → runs `run_in_threadpool(ph.verify, ...)` to avoid blocking event loop. Returns User or raises `InvalidCredentialsError` (same error for wrong password and missing user — no enumeration).
- `create_session(user_id, session)` → `secrets.token_hex(32)`, sets `created_at=now`, `last_seen_at=now`, `expires_at=now + SESSION_ABSOLUTE_TIMEOUT_HOURS`.
- `validate_session(session_id, session)` → checks absolute TTL (`created_at + ABSOLUTE`) and idle TTL (`last_seen_at + IDLE`); updates `last_seen_at` on valid sessions; deletes expired rows; returns User with roles loaded.
- `delete_session(session_id, session)`.
- `purge_expired_sessions(session)` — called by APScheduler task.

Config values from environment (12-Factor): `SESSION_IDLE_TIMEOUT_MINUTES`, `SESSION_ABSOLUTE_TIMEOUT_HOURS`, `ARGON2_TIME_COST`, `ARGON2_MEMORY_COST`, `LOGIN_RATE_LIMIT`.

Raises typed domain exceptions: `InvalidCredentialsError`, `InactiveUserError`, `SessionExpiredError`, `SessionNotFoundError`.

## 5. API layer

`api/auth.py` — FastAPI router under `/api/v1/auth`:
- `POST /login` — decorated with slowapi `@limiter.limit(settings.LOGIN_RATE_LIMIT)`. Calls AuthService.authenticate, creates session, sets HttpOnly+Secure+SameSite=Strict cookie on the Response object.
- `GET /me` — depends on `get_current_user`. Returns `UserResponseDTO` (id, username, roles, is_active).
- `POST /logout` — depends on `get_current_user`. Deletes session row, clears cookie.

`api/admin.py` — FastAPI router under `/api/v1/admin`:
- `POST /users` — depends on `require_role("Admin")`. Creates a user.
- `PATCH /users/{id}` — depends on `require_role("Admin")`. Updates username, password (admin reset), is_active.
- `GET /users` — depends on `require_role("Admin")`. Lists all users.

Pydantic v2 DTOs: `LoginDTO`, `UserCreateDTO`, `UserUpdateDTO`, `UserResponseDTO`.

`exceptions.py` — HTTP mappings: 401 for auth failures, 403 for insufficient role, 429 from slowapi.

`__init__.py` — re-export the routers.

## 6. Replace get_current_user in src/dependencies.py

Replace the stub body with the real implementation per architecture.md §3.2. The function signature stays identical:

```python
async def get_current_user(
    request: Request,
    session: AsyncSession = Depends(get_db)
) -> User:
```

Add `require_role` factory to `src/dependencies.py` — exported alongside `get_current_user` so other modules never import from `auth` internals.

## 7. APScheduler session purge task

Register `AuthService.purge_expired_sessions` as an APScheduler IntervalTrigger task (every 6 hours) in the app startup lifecycle. Follow the existing APScheduler registration pattern if any exists; otherwise establish the pattern here.

## 8. Frontend wiring

Edit `frontend/src/auth/AuthContext.tsx` only:
- `signIn`: replace stub with `POST /api/v1/auth/login`, `credentials: "include"`.
- `signOut`: replace stub with `POST /api/v1/auth/logout`, `credentials: "include"`.
- `currentUser` hydration: replace placeholder with `GET /api/v1/auth/me` on mount, `credentials: "include"`. Set null on 401.

Ensure all `openapi-fetch` calls include `credentials: "include"`. Verify the Vite dev proxy still routes `/api` → `http://localhost:8000`.

Update `frontend/src/__tests__/scaffold.test.tsx` if it relied on the stub value.

## 9. Tests

Under `tests/modules/auth/`:
- `conftest.py` — session-scoped `fast_argon2` fixture overrides the app PasswordHasher to `time_cost=1, memory_cost=256`. `UserFactory`, `SessionFactory`.
- `test_auth_service.py` — all service-layer cases per specifications §4.
- `test_auth_api.py` — API integration tests via TestClient. All 200/401/403/429 paths.
- `test_rbac.py` — `require_role` with correct role, wrong role, no auth.
- `test_regression_existing_endpoints.py` — confirm vessels, ports, counterparties, voyages all work with a real session cookie, all fail without one.
- `test_session_purge.py` — purge deletes only expired rows.
- `test_argon2_production_params.py` — single test verifying production parameters are set correctly.

Frontend:
- `frontend/src/auth/AuthContext.test.tsx` — MSW mocks the three auth endpoints; tests sign in / sign out / currentUser lifecycle.
- `frontend/e2e/auth.spec.ts` — Playwright: login → /me → protected route → logout → 401.

Real SQLite only for backend unit tests. No mocked sessions. No mocked PasswordHasher in auth path tests.

## 10. CI

- `get_current_user_stub` grep gate: **remove it** from `.github/workflows/ci.yml` once no reference to `get_current_user_stub` remains outside of a comment or the historical migration.
- Verify `tach check` still passes with the new `auth` module declared.
- Frontend CI job: add `pnpm run test` step covering `AuthContext.test.tsx`.
- Playwright e2e job: `auth.spec.ts` already covered by the existing e2e step.

## 11. TDD discipline

RED → GREEN → REFACTOR. Commit at each GREEN. Real-DB tests only.

## Done when

- All three auth endpoints work end-to-end via curl/HTTPie against a running dev server.
- All existing vessel/port/counterparty/voyage endpoints work with a real session cookie.
- `make test` runs the full pytest suite under 30s, all green.
- `make lint`, `make typecheck`, `tach check` pass with zero issues.
- Frontend `pnpm run test`, `pnpm run typecheck`, `pnpm run lint`, `pnpm run test:e2e` all pass.
- No remaining reference to `get_current_user_stub` in any production file.
- Alembic migration creates all five auth tables with all constraints and seeds the three roles.
- OpenAPI schema regenerated at `openapi/openapi.json` and committed.
- CI green on all jobs.

Ask me before making any decision not covered by the specs.
```

---

## After M1 green

Per [ADR-0012], write `docs/auth_rbac/runbook.md` before declaring Block 3.5 done. The runbook should cover:

- How to run the full stack locally (`make dev` + `pnpm run dev`).
- How to create the first Admin user (seed script or admin endpoint).
- How to log in and test the session cookie via curl.
- How to verify roles (curl /me, check roles array).
- Session TTL values and how to override them for testing.
- Common failure modes: expired sessions, SameSite cookie not sent (localhost mismatch), Argon2 blocking event loop without threadpool, slowapi 429 in tests.
- How to add a new user role (migration + seed pattern).
- Useful URLs (Swagger, OpenAPI JSON, Vite dev, admin endpoints).

Then orchestrator audits the block, verifies CI evidence, and updates `PROJECT_CONTEXT.md` to "Block 3.5 complete, Block 4 next."
