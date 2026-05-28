# Block 3.5 — Auth + RBAC · Architecture

References: [ADR-0007] session auth · [ADR-0016] auth implementation decisions · [ADR-0001] modular monolith · [ADR-0010] Tach · [ADR-0011] real-DB tests. Implementation decisions in `docs/auth_rbac/locked_decisions.md` (D-LOCK-1 through D-LOCK-6).

## 1. System Overview

Block 3.5 inserts the `auth` module into the existing FastAPI process. It modifies nothing else architecturally — it replaces one dependency (`get_current_user`) and adds five tables.

```
┌──────────────────────────────────────────────────────────┐
│  FastAPI process (uvicorn)                               │
│  ├── module: master_data       ← Block 2                 │
│  ├── module: voyage_spine      ← Block 3                 │
│  ├── module: auth              ← THIS BLOCK              │
│  │     ├── POST /api/v1/auth/login                       │
│  │     ├── GET  /api/v1/auth/me                          │
│  │     └── POST /api/v1/auth/logout                      │
│  └── src/dependencies.py       ← get_current_user REAL  │
└─────────────────────┬────────────────────────────────────┘
                      │ SQLAlchemy 2.0 async
                      ▼
             ┌──────────────┐
             │  DB           │  users/roles/permissions/
             │               │  user_roles/sessions tables
             └──────────────┘
```

`src/dependencies.py` is the single location of `get_current_user`. All routers in all modules import it from there. Block 3.5 replaces only the body of that function. The import in every router (`from src.dependencies import get_current_user`) stays unchanged.

The `auth` module is Tach-isolated. No other module imports from `auth.*` except via `src/dependencies.py`'s re-export.

## 2. Module Layout

```
src/modules/auth/
├── api/
│   └── auth.py           ← /api/v1/auth router (login, me, logout)
├── services/
│   └── auth_service.py   ← password verify, session create/validate/delete
├── repositories/
│   ├── user_repository.py
│   └── session_repository.py
├── models/
│   ├── user.py           ← User + UserRole
│   ├── role.py           ← Role + Permission
│   └── session.py        ← Session
├── exceptions.py
└── __init__.py           ← re-exports used by src/dependencies.py
```

`src/dependencies.py` updated: `get_current_user` now calls `auth.get_current_user_impl(request, session)`. Signature unchanged: `async def get_current_user(request: Request, session: AsyncSession = Depends(get_db)) -> User`.

## 3. Core Flows

### 3.1 Login

```
1. POST /api/v1/auth/login  {username, password}
2. AuthService.login(username.lower(), password, session):
   a. Query users by username (case-insensitive, normalized to lowercase)
   b. If user not found → raise InvalidCredentialsError (same path as wrong password)
   c. run_in_threadpool(ph.verify, user.hashed_password, password)
      → raises VerifyMismatchError on failure → same InvalidCredentialsError
   d. Create Session row: session_id=secrets.token_hex(32), user_id, created_at=now,
      last_seen_at=now, expires_at=now + SESSION_IDLE_TIMEOUT_MINUTES
   e. Commit
3. Response.set_cookie(
       key="session_id", value=session_id,
       httponly=True, secure=True, samesite="strict",
       max_age=SESSION_ABSOLUTE_TIMEOUT_HOURS * 3600,
       path="/api"
   )
4. 200 OK, body: UserResponseDTO
```

argon2-cffi verify runs in a threadpool (D-LOCK-2) to avoid blocking the event loop.
slowapi enforces 5/minute/IP before this handler is reached (D-LOCK-3).

### 3.2 get_current_user dependency

```
1. session_id = request.cookies.get("session_id")
   → if None: raise HTTPException(401)
2. AsyncSession query: SELECT session JOIN user JOIN user_roles JOIN roles
   WHERE session.session_id = :token
3. if not found → 401
4. if now > session.created_at + SESSION_ABSOLUTE_TIMEOUT_HOURS → delete row, 401
5. if now > session.last_seen_at + SESSION_IDLE_TIMEOUT_MINUTES → delete row, 401
6. UPDATE session.last_seen_at = now
7. Return User (with roles eagerly loaded, selectinload)
```

One DB round-trip with joined eager load. No N+1.

### 3.3 require_role dependency factory

```python
def require_role(role: str):
    async def dependency(user: User = Depends(get_current_user)) -> User:
        if role not in {ur.role.name for ur in user.user_roles}:
            raise HTTPException(403, "Insufficient permissions")
        return user
    return dependency
```

Usage on any router: `dependencies=[Depends(require_role("Admin"))]`.

### 3.4 Logout

```
1. POST /api/v1/auth/logout
2. Depends(get_current_user) → validates session, returns user
3. Delete the session row
4. Response.delete_cookie("session_id")
5. 200 OK
```

### 3.5 Session purge (background task)

APScheduler task registered at app startup, runs every 6 hours:
```
DELETE FROM sessions
WHERE expires_at < NOW()
   OR last_seen_at + SESSION_IDLE_TIMEOUT_MINUTES < NOW()
```

## 4. Data Model

### users

| Field | Type | Notes |
|---|---|---|
| `id` | UUID PK | UUIDv4 app-side |
| `username` | str UNIQUE | stored lowercase |
| `hashed_password` | str | Argon2id via argon2-cffi |
| `is_active` | bool, default True | inactive users cannot log in |
| `created_at` / `updated_at` | datetime UTC | TimestampMixin |

### roles

| Field | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `name` | str UNIQUE | `Admin / Operations / Viewer` — seeded at migration time |

### permissions

| Field | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `name` | str UNIQUE | Empty in V1; placeholder for V2 |

### user_roles

| Field | Type | Notes |
|---|---|---|
| `user_id` | UUID FK → users.id CASCADE | composite PK with role_id |
| `role_id` | UUID FK → roles.id CASCADE | |

### sessions

| Field | Type | Notes |
|---|---|---|
| `session_id` | str PK | `secrets.token_hex(32)` |
| `user_id` | UUID FK → users.id CASCADE | |
| `created_at` | datetime UTC | absolute TTL anchor |
| `last_seen_at` | datetime UTC | idle TTL anchor; updated on every request |
| `expires_at` | datetime UTC, indexed | = `created_at + absolute timeout`; used by purge task |

## 5. Frontend Auth Wiring

`frontend/src/auth/AuthContext.tsx` — replace stub calls only. Public interface unchanged.

```typescript
// signIn: was a stub that resolved immediately
// NOW: POST /api/v1/auth/login with { username, password }
//      credentials: "include" required on every fetch call

// signOut: was a stub
// NOW: POST /api/v1/auth/logout, credentials: "include"

// currentUser: was a placeholder value
// NOW: GET /api/v1/auth/me on mount, credentials: "include"
//      null if 401 (unauthenticated)
```

Vite dev proxy (`/api → http://localhost:8000`) handles SameSite=Strict cookies correctly when both dev server and backend run on `localhost` (not mix of 127.0.0.1 / localhost — document in dev setup).

## 6. Tach Boundary

`src.modules.auth` is a module in `tach.toml`. No other module imports from `auth` internals. The public surface is `src/dependencies.py`, which re-exports `get_current_user`. The `require_role` factory is also re-exported from `src/dependencies.py` so routers in other modules can access it without importing from `auth` directly.
