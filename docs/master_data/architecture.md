# Block 2 — Master Data · Architecture

References: [ADR-0001] modular monolith · [ADR-0002] FastAPI · [ADR-0003] SQLAlchemy · [ADR-0004] dual-DB · [ADR-0007] session auth stub · [ADR-0010] Tach · [ADR-0011] real-DB tests.

## 1. System Overview

Block 2 is the foundational data layer of the modular monolith. It runs as part of the single FastAPI process; there is no separate service.

```
┌──────────────────────────────────────────────────────────┐
│  FastAPI process (uvicorn)                               │
│  ├── module: master_data       ← THIS BLOCK              │
│  ├── module: (future) voyage                             │
│  ├── module: (future) port_call                          │
│  └── module: (future) forms                              │
└────────────────────┬─────────────────────────────────────┘
                     │ SQLAlchemy 2.0 (async)
                     ▼
              ┌──────────────┐
              │  SQLite file │  (dev/CI)
              │  → Postgres  │  (prod)
              └──────────────┘
```

No outbound calls, no inbound webhooks, no queue. The block exposes HTTP under `/api/v1/` consumed locally for tests and by later blocks.

All Block 2 code lives under `src/modules/master_data/`. Public surface is a small set of FastAPI routers and a typed service layer. Internals (repositories, ORM models, validation helpers) are private; `tach.toml` enforces this.

## 2. Application Layers

Hexagonal-lite. Four layers inside the module:

```
src/modules/master_data/
├── api/             ← FastAPI routers, DTOs (Pydantic v2)
│   ├── vessels.py
│   ├── ports.py
│   └── counterparties.py
├── services/        ← Domain logic, invariants, orchestration
│   ├── vessel_service.py
│   ├── port_service.py
│   └── counterparty_service.py
├── repositories/    ← advanced-alchemy repositories (private)
│   ├── vessel_repository.py
│   ├── port_repository.py
│   └── counterparty_repository.py
├── models/          ← SQLAlchemy 2.0 declarative models
│   ├── vessel.py
│   ├── port.py
│   ├── counterparty.py
│   └── counterparty_role.py
├── reference/       ← Static reference data (UN/LOCODE prefixes)
│   └── unlocode_country.py
├── exceptions.py
└── __init__.py      ← Public surface (re-exports)
```

**Layer responsibilities.**

- **api/** — HTTP routing, DTO validation, status codes. No domain logic. No DB access.
- **services/** — Domain invariants, transaction orchestration. The only layer that knows business rules. Calls repositories.
- **repositories/** — Persistence. `SQLAlchemyAsyncRepository` from advanced-alchemy. No business logic.
- **models/** — SQLAlchemy 2.0 declarative classes. Schema definitions only.

**Cross-module rule (Tach-enforced).** Other modules may import only from `master_data/__init__.py`. They never touch `master_data.repositories.*` or `master_data.models.*` directly.

## 3. Core Flow

### 3.1 Path A — Happy CRUD

Example: `POST /api/v1/vessels` to create a vessel.

```
1. Request hits FastAPI router (api/vessels.py)
2. Pydantic DTO validates payload shape, types, format
3. Router calls VesselService.create(dto, session)
4. Service enforces invariants (unique code, valid IMO, valid enums)
5. Service calls VesselRepository.add(model)
6. Repository persists via SQLAlchemy session
7. Service commits transaction
8. Router serializes ORM model → response DTO
9. 201 Created with resource JSON + Location header
```

GET / UPDATE / soft-delete follow the same shape. Soft-delete is a status flip to `Inactive`, never a row removal.

### 3.2 Path B — Validation Failure / Invariant Rejection

```
1. Request hits FastAPI router
2. Pydantic rejects malformed payload → 422 with field-level errors
   OR
3. Service detects invariant violation (duplicate code, invalid UNLOCODE,
   unknown role enum, etc.)
4. Service raises a typed domain exception (e.g. DuplicateVesselCodeError)
5. FastAPI exception handler maps domain exception → 4xx response
   with a stable error code and human-readable message
6. Transaction is rolled back; no partial writes
```

No retries. No fallbacks. Validation failure is a hard 4xx.

### 3.3 Additional Entry Points

None in Block 2. No email ingestion, no CLI, no scheduled jobs, no webhooks. HTTP only.

## 4. Data Model

### 4.1 Vessel

| Field | Type | Notes |
|---|---|---|
| `id` | UUID PK | UUIDv4, app-generated |
| `code` | `str` UNIQUE | ops-internal identifier |
| `name` | `str` | display name |
| `imo` | `str` | 7-digit IMO number, format-validated |
| `vessel_type` | enum | constrained list (`Tanker / Bulker / Container / ...`) |
| `flag` | `str` | ISO country code |
| `owner_ref` | FK → Counterparty.id | Owner role required at link time |
| `technical_manager_ref` | FK → Counterparty.id, nullable | optional |
| `ops_manager_user_id` | str, nullable | resolves to a real FK in the auth block |
| `status` | enum (`Active / Inactive`) | soft-delete flag |
| `active_for_reporting` | bool | drives downstream reporting filters |
| `created_at` / `updated_at` | datetime UTC | audit |

### 4.2 Port

| Field | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `unlocode` | `str` UNIQUE | 5-char UN/LOCODE, format-validated |
| `name` | `str` | display name |
| `country` | `str` | **derived from UNLOCODE prefix at write time**, never free text |
| `timezone` | `str` | IANA tz string |
| `latitude` | `float` | -90..90 |
| `longitude` | `float` | -180..180 |
| `distance_table_ref` | `str`, nullable | external key; routing out of Block 2 |
| `status` | enum (`Active / Inactive`) | |
| `created_at` / `updated_at` | datetime UTC | |

### 4.3 Counterparty

| Field | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `code` | `str` UNIQUE | ops-internal identifier |
| `name` | `str` | full name |
| `status` | enum (`Active / Inactive`) | |
| `contacts` | JSON list of `{name, email, phone, role_hint}` | embedded, not a separate entity |
| `created_at` / `updated_at` | datetime UTC | |

### 4.4 CounterpartyRole (join)

| Field | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `counterparty_id` | FK → Counterparty.id `ondelete='CASCADE'` | |
| `role` | enum (`Owner / Charterer / Agent / Supplier / TechnicalManager`) | |
| `ports_serviced` | JSON list of UNLOCODE strings, nullable | required when role = `Agent`; OPEN_DECISIONS §7 tracks possible hard-FK promotion |
| `nomination_contact_email` | `str`, nullable | required when role = `Agent` |
| UNIQUE (`counterparty_id`, `role`) | | one row per role per counterparty |

### 4.5 Relationship diagram

```
Counterparty ──┬─< CounterpartyRole
               │
               ├──< Vessel (as owner_ref)
               └──< Vessel (as technical_manager_ref, optional)

Port (no FK from CounterpartyRole; ports_serviced is a soft UNLOCODE list)
```

## 5. Auth and Authorization

Block 2 ships an **auth stub**, not real auth ([ADR-0007]). `get_current_user_stub()` returns a fixed test user identity so endpoints can be exercised in tests.

Authorization is deferred. Endpoints require the stub but apply no role-based authorization. Real session + RBAC lands in its own block.

The stub lives at `src/dependencies.py`. Swap is one-file. CI grep forbids `get_current_user_stub` references outside `tests/` and that one file.

## 6. Streaming or Async Interactions

Not applicable to Block 2. No WebSockets, no SSE, no background jobs. All endpoints are request → response. FastAPI's async routes are used (matching the stack) but the external contract is plain request/response JSON.

Huey + Redis arrive with Block 7 ([ADR-0008]).

## 7. Learning Loop or Improvement Path

Not applicable to Block 2. No ML, no LLM, no feedback collection. Master-data quality improves through CRUD edits.

The block does establish two patterns every later block inherits:

1. **`Repository → Service → Router`** layering, proven against `master_data` and reused verbatim by every later module.
2. **Tach boundary discipline** baselined here ([ADR-0010]). Every new module declares its dependencies in `tach.toml` or CI fails the build.
